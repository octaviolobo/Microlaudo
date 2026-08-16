import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type ReturnKeyTypeOptions,
} from 'react-native';

import { Colors, Typography, Spacing, Radius, TouchTarget } from '@/constants/theme';

export type InputType = 'text' | 'email' | 'password' | 'numeric' | 'phone';

type InputProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  error?: string;
  helper?: string;
  type?: InputType;
  disabled?: boolean;
  returnKeyType?: ReturnKeyTypeOptions;
  onSubmitEditing?: () => void;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
  numberOfLines?: number;
  accessibilityLabel?: string;
  onFocus?: () => void;
  onBlur?: () => void;
};

const typeConfig: Record<InputType, Partial<React.ComponentProps<typeof TextInput>>> = {
  text: {},
  email: { keyboardType: 'email-address', autoCapitalize: 'none', autoCorrect: false },
  password: { secureTextEntry: true, autoCorrect: false, autoCapitalize: 'none' },
  numeric: { keyboardType: 'numeric' },
  phone: { keyboardType: 'phone-pad' },
};

export function Input({
  value,
  onChangeText,
  placeholder,
  label,
  required = false,
  error,
  helper,
  type = 'text',
  disabled = false,
  returnKeyType,
  onSubmitEditing,
  autoCapitalize,
  multiline = false,
  numberOfLines,
  accessibilityLabel,
  onFocus,
  onBlur,
}: InputProps) {
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? Colors.error
    : focused
      ? Colors.inputBorderFocus
      : Colors.inputBorder;

  const subText = error ?? helper;
  const subTextColor = error ? Colors.error : Colors.textMuted;

  return (
    <View style={styles.wrapper}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textSubtle}
        editable={!disabled}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        multiline={multiline}
        numberOfLines={numberOfLines}
        accessibilityLabel={accessibilityLabel ?? label ?? placeholder}
        accessibilityState={{ disabled }}
        onFocus={() => {
          setFocused(true);
          onFocus?.();
        }}
        onBlur={() => {
          setFocused(false);
          onBlur?.();
        }}
        style={[
          styles.input,
          { borderColor },
          disabled && styles.disabled,
          multiline && styles.multiline,
        ]}
        {...typeConfig[type]}
        // autoCapitalize vem depois do spread para que o prop explícito vença o typeConfig
        autoCapitalize={autoCapitalize ?? typeConfig[type].autoCapitalize ?? 'sentences'}
      />
      {subText && (
        <Text style={[styles.subText, { color: subTextColor }]}>{subText}</Text>
      )}
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
  input: {
    width: '100%',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: Typography.body,
    color: Colors.text,
    backgroundColor: Colors.surface,
    minHeight: TouchTarget.min,
  },
  disabled: {
    opacity: 0.5,
  },
  multiline: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: Spacing.sm,
  },
  subText: {
    fontSize: 12,
    fontFamily: Typography.body,
    marginTop: Spacing.xs,
  },
});
