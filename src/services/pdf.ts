import { AppError, ErrorCodes } from '@/lib/errors';
import { buildReportPdfBlob, type ReportPdfAssets } from '@/lib/reportPdf';

import { supabase } from './supabase';
import { getProfile } from './profile';
import { getSignedDoctorAssetUrl } from './assets';
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

    // Resolve URLs assinadas para logo/assinatura (best-effort — se falhar,
    // o PDF ainda é gerado sem essas imagens).
    const assets: ReportPdfAssets = {};
    if (doctor.logo_url) {
      try {
        assets.logoUrl = await getSignedDoctorAssetUrl(doctor.logo_url);
      } catch {
        // silencia — o PDF simplesmente fica sem logo
      }
    }
    if (doctor.signature_url) {
      try {
        assets.signatureUrl = await getSignedDoctorAssetUrl(doctor.signature_url);
      } catch {
        // silencia — o PDF fica sem assinatura
      }
    }

    blob = await buildReportPdfBlob(report, doctor, photoUrls, assets);
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
