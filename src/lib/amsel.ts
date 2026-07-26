import type { AmselCriteria } from '@/types/report';

export type AmselResult = {
  positiveCount: number;
  diagnosis: boolean;
};

export function evaluateAmsel(criteria: AmselCriteria): AmselResult {
  const positiveCount = [
    criteria.homogeneous_discharge,
    criteria.whiff_test,
    criteria.clue_cells_20,
    criteria.ph_above_45,
  ].filter(Boolean).length;

  return { positiveCount, diagnosis: positiveCount >= 3 };
}
