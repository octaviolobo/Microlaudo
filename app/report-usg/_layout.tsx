import { Redirect, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Colors, Typography } from '@/constants/theme';
import { isReportTypeEnabled } from '@/constants/features';
import { useAuth } from '@/hooks/useAuth';
import { useDoctorStore } from '@/stores/doctorStore';
import { useReportStore } from '@/stores/reportStore';

// Fluxo do laudo de USG transvaginal (docs/spec-usg-transvaginal.md §4).
// Guardas:
// - Tipo desabilitado nesta plataforma (mobile antes do lançamento): volta para o início,
//   mesmo vindo de deep link.
// - Store sem laudo de USG carregado (ex.: recarregar a página no meio do fluxo na web —
//   o store vive só em memória): volta para o início em vez de abrir telas vazias.
export function ReportUsgLayout() {
  const { t } = useTranslation('report');
  const { isAuthenticated } = useAuth();
  const reportType = useReportStore((state) => state.reportType);
  const usgContent = useReportStore((state) => state.usgContent);
  const doctor = useDoctorStore((s) => s.doctor);

  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (doctor && !doctor.crm) return <Redirect href="/complete-profile" />;
  if (!isReportTypeEnabled('usg_transvaginal')) return <Redirect href="/(tabs)/home" />;
  if (reportType !== 'usg_transvaginal' || !usgContent) return <Redirect href="/(tabs)/home" />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.headerBg },
        headerTintColor: Colors.headerText,
        headerTitleStyle: { fontFamily: Typography.headingSemiBold },
      }}
    >
      <Stack.Screen name="patient" options={{ title: t('usg.steps.patient') }} />
      <Stack.Screen name="analysis" options={{ title: t('usg.steps.analysis') }} />
      <Stack.Screen name="text" options={{ title: t('usg.steps.text') }} />
      <Stack.Screen name="preview" options={{ title: t('usg.steps.preview') }} />
    </Stack>
  );
}

export default ReportUsgLayout;
