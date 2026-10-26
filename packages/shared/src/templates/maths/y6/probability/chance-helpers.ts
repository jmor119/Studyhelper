import { INK, label, line, svgDoc } from '../../../svg';

// Figures for m6.pro.chance: spinners (equal or sized sectors) and the 0–1 probability line.
// Adapted from the Year 9 probability figures so this topic doesn't depend on another topic's files.

const r2 = (n: number) => Math.round(n * 100) / 100;

export const COLOURS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'] as const;
export type Colour = (typeof COLOURS)[number];

export const COLOUR_FILL: Record<Colour, string> = {
  red: '#fca5a5',
  blue: '#93c5fd',
  green: '#86efac',
  yellow: '#fde047',
  purple: '#d8b4fe',
  orange: '#fdba74',
};

export const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1);

export interface Sector {
  label: string;
  fill: string;
  /** Size in equal parts (default 1). */
  parts?: number;
  /** Optional second line, e.g. a fraction "1/4". */
  sub?: string;
}

/**
 * A spinner. Each sector covers `parts` equal parts of the circle. With `showParts`, thin lines
 * mark every equal part so students can count them.
 */
export function spinner(sectors: readonly Sector[], opts: { showParts?: boolean } = {}): string {
  const cx = 125;
  const cy = 125;
  const r = 105;
  const total = sectors.reduce((s, x) => s + (x.parts ?? 1), 0);
  let body = '';
  let at = 0;
  const angle = (p: number) => -Math.PI / 2 + (p * 2 * Math.PI) / total;
  for (const s of sectors) {
    const n = s.parts ?? 1;
    const a1 = angle(at);
    const a2 = angle(at + n);
    const p1 = { x: cx + r * Math.cos(a1), y: cy + r * Math.sin(a1) };
    const p2 = { x: cx + r * Math.cos(a2), y: cy + r * Math.sin(a2) };
    const large = n / total > 0.5 ? 1 : 0;
    body +=
      n === total
        ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${s.fill}" stroke="${INK}" stroke-width="1.5"/>`
        : `<path d="M ${cx} ${cy} L ${r2(p1.x)} ${r2(p1.y)} A ${r} ${r} 0 ${large} 1 ${r2(p2.x)} ${r2(p2.y)} Z" fill="${s.fill}" stroke="${INK}" stroke-width="1.5"/>`;
    if (opts.showParts) {
      for (let k = 1; k < n; k++) {
        const a = angle(at + k);
        body += line({ x: cx, y: cy }, { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }, { stroke: '#6b7280', width: 1, dash: true });
      }
    }
    // With part lines showing, a sector with an even number of parts has a line through its middle,
    // so move the label to the middle of the part just after it.
    const am = (a1 + a2) / 2 + (opts.showParts && n % 2 === 0 ? Math.PI / total : 0);
    const lr = n / total >= 0.5 ? 52 : 70;
    const lx = cx + lr * Math.cos(am);
    const ly = cy + lr * Math.sin(am);
    const size = /^\d+$/.test(s.label) ? 16 : 12;
    if (s.sub) {
      body += label({ x: lx, y: ly - 8 }, s.label, { size, bold: true });
      body += label({ x: lx, y: ly + 9 }, s.sub, { size: 12 });
    } else {
      body += label({ x: lx, y: ly }, s.label, { size, bold: true });
    }
    at += n;
  }
  // Pointer
  const tip = { x: cx + 34 * Math.cos(-Math.PI / 3), y: cy + 34 * Math.sin(-Math.PI / 3) };
  body += line({ x: cx, y: cy }, tip, { width: 3 });
  body += `<circle cx="${cx}" cy="${cy}" r="6" fill="${INK}"/>`;
  return svgDoc(250, 250, body);
}

/** The 0–1 probability line with an arrow (labelled "A") pointing at p. */
export function probabilityLine(p: number): string {
  const x0 = 30;
  const x1 = 330;
  const y = 62;
  const X = (v: number) => x0 + (x1 - x0) * v;
  let body = line({ x: x0, y }, { x: x1, y }, { width: 2 });
  for (const [v, t] of [[0, '0'], [0.5, '1/2'], [1, '1']] as const) {
    body += line({ x: X(v), y: y - 8 }, { x: X(v), y: y + 8 }, { width: 2 });
    body += label({ x: X(v), y: y + 22 }, t, { size: 14 });
  }
  for (const v of [0.1, 0.2, 0.3, 0.4, 0.6, 0.7, 0.8, 0.9]) {
    body += line({ x: X(v), y: y - 4 }, { x: X(v), y: y + 4 }, { width: 1, stroke: '#6b7280' });
  }
  const ax = X(p);
  body += line({ x: ax, y: 18 }, { x: ax, y: y - 12 }, { width: 2, stroke: '#2563eb' });
  body += `<polygon points="${r2(ax - 6)},${y - 18} ${r2(ax + 6)},${y - 18} ${r2(ax)},${y - 9}" fill="#2563eb"/>`;
  body += label({ x: ax + 12, y: 18 }, 'A', { size: 14, bold: true, fill: '#2563eb' });
  return svgDoc(360, 100, body);
}
