import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { buildExternalBrowserUrl, detectInAppBrowser, detectMobileOS } from '@/lib/inAppBrowser';

import type { InAppBrowserApp, MobileOS } from '@/lib/inAppBrowser';

const APP_NAMES: Record<InAppBrowserApp, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
};

// Aviso para quem abriu o site pelo navegador interno do Instagram/Facebook/etc.
// Só existe no web. A detecção roda depois da montagem porque a página é
// pré-renderizada no build (output "static"), onde não há navigator.
export function InAppBrowserNotice() {
  const { t } = useTranslation('common');
  const [context, setContext] = useState<{ app: InAppBrowserApp; os: MobileOS } | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined') return;
    const app = detectInAppBrowser(navigator.userAgent);
    if (app) setContext({ app, os: detectMobileOS(navigator.userAgent) });
  }, []);

  if (!context) return null;

  const externalUrl = buildExternalBrowserUrl(window.location.href, context.os);

  return (
    <View style={styles.container} accessibilityRole="alert">
      <View style={styles.header}>
        <Ionicons name="open-outline" size={20} color={Colors.primary} style={styles.icon} />
        <Text style={styles.title}>{t('auth.inAppBrowser.title')}</Text>
      </View>
      <Text style={styles.body}>{t('auth.inAppBrowser.body', { app: APP_NAMES[context.app] })}</Text>
      {externalUrl && (
        <Button
          label={context.os === 'ios' ? t('auth.inAppBrowser.openSafari') : t('auth.inAppBrowser.openChrome')}
          onPress={() => window.location.assign(externalUrl)}
          icon={context.os === 'ios' ? 'compass-outline' : 'logo-chrome'}
          fullWidth
        />
      )}
      <Text style={styles.steps}>{t('auth.inAppBrowser.steps')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  icon: {
    marginRight: Spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontFamily: Typography.headingSemiBold,
    color: Colors.foreground,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Typography.body,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  steps: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
});
