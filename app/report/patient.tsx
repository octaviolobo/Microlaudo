import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { StepIndicator } from '@/components/report/StepIndicator';
import { Input, DatePickerInput, MessageBox } from '@/components/ui';
import { useReportStore } from '@/stores/reportStore';
import { createReport, updateReport } from '@/services/reports';
import { searchPatients, parseProDoctorBirthDate, getLastAttendingDoctor } from '@/services/prodoctor';
import { AppError } from '@/lib/errors';
import { isoToday, formatDateBR } from '@/lib/date';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';

import { stepStyles as s } from './_stepStyles';

import type { ProDoctorPatientSummary } from '@/services/prodoctor';

function today() {
  return isoToday();
}

const SEARCH_DEBOUNCE_MS = 350;
const MIN_SEARCH_LENGTH = 2;
const BLUR_HIDE_DELAY_MS = 150;

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

  // Autocomplete de paciente via ProDoctor (ver src/services/prodoctor.ts).
  // Falha na busca nunca bloqueia o preenchimento manual do nome/data.
  const [suggestions, setSuggestions] = useState<ProDoctorPatientSummary[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTokenRef = useRef(0);

  // Autopreenchimento da médica solicitante a partir do último atendimento
  // realizado da paciente selecionada (ver src/services/prodoctor.ts).
  const [isLoadingDoctor, setIsLoadingDoctor] = useState(false);
  const doctorLookupTokenRef = useRef(0);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    },
    [],
  );

  function handlePatientNameChange(text: string) {
    setPatientName(text);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = text.trim();
    if (trimmed.length < MIN_SEARCH_LENGTH) {
      searchTokenRef.current += 1;
      setSuggestions([]);
      setShowSuggestions(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setShowSuggestions(true);
    const token = ++searchTokenRef.current;

    debounceRef.current = setTimeout(async () => {
      const results = await searchPatients(trimmed);
      // Descarta respostas de buscas antigas (o usuário já digitou algo novo).
      if (token !== searchTokenRef.current) return;
      setSuggestions(results);
      setIsSearching(false);
    }, SEARCH_DEBOUNCE_MS);
  }

  function handleSelectPatient(patient: ProDoctorPatientSummary) {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    searchTokenRef.current += 1;
    setPatientName(patient.nome);
    const iso = parseProDoctorBirthDate(patient.dataNascimento);
    if (iso) setBirthDate(iso);
    setSuggestions([]);
    setShowSuggestions(false);
    setIsSearching(false);

    // Busca em paralelo o médico do último atendimento realizado desta
    // paciente no ProDoctor, para autopreencher "médica solicitante". Nunca
    // bloqueia a tela nem impede edição manual caso a busca falhe/demore.
    const token = ++doctorLookupTokenRef.current;
    setIsLoadingDoctor(true);
    getLastAttendingDoctor(patient.codigo)
      .then((doctorName) => {
        if (token !== doctorLookupTokenRef.current) return;
        if (doctorName) setRequestingDoctor(doctorName);
      })
      .finally(() => {
        if (token === doctorLookupTokenRef.current) setIsLoadingDoctor(false);
      });
  }

  function handlePatientNameFocus() {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    if (suggestions.length > 0) setShowSuggestions(true);
  }

  function handlePatientNameBlur() {
    // Pequeno atraso para permitir que o toque em um item da lista registre
    // antes do dropdown fechar (o blur do TextInput dispara antes do onPress).
    blurTimeoutRef.current = setTimeout(() => setShowSuggestions(false), BLUR_HIDE_DELAY_MS);
  }

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

        <View style={autocompleteStyles.wrapper}>
          <Input
            label={t('steps.patient.patientName')}
            required
            value={patientName}
            onChangeText={handlePatientNameChange}
            onFocus={handlePatientNameFocus}
            onBlur={handlePatientNameBlur}
            autoCapitalize="words"
            disabled={isSaving}
          />

          {showSuggestions && (isSearching || suggestions.length > 0) && (
            <View style={autocompleteStyles.dropdown}>
              {isSearching && suggestions.length === 0 && (
                <View style={autocompleteStyles.statusRow}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={autocompleteStyles.statusText}>
                    {t('steps.patient.prodoctorSearching')}
                  </Text>
                </View>
              )}
              {suggestions.map((patient) => {
                const iso = parseProDoctorBirthDate(patient.dataNascimento);
                const birthLabel = iso ? formatDateBR(iso) : t('steps.patient.prodoctorNoBirthDate');
                return (
                  <TouchableOpacity
                    key={patient.codigo}
                    style={autocompleteStyles.item}
                    onPress={() => handleSelectPatient(patient)}
                    accessibilityRole="button"
                  >
                    <Text style={autocompleteStyles.itemName} numberOfLines={1}>
                      {patient.nome}
                    </Text>
                    <Text style={autocompleteStyles.itemMeta}>{birthLabel}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
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
          helper={isLoadingDoctor ? t('steps.patient.prodoctorLoadingDoctor') : undefined}
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

const autocompleteStyles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    zIndex: 10,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: -Spacing.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: Radius.md,
    maxHeight: 220,
    overflow: 'hidden',
    // Sombra discreta para destacar o dropdown sobre o conteúdo abaixo dele
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  statusText: {
    fontSize: 13,
    fontFamily: Typography.body,
    color: Colors.textMuted,
  },
  item: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceMuted,
  },
  itemName: {
    fontSize: 15,
    fontFamily: Typography.bodyMedium,
    color: Colors.text,
  },
  itemMeta: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: Colors.textMuted,
    marginTop: 2,
  },
});

export default PatientScreen;
