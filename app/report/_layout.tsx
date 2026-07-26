import { Stack } from 'expo-router';

import { Colors, Typography } from '@/constants/theme';

export function ReportLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.headerBg },
        headerTintColor: Colors.headerText,
        headerTitleStyle: { fontFamily: Typography.headingSemiBold },
      }}
    >
      <Stack.Screen name="patient"    options={{ title: 'Dados do Paciente' }} />
      <Stack.Screen name="photos"     options={{ title: 'Fotos da Lâmina' }} />
      <Stack.Screen name="findings"   options={{ title: 'Achados Microscópicos' }} />
      <Stack.Screen name="scores"     options={{ title: 'Nugent & Amsel' }} />
      <Stack.Screen name="conclusion" options={{ title: 'Conclusão' }} />
      <Stack.Screen name="preview"    options={{ title: 'Preview do Laudo' }} />
    </Stack>
  );
}

export default ReportLayout;
