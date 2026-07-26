import { describe, expect, it } from '@jest/globals';

import {
  daysInMonth,
  firstWeekdayOfMonth,
  formatDateBR,
  isoToday,
  parseISODate,
  toISODate,
} from '@/lib/date';

describe('formatDateBR', () => {
  it('formata ISO válido no padrão dd-mm-yyyy', () => {
    expect(formatDateBR('2026-07-26')).toBe('26-07-2026');
  });

  it('preserva zeros à esquerda no dia e mês', () => {
    expect(formatDateBR('2024-01-05')).toBe('05-01-2024');
  });

  it('retorna string vazia para string vazia', () => {
    expect(formatDateBR('')).toBe('');
  });

  it('retorna string vazia para undefined', () => {
    expect(formatDateBR(undefined)).toBe('');
  });

  it('retorna string vazia para null', () => {
    expect(formatDateBR(null)).toBe('');
  });

  it('retorna string vazia para ISO malformado (sem padding correto)', () => {
    expect(formatDateBR('2024-1-5')).toBe('');
  });

  it('retorna string vazia para string totalmente inválida', () => {
    expect(formatDateBR('não é data')).toBe('');
  });

  it('retorna string vazia para formato brasileiro (dd/mm/yyyy)', () => {
    expect(formatDateBR('26/07/2026')).toBe('');
  });
});

describe('parseISODate', () => {
  it('parseia ISO válido retornando ano, mês (0-indexed) e dia', () => {
    expect(parseISODate('2026-07-26')).toEqual({ year: 2026, month: 6, day: 26 });
  });

  it('parseia janeiro como month 0', () => {
    expect(parseISODate('2024-01-15')).toEqual({ year: 2024, month: 0, day: 15 });
  });

  it('parseia dezembro como month 11', () => {
    expect(parseISODate('2024-12-31')).toEqual({ year: 2024, month: 11, day: 31 });
  });

  it('retorna null para string malformada', () => {
    expect(parseISODate('2024-1-5')).toBeNull();
  });

  it('retorna null para string vazia', () => {
    expect(parseISODate('')).toBeNull();
  });

  it('retorna null para formato brasileiro', () => {
    expect(parseISODate('26/07/2026')).toBeNull();
  });
});

describe('toISODate', () => {
  it('formata (2026, 6, 26) como 2026-07-26 (month é 0-indexed)', () => {
    expect(toISODate(2026, 6, 26)).toBe('2026-07-26');
  });

  it('aplica padding de zero no mês e dia de um dígito', () => {
    expect(toISODate(2024, 0, 5)).toBe('2024-01-05');
  });

  it('formata mês 11 (dezembro) como 12 no ISO', () => {
    expect(toISODate(2024, 11, 31)).toBe('2024-12-31');
  });
});

describe('round-trip parseISODate → toISODate', () => {
  it('parse + to devolve o ISO original', () => {
    const iso = '2026-07-26';
    const parsed = parseISODate(iso);
    expect(parsed).not.toBeNull();
    if (!parsed) return;
    expect(toISODate(parsed.year, parsed.month, parsed.day)).toBe(iso);
  });

  it('round-trip funciona para janeiro e dezembro', () => {
    for (const iso of ['2024-01-01', '2024-12-31', '2000-02-29']) {
      const parsed = parseISODate(iso);
      expect(parsed).not.toBeNull();
      if (!parsed) return;
      expect(toISODate(parsed.year, parsed.month, parsed.day)).toBe(iso);
    }
  });
});

describe('daysInMonth', () => {
  it('janeiro tem 31 dias', () => {
    expect(daysInMonth(2024, 0)).toBe(31);
  });

  it('abril tem 30 dias', () => {
    expect(daysInMonth(2024, 3)).toBe(30);
  });

  it('dezembro tem 31 dias', () => {
    expect(daysInMonth(2024, 11)).toBe(31);
  });

  it('fevereiro tem 29 dias em ano bissexto (2024)', () => {
    expect(daysInMonth(2024, 1)).toBe(29);
  });

  it('fevereiro tem 28 dias em ano não-bissexto (2023)', () => {
    expect(daysInMonth(2023, 1)).toBe(28);
  });

  it('fevereiro tem 28 dias em 2100 (não-bissexto — divisível por 100 mas não por 400)', () => {
    expect(daysInMonth(2100, 1)).toBe(28);
  });

  it('fevereiro tem 29 dias em 2000 (bissexto — divisível por 400)', () => {
    expect(daysInMonth(2000, 1)).toBe(29);
  });
});

describe('firstWeekdayOfMonth', () => {
  // Sanity checks com datas conhecidas (0=Domingo, 6=Sábado)
  it('1º de janeiro de 2024 é uma segunda-feira (weekday 1)', () => {
    expect(firstWeekdayOfMonth(2024, 0)).toBe(1);
  });

  it('1º de dezembro de 2024 é um domingo (weekday 0)', () => {
    expect(firstWeekdayOfMonth(2024, 11)).toBe(0);
  });

  it('1º de julho de 2026 é uma quarta-feira (weekday 3)', () => {
    expect(firstWeekdayOfMonth(2026, 6)).toBe(3);
  });

  it('retorna um valor entre 0 e 6', () => {
    for (let month = 0; month < 12; month++) {
      const weekday = firstWeekdayOfMonth(2024, month);
      expect(weekday).toBeGreaterThanOrEqual(0);
      expect(weekday).toBeLessThanOrEqual(6);
    }
  });
});

describe('isoToday', () => {
  it('retorna string no formato ISO yyyy-mm-dd', () => {
    expect(isoToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('começa com o ano atual (UTC)', () => {
    const currentYearUtc = new Date().getUTCFullYear();
    expect(isoToday().startsWith(String(currentYearUtc))).toBe(true);
  });

  it('é parseável por parseISODate (round-trip)', () => {
    const today = isoToday();
    const parsed = parseISODate(today);
    expect(parsed).not.toBeNull();
    if (!parsed) return;
    expect(toISODate(parsed.year, parsed.month, parsed.day)).toBe(today);
  });
});
