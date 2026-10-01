import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

import { AppError, ErrorCodes } from '@/lib/errors';
import { validateCrm } from '@/lib/validation';

import { supabase } from './supabase';

import type { Session } from '@supabase/supabase-js';

// Fecha a aba de auth no web quando o provedor volta via window.opener/redirect.
// Não faz nada no native — seguro chamar incondicionalmente.
WebBrowser.maybeCompleteAuthSession();

export type OAuthProvider = 'google' | 'facebook';

export type RegisterInput = {
  email: string;
  password: string;
  full_name: string;
  crm: string;
  rqe?: string;
};

export type SignUpResult = {
  needsEmailConfirmation: boolean;
};

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new AppError(ErrorCodes.AUTH_LOGIN_FAILED, error.message, error);
}

// Login/cadastro via provedor social (Google/Facebook). Mesmo fluxo cobre
// login e signup — o handle_new_user (migration 001/007) cria o perfil
// automaticamente no primeiro acesso, com crm vazio até completar o cadastro.
export async function signInWithOAuth(provider: OAuthProvider): Promise<void> {
  if (Platform.OS === 'web') {
    // Redireciona pra raiz (não "auth-callback") porque no web é uma navegação de
    // página inteira roteada pelo Expo Router — uma rota inexistente cairia no 404.
    // app/index.tsx já detecta a sessão (via detectSessionInUrl) e redireciona.
    const redirectTo = AuthSession.makeRedirectUri();
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
    if (error) throw new AppError(ErrorCodes.AUTH_LOGIN_FAILED, error.message, error);
    // No web a página navega inteira pro provedor — não há mais nada a fazer aqui.
    return;
  }

  const redirectTo = AuthSession.makeRedirectUri({ path: 'auth-callback' });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data.url) {
    throw new AppError(ErrorCodes.AUTH_LOGIN_FAILED, error?.message ?? 'Falha ao iniciar login', error);
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type === 'cancel' || result.type === 'dismiss') return;
  if (result.type !== 'success' || !result.url) {
    throw new AppError(ErrorCodes.AUTH_LOGIN_FAILED, 'Login social falhou ou foi interrompido');
  }

  const code = new URL(result.url).searchParams.get('code');
  if (!code) throw new AppError(ErrorCodes.AUTH_LOGIN_FAILED, 'Código de autenticação ausente no retorno');

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) throw new AppError(ErrorCodes.AUTH_LOGIN_FAILED, exchangeError.message, exchangeError);
}

// O perfil do médico é criado pelo trigger handle_new_user (migration 001).
// Passamos os dados via user_metadata para o trigger ler.
export async function signUp(input: RegisterInput): Promise<SignUpResult> {
  validateCrm(input.crm);

  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        full_name: input.full_name,
        crm: input.crm,
        rqe: input.rqe ?? null,
      },
    },
  });

  if (error) throw new AppError(ErrorCodes.AUTH_REGISTER_FAILED, error.message, error);

  // session === null significa que o e-mail de confirmação foi enviado
  return { needsEmailConfirmation: data.session === null };
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new AppError(ErrorCodes.AUTH_LOGOUT_FAILED, error.message, error);
}

export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'microlaudo://reset-password',
  });
  if (error) throw new AppError(ErrorCodes.AUTH_LOGIN_FAILED, error.message, error);
}

export async function getSession(): Promise<Session | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

export function subscribeToAuthChanges(callback: (session: Session | null) => void) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return subscription;
}
