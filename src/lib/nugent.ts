import { NUGENT_TABLE } from '@/constants/nugent-table';

import type { MorphotypeLevel, Morphotypes, NugentClassification, NugentResult } from '@/types/report';

const MORPHOTYPE_LEVELS: MorphotypeLevel[] = ['0', '1+', '2+', '3+', '4+'];

export function classifyNugentScore(score: number): NugentClassification {
  if (score >= 7) return 'bacterial_vaginosis';
  if (score >= 4) return 'intermediate';
  return 'normal';
}

// Conversão inversa (pontos → nível qualitativo) para reidratar a UI ao editar um laudo
// já finalizado. A tabela do mobiluncus não é injetiva (2+, 3+, 4+ → 2 pts): escolhemos
// o MENOR nível cujo valor corresponde aos pontos armazenados. O médico pode ajustar antes
// de re-finalizar. Retorna `undefined` para o eixo quando não há valor persistido.
export function pointsToMorphotypes(points: {
  lactobacillus: number | null;
  gardnerella: number | null;
  mobiluncus: number | null;
}): Partial<Morphotypes> | null {
  const result: Partial<Morphotypes> = {};

  for (const axis of ['lactobacillus', 'gardnerella', 'mobiluncus'] as const) {
    const value = points[axis];
    if (value == null) continue;
    const match = MORPHOTYPE_LEVELS.find((level) => NUGENT_TABLE[axis][level] === value);
    if (match) result[axis] = match;
  }

  return Object.keys(result).length ? result : null;
}

export function calculateNugentScore(morphotypes: Morphotypes): NugentResult {
  const lactobacillusPoints = NUGENT_TABLE.lactobacillus[morphotypes.lactobacillus];
  const gardnerellaPoints = NUGENT_TABLE.gardnerella[morphotypes.gardnerella];
  const mobiluncusPoints = NUGENT_TABLE.mobiluncus[morphotypes.mobiluncus];

  const score = lactobacillusPoints + gardnerellaPoints + mobiluncusPoints;

  return {
    score,
    classification: classifyNugentScore(score),
    breakdown: { lactobacillusPoints, gardnerellaPoints, mobiluncusPoints },
  };
}
