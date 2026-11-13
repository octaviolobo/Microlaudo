import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { FunctionsHttpError } from '@supabase/supabase-js';

import { TRIAL_REPORT_LIMIT } from '@/constants/plans';
import { AppError, ErrorCodes } from '@/lib/errors';

import { supabase } from './supabase';

import type { BillingProvider, BillingStatus, PaymentMethod, Plan, SubscriptionStatus } from '@/types/subscription';

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

// Código de erro devolvido pelas Edge Functions de cobrança ({ error: '...' }).
async function functionErrorCode(error: unknown): Promise<string | null> {
  if (!(error instanceof FunctionsHttpError)) return null;
  try {
    const body = (await error.context.json()) as { error?: unknown };
    return typeof body.error === 'string' ? body.error : null;
  } catch {
    return null;
  }
}

// Cria a assinatura no Asaas e devolve a URL da 1ª fatura. `code` do AppError
// é BILLING_CHECKOUT_FAILED; o motivo (invalid_document, already_subscribed,
// gateway_error...) vai em `message`, para a tela escolher o texto.
export async function startCheckout(params: {
  plan: Plan;
  method: PaymentMethod;
  cpfCnpj: string;
}): Promise<string> {
  const { data, error } = await supabase.functions.invoke<{ invoiceUrl?: string }>('billing-checkout', {
    method: 'POST',
    body: { ...params, cpfCnpj: params.cpfCnpj.replace(/\D/g, '') },
  });
  if (error || !data?.invoiceUrl) {
    const reason = (await functionErrorCode(error)) ?? 'gateway_error';
    throw new AppError(ErrorCodes.BILLING_CHECKOUT_FAILED, reason, error);
  }
  return data.invoiceUrl;
}

export async function cancelSubscription(): Promise<void> {
  const { error } = await supabase.functions.invoke('billing-cancel', { method: 'POST' });
  if (error) {
    const reason = (await functionErrorCode(error)) ?? 'gateway_error';
    throw new AppError(ErrorCodes.BILLING_CANCEL_FAILED, reason, error);
  }
}

// Abre a fatura do Asaas. Web: na mesma aba (window.open depois de um await cai no
// bloqueador de pop-up). Nativo: navegador do sistema; volta ao app ao fechar.
export async function openInvoice(url: string): Promise<void> {
  if (!/^https:\/\/([a-z0-9-]+\.)*asaas\.com\//i.test(url)) {
    throw new AppError(ErrorCodes.BILLING_CHECKOUT_FAILED, 'gateway_error');
  }
  if (Platform.OS === 'web') {
    window.location.assign(url);
    return;
  }
  await WebBrowser.openBrowserAsync(url);
}
