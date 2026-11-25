"""Cópia fiel da nota (HTML/XML/PDF) e anexos das compras lançadas à mão."""
from __future__ import annotations

import html
import os
import re
import tempfile
from datetime import datetime
from typing import Any

from .config import NOTAS_DIR
from .base import js_string


COPIA_CSS = """body{font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#111;background:#fff;margin:0 auto;max-width:860px;padding:12px}
.topo{border:1px solid #999;background:#f4f4f4;padding:8px 10px;font-size:12px;margin-bottom:14px}
.danfe{max-width:520px;margin:0 auto 18px;border:1px dashed #999;padding:10px}
.danfe h1{font-size:13px;text-align:center;margin:0 0 8px}.danfe h1 p{margin:2px 0}
.txtCenter{text-align:center}.txtTopo{font-weight:bold;font-size:15px}.text{font-size:12px}
#tabResult{width:100%;border-collapse:collapse;margin:10px 0}#tabResult td{border-top:1px dotted #bbb;padding:4px 2px;vertical-align:top}
.txtTit{font-weight:bold}td.noWrap{white-space:nowrap;font-weight:normal;font-size:11px;padding-left:8px}.RCod,.Rqtd,.RUN,.RvlUnit{font-size:11px;margin-right:8px;color:#333}.valor{font-weight:bold}
#totalNota>div{display:flex;justify-content:space-between;padding:2px 0}.linhaShade{background:#eee}.txtMax{font-weight:bold}
#infos h4{margin:12px 0 4px;font-size:13px;border-bottom:1px solid #ccc}#infos ul{list-style:none;padding:0;margin:0}.chave{font-family:monospace;font-size:13px}
.det h2{font-size:15px;border-bottom:2px solid #333;padding-bottom:4px}.det ul#botoes_nft,.det .botoes{display:none}
.det .nft{display:block!important;margin-bottom:10px}.det fieldset{border:1px solid #bbb;margin:8px 0;padding:6px 8px}
.det legend{font-weight:bold;padding:0 4px}.det table{width:100%;border-collapse:collapse}.det td{vertical-align:top;padding:3px 4px}
.det label{display:block;font-size:10px;color:#555;text-transform:uppercase}.det span{font-size:12px}
.det .toggable,.det .toggle{display:table!important}
.df .row{display:flex;flex-wrap:wrap;gap:4px 14px}.df .col{flex:1;min-width:140px}.df .sub-titulo{font-size:10px;color:#555;text-transform:uppercase}
.df .campo-xml{font-size:12px;margin-bottom:6px}.df .card-header{font-weight:bold;margin:12px 0 6px;border-bottom:1px solid #bbb}.df .card-body{margin-top:0!important}.df .header-title{display:none}.df .collapse,.df .fade{display:block!important;opacity:1!important}.df .navbar,.df .d-print-none{display:none}
.tab{width:100%;border-collapse:collapse}.tab td,.tab th{border-bottom:1px solid #ddd;padding:4px;text-align:left;vertical-align:top}
@media print{.topo{background:none}.det{page-break-before:always}}"""


def _sem_codigo(h: str) -> str:
    """Tira scripts, estilos externos, imagens e eventos: a cópia é só texto da nota."""
    h = re.sub(r"(?is)<script\b.*?</script>|<link\b[^>]*>|<img\b[^>]*>|<meta\b[^>]*>|<title>.*?</title>", "", h or "")
    h = re.sub(r"(?is)<style\b.*?</style>", "", h)
    return re.sub(r'(?i)\s+on\w+\s*=\s*("[^"]*"|\'[^\']*\'|[^\s>]+)', "", h)


def detalhada_conteudo(det: str) -> str:
    """O HTML da versão detalhada vem dentro de uma string JavaScript ('<html>...') na página."""
    m = re.search(r"'(<html>(?:[^'\\]|\\.)*)'", det or "", re.S)
    if not m:
        return ""
    h = js_string(m[1])
    return _sem_codigo(re.sub(r"(?is)</?(html|head|body)\b[^>]*>", "", h))


def salvar_copia(chave: str, danfe: str, det: str, origem: str) -> bool:
    """Grava compras/notas/<chave>.html: a nota como a SEFAZ mostra (inclusive consumidor), sem código.
    Não lê nem extrai nada do consumidor."""
    corpo_det = detalhada_conteudo(det)
    if not danfe and not corpo_det:
        return False
    corpo = ((f'<section class="danfe">{_sem_codigo(danfe)}</section>' if danfe else "")
             + (f'<section class="det"><h2>Versão detalhada</h2>{corpo_det}</section>' if corpo_det else ""))
    return gravar_copia(chave, corpo, f"a partir da SEFAZ-GO ({origem})", "www.sefaz.go.gov.br/nfce/consulta")


def gravar_copia(chave: str, corpo: str, de_onde: str, consulta: str, extensao: str = "html", bruto: str | None = None) -> bool:
    """Grava compras/notas/<chave>.html (e, se vier, o arquivo original, ex.: o XML)."""
    ch = " ".join(chave[i:i + 4] for i in range(0, 44, 4))
    modelo = "NFS-e" if chave.startswith("NFSE") else "NF-e" if chave[20:22] == "55" else "NFC-e"
    doc = (f'<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">'
           f'<meta name="viewport" content="width=device-width,initial-scale=1">'
           f"<title>{modelo} {ch}</title><style>{COPIA_CSS}</style></head><body>"
           f'<div class="topo"><b>Cópia da {modelo}</b> salva em {datetime.now():%d/%m/%Y %H:%M} {html.escape(de_onde)}.<br>'
           f'Chave de acesso: <span class="chave">{ch}</span> — confira em {html.escape(consulta)}.</div>'
           + corpo + "</body></html>")
    NOTAS_DIR.mkdir(parents=True, exist_ok=True)
    for nome, conteudo in ((f"{chave}.html", doc), (f"{chave}.{extensao}", bruto) if bruto else (None, None)):
        if not nome:
            continue
        fd, tmp = tempfile.mkstemp(dir=NOTAS_DIR, prefix=".nota.", suffix=".tmp")
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(conteudo)
        os.replace(tmp, NOTAS_DIR / nome)
    return True


ANEXO_TIPOS = {"jpg": "image/jpeg", "png": "image/png", "pdf": "application/pdf"}
EXCLUIDAS_MAX = 10  # ⚙ › Excluídas recentemente: as 10 últimas; a mais antiga é apagada de vez


def apagar_de_vez(db: dict[str, Any], c: dict[str, Any]) -> None:
    """Some com a compra excluída: tira das excluídas, apaga as cópias da nota e os anexos (a cópia fica se outra compra
    usa a mesma nota) e os registros do Apple Pay e do sino que apontavam para ela."""
    if c in (db.get("excluidas") or []):
        db["excluidas"].remove(c)
    outras = [x for x in (db.get("compras") or []) + (db.get("excluidas") or []) if x is not c]
    usadas = {x.get("chave") for x in outras if x.get("chave")} | {x["id"] for x in outras}
    nomes = [f"{c['id']}.anexo."] + ([f"{c['chave']}."] if c.get("chave") and c["chave"] not in usadas else [])
    if NOTAS_DIR.exists():
        for f in NOTAS_DIR.iterdir():
            if f.is_file() and any(f.name.startswith(n) for n in nomes):
                f.unlink(missing_ok=True)
    db["applepay"] = [x for x in db.get("applepay") or [] if x.get("compra") != c["id"]]
    db["mudancas"] = [x for x in db.get("mudancas") or [] if x.get("compra") != c["id"]]


def guardar_excluida(db: dict[str, Any], c: dict[str, Any]) -> None:
    """A compra vai para as excluídas (dá para recuperar); passando de 10, a mais antiga é apagada de vez."""
    db.setdefault("excluidas", []).append(c)
    while len(db["excluidas"]) > EXCLUIDAS_MAX:
        apagar_de_vez(db, db["excluidas"][0])


def anexo_de(c: dict[str, Any]) -> Path | None:
    """Foto/PDF do cupom anexado a uma compra lançada à mão (recibo de fora, loja sem nota…)."""
    if c.get("origem") != "manual":
        return None
    return next((f for x in ANEXO_TIPOS if (f := NOTAS_DIR / f"{c['id']}.anexo.{x}").exists()), None)


def tem_copia(c: dict[str, Any]) -> bool:
    if anexo_de(c):
        return True
    return bool(c.get("chave")) and any((NOTAS_DIR / f"{c['chave']}.{x}").exists() for x in ("html", "pdf"))
