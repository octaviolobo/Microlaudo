import { describe, expect, it } from '@jest/globals';

import { calculateEllipsoidVolume, isAboveReference } from '@/lib/usgVolume';

describe('calculateEllipsoidVolume', () => {
  it('confere com o útero do modelo da médica (6,3 × 2,7 × 3,8 → 33,6 cm³)', () => {
    expect(calculateEllipsoidVolume({ length_cm: 6.3, ap_cm: 2.7, transverse_cm: 3.8 })).toBe(33.6);
  });

  it('confere com o ovário do modelo da médica (1,3 × 1,1 × 1,2 → 0,9 cm³)', () => {
    expect(calculateEllipsoidVolume({ length_cm: 1.3, ap_cm: 1.1, transverse_cm: 1.2 })).toBe(0.9);
  });

  it('arredonda para 1 casa decimal', () => {
    // 2 × 2 × 2 × 0,52 = 4,16
    expect(calculateEllipsoidVolume({ length_cm: 2, ap_cm: 2, transverse_cm: 2 })).toBe(4.2);
  });

  it('retorna null se faltar alguma medida', () => {
    expect(calculateEllipsoidVolume({ length_cm: 6.3, ap_cm: null, transverse_cm: 3.8 })).toBeNull();
  });

  it('retorna null para medida zero, negativa ou não finita', () => {
    expect(calculateEllipsoidVolume({ length_cm: 0, ap_cm: 1, transverse_cm: 1 })).toBeNull();
    expect(calculateEllipsoidVolume({ length_cm: -1, ap_cm: 1, transverse_cm: 1 })).toBeNull();
    expect(calculateEllipsoidVolume({ length_cm: NaN, ap_cm: 1, transverse_cm: 1 })).toBeNull();
  });
});

describe('isAboveReference', () => {
  it('compara com a referência', () => {
    expect(isAboveReference(33.6, 90)).toBe(false);
    expect(isAboveReference(95, 90)).toBe(true);
  });

  it('volume ou referência desconhecidos nunca estão acima', () => {
    expect(isAboveReference(null, 90)).toBe(false);
    expect(isAboveReference(33.6, null)).toBe(false);
  });
});
