"""Cartão pelo aviso: compra que entrou sem saber o cartão → pergunta a quem comprou, com botões no celular.

Antes de perguntar, casa a nota com o Apple Pay pendente (o iPhone já disse o cartão). Só pergunta o que falta:
crédito/débito da nota sem cartão (os cartões que servem) ou sem forma nenhuma (cartões da pessoa + Pix/Dinheiro).
O botão manda COMPRAS_CARTAO|<compra>|<pagamento>|<cartão>|<forma> e a ação cartao_aviso grava."""
from __future__ import annotations

from collections import Counter
from typing import Any

from .base import Falha, fmt_brl, nome_loja
from .config import MARCO_ZERO
from .dados import file_lock, load_db, save_db
from .pagamentos import _pgs_fin, _tipo_pag, aceita, data_efetiva, rotulo_cartao, valor_efetivo
from .cartoes import candidatos, usam_hoje

FORMA_COD = {"C": "Crédito", "D": "Débito", "A": "Benefício", "P": "Pix", "$": "Dinheiro"}
COD_FORMA = {v: k for k, v in FORMA_COD.items()}
MAX_BOTOES = 10  # o iPhone mostra até 10 botões no aviso


def _uso(db: dict[str, Any], quem: str | None) -> Counter:
    """Quantas vezes a pessoa usou cada (cartão, forma): os mais usados aparecem primeiro."""
    n: Counter = Counter()
    for c in db.get("compras") or []:
        if c.get("quem") != quem or c.get("excluida_em"):
            continue
        for pg in _pgs_fin(c):
            if pg.get("cartao"):
                n[(pg["cartao"], _tipo_pag(pg))] += 1
            elif _tipo_pag(pg) in ("Pix", "Dinheiro"):
                n[("", _tipo_pag(pg))] += 1
    return n


def _rotulo(db: dict[str, Any], k: dict[str, Any], forma: str) -> str:
    nome = rotulo_cartao(k, db.get("cartoes") or [])
    if forma in ("Crédito", "Débito") and k.get("credito", True) and not k.get("vale") and k.get("debito"):
        return f"{nome} {forma.lower()}"  # cartão com as duas funções: diz qual
    return nome


def _alfa(ops: list[tuple[str, str, str]], ordem, n: int) -> list[tuple[str, str, str]]:
    """Os n que mais servem (sugerido e mais usados), mostrados em ordem alfabética."""
    from .base import norm_txt
    return sorted(sorted(ops, key=ordem)[:n], key=lambda o: norm_txt(o[0]))


def opcoes_cartao(db: dict[str, Any], c: dict[str, Any], trocar: bool = False) -> tuple[int, list[tuple[str, str, str]]] | None:
    """(índice do pagamento ou -1 = criar, [(rótulo, cartão, código da forma)]) ou None se não há o que perguntar.
    trocar: o aviso do Apple Pay oferece também trocar o crédito suposto (todos os cartões)."""
    if c.get("excluida_em") or not (valor_efetivo(c) or 0) or (data_efetiva(c) or "")[:10] < db.get("marco", MARCO_ZERO):
        return None
    pgs = _pgs_fin(c)
    uso = _uso(db, c.get("quem"))
    sug = c.get("cartao_sugerido")
    ordem = lambda o: (o[1] != sug, -uso[(o[1], FORMA_COD[o[2]])])
    if pgs:
        falta = [(i, pg) for i, pg in enumerate(pgs) if (not pg.get("cartao") and _tipo_pag(pg) in ("Crédito", "Débito", "Outro"))
                 or (trocar and pg.get("forma_suposta"))]
        if not falta:
            return None
        i, pg = falta[0]
        t = _tipo_pag(pg)
        if t in ("Crédito", "Débito") and not pg.get("forma_suposta"):
            ks = candidatos(db, c, pg, pela_bandeira=False)  # a bandeira da nota às vezes vem errada: todos que servem
            if len(ks) < 2:
                return None  # um só já foi sugerido na entrada; nenhum: não há o que oferecer
            ops = [(_rotulo(db, k, t), k["id"], COD_FORMA[t]) for k in ks]
            return i, _alfa(ops, ordem, MAX_BOTOES)
        idx = i  # forma "Outros" na nota: pergunta a forma junto
    else:
        idx = -1
        k = next((x for x in db.get("cartoes") or [] if x.get("id") == sug), None) if sug else None
        if k and aceita(k, "Crédito") and aceita(k, "Débito"):  # o iPhone disse o cartão; falta só a função
            ops = [("Crédito", k["id"], "C")] + ([("Débito", k["id"], "D")] if k.get("dono") == c.get("quem") else [])
            return idx, ops
    ops = []
    for k in db.get("cartoes") or []:
        if c.get("quem") not in usam_hoje(k) or not k.get("ativo", True):
            continue
        for t in ("Crédito", "Débito", "Benefício"):
            if aceita(k, t) and (t == "Crédito" or k.get("dono") == c.get("quem")):
                ops.append((_rotulo(db, k, t), k["id"], COD_FORMA[t]))
    if not ops:
        return None
    ops = _alfa(ops, ordem, MAX_BOTOES - 2) + [("Pix", "", "P"), ("Dinheiro", "", "$")]
    return idx, ops


def acoes_cartao(db: dict[str, Any], c: dict[str, Any], trocar: bool = False) -> list[dict[str, str]] | None:
    o = opcoes_cartao(db, c, trocar)
    if not o:
        return None
    idx, ops = o
    return [{"action": f"COMPRAS_CARTAO|{c['id']}|{idx}|{cid}|{cod}", "title": rot} for rot, cid, cod in ops]


def casar_applepay_agora(compra_id: str | None) -> None:
    """Nota nova: casa já com o Apple Pay pendente (sem esperar o card abrir), para o cartão do iPhone entrar sozinho."""
    from .applepay import _ap_casar_notas
    with file_lock():
        db = load_db()
        if _ap_casar_notas(db):
            save_db(db)


def cartao_aviso(p: dict[str, Any]) -> dict[str, Any]:
    """Resposta do botão do aviso: grava o cartão (e a forma) no pagamento escolhido."""
    cid_compra, cartao, cod = str(p.get("id") or ""), str(p.get("cartao") or ""), str(p.get("forma") or "")
    try:
        idx = int(p.get("pg"))
    except (TypeError, ValueError):
        raise Falha("Pedido inválido.")
    if cod not in FORMA_COD:
        raise Falha("Forma de pagamento desconhecida.")
    forma = FORMA_COD[cod]
    with file_lock():
        db = load_db()
        c = next((x for x in db["compras"] if x["id"] == cid_compra and not x.get("excluida_em")), None)
        if not c:
            raise Falha("Não achei essa compra (foi excluída?).")
        k = next((x for x in db.get("cartoes") or [] if x.get("id") == cartao), None) if cartao else None
        if cartao and not (k and aceita(k, forma)):
            raise Falha("Esse cartão não serve para essa forma. Escolha no card.")
        pgs = _pgs_fin(c)
        if idx < 0:  # compra sem forma de pagamento (à mão, Apple Pay sem cupom): cria o pagamento
            pg = None if pgs else {"forma": "", "tipo": forma, "valor": valor_efetivo(c)}
            if pg:
                c["pagamentos"] = [pg]
        else:
            pg = pgs[idx] if idx < len(pgs) else None
        loja = f"{nome_loja(c['loja'])} · {fmt_brl(valor_efetivo(c) or 0)}"
        if pg is None:
            return {"ok": False, "status": "erro", "quem": c.get("quem"), "mensagem": f"{loja}: o pagamento mudou. Confira no card."}
        if pg.get("cartao") and pg.get("cartao_via") == "você":
            return {"ok": True, "status": "cartao_ok", "quem": c.get("quem"),
                    "mensagem": f"{loja}: já estava como {_rotulo(db, next((x for x in db.get('cartoes') or [] if x.get('id') == pg['cartao']), {}), _tipo_pag(pg))}."}
        pg["tipo"] = forma
        pg.pop("forma_suposta", None)
        if k:
            pg["cartao"], pg["cartao_via"] = k["id"], "você"
            if forma == "Crédito":
                pg.setdefault("parcelas", 1)
        else:
            pg.pop("cartao", None)
            pg.pop("cartao_via", None)
        c.pop("cartao_sugerido", None)
        save_db(db)
    return {"ok": True, "status": "cartao_ok", "quem": c.get("quem"),
            "mensagem": f"{loja}: {_rotulo(db, k, forma) if k else forma} ✓"}
