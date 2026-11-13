import { create } from 'zustand';

import { getBillingStatus } from '@/services/billing';

import type { BillingStatus } from '@/types/subscription';

type SubscriptionState = {
  // null = ainda não carregou (ou falhou). A UI não bloqueia nada nesse estado:
  // quem decide de verdade é o servidor no momento de finalizar.
  billing: BillingStatus | null;
  setBilling: (billing: BillingStatus | null) => void;
  refresh: () => Promise<BillingStatus | null>;
  reset: () => void;
};

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  billing: null,
  setBilling: (billing) => set({ billing }),
  refresh: async () => {
    try {
      const billing = await getBillingStatus();
      set({ billing });
      return billing;
    } catch {
      return null;
    }
  },
  reset: () => set({ billing: null }),
}));

export function trialRemaining(billing: BillingStatus): number {
  return Math.max(0, billing.trialReportLimit - billing.trialReportsUsed);
}

// Pode finalizar um laudo NOVO? (Re-finalizar o mesmo paciente é liberado pelo
// servidor mesmo sem assinatura — a UI não tenta prever esse caso.)
// Status desconhecido → true: deixa o servidor responder em vez de travar à toa.
export function canFinalizeNew(billing: BillingStatus | null): boolean {
  if (!billing) return true;
  return billing.hasActiveSubscription || trialRemaining(billing) > 0;
}

// Seletor standalone — uso: useSubscriptionStore(selectCanFinalize)
export function selectCanFinalize(state: SubscriptionState): boolean {
  return canFinalizeNew(state.billing);
}
