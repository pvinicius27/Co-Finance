"""Migrações do arquivo de dados (v2 categorias, v3 cartões, v4 Bebê, v5 Elétrica). Cada uma guarda o arquivo antes."""
from __future__ import annotations

import json
import re
import shutil
from typing import Any

from .config import (
    ARVORE_INICIAL,
    BEBE_SUBS,
    CARTOES_INICIAIS,
    DATA_DIR,
    DB_PATH,
    ELETRICA,
    LOJA_V2_INICIAL,
    LOJA_V4,
    LOJA_V5,
    MARCO_ZERO,
    PAGO_ATE_INICIAL,
    REVISAO_V2,
    REVISAO_V4,
    REVISAO_V5,
    VELHA_PARA_NOVA,
)
from .dados import save_db
from .categorias import _aplicar_classe, classe_para
from .cartoes import sugerir_cartao


def migrar_v2(db: dict[str, Any]) -> None:
    """v1 → v2: categoria em dois níveis. Guarda o arquivo antigo (dados/compras.antes-v2.json) e, em cada compra,
    a categoria antiga (categoria_v1). As compras que vocês já tinham ajustado à mão continuam "de vocês"."""
    antigo = DATA_DIR / "compras.antes-v2.json"
    if DB_PATH.exists() and not antigo.exists():
        shutil.copy2(DB_PATH, antigo)
    db["arvore"] = json.loads(json.dumps(ARVORE_INICIAL))
    db["categoria_loja_v1"] = dict(db.get("categoria_loja") or {})
    db["categoria_loja"] = {k: list(v) for k, v in LOJA_V2_INICIAL.items()}
    for c in db.get("compras") or []:
        velha = c.get("categoria") or "Outros"
        c["categoria_v1"] = velha
        if c["id"] in REVISAO_V2:
            cat, sub = REVISAO_V2[c["id"]]
            _aplicar_classe(c, cat, sub, "você")
            c["categoria_manual"] = True
            continue
        cat, sub, via = classe_para(db, c.get("loja") or {}, c.get("itens") or [])
        if (cat, via) == ("Outros", "padrão") or via == "nome da loja":
            vc, vs = VELHA_PARA_NOVA.get(velha, ("Outros", "Outros"))
            if (vc, vs) != ("Outros", "Outros"):
                cat, sub, via = vc, vs, "migração"
        if c.get("bem") and cat == "Outros":
            cat, sub, via = "Carro", "Manutenção e revisão", "bem"
        _aplicar_classe(c, cat, sub, "revisada")  # proposta revisada por vocês em 18/10/2026
        c["categoria_manual"] = True
    db["versao"] = 2
    db["categorias"] = [a["nome"] for a in db["arvore"]]
    save_db(db)


def migrar_v3(db: dict[str, Any]) -> None:
    """v2 → v3: cartões, marco zero e "pago até". Guarda o arquivo antes; sugere o cartão das compras desde o marco."""
    antigo = DATA_DIR / "compras.antes-v3.json"
    if DB_PATH.exists() and not antigo.exists():
        shutil.copy2(DB_PATH, antigo)
    db.setdefault("cartoes", json.loads(json.dumps(CARTOES_INICIAIS)))
    db.setdefault("marco", MARCO_ZERO)
    db.setdefault("pago_ate", PAGO_ATE_INICIAL)
    db.setdefault("pagos", {})
    for c in db.get("compras") or []:
        sugerir_cartao(db, c)
    db["versao"] = 3
    save_db(db)


def migrar_v4(db: dict[str, Any]) -> None:
    """v3 → v4: Bebê ganha Banho, Alimentação, Bolsas e passeio, Quarto e enxoval (era Móveis e enxoval) e Brinquedos.
    Guarda o arquivo antes; subcategorias criadas por vocês continuam (vão para o fim)."""
    antigo = DATA_DIR / "compras.antes-v4.json"
    if DB_PATH.exists() and not antigo.exists():
        shutil.copy2(DB_PATH, antigo)
    ramo = next((a for a in db.get("arvore") or [] if a["nome"] == "Bebê"), None)
    if ramo:
        velhas = [("Quarto e enxoval" if x == "Móveis e enxoval" else x) for x in ramo.get("subs") or []]
        ramo["subs"] = BEBE_SUBS + [x for x in velhas if x not in BEBE_SUBS]
        ramo["bens"] = ["Quarto e enxoval", "Bolsas e passeio"]
    for c in db.get("compras") or []:
        if c.get("categoria") == "Bebê" and c.get("subcategoria") == "Móveis e enxoval":
            c["subcategoria"] = "Quarto e enxoval"
        if c["id"] in REVISAO_V4 and c.get("categoria") == "Bebê":
            _aplicar_classe(c, "Bebê", REVISAO_V4[c["id"]], "revisada")
            c["categoria_manual"] = True
    regras = db.setdefault("categoria_loja", {})
    for k, v in list(regras.items()):
        if isinstance(v, list) and v[:2] == ["Bebê", "Móveis e enxoval"]:
            regras[k] = ["Bebê", "Quarto e enxoval"]
    regras.update({k: list(v) for k, v in LOJA_V4.items()})
    db["versao"] = 4
    save_db(db)


def migrar_v5(db: dict[str, Any]) -> None:
    """v4 → v5: Casa ganha "Elétrica e iluminação" (depois de Climatização) e entra a revisão de 20/10/2026.
    Guarda o arquivo antes; as outras subcategorias e escolhas de vocês ficam como estão."""
    antigo = DATA_DIR / "compras.antes-v5.json"
    if DB_PATH.exists() and not antigo.exists():
        shutil.copy2(DB_PATH, antigo)
    ramo = next((a for a in db.get("arvore") or [] if a["nome"] == "Casa"), None)
    if ramo and ELETRICA not in (ramo.get("subs") or []):
        subs = ramo.setdefault("subs", [])
        subs.insert(subs.index("Climatização") + 1 if "Climatização" in subs else len(subs), ELETRICA)
    for c in db.get("compras") or []:
        if c["id"] in REVISAO_V5:
            _aplicar_classe(c, *REVISAO_V5[c["id"]], "revisada")
            c["categoria_manual"] = True
    db.setdefault("categoria_loja", {}).update({k: list(v) for k, v in LOJA_V5.items()})
    db["versao"] = 5
    save_db(db)


def migrar_v6(db: dict[str, Any]) -> None:
    """v5 → v6: o cadastro do carro deixa de guardar chassi e placa inteira (dado pessoal, como o CPF): fica só o final da
    placa (3 últimos). Sem cópia do arquivo antigo (ela teria esses dados)."""
    for b in db.get("bens") or []:
        placas = b.pop("placas", None) or []
        b.pop("chassi", None)
        b["placa_final"] = sorted({re.sub(r"[^A-Z0-9]", "", str(x).upper())[-3:] for x in placas} | set(b.get("placa_final") or []))
    db["versao"] = 6
    save_db(db)
