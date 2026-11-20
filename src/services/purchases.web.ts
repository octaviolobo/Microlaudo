// Web: não há compra dentro do app (o site usa o Asaas, em services/billing.ts).
// Mesma interface de purchases.ts para as telas não precisarem de Platform.OS.
import type { Plan } from '@/types/subscription';

export const APPLE_IAP_ENABLED = false;

export type AppleOffer = {
  plan: Plan;
  title: string;
  priceString: string;
  priceCents: number;
  pkg: unknown;
};

export type PurchaseOutcome = 'purchased' | 'cancelled' | 'pending';

export async function identifyPurchaser(_userId: string | null): Promise<void> {}

export async function getAppleOffers(_userId: string): Promise<Partial<Record<Plan, AppleOffer>>> {
  return {};
}

export async function purchaseApplePlan(_offer: AppleOffer, _userId: string): Promise<PurchaseOutcome> {
  return 'cancelled';
}

export async function restoreApplePurchases(_userId: string): Promise<boolean> {
  return false;
}

export async function syncAppleSubscription(): Promise<void> {}

export async function openManageSubscriptions(): Promise<void> {}
