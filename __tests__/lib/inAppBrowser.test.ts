import { describe, expect, it } from '@jest/globals';

import { buildExternalBrowserUrl, detectInAppBrowser, detectMobileOS } from '@/lib/inAppBrowser';

const UA = {
  instagramIOS:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 330.0.0.0 (iPhone15,2; iOS 17_5; pt_BR; pt; scale=3.00; 1179x2556)',
  instagramAndroid:
    'Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0 Mobile Safari/537.36 Instagram 330.0.0.0 Android',
  facebookIOS:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/470.0.0;FBBV/1;FBDV/iPhone15,2;FBMD/iPhone;FBSN/iOS;FBSV/17.5;FBSS/3;FBLC/pt_BR]',
  safariIOS:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  chromeDesktop:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36',
};

describe('detectInAppBrowser', () => {
  it('reconhece Instagram e Facebook', () => {
    expect(detectInAppBrowser(UA.instagramIOS)).toBe('instagram');
    expect(detectInAppBrowser(UA.instagramAndroid)).toBe('instagram');
    expect(detectInAppBrowser(UA.facebookIOS)).toBe('facebook');
  });

  it('não marca navegadores normais', () => {
    expect(detectInAppBrowser(UA.safariIOS)).toBeNull();
    expect(detectInAppBrowser(UA.chromeDesktop)).toBeNull();
  });
});

describe('detectMobileOS', () => {
  it('separa iOS, Android e o resto', () => {
    expect(detectMobileOS(UA.instagramIOS)).toBe('ios');
    expect(detectMobileOS(UA.instagramAndroid)).toBe('android');
    expect(detectMobileOS(UA.chromeDesktop)).toBe('other');
  });
});

describe('buildExternalBrowserUrl', () => {
  it('Android abre o Chrome por intent, com fallback', () => {
    expect(buildExternalBrowserUrl('https://microlaudo.com/login?x=1', 'android')).toBe(
      'intent://microlaudo.com/login?x=1#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=https%3A%2F%2Fmicrolaudo.com%2Flogin%3Fx%3D1;end',
    );
  });

  it('iOS usa o esquema do Safari', () => {
    expect(buildExternalBrowserUrl('https://microlaudo.com/login', 'ios')).toBe('x-safari-https://microlaudo.com/login');
  });

  it('desktop não tem link', () => {
    expect(buildExternalBrowserUrl('https://microlaudo.com/login', 'other')).toBeNull();
  });
});
