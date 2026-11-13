import { useEffect, useState } from 'react';
import { ScrollView, View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { stepStyles as s } from '@app/report/_stepStyles';
import { StepIndicator } from '@/components/report/StepIndicator';
import { Button, MessageBox } from '@/components/ui';
import { USG_TOTAL_STEPS, USG_TRANSVAGINAL_SIGTAP, USG_TRANSVAGINAL_TITLE } from '@/constants/usg-options';
import { Colors, Typography, Spacing } from '@/constants/theme';
import { useReportStore } from '@/stores/reportStore';
import { finalizeReport, getReport, updateReport } from '@/services/reports';
import { generateAndUploadReportPdf, getSignedPdfUrl } from '@/services/pdf';
import { AppError, ErrorCodes } from '@/lib/errors';
import { canFinalizeNew, useSubscriptionStore } from '@/stores/subscriptionStore';
import { calculateAge, formatDateBR } from '@/lib/date';
import { formatCpf, formatSusCard } from '@/lib/format';
import { parseUsgContent } from '@/lib/usgContent';
import { resolveUsgAnalysisText } from '@/lib/usgText';
import { downloadPdfWeb, pdfFileName } from '@/lib/webPdfDownload';

import type { ReportRow } from '@/types/database';

// Step 4 do USG. Mesmo comportamento do preview da microscopia (app/report/preview.tsx):
// finalizar (gera e sobe o PDF), baixar PDF e, vindo do histórico, "Editar" (volta para
// rascunho e cria nova revisão ao re-finalizar). Só roda na web (ver _layout.tsx).
export function UsgPreviewScreen() {
  const { t } = useTranslation('report');
  const { t: tc } = useTranslation('common');

  const reportId = useReportStore((state) => state.reportId);
  const isDirty = useReportStore((state) => state.isDirty);
  const reset = useReportStore((state) => state.reset);
  const hydrate = useReportStore((state) => state.hydrate);

  const [report, setReport] = useState<ReportRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isViewOnly = report?.status === 'completed' && !isDirty;

  useEffect(() => {
    if (!reportId) return;
    getReport(reportId)
      .then(setReport)
      .catch(() => setError(tc('genericError')))
      .finally(() => setIsLoading(false));
  }, [reportId, tc]);

  // Paywall (migration 015): sem teste e sem assinatura, finalizar um laudo novo leva à
  // tela de planos. Re-finalizar (edição) não é previsto aqui: o servidor decide.
  function openPaywall() {
    router.push({ pathname: '/plans', params: { reason: 'paywall' } });
  }

  async function handleFinalize() {
    if (!reportId || !report) return;
    if (!report.first_finalized_at && !canFinalizeNew(useSubscriptionStore.getState().billing)) {
      openPaywall();
      return;
    }
    try {
      setIsFinalizing(true);
      setError(null);
      // finalizeReport() primeiro: o PDF precisa da revisão já incrementada.
      const finalized = await finalizeReport(reportId);
      if (!finalized.pdf_url || isDirty) {
        await generateAndUploadReportPdf(finalized, []);
      }
      void useSubscriptionStore.getState().refresh();
      reset();
      router.replace('/(tabs)/home');
    } catch (err) {
      if (err instanceof AppError && err.code === ErrorCodes.PAYWALL_REQUIRED) {
        void useSubscriptionStore.getState().refresh();
        openPaywall();
        return;
      }
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
      const updated = await updateReport(reportId, { status: 'draft' });
      hydrate(updated);
      router.replace('/report-usg/patient');
    } catch (err) {
      setError(err instanceof AppError ? err.message : tc('genericError'));
    } finally {
      setIsEditing(false);
    }
  }

  async function handleDownloadPdf() {
    if (!report) return;
    try {
      setIsGeneratingPdf(true);
      setError(null);
      const path = report.pdf_url ?? (await generateAndUploadReportPdf(report, []));
      setReport((prev) => (prev ? { ...prev, pdf_url: path } : prev));
      const url = await getSignedPdfUrl(path);
      await downloadPdfWeb(url, pdfFileName('laudo-usg', report.patient_name));
    } catch (err) {
      setError(err instanceof AppError ? err.message : tc('genericError'));
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  if (isLoading || !report) {
    return (
      <View style={s.container}>
        <Text style={s.placeholder}>{error ?? tc('loading')}</Text>
      </View>
    );
  }

  const content = parseUsgContent(report.content);
  const age = calculateAge(report.patient_birth_date, report.collection_date);
  const paragraphs = resolveUsgAnalysisText(content)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {!isViewOnly && <StepIndicator currentStep={4} totalSteps={USG_TOTAL_STEPS} />}
        <Text style={s.title}>{t('usg.steps.preview')}</Text>
        {report.revision_number > 1 && (
          <Text style={p.revisionBadge}>{t('revision', { number: report.revision_number })}</Text>
        )}

        <Text style={p.sectionTitle}>{t('steps.patient.title')}</Text>
        <Text style={p.line}>{report.patient_name}</Text>
        {report.patient_birth_date && (
          <Text style={p.line}>
            {t('steps.patient.birthDate')}: {formatDateBR(report.patient_birth_date)}
            {age != null ? ` (${age} anos)` : ''}
          </Text>
        )}
        {report.patient_cpf && <Text style={p.line}>CPF: {formatCpf(report.patient_cpf)}</Text>}
        {report.patient_sus_card && (
          <Text style={p.line}>Cartão SUS: {formatSusCard(report.patient_sus_card)}</Text>
        )}
        <Text style={p.line}>
          {t('steps.patient.examDate')}: {formatDateBR(report.collection_date)}
        </Text>
        {report.requesting_doctor && (
          <Text style={p.line}>
            {t('steps.patient.requestingDoctor')}: {report.requesting_doctor}
          </Text>
        )}

        <View style={p.divider} />
        <Text style={p.sectionTitle}>{t('usg.preview.procedures')}</Text>
        <Text style={p.line}>
          {USG_TRANSVAGINAL_SIGTAP.code} — {USG_TRANSVAGINAL_SIGTAP.name}
        </Text>

        <View style={p.divider} />
        <Text style={p.sectionTitle}>{t('usg.preview.findings')}</Text>
        <Text style={p.strong}>{USG_TRANSVAGINAL_TITLE}</Text>
        {content.technique.trim() !== '' && (
          <>
            <Text style={p.subTitle}>{t('usg.preview.technique')}</Text>
            <Text style={p.line}>{content.technique}</Text>
          </>
        )}
        <Text style={p.subTitle}>{t('usg.preview.analysis')}</Text>
        {paragraphs.map((text, i) => (
          <Text key={i} style={p.paragraph}>
            {text}
          </Text>
        ))}
        {report.conclusion && (
          <>
            <Text style={p.subTitle}>{t('usg.preview.opinion')}</Text>
            <Text style={p.paragraph}>{report.conclusion}</Text>
          </>
        )}

        {error && <MessageBox message={error} type="error" />}

        <View style={p.divider} />
        {/* PDF só de laudo finalizado: o paywall fica no finalizar (migration 015). */}
        {report.status === 'completed' ? (
          <Button
            label={isGeneratingPdf ? tc('loading') : t('steps.preview.download')}
            onPress={handleDownloadPdf}
            variant="secondary"
            loading={isGeneratingPdf}
            fullWidth
            icon="document-text-outline"
          />
        ) : (
          <MessageBox message={tc('billing.finalizeToDownload')} type="info" />
        )}
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

export default UsgPreviewScreen;

const p = StyleSheet.create({
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
  subTitle: {
    fontSize: 13,
    fontFamily: Typography.bodyBold,
    color: Colors.text,
    textTransform: 'uppercase',
    marginTop: Spacing.sm,
    marginBottom: 4,
  },
  strong: {
    fontSize: 15,
    fontFamily: Typography.bodyBold,
    color: Colors.text,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  line: {
    fontSize: 15,
    fontFamily: Typography.body,
    color: Colors.text,
    marginBottom: 4,
  },
  paragraph: {
    fontSize: 15,
    fontFamily: Typography.body,
    color: Colors.text,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
});
