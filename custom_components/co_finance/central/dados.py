"""Arquivo de dados (compras.json): trava, leitura com migrações, backup diário e gravação."""
from __future__ import annotations

import json
import os
import shutil
import tempfile
from contextlib import contextmanager
from datetime import date
from datetime import datetime
from datetime import timedelta
from typing import Any

from .config import (
    ARVORE_INICIAL,
    BACKUPS_KEEP,
    BACKUP_DIR,
    BENS_INICIAIS,
    CARTOES_INICIAIS,
    DATA_DIR,
    DB_PATH,
    LOCK_PATH,
    LOJA_V2_INICIAL,
)
from .base import _APELIDOS, norm_txt, now_iso


try:
    import fcntl  # Linux (HA)
except ImportError:  # teste no Windows
    fcntl = None


@contextmanager
def file_lock():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with LOCK_PATH.open("w", encoding="utf-8") as handle:
        if fcntl:
            fcntl.flock(handle, fcntl.LOCK_EX)
        try:
            yield
        finally:
            if fcntl:
                fcntl.flock(handle, fcntl.LOCK_UN)


def fresh_db() -> dict[str, Any]:
    return {"versao": 2, "atualizado_em": None, "compradores": [],
            "arvore": json.loads(json.dumps(ARVORE_INICIAL)), "categorias": [a["nome"] for a in ARVORE_INICIAL],
            "categoria_loja": {k: list(v) for k, v in LOJA_V2_INICIAL.items()}, "apelidos": {}, "bens": [dict(b) for b in BENS_INICIAIS],
            "cartoes": json.loads(json.dumps(CARTOES_INICIAIS)), "marco": date.today().replace(day=1).isoformat(), "pago_ate": (date.today() - timedelta(days=1)).isoformat(),  # casa nova: controle desde a instalação
            "pagos": {}, "compras": []}


_CARTOES: dict[str, dict[str, Any]] = {}  # cartões cadastrados, para o "Pago com" mostrar "Crédito Bradesco"


def load_db() -> dict[str, Any]:
    if not DB_PATH.exists():
        db = fresh_db()
    else:
        with DB_PATH.open(encoding="utf-8") as f:
            db = json.load(f)
        if (db.get("versao") or 1) < 2:
            _migracoes().migrar_v2(db)  # categorias em dois níveis (guarda o arquivo antigo antes)
        if (db.get("versao") or 1) < 3:
            _migracoes().migrar_v3(db)  # cartões e faturas
        if (db.get("versao") or 1) < 4:
            _migracoes().migrar_v4(db)  # subcategorias de Bebê
        if (db.get("versao") or 1) < 5:
            _migracoes().migrar_v5(db)  # Casa › Elétrica e iluminação
        if (db.get("versao") or 1) < 6:
            _migracoes().migrar_v6(db)  # Veículos: sem chassi e sem placa inteira
        for k, v in fresh_db().items():
            db.setdefault(k, v)
    db["categorias"] = [a["nome"] for a in db["arvore"]]
    _APELIDOS.clear()
    _APELIDOS.update(db.get("apelidos") or {})
    _CARTOES.clear()
    _CARTOES.update({k["id"]: k for k in db.get("cartoes") or []})
    _pessoas_de(db)
    return db


PALETA_PESSOAS = ["#3b82f6", "#d9467a", "#0f9f8f", "#f59e0b", "#8b5cf6", "#ef4444", "#64748b"]
_PESSOAS: list[dict[str, Any]] = []  # cadastro de pessoas do banco: {nome, cor, apelidos, reembolso, artigo}


def _pessoas_de(db: dict[str, Any]) -> None:
    """Banco antigo só tinha os nomes ("compradores"): cada um ganha uma cor da paleta e o próprio nome como apelido."""
    if "pessoas" not in db:
        db["pessoas"] = [{"nome": n, "cor": PALETA_PESSOAS[i % len(PALETA_PESSOAS)], "apelidos": [norm_txt(n)], "reembolso": False, "artigo": ""}
                         for i, n in enumerate(db.get("compradores") or [])]
    db["compradores"] = [x["nome"] for x in db["pessoas"]]
    _PESSOAS[:] = db["pessoas"]


def pessoas() -> list[dict[str, Any]]:
    if not _PESSOAS:
        load_db_ro()
    return _PESSOAS


def compradores() -> list[str]:
    return [x["nome"] for x in pessoas()]


def apelidos_de(x: dict[str, Any]) -> set[str]:
    """Como a pessoa pode vir escrita no Atalho do iPhone (1ª palavra, sem acento, maiúsculas): o nome e os apelidos."""
    return {norm_txt(x["nome"]).split(" ")[0], *(norm_txt(a) for a in x.get("apelidos") or [])} - {""}


def vale_de(quem: str | None) -> dict[str, Any] | None:
    """Cartão de vale (Alelo, VR…) de quem comprou: o dele (titular ou quem usa); senão, o único vale da casa."""
    vs = [k for k in _CARTOES.values() if k.get("vale")]
    return (next((k for k in vs if k.get("dono") == quem), None) or next((k for k in vs if quem in (k.get("usam") or [])), None)
            or (vs[0] if len(vs) == 1 else None))


def backup_today() -> None:
    if not DB_PATH.exists():
        return
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    dest = BACKUP_DIR / f"compras.{datetime.now():%Y%m%d}.json"
    if not dest.exists():
        shutil.copy2(DB_PATH, dest)
    old = sorted(BACKUP_DIR.glob("compras.*.json"))
    for p in old[:-BACKUPS_KEEP]:
        p.unlink(missing_ok=True)


def save_db(db: dict[str, Any]) -> None:
    backup_today()
    db["atualizado_em"] = now_iso()
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=DATA_DIR, prefix=".compras.", suffix=".tmp")
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump(db, f, ensure_ascii=False, indent=1)
    os.replace(tmp, DB_PATH)


def load_db_ro() -> dict[str, Any]:
    with file_lock():
        return load_db()


def _migracoes():
    from . import migracoes
    return migracoes
