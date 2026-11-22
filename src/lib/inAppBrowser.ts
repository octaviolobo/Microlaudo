// Detecta o navegador interno de apps sociais (Instagram, Facebook, TikTok...).
// Quem chega pelo link da bio abre o site dentro do app, e ali o login com
// Google pode ser bloqueado (403 disallowed_useragent), a sessão não fica salva
// no Safari/Chrome e baixar o PDF ou anexar fotos costuma falhar.

export type InAppBrowserApp = 'instagram' | 'facebook' | 'tiktok' | 'linkedin';
export type MobileOS = 'ios' | 'android' | 'other';

const APP_PATTERNS: [InAppBrowserApp, RegExp][] = [
  ['instagram', /Instagram/i],
  // FBAN/FBAV: app do Facebook; FB_IAB: navegador interno do Facebook/Messenger.
  ['facebook', /FBAN|FBAV|FB_IAB|FBIOS|Messenger/i],
  ['tiktok', /musical_ly|BytedanceWebview|TikTok/i],
  ['linkedin', /LinkedInApp/i],
];

export function detectInAppBrowser(userAgent: string): InAppBrowserApp | null {
  for (const [app, pattern] of APP_PATTERNS) {
    if (pattern.test(userAgent)) return app;
  }
  return null;
}

export function detectMobileOS(userAgent: string): MobileOS {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios';
  if (/Android/i.test(userAgent)) return 'android';
  return 'other';
}

// Link que tenta tirar a pessoa do navegador interno:
// - Android: intent:// abre o Chrome (com volta para o navegador padrão se o
//   Chrome não estiver instalado). Funciona no Instagram e no Facebook.
// - iOS: x-safari-https:// abre o Safari no iOS 17+, mas não é oficial e alguns
//   apps ignoram — por isso a tela sempre mostra também o passo a passo.
export function buildExternalBrowserUrl(url: string, os: MobileOS): string | null {
  const parsed = new URL(url);
  if (os === 'android') {
    const fallback = encodeURIComponent(url);
    return `intent://${parsed.host}${parsed.pathname}${parsed.search}#Intent;scheme=${parsed.protocol.replace(':', '')};package=com.android.chrome;S.browser_fallback_url=${fallback};end`;
  }
  if (os === 'ios') {
    return `x-safari-${url}`;
  }
  return null;
}
