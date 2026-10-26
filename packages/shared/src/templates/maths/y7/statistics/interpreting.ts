import type { Rng } from '../../../../rng';
import type { QuestionTemplate } from '../../../types';
import { NAMES, num, ordinal } from '../../../format';
import { boldList, countOf, listText, maxOf, medianOf, middleIdx, minOf, sortAsc } from './averages-helpers';
import { barGraph, dotPlot, timeSeriesGraph } from './graphs-helpers';

// m7.sta.interpreting — trends in time-series graphs; centre and spread from a dot plot; shape
// (symmetrical, positively or negatively skewed); comparing two groups with evidence; and spotting
// graphs that can't be read accurately or might mislead. All data is made up for practice.

const ALPHA = 'abcdefgh';

// ---------------- Trends ----------------

interface TrendContext {
  intro: (name: string) => string;
  title: string;
  xAxis: string;
  yAxis: string;
  times: readonly string[];
  /** Typical level of the values. */
  level: [number, number];
}

const WEEKS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

const TREND_CONTEXTS: readonly TrendContext[] = [
  { intro: (n) => `${n} counted the students who walked to school in each week of the term`, title: 'Students walking to school', xAxis: 'Week', yAxis: 'Number of students', times: WEEKS, level: [20, 30] },
  { intro: (n) => `${n}'s class counted the kererū in the school grounds once each year`, title: 'Kererū in the school grounds', xAxis: 'Year', yAxis: 'Number of kererū', times: ['2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025'], level: [15, 25] },
  { intro: (n) => `${n} recorded how many books were borrowed from the school library each week`, title: 'Library books borrowed', xAxis: 'Week', yAxis: 'Books borrowed', times: WEEKS, level: [30, 40] },
  { intro: (n) => `${n} recorded how many students bought lunch at the canteen each week`, title: 'Canteen lunches bought', xAxis: 'Week', yAxis: 'Number of lunches', times: WEEKS, level: [25, 35] },
  { intro: (n) => `${n} counted the tūī at the school bird feeder each morning for ten days`, title: 'Tūī at the bird feeder', xAxis: 'Day', yAxis: 'Number of tūī', times: WEEKS, level: [12, 20] },
  { intro: (n) => `${n} counted the plastic bottles in the school recycling bin at the end of each week`, title: 'Bottles in the recycling bin', xAxis: 'Week', yAxis: 'Number of bottles', times: WEEKS, level: [25, 35] },
];

type Trend = 'up' | 'down' | 'none';

function trendData(rng: Rng, c: TrendContext, trend: Trend, noise: number): number[] {
  const n = c.times.length;
  const start = rng.int(c.level[0], c.level[1]);
  const slope = trend === 'none' ? 0 : (trend === 'up' ? 1 : -1) * (1.4 + rng.next() * 1.2);
  const base = trend === 'down' ? start + 10 : trend === 'up' ? start - 8 : start;
  return Array.from({ length: n }, (_, i) => Math.max(1, Math.round(base + slope * i + rng.int(-noise, noise))));
}

const halfMeans = (v: readonly number[]) => {
  const h = Math.floor(v.length / 2);
  const a = v.slice(0, h).reduce((s, x) => s + x, 0) / h;
  const b = v.slice(v.length - h).reduce((s, x) => s + x, 0) / h;
  return [a, b] as const;
};

const TREND_TEXT: Record<Trend, string> = {
  up: 'An upward trend: the values tend to increase over time',
  down: 'A downward trend: the values tend to decrease over time',
  none: 'No clear trend: the values go up and down around the same level',
};

export const trend: QuestionTemplate = {
  id: 'm7.sta.interpreting.trend',
  topicId: 'm7.sta.interpreting',
  title: 'Describe the trend in a time-series graph',
  difficulties: [1, 2],
  generate({ rng, difficulty }) {
    const c = rng.pick(TREND_CONTEXTS);
    const name = rng.pick(NAMES);
    const t: Trend = difficulty === 1 ? rng.pick(['up', 'down'] as const) : rng.pick(['up', 'down', 'none'] as const);
    let v: number[];
    for (;;) {
      v = trendData(rng, c, t, difficulty === 1 ? 1 : 4);
      const [a, b] = halfMeans(v);
      if (t === 'up' && b - a >= 6) break;
      if (t === 'down' && a - b >= 6) break;
      if (t === 'none' && Math.abs(a - b) <= 1.5 && maxOf(v) - minOf(v) >= 5) break;
    }
    const top = maxOf(v);
    const yMax = top <= 40 ? Math.ceil((top + 3) / 10) * 10 : Math.ceil((top + 3) / 10) * 10;
    const svg = timeSeriesGraph(c.times, v, { yStart: 0, yMax, grid: 5, labelEvery: 10, title: c.title, xAxis: c.xAxis, yAxis: c.yAxis });
    const alt = `Time-series graph titled "${c.title}". ${c.times.map((x, i) => `${c.xAxis} ${x}: ${v[i]}`).join(', ')}.`;
    const order: Trend[] = ['up', 'down', 'none'];
    const [a, b] = halfMeans(v);
    const why: Record<Trend, string> = {
      up: `Overall the line rises from left to right. It may dip in places, but the later values are mostly higher than the earlier ones (the second half averages about ${num(Math.round(b))}, compared with about ${num(Math.round(a))} for the first half).`,
      down: `Overall the line falls from left to right. It may rise in places, but the later values are mostly lower than the earlier ones (the second half averages about ${num(Math.round(b))}, compared with about ${num(Math.round(a))} for the first half).`,
      none: `The line goes up and down, but it doesn't rise or fall overall. The first half and the second half average about the same (about ${num(Math.round(a))} and ${num(Math.round(b))}).`,
    };
    const wrongWhy: Record<Trend, string> = {
      up: 'Look at the whole graph, not just one or two steps. Are the later values mostly higher than the earlier ones?',
      down: 'Look at the whole graph, not just one or two steps. Are the later values mostly lower than the earlier ones?',
      none: 'A trend doesn’t have to go up every single time. Look at the overall direction of the line.',
    };
    return {
      type: 'mcq',
      prompt: `${c.intro(name)}. The time-series graph shows the results.\n\nWhich statement best describes the **trend**?`,
      figure: { svg, alt },
      options: order.map((x, i) => ({ id: ALPHA[i]!, text: TREND_TEXT[x] })),
      correct: ALPHA[order.indexOf(t)]!,
      feedback: Object.fromEntries(order.filter((x) => x !== t).map((x) => [ALPHA[order.indexOf(x)]!, wrongWhy[x]])),
      calculator: 'not-allowed',
      hints: ['A trend is the overall direction of the line, from left to right.', 'Compare the values at the start of the graph with the values at the end.'],
      solution: `${TREND_TEXT[t]}.\n\n${why[t]}`,
    };
  },
};

// ---------------- Centre and spread from a dot plot ----------------

interface SpreadContext {
  intro: (name: string) => string;
  title: string;
  axis: string;
  lo: number;
  hi: number;
  unit: string;
  /** What each dot stands for. */
  each?: string;
}

const SPREAD_CONTEXTS: readonly SpreadContext[] = [
  { intro: (n) => `${n} recorded how many minutes each Year 7 student took to finish the cross-country course`, title: 'Cross-country times', axis: 'Time (minutes)', lo: 12, hi: 26, unit: 'min' },
  { intro: (n) => `${n} counted how many push-ups each student could do in one minute`, title: 'Push-ups in one minute', axis: 'Number of push-ups', lo: 8, hi: 24, unit: '' },
  { intro: (n) => `${n} recorded each student's score in a spelling test out of 20`, title: 'Spelling test scores', axis: 'Score (out of 20)', lo: 6, hi: 20, unit: '' },
  { intro: (n) => `${n} asked students how many hours of screen time they had last Saturday`, title: 'Screen time last Saturday', axis: 'Hours', lo: 0, hi: 10, unit: 'h' },
  { intro: (n) => `${n} recorded how many words each student remembered in a memory game`, title: 'Words remembered', axis: 'Number of words', lo: 4, hi: 16, unit: '' },
  { intro: (n) => `${n} measured the tomato seedlings in the school garden to the nearest centimetre`, title: 'Heights of tomato seedlings', axis: 'Height (cm)', lo: 5, hi: 18, unit: 'cm', each: 'seedling' },
];

function mound(rng: Rng, n: number, lo: number, hi: number): number[] {
  return Array.from({ length: n }, () => Math.round(lo + ((hi - lo) * (rng.next() + rng.next())) / 2));
}

const withUnit = (x: number, unit: string) => (unit ? `${num(x)} ${unit}` : num(x));

export const centreSpread: QuestionTemplate = {
  id: 'm7.sta.interpreting.centre-spread',
  topicId: 'm7.sta.interpreting',
  title: 'Minimum, maximum, range and median from a dot plot',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    const c = rng.pick(SPREAD_CONTEXTS);
    const name = rng.pick(NAMES);
    const n = difficulty === 3 ? rng.pick([13, 15, 17, 19, 21]) : rng.int(14, 22);
    let xs = mound(rng, n, c.lo, c.hi);
    while (maxOf(xs) - minOf(xs) < 4) xs = mound(rng, n, c.lo, c.hi);
    const svg = dotPlot(xs, { lo: c.lo, hi: c.hi, axis: c.axis, title: c.title });
    const vals = [...new Set(xs)].sort((a, b) => a - b);
    const alt = `Dot plot titled "${c.title}" with ${n} dots. ${vals.map((v) => `${v}: ${countOf(xs, v)}`).join(', ')}.`;
    const units = c.unit ? { units: c.unit } : {};
    const intro = `${c.intro(name)}. The dot plot shows the results. Each dot is one ${c.each ?? 'student'}.`;

    if (difficulty === 1) {
      const askMax = rng.chance(0.5);
      const ans = askMax ? maxOf(xs) : minOf(xs);
      return {
        type: 'numeric',
        prompt: `${intro}\n\nWhat is the **${askMax ? 'maximum' : 'minimum'}** value?`,
        figure: { svg, alt },
        answer: ans,
        ...units,
        calculator: 'not-allowed',
        hints: [askMax ? 'The maximum is the highest value.' : 'The minimum is the lowest value.', askMax ? 'Find the dot furthest to the right.' : 'Find the dot furthest to the left.'],
        solution: `The ${askMax ? 'right-most' : 'left-most'} dot is above ${ans}, so the ${askMax ? 'maximum' : 'minimum'} is **${withUnit(ans, c.unit)}**.`,
      };
    }
    if (difficulty === 2) {
      return {
        type: 'numeric',
        prompt: `${intro}\n\nWhat is the **range** of the data?`,
        figure: { svg, alt },
        answer: maxOf(xs) - minOf(xs),
        ...units,
        calculator: 'not-allowed',
        hints: ['The range measures spread: maximum take away minimum.', 'Find the dots furthest to the left and furthest to the right.'],
        solution: `Maximum: ${maxOf(xs)}. Minimum: ${minOf(xs)}.\n\nRange $= ${maxOf(xs)} - ${minOf(xs)} = ${maxOf(xs) - minOf(xs)}$${c.unit ? ` ${c.unit}` : ''}`,
      };
    }
    const sorted = sortAsc(xs);
    const med = medianOf(xs);
    const pos = (n + 1) / 2;
    return {
      type: 'numeric',
      prompt: `${intro}\n\nWhat is the **median**?`,
      figure: { svg, alt },
      answer: med,
      ...units,
      calculator: 'not-allowed',
      hints: [`Count the dots. There are ${n} altogether.`, 'The dots are already in order from left to right. Count in from the left until you reach the middle dot.'],
      solution: `There are ${n} dots, so the median is the ${ordinal(pos)} dot from either end.\n\nIn order: ${boldList(sorted, middleIdx(n))}\n\nThe median is **${withUnit(med, c.unit)}**.`,
    };
  },
};

// ---------------- Shape ----------------

type Shape = 'sym' | 'pos' | 'neg';

interface ShapeContext {
  shape: Shape;
  intro: (name: string) => string;
  title: string;
  axis: string;
  lo: number;
  /** Why this shape makes sense in context. */
  why: string;
}

const SHAPE_CONTEXTS: readonly ShapeContext[] = [
  { shape: 'sym', intro: (n) => `Each student in ${n}'s class tossed 10 coins and counted the heads`, title: 'Heads in 10 coin tosses', axis: 'Number of heads', lo: 2, why: 'Getting about 5 heads is most likely, and getting a lot more or a lot fewer is less likely, so the dots taper off evenly on both sides.' },
  { shape: 'sym', intro: (n) => `${n} measured the hand span of each student in the class, to the nearest centimetre`, title: 'Hand spans', axis: 'Hand span (cm)', lo: 15, why: 'Most hand spans are close to the middle, with a few smaller and a few bigger ones.' },
  { shape: 'sym', intro: (n) => `${n} opened pea pods from the school garden and counted the peas in each one`, title: 'Peas in a pod', axis: 'Number of peas', lo: 3, why: 'Most pods have a middle number of peas, with a few pods that have fewer and a few that have more.' },
  { shape: 'pos', intro: (n) => `${n} asked students how many times they have been on a plane`, title: 'Plane trips', axis: 'Number of plane trips', lo: 0, why: 'Most students have flown only a few times or not at all, but a few have flown lots of times, which makes a long tail on the right.' },
  { shape: 'pos', intro: (n) => `${n} asked students how many pets they have`, title: 'Number of pets', axis: 'Number of pets', lo: 0, why: 'Most students have only a few pets, but a few (perhaps on farms) have lots, which makes a long tail on the right.' },
  { shape: 'pos', intro: (n) => `${n} asked students how many hours of screen time they had last Saturday`, title: 'Screen time last Saturday', axis: 'Hours', lo: 0, why: 'Most students had a few hours, but a few had a lot, which makes a long tail on the right.' },
  { shape: 'neg', intro: (n) => `${n} recorded the scores in an easy times-tables quiz out of 12`, title: 'Times-tables quiz scores', axis: 'Score', lo: 3, why: 'The quiz was easy, so most students scored high marks. A few lower scores make a long tail on the left.' },
  { shape: 'neg', intro: (n) => `${n} recorded how many days out of 20 each student came to school this month`, title: 'Days at school this month', axis: 'Days', lo: 11, why: 'Most students came nearly every day. A few were away for longer, which makes a long tail on the left.' },
];

/** Frequencies for each shape, left to right. */
function shapeCounts(rng: Rng, shape: Shape): number[] {
  if (shape === 'sym') {
    const half = [rng.int(1, 2), rng.int(3, 4), rng.int(5, 6)];
    const peak = half[2]! + rng.int(1, 2);
    return [...half, peak, ...[...half].reverse()];
  }
  const peak = rng.int(6, 8);
  const tail = [peak - rng.int(1, 2)];
  while (tail[tail.length - 1]! > 1) tail.push(Math.max(1, tail[tail.length - 1]! - rng.int(1, 2)));
  if (tail.length < 4) tail.push(1);
  tail.push(rng.pick([0, 1]), 1);
  const left = [rng.int(2, 3)];
  const counts = [...left, peak, ...tail];
  return shape === 'pos' ? counts : counts.reverse();
}

const SHAPE_NAME: Record<Shape, string> = { sym: 'Symmetrical', pos: 'Positively skewed', neg: 'Negatively skewed' };
const SHAPE_DESC: Record<Shape, string> = {
  sym: 'Symmetrical: the two tails taper off at about the same rate',
  pos: 'Positively skewed: the tail on the right is longer',
  neg: 'Negatively skewed: the tail on the left is longer',
};
const SHAPE_TRAP: Record<Shape, string> = {
  sym: 'Skewed: one tail is much longer than the other',
  pos: 'Negatively skewed: the peak is on the left',
  neg: 'Positively skewed: the peak is on the right',
};

export const shape: QuestionTemplate = {
  id: 'm7.sta.interpreting.shape',
  topicId: 'm7.sta.interpreting',
  title: 'Describe the shape of a dot plot: symmetrical or skewed',
  difficulties: [2, 3],
  generate({ rng, difficulty }) {
    const c = rng.pick(SHAPE_CONTEXTS);
    const name = rng.pick(NAMES);
    const counts = shapeCounts(rng, c.shape);
    const xs = counts.flatMap((k, i) => Array.from({ length: k }, () => c.lo + i));
    const hi = c.lo + counts.length - 1;
    const svg = dotPlot(xs, { lo: Math.max(0, c.lo - 1), hi: hi + 1, axis: c.axis, title: c.title });
    const alt = `Dot plot titled "${c.title}". Number of dots at each value from ${c.lo} to ${hi}: ${counts.join(', ')}.`;
    const shapes: Shape[] = ['sym', 'pos', 'neg'];
    const peakSide = c.shape === 'pos' ? 'left' : 'right';
    const tailSide = c.shape === 'pos' ? 'right' : 'left';
    const solution =
      c.shape === 'sym'
        ? `The dots pile up in the middle and taper off at about the same rate on both sides, so the shape is **symmetrical**.\n\n${c.why}`
        : `The peak is on the ${peakSide}, and the dots taper off slowly to the ${tailSide}: the ${tailSide} tail is longer. A longer ${tailSide} tail means the data is **${SHAPE_NAME[c.shape].toLowerCase()}**.\n\n${c.why}\n\nTip: the skew is named after the long tail, not the peak.`;
    if (difficulty === 2) {
      return {
        type: 'mcq',
        prompt: `${c.intro(name)}. The dot plot shows the results.\n\nWhat is the **shape** of the data?`,
        figure: { svg, alt },
        options: shapes.map((x, i) => ({ id: ALPHA[i]!, text: SHAPE_NAME[x] })),
        correct: ALPHA[shapes.indexOf(c.shape)]!,
        feedback: Object.fromEntries(
          shapes
            .filter((x) => x !== c.shape)
            .map((x) => [
              ALPHA[shapes.indexOf(x)]!,
              x === 'sym'
                ? 'Compare the two tails. One side tapers off much more slowly than the other.'
                : c.shape === 'sym'
                  ? 'Both tails taper off at about the same rate, so neither side has a long tail.'
                  : 'Skew is named after the long tail, not the peak. Which side has the long tail?',
            ]),
        ),
        calculator: 'not-allowed',
        hints: ['Find the peak (the tallest column), then look at the tails on each side of it.', 'Positively skewed means a long tail on the right. Negatively skewed means a long tail on the left.'],
        solution,
      };
    }
    const opts: string[] = [SHAPE_DESC.sym, SHAPE_DESC.pos, SHAPE_DESC.neg, SHAPE_TRAP[c.shape]];
    const correctIdx = shapes.indexOf(c.shape);
    return {
      type: 'mcq',
      prompt: `${c.intro(name)}. The dot plot shows the results.\n\nWhich statement describes the shape of the data correctly?`,
      figure: { svg, alt },
      options: opts.map((text, i) => ({ id: ALPHA[i]!, text })),
      correct: ALPHA[correctIdx]!,
      feedback: Object.fromEntries(
        opts
          .map((_, i) => i)
          .filter((i) => i !== correctIdx)
          .map((i) => [
            ALPHA[i]!,
            i === 3
              ? c.shape === 'sym'
                ? 'Look again: the two tails are about the same length.'
                : 'Careful: skew is named after the long tail, not the peak.'
              : 'Look at which side tapers off more slowly. That is the long tail.',
          ]),
      ),
      calculator: 'not-allowed',
      hints: ['The tails are the parts that taper off on each side of the peak.', 'The type of skew is named after the side with the longer tail.'],
      solution,
    };
  },
};

// ---------------- Comparing two groups ----------------

interface CompareContext {
  intro: string;
  groups: [string, string];
  /** Plural noun for the values, e.g. "scores". */
  what: string;
  /** "Room 7 tends to score higher" */
  tends: (g: string) => string;
  unit: string;
  lo: number;
  hi: number;
}

const COMPARE_CONTEXTS: readonly CompareContext[] = [
  { intro: 'Room 7 and Room 8 did the same spelling test, marked out of 20.', groups: ['Room 7', 'Room 8'], what: 'scores', tends: (g) => `${g} tends to score higher`, unit: '', lo: 6, hi: 20 },
  { intro: 'Some Year 7 and Year 8 students counted how many push-ups they could do in one minute.', groups: ['Year 7', 'Year 8'], what: 'push-up counts', tends: (g) => `${g} students tend to do more push-ups`, unit: '', lo: 8, hi: 30 },
  { intro: 'A class grew tomato seedlings, some in the sun and some in the shade. After three weeks they measured the heights in centimetres.', groups: ['Sun', 'Shade'], what: 'heights', tends: (g) => `Seedlings in the ${g.toLowerCase()} tend to be taller`, unit: 'cm', lo: 4, hi: 20 },
  { intro: 'Students in Room 5 and Room 6 recorded how many books they read this term.', groups: ['Room 5', 'Room 6'], what: 'numbers of books', tends: (g) => `${g} students tend to read more books`, unit: '', lo: 1, hi: 16 },
  { intro: 'Two netball teams recorded the goals they scored in each game this season.', groups: ['Kahu', 'Tūī'], what: 'goals per game', tends: (g) => `${g} tends to score more goals`, unit: '', lo: 4, hi: 24 },
  { intro: 'Students tested how far two paper-plane designs flew, in metres (to the nearest metre).', groups: ['Dart', 'Glider'], what: 'distances', tends: (g) => `The ${g} design tends to fly further`, unit: 'm', lo: 3, hi: 15 },
];

function groupData(rng: Rng, n: number, lo: number, hi: number): number[] {
  return Array.from({ length: n }, () => rng.int(lo, hi));
}

export const compareGroups: QuestionTemplate = {
  id: 'm7.sta.interpreting.compare-groups',
  topicId: 'm7.sta.interpreting',
  title: 'Compare two groups using the median and the range',
  difficulties: [3, 4],
  generate({ rng, difficulty }) {
    const c = rng.pick(COMPARE_CONTEXTS);
    const n = rng.pick([7, 9]);
    const span = c.hi - c.lo;
    for (;;) {
      const shift = rng.int(2, Math.max(3, Math.floor(span / 3)));
      const aLo = c.lo + shift;
      const a = groupData(rng, n, aLo, c.hi);
      const b = groupData(rng, n, c.lo, c.hi - shift);
      const [A, B] = rng.chance(0.5) ? [a, b] : [b, a];
      const mA = medianOf(A);
      const mB = medianOf(B);
      const rA = maxOf(A) - minOf(A);
      const rB = maxOf(B) - minOf(B);
      if (Math.abs(mA - mB) < 2 || Math.abs(rA - rB) < 2) continue;
      const hiIdx = mA > mB ? 0 : 1;
      const lists = [A, B];
      const H = lists[hiIdx]!;
      const L = lists[1 - hiIdx]!;
      if (!(minOf(H) < maxOf(L))) continue; // the groups overlap
      const [gA, gB] = c.groups;
      const gH = c.groups[hiIdx]!;
      const gL = c.groups[1 - hiIdx]!;
      const u = c.unit ? ` ${c.unit}` : '';
      const dataText = `**${gA}:** ${listText(A)}\n\n**${gB}:** ${listText(B)}`;
      const workings = `${gA} in order: ${listText(sortAsc(A))}. Median ${num(mA)}${u}, range $${maxOf(A)} - ${minOf(A)} = ${rA}$${u}.\n\n${gB} in order: ${listText(sortAsc(B))}. Median ${num(mB)}${u}, range $${maxOf(B)} - ${minOf(B)} = ${rB}$${u}.`;
      if (difficulty === 3) {
        return {
          type: 'numeric',
          prompt: `${c.intro}\n\n${dataText}\n\nWhat is the difference between the medians of the two groups?`,
          answer: Math.abs(mA - mB),
          ...(c.unit ? { units: c.unit } : {}),
          calculator: 'not-allowed',
          hints: ['Write each group’s values in order.', `Each group has ${n} values, so the median is the ${ordinal((n + 1) / 2)} value in order.`],
          solution: `${workings}\n\nDifference between the medians: $${Math.max(mA, mB)} - ${Math.min(mA, mB)} = ${Math.abs(mA - mB)}$${u}`,
        };
      }
      const wider = rA > rB ? gA : gB;
      const narrower = rA > rB ? gB : gA;
      return {
        type: 'mcq',
        prompt: `${c.intro}\n\n${dataText}\n\nWhich statement is best supported by the data?`,
        options: [
          { id: 'a', text: `${c.tends(gH)}: the median for ${gH} is ${num(Math.max(mA, mB))}${u}, compared with ${num(Math.min(mA, mB))}${u} for ${gL}.` },
          { id: 'b', text: `${c.tends(gL)}, because the median for ${gL} is higher.` },
          { id: 'c', text: `Every value in ${gH} is higher than every value in ${gL}.` },
          { id: 'd', text: `The ${c.what} for ${narrower} are more spread out, because the range is bigger.` },
        ],
        correct: 'a',
        feedback: {
          b: `Work out both medians again. ${gL}'s median is ${num(Math.min(mA, mB))}${u}, which is lower.`,
          c: `The groups overlap. For example, ${gH} has a value of ${num(minOf(H))}, but ${gL} has a value of ${num(maxOf(L))}.`,
          d: `${narrower} has the smaller range (${Math.min(rA, rB)}${u}), so its values are less spread out than ${wider}'s.`,
        },
        marks: 2,
        calculator: 'not-allowed',
        hints: ['Find the median and the range of each group.', 'Check each statement against your numbers. Only one is true.'],
        solution: `${workings}\n\n${c.tends(gH)}, because ${gH} has the higher median. But the groups overlap, so not every value for ${gH} is higher. ${wider} has the bigger range, so its ${c.what} are more spread out.`,
      };
    }
  },
};

// ---------------- Misleading graphs ----------------

interface MisleadContext {
  intro: (name: string) => string;
  title: string;
  xAxis: string;
  yAxis: string;
  cats: readonly string[];
  /** "pies did Café A sell" style: "How many times as many pies did A sell as B?" */
  verb: (a: string, b: string) => string;
}

const MISLEAD_CONTEXTS: readonly MisleadContext[] = [
  { intro: (n) => `${n} found this graph in a school newsletter. It shows how many pies three bakeries sold on Saturday`, title: 'Pies sold on Saturday', xAxis: 'Bakery', yAxis: 'Pies sold', cats: ['Kōwhai', 'Rātā', 'Mānuka'], verb: (a, b) => `How many times as many pies did ${a} sell as ${b}?` },
  { intro: (n) => `${n} saw this graph in a local paper. It shows how many cans each class collected for the food bank`, title: 'Cans collected for the food bank', xAxis: 'Class', yAxis: 'Number of cans', cats: ['Room 1', 'Room 2', 'Room 3'], verb: (a, b) => `How many times as many cans did ${a} collect as ${b}?` },
  { intro: (n) => `${n} saw this graph on a poster. It shows how many votes each team name got`, title: 'Votes for a team name', xAxis: 'Team name', yAxis: 'Votes', cats: ['Hawks', 'Sharks', 'Kiwis'], verb: (a, b) => `How many times as many votes did ${a} get as ${b}?` },
  { intro: (n) => `${n} found this graph on a website. It shows how many trees three schools planted`, title: 'Trees planted by schools', xAxis: 'School', yAxis: 'Trees planted', cats: ['Hillview', 'Bayside', 'Riverton'], verb: (a, b) => `How many times as many trees did ${a} plant as ${b}?` },
  { intro: (n) => `${n} found this graph in a club newsletter. It shows how many people swam at three pools in one week`, title: 'Swimmers in one week', xAxis: 'Pool', yAxis: 'Number of swimmers', cats: ['North', 'Central', 'South'], verb: (a, b) => `How many times as many swimmers went to ${a} as to ${b}?` },
];

type Flaw = 'truncated' | 'noScale' | 'noLabels';

const FLAW_TEXT: Record<Flaw | 'order', string> = {
  truncated: 'The vertical axis doesn’t start at 0, so the differences look bigger than they are.',
  noScale: 'There are no numbers on the vertical axis, so you can’t read the values.',
  noLabels: 'There is no title and there are no axis labels, so you can’t tell what it shows.',
  order: 'The bars are not in order from the tallest to the shortest.',
};

/** Combos for "looks k times as tall, but really r times as many": axis starts at S, values B and A = rB. */
interface Combo {
  S: number;
  B: number;
  A: number;
  k: number;
  r: number;
  grid: number;
  labelEvery: number;
}

function truncatedCombos(): Combo[] {
  const out: Combo[] = [];
  for (const r of [1.5, 2, 1.25]) {
    for (const k of [2, 3, 4, 5]) {
      if (k <= r) continue;
      for (let B = 20; B <= 80; B += 10) {
        const S = (B * (k - r)) / (k - 1);
        const A = r * B;
        if (!Number.isInteger(S) || !Number.isInteger(A) || S <= 0 || S >= B) continue;
        const grid = [10, 5].find((g) => S % g === 0 && B % g === 0 && A % g === 0);
        if (!grid) continue;
        const lines = (A + 2 * grid - S) / grid;
        const labelEvery = lines <= 12 ? grid : S % (2 * grid) === 0 ? 2 * grid : 0;
        if (!labelEvery) continue;
        out.push({ S, B, A, k, r, grid, labelEvery });
      }
    }
  }
  return out;
}

const COMBOS = truncatedCombos();

export const misleading: QuestionTemplate = {
  id: 'm7.sta.interpreting.misleading',
  topicId: 'm7.sta.interpreting',
  title: 'Spot graphs that can’t be read accurately or might mislead',
  difficulties: [4, 5],
  generate({ rng, difficulty }) {
    const c = rng.pick(MISLEAD_CONTEXTS);
    const name = rng.pick(NAMES);

    if (difficulty === 4) {
      const flaw = rng.pick(['truncated', 'noScale', 'noLabels'] as const);
      let values: number[];
      let axis: { yStart: number; yMax: number; grid: number; labelEvery: number };
      if (flaw === 'truncated') {
        const start = rng.int(4, 9) * 10;
        values = rng.shuffle([rng.int(2, 3), rng.int(4, 6), rng.int(7, 9)]).map((x) => start + x);
        axis = { yStart: start, yMax: start + 10, grid: 1, labelEvery: 2 };
      } else {
        values = rng.sample([10, 15, 20, 25, 30, 35, 40, 45], 3);
        axis = { yStart: 0, yMax: 50, grid: 5, labelEvery: 10 };
      }
      const svg = barGraph(c.cats, values, {
        ...axis,
        hideScale: flaw === 'noScale',
        ...(flaw === 'noLabels' ? {} : { title: c.title, xAxis: c.xAxis, yAxis: c.yAxis }),
      });
      const altBits = [
        flaw === 'noLabels' ? 'Bar graph with no title and no axis labels' : `Bar graph titled "${c.title}"`,
        `Bars: ${c.cats.join(', ')}`,
        flaw === 'noScale' ? 'The vertical axis has gridlines but no numbers' : `Values ${values.join(', ')}`,
        flaw === 'truncated' ? `The vertical axis starts at ${axis.yStart}, not 0` : 'The vertical axis starts at 0',
      ];
      const flaws: Array<Flaw | 'order'> = ['truncated', 'noScale', 'noLabels', 'order'];
      const why: Record<Flaw, string> = {
        truncated: `The vertical axis starts at ${axis.yStart}, not 0. That makes the bars' heights out of proportion: ${c.cats[values.indexOf(Math.max(...values))]}'s bar looks several times as tall as ${c.cats[values.indexOf(Math.min(...values))]}'s, but the real values (${Math.max(...values)} and ${Math.min(...values)}) are quite close.`,
        noScale: 'The vertical axis has no numbers, so there is no way to read how big each bar is. You can only say which bar is biggest.',
        noLabels: 'With no title and no axis labels, you can’t tell what was counted or what the bars stand for, so the graph can’t be interpreted.',
      };
      return {
        type: 'mcq',
        prompt: `${flaw === 'noLabels' ? `${name} found this graph on a website.` : `${c.intro(name)}.`}\n\nWhat is the **main problem** with this graph?`,
        figure: { svg, alt: `${altBits.join('. ')}.` },
        options: flaws.map((f, i) => ({ id: ALPHA[i]!, text: FLAW_TEXT[f] })),
        correct: ALPHA[flaws.indexOf(flaw)]!,
        feedback: Object.fromEntries(
          flaws
            .filter((f) => f !== flaw)
            .map((f) => [
              ALPHA[flaws.indexOf(f)]!,
              f === 'order'
                ? 'Bars for categories can go in any order. That doesn’t make a graph misleading.'
                : f === 'truncated'
                  ? 'Check the bottom of the vertical axis. Does it start at 0?'
                  : f === 'noScale'
                    ? 'Look again: the vertical axis does have numbers.'
                    : 'Look again: this graph does have a title and axis labels.',
            ]),
        ),
        calculator: 'not-allowed',
        hints: ['Check the title, the axis labels, the numbers on the axis, and where the axis starts.', 'A good graph lets you see what was measured and read the values accurately.'],
        solution: why[flaw],
      };
    }

    // difficulty 5: looks k times as tall, but really r times as many.
    const combo = rng.pick(COMBOS);
    const [ia, ib, ic] = rng.shuffle([0, 1, 2]) as [number, number, number];
    const values: number[] = [0, 0, 0];
    values[ia] = combo.A;
    values[ib] = combo.B;
    const free: number[] = [];
    for (let v = combo.S + combo.grid; v <= combo.A + combo.grid; v += combo.grid) if (v !== combo.A && v !== combo.B) free.push(v);
    values[ic] = rng.pick(free);
    const yMax = combo.A + combo.grid * 2;
    const a = c.cats[ia]!;
    const b = c.cats[ib]!;
    const svg = barGraph(c.cats, values, { yStart: combo.S, yMax, grid: combo.grid, labelEvery: combo.labelEvery, title: c.title, xAxis: c.xAxis, yAxis: c.yAxis });
    return {
      type: 'numeric',
      prompt: `${c.intro(name)}.\n\nThe bar for ${a} looks ${combo.k} times as tall as the bar for ${b}. Use the scale to work out the real values. ${c.verb(a, b)}`,
      figure: { svg, alt: `Bar graph titled "${c.title}". ${c.cats.map((x, i) => `${x}: ${values[i]}`).join(', ')}. The vertical axis starts at ${combo.S}, not 0, with gridlines every ${combo.grid}.` },
      answer: combo.r,
      marks: 2,
      calculator: 'not-allowed',
      hints: ['Look at where the vertical axis starts. It is not 0.', `Read the real values for ${a} and ${b} from the scale.`, 'Then divide: how many times does the smaller value fit into the bigger one?'],
      solution: `The vertical axis starts at ${combo.S}, not 0.\n\n${a}: ${combo.A}. ${b}: ${combo.B}.\n\n$${combo.A} \\div ${combo.B} = ${num(combo.r)}$, so the real value for ${a} is only **${num(combo.r)} times** the value for ${b}.\n\nThe bars look ${combo.k} times as tall because only the parts above ${combo.S} are drawn: ${combo.A - combo.S} compared with ${combo.B - combo.S}. Starting the axis above 0 makes differences look bigger than they are.`,
    };
  },
};

export const templates: QuestionTemplate[] = [trend, centreSpread, shape, compareGroups, misleading];
