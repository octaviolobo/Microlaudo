import { useState } from 'react';
import { ScrollView, View, TouchableOpacity, Text } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { stepStyles as s } from './_stepStyles';
import { StepIndicator } from '@/components/report/StepIndicator';
import { Select, Input, MessageBox } from '@/components/ui';
import type { SelectOption } from '@/components/ui';
import { useReportStore } from '@/stores/reportStore';
import { updateReport } from '@/services/reports';
import { AppError } from '@/lib/errors';
import { FINDING_LEVELS, FINDINGS_FIELDS, type FindingsField } from '@/constants/findings-options';
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
  const setFindings = useReportStore((state) => state.setFindings);
  const setStep = useReportStore((state) => state.setStep);

  const [values, setValues] = useState<Partial<Record<FindingsField, FindingLevel>>>(
    Object.fromEntries(FINDINGS_FIELDS.map((field) => [field, currentReport?.[field]])) as Partial<
      Record<FindingsField, FindingLevel>
    >,
  );
  const [description, setDescription] = useState(currentReport?.microscopic_description ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const levelOptions: SelectOption[] = FINDING_LEVELS.map((level) => ({
    label: tClinical(`findingLevels.${level}`),
    value: level,
  }));

  async function handleNext() {
    if (!reportId) return;

    const trimmedDescription = description.trim();

    try {
      setIsSaving(true);
      setError(null);
      await updateReport(reportId, { ...values, microscopic_description: trimmedDescription || null });
      setFindings({ ...values, microscopic_description: trimmedDescription || undefined });
      setStep(4);
      router.push('/report/scores');
    } catch (err) {
      setError(err instanceof AppError ? err.message : tc('genericError'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <StepIndicator currentStep={3} />
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
