import { AppError, ErrorCodes } from '@/lib/errors';

import { supabase } from './supabase';

export type DoctorAssetKind = 'logo' | 'signature';

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

// Convenção: doctor-assets/{user_id}/{kind}-{timestamp}.{ext}
export async function uploadDoctorAsset(kind: DoctorAssetKind, blob: Blob): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new AppError(ErrorCodes.IMAGE_UPLOAD_FAILED, 'Usuário não autenticado');

  const extension = EXTENSION_BY_MIME[blob.type] ?? 'jpg';
  const path = `${user.id}/${kind}-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from('doctor-assets')
    .upload(path, blob, { contentType: blob.type, upsert: false });

  if (uploadError) {
    throw new AppError(ErrorCodes.IMAGE_UPLOAD_FAILED, uploadError.message, uploadError);
  }

  return path;
}

export async function deleteDoctorAsset(path: string): Promise<void> {
  const { error } = await supabase.storage.from('doctor-assets').remove([path]);
  if (error) throw new AppError(ErrorCodes.IMAGE_UPLOAD_FAILED, error.message, error);
}

export async function getSignedDoctorAssetUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('doctor-assets')
    .createSignedUrl(path, 3600);

  if (error) throw new AppError(ErrorCodes.IMAGE_DOWNLOAD_FAILED, error.message, error);
  return data.signedUrl;
}
