// Opções dos campos do laudo de USG pélvica transvaginal.
// Cada opção tem o valor salvo no banco (`content` JSONB) e o trecho de texto usado na
// geração do parágrafo do laudo. Estrutura e textos seguem docs/spec-usg-transvaginal.md.

export const USG_TRANSVAGINAL_SIGTAP = {
  code: '02.05.02.018-6',
  name: 'Ultrassonografia transvaginal',
} as const;

// Fluxo do laudo: Paciente → Análise → Texto e Opinião → Preview.
export const USG_TOTAL_STEPS = 4;

export const USG_TRANSVAGINAL_TITLE = 'Ultrassonografia pélvica transvaginal';

export const USG_TRANSVAGINAL_MATERIAL = 'Pelve feminina';
export const USG_TRANSVAGINAL_METHOD = 'Ultrassonografia transvaginal';

export const USG_TECHNIQUE_DEFAULT =
  'Exame realizado em aparelho dinâmico com transdutor endocavitário por via transvaginal.';

// Volume pela fórmula do elipsoide (ver src/lib/usgVolume.ts).
export const ELLIPSOID_FACTOR = 0.52;

export const UTERUS_REFERENCE_VOLUME_DEFAULT = 90; // cm³
export const OVARY_REFERENCE_VOLUME_DEFAULT = 10; // cm³

// Limites de sanidade para medidas digitadas (evitam erro de digitação tipo 63 em vez de 6,3).
export const MEASURE_CM_MAX = 30;
export const ENDOMETRIUM_MM_MAX = 50;
export const REFERENCE_VOLUME_MAX = 1000;
export const USG_NOTES_MAX_LENGTH = 1000;

// label = trecho usado no texto do laudo; short = rótulo curto do select na tela (quando o
// trecho do laudo não serve como rótulo).
type Option<V extends string> = { value: V; label: string; short?: string };

function options<V extends string>(list: Option<V>[]) {
  return list;
}

export const UTERUS_SHAPES = options([
  { value: 'piriforme', label: 'piriforme' },
  { value: 'globoso', label: 'globoso' },
]);

export const UTERUS_POSITIONS = options([
  { value: 'anteversoflexao', label: 'em anteversoflexão', short: 'Anteversoflexão' },
  { value: 'retroversoflexao', label: 'em retroversoflexão', short: 'Retroversoflexão' },
  { value: 'medioversao', label: 'em medioversão', short: 'Medioversão' },
]);

export const UTERUS_DEVIATIONS = options([
  { value: 'centrado', label: 'centrado' },
  { value: 'desviado_direita', label: 'desviado à direita' },
  { value: 'desviado_esquerda', label: 'desviado à esquerda' },
]);

export const CONTOURS = options([
  { value: 'regulares', label: 'regulares' },
  { value: 'irregulares', label: 'irregulares' },
  { value: 'lobulados', label: 'lobulados' },
]);

export const UTERUS_SIZES = options([
  { value: 'habituais', label: 'dimensões habituais', short: 'Habituais' },
  { value: 'aumentadas', label: 'dimensões aumentadas', short: 'Aumentadas' },
  { value: 'reduzidas', label: 'dimensões reduzidas', short: 'Reduzidas' },
]);

export const TEXTURES = options([
  { value: 'homogeneo', label: 'homogêneo' },
  { value: 'heterogeneo', label: 'heterogêneo' },
]);

export const CERVIX_ASPECTS = options([
  { value: 'habitual', label: 'de aspecto habitual', short: 'Habitual' },
  { value: 'alterado', label: 'de aspecto alterado', short: 'Alterado' },
]);

export const ENDOMETRIUM_CONTOURS = options([
  { value: 'regular', label: 'regular' },
  { value: 'irregular', label: 'irregular' },
]);

export const ENDOMETRIUM_ECHOGENICITIES = options([
  { value: 'anecoica', label: 'uniformemente anecoica' },
  { value: 'hipoecogenica', label: 'uniformemente hipoecogênica' },
  { value: 'isoecogenica', label: 'uniformemente isoecogênica' },
  { value: 'hiperecogenica', label: 'uniformemente hiperecogênica' },
  { value: 'trilaminar', label: 'trilaminar' },
  { value: 'heterogenea', label: 'heterogênea' },
]);

// Escore de cor ao Doppler (IETA): 1 = sem fluxo … 4 = fluxo abundante.
export const DOPPLER_SCORES = [1, 2, 3, 4] as const;

export const OVARY_POSITIONS = options([
  { value: 'topico', label: 'tópico' },
  { value: 'ectopico', label: 'ectópico' },
]);

export const OVARY_PARENCHYMAS = options([
  { value: 'habitual', label: 'O parênquima tem ecotextura habitual.', short: 'Ecotextura habitual' },
  {
    value: 'micropolicistico',
    label: 'O parênquima apresenta múltiplos folículos de pequenas dimensões.',
    short: 'Múltiplos folículos pequenos',
  },
  { value: 'alterado', label: 'O parênquima apresenta ecotextura alterada.', short: 'Ecotextura alterada' },
]);

export const FREE_FLUID_LEVELS = options([
  { value: 'ausente', label: 'sem líquido livre', short: 'Ausente' },
  { value: 'pequena', label: 'com pequena quantidade de líquido livre', short: 'Pequena quantidade' },
  { value: 'moderada', label: 'com moderada quantidade de líquido livre', short: 'Moderada quantidade' },
  { value: 'grande', label: 'com grande quantidade de líquido livre', short: 'Grande quantidade' },
]);

export type UterusShape = (typeof UTERUS_SHAPES)[number]['value'];
export type UterusPosition = (typeof UTERUS_POSITIONS)[number]['value'];
export type UterusDeviation = (typeof UTERUS_DEVIATIONS)[number]['value'];
export type Contours = (typeof CONTOURS)[number]['value'];
export type UterusSize = (typeof UTERUS_SIZES)[number]['value'];
export type Texture = (typeof TEXTURES)[number]['value'];
export type CervixAspect = (typeof CERVIX_ASPECTS)[number]['value'];
export type EndometriumContour = (typeof ENDOMETRIUM_CONTOURS)[number]['value'];
export type EndometriumEchogenicity = (typeof ENDOMETRIUM_ECHOGENICITIES)[number]['value'];
export type DopplerScore = (typeof DOPPLER_SCORES)[number];
export type OvaryPosition = (typeof OVARY_POSITIONS)[number]['value'];
export type OvaryParenchyma = (typeof OVARY_PARENCHYMAS)[number]['value'];
export type FreeFluidLevel = (typeof FREE_FLUID_LEVELS)[number]['value'];

// Opções no formato do componente Select (rótulo curto, com inicial maiúscula).
export function selectOptions<V extends string>(list: Option<V>[]): { value: V; label: string }[] {
  return list.map((o) => {
    const text = o.short ?? o.label;
    return { value: o.value, label: text.charAt(0).toUpperCase() + text.slice(1) };
  });
}

export function optionValues<V extends string>(list: Option<V>[]): V[] {
  return list.map((o) => o.value);
}
