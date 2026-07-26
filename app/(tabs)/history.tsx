import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Colors, Typography, Spacing } from '@/constants/theme';

export function HistoryScreen() {
  const { t } = useTranslation('report');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('tabs.history')}</Text>
      <Text style={styles.placeholder}>{t('noResults')}</Text>
      {/* Lista de laudos implementada em F23 */}
    </View>
  );
}

export default HistoryScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.lg,
  },
  title: {
    fontSize: 26,
    fontFamily: Typography.heading,
    color: Colors.foreground,
    marginTop: Spacing.xxl,
    marginBottom: Spacing.lg,
  },
  placeholder: {
    fontSize: 15,
    fontFamily: Typography.body,
    color: Colors.textSubtle,
    textAlign: 'center',
    marginTop: 60,
  },
});
