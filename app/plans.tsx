import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { BillingStatusBanner } from '@/components/billing/BillingStatusBanner';
import { Button, MessageBox } from '@/components/ui';
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
import { formatCentsBRL } from '@/lib/format';
import { useSubscriptionStore } from '@/stores/subscriptionStore';

import type { Plan } from '@/types/subscription';

const BENEFITS = ['benefitUnlimited', 'benefitPdf', 'benefitHistory', 'benefitCancel'] as const;

// Tela de planos. Abre de três jeitos:
//  - pelo paywall ao finalizar (?reason=paywall) → mostra o aviso no topo;
//  - pelo Perfil / aviso da Home;
//  - deslogado (link público) → preços + "Criar conta e testar grátis".
export function PlansScreen() {
  const { t } = useTranslation('common');
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  const { isAuthenticated } = useAuth();
  const billing = useSubscriptionStore((s) => s.billing);
  const refresh = useSubscriptionStore((s) => s.refresh);

  const [selected, setSelected] = useState<Plan>('annual');
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) void refresh();
  }, [isAuthenticated, refresh]);

  const isSubscriber = billing?.hasActiveSubscription === true;
  const planLabel = (plan: Plan) => t(plan === 'annual' ? 'billing.planAnnual' : 'billing.planMonthly');

  function handleBack() {
    if (router.canGoBack()) router.back();
    else router.replace(isAuthenticated ? '/(tabs)/home' : '/(auth)/login');
  }

  function handleSubscribe() {
    if (!isAuthenticated) {
      router.push('/(auth)/register');
      return;
    }
    if (!BILLING_CHECKOUT_ENABLED) {
      setNotice(t('billing.comingSoon', { email: BILLING_CONTACT_EMAIL }));
      return;
    }
    // Checkout do gateway entra aqui (Edge Function billing-checkout).
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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

      {billing && <BillingStatusBanner billing={billing} showPlansLink={false} />}

      <View style={styles.plans} accessibilityRole="radiogroup">
        <PlanCard
          plan="annual"
          label={planLabel('annual')}
          price={formatCentsBRL(PLAN_PRICES_CENTS.annual)}
          period={t('billing.perYear')}
          detail={t('billing.annualEquivalent', { price: formatCentsBRL(annualMonthlyEquivalentCents()) })}
          badge={t('billing.annualBadge', { percent: annualDiscountPercent() })}
          selected={selected === 'annual'}
          onSelect={setSelected}
        />
        <PlanCard
          plan="monthly"
          label={planLabel('monthly')}
          price={formatCentsBRL(PLAN_PRICES_CENTS.monthly)}
          period={t('billing.perMonth')}
          selected={selected === 'monthly'}
          onSelect={setSelected}
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

      {notice && <MessageBox message={notice} type="info" />}

      {isSubscriber ? (
        <MessageBox message={t('billing.alreadySubscribed')} type="success" />
      ) : (
        <Button
          label={isAuthenticated ? t('billing.subscribe', { plan: planLabel(selected) }) : t('billing.createAccount')}
          onPress={handleSubscribe}
          size="lg"
          fullWidth
        />
      )}

      {!isAuthenticated && (
        <Text style={styles.footnote}>
          {t('billing.trialInfo', { count: TRIAL_REPORT_LIMIT })}
        </Text>
      )}
    </ScrollView>
  );
}

type PlanCardProps = {
  plan: Plan;
  label: string;
  price: string;
  period: string;
  detail?: string;
  badge?: string;
  selected: boolean;
  onSelect: (plan: Plan) => void;
};

function PlanCard({ plan, label, price, period, detail, badge, selected, onSelect }: PlanCardProps) {
  return (
    <Pressable
      onPress={() => onSelect(plan)}
      style={[styles.card, selected && styles.cardSelected]}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${label}, ${price}${period}`}
    >
      <Ionicons
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        size={22}
        color={selected ? Colors.primary : Colors.textSubtle}
      />
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardLabel}>{label}</Text>
          {badge && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          )}
        </View>
        {detail && <Text style={styles.cardDetail}>{detail}</Text>}
      </View>
      <Text style={styles.price}>
        {price}
        <Text style={styles.period}>{period}</Text>
      </Text>
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
  plans: {
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
