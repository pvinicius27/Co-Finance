"""Utilidades comuns: erro, datas, números, textos e nomes de loja."""
from __future__ import annotations

import html
import re
import unicodedata
from datetime import datetime
from datetime import timezone
from typing import Any

from .config import MOEDAS


class Falha(Exception):
    """Erro com mensagem pronta para a notificação."""


def now_iso() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


# Apelido de cada loja {CNPJ: nome}, carregado junto com os dados e usado em todo nome de loja que sai daqui.
_APELIDOS: dict[str, str] = {}


def js_string(s: str) -> str:
    """Desfaz o escape de uma string JavaScript entre aspas simples."""
    esc = {"n": "\n", "t": "\t", "r": "\r", "b": "\b", "f": "\f", "v": "\v", "0": "\0"}

    def rep(m: re.Match) -> str:
        c = m.group(1)
        if c.startswith("u"):
            return chr(int(c[1:], 16))
        if c.startswith("x"):
            return chr(int(c[1:], 16))
        return esc.get(c, c)
    return re.sub(r"\\(u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|.)", rep, s, flags=re.S)


def txt(fragment: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", fragment or ""))).strip()


def num(v: str) -> float | None:
    v = (v or "").strip().replace(".", "").replace(",", ".")
    try:
        return round(float(v), 4)
    except ValueError:
        return None


def gtin_valido(code: str) -> bool:
    if not re.fullmatch(r"\d{8}|\d{12,14}", code or "") or set(code) == {"0"}:
        return False
    digits = [int(c) for c in code]
    soma = sum(d * (3 if i % 2 == 0 else 1) for i, d in enumerate(reversed(digits[:-1])))
    return (10 - soma % 10) % 10 == digits[-1]


def fmt_brl(v: float | None) -> str:
    if v is None:
        return "?"
    return f"R$ {v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def nome_curto(loja: str) -> str:
    s = re.sub(r"(?i)(\bLTDA\b\.?|\bS\.?/?A\b\.?|\bEIRELI\b|\b(ME|EPP)\s*$|\bCOM[EÉ]RCIO DE\b)", "", loja or "")
    s = re.sub(r"\s+", " ", s).strip(" -.,")
    if s.isupper():
        s = s.title()
        s = re.sub(r"(?<=\s)(E|A|De|Da|Do|Das|Dos)(?=\s)", lambda m: m.group(1).lower(), s)
    return s


def apelido_da_loja(apelidos: dict[str, str], cnpj: str) -> str:
    """O nome salvo para a loja: o da filial (CNPJ completo, de antes) ou o da empresa (8 primeiros dígitos)."""
    cnpj = str(cnpj or "")
    return (apelidos.get(cnpj) or apelidos.get(cnpj[:8]) or "") if len(cnpj) >= 8 else ""


def nome_loja(loja: dict[str, Any]) -> str:
    """Apelido que vocês deram para a loja (pelo CNPJ) ou o nome da nota, encurtado."""
    return apelido_da_loja(_APELIDOS, loja.get("cnpj") or "") or nome_curto(loja.get("nome", ""))


# prefixos que a maquininha/carteira põe na frente do nome no Apple Pay ("PG *BECONFIDENT", "MP * Faberpastel")
_PREFIXO_AP = re.compile(r"^\s*(?:PG|MP|PAG|PAGSEG|PAGSEGURO|PROPIG|IFD|IFOOD|ZP|PTY|SUMUP|STONE|EC|JIM\.?COM|PICPAY|MERCPAGO|EBN)\s*\*\s*", re.I)


def nome_do_applepay(nome: str) -> str:
    """O nome do comerciante no Apple Pay, limpo; "" quando não serve para nome de loja ("Parc=103561 Df Brasilia P")."""
    s = re.sub(r"\s+", " ", _PREFIXO_AP.sub("", str(nome or ""))).strip()
    if not s or re.search(r"(?i)parc\s*=|^\d", s) or len(re.sub(r"[^A-Za-zÀ-ÿ]", "", s)) < 3:
        return ""
    return s[:40] if any(ch.islower() for ch in s) else nome_curto(s)


def nome_da_regra_fatura(db: dict[str, Any], nome: str) -> str:
    """O nome que vocês escolheram para a loja na regra da fatura (⚙ › lojas da fatura), pelo nome do comerciante:
    a chave igual, ou o começo dela quando só uma regra serve. "" se não há regra com nome."""
    from .faturas import chave_loja
    regras = db.get("categoria_fatura") or {}
    ch = chave_loja(nome or "")
    if len(ch) < 4:
        return ""
    r = regras.get(ch)
    if not r and len(ch) >= 8:
        cands = [v for k, v in regras.items() if len(k) >= 8 and (k.startswith(ch) or ch.startswith(k))]
        r = cands[0] if len(cands) == 1 else None
    return str(r[2]).strip()[:40] if isinstance(r, list) and len(r) > 2 and r[2] else ""


def adotar_nome_applepay(db: dict[str, Any], loja: dict[str, Any], nome_ap: str) -> str:
    """Nota ligada a um Apple Pay: se a empresa ainda não tem nome salvo, o do Apple Pay vira o nome dela. Devolve o nome
    adotado ("" se não mudou nada). O nome salvo à mão nunca é trocado. Se a loja tem regra na fatura com nome
    ("SELFBR" → "Mercadinho Verano"), vale o nome da regra."""
    cnpj = str((loja or {}).get("cnpj") or "")
    nome = nome_da_regra_fatura(db, nome_ap) or nome_do_applepay(nome_ap)
    if len(cnpj) < 8 or not nome or apelido_da_loja(db.setdefault("apelidos", {}), cnpj):
        return ""
    if norm_txt(nome) == norm_txt(nome_curto((loja or {}).get("nome", ""))):
        return ""
    db["apelidos"][cnpj[:8]] = nome
    _APELIDOS[cnpj[:8]] = nome
    return nome


def _valor_txt(v: Any) -> float | None:
    if isinstance(v, (int, float)):
        return float(v)
    t = re.sub(r"(?i)R\$|US\$|\$|€", "", str(v or "")).strip()
    if re.fullmatch(r"\d+\.\d{1,2}", t):  # "413.01" (jeito americano): ponto é a vírgula
        return float(t)
    return num(t)


def fmt_moeda(m: dict[str, Any]) -> str:
    return MOEDAS.get(m.get("cod"), m.get("cod", "")) + " " + fmt_brl(m.get("valor")).replace("R$", "").strip()


def norm_txt(s: str) -> str:
    s = unicodedata.normalize("NFD", s or "").encode("ascii", "ignore").decode().upper()
    return re.sub(r"\s+", " ", re.sub(r"[^A-Z0-9]+", " ", s)).strip()


def _data_curta(iso: str | None) -> str:
    m = re.match(r"(\d{4})-(\d{2})-(\d{2})", iso or "")
    return f"{m[3]}/{m[2]}/{m[1][2:]}" if m else "?"
