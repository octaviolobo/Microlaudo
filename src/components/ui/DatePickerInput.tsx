import { useMemo, useState } from 'react';
import {
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
import {
  daysInMonth,
  firstWeekdayOfMonth,
  formatDateBR,
  isoToday,
  parseISODate,
  toISODate,
} from '@/lib/date';

type DatePickerInputProps = {
  value: string;
  onChange: (isoDate: string) => void;
  label?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  maximumDate?: string;
  minimumDate?: string;
  accessibilityLabel?: string;
};

type DayCell = {
  iso: string;
  day: number;
  inMonth: boolean;
};

const YEAR_PAGE_SIZE = 12;
// Grade sempre com 6 semanas: o cartão não muda de altura ao trocar de mês.
const GRID_CELLS = 42;

export function DatePickerInput({
  value,
  onChange,
  label,
  required = false,
  error,
  disabled = false,
  maximumDate,
  minimumDate,
  accessibilityLabel,
}: DatePickerInputProps) {
  const { t } = useTranslation('common');

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'days' | 'years'>('days');
  // Data escolhida dentro do calendário; só vai pro formulário ao tocar em "Concluir".
  const [draft, setDraft] = useState(value);

  const todayIso = isoToday();
  const parsedToday = parseISODate(todayIso)!;
  const [viewYear, setViewYear] = useState(parsedToday.year);
  const [viewMonth, setViewMonth] = useState(parsedToday.month);
  const [yearPageStart, setYearPageStart] = useState(parsedToday.year - Math.floor(YEAR_PAGE_SIZE / 2));

  const borderColor = error ? Colors.error : Colors.inputBorder;
  const weekdaysShort = t('calendar.weekdaysShort', { returnObjects: true }) as string[];
  const months = t('calendar.months', { returnObjects: true }) as string[];

  // Inclui os dias finais do mês anterior e os iniciais do próximo (em cinza), como num calendário de parede.
  const cells = useMemo<DayCell[]>(() => {
    const leading = firstWeekdayOfMonth(viewYear, viewMonth);
    const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
    const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
    const prevTotal = daysInMonth(prevYear, prevMonth);
    const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;

    const list: DayCell[] = [];
    for (let i = leading - 1; i >= 0; i -= 1) {
      const day = prevTotal - i;
      list.push({ iso: toISODate(prevYear, prevMonth, day), day, inMonth: false });
    }
    const total = daysInMonth(viewYear, viewMonth);
    for (let day = 1; day <= total; day += 1) {
      list.push({ iso: toISODate(viewYear, viewMonth, day), day, inMonth: true });
    }
    for (let day = 1; list.length < GRID_CELLS; day += 1) {
      list.push({ iso: toISODate(nextYear, nextMonth, day), day, inMonth: false });
    }
    return list;
  }, [viewYear, viewMonth]);

  const weeks = useMemo(() => {
    const rows: DayCell[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [cells]);

  function isOutOfRange(iso: string) {
    if (maximumDate && iso > maximumDate) return true;
    if (minimumDate && iso < minimumDate) return true;
    return false;
  }

  function isYearOutOfRange(year: number) {
    if (maximumDate && `${year}-01-01` > maximumDate) return true;
    if (minimumDate && `${year}-12-31` < minimumDate) return true;
    return false;
  }

  function showMonthOf(iso: string) {
    const parsed = parseISODate(iso) ?? parsedToday;
    setViewYear(parsed.year);
    setViewMonth(parsed.month);
    setYearPageStart(parsed.year - Math.floor(YEAR_PAGE_SIZE / 2));
  }

  function openPicker() {
    if (disabled) return;
    setDraft(value);
    showMonthOf(value || todayIso);
    setMode('days');
    setOpen(true);
  }

  function changeMonth(delta: number) {
    let month = viewMonth + delta;
    let year = viewYear;
    if (month < 0) {
      month = 11;
      year -= 1;
    } else if (month > 11) {
      month = 0;
      year += 1;
    }
    setViewMonth(month);
    setViewYear(year);
  }

  function handleSelectDay(cell: DayCell) {
    if (isOutOfRange(cell.iso)) return;
    setDraft(cell.iso);
    if (!cell.inMonth) showMonthOf(cell.iso);
  }

  function handleSelectYear(year: number) {
    setViewYear(year);
    setMode('days');
  }

  function handleToday() {
    if (isOutOfRange(todayIso)) return;
    setDraft(todayIso);
    showMonthOf(todayIso);
  }

  function handleClear() {
    onChange('');
    setOpen(false);
  }

  function handleDone() {
    if (draft !== value) onChange(draft);
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
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled, expanded: open }}
        style={[styles.trigger, { borderColor }, disabled && styles.disabled]}
      >
        <Text style={[styles.triggerText, !value && styles.placeholder]} numberOfLines={1}>
          {value ? formatDateBR(value) : t('datePlaceholder')}
        </Text>
        <Ionicons name="calendar-outline" size={20} color={Colors.textMuted} />
      </Pressable>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => setOpen(false)}>
            <View style={styles.backdrop} />
          </TouchableWithoutFeedback>

          <View style={styles.card}>
            <View style={styles.header}>
              <NavButton
                icon="chevron-back"
                label={t('back')}
                onPress={() =>
                  mode === 'days' ? changeMonth(-1) : setYearPageStart((y) => y - YEAR_PAGE_SIZE)
                }
              />

              {mode === 'days' ? (
                <Pressable
                  onPress={() => setMode('years')}
                  accessibilityRole="button"
                  accessibilityLabel={t('calendar.selectYear')}
                  style={styles.headerTitleButton}
                >
                  <Text style={styles.headerTitle}>
                    {months[viewMonth]} {viewYear}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={Colors.textMuted} />
                </Pressable>
              ) : (
                <Text style={styles.headerTitle}>
                  {yearPageStart} – {yearPageStart + YEAR_PAGE_SIZE - 1}
                </Text>
              )}

              <NavButton
                icon="chevron-forward"
                label={t('next')}
                onPress={() =>
                  mode === 'days' ? changeMonth(1) : setYearPageStart((y) => y + YEAR_PAGE_SIZE)
                }
              />
            </View>

            <View style={styles.divider} />

            {mode === 'days' ? (
              <>
                <View style={styles.row}>
                  {weekdaysShort.map((wd, i) => (
                    <Text key={`${wd}-${i}`} style={[styles.cell, styles.weekdayText]}>
                      {wd}
                    </Text>
                  ))}
                </View>

                {weeks.map((week) => (
                  <View key={week[0].iso} style={styles.row}>
                    {week.map((cell) => {
                      const isSelected = cell.iso === draft;
                      const isToday = cell.iso === todayIso;
                      const outOfRange = isOutOfRange(cell.iso);

                      return (
                        <View key={cell.iso} style={styles.cell}>
                          <Pressable
                            onPress={() => handleSelectDay(cell)}
                            disabled={outOfRange}
                            accessibilityRole="button"
                            accessibilityLabel={formatDateBR(cell.iso)}
                            accessibilityState={{ selected: isSelected, disabled: outOfRange }}
                            style={({ hovered, pressed }: { hovered?: boolean; pressed: boolean }) => [
                              styles.day,
                              (hovered || pressed) && !isSelected && !outOfRange && styles.dayHover,
                              isToday && !isSelected && styles.dayToday,
                              isSelected && styles.daySelected,
                            ]}
                          >
                            <Text
                              style={[
                                styles.dayText,
                                !cell.inMonth && styles.dayTextOutside,
                                outOfRange && styles.dayTextDisabled,
                                isToday && !isSelected && styles.dayTextToday,
                                isSelected && styles.dayTextSelected,
                              ]}
                            >
                              {cell.day}
                            </Text>
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                ))}
              </>
            ) : (
              <View style={styles.yearsGrid}>
                {Array.from({ length: YEAR_PAGE_SIZE }, (_, i) => yearPageStart + i).map((year) => {
                  const isSelected = year === viewYear;
                  const yearDisabled = isYearOutOfRange(year);
                  return (
                    <Pressable
                      key={year}
                      onPress={() => handleSelectYear(year)}
                      disabled={yearDisabled}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected, disabled: yearDisabled }}
                      style={[styles.yearCell, isSelected && styles.daySelected]}
                    >
                      <Text
                        style={[
                          styles.yearText,
                          yearDisabled && styles.dayTextDisabled,
                          isSelected && styles.dayTextSelected,
                        ]}
                      >
                        {year}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <View style={styles.footer}>
              <View style={styles.footerLinks}>
                <Pressable onPress={handleClear} accessibilityRole="button" style={styles.footerLink}>
                  <Text style={styles.footerLinkText}>{t('calendar.clear')}</Text>
                </Pressable>
                <Pressable onPress={handleToday} accessibilityRole="button" style={styles.footerLink}>
                  <Text style={styles.footerLinkText}>{t('calendar.today')}</Text>
                </Pressable>
              </View>
              <Pressable
                onPress={handleDone}
                accessibilityRole="button"
                style={({ pressed }) => [styles.doneButton, pressed && styles.doneButtonPressed]}
              >
                <Text style={styles.doneText}>{t('calendar.done')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function NavButton({
  icon,
  label,
  onPress,
}: {
  icon: 'chevron-back' | 'chevron-forward';
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [styles.navButton, pressed && styles.dayHover]}
    >
      <Ionicons name={icon} size={18} color={Colors.foreground} />
    </Pressable>
  );
}

const DAY_SIZE = 38;

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
  // ─── Modal ───────────────────────────────────────────────
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(22, 78, 99, 0.35)',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    shadowColor: Colors.foreground,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  headerTitleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: Typography.headingSemiBold,
    color: Colors.foreground,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.inputBorder,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    opacity: 0.6,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 3,
  },
  weekdayText: {
    textAlign: 'center',
    fontSize: 13,
    fontFamily: Typography.body,
    color: Colors.textSubtle,
    paddingVertical: Spacing.sm,
  },
  day: {
    width: DAY_SIZE,
    height: DAY_SIZE,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  dayHover: {
    backgroundColor: Colors.surfaceMuted,
  },
  dayToday: {
    borderColor: Colors.primary,
  },
  daySelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dayText: {
    fontSize: 15,
    fontFamily: Typography.bodyMedium,
    color: Colors.text,
  },
  dayTextOutside: {
    color: Colors.textSubtle,
    fontFamily: Typography.body,
  },
  dayTextDisabled: {
    color: Colors.inputBorder,
  },
  dayTextToday: {
    color: Colors.primary,
  },
  dayTextSelected: {
    color: Colors.primaryForeground,
    fontFamily: Typography.bodyBold,
  },
  yearsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
  },
  yearCell: {
    width: '31%',
    paddingVertical: 12,
    marginBottom: Spacing.sm,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: Colors.surfaceMuted,
  },
  yearText: {
    fontSize: 15,
    fontFamily: Typography.bodyMedium,
    color: Colors.text,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  footerLinks: {
    flexDirection: 'row',
  },
  footerLink: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  footerLinkText: {
    fontSize: 14,
    fontFamily: Typography.bodyMedium,
    color: Colors.textMuted,
  },
  doneButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: Spacing.lg,
  },
  doneButtonPressed: {
    opacity: 0.85,
  },
  doneText: {
    fontSize: 14,
    fontFamily: Typography.headingSemiBold,
    color: Colors.primaryForeground,
  },
});
