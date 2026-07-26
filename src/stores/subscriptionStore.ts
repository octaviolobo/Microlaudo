import { create } from 'zustand';

import { TRIAL_REPORT_LIMIT } from '@/constants/plans';

import type { SubscriptionStatus } from '@/types/subscription';

type SubscriptionState = {
  status: SubscriptionStatus;
  trialUsed: number;
  setStatus: (status: SubscriptionStatus) => void;
  setTrialUsed: (count: number) => void;
};

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  status: 'trial',
  trialUsed: 0,
  setStatus: (status) => set({ status }),
  setTrialUsed: (trialUsed) => set({ trialUsed }),
}));

// Seletor standalone — uso correto: useSubscriptionStore(selectCanFinalize)
export function selectCanFinalize(state: SubscriptionState): boolean {
  if (state.status === 'active') return true;
  return state.status === 'trial' && state.trialUsed < TRIAL_REPORT_LIMIT;
}
