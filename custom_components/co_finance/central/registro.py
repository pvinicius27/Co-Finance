"""Registrar nota nova (QR Code, arquivo, pedaços enviados pelo atalho)."""
from __future__ import annotations

import base64
import re
import shutil
from typing import Any

from .config import DATA_DIR, NOTAS_DIR
from .base import Falha, fmt_brl, nome_loja, norm_txt, now_iso
from .dados import apelidos_de, compradores, file_lock, load_db, pessoas, save_db
from .categorias import _aplicar_classe, classe_para, ligar_bem
from .pagamentos import pago_com
from .cartoes import sugerir_cartao
from .nfce import (
    aplicar_detalhada,
    aplicar_pagamentos,
    baixar_nota,
    chave_do_link,
    ler_detalhada,
    ler_nota,
    ler_pagamentos_detalhada,
)
from .copia import gravar_copia, salvar_copia
from .nfe import PORTAL_NFE, copia_portal, copia_xml, ler_portal_nfe, ler_xml_nfe
from .nfse import (baixar_danfse, copia_issnet, copia_nfse_xml, issnet_consulta, link_danfse, ler_nfse_issnet, ler_nfse_texto,
                   ler_nfse_xml, texto_pdf)
from .danfe import e_danfe, ler_danfe_texto
from .lista import anexar
from .juntar import juntar
from .pedidos import encaixar_nota_nova


def texto_do_pedido(ped: dict[str, Any], compra: dict[str, Any]) -> str:
    v = (compra.get("cobrado") or {}).get("valor")
    return (f" · do pedido {ped['loja']} de {str(ped['data'])[8:10]}/{str(ped['data'])[5:7]}"
            + (f" (pago de verdade: {fmt_brl(v)}; confira no sino)" if v is not None and abs(v - (compra.get("valor_pago") or 0)) > 0.005 else ""))


def quem_e_reembolso(payload: dict[str, Any]) -> tuple[str, str]:
    # O Atalho manda a opção escolhida na lista, ex.: "Ana — pagou do bolso" (reembolsar), "Ana — sem reembolso" ou
    # "Ana — a receber" (alguém vai pagar de volta: de quem, vocês completam no card). Devolve (quem, situação do reembolso).
    escolha = str(payload.get("quem") or "").strip()
    primeira = (norm_txt(escolha).split() or [""])[0]
    quem = next((x["nome"] for x in pessoas() if primeira in apelidos_de(x)), primeira.title())
    if quem not in compradores():
        raise Falha(f"Quem comprou? Use {', '.join(compradores())}. Recebi: '{escolha[:40]}'.")
    if str(payload.get("reembolso")).strip().lower() == "a_receber" or re.search(r"(?i)\ba\s+receber\b", escolha):
        return quem, "a_receber"
    if re.search(r"(?i)\bsem\s+reembols", escolha):
        return quem, "nao"
    if pessoa_reembolsa(quem):  # ⚙ › Pessoas › "Compras desta pessoa entram como: a reembolsar"
        return quem, "a_reembolsar"
    reembolso = (str(payload.get("reembolso")).strip().lower() in ("true", "1", "sim", "yes", "on", "a_reembolsar")
                 or (bool(re.search(r"(?i)reembols|\bdo bolso\b", escolha))
                     and not re.search(r"(?i)\bsem\s+reembols", escolha)))
    return quem, "a_reembolsar" if reembolso else "nao"


def pessoa_reembolsa(quem: str) -> bool:
    return any(x["nome"] == quem and x.get("reembolso") for x in pessoas())


def reembolso_novo(situacao: str, de: str = "") -> dict[str, Any]:
    """O reembolso de uma compra nova: nao, a_reembolsar (devemos a quem comprou) ou a_receber (de alguém)."""
    if situacao == "a_receber":
        return {"status": "a_receber", "pago_em": None, "de": de.strip()[:60]}
    return {"status": "a_reembolsar" if situacao == "a_reembolsar" else "nao", "pago_em": None}


RECEBER_TXT = {"a_reembolsar": " · a reembolsar", "a_receber": " · a receber"}


def registrar(payload: dict[str, Any]) -> dict[str, Any]:
    if payload.get("tipo") in ("portal", "xml", "pdf"):  # nota comum (NF-e) ou XML, pelo Compartilhar do Atalho
        return registrar_nota(payload)
    quem, reembolso = quem_e_reembolso(payload)
    chave, link = chave_do_link(str(payload.get("url") or ""))

    with file_lock():
        db = load_db()
        velho = next((c for c in db["compras"] if c.get("chave") == chave), None)
        if velho:
            return {"ok": True, "status": "repetida", "id": chave, "quem": velho.get("quem"),
                    "loja": nome_loja(velho["loja"]), "valor": velho.get("valor_pago"),
                    "mensagem": f"Esse cupom já estava registrado: {nome_loja(velho['loja'])}, "
                                f"{fmt_brl(velho.get('valor_pago'))} ({velho.get('quem')})."}

    nota_html, det_html = baixar_nota(chave, link)  # fora do lock: pode demorar
    nota = ler_nota(nota_html, chave)
    aplicar_detalhada(nota["itens"], ler_detalhada(det_html))
    aplicar_pagamentos(nota["pagamentos"], ler_pagamentos_detalhada(det_html))

    with file_lock():
        db = load_db()
        if any(c.get("chave") == chave for c in db["compras"]):
            return {"ok": True, "status": "repetida", "id": chave, "mensagem": "Esse cupom já estava registrado."}
        cat, sub, via = classe_para(db, nota["loja"], nota["itens"])
        compra = {
            "id": chave, "chave": chave, "origem": "nfce", "link": link,
            "quem": quem,
            "reembolso": reembolso_novo(reembolso),
            "categoria": cat, "subcategoria": sub, "classe_via": via,
            **nota,
            "registrado_em": now_iso(),
        }
        categoria = cat
        do_pedido = encaixar_nota_nova(db, compra)  # loja online: a nota é uma parte de um pedido que veio por e-mail
        juntada = None if do_pedido else juntar(db, compra)
        categoria = compra["categoria"]
        if not juntada and not do_pedido:
            sugerir_cartao(db, compra)
        db["compras"].append(compra)
        db["compras"].sort(key=lambda c: c.get("emissao") or "", reverse=True)
        save_db(db)
    try:  # a cópia é um extra: se falhar, a compra já está gravada
        salvar_copia(chave, nota_html, det_html, "QR Code")
        _ligar_depois(chave)
    except Exception:
        pass

    loja = nome_loja(nota["loja"])
    msg = f"{loja} · {fmt_brl(nota['valor_pago'])} · {nota['qtd_itens']} {'item' if nota['qtd_itens'] == 1 else 'itens'} · {quem}"
    msg += RECEBER_TXT.get(reembolso, "")
    if juntada:
        msg += f" · juntei com {'a compra do Apple Pay' if juntada.get('via') == 'applepay' else 'o lançamento à mão'} de {str(juntada.get('emissao') or '')[8:10]}/{str(juntada.get('emissao') or '')[5:7]}"
    if do_pedido:
        msg += texto_do_pedido(do_pedido, compra)
    if any(p["deduzido"] for p in pago_com(compra)):
        msg += " · Alelo (deduzido: débito sem bandeira na nota)"
    if not nota["conferencia"]["bate"]:
        msg += " · ⚠ soma dos itens não bate com o total"
    return {"ok": True, "status": "nova", "id": chave, "quem": quem, "loja": loja,
            "valor": nota["valor_pago"], "itens": nota["qtd_itens"], "reembolso": reembolso == "a_reembolsar",
            "categoria": categoria, "mensagem": msg}


# O que vem de cada fonte, do mais completo ao menos: uma nota já gravada só é substituída por fonte igual ou melhor.
FONTE_NIVEL = {"xml": 3, "portal": 2, "nfce": 2, "pdf": 2, "danfe": 1}


def _ligar_depois(chave: str) -> None:
    """Depois de salvar a cópia da nota: liga a compra ao bem (placa/chassi/KM estão na cópia)."""
    with file_lock():
        db = load_db()
        c = next((x for x in db["compras"] if x.get("chave") == chave), None)
        if c and ligar_bem(db, c):
            veic = {b["id"] for b in db.get("bens") or [] if b.get("tipo") == "veiculo"}
            if c.get("bem") in veic and c.get("categoria") == "Outros" and not c.get("categoria_manual"):
                _aplicar_classe(c, "Carro", "Manutenção e revisão", "bem")  # ligada ao carro (placa/chassi na nota)
            save_db(db)


def registrar_nota(payload: dict[str, Any]) -> dict[str, Any]:
    """Nota pelo Compartilhar do Atalho: página da consulta completa do Portal Nacional ("portal") ou XML.
    Se a nota já existe, completa itens/valores e mantém o que foi ajustado à mão (quem, categoria, reembolso,
    forma escolhida, cartão de quem)."""
    quem, reembolso = quem_e_reembolso(payload)
    tipo, conteudo = payload.get("tipo"), str(payload.get("conteudo") or "")
    if tipo != "pdf" and re.search(r"<(?:\w+:)?(?:nfeProc|NFe|CompNfse|InfNfse)\b", conteudo) and not re.search(r"(?i)<html\b", conteudo[:3000]):
        tipo = "xml"
    if tipo == "portal" and (danfse := link_danfse(conteudo)):  # NFS-e nacional pelo Safari: página ou PDF aberto
        tipo, conteudo = "pdf", base64.b64encode(baixar_danfse(danfse)).decode()
    try:
        return _registrar_nota(payload, quem, reembolso, tipo, conteudo)
    except Falha:
        guardar_nao_lida(tipo, conteudo)
        raise


NAO_LIDAS_DIR = DATA_DIR / "nao_lidas"


def guardar_nao_lida(tipo: Any, conteudo: str) -> None:
    """O que chegou pelo Compartilhar e não foi lido fica guardado (pasta privada dos dados, as 20 últimas) para
    ajustar a leitura sem a pessoa mandar de novo."""
    try:
        from datetime import datetime
        NAO_LIDAS_DIR.mkdir(parents=True, exist_ok=True)
        ext = {"pdf": "pdf.b64", "xml": "xml"}.get(str(tipo), "html")
        (NAO_LIDAS_DIR / f"{datetime.now():%Y%m%d-%H%M%S}.{ext}").write_text(conteudo, encoding="utf-8")
        for velho in sorted(NAO_LIDAS_DIR.iterdir())[:-20]:
            velho.unlink(missing_ok=True)
    except Exception:
        pass  # guardar é só ajuda: nunca atrapalha a resposta


def _registrar_nota(payload: dict[str, Any], quem: Any, reembolso: Any, tipo: Any, conteudo: str) -> dict[str, Any]:
    pdf_bytes = texto_nfse = None
    if tipo == "pdf":
        try:
            pdf_bytes = base64.b64decode(re.sub(r"\s", "", conteudo))
        except Exception as e:
            raise Falha("Não consegui abrir o PDF enviado.") from e
        texto_nfse = texto_pdf(pdf_bytes)
    if tipo == "pdf" and e_danfe(texto_nfse):  # PDF da nota de produto (DANFE)
        tipo = "danfe"
        chave, nota = ler_danfe_texto(texto_nfse)
        corpo = de_onde = consulta = None
    elif tipo == "pdf":
        # nota que já veio pelo XML (ou PDF antes): reconhece pelo número + código de verificação e só guarda o PDF
        with file_lock():
            db = load_db()
        plano = re.sub(r"\s+", " ", texto_nfse)
        ja = next((c for c in db["compras"] if c.get("origem") == "nfse" and c.get("codigo_verificacao")
                   and c["codigo_verificacao"] in plano and re.search(rf"\b{re.escape(str(c.get('numero')))}\b", plano)), None)
        if ja:
            NOTAS_DIR.mkdir(parents=True, exist_ok=True)
            (NOTAS_DIR / f"{ja['chave']}.pdf").write_bytes(pdf_bytes)
            if not (NOTAS_DIR / f"{ja['chave']}.html").exists():
                (NOTAS_DIR / f"{ja['chave']}.txt").write_text(texto_nfse, encoding="utf-8")
            return {"ok": True, "status": "atualizada", "id": ja["id"], "quem": ja.get("quem"),
                    "mensagem": f"PDF guardado junto da nota: {nome_loja(ja['loja'])}, {fmt_brl(ja.get('valor_pago'))}."}
        chave, nota = ler_nfse_texto(texto_nfse)
        corpo = de_onde = consulta = None
    elif tipo == "portal" and 'id="lblDiscriminacaoServicos"' in conteudo:  # NFS-e no site ISSnet (DF ou Goiânia)
        chave, nota = ler_nfse_issnet(conteudo)
        corpo, de_onde, consulta = copia_issnet(conteudo), "a partir do site ISSnet (NFS-e)", issnet_consulta(conteudo)
    elif tipo == "xml" and re.search(r"<(?:\w+:)?(?:InfNfse|CompNfse)\b", conteudo):  # nota de serviço (ABRASF)
        chave, nota = ler_nfse_xml(conteudo)
        corpo, de_onde, consulta = copia_nfse_xml(chave, nota, conteudo), "a partir do XML da NFS-e", "o site da prefeitura (código de verificação)"
    elif tipo == "xml":
        chave, nota = ler_xml_nfe(conteudo)
        corpo, de_onde, consulta = copia_xml(chave, nota), "a partir do XML da nota", PORTAL_NFE
    else:
        chave, nota = ler_portal_nfe(conteudo)
        corpo, de_onde, consulta = copia_portal(conteudo), "a partir do Portal Nacional da NF-e (consulta completa)", PORTAL_NFE
        if 'class="campo-xml"' in conteudo:
            de_onde, consulta = "a partir da Receita do DF (consulta completa)", "www.fazenda.df.gov.br/nfce/consulta"
        elif chave[:2] == "52" and nota.get("modelo") == "65":  # NFC-e de GO: o Portal Nacional não consulta cupom
            de_onde, consulta = "a partir da SEFAZ-GO (consulta completa)", "www.sefaz.go.gov.br/nfce/consulta"
    if not nota["itens"] or nota["valor_pago"] is None:
        raise Falha("Abri a nota, mas não consegui ler os itens. Me avise para eu ajustar a leitura.")
    juntada = do_pedido = None
    with file_lock():
        db = load_db()
        velho = next((c for c in db["compras"] if c.get("chave") == chave), None)
        if velho and pdf_bytes is not None and FONTE_NIVEL.get(velho.get("fonte") or "", 0) > FONTE_NIVEL[tipo]:
            NOTAS_DIR.mkdir(parents=True, exist_ok=True)
            (NOTAS_DIR / f"{chave}.pdf").write_bytes(pdf_bytes)
            return {"ok": True, "status": "atualizada", "id": chave, "quem": velho.get("quem"),
                    "mensagem": f"PDF guardado junto da nota (os dados já estavam completos): {nome_loja(velho['loja'])}, {fmt_brl(velho.get('valor_pago'))}."}
        if velho and FONTE_NIVEL.get(velho.get("fonte") or velho.get("origem"), 0) > FONTE_NIVEL[tipo]:
            return {"ok": True, "status": "repetida", "id": chave,
                    "mensagem": f"Essa nota já estava registrada com mais detalhes: {nome_loja(velho['loja'])}, {fmt_brl(velho.get('valor_pago'))}."}
        if velho:
            escolhas = [pg.get("tipo") for pg in velho.get("pagamentos") or []]
            velho.update(nota)
            if len(escolhas) == len(velho["pagamentos"]):
                for pg, t in zip(velho["pagamentos"], escolhas):
                    if t:
                        pg["tipo"] = t
            velho["fonte"] = tipo
            velho.setdefault("ajustes", []).append({"em": now_iso(), "acao": f"completada pelo {tipo}"})
            compra, status = velho, "atualizada"
        else:
            cat, sub, via = classe_para(db, nota["loja"], nota["itens"])
            if nota.get("modelo") == "nfse" and cat == "Outros" and (nota.get("cnae") or "").startswith("45"):
                cat, sub, via = "Carro", "Manutenção e revisão", "serviço"  # CNAE 45: manutenção de veículos
            compra = {"id": chave, "chave": chave, "origem": {"55": "nfe", "nfse": "nfse"}.get(nota["modelo"], "nfce"), "fonte": tipo,
                      "quem": quem, "reembolso": reembolso_novo(reembolso),
                      "categoria": cat, "subcategoria": sub, "classe_via": via, **nota, "registrado_em": now_iso()}
            do_pedido = encaixar_nota_nova(db, compra)  # loja online: parte de um pedido que veio por e-mail
            juntada = None if do_pedido else juntar(db, compra)
            if not juntada and not do_pedido:
                sugerir_cartao(db, compra)
            db["compras"].append(compra)
            status = "nova"
        db["compras"].sort(key=lambda c: c.get("emissao") or "", reverse=True)
        save_db(db)
    try:
        pagina = NOTAS_DIR / f"{chave}.html"
        if pdf_bytes is not None:  # NFS-e/DANFE: o próprio PDF é a nota; o texto fica ao lado (placa/KM para o bem)
            NOTAS_DIR.mkdir(parents=True, exist_ok=True)
            (NOTAS_DIR / f"{chave}.pdf").write_bytes(pdf_bytes)
            (NOTAS_DIR / f"{chave}.txt").write_text(texto_nfse, encoding="utf-8")
        elif tipo == "xml" and pagina.exists() and "Portal Nacional" in pagina.read_text(encoding="utf-8"):
            # a cópia da consulta do portal (o desenho oficial) fica; o XML original entra ao lado
            NOTAS_DIR.joinpath(f"{chave}.xml").write_text(conteudo, encoding="utf-8")
        else:
            gravar_copia(chave, corpo, de_onde, consulta, "xml", conteudo if tipo == "xml" else None)
        _ligar_depois(chave)
    except Exception:
        pass
    loja = nome_loja(nota["loja"])
    n = nota["qtd_itens"]
    msg = (("Nota completada: " if status == "atualizada" else "") +
           f"{loja} · {fmt_brl(nota['valor_pago'])} · {n} {'item' if n == 1 else 'itens'} · {compra['quem']}")
    if status == "nova":
        msg += RECEBER_TXT.get(reembolso, "")
    if status == "nova" and juntada:
        msg += f" · juntei com {'a compra do Apple Pay' if juntada.get('via') == 'applepay' else 'o lançamento à mão'} de {str(juntada.get('emissao') or '')[8:10]}/{str(juntada.get('emissao') or '')[5:7]}"
    if status == "nova" and do_pedido:
        msg += texto_do_pedido(do_pedido, compra)
    if not nota["conferencia"]["bate"]:
        msg += " · ⚠ soma dos itens não bate com o total"
    if status == "nova" and not compra.get("pagamentos") and not do_pedido:  # depois de juntar: o Apple Pay pode ter trazido
        msg += " · escolha a forma de pagamento no card"
    return {"ok": True, "status": status, "id": chave, "quem": compra["quem"], "loja": loja,
            "valor": nota["valor_pago"], "itens": n, "categoria": compra["categoria"], "mensagem": msg}


RECEBENDO_DIR = DATA_DIR / "recebendo"


def pedaco(p: dict[str, Any]) -> dict[str, Any]:
    """O Atalho manda arquivos grandes (página, XML) em pedaços: {envio, n (1..total), total, dados, + o resto do pedido}.
    Junta quando chegar o último e registra. Pedaços de envios esquecidos somem depois de 1 dia."""
    import time
    envio = re.sub(r"[^\w-]", "", str(p.get("envio") or ""))[:40]
    try:
        n, total = int(p.get("n")), int(p.get("total"))
    except (TypeError, ValueError):
        raise Falha("Pedaço sem número/total.")
    if not envio or not 1 <= n <= total <= 400:
        raise Falha("Pedaço inválido.")
    RECEBENDO_DIR.mkdir(parents=True, exist_ok=True)
    for velho in RECEBENDO_DIR.iterdir():
        if velho.is_dir() and time.time() - velho.stat().st_mtime > 86400:
            shutil.rmtree(velho, ignore_errors=True)
    pasta = RECEBENDO_DIR / envio
    pasta.mkdir(exist_ok=True)
    (pasta / f"{n:04d}").write_text(str(p.get("dados") or ""), encoding="utf-8")
    partes = sorted(pasta.glob("[0-9][0-9][0-9][0-9]"))
    if len(partes) < total:
        return {"ok": True, "status": "parcial", "recebidos": len(partes), "total": total, "mensagem": f"Recebendo {len(partes)}/{total}…"}
    conteudo = "".join(x.read_text(encoding="utf-8") for x in partes)
    shutil.rmtree(pasta, ignore_errors=True)
    pedido = {k: v for k, v in p.items() if k not in ("envio", "n", "total", "dados", "acao")}
    if pedido.get("para") == "anexo":
        return anexar({**pedido, "conteudo": conteudo})
    if pedido.get("para") == "agua":
        from .contas_agua import agua_ler
        return agua_ler({**pedido, "conteudo": conteudo})
    if pedido.get("para") == "luz":
        from .energia import luz_ler
        return luz_ler({**pedido, "conteudo": conteudo})
    if pedido.get("para") == "importar":  # ⚙ › Trazer pedidos antigos: o arquivo do Google Takeout
        from .pedidos import receber_importar
        return receber_importar({**pedido, "conteudo": conteudo})
    if pedido.get("para") == "pedido":  # e-mail de pedido de loja online em PDF (pela tela)
        from .pedidos import pedido_email
        return pedido_email({**pedido, "linhas": conteudo, "via": "pdf"})
    if pedido.get("para") == "fatura":
        from .faturas_banco import fatura_ler
        return fatura_ler({**pedido, "conteudo": conteudo})
    return registrar_nota({**pedido, "conteudo": conteudo})
