import type {
  CervixAspect,
  Contours,
  DopplerScore,
  EndometriumContour,
  EndometriumEchogenicity,
  FreeFluidLevel,
  OvaryParenchyma,
  OvaryPosition,
  Texture,
  UterusDeviation,
  UterusPosition,
  UterusShape,
  UterusSize,
} from '@/constants/usg-options';

// Medidas em cm, no formato do laudo: comprimento × AP × transverso.
// `null` = ainda não informado. O volume não é salvo: é sempre derivado das medidas
// (src/lib/usgVolume.ts), para nunca divergir delas.
export type Dimensions = {
  length_cm: number | null;
  ap_cm: number | null;
  transverse_cm: number | null;
};

export type UsgUterus = Dimensions & {
  // Histerectomia: quando true, os demais campos do útero são ignorados no texto.
  absent: boolean;
  shape: UterusShape;
  position: UterusPosition;
  deviation: UterusDeviation;
  contours: Contours;
  size: UterusSize;
  reference_volume_cm3: number;
  myometrium: Texture;
  notes: string;
};

export type UsgCervix = {
  aspect: CervixAspect;
  notes: string;
};

export type UsgEndometrium = {
  contour: EndometriumContour;
  texture: Texture;
  thickness_mm: number | null;
  echogenicity: EndometriumEchogenicity;
  doppler_score: DopplerScore | null; // null = Doppler não realizado
  notes: string;
};

export type UsgOvary = Dimensions & {
  // false = "ovário não caracterizado"; aí só vale `adnexa_free`.
  characterized: boolean;
  position: OvaryPosition;
  contours: Contours;
  reference_volume_cm3: number;
  parenchyma: OvaryParenchyma;
  // Região anexial sem massas ou coleções.
  adnexa_free: boolean;
  notes: string;
};

export type UsgTransvaginalContent = {
  version: 1;
  technique: string;
  uterus: UsgUterus;
  cervix: UsgCervix;
  endometrium: UsgEndometrium;
  right_ovary: UsgOvary;
  left_ovary: UsgOvary;
  free_fluid: FreeFluidLevel;
  // Texto da Análise aprovado pela médica. null = ainda não editado (o app usa o texto
  // gerado a partir dos campos). Depois de editado, PDF e reedições usam este texto.
  analysis_text: string | null;
};

export type UsgSection = 'uterus' | 'cervix' | 'endometrium' | 'right_ovary' | 'left_ovary';
