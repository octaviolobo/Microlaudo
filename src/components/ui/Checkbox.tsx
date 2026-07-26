import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Typography, Spacing, Radius, TouchTarget } from '@/constants/theme';

type CheckboxProps = {
  value: boolean;
  onValueChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  accessibilityLabel?: string;
};

export function Checkbox({
  value,
  onValueChange,
  label,
  disabled = false,
  accessibilityLabel,
}: CheckboxProps) {
  return (
    <Pressable
      onPress={() => !disabled && onValueChange(!value)}
      accessibilityRole="checkbox"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ checked: value, disabled }}
      style={({ pressed }) => [
        styles.container,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.box,
          value ? styles.boxChecked : styles.boxUnchecked,
        ]}
      >
        {value && (
          <Ionicons name="checkmark" size={14} color={Colors.primaryForeground} />
        )}
      </View>
      {label && <Text style={styles.label}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: TouchTarget.min,
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: Radius.sm - 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: {
    backgroundColor: Colors.primary,
    borderWidth: 0,
  },
  boxUnchecked: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
  },
  label: {
    flex: 1,
    fontSize: 15,
    fontFamily: Typography.body,
    color: Colors.text,
    lineHeight: 22,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.7,
  },
});
