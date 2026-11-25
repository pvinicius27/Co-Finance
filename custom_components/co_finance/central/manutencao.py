"""Rotinas de manutenção (completar códigos, bandeiras, notas, reler NF-e)."""
from __future__ import annotations

import base64
import html
import re
from typing import Any

from .config import NOTAS_DIR
from .base import Falha, nome_loja, now_iso
from .dados import file_lock, load_db, save_db
from .pagamentos import nome_bandeira
from .nfce import aplicar_detalhada, aplicar_pagamentos, baixar_nota, ler_detalhada, ler_pagamentos_detalhada
from .copia import ANEXO_TIPOS, anexo_de, salvar_copia, tem_copia
from .nfe import ler_portal_nfe, ler_xml_nfe


def completar_codigos(p: dict[str, Any]) -> dict[str, Any]:
    """Compras já gravadas pelo QR Code: reabre a versão detalhada e põe código de barras/NCM nos itens."""
    with file_lock():
        db = load_db()
    alvo = [c for c in db["compras"] if c.get("link") and c.get("itens") and not c.get("detalhada_em")]
    feitos, eans = [], 0
    for c in alvo:
        try:
            _, det_html = baixar_nota(c["chave"], c["link"])
        except Falha:
            continue
        det = ler_detalhada(det_html)
        if not det:
            continue
        with file_lock():
            db = load_db()
            atual = next((x for x in db["compras"] if x["id"] == c["id"]), None)
            if not atual:
                continue
            n = aplicar_detalhada(atual["itens"], det)
            atual["detalhada_em"] = now_iso()
            save_db(db)
        feitos.append(nome_loja(c["loja"]))
        eans += n
    return {"ok": True, "status": "completado", "compras": feitos, "eans": eans,
            "mensagem": f"{len(feitos)} compra(s) completadas, {eans} código(s) de barras novos."}


def completar_bandeiras(p: dict[str, Any]) -> dict[str, Any]:
    """Compras já gravadas pelo QR Code: reabre a versão detalhada (uma por vez, com pausa) só para
    pôr a bandeira do cartão nos pagamentos."""
    import time
    with file_lock():
        db = load_db()
        arrumou = 0
        for c in db["compras"]:  # bandeira já gravada com sujeira da página ("\n 06 - Elo\n") → "Elo"
            for pg in c.get("pagamentos") or []:
                if pg.get("bandeira") and nome_bandeira(pg["bandeira"]) != pg["bandeira"]:
                    pg["bandeira"] = nome_bandeira(pg["bandeira"])
                    arrumou += 1
        if arrumou:
            save_db(db)
    alvo = [c for c in db["compras"] if c.get("link") and c.get("pagamentos")
            and any("bandeira" not in pg for pg in c["pagamentos"])]
    feitos = 0
    for n, c in enumerate(alvo):
        if n:
            time.sleep(4)  # sem pressa com a SEFAZ
        try:
            _, det_html = baixar_nota(c["chave"], c["link"])
        except Falha:
            continue
        det = ler_pagamentos_detalhada(det_html)
        with file_lock():
            db = load_db()
            atual = next((x for x in db["compras"] if x["id"] == c["id"]), None)
            if not atual or not det:
                continue
            aplicar_pagamentos(atual["pagamentos"], det)
            for pg in atual["pagamentos"]:
                pg.setdefault("bandeira", None)  # consultada: não tenta de novo
            save_db(db)
        feitos += 1
    return {"ok": True, "status": "completado", "compras": feitos, "mensagem": f"{feitos} de {len(alvo)} compra(s) conferidas; {arrumou} bandeira(s) arrumadas."}


def nota(p: dict[str, Any]) -> dict[str, Any]:
    """Cópia fiel da nota para o card mostrar/imprimir (o card só oferece ao administrador)."""
    with file_lock():
        db = load_db()
    c = next((x for x in db["compras"] if x["id"] == p.get("id")), None)
    if not c or not tem_copia(c):
        return {"ok": False, "status": "erro", "mensagem": "Não há cópia salva da nota desta compra."}
    anexo = anexo_de(c)
    if anexo and anexo.suffix == ".pdf":
        return {"ok": True, "status": "ok", "pdf": base64.b64encode(anexo.read_bytes()).decode()}
    if anexo:  # foto: vai numa página simples (o card mostra e imprime igual às outras cópias)
        b64 = base64.b64encode(anexo.read_bytes()).decode()
        return {"ok": True, "status": "ok", "html": '<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#fff;text-align:center}'
                f'img{{max-width:100%;height:auto}}</style><img alt="Cupom" src="data:{ANEXO_TIPOS[anexo.suffix[1:]]};base64,{b64}">'}
    pdf = NOTAS_DIR / f"{c['chave']}.pdf"
    if pdf.exists():
        return {"ok": True, "status": "ok", "pdf": base64.b64encode(pdf.read_bytes()).decode()}
    return {"ok": True, "status": "ok", "html": (NOTAS_DIR / f"{c['chave']}.html").read_text(encoding="utf-8")}


def consulta(p: dict[str, Any]) -> dict[str, Any]:
    """Link do QR Code da nota (o mesmo do papel), para o card desenhar o QR e abrir na SEFAZ.
    Só sob pedido do card (administrador): o link abre a nota completa na SEFAZ."""
    with file_lock():
        db = load_db()
    c = next((x for x in db["compras"] if x["id"] == p.get("id")), None)
    link = None
    if c and tem_copia(c):
        m = re.search(r'https?://[^<"\s]*(?:danfeNFCe|nfce/qrcode)\?p=[^<"\s]+', (NOTAS_DIR / f"{c['chave']}.html").read_text(encoding="utf-8"))
        link = html.unescape(m[0]) if m else None
    link = link or (c or {}).get("link")
    if not link:
        return {"ok": False, "status": "erro", "mensagem": "Esta compra não tem QR Code para consulta."}
    return {"ok": True, "status": "ok", "link": link}


def completar_notas(p: dict[str, Any]) -> dict[str, Any]:
    """Compras já gravadas pelo QR Code e ainda sem cópia: baixa de novo da SEFAZ (uma por vez, com pausa)."""
    import time
    with file_lock():
        db = load_db()
    alvo = [c for c in db["compras"] if c.get("link") and not tem_copia(c)]
    feitas = 0
    for n, c in enumerate(alvo):
        if n:
            time.sleep(4)  # sem pressa com a SEFAZ
        try:
            danfe, det = baixar_nota(c["chave"], c["link"])
        except Falha:
            continue
        feitas += salvar_copia(c["chave"], danfe, det, "QR Code")
    return {"ok": True, "status": "completado", "mensagem": f"{feitas} de {len(alvo)} nota(s) salvas."}


def reler_nfe(p: dict[str, Any]) -> dict[str, Any]:
    """Notas comuns (portal/XML) já gravadas: lê de novo a cópia salva (sem consultar nada) e atualiza
    valores/itens, mantendo o que foi ajustado à mão (quem, categoria, reembolso, forma escolhida, cartão)."""
    with file_lock():
        db = load_db()
        n = 0
        for c in db["compras"]:
            if c.get("fonte") not in ("portal", "xml"):
                continue
            xml_f, html_f = NOTAS_DIR / f"{c['chave']}.xml", NOTAS_DIR / f"{c['chave']}.html"
            try:
                if xml_f.exists():
                    _, nota = ler_xml_nfe(xml_f.read_text(encoding="utf-8"))
                elif html_f.exists():
                    _, nota = ler_portal_nfe(html_f.read_text(encoding="utf-8"))
                else:
                    continue
            except Falha:
                continue
            escolhas = [pg.get("tipo") for pg in c.get("pagamentos") or []]
            c.update(nota)
            if len(escolhas) == len(c["pagamentos"]):
                for pg, t in zip(c["pagamentos"], escolhas):
                    if t:
                        pg["tipo"] = t
            n += 1
        if n:
            save_db(db)
    return {"ok": True, "status": "completado", "mensagem": f"{n} nota(s) relidas da cópia salva."}
