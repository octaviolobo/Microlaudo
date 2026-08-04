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
  ACCOUNT_DELETE_FAILED: 'ACCOUNT_DELETE_FAILED',
  // Report
  REPORT_CREATE_FAILED: 'REPORT_CREATE_FAILED',
  REPORT_UPDATE_FAILED: 'REPORT_UPDATE_FAILED',
  REPORT_NOT_FOUND: 'REPORT_NOT_FOUND',
  REPORT_LIST_FAILED: 'REPORT_LIST_FAILED',
  // Trial
  TRIAL_LIMIT_REACHED: 'TRIAL_LIMIT_REACHED',
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
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
