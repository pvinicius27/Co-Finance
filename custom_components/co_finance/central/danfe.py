"""Leitor do DANFE (PDF da NF-e de produto)."""
from __future__ import annotations

import re

from .base import Falha, num
from .nfe import achar_chave, chave_valida, valores_extras


def _chave_danfe(t: str) -> str | None:
    """A chave impressa em grupos ("3526 0762 ... 8985"), numa linha só; senão a busca geral."""
    for linha in t.splitlines():
        dig = re.sub(r"[\s.]", "", linha)
        if re.fullmatch(r"\d{44}", dig) and dig[20:22] in ("55", "65") and chave_valida(dig):
            return dig
    return achar_chave(t)


def e_danfe(t: str) -> bool:
    return bool(re.search(r"\bDANFE\b", t)) and not re.search(r"NFS-?e|DANFSE", t, re.I) and _chave_danfe(t) is not None


def ler_danfe_texto(t: str) -> tuple[str, dict[str, Any]]:
    chave = _chave_danfe(t)
    if not chave:
        raise Falha("Abri o PDF, mas não achei a chave de acesso da nota. Envie o XML ou use o atalho Ler Cupom → Nota Comum.")
    linhas = [x.strip() for x in t.splitlines() if x.strip()]
    plano = "\n".join(linhas)
    cnpj, aamm = chave[6:20], chave[2:6]
    nome = (re.search(r"RECEBEMOS DE\s+(.+?)\s+OS PRODUTOS", plano, re.S | re.I) or [None, ""])[1]
    nome = re.sub(r"\s+", " ", nome).strip()
    if not nome:  # sem canhoto: primeira linha com cara de razão social
        nome = (re.search(r"(?m)^(.+?\b(?:LTDA|S/?A|S\.A\.?|EIRELI|EPP|ME)\b\.?)\s*$", plano) or [None, ""])[1].strip()
    # cidade/UF do emitente: linha do endereço do canhoto/cabeçalho "…, Cidade, UF - CEP"
    mc = re.search(r",\s*([A-Za-zÀ-ú' ]+?),\s*([A-Z]{2})\s*-\s*CEP", plano)
    cidade, uf = (mc[1].strip().upper(), mc[2]) if mc else ("", "")
    # emissão: a primeira data do mês/ano da chave (com hora, se vier junto)
    emissao = None
    for m in re.finditer(r"(\d{2})/(\d{2})/(\d{4})(?:\s+(\d{2}:\d{2}:\d{2}))?", plano):
        if m[3][2:] + m[2] == aamm:
            emissao = f"{m[3]}-{m[2]}-{m[1]}T{m[4] or '12:00:00'}-03:00"
            break
    # itens: código, descrição (1–2 linhas), NCM (8), CST/CSOSN, CFOP, unidade, qtd, unitário, total
    dinheiro = r"\d{1,3}(?:\.\d{3})*,\d{2,10}"
    rx = re.compile(rf"(?m)^(\S*\d\S*)\s+(.+?(?:\n.+?)?)\s+(\d{{8}})\s+(\d{{2,4}})\s+([1-7]\d{{3}})\s+([A-Za-z][A-Za-z0-9.]{{0,5}})\s+"
                    rf"(\d+(?:[.,]\d+)*)\s+({dinheiro})\s+({dinheiro})")
    itens = []
    for m in rx.finditer(plano):
        itens.append({"n": len(itens) + 1, "descricao": re.sub(r"\s+", " ", m[2]).strip(), "codigo": m[1], "ean": None,
                      "ncm": m[3], "qtd": num(m[7]) or 1.0, "un": m[6].upper().rstrip("."), "unit": num(m[8]),
                      "total": round(num(m[9]) or 0, 2), "promo": False})
    soma = round(sum(i["total"] for i in itens), 2)
    # totais: valor logo depois do rótulo, ou o bloco de valores que vem depois de todos os rótulos (mesma ordem)
    rot = ["BASE DE CÁLCULO DO ICMS", "VALOR DO ICMS", "BASE DE CÁLCULO DO ICMS SUBSTITUIÇÃO", "VALOR DO ICMS SUBSTITUIÇÃO",
           "VALOR TOTAL DOS PRODUTOS", "VALOR DO FRETE", "VALOR DO SEGURO", "DESCONTO", "OUTRAS DESPESAS ACESSÓRIAS",
           "VALOR DO IPI", "VALOR TOTAL DA NOTA"]
    tot: dict[str, float | None] = {}
    i = next((k for k, x in enumerate(linhas) if x.upper() == "VALOR TOTAL DA NOTA"), None)
    if i is not None and i > 0 and linhas[i - 1].upper() in rot:
        # rótulos todos juntos e depois os valores (a ordem dos valores nem sempre é a dos rótulos)
        while i + 1 < len(linhas) and linhas[i + 1].upper() in rot:
            i += 1
        vals = []
        for x in linhas[i + 1:]:
            if not re.fullmatch(dinheiro, x):
                break
            vals.append(num(x))
        if vals:
            tot["VALOR TOTAL DA NOTA"] = max(vals)
            tot["VALOR TOTAL DOS PRODUTOS"] = soma if soma in vals else None
    else:  # cada rótulo com o valor logo abaixo
        for r in rot:
            m = re.search(rf"(?m)^{re.escape(r)}\s*\n({dinheiro})$", plano, re.I)
            if m:
                tot[r] = num(m[1])
    vnf = tot.get("VALOR TOTAL DA NOTA")
    if not itens or vnf is None:
        raise Falha("Abri o DANFE, mas não consegui ler os itens e o total. Envie o XML da nota (vem no mesmo e-mail).")
    extras = valores_extras(tot.get("VALOR TOTAL DOS PRODUTOS"), 0, tot.get("VALOR DO FRETE"),
                            (tot.get("VALOR DO SEGURO") or 0) + (tot.get("OUTRAS DESPESAS ACESSÓRIAS") or 0),
                            tot.get("DESCONTO") or 0.0, vnf, soma,
                            (tot.get("VALOR DO IPI") or 0) + (tot.get("VALOR DO ICMS SUBSTITUIÇÃO") or 0))
    if not extras["conferencia"]["bate"] and abs(soma - vnf) < 0.05:
        extras["conferencia"]["bate"] = True  # totais embaralhados no PDF, mas itens = total da nota
    trib = re.search(r"Tributos aproximados:?\s*R\$\s*([\d.,]+)\s*\(Federal\)\s*e\s*R\$\s*([\d.,]+)\s*\(Estadual\)", plano, re.I)
    return chave, {
        "loja": {"nome": nome, "cnpj": cnpj, "cidade": cidade, "uf": uf},
        "modelo": chave[20:22], "numero": str(int(chave[25:34])), "serie": str(int(chave[22:25])), "emissao": emissao,
        "itens": itens, "qtd_itens": len(itens), **extras, "valor_pago": round(vnf, 2), "pagamentos": [],
        "tributos": round((num(trib[1]) or 0) + (num(trib[2]) or 0), 2) if trib else None,
    }
