import type { Rng } from '../../../../rng';
import { clean, num, tex } from '../../../format';

// Data helpers for the Year 7 statistics templates (m7.sta.*): summary statistics, small
// made-up data sets and NZ contexts that Year 7 students know. All data is invented for
// practice, and prompts never claim it is real.

export const sortAsc = (xs: readonly number[]): number[] => [...xs].sort((a, b) => a - b);

export const total = (xs: readonly number[]): number => clean(xs.reduce((s, x) => s + x, 0));

export const meanOf = (xs: readonly number[]): number => clean(total(xs) / xs.length);

export function medianOf(xs: readonly number[]): number {
  const s = sortAsc(xs);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : clean((s[m - 1]! + s[m]!) / 2);
}

export const maxOf = (xs: readonly number[]): number => Math.max(...xs);
export const minOf = (xs: readonly number[]): number => Math.min(...xs);
export const rangeOf = (xs: readonly number[]): number => maxOf(xs) - minOf(xs);

/** All values that occur most often, smallest first. */
export function modesOf(xs: readonly number[]): number[] {
  const counts = new Map<number, number>();
  for (const x of xs) counts.set(x, (counts.get(x) ?? 0) + 1);
  const top = Math.max(...counts.values());
  return [...counts.entries()]
    .filter(([, c]) => c === top)
    .map(([v]) => v)
    .sort((a, b) => a - b);
}

export const countOf = (xs: readonly number[], v: number): number => xs.filter((x) => x === v).length;

/** "12, 15, 9" for prompts. */
export const listText = (xs: readonly number[]): string => xs.map((x) => num(x)).join(', ');

/** Ordered list for solutions, with chosen positions (0-based) in bold. */
export function boldList(sorted: readonly number[], boldIdx: readonly number[] = []): string {
  return sorted.map((x, i) => (boldIdx.includes(i) ? `**${num(x)}**` : num(x))).join(', ');
}

/** Middle position(s), 0-based, of a list of length n. */
export function middleIdx(n: number): number[] {
  const m = Math.floor(n / 2);
  return n % 2 ? [m] : [m - 1, m];
}

/** "4 + 7 + 9" for KaTeX. */
export const sumTex = (xs: readonly number[]): string => xs.map((x) => tex(x)).join(' + ');

/** n distinct whole numbers in [lo, hi], in random order. */
export function distinctValues(rng: Rng, n: number, lo: number, hi: number): number[] {
  const pool = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  return rng.sample(pool, n);
}

/** n whole numbers in [lo, hi] (repeats allowed), in random order. */
export function randomValues(rng: Rng, n: number, lo: number, hi: number): number[] {
  return Array.from({ length: n }, () => rng.int(lo, hi));
}

/**
 * n whole numbers in [lo, hi] whose mean is exactly `mean`. Retries until the last value fits.
 * Returns null if it can't find one (callers pick new parameters).
 */
export function valuesWithMean(rng: Rng, n: number, mean: number, lo: number, hi: number): number[] | null {
  for (let attempt = 0; attempt < 200; attempt++) {
    const xs = randomValues(rng, n - 1, lo, hi);
    const last = n * mean - total(xs);
    if (last >= lo && last <= hi && Number.isInteger(last)) {
      const out = rng.shuffle([...xs, last]);
      if (rangeOf(out) > 0) return out;
    }
  }
  return null;
}

/** n values in [lo, hi] with a single clear mode that appears `modeCount` times; other values appear fewer times. */
export function valuesWithMode(rng: Rng, n: number, lo: number, hi: number, modeCount: number): number[] {
  const mode = rng.int(lo, hi);
  const others = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).filter((v) => v !== mode);
  const out = Array.from({ length: modeCount }, () => mode);
  const used = new Map<number, number>();
  while (out.length < n) {
    const v = rng.pick(others);
    const c = used.get(v) ?? 0;
    if (c + 1 >= modeCount) continue;
    used.set(v, c + 1);
    out.push(v);
  }
  return rng.shuffle(out);
}

/** A numerical context for a list of data values. */
export interface NumContext {
  /** Sentence introducing the data, ending without a full stop. */
  intro: (name: string) => string;
  /** What each value is, e.g. "goals". */
  noun: string;
  /** Unit for numeric answers ('' for counts). */
  unit: string;
  lo: number;
  hi: number;
  kind: 'discrete' | 'continuous';
}

export const NUM_CONTEXTS: readonly NumContext[] = [
  { intro: (n) => `${n}'s netball team scored these numbers of goals in its games this term`, noun: 'goals', unit: '', lo: 6, hi: 24, kind: 'discrete' },
  { intro: (n) => `${n} counted the tūī in the school garden on some mornings`, noun: 'tūī', unit: '', lo: 2, hi: 15, kind: 'discrete' },
  { intro: (n) => `${n} recorded how many books each person in their reading group read this term`, noun: 'books', unit: '', lo: 1, hi: 14, kind: 'discrete' },
  { intro: (n) => `${n} recorded the maximum temperature in Nelson each day for part of the summer holidays (in °C)`, noun: 'degrees', unit: '°C', lo: 16, hi: 29, kind: 'continuous' },
  { intro: (n) => `${n} timed how many minutes each student in their group spent reading last night`, noun: 'minutes', unit: 'min', lo: 10, hi: 40, kind: 'continuous' },
  { intro: (n) => `${n} measured the heights of the bean seedlings in the class garden (in cm)`, noun: 'centimetres', unit: 'cm', lo: 4, hi: 20, kind: 'continuous' },
  { intro: (n) => `${n} recorded how many sausages were sold each hour at the school sausage sizzle`, noun: 'sausages', unit: '', lo: 12, hi: 40, kind: 'discrete' },
  { intro: (n) => `${n} recorded how many points a basketball player scored in each game`, noun: 'points', unit: '', lo: 4, hi: 26, kind: 'discrete' },
  { intro: (n) => `${n} counted how many kererū they saw on each bush walk at school camp`, noun: 'kererū', unit: '', lo: 1, hi: 12, kind: 'discrete' },
  { intro: (n) => `${n} recorded how many runs each batter in their cricket team scored`, noun: 'runs', unit: '', lo: 2, hi: 30, kind: 'discrete' },
  { intro: (n) => `${n} recorded the number of hours of sunshine in Napier each day for part of a week`, noun: 'hours', unit: 'h', lo: 3, hi: 13, kind: 'continuous' },
  { intro: (n) => `${n} recorded how many lengths each swimmer in their squad swam at training`, noun: 'lengths', unit: '', lo: 8, hi: 30, kind: 'discrete' },
  { intro: (n) => `${n} recorded how many minutes the school bus was late each day`, noun: 'minutes', unit: 'min', lo: 1, hi: 15, kind: 'continuous' },
  { intro: (n) => `${n} measured the lengths of some pāua shells found on the beach (in cm)`, noun: 'centimetres', unit: 'cm', lo: 8, hi: 16, kind: 'continuous' },
];

/** " cm" / "°C" suffix for a value in prose (empty for counts). */
export function withUnit(x: number, unit: string): string {
  if (!unit) return num(x);
  if (unit === '°C') return `${num(x)}°C`;
  return `${num(x)} ${unit}`;
}

/** Categorical survey contexts (one variable). */
export interface CatContext {
  intro: (name: string) => string;
  /** Short title for graphs, e.g. "Favourite fruit". */
  title: string;
  /** The variable as a phrase, e.g. "favourite fruit". */
  variable: string;
  /** Category labels (short enough to fit under a bar). */
  categories: readonly string[];
  /** Label for the vertical axis of a bar graph. */
  yAxis: string;
  /** "How many students chose apple?" */
  count: (cat: string) => string;
  /** "How many more students chose apple than banana?" */
  more: (a: string, b: string) => string;
  /** "How many students were asked altogether?" */
  totalQ: string;
}

const lc = (s: string) => s.toLowerCase();

export const CAT_CONTEXTS: readonly CatContext[] = [
  { intro: (n) => `${n} asked students in Room 12 to name their favourite fruit`, title: 'Favourite fruit in Room 12', variable: 'favourite fruit', categories: ['Apple', 'Banana', 'Kiwifruit', 'Mandarin', 'Grapes'], yAxis: 'Number of students', count: (c) => `How many students chose ${lc(c)}?`, more: (a, b) => `How many more students chose ${lc(a)} than ${lc(b)}?`, totalQ: 'How many students were asked altogether?' },
  { intro: (n) => `${n} asked students in Room 4 how they get to school`, title: 'How Room 4 gets to school', variable: 'way of getting to school', categories: ['Walk', 'Bike', 'Car', 'Bus', 'Scooter'], yAxis: 'Number of students', count: (c) => `How many students answered "${c}"?`, more: (a, b) => `How many more students answered "${a}" than "${b}"?`, totalQ: 'How many students were asked altogether?' },
  { intro: (n) => `${n} asked students at lunchtime to name their favourite sport`, title: 'Favourite sport', variable: 'favourite sport', categories: ['Rugby', 'Netball', 'Football', 'Cricket', 'Basketball'], yAxis: 'Number of students', count: (c) => `How many students chose ${lc(c)}?`, more: (a, b) => `How many more students chose ${lc(a)} than ${lc(b)}?`, totalQ: 'How many students were asked altogether?' },
  { intro: (n) => `${n} counted the birds that visited the school bird feeder one morning`, title: 'Birds at the bird feeder', variable: 'type of bird', categories: ['Tūī', 'Kererū', 'Sparrow', 'Pīwakawaka', 'Silvereye'], yAxis: 'Number of visits', count: (c) => `How many times did a ${lc(c)} visit the feeder?`, more: (a, b) => `How many more visits were from a ${lc(a)} than from a ${lc(b)}?`, totalQ: 'How many bird visits were counted altogether?' },
  { intro: (n) => `${n} recorded which ice block flavours were sold at the school gala`, title: 'Ice blocks sold at the gala', variable: 'ice block flavour', categories: ['Lemonade', 'Raspberry', 'Orange', 'Cola', 'Lime'], yAxis: 'Number sold', count: (c) => `How many ${lc(c)} ice blocks were sold?`, more: (a, b) => `How many more ${lc(a)} ice blocks were sold than ${lc(b)} ice blocks?`, totalQ: 'How many ice blocks were sold altogether?' },
  { intro: (n) => `${n} asked each student in their class which type of pet they have at home`, title: 'Pets in our class', variable: 'type of pet', categories: ['Dog', 'Cat', 'Fish', 'Rabbit', 'Bird'], yAxis: 'Number of students', count: (c) => `How many students said their pet is a ${lc(c)}?`, more: (a, b) => `How many more students have a ${lc(a)} than a ${lc(b)}?`, totalQ: 'How many students answered altogether?' },
  { intro: (n) => `${n} asked students which school camp activity they enjoyed most`, title: 'Favourite camp activity', variable: 'favourite camp activity', categories: ['Kayaking', 'Archery', 'Climbing', 'Bush walk', 'Rafting'], yAxis: 'Number of students', count: (c) => `How many students chose ${lc(c)}?`, more: (a, b) => `How many more students chose ${lc(a)} than ${lc(b)}?`, totalQ: 'How many students were asked altogether?' },
  { intro: (n) => `${n} recorded the lunch orders at the school canteen on Friday`, title: 'Friday lunch orders', variable: 'lunch order', categories: ['Sushi', 'Pie', 'Wrap', 'Sandwich', 'Salad'], yAxis: 'Number of orders', count: (c) => `How many ${lc(c)} orders were there?`, more: (a, b) => `How many more ${lc(a)} orders were there than ${lc(b)} orders?`, totalQ: 'How many lunch orders were there altogether?' },
];
