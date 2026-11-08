// Native: sem captcha. O lançamento é só web; ligar o CAPTCHA no Supabase Auth
// passa a exigir token em login/cadastro/reset também no app nativo — antes de
// publicar builds nativos, implementar o widget numa WebView (ver
// docs/deploy-cloudflare.md, seção Turnstile).
export const CAPTCHA_ENABLED = false;

export type TurnstileProps = {
  onToken: (token: string | null) => void;
  resetKey: number;
};

export function Turnstile(_props: TurnstileProps) {
  return null;
}
