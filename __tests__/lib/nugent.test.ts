import { describe, expect, it } from '@jest/globals';

import { NUGENT_MAX_SCORE, NUGENT_TABLE } from '@/constants/nugent-table';
import { calculateNugentScore, classifyNugentScore } from '@/lib/nugent';

import type { Morphotypes, MorphotypeLevel } from '@/types/report';

const LEVELS: MorphotypeLevel[] = ['0', '1+', '2+', '3+', '4+'];

describe('classifyNugentScore', () => {
  it('classifica 0 como flora normal', () => {
    expect(classifyNugentScore(0)).toBe('normal');
  });

  it('classifica 3 (limite superior de normal) como flora normal', () => {
    expect(classifyNugentScore(3)).toBe('normal');
  });

  it('classifica 4 (limite inferior de intermediária) como intermediate', () => {
    expect(classifyNugentScore(4)).toBe('intermediate');
  });

  it('classifica 6 (limite superior de intermediária) como intermediate', () => {
    expect(classifyNugentScore(6)).toBe('intermediate');
  });

  it('classifica 7 (limite inferior de vaginose) como bacterial_vaginosis', () => {
    expect(classifyNugentScore(7)).toBe('bacterial_vaginosis');
  });

  it('classifica 10 (máximo) como bacterial_vaginosis', () => {
    expect(classifyNugentScore(10)).toBe('bacterial_vaginosis');
  });

  it('cobre toda a faixa 0-10 nas três categorias', () => {
    const expected: Record<number, ReturnType<typeof classifyNugentScore>> = {
      0: 'normal',
      1: 'normal',
      2: 'normal',
      3: 'normal',
      4: 'intermediate',
      5: 'intermediate',
      6: 'intermediate',
      7: 'bacterial_vaginosis',
      8: 'bacterial_vaginosis',
      9: 'bacterial_vaginosis',
      10: 'bacterial_vaginosis',
    };
    for (const [scoreStr, klass] of Object.entries(expected)) {
      expect(classifyNugentScore(Number(scoreStr))).toBe(klass);
    }
  });
});

describe('calculateNugentScore', () => {
  it('retorna score 0 (flora ideal: muitos lactobacilos, sem Gardnerella nem Mobiluncus)', () => {
    const morphotypes: Morphotypes = {
      lactobacillus: '4+',
      gardnerella: '0',
      mobiluncus: '0',
    };
    const result = calculateNugentScore(morphotypes);
    expect(result.score).toBe(0);
    expect(result.classification).toBe('normal');
    expect(result.breakdown).toEqual({
      lactobacillusPoints: 0,
      gardnerellaPoints: 0,
      mobiluncusPoints: 0,
    });
  });

  it('retorna score máximo 10 (sem lactobacilos, muita Gardnerella e Mobiluncus)', () => {
    const morphotypes: Morphotypes = {
      lactobacillus: '0',
      gardnerella: '4+',
      mobiluncus: '4+',
    };
    const result = calculateNugentScore(morphotypes);
    expect(result.score).toBe(NUGENT_MAX_SCORE);
    expect(result.score).toBe(10);
    expect(result.classification).toBe('bacterial_vaginosis');
    expect(result.breakdown).toEqual({
      lactobacillusPoints: 4,
      gardnerellaPoints: 4,
      mobiluncusPoints: 2,
    });
  });

  it('retorna score na faixa intermediária (4-6) para flora mista', () => {
    const morphotypes: Morphotypes = {
      lactobacillus: '2+', // 2 pts
      gardnerella: '2+', // 2 pts
      mobiluncus: '1+', // 1 pt
    };
    const result = calculateNugentScore(morphotypes);
    expect(result.score).toBe(5);
    expect(result.classification).toBe('intermediate');
    expect(result.breakdown).toEqual({
      lactobacillusPoints: 2,
      gardnerellaPoints: 2,
      mobiluncusPoints: 1,
    });
  });

  it('aplica a inversão de pontos de Lactobacillus (mais lactobacilos = menos pontos)', () => {
    const scoresByLevel = LEVELS.map((level) => {
      const morphotypes: Morphotypes = {
        lactobacillus: level,
        gardnerella: '0',
        mobiluncus: '0',
      };
      return calculateNugentScore(morphotypes).breakdown.lactobacillusPoints;
    });
    // Espera-se estritamente decrescente: [4, 3, 2, 1, 0]
    expect(scoresByLevel).toEqual([4, 3, 2, 1, 0]);
  });

  it('aplica pontos diretamente proporcionais para Gardnerella (0 a 4)', () => {
    const scoresByLevel = LEVELS.map((level) => {
      const morphotypes: Morphotypes = {
        lactobacillus: '4+',
        gardnerella: level,
        mobiluncus: '0',
      };
      return calculateNugentScore(morphotypes).breakdown.gardnerellaPoints;
    });
    expect(scoresByLevel).toEqual([0, 1, 2, 3, 4]);
  });

  it('limita Mobiluncus a no máximo 2 pontos (3+ e 4+ ambos valem 2)', () => {
    const scoresByLevel = LEVELS.map((level) => {
      const morphotypes: Morphotypes = {
        lactobacillus: '4+',
        gardnerella: '0',
        mobiluncus: level,
      };
      return calculateNugentScore(morphotypes).breakdown.mobiluncusPoints;
    });
    expect(scoresByLevel).toEqual([0, 1, 2, 2, 2]);
  });

  it('garante que score nunca ultrapasse NUGENT_MAX_SCORE (10) para qualquer combinação', () => {
    for (const lacto of LEVELS) {
      for (const gard of LEVELS) {
        for (const mob of LEVELS) {
          const result = calculateNugentScore({
            lactobacillus: lacto,
            gardnerella: gard,
            mobiluncus: mob,
          });
          expect(result.score).toBeGreaterThanOrEqual(0);
          expect(result.score).toBeLessThanOrEqual(NUGENT_MAX_SCORE);
        }
      }
    }
  });

  it('breakdown corresponde exatamente à tabela NUGENT_TABLE para cada morfotipo', () => {
    const morphotypes: Morphotypes = {
      lactobacillus: '3+',
      gardnerella: '2+',
      mobiluncus: '1+',
    };
    const result = calculateNugentScore(morphotypes);
    expect(result.breakdown.lactobacillusPoints).toBe(NUGENT_TABLE.lactobacillus['3+']);
    expect(result.breakdown.gardnerellaPoints).toBe(NUGENT_TABLE.gardnerella['2+']);
    expect(result.breakdown.mobiluncusPoints).toBe(NUGENT_TABLE.mobiluncus['1+']);
    expect(result.score).toBe(
      result.breakdown.lactobacillusPoints +
        result.breakdown.gardnerellaPoints +
        result.breakdown.mobiluncusPoints,
    );
  });

  it('score fronteira 3 → normal (limite máximo de normal)', () => {
    // Ex.: lacto 3+ (1) + gard 2+ (2) + mob 0 (0) = 3
    const result = calculateNugentScore({
      lactobacillus: '3+',
      gardnerella: '2+',
      mobiluncus: '0',
    });
    expect(result.score).toBe(3);
    expect(result.classification).toBe('normal');
  });

  it('score fronteira 4 → intermediate (limite mínimo de intermediária)', () => {
    // Ex.: lacto 2+ (2) + gard 2+ (2) + mob 0 (0) = 4
    const result = calculateNugentScore({
      lactobacillus: '2+',
      gardnerella: '2+',
      mobiluncus: '0',
    });
    expect(result.score).toBe(4);
    expect(result.classification).toBe('intermediate');
  });

  it('score fronteira 6 → intermediate (limite máximo de intermediária)', () => {
    // Ex.: lacto 1+ (3) + gard 3+ (3) + mob 0 (0) = 6
    const result = calculateNugentScore({
      lactobacillus: '1+',
      gardnerella: '3+',
      mobiluncus: '0',
    });
    expect(result.score).toBe(6);
    expect(result.classification).toBe('intermediate');
  });

  it('score fronteira 7 → bacterial_vaginosis (limite mínimo de vaginose)', () => {
    // Ex.: lacto 1+ (3) + gard 3+ (3) + mob 1+ (1) = 7
    const result = calculateNugentScore({
      lactobacillus: '1+',
      gardnerella: '3+',
      mobiluncus: '1+',
    });
    expect(result.score).toBe(7);
    expect(result.classification).toBe('bacterial_vaginosis');
  });
});
