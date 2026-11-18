import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';

import { AppError, ErrorCodes } from '@/lib/errors';
import { validateCrm } from '@/lib/validation';

import { supabase } from './supabase';

import type { Session } from '@supabase/supabase-js';

// Fecha a aba de auth no web quando o provedor volta via window.opener/redirect.
// Não faz nada no native — seguro chamar incondicionalmente.
WebBrowser.maybeCompleteAuthSession();

// Marca que a sessão atual veio de um link de recuperação de senha. Registrado no
// import do módulo — antes de o supabase-js terminar a troca do ?code= no web
// (detectSessionInUrl), que emite PASSWORD_RECOVERY uma única vez durante o init.
// A tela /reset-password só mostra o formulário com essa marca, para que uma sessão
// comum não vire atalho para trocar a senha sem o link do e-mail.
let recoverySessionActive = false;
supabase.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') recoverySessionActive = true;
  if (event === 'SIGNED_OUT') recoverySessionActive = false;
});

export function hasRecoverySession(): boolean {
  return recoverySessionActive;
}

export type OAuthProvider = 'google' | 'facebook';

export type RegisterInput = {
  email: string;
  password: string;
  full_name: string;
  crm: string;
  rqe?: string;
  captchaToken?: string;
};

// Supabase devolve captcha_failed quando o CAPTCHA está ligado e o token falta,
// expirou ou já foi usado.
function isCaptchaError(error: { code?: string } | null): boolean {
  return error?.code === 'captcha_failed';
}

export type SignUpResult = {
  needsEmailConfirmation: boolean;
};

export async function signIn(email: string, password: string, captchaToken?: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
    options: { captchaToken },
  });
  if (error) {
    const code = isCaptchaError(error) ? ErrorCodes.AUTH_CAPTCHA_FAILED : ErrorCodes.AUTH_LOGIN_FAILED;
    throw new AppError(code, error.message, error);
  }
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

// "Entrar com Apple" (só iOS). Obrigatório pela App Store (regra 4.8) porque o app
// oferece login com Google/Facebook. Fluxo nativo: a Apple devolve um identityToken
// assinado e o Supabase valida com signInWithIdToken — não há navegador nem secret
// no app. No Supabase, o provedor Apple precisa ter o bundle id (com.microlaudo.app)
// em "Client IDs". O nonce bruto vai para o Supabase e o hash SHA-256 para a Apple.
export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  return AppleAuthentication.isAvailableAsync();
}

export async function signInWithApple(captchaToken?: string): Promise<void> {
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
  } catch (err) {
    // Usuário fechou a folha da Apple: não é erro.
    if ((err as { code?: string })?.code === 'ERR_REQUEST_CANCELED') return;
    throw new AppError(ErrorCodes.AUTH_LOGIN_FAILED, 'Falha no login com a Apple', err);
  }

  if (!credential.identityToken) {
    throw new AppError(ErrorCodes.AUTH_LOGIN_FAILED, 'A Apple não devolveu o token de identidade');
  }

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce: rawNonce,
    options: { captchaToken },
  });
  if (error) {
    const code = isCaptchaError(error) ? ErrorCodes.AUTH_CAPTCHA_FAILED : ErrorCodes.AUTH_LOGIN_FAILED;
    throw new AppError(code, error.message, error);
  }

  // A Apple só manda o nome no PRIMEIRO login e ele não vem no token. Guardamos no
  // user_metadata para a tela "Completar cadastro" já trazer o nome preenchido.
  const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
    .filter(Boolean)
    .join(' ')
    .trim();
  if (fullName) {
    // Falhar aqui não impede o login; o médico digita o nome no cadastro.
    await supabase.auth.updateUser({ data: { full_name: fullName } });
  }
}

// Para onde o link de confirmação do e-mail leva.
// Web: a origem de onde o médico se cadastrou (produção, preview ou local). Com
// PKCE, o supabase-js troca o ?code= ao abrir e o médico já entra logado, se for
// o mesmo navegador. A origem precisa estar em Redirect URLs; senão o Supabase
// usa o Site URL.
// Native: undefined → Site URL (site web). Ainda não há tratamento do link de
// confirmação no app.
function signUpRedirectTo(): string | undefined {
  return Platform.OS === 'web' ? AuthSession.makeRedirectUri() : undefined;
}

// O perfil do médico é criado pelo trigger handle_new_user (migration 001).
// Passamos os dados via user_metadata para o trigger ler.
export async function signUp(input: RegisterInput): Promise<SignUpResult> {
  validateCrm(input.crm);

  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      captchaToken: input.captchaToken,
      emailRedirectTo: signUpRedirectTo(),
      data: {
        full_name: input.full_name,
        crm: input.crm,
        rqe: input.rqe ?? null,
      },
    },
  });

  if (error) {
    if (isCaptchaError(error)) {
      throw new AppError(ErrorCodes.AUTH_CAPTCHA_FAILED, error.message, error);
    }
    if (error.code === 'weak_password') {
      throw new AppError(ErrorCodes.AUTH_WEAK_PASSWORD, error.message, error);
    }
    if (error.code === 'user_already_exists' || error.code === 'email_exists') {
      throw new AppError(ErrorCodes.AUTH_EMAIL_IN_USE, error.message, error);
    }
    throw new AppError(ErrorCodes.AUTH_REGISTER_FAILED, error.message, error);
  }

  // session === null significa que o e-mail de confirmação foi enviado
  return { needsEmailConfirmation: data.session === null };
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new AppError(ErrorCodes.AUTH_LOGOUT_FAILED, error.message, error);
}

export async function sendPasswordReset(email: string, captchaToken?: string): Promise<void> {
  // Native: microlaudo://reset-password · Web: <origin>/reset-password.
  // As duas URLs precisam estar em Authentication → URL Configuration → Redirect URLs.
  const redirectTo = AuthSession.makeRedirectUri({ path: 'reset-password' });
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo, captchaToken });
  if (error) {
    const code = isCaptchaError(error) ? ErrorCodes.AUTH_CAPTCHA_FAILED : ErrorCodes.AUTH_LOGIN_FAILED;
    throw new AppError(code, error.message, error);
  }
}

// Native: troca o ?code= do deep link pela sessão de recuperação (o code verifier
// PKCE ficou no SecureStore deste aparelho — link aberto em outro aparelho falha).
// No web isso já foi feito pelo supabase-js (detectSessionInUrl).
export async function exchangeRecoveryCode(code: string): Promise<void> {
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw new AppError(ErrorCodes.AUTH_RECOVERY_INVALID, error.message, error);
}

// Grava a nova senha e encerra TODAS as sessões (scope global), inclusive uma
// eventualmente roubada — quem pediu o reset entra de novo com a senha nova.
export async function updatePasswordAndSignOut(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    const code = error.code === 'weak_password' || error.code === 'same_password'
      ? ErrorCodes.AUTH_WEAK_PASSWORD
      : ErrorCodes.AUTH_PASSWORD_UPDATE_FAILED;
    throw new AppError(code, error.message, error);
  }
  recoverySessionActive = false;
  const { error: signOutError } = await supabase.auth.signOut({ scope: 'global' });
  if (signOutError) {
    // Senha já trocada; falha só no logout global — não desfaz o sucesso.
    await supabase.auth.signOut({ scope: 'local' });
  }
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
