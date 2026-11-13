export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const ErrorCodes = {
  // Auth
  AUTH_LOGIN_FAILED: 'AUTH_LOGIN_FAILED',
  AUTH_REGISTER_FAILED: 'AUTH_REGISTER_FAILED',
  AUTH_SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
  AUTH_LOGOUT_FAILED: 'AUTH_LOGOUT_FAILED',
  AUTH_WEAK_PASSWORD: 'AUTH_WEAK_PASSWORD',
  AUTH_CAPTCHA_FAILED: 'AUTH_CAPTCHA_FAILED',
  AUTH_EMAIL_IN_USE: 'AUTH_EMAIL_IN_USE',
  AUTH_RECOVERY_INVALID: 'AUTH_RECOVERY_INVALID',
  AUTH_PASSWORD_UPDATE_FAILED: 'AUTH_PASSWORD_UPDATE_FAILED',
  ACCOUNT_DELETE_FAILED: 'ACCOUNT_DELETE_FAILED',
  // Report
  REPORT_CREATE_FAILED: 'REPORT_CREATE_FAILED',
  REPORT_UPDATE_FAILED: 'REPORT_UPDATE_FAILED',
  REPORT_NOT_FOUND: 'REPORT_NOT_FOUND',
  REPORT_LIST_FAILED: 'REPORT_LIST_FAILED',
  // Trial / assinatura
  TRIAL_LIMIT_REACHED: 'TRIAL_LIMIT_REACHED',
  // Finalizar bloqueado pelo servidor: sem teste grátis e sem assinatura (migration 015)
  PAYWALL_REQUIRED: 'PAYWALL_REQUIRED',
  BILLING_STATUS_FAILED: 'BILLING_STATUS_FAILED',
  BILLING_CHECKOUT_FAILED: 'BILLING_CHECKOUT_FAILED',
  BILLING_CANCEL_FAILED: 'BILLING_CANCEL_FAILED',
  // Profile
  PROFILE_NOT_FOUND: 'PROFILE_NOT_FOUND',
  PROFILE_UPDATE_FAILED: 'PROFILE_UPDATE_FAILED',
  // Storage
  IMAGE_UPLOAD_FAILED: 'IMAGE_UPLOAD_FAILED',
  IMAGE_DOWNLOAD_FAILED: 'IMAGE_DOWNLOAD_FAILED',
  PDF_GENERATION_FAILED: 'PDF_GENERATION_FAILED',
  PDF_UPLOAD_FAILED: 'PDF_UPLOAD_FAILED',
  PDF_DOWNLOAD_FAILED: 'PDF_DOWNLOAD_FAILED',
  // Validação de input (client-side, antes de chamar o servidor)
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  // ProDoctor (autofill de paciente) — nunca deve bloquear o preenchimento
  // manual, então em geral é apenas logado (ver src/services/prodoctor.ts)
  PRODOCTOR_SEARCH_FAILED: 'PRODOCTOR_SEARCH_FAILED',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
