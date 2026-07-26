import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Colors, Typography, Spacing } from '@/constants/theme';

export function NotFoundScreen() {
  const { t } = useTranslation('common');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('notFound')}</Text>
      <Link href="/(tabs)/home" style={styles.link}>
        {t('backToHome')}
      </Link>
    </View>
  );
}

export default NotFoundScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 20,
    fontFamily: Typography.heading,
    color: Colors.foreground,
    marginBottom: Spacing.md,
  },
  link: {
    color: Colors.primary,
    fontSize: 16,
    fontFamily: Typography.bodyMedium,
  },
});
