"""Apple Pay: compra a decidir, lançar sem cupom e junção com a nota que chega depois."""
from __future__ import annotations

import json
import re
from datetime import date
from datetime import datetime
from typing import Any

from .config import BANCOS_EMISSORES
from .base import adotar_nome_applepay
from .base import Falha, _valor_txt, fmt_brl, norm_txt, now_iso
from .dados import compradores, file_lock, load_db, load_db_ro, save_db
from .pagamentos import data_efetiva, rotulo_cartao, valor_efetivo
from .cartoes import _cartao
from .categorias import classe_para
from .lancamento import manual
from .pagamentos import cartao_da_carteira, forma_do_cartao


def _ap_parte(db: dict[str, Any], c: dict[str, Any], valor: float) -> int | None:
    """Nota paga em 2+ formas: a parte do pagamento com o valor do Apple Pay, que nenhum outro Apple Pay já pegou."""
    pgs = c.get("pagamentos") or []
    if len(pgs) < 2:
        return None
    usadas = {x.get("parte") for x in db.get("applepay") or [] if x.get("compra") == c["id"]}
    for i, pg in enumerate(pgs):
        if i not in usadas and abs(float(pg.get("valor") or 0) - valor) < 0.01:
            return i
    return None


def _ap_casar_notas(db: dict[str, Any]) -> bool:
    """Apple Pay pendente + nota registrada depois (até 3 dias da compra) com o mesmo valor = veio com cupom.
    O mesmo valor é o total da nota ou, se ela foi paga em 2+ formas, uma das partes do pagamento."""
    mudou = False
    for x in db.get("applepay") or []:
        if x.get("status") != "pendente":
            continue
        dia = date.fromisoformat(x["em"][:10])
        for c in db["compras"]:
            if c.get("via") == "applepay" or c.get("excluida_em") or (c.get("registrado_em") or "") < x["em"][:19]:
                continue
            try:
                dc = date.fromisoformat((data_efetiva(c) or "")[:10])
            except ValueError:
                continue
            if abs((dc - dia).days) > 3:
                continue
            total_bate = abs((valor_efetivo(c) or 0) - x["valor"]) < 0.01
            parte = None if total_bate else _ap_parte(db, c, x["valor"])
            if total_bate or parte is not None:
                x["status"], x["decidido_em"], x["compra"], x["via_nota"] = "cupom", now_iso(), c["id"], True
                if parte is not None:
                    x["parte"] = parte  # qual pagamento da nota foi este Apple Pay
                if x.get("cartao"):
                    cartao_da_carteira(db, c, x["cartao"], parte)  # crédito/débito explícito na nota: com o cartão da Carteira
                adotar_nome_applepay(db, c.get("loja") or {}, x.get("loja") or "")  # o nome do Apple Pay, se a loja não tem um
                mudou = True
                break
    return mudou


# Apple Pay: o nome do cartão na Carteira → cartão cadastrado (⚙ › Cartões), pelo que cada casa cadastrou: o nome para
# mostrar, o banco do cartão e, por último, o nome curto interno. Os cartões de quem comprou vêm primeiro.
OUTROS_NOMES_BANCO = {"bb": ["OUROCARD"], "itau": ["PERSONNALITE"], "santander": ["SX"], "caixa": ["CEF"]}  # como a Carteira às vezes chama o banco


def _cartao_carteira(db: dict[str, Any], nome: str, quem: str | None = None) -> str | None:
    n = norm_txt(nome)
    tem = lambda txt: bool(txt) and re.search(rf"\b{re.escape(norm_txt(txt))}\b", n)
    cartoes = sorted((k for k in db.get("cartoes") or [] if k.get("ativo", True)), key=lambda k: quem not in (k.get("usam") or []))
    for k in cartoes:  # o nome que vocês deram ("Bradesco Prime", "Santander Unique")
        if tem(k.get("apelido")):
            return k["id"]
    for k in cartoes:  # o banco do cartão
        bid = k.get("emissor") or k.get("banco") or ""
        if any(tem(x) for x in [BANCOS_EMISSORES.get(bid, ""), *OUTROS_NOMES_BANCO.get(bid, [])]):
            return k["id"]
    for k in cartoes:  # o nome curto interno
        if len(norm_txt(k.get("nome") or "")) >= 3 and tem(k.get("nome")):
            return k["id"]
    return None


FILA_MAX = 50              # compras guardadas no iPhone que sobem de uma vez
QUANDO_MAX_DIAS = 60       # hora da compra mais antiga que isso: usa a hora em que chegou
MESMA_COMPRA_S = 120       # mesma compra reenviada (mesma hora do iPhone, com folga)


def _quando(txt: Any) -> datetime | None:
    """A hora da compra que o iPhone mandou (ISO 8601, com ou sem fuso). Inválida, no futuro ou velha demais: None."""
    s = str(txt or "").strip()
    if not s:
        return None
    try:
        d = datetime.fromisoformat(s.replace("Z", "+00:00"))
    except ValueError:
        return None
    d = d.astimezone()  # com fuso: converte para a hora local; sem fuso: já é a local
    agora = datetime.now().astimezone()
    if (d - agora).total_seconds() > 600 or (agora - d).days > QUANDO_MAX_DIAS:
        return None
    return d.replace(microsecond=0)


def _fila(p: dict[str, Any]) -> list[dict[str, Any]]:
    """As compras do pedido: a fila do iPhone (uma por linha, em JSON) ou, no formato antigo, a própria compra."""
    txt = p.get("fila")
    if isinstance(txt, list):
        itens = [x for x in txt if isinstance(x, dict)]
    elif str(txt or "").strip():
        itens, s, i, dec = [], str(txt), 0, json.JSONDecoder()
        while i < len(s):  # aceita um JSON por linha, colados ou uma lista
            while i < len(s) and s[i] not in "{[":
                i += 1
            if i >= len(s):
                break
            try:
                obj, i = dec.raw_decode(s, i)
            except ValueError:
                i += 1
                continue
            itens += [x for x in (obj if isinstance(obj, list) else [obj]) if isinstance(x, dict)]
    else:
        itens = [p]
    return [{**x, "quem": x.get("quem") or p.get("quem")} for x in itens][-FILA_MAX:]


def _ap_um(db: dict[str, Any], p: dict[str, Any]) -> tuple[dict[str, Any], bool]:
    """Uma compra do Apple Pay em db["applepay"]. Devolve (registro, se é nova)."""
    valor = round(_valor_txt(p.get("valor")) or 0.0, 2)
    if valor <= 0:
        raise Falha("Apple Pay: valor não veio.")
    loja = re.sub(r"\s+", " ", str(p.get("loja") or "")).strip()[:60] or "Compra com Apple Pay"
    q = norm_txt(str(p.get("quem") or ""))  # "ana", "ANA PAULA"… → o nome do cadastro (sem achar: a 1ª pessoa)
    quem = next((x for x in compradores() if q[:3] and norm_txt(x)[:3] == q[:3]), (compradores() or [None])[0])
    nome_cartao = re.sub(r"\s+", " ", str(p.get("cartao") or "")).strip()[:60]
    lst = db.setdefault("applepay", [])
    agora = datetime.now()
    quando = _quando(p.get("quando"))
    igual = lambda x: x["quem"] == quem and abs(x["valor"] - valor) < 0.005 and x["loja"] == loja
    for x in lst:
        if not igual(x):
            continue
        if quando and x.get("quando"):
            # Reenvio da fila (a resposta pode ter se perdido): a mesma hora da compra = a mesma, já decidida ou não.
            if abs((datetime.fromisoformat(x["quando"]) - quando).total_seconds()) < MESMA_COMPRA_S:
                return x, False
        elif abs((agora - datetime.fromisoformat(x.get("recebido_em") or x["em"]).replace(tzinfo=None)).total_seconds()) < 600:
            return x, False  # o Atalhos às vezes dispara duas vezes: mesma compra em 10 min = a mesma (já lançada ou não)
    x = {"id": f"ap{agora:%Y%m%d%H%M%S%f}", "em": quando.isoformat() if quando else now_iso(), "valor": valor, "loja": loja,
         "cartao_nome": nome_cartao, "cartao": _cartao_carteira(db, nome_cartao, quem), "quem": quem, "status": "pendente"}
    if quando:
        x["quando"] = quando.isoformat()   # hora da compra no iPhone (é a que vale em "em")
        x["recebido_em"] = now_iso()
        if (datetime.now().astimezone() - quando).total_seconds() > 600:
            x["atrasada"] = True           # não tinha subido na hora (sem rede): veio na fila
    lst.append(x)
    return x, True


def applepay(p: dict[str, Any]) -> dict[str, Any]:
    """Compra pelo Apple Pay (automação "Transação"): guarda "a decidir" e devolve o texto da notificação com os botões.

    O iPhone guarda cada compra numa fila e manda a fila inteira; só apaga quando o envio dá certo. Assim uma compra
    feita sem rede sobe junto com a próxima. A última da fila é a compra de agora (a da notificação)."""
    itens = _fila(p)
    if not itens:
        raise Falha("Apple Pay: a fila veio vazia.")
    with file_lock():
        db = load_db()
        feitos = []
        for i, item in enumerate(itens):
            try:
                feitos.append(_ap_um(db, item))
            except Falha:
                if i == len(itens) - 1 and not feitos:
                    raise
        if not feitos:
            raise Falha("Apple Pay: nenhuma compra válida na fila.")
        db["applepay"] = db["applepay"][-200:]
        if any(nova for _, nova in feitos):
            _ap_casar_notas(db)  # a nota já chegou antes (compra que veio atrasada na fila): fica com a nota, não duplica
            save_db(db)
    for y, nova in feitos:  # compra nova sobe na hora; a nota que vier depois se junta a ela
        if nova and y["status"] == "pendente":
            _lancar_ap(y["id"])
    db = load_db_ro()
    por_id = {y["id"]: y for y in db.get("applepay") or []}
    x = por_id.get(feitos[-1][0]["id"], feitos[-1][0])
    r = _ap_resposta(db, x)
    antes = [y for y, nova in feitos[:-1] if nova]
    if antes:
        soma = sum(y["valor"] for y in antes)
        r["mensagem"] += (f" · subiu também {'1 compra' if len(antes) == 1 else f'{len(antes)} compras'} que não tinha"
                          f"{'' if len(antes) == 1 else 'm'} chegado ({fmt_brl(soma)}), já lançada{'' if len(antes) == 1 else 's'}")
        r["atrasadas"] = [y["id"] for y in antes]
    return r


def _ap_resposta(db: dict[str, Any], x: dict[str, Any]) -> dict[str, Any]:
    """Texto do aviso do Apple Pay. Os botões (crédito/débito ou cartões) o avisar põe, pela compra lançada."""
    k = _cartao(db, x.get("cartao"))
    nome = rotulo_cartao(k, db.get("cartoes") or []) if k else (x.get("cartao_nome") or "")
    c = next((y for y in db["compras"] if y["id"] == x.get("compra")), None) if x.get("compra") else None
    if x["status"] == "cupom":
        fim = "veio junto com a nota que já estava lançada"
    elif not c:
        fim = "a decidir no sino"
    else:
        pgs = c.get("pagamentos") or []
        if pgs and pgs[0].get("forma_suposta"):
            fim = "lançada no crédito (a nota ou a fatura confirmam). Foi débito? Segure o aviso e troque"
        elif pgs and pgs[0].get("tipo"):
            fim = f"lançada no {pgs[0]['tipo'].lower()}" if pgs[0]["tipo"] in ("Crédito", "Débito") else f"lançada ({pgs[0]['tipo']})"
        elif k:
            fim = "lançada. Foi crédito ou débito?"
        else:
            fim = "lançada. Como pagou?"
    return {"ok": True, "status": "applepay", "id": x["id"], "quem": x["quem"], "compra": x.get("compra") or "",
            "titulo": f"💳 {fmt_brl(x['valor'])} · {x['loja']}",
            "mensagem": f"{nome + ' · ' if nome else ''}{x['quem']} · {fim}"}


def applepay_decidir(p: dict[str, Any]) -> dict[str, Any]:
    """[Lançar sem cupom] grava a compra (crédito no cartão da Carteira, na data e hora do pagamento);
    [Tenho cupom] descarta (a nota vem pelo processo normal)."""
    aid, dec = str(p.get("id") or ""), p.get("decisao")
    if not re.fullmatch(r"ap\d{14,20}", aid) or dec not in ("lancar", "cupom"):
        raise Falha("Pedido inválido.")
    with file_lock():
        db = load_db()
        x = next((y for y in db.get("applepay") or [] if y["id"] == aid), None)
    if not x:
        raise Falha("Não achei essa compra do Apple Pay.")
    if x["status"] != "pendente":
        return {"ok": True, "status": "applepay_ok", "quem": x["quem"],
                "mensagem": f"{x['loja']} · {fmt_brl(x['valor'])}: já {'lançada' if x['status'] == 'lancada' else 'marcada como com cupom'}."}
    if dec == "lancar":
        return _lancar_ap(aid, p.get("item") or "")
    msg = f"{x['loja']} · {fmt_brl(x['valor'])}: ok, a nota vem pelo processo normal."
    with file_lock():
        db = load_db()
        y = next((z for z in db.get("applepay") or [] if z["id"] == aid), None)
        if y:
            y["status"], y["decidido_em"] = "cupom", now_iso()
        save_db(db)
    return {"ok": True, "status": "applepay_ok", "quem": x["quem"], "mensagem": msg, "id": ""}


def _regra_da_fatura(db: dict[str, Any], nome: str) -> tuple[str, str | None, str] | None:
    """A regra que vocês escolheram para a loja na fatura ("SELFBR" → Mercado, "Mercadinho Verano"), pelo nome do
    comerciante no Apple Pay: (categoria, subcategoria, nome para mostrar). O nome igual, ou o começo dele (a fatura e a
    Carteira cortam o nome em tamanhos diferentes) quando só uma regra serve. None se não há regra."""
    from .categorias import checar_classe
    from .faturas import chave_loja
    regras = db.get("categoria_fatura") or {}
    ch = chave_loja(nome or "")
    if len(ch) < 4:
        return None
    r = regras.get(ch)
    if not r and len(ch) >= 8:
        cands = [v for k, v in regras.items() if len(k) >= 8 and (k.startswith(ch) or ch.startswith(k))]
        r = cands[0] if len(cands) == 1 else None
    if not isinstance(r, list) or not r:
        return None
    try:
        cat, sub = checar_classe(db, r[0], r[1] if len(r) > 1 else None)
    except Falha:
        return None
    return cat, sub, (r[2] if len(r) > 2 and r[2] else nome)


def _lancar_ap(aid: str, item: str = "") -> dict[str, Any]:
    """Lança a compra do Apple Pay. Forma pelo cadastro do cartão da Carteira: só crédito, só débito ou vale entram
    certos; cartão de crédito e débito entra no crédito "suposto" (forma_suposta): a nota que disser débito troca, e a
    fatura lida depois confirma (veio nela) ou passa para débito (não veio, vai para o sino). O aviso deixa trocar."""
    with file_lock():
        db = load_db()
        x = next((y for y in db.get("applepay") or [] if y["id"] == aid), None)
    if not x or x["status"] != "pendente":
        return {"ok": True, "status": "applepay_ok", "quem": (x or {}).get("quem"), "mensagem": "Essa compra já estava decidida.",
                "id": (x or {}).get("compra") or ""}
    cat, sub, via = classe_para(load_db_ro(), {"nome": x["loja"]}, [])  # pelo nome do comerciante; sem pista, Outros
    nome_loja = x["loja"]
    regra = _regra_da_fatura(load_db_ro(), x["loja"])
    if regra:  # a loja que vocês já classificaram na fatura: mesma categoria e mesmo nome
        cat, sub, nome_loja = regra
    k_ap = _cartao(load_db_ro(), x["cartao"]) if x.get("cartao") else None
    suposta = bool(k_ap) and not forma_do_cartao(k_ap) and k_ap.get("credito", True) and not k_ap.get("vale")
    r = manual({"quem": x["quem"], "loja": nome_loja, "valor": x["valor"], "data": x["em"][:10],
                "forma": "Crédito" if suposta else forma_do_cartao(k_ap) if k_ap  # crédito e débito: crédito suposto
                else "Alelo" if "ALELO" in norm_txt(x.get("cartao_nome") or "") else "",
                "cartao": x.get("cartao") or "", "parcelas": 1,
                "categoria": cat, "subcategoria": sub, "item": item, "observacao": f"Apple Pay{(' · ' + x['cartao_nome']) if x.get('cartao_nome') else ''}"})
    x["compra"] = r["id"]
    if x.get("cartao") and not forma_do_cartao(_cartao(load_db_ro(), x["cartao"])):  # o cartão da Carteira fica de sugestão
        with file_lock():
            db2 = load_db()
            c2 = next((c for c in db2["compras"] if c["id"] == r["id"]), None)
            if c2:
                c2["cartao_sugerido"] = x["cartao"]
                for pg in c2.get("pagamentos") or []:
                    if suposta and pg.get("cartao") == x["cartao"]:
                        pg["cartao_via"], pg["forma_suposta"] = "applepay", True  # a nota ou a fatura confirmam
                save_db(db2)
    msg = f"Lançada: {r['mensagem']}"
    with file_lock():
        db = load_db()
        y = next((z for z in db.get("applepay") or [] if z["id"] == aid), None)
        if y:
            y["status"], y["decidido_em"] = "lancada", now_iso()
            if x.get("compra"):
                y["compra"] = x["compra"]
                c = next((z for z in db["compras"] if z["id"] == x["compra"]), None)
                if c:  # data e hora de verdade do pagamento
                    c["emissao"], c["via"] = x["em"], "applepay"
        save_db(db)
    return {"ok": True, "status": "applepay_ok", "quem": x["quem"], "mensagem": msg, "id": x.get("compra") or ""}
