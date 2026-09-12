import { useEffect, useState } from 'react';
import { ScrollView, View, TouchableOpacity, Text, Image, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { StepIndicator } from '@/components/report/StepIndicator';
import { Button, MessageBox } from '@/components/ui';
import { useReportStore } from '@/stores/reportStore';
import { finalizeReport, getReport, updateReport } from '@/services/reports';
import { listReportImages, getSignedImageUrl } from '@/services/images';
import { generateAndUploadReportPdf, getSignedPdfUrl } from '@/services/pdf';
import { classifyNugentScore } from '@/lib/nugent';
import { evaluateAmsel } from '@/lib/amsel';
import { AppError } from '@/lib/errors';
import { Colors, Typography, Spacing } from '@/constants/theme';
import { FINDINGS_FIELDS } from '@/constants/findings-options';

import { stepStyles as s } from './_stepStyles';

import type { ReportRow } from '@/types/database';

const FIELD_LABEL_KEYS: Record<string, string> = {
  lactobacilli: 'lactobacilli',
  cocci: 'cocci',
  coccobacilli_gram_pos: 'coccobacilliGramPos',
  coccobacilli_gram_neg: 'coccobacilliGramNeg',
  leukocytes: 'leukocytes',
  red_blood_cells: 'redBloodCells',
  epithelial_cells: 'epithelialCells',
  fungal_elements: 'fungalElements',
  trichomonas: 'trichomonas',
  clue_cells: 'clueCells',
  mucus: 'mucus',
};

export function PreviewScreen() {
  const { t } = useTranslation('report');
  const { t: tc } = useTranslation('common');
  const { t: tClinical } = useTranslation('clinical');

  const reportId = useReportStore((state) => state.reportId);
  const isDirty = useReportStore((state) => state.isDirty);
  const reset = useReportStore((state) => state.reset);
  const hydrate = useReportStore((state) => state.hydrate);

  const [report, setReport] = useState<ReportRow | null>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modo "somente visualização": chegamos aqui pelo histórico (laudo já finalizado)
  // e o médico não editou nada nesta sessão. Nesse caso escondemos "Finalizar" e
  // oferecemos "Editar" (que volta para rascunho) + "Baixar PDF".
  const isViewOnly = report?.status === 'completed' && !isDirty;

  useEffect(() => {
    if (!reportId) return;
    (async () => {
      try {
        const [data, images] = await Promise.all([getReport(reportId), listReportImages(reportId)]);
        setReport(data);
        const urls = await Promise.all(images.map((img) => getSignedImageUrl(img.image_url)));
        setPhotoUrls(urls);
      } catch {
        setError(tc('genericError'));
      } finally {
        setIsLoading(false);
      }
    })();
  }, [reportId, tc]);

  async function handleFinalize() {
    if (!reportId || !report) return;
    try {
      setIsFinalizing(true);
      setError(null);
      // finalizeReport() primeiro para obter o revision_number já incrementado (se for
      // re-finalização) — o PDF regenerado precisa refletir a revisão nova, não a antiga.
      const finalized = await finalizeReport(reportId);
      if (!finalized.pdf_url || isDirty) {
        await generateAndUploadReportPdf(finalized, photoUrls);
      }
      reset();
      router.replace('/(tabs)/home');
    } catch (err) {
      setError(err instanceof AppError ? err.message : tc('genericError'));
    } finally {
      setIsFinalizing(false);
    }
  }

  async function handleEdit() {
    if (!reportId || !report) return;
    try {
      setIsEditing(true);
      setError(null);
      // Reabre para edição: volta para rascunho (revision_number será incrementado ao re-finalizar)
      const updated = await updateReport(reportId, { status: 'draft' });
      hydrate(updated);
      router.replace('/report/patient');
    } catch (err) {
      setError(err instanceof AppError ? err.message : tc('genericError'));
    } finally {
      setIsEditing(false);
    }
  }

  // Tenta compartilhar o PDF como arquivo (folha nativa do SO, com o PDF anexado)
  // em vez de só um link. Retorna false se o navegador não suportar ou o usuário
  // cancelar, para o chamador cair no fallback de abrir a URL assinada.
  async function tryShareReportPdf(url: string): Promise<boolean> {
    const nav = navigator as Navigator & {
      canShare?: (data: ShareData) => boolean;
    };
    if (!nav.share || !nav.canShare) return false;
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const file = new File([blob], `laudo-${report?.patient_name ?? 'microlaudo'}.pdf`, {
        type: 'application/pdf',
      });
      if (!nav.canShare({ files: [file] })) return false;
      await nav.share({ files: [file] });
      return true;
    } catch {
      return false;
    }
  }

  async function handleDownloadPdf() {
    if (!report) return;
    try {
      setIsGeneratingPdf(true);
      setError(null);
      const path = report.pdf_url ?? (await generateAndUploadReportPdf(report, photoUrls));
      setReport((prev) => (prev ? { ...prev, pdf_url: path } : prev));
      const url = await getSignedPdfUrl(path);
      if (Platform.OS === 'web') {
        // Só recorre à navegação na própria aba se o compartilhamento nativo
        // (com o arquivo já anexado) não estiver disponível — abrir uma aba
        // nova aqui é bloqueado por vários navegadores mobile.
        const shared = await tryShareReportPdf(url);
        if (!shared) window.location.href = url;
      }
    } catch (err) {
      setError(err instanceof AppError ? err.message : tc('genericError'));
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  if (isLoading || !report) {
    return (
      <View style={s.container}>
        <Text style={s.placeholder}>{tc('loading')}</Text>
      </View>
    );
  }

  const amsel = evaluateAmsel({
    homogeneous_discharge: report.amsel_homogeneous_discharge,
    whiff_test: report.amsel_whiff_test,
    clue_cells_20: report.amsel_clue_cells_20,
    ph_above_45: report.amsel_ph_above_45,
  });

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {!isViewOnly && <StepIndicator currentStep={6} />}
        <Text style={s.title}>{t('steps.preview.title')}</Text>
        {report.revision_number > 1 && (
          <Text style={previewStyles.revisionBadge}>
            {t('revision', { number: report.revision_number })}
          </Text>
        )}

        <Text style={previewStyles.sectionTitle}>{t('steps.patient.title')}</Text>
        <Text style={previewStyles.line}>{report.patient_name}</Text>
        <Text style={previewStyles.line}>
          {t('steps.patient.collectionDate')}: {report.collection_date}
        </Text>
        {report.requesting_doctor && (
          <Text style={previewStyles.line}>
            {t('steps.patient.requestingDoctor')}: {report.requesting_doctor}
          </Text>
        )}

        {photoUrls.length > 0 && (
          <>
            <View style={previewStyles.divider} />
            <Text style={previewStyles.sectionTitle}>{t('steps.photos.title')}</Text>
            <View style={previewStyles.photoRow}>
              {photoUrls.map((url) => (
                <Image key={url} source={{ uri: url }} style={previewStyles.photo} />
              ))}
            </View>
          </>
        )}

        <View style={previewStyles.divider} />
        <Text style={previewStyles.sectionTitle}>{t('steps.findings.title')}</Text>
        {FINDINGS_FIELDS.map((field) => {
          const value = report[field];
          if (!value) return null;
          return (
            <Text key={field} style={previewStyles.line}>
              {tClinical(`findings.${FIELD_LABEL_KEYS[field]}`)}: {tClinical(`findingLevels.${value}`)}
            </Text>
          );
        })}
        {report.microscopic_description && (
          <Text style={previewStyles.line}>{report.microscopic_description}</Text>
        )}

        <View style={previewStyles.divider} />
        <Text style={previewStyles.sectionTitle}>{tClinical('nugent.title')}</Text>
        {report.nugent_score != null ? (
          <Text style={previewStyles.line}>
            {tClinical('nugent.result', { score: report.nugent_score })} —{' '}
            {tClinical(`nugent.classifications.${classifyNugentScore(report.nugent_score)}`)}
          </Text>
        ) : (
          <Text style={previewStyles.line}>—</Text>
        )}

        <Text style={previewStyles.sectionTitle}>{tClinical('amsel.title')}</Text>
        <Text style={previewStyles.line}>
          {tClinical('amsel.result', { count: amsel.positiveCount })}
          {amsel.diagnosis ? ` — ${tClinical('amsel.diagnosis')}` : ''}
        </Text>

        {report.conclusion && (
          <>
            <View style={previewStyles.divider} />
            <Text style={previewStyles.sectionTitle}>{t('steps.conclusion.title')}</Text>
            <Text style={previewStyles.line}>{report.conclusion}</Text>
          </>
        )}

        {error && <MessageBox message={error} type="error" />}

        <View style={previewStyles.divider} />
        <Button
          label={isGeneratingPdf ? tc('loading') : t('steps.preview.download')}
          onPress={handleDownloadPdf}
          variant="secondary"
          loading={isGeneratingPdf}
          fullWidth
          icon="document-text-outline"
        />
      </ScrollView>

      <View style={s.nav}>
        <TouchableOpacity style={s.backButton} onPress={() => router.back()}>
          <Text style={s.backText}>{t('nav.back')}</Text>
        </TouchableOpacity>
        {isViewOnly ? (
          <TouchableOpacity style={s.nextButton} onPress={handleEdit} disabled={isEditing}>
            <Text style={s.nextText}>{isEditing ? tc('loading') : t('history.edit')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={s.finalizeButton} onPress={handleFinalize} disabled={isFinalizing}>
            <Text style={s.finalizeText}>{isFinalizing ? tc('loading') : t('nav.finalize')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default PreviewScreen;

const previewStyles = StyleSheet.create({
  revisionBadge: {
    fontSize: 12,
    fontFamily: Typography.bodyMedium,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: -Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: Typography.bodyMedium,
    color: Colors.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  line: {
    fontSize: 15,
    fontFamily: Typography.body,
    color: Colors.text,
    marginBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  photoRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
});
