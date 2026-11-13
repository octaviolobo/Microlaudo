import { describe, expect, it, jest } from '@jest/globals';

import { annualDiscountPercent, annualMonthlyEquivalentCents, TRIAL_REPORT_LIMIT } from '@/constants/plans';
import { formatCentsBRL } from '@/lib/format';
import { isPaywallError, mapBillingStatus } from '@/services/billing';
import { canFinalizeNew, trialRemaining } from '@/stores/subscriptionStore';

import type { BillingStatus } from '@/types/subscription';

// babel-jest sobe o jest.mock para antes dos imports.
jest.mock('@/services/supabase', () => ({ supabase: {} }));

const trial = (used: number, limit = 1): BillingStatus =>
  mapBillingStatus({
    has_active_subscription: false,
    plan: null,
    status: null,
    provider: null,
    current_period_end: null,
    trial_reports_used: used,
    trial_report_limit: limit,
  });

describe('mapBillingStatus', () => {
  it('mapeia a linha do RPC', () => {
    const b = mapBillingStatus({
      has_active_subscription: true,
      plan: 'annual',
      status: 'active',
      provider: 'asaas',
      current_period_end: '2027-11-12T00:00:00Z',
      trial_reports_used: 1,
      trial_report_limit: 1,
    });
    expect(b).toEqual({
      hasActiveSubscription: true,
      plan: 'annual',
      status: 'active',
      provider: 'asaas',
      currentPeriodEnd: '2027-11-12T00:00:00Z',
      trialReportsUsed: 1,
      trialReportLimit: 1,
    });
  });

  it('linha ausente vira teste sem uso com o limite padrão', () => {
    const b = mapBillingStatus(undefined);
    expect(b.hasActiveSubscription).toBe(false);
    expect(b.trialReportsUsed).toBe(0);
    expect(b.trialReportLimit).toBe(TRIAL_REPORT_LIMIT);
  });

  it('descarta valores fora do esperado', () => {
    const b = mapBillingStatus({
      has_active_subscription: null,
      plan: 'vitalicio',
      status: 'whatever',
      provider: 'paypal',
      current_period_end: null,
      trial_reports_used: null,
      trial_report_limit: null,
    });
    expect(b.plan).toBeNull();
    expect(b.status).toBeNull();
    expect(b.provider).toBeNull();
  });
});

describe('canFinalizeNew', () => {
  it('libera enquanto há teste', () => {
    expect(trialRemaining(trial(0))).toBe(1);
    expect(canFinalizeNew(trial(0))).toBe(true);
  });

  it('bloqueia com teste usado e sem assinatura', () => {
    expect(canFinalizeNew(trial(1))).toBe(false);
    expect(trialRemaining(trial(5))).toBe(0);
  });

  it('assinante finaliza sempre', () => {
    expect(canFinalizeNew({ ...trial(1), hasActiveSubscription: true })).toBe(true);
  });

  it('status desconhecido não trava a UI (o servidor decide)', () => {
    expect(canFinalizeNew(null)).toBe(true);
  });
});

describe('isPaywallError', () => {
  it('reconhece o erro do trigger', () => {
    expect(isPaywallError({ code: 'PT402', message: 'PAYWALL_REQUIRED' })).toBe(true);
    expect(isPaywallError({ message: 'PAYWALL_REQUIRED' })).toBe(true);
  });

  it('ignora outros erros', () => {
    expect(isPaywallError({ code: '42501', message: 'x' })).toBe(false);
    expect(isPaywallError(null)).toBe(false);
    expect(isPaywallError('PAYWALL_REQUIRED')).toBe(false);
  });
});

describe('preços', () => {
  it('formata em reais', () => {
    expect(formatCentsBRL(4900)).toBe('R$ 49');
    expect(formatCentsBRL(39900)).toBe('R$ 399');
    expect(formatCentsBRL(3325)).toBe('R$ 33,25');
    expect(formatCentsBRL(123405)).toBe('R$ 1.234,05');
  });

  it('anual: 32% de desconto e R$33,25/mês', () => {
    expect(annualDiscountPercent()).toBe(32);
    expect(annualMonthlyEquivalentCents()).toBe(3325);
  });
});
