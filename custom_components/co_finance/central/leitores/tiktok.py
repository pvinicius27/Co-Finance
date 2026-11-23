"""Leitor do TikTok Shop (no-reply@shop.tiktok.com). Os e-mails (só HTML):
- "Seu pedido foi confirmado!": o pedido já pago, com a loja, os itens (nome cortado em "…", variação, preço, quantidade)
  e o resumo (subtotal, envio, cupons, Total). Não diz a forma de pagamento: o cartão vem pela pergunta no aviso;
- "Pedido … cancelado": o reembolso, com o final do cartão ("Parcelas (2428)") e o item.
Quem comprou: o primeiro nome da saudação ("Olá, Júlia …", nome de exemplo), comparado com as pessoas da Central; o nome, o telefone e
o endereço de entrega não são guardados."""
from __future__ import annotations

import re
from typing import Any

LOJA = "TikTok Shop"
REMETENTES = ["no-reply@shop.tiktok.com"]
ASSUNTOS = ["Seu pedido foi confirmado", "cancelado"]
NA_FATURA = r"^\s*(?:[A-Z]{2,4}\s*\*\s*)?TIK\s*TOK"  # "EBN*TIKTOK SH", "DL*TikTok Shop M", "DL *TikTok Shop"

_VALOR = r"R\$\s?(\d{1,3}(?:\.\d{3})*,\d{2})"


def reconhece(remetente: str, assunto: str, texto: str) -> bool:
    do_tiktok = "tiktok" in (remetente or "").lower() or re.search(r"(?i)Loja do TikTok|TikTok Shop", texto or "")
    return bool(do_tiktok and re.search(r"(?i)ID do pedido\s*:\s*\d{12,}|cancelamento do pedido\s*\d{12,}", texto or ""))


def _brl(s: str) -> float:
    return round(float(s.replace(".", "").replace(",", ".")), 2)


def _campo(t: str, rotulo: str) -> float | None:
    m = re.search(rf"(?im)^\s*{rotulo}[^\n]*\n\s*(-)?\s*{_VALOR}", t)
    return (-1 if m[1] else 1) * _brl(m[2]) if m else None


def _data(t: str, quando: str | None) -> str | None:
    """Data do e-mail; encaminhado à mão, a do bloco "Forwarded message" (o cabeçalho é de quando encaminhou)."""
    from .amazon import _data as d
    return d(t, quando)


def _cliente(t: str) -> str | None:
    m = re.search(r"(?im)^\s*Ol[áa],?\s*([^\s!,]+)", t)
    return m[1] if m else None


def _itens(bloco: str) -> list[dict[str, Any]]:
    """Cada item: nome, variação (opcional), "R$ x", "x N" (ou "×N")."""
    linhas = [ln.strip() for ln in bloco.splitlines() if ln.strip()]
    out = []
    for i, ln in enumerate(linhas):
        m = re.fullmatch(_VALOR, ln)
        q = re.fullmatch(r"[x×]\s*(\d+)", linhas[i + 1]) if m and i + 1 < len(linhas) else None
        if not q:
            continue
        nome = [x for x in linhas[max(0, i - 3):i] if not re.fullmatch(_VALOR, x) and not re.fullmatch(r"[x×]\s*\d+", x)]
        # o nome e, às vezes, a variação ("PRETO, P", curta e com vírgula) logo antes do preço
        # ("FACETADA" sem vírgula: a variação é a linha curta depois de um nome mais longo, que costuma terminar em "…")
        if len(nome) >= 2 and len(nome[-1]) <= 30 and ("," in nome[-1] or nome[-2].endswith(("...", "…")) or len(nome[-2]) > len(nome[-1])):
            desc = f"{nome[-2]} ({nome[-1]})"
        else:
            desc = nome[-1] if nome else "Produto"
        out.append({"descricao": desc[:200], "qtd": int(q[1]), "preco": _brl(m[1])})
    return out


def _confirmado(t: str, quando: str | None) -> dict[str, Any]:
    resumo = re.split(r"(?im)^\s*Resumo do pedido\s*$", t, maxsplit=1)
    corpo, fim = resumo[0], (resumo[1] if len(resumo) > 1 else "")
    corpo = re.split(r"(?im)^\s*Endere[çc]o de envio\s*$", corpo)[0]
    blocos = re.split(r"(?i)ID do pedido\s*:\s*(\d{12,})", corpo)
    partes = []
    for n in range(1, len(blocos), 2):
        b = blocos[n + 1]
        linhas = [ln.strip() for ln in b.splitlines() if ln.strip()]
        # depois do número: "Entrega", a data prevista e o nome da loja
        # (encaminhado pelo Gmail: "Entrega mai 15 - mai 19" numa linha só)
        k = next((i for i, ln in enumerate(linhas) if re.match(r"(?i)Entrega\b", ln)), -1)
        k += 1 if k >= 0 and re.match(r"(?i)Entrega\s+\S", linhas[k]) else 2
        vend = linhas[k] if 0 <= k < len(linhas) else None
        partes.append({"numero": blocos[n], "vendedor": vend, "itens": _itens(b)})
    subtotal, envio = _campo(fim, "Subtotal"), _campo(fim, "Envio") or 0.0
    total = _campo(fim, r"Total \(")
    descontos = []
    for m in re.finditer(rf"(?im)^\s*([^\n]*(?:Cupo|Desconto|Moedas)[^\n]*)\n\s*-\s*{_VALOR}", fim):
        descontos.append({"motivo": "Cupom de envio" if re.search(r"(?i)envio", m[1]) else "Cupom", "valor": _brl(m[2])})
    soma = round(sum(i["preco"] * i["qtd"] for p in partes for i in p["itens"]), 2)
    for p in partes:
        for i in p["itens"]:
            i["preco"] = round(i["preco"] * i["qtd"], 2)  # o e-mail mostra o preço de cada unidade
        prod = round(sum(i["preco"] for i in p["itens"]), 2)
        peso = prod / soma if soma else 1 / max(len(partes), 1)
        p.update({"produtos": prod, "frete": round(envio * peso, 2),
                  "descontos": [{**d, "valor": round(d["valor"] * peso, 2)} for d in descontos],
                  "pago": round((total if total is not None else prod) * peso, 2)})
        p["bate"] = abs(p["produtos"] + p["frete"] - sum(d["valor"] for d in p["descontos"]) - p["pago"]) < 0.03 \
            and (subtotal is None or len(partes) > 1 or abs(prod - subtotal) < 0.03)
    if partes and total is not None:  # centavos do rateio ficam na última parte
        partes[-1]["pago"] = round(partes[-1]["pago"] + total - sum(p["pago"] for p in partes), 2)
    return {"evento": "realizado", "loja": LOJA, "numeros": [p["numero"] for p in partes], "data": _data(t, quando),
            "pagamento": {"tipo": None, "final": None, "banco": None, "parcelas": None, "carteira": None},
            "partes": partes, "total": round(sum(p["pago"] for p in partes), 2), "pago": "pedido confirmado no TikTok Shop",
            "cliente": _cliente(t)}


def ler(texto: str, quando: str | None = None) -> dict[str, Any]:
    t = (texto or "").replace("\r", "")
    # o texto que o Gmail gera ao encaminhar junta rótulo e valor numa linha ("Subtotal R$ 36,15", "R$ 36,15 x1"):
    # separa, para ficar igual ao HTML do e-mail original
    t = re.sub(rf"({_VALOR})[ \t]+([x×]\s*\d+)[ \t]*$", r"\1\n\3", t, flags=re.M)
    t = re.sub(rf"^([ \t]*\S[^\n]*?)[ \t]+(-[ \t]*)?({_VALOR})[ \t]*$", r"\1\n\2\3", t, flags=re.M)
    if re.search(r"(?i)cancelamento do pedido\s*\d{12,}|Cancelamento bem-sucedido", t):
        nums = list(dict.fromkeys(re.findall(r"(?i)pedido\s*(\d{12,})", t)))
        itens = []
        corpo = re.split(r"(?im)^\s*Item\(ns\) reembolsado\(s\)\s*$", t, maxsplit=1)
        if len(corpo) > 1:
            itens = [{"descricao": i["descricao"]} for i in _itens(re.split(r"(?im)^\s*N[úu]mero da solicita", corpo[1])[0])]
        return {"evento": "cancelado", "loja": LOJA, "numeros": nums, "data": _data(t, quando), "itens": itens}
    return _confirmado(t, quando)
