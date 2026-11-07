const ISO_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

// Data local do aparelho. toISOString() usaria UTC: no Brasil, depois das 21h o
// "hoje" virava amanhã (data do exame errada e calendário liberando o dia seguinte).
export function isoToday(now: Date = new Date()): string {
  return toISODate(now.getFullYear(), now.getMonth(), now.getDate());
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

// Idade em anos completos na data de referência (ex.: data do exame). null se alguma
// data for inválida ou se o nascimento for depois da referência.
export function calculateAge(birthIso: string | null | undefined, referenceIso: string): number | null {
  const birth = birthIso ? parseISODate(birthIso) : null;
  const ref = parseISODate(referenceIso);
  if (!birth || !ref) return null;
  let age = ref.year - birth.year;
  if (ref.month < birth.month || (ref.month === birth.month && ref.day < birth.day)) age -= 1;
  return age >= 0 ? age : null;
}

const MONTHS_PT = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

// "22 de outubro de 2026 às 10:49", no fuso local — rodapé do laudo de USG.
export function formatDateTimeLongBR(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${date.getDate()} de ${MONTHS_PT[date.getMonth()]} de ${date.getFullYear()} às ${hh}:${mm}`;
}
