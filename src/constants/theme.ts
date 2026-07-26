// Design System MicroLaudo — gerado via ui-ux-pro-max skill
// Estilo: Accessible & Ethical (WCAG AAA) — Healthcare
// NUNCA usar hex hardcoded nos componentes — sempre importar daqui

export const Colors = {
  // ─── Core ────────────────────────────────────────────────
  primary: '#0891B2',         // Cyan médico
  primaryForeground: '#FFFFFF',
  secondary: '#22D3EE',
  accent: '#059669',          // Verde CTA (finalizar, sucesso)
  accentForeground: '#FFFFFF',

  // ─── Superfícies ─────────────────────────────────────────
  background: '#ECFEFF',      // Fundo de telas
  surface: '#FFFFFF',         // Cards, inputs, modals
  surfaceMuted: '#E8F1F6',    // Fundo de seções secundárias

  // ─── Texto ───────────────────────────────────────────────
  foreground: '#164E63',      // Títulos e headings
  text: '#1E293B',            // Corpo de texto
  textMuted: '#64748B',       // Texto secundário
  textSubtle: '#94A3B8',      // Placeholders, step labels

  // ─── Bordas ──────────────────────────────────────────────
  border: '#A5F3FC',          // Separadores suaves, tab bar
  inputBorder: '#CBD5E1',     // Bordas de inputs (neutro para clareza clínica)
  inputBorderFocus: '#0891B2',

  // ─── Feedback ────────────────────────────────────────────
  error: '#DC2626',
  errorBg: '#FEF2F2',
  success: '#059669',
  successBg: '#F0FDF4',
  warning: '#D97706',
  warningBg: '#FFFBEB',

  // ─── Navegação ───────────────────────────────────────────
  tabActive: '#0891B2',
  tabInactive: '#94A3B8',
  tabBorder: '#A5F3FC',
  headerBg: '#0891B2',
  headerText: '#FFFFFF',
} as const;

export const Typography = {
  heading: 'Figtree_700Bold',
  headingSemiBold: 'Figtree_600SemiBold',
  headingMedium: 'Figtree_500Medium',
  body: 'NotoSans_400Regular',
  bodyMedium: 'NotoSans_500Medium',
  bodyBold: 'NotoSans_700Bold',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  errorPadding: 10,
} as const;

export const Radius = {
  sm: 8,
  md: 10,
  lg: 16,
  full: 999,
} as const;

// Tamanhos mínimos de toque — WCAG + Apple HIG (44×44pt)
export const TouchTarget = {
  min: 44,
} as const;
