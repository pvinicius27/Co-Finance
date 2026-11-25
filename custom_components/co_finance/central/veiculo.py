"""Veículo: km do painel informado nos abastecimentos (aviso no celular ou Editar) e o consumo.

O tanque pode estar cheio, pela metade ou quase vazio: o consumo de um abastecimento sozinho não diz nada. A conta é a
média de um período: km rodados entre a primeira e a última leitura ÷ litros colocados depois da primeira até a última
(os sem km entram nos litros). Com dois "cheio" ("52300 cheio"), sai também o consumo exato de tanque a tanque."""
from __future__ import annotations

import re
from datetime import date, timedelta
from typing import Any

from .base import Falha, fmt_brl, nome_loja, norm_txt, now_iso
from .dados import file_lock, load_db, save_db
from .pagamentos import data_efetiva, valor_efetivo

_COMBUSTIVEL = re.compile(r"\b(GASOLINA|ETANOL|ALCOOL|DIESEL|S10|S500)\b")
_LITRO = {"L", "LT", "LTS", "LTR", "LITRO", "LITROS"}
MIN_LEITURAS = 3  # leituras de km para mostrar a média


def litros(c: dict[str, Any]) -> float:
    """Litros de combustível da nota (0 quando não é abastecimento)."""
    tot = 0.0
    for i in c.get("itens") or []:
        ncm, desc, un = str(i.get("ncm") or ""), norm_txt(i.get("descricao") or ""), norm_txt(i.get("un") or "")
        if (ncm[:4] in ("2710", "2207") or _COMBUSTIVEL.search(desc)) and un in _LITRO:
            tot += float(i.get("qtd") or 0)
    return round(tot, 2)


def veiculos(db: dict[str, Any]) -> list[dict[str, Any]]:
    return [b for b in db.get("bens") or [] if b.get("tipo") == "veiculo"]


def precisa_km(db: dict[str, Any], c: dict[str, Any]) -> bool:
    """Abastecimento sem km, numa casa com veículo cadastrado: pede o km no celular."""
    return bool(veiculos(db)) and not c.get("km") and litros(c) > 0


def ler_km(txt: Any) -> tuple[int | None, bool]:
    """"52300", "52.300 cheio", "cheio 52300", "52300 c" → (52300, cheio?)."""
    s = norm_txt(str(txt or ""))
    cheio = bool(re.search(r"\b(CHEIO|COMPLETO|COMPLETEI|ENCHI|C)\b", s))
    m = re.search(r"\d[\d. ]*\d|\d", s)
    km = int(re.sub(r"\D", "", m.group(0))) if m else None
    return (km if km and 0 < km < 2_000_000 else None), cheio


def _fmt_km(n: float) -> str:
    return f"{int(round(n)):,}".replace(",", ".")


def _kml(v: float) -> str:
    return f"{v:.1f}".replace(".", ",")


def consumo(db: dict[str, Any], bem_id: str, hoje: date | None = None) -> dict[str, Any]:
    """Km atual, média do período (geral e últimos 30 dias), tanque a tanque, R$/km, km no mês e os abastecimentos."""
    hoje = hoje or date.today()
    lst = sorted((c for c in db.get("compras") or [] if c.get("bem") == bem_id and not c.get("excluida_em")),
                 key=lambda c: (data_efetiva(c) or "", c.get("km") or 0))
    abast = [{"id": c["id"], "data": (data_efetiva(c) or "")[:10], "litros": litros(c), "km": c.get("km"), "cheio": bool(c.get("cheio")),
              "valor": valor_efetivo(c) or 0, "loja": nome_loja(c.get("loja") or {})} for c in lst if litros(c) > 0]
    kms = [c["km"] for c in lst if c.get("km") and c.get("km_via") == "você"]  # km atual: só o que vocês informaram (o da nota da oficina pode ser antigo)

    def media(ab: list[dict[str, Any]]) -> dict[str, Any] | None:
        lei = [a for a in ab if a["km"]]
        if len(lei) < 2:
            return None
        i0, i1 = ab.index(lei[0]), ab.index(lei[-1])
        km = lei[-1]["km"] - lei[0]["km"]
        lt = sum(a["litros"] for a in ab[i0 + 1:i1 + 1])
        rs = sum(a["valor"] for a in ab[i0 + 1:i1 + 1])
        if km <= 0 or lt <= 0:
            return None
        return {"kml": round(km / lt, 1), "km": km, "litros": round(lt, 1), "rs_km": round(rs / km, 2), "leituras": len(lei)}

    geral = media(abast) if sum(1 for a in abast if a["km"]) >= MIN_LEITURAS else None
    corte = (hoje - timedelta(days=30)).isoformat()
    m30 = media([a for a in abast if a["data"] >= corte])
    cheios = [a for a in abast if a["km"] and a["cheio"]]
    tanque = None
    if len(cheios) >= 2:
        a0, a1 = cheios[-2], cheios[-1]
        i0, i1 = abast.index(a0), abast.index(a1)
        km, lt = a1["km"] - a0["km"], sum(a["litros"] for a in abast[i0 + 1:i1 + 1])
        if km > 0 and lt > 0:
            tanque = {"kml": round(km / lt, 1), "km": km, "litros": round(lt, 1), "de": a0["data"], "ate": a1["data"]}
    mes = hoje.isoformat()[:7]
    no_mes = [a["km"] for a in abast if a["km"] and a["data"][:7] == mes]
    antes = [a["km"] for a in abast if a["km"] and a["data"][:7] < mes]
    km_mes = (max(no_mes) - max(antes)) if no_mes and antes and max(no_mes) > max(antes) else None
    sem_km = [a["id"] for a in abast if not a["km"] and a["data"] >= (hoje - timedelta(days=90)).isoformat()]
    return {"km_atual": max(kms) if kms else None, "geral": geral, "ultimos_30": m30, "tanque": tanque, "km_mes": km_mes,
            "sem_km": len(sem_km), "faltam_leituras": max(0, MIN_LEITURAS - sum(1 for a in abast if a["km"])) if not geral else 0,
            "abastecimentos": abast[-12:][::-1]}


def resumo_consumo(cs: dict[str, Any]) -> str:
    """Uma linha para o aviso de confirmação: "média 11,2 km/l · R$ 0,52/km"."""
    g = cs.get("tanque") or cs.get("ultimos_30") or cs.get("geral")
    return f"média {_kml(g['kml'])} km/l" + (f" · {fmt_brl(g['rs_km'])}/km" if g.get("rs_km") else "") if g else ""


def km(p: dict[str, Any]) -> dict[str, Any]:
    """Km do painel de um abastecimento (ou de qualquer compra do carro): {id, km ("52300" ou "52300 cheio"), cheio?, bem?}."""
    n, cheio = ler_km(p.get("km"))
    if p.get("cheio") is not None:
        cheio = bool(p.get("cheio"))
    if not n:
        raise Falha("Km do painel: escreva só o número (ex.: 52300). Encheu o tanque? 52300 cheio.")
    with file_lock():
        db = load_db()
        c = next((x for x in db["compras"] if x["id"] == p.get("id")), None)
        if not c:
            raise Falha("Compra não encontrada (pode ter sido excluída).")
        vs = veiculos(db)
        bem = p.get("bem") or c.get("bem") or (vs[0]["id"] if len(vs) == 1 else None)
        if not bem or not any(b["id"] == bem for b in vs):
            raise Falha("Qual veículo? Escolha no Editar › Veículo.")
        c["bem"], c["km"], c["cheio"], c["km_via"] = bem, n, cheio, "você"
        if p.get("bem"):
            c["bem_manual"] = True
        c.setdefault("ajustes", []).append({"em": now_iso(), "acao": "km"})
        save_db(db)
        cs = consumo(db, bem)
    dia = data_efetiva(c) or ""
    ant = [a for a in cs["abastecimentos"] if a["km"] and a["id"] != c["id"] and a["data"] <= dia[:10]]
    alerta = f" ⚠ Menor que o anterior ({_fmt_km(max(a['km'] for a in ant))} km): confira." if ant and n < max(a["km"] for a in ant) else ""
    extra = resumo_consumo(cs)
    return {"ok": True, "status": "km", "id": c["id"], "quem": c.get("quem"), "consumo": cs,
            "mensagem": f"{_fmt_km(n)} km{' · tanque cheio' if cheio else ''} salvo.{(' ' + extra[0].upper() + extra[1:] + '.') if extra else ''}{alerta}"}
