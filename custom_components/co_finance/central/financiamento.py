"""Financiamento imobiliário (SAC + TR): o extrato do banco vira a tabela de parcelas; a TR do Banco Central faz a previsão.

Entra o extrato em PDF lido pelo card (linhas [página, x, y, texto] do pdf.js, como nas faturas). Fica só a tabela de
números (parcela, data, valores, índice, saldo, situação) e o que descreve o contrato (sistema, indexador, prazo, valor do
imóvel). Nome, CPF, endereço e número do contrato não saem daqui.

A conta (conferida no extrato do Bradesco, 18 parcelas pagas, erro de R$ 0,03 na previsão de um mês à frente):
  TR do mês = série 226 do Banco Central iniciada no vencimento anterior (dia do aniversário do contrato)
  saldo corrigido = saldo anterior × (1 + TR)
  amortização     = amortização anterior × (1 + TR)                   (SAC com a cota corrigida)
  juros           = saldo corrigido × taxa do mês (calibrada na última parcela paga)
  MIP             = saldo corrigido × taxa do seguro (as mudanças de faixa de idade vêm das parcelas futuras do extrato)
  DFI             = DFI anterior × (1 + TR);  taxa de administração = a do extrato
"""
from __future__ import annotations

import base64
import json
import re
import ssl
import statistics
import urllib.request
from datetime import date, datetime, timedelta
from typing import Any

from .base import Falha, now_iso
from .dados import file_lock, load_db, save_db

_V = r"-?\d{1,3}(?:\.\d{3})*,\d{2}"
_IND = r"\d,\d{6}"
BANCOS = (("bradesco", r"bradesco"), ("caixa", r"caixa econ[ôo]mica"), ("itau", r"ita[úu]"), ("santander", r"santander"),
          ("bb", r"banco do brasil"), ("inter", r"banco inter"), ("brb", r"\bBRB\b"))
SERIE_TR = 226  # Banco Central (SGS): TR diária, cada dia vale por um mês ("data" até "dataFim")
URL_TR = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.{serie}/dados?formato=json&dataInicial={ini}&dataFinal={fim}"
TR_MIN, TR_MAX = -1.0, 2.0  # % ao mês: fora disso a resposta é descartada (nunca houve TR assim)
TR_MAX_BYTES = 400_000


def _num(s: str) -> float | None:
    s = (s or "").strip()
    if s in ("-", ""):
        return None
    return round(float(s.replace(".", "").replace(",", ".")), 2)


def _iso(d: str) -> str:
    dd, mm, aa = d.split("/")
    return f"{aa}-{mm}-{dd}"


# ---------------------------------------------------------------- leitura do extrato
def _linhas(L, deitada: bool) -> list[list[str]]:
    """Junta as células da mesma linha da tabela: página deitada (cada linha é um x) ou em pé (cada linha é um y)."""
    grupos: dict[tuple, list] = {}
    for p, x, y, t in L:
        t = (t or "").strip()
        if not t:
            continue
        chave = (p, round((x if deitada else y) / 2.5))
        grupos.setdefault(chave, []).append(((y if deitada else x), t))
    out = []
    for _k, c in sorted(grupos.items()):
        celulas: list[str] = []
        for _pos, t in sorted(c):
            celulas += [s.strip() for s in t.split("\t") if s.strip()]
        out.append(celulas)
    return out


_LINHA = re.compile(rf"^(\d{{1,3}}|T)\s+(\d{{2}}/\d{{2}}/\d{{4}})\s+({_V})\s+({_V})\s+({_V})\s+({_IND})\s+({_V}|-)\s+({_V}|-)\s+({_V})"
                    rf"\s+({_V})\s+({_V})\s+({_V})\s+({_IND})\s+({_V})\s+(Paga|A Vencer|Vencida|Em Atraso|Atrasada|Liquidada)"
                    rf"\s+(\d{{2}}/\d{{2}}/\d{{4}}|-)\s+({_V})$")


def _parcelas(linhas: list[list[str]]) -> list[dict[str, Any]]:
    out = {}
    for c in linhas:
        m = _LINHA.match(" ".join(c))
        if not m:
            continue
        g = m.groups()
        out[g[0]] = {"n": 0 if g[0] == "T" else int(g[0]), "taxa_inicial": g[0] in ("0", "T"), "vence": _iso(g[1]), "total": _num(g[2]),
                     "amort": _num(g[3]), "juros": _num(g[4]), "ind": float(g[5].replace(",", ".")), "mip": _num(g[6]) or 0.0,
                     "dfi": _num(g[7]) or 0.0, "tsa": _num(g[8]), "multa": _num(g[9]), "mora": _num(g[10]), "fgts": _num(g[11]),
                     "saldo": _num(g[13]), "situacao": "paga" if g[14] in ("Paga", "Liquidada") else "aberta",
                     "pago_em": _iso(g[15]) if g[15] != "-" else None, "pago": _num(g[16])}
    return [out[k] for k in sorted(out, key=lambda k: (out[k]["n"], out[k]["vence"]))]


def ler_extrato(linhas_pdf) -> dict[str, Any]:
    """Linhas do PDF → financiamento (só números e o que descreve o contrato). Confere as contas antes de devolver."""
    texto = "\n".join(t for *_r, t in linhas_pdf)
    melhor: list[dict[str, Any]] = []
    for deitada in (True, False):  # cada banco põe a página de um jeito: vale a leitura que acha mais parcelas
        ps = _parcelas(_linhas(linhas_pdf, deitada))
        if len(ps) > len(melhor):
            melhor = ps
    ps = [p for p in melhor if not p["taxa_inicial"]]
    if len(ps) < 12:
        raise Falha("Não achei a tabela de parcelas do financiamento nesse PDF. Use o extrato original do banco (não foto).")
    # conferências: cada parcela fecha com as partes dela; o saldo anda com o índice e a amortização
    for p in ps:
        partes = round(p["amort"] + p["juros"] + p["mip"] + p["dfi"] + (p["tsa"] or 0) + (p["multa"] or 0) + (p["mora"] or 0), 2)
        if abs(partes - p["total"]) > 0.03:
            raise Falha(f"Parcela {p['n']}: as partes ({partes:.2f}) não fecham com o total ({p['total']:.2f}). Não gravei.")
    for a, p in zip(ps, ps[1:]):
        if p["n"] != a["n"] + 1:
            raise Falha(f"Faltou a parcela {a['n'] + 1} na leitura. Não gravei.")
        if abs(a["saldo"] * p["ind"] - p["amort"] - p["saldo"]) > 0.10:  # tolerância de centavos (arredondamento do banco)
            raise Falha(f"Parcela {p['n']}: o saldo não fecha com o anterior. Não gravei.")
    banco = next((b for b, rx in BANCOS if re.search(rx, texto, re.I)), "")
    sistema = next((s for s in ("SACRE", "SAC", "PRICE") if re.search(rf"\b{s}\b", texto)), "")
    indexador = next((s for s in ("TR", "IPCA", "INPC", "IGPM") if re.search(rf"(?<![A-Za-z]){s}(?![A-Za-z])", texto)), "")
    m = re.search(r"\b(\d{1,3})\s*/\s*(\d{2,3})\b", " ".join(t for p, _x, _y, t in linhas_pdf if p == 1 and re.fullmatch(r"\s*\d{1,3}\s*/\s*\d{2,3}\s*", t)))
    prazo = int(m[2]) if m else ps[-1]["n"]
    imovel = _valor_perto(linhas_pdf, r"^Valor Im[óo]vel$")
    dia = int(ps[-1]["vence"][8:10])
    return {"banco": banco, "sistema": sistema or "SAC", "indexador": indexador or "TR", "prazo": prazo, "dia": dia,
            "imovel": imovel, "parcelas": ps}


def _valor_perto(L, rx_rotulo: str) -> float | None:
    """O valor de um rótulo do cabeçalho (o mais perto dele, na mesma coluna do quadro)."""
    rot = [(p, x, y) for p, x, y, t in L if re.match(rx_rotulo, (t or "").strip())]
    if not rot:
        return None
    p0, x0, y0 = rot[0]
    cands = [(abs(x - x0) + abs(y - y0), t) for p, x, y, t in L if p == p0 and re.fullmatch(_V, (t or "").strip())
             and abs(y - y0) < 60 and 0 < abs(x - x0) < 40]
    return _num(min(cands)[1]) if cands else None


# ---------------------------------------------------------------- TR do Banco Central
def buscar_tr(ini: date, fim: date, abrir=None) -> dict[str, float]:
    """TR diária (% ao mês) de ini a fim. Só HTTPS com o certificado conferido, resposta pequena, formato exato e valores
    numa faixa possível; qualquer coisa fora disso é descartada (Falha), nada da resposta é executado."""
    url = URL_TR.format(serie=SERIE_TR, ini=ini.strftime("%d/%m/%Y"), fim=fim.strftime("%d/%m/%Y"))
    if not url.startswith("https://api.bcb.gov.br/"):
        raise Falha("Endereço da TR inválido.")
    try:
        if abrir:
            bruto = abrir(url)
        else:
            req = urllib.request.Request(url, headers={"Accept": "application/json", "User-Agent": "CoFinance (Home Assistant)"})
            with urllib.request.urlopen(req, timeout=15, context=ssl.create_default_context()) as r:
                bruto = r.read(TR_MAX_BYTES + 1)
        if len(bruto) > TR_MAX_BYTES:
            raise ValueError("resposta grande demais")
        dados = json.loads(bruto.decode("utf-8"))
    except Falha:
        raise
    except Exception as e:  # sem rede, Banco Central fora do ar, resposta estranha
        raise Falha(f"Não consegui buscar a TR no Banco Central ({type(e).__name__}).") from e
    if not isinstance(dados, list):
        raise Falha("Resposta da TR em formato inesperado.")
    out = {}
    for x in dados:
        if not isinstance(x, dict) or not isinstance(x.get("data"), str) or not isinstance(x.get("valor"), str):
            raise Falha("Resposta da TR em formato inesperado.")
        if not re.fullmatch(r"\d{2}/\d{2}/\d{4}", x["data"]) or not re.fullmatch(r"-?\d{1,2}\.\d{1,6}", x["valor"]):
            raise Falha("Resposta da TR em formato inesperado.")
        v = float(x["valor"])
        if not TR_MIN <= v <= TR_MAX:
            raise Falha("A TR que veio do Banco Central está fora do possível; descartei.")
        out[_iso(x["data"])] = v
    return out


def _datas_tr(fin: dict[str, Any], hoje: date) -> list[str]:
    """Os inícios de período que interessam: o vencimento de cada parcela (a TR que corrige a parcela seguinte),
    até hoje (TR do futuro ainda não existe)."""
    return [p["vence"] for p in fin["parcelas"] if p["vence"] <= hoje.isoformat()]


def atualizar_tr(db: dict[str, Any], hoje: date | None = None, abrir=None, forcar: bool = False) -> int:
    """Busca as TRs que faltam (no máximo uma consulta a cada 6 horas). Devolve quantas entraram."""
    hoje = hoje or date.today()
    fins = db.get("financiamentos") or []
    if not fins:
        return 0
    cache = db.setdefault("tr_bcb", {})
    ultima = db.get("tr_bcb_consulta")
    if not forcar and ultima and datetime.fromisoformat(ultima) > datetime.now() - timedelta(hours=6):
        return 0
    faltam = sorted({d for f in fins for d in _datas_tr(f, hoje)} - set(cache))
    if not faltam:
        db["tr_bcb_consulta"] = datetime.now().isoformat(timespec="seconds")
        return 0
    ini = date.fromisoformat(faltam[0])
    novas = 0
    while ini <= hoje:  # a API aceita no máximo uns anos por consulta: vai em blocos de 5 anos
        fim = min(hoje, ini + timedelta(days=5 * 365))
        r = buscar_tr(ini, fim, abrir)
        for d, v in r.items():
            if d not in cache:
                cache[d] = v
                novas += 1
        ini = fim + timedelta(days=1)
    db["tr_bcb_consulta"] = datetime.now().isoformat(timespec="seconds")
    return novas


# ---------------------------------------------------------------- previsão e projeção
def _tr_media(fin: dict[str, Any], cache: dict[str, float], meses: int = 12) -> float:
    vs = [cache[p["vence"]] for p in fin["parcelas"] if p["vence"] in cache][-meses:]
    if not vs:  # sem TR ainda: as parcelas pagas do próprio extrato
        vs = [(p["ind"] - 1) * 100 for p in fin["parcelas"] if p["situacao"] == "paga" and p["n"] > 1][-meses:]
    return statistics.mean(vs) if vs else 0.0


def projetar(fin: dict[str, Any], cache: dict[str, float], tr_fixa: float | None = None, extra: float = 0.0,
             modo: str = "prazo") -> dict[str, Any]:
    """Pagas (do extrato e as corrigidas por quem paga) + futuras previstas. tr_fixa: TR igual todo mês (0 = como o
    extrato do banco). extra: amortização extraordinária na próxima parcela (modo "prazo" ou "parcela")."""
    ps = fin["parcelas"]
    pagas = [p for p in ps if p["situacao"] == "paga"]
    abertas = [p for p in ps if p["situacao"] != "paga"]
    if len(pagas) < 2 or not abertas:
        raise Falha("O extrato precisa ter ao menos duas parcelas pagas e uma a vencer.")
    a2, a = pagas[-2], pagas[-1]
    taxa = a["juros"] / (a2["saldo"] * a["ind"])
    # seguro: a taxa do extrato mês a mês (com as faixas de idade), no nível da última paga
    ant, r_mip = a, []
    for p in abertas:
        r_mip.append(p["mip"] / ant["saldo"] if ant["saldo"] else 0.0)
        ant = p
    nivel = (a["mip"] / (a2["saldo"] * a["ind"])) / r_mip[0] if r_mip and r_mip[0] else 1.0
    media = _tr_media(fin, cache)
    saldo, amort, dfi = a["saldo"], a["amort"], a["dfi"]
    anterior = a["vence"]
    futuras = []
    restantes = len(abertas)
    for k, p in enumerate(abertas):
        if tr_fixa is not None:
            tr, tipo = tr_fixa, "estimada"
        elif anterior in cache:
            tr, tipo = cache[anterior], "prevista"
        else:
            tr, tipo = media, "estimada"
        f = 1 + tr / 100
        sc = saldo * f
        if k == 0 and extra:
            sc = max(0.0, sc - extra)
            if modo == "parcela":
                amort = sc / restantes / f
        amort = min(amort * f, sc)
        juros = sc * taxa
        mip = sc * r_mip[k] * nivel
        dfi = dfi * f if sc > 0.005 else 0.0
        tsa = p["tsa"] or 0.0
        total = round(amort, 2) + round(juros, 2) + round(mip, 2) + round(dfi, 2) + tsa
        saldo = sc - amort
        futuras.append({"n": p["n"], "vence": p["vence"], "total": round(total, 2), "amort": round(amort, 2), "juros": round(juros, 2),
                        "mip": round(mip, 2), "dfi": round(dfi, 2), "tsa": tsa, "saldo": round(max(saldo, 0), 2), "tr": round(tr, 4),
                        "tipo": tipo, "extrato": p["total"]})
        anterior = p["vence"]
        if saldo <= 0.005:
            break
    pagos = fin.get("pagos") or {}
    hist = [{"n": p["n"], "vence": p["vence"], "total": p["total"], "amort": p["amort"], "juros": p["juros"], "mip": p["mip"],
             "dfi": p["dfi"], "tsa": p["tsa"], "saldo": p["saldo"], "tr": round((p["ind"] - 1) * 100, 4), "tipo": "paga",
             "pago_em": p["pago_em"], "pago": p["pago"]} for p in pagas]
    for x in futuras:  # paga depois do extrato (débito do dia ou valor corrigido por quem paga)
        if str(x["n"]) in pagos:
            pg = pagos[str(x["n"])]
            x.update({"tipo": "paga", "pago_em": pg.get("em"), "pago": pg.get("valor"), "previsto": x["total"]})
    return {"pagas": hist, "futuras": futuras, "taxa_mes": round(taxa * 100, 5), "tr_media": round(media, 4)}


def faixas_seguro(fin: dict[str, Any], minimo: float = 0.05) -> list[dict[str, Any]]:
    """Mudanças de faixa de idade do MIP que o extrato já mostra (a taxa do seguro sobe de uma parcela para a outra)."""
    abertas = [p for p in fin["parcelas"] if p["situacao"] != "paga"]
    ant = next((p for p in reversed(fin["parcelas"]) if p["situacao"] == "paga"), None)
    out, r_ant = [], None
    for p in abertas:
        r = p["mip"] / ant["saldo"] if ant and ant["saldo"] else 0
        if r_ant and r / r_ant - 1 > minimo:
            out.append({"vence": p["vence"], "alta": round(r / r_ant - 1, 3), "mais": round(p["mip"] - ant["mip"], 2)})
        r_ant, ant = r, p
    return out


def resumo(fin: dict[str, Any], cache: dict[str, float], hoje: date | None = None) -> dict[str, Any]:
    hoje = hoje or date.today()
    pj = projetar(fin, cache)
    banco = projetar(fin, cache, tr_fixa=0.0)
    soma = lambda L, c: round(sum(x[c] for x in L), 2)
    pendentes = [x for x in pj["futuras"] if x["tipo"] != "paga"]
    prox = pendentes[0] if pendentes else None
    saldo = (pj["futuras"][len(pj["futuras"]) - len(pendentes) - 1]["saldo"] if len(pendentes) < len(pj["futuras"]) else pj["pagas"][-1]["saldo"])
    pagas_n = len(pj["pagas"]) + (len(pj["futuras"]) - len(pendentes))
    ano = str(hoje.year)
    do_ano = [x for x in pj["pagas"] + pj["futuras"] if x["vence"][:4] == ano]
    return {"saldo": saldo, "pagas": pagas_n, "prazo": fin["prazo"], "proxima": prox, "fim": pj["futuras"][-1]["vence"],
            "imovel": fin.get("imovel"), "ja_de_voces": round(fin["imovel"] - saldo, 2) if fin.get("imovel") else None,
            "a_pagar": soma(pendentes, "total"), "juros_a_pagar": soma(pendentes, "juros"),
            "a_pagar_extrato": soma([x for x in banco["futuras"] if x["tipo"] != "paga"], "total"),
            "tr_media": pj["tr_media"], "taxa_mes": pj["taxa_mes"], "seguro": faixas_seguro(fin),
            "ir": {"ano": ano, "pago": soma(do_ano, "total"), "juros": soma(do_ano, "juros"),
                   "saldo_fim": next((x["saldo"] for x in reversed(do_ano)), saldo)},
            "parcelas": pj["pagas"] + pj["futuras"], "extrato": [{"vence": x["vence"], "saldo": x["saldo"]} for x in banco["futuras"]]}


def simular(fin: dict[str, Any], cache: dict[str, float], valor: float, modo: str = "prazo") -> dict[str, Any]:
    base = projetar(fin, cache)
    sim = projetar(fin, cache, extra=valor, modo=modo)
    jb = sum(x["juros"] for x in base["futuras"])
    js = sum(x["juros"] for x in sim["futuras"])
    return {"valor": valor, "modo": modo, "economia": round(jb - js, 2), "fim": sim["futuras"][-1]["vence"],
            "meses_a_menos": len(base["futuras"]) - len(sim["futuras"]),
            "parcela_depois": sim["futuras"][1]["total"] if len(sim["futuras"]) > 1 else 0.0}


# ---------------------------------------------------------------- ações (o card chama)
def _achar(db: dict[str, Any], fid: str | None) -> dict[str, Any]:
    fins = db.get("financiamentos") or []
    f = next((x for x in fins if x["id"] == fid), None) if fid else (fins[0] if fins else None)
    if not f:
        raise Falha("Nenhum financiamento cadastrado ainda. Leia o extrato do banco na aba Financiamento.")
    return f


def financiamento_ler(p: dict[str, Any]) -> dict[str, Any]:
    """{conteudo: base64 do JSON [[página, x, y, texto], ...], nome?, quem?, id?}. Ler de novo o mesmo financiamento
    troca a base (as parcelas) e mantém o que foi anotado (nome, quem, pagamentos)."""
    try:
        linhas = json.loads(base64.b64decode(re.sub(r"\s", "", str(p.get("conteudo") or ""))).decode("utf-8"))
        assert isinstance(linhas, list) and linhas
    except Exception as e:
        raise Falha("Não consegui abrir o extrato.") from e
    f = ler_extrato(linhas)
    del linhas  # o texto do PDF não fica guardado
    with file_lock():
        db = load_db()
        fins = db.setdefault("financiamentos", [])
        velho = next((x for x in fins if x["id"] == p.get("id")), None) or (fins[0] if len(fins) == 1 and not p.get("novo") else None)
        fid = velho["id"] if velho else f"fin{len(fins) + 1}"
        novo = {"id": fid, "nome": (p.get("nome") or (velho or {}).get("nome") or "Financiamento").strip()[:40],
                "quem": p.get("quem") or (velho or {}).get("quem"), "debito": (velho or {}).get("debito", True),
                **f, "banco": (velho or {}).get("banco") or f["banco"],  # o banco escolhido em Ajustes vale mais que o achado no PDF
                "pagos": {k: v for k, v in ((velho or {}).get("pagos") or {}).items()
                                if not any(x["n"] == int(k) and x["situacao"] == "paga" for x in f["parcelas"])},
                "lido_em": now_iso()}
        if velho:
            fins[fins.index(velho)] = novo
        else:
            fins.append(novo)
        try:
            atualizar_tr(db, forcar=True)
        except Falha:
            pass  # sem TR agora: a previsão usa a média do extrato e tenta de novo depois
        save_db(db)
    pagas = sum(1 for x in f["parcelas"] if x["situacao"] == "paga")
    return {"ok": True, "status": "atualizado" if velho else "novo", "id": fid,
            "mensagem": f"{novo['nome']}: {len(f['parcelas'])} parcelas lidas ({pagas} pagas), {f['sistema']} + {f['indexador']}, "
                        f"todo dia {f['dia']}."}


def _com_pagos(db: dict[str, Any], fin: dict[str, Any], hoje: date | None = None) -> dict[str, Any]:
    """O financiamento com o que foi pago depois do extrato: o ✓ Paguei de A pagar (db["pagos"], chave "<id>:<AAAA-MM>")
    e o débito automático (no dia do vencimento). O ✓ Paguei vale mais; "desfazer" (aberto) tira até o débito do dia."""
    hoje_s = (hoje or date.today()).isoformat()
    gerais, pagos = db.get("pagos") or {}, dict(fin.get("pagos") or {})
    for x in fin["parcelas"]:
        if x["situacao"] == "paga":
            continue
        n, g = str(x["n"]), gerais.get(f"{fin['id']}:{x['vence'][:7]}")
        if g and g.get("aberto"):
            pagos.pop(n, None)
        elif g:
            pagos[n] = {"em": str(g.get("em") or x["vence"])[:10], "valor": g.get("valor")}
        elif n not in pagos and fin.get("debito", True) and x["vence"] <= hoje_s and x["vence"] >= db.get("marco", ""):
            pagos[n] = {"em": x["vence"], "valor": None}
    return {**fin, "pagos": pagos}


def financiamento(p: dict[str, Any]) -> dict[str, Any]:
    """Os dados da aba: resumo, parcelas e projeção (busca a TR que faltar, se já passou o intervalo)."""
    with file_lock():
        db = load_db()
        if not db.get("financiamentos"):
            return {"ok": True, "financiamentos": []}
        try:
            if atualizar_tr(db):
                save_db(db)
        except Falha:
            pass
        cache = db.get("tr_bcb") or {}
        out = []
        for f in db["financiamentos"]:
            out.append({"id": f["id"], "nome": f["nome"], "quem": f.get("quem"), "banco": f["banco"], "sistema": f["sistema"],
                        "indexador": f["indexador"], "dia": f["dia"], "debito": f.get("debito", True), "lido_em": f.get("lido_em"),
                        **resumo(_com_pagos(db, f), cache)})
    return {"ok": True, "financiamentos": out, "tr_consulta": db.get("tr_bcb_consulta")}


def financiamento_simular(p: dict[str, Any]) -> dict[str, Any]:
    db = load_db()
    f = _achar(db, p.get("id"))
    valor = float(p.get("valor") or 0)
    if not 0 < valor < 10_000_000:
        raise Falha("Informe o valor da amortização.")
    return {"ok": True, **simular(_com_pagos(db, f), db.get("tr_bcb") or {}, valor, "parcela" if p.get("modo") == "parcela" else "prazo")}


def financiamento_pago(p: dict[str, Any]) -> dict[str, Any]:
    """Anota uma parcela paga depois do extrato (valor que saiu da conta). valor vazio: desfaz."""
    with file_lock():
        db = load_db()
        f = _achar(db, p.get("id"))
        n = str(int(p.get("n")))
        pagos = f.setdefault("pagos", {})
        if p.get("valor") in (None, ""):
            pagos.pop(n, None)
        else:
            pagos[n] = {"valor": round(float(p["valor"]), 2), "em": str(p.get("em") or date.today().isoformat())[:10]}
        save_db(db)
    return {"ok": True, "mensagem": "Parcela anotada."}


def financiamento_ajustar(p: dict[str, Any]) -> dict[str, Any]:
    """Nome, de quem é, banco (o PDF nem sempre diz: o logo é imagem) e se é débito automático."""
    with file_lock():
        db = load_db()
        f = _achar(db, p.get("id"))
        if p.get("nome"):
            f["nome"] = str(p["nome"]).strip()[:40]
        if "quem" in p:
            f["quem"] = p.get("quem") or None
        if "debito" in p:
            f["debito"] = bool(p["debito"])
        if p.get("banco") in {b for b, _rx in BANCOS} | {""}:
            f["banco"] = p["banco"]
        save_db(db)
    return {"ok": True}


def financiamento_apagar(p: dict[str, Any]) -> dict[str, Any]:
    with file_lock():
        db = load_db()
        f = _achar(db, p.get("id"))
        db["financiamentos"] = [x for x in db["financiamentos"] if x is not f]
        save_db(db)
    return {"ok": True, "mensagem": f"{f['nome']} apagado."}
