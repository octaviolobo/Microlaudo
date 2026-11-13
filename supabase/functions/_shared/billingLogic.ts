// Regras de cobrança puras (sem Deno, sem rede) — usadas pelas Edge Functions
// billing-checkout / billing-webhook / billing-cancel e testadas pelo jest em
// __tests__/functions/billingLogic.test.ts.
//
// Preços: os mesmos de src/constants/plans.ts. Aqui é a fonte que vale para a
// cobrança (o client só exibe).

export type Plan = 'monthly' | 'annual';
export type PaymentMethod = 'card' | 'invoice';
export type SubscriptionStatus = 'pending' | 'active' | 'past_due' | 'canceled' | 'expired';

export const PLAN_CONFIG: Record<Plan, { value: number; cycle: 'MONTHLY' | 'YEARLY'; description: string }> = {
  monthly: { value: 49, cycle: 'MONTHLY', description: 'MicroLaudo — plano mensal' },
  annual: { value: 399, cycle: 'YEARLY', description: 'MicroLaudo — plano anual' },
};

// card: cartão salvo na 1ª fatura, renovação debitada automaticamente.
// invoice: fatura a cada ciclo (Pix, boleto ou cartão, escolhido na hora).
export const BILLING_TYPE: Record<PaymentMethod, 'CREDIT_CARD' | 'UNDEFINED'> = {
  card: 'CREDIT_CARD',
  invoice: 'UNDEFINED',
};

// Dias de tolerância depois do vencimento antes de cortar o acesso (renovação
// por Pix/boleto pode compensar no dia seguinte).
export const GRACE_DAYS = 3;

export function isPlan(value: unknown): value is Plan {
  return value === 'monthly' || value === 'annual';
}

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return value === 'card' || value === 'invoice';
}

export function onlyDigits(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\D/g, '') : '';
}

export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const d = cpf.split('').map(Number);
  for (const pos of [9, 10]) {
    let sum = 0;
    for (let i = 0; i < pos; i++) sum += d[i] * (pos + 1 - i);
    if (((sum * 10) % 11) % 10 !== d[pos]) return false;
  }
  return true;
}

export function isValidCnpj(value: string): boolean {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  const d = cnpj.split('').map(Number);
  const weights = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  for (const pos of [12, 13]) {
    let sum = 0;
    const w = weights.slice(13 - pos);
    for (let i = 0; i < pos; i++) sum += d[i] * w[i];
    const rest = sum % 11;
    if ((rest < 2 ? 0 : 11 - rest) !== d[pos]) return false;
  }
  return true;
}

export function isValidCpfCnpj(value: string): boolean {
  const digits = onlyDigits(value);
  return digits.length === 11 ? isValidCpf(digits) : digits.length === 14 ? isValidCnpj(digits) : false;
}

// "Hoje" em Brasília (UTC-3, sem horário de verão desde 2019) como YYYY-MM-DD.
export function todayInBrazil(now: Date = new Date()): string {
  return new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function parseDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Soma um ciclo do plano a uma data, sem estourar o fim do mês
// (31/01 + 1 mês = 28/02; 29/02/2028 + 1 ano = 28/02/2029).
export function addCycle(isoDate: string, plan: Plan): string {
  const base = parseDate(isoDate);
  const y = base.getUTCFullYear() + (plan === 'annual' ? 1 : 0);
  const m = base.getUTCMonth() + (plan === 'monthly' ? 1 : 0);
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return formatDate(new Date(Date.UTC(y, m, Math.min(base.getUTCDate(), lastDay))));
}

// Fim do acesso pago por uma cobrança com vencimento `dueDate`: um ciclo depois,
// mais a tolerância, às 23:59:59 de Brasília. Devolve ISO com fuso.
export function periodEndForPayment(dueDate: string, plan: Plan): string {
  const end = parseDate(addCycle(dueDate, plan));
  end.setUTCDate(end.getUTCDate() + GRACE_DAYS);
  return `${formatDate(end)}T23:59:59-03:00`;
}

// Nunca encurta um período já pago (evento atrasado ou fora de ordem).
export function laterPeriodEnd(current: string | null, candidate: string): string {
  if (!current) return candidate;
  return new Date(candidate).getTime() > new Date(current).getTime() ? candidate : current;
}

export type WebhookAction =
  | { kind: 'activate' } // pagamento confirmado → ativo até dueDate + ciclo
  | { kind: 'past_due' } // renovação vencida → mantém acesso até o fim do período
  | { kind: 'revoke' } // estorno/chargeback → corta agora
  | { kind: 'ended' } // assinatura apagada/inativada no Asaas
  | { kind: 'ignore' };

export function actionForEvent(event: unknown): WebhookAction {
  switch (event) {
    case 'PAYMENT_CONFIRMED':
    case 'PAYMENT_RECEIVED':
      return { kind: 'activate' };
    case 'PAYMENT_OVERDUE':
      return { kind: 'past_due' };
    case 'PAYMENT_REFUNDED':
    case 'PAYMENT_PARTIALLY_REFUNDED':
    case 'PAYMENT_CHARGEBACK_REQUESTED':
    case 'PAYMENT_CHARGEBACK_DISPUTE':
      return { kind: 'revoke' };
    case 'SUBSCRIPTION_DELETED':
    case 'SUBSCRIPTION_INACTIVATED':
      return { kind: 'ended' };
    default:
      return { kind: 'ignore' };
  }
}

type Row = { status: SubscriptionStatus; plan: Plan; current_period_end: string | null };

// Patch em `subscriptions` para uma ação. null = nada a mudar.
export function applyAction(
  action: WebhookAction,
  row: Row,
  payment: { dueDate?: unknown } | null,
  now: Date = new Date(),
): { status: SubscriptionStatus; current_period_end: string | null } | null {
  const periodInFuture = row.current_period_end !== null && new Date(row.current_period_end) > now;

  switch (action.kind) {
    case 'activate': {
      if (typeof payment?.dueDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(payment.dueDate)) return null;
      const end = laterPeriodEnd(row.current_period_end, periodEndForPayment(payment.dueDate, row.plan));
      // Assinatura cancelada continua cancelada: o pagamento só estende o acesso.
      return { status: row.status === 'canceled' ? 'canceled' : 'active', current_period_end: end };
    }
    case 'past_due':
      // Só faz sentido para quem já pagou um ciclo; a 1ª fatura vencida fica "pending".
      return row.status === 'active' ? { status: 'past_due', current_period_end: row.current_period_end } : null;
    case 'revoke':
      return { status: 'expired', current_period_end: now.toISOString() };
    case 'ended':
      if (row.status === 'expired') return null;
      return periodInFuture
        ? { status: 'canceled', current_period_end: row.current_period_end }
        : { status: 'expired', current_period_end: row.current_period_end };
    case 'ignore':
      return null;
  }
}

// Comparação em tempo constante para o token do webhook.
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
