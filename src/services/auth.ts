import { AppError, ErrorCodes } from '@/lib/errors';

import { supabase } from './supabase';

import type { Session } from '@supabase/supabase-js';


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

// O perfil do médico é criado pelo trigger handle_new_user (migration 001).
// Passamos os dados via user_metadata para o trigger ler.
export async function signUp(input: RegisterInput): Promise<SignUpResult> {
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
