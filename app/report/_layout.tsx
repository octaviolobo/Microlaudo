import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Colors, Typography } from '@/constants/theme';

export function ReportLayout() {
  const { t } = useTranslation('report');

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
