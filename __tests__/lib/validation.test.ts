import { describe, expect, it } from '@jest/globals';

import { AppError, ErrorCodes } from '@/lib/errors';
import {
  CRM_MAX_LENGTH,
  CRM_MIN_LENGTH,
  LONG_TEXT_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PATIENT_NAME_MAX_LENGTH,
  REQUESTING_DOCTOR_MAX_LENGTH,
  getPasswordIssue,
  isValidCpf,
  isValidSusCard,
  normalizeDigits,
  validateCpf,
  validateCrm,
  validateLongText,
  validatePatientName,
  validateRequestingDoctor,
  validateSusCard,
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

describe('CPF', () => {
  it('aceita CPF válido com ou sem pontuação', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('52998224725')).toBe(true);
  });

  it('rejeita dígito verificador errado', () => {
    expect(isValidCpf('529.982.247-24')).toBe(false);
  });

  it('rejeita tamanho errado e dígitos repetidos', () => {
    expect(isValidCpf('1234567890')).toBe(false);
    expect(isValidCpf('111.111.111-11')).toBe(false);
  });

  it('validateCpf: vazio/nulo passa (campo opcional), inválido lança', () => {
    expect(() => validateCpf(undefined)).not.toThrow();
    expect(() => validateCpf('')).not.toThrow();
    expect(() => validateCpf('529.982.247-24')).toThrow(AppError);
  });
});

describe('Cartão SUS (CNS)', () => {
  it('aceita definitivo (1/2) e provisório (7/8/9) válidos', () => {
    expect(isValidSusCard('100 1234 5678 9004')).toBe(true);
    expect(isValidSusCard('700123456789002')).toBe(true);
  });

  it('rejeita soma ponderada inválida', () => {
    expect(isValidSusCard('100123456789005')).toBe(false);
  });

  it('rejeita primeiro dígito inválido e tamanho errado', () => {
    expect(isValidSusCard('300123456789004')).toBe(false);
    expect(isValidSusCard('10012345678900')).toBe(false);
  });

  it('validateSusCard: vazio passa, inválido lança', () => {
    expect(() => validateSusCard(null)).not.toThrow();
    expect(() => validateSusCard('100123456789005')).toThrow(AppError);
  });
});

describe('normalizeDigits', () => {
  it('remove pontuação e espaços', () => {
    expect(normalizeDigits('529.982.247-25')).toBe('52998224725');
  });

  it('vazio vira null', () => {
    expect(normalizeDigits('')).toBeNull();
    expect(normalizeDigits(' . - ')).toBeNull();
    expect(normalizeDigits(undefined)).toBeNull();
  });
});

describe('getPasswordIssue', () => {
  it('aceita senha com letras e dígitos no tamanho mínimo', () => {
    expect(getPasswordIssue('abcdefghi1')).toBeNull();
    expect(getPasswordIssue('Senha Forte 2026!')).toBeNull();
  });

  it('recusa senha curta (espelha o mínimo do Supabase Auth)', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(10);
    expect(getPasswordIssue('abcdefgh1')).toBe('tooShort');
    expect(getPasswordIssue('')).toBe('tooShort');
  });

  it('recusa senha acima do limite do bcrypt', () => {
    expect(getPasswordIssue('a1'.repeat(PASSWORD_MAX_LENGTH / 2) + 'x')).toBe('tooLong');
    expect(getPasswordIssue('a1'.repeat(PASSWORD_MAX_LENGTH / 2))).toBeNull();
  });

  it('exige letra e dígito', () => {
    expect(getPasswordIssue('somenteletras')).toBe('needsLetterAndDigit');
    expect(getPasswordIssue('1234567890')).toBe('needsLetterAndDigit');
    expect(getPasswordIssue('ééééééééé1')).toBe('needsLetterAndDigit'); // GoTrue só conta A–Z/a–z
  });
});
