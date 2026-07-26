import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Colors, Typography, Spacing } from '@/constants/theme';

const TOTAL_STEPS = 6;

type StepIndicatorProps = {
  currentStep: number;
};

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  const { t } = useTranslation('report');

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {t('nav.step', { defaultValue: 'Passo {{current}} de {{total}}', current: currentStep, total: TOTAL_STEPS })}
      </Text>
      <View style={styles.dots}>
        {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((step) => (
          <View
            key={step}
            style={[
              styles.dot,
              step === currentStep && styles.dotActive,
              step < currentStep && styles.dotDone,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

export default StepIndicator;

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: 12,
    fontFamily: Typography.bodyMedium,
    color: Colors.textSubtle,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
  },
  dotDone: {
    backgroundColor: Colors.accent,
  },
  dotActive: {
    backgroundColor: Colors.primary,
  },
});
