// Cliente mínimo da API REST da RevenueCat + sincronização da assinatura Apple
// de um médico com `subscriptions`. Usado por revenuecat-webhook e apple-sync.
//
// Secrets (Supabase → Edge Functions → Secrets):
//   REVENUECAT_SECRET_KEY      chave secreta da API v1 (sk_…), Project settings → API keys
//   REVENUECAT_WEBHOOK_SECRET  valor do header Authorization configurado no webhook
import { adminClient } from './asaas.ts';
import { appleStateFromSubscriber, appleSubscriptionRef, decideAppleWrite } from './appleBilling.ts';

import type { CurrentRow, RevenueCatSubscriber } from './appleBilling.ts';
import type { SubscriptionStatus } from './billingLogic.ts';

export class RevenueCatError extends Error {
  constructor(public readonly status: number) {
    super(`RevenueCat respondeu ${status}`);
  }
}

export async function fetchSubscriber(appUserId: string): Promise<RevenueCatSubscriber> {
  const key = Deno.env.get('REVENUECAT_SECRET_KEY');
  if (!key) throw new Error('REVENUECAT_SECRET_KEY ausente');
  const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`, {
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new RevenueCatError(res.status);
  const body = (await res.json()) as { subscriber?: RevenueCatSubscriber };
  return body.subscriber ?? {};
}

// Relê a assinatura Apple do usuário na RevenueCat e grava em `subscriptions`.
// Devolve um resultado curto para log/billing_events (ex.: 'write:active').
// Lança em falha de rede/banco (o chamador decide se pede nova tentativa).
export async function syncAppleForUser(admin: ReturnType<typeof adminClient>, appUserId: string): Promise<string> {
  const subscriber = await fetchSubscriber(appUserId);
  const state = appleStateFromSubscriber(subscriber);

  const { data: doctor, error: doctorError } = await admin
    .from('doctors')
    .select('id')
    .eq('user_id', appUserId)
    .maybeSingle();
  if (doctorError) throw new Error(`doctors: ${doctorError.message}`);
  if (!doctor) return 'unknown_user';

  const { data: row, error: rowError } = await admin
    .from('subscriptions')
    .select('provider, status, current_period_end')
    .eq('doctor_id', doctor.id)
    .maybeSingle();
  if (rowError) throw new Error(`subscriptions: ${rowError.message}`);

  const decision = decideAppleWrite(state, (row as CurrentRow) ?? null);

  if (decision.kind === 'skip') return `skip:${decision.reason}`;

  if (decision.kind === 'expire_apple') {
    const { error } = await admin
      .from('subscriptions')
      .update({ status: 'expired' satisfies SubscriptionStatus, current_period_end: new Date().toISOString() })
      .eq('doctor_id', doctor.id)
      .eq('provider', 'apple');
    if (error) throw new Error(`subscriptions: ${error.message}`);
    return 'expire_apple';
  }

  const { state: s } = decision;
  const { error } = await admin.from('subscriptions').upsert(
    {
      doctor_id: doctor.id,
      provider: 'apple',
      provider_customer_id: appUserId,
      provider_subscription_id: appleSubscriptionRef(appUserId),
      plan: s.plan,
      status: s.status,
      current_period_end: s.current_period_end,
    },
    { onConflict: 'doctor_id' },
  );
  if (error) throw new Error(`subscriptions: ${error.message}`);
  return `write:${s.status}${s.sandbox ? ':sandbox' : ''}`;
}
