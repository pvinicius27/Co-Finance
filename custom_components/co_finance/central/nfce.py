"""Leitor da NFC-e pela SEFAZ-GO (link do QR Code, versão detalhada, pagamentos e bandeira)."""
from __future__ import annotations

import html
import http.cookiejar
import re
import urllib.request
from typing import Any

from .config import OUTRO_ESTADO, SEFAZ_GO, TIMEOUT, UA
from .base import Falha, gtin_valido, js_string, num, txt
from .pagamentos import limpar_pag, nome_bandeira


def chave_do_link(url: str) -> tuple[str, str]:
    """Valida o link do QR Code e devolve (chave, link normalizado para o nfeweb)."""
    url = (url or "").strip()
    u = urllib.parse.urlparse(url)
    if not u.netloc.endswith("sefaz.go.gov.br"):
        if re.search(r"sefaz|nfc|nfe", url, re.I):
            raise Falha(OUTRO_ESTADO)
        raise Falha(f"Isso não parece o link do QR Code de um cupom fiscal. Recebi: '{url[:40]}'.")
    p = urllib.parse.parse_qs(u.query).get("p", [""])[0]
    if not p:
        if "chaveAcesso" in u.query or "g-recaptcha" in u.query:
            raise Falha("Esse link é da consulta com captcha. Leia o QR Code do cupom com a câmera.")
        raise Falha("O link não tem os dados do QR Code. Leia o QR Code do cupom com a câmera.")
    chave = p.split("|")[0]
    if not re.fullmatch(r"\d{44}", chave):
        raise Falha("A chave de acesso do QR Code veio incompleta. Tente ler de novo.")
    if chave[:2] != "52":
        raise Falha(OUTRO_ESTADO)
    if chave[20:22] != "65":
        raise Falha("Esse QR Code é de uma nota fiscal comum (NF-e), não de cupom (NFC-e). Por enquanto só leio cupom.")
    link = f"{SEFAZ_GO}/nfeweb/sites/nfce/danfeNFCe?p={urllib.parse.quote(p, safe='')}"
    return chave, link


def baixar_nota(chave: str, link: str) -> tuple[str, str]:
    """Abre a página do QR Code (cria a sessão), o quadro com a nota e a versão detalhada (código de barras
    e NCM de cada item). Três consultas, como o navegador. Devolve (nota, detalhada); a detalhada pode vir vazia."""
    jar = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
    hdr = {"User-Agent": UA, "Accept": "text/html", "Accept-Language": "pt-BR,pt;q=0.9"}
    try:
        page = opener.open(urllib.request.Request(link, headers=hdr), timeout=TIMEOUT).read().decode("utf-8", "replace")
        if "render/danfeNFCe" not in page:
            raise Falha("A SEFAZ não abriu esse cupom. Se o QR Code for antigo, leia de novo com a câmera (o link precisa vir inteiro).")
        frame = opener.open(urllib.request.Request(
            f"{SEFAZ_GO}/nfeweb/sites/nfce/render/danfeNFCe?chNFe={chave}",
            headers={**hdr, "Referer": link}), timeout=TIMEOUT).read().decode("utf-8", "replace")
    except Falha:
        raise
    except urllib.error.HTTPError as e:
        raise Falha(f"A SEFAZ-GO respondeu com erro {e.code}. Tente de novo mais tarde.") from e
    except Exception as e:  # rede, tempo esgotado
        raise Falha("Não consegui falar com a SEFAZ-GO agora. Tente de novo mais tarde.") from e
    try:  # versão detalhada: se falhar, a compra entra mesmo assim (sem código de barras)
        detalhada = opener.open(urllib.request.Request(
            f"{SEFAZ_GO}/nfeweb/sites/nfce/render/NFCe?chNFe={chave}",
            headers={**hdr, "Referer": link}), timeout=TIMEOUT).read().decode("utf-8", "replace")
    except Exception:
        detalhada = ""
    return nota_do_quadro(frame), detalhada


def nota_do_quadro(frame: str) -> str:
    # new DanfeNFCe('#danfe-nfce-container', '/nfeweb/imagens/', '<html da nota>') — a nota é o texto mais longo
    m = re.search(r"new DanfeNFCe\((.*?)\)\s*;?\s*</script>", frame, re.S)
    args = re.findall(r"'((?:[^'\\]|\\.)*)'", m.group(1), re.S) if m else []
    nota = max(args, key=len) if args else ""
    if "<" not in nota:
        raise Falha("A SEFAZ abriu a página, mas sem os dados do cupom. Tente de novo mais tarde.")
    return js_string(nota)


def ler_detalhada(det: str) -> list[dict[str, Any]]:
    """Versão detalhada da NFC-e: por item, na ordem da nota, o código da loja, o código de barras (EAN) e o NCM."""
    t = html.unescape((det or "").replace("\\/", "/").replace('\\"', '"'))
    rot = lambda nome: [txt(v) for v in re.findall(rf"(?s)<label>\s*{nome}\s*</label>\s*<span>(.*?)</span>", t)]
    cods, eans, ncms = rot("Código do Produto"), rot("Código EAN Comercial"), rot("Código NCM")
    out = []
    for n, cod in enumerate(cods):
        e = re.sub(r"\D", "", eans[n]) if n < len(eans) else ""
        out.append({"codigo": re.sub(r"\D", "", cod), "ean": e if gtin_valido(e) else None,
                    "ncm": re.sub(r"\D", "", ncms[n]) if n < len(ncms) else None})
    return out


def aplicar_detalhada(itens: list[dict[str, Any]], det: list[dict[str, Any]]) -> int:
    """Põe o código de barras/NCM nos itens. Só quando a ordem e o código da loja conferem. Devolve quantos ganharam EAN."""
    if not det or len(det) != len(itens):
        return 0
    n = 0
    for i, d in zip(itens, det):
        if d["codigo"] and i.get("codigo") and d["codigo"] != i["codigo"]:
            return 0  # não bateu a ordem: não arrisca
    for i, d in zip(itens, det):
        if d["ncm"]:
            i["ncm"] = d["ncm"]
        if d["ean"] and not i.get("ean"):
            i["ean"] = d["ean"]
            n += 1
    return n


def ler_pagamentos_detalhada(det: str) -> list[dict[str, Any]]:
    """Formas de pagamento da versão detalhada: meio, valor e bandeira do cartão (quando houver)."""
    t = html.unescape((det or "").replace("\\/", "/").replace('\\"', '"'))
    sec = re.search(r"(?s)Formas de Pagamento</legend>(.*?)</fieldset>", t)
    out = []
    for b in re.split(r'<table class="toggle box">', sec[1] if sec else "")[1:]:
        sp = [txt(s) for s in re.findall(r"(?s)<span>(.*?)</span>", b)]
        if len(sp) < 3:
            continue
        out.append({"forma": re.sub(r"^\d+\s*-\s*", "", limpar_pag(sp[1])), "valor": num(sp[2]),
                    "bandeira": nome_bandeira(sp[5] if len(sp) > 5 else "")})
    return out


def aplicar_pagamentos(pgs: list[dict[str, Any]], det: list[dict[str, Any]]) -> int:
    """Põe a bandeira nos pagamentos da nota quando a detalhada confere (mesma ordem e valores)."""
    if not det or len(det) != len(pgs) or any(abs((a.get("valor") or 0) - (b["valor"] or 0)) > 0.009 for a, b in zip(pgs, det)):
        return 0
    n = 0
    for a, b in zip(pgs, det):
        if b["bandeira"] and a.get("bandeira") != b["bandeira"]:
            a["bandeira"] = b["bandeira"]
            n += 1
    return n


def ler_tributos(t: str) -> float | None:
    """Lei 12.741: "FEDERAL R$ 11,51 ESTADUAL R$ 9,75 MUNICIPAL R$ 0,00" ou "Tributos Totais Incidentes (Lei Federal 127412012) 34,7"."""
    partes = [re.search(rf"(?i)\b{n}\s*R\$\s*([\d.,]+)", t) for n in ("FEDERAL", "ESTADUAL", "MUNICIPAL")]
    if any(partes):
        return round(sum(num(p[1]) or 0 for p in partes if p), 2)
    m = re.search(r"(?i)tributos totais incidentes\s*\([^)]*\)\s*:?\s*R?\$?\s*([\d.,]+)", t)
    return num(m[1]) if m else None


def ler_nota(h: str, chave: str) -> dict[str, Any]:
    # Corta os dados do consumidor antes de qualquer coisa (não gravar nome/CPF/endereço).
    h = re.sub(r"(?s)<h4>\s*Consumidor\s*</h4>.*?</ul>", "", h)

    loja_nome = txt((re.search(r'(?s)class="txtTopo"[^>]*>(.*?)</div>', h) or [None, ""])[1])
    textos = [txt(t) for t in re.findall(r'(?s)<div class="text">(.*?)</div>', h)]
    cnpj = next((re.sub(r"\D", "", t) for t in textos if "CNPJ" in t.upper()), "")
    endereco = next((re.sub(r"\s*,\s*(,\s*)*", ", ", t).strip(", ") for t in textos if "CNPJ" not in t.upper()), "")
    partes = [p.strip() for p in endereco.split(",") if p.strip()]
    cidade = partes[-2] if len(partes) >= 2 else ""
    uf = partes[-1] if partes else ""

    itens = []
    for n, tr in enumerate(re.findall(r'(?s)<tr id="Item[^"]*">(.*?)</tr>', h), 1):
        desc = txt((re.search(r'(?s)class="txtTit"[^>]*>(.*?)</span>', tr) or [None, ""])[1])
        cod = re.sub(r"\D", "", txt((re.search(r'(?s)class="RCod"[^>]*>(.*?)</span>', tr) or [None, ""])[1]))
        qtd = num(re.sub(r"[^\d,.]", "", txt((re.search(r'(?s)class="Rqtd"[^>]*>(.*?)</span>', tr) or [None, ""])[1])))
        un = txt((re.search(r'(?s)class="RUN"[^>]*>(.*?)</span>', tr) or [None, ""])[1]).replace("UN:", "").strip()
        unit = num(re.sub(r"[^\d,.]", "", txt((re.search(r'(?s)class="RvlUnit"[^>]*>(.*?)</span>', tr) or [None, ""])[1]).replace("Vl. Unit.:", "")))
        total = num(txt((re.search(r'(?s)class="valor"[^>]*>(.*?)</span>', tr) or [None, ""])[1]))
        promo = bool(re.match(r"PROM\b", desc, re.I))
        itens.append({
            "n": n,
            "descricao": re.sub(r"^PROM\s+", "", desc, flags=re.I),
            "codigo": cod,
            "ean": cod if gtin_valido(cod) else None,
            "qtd": qtd, "un": un.upper(), "unit": unit, "total": total, "promo": promo,
        })

    tot = {}
    for lab, val in re.findall(r'(?s)<label[^>]*>(.*?)</label>\s*<span class="totalNumb[^"]*">(.*?)</span>', h):
        tot[txt(lab).rstrip(":").strip()] = txt(val)
    pagamentos = []
    forma = re.search(r'(?s)id="linhaForma".*?</div>(.*)', h)
    if forma:
        for lab, val in re.findall(r'(?s)<label class="tx">(.*?)</label>\s*<span class="totalNumb">(.*?)</span>', forma.group(1)):
            lab_t = txt(lab)
            if lab_t.lower().startswith("troco"):
                continue
            pagamentos.append({"forma": lab_t, "valor": num(txt(val))})

    info = txt((re.search(r"(?s)<h4>Informa[^<]*gerais da Nota</h4>(.*?)</ul>", h) or [None, ""])[1])
    numero = (re.search(r"Número:\s*(\d+)", info) or [None, ""])[1]
    serie = (re.search(r"Série:\s*(\d+)", info) or [None, ""])[1]
    em = re.search(r"Emissão:\s*(\d{2})/(\d{2})/(\d{4})\s+(\d{2}:\d{2}:\d{2})", info)
    emissao = f"{em[3]}-{em[2]}-{em[1]}T{em[4]}-03:00" if em else None
    tributos = ler_tributos(txt(h))

    valor_total = num(tot.get("Valor total R$", "")) or num(tot.get("Valor a pagar R$", ""))
    valor_pagar = num(tot.get("Valor a pagar R$", "")) or valor_total
    desconto = num(tot.get("Descontos R$", "")) or 0.0

    if not itens or valor_pagar is None:
        raise Falha("Abri o cupom, mas não consegui ler os itens. Me avise para eu ajustar a leitura.")

    soma = round(sum(i["total"] or 0 for i in itens), 2)
    return {
        "loja": {"nome": loja_nome, "cnpj": cnpj, "cidade": cidade, "uf": uf},
        "numero": numero, "serie": serie, "emissao": emissao,
        "itens": itens,
        "qtd_itens": len(itens),
        "valor_produtos": valor_total,
        "desconto": desconto,
        "valor_pago": valor_pagar,
        "pagamentos": pagamentos,
        "tributos": tributos,
        "conferencia": {"soma_itens": soma, "bate": abs(soma - (valor_total or 0)) < 0.05},
    }
