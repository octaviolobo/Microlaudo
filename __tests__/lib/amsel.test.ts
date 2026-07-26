import { describe, expect, it } from '@jest/globals';

import { evaluateAmsel } from '@/lib/amsel';

import type { AmselCriteria } from '@/types/report';

function makeCriteria(overrides: Partial<AmselCriteria> = {}): AmselCriteria {
  return {
    homogeneous_discharge: false,
    whiff_test: false,
    clue_cells_20: false,
    ph_above_45: false,
    ...overrides,
  };
}

describe('evaluateAmsel', () => {
  it('retorna 0 positivos e diagnóstico negativo quando nenhum critério é marcado', () => {
    const result = evaluateAmsel(makeCriteria());
    expect(result.positiveCount).toBe(0);
    expect(result.diagnosis).toBe(false);
  });

  it('retorna 1 positivo e diagnóstico negativo quando apenas 1 critério é marcado', () => {
    const result = evaluateAmsel(makeCriteria({ homogeneous_discharge: true }));
    expect(result.positiveCount).toBe(1);
    expect(result.diagnosis).toBe(false);
  });

  it('retorna 2 positivos e diagnóstico negativo quando 2 critérios marcados', () => {
    const result = evaluateAmsel(
      makeCriteria({ homogeneous_discharge: true, whiff_test: true }),
    );
    expect(result.positiveCount).toBe(2);
    expect(result.diagnosis).toBe(false);
  });

  it('retorna 3 positivos e diagnóstico positivo (limiar ≥ 3) quando 3 critérios marcados', () => {
    const result = evaluateAmsel(
      makeCriteria({
        homogeneous_discharge: true,
        whiff_test: true,
        clue_cells_20: true,
      }),
    );
    expect(result.positiveCount).toBe(3);
    expect(result.diagnosis).toBe(true);
  });

  it('retorna 4 positivos e diagnóstico positivo quando todos os critérios marcados', () => {
    const result = evaluateAmsel(
      makeCriteria({
        homogeneous_discharge: true,
        whiff_test: true,
        clue_cells_20: true,
        ph_above_45: true,
      }),
    );
    expect(result.positiveCount).toBe(4);
    expect(result.diagnosis).toBe(true);
  });

  it('ignora o campo ph_value ao contar critérios positivos', () => {
    const result = evaluateAmsel(
      makeCriteria({
        // apenas ph_value, sem nenhum booleano true
        ph_value: 5.2,
      }),
    );
    expect(result.positiveCount).toBe(0);
    expect(result.diagnosis).toBe(false);
  });

  it('conta cada critério individualmente (identifica qual critério ativa cada positivo)', () => {
    const singleFields: Array<keyof Pick<
      AmselCriteria,
      'homogeneous_discharge' | 'whiff_test' | 'clue_cells_20' | 'ph_above_45'
    >> = ['homogeneous_discharge', 'whiff_test', 'clue_cells_20', 'ph_above_45'];

    for (const field of singleFields) {
      const result = evaluateAmsel(makeCriteria({ [field]: true }));
      expect(result.positiveCount).toBe(1);
      expect(result.diagnosis).toBe(false);
    }
  });

  it('positiveCount sempre entre 0 e 4 para qualquer combinação booleana', () => {
    const bools = [false, true];
    for (const a of bools) {
      for (const b of bools) {
        for (const c of bools) {
          for (const d of bools) {
            const result = evaluateAmsel(
              makeCriteria({
                homogeneous_discharge: a,
                whiff_test: b,
                clue_cells_20: c,
                ph_above_45: d,
              }),
            );
            expect(result.positiveCount).toBeGreaterThanOrEqual(0);
            expect(result.positiveCount).toBeLessThanOrEqual(4);
            expect(result.diagnosis).toBe(result.positiveCount >= 3);
          }
        }
      }
    }
  });
});
