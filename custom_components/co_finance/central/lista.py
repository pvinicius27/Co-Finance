"""Aba Compras do card: lista, cupom, editar, apelido, anexar, excluir, reembolso."""
from __future__ import annotations

import base64
import os
import re
import tempfile
from datetime import date
from datetime import datetime
from typing import Any

from .config import NOTAS_DIR, TIPOS_PAG
from .copia import apagar_de_vez, guardar_excluida
from .veiculo import consumo, litros
from .base import Falha, _valor_txt, fmt_brl, nome_loja, norm_txt, now_iso
from .dados import compradores, file_lock, load_db, save_db
from .categorias import _aplicar_classe, checar_classe, classe_item_manual
from .lancamento import item_manual
from .pagamentos import (
    CARTEIRAS,
    MOTIVOS_COBRADO,
    _pgs_fin,
    _tipo_pag,
    _valor_pg,
    aceita,
    data_efetiva,
    dividir,
    pago_com,
    rotulo_cartao,
    valor_efetivo,
)
from .cartoes import _cartao, finais_sino, texto_fatura, usam_hoje
from .copia import ANEXO_TIPOS, tem_copia
from .produtos import _entradas, _grupo, _variacao, chave_produto, variacoes
from .applepay import _ap_casar_notas
from .avisos import cfg_casa



def sem_link(c: dict[str, Any], itens: bool = False) -> dict[str, Any]:
    out = {k: v for k, v in c.items() if k not in ("link", "itens")}
    out["loja_curta"] = nome_loja(c.get("loja") or {})
    out["pago_com"] = pago_com(c)
    out["tem_nota"] = tem_copia(c)
    out["tem_qr"] = (c.get("chave") or "")[20:22] == "65" and (out["tem_nota"] or bool(c.get("link")))  # NF-e não tem QR
    if itens:
        out["itens"] = c.get("itens", [])
    return out


def _da_compra(c: dict[str, Any] | None) -> dict[str, Any]:
    """O dia (o da compra, não o da emissão da nota) e o valor que conta, para o sino mostrar junto da mudança."""
    if not c:
        return {}
    return {"compra_dia": c.get("data_compra") or c.get("emissao"), "compra_valor": valor_efetivo(c)}


def listar(p: dict[str, Any]) -> dict[str, Any]:
    from .importar_faturas import pendentes_fatura as _pendentes_fatura  # aqui dentro: importar_faturas usa anotar_mudanca
    with file_lock():
        db = load_db()
        if _ap_casar_notas(db) | _mudancas_resolvidas(db):
            save_db(db)
    # o card pergunta "mudou desde X?" a cada minuto: sem mudança, a resposta é curta (a lista inteira já passa de 900 KB)
    if p.get("desde") and p["desde"] == db.get("atualizado_em"):
        return {"ok": True, "status": "igual", "atualizado_em": db.get("atualizado_em")}
    por_id = {c["id"]: c for c in db["compras"]}
    devemos: dict[str, float] = {}
    a_receber: dict[str, float] = {}  # de quem → quanto (o valor combinado ou a compra inteira)
    for c in db["compras"]:
        r = c.get("reembolso") or {}
        if r.get("status") == "a_reembolsar":
            para = r.get("para") or c["quem"]  # quem vai receber de vocês (padrão: quem comprou, que pagou do bolso)
            devemos[para] = round(devemos.get(para, 0) + (valor_efetivo(c) or 0), 2)
        elif r.get("status") == "a_receber" and not c.get("excluida_em"):
            de = r.get("de") or "?"
            a_receber[de] = round(a_receber.get(de, 0) + (r.get("valor") if r.get("valor") is not None else (valor_efetivo(c) or 0)), 2)
    return {"ok": True, "status": "lista", "atualizado_em": db.get("atualizado_em"),
            "compradores": db["compradores"], "pessoas": db["pessoas"], "categorias": db["categorias"], "arvore": db["arvore"],
            "bens": [{"id": b["id"], "nome": b["nome"], "tipo": b.get("tipo"), "placa_final": b.get("placa_final") or [],
                      **({"consumo": consumo(db, b["id"])} if b.get("tipo") == "veiculo" else {})} for b in db.get("bens") or []],
            "avisos": cfg_casa(db), "atalho": db.get("atalho") or {}, "pedidos_email": _cfg_pedidos(db), "pedidos_parados": _parados(db),
            "devemos": devemos, "a_receber": a_receber, **variacoes(db),
            "applepay": [x for x in db.get("applepay") or [] if x.get("status") == "pendente"],
            "mudancas": [{**{k: x.get(k) for k in ("id", "em", "compra", "loja")}, "texto": _sem_siglas(db, x.get("texto") or ""),
                          **_da_compra(por_id.get(x.get("compra")))}  # o dia e o valor da compra, para conferir no calendário
                         for x in db.get("mudancas") or [] if x.get("status") == "pendente"],
            "faturas": _pendentes_fatura(db), "finais": finais_sino(db),
            "excluidas": [{"id": x["id"], "loja": nome_loja(x.get("loja") or {}), "valor": valor_efetivo(x), "emissao": x.get("data_compra") or x.get("emissao"),
                           "quem": x.get("quem"), "excluida_em": x.get("excluida_em"), "juntada": bool(x.get("juntada_na"))}
                          for x in reversed(db.get("excluidas") or [])],
            "compras": [_na_lista(c) for c in db["compras"]]}


def _mudancas_resolvidas(db: dict[str, Any]) -> bool:
    """Mudança do sino cuja compra foi editada pela tela depois dela (ou excluída): a pessoa já resolveu na compra."""
    por_id = {c["id"]: c for c in db["compras"]}
    mudou = False
    for m in db.get("mudancas") or []:
        if m.get("status") != "pendente":
            continue
        c = por_id.get(m["compra"])
        if not c or c.get("excluida_em") or any((a.get("em") or "") > m["em"] and a.get("acao") != "apelido" for a in c.get("ajustes") or []):
            m["status"], m["decidido_em"] = "resolvida na compra", now_iso()
            mudou = True
    return mudou


def anotar_mudanca(db: dict[str, Any], c: dict[str, Any], texto: str, antes: dict[str, Any]) -> None:
    """Ajuste feito por fora da tela (correção, migração): vai para o sino em "Mudanças para conferir".
    "antes" guarda os campos como estavam (None = não existia), para o Desfazer."""
    db.setdefault("mudancas", []).append({"id": f"mu{datetime.now():%Y%m%d%H%M%S%f}", "em": now_iso(), "compra": c["id"],
                                          "loja": nome_loja(c["loja"]), "texto": texto, "antes": antes, "status": "pendente"})


def mudanca(p: dict[str, Any]) -> dict[str, Any]:
    """Sino › Mudanças para conferir: {"id", "decisao": "ok" (confirma) | "desfazer" (volta os campos de antes)}."""
    mid, dec = str(p.get("id") or ""), p.get("decisao")
    if dec not in ("ok", "desfazer"):
        raise Falha("Pedido inválido.")
    with file_lock():
        db = load_db()
        m = next((x for x in db.get("mudancas") or [] if x["id"] == mid), None)
        if not m:
            raise Falha("Não achei essa mudança.")
        if m["status"] != "pendente":
            return {"ok": True, "status": "mudanca", "mensagem": "Essa mudança já foi conferida."}
        if dec == "desfazer":
            c = next((x for x in db["compras"] if x["id"] == m["compra"]), None)
            for k, v in (m.get("antes") or {}).items() if c else []:
                if v is None:
                    c.pop(k, None)
                else:
                    c[k] = v
            if m.get("parte"):  # nota que entrou num pedido de loja online: a parte do pedido volta a ser a compra
                from .pedidos import soltar_nota
                soltar_nota(db, m["parte"], c)
        m["status"], m["decidido_em"] = ("confirmada" if dec == "ok" else "desfeita"), now_iso()
        save_db(db)
    return {"ok": True, "status": "mudanca",
            "mensagem": "Confirmado." if dec == "ok" else f"Desfeito: {m['loja']} voltou como estava."}


def _sem_siglas(db: dict[str, Any], texto: str) -> str:
    """Textos antigos do sino citavam o cartão pela sigla interna ("SS de Ana"); na tela vai o nome do banco ("Santander")."""
    from .config import BANCOS_EMISSORES
    for k in db.get("cartoes") or []:
        sig, banco = str(k.get("nome") or ""), k.get("apelido") or BANCOS_EMISSORES.get(k.get("emissor") or k.get("banco") or "", "")
        if sig and banco and sig.isupper() and len(sig) <= 8 and sig != banco.upper():
            texto = re.sub(rf"\b{re.escape(sig)}\b", banco, texto)
    return texto


_FORA_DA_LISTA = ("fatura_banco", "ajustes", "registrado_em")  # a tela não usa na lista; a janela da compra busca o detalhe


def _na_lista(c: dict[str, Any]) -> dict[str, Any]:
    out = {k: v for k, v in sem_link(c).items() if k not in _FORA_DA_LISTA}
    if c.get("origem") == "manual":  # a busca de Compras acha pelo que foi comprado (lançado à mão)
        out["itens_txt"] = " ".join(i.get("descricao") or "" for i in c.get("itens") or [])[:200]
    if (lt := litros(c)) > 0:
        out["litros"] = lt  # abastecimento: o Editar mostra o grupo Veículo
    if c.get("data_compra"):
        out["emissao_nota"], out["emissao"] = c.get("emissao"), c["data_compra"]
    if (c.get("cobrado") or {}).get("valor") is not None:
        out["valor_nota"], out["valor_pago"] = c.get("valor_pago"), valor_efetivo(c)
    return out


def _cfg_pedidos(db: dict[str, Any]) -> dict[str, Any]:
    from .pedidos import cfg_tela  # aqui dentro: pedidos usa anotar_mudanca daqui
    return cfg_tela(db)


def _parados(db: dict[str, Any]) -> list[dict[str, Any]]:
    from .pedidos import parados
    return parados(db)


def detalhe(p: dict[str, Any]) -> dict[str, Any]:
    with file_lock():
        db = load_db()
    c = next((x for x in db["compras"] if x["id"] == p.get("id")), None)
    if not c:
        raise Falha("Compra não encontrada (pode ter sido excluída).")
    return _detalhe(db, c)


def _detalhe(db: dict[str, Any], c: dict[str, Any]) -> dict[str, Any]:
    g = _entradas(db)
    cnpj = c["loja"].get("cnpj", "")
    out = sem_link(c, itens=True)
    if (c.get("pedido") or {}).get("id"):  # loja online: o pedido do e-mail (vendedores, cobrança na fatura)
        from .pedidos import resumo
        out["pedido_resumo"] = resumo(db, c["pedido"]["id"])
    out["itens"] = [dict(i) for i in out["itens"]]
    if (lt := litros(c)) > 0:
        out["litros"] = lt
    for i in out["itens"]:
        if i.get("unit") is None:
            continue
        k = chave_produto(i, cnpj)
        ent = g.get(_grupo(db, k), [])
        e = {"data": c.get("emissao"), "loja": nome_loja(c["loja"]), "cnpj8": cnpj[:8], "unit": i["unit"],
             "un": (i.get("un") or "").upper(), "chave": k, "descricao": i.get("descricao") or ""}
        antes = [x for x in ent if (x["data"] or "") < (e["data"] or "")]  # só o que já existia na data do cupom
        i["anteriores"] = [{x_: x[x_] for x_ in ("data", "loja", "unit", "promo")} for x in antes[-5:]]
        i["primeira"] = not antes
        a, v = _variacao(ent, e)
        i["comparacao"] = {"de": a["unit"], "data": a["data"], "loja": a["loja"], "promo_antes": a["promo"],
                           "variacao": round(v, 4)} if a else None
    out["fatura_txt"] = texto_fatura(db, c)
    out["motivos_cobrado"] = MOTIVOS_COBRADO
    out["carteiras"] = CARTEIRAS
    out["cartoes"] = [{"id": k["id"], "nome": k["nome"], "rotulo": rotulo_cartao(k, db.get("cartoes") or []), "emissor": k.get("emissor"), "banco": k.get("banco"),
                       "apelido": k.get("apelido"), "dono": k.get("dono"), "bandeira": k.get("bandeira"), "usam": k.get("usam", []), "usam_hoje": usam_hoje(k), "debito": bool(k.get("debito")), "credito": k.get("credito", True), "vale": bool(k.get("vale")),
                       "ativo": k.get("ativo", True), "com_dias": bool(k.get("fecha") and k.get("vence"))} for k in db.get("cartoes") or []]
    out["pagamentos"] = [{**pg, "_tipo": _tipo_pag(pg)} for pg in c.get("pagamentos") or []]  # os da nota (cópia fiel)
    out["pagamentos_fin"] = [{**pg, "_tipo": _tipo_pag(pg)} for pg in _pgs_fin(c)]  # os que valem para o dinheiro
    out["divisao_real"] = bool((c.get("cobrado") or {}).get("pagamentos"))
    return {"ok": True, "status": "detalhe", "compra": out}


def _alterar(p: dict[str, Any], fn) -> dict[str, Any]:
    ids = p.get("ids") or ([p["id"]] if p.get("id") else [])
    if not ids:
        raise Falha("Nenhuma compra escolhida.")
    with file_lock():
        db = load_db()
        achou = [c for c in db["compras"] if c["id"] in ids]
        if not achou:
            raise Falha("Compra não encontrada (pode ter sido excluída).")
        for c in achou:
            fn(db, c)
            c.setdefault("ajustes", []).append({"em": now_iso(), "acao": p.get("acao")})
        save_db(db)
    return {"ok": True, "status": "alterado", "qtd": len(achou), "mensagem": f"{len(achou)} compra(s) atualizada(s)."}


def marcar_pago(p: dict[str, Any]) -> dict[str, Any]:
    data = p.get("data") or datetime.now().strftime("%Y-%m-%d")

    def fn(db, c):
        r = c.get("reembolso") or {}
        if r.get("status") == "a_reembolsar":
            c["reembolso"] = {**r, "status": "pago", "pago_em": data}
        elif r.get("status") == "a_receber":  # recebido: de quem, valor e observação ficam
            c["reembolso"] = {**r, "status": "recebido", "pago_em": data}
    return _alterar(p, fn)


def desfazer_pago(p: dict[str, Any]) -> dict[str, Any]:
    def fn(db, c):
        r = c.get("reembolso") or {}
        if r.get("status") == "pago":
            c["reembolso"] = {**r, "status": "a_reembolsar", "pago_em": None}
        elif r.get("status") == "recebido":
            c["reembolso"] = {**r, "status": "a_receber", "pago_em": None}
    return _alterar(p, fn)


def _editar_fn(p: dict[str, Any]):
    """As regras do editar: confere o pedido e devolve a função que aplica a mudança na compra."""
    quem, cat, reemb = p.get("quem"), p.get("categoria"), p.get("reembolso")
    sub = p.get("subcategoria")
    if quem is not None and quem not in compradores():
        raise Falha(f"Quem comprou? Use {', '.join(compradores())}.")
    if reemb is not None and reemb not in ("nao", "a_reembolsar", "pago", "a_receber", "recebido"):
        raise Falha("Situação de reembolso desconhecida.")
    # a receber: de quem (pessoa ou empresa), quanto (vazio = a compra inteira) e uma observação
    r_de = None if p.get("reembolso_de") is None else str(p.get("reembolso_de")).strip()[:60]
    r_obs = None if p.get("reembolso_obs") is None else str(p.get("reembolso_obs")).strip()[:120]
    r_para = None if p.get("reembolso_para") is None else str(p.get("reembolso_para")).strip()[:60]  # a reembolsar: para quem
    r_val: Any = None
    if str(p.get("reembolso_valor") or "").strip():
        try:
            r_val = round(float(str(p["reembolso_valor"]).replace("R$", "").replace(".", "").replace(",", ".").strip()), 2)
        except ValueError:
            raise Falha("Valor a receber: use só números, ex.: 120,00.")
        if r_val <= 0:
            raise Falha("Valor a receber: precisa ser maior que zero.")
    if reemb in ("a_receber", "recebido") and r_de is not None and not r_de:
        raise Falha("A receber de quem? Escreva o nome da pessoa ou da empresa.")
    cartao_de, forma, bem = p.get("cartao_de"), p.get("forma"), p.get("bem")
    cart = p.get("cartao")  # {"i": índice do pagamento, "cartao": <id do cartão>, "parcelas": 3, "data_cartao": "2026-10-18"}
    cobr = p.get("cobrado")  # {"valor": "529,00" (vazio = tira), "motivo": "Cupom do app", "obs": "..."}
    dcompra = p.get("data_compra")  # "2026-10-18" (vazio = a da nota)
    item = p.get("item")  # compra sem nota: "O que comprou" (vazio = tira)
    if dcompra not in (None, "") and (not re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(dcompra)) or not "2000-01-01" <= dcompra <= date.today().isoformat()):
        raise Falha("Data da compra inválida (não pode ser no futuro).")
    valor_brl = None if p.get("valor_brl") is None else round(_valor_txt(p.get("valor_brl")) or 0.0, 2)  # "" = tira a conversão
    if cartao_de not in (None, "") and cartao_de not in compradores():
        raise Falha("De quem é o cartão?")
    forma = "Benefício" if forma == "Alelo" else forma  # nome antigo (tela de antes da 0.0.3)
    if forma not in (None, "") and forma not in TIPOS_PAG:
        raise Falha("Forma de pagamento desconhecida.")

    def fn(db, c):
        if item is not None:
            if c.get("origem") != "manual":
                raise Falha("Só compra sem nota tem o campo O que comprou.")
            c["itens"] = item_manual(item, c.get("valor_pago") or 0)
            c["qtd_itens"] = len(c["itens"])
            if c["itens"] and c.get("categoria") == "Outros" and (k := classe_item_manual(c["itens"][0]["descricao"])):
                c["categoria"], c["subcategoria"] = checar_classe(db, *k)
        if dcompra is not None and c.get("via") == "applepay":
            raise Falha("Compra paga pelo telefone fica com o dia e a hora do pagamento.")
        if dcompra is not None and c.get("origem") == "manual":  # lançada à mão: uma data só
            if dcompra:
                c["emissao"] = dcompra + ((c.get("emissao") or "")[10:] or "T12:00:00-03:00")
                db["compras"].sort(key=lambda x: x.get("emissao") or "", reverse=True)
            c.pop("data_compra", None)
        elif dcompra is not None:
            if dcompra and dcompra != (c.get("emissao") or "")[:10]:
                c["data_compra"] = f"{dcompra}T12:00:00-03:00"
            else:
                c.pop("data_compra", None)
        if isinstance(cobr, dict):
            atual = dict(c.get("cobrado") or {})
            if "valor" in cobr:
                if str(cobr.get("valor") or "").strip() == "":
                    atual = {}
                else:
                    v = round(_valor_txt(cobr.get("valor")) or 0.0, 2)
                    if v <= 0:
                        raise Falha("Valor cobrado inválido.")
                    if not c.get("valor_pago"):
                        raise Falha("Esta compra não tem valor em reais; use Editar compra.")
                    rp = atual.get("pagamentos") or []
                    velho = sum((x.get("valor") or 0) for x in rp)
                    if len(rp) > 1 and velho:
                        for x in rp[1:]:
                            x["valor"] = round((x.get("valor") or 0) * v / velho, 2)
                        rp[0]["valor"] = round(v - sum(x["valor"] for x in rp[1:]), 2)
                    elif rp:
                        rp[0]["valor"] = v
                    atual["valor"] = v
                    atual.setdefault("motivo", "Cupom do app")
            if "motivo" in cobr and atual:
                if cobr["motivo"] not in MOTIVOS_COBRADO:
                    raise Falha("Motivo desconhecido.")
                atual["motivo"] = cobr["motivo"]
            if "obs" in cobr and atual:
                atual["obs"] = re.sub(r"\s+", " ", str(cobr.get("obs") or "")).strip()[:80]
            if atual.get("valor") is not None and not atual.get("pagamentos") and abs(atual["valor"] - (c.get("valor_pago") or 0)) < 0.005:
                atual = {}  # igual ao da nota: não precisa
            if atual:
                c["cobrado"] = atual
            else:
                c.pop("cobrado", None)
        if isinstance(cart, dict):
            manual = c.get("origem") == "manual"
            real = (c.get("cobrado") or {}).get("pagamentos")
            if cart.get("dividir") and not manual and not real:  # nota: a divisão de verdade fica junto do valor cobrado
                if not c.get("valor_pago"):
                    raise Falha("Esta compra não tem valor em reais.")
                cb = c.setdefault("cobrado", {"valor": c.get("valor_pago"), "motivo": "Outro"})
                base = [x for x in c.get("pagamentos") or [] if (x.get("valor") or 0) > 0 or x.get("tipo") in TIPOS_PAG] \
                    or [{"forma": "", "valor": c.get("valor_pago")}]
                real = []
                for x in base:
                    novo = {"forma": "", "tipo": _tipo_pag(x), "valor": _valor_pg(c, x)}
                    novo.update({k_: x[k_] for k_ in ("cartao", "cartao_via", "parcelas", "data_cartao") if k_ in x})
                    real.append(novo)
                real[0]["valor"] = round(cb["valor"] - sum(x["valor"] for x in real[1:]), 2)
                cb["pagamentos"] = real
            pgs = real if real else c.setdefault("pagamentos", [])
            divisivel = manual or bool(real)
            total = valor_efetivo(c) or 0
            i = int(cart.get("i") or 0)
            if not pgs and i == 0:  # compra sem forma de pagamento: cria a primeira
                pgs.append({"forma": "", "valor": c.get("valor_pago")})
            if not 0 <= i < len(pgs):
                raise Falha("Pagamento não encontrado.")
            pg = pgs[i]
            if "tipo" in cart:  # a nota impressa não muda; vale para os totais e faturas
                t = cart.get("tipo") or ""
                t = cart["tipo"] = "Benefício" if t == "Alelo" else t
                if t and t not in TIPOS_PAG:
                    raise Falha("Forma de pagamento desconhecida.")
                if t:
                    pg["tipo"] = t
                else:
                    pg.pop("tipo", None)
                t = _tipo_pag(pg)
                if t != "Crédito":
                    pg.pop("parcelas", None); pg.pop("data_cartao", None)
                if t != "Saldo em carteira":
                    pg.pop("carteira", None)
                kk = _cartao(db, pg.get("cartao"))
                if not kk or not aceita(kk, t):  # ex.: crédito num cartão só de débito: o cartão sai e a tela pede outro
                    pg.pop("cartao", None); pg.pop("cartao_via", None)
            if "carteira" in cart:
                w = cart.get("carteira") or ""
                if w and w not in CARTEIRAS:
                    raise Falha("Carteira desconhecida.")
                if w:
                    pg["carteira"], pg["tipo"] = w, "Saldo em carteira"
                else:
                    pg.pop("carteira", None)
            if "cartao" in cart:
                kk = _cartao(db, cart["cartao"]) if cart["cartao"] else None
                if cart["cartao"] and not kk:
                    raise Falha("Cartão desconhecido.")
                if kk:
                    t = _tipo_pag(pg)
                    if t not in ("Crédito", "Débito", "Benefício"):  # forma que não usa cartão: o cartão escolhido decide
                        pg["tipo"] = t = "Benefício" if kk.get("vale") else "Crédito" if kk.get("credito", True) else "Débito"
                    if not aceita(kk, t):
                        raise Falha(f"O {rotulo_cartao(kk, db.get('cartoes') or [])} é de benefício. Troque a forma para Benefício." if kk.get("vale")
                                    else f"O {rotulo_cartao(kk, db.get('cartoes') or [])} não é cartão de benefício." if t == "Benefício"
                                    else f"O {rotulo_cartao(kk, db.get('cartoes') or [])} é só de débito. Troque a forma para Débito." if t == "Crédito"
                                    else f"O {rotulo_cartao(kk, db.get('cartoes') or [])} não está marcado como débito (⚙ › Cartões).")
                    pg["cartao"], pg["cartao_via"] = kk["id"], "você"
                else:
                    pg.pop("cartao", None); pg.pop("cartao_via", None)
            if cart.get("dividir"):
                if not divisivel:
                    raise Falha("Não deu para dividir este pagamento.")
                if len(pgs) >= 4:
                    raise Falha("No máximo 4 pagamentos.")
                a, b = dividir(_valor_pg(c, pg), 2)
                pg["valor"] = a
                pgs.insert(i + 1, {"forma": "", "tipo": _tipo_pag(pg), "valor": b})
            if "valor" in cart:
                if not divisivel or len(pgs) < 2:
                    raise Falha("Só dá para mudar o valor quando o pagamento está dividido.")
                v = round(_valor_txt(cart.get("valor")) or 0.0, 2)
                j = len(pgs) - 1 if i == 0 else 0  # a diferença vai para o outro pagamento
                resto = round(total - sum((x.get("valor") or 0) for n, x in enumerate(pgs) if n not in (i, j)) - v, 2)
                if v <= 0 or resto <= 0:
                    raise Falha(f"O valor precisa ficar entre zero e o total cobrado ({fmt_brl(total)}).")
                pg["valor"], pgs[j]["valor"] = v, resto
            if cart.get("remover"):
                if not divisivel or len(pgs) < 2 or i == 0:
                    raise Falha("Esse pagamento não pode ser removido.")
                pgs[0]["valor"] = round((pgs[0].get("valor") or 0) + (pg.get("valor") or 0), 2)
                pgs.pop(i)
            if "parcelas" in cart:
                n = int(cart.get("parcelas") or 1)
                if not 1 <= n <= 24:
                    raise Falha("Parcelas: de 1 a 24.")
                pg["parcelas"] = n
            if "data_cartao" in cart:
                d = str(cart.get("data_cartao") or "")
                if d and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", d):
                    raise Falha("Data inválida.")
                if d and d != (data_efetiva(c) or "")[:10]:
                    pg["data_cartao"] = d
                else:
                    pg.pop("data_cartao", None)
        if valor_brl is not None:
            if not c.get("moeda"):
                raise Falha("Só compras em outra moeda recebem valor convertido.")
            antes = c.get("valor_pago") or 0
            c["valor_pago"] = c["valor_produtos"] = valor_brl
            pgs = c.get("pagamentos") or []
            if len(pgs) > 1 and antes and valor_brl:
                for pg in pgs[1:]:
                    pg["valor"] = round((pg.get("valor") or 0) * valor_brl / antes, 2)
                pgs[0]["valor"] = round(valor_brl - sum(pg["valor"] for pg in pgs[1:]), 2)
            else:
                for pg in pgs:
                    pg["valor"] = valor_brl
        if bem is not None:  # "" = nenhum
            if bem and bem not in {b["id"] for b in db.get("bens") or []}:
                raise Falha("Bem desconhecido.")
            c["bem_manual"] = True
            if bem:
                c["bem"] = bem
            else:
                c.pop("bem", None)
        if cartao_de is not None:  # vazio volta para "de quem comprou"
            if cartao_de:
                c["cartao_de"] = cartao_de
            else:
                c.pop("cartao_de", None)
        if forma is not None:
            pgs = c.get("pagamentos") or []
            if len(pgs) > 1:
                raise Falha("Esta compra foi paga de mais de um jeito; a forma vem da nota.")
            pg = dict(pgs[0]) if pgs else {"forma": "", "valor": c.get("valor_pago")}
            if forma:
                pg["tipo"] = forma
            else:
                pg.pop("tipo", None)
            c["pagamentos"] = [pg] if (pg.get("forma") or pg.get("tipo")) else []
        if quem is not None:
            c["quem"] = quem
        if cat is not None or sub is not None:
            nc, ns = checar_classe(db, cat if cat is not None else c.get("categoria"), sub)
            _aplicar_classe(c, nc, ns, "você")
            cnpj = (c.get("loja") or {}).get("cnpj", "")
            c["categoria_manual"] = True  # escolhida por vocês: não muda mais sozinha
            if p.get("lembrar_loja", True) and len(cnpj) >= 8:
                db["categoria_loja"][cnpj[:8]] = [nc, ns]  # próximas compras dessa loja já vêm assim
        if reemb is not None:
            atual = c.get("reembolso") or {}
            fechado = reemb in ("pago", "recebido")
            novo = {"status": reemb, "pago_em": (atual.get("pago_em") or datetime.now().strftime("%Y-%m-%d")) if fechado else None}
            if reemb in ("a_reembolsar", "pago"):
                para = r_para if r_para is not None else atual.get("para") or ""
                if para and norm_txt(para) != norm_txt(c.get("quem") or ""):
                    novo["para"] = para
            if reemb in ("a_receber", "recebido"):
                de = r_de if r_de is not None else atual.get("de") or ""
                if not de:
                    raise Falha("A receber de quem? Escreva o nome da pessoa ou da empresa.")
                novo["de"] = de
                if str(p.get("reembolso_valor") or "").strip():
                    if r_val > round(float(valor_efetivo(c) or 0), 2) + 0.004:
                        raise Falha("O valor a receber é maior que a compra.")
                    novo["valor"] = r_val
                elif p.get("reembolso_valor") is None and atual.get("valor") is not None:
                    novo["valor"] = atual["valor"]
                obs = r_obs if r_obs is not None else atual.get("obs") or ""
                if obs:
                    novo["obs"] = obs
            c["reembolso"] = novo
    return fn


def editar(p: dict[str, Any]) -> dict[str, Any]:
    return _alterar(p, _editar_fn(p))


def pagamento_lote(p: dict[str, Any]) -> dict[str, Any]:
    """Pagamento da compra como rascunho (nada é gravado até Salvar): aplica as mudanças em ordem, como se fossem feitas
    uma a uma, com as regras do editar. simular=True devolve como a compra ficaria, sem gravar; sem ele, grava tudo junto."""
    pedidos = p.get("pedidos")
    if not isinstance(pedidos, list) or not pedidos or len(pedidos) > 60:
        raise Falha("Nenhuma mudança para salvar.")
    fns = []
    for x in pedidos:
        if not isinstance(x, dict) or not x or not set(x) <= {"cartao", "cobrado", "data_compra"}:
            raise Falha("Mudança inválida no pagamento.")
        fns.append(_editar_fn({**x, "id": p.get("id")}))
    with file_lock():
        db = load_db()
        c = next((x for x in db["compras"] if x["id"] == p.get("id")), None)
        if not c:
            raise Falha("Compra não encontrada (pode ter sido excluída).")
        for fn in fns:
            fn(db, c)
        if p.get("simular"):
            return {"ok": True, "status": "simulado", "compra": _detalhe(db, c)["compra"]}
        c.setdefault("ajustes", []).append({"em": now_iso(), "acao": "editar"})
        save_db(db)
    return {"ok": True, "status": "alterado", "mensagem": "Pagamento salvo."}


def apelido(p: dict[str, Any]) -> dict[str, Any]:
    """Como vocês chamam a loja. Com CNPJ vale para todas as compras dela; vazio volta ao nome da nota.
    Compra lançada à mão (sem CNPJ): troca só o nome daquela compra."""
    nome = re.sub(r"\s+", " ", str(p.get("apelido") or "")).strip()[:40]
    with file_lock():
        db = load_db()
        c = next((x for x in db["compras"] if x["id"] == p.get("id")), None)
        if not c:
            raise Falha("Compra não encontrada (pode ter sido excluída).")
        cnpj = (c.get("loja") or {}).get("cnpj") or ""
        if len(cnpj) >= 8:  # vale para a empresa toda (8 primeiros dígitos do CNPJ): todas as filiais
            db["apelidos"].pop(cnpj, None)
            if nome:
                db["apelidos"][cnpj[:8]] = nome
            else:
                db["apelidos"].pop(cnpj[:8], None)
            n = sum(1 for x in db["compras"] if str((x.get("loja") or {}).get("cnpj") or "")[:8] == cnpj[:8])
            msg = f"Loja agora aparece como “{nome}” ({n} compra(s))." if nome else "Loja voltou ao nome da nota."
        else:
            if not nome:
                raise Falha("Informe o nome.")
            c["loja"]["nome"] = nome
            c.setdefault("ajustes", []).append({"em": now_iso(), "acao": "apelido"})
            msg = f"Compra renomeada para “{nome}”."
        save_db(db)
    return {"ok": True, "status": "alterado", "mensagem": msg}


def anexar(p: dict[str, Any]) -> dict[str, Any]:
    """Guarda a foto/PDF do cupom de uma compra lançada à mão (substitui a anterior)."""
    try:
        dados = base64.b64decode(str(p.get("conteudo") or ""), validate=True)
    except ValueError:
        raise Falha("O arquivo do cupom chegou com defeito. Tente de novo.")
    ext = "jpg" if dados[:3] == b"\xff\xd8\xff" else "png" if dados[:8] == b"\x89PNG\r\n\x1a\n" else "pdf" if dados[:5] == b"%PDF-" else None
    if not ext:
        raise Falha("O cupom precisa ser foto (JPG/PNG) ou PDF.")
    if len(dados) > 8_000_000:
        raise Falha("Arquivo grande demais (máx. 8 MB).")
    with file_lock():
        db = load_db()
        c = next((x for x in db["compras"] if x["id"] == p.get("id")), None)
        if not c:
            raise Falha("Compra não encontrada.")
        if c.get("origem") != "manual":
            raise Falha("Só compras lançadas à mão recebem foto do cupom (as outras já guardam a nota).")
        NOTAS_DIR.mkdir(parents=True, exist_ok=True)
        fd, tmp = tempfile.mkstemp(dir=NOTAS_DIR, prefix=".anexo.", suffix=".tmp")
        with os.fdopen(fd, "wb") as f:
            f.write(dados)
        os.replace(tmp, NOTAS_DIR / f"{c['id']}.anexo.{ext}")
        for x in ANEXO_TIPOS:  # trocou de formato: tira o antigo
            if x != ext:
                (NOTAS_DIR / f"{c['id']}.anexo.{x}").unlink(missing_ok=True)
    return {"ok": True, "status": "anexo", "id": c["id"], "mensagem": f"Cupom guardado: {nome_loja(c['loja'])}, {fmt_brl(c.get('valor_pago'))}."}


def apagar_excluida(p: dict[str, Any]) -> dict[str, Any]:
    """⚙ › Excluídas › Apagar de vez (uma) ou Esvaziar (todas): some com a compra, a cópia da nota e os anexos."""
    with file_lock():
        db = load_db()
        xs = list(db.get("excluidas") or []) if p.get("todas") else [x for x in db.get("excluidas") or [] if x["id"] == p.get("id")]
        if not xs:
            raise Falha("Nada para apagar.")
        for c in xs:
            apagar_de_vez(db, c)
        save_db(db)
    n = len(xs)
    return {"ok": True, "status": "apagada", "mensagem": f"{n} compra(s) apagada(s) de vez." if n > 1 else f"Apagada de vez: {nome_loja(xs[0].get('loja') or {})}."}


def recuperar(p: dict[str, Any]) -> dict[str, Any]:
    """⚙ › Excluídas recentemente › Recuperar: a compra volta como estava (a juntada numa nota não volta)."""
    with file_lock():
        db = load_db()
        c = next((x for x in db.get("excluidas") or [] if x["id"] == p.get("id")), None)
        if not c:
            raise Falha("Essa compra não está mais nas excluídas.")
        if c.get("juntada_na"):
            raise Falha("Essa compra foi juntada numa nota: a nota já tem o que ela tinha.")
        if any(x["id"] == c["id"] for x in db["compras"]):
            raise Falha("Essa compra já está na lista (a nota foi lida de novo).")
        db["excluidas"].remove(c)
        c.pop("excluida_em", None)
        db["compras"].append(c)
        db["compras"].sort(key=lambda x: x.get("emissao") or "", reverse=True)
        save_db(db)
    return {"ok": True, "status": "recuperada", "id": c["id"], "mensagem": f"Compra recuperada: {nome_loja(c['loja'])}, {fmt_brl(valor_efetivo(c))}."}


def excluir(p: dict[str, Any]) -> dict[str, Any]:
    # Não some de vez: vai para "excluidas" (as 10 últimas), dá para recuperar ou apagar de vez em ⚙.
    with file_lock():
        db = load_db()
        c = next((x for x in db["compras"] if x["id"] == p.get("id")), None)
        if not c:
            raise Falha("Compra não encontrada.")
        db["compras"].remove(c)
        c["excluida_em"] = now_iso()
        guardar_excluida(db, c)
        save_db(db)
    return {"ok": True, "status": "excluida", "mensagem": f"Compra excluída: {nome_loja(c['loja'])}, {fmt_brl(c.get('valor_pago'))}."}
