import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { getProfile, updateProfile } from '@/services/profile';
import { signOut } from '@/services/auth';
import { deleteAccount } from '@/services/account';
import { AppError } from '@/lib/errors';
import { Button, Input, MessageBox, Select } from '@/components/ui';
import { AssetUploader } from '@/components/profile/AssetUploader';
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
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Danger zone
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
        setLogoUrl(data.logo_url ?? null);
        setSignatureUrl(data.signature_url ?? null);
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

  async function handleLogoUploaded(path: string) {
    const updated = await updateProfile({
      full_name: fullName.trim() || (doctor?.full_name ?? ''),
      crm: crm.trim() || (doctor?.crm ?? ''),
      logo_url: path,
    });
    setDoctor(updated);
    setLogoUrl(path);
  }

  async function handleLogoRemoved() {
    const updated = await updateProfile({
      full_name: fullName.trim() || (doctor?.full_name ?? ''),
      crm: crm.trim() || (doctor?.crm ?? ''),
      logo_url: null,
    });
    setDoctor(updated);
    setLogoUrl(null);
  }

  async function handleSignatureUploaded(path: string) {
    const updated = await updateProfile({
      full_name: fullName.trim() || (doctor?.full_name ?? ''),
      crm: crm.trim() || (doctor?.crm ?? ''),
      signature_url: path,
    });
    setDoctor(updated);
    setSignatureUrl(path);
  }

  async function handleSignatureRemoved() {
    const updated = await updateProfile({
      full_name: fullName.trim() || (doctor?.full_name ?? ''),
      crm: crm.trim() || (doctor?.crm ?? ''),
      signature_url: null,
    });
    setDoctor(updated);
    setSignatureUrl(null);
  }

  async function handleConfirmDelete() {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount();
      // Após deletar no backend, encerra sessão local e volta pro login
      try {
        await signOut();
      } catch {
        // sessão já pode estar inválida no servidor — segue o fluxo
      }
      clearAuth();
      router.replace('/(auth)/login');
    } catch (err) {
      setDeleteError(err instanceof AppError ? err.message : t('profile.deleteAccountError'));
      setIsDeleting(false);
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

      {/* ── Logo + Assinatura ──────────────────────────── */}
      <Text style={styles.sectionTitle}>{t('profile.brandAssets')}</Text>
      <MessageBox message={t('profile.brandAssetsInfo')} type="info" />

      <AssetUploader
        label={t('profile.logo')}
        kind="logo"
        currentPath={logoUrl}
        onUploaded={handleLogoUploaded}
        onRemoved={handleLogoRemoved}
      />
      <AssetUploader
        label={t('profile.signature')}
        kind="signature"
        currentPath={signatureUrl}
        onUploaded={handleSignatureUploaded}
        onRemoved={handleSignatureRemoved}
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

      <View style={styles.divider} />

      {/* ── Zona de Perigo (LGPD) ──────────────────────── */}
      <View style={styles.dangerZone}>
        <Text style={styles.dangerTitle}>{t('profile.dangerZone')}</Text>
        <Text style={styles.dangerBody}>{t('profile.deleteAccountDescription')}</Text>

        {!showDeleteConfirm ? (
          <Button
            label={t('profile.deleteAccount')}
            onPress={() => {
              setDeleteError(null);
              setShowDeleteConfirm(true);
            }}
            variant="danger"
            fullWidth
            icon="trash-outline"
          />
        ) : (
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>{t('profile.deleteAccountConfirmTitle')}</Text>
            <Text style={styles.confirmBody}>{t('profile.deleteAccountConfirmBody')}</Text>

            {deleteError && <MessageBox message={deleteError} type="error" />}

            <Button
              label={
                isDeleting ? t('profile.deletingAccount') : t('profile.deleteAccountConfirmButton')
              }
              onPress={handleConfirmDelete}
              variant="danger"
              loading={isDeleting}
              fullWidth
              icon="alert-circle-outline"
            />
            <Button
              label={t('profile.deleteAccountCancel')}
              onPress={() => {
                setShowDeleteConfirm(false);
                setDeleteError(null);
              }}
              variant="secondary"
              disabled={isDeleting}
              fullWidth
            />
          </View>
        )}
      </View>
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
  dangerZone: {
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: Radius.md,
    padding: Spacing.md,
    backgroundColor: Colors.errorBg,
  },
  dangerTitle: {
    fontSize: 14,
    fontFamily: Typography.bodyBold,
    color: Colors.error,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.xs,
  },
  dangerBody: {
    fontSize: 13,
    fontFamily: Typography.body,
    color: Colors.text,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  confirmBox: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.error,
  },
  confirmTitle: {
    fontSize: 15,
    fontFamily: Typography.bodyBold,
    color: Colors.error,
    marginBottom: Spacing.xs,
  },
  confirmBody: {
    fontSize: 13,
    fontFamily: Typography.body,
    color: Colors.text,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
});
