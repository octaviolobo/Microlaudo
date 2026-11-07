import {
  CERVIX_ASPECTS,
  CONTOURS,
  ENDOMETRIUM_CONTOURS,
  ENDOMETRIUM_ECHOGENICITIES,
  FREE_FLUID_LEVELS,
  OVARY_PARENCHYMAS,
  OVARY_POSITIONS,
  TEXTURES,
  UTERUS_DEVIATIONS,
  UTERUS_POSITIONS,
  UTERUS_SHAPES,
  UTERUS_SIZES,
} from '@/constants/usg-options';

import { formatDecimalBR } from './format';
import { calculateEllipsoidVolume, isAboveReference } from './usgVolume';

import type { Dimensions, UsgOvary, UsgTransvaginalContent } from '@/types/usg';

// Gera o texto da "Análise" do laudo de USG transvaginal a partir dos campos estruturados,
// no padrão do modelo da médica (docs/spec-usg-transvaginal.md §3). A médica pode editar
// o resultado livremente; o texto aprovado é salvo em content.analysis_text.
// O texto sai em caixa normal; o PDF converte para caixa alta.

function label<V extends string>(list: { value: V; label: string }[], value: V): string {
  return list.find((o) => o.value === value)?.label ?? value;
}

function withNotes(text: string, notes: string): string {
  const n = notes.trim();
  if (!n) return text;
  return `${text} ${/[.!?]$/.test(n) ? n : `${n}.`}`;
}

function measures(d: Dimensions): string | null {
  const { length_cm, ap_cm, transverse_cm } = d;
  if (length_cm == null || ap_cm == null || transverse_cm == null) return null;
  return [length_cm, ap_cm, transverse_cm].map((v) => formatDecimalBR(v)).join(' x ');
}

function uterusParagraph(c: UsgTransvaginalContent): string {
  const u = c.uterus;
  if (u.absent) return withNotes('Útero não caracterizado (status pós-histerectomia).', u.notes);

  let text =
    `Útero ${label(UTERUS_SHAPES, u.shape)}, ${label(UTERUS_POSITIONS, u.position)}, ` +
    `${label(UTERUS_DEVIATIONS, u.deviation)}, com contornos ${label(CONTOURS, u.contours)}, ` +
    `${label(UTERUS_SIZES, u.size)}`;

  const m = measures(u);
  const volume = calculateEllipsoidVolume(u);
  if (m && volume != null) {
    text +=
      `, medindo cerca de ${m} cm, com volume estimado de ${formatDecimalBR(volume)} cm³ ` +
      `(normal até ${formatDecimalBR(u.reference_volume_cm3)} cm³)`;
  }
  text += `. Miométrio ${label(TEXTURES, u.myometrium)}.`;
  return withNotes(text, u.notes);
}

function cervixParagraph(c: UsgTransvaginalContent): string | null {
  if (c.uterus.absent) return null;
  return withNotes(
    `Colo uterino e canal endocervical ${label(CERVIX_ASPECTS, c.cervix.aspect)}.`,
    c.cervix.notes,
  );
}

function endometriumParagraph(c: UsgTransvaginalContent): string | null {
  if (c.uterus.absent) return null;
  const e = c.endometrium;
  let text = `Endométrio ${label(ENDOMETRIUM_CONTOURS, e.contour)} e ${label(TEXTURES, e.texture)}`;
  if (e.thickness_mm != null) text += `, medindo ${formatDecimalBR(e.thickness_mm)} mm de espessura`;
  text += `, apresentando ecogenicidade ${label(ENDOMETRIUM_ECHOGENICITIES, e.echogenicity)}.`;
  if (e.doppler_score != null) text += ` Ao Doppler, escore de vascularização ${e.doppler_score}.`;
  return withNotes(text, e.notes);
}

function ovaryParagraph(o: UsgOvary, side: 'direito' | 'esquerdo'): string {
  const sideF = side === 'direito' ? 'direita' : 'esquerda';
  if (!o.characterized) {
    const adnexa = o.adnexa_free
      ? `Região anexial ${sideF} sem evidências de massas ou coleções.`
      : `Região anexial ${sideF} com alterações.`;
    return withNotes(`Ovário ${side} não caracterizado. ${adnexa}`, o.notes);
  }

  let text = `Ovário ${side} ${label(OVARY_POSITIONS, o.position)}, de contornos ${label(CONTOURS, o.contours)}`;
  const m = measures(o);
  const volume = calculateEllipsoidVolume(o);
  if (m && volume != null) {
    text +=
      `, medindo cerca de ${m} cm, com volume de ${formatDecimalBR(volume)} cm³ ` +
      `(normal até ${formatDecimalBR(o.reference_volume_cm3)} cm³)`;
  }
  text += `. ${label(OVARY_PARENCHYMAS, o.parenchyma)}`;
  return withNotes(text, o.notes);
}

function pelvisParagraph(c: UsgTransvaginalContent): string {
  return `Cavidade pélvica ${label(FREE_FLUID_LEVELS, c.free_fluid)}.`;
}

// Parágrafos da Análise, na ordem do modelo.
export function generateUsgAnalysisParagraphs(c: UsgTransvaginalContent): string[] {
  return [
    uterusParagraph(c),
    cervixParagraph(c),
    endometriumParagraph(c),
    ovaryParagraph(c.right_ovary, 'direito'),
    ovaryParagraph(c.left_ovary, 'esquerdo'),
    pelvisParagraph(c),
  ].filter((p): p is string => Boolean(p));
}

export function generateUsgAnalysisText(c: UsgTransvaginalContent): string {
  return generateUsgAnalysisParagraphs(c).join('\n\n');
}

// Texto que vai para o laudo: o editado pela médica, se houver; senão o gerado.
export function resolveUsgAnalysisText(c: UsgTransvaginalContent): string {
  return c.analysis_text?.trim() ? c.analysis_text : generateUsgAnalysisText(c);
}

// ─── Sugestão de "Opinião do relatório" ──────────────────────────
// Só lista o que a própria médica marcou como fora do padrão nos campos; nenhuma regra
// clínica (ex.: limite de espessura endometrial por idade) é aplicada aqui. É sempre um
// ponto de partida editável.

function ovaryAlterations(o: UsgOvary, side: 'direito' | 'esquerdo'): string[] {
  if (!o.characterized) return o.adnexa_free ? [] : [`Alteração em região anexial ${side === 'direito' ? 'direita' : 'esquerda'}.`];
  const out: string[] = [];
  if (o.position !== 'topico') out.push(`Ovário ${side} ectópico.`);
  if (o.contours !== 'regulares') out.push(`Ovário ${side} de contornos ${label(CONTOURS, o.contours)}.`);
  const volume = calculateEllipsoidVolume(o);
  if (isAboveReference(volume, o.reference_volume_cm3)) {
    out.push(`Ovário ${side} com volume aumentado (${formatDecimalBR(volume as number)} cm³).`);
  }
  if (o.parenchyma !== 'habitual') out.push(`Ovário ${side}: ${label(OVARY_PARENCHYMAS, o.parenchyma).toLowerCase()}`);
  return out;
}

export function listUsgAlterations(c: UsgTransvaginalContent): string[] {
  const out: string[] = [];
  const u = c.uterus;

  if (u.absent) {
    out.push('Status pós-histerectomia.');
  } else {
    if (u.size !== 'habituais') out.push(`Útero de ${label(UTERUS_SIZES, u.size)}.`);
    if (u.contours !== 'regulares') out.push(`Útero de contornos ${label(CONTOURS, u.contours)}.`);
    const volume = calculateEllipsoidVolume(u);
    if (isAboveReference(volume, u.reference_volume_cm3)) {
      out.push(`Volume uterino aumentado (${formatDecimalBR(volume as number)} cm³).`);
    }
    if (u.myometrium !== 'homogeneo') out.push('Miométrio heterogêneo.');
    if (c.cervix.aspect !== 'habitual') out.push('Colo uterino de aspecto alterado.');
    const e = c.endometrium;
    if (e.contour !== 'regular' || e.texture !== 'homogeneo') {
      out.push(`Endométrio ${label(ENDOMETRIUM_CONTOURS, e.contour)} e ${label(TEXTURES, e.texture)}.`);
    }
  }

  out.push(...ovaryAlterations(c.right_ovary, 'direito'));
  out.push(...ovaryAlterations(c.left_ovary, 'esquerdo'));
  if (c.free_fluid !== 'ausente') out.push(`Cavidade pélvica ${label(FREE_FLUID_LEVELS, c.free_fluid)}.`);
  return out;
}

export function suggestUsgOpinion(c: UsgTransvaginalContent): string {
  const alterations = listUsgAlterations(c);
  if (alterations.length === 0) return 'Exame ultrassonográfico dentro dos padrões da normalidade.';
  return `${alterations.join(' ')} Demais estruturas sem alterações.`;
}
