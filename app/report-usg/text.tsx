import { useMemo, useState } from 'react';
import { ScrollView, View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { stepStyles as s } from '@app/report/_stepStyles';
import { StepIndicator } from '@/components/report/StepIndicator';
import { Button, Input, MessageBox } from '@/components/ui';
import { Colors, Typography, Spacing } from '@/constants/theme';
import { USG_TOTAL_STEPS } from '@/constants/usg-options';
import { useReportStore } from '@/stores/reportStore';
import { updateReport } from '@/services/reports';
import { AppError } from '@/lib/errors';
import { usgContentToJson, validateUsgContent } from '@/lib/usgContent';
import { generateUsgAnalysisText, suggestUsgOpinion } from '@/lib/usgText';
import { validateLongText } from '@/lib/validation';

// Step 3: texto da Análise (gerado dos campos, editável), Técnica e Opinião do relatório.
export function UsgTextScreen() {
  const { t } = useTranslation('report');
  const { t: tc } = useTranslation('common');

  const reportId = useReportStore((state) => state.reportId);
  const content = useReportStore((state) => state.usgContent);
  const currentReport = useReportStore((state) => state.currentReport);
  const setUsgContent = useReportStore((state) => state.setUsgContent);
  const setConclusion = useReportStore((state) => state.setConclusion);
  const setStep = useReportStore((state) => state.setStep);

  const generated = useMemo(() => (content ? generateUsgAnalysisText(content) : ''), [content]);
  const suggestedOpinion = useMemo(() => (content ? suggestUsgOpinion(content) : ''), [content]);

  const [technique, setTechnique] = useState(content?.technique ?? '');
  const [analysis, setAnalysis] = useState(content?.analysis_text ?? generated);
  const [opinion, setOpinion] = useState(currentReport?.conclusion ?? suggestedOpinion);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!content) return null; // o _layout já redireciona nesse caso

  // "Editado" = diferente do texto gerado a partir dos campos atuais.
  const isEdited = analysis.trim() !== generated.trim();

  async function handleNext() {
    if (!reportId || !content) return;
    // Texto igual ao gerado é salvo como null: assim, se a médica voltar e mudar um campo,
    // o texto acompanha. Texto editado é preservado como está.
    const next = {
      ...content,
      technique: technique.trim(),
      analysis_text: isEdited ? analysis.trim() : null,
    };
    try {
      setIsSaving(true);
      setError(null);
      validateUsgContent(next);
      validateLongText(opinion, t('usg.text.opinion'));
      await updateReport(reportId, {
        content: usgContentToJson(next),
        conclusion: opinion.trim() || null,
      });
      setUsgContent({ technique: next.technique, analysis_text: next.analysis_text });
      setConclusion(opinion.trim());
      setStep(4);
      router.push('/report-usg/preview');
    } catch (err) {
      setError(err instanceof AppError ? err.message : tc('genericError'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <StepIndicator currentStep={3} totalSteps={USG_TOTAL_STEPS} />
        <Text style={s.title}>{t('usg.steps.text')}</Text>

        <Input
          label={t('usg.fields.technique')}
          value={technique}
          onChangeText={setTechnique}
          multiline
          numberOfLines={2}
          disabled={isSaving}
        />

        <Input
          label={t('usg.text.analysis')}
          value={analysis}
          onChangeText={setAnalysis}
          multiline
          numberOfLines={14}
          helper={isEdited ? t('usg.text.edited') : t('usg.text.analysisHelper')}
          disabled={isSaving}
        />
        {isEdited && (
          <Button
            label={t('usg.text.regenerate')}
            onPress={() => setAnalysis(generated)}
            variant="secondary"
            size="sm"
            disabled={isSaving}
          />
        )}

        <View style={localStyles.spacer} />
        <Input
          label={t('usg.text.opinion')}
          value={opinion}
          onChangeText={setOpinion}
          multiline
          numberOfLines={4}
          disabled={isSaving}
        />
        {opinion.trim() !== suggestedOpinion && (
          <>
            <Text style={localStyles.suggestion}>{suggestedOpinion}</Text>
            <Button
              label={t('usg.text.useSuggested')}
              onPress={() => setOpinion(suggestedOpinion)}
              variant="secondary"
              size="sm"
              disabled={isSaving}
            />
          </>
        )}

        {error && <MessageBox message={error} type="error" />}
      </ScrollView>

      <View style={s.nav}>
        <TouchableOpacity style={s.backButton} onPress={() => router.back()}>
          <Text style={s.backText}>{t('nav.back')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.nextButton} onPress={handleNext} disabled={isSaving}>
          <Text style={s.nextText}>{isSaving ? tc('loading') : t('nav.next')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default UsgTextScreen;

const localStyles = StyleSheet.create({
  spacer: { height: Spacing.md },
  suggestion: {
    fontSize: 13,
    fontFamily: Typography.body,
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginBottom: Spacing.sm,
  },
});
