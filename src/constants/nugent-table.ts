import type { MorphotypeLevel } from '@/types/report';

export const NUGENT_TABLE: Record<'lactobacillus' | 'gardnerella' | 'mobiluncus', Record<MorphotypeLevel, number>> = {
  // Inversamente proporcional: mais lactobacilos = flora mais saudável = menos pontos
  lactobacillus: {
    '0': 4,   // nenhum → 4 pts (pior)
    '1+': 3,  // < 1/campo → 3 pts
    '2+': 2,  // 1-4/campo → 2 pts
    '3+': 1,  // 5-30/campo → 1 pt
    '4+': 0,  // > 30/campo → 0 pts (melhor)
  },
  // Diretamente proporcional: mais Gardnerella = mais vaginose = mais pontos
  gardnerella: {
    '0': 0,
    '1+': 1,
    '2+': 2,
    '3+': 3,
    '4+': 4,
  },
  // Diretamente proporcional, máximo 2 pontos
  mobiluncus: {
    '0': 0,
    '1+': 1,
    '2+': 2,
    '3+': 2,
    '4+': 2,
  },
};

export const NUGENT_MAX_SCORE = 10;
