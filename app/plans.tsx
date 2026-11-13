import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { BillingStatusBanner } from '@/components/billing/BillingStatusBanner';
import { Button, Input, MessageBox } from '@/components/ui';
import {
  BILLING_CHECKOUT_ENABLED,
  BILLING_CONTACT_EMAIL,
  PLAN_PRICES_CENTS,
  TRIAL_REPORT_LIMIT,
  annualDiscountPercent,
  annualMonthlyEquivalentCents,
} from '@/constants/plans';
import { Colors, Radius, Spacing, Typography, TouchTarget } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { AppError } from '@/lib/errors';
import { formatCentsBRL } from '@/lib/format';
import { isValidCpfCnpj } from '@/lib/validation';
import { openInvoice, startCheckout } from '@/services/billing';
import { useSubscriptionStore } from '@/stores/subscriptionStore';

import type { PaymentMethod, Plan } from '@/types/subscription';

const BENEFITS = ['benefitUnlimited', 'benefitPdf', 'benefitHistory', 'benefitCancel'] as const;

// Motivo devolvido pela Edge Function → chave de texto.
const CHECKOUT_ERRORS: Record<string, string> = {
  invalid_document: 'billing.documentInvalid',
  already_subscribed: 'billing.alreadySubscribed',
  gateway_rejected: 'billing.gatewayRejected',
};

// Tela de planos. Abre de quatro jeitos:
//  - pelo paywall ao finalizar (?reason=paywall) → mostra o aviso no topo;
//  - pelo Perfil / aviso da Home;
//  - na volta do Asaas depois de pagar (?checkout=done, se ASAAS_CALLBACK_URL estiver configurado);
//  - deslogado (link público) → preços + "Criar conta e testar grátis".
export function PlansScreen() {
  const { t } = useTranslation('common');
  const { reason, checkout } = useLocalSearchParams<{ reason?: string; checkout?: string }>();
  const { isAuthenticated } = useAuth();
  const billing = useSubscriptionStore((s) => s.billing);
  const refresh = useSubscriptionStore((s) => s.refresh);

  const [selected, setSelected] = useState<Plan>('annual');
  const [method, setMethod] = useState<PaymentMethod>('card');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  const planLabel = (plan: Plan) => t(plan === 'annual' ? 'billing.planAnnual' : 'billing.planMonthly');

  function handleBack() {
    if (router.canGoBack()) router.back();
    else router.replace(isAuthenticated ? '/(tabs)/home' : '/(auth)/login');
  }

  async function handleSubscribe() {
    if (!isAuthenticated) {
      router.push('/(auth)/register');
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

  const showCheckoutForm = isAuthenticated && BILLING_CHECKOUT_ENABLED && !isSubscriber;

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
      {isPending && <Text style={styles.helper}>{t('billing.pendingBody')}</Text>}

      <View style={styles.options} accessibilityRole="radiogroup">
        <OptionCard
          label={planLabel('annual')}
          price={formatCentsBRL(PLAN_PRICES_CENTS.annual)}
          period={t('billing.perYear')}
          detail={t('billing.annualEquivalent', { price: formatCentsBRL(annualMonthlyEquivalentCents()) })}
          badge={t('billing.annualBadge', { percent: annualDiscountPercent() })}
          selected={selected === 'annual'}
          onSelect={() => setSelected('annual')}
        />
        <OptionCard
          label={planLabel('monthly')}
          price={formatCentsBRL(PLAN_PRICES_CENTS.monthly)}
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
        </>
      )}

      {notice && <MessageBox message={notice} type="info" />}
      {error && <MessageBox message={error} type="error" />}

      {isSubscriber ? (
        <MessageBox message={t('billing.alreadySubscribed')} type="success" />
      ) : (
        <Button
          label={
            !isAuthenticated
              ? t('billing.createAccount')
              : isSubmitting
                ? t('billing.redirecting')
                : isPending && BILLING_CHECKOUT_ENABLED
                  ? t('billing.newInvoice')
                  : t('billing.subscribe', { plan: planLabel(selected) })
          }
          onPress={handleSubscribe}
          loading={isSubmitting}
          disabled={isSubmitting}
          size="lg"
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
