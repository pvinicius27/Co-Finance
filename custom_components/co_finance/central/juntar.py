"""Nota que chega depois de uma compra lançada à mão (ou Apple Pay sem cupom): junta as duas numa só.
Regras combinadas em 20/10/2026, todas obrigatórias: valor exatamente igual (nem um centavo),
data da nota até 7 dias da data da compra, nome da loja parecido de verdade e uma única candidata.
Da nota fica a loja, os itens e a cópia; da compra à mão, quem comprou, cartão/parcelas, a data da compra,
a categoria escolhida na tela e a observação. A compra à mão vai para as excluídas, marcada com a nota."""
from __future__ import annotations

import copy
import re
from datetime import date
from difflib import SequenceMatcher
from typing import Any

from .base import adotar_nome_applepay, apelido_da_loja, norm_txt, now_iso
from .copia import guardar_excluida
from .pagamentos import _tipo_pag, cartao_da_carteira, data_efetiva, valor_efetivo

JANELA_DIAS = 7
JANELA_APPLEPAY = 1  # compra do Apple Pay: hora exata do pagamento; a nota sai no mesmo dia (±1). O nome não precisa bater
# palavras que não dizem qual é a loja (razão social, maquininha/carteira na frente do nome no Apple Pay)
_VAZIAS = {"LTDA", "LTD", "SA", "S", "A", "ME", "MEI", "EPP", "EIRELI", "CIA", "COMERCIO", "COMERCIAL", "COM", "DE", "DA", "DO", "DAS", "DOS",
           "E", "EM", "IND", "INDUSTRIA", "SERVICOS", "SERVICO", "PRODUTOS", "BRASIL", "DO BRASIL", "MP", "PAG", "PG", "PAGSEGURO", "PAGSEG",
           "PROPIG", "IFD", "IFOOD", "SUMUP", "STONE", "CIELO", "GETNET", "REDE", "MERCADOPAGO", "MERCPAGO", "PICPAY", "EC", "LJ", "LOJA"}


def _palavras(nome: str) -> list[str]:
    return [w for w in norm_txt(nome).split() if w not in _VAZIAS and not w.isdigit()]


def nomes_parecidos(a: str, b: str) -> bool:
    """"MP * Faberpastel" × "FABER PASTEL LTDA" = sim; "Padaria Pão Bom" × "Drogasil" = não."""
    pa, pb = _palavras(a), _palavras(b)
    if not pa or not pb:
        return False
    ja, jb = "".join(pa), "".join(pb)
    if len(ja) >= 5 and len(jb) >= 5 and (ja in jb or jb in ja):
        return True
    if any(len(w) >= 4 and w in pb for w in pa):
        return True
    return SequenceMatcher(None, ja, jb).ratio() >= 0.8


def _dia(c: dict[str, Any]) -> date | None:
    try:
        return date.fromisoformat(str(data_efetiva(c) or "")[:10])
    except ValueError:
        return None


def candidata(db: dict[str, Any], nota: dict[str, Any]) -> dict[str, Any] | None:
    """A compra à mão que é esta nota, se houver exatamente uma que passa em todas as regras."""
    v, d = nota.get("valor_pago"), _dia(nota)
    if v is None or d is None:
        return None
    nomes = [nota["loja"].get("nome") or "", nota["loja"].get("fantasia") or ""]
    achadas = []
    for c in db.get("compras") or []:
        if c.get("origem") != "manual" or c.get("moeda") or c.get("excluida_em") or c.get("pedido"):
            continue
        dc = _dia(c)
        ap = c.get("via") == "applepay"
        if dc is None or abs((dc - d).days) > (JANELA_APPLEPAY if ap else JANELA_DIAS):
            continue
        if round(valor_efetivo(c) or 0, 2) != round(v, 2) and round(c.get("valor_pago") or 0, 2) != round(v, 2):
            continue
        # o nome do Apple Pay às vezes é bem diferente da razão social ("Apae Anapolis" × "Associacao de Pais…"):
        # nele valem o valor exato e o dia; nos lançados à mão, o nome também precisa bater
        apelido = apelido_da_loja(db.get("apelidos") or {}, nota["loja"].get("cnpj") or "")
        if not ap and not any(nomes_parecidos(c["loja"].get("nome") or "", n) for n in nomes + [apelido] if n):
            continue
        achadas.append(c)
    return achadas[0] if len(achadas) == 1 else None


def _divergencia(db: dict[str, Any], compra: dict[str, Any], m: dict[str, Any], meu: dict[str, Any], alvo: dict[str, Any], da_nota: str) -> None:
    """O que vocês disseram na hora (ou o cartão do Apple Pay) × o que a nota registrou: fica o de vocês e vai para o sino.
    Confirmar = fica assim; Desfazer = usa o da nota."""
    from .lista import anotar_mudanca
    from .pagamentos import rotulo_cartao
    k = next((x for x in db.get("cartoes") or [] if x.get("id") == meu.get("cartao")), None)
    disse = f"{rotulo_cartao(k, db.get('cartoes') or [])} {meu['tipo'].lower()}" if k else meu["tipo"]
    from .pagamentos import aceita
    origem = "no pagamento pelo telefone" if m.get("via") == "applepay" else "no lançamento"
    pgs = copy.deepcopy(compra.get("pagamentos") or [])
    i = next(n for n, x in enumerate(compra.get("pagamentos") or []) if x is alvo)
    pgs[i]["tipo"] = da_nota  # "usar o da nota": a forma da nota, com o mesmo cartão se ele servir para ela
    if k and aceita(k, da_nota):
        pgs[i]["cartao"], pgs[i]["cartao_via"] = k["id"], "nota"
    anotar_mudanca(db, compra, f"Pagamento diferente: {origem} ficou {disse}, a nota diz {da_nota.lower()}. "
                               "Ficou o de antes da nota. Confirmar = fica assim · Desfazer = usar o da nota.", {"pagamentos": pgs})


def juntar(db: dict[str, Any], compra: dict[str, Any]) -> dict[str, Any] | None:
    """Antes de gravar a compra nova da nota: se ela é uma compra à mão, leva o que vocês informaram e tira a à mão."""
    m = candidata(db, compra)
    if not m:
        return None
    compra["quem"] = m.get("quem") or compra.get("quem")
    if m.get("via") == "applepay":  # o nome do Apple Pay vira o nome da loja, se ela ainda não tem um
        adotar_nome_applepay(db, compra.get("loja") or {}, (m.get("loja") or {}).get("nome") or "")
    if (m.get("reembolso") or {}).get("status") in ("a_reembolsar", "a_receber"):
        compra["reembolso"] = copy.deepcopy(m["reembolso"])
    # pagamento: cartão, parcelas e carteira que vocês escolheram
    mpg = [p for p in m.get("pagamentos") or [] if p.get("tipo")]
    npg = compra.get("pagamentos") or []
    if len(mpg) == 1 and mpg[0].get("forma_suposta"):  # Apple Pay no crédito suposto: a nota que diz a forma decide
        cartao_da_carteira(db, compra, mpg[0].get("cartao"))
        npg = compra.get("pagamentos") or []
        if not npg:
            compra["pagamentos"] = copy.deepcopy(mpg)
        elif len(npg) == 1 and _tipo_pag(npg[0]) not in ("Crédito", "Débito", "Benefício", "Pix", "Dinheiro"):
            npg[0].update({k: mpg[0][k] for k in ("tipo", "cartao", "cartao_via", "parcelas", "forma_suposta") if mpg[0].get(k)})
        mpg = []
    if not mpg and m.get("cartao_sugerido"):  # Apple Pay sem forma: a nota decide; o cartão da Carteira vem junto
        cartao_da_carteira(db, compra, m["cartao_sugerido"])
    if mpg and not npg:
        compra["pagamentos"] = copy.deepcopy(mpg)
    elif len(mpg) == 1:
        alvo = npg[0] if len(npg) == 1 else next((p for p in npg if _tipo_pag(p) == mpg[0]["tipo"]), None)
        if alvo is not None:
            da_nota = _tipo_pag(alvo)
            if da_nota in ("Crédito", "Débito", "Benefício", "Pix", "Dinheiro") and da_nota != mpg[0]["tipo"]:
                _divergencia(db, compra, m, mpg[0], alvo, da_nota)
            alvo["tipo"] = mpg[0]["tipo"]
            for k in ("cartao", "cartao_via", "parcelas", "carteira"):
                if mpg[0].get(k):
                    alvo[k] = mpg[0][k]
    # data em que a compra aconteceu (a nota pode sair dias depois): conta para a fatura
    dm, dn = str(data_efetiva(m) or "")[:10], str(compra.get("emissao") or "")[:10]
    if dm and dm != dn:
        compra["data_compra"] = dm
    # categoria escolhida na tela vale; a do Apple Pay foi só um palpite pelo nome, a da nota (itens) é melhor
    if m.get("categoria") not in (None, "Outros") and not str(m.get("observacao") or "").startswith(("Apple Pay", "Pelo telefone")):
        compra["categoria"], compra["subcategoria"], compra["classe_via"] = m["categoria"], m.get("subcategoria"), "você"
        compra["categoria_manual"] = True
    obs = str(m.get("observacao") or "").strip()
    if obs:
        compra["observacao"] = obs
    compra["juntada"] = {"manual": m["id"], "em": now_iso()}
    for x in db.get("applepay") or []:
        if x.get("compra") == m["id"]:
            x["compra"] = compra["id"]
    for f in (db.get("faturas_banco") or {}).values():  # trazida da fatura: a linha passa a apontar para a nota (não é oferecida de novo)
        for l in f["linhas"]:
            if l.get("compra") == m["id"]:
                l["compra"] = compra["id"]
    db["compras"].remove(m)
    m["excluida_em"], m["juntada_na"] = now_iso(), compra["id"]
    guardar_excluida(db, m)
    return m
