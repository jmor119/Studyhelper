// Figures for m6.num.negatives: a horizontal number line and a vertical thermometer.
import { ACCENT, circle, dot, INK, label, line, polygon, svgDoc } from '../../../svg';

/** A number as text with a true minus sign: −4. */
export const minus = (v: number) => String(v).replace('-', '−');

/** A temperature in prose: "−3 °C". */
export const temp = (v: number) => `${minus(v)} °C`;

export interface NumberLineOptions {
  lo: number;
  hi: number;
  /** Gap between tick marks. */
  step: number;
  /** Ticks on multiples of this are longer and labelled. */
  labelEvery: number;
  /** Draw an arrow pointing at this value. */
  mark?: number;
  /** Labelled dots above the line. */
  points?: Array<{ v: number; text: string }>;
}

export function numberLineSvg(o: NumberLineOptions): string {
  const W = 400;
  const pad = 30;
  const raised = o.mark !== undefined || (o.points?.length ?? 0) > 0;
  const y = raised ? 58 : 30;
  const H = y + 40;
  const X = (v: number) => pad + ((v - o.lo) / (o.hi - o.lo)) * (W - 2 * pad);
  const arrow = (tipX: number, dir: 1 | -1) =>
    polygon(
      [
        { x: tipX, y },
        { x: tipX - dir * 10, y: y - 6 },
        { x: tipX - dir * 10, y: y + 6 },
      ],
      { fill: INK, stroke: INK },
    );
  let body = line({ x: pad - 14, y }, { x: W - pad + 14, y });
  body += arrow(W - pad + 20, 1) + arrow(pad - 20, -1);
  for (let v = o.lo; v <= o.hi; v += o.step) {
    const big = v % o.labelEvery === 0;
    body += line({ x: X(v), y: y - (big ? 9 : 6) }, { x: X(v), y: y + (big ? 9 : 6) }, { width: big ? 2 : 1.5 });
    if (big) body += label({ x: X(v), y: y + 24 }, minus(v), { size: 14, bold: v === 0 });
  }
  if (o.mark !== undefined) {
    const mx = X(o.mark);
    body += line({ x: mx, y: y - 44 }, { x: mx, y: y - 16 }, { stroke: ACCENT, width: 3 });
    body += polygon(
      [
        { x: mx, y: y - 8 },
        { x: mx - 7, y: y - 19 },
        { x: mx + 7, y: y - 19 },
      ],
      { fill: ACCENT, stroke: ACCENT },
    );
  }
  for (const p of o.points ?? []) {
    body += dot({ x: X(p.v), y }, 5, ACCENT);
    body += label({ x: X(p.v), y: y - 22 }, p.text, { size: 15, bold: true, fill: ACCENT });
  }
  return svgDoc(W, H, body);
}

export interface ThermometerOptions {
  lo: number;
  hi: number;
  /** Gap between small tick marks, in degrees. */
  minor: number;
  /** Labelled ticks on multiples of this. */
  labelEvery: number;
  value: number;
}

/** A vertical thermometer in °C, filled up to `value`. */
export function thermometerSvg(o: ThermometerOptions): string {
  const W = 170;
  const H = 320;
  const cx = 60;
  const top = 24;
  const bottom = 258;
  const tube = 16;
  const RED = '#dc2626';
  const Y = (v: number) => bottom - ((v - o.lo) / (o.hi - o.lo)) * (bottom - top);
  let body = `<rect x="${cx - tube / 2}" y="${top - 12}" width="${tube}" height="${bottom - top + 34}" rx="8" fill="#ffffff" stroke="${INK}" stroke-width="2"/>`;
  const level = Math.round(Y(o.value) * 100) / 100;
  body += `<rect x="${cx - 4}" y="${level}" width="8" height="${Math.round((bottom + 26 - level) * 100) / 100}" fill="${RED}"/>`;
  body += circle({ x: cx, y: bottom + 34 }, 16, { fill: RED, stroke: INK });
  for (let v = o.lo; v <= o.hi; v += o.minor) {
    const big = v % o.labelEvery === 0;
    body += line({ x: cx + tube / 2, y: Y(v) }, { x: cx + tube / 2 + (big ? 14 : 8), y: Y(v) }, { width: big ? 2 : 1.2 });
    if (big) body += label({ x: cx + tube / 2 + 20, y: Y(v) }, minus(v), { anchor: 'start', size: 13, bold: v === 0 });
  }
  body += label({ x: cx + tube / 2 + 22, y: top - 16 }, '°C', { anchor: 'start', size: 13 });
  return svgDoc(W, H, body);
}
