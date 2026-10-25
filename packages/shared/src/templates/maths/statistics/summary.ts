import type { Rng } from '../../../rng';
import type { QuestionTemplate } from '../../types';
import { NAMES, clean, num, ordinal, round, tex } from '../../format';
import {
  NUM_CONTEXTS,
  boldList,
  fiveNumber,
  halves,
  listText,
  meanOf,
  medianOf,
  medianWorking,
  middleIdx,
  moundData,
  sortAsc,
  texApprox,
  total,
  unitField,
  withUnit,
  type NumContext,
} from './data';

// m9.sta.summary — mean, median, mode, range, quartiles, IQR and the five-number summary.
// Quartiles use the NZ curriculum method: the median splits the ordered data into two halves
// (leaving the median out when n is odd) and the quartiles are the medians of those halves.

/** n values from the context whose sum is a multiple of n (so the mean is a whole number). */
function wholeMeanData(rng: Rng, ctx: NumContext, n: number): number[] {
  for (let attempt = 0; attempt < 50; attempt++) {
    const v = moundData(rng, n, ctx.lo, ctx.hi);
    const r = total(v) % n;
    if (r === 0) return v;
    const iMax = v.indexOf(Math.max(...v));
    if (v[iMax]! - r >= ctx.lo) {
      v[iMax] = v[iMax]! - r;
      return v;
    }
  }
  return Array.from({ length: n }, () => Math.round((ctx.lo + ctx.hi) / 2));
}

/** Distinct sorted values from the context (needs hi − lo + 1 ≥ n). */
function distinctSorted(rng: Rng, ctx: NumContext, n: number): number[] {
  const pool: number[] = [];
  for (let v = ctx.lo; v <= ctx.hi; v++) pool.push(v);
  return sortAsc(rng.sample(pool, n));
}

const sumTex = (xs: readonly number[]) => xs.map((x) => tex(x)).join(' + ');

export const measures: QuestionTemplate = {
  id: 'm9.sta.summary.measures',
  topicId: 'm9.sta.summary',
  title: 'Mean, median, mode and range of a small data set',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    const ctx = rng.pick(NUM_CONTEXTS);
    const name = rng.pick(NAMES);
    const show = (v: readonly number[]) => `${ctx.intro(v.length, name)}\n\n${listText(v)}`;

    if (difficulty === 1) {
      if (rng.chance(0.5)) {
        const n = rng.int(6, 9);
        const modeVal = rng.int(ctx.lo, ctx.hi);
        const pool: number[] = [];
        for (let v = ctx.lo; v <= ctx.hi; v++) if (v !== modeVal) pool.push(v);
        const values = rng.shuffle([modeVal, modeVal, modeVal, ...rng.sample(pool, n - 3)]);
        const sorted = sortAsc(values);
        const at = sorted.flatMap((x, i) => (x === modeVal ? [i] : []));
        return {
          type: 'numeric',
          prompt: `${show(values)}\n\nWhat is the **mode**?`,
          answer: modeVal,
          ...unitField(ctx),
          calculator: 'not-allowed',
          hints: ['The mode is the value that appears most often.', 'Putting the values in order makes repeated values easy to spot.'],
          solution: `In order: ${boldList(sorted, at)}\n\n${num(modeVal)} appears 3 times, more than any other value, so the mode is **${withUnit(ctx, modeVal)}**.`,
        };
      }
      const n = rng.int(6, 9);
      const values = moundData(rng, n, ctx.lo, ctx.hi);
      if (Math.max(...values) === Math.min(...values)) values[0] = values[0]! === ctx.hi ? ctx.lo : ctx.hi;
      const max = Math.max(...values);
      const min = Math.min(...values);
      return {
        type: 'numeric',
        prompt: `${show(values)}\n\nWhat is the **range**?`,
        answer: max - min,
        ...unitField(ctx),
        calculator: 'not-allowed',
        hints: ['Range = largest value − smallest value.'],
        solution: `Largest value: ${num(max)}. Smallest value: ${num(min)}.\n\nRange $= ${tex(max)} - ${tex(min)} = ${tex(max - min)}$, so the range is **${withUnit(ctx, max - min)}**.`,
      };
    }

    if (difficulty === 2) {
      if (rng.chance(0.5)) {
        const n = rng.int(5, 8);
        const values = wholeMeanData(rng, ctx, n);
        const s = total(values);
        const mean = s / n;
        return {
          type: 'numeric',
          prompt: `${show(values)}\n\nCalculate the **mean**.`,
          answer: mean,
          ...unitField(ctx),
          calculator: 'not-allowed',
          hints: ['Mean = total of all the values ÷ number of values.', `There are ${n} values.`],
          solution: [
            `Add the values: $${sumTex(values)} = ${tex(s)}$`,
            `Divide by the number of values: $${tex(s)} \\div ${n} = ${tex(mean)}$`,
            `The mean is **${withUnit(ctx, mean)}**.`,
          ].join('\n\n'),
        };
      }
      const n = rng.pick([5, 7, 9]);
      const values = moundData(rng, n, ctx.lo, ctx.hi);
      const sorted = sortAsc(values);
      const med = medianOf(values);
      return {
        type: 'numeric',
        prompt: `${show(values)}\n\nFind the **median**.`,
        answer: med,
        ...unitField(ctx),
        calculator: 'not-allowed',
        hints: ['First put the values in order from smallest to largest.', 'The median is the middle value.'],
        solution: `In order: ${boldList(sorted, middleIdx(n))}\n\n${medianWorking(sorted)}\n\nThe median is **${withUnit(ctx, med)}**.`,
      };
    }

    // difficulty 3
    if (rng.chance(0.5)) {
      const n = rng.pick([6, 8, 10]);
      const values = moundData(rng, n, ctx.lo, ctx.hi);
      const sorted = sortAsc(values);
      const med = medianOf(values);
      return {
        type: 'numeric',
        prompt: `${show(values)}\n\nFind the **median**.`,
        answer: med,
        ...unitField(ctx),
        calculator: 'not-allowed',
        hints: [
          'Put the values in order first.',
          `There is an even number of values (${n}), so there are two middle values.`,
          'The median is halfway between the two middle values.',
        ],
        solution: `In order: ${boldList(sorted, middleIdx(n))}\n\n${medianWorking(sorted)}\n\nThe median is **${withUnit(ctx, med)}**.`,
      };
    }
    const n = rng.int(6, 9);
    const values = moundData(rng, n, ctx.lo, ctx.hi);
    const s = total(values);
    const mean = s / n;
    const ans = round(mean, 1);
    return {
      type: 'numeric',
      prompt: `${show(values)}\n\nCalculate the **mean**. Give your answer to 1 decimal place.`,
      answer: ans,
      decimals: 1,
      ...unitField(ctx),
      calculator: 'allowed',
      hints: ['Mean = total ÷ number of values.', `Add all ${n} values, then divide by ${n}.`],
      solution: [
        `Total: $${sumTex(values)} = ${tex(s)}$`,
        `Mean $= ${tex(s)} \\div ${n} ${texApprox(mean, 1)}$`,
        `The mean is **${num(ans, 1)} ${ctx.unitWord}** (to 1 d.p.).`,
      ].join('\n\n'),
    };
  },
};

/** Worked steps for the five-number summary of xs (NZ method). */
function quartileSteps(xs: readonly number[]): string[] {
  const sorted = sortAsc(xs);
  const n = sorted.length;
  const { lower, upper } = halves(sorted);
  const f = fiveNumber(sorted);
  return [
    `In order: ${boldList(sorted, middleIdx(n))}`,
    medianWorking(sorted),
    n % 2
      ? `Leave the median out and split the data into halves of ${lower.length} values each.`
      : `Split the data into two halves of ${lower.length} values each.`,
    `Lower half: ${listText(lower)}, so the lower quartile is $Q_1 = ${tex(f.q1)}$.`,
    `Upper half: ${listText(upper)}, so the upper quartile is $Q_3 = ${tex(f.q3)}$.`,
  ];
}

export const quartiles: QuestionTemplate = {
  id: 'm9.sta.summary.quartiles',
  topicId: 'm9.sta.summary',
  title: 'Quartiles, IQR and the five-number summary',
  difficulties: [2, 3, 4, 5],
  generate({ rng, difficulty }) {
    const ctx = rng.pick(NUM_CONTEXTS);
    const name = rng.pick(NAMES);

    if (difficulty === 2) {
      const n = rng.pick([7, 11]);
      const sorted = sortAsc(moundData(rng, n, ctx.lo, ctx.hi));
      const f = fiveNumber(sorted);
      const which = rng.pick(['lower', 'upper'] as const);
      const { lower, upper } = halves(sorted);
      const half = which === 'lower' ? lower : upper;
      const ans = which === 'lower' ? f.q1 : f.q3;
      return {
        type: 'numeric',
        prompt: `${ctx.intro(n, name)} The values are already in order:\n\n${listText(sorted)}\n\nFind the **${which} quartile** ($${which === 'lower' ? 'Q_1' : 'Q_3'}$).`,
        answer: ans,
        ...unitField(ctx),
        calculator: 'not-allowed',
        hints: [
          'First find the median (the middle value).',
          `The ${which} quartile is the median of the ${which} half of the data. Leave the median itself out of both halves.`,
        ],
        solution: [
          medianWorking(sorted),
          `The ${which} half (not including the median) is ${listText(half)}.`,
          `Its middle value is **${num(ans)}**, so $${which === 'lower' ? 'Q_1' : 'Q_3'} = ${tex(ans)}$.`,
        ].join('\n\n'),
      };
    }

    if (difficulty === 3 || difficulty === 4) {
      const n = difficulty === 3 ? rng.pick([8, 9, 10, 12]) : rng.pick([11, 13, 15]);
      let values = moundData(rng, n, ctx.lo, ctx.hi);
      while (fiveNumber(values).q3 === fiveNumber(values).q1) values = moundData(rng, n, ctx.lo, ctx.hi);
      const g = fiveNumber(values);
      const ask = difficulty === 3 ? 'iqr' : rng.pick(['iqr', 'q3', 'q1'] as const);
      const iqr = clean(g.q3 - g.q1);
      const ans = ask === 'iqr' ? iqr : ask === 'q3' ? g.q3 : g.q1;
      const what =
        ask === 'iqr'
          ? 'the **interquartile range** (IQR)'
          : ask === 'q3'
            ? 'the **upper quartile** ($Q_3$)'
            : 'the **lower quartile** ($Q_1$)';
      const steps = quartileSteps(values);
      if (ask === 'iqr') steps.push(`$\\text{IQR} = Q_3 - Q_1 = ${tex(g.q3)} - ${tex(g.q1)} = ${tex(iqr)}$`);
      steps.push(`So ${what.replace(/\*\*/g, '')} is **${withUnit(ctx, ans)}**.`);
      return {
        type: 'numeric',
        prompt: `${ctx.intro(n, name)}\n\n${listText(values)}\n\nFind ${what}.`,
        answer: ans,
        ...unitField(ctx),
        calculator: 'not-allowed',
        hints: [
          'Put the values in order and find the median first.',
          n % 2
            ? `There are ${n} values (odd), so leave the median out when you split the data into a lower half and an upper half.`
            : `There are ${n} values (even), so the median falls between two values and each half has ${n / 2} values.`,
          ask === 'iqr' ? '$Q_1$ and $Q_3$ are the medians of the two halves. Then IQR = $Q_3 - Q_1$.' : 'The quartile is the median of that half.',
        ],
        solution: steps.join('\n\n'),
      };
    }

    // difficulty 5: an unknown value is fixed by the IQR
    const n = ctx.hi - ctx.lo >= 20 ? rng.pick([9, 13]) : 9;
    const sorted = distinctSorted(rng, ctx, n);
    const f = fiveNumber(sorted);
    const iqr = clean(f.q3 - f.q1);
    const side = rng.pick(['lower', 'upper'] as const);
    const h = Math.floor(n / 2);
    // Each half has an even number of values, so each quartile is the mean of two values.
    const pair = side === 'lower' ? [h / 2 - 1, h / 2] : [h + 1 + h / 2 - 1, h + 1 + h / 2];
    const kIdx = rng.pick(pair);
    const otherIdx = pair[0] === kIdx ? pair[1]! : pair[0]!;
    const k = sorted[kIdx]!;
    const other = sorted[otherIdx]!;
    const shown = sorted.map((x, i) => (i === kIdx ? '$k$' : num(x))).join(', ');
    const known = side === 'lower' ? f.q3 : f.q1;
    const target = side === 'lower' ? f.q1 : f.q3;
    const qName = side === 'lower' ? 'Q_1' : 'Q_3';
    const knownName = side === 'lower' ? 'Q_3' : 'Q_1';
    return {
      type: 'numeric',
      prompt: `${ctx.intro(n, name)} The values are in order from smallest to largest, but one value is unknown and shown as $k$:\n\n${shown}\n\nThe interquartile range is ${withUnit(ctx, iqr)}. Find the value of $k$.`,
      answer: k,
      ...unitField(ctx),
      calculator: 'not-allowed',
      hints: [
        `There are ${n} values, so the median is the ${ordinal(h + 1)} value and each half has ${h} values.`,
        `Find $${knownName}$ first. It doesn't involve $k$.`,
        `Then use $\\text{IQR} = Q_3 - Q_1$ to find $${qName}$, which is the mean of $k$ and the value next to it.`,
      ],
      solution: [
        `There are ${n} values, so the median is the ${ordinal(h + 1)} value, ${num(sorted[h]!)}. Each half has ${h} values, so each quartile is halfway between two values.`,
        `$${knownName} = ${tex(known)}$ (from the ${side === 'lower' ? 'upper' : 'lower'} half).`,
        side === 'lower'
          ? `$Q_1 = Q_3 - \\text{IQR} = ${tex(f.q3)} - ${tex(iqr)} = ${tex(target)}$`
          : `$Q_3 = Q_1 + \\text{IQR} = ${tex(f.q1)} + ${tex(iqr)} = ${tex(target)}$`,
        `$${qName}$ is halfway between $k$ and ${num(other)}: $\\dfrac{k + ${tex(other)}}{2} = ${tex(target)}$, so $k + ${tex(other)} = ${tex(2 * target)}$ and $k = ${tex(k)}$.`,
      ].join('\n\n'),
    };
  },
};

interface FreqContext {
  intro: string;
  head: string;
  values: number[];
  noun: string;
}

const FREQ_CONTEXTS: readonly FreqContext[] = [
  { intro: 'Some students were asked how many pets they have.', head: 'Number of pets', values: [0, 1, 2, 3, 4], noun: 'number of pets' },
  {
    intro: 'Some Year 9 students recorded how many siblings (brothers and sisters) they have.',
    head: 'Number of siblings',
    values: [0, 1, 2, 3, 4, 5],
    noun: 'number of siblings',
  },
  {
    intro: 'Some students recorded how many people live in their household.',
    head: 'People in household',
    values: [2, 3, 4, 5, 6, 7],
    noun: 'household size',
  },
  {
    intro: 'A football team recorded how many goals it scored in each game of its season.',
    head: 'Goals scored',
    values: [0, 1, 2, 3, 4, 5],
    noun: 'number of goals',
  },
  {
    intro: 'Some students recorded how many days last week they ate breakfast.',
    head: 'Days with breakfast',
    values: [3, 4, 5, 6, 7],
    noun: 'number of days',
  },
];

function freqTable(ctx: FreqContext, freqs: readonly number[]): string {
  return [
    `| ${ctx.head} | ${ctx.values.join(' | ')} |`,
    `|---|${ctx.values.map(() => '---').join('|')}|`,
    `| Frequency | ${freqs.join(' | ')} |`,
  ].join('\n');
}

/** "0 → 1st–5th, 1 → 6th–13th, …" running totals for locating positions. */
function runningTotals(ctx: FreqContext, freqs: readonly number[]): string {
  let start = 1;
  return ctx.values
    .map((v, i) => {
      const f = freqs[i]!;
      const end = start + f - 1;
      const s = f === 1 ? `value ${start}` : `values ${start}–${end}`;
      start = end + 1;
      return `${v}: ${s}`;
    })
    .join('; ');
}

export const frequencyTable: QuestionTemplate = {
  id: 'm9.sta.summary.frequency-table',
  topicId: 'm9.sta.summary',
  title: 'Mean, median and quartiles from a frequency table',
  difficulties: [3, 4],
  generate({ rng, difficulty }) {
    const ctx = rng.pick(FREQ_CONTEXTS);
    const freqs = ctx.values.map(() => rng.int(1, 9));
    const n = freqs.reduce((a, b) => a + b, 0);
    const expanded = ctx.values.flatMap((v, i) => Array<number>(freqs[i]!).fill(v));
    const table = freqTable(ctx, freqs);

    if (difficulty === 3) {
      const products = ctx.values.map((v, i) => v * freqs[i]!);
      const s = products.reduce((a, b) => a + b, 0);
      const mean = s / n;
      const ans = round(mean, 1);
      return {
        type: 'numeric',
        prompt: `${ctx.intro}\n\n${table}\n\nCalculate the mean ${ctx.noun}. Give your answer to 1 decimal place.`,
        answer: ans,
        decimals: 1,
        calculator: 'allowed',
        hints: [
          'Multiply each value by its frequency to find the total of all the values.',
          'Add the frequencies to find how many values there are.',
          'Mean = total of the values ÷ number of values.',
        ],
        solution: [
          `Total of the values: $${ctx.values.map((v, i) => `${v} \\times ${freqs[i]}`).join(' + ')} = ${tex(s)}$`,
          `Number of values: $${freqs.join(' + ')} = ${n}$`,
          `Mean $= ${tex(s)} \\div ${n} ${texApprox(mean, 1)}$`,
        ].join('\n\n'),
      };
    }

    const ask = rng.pick(['median', 'q3', 'q1'] as const);
    const f = fiveNumber(expanded);
    const ans = ask === 'median' ? f.median : ask === 'q3' ? f.q3 : f.q1;
    const h = Math.floor(n / 2);
    let where: string;
    if (ask === 'median') {
      where =
        n % 2
          ? `There are ${n} values, so the median is the ${ordinal((n + 1) / 2)} value.`
          : `There are ${n} values, so the median is halfway between the ${ordinal(n / 2)} and ${ordinal(n / 2 + 1)} values.`;
    } else {
      const offset = ask === 'q1' ? 0 : n % 2 ? h + 1 : h;
      const first = offset + 1;
      const last = offset + h;
      const mid = middleIdx(h).map((i) => offset + i + 1);
      where = [
        n % 2
          ? `There are ${n} values. The median is the ${ordinal(h + 1)} value; leave it out, so each half has ${h} values.`
          : `There are ${n} values, so each half has ${h} values.`,
        `The ${ask === 'q1' ? 'lower' : 'upper'} half is values ${first}–${last}, and its middle is ${mid.length === 1 ? `value ${mid[0]}` : `halfway between values ${mid[0]} and ${mid[1]}`}.`,
      ].join(' ');
    }
    const whatText = ask === 'median' ? 'median' : ask === 'q3' ? 'upper quartile' : 'lower quartile';
    // 1-based positions of the value(s) that give the answer.
    const positions =
      ask === 'median'
        ? middleIdx(n).map((i) => i + 1)
        : middleIdx(h).map((i) => (ask === 'q1' ? 0 : n % 2 ? h + 1 : h) + i + 1);
    const atPos = positions.map((p) => expanded[p - 1]!);
    const reading =
      positions.length === 1
        ? `The ${ordinal(positions[0]!)} value is ${atPos[0]}.`
        : atPos[0] === atPos[1]
          ? `The ${ordinal(positions[0]!)} and ${ordinal(positions[1]!)} values are both ${atPos[0]}.`
          : `The ${ordinal(positions[0]!)} value is ${atPos[0]} and the ${ordinal(positions[1]!)} value is ${atPos[1]}, so take the value halfway between them: $\\dfrac{${atPos[0]} + ${atPos[1]}}{2} = ${tex(ans)}$.`;
    return {
      type: 'numeric',
      prompt: `${ctx.intro}\n\n${table}\n\nFind the **${whatText}** of the ${ctx.noun}.`,
      answer: ans,
      calculator: 'not-allowed',
      hints: [
        'Add the frequencies to find how many values there are.',
        ask === 'median'
          ? 'Work out the position of the middle value, then count along the table using running totals.'
          : 'Find the position of the median first, then the middle of the half you need. Count along the table using running totals.',
      ],
      solution: [
        `Number of values: $${freqs.join(' + ')} = ${n}$.`,
        where,
        `Running totals: ${runningTotals(ctx, freqs)}.`,
        reading,
        `So the ${whatText} is **${num(ans)}**.`,
      ].join('\n\n'),
    };
  },
};

export const meanReasoning: QuestionTemplate = {
  id: 'm9.sta.summary.mean-reasoning',
  topicId: 'm9.sta.summary',
  title: 'Reasoning with the mean: missing values, combined groups, adding or removing a value',
  difficulties: [4, 5],
  generate({ rng, difficulty }) {
    const ctx = rng.pick(NUM_CONTEXTS);
    const name = rng.pick(NAMES);

    if (difficulty === 4) {
      if (rng.chance(0.5)) {
        const n = rng.int(5, 7);
        const values = wholeMeanData(rng, ctx, n);
        const mean = total(values) / n;
        const hide = rng.int(0, n - 1);
        const missing = values[hide]!;
        const known = values.filter((_, i) => i !== hide);
        const knownSum = total(known);
        const shown = values.map((x, i) => (i === hide ? '?' : num(x))).join(', ');
        return {
          type: 'numeric',
          prompt: `${ctx.intro(n, name)} One value has been smudged and can't be read:\n\n${shown}\n\nThe mean of all ${n} values is ${withUnit(ctx, mean)}. What is the missing value?`,
          answer: missing,
          ...unitField(ctx),
          calculator: 'allowed',
          hints: [
            'If you know the mean and how many values there are, you can find the total: total = mean × number of values.',
            'Subtract the values you know from the total.',
          ],
          solution: [
            `Total of all ${n} values $= ${tex(mean)} \\times ${n} = ${tex(mean * n)}$`,
            `Total of the ${n - 1} known values $= ${sumTex(known)} = ${tex(knownSum)}$`,
            `Missing value $= ${tex(mean * n)} - ${tex(knownSum)} = ${tex(missing)}$`,
          ].join('\n\n'),
        };
      }
      // score needed in the next test
      for (;;) {
        const n = rng.int(3, 6);
        const m1 = rng.int(55, 80);
        const m2 = m1 + rng.int(2, 6);
        const needed = (n + 1) * m2 - n * m1;
        if (needed > 100) continue;
        return {
          type: 'numeric',
          prompt: `${name}'s mean score over ${n} science tests is ${m1}%. What score does ${name} need in the next test to raise the mean to ${m2}%?`,
          answer: needed,
          units: '%',
          calculator: 'allowed',
          hints: [
            `Find the total of the ${n} scores so far: mean × number of tests.`,
            `Find the total needed over ${n + 1} tests for a mean of ${m2}%.`,
            'The difference between the two totals is the score needed.',
          ],
          solution: [
            `Total so far $= ${m1} \\times ${n} = ${n * m1}$`,
            `Total needed after ${n + 1} tests $= ${m2} \\times ${n + 1} = ${(n + 1) * m2}$`,
            `Score needed $= ${(n + 1) * m2} - ${n * m1} = ${needed}$, so ${name} needs **${needed}%**.`,
          ].join('\n\n'),
        };
      }
    }

    // difficulty 5
    if (rng.chance(0.5)) {
      const cc = rng.pick(NUM_CONTEXTS.filter((c) => c.classPhrase));
      const a = rng.int(10, 18);
      const b = rng.int(10, 18);
      const span = cc.hi - cc.lo;
      const m1 = rng.int(cc.lo + Math.ceil(span / 4), cc.hi - Math.ceil(span / 4));
      let m2 = rng.int(cc.lo + Math.ceil(span / 4), cc.hi - Math.ceil(span / 4));
      if (m2 === m1) m2 = m1 + 2;
      const [groupA, groupB] = rng.pick([
        ['Room 9A', 'Room 9B'],
        ['Room 12', 'Room 14'],
        ['9KH', '9TW'],
      ] as const);
      const combined = (a * m1 + b * m2) / (a + b);
      const ans = round(combined, 1);
      return {
        type: 'numeric',
        prompt: `Students in two Year 9 classes recorded ${cc.classPhrase}.\n\n- ${groupA}: ${a} students, with a mean of ${withUnit(cc, m1)}\n- ${groupB}: ${b} students, with a mean of ${withUnit(cc, m2)}\n\nFind the mean for all ${a + b} students together. Give your answer to 1 decimal place.`,
        answer: ans,
        decimals: 1,
        ...unitField(cc),
        calculator: 'allowed',
        hints: [
          `You can't just average ${m1} and ${m2}, because the groups are different sizes.`,
          'Find the total for each group (mean × number of values), then add them.',
          `Divide the combined total by ${a + b}.`,
        ],
        solution: [
          `Total for ${groupA}: $${m1} \\times ${a} = ${a * m1}$`,
          `Total for ${groupB}: $${m2} \\times ${b} = ${b * m2}$`,
          `Combined mean $= \\dfrac{${a * m1} + ${b * m2}}{${a + b}} = \\dfrac{${a * m1 + b * m2}}{${a + b}} ${texApprox(combined, 1)}$`,
          a === b
            ? `(Here the groups are the same size, so averaging the two means happens to work too.)`
            : `Averaging the two means would give $${tex(clean((m1 + m2) / 2))}$, which is wrong because the groups are different sizes.`,
        ].join('\n\n'),
      };
    }
    const n = rng.int(8, 12);
    let values = wholeMeanData(rng, ctx, n);
    while (Math.max(...values) === Math.min(...values)) values = wholeMeanData(rng, ctx, n);
    const mean = total(values) / n;
    const sorted = sortAsc(values);
    const removeLow = rng.chance(0.5);
    const removed = removeLow ? sorted[0]! : sorted[n - 1]!;
    const newMean = (mean * n - removed) / (n - 1);
    const ans = round(newMean, 1);
    return {
      type: 'numeric',
      prompt: `${ctx.intro(n, name)} The mean of the ${n} values is ${withUnit(ctx, mean)}.\n\nThe ${removeLow ? 'smallest' : 'largest'} value, ${withUnit(ctx, removed)}, turns out to have been recorded wrongly, so it is removed. What is the mean of the remaining ${n - 1} values? Give your answer to 1 decimal place.`,
      answer: ans,
      decimals: 1,
      ...unitField(ctx),
      calculator: 'allowed',
      hints: [
        'Use the mean to find the total of the original values: total = mean × number of values.',
        `Subtract the removed value, then divide by the new number of values (${n - 1}).`,
      ],
      solution: [
        `Original total $= ${tex(mean)} \\times ${n} = ${tex(mean * n)}$`,
        `New total $= ${tex(mean * n)} - ${tex(removed)} = ${tex(mean * n - removed)}$`,
        `New mean $= ${tex(mean * n - removed)} \\div ${n - 1} ${texApprox(newMean, 1)}$`,
        `Removing a ${removeLow ? 'small' : 'large'} value makes the mean ${removeLow ? 'go up' : 'go down'}.`,
      ].join('\n\n'),
    };
  },
};

export const summaryTemplates: QuestionTemplate[] = [measures, quartiles, frequencyTable, meanReasoning];
