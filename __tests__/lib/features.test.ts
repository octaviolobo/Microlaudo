import { describe, expect, it } from '@jest/globals';

import { enabledReportTypes, isReportTypeEnabled } from '@/constants/features';

describe('trava de tipos de laudo por plataforma', () => {
  it('microscopia está liberada em todas as plataformas', () => {
    expect(isReportTypeEnabled('microscopia', 'web')).toBe(true);
    expect(isReportTypeEnabled('microscopia', 'ios')).toBe(true);
    expect(isReportTypeEnabled('microscopia', 'android')).toBe(true);
  });

  it('USG transvaginal só na web até o lançamento oficial', () => {
    expect(isReportTypeEnabled('usg_transvaginal', 'web')).toBe(true);
    expect(isReportTypeEnabled('usg_transvaginal', 'ios')).toBe(false);
    expect(isReportTypeEnabled('usg_transvaginal', 'android')).toBe(false);
  });

  it('lista os tipos habilitados por plataforma', () => {
    expect(enabledReportTypes('web')).toEqual(['microscopia', 'usg_transvaginal']);
    expect(enabledReportTypes('ios')).toEqual(['microscopia']);
  });
});
