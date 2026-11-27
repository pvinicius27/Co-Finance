"""Início do controle ("Controle desde", o marco): antes desta data o CoFinance não conta nada (compras nos painéis,
faturas calculadas, contas da casa, financiamento, pagamentos, avisos). Nasce no 1º dia do mês da instalação; a pessoa
pode mudar em ⚙ › Cartões. {"data"} mostra o efeito (prévia); {"data", "aplicar": true} grava (com cópia antes)."""
from __future__ import annotations

import copy
import shutil
from datetime import date, datetime
from typing import Any

from .base import Falha, fmt_brl
from .config import BACKUP_DIR, DB_PATH, MARCO_ZERO
from .dados import file_lock, load_db, save_db


def _abertas(db: dict[str, Any], hoje: str) -> tuple[int, float]:
    """Faturas e contas que ainda vão vencer (o que aparece em Próximos pagamentos)."""
    from .cartoes import faturas
    from .contas import contas
    lst = [x for x in faturas(db) + contas(db) if not x.get("pago") and x["vence"] >= hoje]
    return len(lst), round(sum(x.get("a_pagar", x.get("total") or 0) for x in lst), 2)


def _vencidas(db: dict[str, Any], ini: str, fim: str) -> tuple[int, float]:
    """Faturas e contas que venceram no intervalo (o que aparece em Pagamentos)."""
    from .cartoes import faturas
    from .contas import contas
    lst = [x for x in faturas(db) + contas(db) if ini <= x["vence"] < fim]
    return len(lst), round(sum(x.get("total") or 0 for x in lst), 2)


def marco(p: dict[str, Any]) -> dict[str, Any]:
    try:
        nova = date.fromisoformat(str(p.get("data") or "")[:10]).isoformat()
    except ValueError:
        raise Falha("Informe a data de início do controle.") from None
    if nova > date.today().isoformat():
        raise Falha("A data de início não pode ser no futuro.")
    if nova < "2000-01-01":
        raise Falha("Data muito antiga.")
    with file_lock():
        db = load_db()
        atual = db.get("marco", MARCO_ZERO)
        if nova == atual:
            return {"ok": True, "status": "marco", "igual": True, "mensagem": "Essa já é a data de início do controle."}
        hoje = date.today().isoformat()
        ini, fim = min(atual, nova), max(atual, nova)
        novo_db = copy.deepcopy(db)
        novo_db["marco"] = nova
        comp = [c for c in db["compras"] if not c.get("excluida_em") and ini <= (c.get("emissao") or "")[:10] < fim]
        n_v_a, v_a = _vencidas(db, ini, fim)
        n_v_n, v_n = _vencidas(novo_db, ini, fim)
        _, ab_a = _abertas(db, hoje)
        _, ab_n = _abertas(novo_db, hoje)
        voltando = nova < atual
        d = lambda s: f"{s[8:10]}/{s[5:7]}/{s[:4]}"  # noqa: E731
        linhas = []
        if comp:
            linhas.append(f"{len(comp)} {'compra' if len(comp) == 1 else 'compras'} ({fmt_brl(sum(c.get('valor_pago') or 0 for c in comp))}) "
                          f"de {d(ini)} a {d(fim)} {'passam a contar' if voltando else 'deixam de contar'} nos painéis.")
        if abs(v_n - v_a) > 0.009 or n_v_n != n_v_a:
            linhas.append(f"Faturas e contas que venceram nesse período: {n_v_a} ({fmt_brl(v_a)}) → {n_v_n} ({fmt_brl(v_n)}).")
        if abs(ab_n - ab_a) > 0.009:
            linhas.append(f"Próximos pagamentos: {fmt_brl(ab_a)} → {fmt_brl(ab_n)}"
                          + ("" if voltando else " (parcelas de compras feitas antes da nova data saem das faturas previstas)") + ".")
        if voltando:
            linhas.append("Meses em que as compras não foram lançadas aparecem incompletos.")
        if not linhas:
            linhas.append("Nada muda nos números.")
        if not p.get("aplicar"):
            return {"ok": True, "status": "marco", "previa": linhas, "atual": atual, "nova": nova}
        if DB_PATH.exists():  # guarda o arquivo de antes (desfazer = voltar a data)
            BACKUP_DIR.mkdir(parents=True, exist_ok=True)
            shutil.copy2(DB_PATH, BACKUP_DIR / f"antes-de-mudar-o-controle-{datetime.now():%Y%m%d-%H%M%S}.json")
        db["marco"] = nova
        save_db(db)
    return {"ok": True, "status": "marco", "mensagem": f"Controle desde {d(nova)} (era {d(atual)}).", "previa": linhas}
