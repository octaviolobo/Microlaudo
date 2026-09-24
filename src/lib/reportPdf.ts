import { i18n } from '@/i18n';
import { FINDINGS_FIELDS } from '@/constants/findings-options';

import { classifyNugentScore } from './nugent';
import { evaluateAmsel } from './amsel';
import { formatDateBR } from './date';

import type { ReportRow, DoctorRow } from '@/types/database';

export type ReportPdfAssets = {
  logoUrl?: string | null;
  signatureUrl?: string | null;
};

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
  assets: ReportPdfAssets = {},
): Promise<Blob> {
  // Import dinâmico: o build browser do jsPDF quebra ao ser avaliado no
  // runtime nativo (Hermes) com "Unknown encoding: latin1", e o expo-router
  // importa todo app/ estaticamente no boot — um import estático aqui
  // derrubava o app inteiro em mobile antes mesmo de gerar qualquer PDF.
  // Adiar pra dentro da função restringe o crash à própria geração de PDF
  // (hoje só suportada na web, ver guard de Platform em services/pdf.ts).
  const { jsPDF } = await import('jspdf/dist/jspdf.es.min.js');
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

  // Cabeçalho — logo (se houver) à esquerda, texto ao lado
  const LOGO_SIZE = 50;
  let textX = MARGIN_X;
  const headerTopY = y;
  let logoEmbedded = false;

  if (assets.logoUrl) {
    try {
      const logoDataUrl = await loadImageAsDataUrl(assets.logoUrl);
      const format = logoDataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      doc.addImage(logoDataUrl, format, MARGIN_X, headerTopY - 12, LOGO_SIZE, LOGO_SIZE);
      textX = MARGIN_X + LOGO_SIZE + 12;
      logoEmbedded = true;
    } catch (err) {
      console.warn('[reportPdf] falha ao embutir logo no PDF:', err);
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(8, 145, 178);
  doc.text(doctor.clinic_name || 'MicroLaudo', textX, y);
  y += 18;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(22, 78, 99);
  doc.text(
    `${doctor.full_name} — CRM ${doctor.crm}${doctor.rqe ? ` — RQE ${doctor.rqe}` : ''}`,
    textX,
    y,
  );
  y += 14;

  if (doctor.clinic_address || doctor.clinic_phone) {
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text([doctor.clinic_address, doctor.clinic_phone].filter(Boolean).join(' — '), textX, y);
    y += 14;
  }

  // Se a logo foi embutida, garante que o y fique abaixo dela antes da linha
  if (logoEmbedded) {
    const logoBottom = headerTopY - 12 + LOGO_SIZE;
    if (y < logoBottom + 4) y = logoBottom + 4;
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

  // Assinatura do médico (imagem) — antes da referência bibliográfica
  if (assets.signatureUrl) {
    try {
      const signatureDataUrl = await loadImageAsDataUrl(assets.signatureUrl);
      const format = signatureDataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      const sigWidth = 160;
      const sigHeight = 60;
      ensureSpace(sigHeight + 30);
      y += 12;
      const sigX = MARGIN_X + (contentWidth - sigWidth) / 2;
      doc.addImage(signatureDataUrl, format, sigX, y, sigWidth, sigHeight);
      y += sigHeight + 4;
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.5);
      doc.line(sigX, y, sigX + sigWidth, y);
      y += 12;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `${doctor.full_name} — CRM ${doctor.crm}${doctor.rqe ? ` — RQE ${doctor.rqe}` : ''}`,
        pageWidth / 2,
        y,
        { align: 'center' },
      );
      y += 14;
    } catch (err) {
      console.warn('[reportPdf] falha ao embutir assinatura no PDF:', err);
    }
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Versão HTML do mesmo laudo, usada no nativo (ver src/services/pdf.ts) via
// expo-print — jsPDF (buildReportPdfBlob acima) não roda no Hermes. Reusa os
// mesmos dados/regras de negócio (Nugent, Amsel, labels via i18n) para manter
// o conteúdo idêntico entre web e mobile; só a técnica de renderização muda.
export async function buildReportPdfHtml(
  report: ReportRow,
  doctor: DoctorRow,
  photoUrls: string[],
  assets: ReportPdfAssets = {},
): Promise<string> {
  function heading(text: string): string {
    return `<div class="heading">${escapeHtml(text.toUpperCase())}</div>`;
  }

  function line(label: string, value: string): string {
    return `<div class="line"><span class="label">${escapeHtml(label)}:</span><span class="value">${escapeHtml(value)}</span></div>`;
  }

  function paragraph(text: string, muted = false): string {
    const escaped = escapeHtml(text).replace(/\n/g, '<br/>');
    return `<p class="paragraph${muted ? ' muted' : ''}">${escaped}</p>`;
  }

  // Cabeçalho — logo (se houver) à esquerda, texto ao lado
  let logoImg = '';
  if (assets.logoUrl) {
    try {
      const logoDataUrl = await loadImageAsDataUrl(assets.logoUrl);
      logoImg = `<img src="${logoDataUrl}" class="logo" />`;
    } catch (err) {
      console.warn('[reportPdf] falha ao embutir logo no PDF:', err);
    }
  }

  const clinicLine = escapeHtml(
    `${doctor.full_name} — CRM ${doctor.crm}${doctor.rqe ? ` — RQE ${doctor.rqe}` : ''}`,
  );
  const addressLine = [doctor.clinic_address, doctor.clinic_phone].filter(Boolean).join(' — ');

  // Dados do paciente
  const patientLines = [
    line(tr('steps.patient.patientName'), report.patient_name),
    report.patient_birth_date
      ? line(tr('steps.patient.birthDate'), formatDateBR(report.patient_birth_date))
      : '',
    line(tr('steps.patient.collectionDate'), formatDateBR(report.collection_date)),
    report.requesting_doctor
      ? line(tr('steps.patient.requestingDoctor'), report.requesting_doctor)
      : '',
    line(tr('material'), report.material),
    line(tr('method'), report.method),
  ]
    .filter(Boolean)
    .join('');

  // Fotos
  let photosHtml = '';
  if (photoUrls.length > 0) {
    const photoImgs: string[] = [];
    for (const url of photoUrls) {
      try {
        const dataUrl = await loadImageAsDataUrl(url);
        photoImgs.push(`<img src="${dataUrl}" class="photo" />`);
      } catch (err) {
        // se a imagem falhar ao carregar ou decodificar, pula e segue o laudo
        console.warn('[reportPdf] falha ao embutir foto no PDF:', err);
      }
    }
    if (photoImgs.length > 0) {
      photosHtml = `${heading(tr('steps.photos.title'))}<div class="photo-row">${photoImgs.join('')}</div>`;
    }
  }

  // Achados microscópicos
  const findingsToShow = FINDINGS_FIELDS.map((field) => ({
    field,
    label: t(`findings.${FIELD_LABEL_KEYS[field]}`),
    value: report[field],
  })).filter((f) => f.value);

  const findingsLines = findingsToShow
    .map((f) => line(f.label, t(`findingLevels.${f.value}`)))
    .join('');

  const microscopicDescriptionHtml = report.microscopic_description
    ? paragraph(report.microscopic_description)
    : '';

  // Nugent
  const nugentHtml =
    report.nugent_score != null
      ? paragraph(
          `${t('nugent.result', { score: report.nugent_score })} — ${t(`nugent.classifications.${classifyNugentScore(report.nugent_score)}`)}`,
        )
      : paragraph('—');

  // Amsel
  const amsel = evaluateAmsel({
    homogeneous_discharge: report.amsel_homogeneous_discharge,
    whiff_test: report.amsel_whiff_test,
    clue_cells_20: report.amsel_clue_cells_20,
    ph_above_45: report.amsel_ph_above_45,
  });
  const amselResultHtml = paragraph(
    `${t('amsel.result', { count: amsel.positiveCount })}${amsel.diagnosis ? ` — ${t('amsel.diagnosis')}` : ''}`,
  );
  const amselPhHtml =
    report.amsel_ph_value != null ? line(t('amsel.phValue'), String(report.amsel_ph_value)) : '';

  // Conclusão
  const conclusionHtml = report.conclusion
    ? `${heading(tr('steps.conclusion.title'))}${paragraph(report.conclusion)}`
    : '';

  // Assinatura do médico (imagem) — antes da referência bibliográfica
  let signatureHtml = '';
  if (assets.signatureUrl) {
    try {
      const signatureDataUrl = await loadImageAsDataUrl(assets.signatureUrl);
      signatureHtml = `
        <div class="signature">
          <img src="${signatureDataUrl}" class="signature-img" />
          <div class="signature-line"></div>
          <div class="signature-name">${clinicLine}</div>
        </div>`;
    } catch (err) {
      console.warn('[reportPdf] falha ao embutir assinatura no PDF:', err);
    }
  }

  const bibliographicHtml = report.bibliographic_reference
    ? `${heading(tr('steps.conclusion.bibliographicReference'))}${paragraph(report.bibliographic_reference, true)}`
    : '';

  const footerText = escapeHtml(tr('revision', { number: report.revision_number }));

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; }
      body {
        font-family: Helvetica, Arial, sans-serif;
        color: #1e293b;
        margin: 0;
        padding: 40px;
        font-size: 10pt;
      }
      .header { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
      .logo { width: 50px; height: 50px; object-fit: contain; }
      .clinic-name { font-size: 16pt; font-weight: bold; color: #0891b2; margin: 0 0 4px; }
      .doctor-line { font-size: 10pt; color: #164e63; margin: 0 0 4px; }
      .address-line { font-size: 9pt; color: #64748b; margin: 0; }
      .divider { border: none; border-top: 1.2pt solid #0891b2; margin: 12px 0 16px; }
      .title { font-size: 13pt; font-weight: bold; text-align: center; margin: 0 0 20px; }
      .heading {
        font-size: 9pt;
        font-weight: bold;
        color: #0891b2;
        text-transform: uppercase;
        border-bottom: 1pt solid #a5f3fc;
        padding-bottom: 3px;
        margin: 16px 0 8px;
      }
      .line { font-size: 10pt; margin-bottom: 6px; }
      .line .label { color: #1e293b; margin-right: 6px; }
      .line .value { color: #1e293b; }
      .paragraph { font-size: 10pt; line-height: 1.4; margin: 4px 0 6px; white-space: pre-wrap; }
      .paragraph.muted { color: #64748b; }
      .photo-row { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 8px; }
      .photo { width: 90px; height: 90px; object-fit: cover; border-radius: 4px; }
      .signature { margin: 24px 0 12px; text-align: center; }
      .signature-img { width: 160px; height: 60px; object-fit: contain; }
      .signature-line { width: 160px; border-top: 0.5pt solid #94a3b8; margin: 4px auto; }
      .signature-name { font-size: 9pt; color: #64748b; }
      .footer { font-size: 8pt; color: #94a3b8; margin-top: 24px; }
    </style>
  </head>
  <body>
    <div class="header">
      ${logoImg}
      <div>
        <p class="clinic-name">${escapeHtml(doctor.clinic_name || 'MicroLaudo')}</p>
        <p class="doctor-line">${clinicLine}</p>
        ${addressLine ? `<p class="address-line">${escapeHtml(addressLine)}</p>` : ''}
      </div>
    </div>
    <hr class="divider" />
    <div class="title">Laudo de Microscopia Vaginal</div>

    ${heading(tr('steps.patient.title'))}
    ${patientLines}

    ${photosHtml}

    ${heading(tr('steps.findings.title'))}
    ${findingsLines}
    ${microscopicDescriptionHtml}

    ${heading(t('nugent.title'))}
    ${nugentHtml}

    ${heading(t('amsel.title'))}
    ${amselResultHtml}
    ${amselPhHtml}

    ${conclusionHtml}
    ${signatureHtml}
    ${bibliographicHtml}

    <div class="footer">${footerText}</div>
  </body>
</html>`;
}
