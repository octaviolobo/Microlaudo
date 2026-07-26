import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { getProfile, updateProfile } from '@/services/profile';
import { signOut } from '@/services/auth';
import { AppError } from '@/lib/errors';
import { Button, Input, MessageBox, Select } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { useDoctorStore } from '@/stores/doctorStore';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import type { SelectOption } from '@/components/ui';

const LANGUAGE_OPTIONS: SelectOption[] = [
  { label: 'Português (BR)', value: 'pt-BR' },
  { label: 'English', value: 'en' },
];

export function ProfileScreen() {
  const { t } = useTranslation('common');
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const { doctor, setDoctor, isLoading, setLoading } = useDoctorStore();

  // Campos do formulário
  const [fullName, setFullName] = useState('');
  const [crm, setCrm] = useState('');
  const [rqe, setRqe] = useState('');
  const [language, setLanguage] = useState('pt-BR');
  const [clinicName, setClinicName] = useState('');
  const [clinicCnpj, setClinicCnpj] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [clinicPhone, setClinicPhone] = useState('');
  const [defaultReference, setDefaultReference] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Carrega perfil ao montar
  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      try {
        const data = await getProfile();
        setDoctor(data);
        setFullName(data.full_name ?? '');
        setCrm(data.crm ?? '');
        setRqe(data.rqe ?? '');
        setLanguage(data.preferred_language ?? 'pt-BR');
        setClinicName(data.clinic_name ?? '');
        setClinicCnpj(data.clinic_cnpj ?? '');
        setClinicAddress(data.clinic_address ?? '');
        setClinicPhone(data.clinic_phone ?? '');
        setDefaultReference(data.default_reference ?? '');
      } catch {
        // Perfil ainda não existe ou erro de rede — manter campos em branco
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  async function handleSave() {
    if (!fullName.trim() || !crm.trim()) {
      setSaveError(t('auth.fillRequired'));
      return;
    }
    try {
      setIsSaving(true);
      setSaveError(null);
      setSaveSuccess(false);
      const updated = await updateProfile({
        full_name: fullName.trim(),
        crm: crm.trim(),
        rqe: rqe.trim() || null,
        preferred_language: language,
        clinic_name: clinicName.trim() || null,
        clinic_cnpj: clinicCnpj.trim() || null,
        clinic_address: clinicAddress.trim() || null,
        clinic_phone: clinicPhone.trim() || null,
        default_reference: defaultReference.trim() || undefined,
      });
      setDoctor(updated);
      setSaveSuccess(true);
    } catch (err) {
      setSaveError(err instanceof AppError ? t('genericError') : t('genericError'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLogout() {
    try {
      await signOut();
    } finally {
      clearAuth();
      router.replace('/(auth)/login');
    }
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{t('loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.pageTitle}>{t('profile.title')}</Text>

      {/* ── Dados Pessoais ─────────────────────────────── */}
      <Text style={styles.sectionTitle}>{t('profile.personalData')}</Text>

      <Input
        label={t('profile.fullName')}
        required
        value={fullName}
        onChangeText={setFullName}
        autoCapitalize="words"
        disabled={isSaving}
        accessibilityLabel={t('profile.fullName')}
      />
      <Input
        label={t('profile.crm')}
        required
        value={crm}
        onChangeText={setCrm}
        autoCapitalize="characters"
        disabled={isSaving}
        accessibilityLabel={t('profile.crm')}
      />
      <Input
        label={t('profile.rqe')}
        value={rqe}
        onChangeText={setRqe}
        disabled={isSaving}
        accessibilityLabel={t('profile.rqe')}
      />
      <Select
        label={t('profile.language')}
        value={language}
        onValueChange={setLanguage}
        options={LANGUAGE_OPTIONS}
        disabled={isSaving}
      />

      <View style={styles.divider} />

      {/* ── Clínica ────────────────────────────────────── */}
      <Text style={styles.sectionTitle}>{t('profile.clinicData')}</Text>
      <MessageBox message={t('profile.clinicInfo')} type="info" />

      <Input
        label={t('profile.clinicName')}
        value={clinicName}
        onChangeText={setClinicName}
        autoCapitalize="words"
        disabled={isSaving}
        accessibilityLabel={t('profile.clinicName')}
      />
      <Input
        label={t('profile.clinicCnpj')}
        value={clinicCnpj}
        onChangeText={setClinicCnpj}
        type="numeric"
        disabled={isSaving}
        accessibilityLabel={t('profile.clinicCnpj')}
      />
      <Input
        label={t('profile.clinicAddress')}
        value={clinicAddress}
        onChangeText={setClinicAddress}
        autoCapitalize="sentences"
        disabled={isSaving}
        accessibilityLabel={t('profile.clinicAddress')}
      />
      <Input
        label={t('profile.clinicPhone')}
        value={clinicPhone}
        onChangeText={setClinicPhone}
        type="phone"
        disabled={isSaving}
        accessibilityLabel={t('profile.clinicPhone')}
      />

      <View style={styles.divider} />

      {/* ── Referência Bibliográfica ────────────────────── */}
      <Text style={styles.sectionTitle}>{t('profile.bibliographicRef')}</Text>

      <Input
        label={t('profile.defaultReference')}
        value={defaultReference}
        onChangeText={setDefaultReference}
        multiline
        numberOfLines={4}
        disabled={isSaving}
        accessibilityLabel={t('profile.defaultReference')}
      />

      <View style={styles.divider} />

      {/* ── Feedback + Ações ───────────────────────────── */}
      {saveError && <MessageBox message={saveError} type="error" />}
      {saveSuccess && <MessageBox message={t('profile.saveSuccess')} type="success" />}

      <Button
        label={t('save')}
        onPress={handleSave}
        loading={isSaving}
        fullWidth
      />

      <View style={styles.divider} />

      <Button
        label={t('profile.logout')}
        onPress={handleLogout}
        variant="danger"
        fullWidth
        icon="log-out-outline"
      />
    </ScrollView>
  );
}

export default ProfileScreen;

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 600,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    fontSize: 15,
    fontFamily: Typography.body,
    color: Colors.textMuted,
  },
  pageTitle: {
    fontSize: 26,
    fontFamily: Typography.heading,
    color: Colors.foreground,
    marginTop: Spacing.xxl,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: Typography.bodyMedium,
    color: Colors.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.lg,
    borderRadius: Radius.full,
  },
});
