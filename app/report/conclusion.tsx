import { useState } from 'react';
import { ScrollView, View, TouchableOpacity, Text } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { StepIndicator } from '@/components/report/StepIndicator';
import { Button, Input, MessageBox } from '@/components/ui';
import { useReportStore } from '@/stores/reportStore';
import { useDoctorStore } from '@/stores/doctorStore';
import { updateReport } from '@/services/reports';
import { AppError } from '@/lib/errors';
import { REFERENCE_DEFAULT } from '@/constants/report-defaults';
import { calculateNugentScore } from '@/lib/nugent';
import { evaluateAmsel } from '@/lib/amsel';
import { classifyConclusionCase } from '@/lib/conclusionTemplates';

import { stepStyles as s } from './_stepStyles';

export function ConclusionScreen() {
  const { t } = useTranslation('report');
  const { t: tc } = useTranslation('common');
  const { t: tClinical } = useTranslation('clinical');

  const reportId = useReportStore((state) => state.reportId);
  const currentReport = useReportStore((state) => state.currentReport);
  const morphotypes = useReportStore((state) => state.morphotypes);
  const setConclusion = useReportStore((state) => state.setConclusion);
  const setStep = useReportStore((state) => state.setStep);
  const doctor = useDoctorStore((state) => state.doctor);

  const [conclusion, setConclusionText] = useState(currentReport?.conclusion ?? '');
  const [reference, setReference] = useState(
    currentReport?.bibliographic_reference ?? doctor?.default_reference ?? REFERENCE_DEFAULT,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nugentResult =
    morphotypes?.lactobacillus && morphotypes?.gardnerella && morphotypes?.mobiluncus
      ? calculateNugentScore({
          lactobacillus: morphotypes.lactobacillus,
          gardnerella: morphotypes.gardnerella,
          mobiluncus: morphotypes.mobiluncus,
        })
      : null;

  const amselResult =
    currentReport?.amsel_homogeneous_discharge !== undefined &&
    currentReport?.amsel_whiff_test !== undefined &&
    currentReport?.amsel_clue_cells_20 !== undefined &&
    currentReport?.amsel_ph_above_45 !== undefined
      ? evaluateAmsel({
          homogeneous_discharge: currentReport.amsel_homogeneous_discharge,
          whiff_test: currentReport.amsel_whiff_test,
          clue_cells_20: currentReport.amsel_clue_cells_20,
          ph_above_45: currentReport.amsel_ph_above_45,
        })
      : null;

  const conclusionCase = classifyConclusionCase(nugentResult, amselResult);

  function handleUseSuggestedConclusion() {
    if (!conclusionCase || !nugentResult || !amselResult) return;
    setConclusionText(
      tClinical(`conclusionTemplates.${conclusionCase}`, {
        score: nugentResult.score,
        count: amselResult.positiveCount,
        classification: tClinical(`nugent.classifications.${nugentResult.classification}`),
      }),
    );
  }

  async function handleNext() {
    if (!reportId) return;

    try {
      setIsSaving(true);
      setError(null);
      await updateReport(reportId, {
        conclusion: conclusion.trim() || null,
        bibliographic_reference: reference.trim() || null,
      });
      setConclusion(conclusion.trim(), reference.trim());
      setStep(6);
      router.push('/report/preview');
    } catch (err) {
      setError(err instanceof AppError ? err.message : tc('genericError'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <StepIndicator currentStep={5} />
        <Text style={s.title}>{t('steps.conclusion.title')}</Text>

        <Input
          label={t('steps.conclusion.conclusion')}
          value={conclusion}
          onChangeText={setConclusionText}
          multiline
          numberOfLines={5}
          disabled={isSaving}
        />
        {conclusionCase && (
          <Button
            label={t('steps.conclusion.useSuggested')}
            onPress={handleUseSuggestedConclusion}
            variant="secondary"
            size="sm"
            disabled={isSaving}
          />
        )}
        <Input
          label={t('steps.conclusion.bibliographicReference')}
          value={reference}
          onChangeText={setReference}
          multiline
          numberOfLines={3}
          disabled={isSaving}
        />

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

export default ConclusionScreen;
