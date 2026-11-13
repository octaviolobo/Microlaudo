import { describe, expect, it } from '@jest/globals';

// As Edge Functions (Deno) ficam fora do alias @/; o teste importa pelo caminho relativo.
// eslint-disable-next-line no-restricted-imports
import {
  actionForEvent,
  addCycle,
  applyAction,
  isValidCnpj,
  isValidCpf,
  isValidCpfCnpj,
  laterPeriodEnd,
  periodEndForPayment,
  safeEqual,
  todayInBrazil,
} from '../../supabase/functions/_shared/billingLogic';

const NOW = new Date('2026-11-12T15:00:00Z');

describe('documentos', () => {
  it('CPF', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('529.982.247-24')).toBe(false);
    expect(isValidCpf('111.111.111-11')).toBe(false);
  });

  it('CNPJ (IGARATECH e casos inválidos)', () => {
    expect(isValidCnpj('66.173.331/0001-31')).toBe(true);
    expect(isValidCnpj('11.222.333/0001-81')).toBe(true);
    expect(isValidCnpj('11.222.333/0001-80')).toBe(false);
    expect(isValidCnpj('00.000.000/0000-00')).toBe(false);
  });

  it('CPF ou CNPJ pelo tamanho', () => {
    expect(isValidCpfCnpj('52998224725')).toBe(true);
    expect(isValidCpfCnpj('66173331000131')).toBe(true);
    expect(isValidCpfCnpj('123')).toBe(false);
  });
});

describe('datas', () => {
  it('hoje em Brasília', () => {
    expect(todayInBrazil(new Date('2026-11-13T02:30:00Z'))).toBe('2026-11-12');
    expect(todayInBrazil(new Date('2026-11-13T03:30:00Z'))).toBe('2026-11-13');
  });

  it('soma ciclo sem estourar o mês', () => {
    expect(addCycle('2026-01-31', 'monthly')).toBe('2026-02-28');
    expect(addCycle('2026-12-15', 'monthly')).toBe('2027-01-15');
    expect(addCycle('2028-02-29', 'annual')).toBe('2029-02-28');
  });

  it('fim do período = ciclo + 3 dias, fim do dia em Brasília', () => {
    expect(periodEndForPayment('2026-11-12', 'monthly')).toBe('2026-12-15T23:59:59-03:00');
    expect(periodEndForPayment('2026-11-12', 'annual')).toBe('2027-11-15T23:59:59-03:00');
  });

  it('nunca encurta período', () => {
    expect(laterPeriodEnd('2027-01-01T00:00:00Z', '2026-12-01T00:00:00Z')).toBe('2027-01-01T00:00:00Z');
    expect(laterPeriodEnd(null, '2026-12-01T00:00:00Z')).toBe('2026-12-01T00:00:00Z');
  });
});

describe('webhook', () => {
  const pending = { status: 'pending' as const, plan: 'monthly' as const, current_period_end: null };
  const active = { status: 'active' as const, plan: 'monthly' as const, current_period_end: '2026-12-15T23:59:59-03:00' };

  it('mapeia eventos', () => {
    expect(actionForEvent('PAYMENT_RECEIVED').kind).toBe('activate');
    expect(actionForEvent('PAYMENT_CONFIRMED').kind).toBe('activate');
    expect(actionForEvent('PAYMENT_OVERDUE').kind).toBe('past_due');
    expect(actionForEvent('PAYMENT_REFUNDED').kind).toBe('revoke');
    expect(actionForEvent('SUBSCRIPTION_DELETED').kind).toBe('ended');
    expect(actionForEvent('PAYMENT_CREATED').kind).toBe('ignore');
  });

  it('pagamento ativa a assinatura pendente', () => {
    expect(applyAction({ kind: 'activate' }, pending, { dueDate: '2026-11-12' }, NOW)).toEqual({
      status: 'active',
      current_period_end: '2026-12-15T23:59:59-03:00',
    });
  });

  it('pagamento sem vencimento válido não muda nada', () => {
    expect(applyAction({ kind: 'activate' }, pending, { dueDate: 'ontem' }, NOW)).toBeNull();
  });

  it('pagamento atrasado de ciclo antigo não encurta o período', () => {
    const patch = applyAction({ kind: 'activate' }, active, { dueDate: '2026-10-12' }, NOW);
    expect(patch?.current_period_end).toBe(active.current_period_end);
  });

  it('pagamento de quem cancelou estende o acesso mas mantém cancelado', () => {
    const patch = applyAction({ kind: 'activate' }, { ...active, status: 'canceled' }, { dueDate: '2026-12-12' }, NOW);
    expect(patch).toEqual({ status: 'canceled', current_period_end: '2027-01-15T23:59:59-03:00' });
  });

  it('vencido: ativo vira past_due; 1ª fatura vencida continua pending', () => {
    expect(applyAction({ kind: 'past_due' }, active, null, NOW)?.status).toBe('past_due');
    expect(applyAction({ kind: 'past_due' }, pending, null, NOW)).toBeNull();
  });

  it('estorno corta na hora', () => {
    expect(applyAction({ kind: 'revoke' }, active, null, NOW)).toEqual({
      status: 'expired',
      current_period_end: NOW.toISOString(),
    });
  });

  it('assinatura apagada: cancelada até o fim do período, ou expirada', () => {
    expect(applyAction({ kind: 'ended' }, active, null, NOW)?.status).toBe('canceled');
    expect(applyAction({ kind: 'ended' }, pending, null, NOW)?.status).toBe('expired');
  });

  it('token em tempo constante', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });
});
