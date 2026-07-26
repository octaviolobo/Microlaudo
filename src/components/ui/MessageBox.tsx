import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Typography, Spacing, Radius } from '@/constants/theme';

export type MessageType = 'error' | 'warning' | 'success' | 'info';

type MessageBoxProps = {
  message: string;
  type?: MessageType;
};

const config: Record<MessageType, { bg: string; text: string; icon: keyof typeof Ionicons.glyphMap }> = {
  error:   { bg: Colors.errorBg,   text: Colors.error,    icon: 'alert-circle-outline' },
  warning: { bg: Colors.warningBg, text: Colors.warning,  icon: 'warning-outline' },
  success: { bg: Colors.successBg, text: Colors.success,  icon: 'checkmark-circle-outline' },
  info:    { bg: Colors.surfaceMuted, text: Colors.foreground, icon: 'information-circle-outline' },
};

export function MessageBox({ message, type = 'error' }: MessageBoxProps) {
  const { bg, text, icon } = config[type];

  return (
    <View
      style={[styles.container, { backgroundColor: bg }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Ionicons name={icon} size={18} color={text} style={styles.icon} />
      <Text style={[styles.text, { color: text }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.errorPadding,
    borderRadius: Radius.sm,
    width: '100%',
    marginBottom: Spacing.md,
    // gap não é confiável no RN Web SDK 52 — usar marginRight no ícone

  },
  icon: {
    flexShrink: 0,
    marginRight: Spacing.sm,
  },
  text: {
    flex: 1,
    fontSize: 14,
    fontFamily: Typography.body,
    lineHeight: 20,
  },
});
