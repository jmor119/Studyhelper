// Helpers for m7.mea.units-time: clock-time formatting, counting on between times, and a
// timetable figure. Times are whole minutes after midnight (0 … 1439).

import { INK, label, line, svgDoc } from '../../../svg';

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Hour (1–12), minute and am/pm for a time of day. */
export function parts12(t: number): { h: number; m: number; ap: 'am' | 'pm' } {
  const day = ((t % 1440) + 1440) % 1440;
  const h24 = Math.floor(day / 60);
  const m = day % 60;
  return { h: h24 % 12 === 0 ? 12 : h24 % 12, m, ap: h24 < 12 ? 'am' : 'pm' };
}

/** 12-hour time: 885 → "2:45 pm". */
export function fmt12(t: number): string {
  const { h, m, ap } = parts12(t);
  return `${h}:${pad2(m)} ${ap}`;
}

/** 12-hour time without am/pm (for timetables that say "all times are am"). */
export function fmt12Short(t: number): string {
  const { h, m } = parts12(t);
  return `${h}:${pad2(m)}`;
}

/** 24-hour time: 885 → "14:45". */
export function fmt24(t: number): string {
  const day = ((t % 1440) + 1440) % 1440;
  return `${pad2(Math.floor(day / 60))}:${pad2(day % 60)}`;
}

/** "1 hour 5 minutes", "2 hours", "45 minutes". */
export function hoursMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const hText = h ? `${h} hour${h === 1 ? '' : 's'}` : '';
  const mText = m ? `${m} minute${m === 1 ? '' : 's'}` : '';
  return [hText, mText].filter(Boolean).join(' ') || '0 minutes';
}

/** Accepted spellings for a minutes blank: 5 → ["05", "5"]. */
export function minuteAccepted(m: number): string[] {
  return m < 10 ? [pad2(m), String(m)] : [String(m)];
}

/** Accepted spellings for a 24-hour hours blank: 7 → ["07", "7"]. */
export function hour24Accepted(h: number): string[] {
  return h < 10 ? [pad2(h), String(h)] : [String(h)];
}

/**
 * A step-by-step "count on" explanation from time a to time b (b > a), going to the next o'clock
 * first. Returns the sentence(s) ending with the total in minutes.
 */
export function countOn(a: number, b: number, fmt: (t: number) => string): string {
  const total = b - a;
  const nextHour = Math.ceil(a / 60) * 60;
  if (b <= nextHour || nextHour === a) {
    if (nextHour === a && total >= 60) {
      const hours = Math.floor(total / 60);
      const rest = total % 60;
      const mid = a + hours * 60;
      const lines = [`From ${fmt(a)} to ${fmt(mid)} is ${hoursMinutes(hours * 60)} (${hours * 60} minutes).`];
      if (rest) lines.push(`From ${fmt(mid)} to ${fmt(b)} is ${rest} minutes.`);
      lines.push(`Total: ${rest ? `${hours * 60} + ${rest} = ` : ''}**${total} minutes**.`);
      return lines.join('\n\n');
    }
    return `From ${fmt(a)} to ${fmt(b)} is **${total} minutes**.`;
  }
  const first = nextHour - a;
  const hours = Math.floor((b - nextHour) / 60);
  const last = (b - nextHour) % 60;
  const lines = [`From ${fmt(a)} to ${fmt(nextHour)} is ${first} minutes.`];
  const pieces = [first];
  if (hours) {
    lines.push(`From ${fmt(nextHour)} to ${fmt(nextHour + hours * 60)} is ${hoursMinutes(hours * 60)} (${hours * 60} minutes).`);
    pieces.push(hours * 60);
  }
  if (last) {
    lines.push(`From ${fmt(nextHour + hours * 60)} to ${fmt(b)} is ${last} minutes.`);
    pieces.push(last);
  }
  lines.push(`Total: ${pieces.join(' + ')} = **${total} minutes**.`);
  return lines.join('\n\n');
}

/**
 * A timetable drawn as a table: one row per stop, one column per service.
 * `times[service][stop]` are minutes after midnight.
 */
export function timetableFigure(opts: {
  title: string;
  stops: string[];
  services: string[];
  times: number[][];
  fmt: (t: number) => string;
  note?: string;
}): string {
  const { title, stops, services, times, fmt, note } = opts;
  const left = 12;
  const top = 34;
  const firstCol = 138;
  const col = 78;
  const row = 28;
  const width = left * 2 + firstCol + col * services.length;
  const tableH = row * (stops.length + 1);
  const height = top + tableH + (note ? 34 : 14);
  let body = label({ x: width / 2, y: 17 }, title, { bold: true, size: 15 });
  body += `<rect x="${left}" y="${top}" width="${width - left * 2}" height="${row}" fill="#dbeafe"/>`;
  body += label({ x: left + 8, y: top + row / 2 }, 'Stop', { anchor: 'start', bold: true });
  services.forEach((s, i) => {
    body += label({ x: left + firstCol + col * i + col / 2, y: top + row / 2 }, s, { bold: true });
  });
  stops.forEach((stop, r) => {
    const y = top + row * (r + 1) + row / 2;
    body += label({ x: left + 8, y }, stop, { anchor: 'start' });
    services.forEach((_s, i) => {
      body += label({ x: left + firstCol + col * i + col / 2, y }, fmt(times[i]![r]!));
    });
  });
  // Grid lines.
  for (let r = 0; r <= stops.length + 1; r++) {
    body += line({ x: left, y: top + row * r }, { x: width - left, y: top + row * r }, { stroke: '#6b7280', width: 1 });
  }
  body += line({ x: left, y: top }, { x: left, y: top + tableH }, { stroke: '#6b7280', width: 1 });
  for (let c = 0; c <= services.length; c++) {
    const x = left + firstCol + col * c;
    body += line({ x, y: top }, { x, y: top + tableH }, { stroke: '#6b7280', width: 1 });
  }
  if (note) body += label({ x: width / 2, y: top + tableH + 18 }, note, { size: 12, fill: INK });
  return svgDoc(width, height, body);
}
