import { ACCENT, FILL, INK, dot, label, line, svgDoc, type Pt } from '../../svg';
import type { FiveNumber } from './data';

// SVG statistical displays built on templates/svg.ts. Students read values from these, so
// everything is drawn accurately to scale with clear tick marks and gridlines.

const GRID = '#e5e7eb';
const TICK_TEXT = '#374151';
const HIGHLIGHT = '#dc2626';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const r2 = (n: number) => Math.round(n * 100) / 100;

function rect(x: number, y: number, w: number, h: number, fill: string, stroke = INK): string {
  return `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(w)}" height="${r2(h)}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
}

/** Text rotated 90° anticlockwise (for y-axis titles). */
function vText(x: number, y: number, text: string, size = 12): string {
  return `<text x="${r2(x)}" y="${r2(y)}" text-anchor="middle" dominant-baseline="middle" font-size="${size}" fill="${INK}" transform="rotate(-90 ${r2(x)} ${r2(y)})">${esc(text)}</text>`;
}

const tickLabel = (v: number) => String(v).replace('-', '−');

/** Integer steps from lo to hi (inclusive) by step, without floating-point drift. */
function steps(lo: number, hi: number, step: number): number[] {
  const out: number[] = [];
  const n = Math.round((hi - lo) / step);
  for (let i = 0; i <= n; i++) out.push(Math.round((lo + i * step) * 1000) / 1000);
  return out;
}

const isMultiple = (v: number, m: number) => Math.abs(v / m - Math.round(v / m)) < 1e-9;

interface AxisOpts {
  lo: number;
  hi: number;
  minor: number;
  major: number;
  x0: number;
  x1: number;
  y: number;
}

/** Horizontal number line with minor ticks and labelled major ticks. */
function hAxis(o: AxisOpts): { body: string; toX: (v: number) => number } {
  const toX = (v: number) => o.x0 + ((v - o.lo) / (o.hi - o.lo)) * (o.x1 - o.x0);
  let body = line({ x: o.x0, y: o.y }, { x: o.x1, y: o.y }, { width: 1.5 });
  for (const v of steps(o.lo, o.hi, o.minor)) {
    const major = isMultiple(v, o.major);
    body += line({ x: toX(v), y: o.y }, { x: toX(v), y: o.y + (major ? 7 : 4) }, { width: 1 });
    if (major) body += label({ x: toX(v), y: o.y + 17 }, tickLabel(v), { size: 11, fill: TICK_TEXT });
  }
  return { body, toX };
}

// ---------------- Dot plot ----------------

export function dotPlot(values: readonly number[], o: { lo: number; hi: number; axis: string }): string {
  const span = o.hi - o.lo;
  const unit = Math.max(12, Math.min(26, 330 / span));
  const x0 = 30;
  const x1 = x0 + unit * span;
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  const maxCount = Math.max(...counts.values());
  const gap = 11;
  const axisY = 22 + maxCount * gap;
  const major = span <= 12 ? 1 : span <= 26 ? 2 : 5;
  const ax = hAxis({ lo: o.lo, hi: o.hi, minor: 1, major, x0, x1, y: axisY });
  let body = ax.body;
  for (const [v, c] of counts) {
    for (let i = 0; i < c; i++) body += dot({ x: ax.toX(v), y: axisY - 8 - i * gap }, 4.5, ACCENT);
  }
  body += label({ x: (x0 + x1) / 2, y: axisY + 38 }, o.axis, { size: 13 });
  return svgDoc(Math.round(x1 + 30), Math.round(axisY + 52), body);
}

// ---------------- Box plot ----------------

export interface BoxRow {
  name?: string;
  five: FiveNumber;
}

export function boxPlot(
  rows: readonly BoxRow[],
  o: { lo: number; hi: number; minor: number; major: number; axis: string },
): string {
  const named = rows.some((r) => r.name);
  const x0 = named ? 92 : 30;
  const x1 = x0 + (named ? 290 : 330);
  const rowH = 58;
  const top = 14;
  const axisY = top + rows.length * rowH + 4;
  const ax = hAxis({ lo: o.lo, hi: o.hi, minor: o.minor, major: o.major, x0, x1, y: axisY });
  let body = '';
  for (const v of steps(o.lo, o.hi, o.minor)) {
    body += line({ x: ax.toX(v), y: top }, { x: ax.toX(v), y: axisY }, { stroke: GRID, width: 1 });
  }
  body += ax.body;
  rows.forEach((r, i) => {
    const cy = top + i * rowH + rowH / 2;
    const f = r.five;
    const X = ax.toX;
    body += line({ x: X(f.min), y: cy }, { x: X(f.q1), y: cy }, { width: 2 });
    body += line({ x: X(f.q3), y: cy }, { x: X(f.max), y: cy }, { width: 2 });
    body += line({ x: X(f.min), y: cy - 8 }, { x: X(f.min), y: cy + 8 }, { width: 2 });
    body += line({ x: X(f.max), y: cy - 8 }, { x: X(f.max), y: cy + 8 }, { width: 2 });
    body += rect(X(f.q1), cy - 15, X(f.q3) - X(f.q1), 30, FILL);
    body += line({ x: X(f.median), y: cy - 15 }, { x: X(f.median), y: cy + 15 }, { width: 2.5 });
    if (r.name) body += label({ x: x0 - 10, y: cy }, r.name, { anchor: 'end', size: 12 });
  });
  body += label({ x: (x0 + x1) / 2, y: axisY + 38 }, o.axis, { size: 13 });
  return svgDoc(Math.round(x1 + 26), Math.round(axisY + 52), body);
}

// ---------------- Bar graph ----------------

export interface BarOpts {
  /** Value at the bottom of the y-axis (0 unless deliberately misleading). */
  yStart?: number;
  yMax: number;
  /** Gridline spacing. */
  grid: number;
  /** Label every this many units. */
  labelEvery: number;
  xAxis: string;
  yAxis: string;
  title?: string;
}

export function barGraph(cats: readonly string[], values: readonly number[], o: BarOpts): string {
  const yStart = o.yStart ?? 0;
  const x0 = 58;
  const slot = Math.min(72, 340 / cats.length);
  const x1 = x0 + slot * cats.length;
  const top = o.title ? 34 : 16;
  const plotH = 190;
  const bottom = top + plotH;
  const toY = (v: number) => bottom - ((v - yStart) / (o.yMax - yStart)) * plotH;
  let body = '';
  if (o.title) body += label({ x: (x0 + x1) / 2, y: 16 }, o.title, { size: 13, bold: true });
  for (const v of steps(yStart, o.yMax, o.grid)) {
    body += line({ x: x0, y: toY(v) }, { x: x1, y: toY(v) }, { stroke: GRID, width: 1 });
    if (isMultiple(v, o.labelEvery)) {
      body += label({ x: x0 - 8, y: toY(v) }, tickLabel(v), { anchor: 'end', size: 11, fill: TICK_TEXT });
    }
  }
  cats.forEach((c, i) => {
    const v = values[i]!;
    const w = slot * 0.6;
    const x = x0 + i * slot + (slot - w) / 2;
    body += rect(x, toY(v), w, bottom - toY(v), FILL, ACCENT);
    body += label({ x: x0 + i * slot + slot / 2, y: bottom + 14 }, c, { size: 11 });
  });
  body += line({ x: x0, y: top - 4 }, { x: x0, y: bottom }, { width: 1.5 });
  body += line({ x: x0, y: bottom }, { x: x1, y: bottom }, { width: 1.5 });
  body += label({ x: (x0 + x1) / 2, y: bottom + 36 }, o.xAxis, { size: 13 });
  body += vText(15, (top + bottom) / 2, o.yAxis, 12);
  return svgDoc(Math.round(x1 + 16), Math.round(bottom + 50), body);
}

// ---------------- Histogram ----------------

/** Histogram with equal class widths. Bars touch; the x-axis is labelled at the class boundaries. */
export function histogram(
  start: number,
  width: number,
  freqs: readonly number[],
  o: { yMax: number; grid: number; labelEvery: number; xAxis: string; yAxis: string },
): string {
  const x0 = 58;
  const x1 = x0 + Math.min(320, 64 * freqs.length);
  const top = 16;
  const plotH = 190;
  const bottom = top + plotH;
  const k = freqs.length;
  const toX = (i: number) => x0 + ((x1 - x0) * i) / k;
  const toY = (v: number) => bottom - (v / o.yMax) * plotH;
  let body = '';
  for (const v of steps(0, o.yMax, o.grid)) {
    body += line({ x: x0, y: toY(v) }, { x: x1, y: toY(v) }, { stroke: GRID, width: 1 });
    if (isMultiple(v, o.labelEvery)) {
      body += label({ x: x0 - 8, y: toY(v) }, tickLabel(v), { anchor: 'end', size: 11, fill: TICK_TEXT });
    }
  }
  freqs.forEach((f, i) => {
    if (f > 0) body += rect(toX(i), toY(f), toX(i + 1) - toX(i), bottom - toY(f), FILL, ACCENT);
  });
  for (let i = 0; i <= k; i++) {
    body += line({ x: toX(i), y: bottom }, { x: toX(i), y: bottom + 5 }, { width: 1 });
    body += label({ x: toX(i), y: bottom + 15 }, tickLabel(start + i * width), { size: 11, fill: TICK_TEXT });
  }
  body += line({ x: x0, y: top - 4 }, { x: x0, y: bottom }, { width: 1.5 });
  body += line({ x: x0, y: bottom }, { x: x1, y: bottom }, { width: 1.5 });
  body += label({ x: (x0 + x1) / 2, y: bottom + 36 }, o.xAxis, { size: 13 });
  body += vText(15, (top + bottom) / 2, o.yAxis, 12);
  return svgDoc(Math.round(x1 + 20), Math.round(bottom + 50), body);
}

// ---------------- Scatter plot ----------------

export interface ScatterOpts {
  xMin: number;
  xMax: number;
  xStep: number;
  xLabelEvery: number;
  yMin: number;
  yMax: number;
  yStep: number;
  yLabelEvery: number;
  xAxis: string;
  yAxis: string;
  /** Line of best fit, given by two points in data units. */
  fit?: [Pt, Pt];
  /** A point to circle and label. */
  highlight?: { p: Pt; text: string };
}

export function scatterPlot(points: readonly Pt[], o: ScatterOpts): string {
  const x0 = 62;
  const x1 = x0 + 300;
  const top = 14;
  const bottom = top + 212;
  const toPx = (p: Pt): Pt => ({
    x: x0 + ((p.x - o.xMin) / (o.xMax - o.xMin)) * (x1 - x0),
    y: bottom - ((p.y - o.yMin) / (o.yMax - o.yMin)) * (bottom - top),
  });
  let body = '';
  for (const x of steps(o.xMin, o.xMax, o.xStep)) {
    body += line(toPx({ x, y: o.yMin }), toPx({ x, y: o.yMax }), { stroke: GRID, width: 1 });
    if (isMultiple(x, o.xLabelEvery)) {
      body += label({ x: toPx({ x, y: o.yMin }).x, y: bottom + 13 }, tickLabel(x), { size: 11, fill: TICK_TEXT });
    }
  }
  for (const y of steps(o.yMin, o.yMax, o.yStep)) {
    body += line(toPx({ x: o.xMin, y }), toPx({ x: o.xMax, y }), { stroke: GRID, width: 1 });
    if (isMultiple(y, o.yLabelEvery)) {
      body += label({ x: x0 - 7, y: toPx({ x: o.xMin, y }).y }, tickLabel(y), { anchor: 'end', size: 11, fill: TICK_TEXT });
    }
  }
  body += line({ x: x0, y: top }, { x: x0, y: bottom }, { width: 1.5 });
  body += line({ x: x0, y: bottom }, { x: x1, y: bottom }, { width: 1.5 });
  if (o.fit) body += line(toPx(o.fit[0]), toPx(o.fit[1]), { stroke: ACCENT, width: 2 });
  for (const p of points) body += dot(toPx(p), 3.5, INK);
  if (o.highlight) {
    const h = toPx(o.highlight.p);
    body += `<circle cx="${r2(h.x)}" cy="${r2(h.y)}" r="8" fill="none" stroke="${HIGHLIGHT}" stroke-width="2"/>`;
    const right = h.x < x1 - 60;
    body += label({ x: h.x + (right ? 12 : -12), y: h.y - 12 }, o.highlight.text, {
      anchor: right ? 'start' : 'end',
      size: 12,
      fill: HIGHLIGHT,
      bold: true,
    });
  }
  body += label({ x: (x0 + x1) / 2, y: bottom + 34 }, o.xAxis, { size: 13 });
  body += vText(16, (top + bottom) / 2, o.yAxis, 12);
  return svgDoc(x1 + 20, bottom + 48, body);
}
