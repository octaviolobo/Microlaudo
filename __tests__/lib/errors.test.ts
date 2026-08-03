import { describe, expect, it } from '@jest/globals';

import { AppError, ErrorCodes } from '@/lib/errors';

describe('AppError', () => {
  it('é uma instância de Error (compatível com try/catch e instanceof Error)', () => {
    const error = new AppError(ErrorCodes.AUTH_LOGIN_FAILED, 'Credenciais inválidas');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
  });

  it('define name, code e message corretamente', () => {
    const error = new AppError(ErrorCodes.REPORT_NOT_FOUND, 'Laudo não encontrado');
    expect(error.name).toBe('AppError');
    expect(error.code).toBe('REPORT_NOT_FOUND');
    expect(error.message).toBe('Laudo não encontrado');
  });

  it('preserva a causa original (cause) quando fornecida, útil para debugging', () => {
    const originalError = new Error('falha de rede no Supabase');
    const error = new AppError(ErrorCodes.IMAGE_UPLOAD_FAILED, 'Upload falhou', originalError);
    expect(error.cause).toBe(originalError);
  });

  it('deixa cause como undefined quando não fornecida', () => {
    const error = new AppError(ErrorCodes.PROFILE_NOT_FOUND, 'Perfil não encontrado');
    expect(error.cause).toBeUndefined();
  });

  it('pode ser capturada e distinguida de erros genéricos via instanceof', () => {
    function throwAppError() {
      throw new AppError(ErrorCodes.TRIAL_LIMIT_REACHED, 'Limite do trial atingido');
    }

    try {
      throwAppError();
      throw new Error('não deveria chegar aqui');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      if (err instanceof AppError) {
        expect(err.code).toBe(ErrorCodes.TRIAL_LIMIT_REACHED);
      }
    }
  });
});

describe('ErrorCodes', () => {
  it('cada código é uma string idêntica à sua própria chave (contrato estável para logs/telemetria)', () => {
    for (const [key, value] of Object.entries(ErrorCodes)) {
      expect(value).toBe(key);
    }
  });

  it('não tem códigos duplicados', () => {
    const values = Object.values(ErrorCodes);
    expect(new Set(values).size).toBe(values.length);
  });
});
