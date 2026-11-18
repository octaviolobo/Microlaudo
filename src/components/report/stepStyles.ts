import { StyleSheet } from 'react-native';

import { Colors, Typography, Spacing, Radius } from '@/constants/theme';

// Estilos partilhados entre todos os steps do fluxo de laudo
export const stepStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.lg,
  },
  step: {
    fontSize: 12,
    fontFamily: Typography.bodyMedium,
    color: Colors.textSubtle,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 22,
    fontFamily: Typography.heading,
    color: Colors.foreground,
    marginBottom: Spacing.lg,
  },
  placeholder: {
    fontSize: 15,
    fontFamily: Typography.body,
    color: Colors.textSubtle,
    textAlign: 'center',
    marginTop: 40,
  },
  nav: {
    position: 'absolute',
    bottom: 32,
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  backButton: {
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: Radius.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  backText: {
    color: Colors.textMuted,
    fontSize: 16,
    fontFamily: Typography.bodyMedium,
  },
  nextButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: Radius.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  nextText: {
    color: Colors.primaryForeground,
    fontSize: 16,
    fontFamily: Typography.headingSemiBold,
  },
  finalizeButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: Radius.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  finalizeText: {
    color: Colors.accentForeground,
    fontSize: 16,
    fontFamily: Typography.headingSemiBold,
  },
  spacer: { flex: 1 },
});
