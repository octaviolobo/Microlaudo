const ISO_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatDateBR(iso: string | undefined | null): string {
  const match = iso ? ISO_PATTERN.exec(iso) : null;
  if (!match) return '';
  const [, year, month, day] = match;
  return `${day}-${month}-${year}`;
}

export function parseISODate(iso: string): { year: number; month: number; day: number } | null {
  const match = ISO_PATTERN.exec(iso);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]) - 1, day: Number(match[3]) };
}

export function toISODate(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function firstWeekdayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}
