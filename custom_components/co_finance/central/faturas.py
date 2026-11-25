"""Faturas de cartão (PDF): o card tira as linhas de texto com o pdf.js e o HA lê só os lançamentos.

Entra: lista de linhas [página, x, y, texto], na ordem do PDF. Sai: a fatura com vencimento, fechamento, total
e as linhas (data, descrição, parcela, valor, final do cartão). Nome, CPF, endereço, limite e código de barras
não saem daqui: cada banco tem um leitor que só pega o que tem formato de lançamento, e `_sem_pessoal` recusa
a fatura se sobrar algo com cara de dado pessoal.
"""
from __future__ import annotations

import re
import unicodedata
from datetime import date, timedelta
from typing import Any

from .base import Falha

MESES = {"JAN": 1, "FEV": 2, "MAR": 3, "ABR": 4, "MAI": 5, "JUN": 6, "JUL": 7, "AGO": 8, "SET": 9, "OUT": 10, "NOV": 11, "DEZ": 12}
COMO_SS = {"1": "chip", "2": "online", "3": "aproximação"}  # ícone antes da data na fatura do Santander
_VALOR = r"-?\d{1,3}(?:\.\d{3})*,\d{2}"


def _valor(s: str) -> float:
    s = re.sub(r"[\sR$]", "", s or "")
    return round(float(s.replace(".", "").replace(",", ".")), 2)


def _iso(d: str) -> str:  # "16/05/2026" ou "16/05/26"
    dd, mm, aa = re.sub(r"\s", "", d).split("/")
    return f"{int(aa) + 2000 if len(aa) == 2 else int(aa):04d}-{int(mm):02d}-{int(dd):02d}"


def _dia(dd: int, mm: int, vence: str) -> str:
    """Data do lançamento (a fatura só traz dia/mês): mês depois do vencimento é do ano anterior."""
    v = date.fromisoformat(vence)
    return f"{v.year - 1 if mm > v.month else v.year:04d}-{mm:02d}-{dd:02d}"


def _tipo(desc: str, valor: float, secao: str = "") -> str:
    d = _sem_acento(desc).upper()
    if re.search(r"PAGAMENTO|PAGTO|PGTO", d.replace(" ", "")) and valor < 0:  # Itaú: "PAG AM ENT O PIX"
        return "pagamento"
    if d.startswith("IOF") or "IOF " in d:
        return "iof"
    if re.search(r"\bJUROS\b|ENCARGO|MULTA", d):
        return "juros"
    if "ANUIDADE" in d or re.search(r"\bTARIFA\b", d):
        return "anuidade"
    if valor < 0:
        return "estorno"
    return "compra"


def _sem_acento(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s or "") if unicodedata.category(c) != "Mn")


def _linha(data: str, desc: str, valor: float, final: str, **extra: Any) -> dict[str, Any]:
    desc = re.sub(r"\+?\d[\d .*/-]{6,}\d", "#", desc)  # telefone, agência, conta: número longo não fica
    desc = re.sub(r"\s+", " ", desc).strip()
    return {"data": data, "descricao": desc, "parcela": extra.get("parcela"), "valor": valor,
            "usd": extra.get("usd"), "final": final, "tipo": extra.get("tipo") or _tipo(desc, valor),
            "como": extra.get("como")}


def _primeira_data(linhas, pag: int = 1) -> str | None:
    for p, _x, _y, t in linhas:
        if p == pag and re.fullmatch(r"\d{2}/\d{2}/\d{4}", t.strip()):
            return _iso(t.strip())
    return None


def _achar(linhas, rx: str, g: int = 1) -> str | None:
    for _p, _x, _y, t in linhas:
        m = re.search(rx, t)
        if m:
            return m[g]
    return None


# ---------------------------------------------------------------- Santander
def _ler_santander(L) -> dict[str, Any]:
    vence = _primeira_data(L)
    per = _achar(L, r"Esta Fatura\s+(\d{2}/\d{2}/\d{2})\s+a\s+(\d{2}/\d{2}/\d{2})", 0)
    ini, fim = re.findall(r"\d{2}/\d{2}/\d{2}", per) if per else (None, None)
    total = _achar(L, rf"\(=\) Saldo Desta Fatura\s+({_VALOR})")
    anterior = _achar(L, rf"^Saldo Anterior\s+({_VALOR})")
    out, subtot, final, dentro, ult = [], {}, "", False, None
    for _p, _x, _y, t in L:
        t = t.strip()
        if t.startswith("Detalhamento da Fatura"):
            dentro = True
            continue
        if not dentro:
            continue
        if t.startswith("Resumo da Fatura"):
            dentro = False
            continue
        m = re.search(r"- \d{4} XXXX XXXX (\d{4})$", t)
        if m:
            final = m[1]
            continue
        m = re.fullmatch(rf"VALOR TOTAL\s+({_VALOR})(?:\s+{_VALOR})?", t)
        if m:
            subtot[final] = round(subtot.get(final, 0) + _valor(m[1]), 2)
            continue
        m = re.fullmatch(rf"IOF DESPESA NO EXTERIOR\s+({_VALOR})", t)
        if m and ult:
            out.append(_linha(ult["data"], "IOF DESPESA NO EXTERIOR", _valor(m[1]), final, tipo="iof"))
            continue
        m = re.fullmatch(r"COTA[ÇC][ÃA]O DOLAR R\$\s*([\d,]+)", t)
        if m and ult:
            ult["cotacao"] = _valor(m[1])
            continue
        m = re.fullmatch(rf"(?:([123])\s+)?(\d{{2}})/(\d{{2}})\s+(.+?)(?:\s+(\d{{2}}/\d{{2}}))?\s+({_VALOR})(?:\s+({_VALOR}))?", t)
        if m:
            ult = _linha(_dia(int(m[2]), int(m[3]), vence), m[4], _valor(m[6]), final, parcela=m[5],
                         usd=_valor(m[7]) if m[7] and _valor(m[7]) else None, como=COMO_SS.get(m[1] or ""))
            out.append(ult)
    # juros e IOF do rotativo só aparecem no resumo
    for rot, tipo in ((r"\(\+\) Juros de Cr[ée]dito Rotativo", "juros"), (r"\(\+\) IOF\b", "iof"), (r"\(\+\) Multa", "juros")):
        v = _achar(L, rf"^{rot}\s+({_VALOR})")
        if v:
            out.append(_linha(_iso(fim) if fim else vence, re.sub(r"[\\()+]|\\b", "", rot).replace("[ée]", "é").strip(),
                              _valor(v), "", tipo=tipo))
    return {"vence": vence, "inicio": _iso(ini) if ini else None, "fecha": _iso(fim) if fim else None,
            "total": _valor(total) if total else None, "anterior": _valor(anterior) if anterior else None,
            "linhas": out, "subtotais": subtot, "sub_conta": lambda l: l["valor"] > 0}  # "VALOR TOTAL" do cartão: sem créditos


# ---------------------------------------------------------------- Banco do Brasil
def _ler_bb(L) -> dict[str, Any]:
    vence = _primeira_data(L)
    fecha = _achar(L, r"Fatura fechada em (\d{2}/\d{2}/\d{4})")
    total = _achar(L, rf"^Total da Fatura R\$\s*({_VALOR})")
    anterior = _achar(L, rf"^SALDO FATURA ANTERIOR\s+[A-Z]{{2}}\s+R\$\s*({_VALOR})")
    out, final, dentro = [], "", False
    for _p, _x, _y, t in L:
        t = t.strip()
        if t.startswith("Lançamentos nesta fatura"):
            dentro = True
            continue
        if not dentro:
            continue
        if t.startswith("Total da Fatura"):
            break
        m = re.search(r"\(Cart[ãa]o (\d{4})\)$", t)
        if m:
            final = m[1]
            continue
        m = re.fullmatch(rf"(\d{{2}})/(\d{{2}})\s+(.+?)(?:\s+([A-Z]{{2}}))?\s+R\$\s*({_VALOR})", t)
        if m:
            desc, parc = m[3], None
            mp = re.search(r"\s+PARC\s+(\d{2}/\d{2})(?:\s+.*)?$", desc)
            if mp:
                parc, desc = mp[1], desc[:mp.start()] + " PARC"
            usd = None
            mu = re.search(rf"\s+US\$\s*({_VALOR})", desc)  # compra internacional (se aparecer)
            if mu:
                usd, desc = _valor(mu[1]), desc[:mu.start()]
            out.append(_linha(_dia(int(m[1]), int(m[2]), vence), desc, _valor(m[5]), final, parcela=parc, usd=usd))
    return {"vence": vence, "inicio": None, "fecha": _iso(fecha) if fecha else None,
            "total": _valor(total) if total else None, "anterior": _valor(anterior) if anterior else 0.0,
            "linhas": out, "subtotais": {}}


# ---------------------------------------------------------------- Bradesco
def _ler_bradesco(L) -> dict[str, Any]:
    vence = _primeira_data(L)
    total = _achar(L, rf"\(=\)\s*Total da fatura:\s*({_VALOR})")
    anterior = _achar(L, rf"^Saldo anterior\s+({_VALOR})")
    cab = {(p, y): m[1] for p, _x, y, t in L if (m := re.search(r"Gastos referentes ao cart[ãa]o: Final (\d{4})", t))}
    subtot = {}
    for p, _x, y, t in L:  # "Valor da fatura: R$ X" fica na mesma altura do cabeçalho do cartão
        m = re.fullmatch(rf"Valor da fatura: R\$\s*({_VALOR})", t.strip())
        if m and (p, y) in cab:
            subtot[cab[(p, y)]] = _valor(m[1])
    out, final, dd, mm, dentro, subtot_ant = [], "", None, None, False, {}
    for p, x, y, t in L:
        t = t.strip()
        if (p, y) in cab and "Gastos referentes" in t:
            final, dentro, dd, mm = cab[(p, y)], True, None, None
            continue
        if t.startswith("Total da fatura (final"):
            break
        if not dentro:
            continue
        if re.fullmatch(r"\d{2}", t) and x < 100:
            dd = int(t)
            continue
        if t in MESES and x < 100:
            mm = MESES[t]
            continue
        if x < 100 or t.startswith(("Valor da fatura", "Data Lançamentos")) or dd is None or mm is None:
            continue
        m = re.fullmatch(rf"(.+?)(?:\s+\(\s*(\d{{2}}/\d{{2}})\s*\))?((?:\s+-?[\d.]+,\d{{2,4}})+)", t)
        if not m:
            continue
        nums = m[3].split()
        desc = m[1]
        if re.match(r"SALDO ANTERIOR", desc):
            subtot_ant[final] = _valor(nums[-1])
            continue
        usd = _valor(nums[0]) if len(nums) >= 3 else None  # Valor (US$) · Cotação · Valor (R$)
        out.append(_linha(_dia(dd, mm, vence), desc, _valor(nums[-1]), final, parcela=m[2], usd=usd))
    subtot = {k: round(v - subtot_ant.get(k, 0), 2) for k, v in subtot.items()}  # "Valor da fatura" do cartão conta o saldo anterior
    return {"vence": vence, "inicio": None, "fecha": None, "total": _valor(total) if total else None,
            "anterior": _valor(anterior) if anterior else None, "linhas": out, "subtotais": subtot,
            "sub_conta": lambda l: True}


# ---------------------------------------------------------------- Bradesco (fatura mensal do site/e-mail)
def _ler_bradesco_oficial(L) -> dict[str, Any]:
    """Colunas separadas por tab (o card põe tab nos espaços largos): "dd/mm descrição [parcela]", cidade, valor.
    Cidade comprida quebra a linha e o valor pode cair na linha de baixo."""
    vence = _primeira_data(L)
    total = _achar(L, rf"^Total da fatura em real\s+({_VALOR})")
    anterior = _achar(L, rf"^Saldo anterior\.*\s*R\$\s*({_VALOR})")
    fecha = _primeira_data(L, 2)  # "Limites · Disponível em 26/12/2025": dia do fechamento
    out, subtot, final, dentro, pend, total_para = [], {}, "", False, None, False
    val_rx = rf"(-?{_VALOR})(\s*-)?$"

    def fecha_pend(valor_txt, menos):
        v = _valor(valor_txt) * (-1 if menos else 1)
        pend["valor"] = v
        out.append(_linha(pend["data"], pend["desc"], v, final, parcela=pend["parcela"]))

    for p, _x, _y, t in L:
        t = t.strip()
        m = re.search(r"Cart[ãa]o\s+\d{4} XXXX XXXX (\d{4})$", t.replace("\t", " "))  # "Número do Cartão" vem antes de "Lançamentos"
        if m and p >= 2:
            final, pend, total_para = m[1], None, False
            continue
        if p >= 2 and t.startswith("Lançamentos"):
            dentro = True
            continue
        if not dentro:
            continue
        if t.startswith("Total da fatura em real"):
            break
        if t.replace("\t", " ").startswith("Total para"):
            mv = re.search(val_rx, t)
            if mv:
                subtot[final] = _valor(mv[1])
            total_para = not mv
            pend = None
            continue
        if total_para:  # "GUIMARAES 146,95": fim do "Total para ..."
            mv = re.search(val_rx, t)
            if mv:
                subtot[final] = _valor(mv[1])
            total_para = False
            continue
        md = re.match(r"(\d{2})/(\d{2})\s+(.*)$", t, re.S)
        if md:
            cols = [c.strip() for c in md[3].split("\t") if c.strip()]
            if not cols:
                continue
            desc = cols[0]
            mp = re.search(r"(\d{2}/\d{2})$", desc)
            parc = mp[1] if mp and mp.start() > 2 else None
            if parc:
                desc = desc[:mp.start()]
            pend = {"data": _dia(int(md[1]), int(md[2]), vence), "desc": desc, "parcela": parc}
            if len(cols) > 1:
                mv = re.search(val_rx, " ".join(cols[1:]))
            else:  # "PAGTO. POR DEB EM C/C 14.527,98 -": sem coluna de cidade
                mv = re.search(val_rx, desc)
                if mv:
                    pend["desc"] = desc[:mv.start()].strip()
            if mv:
                fecha_pend(mv[1], mv[2])
                pend = None
            continue
        if pend:  # continuação da cidade ("PROC") ou o valor sozinho ("54,95")
            mv = re.fullmatch(rf"(-?{_VALOR})(\s*-)?", t)
            if mv:
                fecha_pend(mv[1], mv[2])
                pend = None
    return {"vence": vence, "inicio": None, "fecha": fecha, "total": _valor(total) if total else None,
            "anterior": _valor(anterior) if anterior else None, "linhas": out, "subtotais": subtot,
            "sub_conta": lambda l: l["tipo"] != "pagamento"}


# ---------------------------------------------------------------- Itaú
def _ler_itau(L) -> dict[str, Any]:
    """Itaú e Itaú Latam. As páginas de lançamentos têm duas colunas, e o PDF junta na mesma linha (separado por tab) o
    que está na mesma altura nas duas: cada linha é partida em "coluna da esquerda" e "coluna da direita", e a leitura
    segue a ordem da fatura (esquerda da página, depois a direita). Só entram as seções de pagamentos e de lançamentos;
    parcelas das próximas faturas, limites, encargos e simulações ficam de fora. Vários cartões (adicionais): cada bloco
    começa em "NOME (final 1234)" e fecha em "Lançamentos no cartão (final 1234) valor"."""
    junta = lambda s: re.sub(r"\s", "", s or "")
    rx_val = r"-?\s?\d[\d .]*,\s?\d\s?\d"
    plano = [[p, x, y, t.replace("	", " ")] for p, x, y, t in L]
    vence = _achar(plano, r"Vencimento:\s*([\d/ ]{10,13})")
    emis = _achar(plano, r"Emiss[ãa]o:\s*([\d/ ]{10,13})")
    total = _achar(plano, r"Total desta fatura\s+(-?[\d., ]+,\s?\d\s?\d)")
    anterior = _achar(plano, r"Total da fatura anterior\s+(-?[\d., ]+,\s?\d\s?\d)")
    final0 = _achar(plano, r"Car\s?t[ãa]\s?o\s+\d{4}\.XXXX\.XXXX\.(\d{4})") or ""
    vence = _iso(junta(vence)) if vence else None
    e_val = lambda s: bool(re.fullmatch(rx_val + r"\s*\.?", s.strip()))
    e_parc = lambda s: bool(re.fullmatch(r"\d\s?\d\s?/\s?\d\s?\d", s.strip()))
    rx_data = r"^(\d)\s?(\d)\s?/\s?(\d)\s?(\d)\s+(\S.*)$"
    e_data = lambda s: bool(re.match(rx_data, s.strip()))
    rx_fim = r"\s(-?\s?\d{1,3}(?:\.\d{3})*\s?,\s?\d\s?\d)\s*\.?$"  # valor no fim do próprio pedaço (sem tab antes)
    chave = lambda s: _sem_acento(junta(s)).lower()  # o PDF do Itaú espalha espaços no meio das palavras

    def item(segs, i):
        """Um item da coluna a partir de segs[i]: devolve (pedaços do item, próximo índice)."""
        s = segs[i].strip()
        j = i + 1
        if e_data(s) and not re.search(rx_fim, s):  # lançamento: a parcela e o valor podem vir em pedaços separados
            while j < len(segs) and e_parc(segs[j]):
                j += 1
            if j < len(segs) and e_val(segs[j]):
                j += 1
        elif chave(s).startswith("data") and j < len(segs) and chave(segs[j]).startswith(("valor", "estabelecimento")):
            j += 1
            if j < len(segs) and chave(segs[j]).startswith("valor"):
                j += 1
        elif not e_val(s) and not e_data(s):
            if j < len(segs) and e_val(segs[j]):  # "Lançamentos no cartão (final 1234) | 1.234,56"
                j += 1
        return [x.strip() for x in segs[i:j]], j

    def colunas(x, t):
        # valor colado no texto da outra coluna, sem tab ("12,34 L Total dos lançamentos atuais"): separa
        t = re.sub(r"(,\s?\d\s?\d)\s+(?=[A-Za-zÀ-ú(])", "\\1\t", t)
        segs = [s for s in t.split("\t") if s.strip()]
        if not segs:
            return [], []
        if x >= 300:  # a linha só tem a coluna da direita
            return [], [segs]
        esq, k = item(segs, 0)
        dir_ = []
        while k < len(segs):
            it, k = item(segs, k)
            dir_.append(it)
        return [esq], dir_

    ordem = []  # itens na ordem da fatura: por página, a coluna da esquerda inteira e depois a da direita
    for pag in sorted({p for p, *_r in L}):
        esq, dir_ = [], []
        for p, x, _y, t in L:
            if p == pag:
                a, b = colunas(x, t)
                esq += a
                dir_ += b
        ordem += esq + dir_

    out, subtot, final, dentro, pagos = [], {}, "", False, False
    for segs in ordem:
        cab = re.sub(r"^[A-Z]\s+(?=[A-ZÀ-Ú])", "", segs[0])  # "P Total dos pagamentos", "L Total dos lançamentos"
        n = chave(cab)
        if n.startswith("pagamentosefetuados"):
            dentro, final = True, ""
            continue
        if re.match(r"lancamentos(:|internacionais|produtos)", n):
            dentro = True
            if n.startswith("lancamentos:compras") and not final:
                final = final0
            continue
        if re.match(r"(comprasparceladas|limitesdecredito|encargoscobrados|fiqueatento|simulacao|novotetodejuros|"
                    r"jurosmaximos|opcoesdepagamento|casovocepague|opagamentoobrigatorio|totaldoslancamentosatuais)", n):
            dentro = False
            continue
        m = re.search(r"\(final(\d{4})\)", n)
        if n.startswith("lancamentosnocartao"):
            k = m[1] if m else final0
            if k and len(segs) > 1 and e_val(segs[-1]):
                subtot[k] = _valor(junta(segs[-1]).rstrip("."))
            final = ""
            continue
        if m:
            final = m[1]
            continue
        if not dentro or not e_data(cab):
            continue
        if len(segs) > 1 and e_val(segs[-1]):
            val, corpo = segs[-1], " ".join(segs[:-1])
        else:
            mv = re.search(rx_fim, cab)
            if not mv:
                continue
            val, corpo = mv[1], cab[:mv.start()]
        md = re.match(rx_data, corpo.strip())
        desc, parc = md[5], None
        mp = re.search(r"(\d\s?\d\s?/\s?\d\s?\d)\s*$", desc)
        if mp:
            parc, desc = junta(mp[1]), desc[:mp.start()]
        l = _linha(_dia(int(md[1] + md[2]), int(md[3] + md[4]), vence), desc, _valor(junta(val).rstrip(".")), final, parcela=parc)
        pagos |= l["tipo"] == "pagamento"
        out.append(l)
    if not pagos:  # layout em que o pagamento só aparece no resumo da primeira página
        for _p, _x, _y, t in plano:
            m = re.search(r"Pagamento efetuado em (\d{2}/\d{2}/\d{4})\s+(-\s?[\d.]+,\d{2})", t)
            if m:
                out.append(_linha(_iso(m[1]), "Pagamento efetuado", _valor(junta(m[2])), "", tipo="pagamento"))
    # encargos do rotativo (pagou menos que o total): às vezes só vêm no resumo da primeira página, sem lançamento.
    # Entram só se faltarem exatamente eles para a conta fechar (quando vêm como lançamento, já estão nas linhas).
    enc = _achar(plano, r"Encargos \(financiamento[^)]*\)\s+(-?[\d., ]+,\s?\d\s?\d)")
    if enc and total and vence:
        falta = round(_valor(junta(total)) - (_valor(junta(anterior)) if anterior else 0) - sum(l["valor"] for l in out), 2)
        if _valor(junta(enc)) > 0 and abs(falta - _valor(junta(enc))) < 0.011:
            out.append(_linha(_iso(junta(emis)) if emis else vence, "Encargos (financiamento + moratório)", _valor(junta(enc)), "", tipo="juros"))
    return {"vence": vence, "inicio": None, "fecha": _iso(junta(emis)) if emis else None,
            "total": _valor(total) if total else None, "anterior": _valor(anterior) if anterior else None,
            "linhas": out, "subtotais": subtot}


# ---------------------------------------------------------------- ajudantes dos leitores novos
def _depois(linhas, rx_rotulo: str, rx_valor: str, pag: int | None = None) -> str | None:
    """O primeiro texto que casa com rx_valor depois do rótulo (o valor fica num pedaço separado do PDF)."""
    achou = False
    for p, _x, _y, t in linhas:
        if pag and p != pag:
            continue
        if achou and (m := re.fullmatch(rx_valor, t.strip())):
            return m[1]
        if re.search(rx_rotulo, t):
            achou = True
    return None


def _por_altura(linhas, pag_min: int = 1, tol: float = 3, lado: float | None = None):
    """Junta os pedaços da mesma altura (y) numa linha só, da esquerda para a direita: [(página, y, x, texto)].
    lado: separa duas colunas da página (x menor que "lado" = esquerda)."""
    grupos = []
    for p, x, y, t in sorted(((p, x, y, t) for p, x, y, t in linhas if p >= pag_min), key=lambda r: (r[0], -r[2], r[1])):
        col = 0 if lado is None or x < lado else 1
        g = next((g for g in grupos[-6:] if g[0] == p and g[4] == col and abs(g[1] - y) <= tol), None)
        if g:
            g[3].append((x, t))
        else:
            grupos.append([p, y, x, [(x, t)], col])
    return [(p, y, min(x for x, _t in c), " ".join(t.strip() for _x, t in sorted(c)).strip()) for p, y, _x, c, _col in grupos]


def _mes_nome(s: str) -> int:
    return MESES[_sem_acento(s).upper()[:3]]


# ---------------------------------------------------------------- Bradescard (Amazon e outros cartões do Banco Bradescard)
def _ler_bradescard(L) -> dict[str, Any]:
    """Lançamentos na coluna da esquerda das páginas 2+: "dd/mm descrição [cidade] valor", crédito com " -" no fim;
    parcela "(02/09)" no fim da descrição; o final vem no cabeçalho do cartão ("1234.56**.****.0000")."""
    vence = _primeira_data(L)
    total = _achar(L, rf"^\(=\) Total\s+R\$\s*({_VALOR})")
    anterior = _achar(L, rf"^Saldo anterior\s+R\$\s*({_VALOR}\s*-?)")  # "R$ 12,34-": saldo a favor (crédito)
    fecha = _primeira_data(L, 2)  # "Limites · Disponível em: 24/06/2026": dia do fechamento
    out, final = [], ""
    for p, x, _y, t in L:
        if p < 2 or x >= 300:
            continue
        t = t.strip()
        m = re.search(r"\d{4}\.\d{2}\*\*\.\*{4}\.(\d{4})$", t)
        if m:
            final = m[1]
            continue
        m = re.fullmatch(rf"(\d{{2}})/(\d{{2}})\s+(.+?)\s+({_VALOR})(\s*-)?", t)
        if not m:
            continue
        desc, parc = m[3].strip(), None
        mp = re.search(r"\((\d{2}/\d{2})\)$", desc)
        if mp:
            parc, desc = mp[1], desc[:mp.start()]
        out.append(_linha(_dia(int(m[1]), int(m[2]), vence), desc, _valor(m[4]) * (-1 if m[5] else 1), final, parcela=parc))
    ant = None
    if anterior:
        ant = _valor(anterior.rstrip(" -")) * (-1 if anterior.rstrip().endswith("-") else 1)
    return {"vence": vence, "inicio": None, "fecha": fecha, "total": _valor(total) if total else None,
            "anterior": ant, "linhas": out, "subtotais": {}}


# ---------------------------------------------------------------- BRB (página deitada)
def _ler_brb(L) -> dict[str, Any]:
    """A página vem deitada: cada linha da fatura é um x, e as colunas (data, descrição, tipo, US$, cotação, R$) vêm
    em pedaços separados. O saldo anterior não é impresso: sai do resumo (total + pagamentos − compras)."""
    def linhas_deitadas(pag_min):
        grupos = []
        for p, x, y, t in sorted(((p, x, y, t) for p, x, y, t in L if p >= pag_min), key=lambda r: (r[0], -r[1], -r[2])):
            if grupos and grupos[-1][0] == p and abs(grupos[-1][1] - x) <= 3:
                grupos[-1][2].append((y, t.strip()))
            else:
                grupos.append([p, x, [(y, t.strip())]])
        return [(p, [t for _y, t in sorted(c, key=lambda c: -c[0]) if t]) for p, _x, c in grupos]

    em_pe = _brb_linhas_em_pe(L)
    if any(re.search(r"O total da sua fatura.*Com vencimento", t) for _p, _y, _x, t in em_pe):
        return _ler_brb_em_pe(em_pe)
    vence = _primeira_data(L)
    total = _depois(L, r"O total da sua fatura", rf"R\$\s*({_VALOR})", 1)
    resumo = {}
    for _p, cel in linhas_deitadas(1):
        for i, c in enumerate(cel[:-1]):
            if c in ("Pagamentos", "Compras Nacionais", "Compras Internacionais") and (m := re.fullmatch(rf"R\$\s*({_VALOR})", cel[i + 1])):
                resumo.setdefault(c, _valor(m[1]))
    anterior = None
    if total and len(resumo) == 3:
        anterior = round(_valor(total) + resumo["Pagamentos"] - resumo["Compras Nacionais"] - resumo["Compras Internacionais"], 2)
    out, subtot, final = [], {}, ""
    for _p, cel in linhas_deitadas(2):
        txt = " ".join(cel)
        m = re.search(r"\d{4}\*\*\.\*{6}\.(\d{4})", txt)
        if m:
            final = m[1]
            mt = re.search(rf"Total desse cart[ãa]o:\s*R\$\s*({_VALOR})", txt)
            if mt:
                subtot[final] = _valor(mt[1])
            continue
        if len(cel) < 3 or not re.fullmatch(r"\d{2}/\d{2}", cel[0]):
            continue
        mv = re.fullmatch(rf"R\$\s*({_VALOR})\s*([+−-])", cel[-1])
        if not mv:
            continue
        mp = re.search(r"Parc\.\s*(\d+)/(\d+)", txt)
        nums = [c for c in cel[2:-1] if re.fullmatch(rf"-?{_VALOR}", c)]  # compra de fora: US$ e cotação
        dd, mm = cel[0].split("/")
        out.append(_linha(_dia(int(dd), int(mm), vence), cel[1], _valor(mv[1]) * (-1 if mv[2] in "−-" else 1), final,
                          parcela=f"{int(mp[1]):02d}/{int(mp[2]):02d}" if mp else None, usd=_valor(nums[0]) if nums else None))
    return {"vence": vence, "inicio": None, "fecha": None, "total": _valor(total) if total else None,
            "anterior": anterior, "linhas": out, "subtotais": subtot, "sub_conta": lambda l: l["valor"] > 0}  # "Total desse cartão": sem os créditos


def _brb_linhas_em_pe(L):
    """Página em pé: junta os pedaços da mesma altura numa linha (o PDF às vezes repete o texto em negrito: sai uma vez)."""
    vistos, unicos = set(), []
    for p, x, y, t in L:
        k = (p, round(x), round(y), t.strip())
        if k not in vistos and t.strip():
            vistos.add(k)
            unicos.append([p, x, y, t])
    return _por_altura(unicos, tol=3.5)


def _ler_brb_em_pe(R) -> dict[str, Any]:
    """BRB com a página em pé (faturas mais antigas): cada lançamento numa linha só ("05/12 OBRIGADO PELO PAGAMENTO
    R$ 100,00−", "30/10 LOJA XParcela Lojista Visa Parc.2/10 R$ 12,34+"); o cartão abre em "0000**.******.1234 …
    Total desse cartão: R$ X". O total e o vencimento vêm na linha de baixo dos rótulos do topo."""
    vence = total = None
    for i, (_p, _y, _x, t) in enumerate(R):
        if re.search(r"O total da sua fatura.*Com vencimento", t) and i + 1 < len(R):
            prox = R[i + 1][3]
            mt, md = re.search(rf"R\$\s*({_VALOR})", prox), re.search(r"\d{2}/\d{2}/\d{4}", prox)
            total, vence = (mt[1] if mt else None), (_iso(md[0]) if md else None)
            break
    resumo = {}
    for _p, _y, _x, t in R:
        for rot in ("Pagamentos", "Compras Nacionais", "Compras Internacionais"):
            if (m := re.search(rf"(?:^|\s){rot}\s+R\$\s*({_VALOR})", t)):
                resumo.setdefault(rot, _valor(m[1]))
    anterior = None
    if total and len(resumo) == 3:
        anterior = round(_valor(total) + resumo["Pagamentos"] - resumo["Compras Nacionais"] - resumo["Compras Internacionais"], 2)
    out, subtot, final = [], {}, ""
    for p, _y, _x, t in R:
        if p < 2 or not vence:
            continue
        t = re.sub(r"\s+", " ", t).strip()
        m = re.search(r"\d{4}[.*]+\*{4,}[.*]*\.(\d{4})", t)  # 0000**.******.1234 ou 0000.****.****.1234
        if m:
            final = m[1]
            if (mt := re.search(rf"Total desse cart[ãa]o:\s*R\$\s*({_VALOR})", t)):
                subtot[final] = _valor(mt[1])
            continue
        m = re.fullmatch(rf"(\d{{2}})/(\d{{2}}) (.+?) R\$\s*({_VALOR})\s*([+−-])", t)
        if not m:
            continue
        desc = m[3]
        mp = re.search(r"Parc\.\s*(\d+)/(\d+)", desc)
        usd = re.findall(rf"(?<!\S)({_VALOR})(?!\S)", desc)  # compra de fora: US$ e cotação antes do R$
        desc = re.split(r"Parcela Lojista|Parcelad[oa]|Compra a Vista|Compra Parcelada|Saque", desc)[0]
        desc = re.sub(rf"(?<!\S){_VALOR}(?!\S)", "", desc)
        dd, mm = int(m[1]), int(m[2])
        out.append(_linha(_dia(dd, mm, vence), desc, _valor(m[4]) * (-1 if m[5] in "−-" else 1), final,
                          parcela=f"{int(mp[1]):02d}/{int(mp[2]):02d}" if mp else None, usd=_valor(usd[0]) if usd else None))
    return {"vence": vence, "inicio": None, "fecha": None, "total": _valor(total) if total else None,
            "anterior": anterior, "linhas": out, "subtotais": subtot, "sub_conta": lambda l: l["valor"] > 0}


# ---------------------------------------------------------------- BTG Pactual
def _ler_btg(L) -> dict[str, Any]:
    """Lançamentos em duas colunas (data "16 Set", descrição, valor na mesma altura). Cada bloco do cartão começa em
    "Lançamentos do cartão ... | Final 1234 ... Total do cartão: R$ X"; o que vem antes (pagamentos) fica sem final.
    Recebe as linhas com o tab do card: quando o PDF junta a data da coluna esquerda com o valor de uma compra da
    coluna direita ("29 Mai<tab>R$ 8,93"), o valor volta para a coluna de valores da direita."""
    sep = []
    for p, x, y, t in L:
        partes = t.split("\t")
        if len(partes) == 2 and x < 300 and re.fullmatch(r"\d{2} [A-Za-zçÇ]{3}", partes[0].strip()) \
                and re.fullmatch(rf"-?\s*R\$\s*{_VALOR}", partes[1].strip()):
            sep += [[p, x, y, partes[0].strip()], [p, 513.0, y, partes[1].strip()]]  # o valor vai para a coluna da direita
        else:
            sep.append([p, x, y, t.replace("\t", " ")])
    L = sep
    ano = _achar(L, r"fatura de \w+ de (\d{4})")
    mv = re.search(r"(\d{2})/(\d{2})", _achar(L, r"Vencimento:\s*(\d{2}/\d{2})") or "")
    vence = f"{ano}-{mv[2]}-{mv[1]}" if ano and mv else None
    per = _achar(L, r"Per[íi]odo de compras:\s*(\d{2}/\d{2}) at[ée] (\d{2}/\d{2})", 0)
    ini, fim = re.findall(r"(\d{2})/(\d{2})", per) if per and vence else (None, None)
    total = _achar(L, rf"^Total a pagar\s+R\$\s*({_VALOR})")
    anterior = _achar(L, rf"^Total da fatura anterior\s+R\$\s*({_VALOR})")
    titular = _achar(L, r"^(.+?)\s+\|\s+fatura de ")
    cabecas, subtot = [], {}
    for p, _x, y, t in L:
        m = re.search(rf"Lan[çc]amentos do cart[ãa]o .*Final (\d{{4}}).*Total do cart[ãa]o:\s*R\$\s*({_VALOR})", t)
        if m:
            cabecas.append((p, y, m[1]))
            subtot[m[1]] = _valor(m[2])
    out = []
    for p, y, _x, t in _por_altura(L, 2, 2, lado=300):
        m = re.fullmatch(rf"(\d{{2}}) ([A-Za-zçÇ]{{3}})\s+(.+?)\s+(-\s*)?R\$\s*({_VALOR})", t)
        if not m or not vence or _sem_acento(m[2]).upper()[:3] not in MESES:
            continue
        # o cartão do bloco: o cabeçalho mais perto acima, na mesma página; página que só continua o bloco (sem
        # cabeçalho acima) fica com o último cartão aberto nas páginas de antes
        acima = [(pp, -yy, f) for pp, yy, f in cabecas if pp < p or (pp == p and yy > y)]
        final = max(acima)[2] if acima else ""
        desc, parc = m[3], None
        mp = re.search(r"\((\d{1,2})/(\d{1,2})\)$", desc)
        if mp:
            parc, desc = f"{int(mp[1]):02d}/{int(mp[2]):02d}", desc[:mp.start()]
        out.append(_linha(_dia(int(m[1]), _mes_nome(m[2]), vence), desc, _valor(m[5]) * (-1 if m[4] else 1), final, parcela=parc))
    return {"vence": vence, "inicio": _dia(int(ini[0]), int(ini[1]), vence) if ini else None,
            "fecha": _dia(int(fim[0]), int(fim[1]), vence) if fim else None,
            "total": _valor(total) if total else None, "anterior": _valor(anterior) if anterior else None,
            "linhas": out, "subtotais": subtot, "titulares": [titular] if titular else []}


# ---------------------------------------------------------------- Caixa
def _ler_caixa(L) -> dict[str, Any]:
    """Demonstrativo na coluna da direita: "dd/mm descrição [cidade] valorD|C" (D soma, C abate). Primeiro os gerais
    (pagamento, créditos), depois um bloco por cartão "(Cartão 1234)" com parcelados e outros; parcela "04 DE 06"."""
    vence = _primeira_data(L)
    mt = re.search(rf"({_VALOR})\s*([DC])", _achar(L, rf"Valor total desta fatura R\$\s*({_VALOR}\s*[DC])") or "")
    out, subtot, final, anterior = [], {}, "", None
    for p, x, _y, t in L:
        if p < 2 or x < 300:
            continue
        t = t.strip()
        m = re.search(rf"^Total final \(cart[ãa]o (\d{{4}})\)\s+({_VALOR})\s*([DC])$", t)
        if m:
            subtot[m[1]] = _valor(m[2]) * (-1 if m[3] == "C" else 1)
            continue
        m = re.search(r"\(Cart[ãa]o (\d{4})\)$", t)
        if m:
            final = m[1]
            continue
        m = re.fullmatch(rf"(\d{{2}})/(\d{{2}})\s+(.+?)\s+({_VALOR})\s*([DC])", t)
        if not m:
            continue
        v = _valor(m[4]) * (-1 if m[5] == "C" else 1)
        if re.match(r"TOTAL DA FATURA ANTERIOR", m[3]):
            anterior = v
            continue
        desc, parc = m[3], None
        mp = re.search(r"\b(\d{2}) DE (\d{2})\b", desc)
        if mp:
            parc, desc = f"{mp[1]}/{mp[2]}", (desc[:mp.start()] + desc[mp.end():])
        out.append(_linha(_dia(int(m[1]), int(m[2]), vence), desc, v, final, parcela=parc))
    return {"vence": vence, "inicio": None, "fecha": None,
            "total": _valor(mt[1]) * (-1 if mt[2] == "C" else 1) if mt else None,
            "anterior": anterior, "linhas": out, "subtotais": subtot}


# ---------------------------------------------------------------- Nubank
_NU_SALDO = r"SALDO EM ATRASO|CREDITO DE ATRASO|DIVIDA ENCERRADA|ENCERRAMENTO DE DIVIDA"  # se anulam: não é compra nem tarifa


def _ler_nubank(L) -> dict[str, Any]:
    """Transações: "13 SET •••• 1234 descrição R$ valor" (o valor de multa/juros de atraso vem num pedaço à parte, na
    mesma altura); crédito com "−R$". Saldo em atraso e o crédito que o anula ficam como tipo "saldo"."""
    mv = re.search(r"(\d{2}) ([A-Z]{3}) (\d{4})", _achar(L, r"Data de vencimento:\s*(\d{2} [A-Z]{3} \d{4})") or "")
    vence = f"{mv[3]}-{_mes_nome(mv[2]):02d}-{mv[1]}" if mv else None
    per = _achar(L, r"Per[íi]odo vigente:\s*(\d{2} [A-Z]{3}) a (\d{2} [A-Z]{3})", 0)
    ini, fim = re.findall(r"(\d{2}) ([A-Z]{3})", per) if per and vence else (None, None)
    total = _achar(L, rf"^Total a pagar\s+R\$\s*({_VALOR})")
    anterior = _achar(L, rf"^Fatura anterior\s+R\$\s*({_VALOR})")
    titulares = {L[i - 1][3].strip() for i in range(1, len(L))  # o nome vem logo antes de "FATURA 20 OUT 2026" no alto das páginas
                 if re.match(r"FATURA \d{2} [A-Z]{3} \d{4}", L[i][3].strip()) and re.fullmatch(r"[A-ZÀ-Ú][A-ZÀ-Ú ]{6,}", L[i - 1][3].strip())}
    out = []
    for _p, _y, _x, t in _por_altura(L, 2, 3):
        m = re.fullmatch(rf"(\d{{2}}) ([A-Z]{{3}})\s+(?:•+\s*(\d{{4}})\s+)?(.+?)\s+([−-])?R\$\s*({_VALOR})", t)
        if not m or not vence or m[2] not in MESES:
            continue
        desc, parc = m[4], None
        mp = re.search(r"\s*-?\s*Parcela (\d+)/(\d+)$", desc)
        if mp:
            parc, desc = f"{int(mp[1]):02d}/{int(mp[2]):02d}", desc[:mp.start()]
        v = _valor(m[6]) * (-1 if m[5] else 1)
        tipo = "saldo" if re.search(_NU_SALDO, _sem_acento(desc).upper()) else None
        out.append(_linha(_dia(int(m[1]), MESES[m[2]], vence), desc, v, m[3] or "", parcela=parc, tipo=tipo))
    return {"vence": vence, "inicio": _dia(int(ini[0]), MESES[ini[1]], vence) if ini else None,
            "fecha": _dia(int(fim[0]), MESES[fim[1]], vence) if fim else None,
            "total": _valor(total) if total else None, "anterior": _valor(anterior) if anterior else None,
            "linhas": out, "subtotais": {}, "titulares": sorted(titulares)}


# ---------------------------------------------------------------- Inter
def _ler_inter(L) -> dict[str, Any]:
    """Colunas por posição: data (x < 70), descrição, beneficiário (x ≥ 290) e valor (x ≥ 370), na mesma altura."""
    vence = _primeira_data(L)
    total = _depois(L, r"^Total da sua fatura$", rf"R\$\s*({_VALOR})", 1)
    titulares = [L[i - 1][3].strip() for i in range(1, len(L))  # o nome vem logo antes do cartão no alto das páginas
                 if re.fullmatch(r"\d{4}\*{4}\d{4}", L[i][3].strip()) and re.fullmatch(r"[A-ZÀ-Ú][A-ZÀ-Ú ]{6,}", L[i - 1][3].strip())]
    filas: dict[tuple, list] = {}
    for p, x, y, t in L:
        if p >= 3 and t.strip():
            filas.setdefault((p, round(y)), []).append((x, t.strip()))
    out, subtot, final = [], {}, ""
    for (p, _y), cel in sorted(filas.items(), key=lambda k: (k[0][0], -k[0][1])):
        cel.sort()
        txt = " ".join(t for _x, t in cel)
        m = re.match(rf"(Total )?CART[ÃA]O \d{{4}}\*{{4}}(\d{{4}})(?:\s+R\$\s*({_VALOR}))?$", txt)
        if m:
            if m[1] and m[3]:
                subtot[m[2]] = _valor(m[3])
            elif not m[1]:
                final = m[2]
            continue
        data = next((t for x, t in cel if x < 70), "")
        md = re.fullmatch(r"(\d{2}) de ([a-zç]{3})\.? (\d{4})", data)
        mv = re.fullmatch(rf"(\+\s*)?R\$\s*({_VALOR})", next((t for x, t in cel if x >= 370), ""))
        desc = " ".join(t for x, t in cel if 70 <= x < 290)
        if not md or not mv or not desc or _sem_acento(md[2]).upper() not in MESES:
            continue
        parc = None
        mp = re.search(r"\s*\(Parcela (\d+) de (\d+)\)$", desc)
        if mp:
            parc, desc = f"{int(mp[1]):02d}/{int(mp[2]):02d}", desc[:mp.start()]
        out.append(_linha(f"{md[3]}-{MESES[_sem_acento(md[2]).upper()]:02d}-{md[1]}", desc, _valor(mv[2]) * (-1 if mv[1] else 1), final, parcela=parc))
    pago = -round(sum(l["valor"] for l in out if l["tipo"] == "pagamento"), 2)
    total = _valor(total) if total else None

    def resumo(rotulo):  # o resumo da página 2: "Despesas do mês  R$ 5.445,13" (o valor à direita, na mesma altura)
        for p, x, y, t in L:
            if p <= 2 and re.fullmatch(rotulo, t.strip()):
                v = sorted((xx, tt) for pp, xx, yy, tt in L if pp == p and abs(yy - y) < 3 and xx > x and re.search(r"R\$", tt))
                if v and (m := re.search(rf"(-\s*)?R\$\s*({_VALOR})", v[0][1])):
                    return _valor(m[2]) * (-1 if m[1] else 1)
        return None
    despesas, atual = resumo(r"Despesas do m[êe]s"), resumo(r"Fatura atual")
    if atual is not None:
        total = atual
    if despesas is not None and total is not None:
        # pagamento antecipado (e créditos) só aparecem no resumo: a conferência vira compras = despesas do mês.
        # "anterior" fica o saldo que a fatura carrega (negativo = crédito do que foi pago antes)
        creditos = sum(l["valor"] for l in out if l["valor"] < 0 and l["tipo"] != "pagamento")
        pago = round(total - (despesas + creditos - pago), 2)
    return {"vence": vence, "inicio": None, "fecha": None, "total": total,
            "anterior": pago, "linhas": out, "subtotais": subtot,
            "sub_conta": lambda l: l["tipo"] != "pagamento" and l["valor"] > 0,  # o "Total CARTÃO" do Inter conta só as compras
            "titulares": titulares}


LEITORES = (  # (banco, como reconhecer, leitor): o layout é do banco, igual para qualquer cliente
    ("santander", r"SANTANDER|Detalhamento da Fatura", _ler_santander),
    ("bb", r"OUROCARD|Lançamentos nesta fatura", _ler_bb),
    ("bradesco", r"Gastos referentes ao cart[ãa]o: Final", _ler_bradesco),  # PDF do app Bradesco Cartões
    ("bradesco", r"Hist[óo]rico de Lan[çc]amentos", _ler_bradesco_oficial),  # fatura mensal do site/e-mail
    ("itau", r"Ita[úu]\s?Cart|Previs[ãa]o\s?pr[óo]x", _ler_itau),
    ("bradesco", r"Banco Bradescard|bradescard\.com\.br", _ler_bradescard),  # Amazon e outros cartões Bradescard
    ("brb", r"Cart[ãa]o BRB|Total desse cart[ãa]o", _ler_brb),
    ("btg", r"BTG Pactual", _ler_btg),
    ("caixa", r"Cart[õo]es Caixa|Cart[õo]es CAIXA|CART[ÕO]ES CAIXA", _ler_caixa),
    ("nubank", r"Nu Pagamentos|Nubank", _ler_nubank),
    ("inter", r"bancointer\.com\.br|BANCO INTER S/A|Cart[ãa]o Inter", _ler_inter),
)


def _tirar_titular(f: dict[str, Any], titulares) -> None:
    """Nome do titular dentro de uma descrição (link de pagamento "Jim.com* Fulano Sob"): o primeiro nome seguido de
    pedaços do sobrenome vira "#". Só o primeiro nome sozinho fica ("SAO PAULO" é cidade)."""
    for nome in titulares:
        ws = [w for w in _sem_acento(nome).upper().split() if len(w) >= 2 and w not in ("DA", "DE", "DO", "DOS", "DAS")]
        if len(ws) < 2:
            continue
        for l in f["linhas"]:
            toks = l["descricao"].split(" ")
            up = [_sem_acento(t).upper().strip(".,*") for t in toks]
            for i, t in enumerate(up):
                if t != ws[0]:
                    continue
                j = i + 1
                while j < len(up) and up[j] and any(w.startswith(up[j]) for w in ws[1:]):
                    j += 1
                if j > i + 1:
                    l["descricao"] = " ".join(toks[:i] + ["#"] + toks[j:])
                    break


def _sem_pessoal(f: dict[str, Any], linhas_pdf, titulares=()) -> None:
    """Trava: nada com cara de CPF, CEP, número de cartão ou nome do titular nas linhas que ficam."""
    nomes = {_sem_acento(n).upper().strip() for n in titulares}
    for _p, _x, _y, t in linhas_pdf:  # nomes dos titulares, tirados dos cabeçalhos que foram descartados
        for m in re.finditer(r"(?:^|@\s*)([A-ZÀ-Ú][A-ZÀ-Ú ]{6,}?)\s+-\s+\d{4} XXXX|\|\s*([A-ZÀ-Ú][A-ZÀ-Ú ]{6,})$|^([A-Z][a-zA-Z ]{6,}) \(Cart", t):
            nomes.add(_sem_acento(next(g for g in m.groups() if g)).upper().strip())
    for l in f["linhas"]:
        d = _sem_acento(l["descricao"]).upper()
        if re.search(r"\d{3}\.?\d{3}\.?\d{3}-?\d{2}|\b\d{5}-\d{3}\b|\d{4}[ .X*]{1,3}\d{4}[ .X*]{1,3}", d):
            raise Falha(f"Parei: a linha “{l['descricao'][:20]}…” parece ter dado pessoal. Nada foi gravado.")
        if any(n and n in d for n in nomes):
            raise Falha("Parei: uma linha tem o nome do titular. Nada foi gravado.")


def _ano_das_parcelas(f: dict[str, Any]) -> None:
    """Parcela k/n traz a data da compra original, que é de uns k-1 meses antes: "27/05 ... 12/12" na fatura de
    maio/2026 é uma compra de maio/2025 (só pelo mês, ficaria 2026)."""
    v = date.fromisoformat(f["vence"])
    # antecipação: várias parcelas da mesma compra na mesma fatura (mesma data, descrição e total de parcelas). A compra
    # é uma só, então o ano sai da MENOR parcela do grupo (a 1ª antecipada); cada uma recuar sozinha punha a mesma
    # compra em anos diferentes
    menor: dict[tuple, int] = {}
    for l in f["linhas"]:
        if l.get("parcela"):
            g = (l["data"], l["descricao"], l["parcela"].split("/")[1])
            menor[g] = min(menor.get(g, 99), int(l["parcela"].split("/")[0]))
    for l in f["linhas"]:
        if not l.get("parcela"):
            continue
        k = menor[(l["data"], l["descricao"], l["parcela"].split("/")[1])]
        d = date.fromisoformat(l["data"])
        while k > 1 and (v.year - d.year) * 12 + v.month - d.month < k - 1:
            d = d.replace(year=d.year - 1, day=min(d.day, 28) if d.month == 2 else d.day)
        l["data"] = d.isoformat()


def ler_fatura(linhas_pdf) -> dict[str, Any]:
    """Linhas do PDF → fatura (só lançamentos e datas). Confere as somas antes de devolver."""
    # o card separa colunas com tab (espaço largo); só o leitor do Bradesco oficial usa isso, os outros leem espaço
    com_tab = linhas_pdf
    linhas_pdf = [[p, x, y, t.replace("\t", " ")] for p, x, y, t in com_tab]
    texto = "\n".join(t for *_r, t in linhas_pdf)
    for banco, rx, leitor in LEITORES:
        if re.search(rx, texto):
            f = leitor(com_tab if leitor in (_ler_bradesco_oficial, _ler_btg, _ler_itau) else linhas_pdf)
            break
    else:
        raise Falha("Não reconheci essa fatura. Hoje leio Santander, Banco do Brasil, Bradesco (e Bradescard), Itaú, BRB, BTG, Caixa, Inter e Nubank.")
    if not f["vence"] or f["total"] is None:
        raise Falha("Abri a fatura, mas não achei o vencimento ou o total.")
    f["banco"] = banco
    titulares = f.pop("titulares", [])
    _tirar_titular(f, titulares)
    _ano_das_parcelas(f)
    soma = round(sum(l["valor"] for l in f["linhas"]), 2)
    f["conferencia"] = {"anterior": f.get("anterior"), "soma_linhas": soma,
                        "esperado": round((f.get("total") or 0) - (f.get("anterior") or 0), 2)}
    f["conferencia"]["bate"] = abs(f["conferencia"]["esperado"] - soma) < 0.011
    por_final: dict[str, float] = {}
    tudo_final: dict[str, float] = {}
    conta = f.pop("sub_conta", lambda l: True)  # o subtotal de alguns bancos não desconta os créditos (estorno, cashback)
    for l in f["linhas"]:
        if l["final"]:
            tudo_final[l["final"]] = round(tudo_final.get(l["final"], 0) + l["valor"], 2)
            if conta(l):
                por_final[l["final"]] = round(por_final.get(l["final"], 0) + l["valor"], 2)
    f["conferencia"]["finais"] = {}
    for k, v in f.pop("subtotais").items():  # vale o jeito que bater: com ou sem os créditos (o banco muda de layout)
        s = por_final.get(k, 0.0) if abs(por_final.get(k, 0.0) - v) < 0.011 else tudo_final.get(k, 0.0)
        f["conferencia"]["finais"][k] = {"linhas": s, "fatura": v, "bate": abs(s - v) < 0.011}
    _sem_pessoal(f, linhas_pdf, titulares)
    return f


def periodo(f: dict[str, Any], fecha_dia: int | None, anterior_fecha: str | None = None) -> None:
    """Completa início/fechamento quando o PDF não diz (Bradesco): fechamento pelo dia do cadastro, início no dia seguinte
    ao fechamento anterior."""
    if not f.get("fecha") and fecha_dia:
        v = date.fromisoformat(f["vence"])
        m = v.replace(day=1) - timedelta(days=1) if fecha_dia >= v.day else v
        f["fecha"] = m.replace(day=min(fecha_dia, 28 if m.month == 2 else 30)).isoformat()
    if not f.get("inicio") and anterior_fecha:
        f["inicio"] = (date.fromisoformat(anterior_fecha) + timedelta(days=1)).isoformat()


# ---------------------------------------------------------------- assinaturas e conciliação
def chave_loja(desc: str) -> str:
    """Nome da loja para comparar meses (o Itaú solta letras: "PINH EIRO MADE I"). Sem o intermediário do pagamento
    ("MP *PARAMOUNTPLUS" e "EC *PARAMOUNTPLUS" são a mesma)."""
    d = _sem_acento(desc).upper()
    d = re.sub(r"\bPARC\b|#", "", d)
    depois = re.sub(r"[^A-Z]", "", d.split("*", 1)[1]) if "*" in d else ""
    return depois if len(depois) >= 5 else re.sub(r"[^A-Z]", "", d)


_MESMA_LOJA = {"EBAZAR": "MERCADOLIVRE", "RAIADROGASIL": "DROGASIL"}  # razão social da nota → nome na fatura
_COMUNS = {"LTDA", "COMERCIO", "COMERCIAL", "INDUSTRIA", "SERVICOS", "BRASIL", "LOJA", "FILIAL", "MATRIZ", "VAREJO",
           "VAREJISTA", "PRODUTOS", "DISTRIBUIDORA", "MERCADO", "IMPORTS", "EIRELI"}


def _parece(desc: str, c: dict[str, Any]) -> bool:
    """A descrição da fatura lembra o nome da loja da compra? (uma palavra de 4+ letras em comum)"""
    pal = lambda s: {w for w in re.findall(r"[A-Z]{4,}", _sem_acento(s or "").upper()) if w not in _COMUNS}
    loja = c.get("loja") or {}
    nomes = pal(loja.get("nome")) | pal(c.get("loja_curta"))
    nomes |= {_MESMA_LOJA[n] for n in nomes if n in _MESMA_LOJA}
    d = pal(desc)
    return bool(nomes & d) or any(n in chave_loja(desc) for n in nomes if len(n) >= 5)


def assinaturas(faturas: list[dict[str, Any]], minimo: int = 3) -> list[dict[str, Any]]:
    """O que se repete todo mês sem ser parcela: mesma loja em `minimo` faturas ou mais."""
    grupos: dict[tuple[str, str], dict[str, dict[str, Any]]] = {}
    for f in faturas:
        for l in f["linhas"]:
            if l["tipo"] not in ("compra", "anuidade") or l["parcela"] or l["valor"] <= 0:
                continue
            g = grupos.setdefault((f["banco"], chave_loja(l["descricao"])), {})
            g.setdefault(f["vence"][:7], l)  # uma por fatura
    out = []
    for (banco, _k), meses in grupos.items():
        if len(meses) < minimo:
            continue
        ls = [meses[m] for m in sorted(meses)]
        vals = [l["valor"] for l in ls]
        if not any(l["usd"] for l in ls) and max(vals) > 1.2 * min(vals):  # valor que varia (mercado, posto) não é assinatura
            continue
        out.append({"banco": banco, "descricao": ls[-1]["descricao"], "finais": sorted({l["final"] for l in ls}),
                    "meses": len(ls), "primeiro": ls[0]["data"], "ultimo": ls[-1]["data"], "valor_atual": vals[-1],
                    "media": round(sum(vals) / len(vals), 2), "dolar": any(l["usd"] for l in ls)})
    return sorted(out, key=lambda a: -a["media"])


def e_credito(pg: dict[str, Any]) -> bool:
    return "CREDITO" in _sem_acento((pg.get("forma") or "") + " " + (pg.get("tipo") or "")).upper()


def _credito(c: dict[str, Any]) -> list[dict[str, Any]]:
    """Pagamentos no crédito (a divisão de verdade, quando houver; senão os da nota)."""
    return [p for p in (c.get("cobrado") or {}).get("pagamentos") or c.get("pagamentos") or [] if e_credito(p)]


def conciliar(f: dict[str, Any], compras: list[dict[str, Any]], cartao: str, usadas: set[str]) -> None:
    """Liga cada linha de compra à compra do sistema: mesmo valor (ou a soma das parcelas), data de 1 dia depois a
    5 dias antes, no crédito. Achou no cartão certo → "compra"; achou marcada em outro cartão → "outro_cartao"
    (sugestão de troca, vai para o sino). `usadas` evita ligar duas linhas à mesma compra."""
    for l in f["linhas"]:
        if l["tipo"] != "compra" or (l["parcela"] and not l["parcela"].startswith("01/")):
            continue
        d = date.fromisoformat(l["data"])
        n = int(l["parcela"].split("/")[1]) if l["parcela"] else 1
        achada = None
        for c in compras:
            if c["id"] in usadas or c.get("excluida_em") or c.get("pedido"):  # pedido de loja online: liga pelo total do pedido
                continue
            pags = _credito(c)
            if not pags:
                continue
            dc = date.fromisoformat((c.get("emissao") or "")[:10] or "1900-01-01")
            if not -1 <= (d - dc).days <= 5:
                continue
            total = sum(p.get("valor") or 0 for p in pags) or c.get("valor_pago") or 0
            valor_ok = abs(total - l["valor"] * n) <= 0.02 + 0.02 * n or abs(total - l["valor"]) < 0.011
            # nome parecido, ou (sem nome parecido) mesmo dia e valor exato, à vista
            if valor_ok and (_parece(l["descricao"], c) or (d == dc and n == 1 and abs(total - l["valor"]) < 0.011)):
                outro = any(p.get("cartao") and p["cartao"] != cartao for p in pags)
                if not outro:
                    achada = ("compra", c)
                    if any(not p.get("cartao") for p in pags):
                        l["completar_cartao"] = True  # compra no crédito sem cartão escolhido: a fatura diz qual
                    break
                achada = achada or ("outro_cartao", c)
        if achada:
            l[achada[0]] = achada[1]["id"]
            usadas.add(achada[1]["id"])
