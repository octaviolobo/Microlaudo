import { describe, expect, it } from '@jest/globals';

// As Edge Functions (Deno) ficam fora do alias @/; o teste importa pelo caminho relativo.
// eslint-disable-next-line no-restricted-imports
import {
  appUserIdsForEvent,
  appleStateFromSubscriber,
  appleSubscriptionRef,
  decideAppleWrite,
  isAppUserId,
} from '../../supabase/functions/_shared/appleBilling';

const NOW = new Date('2026-11-17T15:00:00Z');
const FUTURE = '2026-12-17T15:00:00Z';
const PAST = '2026-11-01T15:00:00Z';
const USER = '56130331-930d-4af1-b90d-794d16794fa9';

const MONTHLY = 'com.microlaudo.app.mensal';
const ANNUAL = 'com.microlaudo.app.anual';

describe('appleStateFromSubscriber', () => {
  it('sem assinatura dos nossos produtos → null', () => {
    expect(appleStateFromSubscriber({ subscriptions: {} }, NOW)).toBeNull();
    expect(appleStateFromSubscriber({ subscriptions: { 'outro.produto': { expires_date: FUTURE } } }, NOW)).toBeNull();
    expect(appleStateFromSubscriber(null, NOW)).toBeNull();
  });

  it('mensal renovando → active até o vencimento', () => {
    const state = appleStateFromSubscriber(
      { subscriptions: { [MONTHLY]: { expires_date: FUTURE, store: 'app_store' } } },
      NOW,
    );
    expect(state).toEqual({ plan: 'monthly', status: 'active', current_period_end: new Date(FUTURE).toISOString(), sandbox: false });
  });

  it('renovação automática desligada → canceled, acesso até o vencimento', () => {
    const state = appleStateFromSubscriber(
      { subscriptions: { [ANNUAL]: { expires_date: FUTURE, unsubscribe_detected_at: PAST } } },
      NOW,
    );
    expect(state?.status).toBe('canceled');
    expect(state?.plan).toBe('annual');
  });

  it('problema de cobrança dentro da tolerância → past_due até o fim da tolerância', () => {
    const graceEnd = '2026-11-25T15:00:00Z';
    const state = appleStateFromSubscriber(
      {
        subscriptions: {
          [MONTHLY]: { expires_date: PAST, grace_period_expires_date: graceEnd, billing_issues_detected_at: PAST },
        },
      },
      NOW,
    );
    expect(state?.status).toBe('past_due');
    expect(state?.current_period_end).toBe(new Date(graceEnd).toISOString());
  });

  it('vencida → expired', () => {
    const state = appleStateFromSubscriber({ subscriptions: { [MONTHLY]: { expires_date: PAST } } }, NOW);
    expect(state?.status).toBe('expired');
  });

  it('reembolsada → expired na data do reembolso, mesmo com vencimento futuro', () => {
    const refundedAt = '2026-11-16T10:00:00Z';
    const state = appleStateFromSubscriber(
      { subscriptions: { [MONTHLY]: { expires_date: FUTURE, refunded_at: refundedAt } } },
      NOW,
    );
    expect(state?.status).toBe('expired');
    expect(state?.current_period_end).toBe(new Date(refundedAt).toISOString());
  });

  it('troca de plano → vale o que dá acesso por mais tempo', () => {
    const state = appleStateFromSubscriber(
      {
        subscriptions: {
          [MONTHLY]: { expires_date: '2026-11-20T00:00:00Z', unsubscribe_detected_at: PAST },
          [ANNUAL]: { expires_date: '2027-11-20T00:00:00Z' },
        },
      },
      NOW,
    );
    expect(state?.plan).toBe('annual');
    expect(state?.status).toBe('active');
  });

  it('marca compras do sandbox (TestFlight/revisão)', () => {
    const state = appleStateFromSubscriber(
      { subscriptions: { [MONTHLY]: { expires_date: FUTURE, is_sandbox: true } } },
      NOW,
    );
    expect(state?.sandbox).toBe(true);
  });

  it('ignora o mesmo id vindo de outra loja', () => {
    expect(
      appleStateFromSubscriber({ subscriptions: { [MONTHLY]: { expires_date: FUTURE, store: 'play_store' } } }, NOW),
    ).toBeNull();
  });
});

describe('decideAppleWrite', () => {
  const active = { plan: 'monthly' as const, status: 'active' as const, current_period_end: FUTURE, sandbox: false };
  const expired = { ...active, status: 'expired' as const, current_period_end: PAST };

  it('sem linha + compra → grava', () => {
    expect(decideAppleWrite(active, null, NOW)).toEqual({ kind: 'write', state: active });
  });

  it('sem linha + nada ativo → não cria linha', () => {
    expect(decideAppleWrite(expired, null, NOW).kind).toBe('skip');
    expect(decideAppleWrite(null, null, NOW).kind).toBe('skip');
  });

  it('linha Apple → sempre segue a RevenueCat (inclusive expirar)', () => {
    const row = { provider: 'apple', status: 'active' as const, current_period_end: FUTURE };
    expect(decideAppleWrite(expired, row, NOW)).toEqual({ kind: 'write', state: expired });
  });

  it('nunca derruba cortesia manual nem Asaas ativa', () => {
    const courtesy = { provider: 'manual', status: 'active' as const, current_period_end: null };
    expect(decideAppleWrite(active, courtesy, NOW)).toEqual({ kind: 'skip', reason: 'other_provider_active:manual' });
    const asaas = { provider: 'asaas', status: 'canceled' as const, current_period_end: FUTURE };
    expect(decideAppleWrite(active, asaas, NOW)).toEqual({ kind: 'skip', reason: 'other_provider_active:asaas' });
  });

  it('Asaas pendente ou vencida → a Apple assume se der acesso', () => {
    const pending = { provider: 'asaas', status: 'pending' as const, current_period_end: null };
    expect(decideAppleWrite(active, pending, NOW).kind).toBe('write');
    const old = { provider: 'asaas', status: 'expired' as const, current_period_end: PAST };
    expect(decideAppleWrite(active, old, NOW).kind).toBe('write');
    expect(decideAppleWrite(expired, old, NOW).kind).toBe('skip');
  });

  it('linha Apple com acesso e a RevenueCat sem nada (compra transferida) → expira', () => {
    const row = { provider: 'apple', status: 'active' as const, current_period_end: FUTURE };
    expect(decideAppleWrite(null, row, NOW)).toEqual({ kind: 'expire_apple' });
  });
});

describe('ids', () => {
  it('só aceita UUID do Supabase como app_user_id', () => {
    expect(isAppUserId(USER)).toBe(true);
    expect(isAppUserId('$RCAnonymousID:abc123')).toBe(false);
    expect(isAppUserId(42)).toBe(false);
  });

  it('TRANSFER relê os dois lados, sem repetir', () => {
    const other = 'c471a1ac-0460-468f-98c9-508c8af7f07e';
    expect(
      appUserIdsForEvent({
        app_user_id: USER,
        original_app_user_id: USER,
        transferred_from: ['$RCAnonymousID:x', other],
        transferred_to: [USER],
      }),
    ).toEqual([USER, other]);
  });

  it('chave da assinatura por usuário', () => {
    expect(appleSubscriptionRef(USER)).toBe(`rc:${USER}`);
  });
});
