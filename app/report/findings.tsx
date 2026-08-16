import { useState } from 'react';
import { ScrollView, View, TouchableOpacity, Text } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { StepIndicator } from '@/components/report/StepIndicator';
import { Select, Input, Button, MessageBox } from '@/components/ui';
import { useReportStore } from '@/stores/reportStore';
import { updateReport } from '@/services/reports';
import { AppError } from '@/lib/errors';
import { calculateNugentScore } from '@/lib/nugent';
import { evaluateAmsel } from '@/lib/amsel';
import { classifyConclusionCase } from '@/lib/conclusionTemplates';
import { FINDING_LEVELS, FINDINGS_FIELDS, type FindingsField } from '@/constants/findings-options';

import { stepStyles as s } from './_stepStyles';

import type { SelectOption } from '@/components/ui';
import type { FindingLevel } from '@/types/report';

const FIELD_LABEL_KEYS: Record<FindingsField, string> = {
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

export function FindingsScreen() {
  const { t } = useTranslation('report');
  const { t: tc } = useTranslation('common');
  const { t: tClinical } = useTranslation('clinical');

  const reportId = useReportStore((state) => state.reportId);
  const currentReport = useReportStore((state) => state.currentReport);
  const morphotypes = useReportStore((state) => state.morphotypes);
  const setFindings = useReportStore((state) => state.setFindings);
  const setStep = useReportStore((state) => state.setStep);

  // Nugent + Amsel já foram preenchidos na etapa anterior (Scores). Reaproduzimos o mesmo
  // cálculo usado em conclusion.tsx para sugerir uma descrição microscópica padrão coerente
  // com o diagnóstico. Se os dados de Scores estiverem incompletos, conclusionCase é `null`
  // e o campo se comporta como texto livre (comportamento anterior).
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

  const [values, setValues] = useState<Partial<Record<FindingsField, FindingLevel>>>(
    Object.fromEntries(FINDINGS_FIELDS.map((field) => [field, currentReport?.[field]])) as Partial<
      Record<FindingsField, FindingLevel>
    >,
  );
  // Pré-preenche com a descrição padrão sugerida pelo diagnóstico calculado (Nugent + Amsel)
  // ao entrar na tela, exceto se já houver uma descrição salva (edição de laudo existente).
  const [description, setDescription] = useState(
    currentReport?.microscopic_description ??
      (conclusionCase ? tClinical(`findingsTemplates.${conclusionCase}`) : ''),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const levelOptions: SelectOption[] = FINDING_LEVELS.map((level) => ({
    label: tClinical(`findingLevels.${level}`),
    value: level,
  }));

  function handleUseSuggestedDescription() {
    if (!conclusionCase) return;
    setDescription(tClinical(`findingsTemplates.${conclusionCase}`));
  }

  async function handleNext() {
    if (!reportId) return;

    const trimmedDescription = description.trim();

    try {
      setIsSaving(true);
      setError(null);
      await updateReport(reportId, { ...values, microscopic_description: trimmedDescription || null });
      setFindings({ ...values, microscopic_description: trimmedDescription || undefined });
      setStep(5);
      router.push('/report/conclusion');
    } catch (err) {
      setError(err instanceof AppError ? err.message : tc('genericError'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <StepIndicator currentStep={4} />
        <Text style={s.title}>{t('steps.findings.title')}</Text>

        {FINDINGS_FIELDS.map((field) => (
          <Select
            key={field}
            label={tClinical(`findings.${FIELD_LABEL_KEYS[field]}`)}
            value={values[field] ?? ''}
            onValueChange={(value) => setValues((prev) => ({ ...prev, [field]: value as FindingLevel }))}
            options={levelOptions}
            disabled={isSaving}
          />
        ))}

        <Input
          label={t('steps.findings.description')}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          disabled={isSaving}
        />
        {conclusionCase && (
          <Button
            label={t('steps.findings.useSuggested')}
            onPress={handleUseSuggestedDescription}
            variant="secondary"
            size="sm"
            disabled={isSaving}
          />
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

export default FindingsScreen;
