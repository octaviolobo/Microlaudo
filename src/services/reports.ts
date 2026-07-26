import { supabase } from './supabase';
import { AppError, ErrorCodes } from '@/lib/errors';
import type { ReportRow, ReportUpdate } from '@/types/database';
import type { PatientData } from '@/types/report';

export async function createReport(patient: PatientData): Promise<ReportRow> {
  const { data: doctor, error: doctorError } = await supabase
    .from('doctors')
    .select('id')
    .single();

  if (doctorError) throw new AppError(ErrorCodes.REPORT_CREATE_FAILED, doctorError.message, doctorError);

  const { data, error } = await supabase
    .from('reports')
    .insert({ ...patient, doctor_id: doctor.id, status: 'draft' })
    .select()
    .single();

  if (error) throw new AppError(ErrorCodes.REPORT_CREATE_FAILED, error.message, error);
  return data;
}

export async function updateReport(id: string, patch: ReportUpdate): Promise<ReportRow> {
  const { data, error } = await supabase
    .from('reports')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new AppError(ErrorCodes.REPORT_UPDATE_FAILED, error.message, error);
  return data;
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
  return updateReport(id, patch);
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
    // Escapa % e _ para evitar wildcards vindos do usuário
    const escaped = search.replace(/[%_]/g, (m) => `\\${m}`);
    query = query.ilike('patient_name', `%${escaped}%`);
  }

  const { data, error } = await query;
  if (error) throw new AppError(ErrorCodes.REPORT_NOT_FOUND, error.message, error);
  return data ?? [];
}
