import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { sendPasswordReset } from '@/services/auth';
import { AppError } from '@/lib/errors';
import { Button, Input, MessageBox } from '@/components/ui';
import { Colors, Typography, Spacing } from '@/constants/theme';

export function ForgotPasswordScreen() {
  const { t } = useTranslation('common');

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSend() {
    if (!email.trim()) {
      setError(t('auth.fillRequired'));
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      await sendPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof AppError ? t('genericError') : t('genericError'));
    } finally {
      setIsLoading(false);
    }
  }

  if (sent) {
    return (
      <View style={styles.container}>
        <MessageBox message={t('auth.emailSent')} type="success" />
        <Button
          label={t('auth.backToLogin')}
          onPress={() => router.replace('/(auth)/login')}
          fullWidth
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('auth.recoverPassword')}</Text>
      <Text style={styles.subtitle}>{t('auth.recoverPasswordSubtitle')}</Text>

      {error && <MessageBox message={error} type="error" />}

      <Input
        value={email}
        onChangeText={setEmail}
        placeholder={t('auth.email')}
        type="email"
        disabled={isLoading}
        returnKeyType="send"
        onSubmitEditing={handleSend}
        accessibilityLabel={t('auth.email')}
      />

      <Button
        label={t('auth.sendLink')}
        onPress={handleSend}
        loading={isLoading}
        fullWidth
      />
      <Button
        label={t('auth.backToLogin')}
        onPress={() => router.back()}
        variant="secondary"
        disabled={isLoading}
        size="sm"
      />
    </View>
  );
}

export default ForgotPasswordScreen;

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
    fontSize: 26,
    fontFamily: Typography.heading,
    color: Colors.foreground,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: Typography.body,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
});
