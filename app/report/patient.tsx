import { useState } from 'react';
import { ScrollView, View, TouchableOpacity, Text } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { StepIndicator } from '@/components/report/StepIndicator';
import { Input, DatePickerInput, MessageBox } from '@/components/ui';
import { useReportStore } from '@/stores/reportStore';
import { createReport, updateReport } from '@/services/reports';
import { AppError } from '@/lib/errors';
import { isoToday } from '@/lib/date';

import { stepStyles as s } from './_stepStyles';

function today() {
  return isoToday();
}

export function PatientScreen() {
  const { t } = useTranslation('report');
  const { t: tc } = useTranslation('common');

  const reportId = useReportStore((state) => state.reportId);
  const currentReport = useReportStore((state) => state.currentReport);
  const setReportId = useReportStore((state) => state.setReportId);
  const setPatientData = useReportStore((state) => state.setPatientData);
  const setStep = useReportStore((state) => state.setStep);

  const [patientName, setPatientName] = useState(currentReport?.patient_name ?? '');
  const [birthDate, setBirthDate] = useState(currentReport?.patient_birth_date ?? '');
  const [collectionDate, setCollectionDate] = useState(currentReport?.collection_date ?? today());
  const [requestingDoctor, setRequestingDoctor] = useState(currentReport?.requesting_doctor ?? '');

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleNext() {
    if (!patientName.trim() || !collectionDate.trim()) {
      setError(tc('auth.fillRequired'));
      return;
    }

    const patientData = {
      patient_name: patientName.trim(),
      patient_birth_date: birthDate.trim() || undefined,
      collection_date: collectionDate.trim(),
      requesting_doctor: requestingDoctor.trim() || undefined,
    };

    try {
      setIsSaving(true);
      setError(null);
      const saved = reportId
        ? await updateReport(reportId, patientData)
        : await createReport(patientData);

      if (!reportId) setReportId(saved.id);
      setPatientData(patientData);
      setStep(2);
      router.push('/report/photos');
    } catch (err) {
      setError(err instanceof AppError ? err.message : tc('genericError'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <StepIndicator currentStep={1} />
        <Text style={s.title}>{t('steps.patient.title')}</Text>

        <Input
          label={t('steps.patient.patientName')}
          required
          value={patientName}
          onChangeText={setPatientName}
          autoCapitalize="words"
          disabled={isSaving}
        />
        <DatePickerInput
          label={t('steps.patient.birthDate')}
          value={birthDate}
          onChange={setBirthDate}
          maximumDate={today()}
          disabled={isSaving}
        />
        <DatePickerInput
          label={t('steps.patient.collectionDate')}
          required
          value={collectionDate}
          onChange={setCollectionDate}
          maximumDate={today()}
          disabled={isSaving}
        />
        <Input
          label={t('steps.patient.requestingDoctor')}
          value={requestingDoctor}
          onChangeText={setRequestingDoctor}
          autoCapitalize="words"
          disabled={isSaving}
        />

        {error && <MessageBox message={error} type="error" />}
      </ScrollView>

      <View style={s.nav}>
        <View style={s.spacer} />
        <TouchableOpacity style={s.nextButton} onPress={handleNext} disabled={isSaving}>
          <Text style={s.nextText}>{isSaving ? tc('loading') : t('nav.next')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default PatientScreen;
