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

export async function finalizeReport(id: string): Promise<ReportRow> {
  return updateReport(id, { status: 'completed' });
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
