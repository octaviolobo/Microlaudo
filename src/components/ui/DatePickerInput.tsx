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

const YEAR_PAGE_SIZE = 12;

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

  const parsedValue = parseISODate(value);
  const parsedToday = parseISODate(isoToday())!;
  const [viewYear, setViewYear] = useState(parsedValue?.year ?? parsedToday.year);
  const [viewMonth, setViewMonth] = useState(parsedValue?.month ?? parsedToday.month);
  const [yearPageStart, setYearPageStart] = useState(
    (parsedValue?.year ?? parsedToday.year) - Math.floor(YEAR_PAGE_SIZE / 2)
  );

  const borderColor = error ? Colors.error : Colors.inputBorder;
  const weekdaysShort = t('calendar.weekdaysShort', { returnObjects: true }) as string[];
  const months = t('calendar.months', { returnObjects: true }) as string[];

  const cells = useMemo(() => {
    const total = daysInMonth(viewYear, viewMonth);
    const leading = firstWeekdayOfMonth(viewYear, viewMonth);
    const list: Array<number | null> = Array.from({ length: leading }, () => null);
    for (let day = 1; day <= total; day += 1) list.push(day);
    return list;
  }, [viewYear, viewMonth]);

  function openPicker() {
    if (disabled) return;
    const base = parsedValue ?? parsedToday;
    setViewYear(base.year);
    setViewMonth(base.month);
    setYearPageStart(base.year - Math.floor(YEAR_PAGE_SIZE / 2));
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

  function isDisabledDay(day: number) {
    const iso = toISODate(viewYear, viewMonth, day);
    if (maximumDate && iso > maximumDate) return true;
    if (minimumDate && iso < minimumDate) return true;
    return false;
  }

  function handleSelectDay(day: number) {
    if (isDisabledDay(day)) return;
    onChange(toISODate(viewYear, viewMonth, day));
    setOpen(false);
  }

  function handleSelectYear(year: number) {
    setViewYear(year);
    setMode('days');
  }

  function handleToday() {
    const iso = isoToday();
    if (maximumDate && iso > maximumDate) return;
    if (minimumDate && iso < minimumDate) return;
    onChange(iso);
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
          {value ? formatDateBR(value) : 'DD-MM-AAAA'}
        </Text>
        <Ionicons name="calendar-outline" size={20} color={Colors.textMuted} />
      </Pressable>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />

          {mode === 'days' ? (
            <>
              <View style={styles.header}>
                <Pressable
                  onPress={() => changeMonth(-1)}
                  accessibilityRole="button"
                  accessibilityLabel={t('back')}
                  style={styles.headerNavButton}
                >
                  <Ionicons name="chevron-back" size={20} color={Colors.foreground} />
                </Pressable>

                <Pressable
                  onPress={() => setMode('years')}
                  accessibilityRole="button"
                  accessibilityLabel={t('calendar.selectYear')}
                  style={styles.headerTitleButton}
                >
                  <Text style={styles.headerTitle}>
                    {months[viewMonth]} {viewYear}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => changeMonth(1)}
                  accessibilityRole="button"
                  accessibilityLabel={t('next')}
                  style={styles.headerNavButton}
                >
                  <Ionicons name="chevron-forward" size={20} color={Colors.foreground} />
                </Pressable>
              </View>

              <View style={styles.weekdaysRow}>
                {weekdaysShort.map((wd, i) => (
                  <Text key={`${wd}-${i}`} style={styles.weekdayText}>
                    {wd}
                  </Text>
                ))}
              </View>

              <View style={styles.daysGrid}>
                {cells.map((day, index) => {
                  if (day === null) return <View key={`empty-${index}`} style={styles.dayCell} />;

                  const iso = toISODate(viewYear, viewMonth, day);
                  const isSelected = iso === value;
                  const isToday = iso === isoToday();
                  const disabledDay = isDisabledDay(day);

                  return (
                    <Pressable
                      key={iso}
                      onPress={() => handleSelectDay(day)}
                      disabled={disabledDay}
                      accessibilityRole="button"
                      accessibilityLabel={formatDateBR(iso)}
                      accessibilityState={{ selected: isSelected, disabled: disabledDay }}
                      style={[
                        styles.dayCell,
                        isSelected && styles.dayCellSelected,
                        isToday && !isSelected && styles.dayCellToday,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          isSelected && styles.dayTextSelected,
                          disabledDay && styles.dayTextDisabled,
                        ]}
                      >
                        {day}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.footer}>
                <Pressable onPress={() => onChange('')} accessibilityRole="button">
                  <Text style={styles.footerActionText}>{t('calendar.clear')}</Text>
                </Pressable>
                <Pressable onPress={handleToday} accessibilityRole="button">
                  <Text style={styles.footerActionText}>{t('calendar.today')}</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <View style={styles.header}>
                <Pressable
                  onPress={() => setYearPageStart((y) => y - YEAR_PAGE_SIZE)}
                  accessibilityRole="button"
                  accessibilityLabel={t('back')}
                  style={styles.headerNavButton}
                >
                  <Ionicons name="chevron-back" size={20} color={Colors.foreground} />
                </Pressable>

                <Text style={styles.headerTitle}>
                  {yearPageStart} — {yearPageStart + YEAR_PAGE_SIZE - 1}
                </Text>

                <Pressable
                  onPress={() => setYearPageStart((y) => y + YEAR_PAGE_SIZE)}
                  accessibilityRole="button"
                  accessibilityLabel={t('next')}
                  style={styles.headerNavButton}
                >
                  <Ionicons name="chevron-forward" size={20} color={Colors.foreground} />
                </Pressable>
              </View>

              <View style={styles.yearsGrid}>
                {Array.from({ length: YEAR_PAGE_SIZE }, (_, i) => yearPageStart + i).map((year) => (
                  <Pressable
                    key={year}
                    onPress={() => handleSelectYear(year)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: year === viewYear }}
                    style={[styles.yearCell, year === viewYear && styles.yearCellSelected]}
                  >
                    <Text
                      style={[styles.yearText, year === viewYear && styles.yearTextSelected]}
                    >
                      {year}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const CELL_SIZE = 40;

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
    paddingHorizontal: Spacing.lg,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  headerNavButton: {
    width: TouchTarget.min,
    height: TouchTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: Typography.headingSemiBold,
    color: Colors.foreground,
    textTransform: 'capitalize',
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  weekdayText: {
    width: CELL_SIZE,
    textAlign: 'center',
    fontSize: 12,
    fontFamily: Typography.bodyMedium,
    color: Colors.textMuted,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  dayCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
  },
  dayCellSelected: {
    backgroundColor: Colors.primary,
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  dayText: {
    fontSize: 14,
    fontFamily: Typography.body,
    color: Colors.text,
  },
  dayTextSelected: {
    fontFamily: Typography.bodyMedium,
    color: Colors.primaryForeground,
  },
  dayTextDisabled: {
    color: Colors.textSubtle,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    marginTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerActionText: {
    fontSize: 14,
    fontFamily: Typography.bodyMedium,
    color: Colors.primary,
    padding: Spacing.xs,
  },
  yearsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  yearCell: {
    width: '30%',
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
    borderRadius: Radius.md,
    alignItems: 'center',
    backgroundColor: Colors.surfaceMuted,
  },
  yearCellSelected: {
    backgroundColor: Colors.primary,
  },
  yearText: {
    fontSize: 14,
    fontFamily: Typography.bodyMedium,
    color: Colors.text,
  },
  yearTextSelected: {
    color: Colors.primaryForeground,
  },
});
