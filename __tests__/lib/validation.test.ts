import { describe, expect, it } from '@jest/globals';

import { AppError, ErrorCodes } from '@/lib/errors';
import {
  CRM_MAX_LENGTH,
  CRM_MIN_LENGTH,
  LONG_TEXT_MAX_LENGTH,
  PATIENT_NAME_MAX_LENGTH,
  REQUESTING_DOCTOR_MAX_LENGTH,
  validateCrm,
  validateLongText,
  validatePatientName,
  validateRequestingDoctor,
} from '@/lib/validation';

describe('validatePatientName', () => {
  it('aceita um nome dentro do limite', () => {
    expect(() => validatePatientName('Maria da Silva')).not.toThrow();
  });

  it('rejeita nome vazio', () => {
    expect(() => validatePatientName('')).toThrow(AppError);
  });

  it('rejeita nome só com espaços', () => {
    expect(() => validatePatientName('   ')).toThrow(AppError);
  });

  it('rejeita nome nulo/indefinido', () => {
    expect(() => validatePatientName(null)).toThrow(AppError);
    expect(() => validatePatientName(undefined)).toThrow(AppError);
  });

  it('aceita nome exatamente no limite máximo', () => {
    const name = 'A'.repeat(PATIENT_NAME_MAX_LENGTH);
    expect(() => validatePatientName(name)).not.toThrow();
  });

  it('rejeita nome que excede o limite máximo', () => {
    const name = 'A'.repeat(PATIENT_NAME_MAX_LENGTH + 1);
    expect(() => validatePatientName(name)).toThrow(AppError);
  });

  it('usa o código VALIDATION_FAILED', () => {
    try {
      validatePatientName('');
      throw new Error('deveria ter lançado');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).code).toBe(ErrorCodes.VALIDATION_FAILED);
    }
  });
});

describe('validateRequestingDoctor', () => {
  it('aceita valor ausente (campo opcional)', () => {
    expect(() => validateRequestingDoctor(undefined)).not.toThrow();
    expect(() => validateRequestingDoctor(null)).not.toThrow();
    expect(() => validateRequestingDoctor('')).not.toThrow();
  });

  it('aceita valor dentro do limite', () => {
    expect(() => validateRequestingDoctor('Dr. João')).not.toThrow();
  });

  it('rejeita valor que excede o limite', () => {
    expect(() => validateRequestingDoctor('A'.repeat(REQUESTING_DOCTOR_MAX_LENGTH + 1))).toThrow(
      AppError,
    );
  });
});

describe('validateLongText', () => {
  it('aceita texto ausente', () => {
    expect(() => validateLongText(undefined, 'Conclusão')).not.toThrow();
    expect(() => validateLongText(null, 'Conclusão')).not.toThrow();
  });

  it('aceita texto exatamente no limite', () => {
    expect(() => validateLongText('A'.repeat(LONG_TEXT_MAX_LENGTH), 'Conclusão')).not.toThrow();
  });

  it('rejeita texto que excede o limite', () => {
    expect(() => validateLongText('A'.repeat(LONG_TEXT_MAX_LENGTH + 1), 'Conclusão')).toThrow(
      AppError,
    );
  });
});

describe('validateCrm', () => {
  it('aceita um CRM numérico simples', () => {
    expect(() => validateCrm('123456')).not.toThrow();
  });

  it('aceita um CRM com UF', () => {
    expect(() => validateCrm('123456-SP')).not.toThrow();
    expect(() => validateCrm('123456/SP')).not.toThrow();
  });

  it('rejeita CRM vazio', () => {
    expect(() => validateCrm('')).toThrow(AppError);
    expect(() => validateCrm(undefined)).toThrow(AppError);
  });

  it('rejeita CRM sem nenhum dígito', () => {
    expect(() => validateCrm('ABCDE')).toThrow(AppError);
  });

  it('rejeita CRM abaixo do tamanho mínimo', () => {
    expect(() => validateCrm('1'.repeat(CRM_MIN_LENGTH - 1))).toThrow(AppError);
  });

  it('rejeita CRM acima do tamanho máximo', () => {
    expect(() => validateCrm('1'.repeat(CRM_MAX_LENGTH + 1))).toThrow(AppError);
  });
});
