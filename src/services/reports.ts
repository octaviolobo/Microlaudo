import { USG_TRANSVAGINAL_MATERIAL, USG_TRANSVAGINAL_METHOD } from '@/constants/usg-options';
import { AppError, ErrorCodes } from '@/lib/errors';
import { createDefaultUsgContent, parseUsgContent, usgContentToJson, validateUsgContent } from '@/lib/usgContent';
import {
  normalizeDigits,
  validateCpf,
  validateLongText,
  validatePatientName,
  validateRequestingDoctor,
  validateSusCard,
} from '@/lib/validation';

import { isPaywallError } from './billing';
import { supabase } from './supabase';

import type { ReportInsert, ReportRow, ReportUpdate } from '@/types/database';
import type { PatientData, ReportType } from '@/types/report';

// Valida CPF/cartão SUS e normaliza para só dígitos (formato exigido pela migration 014).
// Só toca nas chaves presentes no patch, para não apagar valores num update parcial.
function normalizePatientDocs<T extends { patient_cpf?: string | null; patient_sus_card?: string | null }>(
  data: T,
): T {
  const out = { ...data };
  if ('patient_cpf' in data) {
    validateCpf(data.patient_cpf);
    out.patient_cpf = normalizeDigits(data.patient_cpf);
  }
  if ('patient_sus_card' in data) {
    validateSusCard(data.patient_sus_card);
    out.patient_sus_card = normalizeDigits(data.patient_sus_card);
  }
  return out;
}

// Campos fixos por tipo na criação. `material`/`method` têm default de microscopia no
// banco, então tipos novos precisam enviá-los explicitamente.
function typeDefaults(type: ReportType): Partial<ReportInsert> {
  switch (type) {
    case 'usg_transvaginal':
      return {
        report_type: type,
        material: USG_TRANSVAGINAL_MATERIAL,
        method: USG_TRANSVAGINAL_METHOD,
        content: usgContentToJson(createDefaultUsgContent()),
      };
    case 'microscopia':
      // Usa o default do banco ('microscopia'): o fluxo de microscopia não depende da
      // coluna nova existir.
      return {};
  }
}

export async function createReport(
  patient: PatientData,
  reportType: ReportType = 'microscopia',
): Promise<ReportRow> {
  validatePatientName(patient.patient_name);
  validateRequestingDoctor(patient.requesting_doctor);
  const normalizedPatient = normalizePatientDocs(patient);

  const { data: doctor, error: doctorError } = await supabase
    .from('doctors')
    .select('id')
    .single();

  if (doctorError) throw new AppError(ErrorCodes.REPORT_CREATE_FAILED, doctorError.message, doctorError);

  const { data, error } = await supabase
    .from('reports')
    .insert({ ...normalizedPatient, ...typeDefaults(reportType), doctor_id: doctor.id, status: 'draft' })
    .select()
    .single();

  if (error) throw new AppError(ErrorCodes.REPORT_CREATE_FAILED, error.message, error);
  return data;
}

export async function updateReport(id: string, patch: ReportUpdate): Promise<ReportRow> {
  if (patch.patient_name != null) validatePatientName(patch.patient_name);
  validateRequestingDoctor(patch.requesting_doctor);
  validateLongText(patch.conclusion, 'Conclusão');
  validateLongText(patch.microscopic_description, 'Descrição microscópica');
  validateLongText(patch.bibliographic_reference, 'Referência bibliográfica');
  // `content` só é aceito no formato do USG: parse (forma; campo inválido volta ao default)
  // + validação (faixas de valores e tamanho dos textos).
  // O tipo do laudo não muda depois de criado (trigger da migration 014), então não há
  // `content` de microscopia para validar.
  // Salva a versão parseada (nunca o objeto cru), para não persistir campos desconhecidos.
  const safePatch = normalizePatientDocs(patch);
  if (patch.content != null) {
    const content = parseUsgContent(patch.content);
    validateUsgContent(content);
    safePatch.content = usgContentToJson(content);
  }

  const { data, error } = await supabase
    .from('reports')
    .update(safePatch)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new AppError(ErrorCodes.REPORT_UPDATE_FAILED, error.message, error);
  return data;
}

// Registra em audit_log (best-effort — nunca bloqueia o fluxo principal do laudo).
// Ver docs/analise-seguranca.md §5: "Laudo finalizado" é evento obrigatório desde o dia 1.
async function logReportFinalized(reportId: string, revision: number): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('audit_log').insert({
      event_type: 'report.finalized',
      actor_id: user.id,
      resource_id: reportId,
      metadata: { revision },
    });
    if (error) console.warn('[reports] falha ao registrar audit_log:', error.message);
  } catch (err) {
    console.warn('[reports] falha ao registrar audit_log:', err);
  }
}

// Marca o laudo como finalizado. Se o laudo já havia sido finalizado antes (detectado pelo
// status atual === 'completed' OU pela existência de pdf_url), incrementa revision_number
// para preservar o histórico de revisões (RF21 / F25).
export async function finalizeReport(id: string): Promise<ReportRow> {
  const current = await getReport(id);
  const isRefinalizing = current.status === 'completed' || Boolean(current.pdf_url);
  const patch: ReportUpdate = { status: 'completed' };
  if (isRefinalizing) {
    patch.revision_number = (current.revision_number ?? 1) + 1;
  }
  let updated: ReportRow;
  try {
    updated = await updateReport(id, patch);
  } catch (err) {
    // Trigger reports_enforce_entitlement (migration 015): sem teste e sem assinatura.
    if (err instanceof AppError && isPaywallError(err.cause)) {
      throw new AppError(ErrorCodes.PAYWALL_REQUIRED, 'Assinatura necessária para finalizar o laudo', err.cause);
    }
    throw err;
  }
  void logReportFinalized(id, updated.revision_number);
  return updated;
}

export async function getReport(id: string): Promise<ReportRow> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new AppError(ErrorCodes.REPORT_NOT_FOUND, error.message, error);
  return data;
}

// Lista os laudos do médico autenticado. RLS (supabase/migrations/005_enable_rls.sql)
// já garante isolamento por auth.uid() → doctors.user_id → reports.doctor_id, então não
// filtramos por doctor_id manualmente aqui.
export async function listReportsByDoctor(params?: { search?: string }): Promise<ReportRow[]> {
  let query = supabase.from('reports').select('*').order('created_at', { ascending: false });

  const search = params?.search?.trim();
  if (search) {
    // Escapa \, % e _ para evitar wildcards vindos do usuário. A barra invertida
    // precisa ser escapada também: como é o caractere de escape do ILIKE, um
    // paciente com "\" no nome quebrava o wildcard final sem isso.
    const escaped = search.replace(/[\\%_]/g, (m) => `\\${m}`);
    query = query.ilike('patient_name', `%${escaped}%`);
  }

  const { data, error } = await query;
  if (error) throw new AppError(ErrorCodes.REPORT_LIST_FAILED, error.message, error);
  return data ?? [];
}
