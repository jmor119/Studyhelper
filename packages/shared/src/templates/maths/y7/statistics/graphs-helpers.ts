import { ACCENT, FILL, INK, dot, label, line, svgDoc } from '../../../svg';

// SVG statistical displays for the Year 7 statistics templates (m7.sta.*), built on
// templates/svg.ts. Students read values from these, so everything is drawn accurately to scale
// with clear tick marks and gridlines. Adapted for Year 7 from the Year 9 chart helpers.

const GRID = '#e5e7eb';
const TICK_TEXT = '#374151';

/** Fill and outline colours for the series in clustered and stacked bar graphs. */
export const SERIES_COLOURS: ReadonlyArray<{ fill: string; stroke: string }> = [
  { fill: '#93c5fd', stroke: '#1d4ed8' },
  { fill: '#fdba74', stroke: '#c2410c' },
  { fill: '#86efac', stroke: '#15803d' },
  { fill: '#d8b4fe', stroke: '#7e22ce' },
];

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

/** Steps from lo to hi (inclusive) by step, without floating-point drift. */
function steps(lo: number, hi: number, step: number): number[] {
  const out: number[] = [];
  const n = Math.round((hi - lo) / step);
  for (let i = 0; i <= n; i++) out.push(Math.round((lo + i * step) * 1000) / 1000);
  return out;
}

const isMultiple = (v: number, m: number) => Math.abs(v / m - Math.round(v / m)) < 1e-9;

/** Rough width of a text label in px (Arial). */
const textWidth = (text: string, size: number) => text.length * size * 0.56;

// ---------------- Dot plot ----------------

export interface DotPlotOpts {
  lo: number;
  hi: number;
  axis: string;
  title?: string;
}

/** A dot plot: one dot per value, stacked above a number line. */
export function dotPlot(values: readonly number[], o: DotPlotOpts): string {
  const span = o.hi - o.lo;
  const unit = Math.max(14, Math.min(30, 340 / span));
  const x0 = 30;
  const x1 = x0 + unit * span;
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  const maxCount = Math.max(...counts.values());
  const gap = 12;
  const top = o.title ? 34 : 14;
  const axisY = top + 8 + maxCount * gap;
  const major = span <= 14 ? 1 : span <= 28 ? 2 : 5;
  const toX = (v: number) => x0 + ((v - o.lo) / span) * (x1 - x0);
  const width = Math.round(Math.max(x1 + 30, o.title ? textWidth(o.title, 13) + 30 : 0));
  let body = line({ x: x0, y: axisY }, { x: x1, y: axisY }, { width: 1.5 });
  for (const v of steps(o.lo, o.hi, 1)) {
    const isMajor = isMultiple(v, major);
    body += line({ x: toX(v), y: axisY }, { x: toX(v), y: axisY + (isMajor ? 7 : 4) }, { width: 1 });
    if (isMajor) body += label({ x: toX(v), y: axisY + 17 }, tickLabel(v), { size: 11, fill: TICK_TEXT });
  }
  for (const [v, c] of counts) {
    for (let i = 0; i < c; i++) body += dot({ x: toX(v), y: axisY - 8 - i * gap }, 4.8, ACCENT);
  }
  if (o.title) body += label({ x: width / 2, y: 16 }, o.title, { size: 13, bold: true });
  body += label({ x: (x0 + x1) / 2, y: axisY + 38 }, o.axis, { size: 13 });
  return svgDoc(width, Math.round(axisY + 52), body);
}

// ---------------- Shared frame for bar and line graphs ----------------

interface FrameOpts {
  yStart: number;
  yMax: number;
  grid: number;
  labelEvery: number;
  /** Leave out the numbers on the vertical axis (for "what's missing?" questions). */
  hideScale?: boolean;
  xAxis?: string;
  yAxis?: string;
  title?: string;
  /** Extra space above the plot (for a legend). */
  legendRows?: number;
}

interface Frame {
  x0: number;
  x1: number;
  top: number;
  bottom: number;
  toY: (v: number) => number;
  body: string;
  /** Call after drawing the data: axes, titles. */
  finish: (body: string, width: number) => string;
}

function frame(plotWidth: number, o: FrameOpts): Frame {
  const x0 = o.yAxis ? 58 : 44;
  const x1 = x0 + plotWidth;
  const top = (o.title ? 34 : 16) + (o.legendRows ?? 0) * 20;
  const plotH = 180;
  const bottom = top + plotH;
  const toY = (v: number) => bottom - ((v - o.yStart) / (o.yMax - o.yStart)) * plotH;
  let body = '';
  for (const v of steps(o.yStart, o.yMax, o.grid)) {
    body += line({ x: x0, y: toY(v) }, { x: x1, y: toY(v) }, { stroke: GRID, width: 1 });
    if (!o.hideScale && isMultiple(v, o.labelEvery)) {
      body += label({ x: x0 - 8, y: toY(v) }, tickLabel(v), { anchor: 'end', size: 11, fill: TICK_TEXT });
    }
  }
  const finish = (inner: string, width: number) => {
    let out = inner;
    out += line({ x: x0, y: top - 4 }, { x: x0, y: bottom }, { width: 1.5 });
    out += line({ x: x0, y: bottom }, { x: x1, y: bottom }, { width: 1.5 });
    if (o.title) out += label({ x: width / 2, y: 16 }, o.title, { size: 13, bold: true });
    if (o.xAxis) out += label({ x: (x0 + x1) / 2, y: bottom + 36 }, o.xAxis, { size: 13 });
    if (o.yAxis) out += vText(15, (top + bottom) / 2, o.yAxis, 12);
    return out;
  };
  return { x0, x1, top, bottom, toY, body, finish };
}

function legend(names: readonly string[], x: number, y: number): string {
  let out = '';
  let cx = x;
  names.forEach((n, i) => {
    const c = SERIES_COLOURS[i % SERIES_COLOURS.length]!;
    out += rect(cx, y - 6, 12, 12, c.fill, c.stroke);
    out += label({ x: cx + 17, y }, n, { anchor: 'start', size: 12 });
    cx += 17 + textWidth(n, 12) + 18;
  });
  return out;
}

const legendWidth = (names: readonly string[]) => names.reduce((s, n) => s + 17 + textWidth(n, 12) + 18, 0);

// ---------------- Bar graph ----------------

export interface BarOpts {
  /** Value at the bottom of the vertical axis (0 unless deliberately misleading). */
  yStart?: number;
  yMax: number;
  /** Gridline spacing. */
  grid: number;
  /** Number the vertical axis every this many units. */
  labelEvery: number;
  hideScale?: boolean;
  xAxis?: string;
  yAxis?: string;
  title?: string;
}

/** A bar graph for one categorical variable. */
export function barGraph(cats: readonly string[], values: readonly number[], o: BarOpts): string {
  const yStart = o.yStart ?? 0;
  const slot = Math.min(72, 330 / cats.length);
  const f = frame(slot * cats.length, { ...o, yStart });
  let body = f.body;
  cats.forEach((c, i) => {
    const v = values[i]!;
    const w = slot * 0.6;
    const x = f.x0 + i * slot + (slot - w) / 2;
    body += rect(x, f.toY(v), w, f.bottom - f.toY(v), FILL, ACCENT);
    body += label({ x: f.x0 + i * slot + slot / 2, y: f.bottom + 14 }, c, { size: 11 });
  });
  const width = Math.round(Math.max(f.x1 + 16, o.title ? textWidth(o.title, 13) + 30 : 0));
  return svgDoc(width, Math.round(f.bottom + (o.xAxis ? 50 : 30)), f.finish(body, width));
}

// ---------------- Clustered bar graph ----------------

export interface Series {
  name: string;
  values: readonly number[];
}

/** Bars for each series side by side within each category, with a legend. */
export function clusteredBarGraph(cats: readonly string[], series: readonly Series[], o: BarOpts): string {
  const slot = Math.min(80, 330 / cats.length);
  const f = frame(slot * cats.length, { ...o, yStart: 0, legendRows: 1 });
  let body = f.body;
  const k = series.length;
  const barW = (slot * 0.76) / k;
  cats.forEach((c, i) => {
    const start = f.x0 + i * slot + slot * 0.12;
    series.forEach((s, j) => {
      const v = s.values[i]!;
      const col = SERIES_COLOURS[j % SERIES_COLOURS.length]!;
      if (v > 0) body += rect(start + j * barW, f.toY(v), barW, f.bottom - f.toY(v), col.fill, col.stroke);
    });
    body += label({ x: f.x0 + i * slot + slot / 2, y: f.bottom + 14 }, c, { size: 11 });
  });
  const width = Math.round(Math.max(f.x1 + 16, legendWidth(series.map((s) => s.name)) + f.x0, o.title ? textWidth(o.title, 13) + 30 : 0));
  body += legend(series.map((s) => s.name), f.x0, f.top - 22);
  return svgDoc(width, Math.round(f.bottom + (o.xAxis ? 50 : 30)), f.finish(body, width));
}

// ---------------- Stacked bar graph ----------------

/** One bar per group, split into segments (one per series), stacked from the bottom. */
export function stackedBarGraph(groups: readonly string[], series: readonly Series[], o: BarOpts): string {
  const slot = Math.min(90, 330 / groups.length);
  const f = frame(slot * groups.length, { ...o, yStart: 0, legendRows: 1 });
  let body = f.body;
  groups.forEach((g, i) => {
    const w = slot * 0.55;
    const x = f.x0 + i * slot + (slot - w) / 2;
    let base = 0;
    series.forEach((s, j) => {
      const v = s.values[i]!;
      const col = SERIES_COLOURS[j % SERIES_COLOURS.length]!;
      if (v > 0) body += rect(x, f.toY(base + v), w, f.toY(base) - f.toY(base + v), col.fill, col.stroke);
      base += v;
    });
    body += label({ x: f.x0 + i * slot + slot / 2, y: f.bottom + 14 }, g, { size: 11 });
  });
  const width = Math.round(Math.max(f.x1 + 16, legendWidth(series.map((s) => s.name)) + f.x0, o.title ? textWidth(o.title, 13) + 30 : 0));
  body += legend(series.map((s) => s.name), f.x0, f.top - 22);
  return svgDoc(width, Math.round(f.bottom + (o.xAxis ? 50 : 30)), f.finish(body, width));
}

// ---------------- Time-series graph ----------------

export interface LineOpts extends BarOpts {
  yStart: number;
}

/** Time-series (line) graph: time along the bottom, points joined by straight lines. */
export function timeSeriesGraph(times: readonly string[], values: readonly number[], o: LineOpts): string {
  const n = times.length;
  const slot = Math.min(56, 320 / n);
  const f = frame(slot * n, o);
  let body = f.body;
  const toX = (i: number) => f.x0 + slot / 2 + i * slot;
  const pts = values.map((v, i) => ({ x: toX(i), y: f.toY(v) }));
  body += `<polyline points="${pts.map((p) => `${r2(p.x)},${r2(p.y)}`).join(' ')}" fill="none" stroke="${ACCENT}" stroke-width="2"/>`;
  for (const p of pts) body += dot(p, 3.8, ACCENT);
  times.forEach((t, i) => {
    body += line({ x: toX(i), y: f.bottom }, { x: toX(i), y: f.bottom + 5 }, { width: 1 });
    body += label({ x: toX(i), y: f.bottom + 15 }, t, { size: n > 9 ? 10 : 11, fill: TICK_TEXT });
  });
  const width = Math.round(Math.max(f.x1 + 16, o.title ? textWidth(o.title, 13) + 30 : 0));
  return svgDoc(width, Math.round(f.bottom + (o.xAxis ? 50 : 30)), f.finish(body, width));
}

/** A "nice" axis for values up to `max`: gridline step, label step and axis top. */
export function niceAxis(max: number): { yMax: number; grid: number; labelEvery: number } {
  if (max <= 10) return { yMax: Math.max(max + 1, 6), grid: 1, labelEvery: 2 };
  if (max <= 20) return { yMax: max + (max % 2 ? 1 : 2), grid: 2, labelEvery: 4 };
  if (max <= 50) return { yMax: Math.ceil((max + 1) / 5) * 5, grid: 5, labelEvery: 10 };
  return { yMax: Math.ceil((max + 1) / 10) * 10, grid: 10, labelEvery: 20 };
}
