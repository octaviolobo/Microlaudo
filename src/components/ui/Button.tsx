import { ActivityIndicator, Platform, Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Typography, Spacing, Radius, TouchTarget } from '@/constants/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  accessibilityLabel?: string;
};

const variantStyles = {
  primary: {
    container: { backgroundColor: Colors.primary },
    text: { color: Colors.primaryForeground },
  },
  secondary: {
    container: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderStyle: 'solid' as const,
      borderColor: Colors.inputBorder,
    },
    text: { color: Colors.textMuted },
  },
  danger: {
    container: { backgroundColor: Colors.error },
    text: { color: Colors.primaryForeground },
  },
} as const;

const sizeStyles = {
  sm: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontSize: 14, minHeight: TouchTarget.min },
  md: { paddingHorizontal: 28, paddingVertical: 12, fontSize: 16, minHeight: TouchTarget.min },
  lg: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, fontSize: 18, minHeight: 52 },
} as const;

// cursor:pointer necessário no web (design system MASTER.md)
const webCursor = Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : {};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  accessibilityLabel,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const v = variantStyles[variant];
  const s = sizeStyles[size];
  const indicatorColor = variant === 'secondary' ? Colors.primary : Colors.primaryForeground;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        v.container,
        { paddingHorizontal: s.paddingHorizontal, paddingVertical: s.paddingVertical, minHeight: s.minHeight },
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        webCursor,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={indicatorColor} size="small" />
      ) : (
        <>
          {icon && (
            <Ionicons name={icon} size={s.fontSize + 2} color={v.text.color} style={styles.icon} />
          )}
          <Text
            style={[
              styles.label,
              v.text,
              { fontSize: s.fontSize, fontFamily: Typography.headingSemiBold },
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.8,
  },
  label: {
    textAlign: 'center',
  },
  icon: {
    marginRight: Spacing.sm,
  },
});
