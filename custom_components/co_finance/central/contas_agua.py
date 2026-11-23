"""Conta de água (Saneago): o card lê os PDFs da pasta que vocês escolhem e manda só o texto; aqui fica
a conta (db["contas_agua"], uma por mês). Entra em Casa › Contas fixas e em A pagar como a luz. O PDF não é copiado."""
from __future__ import annotations

import base64
import re
from typing import Any

from .config import MARCO_ZERO
from .base import Falha, fmt_brl, now_iso
from .dados import file_lock, load_db, save_db
from .nfse import texto_pdf
from .saneago import ler_saneago

_MULTAS = re.compile(r"MULTA|ATUALIZACAO MONETARIA|JUROS")


def _extras(c: dict[str, Any]) -> float:
    """Multa e atualização monetária cobradas na conta (atraso de meses anteriores)."""
    return round(sum(s["valor"] for s in c.get("servicos") or [] if _MULTAS.search(s["descricao"])), 2)


def contas_agua(db: dict[str, Any], pago) -> list[dict[str, Any]]:
    """As contas de água no formato das contas de A pagar (id agua:AAAA-MM). `pago` = contas._pago. Sem cadastro da água: nada."""
    cfg = (db.get("contas_casa") or {}).get("agua")
    if not cfg:
        return []
    out = []
    for c in db.get("contas_agua") or []:
        if c["vence"] < db.get("marco", MARCO_ZERO):
            continue
        cid = f"agua:{c['ref']}"
        out.append({"id": cid, "tipo": "conta", "fonte": "agua", "fonte_txt": "digitada" if c.get("digitada") else "Saneago", "nome": cfg["nome"],
                    "icone": cfg.get("icone") or "💧", "vence": c["vence"], "total": c["total"], "referencia": c["referencia"],
                    "categoria": cfg.get("categoria") or "Casa", "subcategoria": cfg.get("subcategoria") or "Contas fixas", "quem": cfg.get("quem"),
                    "pago": pago(db, cid, c["vence"]),
                    "agua": {"m3": c["consumo"].get("faturado"), "medido": c["consumo"].get("medido"), "medio": c["consumo"].get("medio"),
                             "dias": c["leitura"].get("dias"), "extras": _extras(c), "reaviso": c.get("reaviso")}})
    return out


def agua(_: dict[str, Any]) -> dict[str, Any]:
    """Tela da água: as contas lidas (mais nova primeiro), com consumo, R$/m³, multas e alerta de consumo alto."""
    from .contas import _pago
    with file_lock():
        db = load_db()
    lst = sorted(db.get("contas_agua") or [], key=lambda c: c["ref"])
    out = []
    for i, c in enumerate(lst):
        m3 = c["consumo"].get("faturado")
        antes = [x["consumo"].get("faturado") for x in lst[max(0, i - 6):i] if x["consumo"].get("faturado") is not None]
        media = round(sum(antes) / len(antes), 1) if antes else None
        alto = bool(m3 is not None and media and len(antes) >= 3 and m3 >= max(media * 1.3, media + 2))
        out.append({"ref": c["ref"], "referencia": c["referencia"], "id": f"agua:{c['ref']}", "vence": c["vence"], "emissao": c.get("emissao"),
                    "total": c["total"], "m3": m3, "medido": c["consumo"].get("medido"), "medio_saneago": c["consumo"].get("medio"),
                    "media_6m": media, "alto": alto, "dias": c["leitura"].get("dias"), "leitura": c["leitura"],
                    "por_m3": round(c["total"] / m3, 2) if m3 else None, "extras": _extras(c), "servicos": c.get("servicos") or [],
                    "aviso": c.get("aviso") or "", "reaviso": c.get("reaviso"), "fatura": c.get("fatura"), "nf": c.get("nf"),
                    "chave": c.get("chave"), "modelo": c.get("modelo"), "arquivo": c.get("arquivo"), "conferencia": c.get("conferencia"),
                    "proxima_leitura": c.get("proxima_leitura"), "digitada": c.get("digitada"), "pago": _pago(db, f"agua:{c['ref']}", c["vence"])})
    out.reverse()
    return {"ok": True, "status": "agua", "nome": ((db.get("contas_casa") or {}).get("agua") or {}).get("nome") or "Água", "contas": out, "arquivos": sorted({c.get("arquivo") for c in lst if c.get("arquivo")})}


def agua_ler(p: dict[str, Any]) -> dict[str, Any]:
    """Uma conta lida pelo card: {arquivo, conteudo (base64 só com os blocos de texto do PDF, ou o PDF inteiro)}.
    Mesmo mês já lido com a mesma fatura: não muda nada. Fatura nova do mesmo mês (2ª via/refaturamento): substitui."""
    arquivo = re.sub(r"[\\/]+", "/", str(p.get("arquivo") or "")).split("/")[-1][:120]
    try:
        dados = base64.b64decode(re.sub(r"\s", "", str(p.get("conteudo") or "")))
    except Exception as e:
        raise Falha(f"{arquivo or 'Arquivo'}: não consegui abrir.") from e
    if not dados:
        raise Falha(f"{arquivo or 'Arquivo'}: veio vazio.")
    c = ler_saneago(texto_pdf(dados))
    c["arquivo"], c["lido_em"] = arquivo or None, now_iso()
    with file_lock():
        db = load_db()
        lst = db.setdefault("contas_agua", [])
        velha = next((x for x in lst if x["ref"] == c["ref"]), None)
        if velha and velha.get("fatura") == c["fatura"]:
            if arquivo and velha.get("arquivo") != arquivo:
                velha["arquivo"] = arquivo
                save_db(db)
            return {"ok": True, "status": "ja", "ref": c["ref"], "mensagem": f"Água {c['referencia']}: já estava lida."}
        if velha:
            lst.remove(velha)
        lst.append(c)
        lst.sort(key=lambda x: x["ref"])
        save_db(db)
    m3 = c["consumo"].get("faturado")
    msg = (f"Água {c['referencia']}: {fmt_brl(c['total'])}, vence {c['vence'][8:10]}/{c['vence'][5:7]}"
           f"{f' · {m3} m³' if m3 is not None else ''}{' (substituiu a anterior)' if velha else ''}.")
    if not c["conferencia"]["bate"]:
        msg += f" Atenção: a soma dos serviços ({fmt_brl(c['conferencia']['soma_servicos'])}) não bate com o total."
    return {"ok": True, "status": "atualizada" if velha else "nova", "ref": c["ref"], "mensagem": msg}
