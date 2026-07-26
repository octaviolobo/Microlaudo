import { supabase } from './supabase';
import { AppError, ErrorCodes } from '@/lib/errors';

// Chama a Edge Function delete-account, que valida o JWT, apaga os objetos de
// Storage sob {user_id}/ nos 3 buckets, registra em audit_log e finalmente
// remove a linha em auth.users (cascateia doctors → reports → report_images).
export async function deleteAccount(): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ success?: boolean; error?: string }>(
    'delete-account',
    { method: 'POST' },
  );

  if (error) {
    throw new AppError(ErrorCodes.ACCOUNT_DELETE_FAILED, error.message, error);
  }
  if (!data?.success) {
    throw new AppError(
      ErrorCodes.ACCOUNT_DELETE_FAILED,
      data?.error ?? 'Falha ao excluir conta',
    );
  }
}
