"""Leitor da Shopee. Três e-mails:
- "Recebemos seu pedido" (antes de o pagamento ser aprovado): um ou mais pedidos, um por vendedor, com os itens
  (quantidade e preço), o subtotal, o frete, os descontos (cupom, desconto do frete, moedas) e o "Pagamento Total", que
  é o que saiu de verdade;
- "Confirmação de pagamento" (pagamento aprovado): os mesmos pedidos, sem preços, mas com a razão social e o CNPJ de
  cada vendedor (é o CNPJ que vem na nota) e o valor final;
- o de pedido cancelado.
Quem comprou: o primeiro nome da saudação ou da entrega (amazon.clientes), casado com os apelidos de ⚙ › Pessoas.
O telefone, o endereço de entrega, o número do cartão e o PIN que os e-mails também trazem não são lidos."""
from __future__ import annotations

import re
from datetime import date, datetime, timedelta, timezone
from typing import Any

LOJA = "Shopee"
REMETENTES = ["info@mail.shopee.com.br"]
ASSUNTOS = ["Recebemos seu pedido", "Confirmação de pagamento"]  # também reconhece o encaminhado à mão ("Fwd: …")
NA_FATURA = r"^\s*SHOPEE\s*\*"  # "SHOPEE *NOMEDALOJA" (o banco mostra uma das lojas do carrinho) e "Shopee*SHOPEE*PK"

_MESES = {m: i for i, m in enumerate(["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"], 1)}
_VALOR = r"-?\s*R\$\s?(\d{1,3}(?:\.\d{3})*,\d{2})"


def reconhece(remetente: str, assunto: str, texto: str) -> bool:
    de_shopee = any(r in (remetente or "").lower() for r in REMETENTES) or "shopee" in (remetente or "").lower()
    return bool(de_shopee or re.search(r"(?i)\bShopee\b", texto or "")) and bool(re.search(r"(?i)ID do pedido|pedido\s*#", texto or ""))


def _brl(s: str) -> float:
    return round(float(s.replace(".", "").replace(",", ".")), 2)


def _campo(bloco: str, rotulo: str) -> float | None:
    m = re.search(rf"(?i){rotulo}\s*:?\s*{_VALOR}", bloco)
    return _brl(m[1]) if m else None


def _data_br(s: str) -> str | None:
    """"ter., 20 de out. de 2026 às 23:15" / "20 de out., 23:15" → ISO (sem ano: o mais recente que não está no futuro)."""
    m = re.search(r"(?i)\b(\d{1,2}) de (jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\w*\.?,?\s*(?:de\s*(\d{4}),?\s*)?(?:às\s*)?(\d{1,2}):(\d{2})", s)
    if not m:
        return None
    hoje = date.today()
    ano = int(m[3]) if m[3] else hoje.year
    d = datetime(ano, _MESES[m[2].lower()], int(m[1]), int(m[4]), int(m[5]))
    if not m[3] and d.date() > hoje:  # sem ano e "no futuro": é do ano passado
        d = d.replace(year=ano - 1)
    return d.strftime("%Y-%m-%dT%H:%M:00-03:00")


def _data(texto: str, quando: str | None) -> str | None:
    """A data do pedido: a do bloco "Mensagem encaminhada" (encaminhado à mão: o cabeçalho é de quando encaminhou), senão a
    do e-mail (cabeçalho), senão a que o Gmail imprime ("ter., 20 de out., 23:15")."""
    blocos = re.findall(r"(?is)(?:Forwarded message|Mensagem encaminhada|Mensaje reenviado)(.{0,700}?\b(?:Date|Data|Fecha)\s*:\s*[^\n]+)", texto)
    if blocos:  # encaminhado (até mais de uma vez): o bloco que vem da loja; sem ele, o mais de dentro
        da_loja = [x for x in blocos if any(r in x.lower() for r in REMETENTES)]
        m = re.search(r"(?is)\b(?:Date|Data|Fecha)\s*:\s*([^\n]+)", (da_loja or blocos)[-1])
        if m and (d := _data_br(m[1])):
            return d
    if quando:
        try:
            d = datetime.fromisoformat(str(quando).strip().replace(" ", "T", 1))
            if d.tzinfo:  # o cabeçalho do e-mail costuma vir em UTC: a compra é no horário de Brasília (sem horário de verão)
                d = d.astimezone(timezone(timedelta(hours=-3)))
            return d.isoformat(timespec="seconds")
        except ValueError:
            pass
    return _data_br(texto)


def _pagamento(texto: str) -> dict[str, Any]:
    m = re.search(r"(?i)M[ée]todo de pagamento\s*:\s*(.+)", texto)
    s = (m[1] if m else "").strip()
    cartao = re.search(r"(?i)Cart[ãa]o de (cr[ée]dito|d[ée]bito)\s*:", texto)  # a confirmação diz qual foi
    if re.search(r"(?i)d[ée]bito", s) or (cartao and cartao[1].lower().startswith("d")):
        fim = re.search(r"\[\s*\*\s*(\d{4})\s*\]|(\d{4})\s*$", s) or re.search(r"(?i)Cart[ãa]o de d[ée]bito\s*:\s*\S*?(\d{4})\b", texto)
        return {"tipo": "Débito", "final": next((g for g in fim.groups() if g), None) if fim else None,
                "banco": re.sub(r"\s*[\[(].*$|\s*-\s*.*$", "", s).strip() or None, "parcelas": 1, "carteira": None}
    final = re.search(r"\[\s*\*\s*(\d{4})\s*\]|\*{2,}\s*(\d{4})|final\s*(\d{4})", s, re.I)
    parc = re.search(r"(?i)(\d{1,2})\s*x", s)
    banco = re.sub(r"\s*[\[(].*$|\s*-\s*Parcel.*$", "", s).strip() or None
    if re.search(r"(?i)\bpix\b", s):
        tipo = "Pix"
    elif re.search(r"(?i)boleto", s):
        tipo = "Boleto"
    elif re.search(r"(?i)shopee\s*pay|saldo|carteira", s):
        tipo = "Saldo em carteira"
    elif final or re.search(r"(?i)cart[ãa]o|cr[ée]dito|parcelamento", s):
        tipo = "Crédito"  # o e-mail fala em parcelamento no cartão: é crédito (débito não parcela)
    else:
        tipo = None
    return {"tipo": tipo, "final": next((g for g in final.groups() if g), None) if final else None,
            "banco": banco if tipo == "Crédito" else None, "parcelas": int(parc[1]) if parc and tipo == "Crédito" else 1,
            "carteira": "Shopee Pay" if tipo == "Saldo em carteira" else None}


def _itens(corpo: str) -> list[dict[str, Any]]:
    """Os itens entre "Quantidade Preço" e o subtotal: "<nome> <qtd> R$<preço>", com o nome às vezes quebrado em
    volta da quantidade (o e-mail é uma tabela). O preço é o da linha (quantidade × unitário)."""
    t = re.sub(r"\s+", " ", corpo).strip()
    ms = list(re.finditer(rf"(?<![\d,])(\d{{1,3}})\s+R\$\s?(\d{{1,3}}(?:\.\d{{3}})*,\d{{2}})", t))
    if not ms:
        return []
    pedacos = [t[(ms[i - 1].end() if i else 0):m.start()] for i, m in enumerate(ms)]
    pedacos[-1] += " " + t[ms[-1].end():]
    if len(ms) == 1:
        pedacos = [t[:ms[0].start()] + " " + t[ms[0].end():]]
    out = []
    for m, nome in zip(ms, pedacos):
        nome = re.sub(r"\s+", " ", re.sub(r"(?i)\bQuantidade\b|\bPre[çc]o\b", " ", nome)).strip(" -–")
        q, v = int(m[1]), _brl(m[2])
        out.append({"descricao": nome[:200] or "Produto", "qtd": q, "preco": v})
    return out


def _pago(t: str, quando: str | None) -> dict[str, Any]:
    """Confirmação de pagamento: os pedidos (vendedor, razão social, CNPJ, itens com quantidade), quando e quanto."""
    partes = []
    for b in re.split(r"(?i)ID do pedido\s*:\s*", t)[1:]:
        b = re.split(r"(?i)Detalhes do pagamento|Detalhes da entrega", b)[0]
        num = re.match(r"\s*#?\s?([0-9A-Z]{10,})", b)
        if not num:
            continue
        loja = re.search(r"(?i)Nome da loja\s*:\s*(\S+)", b) or re.search(r"(?i)Vendedor\s*:\s*(\S+)", b)
        cnpj = re.search(r"(?i)CNPJ\s*:\s*([\d./-]{14,18})", b)
        # razão social só de empresa (CNPJ); vendedor pessoa física (CPF): nome e CPF não ficam guardados
        razao = re.search(r"(?im)^\s*Nome\s*:\s*(.+?)\s*$", b) if cnpj else None
        ini = re.search(r"(?i)Detalhes do\(s\) Produto\(s\)", b) or (loja if not re.search(r"(?i)Informa[çc][õo]es do vendedor", b) else None)
        resto = b[ini.end():] if ini else ""
        q = re.search(r"(?i)Quantidade", resto)
        antes, depois = (resto[:q.start()], resto[q.end():]) if q else ("", resto)
        qtds = [int(x) for x in re.findall(r"(?m)^\s*(\d{1,3})\s*$", depois)]
        nome = re.sub(r"\s+", " ", antes + " " + re.sub(r"(?m)^\s*\d{1,3}\s*$", " ", depois)).strip()
        partes.append({"numero": num[1], "vendedor": loja[1] if loja else None, "razao": razao[1].strip()[:120] if razao else None,
                       "cnpj": re.sub(r"\D", "", cnpj[1]) if cnpj else None,
                       "itens": [{"descricao": nome[:200] or "Produto", "qtd": sum(qtds) or 1}]})
    m = re.search(r"(?i)Data de pagamento\s*:\s*(\d{1,2}) de (\w{3})\w* de (\d{4})(?:\s*às\s*(\d{1,2}):(\d{2}))?", t)
    pago_em = None
    if m and m[2].lower() in _MESES:
        pago_em = datetime(int(m[3]), _MESES[m[2].lower()], int(m[1]), int(m[4] or 12), int(m[5] or 0)).strftime("%Y-%m-%dT%H:%M:00-03:00")
    return {"evento": "pago", "loja": LOJA, "numeros": [p["numero"] for p in partes], "data": pago_em or _data(t, quando),
            "pagamento": _pagamento(t), "partes": partes, "total": _campo(t, "Valor final total") or _campo(t, "Valor original"),
            "clientes": _clientes(t)}


def _clientes(t: str) -> list[str]:
    from .amazon import clientes
    return clientes(t)


def ler(texto: str, quando: str | None = None) -> dict[str, Any]:
    t = (texto or "").replace("\r", "")
    cancelado = re.search(r"(?i)\bcancelad[oa]\b|\bcancelamento\b", t[:1500]) and not re.search(r"(?i)PEDIDO REALIZADO|foi realizado|PAGAMENTO APROVADO", t)
    numeros = list(dict.fromkeys(re.findall(r"#\s?([0-9A-Z]{12,16})\b", t)))
    if cancelado:
        return {"evento": "cancelado", "loja": LOJA, "numeros": numeros, "data": _data(t, quando)}
    if re.search(r"(?i)PAGAMENTO APROVADO|Confirma[çc][ãa]o de pagamento", t[:1500]):
        return _pago(t, quando)
    blocos = re.split(r"(?i)ID do pedido\s*:\s*", t)[1:]
    partes = []
    for b in blocos:
        b = re.split(r"(?i)Detalhes do pagamento|Detalhes da entrega|M[ée]todo de pagamento", b)[0]
        num = re.match(r"\s*#?\s?([0-9A-Z]{10,})", b)
        vend = re.search(r"(?i)Vendedor\s*:\s*(\S+)", b)
        fim = re.search(r"(?i)Subtotal dos Produtos", b)
        # do vendedor ao subtotal: o nome do produto vem antes ou depois do cabeçalho "Quantidade Preço" (depende de quem
        # transformou o e-mail em texto); _itens tira o cabeçalho
        corpo = b[vend.end() if vend else (num.end() if num else 0):fim.start() if fim else len(b)]
        produtos, frete = _campo(b, "Subtotal dos Produtos"), _campo(b, "Subtotal do Frete") or 0.0
        descontos = []
        for rot, motivo in (("Subtotal de Desconto do Frete", "Desconto do frete"), ("Cupom de desconto", "Cupom"),
                            ("Cupom da Shopee", "Cupom"), ("Cupom do vendedor", "Cupom do vendedor"), ("Moedas Shopee", "Moedas Shopee"),
                            ("Desconto", "Desconto")):
            for m in re.finditer(rf"(?i){rot}\s*:?\s*{_VALOR}", b):
                if rot == "Desconto" and re.search(r"(?i)(?:Frete|Cupom de|Subtotal de)\s*$", b[max(0, m.start() - 20):m.start()]):
                    continue
                v = _brl(m[1])
                if v and not any(d["_pos"] == m.start() for d in descontos):
                    descontos.append({"motivo": motivo, "valor": v, "_pos": m.start()})
        pago = _campo(b, "Pagamento Total")
        if pago is None:
            continue
        for d in descontos:
            d.pop("_pos")
        itens = _itens(corpo)
        esperado = round((produtos or sum(i["preco"] for i in itens)) + frete - sum(d["valor"] for d in descontos), 2)
        partes.append({"numero": num[1] if num else None, "vendedor": vend[1] if vend else None, "itens": itens,
                       "produtos": produtos, "frete": frete, "descontos": descontos, "pago": pago,
                       "bate": abs(esperado - pago) < 0.03 and abs((produtos or 0) - sum(i["preco"] for i in itens)) < 0.03})
    return {"evento": "realizado", "loja": LOJA, "numeros": numeros or [p["numero"] for p in partes if p["numero"]],
            "data": _data(t, quando), "pagamento": _pagamento(t), "partes": partes,
            "total": round(sum(p["pago"] for p in partes), 2), "clientes": _clientes(t)}
