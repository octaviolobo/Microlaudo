import type { FindingLevel } from '@/types/report';

export const FINDING_LEVELS: FindingLevel[] = ['ausente', 'raros', 'alguns', 'numerosos'];

export const FINDINGS_FIELDS = [
  'lactobacilli',
  'cocci',
  'coccobacilli_gram_pos',
  'coccobacilli_gram_neg',
  'leukocytes',
  'red_blood_cells',
  'epithelial_cells',
  'fungal_elements',
  'trichomonas',
  'clue_cells',
  'mucus',
] as const;

export type FindingsField = (typeof FINDINGS_FIELDS)[number];
