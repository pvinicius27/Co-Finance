"""⚙ Configurações › Contas da casa: luz (do painel de energia, das contas em PDF ou digitada), água (PDF da Saneago ou digitada) e as contas fixas
(as que não chegam sozinhas), num cadastro só na tela: "todo mês no mesmo dia" (recorrente: internet) ou "em datas certas" (parcelada: carnê, IPTU);
as duas com valor até o vencimento e outro depois (se muda). A marca de pago fica em db["pagos"]
com o id "<conta>:AAAA-MM", por isso o id não muda depois de criado."""
from __future__ import annotations

import re
from datetime import date
from typing import Any

from .base import Falha, _valor_txt, fmt_brl, norm_txt
from .dados import compradores, file_lock, load_db, save_db

ICONES_CONTA = ["🌐", "🏛️", "⚡", "💧", "🔥", "📺", "📱", "🏠", "🚗", "🛡️", "🏋️", "🎓", "🏥", "📦"]


def _mes(v: Any, campo: str) -> str:
    s = str(v or "").strip()
    if not re.fullmatch(r"\d{4}-\d{2}", s) or not 1 <= int(s[5:]) <= 12:
        raise Falha(f"{campo}: escolha o mês.")
    return s


def _datas(txt: Any) -> list[str]:
    """Vencimentos do carnê: um por linha (ou separados por vírgula), 20/02/2026 ou 2026-02-20."""
    out = set()
    for pedaco in re.split(r"[,;\n]+", str(txt or "")):
        s = pedaco.strip()
        if not s:
            continue
        m = re.fullmatch(r"(\d{1,2})/(\d{1,2})/(\d{4})", s) or re.fullmatch(r"(\d{4})-(\d{2})-(\d{2})", s)
        try:
            d = date(int(m[3]), int(m[2]), int(m[1])) if m and "/" in s else date(int(m[1]), int(m[2]), int(m[3])) if m else None
        except ValueError:
            d = None
        if not d:
            raise Falha(f"Vencimento: escreva a data como 20/02/2026. Não entendi: {s[:20]}")
        out.add(d.isoformat())
    if not out:
        raise Falha("Ponha pelo menos um vencimento.")
    if len({d[:7] for d in out}) < len(out):
        raise Falha("Dois vencimentos no mesmo mês: o carnê tem uma parcela por mês.")
    return sorted(out)


def conta_casa(p: dict[str, Any]) -> dict[str, Any]:
    """{tipo: luz|agua|recorrente|parcelada, id?, nome, quem, icone?, unidade?, fonte? (luz: "pdf" ou "painel"), dia, valor, valor_depois, desde, ate, vencimentos} ou {..., apagar}."""
    tipo = p.get("tipo")
    if tipo not in ("luz", "agua", "recorrente", "parcelada"):
        raise Falha("Pedido inválido.")
    with file_lock():
        db = load_db()
        cc = db.setdefault("contas_casa", {})
        pagos = db.get("pagos") or {}
        if tipo in ("luz", "agua"):
            x = cc.get(tipo)
            if not x and p.get("apagar"):
                raise Falha("Essa conta não está ligada aqui.")
            if not x:  # luz e água: uma de cada, com id fixo
                x = {"id": tipo, "icone": "⚡" if tipo == "luz" else "💧", "categoria": "Casa", "subcategoria": "Contas fixas"}
            if p.get("apagar"):
                cc.pop(tipo)
                save_db(db)
                return {"ok": True, "status": "conta_casa", "mensagem": f"{x['nome']} saiu das contas da casa."}
        else:
            lst = cc.setdefault(tipo + "s", [])
            cid = str(p.get("id") or "")
            x = next((y for y in lst if y["id"] == cid), None) if cid else None
            if cid and not x:
                raise Falha("Conta não encontrada.")
            if p.get("apagar"):
                if any(k.startswith(f"{cid}:") for k in pagos):
                    raise Falha(f"{x['nome']} já tem pagamentos marcados: em vez de apagar, "
                                + ("ponha até quando ela vai." if tipo == "recorrente" else "deixe como está (o histórico usa)."))
                lst.remove(x)
                save_db(db)
                return {"ok": True, "status": "conta_casa", "mensagem": f"{x['nome']} saiu das contas da casa."}
        nome = re.sub(r"\s+", " ", str(p.get("nome") or "")).strip()[:30]
        if not nome:
            raise Falha("Dê um nome à conta.")
        quem = p.get("quem")
        if quem not in compradores():
            raise Falha("De quem é a conta?")
        if not x:  # nova: id curto pelo nome, sem repetir conta nem cartão (as marcas de pago usam o mesmo lugar)
            usados = {"luz", "agua", *(y["id"] for k in ("recorrentes", "parceladas") for y in cc.get(k) or []), *(k["id"] for k in db.get("cartoes") or [])}
            base = norm_txt(nome).lower().replace(" ", "")[:12] or "conta"
            cid, n = base, 2
            while cid in usados:
                cid, n = f"{base}{n}", n + 1
            x = {"id": cid, "categoria": "Casa", "subcategoria": "Contas fixas"}
            lst.append(x)
        x.update({"nome": nome, "quem": quem})
        if tipo in ("luz", "agua"):
            cc[tipo] = x
        if tipo in ("luz", "agua") and "fonte" in p:  # luz: painel (sem o campo), pdf ou manual; água: Saneago (sem o campo) ou manual
            if p.get("fonte") in (("pdf", "manual") if tipo == "luz" else ("manual",)):
                x["fonte"] = p["fonte"]
            else:
                x.pop("fonte", None)
        if tipo in ("recorrente", "parcelada"):
            x["icone"] = p.get("icone") if p.get("icone") in ICONES_CONTA else x.get("icone") or "🏠"
        if tipo == "luz" and str(p.get("unidade") or "").strip():
            x["unidade"] = str(p["unidade"]).strip()[:30]
        if tipo in ("recorrente", "parcelada"):
            valor = round(_valor_txt(p.get("valor")) or 0, 2)
            if valor <= 0:
                raise Falha("Qual o valor?")
            x["valor"] = valor
            depois = round(_valor_txt(p.get("valor_depois")) or 0, 2) or valor  # depois do vencimento (internet, multa do carnê); vazio = o mesmo
            if depois < valor:
                raise Falha("O valor depois do vencimento não pode ser menor.")
            x["valor_depois"] = depois
        if tipo == "recorrente":
            try:
                dia = int(p.get("dia") or 0)
            except (TypeError, ValueError):
                dia = 0
            if not 1 <= dia <= 31:
                raise Falha("Vence em que dia? De 1 a 31.")
            desde = _mes(p.get("desde"), "Desde")
            ate = _mes(p.get("ate"), "Até") if p.get("ate") else None
            if ate and ate < desde:
                raise Falha("O mês final não pode ser antes do inicial.")
            x.update({"dia": dia, "desde": desde})
            if ate:
                x["ate"] = ate
            else:
                x.pop("ate", None)
        if tipo == "parcelada":
            x["vencimentos"] = _datas(p.get("vencimentos"))
        save_db(db)
    return {"ok": True, "status": "conta_casa", "mensagem": f"{nome} salva."}


def conta_mes(p: dict[str, Any]) -> dict[str, Any]:
    """Luz ou água de companhia sem leitor: vocês digitam a conta do mês. {tipo: luz|agua, ref: "2026-09", valor,
    vence: "2026-10-13", consumo?} ou {tipo, ref, apagar}. O mesmo mês digitado de novo substitui; mês lido de PDF não."""
    from .energia import MESES
    tipo = p.get("tipo")
    if tipo not in ("luz", "agua"):
        raise Falha("Pedido inválido.")
    ref = _mes(p.get("ref"), "Mês da conta")
    with file_lock():
        db = load_db()
        cfg = (db.get("contas_casa") or {}).get(tipo)
        if not cfg or cfg.get("fonte") != "manual":
            raise Falha("Essa conta não é digitada (⚙ › Contas da casa).")
        lst = db.setdefault("contas_luz" if tipo == "luz" else "contas_agua", [])
        velha = next((x for x in lst if x["ref"] == ref), None)
        if velha and not velha.get("digitada"):
            raise Falha("Esse mês veio de um PDF: não dá para digitar por cima.")
        if p.get("apagar"):
            if not velha:
                raise Falha("Conta não encontrada.")
            lst.remove(velha)
            save_db(db)
            return {"ok": True, "status": "conta_mes", "mensagem": f"{cfg['nome']} {ref[5:]}/{ref[:4]} tirada."}
        valor = round(_valor_txt(p.get("valor")) or 0, 2)
        if valor <= 0:
            raise Falha("Qual o valor da conta?")
        vence = _datas(p.get("vence"))
        if len(vence) != 1:
            raise Falha("Ponha só um vencimento.")
        cons = _valor_txt(p.get("consumo")) if str(p.get("consumo") or "").strip() else None
        if tipo == "luz":
            c = {"ref": ref, "referencia": f"{MESES[int(ref[5:]) - 1]}/{ref[:4]}", "vence": vence[0], "total": valor, "digitada": True}
            if cons is not None:
                c["consumo_kwh"] = round(cons, 2)
        else:
            c = {"ref": ref, "referencia": f"{ref[5:]}/{ref[:4]}", "vence": vence[0], "total": valor, "digitada": True, "fatura": None,
                 "consumo": {"faturado": round(cons, 1)} if cons is not None else {}, "leitura": {}, "servicos": [], "conferencia": {"bate": True}}
        if velha:
            lst.remove(velha)
        lst.append(c)
        lst.sort(key=lambda x: x["ref"])
        save_db(db)
    return {"ok": True, "status": "conta_mes", "mensagem": f"{cfg['nome']} {c['referencia']}: {fmt_brl(valor)}, vence {vence[0][8:10]}/{vence[0][5:7]}"
            + (" (substituiu a anterior)." if velha else ".")}
