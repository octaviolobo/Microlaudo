import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { signIn } from '@/services/auth';
import { AppError } from '@/lib/errors';
import { Button, Input, MessageBox } from '@/components/ui';
import { Colors, Typography, Spacing } from '@/constants/theme';

export function LoginScreen() {
  const { t } = useTranslation('common');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError(t('auth.fillRequired'));
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      await signIn(email.trim(), password);
    } catch (err) {
      setError(err instanceof AppError ? t('auth.invalidCredentials') : t('genericError'));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('title')}</Text>
      <Text style={styles.subtitle}>{t('subtitle')}</Text>

      {error && <MessageBox message={error} type="error" />}

      <Input
        value={email}
        onChangeText={setEmail}
        placeholder={t('auth.email')}
        type="email"
        disabled={isLoading}
        returnKeyType="next"
        accessibilityLabel={t('auth.email')}
      />
      <Input
        value={password}
        onChangeText={setPassword}
        placeholder={t('auth.password')}
        type="password"
        disabled={isLoading}
        returnKeyType="done"
        onSubmitEditing={handleLogin}
        accessibilityLabel={t('auth.password')}
      />

      <Button
        label={t('auth.login')}
        onPress={handleLogin}
        loading={isLoading}
        fullWidth
        accessibilityLabel={t('auth.login')}
      />

      <Button
        label={t('auth.register')}
        onPress={() => router.push('/(auth)/register')}
        variant="secondary"
        disabled={isLoading}
        fullWidth
      />

      <Button
        label={t('auth.forgotPassword')}
        onPress={() => router.push('/(auth)/forgot-password')}
        variant="secondary"
        disabled={isLoading}
        fullWidth
      />
    </View>
  );
}

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    // maxWidth evita que inputs esticam edge-to-edge no desktop web
    alignSelf: 'center',
    width: '100%',
    maxWidth: 420,
  },
  title: {
    fontSize: 32,
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
