// Regras puras da assinatura pela App Store (via RevenueCat) — sem Deno, sem rede.
// Usadas pelas Edge Functions revenuecat-webhook / apple-sync e testadas pelo jest
// em __tests__/functions/appleBilling.test.ts.
//
// Fonte da verdade: o "subscriber" da API REST da RevenueCat
// (GET /v1/subscribers/{app_user_id}). O webhook não confia no corpo do evento:
// qualquer evento só dispara uma nova leitura do subscriber, e o estado lido
// é que vai para `subscriptions`. Assim compra, renovação, cancelamento,
// reembolso, problema de cobrança e eventos fora de ordem caem no mesmo caminho.
//
// app_user_id = auth.users.id do médico (o app chama Purchases.logIn(user.id)
// antes de qualquer compra).

import type { Plan, SubscriptionStatus } from './billingLogic.ts';

// Product IDs criados no App Store Connect (grupo "MicroLaudo Pro"). Os mesmos
// de src/constants/plans.ts (APPLE_PRODUCT_IDS).
export const APPLE_PRODUCT_PLAN: Record<string, Plan> = {
  'com.microlaudo.app.mensal': 'monthly',
  'com.microlaudo.app.anual': 'annual',
};

// Recorte do que usamos de subscriber.subscriptions[productId].
export type RevenueCatSubscription = {
  expires_date?: string | null;
  grace_period_expires_date?: string | null;
  unsubscribe_detected_at?: string | null;
  billing_issues_detected_at?: string | null;
  refunded_at?: string | null;
  store?: string | null;
  is_sandbox?: boolean | null;
};

export type RevenueCatSubscriber = {
  subscriptions?: Record<string, RevenueCatSubscription | undefined> | null;
};

export type AppleState = {
  plan: Plan;
  status: SubscriptionStatus;
  current_period_end: string;
  sandbox: boolean;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Só aceitamos app_user_id que seja o id de um usuário do Supabase. IDs anônimos
// da RevenueCat ($RCAnonymousID:...) e lixo são ignorados.
export function isAppUserId(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}

function time(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? null : ms;
}

// Fim do acesso de uma assinatura: o maior entre o vencimento e o fim da
// tolerância de cobrança (billing grace period da Apple).
function accessEnd(sub: RevenueCatSubscription): number | null {
  const expires = time(sub.expires_date);
  const grace = time(sub.grace_period_expires_date);
  if (expires === null) return grace;
  if (grace === null) return expires;
  return Math.max(expires, grace);
}

// Estado da assinatura Apple do médico, ou null se ele nunca assinou um dos
// nossos produtos pela App Store. Com mais de um produto (troca de plano), vale
// o que dá acesso por mais tempo.
export function appleStateFromSubscriber(subscriber: RevenueCatSubscriber | null | undefined, now: Date = new Date()): AppleState | null {
  const subs = subscriber?.subscriptions ?? {};
  let best: { plan: Plan; sub: RevenueCatSubscription; end: number } | null = null;

  for (const [productId, sub] of Object.entries(subs)) {
    const plan = APPLE_PRODUCT_PLAN[productId];
    if (!plan || !sub) continue;
    // Só App Store: o mesmo produto não existe em outra loja.
    if (sub.store && sub.store !== 'app_store') continue;
    const refunded = time(sub.refunded_at);
    const end = refunded ?? accessEnd(sub);
    if (end === null) continue;
    if (!best || end > best.end) best = { plan, sub, end };
  }
  if (!best) return null;

  const { plan, sub, end } = best;
  const endIso = new Date(end).toISOString();
  const sandbox = sub.is_sandbox === true;

  let status: SubscriptionStatus;
  if (time(sub.refunded_at) !== null || end <= now.getTime()) status = 'expired';
  else if (sub.billing_issues_detected_at) status = 'past_due';
  else if (sub.unsubscribe_detected_at) status = 'canceled';
  else status = 'active';

  return { plan, status, current_period_end: endIso, sandbox };
}

// Linha atual de `subscriptions` do médico (recorte).
export type CurrentRow = {
  provider: string;
  status: SubscriptionStatus;
  current_period_end: string | null;
} | null;

function rowHasAccess(row: NonNullable<CurrentRow>, now: Date): boolean {
  if (!['active', 'past_due', 'canceled'].includes(row.status)) return false;
  return row.current_period_end === null || new Date(row.current_period_end).getTime() > now.getTime();
}

export type AppleDecision =
  | { kind: 'write'; state: AppleState }
  | { kind: 'expire_apple' } // a linha é Apple com acesso, mas a RevenueCat não tem mais nada (ex.: compra transferida)
  | { kind: 'skip'; reason: string };

// O que fazer com a linha do médico diante do estado lido na RevenueCat.
// Regra principal: nunca derrubar uma assinatura de OUTRO provedor que ainda dá
// acesso (cortesia manual, Asaas ativa). Ex.: médica com cortesia que compra no
// sandbox do TestFlight não perde a cortesia.
export function decideAppleWrite(state: AppleState | null, row: CurrentRow, now: Date = new Date()): AppleDecision {
  if (!state) {
    if (row?.provider === 'apple' && rowHasAccess(row, now)) return { kind: 'expire_apple' };
    return { kind: 'skip', reason: 'no_apple_subscription' };
  }
  if (!row) {
    // Sem linha e sem acesso pela Apple: nada a registrar.
    return state.status === 'expired' ? { kind: 'skip', reason: 'expired_without_row' } : { kind: 'write', state };
  }
  if (row.provider === 'apple') return { kind: 'write', state };
  if (rowHasAccess(row, now)) return { kind: 'skip', reason: `other_provider_active:${row.provider}` };
  // Linha de outro provedor sem acesso (Asaas pendente/expirada): a Apple assume,
  // mas só se de fato dá acesso.
  return state.status === 'expired' ? { kind: 'skip', reason: 'expired_other_provider' } : { kind: 'write', state };
}

// Chave única da assinatura Apple em `subscriptions` (UNIQUE provider +
// provider_subscription_id): uma por usuário da RevenueCat.
export function appleSubscriptionRef(appUserId: string): string {
  return `rc:${appUserId}`;
}

// app_user_ids a sincronizar para um evento do webhook. TRANSFER move a compra
// de um usuário para outro (ex.: "Restaurar compras" em outra conta): os dois
// lados precisam ser relidos.
export function appUserIdsForEvent(event: {
  app_user_id?: unknown;
  original_app_user_id?: unknown;
  transferred_from?: unknown;
  transferred_to?: unknown;
}): string[] {
  const candidates: unknown[] = [event.app_user_id, event.original_app_user_id];
  if (Array.isArray(event.transferred_from)) candidates.push(...event.transferred_from);
  if (Array.isArray(event.transferred_to)) candidates.push(...event.transferred_to);
  return [...new Set(candidates.filter(isAppUserId).map((id) => id.toLowerCase()))];
}
