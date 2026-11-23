"""Configurações › Pessoas: quem compra, a cor de cada um, como vem no Atalho do iPhone, quem paga do próprio bolso
(reembolso) e "Devemos à/ao". O vale (Alelo, VR…) é cartão: fica em Cartões. O nome não muda depois de criado: as compras guardam o nome."""
from __future__ import annotations

import re
from typing import Any

from .base import Falha, norm_txt
from .dados import PALETA_PESSOAS, file_lock, load_db, save_db
from .avisos import COMPRAS


def pessoa(p: dict[str, Any]) -> dict[str, Any]:
    """{nome, novo?, cor, apelidos ("Aninha, Ana"), reembolso, artigo ("a"/"o"), aviso?: {celular, compras, applepay, contas}}
    ou {nome, apagar}. aviso: o celular (notify.mobile_app_…) e que avisos a pessoa recebe (ver central/avisos.py)."""
    nome = re.sub(r"\s+", " ", str(p.get("nome") or "")).strip()[:20]
    if not nome:
        raise Falha("Qual o nome?")
    with file_lock():
        db = load_db()
        lst = db["pessoas"]
        x = next((y for y in lst if y["nome"] == nome), None)
        if p.get("apagar"):
            if not x:
                raise Falha("Pessoa não encontrada.")
            if any(c.get("quem") == nome for c in db["compras"]) or any(nome in (k.get("usam") or []) or k.get("dono") == nome for k in db.get("cartoes") or []):
                raise Falha(f"{nome} já tem compras ou cartões: não dá para apagar.")
            lst.remove(x)
            db["compradores"] = [y["nome"] for y in lst]
            save_db(db)
            return {"ok": True, "status": "pessoa", "mensagem": f"{nome} saiu do cadastro."}
        if p.get("novo"):
            if (igual := next((y["nome"] for y in lst if norm_txt(y["nome"]) == norm_txt(nome)), None)):
                raise Falha(f"Já existe {igual}.")
            x = {"nome": nome, "cor": PALETA_PESSOAS[len(lst) % len(PALETA_PESSOAS)]}
            lst.append(x)
        elif not x:
            raise Falha("Pessoa não encontrada.")
        cor = str(p.get("cor") or "")
        apelidos = [norm_txt(a) for a in re.split(r"[,;\n]", str(p.get("apelidos") or "")) if norm_txt(a)]
        if any(" " in a for a in apelidos):
            raise Falha("Apelidos: uma palavra cada, separadas por vírgula.")
        if isinstance(p.get("aviso"), dict):
            av = p["aviso"]
            cel = str(av.get("celular") or "").strip()
            if cel and not re.fullmatch(r"notify\.[a-z0-9_]+", cel):
                raise Falha("Celular: escolha um da lista (notify.mobile_app_…).")
            if av.get("compras", "nenhuma") not in COMPRAS:
                raise Falha("Que compras recebe?")
            x["aviso"] = {"celular": cel, "compras": av.get("compras", "nenhuma"), "applepay": bool(av.get("applepay")), "contas": bool(av.get("contas"))}
        x.update({"cor": cor.lower() if re.fullmatch(r"#[0-9a-fA-F]{6}", cor) else x.get("cor"),
                  "apelidos": sorted(set(apelidos) - {norm_txt(nome)}), "reembolso": bool(p.get("reembolso")),
                  "artigo": p.get("artigo") if p.get("artigo") in ("a", "o") else ""})
        db["compradores"] = [y["nome"] for y in lst]
        save_db(db)
    return {"ok": True, "status": "pessoa", "mensagem": f"Cadastro de {nome} salvo."}
