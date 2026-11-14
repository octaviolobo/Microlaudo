import { Platform, StyleSheet, Text } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';

import { PRIVACY_POLICY_PATH, PRIVACY_POLICY_URL } from '@/constants/legal';
import { Colors, Spacing, Typography } from '@/constants/theme';

// Web: nova aba no mesmo domínio, para não perder o formulário preenchido.
// Nativo: navegador do sistema por cima do app.
export async function openPrivacyPolicy(): Promise<void> {
  if (Platform.OS === 'web') {
    window.open(PRIVACY_POLICY_PATH, '_blank', 'noopener');
    return;
  }
  await WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL);
}

type Props = {
  // Frase que antecede o link: cadastro, login social, assinatura ou só o link.
  context: 'register' | 'social' | 'subscribe' | 'standalone';
};

export function PrivacyNotice({ context }: Props) {
  const { t } = useTranslation('common');
  const link = (
    <Text
      style={styles.link}
      onPress={openPrivacyPolicy}
      accessibilityRole="link"
      accessibilityHint={t('legal.opensInBrowser')}
    >
      {t('legal.privacyPolicy')}
    </Text>
  );

  if (context === 'standalone') {
    return <Text style={[styles.text, styles.standalone]}>{link}</Text>;
  }

  return (
    <Text style={styles.text}>
      {t(`legal.notice.${context}`)} {link}.
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: Typography.body,
    color: Colors.textMuted,
    textAlign: 'center',
    marginVertical: Spacing.sm,
  },
  standalone: {
    fontSize: 14,
  },
  link: {
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
});
