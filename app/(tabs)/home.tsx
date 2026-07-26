import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Colors, Typography, Spacing, Radius } from '@/constants/theme';

export function HomeScreen() {
  const { t } = useTranslation('common');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('title')}</Text>
        <Text style={styles.subtitle}>{t('subtitle')}</Text>
      </View>

      <TouchableOpacity
        style={styles.newReportButton}
        onPress={() => router.push('/report/patient')}
        activeOpacity={0.85}
      >
        <Text style={styles.newReportIcon}>+</Text>
        <Text style={styles.newReportText}>{t('newReport')}</Text>
      </TouchableOpacity>
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
