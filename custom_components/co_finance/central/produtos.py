"""Produtos, preços, comparação entre compras, biblioteca de nomes e o "Já comprei?"."""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from .config import BASE_DIR
from .base import Falha, _data_curta, fmt_brl, nome_loja, norm_txt
from .dados import apelidos_de, compradores, file_lock, load_db, pessoas, save_db


def chave_produto(item: dict[str, Any], cnpj: str) -> str:
    # Embalado: código de barras vale em qualquer loja. Pesado/hortifrúti: código interno é de cada loja.
    if item.get("ean"):
        return f"ean:{item['ean']}"
    desc = re.sub(r"\s+", " ", re.sub(r"[^A-Z0-9 ]", " ", (item.get("descricao") or "").upper())).strip()
    return f"loja:{cnpj[:8]}:{desc}"


def historico_precos(db: dict[str, Any]) -> dict[str, list[dict[str, Any]]]:
    hist: dict[str, list[dict[str, Any]]] = {}
    for c in db["compras"]:
        for i in c.get("itens") or []:
            if i.get("unit") is None:
                continue
            hist.setdefault(chave_produto(i, c["loja"].get("cnpj", "")), []).append({
                "data": c.get("emissao"), "loja": nome_loja(c["loja"]), "unit": i["unit"],
                "un": i.get("un"), "promo": i.get("promo"), "compra": c["id"], "descricao": i.get("descricao")})
    for v in hist.values():
        v.sort(key=lambda h: h["data"] or "")
    return hist


# Variação de preço: cada compra só é comparada com o que já existia na data dela (nunca com compra
# posterior), com a compra anterior do mesmo produto no MESMO mercado e na mesma medida (kg, L ou unidade).
VAR_LISTA = 0.05  # listas "Subiram/Baixaram de preço" (as setas do cupom aparecem a partir de 3%, no card)


def _mesma_loja(a: dict[str, Any], b: dict[str, Any]) -> bool:
    return (a["cnpj8"] or a["loja"]) == (b["cnpj8"] or b["loja"])


def _comparar(a: dict[str, Any], b: dict[str, Any]) -> float | None:
    """Quanto o preço de b mudou sobre a (mesmo produto). None quando as medidas não batem."""
    if not a["unit"] or a["un"] != b["un"]:
        return None
    pa, pb = a["unit"], b["unit"]
    if a["chave"] != b["chave"] and a["un"] != "KG":  # produtos juntados: confere o tamanho da embalagem
        ta, tb = _tamanhos({a["descricao"]}), _tamanhos({b["descricao"]})
        if ta != tb:
            if len(ta) != 1 or len(tb) != 1:
                return None
            pa, pb = pa / float(next(iter(ta))), pb / float(next(iter(tb)))  # preço por grama/ml
    return (pb - pa) / pa if pa else None


def _variacao(ent: list[dict[str, Any]], e: dict[str, Any]) -> tuple[dict[str, Any] | None, float | None]:
    """Compra anterior comparável (mesmo mercado, data anterior) e a variação até e."""
    for a in reversed(ent):
        if (a["data"] or "") < (e["data"] or "") and _mesma_loja(a, e):
            v = _comparar(a, e)
            if v is not None:
                return a, v
    return None, None


def variacoes(db: dict[str, Any], limite: float = VAR_LISTA) -> dict[str, list[dict[str, Any]]]:
    """Último preço de cada produto em cada mercado contra a compra anterior ali."""
    sub, baix = [], []
    for k, ent in _entradas(db).items():
        ultimos: dict[str, dict[str, Any]] = {}
        for e in ent:
            ultimos[e["cnpj8"] or e["loja"]] = e
        for e in ultimos.values():
            if e.get("manual"):
                continue  # lançado à mão: o valor é o da compra, não preço por unidade
            a, v = _variacao(ent, e)
            if a is None or abs(v) < limite:
                continue
            (sub if v > 0 else baix).append({
                "produto": k, "descricao": e["descricao"], "de": a["unit"], "para": e["unit"],
                "variacao": round(v, 4), "loja": e["loja"], "area": (db["categoria_loja"].get(e["cnpj8"] or "") or [None])[0], "data": e["data"], "data_antes": a["data"],
                "un": e["un"], "promo_antes": a["promo"], "promo_agora": e["promo"]})
    ordem = lambda x: x["data"] or ""  # noqa: E731
    return {"subiram": sorted(sub, key=ordem, reverse=True)[:30], "baixaram": sorted(baix, key=ordem, reverse=True)[:30]}


# Biblioteca (compras/biblioteca.json): abreviações das notas ("AMAC" = amaciante) e o tipo de cada produto
# (Amaciante, Iogurte…) com a seção (Limpeza, Laticínios…). Vocês podem corrigir o tipo no card: fica em
# db["tipo_produto"] {chave do produto: tipo}. Sem a biblioteca tudo funciona, só sem tipo.
# A biblioteca vem junto com o código (ao lado deste arquivo); uma biblioteca.json na pasta dos dados tem a preferência.
BIBLIOTECA_PATH = BASE_DIR / "biblioteca.json"
if not BIBLIOTECA_PATH.exists():
    BIBLIOTECA_PATH = Path(__file__).resolve().parent / "biblioteca.json"


_BIB: dict[str, Any] | None = None


PALAVRAS_VAZIAS = {"KG", "UN", "GR", "ML", "TRADICIONAL", "SUPER", "FRUTA", "BANDEJA", "POTE", "CAIXINHA", "SACHE",
                   "LATA", "VIDRO", "COM", "SEM", "EXTRA", "NATURAL", "FATIADO", "ORIGINAL", "CLASSIC", "CLASSICA",
                   "PACK", "UNID", "CAIXA", "PET", "LIQUIDO", "DOS", "DAS", "COMPL"}


def biblioteca() -> dict[str, Any]:
    global _BIB
    if _BIB is None:
        try:
            b = json.loads(BIBLIOTECA_PATH.read_text(encoding="utf-8"))
            b["_tipos"] = [(t["tipo"], t["secao"], [re.compile(x) for x in t["padroes"]]) for t in b.get("tipos", [])]
            b["_ncm"] = sorted(b.get("ncm_produtos", []), key=lambda x: -len(x[0]))
            b["_abrev"] = [(re.compile(rf"\b{re.escape(norm_txt(k))}\b"), norm_txt(v))
                           for k, v in sorted(b.get("abreviacoes", {}).items(), key=lambda kv: -len(kv[0])) if v]
        except Exception:  # sem biblioteca (ou com erro): segue sem tipo
            b = {"_tipos": [], "_abrev": [], "_ncm": [], "ncm_secao": {}}
        _BIB = b
    return _BIB


def ncm_produto(ncm: str | None) -> tuple[str, str, str] | None:
    """NCM do item → (o que é, palavras de busca, categoria da compra), pela biblioteca ("ncm_produtos")."""
    n = re.sub(r"\D", "", ncm or "")
    return next(((t, termos, cat) for pre, t, termos, cat in biblioteca()["_ncm"] if n.startswith(pre)), None) if n else None


def nome_aberto(desc: str) -> str:
    """'AMAC CONC DOWNY' → 'AMACIANTE CONC DOWNY' (para a busca)."""
    n = norm_txt(desc)
    for rx, palavra in biblioteca()["_abrev"]:
        n = rx.sub(palavra, n)
    return n


def _secao_do_tipo(tipo: str) -> str | None:
    return next((s for t, s, _ in biblioteca()["_tipos"] if t == tipo), None)


def _classificar(db: dict[str, Any], k: str, ent: list[dict[str, Any]]) -> dict[str, Any]:
    ncm = next((e["ncm"] for e in reversed(ent) if e.get("ncm")), "") or ""
    tipo = (db.get("tipo_produto") or {}).get(k)
    if tipo:
        secao, via = _secao_do_tipo(tipo), "voces"
    else:
        tipo = secao = via = None
        for desc in [ent[-1]["descricao"]] + [e["descricao"] for e in ent]:
            n = norm_txt(desc)
            achou = next(((t, s) for t, s, pads in biblioteca()["_tipos"] if any(p.search(n) for p in pads)), None)
            if achou:
                tipo, secao, via = achou[0], achou[1], "biblioteca"
                break
        prod = ncm_produto(ncm)
        if not tipo and prod:
            tipo, secao, via = prod[0], prod[2], "ncm"
        if not secao:
            secao = biblioteca().get("ncm_secao", {}).get(ncm[:2])
    abertos = sorted({nome_aberto(d) for d in {e["descricao"] for e in ent}})
    termos = (ncm_produto(ncm) or ("", "", ""))[1]  # ex.: "REF UNIVERSE LG" → também "geladeira refrigerador"
    busca = " ".join(abertos + [norm_txt(tipo or ""), norm_txt(secao or ""), norm_txt(termos)]).lower()
    return {"tipo": tipo, "secao": secao, "tipo_via": via, "ncm": ncm or None, "busca": busca}


def _tamanhos(descs: set[str]) -> set[str]:
    """'1.6L' / '1,02KG' / '500G' → {'1600', '1020', '500'} (gramas ou ml) para comparar embalagens."""
    out = set()
    for d in descs:
        for v, u in re.findall(r"(\d+(?:[.,]\d+)?)\s*(KG|K|GR|G|ML|LT|L)\b", (d or "").upper()):
            x = float(v.replace(",", "."))
            out.add(str(round(x * 1000 if u in ("KG", "K", "L", "LT") else x)))
    return out


def _palavras(ent: list[dict[str, Any]], tipo: str | None) -> set[str]:
    do_tipo = set(norm_txt(tipo or "").split())
    return {w for d in {e["descricao"] for e in ent} for w in nome_aberto(d).split()
            if len(w) >= 3 and not w[0].isdigit() and w not in PALAVRAS_VAZIAS and w not in do_tipo}


def _parecidos(db: dict[str, Any], k: str, ent: list[dict[str, Any]], g: dict[str, list[dict[str, Any]]]) -> list[dict[str, Any]]:
    """Produtos que podem ser o mesmo (para juntar com um toque). Só sugere; quem decide é vocês.
    Mesmo tipo ou mesmo NCM + palavras em comum (marca, sabor) + mesmo tamanho. Dois com código de barras
    diferente nunca são o mesmo produto; só compara com outros mercados."""
    meu = _classificar(db, k, ent)
    pal, tam = _palavras(ent, meu["tipo"]), _tamanhos({e["descricao"] for e in ent})
    tem_ean = any(e["ean"] for e in ent)
    lojas = {e["loja"] for e in ent}
    out = []
    for k2, e2 in g.items():
        if k2 == k or (tem_ean and any(x["ean"] for x in e2)) or lojas & {x["loja"] for x in e2}:
            continue  # no mesmo mercado o mesmo produto já vem com o mesmo nome
        c2 = _classificar(db, k2, e2)
        mesmo_tipo = bool(meu["tipo"]) and c2["tipo"] == meu["tipo"]
        mesmo_ncm = bool(meu["ncm"]) and c2["ncm"] == meu["ncm"]
        comuns = pal & _palavras(e2, c2["tipo"])
        if not (mesmo_tipo or mesmo_ncm) or not comuns:
            continue
        tam2 = _tamanhos({x["descricao"] for x in e2})
        nota = 2 * len(comuns) + 2 * mesmo_tipo + mesmo_ncm + (2 if tam & tam2 else -3 if tam and tam2 else 0)
        if nota >= 5:
            r = _resumo(k2, e2, db)
            r["nota"] = nota
            out.append(r)
    return sorted(out, key=lambda r: -r["nota"])[:4]


def definir_tipo(p: dict[str, Any]) -> dict[str, Any]:
    tipo = str(p.get("tipo") or "").strip()
    if tipo and not _secao_do_tipo(tipo):
        raise Falha("Tipo desconhecido.")
    with file_lock():
        db = load_db()
        k = _grupo(db, str(p.get("chave") or ""))
        if not k:
            raise Falha("Produto não encontrado.")
        tp = db.setdefault("tipo_produto", {})
        if tipo:
            tp[k] = tipo
        else:
            tp.pop(k, None)
        save_db(db)
    return {"ok": True, "status": "alterado", "mensagem": f"Tipo: {tipo}." if tipo else "Tipo voltou ao da biblioteca."}


def _grupo(db: dict[str, Any], k: str) -> str:
    v = db.get("vinculos") or {}
    seen = set()
    while k in v and k not in seen:
        seen.add(k)
        k = v[k]
    return k


def _entradas(db: dict[str, Any], desde: str | None = None, ate: str | None = None) -> dict[str, list[dict[str, Any]]]:
    g: dict[str, list[dict[str, Any]]] = {}
    for c in db["compras"]:
        if desde and (c.get("emissao") or "") < desde:
            continue
        if ate and (c.get("emissao") or "") >= ate:
            continue
        cnpj = (c.get("loja") or {}).get("cnpj", "")
        for i in c.get("itens") or []:
            manual = bool(i.get("manual")) and i.get("unit") is None and (i.get("total") or 0) > 0 and (i.get("descricao") or "").strip()
            if i.get("unit") is None and not manual:
                continue
            k = chave_produto(i, cnpj)
            g.setdefault(_grupo(db, k), []).append({  # o lançado à mão entra para ser achado (1 un, o valor da compra)
                "data": c.get("emissao"), "loja": nome_loja(c["loja"]), "cnpj8": cnpj[:8],
                "unit": i["total"] if manual else i["unit"], "qtd": 1 if manual else i.get("qtd"), "un": (i.get("un") or "").upper(), "total": i.get("total"),
                "promo": bool(i.get("promo")), "manual": bool(manual), "compra": c["id"], "descricao": i.get("descricao") or "",
                "chave": k, "ean": i.get("ean"), "ncm": i.get("ncm"), "quem": c.get("quem"), "categoria": c.get("categoria")})
    for v in g.values():
        v.sort(key=lambda e: e["data"] or "")
    return g


def _por_loja(ent: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    """Último preço de cada mercado (na unidade mais usada do produto)."""
    un = max({e["un"] for e in ent}, key=lambda u: sum(1 for e in ent if e["un"] == u))
    out: dict[str, dict[str, Any]] = {}
    for e in ent:
        if e["un"] == un:
            out[e["loja"]] = {"unit": e["unit"], "data": e["data"], "promo": e["promo"], "un": un}
    return out


def _resumo(k: str, ent: list[dict[str, Any]], db: dict[str, Any] | None = None) -> dict[str, Any]:
    ult = ent[-1]
    lojas = _por_loja(ent)
    barato = min(lojas.items(), key=lambda x: x[1]["unit"]) if lojas else None
    caro = max(lojas.items(), key=lambda x: x[1]["unit"]) if lojas else None
    return {
        **(_classificar(db, k, ent) if db is not None else {}),
        "chave": k, "descricao": ult["descricao"], "ean": next((e["ean"] for e in reversed(ent) if e["ean"]), None),
        "descricoes": sorted({e["descricao"] for e in ent}), "un": ult["un"],
        "vezes": len({e["compra"] for e in ent}), "gasto": round(sum(e["total"] or 0 for e in ent), 2),
        "ultimo": {"unit": ult["unit"], "loja": ult["loja"], "data": ult["data"]},
        "lojas": sorted(lojas), "n_lojas": len(lojas),
        "mais_barato": {"loja": barato[0], "unit": barato[1]["unit"]} if barato else None,
        "mais_caro": {"loja": caro[0], "unit": caro[1]["unit"]} if caro and len(lojas) > 1 else None,
        "min": min(e["unit"] for e in ent), "max": max(e["unit"] for e in ent),
    }


def produtos(_: dict[str, Any]) -> dict[str, Any]:
    with file_lock():
        db = load_db()
    g = _entradas(db)
    lista = [_resumo(k, v, db) for k, v in g.items()]
    lista.sort(key=lambda r: r["ultimo"]["data"] or "", reverse=True)
    return {"ok": True, "status": "produtos", "produtos": lista, **_tipos_conhecidos()}


def _tipos_conhecidos() -> dict[str, Any]:
    t = biblioteca()["_tipos"]
    ordem = ["Hortifrúti", "Laticínios", "Carnes e ovos", "Padaria e matinais", "Mercearia", "Congelados",
             "Doces e snacks", "Bebidas", "Limpeza", "Higiene", "Outros"]  # ordem de um corredor de mercado
    secoes = sorted(dict.fromkeys(s for _, s, _ in t), key=lambda s: ordem.index(s) if s in ordem else len(ordem))
    return {"tipos": sorted({x for x, _, _ in t}, key=norm_txt), "secoes": secoes}


def _linhas_juntas(ent: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Histórico do produto: o caixa às vezes passa a mesma coisa várias vezes na mesma nota (4 linhas de 1 un). Na mesma
    compra e no mesmo preço vira uma linha só, com a quantidade somada (4 un × R$ 3,99/un)."""
    out: list[dict[str, Any]] = []
    por: dict[tuple, dict[str, Any]] = {}
    for e in ent:
        k = (e["compra"], e["chave"], e["un"], round(float(e["unit"] or 0), 4), e["promo"])
        if k in por:
            x = por[k]
            x["qtd"] = round(float(x.get("qtd") or 0) + float(e.get("qtd") or 0), 3)
            x["total"] = round(float(x.get("total") or 0) + float(e.get("total") or 0), 2)
        else:
            por[k] = dict(e)
            out.append(por[k])
    return out


def produto(p: dict[str, Any]) -> dict[str, Any]:
    with file_lock():
        db = load_db()
    k = _grupo(db, str(p.get("chave") or ""))
    g = _entradas(db)
    ent = g.get(k)
    if not ent:
        raise Falha("Produto não encontrado.")
    membros = sorted({e["chave"] for e in ent})
    return {"ok": True, "status": "produto", "resumo": _resumo(k, ent, db), "historico": _linhas_juntas(ent),
            "por_loja": _por_loja(ent), "membros": membros, "vinculado": [m for m in membros if m != k],
            "parecidos": _parecidos(db, k, ent, g), **_tipos_conhecidos()}


def vincular(p: dict[str, Any]) -> dict[str, Any]:
    de, para = str(p.get("de") or ""), str(p.get("para") or "")
    if not de or not para:
        raise Falha("Escolha os dois produtos.")
    with file_lock():
        db = load_db()
        v = db.setdefault("vinculos", {})
        de_g, para_g = _grupo(db, de), _grupo(db, para)
        if de_g == para_g:
            raise Falha("Esses produtos já estão juntos.")
        v[de_g] = para_g
        save_db(db)
    return {"ok": True, "status": "vinculado", "chave": para_g, "mensagem": "Produtos juntados: agora aparecem como um só."}


def desvincular(p: dict[str, Any]) -> dict[str, Any]:
    k = str(p.get("chave") or "")
    with file_lock():
        db = load_db()
        v = db.setdefault("vinculos", {})
        if k not in v:
            raise Falha("Esse produto não estava juntado.")
        del v[k]
        save_db(db)
    return {"ok": True, "status": "desvinculado", "mensagem": "Produto separado de novo."}


def consultar(p: dict[str, Any]) -> dict[str, Any]:
    """Atalho "Já comprei?": código de barras lido pela câmera (ou um nome) → o que foi pago, quando e onde.
    Só lê; não grava nada."""
    codigo = re.sub(r"\D", "", str(p.get("codigo") or ""))
    termo = norm_txt(str(p.get("termo") or ""))
    # "quem" pode ser o nome da pessoa ou o nome do iPhone ("iPhone Júlia", "Iphone JuliaSilva" — nomes de exemplo): procura em todas as palavras
    escolha = norm_txt(str(p.get("quem") or "")).split()
    quem = next((x["nome"] for w in escolha for x in pessoas() if any(w.startswith(n) for n in apelidos_de(x))), (compradores() or [None])[0])
    if not codigo and not termo:
        raise Falha("Mande o código de barras ou o nome do produto.")
    with file_lock():
        db = load_db()
    g = _entradas(db)
    if codigo:
        alvo = codigo.lstrip("0")
        achou = {k: e for k, e in g.items() if any((x.get("ean") or "").lstrip("0") == alvo for x in e)}
        procura = f"código {codigo}"
    else:
        palavras = termo.lower().split()
        achou = {k: e for k, e in g.items() if all(re.search(rf"\b{re.escape(w)}", _classificar(db, k, e)["busca"]) for w in palavras)}
        procura = f"\"{str(p.get('termo')).strip()}\""
    if not achou:
        dica = " Tente pelo nome (produto sem código de barras na nota não aparece pelo código)." if codigo else ""
        return {"ok": True, "status": "consulta", "titulo": "Ainda não comprou", "quem": quem,
                "mensagem": f"Não achei {procura} nas compras.{dica}"}
    blocos = []
    for k, e in sorted(achou.items(), key=lambda kv: kv[1][-1]["data"] or "", reverse=True)[:3]:
        e = list({x["compra"]: x for x in e}.values())  # um por compra (o mesmo item pode vir em várias linhas)
        ult = e[-1]
        med = "/kg" if ult["un"] in ("KG", "KGS") else ""
        linhas = [f"{ult['descricao']} — {len(e)}×",
                  f"Última: {fmt_brl(ult['unit'])}{med} em {_data_curta(ult['data'])} · {ult['loja']}{' (promoção)' if ult['promo'] else ''}"]
        if len(e) > 1:
            ant = e[-2]
            linhas.append(f"Antes: {fmt_brl(ant['unit'])}{med} em {_data_curta(ant['data'])} · {ant['loja']}")
            menor = min(e, key=lambda x: x["unit"])
            if menor["unit"] < min(ult["unit"], ant["unit"]):
                linhas.append(f"Menor: {fmt_brl(menor['unit'])}{med} em {_data_curta(menor['data'])} · {menor['loja']}")
        blocos.append("\n".join(linhas))
    mais = f"\n(+{len(achou) - 3} outros no card, aba Produtos)" if len(achou) > 3 else ""
    return {"ok": True, "status": "consulta", "titulo": "Já comprou", "quem": quem, "achados": len(achou),
            "mensagem": "\n\n".join(blocos) + mais}
