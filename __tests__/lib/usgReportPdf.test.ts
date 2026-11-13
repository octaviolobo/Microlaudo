import { describe, expect, it, jest } from '@jest/globals';

import { createDefaultUsgContent, usgContentToJson } from '@/lib/usgContent';
import { buildUsgReportPdfBlob } from '@/lib/usgReportPdf';

import type { DoctorRow, ReportRow } from '@/types/database';

// O app carrega o build browser do jsPDF via import dinâmico; no Jest (Node) usamos o
// build node, que gera o mesmo PDF.
// O setup do jest-expo instala o TextDecoder do Expo (só UTF-8), que o jsPDF não aceita
// ("Unknown encoding: latin1" — o mesmo erro do Hermes); aqui usamos o do Node.
jest.mock('@/lib/jspdfLoader', () => ({
  loadJsPdf: async () => {
    globalThis.TextDecoder = jest.requireActual<typeof import('util')>('util')
      .TextDecoder as unknown as typeof globalThis.TextDecoder;
    return jest.requireActual<{ jsPDF: unknown }>('jspdf/dist/jspdf.node.min.js').jsPDF;
  },
}));

// Dados fictícios (nunca usar dados reais de paciente em teste).
const doctor = {
  id: 'd1',
  user_id: 'u1',
  full_name: 'Dra. Médica Teste',
  crm: '123456/RJ',
  rqe: null,
  clinic_name: 'Clínica Teste',
  clinic_address: 'Rua Exemplo, 100',
  clinic_phone: null,
  clinic_cnpj: null,
  logo_url: null,
  signature_url: null,
  default_reference: null,
  preferred_language: 'pt-BR',
  prodoctor_enabled: false,
  trial_reports_used: 0,
  created_at: '2026-11-06T00:00:00Z',
  updated_at: '2026-11-06T00:00:00Z',
} as DoctorRow;

function usgReport(): ReportRow {
  const c = createDefaultUsgContent();
  Object.assign(c.uterus, { length_cm: 6.3, ap_cm: 2.7, transverse_cm: 3.8 });
  Object.assign(c.endometrium, { thickness_mm: 5.7, doppler_score: 1 });
  Object.assign(c.right_ovary, { length_cm: 1.3, ap_cm: 1.1, transverse_cm: 1.2 });
  Object.assign(c.left_ovary, { characterized: false });
  return {
    id: 'r1',
    doctor_id: 'd1',
    report_type: 'usg_transvaginal',
    content: usgContentToJson(c),
    patient_name: 'Paciente Fictícia',
    patient_birth_date: '1971-01-06',
    patient_cpf: '52998224725',
    patient_sus_card: null,
    collection_date: '2026-10-22',
    requesting_doctor: 'Dr(a) Solicitante',
    conclusion: 'Exame ultrassonográfico dentro dos padrões da normalidade.',
    status: 'completed',
    revision_number: 1,
    updated_at: '2026-10-22T13:49:00Z',
  } as ReportRow;
}

async function pdfText(blob: Blob): Promise<string> {
  return Buffer.from(await blob.arrayBuffer()).toString('latin1');
}

describe('buildUsgReportPdfBlob', () => {
  it('gera um PDF válido com as seções do modelo', async () => {
    const blob = await buildUsgReportPdfBlob(usgReport(), doctor, {}, new Date(2026, 9, 22, 10, 49));
    const raw = await pdfText(blob);

    expect(raw.startsWith('%PDF-')).toBe(true);
    // jsPDF grava o texto sem compressão por padrão: dá para conferir o conteúdo.
    expect(raw).toContain('IDENTIFICA');
    expect(raw).toContain('02.05.02.018-6');
    expect(raw).toContain('ULTRASSONOGRAFIA P');
    expect(raw).toContain('6,3 X 2,7 X 3,8 CM');
    expect(raw).toContain('529.982.247-25');
    expect(raw).toContain('22 de outubro de 2026 ');
    expect(raw).toContain('CRM 123456/RJ');
  });

  it('usa o texto da análise editado pela médica', async () => {
    const report = usgReport();
    const c = createDefaultUsgContent();
    c.analysis_text = 'Texto revisado manualmente.';
    report.content = usgContentToJson(c);
    const raw = await pdfText(await buildUsgReportPdfBlob(report, doctor));
    expect(raw).toContain('TEXTO REVISADO MANUALMENTE.');
  });
});
