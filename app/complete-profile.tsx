import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { updateProfile } from '@/services/profile';
import { AppError } from '@/lib/errors';
import { useAuth } from '@/hooks/useAuth';
import { useDoctorStore } from '@/stores/doctorStore';
import { Button, Input, MessageBox } from '@/components/ui';
import { Colors, Typography, Spacing } from '@/constants/theme';

export function CompleteProfileScreen() {
  const { t } = useTranslation('common');
  const { isAuthenticated, user } = useAuth();
  const doctor = useDoctorStore((s) => s.doctor);
  const setDoctor = useDoctorStore((s) => s.setDoctor);

  const [fullName, setFullName] = useState(
    doctor?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || '',
  );
  const [crm, setCrm] = useState('');
  const [rqe, setRqe] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (doctor?.crm) return <Redirect href="/(tabs)/home" />;

  async function handleSubmit() {
    if (!fullName.trim() || !crm.trim()) {
      setError(t('auth.fillRequired'));
      return;
    }
    try {
      setIsSaving(true);
      setError(null);
      const updated = await updateProfile({
        full_name: fullName.trim(),
        crm: crm.trim(),
        rqe: rqe.trim() || null,
      });
      setDoctor(updated);
      router.replace('/(tabs)/home');
    } catch (err) {
      setError(err instanceof AppError ? err.message : t('genericError'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('completeProfile.title')}</Text>
      <Text style={styles.subtitle}>{t('completeProfile.subtitle')}</Text>

      {error && <MessageBox message={error} type="error" />}
      <MessageBox message={t('completeProfile.prefilledHint')} type="info" />

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

      <Button
        label={t('completeProfile.submit')}
        onPress={handleSubmit}
        loading={isSaving}
        fullWidth
      />
    </View>
  );
}

export default CompleteProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 420,
  },
  title: {
    fontSize: 28,
    fontFamily: Typography.heading,
    color: Colors.foreground,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: Typography.body,
    color: Colors.textMuted,
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
});
