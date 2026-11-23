"""E-mail "7me - Dados da transação" (dízimo e ofertas pelo app 7me da igreja). Lê só o que precisa: as partes com o valor
(Administração, Dízimo, Oferta…), o total e o primeiro nome de quem deu (para saber de quem é). O resto do e-mail (nome
completo, código da transação) não é lido nem guardado. O método (cartão de crédito, Pix…) fica anotado no pagamento.

A doação também vem na fatura do cartão ("7ME IGREJA ADVEN"): se a compra da fatura já está na Central, o e-mail só a
completa (partes e quem); se não, entra uma compra nova que a fatura reconhece depois (mesmo dia e valor), sem repetir."""
from __future__ import annotations

import re
from datetime import date, datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from typing import Any

from .base import Falha, fmt_brl, norm_txt, now_iso
from .categorias import checar_classe
from .dados import file_lock, load_db, pessoas, save_db
from .lista import anotar_mudanca
from .cartoes import sugerir_cartao

LOJA = "7me Igreja"
CATEGORIA = ("Igreja", "Dízimo e ofertas")
_VALOR = r"(\d{1,3}(?:\.\d{3})*,\d{2})"
_BRT = timezone(timedelta(hours=-3))


def reconhece(remetente: str, assunto: str, texto: str) -> bool:
    """Do 7me (o remetente, ou encaminhado à mão: vale o assunto com o texto)."""
    r, a, t = (remetente or "").lower(), norm_txt(assunto or "").lower(), norm_txt(texto or "").lower()
    return "7me.app" in r or ("7me" in a and "dados da transacao" in a) or ("7me" in t and "por sua fidelidade" in t)


def _num(v: str) -> float:
    return round(float(v.replace(".", "").replace(",", ".")), 2)


_METODOS = [(r"CREDITO", "Crédito"), (r"DEBITO", "Débito"), (r"\bPIX\b", "Pix"), (r"BOLETO", "Boleto")]


def ler(texto: str) -> dict[str, Any]:
    """{"primeiro_nome", "partes": [{"descricao", "valor"}], "total", "data", "metodo"}: só isso sai do e-mail.
    As partes são cada valor da tabela com o texto que vem antes dele (o nome da parte pode ter número, hífen, parênteses,
    "R$"…); a soma tem que dar o total."""
    # encaminhado pelo Gmail, o e-mail vem em texto simples com o negrito em asteriscos ("*Total* *R$2.000,00*")
    t = re.sub(r"\s+", " ", re.sub(r"[*_]+", " ", texto or ""))
    m = re.search(r"Obrigad[oa]\s+([A-Za-zÀ-ÿ]+)", t)
    if not m:
        raise Falha("E-mail do 7me sem o nome de quem deu.")
    nome = m.group(1)
    mt = re.search(r"\bTotal\b\s*:?\s*(?:R\s*\$)?\s*" + _VALOR, t[m.end():], re.I)
    if not mt:
        raise Falha("E-mail do 7me sem o total.")
    total = _num(mt.group(1))
    corpo = t[m.end():m.end() + mt.start()]
    md = re.search(r"na data de (\d{2})/(\d{2})/(\d{4})\.?", corpo)
    if md:
        corpo = corpo[md.end():]
    elif "fidelidade" in corpo:
        corpo = corpo[corpo.find("fidelidade") + len("fidelidade"):]
    partes, ini = [], 0
    for v in re.finditer(r"(?:R\s*\$\s*)?" + _VALOR, corpo):
        d = re.sub(r"^[\s:;|\-–—.,]+|[\s:;|\-–—.,]+$", "", corpo[ini:v.start()])
        ini = v.end()
        if not d:
            raise Falha(f"E-mail do 7me: valor sem nome ({v.group(0)}). Me avise.")
        partes.append({"descricao": (d.capitalize() if d.isupper() else d)[:60], "valor": _num(v.group(1))})
    if not partes or abs(sum(p["valor"] for p in partes) - total) > 0.011:
        lidas = " + ".join(f"{p['descricao']} {fmt_brl(p['valor'])}" for p in partes) or "nenhuma"
        raise Falha(f"E-mail do 7me: as partes ({lidas}) não somam o total ({fmt_brl(total)}). Me avise.")
    mm = re.search(r"M[ée]todo\s*:?\s*(.{0,40})", t[m.end() + mt.end():], re.I)
    metodo_txt = re.split(r"\s{2,}|Voc[êe] pode|Sua opera", mm.group(1))[0].strip() if mm else ""
    metodo = next((tipo for rx, tipo in _METODOS if re.search(rx, norm_txt(metodo_txt))), None)
    data = date(int(md.group(3)), int(md.group(2)), int(md.group(1))) if md else None
    return {"primeiro_nome": nome, "partes": partes, "total": total, "data": data, "metodo": metodo, "metodo_txt": metodo_txt}


def _quem(nome: str) -> str | None:
    n = norm_txt(nome).upper()
    for x in pessoas():
        if n == norm_txt(x["nome"]).upper() or n in {norm_txt(a).upper() for a in x.get("apelidos") or []}:
            return x["nome"]
    return None


def _dia(quando: Any) -> date:
    s = str(quando or "").strip()
    if s:
        for f in (lambda v: datetime.fromisoformat(v.replace("Z", "+00:00")), parsedate_to_datetime):
            try:
                d = f(s)
                return (d.astimezone(_BRT) if d.tzinfo else d).date()
            except (ValueError, TypeError, IndexError):
                pass
    return datetime.now(_BRT).date()


def _itens(partes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [{"n": i, "descricao": p["descricao"], "codigo": "", "ean": None, "ncm": None, "qtd": None, "un": "", "unit": None,
             "total": p["valor"], "promo": False, "manual": True} for i, p in enumerate(partes, 1)]


def _da_igreja(c: dict[str, Any]) -> bool:
    nome = norm_txt(((c.get("loja") or {}).get("nome") or "") + " " + ((c.get("fatura_banco") or {}).get("descricao") or "")).upper()
    return c.get("categoria") == CATEGORIA[0] or bool(re.search(r"7ME|IGREJA|ADVENT", nome))


def registrar(texto: str, quando: Any) -> dict[str, Any]:
    r = ler(texto)
    quem = _quem(r["primeiro_nome"])
    if not quem:
        raise Falha(f"Dízimo 7me de {fmt_brl(r['total'])}: não sei quem é \"{r['primeiro_nome']}\". "
                    "Cadastre o nome como apelido da pessoa em ⚙ › Pessoas.")
    dia, total = r["data"] or _dia(quando), r["total"]  # a data da transação (no e-mail); se faltar, a do e-mail
    partes_txt = " + ".join(f"{p['descricao']} {fmt_brl(p['valor'])}" for p in r["partes"]) + (f" · {r['metodo_txt']}" if r["metodo_txt"] else "")
    with file_lock():
        db = load_db()
        cat, sub = checar_classe(db, *CATEGORIA)
        cands = []
        for c in db["compras"]:
            if c.get("excluida_em") or abs((c.get("valor_pago") or 0) - total) > 0.011 or not _da_igreja(c):
                continue
            dc = date.fromisoformat((c.get("data_compra") or c.get("emissao") or "1900-01-01")[:10])
            if -2 <= (dc - dia).days <= 7:  # a fatura traz o dia da transação (ou alguns dias depois)
                cands.append((abs((dc - dia).days), c))
        c = min(cands, key=lambda x: x[0])[1] if cands else None
        if c and c.get("doacao_7me"):
            return {"ok": True, "status": "repetido", "silencioso": True, "quem": c["quem"], "id": c["id"],
                    "mensagem": f"Dízimo 7me já registrado: {fmt_brl(total)} ({c['quem']})."}
        if c:
            antes = {k: c.get(k) for k in ("quem", "itens", "qtd_itens", "categoria", "subcategoria", "classe_via")}
            c["itens"], c["qtd_itens"] = _itens(r["partes"]), len(r["partes"])
            c["loja"] = {**(c.get("loja") or {}), "nome": LOJA}  # o nome da fatura vem cortado ("7ME IGREJA ADVEN")
            c["conferencia"] = {**(c.get("conferencia") or {}), "soma_itens": total, "bate": True}
            if not c.get("categoria_manual"):
                c["categoria"], c["subcategoria"], c["classe_via"] = cat, sub, "regra"
            c["doacao_7me"] = {"lido_em": now_iso(), **({"metodo": r["metodo_txt"]} if r["metodo_txt"] else {})}
            if r["metodo"] and not c.get("pagamentos"):
                c["pagamentos"] = [{"forma": r["metodo_txt"], "tipo": r["metodo"], "valor": total}]
            if c.get("quem") != quem:
                c["quem"] = quem
                anotar_mudanca(db, c, f"Dízimo 7me de {fmt_brl(total)}: o e-mail diz que foi {quem} (estava {antes['quem']}).", antes)
            save_db(db)
            return {"ok": True, "status": "atualizada", "quem": quem, "id": c["id"],
                    "mensagem": f"Dízimo 7me · {fmt_brl(total)} · {quem} · {partes_txt} (completei a compra da fatura)"}
        cid = f"7me-{datetime.now():%Y%m%d%H%M%S%f}"
        compra = {
            "id": cid, "chave": None, "origem": "manual", "via": "7me", "quem": quem,
            "reembolso": {"status": "nao", "pago_em": None},
            "categoria": cat, "subcategoria": sub, "classe_via": "regra",
            "loja": {"nome": LOJA, "cnpj": "", "cidade": "", "uf": ""},
            "numero": "", "serie": "", "emissao": f"{dia.isoformat()}T12:00:00-03:00",
            "itens": _itens(r["partes"]), "qtd_itens": len(r["partes"]), "valor_produtos": total, "desconto": 0.0,
            "valor_pago": total, "tributos": None,
            "pagamentos": [{"forma": r["metodo_txt"], "tipo": r["metodo"], "valor": total}] if r["metodo"] else [],
            "observacao": "7me" + (f" · {r['metodo_txt']}" if r["metodo_txt"] else ""),
            "conferencia": {"soma_itens": total, "bate": True},
            "doacao_7me": {"lido_em": now_iso(), **({"metodo": r["metodo_txt"]} if r["metodo_txt"] else {})},
            "registrado_em": now_iso(),
        }
        sugerir_cartao(db, compra)
        db["compras"].append(compra)
        db["compras"].sort(key=lambda x: x.get("emissao") or "", reverse=True)
        save_db(db)
    return {"ok": True, "status": "nova", "quem": quem, "id": cid,
            "mensagem": f"Dízimo 7me · {fmt_brl(total)} · {quem} · {partes_txt}"}
