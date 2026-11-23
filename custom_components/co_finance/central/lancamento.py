"""Compra lançada à mão."""
from __future__ import annotations

import re
from datetime import datetime
from typing import Any

from .config import MOEDAS, TIPOS_PAG
from .base import Falha, _valor_txt, fmt_brl, fmt_moeda, now_iso
from .dados import compradores, file_lock, load_db, load_db_ro, save_db
from .categorias import checar_classe, classe_item_manual
from .cartoes import _cartao, sugerir_cartao, texto_fatura
from .pagamentos import aceita


def item_manual(descricao: str, total: float) -> list[dict[str, Any]]:
    """Compra sem nota: o que foi comprado vira o único item, com o valor da compra.
    Sem quantidade nem preço por unidade: fica fora de Produtos/Preços."""
    descricao = re.sub(r"\s+", " ", str(descricao or "")).strip()[:80]
    return [{"n": 1, "descricao": descricao, "codigo": "", "ean": None, "ncm": None, "qtd": None, "un": "", "unit": None,
             "total": round(total or 0, 2), "promo": False, "manual": True}] if descricao else []


def _pessoa_reembolsa(quem: str) -> bool:
    """A pessoa está como "compras entram a reembolsar" (Apple Pay sem cupom, que não manda a escolha)."""
    from .dados import pessoas
    return any(x["nome"] == quem and x.get("reembolso") for x in pessoas())


def manual(p: dict[str, Any]) -> dict[str, Any]:
    quem = p.get("quem")
    if quem not in compradores():
        raise Falha(f"Quem comprou? Use {', '.join(compradores())}.")
    cat = p.get("categoria") or "Outros"
    loja = str(p.get("loja") or "").strip()
    if not loja:
        raise Falha("Informe a loja ou onde foi a compra.")
    moeda = str(p.get("moeda") or "BRL").upper()
    if moeda not in MOEDAS:
        raise Falha("Moeda desconhecida.")
    valor = _valor_txt(p.get("valor"))
    if not valor or valor <= 0:
        raise Falha("Informe o valor da compra.")
    # outra moeda: o valor fica como está; em reais só se vocês informarem (até lá fica fora dos totais em R$)
    brl = round(valor, 2) if moeda == "BRL" else round(_valor_txt(p.get("valor_brl")) or 0.0, 2)
    data = str(p.get("data") or "")
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", data):
        raise Falha("Informe a data da compra.")
    forma = p.get("forma") or ""
    if forma and forma not in TIPOS_PAG:
        raise Falha("Forma de pagamento desconhecida.")
    itens = item_manual(p.get("item"), brl)
    with file_lock():
        cat, sub = checar_classe(load_db(), cat, p.get("subcategoria"))
        if itens and cat == "Outros" and (k := classe_item_manual(itens[0]["descricao"])):  # categoria não escolhida: o item decide
            cat, sub = checar_classe(load_db(), *k)
    if not any(quem in k.get("usam", []) for k in load_db_ro().get("cartoes") or []):
        p = {**p, "cartao": ""}  # quem não tem cartão cadastrado paga com o próprio: fica fora das faturas
    kk = _cartao(load_db_ro(), p.get("cartao")) if p.get("cartao") else None
    com_cartao = bool(kk and aceita(kk, forma))
    pgs = [{"forma": "", "tipo": forma, "valor": brl,
            **({"cartao": p["cartao"], "cartao_via": "você", **({"parcelas": max(1, min(24, int(p.get("parcelas") or 1)))} if forma == "Crédito" else {})}
               if com_cartao else {})}] if forma else []
    partes = p.get("partes")
    if partes:  # pagou com mais de uma forma: cada parte com forma, valor, cartão e parcelas; a soma dá o total
        if not isinstance(partes, list) or not 2 <= len(partes) <= 4:
            raise Falha("Divida o pagamento em 2 a 4 formas.")
        if not brl:
            raise Falha("Para dividir o pagamento, informe o valor em reais.")
        db_ro, sem_cartao, pgs = load_db_ro(), not p.get("cartao") and not any(quem in k.get("usam", []) for k in load_db_ro().get("cartoes") or []), []
        for n, x in enumerate(partes, 1):
            x = x if isinstance(x, dict) else {}
            f = x.get("forma") or ""
            if f not in TIPOS_PAG:
                raise Falha(f"Escolha como foi paga a forma {n}.")
            v = round(_valor_txt(x.get("valor")) or 0.0, 2)
            if v <= 0:
                raise Falha(f"Informe o valor da forma {n}.")
            k = None if sem_cartao or not x.get("cartao") else _cartao(db_ro, x.get("cartao"))
            ok = bool(k and aceita(k, f))
            pgs.append({"forma": "", "tipo": f, "valor": v,
                        **({"cartao": k["id"], "cartao_via": "você", **({"parcelas": max(1, min(24, int(x.get("parcelas") or 1)))} if f == "Crédito" else {})}
                           if ok else {})})
        soma = round(sum(x["valor"] for x in pgs), 2)
        if abs(soma - brl) > 0.01:
            raise Falha(f"A soma das formas ({fmt_brl(soma)}) não bate com o total ({fmt_brl(brl)}).")
    cid = f"manual-{datetime.now():%Y%m%d%H%M%S%f}"
    compra = {
        "id": cid, "chave": None, "origem": "manual", "quem": quem,
        "reembolso": ({"status": "a_receber", "pago_em": None, "de": str(p.get("receber_de") or "").strip()[:60]} if str(p.get("receber_de") or "").strip()
                      else {"status": "a_reembolsar" if (p.get("reembolso") if p.get("reembolso") is not None else _pessoa_reembolsa(quem)) else "nao",
                            "pago_em": None}),
        "categoria": cat, "subcategoria": sub, "classe_via": "você", "categoria_manual": True,
        "loja": {"nome": loja, "cnpj": "", "cidade": "", "uf": ""},
        "numero": "", "serie": "", "emissao": f"{data}T12:00:00-03:00",
        "itens": itens, "qtd_itens": len(itens), "valor_produtos": brl, "desconto": 0.0,
        "valor_pago": brl, "tributos": None,
        "pagamentos": pgs,
        "observacao": str(p.get("observacao") or "").strip()[:200],
        "conferencia": {"soma_itens": None, "bate": True},
        "registrado_em": now_iso(),
    }
    if moeda != "BRL":
        compra["moeda"] = {"cod": moeda, "valor": round(valor, 2)}
    with file_lock():
        db = load_db()
        sugerir_cartao(db, compra)
        db["compras"].append(compra)
        db["compras"].sort(key=lambda c: c.get("emissao") or "", reverse=True)
        save_db(db)
    quanto = fmt_brl(valor) if moeda == "BRL" else f"{fmt_moeda(compra['moeda'])}" + (f" ({fmt_brl(brl)})" if brl else "")
    fat = texto_fatura(load_db_ro(), compra) if any(x.get("tipo") == "Crédito" for x in pgs) else ""
    return {"ok": True, "status": "nova", "id": cid, "mensagem": f"{loja} · {quanto} · {quem}" + (f" · {fat}" if fat else "")}
