// co-finance-card.js — ARQUIVO GERADO por montar.py. Não edite aqui: mexa nos módulos de codigo/.
// Card do painel:  type: custom:co-finance-card


// ----- compras-financas ------------------------------------------------------

// Central de Compras — abas de Finanças (Resumo · Áreas · A pagar), instaladas no card de Compras.
// Este arquivo só soma e mostra. Os dados vêm do script (listar, painel, itens); qualquer compra aberta daqui
// usa o mesmo cupom do card (QR/SEFAZ, editar, imprimir, nota fiscal).
// O que ainda não existe (pagamentos, faturas, contas) aparece como "em breve", sem número inventado.

const F_MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const F_DIAS = ["D", "S", "T", "Q", "Q", "S", "S"];
const F_ICONES_CONTA = ["🌐", "🏛️", "⚡", "💧", "🔥", "📺", "📱", "🏠", "🚗", "🛡️", "🏋️", "🎓", "🏥", "📦"];  // os mesmos do script (ICONES_CONTA)
const F_PALETA = ["#3b82f6", "#d9467a", "#0f9f8f", "#f59e0b", "#8b5cf6", "#ef4444", "#64748b"];  // a mesma do script (PALETA_PESSOAS)
// bandeira é a rede do cartão (quem passa a compra); Alelo, VR, Ticket e Pluxee são empresas de benefício (emissores)
const F_BANDEIRAS = ["Visa", "Mastercard", "Elo", "Amex", "Hipercard", "Diners", "Discover", "JCB", "UnionPay", "Maestro", "Outra", "Sem bandeira"];
const F_BANDEIRAS_BANCO = F_BANDEIRAS;
// categoria de cada bandeira (a do banco aparece primeiro; nenhuma some)
const F_CATEGORIAS = { Visa: ["Classic", "Internacional", "Gold", "Platinum", "Signature", "Infinite"], Mastercard: ["Standard", "Internacional", "Gold", "Platinum", "Black"],
  Elo: ["Mais", "Grafite", "Nanquim"], Amex: ["Green", "Gold", "Platinum", "Centurion"], "": ["Nacional", "Internacional", "Gold", "Platinum", "Black"] };
const F_CAT_RE = /\b(CLASSIC|INTERNACIONAL|NACIONAL|GOLD|PLATINUM|SIGNATURE|INFINITE|STANDARD|BLACK|MAIS|GRAFITE|NANQUIM|GREEN|CENTURION)\b/i;
// função do cartão e, no benefício, de que é o saldo
const F_FUNCOES = [["credito", "Crédito"], ["debito", "Débito"], ["ambos", "Crédito e débito"], ["prepago", "Pré-pago"], ["beneficio", "Benefício (Alelo, VR…)"]];
const F_BENEFICIOS = { refeicao: "Refeição", alimentacao: "Alimentação", ambos: "Refeição e alimentação", multi: "Multibenefício" };
const F_EMISSORES_BENEF = ["alelo", "vr", "ticket", "pluxee", "flash", "caju", "ifood", "swile"];
const F_PAINEL_ENERGIA = "/co-energy";  // o item da barra lateral do CoEnergy (quando instalado)
const F_BANCOS = { santander: "Santander", bb: "Banco do Brasil", bradesco: "Bradesco", itau: "Itaú", brb: "BRB", btg: "BTG Pactual", caixa: "Caixa", inter: "Inter", nubank: "Nubank" };
const F_EMISSORES = {bb: ["Banco do Brasil", "#fcfc30", "#1d3f9b"], bradesco: ["Bradesco", "#cc092f", "#ffffff"], itau: ["Itaú", "#ec7000", "#ffffff"], santander: ["Santander", "#ec0000", "#ffffff"], caixa: ["Caixa", "#005ca9", "#ffffff"], nubank: ["Nubank", "#820ad1", "#ffffff"], inter: ["Inter", "#ff7a00", "#ffffff"], c6: ["C6 Bank", "#242424", "#ffffff"], btg: ["BTG Pactual", "#0d2240", "#ffffff"], xp: ["XP", "#111111", "#f5c518"], sicredi: ["Sicredi", "#3fa110", "#ffffff"], sicoob: ["Sicoob", "#003641", "#7db61c"], banrisul: ["Banrisul", "#00519e", "#ffffff"], brb: ["BRB", "#0a3d91", "#ffffff"], pan: ["Banco Pan", "#00aeef", "#ffffff"], bv: ["Banco BV", "#1b2a5c", "#ffffff"], safra: ["Safra", "#00205b", "#c9a45c"], porto: ["Porto Bank", "#0046c0", "#ffffff"], picpay: ["PicPay", "#21c25e", "#ffffff"], mercadopago: ["Mercado Pago", "#00b1ea", "#ffffff"], neon: ["Neon", "#0e1a3f", "#2de0ff"], next: ["Next", "#00ff5f", "#111111"], will: ["Will Bank", "#ffe500", "#111111"], original: ["Original", "#00a335", "#ffffff"], wise: ["Wise", "#7beb7f", "#163300"], infinitepay: ["InfinitePay", "#111111", "#ffffff"], alelo: ["Alelo", "#bad355", "#1f5136"], vr: ["VR", "#00a650", "#ffe600"], ticket: ["Ticket", "#e2231a", "#ffffff"], pluxee: ["Pluxee", "#221c46", "#00eb5e"], flash: ["Flash", "#f5317f", "#ffffff"], caju: ["Caju", "#ff6a3d", "#ffffff"], ifood: ["iFood Benefícios", "#ea1d2c", "#ffffff"], swile: ["Swile", "#6d4aff", "#ffffff"]};  // banco do cartão: nome, fundo e tinta
// modelos de cartão (desenho na V3): id → [banco, nome]. Cada foto de cartão nova vira um modelo aqui
const F_MODELOS = { "santander-unique": ["santander", "Santander Unique · preto"],
  "bb-ourocard-infinite": ["bb", "Ourocard Visa Infinite (modelo antigo)"],
  "itau-latam-black": ["itau", "Itaú Latam Pass Black · preto"], "wise-verde": ["wise", "Wise · verde"], "alelo-refeicao": ["alelo", "Alelo refeição e alimentação · verde-limão"],
  "caixa-sim": ["caixa", "Caixa Sim / Mulher"], "caixa-universitario": ["caixa", "Caixa Universitário · verde"],
  "caixa-gold": ["caixa", "Caixa Gold · azul-petróleo"], "caixa-elo-mais": ["caixa", "Caixa Elo Mais · azul-petróleo"],
  "caixa-platinum": ["caixa", "Caixa Platinum Visa / Elo Grafite"], "caixa-infinite": ["caixa", "Caixa Infinite · preto"],
  "caixa-nanquim": ["caixa", "Caixa Elo Nanquim · preto"],
  "caixa-diners": ["caixa", "Caixa Diners Club · preto e cobre"], "btg-ultrablue": ["btg", "BTG Pactual Ultrablue · azul escovado"], "brb-connect": ["brb", "BRBCARD Visa Connect"],
  "inter-laranja": ["inter", "Inter Gold"], "amazon-bradesco": ["bradesco", "Amazon (Bradesco) · branco"], "c6-carbon": ["c6", "C6 Carbon Black · preto fibra de carbono"] };
// cor de cada modelo (fundo, tinta, e o degradê do cartão de verdade); sem modelo, a cor do banco
// modelos que saíram do catálogo (iguais a outro do HTML de referência): quem já tinha um deles passa a usar o equivalente
const F_MODELO_ALIAS = {"bradesco-prime": "bradesco-visa-infinite", "bb-ourocard-debito": "bb-ourocard-infinite", "bradesco-visa-platinum": "bradesco-visa-platinum-sem-anuidade", "bradesco-elo-internacional-funcao-credito": "bradesco-multiplo-elo", "btg-black-visual": "btg-black", "itau-latam-pass-platinum": "itau-latam-black", "itau-platinum": "itau-latam-black", "santander-sx": "santander-free", "caixa-icone": "caixa-infinite"};
const fModeloId = (id) => F_MODELO_ALIAS[id] || id;
const F_MODELO_COR = {
  "bradesco-prime": { preto: true }, "santander-unique": { preto: true }, "itau-latam-black": { preto: true },
  "bb-ourocard-infinite": { preto: true },
  "caixa-sim": { fundo: "#0a5fb4", tinta: "#ffffff", cg: "linear-gradient(120deg,#2b9be0 0%,#0a62b6 60%,#0b4f9c 100%)" },
  "caixa-universitario": { fundo: "#62c48a", tinta: "#ffffff", cg: "linear-gradient(120deg,#bfdc4a 0%,#66c58a 55%,#34b2a2 100%)" },
  "caixa-gold": { fundo: "#05476e", tinta: "#ffffff", cg: "linear-gradient(200deg,rgba(255,255,255,.07) 0 40%,transparent 40%),linear-gradient(160deg,#0b6c95 0%,#05486f 60%,#033a5c 100%)" },
  "caixa-elo-mais": { fundo: "#05476e", tinta: "#ffffff", cg: "linear-gradient(200deg,rgba(255,255,255,.07) 0 40%,transparent 40%),linear-gradient(160deg,#0b6c95 0%,#05486f 60%,#033a5c 100%)" },
  "caixa-infinite": { fundo: "#0b0b0c", tinta: "#ffffff", cg: "radial-gradient(120% 55% at 45% 112%,rgba(255,255,255,.38),transparent 62%),linear-gradient(180deg,#1a1a1b,#050505)" },
  "caixa-icone": { fundo: "#0d2b4c", tinta: "#ffffff", cg: "linear-gradient(140deg,transparent 47%,rgba(255,255,255,.4) 52%,transparent 58%),linear-gradient(160deg,#123459 0%,#0b2742 100%)" },
  "caixa-nanquim": { fundo: "#111112", tinta: "#ffffff", cg: "radial-gradient(90% 60% at 20% 100%,rgba(255,255,255,.14),transparent 60%),linear-gradient(160deg,#2b2b2d 0%,#0b0b0c 100%)" },
  "caixa-diners": { fundo: "#121212", tinta: "#e8c48a", cg: "linear-gradient(160deg,#262422 0%,#0d0c0b 100%)" },
  "caixa-platinum": { fundo: "#cfd3d6", tinta: "#3b3f43", cg: "linear-gradient(115deg,#e6e4dc 0%,#d6d8d8 48%,#c7ccd0 100%)" },
  "btg-ultrablue": { fundo: "#1d3c70", tinta: "#ffffff", cg: "repeating-linear-gradient(90deg,rgba(255,255,255,.035) 0 1px,transparent 1px 4px),linear-gradient(165deg,#2c5291 0%,#1a3768 55%,#0f2550 100%)" },
  "brb-connect": { fundo: "#0a63c9", tinta: "#ffffff", cg: "linear-gradient(200deg,#0b3c96 0%,#0a5fc4 50%,#169fe4 100%)" },
  "inter-laranja": { fundo: "#ff7a00", tinta: "#ffffff", cg: "linear-gradient(160deg,#ff8c22 0%,#ff7300 60%,#ff6a00 100%)" },
  "c6-carbon": { fundo: "#1b1b1d", tinta: "#f2f2f3", cg: "repeating-linear-gradient(135deg,rgba(255,255,255,.035) 0 2px,transparent 2px 5px),linear-gradient(160deg,#2a2a2d 0%,#141416 100%)" },
  "amazon-bradesco": { fundo: "#ffffff", tinta: "#232f3e", cg: "linear-gradient(160deg,#ffffff 0%,#f3f4f6 100%)" } };
// biblioteca de modelos: [id, banco, nome, o que vai escrito no cartão, cor do alto, cor de baixo, tinta]. As cores foram medidas nas
// imagens dos cartões de cada banco (só as cores: nenhuma imagem vem no pacote); o desenho é o do banco (logo, chip, bandeira)
const F_BIBLIOTECA = [
  ["bradesco-visa-gold", "bradesco", "Visa Gold", "Gold", "#bb8840", "#b4823c", "#ffffff"],
  ["bradesco-universitario-visa-gold", "bradesco", "Universitário Visa Gold", "Universitário Gold", "#5b6163", "#5c5b5b", "#ffffff"],
  ["bradesco-neo-visa-platinum", "bradesco", "Neo Visa Platinum", "Neo Platinum", "#a53e6b", "#90306c", "#ffffff"],
  ["bradesco-like-visa", "bradesco", "Like Visa", "Like", "#9f345f", "#ab2950", "#ffffff"],
  ["bradesco-visa-signature", "bradesco", "Visa Signature", "Signature", "#5b5d5f", "#555759", "#ffffff"],
  ["bradesco-visa-infinite", "bradesco", "Visa Infinite", "Infinite", "#0e0f0f", "#060606", "#ffffff"],
  ["bradesco-visa-aeternum", "bradesco", "Visa Aeternum", "Aeternum", "#0b0a0c", "#070507", "#ffffff"],
  ["bradesco-gol-smiles-visa-gold", "bradesco", "Gol Smiles Visa Gold", "Gol Smiles Gold", "#8e4c15", "#7c3b10", "#ffffff"],
  ["bradesco-gol-smiles-visa-platinum", "bradesco", "Gol Smiles Visa Platinum", "Gol Smiles Platinum", "#365b6f", "#2e4e60", "#ffffff"],
  ["bradesco-gol-smiles-visa-infinite", "bradesco", "Gol Smiles Visa Infinite", "Gol Smiles Infinite", "#252524", "#252524", "#ffffff"],
  ["bradesco-horizon-visa-infinite", "bradesco", "Horizon Visa Infinite", "Horizon Infinite", "#1d1d1e", "#121213", "#ffffff"],
  ["bradesco-united-mileageplus-visa-infinit", "bradesco", "United MileagePlus Visa Infinite", "United MileagePlus Infinite", "#121619", "#0d1215", "#ffffff"],
  ["bradesco-marriott-bonvoy-visa-infinite", "bradesco", "Marriott Bonvoy® Visa Infinite", "Marriott Bonvoy® Infinite", "#13120f", "#0e0d0a", "#ffffff"],
  ["bradesco-agora-visa-infinite", "bradesco", "Ágora Visa Infinite", "Ágora Infinite", "#0b3233", "#00292a", "#ffffff"],
  ["bradesco-visa-internacional", "bradesco", "Visa Internacional", "Internacional", "#11427f", "#184178", "#ffffff"],
  ["bradesco-gol-smiles-visa-internacional", "bradesco", "Gol Smiles Visa Internacional", "Gol Smiles Internacional", "#6c153e", "#5f1033", "#ffffff"],
  ["bradesco-seguros-visa-gold", "bradesco", "Seguros Visa Gold", "Seguros Gold", "#bb9f64", "#5c3d29", "#ffffff"],
  ["bradesco-seguros-visa-platinum", "bradesco", "Seguros Visa Platinum", "Seguros Platinum", "#999b9c", "#6f7174", "#ffffff"],
  ["bradesco-seguros-visa-signature", "bradesco", "Seguros Visa Signature", "Seguros Signature", "#606163", "#555759", "#ffffff"],
  ["bradesco-visa-nacional", "bradesco", "Visa Nacional", "Nacional", "#31487c", "#354976", "#ffffff"],
  ["bradesco-visa-universitario-nacional", "bradesco", "Visa Universitário Nacional", "Universitário Nacional", "#5f6264", "#5d5c5d", "#ffffff"],
  ["bradesco-visa-nacional-mais", "bradesco", "Visa Nacional Mais", "Nacional Mais", "#9f1b28", "#a72d39", "#ffffff"],
  ["bradesco-music-visa-platinum", "bradesco", "Music Visa Platinum", "Music Platinum", "#2f2728", "#14131b", "#ffffff"],
  ["bradesco-visa-basico", "bradesco", "Visa Básico", "Básico", "#5887cd", "#6295c8", "#ffffff"],
  ["bradesco-sos-mata-atlantica", "bradesco", "SOS Mata Atlântica", "SOS Mata Atlântica", "#508a4a", "#547752", "#ffffff"],
  ["bb-ourocard-facil", "bb", "Ourocard Fácil", "Ourocard Fácil", "#ffe800", "#ffe600", "#1f2430"],
  ["bb-ourocard-universitario", "bb", "Ourocard Universitário", "Ourocard Universitário", "#ffe800", "#ffe600", "#1f2430"],
  ["bb-ourocard-visa-gold", "bb", "Ourocard Visa Gold", "Ourocard Gold", "#ccbb70", "#cbba70", "#1f2430"],
  ["bb-ourocard-visa-platinum", "bb", "Ourocard Visa Platinum (modelo antigo)", "Ourocard Platinum", "#898b8e", "#898b8e", "#ffffff"],
  ["bb-ourocard-elo", "bb", "Ourocard Elo", "Ourocard", "#ffe700", "#ffe600", "#1f2430"],
  ["bb-ourocard-elo-mais", "bb", "Ourocard Elo Mais", "Ourocard Mais", "#cbba6f", "#cab96f", "#1f2430"],
  ["bb-ourocard-grafite", "bb", "Ourocard Grafite", "Ourocard Grafite", "#88898d", "#87888c", "#ffffff"],
  ["bb-ourocard-nanquim", "bb", "Ourocard Nanquim", "Ourocard Nanquim", "#20140f", "#221612", "#ffffff"],
  ["bb-ourocard-platinum-mastercard", "bb", "Ourocard Platinum Mastercard", "Ourocard Platinum", "#88898d", "#898a8e", "#ffffff"],
  ["bb-ourocard-mastercard-black", "bb", "Ourocard Mastercard Black", "Ourocard Black", "#020202", "#040405", "#ffffff"],
  ["bb-ourocard-pre-pago", "bb", "Ourocard Pré-Pago", "Ourocard Pré-Pago", "#689ec0", "#1684c1", "#ffffff"],
  ["bb-ourocard-travelmoney", "bb", "Ourocard TravelMoney", "Ourocard TravelMoney", "#7ba044", "#2a7934", "#ffffff"],
  ["bb-smiles-gold", "bb", "Smiles Gold", "Smiles Gold", "#9b5933", "#8a4c31", "#ffffff"],
  ["bb-smiles-platinum", "bb", "Smiles Platinum", "Smiles Platinum", "#416a7b", "#3f6371", "#ffffff"],
  ["bb-smiles-infinite", "bb", "Smiles Infinite", "Smiles Infinite", "#0a0a0b", "#0a0a0a", "#ffffff"],
  ["bb-dotz-international", "bb", "Dotz International", "Dotz International", "#264b9b", "#224797", "#ffffff"],
  ["bb-dotz-platinum", "bb", "Dotz Platinum", "Dotz Platinum", "#a4a4a8", "#a3a1a4", "#1f2430"],
  ["santander-unlimited", "santander", "Santander Unlimited", "Unlimited", "#070808", "#000000", "#ffffff"],
  ["santander-elite", "santander", "Santander Elite", "Elite", "#4b4d4f", "#424345", "#ffffff"],
  ["santander-aadvantage-black", "santander", "AAdvantage Black", "AAdvantage Black", "#4f4c49", "#3a3632", "#ffffff"],
  ["santander-aadvantage-platinum", "santander", "AAdvantage Platinum", "AAdvantage Platinum", "#6e6a6b", "#605f5e", "#ffffff"],
  ["santander-aadvantage-quantum", "santander", "AAdvantage Quartz", "AAdvantage Quartz", "#e3e0e4", "#fcfdfd", "#1f2430"],
  ["santander-smiles-infinite", "santander", "Smiles Infinite", "Smiles Infinite", "#2b2728", "#292627", "#ffffff"],
  ["santander-smiles-platinum", "santander", "Smiles Platinum", "Smiles Platinum", "#3f6a7c", "#3c6271", "#ffffff"],
  ["santander-smiles-gold", "santander", "Smiles Gold", "Smiles Gold", "#914a15", "#7e3a0f", "#ffffff"],
  ["btg-ultrablue-world-legend", "btg", "Ultrablue World Legend", "Ultrablue World Legend", "#204576", "#133460", "#ffffff"],
  ["btg-platinum", "btg", "Platinum · prata", "Platinum", "#465868", "#465868", "#ffffff"],
  ["btg-gold", "btg", "Gold · azul", "Gold", "#092789", "#082689", "#ffffff"],
  ["btg-tap-black", "btg", "TAP Black", "TAP Black", "#040404", "#020202", "#ffffff"],
  ["btg-black", "btg", "Black · azul-noite", "Black", "#0e2536", "#0d2535", "#ffffff"],
  ["nubank-roxo", "nubank", "Nubank Roxo (Gold e Platinum)", "", "#592591", "#7f2ecb", "#ffffff"],
  ["nubank-croma", "nubank", "Nubank Croma", "", "#dedede", "#dcdbdc", "#1f2430"],
  ["nubank-ultravioleta", "nubank", "Nubank Ultravioleta", "Ultravioleta", "#48246c", "#331a58", "#ffffff"],
  ["itau-azul-infinite", "itau", "Azul Infinite", "Azul Infinite", "#f6f7fb", "#d9e1f0", "#1f2430"],
  ["itau-azul-skyline", "itau", "Azul Skyline", "Azul Skyline", "#ffffff", "#e6eaf1", "#1f2430"],
  ["itau-azul-platinum", "itau", "Azul Platinum", "Azul Platinum", "#3e5f9a", "#16244a", "#ffffff"],
  ["itau-passai-gold", "itau", "Passaí Gold", "Passaí Gold", "#d6b34a", "#a8862a", "#1f2430"],
  ["itau-uniclass-signature", "itau", "Uniclass Signature", "Uniclass Signature", "#2347b3", "#132c78", "#ffffff"],
  ["itau-personnalite", "itau", "Personnalité", "Personnalité", "#262628", "#0b0b0c", "#ffffff"],
  ["mercadopago-mercado-pago", "mercadopago", "Mercado Pago", "", "#2a2a2c", "#0e0e0f", "#ffffff"],
  ["infinitepay-infinitepay", "infinitepay", "InfinitePay", "", "#111111", "#111111", "#ffffff"],
  ["c6-sunset", "c6", "C6 Sunset", "", "#f4a89d", "#ec5579", "#ffffff"],
  ["c6-bubblegum", "c6", "C6 Bubblegum", "", "#f962b2", "#fc2280", "#ffffff"],
  ["c6-red", "c6", "C6 Red", "", "#dc5c51", "#bd4138", "#ffffff"],
  ["c6-gold", "c6", "C6 Gold", "", "#f2cf79", "#d2a54e", "#1f2430"],
  ["c6-pink", "c6", "C6 Pink", "", "#ead3d3", "#e8c7c7", "#1f2430"],
  ["c6-boreal-forest", "c6", "C6 Boreal Forest", "", "#b9bcae", "#6f776a", "#ffffff"],
  ["c6-silver", "c6", "C6 Silver", "", "#ececec", "#cfcfcf", "#1f2430"],
  ["c6-rainbow", "c6", "C6 Rainbow", "", "#ccd9e3", "#a3a5bd", "#1f2430"],
  ["c6-acqua", "c6", "C6 Acqua", "", "#46b0b7", "#37aeb6", "#ffffff"],
  ["c6-blue", "c6", "C6 Blue", "", "#6c7488", "#505769", "#ffffff"],
  ["c6-platinum", "c6", "C6 Platinum", "Platinum", "#c2bfb7", "#888b82", "#1f2430"],
  ["c6-black", "c6", "C6 Black", "Black", "#292928", "#0c0c0c", "#ffffff"],
  ["c6-graphene", "c6", "C6 Graphene World Legend", "Graphene", "#b4b4b4", "#737373", "#1f2430"],
  ["inter-platinum", "inter", "Inter Platinum", "Platinum", "#afaeae", "#888786", "#ffffff"],
  ["inter-prime", "inter", "Inter Prime", "Prime", "#525252", "#3d3d3c", "#ffffff"],
  ["inter-win", "inter", "Inter Win", "Win", "#2f415b", "#152842", "#ffffff"],
  ["bb-saraiva", "bb", "Saraiva", "Saraiva", "#59595a", "#58585a", "#ffffff"],
  ["bb-petrobras", "bb", "Petrobras", "Petrobras", "#ffffff", "#ffffff", "#1f2430"],
  ["bradesco-disney-visa-infinite-magia", "bradesco", "Disney Visa Infinite Magia", "Disney Infinite Magia", "#002146", "#01254d", "#ffffff"],
  ["bradesco-disney-visa-infinite-star-wars", "bradesco", "Disney Visa Infinite Star Wars", "Disney Infinite Star Wars", "#070707", "#100f10", "#ffffff"],
  ["bradesco-disney-visa-infinite-amigos", "bradesco", "Disney Visa Infinite Amigos", "Disney Infinite Amigos", "#e72446", "#e62f45", "#ffffff"],
  ["bradesco-disney-visa-signature-amigos", "bradesco", "Disney Visa Signature Amigos", "Disney Signature Amigos", "#e72446", "#e62f45", "#ffffff"],
  ["bradesco-disney-visa-signature-star-wars", "bradesco", "Disney Visa Signature Star Wars", "Disney Signature Star Wars", "#070707", "#101010", "#ffffff"],
  ["bradesco-visa-platinum-sem-anuidade", "bradesco", "Visa Platinum sem anuidade", "Platinum", "#737474", "#767776", "#ffffff"],
  ["bradesco-harley-davidson-visa-platinum", "bradesco", "Harley Davidson Visa Platinum", "Harley Davidson Platinum", "#2d2c2c", "#222222", "#ffffff"],
  ["bradesco-harley-davidson-visa-signature", "bradesco", "Harley Davidson Visa Signature", "Harley Davidson Signature", "#35342e", "#30302a", "#ffffff"],
  ["bradesco-sos-visa-gold", "bradesco", "SOS Mata Atlântica Visa Gold", "SOS Mata Atlântica Gold", "#4f8649", "#4c8047", "#ffffff"],
  ["bradesco-sos-visa-platinum", "bradesco", "SOS Mata Atlântica Visa Platinum", "SOS Mata Atlântica Platinum", "#4f8649", "#4c8047", "#ffffff"],
  ["bradesco-amex-green", "bradesco", "American Express Green", "Green", "#8fc5b3", "#90c6b3", "#1f2430"],
  ["bradesco-amex-gold-card", "bradesco", "American Express Gold Card", "Gold Card", "#b1a05f", "#b1a060", "#ffffff"],
  ["bradesco-the-platinum-card", "bradesco", "The Platinum Card", "", "#cdcdcc", "#cacaca", "#1f2430"],
  ["bradesco-amex-credit", "bradesco", "American Express Credit", "Credit", "#e7e8e9", "#e1e3e4", "#1f2430"],
  ["bradesco-amex-credit-2", "bradesco", "American Express Credit", "Credit", "#85b2dc", "#8bb6de", "#1f2430"],
  ["bradesco-amex-blue", "bradesco", "American Express Blue", "Blue", "#85b2dc", "#8bb6de", "#1f2430"],
  ["bradesco-amex-gold-credit", "bradesco", "American Express Gold Credit", "Gold Credit", "#cdbf86", "#c5b67e", "#1f2430"],
  ["bradesco-seguros-amex-gold", "bradesco", "Seguros American Express Gold", "Seguros Gold", "#c2ae4d", "#4c0d0e", "#ffffff"],
  ["bradesco-amex-gold-credit-2", "bradesco", "American Express Gold Credit", "Gold Credit", "#cdbf86", "#c5b67e", "#1f2430"],
  ["bradesco-gold-amex", "bradesco", "Gold American Express", "Gold", "#b9954a", "#b7944a", "#ffffff"],
  ["bradesco-seguros-amex-platinum", "bradesco", "Seguros American Express Platinum", "Seguros Platinum", "#b1b3b5", "#6d6b5c", "#ffffff"],
  ["bradesco-platinum-amex", "bradesco", "Platinum American Express", "Platinum", "#7d7c7c", "#6e7171", "#ffffff"],
  ["bradesco-amex-platinum-credit", "bradesco", "American Express Platinum Credit", "Platinum Credit", "#b4bbbf", "#b3bcc2", "#1f2430"],
  ["bradesco-elo-consignado-inss-internacional", "bradesco", "Elo Consignado INSS Internacional", "Consignado INSS Internacional", "#752326", "#7a2527", "#ffffff"],
  ["bradesco-elo-consignado-internacional", "bradesco", "Elo Consignado Internacional", "Consignado Internacional", "#053e61", "#08446c", "#ffffff"],
  ["bradesco-elo-internacional", "bradesco", "Elo Internacional", "Internacional", "#223c7a", "#243e79", "#ffffff"],
  ["bradesco-elo-mais-internacional", "bradesco", "Elo Mais Internacional", "Mais Internacional", "#a0875c", "#987f50", "#ffffff"],
  ["bradesco-elo-grafite", "bradesco", "Elo Grafite", "Grafite", "#5f5e5e", "#5f5f5f", "#ffffff"],
  ["bradesco-elo-nanquim", "bradesco", "Elo Nanquim", "Nanquim", "#000000", "#000000", "#ffffff"],
  ["bradesco-elo-diners-club", "bradesco", "Elo Diners Club", "Diners Club", "#070308", "#070308", "#ffffff"],
  ["bradesco-elo-nacional", "bradesco", "Elo Nacional", "Nacional", "#223c7a", "#243e79", "#ffffff"],
  ["bradesco-seguros-elo-nacional", "bradesco", "Seguros Elo Nacional", "Seguros Nacional", "#0060af", "#003d73", "#ffffff"],
  ["bradesco-music-elo-nacional", "bradesco", "Music Elo Nacional", "Music Nacional", "#0b0001", "#000624", "#ffffff"],
  ["bradesco-elo-plus", "bradesco", "Elo Plus", "Plus", "#6b1d1d", "#611719", "#ffffff"],
  ["bradesco-elo-mais", "bradesco", "Elo Mais", "Mais", "#b19053", "#b29153", "#ffffff"],
  ["bradesco-elo-universitario-funcao-credito", "bradesco", "Elo Universitário Função Crédito", "Universitário", "#24210c", "#24210c", "#ffffff"],
  ["bradesco-music-elo-internacional", "bradesco", "Music Elo Internacional", "Music Internacional", "#0b0001", "#000624", "#ffffff"],
  ["bradesco-elo-plus-internacional", "bradesco", "Elo Plus Internacional", "Plus Internacional", "#6b1d1d", "#611719", "#ffffff"],
  ["bradesco-seguros-elo-internacional", "bradesco", "Seguros Elo Internacional", "Seguros Internacional", "#355b9f", "#223d6c", "#ffffff"],
  ["bradesco-seguros-elo-mais", "bradesco", "Seguros Elo Mais", "Seguros Mais", "#a48f53", "#4b3324", "#ffffff"],
  ["bradesco-seguros-elo-grafite", "bradesco", "Seguros Elo Grafite", "Seguros Grafite", "#929295", "#666664", "#ffffff"],
  ["bradesco-seguros-elo-nanquim", "bradesco", "Seguros Elo Nanquim", "Seguros Nanquim", "#000000", "#000000", "#ffffff"],
  ["bradesco-elo-consignado-inss", "bradesco", "Elo Consignado INSS", "Consignado INSS", "#891e22", "#8c1f22", "#ffffff"],
  ["bradesco-elo-consignado", "bradesco", "Elo Consignado", "Consignado", "#264162", "#29476c", "#ffffff"],
  ["bradesco-elo-internacional-basico", "bradesco", "Elo Internacional Básico", "Internacional Básico", "#0a89cc", "#0583c7", "#ffffff"],
  ["bradesco-fas-elo-internacional", "bradesco", "Amazonas Sustentável Elo Internacional", "Amazonas Sustentável Internacional", "#5d553d", "#58483c", "#ffffff"],
  ["bradesco-sos-elo-internacional", "bradesco", "SOS Mata Atlântica Elo internacional", "SOS Mata Atlântica internacional", "#50874a", "#4c7f47", "#ffffff"],
  ["bradesco-elo-nacional-funcao-credito", "bradesco", "Elo Nacional - Função Crédito", "Nacional", "#721b24", "#721c24", "#ffffff"],
  ["bradesco-mastercard-nacional", "bradesco", "Mastercard Nacional", "Nacional", "#243e7b", "#263f72", "#ffffff"],
  ["bradesco-mastercard-internacional", "bradesco", "Mastercard Internacional", "Internacional", "#223c7a", "#253d72", "#ffffff"],
  ["bradesco-mastercard-gold", "bradesco", "Mastercard Gold", "Gold", "#b68034", "#b87e33", "#ffffff"],
  ["bradesco-mastercard-platinum", "bradesco", "Mastercard Platinum", "Platinum", "#727372", "#797672", "#ffffff"],
  ["bradesco-mastercard-black", "bradesco", "Mastercard Black", "Black", "#000000", "#000000", "#ffffff"],
  ["bradesco-gol-smiles-mastercard-internacional", "bradesco", "Gol Smiles Mastercard Internacional", "Gol Smiles Internacional", "#f5f0ca", "#f5d783", "#1f2430"],
  ["bradesco-gol-smiles-mastercard-gold", "bradesco", "Gol Smiles Mastercard Gold", "Gol Smiles Gold", "#aba038", "#95741c", "#ffffff"],
  ["bradesco-gol-smiles-mastercard-platinum", "bradesco", "Gol Smiles Mastercard Platinum", "Gol Smiles Platinum", "#d0d3d5", "#b2b2b4", "#1f2430"],
  ["bradesco-fas-mastercard-gold", "bradesco", "Amazonas Sustentável Mastercard Gold", "Amazonas Sustentável Gold", "#5b603b", "#634433", "#ffffff"],
  ["bradesco-fas-mastercard-internacional", "bradesco", "Amazonas Sustentável Mastercard Internacional", "Amazonas Sustentável Internacional", "#5d553a", "#603f33", "#ffffff"],
  ["bradesco-fas-mastercard-nacional", "bradesco", "Amazonas Sustentável Mastercard Nacional", "Amazonas Sustentável Nacional", "#5b553a", "#603f33", "#ffffff"],
  ["bradesco-debito-visa-internacional", "bradesco", "Débito Visa Internacional", "Débito Internacional", "#7c141d", "#881520", "#ffffff"],
  ["bradesco-debito-visa", "bradesco", "Débito Visa", "Débito", "#9796a2", "#d61c22", "#ffffff"],
  ["bradesco-multiplo-universitario-visa", "bradesco", "Múltiplo Universitário Visa", "Múltiplo Universitário", "#241903", "#241903", "#ffffff"],
  ["bradesco-debito-click-conta-visa", "bradesco", "Débito Click Conta Visa", "Débito Click Conta", "#21236f", "#232572", "#ffffff"],
  ["bradesco-debito-poupcard-visa", "bradesco", "Débito Poupcard Visa", "Débito Poupcard", "#197bae", "#1b79ab", "#ffffff"],
  ["bradesco-debito-conta-salario-visa", "bradesco", "Débito Conta salário Visa", "Débito Conta salário", "#807e8b", "#a50c0f", "#ffffff"],
  ["bradesco-debito-inss-visa", "bradesco", "Débito INSS Visa", "Débito INSS", "#b4151c", "#663a3c", "#ffffff"],
  ["bradesco-debito-bpc-visa", "bradesco", "Débito BPC Visa", "Débito BPC", "#cdd7cb", "#bcbbb6", "#1f2430"],
  ["bradesco-debito-elo-internacional", "bradesco", "Débito Elo Internacional", "Débito Internacional", "#6a1a22", "#711b24", "#ffffff"],
  ["bradesco-multiplo-elo", "bradesco", "Múltiplo Elo", "Múltiplo", "#721b24", "#721c24", "#ffffff"],
  ["bradesco-multiplo-universitario-elo", "bradesco", "Múltiplo Universitário Elo", "Múltiplo Universitário", "#24210c", "#24210c", "#ffffff"],
  ["bradesco-debito-universitario-elo", "bradesco", "Débito Universitário Elo", "Débito Universitário", "#24210c", "#24210c", "#ffffff"],
  ["bradesco-debito-click-conta-elo", "bradesco", "Débito Click Conta Elo", "Débito Click Conta", "#252a83", "#262983", "#ffffff"],
  ["bradesco-debito-poupcard-elo", "bradesco", "Débito Poupcard Elo", "Débito Poupcard", "#1577aa", "#1575a7", "#ffffff"],
  ["bradesco-debito-conta-salario-elo", "bradesco", "Débito Conta salário Elo", "Débito Conta salário", "#807e8b", "#a10c0f", "#ffffff"],
  ["bradesco-debito-inss-elo", "bradesco", "Débito INSS Elo", "Débito INSS", "#a01a1f", "#9f4f51", "#ffffff"],
  ["bradesco-debito-bpc-elo", "bradesco", "Débito BPC Elo", "Débito BPC", "#d0d7cb", "#b7b6b2", "#1f2430"],
  ["brb-visa-infinite", "brb", "Visa Infinite", "Infinite", "#4f4e4e", "#191919", "#ffffff"],
  ["brb-mastercard-black", "brb", "Mastercard Black", "Black", "#504f4f", "#1a1a1a", "#ffffff"],
  ["brb-visa-platinum", "brb", "Visa Platinum", "Platinum", "#a8a7a7", "#807f7f", "#ffffff"],
  ["brb-visa-gold", "brb", "Visa Gold", "Gold", "#b29f5b", "#816724", "#ffffff"],
  ["brb-nacao-brb-fla", "brb", "Nação BRB Fla", "Nação BRB Fla", "#5e1627", "#471827", "#ffffff"],
  ["santander-free", "santander", "Santander FREE", "Santander FREE", "#671111", "#030305", "#ffffff"],
  ["brb-mastercard-platinum", "brb", "Mastercard Platinum", "Platinum", "#a9a3a2", "#807f7f", "#ffffff"],
  ["brb-mastercard-gold", "brb", "Mastercard Gold", "Gold", "#b29953", "#816725", "#ffffff"],
  ["brb-mastercard-connect", "brb", "Mastercard Connect", "Connect", "#004f8b", "#0090d3", "#ffffff"],
  ["bb-ourocard-visa-platinum-v", "bb", "Ourocard Visa Platinum", "Platinum", "#90a0a8", "#83939c", "#ffffff"],
  ["bb-ourocard-infinite-v", "bb", "Ourocard Visa Infinite", "Infinite", "#2a2a2a", "#080808", "#ffffff"],
  ["c6-basico", "c6", "C6", "", "#f8806d", "#e6405f", "#ffffff"]
];
const F_MODELO_ROT = { "btg-ultrablue": "Ultrablue" };  // o que vai escrito no cartão, por modelo
for (const [id, bco, nome, rot, a, b, tinta] of F_BIBLIOTECA) {
  if (F_MODELOS[id]) continue;
  F_MODELOS[id] = [bco, nome];
  F_MODELO_COR[id] = { fundo: a, tinta, cg: `linear-gradient(160deg,${a} 0%,${b} 100%)` };
  F_MODELO_ROT[id] = rot;
}
// bandeira de cada modelo (da lista dos sites dos bancos; sem ela, o nome do modelo dá a pista) e a função dos que não são de crédito
const F_MODELO_BAND = {"bb-ourocard-facil": "Visa", "bb-ourocard-universitario": "Visa", "bb-ourocard-visa-gold": "Visa", "bb-ourocard-visa-platinum": "Visa", "bb-ourocard-infinite": "Visa", "bb-ourocard-elo": "Elo", "bb-ourocard-elo-mais": "Elo", "bb-ourocard-grafite": "Elo", "bb-ourocard-nanquim": "Elo", "bb-ourocard-platinum-mastercard": "Mastercard", "bb-ourocard-mastercard-black": "Mastercard", "bb-ourocard-pre-pago": "Visa", "bb-ourocard-travelmoney": "Visa", "bb-smiles-gold": "Visa", "bb-smiles-platinum": "Visa", "bb-smiles-infinite": "Visa", "bb-saraiva": "Visa", "bb-petrobras": "Visa", "bb-dotz-international": "Visa", "bb-dotz-platinum": "Visa", "bb-ame": "Mastercard", "bradesco-visa-gold": "Visa", "bradesco-universitario-visa-gold": "Visa", "bradesco-neo-visa-platinum": "Visa", "bradesco-visa-platinum": "Visa", "bradesco-like-visa": "Visa", "bradesco-visa-signature": "Visa", "bradesco-visa-infinite": "Visa", "bradesco-visa-aeternum": "Visa", "bradesco-gol-smiles-visa-gold": "Visa", "bradesco-gol-smiles-visa-platinum": "Visa", "bradesco-gol-smiles-visa-infinite": "Visa", "bradesco-disney-visa-infinite-magia": "Visa", "bradesco-disney-visa-infinite-star-wars": "Visa", "bradesco-disney-visa-infinite-amigos": "Visa", "bradesco-disney-visa-signature-amigos": "Visa", "bradesco-disney-visa-signature-star-wars": "Visa", "bradesco-horizon-visa-infinite": "Visa", "bradesco-united-mileageplus-visa-infinit": "Visa", "bradesco-marriott-bonvoy-visa-infinite": "Visa", "bradesco-agora-visa-infinite": "Visa", "bradesco-visa-platinum-sem-anuidade": "Visa", "bradesco-visa-internacional": "Visa", "bradesco-gol-smiles-visa-internacional": "Visa", "bradesco-harley-davidson-visa-platinum": "Visa", "bradesco-harley-davidson-visa-signature": "Visa", "bradesco-seguros-visa-gold": "Visa", "bradesco-seguros-visa-platinum": "Visa", "bradesco-seguros-visa-signature": "Visa", "bradesco-visa-nacional": "Visa", "bradesco-visa-universitario-nacional": "Visa", "bradesco-visa-nacional-mais": "Visa", "bradesco-music-visa-platinum": "Visa", "bradesco-visa-basico": "Visa", "bradesco-sos-mata-atlantica": "Visa", "bradesco-sos-visa-gold": "Visa", "bradesco-sos-visa-platinum": "Visa", "bradesco-amex-green": "Amex", "bradesco-amex-gold-card": "Amex", "bradesco-the-platinum-card": "Amex", "bradesco-amex-credit": "Amex", "bradesco-amex-credit-2": "Amex", "bradesco-amex-blue": "Amex", "bradesco-amex-gold-credit": "Amex", "bradesco-seguros-amex-gold": "Amex", "bradesco-amex-gold-credit-2": "Amex", "bradesco-gold-amex": "Amex", "bradesco-seguros-amex-platinum": "Amex", "bradesco-platinum-amex": "Amex", "bradesco-amex-platinum-credit": "Amex", "bradesco-elo-consignado-inss-internacional": "Elo", "bradesco-elo-consignado-internacional": "Elo", "bradesco-elo-internacional": "Elo", "bradesco-elo-mais-internacional": "Elo", "bradesco-elo-grafite": "Elo", "bradesco-elo-nanquim": "Elo", "bradesco-elo-diners-club": "Elo", "bradesco-elo-nacional": "Elo", "bradesco-seguros-elo-nacional": "Elo", "bradesco-music-elo-nacional": "Elo", "bradesco-elo-plus": "Elo", "bradesco-elo-mais": "Elo", "bradesco-elo-universitario-funcao-credito": "Elo", "bradesco-music-elo-internacional": "Elo", "bradesco-elo-plus-internacional": "Elo", "bradesco-seguros-elo-internacional": "Elo", "bradesco-seguros-elo-mais": "Elo", "bradesco-seguros-elo-grafite": "Elo", "bradesco-seguros-elo-nanquim": "Elo", "bradesco-elo-consignado-inss": "Elo", "bradesco-elo-consignado": "Elo", "bradesco-elo-internacional-basico": "Elo", "bradesco-fas-elo-internacional": "Elo", "bradesco-elo-internacional-funcao-credito": "Elo", "bradesco-sos-elo-internacional": "Elo", "bradesco-elo-nacional-funcao-credito": "Elo", "bradesco-mastercard-nacional": "Mastercard", "bradesco-mastercard-internacional": "Mastercard", "bradesco-mastercard-gold": "Mastercard", "bradesco-mastercard-platinum": "Mastercard", "bradesco-mastercard-black": "Mastercard", "bradesco-gol-smiles-mastercard-internacional": "Mastercard", "bradesco-gol-smiles-mastercard-gold": "Mastercard", "bradesco-gol-smiles-mastercard-platinum": "Mastercard", "bradesco-fas-mastercard-gold": "Mastercard", "bradesco-fas-mastercard-internacional": "Mastercard", "bradesco-fas-mastercard-nacional": "Mastercard", "bradesco-debito-visa-internacional": "Visa", "bradesco-debito-visa": "Visa", "bradesco-multiplo-universitario-visa": "Visa", "bradesco-debito-click-conta-visa": "Visa", "bradesco-debito-poupcard-visa": "Visa", "bradesco-debito-conta-salario-visa": "Visa", "bradesco-debito-inss-visa": "Visa", "bradesco-debito-bpc-visa": "Visa", "bradesco-debito-elo-internacional": "Elo", "bradesco-multiplo-elo": "Elo", "bradesco-multiplo-universitario-elo": "Elo", "bradesco-debito-universitario-elo": "Elo", "bradesco-debito-click-conta-elo": "Elo", "bradesco-debito-poupcard-elo": "Elo", "bradesco-debito-conta-salario-elo": "Elo", "bradesco-debito-inss-elo": "Elo", "bradesco-debito-bpc-elo": "Elo", "amazon-bradesco": "Mastercard", "bradesco-amazon-prime": "Mastercard", "brb-visa-infinite": "Visa", "brb-mastercard-black": "Mastercard", "brb-visa-platinum": "Visa", "brb-visa-gold": "Visa", "brb-connect": "Visa", "brb-nacao-brb-fla": ["Visa", "Mastercard"], "btg-ultrablue-world-legend": "Mastercard", "btg-ultrablue": "Mastercard", "btg-black": "Mastercard", "btg-platinum": "Mastercard", "btg-gold": "Mastercard", "btg-tap-black": "Mastercard", "c6-carbon": "Mastercard", "c6-black": "Mastercard", "c6-platinum": "Mastercard", "c6-graphene": "Mastercard", "c6-sunset": "Mastercard", "c6-bubblegum": "Mastercard", "c6-red": "Mastercard", "c6-gold": "Mastercard", "c6-pink": "Mastercard", "c6-boreal-forest": "Mastercard", "c6-silver": "Mastercard", "c6-rainbow": "Mastercard", "c6-acqua": "Mastercard", "c6-blue": "Mastercard", "infinitepay-infinitepay": "Mastercard", "inter-laranja": "Mastercard", "inter-platinum": "Mastercard", "inter-prime": "Mastercard", "inter-win": "Mastercard", "itau-azul-infinite": "Visa", "itau-latam-black": "Mastercard", "itau-azul-platinum": "Visa", "itau-platinum": "Visa", "itau-uniclass-signature": "Visa", "itau-personnalite": "Mastercard", "nubank-roxo": "Mastercard", "nubank-croma": "Mastercard", "nubank-ultravioleta": "Mastercard", "santander-aadvantage-black": "Mastercard", "santander-aadvantage-platinum": "Mastercard", "santander-aadvantage-quantum": "Mastercard", "santander-smiles-infinite": "Visa", "santander-smiles-platinum": "Visa", "santander-smiles-gold": "Visa", "bb-ourocard-debito": "Visa", "bradesco-prime": "Visa", "brb-mastercard-platinum": "Mastercard", "brb-mastercard-gold": "Mastercard", "brb-mastercard-connect": "Mastercard", "c6-basico": "Mastercard", "c6-business": "Mastercard", "itau-azul-gold-visa": "Visa", "itau-azul-gold-mastercard": "Mastercard", "itau-azul-internacional-visa": "Visa", "itau-azul-internacional-mastercard": "Mastercard", "itau-azul-skyline": "Mastercard", "itau-azul-platinum-mastercard": "Mastercard", "itau-instituto-ayrton-senna-mastercard": "Mastercard", "itau-instituto-ayrton-senna-platinum-visa": "Visa", "itau-platinum-mastercard": "Mastercard", "itau-uniclass-black-mastercard": "Mastercard", "itau-uniclass-platinum-mastercard": "Mastercard", "itau-visa-platinum": "Visa", "itau-latam-pass-gold-visa": "Visa", "itau-latam-pass-gold-mastercard": "Mastercard", "itau-latam-pass-infinite-visa": "Visa", "itau-latam-pass-internacional-visa": "Visa", "itau-latam-pass-internacional-mastercard": "Mastercard", "itau-latam-pass-platinum-mastercard": "Mastercard", "itau-latam-pass-platinum-visa": "Visa", "itau-passai-gold": "Visa", "itau-personnalite-black-pontos-mastercard": "Mastercard", "itau-samsung-platinum-visa": "Visa", "itau-samsung-platinum-mastercard": "Mastercard", "itau-n-card-gold-visa": "Visa", "itau-players-bank-platinum": "Mastercard", "itau-pontofrio-internacional-mastercard": "Mastercard", "itau-tim-gold-visa": "Visa", "itau-tim-gold-mastercard": "Mastercard", "itau-tim-internacional-visa": "Visa", "itau-tim-internacional-mastercard": "Mastercard", "itau-tim-platinum-visa": "Visa", "itau-tim-platinum-mastercard": "Mastercard", "itau-empresas": ["Visa", "Mastercard"], "itau-empresas-mastercard-black": "Mastercard", "santander-unlimited": ["Visa", "Mastercard"], "santander-unique": ["Visa", "Mastercard"], "santander-elite": ["Visa", "Mastercard"], "santander-free": ["Visa", "Mastercard"], "bb-ourocard-visa-platinum-v": "Visa", "bb-ourocard-infinite-v": "Visa", "c6-basico": "Mastercard"};
const F_MODELO_FOTO = new Set(["brb-connect", "brb-mastercard-black", "brb-mastercard-connect", "brb-mastercard-gold", "brb-mastercard-platinum", "brb-visa-gold", "brb-visa-infinite", "brb-visa-platinum", "btg-black", "btg-gold", "btg-platinum", "btg-tap-black", "btg-ultrablue", "btg-ultrablue-world-legend", "infinitepay-infinitepay", "inter-laranja", "inter-platinum", "inter-prime", "inter-win", "nubank-croma", "nubank-roxo", "nubank-ultravioleta", "santander-aadvantage-black", "santander-aadvantage-platinum", "santander-aadvantage-quantum", "santander-elite", "santander-free", "santander-smiles-gold", "santander-smiles-infinite", "santander-smiles-platinum", "santander-unique", "santander-unlimited"]);  // gerada por ferramentas/fotos_cartoes.py
const F_MODELO_FUNDO = new Set(["bradesco-amazon-prime", "brb-nacao-brb-fla"]);  // gerada por ferramentas/artes_cartoes.py
const F_MODELO_FUNC = {"bb-ourocard-pre-pago": "prepago", "bb-ourocard-travelmoney": "prepago", "bradesco-debito-visa-internacional": "debito", "bradesco-debito-visa": "debito", "bradesco-multiplo-universitario-visa": "debito", "bradesco-debito-click-conta-visa": "debito", "bradesco-debito-poupcard-visa": "debito", "bradesco-debito-conta-salario-visa": "debito", "bradesco-debito-inss-visa": "debito", "bradesco-debito-bpc-visa": "debito", "bradesco-debito-elo-internacional": "debito", "bradesco-multiplo-universitario-elo": "debito", "bradesco-debito-universitario-elo": "debito", "bradesco-debito-click-conta-elo": "debito", "bradesco-debito-poupcard-elo": "debito", "bradesco-debito-conta-salario-elo": "debito", "bradesco-debito-inss-elo": "debito", "bradesco-debito-bpc-elo": "debito"};
F_MODELO_COR["c6-rainbow"].cg = "linear-gradient(125deg,#dbe7f1 0%,#ecd6ec 28%,#cfe9df 52%,#bdb8dc 78%,#dfe5ee 100%)";  // furta-cor
F_MODELO_COR["infinitepay-infinitepay"].cg = "linear-gradient(180deg,#b9f63c 0%,#8f6dff 38%,#1a1430 70%,#0d0d0f 100%)";  // as faixas verde e roxa no alto
// cartão escuro: a bandeira vai em metal (prata); claro ou colorido: nas cores dela
const F_LUZ = (hex) => { const m = /^#?([0-9a-f]{6})$/i.exec(hex || ""); if (!m) return 0.2; const n = parseInt(m[1], 16);
  const l = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * l(n >> 16) + 0.7152 * l((n >> 8) & 255) + 0.0722 * l(n & 255); };
const F_COR_BANCO = { santander: ["#ec0000", "#ffffff"], bradesco: ["#cc092f", "#ffffff"], bb: ["#fcfc30", "#1d3f9b"], itau: ["#ec7000", "#ffffff"] };  // desenho do cartão: fundo e tinta  // leitores de fatura do script
const F_TIPO_LINHA = { pagamento: "pagamento", estorno: "↩ estorno", iof: "IOF", juros: "juros/encargos", anuidade: "anuidade" };  // aba Energy do Dashboard (faturas da Equatorial)

// Cor e ícone de reserva (os de verdade vêm da árvore de categorias do script)
const F_AREAS = { "Outros": { icone: "📦", cor: "#94a3b8" } };

function instalarFinancas(Classe) {
  const P = Classe.prototype;

  // ---------------------------------------------------------------- estado e dados
  P._finEstado = function () {
    if (this._fIni) return;
    this._fIni = true;
    this._fModo = "mes";
    this._fAno = String(new Date().getFullYear());
    this._fQuem = "Todos";
    this._fArea = null;
    this._fAberta = null;
  };

  // Seções dos itens de cada compra (Hortifrúti, Carnes…). Pede de novo quando a lista de compras muda.
  P._finGarantir = function () {
    const marca = this._dados?.atualizado_em;
    if (this._fPartesDe === marca || this._fPedindo) return;
    this._fPedindo = true;
    Promise.all([this._api({ acao: "painel" }).catch(() => null), this._api({ acao: "financeiro" }).catch(() => null)])
      .then(([p, f]) => { this._fPartes = p?.partes || this._fPartes || {}; if (f) this._fFin = f; })
      .finally(() => { this._fPedindo = false; this._fPartesDe = marca; this._fLinhasDe = null; if (["resumo", "areas", "pagar"].includes(this._abaAtual()) && !this._ocupado()) this._render(); });
  };

  // Cada compra vira uma ou mais linhas {c, area, sub, valor}. Mercado: dividido pelas seções dos itens e
  // ajustado ao valor pago (descontos). Compra em outra moeda sem valor em R$ fica fora dos totais.
  P._finInfo = function (area) { const r = this._ramo(area); return { icone: r?.icone || F_AREAS[area]?.icone || "🏷️", cor: r?.cor || F_AREAS[area]?.cor || "#94a3b8" }; };
  P._finBem = function (l) { const b = this._ramo(l.area)?.bens; return b === "*" || (Array.isArray(b) && b.includes(l.c.subcategoria)); };

  P._finLinhas = function () {
    const marca = `${this._dados?.atualizado_em}|${this._fPartesDe}|${(this._fFin?.contas || []).map((x) => x.pago?.em || "").join(",")}`;
    if (this._fLinhasDe === marca && this._fLinhasCache) return this._fLinhasCache;
    const out = [];
    for (const c of this._compras()) {
      if (c.moeda && !c.valor_pago) continue;
      const area = c.categoria || "Outros", r = this._ramo(area);
      const v = c.valor_pago || 0, partes = (this._fPartes || {})[c.id];
      if (r?.pelos_itens && partes && Object.keys(partes).length) {
        const soma = Object.values(partes).reduce((s, x) => s + x, 0) || 1;
        for (const [s, x] of Object.entries(partes)) out.push({ c, area, sub: s, secao: s, valor: v * x / soma });
      } else out.push({ c, area, sub: c.subcategoria || (r?.pelos_itens ? "Sem itens" : "Outros"), secao: null, valor: v });
    }
    for (const x of this._fFin?.contas || []) {  // conta (luz, água): gasto da casa no dia em que foi paga
      if (!x.pago) continue;  // a pagar ainda não é gasto: fica em A pagar e em "Falta pagar"
      const em = x.pago.via === "antes do controle" || !x.pago.em ? `${x.vence}T12:00:00` : String(x.pago.em);
      const c = { id: x.id, conta: x, origem: "conta", emissao: em, quem: x.quem, categoria: x.categoria, subcategoria: x.subcategoria,
        loja_curta: x.nome, valor_pago: x.total, pago_com: [] };
      out.push({ c, area: x.categoria, sub: x.subcategoria, secao: null, valor: x.total });
    }
    this._fLinhasCache = out; this._fLinhasDe = marca;
    return out;
  };

  // ---------------------------------------------------------------- período
  P._finSomaMes = function (m, k) { const [a, n] = m.split("-").map(Number); return this._mesDe(new Date(a, n - 1 + k, 1)); };
  P._finHoje = function () { const d = new Date(); return `${this._mesDe(d)}-${String(d.getDate()).padStart(2, "0")}`; };
  P._finNoPeriodo = function (iso) {
    const d = (iso || "").slice(0, 10);
    return this._fModo === "mes" ? d.slice(0, 7) === this._mes : this._fModo === "ano" ? d.slice(0, 4) === this._fAno : true;
  };
  P._finPeriodoTxt = function () { return this._fModo === "mes" ? this._mesNome(this._mes).toLowerCase() : this._fModo === "ano" ? this._fAno : "todo o histórico"; };
  P._finDaPessoa = function (l) { return this._fQuem === "Todos" || l.c.quem === this._fQuem; };
  P._finFiltradas = function () { return this._finLinhas().filter((l) => this._finNoPeriodo(l.c.emissao) && this._finDaPessoa(l)); };
  P._finAnos = function () { return [...new Set(this._finLinhas().map((l) => (l.c.emissao || "").slice(0, 4)))].filter(Boolean).sort().reverse(); };
  P._finSomaPor = function (lst, chave) { const o = {}; lst.forEach((l) => { const k = chave(l); o[k] = (o[k] || 0) + l.valor; }); return o; };
  // valor sem "R$" para espaços pequenos (calendário, barras por ano): sempre com duas casas, sem arredondar
  P._finCurto = function (v) { return Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };

  // "Mês típico": mediana dos meses com compra entre os 12 anteriores, até o mesmo dia quando o mês está em andamento
  P._finTipico = function (soDia) {  // soDia: sem os bens duráveis (compara o dia a dia)
    if (this._fModo !== "mes") return null;
    const hoje = new Date(), atual = this._mes === this._mesDe(hoje), ate = atual ? hoje.getDate() : 31;
    const vals = [];
    for (let k = 1; k <= 12; k++) {
      const m = this._finSomaMes(this._mes, -k);
      const v = this._finLinhas().filter((l) => (l.c.emissao || "").slice(0, 7) === m && Number(l.c.emissao.slice(8, 10)) <= ate && this._finDaPessoa(l) && !(soDia && this._finBem(l)))
        .reduce((s, l) => s + l.valor, 0);
      if (v > 0) vals.push(v);
    }
    if (vals.length < 3) return { pouco: true, n: vals.length };
    vals.sort((a, b) => a - b);
    const meio = vals.length >> 1;
    return { valor: vals.length % 2 ? vals[meio] : (vals[meio - 1] + vals[meio]) / 2, n: vals.length, ate: atual ? ate : null };
  };

  // ---------------------------------------------------------------- telas
  P._finTela = function (aba) {
    this._finEstado();
    this._finGarantir();
    if (aba === "pagar") return this._finTelaPagar();
    const corpo = `${this._finBarra()}${aba === "areas" ? this._finTelaAreas() : this._finTelaResumo()}`;
    return `<div class="fin">${this._aviso ? `<div class="aviso" role="status">${this._e(this._aviso)}</div>` : ""}${corpo}${this._rodape(this._dados)}</div>`;
  };

  P._finBarra = function () {
    const anos = this._finAnos();
    const totAno = (a) => this._finLinhas().filter((l) => (l.c.emissao || "").startsWith(a) && this._finDaPessoa(l)).reduce((s, l) => s + l.valor, 0);
    const sel = this._fModo === "mes"
      ? `<div class="fnav"><button class="ico" data-a="f-mes" data-k="-1" aria-label="Mês anterior">‹</button><b>${this._e(this._mesNome(this._mes))}</b><button class="ico" data-a="f-mes" data-k="1" aria-label="Próximo mês">›</button></div>`
      : this._fModo === "ano"
        ? `<div class="fdd"><button class="fddb" data-a="f-anos">📅 ${this._e(this._fAno)} ▾</button>${this._fAnosAberto ? `<div class="fmenu">${(anos.length ? anos : [this._fAno]).map((a) => `<button class="${a === this._fAno ? "on" : ""}" data-a="f-ano" data-k="${a}">${a}<small>${this._brl(totAno(a))}</small></button>`).join("")}</div>` : ""}</div>`
        : `<div class="fnav"><b>Desde ${anos[anos.length - 1] || "—"}</b></div>`;
    const pessoas = ["Todos", ...(this._dados.compradores || [])];
    return `<div class="fperiodo"><div class="fseg">${[["mes", "Mês"], ["ano", "Ano"], ["tudo", "Tudo"]].map(([k, n]) => `<button class="${this._fModo === k ? "on" : ""}" data-a="f-modo" data-k="${k}">${n}</button>`).join("")}</div>${sel}
      <div class="fseg fdir">${pessoas.map((p) => `<button class="${this._fQuem === p ? "on" : ""}" data-a="f-quem" data-k="${this._e(p)}">${this._e(p)}</button>`).join("")}</div></div>`;
  };

  // ---------- Resumo
  P._finTelaResumo = function () {
    const lst = this._finFiltradas();
    const total = lst.reduce((s, l) => s + l.valor, 0);
    const bensL = lst.filter((l) => this._finBem(l)), bens = bensL.reduce((s, l) => s + l.valor, 0), dia = total - bens;
    const t = this._finTipico(true);
    let comp = "";
    if (t?.valor) {
      const v = (dia - t.valor) / t.valor, esc = Math.max(dia, t.valor * 1.3);
      comp = `<div class="fsub">No dia a dia, <b>${this._brl(dia)}</b>: <span class="${v > 0 ? "sobe" : "desce"}">${v > 0 ? "▲" : "▼"} ${Math.round(Math.abs(v) * 100)}% ${v > 0 ? "acima" : "abaixo"}</span> do normal${t.ate ? ` até o dia ${t.ate}` : ""} (${this._brl(t.valor)})</div>
        <div class="fritmo"><i style="width:${Math.min(100, dia / esc * 100)}%"></i><b style="left:${Math.min(100, t.valor / esc * 100)}%"></b></div>`;
    } else if (t?.pouco) comp = `<div class="fs">Para comparar com o normal, faltam ${3 - t.n} ${3 - t.n === 1 ? "mês" : "meses"} com compras.</div>`;
    const areasBens = [...new Set(bensL.map((l) => l.area))].join(", ");
    const qtd = new Set(lst.map((l) => l.c.id)).size;
    return `<div class="fheroi fcard">
        <div><div class="frot">Gastei · ${this._e(this._finPeriodoTxt())}</div><div class="fbig">${this._brl(total)}</div>${comp}
          <div class="fs">${qtd} ${qtd === 1 ? "compra" : "compras"}${bens ? ` · ${t?.valor ? "fora da comparação:" : "inclui"} <b>${this._brl(bens)}</b> em bens duráveis (${this._e(areasBens)})` : ""}</div>
          ${t?.valor ? `<details class="fcomo"><summary>Como é o normal?</summary><div class="fs">É o valor do meio entre os últimos ${t.n} meses com compras${t.ate ? ", contando até o mesmo dia do mês" : ""}. Bens duráveis (o que dura anos, como móveis) ficam de fora para não distorcer.</div></details>` : ""}</div>
        ${this._finCaixa()}
      </div>
      <div class="fdois"><div class="fcol">${this._finOnde(lst, total)}${this._finDias(lst)}</div>
        <div class="fcol">${this._finPagarCard()}${this._finCasa()}${this._finPagoCom(lst)}${this._finPrecos()}</div></div>`;
  };

  P._finOnde = function (lst, total) {
    if (!lst.length) return `<div class="fcard"><div class="fhd"><h2>Onde foi o dinheiro</h2></div><div class="vazio peq">Nenhuma compra em ${this._e(this._finPeriodoTxt())}.</div></div>`;
    const porArea = Object.entries(this._finSomaPor(lst, (l) => l.area)).sort((a, b) => b[1] - a[1]);
    const fatias = porArea.length > 6 ? [...porArea.slice(0, 5), ["Demais", porArea.slice(5).reduce((s, x) => s + x[1], 0)]] : porArea;
    let a = 0;
    const r = 15.915;
    const arcos = fatias.map(([n, v]) => {
      const p = v / total * 100, cor = this._finInfo(n).cor, on = !this._fAberta || this._fAberta === n;
      const el = `<circle cx="21" cy="21" r="${r}" fill="none" stroke="${cor}" stroke-width="${this._fAberta === n ? 8 : 5.5}" stroke-dasharray="${Math.max(0, p - 0.8)} ${100 - p + 0.8}" stroke-dashoffset="${25 - a}" opacity="${on ? 1 : 0.3}"/>`;
      a += p; return el;
    }).join("");
    const mx = porArea[0][1];
    const linhas = porArea.map(([n, v]) => {
      const cor = this._finInfo(n).cor, aberta = this._fAberta === n;
      let subs = "";
      if (aberta) {
        const s = Object.entries(this._finSomaPor(lst.filter((l) => l.area === n), (l) => l.sub)).sort((x, y) => y[1] - x[1]);
        subs = `<div class="fsubs">${s.map(([sn, sv]) => `<button class="fsb" data-a="f-secao" data-area="${this._e(n)}" data-sub="${this._e(sn)}"><span>${this._e(sn)}</span><span>${this._brl(sv)} ›</span></button>`).join("")}</div>`;
      }
      return `<div class="fcat ${aberta ? "aberta" : ""}"><button class="fcatb" data-a="f-abre" data-k="${this._e(n)}">
          <span class="fn"><span class="fdot" style="background:${cor}"></span>${this._finInfo(n).icone} ${this._e(n)}<small>${Math.round(v / total * 100)}%</small></span>
          <span class="fval">${this._brl(v)}</span><span class="fbarra"><i style="width:${v / mx * 100}%;background:${cor}"></i></span></button>${subs}</div>`;
    }).join("");
    return `<div class="fcard"><div class="fhd"><h2>Onde foi o dinheiro</h2><small>toque para abrir</small></div>
      <div class="fonde"><div class="frosca"><svg viewBox="0 0 42 42">${arcos}</svg><div class="fmeio"><b>${this._brl(total)}</b><span>${porArea.length} ${porArea.length === 1 ? "área" : "áreas"}</span></div></div>
      <div class="fcats">${linhas}</div></div></div>`;
  };

  P._finDias = function (lst) {
    const porDia = {};
    lst.forEach((l) => { const k = l.c.emissao.slice(0, 10); const t = (porDia[k] ||= { v: 0, quem: {} }); t.v += l.valor; t.quem[l.c.quem] = (t.quem[l.c.quem] || 0) + l.valor; });
    const hoje = this._finHoje();
    if (this._fModo === "mes") {
      const [a, n] = this._mes.split("-").map(Number), ini = new Date(a, n - 1, 1).getDay(), nd = new Date(a, n, 0).getDate();
      let h = F_DIAS.map((x) => `<span class="fds">${x}</span>`).join("") + "<span></span>".repeat(ini);
      for (let d = 1; d <= nd; d++) {
        const k = `${this._mes}-${String(d).padStart(2, "0")}`, t = porDia[k];
        const quem = t ? Object.entries(t.quem).sort((x, y) => y[1] - x[1]).map(([p]) => p) : [];  // quem gastou mais em cima
        const bol = quem.map((p) => `<i style="background:${this._cor(p)}" title="${this._e(p)}: ${this._brl(t.quem[p])}"></i>`).join("");
        h += t ? `<button class="fdia tem ${k === hoje ? "hoje" : ""}" data-a="f-dia" data-k="${k}">${d}<span class="fbol">${bol}</span><small>${this._finCurto(t.v)}</small></button>`
          : `<span class="fdia ${k === hoje ? "hoje" : ""}">${d}</span>`;
      }
      return `<div class="fcard"><div class="fhd"><h2>Dias de compra</h2><small>toque no dia</small></div><div class="fgrade">${h}</div>
        <div class="fs fleg">Uma bolinha por pessoa que gastou no dia (em cima, quem gastou mais) · ${(this._dados?.pessoas || []).map((x) => `<span><i style="background:${x.cor}"></i>${this._e(x.nome)}</span>`).join("")}</div></div>`;
    }
    if (this._fModo === "ano") {
      const vals = Object.values(porDia).map((t) => t.v).sort((x, y) => x - y);
      const q = (p) => vals.length ? vals[Math.floor((vals.length - 1) * p)] : 0;
      const nivel = (v) => v <= q(0.33) ? "n1" : v <= q(0.66) ? "n2" : "n3";
      const meses = F_MESES.map((nome, m) => {
        const mm = `${this._fAno}-${String(m + 1).padStart(2, "0")}`, ini = new Date(Number(this._fAno), m, 1).getDay(), nd = new Date(Number(this._fAno), m + 1, 0).getDate();
        let g = "<i class='x'></i>".repeat(ini), tot = 0;
        for (let d = 1; d <= nd; d++) {
          const k = `${mm}-${String(d).padStart(2, "0")}`, t = porDia[k];
          tot += t?.v || 0;
          g += t ? `<button class="${nivel(t.v)}" data-a="f-dia" data-k="${k}" title="${this._dataCurta(k + "T12:00")}: ${this._brl(t.v)}" aria-label="${this._dataCurta(k + "T12:00")}: ${this._brl(t.v)}"></button>` : "<i></i>";
        }
        return `<div class="fmm"><button class="ft2" data-a="f-vai-mes" data-k="${mm}"><b>${nome[0].toUpperCase() + nome.slice(1, 3)}</b><span>${tot ? this._brl(tot) : "—"}</span></button><div class="fg">${g}</div></div>`;
      }).join("");
      return `<div class="fcard"><div class="fhd"><h2>Dias de compra em ${this._e(this._fAno)}</h2><span class="fesc">menos <i></i><i class="n1"></i><i class="n2"></i><i class="n3"></i> mais</span></div>
        <div class="fmeses">${meses}</div><div class="fs">Cor mais forte = dia com mais gasto · toque no mês para abrir</div></div>`;
    }
    const porAno = Object.entries(this._finSomaPor(lst, (l) => l.c.emissao.slice(0, 4))).sort();
    const mx = Math.max(...porAno.map((x) => x[1]), 1);
    return `<div class="fcard"><div class="fhd"><h2>Ano a ano</h2><small>toque no ano</small></div>
      <div class="fanos">${porAno.map(([a, v]) => `<button class="fab" data-a="f-vai-ano" data-k="${a}"><b>${this._finCurto(v)}</b><i style="height:${Math.max(3, v / mx * 110)}px"></i><span>${a}</span></button>`).join("")}</div></div>`;
  };

  // ---------- pagamentos: o que saiu (Já paguei) e o que falta (Falta pagar), no período escolhido
  P._finIntervalo = function () {
    if (this._fModo === "mes") return [`${this._mes}-01`, `${this._finSomaMes(this._mes, 1)}-01`];
    if (this._fModo === "ano") return [`${this._fAno}-01-01`, `${Number(this._fAno) + 1}-01-01`];
    return ["0000-00-00", "9999-99-99"];
  };
  P._finObrigacoes = function () { const F = this._fFin; return F ? [...(F.faturas || []), ...(F.contas || [])] : []; };
  P._finDoFiltro = function (x) { return this._fQuem === "Todos" || x.quem === this._fQuem; };
  P._finCaixa = function () {
    const F = this._fFin;
    if (!F) return `<div class="fbox fbreve"><span class="frot">Já paguei</span><span class="fv">…</span></div><div class="fbox fbreve"><span class="frot">Falta pagar</span><span class="fv">…</span></div>`;
    const [ini, fim] = this._finIntervalo(), hoje = F.hoje;
    if (fim <= F.marco) return `<div class="fbox fbreve"><span class="frot">Já paguei</span><span class="fv">—</span><span class="fs">antes do controle (começa em ${this._dataCurta(F.marco + "T12:00")})</span></div><div class="fbox fbreve"><span class="frot">Falta pagar</span><span class="fv">—</span></div>`;
    let pago = 0;
    for (const c of this._compras()) {
      const d = (c.emissao || "").slice(0, 10);
      if (d < ini || d >= fim || d < F.marco || (this._fQuem !== "Todos" && c.quem !== this._fQuem)) continue;
      for (const pg of c.pago_com || []) if ((F.pagos_na_hora || []).includes(pg.tipo)) pago += pg.valor || 0;
    }
    for (const x of this._finObrigacoes()) { const d = String(x.pago?.em || "").slice(0, 10); if (x.pago && d >= ini && d < fim && this._finDoFiltro(x)) pago += x.total; }
    const abertos = this._finObrigacoes().filter((x) => !x.pago && this._finDoFiltro(x) && ((x.vence >= ini && x.vence < fim) || (x.vence < ini && hoje >= ini && hoje < fim)));
    const falta = abertos.reduce((s, x) => s + x.total, 0);
    const nHoje = abertos.filter((x) => x.vence === hoje).length, nAtr = abertos.filter((x) => x.vence < hoje).length;
    const prox = this._finObrigacoes().filter((x) => !x.pago && this._finDoFiltro(x) && x.vence >= fim).sort((a, b) => a.vence.localeCompare(b.vence))[0];
    const dica = abertos.length ? `${abertos.length} ${abertos.length === 1 ? "conta ou fatura" : "contas e faturas"}${nAtr ? ` · <b>${nAtr} atrasada${nAtr > 1 ? "s" : ""}</b>` : ""}${nHoje ? ` · <b>${nHoje} vence hoje</b>` : ""}`
      : prox ? `nada neste período · próximo: ${this._e(prox.nome)} ${this._brl(prox.total)} em ${this._dataCurta(prox.vence + "T12:00")}` : "nada em aberto";
    return `<div class="fbox"><span class="frot">Já paguei</span><span class="fv">${this._brl(pago)}</span><span class="fs">${this._fModo === "mes" ? "Pago neste mês" : this._fModo === "ano" ? "Pago neste ano" : "Pago até hoje"}, inclusive faturas de compras de meses anteriores</span></div>
      <button class="fbox ${nHoje || nAtr ? "falerta" : ""}" data-a="aba" data-k="pagar"><span class="frot">Falta pagar</span><span class="fv">${this._brl(falta)}</span><span class="fs">${dica} ›</span></button>`;
  };

  // uma fatura ou conta, com ✓ Paguei / desfazer; a fatura abre as compras (e parcelas) dela
  P._finQuando = function (em) {  // "19/10/26 às 21:58" (sem hora quando só a data foi informada)
    const s = String(em || ""), d = this._dataCurta(s.slice(0, 10) + "T12:00");
    return s.length > 16 && !s.endsWith("T12:00:00") ? `${d} às ${s.slice(11, 16)}` : d;
  };
  P._finAgora = function () { const n = new Date(), z = (v) => String(v).padStart(2, "0"); return { d: `${n.getFullYear()}-${z(n.getMonth() + 1)}-${z(n.getDate())}`, h: `${z(n.getHours())}:${z(n.getMinutes())}` }; };

  P._finItem = function (x, curto, livre) {  // livre: janela da conta, onde corrigir é o próprio motivo de abrir
    const hoje = this._fFin.hoje, aberto = this._fFatAberta === x.id;
    const largada = x.pago?.via === "antes do controle";
    const st = x.pago ? `<span class="fok">✓ ${largada ? "paga (antes do controle)" : `paga em ${this._finQuando(x.pago.em)}`}</span>`
      : x.vence < hoje ? `<span class="fatras">atrasada</span>` : x.vence === hoje ? `<span class="fhoje">vence hoje</span>` : "";
    const k = this._e(x.id), ed = this._fPgEd === x.id;
    const hEm = x.pago && !largada && String(x.pago.em).length > 16 && !String(x.pago.em).endsWith("T12:00:00") ? String(x.pago.em).slice(11, 16) : "";
    const editor = ed ? `<div class="fpg-ed"><label class="fs">Paguei em <input type="date" id="fpg-data" max="${hoje}" value="${this._e(x.pago && !largada ? String(x.pago.em).slice(0, 10) : x.vence <= hoje ? x.vence : hoje)}"></label>
        <label class="fs">às <input type="time" class="fpg-hora" value="${hEm}"></label>
        <button class="btn prim" data-a="f-pg-salvar" data-k="${k}">Salvar</button>${x.pago ? `<button class="btn perigo" data-a="f-despagar" data-k="${k}">Não paguei</button>` : ""}<button class="lnk" data-a="f-pg-ed" data-k="${k}">Cancelar</button></div>` : "";
    const l30 = new Date(hoje + "T12:00"); l30.setDate(l30.getDate() - 30);
    const recente = x.pago && !largada && String(x.pago.em).slice(0, 10) >= `${this._mesDe(l30)}-${String(l30.getDate()).padStart(2, "0")}`;
    const btn = x.pago ? (this._fCorrigir && !ed ? `<button class="lnk" data-a="f-pg-ed" data-k="${k}">✎ editar</button>` : "")
      : `<button class="btn prim fpg" data-a="f-pagar" data-k="${k}">✓ Paguei</button>`;
    const sub = x.tipo === "fatura" ? (x.banco ? `fecha ${this._dataCurta(x.fecha + "T12:00")} · valor do banco (${x.banco.linhas} linhas)`
      : `fecha ${this._dataCurta(x.fecha + "T12:00")} · ${x.itens.length} ${x.itens.length === 1 ? "lançamento" : "lançamentos"} · soma das compras lançadas`) : x.fonte === "agua" ? `ref. ${this._e(x.referencia || "")}${x.agua?.m3 != null ? ` · ${x.agua.m3} m³` : ""}`
      : x.fonte === "luz_pdf" ? `ref. ${this._e(x.referencia || "")}${x.luz?.consumo_kwh != null ? ` · ${x.luz.consumo_kwh} kWh` : ""}`
      : x.fonte === "parcelada" ? `parcela ${this._e(x.referencia || "")}`
      : x.faixas ? (x.pago ? `ref. ${this._e(x.referencia || "")}` : `até ${this._dataCurta(x.faixas.ate + "T12:00")} ${this._brl(x.faixas.valor)} · depois ${this._brl(x.faixas.depois)}`) : `ref. ${this._e(x.referencia || "")} · do painel de energia`;
    const itens = aberto && x.tipo === "fatura" ? `<div class="ffat">${x.banco ? `<button class="lnk" data-a="f-fat-det" data-k="${this._e(x.id)}">💳 Ver a fatura do banco (${x.banco.linhas} linhas) ›</button>${x.itens.length ? `<div class="fs">Compras lançadas aqui que caem nela:</div>` : ""}` : ""}${x.itens.map((i) => `<button class="fev" data-a="abrir" data-id="${this._e(i.compra)}"><span class="fd">${this._dataCurta(i.data + "T12:00")}</span><span class="fp" style="background:${this._cor(i.quem)}"></span>
        <span class="ft3">${this._e(i.loja)}<small>${this._e(i.quem)}${i.de > 1 ? ` · parcela ${i.parcela}/${i.de} de ${this._brl(i.total_compra)}` : ""}</small></span><span class="fvv">${this._brl(i.valor)}</span></button>`).join("")}</div>` : "";
    return `<div class="fpagar ${x.pago ? "pago" : ""}"><button class="fpg-t" ${x.tipo === "fatura" ? `data-a="f-fat-abre" data-k="${this._e(x.id)}"` : "disabled"}>
        <span class="fpg-ic">${x.icone}</span><span class="ft3"><b>${this._e(x.nome)}</b> ${st}<small>vence ${this._dataCurta(x.vence + "T12:00")}${curto ? "" : ` · ${sub}`}${x.tipo === "fatura" ? (aberto ? " ▾" : " ▸") : ""}</small></span>
        <span class="fvv">${this._brl(x.total)}</span></button>${btn ? `<span class="fpg-b">${btn}</span>` : ""}${editor}${itens}</div>`;
  };

  P._finPagarCard = function () {
    const F = this._fFin;
    if (!F) return `<div class="fcard"><div class="fhd"><h2>A pagar</h2></div><div class="vazio peq">Carregando…</div></div>`;
    const hoje = F.hoje, lim = new Date(hoje + "T12:00"); lim.setDate(lim.getDate() + 30);
    const ate = `${this._mesDe(lim)}-${String(lim.getDate()).padStart(2, "0")}`;
    const lst = this._finObrigacoes().filter((x) => !x.pago && x.vence <= ate && this._finDoFiltro(x)).sort((a, b) => a.vence.localeCompare(b.vence));
    const mostra = [...lst.filter((x) => x.vence <= hoje), ...lst.filter((x) => x.vence > hoje).slice(0, 1)].slice(0, 3);
    return `<div class="fcard"><div class="fhd"><h2>A pagar</h2><button class="lnk" data-a="aba" data-k="pagar">ver tudo</button></div>
      <div class="fcasa">${mostra.length ? mostra.map((x) => this._finLinhaPg(x)).join("") : `<div class="vazio peq">Nada a pagar nos próximos 30 dias.</div>`}</div>
      ${lst.length > mostra.length ? `<div class="fs">+ ${lst.length - mostra.length} nos próximos 30 dias · ${this._brl(lst.reduce((s, x) => s + x.total, 0))} no total</div>` : ""}</div>`;
  };

  // C: contas da casa no período — paga quando, vence quando, quanto (água: m³)
  P._finCasa = function () {
    const F = this._fFin;
    if (!F) return "";
    const [ini, fim] = this._finIntervalo(), hoje = F.hoje;
    const doPer = (x) => (x.pago && x.pago.via !== "antes do controle" ? String(x.pago.em).slice(0, 10) : x.vence);
    const grupos = {};
    for (const x of F.contas || []) { const d = doPer(x); if (d >= ini && d < fim) (grupos[x.nome] ||= []).push(x); }
    const ordem = Object.keys(grupos).sort();
    if (!ordem.length) return "";
    const abre = (x) => x.fonte === "agua" ? 'data-a="f-agua"' : x.fonte === "luz_pdf" ? 'data-a="f-luz"' : x.fonte === "recorrente" || x.fonte === "parcelada" ? `data-a="f-rec" data-k="${this._e(x.id.split(":")[0])}"` : `data-a="f-conta" data-k="${this._e(x.id)}"`;
    const linhas = ordem.map((n) => {
      const l = grupos[n].sort((a, b) => b.vence.localeCompare(a.vence)), x = l[0];
      if (this._fModo !== "mes") {
        const pagas = l.filter((y) => y.pago).length;
        return `<button class="fev" ${abre(x)}><span class="fpg-ic">${this._e(x.icone)}</span><span class="ft3"><b>${this._e(n)}</b><small>${pagas} de ${l.length} pagas no período</small></span><span class="fvv">${this._brl(l.reduce((s, y) => s + y.total, 0))}</span></button>`;
      }
      const st = x.pago ? `<span class="fok">✓ paga ${x.pago.via === "antes do controle" ? "(antes do controle)" : `em ${this._dataCurta(String(x.pago.em).slice(0, 10) + "T12:00")}`}</span>`
        : x.vence < hoje ? `<span class="fatras">atrasada · venceu ${this._dataCurta(x.vence + "T12:00")}</span>` : `<span class="fhoje">vence ${this._dataCurta(x.vence + "T12:00")}</span>`;
      const extra = x.fonte === "agua" && x.agua?.m3 != null ? ` · ${x.agua.m3} m³` : x.fonte === "luz_pdf" && x.luz?.consumo_kwh != null ? ` · ${x.luz.consumo_kwh} kWh` : "";
      return `<button class="fev" ${abre(x)}><span class="fpg-ic">${this._e(x.icone)}</span><span class="ft3"><b>${this._e(n)}</b><small>${st} · ref. ${this._e(x.referencia || "")}${extra}</small></span><span class="fvv">${this._brl(x.total)}</span></button>`;
    }).join("");
    return `<div class="fcard"><div class="fhd"><h2>Contas da casa</h2><small>${this._e(this._finPeriodoTxt())}</small></div><div class="fcasa">${linhas}</div></div>`;
  };

  // E: no ano, o total de cada mês (traço = mês típico do dia a dia); toque abre o mês
  P._finMeses = function () {
    const ano = this._fAno, hoje = this._finHoje(), lin = this._finLinhas().filter((l) => this._finDaPessoa(l) && (l.c.emissao || "").startsWith(ano));
    const meses = F_MESES.map((nome, i) => {
      const m = `${ano}-${String(i + 1).padStart(2, "0")}`, l = lin.filter((x) => x.c.emissao.slice(0, 7) === m);
      const bens = l.filter((x) => this._finBem(x)).reduce((s, x) => s + x.valor, 0), tot = l.reduce((s, x) => s + x.valor, 0);
      return { m, nome, tot, dia: tot - bens, bens, futuro: `${m}-01` > hoje };
    });
    const passados = meses.filter((x) => !x.futuro && x.dia > 0).map((x) => x.dia).sort((a, b) => a - b);
    const tip = passados.length ? (passados.length % 2 ? passados[passados.length >> 1] : (passados[passados.length / 2 - 1] + passados[passados.length / 2]) / 2) : 0;
    const mx = Math.max(1, ...meses.map((x) => x.tot));
    const barras = meses.map((x) => `<button class="fmb${x.futuro ? " fut" : ""}" data-a="f-vai-mes" data-k="${x.m}" ${x.futuro ? "disabled" : ""} title="${this._e(x.nome)}: ${this._brl(x.tot)}${x.bens ? ` (dia a dia ${this._brl(x.dia)} + bens ${this._brl(x.bens)})` : ""}">
        <span class="fmb-v">${x.tot ? this._finCurto(x.tot).replace(/,\d\d$/, "") : ""}</span>
        <span class="fmb-c"><i class="dia" style="height:${x.dia / mx * 100}%"></i><i class="bem" style="height:${x.bens / mx * 100}%"></i></span>
        <span class="fmb-n">${x.nome.slice(0, 3)}</span></button>`).join("");
    return `<div class="fcard"><div class="fhd"><h2>Mês a mês em ${this._e(ano)}</h2><small>toque no mês para abrir</small></div>
      <div class="fmeses-g"><div class="fmeses-t" style="bottom:${Math.round(16 + tip / mx * 180)}px" title="normal ${this._brl(tip)}"></div>${barras}</div>
      <div class="fs fleg"><span><i style="background:var(--c-acc)"></i>dia a dia</span><span><i style="background:#f59e0b"></i>bens duráveis</span><span>— normal do dia a dia: ${this._brl(tip)}</span></div></div>`;
  };

  // Como foi pago (o que a nota ou vocês informaram), por forma e dono do cartão
  // grupo do pagamento: um cartão é um cartão (à vista, parcelado ou débito); sem cartão, a forma
  P._finPagGrupo = function (pg) {
    if (!pg.tipo) return "Não informado";
    if (pg.carteira) return "Saldo em carteira";
    if (pg.tipo === "Benefício") return pg.cartao_nome || (pg.cartao && pg.cartao !== "ALELO" ? `Benefício ${pg.cartao}` : "Benefício");
    if (pg.cartao) return pg.cartao_nome || `Cartão ${String(pg.cartao).toUpperCase()}`;
    return pg.tipo === "Crédito" ? "Crédito (cartão não informado)" : pg.tipo;
  };
  P._finPagoCom = function (lst) {
    const ids = new Set(lst.map((l) => l.c.id)), g = {};
    this._compras().filter((c) => ids.has(c.id)).forEach((c) => (c.pago_com || []).forEach((pg) => {
      const k = this._finPagGrupo(pg), x = (g[k] ||= { v: 0, n: new Set(), parc: new Set(), deb: 0 });
      x.v += pg.valor || 0; x.n.add(c.id);
      if (pg.parcelas > 1) x.parc.add(c.id);
      if (pg.tipo === "Débito" && pg.cartao) x.deb += pg.valor || 0;
    }));
    const e = Object.entries(g).sort((a, b) => b[1].v - a[1].v);
    if (!e.length) return "";
    const mx = e[0][1].v || 1, tot = e.reduce((s, [, x]) => s + x.v, 0);
    const lin = ([k, x]) => `<button class="flin" data-a="f-pag" data-k="${this._e(k)}"><span>${this._e(k)}<small class="fpgd">${x.n.size} ${x.n.size === 1 ? "compra" : "compras"}${x.parc.size ? ` · ${x.parc.size} parcelada${x.parc.size > 1 ? "s" : ""}` : ""}${x.deb ? ` · ${this._brl(x.deb)} no débito` : ""}</small></span><b>${this._brl(x.v)}<small class="fpgd">${Math.round(x.v / tot * 100)}%</small></b><span class="fbarra"><i style="width:${x.v / mx * 100}%;background:var(--c-acc)"></i></span></button>`;
    return `<div class="fcard"><div class="fhd"><h2>Como foi pago</h2><small>toque para ver as compras</small></div>
      ${e.slice(0, 6).map(lin).join("")}
      ${e.length > 6 ? `<details class="fmais"><summary>+ ${e.length - 6} ${e.length - 6 === 1 ? "outro meio" : "outros meios"} · ${this._brl(e.slice(6).reduce((s, [, x]) => s + x.v, 0))}</summary>${e.slice(6).map(lin).join("")}</details>` : ""}</div>`;
  };

  P._finCarro = function () {
    return (this._dados.bens || []).map((b) => {
      const v = this._finLinhas().filter((l) => l.c.bem === b.id && this._finNoPeriodo(l.c.emissao) && this._finDaPessoa(l)).reduce((s, l) => s + l.valor, 0);
      return `<button class="fcard flinha1" data-a="f-vai-area" data-k="Carro"><span>🚗 <b>${this._e(b.nome)}</b> · ${this._e(this._finPeriodoTxt())}</span><span>${v ? this._brl(v) : "sem gastos"} ›</span></button>`;
    }).join("");
  };

  P._finPrecos = function () {
    const d = this._dados, doMercado = (s) => !s.area || s.area === "Mercado";
    const caixaAlta = (t) => { const l = t.replace(/[^A-Za-zÀ-ÿ]/g, ""); return l.length > 3 && l.replace(/[^A-ZÀ-Þ]/g, "").length / l.length > 0.7; };
    const frase = (s) => ({ ...s, descricao: caixaAlta(s.descricao) ? s.descricao.charAt(0) + s.descricao.slice(1).toLowerCase() : s.descricao });
    const sub = (d.subiram || []).filter(doMercado).map(frase), bai = (d.baixaram || []).filter(doMercado).map(frase);
    if (!sub.length && !bai.length) return "";
    return `<div class="fcard"><div class="fhd"><h2>Preços no mercado</h2><button class="lnk" data-a="ver-precos">ver tudo</button></div>
      <div class="fs">${sub.length} subiram e ${bai.length} baixaram em relação à compra anterior no mesmo mercado.</div>
      ${[...sub.slice().sort((x, y) => y.variacao - x.variacao).slice(0, 3), ...bai.slice().sort((x, y) => x.variacao - y.variacao).slice(0, 2)].map((s) => this._linhaVar(s, false)).join("")}</div>`;
  };

  // ---------- Áreas
  P._finTelaAreas = function () {
    const todas = Object.entries(this._finSomaPor(this._finLinhas(), (l) => l.area)).sort((a, b) => b[1] - a[1]).map((x) => x[0]);
    if (!todas.length) return `<div class="vazio">Nenhuma compra registrada ainda.</div>`;
    if (!todas.includes(this._fArea)) this._fArea = todas.includes("Carro") ? "Carro" : todas[0];
    const ar = this._fArea, info = this._finInfo(ar);
    const lst = this._finFiltradas().filter((l) => l.area === ar);
    const total = lst.reduce((s, l) => s + l.valor, 0);
    const desde = this._finLinhas().filter((l) => l.area === ar && this._finDaPessoa(l));
    const totDesde = desde.reduce((s, l) => s + l.valor, 0);
    const primeiro = desde.map((l) => l.c.emissao).sort()[0];
    const subs = this._finSomaPor(lst, (l) => l.sub);
    (this._ramo(ar)?.subs || []).forEach((s) => { if (!(s in subs)) subs[s] = 0; });
    const sl = Object.entries(subs).sort((a, b) => b[1] - a[1]);
    const mx = Math.max(...sl.map((x) => x[1]), 1);
    const porCompra = new Map();
    lst.forEach((l) => { const x = porCompra.get(l.c.id) || { c: l.c, v: 0 }; x.v += l.valor; porCompra.set(l.c.id, x); });
    const compras = [...porCompra.values()].sort((a, b) => (b.c.emissao || "").localeCompare(a.c.emissao || ""));
    const tag = (c) => c.origem === "manual" ? (c.via === "applepay" ? "pelo telefone" : "à mão") : c.origem === "nfse" ? "nota de serviço" : "nota";
    const noPer = this._finSomaPor(this._finFiltradas(), (l) => l.area);
    const chips = todas.slice().sort((a, b) => (noPer[b] || 0) - (noPer[a] || 0));
    const zeradas = sl.filter(([, v]) => !v).length;
    return `<div class="fchips">${chips.map((n) => `<button class="fchip ${n === ar ? "on" : ""}${noPer[n] ? "" : " fzero"}" style="--cor:${this._finInfo(n).cor}" data-a="f-area" data-k="${this._e(n)}">${this._finInfo(n).icone} ${this._e(n)}</button>`).join("")}<button class="fchip fcfg" data-a="f-cats">⚙ Categorias e regras</button></div>
      <div class="fcard fheroi">
        <div><div class="frot">${this._e(ar)} · ${this._e(this._finPeriodoTxt())}</div><div class="fbig">${this._brl(total)}</div>
          <div class="fs">${this._fModo === "ano" && total ? `${this._brl(total / 12)}/mês em média · ` : ""}desde ${primeiro ? this._dataCurta(primeiro) : "—"}: ${this._brl(totDesde)}</div></div>
        <div class="fbox"><span class="frot">Compras</span><span class="fv">${compras.length}</span><span class="fs">${compras[0] ? `última em ${this._dataCurta(compras[0].c.emissao)}` : "nenhuma no período"}</span></div>
        <div class="fbox fbreve"><span class="frot">Obrigações do ano</span><span class="fv">em breve</span><span class="fs">${ar === "Carro" ? "IPVA, licenciamento, seguro" : ar === "Casa" ? "luz, água, internet" : "contas e vencimentos"}</span></div>
      </div>
      <div class="fdois"><div class="fcard"><div class="fhd"><h2>Gastou com o quê</h2><small>${this._e(this._finPeriodoTxt())}</small></div>
          ${sl.filter(([, v]) => v).map(([n, v]) => `<button class="flin" data-a="f-secao" data-area="${this._e(ar)}" data-sub="${this._e(n)}"><span>${this._e(n)}</span><b>${this._brl(v)}</b><span class="fbarra"><i style="width:${v / mx * 100}%;background:${info.cor}"></i></span></button>`).join("") || `<div class="vazio peq">Nada em ${this._e(this._finPeriodoTxt())}.</div>`}
          ${zeradas ? `<div class="fs">${zeradas} ${zeradas === 1 ? "subcategoria" : "subcategorias"} sem gasto em ${this._e(this._finPeriodoTxt())}.</div>` : ""}</div>
        <div class="fcard"><div class="fhd"><h2>Linha do tempo</h2><small>${compras.length} ${compras.length === 1 ? "compra" : "compras"}</small></div>
          ${compras.length ? `<div class="ftl">${compras.map(({ c, v }) => c.conta ? `<button class="fev" data-a="f-conta" data-k="${this._e(c.id)}"><span class="fd">${this._dataCurta(c.emissao)}</span><span class="fp" style="background:${info.cor}"></span><span class="ft3">${this._e(c.loja_curta)} <span class="ftag">conta</span><small>ref. ${this._e(c.conta.referencia || "")} · ${c.conta.pago?.via === "antes do controle" ? `venceu ${this._dataCurta(c.conta.vence + "T12:00")} (paga antes do controle)` : `paga · vencia ${this._dataCurta(c.conta.vence + "T12:00")}`}</small></span><span class="fvv">${this._brl(v)}</span></button>` : `<button class="fev" data-a="abrir" data-id="${this._e(c.id)}"><span class="fd">${this._dataCurta(c.emissao)}</span><span class="fp" style="background:${info.cor}"></span>
            <span class="ft3">${this._e(c.loja_curta)} <span class="ftag">${tag(c)}</span><small>${this._e(c.quem)} · ${this._e(this._classe(c))}${c.qtd_itens ? ` · ${c.qtd_itens} ${c.qtd_itens === 1 ? "item" : "itens"}` : ""}</small></span>
            <span class="fvv">${this._brl(v)}${Math.abs(v - (c.valor_pago || 0)) > 0.01 ? `<small>de ${this._brl(c.valor_pago)}</small>` : ""}</span></button>`).join("")}</div>`
            : `<div class="vazio peq">Nada em ${this._e(this._finPeriodoTxt())}.</div>`}</div></div>`;
  };

  // ---------- A pagar: total, o que está atrasado, a pilha de cartões (com o painel do escolhido) e as contas da casa.
  // O ✓ Paguei mora na janela de cada fatura/conta; a lista só aponta para ela.
  // desenho do cartão (cadastro): cor do banco, ou preto com o nome do produto e detalhe prata/dourado
  P._finCartaoCor = function (k) {
    const mc = F_MODELO_COR[fModeloId(k?.modelo)];
    if (mc?.preto) return { fundo: "#151517", tinta: mc.ouro ? "#d4b26a" : "#d4d4d8", preto: true, ouro: !!mc.ouro, escuro: true };
    if (mc) return { fundo: mc.fundo, tinta: mc.tinta, cg: mc.cg, escuro: F_LUZ(mc.fundo) < 0.06 };
    if (k?.visual?.estilo === "preto") { const ouro = k.visual.metal === "dourado"; return { fundo: "#151517", tinta: ouro ? "#d4b26a" : "#d4d4d8", preto: true, ouro }; }
    const e = F_EMISSORES[k?.emissor || k?.banco], c = e ? [e[1], e[2]] : null;
    if (c) return { fundo: c[0], tinta: c[1], escuro: F_LUZ(c[0]) < 0.06 };
    return c ? { fundo: c[0], tinta: c[1] } : k?.vale ? { fundo: "#0b6e4f", tinta: "#ffffff" } : { fundo: "#334155", tinta: "#ffffff" };
  };
  P._finCartaoEstilo = function (c) { return `--cf:${c.fundo};--ct:${c.tinta}${c.preto ? ";--cg:linear-gradient(135deg,#232327,#0c0c0e)" : c.cg ? `;--cg:${c.cg}` : ""}`; };
  P._finMini = function (k) { return `<span class="fmini" style="${this._finCartaoEstilo(this._finCartaoCor(k))}" aria-hidden="true"></span>`; };
  // nome do cartão nas telas: o que vocês escolheram; senão o banco e o produto ("Bradesco Prime"); sem banco, a sigla
  // banco do cartão: o escolhido em "Banco"; sem ele, o da leitura da fatura (cartões de antes)
  P._finBancoId = function (k) { return k?.emissor || k?.banco || ""; };
  P._finBancoNome = function (k) { return F_EMISSORES[this._finBancoId(k)]?.[0] || ""; };
  // nome do cartão na tela: o "Nome para mostrar", senão o banco; se outro cartão ficar igual, entra o tipo (débito, vale)
  // e, se ainda repetir, o titular. A sigla fica só por dentro. (O servidor faz igual: rotulo_cartao.)
  P._finNomeCartao = function (k) {
    if (!k) return "";
    if (k.rotulo) return k.rotulo;  // a lista de cartões da compra já vem com o nome pronto
    k = (this._fFin?.cartoes || []).find((x) => x.id === k.id) || k;
    const base = (x) => x.apelido || F_EMISSORES[x.emissor || x.banco]?.[0] || (x.vale ? "Benefício" : x.nome);
    const tipo = (x) => (x.vale ? "benefício" : x.prepago ? "pré-pago" : x.credito === false ? "débito" : "");
    const nome = base(k), outros = (this._fFin?.cartoes || []).filter((x) => x.id !== k.id && base(x) === nome);
    if (!outros.length) return nome;
    if (tipo(k) && outros.every((x) => tipo(x) !== tipo(k))) return `${nome} · ${tipo(k)}`;
    if (!tipo(k) && outros.every((x) => tipo(x))) return nome;
    return `${nome}${tipo(k) ? ` · ${tipo(k)}` : ""} · ${k.dono || k.nome}`;
  };
  // "Automático" no modelo: o desenho que sai quando só o banco é escolhido
  const F_MODELO_PADRAO = { bradesco: "bradesco-visa-infinite", santander: "santander-unique", bb: "bb-ourocard-infinite", itau: "itau-latam-black", wise: "wise-verde", alelo: "alelo-refeicao", btg: "btg-ultrablue", brb: "brb-connect", inter: "inter-laranja", c6: "c6-carbon" };
  P._finAutoTxt = function (banco) {
    const m = F_MODELOS[F_MODELO_PADRAO[banco]]?.[1];
    return `Automático: ${m || (F_EMISSORES[banco] ? `cartão na cor do ${F_EMISSORES[banco][0]}` : "cartão simples")}`;
  };
  P._finBandeira = function (b) {
    if (b === "Mastercard") return `<svg class="fcf-band" viewBox="0 0 44 28" role="img" aria-label="Mastercard"><circle cx="15" cy="14" r="12" fill="currentColor" opacity=".5"/><circle cx="29" cy="14" r="12" fill="currentColor" opacity=".8"/></svg>`;
    return b === "Visa" ? `<span class="fcf-visa">VISA</span>` : `<span>${this._e(b || "")}</span>`;
  };
  // categoria da bandeira: a do cadastro; sem ela, a que o nome do produto disser (Ourocard Infinite, Latam Pass Black)
  P._finCategoria = function (k) {
    if (k?.vale) return "";  // benefício não tem categoria
    if (k?.categoria) return k.categoria;
    const lista = F_CATEGORIAS[k?.bandeira] || F_CATEGORIAS[""];
    for (const s of [k?.visual?.produto, F_MODELOS[k?.modelo]?.[1], F_MODELO_ROT[k?.modelo]]) {
      const m = String(s || "").match(F_CAT_RE), v = m ? m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase() : "";
      if (v && lista.includes(v)) return v;
    }
    return "";
  };
  // a bandeira que o modelo diz no nome (Ourocard Nanquim → Elo, Visa Gold → Visa); sem pista, nenhuma
  P._finModeloBandeira = function (id) {
    id = fModeloId(id);
    const n = `${F_MODELOS[id]?.[1] || ""} ${F_MODELO_ROT[id] || ""}`, fixo = { "c6-carbon": "Mastercard", "caixa-diners": "Diners" }[id];
    const fb = F_MODELO_BAND[id];  // frente igual nas duas bandeiras (lista): o modelo não decide, fica a escolhida
    if (Array.isArray(fb)) return "";
    return fb || fixo || (/\bvisa\b/i.test(n) ? "Visa" : /mastercard/i.test(n) ? "Mastercard" : /\b(elo|nanquim|grafite)\b/i.test(n) ? "Elo" : /\bamex|american express/i.test(n) ? "Amex" : /\bdiners\b/i.test(n) ? "Diners" : "");
  };
  P._finKcEhBenef = function (id) { return F_EMISSORES_BENEF.includes(id); };
  P._finBeneficio = function (k) { return k?.vale ? F_BENEFICIOS[k.beneficio_de] || "" : ""; };
  // traço de cada banco no cartão preto (faixas, linha, brilho); no da cor do banco fica liso
  P._finCartaoArte = function (k) {
    const t = { itau: '<path d="M150 0h42l-62 150h-42zM218 0h42l-62 150h-42zM286 0h42l-62 150h-42z" fill="#fff" opacity=".07"/>',
      bb: '<path d="M262 0C250 70 200 130 118 240" stroke="var(--ct)" stroke-width="1.4" fill="none" opacity=".85"/>',
      bradesco: '<path d="M200 240 330 140 342 150 226 240z" fill="#fff" opacity=".06"/>' }[k.banco];
    return t ? `<svg class="fcf-arte" viewBox="0 0 380 240" preserveAspectRatio="none" aria-hidden="true">${t}</svg>` : "";
  };

  // uma fatura ou conta em uma linha; tocar abre a janela dela
  P._finLinhaPg = function (x, soMes) {
    const F = this._fFin, hoje = F.hoje, k = x.tipo === "fatura" ? (F.cartoes || []).find((c) => c.id === x.cartao) : null;
    const st = x.pago ? `<span class="fok">✓ ${x.pago.via === "antes do controle" ? "paga (antes do controle)" : `paga em ${this._finQuando(x.pago.em)}`}</span>`
      : x.vence < hoje ? `<span class="fatras">atrasada · venceu ${this._dataCurta(x.vence + "T12:00")}</span>`
      : x.vence === hoje ? `<span class="fhoje">vence hoje</span>` : `vence ${this._dataCurta(x.vence + "T12:00")}`;
    const nome = soMes ? `Fatura de ${F_MESES[Number(x.vence.slice(5, 7)) - 1]}` : x.nome;
    const ref = x.fonte === "parcelada" ? ` · parcela ${this._e(x.referencia || "")}` : "";
    return `<button class="fev flp" data-a="f-conta" data-k="${this._e(x.id)}">${k ? this._finMini(k) : `<span class="fpg-ic">${this._e(x.icone)}</span>`}
      <span class="ft3"><b>${this._e(nome)}</b><small>${st}${ref}</small></span><span class="fvv">${this._brl(x.total)}</span></button>`;
  };

  P._finCartaoFace = function (k, x) {
    const c = this._finCartaoCor(k), hoje = this._fFin.hoje, banco = F_BANCOS[k.banco] || (k.vale ? "Benefício" : k.credito === false ? "Débito" : k.nome), prod = c.preto ? k.visual.produto : "";
    const st = !x ? "" : x.gasto ? `${x.n} ${x.n === 1 ? "compra" : "compras"}` : x.vence < hoje ? "atrasada" : x.vence === hoje ? "vence hoje" : x.banco ? "✓ conferida com o banco" : "soma das compras lançadas";
    const [chip, risco] = c.preto && !c.ouro ? ["#cfd2d6", "#8f959b"] : ["#e3c26f", "#a8862f"];
    const corpo = `${c.preto ? this._finCartaoArte(k) : ""}<span class="fcf-top"><span class="fcf-marca"><b>${this._e(banco)}</b>${prod ? `<span class="fcf-prod">${this._e(prod)}</span>` : ""}</span><span class="fcf-nome">${this._e(k.nome)}</span></span>
      <span class="fcf-chiprow"><svg class="fcf-chip" viewBox="0 0 40 30" aria-hidden="true"><rect x="1" y="1" width="38" height="28" rx="5" fill="${chip}" stroke="${risco}"/><path d="M1 10h12M1 20h12M27 10h12M27 20h12M13 1v28M27 1v28" stroke="${risco}" fill="none"/></svg>
        <svg class="fcf-nfc" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 7c2 3 2 7 0 10M12 5c3 4 3 10 0 14M16 3c4 5 4 13 0 18" stroke="currentColor" fill="none" stroke-width="1.6" stroke-linecap="round"/></svg></span>
      <span class="fcf-meio"><small>${x?.gasto ? this._e(x.rotulo) : x ? `Fatura · vence ${this._dataCurta(x.vence + "T12:00")}` : k.credito === false ? "Nenhum gasto este mês" : "Nenhuma fatura em aberto"}</small><span class="fcf-v">${x ? this._brl(x.total) : "—"}</span></span>
      <span class="fcf-pe"><span class="${x && x.vence <= hoje ? "fcf-atr" : ""}">${st}</span>${this._finBandeira(k.bandeira)}</span>`;
    const est = this._finCartaoEstilo(c);
    if (x?.gasto) return x.acao ? `<button class="fcface${c.preto ? " preto" : ""}" data-a="${x.acao}" data-k="${this._e(k.id)}" style="${est}" aria-label="${this._e(`${this._finNomeCartao(k)}: ${x.rotulo}, ${this._brl(x.total)}`)}">${corpo}</button>`
      : `<div class="fcface${c.preto ? " preto" : ""}" style="${est}">${corpo}</div>`;
    return x ? `<button class="fcface${c.preto ? " preto" : ""}" data-a="f-conta" data-k="${this._e(x.id)}" style="${est}" aria-label="Abrir a fatura ${this._e(this._finNomeCartao(k))} de ${this._brl(x.total)}, vence ${this._dataCurta(x.vence + "T12:00")}">${corpo}</button>`
      : `<div class="fcface${c.preto ? " preto" : ""}" style="${est}">${corpo}</div>`;
  };

  // pilha: os outros cartões aparecem como faixas atrás; tocar numa faixa, nas bolinhas ou arrastar troca o da frente
  P._finPilha = function (cards, i) {
    if (!cards.length) return `<div class="fcard"><div class="fhd"><h2>Cartões</h2></div><div class="vazio peq">Nenhum cartão cadastrado.</div></div>`;
    const atras = cards.filter((_, j) => j !== i).map(({ k, x }) => {
      const c = this._finCartaoCor(k);
      return `<button class="fpk${c.preto ? " preto" : ""}" data-a="f-cart-sel" data-k="${this._e(k.id)}" style="${this._finCartaoEstilo(c)}"><b>${this._e(this._finNomeCartao(k))}</b><span></span><span class="fpk-v">${x ? this._brl(x.total) : "—"}</span></button>`;
    }).join("");
    const pontos = cards.length > 1 ? `<div class="fdots" role="tablist" aria-label="Cartões">${cards.map(({ k }, j) => `<button class="fdot${j === i ? " on" : ""}" data-a="f-cart-sel" data-k="${this._e(k.id)}" role="tab" aria-selected="${j === i}" aria-label="Cartão ${this._e(k.nome)}"></button>`).join("")}</div>` : "";
    return `<div class="fpilha">${atras ? `<div class="fpeek">${atras}</div>` : ""}${this._finCartaoFace(cards[i].k, cards[i].x)}${pontos}</div>`;
  };

  // débito e vale saem na hora (sem fatura): o que saiu de cada cartão e quando
  P._finGastos = function (k, filtro) {
    return (this._fFin?.na_hora || []).filter((x) => x.cartao === k.id && (this._fQuem === "Todos" || x.quem === this._fQuem) && (!filtro || filtro(x.data)))
      .sort((a, b) => b.data.localeCompare(a.data));
  };
  P._finGastoX = function (k, filtro, quando, acao) {
    const l = this._finGastos(k, filtro);
    return l.length ? { gasto: true, id: `gasto:${k.id}`, total: Math.round(l.reduce((s, x) => s + x.valor, 0) * 100) / 100, n: l.length, rotulo: `${k.vale ? "Vale" : "Débito"} ${quando}`, acao } : null;
  };
  P._finLinhaGasto = function (x) {
    return `<button class="fev flp" data-a="abrir" data-id="${this._e(x.compra)}"><span class="fgd">${x.data.slice(8, 10)}<small>${F_MESES[Number(x.data.slice(5, 7)) - 1].slice(0, 3)}</small></span>
      <span class="ft3"><b>${this._e(x.loja)}</b><small>${this._e(x.quem || "")}</small></span><span class="fvv">${this._brl(x.valor)}</span></button>`;
  };
  P._finFinais = function (k) {
    const finais = Object.entries(k.finais || {});
    return finais.length ? `<div class="ffinais">${finais.map(([f, v]) => `<span class="ffin"><i style="background:${this._cor(v.quem)}" aria-hidden="true"></i>${this._e(f)}<small>${this._e(v.quem || "")}${v.tipo ? ` · ${this._e(v.tipo)}` : ""}</small></span>`).join("")}</div>` : "";
  };
  // cartão de crédito e débito: o débito do mês, abaixo das faturas
  P._finDebitoMes = function (k) {
    const m = this._fFin.hoje.slice(0, 7), l = k.debito ? this._finGastos(k, (d) => d.slice(0, 7) === m) : [];
    return l.length ? `<h3 class="fsec">No débito em ${F_MESES[Number(m.slice(5, 7)) - 1]} · ${this._brl(l.reduce((s, x) => s + x.valor, 0))}</h3>${l.map((x) => this._finLinhaGasto(x)).join("")}` : "";
  };
  // cartão só de débito ou vale: os gastos mês a mês (os dois últimos abertos)
  P._finPainelGasto = function (k) {
    const g = {};
    this._finGastos(k).forEach((x) => (g[x.data.slice(0, 7)] ||= []).push(x));
    const meses = Object.keys(g).sort().reverse();
    const mes = (m) => `<h3 class="fsec">${this._e(this._mesNome(m))} · ${this._brl(g[m].reduce((s, x) => s + x.valor, 0))}</h3>${g[m].map((x) => this._finLinhaGasto(x)).join("")}`;
    return `<div class="fcard fpainel"><div class="fhd"><h2>${this._e(this._finNomeCartao(k))}${/ · (benefício|pré-pago|débito)/.test(this._finNomeCartao(k)) ? "" : ` · ${k.vale ? "benefício" : k.prepago ? "pré-pago" : "débito"}`}</h2><small>sai na hora, sem fatura</small></div>${this._finFinais(k)}
      ${meses.length ? meses.slice(0, 2).map(mes).join("") : `<div class="fs">Nenhum gasto desde ${this._dataCurta(this._fFin.marco + "T12:00")}.</div>`}
      ${meses.length > 2 ? `<details class="fmais"><summary>Meses anteriores (${meses.length - 2})</summary>${meses.slice(2).map(mes).join("")}</details>` : ""}</div>`;
  };

  P._finPainelCartao = function (k, x, faturas) {
    if (k.credito === false) return this._finPainelGasto(k);
    const minhas = faturas.filter((y) => y.cartao === k.id);
    const futuras = minhas.filter((y) => !y.pago && y !== x).sort((a, b) => a.vence.localeCompare(b.vence));
    const pagas = minhas.filter((y) => y.pago).sort((a, b) => b.vence.localeCompare(a.vence));
    const dias = k.fecha && k.vence ? `fecha dia ${k.fecha} · vence dia ${k.vence}` : "";
    return `<div class="fcard fpainel"><div class="fhd"><h2>${this._e(this._finNomeCartao(k))}</h2><small>${dias}</small></div>
      ${this._finFinais(k)}
      <h3 class="fsec">Próximas faturas</h3>${futuras.map((y) => this._finLinhaPg(y, true)).join("") || `<div class="fs">Nenhuma parcela lançada para os próximos meses.</div>`}
      <h3 class="fsec">Pagas</h3>${pagas.slice(0, 3).map((y) => this._finLinhaPg(y, true)).join("") || `<div class="fs">Nenhuma fatura paga ainda.</div>`}
      ${pagas.length > 3 ? `<details class="fmais"><summary>Ver todas as pagas (${pagas.length})</summary>${pagas.slice(3).map((y) => this._finLinhaPg(y, true)).join("")}</details>` : ""}
      ${this._finDebitoMes(k)}
      <div class="flinks"><button class="lnk" data-a="f-fat">Ler fatura do banco (PDF) ›</button><button class="lnk" data-a="f-fat" data-k="assinaturas">Assinaturas ›</button></div></div>`;
  };

  // contas da casa: uma linha por conta, a que vence primeiro (ou a última paga)
  P._finContasCasa = function () {
    const g = {};
    for (const x of (this._fFin.contas || []).filter((y) => this._finDoFiltro(y))) (g[x.nome] ||= []).push(x);
    const linhas = Object.keys(g).sort().map((n) => {
      const l = g[n], x = l.filter((y) => !y.pago).sort((a, b) => a.vence.localeCompare(b.vence))[0] || l.sort((a, b) => b.vence.localeCompare(a.vence))[0];
      return this._finLinhaPg(x);
    }).join("");
    const F = this._fFin, cc = F?.contas_casa || {}, avisos = [];
    if (cc.luz && !cc.luz.fonte && !F.painel_energia) avisos.push([`<b>${this._e(cc.luz.nome)}</b>: não achei o painel de energia. Troque “De onde vem” na ⚙.`, "v2-config"]);
    else if (cc.luz && !cc.luz.fonte && !(F.painel_energia.unidades || []).some((u) => u.id === cc.luz.unidade)) avisos.push([`<b>${this._e(cc.luz.nome)}</b>: escolha a unidade do painel de energia na ⚙.`, "v2-config"]);
    const ant = this._finSomaMes(F.hoje.slice(0, 7), -1);  // a conta de um mês chega no seguinte: em outubro, falta a de setembro
    for (const t of ["luz", "agua"]) {
      if (cc[t]?.fonte === "manual" && !(F.contas || []).some((x) => x.id.startsWith(`${t}:`) && x.id.slice(t.length + 1) >= ant))
        avisos.push([`<b>${this._e(cc[t].nome)}</b>: digite a conta de ${F_MESES[Number(ant.slice(5, 7)) - 1]}.`, t === "luz" ? "f-luz" : "f-agua"]);
    }
    const link = (t) => !cc[t] ? "" : t === "agua" ? `<button class="lnk" data-a="f-agua">${cc.agua.fonte === "manual" ? "Contas de água" : "Ler contas de água"} ›</button>`
      : cc.luz.fonte === "pdf" ? `<button class="lnk" data-a="f-luz">Ler contas de luz ›</button>` : cc.luz.fonte === "manual" ? `<button class="lnk" data-a="f-luz">Contas de luz ›</button>`
      : F.painel_energia ? `<button class="lnk" data-a="f-energia">Painel de energia ›</button>` : "";
    const hist = this._hass?.user?.is_admin ? `<button class="lnk" data-a="f-corrigir">${this._fCorrigir ? "Fechar o histórico de pagamentos" : "Histórico de pagamentos ›"}</button>` : "";
    return `<div class="fcard"><div class="fhd"><h2>Contas da casa</h2></div>
      ${avisos.map(([txt, a]) => `<button class="falerta-l" data-a="${a}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2 21h20L12 3z"/><path d="M12 10v5M12 18v.5"/></svg><span>${txt}</span><span class="fvv">›</span></button>`).join("")}
      <div class="fcasa">${linhas || `<div class="vazio peq">Nenhuma conta cadastrada.</div>`}</div>
      <div class="flinks">${link("agua")}${link("luz")}${hist}</div></div>`;
  };

  // arrastar a pilha para o lado troca o cartão (as faixas e as bolinhas fazem o mesmo no toque; setas no teclado)
  P._finCartPasso = function (d) {
    const l = this._fCartLista || [];
    if (l.length < 2) return;
    const i = Math.max(0, l.indexOf(this._fCartSel));
    this._fCartSel = l[(i + d + l.length) % l.length];
    this._render();
    this.shadowRoot?.querySelector(".fdot.on")?.focus();
  };
  P._finSwipe = function (el) {
    let x0 = null, y0 = 0;
    el.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") { x0 = e.clientX; y0 = e.clientY; } });
    el.addEventListener("pointerup", (e) => {
      if (x0 == null) return;
      const dx = e.clientX - x0, dy = e.clientY - y0;
      x0 = null;
      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      this._fArrastou = Date.now();
      this._finCartPasso(dx < 0 ? 1 : -1);
    });
    el.addEventListener("pointercancel", () => { x0 = null; });
    el.addEventListener("keydown", (e) => { if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); this._finCartPasso(e.key === "ArrowRight" ? 1 : -1); } });
  };

  P._finTelaPagar = function () {
    this._finEstado();
    this._finGarantir();
    const F = this._fFin;
    if (!F) return `<div class="vazio">Carregando…</div>`;
    const hoje = F.hoje, todos = this._finObrigacoes().filter((x) => this._finDoFiltro(x));
    const abertos = todos.filter((x) => !x.pago).sort((a, b) => a.vence.localeCompare(b.vence));
    const urgentes = abertos.filter((x) => x.vence <= hoje);
    const lim = new Date(hoje + "T12:00"); lim.setDate(lim.getDate() + 30);
    const ate = `${this._mesDe(lim)}-${String(lim.getDate()).padStart(2, "0")}`;
    const soma = (l) => this._brl(l.reduce((s, x) => s + x.total, 0));
    const faturas = todos.filter((x) => x.tipo === "fatura");
    const mesAt = hoje.slice(0, 7), fim = (c) => c.k.credito === false ? "9999z" : c.x ? c.x.vence : "9999";  // débito e vale no fim da pilha
    const cards = (F.cartoes || []).filter((k) => k.credito !== false ? k.ativo !== false || faturas.some((x) => x.cartao === k.id && !x.pago) : this._finGastos(k).length > 0)
      .map((k) => ({ k, x: k.credito === false ? this._finGastoX(k, (d) => d.slice(0, 7) === mesAt, `em ${F_MESES[Number(mesAt.slice(5, 7)) - 1]}`) : abertos.find((x) => x.tipo === "fatura" && x.cartao === k.id) }))
      .sort((a, b) => fim(a).localeCompare(fim(b)));
    this._fCartLista = cards.map((c) => c.k.id);
    if (!this._fCartLista.includes(this._fCartSel)) this._fCartSel = this._fCartLista[0];
    const i = Math.max(0, this._fCartLista.indexOf(this._fCartSel));
    const alerta = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2 21h20L12 3z"/><path d="M12 10v5M12 18v.5"/></svg>`;
    const corr = this._fCorrigir ? `<div class="fcorr"><span><b>Histórico de pagamentos</b> (lá embaixo) · ✎ em cada um corrige a data e a hora ou marca “não paguei”.</span><button class="btn" data-a="f-corrigir">Fechar</button></div>` : "";
    return `<div class="fin">${this._aviso ? `<div class="aviso" role="status">${this._e(this._aviso)}</div>` : ""}${corr}
      <div class="fresumo"><span class="frot">Em aberto</span><b>${soma(abertos)}</b><span class="fs">${soma(abertos.filter((x) => x.vence <= ate))} nos próximos 30 dias · ${abertos.length} ${abertos.length === 1 ? "fatura ou conta" : "faturas e contas"}</span></div>
      ${urgentes.length ? `<div class="falertas">${urgentes.map((x) => `<button class="falerta-l" data-a="f-conta" data-k="${this._e(x.id)}">${alerta}<span><b>${this._e(x.nome)}</b> ${x.vence < hoje ? `atrasada · venceu ${this._dataCurta(x.vence + "T12:00")}` : "vence hoje"}</span><span class="fvv">${this._brl(x.total)} ›</span></button>`).join("")}</div>` : ""}
      <div class="fdois"><div class="fcol">${this._finPilha(cards, i)}</div>
        <div class="fcol">${cards.length ? this._finPainelCartao(cards[i].k, cards[i].x, faturas) : ""}</div></div>
      ${this._finContasCasa()}
      ${this._fCorrigir ? this._finPagarCorrigir(todos) : ""}
      ${this._rodape(this._dados)}</div>`;
  };

  // modo de correção: pagamentos recentes e antigos (✎ editar), pagos antes do controle e o cadastro de cartões
  P._finPagarCorrigir = function (todos) {
    const F = this._fFin, hoje = F.hoje, soma = (l) => this._brl(l.reduce((s, x) => s + x.total, 0));
    const l30 = new Date(hoje + "T12:00"); l30.setDate(l30.getDate() - 30);
    const de30 = `${this._mesDe(l30)}-${String(l30.getDate()).padStart(2, "0")}`;
    const marcadas = todos.filter((x) => x.pago && x.pago.via !== "antes do controle").sort((a, b) => String(b.pago.em).localeCompare(String(a.pago.em)));
    const pagas = marcadas.filter((x) => String(x.pago.em).slice(0, 10) >= de30), antigas = marcadas.filter((x) => String(x.pago.em).slice(0, 10) < de30);
    const porMesPg = {};
    antigas.forEach((x) => (porMesPg[String(x.pago.em).slice(0, 7)] ||= []).push(x));
    const largada = todos.filter((x) => x.pago?.via === "antes do controle").sort((a, b) => b.vence.localeCompare(a.vence));
    return `<div class="fdois"><div class="fcol">
        <div class="fcard"><div class="fhd"><h2>Pagas recentemente</h2><small>últimos 30 dias</small></div>${pagas.map((x) => this._finItem(x, true)).join("") || `<div class="vazio peq">Nada pago nos últimos 30 dias.</div>`}</div>
        ${antigas.length ? `<details class="fcard flarg fhist" ${this._fHistAberto ? "open" : ""}><summary class="fhd"><h2>Histórico de pagamentos · ${antigas.length}</h2><small>pagas há mais de 30 dias ▸</small></summary>
          ${Object.entries(porMesPg).map(([m, l]) => `<div class="fmesp"><b>pagas em ${this._e(this._mesNome(m))}</b><span>${soma(l)}</span></div>${l.map((x) => this._finItem(x, true)).join("")}`).join("")}</details>` : ""}
      </div><div class="fcol">
        ${largada.length ? `<details class="fcard flarg" ${this._fLargAberta ? "open" : ""}><summary class="fhd"><h2>Pagas antes do controle · ${largada.length}</h2><small>até ${this._dataCurta(F.pago_ate + "T12:00")} ▸</small></summary>
          <div class="fs" style="margin:4px 0 8px">Quando o controle começou, o que já tinha vencido (até ${this._dataCurta(F.pago_ate + "T12:00")}) foi considerado pago, sem o dia exato. Não precisa mexer; use <b>✎ data</b> só se quiser o dia certo, ou <b>não paguei</b> se alguma não foi paga. As faturas antigas têm só as compras lançadas aqui (não são o valor do banco).</div>
          ${largada.map((x) => this._finItem(x, true)).join("")}</details>` : ""}
      </div></div>`;
  };

  // janela da fatura: valor, datas, situação, ✓ Paguei, a conferência com o banco e as compras que caem nela
  P._finFolhaFatura = function (x) {
    const F = this._fFin, hoje = F.hoje, k = (F.cartoes || []).find((c) => c.id === x.cartao) || { nome: x.nome };
    const pg = x.pago, largada = pg?.via === "antes do controle", id = this._e(x.id);
    const situ = pg ? (largada ? "paga (antes do controle)" : `paga em ${this._finQuando(pg.em)}`) : x.vence < hoje ? "atrasada" : x.vence === hoje ? "vence hoje" : "a pagar";
    const n = x.itens.length;
    const conf = x.banco ? `<div class="fconf-ok">✓ <b>Conferida com o banco</b>: o valor é o da fatura (${x.banco.linhas} linhas).</div><div class="flinks"><button class="lnk" data-a="f-fat-det" data-k="${id}">Ver as linhas da fatura do banco ›</button></div>`
      : `<div class="fs">Valor estimado: soma ${n === 1 ? "da compra lançada" : `das ${n} compras lançadas`} neste cartão. Para conferir com o banco, envie o PDF da fatura.</div><div class="flinks"><button class="lnk" data-a="f-fat">Enviar fatura do banco (PDF) ›</button></div>`;
    const itens = x.itens.map((i) => `<button class="fev" data-a="abrir" data-id="${this._e(i.compra)}"><span class="fd">${this._dataCurta(i.data + "T12:00")}</span><span class="fp" style="background:${this._cor(i.quem)}"></span>
        <span class="ft3">${this._e(i.loja)}<small>${this._e(i.quem)}${i.de > 1 ? ` · parcela ${i.parcela}/${i.de} de ${this._brl(i.total_compra)}` : ""}</small></span><span class="fvv">${this._brl(i.valor)}</span></button>`).join("");
    return `<dialog class="folha" aria-label="${this._e(x.nome)}">
      <div class="fh"><div style="min-width:0"><div class="ft">${k.banco ? this._finMini(k) + " " : ""}${this._e(x.nome)}</div><div class="fs">${this._e(F_BANCOS[k.banco] || "")}${F_BANCOS[k.banco] ? " · " : ""}fecha ${this._dataCurta(x.fecha + "T12:00")} · vence ${this._dataCurta(x.vence + "T12:00")}</div></div><button class="ico" data-a="fechar" aria-label="Fechar">✕</button></div>
      <div class="fcontagrade">
        <div class="fbox"><span class="frot">Valor</span><span class="fv">${this._brl(x.total)}</span></div>
        <div class="fbox"><span class="frot">Vencimento</span><span class="fv">${this._dataCurta(x.vence + "T12:00")}</span></div>
        <div class="fbox ${!pg && x.vence < hoje ? "falerta" : ""}"><span class="frot">Situação</span><span class="fs">${situ}</span></div>
      </div>
      ${this._aviso ? `<div class="aviso" role="status">${this._e(this._aviso)}</div>` : ""}
      ${pg ? "" : `<button class="btn prim fpg-grande" data-a="f-pagar" data-k="${id}">✓ Paguei esta fatura</button>`}
      ${this._fCorrigir && pg ? `<div class="fcard">${this._finItem(x, true, true)}</div>` : ""}
      <h3 class="fsec">Conferência</h3>${conf}
      <h3 class="fsec">Compras nesta fatura · ${n}</h3>${itens ? `<div class="ffat">${itens}</div>` : `<div class="fs">Nenhuma compra lançada aqui caiu nesta fatura${x.banco ? "; as linhas do banco estão no link acima" : ""}.</div>`}
    </dialog>`;
  };

  // ---------------------------------------------------------------- janelas
  // Lista de compras (dia, forma de pagamento): as mesmas linhas da aba Compras; tocar abre o cupom completo
  P._finFolhaLista = function () {
    const L = this._fLista;
    const tot = L.linhas.reduce((s, [, v]) => s + (v || 0), 0);
    return `<dialog class="folha" aria-label="Compras">
      <div class="fh"><div style="min-width:0"><div class="ft">${this._e(L.titulo)}</div>
        <div class="fs">${L.linhas.length} ${L.linhas.length === 1 ? "compra" : "compras"} · ${this._brl(tot)} · ${this._e(L.periodo)}</div></div>
        <button class="ico" data-a="fechar" aria-label="Fechar">✕</button></div>
      <div class="lista">${L.linhas.map(([c, v]) => c.conta ? this._finLinhaConta(c.conta) : this._linha(c, v, true)).join("") || `<div class="vazio peq">Nenhuma compra.</div>`}</div>
    </dialog>`;
  };

  // Seção / subcategoria: à esquerda o que foi comprado (soma = o valor da tela), à direita as notas de onde veio
  P._finFolhaSecao = function () {
    const S = this._fSecao;
    const cab = `<div class="fh"><div style="min-width:0"><div class="ft">${this._e(S.titulo)}</div><div class="fs">${this._e(S.periodo)} · ${this._brl(S.valor)}</div></div>
      <button class="ico" data-a="fechar" aria-label="Fechar">✕</button></div>`;
    if (S.carregando) return `<dialog class="folha larga" aria-label="${this._e(S.titulo)}">${cab}<div class="vazio">Buscando os itens…</div></dialog>`;
    if (S.erro) return `<dialog class="folha larga">${cab}<div class="vazio">⚠ ${this._e(S.erro)}</div></dialog>`;
    const somaItens = S.itens.reduce((s, i) => s + (i.total || 0), 0);
    const ajuste = S.valor - somaItens;
    const itens = S.itens.map((i) => {
      const cp = i.comparacao;
      const seta = cp && Math.abs(cp.variacao) >= 0.03 ? ` <span class="${cp.variacao > 0 ? "sobe" : "desce"}" title="antes ${this._brl(cp.de)} em ${this._dataCurta(cp.data)}">${cp.variacao > 0 ? "▲" : "▼"}${Math.round(Math.abs(cp.variacao) * 100)}%</span>` : "";
      const nome = i.conta ? `<button class="fprod" data-a="f-conta" data-k="${this._e(i.compra)}">${this._e(i.descricao)}</button>`
        : i.chave ? `<button class="fprod" data-a="produto" data-k="${this._e(i.chave)}">${this._e(i.descricao)}</button>`
        : i.manual ? `<button class="fprod" data-a="f-nota" data-id="${this._e(i.compra)}">${this._e(i.descricao)}</button>` : `<span>${this._e(i.descricao)}</span>`;
      const extra = i.conta ? (i.fonte && i.fonte !== "energia" ? "conta" : "conta (Equatorial)") : i.manual ? `${i.applepay ? "pelo telefone · sem cupom" : "lançada à mão"}${i.moeda ? ` · ${this._moeda(i.moeda)}` : ""}` : i.qtd != null ? `${this._num(i.qtd)} ${this._e(i.un || "")} × ${this._brl(i.unit)}` : "";
      return `<div class="fitem"><span class="fd">${this._dataCurta(i.data)}</span><span class="fdesc">${nome}${i.promo ? " <em>promo</em>" : ""}
          <small>${extra}${seta} · ${this._e(i.loja)}</small></span><b>${this._brl(i.total)}</b></div>`;
    }).join("");
    const notas = S.notas.map((n) => n.conta ? (n.fonte && n.fonte !== "energia" ? `<button class="fnota" data-a="f-conta" data-k="${this._e(n.id)}"><span class="fd">${this._dataCurta(n.data)}</span><span class="fdesc">${this._e(n.loja)}<small>conta ${this._brl(n.valor_pago)} · ${n.fonte === "agua" ? "consumo e serviços" : "controle de vocês"}</small></span><span class="fs">${n.fonte === "agua" ? "💧" : n.fonte === "parcelada" ? "🏛️" : "🌐"}›</span></button>`
      : `<button class="fnota" data-a="f-energia" data-k="${this._e(n.id)}"><span class="fd">${this._dataCurta(n.data)}</span><span class="fdesc">${this._e(n.loja)}<small>conta ${this._brl(n.valor_pago)} · detalhes no painel de energia</small></span><span class="fs">⚡›</span></button>`) : `<button class="fnota" data-a="f-nota" data-id="${this._e(n.id)}"><span class="fd">${this._dataCurta(n.data)}</span>
        <span class="fdesc">${this._e(n.loja)}<small>${S.secao || S.sub ? `${this._brl(n.valor_itens)} de ${this._e((S.secao || S.sub).toLowerCase())} · ` : ""}${n.cobrado ? `cobrado ${this._brl(n.valor_pago)} (nota ${this._brl(n.valor_nota)} · ${this._e((n.cobrado.motivo || "").toLowerCase())})` : `${n.manual ? "compra" : "nota"} ${this._brl(n.valor_pago)}`}${n.moeda ? ` (${this._moeda(n.moeda)})` : ""}</small></span><span class="fs">›</span></button>`).join("");
    return `<dialog class="folha larga" aria-label="${this._e(S.titulo)}">${cab}
      <div class="fduas">
        <div><div class="fhd"><h3>O que foi comprado</h3><small>${S.itens.length} ${S.itens.length === 1 ? "item" : "itens"}</small></div>
          <div class="fitens">${itens || `<div class="vazio peq">Nenhum item.</div>`}</div>
          <div class="fsoma"><span>Total dos itens</span><b>${this._brl(somaItens)}</b></div>
          ${Math.abs(ajuste) >= 0.01 ? `<div class="fsoma fs"><span>${ajuste < 0 ? "Descontos e cupons (proporcional)" : "Acréscimos das notas (proporcional)"}</span><span>${ajuste < 0 ? "−" : "+"} ${this._brl(Math.abs(ajuste))}</span></div>
            <div class="fsoma"><span>Na conta</span><b>${this._brl(S.valor)}</b></div>` : ""}</div>
        <div><div class="fhd"><h3>Vieram destas notas</h3><small>toque para abrir</small></div>${notas || `<div class="vazio peq">—</div>`}
          <div class="fs" style="margin-top:8px">A nota abre completa (QR/SEFAZ, editar, imprimir), com estes itens destacados.</div></div>
      </div></dialog>`;
  };

  P._finAbrirSecao = async function (area, sub) {
    const lst = this._finFiltradas().filter((l) => l.area === area && l.sub === sub);
    const valor = lst.reduce((s, l) => s + l.valor, 0);
    const ids = [...new Set(lst.filter((l) => !l.c.conta).map((l) => l.c.id))];
    const contas = lst.filter((l) => l.c.conta).map((l) => ({ ...l.c.conta, quando: l.c.emissao }));
    const secao = lst.find((l) => l.secao)?.secao || null;
    this._fSecao = { titulo: `${area} › ${sub}`, periodo: this._finPeriodoTxt(), area, sub, secao, valor, ids, carregando: true };
    this._render();
    try {
      const r = ids.length ? await this._api({ acao: "itens", ids, secao }) : { itens: [], notas: [] };
      if (this._fSecao?.titulo !== `${area} › ${sub}`) return;
      const ci = contas.map((x) => ({ compra: x.id, n: -1, data: x.quando, loja: x.fonte_txt || "painel de energia", descricao: `${x.nome} · ref. ${x.referencia || ""}`, total: x.total, manual: true, conta: true, fonte: x.fonte }));
      const cn = contas.map((x) => ({ id: x.id, data: x.quando, loja: x.nome, valor_pago: x.total, valor_itens: x.total, conta: true, fonte: x.fonte }));
      this._fSecao = { ...this._fSecao, carregando: false, itens: [...(r.itens || []), ...ci].sort((a, b) => String(b.data).localeCompare(String(a.data))), notas: [...(r.notas || []), ...cn] };
    } catch (e) { if (this._fSecao) this._fSecao = { ...this._fSecao, carregando: false, erro: e.message || String(e) }; }
    this._render();
  };

  P._finAbrirLista = function (titulo, filtro) {
    const por = new Map();
    this._finFiltradas().filter(filtro).forEach((l) => { const x = por.get(l.c.id) || [l.c, 0]; x[1] += l.valor; por.set(l.c.id, x); });
    this._fLista = { titulo, periodo: this._finPeriodoTxt(), linhas: [...por.values()].sort((a, b) => (b[0].emissao || "").localeCompare(a[0].emissao || "")) };
    this._render();
  };

  // Categorias e regras: a árvore (editável) e a regra de cada loja (vale para as próximas notas)
  P._finFolhaCats = function () {
    const K = this._fCats;
    const cab = `<div class="fh"><div><div class="ft">Categorias e regras</div><div class="fs">O que vocês mudarem aqui vale para o painel todo</div></div>
      <button class="ico" data-a="fechar" aria-label="Fechar">✕</button></div>`;
    if (K.carregando) return `<dialog class="folha larga">${cab}<div class="vazio">Carregando…</div></dialog>`;
    const uso = K.uso || {}, ed = K.edit;
    const editor = (valor) => `<span class="fced"><input id="fc-edit" type="text" maxlength="40" aria-label="Nome" value="${this._e(valor)}" autocomplete="off">
      <button class="btn prim" data-a="f-cat-salvar">Salvar</button><button class="btn" data-a="f-cat-cancelar">Cancelar</button></span>`;
    const arv = (K.arvore || []).map((r, i) => {
      const n = uso[r.nome] || 0;
      const titulo = ed && ed.cat === r.nome && !ed.sub ? editor(r.nome)
        : `<b>${this._e(r.icone || "")} ${this._e(r.nome)}</b> <span class="fs">${n} ${n === 1 ? "compra" : "compras"}</span> <button class="lnk" data-a="f-cat-edit" data-k="${this._e(r.nome)}">renomear</button>`;
      const subs = r.pelos_itens ? `<div class="fs">Dividida pelas seções dos itens das notas (Hortifrúti, Carnes, Limpeza…).</div>`
        : `<div class="fcsubs">${(r.subs || []).map((x) => {
            if (ed && ed.cat === r.nome && ed.sub === x) return editor(x);
            const u = uso[`${r.nome} › ${x}`] || 0;
            return `<span class="fcsub"><button class="fcsn" data-a="f-cat-edit" data-k="${this._e(r.nome)}" data-sub="${this._e(x)}" title="Renomear">${this._e(x)}${u ? ` <small>${u}</small>` : ""}</button>${u ? "" : `<button class="fcx" data-a="f-cat-del" data-k="${this._e(r.nome)}" data-sub="${this._e(x)}" aria-label="Apagar ${this._e(x)}">✕</button>`}</span>`;
          }).join("")}
          <span class="fcnova"><input id="fc-nova-${i}" type="text" maxlength="40" placeholder="+ subcategoria" aria-label="Nova subcategoria" autocomplete="off"><button class="btn" data-a="f-cat-add" data-k="${this._e(r.nome)}" data-i="${i}">Adicionar</button></span></div>`;
      return `<div class="fcramo"><div class="fctit">${titulo}</div>${subs}</div>`;
    }).join("");
    const opcoes = (sel) => (K.arvore || []).map((r) => `<option value="${this._e(r.nome)}" ${r.nome === sel ? "selected" : ""}>${this._e(r.icone || "")} ${this._e(r.nome)}</option>`).join("");
    const subsDe = (cat, sel) => { const r = (K.arvore || []).find((a) => a.nome === cat); return r?.pelos_itens ? `<option value="">pelos itens</option>` : (r?.subs || []).map((x) => `<option ${x === sel ? "selected" : ""}>${this._e(x)}</option>`).join(""); };
    const regras = (K.regras || []).map((g) => `<div class="fcregra"><span class="fcloja">${this._e(g.loja)}<small>${g.compras} ${g.compras === 1 ? "compra" : "compras"}</small></span>
        <select data-fchange="regra-cat" data-k="${g.cnpj8}" id="fr-c-${g.cnpj8}" aria-label="Categoria">${opcoes(g.categoria)}</select>
        <select data-fchange="regra-sub" data-k="${g.cnpj8}" id="fr-s-${g.cnpj8}" aria-label="Subcategoria">${subsDe(g.categoria, g.subcategoria)}</select>
        <button class="fcx" data-a="f-regra-del" data-k="${g.cnpj8}" aria-label="Apagar regra">✕</button></div>`).join("");
    return `<dialog class="folha larga" aria-label="Categorias e regras">${cab}
      ${K.msg ? `<div class="aviso" role="status">${this._e(K.msg)}</div>` : ""}
      <div class="fduas">
        <div><div class="fhd"><h3>Categorias</h3><small>toque numa subcategoria para renomear</small></div>${arv}
          <div class="fcramo"><div class="fctit"><b>Nova categoria</b></div><span class="fcnova"><input id="fc-ncat-ic" type="text" maxlength="4" placeholder="🏷️" aria-label="Ícone da nova categoria" style="width:3.2em"><input id="fc-ncat" type="text" maxlength="40" placeholder="nome" aria-label="Nome da nova categoria" autocomplete="off"><button class="btn" data-a="f-cat-nova">Criar</button></span></div></div>
        <div><div class="fhd"><h3>Regras por loja</h3><small>${(K.regras || []).length}</small></div>
          <div class="fs" style="margin-bottom:8px">Nota nova dessa loja já entra assim. Trocar a categoria de uma compra (Editar compra) também cria ou atualiza a regra da loja. As compras já registradas não mudam por aqui.</div>
          ${regras || `<div class="vazio peq">Nenhuma regra ainda.</div>`}
          <div class="fs" style="margin-top:10px">Lojas sem regra: a categoria vem do tipo dos produtos (código fiscal), do nome da loja ou fica em Outros.</div></div>
      </div></dialog>`;
  };

  P._finCatsCarregar = async function (msg) {
    try {
      const r = await this._api({ acao: "regras" });
      this._fCats = { ...(this._fCats || {}), carregando: false, arvore: r.arvore, regras: r.regras, uso: r.uso, edit: null, msg: msg || "" };
    } catch (e) { this._fCats = { ...(this._fCats || {}), carregando: false, msg: "⚠ " + (e.message || e) }; }
    this._render();
  };

  P._finCatsOp = async function (pedido) {
    try {
      const r = await this._api(pedido);
      this._carregar(true);  // a árvore nova chega ao card
      await this._finCatsCarregar(r.mensagem);
    } catch (e) { this._fCats = { ...this._fCats, msg: "⚠ " + (e.message || e) }; this._render(); }
  };

  // selects da janela de regras (o card chama ao mudar um <select data-fchange>)
  P._finMudou = function (el) {
    const k = el.getAttribute("data-k"), tipo = el.getAttribute("data-fchange");
    if (tipo !== "regra-cat" && tipo !== "regra-sub") return;
    const cat = this.shadowRoot.getElementById(`fr-c-${k}`)?.value;
    const sub = tipo === "regra-sub" ? this.shadowRoot.getElementById(`fr-s-${k}`)?.value : "";
    this._finCatsOp({ acao: "regra", cnpj8: k, categoria: cat, subcategoria: sub });
  };

  P._finLinhaConta = function (x) {
    return `<button class="row" data-a="f-conta" data-k="${this._e(x.id)}"><div class="data"><b>${x.vence.slice(8, 10)}</b>${F_MESES[Number(x.vence.slice(5, 7)) - 1].slice(0, 3).toUpperCase()}</div>
      <div class="meio"><div class="loja">${this._e(x.icone)} ${this._e(x.nome)}</div><div class="meta">conta · ref. ${this._e(x.referencia || "")} · ${x.pago ? "paga" : "a pagar"}</div></div>
      <div class="dir"><div class="amt">${this._brl(x.total)}</div></div></button>`;
  };

  // confirmação do ✓ Paguei: data e hora já com agora (troque se pagou antes)
  P._finFolhaConf = function () {
    const x = this._finObrigacoes().find((y) => y.id === this._fConf), ag = this._finAgora();
    if (!x) return `<dialog class="folha fconf"><div class="vazio">Não achei essa conta/fatura.</div><button class="btn" data-a="fechar">Fechar</button></dialog>`;
    return `<dialog class="folha fconf" aria-label="Confirmar pagamento">
      <div class="fh"><div><div class="ft">Confirmar pagamento</div><div class="fs">${this._e(x.icone)} ${this._e(x.nome)} · vence ${this._dataCurta(x.vence + "T12:00")}</div></div><button class="ico" data-a="fechar" aria-label="Cancelar">✕</button></div>
      <div class="fconf-v" id="fconf-v">${this._brl(x.faixas ? (ag.d <= x.faixas.ate ? x.faixas.valor : x.faixas.depois) : x.total)}</div>
      ${x.faixas ? `<div class="fs">Pagando até ${this._dataCurta(x.faixas.ate + "T12:00")}: <b>${this._brl(x.faixas.valor)}</b> · depois: <b>${this._brl(x.faixas.depois)}</b>. O valor segue a data do pagamento.</div>` : ""}
      ${this._aviso ? `<div class="aviso" role="status">${this._e(this._aviso)}</div>` : ""}
      <div class="duas form" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)"><label>Pago em<input type="date" id="fconf-data" max="${ag.d}" value="${ag.d}"></label><label>Às<input type="time" id="fconf-hora" value="${ag.h}"></label></div>
      <div class="fs">Já vem com agora. Pagou antes? Troque a data (e a hora, se quiser).</div>
      <div class="fpe"><button class="btn prim" data-a="f-conf-ok" data-k="${this._e(x.id)}">✓ Confirmar pagamento</button><button class="btn" data-a="fechar">Cancelar</button></div>
    </dialog>`;
  };

  // janela da conta (luz): situação, data do pagamento editável e atalho para o painel de energia
  P._finFolhaConta = function () {
    const x = this._finObrigacoes().find((y) => y.id === this._fConta);
    if (x?.tipo === "fatura") return this._finFolhaFatura(x);
    const cab = (t, s) => `<div class="fh"><div style="min-width:0"><div class="ft">${t}</div><div class="fs">${s}</div></div><button class="ico" data-a="fechar" aria-label="Fechar">✕</button></div>`;
    if (!x) return `<dialog class="folha" aria-label="Conta">${cab("Conta", "")}<div class="vazio">Conta não encontrada.</div></dialog>`;
    const pg = x.pago, largada = pg?.via === "antes do controle";
    const situ = pg ? (largada ? "considerada paga (antes do controle, sem o dia exato)" : `paga em ${this._finQuando(pg.em)}${pg.via && pg.via !== "você" ? ` (pelo ${this._e(pg.via)})` : ""}`)
      : x.vence < this._fFin.hoje ? "atrasada" : "a pagar";
    return `<dialog class="folha" aria-label="${this._e(x.nome)}">${cab(`${this._e(x.icone)} ${this._e(x.nome)}`, `ref. ${this._e(x.referencia || "")} · ${this._e(x.categoria)} › ${this._e(x.subcategoria)}`)}
      <div class="fcontagrade">
        <div class="fbox"><span class="frot">Valor</span><span class="fv">${this._brl(x.total)}</span></div>
        <div class="fbox"><span class="frot">Vencimento</span><span class="fv">${this._dataCurta(x.vence + "T12:00")}</span></div>
        <div class="fbox ${!pg && x.vence < this._fFin.hoje ? "falerta" : ""}"><span class="frot">Situação</span><span class="fs">${situ}</span></div>
      </div>
      ${this._aviso ? `<div class="aviso" role="status">${this._e(this._aviso)}</div>` : ""}
      ${pg ? (this._fCorrigir ? `<div class="fcard">${this._finItem(x, true, true)}</div>` : "") : `<button class="btn prim fpg-grande" data-a="f-pagar" data-k="${this._e(x.id)}">✓ Paguei esta conta</button>`}
      ${x.fonte === "agua" ? this._finAguaDetalhe(x) : x.fonte === "luz_pdf" ? this._finLuzDetalhe(x) : x.fonte === "parcelada" ? `<div class="fcard"><div class="fhd"><h3>Parcela ${this._e(x.referencia)}</h3></div><div class="fs">Parcela de ${this._brl(x.total)} do carnê, com vencimento em ${this._dataCurta(x.vence + "T12:00")}. Paga depois do vencimento, a prefeitura cobra multa e juros: corrija o valor se for o caso.${x.pago ? ` Paga em ${this._finQuando(x.pago.em)}.` : ""}</div></div>
        <div class="links"><button class="lnk" data-a="f-rec" data-k="${this._e(x.id.split(":")[0])}">${this._e(x.icone)} Todas as parcelas ›</button></div>` : x.fonte === "recorrente" ? `<div class="fcard"><div class="fhd"><h3>Como funciona</h3></div><div class="fs">A operadora não manda conta nem comprovante: o CoFinance cria esta conta todo mês e o controle é de vocês (✓ Paguei com a data).<br>
        Pagando até <b>${this._dataCurta(x.faixas.ate + "T12:00")}</b>: <b>${this._brl(x.faixas.valor)}</b> · depois: <b>${this._brl(x.faixas.depois)}</b>.${x.pago ? ` Paga em ${this._finQuando(x.pago.em)}: ${this._brl(x.total)}.` : ""}</div></div>
        <div class="links"><button class="lnk" data-a="f-rec" data-k="${this._e(x.id.split(":")[0])}">${this._e(x.icone)} Histórico de ${this._e(x.nome.toLowerCase())} ›</button></div>` : `<div class="links"><button class="lnk" data-a="f-energia">⚡ Abrir no painel de energia ›</button></div>
      <div class="fs">Lá, abra a aba Faturas e escolha ${this._e(x.referencia || "o mês")}. Valor e consumo vêm de lá (a Equatorial); aqui só a data do pagamento.</div>`}
    </dialog>`;
  };

  // ---------------------------------------------------------------- água (Saneago)
  // detalhe da conta de água (dentro da janela da conta): vem da tela da água, que o card carrega ao abrir
  P._finAguaDetalhe = function (x) {
    const c = (this._fAgua?.dados?.contas || this._fAguaCache?.contas || []).find((y) => y.id === x.id);
    const link = `<div class="links"><button class="lnk" data-a="f-agua">💧 Todas as contas de água ›</button></div>`;
    if (!c) { if (!this._fAguaPedindo && !this._fAguaErro && !this._fAguaCache) this._finAguaCarregar(true); return `${link}<div class="fs">${this._fAguaErro ? "Não consegui carregar o consumo." : this._fAguaCache ? "Esta conta não está na lista da água." : "Carregando o consumo…"}</div>`; }
    if (c.digitada) return `<div class="fcontagrade"><div class="fbox"><span class="frot">Consumo</span><span class="fv">${c.m3 ?? "—"} m³</span></div>
      <div class="fbox"><span class="frot">R$ por m³</span><span class="fv">${c.por_m3 != null ? this._brl(c.por_m3) : "—"}</span></div></div><div class="fs">Conta digitada por vocês.</div>${link}`;
    const l = c.leitura || {};
    const srv = (c.servicos || []).map((s) => `<div class="fmesp"><span>${this._e(s.descricao)}</span><span>${this._brl(s.valor)}</span></div>`).join("");
    return `<div class="fcontagrade">
        <div class="fbox ${c.alto ? "falerta" : ""}"><span class="frot">Consumo</span><span class="fv">${c.m3 ?? "?"} m³</span><span class="fs">${c.alto ? `⚠ alto · média ${this._num(c.media_6m)} m³` : c.media_6m != null ? `média ${this._num(c.media_6m)} m³` : ""}</span></div>
        <div class="fbox"><span class="frot">R$ por m³</span><span class="fv">${c.por_m3 != null ? this._brl(c.por_m3) : "—"}</span><span class="fs">conta ÷ m³ (inclui fixo e lixo)</span></div>
        <div class="fbox"><span class="frot">Leitura</span><span class="fs">${l.anterior ?? "?"} → ${l.atual ?? "?"} · ${l.dias ?? "?"} dias<br>${l.data_anterior ? this._dataCurta(l.data_anterior + "T12:00") : ""} a ${l.data_atual ? this._dataCurta(l.data_atual + "T12:00") : ""}</span></div>
      </div>
      <div class="fcard"><div class="fhd"><h3>Serviços da conta</h3><small>${c.conferencia?.bate ? "somam o total ✓" : "⚠ não somam o total"}</small></div>${srv || `<div class="vazio peq">—</div>`}</div>
      ${c.extras ? `<div class="fs">Multa e atualização monetária nesta conta: <b>${this._brl(c.extras)}</b> (atraso de conta anterior).</div>` : ""}
      ${c.aviso ? `<div class="fs fag-aviso">Saneago: ${this._e(c.aviso)}</div>` : ""}
      <div class="fs">Fatura ${this._e(c.fatura || "")}${c.nf ? ` · NF ${this._e(c.nf)}` : ""}${c.proxima_leitura ? ` · próxima leitura ${this._dataCurta(c.proxima_leitura + "T12:00")}` : ""}${c.arquivo ? ` · lida de ${this._e(c.arquivo)}` : ""}</div>${link}`;
  };

  P._finAguaCarregar = async function (silencioso) {
    this._fAguaPedindo = true;
    try {
      const r = await this._api({ acao: "agua" });
      this._fAguaCache = r; this._fAguaErro = null;
      if (this._fAgua) this._fAgua = { ...this._fAgua, carregando: false, dados: r };
    } catch (e) {
      this._fAguaErro = e.message || String(e);
      if (this._fAgua) this._fAgua = { ...this._fAgua, carregando: false, erro: this._fAguaErro };
    } finally { this._fAguaPedindo = false; }
    if (!silencioso || this._fConta || this._fAgua) this._render();
  };

  // Só os blocos de texto do PDF (sem imagens e fontes): a conta nova da Saneago tem 4,8 MB, o texto dela ~5 KB.
  // O HA tira o texto disso com o mesmo leitor dos PDFs de nota.
  P._finPdfTexto = function (by) {
    let s = "";
    for (let i = 0; i < by.length; i += 0x8000) s += String.fromCharCode(...by.subarray(i, i + 0x8000));
    const out = [], re = /stream\r?\n/g;
    let m;
    while ((m = re.exec(s))) {
      const i = m.index;
      if (s.slice(i - 3, i) === "end") continue;
      const j = s.indexOf("endstream", re.lastIndex);
      if (j < 0) break;
      const dic = s.slice(s.lastIndexOf("obj", i), i);
      if (!["/Subtype", "/Type", "/Length1", "/N ", "/N3", "/Alternate"].some((x) => dic.includes(x)) && j - re.lastIndex <= 2e6)
        out.push("stream\n" + s.slice(re.lastIndex, j).replace(/[\r\n]+$/, "") + "\nendstream\n");
      re.lastIndex = j + 9;
    }
    return out.join("");
  };

  P._finAguaLer = async function (files) {
    const pdfs = [...(files || [])].filter((f) => /\.pdf$/i.test(f.name) || f.type === "application/pdf");
    if (!this._fAgua) return;
    if (!pdfs.length) { this._fAgua = { ...this._fAgua, log: [{ txt: "Nenhum PDF nessa escolha.", erro: true }] }; return this._render(); }
    const lidos = new Set(this._fAgua.dados?.arquivos || []);
    const novos = pdfs.filter((f) => !lidos.has(f.name)).sort((a, b) => a.name.localeCompare(b.name));
    const log = [];
    if (pdfs.length > novos.length) log.push({ txt: `${pdfs.length - novos.length} ${pdfs.length - novos.length === 1 ? "PDF já lido" : "PDFs já lidos"} (pulei).` });
    if (!novos.length) { this._fAgua = { ...this._fAgua, log: [...log, { txt: "Nenhuma conta nova." }] }; return this._render(); }
    for (let n = 0; n < novos.length; n++) {
      const f = novos[n];
      this._fAgua = { ...this._fAgua, lendo: { i: n + 1, n: novos.length, nome: f.name }, log }; this._render();
      try {
        const b64 = btoa(this._finPdfTexto(new Uint8Array(await f.arrayBuffer())));
        const partes = b64.match(/[\s\S]{1,30000}/g) || [""];
        let r = null;
        if (partes.length === 1) r = await this._api({ acao: "agua_ler", arquivo: f.name, conteudo: b64 });
        else {
          const envio = `agua${Date.now()}`;
          for (let p = 1; p <= partes.length; p++) r = await this._api({ acao: "pedaco", para: "agua", envio, n: p, total: partes.length, dados: partes[p - 1], arquivo: f.name });
        }
        log.push({ txt: r?.mensagem || `${f.name}: lida.` });
      } catch (e) { log.push({ txt: `${f.name}: ${e.message || e}`, erro: true }); }
    }
    this._fAgua = { ...this._fAgua, lendo: null, log };
    try { this._fFin = await this._api({ acao: "financeiro" }); this._fLinhasDe = null; } catch (_) { /* segue */ }
    return this._finAguaCarregar();
  };

  // histórico de uma conta fixa criada pela Central (internet): mês a mês, pago em dia ou não
  P._finFolhaRec = function () {
    const F = this._fFin || {}, hoje = F.hoje || "", rid = this._fRec;
    const L = (F.contas || []).filter((x) => (x.fonte === "recorrente" || x.fonte === "parcelada") && x.id.startsWith(rid + ":")).sort((a, b) => b.vence.localeCompare(a.vence));
    const x0 = L[0];
    const cab = `<div class="fh"><div style="min-width:0"><div class="ft">${this._e(x0?.icone || "")} ${this._e(x0?.nome || "Conta")}</div><div class="fs">${x0?.fonte === "parcelada" ? `carnê em ${x0.de} parcelas` : "conta fixa · controle de vocês"} · ${this._e(x0 ? `${x0.categoria} › ${x0.subcategoria}` : "")}</div></div><button class="ico" data-a="fechar" aria-label="Fechar">✕</button></div>`;
    if (!x0) return `<dialog class="folha larga" aria-label="Conta">${cab}<div class="vazio">Nada ainda.</div></dialog>`;
    const ano = hoje.slice(0, 4), doAno = L.filter((x) => x.vence.startsWith(ano));
    const pagas = doAno.filter((x) => x.pago), emDia = pagas.filter((x) => String(x.pago.em).slice(0, 10) <= x.vence);
    const soma = (l) => l.reduce((s, x) => s + x.total, 0);
    const extra = pagas.reduce((s, x) => s + Math.max(0, x.total - (x.faixas ? x.faixas.valor : x.total)), 0), parc = x0.fonte === "parcelada";
    const faltam = L.filter((x) => !x.pago);
    const linhas = L.map((x) => {
      const dPg = x.pago ? String(x.pago.em).slice(0, 10) : "", largada = x.pago?.via === "antes do controle";
      const st = x.pago ? (largada ? ["paga*", "fok"] : dPg <= x.vence ? ["em dia", "fok"] : ["com atraso", "fatras"]) : x.vence < hoje ? ["atrasada", "fatras"] : ["a pagar", "fhoje"];
      return `<button class="fag-l frec" data-a="f-conta" data-k="${this._e(x.id)}">
        <span class="fag-m"><b>${this._e(x.referencia)}</b><small>vence ${this._dataCurta(x.vence + "T12:00")}</small></span>
        <span class="fag-m"><b>${x.pago ? (largada ? "—" : this._dataCurta(dPg + "T12:00")) : "—"}</b><small>${x.pago ? (largada ? "antes do controle" : "paga em") : "não paga"}</small></span>
        <span class="fag-v"><b>${this._brl(x.total)}</b><small>${x.pago || !x.faixas ? "" : `até o venc. ${this._brl(x.faixas.valor)}`}</small></span>
        <span class="fag-s ${st[1]}">${st[0]}</span></button>`;
    }).join("");
    return `<dialog class="folha larga" aria-label="${this._e(x0.nome)}">${cab}
      <div class="fcontagrade">
        <div class="fbox"><span class="frot">Em ${ano}</span><span class="fv">${this._brl(soma(pagas))}</span><span class="fs">${pagas.length} ${pagas.length === 1 ? "mês pago" : "meses pagos"}</span></div>
        <div class="fbox ${pagas.length > emDia.length ? "falerta" : ""}"><span class="frot">Em dia</span><span class="fv">${emDia.length} de ${pagas.length}</span><span class="fs">${extra ? `${this._brl(extra)} a mais por atraso` : "nenhum atraso pago"}</span></div>
        ${parc ? `<div class="fbox"><span class="frot">Faltam</span><span class="fv">${faltam.length ? this._brl(faltam.reduce((s, x) => s + x.total, 0)) : "quitado"}</span><span class="fs">${faltam.length} de ${L.length} parcelas${faltam.length ? ` · última em ${this._dataCurta(L[0].vence + "T12:00")}` : ""}</span></div>`
          : `<div class="fbox"><span class="frot">Preço</span><span class="fv">${this._brl(x0.faixas.valor)}</span><span class="fs">até o dia ${x0.vence.slice(8, 10)} · ${this._brl(x0.faixas.depois)} depois</span></div>`}
      </div>
      <div class="fcard"><div class="fhd"><h3>Mês a mês</h3><small>toque para ver ou corrigir</small></div>${linhas}</div>
      <div class="fs">${parc ? "Datas e valor do carnê; a data do pagamento é a que vocês marcam no ✓ Paguei." : "A operadora não manda conta: a data e o valor são os que vocês marcam no ✓ Paguei (o valor segue a data: até o vencimento ou depois)."} Para corrigir uma data: A pagar › ✎. paga* = considerada paga (antes do controle).</div>
    </dialog>`;
  };

  P._finFolhaAgua = function () {
    const A = this._fAgua, D = A.dados;
    const cab = `<div class="fh"><div style="min-width:0"><div class="ft">💧 ${this._e(this._fFin?.contas_casa?.agua?.nome || D?.nome || "Água")}</div><div class="fs">${this._fFin?.contas_casa?.agua?.fonte === "manual" ? "digitada todo mês" : "contas da Saneago"} · Casa › Contas fixas</div></div><button class="ico" data-a="fechar" aria-label="Fechar">✕</button></div>`;
    const man = this._fFin?.contas_casa?.agua?.fonte === "manual";  // companhia sem leitor: digita o mês
    const ler = man ? this._finDigitar("agua") : A.lendo ? `<div class="aviso" role="status">Lendo ${A.lendo.i}/${A.lendo.n} · ${this._e(A.lendo.nome)}…</div>`
      : `<div class="fag-bt"><label class="btn prim escolher fag-esc">📁 Ler contas da pasta<input id="ag-pasta" type="file" webkitdirectory multiple></label>
          <label class="btn escolher fag-esc">📄 Escolher PDFs<input id="ag-arqs" type="file" multiple accept=".pdf,application/pdf"></label></div>
        <div class="fs">Escolha a pasta onde ficam as contas de água. Só os PDFs novos são lidos e nada é copiado: fica só o que está na conta (valores, leituras, consumo e serviços). Chegou conta nova? Leia a pasta de novo.</div>`;
    const log = (A.log || []).length ? `<div class="fag-log">${A.log.map((l) => `<div class="${l.erro ? "fatras" : ""}">${this._e(l.txt)}</div>`).join("")}</div>` : "";
    if (A.carregando) return `<dialog class="folha larga" aria-label="Água">${cab}<div class="vazio">Carregando…</div></dialog>`;
    if (A.erro) return `<dialog class="folha larga" aria-label="Água">${cab}<div class="aviso" role="status">⚠ ${this._e(A.erro)}</div></dialog>`;
    const L = D?.contas || [];
    const ano = (this._fFin?.hoje || "").slice(0, 4), doAno = L.filter((c) => c.ref.startsWith(ano));
    const soma = (l, k) => l.reduce((s, c) => s + (c[k] || 0), 0);
    const ult = L[0], m3s = L.slice(0, 12).filter((c) => c.m3 != null);
    const max = Math.max(1, ...L.map((c) => c.m3 || 0));
    const resumo = ult ? `<div class="fcontagrade">
        <div class="fbox ${ult.alto ? "falerta" : ""}"><span class="frot">Último mês · ${this._e(ult.referencia)}</span><span class="fv">${ult.m3 ?? "?"} m³</span><span class="fs">${this._brl(ult.total)}${ult.alto ? " · ⚠ consumo alto" : ""}</span></div>
        <div class="fbox"><span class="frot">Média (até 12 meses)</span><span class="fv">${m3s.length ? this._num(Math.round(soma(m3s, "m3") / m3s.length * 10) / 10) : "—"} m³</span><span class="fs">${m3s.length ? `${this._brl(soma(m3s, "total") / m3s.length)} por mês` : ""}</span></div>
        <div class="fbox ${soma(doAno, "extras") ? "falerta" : ""}"><span class="frot">Em ${ano}</span><span class="fv">${this._brl(soma(doAno, "total"))}</span><span class="fs">${doAno.length} ${doAno.length === 1 ? "conta" : "contas"}${soma(doAno, "extras") ? ` · ${this._brl(soma(doAno, "extras"))} em multas/atualização` : ""}</span></div>
      </div>` : "";
    const linhas = L.map((c) => {
      const st = c.pago ? (c.pago.via === "antes do controle" ? "paga*" : "paga") : c.vence < (this._fFin?.hoje || "") ? "atrasada" : "a pagar";
      return `<button class="fag-l${c.alto ? " alto" : ""}" data-a="f-conta" data-k="${this._e(c.id)}">
        <span class="fag-m"><b>${this._e(c.referencia)}</b><small>vence ${this._dataCurta(c.vence + "T12:00")}</small></span>
        <span class="fag-b"><i style="width:${Math.round((c.m3 || 0) / max * 100)}%"></i><em>${c.m3 ?? "?"} m³${c.dias ? ` · ${c.dias} d` : ""}${c.alto ? " ⚠" : ""}</em></span>
        <span class="fag-v"><b>${this._brl(c.total)}</b><small>${c.por_m3 != null ? `${this._brl(c.por_m3)}/m³` : ""}${c.extras ? ` · multa ${this._brl(c.extras)}` : ""}</small></span>
        <span class="fag-s ${st === "atrasada" ? "fatras" : st === "a pagar" ? "fhoje" : "fok"}">${st}</span></button>`;
    }).join("");
    return `<dialog class="folha larga" aria-label="Água">${cab}${ler}${log}${resumo}
      <div class="fcard"><div class="fhd"><h3>Mês a mês</h3><small>toque para ver a conta</small></div>${linhas || `<div class="vazio peq">${man ? "Nenhuma conta digitada ainda." : "Nenhuma conta lida ainda. Toque em Ler contas da pasta."}</div>`}</div>
      <div class="fs">⚠ consumo alto: 30% (e pelo menos 2 m³) acima da média dos 6 meses anteriores. R$/m³ = conta ÷ m³ (inclui custo fixo e taxa de lixo). paga* = considerada paga (antes do controle). Pagar: A pagar › ✓ Paguei, como a luz.</div>
    </dialog>`;
  };

  // ---------------------------------------------------------------- luz (contas em PDF, sem o painel de energia)
  // conta de luz ou água digitada (companhia sem leitor): mês, vencimento, valor e, se quiserem, o consumo
  P._finDigitar = function (tipo) {
    const ant = this._finSomaMes((this._fFin?.hoje || "").slice(0, 7) || this._mesDe(new Date()), -1), un = tipo === "luz" ? "kWh" : "m³";
    return `<div class="form fdig"><div class="duas" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)"><label>Mês da conta<input id="dg-ref" type="month" value="${ant}"></label><label>Vence em<input id="dg-venc" type="date"></label></div>
      <div class="duas" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)"><label>Valor<input id="dg-val" type="text" inputmode="decimal" autocomplete="off"></label><label>Consumo <small>(${un}, se quiser)</small><input id="dg-cons" type="text" inputmode="decimal" autocomplete="off"></label></div>
      <div class="fpe"><button class="btn prim" data-a="f-dig-salvar" data-k="${tipo}">Salvar a conta</button></div>
      <div class="fs">Mês da conta é o do consumo (a de setembro vence em outubro). Digitou errado? Salve o mesmo mês de novo.</div></div>`;
  };
  P._finDigSalvar = async function (tipo) {
    const g = (i) => this.shadowRoot.getElementById(i)?.value, st = tipo === "luz" ? "_fLuz" : "_fAgua";
    try {
      const r = await this._api({ acao: "conta_mes", tipo, ref: g("dg-ref"), vence: g("dg-venc"), valor: g("dg-val"), consumo: g("dg-cons") });
      this[st] = { ...this[st], log: [{ txt: r.mensagem }] };
      this._fFin = await this._api({ acao: "financeiro" }); this._fLinhasDe = null;
    } catch (e) { this[st] = { ...this[st], log: [{ txt: "⚠ " + (e.message || e), erro: true }] }; }
    return tipo === "luz" ? this._finLuzCarregar() : this._finAguaCarregar();
  };

  P._finLuzDetalhe = function (x) {
    const z = x.luz || {}, link = `<div class="links"><button class="lnk" data-a="f-luz">⚡ Todas as contas de luz ›</button></div>`;
    const sol = z.solar ? `<div class="fbox"><span class="frot">Energia solar</span><span class="fv">${this._num(z.solar.credito_kwh)} kWh</span><span class="fs">créditos usados${z.solar.saldo_kwh != null ? ` · saldo ${this._num(z.solar.saldo_kwh)} kWh` : ""}</span></div>` : "";
    return `<div class="fcontagrade">
        <div class="fbox"><span class="frot">Consumo</span><span class="fv">${z.consumo_kwh ?? "?"} kWh</span><span class="fs">${z.dias ? `${z.dias} dias` : ""}</span></div>
        <div class="fbox"><span class="frot">R$ por kWh</span><span class="fv">${z.consumo_kwh ? this._brl(x.total / z.consumo_kwh) : "—"}</span><span class="fs">conta ÷ kWh (inclui iluminação pública)</span></div>
        ${z.bandeira ? `<div class="fbox"><span class="frot">Bandeira</span><span class="fv">${this._e(z.bandeira)}</span></div>` : ""}${sol}
      </div><div class="fs">${z.digitada ? "Conta digitada por vocês." : `${this._e(z.distribuidora || "")} · lida da conta em PDF.`}</div>${link}`;
  };

  P._finLuzCarregar = async function () {
    try {
      const r = await this._api({ acao: "luz" });
      this._fLuzCache = r;
      if (this._fLuz) this._fLuz = { ...this._fLuz, carregando: false, dados: r, erro: null };
    } catch (e) { if (this._fLuz) this._fLuz = { ...this._fLuz, carregando: false, erro: e.message || String(e) }; }
    this._render();
  };

  // PDF → linhas pelo pdf.js (como as faturas de cartão); só o texto vai para o HA, que guarda só os campos da conta
  P._finLuzLer = async function (files) {
    const pdfs = [...(files || [])].filter((f) => /\.pdf$/i.test(f.name) || f.type === "application/pdf");
    if (!this._fLuz) return;
    if (!pdfs.length) { this._fLuz = { ...this._fLuz, log: [{ txt: "Nenhum PDF nessa escolha.", erro: true }] }; return this._render(); }
    const nome = (f) => f.name.split(/[\\/]/).pop().slice(0, 120).replace(/\d{6,}/g, "…");  // o HA guarda o nome sem números compridos
    const lidos = new Set(this._fLuz.dados?.arquivos || []);
    const novos = pdfs.filter((f) => !lidos.has(nome(f))).sort((a, b) => a.name.localeCompare(b.name));
    const log = [];
    if (pdfs.length > novos.length) log.push({ txt: `${pdfs.length - novos.length} ${pdfs.length - novos.length === 1 ? "PDF já lido" : "PDFs já lidos"} (pulei).` });
    if (!novos.length) { this._fLuz = { ...this._fLuz, log: [...log, { txt: "Nenhuma conta nova." }] }; return this._render(); }
    for (let n = 0; n < novos.length; n++) {
      const f = novos[n];
      this._fLuz = { ...this._fLuz, lendo: { i: n + 1, n: novos.length, nome: f.name }, log }; this._render();
      try {
        const by = new TextEncoder().encode(JSON.stringify(await this._finPdfLinhas(f)));
        let bin = "";
        for (let i = 0; i < by.length; i += 0x8000) bin += String.fromCharCode(...by.subarray(i, i + 0x8000));
        const b64 = btoa(bin), partes = b64.match(/[\s\S]{1,30000}/g) || [""];
        let r = null;
        if (partes.length === 1) r = await this._api({ acao: "luz_ler", arquivo: f.name, conteudo: b64 });
        else {
          const envio = `luz${Date.now()}`;
          for (let p = 1; p <= partes.length; p++) r = await this._api({ acao: "pedaco", para: "luz", envio, n: p, total: partes.length, dados: partes[p - 1], arquivo: f.name });
        }
        log.push({ txt: r?.mensagem || `${f.name}: lida.` });
      } catch (e) { log.push({ txt: `${f.name}: ${e.message || e}`, erro: true }); }
    }
    this._fLuz = { ...this._fLuz, lendo: null, log };
    try { this._fFin = await this._api({ acao: "financeiro" }); this._fLinhasDe = null; } catch (_) { /* segue */ }
    return this._finLuzCarregar();
  };

  P._finFolhaLuz = function () {
    const A = this._fLuz, D = A.dados;
    const cab = `<div class="fh"><div style="min-width:0"><div class="ft">⚡ ${this._e(this._fFin?.contas_casa?.luz?.nome || D?.nome || "Luz")}</div><div class="fs">${this._fFin?.contas_casa?.luz?.fonte === "manual" ? "digitada todo mês" : "contas em PDF · Equatorial Goiás, CPFL e Neoenergia"} · Casa › Contas fixas</div></div><button class="ico" data-a="fechar" aria-label="Fechar">✕</button></div>`;
    const man = this._fFin?.contas_casa?.luz?.fonte === "manual";  // companhia sem leitor: digita o mês
    const ler = man ? this._finDigitar("luz") : A.lendo ? `<div class="aviso" role="status">Lendo ${A.lendo.i}/${A.lendo.n} · ${this._e(A.lendo.nome)}…</div>`
      : `<div class="fag-bt"><label class="btn prim escolher fag-esc">📁 Ler contas da pasta<input id="lz-pasta" type="file" webkitdirectory multiple></label>
          <label class="btn escolher fag-esc">📄 Escolher PDFs<input id="lz-arqs" type="file" multiple accept=".pdf,application/pdf"></label></div>
        <div class="fs">O PDF é lido aqui no navegador e não é guardado: da conta fica só valor, vencimento, consumo, leituras e bandeira. Nome, CPF, endereço e número da instalação ficam de fora. Chegou conta nova? Leia de novo.</div>`;
    const log = (A.log || []).length ? `<div class="fag-log">${A.log.map((l) => `<div class="${l.erro ? "fatras" : ""}">${this._e(l.txt)}</div>`).join("")}</div>` : "";
    if (A.carregando) return `<dialog class="folha larga" aria-label="Luz">${cab}<div class="vazio">Carregando…</div></dialog>`;
    if (A.erro) return `<dialog class="folha larga" aria-label="Luz">${cab}<div class="aviso" role="status">⚠ ${this._e(A.erro)}</div></dialog>`;
    const L = D?.contas || [], hoje = this._fFin?.hoje || "", ano = hoje.slice(0, 4), doAno = L.filter((c) => c.ref.startsWith(ano));
    const soma = (l, k) => l.reduce((s, c) => s + (c[k] || 0), 0);
    const ult = L[0], kw = L.slice(0, 12).filter((c) => c.consumo_kwh != null), max = Math.max(1, ...L.map((c) => c.consumo_kwh || 0));
    const resumo = ult ? `<div class="fcontagrade">
        <div class="fbox ${ult.alto ? "falerta" : ""}"><span class="frot">Último mês · ${this._e(ult.referencia)}</span><span class="fv">${ult.consumo_kwh ?? "?"} kWh</span><span class="fs">${this._brl(ult.total)}${ult.alto ? " · ⚠ consumo alto" : ""}</span></div>
        <div class="fbox"><span class="frot">Média (até 12 meses)</span><span class="fv">${kw.length ? this._num(Math.round(soma(kw, "consumo_kwh") / kw.length)) : "—"} kWh</span><span class="fs">${kw.length ? `${this._brl(soma(kw, "total") / kw.length)} por mês` : ""}</span></div>
        <div class="fbox"><span class="frot">Em ${ano}</span><span class="fv">${this._brl(soma(doAno, "total"))}</span><span class="fs">${doAno.length} ${doAno.length === 1 ? "conta" : "contas"}</span></div>
      </div>` : "";
    const linhas = L.map((c) => {
      const st = c.pago ? (c.pago.via === "antes do controle" ? "paga*" : "paga") : c.vence < hoje ? "atrasada" : "a pagar";
      return `<button class="fag-l${c.alto ? " alto" : ""}" data-a="f-conta" data-k="${this._e(c.id)}">
        <span class="fag-m"><b>${this._e(c.referencia)}</b><small>vence ${this._dataCurta(c.vence + "T12:00")}</small></span>
        <span class="fag-b"><i style="width:${Math.round((c.consumo_kwh || 0) / max * 100)}%"></i><em>${c.consumo_kwh ?? "?"} kWh${c.dias ? ` · ${c.dias} d` : ""}${c.alto ? " ⚠" : ""}${c.solar ? " ☀" : ""}</em></span>
        <span class="fag-v"><b>${this._brl(c.total)}</b><small>${c.por_kwh != null ? `${this._brl(c.por_kwh)}/kWh` : ""}${c.bandeira ? ` · ${this._e(c.bandeira.toLowerCase())}` : ""}</small></span>
        <span class="fag-s ${st === "atrasada" ? "fatras" : st === "a pagar" ? "fhoje" : "fok"}">${st}</span></button>`;
    }).join("");
    return `<dialog class="folha larga" aria-label="Luz">${cab}${ler}${log}${resumo}
      <div class="fcard"><div class="fhd"><h3>Mês a mês</h3><small>toque para ver a conta</small></div>${linhas || `<div class="vazio peq">${man ? "Nenhuma conta digitada ainda." : "Nenhuma conta lida ainda. Toque em Ler contas da pasta."}</div>`}</div>
      <div class="fs">⚠ consumo alto: 30% acima da média dos 6 meses anteriores. ☀ = usou créditos de energia solar. R$/kWh = conta ÷ kWh (inclui iluminação pública e impostos). paga* = considerada paga (antes do controle). Pagar: A pagar › ✓ Paguei.</div>
    </dialog>`;
  };

  P._finPagar = async function (id, desfazer, em) {
    try {
      const r = await this._api({ acao: "pagar", id, desfazer: !!desfazer, ...(em ? { em } : {}) });
      this._aviso = r.mensagem;
      this._fFin = await this._api({ acao: "financeiro" });
      this._fLinhasDe = null;
    } catch (e) { this._aviso = "⚠ " + (e.message || e); }
    this._render();
  };

  // ⚙ Configurações (engrenagem no topo, só administrador): pessoas e cartões; depois contas da casa e geral
  P._finConfig = function () {
    this._finEstado();
    this._finGarantir();
    const F = this._fFin;
    if (!F) return `<div class="fin"><div class="vazio">Carregando…</div></div>`;
    const cartoes = (F.cartoes || []).map((k) => `<button class="fcart${this._fCartEd === k.id ? " on" : ""}${k.ativo === false ? " inativo" : ""}" data-a="f-cart-ed" data-k="${this._e(k.id)}">💳 <b>${this._e(this._finNomeCartao(k))}</b>${k.visual?.produto ? ` <small>${this._e(k.visual.produto)}</small>` : ""} ${this._e([k.bandeira, k.categoria].filter(Boolean).join(" "))} · ${this._e(k.dono || "")} · ${k.vale ? "vale" : k.credito === false ? "débito" : `${k.fecha ? `fecha ${k.fecha} · vence ${k.vence}` : "crédito sem dias"}${k.debito ? " · crédito e débito" : ""}`}${k.ativo === false ? " · fora de uso" : ""} ✎</button>`).join("")
      + `<button class="fcart novo${this._fCartEd === "novo" ? " on" : ""}" data-a="f-cart-ed" data-k="novo">+ Novo cartão</button>`;
    const cartoesHtml = `<div class="fcard"><div class="fhd"><h2>Cartões</h2><small>controle desde ${this._dataCurta(F.marco + "T12:00")}</small></div><div class="fcarts">${cartoes}</div>${this._finFormCartao()}
          <div class="fs" style="margin-top:8px">Toque num cartão para editar. Compra até o dia do fechamento entra na fatura que fecha no mês; depois, na seguinte. Compra no próprio dia do fechamento vai para a seguinte. Parcelas caem nas faturas seguintes; os centavos que sobram ficam na 1ª.</div></div>
      </div>`;
    return this._finCfgAcordeao(cartoesHtml);
  };

  // ⚙ em acordeão: a ordem de quem monta a Central do zero; cada grupo com o resumo na linha e o mesmo conteúdo de antes
  P._finCfgAcordeao = function (cartoesHtml) {
    const F = this._fFin || {}, d = this._dados || {};
    const corpo = (html) => {  // o card de antes, sem o título (o título vira a linha do acordeão)
      const tpl = document.createElement("template"); tpl.innerHTML = html;
      const c = tpl.content.querySelector(".fcard"); if (!c) return { html: "", nomes: [] };
      c.querySelector(":scope > .fhd")?.remove();
      return { html: `<div class="${c.className} fcfg-corpo">${c.innerHTML}</div>`, nomes: [...c.querySelectorAll(".fcart:not(.novo) b")].map((b) => b.textContent.trim()) };
    };
    const ps = corpo(this._finPessoas()), ks = corpo(cartoesHtml), cc = corpo(this._finContasCfg()), bs = corpo(this._finBensCfg());
    const av = corpo(this._finAvisosCfg()), at = corpo(this._finAtalhoCfg()), ex = corpo(this._finExcluidasCfg()), pd = corpo(this._finPedidosCfg());
    const pdc = d.pedidos_email || {}, nPed = Object.values(pdc.pedidos || {}).reduce((s, n) => s + n, 0), ligado = !!pdc.caixa;
    const lista = (n, vazio) => n.length ? n.slice(0, 4).join(" · ") + (n.length > 4 ? ` +${n.length - 4}` : "") : vazio;
    const a = d.avisos || {}, atl = d.atalho || {}, km = (d.bens || []).find((b) => b.consumo?.km_atual)?.consumo?.km_atual;
    const nPes = (d.pessoas || []).length, nCart = (F.cartoes || []).length;
    const grupos = [
      ["pessoas", "Pessoas", lista(ps.nomes, "ninguém cadastrado"), ps.html],
      ["cartoes", "Cartões", nCart ? `${nCart} ${nCart === 1 ? "cartão" : "cartões"}${F.marco ? ` · controle desde ${this._dataCurta(F.marco + "T12:00")}` : ""}` : "nenhum cartão", ks.html],
      ["faturas", "Faturas e assinaturas", "ler fatura em PDF · assinaturas", `<div class="fcfg-corpo"><div class="fimp"><button class="btn" data-a="f-fat">💳 Ler fatura do banco (PDF)</button><button class="btn" data-a="f-fat" data-k="assinaturas">Assinaturas</button></div>
        <div class="fs" style="margin-top:8px">A fatura em PDF traz as compras que ainda não estão aqui e confirma as que já estão (crédito, parcelas). Assinaturas: o que se repete todo mês no cartão.</div></div>`],
      ["avisos", "Avisos no telefone", (a.horas_dia || []).length ? `lembretes às ${(a.horas_dia || []).map((h) => `${h}h`).join(", ")}` : "sem lembretes no dia", av.html],
      ["atalho", "Atalho do telefone", `em casa ${atl.casa ? "✓" : "—"} · fora de casa ${atl.fora || atl.base ? "✓" : "—"}`, at.html],
      ["pedidos", "Pedidos de lojas online", `${nPed ? `${nPed} ${nPed === 1 ? "pedido" : "pedidos"}` : (pdc.lojas || ["Shopee"]).join(", ")} · ${ligado ? "automático ✓" : "automático desligado"}`, pd.html],
      ["contas", "Contas da casa", lista(cc.nomes, "nenhuma conta"), cc.html],
      ["veiculos", "Veículos", (d.bens || []).length ? `${lista(bs.nomes, "")}${km ? ` · ${Number(km).toLocaleString("pt-BR")} km` : ""}` : "nenhum veículo", bs.html],
      ["categorias", "Categorias e regras", "áreas, subcategorias e a regra de cada loja", `<div class="fcfg-corpo"><div class="fs">A árvore de áreas e subcategorias e a área que cada loja recebe nas próximas notas.</div>
        <div class="fimp" style="margin-top:8px"><button class="btn" data-a="f-cats">Abrir categorias e regras</button></div></div>`],
      ...(ex.html ? [["excluidas", "Excluídas recentemente", `${(d.excluidas || []).length} de 10`, ex.html]] : []),
      // instalada pela integração (HACS): backup em .zip para guardar ou levar a outro Home Assistant
      ...(this._hass?.services?.co_finance ? [["backup", "Backup e mudança de HA", "exportar · importar", `<div class="fcfg-corpo"><div class="fimp">
        <button class="btn" data-a="f-exp">⬇ Exportar (.zip)</button><button class="btn" data-a="f-imp">⬆ Importar um .zip</button></div>
        <div class="fs" style="margin-top:8px">Exportar baixa um .zip com as compras, os cadastros e as cópias das notas. Importar troca as compras e os cadastros pelos do arquivo e junta as notas; o que havia antes fica guardado em dados/backups.</div></div>`]] : []),
    ];
    const editando = this._fPesEd ? "pessoas" : this._fCartEd ? "cartoes" : this._fCcEd ? "contas" : this._fBemEd ? "veiculos" : this._fExclApagar ? "excluidas"
      : this._fPdLog || this._fPdLendo || this._fPdCaminho || this._fPdImp ? "pedidos" : null;
    // primeiros passos: cada fase pronta ganha ✓ e indica a próxima (pedidos online é opcional)
    const passo = { pessoas: nPes > 0, cartoes: nCart > 0, faturas: (F.faturas_lidas || 0) > 0,
      avisos: (d.pessoas || []).some((x) => x.aviso?.celular), atalho: !!(atl.casa || atl.fora || atl.base), pedidos: ligado };
    const ordem = Object.keys(passo), opcional = { pedidos: true };
    const titulo = Object.fromEntries(grupos.map((g) => [g[0], g[1]]));
    const prox = ordem.find((k) => !passo[k] && !opcional[k]);  // o passo que falta (obrigatório)
    const feitos = ordem.filter((k) => passo[k]).length;
    const depois = (k) => ordem.slice(ordem.indexOf(k) + 1).find((j) => !passo[j]);
    const aberto = this._fCfgGrupo !== undefined ? this._fCfgGrupo : editando || prox || null;
    const prog = prox ? `<div class="fcfg-prog"><div><b>Primeiros passos</b> <span class="fs">${feitos} de ${ordem.length} prontos</span></div>
        <div class="fcfg-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${ordem.length}" aria-valuenow="${feitos}"><i style="width:${Math.round(feitos / ordem.length * 100)}%"></i></div>
        <span class="fs">Faça na ordem. Cada passo pronto ganha ✓ e mostra o próximo. Agora: <b>${this._e(titulo[prox])}</b>.</span></div>` : "";
    const fim = (k) => {  // no fim do passo pronto: segue para o próximo
      if (!(k in passo) || !passo[k]) return "";
      const nx = depois(k);
      return `<div class="fcfg-seg"><span>✓ Pronto</span>${nx ? `<button class="btn prim" data-a="f-cfg-g" data-k="${nx}">Próximo: ${this._e(titulo[nx])} ›</button>` : ""}</div>`;
    };
    return `<div class="fin">${this._aviso ? `<div class="aviso" role="status">${this._e(this._aviso)}</div>` : ""}
      <div class="fcfg-hd"><h1>Configurações</h1><span class="fs">${prox ? "Siga os passos abaixo para deixar o CoFinance pronto." : "Mexa só se precisar: vale para todas as telas."}</span></div>
      ${prog}
      <div class="fcfg-acord">${grupos.map(([k, tit, res, html]) => {
        const n = ordem.indexOf(k) + 1, ok = passo[k];
        const marca = n ? `<span class="fcfg-n${ok ? " ok" : ""}" aria-label="${ok ? "pronto" : `passo ${n}`}">${ok ? "✓" : n}</span>` : "";
        const tag = k === prox ? ` <em class="fcfg-comece">próximo passo</em>` : n && opcional[k] && !ok ? ` <em class="fcfg-opc">opcional</em>` : "";
        return `<div class="fcfg-g${aberto === k ? " on" : ""}${n && !ok && k !== prox && prox && ordem.indexOf(k) > ordem.indexOf(prox) ? " depois" : ""}">
        <button class="fcfg-l" data-a="f-cfg-g" data-k="${k}" aria-expanded="${aberto === k}"><span class="fcfg-t">${marca}${tit}${tag}</span><span class="fcfg-r">${this._e(res)}</span><span class="fcfg-s" aria-hidden="true">›</span></button>
        ${aberto === k ? `<div class="fcfg-c">${html}${fim(k)}</div>` : ""}</div>`;
      }).join("")}</div></div>`;
  };

  // ⚙ › Excluídas recentemente: as 50 últimas; Recuperar devolve a compra como estava
  P._finExcluidasCfg = function () {
    const xs = this._dados?.excluidas || [];
    if (!xs.length) return "";
    const dt = (s) => String(s || "").slice(0, 10).split("-").reverse().join("/");
    const conf = this._fExclApagar;  // id da que vai ser apagada de vez, ou "todas"
    const pergunta = (txt) => `<div class="fexclconf" role="alertdialog"><b>${txt}</b><span class="fs">Some de vez, com a cópia da nota e os anexos. Não dá para desfazer.</span>
      <span><button class="btn perigo" data-a="f-excl-sim">Apagar de vez</button> <button class="btn" data-a="f-excl-nao">Cancelar</button></span></div>`;
    return `<div class="fcard fexclcard"><div class="fhd"><h2>Excluídas recentemente</h2><small>${xs.length} de 10</small></div>
      ${xs.map((x) => `<div class="fexcl"><span><b>${this._e(x.loja)}</b> · ${this._brl(x.valor || 0)}<small class="fs">${this._e(x.quem || "")} · compra ${dt(x.emissao)} · excluída ${dt(x.excluida_em)}${x.juntada ? " · juntada numa nota" : ""}</small></span>
        <span class="fexclb">${x.juntada ? "" : `<button class="btn" data-a="f-recuperar" data-k="${this._e(x.id)}">Recuperar</button>`}<button class="lnk perigo" data-a="f-excl-apagar" data-k="${this._e(x.id)}">Apagar de vez</button></span></div>
        ${conf === x.id ? pergunta(`Apagar de vez ${this._e(x.loja)}, ${this._brl(x.valor || 0)}?`) : ""}`).join("")}
      ${conf === "todas" ? pergunta(`Apagar de vez as ${xs.length} excluídas?`) : `<button class="lnk perigo" data-a="f-excl-apagar" data-k="todas" style="margin-top:8px">Esvaziar (apagar todas de vez)</button>`}
      <div class="fs" style="margin-top:8px">Ficam as 10 últimas; a mais antiga é apagada de vez. A juntada numa nota não volta: a nota já tem o que ela tinha.</div></div>`;
  };

  // ⚙ Avisos: prazos e horários dos lembretes de contas e faturas; endereço do painel (tocar no aviso abre a Central)
  P._finAvisosCfg = function () {
    const a = this._dados?.avisos || {}, horas = Array.from({ length: 17 }, (_, i) => i + 6), dia = a.horas_dia || [];
    const sel = (id, v) => `<select id="${id}">${horas.map((h) => `<option value="${h}" ${Number(v) === h ? "selected" : ""}>${h}h</option>`).join("")}</select>`;
    return `<div class="fcard"><div class="fhd"><h2>Avisos</h2><small>contas e faturas no celular</small></div><div class="form">
      <div class="duas" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)"><label>Avisar antes do vencimento<select id="ka-dias">${[0, 1, 2, 3, 5, 7].map((d) => `<option value="${d}" ${Number(a.dias_antes ?? 1) === d ? "selected" : ""}>${d ? `${d} ${d === 1 ? "dia" : "dias"} antes` : "não avisar antes"}</option>`).join("")}</select></label>
        <label>Às${sel("ka-hantes", a.hora_antes ?? 10)}</label></div>
      <span class="fl">No dia do vencimento, avisar às</span><div class="fhoras">${horas.map((h) => `<label class="chk"><input type="checkbox" data-kahora="${h}" ${dia.includes(h) ? "checked" : ""}>${h}h</label>`).join("")}</div>
      <div class="duas" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)"><label class="chk"><input type="checkbox" id="ka-atr" ${a.atrasadas !== false ? "checked" : ""}> Atrasadas: avisar todo dia até pagar</label>
        <label>Às${sel("ka-hatr", a.hora_atrasadas ?? 10)}</label></div>
      <label>Endereço do painel <small>(o caminho depois do endereço do HA; tocar no aviso abre aqui)</small><input id="ka-painel" type="text" placeholder="/lovelace/compras" value="${this._e(a.painel || "")}" autocomplete="off"></label>
      <div class="fpe"><button class="btn prim" data-a="f-av-salvar">Salvar</button></div>
      <span class="fs">Quem recebe cada aviso se escolhe em Pessoas (celular e o que recebe).</span></div></div>`;
  };

  // ⚙ Atalho do iPhone: o endereço que o Atalho usa para mandar o cupom (endereço do HA + código do webhook)
  P._finAtalhoCfg = function () {
    const at = this._dados?.atalho || {}, cod = at.codigo || "", casa = at.casa || "", fora = at.fora || at.base || "";
    const url = (b) => (b && cod ? `${b}/api/webhook/${cod}` : ""), ver = (u) => (this._fAtVer ? u : u.replace(/[^/]{6}$/, "••••••"));
    const linha = (k, rot, u) => u ? `<div class="fat-url"><label>${rot}<input type="text" readonly value="${this._e(ver(u))}"></label><button class="btn${this._fAtCopiado === k ? " prim" : ""}" data-a="f-at-copiar" data-k="${k}">${this._fAtCopiado === k ? "Copiado ✓" : "Copiar"}</button></div>
      ${this._fAtFalhou === k ? `<span class="fs">Este navegador não deixou copiar sozinho: o código apareceu inteiro. Segure o dedo no campo › Selecionar tudo › Copiar.</span>` : ""}` : "";
    return `<div class="fcard"><div class="fhd"><h2>Atalho do telefone</h2><small>para ler o cupom pelo telefone</small></div><div class="form">
      <span class="fs">De onde o celular acessa o seu Home Assistant: só o começo do endereço, sem nada depois do número da porta.</span>
      <div class="duas" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)">
        <label>Em casa <small>(rede local)</small><input id="kat-casa" type="text" value="${this._e(casa)}" placeholder="http://192.168.0.10:8123" autocomplete="off"></label>
        <label>Fora de casa <small>(Tailscale ou Nabu Casa)</small><input id="kat-fora" type="text" value="${this._e(fora)}" placeholder="http://100.x.x.x:8123" autocomplete="off"></label></div>
      <span class="fs">Em casa só funciona no Wi-Fi de casa. Fora de casa funciona em qualquer lugar: o do Tailscale (com o Tailscale ligado no celular)
        ou o da Nabu Casa (https://xxxx.ui.nabu.casa). Em branco, o que você não usa.</span>
      <div class="fpe"><button class="btn prim" data-a="f-at-salvar">Salvar endereços</button></div>
      ${cod ? `${linha("fora", "Endereço completo · fora de casa <small>(recomendado no Atalho)</small>", url(fora))}${linha("casa", "Endereço completo · em casa", url(casa))}
        ${url(fora) || url(casa) ? `<div class="fpe"><button class="lnk" data-a="f-at-ver">${this._fAtVer ? "esconder o código" : "mostrar o código"}</button></div>
        <span class="fs">O código no fim é a senha do Atalho: não compartilhe. No iPhone: abra o Atalho "Ler cupom / NF" › ⋯ › cole o endereço no passo da URL. No Android: cole no atalho do app HTTP Shortcuts.
          Use o de fora de casa: com o Tailscale ligado ele funciona também em casa.</span>` : `<span class="fs">Preencha um endereço para montar o endereço completo do Atalho.</span>`}`
        : `<span class="fs">O código do Atalho ainda não foi criado aqui. Na integração do HACS ele é criado sozinho na instalação e o endereço completo aparece nesta tela.</span>`}</div></div>`;
  };

  // ⚙ Pedidos de lojas online: o e-mail do pedido (Shopee…) diz o pago de verdade e quais lojas foram numa cobrança só.
  // À mão: enviar o PDF do e-mail. Automático: os e-mails de quem encaminha para a caixa auxiliar (e de quem é a compra).
  P._finPedidosCfg = function () {
    const c = this._dados?.pedidos_email || {}, lojas = (c.lojas || []).join(", ") || "Shopee", caixa = c.caixa || "", doHa = c.caixas_ha || [];
    const remTxt = (c.remetentes || ["info@mail.shopee.com.br"])[0], rem = this._e(remTxt);
    const cp = (txt) => `<code>${this._e(txt)}</code>`;
    const site = (url) => `<a href="https://${url}" target="_blank" rel="noopener">${url}</a>`;
    const log = (this._fPdLog || []).map((x) => `<div class="fs${x.erro ? " ferro" : ""}">${this._e(x.txt)}</div>`).join("");
    const imp = this._fPdImp, marcoG = String(this._fFin?.marco || "2026-01-01").replace(/-/g, "/");
    // passo a passo do caminho escolhido (A: e-mail novo só para isso; B: o próprio e-mail)
    const ca = this._fPdCaminho || null, A = ca === "A", caixaTxt = A ? "a caixa nova" : "o seu e-mail";
    const passos = !ca ? [] : [
      ...(A ? [`<li><b>Crie o e-mail novo</b>
          <ul><li>Um Gmail novo (${site("accounts.google.com/signup")}). Não use para mais nada nem divulgue: ele só recebe os pedidos encaminhados.</li></ul></li>`] : []),
      `<li><b>Senha de app ${A ? "da caixa nova" : "do seu e-mail"}</b>
          <ul><li>Entre no navegador com ${caixaTxt} e abra ${site("myaccount.google.com")} › <b>Segurança</b> › <b>Verificação em duas etapas</b>.
            Se pedir uma segunda etapa, adicione a que preferir (por exemplo, chave de acesso ou número de telefone) e toque em <b>Ativar a verificação em duas etapas</b>.</li>
          <li>Abra ${site("myaccount.google.com/apppasswords")} › Nome do app: ${cp("Home Assistant")} › <b>Criar</b>.
            Aparecem 16 letras (ex.: <code>abcd efgh ijkl mnop</code>): copie. Só aparecem uma vez; se perder, apague e crie outra.
            Se disser que senhas de app não estão disponíveis, adicione mais uma forma de segunda etapa na verificação em duas etapas e tente de novo.</li></ul></li>`,
      `<li><b>Integração IMAP no Home Assistant</b>
          <ul><li><b>Configurações › Dispositivos e serviços › Adicionar integração › IMAP</b>.</li>
          <li><b>Usuário</b> = ${A ? "o endereço completo da caixa nova" : "o seu e-mail completo"} (com @gmail.com) · <b>Senha</b> = as 16 letras, juntas, sem espaços.</li>
          <li><b>Servidor</b> ${cp("imap.gmail.com")} · <b>Porta</b> ${cp("993")} · <b>Conjunto de caracteres</b> ${cp("utf-8")} · <b>Pasta</b> ${cp("INBOX")}.</li>
          <li><b>Pesquisa IMAP:</b> ${A ? `deixe ${cp("UnSeen UnDeleted")}.` : `troque por ${cp(`UnSeen UnDeleted FROM "${remTxt}"`)}, para o Home Assistant olhar só os e-mails da loja.`}</li>
          <li>"Body text" e "Message headers": deixe desmarcados › <b>Enviar</b>.</li>
          <li>Volte a esta tela: a caixa aparece no último passo, para você escolher.</li></ul></li>`,
      ...(A ? [`<li><b>Autorize o encaminhamento</b> (no e-mail pessoal, pelo computador; o app do celular não tem essa opção)
          <ul><li>No Gmail pessoal: engrenagem ⚙ (canto superior direito) › <b>Ver todas as configurações</b> › aba <b>Encaminhamento e POP/IMAP</b>
            › <b>Adicionar um endereço de encaminhamento</b> › o endereço da caixa nova › Próxima › Prosseguir › OK.</li>
          <li>O Google manda um e-mail de confirmação para a caixa nova: entre nela e clique no link. Aparece "Confirmado: agora … pode encaminhar e-mails para …".</li>
          <li>De volta na aba Encaminhamento e POP/IMAP: deixe marcado <b>Desativar encaminhamento</b>. Se marcar "Encaminhar uma cópia dos e-mails recebidos",
            vai todo o seu e-mail. Quem encaminha é só o filtro do próximo passo. (Essa aba não mostra para onde encaminha; quem mostra é a aba Filtros.)</li></ul></li>`,
        `<li><b>Crie o filtro</b> (no mesmo e-mail pessoal)
          <ul><li>Na barra <b>Pesquisar e-mail</b>, clique no ícone de opções (à direita da barra).</li>
          <li><b>De:</b> ${cp(remTxt)} (sem vírgula no fim) · <b>Assunto:</b> ${cp('{"Recebemos seu pedido" "Confirmação de pagamento"}')}
            (com as chaves e as aspas: as chaves pegam qualquer um dos dois assuntos, e só eles). Os outros campos ficam em branco.</li>
          <li><b>Criar filtro</b> › marque <b>Encaminhar para</b> › escolha a caixa nova. Não marque mais nada (nem "Também aplicar filtro às conversas
            correspondentes": o Gmail não encaminha e-mails antigos pelo filtro) › <b>Criar filtro</b>.</li>
          <li>Confira na aba <b>Filtros e endereços bloqueados</b>: "Ações: Encaminhar para …". Cada pessoa com conta própria na loja faz estes dois últimos passos
            (encaminhamento e filtro) no e-mail dela, para a mesma caixa.</li></ul></li>`] : []),
      `<li><b>Escolha a caixa que o CoFinance lê</b>
          <ul><li>${doHa.length ? `Caixas de e-mail ligadas a este Home Assistant (integração IMAP). Toque na ${caixaTxt === "a caixa nova" ? "caixa nova" : "sua"}:`
            : "Nenhuma caixa ainda: termine o passo da integração IMAP e volte aqui."}</li>
          ${doHa.length ? `<li class="fpd-cxs">${doHa.map((e) => `<button class="btn${e.toLowerCase() === caixa ? " prim" : ""}" data-a="f-pd-caixa" data-k="${this._e(e)}">${e.toLowerCase() === caixa ? "✓ " : ""}${this._e(e)}</button>`).join("")}</li>` : ""}
          <li>Só a caixa escolhida é lida. Outras caixas de e-mail do Home Assistant ficam de fora.</li></ul></li>`,
      `<li><b>Cartões</b>
          <ul><li>Em ⚙ › Cartões, cada final com quem usa. Quem comprou sai daí; cartão que não estiver cadastrado vai para o sino perguntar se é de vocês.
            Pix, boleto e ShopeePay entram direto.</li></ul></li>`];
    return `<div class="fcard"><div class="fhd"><h2>Pedidos de lojas online</h2><small>${this._e(lojas)}</small></div><div class="form fpd-txt">
      <span class="fs">Com cupom, ou com várias lojas pagas juntas, a nota não diz o que saiu do bolso e a fatura traz uma cobrança só.
        Os e-mails do pedido resolvem: cada loja vira uma compra com o valor pago de verdade, a nota se encaixa nela e a fatura confere o total.</span>
      <span class="fl" style="margin-top:10px">Automático pelo e-mail</span>
      <div class="fpd-st${caixa ? " ok" : ""}">${caixa ? `✓ Lendo a caixa <b>${this._e(caixa)}</b> <small>(integração IMAP)</small> <button class="lnk" data-a="f-pd-caixa" data-k="">desligar</button>` : "Ainda não ligado: siga o passo a passo abaixo."}</div>
      <span class="fs">Chegou o e-mail da loja na caixa que o Home Assistant lê, a compra entra sozinha e avisa no celular. Quem comprou sai do cartão do e-mail (quem usa aquele final em ⚙ › Cartões);
        cartão que não está cadastrado vai para o sino perguntar se é de vocês.</span>
      <details class="fpd-como"${caixa && !ca ? "" : " open"}><summary>Como ligar o automático (passo a passo)</summary>
        <p class="fs">Primeiro, escolha a caixa que o Home Assistant vai ler; aí aparecem só os passos daquele caminho. Leva uns 10 minutos, uma vez só.
          Para copiar qualquer trecho: arraste o mouse (no celular, segure o dedo) e copie.</p>
        <div class="fpd-esc" role="group" aria-label="Qual caixa o Home Assistant vai ler">
          <button class="fpd-op${ca === "A" ? " on" : ""}" data-a="f-pd-caminho" data-k="A" aria-pressed="${ca === "A"}"><b>A · Um e-mail novo só para isso</b>
            <small>Recomendado. O seu e-mail pessoal encaminha só os e-mails da loja para ele, e o Home Assistant nunca enxerga a sua caixa pessoal.</small></button>
          <button class="fpd-op${ca === "B" ? " on" : ""}" data-a="f-pd-caminho" data-k="B" aria-pressed="${ca === "B"}"><b>B · O meu próprio e-mail</b>
            <small>Mais rápido, sem encaminhamento nem filtro. O Home Assistant fica ligado à sua caixa, mas olha só os e-mails da loja.</small></button>
        </div>
        ${ca ? `<ol class="fpd-passos">${passos.join("")}</ol>
        <p class="fs"><b>Como funciona:</b> "Recebemos seu pedido" traz os preços e espera; "Confirmação de pagamento" lança as compras e avisa no celular.
          Depois a nota e a fatura só conferem. <b>Para parar:</b> ${ca === "A" ? "no e-mail pessoal, aba Filtros e endereços bloqueados › excluir o filtro. O filtro só encaminha os e-mails que chegam depois de criado."
            : "apague a integração IMAP. Os e-mails da loja que o CoFinance já leu ficam marcados como lidos."}</p>` : ""}</details>
    </div></div>`;
  };

  // ⚙ › Trazer os pedidos antigos: envio, prévia, Trazer/Cancelar, Desfazer a última
  P._finPedidosImpHtml = function (c) {
    const imp = this._fPdImp || {}, ult = c.importacao;
    const dc = (d) => this._dataCurta(String(d).slice(0, 10) + "T12:00");
    if (imp.enviando) return `<div class="fpd-prev"><span class="fs">Enviando o arquivo… ${imp.enviando[0]} de ${imp.enviando[1]}</span></div>`;
    if (imp.gravando) return `<div class="fpd-prev"><span class="fs">Trazendo os pedidos…</span></div>`;
    if (imp.previa) {
      const r = imp.previa, s = r.situacoes || {}, sit = { pago: "pago", aguardando_pagamento: "aguardando a confirmação do pagamento", conferir_cartao: "cartão não cadastrado", pago_sem_detalhes: "falta o e-mail com os preços" };
      const itens = [
        `<li><b>${r.pedidos} ${r.pedidos === 1 ? "pedido" : "pedidos"}</b> · ${this._brl(r.total)} pagos${Object.entries(s).filter(([k]) => k !== "pago").map(([k, n]) => ` · ${n} ${sit[k] || k} (vai para o sino)`).join("")}</li>`,
        r.da_fatura ? `<li>${r.da_fatura} ${r.da_fatura === 1 ? "entra" : "entram"} no lugar de compras da loja que vieram da fatura (sem duplicar)</li>` : "",
        r.notas ? `<li>${r.notas} ${r.notas === 1 ? "nota já lançada entra" : "notas já lançadas entram"} nos pedidos (vão para o sino conferir)</li>` : "",
        r.antes_do_marco ? `<li>${r.antes_do_marco} e-mails de antes do início do controle: ficam de fora</li>` : "",
        r.ignorados ? `<li>${r.ignorados} e-mails que não são de pedido: ignorados</li>` : "",
        r.erros ? `<li>⚠ ${r.erros} e-mails não entendidos: ficam de fora</li>` : ""].join("");
      const lista = (r.lista || []).map((x) => `<li>${dc(x.data)} · ${this._e(x.loja)} · ${this._brl(x.total)} · ${x.lojas} ${x.lojas === 1 ? "loja" : "lojas"} · ${this._e(sit[x.situacao] || x.situacao)}${x.notas ? ` · ${x.notas} nota${x.notas > 1 ? "s" : ""}` : ""}${x.fatura ? " · fatura ✓" : ""}</li>`).join("");
      return `<div class="fpd-prev"><b>Prévia: o que vai acontecer</b><ul>${itens}</ul>
        ${lista ? `<details><summary>Ver os pedidos</summary><ul class="fpd-lista">${lista}</ul></details>` : ""}
        <div class="fpe">${r.pedidos ? `<button class="btn prim" data-a="f-pd-imp-ok">Trazer ${r.pedidos} ${r.pedidos === 1 ? "pedido" : "pedidos"}</button>` : `<span class="fs">Nada novo: esses pedidos já estão aqui.</span>`}
          <button class="btn" data-a="f-pd-imp-x">Cancelar</button></div></div>`;
    }
    return `${imp.msg ? `<div class="fs${imp.erro ? " ferro" : ""}">${this._e(imp.msg)}</div>` : ""}
      <div class="fimp"><label class="btn escolher fag-esc">📦 Enviar o arquivo do Takeout (.zip)<input id="pd-imp" type="file" accept=".zip,.mbox,application/zip"></label></div>
      ${ult ? `<div class="fs">Última importação: ${this._dataCurta(ult.em)} · ${ult.pedidos} ${ult.pedidos === 1 ? "pedido" : "pedidos"}${ult.pode_desfazer ? ` · <button class="lnk" data-a="f-pd-imp-desfazer" data-k="${this._e(ult.id)}">Desfazer a importação</button>` : ""}</div>` : ""}`;
  };

  P._finPedidosImportar = async function (files) {
    const f = [...(files || [])][0];
    if (!f) return;
    try {
      const by = new Uint8Array(await f.arrayBuffer());
      let bin = "";
      for (let i = 0; i < by.length; i += 0x8000) bin += String.fromCharCode(...by.subarray(i, i + 0x8000));
      const partes = btoa(bin).match(/[\s\S]{1,30000}/g) || [""], envio = `imp${Date.now()}`;
      let r = null;
      for (let n = 1; n <= partes.length; n++) {
        this._fPdImp = { enviando: [n, partes.length] }; this._render();
        r = await this._api({ acao: "pedaco", para: "importar", arquivo: envio, envio, n, total: partes.length, dados: partes[n - 1] });
      }
      this._fPdImp = r?.status === "importar_previa" ? { previa: r.resumo, arquivo: r.arquivo || envio } : { msg: r?.mensagem || "Não consegui ler o arquivo.", erro: true };
    } catch (e) { this._fPdImp = { msg: e.message || String(e), erro: true }; }
    this._render();
  };

  P._finPedidoPdf = async function (files) {
    const pdfs = [...(files || [])].filter((f) => /\.pdf$/i.test(f.name) || f.type === "application/pdf");
    if (!pdfs.length) { this._fPdLog = [{ txt: "Nenhum PDF nessa escolha.", erro: true }]; return this._render(); }
    const log = [];
    this._fPdLendo = true; this._render();
    for (const f of pdfs) {
      try {
        const by = new TextEncoder().encode(JSON.stringify(await this._finPdfLinhas(f)));
        let bin = "";
        for (let i = 0; i < by.length; i += 0x8000) bin += String.fromCharCode(...by.subarray(i, i + 0x8000));
        const b64 = btoa(bin), partes = b64.match(/[\s\S]{1,30000}/g) || [""];
        let r = null;
        if (partes.length === 1) r = await this._api({ acao: "pedido_email", via: "pdf", linhas: b64 });
        else {
          const envio = `pedido${Date.now()}`;
          for (let p = 1; p <= partes.length; p++) r = await this._api({ acao: "pedaco", para: "pedido", envio, n: p, total: partes.length, dados: partes[p - 1] });
        }
        log.push({ txt: r?.mensagem || `${f.name}: lido.` });
      } catch (e) { log.push({ txt: `${f.name}: ${e.message || e}`, erro: true }); }
    }
    this._fPdLendo = false; this._fPdLog = log;
    await this._carregar(true);  // as compras do pedido e o sino (notas que entraram no pedido)
    this._render();
  };

  // ⚙ Veículos: o carro (o final da placa escrito na nota da oficina liga a compra a ele; chassi e placa inteira não ficam)
  P._finBensCfg = function () {
    const bs = this._dados?.bens || [], ed = this._fBemEd;
    const lista = bs.map((b) => `<button class="fcart${ed === b.id ? " on" : ""}" data-a="f-bem-ed" data-k="${this._e(b.id)}">🚗 <b>${this._e(b.nome)}</b>${(b.placa_final || []).length ? ` · placa final ${this._e(b.placa_final.join(", "))}` : ""} ✎</button>`).join("")
      + `<button class="fcart novo${ed === "novo" ? " on" : ""}" data-a="f-bem-ed" data-k="novo">+ Novo veículo</button>`;
    const b = ed === "novo" ? { nome: "", placa_final: [] } : bs.find((x) => x.id === ed);
    const form = b ? `<div class="form fcartform"><label>Nome<input id="kb-nome" type="text" maxlength="40" placeholder="ex.: Meu carro" value="${this._e(b.nome)}" autocomplete="off"></label>
      <label>Final da placa <small>(só os 3 últimos; antiga e Mercosul separadas por vírgula, ex.: 234, D23)</small><input id="kb-placas" type="text" value="${this._e((b.placa_final || []).join(", "))}" placeholder="D23" autocomplete="off"></label>
      <div class="fpe"><button class="btn prim" data-a="f-bem-salvar">Salvar</button><button class="btn" data-a="f-bem-ed" data-k="${this._e(ed)}">Cancelar</button>
        ${ed !== "novo" ? (this._fBemApagar ? `<span class="fs">Apagar ${this._e(b.nome)}?</span><button class="btn perigo" data-a="f-bem-apagar">Apagar</button>` : `<button class="lnk perigo" data-a="f-bem-apagar">Apagar</button>`) : ""}</div></div>` : "";
    return `<div class="fcard"><div class="fhd"><h2>Veículos</h2><small>as compras do carro ficam juntas</small></div><div class="fcarts">${lista}</div>${form}
      <div class="fs" style="margin-top:8px">Uma placa terminada nesse final, escrita na nota da oficina, liga a compra ao carro; pneu, óleo e revisão também. Chassi e placa inteira não ficam guardados.</div></div>`;
  };

  // contas da casa (Configurações): luz e água vêm de fora (só nome e de quem); mensais sem boleto e carnês, completos
  P._finContasCfg = function () {
    const cc = this._fFin?.contas_casa || {}, ed = this._fCcEd, mes = (m) => m ? `${m.slice(5, 7)}/${m.slice(0, 4)}` : "";
    const bt = (k, html) => `<button class="fcart${ed === k ? " on" : ""}" data-a="f-cc-ed" data-k="${this._e(k)}">${html} ✎</button>`;
    const de = (x) => x.quem ? ` · ${this._e(x.quem)}` : "";
    const lista = [
      cc.luz ? bt("luz", `${this._e(cc.luz.icone || "⚡")} <b>${this._e(cc.luz.nome)}</b> · ${cc.luz.fonte === "pdf" ? "contas em PDF" : cc.luz.fonte === "manual" ? "digitada todo mês" : "do painel de energia"}${de(cc.luz)}`)
        : `<button class="fcart novo${ed === "luz" ? " on" : ""}" data-a="f-cc-ed" data-k="luz">+ Luz</button>`,
      cc.agua ? bt("agua", `${this._e(cc.agua.icone || "💧")} <b>${this._e(cc.agua.nome)}</b> · ${cc.agua.fonte === "manual" ? "digitada todo mês" : "contas em PDF da Saneago"}${de(cc.agua)}`)
        : `<button class="fcart novo${ed === "agua" ? " on" : ""}" data-a="f-cc-ed" data-k="agua">+ Água</button>`,
      ...(cc.recorrentes || []).map((x) => bt(`recorrente:${x.id}`, `${this._e(x.icone || "🏠")} <b>${this._e(x.nome)}</b> · todo dia ${x.dia} · ${this._brl(x.valor)}${x.ate ? ` · até ${mes(x.ate)}` : ""}${de(x)}`)),
      ...(cc.parceladas || []).map((x) => bt(`parcelada:${x.id}`, `${this._e(x.icone || "🏠")} <b>${this._e(x.nome)}</b> · ${x.vencimentos.length}x ${this._brl(x.valor)}${de(x)}`)),
      `<button class="fcart novo${ed === "recorrente:novo" ? " on" : ""}" data-a="f-cc-ed" data-k="recorrente:novo">+ Conta mensal sem boleto</button>`,
      `<button class="fcart novo${ed === "parcelada:novo" ? " on" : ""}" data-a="f-cc-ed" data-k="parcelada:novo">+ Carnê com datas</button>`,
    ].join("");
    return `<div class="fcard"><div class="fhd"><h2>Contas da casa</h2><small>aparecem em A pagar</small></div><div class="fcarts">${lista}</div>${this._finFormConta()}
      ${cc.agua || cc.luz ? `<div class="fimp">${this._finImportarConta("agua")}${this._finImportarConta("luz")}</div>` : ""}
      <div class="fs" style="margin-top:8px">Mensal: o CoFinance cria uma conta por mês. Carnê: uma por data. Mudar o valor vale para o que ainda não foi pago.</div></div>`;
  };

  P._finImportarConta = function (tipo) {
    const cc = this._fFin?.contas_casa || {};
    if (tipo === "agua" && cc.agua) return `<button class="btn" data-a="f-agua">💧 ${cc.agua.fonte === "manual" ? "Digitar a conta de água" : "Ler contas de água (PDF)"}</button>`;
    if (tipo === "luz" && cc.luz) return cc.luz.fonte === "pdf" ? `<button class="btn" data-a="f-luz">⚡ Ler contas de luz (PDF)</button>`
      : cc.luz.fonte === "manual" ? `<button class="btn" data-a="f-luz">⚡ Digitar a conta de luz</button>`
      : this._fFin?.painel_energia ? `<button class="btn" data-a="f-energia">⚡ Abrir o painel de energia</button>` : "";
    return "";
  };

  P._finFormConta = function () {
    const ed = this._fCcEd;
    if (!ed) return "";
    const cc = this._fFin?.contas_casa || {}, [tipo, id] = ed.split(":"), pessoas = this._dados?.compradores || [];
    if (!pessoas.length) return `<div class="form fcartform"><div class="fs">Cadastre primeiro quem mora na casa (em Pessoas): toda conta é de alguém.</div></div>`;
    const x = tipo === "luz" || tipo === "agua" ? cc[tipo] || { nome: tipo === "luz" ? "Luz" : "Água", quem: pessoas[0], fonte: "pdf" } : id === "novo"
      ? { nome: "", icone: tipo === "parcelada" ? "🏛️" : "🌐", quem: pessoas[0], dia: "", valor: "", valor_depois: "", desde: this._mesDe(new Date()), vencimentos: [] }
      : (cc[tipo + "s"] || []).find((y) => y.id === id);
    if (!x) return "";
    const op = (l, a) => l.map((v) => `<option ${v === a ? "selected" : ""}>${this._e(v)}</option>`).join("");
    const num = (v) => v === "" || v == null ? "" : Number(v).toFixed(2).replace(".", ",");
    const fora = tipo === "luz" || tipo === "agua";
    let f = `<div class="duas" style="grid-template-columns:minmax(0,1fr) ${fora ? "" : "5.5em"}"><label>Nome<input id="kk-nome" type="text" maxlength="30" value="${this._e(x.nome)}" autocomplete="off"></label>
        ${fora ? "" : `<label>Ícone<select id="kk-ic">${op(F_ICONES_CONTA, x.icone)}</select></label>`}</div>
      <label>De quem<select id="kk-quem">${op(pessoas, x.quem)}</select></label>`;
    if (tipo === "luz") {  // o painel só aparece quando o Co-Energy existe; a unidade vem da lista dele
      const pe = this._fFin?.painel_energia;
      f += `<label>De onde vem<select id="kk-fonte">${pe ? `<option value="painel">Painel de energia (Co-Energy)</option>` : ""}<option value="pdf" ${x.fonte === "pdf" ? "selected" : ""}>Conta em PDF (Equatorial Goiás, CPFL, Neoenergia)</option><option value="manual" ${x.fonte === "manual" ? "selected" : ""}>Outra distribuidora (digito o valor todo mês)</option></select></label>
        ${pe ? `<label>Unidade no painel de energia <small>(só com o painel)</small><select id="kk-uni"><option value="">—</option>${(pe.unidades || []).map((u) => `<option value="${this._e(u.id)}" ${x.unidade === u.id ? "selected" : ""}>${this._e(u.nome)}</option>`).join("")}</select></label>` : ""}
        <div class="fs">${pe ? "Painel: valor e vencimento vêm do Co-Energy. " : ""}PDF: o CoFinance lê as contas e fica só com valor, vencimento, consumo e leituras (sem nome, CPF ou endereço). Outra: vocês digitam o valor e o vencimento de cada mês.</div>`;
    }
    if (tipo === "agua") f += `<label>Companhia<select id="kk-fonte"><option value="saneago">Saneago (o CoFinance lê o PDF)</option><option value="manual" ${x.fonte === "manual" ? "selected" : ""}>Outra (digito o valor todo mês)</option></select></label>
      <div class="fs">Saneago: o CoFinance lê as contas em PDF. Outra companhia: vocês digitam o valor e o vencimento de cada mês (Sabesp, Copasa, Caesb… ganham leitor quando alguém mandar uma conta).</div>`;
    if (fora && cc[tipo] && this._finImportarConta(tipo)) f += `<div class="fimp">${this._finImportarConta(tipo)}<span class="fs">${cc[tipo].fonte === "manual" ? "Digite o valor e o vencimento de cada mês." : tipo === "luz" && cc.luz.fonte !== "pdf" ? "Valor e consumo vêm de lá." : "Escolha a pasta ou os PDFs: só as contas novas são lidas."}</span></div>`;
    if (tipo === "recorrente") f += `<div class="duas" style="grid-template-columns:5em minmax(0,1fr) minmax(0,1fr)"><label>Vence dia<input id="kk-dia" type="number" inputmode="numeric" min="1" max="31" value="${x.dia ?? ""}"></label>
        <label>Valor<input id="kk-val" type="text" inputmode="decimal" value="${num(x.valor)}"></label>
        <label>Depois do vencimento <small>(se muda)</small><input id="kk-dep" type="text" inputmode="decimal" value="${x.valor_depois !== x.valor ? num(x.valor_depois) : ""}"></label></div>
      <div class="duas fkk-mes" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)"><label>Desde<input id="kk-desde" type="month" value="${this._e(x.desde || "")}"></label>
        <label>Até <small>(vazio: sem fim)</small><input id="kk-ate" type="month" value="${this._e(x.ate || "")}"></label></div>`;
    if (tipo === "parcelada") f += `<label>Valor de cada parcela<input id="kk-val" type="text" inputmode="decimal" value="${num(x.valor)}"></label>
      <label>Vencimentos <small>(um por linha: 20/02/2026)</small><textarea id="kk-venc" rows="${Math.max(3, (x.vencimentos || []).length)}">${this._e((x.vencimentos || []).map((d) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`).join("\n"))}</textarea></label>`;
    const apagar = id === "novo" || (fora && !cc[tipo]) ? "" : this._fCcApagar ? `<span class="fs">Tirar ${this._e(x.nome)}?</span><button class="btn perigo" data-a="f-cc-apagar">Tirar</button>` : `<button class="lnk perigo" data-a="f-cc-apagar">Tirar das contas</button>`;
    return `<div class="form fcartform">${f}<div class="fpe"><button class="btn prim" data-a="f-cc-salvar">Salvar</button><button class="btn" data-a="f-cc-ed" data-k="${this._e(ed)}">Cancelar</button>${apagar}</div></div>`;
  };

  P._finSalvarConta = async function (apagar) {
    const g = (i) => this.shadowRoot.getElementById(i)?.value, [tipo, id] = this._fCcEd.split(":");
    const p = { acao: "conta_casa", tipo, id: id && id !== "novo" ? id : null, apagar: !!apagar };
    if (!apagar) Object.assign(p, { nome: g("kk-nome") || "", quem: g("kk-quem"), icone: g("kk-ic"), unidade: g("kk-uni"), fonte: g("kk-fonte"), dia: g("kk-dia"), valor: g("kk-val"),
      valor_depois: g("kk-dep"), desde: g("kk-desde"), ate: g("kk-ate"), vencimentos: g("kk-venc") });
    try {
      const r = await this._api(p);
      this._aviso = r.mensagem;
      this._fCcEd = null; this._fCcApagar = false;
      this._fFin = await this._api({ acao: "financeiro" });
      this._fLinhasDe = null;
    } catch (e) { this._aviso = "⚠ " + (e.message || e); }
    this._render();
  };

  // cadastro de pessoas (Configurações): cor, apelidos do Atalho, reembolso e à/ao (o vale é cartão: fica em Cartões)
  P._finPessoas = function () {
    const ps = this._dados?.pessoas || [], ed = this._fPesEd;
    const lista = ps.map((x) => `<button class="fcart${ed === x.nome ? " on" : ""}" data-a="f-pes-ed" data-k="${this._e(x.nome)}"><i class="fpes" style="background:${x.cor}" aria-hidden="true"></i> <b>${this._e(x.nome)}</b>${x.aviso?.celular ? " 📱" : ""}${x.reembolso ? " · paga do próprio bolso" : ""} ✎</button>`).join("")
      + `<button class="fcart novo${ed === "novo" ? " on" : ""}" data-a="f-pes-ed" data-k="novo">+ Nova pessoa</button>`;
    return `<div class="fcard"><div class="fhd"><h2>Pessoas</h2><small>quem compra</small></div><div class="fcarts">${lista}</div>${this._finFormPessoa()}
      <div class="fs" style="margin-top:8px">A cor aparece nas compras e nos filtros. O nome não muda depois de criado (as compras guardam o nome).</div></div>`;
  };

  P._finFormPessoa = function () {
    const id = this._fPesEd, ps = this._dados?.pessoas || [];
    if (!id) return "";
    const novo = id === "novo", x = novo ? { nome: "", cor: F_PALETA[ps.length % F_PALETA.length], apelidos: [], reembolso: false, artigo: "" } : ps.find((y) => y.nome === id);
    if (!x) return "";
    const sem = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    const apel = (x.apelidos || []).filter((a) => a !== sem(x.nome)).map((a) => a.charAt(0) + a.slice(1).toLowerCase()).join(", ");
    return `<div class="form fcartform">
      <div class="duas" style="grid-template-columns:minmax(0,1fr) 5.5em"><label>Nome${novo ? "" : " <small>(não muda)</small>"}<input id="kp-nome" type="text" maxlength="20" value="${this._e(x.nome)}" ${novo ? "" : "readonly"} autocomplete="off"></label>
        <label>Cor<input id="kp-cor" type="color" value="${this._e(x.cor || "#888888")}"></label></div>
      <label>Outros jeitos de vir no Atalho do telefone <small>(uma palavra cada, separadas por vírgula; ex.: Ana, Aninha)</small><input id="kp-apel" type="text" value="${this._e(apel)}" autocomplete="off"></label>
      <label>Nos avisos<select id="kp-art"><option value="o" ${x.artigo === "o" ? "selected" : ""}>Devemos ao ${this._e(x.nome || "…")}</option><option value="a" ${x.artigo === "a" ? "selected" : ""}>Devemos à ${this._e(x.nome || "…")}</option></select></label>
      <label>Compras desta pessoa entram como<select id="kp-reemb"><option value="" ${x.reembolso ? "" : "selected"}>Normais</option><option value="1" ${x.reembolso ? "selected" : ""}>A reembolsar</option></select>
        <small class="fs">A reembolsar: a pessoa paga do próprio bolso e vocês devolvem. Toda compra dela já entra assim e vai para "Devemos" no sino. Uma compra que não é: Editar › desmarque "A reembolsar".</small></label>
      ${this._finPesAvisos(x)}
      <div class="fpe"><button class="btn prim" data-a="f-pes-salvar">Salvar</button><button class="btn" data-a="f-pes-ed" data-k="${this._e(id)}">Cancelar</button>
        ${novo ? "" : this._fPesApagar ? `<span class="fs">Apagar ${this._e(x.nome)}?</span><button class="btn perigo" data-a="f-pes-apagar">Apagar</button>` : `<button class="lnk perigo" data-a="f-pes-apagar">Apagar</button>`}</div></div>`;
  };

  // avisos no celular da pessoa: o celular vem da lista que o HA conhece (o app do Home Assistant instalado e logado)
  const F_AV_COMPRAS = [["todas", "Todas as compras (quem cuida das finanças)"], ["novas_e_minhas", "As compras novas e as minhas"], ["minhas", "Só as minhas"], ["nenhuma", "Nenhuma"]];
  P._finPesAvisos = function (x) {
    const a = { celular: "", compras: "nenhuma", applepay: false, contas: false, ...(x.aviso || {}) };
    const cels = Object.keys(this.hass?.services?.notify || {}).filter((s) => s.startsWith("mobile_app_")).map((s) => `notify.${s}`);
    if (a.celular && !cels.includes(a.celular)) cels.push(a.celular);
    const nome = (s) => s.replace(/^notify\.mobile_app_/, "").replace(/_/g, " ");
    return `<fieldset class="fkc-sec2"><legend>Avisos no telefone</legend>
      <label>Celular <small>(o app do Home Assistant instalado nele)</small><select id="kp-cel"><option value="">— sem celular (não recebe avisos) —</option>${cels.map((c) => `<option value="${this._e(c)}" ${a.celular === c ? "selected" : ""}>${this._e(nome(c))}</option>`).join("")}</select></label>
      <label>Compras que recebe<select id="kp-comp">${F_AV_COMPRAS.map(([v, t]) => `<option value="${v}" ${a.compras === v ? "selected" : ""}>${t}</option>`).join("")}</select></label>
      <label class="chk"><input type="checkbox" id="kp-ap" ${a.applepay ? "checked" : ""}> Pagamento pelo telefone: pergunta "Lançar sem cupom?" quando pagar</label>
      <details class="fkc-mais"><summary>Como ligar no telefone</summary><span class="fs"><b>iPhone:</b> no app Atalhos › Automação › Nova automação › <b>Transação</b>
        (Carteira) › escolha os cartões › ação que manda valor, comerciante e cartão para o endereço do Atalho do telefone.<br>
        <b>Android:</b> no app do Home Assistant › Configurações › Companion app › Gerenciar sensores › <b>Última notificação</b> › ligar, e em
        "Permitir lista" marque o app que avisa o pagamento: Google Wallet, Samsung Wallet ou o app do banco. O CoFinance lê o aviso
        ("Compra de R$ 45,90 em …") e pergunta "Lançar sem cupom?".</span></details></label>
      <label class="chk"><input type="checkbox" id="kp-ct" ${a.contas ? "checked" : ""}> Lembretes de contas e faturas (com ✓ Paguei)</label>
      ${cels.length ? "" : `<span class="fs">Nenhum celular na lista: instale o app do Home Assistant no celular e entre com a sua conta.</span>`}</fieldset>`;
  };

  // copiar um texto: o jeito moderno só funciona em https; em http:// (rede local, Tailscale) copia por um campo escondido
  P._finCopiar = function (txt) {
    const ta = document.createElement("textarea");
    ta.value = txt; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px";
    document.body.appendChild(ta);
    ta.focus(); ta.select(); ta.setSelectionRange(0, txt.length);
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (_) { /* navegador sem o comando */ }
    ta.remove();
    if (!ok && navigator.clipboard?.writeText && window.isSecureContext) { navigator.clipboard.writeText(txt).catch(() => {}); ok = true; }
    return ok;
  };

  // salvar uma seção do ⚙ (avisos, atalho, bens) e recarregar a lista
  P._finSalvarCfg = async function (p, depois) {
    try {
      const r = await this._api(p);
      this._aviso = r.mensagem;
      if (depois) depois();
      await this._carregar(true);
    } catch (e) { this._aviso = "⚠ " + (e.message || e); }
    this._render();
  };

  P._finSalvarPessoa = async function (apagar) {
    const g = (i) => this.shadowRoot.getElementById(i), novo = this._fPesEd === "novo";
    const p = apagar ? { acao: "pessoa", nome: this._fPesEd, apagar: true } : {
      acao: "pessoa", novo, nome: novo ? g("kp-nome")?.value || "" : this._fPesEd, cor: g("kp-cor")?.value, apelidos: g("kp-apel")?.value || "",
      artigo: g("kp-art")?.value || "", reembolso: !!g("kp-reemb")?.value,
      aviso: { celular: g("kp-cel")?.value || "", compras: g("kp-comp")?.value || "nenhuma", applepay: !!g("kp-ap")?.checked, contas: !!g("kp-ct")?.checked } };
    try {
      const r = await this._api(p);
      this._aviso = r.mensagem;
      this._fPesEd = null; this._fPesApagar = false;
      await this._carregar(true);
    } catch (e) { this._aviso = "⚠ " + (e.message || e); }
    this._render();
  };

  // cartão › banco (lista) e modelo: escolhido o banco, os modelos dele aparecem em miniatura (o mesmo desenho da tela)
  P._finKcBancoSel = function () {
    const b = this._fKcBanco || "";
    const op = (benef) => Object.entries(F_EMISSORES).filter(([v]) => F_EMISSORES_BENEF.includes(v) === benef).sort((x, y) => x[1][0].localeCompare(y[1][0]))
      .map(([v, e]) => `<option value="${v}" ${b === v ? "selected" : ""}>${this._e(e[0])}</option>`).join("");
    return `<label>Instituição <small>(banco ou empresa do benefício)</small><select id="kc-emissor"><option value="">—</option><optgroup label="Bancos">${op(false)}</optgroup>
      <optgroup label="Benefício (refeição, alimentação)">${op(true)}</optgroup></select></label>`;
  };
  P._finKcMods = function () {
    const b = this._fKcBanco || "", m = this._fKcModelo || "";
    const campo = `<input type="hidden" id="kc-modelo" value="${this._e(m)}">`;
    if (!b) return campo;
    const band = this.shadowRoot?.getElementById("kc-band")?.value || this._fKcK?.bandeira || "Visa";
    // só os modelos da bandeira escolhida (os sem bandeira conhecida aparecem sempre); no crédito, sem os de débito e pré-pago;
    // no débito ou pré-pago, os dessa função primeiro
    const tipo = this.shadowRoot?.getElementById("kc-tipo")?.value || (this._fKcK ? this._finKcFuncao(this._fKcK) : "credito");
    // só os modelos prontos (desenho próprio ou foto fiel do cartão); o já escolhido continua aparecendo
    const pronto = (mid) => mid === m || !this._finModeloPronto || this._finModeloPronto(mid);
    const doBanco = Object.entries(F_MODELOS).filter(([mid, [mb]]) => mb === b && pronto(mid)).map(([mid, [, mn]]) => [mid, mn]);
    const daBand = (mid) => { const bm = F_MODELO_BAND[mid]; return !bm || (Array.isArray(bm) ? bm.includes(band) : bm === band); };
    const serve = ([mid]) => mid === m || (daBand(mid) && !(tipo === "credito" && F_MODELO_FUNC[mid]));
    const filtrados = doBanco.filter(serve), primeiro = ([mid]) => (F_MODELO_FUNC[mid] && F_MODELO_FUNC[mid] === tipo ? 0 : 1);
    const modelos = (filtrados.length ? filtrados : doBanco).sort((x, y) => primeiro(x) - primeiro(y));
    // "Padrão do banco" (o desenho genérico) só quando o banco ainda não tem cartão pronto, ou se é o que o cartão já usa
    const jaUsa = !m && this._fKcDe && this._fKcDe !== "novo";  // cartão já cadastrado sem modelo
    const lista = [...(!modelos.length || jaUsa ? [["", "Padrão do banco"]] : []), ...modelos];
    const face = (mid) => this._finCartaoFace ? this._finCartaoFace({ id: `kcm-${mid || b}`, emissor: b, modelo: mid, bandeira: band, categoria: "", visual: { produto: "" } }, null) : "";
    return `<span class="fl">Modelo <small>(o desenho do cartão)</small></span><div class="fkm-l" role="radiogroup" aria-label="Modelo do cartão">${lista.map(([mid, mn]) => `
      <button type="button" class="fkm${mid === m ? " on" : ""}" data-a="f-kc-mod" data-k="${mid}" role="radio" aria-checked="${mid === m}">
        <span class="fkm-f">${face(mid)}</span><small>${mid === m ? "✓ " : ""}${this._e(mn)}</small></button>`).join("")}</div>${campo}`;
  };

  // pedaço redesenhado sem redesenhar a tela: os botões novos precisam ganhar o toque (senão ficam mortos)
  P._finTrocar = function (box, html) {
    if (!box) return;
    box.innerHTML = html;
    box.querySelectorAll("[data-a]").forEach((el) => el.addEventListener("click", (ev) => this._clique(ev, el)));
  };

  P._finModelosIds = function () { return Object.keys(F_MODELOS); };
  P._finTemFundo = function (id) { return F_MODELO_FUNDO.has(id) || F_MODELO_FOTO.has(id); };  // logos/cartoes/<id>.svg
  P._finEhFoto = function (id) { return F_MODELO_FOTO.has(id); };  // o cartão inteiro (logo, chip, bandeira) vem no desenho
  P._finModeloId = fModeloId;
  P._finModelo = function (id) { id = fModeloId(id); return id && F_MODELOS[id] ? { banco: F_MODELOS[id][0], nome: F_MODELOS[id][1], rotulo: F_MODELO_ROT[id] || "" } : null; };

  P._finKcFuncao = function (k) { return k.vale ? "beneficio" : k.prepago ? "prepago" : k.credito === false ? "debito" : k.debito ? "ambos" : "credito"; };

  // categoria: só as da bandeira; as que o banco tem (pelos modelos dele) primeiro. Benefício não tem
  P._finKcCat = function (inicial) {
    const k0 = this._fKcK || {}, g = (id) => (inicial ? null : this.shadowRoot?.getElementById(id));
    const tipo = g("kc-tipo")?.value ?? this._finKcFuncao(k0);
    if (tipo === "beneficio") return "";
    const band = g("kc-band")?.value ?? k0.bandeira, atual = g("kc-cat") ? g("kc-cat").value : k0.categoria || "", b = this._fKcBanco || "";
    const lista = F_CATEGORIAS[band] || F_CATEGORIAS[""];
    const doBanco = new Set(Object.entries(F_MODELOS).filter(([, [mb]]) => mb === b).map(([mid, [, mn]]) => {
      const m = `${mn} ${F_MODELO_ROT[mid] || ""}`.match(F_CAT_RE); return m ? m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase() : ""; }));
    const deles = lista.filter((v) => doBanco.has(v)), outras = lista.filter((v) => !doBanco.has(v)), extra = atual && !lista.includes(atual) ? [atual] : [];
    const auto = this._finCategoria({ ...k0, bandeira: band, modelo: this._fKcModelo || "", categoria: "", vale: false,
      visual: { produto: g("kc-prod") ? g("kc-prod").value : k0.visual?.produto || "" } });
    const op = (l) => l.map((v) => `<option ${v === atual ? "selected" : ""}>${this._e(v)}</option>`).join("");
    const nb = F_EMISSORES[b]?.[0];
    return `Categoria <small>(${this._e(band && band !== "Outra" && band !== "Sem bandeira" ? `as do ${band}` : "Gold, Black…")})</small><select id="kc-cat">
      <option value="">${this._e(auto ? `automática (${auto})` : "—")}</option>
      ${deles.length && outras.length ? `<optgroup label="${this._e(`No ${nb}`)}">${op(deles)}</optgroup><optgroup label="${this._e(`Outras do ${band || "cartão"}`)}">${op(outras)}</optgroup>` : op(lista)}${op(extra)}</select>`;
  };

  P._finKcPrevia = function (inicial) {
    const k0 = this._fKcK || {}, g = (id) => (inicial ? null : this.shadowRoot?.getElementById(id));
    const tipo = g("kc-tipo")?.value ?? this._finKcFuncao(k0);
    const kk = { ...k0, id: "kc-previa", emissor: this._fKcBanco || "", banco: "", modelo: this._fKcModelo || "",
      bandeira: g("kc-band")?.value ?? k0.bandeira, categoria: g("kc-cat") ? g("kc-cat").value : k0.categoria || "",
      apelido: g("kc-apelido") ? g("kc-apelido").value : k0.apelido || "",
      visual: { ...(k0.visual || {}), produto: g("kc-prod") ? g("kc-prod").value : k0.visual?.produto || "" },
      vale: tipo === "beneficio", prepago: tipo === "prepago", credito: tipo === "credito" || tipo === "ambos", debito: tipo === "ambos" || tipo === "debito" || tipo === "prepago",
      beneficio_de: g("kc-benef")?.value ?? k0.beneficio_de };
    return this._finCartaoFace ? this._finCartaoFace(kk, null) : "";
  };

  // as bandeiras que o banco emite (pelos modelos dele), da mais comum à menos
  P._finBandeirasDoBanco = function (b) {
    const n = {};
    for (const [mid, [mb]] of Object.entries(F_MODELOS)) if (mb === b && (!this._finModeloPronto || this._finModeloPronto(mid))) for (const x of [].concat(F_MODELO_BAND[mid] || [])) n[x] = (n[x] || 0) + 1;
    return Object.keys(n).sort((x, y) => n[y] - n[x]);
  };
  P._finKcBandeiraOps = function (vale, atual) {
    const l = F_BANDEIRAS, v = l.includes(atual) ? atual : vale ? "Sem bandeira" : l[0], b = this._fKcBanco || "";
    const deles = this._finBandeirasDoBanco(b).filter((x) => l.includes(x)), outras = l.filter((x) => !deles.includes(x));
    const op = (xs) => xs.map((x) => `<option ${x === v ? "selected" : ""}>${this._e(x)}</option>`).join("");
    return deles.length ? `<optgroup label="${this._e(`No ${F_EMISSORES[b]?.[0] || "banco"}`)}">${op(deles)}</optgroup><optgroup label="Outras">${op(outras)}</optgroup>` : op(l);
  };
  P._finKcBandeira = function (vale, atual) {
    return `Bandeira<select id="kc-band">${this._finKcBandeiraOps(vale, atual)}</select>`;
  };

  // cadastro de cartões (aba A pagar › Cartões): toque no cartão abre o formulário aqui mesmo
  P._finFormCartao = function () {
    const F = this._fFin, id = this._fCartEd;
    if (!id || !F) return "";
    const eu = (this._dados?.compradores || [])[0] || "";
    const k = id === "novo" ? { nome: "", bandeira: "Visa", dono: eu, usam: [eu], fecha: "", vence: "", debito: false, ativo: true, no_fechamento: "proxima" }
      : (F.cartoes || []).find((x) => x.id === id);
    if (!k) return "";
    const pessoas = this._dados?.compradores || [];
    const op = (l, a) => l.map((v) => `<option ${v === a ? "selected" : ""}>${this._e(v)}</option>`).join("");
    if (this._fKcDe !== id) { this._fKcDe = id; this._fKcBanco = k.emissor || k.banco || ""; this._fKcModelo = k.modelo || ""; this._fKcBand = null; this._fKcTipo = null; }
    this._fKcK = k;
    return `<div class="form fcartform">
      <div class="fs fkc-sec">O cartão</div>
      <div class="fkc-prev"><div id="kc-prev">${this._finKcPrevia(true)}</div><small>Assim vai ficar o cartão</small></div>
      ${this._finKcBancoSel()}<div id="kc-mods">${this._finKcMods()}</div>
      <label>Nome no cartão <small>(o modelo escrito nele: Prime, Unique, Ourocard, Latam Pass…)</small><input id="kc-prod" type="text" maxlength="24" value="${this._e(k.visual?.produto || "")}" autocomplete="off"></label>
      <div class="duas" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)"><label id="kc-band-l">${this._finKcBandeira(k.vale, this._fKcBand || k.bandeira)}</label>
        <label id="kc-cat-l"${k.vale ? ' style="display:none"' : ""}>${this._finKcCat(true)}</label></div>
      <div class="duas" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)"><label>Função<select id="kc-tipo">${F_FUNCOES.map(([v, n]) => `<option value="${v}" ${(this._fKcTipo || this._finKcFuncao(k)) === v ? "selected" : ""}>${n}</option>`).join("")}</select></label>
        <label id="kc-benef-l"${k.vale ? "" : ' style="display:none"'}>Saldo de<select id="kc-benef">${Object.entries(F_BENEFICIOS).map(([v, n]) => `<option value="${v}" ${(k.beneficio_de || "ambos") === v ? "selected" : ""}>${n}</option>`).join("")}</select></label></div>
      <div class="fs fkc-sec">De quem e quando vence</div>
      <label>Titular<select id="kc-dono">${op(pessoas, k.dono)}</select></label>
      <div><div class="fs">Quem usa (adicional entra na mesma fatura)</div><div class="fkc-usam">${pessoas.map((p) => `<label class="chk"><input type="checkbox" data-kc-usa="${this._e(p)}" ${(k.usam || []).includes(p) ? "checked" : ""}> ${this._e(p)}</label>`).join("")}</div></div>
      <div class="duas" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)"><label>Fecha no dia <small>(crédito)</small><input id="kc-fecha" type="number" inputmode="numeric" min="1" max="31" value="${k.fecha ?? ""}"></label>
        <label>Vence no dia <small>(crédito)</small><input id="kc-vence" type="number" inputmode="numeric" min="1" max="31" value="${k.vence ?? ""}"></label></div>
      <label>Compra feita no dia do fechamento<select id="kc-nf"><option value="proxima" ${k.no_fechamento !== "atual" ? "selected" : ""}>vai para a próxima fatura</option><option value="atual" ${k.no_fechamento === "atual" ? "selected" : ""}>entra na fatura que fecha</option></select></label>
      <label class="chk"><input type="checkbox" id="kc-ler" ${k.banco ? "checked" : ""}> Ler a fatura deste cartão em PDF <small>(Santander, BB, Bradesco, Itaú, BRB, BTG, Caixa, Inter e Nubank)</small></label>
      <div><div class="fs">Finais do cartão <small>(os 4 últimos números de cada cartão: físico, virtual, adicional)</small></div>
        <div class="fkf-l">${Object.entries(k.finais || {}).map(([f, x]) => this._finLinhaFinal(f, x, pessoas)).join("")}</div>
        <button class="lnk" data-a="f-kf-mais">+ Adicionar final</button></div>
      <label>Nome para mostrar <small>(vazio: banco e nome no cartão)</small><input id="kc-apelido" type="text" maxlength="24" value="${this._e(k.apelido || "")}" placeholder="${this._e(this._finNomeCartao({ ...k, apelido: "" }) || "ex.: Bradesco Prime")}" autocomplete="off"></label>
      <label class="chk"><input type="checkbox" id="kc-ativo" ${k.ativo !== false ? "checked" : ""}> Em uso (aparece para escolher nas compras)</label>
      <div class="fpe"><button class="btn prim" data-a="f-cart-salvar">Salvar</button><button class="btn" data-a="f-cart-ed" data-k="${this._e(id)}">Cancelar</button>
        ${id === "novo" ? "" : this._fCartApagar ? `<span class="fs">Apagar o ${this._e(this._finNomeCartao(k))}?</span><button class="btn perigo" data-a="f-cart-apagar">Apagar</button>` : `<button class="lnk perigo" data-a="f-cart-apagar">Apagar</button>`}</div>
      <div class="fs">Débito, pré-pago e benefício (Alelo, VR…): não têm fatura (os dias ficam em branco); os gastos aparecem na pilha, mês a mês. Compra paga com benefício fica no cartão de benefício de quem comprou (o da empresa que a nota disser, ou o único da casa). Crédito sem os dias: fica só como registro, sem fatura. Mudar os dias recalcula as faturas dele.</div></div>`;
  };

  // uma linha por final: número, de quem, tipo e se está em uso (parado: desde quando; some das escolhas de cartão)
  P._finLinhaFinal = function (f, x, pessoas) {
    const op = pessoas.map((v) => `<option ${v === x.quem ? "selected" : ""}>${this._e(v)}</option>`).join("");
    return `<div class="fkf">
      <input data-kf="final" type="text" inputmode="numeric" maxlength="4" value="${this._e(f)}" placeholder="1234" aria-label="Final" autocomplete="off">
      <select data-kf="quem" aria-label="De quem é">${op}</select>
      <input data-kf="tipo" type="text" maxlength="40" value="${this._e(x.tipo || "")}" placeholder="físico, virtual…" aria-label="Tipo" autocomplete="off">
      <button class="ico" data-a="f-kf-tirar" aria-label="Tirar o final ${this._e(f)}">✕</button>
      <label class="chk"><input data-kf="uso" type="checkbox" ${x.parado ? "" : "checked"}> Em uso</label>
      <label class="fkf-par">Parou em <input data-kf="parado" type="date" value="${this._e(x.parado || "")}" max="${this._fFin?.hoje || ""}"></label></div>`;
  };

  P._finSalvarCartao = async function (apagar) {
    const g = (id) => this.shadowRoot.getElementById(id);
    const id = this._fCartEd === "novo" ? null : this._fCartEd;
    const p = apagar ? { acao: "cartao", id, apagar: true } : {
      acao: "cartao", id, nome: g("kc-nome")?.value || "", apelido: g("kc-apelido")?.value || "", categoria: g("kc-cat")?.value || "", bandeira: g("kc-band")?.value, dono: g("kc-dono")?.value,
      usam: [...this.shadowRoot.querySelectorAll("[data-kc-usa]")].filter((x) => x.checked).map((x) => x.getAttribute("data-kc-usa")),
      fecha: g("kc-fecha")?.value || "", vence: g("kc-vence")?.value || "", no_fechamento: g("kc-nf")?.value,
      tipo: g("kc-tipo")?.value || "credito", beneficio_de: g("kc-benef")?.value || "", ativo: !!g("kc-ativo")?.checked, modelo: g("kc-modelo")?.value || "",
      emissor: g("kc-emissor")?.value || F_MODELOS[g("kc-modelo")?.value]?.[0] || "", banco: g("kc-ler")?.checked ? g("kc-emissor")?.value || "" : "",
      finais: [...this.shadowRoot.querySelectorAll(".fkf")].map((r) => { const v = (n) => r.querySelector(`[data-kf="${n}"]`); const uso = v("uso").checked;
        return { final: v("final").value.trim(), quem: v("quem").value, tipo: v("tipo").value, parado: uso ? "" : v("parado").value || this._fFin?.hoje || "" }; }),
      visual: { ...((this._fFin?.cartoes || []).find((x) => x.id === id)?.visual || {}), produto: g("kc-prod")?.value || "" } };
    try {
      const r = await this._api(p);
      this._aviso = r.mensagem;
      this._fCartEd = null; this._fCartApagar = false;
      this._fFin = await this._api({ acao: "financeiro" });
      this._fLinhasDe = null;
      this._carregar(true);
    } catch (e) { this._aviso = "⚠ " + (e.message || e); }
    this._render();
  };

  // data da compra (nota emitida depois): salva ao escolher a data
  P._finDataCompra = function (el) {
    if (el.value) return this._finPgRasc({ data_compra: el.value });
  };

  // "Salvar valores" do bloco Pagamento: manda só o que foi mudado (valor cobrado e detalhe; valor de cada pagamento)
  // Pagamento como rascunho: nada é gravado até "Salvar". Cada mudança entra na fila e o script mostra como a compra
  // ficaria (simular, sem gravar); Salvar grava tudo de uma vez; Cancelar (ou fechar e descartar) volta ao que está gravado.
  P._finPgRasc = function (mud) {
    const id = this._aberta?.id;
    if (!id) return;
    const pedidos = [...(this._pgRasc?.id === id ? this._pgRasc.pedidos : []), mud];
    this._pgRasc = { id, pedidos };
    this._pgAberto = true; this._pgFechar = false;
    const vez = (this._pgVez = (this._pgVez || 0) + 1);
    this._pgPrevia = (async () => {
      try {
        const r = await this._api({ acao: "pagamento_lote", id, pedidos, simular: true });
        if (vez === this._pgVez && this._aberta?.id === id) { this._aberta = r.compra; this._aviso = null; }
      } catch (e) {  // mudança recusada pelo script: sai do rascunho e o aviso diz o porquê
        if (this._pgRasc?.id === id) this._pgRasc = { id, pedidos: this._pgRasc.pedidos.filter((x) => x !== mud) };
        this._aviso = "⚠ " + (e.message || e);
      }
      this._render();
    })();
    return this._pgPrevia;
  };
  P._finPgSalvar = async function () {
    const id = this._aberta?.id;
    if (!id) return;
    await this._pgPrevia;  // a última mudança termina de entrar no rascunho
    const root = this.shadowRoot, mudou = (el) => el && el.value !== el.defaultValue, extra = [];  // valor digitado e ainda não confirmado
    const cv = root.querySelector("input[data-fcobrado='valor']"), co = root.querySelector("input[data-fcobrado='obs']");
    if (mudou(cv)) extra.push({ cobrado: { valor: cv.value } });
    if (mudou(co)) extra.push({ cobrado: { obs: co.value } });
    const pv = [...root.querySelectorAll("input[data-fcartao='valor']")].find(mudou);
    if (pv) extra.push({ cartao: { i: Number(pv.getAttribute("data-i")), valor: pv.value } });
    const pedidos = [...(this._pgRasc?.id === id ? this._pgRasc.pedidos : []), ...extra];
    if (!pedidos.length) { this._aviso = "Nada mudou no pagamento."; return this._render(); }
    const r = await this._acao({ acao: "pagamento_lote", id, pedidos }, "Pagamento salvo.");
    if (!r) return;
    this._pgRasc = null; this._pgFechar = false; this._fPartesDe = null; this._fLinhasDe = null; this._fFin = null;
    await this._abrir(id);
  };
  P._finPgCancelar = async function () {
    const id = this._aberta?.id, fechar = this._pgFechar;
    this._pgRasc = null; this._pgFechar = false; this._fPgRemover = null;
    if (fechar) return this._clique(null, { getAttribute: (x) => (x === "data-a" ? "fechar" : null), closest: () => null });
    this._aviso = "Mudanças do pagamento descartadas.";
    if (id) await this._abrir(id); else this._render();
  };

  // valor cobrado de verdade (cupom do app, cashback…): o cupom chama ao mudar um campo data-fcobrado
  P._finCobradoMudou = function (el) {
    return this._finPgRasc({ cobrado: { [el.getAttribute("data-fcobrado")]: el.value } });
  };

  // escolher cartão / parcelas / data no cartão de um pagamento (o cupom chama ao mudar um <select data-fcartao>)
  P._finCartaoMudou = function (el) {
    const i = Number(el.getAttribute("data-i")), campo = el.getAttribute("data-fcartao");
    return this._finPgRasc({ cartao: { i, [campo]: campo === "parcelas" ? Number(el.value) : el.value } });
  };

  // ---------------------------------------------------------------- faturas do banco (PDF) e assinaturas
  P._finFatCarregar = async function () {
    try {
      const r = await this._api({ acao: "faturas_banco" });
      this._fFatCache = r;
      if (this._fFat) this._fFat = { ...this._fFat, carregando: false, dados: r, erro: null };
    } catch (e) { if (this._fFat) this._fFat = { ...this._fFat, carregando: false, erro: e.message || String(e) }; }
    this._render();
  };

  // PDF → linhas [página, x, y, texto] com o pdf.js (o mesmo leitor do Firefox), aqui no navegador. Só o texto vai
  // para o HA, que tira os lançamentos e descarta o resto (nome, CPF, endereço, limite, código de barras).
  P._finPdfLinhas = async function (file) {
    const pdfjs = await import(new URL("./pdfjs/pdf.min.mjs", import.meta.url).href);
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("./pdfjs/pdf.worker.min.mjs", import.meta.url).href;
    const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false, verbosity: 0 }).promise;
    const out = [], fecha = (c) => { if (c && c.t.trim()) out.push([c.p, Math.round(c.x), Math.round(c.y), c.t.trim()]); };
    try {
      for (let p = 1; p <= doc.numPages; p++) {
        const tc = await (await doc.getPage(p)).getTextContent();
        let cur = null;
        for (const it of tc.items) {
          if (!("str" in it)) continue;
          const x = it.transform[4], y = it.transform[5], fim = x + (it.width || 0);
          if (!(cur && Math.abs(y - cur.y) < 2.5 && x >= cur.fim - 3)) { fecha(cur); cur = { p, x, y, fim, t: "" }; }
          else if (x - cur.fim > 2.5 && !cur.t.endsWith(" ") && !it.str.startsWith(" ")) cur.t += "\t";
          cur.t += !it.str.trim() && it.width > 20 ? "	" : it.str; cur.fim = Math.max(cur.fim, fim);  // espaço largo = troca de coluna
          if (it.hasEOL) { fecha(cur); cur = null; }
        }
        fecha(cur);
      }
    } finally { doc.destroy(); }
    return out;
  };

  P._finFatLer = async function (files) {
    const pdfs = [...(files || [])].filter((f) => /\.pdf$/i.test(f.name) || f.type === "application/pdf");
    if (!this._fFat) return;
    if (!pdfs.length) { this._fFat = { ...this._fFat, log: [{ txt: "Nenhum PDF nessa escolha.", erro: true }] }; return this._render(); }
    const lidos = new Set((this._fFat.dados?.faturas || []).map((f) => f.arquivo).filter(Boolean));
    const novos = pdfs.filter((f) => !lidos.has(f.name)).sort((a, b) => a.name.localeCompare(b.name));
    const log = [];
    if (pdfs.length > novos.length) log.push({ txt: `${pdfs.length - novos.length} ${pdfs.length - novos.length === 1 ? "PDF já lido" : "PDFs já lidos"} (pulei).` });
    if (!novos.length) { this._fFat = { ...this._fFat, log: [...log, { txt: "Nenhuma fatura nova." }] }; return this._render(); }
    for (let n = 0; n < novos.length; n++) {
      const f = novos[n];
      this._fFat = { ...this._fFat, lendo: { i: n + 1, n: novos.length, nome: f.name }, log }; this._render();
      try {
        const json = JSON.stringify(await this._finPdfLinhas(f));
        const by = new TextEncoder().encode(json);
        let bin = "";
        for (let i = 0; i < by.length; i += 0x8000) bin += String.fromCharCode(...by.subarray(i, i + 0x8000));
        const b64 = btoa(bin), partes = b64.match(/[\s\S]{1,30000}/g) || [""];
        let r = null;
        if (partes.length === 1) r = await this._api({ acao: "fatura_ler", arquivo: f.name, conteudo: b64 });
        else {
          const envio = `fatura${Date.now()}`;
          for (let p = 1; p <= partes.length; p++) r = await this._api({ acao: "pedaco", para: "fatura", envio, n: p, total: partes.length, dados: partes[p - 1], arquivo: f.name });
        }
        log.push({ txt: r?.mensagem || `${f.name}: lida.` });
      } catch (e) { log.push({ txt: `${f.name}: ${e.message || e}`, erro: true }); }
    }
    this._fFat = { ...this._fFat, lendo: null, log };
    try { this._fFin = await this._api({ acao: "financeiro" }); this._fLinhasDe = null; } catch (_) { /* segue */ }
    this._carregar(true);  // o sino pode ter mudanças novas (cartão acertado pela fatura)
    return this._finFatCarregar();
  };

  P._finFolhaFat = function () {
    const A = this._fFat, D = A.dados, F = this._fFin || {};
    const nomeK = (id) => { const k = (F.cartoes || []).find((x) => x.id === id); return k ? this._finNomeCartao(k) : String(id || "").toUpperCase(); };
    const seg = `<div class="fseg ffat-seg">${[["faturas", "💳 Faturas"], ["assinaturas", "🔁 Assinaturas"]].map(([k, n]) => `<button class="${A.aba === k ? "on" : ""}" data-a="f-fat-aba" data-k="${k}">${n}</button>`).join("")}</div>`;
    const cab = (t, s) => `<div class="fh"><div style="min-width:0"><div class="ft">${t}</div><div class="fs">${s}</div></div><button class="ico" data-a="fechar" aria-label="Fechar">✕</button></div>`;
    if (A.abrindo) return `<dialog class="folha larga" aria-label="Fatura">${cab("💳 Fatura do banco", "abrindo…")}<div class="vazio">Carregando…</div></dialog>`;
    if (A.det) return this._finFolhaFatDet(A.det, cab, nomeK);
    const topo = cab(A.aba === "assinaturas" ? "🔁 Assinaturas" : "💳 Faturas do banco", A.aba === "assinaturas" ? "cobranças que se repetem todo mês, tiradas das faturas" : "lidas dos PDFs dos bancos · o total delas vale em A pagar");
    if (A.carregando) return `<dialog class="folha larga" aria-label="Faturas">${topo}${seg}<div class="vazio">Carregando…</div></dialog>`;
    if (A.erro && !D) return `<dialog class="folha larga" aria-label="Faturas">${topo}${seg}<div class="aviso" role="status">⚠ ${this._e(A.erro)}</div></dialog>`;
    if (A.aba === "assinaturas") return `<dialog class="folha larga" aria-label="Assinaturas">${topo}${seg}${this._finAssinaturas(D, nomeK)}</dialog>`;
    const ler = A.lendo ? `<div class="aviso" role="status">Lendo ${A.lendo.i}/${A.lendo.n} · ${this._e(A.lendo.nome)}…</div>`
      : `<div class="fag-bt"><label class="btn prim escolher fag-esc">📁 Ler a pasta das faturas<input id="ft-pasta" type="file" webkitdirectory multiple></label>
          <label class="btn escolher fag-esc">📄 Escolher PDFs<input id="ft-arqs" type="file" multiple accept=".pdf,application/pdf"></label></div>
        <div class="fs">Pode escolher a pasta com as subpastas dos cartões. O PDF não é copiado: o navegador tira o texto e o HA guarda só data, loja, parcela, valor e final do cartão de cada linha (nada de nome, CPF, endereço ou limite). Só os PDFs novos são lidos.</div>`;
    const log = (A.log || []).length ? `<div class="fag-log">${A.log.map((l) => `<div class="${l.erro ? "fatras" : ""}">${this._e(l.txt)}</div>`).join("")}</div>` : "";
    const L = D?.faturas || [], porK = {};
    L.forEach((f) => (porK[f.cartao] ||= []).push(f));
    const hoje = F.hoje || "";
    const grupos = Object.entries(porK).map(([kid, l]) => {
      const ano = l.filter((f) => f.vence.startsWith(hoje.slice(0, 4)));
      return `<div class="fcard"><div class="fhd"><h3>💳 ${this._e(nomeK(kid))} · ${this._e(D.bancos?.[l[0].banco] || l[0].banco)}</h3><small>${ano.length} em ${hoje.slice(0, 4)} · ${this._brl(ano.reduce((s, f) => s + f.total, 0))}</small></div>
        ${l.map((f) => `<button class="fag-l ffl" data-a="f-fat-det" data-k="${this._e(f.id)}">
          <span class="fag-m"><b>${this._e(this._mesNome(f.vence.slice(0, 7)))}</b><small>vence ${this._dataCurta(f.vence + "T12:00")}</small></span>
          <span class="fag-m"><b>${f.compras} ${f.compras === 1 ? "compra" : "compras"}</b><small>${f.ligadas ? `${f.ligadas} ✓ no sistema · ` : ""}${f.parcelas ? `${f.parcelas} parcelas` : ""}${f.estornos ? ` · ${f.estornos} ↩` : ""}${f.finais_novos.length ? ` · ⚠ final ${f.finais_novos.join(", ")}` : ""}</small></span>
          <span class="fag-v"><b>${this._brl(f.total)}</b><small>${f.linhas} linhas</small></span>
          <span class="fag-s fok">›</span></button>`).join("")}</div>`;
    }).join("");
    return `<dialog class="folha larga" aria-label="Faturas">${topo}${seg}${ler}${log}
      ${grupos || `<div class="vazio peq">Nenhuma fatura lida ainda. Toque em Ler a pasta das faturas.</div>`}
      <div class="fs">Cada fatura é conferida antes de gravar: a soma das linhas tem que bater com o total do banco (e com o total de cada final). ✓ no sistema = compra que já estava lançada aqui. Lançada em outro cartão? O cartão é acertado e aparece no sino para conferir.</div>
    </dialog>`;
  };

  P._finFolhaFatDet = function (f, cab, nomeK) {
    const ass = new Set((this._fFat?.dados?.assinaturas || []).filter((a) => a.banco === f.banco).map((a) => a.descricao));
    const porF = {};
    f.linhas.forEach((l) => (porF[l.final || ""] ||= []).push(l));
    const blocos = Object.entries(porF).map(([fin, l]) => {
      const q = l[0].quem, soma = l.filter((x) => x.tipo !== "pagamento").reduce((s, x) => s + x.valor, 0);
      return `<div class="fcard"><div class="fhd"><h3>${fin ? `Final ${this._e(fin)}` : "Do banco"}${q ? ` · <span style="color:${this._pessoa(q)?.cor || "inherit"}">${this._e(q)}</span>` : fin ? " · ⚠ de quem?" : ""}</h3><small>${this._brl(soma)}</small></div>
        ${l.map((x) => {
          const marcas = [x.compra ? `✓ ${this._e(x.loja_compra || "no sistema")}` : "", x.parcela ? `parcela ${this._e(x.parcela)}` : "", ass.has(x.descricao) ? "🔁 assinatura" : "",
            F_TIPO_LINHA[x.tipo] || "", x.usd ? `US$ ${this._finCurto(x.usd)}` : "", x.como || ""].filter(Boolean).join(" · ");
          return `<${x.compra ? `button class="fev" data-a="abrir" data-id="${this._e(x.compra)}"` : `div class="fev"`}><span class="fd">${this._dataCurta(x.data + "T12:00")}</span><span class="fp" style="background:${x.compra ? "#16a34a" : x.tipo === "estorno" ? "#f59e0b" : "var(--c-linha)"}"></span>
            <span class="ft3">${this._e(x.descricao)}<small>${marcas}</small></span><span class="fvv${x.valor < 0 ? " fok" : ""}">${this._brl(x.valor)}</span></${x.compra ? "button" : "div"}>`;
        }).join("")}</div>`;
    }).join("");
    const c = f.conferencia || {};
    return `<dialog class="folha larga" aria-label="Fatura">${cab(`💳 ${this._e(nomeK(f.cartao))} · vence ${this._dataCurta(f.vence + "T12:00")}`, `${this._e(this._fFat?.dados?.bancos?.[f.banco] || f.banco)}${f.inicio ? ` · compras de ${this._dataCurta(f.inicio + "T12:00")}` : ""}${f.fecha ? ` até ${this._dataCurta(f.fecha + "T12:00")}` : ""}`)}
      <div class="fcontagrade">
        <div class="fbox"><span class="frot">Total da fatura</span><span class="fv">${this._brl(f.total)}</span><span class="fs">${c.anterior ? `saldo anterior ${this._brl(c.anterior)}` : ""}</span></div>
        <div class="fbox"><span class="frot">Compras</span><span class="fv">${f.compras}</span><span class="fs">${f.ligadas} já no sistema · ${f.parcelas} parcelas</span></div>
        <div class="fbox"><span class="frot">Conferência</span><span class="fv">${c.bate ? "✓ bate" : "⚠ não bate"}</span><span class="fs">soma das linhas = total do banco</span></div>
      </div>
      <div class="fpe"><button class="lnk" data-a="f-fat-volta">‹ Todas as faturas</button></div>
      ${blocos}
      <div class="fs">✓ = compra lançada aqui (toque para abrir). As outras ainda não estão no sistema: por enquanto ficam só na fatura.</div>
    </dialog>`;
  };

  P._finAssinaturas = function (D, nomeK) {
    const L = D?.assinaturas || [];
    if (!L.length) return `<div class="vazio peq">Nenhuma ainda: leia as faturas em 💳 Faturas.</div>`;
    const mes = L.reduce((s, a) => s + a.valor_atual, 0);
    return `<div class="fcontagrade">
        <div class="fbox"><span class="frot">Por mês</span><span class="fv">${this._brl(mes)}</span><span class="fs">${L.length} assinaturas (valor da última fatura)</span></div>
        <div class="fbox"><span class="frot">Por ano</span><span class="fv">${this._brl(mes * 12)}</span><span class="fs">se continuarem iguais</span></div>
      </div>
      <div class="fcard">${L.map((a) => `<div class="fag-l frec">
        <span class="fag-m"><b>${this._e(a.descricao)}</b><small>${this._e(nomeK(a.cartao))} final ${this._e(a.finais.join(", "))} · ${this._e(a.quem.join(", "))}</small></span>
        <span class="fag-m"><b>${a.meses} meses</b><small>desde ${this._dataCurta(a.primeiro + "T12:00")}</small></span>
        <span class="fag-v"><b>${this._brl(a.valor_atual)}</b><small>${a.dolar ? "em dólar (varia)" : a.media !== a.valor_atual ? `média ${this._brl(a.media)}` : "por mês"}</small></span>
        <span class="fag-s"></span></div>`).join("")}</div>
      <div class="fs">Entra aqui o que apareceu em 3 faturas ou mais, sem ser parcela, com o mesmo valor (ou cobrado em dólar). É só uma lista para vocês decidirem o que manter; nada é cancelado ou mudado por aqui.</div>`;
  };

  // ---------------------------------------------------------------- cliques (data-a="f-…")
  P._finClique = function (a, el) {
    const k = el.getAttribute("data-k"), g2 = (i) => this.shadowRoot.getElementById(i);
    const fim = () => { this._fAnosAberto = false; this._aviso = null; this._render(); };
    if (a === "f-modo") { this._fModo = k; this._fAberta = null; return fim(); }
    if (a === "f-mes") { this._mes = this._finSomaMes(this._mes, Number(k)); return fim(); }
    if (a === "f-anos") { this._fAnosAberto = !this._fAnosAberto; return this._render(); }
    if (a === "f-ano") { this._fAno = k; return fim(); }
    if (a === "f-quem") { this._fQuem = k; return fim(); }
    if (a === "f-area") { this._fArea = k; return fim(); }
    if (a === "f-abre") { this._fAberta = this._fAberta === k ? null : k; return fim(); }
    if (a === "f-vai-mes") { this._fModo = "mes"; this._mes = k; return fim(); }
    if (a === "f-vai-ano") { this._fModo = "ano"; this._fAno = k; return fim(); }
    if (a === "f-vai-area") { this._aba = "areas"; this._fArea = k; return fim(); }
    if (a === "f-secao") return this._finAbrirSecao(el.getAttribute("data-area"), el.getAttribute("data-sub"));
    if (a === "f-dia") { const d = new Date(k + "T12:00"); const t = d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" }); return this._finAbrirLista(t[0].toUpperCase() + t.slice(1), (l) => l.c.emissao.slice(0, 10) === k); }
    if (a === "f-pag") {
      const ids = new Set(this._compras().filter((c) => (c.pago_com || []).some((pg) => this._finPagGrupo(pg) === k)).map((c) => c.id));
      return this._finAbrirLista(k, (l) => ids.has(l.c.id));
    }
    if (a === "f-pagar") { this._fPgEd = null; this._fConf = k; this._aviso = null; return this._render(); }
    if (a === "f-conf-ok") {
      const dl = el.closest("dialog"), d = dl?.querySelector("#fconf-data")?.value || "", h = dl?.querySelector("#fconf-hora")?.value || "";
      if (!d) { this._aviso = "Escolha a data do pagamento."; return this._render(); }
      this._fConf = null;
      return this._finPagar(k, false, h ? `${d}T${h}` : d);
    }
    if (a === "f-despagar") { this._fPgEd = null; return this._finPagar(k, true); }
    if (a === "f-pg-ed") { this._fPgEd = this._fPgEd === k ? null : k; if (el.closest(".fhist")) this._fHistAberto = true; else if (el.closest(".flarg")) this._fLargAberta = true; return this._render(); }
    if (a === "f-pg-salvar") {
      const ed = el.closest(".fpg-ed"), d = ed?.querySelector("input[type=date]")?.value || "", h = ed?.querySelector("input[type=time]")?.value || "";
      this._fPgEd = null;
      return this._finPagar(k, false, d && h ? `${d}T${h}` : d);
    }
    if (a === "f-fat-abre") { this._fFatAberta = this._fFatAberta === k ? null : k; return this._render(); }
    if (a === "f-semcartao") {
      const ids = new Set((this._fFin?.sem_cartao || []).map((x) => x.id));
      this._fLista = { titulo: "Crédito sem cartão escolhido", periodo: "abra cada uma e escolha o cartão", linhas: this._compras().filter((c) => ids.has(c.id)).map((c) => [c, c.valor_pago]) };
      return this._render();
    }
    if (a === "f-cats") { this._fCats = { carregando: true }; this._render(); return this._finCatsCarregar(); }
    if (a === "f-exp") {  // ⚙ › Backup: baixa o .zip (endereço da integração, só administrador)
      (async () => {
        try {
          const r = await this._hass.fetchWithAuth("/api/co_finance/exportar");
          if (!r.ok) throw new Error(r.status === 403 ? "Só o administrador pode exportar." : `Não deu para exportar (${r.status}).`);
          const nome = (r.headers.get("Content-Disposition") || "").match(/filename="([^"]+)"/)?.[1] || "cofinance.zip";
          const url = URL.createObjectURL(await r.blob()), l = document.createElement("a");
          l.href = url; l.download = nome; document.body.appendChild(l); l.click(); l.remove();
          setTimeout(() => URL.revokeObjectURL(url), 10000);
          this._aviso = `Backup baixado: ${nome}.`;
        } catch (e) { this._aviso = "⚠ " + (e.message || e); }
        this._render();
      })();
      return;
    }
    if (a === "f-imp") {  // ⚙ › Backup: escolhe o .zip e manda para a integração
      const inp = document.createElement("input");
      inp.type = "file"; inp.accept = ".zip,application/zip";
      inp.onchange = async () => {
        const f = inp.files?.[0];
        if (!f || !confirm(`Importar ${f.name}?\n\nAs compras e os cadastros de agora são trocados pelos do arquivo. O que há hoje fica guardado em dados/backups.`)) return;
        this._aviso = "Importando…"; this._render();
        try {
          const r = await this._hass.fetchWithAuth("/api/co_finance/importar", { method: "POST", body: f, headers: { "Content-Type": "application/zip" } });
          const j = await r.json().catch(() => ({}));
          if (!r.ok || j.ok === false) throw new Error(j.mensagem || (r.status === 413 ? "Arquivo grande demais para enviar pela tela." : `Não deu para importar (${r.status}).`));
          this._aviso = j.mensagem; this._fFin = null;
          await this._carregar();
        } catch (e) { this._aviso = "⚠ " + (e.message || e); }
        this._render();
      };
      inp.click();
      return;
    }
    if (a === "f-cat-edit") { this._fCats = { ...this._fCats, edit: { cat: k, sub: el.getAttribute("data-sub") || null }, msg: "" }; this._render(); setTimeout(() => this.shadowRoot.getElementById("fc-edit")?.focus(), 50); return; }
    if (a === "f-cat-cancelar") { this._fCats = { ...this._fCats, edit: null }; return this._render(); }
    if (a === "f-cat-salvar") { const ed = this._fCats.edit, nome = this.shadowRoot.getElementById("fc-edit")?.value || ""; return this._finCatsOp({ acao: "arvore", op: "renomear", categoria: ed.cat, sub: ed.sub, nome }); }
    if (a === "f-cat-add") { const nome = this.shadowRoot.getElementById(`fc-nova-${el.getAttribute("data-i")}`)?.value || ""; return this._finCatsOp({ acao: "arvore", op: "nova_sub", categoria: k, nome }); }
    if (a === "f-cat-del") return this._finCatsOp({ acao: "arvore", op: "apagar_sub", categoria: k, sub: el.getAttribute("data-sub") });
    if (a === "f-cat-nova") { const g = (id) => this.shadowRoot.getElementById(id)?.value || ""; return this._finCatsOp({ acao: "arvore", op: "nova_categoria", nome: g("fc-ncat"), icone: g("fc-ncat-ic") }); }
    if (a === "f-regra-del") return this._finCatsOp({ acao: "regra", cnpj8: k, apagar: true });
    if (a === "f-cart-sel") { this._fCartSel = k; return this._render(); }
    if (a === "f-conta") { if (Date.now() - (this._fArrastou || 0) < 400) return; this._fConta = k; this._fPgEd = null; this._aviso = null; return this._render(); }
    if (a === "f-rec") { this._fConta = null; this._fSecao = null; this._fRec = k; this._aviso = null; return this._render(); }
    if (a === "f-fat") { this._fConta = null; this._fSecao = null; this._fFat = { aba: k === "assinaturas" ? "assinaturas" : "faturas", carregando: !this._fFatCache, dados: this._fFatCache, log: [] }; this._render(); return this._finFatCarregar(); }
    if (a === "f-fat-aba") { this._fFat = { ...this._fFat, aba: k, det: null }; return this._render(); }
    if (a === "f-fat-det") {
      this._fConta = null;  // a janela da fatura dá lugar às linhas do banco
      if (!this._fFat) this._fFat = { aba: "faturas", dados: this._fFatCache, log: [] };
      this._fFat = { ...this._fFat, abrindo: k, det: null }; this._render();
      return this._api({ acao: "faturas_banco", id: k }).then((r) => { if (this._fFat?.abrindo === k) this._fFat = { ...this._fFat, abrindo: null, det: r.fatura }; },
        (e) => { if (this._fFat) this._fFat = { ...this._fFat, abrindo: null, erro: e.message || String(e) }; }).then(() => { if (!this._fFat?.dados) this._finFatCarregar(); this._render(); });
    }
    if (a === "f-fat-volta") { this._fFat = { ...this._fFat, det: null }; return this._render(); }
    if (a === "f-dig-salvar") return this._finDigSalvar(el.getAttribute("data-k"));
    if (a === "f-luz") { this._fConta = null; this._fSecao = null; this._fLuz = { carregando: !this._fLuzCache, dados: this._fLuzCache, log: [] }; this._render(); return this._finLuzCarregar(); }
    if (a === "f-agua") { this._fConta = null; this._fSecao = null; this._fAgua = { carregando: !this._fAguaCache, dados: this._fAguaCache, log: [] }; this._render(); return this._finAguaCarregar(); }
    if (a === "f-energia") {
      this._fConta = null; this._fSecao = null; this._fLista = null; this._fPgEd = null; this._fAgua = null; this._fRec = null;
      window.history.pushState(null, "", F_PAINEL_ENERGIA);
      window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } }));
      return this._render();
    }
    if (a === "f-pg-salvar-txt") return this._finPgSalvar();
    if (a === "f-pg-cancelar") return this._finPgCancelar();
    if (a === "f-corrigir") { this._fCorrigir = !this._fCorrigir; this._fPgEd = null; this._fCartEd = null; this._aviso = null; return this._render(); }
    if (a === "f-kc-mod") {  // só troca as miniaturas: o resto do formulário não perde o que já foi digitado
      this._fKcModelo = k;
      const kb = this.shadowRoot.getElementById("kc-band"), bm = this._finModeloBandeira(k);  // o modelo diz a bandeira: ela acompanha
      if (kb && bm && kb.value !== bm) kb.value = bm;
      if (kb) this._fKcBand = kb.value;
      const kt = this.shadowRoot.getElementById("kc-tipo"), fm = F_MODELO_FUNC[k];  // e a função, se for de débito ou pré-pago
      if (kt && fm && kt.value !== fm && !(fm === "debito" && kt.value === "ambos")) kt.value = fm;
      if (kt) this._fKcTipo = kt.value;
      const box = this.shadowRoot.getElementById("kc-mods"), pv = this.shadowRoot.getElementById("kc-prev");
      if (box) this._finTrocar(box, this._finKcMods()); else this._render();
      this._finKcCatTrocar?.();
      if (pv) pv.innerHTML = this._finKcPrevia();
      return;
    }
    if (a === "f-cart-ed") { this._fCartEd = this._fCartEd === k ? null : k; this._fCartApagar = false; this._aviso = null; return this._render(); }
    if (a === "f-cart-salvar") return this._finSalvarCartao(false);
    if (a === "f-pes-ed") { this._fPesEd = this._fPesEd === k ? null : k; this._fPesApagar = false; this._aviso = null; return this._render(); }
    if (a === "f-pes-salvar") return this._finSalvarPessoa(false);
    if (a === "f-av-salvar") return this._finSalvarCfg({ acao: "config_avisos", dias_antes: Number(g2("ka-dias")?.value || 0), hora_antes: g2("ka-hantes")?.value,
      horas_dia: [...this.shadowRoot.querySelectorAll("[data-kahora]")].filter((c) => c.checked).map((c) => Number(c.dataset.kahora)),
      atrasadas: !!g2("ka-atr")?.checked, hora_atrasadas: g2("ka-hatr")?.value, painel: g2("ka-painel")?.value || "" });
    if (a === "f-pd-print") {  // Mercado Livre: o texto do print colado (Android, ou o atalho falhou)
      const texto = (g2("pd-print")?.value || "").trim();
      if (!texto) { this._fPdPrintMsg = { txt: "Cole o texto do print primeiro.", erro: true }; return this._render(); }
      this._fPdPrint = texto; this._fPdPrintLendo = true; this._fPdPrintMsg = null; this._render();
      (async () => {
        try {
          const r = await this._api({ acao: "pedido_email", via: "print", texto });
          this._fPdPrintMsg = { txt: r?.mensagem || "Lido.", erro: r?.ok === false };
          if (r?.ok !== false) {
            this._fPdPrint = "";
            if (r.status === "pedido_novo") this._avisar(r.status, r.mensagem, r.quem, r.id);  // a pergunta do cartão, se faltar
            await this._carregar(true);
          }
        } catch (e) { this._fPdPrintMsg = { txt: e.message || String(e), erro: true }; }
        this._fPdPrintLendo = false; this._render();
      })();
      return;
    }
    if (a === "f-pd-imp-ok" || a === "f-pd-imp-x") {  // Trazer / Cancelar a importação da prévia
      const arq = this._fPdImp?.arquivo, ok = a === "f-pd-imp-ok";
      this._fPdImp = ok ? { gravando: true } : null; this._render();
      (async () => {
        try {
          const r = await this._api({ acao: "pedidos_importar", etapa: ok ? "gravar" : "cancelar", arquivo: arq });
          this._fPdImp = ok ? { msg: r.mensagem } : null;
          if (ok) await this._carregar(true);
        } catch (e) { this._fPdImp = { msg: e.message || String(e), erro: true }; }
        this._render();
      })();
      return;
    }
    if (a === "f-pd-imp-desfazer") {
      (async () => {
        try { const r = await this._api({ acao: "pedidos_importar_desfazer", id: k }); this._fPdImp = { msg: r.mensagem }; await this._carregar(true); }
        catch (e) { this._fPdImp = { msg: e.message || String(e), erro: true }; }
        this._render();
      })();
      return;
    }
    if (a === "f-pd-caixa") return this._finSalvarCfg({ acao: "pedidos_config", caixa: k || "" });  // ⚙ › Pedidos online: a caixa lida (vazio: desliga)
    if (a === "f-pd-caminho") { this._fPdCaminho = this._fPdCaminho === k ? null : k; return this._render(); }  // passo a passo: A ou B
    if (a === "f-at-salvar") return this._finSalvarCfg({ acao: "config_atalho", casa: g2("kat-casa")?.value || "", fora: g2("kat-fora")?.value || "" });
    if (a === "f-at-ver") { this._fAtVer = !this._fAtVer; return this._render(); }
    if (a === "f-at-copiar") {
      const at = this._dados?.atalho || {}, base = (k === "casa" ? at.casa : at.fora || at.base) || "", url = `${base.replace(/\/+$/, "")}/api/webhook/${at.codigo || ""}`;
      const ok = this._finCopiar(url);
      this._fAtCopiado = ok ? k : null;
      if (!ok) { this._fAtVer = true; this._fAtFalhou = k; }  // não deu: o endereço aparece inteiro para copiar à mão
      this._render();
      if (ok) setTimeout(() => { this._fAtCopiado = null; this._render(); }, 2500);
      return;
    }
    if (a === "f-cfg-g") {
      const atual = el.getAttribute("aria-expanded") === "true";
      this._fCfgGrupo = atual ? null : k;
      this._fPesEd = this._fCartEd = this._fCcEd = this._fBemEd = null; this._fExclApagar = null; this._aviso = null; this._fPdLog = this._fPdCaminho = null;
      if (!atual) this._v3Perto = ".fcfg-g.on";
      return this._render();
    }
    if (a === "f-excl-apagar") { this._fExclApagar = k; return this._render(); }
    if (a === "f-excl-nao") { this._fExclApagar = null; return this._render(); }
    if (a === "f-excl-sim") { const alvo = this._fExclApagar; this._fExclApagar = null; return this._finSalvarCfg(alvo === "todas" ? { acao: "apagar_excluida", todas: true } : { acao: "apagar_excluida", id: alvo }); }
    if (a === "f-recuperar") return this._finSalvarCfg({ acao: "recuperar", id: k });
    if (a === "f-bem-ed") { this._fBemEd = this._fBemEd === k ? null : k; this._fBemApagar = false; this._aviso = null; return this._render(); }
    if (a === "f-bem-apagar" && !this._fBemApagar) { this._fBemApagar = true; return this._render(); }
    if (a === "f-bem-salvar" || a === "f-bem-apagar") {
      const ed = this._fBemEd, p = a === "f-bem-apagar" ? { acao: "bem_salvar", id: ed, apagar: true }
        : { acao: "bem_salvar", id: ed === "novo" ? "" : ed, nome: g2("kb-nome")?.value || "", placas: g2("kb-placas")?.value || "" };
      return this._finSalvarCfg(p, () => { this._fBemEd = null; this._fBemApagar = false; });
    }
    if (a === "f-cc-ed") { this._fCcEd = this._fCcEd === k ? null : k; this._fCcApagar = false; this._aviso = null; return this._render(); }
    if (a === "f-cc-salvar") return this._finSalvarConta(false);
    if (a === "f-cc-apagar") { if (!this._fCcApagar) { this._fCcApagar = true; return this._render(); } return this._finSalvarConta(true); }
    if (a === "f-pes-apagar") { if (!this._fPesApagar) { this._fPesApagar = true; return this._render(); } return this._finSalvarPessoa(true); }
    if (a === "f-kf-mais") {  // linha nova sem redesenhar (o que já foi digitado no formulário fica)
      el.previousElementSibling.insertAdjacentHTML("beforeend", this._finLinhaFinal("", { quem: this.shadowRoot.getElementById("kc-dono")?.value }, this._dados?.compradores || []));
      el.previousElementSibling.lastElementChild.querySelector("input")?.focus();
      return;
    }
    if (a === "f-kf-tirar") { el.closest(".fkf")?.remove(); return; }
    if (a === "f-cart-apagar") { if (!this._fCartApagar) { this._fCartApagar = true; return this._render(); } return this._finSalvarCartao(true); }
    if (a === "f-pg-dividir" || a === "f-pg-remover") {
      const id = this._aberta?.id, i = Number(el.getAttribute("data-i"));
      if (!id) return;
      if (a === "f-pg-remover" && this._fPgRemover !== `${id}:${i}`) { this._fPgRemover = `${id}:${i}`; return this._render(); }
      this._fPgRemover = null;
      return this._finPgRasc({ cartao: { i, [a === "f-pg-dividir" ? "dividir" : "remover"]: true } });
    }
    if (a === "f-nota") {  // abre o cupom completo com os itens da seção destacados
      const id = el.getAttribute("data-id");
      this._destaque = { id, n: new Set((this._fSecao?.itens || []).filter((i) => i.compra === id).map((i) => i.n)) };
      this._qr = null; this._chaveCopiada = false;
      return this._abrir(id);
    }
  };

  // ---------------------------------------------------------------- estilo (classes com "f" para não esbarrar no card)
  P._finCss = function () {
    return `
    .fin{display:grid;gap:12px}
    .fchip.fzero:not(.on){opacity:.55}
    .fcomo>summary{cursor:pointer;font-size:12.5px;color:var(--c-acc);margin-top:4px;width:max-content}.fcomo .fs{margin-top:4px;max-width:60ch}
    .fresumo{display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 12px;padding:2px 4px}.fresumo b{font-size:28px;font-weight:700;letter-spacing:-.5px}.fresumo .fs{flex-basis:100%}
    .falertas{display:grid;gap:6px}
    .falerta-l{font:inherit;color:var(--c-txt);display:grid;grid-template-columns:20px minmax(0,1fr) auto;gap:10px;align-items:center;text-align:left;cursor:pointer;width:100%;box-sizing:border-box;padding:10px 12px;border-radius:12px;
      border:1px solid color-mix(in srgb,var(--c-sobe) 45%,transparent);background:color-mix(in srgb,var(--c-sobe) 8%,transparent)}
    .falerta-l svg{width:20px;height:20px;fill:none;stroke:var(--c-sobe);stroke-width:2;stroke-linejoin:round;stroke-linecap:round}
    .fpilha{display:grid;justify-items:center;gap:8px;touch-action:pan-y;padding:4px 0}
    .fpeek{display:grid;width:100%;max-width:380px}
    .fpk{font:inherit;font-size:13.5px;cursor:pointer;display:flex;gap:8px;align-items:center;width:100%;box-sizing:border-box;border:0;border-radius:14px 14px 0 0;padding:9px 18px 23px;margin-bottom:-14px;
      background:var(--cf);color:var(--ct);text-align:left;box-shadow:0 -2px 6px rgba(0,0,0,.12)}
    .fpk span{opacity:.85}.fpk .fpk-v{margin-left:auto;font-weight:700;opacity:1}
    .fcface{position:relative;width:100%;max-width:380px;aspect-ratio:1.586;box-sizing:border-box;border:0;border-radius:16px;padding:18px 20px;background:var(--cf);color:var(--ct);font:inherit;text-align:left;
      display:grid;grid-template-rows:auto auto 1fr auto;gap:6px;box-shadow:0 8px 20px rgba(0,0,0,.22)}
    button.fcface{cursor:pointer}
    .fcf-top{display:flex;justify-content:space-between;align-items:center;font-size:15px}
    .fcf-nome{font-weight:700;letter-spacing:.06em;padding:2px 8px;border-radius:6px;background:color-mix(in srgb,var(--ct) 18%,transparent)}
    .fcf-chip{width:40px;height:30px}
    .fcf-meio{align-self:end;display:grid;gap:2px}.fcf-meio small{font-size:13px;opacity:.85}
    .fcf-v{font-size:30px;font-weight:700;letter-spacing:-.5px}
    .fcf-pe{display:flex;justify-content:space-between;gap:8px;font-size:13px}
    .fcf-atr{font-weight:700;padding:1px 8px;border-radius:999px;background:var(--ct);color:var(--cf)}
    .fcface:focus-visible,.fpk:focus-visible,.fdot:focus-visible,.falerta-l:focus-visible,button.flp:focus-visible{outline:2px solid var(--c-acc);outline-offset:3px}
    .fdots{display:flex;gap:2px}
    .fdot{width:28px;height:28px;border:0;background:none;padding:0;cursor:pointer;display:grid;place-items:center}
    .fdot::after{content:"";width:8px;height:8px;border-radius:4px;background:var(--c-linha)}.fdot.on::after{background:var(--c-acc);width:20px}
    .fmini{display:inline-grid;place-items:center;width:34px;height:22px;border-radius:5px;background:var(--cf);color:var(--ct);font-size:10.5px;font-weight:700;letter-spacing:.04em;vertical-align:middle}
    button.fev.flp{grid-template-columns:36px minmax(0,1fr) auto;align-items:center;gap:10px;padding:9px 4px;border-bottom:1px solid var(--c-linha);border-radius:0}
    button.fev.flp:last-child{border-bottom:0}button.fev.flp .ft3 b{font-weight:600}
    .ffinais{display:flex;flex-wrap:wrap;gap:6px;margin:2px 0 4px}
    .ffin{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--c-linha);border-radius:999px;padding:3px 10px;font-size:13px}.ffin i{width:8px;height:8px;border-radius:50%}.ffin small{color:var(--c-sub);font-size:12px}
    .fsec{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--c-sub);font-weight:600;margin:14px 0 2px}
    .flinks{display:flex;flex-wrap:wrap;gap:6px 18px;margin-top:10px}.flinks .lnk{font-size:14px}
    .fpg-grande{width:100%;padding:12px;font-size:15px;margin:2px 0 4px}
    .fconf-ok{font-size:13.5px;color:var(--c-desce)}
    dialog .ffat{margin:0;padding:0;border:0}
    .fcface{overflow:hidden;background:var(--cg,var(--cf))}.fcface>*{position:relative;z-index:1}.fcface>.fcf-arte{position:absolute;inset:0;width:100%;height:100%;z-index:0}
    .fcf-top{align-items:flex-start}.fcf-marca{display:grid;gap:3px}.fcf-prod{font-size:11.5px;letter-spacing:.3em;text-transform:uppercase;opacity:.85}
    .fcf-chiprow{display:flex;align-items:center;gap:10px}.fcf-nfc{width:22px;height:22px;opacity:.8}
    .fcf-pe{align-items:flex-end}.fcf-band{width:44px;height:28px}.fcf-visa{font-weight:800;font-style:italic;font-size:21px;letter-spacing:.02em;line-height:1}
    .fpk{background:var(--cg,var(--cf))}.fpk.preto{box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 -2px 6px rgba(0,0,0,.18)}.fmini{background:var(--cg,var(--cf))}
    .fmini{box-shadow:inset 0 0 0 1px rgba(127,127,127,.35)}
    .fcface.preto{box-shadow:inset 0 0 0 1px rgba(255,255,255,.1),0 8px 20px rgba(0,0,0,.3)}
    dialog.fconf{max-width:420px}.fconf-v{font-size:26px;font-weight:700;margin:4px 0 8px}
    .fpg-ed input[type=time]{font:inherit;font-size:13px;padding:4px 6px}
    .fcorr{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:10px 12px;border-radius:12px;border:1px dashed var(--c-acc);background:color-mix(in srgb,var(--c-acc) 8%,transparent);font-size:13.5px}
    .fcorr-bt{display:flex;justify-content:flex-end;margin-bottom:-6px}
    /* celular: nada pode alargar a coluna (a tela não arrasta para o lado) */
    .fin,.fcol{grid-template-columns:minmax(0,1fr)}.fin>*,.fcol>*,.fdois>*,.fheroi>*{min-width:0}
    .fanos{overflow-x:auto;overflow-y:hidden}.fab{min-width:46px}
    .fcontagrade{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:4px 0 10px}
    .fcasa{display:grid;gap:6px}.ffat-seg{margin:0 0 10px;width:max-content}div.fag-l{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,.8fr) minmax(0,.9fr) 4px;gap:10px;align-items:center;border-bottom:1px solid var(--c-linha);padding:9px 2px}div.fag-l:last-child{border-bottom:0}div.fev{cursor:default}.ffat .ft3,.folha .fev .ft3{overflow-wrap:anywhere}
    @media (max-width:520px){button.fag-l.ffl{grid-template-columns:minmax(0,1fr) auto}button.fag-l.ffl>span:nth-child(2){grid-column:1/-1;grid-row:2}button.fag-l.ffl .fag-s{display:none}div.fag-l{grid-template-columns:minmax(0,1fr) auto}div.fag-l>span:nth-child(2){grid-column:1/-1;grid-row:2}div.fag-l .fag-s{display:none}}
    .fpgd{display:block;font-size:11.5px;font-weight:400;color:var(--c-sub)}.flin b .fpgd{text-align:right}
    .fmais>summary{cursor:pointer;list-style:none;font-size:13px;color:var(--c-acc);padding:8px 2px 2px}.fmais>summary::-webkit-details-marker{display:none}
    .fmeses-g{position:relative;display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:6px;align-items:end;height:220px;padding-top:6px}
    .fmb{font:inherit;color:inherit;background:none;border:0;cursor:pointer;display:grid;grid-template-rows:18px 1fr 16px;height:100%;padding:0;text-align:center}
    .fmb.fut{opacity:.35;cursor:default}.fmb-v{font-size:10.5px;color:var(--c-sub);align-self:end;white-space:nowrap}.fmb-n{font-size:11.5px;color:var(--c-sub)}
    .fmb-c{display:flex;flex-direction:column-reverse;justify-content:flex-start;border-radius:6px 6px 0 0;overflow:hidden;background:color-mix(in srgb,var(--c-txt) 5%,transparent)}
    .fmb-c i{display:block;width:100%}.fmb-c .dia{background:var(--c-acc)}.fmb-c .bem{background:#f59e0b}
    .fmb:not(.fut):hover .fmb-c{outline:1.5px solid var(--c-acc)}
    .fmeses-t{position:absolute;left:0;right:0;border-top:2px dashed var(--c-txt);opacity:.45;pointer-events:none}
    @media (max-width:520px){.fmb-v{font-size:9px}.fmeses-g{gap:3px}}.fcasa .fev{display:grid;grid-template-columns:28px minmax(0,1fr) auto;align-items:center;gap:8px;padding:8px 4px;border:0;border-bottom:1px solid var(--c-linha);background:none}
    .fcasa .fev:last-child{border-bottom:0}
    .fag-bt{display:flex;gap:8px;flex-wrap:wrap;margin:2px 0 6px}.fag-esc{position:relative;overflow:hidden}.fag-esc input{position:absolute;inset:0;opacity:0;width:100%;cursor:pointer}
    .fag-log{font-size:12.5px;display:grid;gap:2px;margin:6px 0;padding:8px 10px;border-radius:10px;background:color-mix(in srgb,var(--c-txt) 5%,transparent)}
    button.fag-l{display:grid;grid-template-columns:minmax(64px,.8fr) minmax(0,1.6fr) minmax(0,1.1fr) 70px;gap:10px;align-items:center;width:100%;font:inherit;color:inherit;text-align:left;cursor:pointer;background:none;border:0;border-bottom:1px solid var(--c-linha);padding:9px 2px}
    button.fag-l:last-child{border-bottom:0}button.fag-l.alto .fag-b i{background:#f59e0b}
    .fag-m,.fag-v{display:grid;line-height:1.25}.fag-m small,.fag-v small{color:var(--c-sub);font-size:11.5px}.fag-v{text-align:right}
    .fag-b{position:relative;height:22px;border-radius:6px;background:color-mix(in srgb,var(--c-txt) 6%,transparent);overflow:hidden}
    .fag-b i{position:absolute;left:0;top:0;bottom:0;background:#38bdf8;opacity:.55}.fag-b em{position:relative;font-style:normal;font-size:12px;padding-left:8px;line-height:22px;white-space:nowrap}
    .fag-s{font-size:12px;text-align:right}
    @media (max-width:520px){button.fag-l.frec{grid-template-columns:minmax(0,1fr) auto auto;row-gap:0}}.fag-aviso{padding:8px 10px;border-radius:10px;background:color-mix(in srgb,#f59e0b 10%,transparent)}
    @media (max-width:520px){button.fag-l{grid-template-columns:minmax(0,1fr) auto;row-gap:6px}.fag-b{grid-column:1/-1;grid-row:2}.fag-s{grid-column:2;grid-row:1;display:none}}
    @media (max-width:520px){.fcontagrade{grid-template-columns:1fr 1fr}.fcontagrade .fbox:last-child{grid-column:1/-1}}
    button.fnota,button.fev{font:inherit;color:inherit;text-align:left;cursor:pointer}
    .fpg-b{display:flex;gap:12px;align-items:center}
    @media (max-width:520px){.fpg-b{grid-column:1/-1;justify-content:flex-end}.fpg-ed{padding-left:0}}
    .fpg-ed{grid-column:1/-1;flex-basis:100%;display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:8px 0 4px 34px}.fpg-ed input{font:inherit;font-size:13px;padding:4px 6px}
    .flarg>summary{cursor:pointer;list-style:none}.flarg>summary::-webkit-details-marker{display:none}
    button.fcart{font:inherit;cursor:pointer;text-align:left}button.fcart.on{border-color:var(--c-acc);box-shadow:0 0 0 1px var(--c-acc)}
    button.fcart.inativo{opacity:.6}button.fcart.novo{color:var(--c-acc);font-weight:600}
    .fcartform{margin-top:10px;padding:12px;border:1px solid var(--c-linha);border-radius:12px;background:var(--c-fundo)}
    .fkc-usam{display:flex;gap:14px;flex-wrap:wrap;margin-top:4px}
    .fimp{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:10px}.fimp .fs{flex:1 1 12em}
    .fkc-sec{font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-top:6px}.fkc-mais summary{cursor:pointer;color:var(--c-acc);font-size:13px;padding:6px 0}.fkc-mais[open]{display:grid;gap:10px}
    .fcfg-hd{display:grid;gap:2px;margin:4px 0 14px}.fcfg-hd h1{font-size:22px;margin:0}
    .fcfg-acord{max-width:760px;margin:0 auto;border:1px solid var(--c-linha);border-radius:16px;background:var(--c-fundo);overflow:hidden}
    .fcfg-g+.fcfg-g{border-top:1px solid var(--c-linha)}
    .fcfg-l{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:12px;align-items:center;width:100%;border:0;background:none;color:var(--c-txt);font:inherit;text-align:left;padding:14px 16px;cursor:pointer;min-height:50px}
    .fcfg-l:hover,.fcfg-g.on .fcfg-l{background:color-mix(in srgb,var(--c-txt) 5%,transparent)}
    .fcfg-t{font-weight:600}.fcfg-r{color:var(--c-sub);font-size:13px;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .fcfg-s{color:var(--c-sub);font-size:18px;line-height:1;transition:transform .15s}.fcfg-g.on .fcfg-s{transform:rotate(90deg)}
    .fkc-prev{display:grid;justify-items:center;gap:6px;margin:2px 0 12px}.fkc-prev>div{width:min(320px,100%)}.fkc-prev small{color:var(--c-sub);font-size:12px}
    .fkc-prev .fcface{width:100%;pointer-events:none}.fkc-prev .v3f-info{display:none}
    .fkm-l{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin:4px 0 12px}
    .fkm{display:grid;gap:6px;border:0;background:none;padding:4px;border-radius:14px;cursor:pointer;color:var(--c-txt);font:inherit;text-align:center}
    .fkm small{font-size:12px;line-height:1.3}.fkm.on{box-shadow:0 0 0 2.5px var(--c-acc)}.fkm.on small{color:var(--c-acc);font-weight:600}
    .fkm-f{display:block;pointer-events:none}.fkm-f .fcface{width:100%;border-radius:10px!important;box-shadow:0 4px 10px -6px rgba(0,0,0,.5)!important}.fkm-f .v3f-info{display:none}
    .fcfg-prog{max-width:760px;width:100%;box-sizing:border-box;margin:0 auto 12px;display:grid;gap:6px;border:1px solid color-mix(in srgb,var(--c-acc) 40%,transparent);border-radius:14px;padding:12px 16px;background:color-mix(in srgb,var(--c-acc) 6%,transparent)}
    .fcfg-bar{height:6px;border-radius:999px;background:var(--c-linha);overflow:hidden}.fcfg-bar i{display:block;height:100%;background:var(--c-acc);border-radius:999px;transition:width .3s}
    .fcfg-n{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;border:1.5px solid var(--c-sub);color:var(--c-sub);font-size:12px;font-weight:700;margin-right:8px;vertical-align:-1px}
    .fcfg-n.ok{background:var(--c-acc);border-color:var(--c-acc);color:var(--c-fundo,#fff)}
    .fcfg-g.depois .fcfg-t{color:var(--c-sub)}
    .fcfg-opc{font-style:normal;font-size:11px;color:var(--c-sub);border:1px solid var(--c-linha);border-radius:999px;padding:1px 7px;margin-left:6px}
    .fcfg-seg{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;margin-top:14px;padding-top:12px;border-top:1px solid var(--c-linha)}.fcfg-seg>span{color:var(--c-acc);font-weight:600}
    .fpd-cxs{list-style:none;display:flex;flex-wrap:wrap;gap:8px;margin:6px 0}
    .fcfg-comece{font-style:normal;font-size:11px;font-weight:600;color:var(--c-acc);border:1px solid var(--c-acc);border-radius:999px;padding:1px 7px;margin-left:6px}
    .fpd-st{border:1px solid var(--c-linha);border-radius:10px;padding:8px 12px;font-size:14px}.fpd-st.ok{border-color:color-mix(in srgb,var(--c-acc) 45%,transparent);background:color-mix(in srgb,var(--c-acc) 8%,transparent)}
    .fpd-st small{color:var(--c-sub)}
    .fpd-print{display:block;margin-top:8px}.fpd-print textarea{display:block;width:100%;box-sizing:border-box;margin-top:4px;font:inherit;font-size:14px;padding:8px;border-radius:8px;border:1px solid var(--divider-color,#ccc);background:var(--card-background-color,#fff);color:var(--primary-text-color)}
    .fpd-txt,.fpd-txt *{user-select:text;-webkit-user-select:text}.fpd-como a{color:var(--c-acc);word-break:break-all}
    .fpd-prev{border:1px solid var(--c-linha);border-radius:12px;padding:10px 12px;margin:8px 0;display:grid;gap:6px}.fpd-prev ul{margin:0;padding-left:18px;display:grid;gap:3px;font-size:13px}
    .fpd-prev summary{cursor:pointer;font-size:13px}.fpd-lista{max-height:260px;overflow:auto}
    .fpd-esc{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;margin:8px 0}
    .fpd-op{display:grid;gap:3px;text-align:left;border:1px solid var(--c-linha);border-radius:12px;background:var(--c-fundo);color:var(--c-txt);font:inherit;padding:10px 12px;cursor:pointer;min-height:44px}
    .fpd-op small{color:var(--c-sub);font-size:12px;line-height:1.35}.fpd-op:hover{border-color:color-mix(in srgb,var(--c-acc) 50%,var(--c-linha))}
    .fpd-op.on{border-color:var(--c-acc);background:color-mix(in srgb,var(--c-acc) 8%,transparent)}
    .fpd-passos>li{margin-bottom:6px}.fpd-passos ul{margin:4px 0 0;padding-left:18px;display:grid;gap:5px}.fpd-como p{margin:6px 0}
    .fpd-como{margin-top:12px}.fpd-como summary{cursor:pointer;font-weight:600}.fpd-como ol{margin:8px 0;padding-left:20px;display:grid;gap:6px;font-size:13px}
    .fpd-como code{font-size:12px;background:color-mix(in srgb,var(--c-txt) 8%,transparent);padding:1px 5px;border-radius:5px;word-break:break-all}
    .ferro{color:var(--c-erro,#b91c1c)}
    .fcfg-c{padding:4px 16px 16px}.fcfg-corpo{border:0!important;padding:0!important;background:none!important;box-shadow:none!important}
    .fkk-mes input{width:100%;min-width:0;box-sizing:border-box}
    .fpes{display:inline-block;width:10px;height:10px;border-radius:50%;vertical-align:middle}
    #kp-cor{width:100%;height:40px;padding:2px;box-sizing:border-box}
    .fkc-sec2{border:1px solid var(--divider-color,rgba(127,127,127,.25));border-radius:12px;padding:8px 12px 10px;margin:4px 0;display:grid;gap:8px}
    .fkc-sec2 legend{font-size:12px;font-weight:600;padding:0 4px;opacity:.75}
    .fat-url{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:end}
    .fhoras{display:flex;flex-wrap:wrap;gap:4px 10px}.fhoras .chk{font-size:13px}.fl{font-size:13px;opacity:.8}
    .fkf-l{display:grid;gap:8px;margin:6px 0}
    .fkf{display:grid;grid-template-columns:6em minmax(0,1fr) auto;grid-template-areas:"f q x" "t t t" "u p p";gap:6px 8px;align-items:center;padding:8px;border:1px solid var(--c-linha);border-radius:10px}
    .fkf input,.fkf select{min-width:0;width:100%;box-sizing:border-box}.fkf .chk input{width:auto}
    .fkf [data-kf=final]{grid-area:f}.fkf [data-kf=quem]{grid-area:q}.fkf [data-kf=tipo]{grid-area:t}.fkf .ico{grid-area:x}.fkf .chk{grid-area:u}
    .fkf-par{grid-area:p;font-size:13px}
    .fkf:has([data-kf=uso]:checked) .fkf-par{display:none}
    .fkf:not(:has([data-kf=uso]:checked)){background:color-mix(in srgb,var(--c-linha) 35%,transparent)}
    .agrupo{font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--c-sub);padding:0 2px 0 6px;white-space:nowrap}
    .agrupo.sep{border-left:1px solid var(--c-linha);margin-left:6px;padding-left:12px}
    .fin .fs{font-size:12px}
    .fsub{font-size:13.5px;color:var(--c-sub)}
    .fperiodo{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
    .fseg{display:flex;background:var(--c-fundo);border:1px solid var(--c-linha);border-radius:10px;padding:3px}
    .fseg button{font:inherit;background:none;border:0;cursor:pointer;padding:4px 11px;border-radius:7px;font-size:13.5px;color:var(--c-sub)}
    .fseg button.on{background:var(--c-acc);color:var(--text-primary-color,#fff)}
    .fseg.fdir{margin-left:auto}
    .fnav{display:flex;align-items:center;gap:8px;font-size:17px}
    .fdd{position:relative}
    .fddb{font:inherit;font-weight:700;color:var(--c-txt);cursor:pointer;border:1px solid var(--c-linha);border-radius:10px;padding:5px 12px;background:var(--c-fundo)}
    .fmenu{position:absolute;left:0;top:40px;z-index:5;min-width:190px;background:var(--c-fundo);border:1px solid var(--c-linha);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.2);padding:6px;display:grid}
    .fmenu button{font:inherit;color:var(--c-txt);background:none;border:0;cursor:pointer;display:flex;justify-content:space-between;gap:14px;padding:8px 10px;border-radius:8px;font-weight:600}
    .fmenu button small{color:var(--c-sub);font-weight:400}
    .fmenu button.on{background:color-mix(in srgb,var(--c-acc) 13%,transparent);color:var(--c-acc)}
    .fcard{display:block;width:100%;background:var(--c-fundo);border:1px solid var(--c-linha);border-radius:16px;padding:16px;box-sizing:border-box;color:var(--c-txt);font:inherit;text-align:left}
    .fhd{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:12px}
    .fhd h2,.fhd h3{margin:0;font-size:16px}.fhd h3{font-size:14.5px}.fhd small{color:var(--c-sub);font-size:12px}
    .frot{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--c-sub)}
    .fheroi{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr) minmax(0,1fr);gap:14px}
    .fbig{font-size:32px;font-weight:700;letter-spacing:-.5px;margin:2px 0 4px}
    .fritmo{position:relative;height:10px;border-radius:6px;background:color-mix(in srgb,var(--c-txt) 9%,transparent);margin:10px 0 6px}
    .fritmo i{position:absolute;left:0;top:0;bottom:0;border-radius:6px;background:var(--c-acc)}
    .fritmo b{position:absolute;top:-4px;width:2px;height:18px;background:var(--c-txt);opacity:.55}
    .fbox{border-radius:12px;padding:12px;background:color-mix(in srgb,var(--c-txt) 5%,transparent);display:grid;align-content:start;gap:3px}
    .fv{font-size:20px;font-weight:700}.fbreve .fv{font-size:15px;color:var(--c-sub);font-weight:600}
    .fdois{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(0,1fr);gap:12px;align-items:start}
    .fcol{display:grid;gap:12px}
    .fonde{display:grid;grid-template-columns:150px minmax(0,1fr);gap:18px;align-items:center}
    .frosca{position:relative;width:150px;height:150px}.frosca svg{width:100%;height:100%}
    .fmeio{position:absolute;inset:0;display:grid;place-content:center;text-align:center}.fmeio b{font-size:16px}.fmeio span{font-size:11px;color:var(--c-sub)}
    .fcat{border-top:1px solid var(--c-linha)}.fcat:first-child{border-top:0}
    .fcatb,.flin{font:inherit;color:var(--c-txt);background:none;border:0;cursor:pointer;text-align:left;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 12px;padding:8px 4px;width:100%;box-sizing:border-box;border-radius:8px}
    .flin{border-top:1px solid var(--c-linha);border-radius:0;padding:9px 4px}.flin:first-of-type{border-top:0}.flin:disabled{cursor:default;color:var(--c-sub)}
    .fn{font-weight:600}.fn small{color:var(--c-sub);font-weight:400;margin-left:6px}
    .fval{font-weight:600;text-align:right}
    .fbarra{grid-column:1/-1;display:block;height:6px;border-radius:4px;background:color-mix(in srgb,var(--c-txt) 9%,transparent);overflow:hidden}.fbarra i{display:block;height:100%;border-radius:4px}
    .fdot{display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:6px}
    .fsubs{display:grid;gap:2px;margin:0 0 8px 18px}
    .fsb{font:inherit;color:var(--c-txt);background:none;border:0;cursor:pointer;display:flex;justify-content:space-between;padding:5px 4px;font-size:13.5px;border-radius:6px}
    .fsb span:last-child{color:var(--c-sub)}
    .fsb:hover,.fev:hover,.flin:hover:not(:disabled),.fcatb:hover,.fnota:hover{background:color-mix(in srgb,var(--c-txt) 5%,transparent)}
    .fgrade{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px;text-align:center;font-size:12.5px}
    .fds{color:var(--c-sub);font-size:11px}
    .fdia{font:inherit;position:relative;display:block;text-align:center;border:0;background:none;border-radius:9px;padding:6px 0 14px;color:var(--c-sub);font-size:12.5px}
    .fdia.tem{cursor:pointer;background:color-mix(in srgb,var(--c-acc) 12%,transparent);color:var(--c-txt);font-weight:600}
    .fdia.hoje{outline:1.5px solid var(--c-sub)}
    .fdia .fbol{position:absolute;top:5px;right:5px;display:flex;flex-direction:column;gap:2px}.fdia .fbol i{display:block;width:6px;height:6px;border-radius:50%}
    .fdia small{display:block;font-size:11px;letter-spacing:-.2px;font-weight:400;color:var(--c-sub)}
    .fleg{margin-top:8px;display:flex;gap:10px;flex-wrap:wrap}.fleg i{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:4px}
    .fmeses{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px 16px;margin-bottom:8px}
    .ft2{font:inherit;color:var(--c-txt);background:none;border:0;cursor:pointer;display:flex;justify-content:space-between;width:100%;font-size:13px;margin-bottom:5px;padding:0}.ft2 span{color:var(--c-sub)}
    .fg{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:3px}
    .fg i,.fg button{aspect-ratio:1;border-radius:3px;background:color-mix(in srgb,var(--c-txt) 9%,transparent);border:0;padding:0}.fg button{cursor:pointer}.fg i.x{background:transparent}
    .fin .n1{background:color-mix(in srgb,var(--c-acc) 35%,transparent)}.fin .n2{background:color-mix(in srgb,var(--c-acc) 65%,transparent)}.fin .n3{background:var(--c-acc)}
    .fesc{display:flex;gap:4px;align-items:center;font-size:12px;color:var(--c-sub)}.fesc i{width:11px;height:11px;border-radius:3px;background:color-mix(in srgb,var(--c-txt) 9%,transparent)}
    .fanos{display:flex;gap:10px;align-items:flex-end;height:150px}
    .fab{font:inherit;background:none;border:0;cursor:pointer;flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:4px;height:100%;font-size:12px;color:var(--c-sub)}
    .fab i{width:100%;max-width:44px;border-radius:6px 6px 3px 3px;background:var(--c-acc)}.fab b{color:var(--c-txt);font-size:11.5px}
    .fbreve2{border-style:dashed}
    .flinha1{cursor:pointer;display:flex;justify-content:space-between;gap:10px;font-size:14px}
    .fchips{display:flex;gap:6px;flex-wrap:wrap}
    .fchip{font:inherit;cursor:pointer;border:1px solid var(--c-linha);background:var(--c-fundo);border-radius:999px;padding:5px 12px;font-size:13.5px;color:var(--c-sub)}
    .fchip.on{border-color:var(--cor);color:var(--c-txt);background:color-mix(in srgb,var(--cor) 15%,var(--c-fundo));font-weight:600}
    .ftl{display:grid}
    .fev,.fnota{font:inherit;color:var(--c-txt);background:none;border:0;cursor:pointer;text-align:left;display:grid;grid-template-columns:64px 12px minmax(0,1fr) auto;gap:10px;align-items:start;padding:8px 4px;width:100%;box-sizing:border-box;border-radius:8px}
    .fnota{grid-template-columns:64px minmax(0,1fr) auto;border-top:1px solid var(--c-linha);border-radius:0}.fnota:first-of-type{border-top:0}
    .fd{font-size:12.5px;color:var(--c-sub);text-align:right}
    .fp{width:10px;height:10px;border-radius:50%;margin-top:4px}
    .ft3,.fdesc{font-size:14px;min-width:0}.ft3 small,.fdesc small{display:block;color:var(--c-sub);font-size:12px}
    .fvv{font-weight:600;font-size:14px;white-space:nowrap;text-align:right}.fvv small{display:block;font-weight:400;color:var(--c-sub);font-size:11.5px}
    .ftag{font-size:11px;border-radius:6px;padding:1px 6px;margin-left:4px;background:color-mix(in srgb,var(--c-acc) 12%,transparent);color:var(--c-acc)}
    .fduas{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:20px;align-items:start}
    .fitens{display:grid;max-height:min(60vh,520px);overflow:auto}
    .fitem{display:grid;grid-template-columns:58px minmax(0,1fr) auto;gap:8px;padding:7px 2px;border-top:1px solid var(--c-linha);font-size:13.5px}
    .fitem:first-child{border-top:0}
    .fprod{font:inherit;color:var(--c-txt);background:none;border:0;padding:0;cursor:pointer;text-align:left;text-decoration:underline dotted var(--c-sub);text-underline-offset:3px}
    .fsoma{display:flex;justify-content:space-between;gap:10px;padding:6px 2px 0;font-size:13.5px}
    dialog.folha.larga{width:min(940px,calc(100vw - 24px))}
    .fcfg{margin-left:auto;color:var(--c-txt)}
    button.fbox{font:inherit;color:inherit;text-align:left;border:0;cursor:pointer}
    .falerta{background:color-mix(in srgb,var(--c-alerta) 16%,transparent)!important}.falerta b{color:var(--c-alerta)}
    .fpagar{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:4px 8px;border-top:1px solid var(--c-linha);padding:6px 0}
    .fpagar:first-of-type{border-top:0}.fpagar.pago{opacity:.75}
    .fpg-t{font:inherit;color:var(--c-txt);background:none;border:0;cursor:pointer;text-align:left;display:grid;grid-template-columns:28px minmax(0,1fr) auto;gap:8px;align-items:center;padding:4px 2px;border-radius:8px}
    .fpg-t:disabled{cursor:default}.fpg-t:not(:disabled):hover{background:color-mix(in srgb,var(--c-txt) 5%,transparent)}
    .fpg-ic{font-size:18px;text-align:center}.fgd{display:grid;text-align:center;font-weight:600;font-size:15px;line-height:1.1}.fgd small{font-size:11px;font-weight:400;color:var(--c-sub)}
    .fpg-b .fpg{padding:5px 10px;font-size:13px;min-height:0;white-space:nowrap}
    .ffat{grid-column:1/-1;margin:2px 0 6px 30px;border-left:2px solid var(--c-linha);padding-left:6px}
    .fok{font-size:11.5px;color:var(--c-desce);font-weight:600}.fatras{font-size:11.5px;color:var(--c-sobe);font-weight:700}.fhoje{font-size:11.5px;color:var(--c-alerta);font-weight:700}
    .fsem{font:inherit;cursor:pointer;width:100%;text-align:left;border:1px dashed var(--c-alerta);background:color-mix(in srgb,var(--c-alerta) 10%,transparent);color:var(--c-txt);border-radius:10px;padding:8px 10px;margin-bottom:8px;font-size:13.5px}
    .fmesp{display:flex;justify-content:space-between;padding:10px 2px 2px;font-size:13.5px;color:var(--c-sub)}
    .fcarts{display:grid;gap:6px}.fcart{font-size:13.5px}
    .fcramo{padding:10px 0;border-top:1px solid var(--c-linha)}.fcramo:first-of-type{border-top:0}
    .fctit{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:6px}
    .fcsubs{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
    .fcsub{display:inline-flex;align-items:center;border:1px solid var(--c-linha);border-radius:999px;overflow:hidden}
    .fcsn,.fcx{font:inherit;background:none;border:0;cursor:pointer;color:var(--c-txt);padding:4px 10px;font-size:13px}.fcsn small{color:var(--c-sub)}
    .fcx{padding:4px 8px;color:var(--c-sub)}.fcx:hover{color:var(--c-sobe)}
    .fcnova,.fced{display:inline-flex;gap:6px;align-items:center;flex-wrap:wrap}
    .fcnova .btn,.fced .btn{padding:4px 10px;font-size:13px;min-height:0}
    .fcnova input,.fced input{font:inherit;font-size:13.5px;padding:5px 8px;border:1px solid var(--c-linha);border-radius:8px;background:var(--c-fundo);color:var(--c-txt);min-width:0;width:11em}
    .fcregra{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr) minmax(0,1fr) auto;gap:6px;align-items:center;padding:6px 0;border-top:1px solid var(--c-linha);font-size:13.5px}
    .fcregra:first-of-type{border-top:0}.fcloja small{display:block;color:var(--c-sub);font-size:11.5px}
    .fcregra select{font:inherit;font-size:13px;padding:4px;border:1px solid var(--c-linha);border-radius:8px;background:var(--c-fundo);color:var(--c-txt);min-width:0}
    .it.dq{background:#fff3b0;border-radius:3px;box-shadow:-4px 0 0 #fff3b0,4px 0 0 #fff3b0}
    @media (max-width:600px){.agrupo{display:none}.fcregra{grid-template-columns:minmax(0,1fr) auto}.fcregra select{grid-column:1/-1}}
    @media (max-width:480px){.abas .aba{padding:8px 6px;font-size:14px}.abas .sino{padding:4px 2px;margin-left:auto}}
    @media (max-width:860px){.fheroi{grid-template-columns:1fr 1fr}.fheroi>div:first-child{grid-column:1/-1}.fdois,.fduas{grid-template-columns:1fr}.fmeses{grid-template-columns:repeat(3,minmax(0,1fr))}.fseg.fdir{margin-left:0}}
    @media (max-width:480px){.fonde{grid-template-columns:1fr;justify-items:center}.fcats{width:100%}.fbig{font-size:28px}.fmeses{grid-template-columns:repeat(2,minmax(0,1fr))}.fdia small{display:none}.fdia{padding:6px 0 10px}}`;
  };
}


// ----- compras-card ----------------------------------------------------------

// =============================================================================
// Central de Compras — aba "Compras" do painel Dashboard
//
// Lê e altera as compras pelo script /config/compras/compras_update.py, chamado pelo
// shell_command.compras_registrar com resposta (nada fica numa pasta pública do HA;
// o link do QR Code, que abre a nota com nome/CPF, nunca chega ao card).
// Cores vêm do tema do Home Assistant (claro, escuro ou temas instalados).
//
// Uso no painel:  type: custom:compras-card
// Abas de Finanças (Resumo, Áreas, A pagar) ficam em compras-financas.js, carregado junto.
// =============================================================================

// instalarFinancas: incluído acima (compras-financas)

const COMPRAS_CARD_VERSION = "2026-11-22a";
// Estado da nota pelos 2 primeiros números da chave (código IBGE da UF)
const COMPRAS_UF = { 11: "RO", 12: "AC", 13: "AM", 14: "RR", 15: "PA", 16: "AP", 17: "TO", 21: "MA", 22: "PI", 23: "CE", 24: "RN",
  25: "PB", 26: "PE", 27: "AL", 28: "SE", 29: "BA", 31: "MG", 32: "ES", 33: "RJ", 35: "SP", 41: "PR", 42: "SC", 43: "RS",
  50: "MS", 51: "MT", 52: "GO", 53: "DF" };
const COMPRAS_PORTAL_NFE = "https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx?tipoConsulta=resumo&tipoConteudo=7PhJ+gAVw2g=";

// Ícones (desenhos do Material Design, os mesmos do Home Assistant)
const COMPRAS_IC = {
  atualizar: "M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z",
  lapis: "M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z",
  sino: "M21,19V20H3V19L5,17V11C5,7.9 7.03,5.17 10,4.29C10,4.19 10,4.1 10,4A2,2 0 0,1 12,2A2,2 0 0,1 14,4C14,4.1 14,4.19 14,4.29C16.97,5.17 19,7.9 19,11V17L21,19M14,21A2,2 0 0,1 12,23A2,2 0 0,1 10,21",
};
const COMPRAS_SVG = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${COMPRAS_IC[k]}"/></svg>`;
const COMPRAS_TIPOS_PAG = ["Crédito", "Débito", "Benefício", "Pix", "Saldo em carteira", "Dinheiro", "Boleto", "Outro"];
const COMPRAS_MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho",
  "agosto", "setembro", "outubro", "novembro", "dezembro"];

// QR Code Generator for JavaScript — Copyright (c) 2009 Kazuhiko Arase — MIT (qrcode-generator 1.4.4)
const COMPRAS_QR = (() => {
//---------------------------------------------------------------------
//
// QR Code Generator for JavaScript
//
// Copyright (c) 2009 Kazuhiko Arase
//
// URL: http://www.d-project.com/
//
// Licensed under the MIT license:
//  http://www.opensource.org/licenses/mit-license.php
//
// The word 'QR Code' is registered trademark of
// DENSO WAVE INCORPORATED
//  http://www.denso-wave.com/qrcode/faqpatent-e.html
//
//---------------------------------------------------------------------

var qrcode = function() {

  //---------------------------------------------------------------------
  // qrcode
  //---------------------------------------------------------------------

  /**
   * qrcode
   * @param typeNumber 1 to 40
   * @param errorCorrectionLevel 'L','M','Q','H'
   */
  var qrcode = function(typeNumber, errorCorrectionLevel) {

    var PAD0 = 0xEC;
    var PAD1 = 0x11;

    var _typeNumber = typeNumber;
    var _errorCorrectionLevel = QRErrorCorrectionLevel[errorCorrectionLevel];
    var _modules = null;
    var _moduleCount = 0;
    var _dataCache = null;
    var _dataList = [];

    var _this = {};

    var makeImpl = function(test, maskPattern) {

      _moduleCount = _typeNumber * 4 + 17;
      _modules = function(moduleCount) {
        var modules = new Array(moduleCount);
        for (var row = 0; row < moduleCount; row += 1) {
          modules[row] = new Array(moduleCount);
          for (var col = 0; col < moduleCount; col += 1) {
            modules[row][col] = null;
          }
        }
        return modules;
      }(_moduleCount);

      setupPositionProbePattern(0, 0);
      setupPositionProbePattern(_moduleCount - 7, 0);
      setupPositionProbePattern(0, _moduleCount - 7);
      setupPositionAdjustPattern();
      setupTimingPattern();
      setupTypeInfo(test, maskPattern);

      if (_typeNumber >= 7) {
        setupTypeNumber(test);
      }

      if (_dataCache == null) {
        _dataCache = createData(_typeNumber, _errorCorrectionLevel, _dataList);
      }

      mapData(_dataCache, maskPattern);
    };

    var setupPositionProbePattern = function(row, col) {

      for (var r = -1; r <= 7; r += 1) {

        if (row + r <= -1 || _moduleCount <= row + r) continue;

        for (var c = -1; c <= 7; c += 1) {

          if (col + c <= -1 || _moduleCount <= col + c) continue;

          if ( (0 <= r && r <= 6 && (c == 0 || c == 6) )
              || (0 <= c && c <= 6 && (r == 0 || r == 6) )
              || (2 <= r && r <= 4 && 2 <= c && c <= 4) ) {
            _modules[row + r][col + c] = true;
          } else {
            _modules[row + r][col + c] = false;
          }
        }
      }
    };

    var getBestMaskPattern = function() {

      var minLostPoint = 0;
      var pattern = 0;

      for (var i = 0; i < 8; i += 1) {

        makeImpl(true, i);

        var lostPoint = QRUtil.getLostPoint(_this);

        if (i == 0 || minLostPoint > lostPoint) {
          minLostPoint = lostPoint;
          pattern = i;
        }
      }

      return pattern;
    };

    var setupTimingPattern = function() {

      for (var r = 8; r < _moduleCount - 8; r += 1) {
        if (_modules[r][6] != null) {
          continue;
        }
        _modules[r][6] = (r % 2 == 0);
      }

      for (var c = 8; c < _moduleCount - 8; c += 1) {
        if (_modules[6][c] != null) {
          continue;
        }
        _modules[6][c] = (c % 2 == 0);
      }
    };

    var setupPositionAdjustPattern = function() {

      var pos = QRUtil.getPatternPosition(_typeNumber);

      for (var i = 0; i < pos.length; i += 1) {

        for (var j = 0; j < pos.length; j += 1) {

          var row = pos[i];
          var col = pos[j];

          if (_modules[row][col] != null) {
            continue;
          }

          for (var r = -2; r <= 2; r += 1) {

            for (var c = -2; c <= 2; c += 1) {

              if (r == -2 || r == 2 || c == -2 || c == 2
                  || (r == 0 && c == 0) ) {
                _modules[row + r][col + c] = true;
              } else {
                _modules[row + r][col + c] = false;
              }
            }
          }
        }
      }
    };

    var setupTypeNumber = function(test) {

      var bits = QRUtil.getBCHTypeNumber(_typeNumber);

      for (var i = 0; i < 18; i += 1) {
        var mod = (!test && ( (bits >> i) & 1) == 1);
        _modules[Math.floor(i / 3)][i % 3 + _moduleCount - 8 - 3] = mod;
      }

      for (var i = 0; i < 18; i += 1) {
        var mod = (!test && ( (bits >> i) & 1) == 1);
        _modules[i % 3 + _moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
      }
    };

    var setupTypeInfo = function(test, maskPattern) {

      var data = (_errorCorrectionLevel << 3) | maskPattern;
      var bits = QRUtil.getBCHTypeInfo(data);

      // vertical
      for (var i = 0; i < 15; i += 1) {

        var mod = (!test && ( (bits >> i) & 1) == 1);

        if (i < 6) {
          _modules[i][8] = mod;
        } else if (i < 8) {
          _modules[i + 1][8] = mod;
        } else {
          _modules[_moduleCount - 15 + i][8] = mod;
        }
      }

      // horizontal
      for (var i = 0; i < 15; i += 1) {

        var mod = (!test && ( (bits >> i) & 1) == 1);

        if (i < 8) {
          _modules[8][_moduleCount - i - 1] = mod;
        } else if (i < 9) {
          _modules[8][15 - i - 1 + 1] = mod;
        } else {
          _modules[8][15 - i - 1] = mod;
        }
      }

      // fixed module
      _modules[_moduleCount - 8][8] = (!test);
    };

    var mapData = function(data, maskPattern) {

      var inc = -1;
      var row = _moduleCount - 1;
      var bitIndex = 7;
      var byteIndex = 0;
      var maskFunc = QRUtil.getMaskFunction(maskPattern);

      for (var col = _moduleCount - 1; col > 0; col -= 2) {

        if (col == 6) col -= 1;

        while (true) {

          for (var c = 0; c < 2; c += 1) {

            if (_modules[row][col - c] == null) {

              var dark = false;

              if (byteIndex < data.length) {
                dark = ( ( (data[byteIndex] >>> bitIndex) & 1) == 1);
              }

              var mask = maskFunc(row, col - c);

              if (mask) {
                dark = !dark;
              }

              _modules[row][col - c] = dark;
              bitIndex -= 1;

              if (bitIndex == -1) {
                byteIndex += 1;
                bitIndex = 7;
              }
            }
          }

          row += inc;

          if (row < 0 || _moduleCount <= row) {
            row -= inc;
            inc = -inc;
            break;
          }
        }
      }
    };

    var createBytes = function(buffer, rsBlocks) {

      var offset = 0;

      var maxDcCount = 0;
      var maxEcCount = 0;

      var dcdata = new Array(rsBlocks.length);
      var ecdata = new Array(rsBlocks.length);

      for (var r = 0; r < rsBlocks.length; r += 1) {

        var dcCount = rsBlocks[r].dataCount;
        var ecCount = rsBlocks[r].totalCount - dcCount;

        maxDcCount = Math.max(maxDcCount, dcCount);
        maxEcCount = Math.max(maxEcCount, ecCount);

        dcdata[r] = new Array(dcCount);

        for (var i = 0; i < dcdata[r].length; i += 1) {
          dcdata[r][i] = 0xff & buffer.getBuffer()[i + offset];
        }
        offset += dcCount;

        var rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
        var rawPoly = qrPolynomial(dcdata[r], rsPoly.getLength() - 1);

        var modPoly = rawPoly.mod(rsPoly);
        ecdata[r] = new Array(rsPoly.getLength() - 1);
        for (var i = 0; i < ecdata[r].length; i += 1) {
          var modIndex = i + modPoly.getLength() - ecdata[r].length;
          ecdata[r][i] = (modIndex >= 0)? modPoly.getAt(modIndex) : 0;
        }
      }

      var totalCodeCount = 0;
      for (var i = 0; i < rsBlocks.length; i += 1) {
        totalCodeCount += rsBlocks[i].totalCount;
      }

      var data = new Array(totalCodeCount);
      var index = 0;

      for (var i = 0; i < maxDcCount; i += 1) {
        for (var r = 0; r < rsBlocks.length; r += 1) {
          if (i < dcdata[r].length) {
            data[index] = dcdata[r][i];
            index += 1;
          }
        }
      }

      for (var i = 0; i < maxEcCount; i += 1) {
        for (var r = 0; r < rsBlocks.length; r += 1) {
          if (i < ecdata[r].length) {
            data[index] = ecdata[r][i];
            index += 1;
          }
        }
      }

      return data;
    };

    var createData = function(typeNumber, errorCorrectionLevel, dataList) {

      var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectionLevel);

      var buffer = qrBitBuffer();

      for (var i = 0; i < dataList.length; i += 1) {
        var data = dataList[i];
        buffer.put(data.getMode(), 4);
        buffer.put(data.getLength(), QRUtil.getLengthInBits(data.getMode(), typeNumber) );
        data.write(buffer);
      }

      // calc num max data.
      var totalDataCount = 0;
      for (var i = 0; i < rsBlocks.length; i += 1) {
        totalDataCount += rsBlocks[i].dataCount;
      }

      if (buffer.getLengthInBits() > totalDataCount * 8) {
        throw 'code length overflow. ('
          + buffer.getLengthInBits()
          + '>'
          + totalDataCount * 8
          + ')';
      }

      // end code
      if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
        buffer.put(0, 4);
      }

      // padding
      while (buffer.getLengthInBits() % 8 != 0) {
        buffer.putBit(false);
      }

      // padding
      while (true) {

        if (buffer.getLengthInBits() >= totalDataCount * 8) {
          break;
        }
        buffer.put(PAD0, 8);

        if (buffer.getLengthInBits() >= totalDataCount * 8) {
          break;
        }
        buffer.put(PAD1, 8);
      }

      return createBytes(buffer, rsBlocks);
    };

    _this.addData = function(data, mode) {

      mode = mode || 'Byte';

      var newData = null;

      switch(mode) {
      case 'Numeric' :
        newData = qrNumber(data);
        break;
      case 'Alphanumeric' :
        newData = qrAlphaNum(data);
        break;
      case 'Byte' :
        newData = qr8BitByte(data);
        break;
      case 'Kanji' :
        newData = qrKanji(data);
        break;
      default :
        throw 'mode:' + mode;
      }

      _dataList.push(newData);
      _dataCache = null;
    };

    _this.isDark = function(row, col) {
      if (row < 0 || _moduleCount <= row || col < 0 || _moduleCount <= col) {
        throw row + ',' + col;
      }
      return _modules[row][col];
    };

    _this.getModuleCount = function() {
      return _moduleCount;
    };

    _this.make = function() {
      if (_typeNumber < 1) {
        var typeNumber = 1;

        for (; typeNumber < 40; typeNumber++) {
          var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, _errorCorrectionLevel);
          var buffer = qrBitBuffer();

          for (var i = 0; i < _dataList.length; i++) {
            var data = _dataList[i];
            buffer.put(data.getMode(), 4);
            buffer.put(data.getLength(), QRUtil.getLengthInBits(data.getMode(), typeNumber) );
            data.write(buffer);
          }

          var totalDataCount = 0;
          for (var i = 0; i < rsBlocks.length; i++) {
            totalDataCount += rsBlocks[i].dataCount;
          }

          if (buffer.getLengthInBits() <= totalDataCount * 8) {
            break;
          }
        }

        _typeNumber = typeNumber;
      }

      makeImpl(false, getBestMaskPattern() );
    };

    _this.createTableTag = function(cellSize, margin) {

      cellSize = cellSize || 2;
      margin = (typeof margin == 'undefined')? cellSize * 4 : margin;

      var qrHtml = '';

      qrHtml += '<table style="';
      qrHtml += ' border-width: 0px; border-style: none;';
      qrHtml += ' border-collapse: collapse;';
      qrHtml += ' padding: 0px; margin: ' + margin + 'px;';
      qrHtml += '">';
      qrHtml += '<tbody>';

      for (var r = 0; r < _this.getModuleCount(); r += 1) {

        qrHtml += '<tr>';

        for (var c = 0; c < _this.getModuleCount(); c += 1) {
          qrHtml += '<td style="';
          qrHtml += ' border-width: 0px; border-style: none;';
          qrHtml += ' border-collapse: collapse;';
          qrHtml += ' padding: 0px; margin: 0px;';
          qrHtml += ' width: ' + cellSize + 'px;';
          qrHtml += ' height: ' + cellSize + 'px;';
          qrHtml += ' background-color: ';
          qrHtml += _this.isDark(r, c)? '#000000' : '#ffffff';
          qrHtml += ';';
          qrHtml += '"/>';
        }

        qrHtml += '</tr>';
      }

      qrHtml += '</tbody>';
      qrHtml += '</table>';

      return qrHtml;
    };

    _this.createSvgTag = function(cellSize, margin, alt, title) {

      var opts = {};
      if (typeof arguments[0] == 'object') {
        // Called by options.
        opts = arguments[0];
        // overwrite cellSize and margin.
        cellSize = opts.cellSize;
        margin = opts.margin;
        alt = opts.alt;
        title = opts.title;
      }

      cellSize = cellSize || 2;
      margin = (typeof margin == 'undefined')? cellSize * 4 : margin;

      // Compose alt property surrogate
      alt = (typeof alt === 'string') ? {text: alt} : alt || {};
      alt.text = alt.text || null;
      alt.id = (alt.text) ? alt.id || 'qrcode-description' : null;

      // Compose title property surrogate
      title = (typeof title === 'string') ? {text: title} : title || {};
      title.text = title.text || null;
      title.id = (title.text) ? title.id || 'qrcode-title' : null;

      var size = _this.getModuleCount() * cellSize + margin * 2;
      var c, mc, r, mr, qrSvg='', rect;

      rect = 'l' + cellSize + ',0 0,' + cellSize +
        ' -' + cellSize + ',0 0,-' + cellSize + 'z ';

      qrSvg += '<svg version="1.1" xmlns="http://www.w3.org/2000/svg"';
      qrSvg += !opts.scalable ? ' width="' + size + 'px" height="' + size + 'px"' : '';
      qrSvg += ' viewBox="0 0 ' + size + ' ' + size + '" ';
      qrSvg += ' preserveAspectRatio="xMinYMin meet"';
      qrSvg += (title.text || alt.text) ? ' role="img" aria-labelledby="' +
          escapeXml([title.id, alt.id].join(' ').trim() ) + '"' : '';
      qrSvg += '>';
      qrSvg += (title.text) ? '<title id="' + escapeXml(title.id) + '">' +
          escapeXml(title.text) + '</title>' : '';
      qrSvg += (alt.text) ? '<description id="' + escapeXml(alt.id) + '">' +
          escapeXml(alt.text) + '</description>' : '';
      qrSvg += '<rect width="100%" height="100%" fill="white" cx="0" cy="0"/>';
      qrSvg += '<path d="';

      for (r = 0; r < _this.getModuleCount(); r += 1) {
        mr = r * cellSize + margin;
        for (c = 0; c < _this.getModuleCount(); c += 1) {
          if (_this.isDark(r, c) ) {
            mc = c*cellSize+margin;
            qrSvg += 'M' + mc + ',' + mr + rect;
          }
        }
      }

      qrSvg += '" stroke="transparent" fill="black"/>';
      qrSvg += '</svg>';

      return qrSvg;
    };

    _this.createDataURL = function(cellSize, margin) {

      cellSize = cellSize || 2;
      margin = (typeof margin == 'undefined')? cellSize * 4 : margin;

      var size = _this.getModuleCount() * cellSize + margin * 2;
      var min = margin;
      var max = size - margin;

      return createDataURL(size, size, function(x, y) {
        if (min <= x && x < max && min <= y && y < max) {
          var c = Math.floor( (x - min) / cellSize);
          var r = Math.floor( (y - min) / cellSize);
          return _this.isDark(r, c)? 0 : 1;
        } else {
          return 1;
        }
      } );
    };

    _this.createImgTag = function(cellSize, margin, alt) {

      cellSize = cellSize || 2;
      margin = (typeof margin == 'undefined')? cellSize * 4 : margin;

      var size = _this.getModuleCount() * cellSize + margin * 2;

      var img = '';
      img += '<img';
      img += '\u0020src="';
      img += _this.createDataURL(cellSize, margin);
      img += '"';
      img += '\u0020width="';
      img += size;
      img += '"';
      img += '\u0020height="';
      img += size;
      img += '"';
      if (alt) {
        img += '\u0020alt="';
        img += escapeXml(alt);
        img += '"';
      }
      img += '/>';

      return img;
    };

    var escapeXml = function(s) {
      var escaped = '';
      for (var i = 0; i < s.length; i += 1) {
        var c = s.charAt(i);
        switch(c) {
        case '<': escaped += '&lt;'; break;
        case '>': escaped += '&gt;'; break;
        case '&': escaped += '&amp;'; break;
        case '"': escaped += '&quot;'; break;
        default : escaped += c; break;
        }
      }
      return escaped;
    };

    var _createHalfASCII = function(margin) {
      var cellSize = 1;
      margin = (typeof margin == 'undefined')? cellSize * 2 : margin;

      var size = _this.getModuleCount() * cellSize + margin * 2;
      var min = margin;
      var max = size - margin;

      var y, x, r1, r2, p;

      var blocks = {
        '██': '█',
        '█ ': '▀',
        ' █': '▄',
        '  ': ' '
      };

      var blocksLastLineNoMargin = {
        '██': '▀',
        '█ ': '▀',
        ' █': ' ',
        '  ': ' '
      };

      var ascii = '';
      for (y = 0; y < size; y += 2) {
        r1 = Math.floor((y - min) / cellSize);
        r2 = Math.floor((y + 1 - min) / cellSize);
        for (x = 0; x < size; x += 1) {
          p = '█';

          if (min <= x && x < max && min <= y && y < max && _this.isDark(r1, Math.floor((x - min) / cellSize))) {
            p = ' ';
          }

          if (min <= x && x < max && min <= y+1 && y+1 < max && _this.isDark(r2, Math.floor((x - min) / cellSize))) {
            p += ' ';
          }
          else {
            p += '█';
          }

          // Output 2 characters per pixel, to create full square. 1 character per pixels gives only half width of square.
          ascii += (margin < 1 && y+1 >= max) ? blocksLastLineNoMargin[p] : blocks[p];
        }

        ascii += '\n';
      }

      if (size % 2 && margin > 0) {
        return ascii.substring(0, ascii.length - size - 1) + Array(size+1).join('▀');
      }

      return ascii.substring(0, ascii.length-1);
    };

    _this.createASCII = function(cellSize, margin) {
      cellSize = cellSize || 1;

      if (cellSize < 2) {
        return _createHalfASCII(margin);
      }

      cellSize -= 1;
      margin = (typeof margin == 'undefined')? cellSize * 2 : margin;

      var size = _this.getModuleCount() * cellSize + margin * 2;
      var min = margin;
      var max = size - margin;

      var y, x, r, p;

      var white = Array(cellSize+1).join('██');
      var black = Array(cellSize+1).join('  ');

      var ascii = '';
      var line = '';
      for (y = 0; y < size; y += 1) {
        r = Math.floor( (y - min) / cellSize);
        line = '';
        for (x = 0; x < size; x += 1) {
          p = 1;

          if (min <= x && x < max && min <= y && y < max && _this.isDark(r, Math.floor((x - min) / cellSize))) {
            p = 0;
          }

          // Output 2 characters per pixel, to create full square. 1 character per pixels gives only half width of square.
          line += p ? white : black;
        }

        for (r = 0; r < cellSize; r += 1) {
          ascii += line + '\n';
        }
      }

      return ascii.substring(0, ascii.length-1);
    };

    _this.renderTo2dContext = function(context, cellSize) {
      cellSize = cellSize || 2;
      var length = _this.getModuleCount();
      for (var row = 0; row < length; row++) {
        for (var col = 0; col < length; col++) {
          context.fillStyle = _this.isDark(row, col) ? 'black' : 'white';
          context.fillRect(row * cellSize, col * cellSize, cellSize, cellSize);
        }
      }
    }

    return _this;
  };

  //---------------------------------------------------------------------
  // qrcode.stringToBytes
  //---------------------------------------------------------------------

  qrcode.stringToBytesFuncs = {
    'default' : function(s) {
      var bytes = [];
      for (var i = 0; i < s.length; i += 1) {
        var c = s.charCodeAt(i);
        bytes.push(c & 0xff);
      }
      return bytes;
    }
  };

  qrcode.stringToBytes = qrcode.stringToBytesFuncs['default'];

  //---------------------------------------------------------------------
  // qrcode.createStringToBytes
  //---------------------------------------------------------------------

  /**
   * @param unicodeData base64 string of byte array.
   * [16bit Unicode],[16bit Bytes], ...
   * @param numChars
   */
  qrcode.createStringToBytes = function(unicodeData, numChars) {

    // create conversion map.

    var unicodeMap = function() {

      var bin = base64DecodeInputStream(unicodeData);
      var read = function() {
        var b = bin.read();
        if (b == -1) throw 'eof';
        return b;
      };

      var count = 0;
      var unicodeMap = {};
      while (true) {
        var b0 = bin.read();
        if (b0 == -1) break;
        var b1 = read();
        var b2 = read();
        var b3 = read();
        var k = String.fromCharCode( (b0 << 8) | b1);
        var v = (b2 << 8) | b3;
        unicodeMap[k] = v;
        count += 1;
      }
      if (count != numChars) {
        throw count + ' != ' + numChars;
      }

      return unicodeMap;
    }();

    var unknownChar = '?'.charCodeAt(0);

    return function(s) {
      var bytes = [];
      for (var i = 0; i < s.length; i += 1) {
        var c = s.charCodeAt(i);
        if (c < 128) {
          bytes.push(c);
        } else {
          var b = unicodeMap[s.charAt(i)];
          if (typeof b == 'number') {
            if ( (b & 0xff) == b) {
              // 1byte
              bytes.push(b);
            } else {
              // 2bytes
              bytes.push(b >>> 8);
              bytes.push(b & 0xff);
            }
          } else {
            bytes.push(unknownChar);
          }
        }
      }
      return bytes;
    };
  };

  //---------------------------------------------------------------------
  // QRMode
  //---------------------------------------------------------------------

  var QRMode = {
    MODE_NUMBER :    1 << 0,
    MODE_ALPHA_NUM : 1 << 1,
    MODE_8BIT_BYTE : 1 << 2,
    MODE_KANJI :     1 << 3
  };

  //---------------------------------------------------------------------
  // QRErrorCorrectionLevel
  //---------------------------------------------------------------------

  var QRErrorCorrectionLevel = {
    L : 1,
    M : 0,
    Q : 3,
    H : 2
  };

  //---------------------------------------------------------------------
  // QRMaskPattern
  //---------------------------------------------------------------------

  var QRMaskPattern = {
    PATTERN000 : 0,
    PATTERN001 : 1,
    PATTERN010 : 2,
    PATTERN011 : 3,
    PATTERN100 : 4,
    PATTERN101 : 5,
    PATTERN110 : 6,
    PATTERN111 : 7
  };

  //---------------------------------------------------------------------
  // QRUtil
  //---------------------------------------------------------------------

  var QRUtil = function() {

    var PATTERN_POSITION_TABLE = [
      [],
      [6, 18],
      [6, 22],
      [6, 26],
      [6, 30],
      [6, 34],
      [6, 22, 38],
      [6, 24, 42],
      [6, 26, 46],
      [6, 28, 50],
      [6, 30, 54],
      [6, 32, 58],
      [6, 34, 62],
      [6, 26, 46, 66],
      [6, 26, 48, 70],
      [6, 26, 50, 74],
      [6, 30, 54, 78],
      [6, 30, 56, 82],
      [6, 30, 58, 86],
      [6, 34, 62, 90],
      [6, 28, 50, 72, 94],
      [6, 26, 50, 74, 98],
      [6, 30, 54, 78, 102],
      [6, 28, 54, 80, 106],
      [6, 32, 58, 84, 110],
      [6, 30, 58, 86, 114],
      [6, 34, 62, 90, 118],
      [6, 26, 50, 74, 98, 122],
      [6, 30, 54, 78, 102, 126],
      [6, 26, 52, 78, 104, 130],
      [6, 30, 56, 82, 108, 134],
      [6, 34, 60, 86, 112, 138],
      [6, 30, 58, 86, 114, 142],
      [6, 34, 62, 90, 118, 146],
      [6, 30, 54, 78, 102, 126, 150],
      [6, 24, 50, 76, 102, 128, 154],
      [6, 28, 54, 80, 106, 132, 158],
      [6, 32, 58, 84, 110, 136, 162],
      [6, 26, 54, 82, 110, 138, 166],
      [6, 30, 58, 86, 114, 142, 170]
    ];
    var G15 = (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0);
    var G18 = (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0);
    var G15_MASK = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1);

    var _this = {};

    var getBCHDigit = function(data) {
      var digit = 0;
      while (data != 0) {
        digit += 1;
        data >>>= 1;
      }
      return digit;
    };

    _this.getBCHTypeInfo = function(data) {
      var d = data << 10;
      while (getBCHDigit(d) - getBCHDigit(G15) >= 0) {
        d ^= (G15 << (getBCHDigit(d) - getBCHDigit(G15) ) );
      }
      return ( (data << 10) | d) ^ G15_MASK;
    };

    _this.getBCHTypeNumber = function(data) {
      var d = data << 12;
      while (getBCHDigit(d) - getBCHDigit(G18) >= 0) {
        d ^= (G18 << (getBCHDigit(d) - getBCHDigit(G18) ) );
      }
      return (data << 12) | d;
    };

    _this.getPatternPosition = function(typeNumber) {
      return PATTERN_POSITION_TABLE[typeNumber - 1];
    };

    _this.getMaskFunction = function(maskPattern) {

      switch (maskPattern) {

      case QRMaskPattern.PATTERN000 :
        return function(i, j) { return (i + j) % 2 == 0; };
      case QRMaskPattern.PATTERN001 :
        return function(i, j) { return i % 2 == 0; };
      case QRMaskPattern.PATTERN010 :
        return function(i, j) { return j % 3 == 0; };
      case QRMaskPattern.PATTERN011 :
        return function(i, j) { return (i + j) % 3 == 0; };
      case QRMaskPattern.PATTERN100 :
        return function(i, j) { return (Math.floor(i / 2) + Math.floor(j / 3) ) % 2 == 0; };
      case QRMaskPattern.PATTERN101 :
        return function(i, j) { return (i * j) % 2 + (i * j) % 3 == 0; };
      case QRMaskPattern.PATTERN110 :
        return function(i, j) { return ( (i * j) % 2 + (i * j) % 3) % 2 == 0; };
      case QRMaskPattern.PATTERN111 :
        return function(i, j) { return ( (i * j) % 3 + (i + j) % 2) % 2 == 0; };

      default :
        throw 'bad maskPattern:' + maskPattern;
      }
    };

    _this.getErrorCorrectPolynomial = function(errorCorrectLength) {
      var a = qrPolynomial([1], 0);
      for (var i = 0; i < errorCorrectLength; i += 1) {
        a = a.multiply(qrPolynomial([1, QRMath.gexp(i)], 0) );
      }
      return a;
    };

    _this.getLengthInBits = function(mode, type) {

      if (1 <= type && type < 10) {

        // 1 - 9

        switch(mode) {
        case QRMode.MODE_NUMBER    : return 10;
        case QRMode.MODE_ALPHA_NUM : return 9;
        case QRMode.MODE_8BIT_BYTE : return 8;
        case QRMode.MODE_KANJI     : return 8;
        default :
          throw 'mode:' + mode;
        }

      } else if (type < 27) {

        // 10 - 26

        switch(mode) {
        case QRMode.MODE_NUMBER    : return 12;
        case QRMode.MODE_ALPHA_NUM : return 11;
        case QRMode.MODE_8BIT_BYTE : return 16;
        case QRMode.MODE_KANJI     : return 10;
        default :
          throw 'mode:' + mode;
        }

      } else if (type < 41) {

        // 27 - 40

        switch(mode) {
        case QRMode.MODE_NUMBER    : return 14;
        case QRMode.MODE_ALPHA_NUM : return 13;
        case QRMode.MODE_8BIT_BYTE : return 16;
        case QRMode.MODE_KANJI     : return 12;
        default :
          throw 'mode:' + mode;
        }

      } else {
        throw 'type:' + type;
      }
    };

    _this.getLostPoint = function(qrcode) {

      var moduleCount = qrcode.getModuleCount();

      var lostPoint = 0;

      // LEVEL1

      for (var row = 0; row < moduleCount; row += 1) {
        for (var col = 0; col < moduleCount; col += 1) {

          var sameCount = 0;
          var dark = qrcode.isDark(row, col);

          for (var r = -1; r <= 1; r += 1) {

            if (row + r < 0 || moduleCount <= row + r) {
              continue;
            }

            for (var c = -1; c <= 1; c += 1) {

              if (col + c < 0 || moduleCount <= col + c) {
                continue;
              }

              if (r == 0 && c == 0) {
                continue;
              }

              if (dark == qrcode.isDark(row + r, col + c) ) {
                sameCount += 1;
              }
            }
          }

          if (sameCount > 5) {
            lostPoint += (3 + sameCount - 5);
          }
        }
      };

      // LEVEL2

      for (var row = 0; row < moduleCount - 1; row += 1) {
        for (var col = 0; col < moduleCount - 1; col += 1) {
          var count = 0;
          if (qrcode.isDark(row, col) ) count += 1;
          if (qrcode.isDark(row + 1, col) ) count += 1;
          if (qrcode.isDark(row, col + 1) ) count += 1;
          if (qrcode.isDark(row + 1, col + 1) ) count += 1;
          if (count == 0 || count == 4) {
            lostPoint += 3;
          }
        }
      }

      // LEVEL3

      for (var row = 0; row < moduleCount; row += 1) {
        for (var col = 0; col < moduleCount - 6; col += 1) {
          if (qrcode.isDark(row, col)
              && !qrcode.isDark(row, col + 1)
              &&  qrcode.isDark(row, col + 2)
              &&  qrcode.isDark(row, col + 3)
              &&  qrcode.isDark(row, col + 4)
              && !qrcode.isDark(row, col + 5)
              &&  qrcode.isDark(row, col + 6) ) {
            lostPoint += 40;
          }
        }
      }

      for (var col = 0; col < moduleCount; col += 1) {
        for (var row = 0; row < moduleCount - 6; row += 1) {
          if (qrcode.isDark(row, col)
              && !qrcode.isDark(row + 1, col)
              &&  qrcode.isDark(row + 2, col)
              &&  qrcode.isDark(row + 3, col)
              &&  qrcode.isDark(row + 4, col)
              && !qrcode.isDark(row + 5, col)
              &&  qrcode.isDark(row + 6, col) ) {
            lostPoint += 40;
          }
        }
      }

      // LEVEL4

      var darkCount = 0;

      for (var col = 0; col < moduleCount; col += 1) {
        for (var row = 0; row < moduleCount; row += 1) {
          if (qrcode.isDark(row, col) ) {
            darkCount += 1;
          }
        }
      }

      var ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
      lostPoint += ratio * 10;

      return lostPoint;
    };

    return _this;
  }();

  //---------------------------------------------------------------------
  // QRMath
  //---------------------------------------------------------------------

  var QRMath = function() {

    var EXP_TABLE = new Array(256);
    var LOG_TABLE = new Array(256);

    // initialize tables
    for (var i = 0; i < 8; i += 1) {
      EXP_TABLE[i] = 1 << i;
    }
    for (var i = 8; i < 256; i += 1) {
      EXP_TABLE[i] = EXP_TABLE[i - 4]
        ^ EXP_TABLE[i - 5]
        ^ EXP_TABLE[i - 6]
        ^ EXP_TABLE[i - 8];
    }
    for (var i = 0; i < 255; i += 1) {
      LOG_TABLE[EXP_TABLE[i] ] = i;
    }

    var _this = {};

    _this.glog = function(n) {

      if (n < 1) {
        throw 'glog(' + n + ')';
      }

      return LOG_TABLE[n];
    };

    _this.gexp = function(n) {

      while (n < 0) {
        n += 255;
      }

      while (n >= 256) {
        n -= 255;
      }

      return EXP_TABLE[n];
    };

    return _this;
  }();

  //---------------------------------------------------------------------
  // qrPolynomial
  //---------------------------------------------------------------------

  function qrPolynomial(num, shift) {

    if (typeof num.length == 'undefined') {
      throw num.length + '/' + shift;
    }

    var _num = function() {
      var offset = 0;
      while (offset < num.length && num[offset] == 0) {
        offset += 1;
      }
      var _num = new Array(num.length - offset + shift);
      for (var i = 0; i < num.length - offset; i += 1) {
        _num[i] = num[i + offset];
      }
      return _num;
    }();

    var _this = {};

    _this.getAt = function(index) {
      return _num[index];
    };

    _this.getLength = function() {
      return _num.length;
    };

    _this.multiply = function(e) {

      var num = new Array(_this.getLength() + e.getLength() - 1);

      for (var i = 0; i < _this.getLength(); i += 1) {
        for (var j = 0; j < e.getLength(); j += 1) {
          num[i + j] ^= QRMath.gexp(QRMath.glog(_this.getAt(i) ) + QRMath.glog(e.getAt(j) ) );
        }
      }

      return qrPolynomial(num, 0);
    };

    _this.mod = function(e) {

      if (_this.getLength() - e.getLength() < 0) {
        return _this;
      }

      var ratio = QRMath.glog(_this.getAt(0) ) - QRMath.glog(e.getAt(0) );

      var num = new Array(_this.getLength() );
      for (var i = 0; i < _this.getLength(); i += 1) {
        num[i] = _this.getAt(i);
      }

      for (var i = 0; i < e.getLength(); i += 1) {
        num[i] ^= QRMath.gexp(QRMath.glog(e.getAt(i) ) + ratio);
      }

      // recursive call
      return qrPolynomial(num, 0).mod(e);
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // QRRSBlock
  //---------------------------------------------------------------------

  var QRRSBlock = function() {

    var RS_BLOCK_TABLE = [

      // L
      // M
      // Q
      // H

      // 1
      [1, 26, 19],
      [1, 26, 16],
      [1, 26, 13],
      [1, 26, 9],

      // 2
      [1, 44, 34],
      [1, 44, 28],
      [1, 44, 22],
      [1, 44, 16],

      // 3
      [1, 70, 55],
      [1, 70, 44],
      [2, 35, 17],
      [2, 35, 13],

      // 4
      [1, 100, 80],
      [2, 50, 32],
      [2, 50, 24],
      [4, 25, 9],

      // 5
      [1, 134, 108],
      [2, 67, 43],
      [2, 33, 15, 2, 34, 16],
      [2, 33, 11, 2, 34, 12],

      // 6
      [2, 86, 68],
      [4, 43, 27],
      [4, 43, 19],
      [4, 43, 15],

      // 7
      [2, 98, 78],
      [4, 49, 31],
      [2, 32, 14, 4, 33, 15],
      [4, 39, 13, 1, 40, 14],

      // 8
      [2, 121, 97],
      [2, 60, 38, 2, 61, 39],
      [4, 40, 18, 2, 41, 19],
      [4, 40, 14, 2, 41, 15],

      // 9
      [2, 146, 116],
      [3, 58, 36, 2, 59, 37],
      [4, 36, 16, 4, 37, 17],
      [4, 36, 12, 4, 37, 13],

      // 10
      [2, 86, 68, 2, 87, 69],
      [4, 69, 43, 1, 70, 44],
      [6, 43, 19, 2, 44, 20],
      [6, 43, 15, 2, 44, 16],

      // 11
      [4, 101, 81],
      [1, 80, 50, 4, 81, 51],
      [4, 50, 22, 4, 51, 23],
      [3, 36, 12, 8, 37, 13],

      // 12
      [2, 116, 92, 2, 117, 93],
      [6, 58, 36, 2, 59, 37],
      [4, 46, 20, 6, 47, 21],
      [7, 42, 14, 4, 43, 15],

      // 13
      [4, 133, 107],
      [8, 59, 37, 1, 60, 38],
      [8, 44, 20, 4, 45, 21],
      [12, 33, 11, 4, 34, 12],

      // 14
      [3, 145, 115, 1, 146, 116],
      [4, 64, 40, 5, 65, 41],
      [11, 36, 16, 5, 37, 17],
      [11, 36, 12, 5, 37, 13],

      // 15
      [5, 109, 87, 1, 110, 88],
      [5, 65, 41, 5, 66, 42],
      [5, 54, 24, 7, 55, 25],
      [11, 36, 12, 7, 37, 13],

      // 16
      [5, 122, 98, 1, 123, 99],
      [7, 73, 45, 3, 74, 46],
      [15, 43, 19, 2, 44, 20],
      [3, 45, 15, 13, 46, 16],

      // 17
      [1, 135, 107, 5, 136, 108],
      [10, 74, 46, 1, 75, 47],
      [1, 50, 22, 15, 51, 23],
      [2, 42, 14, 17, 43, 15],

      // 18
      [5, 150, 120, 1, 151, 121],
      [9, 69, 43, 4, 70, 44],
      [17, 50, 22, 1, 51, 23],
      [2, 42, 14, 19, 43, 15],

      // 19
      [3, 141, 113, 4, 142, 114],
      [3, 70, 44, 11, 71, 45],
      [17, 47, 21, 4, 48, 22],
      [9, 39, 13, 16, 40, 14],

      // 20
      [3, 135, 107, 5, 136, 108],
      [3, 67, 41, 13, 68, 42],
      [15, 54, 24, 5, 55, 25],
      [15, 43, 15, 10, 44, 16],

      // 21
      [4, 144, 116, 4, 145, 117],
      [17, 68, 42],
      [17, 50, 22, 6, 51, 23],
      [19, 46, 16, 6, 47, 17],

      // 22
      [2, 139, 111, 7, 140, 112],
      [17, 74, 46],
      [7, 54, 24, 16, 55, 25],
      [34, 37, 13],

      // 23
      [4, 151, 121, 5, 152, 122],
      [4, 75, 47, 14, 76, 48],
      [11, 54, 24, 14, 55, 25],
      [16, 45, 15, 14, 46, 16],

      // 24
      [6, 147, 117, 4, 148, 118],
      [6, 73, 45, 14, 74, 46],
      [11, 54, 24, 16, 55, 25],
      [30, 46, 16, 2, 47, 17],

      // 25
      [8, 132, 106, 4, 133, 107],
      [8, 75, 47, 13, 76, 48],
      [7, 54, 24, 22, 55, 25],
      [22, 45, 15, 13, 46, 16],

      // 26
      [10, 142, 114, 2, 143, 115],
      [19, 74, 46, 4, 75, 47],
      [28, 50, 22, 6, 51, 23],
      [33, 46, 16, 4, 47, 17],

      // 27
      [8, 152, 122, 4, 153, 123],
      [22, 73, 45, 3, 74, 46],
      [8, 53, 23, 26, 54, 24],
      [12, 45, 15, 28, 46, 16],

      // 28
      [3, 147, 117, 10, 148, 118],
      [3, 73, 45, 23, 74, 46],
      [4, 54, 24, 31, 55, 25],
      [11, 45, 15, 31, 46, 16],

      // 29
      [7, 146, 116, 7, 147, 117],
      [21, 73, 45, 7, 74, 46],
      [1, 53, 23, 37, 54, 24],
      [19, 45, 15, 26, 46, 16],

      // 30
      [5, 145, 115, 10, 146, 116],
      [19, 75, 47, 10, 76, 48],
      [15, 54, 24, 25, 55, 25],
      [23, 45, 15, 25, 46, 16],

      // 31
      [13, 145, 115, 3, 146, 116],
      [2, 74, 46, 29, 75, 47],
      [42, 54, 24, 1, 55, 25],
      [23, 45, 15, 28, 46, 16],

      // 32
      [17, 145, 115],
      [10, 74, 46, 23, 75, 47],
      [10, 54, 24, 35, 55, 25],
      [19, 45, 15, 35, 46, 16],

      // 33
      [17, 145, 115, 1, 146, 116],
      [14, 74, 46, 21, 75, 47],
      [29, 54, 24, 19, 55, 25],
      [11, 45, 15, 46, 46, 16],

      // 34
      [13, 145, 115, 6, 146, 116],
      [14, 74, 46, 23, 75, 47],
      [44, 54, 24, 7, 55, 25],
      [59, 46, 16, 1, 47, 17],

      // 35
      [12, 151, 121, 7, 152, 122],
      [12, 75, 47, 26, 76, 48],
      [39, 54, 24, 14, 55, 25],
      [22, 45, 15, 41, 46, 16],

      // 36
      [6, 151, 121, 14, 152, 122],
      [6, 75, 47, 34, 76, 48],
      [46, 54, 24, 10, 55, 25],
      [2, 45, 15, 64, 46, 16],

      // 37
      [17, 152, 122, 4, 153, 123],
      [29, 74, 46, 14, 75, 47],
      [49, 54, 24, 10, 55, 25],
      [24, 45, 15, 46, 46, 16],

      // 38
      [4, 152, 122, 18, 153, 123],
      [13, 74, 46, 32, 75, 47],
      [48, 54, 24, 14, 55, 25],
      [42, 45, 15, 32, 46, 16],

      // 39
      [20, 147, 117, 4, 148, 118],
      [40, 75, 47, 7, 76, 48],
      [43, 54, 24, 22, 55, 25],
      [10, 45, 15, 67, 46, 16],

      // 40
      [19, 148, 118, 6, 149, 119],
      [18, 75, 47, 31, 76, 48],
      [34, 54, 24, 34, 55, 25],
      [20, 45, 15, 61, 46, 16]
    ];

    var qrRSBlock = function(totalCount, dataCount) {
      var _this = {};
      _this.totalCount = totalCount;
      _this.dataCount = dataCount;
      return _this;
    };

    var _this = {};

    var getRsBlockTable = function(typeNumber, errorCorrectionLevel) {

      switch(errorCorrectionLevel) {
      case QRErrorCorrectionLevel.L :
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
      case QRErrorCorrectionLevel.M :
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
      case QRErrorCorrectionLevel.Q :
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
      case QRErrorCorrectionLevel.H :
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
      default :
        return undefined;
      }
    };

    _this.getRSBlocks = function(typeNumber, errorCorrectionLevel) {

      var rsBlock = getRsBlockTable(typeNumber, errorCorrectionLevel);

      if (typeof rsBlock == 'undefined') {
        throw 'bad rs block @ typeNumber:' + typeNumber +
            '/errorCorrectionLevel:' + errorCorrectionLevel;
      }

      var length = rsBlock.length / 3;

      var list = [];

      for (var i = 0; i < length; i += 1) {

        var count = rsBlock[i * 3 + 0];
        var totalCount = rsBlock[i * 3 + 1];
        var dataCount = rsBlock[i * 3 + 2];

        for (var j = 0; j < count; j += 1) {
          list.push(qrRSBlock(totalCount, dataCount) );
        }
      }

      return list;
    };

    return _this;
  }();

  //---------------------------------------------------------------------
  // qrBitBuffer
  //---------------------------------------------------------------------

  var qrBitBuffer = function() {

    var _buffer = [];
    var _length = 0;

    var _this = {};

    _this.getBuffer = function() {
      return _buffer;
    };

    _this.getAt = function(index) {
      var bufIndex = Math.floor(index / 8);
      return ( (_buffer[bufIndex] >>> (7 - index % 8) ) & 1) == 1;
    };

    _this.put = function(num, length) {
      for (var i = 0; i < length; i += 1) {
        _this.putBit( ( (num >>> (length - i - 1) ) & 1) == 1);
      }
    };

    _this.getLengthInBits = function() {
      return _length;
    };

    _this.putBit = function(bit) {

      var bufIndex = Math.floor(_length / 8);
      if (_buffer.length <= bufIndex) {
        _buffer.push(0);
      }

      if (bit) {
        _buffer[bufIndex] |= (0x80 >>> (_length % 8) );
      }

      _length += 1;
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // qrNumber
  //---------------------------------------------------------------------

  var qrNumber = function(data) {

    var _mode = QRMode.MODE_NUMBER;
    var _data = data;

    var _this = {};

    _this.getMode = function() {
      return _mode;
    };

    _this.getLength = function(buffer) {
      return _data.length;
    };

    _this.write = function(buffer) {

      var data = _data;

      var i = 0;

      while (i + 2 < data.length) {
        buffer.put(strToNum(data.substring(i, i + 3) ), 10);
        i += 3;
      }

      if (i < data.length) {
        if (data.length - i == 1) {
          buffer.put(strToNum(data.substring(i, i + 1) ), 4);
        } else if (data.length - i == 2) {
          buffer.put(strToNum(data.substring(i, i + 2) ), 7);
        }
      }
    };

    var strToNum = function(s) {
      var num = 0;
      for (var i = 0; i < s.length; i += 1) {
        num = num * 10 + chatToNum(s.charAt(i) );
      }
      return num;
    };

    var chatToNum = function(c) {
      if ('0' <= c && c <= '9') {
        return c.charCodeAt(0) - '0'.charCodeAt(0);
      }
      throw 'illegal char :' + c;
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // qrAlphaNum
  //---------------------------------------------------------------------

  var qrAlphaNum = function(data) {

    var _mode = QRMode.MODE_ALPHA_NUM;
    var _data = data;

    var _this = {};

    _this.getMode = function() {
      return _mode;
    };

    _this.getLength = function(buffer) {
      return _data.length;
    };

    _this.write = function(buffer) {

      var s = _data;

      var i = 0;

      while (i + 1 < s.length) {
        buffer.put(
          getCode(s.charAt(i) ) * 45 +
          getCode(s.charAt(i + 1) ), 11);
        i += 2;
      }

      if (i < s.length) {
        buffer.put(getCode(s.charAt(i) ), 6);
      }
    };

    var getCode = function(c) {

      if ('0' <= c && c <= '9') {
        return c.charCodeAt(0) - '0'.charCodeAt(0);
      } else if ('A' <= c && c <= 'Z') {
        return c.charCodeAt(0) - 'A'.charCodeAt(0) + 10;
      } else {
        switch (c) {
        case ' ' : return 36;
        case '$' : return 37;
        case '%' : return 38;
        case '*' : return 39;
        case '+' : return 40;
        case '-' : return 41;
        case '.' : return 42;
        case '/' : return 43;
        case ':' : return 44;
        default :
          throw 'illegal char :' + c;
        }
      }
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // qr8BitByte
  //---------------------------------------------------------------------

  var qr8BitByte = function(data) {

    var _mode = QRMode.MODE_8BIT_BYTE;
    var _data = data;
    var _bytes = qrcode.stringToBytes(data);

    var _this = {};

    _this.getMode = function() {
      return _mode;
    };

    _this.getLength = function(buffer) {
      return _bytes.length;
    };

    _this.write = function(buffer) {
      for (var i = 0; i < _bytes.length; i += 1) {
        buffer.put(_bytes[i], 8);
      }
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // qrKanji
  //---------------------------------------------------------------------

  var qrKanji = function(data) {

    var _mode = QRMode.MODE_KANJI;
    var _data = data;

    var stringToBytes = qrcode.stringToBytesFuncs['SJIS'];
    if (!stringToBytes) {
      throw 'sjis not supported.';
    }
    !function(c, code) {
      // self test for sjis support.
      var test = stringToBytes(c);
      if (test.length != 2 || ( (test[0] << 8) | test[1]) != code) {
        throw 'sjis not supported.';
      }
    }('\u53cb', 0x9746);

    var _bytes = stringToBytes(data);

    var _this = {};

    _this.getMode = function() {
      return _mode;
    };

    _this.getLength = function(buffer) {
      return ~~(_bytes.length / 2);
    };

    _this.write = function(buffer) {

      var data = _bytes;

      var i = 0;

      while (i + 1 < data.length) {

        var c = ( (0xff & data[i]) << 8) | (0xff & data[i + 1]);

        if (0x8140 <= c && c <= 0x9FFC) {
          c -= 0x8140;
        } else if (0xE040 <= c && c <= 0xEBBF) {
          c -= 0xC140;
        } else {
          throw 'illegal char at ' + (i + 1) + '/' + c;
        }

        c = ( (c >>> 8) & 0xff) * 0xC0 + (c & 0xff);

        buffer.put(c, 13);

        i += 2;
      }

      if (i < data.length) {
        throw 'illegal char at ' + (i + 1);
      }
    };

    return _this;
  };

  //=====================================================================
  // GIF Support etc.
  //

  //---------------------------------------------------------------------
  // byteArrayOutputStream
  //---------------------------------------------------------------------

  var byteArrayOutputStream = function() {

    var _bytes = [];

    var _this = {};

    _this.writeByte = function(b) {
      _bytes.push(b & 0xff);
    };

    _this.writeShort = function(i) {
      _this.writeByte(i);
      _this.writeByte(i >>> 8);
    };

    _this.writeBytes = function(b, off, len) {
      off = off || 0;
      len = len || b.length;
      for (var i = 0; i < len; i += 1) {
        _this.writeByte(b[i + off]);
      }
    };

    _this.writeString = function(s) {
      for (var i = 0; i < s.length; i += 1) {
        _this.writeByte(s.charCodeAt(i) );
      }
    };

    _this.toByteArray = function() {
      return _bytes;
    };

    _this.toString = function() {
      var s = '';
      s += '[';
      for (var i = 0; i < _bytes.length; i += 1) {
        if (i > 0) {
          s += ',';
        }
        s += _bytes[i];
      }
      s += ']';
      return s;
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // base64EncodeOutputStream
  //---------------------------------------------------------------------

  var base64EncodeOutputStream = function() {

    var _buffer = 0;
    var _buflen = 0;
    var _length = 0;
    var _base64 = '';

    var _this = {};

    var writeEncoded = function(b) {
      _base64 += String.fromCharCode(encode(b & 0x3f) );
    };

    var encode = function(n) {
      if (n < 0) {
        // error.
      } else if (n < 26) {
        return 0x41 + n;
      } else if (n < 52) {
        return 0x61 + (n - 26);
      } else if (n < 62) {
        return 0x30 + (n - 52);
      } else if (n == 62) {
        return 0x2b;
      } else if (n == 63) {
        return 0x2f;
      }
      throw 'n:' + n;
    };

    _this.writeByte = function(n) {

      _buffer = (_buffer << 8) | (n & 0xff);
      _buflen += 8;
      _length += 1;

      while (_buflen >= 6) {
        writeEncoded(_buffer >>> (_buflen - 6) );
        _buflen -= 6;
      }
    };

    _this.flush = function() {

      if (_buflen > 0) {
        writeEncoded(_buffer << (6 - _buflen) );
        _buffer = 0;
        _buflen = 0;
      }

      if (_length % 3 != 0) {
        // padding
        var padlen = 3 - _length % 3;
        for (var i = 0; i < padlen; i += 1) {
          _base64 += '=';
        }
      }
    };

    _this.toString = function() {
      return _base64;
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // base64DecodeInputStream
  //---------------------------------------------------------------------

  var base64DecodeInputStream = function(str) {

    var _str = str;
    var _pos = 0;
    var _buffer = 0;
    var _buflen = 0;

    var _this = {};

    _this.read = function() {

      while (_buflen < 8) {

        if (_pos >= _str.length) {
          if (_buflen == 0) {
            return -1;
          }
          throw 'unexpected end of file./' + _buflen;
        }

        var c = _str.charAt(_pos);
        _pos += 1;

        if (c == '=') {
          _buflen = 0;
          return -1;
        } else if (c.match(/^\s$/) ) {
          // ignore if whitespace.
          continue;
        }

        _buffer = (_buffer << 6) | decode(c.charCodeAt(0) );
        _buflen += 6;
      }

      var n = (_buffer >>> (_buflen - 8) ) & 0xff;
      _buflen -= 8;
      return n;
    };

    var decode = function(c) {
      if (0x41 <= c && c <= 0x5a) {
        return c - 0x41;
      } else if (0x61 <= c && c <= 0x7a) {
        return c - 0x61 + 26;
      } else if (0x30 <= c && c <= 0x39) {
        return c - 0x30 + 52;
      } else if (c == 0x2b) {
        return 62;
      } else if (c == 0x2f) {
        return 63;
      } else {
        throw 'c:' + c;
      }
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // gifImage (B/W)
  //---------------------------------------------------------------------

  var gifImage = function(width, height) {

    var _width = width;
    var _height = height;
    var _data = new Array(width * height);

    var _this = {};

    _this.setPixel = function(x, y, pixel) {
      _data[y * _width + x] = pixel;
    };

    _this.write = function(out) {

      //---------------------------------
      // GIF Signature

      out.writeString('GIF87a');

      //---------------------------------
      // Screen Descriptor

      out.writeShort(_width);
      out.writeShort(_height);

      out.writeByte(0x80); // 2bit
      out.writeByte(0);
      out.writeByte(0);

      //---------------------------------
      // Global Color Map

      // black
      out.writeByte(0x00);
      out.writeByte(0x00);
      out.writeByte(0x00);

      // white
      out.writeByte(0xff);
      out.writeByte(0xff);
      out.writeByte(0xff);

      //---------------------------------
      // Image Descriptor

      out.writeString(',');
      out.writeShort(0);
      out.writeShort(0);
      out.writeShort(_width);
      out.writeShort(_height);
      out.writeByte(0);

      //---------------------------------
      // Local Color Map

      //---------------------------------
      // Raster Data

      var lzwMinCodeSize = 2;
      var raster = getLZWRaster(lzwMinCodeSize);

      out.writeByte(lzwMinCodeSize);

      var offset = 0;

      while (raster.length - offset > 255) {
        out.writeByte(255);
        out.writeBytes(raster, offset, 255);
        offset += 255;
      }

      out.writeByte(raster.length - offset);
      out.writeBytes(raster, offset, raster.length - offset);
      out.writeByte(0x00);

      //---------------------------------
      // GIF Terminator
      out.writeString(';');
    };

    var bitOutputStream = function(out) {

      var _out = out;
      var _bitLength = 0;
      var _bitBuffer = 0;

      var _this = {};

      _this.write = function(data, length) {

        if ( (data >>> length) != 0) {
          throw 'length over';
        }

        while (_bitLength + length >= 8) {
          _out.writeByte(0xff & ( (data << _bitLength) | _bitBuffer) );
          length -= (8 - _bitLength);
          data >>>= (8 - _bitLength);
          _bitBuffer = 0;
          _bitLength = 0;
        }

        _bitBuffer = (data << _bitLength) | _bitBuffer;
        _bitLength = _bitLength + length;
      };

      _this.flush = function() {
        if (_bitLength > 0) {
          _out.writeByte(_bitBuffer);
        }
      };

      return _this;
    };

    var getLZWRaster = function(lzwMinCodeSize) {

      var clearCode = 1 << lzwMinCodeSize;
      var endCode = (1 << lzwMinCodeSize) + 1;
      var bitLength = lzwMinCodeSize + 1;

      // Setup LZWTable
      var table = lzwTable();

      for (var i = 0; i < clearCode; i += 1) {
        table.add(String.fromCharCode(i) );
      }
      table.add(String.fromCharCode(clearCode) );
      table.add(String.fromCharCode(endCode) );

      var byteOut = byteArrayOutputStream();
      var bitOut = bitOutputStream(byteOut);

      // clear code
      bitOut.write(clearCode, bitLength);

      var dataIndex = 0;

      var s = String.fromCharCode(_data[dataIndex]);
      dataIndex += 1;

      while (dataIndex < _data.length) {

        var c = String.fromCharCode(_data[dataIndex]);
        dataIndex += 1;

        if (table.contains(s + c) ) {

          s = s + c;

        } else {

          bitOut.write(table.indexOf(s), bitLength);

          if (table.size() < 0xfff) {

            if (table.size() == (1 << bitLength) ) {
              bitLength += 1;
            }

            table.add(s + c);
          }

          s = c;
        }
      }

      bitOut.write(table.indexOf(s), bitLength);

      // end code
      bitOut.write(endCode, bitLength);

      bitOut.flush();

      return byteOut.toByteArray();
    };

    var lzwTable = function() {

      var _map = {};
      var _size = 0;

      var _this = {};

      _this.add = function(key) {
        if (_this.contains(key) ) {
          throw 'dup key:' + key;
        }
        _map[key] = _size;
        _size += 1;
      };

      _this.size = function() {
        return _size;
      };

      _this.indexOf = function(key) {
        return _map[key];
      };

      _this.contains = function(key) {
        return typeof _map[key] != 'undefined';
      };

      return _this;
    };

    return _this;
  };

  var createDataURL = function(width, height, getPixel) {
    var gif = gifImage(width, height);
    for (var y = 0; y < height; y += 1) {
      for (var x = 0; x < width; x += 1) {
        gif.setPixel(x, y, getPixel(x, y) );
      }
    }

    var b = byteArrayOutputStream();
    gif.write(b);

    var base64 = base64EncodeOutputStream();
    var bytes = b.toByteArray();
    for (var i = 0; i < bytes.length; i += 1) {
      base64.writeByte(bytes[i]);
    }
    base64.flush();

    return 'data:image/gif;base64,' + base64;
  };

  //---------------------------------------------------------------------
  // returns qrcode function.

  return qrcode;
}();

// multibyte support
!function() {

  qrcode.stringToBytesFuncs['UTF-8'] = function(s) {
    // http://stackoverflow.com/questions/18729405/how-to-convert-utf8-string-to-byte-array
    function toUTF8Array(str) {
      var utf8 = [];
      for (var i=0; i < str.length; i++) {
        var charcode = str.charCodeAt(i);
        if (charcode < 0x80) utf8.push(charcode);
        else if (charcode < 0x800) {
          utf8.push(0xc0 | (charcode >> 6),
              0x80 | (charcode & 0x3f));
        }
        else if (charcode < 0xd800 || charcode >= 0xe000) {
          utf8.push(0xe0 | (charcode >> 12),
              0x80 | ((charcode>>6) & 0x3f),
              0x80 | (charcode & 0x3f));
        }
        // surrogate pair
        else {
          i++;
          // UTF-16 encodes 0x10000-0x10FFFF by
          // subtracting 0x10000 and splitting the
          // 20 bits of 0x0-0xFFFFF into two halves
          charcode = 0x10000 + (((charcode & 0x3ff)<<10)
            | (str.charCodeAt(i) & 0x3ff));
          utf8.push(0xf0 | (charcode >>18),
              0x80 | ((charcode>>12) & 0x3f),
              0x80 | ((charcode>>6) & 0x3f),
              0x80 | (charcode & 0x3f));
        }
      }
      return utf8;
    }
    return toUTF8Array(s);
  };

}();
  return qrcode;
})();

class ComprasCard extends HTMLElement {
  setConfig(config) {
    this._config = config || {};
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    this._mes = this._mes || this._mesDe(new Date());
    this._sel = this._sel || new Set();
  }

  getCardSize() { return 12; }

  set hass(hass) {
    const primeira = !this._hass;
    this._hass = hass;
    if (primeira) {
      this._render();
      this._carregar();
      if (this._abaAtual() === "visao") this._carregarVisao();
      this._timer = setInterval(() => { if (!document.hidden) this._carregar(true); }, 60000);
    }
  }

  disconnectedCallback() {
    clearInterval(this._timer); this._timer = null;
    if (this._ouveLink) { window.removeEventListener("location-changed", this._ouveLink); this._ouveLink = null; }
  }
  connectedCallback() {
    if (!this._ouveLink) {  // o app do HA troca de página sem recarregar: confere o endereço a cada troca
      this._ouveLink = () => setTimeout(() => this._linkNotificacao(), 300);
      window.addEventListener("location-changed", this._ouveLink);
    }
    setTimeout(() => this._linkNotificacao(), 300);
    // o HA às vezes tira o card da página e põe de volta (teclado do celular, mudança de colunas): a janela aberta
    // perde o "por cima". Volta com o que estava digitado.
    const dlg = this.shadowRoot?.querySelector("dialog.folha");
    if (dlg) { try { if (!dlg.matches(":modal")) { dlg.close(); dlg.showModal(); } } catch (_) { /* navegador antigo */ } }
    if (this._hass && !this._timer) {
      this._carregar(true);
      this._timer = setInterval(() => { if (!document.hidden) this._carregar(true); }, 60000);
    }
  }

  // ---------------------------------------------------------------- dados
  // iPhone/iPad (inclusive o iPad que se apresenta como Mac): lá a impressão de dentro da página não funciona no app do HA
  _iosApp() { return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); }

  async _api(pedido) {
    if (this._hass?.services?.co_finance?.pedido) {  // integração do HACS instalada: o serviço dela responde direto
      const r = await this._hass.callWS({ type: "call_service", domain: "co_finance", service: "pedido", service_data: { pedido }, return_response: true });
      const d = r?.response;
      if (!d || typeof d !== "object") throw new Error("O CoFinance não respondeu.");
      if (!d.ok) throw new Error(d.mensagem || "Erro.");
      return d;
    }
    const json = JSON.stringify(pedido);
    const b64 = btoa(String.fromCharCode(...new TextEncoder().encode(json)));
    const r = await this._hass.callWS({
      type: "call_service", domain: "shell_command", service: "compras_registrar",
      service_data: { pedido: b64 }, return_response: true,
    });
    const out = (r?.response?.stdout || "").trim();
    if (!out.startsWith("{")) throw new Error("O script não respondeu.");
    const d = JSON.parse(out);
    if (!d.ok) throw new Error(d.mensagem || "Erro.");
    return d;
  }

  async _carregar(silencioso = false) {
    if (this._carregando) return;
    this._carregando = true;
    if (!silencioso) { this._erro = null; this._render(); }
    const antes = this._dados?.atualizado_em;
    try {
      // atualização silenciosa (a cada minuto, depois de cada ação): só baixa a lista se algo mudou no HA
      const r = await this._api({ acao: "listar", ...(silencioso && antes ? { desde: antes } : {}) });
      if (r.status !== "igual") this._dados = r;
      this._erro = null;
    } catch (e) {
      this._erro = e.message || String(e);
    }
    this._carregando = false;
    if (silencioso) {
      if (this._dados?.atualizado_em === antes || this._nota) return; // nada mudou (ou nota aberta): não redesenha
      // não redesenhar por cima do que está sendo digitado/visto (Lançar compra, busca de produtos, janela aberta)
      if (this._ocupado()) return;  // janela/formulário aberto: o que chegou aparece quando fechar
    }
    this._render();
    this._linkNotificacao();
  }

  async _acao(pedido, msgOk) {
    try {
      const r = await this._api(pedido);
      this._aviso = msgOk || r.mensagem;
      await this._carregar(true); // na Visão geral já pede os números de novo
      this._render();
      return r;
    } catch (e) {
      this._aviso = "⚠ " + (e.message || e);
      this._render();
      return null;
    }
  }

  // ---------------------------------------------------------------- utilidades
  _e(s) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
  _brl(v) { return v == null ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
  // compra lançada em outra moeda (viagem): o valor original; em R$ só depois que vocês convertem
  _moeda(m) { return `${({ USD: "US$", EUR: "€" })[m.cod] || m.cod} ${Number(m.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
  _semReal(c) { return !!c.moeda && !c.valor_pago; }
  _num(v, d = 3) { return Number(v).toLocaleString("pt-BR", { maximumFractionDigits: d }); }
  _mesDe(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }
  _mesNome(m) { const [a, n] = m.split("-"); const s = COMPRAS_MESES[Number(n) - 1]; return `${s[0].toUpperCase()}${s.slice(1)} de ${a}`; }
  _somaMes(m) { const [a, n] = m.split("-").map(Number); const d = new Date(a, n - 1, 1); return (k) => { d.setMonth(d.getMonth() + k); return this._mesDe(d); }; }
  _dataCurta(iso) { const d = new Date(iso); return isNaN(d) ? "" : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }); }
  _dia(iso) { const d = new Date(iso); return { dia: String(d.getDate()).padStart(2, "0"), mes: COMPRAS_MESES[d.getMonth()].slice(0, 3).toUpperCase(), hora: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }), data: d.toLocaleDateString("pt-BR") }; }
  // pessoas vêm do cadastro (Contas › ✎ › Pessoas): cor, quem paga do próprio bolso e "Devemos à/ao"
  _pessoa(p) { return (this._dados?.pessoas || []).find((x) => x.nome === p); }
  _cor(p) { return this._pessoa(p)?.cor || "var(--secondary-text-color)"; }
  _reembolsa(p) { return !!this._pessoa(p)?.reembolso; }
  _devemosA(p) { const a = this._pessoa(p)?.artigo; return a === "o" ? "ao" : a === "a" ? "à" : "a"; }
  _compras() { return this._dados?.compras || []; }
  _doMes(m) { return this._compras().filter((c) => (c.emissao || "").slice(0, 7) === m); }
  _abaAtual() { return this._aba || "resumo"; }
  // Árvore de categorias (dois níveis) que vem do script; Mercado é dividido pelos itens
  _ramo(cat) { return (this._dados?.arvore || []).find((a) => a.nome === cat); }
  _classe(c) { return c.subcategoria ? `${c.categoria} › ${c.subcategoria}` : c.categoria; }
  _soma(lst) { return lst.reduce((s, c) => s + (c.valor_pago || 0), 0); }
  _mesAbrev(m) { return COMPRAS_MESES[Number(m.slice(5, 7)) - 1].slice(0, 3); }
  _pularMes(m, k) {
    const hoje = this._mesDe(new Date());
    const meses = [...new Set(this._compras().map((c) => (c.emissao || "").slice(0, 7)).filter(Boolean))].sort();
    if (k < 0) return [...meses].reverse().find((x) => x < m) || this._somaMes(m)(-1);
    if (m >= hoje) return this._somaMes(m)(1);
    return meses.find((x) => x > m && x <= hoje) || hoje;
  }
  _navMes() {
    return `<div class="mes">
      <button class="ico" data-a="mes" data-k="-1" aria-label="Mês anterior">‹</button>
      <span>${this._e(this._mesNome(this._mes))}</span>
      <button class="ico" data-a="mes" data-k="1" aria-label="Próximo mês">›</button></div>`;
  }

  // ---------------------------------------------------------------- tela
  _render() {
    if (!this.shadowRoot) return;
    const d = this._dados;
    let corpo;
    if (!d && this._erro) {
      corpo = `<div class="vazio">⚠ ${this._e(this._erro)}<br><button class="btn" data-a="recarregar">Tentar de novo</button></div>`;
    } else if (!d) {
      corpo = `<div class="vazio">Carregando compras…</div>`;
    } else {
      const aba = this._abaAtual();
      const grupos = [["Finanças", [["resumo", "Resumo"], ["areas", "Áreas"], ["pagar", "A pagar"]]], ["Histórico", [["compras", "Compras"], ["produtos", "Produtos"]]]];
      const nAv = this._pendencias().total;
      corpo = `<div class="abas"><div class="abas-rol" role="tablist">${grupos.map(([g, abas], i) => `<span class="agrupo ${i ? "sep" : ""}">${g}</span>${abas.map(([k, n]) => `<button role="tab" class="aba ${aba === k ? "on" : ""}" data-a="aba" data-k="${k}" aria-selected="${aba === k}">${n}</button>`).join("")}`).join("")}</div>
        <span class="icones">
          <button class="ic ${this._carregando ? "gira" : ""}" data-a="recarregar" title="Atualizar" aria-label="Atualizar">${COMPRAS_SVG("atualizar")}</button>
          ${aba === "pagar" && this._hass?.user?.is_admin ? `<button class="ic ${this._fCorrigir ? "on" : ""}" data-a="f-corrigir" title="${this._fCorrigir ? "Sair do modo de correção" : "Corrigir pagamentos"}" aria-label="Corrigir" aria-pressed="${!!this._fCorrigir}">${COMPRAS_SVG("lapis")}</button>` : ""}
          <button class="ic sinoic ${nAv ? "tem" : ""}" data-a="avisos" title="Avisos" aria-label="Avisos${nAv ? `: ${nAv} pendente(s)` : ""}"><span class="sinoem">🔔</span>${nAv ? `<b>${nAv}</b>` : ""}</button>
        </span></div>`
        + (aba === "produtos" ? this._telaProdutos() : ["resumo", "areas", "pagar"].includes(aba) ? this._finTela(aba) : this._tela(d));
    }
    const rascunho = this._guardarRascunho();
    this.shadowRoot.innerHTML = `<style>${this._css()}${this._finCss()}</style><ha-card>${corpo}${this._folha()}</ha-card>`;
    this._ligar();
    this._devolverRascunho(rascunho);
  }

  // Qual janela está aberta (para não levar o rascunho de uma compra para outra)
  _qualJanela() { return this._aberta ? `c:${this._aberta.id}` : this._fConta ? `k:${this._fConta}` : this._novo ? "novo" : this._prod ? "p" : this._fCats ? "cats" : null; }
  _chaveCampo(el) {
    if (!el || !el.matches?.("input,textarea")) return null;
    return el.id || ["fcobrado", "fcartao", "fcompra", "i", "kc-usa"].map((k) => el.getAttribute(`data-${k}`) || "").join("|");
  }
  // Texto digitado e ainda não salvo (valor diferente do que veio do servidor), cursor e rolagem da janela
  _guardarRascunho() {
    const root = this.shadowRoot, dlg = root?.querySelector("dialog.folha"), jan = this._qualJanela();
    const r = { jan, campos: {}, foco: null, rolagem: dlg ? dlg.scrollTop : 0 };
    if (!root) return r;
    root.querySelectorAll("input[type=text],input[type=search],input:not([type]),input[type=number],textarea").forEach((el) => {
      const k = this._chaveCampo(el);
      if (k && el.value !== el.defaultValue) r.campos[k] = el.value;
    });
    const a = root.activeElement, k = this._chaveCampo(a);
    if (k) r.foco = { k, ini: a.selectionStart, fim: a.selectionEnd };
    return r;
  }
  _devolverRascunho(r) {
    const root = this.shadowRoot;
    if (!r || !root) return;
    const mesma = r.jan && r.jan === this._qualJanela();
    const dlg = root.querySelector("dialog.folha");
    let algum = false;
    root.querySelectorAll("input,textarea").forEach((el) => {
      const k = this._chaveCampo(el);
      if (!k || !(k in r.campos)) return;
      if (dlg && dlg.contains(el) && !mesma) return;  // outra janela: não leva o rascunho
      if (el.value === el.defaultValue && r.campos[k] !== el.defaultValue) { el.value = r.campos[k]; algum = true; }
    });
    if (algum) root.querySelector("[data-a='f-pg-salvar-txt']")?.classList.add("prim");
    if (dlg && mesma && r.rolagem) dlg.scrollTop = r.rolagem;
    if (r.foco && (mesma || !dlg)) {
      const el = [...root.querySelectorAll("input,textarea")].find((x) => this._chaveCampo(x) === r.foco.k);
      if (el) { try { el.focus({ preventScroll: true }); if (r.foco.ini != null) el.setSelectionRange(r.foco.ini, r.foco.fim); } catch (_) { /* campo sem seleção (data) */ } }
    }
  }

  // ---------------------------------------------------------------- aba Compras: lista do mês
  _tela(d) {
    const m = this._mes;
    const doMes = this._doMes(m);
    const f = this._filtro || "todas";
    const filtros = [["todas", "Todas"], ...(d.compradores || []).map((p) => [p, p]), ["reemb", "A reembolsar"]];
    const lst = doMes.filter((c) => f === "todas" ? true : f === "reemb" ? c.reembolso?.status === "a_reembolsar" : c.quem === f);
    const mesTxt = this._mesNome(m).split(" ")[0].toLowerCase();
    return `
      <div class="topo">${this._navMes()}<div class="botoes"><button class="btn" data-a="upload">📄 Enviar nota</button><button class="btn prim" data-a="novo">+ Lançar compra</button></div></div>
      ${this._aviso ? `<div class="aviso" role="status">${this._e(this._aviso)}</div>` : ""}
      <div class="chips">${filtros.map(([k, n]) => `<button class="chip ${f === k ? "on" : ""}" data-a="filtro" data-k="${this._e(k)}">${this._pessoa(k) ? `<i class="pt" style="background:${this._cor(k)}"></i>` : ""}${this._e(n)}</button>`).join("")}</div>
      <section>
        <div class="h"><h2>Compras de ${this._e(mesTxt)}</h2><small>${lst.length} ${lst.length === 1 ? "compra" : "compras"} · ${this._brl(this._soma(lst))}</small></div>
        ${lst.length ? `<div class="lista">${lst.map((c) => this._linha(c)).join("")}</div>`
          : doMes.length ? `<div class="vazio peq">Nenhuma compra com esse filtro em ${this._e(mesTxt)}.</div>`
          : `<div class="vazio peq">Nenhuma compra neste mês. Leia um cupom com o atalho “Ler Cupom” ou use “+ Lançar compra”.</div>`}
      </section>
      ${this._rodape(d)}`;
  }

  _rodape(d) {
    return `<div class="rodape">${this._carregando ? "Atualizando…" : `Atualizado ${d.atualizado_em ? new Date(d.atualizado_em).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}`} · versão ${COMPRAS_CARD_VERSION}</div>`;
  }

  // O que precisa de atenção: reembolso a pagar, compra sem forma de pagamento, conta da nota que não fecha
  _pendencias() {
    const cs = this._compras();
    const reemb = cs.filter((c) => c.reembolso?.status === "a_reembolsar" || c.reembolso?.status === "a_receber");  // o sino é o lugar dos reembolsos (devemos e a receber)
    const semForma = cs.filter((c) => (c.pago_com || []).some((pg) => !pg.tipo));
    const naoFecha = cs.filter((c) => c.conferencia && c.conferencia.bate === false);
    const idsSem = new Set((this._fFin?.sem_cartao || []).map((x) => x.id));
    const semCartao = cs.filter((c) => idsSem.has(c.id));
    const hoje = this._fFin?.hoje || "";
    const vencendo = [...(this._fFin?.faturas || []), ...(this._fFin?.contas || [])].filter((x) => !x.pago && x.vence <= hoje);
    const applepay = this._dados?.applepay || [];
    const mudancas = this._dados?.mudancas || [];
    const parados = this._dados?.pedidos_parados || [];  // pedido de loja online sem a confirmação do pagamento há dias
    return { reemb, semForma, naoFecha, semCartao, vencendo, applepay, mudancas, parados,
      total: reemb.length + semForma.length + naoFecha.length + semCartao.length + vencendo.length + applepay.length + mudancas.length + parados.length };
  }

  // Observação da compra sem nota, quando diz algo além do item (e não é o texto automático do Apple Pay)
  _obsManual(c) {
    const o = String(c.observacao || "").trim(), n = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    if (!o || (c.via === "applepay" && /^(Apple Pay|Pelo telefone)/.test(o))) return "";
    return (c.itens || []).some((i) => n(i.descricao) === n(o)) ? "" : o;
  }

  _folhaAvisos() {
    const pd = this._pendencias();
    const grupo = (titulo, dica, lst) => lst.length ? `<section><div class="h"><h2>${titulo}</h2><small>${lst.length}</small></div>
      <div class="fs">${dica}</div><div class="lista">${lst.map((c) => this._linha(c, null, true)).join("")}</div></section>` : "";
    return `<dialog class="folha" aria-label="Avisos">
      <div class="fh"><div><div class="ft">Avisos</div><div class="fs">${pd.total ? `${pd.total} ${pd.total === 1 ? "pendência" : "pendências"}` : "Nada pendente"}</div></div>
        <button class="ico" data-a="fechar" aria-label="Fechar">✕</button></div>
      ${this._aviso ? `<div class="aviso" role="status">${this._e(this._aviso)}</div>` : ""}
      ${pd.mudancas.length ? `<section><div class="h"><h2>Mudanças para conferir</h2><small>${pd.mudancas.length}</small></div>
        <div class="fs">Ajustes feitos nas compras fora da tela. Toque na loja para abrir a compra. ✓ Confirmar tira daqui; Desfazer volta a compra como estava.</div>
        ${pd.mudancas.map((x) => `<div class="apl"><div><button class="lnk" data-a="abrir" data-id="${this._e(x.compra)}"><b>${this._e(x.loja)}</b></button>
          ${x.compra_dia ? `<div class="mu-compra">Compra de <b>${this._dataCurta(String(x.compra_dia).slice(0, 10) + "T12:00")}</b>${x.compra_valor != null ? ` · ${this._brl(x.compra_valor)}` : ""}</div>` : `<div class="mu-compra">compra não encontrada (pode ter sido excluída)</div>`}
          <div class="fs">${this._e(x.texto)}</div><div class="fs mu-em">ajuste feito em ${this._dataCurta(x.em)}</div></div>
          <span><button class="btn prim" data-a="mu-ok" data-k="${this._e(x.id)}">✓ Confirmar</button><button class="btn" data-a="mu-desfazer" data-k="${this._e(x.id)}">Desfazer</button></span></div>`).join("")}</section>` : ""}
      ${(pd.parados || []).length ? `<section><div class="h"><h2>Pedidos para conferir</h2><small>${pd.parados.length}</small></div>
        <div class="fs">Pedido que não entrou sozinho (cartão que não está em ⚙ › Cartões, ou sem a confirmação do pagamento há dias) ou com o dia do pagamento diferente do dia na fatura do banco.</div>
        ${pd.parados.map((x) => {
          const dc = (d) => this._dataCurta(String(d).slice(0, 10) + "T12:00");
          if (x.situacao === "valor_diferente") return `<div class="apl"><div><b>${this._brl(x.valores.pedido)}</b> · ${this._e(x.loja)} de ${this._dataCurta(x.data)}
            <div class="fs">A fatura tem <b>${this._e(x.valores.descricao)}</b> em ${dc(x.valores.dia)} de <b>${this._brl(x.valores.fatura)}</b>, mas as lojas do pedido somam <b>${this._brl(x.valores.pedido)}</b>
              (diferença de ${this._brl(Math.abs(x.valores.fatura - x.valores.pedido))}). Confira no app da loja se teve cancelamento, frete ou outra compra junto.</div></div>
            <span><button class="btn" data-a="pd-decidir" data-k="${this._e(x.id)}" data-d="valor_ciente">Ok, conferido</button></span></div>`;
          if (x.situacao === "data_diferente") return `<div class="apl"><div><b>${this._brl(x.total)}</b> · ${this._e(x.loja)}
            <div class="fs">Dia do pagamento (e-mail): <b>${dc(x.datas.email)}</b> · dia na fatura do banco: <b>${dc(x.datas.fatura)}</b>. Qual vale para o pedido?</div></div>
            <span><button class="btn prim" data-a="pd-decidir" data-k="${this._e(x.id)}" data-d="data_fatura">Usar a da fatura</button><button class="btn" data-a="pd-decidir" data-k="${this._e(x.id)}" data-d="data_email">Manter a do e-mail</button></span></div>`;
          return `<div class="apl"><div><b>${x.total ? this._brl(x.total) : ""}</b> · ${this._e(x.loja)} de ${this._dataCurta(x.data)}
          <div class="fs">${this._e((x.lojas || []).filter(Boolean).join(", "))}${x.situacao === "pago_sem_detalhes" ? " · pagamento confirmado, mas o e-mail do pedido (com os preços) não chegou" : x.situacao === "conferir_cartao" ? ` · cartão final ${this._e(x.final || "?")}, que não está em ⚙ › Cartões` : " · sem a confirmação do pagamento"}</div></div>
          <span>${x.situacao === "aguardando_pagamento" || x.situacao === "conferir_cartao" ? `<button class="btn prim" data-a="pd-decidir" data-k="${this._e(x.id)}" data-d="confirmar">${x.situacao === "conferir_cartao" ? "É nosso, lançar" : "Já paguei"}</button>` : ""}<button class="btn" data-a="pd-decidir" data-k="${this._e(x.id)}" data-d="descartar">Descartar</button></span></div>`;
        }).join("")}</section>` : ""}
      ${pd.applepay.length ? `<section><div class="h"><h2>Pagos pelo telefone, a decidir</h2><small>${pd.applepay.length}</small></div>
        <div class="fs">Compras pagas pelo telefone (iPhone ou Android) ainda sem decisão. Sem cupom: lançar. Com cupom: leia a nota pelo processo normal (quando ela chegar, esta some sozinha) ou toque em Tenho cupom.</div>
        ${pd.applepay.map((x) => `<div class="apl"><div><b>${this._brl(x.valor)}</b> · ${this._e(x.loja)}<div class="fs">${this._e(x.quem)} · ${this._dataCurta(x.em)} ${this._e(String(x.em).slice(11, 16))}${x.cartao_nome ? ` · ${this._e(x.cartao_nome)}` : ""}</div></div>
          <input class="apitem" data-k="${this._e(x.id)}" type="text" maxlength="80" placeholder="O que foi? (opcional)" aria-label="O que foi (opcional)" autocomplete="off">
          <span><button class="btn prim" data-a="ap-lancar" data-k="${this._e(x.id)}">Lançar sem cupom</button><button class="btn" data-a="ap-cupom" data-k="${this._e(x.id)}">Tenho cupom</button></span></div>`).join("")}</section>` : ""}
      ${this._blocoReembolso(this._dados)}
      ${grupo("Sem forma de pagamento", "A nota não diz como foi pago. Abra e escolha em “Editar compra”.", pd.semForma)}
      ${grupo("Conta da nota não fecha", "A soma dos itens não bate com o total. Abra para conferir.", pd.naoFecha)}
      ${pd.vencendo.length ? `<section><div class="h"><h2>Vence hoje ou atrasada</h2><small>${pd.vencendo.length}</small></div>${pd.vencendo.map((x) => this._finItem(x, true)).join("")}</section>` : ""}
      ${grupo("Crédito sem cartão escolhido", "Abra e escolha o cartão (e as parcelas) para a compra entrar na fatura certa.", pd.semCartao)}
      ${pd.total ? "" : `<div class="vazio peq">Tudo em dia. 🎉</div>`}
    </dialog>`;
  }

  // Bem (o carro): compras ligadas, KM e total
  _folhaBem() {
    const b = this._bem;
    if (b.carregando) return `<dialog class="folha"><div class="vazio">Abrindo histórico…</div></dialog>`;
    const fdt = (iso) => new Date(iso).toLocaleDateString("pt-BR");
    const anos = Object.entries(b.por_ano || {}).sort((x, y) => y[0].localeCompare(x[0]));
    return `<dialog class="folha" aria-label="${this._e(b.bem.nome)}">
      <div class="fh"><div><div class="ft">🚗 ${this._e(b.bem.nome)}</div>
        <div class="fs">${b.compras.length} ${b.compras.length === 1 ? "compra" : "compras"} · ${this._brl(b.total)} no total</div></div>
        <button class="ico" data-a="fechar" aria-label="Fechar">✕</button></div>
      ${anos.length ? `<div class="chips">${anos.map(([a, v]) => `<span class="chip">${a} · ${this._brl(v)}</span>`).join("")}</div>` : ""}
      <div class="h"><h2>Histórico de manutenção</h2><small>toque para abrir a nota</small></div>
      <div class="lista">${b.compras.map((c) => `<button class="row" data-a="abrir" data-id="${this._e(c.id)}">
        <div class="data"><b>${fdt(c.data).slice(0, 5)}</b>${fdt(c.data).slice(6)}</div>
        <div class="meio"><div class="loja">${this._e(c.loja)}${c.km ? ` · <span class="km">${c.km.toLocaleString("pt-BR")} km</span>` : ""}</div>
          <div class="meta">${this._e((c.itens || []).join(" · "))}${c.qtd_itens > (c.itens || []).length ? " …" : ""}</div></div>
        <div class="dir"><div class="amt">${this._brl(c.valor)}</div></div></button>`).join("") || `<div class="vazio peq">Nenhuma compra ligada.</div>`}</div>
      <div class="fs">Compras entram aqui sozinhas quando a nota traz a placa ou o chassi, ou quando o item é do carro (película, pneu, óleo de motor, revisão). Para ligar ou desligar uma compra: “Editar compra” → “Referente a”.</div>
    </dialog>`;
  }

  // Editar › Reembolso: duas caixinhas. A receber (alguém te paga de volta: de quem?) ou A reembolsar (você paga
  // alguém: para quem? padrão: quem comprou). Só grava no Salvar. Pago/recebido se marca no sino.
  _edReembolso(c) {
    const r = c.reembolso || {}, gravado = { a_receber: "rec", recebido: "rec", a_reembolsar: "reemb", pago: "reemb" }[r.status] || "";
    const tipo = this._edReemb ?? gravado, fechado = r.status === "pago" || r.status === "recebido";
    const nomeGravado = gravado === "rec" ? r.de || "" : gravado === "reemb" ? r.para || c.quem || "" : "";
    const nome = tipo === gravado ? nomeGravado : tipo === "reemb" ? c.quem || "" : "";
    const nomes = [...new Set(this._compras().flatMap((x) => [x.reembolso?.de, x.reembolso?.para]).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
    const caixa = (k, txt) => `<label class="rchk"><input type="checkbox" data-reemb="${k}" ${tipo === k ? "checked" : ""}> ${txt}</label>`;
    return `<div class="edreemb">
      <span class="rtit">Reembolso</span>
      <div class="rlinha">${caixa("rec", "A receber")}${caixa("reemb", "A reembolsar")}</div>
      ${tipo ? `<div class="rlinha"><input id="ed-rnome" type="text" maxlength="60" list="ed-rnome-l" aria-label="${tipo === "rec" ? "De quem" : "Para quem"}"
          placeholder="${tipo === "rec" ? "De quem? (quem vai te pagar)" : "Para quem? (quem você vai reembolsar)"}" value="${this._e(nome)}" autocomplete="off">
        <datalist id="ed-rnome-l">${nomes.map((n) => `<option value="${this._e(n)}">`).join("")}</datalist>
        <button class="btn prim" data-a="reemb-salvar">Salvar</button></div>` : tipo !== gravado ? `<div class="rlinha"><button class="btn prim" data-a="reemb-salvar">Salvar</button><span class="fs">tira o reembolso desta compra</span></div>` : ""}
      ${fechado && tipo === gravado ? `<span class="fs">✓ ${r.status === "recebido" ? "Recebido" : "Pago"} em ${this._e(String(r.pago_em || "").split("-").reverse().join("/"))} · para desfazer, use o sino</span>` : ""}
    </div>`;
  }

  // quanto falta receber de uma compra: o valor combinado ou a compra inteira
  _aReceberValor(c) { return c.reembolso?.valor != null ? c.reembolso.valor : (c.valor_pago || 0); }

  _blocoReembolso(d) {
    const cs = this._compras().filter((c) => !c.excluida_em);
    const pend = cs.filter((c) => c.reembolso?.status === "a_reembolsar");
    const rec = cs.filter((c) => c.reembolso?.status === "a_receber");
    const valor = (c) => c.reembolso?.status === "a_receber" ? this._aReceberValor(c) : (c.valor_pago || 0);
    const pagos = cs.filter((c) => c.reembolso?.status === "pago" || c.reembolso?.status === "recebido")
      .sort((a, b) => (b.reembolso.pago_em || "").localeCompare(a.reembolso.pago_em || "")).slice(0, 5);
    if (!pend.length && !rec.length && !pagos.length) return "";
    const agrupar = (lst, chave) => { const g = {}; lst.forEach((c) => { const k = chave(c); (g[k] = g[k] || []).push(c); }); return Object.entries(g); };
    const abertas = [...pend, ...rec], escolhidas = abertas.filter((c) => this._sel.has(c.id));
    const selTot = escolhidas.reduce((s, c) => s + valor(c), 0), nSel = escolhidas.length;
    const so = (st) => escolhidas.length && escolhidas.every((c) => c.reembolso.status === st);
    const verbo = so("a_receber") ? "recebido" : so("a_reembolsar") ? "pago" : "pago/recebido";
    const linhas = (lst) => lst.map((c) => { const t = this._dia(c.emissao); return `
          <label class="rl"><input type="checkbox" data-sel="${this._e(c.id)}" ${this._sel.has(c.id) ? "checked" : ""}>
            <span class="rd">${t.dia}/${String(new Date(c.emissao).getMonth() + 1).padStart(2, "0")}</span>
            <span class="rn">${this._e(c.loja_curta)}${c.reembolso?.obs ? ` <small class="fs">· ${this._e(c.reembolso.obs)}</small>` : ""}</span><span class="rv">${this._brl(valor(c))}</span></label>`; }).join("");
    return `<section class="reemb">
      ${agrupar(pend, (c) => c.reembolso.para || c.quem).map(([p, lst]) => `
        <div class="h"><h2>Devemos ${this._devemosA(p)} ${this._e(p)}</h2><b class="deve">${this._brl(lst.reduce((s, c) => s + valor(c), 0))}</b></div>${linhas(lst)}`).join("")}
      ${agrupar(rec, (c) => c.reembolso.de || "?").map(([p, lst]) => `<div class="rec">
        <div class="h"><h2>A receber ${p === "?" ? "(de quem?)" : `de ${this._e(p)}`}</h2><b class="deve">${this._brl(lst.reduce((s, c) => s + valor(c), 0))}</b></div>${linhas(lst)}</div>`).join("")}
      ${abertas.length ? (this._confPago
        ? `<div class="conf">Marcar ${nSel} compra(s) como ${verbo}, ${this._brl(selTot)}, com a data de hoje?
            <button class="btn prim" data-a="pago-sim">Sim, marcar</button><button class="btn" data-a="pago-nao">Cancelar</button></div>`
        : `<button class="btn prim" data-a="pago" ${nSel ? "" : "disabled"}>${nSel ? `Marcar como ${verbo} · ${this._brl(selTot)}` : "Selecione o que foi pago ou recebido"}</button>`) : ""}
      ${pagos.length ? `<details><summary>Pagos e recebidos recentemente</summary>${pagos.map((c) => `<div class="pg"><span>${this._e(c.loja_curta)} · ${this._brl(valor(c))}${c.reembolso.status === "recebido" ? ` · de ${this._e(c.reembolso.de || "?")}` : ""}</span><span>${c.reembolso.status === "recebido" ? "recebido" : "pago"} em ${this._e(c.reembolso.pago_em.split("-").reverse().join("/"))}</span><button class="lnk" data-a="despagar" data-id="${this._e(c.id)}">desfazer</button></div>`).join("")}</details>` : ""}
    </section>`;
  }

  _blocoBens(d) {
    return (d.bens || []).map((b) => {
      const lst = this._compras().filter((c) => c.bem === b.id).sort((x, y) => (y.emissao || "").localeCompare(x.emissao || ""));
      if (!lst.length) return "";
      return `<section><div class="h"><h2>🚗 ${this._e(b.nome)}</h2><small>toque para o histórico</small></div>
        <button class="bar toca bem" data-a="ver-bem" data-k="${this._e(b.id)}"><span class="n">${lst.length} ${lst.length === 1 ? "compra" : "compras"}</span><span></span><span class="p">${this._brl(this._soma(lst))} ›</span></button></section>`;
    }).join("");
  }

  // Enviar notas pelo próprio card (computador ou iPhone): XML, PDF ou página salva; um ou vários arquivos.
  // O HA descobre sozinho o tipo de nota pelo conteúdo.
  _folhaUpload() {
    const u = this._up;
    const quem = [...(this._dados?.compradores || []), ...(this._dados?.pessoas || []).filter((x) => x.reembolso).map((x) => `${x.nome} sem reembolso`)];
    const arqs = u.arquivos || [];
    const icone = { enviando: "⏳", ok: "✅", erro: "⚠" };
    const lista = arqs.length ? `<div class="uplista">${arqs.map((a, i) => `<div class="uparq ${a.st || ""}">
        <span class="upn">${icone[a.st] || "📄"} ${this._e(a.nome)}</span>
        ${!a.st && !u.enviando ? `<button class="ico" data-a="up-tirar" data-k="${i}" aria-label="Tirar">✕</button>` : ""}
        ${a.msg ? `<span class="upm">${this._e(a.msg)}</span>` : ""}</div>`).join("")}</div>` : "";
    const faltam = arqs.filter((a) => a.st !== "ok").length;
    const okN = arqs.filter((a) => a.st === "ok").length, erroN = arqs.filter((a) => a.st === "erro").length;
    const fim = !u.enviando && (okN || erroN) ? `<div class="upfim ${erroN ? "erro" : "ok"}" role="status">
        ${okN ? `<b>✅ ${okN === 1 ? "Nota carregada" : `${okN} notas carregadas`}</b>` : ""}${erroN ? `<b>⚠ ${erroN === 1 ? "1 arquivo não entrou" : `${erroN} arquivos não entraram`}</b>` : ""}
        <span>${okN === 1 && !erroN ? this._e(arqs.find((a) => a.st === "ok").msg) : "Veja cada arquivo abaixo."}</span></div>` : "";
    return `<dialog class="folha" aria-label="Enviar nota">
      <div class="fh"><div><div class="ft">Enviar nota</div><div class="fs">XML, PDF ou HTML · um ou vários arquivos</div></div>
        <button class="ico" data-a="fechar" aria-label="Fechar">✕</button></div>
      ${fim}
      <div class="form">
        <div class="solta" id="up-solta">
          <span class="arraste">Arraste os arquivos para cá</span><span class="arraste ou">ou</span>
          <label class="btn escolher">Escolher arquivos<input id="up-arq" type="file" multiple accept=".xml,.pdf,.html,.htm,text/xml,application/xml,application/pdf,text/html" ${u.enviando ? "disabled" : ""}></label>
        </div>
        ${lista}
        ${u.msg ? `<div class="aviso ${u.erro ? "" : "ok"}" role="status">${this._e(u.msg)}</div>` : ""}
        <label>Quem comprou<select id="up-quem" ${u.enviando ? "disabled" : ""}>${quem.map((q) => `<option ${q === u.quem ? "selected" : ""}>${this._e(q)}</option>`).join("")}</select></label>
        <div class="botoes">${!u.enviando && arqs.length && !faltam ? `<button class="btn prim" data-a="fechar">Fechar</button>` : `<button class="btn prim" data-a="up-enviar" ${u.enviando || !faltam ? "disabled" : ""}>${u.enviando ? `Enviando… ${u.parte || ""}` : faltam > 1 ? `Enviar ${faltam} arquivos` : "Enviar"}</button>`}</div>
        <details class="upsabe"><summary>O que ele reconhece</summary>
          <ul>
            <li><b>XML</b> de qualquer nota: nota comum (NF-e), cupom (NFC-e) e nota de serviço (NFS-e)</li>
            <li><b>PDF</b> da nota comum (DANFE) e da nota de serviço (Goiânia, Brasília)</li>
            <li><b>Página salva</b> (.html) do portal da NF-e, da Receita do DF ou do site de nota de serviço do DF</li>
          </ul>
          <div class="fs">A nota entra com itens e valores, e o arquivo fica guardado como cópia. Se ela já estiver registrada, é completada (o que você ajustou à mão continua). XML e PDF da mesma nota podem ir juntos.</div>
        </details>
      </div>
    </dialog>`;
  }

  _addArquivos(lista) {
    if (!this._up || this._up.enviando) return;
    const atuais = this._up.arquivos || [];
    const novos = [], recusados = [];
    for (const f of Array.from(lista || [])) {
      if (!/\.(xml|pdf|html?)$/i.test(f.name)) { recusados.push(f.name); continue; }
      if (atuais.some((a) => a.nome === f.name && a.f.size === f.size) || novos.some((a) => a.nome === f.name && a.f.size === f.size)) continue;
      novos.push({ f, nome: f.name, st: "", msg: "" });
    }
    this._up = { ...this._up, arquivos: [...atuais, ...novos],
      msg: recusados.length ? `Não é XML, PDF nem HTML: ${recusados.join(", ")}` : "", erro: recusados.length > 0 };
    this._render();
  }

  async _lerArquivo(arq) {
    const buf = await arq.arrayBuffer();
    if (/\.pdf$/i.test(arq.name) || arq.type === "application/pdf") {  // PDF vai inteiro (base64): o HA tira o texto e guarda o PDF
      const by = new Uint8Array(buf); let bin = "";
      for (let i = 0; i < by.length; i += 0x8000) bin += String.fromCharCode(...by.subarray(i, i + 0x8000));
      return { texto: btoa(bin), tipo: "pdf" };
    }
    const inicio = new TextDecoder("latin1").decode(buf.slice(0, 200));
    const enc = (inicio.match(/encoding=["']([\w-]+)["']/i) || [])[1] || "utf-8";
    let texto;
    try { texto = new TextDecoder(enc).decode(buf); } catch (_) { texto = new TextDecoder("utf-8").decode(buf); }
    const xml = /<(?:\w+:)?(nfeProc|NFe|CompNfse|InfNfse)\b/.test(texto) && !/<html\b/i.test(texto.slice(0, 3000));
    return { texto, tipo: xml ? "xml" : "portal" };
  }

  async _enviarArquivo() {
    const quem = this.shadowRoot.getElementById("up-quem")?.value;
    const arqs = (this._up.arquivos || []).filter((a) => a.st !== "ok");
    if (!arqs.length) { this._up = { ...this._up, quem, msg: "Escolha o arquivo da nota.", erro: true }; this._render(); return; }
    // XML primeiro: ele traz tudo; o PDF da mesma nota depois só fica guardado junto
    arqs.sort((a, b) => /\.xml$/i.test(b.nome) - /\.xml$/i.test(a.nome));
    this._up = { ...this._up, quem, enviando: true, msg: "" };
    for (const a of arqs) {
      a.st = "enviando"; a.msg = ""; this._up.parte = ""; this._render();
      try {
        const { texto, tipo } = await this._lerArquivo(a.f);
        const partes = texto.match(/[\s\S]{1,30000}/g) || [];
        const envio = `card${Date.now()}`;
        let r = null;
        for (let n = 1; n <= partes.length; n++) {
          if (partes.length > 1) { this._up.parte = `${n}/${partes.length}`; this._render(); }
          r = await this._api({ acao: "pedaco", envio, n, total: partes.length, dados: partes[n - 1], tipo, quem });
        }
        a.st = "ok"; a.msg = r?.mensagem || "Enviado.";
        this._avisar(r?.status || "nova", a.msg, r?.quem || quem, r?.id);
      } catch (e) {
        a.st = "erro"; a.msg = e.message || String(e);
        this._avisar("erro", `${a.nome}: ${a.msg}`, quem);
      }
    }
    const erros = arqs.filter((a) => a.st === "erro").length;
    this._up = { ...this._up, enviando: false, parte: "", msg: "", erro: erros > 0 };
    this._carregar(true);
    this._render();
  }

  // Aviso no celular (script.compras_avisar, mesma regra dos atalhos). Não segura a tela nem mostra erro.
  _avisar(status, mensagem, quem, id) {
    try { Promise.resolve(this._hass.callService(...(this._hass.services?.co_finance?.avisar ? ["co_finance", "avisar"] : ["script", "compras_avisar"]), { status, mensagem, quem: quem || "", id: id || "" })).catch(() => {}); } catch (_) {}
  }

  // Tocou numa notificação: o endereço traz ?compras_abrir=<id> (abre a nota), ?compras=avisos (sino) ou ?compras=pagar.
  _linkNotificacao() {
    if (!this._dados) return;
    let q;
    try { q = new URLSearchParams(window.location.search); } catch (_) { return; }
    const id = q.get("compras_abrir"), v = q.get("compras");
    if (!id && !v) return;
    q.delete("compras_abrir"); q.delete("compras");
    try { window.history.replaceState(window.history.state, "", window.location.pathname + (q.toString() ? `?${q}` : "")); } catch (_) { /* segue */ }
    if (id) { this._abrir(id); return; }
    if (v === "avisos") { this._avisosAberto = true; this._render(); return; }
    if (v === "pagar") { this._aba = "pagar"; if ("_v2Aba" in this) this._v2Aba = "contas"; this._render(); }  // V2/V3: a aba "Contas" é a de A pagar
  }

  async _enviarAnexo(id, arq) {
    try {
      let b64;
      if (/pdf$/i.test(arq.type) || /\.pdf$/i.test(arq.name)) {
        const by = new Uint8Array(await arq.arrayBuffer()); let bin = "";
        for (let i = 0; i < by.length; i += 0x8000) bin += String.fromCharCode(...by.subarray(i, i + 0x8000));
        b64 = btoa(bin);
      } else {
        const url = URL.createObjectURL(arq);
        try {
          const img = await new Promise((ok, falha) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => falha(new Error("Não consegui abrir essa foto.")); i.src = url; });
          const k = Math.min(1, 2400 / Math.max(img.naturalWidth, img.naturalHeight));
          const cv = document.createElement("canvas");
          cv.width = Math.round(img.naturalWidth * k); cv.height = Math.round(img.naturalHeight * k);
          const g = cv.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(img, 0, 0, cv.width, cv.height);
          b64 = cv.toDataURL("image/jpeg", 0.85).split(",")[1];
        } finally { URL.revokeObjectURL(url); }
      }
      const partes = b64.match(/[\s\S]{1,30000}/g) || [];
      const envio = `anexo${Date.now()}`;
      let r = null;
      for (let n = 1; n <= partes.length; n++) {
        this._anexando = partes.length > 1 ? `${n}/${partes.length}` : " "; this._render();
        r = await this._api({ acao: "pedaco", para: "anexo", envio, n, total: partes.length, dados: partes[n - 1], id });
      }
      this._aviso = r?.mensagem || "Cupom guardado.";
      return true;
    } catch (e) {
      this._aviso = "⚠ " + (e.message || e);
      return false;
    } finally {
      this._anexando = null;
      this._render();
    }
  }

  // Compras de uma barra da Visão geral (forma de pagamento ou loja), no período escolhido
  _folhaLista() {
    const L = this._lista;
    const set = new Set(this._periodo().meses);
    const linhas = [];
    this._compras().filter((c) => set.has((c.emissao || "").slice(0, 7))).forEach((c) => {
      if (L.tipo === "pag") (c.pago_com || []).forEach((pg) => { if (this._pagNome(pg) === L.k) linhas.push([c, pg.valor]); });
      else if (c.loja_curta === L.k) linhas.push([c, c.valor_pago]);
    });
    linhas.sort((a, b) => (b[0].emissao || "").localeCompare(a[0].emissao || ""));
    const tot = linhas.reduce((s, [, v]) => s + (v || 0), 0);
    const per = (this._modo || "mes") === "mes" ? this._mesNome(this._mes) : this._modo === "12m" ? "últimos 12 meses" : "desde a primeira compra";
    return `<dialog class="folha" aria-label="Compras">
      <div class="fh"><div style="min-width:0"><div class="ft">${this._e(L.k)}</div>
        <div class="fs">${linhas.length} ${linhas.length === 1 ? "compra" : "compras"} · ${this._brl(tot)} · ${this._e(per)}</div></div>
        <button class="ico" data-a="fechar" aria-label="Fechar">✕</button></div>
      <div class="fs">Toque numa compra para ver o cupom, a nota ou ajustar (forma de pagamento, cartão, categoria).</div>
      <div class="lista">${linhas.map(([c, v]) => this._linha(c, v, true)).join("") || `<div class="vazio peq">Nenhuma compra.</div>`}</div>
    </dialog>`;
  }

  _linha(c, parte = null, comAno = false) {
    const t = this._dia(c.emissao);
    const r = c.reembolso?.status;
    const tag = r === "a_reembolsar" ? `<span class="tag areemb">a reembolsar</span>` : r === "pago" ? `<span class="tag ok">reembolsado</span>`
      : r === "a_receber" ? `<span class="tag arec">a receber${c.reembolso.de ? ` · ${this._e(c.reembolso.de)}` : ""}</span>` : r === "recebido" ? `<span class="tag ok">recebido</span>` : "";
    const qtd = c.origem === "manual" ? "" : ` · ${c.qtd_itens} ${c.qtd_itens === 1 ? "item" : "itens"}`;
    return `<button class="row" data-a="abrir" data-id="${this._e(c.id)}">
      <div class="data"><b>${t.dia}</b>${t.mes}${comAno ? `<br>${(c.emissao || "").slice(2, 4)}` : ""}</div>
      <div class="meio"><div class="loja">${this._e(c.loja_curta)}</div>
        <div class="meta"><i style="background:${this._cor(c.quem)}"></i><span class="mt">${this._e(c.quem)} · ${this._e(this._classe(c))}${qtd}</span></div></div>
      <div class="dir"><div class="amt">${parte == null && this._semReal(c) ? this._moeda(c.moeda) : this._brl(parte ?? c.valor_pago)}</div>${c.moeda && !this._semReal(c) ? `<div class="meta">${this._moeda(c.moeda)}</div>` : ""}${c.valor_nota != null ? `<div class="meta">nota ${this._brl(c.valor_nota)}</div>` : ""}${c.emissao_nota ? `<div class="meta">nota de ${this._dataCurta(c.emissao_nota)}</div>` : ""}${parte != null && Math.abs(parte - (c.valor_pago || 0)) > 0.009 ? `<div class="meta">de ${this._brl(c.valor_pago)}</div>` : ""}${tag}</div>
    </button>`;
  }

  // ---------------------------------------------------------------- produtos
  async _carregarProdutos() {
    try { const r = await this._api({ acao: "produtos" }); this._prods = r.produtos; this._prodSecoes = r.secoes || []; this._prodErro = null; }
    catch (e) { this._prodErro = e.message || String(e); }
    this._render();
  }

  _norm(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase(); }

  // Busca: nome da nota, nome com abreviações abertas (biblioteca), tipo, seção, mercado e código de barras.
  // Cada palavra digitada precisa aparecer; "deterg" acha "detergente" e "detergente" acha uma abreviação "DETERG".
  _filtrarProdutos(lista, q, secao) {
    const termos = this._norm(q).split(/[^A-Z0-9]+/).filter(Boolean);
    if (secao) lista = lista.filter((p) => p.secao === secao);
    if (!termos.length) return lista;
    return lista.filter((p) => {
      const alvo = this._norm([p.descricao, ...(p.descricoes || []), p.busca || "", ...(p.lojas || []), p.ean || ""].join(" "));
      const palavras = alvo.split(/[^A-Z0-9]+/).filter((w) => w.length >= 4);
      return termos.every((t) => alvo.includes(t) || palavras.some((w) => t.startsWith(w)));
    });
  }

  _telaProdutos() {
    const vistas = `<div class="chips">${[["lista", "Lista"], ["precos", "Preços"]].map(([k, n]) => `<button class="chip ${(this._prodVista || "lista") === k ? "on" : ""}" data-a="pvista" data-k="${k}">${n}</button>`).join("")}</div>`;
    if (this._prodVista === "precos") return vistas + this._telaPrecos();
    if (this._prodErro) return `<div class="vazio">⚠ ${this._e(this._prodErro)}<br><button class="btn" data-a="aba" data-k="produtos">Tentar de novo</button></div>`;
    if (!this._prods) return `<div class="vazio">Carregando produtos…</div>`;
    const presentes = new Set(this._prods.map((p) => p.secao).filter(Boolean));
    const secoes = (this._prodSecoes || []).filter((s) => presentes.has(s));
    return `${vistas}
      <div class="busca"><input id="q-prod" type="search" aria-label="Buscar produto" placeholder="Buscar: amaciante, iogurte, sem lactose, Atacadão…" value="${this._e(this._q || "")}" autocomplete="off"></div>
      ${secoes.length ? `<div class="chips rolar">${[["", "Todas"], ...secoes.map((s) => [s, s])].map(([k, n]) => `<button class="chip ${(this._secao || "") === k ? "on" : ""}" data-a="secao" data-k="${this._e(k)}">${this._e(n)}</button>`).join("")}</div>` : ""}
      <div class="h"><small id="n-prod"></small></div>
      <div class="lista" id="lista-prod">${this._listaProdutosHtml()}</div>
      ${this._aviso ? `<div class="aviso" role="status">${this._e(this._aviso)}</div>` : ""}`;
  }

  _listaProdutosHtml() {
    const achados = this._filtrarProdutos(this._prods || [], this._q, this._secao);
    this._nAchados = achados.length;
    // compras lançadas à mão não têm itens: a busca procura na observação e na loja delas
    const termos = this._norm(this._q).split(/[^A-Z0-9]+/).filter(Boolean);
    const manuais = termos.length && !this._secao ? this._compras().filter((c) => c.origem === "manual"
      && termos.every((t) => this._norm(`${c.observacao || ""} ${c.loja_curta || ""}`).includes(t))) : [];
    const blocoM = manuais.length ? `<div class="h" style="margin-top:10px"><h3>Compras lançadas à mão</h3><small>${manuais.length}</small></div>${manuais.slice(0, 20).map((c) => this._linha(c, null, true) + (c.observacao ? `<div class="fs" style="margin:-4px 0 6px 52px">📝 ${this._e(c.observacao)}</div>` : "")).join("")}` : "";
    if (!achados.length) return blocoM || `<div class="vazio peq">Nenhum produto encontrado${this._q ? ` para “${this._e(this._q)}”` : ""}${this._secao ? ` em ${this._e(this._secao)}` : ""}.</div>`;
    return blocoM + achados.slice(0, 150).map((p) => {
      const u = p.ultimo;
      const comp = p.n_lojas > 1 && p.mais_barato
        ? `<span class="tag ok">+ barato: ${this._e(p.mais_barato.loja)}</span>` : "";
      return `<button class="row prod" data-a="produto" data-k="${this._e(p.chave)}">
        <div class="meio"><div class="loja">${this._e(p.descricao)}</div>
          <div class="meta">${this._brl(u.unit)}${p.un ? `/${this._e(p.un.toLowerCase())}` : ""} · ${this._e(u.loja)}</div></div>
        <div class="dir">${p.n_lojas > 1 ? `<div class="amt">${this._brl(p.mais_barato.unit)}</div>${comp}` : `<div class="amt">${this._brl(u.unit)}</div>`}</div>
      </button>`;
    }).join("") + (achados.length > 150 ? `<div class="vazio peq">Mostrando 150 de ${achados.length}. Refine a busca.</div>` : "");
  }

  async _abrirProduto(chave) {
    this._prod = { carregando: true };
    this._juntar = null;
    this._render();
    try { this._prod = await this._api({ acao: "produto", chave }); }
    catch (e) { this._prod = null; this._aviso = "⚠ " + (e.message || e); }
    this._render();
  }

  _corLoja(i) { return ["var(--c-acc)", "#e8833a", "#8e5cd9", "#0f9f8f", "#d9467a", "#7a8b99"][i % 6]; }

  _grafico(hist) {
    const pts = hist.filter((h) => h.unit != null);
    if (pts.length < 3) return ""; // com 1 ou 2 compras a lista "Todas as compras" já diz tudo
    const lojas = [...new Set(pts.map((h) => h.loja))];
    const W = 520, H = 200, L = 52, R = 14, T = 12, B = 26;
    const ts = pts.map((h) => new Date(h.data).getTime());
    let t0 = Math.min(...ts), t1 = Math.max(...ts);
    if (t1 === t0) { t0 -= 86400000; t1 += 86400000; }
    let y0 = Math.min(...pts.map((h) => h.unit)), y1 = Math.max(...pts.map((h) => h.unit));
    const pad = (y1 - y0) * 0.15 || y1 * 0.1 || 1; y0 = Math.max(0, y0 - pad); y1 += pad;
    const x = (t) => L + (t - t0) / (t1 - t0) * (W - L - R);
    const y = (v) => T + (y1 - v) / (y1 - y0) * (H - T - B);
    let s = "";
    for (let k = 0; k <= 3; k++) {
      const v = y0 + (y1 - y0) * k / 3;
      s += `<line x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" class="gl"/><text x="${L - 6}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${this._e(v.toFixed(2).replace(".", ","))}</text>`;
    }
    const fd = (t) => new Date(t).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    s += `<text x="${L}" y="${H - 6}" text-anchor="start">${fd(t0)}</text><text x="${W - R}" y="${H - 6}" text-anchor="end">${fd(t1)}</text>`;
    lojas.forEach((lj, i) => {
      const ps = pts.filter((h) => h.loja === lj).map((h) => [x(new Date(h.data).getTime()), y(h.unit)]);
      const cor = this._corLoja(i);
      if (ps.length > 1) s += `<polyline points="${ps.map((p) => p.map((n) => n.toFixed(1)).join(",")).join(" ")}" fill="none" stroke="${cor}" stroke-width="2.2" stroke-linejoin="round"/>`;
      ps.forEach((p) => { s += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="4" fill="${cor}" stroke="var(--c-fundo)" stroke-width="1.5"/>`; });
    });
    const leg = lojas.map((lj, i) => `<span><i style="background:${this._corLoja(i)}"></i>${this._e(lj)}</span>`).join("");
    return `<svg class="graf" viewBox="0 0 ${W} ${H}" role="img" aria-label="Preço ao longo do tempo">${s}</svg><div class="leg">${leg}</div>`;
  }

  _folhaProduto() {
    const d = this._prod;
    if (d.carregando) return `<dialog class="folha"><div class="vazio">Abrindo produto…</div></dialog>`;
    const r = d.resumo;
    const lojas = Object.entries(d.por_loja || {}).sort((a, b) => a[1].unit - b[1].unit);
    const menor = lojas[0]?.[1].unit;
    const fdt = (iso) => new Date(iso).toLocaleDateString("pt-BR");
    const juntar = this._juntar != null ? (() => {
      const cand = this._filtrarProdutos((this._prods || []).filter((p) => p.chave !== r.chave), this._juntar).slice(0, 20);
      return `<div class="juntar"><div class="fs">Escolha o produto que é o mesmo que este (ex.: mesmo item com outro nome em outro mercado):</div>
        <input id="q-juntar" type="search" aria-label="Buscar o produto igual" placeholder="Buscar…" value="${this._e(this._juntar)}" autocomplete="off">
        <div class="lista">${cand.map((p) => `<button class="row prod" data-a="juntar-com" data-k="${this._e(p.chave)}"><div class="meio"><div class="loja">${this._e(p.descricao)}</div><div class="meta">${this._e((p.lojas || []).join(", "))} · ${this._brl(p.ultimo.unit)}</div></div><div class="dir"><span class="tag ok">juntar</span></div></button>`).join("") || `<div class="vazio peq">Nada encontrado.</div>`}</div>
        <button class="lnk" data-a="juntar-nao">cancelar</button></div>`;
    })() : "";
    return `<dialog class="folha" aria-label="Produto">
      <div class="fh"><div style="min-width:0"><div class="ft">${this._e(r.descricao)}</div>
        <div class="fs">${r.tipo ? `<b>${this._e(r.tipo)}</b>${r.secao ? ` · ${this._e(r.secao)}` : ""} · ` : ""}${r.ean ? `Código de barras ${this._e(r.ean)} · ` : ""}${r.vezes} ${r.vezes === 1 ? "compra" : "compras"} · ${this._brl(r.gasto)} no total</div></div>
        <button class="ico" data-a="fechar" aria-label="Fechar">✕</button></div>
      ${lojas.length > 1 ? `<div class="destaque">Mais barato: <b>${this._e(lojas[0][0])}</b> ${this._brl(menor)}${lojas.length > 1 ? ` · ${Math.round((lojas[lojas.length - 1][1].unit - menor) / menor * 100)}% mais caro em ${this._e(lojas[lojas.length - 1][0])}` : ""}</div>` : ""}
      ${this._grafico(d.historico)}
      <div class="h"><h2>Último preço por mercado</h2></div>
      ${lojas.map(([lj, v]) => `<div class="bar"><span class="n ${v.unit === menor && lojas.length > 1 ? "best" : ""}">${this._e(lj)}</span><div class="trk"><div class="fill ${v.unit === menor && lojas.length > 1 ? "best" : ""}" style="width:${(v.unit / lojas[lojas.length - 1][1].unit * 100).toFixed(1)}%"></div></div><span class="p">${this._brl(v.unit)}${v.promo ? " · promo" : ""}</span></div>`).join("")}
      <div class="h"><h2>Todas as compras</h2></div>
      <div class="hist">${d.historico.slice().reverse().map((h) => `<button class="hl toca" data-a="abrir" data-id="${this._e(h.compra)}" aria-label="Abrir a compra de ${fdt(h.data)}"><span>${fdt(h.data)}</span><span class="hn">${this._e(h.loja)}</span><span>${this._num(h.qtd)} ${this._e((h.un || "").toLowerCase())} × ${this._brl(h.unit)}${h.un ? `/${this._e(h.un.toLowerCase())}` : " cada"}${h.promo ? " · promo" : ""}</span><span>${this._e(h.quem || "")} ›</span></button>`).join("")}</div>
      <div class="fs">Toque numa compra para abrir o cupom e a nota fiscal.</div>
      ${(d.parecidos || []).length && this._juntar == null ? `<div class="parec"><div class="h"><h2>Parece ser o mesmo?</h2><small>em outro mercado</small></div>
        <div class="fs">Junte só se for o mesmo produto; assim os preços dos mercados ficam lado a lado.</div>
        <div class="lista">${d.parecidos.map((p) => `<button class="row prod" data-a="juntar-com" data-k="${this._e(p.chave)}"><div class="meio"><div class="loja">${this._e(p.descricao)}</div><div class="meta">${this._e((p.lojas || []).join(", "))} · ${this._brl(p.ultimo.unit)}${p.un ? `/${this._e(p.un.toLowerCase())}` : ""}</div></div><div class="dir"><span class="tag ok">juntar</span></div></button>`).join("")}</div></div>` : ""}
      <details class="editar" data-k="_editProd" ${this._editProd || this._juntar != null ? "open" : ""}><summary>Editar produto</summary><div class="edcorpo">
      ${(r.descricoes || []).length > 1 ? `<div class="fs">Aparece como: ${r.descricoes.map((x) => this._e(x)).join(" · ")}</div>` : ""}
      <label class="tipo">Tipo do produto <select data-tipo="1">
        <option value="">${r.tipo && r.tipo_via !== "voces" ? `Automático (${this._e(r.tipo)})` : r.tipo_via === "voces" ? "Automático (biblioteca)" : "Sem tipo"}</option>
        ${(d.tipos || []).map((t) => `<option value="${this._e(t)}" ${r.tipo_via === "voces" && r.tipo === t ? "selected" : ""}>${this._e(t)}</option>`).join("")}
      </select></label>
      ${juntar}
      <div class="fpe">${this._juntar == null ? `<button class="lnk" data-a="juntar">Juntar com outro produto igual</button>` : ""}
        ${(d.vinculado || []).length ? `<button class="lnk perigo" data-a="separar">Separar os produtos juntados</button>` : ""}</div>
      </div></details>
    </dialog>`;
  }

  // ---------------------------------------------------------------- visão geral
  // Período: um mês (mesmas setas da aba Compras), os últimos 12 meses ou tudo. Gastos, calendário e
  // reembolso vêm da lista que o card já tem; produtos e preços vêm do script (acao "visao").
  _periodo() {
    const modo = this._modo || "mes";
    if (modo === "mes") return { modo, meses: [this._mes] };
    const hoje = this._mesDe(new Date());
    if (modo === "tudo") {
      const comCompra = [...new Set(this._compras().map((c) => (c.emissao || "").slice(0, 7)).filter(Boolean))].sort();
      return { modo, meses: comCompra.length ? comCompra : [hoje] };
    }
    const ini = this._somaMes(hoje)(-11);
    const prox = this._somaMes(ini);
    const meses = [ini];
    while (meses[meses.length - 1] < hoje && meses.length < 12) meses.push(prox(1));
    return { modo, meses };
  }

  async _carregarVisao() {
    const seq = (this._visaoSeq = (this._visaoSeq || 0) + 1);
    const p = this._periodo();
    const pedido = p.modo === "mes" ? { acao: "visao", mes: this._mes } : p.modo === "12m" ? { acao: "visao", de: p.meses[0] } : { acao: "visao", dias: 0 };
    try {
      const v = await this._api(pedido);
      if (seq !== this._visaoSeq) return; // chegou a resposta de um período que já foi trocado
      this._visao = v; this._visaoErro = null;
    } catch (e) {
      if (seq !== this._visaoSeq) return;
      this._visaoErro = e.message || String(e);
    }
    if (this._abaAtual() === "visao" && !this._novo && !this._prod && !this._aberta && !this._lista && !this._bem && !this._avisosAberto) this._render();
  }

  _brl0(v) { return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }); }

  _porDia(m) {
    const porDia = {};
    this._doMes(m).forEach((c) => { const k = Number((c.emissao || "").slice(8, 10)); (porDia[k] = porDia[k] || []).push(c); });
    return porDia;
  }

  _legenda() {
    return `<div class="leg">${(this._dados?.compradores || []).map((p) => `<span><i class="pt" style="background:${this._cor(p)}"></i>${this._e(p)}</span>`).join("")}</div>`;
  }

  _calendario(m) {
    const [a, n] = m.split("-").map(Number);
    const ini = new Date(a, n - 1, 1).getDay(), nd = new Date(a, n, 0).getDate();
    const porDia = this._porDia(m);
    const max = Math.max(1, ...Object.values(porDia).map((l) => this._soma(l)));
    const hoje = new Date();
    const hojeK = this._mesDe(hoje) === m ? hoje.getDate() : 0;
    let cel = ["D", "S", "T", "Q", "Q", "S", "S"].map((x) => `<span class="cw">${x}</span>`).join("") + "<span></span>".repeat(ini);
    for (let k = 1; k <= nd; k++) {
      const l = porDia[k];
      if (!l) { cel += `<span class="cd ${k === hojeK ? "hoje" : ""}"><span class="n">${k}</span></span>`; continue; }
      const t = this._soma(l);
      const pct = Math.round(14 + 40 * t / max);
      const pessoas = [...new Set(l.map((c) => c.quem))];
      cel += `<button class="cd tem ${this._diaSel === k ? "sel" : ""} ${k === hojeK ? "hoje" : ""}" data-a="dia" data-k="${k}"
        style="background:color-mix(in srgb,var(--c-acc) ${pct}%,transparent)" aria-label="Dia ${k}: ${l.length} compra(s), ${this._brl(t)}">
        <span class="n">${k}</span><span class="dots">${pessoas.map((p) => `<i style="background:${this._cor(p)}"></i>`).join("")}</span></button>`;
    }
    const lst = this._doMes(m);
    const dias = Object.keys(porDia).length;
    const maior = lst.slice().sort((x, y) => (y.valor_pago || 0) - (x.valor_pago || 0))[0];
    const dm = (iso) => iso.slice(8, 10) + "/" + iso.slice(5, 7);
    const resumo = dias
      ? `<b>${dias} ${dias === 1 ? "dia" : "dias"} com compra</b> · maior: ${dm(maior.emissao)} ${this._e(maior.loja_curta)} ${this._brl(maior.valor_pago)}`
      : "Nenhuma compra neste mês.";
    let sel = "";
    const l = this._diaSel && porDia[this._diaSel];
    if (l) {
      const dt = new Date(a, n - 1, this._diaSel);
      const sem = dt.toLocaleDateString("pt-BR", { weekday: "long" });
      sel = `<div class="diasel"><div class="h"><h2 class="h3">${this._e(sem[0].toUpperCase() + sem.slice(1))}, ${String(this._diaSel).padStart(2, "0")}/${String(n).padStart(2, "0")}</h2>
        <small>${l.length} ${l.length === 1 ? "compra" : "compras"} · ${this._brl(this._soma(l))}</small></div>
        <div class="lista">${l.map((c) => this._linha(c)).join("")}</div></div>`;
    }
    return `<section><div class="h"><h2>Dias de compra</h2></div>
      <div class="cal">${cel}</div>${this._legenda()}
      <div class="fs">${resumo}</div>${sel}</section>`;
  }

  _anoCal(meses) {
    const minis = meses.map((m, idx) => {
      const [a, n] = m.split("-").map(Number);
      const ini = new Date(a, n - 1, 1).getDay(), nd = new Date(a, n, 0).getDate();
      const porDia = this._porDia(m);
      let cel = "<i></i>".repeat(ini);
      for (let k = 1; k <= nd; k++) {
        const l = porDia[k];
        if (!l) { cel += `<i class="md"></i>`; continue; }
        const porP = {};
        l.forEach((c) => { porP[c.quem] = (porP[c.quem] || 0) + (c.valor_pago || 0); });
        const quem = Object.entries(porP).sort((x, y) => y[1] - x[1])[0][0]; // cor de quem gastou mais no dia
        cel += `<i class="md tem" style="background:${this._cor(quem)}"></i>`;
      }
      const lm = this._doMes(m);
      const dias = Object.keys(porDia).length;
      const nome = this._mesAbrev(m);
      const ano = idx === 0 || meses[idx - 1].slice(0, 4) !== m.slice(0, 4) ? ` ${String(a).slice(2)}` : "";
      return `<button class="mini ${lm.length ? "" : "nada"}" data-a="ir-mes" data-k="${m}" aria-label="${this._e(this._mesNome(m))}: ${lm.length} compra(s)">
        <div class="mh"><b>${nome[0].toUpperCase()}${nome.slice(1)}${ano}</b></div>
        <div class="mg">${cel}</div>
        <div class="ms">${lm.length ? `<b>${this._brl(this._soma(lm))}</b><br>${dias} ${dias === 1 ? "dia" : "dias"} de compra` : "sem compras"}</div></button>`;
    });
    return `<section><div class="h"><h2>Dias de compra por mês</h2><small>toque no mês para abrir</small></div>
      <div class="ano">${minis.join("")}</div>${this._legenda()}</section>`;
  }

  _telaVisao() {
    const d = this._dados;
    const p = this._periodo();
    const set = new Set(p.meses);
    const lst = this._compras().filter((c) => set.has((c.emissao || "").slice(0, 7)) && !this._semReal(c));  // em outra moeda sem valor em R$: fora dos totais
    const total = this._soma(lst);
    const modos = [["mes", "Mês"], ["12m", "12 meses"], ["tudo", "Tudo"]];
    const topo = `<div class="topo">${p.modo === "mes" ? this._navMes()
      : `<div class="mes"><span>${p.modo === "12m" ? "Últimos 12 meses" : "Desde a primeira compra"}</span></div>`}
      <div class="chips">${modos.map(([k, n]) => `<button class="chip ${p.modo === k ? "on" : ""}" data-a="periodo" data-k="${k}">${n}</button>`).join("")}</div></div>`;

    let dGasto;
    if (p.modo === "mes") {
      const mAnt = this._somaMes(this._mes)(-1);
      const ant = this._soma(this._doMes(mAnt));
      const varPct = ant > 0 ? (total - ant) / ant : null;
      dGasto = varPct == null ? "sem mês anterior para comparar"
        : `<b class="${varPct > 0 ? "sobe" : "desce"}">${varPct > 0 ? "+" : ""}${Math.round(varPct * 100)}%</b> sobre ${this._e(COMPRAS_MESES[Number(mAnt.slice(5)) - 1])}`;
    } else {
      const comCompra = p.meses.filter((m) => this._doMes(m).length).length || 1;
      dGasto = `média ${this._brl(total / comCompra)} por mês com compra`;
    }
    const dias = new Set(lst.map((c) => (c.emissao || "").slice(0, 10))).size;
    const porPessoa = {}, porLoja = {};
    lst.forEach((c) => {
      porPessoa[c.quem] = (porPessoa[c.quem] || 0) + (c.valor_pago || 0);
      porLoja[c.loja_curta] = (porLoja[c.loja_curta] || 0) + (c.valor_pago || 0);
    });
    const barras = (obj, vazio, tipo) => {
      const e = Object.entries(obj).sort((x, y) => y[1] - x[1]);
      const mx = e[0]?.[1] || 1;
      return e.length ? e.map(([k, val]) => `<button class="bar toca" data-a="ver-lista" data-t="${tipo}" data-k="${this._e(k)}" aria-label="Ver compras: ${this._e(k)}"><span class="n">${this._e(k)}</span><div class="trk"><div class="fill" style="width:${(val / mx * 100).toFixed(1)}%"></div></div><span class="p">${this._brl(val)} ›</span></button>`).join("")
        : `<div class="vazio peq">${vazio}</div>`;
    };
    const semGasto = p.modo === "mes" ? "Sem gastos neste mês." : "Sem gastos no período.";
    // Como foi pago: o vale aparece pelo cartão de vale; crédito e débito, por dono do cartão
    const porPag = {};
    lst.forEach((c) => (c.pago_com || []).forEach((pg) => { const k = this._pagNome(pg); porPag[k] = (porPag[k] || 0) + (pg.valor || 0); }));
    const pessoas = (d.compradores || []).filter((x) => porPessoa[x] > 0);
    const sub = d.subiram || [], bai = d.baixaram || [];

    return `${topo}
      ${this._aviso ? `<div class="aviso" role="status">${this._e(this._aviso)}</div>` : ""}
      <div class="kpis">
        <div class="kpi"><div class="l">${p.modo === "mes" ? "Gasto no mês" : "Gasto no período"}</div><div class="v">${this._brl(total)}</div><div class="d">${dGasto}</div></div>
        <div class="kpi"><div class="l">Compras</div><div class="v">${lst.length}</div>
          <div class="d">${lst.length ? `em ${dias} ${dias === 1 ? "dia" : "dias"}${pessoas.length === 1 ? ` · todas de ${this._e(pessoas[0])}` : ""}` : p.modo === "mes" ? "nenhuma neste mês" : "nenhuma no período"}</div></div>
        ${pessoas.length > 1 ? `<div class="kpi pessoas"><div class="l">Por pessoa</div>
          ${pessoas.map((x) => `<div class="pp"><i style="background:${this._cor(x)}"></i><span>${this._e(x)}</span><b>${this._brl(porPessoa[x])}</b></div>`).join("")}</div>` : ""}
      </div>
      <div class="grade">
        <div class="col">
          ${p.modo === "mes" ? this._calendario(this._mes) : this._anoCal(p.meses)}
          ${this._blocoBens(d)}
        </div>
        <div class="col">
          <section><div class="h"><h2>Como foi pago</h2><small>toque para ver as compras</small></div>${barras(porPag, semGasto, "pag")}</section>
          <section><div class="h"><h2>Onde gastaram</h2><small>toque para ver as compras</small></div>${barras(porLoja, semGasto, "loja")}</section>
          ${sub.length || bai.length ? `<section><div class="h"><h2>Preços</h2><button class="lnk" data-a="ver-precos">ver tudo</button></div>
            <div class="fs">${sub.length} subiram e ${bai.length} baixaram em relação à compra anterior no mesmo mercado. Os maiores:</div>
            ${[...sub.slice().sort((x, y) => y.variacao - x.variacao).slice(0, 3), ...bai.slice().sort((x, y) => x.variacao - y.variacao).slice(0, 3)].map((s) => this._linhaVar(s, false)).join("")}
          </section>` : ""}
        </div>
      </div>
      ${this._rodape(d)}`;
  }

  _pagNome(pg) { return !pg.tipo ? "Não informado" : pg.carteira ? `Saldo ${pg.carteira}` : pg.tipo === "Benefício" ? (pg.cartao_nome || (pg.cartao && pg.cartao !== "ALELO" ? `Benefício ${pg.cartao}` : "Benefício")) : pg.cartao ? `${String(pg.cartao_nome || "").includes(`· ${String(pg.tipo).toLowerCase()}`) ? "" : `${pg.tipo} `}${pg.cartao_nome || pg.cartao}${pg.parcelas > 1 ? ` ${pg.parcelas}x` : ""}` : pg.tipo === "Benefício" || !pg.dono ? pg.tipo : `${pg.tipo} · ${pg.dono}`; }

  _linhaVar(s, datas) {
    return `<button class="sub ${s.variacao < 0 ? "baixou" : ""}" data-a="produto" data-k="${this._e(s.produto)}"><span class="t">${this._e(s.descricao)}</span>
      <span class="pill">${s.variacao > 0 ? "+" : "−"}${Math.round(Math.abs(s.variacao) * 100)}% · ${this._brl(s.para)}</span>
      ${datas ? `<span class="m">${this._brl(s.de)} em ${this._dataCurta(s.data_antes)}${s.promo_antes ? " (promo)" : ""} → ${this._brl(s.para)} em ${this._dataCurta(s.data)}${s.promo_agora ? " (promo)" : ""} · ${this._e(s.loja)}</span>` : ""}</button>`;
  }

  // ---------------------------------------------------------------- produtos: preços (últimos 12 meses)
  async _carregarPrecos() {
    try { this._precos = await this._api({ acao: "visao", de: this._somaMes(this._mesDe(new Date()))(-11) }); this._precosErro = null; }
    catch (e) { this._precosErro = e.message || String(e); }
    if (this._abaAtual() === "produtos" && !this._prod) this._render();
  }

  _telaPrecos() {
    const d = this._dados, v = this._precos;
    if (this._precosErro) return `<div class="vazio">⚠ ${this._e(this._precosErro)}</div>`;
    if (!v) return `<div class="vazio">Calculando…</div>`;
    const linhaProd = (pr, dir, meta) => `<button class="row prod" data-a="produto" data-k="${this._e(pr.chave)}"><div class="meio"><div class="loja">${this._e(pr.descricao)}</div><div class="meta">${meta}</div></div><div class="dir">${dir}</div></button>`;
    const lista = (lst, vazio) => !lst.length ? `<div class="vazio peq">${vazio}</div>`
      : lst.slice(0, 6).map((s) => this._linhaVar(s, true)).join("") + (lst.length > 6 ? `<details class="mais"><summary>Ver mais ${lst.length - 6}</summary><div class="col">${lst.slice(6).map((s) => this._linhaVar(s, true)).join("")}</div></details>` : "");
    const rank = v.ranking || [], comp = v.comparaveis || [];
    const repetidos = (v.mais_comprados || []).filter((pr) => pr.vezes > 1);
    return `<div class="grade">
      <div class="col">
        <section><div class="h"><h2>Subiram de preço</h2><small>mesmo mercado · 5% ou mais</small></div>${lista(d.subiram || [], "Nada subiu ainda.")}</section>
        <section><div class="h"><h2>Baixaram de preço</h2><small>mesmo mercado · 5% ou mais</small></div>${lista(d.baixaram || [], "Nada baixou ainda.")}</section>
      </div>
      <div class="col">
        <section><div class="h"><h2>Qual mercado compensa</h2><small>últimos 12 meses</small></div>
          ${comp.length >= 3 ? `${rank.map((r, i) => `<div class="rk"><b class="pos">${i + 1}º</b><div class="meio"><div class="loja">${this._e(r.loja)}</div>
            <div class="meta">mais barato em ${r.mais_barato} de ${r.comparados} ${r.comparados === 1 ? "produto" : "produtos"}${r.media_acima > 0.001 ? ` · em média ${Math.round(r.media_acima * 100)}% acima do menor preço` : " · sempre no menor preço"}</div></div></div>`).join("")}
            ${v.economia_possivel > 0 ? `<div class="fs">Pagando sempre o menor preço visto, daria para economizar ${this._brl(v.economia_possivel)}.</div>` : ""}`
            : `<div class="vazio peq">Aparece quando houver pelo menos 3 produtos comprados em mercados diferentes (hoje: ${comp.length}).</div>`}
          ${comp.length ? `<details class="mais"><summary>Diferenças de preço (${comp.length})</summary><div class="lista">${comp.slice(0, 15).map((c) => linhaProd(c, `<span class="tag areemb">${Math.round(c.diferenca * 100)}%</span>`,
            Object.entries(c.lojas).sort((x, y) => x[1] - y[1]).map(([l, pr]) => `${this._e(l)} ${this._brl(pr)}`).join(" · "))).join("")}</div></details>` : ""}
        </section>
        <section><div class="h"><h2>Onde vai o dinheiro</h2><small>últimos 12 meses</small></div>
          ${(v.top_gasto || []).slice(0, 6).map((pr) => linhaProd(pr, `<div class="amt">${this._brl(pr.gasto)}</div>`, `${pr.vezes}× · ${this._e((pr.lojas || []).join(", "))}`)).join("") || `<div class="vazio peq">Sem itens.</div>`}
        </section>
        ${repetidos.length ? `<section><div class="h"><h2>Mais comprados</h2><small>últimos 12 meses</small></div>
          ${repetidos.slice(0, 6).map((pr) => linhaProd(pr, `<div class="amt">${pr.vezes}×</div>`, `último ${this._brl(pr.ultimo.unit)} · ${this._e(pr.ultimo.loja)}`)).join("")}</section>` : ""}
      </div>
    </div>`;
  }

  // ---------------------------------------------------------------- folha (cupom / lançar)
  _folha() {
    if (this._novo) return this._folhaNovo();
    if (this._up) return this._folhaUpload();
    if (!this._aberta) return this._fConf ? this._finFolhaConf() : this._fConta ? this._finFolhaConta() : this._fAgua ? this._finFolhaAgua() : this._fLuz ? this._finFolhaLuz() : this._fFat ? this._finFolhaFat() : this._fRec ? this._finFolhaRec() : this._prod ? this._folhaProduto() : this._fCats ? this._finFolhaCats() : this._fSecao ? this._finFolhaSecao() : this._fLista ? this._finFolhaLista() : this._lista ? this._folhaLista() : this._bem ? this._folhaBem() : this._avisosAberto ? this._folhaAvisos() : "";
    if (this._nota) return this._folhaNota();
    const c = this._aberta;
    if (c.carregando) return `<dialog class="folha"><div class="vazio">Abrindo cupom…</div></dialog>`;
    const t = this._dia(c.emissao);
    const d = this._dados;
    const pago = c.pago_com || [];
    const uf = COMPRAS_UF[(c.chave || "").slice(0, 2)] || "";
    const nfe = (c.chave || "").slice(20, 22) === "55";
    // NFS-e do padrão nacional: a chave de acesso (50 dígitos) abre a consulta pública já preenchida (o captcha é com a pessoa)
    const nfseNac = c.origem === "nfse" && /^\d{50}$/.test(c.codigo_verificacao || "") ? `https://www.nfse.gov.br/ConsultaPublica/?tpc=1&chave=${c.codigo_verificacao}` : "";
    const temCartao = pago.some((pg) => pg.tipo === "Crédito" || pg.tipo === "Débito");
    const sel = (nome, lista, atual) => `<select data-ed="${nome}">${lista.map((v) => `<option value="${this._e(v[0])}" ${v[0] === atual ? "selected" : ""}>${this._e(v[1])}</option>`).join("")}</select>`;
    const todasPrimeira = (c.itens || []).length > 0 && (c.itens || []).every((i) => i.primeira);
    const dq = this._destaque?.id === c.id ? this._destaque.n : null;
    const itens = (c.itens || []).map((i, n) => {
      // Só compara com compra ANTERIOR a este cupom, no mesmo mercado (o script já entrega assim)
      const cp = i.comparacao;
      let seta = "", antes = "";
      if (cp && Math.abs(cp.variacao) >= 0.03) {
        const v = cp.variacao;
        seta = `<span class="${v > 0 ? "sobe" : "desce"}">${v > 0 ? "▲" : "▼"}${Math.round(Math.abs(v) * 100)}%</span>`;
        antes = `<div class="it q ant${dq?.has(n) ? " dq" : ""}">antes ${this._brl(cp.de)} em ${this._dataCurta(cp.data)}${cp.promo_antes ? " (era promoção)" : ""}</div>`;
      } else if (i.primeira && !todasPrimeira) seta = `<span class="ant">1ª compra</span>`;
      const d1 = dq?.has(n) ? " dq" : "";
      return `<div class="it${d1}"><span class="ds">${this._e(i.descricao)}${i.promo ? ` <em>promo</em>` : ""}</span><span class="vt">${this._brl(i.total)}</span></div>
        <div class="it q${d1}"><span>${this._num(i.qtd)} ${this._e(i.un)} × ${this._brl(i.unit)} ${seta}</span><span>${i.ean ? `EAN ${this._e(i.ean)}` : `cód. ${this._e(i.codigo)}`}</span></div>${antes}`;
    }).join("");
    return `<dialog class="folha" aria-label="Cupom">
      <div class="fh"><div><div class="ft">${this._e(c.loja_curta)}</div><div class="fs">${c.data_compra ? `comprada em ${this._dia(c.data_compra).data} · nota de ${t.data} às ${t.hora}` : `${t.data} às ${t.hora}`}${c.loja?.cidade ? ` · ${this._e(c.loja.cidade)}` : ""}</div></div>
        <button class="ico" data-a="fechar" aria-label="Fechar">✕</button></div>
      ${c.bem ? `<div class="fs">🚗 ${this._e((d.bens || []).find((b) => b.id === c.bem)?.nome || c.bem)}</div>` : ""}
      <div class="pagocom"><span class="fs">Pago com</span>${pago.map((pg) => `<span class="pgc"><b>${this._e(this._pagNome(pg))}</b>${pg.deduzido ? ` <span class="fs" title="A nota diz débito sem bandeira: tratado como benefício (Alelo, VR…). Troque em Editar compra se não foi.">(deduzido)</span>` : ""} ${this._semReal(c) ? this._moeda(c.moeda) : this._brl(pg.valor)}</span>`).join("")}</div>
      ${c.cobrado ? `<div class="cobr">Nota ${this._brl(c.valor_pago)} · <b>cobrado ${this._brl(c.cobrado.valor)}</b> (${this._e((c.cobrado.motivo || "").toLowerCase())} ${c.cobrado.valor <= c.valor_pago ? "−" : "+"}${this._brl(Math.abs(c.valor_pago - c.cobrado.valor))})${c.cobrado.obs ? ` · ${this._e(c.cobrado.obs)}` : ""}</div>` : ""}
      ${this._blocoCartao(c)}
      ${this._hass?.user?.is_admin && (c.tem_nota || c.tem_qr || nfe || nfseNac) ? `<div class="links">${c.tem_nota ? `<button class="lnk" data-a="ver-nota">${c.origem === "manual" ? "Ver cupom" : "Ver nota fiscal"}</button>` : ""}${c.tem_qr ? `<button class="lnk" data-a="ver-qr">${this._qr ? "Fechar QR Code" : `QR Code / consultar na SEFAZ-${uf}`}</button>` : ""}${nfe ? `<button class="lnk" data-a="portal-nfe">${this._chaveCopiada ? "Chave copiada · abrir o portal de novo" : "Consultar no portal da NF-e"}</button>` : ""}${nfseNac ? `<a class="lnk" href="${this._e(nfseNac)}" target="_blank" rel="noopener noreferrer">Consultar no portal da NFS-e</a>` : ""}</div>` : ""}
      ${nfe && this._chaveCopiada ? `<div class="fs">Chave copiada. No portal: toque no campo → Colar → captcha → Continuar.</div>` : ""}
      ${this._qr ? this._painelQr() : ""}
      ${this._aviso ? `<div class="aviso" role="status">${this._e(this._aviso)}</div>` : ""}
      <details class="editar" data-k="_editCupom" ${this._editCupom || this._confExcluir ? "open" : ""}><summary>Editar compra</summary><div class="edcorpo">
      <div class="edits">
        <label>Quem comprou ${sel("quem", (d.compradores || []).map((p) => [p, p]), c.quem)}</label>
        <label>Categoria ${sel("categoria", (d.categorias || []).map((p) => [p, `${this._ramo(p)?.icone || ""} ${p}`]), c.categoria)}</label>
        ${this._ramo(c.categoria)?.pelos_itens ? `<label>Subcategoria <span class="fs" style="padding:8px 0">pelas seções dos itens</span></label>`
          : `<label>Subcategoria ${sel("subcategoria", (this._ramo(c.categoria)?.subs || []).map((x) => [x, x]), c.subcategoria || "")}</label>`}
        ${this._edReembolso(c)}
        ${(d.bens || []).length && (c.categoria === "Carro" || c.bem) ? `<label>Gasto do veículo ${sel("bem", [["", "Nenhum"], ...(d.bens || []).map((b) => [b.id, b.nome])], c.bem || "")}</label>` : ""}
      </div>
      ${c.moeda ? `<div class="apel"><label>Valor em R$ (convertido)<input id="ed-brl" type="text" inputmode="decimal" placeholder="não convertido" value="${c.valor_pago ? this._e(Number(c.valor_pago).toLocaleString("pt-BR", { minimumFractionDigits: 2 })) : ""}" autocomplete="off"></label>
        <button class="btn" data-a="converter">Salvar valor</button></div>
      <div class="fs">Compra de ${this._moeda(c.moeda)}. Com o valor em reais (o da fatura), ela entra nos totais. Apague e salve para tirar.</div>` : ""}
      <div class="apel"><label>Nome da loja<input id="ap-nome" type="text" maxlength="40" value="${this._e(c.loja_curta)}" autocomplete="off"></label>
        <button class="btn" data-a="apelido">Salvar nome</button></div>
      <div class="fs">${c.loja?.cnpj ? "O nome vale para todas as compras desta loja. Apague e salve para voltar ao nome da nota." : `${c.via === "applepay" ? "Compra sem nota" : "Compra lançada à mão"}: o nome muda só nesta compra.`}${c.origem === "manual" || !this._dados?.dono_alelo ? "" : ` O Alelo é sempre de ${this._e(this._dados.dono_alelo)}.`}</div>
      ${c.origem === "manual" ? `<div class="apel"><label>O que comprou<input id="ed-item" type="text" maxlength="80" placeholder="ex.: carne moída" value="${this._e(c.itens?.[0]?.descricao || "")}" autocomplete="off"></label>
        <button class="btn" data-a="item-salvar">Salvar item</button></div>` : ""}
      <div class="fpe">${this._confExcluir
        ? `<span>Excluir esta compra? Ela fica guardada e pode ser recuperada.</span><button class="btn perigo" data-a="excluir-sim">Excluir</button><button class="btn" data-a="excluir-nao">Cancelar</button>`
        : `<button class="lnk perigo" data-a="excluir">Excluir compra</button>`}</div>
      </div></details>
      ${c.origem === "manual" ? `<div class="recibo"><div class="c"><b>${this._e(c.loja_curta)}</b><br>${c.via === "applepay"
        ? `Pago pelo telefone · sem cupom<br>${this._e((c.pago_com || []).map((pg) => this._pagNome(pg)).join(" + "))}<br>${this._dataCurta(c.emissao)} às ${this._e(String(c.emissao || "").slice(11, 16))}`
        : "Compra lançada à mão"}</div><hr>${(c.itens || []).map((i) => `<div class="it"><span class="ds">${this._e(i.descricao)}</span><span class="vt">${c.moeda ? "" : this._brl(i.total)}</span></div>`).join("")}${this._obsManual(c) ? `<div class="c">${this._e(this._obsManual(c))}</div>` : ""}${(c.itens || []).length || this._obsManual(c) ? "<hr>" : ""}<div class="tot"><span>TOTAL</span><span>${c.moeda ? this._moeda(c.moeda) : this._brl(c.valor_pago)}</span></div>${c.moeda ? `<div class="c">${c.valor_pago ? `Em reais: ${this._brl(c.valor_pago)}` : "Sem valor em reais (fica fora dos totais)"}</div>` : ""}</div>
      <label class="btn escolher anexar">${this._anexando ? `Guardando o cupom… ${this._anexando}` : c.tem_nota ? "📎 Trocar foto/PDF do cupom" : "📎 Anexar foto/PDF do cupom"}<input id="c-anexo" type="file" accept="image/*,application/pdf" ${this._anexando ? "disabled" : ""}></label>` : `
      <div class="recibo">
        <div class="c"><b>${this._e(c.loja?.nome)}</b><br>CNPJ ${this._e((c.loja?.cnpj || "").replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5"))}<br>${c.origem === "nfse" ? `NFS-e nº ${this._e(c.numero)}` : `${(c.chave || "").slice(20, 22) === "55" ? "NF-e" : "NFC-e"} nº ${this._e(c.numero)} · Série ${this._e(c.serie)}`}</div>
        <hr>${todasPrimeira ? `<div class="c ant1">Primeira compra nesta loja</div>` : ""}${itens}<hr>
        ${c.desconto || c.servicos || c.frete || c.outras_despesas || c.ipi_st ? [
          ["Produtos", c.valor_produtos], ["Serviços", c.servicos], ["Frete", c.frete], ["Outras despesas", c.outras_despesas], ["IPI / ST", c.ipi_st]]
          .filter(([n, v], i) => (i === 0 && !c.servicos) || v).map(([n, v]) => `<div class="it q"><span>${n}</span><span>${this._brl(v)}</span></div>`).join("")
          + (c.desconto ? `<div class="it q"><span>Descontos</span><span>− ${this._brl(c.desconto)}</span></div>` : "") : ""}
        <div class="tot"><span>TOTAL PAGO</span><span>${this._brl(c.valor_pago)}</span></div>
        ${(c.pagamentos || []).map((p) => `<div class="it q"><span>${this._e(p.forma || p.tipo)}${p.bandeira ? ` · ${this._e(p.bandeira)}` : ""}</span><span>${this._brl(p.valor)}</span></div>`).join("")}
        ${c.tributos != null ? `<div class="it q"><span>Tributos aproximados</span><span>${this._brl(c.tributos)}</span></div>` : ""}
        ${c.conferencia && !c.conferencia.bate ? `<div class="c alerta">⚠ A soma dos itens (${this._brl(c.conferencia.soma_itens)}) não bate com o total da nota.</div>` : ""}
        <hr><div class="c chave">${c.origem === "nfse" ? `CÓDIGO DE VERIFICAÇÃO<br>${this._e(c.codigo_verificacao || "")}` : `CHAVE DE ACESSO<br>${(c.chave || "").match(/\d{1,4}/g)?.map((g) => `<span class="g4">${g}</span>`).join(" ") || ""}`}</div>
      </div>`}
    </dialog>`;
  }

  // lançar à mão: uma forma de pagamento (forma; valor quando há mais de uma; cartão do tipo certo de quem comprou; parcelas no crédito)
  _nPgLinha(i) {
    return `<div class="npg" data-i="${i}"><div class="duas" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)">
        <label><span class="np-rot">${i ? `Forma ${i + 1}` : "Como pagou"}</span><select class="np-forma"><option value="">Não informar</option>${COMPRAS_TIPOS_PAG.map((x) => `<option>${x}</option>`).join("")}</select></label>
        <label class="np-val-l" hidden>Valor<input class="np-valor" type="text" inputmode="decimal" placeholder="0,00"></label></div>
      <div class="duas np-card" hidden style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)"><label>Cartão<select class="np-cartao"></select></label>
        <label class="np-parc-l">Parcelas<select class="np-parc">${Array.from({ length: 12 }, (_, n) => n + 1).map((n) => `<option value="${n}">${n === 1 ? "à vista" : `${n}x`}</option>`).join("")}</select></label></div>
      <span class="fs np-fs" hidden></span>${i ? `<button type="button" class="lnk perigo np-tirar">tirar esta forma</button>` : ""}</div>`;
  }

  // barra do pagamento em rascunho: nada é gravado sem Salvar; ao fechar com mudanças, pergunta (Salvar / Descartar e fechar)
  _pgBarra(c) {
    const n = this._pgRasc?.id === c.id ? this._pgRasc.pedidos.length : 0;
    return `<div class="pgsalvar${n ? " sujo" : ""}" role="status">${this._pgFechar ? `<b class="pgaviso">Fechar sem salvar? As mudanças do pagamento serão descartadas.</b>` : ""}
      <button class="btn${n ? " prim" : ""}" data-a="f-pg-salvar-txt">Salvar</button>${n || this._pgFechar ? `<button class="btn" data-a="f-pg-cancelar">${this._pgFechar ? "Descartar e fechar" : "Cancelar"}</button>` : ""}
      <span class="fs">${n ? `${n} ${n === 1 ? "mudança ainda não salva" : "mudanças ainda não salvas"} · ` : ""}nada é gravado sem Salvar</span></div>`;
  }

  // fechar a compra com mudanças de pagamento não salvas: pergunta antes
  _pgPendente() {
    if (this._nota || !this._aberta || !(this._pgRasc?.id === this._aberta.id && this._pgRasc.pedidos.length)) return false;
    this._pgFechar = true; this._pgAberto = true; this._render();
    requestAnimationFrame(() => this.shadowRoot?.querySelector(".pgsalvar")?.scrollIntoView({ block: "center", behavior: "smooth" }));
    return true;
  }

  // Pagamentos no crédito: qual cartão, quantas parcelas e a fatura onde caem (a regra é do script)
  _blocoCartao(c) {
    const fin = c.pagamentos_fin || c.pagamentos || [];
    const lista = fin.length ? fin : [{ forma: "", _tipo: null, valor: c.valor_pago }];
    const pgs = lista.map((pg, i) => ({ ...pg, i }));
    const manual = c.origem === "manual", varios = pgs.length > 1, divide = manual || c.divisao_real;
    const cards = (c.cartoes || []).filter((k) => (k.usam_hoje || k.usam || []).includes(c.quem) && (k.ativo !== false));  // final parado: sai da escolha
    const deles = (c.cartoes || []).length > 0 && cards.length > 0;
    const temCred = pgs.some((pg) => pg._tipo === "Crédito");
    const vales = (c.cartoes || []).filter((k) => k.vale && k.ativo !== false);
    const opCard = (pg, deb, vale) => {
      const l = vale ? vales.slice() : cards.filter((k) => (deb ? k.debito && k.dono === c.quem : k.credito !== false && !k.vale));  // débito é da conta: só os do titular
      const atual = (c.cartoes || []).find((k) => k.id === (pg.cartao || (!vale && c.cartao_sugerido)));
      if (atual && !l.includes(atual)) l.push(atual);
      return `<option value="">${vale ? "— o benefício de quem comprou —" : deb ? "— não informar —" : "— escolher —"}</option>${l.map((k) => `<option value="${k.id}" ${(pg.cartao || (!vale && c.cartao_sugerido)) === k.id ? "selected" : ""}>${this._e(this._finNomeCartao(k))} · ${this._e(k.bandeira || "")}</option>`).join("")}`;
    };
    const linha = (pg) => {
      const t = pg.tipo || "", deb = pg._tipo === "Débito", cred = pg._tipo === "Crédito", vale = pg._tipo === "Benefício";
      const forma = `<label>Forma${varios ? ` ${pg.i + 1}` : ""}<select data-fcartao="tipo" data-i="${pg.i}"><option value="" ${!t ? "selected" : ""}>${pg.forma ? `Da nota (${this._e(pg._tipo || pg.forma)})` : "Não informada"}</option>${COMPRAS_TIPOS_PAG.map((x) => `<option ${t === x ? "selected" : ""}>${x}</option>`).join("")}</select></label>`;
      const valor = divide && varios ? `<label>Valor<input type="text" inputmode="decimal" data-fcartao="valor" data-i="${pg.i}" value="${this._e(Number(pg.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 }))}"></label>` : "";
      const cart = pg._tipo === "Saldo em carteira" ? `<label>Qual carteira<select data-fcartao="carteira" data-i="${pg.i}"><option value="">— escolher —</option>${(c.carteiras || []).map((w) => `<option ${pg.carteira === w ? "selected" : ""}>${this._e(w)}</option>`).join("")}</select></label>` : "";
      const card = vale && vales.length > 1 ? `<label>💳 Qual vale<select data-fcartao="cartao" data-i="${pg.i}">${opCard(pg, false, true)}</select></label>`
        : deles && (cred || deb) ? `<label>💳 Cartão<select data-fcartao="cartao" data-i="${pg.i}">${opCard(pg, deb)}</select></label>` : "";
      const parc = deles && cred ? `<label>Parcelas<select data-fcartao="parcelas" data-i="${pg.i}">${Array.from({ length: 12 }, (_, n) => n + 1).map((n) => `<option value="${n}" ${(pg.parcelas || 1) === n ? "selected" : ""}>${n === 1 ? "à vista" : `${n}x`}</option>`).join("")}</select></label>
        <label>Data no cartão<input type="date" data-fcartao="data_cartao" data-i="${pg.i}" value="${this._e(pg.data_cartao || (c.data_compra || c.emissao || "").slice(0, 10))}"></label>` : "";
      const acoes = manual || c.valor_pago ? `<span class="pgacoes">${pgs.length < 4 ? `<button class="lnk" data-a="f-pg-dividir" data-i="${pg.i}">dividir</button>` : ""}${divide && varios && pg.i > 0 ? `<button class="lnk perigo" data-a="f-pg-remover" data-i="${pg.i}">${this._fPgRemover === `${c.id}:${pg.i}` ? "toque de novo para remover" : "remover"}</button>` : ""}</span>` : "";
      return `<div class="cartlin">${forma}${valor}${cart}${card}${parc}${acoes}${pg.cartao_via === "sugerido" ? `<span class="fs">cartão sugerido · confira</span>` : ""}</div>`;
    };
    const fat = temCred && deles ? (c.fatura_txt ? `<div class="cartfat">📅 ${this._e(c.fatura_txt[0].toUpperCase() + c.fatura_txt.slice(1))}</div>` : `<div class="cartfat alerta">Escolha o cartão para a compra entrar na fatura.</div>`)
      : temCred && (c.cartoes || []).length ? `<div class="fs">Crédito no cartão de ${this._e(c.quem)} (fora das faturas de vocês).</div>` : "";
    const cobr = !manual && c.valor_pago ? `<div class="cartlin"><label>Valor cobrado de verdade<input type="text" inputmode="decimal" data-fcobrado="valor" placeholder="igual à nota (${this._brl(c.valor_pago)})" value="${c.cobrado ? this._e(Number(c.cobrado.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })) : ""}"></label>
        ${c.cobrado ? `<label>Motivo<select data-fcobrado="motivo">${(c.motivos_cobrado || ["Cupom do app"]).map((x) => `<option ${c.cobrado.motivo === x ? "selected" : ""}>${this._e(x)}</option>`).join("")}</select></label>
        <label>Detalhe<input type="text" maxlength="80" data-fcobrado="obs" placeholder="ex.: cupom ML" value="${this._e(c.cobrado.obs || "")}"></label>` : ""}
        <span class="fs">Cupom do app, cashback… A nota fica igual; totais, fatura e parcelas usam o cobrado. Apague para voltar ao da nota.</span></div>` : "";
    return `<details class="editar cartbox" data-k="_pgAberto" ${this._pgAberto || (temCred && deles && !c.fatura_txt) ? "open" : ""}><summary>Pagamento${varios ? ` (${pgs.length})` : ""} · data, forma, cartão e valor cobrado</summary>
      <div class="cartlin"><label>Data da compra<input type="date" data-fcompra="data" ${c.via === "applepay" ? "disabled" : ""} max="${new Date().toISOString().slice(0, 10)}" value="${this._e((c.data_compra || c.emissao || "").slice(0, 10))}"></label>
        <span class="fs">${c.via === "applepay" ? "Dia e hora do pagamento pelo telefone (não muda)." : c.origem === "manual" ? "O dia em que a compra foi feita." : c.data_compra ? "Diferente da nota. Volte à data da nota para tirar." : "Comprou antes de a nota sair? Ponha a data real; a nota continua com a de emissão."}</span></div>
      ${cobr}${pgs.map(linha).join("")}
      ${this._pgBarra(c)}${fat}
      <div class="fs">${c.divisao_real ? `Pagamento dividido de verdade: a soma dá o valor cobrado (${this._brl(c.cobrado?.valor)}). A nota impressa não muda. Apagar o valor cobrado desfaz a divisão.` : manual ? "Pagou parte de um jeito e parte de outro? Use dividir e ajuste os valores." : "Pagou parte de um jeito e parte de outro (ex.: saldo Mercado Pago + cartão)? Use dividir. A nota impressa não muda; vale para os totais e as faturas."}</div></details>`;
  }

  _folhaNovo() {
    const d = this._dados || {};
    const hoje = new Date();
    const iso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
    return `<dialog class="folha" aria-label="Lançar compra">
      <div class="fh"><div><div class="ft">Lançar compra</div><div class="fs">Para compras sem QR Code</div></div><button class="ico" data-a="fechar" aria-label="Fechar">✕</button></div>
      <form class="form" id="fnovo">
        <label>Data<input id="n-data" type="date" value="${iso}" required></label>
        <label>Onde foi<input id="n-loja" type="text" placeholder="ex.: Feira do sábado" required></label>
        <label>O que comprou<input id="n-item" type="text" maxlength="80" placeholder="opcional · ex.: carne moída"><span class="fs">Vira o item da compra. Com a categoria em Outros, ela é escolhida por ele.</span></label>
        <div class="duas"><label>Valor<input id="n-valor" type="text" inputmode="decimal" placeholder="0,00" required></label>
          <label>Moeda<select id="n-moeda"><option value="BRL">R$ real</option><option value="USD">US$ dólar</option><option value="EUR">€ euro</option></select></label></div>
        <label id="n-brl-l" hidden>Valor em reais (opcional)<input id="n-brl" type="text" inputmode="decimal" placeholder="o da fatura, se já souber"><span class="fs">Sem ele, a compra fica no valor de fora e não entra nos totais em R$. Dá para pôr depois em Editar compra.</span></label>
        <label>Quem comprou<select id="n-quem">${(d.compradores || []).map((p) => `<option>${this._e(p)}</option>`).join("")}</select></label>
        <div id="n-pgs">${this._nPgLinha(0)}</div>
        <div class="npg-mais"><button type="button" class="lnk" id="n-pg-mais">+ outra forma de pagamento</button><span class="fs" id="n-pg-soma" aria-live="polite"></span></div>
        <div class="duas" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)"><label>Categoria<select id="n-cat">${(d.categorias || []).map((p) => `<option value="${this._e(p)}" ${p === "Outros" ? "selected" : ""}>${this._ramo(p)?.icone || ""} ${this._e(p)}</option>`).join("")}</select></label>
          <label>Subcategoria<select id="n-sub"></select></label></div>
        <label class="chk" id="n-reemb-l" hidden><input id="n-reemb" type="checkbox"> Pagou do próprio bolso (a reembolsar)</label>
        <label>A receber de<input id="n-rde" type="text" maxlength="60" placeholder="opcional · pessoa ou empresa que vai pagar de volta" autocomplete="off"></label>
        <label>Observação<input id="n-obs" type="text" maxlength="200" placeholder="opcional"></label>
        <label>Foto ou PDF do cupom<input id="n-anexo" type="file" accept="image/*,application/pdf"><span class="fs">opcional · recibo de fora do país, loja sem nota… fica guardado na compra</span></label>
        <button class="btn prim" type="submit" ${this._anexando ? "disabled" : ""}>${this._anexando ? `Guardando o cupom… ${this._anexando}` : "Salvar compra"}</button>
      </form>
    </dialog>`;
  }

  // Tem janela ou formulário de edição aberto? Então nada de fundo (chegada de nota, recálculo) redesenha a tela.
  _ocupado() {
    return !!(this._novo || this._up || this._prod || this._aberta || this._nota || this._lista || this._bem || this._avisosAberto
      || this._fSecao || this._fLista || this._fCats || this._fConf || this._fConta || this._fAgua || this._fLuz || this._fFat || this._fRec || this._fCartEd || this._fPgEd || this._fCorrigir
      || this._abaAtual() === "produtos");
  }

  async _abrir(id) {
    this._pgRasc = null; this._pgFechar = false; this._edReemb = null;  // abrir (ou reabrir) a compra mostra o que está gravado
    const base = this._compras().find((c) => c.id === id);
    this._confExcluir = false;
    const jaAberta = this._aberta && !this._aberta.carregando && this._aberta.id === id;
    if (!jaAberta) {  // a mesma compra já aberta (depois de salvar algo nela): atualiza sem apagar a janela
      this._aberta = { ...(base || {}), carregando: true };
      this._render();
    }
    try {
      const r = await this._api({ acao: "detalhe", id });
      this._aberta = r.compra;
    } catch (e) {
      this._aberta = null;
      this._aviso = "⚠ " + (e.message || e);
    }
    this._render();
  }

  // QR Code da nota (o mesmo do papel): para outra câmera ler ou para abrir direto na SEFAZ
  _painelQr() {
    const q = this._qr;
    if (q.carregando) return `<div class="qrbox"><div class="fs">Abrindo QR Code…</div></div>`;
    let svg = "";
    try { const qr = COMPRAS_QR(0, "M"); qr.addData(q.link); qr.make(); svg = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); } catch (_) { svg = ""; }
    return `<div class="qrbox">${svg ? `<div class="qr">${svg}</div>` : ""}
      <div class="qrtxt"><div class="fs">Consulta da nota na SEFAZ-${COMPRAS_UF[(this._aberta?.chave || "").slice(0, 2)] || ""}. Leia com a câmera de outro celular ou toque abaixo.</div>
      <a class="btn" href="${this._e(q.link)}" target="_blank" rel="noopener noreferrer">Abrir na SEFAZ</a></div></div>`;
  }

  // Cópia fiel da nota (salva pelo script em compras/notas/, fora da pasta pública). Só para administrador.
  _folhaNota() {
    const n = this._nota;
    if (n.carregando) return `<dialog class="folha nota"><div class="vazio">Abrindo nota fiscal…</div></dialog>`;
    return `<dialog class="folha nota${n.pdfUrl ? " pdf" : ""}" aria-label="Nota fiscal">
      <div class="fh"><div><div class="ft">${this._aberta?.origem === "manual" ? "Cupom" : "Nota fiscal"}</div><div class="fs">${this._e(this._aberta?.loja_curta || "")} · cópia salva no Home Assistant</div></div>
        <button class="ico" data-a="nota-fechar" aria-label="Voltar">✕</button></div>
      <div class="notabar"><button class="btn" data-a="nota-imprimir">${this._iosApp() ? "Compartilhar / Imprimir" : "Imprimir / Salvar PDF"}</button><button class="btn" data-a="nota-fechar">Voltar ao cupom</button></div>
      ${n.pdfUrl ? `<div class="fs">PDF original da nota. Se não aparecer abaixo, toque em <a href="${n.pdfUrl}" target="_blank" rel="noopener">abrir o PDF</a> ou <a href="${n.pdfUrl}" download="nota-fiscal.pdf">baixar</a>.</div>
      <iframe class="notaif" title="Nota fiscal" src="${n.pdfUrl}"></iframe>`
      : `<iframe class="notaif" title="Nota fiscal" sandbox="allow-same-origin allow-modals" srcdoc="${this._e(n.html)}"></iframe>`}
    </dialog>`;
  }

  // ---------------------------------------------------------------- eventos
  _ligar() {
    const root = this.shadowRoot;
    const dlg = root.querySelector("dialog.folha");
    if (dlg) {
      try { dlg.showModal(); } catch (_) { dlg.setAttribute("open", ""); }
      const fechar = () => { if (this._pgPendente()) return; if (this._nota) { this._nota = null; } else if (this._aberta) { this._aberta = null; this._qr = null; this._chaveCopiada = false; this._confExcluir = false; this._editCupom = false; } else if (this._fConf) { this._fConf = null; this._aviso = null; } else if (this._fConta) { this._fConta = null; this._fPgEd = null; } else if (this._fAgua) { if (this._fAgua.lendo) return; this._fAgua = null; } else if (this._fLuz) { if (this._fLuz.lendo) return; this._fLuz = null; } else if (this._fFat) { if (this._fFat.lendo) return; if (this._fFat.det || this._fFat.abrindo) this._fFat = { ...this._fFat, det: null, abrindo: null }; else this._fFat = null; } else if (this._fRec) { this._fRec = null; } else if (this._prod) { this._prod = null; this._juntar = null; this._editProd = false; } else if (this._fCats) { this._fCats = null; } else if (this._fSecao) { this._fSecao = null; this._destaque = null; } else if (this._fLista) { this._fLista = null; } else if (this._up) { if (this._up.enviando) return; this._up = null; } else if (this._lista) { this._lista = null; } else if (this._bem) { this._bem = null; } else if (this._avisosAberto) { this._avisosAberto = false; this._confPago = false; } else { this._novo = false; } this._render(); };
      dlg.addEventListener("cancel", (ev) => { ev.preventDefault(); fechar(); });
      dlg.addEventListener("click", (ev) => {  // só o toque FORA da folha fecha (a margem de dentro também é o <dialog>)
        if (ev.target !== dlg) return;
        const r = dlg.getBoundingClientRect();
        if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) fechar();
      });
      // folha da V3 no celular: arrastar o cabeçalho para baixo fecha (o X e o toque fora continuam)
      const alca = dlg.classList.contains("v3d") && window.matchMedia?.("(max-width:520px)").matches && dlg.querySelector(":scope > .v3-dh, :scope > .v-fh");
      if (alca) {
        let y0 = null, dy = 0;
        alca.addEventListener("touchstart", (ev) => { if (ev.target.closest("button,a,input,select")) return; y0 = ev.touches[0].clientY; dy = 0; dlg.style.transition = "none"; }, { passive: true });
        alca.addEventListener("touchmove", (ev) => { if (y0 == null) return; dy = Math.max(0, ev.touches[0].clientY - y0); dlg.style.transform = dy ? `translateY(${dy}px)` : ""; }, { passive: true });
        alca.addEventListener("touchend", () => {
          if (y0 == null) return;
          y0 = null; dlg.style.transition = "transform .18s ease-out";
          if (dy > 110) { dlg.style.transform = "translateY(100%)"; setTimeout(() => { fechar(); dlg.style.transform = ""; }, 160); } else dlg.style.transform = "";
        });
      }
    }
    root.querySelectorAll("[data-a]").forEach((el) => el.addEventListener("click", (ev) => this._clique(ev, el)));
    root.querySelectorAll(".fpilha").forEach((el) => this._finSwipe(el));
    const fcd = root.getElementById("fconf-data");
    if (fcd) fcd.addEventListener("change", () => {
      const x = this._finObrigacoes().find((y) => y.id === this._fConf), v = root.getElementById("fconf-v");
      if (x?.faixas && v) v.textContent = this._brl(fcd.value && fcd.value > x.faixas.ate ? x.faixas.depois : x.faixas.valor);
    });
    ["ag-pasta", "ag-arqs"].forEach((id) => { const x = root.getElementById(id); if (x) x.addEventListener("change", () => this._finAguaLer(x.files)); });
    ["lz-pasta", "lz-arqs"].forEach((id) => { const x = root.getElementById(id); if (x) x.addEventListener("change", () => this._finLuzLer(x.files)); });
    ["ft-pasta", "ft-arqs"].forEach((id) => { const x = root.getElementById(id); if (x) x.addEventListener("change", () => this._finFatLer(x.files)); });
    const pdArq = root.getElementById("pd-arq");  // ⚙ › Pedidos de lojas online: o e-mail do pedido em PDF
    if (pdArq) pdArq.addEventListener("change", () => this._finPedidoPdf(pdArq.files));
    const pdPr = root.getElementById("pd-print");  // ⚙ › Mercado Livre: o texto colado não some quando a tela redesenha
    if (pdPr) pdPr.addEventListener("input", () => { this._fPdPrint = pdPr.value; });
    const pdImp = root.getElementById("pd-imp");  // ⚙ › Trazer os pedidos antigos: o arquivo do Google Takeout
    if (pdImp) pdImp.addEventListener("change", () => this._finPedidosImportar(pdImp.files));
    const upArq = root.getElementById("up-arq");
    if (upArq) upArq.addEventListener("change", () => this._addArquivos(upArq.files));
    const kcE = root.getElementById("kc-emissor"), kcMods = root.getElementById("kc-mods");  // trocar o banco mostra os modelos dele em miniatura
    const kcT = root.getElementById("kc-tipo"), kcCL = root.getElementById("kc-cat-l"), kcBen = root.getElementById("kc-benef-l");
    const kcPrev = () => { const pv = root.getElementById("kc-prev"); if (pv) pv.innerHTML = this._finKcPrevia(); };  // o cartão em tempo real
    // categoria: muda com a bandeira, a instituição, o modelo e a função (benefício não tem)
    this._finKcCatTrocar = () => { if (!kcCL) return; kcCL.style.display = kcT?.value === "beneficio" ? "none" : ""; kcCL.innerHTML = this._finKcCat();
      root.getElementById("kc-cat")?.addEventListener("change", kcPrev); };
    if (kcE && kcMods) kcE.addEventListener("change", () => {
      this._fKcBanco = kcE.value; this._fKcModelo = "";
      const kb = root.getElementById("kc-band"), bs = this._finBandeirasDoBanco(kcE.value);  // bandeiras do banco primeiro; se a escolhida ele não emite, a mais comum dele
      if (kb) { const v = bs.length && !bs.includes(kb.value) ? bs[0] : kb.value; kb.innerHTML = this._finKcBandeiraOps(false, v); kb.value = v; this._fKcBand = v; }
      if (kcT && !!this._finKcEhBenef(kcE.value) !== (kcT.value === "beneficio")) {  // empresa de benefício → função Benefício (e o contrário)
        kcT.value = this._finKcEhBenef(kcE.value) ? "beneficio" : "credito"; kcT.dispatchEvent(new Event("change"));
      }
      this._finTrocar(kcMods, this._finKcMods()); this._finKcCatTrocar(); kcPrev(); });
    root.getElementById("kc-cat")?.addEventListener("change", kcPrev);
    for (const [idc, ev] of [["kc-prod", "input"], ["kc-apelido", "input"], ["kc-benef", "change"]]) root.getElementById(idc)?.addEventListener(ev, kcPrev);
    root.getElementById("kc-prod")?.addEventListener("change", () => this._finKcCatTrocar());
    root.getElementById("kc-band")?.addEventListener("change", (ev) => { this._fKcBand = ev.target.value; if (kcMods) this._finTrocar(kcMods, this._finKcMods()); this._finKcCatTrocar(); kcPrev(); });
    if (kcT) kcT.addEventListener("change", () => {
      this._fKcTipo = kcT.value;
      if (kcBen) kcBen.style.display = kcT.value === "beneficio" ? "" : "none";
      const kb = root.getElementById("kc-band");
      if (kb && kcT.value === "beneficio" && this._fCartEd === "novo") { kb.value = "Sem bandeira"; this._fKcBand = kb.value; }  // benefício novo: rede própria (troca se o cartão tiver Elo, Visa…)
      if (kcMods) this._finTrocar(kcMods, this._finKcMods());  // no crédito somem os modelos de débito
      this._finKcCatTrocar(); kcPrev();
    });
    const upSolta = root.getElementById("up-solta");
    if (upSolta && dlg) {
      const sobre = (on) => upSolta.classList.toggle("sobre", on);
      ["dragenter", "dragover"].forEach((t) => dlg.addEventListener(t, (ev) => { ev.preventDefault(); sobre(true); }));
      dlg.addEventListener("dragleave", (ev) => { if (ev.target === dlg || !dlg.contains(ev.relatedTarget)) sobre(false); });
      dlg.addEventListener("drop", (ev) => { ev.preventDefault(); sobre(false); this._addArquivos(ev.dataTransfer?.files); });
    }
    root.querySelectorAll("[data-fchange]").forEach((el) => el.addEventListener("change", () => this._finMudou(el)));
    root.querySelectorAll("[data-sel]").forEach((el) => el.addEventListener("change", () => {
      const id = el.getAttribute("data-sel");
      if (el.checked) this._sel.add(id); else this._sel.delete(id);
      this._confPago = false;
      this._render();
    }));
    root.querySelectorAll("[data-ed]").forEach((el) => el.addEventListener("change", async () => {
      const campo = el.getAttribute("data-ed");
      const id = this._aberta?.id;
      if (!id) return;
      const r = await this._acao({ acao: "editar", id, [campo]: el.value },
        campo === "categoria" || campo === "subcategoria" ? "Categoria trocada. Próximas compras dessa loja já entram assim." : "Compra atualizada.");
      if (r) this._abrir(id);
    }));
    root.querySelectorAll("[data-reemb]").forEach((el) => el.addEventListener("change", () => {  // uma ou outra (ou nenhuma); grava no Salvar
      this._edReemb = el.checked ? el.getAttribute("data-reemb") : ""; this._render();
      setTimeout(() => this.shadowRoot?.getElementById("ed-rnome")?.focus(), 30);
    }));
    const nq = root.getElementById("n-quem"), nr = root.getElementById("n-reemb-l");
    if (nq && nr) { const ver = () => { nr.hidden = !this._reembolsa(nq.value); root.getElementById("n-reemb").checked = this._reembolsa(nq.value); }; nq.addEventListener("change", ver); ver(); }
    // lançar à mão: cartão de crédito, débito (do titular) ou vale em cada forma; até 4 formas, e a soma tem de bater
    const npgs = root.getElementById("n-pgs"), nmais = root.getElementById("n-pg-mais"), nsoma = root.getElementById("n-pg-soma"), nval = root.getElementById("n-valor");
    if (npgs && nq && nmais && nsoma) {
      const todos = ((this._fFin?.cartoes) || []).filter((k) => k.ativo !== false), usa = (k) => (k.usam_hoje || k.usam || []).includes(nq.value);
      const opcoes = (forma) => forma === "Crédito" ? todos.filter((k) => k.credito !== false && !k.vale && usa(k))
        : forma === "Débito" ? todos.filter((k) => !k.vale && (k.debito || k.credito === false) && k.dono === nq.value)  // débito é da conta: só os do titular
        : forma === "Benefício" ? (todos.filter((k) => k.vale && usa(k)).length ? todos.filter((k) => k.vale && usa(k)) : todos.filter((k) => k.vale)) : [];
      const linhas = () => [...npgs.querySelectorAll(".npg")];
      const num = (s) => Number(String(s || "").replace(/\./g, "").replace(",", ".")) || 0;
      const linha = (el) => {
        const forma = el.querySelector(".np-forma").value, sel = el.querySelector(".np-cartao"), ant = sel.value, l = opcoes(forma);
        sel.innerHTML = l.map((k) => `<option value="${this._e(k.id)}">${this._e(this._finNomeCartao(k))} · ${this._e(k.bandeira || "")}</option>`).join("") + (forma === "Débito" && l.length ? `<option value="">não informar</option>` : "");
        if (l.some((k) => k.id === ant)) sel.value = ant;
        const comCartao = ["Crédito", "Débito", "Benefício"].includes(forma);
        el.querySelector(".np-card").hidden = !comCartao || !l.length;
        el.querySelector(".np-parc-l").hidden = forma !== "Crédito";
        const fs = el.querySelector(".np-fs");
        fs.hidden = !comCartao || !!l.length;
        fs.textContent = forma === "Crédito" ? `Cartão próprio de ${nq.value} — fica fora das faturas.` : forma === "Débito" ? `${nq.value} não tem cartão de débito cadastrado.` : forma === "Benefício" ? "Nenhum cartão de benefício cadastrado." : "";
      };
      const soma = () => {
        const ls = linhas(), varias = ls.length > 1;
        if (!varias) { nsoma.textContent = ""; nsoma.className = "fs"; return; }
        const total = num(nval?.value), s = ls.reduce((t, el) => t + num(el.querySelector(".np-valor").value), 0), dif = Math.round((total - s) * 100) / 100;
        nsoma.textContent = !total ? "Informe o valor da compra." : Math.abs(dif) < 0.01 ? "A soma das formas confere com o total." : dif > 0 ? `Falta ${this._brl(dif)} para o total.` : `Passou ${this._brl(-dif)} do total.`;
        nsoma.className = `fs ${total && Math.abs(dif) < 0.01 ? "ok" : "erro"}`;
      };
      const tudo = () => {
        const ls = linhas();
        ls.forEach((el, i) => { linha(el); el.querySelector(".np-val-l").hidden = ls.length < 2; el.querySelector(".np-rot").textContent = ls.length < 2 ? "Como pagou" : `Forma ${i + 1}`; });
        nmais.hidden = ls.length >= 4;
        soma();
      };
      npgs.addEventListener("change", (ev) => { if (ev.target.matches(".np-forma")) tudo(); });
      npgs.addEventListener("input", soma);
      npgs.addEventListener("click", (ev) => { const b = ev.target.closest(".np-tirar"); if (b) { b.closest(".npg").remove(); tudo(); } });
      nmais.addEventListener("click", () => { npgs.insertAdjacentHTML("beforeend", this._nPgLinha(linhas().length)); tudo(); linhas().at(-1)?.querySelector(".np-forma")?.focus(); });
      nq.addEventListener("change", tudo);
      nval?.addEventListener("input", soma);
      tudo();
    }
    // pagamento: cada mudança entra no rascunho (o script mostra como fica); só o botão Salvar (ou Enter num valor) grava
    // quadros recolhíveis de A pagar: lembram se estão abertos (o redesenho não fecha)
    root.querySelectorAll("details.flarg").forEach((el) => el.addEventListener("toggle", () => { if (el.classList.contains("fhist")) this._fHistAberto = el.open; else this._fLargAberta = el.open; }));
    root.querySelectorAll("[data-fcompra]").forEach((el) => el.addEventListener("change", () => this._finDataCompra(el)));
    root.querySelectorAll("[data-fcartao],[data-fcobrado]").forEach((el) => {
      if (el.matches("input[type=text]")) {
        el.addEventListener("input", () => root.querySelector("[data-a='f-pg-salvar-txt']")?.classList.add("prim"));
        el.addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); this._finPgSalvar(); } });
      }
      el.addEventListener("change", () => (el.hasAttribute("data-fcobrado") ? this._finCobradoMudou(el) : this._finCartaoMudou(el)));
    });
    const ncat = root.getElementById("n-cat"), nsub = root.getElementById("n-sub");
    if (ncat && nsub) {
      const subs = () => { const r = this._ramo(ncat.value); nsub.innerHTML = r?.pelos_itens ? `<option value="">pelas seções dos itens</option>` : (r?.subs || []).map((x) => `<option>${this._e(x)}</option>`).join(""); nsub.disabled = !!r?.pelos_itens; };
      ncat.addEventListener("change", subs); subs();
    }
    const nm = root.getElementById("n-moeda"), nb = root.getElementById("n-brl-l");
    if (nm && nb) { const ver = () => { nb.hidden = nm.value === "BRL"; }; nm.addEventListener("change", ver); ver(); }
    root.querySelectorAll("details.editar").forEach((el) => el.addEventListener("toggle", () => { this[el.getAttribute("data-k")] = el.open; }));
    const chipOn = root.querySelector(".chips.rolar .chip.on");
    if (chipOn) chipOn.parentElement.scrollLeft = chipOn.offsetLeft - chipOn.parentElement.offsetLeft - 16; // seção escolhida à vista
    const st = root.querySelector("select[data-tipo]");
    if (st) st.addEventListener("change", async () => {
      const chave = this._prod?.resumo?.chave;
      if (!chave) return;
      const r = await this._acao({ acao: "definir_tipo", chave, tipo: st.value });
      if (r) { const lst = await this._api({ acao: "produtos" }).catch(() => null); if (lst) this._prods = lst.produtos; this._abrirProduto(chave); }
    });
    // Busca: atualiza só a lista (o campo não perde o foco enquanto digita)
    const qp = root.getElementById("q-prod");
    if (qp) {
      const atualizar = () => {
        this._q = qp.value;
        const l = root.getElementById("lista-prod");
        if (l) { l.innerHTML = this._listaProdutosHtml(); l.querySelectorAll("[data-a]").forEach((el) => el.addEventListener("click", (ev) => this._clique(ev, el))); }
        const n = root.getElementById("n-prod");
        if (n) n.textContent = `${this._nAchados} ${this._nAchados === 1 ? "produto" : "produtos"}`;
      };
      qp.addEventListener("input", atualizar);
      const n = root.getElementById("n-prod");
      if (n) n.textContent = `${this._nAchados} ${this._nAchados === 1 ? "produto" : "produtos"}`;
    }
    const qj = root.getElementById("q-juntar");
    if (qj) {
      qj.addEventListener("input", () => {
        const pos = qj.selectionStart;
        this._juntar = qj.value;
        this._render();
        const novo = this.shadowRoot.getElementById("q-juntar");
        if (novo) { novo.focus(); try { novo.setSelectionRange(pos, pos); } catch (_) {} }
      });
    }
    const f = root.getElementById("fnovo");
    if (f) f.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const v = (id) => root.getElementById(id);
      const arq = v("n-anexo")?.files?.[0], dataCompra = v("n-data").value, quemCompra = v("n-quem").value;  // antes de salvar: a tela é redesenhada depois
      const r = await this._acao({
        acao: "manual", data: v("n-data").value, loja: v("n-loja").value, valor: v("n-valor").value, moeda: v("n-moeda").value, valor_brl: v("n-moeda").value === "BRL" ? "" : v("n-brl").value,
        quem: v("n-quem").value, categoria: v("n-cat").value, subcategoria: v("n-sub")?.value || "", reembolso: this._reembolsa(v("n-quem").value) && v("n-reemb").checked, receber_de: v("n-rde")?.value || "", observacao: v("n-obs").value, ...(() => {  // formas de pagamento: a primeira vai nos campos de sempre; com mais de uma, todas vão em "partes"
          const ps = [...root.querySelectorAll("#n-pgs .npg")].map((el) => ({ forma: el.querySelector(".np-forma").value, valor: el.querySelector(".np-valor").value,
            cartao: el.querySelector(".np-card").hidden ? "" : el.querySelector(".np-cartao").value, parcelas: Number(el.querySelector(".np-parc").value || 1) }));
          return { forma: ps[0]?.forma || "", cartao: ps[0]?.cartao || "", parcelas: ps[0]?.parcelas || 1, ...(ps.length > 1 ? { partes: ps } : {}) };
        })(),
        item: v("n-item")?.value || "",
      });
      if (r) this._avisar("nova", r.mensagem, quemCompra, r.id);
      if (r && arq) await this._enviarAnexo(r.id, arq);
      if (r) { this._novo = false; this._mes = dataCompra.slice(0, 7); this._render(); }
    });
    const cAnexo = root.getElementById("c-anexo");
    if (cAnexo) cAnexo.addEventListener("change", async () => {
      const id = this._aberta?.id, arq = cAnexo.files?.[0];
      if (!id || !arq) return;
      if (await this._enviarAnexo(id, arq)) await this._abrir(id);
    });
  }

  async _clique(ev, el) {
    const a = el.getAttribute("data-a");
    if (a && a.startsWith("f-")) { this._finClique(a, el); return; }
    if (a === "aba") {
      this._aba = el.getAttribute("data-k");
      this._aviso = null;
      this._fCorrigir = false; this._fPgEd = null; this._fCartEd = null; this._fHistAberto = false;  // correção e histórico fecham ao trocar de aba
      if (this._aba === "produtos") { this._prods = null; this._prodErro = null; this._carregarProdutos(); if (this._prodVista === "precos") { this._precos = null; this._carregarPrecos(); } }
      if (this._aba === "visao") { this._visao = null; this._visaoErro = null; this._carregarVisao(); }
      this._render();
      return;
    }
    const novoPeriodo = () => { this._visao = null; this._visaoErro = null; this._diaSel = null; this._aviso = null; this._render(); this._carregarVisao(); };
    if (a === "periodo") { this._modo = el.getAttribute("data-k"); novoPeriodo(); return; }
    if (a === "ir-mes") { this._modo = "mes"; this._mes = el.getAttribute("data-k"); novoPeriodo(); return; }
    if (a === "dia") { const k = Number(el.getAttribute("data-k")); this._diaSel = this._diaSel === k ? null : k; this._render(); return; }
    if (a === "filtro") { this._filtro = el.getAttribute("data-k"); this._render(); return; }
    if (a === "pvista" || a === "ver-precos") {
      this._prodVista = a === "ver-precos" ? "precos" : el.getAttribute("data-k");
      if (a === "ver-precos") { this._aba = "produtos"; this._aviso = null; this._prods = null; this._carregarProdutos(); }
      if (this._prodVista === "precos" && !this._precos) this._carregarPrecos();
      this._render();
      return;
    }
    if (a === "upload") { this._up = { quem: this._dados?.compradores?.[0] || "" }; this._render(); return; }
    if (a === "up-enviar") { this._enviarArquivo(); return; }
    if (a === "up-tirar") { const l = [...(this._up.arquivos || [])]; l.splice(Number(el.getAttribute("data-k")), 1); this._up = { ...this._up, arquivos: l, msg: "" }; this._render(); return; }
    if (a === "avisos") { this._avisosAberto = true; this._render(); return; }
    if (a === "ver-bem") {
      const id = el.getAttribute("data-k");
      this._bem = { carregando: true }; this._render();
      try { this._bem = await this._api({ acao: "bem", id }); } catch (e) { this._bem = null; this._aviso = "⚠ " + (e.message || e); }
      this._render(); return;
    }
    if (a === "ver-lista") { this._lista = { tipo: el.getAttribute("data-t"), k: el.getAttribute("data-k") }; this._render(); return; }
    if (a === "secao") { this._secao = el.getAttribute("data-k") || null; this._render(); return; }
    if (a === "converter") {
      const id = this._aberta?.id;
      const r = await this._acao({ acao: "editar", id, valor_brl: this.shadowRoot.getElementById("ed-brl")?.value || "" }, "Valor em reais salvo.");
      if (r) this._abrir(id);
      return;
    }
    if (a === "item-salvar") {
      const id = this._aberta?.id;
      if (!id) return;
      const r = await this._acao({ acao: "editar", id, item: this.shadowRoot.getElementById("ed-item")?.value || "" }, "Item salvo.");
      if (r) this._abrir(id);
      return;
    }
    if (a === "apelido") {
      const id = this._aberta?.id;
      const nome = this.shadowRoot.getElementById("ap-nome")?.value ?? "";
      if (!id) return;
      const r = await this._acao({ acao: "apelido", id, apelido: nome });
      if (r) this._abrir(id);
      return;
    }
    if (a === "produto") { this._abrirProduto(el.getAttribute("data-k")); return; }
    if (a === "juntar") { this._juntar = ""; this._render(); return; }
    if (a === "juntar-nao") { this._juntar = null; this._render(); return; }
    if (a === "juntar-com") {
      const de = this._prod?.resumo?.chave, para = el.getAttribute("data-k");
      const r = await this._acao({ acao: "vincular", de, para });
      if (r) { this._juntar = null; const lst = await this._api({ acao: "produtos" }).catch(() => null); if (lst) this._prods = lst.produtos; this._abrirProduto(r.chave); }
      return;
    }
    if (a === "separar") {
      const m = this._prod?.vinculado || [];
      for (const k of m) await this._api({ acao: "desvincular", chave: k }).catch(() => null);
      this._aviso = "Produtos separados de novo.";
      const lst = await this._api({ acao: "produtos" }).catch(() => null); if (lst) this._prods = lst.produtos;
      this._abrirProduto(this._prod.resumo.chave);
      return;
    }
    if (a === "mes") {
      this._mes = this._pularMes(this._mes, Number(el.getAttribute("data-k")));
      if (this._abaAtual() === "visao") { novoPeriodo(); return; }
      this._aviso = null; this._render();
    }
    else if (a === "ap-lancar" || a === "ap-cupom") {
      const k = el.getAttribute("data-k"), item = [...this.shadowRoot.querySelectorAll("input.apitem")].find((x) => x.dataset.k === k)?.value || "";
      this._acao({ acao: "applepay_decidir", id: k, decisao: a === "ap-lancar" ? "lancar" : "cupom", item });
    }
    else if (a === "pd-decidir") { this._acao({ acao: "pedido_decidir", id: el.getAttribute("data-k"), decisao: el.getAttribute("data-d") }); }
    else if (a === "mu-ok" || a === "mu-desfazer") { this._acao({ acao: "mudanca", id: el.getAttribute("data-k"), decisao: a === "mu-ok" ? "ok" : "desfazer" }); }
    else if (a === "recarregar") { this._aviso = null; this._fPartesDe = null; this._carregar(); }
    else if (a === "abrir") { this._qr = null; this._chaveCopiada = false; this._abrir(el.getAttribute("data-id")); }
    else if (a === "fechar") { if (this._pgPendente()) return; if (this._nota) { this._nota = null; } else if (this._aberta) { this._aberta = null; this._qr = null; this._chaveCopiada = false; this._confExcluir = false; this._editCupom = false; } else if (this._fConf) { this._fConf = null; this._aviso = null; } else if (this._fConta) { this._fConta = null; this._fPgEd = null; } else if (this._fAgua) { if (this._fAgua.lendo) return; this._fAgua = null; } else if (this._fLuz) { if (this._fLuz.lendo) return; this._fLuz = null; } else if (this._fFat) { if (this._fFat.lendo) return; if (this._fFat.det || this._fFat.abrindo) this._fFat = { ...this._fFat, det: null, abrindo: null }; else this._fFat = null; } else if (this._fRec) { this._fRec = null; } else if (this._prod) { this._prod = null; this._juntar = null; this._editProd = false; } else if (this._fCats) { this._fCats = null; } else if (this._fSecao) { this._fSecao = null; this._destaque = null; } else if (this._fLista) { this._fLista = null; } else if (this._up) { if (this._up.enviando) return; this._up = null; } else if (this._lista) { this._lista = null; } else if (this._bem) { this._bem = null; } else if (this._avisosAberto) { this._avisosAberto = false; this._confPago = false; } else { this._novo = false; } this._render(); }
    else if (a === "novo") { this._novo = true; this._aberta = null; this._render(); }
    else if (a === "pago") { this._confPago = true; this._render(); }
    else if (a === "pago-nao") { this._confPago = false; this._render(); }
    else if (a === "pago-sim") {
      const ids = [...this._sel];
      this._confPago = false;
      const r = await this._acao({ acao: "marcar_pago", ids }, "Marcado como pago/recebido.");
      if (r) { this._sel.clear(); this._render(); }
    }
    else if (a === "despagar") this._acao({ acao: "desfazer_pago", id: el.getAttribute("data-id") }, "Desfeito: voltou a ficar em aberto.");
    else if (a === "reemb-cancelar") { this._edReemb = null; this._render(); }
    else if (a === "reemb-salvar") {
      const id = this._aberta?.id, g = (k) => this.shadowRoot.getElementById(k);
      if (!id) return;
      const c = this._aberta, atual = c?.reembolso?.status || "nao", tipo = this._edReemb ?? ({ a_receber: "rec", recebido: "rec", a_reembolsar: "reemb", pago: "reemb" }[atual] || "");
      const nome = (g("ed-rnome")?.value || "").trim();
      const st = tipo === "rec" ? (atual === "recebido" ? "recebido" : "a_receber") : tipo === "reemb" ? (atual === "pago" ? "pago" : "a_reembolsar") : "nao";
      const r = await this._acao({ acao: "editar", id, reembolso: st, ...(tipo === "rec" ? { reembolso_de: nome } : tipo === "reemb" ? { reembolso_para: nome } : {}) },
        tipo === "rec" ? `A receber${nome ? ` de ${nome}` : ""}: salvo.` : tipo === "reemb" ? `A reembolsar${nome ? ` para ${nome}` : ""}: salvo.` : "Reembolso tirado.");
      if (r) { this._edReemb = null; this._abrir(id); }
    }
    else if (a === "excluir") { this._confExcluir = true; this._render(); }
    else if (a === "ver-nota") {
      const id = this._aberta?.id;
      this._nota = { carregando: true }; this._render();
      try {
        const r = await this._api({ acao: "nota", id });
        if (r.pdf) {
          const by = Uint8Array.from(atob(r.pdf), (ch) => ch.charCodeAt(0));
          const blob = new Blob([by], { type: "application/pdf" });
          this._nota = { pdfUrl: URL.createObjectURL(blob), blob };  // o arquivo fica pronto para o Compartilhar do iPhone
        } else this._nota = { html: r.html };
      }
      catch (e) { this._nota = null; this._aviso = "⚠ " + (e.message || e); }
      this._render();
    }
    else if (a === "nota-fechar") { this._nota = null; this._render(); }
    else if (a === "portal-nfe") {
      const ch = this._aberta?.chave || "";
      // HA em http (sem https): navigator.clipboard não existe. Jeito antigo, com dois cuidados:
      // o campo fica DENTRO da janela aberta (fora dela, o modal bloqueia o foco) e a chave vai
      // direto no evento "copy" (não depende da seleção).
      let ok = false;
      const aoCopiar = (e) => { e.clipboardData.setData("text/plain", ch); e.preventDefault(); ok = true; };
      document.addEventListener("copy", aoCopiar, true);
      const dono = this.shadowRoot.querySelector("dialog[open]") || this.shadowRoot;
      const t = document.createElement("textarea"); t.value = ch; t.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0";
      dono.appendChild(t); t.focus(); t.select(); t.setSelectionRange(0, ch.length);
      try { document.execCommand("copy"); } catch (_) { /* segue para a próxima tentativa */ }
      document.removeEventListener("copy", aoCopiar, true);
      t.remove();
      if (!ok && navigator.clipboard?.writeText) {
        try { await navigator.clipboard.writeText(ch); ok = true; } catch (_) { ok = false; }
      }
      this._chaveCopiada = ok;
      if (!ok) this._aviso = `Não consegui copiar sozinho. Chave: ${ch}`;
      window.open(COMPRAS_PORTAL_NFE, "_blank", "noopener");
      this._render();
    }
    else if (a === "ver-qr") {
      if (this._qr) { this._qr = null; this._render(); return; }
      const id = this._aberta?.id;
      this._qr = { carregando: true }; this._render();
      try { const r = await this._api({ acao: "consulta", id }); this._qr = { link: r.link }; }
      catch (e) { this._qr = null; this._aviso = "⚠ " + (e.message || e); }
      this._render();
    }
    else if (a === "nota-imprimir" && this._iosApp()) {  // iPhone/iPad: o app do HA não imprime de dentro da página; a folha de compartilhar tem Imprimir e Salvar em Arquivos
      const n = this._nota || {}, nome = `nota-${String(this._aberta?.loja_curta || "compra").normalize("NFD").replace(/[^\w-]+/g, "-").slice(0, 30)}`;
      const arq = n.blob ? new File([n.blob], `${nome}.pdf`, { type: "application/pdf" }) : new File([n.html || ""], `${nome}.html`, { type: "text/html" });
      if (navigator.canShare?.({ files: [arq] })) {
        navigator.share({ files: [arq], title: this._aberta?.loja_curta || "Nota fiscal" })
          .catch((e) => { if (e?.name !== "AbortError") { this._aviso = "⚠ Não consegui abrir o compartilhar. No computador, Imprimir funciona."; this._render(); } });
      } else { this._aviso = "⚠ Este aparelho não deixou compartilhar a nota. No computador (ou pelo Safari), Imprimir funciona."; this._render(); }
    }
    else if (a === "nota-imprimir") {
      const f = this.shadowRoot.querySelector("iframe.notaif");
      try { f.contentWindow.focus(); f.contentWindow.print(); } catch (_) { this._aviso = "⚠ Não consegui abrir a impressão neste aparelho."; }
    }
    else if (a === "excluir-nao") { this._confExcluir = false; this._render(); }
    else if (a === "excluir-sim") {
      const id = this._aberta?.id;
      this._confExcluir = false;
      const r = await this._acao({ acao: "excluir", id });
      if (r) { this._aberta = null; this._render(); }
    }
  }

  // ---------------------------------------------------------------- estilo
  _css() {
    return `
    :host{--c-txt:var(--primary-text-color);--c-sub:var(--secondary-text-color);--c-linha:var(--divider-color,rgba(127,127,127,.25));
      --c-fundo:var(--card-background-color,var(--ha-card-background,#fff));--c-acc:var(--primary-color);
      --c-sobe:var(--error-color,#c0392b);--c-desce:var(--success-color,#1f7a55);--c-alerta:var(--warning-color,#b7791f);
      --c-papel:#fbfaf5;--c-papel-txt:#2a2a26}
    ha-card{padding:16px;display:grid;grid-template-columns:minmax(0,1fr);gap:14px;color:var(--c-txt);box-sizing:border-box;
      font-variant-numeric:tabular-nums;touch-action:manipulation}
    button{font:inherit;color:inherit}
    .topo{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px}
    .titulo{font-size:24px;font-weight:700}
    .mes{display:flex;align-items:center;gap:6px;font-weight:600;white-space:nowrap}
    .ico{background:none;border:1px solid var(--c-linha);border-radius:8px;width:32px;height:32px;cursor:pointer;font-size:16px;line-height:1}
    .btn{border:1px solid var(--c-linha);background:none;border-radius:10px;padding:8px 14px;cursor:pointer;font-weight:600;white-space:nowrap}
    .btn.prim{background:var(--c-acc);border-color:var(--c-acc);color:var(--text-primary-color,#fff)}
    .btn.perigo{background:var(--c-sobe);border-color:var(--c-sobe);color:#fff}
    .btn:disabled{opacity:.5;cursor:default}
    .lnk{background:none;border:0;color:var(--c-acc);cursor:pointer;padding:0;font-size:inherit}
    a.lnk{text-decoration:none}
    .lnk.perigo{color:var(--c-sobe)}
    .aviso{background:color-mix(in srgb,var(--c-acc) 12%,transparent);border-radius:8px;padding:8px 12px;font-size:13.5px}
    .kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}
    .kpi{border:1px solid var(--c-linha);border-radius:12px;padding:10px 12px;min-width:0}
    .kpi .l{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--c-sub)}
    .kpi .v{font-size:22px;font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap}
    .kpi .d{font-size:12px;color:var(--c-sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .sobe{color:var(--c-sobe)} .desce{color:var(--c-desce)}
    .pp{display:grid;grid-template-columns:8px minmax(0,1fr) auto;gap:6px;align-items:center;font-size:13px;margin-top:3px}
    .apl .apitem{width:100%;margin:6px 0;box-sizing:border-box}
    .pp i,.meta i{display:inline-block;width:8px;height:8px;border-radius:50%;flex:none}
    .meta .mt{min-width:0;overflow:hidden;text-overflow:ellipsis}
    .pp b{font-variant-numeric:tabular-nums;font-weight:600}
    .grade{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:14px;align-items:start}
    .col{display:grid;gap:14px;min-width:0}
    section{border:1px solid var(--c-linha);border-radius:12px;padding:12px;display:grid;gap:8px;min-width:0}
    h2{font-size:16px;margin:0;font-weight:600}
    .h{display:flex;justify-content:space-between;align-items:baseline;gap:8px}
    .h small{color:var(--c-sub);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .row{display:grid;grid-template-columns:40px minmax(0,1fr) auto;gap:10px;align-items:center;width:100%;padding:9px 2px;
      border:0;border-top:1px solid var(--c-linha);background:none;text-align:left;cursor:pointer}
    .lista .row:first-child{border-top:0}
    .row:focus-visible,.btn:focus-visible,.ico:focus-visible{outline:2px solid var(--c-acc);outline-offset:2px}
    .data{text-align:center;font-size:11px;color:var(--c-sub);line-height:1.15}
    .data b{display:block;font-size:17px;color:var(--c-txt)}
    .loja{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .meta{font-size:12px;color:var(--c-sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:5px}
    .dir{text-align:right}
    .amt{font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap}
    .tag{font-size:11px;border-radius:999px;padding:1px 7px;white-space:nowrap}
    .tag.areemb{background:color-mix(in srgb,var(--c-alerta) 18%,transparent);color:var(--c-alerta)}
    .tag.arec{background:color-mix(in srgb,var(--c-acc) 16%,transparent);color:var(--c-acc)}
    .reemb .rec{border-top:1px solid var(--c-linha);margin-top:10px;padding-top:6px}
    .reemb .rec .deve{color:var(--c-acc)}
    .edreemb{grid-column:1/-1;display:grid;gap:6px;justify-items:start}
    .fexcl{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--c-linha)}.fexcl small{display:block}
    .fexclb{display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex:none}
    .fexclconf{display:grid;gap:6px;margin:6px 0;padding:10px 12px;border-radius:12px;border:1px solid var(--c-perigo,#c0392b);background:color-mix(in srgb,var(--c-perigo,#c0392b) 7%,transparent)}
    .edreemb .rtit{font-size:12px;color:var(--c-sub)}
    .edreemb .rlinha{display:flex;flex-wrap:wrap;gap:8px;align-items:center;width:100%}
    .edreemb .rchk{display:flex;gap:6px;align-items:center;font-size:14px;color:var(--c-txt);border:1px solid var(--c-linha);border-radius:10px;padding:8px 12px;cursor:pointer}
    .edreemb .rchk:has(input:checked){border-color:var(--c-acc);background:color-mix(in srgb,var(--c-acc) 8%,transparent)}
    .edreemb #ed-rnome{flex:1 1 220px;min-width:0}
    .tag.ok{background:color-mix(in srgb,var(--c-desce) 15%,transparent);color:var(--c-desce)}
    .bar{display:grid;grid-template-columns:minmax(0,8.5em) minmax(0,1fr) auto;gap:8px;align-items:center;font-size:13px}
    .bar .n{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .trk{height:9px;border-radius:5px;background:var(--c-linha);overflow:hidden}
    .fill{height:100%;background:var(--c-acc);border-radius:5px}
    .bar .p{font-variant-numeric:tabular-nums;white-space:nowrap}
    .sub{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 8px;font-size:13px;padding:6px 8px;border-radius:8px;
      background:color-mix(in srgb,var(--c-sobe) 10%,transparent)}
    .sub .t{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .sub .pill{color:var(--c-sobe);font-weight:600;white-space:nowrap}
    .sub.baixou{background:color-mix(in srgb,var(--c-desce) 10%,transparent)} .sub.baixou .pill{color:var(--c-desce)}
    .sub .m{grid-column:1/-1;color:var(--c-sub);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .reemb{border-color:color-mix(in srgb,var(--c-alerta) 50%,var(--c-linha))}
    .deve{color:var(--c-alerta);font-size:18px;font-variant-numeric:tabular-nums}
    .rl{display:grid;grid-template-columns:auto 44px minmax(0,1fr) auto;gap:8px;align-items:center;font-size:13.5px;cursor:pointer}
    .rd{color:var(--c-sub);font-variant-numeric:tabular-nums}
    .rn{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .rv{font-variant-numeric:tabular-nums;white-space:nowrap}
    .conf{display:flex;flex-wrap:wrap;gap:8px;align-items:center;font-size:13.5px}
    details{font-size:13px;color:var(--c-sub)}
    summary{cursor:pointer}
    .pg{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:8px;padding:3px 0}
    .pg span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .vazio{color:var(--c-sub);text-align:center;padding:24px 8px;display:grid;gap:10px;justify-items:center}
    .vazio.peq{padding:10px 4px;font-size:13px}
    .rodape{font-size:12px;color:var(--c-sub);text-align:right}
    .folha{width:min(520px,calc(100vw - 24px));max-height:calc(100vh - 48px);max-height:calc(100dvh - 48px);overflow:auto;overscroll-behavior:contain;box-sizing:border-box;
      background:var(--c-fundo);color:var(--c-txt);border:0;border-radius:16px;padding:16px;gap:12px;box-shadow:0 10px 40px rgba(0,0,0,.35)}
    .folha[open]{display:grid;align-content:start}
    .folha.nota{width:min(900px,calc(100vw - 16px));height:calc(100vh - 32px);height:calc(100dvh - 32px);max-height:none;grid-template-rows:auto auto 1fr}
    .folha.nota.pdf{grid-template-rows:auto auto auto 1fr}  /* PDF: a frase "PDF original…" é a 3ª linha; o PDF fica com o resto */
    .notabar{display:flex;gap:8px;flex-wrap:wrap}
    .notaif{width:100%;height:100%;min-height:300px;border:1px solid var(--c-linha);border-radius:8px;background:#fff}
    .notabtn{justify-self:start}
    .folha::backdrop{background:rgba(0,0,0,.45)}
    .fh{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
    .ft{font-size:19px;font-weight:700}
    .fs{font-size:13px;color:var(--c-sub)}
    .edits{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
    .edits label,.form label{display:grid;gap:3px;font-size:12px;color:var(--c-sub)}
    .topo .botoes{display:flex;gap:8px;flex-wrap:wrap}.topo .botoes .btn.prim{flex:1}
    .aviso.ok{border-color:var(--c-desce)}
    .abas{display:flex;gap:4px;border-bottom:1px solid var(--c-linha);overflow:visible;align-items:center}
    .abas-rol{display:flex;gap:4px;overflow-x:auto;align-items:center;flex:1;min-width:0;scrollbar-width:none}.abas-rol::-webkit-scrollbar{display:none}
    @media (max-width:520px){.abas{flex-wrap:wrap;gap:0}.icones{order:-1;width:100%;justify-content:flex-end;padding:0}.abas-rol{flex-basis:100%;justify-content:space-between;gap:0}.abas-rol .aba{padding:8px 6px}}
    @media (max-width:380px){.abas-rol .aba{font-size:14px;padding:8px 3px}}
    .icones{margin-left:auto;display:flex;align-items:center;gap:0;flex:none;padding-left:4px}
    .ic{border:0;background:none;cursor:pointer;color:var(--c-sub);padding:7px;border-radius:50%;position:relative;display:grid;place-items:center;line-height:0}
    .ic svg{width:22px;height:22px;fill:currentColor}.ic:hover{background:rgba(127,127,127,.14)}
    .ic.on{color:var(--c-acc);background:color-mix(in srgb,var(--c-acc) 14%,transparent)}
    .ic.gira svg{animation:cgira 1s linear infinite}@keyframes cgira{to{transform:rotate(360deg)}}
    @media (prefers-reduced-motion:reduce){.ic.gira svg{animation:none}.ic.gira{opacity:.5}}
    .sinoem{font-size:19px;line-height:22px;width:22px;text-align:center;opacity:.55}.sinoic.tem .sinoem{opacity:1}
    .ic b{position:absolute;top:0;right:0;background:#e53935;color:#fff;font-size:10.5px;line-height:16px;min-width:16px;padding:0 4px;border-radius:8px;box-sizing:border-box}
    .sino{margin-left:auto;border:0;background:none;cursor:pointer;font-size:18px;position:relative;padding:4px 8px;opacity:.55}
    .sino.tem{opacity:1}.sino b{position:absolute;top:-2px;right:0;background:#e53935;color:#fff;font-size:10.5px;line-height:16px;min-width:16px;padding:0 4px;border-radius:8px;box-sizing:border-box}
    .km{font-weight:400;color:var(--c-sub);font-size:12.5px}
    button.bar.bem{grid-template-columns:minmax(0,1fr) 0 auto}
    .aba{background:none;border:0;border-bottom:2px solid transparent;padding:8px 12px;cursor:pointer;font-weight:600;color:var(--c-sub);white-space:nowrap}
    .aba.on{color:var(--c-acc);border-bottom-color:var(--c-acc)}
    .busca input{font-size:16px}
    .chips{display:flex;gap:6px;flex-wrap:wrap}
    .chip{border:1px solid var(--c-linha);background:none;border-radius:999px;padding:4px 12px;cursor:pointer;font-size:13px;color:var(--c-sub)}
    .chip.on{border-color:var(--c-acc);color:var(--c-acc);background:color-mix(in srgb,var(--c-acc) 10%,transparent)}
    .row.prod{grid-template-columns:minmax(0,1fr) auto}
    .graf{width:100%;height:auto;display:block}
    .graf text{fill:var(--c-sub);font-size:11px}
    .graf .gl{stroke:var(--c-linha);stroke-width:1}
    .leg{display:flex;gap:12px;flex-wrap:wrap;font-size:12px;color:var(--c-sub)}
    .leg i{display:inline-block;width:12px;height:3px;border-radius:2px;margin-right:5px;vertical-align:middle}
    .destaque{background:color-mix(in srgb,var(--c-desce) 12%,transparent);border-radius:8px;padding:8px 10px;font-size:13.5px}
    .bar .n.best{color:var(--c-desce);font-weight:600}
    .fill.best{background:var(--c-desce)}
    .hist{display:grid;gap:2px;font-size:12.5px}
    button.toca{border:0;background:none;width:100%;text-align:left;cursor:pointer;padding:0;color:inherit;font-family:inherit;font-size:inherit;line-height:inherit}
    button.bar.toca{padding:3px 0;border-radius:6px}button.toca:hover{background:var(--c-linha)}
    button.hl.toca{padding:5px 0}
    .hl{display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;gap:8px;padding:3px 0;border-top:1px solid var(--c-linha)}
    .hl span{white-space:nowrap}
    .hl .hn{overflow:hidden;text-overflow:ellipsis}
    .rk{display:grid;grid-template-columns:32px minmax(0,1fr);gap:8px;align-items:center;padding:6px 0;border-top:1px solid var(--c-linha)}
    .rk:first-of-type{border-top:0}
    .pos{font-size:16px;color:var(--c-acc)}
    .juntar{display:grid;gap:8px;border:1px dashed var(--c-linha);border-radius:10px;padding:10px}
    select,input[type=text],input[type=date],input[type=search],input[type=number]{font:inherit;font-size:14px;color:var(--c-txt);background:var(--c-fundo);
      border:1px solid var(--c-linha);border-radius:8px;padding:7px 8px;min-width:0;width:100%;box-sizing:border-box}
    .form{display:grid;gap:10px}
    .solta{border:2px dashed var(--c-linha);border-radius:12px;padding:18px 12px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:center;text-align:center;color:var(--c-sub);font-size:14px}
    .solta.sobre{border-color:var(--c-acc);background:color-mix(in srgb,var(--c-acc) 10%,transparent);color:var(--c-txt)}
    .solta .escolher{position:relative;color:var(--c-txt);font-size:14px}
    .solta .escolher input{position:absolute;inset:0;opacity:0;width:100%;cursor:pointer}
    @media (hover:none){.solta .arraste{display:none}.solta{padding:12px;border-style:solid}}
    .uplista{display:grid;gap:6px}
    .upfim{display:grid;gap:4px;margin:0 0 12px;padding:12px 14px;border-radius:12px;border:1px solid var(--c-desce);background:color-mix(in srgb,var(--c-desce) 12%,transparent);color:var(--c-txt);font-size:14px}
    .upfim b{font-size:16px}.upfim.erro{border-color:var(--c-sobe);background:color-mix(in srgb,var(--c-sobe) 10%,transparent)}
    .uparq{display:grid;grid-template-columns:1fr auto;gap:2px 8px;align-items:center;border:1px solid var(--c-linha);border-radius:10px;padding:6px 6px 6px 10px}
    .uparq .upn{font-size:13.5px;color:var(--c-txt);overflow-wrap:anywhere}
    .uparq .upm{grid-column:1/-1;font-size:12.5px;color:var(--c-sub)}
    .uparq.ok{border-color:var(--c-desce)}.uparq.erro{border-color:var(--c-sobe)}.uparq.erro .upm{color:var(--c-sobe)}
    .uparq .ico{width:26px;height:26px;font-size:13px}
    .escolher.anexar{position:relative;margin-top:8px;text-align:center}
    .escolher.anexar input{position:absolute;inset:0;opacity:0;width:100%;cursor:pointer}
    .upsabe summary{cursor:pointer;font-size:13px;color:var(--c-sub)}
    .upsabe ul{margin:6px 0;padding-left:18px;font-size:13px;display:grid;gap:3px}
    .form select:disabled{opacity:.55;cursor:not-allowed}.form .fs[hidden]{display:none}
    .form .chk{display:flex;gap:8px;align-items:center;font-size:14px;color:var(--c-txt)}.form .chk[hidden]{display:none}.form label[hidden]{display:none}.form .duas[hidden]{display:none}
    .cartbox{border:1px solid var(--c-linha);border-radius:10px;padding:8px 10px;display:grid;gap:6px}
    .cartlin{display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));gap:8px;align-items:end;padding:6px 0;border-bottom:1px dashed var(--c-linha)}
    .cartbox>summary{cursor:pointer;font-size:13.5px}.pgacoes{display:flex;gap:12px;align-items:center;padding-bottom:6px}
    .cartlin label{display:grid;gap:3px;font-size:12px;color:var(--c-sub)}.cartlin .fs{grid-column:1/-1}
    .cartlin select,.cartlin input{font:inherit;font-size:13.5px;padding:5px;border:1px solid var(--c-linha);border-radius:8px;background:var(--c-fundo);color:var(--c-txt);min-width:0}
    .cobr{font-size:13px;color:var(--c-sub)}.cobr b{color:var(--c-txt)}
    .apl{display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;padding:8px 0;border-top:1px solid var(--c-linha)}.apl>span{display:flex;gap:8px}
    .mu-compra{font-size:14px;margin:2px 0}.mu-em{opacity:.7;font-size:12px}
    .pgsalvar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:6px 0}
    .pgsalvar.sujo{background:color-mix(in srgb,var(--c-alerta,#d97706) 10%,transparent);border-radius:10px;padding:8px 10px}
    .pgaviso{flex-basis:100%;font-weight:600}
    .npg{display:grid;gap:6px;padding:4px 0}.npg+.npg{border-top:1px dashed var(--c-linha);padding-top:8px}
    .npg-mais{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.npg-mais .fs.ok{color:var(--c-ok,#15803d)}.npg-mais .fs.erro{color:var(--c-erro,#b91c1c)}
    .cartfat{font-size:13.5px;font-weight:600}.cartfat.alerta{color:var(--c-alerta)}
    @media (max-width:480px){.cartlin{grid-template-columns:1fr 1fr}.cartlin label:first-child{grid-column:1/-1}}
    .recibo{background:var(--c-papel);color:var(--c-papel-txt);font:12.5px/1.5 ui-monospace,Consolas,monospace;padding:14px;border-radius:6px}
    .recibo .c{text-align:center}
    .recibo hr{border:0;border-top:1px dashed currentColor;opacity:.45;margin:8px 0}
    .it{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}
    .it .ds{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .it em{font-style:normal;font-size:10.5px;border:1px solid currentColor;border-radius:4px;padding:0 3px;opacity:.75}
    .it.q{opacity:.75;font-size:11.5px}
    .it .sobe{color:#b3261e;font-weight:600} .it .desce{color:#1f7a55;font-weight:600}
    .it .ant{font-size:10.5px;opacity:.85;margin-left:2px} .it.q.ant{display:block;margin-top:-2px}
    .tot{display:flex;justify-content:space-between;font-weight:700;font-size:14px}
    .chave{font-size:10.5px;opacity:.7}.chave .g4{white-space:nowrap}
    .ant1{font-size:11px;opacity:.75;margin-bottom:4px}
    .alerta{color:#a15c00}
    .fpe{display:flex;flex-wrap:wrap;gap:8px;align-items:center;font-size:13px}
    .pt{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px;vertical-align:middle}
    .leg i.pt{width:8px;height:8px;border-radius:50%}
    .dica{color:var(--c-sub);font-size:12px}
    .chips.rolar{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;padding-bottom:2px}
    .chips.rolar .chip{flex:none}
    .meta b.tp{color:var(--c-txt);font-weight:600}
    .parec{display:grid;gap:6px;border:1px solid color-mix(in srgb,var(--c-desce) 45%,var(--c-linha));border-radius:10px;padding:10px}
    label.tipo{display:grid;gap:3px;font-size:12px;color:var(--c-sub)}
    .mais .col{gap:8px;margin-top:8px}
    .cal{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}
    .cw{font-size:11px;color:var(--c-sub);text-align:center}
    .cd{height:46px;border-radius:9px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;
      font-size:13px;color:var(--c-sub);border:1px solid transparent;padding:0;min-width:0;background:none;box-sizing:border-box}
    .cd.tem{color:var(--c-txt);font-weight:700;cursor:pointer;border-color:color-mix(in srgb,var(--c-acc) 40%,transparent)}
    .cd.sel{outline:2px solid var(--c-acc);outline-offset:1px}
    .cd.hoje{border-color:var(--c-sub)}
    .cd:focus-visible{outline:2px solid var(--c-acc);outline-offset:1px}
    .dots{display:flex;gap:3px;height:7px}
    .dots i{width:7px;height:7px;border-radius:50%;box-shadow:0 0 0 1.5px var(--c-fundo)}
    .diasel{display:grid;gap:4px;border-top:1px solid var(--c-linha);padding-top:8px}
    h2.h3{font-size:14px}
    .ano{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
    .mini{border:1px solid var(--c-linha);border-radius:10px;padding:7px;background:none;cursor:pointer;display:grid;gap:5px;text-align:left;min-width:0}
    .mini.nada{opacity:.55}
    .mh{font-size:13px}
    .mg{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:2px}
    .mg i{aspect-ratio:1;border-radius:50%}
    .mg i.md{background:var(--c-linha);transform:scale(.55)}
    .mg i.md.tem{transform:none}
    .ms{font-size:11px;color:var(--c-sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .sep h2{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--c-sub);margin-top:4px}
    button.sub{border:0;width:100%;text-align:left;cursor:pointer;color:inherit}
    .pagocom{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:baseline;font-size:13.5px}
    .pgc{font-variant-numeric:tabular-nums}
    details.editar{border:1px solid var(--c-linha);border-radius:10px;padding:8px 10px;color:var(--c-txt)}
    details.editar:not([open]){border-color:transparent;padding:0}
    .links{display:flex;flex-wrap:wrap;gap:4px 16px;font-size:13.5px;margin-top:-4px}
    .qrbox{display:flex;gap:12px;align-items:center;border:1px solid var(--c-linha);border-radius:10px;padding:10px;flex-wrap:wrap}
    .qr{width:150px;height:150px;background:#fff;border-radius:6px;padding:4px;box-sizing:border-box}.qr svg{width:100%;height:100%;display:block}
    .qrtxt{display:grid;gap:8px;flex:1;min-width:150px}.qrtxt .btn{justify-self:start;text-decoration:none;color:var(--c-txt)}
    details.editar>summary{color:var(--c-acc);font-weight:600;font-size:13.5px}
    .edcorpo{display:grid;gap:10px;margin-top:10px}
    .duas{display:grid;grid-template-columns:minmax(0,1fr) 9em;gap:10px}
    .apel{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:end}
    .apel label{display:grid;gap:3px;font-size:12px;color:var(--c-sub)}
    @media (max-width:520px){.topo .btn.prim{width:100%}.ano{grid-template-columns:repeat(3,minmax(0,1fr))}}
    @media (max-width:700px){.grade{grid-template-columns:minmax(0,1fr)}.kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.kpi.pessoas{grid-column:1/-1}.edits{grid-template-columns:minmax(0,1fr)}}
    `;
  }
}

instalarFinancas(ComprasCard);
// ComprasCard: base do co-finance-card (não registrado como compras-card)
// ComprasCard: mesmo arquivo
console.info(`%c COMPRAS-CARD %c ${COMPRAS_CARD_VERSION} `, "background:#0f9f8f;color:#fff", "");


// ----- compras-v2-card -------------------------------------------------------

// =============================================================================
// Central de Compras v2 — visual "Carteira"
//
// Mesmo motor do compras-card (dados, script, janelas de edição, sino, contas): este arquivo só troca a
// aparência. Início novo (total do mês, pilha de cartões, a pagar, feed com o logo de cada loja) e a
// janela da compra em três partes: Resumo · Nota · Editar. Contas, Gastos e Produtos ainda usam as telas
// do card atual, por dentro do visual novo, até serem refeitas.
//
// Uso no painel:  type: custom:compras-v2-card
// =============================================================================

// compras-card: incluído acima

const V2_VERSION = "2026-10-27u";
const V2_MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const V2_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const V2_LARGO = 980;
const V2_GUARDA = "compras-v2:tela";  // como a tela foi deixada (só neste navegador/aparelho)  // a partir desta largura do card: três colunas e a compra abre ao lado

// Ícones (desenhos do Material Design, os mesmos do Home Assistant)
const V2_IC = {
  sino: "M21,19V20H3V19L5,17V11C5,7.9 7.03,5.17 10,4.29C10,4.19 10,4.1 10,4A2,2 0 0,1 12,2A2,2 0 0,1 14,4C14,4.1 14,4.19 14,4.29C16.97,5.17 19,7.9 19,11V17L21,19M14,21A2,2 0 0,1 12,23A2,2 0 0,1 10,21",
  mais: "M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z",
  esq: "M15.41,16.58L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.58Z",
  dir: "M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z",
  fechar: "M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z",
  atualizar: "M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z",
  engrenagem: "M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z",
  lapis: "M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z",
  nota: "M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M13.5,16V19H10.5V16H8L12,12L16,16H13.5M13,9V3.5L18.5,9H13Z",
  carrinho: "M17,18A2,2 0 0,1 19,20A2,2 0 0,1 17,22C15.89,22 15,21.1 15,20C15,18.89 15.89,18 17,18M1,2H4.27L5.21,4H20A1,1 0 0,1 21,5C21,5.17 20.95,5.34 20.88,5.5L17.3,11.97C16.96,12.58 16.3,13 15.55,13H8.1L7.2,14.63L7.17,14.75A0.25,0.25 0 0,0 7.42,15H19V17H7C5.89,17 5,16.1 5,15C5,14.65 5.09,14.32 5.24,14.04L6.6,11.59L3,4H1V2M7,18A2,2 0 0,1 9,20A2,2 0 0,1 7,22C5.89,22 5,21.1 5,20C5,18.89 5.89,18 7,18Z",
  conta: "M13,9H18.5L13,3.5V9M6,2H14L20,8V20A2,2 0 0,1 18,22H6C4.89,22 4,21.1 4,20V4C4,2.89 4.89,2 6,2M15,18V16H6V18H15M18,14V12H6V14H18Z",
  alerta: "M13,14H11V10H13M13,18H11V16H13M1,21H23L12,2L1,21Z",
  baixo: "M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z",
  calendario: "M7 11H9V13H7V11M21 5V19C21 20.11 20.11 21 19 21H5C3.89 21 3 20.1 3 19V5C3 3.9 3.9 3 5 3H6V1H8V3H16V1H18V3H19C20.11 3 21 3.9 21 5M5 7H19V5H5V7M19 19V9H5V19H19M15 13V11H17V13H15M11 13V11H13V13H11M7 15H9V17H7V15M15 17V15H17V17H15M11 17V15H13V17H11Z",
  lista: "M7,5H21V7H7V5M7,13V11H21V13H7M4,4.5A1.5,1.5 0 0,1 5.5,6A1.5,1.5 0 0,1 4,7.5A1.5,1.5 0 0,1 2.5,6A1.5,1.5 0 0,1 4,4.5M4,10.5A1.5,1.5 0 0,1 5.5,12A1.5,1.5 0 0,1 4,13.5A1.5,1.5 0 0,1 2.5,12A1.5,1.5 0 0,1 4,10.5M7,19V17H21V19H7M4,16.5A1.5,1.5 0 0,1 5.5,18A1.5,1.5 0 0,1 4,19.5A1.5,1.5 0 0,1 2.5,18A1.5,1.5 0 0,1 4,16.5Z",
};
const V2_SVG = (k) => `<svg class="v-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="${V2_IC[k]}"/></svg>`;

// Marcas conhecidas: sigla e cor da marca no lugar do logo (depois troca pelo desenho salvo no HA).
// As demais lojas ganham as iniciais na cor da área.
const V2_MARCAS = [
  [/netflix/i, "N", "#e50914"], [/spotify/i, "S", "#1db954"], [/ifood/i, "if", "#ea1d2c"], [/\buber\b/i, "U", "#000000"],
  [/\b99\b|99 ?app|99pop/i, "99", "#f9c400", "#111"], [/amazon|amzn/i, "a", "#232f3e"], [/mercado ?livre|mercadolivre|mercado ?pago/i, "ML", "#ffe600", "#2d3277"],
  [/disney/i, "D+", "#0e2a6b"], [/hbo|\bmax\b/i, "max", "#002be7"], [/apple|itunes|icloud/i, "", "#1d1d1f"], [/google|youtube/i, "G", "#4285f4"],
  [/shopee/i, "S", "#ee4d2d"], [/drogasil|raia/i, "R", "#e2211c"], [/subway/i, "S", "#008c15"], [/mc ?donald/i, "M", "#da291c", "#ffc72c"],
  [/\bshell\b/i, "S", "#fbce07", "#dd1d21"], [/ipiranga/i, "I", "#003b8e", "#ffd400"], [/petrobras|\bbr mania/i, "BR", "#008542", "#ffd400"],
  [/magalu|magazine luiza/i, "M", "#0086ff"], [/chatgpt|openai/i, "AI", "#10a37f"], [/claude|anthropic/i, "C", "#d97757"],
];

const Base = ComprasCard;  // mesmo arquivo

class ComprasV2Card extends Base {
  setConfig(config) {
    super.setConfig(config);
    if (!this._v2Ini) { this._v2Ini = true; this._v2Lembrar(); }
    this._v2Aba = this._v2Aba || "inicio";
    if (!this._aba) this._aba = ({ contas: "pagar", gastos: "areas" })[this._v2Aba] || "resumo";
  }

  // como a pessoa deixou a tela (aba, calendário, de quem, período) volta ao recarregar, neste aparelho.
  // O mês atual continua "atual": quem deixou em outubro e abre em novembro cai em novembro.
  _v2Lembrar() {
    let e = null;
    try { e = JSON.parse(localStorage.getItem(V2_GUARDA) || "null"); } catch (_) { /* navegador sem armazenamento */ }
    if (!e) return;
    this._finEstado();
    if (["inicio", "contas", "gastos"].includes(e.aba)) this._v2Aba = e.aba;
    this._v2Cal = !!e.cal; this._v2Reemb = false;  // o filtro "A reembolsar" saiu da tela: não volta ligado de uma visita antiga
    if (e.quem) this._fQuem = e.quem;
    if (e.modo === "ano" && e.ano) { this._fModo = "ano"; this._fAno = e.ano; }
    else if (e.modo === "tudo") this._fModo = "tudo";
    else if (e.modo === "mes" && e.mes && !e.eraAtual) this._mes = e.mes;
  }
  _v2Guardar() {
    const e = { aba: this._v2Aba, cal: !!this._v2Cal, reemb: !!this._v2Reemb, quem: this._fQuem, modo: this._fModo, mes: this._mes, ano: this._fAno,
      eraAtual: this._mes === this._mesDe(new Date()) };
    try { localStorage.setItem(V2_GUARDA, JSON.stringify(e)); } catch (_) { /* navegador sem armazenamento */ }
  }

  connectedCallback() {
    super.connectedCallback();
    if (!this._v2Obs && window.ResizeObserver) {
      this._v2Obs = new ResizeObserver((es) => {
        const largo = es[0].contentRect.width >= V2_LARGO;
        if (largo === this._v2Largo) return;
        this._v2Largo = largo;
        if (!this.shadowRoot?.querySelector("dialog.folha") && !this.shadowRoot?.activeElement?.matches?.("input,textarea,select")) this._render();
      });
      this._v2Obs.observe(this);
    }
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this._v2Obs?.disconnect(); this._v2Obs = null;
  }

  // ---------------------------------------------------------------- tela
  _render() {
    if (!this.shadowRoot) return;
    const d = this._dados;
    let corpo;
    if (!d && this._erro) corpo = `<div class="vazio">${V2_SVG("alerta")} ${this._e(this._erro)}<br><button class="btn" data-a="recarregar">Tentar de novo</button></div>`;
    else if (!d) corpo = `<div class="vazio">Carregando compras…</div>`;
    else corpo = this._v2Topo() + this._v2Corpo(d);
    const rascunho = this._guardarRascunho();
    this.shadowRoot.innerHTML = `<style>${this._css()}${this._finCss()}${this._v2Css()}</style><ha-card class="v2${this._v2Largo ? " larga" : ""}">${corpo}${this._folha()}</ha-card>`;
    this._ligar();
    this._devolverRascunho(rascunho);
    if (d) this._v2Guardar();
  }

  // período · abas · sino · + ; no celular em duas linhas, no computador numa só
  _v2Topo() {
    this._finEstado();
    const aba = this._v2Aba, nAv = this._pendencias().total, modo = this._fModo;
    const [ano, n] = this._mes.split("-"), mes = V2_MESES[Number(n) - 1];
    const rot = modo === "mes" ? `${mes[0].toUpperCase()}${mes.slice(1)}/${ano.slice(2)}` : modo === "ano" ? this._fAno : "Tudo";
    const passo = modo === "mes" ? ["f-mes", "Mês anterior", "Próximo mês"] : ["v2-ano-passo", "Ano anterior", "Próximo ano"];
    const seta = (k) => modo === "tudo" ? "" : `<button class="v-seta" data-a="${passo[0]}" data-k="${k}" aria-label="${k < 0 ? passo[1] : passo[2]}">${V2_SVG(k < 0 ? "esq" : "dir")}</button>`;
    const abas = [["inicio", "Início"], ["contas", "Contas"], ["gastos", "Gastos"], ["produtos", "Produtos"]];
    const corrigir = "";  // o lápis virou "Histórico de pagamentos ›" em Contas da casa
    return `<div class="v-topo">
      <div class="v-mes">${seta(-1)}
        <div class="v-perw"><button class="v-per" data-a="v2-per" aria-expanded="${!!this._v2Per}" aria-label="Período: ${this._e(rot)}. Toque para escolher outro"><small>CoFinance</small><span>${this._e(rot)}${V2_SVG("baixo")}</span></button>
          ${this._v2Per ? this._v2Seletor() : ""}</div>
        ${seta(1)}</div>
      <nav class="v-abas" role="tablist" aria-label="Seções">${abas.map(([k, t]) => `<button role="tab" class="${aba === k ? "on" : ""}" aria-selected="${aba === k}" data-a="v2-aba" data-k="${k}">${t}</button>`).join("")}</nav>
      <div class="v-acoes">${this._v2Largo ? `<span class="v-atual">${this._v2AtualTxt()}</span>` : ""}${corrigir}
        <button class="v-ib" data-a="avisos" aria-label="Avisos${nAv ? `: ${nAv} para conferir` : ""}" title="Avisos">${V2_SVG("sino")}${nAv ? `<b>${nAv}</b>` : ""}</button>
        <div class="v-maisw"><button class="v-ib v-mais" data-a="v2-mais" aria-expanded="${!!this._v2Mais}" aria-label="Lançar">${V2_SVG("mais")}<span>Lançar</span></button>
          ${this._v2Mais ? `<div class="v-menu" role="menu">
            <button role="menuitem" data-a="novo">${V2_SVG("carrinho")}<span><b>Lançar compra</b><small>sem nota, à mão</small></span></button>
            <button role="menuitem" data-a="upload">${V2_SVG("nota")}<span><b>Enviar nota fiscal</b><small>foto, PDF ou XML</small></span></button>
            <button role="menuitem" data-a="recarregar">${V2_SVG("atualizar")}<span><b>Atualizar</b><small>${this._carregando ? "atualizando…" : "buscar o que mudou"}</small></span></button>
          </div>` : ""}</div>
        ${this._hass?.user?.is_admin ? `<button class="v-ib ${aba === "config" ? "on" : ""}" data-a="v2-config" aria-pressed="${aba === "config"}" aria-label="Configurações" title="Configurações">${V2_SVG("engrenagem")}</button>` : ""}
      </div></div>`;
  }

  // escolha do período: um mês qualquer, um ano inteiro ou tudo
  _v2Seletor() {
    const hoje = this._mesDe(new Date()), anoHoje = hoje.slice(0, 4);
    const anoSel = this._v2PerAno || (this._fModo === "ano" ? this._fAno : this._mes.slice(0, 4));
    const anos = this._finAnos(), menor = anos[anos.length - 1] || anoSel;
    const comGasto = new Set(this._finLinhas().map((l) => (l.c.emissao || "").slice(0, 7)));
    const meses = V2_MESES.map((nome, i) => {
      const mm = `${anoSel}-${String(i + 1).padStart(2, "0")}`, on = this._fModo === "mes" && this._mes === mm;
      return `<button class="${on ? "on" : ""} ${comGasto.has(mm) ? "tem" : ""}" data-a="v2-per-mes" data-k="${mm}" ${mm > hoje ? "disabled" : ""} aria-pressed="${on}">${nome.slice(0, 3)}</button>`;
    }).join("");
    const vista = this._v2PerVista || (this._fModo === "tudo" ? "ano" : this._fModo);
    const seg = `<div class="v-pop-seg" role="tablist">${[["mes", "Mês"], ["ano", "Ano"], ["tudo", "Tudo"]].map(([k, t]) => `<button role="tab" class="${(k === "tudo" ? this._fModo === "tudo" : vista === k) ? "on" : ""}" ${k === "tudo" ? 'data-a="v2-per-tudo"' : `data-a="v2-per-vista" data-k="${k}"`}>${t}</button>`).join("")}</div>`;
    if (vista === "ano") {
      const tot = this._finSomaPor(this._finLinhas().filter((l) => this._finDaPessoa(l)), (l) => String(l.c.emissao).slice(0, 4));
      return `<div class="v-pop" role="dialog" aria-label="Escolher período">${seg}<div class="v-pop-anos">${[...anos].map((a) => `<button class="${this._fModo === "ano" && this._fAno === a ? "on" : ""}" data-a="v2-per-anoint" data-k="${a}"><b>${a}</b><small>${this._finCurto(tot[a] || 0)}</small></button>`).join("")}</div></div>`;
    }
    return `<div class="v-pop" role="dialog" aria-label="Escolher período">${seg}
      <div class="v-pop-ano"><button data-a="v2-per-ano" data-k="-1" aria-label="Ano anterior" ${anoSel <= menor ? "disabled" : ""}>${V2_SVG("esq")}</button><b>${anoSel}</b>
        <button data-a="v2-per-ano" data-k="1" aria-label="Próximo ano" ${anoSel >= anoHoje ? "disabled" : ""}>${V2_SVG("dir")}</button></div>
      <div class="v-pop-meses">${meses}</div></div>`;
  }

  _v2Corpo(d) {
    const aviso = this._aviso && this._v2Aba === "inicio" ? `<div class="aviso" role="status">${this._e(this._aviso)}</div>` : "";
    if (this._v2Aba === "inicio") return aviso + this._v2Passos() + this._v2Inicio();
    if (this._v2Aba === "contas") return `<div class="v-velho">${this._finTela("pagar")}</div>`;
    if (this._v2Aba === "produtos") return `<div class="v-velho">${this._telaProdutos()}</div>`;
    if (this._v2Aba === "config") return `<div class="v-velho">${this._finConfig()}</div>`;
    return `<div class="v-velho v-gastos">${this._finTela("areas")}</div>`;
  }

  // ---------------------------------------------------------------- Início
  // casa nova: os mesmos passos da ⚙ (Primeiros passos), na ordem; cada um abre a ⚙ no lugar certo. Some quando os obrigatórios ficam prontos
  _v2Passos() {
    const D = this._dados, F = this._fFin;
    if (!D || !F || !this._hass?.user?.is_admin) return "";
    const atl = D.atalho || {};
    const ps = [
      ["pessoas", (D.pessoas || []).length > 0, "Quem mora na casa", "As pessoas que compram: nome, cor e o celular que recebe os avisos."],
      ["cartoes", (F.cartoes || []).length > 0, "Cartões", "Banco, quem usa e os dias em que a fatura fecha e vence."],
      ["faturas", (F.faturas_lidas || 0) > 0, "A primeira fatura", "Baixe a fatura do cartão em PDF no app do banco e leia aqui."],
      ["avisos", (D.pessoas || []).some((x) => x.aviso?.celular), "Avisos no telefone", "Quem recebe e a que horas avisar das contas e faturas."],
      ["atalho", !!(atl.casa || atl.fora || atl.base), "Atalho do telefone", "O endereço para o telefone (iPhone ou Android) mandar o QR Code do cupom."],
      ["pedidos", !!D.pedidos_email?.caixa, "Pedidos de lojas online", "Opcional: as compras da Shopee e outras entram pelo e-mail.", true],
    ];
    const prox = ps.find(([, ok, , , opc]) => !ok && !opc)?.[0];
    if (!prox) return "";
    const feitos = ps.filter(([, ok]) => ok).length;
    const passo = ([k, ok, tit, d, opc], n) => `<div class="v-passo${ok ? " ok" : ""}"><span class="v-pn" aria-hidden="true">${ok ? "✓" : n + 1}</span><span class="v-pt"><b>${tit}</b><small>${ok ? "pronto" : d}</small></span>
      ${ok ? "" : `<button class="btn${k === prox ? " prim" : ""}" data-a="v2-passo" data-k="${k}">${k === prox ? "Começar" : opc ? "Ver" : "Abrir"}</button>`}</div>`;
    return `<div class="v-passos"><h2>Vamos começar</h2><div class="v-dica">${feitos} de ${ps.length} prontos. Faça na ordem: cada passo pronto ganha ✓. Fica tudo na ⚙ e dá para mudar depois.</div>
      ${ps.map(passo).join("")}</div>`;
  }

  _v2Inicio() {
    this._finEstado();
    this._finGarantir();
    const F = this._fFin, modo = this._fModo;
    let lst = this._finFiltradas();
    const total = lst.reduce((s, l) => s + l.valor, 0);
    const dia = total - lst.filter((l) => this._finBem(l)).reduce((s, l) => s + l.valor, 0);
    const t = this._finTipico(true);
    let chip = "";
    if (t?.valor) {
      const v = (dia - t.valor) / t.valor, sobe = v > 0;
      chip = `<span class="v-chip ${sobe ? "sobe" : "desce"}">${sobe ? "▲" : "▼"} ${Math.round(Math.abs(v) * 100)}% ${sobe ? "acima" : "abaixo"} do normal${t.ate ? ` até o dia ${t.ate}` : ""}</span>`;
    }
    const quando = modo === "mes" ? `em ${V2_MESES[Number(this._mes.slice(5, 7)) - 1]}` : modo === "ano" ? `em ${this._fAno}` : `desde ${this._finAnos().slice(-1)[0] || ""}`;
    const [inteiro, cent] = this._brl(total).split(",");
    const heroi = `<div class="v-heroi"><span class="v-rot">${this._fQuem === "Todos" ? "Gastamos" : `${this._e(this._fQuem)} gastou`} ${quando}</span>
      <span class="v-total">${inteiro}<small>,${cent}</small></span>${chip}${this._v2Devemos()}</div>`;

    // cartões: os mesmos da aba Contas, na ordem da fatura que vence primeiro. Com uma pessoa escolhida,
    // cada fatura mostra só as compras dela (zero quando não tem nenhuma); contas da casa pelo dono da conta.
    let pilha = "", pagar = "";
    if (F) {
      const pessoa = this._fQuem !== "Todos" ? this._fQuem : null;
      const parte = (x) => !pessoa || x.tipo !== "fatura" ? x
        : { ...x, total: Math.round((x.itens || []).filter((i) => i.quem === pessoa).reduce((s, i) => s + (i.valor || 0), 0) * 100) / 100 };
      const hoje = F.hoje, todos = this._finObrigacoes().filter((x) => x.tipo === "fatura" || this._finDoFiltro(x)).map(parte);
      const abertos = todos.filter((x) => !x.pago).sort((a, b) => a.vence.localeCompare(b.vence));
      const faturas = todos.filter((x) => x.tipo === "fatura");
      // só os cartões de quem está escolhido no filtro (Todos = todos)
      // os cartões seguem o período: no mês, a fatura que vence nele (paga ou não); no ano e em tudo, a soma das faturas
      const doPer = (x) => modo === "mes" ? x.vence.slice(0, 7) === this._mes : modo === "ano" ? x.vence.slice(0, 4) === this._fAno : true;
      const ordem = (c) => `${c.x && !c.x.pago ? 0 : 1}${c.x ? c.x.vence : "9999"}`;  // em aberto primeiro, pelo vencimento
      const credito = (F.cartoes || []).filter((k) => k.credito !== false && (!pessoa || (k.usam_hoje || k.usam || []).includes(pessoa)  // final parado: só nos meses em que ainda tem parcela dela
          || ((k.usam || []).includes(pessoa) && faturas.some((x) => x.cartao === k.id && doPer(x) && x.total > 0))) && (k.ativo !== false || faturas.some((x) => x.cartao === k.id && doPer(x))))
        .map((k) => {
          const lst = faturas.filter((x) => x.cartao === k.id && doPer(x)).sort((a, b) => a.vence.localeCompare(b.vence));
          if (modo === "mes") {
            // mês atual com a fatura do mês já paga (ou sem fatura no mês): mostra a próxima, que é a que importa agora
            const x = lst[lst.length - 1];
            if (this._mes === hoje.slice(0, 7) && (!x || x.pago)) {
              const prox = faturas.filter((y) => y.cartao === k.id && !y.pago && y.vence.slice(0, 7) > this._mes).sort((a, b) => a.vence.localeCompare(b.vence))[0];
              if (prox) return { k, x: prox, n: lst.length, antes: x || null };
            }
            return { k, x, n: lst.length };
          }
          return { k, n: lst.length, abertas: lst.filter((x) => !x.pago).length,
            x: lst.length ? { id: `v2cart:${k.id}`, tipo: "fatura", cartao: k.id, vence: lst[lst.length - 1].vence, total: lst.reduce((s, x) => s + x.total, 0) } : undefined };
        })
        .sort((a, b) => modo === "mes" ? ordem(a).localeCompare(ordem(b)) : (b.x?.total || 0) - (a.x?.total || 0));
      // débito e vale: só os que tiveram gasto no período, depois dos de crédito; tocar abre as compras
      const doDia = (d) => modo === "mes" ? d.slice(0, 7) === this._mes : modo === "ano" ? d.slice(0, 4) === this._fAno : true;
      const quandoG = modo === "mes" ? `em ${V2_MESES[Number(this._mes.slice(5, 7)) - 1]}` : modo === "ano" ? `em ${this._fAno}` : "no total";
      const cards = [...credito, ...(F.cartoes || []).filter((k) => k.credito === false).map((k) => ({ k, x: this._finGastoX(k, doDia, quandoG, "v2-cart") })).filter((c) => c.x)];
      this._fCartLista = cards.map((c) => c.k.id);
      if (!this._fCartLista.includes(this._fCartSel)) this._fCartSel = this._fCartLista[0];
      if (cards.length) pilha = `<div class="v-pilha">${this._v2Face(this._finPilha(cards, Math.max(0, this._fCartLista.indexOf(this._fCartSel))), cards.find((c) => c.k.id === this._fCartSel) || cards[0], hoje)}</div>
        ${pessoa ? `<div class="v-nota-p">Faturas só com as compras de ${this._e(pessoa)}</div>` : ""}`;
      const lista = abertos.filter((x) => !(pessoa && x.tipo === "fatura" && x.total < 0.005));
      const vistos = new Set(), prox = lista.filter((x) => {  // atrasada vence antes, então é ela que fica
        const k = x.tipo === "fatura" ? `f:${x.cartao}` : `c:${x.nome}`;
        return vistos.has(k) ? false : vistos.add(k);
      });
      const soma = (l) => l.reduce((s, x) => s + x.total, 0), ult = lista[lista.length - 1]?.vence || "";
      const tudo = lista.length > prox.length ? `<button class="v-pg-tudo" data-a="v2-aba" data-k="contas"><span>Tudo em aberto, até ${V2_MESES[Number(ult.slice(5, 7)) - 1].slice(0, 3)}/${ult.slice(2, 4)}</span><b>${this._brl(soma(lista))} ›</b></button>` : "";
      pagar = `<div class="v-bloco"><div class="v-hd"><h2>A pagar</h2><button class="v-link" data-a="v2-aba" data-k="contas">ver contas ›</button></div>
        ${prox.length ? `<div class="v-pg-tot"><span>Próximos vencimentos</span><b>${this._brl(soma(prox))}</b></div>
          <div class="v-lista">${prox.map((x) => this._v2LinhaPagar(x, hoje)).join("")}</div>${tudo}` : `<div class="v-vazio">Nada em aberto.</div>`}</div>`;
    } else pagar = `<div class="v-bloco"><div class="v-hd"><h2>A pagar</h2></div><div class="v-vazio">Carregando contas…</div></div>`;

    // de quem · a reembolsar (só quando tem) · e, discreto à direita, lista ou calendário
    const pessoas = ["Todos", ...(this._dados.compradores || [])];
    const quem = `<div class="v-chips v-quem" role="group" aria-label="De quem">${pessoas.map((p) => `<button class="${this._fQuem === p ? "on" : ""}" aria-pressed="${this._fQuem === p}" data-a="f-quem" data-k="${this._e(p)}">${p === "Todos" ? "" : `<i style="background:${this._cor(p)}"></i>`}${this._e(p)}</button>`).join("")}</div>`;
    const ar = this._v2Area;
    const filtros = `<div class="v-filtros"><div class="v-chips" role="group" aria-label="Filtros da lista">
        ${ar ? `<button class="on" aria-label="Tirar o filtro da área ${this._e(ar)}" data-a="v2-area" data-k=""><i style="background:${this._finInfo(ar).cor}"></i>${this._e(ar)} ✕</button>` : ""}</div>
      <button class="v-vista-ic" data-a="v2-cal" aria-label="${this._v2Cal ? "Ver em lista" : "Ver em calendário"}" title="${this._v2Cal ? "Ver em lista" : "Ver em calendário"}">${V2_SVG(this._v2Cal ? "lista" : "calendario")}</button></div>`;
    let corpo;
    const total0 = total, lstTudo = lst;  // as áreas usam o mês inteiro; a lista e o calendário, só a área escolhida
    if (ar) lst = lst.filter((l) => l.area === ar);
    if (this._v2Cal) {
      const dia = this._v2Dia;
      const marca = dia ? `<style>.v-cal [data-a="f-dia"][data-k="${dia}"]{outline:2px solid var(--c-txt);outline-offset:1px}</style>` : "";
      if (modo === "tudo") corpo = this._v2Anos(lst);
      else corpo = `${marca}<div class="v-cal">${this._finDias(lst)}</div>${dia ? this._v2Feed(lst.filter((l) => String(l.c.emissao).slice(0, 10) === dia), true) : `<div class="v-dica">Toque num dia para ver as compras dele.</div>`}`;
    } else corpo = this._v2Feed(lst);
    const feed = `${filtros}${corpo}`;

    if (!this._v2Largo) return `<div class="v-inicio">${quem}${heroi}${pagar}${pilha}${this._v2Areas(lstTudo, total0)}${feed}${this._v2Rodape()}</div>`;
    // computador: com uma compra, conta ou cartão aberto na direita, "Onde foi o dinheiro" desce para a coluna da esquerda
    const lado = this._aberta && !this._nota ? `<div class="v-painel" aria-label="Compra aberta">${this._v2Compra()}</div>`
      : this._fConta ? `<div class="v-painel" aria-label="Conta aberta">${this._v2Conta()}</div>`
      : this._v2Cart ? `<div class="v-painel" aria-label="Faturas do cartão">${this._v2CartLista()}</div>` : "";
    const areas = this._v2Areas(lstTudo, total0, !lado);
    return `<div class="v-tres"><div class="v-col">${quem}${heroi}${pagar}${pilha}${lado ? areas : ""}</div><div class="v-col">${feed}${this._v2Rodape()}</div><div class="v-col">${lado || areas}</div></div>`;
  }

  // pessoa escolhida no filtro que pagou do próprio bolso e ainda não recebeu: o acerto fica no sino
  _v2Devemos() {
    const v = this._fQuem !== "Todos" ? this._dados?.devemos?.[this._fQuem] : 0;
    return v > 0.004 ? `<button class="v-deve" data-a="v2-deve">Devemos ${this._devemosA(this._fQuem)} ${this._e(this._fQuem)} <b>${this._brl(v)}</b> ›</button>` : "";
  }

  // "Tudo" no calendário: uma coluna por ano; tocar abre o ano. No computador a altura acompanha as colunas do lado.
  _v2Anos(lst) {
    const por = Object.entries(this._finSomaPor(lst, (l) => String(l.c.emissao).slice(0, 4))).sort();
    if (!por.length) return `<div class="v-vazio grande">Nenhum gasto ainda.</div>`;
    const max = Math.max(...por.map(([, v]) => v), 1), atual = String(new Date().getFullYear());
    return `<div class="v-bloco v-anosb${por.length > 8 ? " muitos" : ""}"><div class="v-hd"><h2>Ano a ano</h2><span class="v-dica0">toque num ano para abrir</span></div>
      <div class="v-anos">${por.map(([a, v]) => `<button class="v-ano${a === atual ? " atual" : ""}" data-a="f-vai-ano" data-k="${a}" aria-label="${a}: ${this._brl(v)}">
        <small class="cheio">${this._finCurto(v)}</small><small class="curto">${v >= 1000 ? `${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}<span class="mil"> mil</span>` : Math.round(v)}</small><span class="v-ano-b"><i style="height:${Math.max(2, v / max * 100).toFixed(1)}%"></i></span><b><span class="a4">${a}</span><span class="a2">’${a.slice(2)}</span></b></button>`).join("")}</div></div>`;
  }

  // no computador, o gráfico de anos termina na mesma linha que os blocos das colunas do lado
  _v2Alinhar() {
    const root = this.shadowRoot, g = root?.querySelector(".v-tres .v-anos");
    if (!g) return;
    const fundo = Math.max(...[...root.querySelectorAll(".v-tres .v-areas, .v-tres .v-pilha, .v-tres .v-painel")]
      .map((el) => el.getBoundingClientRect().bottom));
    const h = fundo - g.getBoundingClientRect().top;
    if (h > 220) g.style.height = `${Math.round(h)}px`;
  }

  // ajusta o texto do cartão da frente ao período escolhido (o desenho é o mesmo da aba Contas)
  _v2Face(html, c, hoje) {
    const tpl = document.createElement("template");
    tpl.innerHTML = html;
    const face = tpl.content.querySelector(".fcface");
    if (!face) return html;
    const peq = face.querySelector(".fcf-meio small"), pe = face.querySelector(".fcf-pe > span:first-child");
    const mes = V2_MESES[Number(this._mes.slice(5, 7)) - 1], x = c.x, dc = (d) => this._dataCurta(String(d).slice(0, 10) + "T12:00");
    let txt, st = "", urg = false;
    if (x?.gasto) {  // débito ou vale: o que saiu no período (a face já abre a lista)
      txt = x.rotulo;
      st = `${x.n} ${x.n === 1 ? "compra" : "compras"} · toque para ver`;
    } else if (this._fModo === "mes" && c.antes !== undefined) {  // próxima fatura (mês atual, a do mês já paga)
      const mp = V2_MESES[Number(x.vence.slice(5, 7)) - 1], aberta = x.fecha && x.fecha >= hoje;
      txt = `Fatura de ${mp} · ${aberta ? `até agora · fecha ${dc(x.fecha)}` : `vence ${dc(x.vence)}`}`;
      st = c.antes ? `${mes} ✓ paga ${this._brl(c.antes.total)}` : "";
    } else if (this._fModo === "mes") {
      if (!x) txt = `Nenhuma fatura em ${mes}`;
      else {
        txt = x.pago ? `Fatura de ${mes} · vencia ${dc(x.vence)}` : `Fatura de ${mes} · vence ${dc(x.vence)}`;
        st = x.pago ? (x.pago.via === "antes do controle" ? "✓ paga" : `✓ paga em ${dc(x.pago.em)}`) : x.vence < hoje ? "atrasada" : x.vence === hoje ? "vence hoje" : x.banco ? "conferida com o banco" : "soma das compras lançadas";
        urg = !x.pago && x.vence <= hoje;
      }
    } else {
      const quando = this._fModo === "ano" ? `em ${this._fAno}` : "no total";
      txt = c.n ? `${c.n} ${c.n === 1 ? "fatura" : "faturas"} ${quando}` : `Nenhuma fatura ${quando}`;
      st = c.n ? (c.abertas ? `${c.abertas} em aberto · toque para ver` : "todas pagas · toque para ver") : "";
      if (x) { face.setAttribute("data-a", "v2-cart"); face.setAttribute("data-k", c.k.id); face.setAttribute("aria-label", `Faturas do ${this._finNomeCartao(c.k)} ${quando}: ${this._brl(x.total)}`); }
    }
    if (peq) peq.textContent = txt;
    if (pe) { pe.textContent = st; pe.className = urg ? "fcf-atr" : ""; }
    return tpl.innerHTML;
  }

  // faturas de um cartão no ano (ou em tudo): uma linha por fatura; tocar abre a fatura com as compras
  _v2CartLista() {
    const F = this._fFin, k = (F?.cartoes || []).find((c) => c.id === this._v2Cart);
    const fechar = `<button class="v-ib" data-a="fechar" aria-label="Fechar">${V2_SVG("fechar")}</button>`;
    if (!k) return `<div class="v-fh"><span class="v-ft"><b>Cartão</b></span>${fechar}</div>`;
    const pessoa = this._fQuem !== "Todos" ? this._fQuem : null, modo = this._fModo;
    const lst = (F.faturas || []).filter((x) => x.cartao === k.id && (modo === "ano" ? x.vence.slice(0, 4) === this._fAno : modo === "mes" ? x.vence.slice(0, 7) === this._mes : true))
      .map((x) => !pessoa ? x : { ...x, total: Math.round((x.itens || []).filter((i) => i.quem === pessoa).reduce((s, i) => s + (i.valor || 0), 0) * 100) / 100 })
      .sort((a, b) => b.vence.localeCompare(a.vence));
    const c = this._finCartaoCor(k), quando = modo === "ano" ? `em ${this._fAno}` : modo === "mes" ? `em ${V2_MESES[Number(this._mes.slice(5, 7)) - 1]}` : "desde o início";
    const doDia = (d) => modo === "ano" ? d.slice(0, 4) === this._fAno : modo === "mes" ? d.slice(0, 7) === this._mes : true;
    const gastos = k.credito === false || k.debito ? this._finGastos(k, doDia) : [], somaG = gastos.reduce((s, x) => s + x.valor, 0);
    const linhaG = (x) => `<button class="v-it" data-a="abrir" data-id="${this._e(x.compra)}"><span class="v-data"><b>${x.data.slice(8, 10)}</b>${V2_MESES[Number(x.data.slice(5, 7)) - 1].slice(0, 3)}</span>
        <span class="v-t"><b>${this._e(x.loja)}</b><small>${this._e(x.quem || "")} · ${x.tipo === "Benefício" ? (x.saldo ? `benefício ${x.saldo === "refeicao" ? "refeição" : "alimentação"}` : "benefício") : "débito"}</small></span><span class="v-val">${this._brl(x.valor)}</span></button>`;
    // vale com dois saldos (Alelo refeição e alimentação): um bloco para cada, com o total dele
    const saldos = k.vale && gastos.some((x) => x.saldo) ? [["refeicao", "Refeição"], ["alimentacao", "Alimentação"]].map(([s, n]) => [n, gastos.filter((x) => x.saldo === s)]).filter(([, l]) => l.length) : null;
    const listaG = saldos ? saldos.map(([n, l]) => `<h3 class="v-sub">${n} · ${this._brl(l.reduce((s, x) => s + x.valor, 0))}</h3><div class="v-lista">${l.map(linhaG).join("")}</div>`).join("")
      : `<div class="v-lista">${gastos.map(linhaG).join("")}</div>`;
    const linha = (x) => {
      const m = V2_MESES[Number(x.vence.slice(5, 7)) - 1], st = x.pago ? (x.pago.via === "antes do controle" ? "paga" : `paga em ${this._dataCurta(String(x.pago.em).slice(0, 10) + "T12:00")}`) : x.vence < F.hoje ? "atrasada" : `vence ${this._dataCurta(x.vence + "T12:00")}`;
      return `<button class="v-it" data-a="f-conta" data-k="${this._e(x.id)}"><span class="v-data ${!x.pago && x.vence <= F.hoje ? "urg" : ""}"><b>${x.vence.slice(8, 10)}</b>${m.slice(0, 3)}</span>
        <span class="v-t"><b>Fatura de ${m}${x.vence.slice(0, 4) !== String(new Date().getFullYear()) ? ` ${x.vence.slice(0, 4)}` : ""}</b><small class="${!x.pago && x.vence < F.hoje ? "urg" : ""}">${st} · ${(x.itens || []).length ? `${x.itens.length} ${x.itens.length === 1 ? "compra" : "compras"}` : x.banco ? "valor do banco" : "sem compras lançadas"}</small></span><span class="v-val">${this._brl(x.total)}</span></button>`;
    };
    return `<div class="v-fh"><span class="v-logo g" style="background:${c.fundo};color:${c.tinta};box-shadow:inset 0 0 0 1px rgba(127,127,127,.35)" aria-hidden="true"></span>
        <span class="v-ft"><b>${this._e(this._finNomeCartao(k))}</b><small>${k.credito === false ? `${gastos.length} ${gastos.length === 1 ? "compra" : "compras"} ${quando} · ${k.vale ? "vale" : "débito"}, sai na hora` : `${lst.length} ${lst.length === 1 ? "fatura" : "faturas"} ${quando}`}${pessoa ? ` · só ${this._e(pessoa)}` : ""}</small></span>${fechar}</div>
      <div class="v-grande">${this._brl(k.credito === false ? somaG : lst.reduce((s, x) => s + x.total, 0))}</div>
      ${k.credito === false ? (gastos.length ? listaG : `<div class="v-vazio">Nenhum gasto ${quando}.</div>`)
        : `${lst.length ? `<div class="v-lista">${lst.map(linha).join("")}</div>` : `<div class="v-vazio">Nenhuma fatura ${quando}.</div>`}${gastos.length ? `<h3 class="v-sub">No débito ${quando} · ${this._brl(somaG)}</h3><div class="v-lista">${gastos.map(linhaG).join("")}</div>` : ""}`}`;
  }

  _v2LinhaPagar(x, hoje) {
    const d = x.vence, atr = d < hoje, hj = d === hoje;
    const dias = Math.round((new Date(d + "T12:00") - new Date(hoje + "T12:00")) / 864e5);
    const st = (atr ? `atrasada · venceu ${this._dataCurta(d + "T12:00")}` : hj ? "vence hoje" : dias === 1 ? "vence amanhã" : `vence em ${dias} dias`)
      + (x.tipo === "fatura" && x.fecha && x.fecha >= hoje ? ` · fecha ${this._dataCurta(x.fecha + "T12:00")}` : "");
    return `<button class="v-it${this._fConta === x.id ? " sel" : ""}" data-a="f-conta" data-k="${this._e(x.id)}"><span class="v-data ${atr || hj ? "urg" : ""}"><b>${d.slice(8, 10)}</b>${V2_MESES[Number(d.slice(5, 7)) - 1].slice(0, 3)}</span>
      <span class="v-t"><b>${this._e(x.nome)}</b><small class="${atr || hj ? "urg" : ""}">${st}</small></span><span class="v-val">${this._brl(x.total)}</span></button>`;
  }

  // compras e contas pagas do período, a mais nova em cima: por dia no mês, por mês no ano e em tudo
  _v2Feed(lst, umDia) {
    const por = new Map();
    for (const l of lst) { const p = por.get(l.c.id); if (p) p.v += l.valor; else por.set(l.c.id, { c: l.c, v: l.valor, area: l.area }); }
    let itens = [...por.values()].sort((a, b) => String(b.c.emissao).localeCompare(String(a.c.emissao)));
    if (this._v2Reemb) itens = itens.filter((x) => x.c.reembolso?.status === "a_reembolsar");
    if (!itens.length) return `<div class="v-vazio grande">Nenhuma compra${this._v2Reemb ? " a reembolsar" : ""} em ${this._e(this._finPeriodoTxt())}${this._fQuem === "Todos" ? "" : ` de ${this._e(this._fQuem)}`}.<br>Use <b>+ Lançar</b> ou o atalho "Ler Cupom" no iPhone.</div>`;
    const porMes = this._fModo !== "mes" && !umDia, lim = this._v2Lim || 80, resto = itens.length - lim;
    if (resto > 0) itens = itens.slice(0, lim);
    const grupos = new Map();
    for (const it of itens) { const k = String(it.c.emissao).slice(0, porMes ? 7 : 10); if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(it); }
    const somaDe = (k) => (porMes ? lst.filter((l) => String(l.c.emissao).startsWith(k)) : null);
    const hoje = this._finHoje(), ontem = (() => { const x = new Date(); x.setDate(x.getDate() - 1); return `${this._mesDe(x)}-${String(x.getDate()).padStart(2, "0")}`; })();
    return [...grupos].map(([k, l]) => {
      let nome, tot;
      if (porMes) {
        const m = V2_MESES[Number(k.slice(5, 7)) - 1];
        nome = `${m} ${k.slice(0, 4)}`;
        tot = this._v2Reemb ? l.reduce((s, x) => s + x.v, 0) : somaDe(k).reduce((s, x) => s + x.valor, 0);
      } else {
        const dt = new Date(k + "T12:00"), dm = `${dt.getDate()} ${V2_MESES[dt.getMonth()].slice(0, 3)}`;
        nome = k === hoje ? `Hoje · ${dm}` : k === ontem ? `Ontem · ${dm}` : `${V2_SEMANA[dt.getDay()]} · ${dm}`;
        tot = l.reduce((s, x) => s + x.v, 0);
      }
      return `<div class="v-dia"><span>${nome}</span><span>${this._brl(tot)}</span></div>
        <div class="v-lista">${l.map((x) => this._v2Linha(x, porMes)).join("")}</div>`;
    }).join("") + (resto > 0 ? `<button class="v-mais-itens" data-a="v2-lim">Mostrar mais (${resto} ${resto === 1 ? "compra" : "compras"})</button>` : "");
  }

  _v2Linha({ c, v, area }, comData) {
    const cor = this._cor(c.quem), sub = [c.subcategoria || area || "", comData ? this._dataCurta(c.emissao).slice(0, 5) : ""].filter(Boolean).join(" · ");
    const r = c.reembolso?.status;
    const parc = Math.max(0, ...(c.pago_com || []).map((p) => Number(p.parcelas) || 0));
    const tag = r === "a_reembolsar" ? `<small class="v-tag alerta">a reembolsar</small>` : r === "pago" ? `<small class="v-tag ok">reembolsado</small>`
      : c.classe_via === "a classificar" ? `<small class="v-tag">a classificar</small>` : parc > 1 ? `<small class="v-tag">${parc}x</small>` : "";
    const sel = this._aberta?.id === c.id || (c.conta && this._fConta === c.conta.id) ? " sel" : "";
    const abre = c.conta ? `data-a="f-conta" data-k="${this._e(c.conta.id)}"` : `data-a="abrir" data-id="${this._e(c.id)}"`;
    const valor = this._semReal(c) ? this._moeda(c.moeda) : this._brl(v);
    return `<button class="v-it${sel}" ${abre}>${this._v2Logo(c, area)}
      <span class="v-t"><b>${this._e(c.loja_curta)}</b><small><i style="background:${cor}"></i>${this._e(c.quem || "")}${sub ? ` · ${this._e(sub)}` : ""}</small></span>
      <span class="v-val">${valor}${tag}</span></button>`;
  }

  // logo da loja: marca conhecida (sigla e cor dela) ou iniciais na cor da área; conta da casa tem ícone de conta
  _v2Logo(c, area, grande) {
    const cls = `v-logo${grande ? " g" : ""}`;
    if (c.conta) return `<span class="${cls}" style="background:${this._finInfo(area || c.categoria).cor}">${V2_SVG("conta")}</span>`;
    const nome = `${c.loja_curta || ""} ${c.loja?.nome || ""}`;
    const m = V2_MARCAS.find(([re]) => re.test(nome));
    if (m) return `<span class="${cls}" style="background:${m[2]};color:${m[3] || "#fff"}" aria-hidden="true">${m[1] ? this._e(m[1]) : V2_SVG("carrinho")}</span>`;
    const pal = String(c.loja_curta || "?").replace(/[^\p{L}\p{N} ]/gu, " ").split(/\s+/).filter((p) => p.length > 2 || /\d/.test(p));
    const ini = (pal.length > 1 ? pal[0][0] + pal[1][0] : (pal[0] || "?").slice(0, 2)).toUpperCase();
    const cor = this._finInfo(area || c.categoria).cor;
    return `<span class="${cls}" style="background:color-mix(in srgb,${cor} 82%,#000)" aria-hidden="true">${this._e(ini)}</span>`;
  }

  // onde foi o dinheiro: as 5 maiores áreas (as outras numa linha que abre), barra = parte do total,
  // ▲▼ quando a área foge do normal dela, e tocar numa área mostra só as compras dela na lista
  _v2Areas(lst, total, dicaPainel) {
    const por = Object.entries(this._finSomaPor(lst, (l) => l.area)).sort((a, b) => b[1] - a[1]);
    const nm = this._v2NormalAreas(), normal = nm?.pendente ? null : nm, todas = this._v2AreasTodas || por.length <= 6;
    const mostra = todas ? por : por.slice(0, 5), resto = por.slice(5), pct = (v) => Math.round(v / (total || 1) * 100);
    const linha = ([a, v]) => {
      const n = normal?.[a], on = this._v2Area === a;
      const cmp = n && Math.abs(v - n) >= Math.max(50, n * 0.2)
        ? `<em class="${v > n ? "sobe" : "desce"}" title="normal até aqui: ${this._brl(n)}">${v > n ? "▲" : "▼"} ${Math.round(Math.abs(v - n) / n * 100)}%</em>` : "";
      return `<button class="v-area${on ? " on" : ""}" data-a="v2-area" data-k="${this._e(on ? "" : a)}" aria-pressed="${on}"><span><i style="background:${this._finInfo(a).cor}"></i>${this._e(a)}${cmp}</span><b>${this._brl(v)}</b><small>${pct(v)}%</small>
        <span class="v-barra"><span style="width:${Math.max(1, v / (total || 1) * 100).toFixed(1)}%;background:${this._finInfo(a).cor}"></span></span></button>`;
    };
    const outras = todas ? (por.length > 6 ? `<button class="v-area v-outras" data-a="v2-areas-todas"><span>Mostrar só as 5 maiores</span></button>` : "")
      : `<button class="v-area v-outras" data-a="v2-areas-todas"><span>+ ${resto.length} outras áreas</span><b>${this._brl(resto.reduce((s, [, v]) => s + v, 0))}</b><small>${pct(resto.reduce((s, [, v]) => s + v, 0))}%</small></button>`;
    const dicas = [nm?.pendente ? "A comparação de cada área com o normal aparece depois que as lojas das faturas forem classificadas (no sino)." : "",
      normal && por.some(([a, v]) => normal[a] && Math.abs(v - normal[a]) >= Math.max(50, normal[a] * 0.2)) ? "▲▼ comparado ao normal da área nos últimos 12 meses, até o mesmo dia" : "",
      por.length ? "Toque numa área para ver só as compras dela." : "", dicaPainel ? "Toque numa compra para ver o resumo e a nota aqui." : ""].filter(Boolean);
    return `<div class="v-bloco"><div class="v-hd"><h2>Onde foi o dinheiro</h2><button class="v-link" data-a="v2-aba" data-k="gastos">por área ›</button></div>
      ${por.length ? `<div class="v-areas${this._v2Area ? " filtro" : ""}">${mostra.map(linha).join("")}${outras}</div>` : `<div class="v-vazio">Nenhum gasto neste período.</div>`}
      ${dicas.map((d) => `<div class="v-dica">${d}</div>`).join("")}</div>`;
  }

  // normal de cada área: mediana dos 12 meses anteriores (os que tiveram compra), até o mesmo dia quando o mês está em andamento.
  // Com mais de 10% do histórico ainda "a classificar", não compara (devolve {pendente})
  _v2NormalAreas() {
    if (this._fModo !== "mes") return null;
    const hoje = new Date(), ate = this._mes === this._mesDe(hoje) ? hoje.getDate() : 31;
    const meses = new Set(Array.from({ length: 12 }, (_, i) => this._finSomaMes(this._mes, -(i + 1))));
    const por = {}, comGasto = new Set();
    let tudo = 0, semArea = 0;  // compra das faturas ainda sem área conta como "Outros" e baixaria o normal das outras áreas
    for (const l of this._finLinhas()) {
      const e = String(l.c.emissao || ""), m = e.slice(0, 7);
      if (!meses.has(m) || Number(e.slice(8, 10)) > ate || !this._finDaPessoa(l)) continue;
      comGasto.add(m);
      tudo += l.valor;
      if (l.c.classe_via === "a classificar") semArea += l.valor;
      (por[l.area] ||= {})[m] = (por[l.area][m] || 0) + l.valor;
    }
    if (comGasto.size < 3) return null;
    if (semArea > tudo * 0.1) return { pendente: true };
    const out = {};
    for (const [a, pm] of Object.entries(por)) {
      const vals = [...comGasto].map((m) => pm[m] || 0).sort((x, y) => x - y), k = vals.length >> 1;
      out[a] = vals.length % 2 ? vals[k] : (vals[k - 1] + vals[k]) / 2;
    }
    return out;
  }

  // quando os dados chegaram e qual versão está rodando: no celular no fim do Início, no computador no alto, acima do sino
  _v2AtualTxt() {
    const d = this._dados;
    return `${this._carregando ? "Atualizando…" : `Atualizado ${d?.atualizado_em ? new Date(d.atualizado_em).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}`} · v2 ${V2_VERSION}`;
  }
  _v2Rodape() { return `<div class="v-rodape">${this._v2AtualTxt()}</div>`; }

  // ---------------------------------------------------------------- janela da compra: Resumo · Nota · Editar
  // compra que veio da fatura do banco: não tem nota; mostra de onde veio (descrição do banco, parcelas, estorno)
  _v2NotaFatura(c) {
    const fb = c.fatura_banco || {}, cart = (this._fFin?.cartoes || []).find((k) => k.id === c.pago_com?.[0]?.cartao);
    const dc = (d) => this._dataCurta(String(d).slice(0, 10) + "T12:00");
    const linhas = (fb.linhas || []).slice().sort((a, b) => a[2] - b[2]);
    const linha = (a, b) => `<div class="it"><span class="ds">${a}</span><span class="vt">${b}</span></div>`;
    return `<div class="recibo"><div class="c"><b>${this._e(String(c.loja_curta || "").toUpperCase())}</b><br>SEM NOTA FISCAL · VEIO DA FATURA DO CARTÃO</div><hr>
      ${linha("Na fatura", this._e(fb.descricao || ""))}
      ${linha("Cartão", `${this._e(cart?.nome || c.pago_com?.[0]?.cartao || "")}${fb.final ? ` · final ${this._e(fb.final)}` : ""}`)}
      ${linha("Data da compra", dc(c.emissao))}
      ${fb.parcelas > 1 ? linha("Parcelas", `${fb.parcelas}x${fb.total_estimado ? " (total pela parcela)" : ""}`) : ""}
      ${linhas.length ? `<hr>${linhas.map(([fid, , p]) => linha(`Fatura que vence ${dc(fid.split(":")[1])}`, fb.parcelas > 1 ? `parcela ${p}/${fb.parcelas}` : "")).join("")}` : ""}
      ${fb.estorno ? linha("Estorno", `− ${this._brl(fb.estorno)}`) : ""}
      <hr><div class="tot"><span>TOTAL</span><span>${this._brl(c.valor_pago)}</span></div></div>
      <div class="fs">Se aparecer a nota desta compra, leia a nota normalmente: dá para juntar as duas em Editar.</div>`;
  }

  // ---------------------------------------------------------------- compras das faturas do banco (prévia, sino, lojas)
  _pendencias() {
    const p = super._pendencias(), fz = this._dados?.faturas || {};
    p.lotesFatura = fz.lotes || [];
    p.lojasClassificar = fz.lojas_a_classificar || 0;
    p.porTrazer = fz.por_trazer || 0;
    p.finAvaliar = this._dados?.finais?.avaliar || [];
    p.finAlertas = this._dados?.finais?.alertas || [];
    p.debSem = this._fFin?.debito_sem_cartao || [];
    p.total += p.debSem.length + p.lotesFatura.length + (p.lojasClassificar ? 1 : 0) + (p.porTrazer ? 1 : 0) + p.finAvaliar.length + p.finAlertas.length;
    return p;
  }

  _folhaAvisos() {
    const html = super._folhaAvisos(), pd = this._pendencias();
    const dc = (d) => this._dataCurta(String(d).slice(0, 10) + "T12:00");
    const blocos = [
      pd.debSem.length ? `<section><div class="h"><h2>Débito: qual cartão?</h2><small>${pd.debSem.length}</small></div>
        <div class="fs">A nota diz débito, mas não diz o cartão. Toque no cartão que pagou.</div>
        ${pd.debSem.map((x) => `<div class="apl"><div><button class="lnk" data-a="abrir" data-id="${this._e(x.compra)}"><b>${this._e(x.loja)}</b></button> · ${this._brl(x.valor)}<div class="fs">${this._e(x.quem || "")} · ${dc(x.data)}</div></div>
          <span>${x.opcoes.map((id) => { const k = (this._fFin?.cartoes || []).find((y) => y.id === id); return `<button class="btn" data-a="v2-qcart" data-id="${this._e(x.compra)}" data-i="${x.i}" data-k="${this._e(id)}">${this._e(k ? this._finNomeCartao(k) : id)}${k?.bandeira ? ` · ${this._e(k.bandeira)}` : ""}</button>`; }).join("")}</span></div>`).join("")}</section>` : "",
      pd.finAlertas.length ? `<section><div class="h"><h2>Compra em cartão parado</h2><small>${pd.finAlertas.length}</small></div>
        <div class="fs">Apareceu na fatura do banco uma compra feita depois do dia em que o final parou. Pode ser assinatura que ficou no cartão antigo.</div>
        ${pd.finAlertas.map((x) => `<div class="apl"><div><b>${this._e(x.nome)} final ${this._e(x.final)}</b> · ${this._e(x.quem || "")} · parado desde ${dc(x.parado)}
          ${x.compras.map((c) => `<div class="fs">${dc(c.data)} · ${this._e(c.descricao)} · ${this._brl(c.valor)}</div>`).join("")}</div>
          <span><button class="btn prim" data-a="v2-final" data-k="${this._e(x.cartao)}" data-f="${this._e(x.final)}" data-d="visto">Já vi</button><button class="btn" data-a="v2-final" data-k="${this._e(x.cartao)}" data-f="${this._e(x.final)}" data-d="segue">Continua em uso</button></span></div>`).join("")}</section>` : "",
      pd.finAvaliar.length ? `<section><div class="h"><h2>Finais de cartão para avaliar</h2><small>${pd.finAvaliar.length}</small></div>
        <div class="fs">Esse cartão ainda está sendo usado? Parado: some da escolha de cartão de quem usava, e o histórico fica.</div>
        ${pd.finAvaliar.map((x) => `<div class="apl"><div><b>${this._e(x.nome)} final ${this._e(x.final)}</b> · ${this._e(x.quem || "")}${x.tipo ? ` · ${this._e(x.tipo)}` : ""}
          <div class="fs">${x.ultima ? `última compra nas faturas: ${dc(x.ultima)}` : "nenhuma compra nas faturas lidas"}</div></div>
          <span><button class="btn prim" data-a="v2-final" data-k="${this._e(x.cartao)}" data-f="${this._e(x.final)}" data-d="parou">Parou de usar</button><button class="btn" data-a="v2-final" data-k="${this._e(x.cartao)}" data-f="${this._e(x.final)}" data-d="segue">Continua em uso</button></span></div>`).join("")}</section>` : "",
      pd.porTrazer ? `<section><div class="h"><h2>Compras das faturas</h2><small>${pd.porTrazer}</small></div>
        <div class="fs">Compras que estão nas faturas do banco e ainda não aparecem no calendário. Veja a prévia antes de trazer: nada é gravado sem você tocar em Trazer.</div>
        <div><button class="btn prim" data-a="v2-imp">Ver a prévia</button></div></section>` : "",
      pd.lotesFatura.length ? `<section><div class="h"><h2>Trazidas das faturas</h2><small>${pd.lotesFatura.length}</small></div>
        <div class="fs">Confirmar tira daqui. Desfazer apaga as compras que vieram desse lote e solta as linhas da fatura.</div>
        ${pd.lotesFatura.map((x) => `<div class="apl"><div><b>${this._e(x.nome)}: ${x.criadas} ${x.criadas === 1 ? "compra" : "compras"}</b> · ${this._brl(x.total)}${x.ligadas ? ` · ${x.ligadas} ligadas a compras que já existiam` : ""}<div class="fs">${this._dataCurta(x.em)}</div></div>
          <span><button class="btn prim" data-a="v2-lote" data-k="${this._e(x.id)}" data-d="ok">✓ Confirmar</button><button class="btn" data-a="v2-lote" data-k="${this._e(x.id)}" data-d="desfazer">Desfazer</button></span></div>`).join("")}</section>` : "",
      pd.lojasClassificar ? `<section><div class="h"><h2>Lojas para classificar</h2><small>${pd.lojasClassificar}</small></div>
        <div class="fs">Compras das faturas que ainda não têm área. Escolha uma vez por loja; as próximas já entram certas.</div>
        <div><button class="btn prim" data-a="v2-classif">Classificar</button></div></section>` : "",
    ].join("");
    if (!blocos) return html;
    const tpl = document.createElement("template");
    tpl.innerHTML = html;
    const fh = tpl.content.querySelector("dialog > .fh");
    if (!fh) return html;
    fh.insertAdjacentHTML("afterend", blocos);
    tpl.content.querySelector("dialog > .vazio")?.remove();
    return tpl.innerHTML;
  }

  _v2FolhaImp() {
    const P = this._v2Imp, fechar = `<button class="v-ib" data-a="fechar" aria-label="Fechar">${V2_SVG("fechar")}</button>`;
    const cab = `<div class="v-fh"><span class="v-ft"><b>Compras das faturas</b><small>prévia · nada é gravado sem você tocar em Trazer</small></span>${fechar}</div>`;
    const aviso = this._aviso ? `<div class="aviso" role="status">${this._e(this._aviso)}</div>` : "";
    if (P.carregando) return `${cab}<div class="v-vazio">Lendo as faturas…</div>`;
    if (!P.cartoes?.length) return `${cab}${aviso}<div class="v-vazio">Nada para trazer: todas as compras das faturas já estão no calendário.</div>`;
    const cartoes = this._fFin?.cartoes || [];
    const bloco = (x) => {
      const k = cartoes.find((y) => y.id === x.cartao), c = k ? this._finCartaoCor(k) : { fundo: "#334155", tinta: "#fff" };
      const quem = Object.entries(x.pessoas || {}).map(([p, n]) => `<i style="background:${this._cor(p)}"></i>${this._e(p)} ${n}`).join(" · ");
      const linha = (a) => `<div class="v-it v-imp-l"><span class="v-data"><b>${a.data.slice(8, 10)}</b>${V2_MESES[Number(a.data.slice(5, 7)) - 1].slice(0, 3)}</span>
        <span class="v-t"><b>${this._e(a.loja)}</b><small><i style="background:${this._cor(a.quem)}"></i>${this._e(a.quem || "?")} · ${a.a_classificar ? "a classificar" : this._e(a.area + (a.sub ? ` › ${a.sub}` : ""))}${a.estorno ? " · com estorno" : ""}</small></span>
        <span class="v-val">${this._brl(a.total)}${a.n > 1 ? `<small class="v-tag">${a.n}x</small>` : ""}</span></div>`;
      return `<div class="v-imp">
        <div class="v-fh"><span class="v-logo" style="background:${c.fundo};color:${c.tinta};box-shadow:inset 0 0 0 1px rgba(127,127,127,.35)">${this._e(x.nome)}</span>
          <span class="v-ft"><b>${this._e(x.nome)}${x.produto ? ` · ${this._e(x.produto)}` : ""}</b><small>${quem}</small></span></div>
        <dl class="v-dl">
          <dt>Novas no calendário</dt><dd><b>${x.criar}</b> · ${this._brl(x.total)}</dd>
          ${x.parceladas ? `<dt>Parceladas</dt><dd>${x.parceladas} (uma vez, no dia da compra)</dd>` : ""}
          ${x.tarifas ? `<dt>Anuidade, IOF e juros</dt><dd>${x.tarifas} (área Banco)</dd>` : ""}
          ${x.a_classificar ? `<dt>Sem área</dt><dd>${x.a_classificar} (vão para "Lojas para classificar")</dd>` : ""}
          ${x.ligar ? `<dt>Ligadas a compras que já existem</dt><dd>${x.ligar}</dd>` : ""}
          ${x.estornadas ? `<dt>Estornadas inteiras</dt><dd>${x.estornadas} (não entram)</dd>` : ""}
        </dl>
        ${x.confira?.length ? `<div class="v-falta">${V2_SVG("alerta")}<span><b>Confira ${x.confira.length === 1 ? "esta" : `estas ${x.confira.length}`}:</b> ${x.confira.map((y) => `${this._e(y.descricao)} (${y.n > 1 ? `${y.n}x, ` : ""}${this._brl(y.total)}) parece ${this._e(y.loja || "")}`).join("; ")}. Não serão trazidas; ajuste a compra que já existe.</span></div>` : ""}
        <button class="btn prim v-paguei" data-a="v2-imp-trazer" data-k="${this._e(x.cartao)}" ${P.enviando ? "disabled" : ""}>${P.enviando === x.cartao ? "Trazendo…" : `Trazer ${x.criar} ${x.criar === 1 ? "compra" : "compras"} do ${this._e(x.nome)}`}</button>
        <details class="v-mais-det"><summary>Ver as compras (${Math.min(x.criar, x.amostra.length)} mais recentes${x.criar > x.amostra.length ? ` de ${x.criar}` : ""})</summary><div class="v-lista">${x.amostra.map(linha).join("")}</div></details>
        ${x.ligacoes?.length ? `<details class="v-mais-det"><summary>Ligadas a compras que já existem (${x.ligacoes.length})</summary><div class="fs">${x.ligacoes.map((y) => `${this._dataCurta(y.data + "T12:00")} · ${this._e(y.descricao)} → ${this._e(y.loja || "")}`).join("<br>")}</div></details>` : ""}
      </div>`;
    };
    return `${cab}${aviso}<div class="v-grande">${P.criar} compras<small> · ${this._brl(P.total)}</small></div>
      <div class="fs">Cada compra entra uma vez, no dia em que foi feita (a parcelada com o total). Pessoa pelo final do cartão. Depois de trazer, o lote fica no sino com Confirmar e Desfazer.</div>
      ${P.cartoes.map(bloco).join("")}`;
  }

  _v2FolhaClassif() {
    const L = this._v2Classif, fechar = `<button class="v-ib" data-a="fechar" aria-label="Fechar">${V2_SVG("fechar")}</button>`;
    const cab = `<div class="v-fh"><span class="v-ft"><b>Lojas para classificar</b><small>uma vez por loja; vale para as compras dela e as próximas</small></span>${fechar}</div>`;
    const aviso = this._aviso ? `<div class="aviso" role="status">${this._e(this._aviso)}</div>` : "";
    if (L.carregando) return `${cab}<div class="v-vazio">Carregando…</div>`;
    if (!L.lojas?.length) return `${cab}${aviso}<div class="v-vazio">Tudo classificado.</div>`;
    const arv = (L.arvore || []).filter((a) => a.nome !== "Outros");
    return `${cab}${aviso}<div class="v-lista">${L.lojas.slice(0, 60).map((x, i) => `<div class="v-cl">
      <div class="v-t"><b>${this._e(x.loja)}</b><small>${this._e(x.descricao)} · ${x.n} ${x.n === 1 ? "compra" : "compras"} · ${this._brl(x.total)} · ${this._e(x.quem.join(", "))}</small></div>
      <div class="v-cl-campos">
        <select id="cl-a-${i}" class="v-cl-area" data-i="${i}" aria-label="Área"><option value="">Área…</option>${arv.map((a) => `<option>${this._e(a.nome)}</option>`).join("")}</select>
        <select id="cl-s-${i}" aria-label="Subcategoria" hidden></select>
        <input id="cl-n-${i}" type="text" maxlength="40" placeholder="Nome (opcional)" aria-label="Nome para mostrar (opcional)" autocomplete="off">
        <button class="btn prim" data-a="v2-classif-salvar" data-k="${this._e(x.chave)}" data-i="${i}">Salvar</button>
      </div></div>`).join("")}</div>
      ${L.lojas.length > 60 ? `<div class="fs">Mostrando 60 de ${L.lojas.length} lojas. As outras aparecem conforme estas forem saindo.</div>` : ""}`;
  }

  _ocupado() { return super._ocupado() || !!(this._v2Imp || this._v2Classif); }

  async _v2ImpCarregar() {
    try { this._v2Imp = await this._api({ acao: "faturas_previa", amostra: 80 }); } catch (e) { this._v2Imp = { cartoes: [] }; this._aviso = "⚠ " + (e.message || e); }
    this._render();
  }
  async _v2ClassifCarregar() {
    try { this._v2Classif = await this._api({ acao: "faturas_lojas" }); } catch (e) { this._v2Classif = { lojas: [] }; this._aviso = "⚠ " + (e.message || e); }
    this._render();
  }

  _folha() {
    if (this._v2Imp) return `<dialog class="folha v2f v2larga" aria-label="Compras das faturas">${this._v2FolhaImp()}</dialog>`;
    if (this._v2Classif) return `<dialog class="folha v2f v2larga" aria-label="Lojas para classificar">${this._v2FolhaClassif()}</dialog>`;
    if (this._aberta && !this._nota && !this._novo && !this._up) {
      if (this._v2Largo && this._v2Aba === "inicio") return "";  // no computador abre no painel ao lado
      return `<dialog class="folha v2f" aria-label="Compra">${this._v2Compra()}</dialog>`;
    }
    if (this._v2Cart && !this._fConta && !this._aberta && !this._fConf && !this._novo && !this._up) {  // faturas do cartão no período
      if (this._v2Largo && this._v2Aba === "inicio") return "";
      return `<dialog class="folha v2f" aria-label="Faturas do cartão">${this._v2CartLista()}</dialog>`;
    }
    if (this._fConta && !this._aberta && !this._fConf && !this._novo && !this._up) {  // conta ou fatura: o mesmo formato da compra
      if (this._v2Largo && this._v2Aba === "inicio") return "";
      return `<dialog class="folha v2f" aria-label="Conta">${this._v2Conta()}</dialog>`;
    }
    return super._folha();
  }

  // conta da casa (luz, água, internet, IPTU) ou fatura do cartão em três partes: Resumo · Conta/Compras · Editar.
  // A forma de pagamento da conta não é guardada hoje: só quando foi paga.
  _v2Conta() {
    const F = this._fFin, x = this._finObrigacoes().find((y) => y.id === this._fConta), vista = this._v2Vista || "resumo";
    const fechar = `<button class="v-ib" data-a="fechar" aria-label="Fechar">${V2_SVG("fechar")}</button>`;
    if (!x) return `<div class="v-fh"><span class="v-ft"><b>Conta</b></span>${fechar}</div><div class="v-vazio">Conta não encontrada.</div>`;
    const hoje = F.hoje, pg = x.pago, largada = pg?.via === "antes do controle", fat = x.tipo === "fatura";
    const k = fat ? (F.cartoes || []).find((c) => c.id === x.cartao) : null;
    const dc = (d) => this._dataCurta(String(d).slice(0, 10) + "T12:00");
    const dias = Math.round((new Date(x.vence + "T12:00") - new Date(hoje + "T12:00")) / 864e5);
    const situ = pg ? (largada ? "Paga (antes do controle, sem o dia exato)" : `Paga em ${this._finQuando(pg.em)}`)
      : x.vence < hoje ? `Atrasada · venceu ${dc(x.vence)}` : x.vence === hoje ? "Vence hoje" : dias === 1 ? "Vence amanhã" : `Vence em ${dias} dias`;
    const tom = pg ? "ok" : x.vence <= hoje ? "urg" : "";
    const multa = !!(pg && x.fonte === "recorrente" && x.faixas && x.total > x.faixas.valor + 0.009);
    let logo;
    if (k) { const c = this._finCartaoCor(k); logo = `<span class="v-logo g" style="background:${c.fundo};color:${c.tinta};box-shadow:inset 0 0 0 1px rgba(127,127,127,.35)" aria-hidden="true"></span>`; }
    else logo = this._v2Logo({ conta: x }, x.categoria, true);
    const nome = k?.visual?.produto ? `${x.nome} · ${k.visual.produto}` : x.nome;
    const sub = fat ? `fecha ${dc(x.fecha)} · vence ${dc(x.vence)}` : `ref. ${this._e(x.referencia || "")} · ${this._e(x.fonte_txt || "")}`;
    const cab = `<div class="v-fh">${logo}<span class="v-ft"><b>${this._e(nome)}</b><small>${sub}</small></span>${fechar}</div>
      <div class="v-grande">${this._brl(x.total)}</div>${pg ? "" : `<div class="v-situ ${tom}">${situ}</div>`}`;  // paga: a data já está em Pagamento
    const abas = `<div class="v-seg v-segf" role="tablist">${[["resumo", "Resumo"], ["nota", fat ? "Compras" : "Conta"], ["editar", "Editar"]].map(([v, t]) => `<button role="tab" class="${vista === v ? "on" : ""}" aria-selected="${vista === v}" data-a="v2-vista" data-k="${v}">${t}</button>`).join("")}</div>`;
    const aviso = this._aviso ? `<div class="aviso" role="status">${this._e(this._aviso)}</div>` : "";
    const paguei = pg ? "" : `<button class="btn prim v-paguei" data-a="f-pagar" data-k="${this._e(x.id)}">✓ Paguei ${fat ? "esta fatura" : "esta conta"}</button>`;
    let corpo;
    if (vista === "resumo") {
      const itens = x.itens || [];
      const linhas = [
        ["Quem", `<i style="background:${this._cor(x.quem)}"></i>${this._e(x.quem || "—")}`],
        fat ? ["Cartão", this._e(`${k?.nome || x.cartao}${k?.bandeira ? ` · ${k.bandeira}` : ""}`)]
          : ["Área", `<i style="background:${this._finInfo(x.categoria).cor}"></i>${this._e(x.categoria)}${x.subcategoria ? ` › ${this._e(x.subcategoria)}` : ""}`],
        ["Vencimento", dc(x.vence)],
        ["Pagamento", pg ? (largada ? "antes do controle" : `${this._finQuando(pg.em)}${pg.valor != null && Math.abs(pg.valor - x.total) > 0.009 ? ` · ${this._brl(pg.valor)}` : ""}`) : "ainda não"],
        x.fonte === "parcelada" ? ["Parcela", `${x.parcela || ""} de ${x.de || ""}`] : null,
        // preço com prazo (internet): a pagar mostra os dois valores; paga no prazo não precisa; paga com o valor maior explica
        x.fonte === "recorrente" && x.faixas && !pg ? ["Valor", `${this._brl(x.faixas.valor)} até ${dc(x.faixas.ate)} · depois ${this._brl(x.faixas.depois)}`] : null,
        multa ? ["Por quê", `paga depois de ${dc(x.faixas.ate)}: até lá seria ${this._brl(x.faixas.valor)}`] : null,
        x.fonte === "agua" && x.agua ? ["Consumo", `${x.agua.m3 ?? "—"} m³${x.agua.dias ? ` em ${x.agua.dias} dias` : ""}${x.agua.medio != null ? ` (normal ${x.agua.medio} m³)` : ""}`] : null,
        x.fonte === "luz_pdf" && x.luz?.consumo_kwh != null ? ["Consumo", `${x.luz.consumo_kwh} kWh${x.luz.dias ? ` em ${x.luz.dias} dias` : ""}${x.luz.bandeira ? ` · bandeira ${x.luz.bandeira.toLowerCase()}` : ""}`] : null,
        fat ? ["Compras", `${itens.length} ${itens.length === 1 ? "lançada" : "lançadas"}${x.banco ? " · conferida com o banco" : ""}`] : null,
      ].filter(Boolean);
      corpo = `${paguei}<dl class="v-dl">${linhas.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join("")}</dl>`;
    } else if (vista === "nota") {
      const linha = (a, b) => `<div class="it"><span class="ds">${a}</span><span class="vt">${b}</span></div>`;
      const corpoNota = fat
        ? ((x.itens || []).length ? (x.itens || []).map((i) => `${linha(this._e(i.loja), this._brl(i.valor))}<div class="it q"><span>${dc(i.data)} · ${this._e(i.quem || "")}${i.de > 1 ? ` · parcela ${i.parcela}/${i.de}` : ""}</span><span></span></div>`).join("")
          : `<div class="c">Nenhuma compra lançada nesta fatura${x.banco ? " (valor lido do banco)" : ""}.</div>`)
        : [linha("Referência", this._e(x.referencia || "")), linha("Vencimento", dc(x.vence)),
          x.fonte === "recorrente" && x.faixas && !pg ? linha(`Até ${dc(x.faixas.ate)}`, this._brl(x.faixas.valor)) + linha("Depois", this._brl(x.faixas.depois)) : "",
          multa ? linha(`Pago depois de ${dc(x.faixas.ate)}`, this._brl(x.total)) + linha("No prazo seria", this._brl(x.faixas.valor)) : "",
          x.fonte === "agua" && x.agua ? linha("Consumo", `${x.agua.m3 ?? "—"} m³`) : "", x.fonte === "luz_pdf" && x.luz?.consumo_kwh != null ? linha("Consumo", `${x.luz.consumo_kwh} kWh`) : "", x.fonte === "parcelada" ? linha("Parcela", `${x.parcela} de ${x.de}`) : ""].join("");
      corpo = `<div class="recibo"><div class="c"><b>${this._e(nome.toUpperCase())}</b><br>${fat ? sub : `${this._e(x.fonte_txt || "")} · ${this._e(x.categoria)}`}</div><hr>${corpoNota}<hr>
        <div class="tot"><span>TOTAL</span><span>${this._brl(x.total)}</span></div>
        <div class="c">${pg ? (largada ? "PAGA ANTES DO CONTROLE" : `PAGA EM ${this._finQuando(pg.em)}`) : x.vence < hoje ? "EM ATRASO" : "A PAGAR"}</div></div>`;
    } else {
      // em Editar, a conta já paga mostra a correção (data, hora, "não paguei") sem precisar ligar o modo de correção
      const tpl = document.createElement("template"), antes = this._fCorrigir;
      if (this._hass?.user?.is_admin) this._fCorrigir = true;
      tpl.innerHTML = super._folha();
      this._fCorrigir = antes;
      const dlg = tpl.content.querySelector("dialog");
      dlg?.querySelectorAll(".fh, .aviso").forEach((el) => el.remove());
      corpo = `<div class="v-parte v-ed">${dlg ? dlg.innerHTML : ""}</div>`;
    }
    return `${cab}${abas}${aviso}${corpo}`;
  }

  // as partes de editar e de nota vêm da janela do card atual (mesmos campos, botões e regras)
  _v2Partes() {
    const tpl = document.createElement("template");
    tpl.innerHTML = super._folha();
    const dlg = tpl.content.querySelector("dialog");
    if (!dlg) return { editar: "", nota: "" };
    const tira = (sel) => [...dlg.querySelectorAll(sel)].map((el) => { el.remove(); if (el.tagName === "DETAILS") el.setAttribute("open", ""); return el.outerHTML; }).join("");
    tira(".fh"); tira(".aviso");
    const editar = tira(".pagocom") + tira(".cobr") + tira("details.editar");
    return { editar, nota: dlg.innerHTML };
  }

  _v2Compra() {
    const c = this._aberta, vista = this._v2Vista || "resumo";
    const area = c.categoria || "Outros", info = this._finInfo(area);
    const quando = this._dia(c.data_compra || c.emissao);
    const dt = new Date(c.data_compra || c.emissao);
    const diaTxt = isNaN(dt) ? "" : `${V2_SEMANA[dt.getDay()]}, ${dt.getDate()} de ${V2_MESES[dt.getMonth()]}${c.data_compra ? "" : ` · ${quando.hora}`}`;
    const valor = this._semReal(c) ? this._moeda(c.moeda) : this._brl(c.cobrado?.valor ?? c.valor_pago);
    const cab = `<div class="v-fh">${this._v2Logo(c, area, true)}<span class="v-ft"><b>${this._e(c.loja_curta)}</b><small>${diaTxt}${c.loja?.cidade ? ` · ${this._e(c.loja.cidade)}` : ""}</small></span>
      <button class="v-ib" data-a="fechar" aria-label="Fechar">${V2_SVG("fechar")}</button></div>
      <div class="v-grande">${valor}</div>${c.cobrado ? `<div class="v-nota-v">nota ${this._brl(c.valor_pago)} · ${this._e((c.cobrado.motivo || "").toLowerCase())}</div>` : ""}`;
    const abas = `<div class="v-seg v-segf" role="tablist">${[["resumo", "Resumo"], ["nota", "Nota"], ["editar", "Editar"]].map(([k, t]) => `<button role="tab" class="${vista === k ? "on" : ""}" aria-selected="${vista === k}" data-a="v2-vista" data-k="${k}">${t}</button>`).join("")}</div>`;
    const aviso = this._aviso ? `<div class="aviso" role="status">${this._e(this._aviso)}</div>` : "";
    if (c.carregando) return `${cab}${abas}<div class="v-vazio">Abrindo a compra…</div>`;
    let corpo;
    if (vista === "resumo") {
      const pg = (c.pago_com || []).map((p) => this._pagNome(p)).join(" + ");
      const r = c.reembolso?.status;
      const linhas = [
        ["Quem", `<i style="background:${this._cor(c.quem)}"></i>${this._e(c.quem || "—")}${r === "a_reembolsar" ? ` <span class="v-tag alerta">a reembolsar</span>` : r === "pago" ? ` <span class="v-tag ok">reembolsado</span>` : ""}`],
        ["Área", `<i style="background:${info.cor}"></i>${this._e(this._classe(c))}`],
        ["Pagamento", this._e(pg || "não informado")],
        c.fatura_txt ? ["Entra na", this._e(c.fatura_txt[0].toUpperCase() + c.fatura_txt.slice(1))] : null,
        c.origem !== "manual" && c.qtd_itens ? ["Nota", `${c.qtd_itens} ${c.qtd_itens === 1 ? "item" : "itens"}`] : null,
      ].filter(Boolean);
      const falta = (c.pago_com || []).some((p) => !p.tipo) || (c.pago_com || []).some((p) => p.tipo === "Crédito" && !p.cartao && (c.cartoes || []).length);
      corpo = `<dl class="v-dl">${linhas.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join("")}</dl>
        ${falta ? `<button class="v-falta" data-a="v2-vista" data-k="editar">${V2_SVG("alerta")}<span>Falta dizer a forma de pagamento ou o cartão. <b>Completar ›</b></span></button>` : ""}`;
    } else {
      const p = this._v2Partes();
      corpo = vista === "nota" ? (c.via === "fatura" ? this._v2NotaFatura(c) : `<div class="v-parte">${p.nota}</div>`) : `<div class="v-parte v-ed">${p.editar}</div>`;
    }
    return `${cab}${abas}${aviso}${corpo}`;
  }

  // ---------------------------------------------------------------- eventos
  _ligar() {
    const dlg = this.shadowRoot.querySelector("dialog.folha");
    if (dlg && (this._v2Imp || this._v2Classif)) {  // Esc fecha a prévia e a lista de lojas (o card atual não conhece essas janelas)
      dlg.addEventListener("cancel", () => { if (!this._v2Imp?.enviando) { this._v2Imp = null; this._v2Classif = null; this._aviso = null; } });
    }
    super._ligar();
    this.shadowRoot.querySelectorAll(".v-cl-area").forEach((sel) => sel.addEventListener("change", () => {
      const i = sel.dataset.i, sub = this.shadowRoot.getElementById(`cl-s-${i}`);
      const ramo = (this._v2Classif?.arvore || []).find((a) => a.nome === sel.value);
      const subs = ramo && !ramo.pelos_itens ? ramo.subs || [] : [];
      sub.innerHTML = subs.map((s) => `<option>${this._e(s)}</option>`).join("");
      sub.hidden = !subs.length;
    }));
    if (this._v2Largo) requestAnimationFrame(() => this._v2Alinhar());
    if (this._v2Mais || this._v2Per) {  // menu do + e escolha do período fecham ao tocar fora deles
      const fora = (ev) => { if (!ev.composedPath().some((n) => n.classList?.contains("v-maisw") || n.classList?.contains("v-perw"))) { this._v2Mais = false; this._v2Per = false; this._render(); } };
      this.shadowRoot.querySelector("ha-card")?.addEventListener("click", fora);
    }
  }

  async _clique(ev, el) {
    const a = el.getAttribute("data-a"), k = el.getAttribute("data-k");
    const comoAba = (velha) => super._clique(ev, { getAttribute: (x) => (x === "data-a" ? "aba" : velha) });
    if (a === "v2-passo") {  // "Vamos começar": abre a ⚙ já no cadastro do passo
      this._v2AntesCfg = "inicio"; this._v2Aba = "config"; this._aberta = null; this._v2Vista = null; this._v2Cart = null; this._fConta = null;
      this._fCfgGrupo = k;
      if (k === "pessoas" && !(this._dados?.pessoas || []).length) this._fPesEd = "novo";
      if (k === "cartoes" && !(this._fFin?.cartoes || []).length) this._fCartEd = "novo";
      this._aviso = null; this._render(); return;
    }
    if (a === "v2-config") {  // tocar de novo volta para a aba de antes
      if (this._v2Aba === "config") this._v2Aba = this._v2AntesCfg || "inicio";
      else { this._v2AntesCfg = this._v2Aba; this._v2Aba = "config"; this._aberta = null; this._v2Vista = null; this._v2Cart = null; this._fConta = null; }
      this._v2Mais = false; this._v2Per = false; this._aviso = null; this._render(); return;
    }
    if (a === "v2-aba") {
      this._v2Aba = k; this._v2Mais = false;
      if (k !== "inicio") { this._aberta = null; this._v2Vista = null; this._v2Cart = null; }
      return comoAba({ inicio: "resumo", contas: "pagar", gastos: "areas", produtos: "produtos" }[k]);
    }
    const periodo = (modo, campo, v) => {
      this._fModo = modo; if (campo) this[campo] = v;
      this._v2Per = false; this._v2PerAno = null; this._v2Dia = null; this._v2Cart = null; this._v2Lim = null; this._fAberta = null; this._aviso = null;
      this._render();
    };
    if (a === "v2-per") { this._v2Per = !this._v2Per; this._v2PerAno = null; this._v2PerVista = null; this._v2Mais = false; this._render(); return; }
    if (a === "v2-per-vista") { this._v2PerVista = k; this._render(); return; }
    if (a === "v2-per-ano") { const at = this._v2PerAno || (this._fModo === "ano" ? this._fAno : this._mes.slice(0, 4)); this._v2PerAno = String(Number(at) + Number(k)); this._render(); return; }
    if (a === "v2-per-mes") return periodo("mes", "_mes", k);
    if (a === "v2-per-anoint") return periodo("ano", "_fAno", k);
    if (a === "v2-per-tudo") return periodo("tudo");
    if (a === "v2-ano-passo") return periodo("ano", "_fAno", String(Number(this._fAno) + Number(k)));
    if (a === "f-mes" || a === "f-vai-mes" || a === "f-vai-ano") { this._v2Dia = null; this._v2Lim = null; }
    if (a === "f-dia" && this._v2Aba === "inicio") {  // mostra as compras do dia embaixo e rola a tela até elas
      this._v2Dia = this._v2Dia === k ? null : k;
      this._render();
      if (this._v2Dia) {
        const calmo = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        // rola só o necessário para as compras do dia aparecerem inteiras (o calendário continua à vista em cima)
        requestAnimationFrame(() => [...(this.shadowRoot?.querySelectorAll(".v-cal ~ .v-lista, .v-cal ~ .v-vazio") || [])].pop()
          ?.scrollIntoView({ behavior: calmo ? "auto" : "smooth", block: "nearest" }));
      }
      return;
    }
    if (a === "v2-dia") { this._v2Dia = k || null; this._render(); return; }
    if (a === "v2-cal") { this._v2Cal = !this._v2Cal; this._v2Dia = null; this._render(); return; }
    if (a === "v2-deve") {  // abre o sino já no bloco de quem pagou do bolso
      this._aberta = null; this._qr = null; this._nota = null; this._fConta = null; this._fPgEd = null; this._v2Cart = null; this._v2Vista = null;
      this._avisosAberto = true; this._render();
      setTimeout(() => this.shadowRoot?.querySelector("dialog .reemb")?.scrollIntoView({ block: "start" }), 60);
      return;
    }
    if (a === "v2-reemb") { this._v2Reemb = !this._v2Reemb; this._render(); return; }
    if (a === "v2-area") { this._v2Area = k || null; this._v2Lim = null; this._render(); return; }
    if (a === "v2-areas-todas") { this._v2AreasTodas = !this._v2AreasTodas; this._render(); return; }
    if (a === "v2-lim") { this._v2Lim = (this._v2Lim || 80) + 80; this._render(); return; }
    if (a === "v2-mais") { this._v2Mais = !this._v2Mais; this._v2Per = false; this._render(); return; }
    if (a === "v2-vista") { this._v2Vista = k; this._aviso = null; this._render(); return; }
    if (["novo", "upload", "recarregar"].includes(a)) this._v2Mais = false;
    if (a === "v2-imp") { this._avisosAberto = false; this._v2Imp = { carregando: true }; this._aviso = null; this._render(); this._v2ImpCarregar(); return; }
    if (a === "v2-imp-trazer") {
      if (this._v2Imp?.enviando) return;
      this._v2Imp = { ...this._v2Imp, enviando: k }; this._render();
      try { this._aviso = (await this._api({ acao: "faturas_importar", cartao: k })).mensagem; } catch (e) { this._aviso = "⚠ " + (e.message || e); }
      this._v2Imp = { ...this._v2Imp, enviando: null };
      await this._carregar(true);
      this._v2ImpCarregar();
      return;
    }
    if (a === "v2-qcart") {  // sino › Débito: qual cartão?
      await this._acao({ acao: "editar", id: el.getAttribute("data-id"), cartao: { i: Number(el.getAttribute("data-i")), cartao: k } }, "Cartão escolhido.");
      if (this._fFin) { try { this._fFin = await this._api({ acao: "financeiro" }); } catch (e) { /* a lista já mostrou o aviso */ } this._render(); }
      return;
    }
    if (a === "v2-final") {
      await this._acao({ acao: "final_cartao", cartao: k, final: el.getAttribute("data-f"), decisao: el.getAttribute("data-d") });
      if (this._fFin) { try { this._fFin = await this._api({ acao: "financeiro" }); } catch (e) { /* a lista já mostrou o aviso */ } this._render(); }
      return;
    }
    if (a === "v2-lote") { await this._acao({ acao: "faturas_lote", id: k, decisao: el.getAttribute("data-d") }); return; }
    if (a === "v2-classif") { this._avisosAberto = false; this._v2Classif = { carregando: true }; this._aviso = null; this._render(); this._v2ClassifCarregar(); return; }
    if (a === "v2-classif-salvar") {
      const i = el.getAttribute("data-i"), campo = (id) => this.shadowRoot.getElementById(id), sub = campo(`cl-s-${i}`);
      const cat = campo(`cl-a-${i}`)?.value;
      if (!cat) { this._aviso = "Escolha a área."; this._render(); return; }
      try {
        this._aviso = (await this._api({ acao: "faturas_classificar", chave: k, categoria: cat, subcategoria: sub && !sub.hidden ? sub.value : null, nome: campo(`cl-n-${i}`)?.value || "" })).mensagem;
      } catch (e) { this._aviso = "⚠ " + (e.message || e); }
      await this._carregar(true);
      this._v2ClassifCarregar();
      return;
    }
    if (a === "fechar" && (this._v2Imp || this._v2Classif)) {
      if (this._v2Imp?.enviando) return;
      this._v2Imp = null; this._v2Classif = null; this._aviso = null; this._render(); return;
    }
    if (a === "v2-cart") { if (Date.now() - (this._fArrastou || 0) < 400) return; this._v2Cart = k; this._aberta = null; this._fConta = null; this._v2Vista = null; this._render(); return; }
    if (a === "fechar" && this._v2Cart && !this._fConta && !this._aberta && !this._nota && !this._fConf) { this._v2Cart = null; this._render(); return; }
    // sino: a compra/conta aberta no painel ao lado tinha prioridade e os avisos ficavam abertos sem aparecer
    if (a === "avisos") { this._aberta = null; this._qr = null; this._nota = null; this._fConta = null; this._fPgEd = null; this._v2Cart = null; this._v2Vista = null; }
    if (a === "abrir") { this._v2Cart = null; this._fConta = null; if (this._aberta?.id !== el.getAttribute("data-id")) this._v2Vista = null; }
    if (a === "f-conta" && Date.now() - (this._fArrastou || 0) >= 400) { this._aberta = null; if (this._fConta !== k) this._v2Vista = null; }
    if (a === "fechar" && ((this._aberta && !this._nota) || (this._fConta && !this._fConf))) this._v2Vista = null;
    return super._clique(ev, el);
  }

  // ---------------------------------------------------------------- estilo
  _v2Css() {
    return `
    :host{display:block}
    ha-card.v2{padding:0;display:block;--v-bloco:color-mix(in srgb,var(--c-txt) 4%,var(--c-fundo));--v-r:16px;font-size:14px}
    .v-ic{width:22px;height:22px;fill:currentColor;flex:none}
    .v-topo{display:grid;grid-template-columns:1fr auto;gap:10px 8px;align-items:center;padding:14px 16px 4px}
    .v-mes{display:flex;align-items:center;gap:2px;min-width:0}
    .v-perw{position:relative}
    .v-per{border:0;background:none;text-align:left;cursor:pointer;padding:2px 6px;border-radius:10px;min-height:44px;display:grid;align-content:center}
    .v-per:hover{background:var(--v-bloco)}
    .v-per small{font-size:12px;font-weight:500;color:var(--c-sub)}
    .v-per span{display:flex;align-items:center;gap:2px;font-size:21px;font-weight:700;letter-spacing:-.3px;line-height:1.15;white-space:nowrap}
    .v-per span .v-ic{width:18px;height:18px;color:var(--c-sub)}
    .v-pop{position:absolute;left:0;top:calc(100% + 6px);z-index:6;width:min(290px,calc(100vw - 48px));background:var(--c-fundo);border:1px solid var(--c-linha);border-radius:16px;padding:12px;box-shadow:0 8px 24px rgba(0,0,0,.2);display:grid;gap:10px;box-sizing:border-box}
    .v-pop button{border:0;background:none;cursor:pointer;border-radius:10px;font-weight:600;font-size:14px;color:var(--c-txt)}
    .v-pop button:disabled{opacity:.3;cursor:default}
    .v-pop-ano{display:flex;align-items:center;justify-content:space-between}
    .v-pop-ano b{font-size:16px}
    .v-pop-ano button{width:44px;height:40px;display:grid;place-items:center}
    .v-pop-meses{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
    .v-pop-meses button{min-height:44px;color:var(--c-sub);text-transform:capitalize}
    .v-pop-meses button.tem{color:var(--c-txt);background:var(--v-bloco)}
    .v-pop-meses button.on{background:var(--c-txt);color:var(--c-fundo)}
    .v-pop-seg{display:flex;gap:4px;padding:3px;border-radius:12px;background:var(--v-bloco)}
    .v-pop-seg button{flex:1;min-height:36px;color:var(--c-sub)}
    .v-pop-seg button.on{background:var(--c-fundo);color:var(--c-txt);box-shadow:0 1px 3px rgba(0,0,0,.12)}
    .v-pop-anos{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
    .v-pop-anos button{min-height:52px;display:grid;align-content:center;gap:1px;background:var(--v-bloco)}
    .v-pop-anos small{font-size:11px;font-weight:500;color:var(--c-sub)}
    .v-pop-anos button.on{background:var(--c-txt);color:var(--c-fundo)}
    .v-pop-anos button.on small{color:var(--c-fundo);opacity:.8}
    .v-filtros{display:flex;align-items:flex-start;gap:8px}
    .v-filtros .v-chips{flex:1;min-width:0}
    .v-vista-ic{width:40px;height:36px;border:0;background:none;border-radius:10px;display:grid;place-items:center;color:var(--c-sub);cursor:pointer;opacity:.7;flex:none}
    .v-vista-ic:hover{opacity:1;background:var(--v-bloco)}
    .v-vista-ic .v-ic{width:20px;height:20px}
    .v-cal .fcard{border:0;padding:0;background:none;box-shadow:none}
    .v-cal .n1{background:color-mix(in srgb,var(--c-acc) 35%,transparent)}
    .v-cal .n2{background:color-mix(in srgb,var(--c-acc) 65%,transparent)}
    .v-cal .n3{background:var(--c-acc)}
    .v-trilha{display:flex;flex-wrap:wrap;align-items:center;gap:2px;font-size:13px;color:var(--c-sub);margin-bottom:2px}
    .v-trilha button{border:0;background:none;color:var(--c-acc);font-weight:600;font-size:13px;cursor:pointer;padding:4px 2px;min-height:28px}
    .v-trilha b{color:var(--c-txt);font-weight:600;padding:4px 2px}
    .v-cal ~ .v-lista{scroll-margin-bottom:24px}
    .v-dica0{font-size:12px;color:var(--c-sub)}
    .v-anos{display:flex;align-items:stretch;gap:8px;height:260px;background:var(--v-bloco);border-radius:var(--v-r);padding:14px 12px 10px;box-sizing:border-box}
    .v-ano{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:6px;border:0;background:none;cursor:pointer;padding:0;border-radius:10px}
    .v-ano:hover .v-ano-b i{filter:brightness(1.12)}
    .v-ano small{font-size:11.5px;color:var(--c-sub);font-weight:600;white-space:nowrap}
    .v-ano b{font-size:13px;font-weight:600;color:var(--c-sub)}
    .v-ano.atual b{color:var(--c-txt)}
    .v-ano-b{flex:1;width:100%;max-width:56px;display:flex;align-items:flex-end}
    .v-ano-b i{display:block;width:100%;border-radius:8px 8px 3px 3px;background:color-mix(in srgb,var(--c-acc) 55%,transparent)}
    .v-ano.atual .v-ano-b i{background:var(--c-acc)}
    .v-ano small.curto,.v-ano .a2{display:none}
    .v-acoes{position:relative}
    .v-atual{position:absolute;right:0;top:-15px;font-size:11px;line-height:13px;color:var(--c-sub);white-space:nowrap}
    .v2.larga .v-rodape{display:none}
    @media (max-width:520px){.v-ano small.cheio{display:none}.v-ano small.curto{display:inline;font-size:10.5px}.v-anos{gap:4px;padding:12px 8px 8px}
      .muitos .v-ano .a4{display:none}.muitos .v-ano .a2{display:inline}.muitos .v-ano small.curto{font-size:10px}.muitos .mil{display:none}.muitos .v-dica0::after{content:" · valores em mil"}}
    .v-mais-itens{min-height:44px;border:1px solid var(--c-linha);background:none;border-radius:12px;font-weight:600;cursor:pointer;color:var(--c-acc)}
    .v-nota-p{font-size:12px;color:var(--c-sub);text-align:center;margin-top:-6px}
    .v-pilha .fcface{padding:15px 18px}
    .v-passos{background:var(--card-background-color,#fff);border-radius:16px;padding:16px 18px;margin:0 0 18px;box-shadow:0 1px 3px rgba(0,0,0,.08)}.v-passos h2{margin:0 0 4px;font-size:18px}
    .v-passo{display:grid;grid-template-columns:30px minmax(0,1fr) auto;gap:12px;align-items:center;padding:12px 0;border-top:1px solid var(--divider-color,rgba(127,127,127,.2))}.v-passo:first-of-type{margin-top:10px}
    .v-pn{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:var(--primary-color,#0b84d8);color:#fff;font-weight:700;font-size:14px}.v-passo.ok .v-pn{background:#16a34a}
    .v-pt small{display:block;color:var(--secondary-text-color);font-size:13px}.v-passo.ok .v-pt b{color:var(--secondary-text-color)}.v-sub{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--secondary-text-color);font-weight:600;margin:16px 0 4px}
    .v-gastos .fperiodo>.fseg:not(.fdir),.v-gastos .fperiodo>.fnav,.v-gastos .fperiodo>.fdd{display:none}
    .v-seta{width:32px;height:44px;display:grid;place-items:center;border:0;background:none;border-radius:10px;cursor:pointer;color:var(--c-sub)}
    .v-seta .v-ic{width:20px;height:20px}
    .v-seta:hover{background:var(--v-bloco);color:var(--c-txt)}
    .v-abas{grid-column:1/-1;grid-row:2;display:flex;gap:4px;padding:4px;border-radius:14px;background:var(--v-bloco)}
    .v-abas button{flex:1;min-height:38px;border:0;border-radius:10px;background:none;font-weight:600;font-size:14px;color:var(--c-sub);cursor:pointer}
    .v-abas button.on{background:var(--c-txt);color:var(--c-fundo)}
    .v-acoes{display:flex;gap:8px;align-items:center}
    .v-ib{position:relative;min-width:44px;height:44px;border-radius:12px;border:1px solid var(--c-linha);background:var(--c-fundo);display:inline-flex;align-items:center;justify-content:center;gap:6px;cursor:pointer;color:var(--c-txt);padding:0 10px}
    .v-ib.on{border-color:var(--c-acc);color:var(--c-acc)}
    .v-ib b{position:absolute;top:-5px;right:-5px;min-width:19px;height:19px;border-radius:10px;background:var(--c-sobe);color:#fff;font-size:11px;display:grid;place-items:center;padding:0 5px;box-sizing:border-box}
    .v-mais{background:var(--c-acc);border-color:var(--c-acc);color:var(--text-primary-color,#fff);font-weight:600}
    .v-mais span{display:none}
    .v-maisw{position:relative}
    .v-menu{position:absolute;right:0;top:calc(100% + 6px);z-index:5;min-width:240px;background:var(--c-fundo);border:1px solid var(--c-linha);border-radius:14px;padding:6px;box-shadow:0 8px 24px rgba(0,0,0,.2);display:grid}
    .v-menu button{display:flex;gap:12px;align-items:center;text-align:left;border:0;background:none;border-radius:10px;padding:10px;cursor:pointer;min-height:48px}
    .v-menu button:hover{background:var(--v-bloco)}
    .v-menu button .v-ic{color:var(--c-acc)}
    .v-menu b{display:block;font-size:14px}
    .v-menu small{font-size:12px;color:var(--c-sub)}
    .v2 button:focus-visible{outline:2px solid var(--c-acc);outline-offset:2px}
    .v2 > .aviso,.v-inicio > .aviso{margin:8px 16px 0}

    .v-inicio{display:grid;gap:14px;padding:6px 16px 16px}
    .v-heroi{display:grid;justify-items:start;gap:2px;padding-top:8px}
    .v-rot{font-size:13px;color:var(--c-sub)}
    .v-total{font-size:40px;font-weight:800;letter-spacing:-1.2px;line-height:1.1}
    .v-total small{font-size:23px;font-weight:700;letter-spacing:-.5px}
    .v-chip{margin-top:6px;font-size:13px;font-weight:600;border-radius:999px;padding:4px 11px}
    .v-chip.sobe{color:var(--c-sobe);background:color-mix(in srgb,var(--c-sobe) 12%,transparent)}
    .v-chip.desce{color:var(--c-desce);background:color-mix(in srgb,var(--c-desce) 12%,transparent)}
    .v-pilha .fpilha{margin:0}
    .v-bloco{display:grid;gap:8px}
    .v-hd{display:flex;justify-content:space-between;align-items:baseline;gap:10px}
    .v-hd h2{font-size:12px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--c-sub);margin:0}
    .v-link{border:0;background:none;color:var(--c-acc);font-weight:600;font-size:13px;cursor:pointer;padding:6px 0;min-height:32px}
    .v-lista{background:var(--v-bloco);border-radius:var(--v-r);display:grid;overflow:hidden}
    .v-it{display:flex;align-items:center;gap:12px;padding:10px 12px;border:0;border-top:1px solid var(--c-linha);background:none;text-align:left;cursor:pointer;min-height:60px;width:100%;box-sizing:border-box}
    .v-it:first-child{border-top:0}
    .v-it:hover{background:color-mix(in srgb,var(--c-txt) 4%,transparent)}
    .v-it.sel{background:color-mix(in srgb,var(--c-acc) 12%,transparent);box-shadow:inset 3px 0 0 var(--c-acc)}
    .v-t{flex:1;min-width:0;display:grid}
    .v-t b{font-size:14.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .v-t small{font-size:12.5px;color:var(--c-sub);display:flex;align-items:center;gap:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .v-t small i{width:7px;height:7px;border-radius:50%;flex:none}
    .v-t small.urg{color:var(--c-sobe);font-weight:600}
    .v-val{font-weight:600;font-size:14.5px;text-align:right;display:grid;justify-items:end;white-space:nowrap}
    .v-tag{font-size:11px;font-weight:600;border-radius:999px;padding:1px 8px;margin-top:2px}
    .v-tag.alerta{color:var(--c-alerta);background:color-mix(in srgb,var(--c-alerta) 14%,transparent)}
    .v-tag.ok{color:var(--c-desce);background:color-mix(in srgb,var(--c-desce) 12%,transparent)}
    .v-logo{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;font-weight:800;font-size:13px;color:#fff;flex:none;letter-spacing:-.3px;text-transform:none}
    .v-logo .v-ic{width:20px;height:20px}
    .v-logo.g{width:48px;height:48px;border-radius:14px;font-size:15px}
    .v-data{width:40px;height:40px;border-radius:12px;display:grid;align-content:center;justify-items:center;line-height:1.05;flex:none;background:var(--c-fundo);border:1px solid var(--c-linha);font-size:10px;font-weight:600;text-transform:uppercase;color:var(--c-sub)}
    .v-data b{font-size:15px;color:var(--c-txt)}
    .v-data.urg{border-color:var(--c-sobe)}
    .v-data.urg b{color:var(--c-sobe)}
    .v-chips{display:flex;flex-wrap:wrap;gap:6px}
    .v-chips button{min-height:36px;display:inline-flex;align-items:center;gap:6px;border:1px solid var(--c-linha);background:none;border-radius:999px;padding:0 14px;font-weight:600;font-size:13px;color:var(--c-sub);cursor:pointer}
    .v-chips button.on{border-color:var(--c-txt);color:var(--c-txt)}
    .v-chips i{width:8px;height:8px;border-radius:50%}
    .v-dia{display:flex;justify-content:space-between;padding:6px 4px 0;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--c-sub)}
    .v-vazio{color:var(--c-sub);font-size:13px;padding:12px 4px}
    .v-vazio.grande{text-align:center;padding:28px 8px;background:var(--v-bloco);border-radius:var(--v-r);line-height:1.6}
    .v-rodape{font-size:12px;color:var(--c-sub);text-align:right;padding-top:4px}
    .v-seg{display:flex;gap:4px;padding:4px;margin:10px 16px 0;border-radius:12px;border:1px solid var(--c-linha);overflow-x:auto;scrollbar-width:none}
    .v-seg button{flex:1;min-height:36px;border:0;border-radius:9px;background:none;font-weight:600;font-size:13px;color:var(--c-sub);cursor:pointer;white-space:nowrap;padding:0 10px}
    .v-seg button.on{background:var(--v-bloco);color:var(--c-txt)}
    .v-velho{padding:14px 16px 16px;display:grid;grid-template-columns:minmax(0,1fr);gap:14px}

    /* computador: três colunas, a compra abre na da direita */
    .v2.larga .v-topo{grid-template-columns:auto 1fr auto;padding:16px 20px 8px}
    .v2.larga .v-abas{grid-column:auto;grid-row:auto;width:420px;margin-left:20px}
    .v2.larga .v-mais span{display:inline}
    .v2.larga .v-mais{padding:0 16px 0 12px}
    .v-tres{display:grid;grid-template-columns:340px minmax(0,1fr) 370px;gap:22px;padding:8px 20px 20px;align-items:start}
    .v-col{display:grid;gap:14px;min-width:0}
    .v-painel{border:1px solid var(--c-linha);border-radius:20px;padding:18px;display:grid;gap:12px;background:var(--c-fundo)}
    /* a coluna da direita acompanha a rolagem: a compra aberta (ou "Onde foi o dinheiro") fica sempre à vista,
       logo abaixo da barra do HA, mesmo depois de descer o feed */
    .v2.larga .v-tres{align-items:stretch}
    .v2.larga .v-col{align-content:start}
    .v-tres > .v-col:nth-child(3) > :first-child{position:sticky;top:calc(var(--header-height,56px) + env(safe-area-inset-top,0px) + 12px);
      max-height:calc(100vh - var(--header-height,56px) - 24px);max-height:calc(100dvh - var(--header-height,56px) - 24px);overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin}
    .v-areas{display:grid;gap:12px;background:var(--v-bloco);border-radius:var(--v-r);padding:14px}
    .v-area{display:grid;grid-template-columns:1fr auto 40px;gap:4px 10px;align-items:baseline;font-size:13.5px}
    .v-area span:first-child{display:flex;align-items:center;gap:8px;min-width:0}
    .v-area i{width:8px;height:8px;border-radius:2px;flex:none}
    .v-area small{color:var(--c-sub);text-align:right}
    .v-barra{grid-column:1/-1;height:6px;border-radius:3px;background:var(--c-linha);overflow:hidden}
    button.v-area{border:0;background:none;font:inherit;color:inherit;text-align:left;width:100%;padding:4px 0;cursor:pointer;border-radius:8px}
    button.v-area:focus-visible{outline:2px solid var(--c-acc);outline-offset:2px}
    .v-area em{font-style:normal;font-size:11.5px;font-weight:700;margin-left:4px;white-space:nowrap}
    .v-area em.sobe{color:var(--c-sobe)}.v-area em.desce{color:var(--c-desce)}
    .v-areas.filtro .v-area:not(.on):not(.v-outras){opacity:.5}.v-area.on span:first-child{font-weight:700}
    button.v-outras{color:var(--c-acc)}.v-outras span:first-child{font-weight:600}
    .v-deve{margin-top:8px;border:1px solid color-mix(in srgb,var(--c-acc) 35%,transparent);background:color-mix(in srgb,var(--c-acc) 8%,transparent);color:var(--c-txt);font:inherit;font-size:13.5px;border-radius:999px;padding:6px 14px;min-height:36px;cursor:pointer}
    .v-deve b{color:var(--c-acc)}
    .v-pg-tot{display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:0 2px}
    .v-pg-tot span{font-size:13px;color:var(--c-sub)}.v-pg-tot b{font-size:22px;font-variant-numeric:tabular-nums}
    .v-pg-tudo{display:flex;justify-content:space-between;align-items:center;gap:10px;border:0;background:none;font:inherit;font-size:13px;color:var(--c-sub);padding:8px 2px;min-height:40px;cursor:pointer;text-align:left}
    .v-pg-tudo b{color:var(--c-acc);white-space:nowrap}
    .v-barra span{display:block;height:100%;border-radius:3px}
    .v-dica{font-size:12.5px;color:var(--c-sub);text-align:center;padding:6px}

    /* janela da compra */
    .folha.v2f{gap:12px}
    .v-fh{display:flex;gap:12px;align-items:center}
    .v-ft{flex:1;min-width:0;display:grid}
    .v-ft b{font-size:16px;line-height:1.25}
    .v-ft small{font-size:13px;color:var(--c-sub)}
    .v-grande{font-size:36px;font-weight:800;letter-spacing:-1px;line-height:1.1;margin-top:4px}
    .v-nota-v{font-size:13px;color:var(--c-sub);margin-top:-8px}
    .v-segf{margin:0}
    .folha.v2larga{width:min(720px,calc(100vw - 24px))}
    .v-grande small{font-size:18px;font-weight:600;color:var(--c-sub);letter-spacing:0}
    .v-imp{display:grid;gap:10px;border:1px solid var(--c-linha);border-radius:16px;padding:14px}
    .v-imp .v-logo{font-size:12px}
    .v-imp .v-ft small{display:flex;flex-wrap:wrap;gap:4px 8px;align-items:center}
    .v-imp .v-ft small i{width:7px;height:7px;border-radius:50%;display:inline-block}
    .v-imp-l{cursor:default;min-height:52px}
    .v-mais-det>summary{cursor:pointer;color:var(--c-acc);font-weight:600;font-size:13.5px;padding:6px 0}
    .v-mais-det[open]>summary{margin-bottom:6px}
    .v-tag{color:var(--c-sub);background:var(--v-bloco)}
    .v-cl{display:grid;gap:8px;padding:12px;border-top:1px solid var(--c-linha)}
    .v-cl:first-child{border-top:0}
    .v-cl-campos{display:flex;flex-wrap:wrap;gap:8px}
    .v-cl select,.v-cl input{min-height:42px;border:1px solid var(--c-linha);border-radius:10px;background:var(--c-fundo);color:var(--c-txt);font:inherit;font-size:14px;padding:0 10px;min-width:0}
    .v-cl input{flex:1 1 140px}
    .v-cl .btn{min-height:42px}
    .v-situ{font-size:13px;font-weight:600;color:var(--c-sub);margin-top:-6px}
    .v-situ.ok{color:var(--c-desce)}
    .v-situ.urg{color:var(--c-sobe)}
    .v-paguei{min-height:48px;border-radius:14px;font-size:15px}
    .v-logo.g{font-size:12px}
    .v-dl{display:grid;grid-template-columns:auto 1fr;gap:0;margin:0;font-size:14px}
    .v-dl dt,.v-dl dd{padding:10px 0;border-top:1px solid var(--c-linha);margin:0}
    .v-dl dt{color:var(--c-sub)}
    .v-dl dd{text-align:right;font-weight:500}
    .v-dl dd i{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:7px;vertical-align:1px}
    .v-falta{display:flex;gap:10px;align-items:center;text-align:left;border:1px solid color-mix(in srgb,var(--c-alerta) 50%,transparent);background:color-mix(in srgb,var(--c-alerta) 10%,transparent);border-radius:12px;padding:10px 12px;cursor:pointer;font-size:13px}
    .v-falta .v-ic{color:var(--c-alerta);width:20px;height:20px}
    .v-falta b{color:var(--c-acc)}
    .v-botoes{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .v-botoes .btn{min-height:46px;border-radius:14px;font-size:15px}
    .v-parte{display:grid;gap:12px}
    .v-ed details.editar>summary{pointer-events:none;color:var(--c-txt);list-style:none}
    .v-ed details.editar>summary::-webkit-details-marker{display:none}
    .v-ed details.editar{border-color:var(--c-linha)}
    @media (max-width:600px){
      .folha.v2f{width:100%;max-width:100%;margin:auto 0 0;border-radius:22px 22px 0 0;max-height:92dvh;padding:10px 16px calc(18px + env(safe-area-inset-bottom,0px))}
      .folha.v2f::before{content:"";justify-self:center;width:40px;height:4px;border-radius:2px;background:var(--c-linha)}
    }
    @media (max-width:380px){.v-total{font-size:34px}.v-abas button{font-size:13px}}
    `;
  }
}

// ComprasV2Card: base do co-finance-card (não registrado como compras-v2-card)
console.info(`%c COMPRAS-V2 %c ${V2_VERSION} `, "background:#0b6bcb;color:#fff", "");


// ----- cartoes ---------------------------------------------------------------

// cartoes/base.js
// Cartões — peças comuns e o registro dos desenhos de cada banco
// Parte do CoFinance: o montar.py junta esta pasta no co-finance-card.js. Os cartões ficam deitados (380 × 240).
//
// Cada arquivo de banco registra:
//   layouts: o desenho (uma função que recebe as peças prontas — chip, aproximação, bandeira, o vidro do valor — e devolve a frente)
//   modelos: qual desenho cada modelo do catálogo usa (id do modelo → nome do layout)
//   bancos:  os bancos cujo desenho vale para todos os modelos dele que não têm desenho próprio
//   css:     o estilo das peças daquele banco

const CARTOES = { layouts: {}, modelos: {}, bancos: [], css: [], verticais: new Set(), fotosEmPe: new Set() };

// verticais: os layouts de cartão em pé (como no cartão de verdade): a frente fica em pé no CoFinance
// fotosEmPe: modelos cuja foto é de cartão em pé (a imagem foi guardada deitada): o CoFinance mostra em pé, desvirada
function registrarCartoes({ layouts = {}, modelos = {}, bancos = [], css = "", verticais = [], fotosEmPe = [] }) {
  verticais.forEach((v) => CARTOES.verticais.add(v));
  fotosEmPe.forEach((v) => CARTOES.fotosEmPe.add(v));
  Object.assign(CARTOES.layouts, layouts);
  Object.assign(CARTOES.modelos, modelos);
  CARTOES.bancos.push(...bancos);
  if (css) CARTOES.css.push(css);
}

// estilo comum a todos os cartões (frente, vidro do valor, peças)
const CARTOES_CSS_BASE = `
    .v3f.foto.fotov .v3f-info{bottom:auto;top:59%}
    .v3f.fotov img.v3f-arte{inset:auto;left:50%;top:50%;width:calc(100cqw / .632);height:100cqw;transform:translate(-50%,-50%) rotate(90deg)}
    .v3 .fcface.v3f.vert{aspect-ratio:.632!important;width:58%!important;max-width:58%!important;margin-left:auto!important;margin-right:auto!important}  /* cartão em pé */
    .v3f.vert .v3f-info{left:8%;right:auto;top:59%;bottom:auto;max-width:88%}  /* em pé: no meio, letras do mesmo tamanho dos deitados (a frente é 58% da largura) */
    .v3f.vert .v3f-info small{font-size:5.5cqw}.v3f.vert .v3f-info b{font-size:11cqw}.v3f.vert .v3f-info em{font-size:5.3cqw}
    .v3 .fcface.v3f{position:relative;overflow:hidden;display:block;aspect-ratio:1.586;box-sizing:border-box;padding:0;border:0;border-radius:16px;background:var(--cg,var(--cf));color:var(--ct);text-align:left;font-family:Manrope,system-ui,sans-serif;box-shadow:0 10px 24px -12px rgba(0,0,0,.55);container-type:inline-size}
    .v3 .fcface.v3f.preto{background:linear-gradient(160deg,#2b2b2f 0%,#161618 50%,#0b0b0c 100%)}
    .v3 .fcface.v3f.preto::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(255,255,255,.018) 0 1px,transparent 1px 3px);pointer-events:none}
    .v3f-arte{position:absolute;inset:0;width:100%;height:100%;z-index:0}
    .v3f>:not(.v3f-arte){z-index:1}  /* texto e peças sempre à frente do desenho; o contorno na cor do fundo apaga as linhas em volta das letras */
    .v3 .fcface.v3f{--halo:var(--cf,transparent)}
    .v3 .fcface.v3f.preto{--halo:#161618}
    .v3f :is(.v3f-info,.v3f-band,.v3f-marca,.v3f-modelo,.v3f-itop,.v3f-alprod){text-shadow:0 0 2px var(--halo),0 0 4px var(--halo),0 0 7px var(--halo)}
    .v3f>span{position:absolute}
    .v3f-marca{left:6%;top:9%;display:grid;justify-items:start;line-height:1}
    .v3f-marca b{font:600 7cqw/1 Manrope,system-ui,sans-serif;letter-spacing:-.01em}
    .v3f-marca small{font-size:4.6cqw;margin-top:.3cqw}
    .v3f-marca.dir{left:auto;right:6%;justify-items:end}
    .v3f.ouro .v3f-marca{color:#d4b26a}
    .v3f-chipw{left:6%;top:37%;display:flex;align-items:center;gap:2.4cqw}
    .v3f-chip{width:11cqw;height:auto}
    .v3f-nfc{width:5.6cqw;height:5.6cqw;opacity:.85}
    .v3f-nfcw{right:6%;top:35%}
    .v3f-bdl{display:block;height:7.4cqw;width:auto;max-width:24cqw;object-fit:contain}
    .v3f-bdl.amex,.v3f-bdl.jcb,.v3f-bdl.unionpay{height:9.5cqw}
    .v3f-bdl.diners{height:6.4cqw;max-width:30cqw}
    .v3f-bdl.hipercard{height:8.6cqw}
    .v3f-bdl.maestro{height:10cqw}
    .v3f-bdm{width:16cqw;height:6.6cqw;-webkit-mask-position:right center;mask-position:right center}
    .v3f-bdm.discover{width:24cqw;height:4.4cqw}
    .v3f-info{left:6%;bottom:8%;display:grid;line-height:1.15;max-width:60%}
    .v3f.foto .v3f-info{left:6%;bottom:7%}  /* só o texto, sem caixa (como na dashboard antiga) */
    .v3f-info small{font-size:3.2cqw;opacity:.75;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .v3f-info b{font:700 6.4cqw/1.15 Sora,Manrope,sans-serif;letter-spacing:-.01em}
    .v3f-info em{font-style:normal;font-size:3.1cqw;opacity:.8}
    .v3f-info em.atr{opacity:1;font-weight:700}
    .v3f-band{right:6%;bottom:7%;display:grid;justify-items:end;line-height:1;text-align:right}
    .v3f-band small{font-size:3.6cqw;font-weight:600;margin-top:.6cqw;opacity:.92}
    .v3f-visa{font:italic 900 8.4cqw/1 Arial,Helvetica,sans-serif;letter-spacing:-.01em;background:linear-gradient(180deg,#f7f7f8 0%,#c3c5c9 55%,#8e9095 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
    .v3f.ouro .v3f-visa{background:linear-gradient(180deg,#f3dc9a 0%,#d4b26a 55%,#a8862f 100%);-webkit-background-clip:text;background-clip:text}
    .v3f.ouro .v3f-band small{color:#d4b26a}
    .v3f:not(.preto) .v3f-visa{background:none;color:var(--ct)}
    .v3f-mcw{display:grid;justify-items:center;line-height:1}
    .v3f-mc{width:18.5cqw;height:auto;display:block}
    .v3f-mcn{font-size:3.1cqw;font-weight:600;letter-spacing:.01em;color:#d9dadc;margin-top:.4cqw}
    .v3f-marca.baixo{top:auto;bottom:8%;left:6%}
    .v3f-marca.baixo small{font-size:3.4cqw;font-weight:700;letter-spacing:.14em;margin:0 0 .2cqw}
    .v3f-marca.baixo b{font-size:7.4cqw;font-weight:500;letter-spacing:.04em}
    .v3f-logo{display:block;background:currentColor;-webkit-mask:var(--logo) left center/contain no-repeat;mask:var(--logo) left center/contain no-repeat}
    .v3f-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
    .v3f-logo.visa{width:19cqw;height:6.2cqw;-webkit-mask-position:right center;mask-position:right center;background:linear-gradient(180deg,#f7f7f8 0%,#c3c5c9 55%,#8e9095 100%)}
    .v3f.ouro .v3f-logo.visa{background:linear-gradient(180deg,#f3dc9a 0%,#d4b26a 55%,#a8862f 100%)}
    .v3f:not(.preto) .v3f-logo{background:var(--ct)}
    .v3f-vert{writing-mode:vertical-rl;transform:rotate(180deg);bottom:7%;line-height:1}
    .v3f-vert.dir{right:5%}
    .v3f-vert b{font:800 9cqw/1 Manrope,sans-serif;letter-spacing:-.03em;font-style:italic}
    .v3f-vert small{font:500 3cqw/1 Manrope,sans-serif;font-style:italic;margin-bottom:.6cqw}
    .v3f-chipw.brbc,.v3f-chipw.intc,.v3f-chipw.amzc{flex-direction:column;align-items:flex-start;top:9%;gap:1.4cqw}
    .v3f-band.topo{right:5%;top:6%;bottom:auto}
    .v3f-bd{display:block;height:6cqw;width:auto;color:inherit;overflow:visible}
    .v3f-bd.amex{height:9.5cqw}
    .v3f-bd.diners{height:9.5cqw}
    .v3f-bd.elo{height:7.6cqw}
    .v3f-bd.hiper{height:8.4cqw}
    .v3f-bd.jcb{height:9cqw}
`;

// cartoes/santander.js
// Cartões — Santander
// Parte do CoFinance: o montar.py junta esta pasta no co-finance-card.js. Os cartões ficam deitados (380 × 240).

// Cartões do HTML de referência (referencias/cartoes-numerados.html): número · bandeira · nome no site → modelo no catálogo
//   SAN-001  Visa                 Santander Unlimited Visa (mesma frente nas duas bandeiras)  →  santander-unlimited
//   SAN-002  Visa                 Santander Unique Visa Infinite (mesma frente nas duas bandeiras)  →  santander-unique
//   SAN-003  Visa                 Santander Elite Visa Signature (mesma frente nas duas bandeiras)  →  santander-elite
//   SAN-004  Visa                 Santander FREE Visa (mesma frente nas duas bandeiras)  →  santander-free
//   SAN-005  Visa                 Santander Gol Smiles Infinite  →  santander-smiles-infinite
//   SAN-006  Visa                 Santander Gol Smiles Platinum  →  santander-smiles-platinum
//   SAN-007  Visa                 Santander Gol Smiles Gold  →  santander-smiles-gold
//   SAN-008  Mastercard           Santander Unlimited Mastercard (mesma frente nas duas bandeiras)  →  santander-unlimited
//   SAN-009  Mastercard           Santander Unique Mastercard Black (mesma frente nas duas bandeiras)  →  santander-unique
//   SAN-010  Mastercard           Santander Elite Mastercard Platinum (mesma frente nas duas bandeiras)  →  santander-elite
//   SAN-011  Mastercard           Santander FREE Mastercard (mesma frente nas duas bandeiras)  →  santander-free
//   SAN-012  Mastercard           Santander AAdvantage Black  →  santander-aadvantage-black
//   SAN-013  Mastercard           Santander AAdvantage Platinum  →  santander-aadvantage-platinum
//   SAN-014  Mastercard           Santander AAdvantage Quartz  →  santander-aadvantage-quantum
// fim da lista


registrarCartoes({
  layouts: {
    santander: (p) => {
      const { prod, semTier, tem, logo, chipSvg, nfc, info, band, e } = p;
      return `<span class="v3f-marca">${tem.has("santander") ? `${logo("santander")}<b class="v3f-sr">Santander</b>` : "<b>Santander</b>"}</span><span class="v3f-chipw">${chipSvg}</span>
        ${semTier(prod) ? `<span class="v3f-modelo${semTier(prod).length > 7 ? " longo" : ""}">${e(semTier(prod))}</span>` : ""}<span class="v3f-nfcw">${nfc}</span>${info}${band()}`;
    },
  },
  modelos: {
    "santander-unique": "santander",
  },
  bancos: ["santander"],
  css: `
    .v3f.santander .v3f-marca b{font-size:7.8cqw;font-weight:600}
    .v3f.santander .v3f-chipw{top:33%}
    .v3f.santander .v3f-chip{width:13cqw}
    .v3f.santander .v3f-nfc{width:8cqw;height:8cqw}
    .v3f-modelo{left:0;right:0;top:39%;text-align:center;font-size:3.9cqw;font-weight:700;letter-spacing:1.4em;padding-left:1.4em;opacity:.9}
    .v3f-modelo.longo{top:55%;left:6%;right:auto;text-align:left;padding-left:0;letter-spacing:.32em;font-size:3.2cqw}
    .v3f-logo.santander{width:38cqw;height:8.4cqw;background:#e9e9ea}
  `,
});

// cartoes/bradesco.js
// Cartões — Bradesco
// Parte do CoFinance: o montar.py junta esta pasta no co-finance-card.js. Os cartões ficam deitados (380 × 240).

// Cartões do HTML de referência (referencias/cartoes-numerados.html): número · bandeira · nome no site → modelo no catálogo
//   BRA-001  Visa                 Bradesco Visa Gold  →  bradesco-visa-gold
//   BRA-002  Visa                 Bradesco Universitário Visa Gold  →  bradesco-universitario-visa-gold
//   BRA-003  Visa                 Bradesco Neo Visa Platinum  →  bradesco-neo-visa-platinum
//   BRA-004  Visa                 Bradesco Visa Platinum  →  bradesco-visa-platinum-sem-anuidade
//   BRA-005  Visa                 Bradesco Like Visa  →  bradesco-like-visa
//   BRA-006  Visa                 Bradesco Visa Signature  →  bradesco-visa-signature
//   BRA-007  Visa                 Bradesco Visa Infinite  →  bradesco-visa-infinite
//   BRA-008  Visa                 Bradesco Visa Aeternum  →  bradesco-visa-aeternum
//   BRA-009  Visa                 Bradesco Gol Smiles Visa Gold  →  bradesco-gol-smiles-visa-gold
//   BRA-010  Visa                 Bradesco Gol Smiles Visa Platinum  →  bradesco-gol-smiles-visa-platinum
//   BRA-011  Visa                 Bradesco Gol Smiles Visa Infinite  →  bradesco-gol-smiles-visa-infinite
//   BRA-012  Visa                 Bradesco Disney© Visa Infinite Magia  →  bradesco-disney-visa-infinite-magia
//   BRA-013  Visa                 Bradesco Disney© Visa Infinite Star Wars  →  bradesco-disney-visa-infinite-star-wars
//   BRA-014  Visa                 Bradesco Disney© Visa Infinite Amigos  →  bradesco-disney-visa-infinite-amigos
//   BRA-015  Visa                 Bradesco Disney© Visa Signature Amigos  →  bradesco-disney-visa-signature-amigos
//   BRA-016  Visa                 Bradesco Disney© Visa Signature Star Wars  →  bradesco-disney-visa-signature-star-wars
//   BRA-017  Visa                 Bradesco Horizon Visa Infinite  →  bradesco-horizon-visa-infinite
//   BRA-018  Visa                 Bradesco United MileagePlus Visa Infinite  →  bradesco-united-mileageplus-visa-infinit
//   BRA-019  Visa                 Bradesco Marriott Bonvoy® Visa Infinite  →  bradesco-marriott-bonvoy-visa-infinite
//   BRA-020  Visa                 Ágora Visa Infinite  →  bradesco-agora-visa-infinite
//   BRA-021  Visa                 Bradesco Visa Platinum - sem anuidade  →  bradesco-visa-platinum-sem-anuidade
//   BRA-022  Visa                 Bradesco Visa Internacional  →  bradesco-visa-internacional
//   BRA-023  Visa                 Bradesco Gol Smiles Visa Internacional  →  bradesco-gol-smiles-visa-internacional
//   BRA-024  Visa                 Harley Davidson Visa Platinum  →  bradesco-harley-davidson-visa-platinum
//   BRA-025  Visa                 Harley Davidson Visa Signature  →  bradesco-harley-davidson-visa-signature
//   BRA-026  Visa                 Bradesco Seguros Visa Gold  →  bradesco-seguros-visa-gold
//   BRA-027  Visa                 Bradesco Seguros Visa Platinum  →  bradesco-seguros-visa-platinum
//   BRA-028  Visa                 Bradesco Seguros Visa Signature  →  bradesco-seguros-visa-signature
//   BRA-029  Visa                 Bradesco Visa Nacional  →  bradesco-visa-nacional
//   BRA-030  Visa                 Bradesco Visa Universitário Nacional  →  bradesco-visa-universitario-nacional
//   BRA-031  Visa                 Bradesco Visa Nacional Mais  →  bradesco-visa-nacional-mais
//   BRA-032  Visa                 Bradesco Music Visa Platinum  →  bradesco-music-visa-platinum
//   BRA-033  Visa                 Bradesco Visa Básico  →  bradesco-visa-basico
//   BRA-034  Visa                 Fundação SOS Mata Atlântica Bradesco Visa Nacional  →  bradesco-sos-mata-atlantica
//   BRA-035  Visa                 Fundação SOS Mata Atlântica Bradesco Visa Gold  →  bradesco-sos-visa-gold
//   BRA-036  Visa                 Fundação SOS Mata Atlântica Bradesco Visa Platinum  →  bradesco-sos-visa-platinum
//   BRA-037  Visa                 Bradesco Débito Visa Internacional (débito)  →  bradesco-debito-visa-internacional
//   BRA-038  Visa                 Bradesco Débito Visa (débito)  →  bradesco-debito-visa
//   BRA-039  Visa                 Bradesco Múltiplo Universitário Visa (débito)  →  bradesco-multiplo-universitario-visa
//   BRA-040  Visa                 Bradesco Débito Click Conta Visa (débito)  →  bradesco-debito-click-conta-visa
//   BRA-041  Visa                 Bradesco Débito Poupcard Visa (débito)  →  bradesco-debito-poupcard-visa
//   BRA-042  Visa                 Bradesco Débito Conta salário Visa (débito)  →  bradesco-debito-conta-salario-visa
//   BRA-043  Visa                 Bradesco Débito INSS Visa (débito)  →  bradesco-debito-inss-visa
//   BRA-044  Visa                 Bradesco Débito BPC VISA (débito)  →  bradesco-debito-bpc-visa
//   BRA-045  Mastercard           Bradesco Mastercard® Nacional  →  bradesco-mastercard-nacional
//   BRA-046  Mastercard           Bradesco Mastercard® Internacional  →  bradesco-mastercard-internacional
//   BRA-047  Mastercard           Bradesco Mastercard® Gold  →  bradesco-mastercard-gold
//   BRA-048  Mastercard           Bradesco Mastercard® Platinum  →  bradesco-mastercard-platinum
//   BRA-049  Mastercard           Bradesco Mastercard® Black  →  bradesco-mastercard-black
//   BRA-050  Mastercard           Bradesco Gol Smiles Mastercard® Internacional  →  bradesco-gol-smiles-mastercard-internacional
//   BRA-051  Mastercard           Bradesco Gol Smiles Mastercard® Gold  →  bradesco-gol-smiles-mastercard-gold
//   BRA-052  Mastercard           Bradesco Gol Smiles Mastercard® Platinum  →  bradesco-gol-smiles-mastercard-platinum
//   BRA-053  Mastercard           Fundação Amazonas Sustentável Bradesco Mastercard® Gold  →  bradesco-fas-mastercard-gold
//   BRA-054  Mastercard           Fundação Amazonas Sustentável Bradesco Mastercard® Internacional  →  bradesco-fas-mastercard-internacional
//   BRA-055  Mastercard           Fundação Amazonas Sustentável Bradesco Mastercard® Nacional  →  bradesco-fas-mastercard-nacional
//   BRA-056  Mastercard           Amazon.com.br Mastercard (branco)  →  amazon-bradesco
//   BRA-057  Mastercard           Amazon Prime Mastercard (grafite)  →  bradesco-amazon-prime  (ainda fora do catálogo)
//   BRA-058  Elo                  Bradesco Elo Consignado INSS Internacional  →  bradesco-elo-consignado-inss-internacional
//   BRA-059  Elo                  Bradesco Elo Consignado Internacional  →  bradesco-elo-consignado-internacional
//   BRA-060  Elo                  Bradesco Elo Internacional  →  bradesco-elo-internacional
//   BRA-061  Elo                  Bradesco Elo Mais Internacional  →  bradesco-elo-mais-internacional
//   BRA-062  Elo                  Bradesco Elo Grafite  →  bradesco-elo-grafite
//   BRA-063  Elo                  Bradesco Elo Nanquim  →  bradesco-elo-nanquim
//   BRA-064  Elo                  Bradesco Elo Diners Club  →  bradesco-elo-diners-club
//   BRA-065  Elo                  Bradesco Elo Nacional  →  bradesco-elo-nacional
//   BRA-066  Elo                  Bradesco Seguros Elo Nacional  →  bradesco-seguros-elo-nacional
//   BRA-067  Elo                  Bradesco Music Elo Nacional  →  bradesco-music-elo-nacional
//   BRA-068  Elo                  Bradesco Elo Plus  →  bradesco-elo-plus
//   BRA-069  Elo                  Bradesco Elo Mais  →  bradesco-elo-mais
//   BRA-070  Elo                  Bradesco Elo Universitário Função Crédito  →  bradesco-elo-universitario-funcao-credito
//   BRA-071  Elo                  Bradesco Music Elo Internacional  →  bradesco-music-elo-internacional
//   BRA-072  Elo                  Bradesco Elo Plus Internacional  →  bradesco-elo-plus-internacional
//   BRA-073  Elo                  Bradesco Seguros Elo Internacional  →  bradesco-seguros-elo-internacional
//   BRA-074  Elo                  Bradesco Seguros Elo Mais  →  bradesco-seguros-elo-mais
//   BRA-075  Elo                  Bradesco Seguros Elo Grafite  →  bradesco-seguros-elo-grafite
//   BRA-076  Elo                  Bradesco Seguros Elo Nanquim  →  bradesco-seguros-elo-nanquim
//   BRA-077  Elo                  Bradesco Elo Consignado INSS  →  bradesco-elo-consignado-inss
//   BRA-078  Elo                  Bradesco Elo Consignado  →  bradesco-elo-consignado
//   BRA-079  Elo                  Bradesco Elo Internacional Básico  →  bradesco-elo-internacional-basico
//   BRA-080  Elo                  Fundação Amazonas Sustentável Bradesco Elo Internacional  →  bradesco-fas-elo-internacional
//   BRA-081  Elo                  Bradesco Elo Internacional - Função crédito  →  bradesco-multiplo-elo
//   BRA-082  Elo                  Fundação SOS Mata Atlântica Bradesco Elo internacional  →  bradesco-sos-elo-internacional
//   BRA-083  Elo                  Bradesco Elo Nacional - Função Crédito  →  bradesco-elo-nacional-funcao-credito
//   BRA-084  Elo                  Bradesco Débito Elo Internacional (débito)  →  bradesco-debito-elo-internacional
//   BRA-085  Elo                  Bradesco Múltiplo Elo (débito)  →  bradesco-multiplo-elo
//   BRA-086  Elo                  Bradesco Múltiplo Universitário Elo (débito)  →  bradesco-multiplo-universitario-elo
//   BRA-087  Elo                  Bradesco Débito Universitário Elo (débito)  →  bradesco-debito-universitario-elo
//   BRA-088  Elo                  Bradesco Débito Click Conta Elo (débito)  →  bradesco-debito-click-conta-elo
//   BRA-089  Elo                  Bradesco Débito Poupcard Elo (débito)  →  bradesco-debito-poupcard-elo
//   BRA-090  Elo                  Bradesco Débito Conta salário Elo (débito)  →  bradesco-debito-conta-salario-elo
//   BRA-091  Elo                  Bradesco Débito INSS Elo (débito)  →  bradesco-debito-inss-elo
//   BRA-092  Elo                  Bradesco Débito BPC Elo (débito)  →  bradesco-debito-bpc-elo
//   BRA-093  American Express     American Express® Green  →  bradesco-amex-green
//   BRA-094  American Express     American Express® Gold Card  →  bradesco-amex-gold-card
//   BRA-095  American Express     The Platinum Card®  →  bradesco-the-platinum-card
//   BRA-096  American Express     Bradesco American Express® Credit  →  bradesco-amex-credit
//   BRA-097  American Express     American Express® Credit  →  bradesco-amex-credit-2
//   BRA-098  American Express     American Express® Blue  →  bradesco-amex-blue
//   BRA-099  American Express     Bradesco American Express® Gold Credit  →  bradesco-amex-gold-credit
//   BRA-100  American Express     Bradesco Seguros American Express® Gold  →  bradesco-seguros-amex-gold
//   BRA-101  American Express     American Express® Gold Credit  →  bradesco-amex-gold-credit-2
//   BRA-102  American Express     Bradesco Gold American Express®  →  bradesco-gold-amex
//   BRA-103  American Express     Bradesco Seguros American Express® Platinum  →  bradesco-seguros-amex-platinum
//   BRA-104  American Express     Bradesco Platinum American Express®  →  bradesco-platinum-amex
//   BRA-105  American Express     American Express® Platinum Credit  →  bradesco-amex-platinum-credit
// fim da lista


registrarCartoes({
  layouts: {
    bradesco: (p) => {
      const { prod, semTier, arte, tem, logo, chipSvg, nfc, info, band, e } = p;
      return `<svg class="v3f-arte" viewBox="0 0 380 240" preserveAspectRatio="none" aria-hidden="true"><path d="M262 0 300 0 232 128z" fill="#fff" opacity=".10"/><path d="M380 30v14L250 120z" fill="#fff" opacity=".12"/><path d="M380 150v8L190 190z" fill="#fff" opacity=".08"/></svg>
        <span class="v3f-marca">${tem.has("bradesco") ? `${logo("bradesco")}<b class="v3f-sr">Bradesco</b>` : "<b>bradesco</b>"}${semTier(prod) ? `<small>${e(semTier(prod).toLowerCase())}</small>` : ""}</span><span class="v3f-chipw">${chipSvg}${nfc}</span>${info}${band()}`;
    },
    amazon: (p) => {
      const { arte, chipSvg, nfc, bandeira, info, band } = p;
      // Amazon (Bradesco): branco, "amazon.com.br" em pé à direita com o sorriso, a seta clara ao fundo
      return `<svg class="v3f-arte" viewBox="0 0 380 240" preserveAspectRatio="none" aria-hidden="true"><path d="M150 230C190 150 192 80 170 10" stroke="#c9d8f2" stroke-width="5" fill="none" opacity=".7"/><path d="M158 26 170 8 186 22" stroke="#c9d8f2" stroke-width="5" fill="none" opacity=".7"/></svg>
        <span class="v3f-vert dir amz"><b>amazon<small>.com.br</small></b><i aria-hidden="true"></i></span><span class="v3f-chipw amzc">${nfc}${chipSvg}</span>${info}${bandeira ? `<span class="v3f-band amzb">${bandeira}</span>` : ""}`;
    },
  },
  modelos: {
    "bradesco-visa-infinite": "bradesco",  // BRA-007 (Visa Infinite): o desenho do Bradesco Prime, que é este cartão
    "amazon-bradesco": "amazon",
  },
  bancos: ["bradesco"],
  css: `
    .v3f.bradesco .v3f-marca b{font-weight:700;font-size:6.6cqw;letter-spacing:-.03em}
    .v3f.bradesco .v3f-marca small{font-size:5.2cqw;font-weight:500;margin-top:0}
    .v3f-logo.bradesco{width:33cqw;height:6.2cqw;background:#f2f2f3}
    .v3f-vert.amz{display:flex;align-items:center;gap:1cqw;color:#232f3e}
    .v3f-vert.amz b{font:800 8cqw/1 Arial,Helvetica,sans-serif;font-style:normal;letter-spacing:-.04em}
    .v3f-vert.amz b small{font:600 4cqw/1 Arial,sans-serif;font-style:normal}
    .v3f-vert.amz i{display:block;width:3cqw;height:20cqw;border-left:1cqw solid #ff9900;border-radius:50%;margin-right:-2cqw}
    .v3f-chipw.amzc{top:10%}
    .v3f-band.amzb{right:22%;bottom:7%}
    .v3f.amazon .v3f-info{color:#232f3e}
  `,
});

// cartoes/bb.js
// Cartões — Banco do Brasil
// Parte do CoFinance: o montar.py junta esta pasta no co-finance-card.js. Os cartões ficam deitados (380 × 240).

// Cartões do HTML de referência (referencias/cartoes-numerados.html): número · bandeira · nome no site → modelo no catálogo
//   BB-001  Visa                 Ourocard Fácil  →  bb-ourocard-facil
//   BB-002  Visa                 Ourocard Universitário  →  bb-ourocard-universitario
//   BB-003  Visa                 Ourocard Visa Gold  →  bb-ourocard-visa-gold
//   BB-004  Visa                 Ourocard Visa Platinum (modelo antigo)  →  bb-ourocard-visa-platinum
//   BB-005  Visa                 Ourocard Visa Infinite (modelo antigo)  →  bb-ourocard-infinite
//   BB-006  Visa                 Ourocard Visa Platinum  →  bb-ourocard-visa-platinum-v
//   BB-007  Visa                 Ourocard Visa Infinite  →  bb-ourocard-infinite-v
//   BB-008  Visa                 Ourocard Pré-pago  →  bb-ourocard-pre-pago
//   BB-009  Visa                 Ourocard TravelMoney  →  bb-ourocard-travelmoney
//   BB-010  Visa                 GOL Smiles Gold  →  bb-smiles-gold
//   BB-011  Visa                 GOL Smiles Platinum  →  bb-smiles-platinum
//   BB-012  Visa                 GOL Smiles Infinite  →  bb-smiles-infinite
//   BB-013  Visa                 Saraiva  →  bb-saraiva
//   BB-014  Visa                 Petrobras  →  bb-petrobras
//   BB-015  Visa                 Dotz International  →  bb-dotz-international
//   BB-016  Visa                 Dotz Platinum  →  bb-dotz-platinum
//   BB-017  Mastercard           Ourocard Platinum Mastercard  →  bb-ourocard-platinum-mastercard
//   BB-018  Mastercard           Ourocard Mastercard Black  →  bb-ourocard-mastercard-black
//   BB-019  Elo                  Ourocard Elo  →  bb-ourocard-elo
//   BB-020  Elo                  Ourocard Elo Mais  →  bb-ourocard-elo-mais
//   BB-021  Elo                  Ourocard Elo Grafite  →  bb-ourocard-grafite
//   BB-022  Elo                  Ourocard Elo Nanquim  →  bb-ourocard-nanquim
// fim da lista


// Família Ourocard deitada (o desenho antigo, com trilhos): o mesmo cartão — símbolo do BB no alto à esquerda, "ourocard" no alto à
// direita, chip e aproximação, os trilhos atrás, a faixa amarela na borda esquerda (menos nos amarelos) e a bandeira embaixo.
// Muda só: as cores (fundo, trilhos, letras), a bandeira e a categoria escrita (platinum, black...). Cores tiradas das fotos.
const OURO_AMARELO = { fundo: ["#ffe94a", "#fde100"], linha: "#c2ac00", op: 0.85, tinta: "#1d4f9c", faixa: false };
const OURO_DOURADO = { fundo: ["#d2bf80", "#c4ad69"], linha: "#9a8640", op: 0.85, tinta: "#ffffff", faixa: true };
const OURO_PRATA = { fundo: ["#a0a1a4", "#8c8d90"], linha: "#76777a", op: 0.8, tinta: "#dcdcde", faixa: true };
// o desenho deitado, com trilhos: o Universitário (assim no site) e os dois modelos antigos de Visa Platinum e Visa Infinite
const OUROCARD = {
  "bb-ourocard-universitario": OURO_AMARELO,
  "bb-ourocard-visa-platinum": OURO_PRATA,
  "bb-ourocard-infinite": { fundo: ["#35363b", "#26272c"], linha: "#7a7b80", op: 0.6, tinta: "#ececec", faixa: true },
};
void OURO_DOURADO;

// Família Ourocard atual, EM PÉ (como no site do BB hoje): fundo liso, a curva dourada fina, o símbolo do BB e "ourocard" em
// dourado no alto, o chip em pé embaixo e a bandeira dourada (o Mastercard nas cores dele) embaixo à direita.
const OV_AMARELO = { fundo: ["#f4e800", "#ece000"], ouro: ["#d9c400", "#b9a200"] };
const OV_CREME = { fundo: ["#f7ead0", "#efdfc1"], ouro: ["#d9bd80", "#b8955a"] };
const OV_CINZA = { fundo: ["#90a0a8", "#83939c"], ouro: ["#ead29a", "#c39f5e"] };
const OV_PRETO = { fundo: ["#2f2d29", "#1d1b18"], ouro: ["#ecd49c", "#c19c5c"] };
const OUROCARD_V = {
  "bb-ourocard-facil": OV_AMARELO,
  "bb-ourocard-elo": OV_AMARELO,
  "bb-ourocard-visa-gold": OV_CREME,
  "bb-ourocard-elo-mais": OV_CREME,
  "bb-ourocard-visa-platinum-v": OV_CINZA,
  "bb-ourocard-grafite": OV_CINZA,
  "bb-ourocard-platinum-mastercard": { ...OV_CINZA, cat: "platinum" },
  "bb-ourocard-nanquim": OV_PRETO,
  "bb-ourocard-mastercard-black": { ...OV_PRETO, cat: "black" },
  "bb-ourocard-infinite-v": { fundo: ["#2a2a2a", "#080808"], ouro: ["#efd8a2", "#c49f5f"] },
};
const CURVA_BB = "M-2 213C10 220 22 232 38 231C47 231 54 226 62 221L242 100";  // a curva dourada (cartão em pé, 240 × 380)
// os trilhos do fundo, iguais aos do cartão de verdade (grade de passo 32; os cantos se encontram exatos)
const TRILHOS_BB = "M187.6 45.7L236.7 77.7M138.5 77.7L163 93.7M138.5 109.7L261.2 189.7M40.3 77.7L138.5 141.7M236.7 205.7L261.2 221.7M-33.9 61.3L40.3 109.7M114 157.7L163 189.7M15.8 125.7L40.3 141.7M138.5 205.7L219.6 258.6M40.3 173.7L89.4 205.7M40.3 205.7L121.4 258.6M15.8 93.7L40.3 77.7M-33.9 158.1L114 61.7M7.9 162.9L187.6 45.7M118.4 122.8L236.7 45.7M40.3 173.7L98.3 135.9M178.7 115.5L236.7 77.7M7.9 226.9L163 125.7M187.6 141.7L236.7 109.7M7.4 259.2L187.6 141.7M138.5 205.7L212.1 157.7M178.5 211.6L236.7 173.7M105.8 259L163 221.7M203.9 259L261.2 221.7";

registrarCartoes({
  layouts: {
    ourocardv: (p) => {
      const { k, tier, tem, logo, chipSvg, info, e, LOGO } = p;
      const o = OUROCARD_V[k.modelo] || OV_CREME, id = e(k.id), [g1, g2] = o.ouro;
      const ouro = `linear-gradient(160deg,${g1},${g2})`;
      const b = k.bandeira;
      const bandeira = b === "Mastercard" ? `<span class="v3f-ovmc"><svg viewBox="0 0 48 30" aria-label="Mastercard"><circle cx="16" cy="15" r="13" fill="#eb001b"/><circle cx="32" cy="15" r="13" fill="#f79e1b"/><path d="M24 4.8a13 13 0 0 1 0 20.4 13 13 0 0 1 0-20.4z" fill="#ff5f00"/></svg></span>`
        : b === "Elo" ? `<span class="v3f-ovband"><i class="v3f-logo v3f-ovelo" style="--logo:url('${LOGO("band-elo")}')" role="img" aria-label="Elo"></i>${tier ? `<small>${e(tier)}</small>` : ""}</span>`
        : b === "Visa" ? `<span class="v3f-ovband"><i class="v3f-logo v3f-ovvisa" style="--logo:url('${LOGO("visa")}')" role="img" aria-label="Visa"></i>${tier ? `<small>${e(tier)}</small>` : ""}</span>` : "";
      return `<svg class="v3f-arte" viewBox="0 0 240 380" preserveAspectRatio="none" aria-hidden="true"><defs>`
        + `<linearGradient id="ovf${id}" x1="0" y1="0" x2=".6" y2="1"><stop offset="0" stop-color="${o.fundo[0]}"/><stop offset="1" stop-color="${o.fundo[1]}"/></linearGradient>`
        + `<linearGradient id="ovo${id}" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="${g1}"/><stop offset="1" stop-color="${g2}"/></linearGradient></defs>`
        + `<rect width="240" height="380" fill="url(#ovf${id})"/><path d="${CURVA_BB}" stroke="url(#ovo${id})" stroke-width="1.5" fill="none"/></svg>
        <span class="v3f-ow" style="--ouro:${ouro}">${tem.has("bb") ? `<span class="v3f-ovbb">${logo("bb", "bb ovbb")}</span>` : ""}<b class="v3f-ovnome">ourocard</b>
        ${o.cat ? `<span class="v3f-ovcat">${e(o.cat)}</span>` : ""}<span class="v3f-ovchip">${chipSvg.replace("#d7d9dc", "#efd9a0").replace("#8f959b", "#a88a45").replace("#f1f2f4", "#f8e9bf")}</span>${info}${bandeira}</span>`;
    },
    // Dotz International e Dotz Platinum: em pé, azul ou prata; chip e aproximação no alto, a bola laranja do Dotz no meio, VISA branco embaixo
    dotzv: (p) => {
      const { k, tier, chipSvg, nfc, info, e, LOGO } = p;
      const prata = /platinum/.test(k.modelo), id = e(k.id);
      return `<svg class="v3f-arte" viewBox="0 0 240 380" preserveAspectRatio="none" aria-hidden="true"><defs>`
        + `<radialGradient id="dz${id}" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#ffc06a"/><stop offset=".55" stop-color="#f6860f"/><stop offset="1" stop-color="#e06000"/></radialGradient></defs>`
        + `<rect width="240" height="380" fill="${prata ? "#a3a3a8" : "#00449d"}"/><circle cx="120" cy="245" r="38" fill="url(#dz${id})"/>`
        + `<text x="120" y="259" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="40" font-style="italic" fill="#fff">dz</text></svg>
        <span class="v3f-ow" style="color:#fff;--ct:#fff"><span class="v3f-dzchip">${chipSvg}${nfc}</span>${info}
        ${prata ? "" : `<span class="v3f-dzint">INTERNATIONAL</span>`}<span class="v3f-ovband dz"><i class="v3f-logo v3f-ovvisa" style="--logo:url('${LOGO("visa")}')" role="img" aria-label="Visa"></i>${prata && tier ? `<small>${e(tier)}</small>` : ""}</span></span>`;
    },
    // Petrobras: em pé, branco; chip no alto, "CARTÃO PETROBRAS" em verde, a linha laranja e o VISA dourado embaixo
    petrobrasv: (p) => {
      const { chipSvg, info, LOGO } = p;
      return `<svg class="v3f-arte" viewBox="0 0 240 380" preserveAspectRatio="none" aria-hidden="true"><rect width="240" height="380" fill="#fff"/>`
        + `<path d="M0 143h60v7H0zM62 140h3v12h-3zM68 140h3v12h-3zM74 140h3v12h-3zM80 140h3v12h-3zM86 140h3v12h-3z" fill="#008e3e"/>`
        + `<text x="93" y="151" font-family="Arial,sans-serif" font-size="12" font-style="italic" letter-spacing="3.4" fill="#008e3e">CARTÃO</text>`
        + `<text x="20" y="166" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="16.5" font-style="italic" fill="#008e3e">PETROBRAS</text>`
        + `<path d="M-2 336L196 288Q204 286 207 276L242 160" stroke="#f5a623" stroke-width="1.6" fill="none"/></svg>
        <span class="v3f-ow" style="color:#1f2430;--ct:#1f2430;--ouro:linear-gradient(160deg,#ecd08e,#b88f4a)"><span class="v3f-pbchip">${chipSvg.replace("#d7d9dc", "#e2cf86").replace("#8f959b", "#3f9c4c").replace("#f1f2f4", "#f3e3a6")}</span>${info}
        <span class="v3f-ovband"><i class="v3f-logo v3f-ovvisa" style="--logo:url('${LOGO("visa")}')" role="img" aria-label="Visa"></i></span></span>`;
    },
    ourocard: (p) => {
      const { k, tier, tem, logo, chipSvg, nfc, info, band, bandeira, e, LOGO } = p;
      const o = OUROCARD[k.modelo] || OURO_DOURADO, id = e(k.id), t = o.tinta;
      const mc = k.bandeira === "Mastercard";  // no Mastercard a categoria fica escrita à direita, e não embaixo da bandeira
      // o Elo dos Ourocard é em degradê lilás, com a categoria espaçada embaixo (MAIS, GRAFITE, Nanquim)
      const elo = k.bandeira === "Elo" ? `<span class="v3f-band v3f-oelo"><i class="v3f-logo v3f-oelol" style="--logo:url('${LOGO("band-elo")}')" role="img" aria-label="Elo"></i>${tier ? `<small>${e(tier)}</small>` : ""}</span>` : "";
      return `<svg class="v3f-arte" viewBox="0 0 380 240" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="og${id}" x1="0" y1="0" x2="1" y2="1">`
        + `<stop offset="0" stop-color="${o.fundo[0]}"/><stop offset="1" stop-color="${o.fundo[1]}"/></linearGradient></defs><rect width="380" height="240" fill="url(#og${id})"/>`
        + `<path d="${TRILHOS_BB}" stroke="${o.linha}" stroke-width="1.6" opacity="${o.op}" fill="none"/>${o.faixa ? '<path d="M0 168L7.9 162.8V240H0z" fill="#ffd400"/>' : ""}</svg>
        <span class="v3f-ow" style="color:${t};--ct:${t};--obb:${t}">${tem.has("bb") ? `<span class="v3f-bbs">${logo("bb", "bb bbo")}</span>` : ""}<span class="v3f-marca dir"><b class="v3f-ourod">ourocard</b></span>
        ${o.cat ? `<span class="v3f-ocat">${e(o.cat)}</span>` : ""}<span class="v3f-chipw">${chipSvg}${nfc}</span>${info}${elo || (mc && bandeira ? `<span class="v3f-band">${bandeira}</span>` : band())}</span>`;
    },
    bb: (p) => {
      const { prod, semTier, arte, tem, logo, chipSvg, nfc, info, band, e } = p;
      const ouroNome = /OUROCARD/.test(prod) ? "ourocard" : "Banco do Brasil", resto = semTier(prod.replace("OUROCARD", ""));
      return `<svg class="v3f-arte" viewBox="0 0 380 240" preserveAspectRatio="none" aria-hidden="true"><path d="M0 150C120 150 120 132 220 104 300 80 340 62 380 50" stroke="#d4b26a" stroke-width="1.6" fill="none"/></svg>
        ${tem.has("bb") ? `<span class="v3f-bbs">${logo("bb")}</span>` : ""}<span class="v3f-marca dir"><b>${e(ouroNome)}</b>${resto ? `<small>${e(resto)}</small>` : ""}</span><span class="v3f-chipw">${chipSvg}${nfc}</span>${info}${band()}`;
    },
  },
  modelos: {
    ...Object.fromEntries(Object.keys(OUROCARD).map((m) => [m, "ourocard"])),
    ...Object.fromEntries(Object.keys(OUROCARD_V).map((m) => [m, "ourocardv"])),
    "bb-dotz-international": "dotzv",
    "bb-dotz-platinum": "dotzv",
    "bb-petrobras": "petrobrasv",
  },
  bancos: ["bb"],
  verticais: ["ourocardv", "dotzv", "petrobrasv"],
  css: `
    .v3f.bb .v3f-marca b{font-size:6.2cqw}
    .v3f.bb .v3f-chipw{top:42%}
    .v3f-logo.bb.bbw{background:#f4f4f5}
    .v3f-ourod{font-weight:600!important;font-size:7.6cqw!important;letter-spacing:-.02em;color:#f4f4f5}
    .v3f-bbs{left:6%;top:9%}
    .v3f-logo.bb{width:9cqw;height:9cqw;background:linear-gradient(160deg,#f3dc9a,#c9a453 60%,#9c7a2c)}
    .v3f-ow{position:absolute;inset:0;z-index:1}.v3f-ow>span{position:absolute}
    .v3 .fcface.v3f.ourocard{background:none}.v3 .fcface.v3f.ourocard::before{display:none}
    .v3f.ourocard .v3f-logo.bb.bbo{background:var(--obb)}
    .v3f.ourocard .v3f-ourod{color:inherit;font:900 7.6cqw/1 "Arial Rounded MT Bold","Arial Black",Arial,sans-serif!important;letter-spacing:-.02em}
    .v3f.ourocard .v3f-chipw{top:38%}.v3f-ow .v3f-nfc{color:var(--ct)!important;opacity:1}
    .v3f-oelo small{font:600 2.6cqw/1 Manrope,sans-serif!important;letter-spacing:.35em;text-transform:uppercase;margin-top:.8cqw}
    .v3f.ourocard .v3f-logo.v3f-oelol{width:19cqw;height:8cqw;background:linear-gradient(90deg,#a98fe0,#d79ad6 55%,#e7a7c4)!important;-webkit-mask-position:right center;mask-position:right center}
    .v3f.ourocard :is(.v3f-visa,.v3f-logo.visa){background:currentColor!important;-webkit-text-fill-color:currentColor;color:inherit}
    .v3f.ourocardv .v3f-ovbb{left:7%;top:4.5%}.v3f-logo.ovbb{width:17cqw;height:17cqw;background:var(--ouro)!important}
    .v3f-ovnome{position:absolute;right:7%;top:7.6%;font:700 8.4cqw/1 "Arial Rounded MT Bold",Manrope,Arial,sans-serif;letter-spacing:-.02em;background:var(--ouro);-webkit-background-clip:text;background-clip:text;color:transparent;z-index:1}
    .v3f-ovchip{left:34%;top:75.5%}.v3f-ovchip .v3f-chip{width:21cqw;height:auto;transform:rotate(90deg)}
    .v3f-ovband{right:7%;bottom:5%;display:grid;justify-items:end;line-height:1}
    .v3f-ovband small{font:600 4.6cqw/1 Manrope,sans-serif;margin-top:1cqw;background:var(--ouro);-webkit-background-clip:text;background-clip:text;color:transparent;letter-spacing:.02em}
    .v3f-logo.v3f-ovvisa{width:33cqw;height:11cqw;background:var(--ouro)!important;-webkit-mask-position:right center;mask-position:right center}
    .v3f-logo.v3f-ovelo{width:33cqw;height:12cqw;background:var(--ouro)!important;-webkit-mask-position:right center;mask-position:right center}
    .v3f-ovmc{right:7%;bottom:5%}.v3f-ovmc svg{display:block;width:24cqw;height:auto}
    .v3f-ovcat{right:7%;bottom:15.5%;font:600 4.6cqw/1 Manrope,sans-serif;background:var(--ouro);-webkit-background-clip:text;background-clip:text;color:transparent}
    .v3 .fcface.v3f.ourocardv{background:none}.v3 .fcface.v3f.ourocardv::before{display:none}
    .v3f.dotzv .v3f-dzchip{left:49%;top:10.5%;display:flex;align-items:center;gap:3cqw}.v3f-dzchip .v3f-chip{width:16cqw;height:auto;transform:rotate(90deg)}.v3f-dzchip .v3f-nfc{width:10cqw;height:10cqw}
    .v3f.dotzv .v3f-info{top:27%}  /* Dotz: a bola laranja ocupa a altura padrão */
    .v3f-dzint{left:3%;bottom:4%;font:500 2.6cqw/1 Manrope,sans-serif;letter-spacing:.04em;opacity:.9}
    .v3f-ovband.dz .v3f-logo.v3f-ovvisa{background:#fff!important}.v3f-ovband.dz small{background:none;color:#fff}
    .v3f.petrobrasv .v3f-pbchip{left:50%;top:11%}.v3f-pbchip .v3f-chip{width:21cqw;height:auto;transform:rotate(90deg)}
    .v3 .fcface.v3f.petrobrasv{box-shadow:0 0 0 1px #d8d8d8,0 10px 24px -12px rgba(0,0,0,.4)}
    .v3f-ocat{right:6%;top:52%;font:600 4.2cqw/1 Manrope,system-ui,sans-serif;letter-spacing:.01em}
  `,
});

// cartoes/itau.js
// Cartões — Itaú
// Parte do CoFinance: o montar.py junta esta pasta no co-finance-card.js. Os cartões ficam deitados (380 × 240).

// Cartões do HTML de referência (referencias/cartoes-numerados.html): número · bandeira · nome no site → modelo no catálogo
//   ITA-001  Visa                 Azul Gold Visa  →  itau-azul-gold-visa  (ainda fora do catálogo)
//   ITA-002  Visa                 Azul Infinite Visa  →  itau-azul-infinite
//   ITA-003  Visa                 Azul Internacional Visa  →  itau-azul-internacional-visa  (ainda fora do catálogo)
//   ITA-004  Visa                 Azul Platinum Visa  →  itau-azul-platinum
//   ITA-005  Visa                 Instituto Ayrton Senna Platinum Visa  →  itau-instituto-ayrton-senna-platinum-visa  (ainda fora do catálogo)
//   ITA-006  Visa                 Itaú Uniclass Signature Visa  →  itau-uniclass-signature
//   ITA-007  Visa                 Itaú Visa Platinum  →  itau-visa-platinum  (ainda fora do catálogo)
//   ITA-008  Visa                 LATAM Pass Itaú Gold Visa  →  itau-latam-pass-gold-visa  (ainda fora do catálogo)
//   ITA-009  Visa                 LATAM Pass Itaú Infinite Visa  →  itau-latam-pass-infinite-visa  (ainda fora do catálogo)
//   ITA-010  Visa                 LATAM Pass Itaú Internacional Visa  →  itau-latam-pass-internacional-visa  (ainda fora do catálogo)
//   ITA-011  Visa                 LATAM Pass Itaú Platinum Visa  →  itau-latam-pass-platinum-visa  (ainda fora do catálogo)
//   ITA-012  Visa                 Passaí Gold Visa  →  itau-passai-gold
//   ITA-013  Visa                 Samsung Itaú Platinum Visa  →  itau-samsung-platinum-visa  (ainda fora do catálogo)
//   ITA-014  Visa                 N Card (Netshoes) Gold Visa  →  itau-n-card-gold-visa  (ainda fora do catálogo)
//   ITA-015  Visa                 TIM Gold Visa  →  itau-tim-gold-visa  (ainda fora do catálogo)
//   ITA-016  Visa                 TIM Internacional Visa  →  itau-tim-internacional-visa  (ainda fora do catálogo)
//   ITA-017  Visa                 TIM Platinum Visa  →  itau-tim-platinum-visa  (ainda fora do catálogo)
//   ITA-018  Mastercard           Azul Gold Mastercard  →  itau-azul-gold-mastercard  (ainda fora do catálogo)
//   ITA-019  Mastercard           Azul Internacional Mastercard  →  itau-azul-internacional-mastercard  (ainda fora do catálogo)
//   ITA-020  Mastercard           Azul Itaú Mastercard Skyline  →  itau-azul-skyline
//   ITA-021  Mastercard           Azul Platinum Mastercard  →  itau-azul-platinum-mastercard  (ainda fora do catálogo)
//   ITA-022  Mastercard           Instituto Ayrton Senna Mastercard  →  itau-instituto-ayrton-senna-mastercard  (ainda fora do catálogo)
//   ITA-023  Mastercard           Itaú Platinum Mastercard  →  itau-platinum-mastercard  (ainda fora do catálogo)
//   ITA-024  Mastercard           Itaú Uniclass Black Mastercard  →  itau-uniclass-black-mastercard  (ainda fora do catálogo)
//   ITA-025  Mastercard           Itaú Uniclass Platinum Mastercard  →  itau-uniclass-platinum-mastercard  (ainda fora do catálogo)
//   ITA-026  Mastercard           LATAM Pass Itaú Black Mastercard  →  itau-latam-black
//   ITA-027  Mastercard           LATAM Pass Itaú Gold Mastercard  →  itau-latam-pass-gold-mastercard  (ainda fora do catálogo)
//   ITA-028  Mastercard           LATAM Pass Itaú Internacional Mastercard  →  itau-latam-pass-internacional-mastercard  (ainda fora do catálogo)
//   ITA-029  Mastercard           LATAM Pass Itaú Platinum Mastercard  →  itau-latam-pass-platinum-mastercard  (ainda fora do catálogo)
//   ITA-030  Mastercard           Personnalité Black Pontos Mastercard  →  itau-personnalite-black-pontos-mastercard  (ainda fora do catálogo)
//   ITA-031  Mastercard           Samsung Itaú Platinum Mastercard  →  itau-samsung-platinum-mastercard  (ainda fora do catálogo)
//   ITA-032  Mastercard           Player's Bank Platinum  →  itau-players-bank-platinum  (ainda fora do catálogo)
//   ITA-033  Mastercard           Pontofrio Internacional Mastercard  →  itau-pontofrio-internacional-mastercard  (ainda fora do catálogo)
//   ITA-034  Mastercard           TIM Gold Mastercard  →  itau-tim-gold-mastercard  (ainda fora do catálogo)
//   ITA-035  Mastercard           TIM Internacional Mastercard  →  itau-tim-internacional-mastercard  (ainda fora do catálogo)
//   ITA-036  Mastercard           TIM Platinum Mastercard  →  itau-tim-platinum-mastercard  (ainda fora do catálogo)
//   ITA-037  Mastercard           Personnalité Mastercard  →  itau-personnalite
//   ITA-038  Mastercard           Itaú Empresas Mastercard Black  →  itau-empresas-mastercard-black  (ainda fora do catálogo)
//   ITA-039  Visa e Mastercard    Itaú Empresas (varia conforme o contrato)  →  itau-empresas  (ainda fora do catálogo)
// fim da lista


registrarCartoes({
  layouts: {
    itau: (p) => {
      const { prod, tier, semTier, arte, tem, chipSvg, nfc, bandeira, info, band, e, LOGO } = p;
      // itaú (e a categoria) no alto à esquerda com o chip embaixo; LATAM PASS no alto à direita; bandeira embaixo
      const lp = /LATAM/.test(prod);
      return `<svg class="v3f-arte" viewBox="0 0 380 240" preserveAspectRatio="none" aria-hidden="true"><path d="M0 92h150l14 14v18H0zM0 136h210l14 14v18H0zM0 180h270l14 14v18H0z" fill="#fff" opacity=".07"/></svg>
        <span class="v3f-itop">${tem.has("itau") ? `<img src="${LOGO("itau")}" alt="Itaú">` : `<b>itaú</b>`}${tier ? `<b class="v3f-itier">${e(tier.toLowerCase())}</b>` : ""}</span>
        <span class="v3f-marca dir lp">${lp ? `<small>LATAM</small><b>PASS</b>` : `<b>${e(semTier(prod) || "")}</b>`}</span>
        <span class="v3f-chipw itc">${chipSvg}${nfc}</span>${info}${bandeira ? `<span class="v3f-band">${bandeira}</span>` : ""}`;
    },
  },
  modelos: {
    "itau-latam-black": "itau",
  },
  bancos: ["itau"],
  css: `
    .v3f.itau .v3f-band.topo{left:6%;right:auto;top:8%;bottom:auto;justify-items:start}
    .v3f.itau .v3f-band.topo .v3f-mcw{justify-items:start}
    .v3f-itop{left:6%;top:8%;display:flex;align-items:center;gap:2.4cqw}
    .v3f-itop img{display:block;width:9.5cqw;height:auto;filter:grayscale(1) invert(1) brightness(1.05);border-radius:1.6cqw}
    .v3f-itop b{font:700 5.4cqw/1 Manrope,sans-serif}
    .v3f-itop .v3f-itier{font-weight:600;font-size:5cqw;letter-spacing:.02em;opacity:.95}
    .v3f-chipw.itc{left:6%;top:37%}
    .v3f-marca.dir.lp{justify-items:end}
    .v3f-marca.lp small{font-size:3.4cqw;font-weight:700;letter-spacing:.14em;margin:0 0 .2cqw}
    .v3f-marca.lp b{font-size:7cqw;font-weight:500;letter-spacing:.04em}
    .v3f-itaul{right:6%;bottom:7%}
    .v3f-itaul img{display:block;width:9cqw;height:auto;filter:grayscale(1) invert(1) brightness(1.05);border-radius:1.6cqw}
    .v3f-itau{right:6%;bottom:8%;font:700 5.4cqw/1 Manrope,sans-serif;letter-spacing:-.02em;opacity:.9}
  `,
});

// cartoes/caixa.js
// Cartões — Caixa
// Parte do CoFinance: o montar.py junta esta pasta no co-finance-card.js. Os cartões ficam deitados (380 × 240).

// Cartões do HTML de referência (referencias/cartoes-numerados.html): número · bandeira · nome no site → modelo no catálogo
//   CX-001  Visa                 Caixa Sim / Mulher  →  caixa-sim
//   CX-002  Visa                 Visa Universitário  →  caixa-universitario
//   CX-003  Visa                 Gold Visa  →  caixa-gold
//   CX-004  Visa                 Platinum Visa  →  caixa-platinum
//   CX-005  Visa                 Visa Infinite  →  caixa-infinite
//   CX-006  Elo                  Elo Mais  →  caixa-elo-mais
//   CX-007  Elo                  Elo Grafite  →  caixa-platinum
//   CX-008  Elo                  Elo Nanquim  →  caixa-nanquim
//   CX-009  Elo                  Elo Diners Club  →  caixa-diners
// fim da lista


registrarCartoes({
  layouts: {
    caixa: (p) => {
      const { k, prod, tier, semTier, arte, chipSvg, nfc, info, band, e } = p;
      // Caixa: o X no alto à direita (laranja e branco nos coloridos, prata nos pretos, grafite no prata) e o nome no alto à esquerda
      const cm = { "caixa-platinum": [["#3d3f42", "#6d7074"], (tier || semTier(prod) || "platinum").toUpperCase(), "nivel"], "caixa-sim": [["#ffffff", "#f39200"], "Sim", "sim"],
        "caixa-universitario": [["#ffffff", "#f39200"], "UNIVERSITÁRIO", "fino"], "caixa-gold": [["#ffffff", "#f39200"], ""], "caixa-elo-mais": [["#ffffff", "#f39200"], ""],
        "caixa-infinite": [["#f2f2f3", "#9da0a5"], ""], "caixa-icone": [["#f2f2f3", "#9da0a5"], "ÍCONE", "fino"], "caixa-nanquim": [["#f2f2f3", "#9da0a5"], ""],
        "caixa-diners": [["#c8743a", "#eba66a"], "Diners Club", "diners"] }[k.modelo] || [["#ffffff", "#f39200"], semTier(prod)];
      const [xc, rot, est] = cm;
      return `${k.modelo === "caixa-platinum" ? `<svg class="v3f-arte" viewBox="0 0 380 240" preserveAspectRatio="none" aria-hidden="true"><path d="M0 240 380 0V240z" fill="#fff" opacity=".16"/><path d="M0 52h380" stroke="#000" stroke-opacity=".05"/></svg>` : ""}
        <svg class="v3f-cx" viewBox="0 0 60 50" aria-hidden="true"><path d="M2 2h18l38 46H40z" fill="${xc[0]}"/><path d="M58 2H40L2 48h18z" fill="${xc[1]}"/></svg>
        ${rot ? `<span class="v3f-marca"><small class="v3f-cxr ${est || ""}">${e(rot)}${est === "diners" ? "<i>INTERNATIONAL</i>" : ""}</small></span>` : ""}<span class="v3f-chipw">${chipSvg}${nfc}</span>${info}${band()}`;
    },
  },
  modelos: {
    "caixa-platinum": "caixa",
    "caixa-sim": "caixa",
    "caixa-universitario": "caixa",
    "caixa-gold": "caixa",
    "caixa-elo-mais": "caixa",
    "caixa-infinite": "caixa",
    "caixa-nanquim": "caixa",
    "caixa-diners": "caixa",
  },
  css: `
    .v3f-cx{position:absolute;right:6%;top:7%;width:17cqw;height:auto;z-index:1}
    .v3f.caixa .v3f-marca{top:12%}
    .v3f-cxr{font:500 3.4cqw/1 Manrope,sans-serif!important;letter-spacing:.06em}
    .v3f-cxr.nivel{color:#3b3f43}
    .v3f-cxr.sim{font:italic 500 7cqw/1 "Brush Script MT","Segoe Script",cursive!important;letter-spacing:0}
    .v3f-cxr.fino{font-size:2.8cqw!important;letter-spacing:.18em;opacity:.9}
    .v3f-cxr.diners{display:grid;font:600 4.6cqw/1 Georgia,"Times New Roman",serif!important;letter-spacing:0;color:#e3b877}
    .v3f-cxr.diners i{font:500 2.2cqw/1.4 Georgia,serif;font-style:normal;letter-spacing:.12em}
  `,
});

// cartoes/btg.js
// Cartões — BTG Pactual
// Parte do CoFinance: o montar.py junta esta pasta no co-finance-card.js. Os cartões ficam deitados (380 × 240).

// Cartões do HTML de referência (referencias/cartoes-numerados.html): número · bandeira · nome no site → modelo no catálogo
//   BTG-001  Mastercard           Ultrablue World Legend  →  btg-ultrablue-world-legend
//   BTG-002  Mastercard           Ultrablue  →  btg-ultrablue
//   BTG-003  Mastercard           Black  →  btg-black
//   BTG-004  Mastercard           Platinum  →  btg-platinum
//   BTG-005  Mastercard           Gold  →  btg-gold
//   BTG-006  Mastercard           TAP BTG Black  →  btg-tap-black
// fim da lista


registrarCartoes({
  layouts: {
    btg: (p) => {
      const { prod, semTier, tem, logo, chipSvg, nfc, info, band, e } = p;
      // BTG Ultrablue: azul escovado, "btg pactual" no alto à direita com o arco, o produto à esquerda
      return `${tem.has("btg") ? `<span class="v3f-btgl">${logo("btg", "btgl")}<b class="v3f-sr">BTG Pactual</b></span>` : `<span class="v3f-btg"><b><i aria-hidden="true"></i>btg</b><small>pactual</small></span>`}
        <span class="v3f-marca"><b class="v3f-btgp">${e(semTier(prod) ? semTier(prod).toLowerCase().replace(/^./, (s) => s.toUpperCase()) : "")}</b></span><span class="v3f-chipw">${chipSvg}${nfc}</span>${info}${band()}`;
    },
  },
  modelos: {
    "btg-ultrablue": "btg",
  },
  bancos: ["btg"],
  css: `
    .v3f-btgl{right:5%;top:5%}
    .v3f-logo.btgl{width:40cqw;height:11cqw;-webkit-mask-position:right center;mask-position:right center}
    .v3f-btg{right:6%;top:8%;display:flex;align-items:baseline;gap:1.2cqw;color:#fff}
    .v3f-btg b{position:relative;font:500 8cqw/1 Manrope,sans-serif;letter-spacing:-.02em;padding:0 1cqw}
    .v3f-btg b i{position:absolute;left:-1.6cqw;top:-2.4cqw;width:13cqw;height:13cqw;border:.5cqw solid #fff;border-radius:50%;border-left-color:transparent;transform:rotate(-30deg)}
    .v3f-btg small{font:400 6cqw/1 Manrope,sans-serif;letter-spacing:-.01em}
    .v3f-btgp{font:500 4.6cqw/1 Manrope,sans-serif!important;letter-spacing:.01em}
    .v3f.btg .v3f-marca{top:22%}
  `,
});

// cartoes/brb.js
// Cartões — BRB (BRBCARD)
// Parte do CoFinance: o montar.py junta esta pasta no co-finance-card.js. Os cartões ficam deitados (380 × 240).

// Cartões do HTML de referência (referencias/cartoes-numerados.html): número · bandeira · nome no site → modelo no catálogo
//   BRB-001  Visa                 BRBCARD Visa Infinite  →  brb-visa-infinite
//   BRB-002  Visa                 BRBCARD Visa Platinum  →  brb-visa-platinum
//   BRB-003  Visa                 BRBCARD Visa Gold  →  brb-visa-gold
//   BRB-004  Visa                 BRBCARD Visa Connect  →  brb-connect
//   BRB-005  Mastercard           BRBCARD Mastercard Black  →  brb-mastercard-black
//   BRB-006  Mastercard           BRBCARD Mastercard Platinum  →  brb-mastercard-platinum
//   BRB-007  Mastercard           BRBCARD Mastercard Gold  →  brb-mastercard-gold
//   BRB-008  Mastercard           BRBCARD Mastercard Connect  →  brb-mastercard-connect
//   BRB-009  Visa e Mastercard    Nação BRB FLA (imagem com vários cartões, Visa e Mastercard)  →  brb-nacao-brb-fla
// fim da lista


registrarCartoes({
  layouts: {
    brb: (p) => {
      const { k, prod, semTier, chipSvg, nfc, bandeira, info, band, e } = p;
      // BRB Connect: azul em degradê, BRB em pé à direita, "connect" à esquerda, bandeira no alto à direita
      return `<span class="v3f-vert dir"><small>banco</small><b>BRB</b></span><span class="v3f-chipw brbc">${nfc}${chipSvg}</span>
        <span class="v3f-brbn">${e(semTier(prod) ? semTier(prod).toLowerCase() : !k.modelo || k.modelo === "brb-connect" ? "connect" : "")}</span>${info}${bandeira ? `<span class="v3f-band topo">${bandeira}</span>` : ""}`;
    },
  },
  // os cartões BRB são em pé: a foto (guardada deitada) aparece desvirada, igual ao cartão
  fotosEmPe: ["brb-connect", "brb-mastercard-connect", "brb-mastercard-black", "brb-mastercard-gold", "brb-mastercard-platinum",
    "brb-visa-gold", "brb-visa-infinite", "brb-visa-platinum"],
  bancos: ["brb"],
  css: `
    .v3f-chipw.brbc{top:16%;left:13%}
    .v3f-brbn{left:6%;top:56%;font:500 4cqw/1 Manrope,sans-serif;letter-spacing:.02em}
  `,
});

// cartoes/inter.js
// Cartões — Inter
// Parte do CoFinance: o montar.py junta esta pasta no co-finance-card.js. Os cartões ficam deitados (380 × 240).

// Cartões do HTML de referência (referencias/cartoes-numerados.html): número · bandeira · nome no site → modelo no catálogo
//   INT-001  Mastercard           Inter Gold  →  inter-laranja
//   INT-002  Mastercard           Inter Platinum  →  inter-platinum
//   INT-003  Mastercard           Inter Prime  →  inter-prime
//   INT-004  Mastercard           Inter Win  →  inter-win
// fim da lista


registrarCartoes({
  layouts: {
    inter: (p) => {
      const { prod, semTier, tem, logo, chipSvg, nfc, bandeira, info, band, e } = p;
      // Inter: laranja, "inter" em pé à direita, chip no alto à esquerda, bandeira no alto à direita
      return `<span class="v3f-vert dir int">${tem.has("inter") ? `<span class="v3f-intl">${logo("inter", "intl")}</span><b class="v3f-sr">inter</b>` : "<b>inter</b>"}${semTier(prod) ? `<small class="v3f-intp">${e(semTier(prod).toLowerCase())}</small>` : ""}</span><span class="v3f-chipw intc">${nfc}${chipSvg}</span>${info}${bandeira ? `<span class="v3f-band topo">${bandeira}</span>` : ""}`;
    },
  },
  bancos: ["inter"],
  css: `
    .v3f-intp{font:500 3.6cqw/1 Manrope,sans-serif!important;font-style:normal!important;margin:0 0 0 .8cqw!important}
    .v3f-intl{display:block;transform:rotate(180deg)}
    .v3f-logo.intl{width:9cqw;height:20cqw;transform:rotate(-90deg)}
    .v3f-vert.int b{font-style:normal;font-weight:700;font-size:11cqw;letter-spacing:-.02em}
  `,
});

// cartoes/c6.js
// Cartões — C6 Bank
// Parte do CoFinance: o montar.py junta esta pasta no co-finance-card.js. Os cartões ficam deitados (380 × 240).

// Cartões do HTML de referência (referencias/cartoes-numerados.html): número · bandeira · nome no site → modelo no catálogo
//   C6-001  Mastercard           C6 Carbon Mastercard Black  →  c6-carbon
//   C6-002  Mastercard           C6 Black  →  c6-black
//   C6-003  Mastercard           C6 Platinum  →  c6-platinum
//   C6-004  Mastercard           C6 (básico)  →  c6-basico  (ainda fora do catálogo)
//   C6-005  Mastercard           C6 Business  →  c6-business  (ainda fora do catálogo)
//   C6-006  Mastercard           C6 Graphene World Legend  →  c6-graphene
//   C6-007  Mastercard           C6 – cor Sunset  →  c6-sunset
//   C6-008  Mastercard           C6 – cor Bubblegum  →  c6-bubblegum
//   C6-009  Mastercard           C6 – cor Red  →  c6-red
//   C6-010  Mastercard           C6 – cor Gold  →  c6-gold
//   C6-011  Mastercard           C6 – cor Pink  →  c6-pink
//   C6-012  Mastercard           C6 – cor Boreal Forest  →  c6-boreal-forest
//   C6-013  Mastercard           C6 – cor Silver  →  c6-silver
//   C6-014  Mastercard           C6 – cor Rainbow  →  c6-rainbow
//   C6-015  Mastercard           C6 – cor Acqua  →  c6-acqua
//   C6-016  Mastercard           C6 – cor Blue  →  c6-blue
// fim da lista


// C6 em pé (como o cartão): categoria no alto à esquerda, chip em pé no alto com a aproximação, Mastercard embaixo à esquerda
// e "C6 BANK" embaixo à direita. Fundo: as cores de cada foto numa grade 4 × 6, desfocada (o degradê do cartão).
const C6V = {"c6-carbon": {"g": ["232322", "272726", "252525", "212120", "262625", "2e2e2c", "2d2d2b", "222221", "292928", "30312f", "2e2e2d", "222221", "252524", "2d2d2b", "2b2b29", "1f1f1d", "20201f", "252524", "222221", "181817", "20201f", "1b1b1a", "171817", "111110"], "cat": ["Carbon", "Black"], "logo": "#ffffff", "txt": "#ffffff", "metal": true}, "c6-black": {"g": ["1a1a1a", "191919", "181818", "171717", "181818", "181818", "161616", "141414", "171717", "151515", "121212", "101010", "141414", "111111", "0f0f0f", "0c0c0c", "111111", "0e0e0e", "0b0b0b", "090909", "131313", "0b0b0b", "090909", "060606"], "cat": ["Black", ""], "logo": "#ffffff", "txt": "#ffffff", "metal": true}, "c6-platinum": {"g": ["a9a293", "bfb9ac", "d0c9be", "d7d0c5", "aca99e", "c0bcb2", "c6c1b7", "c8c2b7", "afafa7", "b5b3ab", "b5b2a8", "b5b0a5", "a0a39b", "9fa098", "9d9d93", "9d9b90", "888f86", "868a82", "83867d", "828378", "808780", "6d736d", "696e68", "666962"], "cat": ["Platinum", ""], "logo": "#ffffff", "txt": "#ffffff", "metal": false}, "c6-basico": {"g": ["f87d69", "fb9d7c", "feb587", "febf89", "f68587", "f9a197", "fba995", "fcab88", "f47f96", "f68c98", "f79090", "f89184", "f06690", "f16b89", "f27082", "f3727a", "e55b8d", "ea547e", "ec5373", "ed556a", "e35a8c", "d94c78", "dd466c", "e3415e"], "cat": null, "logo": "#ffffff", "txt": "#ffffff", "metal": false}, "c6-graphene": {"g": ["a1a1a1", "a0a0a0", "afafaf", "bbbbbb", "848484", "989898", "a9a9a9", "aaaaaa", "797979", "8b8b8b", "959595", "969696", "717171", "787878", "7e7e7e", "858585", "707070", "737373", "767676", "868686", "7c7c7c", "898989", "8c8c8c", "9e9e9e"], "cat": ["Graphene", "world legend"], "logo": "#6a6a6a", "txt": "#5c5c5c", "metal": true}, "c6-sunset": {"g": ["f87d69", "fb9d7c", "feb587", "febf89", "f68587", "f9a197", "fba994", "fcab88", "f47f96", "f68c98", "f79090", "f89184", "f06690", "f16b89", "f27082", "f3727a", "e55b8d", "ea547e", "ec5373", "ed556a", "e35a8c", "d94c78", "dd466c", "e3415e"], "cat": null, "logo": "#ffffff", "txt": "#ffffff", "metal": false}, "c6-bubblegum": {"g": ["fe3497", "fe3a9b", "fe3d9d", "ff44a2", "ff4ca7", "ff51ab", "ff59b1", "ff58b0", "ff56ae", "ff52ab", "ff4ba6", "ff44a0", "ff3a99", "ff3493", "ff2e8e", "fe298a", "fe2686", "fc2381", "fb207d", "fa1f79", "fd2582", "f81c72", "f7196d", "f6186b"], "cat": null, "logo": "#ffffff", "txt": "#ffffff", "metal": false}, "c6-red": {"g": ["e65448", "e45347", "e55347", "e15145", "e35246", "e45346", "dc4f44", "d44c40", "e15145", "d94d42", "d04a3f", "c8463c", "d54c40", "cc483d", "c4453a", "bc4137", "ca483d", "c14339", "b83f36", "b03c33", "c6483e", "b43f36", "ad3b32", "a5382f"], "cat": null, "logo": "#ffffff", "txt": "#ffffff", "metal": false}, "c6-gold": {"g": ["e3b35a", "e9bc61", "edc266", "f3cb6e", "f0c86b", "f5ce6f", "f8d171", "f6cf6f", "f7d070", "f3cd6e", "eec76a", "e8c065", "ebc367", "e4bc61", "ddb35a", "d6ab53", "dcb259", "d4a850", "cc9e48", "c59641", "d6aa53", "c2923e", "bb8a37", "b48230"], "cat": null, "logo": "#ffffff", "txt": "#2e2e2e", "metal": false}, "c6-pink": {"g": ["e8c3c3", "eccece", "eed5d5", "eed6d6", "edd2d2", "eed6d6", "eed4d4", "ecd1d1", "eed5d5", "edd3d3", "eccfcf", "eacccc", "ecd1d1", "ebcdcd", "e9caca", "e8c7c7", "ebcdcd", "e9c9c9", "e7c5c5", "e6c1c1", "edcdcd", "e8c4c4", "e6c0c0", "e5bdbd"], "cat": null, "logo": "#ffffff", "txt": "#2e2e2e", "metal": false}, "c6-boreal-forest": {"g": ["a9a293", "bfb9ac", "d0c9be", "d7d0c5", "aca99e", "c0bcb3", "c6c1b7", "c8c2b7", "afafa7", "b5b3ab", "b5b2a8", "b5b0a5", "a0a39b", "9fa098", "9d9d93", "9d9b90", "888f86", "868a82", "83867d", "828378", "808780", "6d736d", "696e68", "666962"], "cat": null, "logo": "#ffffff", "txt": "#ffffff", "metal": false}, "c6-silver": {"g": ["efefef", "ededed", "ededed", "ebebeb", "ececec", "ededed", "e8e8e8", "e2e2e2", "ebebeb", "e5e5e5", "dfdfdf", "dadada", "e2e2e2", "dddddd", "d7d7d7", "d2d2d2", "dbdbdb", "d5d5d5", "cfcfcf", "c9c9c9", "dadada", "cdcdcd", "c7c7c7", "c2c2c2"], "cat": null, "logo": "#8c8c8c", "txt": "#2e2e2e", "metal": false}, "c6-rainbow": {"g": ["a19ab1", "abbfd4", "c4d7e2", "d5e2e8", "abafbf", "c5d4e1", "ccdde8", "cadae3", "d4cbd8", "d4dae4", "cbd6e0", "bbcdda", "ccc8d8", "bfb2ca", "c3b4c5", "a5b9c6", "b5a8c2", "a5a0bb", "a4adb8", "96a8b1", "b09cb8", "a5849a", "b08b7c", "94968a"], "cat": null, "logo": "#ffffff", "txt": "#2e2e2e", "metal": false}, "c6-acqua": {"g": ["38afb7", "38afb7", "38afb7", "3cb0b8", "37aeb6", "37aeb6", "38afb7", "37aeb6", "37aeb6", "37aeb6", "37aeb6", "37aeb6", "37aeb6", "37aeb6", "37aeb6", "37aeb6", "38afb7", "37aeb6", "37aeb6", "37aeb6", "3bb2ba", "39b0b8", "38afb7", "38afb7"], "cat": null, "logo": "#ffffff", "txt": "#ffffff", "metal": false}, "c6-blue": {"g": ["666e85", "656d84", "656e84", "636c82", "646c83", "646d84", "61697f", "5c6479", "636c82", "5e677c", "5a6276", "565d71", "5c6479", "586074", "535b6e", "4f5668", "575e72", "52596c", "4d5465", "494f60", "575e71", "4c5263", "484e5e", "434958"], "cat": null, "logo": "#ffffff", "txt": "#ffffff", "metal": false}};


registrarCartoes({
  layouts: {
    c6v: (p) => {
      const { k, chipSvg, nfc, info, e, LOGO, tem } = p;
      const d = C6V[k.modelo] || C6V["c6-basico"], id = e(k.id);
      // as células da borda passam da borda (o desfoque não clareia os cantos)
      const rects = d.g.map((c, i) => { const cx = i % 4, cy = Math.floor(i / 4), x = cx ? cx * 60 : -60, y = cy ? cy * 63.4 : -60; return `<rect x="${x}" y="${y}" width="${(cx ? 60 : 120) + (cx === 3 ? 60 : 0) + 1}" height="${(cy ? 63.4 : 123.4) + (cy === 5 ? 60 : 0) + 1}" fill="#${c}"/>`; }).join("");
      const carbono = k.modelo === "c6-carbon" ? `<pattern id="cb${id}" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3.5" height="3.5" fill="#fff" opacity=".06"/><rect x="3.5" y="3.5" width="3.5" height="3.5" fill="#fff" opacity=".06"/><rect x="3.5" width="3.5" height="3.5" fill="#000" opacity=".18"/><rect y="3.5" width="3.5" height="3.5" fill="#000" opacity=".18"/></pattern>` : "";
      const mc = d.metal
        ? `<span class="v3f-c6mc"><svg viewBox="0 0 48 30" aria-label="Mastercard"><defs><linearGradient id="ma${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d9dadc"/><stop offset="1" stop-color="#5d5f63"/></linearGradient></defs><circle cx="16" cy="15" r="13" fill="url(#ma${id})"/><circle cx="32" cy="15" r="13" fill="url(#ma${id})" fill-opacity=".8" stroke="#eee" stroke-width=".6"/></svg><b style="color:${d.txt}">mastercard</b></span>`
        : `<span class="v3f-c6mc"><svg viewBox="0 0 48 30" aria-label="Mastercard"><circle cx="16" cy="15" r="13" fill="#eb001b"/><circle cx="32" cy="15" r="13" fill="#f79e1b"/><path d="M24 4.8a13 13 0 0 1 0 20.4 13 13 0 0 1 0-20.4z" fill="#ff5f00"/></svg></span>`;
      return `<svg class="v3f-arte" viewBox="0 0 240 380" preserveAspectRatio="none" aria-hidden="true"><defs><filter id="cf${id}" x="-60" y="-60" width="360" height="500" filterUnits="userSpaceOnUse"><feGaussianBlur stdDeviation="24"/></filter>${carbono}</defs>`
        + `<g filter="url(#cf${id})">${rects}</g>${carbono ? `<rect width="240" height="380" fill="url(#cb${id})"/>` : ""}</svg>
        <span class="v3f-ow" style="color:${d.txt};--ct:${d.txt}">${d.cat ? `<span class="v3f-c6cat"><b>${e(d.cat[0])}</b>${d.cat[1] ? `<small>${e(d.cat[1])}</small>` : ""}</span>` : ""}
        <span class="v3f-c6chip">${chipSvg}</span><span class="v3f-c6nfc">${nfc}</span>${info}${mc}
        ${tem.has("c6") ? `<i class="v3f-logo v3f-c6lv" style="--logo:url('${LOGO("c6")}');background:${d.logo}" role="img" aria-label="C6 Bank"></i>` : `<b class="v3f-c6lt" style="color:${d.logo}">C6 BANK</b>`}</span>`;
    },
    c6: (p) => {
      const { k, prod, tier, semTier, tem, logo, chipSvg, nfc, bandeira, info, band, e } = p;
      // C6 Carbon: fibra de carbono, "C6 BANK" em pé à direita, o nível em pé à esquerda, bandeira embaixo à direita
      return `${tem.has("c6") ? `<span class="v3f-c6l">${logo("c6", "c6l")}<b class="v3f-sr">C6 Bank</b></span>` : `<span class="v3f-vert dir c6"><b>C6</b><small>BANK</small></span>`}<span class="v3f-chipw c6c">${nfc}${chipSvg}</span>
        ${k.modelo === "c6-carbon" ? `<span class="v3f-vert c6n"><b>${e(semTier(prod) || "Carbon")}</b><small>${e(tier ? tier.toLowerCase().replace(/^./, (s) => s.toUpperCase()) : "Black")}</small></span>`
          : prod ? `<span class="v3f-vert c6n"><small>${e(prod.toLowerCase().replace(/^./, (s) => s.toUpperCase()))}</small></span>` : ""}${info}${band("c6b")}`;
    },
  },
  modelos: Object.fromEntries(Object.keys(C6V).map((m) => [m, "c6v"])),
  verticais: ["c6v"],
  bancos: ["c6"],
  css: `
    .v3 .fcface.v3f.c6v{background:none}.v3 .fcface.v3f.c6v::before{display:none}
    .v3f-c6cat{left:6.5%;top:5.5%;display:grid;line-height:1.1}.v3f-c6cat b{font:600 6.6cqw/1.1 Manrope,sans-serif}.v3f-c6cat small{font:400 6.2cqw/1.1 Manrope,sans-serif;opacity:.85}
    .v3f-c6chip{left:48%;top:10.5%}.v3f-c6chip .v3f-chip{width:21cqw;height:auto;transform:rotate(90deg)}
    .v3f-c6nfc{left:70%;top:15%}.v3f-c6nfc .v3f-nfc{width:10cqw;height:10cqw;color:inherit;opacity:1}
    .v3f-c6mc{left:6%;bottom:5%;display:grid;justify-items:center;line-height:1}.v3f-c6mc svg{display:block;width:32cqw;height:auto}.v3f-c6mc b{font:600 5.2cqw/1.2 Arial,sans-serif;margin-top:.5cqw}
    .v3f-logo.v3f-c6lv{position:absolute;right:6%;bottom:9%;width:45cqw;height:9cqw;-webkit-mask-position:right center;mask-position:right center}
    .v3f-c6lt{position:absolute;right:6%;bottom:9%;font:800 8cqw/1 Manrope,sans-serif}
    .v3f-c6l{right:2%;top:24%;transform:rotate(-90deg);transform-origin:center}
    .v3f-logo.c6l{width:30cqw;height:6cqw}
    .v3f-vert.c6{top:7%;bottom:auto;display:flex;align-items:center;gap:1cqw}
    .v3f-vert.c6 b{font:900 8cqw/1 Manrope,sans-serif;font-style:normal;letter-spacing:-.04em}
    .v3f-vert.c6 small{font:300 6.4cqw/1 Manrope,sans-serif;font-style:normal;letter-spacing:.02em;margin:0}
    .v3f-chipw.c6c{flex-direction:column;align-items:flex-start;top:18%;left:13%;gap:1.4cqw}
    .v3f-vert.c6n{left:4%;top:auto;bottom:34%;display:flex;gap:.6cqw}
    .v3f-vert.c6n b{font:700 3.6cqw/1 Manrope,sans-serif}
    .v3f-vert.c6n small{font:300 3.6cqw/1 Manrope,sans-serif;font-style:italic;margin:0}
  `,
});

// cartoes/outros.js
// Cartões — Outros (Wise, Alelo e o desenho genérico dos demais bancos)
// Parte do CoFinance: o montar.py junta esta pasta no co-finance-card.js. Os cartões ficam deitados (380 × 240).

// Cartões do HTML de referência (referencias/cartoes-numerados.html): número · bandeira · nome no site → modelo no catálogo
//   INF-001  Mastercard           InfinitePay (imagem com várias cores do cartão)  →  infinitepay-infinitepay
//   NUB-001  Mastercard           Nubank (roxo) – foto do cartão  →  nubank-roxo
//   NUB-002  Mastercard           Nubank Croma Mastercard Platinum  →  nubank-croma
//   NUB-003  Mastercard           Nubank Ultravioleta Mastercard Black  →  nubank-ultravioleta
// fim da lista


registrarCartoes({
  layouts: {
    wise: (p) => {
      const { arte, tem, info, band, LOGO } = p;
      // Wise: verde, a marca grande no alto, sem chip, VISA embaixo
      return `${tem.has(arte) ? `<img class="v3f-arte" src="${LOGO(arte)}" alt="">` : `<b class="v3f-wisen">wise</b>`}${info}${band()}`;
    },
    alelo: (p) => {
      const { k, arte, tem, logo, info, e, LOGO } = p;
      // Alelo: verde-limão, linhas com talheres e copo, mancha do logo e os saldos embaixo dela
      return `${tem.has(arte) ? `<img class="v3f-arte" src="${LOGO(arte)}" alt="">` : `<b class="v3f-alelon">alelo</b>`}<span class="v3f-alprod">${e(String(k.visual?.produto || { refeicao: "refeição", alimentacao: "alimentação", multi: "multibenefício" }[k.beneficio_de] || "refeição · alimentação").toLowerCase())}</span>${info}`;
    },
    outro: (p) => {
      const { k, prod, semTier, bid, tem, logo, chipSvg, nfc, info, band, e } = p;
      const nb = bid === "nubank" && !tem.has("nubank") ? "nu" : p.nomeBanco() || k.apelido || k.nome;  // outros bancos: logo (se o arquivo existir) ou o nome, e o modelo embaixo
      return `<span class="v3f-marca">${bid && tem.has(bid) ? `${logo(bid, "gen")}<b class="v3f-sr">${e(nb)}</b>` : `<b${bid === "nubank" ? ' class="v3f-nu"' : ""}>${e(nb)}</b>`}${semTier(prod) ? `<small>${e(semTier(prod))}</small>` : ""}</span><span class="v3f-chipw">${chipSvg}${nfc}</span>${info}${band()}`;
    },
  },
  modelos: {
    "wise-verde": "wise",
    "alelo-refeicao": "alelo",
  },
  bancos: ["wise", "alelo"],
  css: `
    .v3f-nu{font:800 11cqw/1 Manrope,sans-serif!important;letter-spacing:-.06em!important}
    .v3f-wisen{left:2%;top:-6%;font:italic 800 31cqw/1 Manrope,sans-serif;letter-spacing:-.04em;color:rgba(0,0,0,.1)}
    .v3f-alelon{left:50%;top:14%;transform:translateX(-50%);padding:2cqw 7cqw;border-radius:99px;background:#347756;color:#fff;font:700 9cqw/1 Manrope,sans-serif}
    .v3f-alprod{left:0;right:0;top:41.5%;text-align:center;font:500 2.7cqw/1 Manrope,sans-serif;letter-spacing:.06em;color:#2f6b3f}
    .v3f-logo.gen{width:30cqw;height:7.5cqw;background:currentColor}
    .v3f:not(.preto) .v3f-logo.gen{background:var(--ct)}
  `,
});


// ----- compras-v3-card -------------------------------------------------------

// =============================================================================
// Central de Compras v3 — visual do protótipo (fundo creme, verde, Manrope/Sora, menu lateral)
//
// Mesmo motor da v2 (que usa o compras-card): dados, script, sino, contas, janelas de edição. Este arquivo
// troca a estrutura (menu lateral no computador, abas em cima no celular), o Resumo e a janela da compra
// (uma página só: etiquetas, caminho do dinheiro, cupom, editar). A pagar, Áreas, Compras e Produtos ainda
// usam as telas atuais, por dentro do visual novo, até serem refeitas (etapas 2 e 3).
//
// Uso no painel:  type: custom:compras-v3-card
// =============================================================================

// compras-v2-card: incluído acima
const BaseNova = ComprasCard;  // mesmo arquivo
// CARTOES: incluído acima (codigo/cartoes/)

const V3_VERSION = "0.0.10";  // a versão da integração (rodapé)
const V3_MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const V3_SEMANA = ["S", "T", "Q", "Q", "S", "S", "D"];  // começa na segunda
const V3_ESCURO = "compras-v3:escuro";
const V3_BANCOS = { santander: "Santander", bb: "Banco do Brasil", bradesco: "Bradesco", itau: "Itaú" };
const V3_NA_HORA = ["Débito", "Pix", "Benefício", "Dinheiro", "Saldo em carteira", "Boleto"];
const V3_MENU = [["inicio", "Resumo", "grade"], ["contas", "A pagar", "cartao"], ["gastos", "Áreas", "areas"], ["compras", "Compras", "sacola"], ["produtos", "Produtos", "etiqueta"]];

// ícones de traço (24×24); a engrenagem é cheia
const V3_IC = {
  atualizar: '<path d="M20 12a8 8 0 1 1-2.34-5.66"/><path d="M20 4v5h-5"/>',
  grade: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/>',
  cartao: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19"/>',
  areas: '<circle cx="7" cy="17" r="3.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.2"/><path d="M12 3.5l4 7H8z"/>',
  sacola: '<path d="M5 8h14l-1.2 12H6.2z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
  etiqueta: '<path d="M3.5 12.5V4.5a1 1 0 0 1 1-1h8l8.5 8.5-9 9z"/><circle cx="8" cy="8" r="1.4"/>',
  lua: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',
  sino: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  fechar: '<path d="M6 6l12 12M18 6 6 18"/>',
  recibo: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  celular: '<rect x="7" y="2.5" width="10" height="19" rx="2.2"/><path d="M11 18.5h2"/>',
  lapis: '<path d="M4 20h4L19.5 8.5l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  sobe: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  desce: '<path d="M3 7l6 6 4-4 8 8"/><path d="M15 17h6v-6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  relogio: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  esq: '<path d="M15 6l-6 6 6 6"/>',
  dir: '<path d="M9 6l6 6-6 6"/>',
  seta: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  alerta: '<path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5M12 17.5v.01"/>',
  conta: '<path d="M7 3h10l2 3v15H5V6z"/><path d="M9 11h6M9 15h6"/>',
  busca: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
  enviar: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5"/><path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
  carro: '<path d="M3.5 13.5 5.5 8h13l2 5.5V18h-17z"/><circle cx="7.5" cy="15.5" r="1.4"/><circle cx="16.5" cy="15.5" r="1.4"/>',
};
const V3_ENGRENAGEM = "M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z";
const V3_SVG = (k) => k === "engrenagem"
  ? `<svg class="v3-ic" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="${V3_ENGRENAGEM}"/></svg>`
  : `<svg class="v3-ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${V3_IC[k]}</svg>`;

// Manrope (texto) e Sora (números e títulos): a fonte carrega uma vez para a página toda; sem internet, fica a do sistema
function v3Fontes() {
  if (document.getElementById("v3-fontes")) return;
  const l = document.createElement("link");
  l.id = "v3-fontes"; l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Sora:wght@600;700&display=swap";
  document.head.appendChild(l);
}

// logotipos: arquivos em logos/ ao lado do card.
// Descobre uma vez quais existem; sem o arquivo, o cartão mostra o nome escrito
const V3_LOGOS = ["bradesco", "santander", "bb", "itau", "visa"];
// logos dos bancos e desenhos de cartão: na pasta logos/ ao lado deste arquivo (na integração, /co_finance_cards/logos/).
// Sem o arquivo, o nome aparece escrito.
const V3_LOGOS_BASE = new URL("./logos/", import.meta.url).href;
const V3_LOGO = (n) => `${V3_LOGOS_BASE}${n}.svg`;
// bandeiras além de Visa e Mastercard: desenho simples de cada marca (formas e letras), para o canto do cartão
// bandeiras desenhadas no formato do logo de verdade (referência: os logos nos sites dos bancos). Como o Mastercard: cor = true
// (cartão claro ou colorido) nas cores da bandeira; cor = false (cartão escuro) numa cor só, a das letras do cartão (prata nos pretos)
const V3_C = (cor, oficial) => (cor ? oficial : "currentColor");
const V3_BANDEIRA = {
  Elo: (cor) => `<svg class="v3f-bd elo" viewBox="0 0 120 40" aria-label="Elo">
    ${cor ? `<path d="M31 20A13 13 0 0 0 8.8 10.8" fill="none" stroke="#ffcb05" stroke-width="6.5"/><path d="M8.8 10.8A13 13 0 0 0 8.8 29.2" fill="none" stroke="#00a4e0" stroke-width="6.5"/><path d="M8.8 29.2A13 13 0 0 0 27.2 29.2" fill="none" stroke="#ef4123" stroke-width="6.5"/>`
      : `<path d="M31 20A13 13 0 1 0 27.2 29.2" fill="none" stroke="currentColor" stroke-width="6.5"/>`}
    <path d="M1 20h30" stroke="${V3_C(cor, "#1d1d1b")}" stroke-width="6.5"/><path d="M47 4v32" stroke="${V3_C(cor, "#1d1d1b")}" stroke-width="6.5"/>
    <circle cx="80" cy="20" r="13" fill="none" stroke="${V3_C(cor, "#1d1d1b")}" stroke-width="6.5"/><path d="M93 20h26" stroke="${V3_C(cor, "#1d1d1b")}" stroke-width="6.5"/></svg>`,
  Amex: (cor) => `<svg class="v3f-bd amex" viewBox="0 0 60 40" aria-label="American Express">
    <rect x="1" y="1" width="58" height="38" rx="3" fill="${cor ? "#016fd0" : "none"}" stroke="${cor ? "#016fd0" : "currentColor"}" stroke-width="2"/>
    <g font-family="Arial Black,Arial,Helvetica,sans-serif" font-weight="900" font-size="13" fill="${cor ? "#fff" : "currentColor"}">
    <text x="30" y="18.5" text-anchor="middle" textLength="50" lengthAdjust="spacingAndGlyphs">AMERICAN</text>
    <text x="30" y="32.5" text-anchor="middle" textLength="46" lengthAdjust="spacingAndGlyphs">EXPRESS</text></g></svg>`,
  Hipercard: (cor) => `<svg class="v3f-bd hiper" viewBox="0 0 96 34" aria-label="Hipercard">
    ${cor ? `<path d="M10 1h84l-8 32H2z" fill="#b3131b"/>` : ""}
    <text x="48" y="23.5" text-anchor="middle" textLength="76" lengthAdjust="spacingAndGlyphs" font-family="Arial,Helvetica,sans-serif" font-style="italic" font-weight="700" font-size="19" fill="${cor ? "#fff" : "currentColor"}">Hipercard</text></svg>`,
  Diners: (cor) => `<svg class="v3f-bd diners" viewBox="0 0 40 40" aria-label="Diners Club">
    ${cor ? `<circle cx="20" cy="20" r="19" fill="#0079be"/>` : ""}
    <circle cx="20" cy="20" r="${cor ? 13.5 : 17}" fill="none" stroke="${cor ? "#fff" : "currentColor"}" stroke-width="${cor ? 4 : 2.4}"/>
    <path d="M15 ${cor ? 10 : 7}v${cor ? 20 : 26}M25 ${cor ? 10 : 7}v${cor ? 20 : 26}" stroke="${cor ? "#fff" : "currentColor"}" stroke-width="${cor ? 3.5 : 2.4}"/></svg>`,
  Discover: (cor) => `<svg class="v3f-bd" viewBox="0 0 110 22" aria-label="Discover"><g font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="21" fill="${V3_C(cor, "#231f20")}">
    <text x="0" y="18.5" textLength="44" lengthAdjust="spacingAndGlyphs">DISC</text><text x="65" y="18.5" textLength="45" lengthAdjust="spacingAndGlyphs">VER</text></g>
    <circle cx="55" cy="11.2" r="9.2" fill="#f47216"/></svg>`,
  JCB: (cor) => `<svg class="v3f-bd jcb" viewBox="0 0 66 40" aria-label="JCB">
    ${[["#0b4ea2", "J", 1], ["#d71e28", "C", 23], ["#009c4a", "B", 45]].map(([c, l, x]) => `<rect x="${x}" y="1" width="20" height="38" rx="6" fill="${cor ? c : "none"}" stroke="${cor ? c : "currentColor"}" stroke-width="2"/>
    <text x="${x + 10}" y="28" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="900" font-size="20" fill="${cor ? "#fff" : "currentColor"}">${l}</text>`).join("")}</svg>`,
  UnionPay: (cor) => `<svg class="v3f-bd jcb" viewBox="0 0 76 44" aria-label="UnionPay">
    ${[["#e21836", 1, 1], ["#00447c", 26, 0.75], ["#007b84", 51, 0.5]].map(([c, x, o]) => `<path d="M${x + 6} 1h20l-6 42H${x}z" fill="${cor ? c : "currentColor"}" ${cor ? "" : `opacity="${o}"`}/>`).join("")}
    <text x="38" y="27" text-anchor="middle" textLength="66" lengthAdjust="spacingAndGlyphs" font-family="Arial,Helvetica,sans-serif" font-style="italic" font-weight="900" font-size="15" fill="${cor ? "#fff" : "var(--cf,#000)"}">UnionPay</text></svg>`,
};

const V3_BANDEIRAS_LOGO = ["elo", "amex", "hipercard", "diners", "discover", "jcb", "unionpay", "maestro"];  // logos/band-<nome>.svg
const v3LogosTem = new Set(), v3LogosVistos = new Set();
function v3Logos(nomes, depois) {  // procura cada arquivo uma vez; quando algum aparece, redesenha
  const novos = [...new Set([...V3_LOGOS, ...nomes])].filter((n) => n && !v3LogosVistos.has(n));
  novos.forEach((n) => v3LogosVistos.add(n));
  if (novos.length) Promise.all(novos.map((n) => fetch(V3_LOGO(n), { method: "HEAD", cache: "no-cache" }).then((r) => { if (r.ok) v3LogosTem.add(n); }).catch(() => {}))).then(() => { if (novos.some((n) => v3LogosTem.has(n))) depois(); });
  return v3LogosTem;
}

const BaseV2 = ComprasV2Card;  // mesmo arquivo
// A V2 carrega a base numa versão antiga e parada; a V3 passa os métodos da base nova (com as finanças novas) para a base
// que a V2 usa por dentro. Assim a V3 recebe as mudanças sem mexer no arquivo da V2.
{
  const emUso = Object.getPrototypeOf(BaseV2.prototype);
  if (BaseNova && emUso !== BaseNova.prototype) {
    for (const n of Object.getOwnPropertyNames(BaseNova.prototype)) if (n !== "constructor") Object.defineProperty(emUso, n, Object.getOwnPropertyDescriptor(BaseNova.prototype, n));
    for (const n of Object.getOwnPropertyNames(BaseNova)) if (!["prototype", "name", "length"].includes(n)) Object.defineProperty(emUso.constructor, n, Object.getOwnPropertyDescriptor(BaseNova, n));
  }
}

class ComprasV3Card extends BaseV2 {
  connectedCallback() {
    v3Fontes();
    super.connectedCallback();
  }

  // escuro: o que a pessoa escolheu neste aparelho; sem escolha, segue o tema do HA
  _v3Escuro() {
    let e = null;
    try { e = localStorage.getItem(V3_ESCURO); } catch (_) { /* navegador sem armazenamento */ }
    return e === "1" ? true : e === "0" ? false : !!this._hass?.themes?.darkMode;
  }

  // ---------------------------------------------------------------- tela
  _render() {
    if (!this.shadowRoot) return;
    const d = this._dados, largo = !!this._v2Largo;
    let corpo;
    if (!d && this._erro) corpo = `<div class="vazio">${V3_SVG("alerta")} ${this._e(this._erro)}<br><button class="btn" data-a="recarregar">Tentar de novo</button></div>`;
    else if (!d) corpo = `<div class="vazio">Carregando compras…</div>`;
    else corpo = this._v3Corpo(d);
    const topo = d ? this._v3Topo() : "";
    const app = largo
      ? `<div class="v3-app"><aside class="v3-lado">${this._v3Lado()}</aside><main class="v3-main">${topo}<div class="v3-pag">${corpo}</div></main></div>`
      : `<div class="v3-app cel">${topo}<div class="v3-pag">${corpo}</div></div>`;
    const rascunho = this._guardarRascunho();
    const jan0 = this.shadowRoot.querySelector("dialog.folha"), yJan0 = jan0 ? jan0.scrollTop : 0;  // a mesma janela redesenhada (Salvar, Confirmar) fica onde estava
    const alvoSel = this._v3Rolar || this._v3Perto; this._v3Rolar = this._v3Perto = null;  // o que enquadrar depois deste desenho
    // A página de trás (lista de compras, produtos…) fica onde estava: guarda a rolagem de quem rola por fora do card (no HA é
    // um painel dele, não a janela) e segura a altura do card enquanto redesenha. Ao fechar uma janela, volta para onde estava
    // quando ela abriu. Trocar de tela não segura (começa do alto).
    const rols = this._v3Roladores(), pos = rols.map((r) => r.scrollTop), tinhaJanela = !!this.shadowRoot.querySelector("dialog.folha");
    const novaVista = this._v3IrTopo; this._v3IrTopo = false;  // trocou pessoa ou período: é como uma tela nova
    const parado = this._v3Parado; this._v3Parado = false;  // setas do mês no celular: fica onde está, sem enquadrar nada
    const mesmaTela = this._v3TelaAnt === this._v2Aba && !novaVista; this._v3TelaAnt = this._v2Aba;
    const alt = this.offsetHeight; if (alt && mesmaTela) this.style.minHeight = `${alt}px`;
    this.shadowRoot.innerHTML = `<style>${this._css()}${this._finCss()}${this._v2Css()}${this._v3Css()}</style><ha-card class="v2 v3${largo ? " larga" : ""}${this._v3Escuro() ? " escuro" : ""}">${app}${this._folha()}</ha-card>`;
    this._ligar();
    {  // o showModal põe o foco no X (lá em cima) e o iPhone rola até ele: o foco fica na própria janela, sem rolar
      const jan = this.shadowRoot.querySelector("dialog.folha"), foco = this.shadowRoot.activeElement;
      if (jan && (!foco || foco.matches?.("[data-a=fechar]"))) { jan.tabIndex = -1; try { jan.focus({ preventScroll: true }); } catch (_) { /* navegador antigo */ } }
    }
    this._devolverRascunho(rascunho);
    // o iPhone às vezes rola até o foco depois: devolve a rolagem de novo no quadro seguinte. Depois enquadra o que abriu:
    // o pedido do botão (alvoSel) ou, sem ele, o que apareceu de novo depois do toque (_v3Antes).
    const dlg = this.shadowRoot.querySelector("dialog.folha"), y = rascunho?.rolagem, mesma = rascunho?.jan && rascunho.jan === this._qualJanela();
    const chaveJan = dlg ? `${dlg.getAttribute("aria-label") || ""}|${this._aberta?.id || ""}` : null, mesmaJan = !!(dlg && jan0 && chaveJan === this._v3JanAnt);
    this._v3JanAnt = chaveJan;
    if (mesmaJan && !alvoSel && yJan0 && Math.abs(dlg.scrollTop - yJan0) > 2) dlg.scrollTop = yJan0;
    if (!tinhaJanela && dlg) this._v3PosPagina = pos;  // abriu uma janela: guarda onde a página estava
    const volta = tinhaJanela && !dlg && this._v3PosPagina ? this._v3PosPagina : pos;  // fechou: volta para lá
    if (!dlg) this._v3PosPagina = null;
    this._v3TravaFundo(null);  // a trava do fundo travava também a janela no app do iPhone (lojas para classificar): fica só o overscroll contido da janela
    if (novaVista && !dlg) { this._v3AoTopo(rols); this._v3SemVolta = Date.now() + 900; }  // na hora; e por um instante nenhum redesenho devolve a posição antiga
    const devolve = () => { if (mesmaTela && Date.now() > (this._v3SemVolta || 0)) rols.forEach((r, i) => { if (r.isConnected !== false && Math.abs(r.scrollTop - volta[i]) > 2) r.scrollTop = volta[i]; }); };
    devolve();
    requestAnimationFrame(() => {
      if (novaVista && !dlg) { this._v3Antes = null; this._v3AoTopo(rols); return; }  // de novo depois do desenho; sem enquadrar nada
      if (Date.now() < (this._v3SemVolta || 0)) { this._v3Antes = null; this.style.minHeight = ""; return; }
      if (parado) { this._v3Antes = null; devolve(); this.style.minHeight = ""; return; }  // redesenho logo depois da troca: fica no começo
      if (!alvoSel || dlg) devolve();  // de novo depois do desenho (o iPhone às vezes mexe depois)
      this.style.minHeight = "";
      if (dlg && mesma && y && Math.abs(dlg.scrollTop - y) > 2) dlg.scrollTop = y;
      else if (mesmaJan && !alvoSel && yJan0 && Math.abs(dlg.scrollTop - yJan0) > 2) dlg.scrollTop = yJan0;
      const el = alvoSel ? this.shadowRoot.querySelector(alvoSel) : (mesma || !dlg) ? this._v3Novo() : null;  // janela nova: começa do topo
      if (el) this._v3Enquadrar(el);
    });
    if (d) this._v2Guardar();
  }

  // Janela aberta: trava a rolagem de quem rola por fora do card (o dedo na janela não arrasta a lista de trás); fechou, solta.
  _v3TravaFundo(rols) {
    const presos = this._v3Presos || [];
    if (rols) {
      for (const r of rols) if (!presos.some((x) => x.r === r)) { presos.push({ r, oy: r.style.overflowY, ob: r.style.overscrollBehavior }); r.style.overflowY = "hidden"; r.style.overscrollBehavior = "none"; }
      this._v3Presos = presos;
    } else if (presos.length) {
      for (const x of presos) { x.r.style.overflowY = x.oy; x.r.style.overscrollBehavior = x.ob; }  // volta exatamente o que era
      this._v3Presos = [];
    }
  }

  disconnectedCallback() {
    this._v3TravaFundo(null);  // saiu da tela com a janela aberta: não deixa a página presa
    super.disconnectedCallback?.();
  }

  // sobe cada painel que rola até o começo do card (o cabeçalho do HA fica fora do painel)
  _v3AoTopo(rols) {
    for (const r of rols) {
      const doc = r === document.scrollingElement, topoR = doc ? 0 : r.getBoundingClientRect().top;
      const alvo = Math.max(0, r.scrollTop + (this.getBoundingClientRect().top - topoR));
      if (alvo < r.scrollTop - 1) r.scrollTop = alvo;
    }
    this.style.minHeight = "";
  }

  // quem rola por fora do card: os painéis do HA (atravessando as shadow roots) e a própria página
  _v3Roladores() {
    const out = [];
    let n = this;
    while (n) {
      n = n.assignedSlot || n.parentNode || null;  // num slot, o desenho segue o slot
      if (n && n.nodeType === 11) n = n.host;  // shadow root: sobe para o dono
      if (!n || n.nodeType !== 1) break;
      const cs = getComputedStyle(n);
      if ((/(auto|scroll|overlay)/.test(cs.overflowY) && n.scrollHeight > n.clientHeight + 1) || (this._v3Presos || []).some((x) => x.r === n)) out.push(n);  // os travados pela janela contam
    }
    if (document.scrollingElement && !out.includes(document.scrollingElement)) out.push(document.scrollingElement);
    return out;
  }

  _v3Lado() {
    const aba = this._v2Aba, ps = this._dados?.pessoas || [];
    return `<div class="v3-marca"><span class="v3-logo">CF</span><b>CoFinance</b></div>
      <nav class="v3-nav" aria-label="Seções">${V3_MENU.map(([k, t, ic]) => `<button class="${aba === k ? "on" : ""}" aria-current="${aba === k ? "page" : "false"}" data-a="v3-menu" data-k="${k}">${V3_SVG(ic)}<span>${t}</span></button>`).join("")}</nav>
      <div class="v3-lado-pe">${ps.map((p) => `<span><i style="background:${p.cor}"></i>${this._e(p.nome)}</span>`).join("")}
        <small>${this._v3AtualTxt()}</small></div>`;
  }

  _v3AtualTxt() {
    const d = this._dados;
    return `${this._carregando ? "Atualizando…" : `Atualizado ${d?.atualizado_em ? new Date(d.atualizado_em).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}`} · ${V3_VERSION.includes("-") ? "v3 " : "CoFinance "}${V3_VERSION}`;
  }

  // título da página · filtros (de quem, período) · escuro, sino, + Lançar, ⚙
  _v3Topo() {
    this._finEstado();
    const aba = this._v2Aba, largo = !!this._v2Largo, nAv = this._pendencias().total, modo = this._fModo;
    const titulo = aba === "config" ? "Configurações" : (V3_MENU.find(([k]) => k === aba) || V3_MENU[0])[1];
    const pessoas = ["Todos", ...(this._dados.compradores || [])];
    const quem = `<div class="v3-seg" role="group" aria-label="De quem">${pessoas.map((p) => `<button class="${this._fQuem === p ? "on" : ""}" aria-pressed="${this._fQuem === p}" data-a="f-quem" data-k="${this._e(p)}">${p === "Todos" ? "" : `<i style="background:${this._cor(p)}"></i>`}${this._e(p)}</button>`).join("")}</div>`;
    const [ano, n] = this._mes.split("-"), mesTxt = `${V3_MESES[Number(n) - 1][0].toUpperCase()}${V3_MESES[Number(n) - 1].slice(1, 3)} ${ano}`;
    const hojeM = this._mesDe(new Date()), anoHoje = hojeM.slice(0, 4), anoMin = this._finAnos().slice(-1)[0] || anoHoje;
    // em Ano, tocar em Mês fica no mesmo ano (o mesmo mês; dezembro, ou o mês atual, se ainda não chegou)
    const mesNoAno = modo === "ano" ? (`${this._fAno}-${n}` <= hojeM ? `${this._fAno}-${n}` : this._fAno === anoHoje ? hojeM : `${this._fAno}-12`) : this._mes;
    const aberto = (v) => !!this._v2Per && (this._v2PerVista || modo) === v;
    const per = `<div class="v3-seg v-perw" role="group" aria-label="Período">
        ${modo === "mes" ? `<button class="v3-seta" data-a="f-mes" data-k="-1" aria-label="Mês anterior">${V3_SVG("esq")}</button>
          <button class="on" data-a="v3-per" data-k="mes" aria-expanded="${aberto("mes")}" title="Escolher o mês">${mesTxt}</button>
          <button class="v3-seta" data-a="f-mes" data-k="1" aria-label="Próximo mês" ${this._mes >= hojeM ? "disabled" : ""}>${V3_SVG("dir")}</button>`
        : `<button data-a="v2-per-mes" data-k="${mesNoAno}">Mês</button>`}
        ${modo === "ano" ? `<button class="v3-seta" data-a="v2-ano-passo" data-k="-1" aria-label="Ano anterior" ${this._fAno <= anoMin ? "disabled" : ""}>${V3_SVG("esq")}</button>
          <button class="on" data-a="v3-per" data-k="ano" aria-expanded="${aberto("ano")}" title="Escolher o ano">${this._fAno}</button>
          <button class="v3-seta" data-a="v2-ano-passo" data-k="1" aria-label="Próximo ano" ${this._fAno >= anoHoje ? "disabled" : ""}>${V3_SVG("dir")}</button>`
        : `<button data-a="v2-per-anoint" data-k="${this._mes.slice(0, 4)}">Ano</button>`}
        <button class="${modo === "tudo" ? "on" : ""}" data-a="v2-per-tudo">Tudo</button>
        ${this._v2Per ? this._v2Seletor() : ""}</div>`;
    const esc = this._v3Escuro();
    const acoes = `<div class="v3-acoes">
        <button class="v3-ib" data-a="v3-escuro" aria-label="${esc ? "Tema claro" : "Tema escuro"}" title="${esc ? "Tema claro" : "Tema escuro"}">${V3_SVG(esc ? "sol" : "lua")}</button>
        <button class="v3-ib${this._carregando ? " v3-gira" : ""}" data-a="recarregar" aria-label="Atualizar" title="Atualizar">${V3_SVG("atualizar")}</button>
        <button class="v3-ib" data-a="avisos" aria-label="Avisos${nAv ? `: ${nAv} para conferir` : ""}" title="Avisos">${V3_SVG("sino")}${nAv ? `<b>${nAv}</b>` : ""}</button>
        <div class="v-maisw"><button class="v3-ib v3-lancar" data-a="v2-mais" aria-expanded="${!!this._v2Mais}" aria-label="Lançar">${V3_SVG("mais")}<span>Lançar</span></button>
          ${this._v2Mais ? `<div class="v-menu" role="menu">
            <button role="menuitem" data-a="novo">${V3_SVG("lapis")}<span><b>Lançar compra</b><small>sem nota, à mão</small></span></button>
            <button role="menuitem" data-a="upload">${V3_SVG("recibo")}<span><b>Enviar nota fiscal</b><small>foto, PDF ou XML</small></span></button>
          </div>` : ""}</div>
        ${this._hass?.user?.is_admin ? `<button class="v3-ib${aba === "config" ? " on" : ""}" data-a="v2-config" aria-pressed="${aba === "config"}" aria-label="Configurações" title="Configurações">${V3_SVG("engrenagem")}</button>` : ""}
      </div>`;
    const nav = largo ? "" : `<nav class="v3-abas" aria-label="Seções">${V3_MENU.map(([k, t, ic]) => `<button class="${aba === k ? "on" : ""}" aria-current="${aba === k ? "page" : "false"}" data-a="v3-menu" data-k="${k}">${V3_SVG(ic)}<span>${t}</span></button>`).join("")}</nav>`;
    const filtros = aba === "config" ? "" : `<div class="v3-filtros">${quem}${per}</div>`;
    return `<header class="v3-topo"><div class="v3-tit"><h1>${titulo}</h1>${acoes}</div>${nav}${filtros}</header>`;
  }

  _v3Corpo(d) {
    const aba = this._v2Aba;
    const aviso = this._aviso && !this._aberta && !this._fConta ? `<div class="aviso" role="status">${this._e(this._aviso)}</div>` : "";
    if (aba === "inicio") return aviso + this._v2Passos() + this._v3Resumo();
    if (aba === "contas") return aviso + this._v3Pagar();
    if (aba === "produtos") return this._prodVista === "precos" ? `<div class="v-velho">${this._telaProdutos()}</div>` : aviso + this._v3Produtos();
    if (aba === "config") return `<div class="v-velho">${this._finConfig()}</div>`;
    if (aba === "compras") return aviso + this._v3Compras();
    return aviso + this._v3Areas();
  }

  // ---------------------------------------------------------------- dados de apoio
  // compra → parcelas nas faturas (para "Na fatura/Paga" e o caminho do dinheiro)
  _v3Faturas() {
    const F = this._fFin, idx = new Map();
    for (const f of F?.faturas || []) for (const i of f.itens || []) {
      if (!idx.has(i.compra)) idx.set(i.compra, []);
      idx.get(i.compra).push({ f, i });
    }
    for (const l of idx.values()) l.sort((a, b) => a.f.vence.localeCompare(b.f.vence));
    return idx;
  }

  // Resumo: o que outras pessoas ou empresas ainda vão pagar de volta (tocar abre o sino nesse bloco)
  _v3Receber() {
    const v = Object.values(this._dados?.a_receber || {}).reduce((s, x) => s + (x || 0), 0);
    return v > 0.004 ? `<button class="v-deve" data-a="v2-deve">A receber <b>${this._brl(v)}</b> ›</button>` : "";
  }

  // reembolso em aberto ou fechado: [texto, tom] ou null
  _v3Reemb(c) {
    const r = c.reembolso || {}, data = String(r.pago_em || "").split("-").reverse().slice(0, 2).join("/");
    if (r.status === "a_reembolsar") return [`A reembolsar · ${r.para || c.quem}`, "aviso"];
    if (r.status === "a_receber") return [`A receber${r.de ? ` · ${r.de}` : ""}`, "rec"];
    if (r.status === "pago") return [`Reembolsado ${data}`, ""];
    if (r.status === "recebido") return [`Recebido ${data}${r.de ? ` · ${r.de}` : ""}`, ""];
    return null;
  }

  _v3Status(c, idx, semReemb = false) {
    const re = !semReemb && this._v3Reemb(c);
    if (re && re[1]) return re;  // na lista: o reembolso em aberto aparece no lugar do status
    const lanc = idx?.get(c.id);
    if (lanc?.length) return lanc.every((x) => x.f.pago) ? ["Paga", "ok"] : ["Na fatura", "ok2"];
    const pgs = c.pago_com || [];
    if (!pgs.length || pgs.some((p) => !p.tipo)) return ["Sem forma", "aviso"];
    if (pgs.some((p) => p.tipo === "Crédito" && !p.cartao) && (this._fFin?.cartoes || []).length) return ["Sem cartão", "aviso"];
    if (pgs.every((p) => V3_NA_HORA.includes(p.tipo))) return ["Paga", "ok"];
    return ["Lançada", ""];
  }

  _v3Icone(c) {
    if (c.conta) return "conta";
    if (c.via === "applepay") return "celular";
    if (c.via === "fatura") return "cartao";
    if (c.origem === "manual") return "lapis";
    return "recibo";
  }

  _v3PgNome(p) {
    const k = p.cartao ? (this._fFin?.cartoes || []).find((x) => (p.cartao_id ? x.id === p.cartao_id : x.nome === p.cartao)) : null;
    if (!k) return this._pagNome(p);
    return p.tipo === "Benefício" ? this._finNomeCartao(k) : `${this._finNomeCartao(k).includes(`· ${String(p.tipo).toLowerCase()}`) ? "" : `${p.tipo} `}${this._finNomeCartao(k)}${p.parcelas > 1 ? ` ${p.parcelas}x` : ""}`;
  }

  _v3PagTxt(c) {
    const pgs = (c.pago_com || []).filter((p) => p.tipo);
    return pgs.length ? pgs.map((p) => this._v3PgNome(p)).join(" + ") : "forma não informada";
  }

  // "Fatura Bradesco Prime": o nome do cartão (ou o banco), nunca o nome curto interno
  _v3NomeObr(x) {
    const k = x.tipo === "fatura" ? (this._fFin?.cartoes || []).find((y) => y.id === x.cartao) : null;
    if (!k) return x.nome;
    const p = this._fQuem !== "Todos" ? this._fQuem : null, f = Object.entries(k.finais || {}).find(([, v]) => !v.parado && (!p || v.quem === p)) || Object.entries(k.finais || {}).find(([, v]) => !v.parado);
    return `Fatura ${this._finNomeCartao(k)}${f ? ` ···· ${f[0]}` : ""}`;
  }

  // uma compra numa linha (como no protótipo): ícone da origem, pessoa, loja, forma; valor e situação
  _v3Linha({ c, v }, idx) {
    const [st, tom] = c.conta ? [c.conta.pago ? "Paga" : "A pagar", c.conta.pago ? "ok" : ""] : this._v3Status(c, idx);
    const lanc = idx?.get(c.id), parc = lanc?.length > 1 || (lanc?.[0]?.i.de > 1) ? lanc.find((x) => !x.f.pago) || lanc[lanc.length - 1] : null;
    const abre = c.conta ? `data-a="f-conta" data-k="${this._e(c.conta.id)}"` : `data-a="abrir" data-id="${this._e(c.id)}"`;
    const sel = this._aberta?.id === c.id ? " sel" : "";
    const valor = this._semReal(c) ? this._moeda(c.moeda) : this._brl(v);
    const ic = { ok: "check", ok2: "check", aviso: "alerta", rec: "alerta", "": "relogio" }[tom];
    return `<button class="v3-it${sel}" ${abre}><span class="v3-it-ic">${V3_SVG(this._v3Icone(c))}</span>
      <span class="v3-it-t"><b><i style="background:${this._cor(c.quem)}"></i>${this._e(c.loja_curta || c.conta?.nome || "")}</b>
        <small>${this._e(c.conta ? c.conta.fonte_txt || "conta da casa" : this._v3PagTxt(c))}${parc ? ` · ${parc.i.parcela} de ${parc.i.de}` : ""}</small></span>
      <span class="v3-it-v"><b>${valor}</b><em class="v3-st ${tom}">${V3_SVG(ic)}${st}</em></span></button>`;
  }

  // compras agrupadas por dia (Hoje, Ontem, 22 de outubro…)
  _v3Lista(itens, idx) {
    if (!itens.length) return `<div class="v3-vazio">Nenhuma compra em ${this._e(this._finPeriodoTxt())}${this._fQuem === "Todos" ? "" : ` de ${this._e(this._fQuem)}`}.</div>`;
    const hoje = this._finHoje(), ontem = (() => { const x = new Date(); x.setDate(x.getDate() - 1); return `${this._mesDe(x)}-${String(x.getDate()).padStart(2, "0")}`; })();
    const g = new Map();
    for (const it of itens) { const k = String(it.c.emissao).slice(0, 10); if (!g.has(k)) g.set(k, []); g.get(k).push(it); }
    return [...g].map(([k, l]) => {
      const dt = new Date(k + "T12:00"), nome = k === hoje ? "Hoje" : k === ontem ? "Ontem" : `${dt.getDate()} de ${V3_MESES[dt.getMonth()]}`;
      return `<div class="v3-dia">${nome}</div>${l.map((x) => this._v3Linha(x, idx)).join("")}`;
    }).join("");
  }

  _v3Itens(lst) {
    const por = new Map();
    for (const l of lst) { const p = por.get(l.c.id); if (p) p.v += l.valor; else por.set(l.c.id, { c: l.c, v: l.valor, area: l.area }); }
    return [...por.values()].sort((a, b) => String(b.c.emissao).localeCompare(String(a.c.emissao)));
  }

  // ---------------------------------------------------------------- Resumo
  _v3Resumo() {
    this._finEstado();
    this._finGarantir();
    const F = this._fFin, modo = this._fModo, lst = this._finFiltradas(), idx = this._v3Faturas();
    const itens = this._v3Itens(lst), total = lst.reduce((s, l) => s + l.valor, 0);
    const vals = itens.map((x) => x.v).filter((v) => v > 0);
    const quando = modo === "mes" ? `em ${V3_MESES[Number(this._mes.slice(5, 7)) - 1]}` : modo === "ano" ? `em ${this._fAno}` : "desde o início";
    const pessoa = this._fQuem !== "Todos" ? this._fQuem : null;
    // comparação com o normal (sem os bens duráveis), como na v2
    const dia = total - lst.filter((l) => this._finBem(l)).reduce((s, l) => s + l.valor, 0), t = this._finTipico(true);
    let tend = "", tendx = "";
    if (t?.valor) {
      const v = (dia - t.valor) / t.valor, sobe = v > 0;
      // celular: o percentual sobe para a linha do valor, pequeno, no canto direito
      tendx = `<span class="v3-tendx ${sobe ? "sobe" : "desce"}" title="${sobe ? "Acima" : "Abaixo"} do normal: o gasto típico até este dia do mês nos últimos 12 meses (o do meio), sem as compras duráveis"><b>${V3_SVG(sobe ? "sobe" : "desce")}${Math.round(Math.abs(v) * 100)}%</b></span>`;
      tend = `<div class="v3-tend ${sobe ? "sobe" : "desce"}" title="Normal: o gasto típico até este dia do mês nos últimos 12 meses (o do meio), sem as compras duráveis">${V3_SVG(sobe ? "sobe" : "desce")}${Math.round(Math.abs(v) * 100)}% ${sobe ? "acima" : "abaixo"} do normal${t.ate ? ` até o dia ${t.ate}` : ""}</div>`;
    }
    const [inteiro, cent] = this._brl(total).split(",");
    const heroi = `<section class="v3-card v3-heroi"><span class="v3-rot">${pessoa ? `${this._e(pessoa)} gastou` : "Gastos"} ${quando}</span>
      <div class="v3-heroi-l"><span class="v3-totlinha"><span class="v3-total">${inteiro}<small>,${cent}</small></span>${tendx}</span>
        <span class="v3-mini"><b>${itens.length}</b><small>${itens.length === 1 ? "compra" : "compras"}</small></span>
        ${vals.length ? `<span class="v3-mini"><b>${this._brl(Math.max(...vals))}</b><small>maior</small></span><span class="v3-mini"><b>${this._brl(Math.min(...vals))}</b><small>menor</small></span>` : ""}</div>
      ${tend}</section>`;  // devemos / a receber: só no sino
    const alerta = this._v3Alerta();
    const cal = modo === "mes" ? this._v3Calendario(lst, idx) : this._v3MesAMes(true);
    const cartoes = F ? this._v3Cartoes() : "";
    const ultimas = `<section class="v3-card v3-ult"><div class="v3-hd"><h2>Últimas compras</h2><button class="v3-link" data-a="v3-menu" data-k="compras">Todas ${V3_SVG("dir")}</button></div>
      ${this._v3Lista(itens.slice(0, this._v2Largo ? 15 : 5), idx)}</section>`;
    const onde = this._v3Onde(lst, total), mes = modo === "mes" ? this._v3MesAMes(false) : "", pagos = this._v3ComoPago(lst);
    if (!this._v2Largo) return `<div class="v3-resumo">${alerta}${heroi}${cal}${cartoes}${ultimas}${onde}${mes}${pagos}</div>`;
    if (modo !== "mes") return `<div class="v3-resumo larga">${alerta}<div class="v3-grade v3-alinha"><div class="v3-col">${heroi}${cal}</div><div class="v3-col">${cartoes}</div>
      <div class="v3-col">${onde}${pagos}</div><div class="v3-col">${ultimas}</div></div></div>`;
    return `<div class="v3-resumo larga">${alerta}<div class="v3-grade"><div class="v3-col">${heroi}${cal}<div class="v3-par">${onde}${mes}</div>${pagos}</div>
      <div class="v3-col">${cartoes}${ultimas}</div></div></div>`;
  }

  // faixa do alto: a primeira conta ou fatura atrasada (ou que vence hoje)
  _v3Alerta() {
    const F = this._fFin;
    if (!F) return "";
    const hoje = F.hoje, l = this._finObrigacoes().filter((x) => !x.pago && x.vence <= hoje && (x.tipo === "fatura" || this._finDoFiltro(x))).sort((a, b) => a.vence.localeCompare(b.vence));
    if (!l.length) return "";
    const x = l[0], d = new Date(x.vence + "T12:00"), dm = `${d.getDate()} ${V3_MESES[d.getMonth()].slice(0, 3)}`;
    const nm = this._v3NomeObr(x);
    const txt = x.vence < hoje ? `${x.tipo === "fatura" ? `A fatura do ${this._e(nm.replace(/^Fatura /, ""))}` : `A conta ${this._e(nm)}`} venceu em ${dm} e ainda não foi paga.` : `${this._e(nm)} vence hoje.`;
    return `<div class="v3-alerta" role="status"><span>${txt}${l.length > 1 ? ` <small>+${l.length - 1} ${l.length === 2 ? "outra" : "outras"}</small>` : ""}</span>
      <button class="v3-bt prim" data-a="f-conta" data-k="${this._e(x.id)}">Ver</button></div>`;
  }

  // calendário do mês: bolinha de quem comprou em cada dia; tocar mostra as compras do dia embaixo
  _v3Calendario(lst, idx) {
    const [a, m] = this._mes.split("-").map(Number), dias = new Date(a, m, 0).getDate(), ini = (new Date(a, m - 1, 1).getDay() + 6) % 7;
    const hoje = this._finHoje(), porDia = {};
    const valDia = {};  // gasto do dia, escrito pequeno embaixo do número (como na v2)
    for (const l of lst) { const k = String(l.c.emissao).slice(0, 10); (porDia[k] ||= new Set()).add(l.c.quem); valDia[k] = (valDia[k] || 0) + (l.valor || 0); }
    const curto = (v) => v >= 1000 ? Math.round(v).toLocaleString("pt-BR") : v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const comCompra = Object.keys(porDia).sort();
    let sel = this._v3Dia && this._v3Dia.startsWith(this._mes) ? this._v3Dia : porDia[hoje] ? hoje : comCompra[comCompra.length - 1];
    const cel = [];
    for (let i = 0; i < ini; i++) cel.push(`<span></span>`);
    for (let d = 1; d <= dias; d++) {
      const k = `${this._mes}-${String(d).padStart(2, "0")}`, q = [...(porDia[k] || [])];
      cel.push(`<button class="v3-d${k === sel ? " sel" : ""}${k === hoje ? " hoje" : ""}" data-a="v3-dia" data-k="${k}" ${k > hoje ? "disabled" : ""} aria-label="${d}${q.length ? `: compras de ${q.join(", ")}` : ""}"><span>${d}</span>${valDia[k] > 0.004 ? `<small>${curto(valDia[k])}</small>` : ""}<i>${q.map((p) => `<em style="background:${this._cor(p)}"></em>`).join("")}</i></button>`);
    }
    const ps = [...new Set(lst.map((l) => l.c.quem))].filter(Boolean);
    const doDia = sel ? this._v3Itens(lst.filter((l) => String(l.c.emissao).slice(0, 10) === sel)) : [];
    const dt = sel ? new Date(sel + "T12:00") : null;
    return `<section class="v3-card v3-cal"><div class="v3-hd"><h2>${V3_MESES[m - 1][0].toUpperCase()}${V3_MESES[m - 1].slice(1)} ${a}</h2>
        <span class="v3-leg">${ps.map((p) => `<span><i style="background:${this._cor(p)}"></i>${this._e(p)}</span>`).join("")}</span></div>
      <div class="v3-sem">${V3_SEMANA.map((s) => `<span>${s}</span>`).join("")}</div><div class="v3-dias">${cel.join("")}</div>
      ${sel ? `<div class="v3-dodia"><div class="v3-dia0 v3-diatot"><span>${dt.getDate()} de ${V3_MESES[dt.getMonth()]}</span>${doDia.length ? `<span>${doDia.length} ${doDia.length === 1 ? "compra" : "compras"} · <b>${this._brl(doDia.reduce((s, x) => s + (x.v || 0), 0))}</b></span>` : ""}</div>${doDia.map((x) => this._v3Linha(x, idx)).join("") || `<div class="v3-vazio">Nenhuma compra neste dia.</div>`}</div>` : ""}</section>`;
  }

  // pilha de cartões: a mesma da v2 (faixas com banco e produto; na frente, o cartão desenhado com chip, valor e bandeira).
  // Tocar numa faixa traz à frente; tocar na frente abre a fatura (no mês) ou as faturas do período
  _v3Cartoes() {
    const F = this._fFin, pessoa = this._fQuem !== "Todos" ? this._fQuem : null, modo = this._fModo, hoje = F.hoje;
    const parte = (x) => !pessoa || x.tipo !== "fatura" ? x : { ...x, total: Math.round((x.itens || []).filter((i) => i.quem === pessoa).reduce((s, i) => s + (i.valor || 0), 0) * 100) / 100 };
    const faturas = (F.faturas || []).map(parte);
    const doPer = (x) => modo === "mes" ? x.vence.slice(0, 7) === this._mes : modo === "ano" ? x.vence.slice(0, 4) === this._fAno : true;
    const ordem = (c) => `${c.x && !c.x.pago ? 0 : 1}${c.x ? c.x.vence : "9999"}`;
    const credito = (F.cartoes || []).filter((k) => k.credito !== false && (!pessoa || (k.usam_hoje || k.usam || []).includes(pessoa)
        || ((k.usam || []).includes(pessoa) && faturas.some((x) => x.cartao === k.id && doPer(x) && x.total > 0))) && (k.ativo !== false || faturas.some((x) => x.cartao === k.id && doPer(x))))
      .map((k) => {
        const lst = faturas.filter((x) => x.cartao === k.id && doPer(x)).sort((a, b) => a.vence.localeCompare(b.vence));
        if (modo === "mes") {
          const x = lst[lst.length - 1];
          if (this._mes === hoje.slice(0, 7) && (!x || x.pago)) {
            const prox = faturas.filter((y) => y.cartao === k.id && !y.pago && y.vence.slice(0, 7) > this._mes).sort((a, b) => a.vence.localeCompare(b.vence))[0];
            if (prox) return { k, x: prox, n: lst.length, antes: x || null };
          }
          return { k, x, n: lst.length };
        }
        return { k, n: lst.length, abertas: lst.filter((x) => !x.pago).length,
          x: lst.length ? { id: `v2cart:${k.id}`, tipo: "fatura", cartao: k.id, vence: lst[lst.length - 1].vence, total: lst.reduce((s, x) => s + x.total, 0) } : undefined };
      })
      .sort((a, b) => modo === "mes" ? ordem(a).localeCompare(ordem(b)) : (b.x?.total || 0) - (a.x?.total || 0));
    const doDia = (d) => modo === "mes" ? d.slice(0, 7) === this._mes : modo === "ano" ? d.slice(0, 4) === this._fAno : true;
    const quandoG = modo === "mes" ? `em ${V3_MESES[Number(this._mes.slice(5, 7)) - 1]}` : modo === "ano" ? `em ${this._fAno}` : "no total";
    const cards = [...credito, ...(F.cartoes || []).filter((k) => k.credito === false).map((k) => ({ k, x: this._finGastoX(k, doDia, quandoG, "v2-cart") })).filter((c) => c.x)];
    if (!cards.length) return `<section class="v3-card"><div class="v3-hd"><h2>Cartões</h2></div><div class="v3-vazio">Nenhum cartão${pessoa ? ` de ${this._e(pessoa)}` : ""} cadastrado.</div></section>`;
    this._fCartLista = cards.map((c) => c.k.id);
    if (!this._fCartLista.includes(this._fCartSel)) this._fCartSel = this._fCartLista[0];
    const sel = cards.find((c) => c.k.id === this._fCartSel) || cards[0];
    const tpl = document.createElement("template");
    tpl.innerHTML = this._v2Face(this._finPilha(cards, Math.max(0, this._fCartLista.indexOf(this._fCartSel))), sel, hoje);
    const face = tpl.content.querySelector(".fcface");
    if (face && sel.k.credito !== false) {
      face.setAttribute("data-a", "v3-ircart"); face.setAttribute("data-k", sel.k.id);
      face.setAttribute("aria-label", `${this._finNomeCartao(sel.k)}: abrir em A pagar`);
      if (face.tagName === "DIV") { face.setAttribute("role", "button"); face.setAttribute("tabindex", "0"); }
    }
    return `<section class="v3-card"><div class="v3-hd"><h2>Cartões</h2><button class="v3-link" data-a="v3-menu" data-k="contas">A pagar ${V3_SVG("dir")}</button></div>
      <div class="v-pilha v3-pilha">${tpl.innerHTML}</div>
      ${pessoa ? `<div class="v3-dica">Faturas só com as compras de ${this._e(pessoa)}</div>` : `<div class="v3-dica">Toque numa faixa para trazer o cartão à frente · toque no cartão para abrir em A pagar</div>`}</section>`;
  }

  _v3Onde(lst, total) {
    const por = Object.entries(this._finSomaPor(lst, (l) => l.area)).sort((a, b) => b[1] - a[1]).slice(0, 5), mx = por[0]?.[1] || 1;
    return `<section class="v3-card"><div class="v3-hd"><h2>Onde foi o dinheiro</h2><button class="v3-link" data-a="v3-menu" data-k="gastos">Áreas ${V3_SVG("dir")}</button></div>
      ${por.length ? por.map(([a, v]) => `<div class="v3-barra"><span>${this._e(a)}</span><b>${this._brl(v)}</b><i><em style="width:${Math.max(2, v / mx * 100).toFixed(1)}%"></em></i></div>`).join("")
        : `<div class="v3-vazio">Nenhum gasto neste período.</div>`}</section>`;
  }

  // 6 meses até o escolhido (mês) ou os meses do ano/tudo (grande, no lugar do calendário)
  _v3MesAMes(grande) {
    const linhas = this._finLinhas().filter((l) => this._finDaPessoa(l));
    const soma = this._finSomaPor(linhas, (l) => String(l.c.emissao).slice(0, 7));
    if (this._fModo === "tudo") return this._v3Comparar(grande, soma);
    let meses;
    if (this._fModo === "mes") meses = Array.from({ length: 6 }, (_, i) => this._finSomaMes(this._mes, i - 5));
    else if (this._fModo === "ano") meses = Array.from({ length: 12 }, (_, i) => `${this._fAno}-${String(i + 1).padStart(2, "0")}`);
    else meses = Object.keys(soma).sort().slice(-12);
    const mx = Math.max(1, ...meses.map((m) => soma[m] || 0)), atual = this._fModo === "mes" ? this._mes : null;
    const curto = (v) => this._v3Curto(v);
    const totalM = meses.reduce((s, m) => s + (soma[m] || 0), 0);
    const sub = this._fModo === "mes" ? `${V3_MESES[Number(this._mes.slice(5, 7)) - 1]} · ${this._brl(soma[this._mes] || 0)}`
      : this._fModo === "ano" ? `${this._fAno} · ${this._brl(totalM)}` : `últimos 12 meses · ${this._brl(totalM)}`;
    return `<section class="v3-card v3-mmc${grande ? " v3-mm-g" : ""}${meses.length > 6 ? " v3-mm12" : ""}"><div class="v3-hd"><h2>Mês a mês <small class="v3-mm-sub">${this._e(sub)}<span class="v3-mm-emmil"> · em R$ mil</span></small></h2>${this._fModo !== "tudo" ? `<button class="v3-link" data-a="v2-per-tudo">Tudo ${V3_SVG("dir")}</button>` : ""}</div>
      <div class="v3-mm">${meses.map((m) => `<button class="${m === atual ? "on" : ""}" data-a="v2-per-mes" data-k="${m}" aria-label="${V3_MESES[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}: ${this._brl(soma[m] || 0)}" ${m > this._mesDe(new Date()) ? "disabled" : ""}>
        <i><b class="v3-mm-v" aria-hidden="true">${curto(soma[m] || 0)}</b><em style="height:calc((100% - 16px) * ${Math.max(0.03, (soma[m] || 0) / mx).toFixed(3)})"></em></i><small>${V3_MESES[Number(m.slice(5, 7)) - 1].slice(0, 3)}</small></button>`).join("")}</div></section>`;
  }

  // valor curto em cima da barra: "9,6 mil" (o " mil" some no quadro estreito com 12 meses)
  _v3Curto(v) {
    return v >= 1000 ? `${(v / 1000).toFixed(v >= 100000 ? 0 : 1).replace(".", ",").replace(",0", "")}<span class="v3-mm-mil"> mil</span>` : v > 0 ? String(Math.round(v)) : "";
  }

  // Tudo: janeiro a dezembro, uma barra por ano em cada mês (o ano mais recente no verde mais escuro). Os chips no alto
  // escolhem até 3 anos; tocar num mês mostra o valor de cada ano embaixo, e cada valor abre aquele mês.
  _v3Comparar(grande, soma) {
    const hoje = this._mesDe(new Date());
    const todos = [...new Set(Object.keys(soma).filter((m) => soma[m] > 0 && m <= hoje).map((m) => m.slice(0, 4)))].sort();
    if (!this._v3Anos?.length || !this._v3Anos.every((a) => todos.includes(a))) this._v3Anos = todos.slice(-3);
    const anos = [...this._v3Anos].sort(), um = anos.length === 1;
    const tom = (a) => { const i = anos.length - 1 - anos.indexOf(a); return i <= 0 ? "var(--v3-pri)" : `color-mix(in srgb,var(--v3-pri) ${i === 1 ? 55 : 28}%,var(--v3-acc))`; };
    const mm = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")), nomeM = (m) => V3_MESES[Number(m) - 1];
    const mx = Math.max(1, ...anos.flatMap((a) => mm.map((m) => soma[`${a}-${m}`] || 0)));
    const sel = this._v3MmSel || hoje.slice(5, 7), total = anos.reduce((s, a) => s + mm.reduce((t, m) => t + (soma[`${a}-${m}`] || 0), 0), 0);
    const grupos = mm.map((m) => `<div class="v3-cmp-g${m === sel ? " on" : ""}"><div class="v3-cmp-b">${anos.map((a) => {
      const k = `${a}-${m}`, v = soma[k] || 0;
      return `<button data-a="v3-mmsel" data-k="${m}" title="${nomeM(m)} de ${a}: ${this._brl(v)}" aria-label="${nomeM(m)} de ${a}: ${this._brl(v)}" ${k > hoje ? "disabled" : ""}>${um ? `<b class="v3-mm-v" aria-hidden="true">${this._v3Curto(v)}</b>` : ""}<em style="height:calc((100% - ${um ? 16 : 0}px) * ${(v ? Math.max(0.03, v / mx) : 0).toFixed(3)});background:${tom(a)}"></em></button>`;
    }).join("")}</div><small>${nomeM(m).slice(0, 3)}</small></div>`).join("");
    const det = `<div class="v3-cmp-d"><b>${nomeM(sel)}</b>${anos.map((a) => `${a}-${sel}` > hoje ? `<span class="v3-cmp-x off"><i style="background:${tom(a)}"></i>${a} · ainda não</span>`
      : `<button class="v3-cmp-x" data-a="v2-per-mes" data-k="${a}-${sel}" aria-label="Abrir ${nomeM(sel)} de ${a}"><i style="background:${tom(a)}"></i>${a} · ${this._brl(soma[`${a}-${sel}`] || 0)}${V3_SVG("dir")}</button>`).join("")}</div>`;
    const chips = todos.length > 1 ? `<div class="v3-cmp-anos" role="group" aria-label="Anos no gráfico">${todos.map((a) => `<button class="${anos.includes(a) ? "on" : ""}" aria-pressed="${anos.includes(a)}" data-a="v3-ano-cmp" data-k="${a}">${anos.includes(a) ? `<i style="background:${tom(a)}"></i>` : ""}${a}</button>`).join("")}</div>` : "";
    const sub = um ? `${anos[0]} · ${this._brl(total)}` : "por ano · toque num mês";
    return `<section class="v3-card v3-mmc v3-cmp${grande ? " v3-mm-g" : ""}${um ? " v3-mm12" : ""}"><div class="v3-hd"><h2>Mês a mês <small class="v3-mm-sub">${this._e(sub)}${um ? `<span class="v3-mm-emmil"> · em R$ mil</span>` : ""}</small></h2>${chips}</div>
      <div class="v3-cmp-mm">${grupos}</div>${det}</section>`;
  }

  // como foi pago: um chip por cartão ou forma (tocar abre as compras daquele meio)
  _v3ComoPago(lst) {
    const ids = new Set(lst.map((l) => l.c.id)), g = {};
    this._compras().filter((c) => ids.has(c.id)).forEach((c) => (c.pago_com || []).forEach((pg) => { const k = this._finPagGrupo(pg); g[k] = (g[k] || 0) + (pg.valor || 0); }));
    const e = Object.entries(g).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    if (!e.length) return "";
    const cor = (nome) => { const k = (this._fFin?.cartoes || []).find((x) => `Cartão ${String(x.nome).toUpperCase()}` === nome); return k ? this._finCartaoCor(k).fundo : "var(--v3-mut)"; };
    return `<section class="v3-card"><div class="v3-hd"><h2>Como foi pago</h2></div>
      <div class="v3-chips">${e.map(([k, v]) => `<button class="v3-chip" data-a="f-pag" data-k="${this._e(k)}"><i style="background:${cor(k)}"></i>${this._e(k.replace(/^Cartão /, ""))}<b>${this._brl(v)}</b></button>`).join("")}</div></section>`;
  }

  _v3Norm(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }

  // cor de cada cartão (o desenho escolhido no cadastro), como na v2
  _v3CorFaixa(k) { const c = this._finCartaoCor(k); return `--cf:${c.fundo};--ct:${c.tinta}`; }

  // ---------------------------------------------------------------- Compras: busca, lançar, enviar nota e a lista do período
  _v3Compras() {
    this._finEstado();
    this._finGarantir();
    return `<div class="v3-cbarra"><label class="v3-busca">${V3_SVG("busca")}<input id="v3-busca" type="search" placeholder="Buscar loja, área, pessoa ou forma de pagamento" aria-label="Buscar compras" value="${this._e(this._v3Busca || "")}" autocomplete="off"></label></div>
      <section class="v3-card v3-lista" id="v3-lista">${this._v3ComprasCorpo()}</section>`;
  }

  _v3ComprasCorpo() {
    const lst = this._finFiltradas(), idx = this._v3Faturas(), q = this._v3Norm(this._v3Busca).split(/\s+/).filter(Boolean);
    let itens = this._v3Itens(lst);
    if (q.length) itens = itens.filter(({ c }) => { const s = this._v3Norm([c.loja_curta, c.loja?.nome, c.categoria, c.subcategoria, c.quem, this._v3PagTxt(c), c.conta?.nome, c.itens_txt, c.observacao].join(" ")); return q.every((w) => s.includes(w)); });
    const lim = this._v2Lim || 120;
    return `${q.length ? `<div class="v3-dica v3-dica-e">${itens.length} ${itens.length === 1 ? "compra" : "compras"} com “${this._e(this._v3Busca)}” em ${this._e(this._finPeriodoTxt())}</div>` : ""}${this._v3Lista(itens.slice(0, lim), idx)}
      ${itens.length > lim ? `<button class="v3-bt v3-mais" data-a="v2-lim">Mostrar mais (${itens.length - lim})</button>` : ""}`;
  }

  // ---------------------------------------------------------------- Produtos: subiram, baixaram, onde compensa e os mais comprados
  _v3Produtos() {
    if (!this._prods && !this._prodErro && !this._v3ProdPedido) { this._v3ProdPedido = true; this._carregarProdutos(); }
    if (this._prodErro) return `<section class="v3-card"><div class="v3-vazio">⚠ ${this._e(this._prodErro)}</div></section>`;
    if (!this._prods) return `<section class="v3-card"><div class="v3-vazio">Carregando produtos…</div></section>`;
    const d = this._dados, sub = d.subiram || [], bai = d.baixaram || [];
    // onde mais produtos (dos comprados em 2 lojas ou mais) saem mais baratos
    const conta = {};
    for (const p of this._prods) if (p.n_lojas > 1 && p.mais_barato?.loja) conta[p.mais_barato.loja] = (conta[p.mais_barato.loja] || 0) + 1;
    const melhor = Object.entries(conta).sort((a, b) => b[1] - a[1])[0];
    const vezes = {};  // sem comparação suficiente: a loja onde os produtos mais se repetem (o mercado do dia a dia)
    for (const p of this._prods) if (p.n_lojas === 1 && p.lojas?.[0]) vezes[p.lojas[0]] = (vezes[p.lojas[0]] || 0) + (p.vezes || 0);
    const onde = Object.entries(vezes).sort((a, b) => b[1] - a[1])[0];
    return `<div class="v3-tres v3-tresp">
        <button class="v3-card v3-kpi" data-a="pvista" data-k="precos"><small>Subiram</small><b class="sobe">${sub.length}</b><span>desde a compra anterior ›</span></button>
        <button class="v3-card v3-kpi" data-a="pvista" data-k="precos"><small>Baixaram</small><b class="desce">${bai.length}</b><span>desde a compra anterior ›</span></button>
        ${melhor && melhor[1] >= 3 ? `<div class="v3-card v3-kpi"><small>Mercado que mais compensa</small><b>${this._e(melhor[0])}</b><span>mais barato em ${melhor[1]} dos produtos comprados em mais de uma loja</span></div>`
          : `<div class="v3-card v3-kpi"><small>Onde mais compram</small><b>${onde ? this._e(onde[0]) : "—"}</b><span>${onde ? `${onde[1]} compras de produtos · ainda há poucos produtos comparáveis entre lojas` : ""}</span></div>`}</div>
      <section class="v3-card"><div class="v3-hd"><h2>Mais comprados</h2><button class="v3-link" data-a="pvista" data-k="precos">Preços ${V3_SVG("dir")}</button></div>
        <label class="v3-busca">${V3_SVG("busca")}<input id="v3-qprod" type="search" placeholder="Buscar produto: leite, fralda, café…" aria-label="Buscar produto" value="${this._e(this._v3QProd || "")}" autocomplete="off"></label>
        <div id="v3-prods">${this._v3ProdLista()}</div></section>`;
  }

  _v3ProdLista() {
    const q = this._v3Norm(this._v3QProd).split(/\s+/).filter(Boolean), d = this._dados;
    const vari = new Map([...(d.subiram || []), ...(d.baixaram || [])].map((s) => [s.produto, s.variacao]));
    let l = this._prods.slice();
    if (q.length) l = l.filter((p) => { const s = this._v3Norm(`${p.busca || ""} ${p.descricao} ${(p.lojas || []).join(" ")}`); return q.every((w) => s.includes(w)); });
    l.sort((a, b) => b.vezes - a.vezes || b.gasto - a.gasto);
    const lim = q.length ? 60 : this._v3ProdLim || 20, resto = l.length - lim;
    const cap = (s) => { const x = String(s || "").toLowerCase(); return x.charAt(0).toUpperCase() + x.slice(1); };
    const linhas = l.slice(0, lim).map((p) => {
      const v = vari.get(p.chave), mb = p.mais_barato;
      return `<button class="v3-prod" data-a="produto" data-k="${this._e(p.chave)}"><span class="v3-it-t"><b>${this._e(cap(p.descricao))}</b>
        <small>${p.vezes}x${mb && p.n_lojas > 1 ? ` · melhor: ${this._e(mb.loja)} · ${this._brl(mb.unit)}` : p.ultimo?.loja ? ` · ${this._e(p.ultimo.loja)}` : ""}</small></span>
        <b class="v3-prod-v">${p.ultimo ? this._brl(p.ultimo.unit) : ""}</b><em class="v3-var ${v > 0 ? "sobe" : v < 0 ? "desce" : ""}">${v ? `${v > 0 ? "▲" : "▼"} ${Math.round(Math.abs(v) * 100)}%` : p.vezes > 1 ? "=" : ""}</em></button>`;
    }).join("");
    return (linhas || `<div class="v3-vazio">Nenhum produto com “${this._e(this._v3QProd)}”.</div>`)
      + (resto > 0 && !q.length ? `<button class="v3-bt v3-mais" data-a="v3-prod-mais">Mostrar mais (${resto})</button>` : "");
  }

  // ---------------------------------------------------------------- Áreas: um botão por área; a escolhida com subáreas, linha do tempo, veículo e lojas
  _v3Areas() {
    this._finEstado();
    this._finGarantir();
    const lst = this._finFiltradas(), idx = this._v3Faturas(), modo = this._fModo;
    const por = Object.entries(this._finSomaPor(lst, (l) => l.area)).sort((a, b) => b[1] - a[1]);
    if (!por.length) return `<section class="v3-card"><div class="v3-vazio">Nenhum gasto em ${this._e(this._finPeriodoTxt())}${this._fQuem === "Todos" ? "" : ` de ${this._e(this._fQuem)}`}.</div></section>`;
    if (!por.some(([a]) => a === this._v3Area)) { this._v3Area = por[0][0]; this._v3Sub = null; }
    const ar = this._v3Area, daArea = lst.filter((l) => l.area === ar), total = daArea.reduce((s, l) => s + l.valor, 0);
    const subs = Object.entries(this._finSomaPor(daArea, (l) => l.c.subcategoria || "Outros")).sort((a, b) => b[1] - a[1]);
    const sub = subs.some(([s]) => s === this._v3Sub) ? this._v3Sub : null;
    const vis = sub ? daArea.filter((l) => (l.c.subcategoria || "Outros") === sub) : daArea;
    const quando = modo === "mes" ? `em ${V3_MESES[Number(this._mes.slice(5, 7)) - 1]}` : modo === "ano" ? `em ${this._fAno}` : "no total";
    let cmp = "";
    if (modo === "mes") {  // contra a média dos 3 meses anteriores (da mesma pessoa, quando escolhida)
      const lin = this._finLinhas().filter((l) => l.area === ar && this._finDaPessoa(l));
      const media = [1, 2, 3].reduce((s, i) => { const m = this._finSomaMes(this._mes, -i); return s + lin.filter((l) => String(l.c.emissao).startsWith(m)).reduce((x, l) => x + l.valor, 0); }, 0) / 3;
      if (media > 0) { const v = (total - media) / media; cmp = `<div class="v3-tend ${v > 0 ? "sobe" : "desce"}">${V3_SVG(v > 0 ? "sobe" : "desce")}${Math.round(Math.abs(v) * 100)}% ${v > 0 ? "acima" : "abaixo"} da média dos 3 meses anteriores (${this._brl(media)})</div>`; }
    }
    const chips = `<div class="v3-achips" role="group" aria-label="Áreas">${por.map(([a, v]) => `<button class="v3-achip${a === ar ? " on" : ""}" data-a="v3-area" data-k="${this._e(a)}" aria-pressed="${a === ar}" style="--ac:${this._finInfo(a).cor}"><small><i></i>${this._e(a)}</small><b>${this._brl(v)}</b></button>`).join("")}</div>`;
    const det = `<section class="v3-card"><span class="v3-rot">${this._e(ar)} ${quando}</span><div class="v3-total m">${this._brl(total)}</div>${cmp}
      ${subs.length > 1 ? `<div class="v3-chips v3-subs">${subs.map(([s, v]) => `<button class="v3-chip${s === sub ? " on" : ""}" data-a="v3-sub" data-k="${this._e(s === sub ? "" : s)}" aria-pressed="${s === sub}">${this._e(s)}<b>${this._brl(v)}</b></button>`).join("")}</div>` : ""}</section>`;
    const itens = this._v3Itens(vis);
    const linha = `<section class="v3-card"><div class="v3-hd"><h2>Linha do tempo${sub ? ` · ${this._e(sub)}` : ""}</h2><span class="v3-dica0">${itens.length} ${itens.length === 1 ? "compra" : "compras"}</span></div>${this._v3Lista(itens, idx)}</section>`;
    const veic = (this._dados.bens || []).map((b) => {
      const lb = daArea.filter((l) => l.c.bem === b.id);
      if (!lb.length) return "";
      const cs = b.consumo || {}, km = cs.km_atual;  // só o km que vocês informaram
      const n1 = (v) => String(v).replace(".", ","), med = cs.tanque || cs.ultimos_30 || cs.geral;
      const linha = (rot, val, sub) => `<div class="v3-cons"><small>${rot}</small><b>${val}</b>${sub ? `<em>${sub}</em>` : ""}</div>`;
      const cons = med ? `<div class="v3-consg">
          ${cs.tanque ? linha("Tanque a tanque", `${n1(cs.tanque.kml)} km/l`, `${this._dataCurta(cs.tanque.de + "T12:00").slice(0, 5)} a ${this._dataCurta(cs.tanque.ate + "T12:00").slice(0, 5)}`) : ""}
          ${cs.ultimos_30 ? linha("Últimos 30 dias", `${n1(cs.ultimos_30.kml)} km/l`, `${cs.ultimos_30.km.toLocaleString("pt-BR")} km`) : ""}
          ${cs.geral ? linha("Média geral", `${n1(cs.geral.kml)} km/l`, `${cs.geral.leituras} leituras`) : ""}
          ${(cs.ultimos_30 || cs.geral)?.rs_km ? linha("Custo por km", this._brl((cs.ultimos_30 || cs.geral).rs_km), "combustível") : ""}
          ${cs.km_mes ? linha("Rodou no mês", `${cs.km_mes.toLocaleString("pt-BR")} km`, "") : ""}</div>`
        : `<div class="fs v3-consf">Consumo: ${cs.faltam_leituras ? `faltam ${cs.faltam_leituras} ${cs.faltam_leituras === 1 ? "leitura" : "leituras"} de km nos abastecimentos para calcular` : "ainda sem dados"}. Responda o km no aviso do posto (ou no Editar › Veículo).</div>`;
      return `<section class="v3-card"><div class="v3-hd"><h2>Veículo</h2></div><div class="v3-veic"><span class="v3-it-ic g">${V3_SVG("carro")}</span><span class="v3-it-t"><b>${this._e(b.nome)}</b><small>${km ? `${km.toLocaleString("pt-BR")} km (última leitura)` : "sem km lançado"}</small></span></div>
        ${cons}${cs.sem_km ? `<div class="fs v3-consf">${cs.sem_km} ${cs.sem_km === 1 ? "abastecimento" : "abastecimentos"} sem km nos últimos 90 dias.</div>` : ""}
        <div class="v3-cxa"><small>Gasto com o ${this._e(b.nome)} ${quando}</small><b>${this._brl(lb.reduce((s, l) => s + l.valor, 0))}</b></div></section>`;
    }).join("");
    const lojas = Object.entries(this._finSomaPor(vis, (l) => l.c.loja_curta || "—")).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const lojasH = `<section class="v3-card"><div class="v3-hd"><h2>Lojas</h2></div>${lojas.map(([nm, v]) => `<div class="v3-loja"><span>${this._e(nm)}</span><b>${this._brl(v)}</b></div>`).join("")}</section>`;
    const regras = this._hass?.user?.is_admin ? `<button class="v3-link v3-regras" data-a="f-cats">${V3_SVG("engrenagem")}Categorias e regras ›</button>` : "";
    if (!this._v2Largo) return `<div class="v3-areas">${chips}${det}${veic}${linha}${lojasH}${regras}</div>`;
    return `<div class="v3-areas">${chips}<div class="v3-grade"><div class="v3-col">${det}${linha}</div><div class="v3-col">${veic}${lojasH}${regras}</div></div></div>`;
  }

  // ---------------------------------------------------------------- A pagar: cartão com a fatura, atrasadas e próximas, contas da casa, assinaturas
  _v3Pagar() {
    this._finEstado();
    this._finGarantir();
    const F = this._fFin;
    if (!F) return `<section class="v3-card"><div class="v3-vazio">Carregando contas…</div></section>`;
    if (!this._fFatCache && !this._v3FatPedido) { this._v3FatPedido = true; this._finFatCarregar(); }  // assinaturas vêm das faturas do banco
    const hoje = F.hoje, d30 = new Date(hoje + "T12:00"); d30.setDate(d30.getDate() + 30);
    const lim = `${this._mesDe(d30)}-${String(d30.getDate()).padStart(2, "0")}`;
    const todos = this._finObrigacoes().filter((x) => x.tipo === "fatura" || this._finDoFiltro(x));
    const abertos = todos.filter((x) => !x.pago).sort((a, b) => a.vence.localeCompare(b.vence)), prox = abertos.filter((x) => x.vence <= lim);
    const soma = (l) => l.reduce((s, x) => s + x.total, 0);
    const resumo = `<div class="v3-pgtopo"><span>Em aberto <b>${this._brl(soma(abertos))}</b></span><span>Próximos 30 dias <b>${this._brl(soma(prox))}</b></span></div>`;
    const lista = `<section class="v3-card"><div class="v3-hd"><h2>Atrasadas e próximos 30 dias</h2></div>${prox.map((x) => this._v3LinhaPg(x, hoje)).join("") || `<div class="v3-vazio">Nada vencendo nos próximos 30 dias.</div>`}</section>`;
    const corr = this._fCorrigir ? `<div class="v3-alerta v3-corr"><span><b>Histórico de pagamentos</b> (lá embaixo) · ✎ em cada um corrige a data e a hora ou marca “não paguei”.</span><button class="v3-bt" data-a="f-corrigir">Fechar</button></div>` : "";
    const hist = this._fCorrigir ? `<div class="v-velho">${this._finPagarCorrigir(todos)}</div>` : "";
    const cart = this._v3PgCartoes(), casa = this._v3Casa(), ass = this._v3Assinaturas();
    if (!this._v2Largo) return `${corr}${this._v3Alerta()}${resumo}${cart}${lista}${casa}${ass}${hist}`;
    return `${corr}${this._v3Alerta()}${resumo}<div class="v3-grade v3-gpg"><div class="v3-col">${cart}</div><div class="v3-col">${lista}<div class="v3-par">${casa}${ass}</div></div></div>${hist}`;
  }

  _v3LinhaPg(x, hoje) {
    const atr = x.vence < hoje, d = new Date(x.vence + "T12:00");
    return `<div class="v3-pg${atr ? " atr" : ""}"><button class="v3-pg-l" data-a="f-conta" data-k="${this._e(x.id)}"><span class="v3-pg-d">${String(d.getDate()).padStart(2, "0")} ${V3_MESES[d.getMonth()].slice(0, 3)}</span>
      <span class="v3-pg-n">${this._e(this._v3NomeObr(x))}${atr ? ` <em class="v3-tag atr">ATRASADA</em>` : x.vence === hoje ? ` <em class="v3-tag hj">HOJE</em>` : ""}</span><b>${this._brl(x.total)}</b></button>
      <button class="v3-bt v3-paguei" data-a="f-pagar" data-k="${this._e(x.id)}">Paguei</button></div>`;
  }

  // cartão da frente (‹ › e bolinhas para trocar) e, embaixo, a fatura: Ver fatura abre as compras ali mesmo; Paguei confirma a data
  _v3PgCartoes() {
    const F = this._fFin, hoje = F.hoje, pessoa = this._fQuem !== "Todos" ? this._fQuem : null;
    const cred = (F.cartoes || []).filter((k) => k.credito !== false && k.ativo !== false && (!pessoa || (k.usam_hoje || k.usam || []).includes(pessoa)));
    const naHora = (F.cartoes || []).filter((k) => k.credito === false && k.ativo !== false && (!pessoa || (k.usam_hoje || k.usam || []).includes(pessoa)));
    if (!cred.length) return `<section class="v3-card"><div class="v3-hd"><h2>Cartões</h2></div><div class="v3-vazio">Nenhum cartão de crédito${pessoa ? ` de ${this._e(pessoa)}` : ""}.</div></section>`;
    const fats = (k) => (F.faturas || []).filter((x) => x.cartao === k.id).sort((a, b) => a.vence.localeCompare(b.vence));
    const atual = (k) => { const l = fats(k); return l.find((x) => !x.pago) || l[l.length - 1]; };
    const ord = cred.map((k) => ({ k, x: atual(k) })).sort((a, b) => `${a.x && !a.x.pago ? 0 : 1}${a.x?.vence || "9"}`.localeCompare(`${b.x && !b.x.pago ? 0 : 1}${b.x?.vence || "9"}`));
    this._v3PgIds = ord.map((c) => c.k.id);
    if (!this._v3PgIds.includes(this._v3PgCart)) this._v3PgCart = this._v3PgIds[0];
    const i = this._v3PgIds.indexOf(this._v3PgCart), { k, x } = ord[i];
    const nome = (kk) => this._finNomeCartao(kk);
    const parte = (y) => !pessoa ? y.total : (y.itens || []).filter((it) => it.quem === pessoa).reduce((s, it) => s + (it.valor || 0), 0);
    const fin = Object.entries(k.finais || {}).find(([, v]) => !v.parado && (!pessoa || v.quem === pessoa));
    const atras = ord.filter((_, j) => j !== i).slice(0, 2).map((o, j) => `<span class="v3-peek p${j + 1}" style="${this._v3CorFaixa(o.k)}"></span>`).join("");
    const ftpl = document.createElement("template");
    ftpl.innerHTML = this._finCartaoFace(k, x ? { ...x, total: parte(x) } : x);
    const fc = ftpl.content.querySelector(".fcface");
    if (fc && x) { fc.setAttribute("data-a", "v3-fat"); fc.removeAttribute("data-k"); fc.setAttribute("aria-label", `${nome(k)}: ${this._v3FatAberta ? "fechar" : "ver"} a fatura`); }
    const frente = `<div class="v3-pgpilha v-pilha">${atras}<div class="fpilha">${ftpl.innerHTML}</div></div>
      ${ord.length > 1 ? `<div class="v3-pgnav"><button class="v3-ib" data-a="v3-pgcart" data-k="-1" aria-label="Cartão anterior">${V3_SVG("esq")}</button>
        <span class="v3-dots">${ord.map((o, j) => `<button class="${j === i ? "on" : ""}" data-a="v3-pgcart-id" data-k="${this._e(o.k.id)}" aria-label="${this._e(nome(o.k))}" aria-current="${j === i}"></button>`).join("")}</span>
        <button class="v3-ib" data-a="v3-pgcart" data-k="1" aria-label="Próximo cartão">${V3_SVG("dir")}</button></div>` : ""}`;
    let fat = "";
    if (x) {
      const m = V3_MESES[Number(x.vence.slice(5, 7)) - 1], dv = new Date(x.vence + "T12:00");
      const antes = fats(k).filter((y) => y.vence < x.vence).slice(-3).reverse();
      const aberta = !!this._v3FatAberta, itens = (x.itens || []).filter((it) => !pessoa || it.quem === pessoa).slice().sort((a, b) => b.data.localeCompare(a.data));
      fat = `<div class="v3-fatbox"><div class="v3-fat-l1"><small>Fatura de ${m} · ${x.pago ? `paga em ${this._dataCurta(String(x.pago.em).slice(0, 10) + "T12:00")}` : `vence ${dv.getDate()} ${m.slice(0, 3)}`}</small>
          ${x.banco ? `<em class="v3-st ok">${V3_SVG("check")}Conferida com o banco</em>` : `<em class="v3-st">${V3_SVG("relogio")}soma das compras</em>`}</div>
        <div class="v3-fat-v">${this._brl(parte(x))}</div>
        <div class="v3-fat-bts"><button class="v3-bt" data-a="v3-fat" aria-expanded="${aberta}">${aberta ? "Fechar fatura" : "Ver fatura"}</button>${x.pago ? "" : `<button class="v3-bt prim" data-a="f-pagar" data-k="${this._e(x.id)}">Paguei</button>`}
          <button class="v3-link" data-a="f-conta" data-k="${this._e(x.id)}">Detalhes ${V3_SVG("dir")}</button></div>
        ${aberta ? `<div class="v3-fat-it">${itens.map((it) => `<button class="v3-it" data-a="abrir" data-id="${this._e(it.compra)}"><span class="v3-it-ic">${V3_SVG("recibo")}</span>
            <span class="v3-it-t"><b><i style="background:${this._cor(it.quem)}"></i>${this._e(it.loja)}</b><small>${this._dataCurta(it.data + "T12:00")}${it.de > 1 ? ` · parcela ${it.parcela} de ${it.de}` : ""}</small></span>
            <span class="v3-it-v"><b>${this._brl(it.valor)}</b></span></button>`).join("") || `<div class="v3-vazio">Nenhuma compra lançada nesta fatura${x.banco ? " (valor lido do banco)" : ""}.</div>`}
          ${antes.length ? `<div class="v3-hist">Histórico: ${antes.map((y) => `${V3_MESES[Number(y.vence.slice(5, 7)) - 1].slice(0, 3)} ${this._brl(parte(y))}`).join(" · ")}</div>` : ""}</div>` : ""}</div>`;
    }
    const chips = `<div class="v3-chips v3-cchips">${ord.map((o) => { const f = Object.keys(o.k.finais || {}).find((ff) => !o.k.finais[ff].parado); return `<button class="v3-chip${o.k.id === k.id ? " on" : ""}" data-a="v3-pgcart-id" data-k="${this._e(o.k.id)}"><i style="background:${this._v3CorFaixa(o.k).match(/--cf:([^;]+)/)[1]}"></i>${this._e(nome(o.k))}${f ? ` ·${this._e(f)}` : ""}</button>`; }).join("")}
      ${naHora.map((kk) => `<button class="v3-chip" data-a="v2-cart" data-k="${this._e(kk.id)}"><i style="background:${this._v3CorFaixa(kk).match(/--cf:([^;]+)/)[1]}"></i>${this._e(this._finNomeCartao(kk))}</button>`).join("")}</div>`;
    return `<section class="v3-card"><div class="v3-hd"><h2>Cartões</h2><button class="v3-link" data-a="f-fat">Ler fatura do banco ${V3_SVG("dir")}</button></div>${frente}${fat}${chips}</section>`;
  }

  // contas da casa em quadradinhos; os avisos e os links (água, luz, histórico) são os mesmos da tela de antes
  _v3Casa() {
    const F = this._fFin, hoje = F.hoje, g = {};
    for (const x of (F.contas || []).filter((y) => this._finDoFiltro(y))) (g[x.nome] ||= []).push(x);
    const tiles = Object.keys(g).sort().map((n) => {
      const l = g[n], x = l.filter((y) => !y.pago).sort((a, b) => a.vence.localeCompare(b.vence))[0] || l.sort((a, b) => b.vence.localeCompare(a.vence))[0];
      const dv = new Date(x.vence + "T12:00"), st = x.pago ? `<span class="ok">Paga</span>` : x.vence < hoje ? `<span class="atr">atrasada · ${dv.getDate()} ${V3_MESES[dv.getMonth()].slice(0, 3)}</span>` : `vence ${dv.getDate()} ${V3_MESES[dv.getMonth()].slice(0, 3)}`;
      return `<button class="v3-tile" data-a="f-conta" data-k="${this._e(x.id)}"><b>${this._e(x.nome)}</b><small>${this._e(x.fonte === "parcelada" ? `parcela ${x.referencia || ""}` : x.fonte_txt || "")}</small><span class="v3-tile-v">${this._brl(x.total)}</span><small>${st}</small></button>`;
    }).join("");
    const tpl = document.createElement("template");
    tpl.innerHTML = this._finContasCasa();
    const avisos = [...tpl.content.querySelectorAll(".falerta-l")].map((e) => e.outerHTML).join("");
    const links = [...tpl.content.querySelectorAll(".flinks button")].map((b) => { b.className = "v3-link"; return b.outerHTML; }).join("");
    return `<section class="v3-card"><div class="v3-hd"><h2>Contas da casa</h2></div>${avisos}<div class="v3-tiles">${tiles || `<div class="v3-vazio">Nenhuma conta cadastrada.</div>`}</div><div class="v3-links">${links}</div></section>`;
  }

  // assinaturas: o que se repete nas faturas do banco (3 meses ou mais, sem ser parcela)
  _v3Assinaturas() {
    const A = this._fFatCache?.assinaturas, F = this._fFin;
    const nomeK = (id) => { const k = (F.cartoes || []).find((x) => x.id === id); return k ? this._finNomeCartao(k) : id; };
    const corpo = !A ? `<div class="v3-vazio">Carregando…</div>` : !A.length ? `<div class="v3-vazio">Leia as faturas do banco para o CoFinance achar as assinaturas.</div>`
      : A.slice().sort((a, b) => b.valor_atual - a.valor_atual).slice(0, 6).map((a) => {
        const ativa = a.ultimo >= this._finSomaMes(F.hoje.slice(0, 7), -2);
        return `<div class="v3-ass"><span class="v3-ass-i">${this._e((a.descricao.replace(/^[^A-Za-z]*/, "")[0] || "?").toUpperCase())}</span><span class="v3-it-t"><b>${this._e(a.descricao)}</b><small>${this._e(nomeK(a.cartao))} ·${this._e(a.finais.join(", "))} · ${a.meses} meses</small></span>
          <b class="v3-ass-v">${this._brl(a.valor_atual)}</b><em class="v3-st ${ativa ? "ok" : ""}">${ativa ? "Ativa" : "Parou?"}</em></div>`;
      }).join("");
    return `<section class="v3-card"><div class="v3-hd"><h2>Assinaturas</h2><button class="v3-link" data-a="f-fat" data-k="assinaturas">Todas ${V3_SVG("dir")}</button></div>${corpo}</section>`;
  }

  // ---------------------------------------------------------------- cartão (só na v3): parecido com o cartão de verdade
  // faixas da pilha: banco e modelo, sem a sigla
  _finPilha(cards, i) {
    if (!cards.length) return `<div class="v3-vazio">Nenhum cartão cadastrado.</div>`;
    const atras = cards.filter((_, j) => j !== i).map(({ k, x }) => {
      const c = this._finCartaoCor(k);
      return `<button class="fpk${c.preto ? " preto" : ""}" data-a="f-cart-sel" data-k="${this._e(k.id)}" style="${this._finCartaoEstilo(c)}"><b>${this._e(this._finNomeCartao(k))}</b><span></span><span class="fpk-v">${x ? this._brl(x.total) : "—"}</span></button>`;
    }).join("");
    const pontos = cards.length > 1 ? `<div class="fdots" role="tablist" aria-label="Cartões">${cards.map(({ k }, j) => `<button class="fdot${j === i ? " on" : ""}" data-a="f-cart-sel" data-k="${this._e(k.id)}" role="tab" aria-selected="${j === i}" aria-label="Cartão ${this._e(this._finNomeCartao(k))}"></button>`).join("")}</div>` : "";
    return `<div class="fpilha">${atras ? `<div class="fpeek">${atras}</div>` : ""}${this._finCartaoFace(cards[i].k, cards[i].x)}${pontos}</div>`;
  }

  // a frente do cartão, montada como o cartão de verdade de cada banco (cada peça no lugar dela; logotipos não são copiados).
  // O benefício (Alelo, VR, Ticket, Pluxee…) é cartão da empresa dele: o desenho dela, com o saldo (refeição, alimentação) escrito.
  // modelo pronto = tem desenho próprio (codigo/cartoes/) ou a foto fiel do cartão; só esses aparecem para escolher no cadastro
  _finModeloPronto(id) { return !!CARTOES.modelos[id] || !!this._finEhFoto?.(id); }

  _finCartaoFace(k, x) {
    if (k?.modelo && this._finModeloId?.(k.modelo) !== k.modelo) k = { ...k, modelo: this._finModeloId(k.modelo) };  // modelo que saiu do catálogo
    const mi = this._finModelo?.(k.modelo), c = this._finCartaoCor(k), hoje = this._fFin.hoje, prod = String(k.visual?.produto || mi?.rotulo || this._finBeneficio?.(k) || "").toUpperCase();
    const tier = this._finCategoria(k), semTier = (s) => s.replace(/\b(INFINITE|BLACK|PLATINUM|SIGNATURE|GOLD|NANQUIM|GRAFITE|CLASSIC|STANDARD|INTERNACIONAL)\b/g, "").replace(/\s+/g, " ").trim();
    // o modelo escolhido no cadastro manda; sem ele, o padrão do banco (Bradesco Prime, Santander Unique, Ourocard crédito, Latam Pass)
    const MOD = CARTOES.modelos, LAY = CARTOES.bancos;  // codigo/cartoes/: o desenho de cada modelo e os bancos com desenho próprio
    const bid = this._finBancoId(k), b = MOD[k.modelo] || (mi ? (LAY.includes(mi.banco) ? mi.banco : "outro") : LAY.includes(bid) ? bid : "outro"), ouro = c.ouro && b !== "bbd" || (b === "bb" && c.preto);
    const arte = { wise: "wise-verde", alelo: "alelo-refeicao" }[b];  // desenho inteiro do cartão (arquivo em logos/, opcional)
    // fundo do modelo da biblioteca (logos/cartoes/<modelo>.svg: cor e textura do cartão de verdade); logo, chip e bandeira vêm por cima, como em todos
    const fundoN = mi && !MOD[k.modelo] && this._finTemFundo?.(k.modelo) ? `cartoes/${k.modelo}` : "";
    const tem = v3Logos([bid, arte, ...V3_BANDEIRAS_LOGO.map((n) => `band-${n}`)], () => this._render()), logo = (n, cls) => `<i class="v3f-logo ${cls || n}" style="--logo:url('${V3_LOGO(n)}')" aria-hidden="true"></i>`;
    // peças
    const chip = (ouro ? ["#e9cd85", "#a8862f", "#f6e2a6"] : ["#d7d9dc", "#8f959b", "#f1f2f4"]);
    const chipSvg = `<svg class="v3f-chip" viewBox="0 0 40 30" aria-hidden="true"><defs><linearGradient id="g${this._e(k.id)}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${chip[2]}"/><stop offset="1" stop-color="${chip[0]}"/></linearGradient></defs><rect x="1" y="1" width="38" height="28" rx="5" fill="url(#g${this._e(k.id)})" stroke="${chip[1]}"/><path d="M1 10h12M1 20h12M27 10h12M27 20h12M13 1v28M27 1v28M13 15h14" stroke="${chip[1]}" fill="none"/></svg>`;
    const nfc = `<svg class="v3f-nfc" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7.5c1.6 2.6 1.6 6.4 0 9M11 5.5c2.6 4 2.6 9 0 13M15 3.5c3.6 5.2 3.6 11.8 0 17" stroke="currentColor" fill="none" stroke-width="1.8" stroke-linecap="round"/></svg>`;
    const mc = `<span class="v3f-mcw"><svg class="v3f-mc" viewBox="0 0 48 30" aria-hidden="true"><defs><linearGradient id="m${this._e(k.id)}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8d8f93"/><stop offset="1" stop-color="#4c4e52"/></linearGradient><linearGradient id="n${this._e(k.id)}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e3e4e6"/><stop offset="1" stop-color="#a7a9ad"/></linearGradient></defs>
      <circle cx="16" cy="15" r="13" fill="url(#m${this._e(k.id)})" stroke="#e8e9eb" stroke-width=".9"/><circle cx="32" cy="15" r="13" fill="url(#n${this._e(k.id)})" fill-opacity=".85" stroke="#f4f4f5" stroke-width=".9"/></svg><b class="v3f-mcn">mastercard</b></span>`;
    const mcCor = `<span class="v3f-mcw"><svg class="v3f-mc" viewBox="0 0 48 30" aria-hidden="true"><circle cx="16" cy="15" r="13" fill="#eb001b"/><circle cx="32" cy="15" r="13" fill="#f79e1b"/><path d="M24 4.8a13 13 0 0 1 0 20.4 13 13 0 0 1 0-20.4z" fill="#ff5f00"/></svg></span>`;
    const colorido = !c.escuro && !c.preto;  // bandeira nas cores dela no cartão claro ou colorido; em metal no escuro
    const bn = String(k.bandeira || "").toLowerCase(), temB = V3_BANDEIRAS_LOGO.includes(bn) && tem.has(`band-${bn}`);
    const bandLogo = !temB ? "" : colorido ? `<img class="v3f-bdl ${bn}" src="${V3_LOGO(`band-${bn}`)}" alt="${this._e(k.bandeira)}">`
      : ["elo", "discover"].includes(bn) ? `<i class="v3f-logo v3f-bdm ${bn}" style="--logo:url('${V3_LOGO(`band-${bn}`)}')" role="img" aria-label="${this._e(k.bandeira)}"></i>` : "";
    const maestro = colorido ? mcCor.replace('fill="#eb001b"', 'fill="#0099df"').replace('fill="#f79e1b"', 'fill="#ed0006"').replace('fill="#ff5f00"', 'fill="#6c6bbd"') : mc.replace(">mastercard<", ">maestro<");
    const bandeira = k.bandeira === "Mastercard" ? (colorido ? mcCor : mc) : k.bandeira === "Maestro" ? maestro : k.bandeira === "Visa" ? (tem.has("visa") ? `${logo("visa", "visa")}<b class="v3f-sr">VISA</b>` : `<b class="v3f-visa">VISA</b>`) : bandLogo ? bandLogo : V3_BANDEIRA[k.bandeira] ? V3_BANDEIRA[k.bandeira](colorido) : k.bandeira && k.bandeira !== "Outra" && k.bandeira !== "Sem bandeira" ? `<b class="v3f-mcn">${this._e(k.bandeira)}</b>` : "";
    const sit = !x || x.gasto ? "" : x.pago ? "✓ paga" : x.vence < hoje ? "atrasada" : x.vence === hoje ? "vence hoje" : "";
    const info = `<span class="v3f-info"><small>${x?.gasto ? this._e(x.rotulo) : x ? `Fatura · vence ${this._dataCurta(x.vence + "T12:00")}` : k.credito === false ? "Nenhum gasto este mês" : "Nenhuma fatura em aberto"}</small><b>${x ? this._brl(x.total) : "—"}</b>${sit ? `<em class="${sit === "✓ paga" ? "" : "atr"}">${sit}</em>` : x?.gasto ? `<em>${x.n} ${x.n === 1 ? "compra" : "compras"}</em>` : ""}</span>`;
    const band = (cls = "") => bandeira ? `<span class="v3f-band ${cls}">${bandeira}${tier ? `<small>${this._e(k.bandeira === "Mastercard" ? tier.toLowerCase() : tier)}</small>` : ""}</span>` : "";
    const p = { k, x, c, mi, prod, tier, semTier, bid, arte, tem, logo, chipSvg, nfc, mc, mcCor, bandeira, info, band, e: (s) => this._e(s), LOGO: V3_LOGO,
      nomeBanco: () => this._finBancoNome(k) };
    let corpo = (CARTOES.layouts[b] || CARTOES.layouts.outro)(p);  // o desenho de cada banco mora em codigo/cartoes/<banco>.js
    // cartão em foto: o desenho do banco inteiro, igual ao de verdade; o CoFinance só escreve o valor e a fatura (num vidro, para ler em qualquer fundo)
    const foto = fundoN && this._finEhFoto?.(k.modelo);
    if (foto) corpo = `<img class="v3f-arte" src="${V3_LOGO(fundoN)}" alt="">${info}`;
    else if (fundoN) corpo = `<img class="v3f-arte" src="${V3_LOGO(fundoN)}" alt="" onerror="this.remove()">${corpo.replace(/^\s*<svg class="v3f-arte"[\s\S]*?<\/svg>/, "")}`;
    const cls = `fcface v3f ${foto ? "foto" : b}${!foto && CARTOES.verticais.has(b) ? " vert" : foto && CARTOES.fotosEmPe.has(k.modelo) ? " vert fotov" : ""}${c.preto ? " preto" : ""}${ouro ? " ouro" : ""}`, est = this._finCartaoEstilo(c), nm = this._finNomeCartao(k);
    if (x?.gasto) return x.acao ? `<button class="${cls}" data-a="${x.acao}" data-k="${this._e(k.id)}" style="${est}" aria-label="${this._e(`${nm}: ${x.rotulo}, ${this._brl(x.total)}`)}">${corpo}</button>` : `<div class="${cls}" style="${est}">${corpo}</div>`;
    return x ? `<button class="${cls}" data-a="f-conta" data-k="${this._e(x.id)}" style="${est}" aria-label="${this._e(`${nm}: fatura de ${this._brl(x.total)}, vence ${this._dataCurta(x.vence + "T12:00")}`)}">${corpo}</button>`
      : `<div class="${cls}" style="${est}">${corpo}</div>`;
  }

  // ---------------------------------------------------------------- janela da compra: uma página só
  _folha() {
    if (this._v2Imp || this._v2Classif) {  // prévia das faturas e lojas para classificar: a mesma folha da compra (rola no iPhone)
      return super._folha().replace('<dialog class="folha v2f v2larga"', '<dialog class="folha v3d v3larga" autofocus');
    }
    const livre = !this._novo && !this._up && !this._fConf;
    if (this._aberta && !this._nota && livre) return `<dialog class="folha v3d" autofocus aria-label="Compra">${this._v3Compra()}</dialog>`;
    if (this._v2Cart && !this._fConta && !this._aberta && livre) return `<dialog class="folha v3d" autofocus aria-label="Faturas do cartão">${this._v2CartLista()}</dialog>`;
    if (this._fConta && !this._aberta && livre) return `<dialog class="folha v3d" autofocus aria-label="Conta">${this._v2Conta()}</dialog>`;
    return super._folha();
  }

  _v3Compra() {
    const c = this._aberta;
    if (this._v3Id !== c.id) { this._v3Id = c.id; this._v3Ed = false; this._v3Nota = false; }
    const fechar = `<button class="v3-ib" data-a="fechar" aria-label="Fechar">${V3_SVG("fechar")}</button>`;
    const cab0 = `<div class="v3-dh"><h2>Compra</h2>${fechar}</div>`;
    if (c.carregando) return `${cab0}<div class="v3-vazio">Abrindo a compra…</div>`;
    const idx = this._v3Faturas(), [st, tom] = this._v3Status(c, idx, true), area = c.categoria || "Outros";
    const dt = new Date(c.data_compra || c.emissao), q = this._dia(c.data_compra || c.emissao);
    const diaTxt = isNaN(dt) ? "" : `${dt.getDate()} de ${V3_MESES[dt.getMonth()]} de ${dt.getFullYear()}${c.data_compra ? "" : ` · ${q.hora}`}${c.loja?.cidade ? ` · ${this._e(c.loja.cidade)}` : ""}`;
    const origem = c.via === "applepay" ? "Pago pelo telefone" : c.via === "fatura" ? "Veio da fatura" : c.via === "pedido" ? `E-mail do pedido ${c.pedido?.loja || ""}`.trim()
      : c.origem === "manual" ? "Lançada à mão" : c.pedido ? `Nota · pedido ${c.pedido.loja}` : "Nota fiscal";
    const valor = this._semReal(c) ? this._moeda(c.moeda) : this._brl(c.cobrado?.valor ?? c.valor_pago);
    const corK = (nome) => { const k = (this._fFin?.cartoes || []).find((x) => x.nome === nome); return k ? this._finCartaoCor(k).fundo : "var(--v3-mut)"; };
    const r = c.reembolso?.status;
    const chips = [
      `<span class="v3-chip"><i style="background:${this._cor(c.quem)}"></i>${this._e(c.quem || "—")}</span>`,
      ...(c.pago_com || []).filter((p) => p.tipo).map((p) => `<span class="v3-chip">${p.cartao ? `<i style="background:${corK(p.cartao)}"></i>` : ""}${this._e(this._v3PgNome(p))}</span>`),
      `<span class="v3-st ${tom}">${V3_SVG({ ok: "check", ok2: "check", aviso: "alerta", "": "relogio" }[tom])}${st}</span>`,
      ...(this._v3Reemb(c) ? [this._v3Reemb(c)].map(([t, k]) => `<span class="v3-st ${k}">${V3_SVG(k ? "alerta" : "check")}${t}</span>`) : []),
    ].join("");
    const cab = `${cab0}<div class="v3-dtop"><span class="v3-it-ic g">${V3_SVG(this._v3Icone(c))}</span>
        <span class="v3-dnome"><b>${this._e(c.loja_curta)}</b><small>${origem} · <i style="background:${this._finInfo(area).cor}"></i>${this._e(this._classe(c))}</small></span>
        <span class="v3-dval">${valor}${c.cobrado ? `<small>nota ${this._brl(c.valor_pago)}</small>` : ""}</span></div>
      <div class="v3-chips">${chips}</div><div class="v3-ddata">${diaTxt}</div>`;
    const falta = (c.pago_com || []).some((p) => !p.tipo) || (c.pago_com || []).some((p) => p.tipo === "Crédito" && !p.cartao && (c.cartoes || []).length);
    const aviso = this._aviso ? `<div class="aviso" role="status">${this._e(this._aviso)}</div>` : "";
    const p = this._v3Ed || this._v3Nota ? this._v2Partes() : null;
    return `${cab}${aviso}
      ${falta ? `<button class="v3-falta" data-a="v3-ed">${V3_SVG("alerta")}<span>Falta dizer a forma de pagamento ou o cartão. <b>Completar ›</b></span></button>` : ""}
      ${this._v3Pedido(c)}
      ${this._v3Caminho(c, idx)}
      ${c.via === "fatura" ? `${(c.itens || []).length ? this._v3Cupom(c) : ""}${this._v2NotaFatura(c)}` : this._v3Cupom(c)}
      <div class="v3-dacoes"><button class="v3-bt${this._v3Ed ? " on" : ""}" data-a="v3-ed" aria-expanded="${!!this._v3Ed}">${V3_SVG("lapis")}Editar</button>
        ${c.via !== "fatura" ? `<button class="v3-bt${this._v3Nota ? " on" : ""}" data-a="v3-nota" aria-expanded="${!!this._v3Nota}">${V3_SVG("recibo")}${c.origem === "manual" ? "Detalhes" : "Nota completa"}</button>` : ""}</div>
      ${this._v3Ed ? `<div class="v3-parte v-parte v-ed">${this._v3Editar(c, p.editar)}</div>` : ""}
      ${this._v3Nota ? `<div class="v3-parte v-parte">${p.nota}</div>` : ""}`;
  }

  // reabrir a mesma compra (depois de salvar algo nela) recolhe o grupo; outra compra começa do zero
  async _abrir(id) {
    if (this._aberta?.id === id) this._v3Grupo = null; else { this._v3Grupo = undefined; this._v3Qa = null; }
    return super._abrir(id);
  }

  // Lojas para classificar (as mesmas regras da v2): a loja que a Central já conhece (compra por nota ou Apple Pay com
  // nome parecido) já vem com o nome e a área dela; é só conferir e Salvar. A desconhecida pede a área e, se quiser, o nome fantasia.
  _v2FolhaClassif() {
    const L = this._v2Classif, fechar = `<button class="v-ib" data-a="fechar" aria-label="Fechar">${V3_SVG("fechar")}</button>`;
    const cab = `<div class="v-fh"><span class="v-ft"><b>Lojas para classificar</b><small>uma vez por loja; vale para as compras dela e as próximas</small></span>${fechar}</div>`;
    const aviso = this._aviso ? `<div class="aviso" role="status">${this._e(this._aviso)}</div>` : "";
    if (L.carregando) return `${cab}<div class="v-vazio">Carregando…</div>`;
    if (!L.lojas?.length) return `${cab}${aviso}<div class="v-vazio">Tudo classificado.</div>`;
    const arv = (L.arvore || []).filter((a) => a.nome !== "Outros");
    return `${cab}${aviso}<div class="v-lista">${L.lojas.slice(0, 60).map((x, i) => {
      const s = x.sugestao;  // só a área aqui; a subcategoria a pessoa dá depois, na compra
      return `<div class="v-cl${s ? " v3-conhecida" : ""}">
      <div class="v-t"><b>${this._e(s ? s.nome : x.loja)}</b><small>${this._e(x.descricao)} · ${x.n} ${x.n === 1 ? "compra" : "compras"} · ${this._brl(x.total)} · ${this._e(x.quem.join(", "))}</small>
        ${s ? `<small class="v3-sug">✓ Já conhecida: confira e salve.</small>` : ""}</div>
      <div class="v-cl-campos">
        <select id="cl-a-${i}" class="v-cl-area" data-i="${i}" aria-label="Área"><option value="">Área…</option>${arv.map((a) => `<option ${s && a.nome === s.categoria ? "selected" : ""}>${this._e(a.nome)}</option>`).join("")}</select>
        <select id="cl-s-${i}" class="v3-semsub" aria-hidden="true" tabindex="-1" hidden></select>
        <input id="cl-n-${i}" type="text" maxlength="40" placeholder="Nome fantasia (opcional)" aria-label="Nome fantasia, como aparece no painel (opcional)" value="${s ? this._e(s.nome) : ""}" autocomplete="off">
        <button class="btn prim" data-a="v2-classif-salvar" data-k="${this._e(x.chave)}" data-i="${i}">Salvar</button>
      </div></div>`; }).join("")}</div>
      ${L.lojas.length > 60 ? `<div class="fs">Mostrando 60 de ${L.lojas.length} lojas. As outras aparecem conforme estas forem saindo.</div>` : ""}`;
  }

  // Editar em acordeão: 4 linhas que expandem e recolhem (uma por vez), cada uma com o valor atual e o próprio Salvar.
  // O Pagamento é o bloco de sempre (vem da base); Quem e área grava só no Salvar; Excluir fica no fim, à vista.
  _v3Editar(c, editarBase) {
    const tpl = document.createElement("template");
    tpl.innerHTML = editarBase;
    const cart = tpl.content.querySelector("details.cartbox");
    cart?.setAttribute("open", "");
    const pagHtml = (tpl.content.querySelector(".cobr")?.outerHTML || "") + (cart ? cart.outerHTML : "");
    const d = this._dados || {}, q = this._v3Qa || {}, g = this._v3Grupo ?? ((c.pago_com || []).some((x) => !x.tipo) ? "pag" : null);
    const quem = q.quem ?? c.quem, cat = q.categoria ?? c.categoria, ramo = this._ramo(cat);
    const sub = q.subcategoria ?? (cat === c.categoria ? c.subcategoria || "" : (ramo?.subs || [])[0] || ""), bem = q.bem ?? (c.bem || "");
    const op = (lista, atual) => lista.map(([v, t]) => `<option value="${this._e(v)}" ${v === atual ? "selected" : ""}>${this._e(t)}</option>`).join("");
    const mudouQa = quem !== c.quem || cat !== c.categoria || sub !== (c.subcategoria || "") || bem !== (c.bem || "");
    const qaHtml = `<div class="v3-gform">
        <label>Quem comprou<select data-v3qa="quem">${op((d.compradores || []).map((x) => [x, x]), quem)}</select></label>
        <label>Categoria<select data-v3qa="categoria">${op((d.categorias || []).map((x) => [x, `${this._ramo(x)?.icone || ""} ${x}`]), cat)}</select></label>
        ${ramo?.pelos_itens ? `<label>Subcategoria<span class="fs">pelas seções dos itens</span></label>` : `<label>Subcategoria<select data-v3qa="subcategoria">${op((ramo?.subs || []).map((x) => [x, x]), sub)}</select></label>`}
      </div>
      <div class="v3-gacoes"><button class="btn prim" data-a="v3-qa-salvar" ${mudouQa ? "" : "disabled"}>Salvar</button>${mudouQa ? `<button class="btn" data-a="v3-qa-cancelar">Cancelar</button>` : `<span class="fs">nada é gravado sem Salvar</span>`}</div>`;
    const cnpj = String(c.loja?.cnpj || ""), cnpjF = cnpj.length === 14 ? cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") : cnpj;
    const lojaHtml = `${cnpj ? `<div class="v3-gdado"><span>Razão social</span><b>${this._e(c.loja?.nome || "—")}</b></div><div class="v3-gdado"><span>CNPJ</span><b>${this._e(cnpjF)}</b></div>` : ""}
      <div class="apel"><label>Nome fantasia<input id="ap-nome" type="text" maxlength="40" value="${this._e(c.loja_curta)}" autocomplete="off"></label><button class="btn" data-a="apelido">Salvar nome</button></div>
      <div class="fs">${cnpj ? "Como a loja aparece nas suas compras; vale para todas as filiais. Apague e salve para voltar ao nome da nota." : "Compra sem nota: o nome muda só nesta compra."}</div>
      ${c.moeda ? `<div class="apel"><label>Valor em R$ (convertido)<input id="ed-brl" type="text" inputmode="decimal" placeholder="não convertido" value="${c.valor_pago ? this._e(Number(c.valor_pago).toLocaleString("pt-BR", { minimumFractionDigits: 2 })) : ""}" autocomplete="off"></label><button class="btn" data-a="converter">Salvar valor</button></div>` : ""}
      ${c.origem === "manual" ? `<div class="apel"><label>O que comprou<input id="ed-item" type="text" maxlength="80" placeholder="ex.: carne moída" value="${this._e(c.itens?.[0]?.descricao || "")}" autocomplete="off"></label><button class="btn" data-a="item-salvar">Salvar item</button></div>` : ""}`;
    const pgs = (c.pago_com || []).filter((x) => x.tipo), dia = String(c.data_compra || c.emissao || "").slice(0, 10).split("-").reverse().slice(0, 2).join("/");
    const re = this._v3Reemb(c);
    const vs = (d.bens || []).filter((b) => b.tipo === "veiculo"), doCarro = vs.length && (c.litros || (c.categoria === "Carro" && !/estacion|ped[aá]gio|combust/i.test(c.subcategoria || "")));  // posto, oficina, pneu, revisão (estacionamento e pedágio, não)
    const bemNome = (vs.find((b) => b.id === c.bem) || (vs.length === 1 && c.litros ? vs[0] : null))?.nome;
    const kmF = (n) => Number(n).toLocaleString("pt-BR");
    const veicHtml = doCarro ? `<div class="v3-gform">
        ${vs.length > 1 || !c.litros ? `<label>Veículo<select id="ed-bem"><option value="">Nenhum</option>${vs.map((b) => `<option value="${this._e(b.id)}" ${b.id === (c.bem || (vs.length === 1 && c.litros ? vs[0].id : "")) ? "selected" : ""}>${this._e(b.nome)}</option>`).join("")}</select></label>` : ""}
        <label>Km do painel<input id="ed-km" type="text" inputmode="numeric" placeholder="ex.: 52300" value="${c.km ? this._e(kmF(c.km)) : ""}" autocomplete="off"></label>
      </div>
      ${c.litros ? `<label class="v3-gchk"><input id="ed-cheio" type="checkbox" ${c.cheio ? "checked" : ""}> Completei o tanque <small class="fs">(${String(c.litros).replace(".", ",")} L nesta nota)</small></label>` : ""}
      <div class="v3-gacoes"><button class="btn prim" data-a="v3-km-salvar">Salvar</button><span class="fs">${c.litros ? "o km entra no cálculo do consumo" : "o km fica no histórico do veículo"}</span></div>` : "";
    const grupos = [
      ["pag", "Pagamento", pgs.length ? `${pgs.map((x) => this._v3PgNome(x)).join(" + ")} · ${dia}` : "Falta a forma de pagamento", pagHtml],
      ["qa", "Quem e área", `${c.quem || "—"} · ${this._classe(c)}`, qaHtml],
      ["reemb", "Reembolso", re ? re[0] : "Nenhum", this._edReembolso(c)],
      ["loja", "Loja", c.loja_curta || "—", lojaHtml],
      ...(doCarro ? [["veic", "Veículo", `${bemNome || "—"} · ${c.km ? `${kmF(c.km)} km${c.cheio ? " · cheio" : ""}` : "sem km"}`, veicHtml]] : []),
    ];
    const excl = this._confExcluir
      ? `<div class="v3-excl" role="alertdialog" aria-label="Excluir compra"><b>Excluir esta compra?</b><span class="fs">${this._e(c.loja_curta)} · ${this._brl(c.cobrado?.valor ?? c.valor_pago)} · ${dia}. Ela sai da lista e dos totais; dá para recuperar em ⚙ › Excluídas (ficam as 10 últimas).</span>
          <span class="v3-gacoes"><button class="btn perigo" data-a="excluir-sim">Sim, excluir</button><button class="btn" data-a="excluir-nao">Cancelar</button></span></div>`
      : `<button class="lnk perigo v3-excl-lnk" data-a="excluir">Excluir compra</button>`;
    return `<div class="v3-acord">${grupos.map(([k, t, resumo, corpo]) => `<div class="v3-g${g === k ? " on" : ""}">
        <button class="v3-gl" data-a="v3-grupo" data-k="${k}" aria-expanded="${g === k}"><span class="v3-gt">${t}</span><span class="v3-gr">${this._e(resumo)}</span><span class="v3-gs" aria-hidden="true">›</span></button>
        ${g === k ? `<div class="v3-gc">${corpo}</div>` : ""}</div>`).join("")}</div>${excl}`;
  }

  // caminho do dinheiro: compra → fatura → pagamento (crédito), ou "saiu na hora" (débito, Pix, vale, dinheiro)
  _v3Caminho(c, idx) {
    const F = this._fFin, hoje = F?.hoje || this._finHoje(), lanc = idx.get(c.id) || [];
    const dc = (d) => this._dataCurta(String(d).slice(0, 10) + "T12:00"), dCompra = dc(c.data_compra || c.emissao);
    const passo = (feito, t, s) => `<div class="v3-passo${feito ? " ok" : ""}"><i></i><b>${t}</b><small>${s}</small></div>`;
    if (lanc.length) {
      const k = (F.cartoes || []).find((x) => x.id === lanc[0].f.cartao), nomeK = k ? this._finNomeCartao(k) : lanc[0].f.cartao;
      const atual = lanc.find((x) => !x.f.pago) || lanc[lanc.length - 1], f = atual.f;
      const passos = `<div class="v3-passos">${passo(true, "Compra", dCompra)}${V3_SVG("seta")}${passo(f.fecha <= hoje, "Fatura", `${this._e(nomeK)} · fecha ${dc(f.fecha)}`)}${V3_SVG("seta")}${passo(!!f.pago, "Pagamento", f.pago ? `paga em ${dc(f.pago.em)}` : `vence ${dc(f.vence)}`)}</div>`;
      const de = atual.i.de || 1;
      const parcelas = de > 1 ? `<div class="v3-parcs">${lanc.map((x) => `<button class="v3-parc${x.f.pago ? " ok" : ""}${x === atual ? " atual" : ""}" data-a="f-conta" data-k="${this._e(x.f.id)}">
          <b>${x.i.parcela}/${x.i.de}</b><span>Fatura de ${V3_MESES[Number(x.f.vence.slice(5, 7)) - 1]}</span><span>${this._brl(x.i.valor)}</span><small>${x.f.pago ? "✓ paga" : `vence ${dc(x.f.vence)}`}</small></button>`).join("")}</div>` : "";
      return `<section class="v3-cam"><div class="v3-cam-t">Caminho do dinheiro${de > 1 ? ` · ${de} parcelas` : ""}</div>${passos}${parcelas}</section>`;
    }
    const pgs = (c.pago_com || []).filter((p) => p.tipo);
    if (pgs.length && pgs.every((p) => V3_NA_HORA.includes(p.tipo)))
      return `<section class="v3-cam"><div class="v3-cam-t">Caminho do dinheiro</div><div class="v3-passos">${passo(true, "Compra", dCompra)}${V3_SVG("seta")}${passo(true, "Saiu na hora", this._e(pgs.map((p) => this._pagNome(p)).join(" + ")))}</div></section>`;
    if (pgs.some((p) => p.tipo === "Crédito"))
      return `<section class="v3-cam"><div class="v3-cam-t">Caminho do dinheiro</div><div class="v3-passos">${passo(true, "Compra", dCompra)}${V3_SVG("seta")}${passo(false, "Fatura", c.fatura_txt ? this._e(c.fatura_txt) : "cartão fora das faturas daqui")}</div></section>`;
    return "";
  }

  // pedido de loja online (e-mail): as lojas pagas juntas, o pago de verdade de cada uma e onde está a cobrança
  _v3Pedido(c) {
    const pd = c.pedido_resumo;
    if (!pd) return "";
    const dc = (d) => this._dataCurta(String(d).slice(0, 10) + "T12:00"), n = pd.partes.length, cob = pd.cobranca || {};
    const pg = pd.pagamento || {}, como = pg.tipo === "Crédito" ? `${pd.cartao || `cartão final ${pg.final || "?"}`}${(pg.parcelas || 1) > 1 ? ` em ${pg.parcelas}x` : ""}` : pg.carteira || pg.tipo || "";
    const onde = pd.situacao === "cancelado" ? "pedido cancelado"
      : cob.situacao === "na_fatura" ? `✓ cobrança conferida na fatura do banco${cob.vence ? ` (vence ${dc(cob.vence)})` : ""}`
      : cob.situacao === "aguardando" ? `cobrança de ${this._brl(pd.total)} esperada na fatura que fecha ${dc(cob.fecha)}`
      : cob.situacao === "na_hora" ? "pago na hora" : "";
    const linhas = pd.partes.map((x) => {
      const eu = x.compra === c.id, st = x.situacao === "cancelada" ? "cancelado" : x.nota ? "com nota" : "sem nota ainda";
      const dentro = `<span class="v3-ped-v">${this._e(x.vendedor || x.numero)}<small>${st}${x.cupom ? ` · cupom ${this._brl(x.cupom)}` : ""}</small></span><b>${x.situacao === "cancelada" ? `<s>${this._brl(x.pago)}</s>` : this._brl(x.pago)}</b>`;
      return eu || !x.compra ? `<div class="v3-ped-l${eu ? " eu" : ""}">${dentro}</div>` : `<button class="v3-ped-l" data-a="abrir" data-id="${this._e(x.compra)}">${dentro}</button>`;
    }).join("");
    return `<section class="v3-cam v3-ped"><div class="v3-cam-t">Pedido ${this._e(pd.loja)} · ${dc(pd.data)}${n > 1 ? ` · ${n} lojas` : ""}</div>
      <div class="v3-ped-tot"><b>${this._brl(pd.total)}</b><span>${this._e(como)}${onde ? ` · ${this._e(onde)}` : ""}</span></div>
      ${n > 1 ? `<div class="v3-ped-ls">${linhas}</div>` : ""}${this._v3Valores(c, pd, cob)}</section>`;
  }

  // Valores desta loja do pedido: o que o e-mail da loja diz (preço, frete, cupom → pago, que é o que conta no gasto) e,
  // se a compra é a nota, o valor da nota (que não conta: cupom da loja online não aparece na nota)
  _v3Valores(c, pd, cob) {
    const x = pd.partes.find((y) => y.compra === c.id);
    if (!x || x.produtos == null) return "";
    const nome = { "Cupom": "Cupom de desconto", "Desconto do frete": "Desconto do frete", "Cupom do vendedor": "Cupom do vendedor", "Moedas Shopee": "Moedas Shopee" };
    const l = (t, v, neg) => `<div class="v3-cl"><span>${t}</span><b>${neg ? "−" : ""}${this._brl(v)}</b></div>`;
    const nota = c.chave && c.valor_pago != null && Math.abs((c.valor_pago || 0) - (x.pago || 0)) > 0.005;
    return `<div class="v3-ped-val"><div class="v3-cam-t">Valores${pd.partes.length > 1 ? ` · ${this._e(x.vendedor || "")}` : ""}</div>
      ${l("Preço dos produtos", x.produtos)}${x.frete ? l("Frete", x.frete) : ""}${(x.descontos || []).map((d) => l(this._e(nome[d.motivo] || d.motivo), d.valor, true)).join("")}
      <div class="v3-cl v3-ped-pago"><span>Pago · é o que conta no gasto${cob.situacao === "na_fatura" ? " ✓ fatura" : ""}</span><b>${this._brl(x.pago)}</b></div>
      ${nota ? `<div class="fs">Na nota fiscal: ${this._brl(c.valor_produtos)}${c.desconto ? ` − desconto da loja ${this._brl(c.desconto)}` : ""} = ${this._brl(c.valor_pago)}. O cupom não aparece na nota; o gasto é o pago.</div>` : ""}</div>`;
  }

  // cupom: os itens da nota (quantidade, descrição, total), ▲▼ quando o preço mudou desde a última compra na mesma loja
  _v3Cupom(c) {
    const itens = c.itens || [];
    if (!itens.length) return "";
    const nfe = (c.chave || "").slice(20, 22) === "55";
    const linhas = itens.map((i) => {
      const cp = i.comparacao, v = cp && Math.abs(cp.variacao) >= 0.03 ? cp.variacao : null;
      return `<div class="v3-cl"><span>${i.qtd == null ? "" : `${this._num(i.qtd)}${i.un && !/^UN/i.test(i.un) ? ` ${this._e(i.un.toLowerCase())}` : "x"} `}${this._e(i.descricao)}${v != null ? ` <em class="${v > 0 ? "sobe" : "desce"}" title="antes ${this._brl(cp.de)} em ${this._dataCurta(cp.data)}">${v > 0 ? "▲" : "▼"}${Math.round(Math.abs(v) * 100)}%</em>` : ""}</span><b>${this._finCurto(i.total)}</b></div>`;
    }).join("");
    return `<section class="v3-cupom"><div class="v3-cc"><b>${this._e(String(c.loja_curta || "").toUpperCase())}</b><br>${c.via === "pedido" ? `PEDIDO ${this._e(String(c.pedido?.loja || "").toUpperCase())}` : c.doacao_7me ? "DÍZIMO E OFERTAS · PELO 7ME" : c.via === "fatura" ? "COMO FOI DIVIDIDO" : c.origem === "manual" ? "LANÇADA À MÃO" : nfe ? "NOTA FISCAL ELETRÔNICA" : "CUPOM FISCAL ELETRÔNICO"}</div>
      ${linhas}${c.frete ? `<div class="v3-cl"><span>Frete</span><b>${this._finCurto(c.frete)}</b></div>` : ""}${c.desconto ? `<div class="v3-cl"><span>${c.via === "pedido" ? "Cupom e descontos" : "Desconto"}</span><b>−${this._finCurto(c.desconto)}</b></div>` : ""}
      <div class="v3-ctot"><span>TOTAL</span><b>${this._finCurto(c.valor_pago)}</b></div></section>`;
  }

  // ---------------------------------------------------------------- eventos
  // tela larga: as Últimas compras terminam na mesma altura da coluna ao lado; ficam as compras que couberem inteiras (no mínimo 5)
  _v3AjustaUltimas() {
    const ult = this.shadowRoot?.querySelector(".v3-resumo.larga .v3-ult"), esq = ult?.parentElement?.previousElementSibling;
    if (!ult || !esq?.lastElementChild) return;
    ult.style.minHeight = ""; esq.lastElementChild.style.minHeight = "";
    const sobra = () => esq.lastElementChild.getBoundingClientRect().bottom - ult.getBoundingClientRect().bottom;
    const its = [...ult.querySelectorAll(".v3-it")];
    while (sobra() < -24 && its.length > 5) {
      const it = its.pop(), dia = it.previousElementSibling?.classList.contains("v3-dia") ? it.previousElementSibling : null;
      it.remove(); dia?.remove();  // o dia sem compra nenhuma sai junto
    }
    const s = sobra(), alvo = s > 0 ? ult : esq.lastElementChild;  // o mais baixo dos dois cresce até o outro
    if (Math.abs(s) > 1) alvo.style.minHeight = `${alvo.getBoundingClientRect().height + Math.abs(s)}px`;
  }

  _ligar() {
    super._ligar();
    this.shadowRoot?.querySelectorAll("[data-v3qa]").forEach((el) => el.addEventListener("change", () => {  // só guarda; grava no Salvar
      const q = { ...(this._v3Qa || {}), [el.getAttribute("data-v3qa")]: el.value };
      if (el.getAttribute("data-v3qa") === "categoria") delete q.subcategoria;  // outra categoria: a subcategoria recomeça
      this._v3Qa = q; this._render();
    }));
    const root = this.shadowRoot;
    requestAnimationFrame(() => this._v3AjustaUltimas());
    document.fonts?.ready.then(() => this._v3AjustaUltimas());
    const busca = (id, campo, alvo, fn) => { const q = root.getElementById(id); if (q) q.addEventListener("input", () => { this[campo] = q.value; const l = root.getElementById(alvo); if (l) { l.innerHTML = fn(); l.querySelectorAll("[data-a]").forEach((el) => el.addEventListener("click", (ev) => this._clique(ev, el))); } }); };  // os itens novos da busca respondem ao toque
    busca("v3-busca", "_v3Busca", "v3-lista", () => this._v3ComprasCorpo());
    busca("v3-qprod", "_v3QProd", "v3-prods", () => this._v3ProdLista());
    root.querySelectorAll("details > summary").forEach((s) => s.addEventListener("click", () => {  // abriu um <details>: enquadra
      const d = s.parentElement;
      if (!d.open) setTimeout(() => { if (d.isConnected && d.open) this._v3Enquadrar(d); }, 40);
    }));
    const on = root.querySelector(".v3-achip.on");  // área escolhida à vista na fila (no celular a fila rola de lado)
    if (on) { const fila = on.parentElement; fila.scrollLeft = Math.max(0, on.offsetLeft - fila.offsetLeft - 16); }
  }

  // ---------------------------------------------------------------- enquadrar o que abriu
  // Rola o mínimo para o elemento caber inteiro (descontando o cabeçalho fixo da janela); se não cabe, o começo fica no alto.
  _v3Enquadrar(el) {
    const dlg = el.closest("dialog"), m = 12;
    if (!dlg) { el.scrollIntoView({ block: el.getBoundingClientRect().height > window.innerHeight * 0.8 ? "start" : "nearest", behavior: "smooth" }); return; }
    const cab = dlg.querySelector(":scope > .v3-dh, :scope > .v-fh"), cr = dlg.getBoundingClientRect(), er = el.getBoundingClientRect();
    const topo = Math.max(cr.top, cab && getComputedStyle(cab).position === "sticky" ? cab.getBoundingClientRect().bottom : cr.top), baixo = cr.bottom;
    let d = 0;
    if (er.height > baixo - topo - 2 * m || er.top < topo + m) d = er.top - topo - m;
    else if (er.bottom > baixo - m) d = er.bottom - (baixo - m);
    if (Math.abs(d) > 2) dlg.scrollTo({ top: dlg.scrollTop + d, behavior: "smooth" });
  }

  // o que pode aparecer depois de um toque e merece ficar à vista
  _v3Abriveis() {
    return [...this.shadowRoot.querySelectorAll(".v3-g.on, .v3-parte, .v3-excl, .fcartform, .fexclconf, .conf, .apl, details[open], .v3-dodia, .v3-fat-it, .form")];
  }
  _v3Assin(el) {
    return `${el.className}|${el.id || el.querySelector("[id]")?.id || el.getAttribute("data-k") || ""}|${(el.textContent || "").trim().slice(0, 60)}`;
  }
  // depois do toque: o primeiro (de cima para baixo) que não existia antes
  _v3Novo() {
    const antes = this._v3Antes;
    if (!antes) return null;
    if (this._abaAtual?.() !== this._v3AntesAba) { this._v3Antes = null; return null; }  // trocou de tela: começa do topo
    const novo = this._v3Abriveis().find((el) => !antes.has(this._v3Assin(el)) && !el.closest(".v3-lado"));
    if (novo || Date.now() - this._v3AntesEm > 1500) this._v3Antes = null;
    return novo || null;
  }

  async _clique(ev, el) {
    const acao = el.getAttribute("data-a");
    if (acao === "f-mes" && !this._v2Largo) this._v3Parado = true;  // celular: as setas do mês não mexem na tela (fica vendo o cartão, a fatura…)
    else if (["f-quem", "f-modo", "f-mes", "f-vai-mes", "f-vai-ano"].includes(acao)) this._v3IrTopo = true;  // pessoa/período: começa do alto
    this._v3Antes = new Set(this._v3Abriveis().map((x) => this._v3Assin(x))); this._v3AntesEm = Date.now(); this._v3AntesAba = this._abaAtual?.();
    const a = el.getAttribute("data-a"), k = el.getAttribute("data-k");
    if (a === "v3-menu") {
      this._v2Mais = false; this._v2Per = false; this._aviso = null;
      if (k === "compras") { this._v2Aba = "compras"; this._aberta = null; this._v2Cart = null; this._fConta = null; this._render(); return; }
      return super._clique(ev, { getAttribute: (x) => (x === "data-a" ? "v2-aba" : x === "data-k" ? k : null) });
    }
    if (a === "v3-escuro") {
      try { localStorage.setItem(V3_ESCURO, this._v3Escuro() ? "0" : "1"); } catch (_) { /* navegador sem armazenamento */ }
      this._render(); return;
    }
    if (a === "v3-dia") { this._v3Dia = k; this._v3Rolar = ".v3-dodia"; this._render(); return; }
    if (a === "v3-mmsel") { this._v3MmSel = k; this._render(); return; }
    if (a === "v3-ano-cmp") {  // liga/desliga o ano no gráfico; ligar o 4º desliga o mais antigo que estava ligado; sempre fica um
      const l = [...(this._v3Anos || [])];
      if (l.includes(k)) { if (l.length > 1) l.splice(l.indexOf(k), 1); } else { l.push(k); while (l.length > 3) l.shift(); }
      this._v3Anos = l; this._render(); return;
    }
    if (a === "v3-per") {  // tocar no mês ou no ano escolhido abre a escolha; tocar de novo fecha
      const ab = this._v2Per && (this._v2PerVista || this._fModo) === k;
      this._v2Per = !ab; this._v2PerVista = k; this._v2PerAno = null; this._v2Mais = false; this._render(); return;
    }
    if (a === "v3-area") { this._v3Area = k; this._v3Sub = null; this._v3Rolar = ".v3-achip.on"; this._render(); return; }
    if (a === "v3-sub") { this._v3Sub = k || null; this._render(); return; }
    if (a === "v3-prod-mais") { this._v3ProdLim = (this._v3ProdLim || 20) + 40; this._render(); return; }
    if (a === "v3-pgcart" || a === "v3-pgcart-id") {
      const l = this._v3PgIds || [], i = Math.max(0, l.indexOf(this._v3PgCart));
      this._v3PgCart = a === "v3-pgcart-id" ? k : l[(i + Number(k) + l.length) % l.length];
      this._v3FatAberta = false; this._render(); return;
    }
    if (a === "v3-fat") { this._v3FatAberta = !this._v3FatAberta; this._v3Rolar = this._v3FatAberta ? ".v3-fat-it" : ".v3-fatbox"; this._render(); return; }
    if (a === "v3-ircart") {  // do Resumo para A pagar, já no cartão tocado
      this._v3PgCart = k; this._v3FatAberta = false; this._v2Mais = false; this._v2Per = false; this._aviso = null; this._v3Rolar = ".v3-pgpilha";
      return super._clique(ev, { getAttribute: (x) => (x === "data-a" ? "v2-aba" : x === "data-k" ? "contas" : null) });
    }
    if (a === "v3-ed") { this._v3Ed = !this._v3Ed; this._v3Nota = false; this._v3Grupo = undefined; this._v3Qa = null; if (this._v3Ed) this._v3Rolar = ".v3-parte"; this._render(); return; }
    if (a === "v3-grupo") {  // acordeão: toca abre, toca de novo recolhe; abrir um recolhe o outro
      const atual = this._v3Grupo ?? ((this._aberta?.pago_com || []).some((x) => !x.tipo) ? "pag" : null);
      this._v3Grupo = atual === k ? null : k; this._v3Qa = null; this._edReemb = null; this._confExcluir = false;
      if (this._v3Grupo) this._v3Perto = ".v3-g.on";  // fica onde está; só rola o mínimo para mostrar o que abriu
      this._render(); return;
    }
    if (a === "v2-classif-salvar") {  // Classificar: só a área (sem subcategoria); o nome fantasia, se tiver
      const i = el.getAttribute("data-i"), campo = (id) => this.shadowRoot.getElementById(id), cat = campo(`cl-a-${i}`)?.value;
      if (!cat) { this._aviso = "Escolha a área."; this._render(); return; }
      try { this._aviso = (await this._api({ acao: "faturas_classificar", chave: k, categoria: cat, subcategoria: null, sem_subcategoria: true, nome: campo(`cl-n-${i}`)?.value || "" })).mensagem; }
      catch (e) { this._aviso = "⚠ " + (e.message || e); }
      await this._carregar(true);
      this._v2ClassifCarregar();
      return;
    }
    if (a === "v3-qa-cancelar") { this._v3Qa = null; this._render(); return; }
    if (a === "v3-km-salvar") {  // Editar › Veículo: veículo, km do painel e tanque cheio
      const c = this._aberta, g = (i) => this.shadowRoot.getElementById(i), kmTxt = (g("ed-km")?.value || "").trim(), bemSel = g("ed-bem")?.value;
      if (!kmTxt) {  // sem km: só troca o veículo (ou tira)
        if (bemSel === undefined) { this._aviso = "Escreva o km do painel (ex.: 52300)."; this._render(); return; }
        const r = await this._acao({ acao: "editar", id: c.id, bem: bemSel }, "Veículo salvo.");
        if (r) { this._v3Grupo = null; await this._abrir(c.id); }
        return;
      }
      const r = await this._acao({ acao: "km", id: c.id, km: kmTxt, cheio: !!g("ed-cheio")?.checked, ...(bemSel ? { bem: bemSel } : {}) }, null);
      if (r) { this._v3Grupo = null; await this._abrir(c.id); }
      return;
    }
    if (a === "v3-qa-salvar") {
      const c = this._aberta, q = this._v3Qa || {}, ped = { acao: "editar", id: c?.id };
      for (const f of ["quem", "categoria", "subcategoria", "bem"]) if (q[f] !== undefined && q[f] !== (c[f] || "")) ped[f] = q[f];
      if (ped.categoria && ped.subcategoria === undefined) ped.subcategoria = this.shadowRoot.querySelector("[data-v3qa=subcategoria]")?.value ?? "";
      if (Object.keys(ped).length <= 2) return;
      const r = await this._acao(ped, ped.categoria || ped.subcategoria ? "Salvo. Próximas compras dessa loja já entram nessa categoria." : "Salvo.");
      if (r) { this._v3Qa = null; this._v3Grupo = null; await this._abrir(c.id); }
      return;
    }
    if (a === "excluir") { this._confExcluir = true; this._v3Perto = ".v3-excl"; this._render(); return; }
    if (a === "v3-nota") { this._v3Nota = !this._v3Nota; this._v3Ed = false; if (this._v3Nota) this._v3Rolar = ".v3-parte"; this._render(); return; }
    return super._clique(ev, el);
  }

  // ---------------------------------------------------------------- visual (tokens do protótipo; o tema escuro troca só os tokens)
  _v3Css() {
    return `
    ha-card.v3{--v3-bg:oklch(97.5% .005 95);--v3-fg:oklch(20% .015 250);--v3-card:oklch(100% 0 0);--v3-pri:oklch(47% .1 175);--v3-pri-fg:oklch(98% .01 175);
      --v3-sec:oklch(94% .01 95);--v3-mut:oklch(94.5% .006 95);--v3-mut-fg:oklch(50% .015 250);--v3-acc:oklch(93% .04 175);--v3-acc-fg:oklch(30% .08 175);
      --v3-des:oklch(58% .2 27);--v3-ok:oklch(60% .14 150);--v3-ok-soft:oklch(93% .06 150);--v3-ok-forte:oklch(38% .1 150);--v3-av-soft:oklch(94% .06 80);--v3-av-forte:oklch(45% .1 70);
      --v3-borda:oklch(90% .008 95);--v3-sombra:0 18px 40px -18px oklch(20% .02 250/.45);--v3-r:14px;
      --c-acc:var(--v3-pri);--c-txt:var(--v3-fg);--c-sub:var(--v3-mut-fg);--c-fundo:var(--v3-card);--c-linha:var(--v3-borda);--v-bloco:var(--v3-mut);
      --primary-color:var(--v3-pri);--primary-text-color:var(--v3-fg);--secondary-text-color:var(--v3-mut-fg);--card-background-color:var(--v3-card);--divider-color:var(--v3-borda);
      background:var(--v3-bg);color:var(--v3-fg);font-family:Manrope,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;font-size:14px;border-radius:0;box-shadow:none;border:0}
    ha-card.v3.escuro{--v3-bg:oklch(17% .01 250);--v3-fg:oklch(95% .005 95);--v3-card:oklch(22% .012 250);--v3-pri:oklch(72% .12 175);--v3-pri-fg:oklch(18% .03 175);
      --v3-sec:oklch(27% .012 250);--v3-mut:oklch(27% .012 250);--v3-mut-fg:oklch(68% .012 250);--v3-acc:oklch(30% .05 175);--v3-acc-fg:oklch(90% .05 175);
      --v3-des:oklch(68% .19 25);--v3-ok:oklch(70% .14 150);--v3-ok-soft:oklch(30% .06 150);--v3-ok-forte:oklch(85% .1 150);--v3-av-soft:oklch(32% .06 75);--v3-av-forte:oklch(88% .1 80);
      --v3-borda:oklch(100% 0 0/.1);--v3-sombra:0 18px 40px -18px oklch(0% 0 0/.8)}
    .v3 .v3-ic{width:20px;height:20px;flex:none}
    :where(.v3) button{font-family:inherit;color:inherit}
    .v3 h1,.v3 h2,.v3-total,.v3-dval,.v3-heroi-l b{font-family:Sora,Manrope,system-ui,sans-serif}
    .v3-app{display:grid;grid-template-columns:212px minmax(0,1fr);min-height:100vh}.v3-app.cel{display:block}
    .v3-lado{position:sticky;top:var(--v3-ha);align-self:start;height:calc(100vh - var(--v3-ha));box-sizing:border-box;display:flex;flex-direction:column;gap:14px;padding:16px 12px;border-right:1px solid var(--v3-borda)}
    .v3-marca{display:flex;align-items:center;gap:10px;padding:2px 6px;font-size:15px;line-height:1.15}
    .v3-logo{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:var(--v3-pri);color:var(--v3-pri-fg);font:700 14px Sora,sans-serif;flex:none}
    .v3-nav{display:grid;gap:4px}
    .v3-nav button{display:flex;align-items:center;gap:11px;border:0;background:none;padding:8px 12px;border-radius:11px;font-size:14.5px;font-weight:500;color:var(--v3-mut-fg);cursor:pointer;text-align:left;min-height:44px}
    .v3-nav button:hover{background:var(--v3-mut);color:var(--v3-fg)}
    .v3-nav button.on{background:var(--v3-pri);color:var(--v3-pri-fg);font-weight:600}
    .v3-lado-pe{margin-top:auto;display:grid;gap:6px;padding:0 8px;font-size:13px;color:var(--v3-mut-fg)}
    .v3-lado-pe span{display:flex;align-items:center;gap:8px}.v3-lado-pe i{width:8px;height:8px;border-radius:50%}
    .v3-lado-pe small{font-size:11px;margin-top:6px}
    .v3-main{min-width:0}
    /* a barra do Home Assistant fica por cima: o que gruda no topo para logo abaixo dela */
    :host{--v3-ha:calc(var(--header-height,56px) + env(safe-area-inset-top,0px))}
    .v3-topo{position:sticky;top:var(--v3-ha);z-index:5;background:color-mix(in srgb,var(--v3-bg) 92%,transparent);backdrop-filter:blur(8px);border-bottom:1px solid var(--v3-borda);padding:10px 22px 10px;display:grid;gap:8px}
    .v3-tit{display:flex;align-items:center;justify-content:space-between;gap:10px;min-width:0}
    .v3-tit h1{margin:0;font-size:20px;font-weight:700;letter-spacing:-.01em;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}  /* sem espaço, o título encurta e os botões ficam inteiros */
    .v3-tit>:not(h1){flex:none}
    .v3-acoes{display:flex;align-items:center;gap:8px}
    .v3-ib{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:6px;min-width:40px;height:40px;border-radius:999px;border:1px solid var(--v3-borda);background:var(--v3-card);cursor:pointer;padding:0 10px}
    .v3-ib:hover{background:var(--v3-mut)}.v3-ib.on{background:var(--v3-acc);color:var(--v3-acc-fg)}
    .v3-ib b{position:absolute;top:-5px;right:-5px;min-width:18px;height:18px;border-radius:9px;background:var(--v3-des);color:#fff;font-size:11px;display:grid;place-items:center;padding:0 4px;box-sizing:border-box}
    .v3-lancar{background:var(--v3-pri);color:var(--v3-pri-fg);border-color:transparent;font-weight:600;padding:0 14px}.v3-lancar:hover{background:color-mix(in srgb,var(--v3-pri) 88%,#000)}
    .v3 .v-menu{background:var(--v3-card);border:1px solid var(--v3-borda);box-shadow:var(--v3-sombra);border-radius:14px}
    .v3-filtros{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
    .v3-seg{position:relative;display:inline-flex;align-items:center;gap:2px;background:var(--v3-mut);border-radius:999px;padding:3px}
    .v3-seg>button{border:0;background:none;border-radius:999px;padding:6px 12px;font-size:13px;color:var(--v3-mut-fg);cursor:pointer;display:inline-flex;align-items:center;gap:6px;min-height:32px;white-space:nowrap}
    .v3-seg>button i{width:8px;height:8px;border-radius:50%}
    .v3-seg>button.on{background:var(--v3-card);color:var(--v3-fg);font-weight:600;box-shadow:0 1px 2px rgba(0,0,0,.08)}
    .v3-seg>button.v3-seta{padding:6px 4px}.v3-seg>button.v3-seta .v3-ic{width:16px;height:16px}.v3-seg>button:disabled{opacity:.35;cursor:default}
    .v3 .v-pop{top:calc(100% + 6px);left:0;background:var(--v3-card);border:1px solid var(--v3-borda);box-shadow:var(--v3-sombra)}
    .v3-pag{padding:16px 22px 32px}
    .v3-app.cel .v3-topo{padding:12px 16px 10px}.v3-app.cel .v3-pag{padding:14px 16px 32px}
    .v3-app.cel .v3-tit h1{font-size:20px}
    .v3-app.cel .v3-filtros{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;margin:0 -16px;padding:0 16px}.v3-app.cel .v3-filtros::-webkit-scrollbar{display:none}
    .v3-app.cel .v-perw{position:static}.v3-app.cel .v-pop{left:16px;right:16px}
    .v3-abas{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px}
    .v3-abas button{border:0;background:none;border-radius:12px;padding:6px 2px;display:grid;justify-items:center;gap:2px;font-size:11.5px;font-weight:500;color:var(--v3-mut-fg);cursor:pointer;min-height:48px}
    .v3-abas button .v3-ic{width:20px;height:20px}
    .v3-abas button.on{background:var(--v3-pri);color:var(--v3-pri-fg);font-weight:600}
    .v3 .aviso{border-radius:12px}
    .v3-card{background:var(--v3-card);border:1px solid var(--v3-borda);border-radius:16px;padding:14px 16px 12px;margin:0 0 12px;box-sizing:border-box;min-width:0}
    .v3-hd{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 8px}
    .v3-hd h2{margin:0;font-size:14.5px;font-weight:600}
    .v3-link{border:0;background:none;color:var(--v3-pri);font-size:13px;font-weight:500;cursor:pointer;display:inline-flex;align-items:center;gap:2px;padding:6px 0;min-height:32px}.v3-link .v3-ic{width:15px;height:15px}
    .v3-grade{display:grid;grid-template-columns:minmax(0,1.85fr) minmax(300px,1fr);gap:12px;align-items:start}
    .v3-par{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px}.v3-par>.v3-card{margin:0 0 12px}
    .v3-alerta{display:flex;align-items:center;justify-content:space-between;gap:12px;background:var(--v3-av-soft);color:var(--v3-av-forte);border-radius:14px;padding:8px 10px 8px 16px;margin:0 0 12px;font-size:14px}
    .v3-alerta small{opacity:.8}
    .v3-bt{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--v3-borda);background:var(--v3-card);border-radius:999px;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer;min-height:36px}
    .v3-bt .v3-ic{width:16px;height:16px}.v3-bt:hover{background:var(--v3-mut)}.v3-bt.on{background:var(--v3-acc);color:var(--v3-acc-fg);border-color:transparent}
    .v3-bt.prim{background:var(--v3-pri);color:var(--v3-pri-fg);border-color:transparent}
    .v3-heroi .v3-rot{font-size:13px;color:var(--v3-mut-fg)}
    .v3-heroi-l{display:flex;flex-wrap:wrap;align-items:flex-end;gap:8px 22px;margin:2px 0 6px}
    .v3-total{font-size:38px;font-weight:700;letter-spacing:-.03em;line-height:1.05}.v3-total small{font-size:.6em}
    .v3-mini{display:grid;line-height:1.2;padding-bottom:6px}.v3-mini b{font-size:14px;font-weight:600}.v3-mini small{font-size:12px;color:var(--v3-mut-fg)}
    .v3-tend{display:flex;align-items:center;gap:6px;font-size:14px;font-weight:500}.v3-tend .v3-ic{width:16px;height:16px}
    .v3-tend.sobe{color:var(--v3-des)}.v3-tend.desce{color:var(--v3-ok-forte)}
    .v3-totlinha{display:contents}.v3-tendx{display:none}  /* no computador o percentual fica na linha de baixo */
    .v3-tendx{align-items:center;font-size:14px;font-weight:500;flex:none;line-height:1}  /* mesmo tamanho e cor da linha de antes; só muda o lugar: "expoente" do valor */
    .v3-tendx b{display:flex;align-items:center;gap:4px;font:inherit}.v3-tendx .v3-ic{width:16px;height:16px}
    .v3-tendx.sobe{color:var(--v3-des)}.v3-tendx.desce{color:var(--v3-ok-forte)}
        .v3 .v-deve{margin-top:10px}
    .v3-cal .v3-leg{display:flex;gap:10px;font-size:12px;color:var(--v3-mut-fg)}.v3-leg span{display:flex;align-items:center;gap:5px}.v3-leg i{width:7px;height:7px;border-radius:50%}
    .v3-sem,.v3-dias{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:3px}
    .v3-sem span{text-align:center;font-size:11.5px;color:var(--v3-mut-fg);padding:2px 0}
    .v3-d{border:1.5px solid transparent;background:none;border-radius:11px;height:42px;display:grid;place-content:center;justify-items:center;gap:3px;cursor:pointer;font-size:14px;font-weight:500}
    .v3-d:hover:not(:disabled){background:var(--v3-mut)}.v3-d:disabled{color:var(--v3-mut-fg);cursor:default;opacity:.7}
    .v3-d{position:relative}.v3-d i{position:absolute;top:5px;right:5px;display:flex;flex-direction:column;gap:2px}.v3-d em{width:6px;height:6px;border-radius:50%}  /* bolinhas em pé, na lateral */
    .v3-d small{font-size:9.5px;line-height:1;font-weight:500;color:var(--v3-mut-fg);white-space:nowrap}.v3-d.sel small{color:var(--v3-pri-fg);opacity:.85}
    @media (max-width:520px){.v3-d i{top:3px;right:2px;gap:1.5px}.v3-d em{width:5px;height:5px}.v3-d small{font-size:8.5px;letter-spacing:-.2px}}
    .v3-d.hoje{border-color:var(--v3-pri)}
    .v3-d.sel{background:var(--v3-pri);color:var(--v3-pri-fg);border-color:var(--v3-pri)}.v3-d.sel em{box-shadow:0 0 0 1.5px var(--v3-pri-fg)}
    .v3-dodia{border-top:1px solid var(--v3-borda);margin-top:10px;padding-top:6px}
    .v3-diatot{display:flex;justify-content:space-between;align-items:baseline;gap:10px}.v3-diatot b{color:var(--v3-fg);font-size:14px;font-weight:700}
    .v3-dia0,.v3-dia{font-size:12px;color:var(--v3-mut-fg);margin:6px 0 4px}.v3-dia{text-transform:uppercase;letter-spacing:.04em;font-weight:600;margin:10px 0 0}.v3-dia:first-child{margin-top:0}
    .v3-it{display:grid;grid-template-columns:34px minmax(0,1fr) auto;gap:10px;align-items:center;width:100%;border:0;background:none;text-align:left;padding:7px 6px;border-radius:12px;cursor:pointer}
    .v3-it:hover,.v3-it.sel{background:var(--v3-mut)}
    .v3-it-ic{width:32px;height:32px;border-radius:10px;background:var(--v3-mut);color:var(--v3-mut-fg);display:grid;place-items:center}.v3-it-ic .v3-ic{width:18px;height:18px}
    .v3-it-ic.g{width:44px;height:44px;border-radius:14px}
    .v3-it:hover .v3-it-ic,.v3-it.sel .v3-it-ic{background:var(--v3-card)}
    .v3-it-t{display:grid;min-width:0}.v3-it-t b{display:flex;align-items:center;gap:6px;font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .v3-it-t b i,.v3-chip i,.v3-dnome i{width:8px;height:8px;border-radius:50%;flex:none;display:inline-block}
    .v3-it-t small{font-size:12px;color:var(--v3-mut-fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .v3-it-v{display:grid;justify-items:end;gap:3px}.v3-it-v b{font-size:14px;font-weight:600;white-space:nowrap}
    .v3-st{display:inline-flex;align-items:center;gap:3px;font-style:normal;font-size:11px;font-weight:600;border-radius:999px;padding:2px 8px;background:var(--v3-mut);color:var(--v3-mut-fg);white-space:nowrap}
    .v3-st .v3-ic{width:12px;height:12px}
    .v3-st.ok,.v3-st.ok2{background:var(--v3-ok-soft);color:var(--v3-ok-forte)}.v3-st.aviso{background:var(--v3-av-soft);color:var(--v3-av-forte)}
    .v3 dialog.v3d.v3larga{width:min(620px,100vw)}
    .v3 dialog.v3d.v3larga .v-cl-campos>*{flex:1 1 140px;min-width:0}
    .v3 dialog.v3d .v-lista{min-height:max-content}
    .v3 dialog.v3d.v3larga[open]{display:block}.v3 dialog.v3d.v3larga>*+*{margin-top:12px}  /* no Safari do iPhone a grade ainda encolhia a lista: em sequência normal, ela fica inteira e a janela rola */
    .v3 dialog.v3d.v3larga .v-lista{overflow:visible;flex:none}
    .v3 dialog.v3d>.v-fh{position:sticky;top:0;z-index:2;background:var(--v3-bg);margin:0 -20px;padding:14px 20px 10px}  /* o X fica sempre à vista */  /* a lista não encolhe dentro da folha (ficava cortada e sem rolar) */
    .v3-semsub{display:none!important}
    .v3-sug{display:block;color:var(--v3-pri);margin-top:2px;white-space:normal}
    .v3-consg{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin:4px 0 12px}
    .v3-cons{display:grid;gap:1px;padding:10px 12px;border-radius:12px;background:var(--v3-mut)}.v3-cons small{font-size:11px;color:var(--v3-mut-fg)}
    .v3-cons b{font-size:17px;font-weight:700}.v3-cons em{font-style:normal;font-size:11px;color:var(--v3-mut-fg)}.v3-consf{margin:0 0 10px}
    .v3-gchk{display:flex;gap:8px;align-items:center;font-size:14px}
    .v3-lancar{padding:0}.v3-lancar span{display:none}  /* o Lançar é só o "+" verde (celular e computador); o nome fica no aria-label */
    .v3-gira .v3-ic{animation:v3gira 1s linear infinite}@keyframes v3gira{to{transform:rotate(360deg)}}
    .v3-acord{border:1px solid var(--v3-borda);border-radius:14px;background:var(--v3-card);overflow:hidden}
    .v3-g+.v3-g{border-top:1px solid var(--v3-borda)}
    .v3-gl{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:12px;align-items:center;width:100%;border:0;background:none;color:var(--v3-fg);font:inherit;text-align:left;padding:14px 16px;cursor:pointer;min-height:48px}
    .v3-gl:hover{background:var(--v3-mut)}.v3-gt{font-weight:600;font-size:14px}
    .v3-gr{font-size:13px;color:var(--v3-mut-fg);text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .v3-gs{color:var(--v3-mut-fg);font-size:18px;line-height:1;transition:transform .15s}.v3-g.on .v3-gs{transform:rotate(90deg)}
    .v3-g.on .v3-gl{background:var(--v3-mut)}
    .v3-gc{padding:12px 16px 16px;display:grid;gap:10px}
    .v3-gc details.editar,.v3-gc .cartbox{border:0;padding:0;margin:0;background:none}.v3-gc .cartbox>summary{display:none}
    .v3-gform{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}
    .v3-gform label{display:grid;gap:3px;font-size:12px;color:var(--v3-mut-fg)}
    .v3-gacoes{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
    .v3-gdado{display:grid;grid-template-columns:7.5em minmax(0,1fr);gap:8px;font-size:13px}.v3-gdado span{color:var(--v3-mut-fg)}.v3-gdado b{font-weight:500;overflow-wrap:anywhere}
    .v3-excl-lnk{margin:14px 4px 4px}
    .v3-excl{display:grid;gap:8px;margin-top:14px;padding:14px 16px;border-radius:14px;border:1px solid var(--v3-des);background:color-mix(in srgb,var(--v3-des) 7%,var(--v3-card))}
    .v3-st.rec{background:var(--v3-acc);color:var(--v3-pri)}
    .v3-vazio{padding:18px 4px;text-align:center;color:var(--v3-mut-fg);font-size:13px}
    .v3-dica{font-size:12px;color:var(--v3-mut-fg);text-align:center;margin-top:12px}
    .v3-pilha{display:grid}
    .v3-faixa{display:flex;justify-content:space-between;align-items:center;gap:8px;border:0;border-radius:16px 16px 0 0;margin-bottom:-14px;padding:12px 16px 24px;background:var(--cf);color:var(--ct);font-size:15px;cursor:pointer;box-shadow:0 -1px 0 rgba(255,255,255,.08) inset}
    .v3-faixa b{font-family:Sora,sans-serif;font-weight:700}.v3-faixa span{font-weight:700;font-family:Sora,sans-serif}
    .v3-frente{position:relative;overflow:hidden;border:0;border-radius:18px;aspect-ratio:1.586;display:grid;grid-template-rows:auto 1fr auto;padding:16px 18px;background:var(--cf);color:var(--ct);text-align:left;cursor:pointer;box-shadow:var(--v3-sombra)}
    .v3-frente::after{content:"";position:absolute;right:-18%;top:-30%;width:62%;aspect-ratio:1;border-radius:50%;background:rgba(255,255,255,.1);pointer-events:none}
    .v3-fr-top{display:flex;justify-content:space-between;gap:8px;font-family:Sora,sans-serif;font-size:17px}.v3-fr-top b{font-weight:700}.v3-fr-top span{font-weight:700}
    .v3-fr-meio{align-self:center;font-size:12px;opacity:.85;text-transform:uppercase;letter-spacing:.14em}.v3-fr-meio small{display:block;text-transform:none;letter-spacing:0;font-size:12px;opacity:.9;margin-top:2px}
    .v3-fr-pe{display:flex;justify-content:space-between;align-items:center;font-size:15px;letter-spacing:.12em}
    .v3-fr-pe em{font-style:normal;letter-spacing:0;font-size:12px;background:rgba(255,255,255,.18);border-radius:999px;padding:3px 10px;display:inline-flex;align-items:center;gap:6px}.v3-fr-pe em i{width:7px;height:7px;border-radius:50%}
    .v3-barra{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:3px 10px;margin:0 0 9px;font-size:13.5px}.v3-barra b{font-weight:600}
    .v3-barra i{grid-column:1/-1;height:6px;border-radius:3px;background:var(--v3-mut);overflow:hidden}.v3-barra em{display:block;height:100%;border-radius:3px;background:var(--v3-pri)}
    .v3-mm{display:flex;gap:8px;align-items:stretch;height:132px}.v3-mm-g .v3-mm{height:190px}
    .v3-mm-sub{font:500 12.5px/1.2 Manrope,system-ui,sans-serif;color:var(--v3-mut-fg);margin-left:6px;white-space:nowrap}
    .v3-ult{align-content:start}
    .v3-mm-v{display:block;font:600 10.5px/16px Manrope,system-ui,sans-serif;color:var(--v3-mut-fg);text-align:center;white-space:nowrap;overflow:hidden}
    .v3-mm button.on .v3-mm-v{color:var(--v3-fg)}
    /* Ano e Tudo: o total e o Mês a mês terminam na mesma altura dos Cartões (o gráfico cresce para preencher) */
    .v3-alinha{align-items:stretch}.v3-alinha>.v3-col{display:flex;flex-direction:column;min-width:0}
    .v3-alinha>.v3-col:nth-child(-n+2)>.v3-card:last-child{flex:1}
    .v3-alinha .v3-mmc{display:flex;flex-direction:column}.v3-alinha .v3-mmc .v3-mm{flex:1;height:auto;min-height:190px}
    .v3-mm button{flex:1;border:0;background:none;display:grid;grid-template-rows:1fr auto;grid-template-columns:minmax(0,1fr);gap:6px;cursor:pointer;padding:0;min-width:0}
    .v3-mm button i,.v3-mm button small{min-width:0;overflow:hidden}
    /* Tudo: comparação por ano */
    .v3-cmp .v3-hd{flex-wrap:wrap;align-items:flex-start}
    .v3-cmp-anos{display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end}
    .v3-cmp-anos button{border:1px solid var(--v3-borda);background:var(--v3-card);border-radius:99px;padding:3px 10px;min-height:30px;font:600 12px/1.4 Manrope,system-ui,sans-serif;color:var(--v3-mut-fg);cursor:pointer;display:inline-flex;align-items:center;gap:6px}
    .v3-cmp-anos button.on{color:var(--v3-fg);border-color:color-mix(in srgb,var(--v3-fg) 45%,transparent)}
    .v3-cmp-anos i,.v3-cmp-x i{width:9px;height:9px;border-radius:3px;display:inline-block;flex:none}
    .v3-cmp-mm{display:flex;gap:6px;height:132px}.v3-mm-g .v3-cmp-mm{height:190px}.v3-alinha .v3-cmp .v3-cmp-mm{flex:1;height:auto;min-height:190px}
    .v3-cmp-g{flex:1;min-width:0;display:grid;grid-template-rows:1fr auto;grid-template-columns:minmax(0,1fr);gap:6px;border-radius:10px;padding:4px 2px 2px}
    .v3-cmp-g.on{background:color-mix(in srgb,var(--v3-acc) 55%,transparent)}
    .v3-cmp-g small{font-size:12px;color:var(--v3-mut-fg);text-align:center;overflow:hidden}.v3-cmp-g.on small{color:var(--v3-fg);font-weight:600}
    .v3-cmp-b{display:flex;gap:2px;min-height:0}
    .v3-cmp-b button{flex:1;min-width:0;border:0;padding:0;background:none;cursor:pointer;display:flex;flex-direction:column;justify-content:flex-end}
    .v3-cmp-b button em{display:block;width:100%;border-radius:6px 6px 3px 3px}.v3-cmp-b button:disabled{cursor:default}
    .v3-cmp-d{display:flex;flex-wrap:wrap;gap:6px 8px;align-items:center;margin-top:10px;font-size:13px}.v3-cmp-d>b{font-weight:600;margin-right:2px}
    .v3-cmp-x{border:1px solid var(--v3-borda);background:var(--v3-card);border-radius:99px;padding:4px 8px 4px 10px;min-height:32px;font:600 12.5px Manrope,system-ui,sans-serif;color:var(--v3-fg);display:inline-flex;align-items:center;gap:6px;cursor:pointer}
    .v3-cmp-x.off{color:var(--v3-mut-fg);cursor:default}.v3-cmp-x svg{width:14px;height:14px}
    /* quadro estreito com 12 meses (celular): a barra encolhe e o valor fica só o número, em mil */
    .v3-mmc{container-type:inline-size}.v3-mm-emmil{display:none}
    @container (max-width:520px){.v3-mm12 .v3-mm-mil{display:none}.v3-mm12 .v3-mm-emmil{display:inline}.v3-mm12 .v3-mm{gap:4px}
      .v3-mm12 .v3-mm button small{font-size:10.5px}.v3-cmp-mm{gap:2px}.v3-cmp-b{gap:1px}.v3-cmp-g{padding:4px 1px 2px}.v3-cmp-g small{font-size:10.5px}.v3-cmp-anos{justify-content:flex-start}.v3-mm12 .v3-mm-v{font-size:10px}.v3-mmc .v3-mm-sub{display:block;margin:2px 0 0;white-space:normal}}
    .v3-mm button i{display:flex;flex-direction:column;justify-content:flex-end;height:100%;min-height:0}.v3-mm button em{display:block;width:100%;border-radius:10px;background:var(--v3-acc)}
    .v3-mm button.on em{background:var(--v3-pri)}.v3-mm button small{font-size:12px;color:var(--v3-mut-fg)}.v3-mm button.on small{color:var(--v3-fg);font-weight:600}
    .v3-mm button:disabled{opacity:.4;cursor:default}
    .v3-chips{display:flex;flex-wrap:wrap;gap:8px}
    .v3-chip{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--v3-borda);background:var(--v3-card);border-radius:999px;padding:5px 11px;font-size:12.5px;font-weight:500;cursor:pointer}
    span.v3-chip{cursor:default}.v3-chip b{font-weight:700;margin-left:2px}
    .v3-lista{padding-top:8px}
    /* janela da compra: lateral no computador, tela inteira no celular */
    .v3 dialog.v3d{margin:0 0 0 auto;height:100dvh;max-height:none;width:min(460px,100vw);max-width:100vw;border:0;border-radius:0;padding:0 20px 24px;background:var(--v3-bg);color:var(--v3-fg);box-sizing:border-box;overflow:auto;box-shadow:var(--v3-sombra)}
    .v3 dialog.v3d::backdrop{background:oklch(15% .01 250/.45)}
    .v3-dh{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;margin:0 -20px 14px;padding:14px 20px;background:var(--v3-bg);border-bottom:1px solid var(--v3-borda)}
    .v3-dh h2{margin:0;font-size:17px;font-weight:700}
    .v3-dtop{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:12px;align-items:start}
    .v3-dnome{display:grid;gap:2px;min-width:0}.v3-dnome b{font-family:Sora,sans-serif;font-size:19px;font-weight:700;line-height:1.2}
    .v3-dnome small{font-size:12.5px;color:var(--v3-mut-fg);display:block;line-height:1.45}.v3-dnome small i{vertical-align:1px;margin:0 4px 0 2px}
    .v3-dval{font-size:21px;font-weight:700;white-space:nowrap;text-align:right;display:grid}.v3-dval small{font:500 12px Manrope,sans-serif;color:var(--v3-mut-fg)}
    .v3-dtop+.v3-chips{margin:14px 0 6px;gap:6px;align-items:center}
    .v3-dtop+.v3-chips>*{font-size:11px;font-weight:600;padding:2px 8px;line-height:16px;border:1px solid transparent;border-radius:999px;gap:4px}  /* compra: todas as etiquetas no mesmo tamanho */
    .v3-dtop+.v3-chips>.v3-chip{border-color:var(--v3-borda);background:var(--v3-card);color:var(--v3-fg)}
    .v3-dtop+.v3-chips .v3-chip i{width:7px;height:7px}
    .v3-ddata{font-size:12.5px;color:var(--v3-mut-fg);margin:0 0 14px}
    .v3-falta{display:flex;gap:8px;align-items:center;width:100%;text-align:left;border:0;border-radius:14px;padding:10px 12px;margin:0 0 12px;background:var(--v3-av-soft);color:var(--v3-av-forte);cursor:pointer;font-size:13px}
    .v3-cam{background:var(--v3-mut);border-radius:16px;padding:14px 16px;margin:0 0 14px}
    .v3-ped-tot{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 10px}.v3-ped-tot b{font-size:18px}.v3-ped-tot span{color:var(--v3-mut-fg);font-size:13px}
    .v3-ped-ls{display:grid;gap:2px;margin-top:10px}
    .v3-ped-l{display:flex;justify-content:space-between;align-items:center;gap:12px;width:100%;border:0;background:none;color:inherit;font:inherit;text-align:left;padding:8px 10px;border-radius:10px;min-height:44px}
    button.v3-ped-l{cursor:pointer}button.v3-ped-l:hover{background:color-mix(in oklab,var(--v3-fg) 6%,transparent)}
    .v3-ped-l.eu{background:color-mix(in oklab,var(--v3-fg) 8%,transparent)}.v3-ped-l b{font-weight:600;white-space:nowrap}
    .v3-ped-v{display:grid;min-width:0}.v3-ped-v small{color:var(--v3-mut-fg);font-size:12px}
    .v3-ped-val{margin-top:12px;padding-top:10px;border-top:1px solid var(--v3-borda);display:grid;gap:4px;font-size:13.5px}.v3-ped-val .v3-cam-t{margin-bottom:2px}
    .v3-ped-pago{font-weight:600;border-top:1px dashed var(--v3-borda);padding-top:5px;margin-top:2px}.v3-ped-val .fs{margin-top:4px}
    .v3-cam-t{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--v3-mut-fg);font-weight:600;margin-bottom:10px}
    .v3-passos{display:grid;grid-template-columns:minmax(0,1fr) 16px minmax(0,1fr) 16px minmax(0,1fr);gap:6px;align-items:start}
    .v3-passos>.v3-ic{width:14px;height:14px;color:var(--v3-mut-fg);margin-top:14px}
    .v3-passos:has(.v3-passo:nth-of-type(2):last-of-type){grid-template-columns:minmax(0,1fr) 16px minmax(0,1fr)}
    .v3-passo{display:grid;gap:2px;min-width:0}.v3-passo i{height:5px;border-radius:3px;background:var(--v3-borda);margin-bottom:6px}.v3-passo.ok i{background:var(--v3-ok)}
    .v3-passo b{font-size:13.5px;font-weight:600}.v3-passo small{font-size:12px;color:var(--v3-mut-fg);overflow-wrap:anywhere}
    .v3-parcs{display:grid;gap:6px;margin-top:12px}
    .v3-parc{display:grid;grid-template-columns:42px minmax(0,1fr) auto;grid-template-areas:"n f v" "n s s";gap:0 8px;align-items:center;border:0;border-radius:12px;background:var(--v3-card);padding:8px 10px;text-align:left;cursor:pointer;font-size:13px}
    .v3-parc>b{grid-area:n;font-family:Sora,sans-serif}.v3-parc>span:nth-of-type(1){grid-area:f}.v3-parc>span:nth-of-type(2){grid-area:v;font-weight:600}.v3-parc>small{grid-area:s;font-size:12px;color:var(--v3-mut-fg)}
    .v3-parc.ok>small{color:var(--v3-ok-forte)}.v3-parc.atual{box-shadow:inset 0 0 0 1.5px var(--v3-pri)}
    .v3-cupom{background:oklch(95% .06 85);color:oklch(25% .03 70);border-radius:16px;padding:16px;margin:0 0 14px;font:12.5px/1.55 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
    .v3.escuro .v3-cupom{background:oklch(30% .04 80);color:oklch(94% .03 85)}
    .v3-cc{text-align:center;margin-bottom:10px}
    .v3-cl{display:flex;justify-content:space-between;gap:12px}.v3-cl span{min-width:0}.v3-cl b{font-weight:500;white-space:nowrap}
    .v3-cl em{font-style:normal;font-weight:700}.v3-cl em.sobe{color:var(--v3-des)}.v3-cl em.desce{color:var(--v3-ok-forte)}
    .v3-ctot{display:flex;justify-content:space-between;border-top:1px dashed currentColor;margin-top:8px;padding-top:8px;font-weight:700}
    .v3-dacoes{display:flex;flex-wrap:wrap;gap:8px;margin:4px 0 12px}
    .v3-parte{border-top:1px solid var(--v3-borda);padding-top:12px}
    .v3 dialog.v3d .v-fh{margin-top:14px}
    .v3-total.m{font-size:32px;margin:2px 0 6px}
    .v3 .fpilha{width:100%;max-width:none;justify-self:center;box-sizing:border-box}.v3 .fpilha>.fcface,.v3 .fpilha>.fpeek{width:100%;max-width:none}
    .v3 .fpk>b{white-space:nowrap;flex:none}.v3 .fpk>span:not(.fpk-v){white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;flex:1 1 auto}.v3 .fpk>.fpk-v{flex:none;white-space:nowrap}
    ${CARTOES_CSS_BASE}${CARTOES.css.join("\n")}
    .v3 .v3-pilha{display:block;width:100%;max-width:340px;margin:4px auto 0}.v3 .v3-pilha .fpilha{max-width:none}
    .v3-pgpilha .fpilha{justify-items:stretch}.v3-pgpilha .fcface{max-width:none;width:100%}.v3 .v3-pgpilha{display:block;width:100%;max-width:340px;margin:4px auto 0}.v3 .v3-pgpilha .fpilha{max-width:none}
    .v3 .fcfg-hd h1{display:none}
    .v3-busca{display:flex;align-items:center;gap:8px;flex:1 1 260px;min-width:0;border:1px solid var(--v3-borda);background:var(--v3-card);border-radius:999px;padding:0 14px;min-height:42px;color:var(--v3-mut-fg)}
    .v3-busca input{flex:1;min-width:0;border:0;background:none;outline:none;font:inherit;font-size:14px;color:var(--v3-fg);padding:10px 0}
    .v3-busca:focus-within{border-color:var(--v3-pri);box-shadow:0 0 0 3px color-mix(in srgb,var(--v3-pri) 18%,transparent)}
    .v3-cbarra{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:0 0 12px}
    .v3-card .v3-busca{margin:0 0 10px}
    .v3-dica-e{text-align:left;margin:0 0 8px}.v3-mais{margin:12px auto 0;display:flex}
    .v3-tres{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
    .v3-kpi{display:grid;gap:4px;text-align:left;cursor:pointer;font:inherit;color:inherit}div.v3-kpi{cursor:default}
    .v3-kpi small{font-size:13px;color:var(--v3-mut-fg)}.v3-kpi b{font:700 30px/1.1 Sora,sans-serif}.v3-kpi b.sobe{color:var(--v3-des)}.v3-kpi b.desce{color:var(--v3-ok-forte)}
    div.v3-kpi b{font-size:21px}.v3-kpi span{font-size:12px;color:var(--v3-mut-fg)}
    .v3-prod{display:grid;grid-template-columns:minmax(0,1fr) auto 56px;gap:12px;align-items:center;width:100%;border:0;border-bottom:1px solid var(--v3-borda);background:none;text-align:left;padding:8px 4px;cursor:pointer}
    .v3-prod:last-of-type{border-bottom:0}.v3-prod:hover{background:var(--v3-mut)}
    .v3-prod-v{font-weight:600;white-space:nowrap}.v3-var{font-style:normal;font-size:12px;font-weight:700;text-align:right;color:var(--v3-mut-fg)}.v3-var.sobe{color:var(--v3-des)}.v3-var.desce{color:var(--v3-ok-forte)}
    .v3-achips{display:flex;gap:10px;overflow-x:auto;padding:2px 2px 6px;margin:0 0 12px;scrollbar-width:thin}
    .v3-achip{flex:none;display:grid;gap:2px;text-align:left;border:1px solid var(--v3-borda);background:var(--v3-card);border-radius:16px;padding:10px 14px;cursor:pointer;min-width:120px}
    .v3-achip small{display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--v3-mut-fg)}.v3-achip small i{width:8px;height:8px;border-radius:50%;background:var(--ac)}
    .v3-achip b{font:700 17px Sora,sans-serif}
    .v3-achip.on{background:var(--v3-acc);border-color:var(--v3-pri)}.v3-achip.on small{color:var(--v3-acc-fg)}
    .v3-subs{margin-top:12px}.v3-chip.on{background:var(--v3-acc);color:var(--v3-acc-fg);border-color:var(--v3-pri)}
    .v3-dica0{font-size:12px;color:var(--v3-mut-fg)}
    .v3-veic{display:grid;grid-template-columns:auto minmax(0,1fr);gap:12px;align-items:center;margin-bottom:12px}
    .v3-cxa{background:var(--v3-mut);border-radius:14px;padding:12px 14px;display:grid;gap:2px}.v3-cxa small{font-size:12px;color:var(--v3-mut-fg)}.v3-cxa b{font:700 18px Sora,sans-serif}
    .v3-loja{display:flex;justify-content:space-between;gap:12px;padding:8px 2px;border-bottom:1px solid var(--v3-borda);font-size:14px}.v3-loja:last-child{border-bottom:0}.v3-loja b{font-weight:600;white-space:nowrap}
    .v3-regras{margin:-4px 0 12px 4px}.v3-regras .v3-ic{width:16px;height:16px;margin-right:4px}
    .v3-pgtopo{display:flex;flex-wrap:wrap;gap:8px 22px;margin:0 0 14px;font-size:14px;color:var(--v3-mut-fg)}.v3-pgtopo b{color:var(--v3-fg);font:700 17px Sora,sans-serif;margin-left:4px}
    .v3-gpg{grid-template-columns:minmax(320px,1fr) minmax(0,1.6fr)}
    .v3-pg{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;border-bottom:1px solid var(--v3-borda);padding:4px 0}.v3-pg:last-child{border-bottom:0}
    .v3-pg-l{display:grid;grid-template-columns:52px minmax(0,1fr) auto;gap:10px;align-items:center;border:0;background:none;text-align:left;padding:7px 4px;cursor:pointer;border-radius:10px;min-width:0}
    .v3-pg-l:hover{background:var(--v3-mut)}.v3-pg-d{font-size:13px;color:var(--v3-mut-fg)}.v3-pg.atr .v3-pg-d{color:var(--v3-des);font-weight:600}
    .v3-pg-n{font-size:14px;min-width:0;overflow-wrap:anywhere}.v3-pg-l b{font-weight:600;white-space:nowrap}
    .v3-tag{font-style:normal;font-size:10.5px;font-weight:700;border-radius:999px;padding:2px 8px;margin-left:6px;vertical-align:1px}.v3-tag.atr{background:var(--v3-des);color:#fff}.v3-tag.hj{background:var(--v3-av-soft);color:var(--v3-av-forte)}
    .v3-paguei{min-height:34px;padding:6px 14px}
    .v3-pgpilha{position:relative;padding-bottom:14px}
    .v3-peek{position:absolute;left:5%;right:5%;bottom:6px;height:40px;border-radius:0 0 18px 18px;background:var(--cf);opacity:.9}.v3-peek.p2{left:9%;right:9%;bottom:0;opacity:.7}
    .v3-pgpilha .v3-frente{position:relative;z-index:1;width:100%}
    .v3-pgnav{display:flex;align-items:center;justify-content:center;gap:12px;margin:8px 0 14px}
    .v3-dots{display:flex;gap:6px;align-items:center}.v3-dots button{width:8px;height:8px;border-radius:4px;border:0;background:var(--v3-borda);padding:0;cursor:pointer}.v3-dots button.on{width:22px;background:var(--v3-pri)}
    .v3-fatbox{background:var(--v3-mut);border-radius:16px;padding:14px 16px;margin:0 0 12px}
    .v3-fat-l1{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}.v3-fat-l1 small{font-size:12.5px;color:var(--v3-mut-fg)}
    .v3-fat-v{font:700 26px Sora,sans-serif;margin:4px 0 10px}
    .v3-fat-bts{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
    .v3-fat-it{border-top:1px solid var(--v3-borda);margin-top:12px;padding-top:6px}.v3-fat-it .v3-it-ic{background:var(--v3-card)}
    .v3-hist{font-size:12.5px;color:var(--v3-mut-fg);margin-top:8px}
    .v3-cchips .v3-chip{cursor:pointer}
    .v3-tiles{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
    .v3-tile{display:grid;gap:2px;text-align:left;border:0;background:var(--v3-mut);border-radius:14px;padding:12px;cursor:pointer;min-width:0}
    .v3-tile b{font-size:14px;font-weight:600;overflow-wrap:anywhere}.v3-tile small{font-size:12px;color:var(--v3-mut-fg)}.v3-tile-v{font:700 17px Sora,sans-serif;margin-top:6px}
    .v3-tile .ok{color:var(--v3-ok-forte);font-weight:600}.v3-tile .atr{color:var(--v3-des);font-weight:600}
    .v3-links{display:flex;flex-wrap:wrap;gap:4px 16px;margin-top:10px}
    .v3 .falerta-l{margin:0 0 10px}
    .v3-ass{display:grid;grid-template-columns:34px minmax(0,1fr) auto auto;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid var(--v3-borda)}.v3-ass:last-child{border-bottom:0}
    .v3-ass-i{width:32px;height:32px;border-radius:50%;background:var(--v3-mut);display:grid;place-items:center;font-weight:700;font-size:13px}.v3-ass-v{font-weight:600;white-space:nowrap}
    .v3-corr{background:var(--v3-acc);color:var(--v3-acc-fg)}
    @media (max-width:760px){.v3-tres{grid-template-columns:1fr}.v3-tres .v3-card{margin:0}.v3-tres{gap:10px;margin-bottom:16px}
      .v3-tres.v3-tresp{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.v3-tresp>:nth-child(3){grid-column:1/-1}}  /* Produtos no celular: subiram e baixaram lado a lado; onde mais compra embaixo */
    @media (max-width:520px){.v3-total{font-size:38px}.v3-heroi-l{display:grid;grid-template-columns:repeat(3,auto);justify-content:start;align-items:start;gap:var(--v3-hgap,10px) 22px}
      .v3-totlinha{display:flex;grid-column:1/-1;justify-content:flex-start;align-items:flex-start;gap:8px}.v3-tendx{display:flex;margin-top:var(--v3-hexp,-2px)}
      .v3-heroi>.v3-tend{display:none}.v3-heroi .v3-mini{padding-bottom:0}.v3-heroi .v3-heroi-l{margin-bottom:var(--v3-hbase,2px)}.v3-heroi{padding-top:11px}  /* embaixo, o mesmo respiro de cima */.v3-d{border-radius:12px;font-size:14px}.v3-sem,.v3-dias{gap:3px}
      .v3-par{grid-template-columns:1fr}.v3-faixa{font-size:14px}.v3-fr-top{font-size:16px}
      /* celular: folha que sobe de baixo e para abaixo do relógio (o X sempre alcançável); fecha também arrastando para baixo */
      .v3 dialog.v3d{width:100vw;margin:auto 0 0;height:auto;max-height:calc(100dvh - env(safe-area-inset-top,0px) - 44px);border-radius:22px 22px 0 0;
        padding-bottom:calc(24px + env(safe-area-inset-bottom,0px));overscroll-behavior:contain}
      .v3 dialog.v3d .v3-dh{padding-top:22px;border-radius:22px 22px 0 0;touch-action:none}
      .v3 dialog.v3d .v3-dh::before,.v3 dialog.v3d>.v-fh::before{content:"";position:absolute;top:8px;left:50%;width:40px;height:4px;margin-left:-20px;border-radius:2px;background:var(--v3-borda)}
      .v3 dialog.v3d>.v-fh{position:sticky;padding-top:22px;touch-action:none}}
    /* celular: as outras janelas (nota fiscal, produto, sino, lançar…) também sobem de baixo e param abaixo da Island */
    @media (max-width:520px){.v3 dialog.folha:not(.v3d){width:100vw;max-width:100vw;margin:auto 0 0;max-height:calc(100dvh - env(safe-area-inset-top,0px) - 44px);
        border-radius:22px 22px 0 0;padding-bottom:calc(18px + env(safe-area-inset-bottom,0px));overscroll-behavior:contain}
      .v3 dialog.folha.nota{height:calc(100dvh - env(safe-area-inset-top,0px) - 44px)}}
    @media (max-width:520px) and (prefers-reduced-motion:no-preference){.v3 dialog.folha[open]{animation:v3sobe .22s cubic-bezier(.2,.8,.2,1)}
      @keyframes v3sobe{from{transform:translateY(40px);opacity:.4}to{transform:none;opacity:1}}}
    @media (prefers-reduced-motion:no-preference){.v3-it,.v3-nav button,.v3-d,.v3-bt,.v3-seg>button{transition:background-color .15s,color .15s}}
    .v3 .apl>div{min-width:0}.v3 .apl>span{flex-wrap:wrap;max-width:100%}
    .v3 .apl>span:has(>[data-a="v2-qcart"]){display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:8px;width:100%}
    .v3 .apl [data-a="v2-qcart"]{white-space:normal;line-height:1.25;min-height:44px;padding:8px 10px;text-align:center;margin:0}
    `;
  }
}

if (!customElements.get("co-finance-card")) customElements.define("co-finance-card", ComprasV3Card);
window.customCards = window.customCards || [];
window.customCards.push({ type: "co-finance-card", name: "CoFinance", description: "Compras, cartões, faturas e contas da casa." });


// ----- painel da barra lateral -----------------------------------------------

class CoFinancePanel extends HTMLElement {
  set hass(h) { this._card().hass = h; }
  set narrow(_v) {}
  set route(_v) {}
  set panel(_v) {}
  _card() {
    if (!this._c) {
      this.style.setProperty("--header-height", "0px");
      this.style.display = "block";
      this._c = document.createElement("co-finance-card");
      this._c.setConfig({ type: "custom:co-finance-card" });
      this.appendChild(this._c);
    }
    return this._c;
  }
}
if (!customElements.get("co-finance-panel")) customElements.define("co-finance-panel", CoFinancePanel);
