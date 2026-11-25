"""Conta de luz em PDF, para quem não tem o painel de energia: o card tira as linhas de texto com o pdf.js e manda só
elas; aqui sai a conta (db["contas_luz"], uma por mês). O PDF não é guardado e da conta só fica valor, vencimento,
mês, consumo, leituras, bandeira e créditos de energia solar. Nome, CPF, endereço, número da instalação, código de
barras e Pix não saem daqui: cada leitor só pega campos com formato conhecido.

Leitores (o layout é da distribuidora, igual para qualquer cliente), escritos sobre faturas reais:
- Equatorial Goiás: dois modelos (o total sozinho na linha, ou junto do vencimento); com ou sem energia solar (SCEE).
- CPFL (CPFL Piratininga, B1 residencial): mês, vencimento e total numa linha; leituras atual e anterior.
- Neoenergia (Neoenergia Brasília, B1 residencial): o valor é o TOTAL (o "TOTAL A PAGAR" vem zerado no débito automático).
"""
from __future__ import annotations

import base64
import json
import re
from typing import Any

from .config import MARCO_ZERO
from .base import Falha, fmt_brl, norm_txt, now_iso, num

MESES = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"]
_M = "|".join(MESES)
_D = r"(\d{2}/\d{2}/\d{4})"
_V = r"(\d{1,3}(?:\.\d{3})*,\d{2})"


def _iso(d: str | None) -> str | None:
    return f"{d[6:10]}-{d[3:5]}-{d[0:2]}" if d else None


def _ref(mes: str, ano: str) -> tuple[str, str]:
    """("SET", "2026") ou ("09", "2026") → ("2026-09", "SET/2026")."""
    n = MESES.index(mes.upper()) + 1 if not mes.isdigit() else int(mes)
    return f"{ano}-{n:02d}", f"{MESES[n - 1]}/{ano}"


def _achar(rx: str, txt: str, g: int = 1, flags: int = re.I) -> str | None:
    m = re.search(rx, txt, flags)
    return m.group(g) if m else None


def _kwh(v: str | None) -> float | None:
    x = num(v) if v else None
    return round(x, 2) if x is not None else None


def _equatorial_go(L: list[list[Any]], um: str) -> dict[str, Any]:
    linhas = [(p, y, str(t)) for p, _, y, t in L]
    perto = lambda p0, y0: [t for p, y, t in linhas if p == p0 and abs(y - y0) <= 2]  # noqa: E731  mesma altura da página
    tot = next(((p, y, t) for p, y, t in linhas if re.search(r"R\$\s*\*{3,}", t)), None)
    if not tot:
        raise Falha("Equatorial: não achei o total da conta.")
    total = _achar(r"R\$\s*\*+\s*" + _V, tot[2])
    vizinhas = [tot[2], *perto(tot[0], tot[1])]
    venc = next((d for t in vizinhas for d in re.findall(_D, t)), None)
    mes = next((m for t in vizinhas if (m := re.search(rf"\b({_M})/(20\d\d)\b", t))), None) or re.search(rf"\b({_M})/(20\d\d)\b", um)
    out: dict[str, Any] = {"total": num(total), "vence": _iso(venc)}
    if mes:
        out["ref"], out["referencia"] = _ref(mes.group(1), mes.group(2))
    # leituras: "29/12/2025  28/01/2026" com os dias e a próxima leitura na mesma altura
    lei = next(((p, y, m) for p, y, t in linhas if (m := re.fullmatch(rf"{_D}\s+{_D}", t.strip()))), None)
    if lei:
        out["leitura"] = {"anterior": _iso(lei[2].group(1)), "atual": _iso(lei[2].group(2))}
        for t in perto(lei[0], lei[1]):
            if re.fullmatch(r"\d{1,2}", t.strip()):
                out["dias"] = int(t)
            elif re.fullmatch(_D, t.strip()):
                out["proxima_leitura"] = _iso(t.strip())
    out["consumo_kwh"] = _kwh(_achar(r"ENERGIA ATIVA - KWH\s+\d+\s+(\d+(?:,\d+)?)", um))
    out["bandeira"] = (_achar(r"BANDEIRA\s+(VERDE|AMARELA|VERMELHA(?:\s+P[12])?)", um) or "").title() or None
    cred, saldo = _achar(r"CR[ÉE]DITO RECEBIDO KWH:?\s*([\d.]+,\d+)", um), _achar(r"SALDO KWH:\s*([\d.]+,\d+)", um)
    if cred and (num(cred) or 0) > 0:
        out["solar"] = {"credito_kwh": _kwh(cred), "saldo_kwh": _kwh(saldo)}
    return out


def _cpfl(L: list[list[Any]], um: str) -> dict[str, Any]:
    linhas = [str(t) for *_, t in L]
    cab = next((m for t in linhas if (m := re.match(rf"({_M})/(20\d\d)\s+{_D}\s+R\$\s*{_V}", t.strip(), re.I))), None)
    if not cab:
        raise Falha("CPFL: não achei o mês, o vencimento e o total.")
    out: dict[str, Any] = {"total": num(cab.group(4)), "vence": _iso(cab.group(3))}
    out["ref"], out["referencia"] = _ref(cab.group(1), cab.group(2))
    lei = next((m for t in linhas if (m := re.fullmatch(rf"{_D}\s+{_D}\s+(\d{{1,2}})", t.strip()))), None)
    if lei:
        a, b = _iso(lei.group(1)), _iso(lei.group(2))
        out["leitura"] = {"anterior": min(a, b), "atual": max(a, b)}
        out["dias"] = int(lei.group(3))
    out["proxima_leitura"] = _iso(_achar(rf"Pr[óo]xima leitura\s+{_D}", um))
    out["consumo_kwh"] = _kwh(_achar(r"Energia Ativa-kWh\s+\S+\s+[\d.]+\s+[\d.]+\s+[\d,]+\s+(\d+(?:,\d+)?)", um)
                             or _achar(r"Consumo - TE\s+\S+\s+kWh\s+([\d.]+,\d+)", um))
    out["bandeira"] = (_achar(r"Adicional de Bandeira\s+(Amarela|Vermelha(?:\s+P[12])?)", um) or "").title() or None
    return out


def _neoenergia(L: list[list[Any]], um: str) -> dict[str, Any]:
    linhas = [str(t) for *_, t in L]
    ref = re.search(r"REF:\s*M[ÊE]S/ANO\s+(\d{2})/(20\d\d)", um, re.I)
    total = next((m.group(1) for t in linhas if (m := re.fullmatch(rf"TOTAL\s+{_V}", t.strip()))), None)  # não o "TOTAL A PAGAR"
    venc = _achar(rf"VENCIMENTO\s+{_D}", um)
    if not (ref and total and venc):
        raise Falha("Neoenergia: não achei o mês, o vencimento ou o total.")
    out: dict[str, Any] = {"total": num(total), "vence": _iso(venc)}
    out["ref"], out["referencia"] = _ref(ref.group(1), ref.group(2))
    lei = re.search(rf"LEITURA ANTERIOR\s+{_D}\s+LEITURA ATUAL\s+{_D}\s+N.\s*DE DIAS\s+(\d+)\s+PR[ÓO]XIMA LEITURA\s+{_D}", um, re.I)
    if lei:
        out["leitura"] = {"anterior": _iso(lei.group(1)), "atual": _iso(lei.group(2))}
        out["dias"], out["proxima_leitura"] = int(lei.group(3)), _iso(lei.group(4))
    out["consumo_kwh"] = _kwh(_achar(r"Energia Ativa\s+\S+\s+[\d.]+,\d+\s+[\d.]+,\d+\s+[\d,]+\s+([\d.]+,\d+)", um)
                             or _achar(r"\bConsumo\s+kWh\s+([\d.]+,\d+)", um))
    out["bandeira"] = (_achar(r"bandeira em vigor [ée] a\s+(Verde|Amarela|Vermelha(?:\s+P[12])?)", um) or "").title() or None
    return out


# (leitor, nome da distribuidora, versão): o nome vem do cabeçalho; outra empresa do mesmo grupo cai no leitor do grupo
def _distribuidora(um: str) -> tuple[Any, str, str]:
    u = norm_txt(um)
    if "EQUATORIAL GOIAS" in u:
        return _equatorial_go, "Equatorial Goiás", "equatorial-go-1"
    if "EQUATORIAL" in u:
        raise Falha("Conta da Equatorial de outro estado: por enquanto só a Equatorial Goiás.")
    if "PIRATININGA" in u or "CPFL" in u:
        return _cpfl, "CPFL Piratininga" if "PIRATININGA" in u else "CPFL", "cpfl-1"
    if "NEOENERGIA" in u:
        m = re.search(r"NEOENERGIA DISTRIBUI[ÇC][ÃA]O ([^\W\d_]+)", um, re.I)  # "Neoenergia Brasília", com acento
        return _neoenergia, f"Neoenergia {m.group(1).title()}" if m else "Neoenergia", "neoenergia-1"
    raise Falha("Não reconheci a distribuidora. Por enquanto: Equatorial Goiás, CPFL e Neoenergia.")


def ler_luz(L: list[list[Any]]) -> dict[str, Any]:
    """Linhas do PDF [página, x, y, texto] → a conta (só campos técnicos). Confere o mínimo antes de devolver."""
    um = re.sub(r"\s+", " ", " ".join(str(x[3]) for x in L))
    leitor, nome, versao = _distribuidora(um)
    c = leitor(L, um)
    if not c.get("ref") or not c.get("vence") or not c.get("total"):
        raise Falha(f"{nome}: não consegui ler o mês, o vencimento ou o total desta conta.")
    nf = _achar(r"NOTA FISCAL N[º°oO]\s*(\d+)", um)  # número da nota (da distribuidora): reconhece a mesma conta lida de novo
    c.update({"distribuidora": nome, "leitor": versao, "nf": nf.lstrip("0") if nf else None,
              "emissao": _iso(_achar(rf"DATA DE EMISS[ÃA]O:\s*{_D}", um))})
    return {k: v for k, v in c.items() if v is not None}


def _arquivo(nome: Any) -> str | None:
    """Só o nome do arquivo, sem números compridos (costumam ser o número da instalação)."""
    s = re.sub(r"[\\/]+", "/", str(nome or "")).split("/")[-1][:120]
    return re.sub(r"\d{6,}", "…", s) or None


def contas_luz_pdf(db: dict[str, Any], luz: dict[str, Any], pago) -> list[dict[str, Any]]:
    """As contas de luz lidas dos PDFs no formato de A pagar (id luz:AAAA-MM, o mesmo do painel de energia)."""
    out = []
    for c in db.get("contas_luz") or []:
        if c["vence"] < db.get("marco", MARCO_ZERO):
            continue
        cid = f"luz:{c['ref']}"
        out.append({"id": cid, "tipo": "conta", "fonte": "luz_pdf", "fonte_txt": "digitada" if c.get("digitada") else c.get("distribuidora") or "conta em PDF", "nome": luz["nome"],
                    "icone": luz.get("icone") or "⚡", "vence": c["vence"], "total": c["total"], "referencia": c["referencia"],
                    "categoria": luz.get("categoria") or "Casa", "subcategoria": luz.get("subcategoria") or "Contas fixas", "quem": luz.get("quem"),
                    "pago": pago(db, cid, c["vence"]), "luz": {k: c.get(k) for k in ("consumo_kwh", "dias", "bandeira", "solar", "distribuidora", "digitada")}})
    return out


def luz(_: dict[str, Any]) -> dict[str, Any]:
    """Tela da luz (contas em PDF): mais nova primeiro, com R$/kWh e alerta de consumo alto (como a água)."""
    from .contas import _pago
    from .dados import file_lock, load_db
    with file_lock():
        db = load_db()
    lst = sorted(db.get("contas_luz") or [], key=lambda c: c["ref"])
    out = []
    for i, c in enumerate(lst):
        kwh = c.get("consumo_kwh")
        antes = [x["consumo_kwh"] for x in lst[max(0, i - 6):i] if x.get("consumo_kwh") is not None]
        media = round(sum(antes) / len(antes), 1) if antes else None
        alto = bool(kwh is not None and media and len(antes) >= 3 and kwh >= media * 1.3)
        out.append({**c, "id": f"luz:{c['ref']}", "media_6m": media, "alto": alto, "por_kwh": round(c["total"] / kwh, 2) if kwh else None,
                    "pago": _pago(db, f"luz:{c['ref']}", c["vence"])})
    out.reverse()
    cfg = (db.get("contas_casa") or {}).get("luz") or {}
    return {"ok": True, "status": "luz", "nome": cfg.get("nome") or "Luz", "contas": out, "arquivos": sorted({c.get("arquivo") for c in lst if c.get("arquivo")})}


def luz_ler(p: dict[str, Any]) -> dict[str, Any]:
    """Uma conta lida pelo card: {arquivo, conteudo (base64 do JSON [[página, x, y, texto], ...])}.
    Mesmo mês com a mesma nota: não muda nada. Nota nova do mesmo mês (2ª via/refaturamento): substitui."""
    from .dados import file_lock, load_db, save_db
    arquivo = _arquivo(p.get("arquivo"))
    try:
        L = json.loads(base64.b64decode(re.sub(r"\s", "", str(p.get("conteudo") or ""))).decode("utf-8"))
        assert isinstance(L, list) and L and all(isinstance(x, list) and len(x) == 4 for x in L)
    except Exception as e:
        raise Falha(f"{arquivo or 'Arquivo'}: não consegui abrir.") from e
    c = ler_luz(L)
    c["arquivo"], c["lido_em"] = arquivo, now_iso()
    with file_lock():
        db = load_db()
        lst = db.setdefault("contas_luz", [])
        outra = next((x["distribuidora"] for x in lst if x.get("leitor") and x.get("distribuidora") != c["distribuidora"]), None)
        if outra:  # uma luz por casa: conta de outra distribuidora é engano (ou mudança: tire as antigas antes)
            raise Falha(f"Esta conta é da {c['distribuidora']}; as lidas até agora são da {outra}. Confira se é a conta certa.")
        velha = next((x for x in lst if x["ref"] == c["ref"]), None)
        if velha and velha.get("nf") == c.get("nf") and velha.get("total") == c["total"]:
            return {"ok": True, "status": "ja", "ref": c["ref"], "mensagem": f"Luz {c['referencia']}: já estava lida."}
        if velha:
            lst.remove(velha)
        lst.append(c)
        lst.sort(key=lambda x: x["ref"])
        save_db(db)
    kwh = c.get("consumo_kwh")
    return {"ok": True, "status": "atualizada" if velha else "nova", "ref": c["ref"],
            "mensagem": (f"Luz {c['referencia']} ({c['distribuidora']}): {fmt_brl(c['total'])}, vence {c['vence'][8:10]}/{c['vence'][5:7]}"
                         f"{f' · {kwh:g} kWh' if kwh is not None else ''}{' (substituiu a anterior)' if velha else ''}.")}


def luz_apagar(p: dict[str, Any]) -> dict[str, Any]:
    """Tira uma conta lida ({ref: "2026-09"}); a marca de pago dela fica guardada."""
    from .dados import file_lock, load_db, save_db
    ref = str(p.get("ref") or "")
    with file_lock():
        db = load_db()
        lst = db.get("contas_luz") or []
        c = next((x for x in lst if x["ref"] == ref), None)
        if not c:
            raise Falha("Conta de luz não encontrada.")
        lst.remove(c)
        save_db(db)
    return {"ok": True, "status": "luz", "mensagem": f"Luz {c['referencia']} tirada."}
