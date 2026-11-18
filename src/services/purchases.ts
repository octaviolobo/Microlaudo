import { Linking, Platform } from 'react-native';
import Purchases, { LOG_LEVEL, PURCHASES_ERROR_CODE } from 'react-native-purchases';

import { APPLE_PRODUCT_IDS } from '@/constants/plans';
import { AppError, ErrorCodes } from '@/lib/errors';

import { supabase } from './supabase';

import type { PurchasesPackage } from 'react-native-purchases';
import type { Plan } from '@/types/subscription';

// Compra da assinatura pela App Store, via RevenueCat (react-native-purchases).
// Versão web (sem compra dentro do app) em purchases.web.ts.
//
// Fluxo: o usuário do Supabase é o app_user_id da RevenueCat (logIn(user.id)),
// a compra acontece na folha da Apple, e quem libera o plano é o servidor:
// apple-sync (chamado aqui logo depois da compra) e o revenuecat-webhook gravam
// `subscriptions` a partir da RevenueCat. O app nunca decide sozinho que o
// médico é assinante.

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;

// Só no iOS e só com a chave pública do SDK (appl_…) configurada no EAS.
export const APPLE_IAP_ENABLED = Platform.OS === 'ios' && Boolean(IOS_KEY);

export type AppleOffer = {
  plan: Plan;
  title: string; // nome exibido configurado no App Store Connect ("MicroLaudo Pro Anual")
  priceString: string; // preço já formatado pela Apple ("R$ 399,90")
  priceCents: number;
  pkg: PurchasesPackage;
};

export type PurchaseOutcome = 'purchased' | 'cancelled' | 'pending';

let configured = false;
let identifiedAs: string | null = null;

// Configura o SDK (uma vez) e alinha o usuário da RevenueCat com o do Supabase.
// null = deslogado → volta ao usuário anônimo, para a próxima conta não herdar
// a assinatura da anterior.
export async function identifyPurchaser(userId: string | null): Promise<void> {
  if (!APPLE_IAP_ENABLED || !IOS_KEY) return;
  try {
    if (!configured) {
      if (__DEV__) void Purchases.setLogLevel(LOG_LEVEL.WARN);
      Purchases.configure({ apiKey: IOS_KEY, appUserID: userId ?? undefined });
      configured = true;
      identifiedAs = userId;
      return;
    }
    if (userId === identifiedAs) return;
    if (userId) await Purchases.logIn(userId);
    else await Purchases.logOut();
    identifiedAs = userId;
  } catch {
    // logOut de usuário já anônimo lança; qualquer outra falha é refeita na compra.
  }
}

function isOurProduct(identifier: string): Plan | null {
  if (identifier === APPLE_PRODUCT_IDS.monthly) return 'monthly';
  if (identifier === APPLE_PRODUCT_IDS.annual) return 'annual';
  return null;
}

// Planos à venda na App Store, com preço e nome vindos da Apple.
export async function getAppleOffers(userId: string): Promise<Partial<Record<Plan, AppleOffer>>> {
  await identifyPurchaser(userId);
  const offerings = await Purchases.getOfferings();
  const packages = [
    ...(offerings.current?.availablePackages ?? []),
    ...Object.values(offerings.all).flatMap((o) => o.availablePackages),
  ];
  const offers: Partial<Record<Plan, AppleOffer>> = {};
  for (const pkg of packages) {
    const plan = isOurProduct(pkg.product.identifier);
    if (!plan || offers[plan]) continue;
    offers[plan] = {
      plan,
      title: pkg.product.title,
      priceString: pkg.product.priceString,
      priceCents: Math.round(pkg.product.price * 100),
      pkg,
    };
  }
  return offers;
}

function errorCode(err: unknown): unknown {
  return err && typeof err === 'object' ? (err as { code?: unknown }).code : undefined;
}

// Abre a folha de compra da Apple. 'pending' = compra aguardando aprovação
// (ex.: Compras Solicitadas / Ask to Buy).
export async function purchaseApplePlan(offer: AppleOffer, userId: string): Promise<PurchaseOutcome> {
  await identifyPurchaser(userId);
  try {
    await Purchases.purchasePackage(offer.pkg);
    return 'purchased';
  } catch (err) {
    const code = errorCode(err);
    if (code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return 'cancelled';
    if (code === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) return 'pending';
    throw new AppError(ErrorCodes.BILLING_CHECKOUT_FAILED, 'store_error', err);
  }
}

// "Restaurar compras" (exigido pela Apple). true = a conta Apple tem um dos
// nossos planos ativo; o servidor confere e grava via apple-sync.
export async function restoreApplePurchases(userId: string): Promise<boolean> {
  await identifyPurchaser(userId);
  try {
    const info = await Purchases.restorePurchases();
    return info.activeSubscriptions.some((id) => isOurProduct(id) !== null);
  } catch (err) {
    throw new AppError(ErrorCodes.BILLING_CHECKOUT_FAILED, 'store_error', err);
  }
}

// Pede ao servidor para reler a assinatura na RevenueCat e gravar agora, sem
// esperar o webhook. Falha aqui não é grave: o webhook faz o mesmo em seguida.
export async function syncAppleSubscription(): Promise<void> {
  const { error } = await supabase.functions.invoke('apple-sync', { method: 'POST' });
  if (error) throw new AppError(ErrorCodes.BILLING_STATUS_FAILED, 'sync_failed', error);
}

// Tela de assinaturas da Apple (mudar de plano, cancelar).
export async function openManageSubscriptions(): Promise<void> {
  try {
    if (APPLE_IAP_ENABLED && configured) {
      await Purchases.showManageSubscriptions();
      return;
    }
  } catch {
    // cai no link abaixo
  }
  await Linking.openURL('https://apps.apple.com/account/subscriptions');
}
