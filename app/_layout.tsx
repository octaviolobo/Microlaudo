import '@/i18n';

import { useEffect } from 'react';
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
import { useAuthStore } from '@/stores/authStore';

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

  useEffect(() => {
    getSession()
      .then((session) => {
        setSession(session);
        setUser(session?.user ?? null);
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
    });

    return () => subscription.unsubscribe();
  }, []);

  // Esconde splash quando fontes E auth estiverem resolvidos.
  // fontError: falha de fonte não bloqueia o app — usa system font como fallback.
  useEffect(() => {
    if ((fontsLoaded || fontError) && !isAuthLoading) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError, isAuthLoading]);

  if ((!fontsLoaded && !fontError) || isAuthLoading) return null;

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="report" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}

export default RootLayout;
