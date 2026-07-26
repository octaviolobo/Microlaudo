import { supabase } from './supabase';
import { AppError, ErrorCodes } from '@/lib/errors';
import { buildReportPdfBlob } from '@/lib/reportPdf';
import { getProfile } from './profile';
import { updateReport } from './reports';
import type { ReportRow } from '@/types/database';

export async function generateAndUploadReportPdf(
  report: ReportRow,
  photoUrls: string[],
): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new AppError(ErrorCodes.PDF_GENERATION_FAILED, 'Usuário não autenticado');

  let blob: Blob;
  try {
    const doctor = await getProfile();
    blob = await buildReportPdfBlob(report, doctor, photoUrls);
  } catch (err) {
    throw new AppError(ErrorCodes.PDF_GENERATION_FAILED, 'Falha ao gerar o PDF', err);
  }

  const path = `${user.id}/${report.id}/laudo.pdf`;

  const { error: uploadError } = await supabase.storage
    .from('report-pdfs')
    .upload(path, blob, { contentType: 'application/pdf', upsert: true });

  if (uploadError) throw new AppError(ErrorCodes.PDF_UPLOAD_FAILED, uploadError.message, uploadError);

  await updateReport(report.id, { pdf_url: path });

  return path;
}

export async function getSignedPdfUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('report-pdfs').createSignedUrl(path, 3600);
  if (error) throw new AppError(ErrorCodes.PDF_UPLOAD_FAILED, error.message, error);
  return data.signedUrl;
}
