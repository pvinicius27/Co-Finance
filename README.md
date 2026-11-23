# CoFinance

Compras, cartões, faturas e contas da casa dentro do Home Assistant. O CoFinance lê o cupom fiscal pelo QR Code (NFC-e), as faturas de cartão em PDF e o que você lançar à mão, junta tudo num card e avisa no celular o que está para vencer. Roda **localmente**: nenhum dado sai da sua casa.

## O que ele faz

- **Cupom fiscal pelo QR Code (NFC-e):** os itens entram sozinhos, com loja, data e forma de pagamento.
- **Faturas de cartão em PDF:** são lidas no navegador, conferidas com as compras, e o que faltar vira compra. Bancos: Santander, Bradesco, Banco do Brasil, Itaú, BRB, BTG, Caixa, Inter e Nubank.
- **Lançamento à mão** do que não tem nota.
- **Resumo do mês**, áreas de gasto (mercado, casa, carro…), contas a pagar e comparação de preço do mesmo produto entre mercados.
- **Avisos no telefone** do que vence, com o botão "✓ Paguei".
- **Pessoas, cartões e áreas** saem do seu cadastro. Nada vem com nomes prontos.

## Privacidade

Tudo fica no seu Home Assistant, na pasta `/config/co_dados/co_finance/`:

- `dados/`: as compras, os cartões e o cadastro;
- `notas/`: a cópia de cada nota.

Nome, CPF e endereço do consumidor **não** entram nas compras. Eles ficam só na cópia da nota.

## Antes de começar

- Home Assistant **2025.1** ou mais novo.
- [HACS](https://hacs.xyz) instalado.
- O app do Home Assistant no celular (iPhone ou Android), para receber os avisos.

## Instalação, passo a passo

### 1. Instalar pelo HACS

1. No Home Assistant, abra **HACS**.
2. No menu **⋮**, abra **Repositórios personalizados**.
3. Cole `https://github.com/pvinicius27/Co-Finance`, escolha o tipo **Integração** e toque em **Adicionar**.
4. Procure **CoFinance** no HACS e toque em **Baixar**.
5. **Reinicie o Home Assistant** (Configurações › Sistema › ⏻ Reiniciar).

### 2. Adicionar a integração

1. Abra **Configurações › Dispositivos e serviços › Adicionar integração**.
2. Procure **CoFinance**.
3. O assistente pergunta onde guardar os dados. Deixe o padrão (`/config/co_dados/co_finance`) e confirme.

A integração cria a pasta e um **código secreto** para o celular mandar os cupons (veja o passo 6).

### 3. Abrir a tela

Depois de adicionar a integração, aparece na barra lateral o item **Finanças** (ícone de carteira). Não é preciso criar painel nem adicionar recurso.

**Opcional:** para pôr o CoFinance numa aba do seu próprio painel, ao lado de outras coisas (por exemplo, junto com o CoEnergy), use o card:

1. Numa tela (painel), toque em **✎ Editar › Adicionar card**.
2. Procure **CoFinance**, ou use um card manual com:

```yaml
type: custom:co-finance-card
```

Dica: o card fica melhor numa vista de **painel** (tela cheia).

### 4. Primeiras configurações (⚙ na tela)

Na primeira vez, a tela inicial e a ⚙ mostram os **Primeiros passos**, numerados. Faça na ordem: cada passo pronto ganha ✓ e mostra o próximo.

1. **Pessoas:** cadastre quem compra na casa. Por exemplo, "Júlia" (um nome de exemplo). Para cada pessoa:
   - escolha o celular que recebe os avisos dela (os celulares com o app do HA aparecem na lista);
   - marque o que ela pode ver.
2. **Cartões:** cadastre cada cartão com:
   - o banco;
   - o titular e quem mais usa o cartão;
   - o dia em que a fatura **fecha** e o dia em que **vence**.

   Escolher o banco uma vez basta: ele dá a cor do cartão e diz qual leitor usar na fatura em PDF.
3. **Avisos no telefone:** escolha a que horas avisar das contas e faturas.

### 5. Subir a primeira fatura

1. Baixe a fatura do cartão em **PDF** no app ou no site do banco.
2. No card, toque em **Ler fatura do banco** (no quadro Cartões, ou em ⚙ › Faturas e assinaturas). Escolha o arquivo.
3. O CoFinance confere se a soma das linhas bate com o total da fatura.
4. Toque em **Ver a prévia** para ver o que vai entrar.
5. Toque em **Trazer N compras do …**. Cada linha da fatura vira uma compra, já com área, e tudo fica no **sino** para você conferir.

Com uma fatura dentro, o **Resumo** já mostra quanto foi gasto e onde.

### 6. Ler o cupom fiscal pelo celular (opcional)

O endereço para o celular mandar o QR Code está no card, em **⚙ › Atalho do telefone**. Ele tem o formato:

```
https://<endereço do seu Home Assistant>/api/webhook/<código>
```

O código funciona como uma senha. **Não compartilhe.** Se vazar, gere outro em Configurações › Dispositivos e serviços › CoFinance › Configurar.

**iPhone:** use o app **Atalhos**. O atalho lê o QR Code do cupom e faz um `POST` com `{"url": "<link do QR Code>", "quem": "<nome>"}` para o endereço acima.

**Android:** use o app gratuito **HTTP Shortcuts**:

1. Crie um atalho do tipo *Regular Shortcut*, método `POST`, com o endereço acima.
2. No corpo (JSON), coloque `{"url": "{qr}", "quem": "Júlia"}` e crie a variável `qr` do tipo *Scan barcode*.
3. Ponha o atalho na tela inicial. Um toque abre a câmera, você lê o QR Code e o cupom entra.

O botão **Enviar nota** do card também funciona em qualquer celular ou computador.

### 7. Pedidos de lojas online (opcional)

As compras da Shopee, Amazon, TikTok Shop e Mercado Livre podem entrar sozinhas pelo e-mail de confirmação do pedido. Na tela, em **⚙ › Pedidos de lojas online › Como ligar o automático**, há o passo a passo completo:

1. Escolha a caixa de e-mail: um Gmail novo só para isso (recomendado; o seu e-mail encaminha só os e-mails da loja para ele) ou o seu próprio e-mail.
2. Crie a **senha de app** do Gmail.
3. Adicione a integração **IMAP** do Home Assistant com essa caixa.
4. Volte à tela e toque na caixa para o CoFinance ler. Só a caixa escolhida é lida; outras caixas de e-mail do Home Assistant ficam de fora.

## Backup e mudança de Home Assistant

Tudo o que o CoFinance guarda está em `/config/co_dados/co_finance/`, e o backup do Home Assistant já inclui essa pasta.

Para guardar à parte ou levar os dados para outro Home Assistant, use o card em **⚙ › Backup e mudança de HA**:

- **⬇ Exportar (.zip):** baixa as compras, os cadastros e as cópias das notas num arquivo só.
- **⬆ Importar um .zip:** no HA novo, com o CoFinance instalado, escolha esse arquivo.
  - As compras e os cadastros passam a ser os do arquivo, e as notas são somadas às que já existiam.
  - O que havia antes fica guardado em `dados/backups/`.
  - O código do celular da instalação de origem continua valendo, então o Atalho não precisa mudar.

Os dois botões aparecem só para administradores. O arquivo pode ter até 16 MB, o que dá milhares de compras.

## Remover

Em **Configurações › Dispositivos e serviços › CoFinance › ⋮ › Excluir**, o CoFinance sai por inteiro: o item da barra lateral e a pasta `/config/co_dados/co_finance` (compras, cadastros, notas e backups). **Exporte antes** se quiser guardar os dados. Depois, tire o CoFinance também do HACS.

Por segurança, só é apagada uma pasta dentro de `/config/co_dados/`. Se você escolheu outra pasta na instalação, ela fica, e você apaga à mão.

## Problemas comuns

| O que aparece | O que fazer |
|---|---|
| "fatura do Bradesco, mas nenhum cartão tem esse banco" | Cadastre o cartão daquele banco em ⚙ › Cartões. Se houver dois cartões do mesmo banco, escolha no cadastro qual deles lê a fatura em PDF. |
| "a soma das linhas não bate com a fatura" | O layout do PDF do banco mudou. Abra um *issue* (sem anexar a fatura) dizendo o banco e o mês. |
| O card não aparece | Reinicie o HA depois de instalar pelo HACS e recarregue a página do navegador. |

## Marcas de terceiros

Marcas de terceiros: os nomes, logotipos e marcas de bancos, bandeiras de cartão e lojas exibidos ou citados pelo CoFinance pertencem aos seus respectivos titulares. São usados apenas para identificar, para o próprio usuário, o banco, o cartão ou a loja de cada compra. O CoFinance não é afiliado, patrocinado nem endossado por nenhuma dessas empresas, e a licença do CoFinance não abrange essas marcas. O titular que preferir que sua marca não seja exibida pode pedir a retirada (abra um issue no repositório), e ela será removida.

## Licença

Software proprietário. O uso depende de licença concedida pelo autor e vale
para uma instalação. Redistribuir, revender ou publicar o código não é
permitido. Veja [`LICENSE`](LICENSE).
