# FinanceFlow iOS (Capacitor)

Este repositório empacota o app web do FinanceFlow (o mesmo usado no Android e no site) como um app nativo para iPhone, usando o Capacitor. A build do iOS é feita na nuvem pelo Codemagic, porque compilar para iPhone exige um Mac + Xcode, que este projeto não tem localmente.

## O que já está pronto aqui

- `package.json` — dependências do Capacitor.
- `capacitor.config.json` — configuração do app (appId `com.miguelrios.financeflow`, nome `FinanceFlow`, pasta web `www`).
- `codemagic.yaml` — pipeline de build na nuvem (instala dependências, gera o projeto iOS, compila e assina o .ipa).
- pasta `www/` — os arquivos do app (HTML, JS, ícones, manifest) — **ainda precisa ser enviada manualmente, veja o Passo 1 abaixo**.

## Passo 1 — Enviar os arquivos do app (você precisa fazer isso manualmente)

Não consegui automatizar o upload dos arquivos binários (ícones) e do HTML grande direto pelo navegador. Faça assim:

1. No seu computador, abra a pasta `ios_staging` dentro de "MEU APP" (Área de Trabalho).
2. Acesse: https://github.com/MiguelRios26/financeflow-ios/upload/main/www
3. Arraste os 6 arquivos dessa pasta (`index.html`, `premium-paywall.js`, `manifest.json`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`) para a área de upload.
4. Clique em "Commit changes".

## Passo 2 — Criar a conta Apple Developer ($99/ano)

1. Acesse https://developer.apple.com/programs/enroll/ e inscreva-se no Apple Developer Program (pessoa física ou empresa).
2. Aguarde a aprovação (geralmente same-day a 48h).

## Passo 3 — Criar o App ID

1. Em https://developer.apple.com/account/resources/identifiers, crie um novo App ID.
2. Bundle ID: `com.miguelrios.financeflow` (tem que ser exatamente igual ao que está em `capacitor.config.json`).

## Passo 4 — Criar uma API Key do App Store Connect

1. Em https://appstoreconnect.apple.com/access/integrations/api, crie uma chave com permissão "App Manager".
2. Baixe o arquivo `.p8` (só é possível baixar uma vez) e anote o Key ID e o Issuer ID.

## Passo 5 — Criar conta no Codemagic e conectar este repositório

1. Crie uma conta gratuita em https://codemagic.io usando "Sign up with GitHub".
2. Autorize o Codemagic a acessar o repositório `financeflow-ios`.
3. Adicione o app no Codemagic (ele vai detectar o `codemagic.yaml` automaticamente).

## Passo 6 — Configurar a integração com a Apple no Codemagic

1. No Codemagic, vá em Teams > Integrations > Apple Developer Portal.
2. Cadastre a API Key (.p8 + Key ID + Issuer ID) do Passo 4, dando o nome `appstore_credentials` (o mesmo nome usado no `codemagic.yaml`).

## Passo 7 — Rodar a build

1. No Codemagic, selecione o workflow `ios-capacitor` e clique em "Start new build".
2. A build gera o `.ipa` e, se tudo estiver certo, envia automaticamente para o TestFlight.

## Passo 8 — Instalar no iPhone

1. Baixe o app **TestFlight** na App Store do seu iPhone.
2. Aceite o convite de testador (chega por e-mail, do App Store Connect) ou use o link público do TestFlight que o Codemagic/App Store Connect gera.
3. Instale o FinanceFlow pelo TestFlight.

---

Qualquer erro na build aparece no log do Codemagic — pode colar o erro aqui na conversa que eu ajudo a resolver.
