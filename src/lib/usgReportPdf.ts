import { USG_TRANSVAGINAL_SIGTAP, USG_TRANSVAGINAL_TITLE } from '@/constants/usg-options';

import { calculateAge, formatDateBR, formatDateTimeLongBR } from './date';
import { formatCpf, formatSusCard } from './format';
import { loadJsPdf } from './jspdfLoader';
import { loadImageAsDataUrl, type ReportPdfAssets } from './reportPdf';
import { parseUsgContent } from './usgContent';
import { resolveUsgAnalysisText } from './usgText';

import type { DoctorRow, ReportRow } from '@/types/database';

// PDF do laudo de USG transvaginal (jsPDF — só web nesta sprint; ver services/pdf.ts).
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
  function fieldGrid(fields: { label: string; value: string }[]) {
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
  const age = calculateAge(report.patient_birth_date, report.collection_date);
  const fields: { label: string; value: string }[] = [{ label: 'Paciente', value: report.patient_name }];
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
  fieldGrid(fields);
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
  for (const p of resolveUsgAnalysisText(content).split(/\n\s*\n/)) {
    if (p.trim()) paragraph(p.trim().replace(/\n/g, ' '));
  }
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
