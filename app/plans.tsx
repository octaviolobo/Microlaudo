import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { BillingStatusBanner } from '@/components/billing/BillingStatusBanner';
import { Button, Input, MessageBox } from '@/components/ui';
import { LegalNotice } from '@/components/legal/LegalNotice';
import {
  BILLING_CHECKOUT_ENABLED,
  BILLING_CONTACT_EMAIL,
  PLAN_PRICES_CENTS,
  TRIAL_REPORT_LIMIT,
  annualDiscountPercent,
  annualMonthlyEquivalentCents,
} from '@/constants/plans';
import { isReportTypeEnabled } from '@/constants/features';
import { Colors, Radius, Spacing, Typography, TouchTarget } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { AppError } from '@/lib/errors';
import { formatCentsBRL } from '@/lib/format';
import { isValidCpfCnpj } from '@/lib/validation';
import { openInvoice, startCheckout } from '@/services/billing';
import {
  APPLE_IAP_ENABLED,
  getAppleOffers,
  openManageSubscriptions,
  purchaseApplePlan,
  restoreApplePurchases,
  syncAppleSubscription,
} from '@/services/purchases';
import { useSubscriptionStore } from '@/stores/subscriptionStore';

import type { AppleOffer } from '@/services/purchases';
import type { PaymentMethod, Plan } from '@/types/subscription';

// O USG só existe onde o tipo está liberado (hoje, só na web). No app, a lista
// não pode prometer o que o app não entrega (App Store 2.3.1/3.1.2).
const BENEFITS = [
  isReportTypeEnabled('usg_transvaginal') ? 'benefitUnlimited' : 'benefitUnlimitedMicroscopy',
  'benefitPdf',
  'benefitHistory',
  'benefitCancel',
] as const;

// Motivo devolvido pela Edge Function → chave de texto.
const CHECKOUT_ERRORS: Record<string, string> = {
  invalid_document: 'billing.documentInvalid',
  already_subscribed: 'billing.alreadySubscribed',
  gateway_rejected: 'billing.gatewayRejected',
  checkout_in_progress: 'billing.checkoutInProgress',
};

// Tela de planos. No iPhone (APPLE_IAP_ENABLED) a compra é pela App Store, com
// preço e nome vindos da Apple, "Restaurar compras" e o aviso de renovação
// automática; nada de Asaas, CPF ou link para pagar fora do app (regra 3.1.1).
// No site, a compra é pelo Asaas.
//
// Abre de quatro jeitos:
//  - pelo paywall ao finalizar (?reason=paywall) → mostra o aviso no topo;
//  - pelo Perfil / aviso da Home;
//  - na volta do Asaas depois de pagar (?checkout=done, se ASAAS_CALLBACK_URL estiver configurado);
//  - deslogado (link público) → preços + "Criar conta e testar grátis".
export function PlansScreen() {
  const { t } = useTranslation('common');
  const { reason, checkout } = useLocalSearchParams<{ reason?: string; checkout?: string }>();
  const { isAuthenticated, user } = useAuth();
  const billing = useSubscriptionStore((s) => s.billing);
  const refresh = useSubscriptionStore((s) => s.refresh);

  const [selected, setSelected] = useState<Plan>('annual');
  const [method, setMethod] = useState<PaymentMethod>('card');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [appleOffers, setAppleOffers] = useState<Partial<Record<Plan, AppleOffer>>>({});
  const userId = user?.id ?? null;

  // iPhone: busca na App Store o preço e o nome de cada plano.
  useEffect(() => {
    if (!APPLE_IAP_ENABLED || !userId) return;
    let cancelled = false;
    getAppleOffers(userId)
      .then((offers) => {
        if (!cancelled) setAppleOffers(offers);
      })
      .catch(() => {
        // Sem conexão com a App Store: os cards mostram o preço de referência e
        // a compra avisa o erro.
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void refresh();
    // Voltou do pagamento: o webhook pode levar alguns segundos. Reconsulta algumas vezes.
    if (checkout !== 'done') return;
    const timers = [4000, 10000, 20000].map((ms) => setTimeout(() => void refresh(), ms));
    return () => timers.forEach(clearTimeout);
  }, [isAuthenticated, refresh, checkout]);

  const isSubscriber = billing?.hasActiveSubscription === true;
  const isPending = !isSubscriber && billing?.status === 'pending';
  const isAppleSubscriber = isSubscriber && billing?.provider === 'apple';
  const planLabel = (plan: Plan) => t(plan === 'annual' ? 'billing.planAnnual' : 'billing.planMonthly');

  // Preços exibidos: os da App Store no iPhone (quando já carregaram), senão os de referência.
  const monthlyCents = appleOffers.monthly?.priceCents ?? PLAN_PRICES_CENTS.monthly;
  const annualCents = appleOffers.annual?.priceCents ?? PLAN_PRICES_CENTS.annual;
  const priceLabel = (plan: Plan) =>
    appleOffers[plan]?.priceString ?? formatCentsBRL(plan === 'annual' ? annualCents : monthlyCents);
  const cardLabel = (plan: Plan) => appleOffers[plan]?.title || planLabel(plan);

  // Depois da compra/restauração: o servidor relê a RevenueCat e libera o plano.
  // Se ainda não refletiu (RevenueCat atrasada), o webhook libera em seguida.
  async function confirmApplePurchase(successKey: string) {
    await syncAppleSubscription().catch(() => undefined);
    const updated = await refresh();
    if (updated?.hasActiveSubscription) {
      setNotice(t(successKey));
      return;
    }
    setNotice(t('billing.appleProcessing'));
    [4000, 10000, 20000].forEach((ms) => setTimeout(() => void refresh(), ms));
  }

  async function handleApplePurchase() {
    if (!userId) return;
    setError(null);
    setNotice(null);
    const offer = appleOffers[selected];
    if (!offer) {
      setError(t('billing.appleUnavailable'));
      return;
    }
    try {
      setIsSubmitting(true);
      const outcome = await purchaseApplePlan(offer, userId);
      if (outcome === 'cancelled') return;
      if (outcome === 'pending') {
        setNotice(t('billing.applePending'));
        return;
      }
      await confirmApplePurchase('billing.applePurchased');
    } catch {
      setError(t('billing.appleError'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAppleRestore() {
    if (!userId) return;
    setError(null);
    setNotice(null);
    try {
      setIsRestoring(true);
      const found = await restoreApplePurchases(userId);
      if (!found) {
        setNotice(t('billing.appleNothingToRestore'));
        return;
      }
      await confirmApplePurchase('billing.appleRestored');
    } catch {
      setError(t('billing.appleError'));
    } finally {
      setIsRestoring(false);
    }
  }

  function handleBack() {
    if (router.canGoBack()) router.back();
    else router.replace(isAuthenticated ? '/(tabs)/home' : '/(auth)/login');
  }

  async function handleSubscribe() {
    if (!isAuthenticated) {
      router.push('/(auth)/register');
      return;
    }
    if (APPLE_IAP_ENABLED) {
      await handleApplePurchase();
      return;
    }
    if (!BILLING_CHECKOUT_ENABLED) {
      setNotice(t('billing.comingSoon', { email: BILLING_CONTACT_EMAIL }));
      return;
    }
    setError(null);
    if (!isValidCpfCnpj(cpfCnpj)) {
      setDocumentError(t('billing.documentInvalid'));
      return;
    }
    setDocumentError(null);
    try {
      setIsSubmitting(true);
      const invoiceUrl = await startCheckout({ plan: selected, method, cpfCnpj });
      await openInvoice(invoiceUrl);
      // Nativo: o navegador fechou. Web: a página já saiu daqui.
      void refresh();
    } catch (err) {
      const reasonKey = err instanceof AppError ? CHECKOUT_ERRORS[err.message] : undefined;
      if (err instanceof AppError && err.message === 'already_subscribed') void refresh();
      setError(t(reasonKey ?? 'billing.gatewayError'));
    } finally {
      setIsSubmitting(false);
    }
  }

  const showCheckoutForm = !APPLE_IAP_ENABLED && isAuthenticated && BILLING_CHECKOUT_ENABLED && !isSubscriber;
  const showAppleTerms = APPLE_IAP_ENABLED && isAuthenticated && !isSubscriber;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Pressable onPress={handleBack} style={styles.back} accessibilityRole="button" hitSlop={8}>
        <Ionicons name="chevron-back" size={20} color={Colors.primary} />
        <Text style={styles.backText}>{t('back')}</Text>
      </Pressable>

      {reason === 'paywall' && !isSubscriber ? (
        <View style={styles.header}>
          <Text style={styles.title}>{t('billing.paywallTitle')}</Text>
          <Text style={styles.subtitle}>{t('billing.paywallBody')}</Text>
        </View>
      ) : (
        <View style={styles.header}>
          <Text style={styles.title}>{t('billing.title')}</Text>
          <Text style={styles.subtitle}>{t('billing.subtitle')}</Text>
        </View>
      )}

      {checkout === 'done' && !isSubscriber && <MessageBox message={t('billing.checkoutDone')} type="success" />}
      {billing && <BillingStatusBanner billing={billing} showPlansLink={false} />}
      {isPending && !APPLE_IAP_ENABLED && <Text style={styles.helper}>{t('billing.pendingBody')}</Text>}

      <View style={styles.options} accessibilityRole="radiogroup">
        <OptionCard
          label={cardLabel('annual')}
          price={priceLabel('annual')}
          period={t('billing.perYear')}
          detail={t('billing.annualEquivalent', {
            price: formatCentsBRL(annualMonthlyEquivalentCents(annualCents)),
          })}
          badge={t('billing.annualBadge', { percent: annualDiscountPercent(monthlyCents, annualCents) })}
          selected={selected === 'annual'}
          onSelect={() => setSelected('annual')}
        />
        <OptionCard
          label={cardLabel('monthly')}
          price={priceLabel('monthly')}
          period={t('billing.perMonth')}
          selected={selected === 'monthly'}
          onSelect={() => setSelected('monthly')}
        />
      </View>

      <View style={styles.benefits}>
        {BENEFITS.map((key) => (
          <View key={key} style={styles.benefitRow}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.accent} />
            <Text style={styles.benefitText}>{t(`billing.${key}`)}</Text>
          </View>
        ))}
      </View>

      {showCheckoutForm && (
        <>
          <Text style={styles.sectionTitle}>{t('billing.methodTitle')}</Text>
          <View style={styles.options} accessibilityRole="radiogroup">
            <OptionCard
              label={t('billing.methodCard')}
              detail={t('billing.methodCardHint')}
              icon="card-outline"
              selected={method === 'card'}
              onSelect={() => setMethod('card')}
            />
            <OptionCard
              label={t('billing.methodInvoice')}
              detail={t('billing.methodInvoiceHint')}
              icon="qr-code-outline"
              selected={method === 'invoice'}
              onSelect={() => setMethod('invoice')}
            />
          </View>
          <Input
            label={t('billing.documentLabel')}
            value={cpfCnpj}
            onChangeText={(text) => {
              setCpfCnpj(text);
              if (documentError) setDocumentError(null);
            }}
            type="numeric"
            required
            error={documentError ?? undefined}
          />
          <LegalNotice context="subscribe" />
        </>
      )}

      {showAppleTerms && <LegalNotice context="subscribeApple" />}

      {notice && <MessageBox message={notice} type="info" />}
      {error && <MessageBox message={error} type="error" />}

      {isSubscriber ? (
        <>
          <MessageBox message={t('billing.alreadySubscribed')} type="success" />
          {isAppleSubscriber && APPLE_IAP_ENABLED && (
            <Button
              label={t('billing.manageApple')}
              onPress={() => void openManageSubscriptions()}
              variant="secondary"
              fullWidth
              icon="settings-outline"
            />
          )}
        </>
      ) : (
        <Button
          label={
            !isAuthenticated
              ? t('billing.createAccount')
              : isSubmitting
                ? t(APPLE_IAP_ENABLED ? 'billing.purchasing' : 'billing.redirecting')
                : isPending && BILLING_CHECKOUT_ENABLED && !APPLE_IAP_ENABLED
                  ? t('billing.newInvoice')
                  : t('billing.subscribe', { plan: planLabel(selected) })
          }
          onPress={handleSubscribe}
          loading={isSubmitting}
          disabled={isSubmitting || isRestoring}
          size="lg"
          fullWidth
        />
      )}

      {APPLE_IAP_ENABLED && isAuthenticated && !isSubscriber && (
        <Button
          label={isRestoring ? t('billing.appleRestoring') : t('billing.appleRestore')}
          onPress={handleAppleRestore}
          loading={isRestoring}
          disabled={isSubmitting || isRestoring}
          variant="secondary"
          fullWidth
        />
      )}

      {!isAuthenticated && (
        <Text style={styles.footnote}>{t('billing.trialInfo', { count: TRIAL_REPORT_LIMIT })}</Text>
      )}
    </ScrollView>
  );
}

type OptionCardProps = {
  label: string;
  price?: string;
  period?: string;
  detail?: string;
  badge?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  selected: boolean;
  onSelect: () => void;
};

function OptionCard({ label, price, period, detail, badge, icon, selected, onSelect }: OptionCardProps) {
  return (
    <Pressable
      onPress={onSelect}
      style={[styles.card, selected && styles.cardSelected]}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={price ? `${label}, ${price}${period ?? ''}` : label}
    >
      <Ionicons
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        size={22}
        color={selected ? Colors.primary : Colors.textSubtle}
      />
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          {icon && <Ionicons name={icon} size={18} color={Colors.foreground} />}
          <Text style={styles.cardLabel}>{label}</Text>
          {badge && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          )}
        </View>
        {detail && <Text style={styles.cardDetail}>{detail}</Text>}
      </View>
      {price && (
        <Text style={styles.price}>
          {price}
          <Text style={styles.period}>{period}</Text>
        </Text>
      )}
    </Pressable>
  );
}

export default PlansScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    minHeight: TouchTarget.min,
    marginTop: Spacing.md,
  },
  backText: {
    fontSize: 16,
    fontFamily: Typography.bodyMedium,
    color: Colors.primary,
  },
  header: {
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 28,
    fontFamily: Typography.heading,
    color: Colors.foreground,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Typography.body,
    color: Colors.textMuted,
    lineHeight: 22,
  },
  helper: {
    fontSize: 14,
    fontFamily: Typography.body,
    color: Colors.textMuted,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: Typography.bodyMedium,
    color: Colors.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  options: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Colors.inputBorder,
    padding: Spacing.md,
    minHeight: 72,
  },
  cardSelected: {
    borderColor: Colors.primary,
  },
  cardBody: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  cardLabel: {
    fontSize: 18,
    fontFamily: Typography.headingSemiBold,
    color: Colors.foreground,
  },
  badge: {
    backgroundColor: Colors.successBg,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: Typography.bodyBold,
    color: Colors.success,
  },
  cardDetail: {
    fontSize: 13,
    fontFamily: Typography.body,
    color: Colors.textMuted,
    marginTop: 2,
  },
  price: {
    fontSize: 20,
    fontFamily: Typography.heading,
    color: Colors.foreground,
  },
  period: {
    fontSize: 14,
    fontFamily: Typography.body,
    color: Colors.textMuted,
  },
  benefits: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  benefitText: {
    flex: 1,
    fontSize: 15,
    fontFamily: Typography.body,
    color: Colors.text,
  },
  footnote: {
    fontSize: 13,
    fontFamily: Typography.body,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
});
