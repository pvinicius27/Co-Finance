"""Painel de finanças: visão geral, seções dos itens e janela da seção."""
from __future__ import annotations

import re
from datetime import datetime
from typing import Any

from .base import nome_loja
from .dados import file_lock, load_db
from .pagamentos import data_efetiva, pago_com, valor_efetivo
from .produtos import _classificar, _entradas, _grupo, _por_loja, _resumo, _variacao, chave_produto


def visao(p: dict[str, Any]) -> dict[str, Any]:
    """Gastos do período (mes=AAAA-MM, ou dias; 0/nada = tudo). Comparação de preços entre mercados usa
    sempre os últimos 12 meses (ou tudo), porque um mês só quase nunca tem o mesmo produto em dois mercados."""
    from datetime import timedelta
    dias, mes = p.get("dias"), str(p.get("mes") or "")
    desde = ate = None
    if re.fullmatch(r"\d{4}-\d{2}", mes):
        a, m_ = int(mes[:4]), int(mes[5:])
        desde, ate = f"{mes}-01", f"{a + m_ // 12}-{m_ % 12 + 1:02d}-01"
    elif re.fullmatch(r"\d{4}-\d{2}", str(p.get("de") or "")):  # desde o mês "de" (ex.: últimos 12 meses do calendário)
        desde = f"{p['de']}-01"
    elif dias:
        desde = (datetime.now() - timedelta(days=int(dias))).strftime("%Y-%m-%d")
    desde_precos = None if not desde else (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d")
    with file_lock():
        db = load_db()
    compras = [c for c in db["compras"]
               if (not desde or (c.get("emissao") or "") >= desde) and (not ate or (c.get("emissao") or "") < ate)
               and not (c.get("moeda") and not c.get("valor_pago"))]  # em outra moeda sem valor em R$: fora dos totais
    mercados: dict[str, dict[str, Any]] = {}
    for c in compras:
        m = mercados.setdefault(nome_loja(c["loja"]), {"gasto": 0.0, "compras": 0, "itens": 0})
        m["gasto"] = round(m["gasto"] + (valor_efetivo(c) or 0), 2)
        m["compras"] += 1
        m["itens"] += c.get("qtd_itens") or 0
    por_tipo: dict[str, float] = {}
    por_cartao: dict[tuple[str, str | None], float] = {}
    for c in compras:
        for pg in pago_com(c):
            t = pg["tipo"] or "Não informado"
            por_tipo[t] = round(por_tipo.get(t, 0) + (pg["valor"] or 0), 2)
            por_cartao[(t, pg["dono"])] = round(por_cartao.get((t, pg["dono"]), 0) + (pg["valor"] or 0), 2)
    pagamentos = {"por_tipo": sorted(({"tipo": k, "valor": v} for k, v in por_tipo.items()), key=lambda x: -x["valor"]),
                  "por_cartao": sorted(({"tipo": k[0], "dono": k[1], "valor": v} for k, v in por_cartao.items()), key=lambda x: -x["valor"])}
    g = _entradas(db, desde, ate)
    resumos = [_resumo(k, v, db) for k, v in g.items()]

    # Comparáveis: produto comprado em 2+ mercados (mesma unidade) nos últimos 12 meses
    comparaveis, rank = [], {}
    economia = 0.0
    for k, ent in _entradas(db, desde_precos).items():
        lojas = _por_loja(ent)
        if len(lojas) < 2:
            continue
        menor = min(x["unit"] for x in lojas.values())
        r = _resumo(k, ent)
        comparaveis.append({"chave": k, "descricao": r["descricao"], "un": r["un"],
                            "lojas": {l: x["unit"] for l, x in lojas.items()},
                            "mais_barato": r["mais_barato"], "diferenca": round((r["mais_caro"]["unit"] - menor) / menor, 4) if menor else 0})
        for l, x in lojas.items():
            s = rank.setdefault(l, {"comparados": 0, "mais_barato": 0, "acima": []})
            s["comparados"] += 1
            if x["unit"] == menor:
                s["mais_barato"] += 1
            s["acima"].append((x["unit"] - menor) / menor if menor else 0)
        for e in ent:  # quanto teria economizado pagando o menor preço visto
            if e["un"] == ent[-1]["un"] and e["unit"] > menor:
                economia += (e["unit"] - menor) * (e["qtd"] or 1)
    ranking = sorted(({"loja": l, "comparados": s["comparados"], "mais_barato": s["mais_barato"],
                       "media_acima": round(sum(s["acima"]) / len(s["acima"]), 4)} for l, s in rank.items()),
                     key=lambda x: (x["media_acima"], -x["mais_barato"]))
    comparaveis.sort(key=lambda x: x["diferenca"], reverse=True)
    return {"ok": True, "status": "visao", "desde": desde, "ate": ate, "mes": mes or None,
            "precos_desde": desde_precos,
            "total": round(sum(valor_efetivo(c) or 0 for c in compras), 2), "compras": len(compras),
            "pagamentos": pagamentos,
            "mercados": sorted(({"loja": k, **v} for k, v in mercados.items()), key=lambda x: -x["gasto"]),
            "top_gasto": sorted(resumos, key=lambda r: -r["gasto"])[:10],
            "mais_comprados": sorted(resumos, key=lambda r: (-r["vezes"], -r["gasto"]))[:10],
            "ranking": ranking, "comparaveis": comparaveis[:15], "economia_possivel": round(economia, 2),
            "n_produtos": len(resumos)}


def painel(_: dict[str, Any]) -> dict[str, Any]:
    """Painel novo (prévia): quanto de cada compra foi para cada seção dos itens (Hortifrúti, Carnes…).
    Só lê. O card soma por período; a soma das seções é ajustada ao valor pago da compra."""
    with file_lock():
        db = load_db()
    g = _entradas(db)
    partes: dict[str, dict[str, float]] = {}
    secoes: set[str] = set()
    for k, ents in g.items():
        s = _classificar(db, k, ents)["secao"] or "Outros"
        secoes.add(s)
        for e in ents:
            d = partes.setdefault(e["compra"], {})
            d[s] = round(d.get(s, 0.0) + (e["total"] or 0.0), 2)
    return {"ok": True, "status": "painel", "partes": partes, "secoes": sorted(secoes)}


def itens(p: dict[str, Any]) -> dict[str, Any]:
    """Painel: os produtos de algumas compras (opcional: só de uma seção, ex. Hortifrúti), com a mesma
    comparação de preço do cupom e quanto de cada nota foi para a seção. Só lê."""
    ids = [str(x) for x in (p.get("ids") or [])][:400]
    secao = p.get("secao") or None
    with file_lock():
        db = load_db()
    g = _entradas(db)
    cache: dict[str, str] = {}
    def secao_de(k: str) -> str:
        if k not in cache:
            cache[k] = (_classificar(db, k, g[k])["secao"] if k in g else None) or "Outros"
        return cache[k]
    por_id = {c["id"]: c for c in db["compras"]}
    lista, notas = [], []
    for cid in ids:
        c = por_id.get(cid)
        if not c:
            continue
        cnpj = (c.get("loja") or {}).get("cnpj", "")
        parte = 0.0
        for n, i in enumerate(c.get("itens") or []):
            k = _grupo(db, chave_produto(i, cnpj)) if i.get("unit") is not None else None
            if secao and (not k or secao_de(k) != secao):
                continue
            item = {"compra": cid, "n": n, "data": data_efetiva(c), "loja": nome_loja(c["loja"]), "descricao": i.get("descricao") or "",
                    "qtd": i.get("qtd"), "un": i.get("un"), "unit": i.get("unit"), "total": i.get("total"), "ean": i.get("ean"),
                    "codigo": i.get("codigo"), "promo": bool(i.get("promo")), "chave": k, "comparacao": None}
            if c.get("origem") == "manual":  # "O que comprou" de uma compra sem nota
                item.update({"manual": True, "applepay": c.get("via") == "applepay", "moeda": c.get("moeda")})
            if k:
                e = {"data": c.get("emissao"), "loja": nome_loja(c["loja"]), "cnpj8": cnpj[:8], "unit": i["unit"],
                     "un": (i.get("un") or "").upper(), "chave": chave_produto(i, cnpj), "descricao": i.get("descricao") or ""}
                a, v = _variacao(g.get(k, []), e)
                if a:
                    item["comparacao"] = {"de": a["unit"], "data": a["data"], "variacao": round(v, 4)}
            parte += i.get("total") or 0.0
            lista.append(item)
        if not c.get("itens") and not secao:  # lançada à mão: a própria compra vira a linha (com o valor em R$ que vocês deram)
            lista.append({"compra": cid, "n": -1, "data": data_efetiva(c), "loja": nome_loja(c["loja"]),
                          "descricao": c.get("observacao") or "Compra lançada à mão", "qtd": None, "un": None, "unit": None,
                          "total": valor_efetivo(c) or 0.0, "ean": None, "codigo": None, "promo": False, "chave": None,
                          "comparacao": None, "manual": True, "applepay": c.get("via") == "applepay", "moeda": c.get("moeda")})
            parte += valor_efetivo(c) or 0.0
        notas.append({"id": cid, "data": data_efetiva(c), "loja": nome_loja(c["loja"]), "quem": c.get("quem"),
                      "valor_pago": valor_efetivo(c), "valor_itens": round(parte, 2), "moeda": c.get("moeda"),
                      "valor_nota": c.get("valor_pago"), "cobrado": c.get("cobrado"),
                      "manual": c.get("origem") == "manual",
                      "desconto": c.get("desconto") or 0.0, "valor_produtos": c.get("valor_produtos")})
    lista.sort(key=lambda x: (x["data"] or "", x["n"]), reverse=True)
    return {"ok": True, "status": "itens", "secao": secao, "itens": lista, "notas": notas}
