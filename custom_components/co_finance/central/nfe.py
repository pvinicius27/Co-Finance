"""Leitor da NF-e (portal nacional, XML e consulta DF)."""
from __future__ import annotations

import html
import re
from typing import Any

from .config import BANDEIRAS, T_PAG
from .base import Falha, fmt_brl, gtin_valido, num, txt
from .pagamentos import nome_bandeira
from .copia import _sem_codigo, detalhada_conteudo


PORTAL_NFE = "www.nfe.fazenda.gov.br/portal (Consultar NF-e)"


def _secao(h: str, ident: str) -> str:
    # Portal Nacional: <div id="Prod" class="GeralXslt">; SEFAZ-GO (consulta completa): <div class="GeralXslt" id="Prod">
    m = re.search(rf'(?s)<div\b[^>]*\bid="{ident}"[^>]*>(.*?)(?=<div id="[A-Z][A-Za-z]*"[^>]*class="GeralXslt"|'
                  rf'<div class="GeralXslt"[^>]*\bid="[A-Z][A-Za-z]*"|<div id="Avulsa"|</form>|$)', h)
    return m[1] if m else ""


def _campo(h: str, rotulo: str) -> str:
    m = re.search(rf"(?s)<label>\s*{rotulo}\s*</label>\s*<span[^>]*>(.*?)</span>", h)
    return txt(m[1]) if m else ""


def _iso(d: str) -> str | None:
    m = re.search(r"(\d{2})/(\d{2})/(\d{4})\s+(\d{2}:\d{2}:\d{2})\s*([+-]\d{2}:\d{2})?", d or "")
    return f"{m[3]}-{m[2]}-{m[1]}T{m[4]}{m[5] or '-03:00'}" if m else None


def _num_nfe(v: str) -> float | None:
    n = num(re.sub(r"[^\d,.]", "", v or ""))
    return round(n, 4) if n is not None else None


def _pg(forma: str, valor: float | None, bandeira: str | None) -> dict[str, Any]:
    return {"forma": forma, "valor": valor, "bandeira": bandeira}


def chave_valida(ch: str) -> bool:
    """Dígito verificador da chave de acesso (módulo 11, pesos 2..9 da direita para a esquerda)."""
    if not re.fullmatch(r"\d{44}", ch or ""):
        return False
    soma = sum(int(d) * (2 + i % 8) for i, d in enumerate(reversed(ch[:43])))
    dv = 11 - soma % 11
    return (0 if dv >= 10 else dv) == int(ch[43])


def achar_chave(h: str) -> str | None:
    """Primeira sequência de 44 números (com ou sem espaços/pontos/tags no meio) cujo dígito verificador confere."""
    t = re.sub(r"<[^>]+>", " ", h or "")
    for m in re.finditer(r"\d(?:[\s./-]*\d){43,}", t):
        dig = re.sub(r"\D", "", m[0])
        for i in range(0, len(dig) - 43):
            if dig[i + 20:i + 22] in ("55", "65") and chave_valida(dig[i:i + 44]):
                return dig[i:i + 44]
    return None


def _pares_df(bloco: str) -> list[tuple[str, str]]:
    """Layout da Receita do DF (DecVisualizador): <div class="sub-titulo">rótulo</div><div class="campo-xml">valor</div>."""
    return [(txt(a), txt(b)) for a, b in re.findall(r'(?s)<div class="sub-titulo">(.*?)</div>\s*<div class="campo-xml">(.*?)</div>', bloco)]


def ler_df_nfce(h: str, chave: str) -> dict[str, Any]:
    """Consulta completa da NFC-e/NF-e na Receita do DF (ww1.receita.fazenda.df.gov.br/DecVisualizador)."""
    aba = lambda ident: (re.search(rf'(?s)id="{ident}".*?(?=<div class="tab-pane|<center>|$)', h) or [""])[0]
    um = lambda pares, rot: next((v for k, v in pares if k.lower() == rot.lower()), "")
    geral, emit, tot, cob = _pares_df(aba("abaNFe")), _pares_df(aba("abaEmitente")), _pares_df(aba("abaTotais")), aba("abaCobranca")
    itens = []
    for n, bloco in enumerate(re.split(r'<span class="sub-titulo">\s*Item - \d+\s*</span>', aba("abaProdutosServicos"))[1:], 1):
        pr = _pares_df(bloco)
        qtd = _num_nfe(um(pr, "Quantidade").replace(".", ",") if re.fullmatch(r"\d+\.\d+", um(pr, "Quantidade")) else um(pr, "Quantidade"))
        ean = re.sub(r"\D", "", um(pr, "Código EAN Comercial"))
        total = _num_nfe(um(pr, "Valor(R$)")) or 0
        itens.append({"n": n, "descricao": um(pr, "Descrição"), "codigo": um(pr, "Código do produto"),
                      "ean": ean if gtin_valido(ean) else None, "ncm": re.sub(r"\D", "", um(pr, "Código NCM")) or None,
                      "qtd": qtd, "un": um(pr, "Unidade Comercial").upper(),
                      "unit": _num_nfe(um(pr, "Valor Unitário de Comercialização")), "total": round(total, 2), "promo": False,
                      "_trib": _num_nfe(um(pr, "Valor Aproximado dos Tributos")) or 0})
    pagamentos = []
    for b in re.split(r'<div class="sub-titulo">\s*Forma de Pagamento\s*</div>', cob)[1:]:
        pr = _pares_df('<div class="sub-titulo">Forma de Pagamento</div>' + b)
        pagamentos.append(_pg(re.sub(r"^\d+\s*-\s*", "", um(pr, "Forma de Pagamento")), _num_nfe(um(pr, "Valor do Pagamento")),
                              nome_bandeira(um(pr, "Bandeira da Operadora"))))
    soma = round(sum(i["total"] for i in itens), 2)
    trib = round(sum(i.pop("_trib") for i in itens), 2) or None
    vnf = _num_nfe(um(tot, "Valor Total da NFe")) or _num_nfe(um(geral, "Valor Total da Nota Fiscal"))
    extras = valores_extras(_num_nfe(um(tot, "Valor Total dos Produtos")), None, _num_nfe(um(tot, "Valor do Frete")),
                            (_num_nfe(um(tot, "Valor do Seguro")) or 0) + (_num_nfe(um(tot, "Outras Despesas Acessórias")) or 0),
                            _num_nfe(um(tot, "Valor Total dos Descontos")) or 0.0, vnf, soma,
                            sum(_num_nfe(um(tot, r)) or 0 for r in ("Valor Total do IPI", "Valor ICMS Substituição", "Valor Total do II")))
    return {"loja": {"nome": um(emit, "Nome / Razão Social"), "cnpj": re.sub(r"\D", "", um(emit, "CNPJ")),
                     "cidade": re.sub(r"^\d+\s*-\s*", "", um(emit, "Município")).upper(), "uf": um(emit, "UF")},
            "modelo": chave[20:22], "numero": um(geral, "Número"), "serie": um(geral, "Série"),
            "emissao": _iso(um(geral, "Data de Emissão")),
            "itens": itens, "qtd_itens": len(itens), **extras, "valor_pago": vnf, "pagamentos": pagamentos, "tributos": trib}


def ler_portal_nfe(page: str) -> tuple[str, dict[str, Any]]:
    """Página da consulta completa do Portal Nacional (ou "Preparar documento para impressão"),
    ou da Receita do DF (layout "campo-xml")."""
    h = html.unescape(page or "").replace("\xa0", " ")
    chave = achar_chave(h)
    if not chave:
        raise Falha("Não achei a chave de acesso na página. Abra a nota no portal e compartilhe de novo.")
    if 'class="campo-xml"' in h:
        nota = ler_df_nfce(h, chave)
        if not nota["itens"]:
            raise Falha("A página não tem os produtos da nota. Abra a NFC-e completa e compartilhe de novo.")
        return chave, nota
    geral, emit, prod = _secao(h, "NFe"), _secao(h, "Emitente"), _secao(h, "Prod")
    tot, cob = _secao(h, "Totais"), _secao(h, "Cobranca")
    if not prod:
        raise Falha("A página não tem os produtos da nota. No portal, toque em \"Preparar documento para impressão\" e compartilhe essa página.")
    mun = _campo(emit, "Município")
    itens = []
    for n, bloco in enumerate(re.split(r'<table class="toggle box">', prod)[1:], 1):
        sp = [txt(s) for s in re.findall(r"(?s)<span>(.*?)</span>", bloco.split("</table>")[0])]
        if len(sp) < 5:
            continue
        cod, ean = _campo(bloco, "Código do Produto"), re.sub(r"\D", "", _campo(bloco, "Código EAN Comercial"))
        qtd, total = _num_nfe(sp[2]), _num_nfe(sp[4])
        unit = _num_nfe(_campo(bloco, "Valor unitário de comercialização")) or (round(total / qtd, 4) if qtd and total else None)
        itens.append({"n": n, "descricao": sp[1], "codigo": cod, "ean": ean if gtin_valido(ean) else None,
                      "ncm": re.sub(r"\D", "", _campo(bloco, "Código NCM")) or None,
                      "qtd": qtd, "un": sp[3].upper(), "unit": unit, "total": round(total or 0, 2), "promo": False})
    pagamentos = []
    blocos = re.split(r'<table class="toggle box">', cob)[1:]
    for bloco in blocos:
        sp = [txt(s) for s in re.findall(r"(?s)<span>(.*?)</span>", bloco.split("</table>")[0])]
        rot = [txt(s) for s in re.findall(r"(?s)<label>(.*?)</label>", bloco)]
        val = [txt(s) for s in re.findall(r"(?s)<span>(.*?)</span>", bloco.split("</table>", 1)[1] if "</table>" in bloco else "")]
        d = dict(zip(rot, val))
        meio = re.sub(r"^\d+\s*-\s*", "", sp[1] if len(sp) > 1 else "") or (sp[2] if len(sp) > 2 else "")
        valor = _num_nfe(d["Valor do Pagamento"]) if "Valor do Pagamento" in d else (_num_nfe(sp[2]) if len(sp) > 2 else None)
        pagamentos.append(_pg(meio, valor, nome_bandeira(d.get("Bandeira da operadora", ""))))
    vprod = _num_nfe(_campo(tot, "Valor Total dos Produtos"))
    vnf = _num_nfe(_campo(tot, "Valor Total da NFe")) or _num_nfe(_campo(geral, r"Valor Total da Nota Fiscal"))
    soma = round(sum(i["total"] for i in itens), 2)
    extras = valores_extras(vprod, _num_nfe(_campo(tot, r"Valor Total Serv[^<]*?")),
                            _num_nfe(_campo(tot, "Valor do Frete")),
                            (_num_nfe(_campo(tot, "Valor do Seguro")) or 0) + (_num_nfe(_campo(tot, "Outras Despesas Acessórias")) or 0),
                            _num_nfe(_campo(tot, "Valor Total dos Descontos")) or 0.0, vnf, soma,
                            sum(_num_nfe(_campo(tot, r)) or 0 for r in ("Valor Total do IPI", "Valor ICMS Substituição",
                                "Valor Total do FCP retido por ST", "Valor Total do II", "Valor Total do IPI Devolvido")))
    return chave, {
        "loja": {"nome": _campo(emit, r"Nome / Razão Social"), "cnpj": re.sub(r"\D", "", _campo(emit, "CNPJ")),
                 "cidade": re.sub(r"^\d+\s*-\s*", "", mun).upper(), "uf": _campo(emit, "UF")},
        "modelo": chave[20:22], "numero": _campo(geral, "Número"), "serie": _campo(geral, "Série"),
        "emissao": _iso(_campo(geral, "Data de Emissão")),
        "itens": itens, "qtd_itens": len(itens), **extras,
        "valor_pago": vnf, "pagamentos": pagamentos,
        "tributos": _num_nfe(_campo(tot, "Valor Aproximado dos Tributos")),
    }


def valores_extras(vprod: float | None, serv: float | None, frete: float | None, outros: float | None,
                   desconto: float, vnf: float | None, soma: float, ipi_st: float | None = 0) -> dict[str, Any]:
    """Produtos (peças), serviços, frete, outras despesas, IPI/ST e desconto da NF-e, e a conferência:
    itens = produtos + serviços; produtos + serviços + frete + outras + IPI/ST − desconto = total da nota.
    (IPI, ICMS-ST, FCP-ST e imposto de importação são somados por fora do preço; os outros impostos já estão dentro.)"""
    serv, frete, outros, ipi_st = round(serv or 0, 2), round(frete or 0, 2), round(outros or 0, 2), round(ipi_st or 0, 2)
    base = round((vprod if vprod is not None else soma - serv) + serv, 2)
    calc = round(base + frete + outros + ipi_st - (desconto or 0), 2)
    return {"valor_produtos": round(base - serv, 2), "servicos": serv, "frete": frete, "outras_despesas": outros, "ipi_st": ipi_st,
            "desconto": round(desconto or 0, 2),
            "conferencia": {"soma_itens": soma, "bate": abs(soma - base) < 0.05 and (vnf is None or abs(calc - vnf) < 0.05)}}


def copia_portal(page: str) -> str:
    """Corpo da cópia: o conteúdo da consulta como o portal mostra (todas as abas), sem código."""
    h = re.sub(r'(?is)<div class="aspNetHidden">.*?</div>|<input\b[^>]*>|<div id="pnlImprimir".*?</div>', "", page or "")
    if 'class="campo-xml"' in h:  # Receita do DF
        m = re.search(r'(?is)<div class="container tab-content".*?(?=<center>|<script)', h)
        return f'<section class="det df"><h2>Consulta completa da NFC-e (Receita do DF)</h2>{_sem_codigo(m[0] if m else "")}</section>'
    m = re.search(r'(?is)<div class="divTelaImpressao">\s*<table.*?(?=</form>)', h) or re.search(r'(?is)<div id="NFe" class="GeralXslt".*?(?=</form>|</body>)', h)
    if not m:  # SEFAZ-GO: a consulta dentro de '<html>...' no script, ou solta com <div class="GeralXslt" id="NFe">
        corpo = detalhada_conteudo(page)
        if not corpo:
            g = re.search(r'(?is)<div\b[^>]*class="GeralXslt"[^>]*>\s*<h1>.*?(?=</form>|</body>|$)', h)
            corpo = _sem_codigo(g[0]) if g else ""
        if corpo:
            return f'<section class="det"><h2>Consulta completa da NFC-e (SEFAZ-GO)</h2>{corpo}</section>'
    return f'<section class="det"><h2>Consulta completa da NF-e (Portal Nacional)</h2>{_sem_codigo(m[0] if m else "")}</section>'


def ler_xml_nfe(xml_txt: str) -> tuple[str, dict[str, Any]]:
    """XML da NF-e/NFC-e (nfeProc ou NFe)."""
    import xml.etree.ElementTree as ET
    try:
        raiz = ET.fromstring(re.sub(r"^\ufeff?\s*<\?xml[^>]*\?>", "", (xml_txt or "").strip()).encode("utf-8"))
    except ET.ParseError as e:
        raise Falha("Esse arquivo não parece um XML de nota fiscal.") from e
    sem_ns = lambda t: t.split("}")[-1]
    for el in raiz.iter():
        el.tag = sem_ns(el.tag)
    inf = raiz.find(".//infNFe")
    if inf is None:
        raise Falha("Esse XML não é de nota fiscal (não achei infNFe).")
    g = lambda el, cam: (el.findtext(cam) or "").strip() if el is not None else ""
    f = lambda el, cam: round(float(g(el, cam)), 4) if g(el, cam) else None
    chave = (g(raiz, ".//protNFe/infProt/chNFe") or inf.get("Id", "")[3:])
    ide, emit, tot = inf.find("ide"), inf.find("emit"), inf.find("total/ICMSTot")
    itens = []
    for det in inf.findall("det"):
        pr = det.find("prod")
        ean = re.sub(r"\D", "", g(pr, "cEAN"))
        itens.append({"n": int(det.get("nItem") or len(itens) + 1), "descricao": g(pr, "xProd"), "codigo": g(pr, "cProd"),
                      "ean": ean if gtin_valido(ean) else None, "ncm": g(pr, "NCM") or None,
                      "qtd": f(pr, "qCom"), "un": g(pr, "uCom").upper(), "unit": f(pr, "vUnCom"),
                      "total": round(f(pr, "vProd") or 0, 2), "promo": False})
    pagamentos = [_pg(g(dp, "xPag") or T_PAG.get(g(dp, "tPag"), "Outros"), f(dp, "vPag"),
                      BANDEIRAS.get(g(dp, "card/tBand")) if g(dp, "card/tBand") else None)
                  for dp in inf.findall("pag/detPag")]
    soma = round(sum(i["total"] for i in itens), 2)
    vprod = f(tot, "vProd")
    extras = valores_extras(vprod, f(inf.find("total/ISSQNtot"), "vServ"), f(tot, "vFrete"),
                            (f(tot, "vSeg") or 0) + (f(tot, "vOutro") or 0), f(tot, "vDesc") or 0.0, f(tot, "vNF"), soma,
                            sum(f(tot, t) or 0 for t in ("vIPI", "vST", "vFCPST", "vII", "vIPIDevol")))
    return chave, {
        "loja": {"nome": g(emit, "xNome"), "cnpj": g(emit, "CNPJ") or g(emit, "CPF"),
                 "cidade": g(emit, "enderEmit/xMun").upper(), "uf": g(emit, "enderEmit/UF")},
        "modelo": g(ide, "mod"), "numero": g(ide, "nNF"), "serie": g(ide, "serie"), "emissao": g(ide, "dhEmi") or None,
        "itens": itens, "qtd_itens": len(itens), **extras,
        "valor_pago": f(tot, "vNF"), "pagamentos": pagamentos, "tributos": f(tot, "vTotTrib"),
        "protocolo": g(raiz, ".//protNFe/infProt/nProt") or None,
    }


def copia_xml(chave: str, nota: dict[str, Any]) -> str:
    """Cópia legível do XML (o XML original fica ao lado, em notas/<chave>.xml)."""
    e = html.escape
    lin = "".join(f"<tr><td>{i['n']}</td><td>{e(i['descricao'])}<br><small>Cód. {e(i['codigo'] or '')}"
                  f"{' · EAN ' + i['ean'] if i['ean'] else ''}{' · NCM ' + i['ncm'] if i['ncm'] else ''}</small></td>"
                  f"<td>{i['qtd']:g} {e(i['un'])}</td><td>{fmt_brl(i['unit'])}</td><td>{fmt_brl(i['total'])}</td></tr>"
                  for i in nota["itens"])
    pg = "".join(f"<tr><td>{e(p['forma'] or '')}{' · ' + e(p['bandeira']) if p.get('bandeira') else ''}</td><td>{fmt_brl(p['valor'])}</td></tr>"
                 for p in nota["pagamentos"])
    lj = nota["loja"]
    return (f'<section class="det"><h2>Nota fiscal (do XML original)</h2>'
            f"<fieldset><legend>Emitente</legend><b>{e(lj['nome'])}</b><br>CNPJ {e(lj['cnpj'])} · {e(lj['cidade'])}/{e(lj['uf'])}</fieldset>"
            f"<fieldset><legend>Nota</legend>Modelo {e(nota['modelo'])} · Série {e(nota['serie'])} · Nº {e(nota['numero'])} · "
            f"Emissão {e(nota['emissao'] or '')} · Protocolo {e(nota.get('protocolo') or '')}</fieldset>"
            f'<fieldset><legend>Produtos</legend><table class="tab"><tr><th>#</th><th>Descrição</th><th>Qtd.</th><th>Unit.</th><th>Total</th></tr>{lin}</table></fieldset>'
            f"<fieldset><legend>Totais</legend>Produtos {fmt_brl(nota['valor_produtos'])} · Descontos {fmt_brl(nota['desconto'])} · "
            f"<b>Total da nota {fmt_brl(nota['valor_pago'])}</b> · Tributos aprox. {fmt_brl(nota['tributos'])}</fieldset>"
            f'<fieldset><legend>Pagamento</legend><table class="tab">{pg}</table></fieldset>'
            f"<p><small>O XML original (documento fiscal assinado) está guardado junto desta cópia: notas/{chave}.xml</small></p></section>")
