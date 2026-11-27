"""Cartões, faturas, parcelas, ✓ Paguei, cadastro de cartões e lembretes de vencimento."""
from __future__ import annotations

import calendar
import re
from datetime import date
from datetime import datetime
from datetime import timedelta
from typing import Any

from .config import BENEFICIOS, BANCOS_EMISSORES, BANDEIRAS_CARTAO, MARCO_ZERO, PAGOS_NA_HORA, T_PAG
from .base import Falha, fmt_brl, nome_loja, norm_txt, now_iso
from .dados import compradores, file_lock, load_db, save_db
from .pagamentos import _data_compra, _pgs_fin, _tipo_pag, _valor_pg, aceita, cartao_na_hora, data_efetiva, dividir, rotulo_cartao
from .contas import _pago, contas, painel_energia, valor_pela_data


def _cartao(db: dict[str, Any], cid: Any) -> dict[str, Any] | None:
    return next((k for k in db.get("cartoes") or [] if k["id"] == cid), None)


def usam_hoje(k: dict[str, Any]) -> list[str]:
    """Quem usa o cartão hoje: sai quem tem finais cadastrados e todos parados ("usam" fica guardado para o histórico)."""
    fs = list((k.get("finais") or {}).values())
    return [p for p in k.get("usam") or [] if not (any(f.get("quem") == p for f in fs) and all(f.get("parado") for f in fs if f.get("quem") == p))]


def finais_sino(db: dict[str, Any]) -> dict[str, Any]:
    """Para o sino: finais marcados para avaliar e compras nas faturas do banco feitas depois do dia em que o final parou."""
    avaliar, alertas = [], []
    for k in db.get("cartoes") or []:
        for f, x in (k.get("finais") or {}).items():
            linhas = [l for fb in (db.get("faturas_banco") or {}).values() if fb.get("cartao") == k["id"]
                      for l in fb.get("linhas") or [] if l.get("final") == f and l.get("tipo") == "compra" and l.get("data")]
            if x.get("avaliar") and not x.get("parado"):
                avaliar.append({"cartao": k["id"], "nome": rotulo_cartao(k, db.get("cartoes") or []), "final": f, "quem": x.get("quem"), "tipo": x.get("tipo") or "",
                                "ultima": max((l["data"] for l in linhas), default=None)})
            if x.get("parado"):
                desde = max(x["parado"], x.get("visto_ate") or "")
                novas = sorted({(l["data"], l["descricao"], l["valor"]) for l in linhas if l["data"] > desde})
                if novas:
                    alertas.append({"cartao": k["id"], "nome": rotulo_cartao(k, db.get("cartoes") or []), "final": f, "quem": x.get("quem"), "parado": x["parado"],
                                    "compras": [{"data": d, "descricao": ds, "valor": v} for d, ds, v in novas]})
    return {"avaliar": avaliar, "alertas": alertas}


def final_cartao(p: dict[str, Any]) -> dict[str, Any]:
    """Sino › Finais de cartão: {cartao, final, decisao}: "parou" (parado desde hoje), "segue" (continua em uso)
    ou "visto" (as compras no final parado já foram vistas; só avisa das próximas)."""
    cid, f, dec = str(p.get("cartao") or ""), str(p.get("final") or ""), p.get("decisao")
    if dec not in ("parou", "segue", "visto"):
        raise Falha("Pedido inválido.")
    with file_lock():
        db = load_db()
        k = _cartao(db, cid)
        x = ((k or {}).get("finais") or {}).get(f)
        if not x:
            raise Falha("Não achei esse final.")
        if dec == "parou":
            x["parado"] = x.get("parado") or date.today().isoformat()
            x.pop("avaliar", None)
            msg = f"Final {f} do {rotulo_cartao(k, db.get('cartoes') or [])} parado. Dá para mudar no cadastro do cartão."
        elif dec == "segue":
            for c in ("avaliar", "parado", "visto_ate"):
                x.pop(c, None)
            msg = f"Final {f} do {rotulo_cartao(k, db.get('cartoes') or [])} continua em uso."
        else:
            x["visto_ate"] = max((l["data"] for fb in (db.get("faturas_banco") or {}).values() if fb.get("cartao") == cid
                                  for l in fb.get("linhas") or [] if l.get("final") == f and l.get("data")), default=x.get("parado"))
            msg = "Ok. Aviso de novo só se aparecer outra compra nesse final."
        save_db(db)
    return {"ok": True, "status": "final", "mensagem": msg}


def _no_dia(ano: int, mes: int, dia: int) -> date:
    while mes > 12:
        ano, mes = ano + 1, mes - 12
    while mes < 1:
        ano, mes = ano - 1, mes + 12
    return date(ano, mes, min(dia, calendar.monthrange(ano, mes)[1]))


def fatura_de(cartao: dict[str, Any], dia: date, k: int = 0) -> tuple[date, date]:
    """(fechamento, vencimento) da fatura onde cai a parcela k (0 = primeira) de uma compra feita em "dia".
    Até o fechamento: fatura que fecha neste mês; depois: na próxima. No próprio dia: conforme o cartão."""
    fecha = _no_dia(dia.year, dia.month, cartao["fecha"])
    if dia > fecha or (dia == fecha and cartao.get("no_fechamento", "proxima") == "proxima"):
        fecha = _no_dia(dia.year, dia.month + 1, cartao["fecha"])
    fecha = _no_dia(fecha.year, fecha.month + k, cartao["fecha"])
    vence = _no_dia(fecha.year, fecha.month + (0 if cartao["vence"] > cartao["fecha"] else 1), cartao["vence"])
    return fecha, vence


def lancamentos_cartao(db: dict[str, Any]) -> list[dict[str, Any]]:
    """Cada parcela de cada compra no crédito com cartão escolhido, desde o marco zero."""
    out = []
    for c in db["compras"]:
        if c.get("moeda") and not c.get("valor_pago"):
            continue
        for i, pg in enumerate(_pgs_fin(c)):
            k = _cartao(db, pg.get("cartao"))
            dia = _data_compra(c, pg)
            if not k or not k.get("fecha") or not k.get("vence") or not dia or _tipo_pag(pg) != "Crédito" or dia.isoformat() < db.get("marco", MARCO_ZERO):
                continue
            partes = dividir(_valor_pg(c, pg), pg.get("parcelas") or 1)
            for n, v in enumerate(partes):
                fecha, vence = fatura_de(k, dia, n)
                out.append({"fatura": f"{k['id']}:{vence.isoformat()}", "cartao": k["id"], "fecha": fecha.isoformat(), "vence": vence.isoformat(),
                            "compra": c["id"], "pg": i, "data": dia.isoformat(), "loja": nome_loja(c["loja"]), "quem": c.get("quem"),
                            "valor": v, "parcela": n + 1, "de": len(partes), "total_compra": round(sum(partes), 2)})
    return out


def faturas(db: dict[str, Any]) -> list[dict[str, Any]]:
    grupos: dict[str, dict[str, Any]] = {}
    # fatura lida do banco: o vencimento dela manda (o banco empurra o dia quando cai em fim de semana ou feriado)
    do_banco = {(fb["cartao"], fb["vence"][:7]): fb for fb in (db.get("faturas_banco") or {}).values()}
    # compra que apareceu numa fatura lida: a parcela fica na fatura em que o banco a mostrou, e as outras parcelas seguem
    # a sequência a partir dela (o dia de fechamento do cadastro não manda; o banco muda o dia conforme o mês)
    mes_n = lambda s: int(s[:4]) * 12 + int(s[5:7]) - 1  # noqa: E731
    onde: dict[str, list[tuple[int, int]]] = {}
    for fb in (db.get("faturas_banco") or {}).values():
        for ln in fb["linhas"]:
            if ln.get("compra") and ln["tipo"] not in ("pagamento", "estorno"):  # estorno vem sem parcela: não conta
                p = str(ln.get("parcela") or "")
                n = int(p.split("/")[0]) if re.fullmatch(r"\d{1,2}/\d{1,2}", p) else 1
                onde.setdefault(ln["compra"], []).append((n, mes_n(fb["vence"])))
    for x in lancamentos_cartao(db):
        if (ref := onde.get(x["compra"])):
            p0, m0 = min(ref, key=lambda r: abs(r[0] - x["parcela"]))
            delta = m0 + (x["parcela"] - p0) - mes_n(x["vence"])
            if delta:
                v = date.fromisoformat(x["vence"]); fe = date.fromisoformat(x["fecha"])
                v2, fe2 = _no_dia(v.year, v.month + delta, v.day), _no_dia(fe.year, fe.month + delta, fe.day)
                x = {**x, "fatura": f"{x['cartao']}:{v2.isoformat()}", "vence": v2.isoformat(), "fecha": fe2.isoformat()}
        if (fb := do_banco.get((x["cartao"], x["vence"][:7]))) and fb["id"] != x["fatura"]:
            x = {**x, "fatura": fb["id"], "vence": fb["vence"], "fecha": fb.get("fecha") or x["fecha"]}
        f = grupos.setdefault(x["fatura"], {"id": x["fatura"], "tipo": "fatura", "cartao": x["cartao"], "fecha": x["fecha"], "vence": x["vence"],
                                            "total": 0.0, "itens": []})
        f["total"] = round(f["total"] + x["valor"], 2)
        f["itens"].append(x)
    for fid, fb in (db.get("faturas_banco") or {}).items():  # fatura lida do banco: o total dela é o que vale
        if not _cartao(db, fb["cartao"]):
            continue
        f = grupos.setdefault(fid, {"id": fid, "tipo": "fatura", "cartao": fb["cartao"], "fecha": fb.get("fecha") or fb["vence"],
                                    "vence": fb["vence"], "total": 0.0, "itens": []})
        f["estimado"], f["total"] = f["total"], max(fb["total"], 0.0)
        if fb["total"] < -0.004:  # saldo a favor (pagou a mais, estorno): não há o que pagar; o crédito abate a próxima
            f["saldo_credor"] = round(-fb["total"], 2)
        f["banco"] = {"linhas": len(fb["linhas"]), "lida_em": fb.get("lida_em")}
        f["fecha"] = fb.get("fecha") or f["fecha"]  # o fechamento que o banco diz, não o do cadastro
        from .faturas_banco import gasto_do_mes  # gasto do mês (custo real): com antecipação o boleto fica menor
        f.update(gasto_do_mes(fb))
        # de onde vem o valor, pelas linhas do banco: compras de cada mês (à vista ou 1ª parcela), parcelas de compras
        # antigas, tarifas/encargos e estornos (o que o banco cobrou de verdade, não a conta pelas compras lançadas)
        from .faturas import e_pagamento
        pm: dict[str, float] = {}
        for ln in fb["linhas"]:
            if e_pagamento(ln):
                continue
            p = str(ln.get("parcela") or "")
            k = ("estornos" if ln["tipo"] in ("estorno", "pagamento") else "tarifas" if ln["tipo"] != "compra"
                 else "parc" if p and not p.startswith(("01/", "1/")) else str(ln.get("data") or "")[:7])
            pm[k] = round(pm.get(k, 0.0) + ln["valor"], 2)
        f["por_mes"] = pm
        # antecipações pelo banco: os pagamentos do período, menos o que pagou o boleto anterior (os primeiros)
        resto = max(float(fb.get("anterior") or 0), 0.0)
        ants = []
        for ln in sorted((x for x in fb["linhas"] if e_pagamento(x)), key=lambda x: x.get("data") or ""):
            v = -ln["valor"]
            usa = min(resto, v)
            resto -= usa
            if v - usa > 0.004:
                ants.append({"data": ln.get("data"), "valor": round(v - usa, 2)})
        if ants:
            f["antecipacoes_banco"] = ants
    # mês que o banco pulou (mudou o fechamento, ciclo de dois meses): a fatura lida diz que a anterior foi a de dois meses
    # antes ("Total da fatura anterior" = o boleto dela). A fatura calculada no meio não existe: as compras dela estão
    # na fatura lida seguinte, que já traz o total do banco.
    lidas: dict[str, list[dict[str, Any]]] = {}
    for fb in (db.get("faturas_banco") or {}).values():
        lidas.setdefault(fb["cartao"], []).append(fb)
    for cid, fs in lidas.items():
        fs.sort(key=lambda f: f["vence"])
        for a, b in zip(fs, fs[1:]):
            if b.get("anterior") is None or abs(float(b["anterior"]) - float(a["total"])) > 0.011 or b["id"] not in grupos:
                continue
            for fid in [fid for fid, g in grupos.items() if g["cartao"] == cid and "banco" not in g and a["vence"] < g["vence"] < b["vence"]]:
                g = grupos.pop(fid)
                destino = grupos[b["id"]]
                destino["itens"] += [{**it, "fatura": b["id"], "vence": b["vence"]} for it in g["itens"]]
                destino["estimado"] = round(destino.get("estimado", 0.0) + g["total"], 2)
                destino["sem_fatura_no_meio"] = g["vence"]  # o banco não emitiu a fatura que venceria neste dia
    # antecipação informada na hora: vai para a 1ª fatura do cartão que vence no dia ou depois e ainda não foi lida do
    # banco (lida, o boleto já vem com ela descontada). Não muda o gasto; desconta do que falta pagar.
    for a in db.get("antecipacoes") or []:
        if a.get("status") != "provisoria":
            continue
        alvo = next((f for f in sorted(grupos.values(), key=lambda f: f["vence"])
                     if f["cartao"] == a["cartao"] and f["vence"] >= a["data"]), None)
        if alvo and "banco" not in alvo:
            alvo.setdefault("antecipacoes", []).append({k: a[k] for k in ("id", "valor", "data")})
            alvo["antecipado"] = round(alvo.get("antecipado", 0.0) + a["valor"], 2)
    for f in grupos.values():
        if "banco" not in f and f.get("antecipado"):
            f["gasto_mes"] = f["total"]  # soma das compras = o gasto; o que falta pagar é o resto
            f["a_pagar"] = round(max(f["total"] - f["antecipado"], 0.0), 2)
    out = []
    for f in sorted(grupos.values(), key=lambda f: f["vence"]):
        k = _cartao(db, f["cartao"])
        f["nome"] = f"Fatura {rotulo_cartao(k, db.get('cartoes') or [])}"
        f["icone"] = "💳"
        f["quem"] = k.get("dono")
        f["itens"].sort(key=lambda x: x["data"])
        f["pago"] = _pago(db, f["id"], f["vence"])
        out.append(f)
    return out


def candidatos(db: dict[str, Any], c: dict[str, Any], pg: dict[str, Any], pela_bandeira: bool = True) -> list[dict[str, Any]]:
    """Cartões que podem ter pago esse crédito ou débito: em uso por quem comprou e da forma certa (débito é da conta:
    só os do titular). Com a bandeira da nota, só os dela."""
    t, band = _tipo_pag(pg), pg.get("bandeira") if pela_bandeira else None
    return [k for k in db.get("cartoes") or [] if c.get("quem") in usam_hoje(k) and k.get("ativo", True) and aceita(k, t)
            and (t == "Crédito" or k.get("dono") == c.get("quem")) and (not band or band == "Outros" or k.get("bandeira") == band)]


def sugerir_cartao(db: dict[str, Any], c: dict[str, Any]) -> list[str]:
    """Nota sem cartão: se só um cartão combina (bandeira + quem usa), ele entra como sugerido. Devolve os escolhidos."""
    feitos = []
    if (data_efetiva(c) or "")[:10] < db.get("marco", MARCO_ZERO):
        return feitos
    for pg in _pgs_fin(c):
        if _tipo_pag(pg) not in ("Crédito", "Débito") or pg.get("cartao"):
            continue
        cands = candidatos(db, c, pg)
        if len(cands) == 1:
            pg["cartao"], pg["cartao_via"] = cands[0]["id"], "sugerido"
            feitos.append(rotulo_cartao(cands[0], db.get("cartoes") or []))
    return feitos


def texto_fatura(db: dict[str, Any], c: dict[str, Any]) -> str:
    """"Entra na fatura Bradesco que vence em 08/11 · 3x de R$ 200,00" para cada pagamento no crédito com cartão."""
    partes = []
    for pg in _pgs_fin(c):
        k, dia = _cartao(db, pg.get("cartao")), _data_compra(c, pg)
        if not k or not dia or _tipo_pag(pg) != "Crédito":
            continue
        if dia.isoformat() < db.get("marco", MARCO_ZERO):
            partes.append(f"no {rotulo_cartao(k, db.get('cartoes') or [])}, antes do controle (fora das faturas)")
            continue
        if not k.get("fecha") or not k.get("vence"):
            partes.append(f"cartão {rotulo_cartao(k, db.get('cartoes') or [])} sem dia de fechamento/vencimento (complete em A pagar › Cartões)")
            continue
        n = int(pg.get("parcelas") or 1)
        _, vence = fatura_de(k, dia)
        vs = dividir(_valor_pg(c, pg), n)
        partes.append(f"entra na fatura {rotulo_cartao(k, db.get('cartoes') or [])} que vence em {vence:%d/%m}" + (f" · {n}x de {fmt_brl(vs[-1])}" if n > 1 else ""))
    return "; ".join(partes)


def financeiro(_: dict[str, Any]) -> dict[str, Any]:
    """Painel: faturas (com as parcelas), contas e compras no crédito ainda sem cartão."""
    with file_lock():
        db = load_db()
    sem = [{"id": c["id"], "data": data_efetiva(c), "loja": nome_loja(c["loja"]), "quem": c.get("quem"), "valor": _valor_pg(c, pg)}
           for c in db["compras"] if (data_efetiva(c) or "")[:10] >= db.get("marco", MARCO_ZERO)
           for pg in _pgs_fin(c) if _tipo_pag(pg) == "Crédito" and not pg.get("cartao")
           and any(c.get("quem") in k.get("usam", []) for k in db.get("cartoes") or [])]  # quem não tem cartão aqui paga com o próprio
    # débito, pré-pago e benefício saem na hora (sem fatura): cada um no cartão dele, para ver o que saiu de cada conta e quando
    na_hora, deb_sem = [], []
    for c in db["compras"]:
        if c.get("moeda") and not c.get("valor_pago"):
            continue
        for i, pg in enumerate(_pgs_fin(c)):
            t, dia = _tipo_pag(pg), _data_compra(c, pg)
            if t not in ("Débito", "Benefício") or not dia or dia.isoformat() < db.get("marco", MARCO_ZERO):
                continue
            x = {"compra": c["id"], "i": i, "data": dia.isoformat(), "loja": nome_loja(c["loja"]), "quem": c.get("quem"), "valor": _valor_pg(c, pg), "tipo": t,
                 **({"saldo": _saldo_vale(c, pg)} if t == "Benefício" else {})}
            if (k := cartao_na_hora(c, pg)):
                na_hora.append({**x, "cartao": k["id"]})
            elif t == "Débito" and (op := candidatos(db, c, pg, False)):  # qual cartão? vai para o sino
                op = sorted(op, key=lambda k: norm_txt(rotulo_cartao(k, db.get("cartoes") or [])))  # em ordem alfabética
                deb_sem.append({**x, "opcoes": [k["id"] for k in op]})
    return {"ok": True, "status": "financeiro", "marco": db.get("marco"), "pago_ate": db.get("pago_ate"), "hoje": date.today().isoformat(),
            "cartoes": [{**k, "usam_hoje": usam_hoje(k)} for k in db.get("cartoes") or []], "faturas": faturas(db), "contas": contas(db), "sem_cartao": sem,
            "faturas_lidas": len(db.get("faturas_banco") or {}), "pagos_na_hora": list(PAGOS_NA_HORA), "contas_casa": db.get("contas_casa") or {}, "painel_energia": painel_energia(), "na_hora": na_hora, "debito_sem_cartao": deb_sem,
            "antecipacoes_nao_vieram": [a for a in db.get("antecipacoes") or [] if a.get("status") == "nao_veio"]}


def _saldo_vale(c: dict[str, Any], pg: dict[str, Any]) -> str:
    """Benefício: de qual saldo saiu. A nota manda quando diz (Vale Refeição / Vale Alimentação); senão o tipo de loja,
    como a própria Alelo faz: Comer fora (restaurante, lanchonete, padaria) é refeição; o resto (mercado) é alimentação."""
    f = str(pg.get("forma") or "").strip()
    f = norm_txt(T_PAG.get(f.zfill(2), f) if f.isdigit() else f)
    if "REFEICAO" in f:
        return "refeicao"
    if "ALIMENTACAO" in f:
        return "alimentacao"
    return "refeicao" if c.get("categoria") == "Comer fora" else "alimentacao"


def pagar(p: dict[str, Any]) -> dict[str, Any]:
    """✓ Paguei (ou desfazer) de uma fatura/conta: {id, desfazer?}. O id é "br:2026-11-08" ou "luz:2026-09"."""
    fid = str(p.get("id") or "")
    if not re.fullmatch(r"[a-z0-9]+:\d{4}-\d{2}(-\d{2})?", fid):
        raise Falha("Item inválido.")
    em = str(p.get("em") or "")  # data (e hora) do pagamento escolhida por vocês: "2026-10-19" ou "2026-10-19T21:58"; sem ela: agora
    m_em = re.fullmatch(r"(\d{4}-\d{2}-\d{2})(?:T(\d{2}):(\d{2}))?", em)
    if em and (not m_em or not "2000-01-01" <= m_em.group(1) <= date.today().isoformat()
               or (m_em.group(2) and not (int(m_em.group(2)) < 24 and int(m_em.group(3)) < 60))
               or (m_em.group(2) and em > datetime.now().strftime("%Y-%m-%dT%H:%M"))):
        raise Falha("Data do pagamento inválida (não pode ser no futuro).")
    em_iso = (f"{m_em.group(1)}T{m_em.group(2)}:{m_em.group(3)}:00-03:00" if m_em.group(2) else f"{m_em.group(1)}T12:00:00") if em else ""
    with file_lock():
        db = load_db()
        itens = {x["id"]: x for x in faturas(db) + contas(db)}
        x = itens.get(fid)
        if not x:
            raise Falha("Não achei essa fatura/conta.")
        if p.get("desfazer"):
            if x["vence"] <= db.get("pago_ate", ""):  # era "antes do controle": fica guardado que não foi paga
                db["pagos"][fid] = {"aberto": True, "em": now_iso()}
            else:
                db["pagos"].pop(fid, None)
            msg = f"{x['nome']} voltou para a pagar."
        else:
            quando_iso = em_iso or now_iso()
            valor = valor_pela_data(x, quando_iso[:10])  # internet: R$ 99,90 até o vencimento, R$ 119,90 depois
            db["pagos"][fid] = {"em": quando_iso, "via": str(p.get("via") or "você")[:20], "valor": valor}
            quando = f" em {date.fromisoformat(m_em.group(1)):%d/%m/%Y}" + (f" às {m_em.group(2)}:{m_em.group(3)}" if m_em.group(2) else "") if em else ""
            msg = f"✓ {x['nome']} paga: {fmt_brl(valor)}{quando}."
        save_db(db)
    return {"ok": True, "status": "pago", "id": fid, "mensagem": msg}


def cartao(p: dict[str, Any]) -> dict[str, Any]:
    """Cadastro de cartões pela tela: {id?, nome, bandeira, dono, usam, fecha, vence, no_fechamento, tipo, ativo} ou {id, apagar}.
    Função (tipo): credito, debito, ambos, prepago (sai na hora, como o débito) ou beneficio (Alelo, VR…; "vale" é o nome antigo),
    com "beneficio_de": refeicao, alimentacao, ambos ou multi. Bandeira é só a rede (Visa, Elo…; "Sem bandeira" na rede própria).
    Sem os dias de fechamento e vencimento o cartão fica só como registro (não monta fatura)."""
    with file_lock():
        db = load_db()
        lst = db.setdefault("cartoes", [])
        cid = str(p.get("id") or "")
        k = _cartao(db, cid) if cid else None
        if cid and not k:
            raise Falha("Cartão não encontrado.")
        if p.get("apagar"):
            rot = rotulo_cartao(k, db.get("cartoes") or [])
            usa = lambda c, pg: pg.get("cartao") == cid or (_tipo_pag(pg) == "Benefício" and (cartao_na_hora(c, pg) or {}).get("id") == cid)  # noqa: E731
            ligadas = [c for c in db["compras"] if any(usa(c, pg) for pg in (c.get("pagamentos") or []) + _pgs_fin(c))]
            fats = [fid for fid, f in (db.get("faturas_banco") or {}).items() if f.get("cartao") == cid]
            if ligadas and not p.get("tudo"):
                raise Falha(f"O {rot} tem {len(ligadas)} {'compra' if len(ligadas) == 1 else 'compras'}"
                            f"{f' e {len(fats)} fatura lida' if len(fats) == 1 else f' e {len(fats)} faturas lidas' if fats else ''}. "
                            "Para guardar o histórico, desmarque \"Em uso\"; ou apague o cartão com tudo.")
            if p.get("tudo"):
                # junto com o cartão: as compras dele (só as pagas inteiras com ele), as faturas lidas e as marcas de pago
                mistas = [c for c in ligadas if any(not usa(c, pg) for pg in _pgs_fin(c))]
                if mistas:
                    raise Falha(f"{len(mistas)} {'compra foi paga' if len(mistas) == 1 else 'compras foram pagas'} em parte com outra forma "
                                f"(ex.: {nome_loja(mistas[0]['loja'])}). Ajuste o pagamento delas antes de apagar o {rot} com tudo.")
                ids = {c["id"] for c in ligadas}
                db["compras"] = [c for c in db["compras"] if c["id"] not in ids]
                for fid in fats:
                    db["faturas_banco"].pop(fid, None)
                for chave in [x for x in (db.get("pagos") or {}) if x.split(":")[0] == cid]:
                    db["pagos"].pop(chave)
            lst.remove(k)
            save_db(db)  # o backup do dia (dados/backups) guarda o arquivo de antes
            extra = f", com {len(ligadas)} {'compra' if len(ligadas) == 1 else 'compras'} e {len(fats)} {'fatura' if len(fats) == 1 else 'faturas'}" if p.get("tudo") else ""
            return {"ok": True, "status": "cartao", "id": cid, "mensagem": f"Cartão {rot} apagado{extra}."}
        nome = norm_txt(str(p.get("nome") or ""))[:8]
        if not nome and k:
            nome = k["nome"]  # editar sem sigla: fica a que já tinha
        if not nome:  # cartão novo sem sigla: as iniciais do banco (Banco do Brasil → BB, Nubank → NU), sem repetir no mesmo titular
            bn = [w for w in norm_txt(BANCOS_EMISSORES.get(str(p.get("emissor") or ""), "") or "CARTAO").split() if w not in ("DO", "DA", "DE", "DOS", "DAS")]
            base = ("".join(w[0] for w in bn) if len(bn) > 1 else bn[0][:2])[:6] or "CT"
            nome, n = base, 2
            while any(x["nome"] == nome and x.get("dono") == p.get("dono") for x in lst):
                nome, n = f"{base}{n}", n + 1
        if any(x["nome"] == nome and x.get("dono") == p.get("dono") and x["id"] != cid for x in lst):
            raise Falha(f"{p.get('dono')} já tem um cartão {nome}.")
        band = p.get("bandeira") or "Outra"
        if band not in BANDEIRAS_CARTAO:
            raise Falha("Bandeira desconhecida.")
        dono = p.get("dono")
        if dono not in compradores():
            raise Falha("Quem é o titular?")
        usam = [x for x in compradores() if x in (p.get("usam") or []) or x == dono]

        def dia(v: Any) -> int | None:
            if v in (None, ""):
                return None
            try:
                n = int(v)
            except (TypeError, ValueError):
                n = 0
            if not 1 <= n <= 31:
                raise Falha("Dia do fechamento/vencimento: de 1 a 31.")
            return n
        tipo = p.get("tipo") or ("ambos" if p.get("debito") else "credito")
        tipo = "beneficio" if tipo == "vale" else tipo
        if tipo not in ("credito", "debito", "ambos", "prepago", "beneficio"):
            raise Falha("Função do cartão: crédito, débito, crédito e débito, pré-pago ou benefício.")
        fecha, vence = (dia(p.get("fecha")), dia(p.get("vence"))) if tipo in ("credito", "ambos") else (None, None)
        if (fecha is None) != (vence is None):
            raise Falha("Preencha o fechamento e o vencimento (ou deixe os dois em branco).")
        if fecha is not None and fecha == vence:
            raise Falha("O fechamento e o vencimento não podem ser no mesmo dia.")
        if not k:
            base = nome.replace(" ", "").lower() or "cartao"
            cid, n = base, 2
            while _cartao(db, cid):
                cid, n = f"{base}{n}", n + 1
            k = {"id": cid}
            lst.append(k)
        if "modelo" in p:  # modelo do desenho (catálogo da tela: bb-ourocard-debito…); vazio: o padrão do banco
            mo = re.sub(r"[^a-z0-9-]", "", str(p.get("modelo") or "").lower())[:40]
            if mo:
                k["modelo"] = mo
            else:
                k.pop("modelo", None)
        if "emissor" in p:  # banco do cartão (nome, cor e logo na tela); a leitura da fatura em PDF é o campo "banco"
            e = str(p.get("emissor") or "")
            if e and e not in BANCOS_EMISSORES:
                raise Falha("Banco desconhecido.")
            if e:
                k["emissor"] = e
            else:
                k.pop("emissor", None)
        if "banco" in p:  # banco da fatura em PDF (para ler as faturas) e finais do cartão (lista ou o texto antigo, um por linha)
            from .faturas_banco import BANCOS
            if p["banco"] and p["banco"] not in BANCOS:
                raise Falha("A leitura da fatura em PDF existe só para Santander, BB, Bradesco, Itaú, BRB, BTG, Caixa, Inter e Nubank.")
            if p["banco"] and any(x.get("banco") == p["banco"] and x["id"] != k.get("id") for x in lst):
                raise Falha("Outro cartão já usa esse banco.")
            k["banco"] = p["banco"] or None
        if "finais" in p:  # lista da tela [{final, quem, tipo, parado}] ou o texto antigo, um por linha
            antigos, finais = k.get("finais") or {}, {}
            entrada = p.get("finais")
            if not isinstance(entrada, list):
                entrada = []
                for ln in str(p.get("finais") or "").splitlines():
                    m = re.fullmatch(r"\s*(\d{4})\s+(\S+)\s*(.*?)\s*", ln)
                    if not ln.strip():
                        continue
                    if not m or m[2] not in compradores():
                        raise Falha(f"Finais: escreva \"1234 {(compradores() or ['Nome'])[0]} físico\" (um por linha). Não entendi: {ln.strip()[:30]}")
                    entrada.append({"final": m[1], "quem": m[2], "tipo": m[3], "parado": (antigos.get(m[1]) or {}).get("parado")})
            for x in entrada:
                f, quem, par = str(x.get("final") or "").strip(), x.get("quem"), str(x.get("parado") or "")
                if not f and not str(x.get("tipo") or "").strip():
                    continue
                if not re.fullmatch(r"\d{4}", f):
                    raise Falha(f"Final do cartão: são os 4 últimos números. Não entendi: {f[:10] or 'vazio'}")
                if f in finais:
                    raise Falha(f"O final {f} está duas vezes.")
                if quem not in compradores():
                    raise Falha(f"Final {f}: de quem é?")
                if par and not (re.fullmatch(r"\d{4}-\d{2}-\d{2}", par) and "2000-01-01" <= par <= date.today().isoformat()):
                    raise Falha(f"Final {f}: o dia em que parou não pode ser no futuro.")
                velho = antigos.get(f) or {}
                finais[f] = {"quem": quem, "tipo": str(x.get("tipo") or "").strip()[:40]}
                if par:  # parado: guarda o dia e o aviso já visto; em uso: continua "para avaliar" até decidirem no sino
                    finais[f]["parado"] = par
                    if velho.get("visto_ate"):
                        finais[f]["visto_ate"] = velho["visto_ate"]
                elif velho.get("avaliar"):
                    finais[f]["avaliar"] = True
            k["finais"] = finais
        if "categoria" in p:  # categoria da bandeira (Infinite, Black, Platinum…): aparece no cartão, embaixo da bandeira
            cat = re.sub(r"\s+", " ", str(p.get("categoria") or "")).strip()[:20]
            if cat:
                k["categoria"] = cat
            else:
                k.pop("categoria", None)
        if "apelido" in p:  # nome para mostrar ("Bradesco Prime"); vazio: a tela usa o banco e o nome no cartão
            ap = re.sub(r"\s+", " ", str(p.get("apelido") or "")).strip()[:24]
            if ap:
                k["apelido"] = ap
            else:
                k.pop("apelido", None)
        if "visual" in p:  # nome escrito no cartão (como vocês escreveram) e o desenho da v2: cor do banco ou preto com detalhe prata/dourado
            v = p.get("visual") or {}
            vis = {"estilo": "preto", "metal": "dourado" if v.get("metal") == "dourado" else "prata"} if v.get("estilo") == "preto" else {}
            if (prod := re.sub(r"\s+", " ", str(v.get("produto") or "")).strip()[:24]):
                vis["produto"] = prod
            if vis:
                k["visual"] = vis
            else:
                k.pop("visual", None)
        k.update({"nome": nome, "bandeira": band, "dono": dono, "usam": usam, "fecha": fecha, "vence": vence,
                  "no_fechamento": "atual" if p.get("no_fechamento") == "atual" else "proxima",
                  "credito": tipo in ("credito", "ambos"), "debito": tipo in ("debito", "ambos", "prepago"), "ativo": bool(p.get("ativo", True))})
        if tipo == "beneficio":  # "vale" por dentro: sai na hora, no saldo de refeição ou alimentação
            k["vale"] = True
            k["beneficio_de"] = p.get("beneficio_de") if p.get("beneficio_de") in BENEFICIOS else k.get("beneficio_de") or "ambos"
        else:
            k.pop("vale", None)
            k.pop("beneficio_de", None)
        if tipo == "beneficio":
            k.pop("categoria", None)  # benefício não tem categoria (Gold, Black…)
        if tipo == "prepago":
            k["prepago"] = True
        else:
            k.pop("prepago", None)
        save_db(db)
    return {"ok": True, "status": "cartao", "id": cid, "mensagem": f"Cartão {nome} salvo."}


def lembretes(p: dict[str, Any]) -> dict[str, Any]:
    """Para a automação de hora em hora: "avisar" (o que mandar e para quem, pelo ⚙ Avisos e Pessoas). "avisos" é o formato
    antigo (10h, 13h e 19h, para os celulares escritos na automação), mantido enquanto a automação antiga existir."""
    hora = str(p.get("hora") or "10")
    with file_lock():
        db0 = load_db()
        if db0.get("financiamentos"):  # TR nova do Banco Central (no máximo uma consulta a cada 6 horas; sem rede, segue)
            from .financiamento import atualizar_tr
            try:
                if atualizar_tr(db0):
                    save_db(db0)
            except Exception:  # noqa: BLE001 - a TR é acessório dos lembretes
                pass
    from .avisos import lembretes as _lembretes  # aqui dentro: avisos importa dados, e cartões é importado cedo
    avisar = _lembretes(db0, faturas(db0) + contas(db0), int(hora) if hora.isdigit() else 10)
    hoje = date.today()
    amanha = (hoje + timedelta(days=1)).isoformat()
    with file_lock():
        db = load_db()
    avisos = []
    for x in faturas(db) + contas(db):
        if x["pago"] or (x.get("a_pagar") is not None and x["a_pagar"] <= 0.004):  # quitada antes (antecipação): nada a avisar
            continue
        x = {**x, "total": x.get("a_pagar", x["total"])}  # com antecipação, o aviso diz o que falta pagar
        v = x["vence"]
        if v == hoje.isoformat():
            n = {"10": 1, "13": 2, "19": 3}.get(hora, 1)
            avisos.append({"id": x["id"], "titulo": f"{x['icone']} {x['nome']} vence hoje", "mensagem": f"{fmt_brl(x['total'])} · aviso {n} de 3. Já pagou? Toque em ✓ Paguei."})
        elif v == amanha and hora == "10":
            avisos.append({"id": x["id"], "titulo": f"{x['icone']} {x['nome']} vence amanhã", "mensagem": f"{fmt_brl(x['total'])} · vence {date.fromisoformat(v):%d/%m}."})
        elif v < hoje.isoformat() and hora == "10":
            dias = (hoje - date.fromisoformat(v)).days
            avisos.append({"id": x["id"], "titulo": f"⚠ {x['nome']} atrasada", "mensagem": f"{fmt_brl(x['total'])} · venceu há {dias} {'dia' if dias == 1 else 'dias'} ({date.fromisoformat(v):%d/%m})."})
    return {"ok": True, "status": "lembretes", "avisos": avisos, "avisar": avisar}
