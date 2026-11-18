# Pagamentos pela App Store (RevenueCat)

No iPhone, a assinatura é vendida pela compra dentro do app da Apple (regra 3.1.1
da App Store: assinatura digital comprada no app tem que usar a compra da Apple).
O site continua com o Asaas ([pagamentos-asaas.md](pagamentos-asaas.md)). Os
dois gravam na mesma tabela `subscriptions`, e o paywall no banco (migration 015)
não sabe nem precisa saber de onde veio a assinatura.

## Como funciona

```
App (iPhone)                         RevenueCat                    Supabase
─────────────                        ──────────                    ────────
Purchases.logIn(user.id)  ───────►   app_user_id = user.id
Folha de compra da Apple  ───────►   valida o recibo
apple-sync (JWT)  ──────────────────────────────────────────────►  GET /v1/subscribers/{id}
                                                                    → subscriptions (provider 'apple')
                                     webhook  ─────────────────►   revenuecat-webhook
                                                                    → relê o subscriber → subscriptions
```

- **Fonte da verdade:** o *subscriber* da API REST da RevenueCat. O webhook não
  confia no corpo do evento: relê o subscriber e grava o estado lido. Compra,
  renovação, cancelamento, reembolso, problema de cobrança, troca de plano e
  transferência caem no mesmo caminho (`syncAppleForUser`).
- **Regras** (puras, testadas em `__tests__/functions/appleBilling.test.ts`):
  `supabase/functions/_shared/appleBilling.ts`.
  - `canceled` = renovação automática desligada; acesso até o vencimento.
  - `past_due` = problema de cobrança; acesso até o fim da tolerância da Apple.
  - Reembolso → `expired` na data do reembolso.
  - **Nunca derruba outro provedor com acesso** (cortesia `manual`, Asaas ativa).
    Médica com cortesia que compra no sandbox do TestFlight continua com a cortesia.
- **Sandbox:** compras do TestFlight e da revisão da Apple são de sandbox e também
  liberam o plano (a revisão precisa conseguir comprar). O resultado em
  `billing_events.result` termina com `:sandbox`.
- **Identificador:** `subscriptions.provider_subscription_id = 'rc:<user_id>'`.

## Configuração (uma vez)

### 1. App Store Connect
- Grupo de assinaturas **MicroLaudo Pro** com os produtos
  `com.microlaudo.app.mensal` (mensal) e `com.microlaudo.app.anual` (anual).
  Os IDs estão em `src/constants/plans.ts` e `_shared/appleBilling.ts` e não mudam.
- **App-Specific Shared Secret** ou **In-App Purchase Key** (Users and Access →
  Integrations → In-App Purchase) para a RevenueCat validar as compras.

### 2. RevenueCat
1. Projeto **MicroLaudo** → **Apps** → **+ App Store**: bundle `com.microlaudo.app`,
   e a In-App Purchase Key (arquivo `.p8`, Key ID e Issuer ID) do passo anterior.
2. **Products**: importar os dois produtos.
3. **Entitlements**: criar `pro` e anexar os dois produtos.
4. **Offerings**: a `default` (marcada como *current*) com dois pacotes:
   `$rc_monthly` → mensal e `$rc_annual` → anual.
5. **API keys**:
   - chave **pública** do app iOS (`appl_…`) → EAS (passo 4);
   - chave **secreta v1** (`sk_…`) → Supabase (passo 3).
6. **Integrations → Webhooks → + Add**:
   - URL: `https://okkemcrsrngahyzaddkr.supabase.co/functions/v1/revenuecat-webhook`
   - Authorization header: o valor de `REVENUECAT_WEBHOOK_SECRET`
   - Environment: **both** (produção e sandbox)

### 3. Supabase (secrets + deploy)
```powershell
npx supabase secrets set REVENUECAT_SECRET_KEY=sk_... REVENUECAT_WEBHOOK_SECRET=<32+ caracteres aleatórios> --project-ref okkemcrsrngahyzaddkr
npx supabase functions deploy revenuecat-webhook --project-ref okkemcrsrngahyzaddkr
npx supabase functions deploy apple-sync --project-ref okkemcrsrngahyzaddkr
```
`revenuecat-webhook` roda sem JWT (`verify_jwt = false` em `supabase/config.toml`);
`apple-sync` exige o JWT do usuário.

Depois, na RevenueCat, **Send test event**: `billing_events` deve ganhar uma linha
`rc:…` com `result = 'test'`.

### 4. EAS (app)
```powershell
npx eas-cli env:create --name EXPO_PUBLIC_REVENUECAT_IOS_KEY --value appl_... --environment development --environment preview --environment production --visibility plaintext
```
Sem essa variável, `APPLE_IAP_ENABLED` é falso e a tela de planos no iPhone não
oferece compra. Precisa de um **build novo** (o SDK é módulo nativo).

## No app
- `src/services/purchases.ts` (nativo) / `purchases.web.ts` (site, sem compra).
- `app/plans.tsx`: no iPhone, preço e nome vêm da App Store; botão de assinar
  abre a folha da Apple; **Restaurar compras**; aviso de renovação automática com
  links para Termos e Política (contrato da Apple, Schedule 2, 3.8(b)). Nenhum
  Asaas, CPF ou link para pagar fora do app.
- Perfil: **Gerenciar assinatura na App Store** (só a Apple cancela) e, na
  exclusão de conta, o aviso de que excluir não cancela a cobrança da Apple.

## Testar (sandbox)
1. App Store Connect → Users and Access → **Sandbox** → criar um testador (e-mail
   que não seja Apple ID real).
2. No iPhone: Ajustes → App Store → **Conta de Sandbox** → entrar com o testador.
3. Build de desenvolvimento ou TestFlight → Planos → Assinar. No sandbox o mensal
   renova a cada 5 minutos e para depois de algumas renovações.
4. Conferir `subscriptions` (provider `apple`) e `billing_events` (`rc:…`).

## Problemas comuns
- **"A App Store não respondeu" na tela de planos**: offerings vazias. Ver se os
  produtos estão importados na RevenueCat, no offering *current*, e se o contrato
  de Apps Pagos está ativo no App Store Connect.
- **Comprou e não liberou**: `billing_events` com `provider = 'apple'`; resultado
  `skip:other_provider_active:…` significa que o médico já tinha acesso por outro
  provedor (comportamento esperado).
