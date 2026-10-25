import type { Rng } from '../../../rng';
import { clean, num, ordinal, round, tex } from '../../format';

// Shared helpers for the statistics templates: summary statistics (using the NZ quartile method),
// small made-up data sets, and NZ-flavoured contexts. All data is invented for practice; prompts
// never claim it is real.

export const sortAsc = (xs: readonly number[]): number[] => [...xs].sort((a, b) => a - b);

export const total = (xs: readonly number[]): number => clean(xs.reduce((s, x) => s + x, 0));

export const meanOf = (xs: readonly number[]): number => clean(total(xs) / xs.length);

export function medianOf(xs: readonly number[]): number {
  const s = sortAsc(xs);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : clean((s[m - 1]! + s[m]!) / 2);
}

/**
 * NZ curriculum method: the median splits the ordered data into a lower and an upper half.
 * When n is odd the median itself is left out of both halves.
 */
export function halves(xs: readonly number[]): { lower: number[]; upper: number[] } {
  const s = sortAsc(xs);
  const h = Math.floor(s.length / 2);
  return { lower: s.slice(0, h), upper: s.slice(s.length % 2 ? h + 1 : h) };
}

export interface FiveNumber {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
}

export function fiveNumber(xs: readonly number[]): FiveNumber {
  const s = sortAsc(xs);
  const { lower, upper } = halves(s);
  return { min: s[0]!, q1: medianOf(lower), median: medianOf(s), q3: medianOf(upper), max: s[s.length - 1]! };
}

/** All values that occur most often (a single mode when the list has length 1). */
export function modesOf(xs: readonly number[]): number[] {
  const counts = new Map<number, number>();
  for (const x of xs) counts.set(x, (counts.get(x) ?? 0) + 1);
  const top = Math.max(...counts.values());
  return [...counts.entries()].filter(([, c]) => c === top).map(([v]) => v).sort((a, b) => a - b);
}

export function countOf(xs: readonly number[], v: number): number {
  return xs.filter((x) => x === v).length;
}

/** n whole numbers in [lo, hi], roughly mound-shaped (the average of two uniform draws). */
export function moundData(rng: Rng, n: number, lo: number, hi: number): number[] {
  return Array.from({ length: n }, () => Math.round(lo + ((hi - lo) * (rng.next() + rng.next())) / 2));
}

/** "12, 15, 9" — plain text list for prompts. */
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

/** "= 12.5" if exact to dp places, otherwise "= 12.4285… ≈ 12.4" (for KaTeX). */
export function texApprox(x: number, dp: number): string {
  const r = round(x, dp);
  if (Math.abs(r - x) < 1e-9) return `= ${tex(r)}`;
  return `= ${tex(round(x, dp + 3))}\\ldots \\approx ${tex(r, dp)}`;
}

/** Sentence fragment for a median of a list: how it was found. */
export function medianWorking(sorted: readonly number[], label = 'median'): string {
  const n = sorted.length;
  const idx = middleIdx(n);
  if (idx.length === 1) {
    return `There are ${n} values, so the ${label} is the middle (${ordinal(idx[0]! + 1)}) value: **${num(sorted[idx[0]!]!)}**.`;
  }
  const a = sorted[idx[0]!]!;
  const b = sorted[idx[1]!]!;
  return `There are ${n} values, so the ${label} is halfway between the ${ordinal(idx[0]! + 1)} and ${ordinal(idx[1]! + 1)} values: $\\dfrac{${tex(a)} + ${tex(b)}}{2} = ${tex(clean((a + b) / 2))}$.`;
}

// ---------------- Contexts ----------------

export interface NumContext {
  key: string;
  /** Sentence introducing the data. */
  intro: (n: number, name: string) => string;
  /** Short noun phrase for the variable, e.g. "travel time". */
  noun: string;
  /** Word after a value in sentences, e.g. "minutes", "cm", "goals". */
  unitWord: string;
  /** Unit for numeric answers (only where the marker understands it). */
  units?: string;
  /** Axis label for displays. */
  axis: string;
  lo: number;
  hi: number;
  /** A counting question, e.g. ("more than", 20) → "How many students took more than 20 minutes to get to school?" */
  countQ: (cmp: string, x: number, name: string) => string;
  /** For data collected from students: what a class would record, e.g. "how long it takes them to get to school". */
  classPhrase?: string;
}

export const NUM_CONTEXTS: readonly NumContext[] = [
  {
    key: 'travel',
    intro: (n) => `${n} Year 9 students recorded how long it took them to get to school, in minutes.`,
    noun: 'travel time',
    unitWord: 'minutes',
    units: 'min',
    axis: 'Travel time (minutes)',
    lo: 4,
    hi: 34,
    countQ: (cmp, x) => `How many students took ${cmp} ${x} minutes to get to school?`,
    classPhrase: 'how long it takes them to get to school',
  },
  {
    key: 'armspan',
    intro: (n) => `${n} Year 9 students measured their arm spans, in centimetres.`,
    noun: 'arm span',
    unitWord: 'cm',
    units: 'cm',
    axis: 'Arm span (cm)',
    lo: 150,
    hi: 180,
    countQ: (cmp, x) => `How many students have an arm span of ${cmp} ${x} cm?`,
    classPhrase: 'their arm spans',
  },
  {
    key: 'ruler',
    intro: (n) =>
      `${n} students did a ruler-drop reaction test. Each result is how far the ruler fell, in centimetres, before it was caught.`,
    noun: 'distance fallen',
    unitWord: 'cm',
    units: 'cm',
    axis: 'Distance fallen (cm)',
    lo: 6,
    hi: 26,
    countQ: (cmp, x) => `For how many students did the ruler fall ${cmp} ${x} cm?`,
  },
  {
    key: 'netball',
    intro: (n) => `A school netball team recorded how many goals it scored in each of its last ${n} games.`,
    noun: 'number of goals',
    unitWord: 'goals',
    axis: 'Goals scored',
    lo: 18,
    hi: 42,
    countQ: (cmp, x) => `In how many games did the team score ${cmp} ${x} goals?`,
  },
  {
    key: 'texts',
    intro: (n) => `${n} students recorded how many text messages they sent yesterday.`,
    noun: 'number of messages',
    unitWord: 'messages',
    axis: 'Text messages sent',
    lo: 0,
    hi: 30,
    countQ: (cmp, x) => `How many students sent ${cmp} ${x} messages?`,
    classPhrase: 'how many text messages they sent yesterday',
  },
  {
    key: 'tui',
    intro: (n, name) => `${name} counted the tūī visiting a feeder in the garden each day for ${n} days.`,
    noun: 'number of tūī',
    unitWord: 'tūī',
    axis: 'Number of tūī',
    lo: 0,
    hi: 14,
    countQ: (cmp, x, name) => `On how many days did ${name} count ${cmp} ${x} tūī?`,
  },
  {
    key: 'temperature',
    intro: (n, name) => `${name} recorded the maximum temperature at home, in °C, on ${n} days over the summer holidays.`,
    noun: 'maximum temperature',
    unitWord: '°C',
    axis: 'Maximum temperature (°C)',
    lo: 17,
    hi: 29,
    countQ: (cmp, x) => `On how many days was the maximum temperature ${cmp} ${x} °C?`,
  },
  {
    key: 'exercise',
    intro: (n) => `${n} students recorded how many minutes of exercise they did yesterday.`,
    noun: 'exercise time',
    unitWord: 'minutes',
    units: 'min',
    axis: 'Exercise (minutes)',
    lo: 10,
    hi: 70,
    countQ: (cmp, x) => `How many students exercised for ${cmp} ${x} minutes?`,
    classPhrase: 'how many minutes of exercise they did yesterday',
  },
  {
    key: 'quiz',
    intro: (n) => `${n} students sat a maths quiz marked out of 40.`,
    noun: 'quiz score',
    unitWord: 'marks',
    axis: 'Quiz score (out of 40)',
    lo: 14,
    hi: 40,
    countQ: (cmp, x) => `How many students scored ${cmp} ${x} marks?`,
    classPhrase: 'their scores in a maths quiz marked out of 40',
  },
  {
    key: 'rugby',
    intro: (n) => `A school rugby team recorded the points it scored in each of its last ${n} games.`,
    noun: 'points scored',
    unitWord: 'points',
    axis: 'Points scored',
    lo: 5,
    hi: 42,
    countQ: (cmp, x) => `In how many games did the team score ${cmp} ${x} points?`,
  },
  {
    key: 'books',
    intro: (n) => `${n} students recorded how many books they read last term.`,
    noun: 'number of books',
    unitWord: 'books',
    axis: 'Books read',
    lo: 0,
    hi: 12,
    countQ: (cmp, x) => `How many students read ${cmp} ${x} books?`,
    classPhrase: 'how many books they read last term',
  },
  {
    key: 'kereru',
    intro: (n) => `A volunteer counted the kererū seen on the same bush walk each week for ${n} weeks.`,
    noun: 'number of kererū',
    unitWord: 'kererū',
    axis: 'Number of kererū',
    lo: 1,
    hi: 16,
    countQ: (cmp, x) => `In how many weeks did the volunteer see ${cmp} ${x} kererū?`,
  },
  {
    key: 'seedlings',
    intro: (n, name) => `${name} measured the heights of ${n} kauri seedlings in the school nursery, in centimetres.`,
    noun: 'seedling height',
    unitWord: 'cm',
    units: 'cm',
    axis: 'Seedling height (cm)',
    lo: 12,
    hi: 36,
    countQ: (cmp, x) => `How many seedlings are ${cmp} ${x} cm tall?`,
  },
  {
    key: 'crosscountry',
    intro: (n) => `${n} students ran the school cross-country. Their times were recorded to the nearest minute.`,
    noun: 'finishing time',
    unitWord: 'minutes',
    units: 'min',
    axis: 'Time (minutes)',
    lo: 14,
    hi: 34,
    countQ: (cmp, x) => `How many students took ${cmp} ${x} minutes?`,
    classPhrase: 'their times in the school cross-country',
  },
];

/** "12 minutes", "12 cm", "12 °C", "12 goals". */
export function withUnit(ctx: NumContext, x: number): string {
  return `${num(x)} ${ctx.unitWord}`;
}

/** Fields to spread into a numeric question for this context's unit. */
export function unitField(ctx: NumContext): { units?: string } {
  return ctx.units ? { units: ctx.units } : {};
}
