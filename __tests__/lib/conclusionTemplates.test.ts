import { describe, expect, it } from '@jest/globals';

import { classifyConclusionCase } from '@/lib/conclusionTemplates';

import type { AmselResult } from '@/lib/amsel';
import type { NugentResult } from '@/types/report';

function nugent(classification: NugentResult['classification'], score = 0): NugentResult {
  return { score, classification, breakdown: { lactobacillusPoints: 0, gardnerellaPoints: 0, mobiluncusPoints: 0 } };
}

function amsel(diagnosis: boolean, positiveCount = diagnosis ? 3 : 0): AmselResult {
  return { diagnosis, positiveCount };
}

describe('classifyConclusionCase', () => {
  it('retorna null quando falta o resultado de Nugent ou de Amsel', () => {
    expect(classifyConclusionCase(null, amsel(false))).toBeNull();
    expect(classifyConclusionCase(nugent('normal'), null)).toBeNull();
    expect(classifyConclusionCase(null, null)).toBeNull();
  });

  it('normal: Nugent normal + Amsel negativo', () => {
    expect(classifyConclusionCase(nugent('normal'), amsel(false))).toBe('normal');
  });

  it('bacterial_vaginosis: Nugent vaginose + Amsel positivo', () => {
    expect(classifyConclusionCase(nugent('bacterial_vaginosis'), amsel(true))).toBe('bacterial_vaginosis');
  });

  it('intermediate: Nugent intermediário tem precedência independente do Amsel', () => {
    expect(classifyConclusionCase(nugent('intermediate'), amsel(false))).toBe('intermediate');
    expect(classifyConclusionCase(nugent('intermediate'), amsel(true))).toBe('intermediate');
  });

  it('discordant: Nugent normal + Amsel positivo', () => {
    expect(classifyConclusionCase(nugent('normal'), amsel(true))).toBe('discordant');
  });

  it('discordant: Nugent vaginose + Amsel negativo', () => {
    expect(classifyConclusionCase(nugent('bacterial_vaginosis'), amsel(false))).toBe('discordant');
  });
});
