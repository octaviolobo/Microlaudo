import { useMemo, useState } from 'react';
import { ScrollView, View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { StepIndicator } from '@/components/report/StepIndicator';
import { Select, Checkbox, Input, MessageBox } from '@/components/ui';
import { useReportStore } from '@/stores/reportStore';
import { updateReport } from '@/services/reports';
import { calculateNugentScore } from '@/lib/nugent';
import { evaluateAmsel } from '@/lib/amsel';
import { AppError } from '@/lib/errors';
import { Colors, Typography, Spacing } from '@/constants/theme';

import { stepStyles as s } from './_stepStyles';

import type { SelectOption } from '@/components/ui';
import type { MorphotypeLevel } from '@/types/report';

const MORPHOTYPE_OPTIONS: SelectOption[] = ['0', '1+', '2+', '3+', '4+'].map((level) => ({
  label: level,
  value: level,
}));

export function ScoresScreen() {
  const { t } = useTranslation('report');
  const { t: tc } = useTranslation('common');
  const { t: tClinical } = useTranslation('clinical');

  const reportId = useReportStore((state) => state.reportId);
  const currentReport = useReportStore((state) => state.currentReport);
  const morphotypesStore = useReportStore((state) => state.morphotypes);
  const setMorphotypes = useReportStore((state) => state.setMorphotypes);
  const setAmsel = useReportStore((state) => state.setAmsel);
  const setStep = useReportStore((state) => state.setStep);

  const [lactobacillus, setLactobacillus] = useState<MorphotypeLevel | ''>(
    morphotypesStore?.lactobacillus ?? '',
  );
  const [gardnerella, setGardnerella] = useState<MorphotypeLevel | ''>(morphotypesStore?.gardnerella ?? '');
  const [mobiluncus, setMobiluncus] = useState<MorphotypeLevel | ''>(morphotypesStore?.mobiluncus ?? '');

  const [homogeneousDischarge, setHomogeneousDischarge] = useState(
    currentReport?.amsel_homogeneous_discharge ?? false,
  );
  const [whiffTest, setWhiffTest] = useState(currentReport?.amsel_whiff_test ?? false);
  const [clueCells20, setClueCells20] = useState(currentReport?.amsel_clue_cells_20 ?? false);
  const [phAbove45, setPhAbove45] = useState(currentReport?.amsel_ph_above_45 ?? false);
  const [phValue, setPhValue] = useState(currentReport?.amsel_ph_value?.toString() ?? '');

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nugentResult = useMemo(() => {
    if (!lactobacillus || !gardnerella || !mobiluncus) return null;
    return calculateNugentScore({ lactobacillus, gardnerella, mobiluncus });
  }, [lactobacillus, gardnerella, mobiluncus]);

  const amselResult = useMemo(
    () =>
      evaluateAmsel({
        homogeneous_discharge: homogeneousDischarge,
        whiff_test: whiffTest,
        clue_cells_20: clueCells20,
        ph_above_45: phAbove45,
      }),
    [homogeneousDischarge, whiffTest, clueCells20, phAbove45],
  );

  async function handleNext() {
    if (!reportId) return;

    const morphotypes =
      lactobacillus && gardnerella && mobiluncus ? { lactobacillus, gardnerella, mobiluncus } : null;
    const breakdown = morphotypes ? calculateNugentScore(morphotypes).breakdown : null;
    const amsel = {
      homogeneous_discharge: homogeneousDischarge,
      whiff_test: whiffTest,
      clue_cells_20: clueCells20,
      ph_above_45: phAbove45,
      ph_value: phValue ? Number(phValue) : undefined,
    };

    const patch = {
      ...(breakdown && {
        nugent_lactobacillus: breakdown.lactobacillusPoints,
        nugent_gardnerella: breakdown.gardnerellaPoints,
        nugent_mobiluncus: breakdown.mobiluncusPoints,
      }),
      amsel_homogeneous_discharge: homogeneousDischarge,
      amsel_whiff_test: whiffTest,
      amsel_clue_cells_20: clueCells20,
      amsel_ph_above_45: phAbove45,
      amsel_ph_value: phValue ? Number(phValue) : null,
    };

    try {
      setIsSaving(true);
      setError(null);
      await updateReport(reportId, patch);
      if (morphotypes) setMorphotypes(morphotypes);
      setAmsel(amsel);
      setStep(4);
      router.push('/report/findings');
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
        <Text style={s.title}>{t('steps.scores.title')}</Text>

        <Text style={scoreStyles.sectionTitle}>{tClinical('nugent.title')}</Text>
        <Text style={scoreStyles.subtitle}>{tClinical('nugent.subtitle')}</Text>

        <Select
          label={tClinical('nugent.morphotypes.lactobacillus')}
          value={lactobacillus}
          onValueChange={(v) => setLactobacillus(v as MorphotypeLevel)}
          options={MORPHOTYPE_OPTIONS}
          disabled={isSaving}
        />
        <Select
          label={tClinical('nugent.morphotypes.gardnerella')}
          value={gardnerella}
          onValueChange={(v) => setGardnerella(v as MorphotypeLevel)}
          options={MORPHOTYPE_OPTIONS}
          disabled={isSaving}
        />
        <Select
          label={tClinical('nugent.morphotypes.mobiluncus')}
          value={mobiluncus}
          onValueChange={(v) => setMobiluncus(v as MorphotypeLevel)}
          options={MORPHOTYPE_OPTIONS}
          disabled={isSaving}
        />

        {nugentResult && (
          <MessageBox
            type="info"
            message={`${tClinical('nugent.result', { score: nugentResult.score })} — ${tClinical(`nugent.classifications.${nugentResult.classification}`)}`}
          />
        )}

        <View style={scoreStyles.divider} />

        <Text style={scoreStyles.sectionTitle}>{tClinical('amsel.title')}</Text>
        <Text style={scoreStyles.subtitle}>{tClinical('amsel.subtitle')}</Text>

        <Checkbox
          label={tClinical('amsel.criteria.homogeneous_discharge')}
          value={homogeneousDischarge}
          onValueChange={setHomogeneousDischarge}
          disabled={isSaving}
        />
        <Checkbox
          label={tClinical('amsel.criteria.whiff_test')}
          value={whiffTest}
          onValueChange={setWhiffTest}
          disabled={isSaving}
        />
        <Checkbox
          label={tClinical('amsel.criteria.clue_cells_20')}
          value={clueCells20}
          onValueChange={setClueCells20}
          disabled={isSaving}
        />
        <Checkbox
          label={tClinical('amsel.criteria.ph_above_45')}
          value={phAbove45}
          onValueChange={setPhAbove45}
          disabled={isSaving}
        />
        <Input
          label={tClinical('amsel.phValue')}
          value={phValue}
          onChangeText={setPhValue}
          type="numeric"
          disabled={isSaving}
        />

        <MessageBox
          type={amselResult.diagnosis ? 'warning' : 'info'}
          message={`${tClinical('amsel.result', { count: amselResult.positiveCount })}${amselResult.diagnosis ? ' — ' + tClinical('amsel.diagnosis') : ''}`}
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

export default ScoresScreen;

const scoreStyles = StyleSheet.create({
  sectionTitle: {
    fontSize: 16,
    fontFamily: Typography.headingSemiBold,
    color: Colors.foreground,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: Typography.body,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.lg,
  },
});
