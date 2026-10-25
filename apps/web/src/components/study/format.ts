// Small date/time formatting helpers (NZ English, Pacific/Auckland time).

const NZ_TZ = 'Pacific/Auckland';
const rtf = new Intl.RelativeTimeFormat('en-NZ', { numeric: 'auto' });
const dateFmt = new Intl.DateTimeFormat('en-NZ', { timeZone: NZ_TZ, weekday: 'short', day: 'numeric', month: 'short' });
const dateYearFmt = new Intl.DateTimeFormat('en-NZ', { timeZone: NZ_TZ, day: 'numeric', month: 'short', year: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('en-NZ', { timeZone: NZ_TZ, hour: 'numeric', minute: '2-digit' });
const yearFmt = new Intl.DateTimeFormat('en-NZ', { timeZone: NZ_TZ, year: 'numeric' });

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** "just now", "5 minutes ago", "yesterday", "3 days ago", then a date. */
export function timeAgo(at: number, now = Date.now()): string {
  const diff = at - now;
  const abs = Math.abs(diff);
  if (abs < MIN) return 'just now';
  if (abs < HOUR) return rtf.format(Math.round(diff / MIN), 'minute');
  if (abs < DAY) return rtf.format(Math.round(diff / HOUR), 'hour');
  if (abs < 7 * DAY) return rtf.format(Math.round(diff / DAY), 'day');
  return formatDate(at, now);
}

/** "Sat 25 Oct", or "25 Oct 2025" for another year. */
export function formatDate(at: number, now = Date.now()): string {
  return yearFmt.format(at) === yearFmt.format(now) ? dateFmt.format(at) : dateYearFmt.format(at);
}

/** "Sat 25 Oct, 3:42 pm" */
export function formatDateTime(at: number, now = Date.now()): string {
  return `${formatDate(at, now)}, ${timeFmt.format(at)}`;
}

/** "1 h 5 min", "12 min", "40 s" */
export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s} s`;
  const mins = Math.round(s / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Countdown clock: "4:05" or "1:02:09". */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export const plural = (n: number, word: string, many = `${word}s`) => `${n.toLocaleString('en-NZ')} ${n === 1 ? word : many}`;
