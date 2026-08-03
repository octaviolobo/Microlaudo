import { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { Colors, Typography, Spacing, Radius, TouchTarget } from '@/constants/theme';

export type SelectOption = { label: string; value: string };

type SelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  label?: string;
  required?: boolean;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  accessibilityLabel?: string;
};

export function Select({
  value,
  onValueChange,
  options,
  label,
  required = false,
  placeholder,
  error,
  disabled = false,
  accessibilityLabel,
}: SelectProps) {
  const { t } = useTranslation('common');
  const [open, setOpen] = useState(false);
  const resolvedPlaceholder = placeholder ?? t('selectPlaceholder');

  const selected = options.find((o) => o.value === value);
  const borderColor = error ? Colors.error : Colors.inputBorder;

  function handleSelect(optionValue: string) {
    onValueChange(optionValue);
    setOpen(false);
  }

  return (
    <View style={styles.wrapper}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}

      <Pressable
        onPress={() => !disabled && setOpen(true)}
        accessibilityRole="combobox"
        accessibilityLabel={accessibilityLabel ?? label ?? resolvedPlaceholder}
        accessibilityState={{ disabled, expanded: open }}
        style={[styles.trigger, { borderColor }, disabled && styles.disabled]}
      >
        <Text
          style={[styles.triggerText, !selected && styles.placeholder]}
          numberOfLines={1}
        >
          {selected ? selected.label : resolvedPlaceholder}
        </Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={Colors.textMuted}
        />
      </Pressable>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <FlatList
            data={options}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handleSelect(item.value)}
                accessibilityRole="menuitem"
                accessibilityState={{ selected: item.value === value }}
                style={({ pressed }) => [
                  styles.option,
                  item.value === value && styles.optionSelected,
                  pressed && styles.optionPressed,
                ]}
              >
                <Text
                  style={[
                    styles.optionText,
                    item.value === value && styles.optionTextSelected,
                  ]}
                >
                  {item.label}
                </Text>
                {item.value === value && (
                  <Ionicons name="checkmark" size={18} color={Colors.primary} />
                )}
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    marginBottom: Spacing.sm,
  },
  label: {
    fontSize: 14,
    fontFamily: Typography.bodyMedium,
    color: Colors.foreground,
    marginBottom: Spacing.xs,
  },
  required: {
    color: Colors.error,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    minHeight: TouchTarget.min,
  },
  triggerText: {
    flex: 1,
    fontSize: 16,
    fontFamily: Typography.body,
    color: Colors.text,
    marginRight: Spacing.sm,
  },
  placeholder: {
    color: Colors.textSubtle,
  },
  disabled: {
    opacity: 0.5,
  },
  errorText: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
  // Modal
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    maxHeight: '60%',
    paddingBottom: Spacing.xl,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginVertical: Spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 48,
  },
  optionSelected: {
    backgroundColor: Colors.background,
  },
  optionPressed: {
    backgroundColor: Colors.surfaceMuted,
  },
  optionText: {
    fontSize: 16,
    fontFamily: Typography.body,
    color: Colors.text,
  },
  optionTextSelected: {
    fontFamily: Typography.bodyMedium,
    color: Colors.primary,
  },
});
