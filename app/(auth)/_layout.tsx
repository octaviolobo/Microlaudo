import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/hooks/useAuth';

export function AuthLayout() {
  const { isAuthenticated } = useAuth();

  // Usuário já autenticado não tem o que fazer nas telas de auth
  if (isAuthenticated) return <Redirect href="/(tabs)/home" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default AuthLayout;
