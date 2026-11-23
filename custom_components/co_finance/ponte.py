"""O que antes ficava no pacote de automações (packages/compras.yaml), agora dentro da integração: o webhook do Atalho do
iPhone, os avisos no celular, os lembretes de hora em hora e as respostas às notificações (✓ Paguei e Apple Pay).
A regra de quem recebe cada aviso é da Central (⚙ › Pessoas e ⚙ › Avisos): aqui só se entrega o que ela devolve."""
from __future__ import annotations

import asyncio
import logging
import re
from typing import Any, Callable

from aiohttp import web
from homeassistant.core import Event, HomeAssistant

from .const import DOMAIN

_LOG = logging.getLogger(__name__)


class Ponte:
    def __init__(self, hass: HomeAssistant, executar: Callable[[dict[str, Any]], dict[str, Any]]) -> None:
        self.hass = hass
        self._executar = executar
        self._trava = asyncio.Lock()  # um pedido por vez: o código da Central foi feito para rodar um de cada vez
        self._trava_imap = asyncio.Lock()  # um aviso de e-mail por vez (cada um revisa os últimos 10 da caixa)

    async def rodar(self, pedido: dict[str, Any]) -> dict[str, Any]:
        async with self._trava:
            return await self.hass.async_add_executor_job(self._executar, pedido)

    async def exclusivo(self, funcao: Callable[..., Any], *args: Any) -> Any:
        """Outra função do motor (exportar/importar), na mesma fila dos pedidos."""
        async with self._trava:
            return await self.hass.async_add_executor_job(funcao, *args)

    # ---------------------------------------------------------------- entregar os avisos
    async def entregar(self, avisos: list[dict[str, Any]] | None) -> None:
        """[{servico: notify.mobile_app_…, titulo, mensagem, dados}] → cada celular. Um que falhar não impede os outros."""
        for a in avisos or []:
            servico = str(a.get("servico") or "")
            if "." not in servico:
                continue
            dominio, nome = servico.split(".", 1)
            dados: dict[str, Any] = {"message": a.get("mensagem") or ""}
            if a.get("titulo"):
                dados["title"] = a["titulo"]
            if a.get("dados"):
                dados["data"] = a["dados"]
            try:
                await self.hass.services.async_call(dominio, nome, dados, blocking=False)
            except Exception as e:  # app desinstalado, celular renomeado...
                _LOG.warning("CoFinance: aviso para %s não foi entregue (%s)", servico, e)

    async def avisar(self, **pedido: Any) -> None:
        r = await self.rodar({"acao": "avisar", **pedido})
        await self.entregar(r.get("avisar"))

    def diario(self, mensagem: str) -> None:
        try:
            from homeassistant.components.logbook import async_log_entry
            async_log_entry(self.hass, "CoFinance", mensagem, domain=DOMAIN)
        except Exception:  # sem o diário (logbook) instalado
            pass

    # ---------------------------------------------------------------- webhook do Atalho do iPhone
    async def webhook(self, hass: HomeAssistant, webhook_id: str, request: web.Request) -> web.Response:
        try:
            j = await request.json()
        except ValueError:
            j = {}
        if not isinstance(j, dict):
            j = {}
        hass.async_create_task(self._cupom(j))  # responde já: a SEFAZ pode demorar
        return web.Response(status=200)

    async def _cupom(self, j: dict[str, Any]) -> None:
        acao = str(j.get("acao") or "").strip().lower()
        quem = str(j.get("quem") or "")
        e_consulta = acao in ("consultar", "consulta") or (not acao and ("codigo" in j or "termo" in j))
        if e_consulta:  # "Já comprei?"
            pedido = {"acao": "consultar", "codigo": j.get("codigo", ""), "termo": j.get("termo", ""), "quem": quem}
        elif acao == "applepay":  # automação "Transação" do Atalhos
            pedido = {"acao": "applepay", **{k: str(j.get(k) or "") for k in ("valor", "loja", "cartao", "quem")}}
        elif acao == "pedaco":  # nota grande (página do portal / XML) em pedaços
            pedido = {"acao": "pedaco", **{k: j.get(k) for k in ("envio", "n", "total", "dados", "tipo", "quem")}, "reembolso": j.get("reembolso", False)}
        else:
            pedido = {"acao": "registrar", "url": j.get("url", ""), "quem": quem, "reembolso": j.get("reembolso", False)}
        if acao not in ("applepay",) and not e_consulta and (acao != "pedaco" or int(j.get("n") or 0) == 1):
            u = str(j.get("url") or "")
            self.diario(f"Recebido do iPhone: quem='{quem[:40]}', " + (f"nota ({j.get('tipo', '')}) em {j.get('total', '?')} pedaço(s)" if acao == "pedaco"
                                                                         else f"url='{u.split('?')[0][:45]}…'"))
        r = await self.rodar(pedido)
        if r.get("status") == "parcial":  # pedaços do meio não avisam
            return
        await self.avisar(tipo="applepay" if r.get("status") == "applepay" else "compra", status=r.get("status"), titulo=r.get("titulo", ""),
                          mensagem=r.get("mensagem", ""), quem=r.get("quem") or quem.title(), id=r.get("id", ""))
        if r.get("status") not in ("consulta", "applepay"):
            self.diario(str(r.get("mensagem") or ""))

    # ---------------------------------------------------------------- lembretes de contas e faturas (de hora em hora)
    async def lembretes(self, agora: Any) -> None:
        r = await self.rodar({"acao": "lembretes", "hora": str(agora.hour)})
        await self.entregar(r.get("avisar"))

    # ---------------------------------------------------------------- pedidos de lojas online pelo e-mail (integração IMAP)
    async def imap(self, ev: Event) -> None:
        """A integração IMAP avisa só o e-mail mais recente: busca os últimos 10 da caixa (do mais antigo ao mais novo) e
        entrega à Central os que parecem pedido. Só a caixa escolhida em ⚙ › Pedidos online; as outras caixas do HA ficam de fora.
        O que já foi lançado volta "repetido", sem gravar; o que não é pedido não é marcado como lido."""
        d = ev.data
        usuario, entrada, ultimo = str(d.get("username") or "").lower(), d.get("entry_id"), int(d.get("uid") or 0)
        if not usuario or not entrada or not ultimo:
            return
        async with self._trava_imap:
            cx = (await self.rodar({"acao": "pedidos_caixa"})).get("caixa") or ""
            if cx != usuario:
                return
            for uid in range(max(ultimo - 9, 1), ultimo + 1):
                try:
                    msg = await self.hass.services.async_call("imap", "fetch", {"entry": entrada, "uid": str(uid)},
                                                              blocking=True, return_response=True) or {}
                except Exception:  # noqa: BLE001 - apagado, movido...
                    continue
                eu = uid == ultimo
                remetente, assunto = str(msg.get("sender") or ""), str(msg.get("subject") or "")
                corpo = _texto(str(msg.get("text") or ""))
                if len(corpo) <= 50 or not _parece_pedido(remetente, assunto, corpo):
                    continue
                r = await self.rodar({"acao": "pedido_email", "via": "email", "html": corpo, "remetente": remetente, "assunto": assunto,
                                      "quando": str((d.get("date") if eu else msg.get("date")) or "")})
                st = r.get("status")
                if st == "ignorado":
                    continue
                try:
                    await self.hass.services.async_call("imap", "seen", {"entry": entrada, "uid": str(uid)}, blocking=True)
                except Exception:  # noqa: BLE001
                    pass
                if eu or not r.get("silencioso"):
                    await self.avisar(tipo="compra", status=st, mensagem=r.get("mensagem", ""), quem=r.get("quem", ""),
                                      id=r.get("id", ""), pedido=r.get("pedido", ""))
                if eu or st != "repetido":
                    self.diario(f"Pedido por e-mail: {r.get('mensagem', '')}")

    # ---------------------------------------------------------------- respostas às notificações
    async def acao_notificacao(self, ev: Event) -> None:
        acao = str(ev.data.get("action") or "")
        if acao.startswith("COMPRAS_AP_"):  # Apple Pay: [Lançar sem cupom] (com o "O que foi?") ou [Tenho cupom]
            partes = acao.split("|")
            decisao = "lancar" if partes[0] == "COMPRAS_AP_LANCAR" else "cupom"
            r = await self.rodar({"acao": "applepay_decidir", "id": partes[1] if len(partes) > 1 else "", "decisao": decisao,
                                  "item": str(ev.data.get("reply_text") or "")})
            await self.avisar(tipo="applepay_resp", decisao=decisao, ok=bool(r.get("ok")), mensagem=r.get("mensagem", ""), quem=r.get("quem", ""))
            self.diario(f"Apple Pay: {r.get('mensagem', '')}")
        elif acao.startswith("COMPRAS_CARTAO|"):  # 💳 Como pagou?: COMPRAS_CARTAO|<compra>|<pagamento (-1 = criar)>|<cartão>|<forma C/D/A/P/$>
            partes = (acao.split("|") + [""] * 5)[:5]
            r = await self.rodar({"acao": "cartao_aviso", "id": partes[1], "pg": partes[2], "cartao": partes[3], "forma": partes[4]})
            await self.avisar(tipo="cartao_resp", id=partes[1], ok=bool(r.get("ok")), mensagem=r.get("mensagem", ""), quem=r.get("quem", ""))
            self.diario(f"Cartão pelo aviso: {r.get('mensagem', '')}")
        elif acao.startswith("COMPRAS_KM|"):  # km do painel respondido no aviso do abastecimento ("52300" ou "52300 cheio")
            item = acao.split("|", 1)[1]
            r = await self.rodar({"acao": "km", "id": item, "km": str(ev.data.get("reply_text") or "")})
            await self.avisar(tipo="km_resp", id=item, ok=bool(r.get("ok")), mensagem=r.get("mensagem", ""))
            self.diario(f"Km pelo aviso: {r.get('mensagem', '')}")
        elif acao.startswith("COMPRAS_PAGUEI|"):  # ✓ Paguei
            item = acao.split("|", 1)[1]
            r = await self.rodar({"acao": "pagar", "id": item, "via": "aviso"})
            await self.avisar(tipo="paguei", id=item, ok=bool(r.get("ok")), mensagem=r.get("mensagem", ""))
            self.diario(f"{r.get('mensagem', '')} (pelo aviso)")


def _texto(html: str) -> str:
    """O corpo em HTML vira texto (a Central termina a limpeza)."""
    t = re.sub(r"(?is)<(style|script|head)\b.*?</\1>", " ", html)
    t = re.sub(r"(?i)<br\s*/?>|</(p|div|tr|td|th|li|h[1-6]|table)>", "\n", t)
    t = re.sub(r"<[^>]+>", " ", t)
    t = re.sub(r"[ \t\r\u00a0]+", " ", t)
    return re.sub(r"\n( ?\n)+", "\n", t)


def _parece_pedido(remetente: str, assunto: str, corpo: str) -> bool:
    r, s, c = remetente.lower(), assunto.lower(), corpo.lower()
    return ("info@mail.shopee.com.br" in r or "recebemos seu pedido" in s or "confirmação de pagamento" in s
            or "confirmacao de pagamento" in s or ("id do pedido" in c and "shopee" in c)
            or "@amazon.com.br" in r or ("amazon.com.br" in c and ("pedido nº" in c or "número do pedido" in c))
            or "shop.tiktok.com" in r or ("tiktok" in c and ("id do pedido" in c or "cancelamento do pedido" in c))
            or "mercadolivre.com.br" in r or ("mercado livre" in c and "você comprou de" in c)
            or "7me.app" in r or ("7me" in s and "transa" in s))
