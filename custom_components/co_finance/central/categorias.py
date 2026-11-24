"""Categorias em dois níveis, regras por loja/descrição/NCM e as telas de categorias e regras."""
from __future__ import annotations

import html
import re
from typing import Any

from .config import CLASSE_POR_DESCRICAO, CLASSE_POR_ITEM_MANUAL, CLASSE_POR_NCM, CLASSE_POR_NOME, NOTAS_DIR
from .base import Falha, nome_loja, norm_txt
from .dados import file_lock, load_db, save_db
from .pagamentos import data_efetiva, valor_efetivo
from .produtos import biblioteca, ncm_produto


def _ramo(db: dict[str, Any], cat: str | None) -> dict[str, Any] | None:
    return next((a for a in db.get("arvore") or [] if a["nome"] == cat), None)


def checar_classe(db: dict[str, Any], cat: Any, sub: Any) -> tuple[str, str | None]:
    """Categoria e subcategoria válidas na árvore (Mercado e categorias sem subcategoria aceitam vazio)."""
    r = _ramo(db, cat)
    if not r:
        raise Falha("Categoria desconhecida.")
    sub = (str(sub).strip() or None) if sub is not None else None
    if r.get("pelos_itens"):
        return cat, None
    if sub is None:
        return cat, (r["subs"][0] if r.get("subs") else None)
    if sub not in (r.get("subs") or []):
        raise Falha(f"Subcategoria desconhecida em {cat}.")
    return cat, sub


def _e_comida(ncm: str) -> bool:
    return bool(ncm) and ("01" <= ncm[:2] <= "24" or ncm[:2] in ("33", "34", "48"))


def classe_item(i: dict[str, Any]) -> tuple[str, str | None] | None:
    """O que é o item, em (categoria, subcategoria): pela descrição, depois pelo NCM. Comida/limpeza → None."""
    desc = norm_txt(i.get("descricao") or "")
    for rx, cat, sub in CLASSE_POR_DESCRICAO:
        if re.search(rx, desc):
            return cat, sub
    ncm = re.sub(r"\D", "", str(i.get("ncm") or ""))
    if not ncm or _e_comida(ncm):
        return None
    return next(((cat, sub) for pre, cat, sub in CLASSE_POR_NCM if ncm.startswith(pre)), None)


def classe_por_itens(itens: list[dict[str, Any]]) -> tuple[str, str | None] | None:
    """Quando os itens deixam claro: 60%+ do valor identificado numa só (categoria, sub) e o identificado é 40%+ do total."""
    total = sum(i.get("total") or 0 for i in itens) or 0
    por: dict[tuple[str, str | None], float] = {}
    for i in itens:
        k = classe_item(i)
        if k:
            por[k] = por.get(k, 0) + (i.get("total") or 0)
    if not por or total <= 0:
        return None
    k, v = max(por.items(), key=lambda x: x[1])
    ident = sum(por.values())
    return k if v >= 0.6 * ident and ident >= 0.4 * total else None


def classe_item_manual(descricao: str) -> tuple[str, str | None] | None:
    """"O que comprou" de uma compra sem nota (ex.: "carne moída"): as regras dos itens e, depois, a lista das compras sem nota."""
    k = classe_item({"descricao": descricao})
    if k:
        return k
    d = norm_txt(descricao)
    return next(((cat, sub) for rx, cat, sub in CLASSE_POR_ITEM_MANUAL if re.search(rx, d)), None)


def classe_para(db: dict[str, Any], loja: dict[str, Any], itens: list[dict[str, Any]]) -> tuple[str, str | None, str]:
    """(categoria, subcategoria, de onde veio). Itens claros → regra da loja → nome da loja → comida/limpeza → Outros."""
    def ok(cat, sub, via):
        try:
            return (*checar_classe(db, cat, sub), via)
        except Falha:
            return None
    k = classe_por_itens(itens)
    if k and (r := ok(k[0], k[1], "itens")):
        return r
    regra = (db.get("categoria_loja") or {}).get((loja.get("cnpj") or "")[:8])
    if isinstance(regra, list) and (r := ok(regra[0], regra[1], "loja")):
        return r
    nome = norm_txt(loja.get("nome") or "")
    for rx, cat, sub in CLASSE_POR_NOME:
        if re.search(rx, nome) and (r := ok(cat, sub, "nome da loja")):
            return r
    ncms = [re.sub(r"\D", "", str(i.get("ncm") or "")) for i in itens if i.get("ncm")]
    if ncms and sum(1 for n in ncms if _e_comida(n)) * 10 >= len(ncms) * 6:
        return "Mercado", None, "itens"
    return "Outros", "Outros", "padrão"


def _aplicar_classe(c: dict[str, Any], cat: str, sub: str | None, via: str) -> None:
    c["categoria"], c["subcategoria"], c["classe_via"] = cat, sub, via


# Nome da loja → categoria (ordem importa: "Panificadora e Lanchonete" é padaria; "Sacolão" é hortifrúti).
CATEGORIA_POR_NOME = [
    (r"PANIFICADORA|PADARIA|\bPANIF|\bPAES\b|ACOUGUE|\bCARNES\b|FRIGORIFICO|CASA DE CARNE", "Açougue/Padaria"),
    (r"FARMACIA|DROGARIA|\bDROGA|PHARMA|FARMA\b", "Farmácia"),
    (r"\bPOSTO\b|COMBUSTIVE|PETROLEO|DERIVADOS DE PETR", "Combustível"),
    (r"HORTIFRUTI|HORTI FRUTI|SACOLAO|\bFRUTAS\b|VERDURAS", "Hortifrúti"),
    (r"SUPERMERCADO|\bMERCADO|ATACAD|HIPERMERCADO|MERCEARIA|SECOS E MOLHADOS|EMPORIO|MINIMERCADO", "Mercado"),
    (r"RESTAURANTE|LANCHONETE|PIZZARIA|HAMBURG|BURGER|CHURRASCARIA|SORVETERIA|\bBAR\b|CAFETERIA|ALIMENTACAO", "Restaurante"),
    (r"\bPET\b|PETSHOP|AGROPET|RACOES|VETERINAR", "Pet"),
    (r"CONSTRUCAO|MATERIAIS DE CONSTR|HOME CENTER|FERRAGENS|MADEIREIRA|TINTAS|\bELETRICA\b|HIDRAULICA", "Casa e Construção"),
    (r"ELETRONICO|INFORMATICA|CELULAR|MAGAZINE", "Eletrônicos"),
    (r"PAPELARIA|UTILIDADES|BAZAR|PRESENTES", "Utilidades"),
]


def _texto_nota(c: dict[str, Any]) -> str:
    f = NOTAS_DIR / f"{c.get('chave', '')}.html"
    if not f.exists():
        f = NOTAS_DIR / f"{c.get('chave', '')}.txt"  # NFS-e: texto tirado do PDF
    try:
        return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", f.read_text(encoding="utf-8")))) if f.exists() else ""
    except OSError:
        return ""


def ligar_bem(db: dict[str, Any], c: dict[str, Any]) -> bool:
    """Liga a compra a um bem (placa/chassi na nota, ou item claramente do carro) e lê a KM.
    Não mexe no que vocês escolheram à mão (bem_manual). Devolve True se mudou."""
    if c.get("bem_manual"):
        return False
    t = _texto_nota(c)
    plano = re.sub(r"[\s-]", "", t.upper())
    antes = (c.get("bem"), c.get("km"))
    veic = [b for b in db.get("bens") or [] if b.get("tipo") == "veiculo"]
    finais = {p[-3:] for p in re.findall(r"[A-Z]{3}\d[A-Z0-9]\d{2}", plano)}  # placas escritas na nota (antiga e Mercosul)
    achou = next((b for b in veic if finais & set(b.get("placa_final") or [])), None)  # o cadastro só guarda o final da placa
    if not achou and len(veic) == 1:
        descs = " ".join(norm_txt(i.get("descricao") or "") for i in c.get("itens") or [])
        if re.search(r"AUTOMOTIV|\bPNEU|OLEO MOTOR|OLEO DE MOTOR|\bREVISAO\b|ALINHAMENTO|BALANCEAMENTO", descs) \
                or (c.get("categoria") in ("Veículo", "Carro")):
            achou = veic[0]
    if achou:
        c["bem"] = achou["id"]
        km = re.search(r"\bKM\s*[:.]?\s*(\d{1,3}(?:\.\d{3})+|\d{3,7})\b", t)
        if km and c.get("km_via") != "você":  # o km que vocês informaram não é trocado pelo da nota
            c["km"] = int(km[1].replace(".", ""))
    return (c.get("bem"), c.get("km")) != antes


def categoria_por_itens(itens: list[dict[str, Any]]) -> str | None:
    """Categoria pelo tipo dos produtos (NCM na biblioteca), quando é clara: 60%+ do valor identificado
    numa só categoria e o identificado é 40%+ do total. Comida/limpeza não entra aqui (fica com a loja)."""
    total = sum(i.get("total") or 0 for i in itens) or 0
    por: dict[str, float] = {}
    for i in itens:
        prod = ncm_produto(i.get("ncm"))
        cat = prod[2] if prod else next((t.get("categoria") for t in biblioteca().get("tipos", []) if t.get("categoria")
                                         and any(re.search(x, norm_txt(i.get("descricao") or "")) for x in t["padroes"])), None)
        if cat:
            por[cat] = por.get(cat, 0) + (i.get("total") or 0)
    if not por or total <= 0:
        return None
    cat, v = max(por.items(), key=lambda x: x[1])
    ident = sum(por.values())
    return cat if v >= 0.6 * ident and ident >= 0.4 * total else None


def categoria_para(db: dict[str, Any], loja: dict[str, Any], itens: list[dict[str, Any]]) -> str:
    """Itens claros (geladeira no supermercado = Eletrodomésticos) → a que vocês escolheram para a loja →
    nome da loja / comida → Outros."""
    return (categoria_por_itens(itens) or db["categoria_loja"].get((loja.get("cnpj") or "")[:8])
            or categoria_sugerida(loja.get("nome", ""), itens) or "Outros")


def categoria_sugerida(loja_nome: str, itens: list[dict[str, Any]]) -> str | None:
    """Categoria para loja que ainda não tem uma: pelo nome; senão, pelo tipo dos produtos (NCM)."""
    nome = norm_txt(loja_nome or "")
    for rx, cat in CATEGORIA_POR_NOME:
        if re.search(rx, nome):
            return cat
    ncms = [str(i.get("ncm") or "") for i in itens if i.get("ncm")]
    if len(ncms) < 2 and len(ncms) < len(itens):
        return None
    conta = lambda f: sum(1 for n in ncms if f(n))
    if conta(lambda n: n[:4] in ("2710", "2207")) * 2 > len(ncms):
        return "Combustível"
    if conta(lambda n: n[:2] == "30") * 2 > len(ncms):
        return "Farmácia"
    if conta(lambda n: "01" <= n[:2] <= "24" or n[:2] in ("33", "34", "48")) * 10 >= len(ncms) * 6:
        return "Mercado"  # comida, limpeza, higiene e papel
    return None


def bem(p: dict[str, Any]) -> dict[str, Any]:
    """Histórico de um bem (ex.: Honda Civic): compras, KM, itens, total por ano."""
    with file_lock():
        db = load_db()
    b = next((x for x in db.get("bens") or [] if x["id"] == p.get("id")), None)
    if not b:
        raise Falha("Bem desconhecido.")
    lst = sorted([c for c in db["compras"] if c.get("bem") == b["id"]], key=lambda c: data_efetiva(c) or "", reverse=True)
    por_ano: dict[str, float] = {}
    for c in lst:
        por_ano[(data_efetiva(c) or "")[:4]] = round(por_ano.get((data_efetiva(c) or "")[:4], 0) + (valor_efetivo(c) or 0), 2)
    return {"ok": True, "status": "bem", "bem": {"id": b["id"], "nome": b["nome"], "tipo": b.get("tipo")},
            "total": round(sum(valor_efetivo(c) or 0 for c in lst), 2), "por_ano": por_ano,
            "compras": [{"id": c["id"], "data": data_efetiva(c), "loja": nome_loja(c["loja"]), "valor": valor_efetivo(c),
                         "km": c.get("km"), "itens": [i.get("descricao") for i in (c.get("itens") or [])][:6],
                         "qtd_itens": len(c.get("itens") or [])} for c in lst]}


def ligar_bens(p: dict[str, Any]) -> dict[str, Any]:
    """Compras já gravadas: liga aos bens (placa/chassi na cópia da nota ou item do carro) e lê a KM."""
    with file_lock():
        db = load_db()
        mud = [nome_loja(c["loja"]) + " " + (c.get("emissao") or "")[:10] for c in db["compras"] if ligar_bem(db, c)]
        if mud:
            save_db(db)
    return {"ok": True, "status": "completado", "mudancas": mud, "mensagem": f"{len(mud)} compra(s) ligadas a bens."}


def recategorizar(p: dict[str, Any]) -> dict[str, Any]:
    """Compras com categoria automática (não as escolhidas por vocês): aplica as regras de hoje.
    {"simular": true} só mostra o que mudaria."""
    with file_lock():
        db = load_db()
        mud = []
        for c in db["compras"]:
            if c.get("categoria_manual") or c.get("origem") == "manual":
                continue
            cat, sub, via = classe_para(db, c.get("loja") or {}, c.get("itens") or [])
            if (cat, sub) != (c.get("categoria"), c.get("subcategoria")):
                mud.append(f"{nome_loja(c['loja'])}: {c.get('categoria')} › {c.get('subcategoria') or '—'} → {cat} › {sub or '—'}")
                if not p.get("simular"):
                    _aplicar_classe(c, cat, sub, via)
        if mud and not p.get("simular"):
            save_db(db)
    return {"ok": True, "status": "completado", "mudancas": mud, "mensagem": f"{len(mud)} compra(s) recategorizadas."}


def completar_categorias(p: dict[str, Any]) -> dict[str, Any]:
    return recategorizar(p)


def regras(_: dict[str, Any]) -> dict[str, Any]:
    """Árvore de categorias e as regras por loja (com o nome da loja e quantas compras ela tem)."""
    with file_lock():
        db = load_db()
    lojas: dict[str, dict[str, Any]] = {}
    uso: dict[str, int] = {}
    for c in db["compras"]:
        k = ((c.get("loja") or {}).get("cnpj") or "")[:8]
        if k:
            x = lojas.setdefault(k, {"loja": nome_loja(c["loja"]), "compras": 0})
            x["compras"] += 1
        for u in (c.get("categoria"), f"{c.get('categoria')} › {c.get('subcategoria')}"):
            uso[u] = uso.get(u, 0) + 1
    rg = [{"cnpj8": k, "loja": (lojas.get(k) or {}).get("loja") or f"CNPJ {k}…", "compras": (lojas.get(k) or {}).get("compras", 0),
           "categoria": v[0], "subcategoria": v[1]} for k, v in (db.get("categoria_loja") or {}).items() if isinstance(v, list)]
    rg.sort(key=lambda x: (x["categoria"], x["loja"]))
    return {"ok": True, "status": "regras", "arvore": db["arvore"], "regras": rg, "uso": uso}


def regra(p: dict[str, Any]) -> dict[str, Any]:
    """Cria, troca ou apaga a regra de uma loja: {cnpj8, categoria, subcategoria} ou {cnpj8, apagar: true}.
    Vale para as próximas notas; as compras já registradas não mudam."""
    k = re.sub(r"\D", "", str(p.get("cnpj8") or ""))[:8]
    if len(k) != 8:
        raise Falha("Loja inválida.")
    with file_lock():
        db = load_db()
        if p.get("apagar"):
            db["categoria_loja"].pop(k, None)
            msg = "Regra apagada."
        else:
            cat, sub = checar_classe(db, p.get("categoria"), p.get("subcategoria"))
            db["categoria_loja"][k] = [cat, sub]
            msg = f"Regra salva: {cat}{' › ' + sub if sub else ''}."
        save_db(db)
    return {"ok": True, "status": "alterado", "mensagem": msg}


def arvore(p: dict[str, Any]) -> dict[str, Any]:
    """Edita a árvore: {op: "nova_sub", categoria, nome} · {op: "nova_categoria", nome, icone?}
    · {op: "renomear", categoria, sub?, nome} (atualiza compras e regras) · {op: "apagar_sub", categoria, sub} (só sem uso)."""
    op, nome = p.get("op"), re.sub(r"\s+", " ", str(p.get("nome") or "")).strip()[:40]
    with file_lock():
        db = load_db()
        r = _ramo(db, p.get("categoria"))
        if op == "nova_categoria":
            if not nome or _ramo(db, nome):
                raise Falha("Nome vazio ou que já existe.")
            db["arvore"].insert(len(db["arvore"]) - (1 if _ramo(db, "Outros") else 0),
                                {"nome": nome, "icone": str(p.get("icone") or "🏷️")[:4], "cor": "#64748b", "subs": ["Geral"]})
            msg = f"Categoria {nome} criada."
        elif not r:
            raise Falha("Categoria desconhecida.")
        elif op == "nova_sub":
            if r.get("pelos_itens"):
                raise Falha(f"{r['nome']} usa as seções dos itens.")
            if not nome or nome in r["subs"]:
                raise Falha("Nome vazio ou que já existe.")
            r["subs"].append(nome)
            msg = f"{r['nome']} › {nome} criada."
        elif op == "renomear":
            velho = p.get("sub")
            if not nome:
                raise Falha("Informe o nome novo.")
            if velho:
                if velho not in r["subs"] or nome in r["subs"]:
                    raise Falha("Subcategoria não encontrada ou nome repetido.")
                r["subs"][r["subs"].index(velho)] = nome
                if isinstance(r.get("bens"), list) and velho in r["bens"]:
                    r["bens"][r["bens"].index(velho)] = nome
                for c in db["compras"]:
                    if c.get("categoria") == r["nome"] and c.get("subcategoria") == velho:
                        c["subcategoria"] = nome
                for v in db["categoria_loja"].values():
                    if isinstance(v, list) and v[0] == r["nome"] and v[1] == velho:
                        v[1] = nome
            else:
                if _ramo(db, nome):
                    raise Falha("Já existe uma categoria com esse nome.")
                antigo = r["nome"]
                r["nome"] = nome
                for c in db["compras"]:
                    if c.get("categoria") == antigo:
                        c["categoria"] = nome
                for v in db["categoria_loja"].values():
                    if isinstance(v, list) and v[0] == antigo:
                        v[0] = nome
            msg = "Nome trocado."
        elif op == "apagar_sub":
            sub = p.get("sub")
            if sub not in r["subs"]:
                raise Falha("Subcategoria não encontrada.")
            if any(c.get("categoria") == r["nome"] and c.get("subcategoria") == sub for c in db["compras"]):
                raise Falha("Ainda há compras nessa subcategoria. Mude-as antes de apagar.")
            r["subs"].remove(sub)
            msg = "Subcategoria apagada."
        else:
            raise Falha("Operação desconhecida.")
        db["categorias"] = [a["nome"] for a in db["arvore"]]
        save_db(db)
    return {"ok": True, "status": "alterado", "mensagem": msg}
