import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { enabledReportTypes } from '@/constants/features';
import { createDefaultUsgContent } from '@/lib/usgContent';
import { useReportStore } from '@/stores/reportStore';

import type { ReportType } from '@/types/report';

export function HomeScreen() {
  const { t } = useTranslation('common');
  const { t: tr } = useTranslation('report');
  const reportTypes = enabledReportTypes();

  // Laudo novo começa com o estado limpo do tipo escolhido. Microscopia mantém o
  // comportamento de antes (abre direto o step 1), só limpando o store se o último
  // laudo aberto era de outro tipo — senão o step 1 gravaria no laudo errado.
  function handleNewReport(type: ReportType) {
    const store = useReportStore.getState();
    if (type === 'microscopia') {
      if (store.reportType !== 'microscopia') store.reset();
      router.push('/report/patient');
      return;
    }
    store.startReport(type, createDefaultUsgContent());
    router.push('/report-usg/patient');
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('title')}</Text>
        <Text style={styles.subtitle}>{t('subtitle')}</Text>
      </View>

      {/* Mobile (só microscopia): um botão, igual a antes. Web: um botão por tipo de laudo. */}
      {reportTypes.map((type) => (
        <TouchableOpacity
          key={type}
          style={styles.newReportButton}
          onPress={() => handleNewReport(type)}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          <Text style={styles.newReportIcon}>+</Text>
          <View style={styles.newReportLabels}>
            <Text style={styles.newReportText}>{t('newReport')}</Text>
            {reportTypes.length > 1 && (
              <Text style={styles.newReportSubtext}>{tr(`reportTypes.${type}`)}</Text>
            )}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.lg,
  },
  header: {
    marginTop: Spacing.xxl,
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontFamily: Typography.heading,
    color: Colors.foreground,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Typography.body,
    color: Colors.textMuted,
  },
  newReportButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: Spacing.md,
  },
  newReportLabels: {
    flex: 1,
  },
  newReportSubtext: {
    fontSize: 14,
    color: Colors.primaryForeground,
    fontFamily: Typography.body,
    opacity: 0.9,
    marginTop: 2,
  },
  newReportIcon: {
    fontSize: 28,
    color: Colors.primaryForeground,
    marginRight: Spacing.md,
    fontWeight: '300',
  },
  newReportText: {
    fontSize: 20,
    color: Colors.primaryForeground,
    fontFamily: Typography.headingSemiBold,
  },
});
