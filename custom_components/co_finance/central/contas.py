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
    out = _contas_luz(db) + contas_agua(db, _pago) + _recorrentes(db) + _parceladas(db) + _financiamentos(db)
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


def _parceladas(db: dict[str, Any], hoje: date | None = None) -> list[dict[str, Any]]:
    """Carnê com datas fixas (IPTU): todas as parcelas, pagas ou não. Valor depois do vencimento, se houver, igual à mensal."""
    hoje = hoje or date.today()
    out = []
    for r in (db.get("contas_casa") or {}).get("parceladas") or []:
        n = len(r["vencimentos"])
        for i, venc in enumerate(r["vencimentos"], 1):
            cid = f"{r['id']}:{venc[:7]}"
            pg = _pago(db, cid, venc)
            out.append({"id": cid, "tipo": "conta", "fonte": "parcelada", "fonte_txt": "carnê", "nome": r["nome"], "icone": r["icone"],
                        "vence": venc, "referencia": f"{i}/{n}", "parcela": i, "de": n, "categoria": r["categoria"],
                        "subcategoria": r["subcategoria"], "quem": r["quem"], "pago": pg,
                        "faixas": {"ate": venc, "valor": r["valor"], "depois": r.get("valor_depois") or r["valor"]}})
            out[-1]["total"] = round(pg["valor"], 2) if pg and pg.get("valor") else valor_pela_data({**out[-1], "total": r["valor"]}, hoje.isoformat())
    return out


def _financiamentos(db: dict[str, Any], hoje: date | None = None) -> list[dict[str, Any]]:
    """Financiamento (aba Financiamento): uma conta por parcela, do início do controle até a próxima a vencer. Valor: o
    pago (extrato ou "Paguei" com valor) ou o previsto pela TR. Débito automático: no dia do vencimento entra como paga
    com o valor previsto (quem paga corrige o valor se saiu diferente)."""
    fins = db.get("financiamentos") or []
    if not fins:
        return []
    from .financiamento import projetar  # só quando há financiamento
    hoje = hoje or date.today()
    out = []
    for f in fins:
        try:
            pj = projetar(f, db.get("tr_bcb") or {})
        except Exception:  # noqa: BLE001 - um financiamento com problema não derruba as outras contas
            continue
        proxima_vista = False
        for x in pj["pagas"] + pj["futuras"]:
            venc = x["vence"]
            if venc < db.get("marco", MARCO_ZERO):
                continue
            if venc > hoje.isoformat() and proxima_vista:
                break
            cid = f"{f['id']}:{venc[:7]}"
            pg = _pago(db, cid, venc)
            if not pg and x.get("tipo") == "paga":
                pg = {"em": x.get("pago_em") or venc, "via": "extrato do banco", "valor": x.get("pago") or x["total"]}
            elif not pg and f.get("debito", True) and venc <= hoje.isoformat():
                pg = {"em": venc, "via": "débito automático"}
            if venc > hoje.isoformat() and not pg:  # a próxima a pagar (a paga adiantada aparece e a seguinte também)
                proxima_vista = True
            out.append({"id": cid, "tipo": "conta", "fonte": "financiamento", "fonte_txt": "débito automático" if f.get("debito", True) else "boleto",
                        "nome": f["nome"], "icone": "🏠", "vence": venc, "referencia": f"{x['n']}/{f['prazo']}", "parcela": x["n"], "de": f["prazo"],
                        "categoria": "Casa", "subcategoria": "Contas fixas", "quem": f.get("quem"), "pago": pg,
                        "total": round(pg["valor"], 2) if pg and pg.get("valor") else x["total"],
                        "financiamento": {"id": f["id"], "previsto": x["total"], "tipo": x.get("tipo"), "tr": x.get("tr"),
                                          "amort": x["amort"], "juros": x["juros"], "seguros": round((x.get("mip") or 0) + (x.get("dfi") or 0), 2)}})
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
