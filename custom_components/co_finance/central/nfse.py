"""Leitor da NFS-e (nota de serviço: PDF, XML, ISSnet) e texto de PDF."""
from __future__ import annotations

import html
import re
from typing import Any

from .base import Falha, fmt_brl, norm_txt, num, txt
from .copia import _sem_codigo


def _str_pdf(s: bytes) -> str:
    """Literal de string do PDF "( ... )" com escapes → texto (WinAnsi ~ cp1252)."""
    out = bytearray()
    esc = {ord("n"): 10, ord("r"): 13, ord("t"): 9, ord("b"): 8, ord("f"): 12, ord("("): 40, ord(")"): 41, 0x5C: 0x5C}
    i = 0
    while i < len(s):
        c = s[i]
        if c == 0x5C and i + 1 < len(s):
            n = s[i + 1]
            if n in esc:
                out.append(esc[n]); i += 2; continue
            m = re.match(rb"[0-7]{1,3}", s[i + 1:i + 4])
            if m:
                out.append(int(m[0], 8) & 255); i += 1 + len(m[0]); continue
            i += 2
            if n not in (10, 13):
                out.append(n)
            continue
        out.append(c); i += 1
    return out.decode("cp1252", "replace")


def texto_pdf(dados: bytes) -> str:
    """Texto de um PDF simples (fontes WinAnsi): um bloco BT…ET por linha."""
    import zlib
    linhas = []
    for st in re.findall(rb"stream\r?\n(.*?)\r?\nendstream", dados, re.S):
        try:
            conteudo = zlib.decompress(st)
        except Exception:
            continue
        for bloco in re.findall(rb"\bBT\b(.*?)\bET\b", conteudo, re.S):  # \b: "PRETA" não fecha o bloco
            partes = []
            for m in re.finditer(rb"\((?:\\.|[^\\)])*\)|\[(?:\\.|[^\]])*\]\s*TJ|T\*", bloco, re.S):
                tok = m[0]
                if tok.startswith(b"("):
                    partes.append(_str_pdf(tok[1:-1]))
                elif tok.startswith(b"["):
                    partes.append("".join(_str_pdf(x[1:-1]) for x in re.findall(rb"\((?:\\.|[^\\)])*\)", tok)))
                else:
                    partes.append("\n")
            t = "".join(partes).strip()
            if t:
                linhas.append(t)
    return "\n".join(linhas) or _texto_pdf_fontes(dados)


def _inflar(s: bytes) -> bytes:
    import zlib
    try:
        return zlib.decompress(s)
    except Exception:
        pass
    try:  # PDFsharp (DANFSe do portal nacional) grava a soma de conferência errada: lê o deflate cru
        return zlib.decompressobj(-15).decompress(s[2:])
    except Exception:
        return b""


def _cmap(data: bytes) -> dict[int, str]:
    """Tabela ToUnicode da fonte: código do glifo → letra."""
    mp: dict[int, str] = {}
    for blk in re.findall(rb"beginbfchar(.*?)endbfchar", data, re.S):
        for a, b in re.findall(rb"<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>", blk):
            mp[int(a, 16)] = bytes.fromhex(b.decode()).decode("utf-16-be", "replace")
    for blk in re.findall(rb"beginbfrange(.*?)endbfrange", data, re.S):
        for a, b, c in re.findall(rb"<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>", blk):
            base = int(c, 16)
            for i, g in enumerate(range(int(a, 16), int(b, 16) + 1)):
                mp[g] = chr(base + i)
    return mp


_TOK_PDF = re.compile(rb"/([A-Za-z]\w*)\s+[\d.]+\s+Tf|([-\d.]+)\s+([-\d.]+)\s+T[dD]|T\*|"
                      rb"\((?:\\.|[^\\)])*\)|<([0-9A-Fa-f\s]*)>|\[(.*?)\]\s*TJ", re.S)


def _texto_pdf_fontes(dados: bytes) -> str:
    """Plano B do texto_pdf: fontes Identity-H com ToUnicode ("Microsoft Print to PDF"), texto em <hex> e
    compactação com a soma errada (PDFsharp). Mudança de linha (Td com y) vira quebra; avanço na linha, espaço."""
    objs = {int(m[1]): m[2] for m in re.finditer(rb"(\d+)\s+0\s+obj(.*?)endobj", dados, re.S)}

    def stream(body: bytes) -> bytes:
        m = re.search(rb"stream\r?\n(.*?)\r?\nendstream", body, re.S)
        if not m:
            return b""
        return _inflar(m[1]) if b"FlateDecode" in body[:m.start()] else m[1]

    fontes: dict[bytes, dict[int, str] | None] = {}
    for body in objs.values():
        for nome, ref in re.findall(rb"/([A-Za-z]\w*)\s+(\d+)\s+0\s+R", body):
            fb = objs.get(int(ref), b"")
            if b"/Type/Font" not in fb.replace(b" ", b"") or nome in fontes:
                continue
            tu = re.search(rb"/ToUnicode\s+(\d+)\s+0\s+R", fb)
            fontes[nome] = _cmap(stream(objs.get(int(tu[1]), b""))) if tu and b"Identity-H" in fb else None

    linhas = []
    for body in objs.values():
        sem_esp = body.replace(b" ", b"")
        if b"stream" not in body or b"/Subtype/Image" in sem_esp or b"/Length1" in sem_esp:
            continue
        c = stream(body)
        if b"BT" not in c:
            continue
        for bloco in re.findall(rb"\bBT\b(.*?)\bET\b", c, re.S):
            mp: dict[int, str] | None = None
            partes, atual = [], ""

            def pedaco(raw: bytes, hexa: bool) -> str:
                if not hexa:
                    return _str_pdf(raw)
                h = re.sub(rb"\s", b"", raw)
                if mp:
                    return "".join(mp.get(int(h[i:i + 4], 16), "") for i in range(0, len(h) - 3, 4))
                try:
                    return bytes.fromhex(h.decode()).decode("cp1252", "replace")
                except ValueError:
                    return ""

            for m in _TOK_PDF.finditer(bloco):
                tok = m[0]
                if m[1]:
                    mp = fontes.get(m[1])
                elif m[2] is not None:
                    if float(m[3] or 0) != 0:
                        partes.append(atual)
                        atual = ""
                    elif atual and not atual.endswith(" "):
                        atual += " "
                elif tok == b"T*":
                    partes.append(atual)
                    atual = ""
                elif tok.startswith(b"("):
                    atual += pedaco(tok[1:-1], False)
                elif m[4] is not None:
                    atual += pedaco(m[4], True)
                elif m[5] is not None:
                    for x in re.finditer(rb"\((?:\\.|[^\\)])*\)|<([0-9A-Fa-f\s]*)>", m[5]):
                        atual += pedaco(x[1], True) if x[0].startswith(b"<") else pedaco(x[0][1:-1], False)
            partes.append(atual)
            t = "\n".join(x.strip() for x in partes if x.strip())
            if t:
                linhas.append(t)
    return "\n".join(linhas)


_DANFSE_LINK = re.compile(r"(?:https?://(?:www\.)?nfse\.gov\.br)?/ConsultaPublica/Download/DANFSe\?chave=[^\"'\s<>]+", re.I)


def link_danfse(conteudo: str) -> str | None:
    """Link "Download DANFS-e" do portal nacional da NFS-e numa página compartilhada pelo Safari (a página da consulta
    ou o próprio PDF aberto no Safari, que o Atalho manda como página). Só nfse.gov.br."""
    m = _DANFSE_LINK.search(html.unescape(conteudo or ""))
    if not m:
        return None
    u = m[0]
    return u if u.lower().startswith("http") else "https://www.nfse.gov.br" + u


def baixar_danfse(url: str) -> bytes:
    """O PDF do link de download abre sem captcha (a chave do link já vem cifrada pelo portal)."""
    import urllib.error
    import urllib.request
    from .config import TIMEOUT, UA
    if not re.match(r"https://(?:www\.)?nfse\.gov\.br/", url, re.I):
        raise Falha("Esse link não é do portal da NFS-e.")
    try:
        r = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/pdf"}),
                                   timeout=TIMEOUT)
        dados = r.read(5_000_000)
    except urllib.error.HTTPError as e:
        raise Falha(f"O portal da NFS-e respondeu com erro {e.code}. Tente de novo mais tarde.") from e
    except Exception as e:
        raise Falha("Não consegui falar com o portal da NFS-e agora. Tente de novo mais tarde.") from e
    if not dados.startswith(b"%PDF"):
        raise Falha("O portal da NFS-e não devolveu o PDF da nota. Abra a nota de novo e compartilhe.")
    return dados


def _ler_nfse_nacional(t: str) -> tuple[str, dict[str, Any]]:
    """DANFSe do padrão nacional (nfse.gov.br): PDF oficial do portal ou impressão da página.
    Número, CNPJ e município saem da chave de acesso (50 dígitos): a impressão da página troca os rótulos de lugar."""
    t = re.sub(r"NFS-\s+e", "NFS-e", t)
    # chave: município(7) ambiente(1) tipo de inscrição(1) CNPJ(14) número(13) AAMM(4) código(9) DV(1)
    ch = re.search(r"(?<!\d)(\d{7})\d(\d)(\d{14})(\d{13})(\d{4})(\d{9})(\d)(?!\d)", t)
    if not ch:
        raise Falha("Abri a NFS-e, mas não achei a chave de acesso. Me avise para eu ajustar a leitura.")
    cod_mun, cnpj, numero = ch[1], ch[3], str(int(ch[4]))
    um = lambda rx: (re.search(rx, t, re.S | re.I) or [None, None])[1]
    nome = um(r"PRESTADOR\s*/\s*FORNECEDOR.*?Nome\s*/\s*Nome Empresarial\s*\n\s*([^\n]+)")
    if not nome:  # impressão da página: o nome do prestador fica solto, em caixa alta
        nome = um(r"(?m)^((?:[A-ZÀ-Ú]+ )*(?:ASSOCIA\w*|LTDA|S/?A|EIRELI|CLINICA|CLÍNICA|LABORAT\w*|INSTITUTO|"
                  r"FUNDA\w*|HOSPITAL|COLEGIO|COLÉGIO|ESCOLA)\b[A-ZÀ-Ú ./&-]*)$") or ""
    nome = re.sub(r"\s+", " ", nome or "").strip() or f"Prestador {cnpj}"
    quando = um(r"EMISS[ÃA]O DA NFS-e\s*\n\s*(\d{2}/\d{2}/\d{4} \d{2}:\d{2}:\d{2})") or um(r"(\d{2}/\d{2}/\d{4} \d{2}:\d{2}:\d{2})")
    valor = num(um(r"VALOR L[ÍI]QUIDO DA NFS-e\s*\n\s*R\$\s*([\d.,]+)") or um(r"VALOR DA OPERA[ÇC][ÃA]O\s*/\s*SERVI[ÇC]O\s*\n\s*R\$\s*([\d.,]+)")
                or um(r"Valor do Servi[çc]o\s*\n\s*R\$\s*([\d.,]+)") or "")
    if not valor:
        raise Falha("Abri a NFS-e, mas não achei o valor. Me avise para eu ajustar a leitura.")
    disc = um(r"Descri[çc][ãa]o do Servi[çc]o\s*\n\s*([^\n]+)") or "Serviço"
    # quem foi atendido ("RF MARIA…", "PACIENTE: …") é dado pessoal: fica só na cópia da nota
    disc = re.sub(r"(?i)\s*(?:\bR\s*F\b|REF\.?|REFERENTE A|PACIENTE:?)\s*[A-ZÀ-Ú][A-ZÀ-Ú ]+$", "", disc)
    disc = re.sub(r"(?<=[A-Z])RF [A-ZÀ-Ú ]+$", "", disc)  # PDF oficial cola "COLETARF MARIA…"
    disc = re.sub(r"\s+", " ", disc).strip(" -/") or "Serviço"
    m = re.match(r"(\d{2})/(\d{2})/(\d{4}) (\d{2}:\d{2}:\d{2})", quando or "")
    emissao = f"{m[3]}-{m[2]}-{m[1]}T{m[4]}-03:00" if m else None
    valor = round(valor, 2)
    item = {"n": 1, "descricao": disc[:200], "codigo": "", "ean": None, "ncm": None, "qtd": 1.0, "un": "SV",
            "unit": valor, "total": valor, "promo": False}
    return f"NFSE{cnpj}{int(numero):010d}", {
        "loja": {"nome": nome, "cnpj": cnpj, "cidade": MUNICIPIOS.get(cod_mun, ""), "uf": {"52": "GO", "53": "DF", "35": "SP", "33": "RJ", "31": "MG"}.get(cod_mun[:2], "")},
        "modelo": "nfse", "numero": numero, "serie": "", "codigo_verificacao": ch[0], "emissao": emissao,
        "itens": [item], "qtd_itens": 1, "valor_produtos": 0.0, "servicos": valor, "frete": 0, "outras_despesas": 0,
        "ipi_st": 0, "desconto": 0.0, "valor_pago": valor, "pagamentos": [], "tributos": None, "cnae": "",
        "conferencia": {"soma_itens": valor, "bate": True},
    }


def ler_nfse_texto(t: str) -> tuple[str, dict[str, Any]]:
    """Campos da NFS-e (modelo de Goiânia) a partir do texto do PDF."""
    if re.search(r"DANFSe|portal nacional da NFS-?\s?e", t, re.I) and re.search(r"(?<!\d)\d{50}(?!\d)", t):
        return _ler_nfse_nacional(t)
    if "NFS-e" not in t or "PRESTADOR" not in t.upper():
        raise Falha("Esse PDF não parece uma nota fiscal de serviço (NFS-e).")
    um = lambda rx, g=1: (re.search(rx, t, re.S | re.I) or [None] * (g + 1))[g]
    prest = re.search(r"Recebi\(emos\) de (.+?),\s*CNPJ:\s*([\d./-]+)", t)
    nome, cnpj = (prest[1].strip(), re.sub(r"\D", "", prest[2])) if prest else ("", "")
    if not cnpj:
        cnpj = re.sub(r"\D", "", um(r"PRESTADOR.*?(\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2})") or um(r"(\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2})") or "")
    topo = re.search(r"(\d+)\s+(\d+)\s+(\d{2}/\d{2}/\d{4})\s+(\d+)\s+(\d{2}/\d{2}/\d{4} \d{2}:\d{2}:\d{2})\s+([A-Z0-9]{6,12})\b", t)
    # Goiânia: bloco do topo; Brasília e outros: "18787 / Número da NFS-e", "Código de Verificação / AE56041F6"
    numero = topo[4] if topo else (um(r"(\d+)\s*\n\s*N[úu]mero da NFS-e") or um(r"N[úu]mero (?:da )?NFS-e\D{0,40}?(\d+)") or "")
    quando = topo[5] if topo else (um(r"(\d{2}/\d{2}/\d{4} \d{2}:\d{2}:\d{2})") or "")
    codigo = topo[6] if topo else (um(r"C[óo]digo de Verifica[çc][ãa]o\s*\n?\s*([A-Z0-9]{6,12})\b") or "")
    if not nome:
        nome = (re.search(r"(?m)^(.+?\b(?:LTDA|S/?A|S\.A\.?|EIRELI|EPP|ME)\b\.?)\s*$", t) or [None, ""])[1].strip()
    if not (cnpj and numero):
        raise Falha("Abri o PDF, mas não achei o prestador e o número da nota. Me avise para eu ajustar a leitura.")
    valor = num(um(r"VALOR TOTAL DA (?:NFS-e|NOTA)\s*=?\s*R\$\s*([\d.,]+)") or um(r"R\$\s*([\d.,]+)\s*VALOR TOTAL DA NFS-e") or "")
    linhas_srv = re.findall(r"(?m)^\s*\d{4,}\s*-\s*(.+?)\s*=\s*[\d.]*\d,\d{2}\s*$", t)
    disc = " / ".join(x.strip() for x in linhas_srv) or um(r"DISCRIMINA[ÇC][ÃA]O DOS SERVI[ÇC]OS\s*(.*?)\s*(?:R\$|VALOR TOTAL)") or "Serviço"
    disc = re.sub(r"\s+", " ", disc).strip(" /")
    aliq = num(um(r"\b(\d{1,2},\d{4})\b") or "")
    mc = re.search(r"([A-ZÀ-Ú][A-ZÀ-Ú ]+?)\s*/\s*([A-Z]{2})\b", t)
    cidade, uf = (mc[1], mc[2]) if mc else ("", "")
    cnae = um(r"CNAE:\s*(\d{4,7})") or ""
    m = re.match(r"(\d{2})/(\d{2})/(\d{4}) (\d{2}:\d{2}:\d{2})", quando or "")
    emissao = f"{m[3]}-{m[2]}-{m[1]}T{m[4]}-03:00" if m else None
    valor = round(valor or 0, 2)
    item = {"n": 1, "descricao": disc[:200], "codigo": "", "ean": None, "ncm": None, "qtd": 1.0, "un": "SV",
            "unit": valor, "total": valor, "promo": False}
    chave = f"NFSE{cnpj}{int(numero):010d}"
    return chave, {
        "loja": {"nome": nome, "cnpj": cnpj, "cidade": (cidade or "").strip().upper(), "uf": uf or ""},
        "modelo": "nfse", "numero": numero, "serie": "", "codigo_verificacao": codigo, "emissao": emissao,
        "itens": [item], "qtd_itens": 1, "valor_produtos": 0.0, "servicos": valor, "frete": 0, "outras_despesas": 0,
        "ipi_st": 0, "desconto": 0.0, "valor_pago": valor, "pagamentos": [],
        "tributos": round(valor * aliq / 100, 2) if aliq else None, "cnae": cnae,
        "conferencia": {"soma_itens": valor, "bate": True},
    }


MUNICIPIOS = {"5300108": "BRASILIA", "5208707": "GOIANIA", "3550308": "SAO PAULO", "3304557": "RIO DE JANEIRO",
              "3106200": "BELO HORIZONTE", "5201405": "APARECIDA DE GOIANIA", "5201108": "ANAPOLIS"}


def ler_nfse_xml(x: str) -> tuple[str, dict[str, Any]]:
    """XML de NFS-e no padrão ABRASF (CompNfse/Nfse/InfNfse). Lido campo a campo com regex: alguns sistemas
    gravam nomes de campo com caractere inválido (ex.: "Munic?pio"), o que quebraria um leitor de XML."""
    def tag(nome: str, txt: str = x) -> str:
        m = re.search(rf"<(?:\w+:)?{nome}\b[^>]*>(.*?)</(?:\w+:)?{nome}>", txt, re.S)
        return html.unescape(m[1].strip()) if m else ""

    inf = tag("InfNfse") or x
    numero, codigo = tag("Numero", inf), tag("CodigoVerificacao", inf)
    prest_srv = tag("PrestadorServico", inf)
    prest = tag("Prestador", inf)
    cnpj = re.sub(r"\D", "", tag("Cnpj", prest) or tag("Cnpj", prest_srv) or tag("CpfCnpj", prest))
    if not (numero and cnpj):
        raise Falha("Esse XML não parece uma nota de serviço (NFS-e) que eu saiba ler.")
    servico = tag("Servico", inf)
    valores = tag("ValoresNfse", inf)
    fnum = lambda v: round(float(v), 2) if re.fullmatch(r"-?\d+(\.\d+)?", v or "") else None
    total = fnum(tag("ValorServicos", servico)) or fnum(tag("BaseCalculo", valores)) or 0.0
    desc = fnum(tag("DescontoIncondicionado", servico)) or 0.0
    liquido = fnum(tag("ValorLiquidoNfse", valores)) or round(total - desc, 2)
    disc = tag("Discriminacao", servico)
    parte_itens = disc.split("||")[0]
    itens = []
    for m in re.finditer(r"(\d{4,})\s*-\s*(.+?)\s*=\s*([\d.]*\d,\d{2})", parte_itens):
        v = num(m[3]) or 0.0
        itens.append({"n": len(itens) + 1, "descricao": re.sub(r"\s+", " ", m[2]).strip(), "codigo": m[1].lstrip("0") or m[1],
                      "ean": None, "ncm": None, "qtd": 1.0, "un": "SV", "unit": v, "total": round(v, 2), "promo": False})
    if not itens:
        d = re.sub(r"\s+", " ", parte_itens).strip(" /|") or "Serviço"
        itens = [{"n": 1, "descricao": d[:200], "codigo": "", "ean": None, "ncm": None, "qtd": 1.0, "un": "SV",
                  "unit": total, "total": total, "promo": False}]
    pags = []
    fp = re.findall(r"Forma de Pagamento:\s*(.*?)(?=Forma de Pagamento:|,|\||$)", disc)
    meio = next((f.strip() for f in fp if f.strip() and not re.search(r"(?i)^(a vista|a prazo)$", f.strip())), "")
    if meio:
        pags = [{"forma": meio, "valor": liquido, "bandeira": None}]
    trib = re.search(r"Trib aprox R\$:\s*([\d.,]+)\s*Federal,\s*([\d.,]+)\s*Municipal", disc)
    tributos = round((num(trib[1]) or 0) + (num(trib[2]) or 0), 2) if trib else fnum(tag("ValorIss", valores))
    dt = tag("DataEmissao", inf)
    emissao = (dt if re.search(r"[+-]\d{2}:\d{2}$", dt) else dt + "-03:00") if "T" in dt else (f"{dt}T00:00:00-03:00" if dt else None)
    cod_mun = tag("CodigoMunicipio", prest_srv) or tag("CodigoMunicipio", tag("OrgaoGerador", inf))
    uf = tag("Uf", prest_srv) or tag("Uf", tag("OrgaoGerador", inf))
    soma = round(sum(i["total"] for i in itens), 2)
    chave = f"NFSE{cnpj}{int(re.sub(r'\D', '', numero) or 0):010d}"
    return chave, {
        "loja": {"nome": tag("RazaoSocial", prest_srv) or tag("NomeFantasia", prest_srv), "cnpj": cnpj,
                 "cidade": MUNICIPIOS.get(cod_mun, ""), "uf": uf},
        "modelo": "nfse", "numero": numero, "serie": "", "codigo_verificacao": codigo, "emissao": emissao,
        "itens": itens, "qtd_itens": len(itens), "valor_produtos": 0.0, "servicos": total, "frete": 0, "outras_despesas": 0,
        "ipi_st": 0, "desconto": desc, "valor_pago": liquido, "pagamentos": pags, "tributos": tributos,
        "cnae": tag("CodigoCnae", servico),
        "conferencia": {"soma_itens": soma, "bate": abs(soma - total) < 0.05 and abs(total - desc - liquido) < 0.05},
    }


def ler_nfse_issnet(h: str) -> tuple[str, dict[str, Any]]:
    """NFS-e aberta no site ISSnet (DF: iss.fazenda.df.gov.br → Imprimir), campos <span id="lbl...">.
    Converte para o mesmo formato do XML ABRASF e reaproveita ler_nfse_xml."""
    lbl = lambda k: txt((re.search(rf'<span id="{k}"[^>]*>(.*?)</span>', h, re.S) or [None, ""])[1])
    dt = re.match(r"(\d{2})/(\d{2})/(\d{4}) (\d{2}:\d{2}:\d{2})", lbl("lblDataHoraEmissao"))
    v = lambda k: (num(lbl(k)) or 0)
    x = (f"<InfNfse><Numero>{lbl('lblNumNota')}</Numero><CodigoVerificacao>{lbl('lblCodigoVerificacao')}</CodigoVerificacao>"
         f"<DataEmissao>{f'{dt[3]}-{dt[2]}-{dt[1]}T{dt[4]}' if dt else ''}</DataEmissao>"
         f"<ValoresNfse><BaseCalculo>{v('lblBaseCalculo'):.2f}</BaseCalculo><ValorIss>{v('lblValorISS'):.2f}</ValorIss>"
         f"<ValorLiquidoNfse>{v('lblValorLiquido'):.2f}</ValorLiquidoNfse></ValoresNfse>"
         f"<PrestadorServico><RazaoSocial>{html.escape(lbl('lblNomeRazaoPrestador'))}</RazaoSocial>"
         f"<Uf>{lbl('lblUFPrestador')}</Uf><CodigoMunicipio>{issnet_municipio(h)}</CodigoMunicipio></PrestadorServico>"
         f"<Prestador><Cnpj>{re.sub(chr(92) + 'D', '', lbl('lblCpfCnpjPrestador'))}</Cnpj></Prestador>"
         f"<Servico><ValorServicos>{v('lblValorTotalNota'):.2f}</ValorServicos><DescontoIncondicionado>{v('lblDescIncond'):.2f}</DescontoIncondicionado>"
         f"<Discriminacao>{html.escape(lbl('lblDiscriminacaoServicos'))}</Discriminacao><CodigoCnae>{lbl('lblCodNacional')}</CodigoCnae></Servico></InfNfse>")
    return ler_nfse_xml(x)


def issnet_municipio(h: str) -> str:
    """Código IBGE do município da nota do ISSnet (cabeçalho "Prefeitura Municipal de Goiânia" ou o do prestador)."""
    cab = norm_txt(" ".join(re.findall(r'<span id="(?:lblCabMun|lblMunicipioPrestador)"[^>]*>(.*?)</span>', h, re.S)))
    return "5208707" if "GOIANIA" in cab else "5300108" if "BRASILIA" in cab or "DISTRITO FEDERAL" in cab else ""


def issnet_consulta(h: str) -> str:
    """Onde conferir a NFS-e do ISSnet (vai no topo da cópia)."""
    if issnet_municipio(h) == "5208707":
        return "www.issnetonline.com.br/goiania (Verificar Autenticidade, com o código de verificação)"
    return "iss.fazenda.df.gov.br (Verificar Autenticidade)"


# CSS só da nota do ISSnet: o site fixa a largura (380px) e corta textos longos; na cópia a nota usa a largura da folha
ISSNET_CSS = ("<style>.issnet #conteudo{width:auto!important;max-width:100%;overflow:visible!important;height:auto!important}"
              ".issnet #conteudo div{width:auto!important;white-space:normal!important;overflow:visible!important}"
              ".issnet table{max-width:100%;font-family:Arial,Helvetica,sans-serif}.issnet .tabelaMaeMain{margin-left:0!important;width:100%}"
              ".issnet table.teste{border:1px solid #000}"
              ".issnet .lbltopo{font-size:9px;padding:1px 4px 0;vertical-align:top}"
              ".issnet .lblDado,.issnet .lblDado2,.issnet .lblDado3,.issnet .lblDado4{font-size:13px;padding:0 4px 2px}"
              ".issnet .lblDadoDestacado,.issnet .lblDadoDestacado2{font-size:14px;font-weight:bold;text-align:center}</style>")


def copia_issnet(h: str) -> str:
    """Cópia da NFS-e do ISSnet: só a nota, sem código. Na página do QR Code (Goiânia) a nota está na div#conteudo
    (é o que o botão Imprimir do site imprime); na de Imprimir (DF), no documento da janela interna."""
    m = re.search(r'(?is)<div id="conteudo"[^>]*>.*?(?=<!--\s*Fim div conte)', h)
    if m and 'id="lblDiscriminacaoServicos"' in m[0]:
        return f'<section class="det issnet"><h2>NFS-e (site ISSnet)</h2>{ISSNET_CSS}{_sem_codigo(m[0])}</section>'
    docs = re.findall(r"(?is)<html\b.*?</html>", h)
    doc = next((d for d in reversed(docs) if 'id="lblDiscriminacaoServicos"' in d), h)
    corpo = re.sub(r"(?is)</?(html|head|body)\b[^>]*>", "", doc)
    corpo = re.sub(r'(?is)<div[^>]*class="modal[^"]*".*', "", corpo) if 'class="modal' in corpo and "lblDiscriminacaoServicos" in corpo.split('class="modal')[0] else corpo
    return f'<section class="det"><h2>NFS-e (site ISSnet)</h2>{_sem_codigo(corpo)}</section>'


def copia_nfse_xml(chave: str, nota: dict[str, Any], x: str) -> str:
    """Cópia legível da NFS-e (o XML original fica ao lado). Tomador (seus dados) só no XML."""
    e = html.escape
    lj = nota["loja"]
    lin = "".join(f"<tr><td>{e(i['descricao'])}</td><td>{fmt_brl(i['total'])}</td></tr>" for i in nota["itens"])
    disc = re.search(r"<(?:\w+:)?Discriminacao>(.*?)</", x, re.S)
    return (f'<section class="det"><h2>Nota fiscal de serviço (NFS-e) — do XML original</h2>'
            f"<fieldset><legend>Prestador</legend><b>{e(lj['nome'])}</b><br>CNPJ {e(lj['cnpj'])} · {e(lj['cidade'])}/{e(lj['uf'])}</fieldset>"
            f"<fieldset><legend>Nota</legend>NFS-e nº {e(nota['numero'])} · Código de verificação {e(nota.get('codigo_verificacao') or '')} · "
            f"Emissão {e(nota['emissao'] or '')}</fieldset>"
            f'<fieldset><legend>Serviços</legend><table class="tab">{lin}</table></fieldset>'
            f"<fieldset><legend>Discriminação</legend>{e(html.unescape(disc[1]) if disc else '')}</fieldset>"
            f"<fieldset><legend>Totais</legend>Serviços {fmt_brl(nota['servicos'])} · Descontos {fmt_brl(nota['desconto'])} · "
            f"<b>Total {fmt_brl(nota['valor_pago'])}</b> · Tributos aprox. {fmt_brl(nota['tributos'])}</fieldset>"
            f"<p><small>O XML original da NFS-e está guardado junto desta cópia: notas/{chave}.xml</small></p></section>")
