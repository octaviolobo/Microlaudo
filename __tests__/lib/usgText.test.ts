import { describe, expect, it } from '@jest/globals';

import { createDefaultUsgContent } from '@/lib/usgContent';
import {
  generateUsgAnalysisParagraphs,
  generateUsgAnalysisText,
  listUsgAlterations,
  resolveUsgAnalysisText,
  suggestUsgOpinion,
} from '@/lib/usgText';

import type { UsgTransvaginalContent } from '@/types/usg';

// Mesmo caso do modelo de laudo da médica (docs/spec-usg-transvaginal.md).
function modelCase(): UsgTransvaginalContent {
  const c = createDefaultUsgContent();
  Object.assign(c.uterus, { length_cm: 6.3, ap_cm: 2.7, transverse_cm: 3.8 });
  Object.assign(c.endometrium, { thickness_mm: 5.7, echogenicity: 'anecoica', doppler_score: 1 });
  Object.assign(c.right_ovary, { length_cm: 1.3, ap_cm: 1.1, transverse_cm: 1.2 });
  Object.assign(c.left_ovary, { characterized: false, adnexa_free: true });
  return c;
}

describe('generateUsgAnalysisParagraphs', () => {
  it('reproduz o texto do modelo da médica', () => {
    expect(generateUsgAnalysisParagraphs(modelCase())).toEqual([
      'Útero piriforme, em anteversoflexão, centrado, com contornos regulares, dimensões habituais, medindo cerca de 6,3 x 2,7 x 3,8 cm, com volume estimado de 33,6 cm³ (normal até 90,0 cm³). Miométrio homogêneo.',
      'Colo uterino e canal endocervical de aspecto habitual.',
      'Endométrio regular e homogêneo, medindo 5,7 mm de espessura, apresentando ecogenicidade uniformemente anecoica. Ao Doppler, escore de vascularização 1.',
      'Ovário direito tópico, de contornos regulares, medindo cerca de 1,3 x 1,1 x 1,2 cm, com volume de 0,9 cm³ (normal até 10,0 cm³). O parênquima tem ecotextura habitual.',
      'Ovário esquerdo não caracterizado. Região anexial esquerda sem evidências de massas ou coleções.',
      'Cavidade pélvica sem líquido livre.',
    ]);
  });

  it('omite medidas e volume enquanto as medidas não foram preenchidas', () => {
    const [uterus] = generateUsgAnalysisParagraphs(createDefaultUsgContent());
    expect(uterus).not.toContain('medindo');
    expect(uterus).not.toContain('volume');
  });

  it('omite Doppler quando não realizado', () => {
    const c = modelCase();
    c.endometrium.doppler_score = null;
    expect(generateUsgAnalysisText(c)).not.toContain('Doppler');
  });

  it('pós-histerectomia: sem colo e endométrio', () => {
    const c = modelCase();
    c.uterus.absent = true;
    const paragraphs = generateUsgAnalysisParagraphs(c);
    expect(paragraphs[0]).toContain('pós-histerectomia');
    expect(paragraphs.join(' ')).not.toContain('Endométrio');
    expect(paragraphs.join(' ')).not.toContain('Colo');
  });

  it('acrescenta observações livres com ponto final', () => {
    const c = modelCase();
    c.cervix.notes = 'Cisto de Naboth de 0,4 cm';
    expect(generateUsgAnalysisParagraphs(c)[1]).toBe(
      'Colo uterino e canal endocervical de aspecto habitual. Cisto de Naboth de 0,4 cm.',
    );
  });
});

describe('resolveUsgAnalysisText', () => {
  it('usa o texto gerado quando não há edição', () => {
    const c = modelCase();
    expect(resolveUsgAnalysisText(c)).toBe(generateUsgAnalysisText(c));
  });

  it('usa o texto editado pela médica quando existe', () => {
    const c = modelCase();
    c.analysis_text = 'Texto revisado.';
    expect(resolveUsgAnalysisText(c)).toBe('Texto revisado.');
  });

  it('texto editado em branco cai no gerado', () => {
    const c = modelCase();
    c.analysis_text = '   ';
    expect(resolveUsgAnalysisText(c)).toBe(generateUsgAnalysisText(c));
  });
});

describe('suggestUsgOpinion', () => {
  it('caso todo normal', () => {
    expect(listUsgAlterations(modelCase())).toEqual([]);
    expect(suggestUsgOpinion(modelCase())).toBe('Exame ultrassonográfico dentro dos padrões da normalidade.');
  });

  it('lista só o que foi marcado como alterado', () => {
    const c = modelCase();
    c.uterus.myometrium = 'heterogeneo';
    c.free_fluid = 'pequena';
    expect(suggestUsgOpinion(c)).toBe(
      'Miométrio heterogêneo. Cavidade pélvica com pequena quantidade de líquido livre. Demais estruturas sem alterações.',
    );
  });

  it('aponta volume acima da referência', () => {
    const c = modelCase();
    Object.assign(c.right_ovary, { length_cm: 4, ap_cm: 3, transverse_cm: 3 }); // 18,7 cm³
    expect(listUsgAlterations(c)).toContain('Ovário direito com volume aumentado (18,7 cm³).');
  });

  it('respeita referência editada pela médica', () => {
    const c = modelCase();
    c.uterus.reference_volume_cm3 = 30; // 33,6 > 30
    expect(listUsgAlterations(c)).toContain('Volume uterino aumentado (33,6 cm³).');
  });
});
