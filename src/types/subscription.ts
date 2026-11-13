// Espelha os CHECKs de `subscriptions` (supabase/migrations/015_monetization.sql).
export type Plan = 'monthly' | 'annual';

export type SubscriptionStatus = 'pending' | 'active' | 'past_due' | 'canceled' | 'expired';

export type BillingProvider = 'asaas' | 'apple' | 'google' | 'manual';

// Resultado de get_billing_status(), já com nomes do app.
export type BillingStatus = {
  hasActiveSubscription: boolean;
  plan: Plan | null;
  status: SubscriptionStatus | null;
  provider: BillingProvider | null;
  currentPeriodEnd: string | null;
  trialReportsUsed: number;
  trialReportLimit: number;
};
