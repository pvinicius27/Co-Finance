"""Faturas do banco lidas pelo card (PDF → linhas pelo pdf.js → faturas.ler_fatura): gravar, ligar às compras e mostrar.

Fica em db["faturas_banco"][id], id igual ao das faturas calculadas ("ss:2026-10-16"): o total do banco passa a
valer em A pagar. Compra marcada em outro cartão que a fatura mostra no cartão certo é corrigida e vai para o sino.
"""
from __future__ import annotations

import base64
import copy
import json
import re
from typing import Any

from .base import Falha, fmt_brl, now_iso
from .dados import file_lock, load_db, save_db
from .faturas import LEITORES, assinaturas, conciliar, e_credito, ler_fatura, periodo
from .lista import anotar_mudanca
from .pedidos import ligar_pedidos_na_fatura
from .pagamentos import _pgs_fin, rotulo_cartao

BANCOS = {"santander": "Santander", "bb": "Banco do Brasil", "bradesco": "Bradesco", "itau": "Itaú", "brb": "BRB", "btg": "BTG Pactual",
          "caixa": "Caixa", "inter": "Inter", "nubank": "Nubank"}
assert set(BANCOS) == {b for b, *_ in LEITORES}


def _resumo(f: dict[str, Any], k: dict[str, Any]) -> dict[str, Any]:
    finais = (k or {}).get("finais") or {}
    cp = [l for l in f["linhas"] if l["tipo"] == "compra"]
    return {"id": f["id"], "cartao": f["cartao"], "banco": f["banco"], "vence": f["vence"], "fecha": f.get("fecha"),
            "inicio": f.get("inicio"), "total": f["total"], "linhas": len(f["linhas"]), "compras": len(cp),
            "ligadas": sum(1 for l in cp if l.get("compra")), "estornos": sum(1 for l in f["linhas"] if l["tipo"] == "estorno"),
            "parcelas": sum(1 for l in cp if l.get("parcela")), "lida_em": f.get("lida_em"), "arquivo": f.get("arquivo"),
            "finais_novos": sorted({l["final"] for l in f["linhas"] if l["final"] and l["final"] not in finais})}


def conferir_supostas(db: dict[str, Any], cid: str) -> list[str]:
    """Apple Pay que entrou no crédito suposto (cartão de crédito e débito) e cuja data já está numa fatura lida desse
    cartão (do início até 2 dias antes do fechamento; o resto, a próxima fatura decide): ligada a uma linha = era
    crédito mesmo; sem linha = foi débito (vai para o sino; Desfazer volta para crédito). Devolve as que viraram débito."""
    from .pagamentos import data_efetiva, valor_efetivo
    from .base import nome_loja
    from datetime import date, timedelta
    fs = [f for f in (db.get("faturas_banco") or {}).values() if f["cartao"] == cid and f.get("inicio") and f.get("fecha")]
    ligadas = {l["compra"] for f in (db.get("faturas_banco") or {}).values() for l in f["linhas"] if l.get("compra")}
    k = next((x for x in db.get("cartoes") or [] if x.get("id") == cid), None)
    feito = []
    for c in db["compras"]:
        if c.get("excluida_em"):
            continue
        pgs = [pg for pg in c.get("pagamentos") or [] if pg.get("forma_suposta") and pg.get("cartao") == cid]
        if not pgs:
            continue
        if c["id"] in ligadas:
            for pg in pgs:
                pg.pop("forma_suposta", None)  # veio na fatura: crédito confirmado
            continue
        d = str(data_efetiva(c) or "")[:10]
        f = next((f for f in sorted(fs, key=lambda f: f["vence"])
                  if f["inicio"] <= d and d <= str(date.fromisoformat(f["fecha"]) - timedelta(days=2))), None)
        if not f or not k or not k.get("debito"):
            continue
        antes = {"pagamentos": copy.deepcopy(c.get("pagamentos"))}
        for pg in antes["pagamentos"]:
            pg.pop("forma_suposta", None)  # Desfazer = era crédito mesmo (não volta a perguntar)
        for pg in pgs:
            pg["tipo"] = "Débito"
            pg.pop("parcelas", None)
            pg.pop("forma_suposta", None)
            pg["cartao_via"] = "fatura"
        nome = rotulo_cartao(k, db.get("cartoes") or [])
        anotar_mudanca(db, c, f"Débito: a compra paga pelo telefone ({d[8:10]}/{d[5:7]}, {fmt_brl(valor_efetivo(c) or 0)}) tinha entrado "
                              f"no crédito, mas não veio na fatura {nome} que vence em {f['vence'][8:10]}/{f['vence'][5:7]}. "
                              "Confirmar = foi débito · Desfazer = volta para crédito.", antes)
        feito.append(f"{nome_loja(c['loja'])} {fmt_brl(valor_efetivo(c) or 0)}")
    return feito


def fatura_ler(p: dict[str, Any]) -> dict[str, Any]:
    """{arquivo, conteudo: base64 do JSON [[página, x, y, texto], ...]}. A mesma fatura lida de novo substitui a anterior."""
    arquivo = re.sub(r"[\\/]+", "/", str(p.get("arquivo") or "")).split("/")[-1][:120]
    try:
        linhas_pdf = json.loads(base64.b64decode(re.sub(r"\s", "", str(p.get("conteudo") or ""))).decode("utf-8"))
        assert isinstance(linhas_pdf, list) and linhas_pdf
    except Exception as e:
        raise Falha(f"{arquivo or 'Arquivo'}: não consegui abrir.") from e
    f = ler_fatura(linhas_pdf)
    del linhas_pdf  # o texto do PDF não fica guardado em lugar nenhum
    if not f["conferencia"]["bate"]:
        c = f["conferencia"]
        raise Falha(f"{arquivo}: a soma das linhas ({fmt_brl(c['soma_linhas'])}) não bate com a fatura "
                    f"({fmt_brl(c['esperado'])}). Não gravei; me avise para eu ajustar a leitura.")
    with file_lock():
        db = load_db()
        k = next((x for x in db.get("cartoes") or [] if x.get("banco") == f["banco"]), None)
        if not k:  # cadastrado só com o banco do desenho (emissor): se houver um único cartão de crédito daquele banco, ele passa a ler a fatura
            cands = [x for x in db.get("cartoes") or [] if x.get("emissor") == f["banco"] and not x.get("banco")
                     and x.get("credito", True) and x.get("ativo", True)]
            if len(cands) == 1:
                k = cands[0]
                k["banco"] = f["banco"]
        if not k:
            raise Falha(f"{arquivo}: fatura do {BANCOS[f['banco']]}, mas nenhum cartão tem esse banco. "
                        "Escolha o banco no cadastro do cartão (A pagar › ✎ › Cartões).")
        guardadas = db.setdefault("faturas_banco", {})
        fid = f"{k['id']}:{f['vence']}"
        antes_dela = [x for x in guardadas.values() if x["cartao"] == k["id"] and x["vence"] < f["vence"]]
        periodo(f, k.get("fecha"), max((x.get("fecha") or "" for x in antes_dela), default=None) or None)
        usadas = {l["compra"] for x in guardadas.values() if x["id"] != fid for l in x["linhas"] if l.get("compra")}
        conciliar(f, db["compras"], k["id"], usadas)
        trocas = []
        for l in f["linhas"]:
            if not (l.get("outro_cartao") or l.pop("completar_cartao", False)):
                continue
            c = next(x for x in db["compras"] if x["id"] == (l.get("outro_cartao") or l["compra"]))
            campo = "cobrado" if (c.get("cobrado") or {}).get("pagamentos") else "pagamentos"
            antes = {campo: copy.deepcopy(c.get(campo))}
            velho = sorted({pg.get("cartao") for pg in _pgs_fin(c) if pg.get("cartao") and pg.get("cartao") != k["id"]})
            for pg in _pgs_fin(c):
                if pg.get("cartao") != k["id"] and e_credito(pg):
                    pg["cartao"], pg["cartao_via"] = k["id"], "fatura"
            nomes = {x["id"]: rotulo_cartao(x, db.get("cartoes") or []) for x in db.get("cartoes") or []}
            de = f"trocado de {', '.join(nomes.get(v, v) for v in velho)} para" if velho else "escolhido:"
            anotar_mudanca(db, c, f"Cartão {de} {rotulo_cartao(k, db.get('cartoes') or [])}: "
                                  f"a compra está na fatura {rotulo_cartao(k, db.get('cartoes') or [])} que vence em {f['vence'][8:10]}/{f['vence'][5:7]} "
                                  f"(final {l['final']}, {l['data'][8:10]}/{l['data'][5:7]}, {fmt_brl(l['valor'])}).", antes)
            l["compra"] = l.pop("outro_cartao", None) or l["compra"]
            trocas.append(c["id"])
        nova = fid not in guardadas
        guardadas[fid] = {"id": fid, "cartao": k["id"], **{x: f[x] for x in ("banco", "vence", "fecha", "inicio", "total", "anterior",
                                                                              "conferencia", "linhas")},
                          "arquivo": arquivo or None, "lida_em": now_iso()}
        ligar_pedidos_na_fatura(db, guardadas[fid], k["id"])  # loja online: a cobrança é o pedido inteiro (várias partes)
        from .importar_faturas import religar_da_fatura, revisar_parceladas
        religar_da_fatura(db)  # lida de novo: as compras já trazidas dela voltam a ficar ligadas (não são oferecidas de novo)
        paradas = revisar_parceladas(db)  # parcelada estornada que parou de vir: valor real (vai para o sino)
        debitos = conferir_supostas(db, k["id"])  # Apple Pay no crédito suposto que não veio na fatura: débito (sino)
        save_db(db)
        r = _resumo(guardadas[fid], k)
    msg = (f"{rotulo_cartao(k, db.get('cartoes') or [])} {f['vence'][8:10]}/{f['vence'][5:7]}/{f['vence'][:4]}: {fmt_brl(f['total'])} · {r['linhas']} linhas"
           f" · {r['ligadas']} {'compra ligada' if r['ligadas'] == 1 else 'compras ligadas'}"
           f"{f' · cartão acertado em {len(trocas)} (veja no sino)' if trocas else ''}"
           f"{' · final novo: ' + ', '.join(r['finais_novos']) if r['finais_novos'] else ''}"
           f"{' · parcelada cancelada: ' + '; '.join(paradas) + ' (veja no sino)' if paradas else ''}"
           f"{' · pago pelo telefone, mas foi no débito: ' + '; '.join(debitos) + ' (veja no sino)' if debitos else ''}"
           f"{'' if nova else ' (lida de novo)'}.")
    return {"ok": True, "status": "nova" if nova else "atualizada", "id": fid, "mensagem": msg}


def faturas_banco(p: dict[str, Any]) -> dict[str, Any]:
    """Tela: {} → resumo de todas + assinaturas; {"id"} → as linhas daquela fatura, com a loja das compras ligadas."""
    with file_lock():
        db = load_db()
    guardadas = db.get("faturas_banco") or {}
    cartoes = {k["id"]: k for k in db.get("cartoes") or []}
    fid = p.get("id")
    if fid:
        f = guardadas.get(fid)
        if not f:
            raise Falha("Fatura não encontrada.")
        k = cartoes.get(f["cartao"]) or {}
        finais = k.get("finais") or {}
        lojas = {c["id"]: c.get("loja_curta") or (c.get("loja") or {}).get("nome") for c in db["compras"]}
        linhas = [{**l, "quem": (finais.get(l["final"]) or {}).get("quem"), "loja_compra": lojas.get(l.get("compra"))} for l in f["linhas"]]
        return {"ok": True, "status": "fatura_banco", "fatura": {**_resumo(f, k), "linhas": linhas, "conferencia": f["conferencia"]}}
    lst = sorted(guardadas.values(), key=lambda f: (f["cartao"], f["vence"]))
    ass = assinaturas(lst)
    for a in ass:
        k = next((x for x in cartoes.values() if x.get("banco") == a["banco"]), {})
        a["cartao"] = k.get("id")
        a["quem"] = sorted({((k.get("finais") or {}).get(fi) or {}).get("quem") or "?" for fi in a["finais"]})
    return {"ok": True, "status": "faturas_banco", "faturas": [_resumo(f, cartoes.get(f["cartao"])) for f in reversed(lst)],
            "assinaturas": ass, "bancos": BANCOS}


def fatura_apagar(p: dict[str, Any]) -> dict[str, Any]:
    """Tira uma fatura lida (ela volta a ser só a soma das compras lançadas). Não mexe nas compras."""
    with file_lock():
        db = load_db()
        f = (db.get("faturas_banco") or {}).pop(str(p.get("id") or ""), None)
        if not f:
            raise Falha("Fatura não encontrada.")
        save_db(db)
    return {"ok": True, "status": "fatura_apagada", "mensagem": f"Fatura de {f['vence'][8:10]}/{f['vence'][5:7]} tirada."}
