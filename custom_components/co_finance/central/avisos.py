"""Avisos no celular (app do Home Assistant). A Central decide para quem vai cada aviso pelo cadastro do ⚙:
Pessoas (celular e o que cada um recebe) e Avisos (prazos, horários e o endereço do painel). As automações só
entregam a lista que volta daqui: [{"servico": "notify.mobile_app_…", "titulo", "mensagem", "dados"}].
Nenhum nome ou celular fica escrito nas automações."""
from __future__ import annotations

import re
from datetime import date, datetime, timedelta
from typing import Any

from .base import Falha, fmt_brl, nome_loja, norm_txt
from .pagamentos import valor_efetivo
from .veiculo import litros, precisa_km
from .cartao_aviso import acoes_cartao, casar_applepay_agora
from .dados import apelidos_de, file_lock, load_db, save_db

COMPRAS = ("todas", "novas_e_minhas", "minhas", "nenhuma")  # que compras a pessoa recebe no celular
PADRAO_PESSOA = {"celular": "", "compras": "nenhuma", "applepay": False, "contas": False}
PADRAO_CASA = {"dias_antes": 1, "hora_antes": 10, "horas_dia": [10, 13, 19], "atrasadas": True, "hora_atrasadas": 10, "painel": ""}
TITULOS = {"consulta": "🔎 Já comprei?", "nova": "🛒 Compra registrada", "atualizada": "🧾 Nota completada", "repetida": "🛒 Já registrada",
           "pedido_novo": "🛍️ Pedido online registrado", "pedido_cancelado": "🛍️ Pedido cancelado",
           "pedido_conferir": "🛍️ Pedido para conferir", "pedido_aguardando": "🛍️ Pedido recebido", "pedido_pago": "🛍️ Pagamento confirmado",
           "pedido_pago_sem_detalhes": "🛍️ Pagamento confirmado", "repetido": "🛍️ Pedido já lançado", "pedido_cancelado_": "🛍️ Pedido cancelado",
           "pedido_print": "🛍️ Mercado Livre: falta o print"}
MINHAS_COMPRAS_ML = "https://myaccount.mercadolivre.com.br/my_purchases/list"  # no celular com o app, abre no app


def cfg_pessoa(x: dict[str, Any]) -> dict[str, Any]:
    return {**PADRAO_PESSOA, **(x.get("aviso") or {})}


def cfg_casa(db: dict[str, Any]) -> dict[str, Any]:
    return {**PADRAO_CASA, **(db.get("avisos") or {})}


def _quem(db: dict[str, Any], q: Any) -> str:
    """Quem comprou, pelo nome ou por um apelido do Atalho ("Ana — sem reembolso" → Ana)."""
    p = (norm_txt(str(q or "")).split() or [""])[0]
    return next((x["nome"] for x in db.get("pessoas") or [] if p and (p in apelidos_de(x) or p == norm_txt(x["nome"]))), str(q or "").strip())


def _com_celular(db: dict[str, Any]):
    return [(x, a) for x in db.get("pessoas") or [] if (a := cfg_pessoa(x))["celular"]]


def _link(db: dict[str, Any], extra: str = "") -> dict[str, Any]:
    painel = cfg_casa(db)["painel"]
    return {"url": f"{painel}{extra}"} if painel else {}


def _aviso(x: dict[str, Any], a: dict[str, Any], titulo: str, mensagem: str, dados: dict[str, Any] | None = None) -> dict[str, Any]:
    return {"servico": a["celular"], "pessoa": x["nome"], "titulo": titulo, "mensagem": mensagem, "dados": dados or {}}


def para_compra(db: dict[str, Any], status: str, quem: str) -> list[tuple[dict, dict]]:
    """Compra que entrou (ou erro, ou consulta): "todas" recebe tudo; "novas_e_minhas" recebe toda compra nova e o que é
    dela; "minhas" só o que é dela."""
    out = []
    for x, a in _com_celular(db):
        sua = quem == x["nome"]
        nova = status in ("nova", "pedido_novo")
        if a["compras"] == "todas" or (a["compras"] == "novas_e_minhas" and (nova or sua)) or (a["compras"] == "minhas" and sua):
            out.append((x, a))
    return out


def para_applepay(db: dict[str, Any], quem: str) -> list[tuple[dict, dict]]:
    """Pergunta do Apple Pay: quem pagou e quem recebe todas as compras (o primeiro que responder vale)."""
    return [(x, a) for x, a in _com_celular(db) if a["applepay"] and (x["nome"] == quem or a["compras"] == "todas")]


def para_km(db: dict[str, Any], quem: str) -> list[tuple[dict, dict]]:
    """Pergunta do km, do cartão e do print: quem comprou e quem recebe todas as compras (o primeiro que responder vale;
    a resposta tira a pergunta dos dois celulares)."""
    return [(x, a) for x, a in _com_celular(db) if x["nome"] == quem or a["compras"] == "todas"]


def para_contas(db: dict[str, Any]) -> list[tuple[dict, dict]]:
    return [(x, a) for x, a in _com_celular(db) if a["contas"]]


def avisar(p: dict[str, Any]) -> dict[str, Any]:
    """O que mandar e para quem. tipo: compra (status, mensagem, quem, id, titulo?) · applepay (id, titulo, mensagem, quem)
    · applepay_resp (decisao, ok, mensagem, quem) · paguei (id, ok, mensagem)."""
    tipo = p.get("tipo") or "compra"
    if tipo == "compra" and p.get("status") == "nova" and p.get("id"):
        casar_applepay_agora(p.get("id"))  # a nota encontra o Apple Pay já: o cartão do iPhone entra antes de perguntar
    with file_lock():
        db = load_db()
    quem, msg, out = _quem(db, p.get("quem")), str(p.get("mensagem") or ""), []
    if tipo == "compra":
        st = str(p.get("status") or "erro")
        if st == "pedido_print":  # Mercado Livre: só quem comprou (sem celular, quem recebe todas), com o botão do app
            dados = {"tag": f"compras-print-{p.get('pedido') or ''}", "url": MINHAS_COMPRAS_ML,
                     "actions": [{"action": "URI", "title": "Abrir Minhas compras", "uri": MINHAS_COMPRAS_ML}]}
            return {"ok": True, "status": "avisar", "avisar": [_aviso(x, a, TITULOS[st], msg, dados) for x, a in para_km(db, quem)]}
        titulo = p.get("titulo") if st == "consulta" and p.get("titulo") else TITULOS.get(st, "⚠ Compra não registrada")
        abrir = f"?compras_abrir={p['id']}" if p.get("id") and st in ("nova", "atualizada", "repetida", "pedido_novo", "repetido", "pedido_pago") else ""
        # compra nova, também a do pedido online (a Amazon não diz o cartão no e-mail): a pergunta do cartão vai no aviso
        c = next((y for y in db["compras"] if y["id"] == p.get("id")), None) if st in ("nova", "pedido_novo") and p.get("id") else None
        falta = _quem_responde_cartao(db, c, quem)  # quem comprou e ainda precisa dizer o cartão: a pergunta vai no mesmo aviso
        for x, a in para_compra(db, st, quem):
            pre = f"{quem}: " if quem and quem != x["nome"] and st != "nova" else ""  # o que é de outra pessoa chega com o nome na frente
            if x["nome"] in falta:
                out.append(_aviso(x, a, titulo, pre + _com_pergunta(msg), _dados_cartao(db, c, abrir)))
                falta.discard(x["nome"])
            else:
                out.append(_aviso(x, a, titulo, pre + msg, _link(db, abrir)))
        if c and precisa_km(db, c):  # abastecimento sem km: pergunta uma vez, a quem comprou (responde no próprio aviso)
            lt = f"{litros(c):.1f}".replace(".", ",")
            dados = {**_link(db, f"?compras_abrir={c['id']}"), "tag": f"compras-km-{c['id']}", "actions": [
                {"action": f"COMPRAS_KM|{c['id']}", "title": "Responder km", "behavior": "textInput",
                 "textInputButtonTitle": "Salvar", "textInputPlaceholder": "52300 ou 52300 cheio"}]}
            for x, a in para_km(db, c.get("quem") or quem):
                out.append(_aviso(x, a, "⛽ Qual o km do painel?", f"{nome_loja(c['loja'])} · {fmt_brl(valor_efetivo(c) or 0)} · {lt} L. "
                                  "Responda com o km (ex.: 52300). Encheu o tanque? 52300 cheio.", dados))
        if c and falta:  # quem comprou não recebe o aviso da compra: a pergunta vai sozinha
            out += [x for x in _pergunta_cartao(db, c, quem) if x["pessoa"] in falta]
    elif tipo == "applepay":
        # a compra já subiu: o aviso pergunta só o que falta (crédito ou débito, ou o cartão) e oferece ler o cupom
        ap = next((y for y in db.get("applepay") or [] if y["id"] == p.get("id")), None)
        c = next((y for y in db["compras"] if y["id"] == ap.get("compra")), None) if ap and ap.get("compra") else None
        acoes = (acoes_cartao(db, c, trocar=True) or []) if c else []
        if len(acoes) < 10:
            acoes.append({"action": "URI", "title": "Ler cupom", "uri": LER_CUPOM})
        dados = {**_link(db, f"?compras_abrir={c['id']}" if c else "?compras=avisos"),
                 "tag": f"compras-cartao-{c['id']}" if c else f"compras-{p.get('id')}", "actions": acoes}
        out = [_aviso(x, a, str(p.get("titulo") or "💳 Apple Pay"), (f"{quem}: " if quem and quem != x["nome"] else "") + msg, dados)
               for x, a in para_applepay(db, quem)]
    elif tipo == "applepay_resp":
        ok, lancar = bool(p.get("ok")), p.get("decisao") == "lancar"
        titulo = "🛒 Compra lançada" if lancar and ok else "🧾 Com cupom" if ok else "⚠ Apple Pay"
        c = next((y for y in db["compras"] if y["id"] == p.get("id")), None) if lancar and ok and p.get("id") else None
        falta = _quem_responde_cartao(db, c, quem)  # lançou sem cupom e falta o cartão (ou crédito/débito): no mesmo aviso
        for x, a in para_applepay(db, quem):
            if x["nome"] in falta:
                pre = f"{quem}: " if quem and quem != x["nome"] else ""
                out.append(_aviso(x, a, titulo, pre + _com_pergunta(msg), _dados_cartao(db, c, f"?compras_abrir={c['id']}")))
                falta.discard(x["nome"])
            else:
                out.append(_aviso(x, a, titulo, (f"{quem}: " if quem and quem != x["nome"] else "") + msg))
        if c and falta:
            out += [x for x in _pergunta_cartao(db, c, quem) if x["pessoa"] in falta]
    elif tipo == "cartao_resp":  # tocou no cartão: tira a pergunta e confirma a quem comprou
        for x, a in para_km(db, quem):
            out.append({"servico": a["celular"], "pessoa": x["nome"], "titulo": "", "mensagem": "clear_notification", "dados": {"tag": f"compras-cartao-{p.get('id')}"}})
            out.append(_aviso(x, a, "💳 Pagamento salvo" if p.get("ok") else "⚠ Pagamento não salvo", msg, _link(db, f"?compras_abrir={p.get('id')}")))
    elif tipo == "km_resp":  # resposta do km pelo aviso: confirma a quem comprou
        c = next((y for y in db["compras"] if y["id"] == p.get("id")), None)
        for x, a in para_km(db, (c or {}).get("quem") or quem):
            out.append({"servico": a["celular"], "pessoa": x["nome"], "titulo": "", "mensagem": "clear_notification", "dados": {"tag": f"compras-km-{p.get('id')}"}})
            out.append(_aviso(x, a, "⛽ Km salvo" if p.get("ok") else "⚠ Km não salvo", msg, _link(db, f"?compras_abrir={p.get('id')}")))
    elif tipo == "paguei":
        tag = f"compras-{str(p.get('id') or '').replace(':', '-')}"
        for x, a in para_contas(db):  # tira o aviso de todos os celulares e confirma
            out.append({"servico": a["celular"], "pessoa": x["nome"], "titulo": "", "mensagem": "clear_notification", "dados": {"tag": tag}})
            out.append(_aviso(x, a, "✓ Pago" if p.get("ok") else "⚠ Não marcou", msg))
    else:
        raise Falha("Tipo de aviso desconhecido.")
    return {"ok": True, "status": "avisar", "avisar": out}


LER_CUPOM = "shortcuts://run-shortcut?name=Ler%20cupom%20%2F%20NF"


def _quem_responde_cartao(db: dict[str, Any], c: dict[str, Any] | None, quem: str) -> set[str]:
    """Quem precisa dizer o cartão dessa compra (vazio se não há o que perguntar)."""
    if not c or not acoes_cartao(db, c):
        return set()
    return {x["nome"] for x, _ in para_km(db, c.get("quem") or quem)}


def _com_pergunta(msg: str) -> str:
    return re.sub(r"\s*·\s*escolha a forma de pagamento no card\.?\s*$", "", msg) + " · 💳 Como pagou? Segure o aviso e toque no cartão."


def _dados_cartao(db: dict[str, Any], c: dict[str, Any], abrir: str) -> dict[str, Any]:
    return {**_link(db, abrir), "tag": f"compras-cartao-{c['id']}", "actions": acoes_cartao(db, c)}


def _pergunta_cartao(db: dict[str, Any], c: dict[str, Any], quem: str) -> list[dict[str, Any]]:
    """Compra sem cartão: "💳 Como pagou?" com um botão por cartão (os que servem), só para quem comprou."""
    acoes = acoes_cartao(db, c)
    if not acoes:
        return []
    dados = {**_link(db, f"?compras_abrir={c['id']}"), "tag": f"compras-cartao-{c['id']}", "actions": acoes}
    texto = f"{nome_loja(c['loja'])} · {fmt_brl(valor_efetivo(c) or 0)}. Segure o aviso e toque no cartão."
    return [_aviso(x, a, "💳 Como pagou?", texto, dados) for x, a in para_km(db, c.get("quem") or quem)]


def lembretes(db: dict[str, Any], itens: list[dict[str, Any]], hora: int, hoje: date | None = None) -> list[dict[str, Any]]:
    """Contas e faturas não pagas, nesta hora: vence em N dias (na hora do "antes"), vence hoje (nos horários do dia, 1 de 3…)
    e atrasada (na hora das atrasadas, até pagar). Cada aviso já vai com quem recebe."""
    c, hoje = cfg_casa(db), hoje or date.today()
    horas = sorted(int(h) for h in c["horas_dia"])
    gente = para_contas(db)
    out = []
    for x in itens:
        if x["pago"]:
            continue
        v = date.fromisoformat(x["vence"])
        if v == hoje and hora in horas:
            titulo, msg = f"{x['icone']} {x['nome']} vence hoje", f"{fmt_brl(x['total'])} · aviso {horas.index(hora) + 1} de {len(horas)}. Já pagou? Toque em ✓ Paguei."
        elif c["dias_antes"] and v == hoje + timedelta(days=int(c["dias_antes"])) and hora == int(c["hora_antes"]):
            quando = "amanhã" if int(c["dias_antes"]) == 1 else f"em {int(c['dias_antes'])} dias"
            titulo, msg = f"{x['icone']} {x['nome']} vence {quando}", f"{fmt_brl(x['total'])} · vence {v:%d/%m}."
        elif v < hoje and c["atrasadas"] and hora == int(c["hora_atrasadas"]):
            dias = (hoje - v).days
            titulo, msg = f"⚠ {x['nome']} atrasada", f"{fmt_brl(x['total'])} · venceu há {dias} {'dia' if dias == 1 else 'dias'}. Já pagou? Toque em ✓ Paguei."
        else:
            continue
        dados = {**_link(db, "?compras=pagar"), "tag": f"compras-{x['id'].replace(':', '-')}", "actions": [{"action": f"COMPRAS_PAGUEI|{x['id']}", "title": "✓ Paguei"}]}
        out += [_aviso(p, a, titulo, msg, dados) for p, a in gente]
    return out


# ---------------------------------------------------------------- cadastro (⚙ Configurações)
def config_avisos(p: dict[str, Any]) -> dict[str, Any]:
    """⚙ Avisos: {dias_antes, hora_antes, horas_dia: [10, 13, 19], atrasadas, hora_atrasadas, painel}."""
    hora = lambda v, nome: int(v) if str(v).isdigit() and 0 <= int(v) <= 23 else (_ for _ in ()).throw(Falha(f"Horário inválido: {nome}."))
    novo = {"dias_antes": max(0, min(15, int(p.get("dias_antes") or 0))), "hora_antes": hora(p.get("hora_antes", 10), "aviso antes"),
            "horas_dia": sorted({hora(h, "dia do vencimento") for h in p.get("horas_dia") or []}), "atrasadas": bool(p.get("atrasadas")),
            "hora_atrasadas": hora(p.get("hora_atrasadas", 10), "atrasadas"), "painel": str(p.get("painel") or "").strip()[:120]}
    if novo["painel"] and not re.fullmatch(r"/[\w\-./?=&]*", novo["painel"]):
        raise Falha("Endereço do painel: o caminho depois do endereço do HA, começando com / (ex.: /lovelace/compras).")
    with file_lock():
        db = load_db()
        db["avisos"] = novo
        save_db(db)
    return {"ok": True, "status": "avisos", "mensagem": "Avisos salvos."}


def config_atalho(p: dict[str, Any]) -> dict[str, Any]:
    """⚙ Atalho do iPhone: {casa: "http://192.168.0.10:8123", fora: "http://100.x.x.x:8123"} (de onde o celular acessa o HA,
    em casa e fora). O código do webhook fica nos dados (atalho.codigo)."""
    novo = {}
    for k, ex in (("casa", "http://192.168.0.10:8123"), ("fora", "http://100.x.x.x:8123 ou https://xxxx.ui.nabu.casa")):
        v = str(p.get(k) or "").strip().rstrip("/")[:120]
        if v and not re.fullmatch(r"https?://[\w\-.:\[\]]+", v):
            raise Falha(f"Endereço {'em casa' if k == 'casa' else 'fora de casa'}: só o começo, ex.: {ex}")
        novo[k] = v
    with file_lock():
        db = load_db()
        at = db.setdefault("atalho", {})
        at.pop("base", None)
        at.update(novo)
        save_db(db)
    return {"ok": True, "status": "atalho", "mensagem": "Endereço do Atalho salvo."}


def atalho_codigo(p: dict[str, Any]) -> dict[str, Any]:
    """A integração grava o código do webhook que ela usa (para o ⚙ › Atalho mostrar o endereço completo)."""
    cod = str(p.get("codigo") or "").strip()
    if not re.fullmatch(r"[A-Za-z0-9_\-]{16,100}", cod):
        raise Falha("Código do webhook inválido.")
    with file_lock():
        db = load_db()
        at = db.setdefault("atalho", {})
        if at.get("codigo") != cod:
            at["codigo"] = cod
            save_db(db)
    return {"ok": True, "status": "atalho", "mensagem": "Código do Atalho gravado."}


def bem_salvar(p: dict[str, Any]) -> dict[str, Any]:
    """⚙ Veículos: {id?, nome, tipo, placas: "1D23, 234" (o final, ou a placa inteira: só os 3 últimos ficam)} ou {id, apagar}.
    Chassi e placa inteira não são guardados (dado pessoal, como o CPF). A placa na nota da oficina liga a compra ao carro."""
    with file_lock():
        db = load_db()
        lst = db.setdefault("bens", [])
        b = next((x for x in lst if x["id"] == p.get("id")), None) if p.get("id") else None
        if p.get("apagar"):
            if not b:
                raise Falha("Bem não encontrado.")
            if any(c.get("bem") == b["id"] for c in db["compras"]):
                raise Falha(f"{b['nome']} já tem compras ligadas: não dá para apagar.")
            lst.remove(b)
            save_db(db)
            return {"ok": True, "status": "bem", "mensagem": f"{b['nome']} saiu do cadastro."}
        nome = re.sub(r"\s+", " ", str(p.get("nome") or "")).strip()[:40]
        if not nome:
            raise Falha("Qual o nome? (ex.: Meu carro)")
        pedacos = [re.sub(r"[^A-Z0-9]", "", x.upper()) for x in re.split(r"[,;\s]+", str(p.get("placas") or "")) if x.strip()]
        if any(len(x) < 3 for x in pedacos):
            raise Falha("Final da placa: os 3 últimos caracteres (ex.: 1D23 → D23; ABC1234 → 234).")
        finais = sorted({x[-3:] for x in pedacos})
        if not b:
            base = re.sub(r"[^a-z0-9]", "", norm_txt(nome).lower())[:12] or "bem"
            bid = base
            while any(x["id"] == bid for x in lst):
                bid = f"{base}{len(lst) + 1}"
            b = {"id": bid}
            lst.append(b)
        for velho in ("placas", "chassi"):
            b.pop(velho, None)
        b.update({"nome": nome, "tipo": "veiculo" if p.get("tipo") in (None, "", "veiculo") else str(p.get("tipo")), "placa_final": finais})
        save_db(db)
    return {"ok": True, "status": "bem", "id": b["id"], "mensagem": f"{nome} salvo."}
