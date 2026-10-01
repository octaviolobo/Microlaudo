import { Platform } from 'react-native';
import { File } from 'expo-file-system';

import { AppError, ErrorCodes } from '@/lib/errors';

import { supabase } from './supabase';

import type { ReportImageRow } from '@/types/database';

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

// O ImagePicker pode retornar mimeType undefined quando não consegue
// determiná-lo — por isso a extensão do arquivo na URI (sempre presente e
// confiável) é a fonte de verdade secundária aqui.
function resolveContentType(mimeType: string | undefined, sourceUri: string): string {
  if (mimeType && mimeType in EXTENSION_BY_MIME) return mimeType;
  const ext = /\.([a-zA-Z0-9]+)(?:\?.*)?$/.exec(sourceUri)?.[1]?.toLowerCase();
  return (ext && MIME_BY_EXTENSION[ext]) ?? 'image/jpeg';
}

// storage-js (cliente do Supabase Storage) embrulha qualquer `Blob` em um
// FormData e ignora a opção `contentType` nesse caso (só a respeita para
// ArrayBuffer/string) — no React Native isso faz o servidor receber o
// Content-Type errado (a lib RN de Blob não expõe um type confiável).
// Lendo como ArrayBuffer no nativo garante que `contentType` seja aplicado.
async function readFileBody(sourceUri: string): Promise<Blob | ArrayBuffer> {
  if (Platform.OS === 'web') {
    const response = await fetch(sourceUri);
    return response.blob();
  }
  return new File(sourceUri).arrayBuffer();
}

export async function uploadReportImage(
  reportId: string,
  sourceUri: string,
  sortOrder: 1 | 2 | 3,
  mimeType?: string,
): Promise<ReportImageRow> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new AppError(ErrorCodes.IMAGE_UPLOAD_FAILED, 'Usuário não autenticado');

  const contentType = resolveContentType(mimeType, sourceUri);
  const extension = EXTENSION_BY_MIME[contentType];
  const path = `${user.id}/${reportId}/${sortOrder}-${Date.now()}.${extension}`;
  const body = await readFileBody(sourceUri);

  const { error: uploadError } = await supabase.storage
    .from('report-images')
    .upload(path, body, { contentType });

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
