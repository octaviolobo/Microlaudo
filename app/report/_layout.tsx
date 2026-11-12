import { Redirect, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Colors, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useDoctorStore } from '@/stores/doctorStore';

// Mesmas guardas das abas: sem sessão vai pro login (inclusive deep link/URL digitada
// na web), e sem CRM vai completar o cadastro antes de emitir laudo.
export function ReportLayout() {
  const { t } = useTranslation('report');
  const { isAuthenticated } = useAuth();
  const doctor = useDoctorStore((s) => s.doctor);

  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (doctor && !doctor.crm) return <Redirect href="/complete-profile" />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.headerBg },
        headerTintColor: Colors.headerText,
        headerTitleStyle: { fontFamily: Typography.headingSemiBold },
      }}
    >
      <Stack.Screen name="patient"    options={{ title: t('steps.patient.title') }} />
      <Stack.Screen name="photos"     options={{ title: t('steps.photos.title') }} />
      <Stack.Screen name="scores"     options={{ title: t('steps.scores.title') }} />
      <Stack.Screen name="findings"   options={{ title: t('steps.findings.title') }} />
      <Stack.Screen name="conclusion" options={{ title: t('steps.conclusion.title') }} />
      <Stack.Screen name="preview"    options={{ title: t('steps.preview.title') }} />
    </Stack>
  );
}

export default ReportLayout;
