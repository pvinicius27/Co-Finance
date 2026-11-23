"""Exportar e importar os dados (backup e mudança de Home Assistant).

O .zip leva dados/compras.json (compras, cartões, pessoas, configurações) e notas/ (a cópia de cada nota). Não leva
dados/backups (cópias diárias) nem pedaços de nota ainda chegando. Importar troca o compras.json pelo do arquivo e junta
as notas (as do arquivo entram; as que já estavam ficam); antes, o que havia é guardado inteiro em
dados/backups/antes-de-importar-AAAAMMDD-HHMMSS.zip.

Quem chama (a integração) entrega e recebe bytes; aqui não há nada do Home Assistant."""
from __future__ import annotations

import io
import json
import os
import tempfile
import zipfile
from datetime import datetime
from pathlib import Path, PurePosixPath
from typing import Any

from .base import Falha
from .config import BACKUP_DIR, DATA_DIR, DB_PATH, NOTAS_DIR
from .dados import file_lock

FORMATO = "co_finance/1"
LIMITE = 1024 ** 3  # 1 GB descompactado: acima disso não é um backup do CoFinance


def _zip(destino: Any) -> int:
    """Escreve o .zip em destino (arquivo ou BytesIO). Devolve quantas notas foram."""
    n = 0
    with zipfile.ZipFile(destino, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("co_finance.json", json.dumps({"formato": FORMATO, "exportado_em": datetime.now().isoformat(timespec="seconds")}))
        if DB_PATH.exists():
            z.write(DB_PATH, "dados/compras.json")
        if NOTAS_DIR.is_dir():
            for p in sorted(NOTAS_DIR.rglob("*")):
                if p.is_file():
                    z.write(p, "notas/" + p.relative_to(NOTAS_DIR).as_posix())
                    n += 1
    return n


def exportar() -> tuple[str, bytes]:
    """(nome do arquivo, conteúdo do .zip)."""
    buf = io.BytesIO()
    with file_lock():
        _zip(buf)
    return f"cofinance-{datetime.now():%Y-%m-%d}.zip", buf.getvalue()


def _caminho_seguro(nome: str) -> PurePosixPath | None:
    p = PurePosixPath(nome)
    if p.is_absolute() or ".." in p.parts or "\\" in nome or not p.parts:
        return None
    return p


def importar(conteudo: bytes) -> dict[str, Any]:
    try:
        z = zipfile.ZipFile(io.BytesIO(conteudo))
    except zipfile.BadZipFile:
        raise Falha("Esse arquivo não é um .zip.") from None
    with z:
        nomes = [i for i in z.infolist() if not i.is_dir()]
        if sum(i.file_size for i in nomes) > LIMITE:
            raise Falha("O arquivo é grande demais para ser um backup do CoFinance.")
        if "dados/compras.json" not in {i.filename for i in nomes}:
            raise Falha("Esse .zip não é um backup do CoFinance (falta dados/compras.json). Use o arquivo do botão Exportar.")
        try:
            db = json.loads(z.read("dados/compras.json").decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            raise Falha("O compras.json do arquivo está corrompido; nada foi alterado.") from None
        if not isinstance(db, dict) or not isinstance(db.get("compras"), list):
            raise Falha("O compras.json do arquivo não tem compras; nada foi alterado.")
        notas = []
        for i in nomes:
            p = _caminho_seguro(i.filename)
            if p and len(p.parts) >= 2 and p.parts[0] == "notas":
                notas.append((i, Path(*p.parts[1:])))

        with file_lock():
            BACKUP_DIR.mkdir(parents=True, exist_ok=True)
            guarda = BACKUP_DIR / f"antes-de-importar-{datetime.now():%Y%m%d-%H%M%S}.zip"
            if DB_PATH.exists() or NOTAS_DIR.is_dir():
                with guarda.open("wb") as f:
                    _zip(f)
            for i, rel in notas:
                alvo = NOTAS_DIR / rel
                alvo.parent.mkdir(parents=True, exist_ok=True)
                alvo.write_bytes(z.read(i))
            DATA_DIR.mkdir(parents=True, exist_ok=True)
            fd, tmp = tempfile.mkstemp(dir=DATA_DIR, prefix=".compras.", suffix=".tmp")
            with os.fdopen(fd, "wb") as f:
                f.write(z.read("dados/compras.json"))
            os.replace(tmp, DB_PATH)

    cod = str((db.get("atalho") or {}).get("codigo") or "")
    antes = f" O que havia antes ficou em dados/backups/{guarda.name}." if guarda.exists() else ""
    return {"ok": True, "status": "importado", "compras": len(db["compras"]), "notas": len(notas), "codigo": cod,
            "mensagem": f"Importado: {len(db['compras'])} compras e {len(notas)} notas.{antes}"}
