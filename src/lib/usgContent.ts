import {
  CERVIX_ASPECTS,
  CONTOURS,
  DOPPLER_SCORES,
  ENDOMETRIUM_CONTOURS,
  ENDOMETRIUM_ECHOGENICITIES,
  ENDOMETRIUM_MM_MAX,
  FREE_FLUID_LEVELS,
  MEASURE_CM_MAX,
  OVARY_PARENCHYMAS,
  OVARY_POSITIONS,
  OVARY_REFERENCE_VOLUME_DEFAULT,
  REFERENCE_VOLUME_MAX,
  TEXTURES,
  USG_NOTES_MAX_LENGTH,
  USG_TECHNIQUE_DEFAULT,
  UTERUS_DEVIATIONS,
  UTERUS_POSITIONS,
  UTERUS_REFERENCE_VOLUME_DEFAULT,
  UTERUS_SHAPES,
  UTERUS_SIZES,
  optionValues,
} from '@/constants/usg-options';

import { AppError, ErrorCodes } from './errors';
import { LONG_TEXT_MAX_LENGTH } from './validation';

import type { Json } from '@/types/database';
import type {
  Dimensions,
  UsgCervix,
  UsgEndometrium,
  UsgOvary,
  UsgTransvaginalContent,
  UsgUterus,
} from '@/types/usg';

// ─── Defaults ─────────────────────────────────────────────────────
// Caso "normal" do modelo da médica: ela só ajusta o que fugir disso e digita medidas.

function defaultOvary(): UsgOvary {
  return {
    characterized: true,
    position: 'topico',
    contours: 'regulares',
    length_cm: null,
    ap_cm: null,
    transverse_cm: null,
    reference_volume_cm3: OVARY_REFERENCE_VOLUME_DEFAULT,
    parenchyma: 'habitual',
    adnexa_free: true,
    notes: '',
  };
}

export function createDefaultUsgContent(): UsgTransvaginalContent {
  return {
    version: 1,
    technique: USG_TECHNIQUE_DEFAULT,
    uterus: {
      absent: false,
      shape: 'piriforme',
      position: 'anteversoflexao',
      deviation: 'centrado',
      contours: 'regulares',
      size: 'habituais',
      length_cm: null,
      ap_cm: null,
      transverse_cm: null,
      reference_volume_cm3: UTERUS_REFERENCE_VOLUME_DEFAULT,
      myometrium: 'homogeneo',
      notes: '',
    },
    cervix: { aspect: 'habitual', notes: '' },
    endometrium: {
      contour: 'regular',
      texture: 'homogeneo',
      thickness_mm: null,
      echogenicity: 'anecoica',
      doppler_score: null,
      notes: '',
    },
    right_ovary: defaultOvary(),
    left_ovary: defaultOvary(),
    free_fluid: 'ausente',
    analysis_text: null,
  };
}

// ─── Parse (banco → app) ──────────────────────────────────────────
// `content` vem do banco como Json. Parse é tolerante: campo ausente ou inválido volta ao
// default, para que um laudo salvo por uma versão antiga do app ainda abra.

type Obj = Record<string, unknown>;

function isObj(v: unknown): v is Obj {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function pickEnum<V extends string | number>(value: unknown, allowed: readonly V[], fallback: V): V {
  return allowed.includes(value as V) ? (value as V) : fallback;
}

function pickNumber(value: unknown, fallback: number | null): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function pickString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function pickBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function parseDims(raw: Obj, d: Dimensions): Dimensions {
  return {
    length_cm: pickNumber(raw.length_cm, d.length_cm),
    ap_cm: pickNumber(raw.ap_cm, d.ap_cm),
    transverse_cm: pickNumber(raw.transverse_cm, d.transverse_cm),
  };
}

function parseUterus(raw: unknown, d: UsgUterus): UsgUterus {
  const r = isObj(raw) ? raw : {};
  return {
    ...parseDims(r, d),
    absent: pickBool(r.absent, d.absent),
    shape: pickEnum(r.shape, optionValues(UTERUS_SHAPES), d.shape),
    position: pickEnum(r.position, optionValues(UTERUS_POSITIONS), d.position),
    deviation: pickEnum(r.deviation, optionValues(UTERUS_DEVIATIONS), d.deviation),
    contours: pickEnum(r.contours, optionValues(CONTOURS), d.contours),
    size: pickEnum(r.size, optionValues(UTERUS_SIZES), d.size),
    reference_volume_cm3: pickNumber(r.reference_volume_cm3, d.reference_volume_cm3) as number,
    myometrium: pickEnum(r.myometrium, optionValues(TEXTURES), d.myometrium),
    notes: pickString(r.notes, d.notes),
  };
}

function parseCervix(raw: unknown, d: UsgCervix): UsgCervix {
  const r = isObj(raw) ? raw : {};
  return {
    aspect: pickEnum(r.aspect, optionValues(CERVIX_ASPECTS), d.aspect),
    notes: pickString(r.notes, d.notes),
  };
}

function parseEndometrium(raw: unknown, d: UsgEndometrium): UsgEndometrium {
  const r = isObj(raw) ? raw : {};
  return {
    contour: pickEnum(r.contour, optionValues(ENDOMETRIUM_CONTOURS), d.contour),
    texture: pickEnum(r.texture, optionValues(TEXTURES), d.texture),
    thickness_mm: pickNumber(r.thickness_mm, d.thickness_mm),
    echogenicity: pickEnum(r.echogenicity, optionValues(ENDOMETRIUM_ECHOGENICITIES), d.echogenicity),
    doppler_score:
      r.doppler_score === null ? null : pickEnum(r.doppler_score, DOPPLER_SCORES, d.doppler_score ?? 1),
    notes: pickString(r.notes, d.notes),
  };
}

function parseOvary(raw: unknown, d: UsgOvary): UsgOvary {
  const r = isObj(raw) ? raw : {};
  return {
    ...parseDims(r, d),
    characterized: pickBool(r.characterized, d.characterized),
    position: pickEnum(r.position, optionValues(OVARY_POSITIONS), d.position),
    contours: pickEnum(r.contours, optionValues(CONTOURS), d.contours),
    reference_volume_cm3: pickNumber(r.reference_volume_cm3, d.reference_volume_cm3) as number,
    parenchyma: pickEnum(r.parenchyma, optionValues(OVARY_PARENCHYMAS), d.parenchyma),
    adnexa_free: pickBool(r.adnexa_free, d.adnexa_free),
    notes: pickString(r.notes, d.notes),
  };
}

export function parseUsgContent(json: Json | null | undefined): UsgTransvaginalContent {
  const d = createDefaultUsgContent();
  if (!isObj(json)) return d;
  const r = json as Obj;
  return {
    version: 1,
    technique: pickString(r.technique, d.technique),
    uterus: parseUterus(r.uterus, d.uterus),
    cervix: parseCervix(r.cervix, d.cervix),
    endometrium: parseEndometrium(r.endometrium, d.endometrium),
    right_ovary: parseOvary(r.right_ovary, d.right_ovary),
    left_ovary: parseOvary(r.left_ovary, d.left_ovary),
    free_fluid: pickEnum(r.free_fluid, optionValues(FREE_FLUID_LEVELS), d.free_fluid),
    analysis_text: typeof r.analysis_text === 'string' ? r.analysis_text : null,
  };
}

// ─── Validação (app → banco) ──────────────────────────────────────
// Estrita: roda antes de salvar e lança AppError com mensagem para a médica.

function fail(message: string): never {
  throw new AppError(ErrorCodes.VALIDATION_FAILED, message);
}

function checkRange(value: number | null, max: number, label: string, required = false): void {
  if (value == null) {
    if (required) fail(`${label}: preencha o valor`);
    return;
  }
  if (!Number.isFinite(value) || value <= 0 || value > max) {
    fail(`${label}: valor deve ser maior que 0 e no máximo ${String(max).replace('.', ',')}`);
  }
}

function checkText(value: string | null, max: number, label: string): void {
  if (value && value.length > max) fail(`${label} excede o limite de ${max} caracteres`);
}

function checkEnum<V extends string | number>(value: V, allowed: readonly V[], label: string): void {
  if (!allowed.includes(value)) fail(`${label}: opção inválida`);
}

function checkDims(dims: Dimensions, label: string): void {
  checkRange(dims.length_cm, MEASURE_CM_MAX, `${label} — comprimento`);
  checkRange(dims.ap_cm, MEASURE_CM_MAX, `${label} — AP`);
  checkRange(dims.transverse_cm, MEASURE_CM_MAX, `${label} — transverso`);
}

function checkOvary(o: UsgOvary, label: string): void {
  checkDims(o, label);
  checkRange(o.reference_volume_cm3, REFERENCE_VOLUME_MAX, `${label} — volume de referência`, true);
  checkEnum(o.position, optionValues(OVARY_POSITIONS), label);
  checkEnum(o.contours, optionValues(CONTOURS), label);
  checkEnum(o.parenchyma, optionValues(OVARY_PARENCHYMAS), label);
  checkText(o.notes, USG_NOTES_MAX_LENGTH, `${label} — observações`);
}

export function validateUsgContent(c: UsgTransvaginalContent): void {
  checkText(c.technique, LONG_TEXT_MAX_LENGTH, 'Técnica');
  checkText(c.analysis_text, LONG_TEXT_MAX_LENGTH, 'Análise');

  const u = c.uterus;
  checkDims(u, 'Útero');
  checkRange(u.reference_volume_cm3, REFERENCE_VOLUME_MAX, 'Útero — volume de referência', true);
  checkEnum(u.shape, optionValues(UTERUS_SHAPES), 'Útero — forma');
  checkEnum(u.position, optionValues(UTERUS_POSITIONS), 'Útero — posição');
  checkEnum(u.deviation, optionValues(UTERUS_DEVIATIONS), 'Útero — centrado/desviado');
  checkEnum(u.contours, optionValues(CONTOURS), 'Útero — contornos');
  checkEnum(u.size, optionValues(UTERUS_SIZES), 'Útero — dimensões');
  checkEnum(u.myometrium, optionValues(TEXTURES), 'Miométrio');
  checkText(u.notes, USG_NOTES_MAX_LENGTH, 'Útero — observações');

  checkEnum(c.cervix.aspect, optionValues(CERVIX_ASPECTS), 'Colo uterino');
  checkText(c.cervix.notes, USG_NOTES_MAX_LENGTH, 'Colo uterino — observações');

  const e = c.endometrium;
  checkRange(e.thickness_mm, ENDOMETRIUM_MM_MAX, 'Endométrio — espessura');
  checkEnum(e.contour, optionValues(ENDOMETRIUM_CONTOURS), 'Endométrio — contorno');
  checkEnum(e.texture, optionValues(TEXTURES), 'Endométrio — textura');
  checkEnum(e.echogenicity, optionValues(ENDOMETRIUM_ECHOGENICITIES), 'Endométrio — ecogenicidade');
  if (e.doppler_score !== null) checkEnum(e.doppler_score, DOPPLER_SCORES, 'Endométrio — escore Doppler');
  checkText(e.notes, USG_NOTES_MAX_LENGTH, 'Endométrio — observações');

  checkOvary(c.right_ovary, 'Ovário direito');
  checkOvary(c.left_ovary, 'Ovário esquerdo');

  checkEnum(c.free_fluid, optionValues(FREE_FLUID_LEVELS), 'Líquido livre');
}

// Json do supabase-js não aceita tipos com campos opcionais/literal sem cast.
export function usgContentToJson(c: UsgTransvaginalContent): Json {
  return c as unknown as Json;
}
