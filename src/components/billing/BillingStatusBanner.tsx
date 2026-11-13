import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';


import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { formatDateBR, isoToday } from '@/lib/date';
import { trialRemaining } from '@/stores/subscriptionStore';

import type { TFunction } from 'i18next';
import type { BillingStatus } from '@/types/subscription';

type Tone = 'success' | 'info' | 'warning';

// Timestamp do servidor → "DD-MM-AAAA" no fuso do aparelho.
function formatPeriodEnd(timestamp: string | null): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? '' : formatDateBR(isoToday(date));
}

export function describeBilling(billing: BillingStatus, t: TFunction): { message: string; tone: Tone } {
  const plan = billing.plan ? t(billing.plan === 'annual' ? 'billing.planAnnual' : 'billing.planMonthly') : '';
  const date = formatPeriodEnd(billing.currentPeriodEnd);

  if (billing.hasActiveSubscription) {
    if (!billing.currentPeriodEnd) return { message: t('billing.courtesy'), tone: 'success' };
    if (billing.status === 'past_due') return { message: t('billing.pastDue', { date }), tone: 'warning' };
    if (billing.status === 'canceled') return { message: t('billing.canceledUntil', { plan, date }), tone: 'warning' };
    return { message: t('billing.activeUntil', { plan, date }), tone: 'success' };
  }

  if (billing.status === 'pending') return { message: t('billing.pendingShort'), tone: 'info' };

  const remaining = trialRemaining(billing);
  if (remaining > 0) return { message: t('billing.trialRemaining', { count: remaining }), tone: 'info' };
  return { message: t('billing.trialExhausted'), tone: 'warning' };
}

const TONES: Record<Tone, { bg: string; fg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  success: { bg: Colors.successBg, fg: Colors.success, icon: 'checkmark-circle-outline' },
  info: { bg: Colors.surfaceMuted, fg: Colors.foreground, icon: 'gift-outline' },
  warning: { bg: Colors.warningBg, fg: Colors.warning, icon: 'lock-closed-outline' },
};

type Props = {
  billing: BillingStatus;
  // Mostra o link "Ver planos" (desligado dentro da própria tela de planos).
  showPlansLink?: boolean;
};

export function BillingStatusBanner({ billing, showPlansLink = true }: Props) {
  const { t } = useTranslation('common');
  const { message, tone } = describeBilling(billing, t);
  const { bg, fg, icon } = TONES[tone];
  const linkVisible = showPlansLink && !billing.hasActiveSubscription;

  return (
    <View style={[styles.container, { backgroundColor: bg }]} accessibilityRole="summary">
      <Ionicons name={icon} size={18} color={fg} style={styles.icon} />
      <View style={styles.body}>
        <Text style={[styles.message, { color: fg }]}>{message}</Text>
        {linkVisible && (
          <Pressable onPress={() => router.push('/plans')} accessibilityRole="link" hitSlop={8}>
            <Text style={[styles.link, { color: fg }]}>{t('billing.viewPlans')} →</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  icon: {
    marginRight: Spacing.sm,
    marginTop: 1,
  },
  body: {
    flex: 1,
    gap: Spacing.xs,
  },
  message: {
    fontSize: 14,
    fontFamily: Typography.bodyMedium,
    lineHeight: 20,
  },
  link: {
    fontSize: 14,
    fontFamily: Typography.bodyBold,
    textDecorationLine: 'underline',
  },
});
