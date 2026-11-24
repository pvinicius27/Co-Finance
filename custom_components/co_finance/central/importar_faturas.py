"""Compras que só existem na fatura do banco: prévia, importação por cartão (lote com Confirmar/Desfazer no sino)
e classificação por loja.

Cada linha de compra das faturas lidas (db["faturas_banco"]) que não está ligada a uma compra do sistema vira uma
compra "manual" com via "fatura": a parcelada é uma compra só, no dia da compra, com o total; as parcelas caem nas
faturas pelo cálculo de sempre. Antes de criar, tenta ligar a uma compra já registrada (nota, Mercado Livre…).
Tarifas do cartão (anuidade, IOF, juros) entram como compras da área Banco, para a fatura bater com o calendário;
estornos e pagamentos ficam só na fatura.
"""
from __future__ import annotations

import copy
import re
from datetime import date, datetime, timedelta
from typing import Any

from .base import Falha, fmt_brl, now_iso
from .cartoes import fatura_de
from .dados import file_lock, load_db, save_db
from .faturas import _parece, _sem_acento, chave_loja, e_credito
from .lista import anotar_mudanca
from .pagamentos import _pgs_fin, _tipo_pag, rotulo_cartao
from .pedidos import ligar_fatura, pedido_da_linha

# Áreas novas (cores fora das de pessoas e das que já existem)
AREAS_NOVAS = [
    {"nome": "Igreja", "icone": "⛪", "cor": "#7e22ce", "subs": ["Dízimo e ofertas"]},
    {"nome": "Transporte", "icone": "🚕", "cor": "#475569", "subs": ["Aplicativo (Uber, 99)", "Ônibus e metrô"]},
    {"nome": "Banco", "icone": "🏦", "cor": "#78716c", "subs": ["Anuidade e tarifas", "Juros e IOF", "Capitalização"]},
    {"nome": "Compras online", "icone": "🛍️", "cor": "#1e40af", "subs": ["Mercado Livre", "Amazon", "Shopee", "AliExpress", "Outras"]},
]
SUBS_NOVAS = {"Assinaturas e serviços": ["Programas de milhas"]}

# (padrão na descrição da fatura, área, subcategoria, nome para mostrar). A primeira que casar vale; a ordem importa
# (Uber Eats antes de Uber, Amazon Prime antes de Amazon, Mercado Livre antes de Mercado).
REGRAS = [
    (r"IGREJA|PAROQUIA|DIZIMO", "Igreja", "Dízimo e ofertas", None),
    (r"UBER ?EATS|IFOOD|\bIFD\*|RAPPI|AIQFOME|ZE DELIVERY", "Comer fora", "Delivery", None),
    (r"UBER|\b99 ?(APP|POP|TAXI)\b", "Transporte", "Aplicativo (Uber, 99)", "Uber"),
    (r"BRADESCO AUT", "Carro", "Seguro", "Seguro do carro"),
    (r"POSTO|COMBUSTIVE|SHELL|IPIRANGA|PETROBRAS|\bBR MANIA", "Carro", "Combustível", None),
    (r"ESTACIONA|ESTAPAR|ZONA AZUL|PEDAGIO|SEM PARAR|CONECTCAR|VELOE", "Carro", "Estacionamento e pedágio", None),
    (r"NETFLIX|SPOTIFY|DISNEY|PARAMOUNT|HBO|PRIMEVIDEO|AMAZONPRIME|AMAZON PRIME|GLOBOPLAY|YOUTUBE|DEEZER|CRUNCHYROLL", "Assinaturas e serviços", "Streaming", None),
    (r"LATAM PASS|SMILES|TUDOAZUL|LIVELO", "Assinaturas e serviços", "Programas de milhas", "Latam Pass (milhas)"),
    (r"APPLE ?\.? ?COM|ICLOUD|DL\*GOOGLE|GOOGLE|OPENAI|CHATGPT|MICROSOFT|ADOBE|ANTHROPIC|CLAUDE\.AI", "Assinaturas e serviços", "Aplicativos", None),
    (r"\bTIM\b|TIM\*|CLARO|\bVIVO\b", "Assinaturas e serviços", "Celular e internet", None),
    (r"MENSALIDADE.{0,6}PLANO|ANUIDADE", "Banco", "Anuidade e tarifas", "Anuidade do cartão"),
    (r"BRASILCAP", "Banco", "Capitalização", "Brasilcap"),
    (r"DROGA|FARMA|PANVEL|PACHECO|DROGASIL|RAIA", "Saúde", "Farmácia", None),
    (r"\bPET\b|PETS\b|ANIMAL|AMICAO|COBASI|PETZ|VETERIN", "Pet", "Ração", None),
    (r"MERCADOLIVRE|MERCADO ?LIVRE|MERCADO\*", "Compras online", "Mercado Livre", "Mercado Livre"),
    (r"AMAZON|AMZN", "Compras online", "Amazon", "Amazon"),
    (r"SHOPEE", "Compras online", "Shopee", "Shopee"),
    (r"ALIEXPRESS", "Compras online", "AliExpress", "AliExpress"),
    (r"TIKTOK|SHEIN|TEMU|MAGALU|MAGAZINE LUIZA|AMERICANAS|CASAS BAHIA", "Compras online", "Outras", None),
    (r"ATACADAO|ASSAI|CARREFOUR|SUPERMERC|MERCADINHO|HIPERMERC|PAO DE ACUCAR|BRETAS|\bSUPER ", "Mercado", None, None),
    (r"PADARIA|PANIFIC|\bPAES\b|CAFE|ESFIHA|DOCERIA|CONFEITARIA|SORVET", "Comer fora", "Lanche e padaria", None),
    (r"RESTAUR|PIZZA|BURGER|LANCHONETE|SUBWAY|OUTBACK|COCO BAMBU|CHURRASC|ARCOS DOURADOS|MC ?DONALD", "Comer fora", "Restaurante", None),
    (r"V3FIT|ACADEMIA|SMART ?FIT|BLUEFIT", "Lazer e viagem", "Esporte", None),
    (r"PARKING", "Carro", "Estacionamento e pedágio", None),
    (r"PAMONHARIA|CARNE DE SOL|CUCINA|MACELLERIA|TRATTORIA", "Comer fora", "Restaurante", None),
    (r"BARBEARIA|BARBER|CABELEIREIR|CABELEREIR|\bSALAO\b|ESMALTERIA|BEAUTE|BEAUTY|ESTETICA|\bNATURA\b|MANICURE|NAIL", "Pessoal", "Beleza e cuidados", None),
    (r"\bHOTEL\b|\bIBIS\b|POUSADA|HOSTEL|BOOKING|AIRBNB", "Lazer e viagem", "Viagens", None),
    (r"AMOR ?SAUDE|RD ?SAUDE", "Saúde", "Consultas e exames", None),
    (r"\bCNA\b", "Assinaturas e serviços", "Cursos", None),
    (r"CENTAURO|RUNNINGLAND|DECATHLON", "Lazer e viagem", "Esporte", None),
    (r"\bSHEI\b", "Compras online", "Outras", None),
    (r"PAPELARIA|\bCOPIAS\b|XEROX", "Papelaria", "Geral", None),
]
TARIFAS = {"anuidade": ("Anuidade e tarifas", "Anuidade do cartão"), "iof": ("Juros e IOF", "IOF"), "juros": ("Juros e IOF", "Juros e encargos")}
_INTERMEDIARIOS = re.compile(r"^(IFD|DL|EC|MP|ZP|EBN|PAG|PG|PAYPAL|HTM|SUMUP|SQ|PICPAY)\s*\*\s*", re.I)


def _garantir_areas(db: dict[str, Any]) -> bool:
    """Põe as áreas e subcategorias novas na árvore (antes de "Outros"). True se mudou."""
    mudou, arv = False, db.setdefault("arvore", [])
    for a in AREAS_NOVAS:
        if not any(x["nome"] == a["nome"] for x in arv):
            i = next((n for n, x in enumerate(arv) if x["nome"] == "Outros"), len(arv))
            arv.insert(i, {**a, "subs": list(a["subs"])})
            mudou = True
    for nome, subs in SUBS_NOVAS.items():
        r = next((x for x in arv if x["nome"] == nome), None)
        for s in subs if r else []:
            if s not in r.setdefault("subs", []):
                r["subs"].append(s)
                mudou = True
    if mudou:
        db["categorias"] = [a["nome"] for a in arv]
    return mudou


_NOMES_FIXOS = [(r"^[7A]\s?ME\s+IGREJA", "7me Igreja")]  # dízimo pelo app 7me (a leitura da fatura às vezes troca o 7 por A)


def nome_bonito(desc: str) -> str:
    """"IFD*PIZZAGYN DELIVERY" → "Pizzagyn Delivery" (sem o intermediário do pagamento e sem CAIXA ALTA)."""
    for rx, nome in _NOMES_FIXOS:
        if re.search(rx, (desc or "").strip(), re.I):
            return nome
    d = _INTERMEDIARIOS.sub("", re.sub(r"\s+", " ", desc or "").strip())
    d = re.sub(r"\s*#\s*$|\s+PARC\b.*$", "", d, flags=re.I).strip() or (desc or "").strip()
    return " ".join(w if (len(w) <= 3 and w.isupper() and not w.isalpha()) else w.capitalize() for w in d.split(" "))[:40]


def classe_da_linha(db: dict[str, Any], desc: str, tipo: str = "compra") -> tuple[str, str | None, str, str]:
    """(área, sub, de onde veio, nome da loja). Regra que vocês escolheram para a loja → regras pelo nome → a classificar."""
    if tipo in TARIFAS:
        sub, nome = TARIFAS[tipo]
        return "Banco", sub, "tarifa", nome
    ch = chave_loja(desc)
    escolhida = (db.get("categoria_fatura") or {}).get(ch)  # [área, sub] ou [área, sub, nome para mostrar]
    d = _sem_acento(desc).upper()
    junto = re.sub(r"\s+", "", d)  # o Itaú solta letras: "CLUB E LAT AM PASS"
    casa = lambda rx: re.search(rx, d) or re.search(rx.replace(" ?", "").replace(" ", ""), junto)
    nome = (escolhida[2] if escolhida and len(escolhida) > 2 and escolhida[2] else None)         or next((n for rx, _, _, n in REGRAS if n and casa(rx)), None) or nome_bonito(desc)
    if escolhida:
        return escolhida[0], escolhida[1], "loja", nome
    for rx, cat, sub, _ in REGRAS:
        if casa(rx):
            return cat, sub, "regra", nome
    return "Outros", "Outros", "a classificar", nome


def _mes_n(iso: str) -> int:
    return int(iso[:4]) * 12 + int(iso[5:7]) - 1


def _data_da_parcela(data: str, vence: str, p: int) -> str:
    """O banco mostra a data da compra parcelada sem ano (e a leitura às vezes erra o ano): a compra é do mês
    da fatura menos o número da parcela, então fica o ano que deixa a data mais perto disso."""
    alvo = _mes_n(vence) - p
    cands = []
    for ano in (int(data[:4]) - 1, int(data[:4]), int(data[:4]) + 1):
        try:
            d = date(ano, int(data[5:7]), int(data[8:10])).isoformat()
        except ValueError:
            continue
        cands.append((abs(_mes_n(d) - alvo), d))
    return min(cands)[1] if cands else data


def _mesma_loja(a: str, b: str) -> bool:
    """O banco corta o nome em tamanhos diferentes em cada fatura ("JIM.COM # PAULO HE" / "JIM.COM # PAU"): a mesma chave,
    ou uma o começo da outra (com pelo menos 6 letras)."""
    a, b = chave_loja(a), chave_loja(b)
    return a == b or (min(len(a), len(b)) >= 6 and (a.startswith(b) or b.startswith(a)))


def _grupos(db: dict[str, Any]) -> list[dict[str, Any]]:
    """Linhas das faturas lidas, com as parcelas da mesma compra juntas e o estorno descontado da compra que ele desfaz.
    Cada grupo guarda de onde veio cada linha. Parcelas da mesma compra: mesmo cartão, final, loja (o nome pode vir cortado),
    valor (a 1ª parcela leva a sobra da divisão: até 1 centavo por parcela de diferença) e número de parcelas, sem repetir parcela, começando no mesmo mês (ou cobradas
    todas juntas na mesma fatura, quando o banco antecipa).
    Parcelada com estorno cujas parcelas seguintes não vieram nas faturas já lidas: foi cancelada ("parou"), conta só o
    que foi cobrado (menos o estorno)."""
    baldes: dict[tuple, list[dict[str, Any]]] = {}
    soltas, estornos = [], []
    for f in sorted((db.get("faturas_banco") or {}).values(), key=lambda f: (f["cartao"], f["vence"])):
        for i, l in enumerate(f["linhas"]):
            if l["tipo"] == "estorno":
                estornos.append({"f": f, "i": i, "l": l})
                continue
            if l["tipo"] not in ("compra", *TARIFAS):
                continue
            n = int(l["parcela"].split("/")[1]) if l.get("parcela") else 1
            p = int(l["parcela"].split("/")[0]) if l.get("parcela") else 1
            x = {"fatura": f["id"], "i": i, "parcela": p, "valor": l["valor"], "compra": l.get("compra"), "vence": f["vence"]}
            g = {"cartao": f["cartao"], "final": l.get("final"), "descricao": l["descricao"], "tipo": l["tipo"], "n": n, "linhas": [x],
                 "data": _data_da_parcela(l["data"], f["vence"], p) if n > 1 else l["data"]}
            if n == 1:
                soltas.append(g)
            else:
                baldes.setdefault((f["cartao"], l.get("final"), n), []).append(g)
    out = soltas
    for lst in baldes.values():
        compras: list[dict[str, Any]] = []
        for g in sorted(lst, key=lambda g: (g["linhas"][0]["vence"], g["linhas"][0]["parcela"])):
            x = g["linhas"][0]
            alvo = next((c for c in compras if x["parcela"] not in {y["parcela"] for y in c["linhas"]}
                         and abs(x["valor"] - c["linhas"][0]["valor"]) <= 0.01 * g["n"] + 0.011 and _mesma_loja(g["descricao"], c["descricao"])
                         and (abs((_mes_n(x["vence"]) - x["parcela"]) - c["inicio"]) <= 1 or x["fatura"] in {y["fatura"] for y in c["linhas"]})), None)
            if alvo:
                alvo["linhas"].append(x)
            else:
                g["inicio"] = _mes_n(x["vence"]) - x["parcela"]
                compras.append(g)
        out += compras
    for g in out:
        vistas = {x["parcela"] for x in g["linhas"]}
        g["completo"] = len(vistas) == g["n"]
        g["total"] = round(sum(x["valor"] for x in g["linhas"]), 2) if g["completo"] else round(g["linhas"][0]["valor"] * g["n"], 2)
        g["ligada"] = next((x["compra"] for x in g["linhas"] if x["compra"]), None)
        g["estornos"] = []
    # estorno: mesma loja e cartão, até 120 dias depois, do valor da compra inteira (ou de uma parcela, ou de parte dela)
    for e in estornos:
        l, f, v = e["l"], e["f"], -e["l"]["valor"]
        if e["l"].get("compra"):
            continue
        d, ch = date.fromisoformat(l["data"]), chave_loja(l["descricao"])
        cands = [g for g in out if g["cartao"] == f["cartao"] and chave_loja(g["descricao"]) == ch and g["tipo"] == "compra"
                 and 0 <= (d - date.fromisoformat(g["data"])).days <= 120 and g["total"] + sum(x["valor"] for x in g["estornos"]) >= v - 0.011]
        g = min(cands, key=lambda g: (abs(g["total"] - v) > 0.011, (d - date.fromisoformat(g["data"])).days), default=None)
        if g:
            g["estornos"].append({"fatura": f["id"], "i": e["i"], "valor": l["valor"]})
    ligados: dict[str, float] = {}
    for e in estornos:
        if e["l"].get("compra"):
            ligados[e["l"]["compra"]] = ligados.get(e["l"]["compra"], 0.0) + e["l"]["valor"]
    lidas: dict[str, set[int]] = {}
    for f in (db.get("faturas_banco") or {}).values():
        lidas.setdefault(f["cartao"], set()).add(_mes_n(f["vence"]))
    for g in out:
        g["estorno_ligado"] = round(ligados.get(g["ligada"] or "", 0.0), 2)
        if g["n"] > 1 and not g["completo"] and "inicio" in g and (g["estornos"] or g["estorno_ligado"]):
            ult = max(x["parcela"] for x in g["linhas"])
            if any(g["inicio"] + p in lidas.get(g["cartao"], set()) for p in range(ult + 1, g["n"] + 1)):
                g["parou"] = True  # estornada e as parcelas seguintes não vieram: conta só o que foi cobrado
                g["total"] = round(sum(x["valor"] for x in g["linhas"]), 2)
        g["liquido"] = round(g["total"] + sum(x["valor"] for x in g["estornos"]), 2)
    return out


def revisar_parceladas(db: dict[str, Any]) -> list[str]:
    """Compras trazidas das faturas como parcelada que depois foram estornadas e pararam de vir: o valor passa a ser o que
    foi cobrado de fato; zerou, a compra sai (excluída, dá para desfazer). Cada ajuste vai para o sino. Devolve o que mudou."""
    compras, feito = {c["id"]: c for c in db["compras"]}, []
    for g in _grupos(db):
        c = compras.get(g["ligada"] or "")
        if not g.get("parou") or not c or c.get("via") != "fatura" or c.get("excluida_em"):
            continue
        novo = round(g["liquido"] + g["estorno_ligado"], 2)
        velho = round(float(c.get("valor_pago") or 0), 2)
        if abs(novo - velho) <= 0.01:
            continue
        cobradas = sorted(x["parcela"] for x in g["linhas"])
        porque = (f"{g['descricao']} em {g['n']}x: só {'a parcela' if len(cobradas) == 1 else 'as parcelas'} "
                  f"{', '.join(str(p) for p in cobradas)} {'veio' if len(cobradas) == 1 else 'vieram'} na fatura, com estorno, "
                  "e as seguintes não aparecem nas faturas lidas: foi cancelada")
        if novo <= 0.01:
            anotar_mudanca(db, c, f"Compra tirada: {porque} (estornada inteira, antes {fmt_brl(velho)}).", {"excluida_em": None})
            c["excluida_em"] = now_iso()
            feito.append(f"{c['loja']['nome']}: tirada (estornada inteira)")
            continue
        antes = {k: copy.deepcopy(c.get(k)) for k in ("valor_pago", "valor_produtos", "itens", "pagamentos")}
        c["valor_pago"] = c["valor_produtos"] = novo
        for i in c.get("itens") or []:
            i["total"] = novo
        for pg in c.get("pagamentos") or []:
            pg["valor"] = novo
        c.setdefault("fatura_banco", {})["total_estimado"] = False
        anotar_mudanca(db, c, f"Valor {fmt_brl(velho)} → {fmt_brl(novo)}: {porque}.", antes)
        feito.append(f"{c['loja']['nome']}: {fmt_brl(velho)} → {fmt_brl(novo)}")
    return feito


def _achar_compra(db: dict[str, Any], g: dict[str, Any], usadas: set[str]) -> dict[str, Any] | None:
    """Compra já registrada que é esta linha da fatura: data de 2 dias antes a 7 depois, mesmo valor (nota, cobrado,
    total ou parcela) e nome parecido; nas lojas online (Mercado Livre, Amazon…) o vendedor da nota tem outro nome,
    então basta o valor exato."""
    if g["tipo"] != "compra":
        return None
    d = date.fromisoformat(g["data"])
    online = re.search(r"MERCADO|AMAZON|AMZN|SHOPEE|ALIEXPRESS|MP \*|MAGALU|SHEIN", _sem_acento(g["descricao"]).upper())
    v1 = g["linhas"][0]["valor"]
    for c in db["compras"]:
        if c["id"] in usadas or c.get("excluida_em") or c.get("via") == "fatura" or c.get("pedido"):  # pedido: pelo total (pedidos.py)
            continue
        dc = date.fromisoformat((c.get("data_compra") or c.get("emissao") or "1900-01-01")[:10])
        if not -2 <= (d - dc).days <= 7:
            continue
        vals = {round(c.get("valor_pago") or 0, 2), round((c.get("cobrado") or {}).get("valor") or 0, 2)}
        vals |= {round(pg.get("valor") or 0, 2) for pg in _pgs_fin(c) if e_credito(pg)}  # parte no Pix, parte no cartão
        exato = any(abs(v - g["total"]) < 0.011 or (g["n"] > 1 and abs(v - v1 * g["n"]) <= 0.02 * g["n"]) for v in vals if v)
        mesmas_parcelas = g["n"] > 1 and any(e_credito(pg) and int(pg.get("parcelas") or 1) == g["n"]
                                             and pg.get("cartao") in (None, "", g["cartao"]) for pg in _pgs_fin(c))
        if exato and (_parece(g["descricao"], c) or online or d == dc or mesmas_parcelas):
            return c
    return None


def _letras(s: str | None) -> str:
    return re.sub(r"[^A-Z]", "", _sem_acento(s or "").upper())


def _parecida(db: dict[str, Any], g: dict[str, Any], usadas: set[str]) -> dict[str, Any] | None:
    """Compra já no calendário, no crédito deste cartão (ou sem cartão), com nome que começa igual e data perto, mas
    valor ou parcelas diferentes: pode ser a mesma compra lançada de outro jeito. Não cria; vai para "Confira"."""
    if g["tipo"] != "compra":
        return None
    d, ch = date.fromisoformat(g["data"]), chave_loja(g["descricao"])
    for c in db["compras"]:
        if c.get("excluida_em") or c.get("via") == "fatura":
            continue
        if not any(e_credito(pg) and pg.get("cartao") in (None, "", g["cartao"]) for pg in _pgs_fin(c)):
            continue
        dc = date.fromisoformat((c.get("data_compra") or c.get("emissao") or "1900-01-01")[:10])
        nome = _letras((c.get("loja") or {}).get("nome"))
        if -3 <= (d - dc).days <= 10 and len(ch) >= 5 and (nome.startswith(ch[:6]) or ch.startswith(nome[:6])):
            return c
    return None


def religar_da_fatura(db: dict[str, Any]) -> list[str]:
    """Fatura lida de novo (outro nome de arquivo, outra leitura): as linhas vêm sem a ligação e em outra ordem. Cada grupo
    sem compra volta para a compra que já tinha sido trazida dele: mesmo cartão, final, número de parcelas, dia e loja
    (o nome pode vir cortado). Vale também para a excluída (não volta a ser oferecida). Sem isso, o sino ofereceria de
    novo e o Trazer criaria a mesma compra duas vezes. Devolve os ids religados."""
    fbs = db.get("faturas_banco") or {}
    ref = {l["compra"] for f in fbs.values() for l in f["linhas"] if l.get("compra")}
    soltas = sorted((c for c in db["compras"] if c.get("via") == "fatura" and c.get("fatura_banco") and c["id"] not in ref),
                    key=lambda c: c.get("registrado_em") or "")
    feitas: list[str] = []
    if not soltas:
        return feitas
    for g in _grupos(db):
        if g["ligada"]:
            continue
        def serve(c: dict[str, Any]) -> bool:
            fb = c["fatura_banco"]
            cart = next((pg.get("cartao") for pg in c.get("pagamentos") or [] if pg.get("cartao")), None)
            if cart != g["cartao"] or fb.get("final") != g["final"] or int(fb.get("parcelas") or 1) != g["n"]:
                return False
            if (c.get("emissao") or "")[:10] != g["data"] or not _mesma_loja(fb.get("descricao") or "", g["descricao"]):
                return False
            v = float(c.get("valor_pago") or 0)
            # parcelada: o total pode ter sido estimado ou revisto (estorno); à vista: o valor bate
            return g["n"] > 1 or c.get("excluida_em") or abs(v - g["liquido"]) <= 0.011 or abs(v - g["total"]) <= 0.011
        c = next((x for x in soltas if serve(x)), None)
        if not c:
            continue
        soltas.remove(c)
        for x in g["linhas"] + g["estornos"]:
            fbs[x["fatura"]]["linhas"][x["i"]]["compra"] = c["id"]
        c["fatura_banco"]["linhas"] = [[x["fatura"], x["i"], x["parcela"]] for x in g["linhas"]]
        feitas.append(c["id"])
    return feitas


def _usadas(db: dict[str, Any]) -> set[str]:
    return {l["compra"] for f in (db.get("faturas_banco") or {}).values() for l in f["linhas"] if l.get("compra")}


def _planejar(db: dict[str, Any], cartao: str | None = None) -> dict[str, list[dict[str, Any]]]:
    """Para cada grupo ainda sem compra: ligar a uma existente ou criar uma nova (com área, pessoa e nome)."""
    cartoes = {k["id"]: k for k in db.get("cartoes") or []}
    usadas, ligar, criar, estornadas, confira = _usadas(db), [], [], [], []
    pedidos_usados: set[str] = set()
    for g in _grupos(db):
        if cartao and g["cartao"] != cartao:
            continue
        if g["ligada"]:
            if any(not x["compra"] for x in g["linhas"]):  # a 1ª parcela já estava ligada; as seguintes, não
                g["compra"], g["completar"] = g["ligada"], True
                ligar.append(g)
            continue
        k = cartoes.get(g["cartao"]) or {}
        g["quem"] = ((k.get("finais") or {}).get(g["final"]) or {}).get("quem") or k.get("dono")
        ped = pedido_da_linha(db, g["descricao"], g["cartao"], g["final"], g["data"], g["total"], g["n"], pedidos_usados) if g["tipo"] == "compra" else None
        if ped:  # loja online com o e-mail do pedido: a cobrança é o pedido inteiro (uma ou várias partes)
            pedidos_usados.add(ped["id"])
            g["pedido"] = ped["id"]
            g["compra"] = next((x["compra"] for x in ped["partes"] if x.get("situacao") != "cancelada" and x.get("compra")), None)
            ligar.append(g)  # aguardando o pagamento: a compra nasce ao ligar (a cobrança confirma)
            continue
        c = _achar_compra(db, g, usadas)
        if c:
            usadas.add(c["id"])
            g["compra"] = c["id"]
            ligar.append(g)
            continue
        g["area"], g["sub"], g["via"], g["loja"] = classe_da_linha(db, g["descricao"], g["tipo"])
        if g["liquido"] <= 0.01:
            estornadas.append(g)  # estornada inteira: não é gasto
        elif (c := _parecida(db, g, usadas)):
            g["compra_loja"] = (c.get("loja") or {}).get("nome")
            confira.append(g)
        else:
            criar.append(g)
    lojas = {c["id"]: (c.get("loja") or {}).get("nome") for c in db["compras"]}
    for g in ligar:
        g["compra_loja"] = lojas.get(g["compra"])
    return {"ligar": ligar, "criar": criar, "estornadas": estornadas, "confira": confira}


def _dia_certo(k: dict[str, Any], g: dict[str, Any]) -> str | None:
    """Data no cartão para a parcela cair na fatura em que o banco a mostrou (às vezes o banco lança dias depois)."""
    l = min(g["linhas"], key=lambda x: x["parcela"])
    if not k.get("fecha") or not k.get("vence"):
        return None
    d0 = date.fromisoformat(g["data"])
    if fatura_de(k, d0, l["parcela"] - 1)[1].isoformat() == l["vence"]:
        return None
    for delta in sorted(range(-40, 41), key=abs):
        d = d0 + timedelta(days=delta)
        if fatura_de(k, d, l["parcela"] - 1)[1].isoformat() == l["vence"]:
            return d.isoformat()
    return None


def _resumo_cartao(db: dict[str, Any], plano: dict[str, list], amostra: int) -> list[dict[str, Any]]:
    nomes = {k["id"]: k for k in db.get("cartoes") or []}
    out = []
    for cid in sorted({g["cartao"] for g in plano["criar"] + plano["ligar"] + plano["confira"]}):
        cr = [g for g in plano["criar"] if g["cartao"] == cid]
        lg = [g for g in plano["ligar"] if g["cartao"] == cid]
        k = nomes.get(cid) or {}
        out.append({"cartao": cid, "nome": k.get("nome", cid), "produto": (k.get("visual") or {}).get("produto"),
                    "criar": len(cr), "total": round(sum(g["liquido"] for g in cr), 2), "ligar": len(lg),
                    "estornadas": sum(1 for g in plano["estornadas"] if g["cartao"] == cid),
                    "confira": [{"data": g["data"], "descricao": g["descricao"], "n": g["n"], "total": g["liquido"], "loja": g["compra_loja"]}
                                for g in plano["confira"] if g["cartao"] == cid],
                    "parceladas": sum(1 for g in cr if g["n"] > 1), "tarifas": sum(1 for g in cr if g["tipo"] != "compra"),
                    "a_classificar": sum(1 for g in cr if g["via"] == "a classificar"),
                    "pessoas": {p: sum(1 for g in cr if g["quem"] == p) for p in sorted({g["quem"] or "?" for g in cr})},
                    "amostra": [{"data": g["data"], "loja": g["loja"], "descricao": g["descricao"], "quem": g["quem"], "n": g["n"],
                                 "total": g["liquido"], "area": g["area"], "sub": g["sub"], "a_classificar": g["via"] == "a classificar",
                                 "estorno": bool(g["estornos"])}
                                for g in sorted(cr, key=lambda g: g["data"], reverse=True)[:amostra]],
                    "ligacoes": [{"data": g["data"], "descricao": g["descricao"], "total": g["total"], "loja": g["compra_loja"]} for g in lg]})
    return out


def faturas_previa(p: dict[str, Any]) -> dict[str, Any]:
    """{} → por cartão: quantas compras seriam criadas (com amostra) e quantas ligadas a compras que já existem. Não grava."""
    with file_lock():
        db = load_db()
    _garantir_areas(db)
    plano = _planejar(db)
    est = sum(l["valor"] for f in (db.get("faturas_banco") or {}).values() for l in f["linhas"] if l["tipo"] == "estorno")
    return {"ok": True, "status": "faturas_previa", "cartoes": _resumo_cartao(db, plano, int(p.get("amostra") or 60)),
            "criar": len(plano["criar"]), "ligar": len(plano["ligar"]), "total": round(sum(g["liquido"] for g in plano["criar"]), 2),
            "estornadas": len(plano["estornadas"]), "confira": len(plano["confira"]),
            "estornos": round(est, 2)}


def pendentes_fatura(db: dict[str, Any]) -> dict[str, Any]:
    """Para o sino (vem junto com a lista): lotes para conferir, lojas a classificar e compras ainda por trazer."""
    lotes = [{k: x.get(k) for k in ("id", "cartao", "nome", "em", "criadas", "ligadas", "total")}
             for x in db.get("lotes_fatura") or [] if x.get("status") == "pendente"]
    lojas = {c["fatura_banco"]["chave"] for c in db["compras"] if c.get("via") == "fatura" and c.get("classe_via") == "a classificar"}
    plano = _planejar(db)
    por = len(plano["criar"]) + len(plano["ligar"])
    return {"lotes": lotes, "lojas_a_classificar": len(lojas), "por_trazer": por}


def faturas_importar(p: dict[str, Any]) -> dict[str, Any]:
    """{cartao} → cria as compras e liga as linhas desse cartão. Vira um lote no sino (Confirmar / Desfazer)."""
    cid = str(p.get("cartao") or "")
    with file_lock():
        db = load_db()
        k = next((x for x in db.get("cartoes") or [] if x["id"] == cid), None)
        if not k:
            raise Falha("Cartão não encontrado.")
        _garantir_areas(db)
        plano = _planejar(db, cid)
        if not plano["criar"] and not plano["ligar"]:
            raise Falha(f"Nada para trazer das faturas do {rotulo_cartao(k, db.get('cartoes') or [])}.")
        lote = f"lf{datetime.now():%Y%m%d%H%M%S%f}"
        fbs = db["faturas_banco"]
        criadas, ligadas = [], []
        compras = {c["id"]: c for c in db["compras"]}
        for g in plano["ligar"]:
            if g.get("pedido"):  # o pedido liga a(s) linha(s) e completa o cartão das partes
                ped = next(x for x in db.get("pedidos") or [] if x["id"] == g["pedido"])
                novas = [(x["fatura"], x["i"]) for x in g["linhas"] if not fbs[x["fatura"]]["linhas"][x["i"]].get("compra")]
                g["compra"] = ligar_fatura(db, ped, [(x["fatura"], x["i"]) for x in g["linhas"]], k["id"]) or g["compra"]
                ligadas += [[fid, i, g["compra"]] for fid, i in novas]
                continue
            for x in g["linhas"]:
                if not fbs[x["fatura"]]["linhas"][x["i"]].get("compra"):
                    fbs[x["fatura"]]["linhas"][x["i"]]["compra"] = g["compra"]
                    ligadas.append([x["fatura"], x["i"], g["compra"]])
            c = compras[g["compra"]]  # o banco diz em quantas vezes foi: corrige a compra (vai para o sino)
            fin = c.get("pagamentos") or []
            if not (c.get("cobrado") or {}).get("pagamentos") and len(fin) <= 1 and (not fin or _tipo_pag(fin[0]) == "Outro" and not fin[0].get("tipo")):
                # a nota disse "Outros" (ou nada) e a compra está na fatura de crédito: foi crédito neste cartão
                antes = {"pagamentos": copy.deepcopy(c.get("pagamentos"))}
                novo = {**(fin[0] if fin else {"forma": ""}), "tipo": "Crédito", "valor": fin[0].get("valor") if fin and fin[0].get("valor") else c.get("valor_pago"),
                        "cartao": k["id"], "cartao_via": "fatura", "parcelas": max(1, g["n"])}
                c["pagamentos"] = [novo]
                c.pop("cartao_sugerido", None)
                vezes = f" em {g['n']}x" if g["n"] > 1 else ""
                anotar_mudanca(db, c, f"Forma de pagamento: {'Outros' if fin else 'não informada'} → Crédito {rotulo_cartao(k, db.get('cartoes') or [])}"
                                      f"{vezes}, porque está na fatura ({g['descricao']}).", antes)
            pgs = [pg for pg in _pgs_fin(c) if e_credito(pg)]
            if g["n"] > 1 and len(pgs) == 1 and int(pgs[0].get("parcelas") or 1) != g["n"]:
                campo = "cobrado" if (c.get("cobrado") or {}).get("pagamentos") else "pagamentos"
                antes = {campo: copy.deepcopy(c.get(campo))}
                de = int(pgs[0].get("parcelas") or 1)
                pgs[0]["parcelas"] = g["n"]
                pgs[0].setdefault("cartao", k["id"])
                anotar_mudanca(db, c, f"Parcelas: {'à vista' if de == 1 else f'{de}x'} → {g['n']}x, como está na fatura {rotulo_cartao(k, db.get('cartoes') or [])} "
                                      f"({g['descricao']}, {fmt_brl(g['linhas'][0]['valor'])} por mês).", antes)
        for n, g in enumerate(plano["criar"]):
            cid_c = f"fatura-{lote[2:]}-{n:04d}"
            pg = {"forma": "", "tipo": "Crédito", "valor": g["liquido"], "cartao": k["id"], "cartao_via": "fatura", "parcelas": g["n"],
                  "bandeira": k.get("bandeira")}
            if (dia := _dia_certo(k, g)):
                pg["data_cartao"] = dia
            criadas.append(cid_c)
            db["compras"].append({
                "id": cid_c, "chave": None, "origem": "manual", "via": "fatura", "quem": g["quem"],
                "reembolso": {"status": "nao", "pago_em": None},
                "categoria": g["area"], "subcategoria": g["sub"], "classe_via": g["via"], "categoria_manual": True,
                "loja": {"nome": g["loja"], "cnpj": "", "cidade": "", "uf": ""},
                "numero": "", "serie": "", "emissao": f"{g['data']}T12:00:00-03:00",
                "itens": [{"n": 1, "descricao": g["descricao"], "codigo": "", "ean": None, "ncm": None, "qtd": None, "un": "", "unit": None,
                           "total": g["liquido"], "promo": False, "manual": True}], "qtd_itens": 1,
                "valor_produtos": g["liquido"], "desconto": 0.0, "valor_pago": g["liquido"], "tributos": None,
                "pagamentos": [pg], "observacao": "", "conferencia": {"soma_itens": None, "bate": True}, "registrado_em": now_iso(),
                "fatura_banco": {"lote": lote, "chave": chave_loja(g["descricao"]), "descricao": g["descricao"], "final": g["final"],
                                 "parcelas": g["n"], "total_estimado": not g["completo"],
                                 "linhas": [[x["fatura"], x["i"], x["parcela"]] for x in g["linhas"]],
                                 **({"estorno": round(-sum(x["valor"] for x in g["estornos"]), 2)} if g["estornos"] else {})},
            })
            for x in g["linhas"] + g["estornos"]:
                fbs[x["fatura"]]["linhas"][x["i"]]["compra"] = cid_c
        db["compras"].sort(key=lambda c: c.get("emissao") or "", reverse=True)
        total = round(sum(g["liquido"] for g in plano["criar"]), 2)
        db.setdefault("lotes_fatura", []).append({"id": lote, "cartao": k["id"], "nome": rotulo_cartao(k, db.get("cartoes") or []), "em": now_iso(), "status": "pendente",
                                                  "criadas": len(criadas), "ligadas": len(plano["ligar"]), "total": total,
                                                  "compras": criadas, "linhas_ligadas": ligadas})
        save_db(db)
    return {"ok": True, "status": "faturas_importadas", "lote": lote,
            "mensagem": f"{rotulo_cartao(k, db.get('cartoes') or [])}: {len(criadas)} compras trazidas das faturas ({fmt_brl(total)})"
                        + (f" e {len(plano['ligar'])} ligadas a compras que já existiam" if plano["ligar"] else "") + ". Confira no sino."}


def faturas_lote(p: dict[str, Any]) -> dict[str, Any]:
    """{id, decisao: "ok" | "desfazer"}. Desfazer apaga as compras criadas pelo lote e solta as linhas que ele ligou."""
    lid, dec = str(p.get("id") or ""), p.get("decisao")
    if dec not in ("ok", "desfazer"):
        raise Falha("Pedido inválido.")
    with file_lock():
        db = load_db()
        x = next((y for y in db.get("lotes_fatura") or [] if y["id"] == lid), None)
        if not x:
            raise Falha("Lote não encontrado.")
        if x["status"] != "pendente":
            return {"ok": True, "status": "faturas_lote", "mensagem": "Esse lote já foi conferido."}
        if dec == "desfazer":
            fora = set(x["compras"])
            db["compras"] = [c for c in db["compras"] if c["id"] not in fora]
            for f in (db.get("faturas_banco") or {}).values():
                for l in f["linhas"]:
                    if l.get("compra") in fora:
                        l.pop("compra", None)
            for fid, i, comp in x.get("linhas_ligadas") or []:
                l = ((db.get("faturas_banco") or {}).get(fid) or {}).get("linhas", [])
                if i < len(l) and l[i].get("compra") == comp:
                    l[i].pop("compra", None)
        x["status"], x["decidido_em"] = ("confirmado" if dec == "ok" else "desfeito"), now_iso()
        save_db(db)
    return {"ok": True, "status": "faturas_lote",
            "mensagem": f"{x['nome']}: confirmado." if dec == "ok" else f"{x['nome']}: desfeito, as {x['criadas']} compras saíram."}


# palavras que começam muitos nomes e não dizem qual é a loja ("Hospital Mater Dei" não é o "Hospital Premium")
_GENERICAS = {"HOSPITAL", "SUPERMERCADO", "SUPERMERCADOS", "MERCADO", "FARMACIA", "FARMACIAS", "DROGARIA", "DROGARIAS", "PADARIA",
              "RESTAURANTE", "POSTO", "AUTO", "CLINICA", "LABORATORIO", "BAR", "LANCHONETE", "PANIFICADORA", "CASA", "CASAS", "REDE",
              "DISTRIBUIDORA", "DISTRIBUICAO", "ATACADO", "ATACADAO", "BRASILIA", "GOIANIA", "SAO", "SANTA", "SANTO", "NOVA", "NOVO",
              "SHOPPING", "CENTRO", "GRUPO", "SUPER", "MINI", "PET", "STORE", "SHOP", "HOTEL", "COMERCIAL", "ALIMENTOS", "SERV"}


def _nucleo(nome: str) -> str:
    """O começo que identifica a loja: a 1ª palavra que conta (2 palavras se a 1ª é genérica). "PTY*KALUNGA SHOP" → KALUNGA."""
    from .juntar import _palavras
    ws = [w for w in _palavras(re.sub(r"[*#.]", " ", nome or "")) if len(w) >= 3 and w not in ("PTY", "ZP", "JIM", "COM", "PAY", "WWW", "BR")]
    if not ws:
        return ""
    k = " ".join(ws[:2]) if ws[0] in _GENERICAS else ws[0]
    return k if len(k) >= 4 and k not in _GENERICAS else ""


def faturas_lojas(_: dict[str, Any]) -> dict[str, Any]:
    """Lojas das compras trazidas das faturas que ainda estão "a classificar", a com mais compras primeiro."""
    with file_lock():
        db = load_db()
    g: dict[str, dict[str, Any]] = {}
    for c in db["compras"]:
        if c.get("via") != "fatura" or c.get("classe_via") != "a classificar":
            continue
        fb = c["fatura_banco"]
        x = g.setdefault(fb["chave"], {"chave": fb["chave"], "loja": (c.get("loja") or {}).get("nome"), "descricao": fb["descricao"],
                                       "n": 0, "total": 0.0, "quem": set(), "ultima": ""})
        x["n"] += 1
        x["total"] = round(x["total"] + (c.get("valor_pago") or 0), 2)
        x["quem"].add(c.get("quem") or "?")
        x["ultima"] = max(x["ultima"], (c.get("emissao") or "")[:10])
    lojas = sorted(g.values(), key=lambda x: (-x["n"], -x["total"]))
    # loja já conhecida: compra por nota ou Apple Pay com nome parecido com o da fatura → sugere o nome e a área dela
    from .base import nome_loja
    conhecidas: dict[str, dict[str, Any]] = {}
    for c in db["compras"]:
        if c.get("via") == "fatura" or c.get("excluida_em") or c.get("categoria") in (None, "Outros"):
            continue
        nome = nome_loja(c.get("loja") or {})
        k = conhecidas.setdefault(nome, {"nome": nome, "razao": (c.get("loja") or {}).get("nome") or "", "n": 0, "cats": {}})
        k["n"] += 1
        par = (c.get("categoria"), c.get("subcategoria") or "")
        k["cats"][par] = k["cats"].get(par, 0) + 1
    for x in lojas:
        x["quem"] = sorted(x["quem"])
        nx = {_nucleo(t) for t in (x["descricao"], x["loja"] or "")} - {""}
        achou = [k for k in conhecidas.values() if nx & ({_nucleo(k["nome"]), _nucleo(k["razao"])} - {""})]
        if achou:
            k = max(achou, key=lambda k: k["n"])
            cat, sub = max(k["cats"].items(), key=lambda kv: kv[1])[0]
            x["sugestao"] = {"nome": k["nome"], "categoria": cat, "subcategoria": sub}
    return {"ok": True, "status": "faturas_lojas", "lojas": lojas, "arvore": db["arvore"]}


def faturas_classificar(p: dict[str, Any]) -> dict[str, Any]:
    """{chave, categoria, subcategoria?, nome?} → guarda a regra da loja (e o nome para mostrar, se vier) e aplica nas
    compras dela trazidas das faturas (as que vocês já trocaram à mão ficam como estão)."""
    from .categorias import checar_classe
    ch = str(p.get("chave") or "")
    if not ch:
        raise Falha("Loja não informada.")
    with file_lock():
        db = load_db()
        cat, sub = checar_classe(db, p.get("categoria"), p.get("subcategoria"))
        if p.get("sem_subcategoria"):  # Classificar dá só a área; a subcategoria vem depois, compra por compra
            sub = None
        nome = re.sub(r"\s+", " ", str(p.get("nome") or "")).strip()[:40]
        db.setdefault("categoria_fatura", {})[ch] = [cat, sub, nome] if nome else [cat, sub]
        n = 0
        for c in db["compras"]:
            fb = c.get("fatura_banco") or {}
            if c.get("via") == "fatura" and fb.get("chave") == ch and c.get("classe_via") in ("a classificar", "regra", "loja"):
                c["categoria"], c["subcategoria"], c["classe_via"] = cat, sub, "loja"
                if nome:
                    c["loja"]["nome"] = nome
                n += 1
        save_db(db)
    return {"ok": True, "status": "faturas_classificar", "mensagem": f"{n} {'compra' if n == 1 else 'compras'} em {cat}{f' › {sub}' if sub else ''}."}
