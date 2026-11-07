import { useState } from 'react';
import { ScrollView, View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { stepStyles as s } from '@app/report/_stepStyles';
import { StepIndicator } from '@/components/report/StepIndicator';
import { DecimalInput } from '@/components/report/usg/DecimalInput';
import { UsgField, UsgFieldRow, UsgSectionCard } from '@/components/report/usg/UsgSectionCard';
import { Checkbox, Input, MessageBox, Select } from '@/components/ui';
import {
  CERVIX_ASPECTS,
  CONTOURS,
  DOPPLER_SCORES,
  ENDOMETRIUM_CONTOURS,
  ENDOMETRIUM_ECHOGENICITIES,
  FREE_FLUID_LEVELS,
  OVARY_PARENCHYMAS,
  OVARY_POSITIONS,
  TEXTURES,
  UTERUS_DEVIATIONS,
  UTERUS_POSITIONS,
  UTERUS_SHAPES,
  UTERUS_SIZES,
  USG_TOTAL_STEPS,
  selectOptions,
} from '@/constants/usg-options';
import { Colors, Typography, Spacing } from '@/constants/theme';
import { useReportStore } from '@/stores/reportStore';
import { updateReport } from '@/services/reports';
import { AppError } from '@/lib/errors';
import { formatDecimalBR } from '@/lib/format';
import { usgContentToJson, validateUsgContent } from '@/lib/usgContent';
import { calculateEllipsoidVolume, isAboveReference } from '@/lib/usgVolume';

import type { Dimensions, UsgOvary, UsgTransvaginalContent } from '@/types/usg';
import type { DopplerScore } from '@/constants/usg-options';

const DOPPLER_NONE = 'none';

export function UsgAnalysisScreen() {
  const { t } = useTranslation('report');
  const { t: tc } = useTranslation('common');

  const reportId = useReportStore((state) => state.reportId);
  const content = useReportStore((state) => state.usgContent);
  const setUsgSection = useReportStore((state) => state.setUsgSection);
  const setUsgContent = useReportStore((state) => state.setUsgContent);
  const setStep = useReportStore((state) => state.setStep);

  // Campos numéricos com texto que não é número (ver DecimalInput). Bloqueiam o avanço.
  const [invalidFields, setInvalidFields] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!content) return null; // o _layout já redireciona nesse caso

  function markInvalid(key: string, invalid: boolean) {
    setInvalidFields((prev) => (prev[key] === invalid ? prev : { ...prev, [key]: invalid }));
  }

  // Campo numérico de uma seção. `key` identifica o campo na lista de inválidos.
  function decimal<S extends 'uterus' | 'endometrium' | 'right_ovary' | 'left_ovary'>(
    section: S,
    field: keyof UsgTransvaginalContent[S] & string,
    labelKey: string,
  ) {
    const key = `${section}.${field}`;
    const value = (content as UsgTransvaginalContent)[section][field] as unknown as number | null;
    return (
      <DecimalInput
        label={t(labelKey)}
        value={value}
        disabled={isSaving}
        error={invalidFields[key] ? t('usg.invalidNumber', { field: t(labelKey) }) : undefined}
        onChange={(next, invalid) => {
          markInvalid(key, invalid);
          if (!invalid) {
            setUsgSection(section, { [field]: next } as Partial<UsgTransvaginalContent[S]>);
          }
        }}
      />
    );
  }

  function volumeLine(dims: Dimensions, reference: number) {
    const volume = calculateEllipsoidVolume(dims);
    if (volume == null) return <Text style={localStyles.volume}>{t('usg.fields.volumePending')}</Text>;
    const above = isAboveReference(volume, reference);
    return (
      <Text style={[localStyles.volume, above && localStyles.volumeAbove]}>
        {t('usg.fields.volume', { volume: formatDecimalBR(volume) })}
        {above ? ` — ${t('usg.fields.volumeAbove')}` : ''}
      </Text>
    );
  }

  function ovarySection(side: 'right_ovary' | 'left_ovary', titleKey: string) {
    const o: UsgOvary = (content as UsgTransvaginalContent)[side];
    return (
      <UsgSectionCard title={t(titleKey)}>
        <Checkbox
          label={t('usg.fields.characterized')}
          value={o.characterized}
          onValueChange={(v) => setUsgSection(side, { characterized: v })}
          disabled={isSaving}
        />
        {o.characterized ? (
          <>
            <UsgFieldRow>
              <UsgField>
                <Select
                  label={t('usg.fields.position')}
                  value={o.position}
                  options={selectOptions(OVARY_POSITIONS)}
                  onValueChange={(v) => setUsgSection(side, { position: v as UsgOvary['position'] })}
                  disabled={isSaving}
                />
              </UsgField>
              <UsgField>
                <Select
                  label={t('usg.fields.contours')}
                  value={o.contours}
                  options={selectOptions(CONTOURS)}
                  onValueChange={(v) => setUsgSection(side, { contours: v as UsgOvary['contours'] })}
                  disabled={isSaving}
                />
              </UsgField>
            </UsgFieldRow>
            <UsgFieldRow>
              <UsgField>{decimal(side, 'length_cm', 'usg.fields.length')}</UsgField>
              <UsgField>{decimal(side, 'ap_cm', 'usg.fields.ap')}</UsgField>
              <UsgField>{decimal(side, 'transverse_cm', 'usg.fields.transverse')}</UsgField>
              <UsgField>{decimal(side, 'reference_volume_cm3', 'usg.fields.referenceVolume')}</UsgField>
            </UsgFieldRow>
            {volumeLine(o, o.reference_volume_cm3)}
            <Select
              label={t('usg.fields.parenchyma')}
              value={o.parenchyma}
              options={selectOptions(OVARY_PARENCHYMAS)}
              onValueChange={(v) => setUsgSection(side, { parenchyma: v as UsgOvary['parenchyma'] })}
              disabled={isSaving}
            />
          </>
        ) : (
          <Checkbox
            label={t('usg.fields.adnexaFree')}
            value={o.adnexa_free}
            onValueChange={(v) => setUsgSection(side, { adnexa_free: v })}
            disabled={isSaving}
          />
        )}
        <Input
          label={t('usg.fields.notes')}
          value={o.notes}
          onChangeText={(v) => setUsgSection(side, { notes: v })}
          multiline
          numberOfLines={2}
          disabled={isSaving}
        />
      </UsgSectionCard>
    );
  }

  async function handleNext() {
    if (!reportId || !content) return;
    if (Object.values(invalidFields).some(Boolean)) {
      setError(t('usg.fixInvalidFields'));
      return;
    }
    try {
      setIsSaving(true);
      setError(null);
      validateUsgContent(content);
      await updateReport(reportId, { content: usgContentToJson(content) });
      setStep(3);
      router.push('/report-usg/text');
    } catch (err) {
      setError(err instanceof AppError ? err.message : tc('genericError'));
    } finally {
      setIsSaving(false);
    }
  }

  const u = content.uterus;
  const e = content.endometrium;

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <StepIndicator currentStep={2} totalSteps={USG_TOTAL_STEPS} />
        <Text style={s.title}>{t('usg.steps.analysis')}</Text>

        {/* ─── Útero ─── */}
        <UsgSectionCard title={t('usg.sections.uterus')}>
          <Checkbox
            label={t('usg.fields.absent')}
            value={u.absent}
            onValueChange={(v) => setUsgSection('uterus', { absent: v })}
            disabled={isSaving}
          />
          {!u.absent && (
            <>
              <UsgFieldRow>
                <UsgField>
                  <Select
                    label={t('usg.fields.shape')}
                    value={u.shape}
                    options={selectOptions(UTERUS_SHAPES)}
                    onValueChange={(v) => setUsgSection('uterus', { shape: v as typeof u.shape })}
                    disabled={isSaving}
                  />
                </UsgField>
                <UsgField>
                  <Select
                    label={t('usg.fields.position')}
                    value={u.position}
                    options={selectOptions(UTERUS_POSITIONS)}
                    onValueChange={(v) => setUsgSection('uterus', { position: v as typeof u.position })}
                    disabled={isSaving}
                  />
                </UsgField>
                <UsgField>
                  <Select
                    label={t('usg.fields.deviation')}
                    value={u.deviation}
                    options={selectOptions(UTERUS_DEVIATIONS)}
                    onValueChange={(v) => setUsgSection('uterus', { deviation: v as typeof u.deviation })}
                    disabled={isSaving}
                  />
                </UsgField>
              </UsgFieldRow>
              <UsgFieldRow>
                <UsgField>
                  <Select
                    label={t('usg.fields.contours')}
                    value={u.contours}
                    options={selectOptions(CONTOURS)}
                    onValueChange={(v) => setUsgSection('uterus', { contours: v as typeof u.contours })}
                    disabled={isSaving}
                  />
                </UsgField>
                <UsgField>
                  <Select
                    label={t('usg.fields.size')}
                    value={u.size}
                    options={selectOptions(UTERUS_SIZES)}
                    onValueChange={(v) => setUsgSection('uterus', { size: v as typeof u.size })}
                    disabled={isSaving}
                  />
                </UsgField>
                <UsgField>
                  <Select
                    label={t('usg.fields.myometrium')}
                    value={u.myometrium}
                    options={selectOptions(TEXTURES)}
                    onValueChange={(v) => setUsgSection('uterus', { myometrium: v as typeof u.myometrium })}
                    disabled={isSaving}
                  />
                </UsgField>
              </UsgFieldRow>
              <UsgFieldRow>
                <UsgField>{decimal('uterus', 'length_cm', 'usg.fields.length')}</UsgField>
                <UsgField>{decimal('uterus', 'ap_cm', 'usg.fields.ap')}</UsgField>
                <UsgField>{decimal('uterus', 'transverse_cm', 'usg.fields.transverse')}</UsgField>
                <UsgField>{decimal('uterus', 'reference_volume_cm3', 'usg.fields.referenceVolume')}</UsgField>
              </UsgFieldRow>
              {volumeLine(u, u.reference_volume_cm3)}
            </>
          )}
          <Input
            label={t('usg.fields.notes')}
            value={u.notes}
            onChangeText={(v) => setUsgSection('uterus', { notes: v })}
            multiline
            numberOfLines={2}
            disabled={isSaving}
          />
        </UsgSectionCard>

        {!u.absent && (
          <>
            {/* ─── Colo ─── */}
            <UsgSectionCard title={t('usg.sections.cervix')}>
              <Select
                label={t('usg.fields.aspect')}
                value={content.cervix.aspect}
                options={selectOptions(CERVIX_ASPECTS)}
                onValueChange={(v) => setUsgSection('cervix', { aspect: v as typeof content.cervix.aspect })}
                disabled={isSaving}
              />
              <Input
                label={t('usg.fields.notes')}
                value={content.cervix.notes}
                onChangeText={(v) => setUsgSection('cervix', { notes: v })}
                multiline
                numberOfLines={2}
                disabled={isSaving}
              />
            </UsgSectionCard>

            {/* ─── Endométrio ─── */}
            <UsgSectionCard title={t('usg.sections.endometrium')}>
              <UsgFieldRow>
                <UsgField>
                  <Select
                    label={t('usg.fields.contour')}
                    value={e.contour}
                    options={selectOptions(ENDOMETRIUM_CONTOURS)}
                    onValueChange={(v) => setUsgSection('endometrium', { contour: v as typeof e.contour })}
                    disabled={isSaving}
                  />
                </UsgField>
                <UsgField>
                  <Select
                    label={t('usg.fields.texture')}
                    value={e.texture}
                    options={selectOptions(TEXTURES)}
                    onValueChange={(v) => setUsgSection('endometrium', { texture: v as typeof e.texture })}
                    disabled={isSaving}
                  />
                </UsgField>
                <UsgField>{decimal('endometrium', 'thickness_mm', 'usg.fields.thickness')}</UsgField>
              </UsgFieldRow>
              <UsgFieldRow>
                <UsgField>
                  <Select
                    label={t('usg.fields.echogenicity')}
                    value={e.echogenicity}
                    options={selectOptions(ENDOMETRIUM_ECHOGENICITIES)}
                    onValueChange={(v) =>
                      setUsgSection('endometrium', { echogenicity: v as typeof e.echogenicity })
                    }
                    disabled={isSaving}
                  />
                </UsgField>
                <UsgField>
                  <Select
                    label={t('usg.fields.doppler')}
                    value={e.doppler_score == null ? DOPPLER_NONE : String(e.doppler_score)}
                    options={[
                      { value: DOPPLER_NONE, label: t('usg.fields.dopplerNone') },
                      ...DOPPLER_SCORES.map((score) => ({ value: String(score), label: String(score) })),
                    ]}
                    onValueChange={(v) =>
                      setUsgSection('endometrium', {
                        doppler_score: v === DOPPLER_NONE ? null : (Number(v) as DopplerScore),
                      })
                    }
                    disabled={isSaving}
                  />
                </UsgField>
              </UsgFieldRow>
              <Input
                label={t('usg.fields.notes')}
                value={e.notes}
                onChangeText={(v) => setUsgSection('endometrium', { notes: v })}
                multiline
                numberOfLines={2}
                disabled={isSaving}
              />
            </UsgSectionCard>
          </>
        )}

        {ovarySection('right_ovary', 'usg.sections.rightOvary')}
        {ovarySection('left_ovary', 'usg.sections.leftOvary')}

        {/* ─── Cavidade pélvica ─── */}
        <UsgSectionCard title={t('usg.sections.pelvis')}>
          <Select
            label={t('usg.fields.freeFluid')}
            value={content.free_fluid}
            options={selectOptions(FREE_FLUID_LEVELS)}
            onValueChange={(v) => setUsgContent({ free_fluid: v as typeof content.free_fluid })}
            disabled={isSaving}
          />
        </UsgSectionCard>

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

export default UsgAnalysisScreen;

const localStyles = StyleSheet.create({
  volume: {
    fontSize: 14,
    fontFamily: Typography.bodyMedium,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  volumeAbove: {
    color: Colors.warning,
  },
});
