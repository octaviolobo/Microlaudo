import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTranslation } from 'react-i18next';

import { Colors, Spacing, Typography } from '@/constants/theme';

import type { WebViewMessageEvent } from 'react-native-webview';

// Cloudflare Turnstile no app nativo: o mesmo widget do web, rodando numa WebView.
// O HTML é carregado com baseUrl https://microlaudo.com para que o Turnstile veja
// o hostname cadastrado no widget (Cloudflare → Turnstile → Hostnames). O token
// volta por postMessage e segue para o Supabase Auth como no web.
// Sem EXPO_PUBLIC_TURNSTILE_SITE_KEY o widget não aparece e nenhum token é enviado.
const SITE_KEY = process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY;
const BASE_URL = 'https://microlaudo.com';

export const CAPTCHA_ENABLED = Boolean(SITE_KEY);

export type TurnstileProps = {
  onToken: (token: string | null) => void;
  resetKey: number;
};

// Altura do widget do Turnstile (tamanho "normal": 300×65) com folga.
const WIDGET_HEIGHT = 70;

type WidgetMessage =
  | { type: 'token'; token: string }
  | { type: 'expired' | 'load-error' }
  | { type: 'error'; code?: string }
  | { type: 'interactive'; visible: boolean };

function buildHtml(siteKey: string): string {
  return `<!doctype html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>html,body{margin:0;padding:0;background:transparent;display:flex;justify-content:center}</style>
<script>
  function send(msg) { window.ReactNativeWebView.postMessage(JSON.stringify(msg)); }
  window.onTurnstileLoad = function () {
    window.widgetId = turnstile.render('#cf', {
      sitekey: ${JSON.stringify(siteKey)},
      theme: 'light',
      // Sempre visível no app: no iOS a WebView não redimensiona de forma confiável
      // quando o desafio aparece, e no WKWebView o Cloudflare costuma pedir o clique.
      appearance: 'always',
      callback: function (token) { send({ type: 'token', token: token }); },
      'expired-callback': function () { send({ type: 'expired' }); },
      'error-callback': function (code) { send({ type: 'error', code: String(code) }); },
      'before-interactive-callback': function () { send({ type: 'interactive', visible: true }); },
      'after-interactive-callback': function () { send({ type: 'interactive', visible: false }); }
    });
  };
  window.resetWidget = function () {
    if (window.turnstile && window.widgetId !== undefined) turnstile.reset(window.widgetId);
  };
</script>
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit"
  async defer onerror="send({ type: 'load-error' })"></script>
</head><body><div id="cf"></div></body></html>`;
}

export function Turnstile({ onToken, resetKey }: TurnstileProps) {
  const { t } = useTranslation('common');
  const webViewRef = useRef<WebView>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;
  const [loadFailed, setLoadFailed] = useState(false);

  const source = useMemo(() => (SITE_KEY ? { html: buildHtml(SITE_KEY), baseUrl: BASE_URL } : null), []);

  // Token é de uso único: a tela incrementa resetKey depois de cada tentativa.
  useEffect(() => {
    if (resetKey === 0) return;
    onTokenRef.current(null);
    webViewRef.current?.injectJavaScript('window.resetWidget(); true;');
  }, [resetKey]);

  if (!source) return null;

  function handleMessage(event: WebViewMessageEvent) {
    let msg: WidgetMessage;
    try {
      msg = JSON.parse(event.nativeEvent.data) as WidgetMessage;
    } catch {
      return;
    }
    switch (msg.type) {
      case 'token':
        setLoadFailed(false);
        onTokenRef.current(msg.token);
        break;
      case 'interactive':
        return;
      case 'load-error':
        setLoadFailed(true);
        onTokenRef.current(null);
        break;
      default:
        onTokenRef.current(null);
    }
  }

  return (
    <View style={styles.wrapper}>
      <WebView
        ref={webViewRef}
        source={source}
        originWhitelist={['*']}
        onMessage={handleMessage}
        onError={() => setLoadFailed(true)}
        javaScriptEnabled
        scrollEnabled={false}
        // O tamanho vai no containerStyle: o contêiner interno da WebView tem flex: 1
        // e, num formulário sem altura definida, ficaria com 0px.
        containerStyle={styles.webViewContainer}
        style={styles.webView}
        // A página principal não deve navegar para fora (links do Cloudflare de
        // privacidade/termos ficam bloqueados). O iframe do desafio é liberado.
        onShouldStartLoadWithRequest={(req) =>
          req.isTopFrame === false ||
          req.url.startsWith(BASE_URL) ||
          req.url.startsWith('https://challenges.cloudflare.com') ||
          req.url === 'about:blank'
        }
      />
      {loadFailed && <Text style={styles.error}>{t('auth.captchaLoadFailedNative')}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  webViewContainer: {
    flex: 0,
    width: 300,
    height: WIDGET_HEIGHT,
    marginBottom: Spacing.sm,
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  error: {
    fontSize: 13,
    fontFamily: Typography.body,
    color: Colors.error,
    textAlign: 'center',
    marginVertical: Spacing.sm,
  },
});
