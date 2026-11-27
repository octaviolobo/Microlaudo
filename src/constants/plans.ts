import type { Plan } from '@/types/subscription';

// Teste grátis: quantos laudos finalizados a conta ganha. A regra que vale é a do
// servidor (private.trial_report_limit(), migration 015), que chega ao app pelo
// get_billing_status(). Este valor só é usado antes do status carregar.
export const TRIAL_REPORT_LIMIT = 1;

// Preços de lançamento (decididos em 12/11/2026; mensal reduzido para R$39,90 em 17/11/2026;
// anual R$399,90 em 27/11/2026, igual ao da App Store). Em centavos para não ter
// conta de ponto flutuante; a cobrança de verdade usa o valor do gateway.
export const PLAN_PRICES_CENTS: Record<Plan, number> = {
  monthly: 3990,
  annual: 39990,
};

// Desconto do anual sobre 12 mensalidades, arredondado para baixo (R$399,90 vs R$478,80 → 16,47% → 16%).
// No iOS a tela passa os preços da App Store, que podem ter centavos diferentes.
export function annualDiscountPercent(
  monthlyCents: number = PLAN_PRICES_CENTS.monthly,
  annualCents: number = PLAN_PRICES_CENTS.annual,
): number {
  const twelveMonths = monthlyCents * 12;
  return Math.floor(((twelveMonths - annualCents) / twelveMonths) * 100);
}

// Quanto o anual sai por mês, em centavos (R$399,90 / 12 = R$33,325, arredondado para R$33,33).
export function annualMonthlyEquivalentCents(annualCents: number = PLAN_PRICES_CENTS.annual): number {
  return Math.round(annualCents / 12);
}

// Produtos de assinatura do App Store Connect (grupo "MicroLaudo Pro"). Os mesmos
// de supabase/functions/_shared/appleBilling.ts. Não mudam depois de criados.
export const APPLE_PRODUCT_IDS: Record<Plan, string> = {
  monthly: 'com.microlaudo.app.mensal',
  annual: 'com.microlaudo.app.anual',
};

// Liga o checkout (Edge Function billing-checkout → fatura do Asaas). Desligado, a
// tela de planos mostra os preços e um aviso de "em breve". Controlado por env para
// testar o sandbox localmente sem expor a cobrança em produção:
//   EXPO_PUBLIC_BILLING_CHECKOUT=1 npx expo start --web
export const BILLING_CHECKOUT_ENABLED = process.env.EXPO_PUBLIC_BILLING_CHECKOUT === '1';

// Contato mostrado enquanto o checkout não existe. Encaminhado pelo Cloudflare
// Email Routing para o Gmail da IGARATECH (docs/deploy-cloudflare.md, seção 3a).
export const BILLING_CONTACT_EMAIL = 'contato@microlaudo.com';
