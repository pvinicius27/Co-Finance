"""Instalação pela tela (Configurações › Dispositivos e serviços › Adicionar integração › CoFinance).

Pergunta só a pasta dos dados (padrão /config/co_dados/co_finance). O código do webhook (a "senha" do Atalho do iPhone) é criado
sozinho; se já existir um nos dados (instalação de antes), ele é adotado e o Atalho não muda. Nas opções dá para
gerar um código novo (se o antigo vazar)."""
from __future__ import annotations

import json
import re
import secrets
from pathlib import Path
from typing import Any

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.core import callback

from .const import CONF_PASTA, CONF_WEBHOOK, DOMAIN

_COD = re.compile(r"[A-Za-z0-9_\-]{16,100}")


def _novo_codigo() -> str:
    return f"cofinance_{secrets.token_urlsafe(24)}"


def _codigo_dos_dados(pasta: str) -> str:
    """O código que a instalação de antes já usava (guardado em dados/compras.json › atalho › codigo)."""
    try:
        cod = json.loads((Path(pasta) / "dados" / "compras.json").read_text(encoding="utf-8")).get("atalho", {}).get("codigo") or ""
    except (OSError, ValueError, AttributeError):
        return ""
    return cod if _COD.fullmatch(cod) else ""


class FluxoCentral(config_entries.ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, entrada: dict[str, Any] | None = None):
        await self.async_set_unique_id(DOMAIN)
        self._abort_if_unique_id_configured()
        padrao = self.hass.config.path("co_dados", "co_finance")
        erros: dict[str, str] = {}
        if entrada is not None:
            pasta = str(entrada.get(CONF_PASTA) or padrao).rstrip("/")
            if not pasta.startswith("/"):
                erros[CONF_PASTA] = "pasta"
            else:
                cod = await self.hass.async_add_executor_job(_codigo_dos_dados, pasta) or _novo_codigo()
                return self.async_create_entry(title="CoFinance", data={CONF_PASTA: pasta, CONF_WEBHOOK: cod})
        return self.async_show_form(step_id="user", data_schema=vol.Schema({vol.Required(CONF_PASTA, default=padrao): str}), errors=erros)

    @staticmethod
    @callback
    def async_get_options_flow(entry: config_entries.ConfigEntry):
        return OpcoesCentral()


class OpcoesCentral(config_entries.OptionsFlow):
    """Gerar um código novo para o Atalho do iPhone (o endereço antigo para de funcionar)."""

    async def async_step_init(self, entrada: dict[str, Any] | None = None):
        if entrada is not None:
            if entrada.get("novo_codigo"):
                self.hass.config_entries.async_update_entry(self.config_entry, data={**self.config_entry.data, CONF_WEBHOOK: _novo_codigo()})
                self.hass.async_create_task(self.hass.config_entries.async_reload(self.config_entry.entry_id))
            return self.async_create_entry(data={})
        return self.async_show_form(step_id="init", data_schema=vol.Schema({vol.Optional("novo_codigo", default=False): bool}))
