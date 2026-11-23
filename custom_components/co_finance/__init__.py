"""CoFinance — integração do Home Assistant (compras, cartões, faturas e contas da casa).

Lê o cupom fiscal pelo QR Code (Atalho do iPhone), guarda as compras, cartões, faturas e contas da casa e avisa no
celular. Os dados ficam numa pasta do HA (padrão /config/co_dados/co_finance: dados/ e notas/); o código da Central fica em
central/, ao lado deste arquivo, e os cards da tela em www/ (servidos pela própria integração: não precisa adicionar
recurso no painel). Tudo o que antes era o pacote de automações (webhook, avisos, lembretes) mora em ponte.py."""
from __future__ import annotations

import importlib
import logging
import os
import re
import shutil
from pathlib import Path
from typing import Any

import voluptuous as vol
from homeassistant.components import webhook
from homeassistant.components.frontend import add_extra_js_url
from aiohttp import web
from homeassistant.components.http import HomeAssistantView, StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, ServiceCall, ServiceResponse, SupportsResponse
from homeassistant.helpers.event import async_track_time_change

from .const import CONF_PASTA, CONF_WEBHOOK, DOMAIN, PAINEL_ICONE, PAINEL_TAG, PAINEL_TITULO, PAINEL_URL, URL_CARDS, VERSAO
from .ponte import Ponte

PASTA_CARDS = Path(__file__).parent / "www"
_LOG = logging.getLogger(__name__)


class _Vista(HomeAssistantView):
    """Base dos endereços de backup: só administrador; usa a instalação ativa (hass.data[DOMAIN])."""
    requires_auth = True

    def _ativa(self, request: web.Request) -> tuple[HomeAssistant, dict[str, Any]] | web.Response:
        hass: HomeAssistant = request.app["hass"]
        user = request.get("hass_user")
        if not user or not user.is_admin:
            return self.json({"ok": False, "mensagem": "Só o administrador pode fazer isso."}, status_code=403)
        ativa = hass.data.get(DOMAIN)
        if not ativa:
            return self.json({"ok": False, "mensagem": "O CoFinance não está carregado."}, status_code=503)
        return hass, ativa


class VistaExportar(_Vista):
    url = "/api/co_finance/exportar"
    name = "api:co_finance:exportar"

    async def get(self, request: web.Request) -> web.Response:
        r = self._ativa(request)
        if isinstance(r, web.Response):
            return r
        _hass, ativa = r
        nome, dados = await ativa["ponte"].exclusivo(ativa["backup"].exportar)
        return web.Response(body=dados, content_type="application/zip", headers={"Content-Disposition": f'attachment; filename="{nome}"'})


class VistaImportar(_Vista):
    url = "/api/co_finance/importar"
    name = "api:co_finance:importar"

    async def post(self, request: web.Request) -> web.Response:
        r = self._ativa(request)
        if isinstance(r, web.Response):
            return r
        hass, ativa = r
        conteudo = await request.read()
        try:
            res = await ativa["ponte"].exclusivo(ativa["backup"].importar, conteudo)
        except ativa["falha"] as e:
            return self.json({"ok": False, "mensagem": str(e)}, status_code=400)
        entry: ConfigEntry = ativa["entry"]
        cod = res.pop("codigo", "")
        if _COD.fullmatch(cod) and cod != entry.data[CONF_WEBHOOK]:
            # o Atalho do celular da instalação de origem continua valendo: adota o código que veio no backup
            hass.config_entries.async_update_entry(entry, data={**entry.data, CONF_WEBHOOK: cod})
            hass.async_create_task(hass.config_entries.async_reload(entry.entry_id))
        else:
            await ativa["ponte"].rodar({"acao": "atalho_codigo", "codigo": entry.data[CONF_WEBHOOK]})
        return self.json(res)


_COD = re.compile(r"[A-Za-z0-9_\-]{16,100}")


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    pasta = entry.data.get(CONF_PASTA) or hass.config.path("co_dados", "co_finance")
    os.environ["COMPRAS_DIR"] = pasta  # lido quando o código da Central é carregado (central/config.py)
    os.environ.setdefault("COMPRAS_ENERGIA_DIR", hass.config.path(".storage"))
    principal = await hass.async_add_executor_job(importlib.import_module, f"{__package__}.central.principal")
    ponte = Ponte(hass, principal.executar)
    desfazer: list[Any] = []

    # o código do webhook vai para os dados (o ⚙ › Atalho do iPhone mostra o endereço completo)
    await ponte.rodar({"acao": "atalho_codigo", "codigo": entry.data[CONF_WEBHOOK]})

    # serviços: o card conversa por "pedido"; "avisar" é o aviso do que entrou pelo card (Enviar nota, Lançar compra)
    async def svc_pedido(call: ServiceCall) -> ServiceResponse:
        return await ponte.rodar(dict(call.data["pedido"]))

    async def svc_avisar(call: ServiceCall) -> None:
        await ponte.avisar(tipo="compra", status=str(call.data.get("status") or "erro"), mensagem=str(call.data.get("mensagem") or ""),
                           quem=str(call.data.get("quem") or ""), id=str(call.data.get("id") or ""))
        ponte.diario(f"{call.data.get('mensagem', '')} (pelo card)")

    hass.services.async_register(DOMAIN, "pedido", svc_pedido, schema=vol.Schema({vol.Required("pedido"): dict}), supports_response=SupportsResponse.ONLY)
    hass.services.async_register(DOMAIN, "avisar", svc_avisar, schema=vol.Schema({vol.Optional("status"): str, vol.Optional("mensagem"): str,
                                                                                   vol.Optional("quem"): str, vol.Optional("id"): str}))

    # webhook do Atalho do iPhone, lembretes de hora em hora e respostas às notificações
    codigo = entry.data[CONF_WEBHOOK]  # guardado: se o código mudar (importar, opções), sai o que foi registrado
    webhook.async_register(hass, DOMAIN, "CoFinance", codigo, ponte.webhook, allowed_methods=["POST"], local_only=False)
    desfazer.append(lambda: webhook.async_unregister(hass, codigo))
    desfazer.append(async_track_time_change(hass, ponte.lembretes, minute=0, second=0))
    desfazer.append(hass.bus.async_listen("mobile_app_notification_action", ponte.acao_notificacao))
    desfazer.append(hass.bus.async_listen("imap_content", ponte.imap))  # pedidos de lojas online (só a caixa escolhida no ⚙)

    # os cards: servidos pela integração e carregados em todas as telas (sem adicionar recurso à mão)
    if not hass.data.get(f"{DOMAIN}_cards"):
        await hass.http.async_register_static_paths([StaticPathConfig(URL_CARDS, str(PASTA_CARDS), False)])
        add_extra_js_url(hass, f"{URL_CARDS}/co-finance-card.js?v={VERSAO}")
        hass.data[f"{DOMAIN}_cards"] = True

    # item na barra lateral (como o CoEnergy): instalar basta para ter a tela. O card continua para quem quer pôr numa
    # aba de um painel próprio. Se o painel não subir, a integração segue (o card e os avisos funcionam sem ele)
    if not hass.data.get(f"{DOMAIN}_painel"):
        try:
            from homeassistant.components import panel_custom
            await panel_custom.async_register_panel(hass, frontend_url_path=PAINEL_URL, webcomponent_name=PAINEL_TAG,
                                                    module_url=f"{URL_CARDS}/co-finance-card.js?v={VERSAO}", sidebar_title=PAINEL_TITULO,
                                                    sidebar_icon=PAINEL_ICONE, require_admin=False, embed_iframe=False)
            hass.data[f"{DOMAIN}_painel"] = True
        except Exception:  # noqa: BLE001 - a tela é acessório; os dados não são
            _LOG.exception("CoFinance: não deu para pôr o item na barra lateral")

    # backup: Exportar / Importar no ⚙ do card (os endereços ficam registrados; a instalação ativa vem de hass.data)
    backup = await hass.async_add_executor_job(importlib.import_module, f"{__package__}.central.exportar")
    base = await hass.async_add_executor_job(importlib.import_module, f"{__package__}.central.base")
    hass.data[DOMAIN] = {"ponte": ponte, "entry": entry, "backup": backup, "falha": base.Falha}
    if not hass.data.get(f"{DOMAIN}_vistas"):
        hass.http.register_view(VistaExportar())
        hass.http.register_view(VistaImportar())
        hass.data[f"{DOMAIN}_vistas"] = True

    entry.runtime_data = desfazer
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    for f in entry.runtime_data or []:
        f()
    for s in ("pedido", "avisar"):
        hass.services.async_remove(DOMAIN, s)
    hass.data.pop(DOMAIN, None)
    return True


def _apagar_dados(raiz: str, pasta: str) -> str:
    """Apaga a pasta dos dados ao remover a integração (não fica resquício). Só apaga dentro de /config/co_dados/:
    uma pasta escolhida à mão em outro lugar (ou a própria /config) nunca é apagada. Tira também a co_dados se ficar vazia."""
    base = Path(raiz).resolve()
    alvo = Path(pasta).resolve()
    if base not in alvo.parents:
        return f"pasta fora de {base}, não apagada: {alvo}"
    if alvo.exists():
        shutil.rmtree(alvo)
    try:
        base.rmdir()  # só sai se estiver vazia (outras integrações podem morar ali)
    except OSError:
        pass
    return f"dados apagados: {alvo}"


async def async_remove_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Removeu a integração: tira o item da barra lateral e apaga os dados (compras, cadastros, notas e backups).
    Quem quer guardar exporta antes (⚙ › Backup e mudança de HA)."""
    if hass.data.pop(f"{DOMAIN}_painel", None):
        from homeassistant.components import frontend
        frontend.async_remove_panel(hass, PAINEL_URL)
    pasta = entry.data.get(CONF_PASTA) or hass.config.path("co_dados", "co_finance")
    try:
        _LOG.warning("CoFinance removido: %s", await hass.async_add_executor_job(_apagar_dados, hass.config.path("co_dados"), pasta))
    except OSError:
        _LOG.exception("CoFinance: não deu para apagar a pasta dos dados %s", pasta)
