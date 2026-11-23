"""Leitor da Amazon. Os e-mails:
- "Pedido: …" (auto-confirm@): o pedido feito, com os itens (quantidade e preço) e o total. Sem "Pagamento pendente",
  vale como pago (a Amazon cobra o cartão sozinha); com ele, fica aguardando a confirmação;
- "Pagamento recusado" e "Confirmação de pagamento" (payments-update@): o mesmo pedido, aguardando ou pago;
- "Pagamento confirmado para o pedido …" (modelo antigo, sem os itens): a bandeira ("Pagamento feito com: Visa") e se foi
  parcelado. O "Total do pedido" dele é antes dos pontos/cupom: o que vale é o Total do e-mail do pedido;
- "Cancelamento bem-sucedido de itens…" (order-update@): os itens cancelados de um pedido.
O e-mail não traz o cartão, o vendedor nem o frete separado: o cartão vem pela pergunta no aviso; o vendedor, da nota
fiscal, quando ela se encaixa no pedido. Quem comprou: o primeiro nome da saudação ("Olá, Júlia", nome de exemplo) ou da entrega, que
pedidos.py casa com os apelidos de ⚙ › Pessoas (os outros nomes não valem). A cidade de entrega não é lida.

Dois formatos do mesmo e-mail: o texto simples (o que a integração IMAP entrega: nome do item inteiro, "78 BRL") e o
HTML virado texto (arquivo do Google Takeout: nome cortado em "…", "R$ 78 00")."""
from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from typing import Any

LOJA = "Amazon"
REMETENTES = ["auto-confirm@amazon.com.br", "payments-update@amazon.com.br", "order-update@amazon.com.br"]
ASSUNTOS = ["Pedido: ", "Confirmação de pagamento", "Pagamento recusado", "Cancelamento bem-sucedido"]
# "AMAZON MARKETPLACE", "AMAZON BR", "AMAZONMKTPLC*LOJA", "AMAZON RETAIL BR"; a assinatura Prime e o Kindle não são pedidos
NA_FATURA = r"^\s*AMAZON(?!\s*PRIME|\s*DIGITAL)"

_NUM = r"(\d{3}-\d{7}-\d{7})"
_MARCAS = (r"Agradecemos seu pedido|pagamento foi recebido|pagamento foi recusado|Pagamento pendente|pagamento foi confirmado"
           r"|Sucesso no cancelamento|cancelado com sucesso|Itens cancelados")


def reconhece(remetente: str, assunto: str, texto: str) -> bool:
    da_amazon = "amazon.com.br" in (remetente or "").lower() or re.search(r"(?i)amazon\.com\.br", texto or "")
    return bool(da_amazon and re.search(_NUM, texto or "") and re.search(rf"(?i){_MARCAS}", texto or ""))


def clientes(t: str) -> list[str]:
    """Os primeiros nomes que o e-mail dá para quem comprou, na ordem de confiança: a saudação, o agradecimento e a
    entrega. Usado também pela Shopee. Quem decide se é alguém da casa é pedidos._quem (pelos apelidos)."""
    out = []
    for rx in (r"(?im)^\W*(?:Ol[áa]|Oi|Prezad[oa](?:\(a\))?|Caro|Cara)\s*,?\s+([A-Za-zÀ-ÿ]+)",
               r"(?i)(?:Agradecemos|Obrigad[oa])\s+(?:o\s+|pelo\s+)?(?:seu\s+)?pedido\s*,\s*([A-Za-zÀ-ÿ]+)",
               r"(?i)(?:Enviar para|Entregar (?:a|para)|Ser[áa] entregue (?:a|para)|Endere[çc]o de entrega|Destinat[áa]rio|Nome do destinat[áa]rio)\s*:?\s*\n?\s*([A-Za-zÀ-ÿ]+)"):
        for m in re.finditer(rx, t or ""):
            if m[1] not in out:
                out.append(m[1])
    return out


def _valor(s: str) -> float:
    """"78", "33.9", "1,299.90" (texto simples) → float."""
    s = s.strip()
    if "," in s and "." in s:
        s = s.replace(",", "")
    elif "," in s:
        s = s.replace(",", ".")
    return round(float(s), 2)


def _data(t: str, quando: str | None) -> str | None:
    """A data do e-mail no horário de Brasília. Encaminhado à mão: a do bloco "Forwarded message" (o cabeçalho é de quando
    encaminhou)."""
    from .shopee import _data_br
    m = re.search(r"(?is)(?:Forwarded message|Mensagem encaminhada).{0,400}?\b(?:Date|Data)\s*:\s*([^\n]+)", t or "")
    if m and (d := _data_br(m[1])):
        return d
    if not quando:
        return None
    try:
        d = datetime.fromisoformat(str(quando).strip().replace(" ", "T", 1))
    except ValueError:
        try:
            from email.utils import parsedate_to_datetime
            d = parsedate_to_datetime(str(quando))
        except Exception:
            return None
    if d.tzinfo:
        d = d.astimezone(timezone(timedelta(hours=-3)))
    return d.isoformat(timespec="seconds")


def _preco(seg: str) -> float | None:
    m = re.search(r"(?<![\d.,])(\d[\d.,]*)\s*BRL\b", seg)  # texto simples: "78 BRL", "33.9 BRL"
    if m:
        return _valor(m[1])
    m = re.search(r"R\$\s*(\d[\d.]*)\s+(\d{2})(?!\d)", seg)  # HTML: "R$ 78 00" (reais e centavos separados)
    if m:
        return round(int(m[1].replace(".", "")) + int(m[2]) / 100, 2)
    m = re.search(r"R\$\s*(\d[\d.,]*\.\d{2})(?!\d)", seg)  # "R$78.00"
    if m:
        return _valor(m[1])
    m = re.search(r"R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})(?!\d)", seg)  # "R$445,00"
    if m:
        return round(float(m[1].replace(".", "").replace(",", ".")), 2)
    m = re.search(r"R\$\s*(\d+)(\d{2})(?![\d.,])", seg)  # encaminhado pelo Gmail: "R$44500" (reais e centavos colados)
    return round(int(m[1]) + int(m[2]) / 100, 2) if m else None


_RUIDO = re.compile(r"(?i)^(?:https?://\S+|Visualizar ou editar pedido|Pedido n[ºo°]?\b.*|R\$|\d{1,3}|\d{1,3}\s*\d{2}|R\$\s*\d[\d.]*\s+\d{2}|\d[\d.,]*\s*BRL|Total)$")


def _itens(bloco: str) -> list[dict[str, Any]]:
    """Os itens: "<nome>" (o texto simples começa com "* ") seguido de "Quantidade: N" e do preço."""
    out = []
    partes = re.split(r"(?i)\bQuantidade\s*:\s*(\d+)", bloco)
    # partes = [antes, qtd1, depois1, qtd2, depois2, ...]: o nome do item i está no fim do pedaço anterior à quantidade i
    for i in range(1, len(partes), 2):
        antes, qtd, depois = partes[i - 1], int(partes[i]), partes[i + 1]
        if i > 1:  # o pedaço anterior começa com o preço do item anterior
            antes = re.sub(r"(?is)^.*?(?:\d\s*BRL\b|R\$\s*\d[\d.]*\s+\d{2}(?!\d)(?:\s*R\$\s*\d[\d.]*\s+\d{2}(?!\d))?)", "", antes, count=1)
        linhas = [ln.strip() for ln in antes.splitlines() if ln.strip() and not _RUIDO.match(ln.strip())]
        nome = ""
        estrela = [n for n, ln in enumerate(linhas) if ln.startswith("*")]
        if estrela:  # texto simples: o nome começa no "* " (e pode quebrar em mais linhas)
            nome = " ".join(linhas[estrela[-1]:])
        elif linhas:
            nome = linhas[-1]
        nome = re.sub(r"\s+", " ", nome.lstrip("* ")).strip()
        out.append({"descricao": nome[:200] or "Produto", "qtd": qtd, "preco": _preco(re.split(r"(?i)\bQuantidade\s*:", depois)[0])})
    return out


def _parte(numero: str, bloco: str) -> dict[str, Any] | None:
    fim = re.search(r"(?im)^\s*Total\b", bloco)
    itens = _itens(bloco[:fim.start()] if fim else bloco)
    if not itens or any(i["preco"] is None for i in itens):
        return None
    total = _preco(bloco[fim.end():fim.end() + 60]) if fim else None
    linhas = round(sum(i["preco"] for i in itens), 2)
    unit = round(sum(i["preco"] * i["qtd"] for i in itens), 2)
    if total and abs(unit - total) < 0.03 and abs(linhas - total) >= 0.03:  # o e-mail mostrou o preço de cada unidade
        for i in itens:
            i["preco"] = round(i["preco"] * i["qtd"], 2)
        linhas = unit
    pago = total if total else linhas  # "Pagamento recusado" mostra Total R$ 0,00: fica a soma dos itens até confirmar
    frete = round(pago - linhas, 2) if pago > linhas + 0.02 else 0.0
    descontos = [{"motivo": "Pontos ou cupom", "valor": round(linhas - pago, 2)}] if linhas > pago + 0.02 else []
    return {"numero": numero, "vendedor": None, "itens": itens, "produtos": linhas, "frete": frete,
            "descontos": descontos, "pago": pago, "bate": True}


def _cancelado(t: str, quando: str | None) -> dict[str, Any]:
    nums = list(dict.fromkeys(re.findall(_NUM, t)))
    corpo = re.split(r"(?i)Itens cancelados", t, maxsplit=1)[-1]
    corpo = re.split(r"(?i)Esperamos ver voc", corpo)[0]
    itens = []
    for m in re.finditer(r"(?im)^\s*Vendido por\s+(.+?)\s*$", corpo):
        antes = corpo[:m.start()]
        antes = re.split(r"(?i)Motivo do cancelamento[^\n]*\n|Feito em [^\n]*\n", antes)[-1]
        linhas = [ln.strip() for ln in antes.splitlines() if ln.strip() and not re.match(r"(?i)^\(?https?://|N[úu]mero do pedido", ln.strip())]
        if linhas:
            itens.append({"descricao": re.sub(r"\s+", " ", " ".join(linhas))[:200], "vendedor": m[1].strip()})
    return {"evento": "cancelado", "loja": LOJA, "numeros": nums, "data": _data(t, quando), "itens": itens}


def _pagamento_confirmado(t: str, quando: str | None) -> dict[str, Any]:
    """Modelo antigo: sem os itens; traz a bandeira e se foi parcelado (sem o número de parcelas)."""
    nums = list(dict.fromkeys(re.findall(_NUM, t)))
    m = re.search(r"(?i)Pagamento feito com\s*:?\s*\**\s*([A-Za-zÀ-ú ]+?)\s*\**\s*(?:\n|$)", t)
    s = (m[1] if m else "").strip()
    band = next((b for b in ("Visa", "Mastercard", "Elo", "American Express", "Hipercard", "Diners") if b.lower() in s.lower()), None)
    pix, boleto = re.search(r"(?i)\bpix\b", s), re.search(r"(?i)boleto", s)
    tipo = "Pix" if pix else "Boleto" if boleto else "Crédito" if band or re.search(r"(?i)cart[ãa]o|parcelad", s + t) else None
    parcelado = bool(re.search(r"(?i)\bParcelado\b", t))
    return {"evento": "pago", "loja": LOJA, "numeros": nums, "data": _data(t, quando), "total": None, "clientes": clientes(t),
            "pagamento": {"tipo": tipo, "final": None, "banco": None, "bandeira": band, "carteira": None,
                          "parcelas": None if parcelado else 1},
            "partes": [{"numero": n, "vendedor": None, "razao": None, "cnpj": None, "itens": []} for n in nums]}


def ler(texto: str, quando: str | None = None) -> dict[str, Any]:
    t = re.sub(r"[​-‏‪-‮͏­]", "", (texto or "").replace("\r", ""))
    if re.search(r"(?i)Sucesso no cancelamento|cancelado com sucesso|Itens cancelados", t):
        return _cancelado(t, quando)
    if re.search(r"(?i)pagamento foi confirmado", t) and not re.search(r"(?i)Quantidade\s*:", t):
        return _pagamento_confirmado(t, quando)
    pendente = re.search(r"(?i)Pagamento pendente|pagamento foi recusado", t)
    recebido = re.search(r"(?i)pagamento foi recebido", t)
    # um e-mail pode trazer mais de um pedido (um por vendedor): cada "Pedido nº" abre um bloco
    blocos = re.split(rf"(?i)Pedido\s*n[ºo°]?\s*:?\s*{_NUM}", t)
    partes = [p for n in range(1, len(blocos), 2) if (p := _parte(blocos[n], blocos[n + 1]))]
    pago = None if pendente and not recebido else "confirmação de pagamento" if recebido else "pedido feito na Amazon"
    return {"evento": "realizado", "loja": LOJA, "numeros": [p["numero"] for p in partes], "data": _data(t, quando),
            "pagamento": {"tipo": None, "final": None, "banco": None, "parcelas": None, "carteira": None},  # o e-mail não diz
            "partes": partes, "total": round(sum(p["pago"] for p in partes), 2), "pago": pago, "clientes": clientes(t)}
