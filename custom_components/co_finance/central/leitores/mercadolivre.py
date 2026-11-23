"""Leitor do Mercado Livre. O e-mail "Você comprou …" (no-reply@mercadolivre.com.br) não traz valor, número da compra
nem cartão: só o primeiro produto (e quantos são), o vendedor (nome e CNPJ) e o dia. Os valores vêm do print da tela
"Detalhes da transação" do app (o texto que o celular lê da imagem: Atalho no iPhone, ou colado no card):
  Detalhes da transação / 17 de novembro | #2000000000000000
  <produto…> R$ 63,20 / 1 unidade (um por item, nome cortado em "…")
  Desconto à vista - R$ 8,10 · Frete grátis R$ 9,99 Grátis (ou o valor do frete)
  Total pago 1x R$ 174,09 · Mastercard **** 1234 · Constará como MERCADOLIVRE*MERCADOLIVRE na fatura
O print não diz o vendedor: a Central junta com o e-mail do mesmo dia pelos nomes dos produtos.
Quem comprou (e-mail): o primeiro nome da linha da entrega ("Nome Sobrenome - 6299…"); endereço, telefone e o CPF do
vendedor pessoa física não são guardados."""
from __future__ import annotations

import re
from datetime import date
from typing import Any

LOJA = "Mercado Livre"
REMETENTES = ["no-reply@mercadolivre.com.br"]
ASSUNTOS = ["Você comprou"]
NA_FATURA = r"^\s*(?:MP\s*\*\s*)?MERCADO\s*(?:\*\s*)?(?:MERCADO\s*)?LIVRE"  # "MERCADOLIVRE*…", "MERCADO*MERCADOLIVRE" (não a assinatura MELIMAIS)

_VALOR = r"R\$\s?(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)"
_MESES = {m: i + 1 for i, m in enumerate(("jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"))}


def e_print(texto: str) -> bool:
    return bool(re.search(r"(?i)Detalhes da transa", texto or "") and re.search(r"(?i)Total pago", texto or ""))


def reconhece(remetente: str, assunto: str, texto: str) -> bool:
    if e_print(texto):
        return True
    do_ml = "mercadolivre" in (remetente or "").lower() or re.search(r"(?i)conta do Mercado Livre|Mercado Livre", texto or "")
    return bool(do_ml and re.search(r"(?im)^\s*Você comprou de\s+\S", texto or ""))


def _brl(s: str) -> float:
    return round(float(s.replace(".", "").replace(",", ".")), 2)


def _dia_sem_ano(t: str, quando: str | None) -> str | None:
    """"17 de novembro" (sem ano) → ISO: o mais recente que não está no futuro."""
    m = re.search(r"(?i)\b(\d{1,2})\s+de\s+(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\w*", t)
    if not m:
        return None
    hoje = date.today()
    try:
        d = date(hoje.year, _MESES[m[2].lower()], int(m[1]))
    except ValueError:
        return None
    if d > hoje:
        d = d.replace(year=hoje.year - 1)
    return f"{d.isoformat()}T12:00:00-03:00"


# ---------------------------------------------------------------- o e-mail

def _email(t: str, quando: str | None) -> dict[str, Any]:
    from .amazon import _data
    linhas = [ln.strip() for ln in t.splitlines() if ln.strip()]
    m = re.search(r"(?im)^\s*Você comprou de\s+(.+?)\s*$", t)
    vendedor = m[1].strip() if m else None
    doc = re.search(r"(?im)^\s*CNPJ\s*:?\s*([\d./-]{14,18})\s*$", t)
    cnpj = re.sub(r"\D", "", doc[1]) if doc else None
    # o primeiro produto: "Você comprou <produto>" (o título; "Compa... e 1 mais produto" quando são vários)
    titulo = next((x for x in linhas if re.match(r"(?i)Você comprou\s+(?!de\s)(?!\d+\s+produtos?\b)", x)), "")
    prod = re.sub(r"(?i)^Você comprou\s+", "", titulo)
    mais = re.search(r"(?i)\s*e\s+(\d+)\s+mais\s+produtos?\s*$", prod)
    prod = prod[:mais.start()] if mais else prod
    n = re.search(r"(?im)^\s*Você comprou\s+(\d+)\s+produtos\b", t)
    qtd = int(n[1]) if n else (1 + int(mais[1]) if mais else 1)
    # quem comprou: a linha da entrega "Júlia Exemplo - 00000000000" (só o primeiro nome)
    cli = re.search(r"(?m)^\s*([A-Za-zÀ-ÿ]+)[A-Za-zÀ-ÿ ]*\s-\s*\d{10,11}\s*$", t)
    return {"evento": "sem_valores", "loja": LOJA, "data": _data(t, quando), "vendedor": vendedor, "cnpj": cnpj,
            "itens": [{"descricao": re.sub(r"\.{3}$|…$", "", prod).strip()[:200]}] if prod else [], "qtd_produtos": qtd,
            "cliente": cli[1] if cli else None}


# ---------------------------------------------------------------- o print "Detalhes da transação"

def _so_linhas(t: str) -> list[str]:
    """O texto lido da imagem: uma coisa por linha (preço junto do nome ou em linha própria, conforme o celular)."""
    t = re.sub(rf"(?<=[^\s-])[ \t]+(-?\s*{_VALOR})", r"\n\1", t)  # "Produto… R$ 63,20" → duas linhas ("- R$ 8,10" fica)
    return [ln.strip() for ln in t.splitlines() if ln.strip()]


def _print(t: str, quando: str | None) -> dict[str, Any]:
    num = re.search(r"#\s?(\d{12,})", t)
    corpo = re.split(r"(?i)Detalhes da transa\w*", t, maxsplit=1)[-1]
    corpo, fim = (re.split(r"(?i)Total pago", corpo, maxsplit=1) + [""])[:2]
    linhas = _so_linhas(corpo)
    nomes: list[tuple[str, int]] = []
    for i, ln in enumerate(linhas):
        if re.match(r"(?i)\d+\s+unidades?\b", ln):
            # o nome: a linha de texto mais perto antes do "N unidade" (pulando o preço)
            k = i - 1
            while k >= 0 and re.fullmatch(rf"-?\s*{_VALOR}", linhas[k]):
                k -= 1
            if k >= 0:
                nomes.append((re.sub(r"\s*(\.{3}|…)\s*$", "", linhas[k]), int(re.match(r"\d+", ln)[0])))
    # os valores, na ordem em que aparecem (junto do nome ou numa coluna separada, conforme o celular leu): os primeiros
    # positivos são os itens; com "-", os descontos; o que sobra positivo (sem "Grátis") é o frete
    rotulos_desc = [ln.strip()[:40] for ln in linhas if re.match(r"(?i)(Desconto|Cupom)", ln)]
    gratis = bool(re.search(r"(?i)gr[áa]tis", corpo))
    pos, neg = [], []
    for ln in linhas:
        v = re.fullmatch(rf"(-)?\s*{_VALOR}(\s*Gr[áa]tis)?", ln)
        if v and not v[3]:
            (neg if v[1] else pos).append(_brl(v[2]))
    precos = pos[:len(nomes)]
    descontos = [{"motivo": (rotulos_desc[i] if i < len(rotulos_desc) else "Desconto"), "valor": v} for i, v in enumerate(neg)]
    resto = pos[len(nomes):]
    frete = 0.0 if gratis or not resto else resto[0]
    tot = re.search(rf"(?:(\d{{1,2}})\s*x\s*)?{_VALOR}", fim)
    total = _brl(tot[2]) if tot else None
    formas = _formas(fim)
    # confere: itens - descontos + frete = total; não fechando, fica só o total (sem preço por item)
    fecha = len(precos) == len(nomes) and total is not None and abs(sum(precos) - sum(d["valor"] for d in descontos) + frete - total) < 0.03
    itens = [{"descricao": n[:200], "qtd": q, "preco": precos[i] if fecha else None} for i, (n, q) in enumerate(nomes)]
    card = next((f for f in formas if f["tipo"] == "Crédito"), None)
    princ = card or (formas[0] if formas else {})
    pg = {"tipo": princ.get("tipo"), "final": princ.get("final"), "bandeira": princ.get("bandeira"), "banco": None,
          "parcelas": princ.get("parcelas") or (int(tot[1]) if tot and tot[1] else None), "carteira": princ.get("carteira")}
    if len(formas) > 1:  # pago em duas formas (saldo + cartão): a fatura só traz a parte do cartão
        pg["formas"] = formas
        pg["valor_cartao"] = round(sum(f["valor"] for f in formas if f["tipo"] == "Crédito"), 2)
    return {"evento": "print", "loja": LOJA, "numeros": [num[1]] if num else [], "data": _dia_sem_ano(t, quando),
            "itens": itens, "descontos": descontos if fecha else [], "frete": frete, "fecha": fecha, "total": total, "pagamento": pg,
            "fatura": (re.search(r"(?i)Constar[áa] como\s+(\S+)", fim) or [None, None])[1]}


_FORMA = (r"(?i)^(?:(?P<band>Mastercard|Visa|Elo|American Express|Amex|Hipercard)\s*[*•·.\s]*(?P<final>\d{4})\b"
          r"|(?P<saldo>Saldo (?:no|em conta|do) Mercado Pago|Dinheiro (?:na|em) conta)|(?P<pix>Pix)\b|(?P<boleto>Boleto))")


def _formas(fim: str) -> list[dict[str, Any]]:
    """As formas de pagamento do fim do print: cada uma é a linha do meio ("Mastercard **** 1234", "Saldo no Mercado
    Pago", "Pix"), com o valor na linha de valor mais perto antes dela ("3x R$ 111,63" → 3 parcelas de 111,63)."""
    linhas = [ln.strip() for ln in fim.splitlines() if ln.strip()]
    out = []
    for i, ln in enumerate(linhas):
        m = re.match(_FORMA, ln)
        if not m:
            continue
        v = None
        for k in range(i - 1, max(-1, i - 3), -1):
            v = re.fullmatch(rf"(?:(\d{{1,2}})\s*x\s*)?{_VALOR}", linhas[k])
            if v:
                break
        if not v:
            continue
        n = int(v[1]) if v[1] else 1
        valor = round(_brl(v[2]) * n, 2)
        if m["band"]:
            out.append({"tipo": "Crédito", "valor": valor, "parcelas": n, "final": m["final"], "bandeira": m["band"].title()})
        elif m["saldo"]:
            out.append({"tipo": "Saldo em carteira", "valor": valor, "carteira": "Mercado Pago"})
        else:
            out.append({"tipo": "Pix" if m["pix"] else "Boleto", "valor": valor})
    return out


def ler(texto: str, quando: str | None = None) -> dict[str, Any]:
    t = (texto or "").replace("\r", "").replace("‌", "")
    return _print(t, quando) if e_print(t) else _email(t, quando)
