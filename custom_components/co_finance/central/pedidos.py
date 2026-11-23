"""Pedidos de lojas online (Shopee, Amazon, TikTok Shop e Mercado Livre), pelo e-mail do pedido. Complemento opcional: sem
ele a Central funciona como sempre. Resolve o que a nota e a fatura não resolvem sozinhas: o valor pago de verdade
(cupom da loja, que a nota não mostra), várias lojas pagas numa cobrança só, vendedor que não emite nota e o
cancelamento de uma parte.

O leitor de cada loja (central/leitores/) transforma o e-mail no formato comum:
  {"evento": "realizado", "loja", "numeros", "data", "total",
   "pagamento": {"tipo", "final", "banco", "parcelas", "carteira"},
   "partes": [{"numero", "vendedor", "itens": [{"descricao", "qtd", "preco"}], "produtos", "frete",
               "descontos": [{"motivo", "valor"}], "pago", "bate"}]}
  {"evento": "cancelado", "loja", "numeros", "data", "itens" (opcional: os itens cancelados, quando é só uma parte do pedido)}
  "pago" no realizado (opcional): o e-mail do pedido já vale como pago (Amazon: cobra o cartão sozinha), com o motivo

  {"evento": "pago", "loja", "numeros", "data", "total", "pagamento", "partes": [{"numero", "vendedor", "razao", "cnpj", "itens"}]}

Daqui para frente é igual para todas as lojas:
- o e-mail do pedido chega antes de o pagamento ser aprovado: o pedido fica "aguardando_pagamento" e não conta;
  a confirmação do pagamento (ou a nota, ou a cobrança na fatura) confirma. Pagamento que chega antes do pedido fica
  "pago_sem_detalhes" até o e-mail do pedido (com os preços) chegar. Parado há dias: o sino pergunta;
- cada parte (um vendedor) vira uma compra (via "pedido") com os itens do e-mail e o valor pago de verdade;
- a nota que chegar (antes ou depois do e-mail) entra no lugar da parte: da nota ficam a loja, os itens e a cópia;
  do pedido, o valor pago de verdade ("cobrado"), o cartão e a data da compra. Vai para o sino (Confirmar/Desfazer);
- a linha da fatura liga ao pedido inteiro pelo total (uma cobrança para várias partes), não a uma parte;
- o e-mail de cancelamento zera a parte cancelada (vai para o sino).
O pedido guarda o que o e-mail trouxe (db["pedidos"]); nada do que é pessoal no e-mail (endereço, telefone) é lido."""
from __future__ import annotations

import copy
import pathlib
import re
from datetime import date
from typing import Any

from .base import Falha, fmt_brl, nome_loja, norm_txt, now_iso
from .dados import compradores, file_lock, load_db, save_db
from .categorias import checar_classe, classe_item
from .config import CLASSE_POR_ITEM_ONLINE
from .leitores import emails_do_arquivo, leitor_da_loja, leitor_de, texto_do_html
from .lista import anotar_mudanca

JANELA_NOTA = (-1, 45)  # a nota sai quando o vendedor envia: do dia do pedido até ~6 semanas depois
JANELA_CNPJ = (-7, 60)  # com o CNPJ do vendedor batendo, a data só precisa ser plausível
JANELA_FATURA = (-2, 10)  # a cobrança aparece no cartão no dia da aprovação do pagamento ou poucos dias depois
_COMUNS = {"PARA", "COM", "KIT", "UNIDADE", "UNIDADES", "PRODUTO", "ORIGINAL", "NOVO", "ENVIO", "IMEDIATO", "CADA", "CORES", "TAMANHO"}


def _dia(iso: Any) -> date | None:
    try:
        return date.fromisoformat(str(iso or "")[:10])
    except ValueError:
        return None


def _ddmm(iso: Any) -> str:
    s = str(iso or "")
    return f"{s[8:10]}/{s[5:7]}" if len(s) >= 10 else "?"


def _palavras(txt: str) -> set[str]:
    return {w for w in norm_txt(txt).split() if len(w) >= 4 and not w.isdigit() and w not in _COMUNS}


def _no_cartao(ped: dict[str, Any]) -> float:
    """O que do pedido foi cobrado no cartão: o total, ou só a parte do cartão quando pagou em duas formas
    (Mercado Livre: saldo do Mercado Pago + cartão)."""
    v = (ped.get("pagamento") or {}).get("valor_cartao")
    return float(v) if v is not None else float(ped.get("total") or 0)


def _compra(db: dict[str, Any], cid: str | None) -> dict[str, Any] | None:
    return next((c for c in db["compras"] if c["id"] == cid), None) if cid else None


def _cartao_do_final(db: dict[str, Any], final: str | None) -> tuple[dict[str, Any] | None, str | None]:
    """O cartão que tem esse final cadastrado (⚙ › Cartões › finais) e quem usa esse final."""
    for k in db.get("cartoes") or []:
        x = (k.get("finais") or {}).get(final or "")
        if x is not None:
            return k, x.get("quem") or k.get("dono")
    return None, None


def _quem(db: dict[str, Any], p: dict[str, Any], dono_cartao: str | None, cliente: Any = None) -> str:
    """Quem comprou: o escolhido na tela, senão quem usa o final do cartão que o e-mail traz (⚙ › Cartões; sem ninguém
    no final, o dono do cartão), senão o primeiro nome da saudação do e-mail ("Olá, Júlia" — nome de exemplo —, pelos apelidos da pessoa),
    senão a primeira pessoa. Quem encaminhou não conta: a caixa auxiliar recebe de todos."""
    nomes = compradores()
    for q in (p.get("quem"), dono_cartao):
        q = str(q or "").strip()
        if q:
            achado = next((n for n in nomes if norm_txt(n) == norm_txt(q) or norm_txt(q).startswith(norm_txt(n) + " ")), None)
            if achado:
                return achado
    from .dados import apelidos_de, pessoas
    for cli in ([cliente] if isinstance(cliente, str) else list(cliente or [])):  # vários: o primeiro que é da casa
        c = (norm_txt(cli or "").split() or [""])[0]
        achado = next((x["nome"] for x in pessoas() if c and (c in apelidos_de(x) or c == norm_txt(x["nome"]))), None)
        if achado:
            return achado
    return nomes[0] if nomes else ""


# ---------------------------------------------------------------- parte → compra

def _classe_item_online(descricao: str) -> tuple[str, str | None] | None:
    d = norm_txt(descricao)
    k, ci = next(((c, s) for rx, c, s in CLASSE_POR_ITEM_ONLINE if re.search(rx, d)), None), classe_item({"descricao": descricao})
    if k and k[1] is None and ci and ci[0] == k[0]:  # "Bebê" pelo título; a descrição diz qual (chupeta → Alimentação)
        return ci
    return k or ci


def classe_online(db: dict[str, Any], loja: str, itens: list[dict[str, Any]]) -> tuple[str, str | None, str]:
    """Área da parte do pedido pelos itens do e-mail (sem NCM): a do item que pesa mais no valor; sem nenhuma clara,
    Compras online › <loja> (fica marcada para a tela classificar)."""
    por: dict[tuple[str, str | None], float] = {}
    for i in itens:
        k = _classe_item_online(i.get("descricao") or "")
        if k:
            por[k] = por.get(k, 0) + (i.get("total") or 0) + 0.001
    for k in sorted(por, key=lambda k: -por[k]):
        try:
            return (*checar_classe(db, *k), "itens")
        except Falha:
            continue
    for sub in (loja, "Outras"):  # loja sem sub própria (TikTok Shop): Compras online › Outras
        try:
            return (*checar_classe(db, "Compras online", sub), "a classificar")
        except Falha:
            continue
    return "Outros", "Outros", "padrão"

def _compra_da_parte(db: dict[str, Any], ped: dict[str, Any], parte: dict[str, Any], quem: str) -> dict[str, Any]:
    from .registro import pessoa_reembolsa, reembolso_novo  # registro também usa este módulo
    pg = ped.get("pagamento") or {}
    k = next((x for x in db.get("cartoes") or [] if x["id"] == pg.get("cartao")), None)
    itens = [{"n": i + 1, "descricao": it["descricao"], "codigo": "", "ean": None, "ncm": None, "qtd": it.get("qtd") or 1, "un": "UN",
              "unit": round(it["preco"] / (it.get("qtd") or 1), 2), "total": it["preco"], "promo": False, "manual": True}
             for i, it in enumerate(parte.get("itens") or [])]
    loja = {"nome": f"{ped['loja']} · {parte['vendedor']}" if parte.get("vendedor") else ped["loja"], "cnpj": "", "cidade": "", "uf": ""}
    cat, sub, via = classe_online(db, ped["loja"], itens)
    pagamentos = []
    if pg.get("tipo"):
        pagamentos = [{"forma": "", "tipo": pg["tipo"], "valor": parte["pago"], "parcelas": pg.get("parcelas") or 1,
                       **({"cartao": k["id"], "cartao_via": "pedido", "bandeira": k.get("bandeira")} if k and pg["tipo"] in ("Crédito", "Débito")
                          else {"bandeira": pg["bandeira"]} if pg.get("bandeira") else {}),
                       **({"carteira": pg["carteira"]} if pg.get("carteira") else {})}]
    if len(pg.get("formas") or []) > 1 and ped.get("total"):  # duas formas (saldo + cartão): cada uma na proporção da parte
        peso = parte["pago"] / ped["total"]
        pagamentos = []
        for f in pg["formas"]:
            x = {"forma": "", "tipo": f["tipo"], "valor": round(f["valor"] * peso, 2), "parcelas": f.get("parcelas") or 1}
            if f["tipo"] == "Crédito":
                x.update({"cartao": k["id"], "cartao_via": "pedido", "bandeira": k.get("bandeira")} if k else ({"bandeira": f["bandeira"]} if f.get("bandeira") else {}))
            if f.get("carteira"):
                x["carteira"] = f["carteira"]
            pagamentos.append(x)
        pagamentos[-1]["valor"] = round(pagamentos[-1]["valor"] + parte["pago"] - sum(x["valor"] for x in pagamentos), 2)
    desconto = round(sum(d["valor"] for d in parte.get("descontos") or []), 2)
    return {"id": f"pedido-{parte['numero']}", "chave": None, "origem": "manual", "via": "pedido", "quem": quem,
            "reembolso": reembolso_novo("a_reembolsar" if pessoa_reembolsa(quem) else "nao"),
            "categoria": cat, "subcategoria": sub, "classe_via": via, "loja": loja, "numero": parte["numero"], "serie": "",
            "emissao": ped["data"], "itens": itens, "qtd_itens": len(itens), "valor_produtos": parte.get("produtos"),
            "frete": parte.get("frete") or 0.0, "desconto": desconto, "valor_pago": parte["pago"], "tributos": None,
            "pagamentos": pagamentos, "observacao": "", "conferencia": {"soma_itens": round(sum(i["total"] for i in itens), 2), "bate": bool(parte.get("bate"))},
            "pedido": {"id": ped["id"], "numero": parte["numero"], "loja": ped["loja"]}, "registrado_em": now_iso()}


# ---------------------------------------------------------------- nota ↔ parte

_TEXTO_NOTA: dict[str, str] = {}


def _texto_nota(nota: dict[str, Any]) -> str:
    """O texto da cópia completa da nota (página do portal, XML ou PDF lido), para achar o número do pedido da loja online
    ("Ref. ao pedido numero …", "Pedido …"). Lido uma vez por nota."""
    chave = str(nota.get("chave") or "")
    if not chave:
        return ""
    if chave not in _TEXTO_NOTA:
        import html as _html
        from .config import NOTAS_DIR
        t = ""
        for ext in ("html", "xml", "txt"):
            p = NOTAS_DIR / f"{chave}.{ext}"
            try:
                if p.exists():
                    t = _html.unescape(re.sub(r"<[^>]+>", " ", p.read_text(encoding="utf-8", errors="replace")))
                    break
            except OSError:
                pass
        _TEXTO_NOTA[chave] = t
    return _TEXTO_NOTA[chave]


def _combina(nota: dict[str, Any], ped: dict[str, Any], parte: dict[str, Any]) -> int:
    """0 = não é esta parte; 1 = o valor e a data batem; 2 = e o nome dos itens também; 3 = o CNPJ do vendedor é o da nota;
    4 = a nota cita o número desse pedido da loja (o mais seguro: o vendedor escreve na nota "Ref. ao pedido numero …")."""
    if nota.get("origem") not in ("nfe", "nfce") or ped["id"] in (nota.get("fora_do_pedido") or []):
        return 0
    # o dia da compra: o do pagamento, se veio antes (o "Recebemos seu pedido" às vezes chega dias depois)
    dn, dp = _dia(nota.get("emissao")), min((d for d in (_dia(ped.get("data")), _dia(ped.get("pago_em"))) if d), default=None)
    if not dn or not dp:
        return 0
    dias = (dn - dp).days
    if JANELA_CNPJ[0] <= dias <= 90 and parte.get("numero") and parte["numero"] in _texto_nota(nota):
        return 4
    cn = re.sub(r"\D", "", str((nota.get("loja") or {}).get("cnpj") or ""))
    if (nota.get("chave") or "")[20:22] == "65" and not (parte.get("cnpj") and cn):
        return 0  # cupom de balcão (NFC-e): só com o número do pedido na nota ou o CNPJ do vendedor (valor e nome enganam)
    if JANELA_NOTA[0] <= dias <= JANELA_NOTA[1] and _cobre(nota, parte) and (nota.get("valor_pago") or 0) < (parte.get("pago") or 0) - 0.005 \
            and (not parte.get("cnpj") or not cn or cn[:8] == parte["cnpj"][:8] or len(parte.get("itens") or []) > 1):
        return 3 if parte.get("cnpj") and cn[:8] == parte["cnpj"][:8] else 2
    if parte.get("cnpj") and cn:  # mesma empresa (raiz do CNPJ; a nota pode sair de outra filial): a janela pode ser folgada
        return 3 if cn[:8] == parte["cnpj"][:8] and JANELA_CNPJ[0] <= dias <= JANELA_CNPJ[1] else 0
    if not JANELA_NOTA[0] <= dias <= JANELA_NOTA[1]:
        return 0
    prod = parte.get("produtos") or sum(i.get("preco") or 0 for i in parte.get("itens") or [])
    vn = nota.get("valor_produtos") or sum(i.get("total") or 0 for i in nota.get("itens") or [])
    if not prod or abs(vn - prod) > max(0.05, 0.01 * prod):
        return 0
    pn = set().union(*[_palavras(i.get("descricao") or "") for i in nota.get("itens") or []] or [set()])
    pp = set().union(*[_palavras(i.get("descricao") or "") for i in parte.get("itens") or []] or [set()])
    return 2 if pn & pp else 1


def _unica(cands: list[tuple[int, Any]]) -> Any:
    """A melhor candidata, se for a única com aquela nota (empate = não decide; vai ficar para a tela)."""
    if not cands:
        return None
    melhor = max(n for n, _ in cands)
    top = [x for n, x in cands if n == melhor]
    return top[0] if len(top) == 1 else None


def _ligacao_certa(nota: dict[str, Any], ped: dict[str, Any], parte: dict[str, Any]) -> bool:
    """A nota é desta parte sem dúvida: cita o número do pedido, ou é do CNPJ do vendedor, é NF-e (loja online; o cupom
    NFC-e é de balcão, e o vendedor pode ter loja física) e os itens batem com os do pedido. Aí não precisa do sino."""
    n = _combina(nota, ped, parte)
    if n >= 4:
        return True
    if n < 2 or (nota.get("chave") or "")[20:22] != "55":
        return False
    pn = set().union(*[_palavras(i.get("descricao") or "") for i in nota.get("itens") or []] or [set()])
    pp = set().union(*[_palavras(i.get("descricao") or "") for i in parte.get("itens") or []] or [set()])
    if n >= 3:
        return bool(pn & pp)
    # sem o CNPJ do vendedor (o e-mail da Amazon não traz): o valor dos produtos exato e o nome dos itens quase igual
    prod = parte.get("produtos") or sum(i.get("preco") or 0 for i in parte.get("itens") or [])
    vn = nota.get("valor_produtos") or sum(i.get("total") or 0 for i in nota.get("itens") or [])
    return not parte.get("cnpj") and abs(vn - prod) < 0.011 and len(pn & pp) >= max(3, len(pp) // 2)


def _cobre(nota: dict[str, Any], parte: dict[str, Any]) -> list[int]:
    """Parte com vários produtos e a nota de só alguns deles (outro vendedor manda a nota do resto): os produtos da parte
    que a nota cobre, pelo nome. Vazio se a nota cobre tudo, nada, ou a parte tem um produto só."""
    its = parte.get("itens") or []
    if len(its) < 2 or parte.get("nota"):
        return []
    meus: set[int] = set()
    nomes = [i.get("descricao") or "" for i in nota.get("itens") or []]
    for n in nomes:
        # cada produto da nota é o produto da parte mais parecido, se for um só (a nota abrevia: "SUPORTE UNIV. MULTIUSO")
        # desempate: a fração do nome do produto da parte que a nota cobre ("Suporte Babá Eletrônica Câmera" × "Babá
        # Eletrônica Vb603": a nota "Baba Eletronica Vb603 … Camera" cobre o nome todo do segundo)
        notas = [(round(x / max(1, len(_palavras(i.get("descricao") or ""))), 3) if x else 0, k)
                 for k, i in enumerate(its) for x in [_parecidos(i.get("descricao") or "", n)]]
        melhor = max(x for x, _ in notas)
        if melhor > 0 and sum(1 for x, _ in notas if x == melhor) == 1:
            meus.add(next(k for x, k in notas if x == melhor))
        else:
            return []  # produto da nota que não é da parte: não é nota parcial deste pedido (cupom de mercado com 20 itens)
    return sorted(meus) if 0 < len(meus) < len(its) else []


def _dividir(db: dict[str, Any], ped: dict[str, Any], parte: dict[str, Any], nota: dict[str, Any]) -> dict[str, Any]:
    """A nota cobre só alguns produtos da parte: esses viram uma parte nova (com o valor da nota e o CNPJ dela) e o resto
    continua na parte, com o que sobra do valor pago, esperando a nota do outro vendedor. A compra da parte acompanha."""
    meus = _cobre(nota, parte)
    vn = round(nota.get("valor_pago") or 0, 2)
    if not meus or not 0 < vn < (parte.get("pago") or 0) - 0.005:
        return parte
    its = parte["itens"]
    cn = re.sub(r"\D", "", str((nota.get("loja") or {}).get("cnpj") or ""))
    base = parte["numero"].split("-")[0]
    usados = {x["numero"] for x in ped["partes"]}
    k = 2
    while f"{base}-{k}" in usados:
        k += 1
    nova = {"numero": f"{base}-{k}", "vendedor": parte.get("vendedor") if cn and parte.get("cnpj", "")[:8] == cn[:8] else None,
            **({"cnpj": cn} if cn else {}), "itens": [its[i] for i in meus], "produtos": vn, "frete": 0.0, "descontos": [],
            "pago": vn, "bate": True, "situacao": "ok", "dividida_de": parte["numero"]}
    resto = round(parte["pago"] - vn, 2)
    parte.update({"itens": [x for i, x in enumerate(its) if i not in meus], "produtos": resto, "frete": 0.0, "descontos": [],
                  "pago": resto, "bate": True})
    if nova["vendedor"]:  # o vendedor do e-mail era o desta nota: o resto é de outro, ainda sem nome
        parte.pop("vendedor", None)
    if cn and parte.get("cnpj", "")[:8] == cn[:8]:
        parte.pop("cnpj", None)
    pc = _compra(db, parte.get("compra"))
    if pc and pc.get("via") == "pedido":
        novo = _compra_da_parte(db, ped, parte, pc.get("quem") or "")
        pc.update({x: novo[x] for x in ("itens", "qtd_itens", "valor_produtos", "frete", "desconto", "valor_pago", "pagamentos", "conferencia", "loja")})
    nc = _compra_da_parte(db, ped, nova, (pc or {}).get("quem") or ped.get("quem") or "")
    db["compras"].append(nc)
    nova["compra"] = nc["id"]
    ped["partes"].append(nova)
    return nova


def encaixar(db: dict[str, Any], nota: dict[str, Any], ped: dict[str, Any], parte: dict[str, Any]) -> None:
    """A nota entra no lugar da parte do pedido. Ligação sem dúvida (_ligacao_certa) entra direto; as outras vão para o
    sino, onde o Desfazer devolve a parte como estava. O valor que vale é sempre o pago no pedido (cupom e frete inclusos).
    Nota de só alguns produtos da parte (carrinho com vários vendedores): divide a parte antes (_dividir)."""
    parte = _dividir(db, ped, parte, nota)
    certa = _ligacao_certa(nota, ped, parte)
    pc = _compra(db, parte.get("compra"))
    campos = ("quem", "reembolso", "cobrado", "data_compra", "pedido", "categoria", "subcategoria", "classe_via", "categoria_manual")
    antes = {k: copy.deepcopy(nota.get(k)) for k in campos}
    pg = (ped.get("pagamento") or {})
    nota["pedido"] = {"id": ped["id"], "numero": parte["numero"], "loja": ped["loja"]}
    if pc:
        nota["quem"], nota["reembolso"] = pc.get("quem") or nota.get("quem"), copy.deepcopy(pc.get("reembolso") or nota.get("reembolso"))
        # área escolhida na tela vale; a dos itens do pedido (título do anúncio) também, se a da nota não foi escolhida
        if pc.get("categoria_manual") or (pc.get("classe_via") == "itens" and not nota.get("categoria_manual")):
            for k in ("categoria", "subcategoria", "classe_via", "categoria_manual"):
                if pc.get(k) is not None:
                    nota[k] = pc.get(k)
        pgs = copy.deepcopy(pc.get("pagamentos") or [])
    else:
        pgs = []
    for x in pgs:
        x["valor"] = parte["pago"]
    vp = nota.get("valor_pago") or 0
    motivo = "Cupom do app" if parte["pago"] < vp - 0.005 else "Frete à parte" if parte["pago"] > vp + 0.005 else None
    nota["cobrado"] = {"valor": parte["pago"], "motivo": motivo or "Outro", **({"pagamentos": pgs} if pgs else {}), "via": "pedido"}
    if str(ped.get("data") or "")[:10] != str(nota.get("emissao") or "")[:10]:
        nota["data_compra"] = str(ped["data"])[:10]
    if pc:
        db["compras"].remove(pc)
        for f in (db.get("faturas_banco") or {}).values():  # a linha da fatura que apontava para a parte passa para a nota
            for l in f["linhas"]:
                if l.get("compra") == pc["id"]:
                    l["compra"] = nota["id"]
    parte["compra"], parte["nota"] = nota["id"], nota["id"]
    texto = (f"Nota do pedido {ped['loja']} de {_ddmm(ped['data'])} ({parte.get('vendedor') or parte['numero']}): "
             + (f"vale {fmt_brl(parte['pago'])}, não {fmt_brl(vp)} da nota ({'cupom' if motivo == 'Cupom do app' else 'frete à parte'})."
                if motivo else f"{fmt_brl(parte['pago'])}, como no pedido.")
             + (f" Cartão e data do pedido{' (' + str(pg.get('parcelas')) + 'x)' if (pg.get('parcelas') or 1) > 1 else ''}." if pgs else ""))
    if certa:  # sem sino: fica só o registro na compra (o valor da nota e o pago no pedido)
        nota["pedido"]["encaixe"] = {"em": now_iso(), "texto": texto}
        return
    anotar_mudanca(db, nota, texto, antes)
    db["mudancas"][-1]["parte"] = {"pedido": ped["id"], "numero": parte["numero"]}


def encaixar_nota_nova(db: dict[str, Any], nota: dict[str, Any]) -> dict[str, Any] | None:
    """Nota que acabou de chegar: é uma parte de pedido ainda sem nota? Encaixa e devolve o pedido."""
    cands = [(n, (ped, parte)) for ped in db.get("pedidos") or [] if ped.get("situacao") in ("pago", "aguardando_pagamento")
             for parte in ped["partes"] if not parte.get("nota") and parte.get("situacao") != "cancelada"
             and (n := _combina(nota, ped, parte))]
    achado = _unica(cands)
    if not achado:
        return None
    if achado[0].get("situacao") == "aguardando_pagamento":
        confirmar(db, achado[0], "a nota chegou")
    encaixar(db, nota, *achado)
    return achado[0]


def soltar_nota(db: dict[str, Any], ref: dict[str, Any], nota: dict[str, Any] | None) -> None:
    """Desfazer do sino: a nota sai do pedido (e não volta sozinha) e a parte volta a ser a compra do e-mail."""
    ped = next((x for x in db.get("pedidos") or [] if x["id"] == ref.get("pedido")), None)
    parte = next((x for x in (ped or {}).get("partes") or [] if x["numero"] == ref.get("numero")), None)
    if not ped or not parte:
        return
    if nota is not None:
        nota.setdefault("fora_do_pedido", []).append(ped["id"])
    pc = _compra_da_parte(db, ped, parte, (nota or {}).get("quem") or _quem(db, {}, None))
    if not _compra(db, pc["id"]):
        db["compras"].append(pc)
    parte["compra"] = pc["id"]
    parte.pop("nota", None)


# ---------------------------------------------------------------- fatura ↔ pedido

def pedido_da_linha(db: dict[str, Any], descricao: str, cartao: str, final: str | None, dia: str, total: float, n: int,
                    usados: set[str] | None = None) -> dict[str, Any] | None:
    """O pedido que é esta cobrança da fatura: a linha começa com o nome da loja ("SHOPEE *…"), mesmo cartão (ou final),
    data perto, o total do pedido (todas as partes juntas: uma cobrança só) e o mesmo número de parcelas."""
    d = _dia(dia)
    cands = []
    for ped in db.get("pedidos") or []:
        m = leitor_da_loja(ped["loja"])
        pg = ped.get("pagamento") or {}
        if (ped["id"] in (usados or set()) or ped.get("fatura") or ped.get("situacao") not in ("pago", "aguardando_pagamento")
                or not m or not re.search(m.NA_FATURA, descricao or "", re.I)):
            continue
        if pg.get("tipo") not in ("Crédito", None) or (pg.get("cartao") and pg["cartao"] != cartao) or (pg.get("final") and final and pg["final"] != final and not pg.get("cartao")):
            continue
        dp = _dia(ped.get("data"))
        if not d or not dp or not JANELA_FATURA[0] <= (d - dp).days <= JANELA_FATURA[1]:
            continue
        if abs(_no_cartao(ped) - total) > 0.011 or (pg.get("parcelas") and int(pg["parcelas"]) != int(n or 1)):
            continue
        cands.append(ped)
    return cands[0] if len(cands) == 1 else None


def ligar_fatura(db: dict[str, Any], ped: dict[str, Any], linhas: list[tuple[str, int]], cartao: str) -> str | None:
    """Liga as linhas (fatura, índice) ao pedido. A linha guarda o pedido e a compra da primeira parte (para não
    ser trazida de novo como compra solta). O cartão que faltava nas partes vem da fatura. Devolve a compra ligada.
    Pedido ainda aguardando o pagamento: a cobrança confirma."""
    if ped.get("situacao") == "aguardando_pagamento":
        confirmar(db, ped, "a cobrança está na fatura")
    vivas = [p for p in ped["partes"] if p.get("situacao") != "cancelada" and _compra(db, p.get("compra"))]
    if not vivas:
        return None
    fbs = db.get("faturas_banco") or {}
    for fid, i in linhas:
        l = fbs[fid]["linhas"][i]
        l["compra"], l["pedido"] = vivas[0]["compra"], ped["id"]
    ped["fatura"] = [[fid, i] for fid, i in linhas]
    ped.setdefault("pagamento", {})["cartao"] = ped["pagamento"].get("cartao") or cartao
    # o e-mail não disse a forma (Amazon): a fatura diz que foi crédito nesse cartão, e em quantas parcelas
    parc = re.match(r"\s*\d+\s*/\s*(\d+)", str(fbs[linhas[0][0]]["linhas"][linhas[0][1]].get("parcela") or "")) if linhas else None
    k = next((x for x in db.get("cartoes") or [] if x.get("id") == cartao), None)
    if not ped["pagamento"].get("tipo"):
        ped["pagamento"].update({"tipo": "Crédito", "parcelas": int(parc[1]) if parc else 1})
    for p in vivas:
        c = _compra(db, p["compra"])
        if not c.get("pagamentos") and not (c.get("cobrado") or {}).get("pagamentos"):
            c["pagamentos"] = [{"forma": "", "tipo": "Crédito", "valor": c.get("valor_pago"), "parcelas": int(parc[1]) if parc else 1,
                                "cartao": cartao, "cartao_via": "fatura", **({"bandeira": k["bandeira"]} if k and k.get("bandeira") else {})}]
            continue
        for pg in ((c.get("cobrado") or {}).get("pagamentos") or c.get("pagamentos") or []):
            if pg.get("tipo") == "Crédito" and not pg.get("cartao"):
                pg["cartao"], pg["cartao_via"] = cartao, "fatura"
                if parc and not ped["pagamento"].get("parcelas"):  # o e-mail só disse "Parcelado": a fatura diz em quantas
                    pg["parcelas"] = int(parc[1])
    if parc and not ped["pagamento"].get("parcelas"):
        ped["pagamento"]["parcelas"] = int(parc[1])
    conferir_data(db, ped)
    return vivas[0]["compra"]


def _dia_fatura(db: dict[str, Any], ped: dict[str, Any]) -> str | None:
    """O dia da compra que o banco mostra na linha da fatura ligada ao pedido (a 1ª parcela)."""
    fbs = db.get("faturas_banco") or {}
    ls = [fbs.get(fid, {}).get("linhas", [])[i] for fid, i in ped.get("fatura") or [] if i < len(fbs.get(fid, {}).get("linhas", []))]
    l = next((x for x in ls if not x.get("parcela") or str(x["parcela"]).startswith("01/")), ls[0] if ls else None)
    return str(l["data"])[:10] if l and l.get("data") else None


def conferir_data(db: dict[str, Any], ped: dict[str, Any]) -> bool:
    """Dupla verificação: o dia do pagamento (e-mail) × o dia na fatura do banco. Diferente: vai para o sino (não muda
    sozinho). True se achou uma diferença nova."""
    df, de = _dia_fatura(db, ped), str(ped.get("pago_em") or ped.get("data") or "")[:10]
    if not df or not de or df == de or ped.get("data_conferida") == df or (ped.get("data_diferente") or {}).get("fatura") == df:
        return False
    ped["data_diferente"] = {"fatura": df, "email": de, "em": now_iso()}
    return True


def _usar_dia(db: dict[str, Any], ped: dict[str, Any], dia: str) -> None:
    """O pedido e as compras dele passam para o dia escolhido (a hora do pedido fica)."""
    hora = str(ped.get("data") or "")[10:] or "T12:00:00-03:00"
    ped["data"] = dia + hora
    for parte in ped["partes"]:
        c = _compra(db, parte.get("compra"))
        if c and c.get("via") == "pedido":
            c["emissao"] = ped["data"]
        elif c:
            c["data_compra"] = dia


def ligar_pedidos_na_fatura(db: dict[str, Any], f: dict[str, Any], cartao: str) -> int:
    """Fatura que acabou de ser lida (já guardada em db["faturas_banco"]): as linhas da loja online ainda soltas que são
    um pedido. A mesma fatura lida de novo: os pedidos que estavam nela ligam de novo. Quantas ligou."""
    for ped in db.get("pedidos") or []:
        if any(x[0] == f["id"] for x in ped.get("fatura") or []):
            ped.pop("fatura")
    n = 0
    for i, l in enumerate(f["linhas"]):
        if l["tipo"] != "compra" or l.get("compra") or (l.get("parcela") and not l["parcela"].startswith("01/")):
            continue
        vezes = int(l["parcela"].split("/")[1]) if l.get("parcela") else 1
        total = round(l["valor"] * vezes, 2) if vezes > 1 else l["valor"]
        ped = pedido_da_linha(db, l["descricao"], cartao, l.get("final"), l["data"], total, vezes)
        if ped:
            ligar_fatura(db, ped, [(f["id"], i)], cartao)
            n += 1
    return n


# ---------------------------------------------------------------- e-mail → pedido

def _novo(db: dict[str, Any], r: dict[str, Any], p: dict[str, Any]) -> dict[str, Any]:
    if not r.get("partes"):
        raise Falha(f"E-mail da {r['loja']} sem pedido que eu entenda. Me avise para eu ajustar a leitura.")
    nums = {x["numero"] for x in r["partes"] if x.get("numero")}
    velho = _do_numero(db, nums)
    if not r.get("data"):  # o aviso do IMAP só traz a data do e-mail mais recente: a da confirmação (se já veio) ou a de agora
        r = {**r, "data": (velho or {}).get("pago_em") or (velho or {}).get("data") or now_iso()}
    if velho and velho.get("situacao") == "aguardando_pagamento" and r.get("pago"):
        # a confirmação de pagamento da Amazon traz os preços de novo: vale o que ela diz (o "recusado" mostra total zero)
        antes = {x["numero"]: x for x in velho["partes"]}
        partes = [{**x, "situacao": "ok", **{k_: v for k_, v in (antes.get(x["numero"]) or {}).items() if k_ in ("cnpj", "razao") and v}} for x in r["partes"]]
        velho.update({"partes": partes, "total": r["total"], "pago_em": r["data"]})
        return _msg_confirmado(velho, confirmar(db, velho, r["pago"]))
    if velho and velho.get("situacao") != "pago_sem_detalhes":
        return {"ok": True, "status": "repetido", "silencioso": True, "id": _primeira(velho), "pedido": velho["id"], "quem": velho.get("quem"),
                "mensagem": f"E-mail \"Recebemos seu pedido\": esse pedido já estava lançado. {parecer(db, velho)}"}
    pg = dict(r.get("pagamento") or {})
    k, dono = _cartao_do_final(db, pg.get("final")) if pg.get("tipo") in ("Crédito", "Débito") else (None, None)
    pg["cartao"] = k["id"] if k else None
    quem = _quem(db, p, dono, r.get("clientes") or r.get("cliente"))
    partes = [{**x, "situacao": "ok"} for x in r["partes"]]
    for x in partes:
        _coerente(x)
    if velho:  # o pagamento chegou antes: completa com os preços (o CNPJ do vendedor fica) e confirma
        antes = {x["numero"]: x for x in velho["partes"]}
        for x in partes:
            x.update({k_: v for k_, v in (antes.get(x["numero"]) or {}).items() if k_ in ("cnpj", "razao") and v})
        velho.update({"data": min(str(r["data"]), str(velho.get("pago_em") or r["data"])), "pagamento": {**pg, **{k_: v for k_, v in (velho.get("pagamento") or {}).items() if v}},
                      "total": r["total"], "partes": partes, "quem": quem, "situacao": "aguardando_pagamento"})
        if _cartao_de_fora(db, velho) and p.get("via") == "email":
            return _conferir(velho)
        return _msg_confirmado(velho, confirmar(db, velho, "o pagamento já tinha sido confirmado"))
    pid = f"pd-{norm_txt(r['loja']).lower().replace(' ', '')}-{sorted(nums)[0]}"
    ped = {"id": pid, "loja": r["loja"], "numeros": r.get("numeros") or sorted(nums), "data": r["data"], "quem": quem,
           "pagamento": pg, "total": r["total"], "situacao": "aguardando_pagamento", "fonte": p.get("via") or "email",
           "partes": partes, "registrado_em": now_iso()}
    db.setdefault("pedidos", []).append(ped)
    if p.get("via") != "email":  # pela tela (PDF): quem manda já sabe que pagou
        return _msg_confirmado(ped, confirmar(db, ped, "enviado pela tela"))
    if r.get("pago"):  # o próprio e-mail já vale como pago (Amazon)
        ped["pago_em"] = r["data"]
        return _msg_confirmado(ped, confirmar(db, ped, r["pago"]))
    prova = _ja_pago(db, ped)  # nota já lançada ou cobrança já na fatura: o pagamento passou, lança sem esperar a confirmação
    if prova:
        return _msg_confirmado(ped, confirmar(db, ped, prova))
    n = len(partes)
    return {"ok": True, "status": "pedido_aguardando", "silencioso": True, "pedido": pid, "quem": quem, "valor": ped["total"],
            "mensagem": f"Pedido {ped['loja']} de {_ddmm(ped['data'])} · {fmt_brl(ped['total'])} · {n} {'loja' if n == 1 else 'lojas'}: "
                        "guardado, aguardando o e-mail \"Confirmação de pagamento\" para lançar."}


def _ja_pago(db: dict[str, Any], ped: dict[str, Any]) -> str | None:
    """Prova de pagamento já nos dados, para o "Recebemos seu pedido" que chega sem a confirmação: a nota de uma das lojas
    (que cita o número do pedido, ou com o mesmo valor dos produtos, data perto e o nome dos itens) ou a cobrança na fatura
    com o total do pedido. Devolve de onde veio a prova."""
    for parte in ped["partes"]:
        for c in db["compras"]:
            if not c.get("pedido") and not c.get("excluida_em") and _combina(c, ped, parte) >= 2:
                return "a nota já estava lançada"
    f = _fatura_parecida(db, ped)
    if f and f["igual"]:
        return "a cobrança já estava na fatura"
    pg = ped.get("pagamento") or {}
    m = leitor_da_loja(ped["loja"])
    if m and pg.get("tipo") in ("Crédito", None):  # a compra solta que a fatura criou ("Shopee", sem itens), com o total do pedido
        dp = _dia(ped.get("data"))
        for c in db["compras"]:
            fb = c.get("fatura_banco") or {}
            d = _dia(c.get("emissao"))
            if (c.get("via") == "fatura" and re.search(m.NA_FATURA, fb.get("descricao") or "", re.I) and d and dp
                    and JANELA_FATURA[0] <= (d - dp).days <= JANELA_FATURA[1] and abs((c.get("valor_pago") or 0) - _no_cartao(ped)) < 0.011):
                return "a cobrança já estava na fatura"
    return None


def _coerente(parte: dict[str, Any]) -> bool:
    """Itens que não fecham com o subtotal da loja: o e-mail às vezes mostra o preço de cada unidade (4 × R$ 10,50 = 42,00),
    às vezes um preço que não bate com o subtotal (variação do anúncio). Unitário fechando: vira o total da linha; um item só
    que não fecha: fica o subtotal do e-mail. True se mudou."""
    itens, prod = parte.get("itens") or [], parte.get("produtos")
    if not itens or prod is None or any(i.get("preco") is None for i in itens):
        return False
    linhas, unit = sum(i["preco"] for i in itens), sum(i["preco"] * (i.get("qtd") or 1) for i in itens)
    if abs(linhas - prod) < 0.03:
        return False
    if abs(unit - prod) < 0.03:
        for i in itens:
            i["preco"] = round(i["preco"] * (i.get("qtd") or 1), 2)
    elif len(itens) == 1:
        itens[0]["preco"], itens[0]["ajustado"] = round(prod, 2), True  # o e-mail não fecha: vale o subtotal
    else:
        return False
    esperado = round(prod + (parte.get("frete") or 0) - sum(d["valor"] for d in parte.get("descontos") or []), 2)
    parte["bate"] = abs(esperado - (parte.get("pago") or 0)) < 0.03
    return True


def _primeira(ped: dict[str, Any]) -> str | None:
    return next((x["compra"] for x in ped["partes"] if x.get("compra")), None)


def parecer(db: dict[str, Any], ped: dict[str, Any]) -> str:
    """Como o pedido está na Central, numa linha: valor, lojas, com nota / sem nota, cobrança e quem."""
    sit = {"pago": "lançado", "aguardando_pagamento": "aguardando a confirmação do pagamento", "pago_sem_detalhes": "falta o e-mail com os preços",
           "conferir_cartao": "no sino: cartão não cadastrado", "cancelado": "cancelado",
           "aguardando_print": "falta o print de Detalhes da transação"}.get(ped.get("situacao"), ped.get("situacao"))
    vivas = [x for x in ped["partes"] if x.get("situacao") != "cancelada"]
    com_nota = sum(1 for x in vivas if x.get("nota"))
    pg = ped.get("pagamento") or {}
    k = next((x for x in db.get("cartoes") or [] if x["id"] == pg.get("cartao")), None)
    from .pagamentos import rotulo_cartao
    como = f"{rotulo_cartao(k, db.get('cartoes') or [])} {pg.get('parcelas') or 1}x" if k else (pg.get("tipo") or "")
    fat = "fatura conferida" if ped.get("fatura") else ""
    return " · ".join(x for x in (
        f"{ped['loja']} de {_ddmm(ped.get('data'))}", fmt_brl(ped.get("total")), f"{len(vivas)} {'loja' if len(vivas) == 1 else 'lojas'}",
        sit, (f"{com_nota} com nota, {len(vivas) - com_nota} sem nota" if ped.get("situacao") == "pago" else ""), como, fat, ped.get("quem") or "") if x)


def _cartao_de_fora(db: dict[str, Any], ped: dict[str, Any]) -> bool:
    """Pago no cartão, mas o final não está em ⚙ › Cartões: não lança sozinho, o sino pergunta se é de vocês."""
    pg = ped.get("pagamento") or {}
    return pg.get("tipo") in ("Crédito", "Débito") and bool(pg.get("final")) and not _cartao_do_final(db, pg.get("final"))[0]


def _conferir(ped: dict[str, Any]) -> dict[str, Any]:
    ped["situacao"] = "conferir_cartao"
    pg = ped.get("pagamento") or {}
    return {"ok": True, "status": "pedido_conferir", "pedido": ped["id"], "quem": ped.get("quem"), "valor": ped.get("total"),
            "mensagem": f"Pedido {ped['loja']} de {_ddmm(ped.get('data'))} · {fmt_brl(ped.get('total'))} no cartão final {pg.get('final') or '?'}, "
                        "que não está em ⚙ › Cartões. É de vocês? Confira no sino."}


def _do_numero(db: dict[str, Any], nums: set[str]) -> dict[str, Any] | None:
    return next((x for x in db.get("pedidos") or [] if nums & {y["numero"] for y in x["partes"]}), None)


def confirmar(db: dict[str, Any], ped: dict[str, Any], por: str) -> dict[str, Any]:
    """Pagamento confirmado (e-mail, nota ou fatura): cada parte vira compra; nota já lançada e compra solta da fatura
    entram no pedido."""
    ped["situacao"], ped["confirmado"] = "pago", {"em": now_iso(), "por": por}
    ja_tinha = []
    for parte in ped["partes"]:
        if parte.get("situacao") == "cancelada" or parte.get("compra"):
            continue
        pc = _compra_da_parte(db, ped, parte, ped.get("quem") or _quem(db, {}, None))
        db["compras"].append(pc)
        parte["compra"] = pc["id"]
        # a nota já chegou antes? (a parte acabou de entrar; a nota entra no lugar dela)
        cands = [(n, c) for c in db["compras"] if not c.get("pedido") and not c.get("excluida_em") and (n := _combina(c, ped, parte))]
        nota = _unica(cands)
        if nota is not None and not any(_combina(nota, ped, o) > _combina(nota, ped, parte) for o in ped["partes"] if o is not parte):
            encaixar(db, nota, ped, parte)
            ja_tinha.append(nota)
    # a fatura já tinha chegado e virou uma compra solta da loja ("Shopee", sem itens): o pedido toma o lugar dela
    solta = None if ped.get("fatura") else _solta_da_fatura(db, ped)
    db["compras"].sort(key=lambda c: c.get("emissao") or "", reverse=True)
    return {"notas": ja_tinha, "solta": solta}


def _msg_confirmado(ped: dict[str, Any], r: dict[str, Any]) -> dict[str, Any]:
    n = len(ped["partes"])
    msg = (f"Pedido {ped['loja']} de {_ddmm(ped['data'])} · {fmt_brl(ped['total'])} · {n} {'vendedor' if n == 1 else 'vendedores'} · {ped.get('quem')}"
           + (f" · {len(r['notas'])} {'nota já lançada entrou' if len(r['notas']) == 1 else 'notas já lançadas entraram'} no pedido" if r["notas"] else "")
           + (" · a compra da fatura entrou no pedido" if r["solta"] else "")
           + ("" if all(x.get("bate", True) for x in ped["partes"]) else " · ⚠ um valor do e-mail não fechou; confira"))
    primeira = next((x["compra"] for x in ped["partes"] if x.get("compra")), None)
    return {"ok": True, "status": "pedido_novo", "id": primeira, "pedido": ped["id"], "quem": ped.get("quem"), "valor": ped["total"], "mensagem": msg}


def _pago(db: dict[str, Any], r: dict[str, Any], p: dict[str, Any]) -> dict[str, Any]:
    """Confirmação de pagamento: confirma o pedido que estava aguardando (e guarda o CNPJ de cada vendedor). Chegou antes
    do e-mail do pedido: fica guardada até ele chegar (sem os preços não dá para lançar)."""
    nums = {x["numero"] for x in r.get("partes") or [] if x.get("numero")} or set(r.get("numeros") or [])
    if not nums:
        raise Falha(f"Confirmação de pagamento da {r['loja']} sem número de pedido que eu entenda. Me avise para eu ajustar a leitura.")
    ped = _do_numero(db, nums)
    dados = {x["numero"]: x for x in r.get("partes") or []}
    if ped and ped.get("situacao") == "aguardando_pagamento" and (r.get("pagamento") or {}).get("tipo"):
        pg = {**(ped.get("pagamento") or {}), **{k_: v for k_, v in r["pagamento"].items() if v}}  # a confirmação manda
        k, _ = _cartao_do_final(db, pg.get("final")) if pg.get("tipo") in ("Crédito", "Débito") else (None, None)
        pg["cartao"] = k["id"] if k else None
        ped["pagamento"] = pg
    if ped:
        mudou = False
        for x in ped["partes"]:
            for k_ in ("cnpj", "razao"):
                if (dados.get(x["numero"]) or {}).get(k_) and x.get(k_) != dados[x["numero"]][k_]:
                    x[k_], mudou = dados[x["numero"]][k_], True
        pg_r = {k_: v for k_, v in (r.get("pagamento") or {}).items() if v}
        if ped.get("situacao") == "pago" and pg_r.get("tipo") and not (ped.get("pagamento") or {}).get("tipo"):
            ped["pagamento"] = {**(ped.get("pagamento") or {}), **pg_r, "parcelas": (r.get("pagamento") or {}).get("parcelas")}
            for x in ped["partes"]:
                c = _compra(db, x.get("compra"))
                if c and not c.get("pagamentos") and x.get("situacao") != "cancelada":
                    c["pagamentos"] = [{"forma": "", "tipo": pg_r["tipo"], "valor": c.get("valor_pago"), "parcelas": pg_r.get("parcelas") or 1,
                                        **({"bandeira": pg_r["bandeira"]} if pg_r.get("bandeira") else {})}]
            return {"ok": True, "status": "pedido_pago", "silencioso": True, "id": _primeira(ped), "pedido": ped["id"], "quem": ped.get("quem"),
                    "mensagem": f"Pagamento do pedido {ped['loja']} de {_ddmm(ped.get('data'))}: {pg_r['tipo']}"
                                f"{' ' + pg_r['bandeira'] if pg_r.get('bandeira') else ''}. {parecer(db, ped)}"}
        if ped.get("situacao") not in ("aguardando_pagamento",) and not mudou and ped.get("pago_em"):
            return {"ok": True, "status": "repetido", "silencioso": True, "id": _primeira(ped), "pedido": ped["id"], "quem": ped.get("quem"),
                    "mensagem": f"E-mail \"Confirmação de pagamento\": esse pedido já estava lançado. {parecer(db, ped)}"}
        ped["pago_em"] = r.get("data")
        if r.get("data") and str(r["data"])[:10] < str(ped.get("data") or "9")[:10]:  # pago antes do "Recebemos": a compra é do dia do pagamento
            ped["data"] = r["data"]
        if ped.get("situacao") == "aguardando_pagamento":
            if _cartao_de_fora(db, ped) and p.get("via") == "email":
                return _conferir(ped)
            return _msg_confirmado(ped, confirmar(db, ped, "confirmação de pagamento"))
        return {"ok": True, "status": "pedido_pago", "silencioso": True, "id": _primeira(ped), "pedido": ped["id"], "quem": ped.get("quem"),
                "mensagem": f"Pagamento confirmado; o pedido já estava lançado. {parecer(db, ped)}"}
    pg = dict(r.get("pagamento") or {})
    k, dono = _cartao_do_final(db, pg.get("final")) if pg.get("tipo") in ("Crédito", "Débito") else (None, None)
    pg["cartao"] = k["id"] if k else None
    pid = f"pd-{norm_txt(r['loja']).lower().replace(' ', '')}-{sorted(nums)[0]}"
    db.setdefault("pedidos", []).append({
        "id": pid, "loja": r["loja"], "numeros": sorted(nums), "data": r.get("data"), "quem": _quem(db, p, dono, r.get("clientes") or r.get("cliente")), "pagamento": pg,
        "total": r.get("total") or 0.0, "situacao": "pago_sem_detalhes", "pago_em": r.get("data"), "fonte": p.get("via") or "email",
        "partes": [{**x, "pago": None, "situacao": "ok"} for x in r.get("partes") or []], "registrado_em": now_iso()})
    return {"ok": True, "status": "pedido_pago_sem_detalhes", "silencioso": True, "pedido": pid, "quem": db["pedidos"][-1].get("quem"),
            "mensagem": f"Pagamento da {r['loja']} ({fmt_brl(r.get('total'))}) confirmado; guardado até chegar o e-mail \"Recebemos seu pedido\", com os preços."}



# ---------------------------------------------------------------- Mercado Livre: e-mail sem valores + print

JANELA_PRINT = (-2, 2)  # dias entre o e-mail "Você comprou" e o dia do print "Detalhes da transação"


def _parecidos(a: str, b: str) -> int:
    """Palavras em comum entre dois nomes de produto (cortados em "…" de jeitos diferentes)."""
    pa, pb = _palavras(a), _palavras(b)
    return len(pa & pb) + sum(1 for x in pa for y in pb if x != y and len(x) >= 5 and (x.startswith(y) or y.startswith(x)))


def _sem_valores(db: dict[str, Any], r: dict[str, Any], p: dict[str, Any]) -> dict[str, Any]:
    """E-mail "Você comprou" (Mercado Livre): guarda o vendedor e o produto e pede o print. Chegou depois do print: só
    completa o vendedor (e o CNPJ, para a nota) na parte que veio sem ele."""
    prod = (r.get("itens") or [{}])[0].get("descricao") or ""
    data = r.get("data") or now_iso()
    d = _dia(data)
    chave = f"{str(data)[:16]}|{norm_txt(r.get('vendedor') or '')}|{norm_txt(prod)[:40]}"
    for ped in db.get("pedidos") or []:
        if ped["loja"] != r["loja"]:
            continue
        if ped.get("email_ml") == chave or chave in (ped.get("emails_ml") or []):
            return {"ok": True, "status": "repetido", "silencioso": True, "id": _primeira(ped), "pedido": ped["id"], "quem": ped.get("quem"),
                    "mensagem": f"E-mail \"Você comprou\": já estava guardado. {parecer(db, ped)}"}
        dp = _dia(ped.get("data"))
        if ped.get("situacao") != "pago" or not d or not dp or not JANELA_PRINT[0] <= (dp - d).days <= JANELA_PRINT[1]:
            continue
        for parte in ped["partes"]:
            its = parte.get("itens") or []
            livres = sorted(((_parecidos(prod, i["descricao"]), k) for k, i in enumerate(its) if not i.get("vendedor")), reverse=True) if prod else []
            if parte.get("vendedor") or not livres or livres[0][0] < 2:
                continue
            # o print veio antes, sem vendedor: este e-mail é dono do produto parecido (e dos outros, se a parte for só dele)
            n = r.get("qtd_produtos") or 1
            meus = [k for _, k in livres] if n >= len(livres) and len(livres) == len(its) else [livres[0][1]]
            for k in meus:
                its[k]["vendedor"] = r.get("vendedor")
            vends = list(dict.fromkeys(i.get("vendedor") for i in its))
            if len(vends) == 1 and vends[0]:  # a parte toda é de um vendedor: ele e o CNPJ (a nota encaixa por ele)
                parte.update({"vendedor": vends[0], **({"cnpj": r["cnpj"]} if r.get("cnpj") else {})})
            c = _compra(db, parte.get("compra"))
            if c and c.get("via") == "pedido":
                c["loja"]["nome"] = f"{ped['loja']} · {' + '.join(v for v in vends if v)}"
            ped.setdefault("emails_ml", []).append(chave)
            return {"ok": True, "status": "pedido_pago", "silencioso": True, "id": parte.get("compra"), "pedido": ped["id"], "quem": ped.get("quem"),
                    "mensagem": f"E-mail \"Você comprou\": o vendedor {r.get('vendedor')} entrou na compra do print. {parecer(db, ped)}"}
    quem = _quem(db, p, None, r.get("cliente"))
    pid = f"pd-mercadolivre-e{re.sub(r'[^0-9]', '', str(data)[:16])}-{norm_txt(r.get('vendedor') or 'x').lower().replace(' ', '')[:16]}"
    db.setdefault("pedidos", []).append({
        "id": pid, "loja": r["loja"], "numeros": [], "data": data, "quem": quem, "pagamento": {}, "total": None,
        "situacao": "aguardando_print", "fonte": p.get("via") or "email", "email_ml": chave,
        "partes": [{"numero": None, "vendedor": r.get("vendedor"), **({"cnpj": r["cnpj"]} if r.get("cnpj") else {}),
                    "itens": r.get("itens") or [], "qtd_produtos": r.get("qtd_produtos") or 1, "situacao": "ok"}],
        "registrado_em": now_iso()})
    n = r.get("qtd_produtos") or 1
    o_que = prod[:60] + (f" e mais {n - 1}" if n > 1 else "")
    return {"ok": True, "status": "pedido_print", "pedido": pid, "quem": quem,
            "mensagem": f"{o_que} ({r.get('vendedor') or 'vendedor?'}), {_ddmm(data)}. No app do Mercado Livre: Minhas compras › a compra › "
                        "Detalhes da transação. Tire o print e compartilhe com o atalho Enviar Nota (no Android: copie o texto do print e "
                        "cole no card, em Pedidos)."}


def _do_print(db: dict[str, Any], r: dict[str, Any], p: dict[str, Any]) -> dict[str, Any]:
    """Print "Detalhes da transação" (Mercado Livre): os valores, o cartão e o número da compra. Junta com os e-mails
    "Você comprou" do mesmo dia (um por vendedor) pelos nomes dos produtos; cada vendedor vira uma parte."""
    num = (r.get("numeros") or [None])[0]
    if not num or not r.get("itens") or r.get("total") is None:
        raise Falha("Não entendi esse print do Mercado Livre. Ele precisa mostrar a tela inteira de \"Detalhes da transação\" "
                    "(o número da compra, os produtos e o Total pago).")
    velho = _do_numero(db, {num} | {f"{num}-{k}" for k in range(1, 10)})
    if velho:
        return {"ok": True, "status": "repetido", "id": _primeira(velho), "pedido": velho["id"], "quem": velho.get("quem"),
                "mensagem": f"Esse print já tinha sido lido. {parecer(db, velho)}"}
    d = _dia(r.get("data"))
    emails = [x for x in db.get("pedidos") or [] if x["loja"] == r["loja"] and x.get("situacao") == "aguardando_print"
              and d and _dia(x.get("data")) and JANELA_PRINT[0] <= (d - _dia(x["data"])).days <= JANELA_PRINT[1]]
    itens = r["itens"]
    dono: dict[int, dict[str, Any]] = {}  # item do print → e-mail (vendedor)
    for e in emails:
        prod = ((e["partes"][0].get("itens") or [{}])[0]).get("descricao") or ""
        notas = sorted(((_parecidos(prod, it["descricao"]), i) for i, it in enumerate(itens) if i not in dono), reverse=True)
        if notas and notas[0][0] >= 2:
            dono[notas[0][1]] = e

    def tem(e: dict[str, Any]) -> int:
        return sum(1 for v in dono.values() if v is e)

    sobra = [i for i in range(len(itens)) if i not in dono]
    if not dono and len(emails) == 1 and (emails[0]["partes"][0].get("qtd_produtos") or 1) == len(itens):
        for i in sobra:  # um e-mail só, com o mesmo número de produtos: é ele (nome cortado demais para comparar)
            dono[i] = emails[0]
        sobra = []
    # os outros produtos de um vendedor ("e 1 mais produto"): sobrou exatamente o que falta a um só e-mail
    faltam = [e for e in emails if tem(e) and (e["partes"][0].get("qtd_produtos") or 1) > tem(e)]
    if sobra and len(faltam) == 1 and len(sobra) == (faltam[0]["partes"][0].get("qtd_produtos") or 1) - tem(faltam[0]):
        for i in sobra:
            dono[i] = faltam[0]
        sobra = []
    grupos: list[tuple[dict[str, Any] | None, list[int]]] = [(e, [i for i in range(len(itens)) if dono.get(i) is e]) for e in emails if tem(e)]
    if sobra:
        grupos.append((None, sobra))
    fecha, total = bool(r.get("fecha")), r["total"]
    soma = sum(it["preco"] or 0 for it in itens) if fecha else 0
    partes = []
    for k, (e, idx) in enumerate(grupos, 1):
        ep = e["partes"][0] if e else {}
        its = [{"descricao": itens[i]["descricao"], "qtd": itens[i]["qtd"], "preco": itens[i]["preco"] if fecha else 0.0} for i in idx]
        prod = round(sum(i["preco"] for i in its), 2)
        peso = prod / soma if fecha and soma else 1 / len(grupos)
        partes.append({"numero": num if len(grupos) == 1 else f"{num}-{k}", "vendedor": ep.get("vendedor"),
                       **({"cnpj": ep["cnpj"]} if ep.get("cnpj") else {}), "itens": its, "produtos": prod if fecha else None,
                       "frete": round((r.get("frete") or 0) * peso, 2),
                       "descontos": [{**x, "valor": round(x["valor"] * peso, 2)} for x in r.get("descontos") or []],
                       "pago": round(total * peso, 2), "bate": fecha})
    partes[-1]["pago"] = round(partes[-1]["pago"] + total - sum(x["pago"] for x in partes), 2)
    if not fecha:  # sem os preços de cada produto: o valor fica na compra, no primeiro item
        for x in partes:
            if x["itens"]:
                x["itens"][0]["preco"] = x["pago"]
            x["produtos"] = x["pago"]
    datas = [str(e["data"]) for e, _ in grupos if e]
    q = next((e.get("quem") for e, _ in grupos if e and e.get("quem")), None)
    chaves = [e["email_ml"] for e, _ in grupos if e and e.get("email_ml")]
    for e, _ in grupos:
        if e:
            db["pedidos"].remove(e)
    # o dia é o do print (a tela da transação); a hora, a do e-mail do mesmo dia. O e-mail sai às vezes depois da
    # meia-noite (compra às 23h, e-mail às 00:43 do dia seguinte): aí vale só o dia do print
    dia_print = str(r.get("data") or "")[:10]
    mesmo_dia = [x for x in datas if x[:10] == dia_print]
    quando = min(mesmo_dia) if mesmo_dia else (r.get("data") if dia_print else (min(datas) if datas else None))
    r2 = {"evento": "realizado", "loja": r["loja"], "numeros": [num], "data": quando,
          "pagamento": r.get("pagamento") or {}, "partes": partes, "total": total, "pago": "print do Mercado Livre"}
    out = _novo(db, r2, {**p, "via": "print", "quem": p.get("quem") or q})
    ped = _do_numero(db, {x["numero"] for x in partes})
    if ped and chaves:
        ped["emails_ml"] = chaves
    if out.get("status") == "pedido_novo":
        sem = sum(1 for x in partes if not x.get("vendedor"))
        out["mensagem"] += ((f" · {sem} {'parte' if sem == 1 else 'partes'} sem o e-mail do vendedor" if sem else "")
                            + ("" if fecha else " · ⚠ os preços de cada produto não fecharam com o total: ficou o total"))
    return out


PARADO_DIAS = 3


def parados(db: dict[str, Any]) -> list[dict[str, Any]]:
    """Para o sino: pedido no cartão que não está em ⚙ › Cartões (na hora) e pedido sem confirmação do pagamento (ou
    pagamento sem o e-mail do pedido) há mais de 3 dias."""
    hoje, out = date.today(), []
    for x in db.get("pedidos") or []:
        d = _dia(x.get("data") or x.get("registrado_em"))
        dif, val = x.get("data_diferente"), x.get("valor_diferente")
        if dif or val or x.get("situacao") == "conferir_cartao" or (x.get("situacao") in ("aguardando_pagamento", "pago_sem_detalhes") and d and (hoje - d).days > PARADO_DIAS):
            out.append({"id": x["id"], "loja": x["loja"], "data": x.get("data"), "total": x.get("total"),
                        "situacao": "data_diferente" if dif else "valor_diferente" if val else x["situacao"], "datas": dif, "valores": val,
                        "final": (x.get("pagamento") or {}).get("final"),
                        "lojas": [y.get("vendedor") for y in x["partes"]], "quem": x.get("quem")})
    return out


def pedido_decidir(p: dict[str, Any]) -> dict[str, Any]:
    """Sino › pedido para conferir: {id, decisao: "confirmar" (paguei, lança) | "descartar" (não foi comprado: some)
    | "data_fatura" / "data_email" (dia do pagamento diferente do dia na fatura: qual vale)}."""
    with file_lock():
        db = load_db()
        ped = next((x for x in db.get("pedidos") or [] if x["id"] == p.get("id")), None)
        if not ped:
            raise Falha("Esse pedido não está mais aqui.")
        if p.get("decisao") == "valor_ciente":  # valor da fatura diferente da soma das lojas: visto (não muda os valores)
            val = ped.pop("valor_diferente", None)
            if val:
                ped["valor_conferido"] = val["linha"]
            save_db(db)
            return {"ok": True, "status": "pedido_valor", "mensagem": f"Pedido {ped['loja']} ({fmt_brl(ped.get('total'))}): diferença com a fatura marcada como vista."}
        if p.get("decisao") in ("data_fatura", "data_email"):
            dif = ped.pop("data_diferente", None)
            if not dif:
                return {"ok": True, "status": "pedido_data", "mensagem": "Essa data já foi conferida."}
            dia = dif["fatura"] if p["decisao"] == "data_fatura" else dif["email"]
            _usar_dia(db, ped, dia)
            ped["data_conferida"] = dif["fatura"]
            save_db(db)
            return {"ok": True, "status": "pedido_data", "mensagem": f"Pedido {ped['loja']} ({fmt_brl(ped.get('total'))}): fica o dia {_ddmm(dia)}"
                                                                     f" ({'da fatura' if p['decisao'] == 'data_fatura' else 'do pagamento'})."}
        if p.get("decisao") == "descartar":
            if any(x.get("compra") for x in ped["partes"]):
                raise Falha("Esse pedido já tem compras lançadas; para tirar, exclua as compras.")
            db["pedidos"].remove(ped)
            save_db(db)
            return {"ok": True, "status": "pedido_descartado", "mensagem": f"Pedido {ped['loja']} de {_ddmm(ped.get('data'))} descartado."}
        if p.get("decisao") != "confirmar" or ped.get("situacao") not in ("aguardando_pagamento", "conferir_cartao"):
            raise Falha("Esse pedido não dá para lançar daqui (falta o e-mail com os preços)." if ped.get("situacao") == "pago_sem_detalhes" else "Pedido inválido.")
        r = _msg_confirmado(ped, confirmar(db, ped, "confirmado no sino"))
        save_db(db)
    return r


def _solta_da_fatura(db: dict[str, Any], ped: dict[str, Any]) -> dict[str, Any] | None:
    from .copia import guardar_excluida
    pg = ped.get("pagamento") or {}
    m = leitor_da_loja(ped["loja"])
    if pg.get("tipo") not in ("Crédito", None) or not m:  # sem a forma no e-mail (Amazon): a fatura diz
        return None
    lotes = {x["id"] for x in db.get("lotes_fatura") or [] if x.get("status") == "pendente"}
    cands = []
    for c in db["compras"]:
        fb = c.get("fatura_banco") or {}
        if c.get("via") != "fatura" or fb.get("lote") in lotes or not re.search(m.NA_FATURA, fb.get("descricao") or "", re.I):
            continue
        d, dp = _dia(c.get("emissao")), _dia(ped["data"])
        k = next(iter(c.get("pagamentos") or []), {})
        if (d and dp and JANELA_FATURA[0] <= (d - dp).days <= JANELA_FATURA[1] and abs((c.get("valor_pago") or 0) - _no_cartao(ped)) < 0.011
                and (not pg.get("tipo") or not pg.get("parcelas") or int(fb.get("parcelas") or 1) == int(pg["parcelas"]))
                and (not pg.get("cartao") or k.get("cartao") == pg["cartao"])):
            cands.append(c)
    if len(cands) != 1:
        return None
    c = cands[0]
    linhas = [(fid, i) for fid, i, _ in fb_linhas(c)]
    db["compras"].remove(c)
    c["excluida_em"], c["juntada_na"] = now_iso(), ped["id"]
    guardar_excluida(db, c)
    ligar_fatura(db, ped, linhas, (c.get("pagamentos") or [{}])[0].get("cartao") or pg.get("cartao"))
    return c


def fb_linhas(c: dict[str, Any]) -> list[tuple[str, int, int]]:
    return [(x[0], x[1], x[2]) for x in (c.get("fatura_banco") or {}).get("linhas") or []]


def _cancelar(db: dict[str, Any], r: dict[str, Any]) -> dict[str, Any]:
    nums = set(r.get("numeros") or [])
    feitas = []
    for ped in db.get("pedidos") or []:
        if ped["loja"] != r["loja"]:
            continue
        for parte in ped["partes"]:
            if parte["numero"] not in nums or parte.get("situacao") == "cancelada":
                continue
            so = _itens_cancelados(parte, r.get("itens") or [])
            if so:
                _cancelar_itens(db, ped, parte, so)
                feitas.append({**parte, "pago": round(sum(i.get("preco") or 0 for i in so), 2), "itens_cancelados": len(so)})
                continue
            parte["situacao"], parte["cancelada_em"] = "cancelada", now_iso()
            c = _compra(db, parte.get("compra"))
            if c:
                antes = {"cobrado": copy.deepcopy(c.get("cobrado")), "cancelado": None}
                c["cobrado"] = {"valor": 0.0, "motivo": "Outro", "via": "pedido"}
                c["cancelado"] = {"em": now_iso(), "pedido": ped["id"]}
                anotar_mudanca(db, c, f"Pedido {ped['loja']} de {_ddmm(ped['data'])} cancelado ({parte.get('vendedor') or parte['numero']}, "
                                      f"{fmt_brl(parte['pago'])}): não conta mais. O estorno vem na fatura.", antes)
            feitas.append(parte)
        if all(x.get("situacao") == "cancelada" for x in ped["partes"]):
            ped["situacao"] = "cancelado"
    feitas = [x for x in feitas if x.get("pago") is not None]
    if not feitas:
        return {"ok": True, "status": "nada", "silencioso": True, "mensagem": f"Cancelamento da {r['loja']}: não achei esse pedido aqui (talvez o e-mail do pedido não tenha chegado)."}
    v = sum(x["pago"] or 0 for x in feitas)
    if all(x.get("itens_cancelados") for x in feitas):  # só alguns itens do pedido
        n = sum(x["itens_cancelados"] for x in feitas)
        return {"ok": True, "status": "pedido_cancelado", "mensagem": f"{r['loja']}: {n} {'item cancelado' if n == 1 else 'itens cancelados'} ({fmt_brl(v)}); o resto do pedido continua. Confira no sino."}
    return {"ok": True, "status": "pedido_cancelado", "mensagem": f"{r['loja']}: {len(feitas)} {'pedido cancelado' if len(feitas) == 1 else 'pedidos cancelados'} ({fmt_brl(v)}). Confira no sino."}


def _itens_cancelados(parte: dict[str, Any], itens: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Os itens da parte que o e-mail de cancelamento cita, quando não são todos (senão: a parte inteira, lista vazia)."""
    vivos = [i for i in parte.get("itens") or [] if not i.get("cancelado")]
    if not itens or len(vivos) < 2:
        return []
    ditos = [_palavras(i.get("descricao") or "") for i in itens]
    achados = [i for i in vivos if any(len(_palavras(i.get("descricao") or "") & d) >= max(2, len(d) // 2) for d in ditos)]
    return achados if achados and len(achados) < len(vivos) else []


def _cancelar_itens(db: dict[str, Any], ped: dict[str, Any], parte: dict[str, Any], itens: list[dict[str, Any]]) -> None:
    """Cancelados só alguns itens: eles saem do valor pago (vai para o sino; o Desfazer volta o valor de antes)."""
    for i in itens:
        i["cancelado"] = now_iso()
    menos = round(sum(i.get("preco") or 0 for i in itens), 2)
    c = _compra(db, parte.get("compra"))
    if not c:
        return
    antes = {"cobrado": copy.deepcopy(c.get("cobrado"))}
    base = (c.get("cobrado") or {}).get("valor", c.get("valor_pago") or 0)
    c["cobrado"] = {"valor": round(max(base - menos, 0), 2), "motivo": "Outro", "via": "pedido"}
    nomes = ", ".join((i.get("descricao") or "")[:40] for i in itens)
    anotar_mudanca(db, c, f"Pedido {ped['loja']} de {_ddmm(ped['data'])}: cancelado só {nomes} ({fmt_brl(menos)}). "
                          f"A compra passa a contar {fmt_brl(c['cobrado']['valor'])}. O estorno vem na fatura.", antes)


def pedido_email(p: dict[str, Any]) -> dict[str, Any]:
    """Um e-mail de pedido: {texto | html | linhas (PDF lido na tela), remetente, assunto, quando (data do e-mail), via: "email" | "pdf",
    encaminhado_por (quem encaminhou: precisa estar em ⚙ › Pedidos por e-mail), quem (opcional)}.
    Pela tela (PDF ou texto colado) não precisa de autorização: quem está na tela já é da casa."""
    texto = (str(p.get("texto") or "") or (texto_das_linhas(str(p["linhas"])) if p.get("linhas") else "")
             or texto_do_html(str(p.get("html") or "")))
    if not texto.strip():
        raise Falha("E-mail vazio.")
    from . import igreja7me
    if igreja7me.reconhece(str(p.get("remetente") or ""), str(p.get("assunto") or ""), texto):  # dízimo pelo app 7me
        return igreja7me.registrar(texto, p.get("quando"))
    leitor = leitor_de(str(p.get("remetente") or ""), str(p.get("assunto") or ""), texto)
    if not leitor and p.get("via") == "email":  # pelo filtro passou outro e-mail da loja (propaganda, avaliação): sem aviso
        return {"ok": True, "status": "ignorado", "silencioso": True, "mensagem": f"E-mail ignorado (não é pedido): {str(p.get('assunto') or '')[:80]}"}
    if not leitor:
        from .leitores import LEITORES
        raise Falha("Não reconheci este e-mail como pedido de uma loja online que eu sei ler "
                    f"(por enquanto: {', '.join(m.LOJA for m in LEITORES)}).")
    r = leitor.ler(texto, p.get("quando") or None)
    with file_lock():
        db = load_db()
        out = _aplicar(db, r, p)
        revisados = revisar_pedidos(db)  # data do pagamento e nota que ficou de fora, nos pedidos já lançados
        if revisados and out.get("silencioso"):
            out = {**out, "silencioso": False, "mensagem": out["mensagem"] + " · Revisão: " + "; ".join(revisados)}
        if out["status"] not in ("repetido", "ignorado", "nada") or revisados:
            save_db(db)
    return out


def revisar_pedidos(db: dict[str, Any]) -> list[str]:
    """Pedidos já lançados: a data passa a ser a do pagamento quando ele veio antes do "Recebemos" (e as compras do pedido
    acompanham), e a nota já lançada que ficou de fora entra na parte (vai para o sino). Devolve o que mudou."""
    feito = []
    for ped in db.get("pedidos") or []:
        if ped.get("situacao") != "pago":
            continue
        if not ped.get("fatura"):  # a linha da fatura já estava ligada à nota (antes do pedido existir): passa a ser do pedido
            meus = {x.get("compra") for x in ped["partes"] if x.get("compra")}
            ls = [(fid, i) for fid, f in (db.get("faturas_banco") or {}).items() for i, l in enumerate(f["linhas"]) if l.get("compra") in meus and l["tipo"] == "compra"]
            if ls:
                ped["fatura"] = [[fid, i] for fid, i in ls]
                for fid, i in ls:
                    db["faturas_banco"][fid]["linhas"][i]["pedido"] = ped["id"]
        if ped.get("fatura") and conferir_data(db, ped):
            feito.append(f"pedido {ped['loja']} de {_ddmm(ped.get('pago_em') or ped['data'])}: dia na fatura diferente (veja no sino)")
        if ped.get("pago_em") and not ped.get("data_conferida") and str(ped["pago_em"])[:10] < str(ped.get("data") or "9")[:10]:
            ped["data"] = ped["pago_em"]
            for parte in ped["partes"]:
                c = _compra(db, parte.get("compra"))
                if c and c.get("via") == "pedido":
                    c["emissao"] = ped["data"]
                elif c and str(c.get("data_compra") or "") > str(ped["data"])[:10]:
                    c["data_compra"] = str(ped["data"])[:10]
            feito.append(f"pedido {ped['loja']} de {_ddmm(ped['data'])}: data do pagamento")
        for parte in ped["partes"]:  # itens que não fechavam com o subtotal (preço unitário no e-mail): a compra do e-mail acompanha
            c = _compra(db, parte.get("compra"))
            if parte.get("bate") is False and _coerente(parte) and c and c.get("via") == "pedido":
                novo = _compra_da_parte(db, ped, parte, c.get("quem") or "")
                c.update({k: novo[k] for k in ("itens", "qtd_itens", "conferencia")})
                feito.append(f"itens da loja {parte.get('vendedor') or parte['numero']} no pedido de {_ddmm(ped['data'])} acertados com o subtotal")
        for parte in ped["partes"]:
            if parte.get("nota") or parte.get("situacao") == "cancelada" or not _compra(db, parte.get("compra")):
                continue
            cands = [(n, c) for c in db["compras"] if not c.get("pedido") and not c.get("excluida_em") and (n := _combina(c, ped, parte))]
            nota = _unica(cands)
            if nota is not None and not any(_combina(nota, ped, o) > _combina(nota, ped, parte) for o in ped["partes"] if o is not parte):
                encaixar(db, nota, ped, parte)
                feito.append(f"nota {nome_loja(nota['loja'])} entrou no pedido de {_ddmm(ped['data'])}")
        if not ped.get("fatura"):  # a cobrança na fatura: igual entra no pedido; parecida com outro valor vai para o sino
            if _solta_da_fatura(db, ped):
                feito.append(f"a compra da fatura entrou no pedido de {_ddmm(ped['data'])}")
            else:
                f = _fatura_parecida(db, ped)
                if f and f["igual"]:
                    ligar_fatura(db, ped, [tuple(f["linha"])], f["cartao"])
                    feito.append(f"pedido de {_ddmm(ped['data'])} conferido com a fatura")
                elif f and ped.get("valor_conferido") != f["linha"] and (ped.get("valor_diferente") or {}).get("linha") != f["linha"]:
                    ped["valor_diferente"] = {k: f[k] for k in ("fatura", "pedido", "linha", "descricao", "dia")}
                    feito.append(f"pedido de {_ddmm(ped['data'])}: valor na fatura diferente (veja no sino)")
    return feito


def _fatura_parecida(db: dict[str, Any], ped: dict[str, Any]) -> dict[str, Any] | None:
    """A linha da fatura que é a cobrança desse pedido pelo jeito (loja online, mesmo cartão, data perto, mesmas parcelas),
    ainda sem pedido. {igual: o valor bate com a soma das lojas?, fatura, pedido, linha, cartao}. Só se for uma."""
    m, pg = leitor_da_loja(ped["loja"]), ped.get("pagamento") or {}
    dp = min((d for d in (_dia(ped.get("data")), _dia(ped.get("pago_em"))) if d), default=None)
    if not m or pg.get("tipo") != "Crédito" or not dp:
        return None
    soma = round(sum(x.get("pago") or 0 for x in ped["partes"] if x.get("situacao") != "cancelada"), 2)
    if (ped.get("pagamento") or {}).get("valor_cartao") is not None and abs(soma - (ped.get("total") or 0)) < 0.011:
        soma = _no_cartao(ped)  # pago em duas formas: na fatura só a parte do cartão
    gerais = {c["id"] for c in db["compras"] if c.get("via") == "fatura"}
    cands = []
    for fid, f in (db.get("faturas_banco") or {}).items():
        if pg.get("cartao") and f.get("cartao") != pg["cartao"]:
            continue
        for i, l in enumerate(f["linhas"]):
            if l["tipo"] != "compra" or l.get("pedido") or (l.get("compra") and l["compra"] not in gerais) or not re.search(m.NA_FATURA, l["descricao"], re.I):
                continue
            if l.get("parcela") and not str(l["parcela"]).startswith("01/"):
                continue
            n = int(str(l["parcela"]).split("/")[1]) if l.get("parcela") else 1
            d = _dia(l.get("data"))
            if n != int(pg.get("parcelas") or 1) or not d or not JANELA_FATURA[0] <= (d - dp).days <= JANELA_FATURA[1]:
                continue
            total = round(l["valor"] * n, 2) if n > 1 else l["valor"]
            if abs(total - soma) > max(30.0, soma) or (abs(total - soma) < 0.011 and l.get("compra")):  # longe demais: outra compra;
                continue  # igual e já virou compra solta da fatura: quem junta é _solta_da_fatura
            cands.append({"igual": abs(total - soma) < 0.011 and not l.get("compra"), "fatura": total, "pedido": soma, "linha": [fid, i],
                          "descricao": l["descricao"], "dia": str(l["data"])[:10], "cartao": f.get("cartao")})
    return cands[0] if len(cands) == 1 else None


def _aplicar(db: dict[str, Any], r: dict[str, Any], p: dict[str, Any]) -> dict[str, Any]:
    if r["evento"] == "sem_valores":  # Mercado Livre: e-mail sem valores (pede o print) e o print com os valores
        return _sem_valores(db, r, p)
    if r["evento"] == "print":
        return _do_print(db, r, p)
    return _cancelar(db, r) if r["evento"] == "cancelado" else _pago(db, r, p) if r["evento"] == "pago" else _novo(db, r, p)


# ---------------------------------------------------------------- trazer pedidos antigos (arquivo do Google Takeout)

def _importar_em(db: dict[str, Any], es: list[dict[str, Any]]) -> dict[str, Any]:
    """Aplica os e-mails, em ordem, sobre db (a cópia na prévia; os dados de verdade ao gravar). Devolve o resumo."""
    antes_ped = {x["id"] for x in db.get("pedidos") or []}
    antes_mu = len(db.get("mudancas") or [])
    antes_ex = {x["id"] for x in db.get("excluidas") or []}
    marco = str(db.get("marco") or "")
    cont = {"emails": len(es), "ignorados": 0, "antes_do_marco": 0, "erros": 0}
    for e in es:
        texto = texto_do_html(e["html"]) if e["html"] else (e["texto"] or "")
        leitor = leitor_de(e["remetente"], e["assunto"], texto)
        if not leitor:
            cont["ignorados"] += 1
            continue
        try:
            r = leitor.ler(texto, e["quando"])
        except Exception:
            cont["erros"] += 1
            continue
        if marco and str(r.get("data") or "")[:10] < marco:
            cont["antes_do_marco"] += 1
            continue
        try:
            _aplicar(db, r, {"via": "email", "assunto": e["assunto"]})
        except Falha:
            cont["erros"] += 1
    novos = [x for x in db.get("pedidos") or [] if x["id"] not in antes_ped]
    sit: dict[str, int] = {}
    for x in novos:
        sit[x["situacao"]] = sit.get(x["situacao"], 0) + 1
    return {**cont, "pedidos": len(novos), "situacoes": sit,
            "compras": sum(1 for x in novos for y in x["partes"] if y.get("compra")),
            "notas": sum(1 for m in (db.get("mudancas") or [])[antes_mu:] if m.get("parte")),
            "da_fatura": sum(1 for x in db.get("excluidas") or [] if x["id"] not in antes_ex and str(x.get("juntada_na") or "").startswith("pd-")),
            "total": round(sum(y["pago"] or 0 for x in novos if x["situacao"] == "pago" for y in x["partes"] if y.get("situacao") != "cancelada"), 2),
            "lista": [{"data": x.get("data"), "loja": x["loja"], "total": x.get("total"), "lojas": len(x["partes"]), "situacao": x["situacao"],
                       "notas": sum(1 for y in x["partes"] if y.get("nota")), "fatura": bool(x.get("fatura"))}
                      for x in sorted(novos, key=lambda x: x.get("data") or "")]}


def _arquivo_importar(nome: str) -> pathlib.Path:
    from .config import DATA_DIR
    n = re.sub(r"[^\w-]", "", nome or "")[:60]
    if not n:
        raise Falha("Arquivo da importação não encontrado. Envie de novo.")
    return DATA_DIR / "recebendo" / f"importar-{n}.bin"


def receber_importar(p: dict[str, Any]) -> dict[str, Any]:
    """O arquivo chegou (pelos pedaços, em base64): guarda e já devolve a prévia."""
    import base64
    try:
        dados = base64.b64decode(re.sub(r"\s", "", str(p.get("conteudo") or "")))
    except Exception as e:
        raise Falha("Não consegui abrir o arquivo enviado.") from e
    alvo = _arquivo_importar(str(p.get("arquivo") or ""))  # o nome vem em cada pedaço ("envio" o pedaço consome)
    alvo.parent.mkdir(parents=True, exist_ok=True)
    alvo.write_bytes(dados)
    return pedidos_importar({"etapa": "previa", "arquivo": str(p.get("arquivo") or "")})


def pedidos_importar(p: dict[str, Any]) -> dict[str, Any]:
    """⚙ › Trazer pedidos antigos: {etapa: "previa" | "gravar" | "cancelar", arquivo}. A prévia roda numa cópia e não grava."""
    import copy as _copy
    import shutil
    from datetime import datetime as _dt
    from .config import DATA_DIR, DB_PATH
    alvo = _arquivo_importar(str(p.get("arquivo") or ""))
    if p.get("etapa") == "cancelar":
        alvo.unlink(missing_ok=True)
        return {"ok": True, "status": "importar_cancelado", "mensagem": "Importação cancelada; o arquivo foi apagado."}
    if not alvo.exists():
        raise Falha("O arquivo da importação não está mais aqui. Envie de novo.")
    es = emails_do_arquivo(alvo.read_bytes())
    if not es:
        alvo.unlink(missing_ok=True)
        raise Falha("Não achei e-mails nesse arquivo. Envie o .zip do Google Takeout (ou o .mbox de dentro dele).")
    with file_lock():
        db = load_db()
        if p.get("etapa") == "previa":
            return {"ok": True, "status": "importar_previa", "arquivo": p.get("arquivo"), "resumo": _importar_em(_copy.deepcopy(db), es)}
        if p.get("etapa") != "gravar":
            raise Falha("Pedido inválido.")
        copia = DATA_DIR / "backups" / f"antes-importar-pedidos-{_dt.now():%Y%m%d-%H%M%S}.json"
        copia.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(DB_PATH, copia)
        resumo = _importar_em(db, es)
        iid = f"imp{_dt.now():%Y%m%d%H%M%S}"
        db.setdefault("importacoes", []).append({"id": iid, "em": now_iso(), "pedidos": resumo["pedidos"], "copia": copia.name})
        save_db(db)
        db2 = load_db()
        db2["importacoes"][-1]["depois"] = db2.get("atualizado_em")
        import json as _json  # grava a marca sem mudar atualizado_em (o Desfazer confere que nada mudou depois)
        tmp = DB_PATH.with_name(".compras.importar.tmp")
        tmp.write_bytes(_json.dumps(db2, ensure_ascii=False, indent=1).encode("utf-8"))
        tmp.replace(DB_PATH)
    alvo.unlink(missing_ok=True)
    n = resumo["pedidos"]
    return {"ok": True, "status": "importar_feito", "id": iid, "resumo": resumo,
            "mensagem": f"{n} {'pedido trazido' if n == 1 else 'pedidos trazidos'}"
                        + (f" · {resumo['da_fatura']} no lugar de compras da fatura" if resumo["da_fatura"] else "")
                        + (f" · {resumo['notas']} notas para conferir no sino" if resumo["notas"] else "") + "."}


def pedidos_importar_desfazer(p: dict[str, Any]) -> dict[str, Any]:
    """Volta os dados para antes da importação, se nada mudou depois dela."""
    import shutil
    from .config import DATA_DIR, DB_PATH
    with file_lock():
        db = load_db()
        imp = next((x for x in db.get("importacoes") or [] if x["id"] == p.get("id")), None)
        if not imp:
            raise Falha("Essa importação não está mais aqui.")
        if db.get("atualizado_em") != imp.get("depois"):
            raise Falha("Depois da importação os dados mudaram (outra compra, um Confirmar no sino…). Não dá para desfazer tudo de uma vez; "
                        "use o Desfazer de cada mudança no sino.")
        copia = DATA_DIR / "backups" / str(imp.get("copia") or "")
        if not imp.get("copia") or not copia.exists():
            raise Falha("A cópia de antes da importação não está mais aqui.")
        shutil.copy2(copia, DB_PATH)
    return {"ok": True, "status": "importar_desfeito", "mensagem": "Importação desfeita: os dados voltaram como estavam antes."}


def pedidos_config(p: dict[str, Any]) -> dict[str, Any]:
    """⚙ › Pedidos de lojas online.
    {caixa: "e-mail"}: a caixa (integração IMAP do HA) que o CoFinance lê; "" desliga. Só ela é lida: outras caixas IMAP do HA ficam de fora.
    {autorizados: [{email}]} — opcional: só aceitar o que vier encaminhado por estes e-mails. Vazio (o normal): a trava é o
    cartão do pedido estar em ⚙ › Cartões. Quem comprou vem do cartão, não daqui."""
    if "caixa" in p:
        cx = str(p.get("caixa") or "").strip().lower()
        if cx and cx not in [c.lower() for c in caixas_imap()]:
            raise Falha("Essa caixa não está na integração IMAP deste Home Assistant.")
        with file_lock():
            db = load_db()
            db["pedidos_email"] = {**(db.get("pedidos_email") or {}), "caixa": cx}
            save_db(db)
        return {"ok": True, "status": "pedidos_config", "caixa": cx,
                "mensagem": f"Pedidos online: lendo a caixa {cx}." if cx else "Pedidos online: automático desligado."}
    aut = {}
    for x in p.get("autorizados") or []:
        e = str((x.get("email") if isinstance(x, dict) else x) or "").strip().lower()
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", e):
            raise Falha(f"E-mail inválido: {e[:60]}")
        aut[e] = None
    with file_lock():
        db = load_db()
        db["pedidos_email"] = {**(db.get("pedidos_email") or {}), "autorizados": aut}
        save_db(db)
    return {"ok": True, "status": "pedidos_config", "mensagem": (f"Pedidos por e-mail: só o que vier de {len(aut)} {'endereço' if len(aut) == 1 else 'endereços'}."
                                                                 if aut else "Pedidos por e-mail: sem lista; vale o cartão cadastrado.")}


# ---------------------------------------------------------------- para a tela

def resumo(db: dict[str, Any], pid: str) -> dict[str, Any] | None:
    """O pedido de uma compra, para a janela da compra: as partes (vendedor, pago, nota) e onde está a cobrança."""
    from .cartoes import fatura_de
    from .pagamentos import rotulo_cartao
    ped = next((x for x in db.get("pedidos") or [] if x["id"] == pid), None)
    if not ped:
        return None
    pg = ped.get("pagamento") or {}
    k = next((x for x in db.get("cartoes") or [] if x["id"] == pg.get("cartao")), None)
    cobranca = None
    if ped.get("fatura"):
        fid = ped["fatura"][0][0]
        cobranca = {"situacao": "na_fatura", "vence": (db.get("faturas_banco") or {}).get(fid, {}).get("vence")}
    elif pg.get("tipo") == "Crédito" and k and k.get("fecha") and k.get("vence") and _dia(ped.get("data")):
        fecha, vence = fatura_de(k, _dia(ped["data"]))
        cobranca = {"situacao": "aguardando", "fecha": fecha.isoformat(), "vence": vence.isoformat()}
    elif pg.get("tipo") in ("Pix", "Boleto", "Saldo em carteira"):
        cobranca = {"situacao": "na_hora"}
    vivas = [x for x in ped["partes"] if x.get("situacao") != "cancelada"]
    return {"id": ped["id"], "loja": ped["loja"], "data": ped["data"], "total": round(sum(x["pago"] for x in vivas), 2), "total_email": ped["total"],
            "situacao": ped.get("situacao"), "cartao": rotulo_cartao(k, db.get("cartoes") or []) if k else None,
            "pagamento": {x: pg.get(x) for x in ("tipo", "final", "parcelas", "carteira")}, "cobranca": cobranca,
            "partes": [{"numero": x["numero"], "vendedor": x.get("vendedor"), "pago": x["pago"], "compra": x.get("compra"),
                        "nota": bool(x.get("nota")), "situacao": x.get("situacao"), "itens": len(x.get("itens") or []),
                        "cupom": round(sum(d["valor"] for d in x.get("descontos") or [] if d["motivo"] != "Desconto do frete"), 2),
                        "produtos": x.get("produtos"), "frete": x.get("frete") or 0, "descontos": x.get("descontos") or []}
                       for x in ped["partes"]]}


def caixas_imap() -> list[str]:
    """As caixas que a integração IMAP do HA lê (só o endereço, para a tela mostrar "conectada")."""
    import json
    from .config import ENERGIA_DIR  # a pasta .storage do HA
    try:
        d = json.loads((ENERGIA_DIR / "core.config_entries").read_text(encoding="utf-8"))
        return [str((e.get("data") or {}).get("username") or "") for e in d["data"]["entries"]
                if e.get("domain") == "imap" and not e.get("disabled_by")]
    except Exception:
        return []


def caixa_escolhida(db: dict[str, Any]) -> str:
    """A caixa que o CoFinance lê (⚙ › Pedidos online), só se ainda estiver na integração IMAP."""
    cx = str((db.get("pedidos_email") or {}).get("caixa") or "").lower()
    return cx if cx and cx in [c.lower() for c in caixas_imap()] else ""


def pedidos_caixa(_: dict[str, Any]) -> dict[str, Any]:
    """Para a integração: qual caixa IMAP ler (as outras caixas do HA são ignoradas)."""
    with file_lock():
        db = load_db()
    return {"ok": True, "status": "pedidos_caixa", "caixa": caixa_escolhida(db)}


def cfg_tela(db: dict[str, Any]) -> dict[str, Any]:
    """⚙ › Pedidos por e-mail: quem pode encaminhar e quantos pedidos já entraram, por loja."""
    from .leitores import LEITORES
    por: dict[str, int] = {}
    for x in db.get("pedidos") or []:
        por[x["loja"]] = por.get(x["loja"], 0) + 1
    imp = (db.get("importacoes") or [None])[-1]
    return {"caixa": caixa_escolhida(db), "caixas_ha": caixas_imap(), "pedidos": por,
            "importacao": {"id": imp["id"], "em": imp["em"], "pedidos": imp.get("pedidos"), "pode_desfazer": db.get("atualizado_em") == imp.get("depois")} if imp else None,
            "lojas": [m.LOJA for m in LEITORES], "remetentes": [r for m in LEITORES for r in m.REMETENTES]}


def texto_das_linhas(conteudo_b64: str) -> str:
    """PDF lido na tela (pdf.js: [[página, x, y, texto], ...] em base64) → texto, uma linha por linha do PDF."""
    import base64
    import json
    try:
        linhas = json.loads(base64.b64decode(re.sub(r"\s", "", conteudo_b64)).decode("utf-8"))
        assert isinstance(linhas, list)
    except Exception as e:
        raise Falha("Não consegui abrir o PDF do e-mail.") from e
    return "\n".join(str(l[3]).replace("\t", " ") for l in linhas if isinstance(l, list) and len(l) >= 4)
