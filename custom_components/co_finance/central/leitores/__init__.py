"""Leitores de e-mail de pedido das lojas online. Cada leitor é a única parte que sabe de uma loja: reconhece o e-mail
(remetente e assunto) e transforma o texto no pedido em formato comum (central/pedidos.py faz o resto, igual para todas).

Um leitor é um módulo com:
  LOJA         nome da loja ("Shopee")
  REMETENTES   endereços que mandam os e-mails do pedido (públicos, iguais para todo mundo)
  NA_FATURA    expressão do começo da linha na fatura do cartão ("SHOPEE *")
  reconhece(remetente, assunto, texto) -> bool
  ler(texto, quando) -> {"evento": "realizado" | "cancelado", ...}  (formato em pedidos.py)

Para uma loja nova (Mercado Livre, Amazon…): um arquivo novo aqui e uma linha em LEITORES."""
from __future__ import annotations

import html
import re
from typing import Any

from . import amazon, mercadolivre, shopee, tiktok

LEITORES = [shopee, amazon, tiktok, mercadolivre]


def assuntos() -> list[str]:
    """Os assuntos dos e-mails de pedido (o encaminhado à mão chega com o remetente de quem encaminhou: vale o assunto)."""
    return [a for m in LEITORES for a in getattr(m, "ASSUNTOS", [])]


def remetentes() -> list[str]:
    """Todos os remetentes conhecidos (a entrada por e-mail só olha esses)."""
    return [r for m in LEITORES for r in m.REMETENTES]


def leitor_de(remetente: str, assunto: str, texto: str) -> Any:
    return next((m for m in LEITORES if m.reconhece(remetente or "", assunto or "", texto or "")), None)


def leitor_da_loja(loja: str) -> Any:
    return next((m for m in LEITORES if m.LOJA == loja), None)


def emails_do_arquivo(dados: bytes) -> list[dict[str, Any]]:
    """Arquivo do Google Takeout (.zip com .mbox dentro, ou o .mbox) → [{remetente, assunto, quando, html, texto}], em ordem
    de data. Só o que o leitor precisa: os anexos não são abertos."""
    import io
    import mailbox
    import os
    import tempfile
    import zipfile
    from email.header import decode_header, make_header
    from email.utils import parsedate_to_datetime

    if dados[:2] == b"PK":
        with zipfile.ZipFile(io.BytesIO(dados)) as z:
            nomes = [n for n in z.namelist() if n.lower().endswith(".mbox")]
            dados = b"".join(z.read(n) for n in nomes)
    if not dados.startswith(b"From "):
        return []

    def cab(m: Any, k: str) -> str:
        try:
            return str(make_header(decode_header(m.get(k) or "")))
        except Exception:
            return str(m.get(k) or "")

    fd, tmp = tempfile.mkstemp(suffix=".mbox")
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(dados)
        out = []
        for m in mailbox.mbox(tmp):
            html = txt = None
            for p in m.walk():
                if p.get_content_maintype() == "multipart" or p.get_filename():
                    continue
                try:
                    s = p.get_payload(decode=True).decode(p.get_content_charset() or "utf-8", "replace")
                except Exception:
                    continue
                if p.get_content_type() == "text/html" and html is None:
                    html = s
                elif p.get_content_type() == "text/plain" and txt is None:
                    txt = s
            try:
                quando = parsedate_to_datetime(m.get("Date")).isoformat()
            except Exception:
                quando = None
            out.append({"remetente": cab(m, "From"), "assunto": cab(m, "Subject"), "quando": quando, "html": html or "", "texto": "" if html else (txt or "")})
    finally:
        os.remove(tmp)
    return sorted(out, key=lambda e: e["quando"] or "")


def texto_do_html(h: str) -> str:
    """Corpo do e-mail em HTML → texto, uma célula/linha por linha (o leitor trabalha com texto)."""
    h = re.sub(r"(?is)<(script|style|head)\b.*?</\1>", " ", h or "")
    h = re.sub(r"(?i)<br\s*/?>|</(p|div|tr|td|th|li|h\d|table)>", "\n", h)
    t = html.unescape(re.sub(r"<[^>]+>", " ", h))
    return "\n".join(ln for ln in (re.sub(r"[ \t ​]+", " ", x).strip() for x in t.splitlines()) if ln)
