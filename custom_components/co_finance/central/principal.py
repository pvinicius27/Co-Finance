"""Ações que o Home Assistant chama (tabela ACOES) e a entrada main()."""
from __future__ import annotations

import base64
import json
from typing import Any
import sys

from .base import Falha
from .categorias import arvore, bem, completar_categorias, ligar_bens, recategorizar, regra, regras
from .cartoes import cartao, final_cartao, financeiro, lembretes, pagar
from .pessoas import pessoa
from .contas_casa import conta_casa, conta_mes
from .registro import pedaco, registrar
from .produtos import consultar, definir_tipo, desvincular, produto, produtos, vincular
from .lista import anexar, apelido, desfazer_pago, detalhe, editar, excluir, listar, marcar_pago, mudanca, pagamento_lote, recuperar, apagar_excluida
from .avisos import atalho_codigo, avisar, bem_salvar, config_atalho, config_avisos, pagamento_telefones
from .lancamento import manual
from .veiculo import km
from .pedidos import pedido_decidir, pedido_email, pedidos_caixa, pedidos_config, pedidos_importar, pedidos_importar_desfazer
from .applepay import applepay, applepay_decidir
from .contas_agua import agua, agua_ler
from .energia import luz, luz_apagar, luz_ler
from .faturas_banco import fatura_apagar, fatura_ler, faturas_banco
from .financiamento import (financiamento, financiamento_ajustar, financiamento_apagar, financiamento_ler, financiamento_pago,
                            financiamento_simular)
from .importar_faturas import faturas_classificar, faturas_importar, faturas_lojas, faturas_lote, faturas_previa
from .painel import itens, painel, visao
from .cartao_aviso import cartao_aviso
from .manutencao import completar_bandeiras, completar_codigos, completar_notas, consulta, nota, reler_nfe


ACOES = {"completar_codigos": completar_codigos, "completar_bandeiras": completar_bandeiras, "registrar": registrar,
         "nota": nota, "consulta": consulta, "consultar": consultar, "pedaco": pedaco, "reler_nfe": reler_nfe, "recategorizar": recategorizar, "bem": bem, "ligar_bens": ligar_bens, "completar_notas": completar_notas, "completar_categorias": completar_categorias, "listar": listar, "detalhe": detalhe, "marcar_pago": marcar_pago,
         "desfazer_pago": desfazer_pago, "editar": editar, "pagamento_lote": pagamento_lote, "avisar": avisar, "config_avisos": config_avisos,
         "config_atalho": config_atalho, "bem_salvar": bem_salvar, "atalho_codigo": atalho_codigo, "apelido": apelido, "definir_tipo": definir_tipo, "manual": manual, "excluir": excluir, "recuperar": recuperar, "km": km, "apagar_excluida": apagar_excluida, "anexar": anexar,
         "produtos": produtos, "produto": produto, "vincular": vincular, "desvincular": desvincular, "visao": visao, "painel": painel, "itens": itens,
         "regras": regras, "regra": regra, "arvore": arvore,
         "financeiro": financeiro, "pagar": pagar, "lembretes": lembretes, "cartao": cartao, "final_cartao": final_cartao, "pessoa": pessoa, "conta_casa": conta_casa, "conta_mes": conta_mes,
         "applepay": applepay, "applepay_decidir": applepay_decidir, "cartao_aviso": cartao_aviso, "agua": agua, "agua_ler": agua_ler, "luz": luz, "luz_ler": luz_ler, "luz_apagar": luz_apagar, "mudanca": mudanca,
         "fatura_ler": fatura_ler, "faturas_banco": faturas_banco, "fatura_apagar": fatura_apagar,
         "financiamento": financiamento, "financiamento_ler": financiamento_ler, "financiamento_simular": financiamento_simular,
         "financiamento_pago": financiamento_pago, "financiamento_ajustar": financiamento_ajustar, "financiamento_apagar": financiamento_apagar,
         "faturas_previa": faturas_previa, "faturas_importar": faturas_importar, "faturas_lote": faturas_lote,
         "faturas_lojas": faturas_lojas, "faturas_classificar": faturas_classificar,
         "pedido_email": pedido_email, "pedidos_config": pedidos_config, "pedidos_caixa": pedidos_caixa, "pagamento_telefones": pagamento_telefones, "pedido_decidir": pedido_decidir,
         "pedidos_importar": pedidos_importar, "pedidos_importar_desfazer": pedidos_importar_desfazer}


def executar(payload: dict[str, Any]) -> dict[str, Any]:
    """Um pedido ({"acao": ..., ...}) → a resposta. Usado pela integração do HA e pelo main (shell_command)."""
    try:
        acao = payload.get("acao", "registrar")
        if acao not in ACOES:
            raise Falha(f"Ação desconhecida: {acao}")
        return ACOES[acao](payload)
    except Falha as e:
        return {"ok": False, "status": "erro", "mensagem": str(e)}
    except Exception as e:  # erro inesperado: não perde nada, só avisa
        return {"ok": False, "status": "erro", "mensagem": f"Erro inesperado ao registrar ({type(e).__name__}). Me avise."}


def main() -> int:
    raw = sys.argv[1] if len(sys.argv) > 1 else ""
    try:
        try:
            payload = json.loads(base64.b64decode(raw).decode("utf-8"))
        except Exception:
            payload = json.loads(raw)
    except Exception:
        payload = {"acao": "?"}
    print(json.dumps(executar(payload), ensure_ascii=False))
    return 0
