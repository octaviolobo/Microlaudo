import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { signUp } from '@/services/auth';
import { AppError } from '@/lib/errors';
import { Button, Input, MessageBox } from '@/components/ui';
import { Colors, Typography, Spacing } from '@/constants/theme';

export function RegisterScreen() {
  const { t } = useTranslation('common');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [crm, setCrm] = useState('');
  const [rqe, setRqe] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  async function handleRegister() {
    if (!fullName.trim() || !email.trim() || !password || !crm.trim()) {
      setError(t('auth.fillRequired'));
      return;
    }
    if (password.length < 6) {
      setError(t('auth.weakPassword'));
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const { needsEmailConfirmation } = await signUp({
        email: email.trim(),
        password,
        full_name: fullName.trim(),
        crm: crm.trim(),
        rqe: rqe.trim() || undefined,
      });
      if (needsEmailConfirmation) setConfirmationSent(true);
    } catch (err) {
      setError(err instanceof AppError ? t('auth.emailInUse') : t('genericError'));
    } finally {
      setIsLoading(false);
    }
  }

  if (confirmationSent) {
    return (
      <View style={styles.container}>
        <MessageBox message={t('auth.confirmEmail')} type="success" />
        <Button
          label={t('auth.backToLogin')}
          onPress={() => router.replace('/(auth)/login')}
          fullWidth
        />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{t('auth.register')}</Text>

      {error && <MessageBox message={error} type="error" />}

      <Input
        value={fullName}
        onChangeText={setFullName}
        placeholder={t('auth.fullName')}
        autoCapitalize="words"
        disabled={isLoading}
        accessibilityLabel={t('auth.fullName')}
      />
      <Input
        value={email}
        onChangeText={setEmail}
        placeholder={t('auth.email')}
        type="email"
        disabled={isLoading}
        accessibilityLabel={t('auth.email')}
      />
      <Input
        value={password}
        onChangeText={setPassword}
        placeholder={t('auth.password')}
        type="password"
        disabled={isLoading}
        accessibilityLabel={t('auth.password')}
      />
      <Input
        value={crm}
        onChangeText={setCrm}
        placeholder={t('auth.crm')}
        autoCapitalize="characters"
        disabled={isLoading}
        accessibilityLabel={t('auth.crm')}
      />
      <Input
        value={rqe}
        onChangeText={setRqe}
        placeholder={t('auth.rqeOptional')}
        disabled={isLoading}
        accessibilityLabel={t('auth.rqeOptional')}
      />

      <Button
        label={t('auth.register')}
        onPress={handleRegister}
        loading={isLoading}
        fullWidth
      />
      <Button
        label={t('auth.alreadyHaveAccount')}
        onPress={() => router.back()}
        variant="secondary"
        disabled={isLoading}
        fullWidth
      />
    </ScrollView>
  );
}

export default RegisterScreen;

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 420,
  },
  title: {
    fontSize: 26,
    fontFamily: Typography.heading,
    color: Colors.foreground,
    marginBottom: Spacing.lg,
  },
});
