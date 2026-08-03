import { AppError, ErrorCodes } from '@/lib/errors';

import { supabase } from './supabase';

import type { ReportImageRow } from '@/types/database';

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export async function uploadReportImage(
  reportId: string,
  blob: Blob,
  sortOrder: 1 | 2 | 3,
): Promise<ReportImageRow> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new AppError(ErrorCodes.IMAGE_UPLOAD_FAILED, 'Usuário não autenticado');

  const extension = EXTENSION_BY_MIME[blob.type] ?? 'jpg';
  const path = `${user.id}/${reportId}/${sortOrder}-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from('report-images')
    .upload(path, blob, { contentType: blob.type });

  if (uploadError) throw new AppError(ErrorCodes.IMAGE_UPLOAD_FAILED, uploadError.message, uploadError);

  const { data, error } = await supabase
    .from('report_images')
    .insert({ report_id: reportId, image_url: path, sort_order: sortOrder })
    .select()
    .single();

  if (error) throw new AppError(ErrorCodes.IMAGE_UPLOAD_FAILED, error.message, error);
  return data;
}

export async function deleteReportImage(imageId: string, path: string): Promise<void> {
  const { error: storageError } = await supabase.storage.from('report-images').remove([path]);
  if (storageError) throw new AppError(ErrorCodes.IMAGE_UPLOAD_FAILED, storageError.message, storageError);

  const { error } = await supabase.from('report_images').delete().eq('id', imageId);
  if (error) throw new AppError(ErrorCodes.IMAGE_UPLOAD_FAILED, error.message, error);
}

export async function listReportImages(reportId: string): Promise<ReportImageRow[]> {
  const { data, error } = await supabase
    .from('report_images')
    .select('*')
    .eq('report_id', reportId)
    .order('sort_order', { ascending: true });

  if (error) throw new AppError(ErrorCodes.IMAGE_DOWNLOAD_FAILED, error.message, error);
  return data;
}

// Expiração curta (10 min) por política de segurança — ver docs/analise-seguranca.md
// e docs/arquitetura.md §7 ("URLs assinadas com expiração ≤ 10 min").
const SIGNED_URL_EXPIRY_SECONDS = 600;

export async function getSignedImageUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('report-images')
    .createSignedUrl(path, SIGNED_URL_EXPIRY_SECONDS);

  if (error) throw new AppError(ErrorCodes.IMAGE_DOWNLOAD_FAILED, error.message, error);
  return data.signedUrl;
}
