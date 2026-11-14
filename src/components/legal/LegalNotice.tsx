import { Fragment } from 'react';
import { Platform, StyleSheet, Text } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';

import { LEGAL_PAGES, legalPageUrl, type LegalPage } from '@/constants/legal';
import { Colors, Spacing, Typography } from '@/constants/theme';

// Web: nova aba no mesmo domínio, para não perder o formulário preenchido.
// Nativo: navegador do sistema por cima do app.
export async function openLegalPage(page: LegalPage): Promise<void> {
  if (Platform.OS === 'web') {
    window.open(LEGAL_PAGES[page], '_blank', 'noopener');
    return;
  }
  await WebBrowser.openBrowserAsync(legalPageUrl(page));
}

type Props = {
  // Frase com os links: cadastro, login social, assinatura ou só os links (perfil).
  context: 'register' | 'social' | 'subscribe' | 'standalone';
};

// As traduções marcam onde entra cada link com [terms] e [privacy].
const PLACEHOLDER = /(\[terms\]|\[privacy\])/;

export function LegalNotice({ context }: Props) {
  const { t } = useTranslation('common');

  const parts = t(`legal.notice.${context}`).split(PLACEHOLDER);

  return (
    <Text style={[styles.text, context === 'standalone' && styles.standalone]}>
      {parts.map((part, i) => {
        if (part === '[terms]' || part === '[privacy]') {
          const page: LegalPage = part === '[terms]' ? 'terms' : 'privacy';
          return (
            <Text
              key={i}
              style={styles.link}
              onPress={() => openLegalPage(page)}
              accessibilityRole="link"
              accessibilityHint={t('legal.opensInBrowser')}
            >
              {t(page === 'terms' ? 'legal.termsOfUse' : 'legal.privacyPolicy')}
            </Text>
          );
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
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
