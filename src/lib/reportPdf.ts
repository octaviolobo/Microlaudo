// Import direto do build browser — o resolver do Metro pega o build "node" do
// pacote (que referencia html2canvas via require dinâmico) se importarmos
// pelo nome do pacote (`jspdf`), quebrando o bundle web inteiro.
import { jsPDF } from 'jspdf/dist/jspdf.es.min.js';

import { i18n } from '@/i18n';
import { classifyNugentScore } from './nugent';
import { evaluateAmsel } from './amsel';
import { formatDateBR } from './date';
import { FINDINGS_FIELDS } from '@/constants/findings-options';
import type { ReportRow, DoctorRow } from '@/types/database';

const FIELD_LABEL_KEYS: Record<string, string> = {
  lactobacilli: 'lactobacilli',
  cocci: 'cocci',
  coccobacilli_gram_pos: 'coccobacilliGramPos',
  coccobacilli_gram_neg: 'coccobacilliGramNeg',
  leukocytes: 'leukocytes',
  red_blood_cells: 'redBloodCells',
  epithelial_cells: 'epithelialCells',
  fungal_elements: 'fungalElements',
  trichomonas: 'trichomonas',
  clue_cells: 'clueCells',
  mucus: 'mucus',
};

function t(key: string, options?: Record<string, unknown>) {
  return i18n.getFixedT('pt-BR', 'clinical')(key, options);
}

function tr(key: string, options?: Record<string, unknown>) {
  return i18n.getFixedT('pt-BR', 'report')(key, options);
}

// Busca os bytes direto via fetch (em vez de um <img crossOrigin>) — a mesma URL
// assinada já é usada por um <Image> sem CORS no preview, e reusar via elemento
// <img> com crossOrigin dispara uma falha de cache do navegador na segunda busca.
async function loadImageAsDataUrl(url: string): Promise<string> {
  const blob = await fetch(url).then((r) => r.blob());
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const MARGIN_X = 40;
const PAGE_BOTTOM = 780;

export async function buildReportPdfBlob(
  report: ReportRow,
  doctor: DoctorRow,
  photoUrls: string[],
): Promise<Blob> {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - MARGIN_X * 2;
  let y = 50;

  function ensureSpace(minHeight: number) {
    if (y + minHeight > PAGE_BOTTOM) {
      doc.addPage();
      y = 50;
    }
  }

  function heading(text: string) {
    ensureSpace(24);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(8, 145, 178);
    doc.text(text.toUpperCase(), MARGIN_X, y);
    doc.setDrawColor(165, 243, 252);
    doc.line(MARGIN_X, y + 3, pageWidth - MARGIN_X, y + 3);
    y += 16;
    doc.setTextColor(30, 41, 59);
  }

  function line(label: string, value: string, columnX: number = MARGIN_X + 150) {
    ensureSpace(14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(`${label}:`, MARGIN_X, y);
    doc.text(value, columnX, y);
    y += 14;
  }

  function paragraph(text: string, color: [number, number, number] = [30, 41, 59]) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, contentWidth) as string[];
    ensureSpace(lines.length * 12);
    doc.text(lines, MARGIN_X, y);
    y += lines.length * 12 + 6;
  }

  // Cabeçalho
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(8, 145, 178);
  doc.text(doctor.clinic_name || 'MicroLaudo', MARGIN_X, y);
  y += 18;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(22, 78, 99);
  doc.text(
    `${doctor.full_name} — CRM ${doctor.crm}${doctor.rqe ? ` — RQE ${doctor.rqe}` : ''}`,
    MARGIN_X,
    y,
  );
  y += 14;

  if (doctor.clinic_address || doctor.clinic_phone) {
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text([doctor.clinic_address, doctor.clinic_phone].filter(Boolean).join(' — '), MARGIN_X, y);
    y += 14;
  }

  doc.setDrawColor(8, 145, 178);
  doc.setLineWidth(1.2);
  doc.line(MARGIN_X, y, pageWidth - MARGIN_X, y);
  y += 22;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(30, 41, 59);
  doc.text('Laudo de Microscopia Vaginal', pageWidth / 2, y, { align: 'center' });
  y += 26;

  // Dados do paciente
  heading(tr('steps.patient.title'));
  const patientLabels: string[] = [
    tr('steps.patient.patientName'),
    ...(report.patient_birth_date ? [tr('steps.patient.birthDate')] : []),
    tr('steps.patient.collectionDate'),
    ...(report.requesting_doctor ? [tr('steps.patient.requestingDoctor')] : []),
    tr('material'),
    tr('method'),
  ];
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const patientMaxLabelWidth = Math.max(0, ...patientLabels.map((l) => doc.getTextWidth(`${l}:`)));
  const patientColumnX = MARGIN_X + patientMaxLabelWidth + 14;
  line(tr('steps.patient.patientName'), report.patient_name, patientColumnX);
  if (report.patient_birth_date) {
    line(tr('steps.patient.birthDate'), formatDateBR(report.patient_birth_date), patientColumnX);
  }
  line(tr('steps.patient.collectionDate'), formatDateBR(report.collection_date), patientColumnX);
  if (report.requesting_doctor) {
    line(tr('steps.patient.requestingDoctor'), report.requesting_doctor, patientColumnX);
  }
  line(tr('material'), report.material, patientColumnX);
  line(tr('method'), report.method, patientColumnX);
  y += 6;

  // Fotos
  if (photoUrls.length > 0) {
    heading(tr('steps.photos.title'));
    const size = 90;
    ensureSpace(size + 10);
    let x = MARGIN_X;
    for (const url of photoUrls) {
      try {
        const dataUrl = await loadImageAsDataUrl(url);
        const format = dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
        doc.addImage(dataUrl, format, x, y, size, size);
      } catch (err) {
        // se a imagem falhar ao carregar ou decodificar, pula e segue o laudo
        console.warn('[reportPdf] falha ao embutir foto no PDF:', err);
      }
      x += size + 10;
    }
    y += size + 16;
  }

  // Achados microscópicos
  heading(tr('steps.findings.title'));
  const findingsToShow = FINDINGS_FIELDS.map((field) => ({
    field,
    label: t(`findings.${FIELD_LABEL_KEYS[field]}`),
    value: report[field],
  })).filter((f) => f.value);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const maxLabelWidth = Math.max(0, ...findingsToShow.map((f) => doc.getTextWidth(`${f.label}:`)));
  const findingsColumnX = MARGIN_X + maxLabelWidth + 14;

  for (const { label, value } of findingsToShow) {
    line(label, t(`findingLevels.${value}`), findingsColumnX);
  }
  if (report.microscopic_description) {
    y += 4;
    paragraph(report.microscopic_description);
  }
  y += 6;

  // Nugent
  heading(t('nugent.title'));
  if (report.nugent_score != null) {
    paragraph(
      `${t('nugent.result', { score: report.nugent_score })} — ${t(`nugent.classifications.${classifyNugentScore(report.nugent_score)}`)}`,
    );
  } else {
    paragraph('—');
  }

  // Amsel
  const amsel = evaluateAmsel({
    homogeneous_discharge: report.amsel_homogeneous_discharge,
    whiff_test: report.amsel_whiff_test,
    clue_cells_20: report.amsel_clue_cells_20,
    ph_above_45: report.amsel_ph_above_45,
  });
  heading(t('amsel.title'));
  paragraph(
    `${t('amsel.result', { count: amsel.positiveCount })}${amsel.diagnosis ? ` — ${t('amsel.diagnosis')}` : ''}`,
  );
  if (report.amsel_ph_value != null) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const amselPhLabel = t('amsel.phValue');
    const amselColumnX = MARGIN_X + doc.getTextWidth(`${amselPhLabel}:`) + 14;
    line(amselPhLabel, String(report.amsel_ph_value), amselColumnX);
  }
  y += 6;

  // Conclusão
  if (report.conclusion) {
    heading(tr('steps.conclusion.title'));
    paragraph(report.conclusion);
  }

  if (report.bibliographic_reference) {
    heading(tr('steps.conclusion.bibliographicReference'));
    paragraph(report.bibliographic_reference, [100, 116, 139]);
  }

  // Rodapé em todas as páginas
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(tr('revision', { number: report.revision_number }), MARGIN_X, 812);
    doc.text(`${i} / ${pageCount}`, pageWidth - MARGIN_X, 812, { align: 'right' });
  }

  return doc.output('blob');
}
