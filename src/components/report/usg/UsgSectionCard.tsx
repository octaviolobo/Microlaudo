import { View, Text, StyleSheet } from 'react-native';

import { Colors, Typography, Spacing, Radius } from '@/constants/theme';

import type { ReactNode } from 'react';

type UsgSectionCardProps = {
  title: string;
  children: ReactNode;
};

// Bloco visual de uma estrutura anatômica na tela de Análise do USG.
export function UsgSectionCard({ title, children }: UsgSectionCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {children}
    </View>
  );
}

// Linha com campos lado a lado (ex.: as 3 medidas). Quebra em telas estreitas.
export function UsgFieldRow({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

export function UsgField({ children }: { children: ReactNode }) {
  return <View style={styles.field}>{children}</View>;
}

export default UsgSectionCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 16,
    fontFamily: Typography.headingSemiBold,
    color: Colors.foreground,
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  field: {
    flexGrow: 1,
    flexBasis: 160,
  },
});
