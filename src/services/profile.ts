import { supabase } from './supabase';
import { AppError, ErrorCodes } from '@/lib/errors';
import type { DoctorRow } from '@/types/database';

export type ProfileUpdateInput = {
  full_name: string;
  crm: string;
  rqe?: string | null;
  preferred_language?: string;
  clinic_name?: string | null;
  clinic_cnpj?: string | null;
  clinic_address?: string | null;
  clinic_phone?: string | null;
  default_reference?: string;
  logo_url?: string | null;
  signature_url?: string | null;
};

// RLS filtra automaticamente pelo auth.uid() — não precisa passar doctor_id
export async function getProfile(): Promise<DoctorRow> {
  const { data, error } = await supabase
    .from('doctors')
    .select('*')
    .single();

  if (error) throw new AppError(ErrorCodes.PROFILE_NOT_FOUND, error.message, error);
  return data;
}

export async function updateProfile(input: ProfileUpdateInput): Promise<DoctorRow> {
  const { data, error } = await supabase
    .from('doctors')
    .update(input)
    .select()
    .single();

  if (error) throw new AppError(ErrorCodes.PROFILE_UPDATE_FAILED, error.message, error);
  return data;
}
