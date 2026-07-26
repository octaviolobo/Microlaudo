import { Redirect } from 'expo-router';

import { useAuth } from '@/hooks/useAuth';

export function IndexPage() {
  const { isAuthenticated, isLoading } = useAuth();

  // _layout.tsx garante que isLoading === false antes de renderizar este componente
  if (isLoading) return null;

  if (isAuthenticated) return <Redirect href="/(tabs)/home" />;
  return <Redirect href="/(auth)/login" />;
}

export default IndexPage;
