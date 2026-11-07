import { describe, expect, it } from '@jest/globals';

import { USG_TECHNIQUE_DEFAULT } from '@/constants/usg-options';
import { AppError } from '@/lib/errors';
import { createDefaultUsgContent, parseUsgContent, validateUsgContent } from '@/lib/usgContent';
import { LONG_TEXT_MAX_LENGTH } from '@/lib/validation';

import type { Json } from '@/types/database';

describe('createDefaultUsgContent', () => {
  it('gera o caso normal do modelo, sem medidas', () => {
    const c = createDefaultUsgContent();
    expect(c.technique).toBe(USG_TECHNIQUE_DEFAULT);
    expect(c.uterus).toMatchObject({ shape: 'piriforme', position: 'anteversoflexao', reference_volume_cm3: 90 });
    expect(c.right_ovary).toMatchObject({ characterized: true, reference_volume_cm3: 10 });
    expect(c.uterus.length_cm).toBeNull();
    expect(c.free_fluid).toBe('ausente');
    expect(c.analysis_text).toBeNull();
  });

  it('retorna objetos independentes (ovários não compartilham referência)', () => {
    const c = createDefaultUsgContent();
    c.right_ovary.notes = 'x';
    expect(c.left_ovary.notes).toBe('');
  });

  it('é válido', () => {
    expect(() => validateUsgContent(createDefaultUsgContent())).not.toThrow();
  });
});

describe('parseUsgContent', () => {
  it('null/indefinido/não-objeto viram o default', () => {
    expect(parseUsgContent(null)).toEqual(createDefaultUsgContent());
    expect(parseUsgContent(undefined)).toEqual(createDefaultUsgContent());
    expect(parseUsgContent('texto')).toEqual(createDefaultUsgContent());
    expect(parseUsgContent([1, 2])).toEqual(createDefaultUsgContent());
  });

  it('faz o caminho de ida e volta sem perder dados', () => {
    const c = createDefaultUsgContent();
    c.uterus.length_cm = 6.3;
    c.endometrium.doppler_score = 1;
    c.left_ovary.characterized = false;
    c.analysis_text = 'Texto editado';
    expect(parseUsgContent(JSON.parse(JSON.stringify(c)) as Json)).toEqual(c);
  });

  it('valores de opção inválidos voltam ao default', () => {
    const parsed = parseUsgContent({ uterus: { position: 'invalida' }, free_fluid: 'muito' });
    expect(parsed.uterus.position).toBe('anteversoflexao');
    expect(parsed.free_fluid).toBe('ausente');
  });

  it('descarta campos desconhecidos', () => {
    const parsed = parseUsgContent({ hack: true, uterus: { extra: 1 } });
    expect(parsed).not.toHaveProperty('hack');
    expect(parsed.uterus).not.toHaveProperty('extra');
  });

  it('medida não numérica vira null; doppler null é preservado', () => {
    const parsed = parseUsgContent({ uterus: { length_cm: '6,3' }, endometrium: { doppler_score: null } });
    expect(parsed.uterus.length_cm).toBeNull();
    expect(parsed.endometrium.doppler_score).toBeNull();
  });
});

describe('validateUsgContent', () => {
  it('aceita medidas do modelo', () => {
    const c = createDefaultUsgContent();
    Object.assign(c.uterus, { length_cm: 6.3, ap_cm: 2.7, transverse_cm: 3.8 });
    c.endometrium.thickness_mm = 5.7;
    expect(() => validateUsgContent(c)).not.toThrow();
  });

  it('rejeita medida fora da faixa (erro de digitação, ex.: 63 cm)', () => {
    const c = createDefaultUsgContent();
    c.uterus.length_cm = 63;
    expect(() => validateUsgContent(c)).toThrow(AppError);
  });

  it('rejeita medida zero ou negativa', () => {
    const c = createDefaultUsgContent();
    c.right_ovary.ap_cm = 0;
    expect(() => validateUsgContent(c)).toThrow(AppError);
  });

  it('rejeita espessura do endométrio acima do limite', () => {
    const c = createDefaultUsgContent();
    c.endometrium.thickness_mm = 57;
    expect(() => validateUsgContent(c)).toThrow(AppError);
  });

  it('rejeita volume de referência inválido', () => {
    const c = createDefaultUsgContent();
    c.uterus.reference_volume_cm3 = 0;
    expect(() => validateUsgContent(c)).toThrow(AppError);
  });

  it('exige o volume de referência (campo apagado na tela)', () => {
    const c = createDefaultUsgContent();
    (c.right_ovary as { reference_volume_cm3: number | null }).reference_volume_cm3 = null;
    expect(() => validateUsgContent(c)).toThrow(AppError);
  });

  it('rejeita texto da análise acima do limite', () => {
    const c = createDefaultUsgContent();
    c.analysis_text = 'a'.repeat(LONG_TEXT_MAX_LENGTH + 1);
    expect(() => validateUsgContent(c)).toThrow(AppError);
  });
});
