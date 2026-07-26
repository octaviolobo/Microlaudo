export type SubscriptionStatus = 'trial' | 'active' | 'expired';

export type Plan = 'trial' | 'monthly' | 'annual';

export type TrialStatus = {
  reportsUsed: number;
  reportsLimit: number;
  isExhausted: boolean;
};
