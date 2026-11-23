"""Contas da casa: luz (do painel de energia), água (contas da Saneago lidas pelo card), contas fixas sem conta da
empresa (internet: a Central cria uma por mês) e a marca de pago."""
from __future__ import annotations

import calendar
import json
from datetime import date
from typing import Any

from .config import ENERGIA_DIR, MARCO_ZERO
from .contas_agua import contas_agua


def _pago(db: dict[str, Any], fid: str, vence: str) -> dict[str, Any] | None:
    p = (db.get("pagos") or {}).get(fid)
    if p:
        return None if p.get("aberto") else p
    if vence <= db.get("pago_ate", ""):
        return {"em": vence, "via": "antes do controle"}
    return None


def contas(db: dict[str, Any]) -> list[dict[str, Any]]:
    """Contas da casa (luz, água, mensais e carnês do cadastro), por vencimento."""
    out = _contas_luz(db) + contas_agua(db, _pago) + _recorrentes(db) + _parceladas(db)
    out.sort(key=lambda x: x["vence"])
    return out


def valor_pela_data(x: dict[str, Any], dia: str) -> float:
    """Conta com preço que muda no vencimento (internet): o valor de quem paga nesse dia (AAAA-MM-DD)."""
    f = x.get("faixas")
    return x["total"] if not f else (f["valor"] if dia <= f["ate"] else f["depois"])


def _recorrentes(db: dict[str, Any], hoje: date | None = None) -> list[dict[str, Any]]:
    """Uma conta por mês desde "desde" até o mês atual (e o seguinte, se a do mês já venceu)."""
    hoje = hoje or date.today()
    out = []
    for r in (db.get("contas_casa") or {}).get("recorrentes") or []:
        venc_do = lambda a, m: date(a, m, min(r["dia"], calendar.monthrange(a, m)[1])).isoformat()
        fim = (hoje.year, hoje.month)
        if hoje.isoformat() > venc_do(*fim):  # a do mês já venceu: a do mês seguinte já aparece
            fim = (fim[0] + 1, 1) if fim[1] == 12 else (fim[0], fim[1] + 1)
        a, m = map(int, r["desde"].split("-"))
        if r.get("ate"):  # conta encerrada: até o mês escolhido
            fim = min(fim, tuple(map(int, r["ate"].split("-"))))
        while (a, m) <= fim:
            venc = venc_do(a, m)
            cid = f"{r['id']}:{a}-{m:02d}"
            pg = _pago(db, cid, venc)
            x = {"id": cid, "tipo": "conta", "fonte": "recorrente", "fonte_txt": "controle de vocês", "nome": r["nome"], "icone": r["icone"],
                 "vence": venc, "referencia": f"{m:02d}/{a}", "categoria": r["categoria"], "subcategoria": r["subcategoria"], "quem": r["quem"],
                 "faixas": {"ate": venc, "valor": r["valor"], "depois": r["valor_depois"]}, "pago": pg}
            x["total"] = round(pg["valor"], 2) if pg and pg.get("valor") else valor_pela_data({**x, "total": r["valor"]}, hoje.isoformat())
            if venc >= db.get("marco", MARCO_ZERO):
                out.append(x)
            a, m = (a + 1, 1) if m == 12 else (a, m + 1)
    return out


def _parceladas(db: dict[str, Any]) -> list[dict[str, Any]]:
    """Carnê com datas fixas (IPTU): todas as parcelas, pagas ou não."""
    out = []
    for r in (db.get("contas_casa") or {}).get("parceladas") or []:
        n = len(r["vencimentos"])
        for i, venc in enumerate(r["vencimentos"], 1):
            cid = f"{r['id']}:{venc[:7]}"
            pg = _pago(db, cid, venc)
            out.append({"id": cid, "tipo": "conta", "fonte": "parcelada", "fonte_txt": "carnê", "nome": r["nome"], "icone": r["icone"],
                        "vence": venc, "referencia": f"{i}/{n}", "parcela": i, "de": n, "categoria": r["categoria"],
                        "subcategoria": r["subcategoria"], "quem": r["quem"], "pago": pg,
                        "total": round(pg["valor"], 2) if pg and pg.get("valor") else r["valor"]})
    return out


def painel_energia() -> dict[str, Any] | None:
    """O painel de energia (Co-Energy) está instalado? Devolve as unidades dele para a Luz escolher; sem ele, None."""
    try:
        model = json.loads((ENERGIA_DIR / "co_energy.model").read_text(encoding="utf-8"))
        (ENERGIA_DIR / "co_energy.invoices").stat()
    except (OSError, ValueError):
        return None
    units = ((model.get("data") or {}).get("model") or {}).get("units") or {}
    return {"unidades": [{"id": k, "nome": (v or {}).get("name") or k} for k, v in units.items()]}


def _contas_luz(db: dict[str, Any]) -> list[dict[str, Any]]:
    """Luz: faturas que o painel de energia já leu, da unidade do cadastro (só leitura; sem cadastro ou sem o arquivo, nada),
    ou, sem o painel (fonte "pdf"), as contas em PDF lidas pela Central (central/energia.py)."""
    luz = (db.get("contas_casa") or {}).get("luz")
    if not luz:
        return []
    if luz.get("fonte") in ("pdf", "manual"):  # PDF lido pela Central ou digitada mês a mês
        from .energia import contas_luz_pdf
        return contas_luz_pdf(db, luz, _pago)
    try:
        model = json.loads((ENERGIA_DIR / "co_energy.model").read_text(encoding="utf-8"))
        inv = json.loads((ENERGIA_DIR / "co_energy.invoices").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return []
    unidade = (((model.get("data") or {}).get("model") or {}).get("units") or {}).get(luz.get("unidade")) or {}
    ucs = {u.get("hash") for u in unidade.get("ucs") or [] if isinstance(u, dict)}
    out = []
    for f in (inv.get("data") or {}).get("faturas") or []:
        ident, per, fat = f.get("identificacao") or {}, f.get("periodo") or {}, f.get("faturamento") or {}
        venc = per.get("vencimento") or ""
        if ident.get("uc_hash") not in ucs or not venc or venc < db.get("marco", MARCO_ZERO) or fat.get("valor_total") is None:
            continue
        cid = f"luz:{ident.get('competencia')}"
        out.append({"id": cid, "tipo": "conta", "fonte": "energia", "fonte_txt": "painel de energia", "nome": luz["nome"], "icone": luz.get("icone") or "⚡", "vence": venc,
                    "total": round(float(fat["valor_total"]), 2), "referencia": ident.get("referencia") or ident.get("competencia"),
                    "categoria": luz.get("categoria") or "Casa", "subcategoria": luz.get("subcategoria") or "Contas fixas", "quem": luz.get("quem"),
                    "pago": _pago(db, cid, venc)})
    return out
