import { TRIAL_REPORT_LIMIT } from '@/constants/plans';
import { AppError, ErrorCodes } from '@/lib/errors';

import { supabase } from './supabase';

import type { BillingProvider, BillingStatus, Plan, SubscriptionStatus } from '@/types/subscription';

const PLANS: readonly Plan[] = ['monthly', 'annual'];
const STATUSES: readonly SubscriptionStatus[] = ['pending', 'active', 'past_due', 'canceled', 'expired'];
const PROVIDERS: readonly BillingProvider[] = ['asaas', 'apple', 'google', 'manual'];

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

type BillingStatusRow = {
  has_active_subscription: boolean | null;
  plan: string | null;
  status: string | null;
  provider: string | null;
  current_period_end: string | null;
  trial_reports_used: number | null;
  trial_report_limit: number | null;
};

export function mapBillingStatus(row: BillingStatusRow | null | undefined): BillingStatus {
  return {
    hasActiveSubscription: row?.has_active_subscription === true,
    plan: oneOf(row?.plan, PLANS),
    status: oneOf(row?.status, STATUSES),
    provider: oneOf(row?.provider, PROVIDERS),
    currentPeriodEnd: row?.current_period_end ?? null,
    trialReportsUsed: row?.trial_reports_used ?? 0,
    trialReportLimit: row?.trial_report_limit ?? TRIAL_REPORT_LIMIT,
  };
}

// Status de assinatura/teste do médico logado (RPC da migration 015).
export async function getBillingStatus(): Promise<BillingStatus> {
  const { data, error } = await supabase.rpc('get_billing_status');
  if (error) throw new AppError(ErrorCodes.BILLING_STATUS_FAILED, error.message, error);
  return mapBillingStatus(data?.[0]);
}

// O trigger reports_enforce_entitlement responde SQLSTATE PT402 (HTTP 402 no
// PostgREST) com a mensagem PAYWALL_REQUIRED quando o médico não pode finalizar.
export function isPaywallError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const { code, message } = error as { code?: unknown; message?: unknown };
  return code === 'PT402' || message === 'PAYWALL_REQUIRED';
}
