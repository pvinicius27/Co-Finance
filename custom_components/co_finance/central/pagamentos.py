"""Como a compra foi paga: forma, cartão, valor cobrado de verdade, divisão e data da compra."""
from __future__ import annotations

import re
from datetime import date
from typing import Any

from .config import BANCOS_EMISSORES, BANDEIRAS, TIPOS_PAG, T_PAG
from .base import norm_txt
from .dados import _CARTOES, vale_de


def dividir(valor: float, n: int) -> list[float]:
    """Parcelas iguais em centavos; a diferença dos centavos vai na primeira."""
    n = max(1, int(n or 1))
    base = int(round(valor * 100)) // n
    resto = int(round(valor * 100)) - base * n
    return [round((base + (resto if i == 0 else 0)) / 100, 2) for i in range(n)]


def data_efetiva(c: dict[str, Any]) -> str | None:
    """Quando a compra aconteceu: a data da compra informada por vocês (nota emitida depois) ou a emissão da nota."""
    return c.get("data_compra") or c.get("emissao")


def _data_compra(c: dict[str, Any], pg: dict[str, Any]) -> date | None:
    try:
        return date.fromisoformat(str(pg.get("data_cartao") or data_efetiva(c) or "")[:10])
    except ValueError:
        return None


CARTEIRAS = ["Mercado Pago", "PicPay", "PayPal", "Shopee Pay", "Nubank", "Inter", "Ame", "Méliuz", "Outra"]  # saldo em carteira


MOTIVOS_COBRADO = ["Cupom do app", "Cashback", "Desconto não registrado", "Frete à parte", "Outro"]


def valor_efetivo(c: dict[str, Any]) -> Any:
    """O que saiu do bolso: o valor cobrado de verdade (cupom do app, cashback…) ou, sem ele, o total pago da nota."""
    cb = (c.get("cobrado") or {}).get("valor")
    return cb if cb is not None else c.get("valor_pago")


def _fator_cobrado(c: dict[str, Any]) -> float:
    cb, vp = (c.get("cobrado") or {}).get("valor"), c.get("valor_pago")
    return cb / vp if cb is not None and vp else 1.0


def _pgs_fin(c: dict[str, Any]) -> list[dict[str, Any]]:
    """Pagamentos que valem para o dinheiro: a divisão de verdade (junto do valor cobrado) ou, sem ela, os da nota."""
    return (c.get("cobrado") or {}).get("pagamentos") or c.get("pagamentos") or []


def _valor_pg(c: dict[str, Any], pg: dict[str, Any]) -> float:
    if (c.get("cobrado") or {}).get("pagamentos"):  # divisão de verdade: valores já são os cobrados
        return round(float(pg.get("valor") or 0), 2)
    pgs = [x for x in c.get("pagamentos") or [] if (x.get("valor") or 0) > 0 or x.get("tipo") in TIPOS_PAG]
    v = float(pg.get("valor") or (c.get("valor_pago") if len(pgs) <= 1 else 0) or 0)
    return round(v * _fator_cobrado(c), 2)


def limpar_pag(s: str | None) -> str:
    """Tira as quebras de linha que a página da SEFAZ manda escritas como texto (\\n)."""
    return re.sub(r"\s+", " ", re.sub(r"\\[ntr]", " ", s or "")).strip()


def nome_bandeira(s: str | None) -> str | None:
    """'06 - Elo' / '10' → nome da bandeira."""
    s = limpar_pag(s)
    cod = (re.match(r"\d+", s) or [""])[0].zfill(2)
    return BANDEIRAS.get(cod) or re.sub(r"^\d+\s*-\s*", "", s) or None


def _alelo_deduzido(pg: dict[str, Any]) -> bool:
    """Débito sem bandeira ou com "Outros" na nota: cartão de banco quase sempre vem Visa/Mastercard/Elo,
    então é vale (Alelo). Só depois de consultada a versão detalhada (chave "bandeira" presente)."""
    return (pg.get("tipo") not in TIPOS_PAG and "DEBITO" in norm_txt(pg.get("forma") or "")
            and "bandeira" in pg and pg["bandeira"] in (None, "", "Outros"))


def rotulo_cartao(k: dict[str, Any], todos: list[dict[str, Any]] | None = None) -> str:
    """Nome do cartão na tela: o "Nome para mostrar", senão o banco; se outro cartão ficar com o mesmo nome, entra o tipo
    (débito, vale) e, se ainda repetir, o titular. A sigla fica só por dentro. (A tela faz igual: _finNomeCartao.)"""
    todos = list(_CARTOES.values()) if todos is None else todos
    base = lambda x: x.get("apelido") or BANCOS_EMISSORES.get(x.get("emissor") or x.get("banco") or "") or ("Vale" if x.get("vale") else x.get("nome") or "")
    tipo = lambda x: "vale" if x.get("vale") else "débito" if x.get("credito") is False else ""
    nome = base(k)
    outros = [x for x in todos if x.get("id") != k.get("id") and base(x) == nome]
    if not outros:
        return nome
    if tipo(k) and all(tipo(x) != tipo(k) for x in outros):
        return f"{nome} · {tipo(k)}"
    if not tipo(k) and all(tipo(x) for x in outros):
        return nome
    return f"{nome}{f' · {tipo(k)}' if tipo(k) else ''} · {k.get('dono') or k.get('nome')}"


def _tipo_pag(pg: dict[str, Any]) -> str:
    if pg.get("tipo") in TIPOS_PAG:  # escolhido no card
        return pg["tipo"]
    f = str(pg.get("forma") or "").strip()
    if f.isdigit():  # a página do portal às vezes traz só o código oficial (tPag): "20" = Pix estático
        f = T_PAG.get(f.zfill(2), f)
    f = norm_txt(f)
    if pg.get("bandeira") == "Alelo" or "ALIMENTACAO" in f or "REFEICAO" in f:
        return "Alelo"  # o mercado às vezes registra Alelo como débito: a bandeira manda
    if "CREDITO" in f and "LOJA" not in f:
        return "Crédito"
    if "DEBITO" in f:
        return "Alelo" if _alelo_deduzido(pg) else "Débito"
    if "PIX" in f or "INSTANTANEO" in f:
        return "Pix"
    if "BOLETO" in f:
        return "Boleto"
    if "DINHEIRO" in f:
        return "Dinheiro"
    return "Outro"


def aceita(k: dict[str, Any], t: str) -> bool:
    """O cartão aceita essa forma? Crédito, débito ou vale (Alelo, VR…), conforme o cadastro."""
    return bool(t == "Crédito" and k.get("credito", True) and not k.get("vale") or t == "Débito" and k.get("debito") or t == "Alelo" and k.get("vale"))


def forma_do_cartao(k: dict[str, Any] | None) -> str:
    """A forma que o cartão da Carteira garante sozinho: vale → Alelo; só crédito → Crédito; só débito → Débito.
    Cartão com crédito e débito: "" (o Apple Pay não diz qual foi; não se chuta)."""
    if not k:
        return ""
    if k.get("vale"):
        return "Alelo"
    cred, deb = k.get("credito", True) and not k.get("vale"), bool(k.get("debito"))
    return "Crédito" if cred and not deb else "Débito" if deb and not cred else ""


def _nota_com_outra_bandeira(db: dict[str, Any], c: dict[str, Any], alvo: dict[str, Any], k: dict[str, Any], t: str) -> None:
    """O cartão do iPhone é o que vale. Se a nota diz outra bandeira ("Visa" num Santander Mastercard), ela errou ali e
    pode ter errado o crédito/débito também: fica o que a nota diz, com o cartão do iPhone, e vai para o sino
    (Confirmar = está certo · Desfazer = foi a outra função). Só nos cartões de crédito e débito."""
    band, kb = str(alvo.get("bandeira") or ""), str(k.get("bandeira") or "")
    outra = "Débito" if t == "Crédito" else "Crédito" if t == "Débito" else ""
    if not band or not kb or norm_txt(band) in ("outros", "outro") or norm_txt(band) == norm_txt(kb) or not outra or not aceita(k, outra):
        return
    import copy
    from .lista import anotar_mudanca
    antes = copy.deepcopy(c.get("pagamentos") or [])
    i = next(n for n, x in enumerate(c.get("pagamentos") or []) if x is alvo)
    antes[i].update({"tipo": outra, "cartao": k["id"], "cartao_via": "você"})
    if outra == "Crédito":
        antes[i]["parcelas"] = 1
    nome = rotulo_cartao(k, db.get("cartoes") or [])
    alvo["tipo"] = t
    anotar_mudanca(db, c, f"Confira: a nota diz {band} {t.lower()}, mas o {nome} do iPhone é {kb}. A bandeira da nota está errada; "
                          f"ficou {nome} {t.lower()}. Confirmar = foi {t.lower()} · Desfazer = foi {outra.lower()}.", {"pagamentos": antes})


def cartao_da_carteira(db: dict[str, Any], c: dict[str, Any], cid: str | None, parte: int | None = None) -> bool:
    """Nota de uma compra do Apple Pay: com crédito/débito explícito na nota, põe o cartão da Carteira no pagamento
    (o único, ou a parte que o Apple Pay pagou); sem forma explícita ("Outros"), não mexe e só guarda a sugestão.
    True se mudou algo."""
    k = next((x for x in db.get("cartoes") or [] if x.get("id") == cid), None)
    if not k:
        return False
    pgs = c.get("pagamentos") or []
    if parte is not None:
        alvo = pgs[parte] if 0 <= parte < len(pgs) else None
        if not alvo:
            return False
    else:
        alvo = pgs[0] if len(pgs) == 1 else None
    t = _tipo_pag(alvo) if alvo else None
    if alvo and t in ("Crédito", "Débito", "Alelo") and aceita(k, t):
        if not alvo.get("cartao"):
            alvo["cartao"], alvo["cartao_via"] = k["id"], "applepay"
            _nota_com_outra_bandeira(db, c, alvo, k, t)
            return True
        return False
    if c.get("cartao_sugerido") != k["id"]:
        c["cartao_sugerido"] = k["id"]
        return True
    return False


def cartao_na_hora(c: dict[str, Any], pg: dict[str, Any]) -> dict[str, Any] | None:
    """Cartão de um pagamento que sai na hora: débito com cartão escolhido; vale, o escolhido ou o de quem comprou."""
    t, k = _tipo_pag(pg), _CARTOES.get(pg.get("cartao"))
    if t == "Débito":
        return k if k and aceita(k, t) else None
    if t == "Alelo":
        return k if k and aceita(k, t) else vale_de(c.get("quem"))
    return None


def pago_com(c: dict[str, Any]) -> list[dict[str, Any]]:
    """Como a compra foi paga: [{tipo, dono, valor, bandeira}]. Sem informação: tipo None."""
    real = bool((c.get("cobrado") or {}).get("pagamentos"))
    pgs = [pg for pg in _pgs_fin(c) if (pg.get("valor") or 0) > 0 or pg.get("tipo") in TIPOS_PAG]
    if pgs and all(pg.get("tipo") not in TIPOS_PAG and norm_txt(pg.get("forma") or "") == "SEM PAGAMENTO" for pg in pgs):
        pgs = []  # nota de loja online: "90 - Sem pagamento"
    if not pgs:
        return [{"tipo": None, "dono": None, "valor": c.get("valor_pago"), "bandeira": None}]
    out = []
    for pg in pgs:
        t = _tipo_pag(pg)
        dono = c.get("quem") if t == "Alelo" else (c.get("cartao_de") or c.get("quem")) if t in ("Crédito", "Débito") else None
        k = cartao_na_hora(c, pg) if t == "Alelo" else _CARTOES.get(pg.get("cartao")) if t in ("Crédito", "Débito") else None
        if k:
            dono = k.get("dono") or dono
        out.append({"tipo": t, "dono": dono, "valor": pg.get("valor") or (c.get("valor_pago") if len(pgs) == 1 else None), "bandeira": pg.get("bandeira"),
                    "deduzido": _alelo_deduzido(pg), "cartao": k["nome"] if k else None, "cartao_id": k["id"] if k else None, "cartao_nome": rotulo_cartao(k) if k else None, "carteira": pg.get("carteira") if t == "Saldo em carteira" else None, "parcelas": (pg.get("parcelas") or 1) if k and t == "Crédito" else None,
                    "cartao_via": pg.get("cartao_via") if k else None})
    sobra = round(sum(p["valor"] or 0 for p in out) - (c.get("valor_pago") or 0), 2)
    din = next((p for p in out if p["tipo"] == "Dinheiro"), None)
    if sobra > 0 and din and (din["valor"] or 0) > sobra:  # troco
        din["valor"] = round(din["valor"] - sobra, 2)
    f = 1.0 if real else _fator_cobrado(c)
    if f != 1.0 and out:
        for p in out:
            p["valor"] = round((p["valor"] or 0) * f, 2)
        out[0]["valor"] = round(out[0]["valor"] + valor_efetivo(c) - sum(p["valor"] for p in out), 2)
    return out
