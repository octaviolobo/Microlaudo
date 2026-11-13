import type { Plan } from '@/types/subscription';

// Teste grátis: quantos laudos finalizados a conta ganha. A regra que vale é a do
// servidor (private.trial_report_limit(), migration 015), que chega ao app pelo
// get_billing_status(). Este valor só é usado antes do status carregar.
export const TRIAL_REPORT_LIMIT = 1;

// Preços de lançamento (decididos em 12/11/2026). Em centavos para não ter
// conta de ponto flutuante; a cobrança de verdade usa o valor do gateway.
export const PLAN_PRICES_CENTS: Record<Plan, number> = {
  monthly: 4900,
  annual: 39900,
};

// Desconto do anual sobre 12 mensalidades, arredondado para baixo (R$399 vs R$588 → 32%).
export function annualDiscountPercent(): number {
  const twelveMonths = PLAN_PRICES_CENTS.monthly * 12;
  return Math.floor(((twelveMonths - PLAN_PRICES_CENTS.annual) / twelveMonths) * 100);
}

// Quanto o anual sai por mês, em centavos (R$399 / 12 = R$33,25).
export function annualMonthlyEquivalentCents(): number {
  return Math.round(PLAN_PRICES_CENTS.annual / 12);
}

// Liga o botão "Assinar" quando o checkout do gateway (Edge Function) estiver no ar.
// Até lá, a tela de planos mostra os preços e um aviso de "em breve".
export const BILLING_CHECKOUT_ENABLED = false;

// Contato mostrado enquanto o checkout não existe (e-mail da IGARATECH).
export const BILLING_CONTACT_EMAIL = 'microlaudo@gmail.com';
