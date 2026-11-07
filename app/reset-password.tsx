import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import {
  exchangeRecoveryCode,
  hasRecoverySession,
  updatePasswordAndSignOut,
} from '@/services/auth';
import { AppError, ErrorCodes } from '@/lib/errors';
import { getPasswordIssue } from '@/lib/validation';
import { Button, Input, MessageBox } from '@/components/ui';
import { Colors, Spacing, Typography } from '@/constants/theme';

type Phase = 'verifying' | 'form' | 'invalid' | 'done';

// Destino do link "Esqueci minha senha" (redirectTo em sendPasswordReset).
// Só mostra o formulário quando a sessão veio de um link de recuperação
// (evento PASSWORD_RECOVERY) — uma sessão comum não pode trocar a senha por aqui.
export function ResetPasswordScreen() {
  const { t } = useTranslation('common');
  const params = useLocalSearchParams<{ code?: string; error_code?: string }>();

  const [phase, setPhase] = useState<Phase>('verifying');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      // Link expirado/já usado: o Supabase redireciona com ?error_code=...
      if (params.error_code) return 'invalid' as const;
      // Native: o deep link traz o ?code=; no web o supabase-js já fez a troca.
      if (Platform.OS !== 'web' && params.code && !hasRecoverySession()) {
        try {
          await exchangeRecoveryCode(params.code);
        } catch {
          return 'invalid' as const;
        }
      }
      return hasRecoverySession() ? ('form' as const) : ('invalid' as const);
    }

    verify().then((next) => {
      if (!cancelled) setPhase(next);
    });
    return () => {
      cancelled = true;
    };
  }, [params.code, params.error_code]);

  async function handleSubmit() {
    const issue = getPasswordIssue(password);
    if (issue) {
      setError(t(`auth.passwordIssue.${issue}`));
      return;
    }
    if (password !== confirm) {
      setError(t('auth.passwordMismatch'));
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      await updatePasswordAndSignOut(password);
      setPhase('done');
    } catch (err) {
      if (err instanceof AppError && err.code === ErrorCodes.AUTH_WEAK_PASSWORD) {
        setError(t('auth.weakPasswordServer'));
      } else {
        setError(t('genericError'));
      }
    } finally {
      setIsLoading(false);
    }
  }

  if (phase === 'verifying') return <View style={styles.container} />;

  if (phase === 'invalid' || phase === 'done') {
    return (
      <View style={styles.container}>
        <MessageBox
          message={phase === 'done' ? t('auth.passwordUpdated') : t('auth.resetLinkInvalid')}
          type={phase === 'done' ? 'success' : 'error'}
        />
        <Button label={t('auth.backToLogin')} onPress={() => router.replace('/')} fullWidth />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('auth.newPasswordTitle')}</Text>
      <Text style={styles.subtitle}>{t('auth.passwordRules')}</Text>

      {error && <MessageBox message={error} type="error" />}

      <Input
        value={password}
        onChangeText={setPassword}
        placeholder={t('auth.newPassword')}
        type="password"
        disabled={isLoading}
        accessibilityLabel={t('auth.newPassword')}
      />
      <Input
        value={confirm}
        onChangeText={setConfirm}
        placeholder={t('auth.confirmPassword')}
        type="password"
        disabled={isLoading}
        returnKeyType="send"
        onSubmitEditing={handleSubmit}
        accessibilityLabel={t('auth.confirmPassword')}
      />

      <Button label={t('auth.savePassword')} onPress={handleSubmit} loading={isLoading} fullWidth />
    </View>
  );
}

export default ResetPasswordScreen;

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
