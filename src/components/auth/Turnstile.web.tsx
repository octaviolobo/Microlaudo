import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Colors, Spacing, Typography } from '@/constants/theme';

import type { TurnstileProps } from './Turnstile';

export type { TurnstileProps } from './Turnstile';

// Cloudflare Turnstile no web. O token vai para o Supabase Auth (captchaToken),
// que valida com a secret key configurada em Authentication → Attack Protection.
// Sem EXPO_PUBLIC_TURNSTILE_SITE_KEY o widget não aparece e nenhum token é enviado.
const SITE_KEY = process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

export const CAPTCHA_ENABLED = Boolean(SITE_KEY);

type TurnstileApi = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SCRIPT_URL;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromise = null;
        script.remove();
        reject(new Error('Falha ao carregar o Turnstile'));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

export function Turnstile({ onToken, resetKey }: TurnstileProps) {
  const { t } = useTranslation('common');
  const containerRef = useRef<View>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!SITE_KEY) return;
    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        // No react-native-web, o ref de uma View é o elemento DOM.
        const el = containerRef.current as unknown as HTMLElement | null;
        if (cancelled || !el || !window.turnstile) return;
        widgetIdRef.current = window.turnstile.render(el, {
          sitekey: SITE_KEY,
          theme: 'light',
          callback: (token: string) => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(null),
          'error-callback': () => onTokenRef.current(null),
        });
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
        onTokenRef.current(null);
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current) window.turnstile?.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    };
  }, []);

  // Token é de uso único: a tela incrementa resetKey depois de cada tentativa.
  useEffect(() => {
    if (resetKey === 0 || !widgetIdRef.current) return;
    onTokenRef.current(null);
    window.turnstile?.reset(widgetIdRef.current);
  }, [resetKey]);

  if (!SITE_KEY) return null;

  return (
    <View style={styles.wrapper}>
      <View ref={containerRef} />
      {loadFailed && <Text style={styles.error}>{t('auth.captchaLoadFailed')}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'center',
    minHeight: 65,
    marginVertical: Spacing.sm,
  },
  error: {
    fontSize: 13,
    fontFamily: Typography.body,
    color: Colors.error,
    textAlign: 'center',
  },
});
