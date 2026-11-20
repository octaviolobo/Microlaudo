import { USG_TRANSVAGINAL_SIGTAP, USG_TRANSVAGINAL_TITLE } from '@/constants/usg-options';

import { calculateAge, formatDateBR, formatDateTimeLongBR } from './date';
import { formatCpf, formatSusCard } from './format';
import { loadJsPdf } from './jspdfLoader';
import { escapeHtml, loadImageAsDataUrl, type ReportPdfAssets } from './reportPdf';
import { parseUsgContent } from './usgContent';
import { resolveUsgAnalysisText } from './usgText';

import type { DoctorRow, ReportRow } from '@/types/database';

// PDF do laudo de USG transvaginal. Web: jsPDF (buildUsgReportPdfBlob). Nativo: HTML
// renderizado pelo expo-print (buildUsgReportPdfHtml) — jsPDF não roda no Hermes.
// Layout segue o modelo da médica (docs/spec-usg-transvaginal.md §1):
// cabeçalho → identificação do paciente → procedimentos (SIGTAP) → achados/descrição
// (título, técnica, análise, opinião) em CAIXA ALTA → data/hora + assinatura + CRM.
// Cores e cabeçalho iguais ao PDF de microscopia (src/lib/reportPdf.ts).

const MARGIN_X = 40;
const PAGE_BOTTOM = 780;
const LINE_HEIGHT = 13;

type RGB = [number, number, number];
const PRIMARY: RGB = [8, 145, 178];
const PRIMARY_LIGHT: RGB = [165, 243, 252];
const TEXT: RGB = [30, 41, 59];
const MUTED: RGB = [100, 116, 139];
const SUBTLE: RGB = [148, 163, 184];

function upper(text: string): string {
  return text.toLocaleUpperCase('pt-BR');
}

function doctorLine(doctor: DoctorRow): string {
  return `${doctor.full_name} — CRM ${doctor.crm}${doctor.rqe ? ` — RQE ${doctor.rqe}` : ''}`;
}

type Field = { label: string; value: string };

function patientFields(report: ReportRow): Field[] {
  const age = calculateAge(report.patient_birth_date, report.collection_date);
  const fields: Field[] = [{ label: 'Paciente', value: report.patient_name }];
  if (report.patient_birth_date) {
    fields.push({
      label: 'Nascimento',
      value: `${formatDateBR(report.patient_birth_date)}${age != null ? ` (${age} anos)` : ''}`,
    });
  }
  if (report.patient_cpf) fields.push({ label: 'CPF', value: formatCpf(report.patient_cpf) });
  if (report.patient_sus_card) fields.push({ label: 'Cartão SUS', value: formatSusCard(report.patient_sus_card) });
  fields.push({ label: 'Data do exame', value: formatDateBR(report.collection_date) });
  if (report.requesting_doctor) fields.push({ label: 'Médico solicitante', value: report.requesting_doctor });
  return fields;
}

function analysisParagraphs(content: ReturnType<typeof parseUsgContent>): string[] {
  return resolveUsgAnalysisText(content)
    .split(/\n\s*\n/)
    .map((p) => p.trim().replace(/\n/g, ' '))
    .filter(Boolean);
}

export async function buildUsgReportPdfBlob(
  report: ReportRow,
  doctor: DoctorRow,
  assets: ReportPdfAssets = {},
  signedAt: Date = new Date(report.updated_at),
): Promise<Blob> {
  const jsPDF = await loadJsPdf();
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - MARGIN_X * 2;
  const content = parseUsgContent(report.content);
  let y = 50;

  function ensureSpace(minHeight: number) {
    if (y + minHeight > PAGE_BOTTOM) {
      doc.addPage();
      y = 50;
    }
  }

  function setText(size: number, style: 'normal' | 'bold', color: RGB) {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  }

  function heading(text: string) {
    ensureSpace(28);
    setText(9, 'bold', PRIMARY);
    doc.text(upper(text), MARGIN_X, y);
    doc.setDrawColor(...PRIMARY_LIGHT);
    doc.setLineWidth(0.8);
    doc.line(MARGIN_X, y + 3, pageWidth - MARGIN_X, y + 3);
    y += 16;
  }

  function paragraph(text: string, opts: { bold?: boolean; gapAfter?: number } = {}) {
    setText(10, opts.bold ? 'bold' : 'normal', TEXT);
    const lines = doc.splitTextToSize(upper(text), contentWidth) as string[];
    for (const l of lines) {
      ensureSpace(LINE_HEIGHT);
      doc.text(l, MARGIN_X, y);
      y += LINE_HEIGHT;
    }
    y += opts.gapAfter ?? 8;
  }

  // Grade de 2 colunas (rótulo pequeno em cima, valor embaixo), como no modelo.
  function fieldGrid(fields: Field[]) {
    const colWidth = contentWidth / 2;
    for (let i = 0; i < fields.length; i += 2) {
      ensureSpace(28);
      fields.slice(i, i + 2).forEach((f, col) => {
        const x = MARGIN_X + col * colWidth;
        setText(7, 'bold', MUTED);
        doc.text(upper(f.label), x, y);
        setText(10, 'bold', TEXT);
        const value = doc.splitTextToSize(upper(f.value), colWidth - 10) as string[];
        doc.text(value[0] ?? '', x, y + 12);
      });
      y += 28;
    }
  }

  // ─── Cabeçalho (igual à microscopia) ───────────────────────────
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
      console.warn('[usgReportPdf] falha ao embutir logo no PDF:', err);
    }
  }

  setText(16, 'bold', PRIMARY);
  doc.text(doctor.clinic_name || 'MicroLaudo', textX, y);
  // Título do laudo à direita, como no modelo ("LAUDO MÉDICO / ULTRASSONOGRAFIA").
  setText(13, 'bold', TEXT);
  doc.text('LAUDO MÉDICO', pageWidth - MARGIN_X, y, { align: 'right' });
  y += 18;

  setText(10, 'normal', [22, 78, 99]);
  doc.text(doctorLine(doctor), textX, y);
  setText(8, 'bold', MUTED);
  doc.text('ULTRASSONOGRAFIA', pageWidth - MARGIN_X, y, { align: 'right' });
  y += 14;

  if (doctor.clinic_address || doctor.clinic_phone) {
    setText(9, 'normal', MUTED);
    doc.text([doctor.clinic_address, doctor.clinic_phone].filter(Boolean).join(' — '), textX, y);
    y += 14;
  }
  if (logoEmbedded) {
    const logoBottom = headerTopY - 12 + LOGO_SIZE;
    if (y < logoBottom + 4) y = logoBottom + 4;
  }
  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(1.2);
  doc.line(MARGIN_X, y, pageWidth - MARGIN_X, y);
  y += 24;

  // ─── Identificação do paciente ─────────────────────────────────
  heading('Identificação do paciente');
  fieldGrid(patientFields(report));
  y += 4;

  // ─── Procedimentos realizados (SIGTAP) ─────────────────────────
  heading('Procedimentos realizados');
  setText(10, 'normal', TEXT);
  ensureSpace(LINE_HEIGHT);
  doc.text(USG_TRANSVAGINAL_SIGTAP.code, MARGIN_X, y);
  doc.text(upper(USG_TRANSVAGINAL_SIGTAP.name), MARGIN_X + 110, y);
  y += LINE_HEIGHT + 12;

  // ─── Achados / descrição ───────────────────────────────────────
  heading('Achados / Descrição');
  paragraph(USG_TRANSVAGINAL_TITLE, { bold: true, gapAfter: 10 });
  if (content.technique.trim()) {
    paragraph('Técnica:', { bold: true, gapAfter: 4 });
    paragraph(content.technique, { gapAfter: 10 });
  }
  paragraph('Análise:', { bold: true, gapAfter: 4 });
  for (const p of analysisParagraphs(content)) paragraph(p);
  if (report.conclusion?.trim()) {
    y += 2;
    paragraph('Opinião do relatório:', { bold: true, gapAfter: 4 });
    paragraph(report.conclusion.trim());
  }

  // ─── Data/hora + assinatura ────────────────────────────────────
  const sigWidth = 200;
  ensureSpace(130);
  y += 20;
  setText(10, 'normal', TEXT);
  doc.text(formatDateTimeLongBR(signedAt), pageWidth - MARGIN_X, y, { align: 'right' });
  y += 16;
  const sigX = MARGIN_X + (contentWidth - sigWidth) / 2;
  if (assets.signatureUrl) {
    try {
      const signatureDataUrl = await loadImageAsDataUrl(assets.signatureUrl);
      const format = signatureDataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      doc.addImage(signatureDataUrl, format, sigX + 20, y, sigWidth - 40, 60);
    } catch (err) {
      console.warn('[usgReportPdf] falha ao embutir assinatura no PDF:', err);
    }
  }
  y += 64;
  doc.setDrawColor(...SUBTLE);
  doc.setLineWidth(0.5);
  doc.line(sigX, y, sigX + sigWidth, y);
  y += 14;
  setText(10, 'bold', TEXT);
  doc.text(upper(doctor.full_name), pageWidth / 2, y, { align: 'center' });
  y += 13;
  setText(9, 'normal', MUTED);
  doc.text(`CRM ${doctor.crm}${doctor.rqe ? ` — RQE ${doctor.rqe}` : ''}`, pageWidth / 2, y, { align: 'center' });

  // ─── Rodapé em todas as páginas ────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    setText(8, 'normal', SUBTLE);
    doc.text(`Revisão ${report.revision_number}`, MARGIN_X, 812);
    doc.text(`${i} / ${pageCount}`, pageWidth - MARGIN_X, 812, { align: 'right' });
  }

  return doc.output('blob');
}

// Margens da página no nativo (pt). Passadas ao expo-print (`margins`, só iOS): assim
// valem em todas as páginas — padding no <body> só afastaria o topo da 1ª página.
export const USG_PDF_PAGE_MARGINS = { top: 40, bottom: 40, left: 40, right: 40 };

// Versão HTML do mesmo laudo para o nativo (expo-print), com o mesmo conteúdo e ordem
// do jsPDF acima. Diferença: o expo-print não tem rodapé por página, então
// "Revisão N" vai uma vez, no fim do documento (como no PDF nativo da microscopia).
export async function buildUsgReportPdfHtml(
  report: ReportRow,
  doctor: DoctorRow,
  assets: ReportPdfAssets = {},
  signedAt: Date = new Date(report.updated_at),
): Promise<string> {
  const content = parseUsgContent(report.content);
  const esc = (text: string) => escapeHtml(text);
  const escUpper = (text: string) => escapeHtml(upper(text));

  const heading = (text: string) => `<div class="heading">${escUpper(text)}</div>`;
  const paragraph = (text: string, bold = false) => `<p class="paragraph${bold ? ' bold' : ''}">${escUpper(text)}</p>`;
  const label = (text: string) => `<p class="paragraph bold label">${escUpper(text)}</p>`;

  let logoImg = '';
  if (assets.logoUrl) {
    try {
      logoImg = `<img src="${await loadImageAsDataUrl(assets.logoUrl)}" class="logo" />`;
    } catch (err) {
      console.warn('[usgReportPdf] falha ao embutir logo no PDF:', err);
    }
  }

  let signatureImg = '';
  if (assets.signatureUrl) {
    try {
      signatureImg = `<img src="${await loadImageAsDataUrl(assets.signatureUrl)}" class="signature-img" />`;
    } catch (err) {
      console.warn('[usgReportPdf] falha ao embutir assinatura no PDF:', err);
    }
  }

  const addressLine = [doctor.clinic_address, doctor.clinic_phone].filter(Boolean).join(' — ');

  const fieldsHtml = patientFields(report)
    .map(
      (f) =>
        `<div class="field"><div class="field-label">${escUpper(f.label)}</div><div class="field-value">${escUpper(f.value)}</div></div>`,
    )
    .join('');

  const techniqueHtml = content.technique.trim()
    ? `${label('Técnica:')}${paragraph(content.technique)}<div class="gap"></div>`
    : '';
  const analysisHtml = analysisParagraphs(content)
    .map((p) => paragraph(p))
    .join('');
  const opinionHtml = report.conclusion?.trim()
    ? `${label('Opinião do relatório:')}${paragraph(report.conclusion.trim())}`
    : '';

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; }
      body { font-family: Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; font-size: 10pt; }
      .header { display: flex; align-items: flex-start; gap: 12px; }
      .logo { width: 50px; height: 50px; object-fit: contain; }
      .header-text { flex: 1; }
      .header-title { text-align: right; }
      .clinic-name { font-size: 16pt; font-weight: bold; color: #0891b2; margin: 0 0 4px; }
      .doctor-line { font-size: 10pt; color: #164e63; margin: 0 0 4px; }
      .address-line { font-size: 9pt; color: #64748b; margin: 0; }
      .report-title { font-size: 13pt; font-weight: bold; margin: 0 0 4px; }
      .report-subtitle { font-size: 8pt; font-weight: bold; color: #64748b; margin: 0; }
      .divider { border: none; border-top: 1.2pt solid #0891b2; margin: 10px 0 20px; }
      .heading {
        font-size: 9pt; font-weight: bold; color: #0891b2;
        border-bottom: 0.8pt solid #a5f3fc; padding-bottom: 3px; margin: 16px 0 10px;
        page-break-after: avoid;
      }
      .fields { display: flex; flex-wrap: wrap; }
      .field { width: 50%; padding-right: 10px; margin-bottom: 10px; }
      .field-label { font-size: 7pt; font-weight: bold; color: #64748b; }
      .field-value { font-size: 10pt; font-weight: bold; margin-top: 2px; }
      .procedure { display: flex; font-size: 10pt; }
      .procedure-code { width: 110px; }
      .paragraph { font-size: 10pt; line-height: 1.3; margin: 0 0 8px; }
      .paragraph.bold { font-weight: bold; }
      .paragraph.label { margin-bottom: 4px; page-break-after: avoid; }
      .gap { height: 4px; }
      .signature-block { page-break-inside: avoid; margin-top: 28px; }
      .signed-at { text-align: right; font-size: 10pt; margin-bottom: 8px; }
      .signature { text-align: center; }
      .signature-img { width: 160px; height: 60px; object-fit: contain; }
      .signature-space { height: 60px; }
      .signature-line { width: 200px; border-top: 0.5pt solid #94a3b8; margin: 4px auto 6px; }
      .signature-name { font-size: 10pt; font-weight: bold; }
      .signature-crm { font-size: 9pt; color: #64748b; margin-top: 2px; }
      .footer { font-size: 8pt; color: #94a3b8; margin-top: 24px; }
    </style>
  </head>
  <body>
    <div class="header">
      ${logoImg}
      <div class="header-text">
        <p class="clinic-name">${esc(doctor.clinic_name || 'MicroLaudo')}</p>
        <p class="doctor-line">${esc(doctorLine(doctor))}</p>
        ${addressLine ? `<p class="address-line">${esc(addressLine)}</p>` : ''}
      </div>
      <div class="header-title">
        <p class="report-title">LAUDO MÉDICO</p>
        <p class="report-subtitle">ULTRASSONOGRAFIA</p>
      </div>
    </div>
    <hr class="divider" />

    ${heading('Identificação do paciente')}
    <div class="fields">${fieldsHtml}</div>

    ${heading('Procedimentos realizados')}
    <div class="procedure">
      <div class="procedure-code">${esc(USG_TRANSVAGINAL_SIGTAP.code)}</div>
      <div>${escUpper(USG_TRANSVAGINAL_SIGTAP.name)}</div>
    </div>

    ${heading('Achados / Descrição')}
    ${paragraph(USG_TRANSVAGINAL_TITLE, true)}
    <div class="gap"></div>
    ${techniqueHtml}
    ${label('Análise:')}
    ${analysisHtml}
    ${opinionHtml}

    <div class="signature-block">
      <div class="signed-at">${esc(formatDateTimeLongBR(signedAt))}</div>
      <div class="signature">
        ${signatureImg || '<div class="signature-space"></div>'}
        <div class="signature-line"></div>
        <div class="signature-name">${escUpper(doctor.full_name)}</div>
        <div class="signature-crm">${esc(`CRM ${doctor.crm}${doctor.rqe ? ` — RQE ${doctor.rqe}` : ''}`)}</div>
      </div>
    </div>

    <div class="footer">Revisão ${report.revision_number}</div>
  </body>
</html>`;
}
