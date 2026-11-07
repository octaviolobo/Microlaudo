import { AppError, ErrorCodes } from './errors';

// Limites mencionados em docs/analise-seguranca.md (#2 — Injection via campos de texto
// livre) mas nunca implementados (ver docs/PROGRESSO.md, dívida técnica de F08/F09).
export const PATIENT_NAME_MAX_LENGTH = 200;
export const REQUESTING_DOCTOR_MAX_LENGTH = 200;
export const LONG_TEXT_MAX_LENGTH = 5000; // conclusão, descrição microscópica, referência bibliográfica

// Senha — espelha a política do Supabase Auth (Dashboard → Authentication → Policies):
// mínimo 10, letras + dígitos. O máximo de 72 vem do bcrypt (bytes além disso são
// ignorados pelo GoTrue). O servidor é a autoridade; isto só dá feedback antes do envio.
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 72;

export type PasswordIssue = 'tooShort' | 'tooLong' | 'needsLetterAndDigit';

export function getPasswordIssue(password: string): PasswordIssue | null {
  if (password.length < PASSWORD_MIN_LENGTH) return 'tooShort';
  if (password.length > PASSWORD_MAX_LENGTH) return 'tooLong';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'needsLetterAndDigit';
  return null;
}

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

// ─── CPF e cartão SUS (opcionais) ─────────────────────────────────
// Guardados só com dígitos (migration 014 tem CHECK de formato). Os normalizadores
// tiram pontuação e espaços; string vazia vira null (campo opcional não preenchido).

export function normalizeDigits(value: string | null | undefined): string | null {
  const digits = (value ?? '').replace(/\D/g, '');
  return digits.length > 0 ? digits : null;
}

export function isValidCpf(value: string): boolean {
  const cpf = value.replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const digits = cpf.split('').map(Number);
  for (const pos of [9, 10]) {
    let sum = 0;
    for (let i = 0; i < pos; i++) sum += digits[i] * (pos + 1 - i);
    const check = ((sum * 10) % 11) % 10;
    if (check !== digits[pos]) return false;
  }
  return true;
}

// Cartão Nacional de Saúde (CNS): 15 dígitos, começa com 1, 2 (definitivo) ou 7, 8, 9
// (provisório), e a soma ponderada (pesos 15 → 1) é múltipla de 11.
export function isValidSusCard(value: string): boolean {
  const cns = value.replace(/\D/g, '');
  if (!/^[12789]\d{14}$/.test(cns)) return false;
  let sum = 0;
  for (let i = 0; i < 15; i++) sum += Number(cns[i]) * (15 - i);
  return sum % 11 === 0;
}

export function validateCpf(value: string | null | undefined): void {
  const digits = normalizeDigits(value);
  if (digits && !isValidCpf(digits)) {
    throw new AppError(ErrorCodes.VALIDATION_FAILED, 'CPF inválido — confira os números digitados');
  }
}

export function validateSusCard(value: string | null | undefined): void {
  const digits = normalizeDigits(value);
  if (digits && !isValidSusCard(digits)) {
    throw new AppError(ErrorCodes.VALIDATION_FAILED, 'Cartão SUS inválido — confira os 15 números');
  }
}
