import type { AmselResult } from './amsel';
import type { NugentResult } from '@/types/report';

export type ConclusionCase = 'normal' | 'intermediate' | 'bacterial_vaginosis' | 'discordant';

// Cruza a classificação laboratorial (Nugent) com o critério clínico (Amsel) para decidir
// qual conclusão padrão sugerir. Flora intermediária nunca fecha diagnóstico sozinha, então
// tem precedência sobre o resultado de Amsel. Nugent normal + Amsel negativo (ou vaginose +
// Amsel positivo) são os casos concordantes; qualquer outra combinação é discordante e pede
// correlação clínica em vez de uma conclusão automática.
export function classifyConclusionCase(
  nugent: NugentResult | null,
  amsel: AmselResult | null,
): ConclusionCase | null {
  if (!nugent || !amsel) return null;

  if (nugent.classification === 'intermediate') return 'intermediate';
  if (nugent.classification === 'bacterial_vaginosis' && amsel.diagnosis) return 'bacterial_vaginosis';
  if (nugent.classification === 'normal' && !amsel.diagnosis) return 'normal';
  return 'discordant';
}
