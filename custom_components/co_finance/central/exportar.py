"""Exportar e importar os dados (backup e mudança de Home Assistant).

Exportar setup: um .zip só com a configuração (dados/setup.json, ver SETUP); importado, troca a configuração e deixa
as compras e o resto como estão.

O .zip completo leva dados/compras.json (compras, cartões, pessoas, configurações) e notas/ (a cópia de cada nota). Não leva
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


# Setup: só o que se cadastra à mão (pessoas, cartões, contas da casa, financiamento, áreas e regras, avisos, atalho,
# caixa dos pedidos). Fica de fora tudo o que é movimento: compras, faturas lidas, notas, pagos, sino, pedidos, Apple Pay.
SETUP = ("compradores", "pessoas", "cartoes", "contas_casa", "financiamentos", "bens", "categorias", "arvore",
         "categoria_loja", "categoria_loja_v1", "categoria_fatura", "apelidos", "vinculos", "tipo_produto", "avisos",
         "atalho", "pedidos_email", "marco")
FORMATO_SETUP = "co_finance_setup/1"


def _so_setup(db: dict[str, Any]) -> dict[str, Any]:
    s = {k: db[k] for k in SETUP if k in db}
    # financiamento: o contrato e a tabela do extrato vão; as parcelas marcadas como pagas, não
    s["financiamentos"] = [{k: v for k, v in f.items() if k != "pagos"} for f in s.get("financiamentos") or []]
    return s


def exportar_setup() -> tuple[str, bytes]:
    """(nome, .zip) só com a configuração: dados/setup.json."""
    with file_lock():
        db = json.loads(DB_PATH.read_text(encoding="utf-8")) if DB_PATH.exists() else {}
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("co_finance.json", json.dumps({"formato": FORMATO_SETUP, "exportado_em": datetime.now().isoformat(timespec="seconds")}))
        z.writestr("dados/setup.json", json.dumps(_so_setup(db), ensure_ascii=False, indent=1))
    return f"cofinance-setup-{datetime.now():%Y-%m-%d}.zip", buf.getvalue()


def _importar_setup(z: zipfile.ZipFile) -> dict[str, Any]:
    """Troca só a configuração pela do arquivo; compras, faturas, notas e o resto ficam como estão."""
    try:
        s = json.loads(z.read("dados/setup.json").decode("utf-8"))
        assert isinstance(s, dict)
    except Exception:
        raise Falha("O setup.json do arquivo está corrompido; nada foi alterado.") from None
    s = {k: v for k, v in s.items() if k in SETUP}
    with file_lock():
        BACKUP_DIR.mkdir(parents=True, exist_ok=True)
        guarda = BACKUP_DIR / f"antes-de-importar-setup-{datetime.now():%Y%m%d-%H%M%S}.zip"
        db = json.loads(DB_PATH.read_text(encoding="utf-8")) if DB_PATH.exists() else {"compras": []}
        if DB_PATH.exists():
            with guarda.open("wb") as f:
                _zip(f)
        # financiamento já cadastrado aqui: as parcelas pagas daqui continuam
        pagos = {f.get("id"): f["pagos"] for f in db.get("financiamentos") or [] if "pagos" in f}
        for f in s.get("financiamentos") or []:
            if f.get("id") in pagos:
                f["pagos"] = pagos[f["id"]]
        db.update(s)
        db.setdefault("compras", [])
        # cartão do arquivo que não existe aqui, com compras daqui apontando para um cartão que sumiu: avisa
        ids = {k.get("id") for k in db.get("cartoes") or []}
        orfas = sum(1 for c in db["compras"] if any(pg.get("cartao") and pg["cartao"] not in ids for pg in c.get("pagamentos") or []))
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        fd, tmp = tempfile.mkstemp(dir=DATA_DIR, prefix=".compras.", suffix=".tmp")
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(db, f, ensure_ascii=False)
        os.replace(tmp, DB_PATH)
    n = lambda k: len(s.get(k) or [])  # noqa: E731
    antes = f" O que havia antes ficou em dados/backups/{guarda.name}." if guarda.exists() else ""
    aviso = f" ⚠ {orfas} compras daqui usam um cartão que não está no setup; confira em ⚙ › Cartões." if orfas else ""
    return {"ok": True, "status": "setup_importado", "codigo": str((s.get("atalho") or {}).get("codigo") or ""),
            "celulares": sorted({(p.get("aviso") or {}).get("celular") for p in s.get("pessoas") or [] if (p.get("aviso") or {}).get("celular")}),
            "mensagem": f"Setup importado: {n('pessoas')} pessoas, {n('cartoes')} cartões e {n('financiamentos')} financiamento(s). "
                        f"As compras não mudaram.{aviso}{antes}"}


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
        if "dados/setup.json" in {i.filename for i in nomes} and "dados/compras.json" not in {i.filename for i in nomes}:
            return _importar_setup(z)
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
