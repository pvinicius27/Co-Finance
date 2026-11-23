"""Configuração: pastas, pessoas, cartões, categorias iniciais, regras de classificação e tabelas fixas."""
from __future__ import annotations

import os
from pathlib import Path


BASE_DIR = Path(os.environ.get("COMPRAS_DIR", "/config/compras"))


DATA_DIR = BASE_DIR / "dados"


DB_PATH = DATA_DIR / "compras.json"


BACKUP_DIR = DATA_DIR / "backups"


LOCK_PATH = DATA_DIR / "compras.lock"


NOTAS_DIR = BASE_DIR / "notas"  # cópia fiel de cada nota (com os dados do consumidor): fora da pasta pública


BACKUPS_KEEP = 30


# Bens: compras ligadas a uma coisa (por enquanto o carro). Reconhecido pelo final da placa que a oficina escreve
# na nota (informações complementares) ou pelo tipo do item (película automotiva, pneu, óleo de motor...).
# Ex.: {"id": "carro", "nome": "Meu carro", "tipo": "veiculo", "placa_final": "D23"}. Os bens
# de cada casa ficam nos dados (db["bens"]); aqui só o que uma casa nova recebe (nenhum).
BENS_INICIAIS: list = []


CATEGORIAS = ["Mercado", "Hortifrúti", "Açougue/Padaria", "Farmácia", "Casa e Construção",
              "Utilidades", "Eletrônicos", "Eletrodomésticos", "Veículo", "Esporte e Lazer",
              "Vestuário e Acessórios", "Pet", "Restaurante", "Combustível", "Outros"]


# v24 (18/10/2026): categorias em dois níveis. A árvore fica nos dados (db["arvore"]) e é editável pelo card;
# esta é a inicial. Mercado não tem subcategoria fixa: ela sai dos itens (Hortifrúti, Carnes…).
# "bens": subcategorias de bens duráveis (aparecem à parte no painel); "*" = a categoria toda.
ELETRICA = "Elétrica e iluminação"  # v5: subcategoria nova de Casa


BEBE_SUBS = ["Fraldas e higiene", "Banho", "Alimentação", "Roupas", "Bolsas e passeio", "Quarto e enxoval", "Saúde", "Brinquedos"]  # v28


ARVORE_INICIAL = [
    {"nome": "Mercado", "icone": "🛒", "cor": "#10b981", "subs": [], "pelos_itens": True},
    {"nome": "Casa", "icone": "🏠", "cor": "#3b82f6", "subs": ["Contas fixas", "Eletrodomésticos", "Climatização", "Elétrica e iluminação", "Móveis e decoração",
     "Automação e segurança", "Manutenção e reparos", "Utilidades"], "bens": ["Eletrodomésticos", "Climatização", "Móveis e decoração", "Automação e segurança"]},
    {"nome": "Tecnologia", "icone": "💻", "cor": "#6366f1", "subs": ["Celulares", "Informática e redes", "TV e áudio", "Games", "Acessórios"], "bens": "*"},
    {"nome": "Carro", "icone": "🚗", "cor": "#f59e0b", "subs": ["Manutenção e revisão", "Combustível", "Estética e acessórios", "Documentação", "Seguro", "Estacionamento e pedágio"]},
    {"nome": "Comer fora", "icone": "🍽️", "cor": "#ef6f6c", "subs": ["Restaurante", "Lanche e padaria", "Delivery"]},
    {"nome": "Saúde", "icone": "💊", "cor": "#14b8a6", "subs": ["Farmácia", "Consultas e exames", "Plano"]},
    {"nome": "Bebê", "icone": "👶", "cor": "#f472b6", "subs": BEBE_SUBS, "bens": ["Quarto e enxoval", "Bolsas e passeio"]},
    {"nome": "Pessoal", "icone": "👕", "cor": "#d9467a", "subs": ["Vestuário, bolsas e malas", "Beleza e cuidados"]},
    {"nome": "Lazer e viagem", "icone": "🚲", "cor": "#8b5cf6", "subs": ["Esporte", "Viagens", "Passeios"], "bens": ["Esporte"]},
    {"nome": "Assinaturas e serviços", "icone": "📺", "cor": "#0ea5e9", "subs": ["Streaming", "Celular e internet", "Cursos", "Aplicativos"]},
    {"nome": "Pet", "icone": "🐾", "cor": "#a16207", "subs": ["Ração", "Veterinário", "Acessórios"]},
    {"nome": "Outros", "icone": "📦", "cor": "#94a3b8", "subs": ["Outros"]},
]


# Categoria antiga (v1) → nova. Usada na migração e para a biblioteca de produtos, que ainda fala a língua antiga.
VELHA_PARA_NOVA = {
    "Mercado": ("Mercado", None), "Hortifrúti": ("Mercado", None), "Açougue/Padaria": ("Mercado", None),
    "Farmácia": ("Saúde", "Farmácia"), "Casa e Construção": ("Casa", "Manutenção e reparos"), "Utilidades": ("Casa", "Utilidades"),
    "Eletrônicos": ("Tecnologia", "Acessórios"), "Eletrodomésticos": ("Casa", "Eletrodomésticos"), "Veículo": ("Carro", "Manutenção e revisão"),
    "Esporte e Lazer": ("Lazer e viagem", "Esporte"), "Vestuário e Acessórios": ("Pessoal", "Vestuário, bolsas e malas"), "Pet": ("Pet", "Acessórios"),
    "Restaurante": ("Comer fora", "Restaurante"), "Combustível": ("Carro", "Combustível"), "Outros": ("Outros", "Outros"),
}


# Item → (categoria, subcategoria). Primeiro pela descrição (algumas lojas põem o NCM errado: MacBook como "fonte",
# controle de PS5 como "computador"), depois pelo NCM (o prefixo mais longo vale).
# v4 (19/10/2026): revisão do Bebê. "Móveis e enxoval" passa a se chamar "Quarto e enxoval".
REVISAO_V4: dict = {}  # correções por compra feitas numa casa (já aplicadas nos dados dela): casa nova não tem


LOJA_V4: dict = {}


# v5 (20/10/2026): revisão (Casa ganhou "Elétrica e iluminação", depois de Climatização).
REVISAO_V5: dict = {}  # idem


LOJA_V5: dict = {}


CLASSE_POR_DESCRICAO = [
    # Bebê (v28): o que é o item decide a subcategoria; o genérico (bebê/infantil) fica por último
    (r"MAMADEIRA|CHUPETA|\bAVENT\b|EXTRATOR DE LEITE|BOMBA TIRA LEITE|TIRA.?LEITE|BOMBA.{0,30}\bLEITE\b|PRATINHO|BABADOR", "Bebê", "Alimentação"),
    (r"BANHEIRA|BANHO.*(BEBE|INFANTIL)|TOALHA.*(BEBE|INFANTIL|CAPUZ)", "Bebê", "Banho"),
    (r"BOLSA.*MATERNIDADE|MALA.*MATERNIDADE|CARRINHO DE BEBE|CARRINHO.*BEBE|BEBE CONFORTO|CADEIRINHA|CANGURU|SLING", "Bebê", "Bolsas e passeio"),
    (r"\bBERCO\b|POLTRONA.*AMAMENTA|AMAMENTA.*POLTRONA|(LUSTRE|LUMINARIA|PENDENTE|ABAJUR).*INFANTIL|ENXOVAL|PROTETOR DE BERCO|MOSQUITEIRO|TROCADOR", "Bebê", "Quarto e enxoval"),
    (r"FRALDA|LENCO UMEDECIDO|ASSADURA", "Bebê", "Fraldas e higiene"),
    (r"\b(BODY|MACACAO|MACAQUINHO|PIJAMA|MIJAO|SAPATINHO|MEIA|TOUCA|CONJUNTO|CULOTE)\b.*(BEBE|INFANTIL|\bRN\b)|(BEBE|INFANTIL).*\b(BODY|MACACAO|PIJAMA|MIJAO|SAPATINHO)\b", "Bebê", "Roupas"),
    (r"MORDEDOR|CHOCALHO|MOBILE.*BERCO|BRINQUEDO.*(BEBE|INFANTIL)", "Bebê", "Brinquedos"),
    (r"AMAMENTA|\bBEBE\b|INFANTIL", "Bebê", None),
    (r"(INTERRUPTOR|TOMADA|LAMPADA|MODULO|PLUG|DIMMER).*(WI.?FI|SMART|ZIGBEE)|(WI.?FI|SMART|ZIGBEE).*(INTERRUPTOR|TOMADA|LAMPADA|MODULO|PLUG|DIMMER)|AQARA|SONOFF", "Casa", "Automação e segurança"),
    (r"FITA (DE )?LED|PERFIL.*LED|DRIVER.*LED|FONTE.*(LED|12V|24V|\bDC\b)|PLAFON|LUMINARIA|LUSTRE|PENDENTE|ARANDELA|\bSPOT\b|REFLETOR|"
     r"LAMPADA(?!.*(HALOGENA|AUTOMOT|FAROL|\bH[0-9]+\b))|FITA ISOLANTE|DISJUNTOR|\bTOMADA\b|INTERRUPTOR|FIO FLEX|CABO FLEX|CABO PP|"
     r"EXTENSAO ELETRICA|FILTRO DE LINHA|\bBENJAMIM\b|\bPLUGUE\b|CONDULETE|ELETRODUTO", "Casa", ELETRICA),
    (r"PLAYSTATION|\bPS[45]\b|XBOX|NINTENDO|DUALSENSE|JOYSTICK|\bCONTROLE\b.*\b(PS|SONY|XBOX)", "Tecnologia", "Games"),
    (r"MACBOOK|NOTEBOOK|\bLAPTOP|\bIMAC\b|COMPUTADOR|ROTEADOR|\bSWITCH\b.*(GIGA|PORTA|GERENC)|\bMESH\b", "Tecnologia", "Informática e redes"),
    (r"\bIPHONE\b|SMARTPHONE|\bCELULAR\b|\bCEL\.", "Tecnologia", "Celulares"),
    (r"CANETA|STYLUS|ADAPTADOR|\bCABO\b|CARREGADOR|\bFONTE\b|\bCAPA\b|PELICULA (?!AUTOMOT)", "Tecnologia", "Acessórios"),
    (r"UMIDIFICADOR|CLIMATIZADOR|VENTILADOR|AQUECEDOR|AR.CONDICIONADO|\bSPLIT\b", "Casa", "Climatização"),
    (r"PELICULA AUTOMOT|INSULFILM|POLIMENTO|LAVAGEM AUTOMOT|HIGIENIZACAO AUTOMOT", "Carro", "Estética e acessórios"),
    (r"ESTACIONAMENTO|\bESTADIA\b.*VEICULO|PERMANENCIA.*VEICULO|PEDAGIO|TARIFA DE PASSAGEM|ZONA AZUL", "Carro", "Estacionamento e pedágio"),
    (r"\bPNEU|ALINHAMENTO|BALANCEAMENTO|\bREVISAO\b|OLEO (DE )?MOTOR|OLEO DE CAMBIO|SUSPENSAO", "Carro", "Manutenção e revisão"),
    (r"FECHADURA|SMART LOCK|CAMERA DE SEGURANCA|ALARME|SENSOR DE PRESENCA", "Casa", "Automação e segurança"),
    (r"PERFUME CAPILAR|OLEO REPARADOR|REPARADOR DE PONTAS|\bESMALTE\b|MAQUIAGEM", "Pessoal", "Beleza e cuidados"),
]


# v47: só para o "O que comprou" das compras sem nota (sem NCM). Depois de CLASSE_POR_DESCRICAO.
CLASSE_POR_ITEM_MANUAL = [
    (r"MANICURE|PEDICURE|\bUNHAS?\b|CORTE DE CABELO|\bCABELO\b|\bBARBA\b|SOBRANCELHA|DEPILA|ESTETICA|\bESCOVA\b|MASSAGEM", "Pessoal", "Beleza e cuidados"),
    (r"\bHOTEL\b|POUSADA|HOSPEDAGEM|AIRBNB|HOSTEL", "Lazer e viagem", "Viagens"),
    (r"\bCOPIAS?\b|XEROX|IMPRESSAO", "Papelaria", "Geral"),
    (r"RACAO|PETISCO|AREIA.*GAT|\bPET\b", "Pet", "Ração"),
    (r"VETERINAR|VACINA.*(CAO|GATO|CACHORR|PET)|BANHO E TOSA|\bTOSA\b", "Pet", "Veterinário"),
    (r"FAXINA|DIARISTA|DIARIA|LIMPEZA|DETERGENTE|SABAO|DESINFETANTE|AMACIANTE|AGUA SANITARIA", "Casa", "Limpeza"),
    (r"REMEDIO|MEDICAMENTO|FARMACIA|DIPIRONA|VITAMINA", "Saúde", "Farmácia"),
    (r"GASOLINA|ETANOL|ALCOOL COMBUST|DIESEL|COMBUSTIVEL|ABASTEC", "Carro", "Combustível"),
    (r"ALMOCO|JANTAR|REFEICAO|MARMITA|PIZZA|HAMBURGUER|LANCHE|SALGADO|PASTEL|CAFEZINHO|CAFE DA MANHA|SORVETE|ACAI", "Comer fora", None),
    (r"CARNE|FRANGO|PEIXE|LINGUICA|BACON|PRESUNTO|QUEIJO|MUSSARELA|LEITE|IOGURTE|MANTEIGA|OVOS?\b|\bPAO|PAES|ARROZ|FEIJAO|"
     r"MACARRAO|FARINHA|ACUCAR|\bCAFE\b|OLEO\b|AZEITE|FRUTA|VERDURA|LEGUME|BANANA|MACA\b|LARANJA|TOMATE|BATATA|CEBOLA|ALHO|"
     r"HORTIFRUTI|FEIRA|SACOLAO|DOCE|BISCOITO|BOLACHA|CHOCOLATE|REFRIGERANTE|SUCO|CERVEJA|AGUA MINERAL|MERCADO|COMPRAS DO MES", "Mercado", None),
]


# Itens de pedido de loja online (e-mail da Shopee, Mercado Livre…: sem NCM). O título do anúncio junta palavras de
# tudo ("Ralador … Queijo Legumes Verduras"), então aqui não entram as regras de comida; depois destas, as da descrição
# (CLASSE_POR_DESCRICAO) e, sem nenhuma, a área Compras online.
CLASSE_POR_ITEM_ONLINE = [
    (r"\bCOLICAS?\b|\bCOLIC\b|TERMOMETRO|ASPIRADOR NASAL", "Bebê", "Saúde"),
    (r"RECEM.?NASCID|MATERNIDADE|\bBEBES?\b|\bBABY\b|INFANTIL|\bCOLICAS?\b|\bCOLIC\b|ASSADURA|CHUPETA|MAMADEIRA|FRALDA|\bBERCO\b|AMAMENTA|\bRN\b", "Bebê", None),
    (r"TABUA DE (CORTE|CARNE)|RALADOR|PANELA|FRIGIDEIRA|\bFACAS?\b|TALHER|UTENSILIO|ESCORREDOR|POTE HERMETICO|ORGANIZADOR|CABIDE|"
     r"\bCOZINHA\b|LIXEIRA|PORTA TEMPERO|ESPATULA|CONCHA|ASSADEIRA|GARRAFA TERMICA", "Casa", "Utilidades"),
    (r"CORTINA|TAPETE|ALMOFADA|QUADRO DECORATIV|VASO DECORATIV|ESPELHO|LENCOL|EDREDOM|TOALHA", "Casa", "Móveis e decoração"),
    (r"FURADEIRA|PARAFUSADEIRA|CHAVE DE FENDA|ALICATE|BROCA|VEDA ROSCA|SILICONE ACETICO|TORNEIRA|CHUVEIRO|SIFAO|DOBRADICA", "Casa", "Manutenção e reparos"),
    (r"MAQUIAGEM|BATOM|PERFUME|SHAMPOO|CONDICIONADOR|HIDRATANTE|SKINCARE|SERUM|PROTETOR SOLAR", "Pessoal", "Beleza e cuidados"),
    (r"CAMISETA|CAMISA|VESTIDO|CALCA|BERMUDA|SHORT|BLUSA|TENIS|SANDALIA|CHINELO|BOLSA|MOCHILA|MALA DE VIAGEM|CARTEIRA MASCULINA", "Pessoal", "Vestuário, bolsas e malas"),
    (r"COLEIRA|\bCAMA PET\b|ARRANHADOR|COMEDOURO|BEBEDOURO PET", "Pet", "Acessórios"),
]


CLASSE_POR_NCM = [
    ("851713", "Tecnologia", "Celulares"), ("851712", "Tecnologia", "Celulares"), ("851762", "Tecnologia", "Informática e redes"),
    ("8471", "Tecnologia", "Informática e redes"), ("8473", "Tecnologia", "Acessórios"), ("8523", "Tecnologia", "Acessórios"),
    ("8528", "Tecnologia", "TV e áudio"), ("8518", "Tecnologia", "TV e áudio"), ("8519", "Tecnologia", "TV e áudio"), ("9504", "Tecnologia", "Games"),
    ("8415", "Casa", "Climatização"), ("8418", "Casa", "Eletrodomésticos"), ("8450", "Casa", "Eletrodomésticos"), ("8451", "Casa", "Eletrodomésticos"),
    ("8422", "Casa", "Eletrodomésticos"), ("8516", "Casa", "Eletrodomésticos"), ("7321", "Casa", "Eletrodomésticos"), ("842121", "Casa", "Eletrodomésticos"),
    ("8508", "Casa", "Eletrodomésticos"), ("8509", "Casa", "Eletrodomésticos"), ("8301", "Casa", "Automação e segurança"),
    ("9401", "Casa", "Móveis e decoração"), ("9403", "Casa", "Móveis e decoração"), ("9404", "Casa", "Móveis e decoração"),
    ("8205", "Casa", "Manutenção e reparos"), ("9405", "Casa", ELETRICA), ("8539", "Casa", ELETRICA), ("8536", "Casa", ELETRICA), ("8510", "Pessoal", "Beleza e cuidados"), ("4202", "Pessoal", "Vestuário, bolsas e malas"),
    ("61", "Pessoal", "Vestuário, bolsas e malas"), ("62", "Pessoal", "Vestuário, bolsas e malas"), ("64", "Pessoal", "Vestuário, bolsas e malas"),
    ("8712", "Lazer e viagem", "Esporte"), ("9506", "Lazer e viagem", "Esporte"),
    ("271012", "Carro", "Combustível"), ("2207", "Carro", "Combustível"), ("271019", "Carro", "Manutenção e revisão"),
    ("842123", "Carro", "Manutenção e revisão"), ("842131", "Carro", "Manutenção e revisão"), ("8708", "Carro", "Manutenção e revisão"),
    ("4011", "Carro", "Manutenção e revisão"), ("4010", "Carro", "Manutenção e revisão"),
    ("30", "Saúde", "Farmácia"), ("2309", "Pet", "Ração"),
]


CLASSE_POR_NCM.sort(key=lambda x: -len(x[0]))


# Nome da loja → (categoria, subcategoria), para loja nova sem regra (ordem importa)
CLASSE_POR_NOME = [
    (r"PANIFICADORA|PADARIA|\bPANIF|LANCHONETE|CAFETERIA|SORVETERIA|\bCAFES?\b|COFFEE|STARBUCKS|CONFEITARIA|DOCERIA|"
     r"PASTELARIA|\bPASTEL\b|SALGADOS|\bACAI\b|\bLANCHES?\b|CHOCOLATERIA|CACAU SHOW|KOPENHAGEN", "Comer fora", "Lanche e padaria"),
    (r"RESTAURANTE|PIZZARIA|HAMBURG|BURGER|CHURRASCARIA|\bBAR\b|ALIMENTACAO|BISTRO|CANTINA|SUSHI|TEMAKERIA|ESPETINHO|"
     r"BOTECO|BUTECO|\bGRILL\b|GRELHADOS|\bRES$|\bREST$|"  # Apple Pay corta o nome: "Brasilia Airport Res"
     r"MC ?DONALD|\bBOB S\b|SUBWAY|OUTBACK|COCO BAMBU|MADERO|SPOLETO|GIRAFFAS|CHINA IN BOX", "Comer fora", "Restaurante"),
    (r"IFOOD|RAPPI|DELIVERY", "Comer fora", "Delivery"),
    (r"PAMONHARIA|CARNE DE SOL|CUCINA|MACELLERIA|TRATTORIA", "Comer fora", "Restaurante"),
    (r"BARBEARIA|BARBER|CABELEIREIR|CABELEREIR|\bSALAO\b|ESMALTERIA|BEAUTE|BEAUTY|ESTETICA|\bNATURA\b|MANICURE|NAIL", "Pessoal", "Beleza e cuidados"),
    (r"\bHOTEL\b|\bIBIS\b|POUSADA|HOSTEL", "Lazer e viagem", "Viagens"),
    (r"AMOR ?SAUDE|RD ?SAUDE", "Saúde", "Consultas e exames"),
    (r"\bCNA\b", "Assinaturas e serviços", "Cursos"),
    (r"CENTAURO|RUNNINGLAND|DECATHLON", "Lazer e viagem", "Esporte"),
    (r"SHEIN|\bSHEI\b", "Compras online", "Outras"),
    (r"PAPELARIA|\bCOPIAS\b|XEROX", "Papelaria", "Geral"),
    (r"ACOUGUE|\bCARNES\b|FRIGORIFICO|CASA DE CARNE|HORTIFRUTI|HORTI FRUTI|SACOLAO|\bFRUTAS\b|VERDURAS", "Mercado", None),
    (r"FARMACIA|DROGARIA|\bDROGA|PHARMA|FARMA\b", "Saúde", "Farmácia"),
    (r"\bPOSTO\b|COMBUSTIVE|PETROLEO|DERIVADOS DE PETR", "Carro", "Combustível"),
    (r"SUPERMERCADO|\bMERCADO|ATACAD|HIPERMERCADO|MERCEARIA|SECOS E MOLHADOS|EMPORIO|MINIMERCADO", "Mercado", None),
    (r"\bPET\b|PETSHOP|AGROPET|RACOES|VETERINAR", "Pet", None),
    (r"\bELETRICA\b|MATERIA(L|IS) ELETRICO|ELETRICOS|ILUMINACAO", "Casa", ELETRICA),
    (r"ESTACIONAMENTO|ESTACIONAMEN|\bESTAC\b|PARKING|ESTAPAR|MULTIPARK|ALLPARK|AUTOPARK|ZONA AZUL|ROTATIVO|"
     r"PEDAGIO|SEM PARAR|CONECTCAR|\bVELOE\b|MOVE MAIS|TAGGY", "Carro", "Estacionamento e pedágio"),
    (r"CONSTRUCAO|MATERIAIS DE CONSTR|HOME CENTER|FERRAGENS|MADEIREIRA|TINTAS|HIDRAULICA", "Casa", "Manutenção e reparos"),
    (r"ELETRONICO|INFORMATICA|CELULAR", "Tecnologia", None),
    (r"MOVEIS|ESTOFADOS|COLCHOES|DECORACAO", "Casa", "Móveis e decoração"),
    (r"PAPELARIA|UTILIDADES|BAZAR|PRESENTES", "Casa", "Utilidades"),
]


# Regras por loja (raiz do CNPJ): começam vazias; cada casa ensina as suas pela tela (⚙ › Categorias e regras)
LOJA_V2_INICIAL: dict = {}


REVISAO_V2: dict = {}  # idem


# v26 (18/10/2026): cartões e faturas. A gestão financeira começa no marco zero; o que venceu até "pago_ate"
# conta como pago (era antes do controle). Fatura = calculada (não é gravada): cartão + data da compra + parcelas.
MARCO_ZERO = "2026-01-01"


PAGO_ATE_INICIAL = "2026-10-18"


CARTOES_INICIAIS: list = []  # os cartões são cadastrados pela tela (Contas › ✎ › Cartões)


# Contas que vêm de outra integração do HA (só leitura). Luz: faturas guardadas pelo painel de energia (Co-Energy).
ENERGIA_DIR = Path(os.environ.get("COMPRAS_ENERGIA_DIR", str(BASE_DIR.parent / ".storage")))


# Contas da casa (luz, água, mensais sem boleto, carnês): cadastro em db["contas_casa"], pela tela ⚙ Configurações.


PAGOS_NA_HORA = ("Pix", "Débito", "Benefício", "Dinheiro", "Boleto", "Saldo em carteira")  # saem da conta no dia da compra


BANCOS_EMISSORES = {"bb": "Banco do Brasil", "bradesco": "Bradesco", "itau": "Itaú", "santander": "Santander", "caixa": "Caixa", "nubank": "Nubank", "inter": "Inter", "c6": "C6 Bank", "btg": "BTG Pactual", "xp": "XP", "sicredi": "Sicredi", "sicoob": "Sicoob", "banrisul": "Banrisul", "brb": "BRB", "pan": "Banco Pan", "bv": "Banco BV", "safra": "Safra", "porto": "Porto Bank", "picpay": "PicPay", "mercadopago": "Mercado Pago", "neon": "Neon", "next": "Next", "will": "Will Bank", "original": "Original", "wise": "Wise", "infinitepay": "InfinitePay", "alelo": "Alelo", "vr": "VR", "ticket": "Ticket", "pluxee": "Pluxee", "flash": "Flash", "caju": "Caju", "ifood": "iFood Benefícios", "swile": "Swile"}  # banco do cartão (desenho e nome); leitor de PDF à parte
BANDEIRAS_CARTAO = ["Visa", "Mastercard", "Elo", "Amex", "Hipercard", "Diners", "Discover", "JCB", "UnionPay", "Maestro", "Outra", "Sem bandeira"]  # só as redes; Alelo, VR, Ticket e Pluxee são emissores (cartão de benefício), não bandeira
EMISSORES_BENEFICIO = ("alelo", "vr", "ticket", "pluxee", "flash", "caju", "ifood", "swile")  # quem emite cartão de benefício
BENEFICIOS = {"refeicao": "Refeição", "alimentacao": "Alimentação", "ambos": "Refeição e alimentação", "multi": "Multibenefício"}
# NFC-e: o código da "bandeira" que na verdade é a empresa do benefício (tabela tBand: 10, 23, 26, 27)
BENEFICIO_DA_NOTA = {"Alelo": "alelo", "Sodexo": "pluxee", "Pluxee": "pluxee", "VR": "vr", "Ticket": "ticket"}


# Categoria sugerida pela loja (raiz do CNPJ, 8 dígitos): começa vazia; a loja fica lembrada quando a casa escolhe.
CATEGORIA_LOJA_INICIAL: dict = {}


# Pagamento: a nota diz o meio (crédito, débito, vale...) e, na versão detalhada, a bandeira do cartão
# (tabela da NF-e; 10, 23, 26 e 27 são empresas de benefício: Alelo, Pluxee, VR, Ticket). Não diz de quem é o cartão: crédito/débito ficam com quem comprou, ou com
# quem o card disser ("cartao_de"); benefício (Alelo, VR…) fica com o cartão de benefício de quem comprou (o da mesma empresa, se a nota disser; senão o único da casa).
MOEDAS = {"BRL": "R$", "USD": "US$", "EUR": "€"}  # compra lançada à mão pode ser em outra moeda (viagem)


TIPOS_PAG = ["Crédito", "Débito", "Benefício", "Pix", "Saldo em carteira", "Dinheiro", "Boleto", "Outro"]  # carteira: Mercado Pago, PicPay…


BANDEIRAS = {"01": "Visa", "02": "Mastercard", "03": "American Express", "04": "Sorocred", "05": "Diners Club",
             "06": "Elo", "07": "Hipercard", "08": "Aura", "09": "Cabal", "10": "Alelo", "11": "Banescard",
             "12": "CalCard", "13": "Credz", "14": "Discover", "15": "GoodCard", "16": "GreenCard", "17": "Hiper",
             "18": "JCB", "19": "Mais", "20": "MaxVan", "21": "Policard", "22": "RedeCompras", "23": "Pluxee",
             "24": "ValeCard", "25": "Verocheque", "26": "VR", "27": "Ticket", "99": "Outros"}


SEFAZ_GO = "https://nfeweb.sefaz.go.gov.br"


OUTRO_ESTADO = ("Cupom de outro estado: abra o QR Code no Safari, resolva o captcha, toque em \"NFC-e detalhada\" "
                "e use Compartilhar → Enviar Nota.")


UA = ("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 "
      "(KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1")


TIMEOUT = 25


T_PAG = {"01": "Dinheiro", "02": "Cheque", "03": "Cartão de Crédito", "04": "Cartão de Débito", "05": "Crédito Loja",
         "10": "Vale Alimentação", "11": "Vale Refeição", "12": "Vale Presente", "13": "Vale Combustível",
         "15": "Boleto Bancário", "16": "Depósito Bancário", "17": "Pagamento Instantâneo (PIX)",
         "18": "Transferência bancária", "19": "Programa de fidelidade", "20": "PIX estático",
         "90": "Sem pagamento", "99": "Outros"}
