import { ELLIPSOID_FACTOR } from '@/constants/usg-options';

import type { Dimensions } from '@/types/usg';

// Volume pela fórmula do elipsoide: comprimento × AP × transverso × 0,52, com 1 casa
// decimal. Confere com o modelo de laudo da médica (docs/spec-usg-transvaginal.md):
// útero 6,3 × 2,7 × 3,8 → 33,6 cm³; ovário 1,3 × 1,1 × 1,2 → 0,9 cm³.
// Retorna null se alguma medida estiver faltando ou não for positiva.
export function calculateEllipsoidVolume(dims: Dimensions): number | null {
  const { length_cm, ap_cm, transverse_cm } = dims;
  const values = [length_cm, ap_cm, transverse_cm];
  if (values.some((v) => v == null || !Number.isFinite(v) || v <= 0)) return null;

  const raw = (length_cm as number) * (ap_cm as number) * (transverse_cm as number) * ELLIPSOID_FACTOR;
  // EPSILON corrige casos de ponto flutuante na casa .x5 (ex.: 0,25 → 0,3).
  return Math.round((raw + Number.EPSILON) * 10) / 10;
}

export function isAboveReference(volume: number | null, reference: number | null): boolean {
  return volume != null && reference != null && volume > reference;
}
