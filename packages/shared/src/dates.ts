import type { DateKey } from './types';

const NZ_TZ = 'Pacific/Auckland';
const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: NZ_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** The NZ calendar date (YYYY-MM-DD) for an instant. */
export function nzDateKey(at: Date | number = Date.now()): DateKey {
  return formatter.format(typeof at === 'number' ? new Date(at) : at);
}

/** Adds whole days to a date key (calendar arithmetic, no time zone involved). */
export function addDays(key: DateKey, days: number): DateKey {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/** Whole days from a to b (positive when b is later). */
export function daysBetween(a: DateKey, b: DateKey): number {
  const toUtc = (k: DateKey) => {
    const [y, m, d] = k.split('-').map(Number) as [number, number, number];
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
}

/** 0 = Sunday … 6 = Saturday for a date key. */
export function weekday(key: DateKey): number {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Monday of the week containing the date key (weeks start on Monday in NZ). */
export function weekStart(key: DateKey): DateKey {
  const wd = weekday(key);
  return addDays(key, wd === 0 ? -6 : 1 - wd);
}

/** YYYY-MM month key in NZ time. */
export function nzMonthKey(at: Date | number = Date.now()): string {
  return nzDateKey(at).slice(0, 7);
}

const longFormatter = new Intl.DateTimeFormat('en-NZ', {
  timeZone: 'UTC',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

/** e.g. "Mon 3 Nov" */
export function formatDateKey(key: DateKey): string {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return longFormatter.format(new Date(Date.UTC(y, m - 1, d)));
}
