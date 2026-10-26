import type { Rng } from '../../../../rng';
import { ACCENT, FILL, INK, dot, label, line, svgDoc } from '../../../svg';

// Year 6 statistics displays (bar graphs, time-series graphs and dot plots) plus the contexts
// used by m6.sta.graphs and m6.sta.mean-range. Everything is drawn to scale, and values always
// sit on a gridline so a 10-year-old can read them exactly.

const GRID = '#e5e7eb';
const TICK_TEXT = '#374151';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const r2 = (n: number) => Math.round(n * 100) / 100;

function rect(x: number, y: number, w: number, h: number, fill: string, stroke = INK): string {
  return `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(w)}" height="${r2(h)}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
}

/** Text rotated 90° anticlockwise (for y-axis titles). */
function vText(x: number, y: number, text: string, size = 12): string {
  return `<text x="${r2(x)}" y="${r2(y)}" text-anchor="middle" dominant-baseline="middle" font-size="${size}" fill="${INK}" transform="rotate(-90 ${r2(x)} ${r2(y)})">${esc(text)}</text>`;
}

function steps(lo: number, hi: number, step: number): number[] {
  const out: number[] = [];
  const n = Math.round((hi - lo) / step);
  for (let i = 0; i <= n; i++) out.push(Math.round((lo + i * step) * 1000) / 1000);
  return out;
}

const isMultiple = (v: number, m: number) => Math.abs(v / m - Math.round(v / m)) < 1e-9;

export interface AxisOpts {
  yMax: number;
  /** Gridline spacing. */
  grid: number;
  /** Label every this many units (a multiple of `grid`). */
  labelEvery: number;
  title?: string;
  xAxis?: string;
  yAxis?: string;
  /** Leave the numbers off the y-axis (for "what is missing?" questions). */
  hideScale?: boolean;
}

function frame(o: AxisOpts, x0: number, x1: number, top: number, bottom: number): { body: string; toY: (v: number) => number } {
  const toY = (v: number) => bottom - (v / o.yMax) * (bottom - top);
  let body = '';
  for (const v of steps(0, o.yMax, o.grid)) {
    body += line({ x: x0, y: toY(v) }, { x: x1, y: toY(v) }, { stroke: GRID, width: 1 });
    if (!o.hideScale && isMultiple(v, o.labelEvery)) {
      body += label({ x: x0 - 8, y: toY(v) }, String(v), { anchor: 'end', size: 11, fill: TICK_TEXT });
    }
  }
  if (o.title) body += label({ x: (x0 + x1) / 2, y: 16 }, o.title, { size: 13, bold: true });
  if (o.xAxis) body += label({ x: (x0 + x1) / 2, y: bottom + 36 }, o.xAxis, { size: 12 });
  if (o.yAxis) body += vText(15, (top + bottom) / 2, o.yAxis, 12);
  return { body, toY };
}

/** Vertical bar graph. Values should be multiples of `grid`. */
export function barGraph(cats: readonly string[], values: readonly number[], o: AxisOpts): string {
  const x0 = 60;
  const slot = Math.min(70, 330 / cats.length);
  const x1 = x0 + slot * cats.length;
  const top = 34;
  const bottom = top + 180;
  const f = frame(o, x0, x1, top, bottom);
  let body = f.body;
  cats.forEach((c, i) => {
    const v = values[i]!;
    const w = slot * 0.6;
    const x = x0 + i * slot + (slot - w) / 2;
    if (v > 0) body += rect(x, f.toY(v), w, bottom - f.toY(v), FILL, ACCENT);
    body += label({ x: x0 + i * slot + slot / 2, y: bottom + 14 }, c, { size: 11 });
  });
  body += line({ x: x0, y: top - 6 }, { x: x0, y: bottom }, { width: 1.5 });
  body += line({ x: x0, y: bottom }, { x: x1, y: bottom }, { width: 1.5 });
  return svgDoc(Math.round(x1 + 14), Math.round(bottom + 50), body);
}

/** Time-series (line) graph: time along the x-axis, points joined by straight lines. */
export function timeSeriesGraph(times: readonly string[], values: readonly number[], o: AxisOpts): string {
  const x0 = 60;
  const slot = Math.min(56, 330 / times.length);
  const x1 = x0 + slot * times.length;
  const top = 34;
  const bottom = top + 180;
  const f = frame(o, x0, x1, top, bottom);
  let body = f.body;
  const px = (i: number) => x0 + slot * (i + 0.5);
  times.forEach((t, i) => {
    body += line({ x: px(i), y: bottom }, { x: px(i), y: bottom + 5 }, { width: 1 });
    body += label({ x: px(i), y: bottom + 15 }, t, { size: 11 });
  });
  body += line({ x: x0, y: top - 6 }, { x: x0, y: bottom }, { width: 1.5 });
  body += line({ x: x0, y: bottom }, { x: x1, y: bottom }, { width: 1.5 });
  for (let i = 1; i < values.length; i++) {
    body += line({ x: px(i - 1), y: f.toY(values[i - 1]!) }, { x: px(i), y: f.toY(values[i]!) }, { stroke: ACCENT, width: 2.5 });
  }
  values.forEach((v, i) => (body += dot({ x: px(i), y: f.toY(v) }, 4, ACCENT)));
  return svgDoc(Math.round(x1 + 14), Math.round(bottom + 50), body);
}

/** Dot plot: one dot per value, stacked above a number line from lo to hi. */
export function dotPlot(values: readonly number[], o: { lo: number; hi: number; axis: string; title?: string }): string {
  const span = o.hi - o.lo;
  const unit = Math.max(16, Math.min(34, 320 / span));
  const x0 = 34;
  const x1 = x0 + unit * span;
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  const maxCount = Math.max(...counts.values());
  const gap = 13;
  const top = o.title ? 34 : 14;
  const axisY = top + 8 + maxCount * gap;
  const toX = (v: number) => x0 + (v - o.lo) * unit;
  let body = o.title ? label({ x: (x0 + x1) / 2, y: 16 }, o.title, { size: 13, bold: true }) : '';
  body += line({ x: x0 - 8, y: axisY }, { x: x1 + 8, y: axisY }, { width: 1.5 });
  for (let v = o.lo; v <= o.hi; v++) {
    body += line({ x: toX(v), y: axisY }, { x: toX(v), y: axisY + 6 }, { width: 1 });
    body += label({ x: toX(v), y: axisY + 17 }, String(v), { size: 11, fill: TICK_TEXT });
  }
  for (const [v, c] of counts) {
    for (let i = 0; i < c; i++) body += dot({ x: toX(v), y: axisY - 9 - i * gap }, 5, ACCENT);
  }
  body += label({ x: (x0 + x1) / 2, y: axisY + 38 }, o.axis, { size: 12 });
  return svgDoc(Math.round(x1 + 30), Math.round(axisY + 52), body);
}

/** A tidy y-axis for values up to `max`: gridlines every `grid`, labels every `labelEvery`. */
export function niceAxis(max: number, grid: number): { yMax: number; grid: number; labelEvery: number } {
  const yMax = Math.ceil((max + grid * 0.5) / grid) * grid;
  const lines = yMax / grid;
  const labelEvery = lines > 12 ? grid * 2 : grid;
  return { yMax, grid, labelEvery };
}

// ---------------------------------------------------------------- contexts

export interface CategoryContext {
  title: string;
  cats: readonly string[];
  xAxis: string;
  yAxis: string;
  /** "How many students chose rugby?" */
  one: (cat: string) => string;
  /** "How many more students chose rugby than netball?" */
  more: (a: string, b: string) => string;
  /** "How many students were asked altogether?" */
  total: string;
}

const birdPlural = (b: string) => (/[āēīōū]/.test(b) ? b : `${b}s`);

export const CATEGORY_CONTEXTS: readonly CategoryContext[] = [
  {
    title: 'Favourite fruit', cats: ['apple', 'banana', 'kiwifruit', 'mandarin', 'feijoa'], xAxis: 'Fruit', yAxis: 'Number of students',
    one: (c) => `How many students chose ${c}?`, more: (a, b) => `How many more students chose ${a} than ${b}?`, total: 'How many students were asked altogether?',
  },
  {
    title: 'How we get to school', cats: ['walk', 'bike', 'car', 'bus', 'scooter'], xAxis: 'Way of travelling', yAxis: 'Number of students',
    one: (c) => (c === 'walk' ? 'How many students walk to school?' : `How many students come to school by ${c}?`),
    more: (a, b) => `How many more students chose "${a}" than "${b}"?`, total: 'How many students were asked altogether?',
  },
  {
    title: 'Favourite sport', cats: ['rugby', 'netball', 'football', 'cricket', 'basketball'], xAxis: 'Sport', yAxis: 'Number of students',
    one: (c) => `How many students chose ${c}?`, more: (a, b) => `How many more students chose ${a} than ${b}?`, total: 'How many students were asked altogether?',
  },
  {
    title: 'Birds seen in the school garden', cats: ['tūī', 'kererū', 'pīwakawaka', 'sparrow', 'blackbird'], xAxis: 'Bird', yAxis: 'Number of birds',
    one: (c) => `How many ${birdPlural(c)} were seen?`, more: (a, b) => `How many more ${birdPlural(a)} than ${birdPlural(b)} were seen?`, total: 'How many birds were seen altogether?',
  },
  {
    title: 'Pets at home', cats: ['dog', 'cat', 'fish', 'rabbit', 'bird'], xAxis: 'Pet', yAxis: 'Number of students',
    one: (c) => `How many students have a ${c}?`, more: (a, b) => `How many more students have a ${a} than a ${b}?`, total: 'How many students are shown on the graph altogether?',
  },
  {
    title: 'Favourite ice cream', cats: ['hokey pokey', 'chocolate', 'vanilla', 'strawberry', 'mint'], xAxis: 'Flavour', yAxis: 'Number of students',
    one: (c) => `How many students chose ${c}?`, more: (a, b) => `How many more students chose ${a} than ${b}?`, total: 'How many students were asked altogether?',
  },
  {
    title: 'Lunch orders on Friday', cats: ['sushi', 'pie', 'sandwich', 'wrap', 'salad'], xAxis: 'Lunch', yAxis: 'Number of orders',
    one: (c) => `How many ${c === 'sushi' ? 'sushi' : `${c}`} orders were there?`, more: (a, b) => `How many more ${a} orders than ${b} orders were there?`, total: 'How many lunch orders were there altogether?',
  },
  {
    title: 'Favourite season', cats: ['summer', 'autumn', 'winter', 'spring'], xAxis: 'Season', yAxis: 'Number of students',
    one: (c) => `How many students chose ${c}?`, more: (a, b) => `How many more students chose ${a} than ${b}?`, total: 'How many students were asked altogether?',
  },
];

export type TrendKind = 'up' | 'down' | 'none';

export interface TimeContext {
  title: string;
  times: readonly string[];
  /** Phrase for the x-axis, e.g. "Day". */
  xAxis: string;
  yAxis: string;
  /** What is measured, for prompts: "the temperature". */
  what: string;
  units: string;
  /** Unit text after a number in prose, e.g. " cm", "°C". */
  unitText: string;
  /** Gridline spacing; all values are multiples of it. */
  grid: number;
  /** Smallest and largest sensible values (multiples of grid). */
  lo: number;
  hi: number;
  trends: readonly TrendKind[];
  /** "at 2 pm" / "on Tuesday" / "in week 3". */
  at: (t: string) => string;
}

const weekAt = (t: string) => `in week ${t.replace('Wk ', '')}`;
const dayAt = (t: string) => `on ${({ Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' } as Record<string, string>)[t] ?? t}`;
const timeAt = (t: string) => `at ${t}`;
const monthAt = (t: string) => `in ${({ Jan: 'January', Feb: 'February', Mar: 'March', Apr: 'April', May: 'May', Jun: 'June', Jul: 'July', Aug: 'August', Sep: 'September', Oct: 'October', Nov: 'November', Dec: 'December' } as Record<string, string>)[t] ?? t}`;

export const TIME_CONTEXTS: readonly TimeContext[] = [
  { title: 'Height of our bean plant', times: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4', 'Wk 5', 'Wk 6'], xAxis: 'Week', yAxis: 'Height (cm)', what: 'the height of the bean plant', units: 'cm', unitText: ' cm', grid: 5, lo: 5, hi: 55, trends: ['up'], at: weekAt },
  { title: 'Temperature on a summer morning', times: ['7 am', '8 am', '9 am', '10 am', '11 am', '12 pm'], xAxis: 'Time', yAxis: 'Temperature (°C)', what: 'the temperature', units: '°C', unitText: '°C', grid: 2, lo: 8, hi: 26, trends: ['up'], at: timeAt },
  { title: 'Water in the school water tank', times: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4', 'Wk 5', 'Wk 6'], xAxis: 'Week', yAxis: 'Water (litres)', what: 'the amount of water in the tank', units: 'L', unitText: ' litres', grid: 100, lo: 200, hi: 1200, trends: ['down'], at: weekAt },
  { title: 'Books borrowed from the library', times: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], xAxis: 'Day', yAxis: 'Number of books', what: 'the number of books borrowed', units: '', unitText: ' books', grid: 2, lo: 4, hi: 30, trends: ['up', 'down', 'none'], at: dayAt },
  { title: 'Our puppy’s mass', times: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], xAxis: 'Month', yAxis: 'Mass (kg)', what: 'the puppy’s mass', units: 'kg', unitText: ' kg', grid: 2, lo: 2, hi: 22, trends: ['up'], at: monthAt },
  { title: 'Pies sold at the school canteen', times: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], xAxis: 'Day', yAxis: 'Number of pies', what: 'the number of pies sold', units: '', unitText: ' pies', grid: 5, lo: 10, hi: 70, trends: ['up', 'down', 'none'], at: dayAt },
  { title: 'Students who walked to school', times: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4', 'Wk 5', 'Wk 6', 'Wk 7'], xAxis: 'Week', yAxis: 'Number of students', what: 'the number of students who walked', units: '', unitText: ' students', grid: 5, lo: 10, hi: 80, trends: ['up', 'down', 'none'], at: weekAt },
  { title: 'Ice creams sold at the beach dairy', times: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], xAxis: 'Day', yAxis: 'Number of ice creams', what: 'the number of ice creams sold', units: '', unitText: ' ice creams', grid: 10, lo: 20, hi: 160, trends: ['up', 'none'], at: dayAt },
  { title: 'Rubbish collected on beach clean-ups', times: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4', 'Wk 5', 'Wk 6'], xAxis: 'Week', yAxis: 'Rubbish (kg)', what: 'the mass of rubbish collected', units: 'kg', unitText: ' kg', grid: 2, lo: 4, hi: 34, trends: ['down', 'none'], at: weekAt },
];

/**
 * Values for a time series (multiples of grid within [lo, hi]).
 * 'up'/'down': a clear overall change with at most one small step the other way.
 * 'none': values go up and down around a level, ending near where they started.
 */
export function timeSeriesValues(rng: Rng, c: TimeContext, kind: TrendKind): number[] {
  const n = c.times.length;
  const units = Math.round((c.hi - c.lo) / c.grid);
  for (let attempt = 0; attempt < 200; attempt++) {
    const vals: number[] = [];
    if (kind === 'none') {
      const mid = rng.int(Math.ceil(units * 0.35), Math.floor(units * 0.65));
      let dir = rng.sign();
      for (let i = 0; i < n; i++) {
        vals.push(mid + (i === 0 ? rng.int(-1, 1) : dir * rng.int(1, 3)));
        dir = -dir as 1 | -1;
      }
      const last = vals[n - 1]!;
      const first = vals[0]!;
      if (Math.abs(last - first) > 1) continue;
    } else {
      const incMax = Math.min(3, Math.max(2, Math.floor((1.6 * units) / (n - 1))));
      let v = rng.int(0, Math.floor(units * 0.3));
      const dip = rng.chance(0.5) ? rng.int(2, n - 1) : -1;
      for (let i = 0; i < n; i++) {
        if (i > 0) v += i === dip ? -1 : rng.int(1, incMax);
        vals.push(v);
      }
      if (kind === 'down') vals.reverse();
    }
    if (vals.some((x) => x < 0 || x > units)) continue;
    // Not all steps equal, and no two neighbours equal (so "highest"/"biggest rise" are clear).
    const diffs = vals.slice(1).map((x, i) => x - vals[i]!);
    if (diffs.some((d) => d === 0)) continue;
    if (new Set(diffs).size === 1) continue;
    return vals.map((x) => Math.round((c.lo + x * c.grid) * 1000) / 1000);
  }
  // Fallback: a plain zigzag/rise that always satisfies the rules above.
  const base = kind === 'none' ? [2, 4, 1, 3, 2, 4, 2] : [0, 1, 3, 4, 6, 7, 9];
  const vals = base.slice(0, n).map((x) => c.lo + x * c.grid);
  return kind === 'down' ? vals.reverse() : vals;
}

/** Lowest common y-axis maximum for a set of values on a grid: one or two gridlines of headroom. */
export function axisFor(values: readonly number[], grid: number): AxisOpts {
  const { yMax, labelEvery } = niceAxis(Math.max(...values), grid);
  return { yMax, grid, labelEvery };
}
