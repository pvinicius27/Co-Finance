"""CoFinance — constantes da integração."""
from __future__ import annotations

DOMAIN = "co_finance"
CONF_PASTA = "pasta"  # onde ficam dados/ e notas/ (padrão: /config/co_dados/co_finance)
CONF_WEBHOOK = "webhook"  # o código do webhook (a "senha" do Atalho do iPhone)
URL_CARDS = "/co_finance_cards"  # os cards (V3) servidos pela integração
PAINEL_URL = "co-finance"  # o item na barra lateral: /co-finance
PAINEL_TAG = "co-finance-panel"  # o componente do painel (definido no fim do co-finance-card.js, pelo montar.py)
PAINEL_TITULO = "Finanças"
PAINEL_ICONE = "mdi:wallet-outline"
VERSAO = "0.0.43"  # igual ao manifest.json (o montar.py confere)
