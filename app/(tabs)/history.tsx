import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { Input, MessageBox } from '@/components/ui';
import { useReportStore } from '@/stores/reportStore';
import { listReportsByDoctor } from '@/services/reports';
import { AppError } from '@/lib/errors';
import { formatDateBR } from '@/lib/date';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { isReportTypeEnabled } from '@/constants/features';

import type { ReportRow } from '@/types/database';
import type { ReportType } from '@/types/report';

function reportTypeOf(report: ReportRow): ReportType {
  return report.report_type === 'usg_transvaginal' ? 'usg_transvaginal' : 'microscopia';
}

const SEARCH_DEBOUNCE_MS = 300;

export function HistoryScreen() {
  const { t } = useTranslation('report');
  const { t: tc } = useTranslation('common');

  const hydrate = useReportStore((state) => state.hydrate);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce da busca (~300ms) para não bater no Supabase a cada tecla
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const loadReports = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await listReportsByDoctor({ search: debouncedSearch });
      setReports(data);
    } catch (err) {
      setError(err instanceof AppError ? err.message : tc('genericError'));
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, tc]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Recarrega ao voltar para a aba (ex.: após finalizar um laudo novo)
  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [loadReports]),
  );

  function handleOpen(report: ReportRow) {
    const type = reportTypeOf(report);
    // Laudo de um tipo ainda não liberado nesta plataforma (ex.: USG no mobile antes do
    // lançamento oficial): aparece na lista, mas só abre onde o tipo está habilitado.
    if (!isReportTypeEnabled(type)) {
      setError(t('history.typeUnavailable'));
      return;
    }
    hydrate(report);
    const base = type === 'microscopia' ? '/report' : '/report-usg';
    router.push(report.status === 'completed' ? `${base}/preview` : `${base}/patient`);
  }

  const renderItem = ({ item }: { item: ReportRow }) => {
    const isCompleted = item.status === 'completed';
    const badgeStyle = isCompleted ? styles.badgeCompleted : styles.badgeDraft;
    const badgeTextStyle = isCompleted ? styles.badgeCompletedText : styles.badgeDraftText;
    const statusLabel = isCompleted ? t('status.completed') : t('status.draft');
    const type = reportTypeOf(item);
    const typeEnabled = isReportTypeEnabled(type);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleOpen(item)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${item.patient_name} — ${statusLabel}`}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.patientName} numberOfLines={1}>
            {item.patient_name}
          </Text>
          <View style={[styles.badge, badgeStyle]}>
            <Text style={[styles.badgeText, badgeTextStyle]}>{statusLabel}</Text>
          </View>
        </View>
        <View style={styles.cardMeta}>
          <Text style={styles.typeText}>{t(`reportTypes.${type}`)}</Text>
          <Text style={styles.metaText}>
            ·{' '}
            {t(type === 'microscopia' ? 'history.collectedOn' : 'history.examinedOn', {
              date: formatDateBR(item.collection_date),
            })}
          </Text>
          {item.revision_number > 1 && (
            <Text style={styles.metaText}>· {t('revision', { number: item.revision_number })}</Text>
          )}
        </View>
        {typeEnabled ? (
          <View style={styles.cardAction}>
            <Text style={styles.actionText}>
              {isCompleted ? t('history.view') : t('history.continueDraft')}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
          </View>
        ) : (
          <Text style={styles.metaText}>{t('history.typeUnavailable')}</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('history.title')}</Text>

      <Input
        value={search}
        onChangeText={setSearch}
        placeholder={t('history.searchPlaceholder')}
        accessibilityLabel={tc('search')}
      />

      {error && <MessageBox message={error} type="error" />}

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.centeredText}>{tc('loading')}</Text>
        </View>
      ) : reports.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="document-text-outline" size={48} color={Colors.textSubtle} />
          <Text style={styles.centeredText}>
            {debouncedSearch ? tc('noResults') : t('history.empty')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={Platform.OS === 'web'}
        />
      )}
    </View>
  );
}

export default HistoryScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.lg,
  },
  title: {
    fontSize: 26,
    fontFamily: Typography.heading,
    color: Colors.foreground,
    marginTop: Spacing.xxl,
    marginBottom: Spacing.lg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: Spacing.xxl,
  },
  centeredText: {
    fontSize: 15,
    fontFamily: Typography.body,
    color: Colors.textSubtle,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  listContent: {
    paddingBottom: Spacing.xxl,
    paddingTop: Spacing.xs,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  patientName: {
    flex: 1,
    fontSize: 16,
    fontFamily: Typography.headingSemiBold,
    color: Colors.foreground,
    marginRight: Spacing.sm,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  badgeCompleted: {
    backgroundColor: Colors.successBg,
  },
  badgeDraft: {
    backgroundColor: Colors.warningBg,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: Typography.bodyMedium,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  badgeCompletedText: {
    color: Colors.success,
  },
  badgeDraftText: {
    color: Colors.warning,
  },
  cardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Spacing.sm,
  },
  typeText: {
    fontSize: 13,
    fontFamily: Typography.bodyMedium,
    color: Colors.primary,
    marginRight: 4,
  },
  metaText: {
    fontSize: 13,
    fontFamily: Typography.body,
    color: Colors.textMuted,
    marginRight: 4,
  },
  cardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  actionText: {
    fontSize: 13,
    fontFamily: Typography.bodyMedium,
    color: Colors.primary,
    marginRight: 4,
  },
});
