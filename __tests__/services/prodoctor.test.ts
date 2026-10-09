import { describe, expect, it, jest } from '@jest/globals';

// O service importa o client do Supabase, que exige env vars — irrelevante
// para o helper puro testado aqui.
jest.mock('@/services/supabase', () => ({ supabase: {} }));

import { isProDoctorEnabled } from '@/services/prodoctor';

describe('isProDoctorEnabled', () => {
  it('libera a busca só quando a flag é explicitamente true', () => {
    expect(isProDoctorEnabled({ prodoctor_enabled: true })).toBe(true);
  });

  it('bloqueia quando a flag é false (default de todo médico novo)', () => {
    expect(isProDoctorEnabled({ prodoctor_enabled: false })).toBe(false);
  });

  it('bloqueia enquanto o perfil ainda não foi carregado', () => {
    expect(isProDoctorEnabled(null)).toBe(false);
    expect(isProDoctorEnabled(undefined)).toBe(false);
  });
});
