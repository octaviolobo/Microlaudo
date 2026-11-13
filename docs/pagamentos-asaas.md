# Pagamentos com Asaas

Como a cobrança web funciona e o que configurar. Regras de negócio (teste grátis,
preços, paywall) em `docs/arquitetura.md` §8 e na migration 015.

## Fluxo

```
App (/plans)                 Edge Function             Asaas
  plano + forma + CPF/CNPJ ─► billing-checkout ──────► cria cliente (externalReference = doctors.id)
                                                  ──► cria assinatura (1º vencimento hoje)
                              grava subscriptions      (status pending)
  ◄──────────── invoiceUrl ──┘
  abre a fatura ──────────────────────────────────────► médico paga (cartão / Pix / boleto)
                             billing-webhook ◄──────── PAYMENT_CONFIRMED / PAYMENT_RECEIVED
                              subscriptions = active,
                              current_period_end = vencimento + ciclo + 3 dias
```

- **Cartão** (`billingType: CREDIT_CARD`): o cartão fica salvo na 1ª fatura e as
  renovações são debitadas sozinhas.
- **Pix ou boleto** (`billingType: UNDEFINED`): o Asaas manda uma fatura nova a
  cada ciclo, e o médico escolhe como pagar.
- O CPF/CNPJ fica só no Asaas (exigido para criar o cliente e para a NFS-e).
- Renovação vencida → `past_due`, com acesso até o fim do período pago + 3 dias.
  Estorno/chargeback → `expired` na hora. Assinatura apagada → `canceled` até o
  fim do período.
- Cancelar (Perfil → Cancelar assinatura) → `billing-cancel` apaga a assinatura
  no Asaas e mantém o acesso até o fim do período.
- Excluir a conta cancela a assinatura no Asaas antes de apagar qualquer coisa.
- Todo evento recebido fica em `billing_events` (idempotência + diagnóstico).

## Configuração (uma vez por ambiente)

1. **Migration 016** (`supabase/migrations/016_billing_asaas.sql`):
   `npx supabase db query --linked --yes -f supabase/migrations/016_billing_asaas.sql`
2. **Secrets** (Supabase → Edge Functions → Secrets):

   | Nome | Valor |
   |---|---|
   | `ASAAS_API_KEY` | chave da API (sandbox `$aact_hmlg_…`; produção `$aact_prod_…`) |
   | `ASAAS_API_URL` | `https://api-sandbox.asaas.com` (padrão se ausente) ou `https://api.asaas.com` |
   | `ASAAS_WEBHOOK_TOKEN` | 32+ caracteres aleatórios, sem espaço (o mesmo do passo 4) |
   | `ASAAS_CALLBACK_URL` | opcional: `https://microlaudo.pages.dev/plans?checkout=done` |

   Gerar um token: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
3. **Deploy das funções**:
   ```
   npx supabase functions deploy billing-checkout
   npx supabase functions deploy billing-cancel
   npx supabase functions deploy billing-webhook --no-verify-jwt
   npx supabase functions deploy delete-account
   ```
4. **Webhook no Asaas** (Integrações → Webhooks → Adicionar):
   - URL: `https://okkemcrsrngahyzaddkr.supabase.co/functions/v1/billing-webhook`
   - Token de autenticação: o valor de `ASAAS_WEBHOOK_TOKEN`
   - Versão da API: v3 · Envio: sequencial
   - Eventos: todos de **Cobranças** e de **Assinaturas**
5. **App**: o checkout só aparece com `EXPO_PUBLIC_BILLING_CHECKOUT=1`. Para testar
   o sandbox localmente: `EXPO_PUBLIC_BILLING_CHECKOUT=1 npx expo start --web`.
   Ligar em produção só depois de trocar para a chave e a URL de produção.

## Teste no sandbox

- Cartão aprovado: os cartões de teste da documentação do Asaas ("Como testar
  pagamentos no Sandbox").
- Pix/boleto: no painel do sandbox, abrir a cobrança → "Confirmar pagamento" /
  "Confirmar recebimento em dinheiro".
- Conferir: `select * from billing_events order by received_at desc limit 10;` e
  a linha do médico em `subscriptions`.

## Pendente

- **NFS-e automática**: depende dos dados fiscais da IGARATECH no Asaas (inscrição
  municipal, código de serviço, alíquota). Combinar com o contador e então
  configurar a emissão por assinatura (`/v3/subscriptions/{id}/invoiceSettings`).
- **Produção**: chave e URL de produção, webhook de produção, e ligar
  `EXPO_PUBLIC_BILLING_CHECKOUT` no build do Cloudflare Pages.
