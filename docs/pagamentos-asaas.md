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
  Estorno/chargeback → `expired` na hora **e a assinatura é apagada no Asaas**
  (estornar não cancela a assinatura lá; a renovação cobraria de novo). Se o
  `DELETE` falhar, `billing_events.result` termina em `:asaas_delete_failed` →
  remover à mão no painel. Assinatura apagada → `canceled` até o fim do período.
- Cancelar (Perfil → Cancelar assinatura) → `billing-cancel` apaga a assinatura
  no Asaas e mantém o acesso até o fim do período.
- Excluir a conta cancela a assinatura no Asaas antes de apagar qualquer coisa.
- Todo evento recebido fica em `billing_events` (idempotência + diagnóstico).

## Configuração (uma vez por ambiente)

Sandbox e produção são **contas separadas** no Asaas (`sandbox.asaas.com` e
`www.asaas.com`), cada uma com cadastro, chave de API e webhook próprios. Os
secrets do Supabase guardam um ambiente por vez: trocar a chave para produção
desliga o sandbox.

Comandos da CLI que alteram o projeto (`secrets set`, `functions deploy`,
`db query`) pedem confirmação; em terminal não interativo, acrescente `--yes`.
Conferir sempre o alvo impresso: `MicrolaudoBR (okkemcrsrngahyzaddkr)`.

1. **Conta no Asaas**
   - Em Minha conta → Informações, preencher o **Site** com
     `https://microlaudo.com`. O Asaas só redireciona (`callback.successUrl`)
     para o domínio cadastrado ali; com `ASAAS_CALLBACK_URL` definido e o domínio
     ausente, a criação da assinatura pode ser recusada.
   - Faturamento mensal: estimativa real (pesa na análise e nos limites da conta).
2. **Migration 016** (`supabase/migrations/016_billing_asaas.sql`):
   `npx supabase db query --linked --yes -f supabase/migrations/016_billing_asaas.sql`
3. **Secrets** (Supabase → Edge Functions → Secrets, ou `npx supabase secrets set NOME="valor" --yes`):

   | Nome | Valor |
   |---|---|
   | `ASAAS_API_KEY` | chave da API (sandbox `$aact_hmlg_…`; produção `$aact_prod_…`) |
   | `ASAAS_API_URL` | `https://api-sandbox.asaas.com` (padrão se ausente) ou `https://api.asaas.com` |
   | `ASAAS_WEBHOOK_TOKEN` | 32+ caracteres aleatórios, sem espaço (o mesmo do passo 5) |
   | `ASAAS_CALLBACK_URL` | `https://microlaudo.com/plans?checkout=done` (exige o Site do passo 1, em cada conta) |

   Gerar o token no próprio terminal (nunca colar chave ou token em chat):
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
4. **Deploy das funções**:
   ```
   npx supabase functions deploy billing-checkout --yes
   npx supabase functions deploy billing-cancel --yes
   npx supabase functions deploy billing-webhook --no-verify-jwt --yes
   npx supabase functions deploy delete-account --yes
   ```
5. **Webhook no Asaas** (Integrações → Webhooks → Adicionar):
   - URL: `https://okkemcrsrngahyzaddkr.supabase.co/functions/v1/billing-webhook`
   - Token de autenticação: o valor de `ASAAS_WEBHOOK_TOKEN`
   - Versão da API: v3 · Envio: sequencial
   - Eventos: todos de **Cobranças** e de **Assinaturas**
6. **App (Cloudflare Pages)**: o checkout só aparece com `EXPO_PUBLIC_BILLING_CHECKOUT=1`.
   - As variáveis `EXPO_PUBLIC_*` entram no JS **na hora do build**: depois de
     mudar, é preciso **Retry deployment**; o `.env` local não vale para o Pages.
   - Os ambientes **Production** e **Preview** têm variáveis separadas. Os dois
     precisam de:

     | Variável | Valor |
     |---|---|
     | `EXPO_PUBLIC_SUPABASE_URL` | `https://okkemcrsrngahyzaddkr.supabase.co` |
     | `EXPO_PUBLIC_SUPABASE_ANON_KEY` | chave publicável do projeto de SP (`sb_publishable_…`) |
     | `EXPO_PUBLIC_TURNSTILE_SITE_KEY` | site key do Turnstile (sem espaço antes/depois) |
     | `EXPO_PUBLIC_BILLING_CHECKOUT` | `1` onde o checkout deve aparecer |

   - Ligar em Production só depois de trocar para a chave e a URL de produção.

## Teste

O sandbox foi validado ponta a ponta em 13/11/2026 no preview do Pages:
cadastro → 1 laudo grátis → paywall no 2º → assinatura mensal no cartão →
`PAYMENT_CONFIRMED` (`activate:active`, acesso até vencimento + 1 mês + 3 dias) →
excluir a conta → `SUBSCRIPTION_DELETED` vindo do Asaas e nenhuma linha órfã.

**Roteiro** (preview `https://<branch>.microlaudo.pages.dev`, protegido pelo
Cloudflare Access; `localhost` não funciona porque o Turnstile o recusa):

1. Criar conta com alias de e-mail (`seuemail+teste1@gmail.com`). Exige
   "Allow new users to sign up" ligado no Supabase (Authentication → Sign In / Providers).
2. Finalizar 1 laudo; tentar finalizar o 2º → tela de planos.
3. Assinar. No sandbox: CPF de teste `529.982.247-25`, cartão `4444 4444 4444 4444`,
   CVV `123`, validade futura. Pix/boleto: no painel do sandbox, abrir a cobrança →
   "Confirmar pagamento".
4. Conferir no banco:
   ```sql
   select event_type, received_at, result from billing_events order by received_at desc limit 10;
   select provider, plan, status, current_period_end from subscriptions order by created_at desc;
   ```
5. Excluir a conta pelo Perfil → deve chegar `SUBSCRIPTION_DELETED`.
6. Em produção, acrescentar: estornar o pagamento real pelo painel do Asaas →
   `PAYMENT_REFUNDED` deve cortar o acesso na hora (`revoke:expired`).

**Diagnóstico rápido**

| Sintoma | Causa provável |
|---|---|
| Console: CSP bloqueando `*.supabase.co` de outro projeto | variáveis do ambiente (Preview/Production) com o projeto antigo |
| `POST /auth/v1/signup` 401 | `EXPO_PUBLIC_SUPABASE_ANON_KEY` de outro projeto |
| Turnstile não aparece | `EXPO_PUBLIC_TURNSTILE_SITE_KEY` ausente no build |
| Signup 400 `captcha_failed` | widget sem token (site key ausente ou com espaço) |
| Signup 422 `signup_disabled` | cadastro desligado no Supabase |
| Pagou e não voltou ao app | `ASAAS_CALLBACK_URL` ausente ou Site não cadastrado no Asaas (o plano ativa pelo webhook mesmo assim) |
| Pagou e o plano não ativou | ver `billing_events.result` (`unknown_subscription`, token do webhook errado → 401 no log da função) |

## Custos (tabela padrão do Asaas, conferir na conta)

Sem mensalidade. Cartão à vista: R$ 0,49 + 2,99% (≈ R$ 1,96 no mensal de R$ 49);
Pix/boleto: R$ 1,99 por pagamento recebido. Cartão cai em ~30 dias (antecipação
opcional, ~1,25% a.m.). NFS-e pode ter tarifa por nota.

## Virada para produção

1. Conta de produção aprovada (CNPJ da IGARATECH; a verificação de identidade é
   feita pelo sócio cujo CPF está no cadastro; documentos: contrato social
   **registrado na JUCER**, não a minuta). Site e faturamento preenchidos.
2. `ASAAS_API_KEY` (produção) e `ASAAS_API_URL=https://api.asaas.com`.
3. `ASAAS_WEBHOOK_TOKEN` novo e webhook de produção (passo 5).
4. `EXPO_PUBLIC_BILLING_CHECKOUT=1` em **Production** no Pages → Retry deployment.
5. Teste real com uma conta própria + estorno (roteiro, passo 6).

## Pendente

- **NFS-e automática**: depende dos dados fiscais da IGARATECH no Asaas (inscrição
  municipal, código de serviço, alíquota). Combinar com o contador e então
  configurar a emissão por assinatura (`/v3/subscriptions/{id}/invoiceSettings`).
- **Termos de Uso e Política de Privacidade** com as condições comerciais.
- **`emailRedirectTo`** no cadastro (hoje o link de confirmação usa o Site URL do Supabase).
