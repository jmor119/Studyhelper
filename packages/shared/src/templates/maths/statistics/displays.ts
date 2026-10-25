import type { Rng } from '../../../rng';
import type { QuestionTemplate } from '../../types';
import { NAMES, frac, num, ordinal, round, tex } from '../../format';
import type { Pt } from '../../svg';
import { barGraph, boxPlot, dotPlot, histogram, scatterPlot } from './charts';
import {
  NUM_CONTEXTS,
  countOf,
  listText,
  medianOf,
  medianWorking,
  modesOf,
  moundData,
  sortAsc,
  texApprox,
  total,
  unitField,
  withUnit,
  type FiveNumber,
  type NumContext,
} from './data';

/** Lower-cases the first letter only (keeps °C, NZ, etc.). */
const lc = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

// m9.sta.displays — reading dot plots, box plots, bar graphs and scatter plots (with a line of
// best fit). Every value a student must read sits exactly on a tick mark or gridline.

/** "13: 2 dots, 14: 1 dot" for the values satisfying a condition. */
function dotCounts(values: readonly number[], keep: (v: number) => boolean): string {
  const vs = [...new Set(values.filter(keep))].sort((a, b) => a - b);
  return vs.map((v) => `${v}: ${countOf(values, v)}`).join(', ');
}

export const dotPlotTemplate: QuestionTemplate = {
  id: 'm9.sta.displays.dot-plot',
  topicId: 'm9.sta.displays',
  title: 'Read a dot plot: counts, mode, range, median and mean',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    const ctx = rng.pick(NUM_CONTEXTS);
    const name = rng.pick(NAMES);
    const width = Math.min(ctx.hi - ctx.lo, rng.int(10, 20));
    const start = rng.int(ctx.lo, ctx.hi - width);
    let values = moundData(rng, rng.int(12, 22), start, start + width);
    while (Math.max(...values) === Math.min(...values)) values = moundData(rng, 15, start, start + width);
    const kind =
      difficulty === 1
        ? rng.pick(['count', 'mode'] as const)
        : difficulty === 2
          ? rng.pick(['more', 'less', 'range'] as const)
          : rng.pick(['median', 'mean'] as const);
    if (kind === 'mode') {
      const m = modesOf(values);
      if (m.length > 1) values.push(m[0]!);
    }
    const n = values.length;
    const sorted = sortAsc(values);
    const min = sorted[0]!;
    const max = sorted[n - 1]!;
    const lo = start > 0 ? start - 1 : start;
    const hi = start + width + 1;
    const figure = {
      svg: dotPlot(values, { lo, hi, axis: ctx.axis }),
      alt: `Dot plot of ${lc(ctx.axis)} with ${n} dots. Values: ${listText(sorted)}.`,
    };
    const lead = `${ctx.intro(n, name)} The dot plot shows the results.`;
    const base = { figure, ...unitField(ctx), calculator: 'not-allowed' as const };

    if (kind === 'count') {
      const x = rng.pick([...new Set(values)]);
      const c = countOf(values, x);
      return {
        type: 'numeric',
        ...base,
        units: undefined,
        prompt: `${lead}\n\n${ctx.countQ('exactly', x, name)}`,
        answer: c,
        hints: ['Each dot stands for one value.', `Find ${x} on the axis and count the dots stacked above it.`],
        solution: `There ${c === 1 ? 'is 1 dot' : `are ${c} dots`} above ${x}, so the answer is **${c}**.`,
      };
    }
    if (kind === 'mode') {
      const m = modesOf(values)[0]!;
      return {
        type: 'numeric',
        ...base,
        prompt: `${lead}\n\nWhat is the **mode**?`,
        answer: m,
        hints: ['The mode is the most common value.', 'On a dot plot, look for the tallest stack of dots.'],
        solution: `The tallest stack is above ${m}, with ${countOf(values, m)} dots. So the mode is **${withUnit(ctx, m)}**.`,
      };
    }
    if (kind === 'more' || kind === 'less') {
      const x = kind === 'more' ? rng.int(min, max - 1) : rng.int(min + 1, max);
      const keep = (v: number) => (kind === 'more' ? v > x : v < x);
      const c = values.filter(keep).length;
      return {
        type: 'numeric',
        ...base,
        units: undefined,
        prompt: `${lead}\n\n${ctx.countQ(kind === 'more' ? 'more than' : 'less than', x, name)}`,
        answer: c,
        hints: [
          `Count the dots to the ${kind === 'more' ? 'right' : 'left'} of ${x}.`,
          `"${kind === 'more' ? 'More' : 'Less'} than ${x}" does not include ${x} itself.`,
        ],
        solution: `Count the dots ${kind === 'more' ? 'above' : 'below'} ${x}, not including ${x} itself (value: number of dots): ${dotCounts(values, keep)}.\n\nTotal: **${c}**.`,
      };
    }
    if (kind === 'range') {
      return {
        type: 'numeric',
        ...base,
        prompt: `${lead}\n\nWhat is the **range** of the data?`,
        answer: max - min,
        hints: ['Range = largest value − smallest value.', 'Look at the dots furthest left and furthest right.'],
        solution: `Smallest value: ${min}. Largest value: ${max}.\n\nRange $= ${tex(max)} - ${tex(min)} = ${tex(max - min)}$, so the range is **${withUnit(ctx, max - min)}**.`,
      };
    }
    if (kind === 'median') {
      const med = medianOf(values);
      return {
        type: 'numeric',
        ...base,
        prompt: `${lead}\n\nWhat is the **median**?`,
        answer: med,
        hints: [
          'Count the dots to find how many values there are.',
          'The dots are already in order from left to right. Count in from the left to the middle value.',
        ],
        solution: `The values in order are: ${listText(sorted)}.\n\n${medianWorking(sorted)}\n\nThe median is **${withUnit(ctx, med)}**.`,
      };
    }
    // mean
    const s = total(values);
    const mean = s / n;
    const vs = [...new Set(sorted)];
    return {
      type: 'numeric',
      ...base,
      calculator: 'allowed',
      prompt: `${lead}\n\nCalculate the **mean**. Give your answer to 1 decimal place.`,
      answer: round(mean, 1),
      decimals: 1,
      hints: [
        'Mean = total of all the values ÷ number of values.',
        'For a stack of dots, multiply the value by the number of dots.',
      ],
      solution: [
        `Number of values: ${n}.`,
        `Total: $${vs.map((v) => `${tex(v)} \\times ${countOf(values, v)}`).join(' + ')} = ${tex(s)}$`,
        `Mean $= ${tex(s)} \\div ${n} ${texApprox(mean, 1)}$`,
      ].join('\n\n'),
    };
  },
};

/** A five-number summary on a grid of `minor` steps inside the context's range. */
export function gridFive(rng: Rng, ctx: NumContext, minor: number): FiveNumber {
  const grid: number[] = [];
  for (let v = Math.ceil(ctx.lo / minor) * minor; v <= ctx.hi; v += minor) grid.push(v);
  for (;;) {
    const [min, q1, median, q3, max] = sortAsc(rng.sample(grid, 5)) as [number, number, number, number, number];
    if (q3 - q1 >= 3 * minor) return { min, q1, median, q3, max };
  }
}

export function boxScale(ctx: NumContext): { minor: number; major: number } {
  return ctx.hi - ctx.lo > 30 ? { minor: 2, major: 10 } : { minor: 1, major: 5 };
}

export function boxAxis(ctx: NumContext, fives: readonly FiveNumber[], major: number, minor: number) {
  const mn = Math.min(...fives.map((f) => f.min));
  const mx = Math.max(...fives.map((f) => f.max));
  let lo = Math.floor((mn - minor) / major) * major;
  if (ctx.lo >= 0 && lo < 0) lo = 0;
  // Don't run the scale past the largest possible value (e.g. a quiz out of 40).
  const hi = Math.max(mx, Math.min(Math.ceil((mx + minor) / major) * major, Math.ceil(ctx.hi / major) * major));
  return { lo, hi };
}

const FIVE_NAMES: Record<keyof FiveNumber, { label: string; where: string }> = {
  min: { label: 'minimum (smallest value)', where: 'the left end of the left whisker' },
  q1: { label: 'lower quartile', where: 'the left edge of the box' },
  median: { label: 'median', where: 'the line inside the box' },
  q3: { label: 'upper quartile', where: 'the right edge of the box' },
  max: { label: 'maximum (largest value)', where: 'the right end of the right whisker' },
};

export const boxPlotTemplate: QuestionTemplate = {
  id: 'm9.sta.displays.box-plot',
  topicId: 'm9.sta.displays',
  title: 'Read a box plot: five-number summary, IQR and quarters of the data',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    const ctx = rng.pick(NUM_CONTEXTS);
    const name = rng.pick(NAMES);
    const { minor, major } = boxScale(ctx);
    const f = gridFive(rng, ctx, minor);
    const { lo, hi } = boxAxis(ctx, [f], major, minor);
    const n = difficulty === 4 ? rng.pick([20, 24, 28, 32, 36, 40]) : rng.int(15, 30);
    const figure = {
      svg: boxPlot([{ five: f }], { lo, hi, minor, major, axis: ctx.axis }),
      alt: `Box plot of ${lc(ctx.axis)}: minimum ${f.min}, lower quartile ${f.q1}, median ${f.median}, upper quartile ${f.q3}, maximum ${f.max}. Gridlines every ${minor}.`,
    };
    const lead = `${ctx.intro(n, name)} The box plot summarises the results.`;

    if (difficulty === 2) {
      const which = rng.pick(['min', 'q1', 'median', 'q3', 'max'] as const);
      const info = FIVE_NAMES[which];
      return {
        type: 'numeric',
        figure,
        prompt: `${lead}\n\nWhat is the **${info.label}**?`,
        answer: f[which],
        ...unitField(ctx),
        calculator: 'not-allowed',
        hints: [
          'A box plot shows the five-number summary: minimum, lower quartile, median, upper quartile, maximum.',
          `The ${info.label.replace(/ \(.*\)/, '')} is shown by ${info.where}.`,
        ],
        solution: `The ${info.label.replace(/ \(.*\)/, '')} is shown by ${info.where}. It lines up with **${withUnit(ctx, f[which])}** on the scale.`,
      };
    }

    if (difficulty === 3) {
      const ask = rng.pick(['iqr', 'range'] as const);
      const ans = ask === 'iqr' ? f.q3 - f.q1 : f.max - f.min;
      return {
        type: 'numeric',
        figure,
        prompt: `${lead}\n\nWhat is the **${ask === 'iqr' ? 'interquartile range (IQR)' : 'range'}**?`,
        answer: ans,
        ...unitField(ctx),
        calculator: 'not-allowed',
        hints:
          ask === 'iqr'
            ? ['IQR = upper quartile − lower quartile.', 'The quartiles are the two ends of the box.']
            : ['Range = maximum − minimum.', 'The minimum and maximum are the ends of the whiskers.'],
        solution:
          ask === 'iqr'
            ? `Lower quartile (left edge of the box) $= ${tex(f.q1)}$. Upper quartile (right edge of the box) $= ${tex(f.q3)}$.\n\n$\\text{IQR} = ${tex(f.q3)} - ${tex(f.q1)} = ${tex(ans)}$, so the IQR is **${withUnit(ctx, ans)}**.`
            : `Minimum $= ${tex(f.min)}$ and maximum $= ${tex(f.max)}$ (the ends of the whiskers).\n\nRange $= ${tex(f.max)} - ${tex(f.min)} = ${tex(ans)}$, so the range is **${withUnit(ctx, ans)}**.`,
      };
    }

    // difficulty 4: each section holds about a quarter of the data
    const options = [
      { cmp: 'more than', x: f.q3, pct: 25, why: 'only the right whisker' },
      { cmp: 'less than', x: f.q1, pct: 25, why: 'only the left whisker' },
      { cmp: 'more than', x: f.median, pct: 50, why: 'the right half of the box and the right whisker' },
      { cmp: 'less than', x: f.median, pct: 50, why: 'the left whisker and the left half of the box' },
      { cmp: 'more than', x: f.q1, pct: 75, why: 'the whole box and the right whisker' },
      { cmp: 'less than', x: f.q3, pct: 75, why: 'the left whisker and the whole box' },
    ] as const;
    const o = rng.pick(options);
    const quarters = o.pct / 25;
    const explain = `The minimum, $Q_1$, median, $Q_3$ and maximum split the data into four parts, each with about a quarter (25%) of the values. Values ${o.cmp} ${withUnit(ctx, o.x)} cover ${o.why}: ${quarters} quarter${quarters > 1 ? 's' : ''}, or about ${o.pct}%.`;
    if (rng.chance(0.5)) {
      return {
        type: 'numeric',
        figure,
        prompt: `${lead}\n\nAbout what percentage of the values are ${o.cmp} ${withUnit(ctx, o.x)}?`,
        answer: o.pct,
        units: '%',
        calculator: 'not-allowed',
        hints: ['The five values on a box plot split the data into four parts with about the same number of values in each.', 'Each part holds about 25% of the data.'],
        solution: `${explain}\n\nSo about **${o.pct}%** of the values are ${o.cmp} ${withUnit(ctx, o.x)}.`,
      };
    }
    const ans = (n * o.pct) / 100;
    return {
      type: 'numeric',
      figure,
      prompt: `${lead}\n\n${ctx.countQ(o.cmp, o.x, name)} Use the box plot to estimate.`,
      answer: ans,
      calculator: 'allowed',
      hints: [
        'The five values on a box plot split the data into four parts with about the same number of values in each.',
        `There are ${n} values altogether, so each quarter has about ${n / 4}.`,
      ],
      solution: `${explain}\n\n${o.pct}% of ${n} $= ${tex(ans)}$, so the estimate is about **${ans}**.`,
    };
  },
};

interface CatContext {
  intro: string;
  cats: readonly string[];
  xAxis: string;
  yAxis: string;
  scale: 1 | 5;
  howMany: (c: string) => string;
  moreQ: (a: string, b: string) => string;
  shareQ: (word: 'percentage' | 'fraction', c: string) => string;
  totalQ: string;
}

const CAT_CONTEXTS: readonly CatContext[] = [
  {
    intro: 'Some Year 9 students were asked how they usually travel to school.',
    cats: ['Walk', 'Car', 'Bus', 'Bike', 'Scooter'],
    xAxis: 'Way of travelling to school',
    yAxis: 'Number of students',
    scale: 1,
    howMany: (c) => `How many students chose "${c}"?`,
    moreQ: (a, b) => `How many more students chose "${a}" than "${b}"?`,
    shareQ: (w, c) => `What ${w} of the students chose "${c}"?`,
    totalQ: 'How many students were asked altogether?',
  },
  {
    intro: 'Year 9 students voted for their favourite sport to play.',
    cats: ['Rugby', 'Netball', 'Football', 'Basketball', 'Hockey'],
    xAxis: 'Favourite sport',
    yAxis: 'Number of students',
    scale: 1,
    howMany: (c) => `How many students voted for ${c.toLowerCase()}?`,
    moreQ: (a, b) => `How many more students voted for ${a.toLowerCase()} than for ${b.toLowerCase()}?`,
    shareQ: (w, c) => `What ${w} of the students voted for ${c.toLowerCase()}?`,
    totalQ: 'How many students voted altogether?',
  },
  {
    intro: 'Students at a school voted for their favourite native bird.',
    cats: ['Kiwi', 'Tūī', 'Kererū', 'Pīwakawaka', 'Kea'],
    xAxis: 'Favourite native bird',
    yAxis: 'Number of votes',
    scale: 5,
    howMany: (c) => `How many votes did the ${c} get?`,
    moreQ: (a, b) => `How many more votes did the ${a} get than the ${b}?`,
    shareQ: (w, c) => `What ${w} of the votes were for the ${c}?`,
    totalQ: 'How many votes were there altogether?',
  },
  {
    intro: 'Some students were asked to choose their favourite fruit.',
    cats: ['Apple', 'Kiwifruit', 'Banana', 'Feijoa', 'Mandarin'],
    xAxis: 'Favourite fruit',
    yAxis: 'Number of students',
    scale: 1,
    howMany: (c) => `How many students chose ${c.toLowerCase()}?`,
    moreQ: (a, b) => `How many more students chose ${a.toLowerCase()} than ${b.toLowerCase()}?`,
    shareQ: (w, c) => `What ${w} of the students chose ${c.toLowerCase()}?`,
    totalQ: 'How many students were asked altogether?',
  },
  {
    intro: 'A dairy recorded the flavours of the ice creams it sold one Saturday.',
    cats: ['Hokey pokey', 'Chocolate', 'Vanilla', 'Boysenberry', 'Mint'],
    xAxis: 'Flavour',
    yAxis: 'Ice creams sold',
    scale: 5,
    howMany: (c) => `How many ${c.toLowerCase()} ice creams were sold?`,
    moreQ: (a, b) => `How many more ${a.toLowerCase()} ice creams were sold than ${b.toLowerCase()} ice creams?`,
    shareQ: (w, c) => `What ${w} of the ice creams sold were ${c.toLowerCase()}?`,
    totalQ: 'How many ice creams were sold altogether?',
  },
];

export const barGraphTemplate: QuestionTemplate = {
  id: 'm9.sta.displays.bar-graph',
  topicId: 'm9.sta.displays',
  title: 'Read a bar graph of categorical data',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    const ctx = rng.pick(CAT_CONTEXTS);
    const k = rng.pick([4, 5]);
    const keep = rng.sample([0, 1, 2, 3, 4], k).sort((a, b) => a - b);
    const cats = keep.map((i) => ctx.cats[i]!);
    const values = cats.map(() => (ctx.scale === 1 ? rng.int(2, 18) : 5 * rng.int(2, 14)));
    if (new Set(values).size === 1) values[0] = values[0]! + ctx.scale;
    const max = Math.max(...values);
    const yMax = ctx.scale === 1 ? 2 * Math.ceil((max + 1) / 2) : 10 * Math.ceil((max + 5) / 10);
    const svg = barGraph(cats, values, {
      yMax,
      grid: ctx.scale,
      labelEvery: ctx.scale === 1 ? 2 : 10,
      xAxis: ctx.xAxis,
      yAxis: ctx.yAxis,
    });
    const figure = {
      svg,
      alt: `Bar graph. ${cats.map((c, i) => `${c}: ${values[i]}`).join(', ')}.`,
    };
    const lead = `${ctx.intro} The bar graph shows the results.`;
    const read = (i: number) => `The bar for ${cats[i]} reaches ${values[i]}.`;
    const tot = values.reduce((a, b) => a + b, 0);
    const gridHint = `The gridlines are ${ctx.scale === 1 ? '1 unit' : '5 units'} apart.`;

    if (difficulty === 1) {
      const i = rng.int(0, k - 1);
      return {
        type: 'numeric',
        figure,
        prompt: `${lead}\n\n${ctx.howMany(cats[i]!)}`,
        answer: values[i]!,
        calculator: 'not-allowed',
        hints: ['Go across from the top of the bar to the vertical axis.', gridHint],
        solution: `${read(i)} So the answer is **${values[i]}**.`,
      };
    }
    if (difficulty === 2) {
      if (rng.chance(0.5)) {
        let [i, j] = rng.sample([...Array(k).keys()], 2) as [number, number];
        while (values[i] === values[j]) [i, j] = rng.sample([...Array(k).keys()], 2) as [number, number];
        if (values[i]! < values[j]!) [i, j] = [j, i];
        const d = values[i]! - values[j]!;
        return {
          type: 'numeric',
          figure,
          prompt: `${lead}\n\n${ctx.moreQ(cats[i]!, cats[j]!)}`,
          answer: d,
          calculator: 'not-allowed',
          hints: ['Read the height of each of the two bars.', 'Then subtract the smaller value from the larger value.'],
          solution: `${read(i)} ${read(j)}\n\n$${values[i]} - ${values[j]} = ${d}$, so there were **${d}** more.`,
        };
      }
      return {
        type: 'numeric',
        figure,
        prompt: `${lead}\n\n${ctx.totalQ}`,
        answer: tot,
        calculator: 'not-allowed',
        hints: ['Read the height of every bar.', 'Add them all together.'],
        solution: `Reading each bar: ${cats.map((c, i) => `${c} ${values[i]}`).join(', ')}.\n\nTotal $= ${values.join(' + ')} = ${tot}$.`,
      };
    }
    const i = rng.int(0, k - 1);
    const v = values[i]!;
    if (100 % tot === 0 || (100 * v) % tot === 0) {
      const pct = (100 * v) / tot;
      return {
        type: 'numeric',
        figure,
        prompt: `${lead}\n\n${ctx.shareQ('percentage', cats[i]!)}`,
        answer: pct,
        units: '%',
        calculator: 'allowed',
        hints: ['First find the total by adding all the bars.', `Then work out ${v} as a percentage of the total.`],
        solution: `Total $= ${values.join(' + ')} = ${tot}$.\n\nPercentage $= \\dfrac{${v}}{${tot}} \\times 100 = ${tex(pct)}\\%$.`,
      };
    }
    return {
      type: 'numeric',
      figure,
      prompt: `${lead}\n\n${ctx.shareQ('fraction', cats[i]!)} Give your answer as a fraction.`,
      answer: v / tot,
      calculator: 'allowed',
      hints: ['First find the total by adding all the bars.', 'The fraction is (number for that bar) ÷ (total).'],
      solution: `Total $= ${values.join(' + ')} = ${tot}$.\n\nFraction $= \\dfrac{${v}}{${tot}}${frac(v, tot) !== `\\frac{${v}}{${tot}}` ? ` = ${frac(v, tot)}` : ''}$.`,
    };
  },
};

// ---------------- Scatter plots ----------------

interface ScatterContext {
  intro: (n: number) => string;
  xAxis: string;
  yAxis: string;
  xMin: number;
  xMax: number;
  xStep: number;
  xLabelEvery: number;
  yMin: number;
  yMax: number;
  yStep: number;
  yLabelEvery: number;
  dir: 1 | -1 | 0;
  xName: string;
  yName: string;
  /** Range of the line's rise over its run, in grid squares (even numbers, signed). */
  dj?: [number, number];
  predictY?: (x: string) => string;
  predictX?: (y: string) => string;
  xUnits?: string;
  yUnits?: string;
  xWord?: string;
  yWord?: string;
}

const SCATTER: readonly ScatterContext[] = [
  {
    intro: (n) => `${n} Year 9 students measured their height and arm span.`,
    xAxis: 'Height (cm)',
    yAxis: 'Arm span (cm)',
    xMin: 140, xMax: 190, xStep: 5, xLabelEvery: 10,
    yMin: 140, yMax: 190, yStep: 5, yLabelEvery: 10,
    dir: 1, xName: 'height', yName: 'arm span', dj: [6, 8],
    predictY: (x) => `Use the line of best fit to predict the arm span of a student who is ${x} cm tall.`,
    predictX: (y) => `Use the line of best fit to predict the height of a student whose arm span is ${y} cm.`,
    xUnits: 'cm', yUnits: 'cm', xWord: 'cm', yWord: 'cm',
  },
  {
    intro: (n) => `${n} Year 9 students recorded how many hours they spent studying for a science test, and their score on the test.`,
    xAxis: 'Study time (hours)',
    yAxis: 'Test score (%)',
    xMin: 0, xMax: 10, xStep: 1, xLabelEvery: 2,
    yMin: 30, yMax: 100, yStep: 5, yLabelEvery: 10,
    dir: 1, xName: 'study time', yName: 'test score', dj: [6, 10],
    predictY: (x) => `Use the line of best fit to predict the test score of a student who studied for ${x} hours.`,
    predictX: (y) => `Use the line of best fit to predict how many hours a student who scored ${y}% spent studying.`,
    xUnits: 'hours', yUnits: '%', xWord: 'hours', yWord: '%',
  },
  {
    intro: (n) => `A dairy recorded the maximum temperature and the number of ice blocks it sold on ${n} summer days.`,
    xAxis: 'Maximum temperature (°C)',
    yAxis: 'Ice blocks sold',
    xMin: 14, xMax: 32, xStep: 2, xLabelEvery: 4,
    yMin: 0, yMax: 80, yStep: 5, yLabelEvery: 10,
    dir: 1, xName: 'temperature', yName: 'number of ice blocks sold', dj: [6, 10],
    predictY: (x) => `Use the line of best fit to predict how many ice blocks the dairy sells on a day with a maximum temperature of ${x} °C.`,
    predictX: (y) => `Use the line of best fit to predict the maximum temperature (in °C) on a day when the dairy sells ${y} ice blocks.`,
    xWord: '°C', yWord: 'ice blocks',
  },
  {
    intro: (n) => `A website listed the age and price of ${n} second-hand cars of the same model.`,
    xAxis: 'Age (years)',
    yAxis: 'Price ($1000s)',
    xMin: 0, xMax: 12, xStep: 1, xLabelEvery: 2,
    yMin: 0, yMax: 30, yStep: 2, yLabelEvery: 4,
    dir: -1, xName: 'age', yName: 'price', dj: [-10, -6],
    predictY: (x) => `Use the line of best fit to predict the price of one of these cars that is ${x} years old. Give your answer in thousands of dollars.`,
    predictX: (y) => `Use the line of best fit to predict the age, in years, of one of these cars that costs \\$${y},000.`,
    xWord: 'years', yWord: 'thousand dollars',
  },
  {
    intro: (n) => `${n} students recorded their screen time and how long they slept on the same school night.`,
    xAxis: 'Screen time (hours)',
    yAxis: 'Sleep (hours)',
    xMin: 0, xMax: 8, xStep: 1, xLabelEvery: 1,
    yMin: 5, yMax: 11, yStep: 0.5, yLabelEvery: 1,
    dir: -1, xName: 'screen time', yName: 'sleep', dj: [-6, -4],
    predictY: (x) => `Use the line of best fit to predict how long a student with ${x} hours of screen time slept.`,
    predictX: (y) => `Use the line of best fit to predict the screen time of a student who slept for ${y} hours.`,
    xUnits: 'hours', yUnits: 'hours', xWord: 'hours', yWord: 'hours',
  },
  {
    intro: (n) => `A school nursery measured the heights of ${n} kauri seedlings of different ages.`,
    xAxis: 'Age (weeks)',
    yAxis: 'Height (cm)',
    xMin: 0, xMax: 20, xStep: 2, xLabelEvery: 4,
    yMin: 0, yMax: 60, yStep: 5, yLabelEvery: 10,
    dir: 1, xName: 'age', yName: 'height', dj: [6, 10],
    predictY: (x) => `Use the line of best fit to predict the height of a seedling that is ${x} weeks old.`,
    predictX: (y) => `Use the line of best fit to predict the age, in weeks, of a seedling that is ${y} cm tall.`,
    yUnits: 'cm', xWord: 'weeks', yWord: 'cm',
  },
  {
    intro: (n) => `${n} students recorded their height and how long it takes them to get to school.`,
    xAxis: 'Height (cm)',
    yAxis: 'Travel time (minutes)',
    xMin: 140, xMax: 190, xStep: 5, xLabelEvery: 10,
    yMin: 0, yMax: 40, yStep: 5, yLabelEvery: 10,
    dir: 0, xName: 'height', yName: 'travel time',
  },
  {
    intro: (n) => `${n} students recorded the day of the month they were born on and their score in a maths quiz.`,
    xAxis: 'Day of the month born',
    yAxis: 'Quiz score (out of 40)',
    xMin: 0, xMax: 32, xStep: 4, xLabelEvery: 8,
    yMin: 0, yMax: 40, yStep: 5, yLabelEvery: 10,
    dir: 0, xName: 'day of birth', yName: 'quiz score',
  },
];

interface FitLine {
  f: (x: number) => number;
  /** Interior gridline x-values where the line also crosses a horizontal gridline. */
  nice: Array<{ x: number; y: number }>;
  draw: [Pt, Pt];
}

const r6 = (v: number) => Math.round(v * 1e6) / 1e6;

function buildFit(rng: Rng, c: ScatterContext): FitLine {
  const gx = Math.round((c.xMax - c.xMin) / c.xStep);
  const gy = Math.round((c.yMax - c.yMin) / c.yStep);
  const L = rng.pick([6, 8].filter((l) => l <= gx - 2));
  const i0 = rng.int(1, gx - 1 - L);
  const [a, b] = c.dj!;
  const djs: number[] = [];
  for (let d = a; d <= b; d += 2) djs.push(d);
  const dj = rng.pick(djs);
  const j0 = rng.int(Math.max(1, 1 - dj), Math.min(gy - 1, gy - 1 - dj));
  const X = (i: number) => r6(c.xMin + i * c.xStep);
  const Y = (j: number) => r6(c.yMin + j * c.yStep);
  const f = (x: number) => Y(j0) + ((x - X(i0)) * (Y(j0 + dj) - Y(j0))) / (X(i0 + L) - X(i0));
  const nice: Array<{ x: number; y: number }> = [];
  for (let i = 1; i < gx; i++) {
    const j = j0 + (dj * (i - i0)) / L;
    if (Number.isInteger(j) && j > 0 && j < gy) nice.push({ x: X(i), y: Y(j) });
  }
  // Draw the line across the plot, clipped to the y-range.
  const clip = (x: number): Pt => {
    const y = f(x);
    if (y > c.yMax) return { x: X(i0) + ((c.yMax - Y(j0)) * (X(i0 + L) - X(i0))) / (Y(j0 + dj) - Y(j0)), y: c.yMax };
    if (y < c.yMin) return { x: X(i0) + ((c.yMin - Y(j0)) * (X(i0 + L) - X(i0))) / (Y(j0 + dj) - Y(j0)), y: c.yMin };
    return { x, y };
  };
  return { f, nice, draw: [clip(c.xMin), clip(c.xMax)] };
}

function scatterPoints(rng: Rng, c: ScatterContext, n: number, fit?: FitLine): Pt[] {
  const pts: Pt[] = [];
  const xLo = c.xMin + 0.4 * c.xStep;
  const xHi = c.xMax - 0.4 * c.xStep;
  const yLo = c.yMin + 0.3 * c.yStep;
  const yHi = c.yMax - 0.3 * c.yStep;
  while (pts.length < n) {
    const x = xLo + rng.next() * (xHi - xLo);
    const y = fit ? fit.f(x) + (rng.next() + rng.next() - 1) * 2.4 * c.yStep : yLo + rng.next() * (yHi - yLo);
    if (y < yLo || y > yHi) continue;
    pts.push({ x, y });
  }
  return pts;
}

function scatterOpts(c: ScatterContext) {
  return {
    xMin: c.xMin, xMax: c.xMax, xStep: c.xStep, xLabelEvery: c.xLabelEvery,
    yMin: c.yMin, yMax: c.yMax, yStep: c.yStep, yLabelEvery: c.yLabelEvery,
    xAxis: c.xAxis, yAxis: c.yAxis,
  };
}

export const scatterTemplate: QuestionTemplate = {
  id: 'm9.sta.displays.scatter',
  topicId: 'm9.sta.displays',
  title: 'Scatter plots: describe the relationship and predict with a line of best fit',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    const n = rng.int(12, 16);

    if (difficulty === 2) {
      const c = rng.pick(SCATTER);
      const fit = c.dir === 0 ? undefined : buildFit(rng, c);
      const pts = scatterPoints(rng, c, n, fit);
      const svg = scatterPlot(pts, scatterOpts(c));
      const correct = c.dir === 1 ? 'pos' : c.dir === -1 ? 'neg' : 'none';
      return {
        type: 'mcq',
        figure: { svg, alt: `Scatter plot of ${lc(c.yAxis)} against ${lc(c.xAxis)} for ${n} points.` },
        prompt: `${c.intro(n)} The scatter plot shows the results.\n\nWhich statement best describes the relationship between ${c.xName} and ${c.yName}?`,
        options: [
          { id: 'pos', text: `Positive: as ${c.xName} increases, ${c.yName} tends to increase.` },
          { id: 'neg', text: `Negative: as ${c.xName} increases, ${c.yName} tends to decrease.` },
          { id: 'none', text: `No clear relationship between ${c.xName} and ${c.yName}.` },
          { id: 'perfect', text: 'Perfect: every point lies exactly on a straight line.' },
        ],
        correct,
        feedback: {
          ...(correct !== 'pos' && { pos: 'For a positive relationship the points would go up from left to right.' }),
          ...(correct !== 'neg' && { neg: 'For a negative relationship the points would go down from left to right.' }),
          ...(correct !== 'none' && { none: 'There is a clear pattern here: look at the overall direction of the points from left to right.' }),
          perfect: 'The points are scattered, not exactly on a line. Real data almost never lies perfectly on a line.',
        },
        shuffle: false,
        hints: ['Look at the overall pattern from left to right.', 'Do the points tend to go up, go down, or show no pattern?'],
        solution:
          c.dir === 1
            ? `The points tend to go **up** from left to right, so there is a positive relationship: as ${c.xName} increases, ${c.yName} tends to increase. The points are scattered, so it is a tendency, not a rule.`
            : c.dir === -1
              ? `The points tend to go **down** from left to right, so there is a negative relationship: as ${c.xName} increases, ${c.yName} tends to decrease. The points are scattered, so it is a tendency, not a rule.`
              : `The points are spread all over the plot with no upward or downward trend, so there is **no clear relationship** between ${c.xName} and ${c.yName}.`,
      };
    }

    const c = rng.pick(SCATTER.filter((s) => s.dir !== 0));
    const fit = buildFit(rng, c);
    const pt = rng.pick(fit.nice);
    const lead = `${c.intro(n)} The scatter plot shows the results, with a line of best fit drawn by eye.`;
    const kind = difficulty === 3 ? 'y' : rng.pick(['x', 'residual'] as const);

    if (kind === 'y' || kind === 'x') {
      const pts = scatterPoints(rng, c, n, fit);
      const svg = scatterPlot(pts, { ...scatterOpts(c), fit: fit.draw });
      const figure = { svg, alt: `Scatter plot of ${lc(c.yAxis)} against ${lc(c.xAxis)} with a line of best fit through (${num(pt.x)}, ${num(pt.y)}).` };
      if (kind === 'y') {
        return {
          type: 'numeric',
          figure,
          prompt: `${lead}\n\n${c.predictY!(num(pt.x))}`,
          answer: pt.y,
          tolerance: 0.4 * c.yStep,
          ...(c.yUnits && { units: c.yUnits }),
          calculator: 'not-allowed',
          hints: [
            `Find ${num(pt.x)} on the horizontal axis.`,
            'Go straight up to the line, then straight across to the vertical axis.',
          ],
          solution: `From ${num(pt.x)} on the horizontal axis, go up to the line of best fit, then across to the vertical axis. The line passes through (${num(pt.x)}, ${num(pt.y)}), so the prediction is about **${num(pt.y)} ${c.yWord}**.\n\nA prediction from a line of best fit is only an estimate: real values are scattered around the line.`,
        };
      }
      return {
        type: 'numeric',
        figure,
        prompt: `${lead}\n\n${c.predictX!(num(pt.y))}`,
        answer: pt.x,
        tolerance: 0.4 * c.xStep,
        ...(c.xUnits && { units: c.xUnits }),
        calculator: 'not-allowed',
        hints: [
          `This time start on the vertical axis at ${num(pt.y)}.`,
          'Go straight across to the line, then straight down to the horizontal axis.',
        ],
        solution: `From ${num(pt.y)} on the vertical axis, go across to the line of best fit, then down to the horizontal axis. The line passes through (${num(pt.x)}, ${num(pt.y)}), so the prediction is about **${num(pt.x)} ${c.xWord}**.`,
      };
    }

    // residual: how far a circled point is from the line's prediction
    const gy = Math.round((c.yMax - c.yMin) / c.yStep);
    const jLine = Math.round((pt.y - c.yMin) / c.yStep);
    const moves = [-3, -2, 2, 3].filter((m) => jLine + m > 0 && jLine + m < gy);
    const m = rng.pick(moves);
    const hy = r6(pt.y + m * c.yStep);
    const name = rng.pick(NAMES);
    const pts = scatterPoints(rng, c, n - 1, fit);
    pts.push({ x: pt.x, y: hy });
    const svg = scatterPlot(pts, { ...scatterOpts(c), fit: fit.draw, highlight: { p: { x: pt.x, y: hy }, text: name } });
    const diff = r6(Math.abs(m) * c.yStep);
    return {
      type: 'numeric',
      figure: {
        svg,
        alt: `Scatter plot of ${lc(c.yAxis)} against ${lc(c.xAxis)} with a line of best fit through (${num(pt.x)}, ${num(pt.y)}). ${name}'s point at (${num(pt.x)}, ${num(hy)}) is circled.`,
      },
      prompt: `${lead}\n\n${name}'s point is circled. What is the difference between ${name}'s actual ${c.yName} and the ${c.yName} that the line of best fit predicts?`,
      answer: diff,
      tolerance: 0.4 * c.yStep,
      ...(c.yUnits && { units: c.yUnits }),
      calculator: 'not-allowed',
      hints: [
        `Read ${name}'s actual ${c.yName} from the circled point.`,
        `Then read the line's prediction for the same ${c.xName}, and subtract.`,
      ],
      solution: [
        `${name}'s point is at ${c.xName} ${num(pt.x)}, ${c.yName} ${num(hy)}.`,
        `For ${c.xName} ${num(pt.x)}, the line of best fit gives ${num(pt.y)}.`,
        `Difference $= ${tex(Math.max(hy, pt.y))} - ${tex(Math.min(hy, pt.y))} = ${tex(diff)}$, so ${name}'s ${c.yName} is **${num(diff)} ${c.yWord} ${m > 0 ? 'higher' : 'lower'}** than predicted.`,
      ].join('\n\n'),
    };
  },
};

export const histogramTemplate: QuestionTemplate = {
  id: 'm9.sta.displays.histogram',
  topicId: 'm9.sta.displays',
  title: 'Read a histogram with equal class intervals',
  difficulties: [2, 3],
  generate({ rng, difficulty }) {
    const ctx = rng.pick(NUM_CONTEXTS.filter((c) => c.hi - c.lo >= 15 && c.key !== 'quiz'));
    const name = rng.pick(NAMES);
    const w = ctx.hi - ctx.lo > 30 ? 10 : 5;
    const first = Math.floor(ctx.lo / w) * w;
    const bins = Math.ceil((ctx.hi + 1 - first) / w);
    const bin = (vs: readonly number[]) =>
      Array.from({ length: bins }, (_, i) => vs.filter((v) => v >= first + i * w && v < first + (i + 1) * w).length);
    let values = moundData(rng, rng.int(24, 40), ctx.lo, ctx.hi);
    while (bin(values).filter((f) => f > 0).length < 4) values = moundData(rng, rng.int(24, 40), ctx.lo, ctx.hi);
    // Drop empty classes at either end.
    const all = bin(values);
    const firstUsed = all.findIndex((f) => f > 0);
    const lastUsed = all.length - 1 - [...all].reverse().findIndex((f) => f > 0);
    const freqs = all.slice(firstUsed, lastUsed + 1);
    const start = first + firstUsed * w;
    const k = freqs.length;
    const n = values.length;
    const lowEdge = (i: number) => start + i * w;
    const cls = (i: number) => `${lowEdge(i)}–${lowEdge(i + 1)}`;
    const maxF = Math.max(...freqs);
    const svg = histogram(start, w, freqs, {
      yMax: 2 * Math.ceil((maxF + 1) / 2),
      grid: 1,
      labelEvery: 2,
      xAxis: ctx.axis,
      yAxis: 'Frequency',
    });
    const figure = {
      svg,
      alt: `Histogram of ${lc(ctx.axis)}. ${freqs.map((f, i) => `${cls(i)}: ${f}`).join(', ')}.`,
    };
    const lead = `${ctx.intro(n, name)} The histogram shows the results. Each bar includes its left-hand boundary but not its right-hand one: for example, the ${cls(1)} bar is for values from ${lowEdge(1)} up to, but not including, ${lowEdge(2)}.`;

    if (difficulty === 2) {
      const nonZero = freqs.flatMap((f, i) => (f > 0 ? [i] : []));
      const i = rng.pick(nonZero);
      return {
        type: 'numeric',
        figure,
        prompt: `${lead}\n\nWhat is the frequency of the ${cls(i)} class?`,
        answer: freqs[i]!,
        calculator: 'not-allowed',
        hints: ['Find the bar between those two numbers on the horizontal axis.', 'Read across from the top of the bar to the frequency axis.'],
        solution: `The bar from ${lowEdge(i)} to ${lowEdge(i + 1)} reaches **${freqs[i]}** on the frequency axis.`,
      };
    }

    const sorted = sortAsc(values);
    const mids = n % 2 ? [(n - 1) / 2] : [n / 2 - 1, n / 2];
    const classOf = (v: number) => Math.floor((v - start) / w);
    const medClass = classOf(sorted[mids[0]!]!);
    const medianOk = mids.every((m) => classOf(sorted[m]!) === medClass) && k >= 4;
    const kind = rng.pick(medianOk ? (['atLeast', 'lessThan', 'median'] as const) : (['atLeast', 'lessThan'] as const));

    if (kind === 'median') {
      const lo = Math.max(0, Math.min(medClass - rng.int(0, 3), k - 4));
      const opts = [0, 1, 2, 3].map((j) => lo + j);
      const running = freqs.map((_, i) => freqs.slice(0, i + 1).reduce((a, b) => a + b, 0));
      return {
        type: 'mcq',
        figure,
        prompt: `${lead}\n\nWhich class interval contains the median?`,
        options: opts.map((j) => ({ id: `c${j}`, text: cls(j) })),
        correct: `c${medClass}`,
        shuffle: false,
        calculator: 'not-allowed',
        hints: [
          'Add up all the frequencies to find how many values there are.',
          'Work out the position of the median, then count along the bars from the left.',
        ],
        solution: [
          `Total frequency: $${freqs.join(' + ')} = ${n}$.`,
          n % 2
            ? `The median is the ${ordinal((n + 1) / 2)} value.`
            : `The median is halfway between the ${ordinal(n / 2)} and ${ordinal(n / 2 + 1)} values.`,
          `Running totals: ${freqs.map((_, i) => `up to ${lowEdge(i + 1)}: ${running[i]}`).join('; ')}.`,
          `So the median is in the **${cls(medClass)}** class.`,
        ].join('\n\n'),
      };
    }
    const inner = Array.from({ length: k - 1 }, (_, i) => i + 1).filter((b) => {
      const below = freqs.slice(0, b).reduce((a, x) => a + x, 0);
      return below > 0 && below < n;
    });
    const b = rng.pick(inner);
    const edge = lowEdge(b);
    const atLeast = kind === 'atLeast';
    const idx = atLeast ? freqs.map((_, i) => i).filter((i) => i >= b) : freqs.map((_, i) => i).filter((i) => i < b);
    const ans = idx.reduce((s, i) => s + freqs[i]!, 0);
    return {
      type: 'numeric',
      figure,
      prompt: `${lead}\n\n${ctx.countQ(atLeast ? 'at least' : 'less than', edge, name)}`,
      answer: ans,
      calculator: 'not-allowed',
      hints: [
        `Find ${edge} on the horizontal axis. It is the boundary between two bars.`,
        `Add the frequencies of all the bars to the ${atLeast ? 'right' : 'left'} of ${edge}.`,
      ],
      solution: `The bars ${atLeast ? `from ${edge} upwards` : `below ${edge}`} are ${idx.map((i) => `${cls(i)} (${freqs[i]})`).join(', ')}.\n\nTotal: $${idx.map((i) => freqs[i]).join(' + ')} = ${ans}$.`,
    };
  },
};

export const displayTemplates: QuestionTemplate[] = [
  dotPlotTemplate,
  boxPlotTemplate,
  barGraphTemplate,
  histogramTemplate,
  scatterTemplate,
];
