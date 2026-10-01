import '@/i18n';

import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
} from '@expo-google-fonts/figtree';
import {
  NotoSans_400Regular,
  NotoSans_500Medium,
  NotoSans_700Bold,
} from '@expo-google-fonts/noto-sans';

import { getSession, subscribeToAuthChanges } from '@/services/auth';
import { getProfile } from '@/services/profile';
import { useAuthStore } from '@/stores/authStore';
import { useDoctorStore } from '@/stores/doctorStore';

SplashScreen.preventAutoHideAsync();

export function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
    NotoSans_400Regular,
    NotoSans_500Medium,
    NotoSans_700Bold,
  });

  const setUser = useAuthStore((s) => s.setUser);
  const setSession = useAuthStore((s) => s.setSession);
  const setLoading = useAuthStore((s) => s.setLoading);
  const isAuthLoading = useAuthStore((s) => s.isLoading);

  const setDoctor = useDoctorStore((s) => s.setDoctor);
  // Estado local (não o doctorStore.isLoading) — esse campo também é usado pela
  // tela de Perfil pro próprio loading dela; se o layout raiz dependesse dele,
  // visitar o Perfil desmontaria o app inteiro (RootLayout retorna null) e
  // resetaria a navegação pra rota inicial.
  const [isDoctorBootLoading, setIsDoctorBootLoading] = useState(false);

  useEffect(() => {
    // Atualiza o doctor em segundo plano — usado em mudanças de auth state
    // (ex.: refresh de token) que acontecem depois do boot, sem travar a tela.
    function refreshDoctorProfile() {
      getProfile()
        .then(setDoctor)
        .catch(() => setDoctor(null));
    }

    getSession()
      .then((session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (!session) return;
        setIsDoctorBootLoading(true);
        return getProfile()
          .then(setDoctor)
          .catch(() => setDoctor(null))
          .finally(() => setIsDoctorBootLoading(false));
      })
      .catch(() => {
        // Falha de rede ou Supabase indisponível — continua sem sessão
        setSession(null);
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });

    const subscription = subscribeToAuthChanges((session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session) refreshDoctorProfile();
      else setDoctor(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Esconde splash quando fontes, auth E perfil (quando autenticado) estiverem resolvidos.
  // fontError: falha de fonte não bloqueia o app — usa system font como fallback.
  useEffect(() => {
    if ((fontsLoaded || fontError) && !isAuthLoading && !isDoctorBootLoading) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError, isAuthLoading, isDoctorBootLoading]);

  if ((!fontsLoaded && !fontError) || isAuthLoading || isDoctorBootLoading) return null;

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="complete-profile" />
        <Stack.Screen name="report" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}

export default RootLayout;
