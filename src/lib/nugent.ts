import { NUGENT_TABLE } from '@/constants/nugent-table';
import type { Morphotypes, NugentClassification, NugentResult } from '@/types/report';

export function classifyNugentScore(score: number): NugentClassification {
  if (score >= 7) return 'bacterial_vaginosis';
  if (score >= 4) return 'intermediate';
  return 'normal';
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
