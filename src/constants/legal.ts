// Páginas públicas geradas de docs/legal/*.md por scripts/build-legal.js
// (servidas pelo Cloudflare Pages, sem login).
const SITE = 'https://microlaudo.com';

export const LEGAL_PAGES = {
  terms: '/termos',
  privacy: '/privacidade',
} as const;

export type LegalPage = keyof typeof LEGAL_PAGES;

export function legalPageUrl(page: LegalPage): string {
  return `${SITE}${LEGAL_PAGES[page]}`;
}
