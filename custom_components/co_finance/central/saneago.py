"""Leitor da conta de água da Saneago a partir do texto do PDF.
Dois modelos: o "espelho da fatura" (até jun/2026) e a nota fiscal de água NFAg (desde jul/2026, com chave de acesso).
Não guarda nome, CPF, endereço nem matrícula: só a conta (valores, leituras, consumo, serviços e aviso)."""
from __future__ import annotations

import re
from datetime import date
from typing import Any

from .base import Falha, num

MESES_ABREV = {"JAN": 1, "FEV": 2, "MAR": 3, "ABR": 4, "MAI": 5, "JUN": 6, "JUL": 7, "AGO": 8, "SET": 9, "OUT": 10, "NOV": 11, "DEZ": 12}
_DATA = r"\d{2}/\d{2}/\d{4}"


def _iso(d: str | None) -> str | None:
    m = re.fullmatch(r"(\d{2})/(\d{2})/(\d{4})", (d or "").strip())
    return f"{m[3]}-{m[2]}-{m[1]}" if m else None


def _dias(de: str | None, ate: str | None) -> int | None:
    try:
        return (date.fromisoformat(ate) - date.fromisoformat(de)).days
    except (TypeError, ValueError):
        return None


def _servicos(bloco: str, colunas: int) -> list[dict[str, Any]]:
    """Linhas "DESCRIÇÃO / valor" (o modelo novo traz mais 3 colunas de IBS/CBS depois de cada valor)."""
    linhas = [x.strip() for x in bloco.split("\n") if x.strip()]
    out, i = [], 0
    while i < len(linhas):
        if re.search(r"[A-Z]{3}", linhas[i]) and i + 1 < len(linhas) and re.fullmatch(r"-?[\d.]*\d,\d{2}", linhas[i + 1]):
            out.append({"descricao": linhas[i], "valor": num(linhas[i + 1])})
            i += 1 + colunas
        else:
            i += 1
    return out


def e_saneago(t: str) -> bool:
    return bool(re.search(r"01\.616\.929/0001-02", t or "")) and bool(re.search(r"(?i)saneamento de goi", t or ""))


def ler_saneago(t: str) -> dict[str, Any]:
    """Campos da conta. Falha se não for conta da Saneago ou se faltar o essencial (mês, vencimento, valor)."""
    if not e_saneago(t):
        raise Falha("Esse PDF não parece uma conta de água da Saneago.")
    if "NOTA FISCAL DE ÁGUA E SANEAMENTO" in t or "Chave de acesso" in t:
        c = _novo(t)
    else:
        c = _espelho(t)
    if not (c.get("ref") and c.get("vence") and c.get("total") is not None):
        raise Falha("Abri a conta da Saneago, mas não achei o mês, o vencimento ou o valor. Me avise para eu ajustar a leitura.")
    l = c["leitura"]
    if l.get("atual") is not None and l.get("anterior") is not None and c["consumo"].get("medido") is None:
        c["consumo"]["medido"] = l["atual"] - l["anterior"]
    if l.get("dias") is None:
        l["dias"] = _dias(l.get("data_anterior"), l.get("data_atual"))
    soma = round(sum(s["valor"] for s in c["servicos"]), 2)
    c["conferencia"] = {"soma_servicos": soma, "bate": abs(soma - c["total"]) < 0.02}
    aviso = c.get("aviso") or ""
    c["reaviso"] = (re.search(r"CONSTA DEB(?:ITO)? REF\.?\s*(\d{2}/\d{4})", aviso) or [None, None])[1]
    return c


def _novo(t: str) -> dict[str, Any]:
    """NFAg (jul/2026 em diante): bloco do topo "matrícula / MM/AAAA / emissão / total / vencimento / nº fatura"."""
    topo = re.search(rf"\n\d{{6,8}}-\d\n(\d{{2}})/(\d{{4}})\n({_DATA})\n([\d.]*\d,\d{{2}})\n({_DATA})\n(\d{{8,12}})\n", t)
    if not topo:
        raise Falha("Não reconheci o topo da nota fiscal de água (mês, emissão, valor, vencimento).")
    aviso = (re.search(rf"\n\d{{8,12}}\n(.+?)\nSANEAGO S\.A\.", t[topo.start():], re.S) or [None, ""])[1]
    chave = re.sub(r"\D", "", (re.search(r"((?:\d{4} ){10}\d{4})\s*\nChave de acesso", t) or [None, ""])[1])
    nf = (re.search(r"NOTA FISCAL Nº\s*(\d+)", t) or [None, ""])[1]
    srv = re.search(r"\(R\$\)\n(?:[\d.]+%\n){3}(.*?)\nTOTAL:", t, re.S)
    lei = re.search(rf"PRÓXIMA LEITURA:\n(?:\d+\n)*?({_DATA})\n.*?CONSUMO\n(\d+)\n({_DATA})\n({_DATA})\n(\d+)\n(\d+) m³\n(\d+) m³\n(\d+) m³\n(\d+)\n", t, re.S)
    return {
        "modelo": "nfag", "ref": f"{topo[2]}-{topo[1]}", "referencia": f"{topo[1]}/{topo[2]}", "emissao": _iso(topo[3]),
        "total": num(topo[4]), "vence": _iso(topo[5]), "fatura": topo[6], "nf": nf.lstrip("0") or None, "chave": chave or None,
        "aviso": re.sub(r"\s+", " ", aviso).strip(),
        "servicos": _servicos(srv[1], 4) if srv else [],
        "leitura": ({"atual": int(lei[2]), "anterior": int(lei[5]), "data_atual": _iso(lei[3]), "data_anterior": _iso(lei[4]), "dias": int(lei[9])}
                    if lei else {}),
        "consumo": {"medido": int(lei[6]), "medio": int(lei[7]), "faturado": int(lei[8])} if lei else {},
        "proxima_leitura": _iso(lei[1]) if lei else None,
    }


def _espelho(t: str) -> dict[str, Any]:
    """Espelho da fatura (até jun/2026): "matrícula / nº fatura / emissão / MÊS/AAAA / vencimento / valor"."""
    topo = re.search(rf"\n\d{{6,8}}-\d\n(\d{{8,12}})\n({_DATA})\n([A-Z]{{3}})/(\d{{4}})\n({_DATA})\n([\d.]*\d,\d{{2}})\n", t)
    if not topo or topo[3] not in MESES_ABREV:
        raise Falha("Não reconheci o topo da conta de água (mês, emissão, valor, vencimento).")
    mes = MESES_ABREV[topo[3]]
    srv = re.search(r"Descrição dos serviços\nValor \(R\$\)\n(.*?)\n(?:Medido|Estimado|Média|Minimo|Mínimo)\b", t, re.S)
    # "Água Fria / hidrômetro / próxima leitura / faturado / médio / (outro) / leitura atual / anterior / data anterior / data atual"
    lei = re.search(rf"Água Fria\n[A-Z0-9]+\n({_DATA})\n(\d+)\n(\d+)\n\d+\n(\d+)\n(\d+)\n({_DATA})\n({_DATA})\n", t)
    aviso = (re.search(r"\n((?:REAVISO|AGRADECEMOS|AVISO)[^\n]*)", t) or [None, ""])[1]
    return {
        "modelo": "espelho", "ref": f"{topo[4]}-{mes:02d}", "referencia": f"{mes:02d}/{topo[4]}", "emissao": _iso(topo[2]),
        "total": num(topo[6]), "vence": _iso(topo[5]), "fatura": topo[1], "nf": None, "chave": None,
        "aviso": re.sub(r"\s+", " ", aviso).strip(),
        "servicos": _servicos(srv[1], 0) if srv else [],
        "leitura": ({"atual": int(lei[4]), "anterior": int(lei[5]), "data_atual": _iso(lei[7]), "data_anterior": _iso(lei[6]), "dias": None}
                    if lei else {}),
        "consumo": {"medido": None, "medio": int(lei[3]), "faturado": int(lei[2])} if lei else {},
        "proxima_leitura": _iso(lei[1]) if lei else None,
    }
