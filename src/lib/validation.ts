import { AppError, ErrorCodes } from './errors';

// Limites mencionados em docs/analise-seguranca.md (#2 — Injection via campos de texto
// livre) mas nunca implementados (ver docs/PROGRESSO.md, dívida técnica de F08/F09).
export const PATIENT_NAME_MAX_LENGTH = 200;
export const REQUESTING_DOCTOR_MAX_LENGTH = 200;
export const LONG_TEXT_MAX_LENGTH = 5000; // conclusão, descrição microscópica, referência bibliográfica

export const CRM_MIN_LENGTH = 4;
export const CRM_MAX_LENGTH = 20;

export function validatePatientName(name: string | null | undefined): void {
  if (!name || !name.trim()) {
    throw new AppError(ErrorCodes.VALIDATION_FAILED, 'Nome do paciente é obrigatório');
  }
  if (name.length > PATIENT_NAME_MAX_LENGTH) {
    throw new AppError(
      ErrorCodes.VALIDATION_FAILED,
      `Nome do paciente excede o limite de ${PATIENT_NAME_MAX_LENGTH} caracteres`,
    );
  }
}

export function validateRequestingDoctor(value: string | null | undefined): void {
  if (value && value.length > REQUESTING_DOCTOR_MAX_LENGTH) {
    throw new AppError(
      ErrorCodes.VALIDATION_FAILED,
      `Nome do médico solicitante excede o limite de ${REQUESTING_DOCTOR_MAX_LENGTH} caracteres`,
    );
  }
}

export function validateLongText(value: string | null | undefined, fieldName: string): void {
  if (value && value.length > LONG_TEXT_MAX_LENGTH) {
    throw new AppError(
      ErrorCodes.VALIDATION_FAILED,
      `${fieldName} excede o limite de ${LONG_TEXT_MAX_LENGTH} caracteres`,
    );
  }
}

// CRM não tem um formato único nacional (varia por conselho regional), então a validação
// fica deliberadamente permissiva: exige que pareça um registro (contém dígito) e tem um
// tamanho plausível — evita strings vazias ou lixo digitado por engano, sem recusar
// formatos legítimos como "123456", "123456-SP" ou "CRM/SP 123456".
export function validateCrm(crm: string | null | undefined): void {
  const trimmed = crm?.trim() ?? '';
  if (
    trimmed.length < CRM_MIN_LENGTH ||
    trimmed.length > CRM_MAX_LENGTH ||
    !/\d/.test(trimmed)
  ) {
    throw new AppError(
      ErrorCodes.VALIDATION_FAILED,
      'CRM inválido — informe o número de registro no conselho de medicina',
    );
  }
}
