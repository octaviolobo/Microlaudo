import { Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Colors, Typography } from '@/constants/theme';

// Botão "Início" no cabeçalho da 1ª etapa do laudo. A primeira tela de uma Stack
// aninhada não ganha a seta de voltar automática, e sem isso o médico ficava preso
// em "Dados do paciente" (ex.: depois do paywall). Volta para a aba Início do mesmo
// jeito que o finalizar faz; o que já foi salvo continua no Histórico.
export function ExitReportButton() {
  const { t } = useTranslation('report');
  return (
    <Pressable
      onPress={() => router.replace('/(tabs)/home')}
      accessibilityRole="button"
      accessibilityLabel={t('tabs.home')}
      hitSlop={12}
      style={styles.button}
    >
      <Ionicons name="chevron-back" size={22} color={Colors.headerText} />
      <Text style={styles.label}>{t('tabs.home')}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { flexDirection: 'row', alignItems: 'center', paddingRight: 8 },
  label: { color: Colors.headerText, fontFamily: Typography.body, fontSize: 16 },
});
