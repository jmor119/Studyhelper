import type { QuestionTemplate } from '../../types';
import { NAMES, clean, num, round, tex } from '../../format';
import { barGraph, boxPlot } from './charts';
import { boxAxis, boxScale, gridFive } from './displays';
import {
  NUM_CONTEXTS,
  listText,
  meanOf,
  medianOf,
  moundData,
  sortAsc,
  texApprox,
  total,
  unitField,
  withUnit,
  type FiveNumber,
  type NumContext,
} from './data';

// m9.sta.interpreting — misleading graphs, the effect of outliers, and making careful claims
// when comparing two box plots. (The Year 10 "75%-to-50%" rule is deliberately not used.)

interface MisleadingContext {
  intro: (a: string, b: string) => string;
  labels: () => [string, string];
  xAxis: string;
  yAxis: string;
  /** The headline claim, made by someone looking only at the bar heights. */
  claim: (a: string, b: string, r: number) => string;
}

const MISLEADING: readonly MisleadingContext[] = [
  {
    intro: (a, b) => `A poster about the school council election shows the votes for two candidates, ${a} and ${b}.`,
    labels: () => ['', ''],
    xAxis: 'Candidate',
    yAxis: 'Votes',
    claim: (a, b, r) => `"${b} got about ${r} times as many votes as ${a}!"`,
  },
  {
    intro: () => `A school sausage sizzle compared how many sausages it sold in two weeks.`,
    labels: () => ['Week 1', 'Week 2'],
    xAxis: 'Week',
    yAxis: 'Sausages sold',
    claim: (_a, _b, r) => `"We sold about ${r} times as many sausages in Week 2!"`,
  },
  {
    intro: () => `A netball club's newsletter shows how many members it had in 2024 and 2025.`,
    labels: () => ['2024', '2025'],
    xAxis: 'Year',
    yAxis: 'Members',
    claim: (_a, _b, r) => `"Our club is about ${r} times as big as it was last year!"`,
  },
  {
    intro: () => `A school newsletter shows how many kilograms of paper were recycled in Term 1 and Term 2.`,
    labels: () => ['Term 1', 'Term 2'],
    xAxis: 'Term',
    yAxis: 'Paper recycled (kg)',
    claim: (_a, _b, r) => `"We recycled about ${r} times as much paper in Term 2!"`,
  },
];

export const misleadingAxis: QuestionTemplate = {
  id: 'm9.sta.interpreting.misleading-axis',
  topicId: 'm9.sta.interpreting',
  title: 'Spot and quantify a misleading bar graph (axis not starting at zero)',
  difficulties: [3, 4],
  generate({ rng, difficulty }) {
    const ctx = rng.pick(MISLEADING);
    let [A, B] = ctx.labels();
    if (!A) [A, B] = rng.sample(NAMES, 2) as [string, string];
    const a = rng.pick([40, 60, 80, 100, 120, 140, 160, 200, 240]);
    const p = rng.pick([5, 10, 15, 20, 25]);
    const b = (a * (100 + p)) / 100;
    const d = b - a;
    // Gridline spacing: divides the difference (so both bar tops sit on gridlines) and is at most half of it.
    const L = [20, 10, 5, 2, 1].find((x) => x <= d / 2 && d % x === 0) ?? 1;
    const s = L * Math.floor((a - L) / L);
    const yMax = L * Math.ceil((b + L) / L);
    const r = (b - s) / (a - s);
    const rRound = Math.round(r);
    const svg = barGraph([A, B], [a, b], { yStart: s, yMax, grid: L, labelEvery: L, xAxis: ctx.xAxis, yAxis: ctx.yAxis });
    const figure = {
      svg,
      alt: `Bar graph with a vertical axis that starts at ${s}. ${A}: ${a}. ${B}: ${b}. The bar for ${B} is drawn about ${rRound} times as tall as the bar for ${A}.`,
    };
    const lead = `${ctx.intro(A, B)}`;
    const why = `The vertical axis starts at ${s}, not 0. The bars are drawn from ${s}, so ${A}'s bar is only ${a - s} unit${a - s === 1 ? '' : 's'} tall and ${B}'s bar is ${b - s} units tall. That makes ${B}'s bar look about ${rRound} times as tall, even though ${b} is only ${p}% more than ${a}.`;

    if (difficulty === 3) {
      return {
        type: 'mcq',
        figure,
        prompt: `${lead}\n\nUnder the graph is the claim: ${ctx.claim(A, B, rRound)}\n\nWhy is this graph misleading?`,
        options: [
          { id: 'axis', text: `The vertical axis starts at ${s} instead of 0, so the difference looks much bigger than it is.` },
          { id: 'fine', text: `It isn't misleading: ${B}'s bar is about ${rRound} times as tall, so the claim is correct.` },
          { id: 'colour', text: 'The two bars are the same colour, so they are hard to tell apart.' },
          { id: 'pie', text: 'Bar graphs can only be used for numerical data, so this should be a pie chart.' },
        ],
        correct: 'axis',
        feedback: {
          fine: `Read the scale: ${A} is ${a} and ${B} is ${b}. That's nowhere near ${rRound} times as many. The bars only look that way because the axis starts at ${s}.`,
          colour: 'The labels underneath already tell the bars apart. Colour is not what makes this graph misleading.',
          pie: 'Bar graphs are a good choice for comparing counts in categories. The problem here is the scale.',
        },
        shuffle: true,
        calculator: 'not-allowed',
        hints: ['Look carefully at the number at the bottom of the vertical axis.', `Read the actual values for ${A} and ${B} from the scale.`],
        solution: `${why}\n\nActually, $${b} \\div ${a} ${texApprox(b / a, 2)}$, so ${B}'s value is only about ${num(round(b / a, 2))} times ${A}'s, not ${rRound} times. A fair bar graph should start its vertical axis at 0.`,
      };
    }

    if (rng.chance(0.5)) {
      return {
        type: 'numeric',
        figure,
        prompt: `${lead}\n\nUnder the graph is the claim: ${ctx.claim(A, B, rRound)}\n\nRead the actual values from the graph. By what percentage is ${B}'s value actually greater than ${A}'s?`,
        answer: p,
        units: '%',
        calculator: 'allowed',
        hints: [
          `Read the values for ${A} and ${B} from the scale. Notice where the axis starts.`,
          `Percentage increase = (increase ÷ original value) × 100, using ${A}'s value as the original.`,
        ],
        solution: [
          `From the scale: ${A} $= ${a}$ and ${B} $= ${b}$.`,
          `Increase $= ${b} - ${a} = ${d}$.`,
          `Percentage increase $= \\dfrac{${d}}{${a}} \\times 100 = ${p}\\%$.`,
          `So ${B} is only **${p}%** more than ${A}. ${why}`,
        ].join('\n\n'),
      };
    }
    const ratio = round(b / a, 2);
    return {
      type: 'numeric',
      figure,
      prompt: `${lead}\n\nUnder the graph is the claim: ${ctx.claim(A, B, rRound)}\n\nRead the actual values from the graph. How many times as large as ${A}'s value is ${B}'s value? Give your answer to 2 decimal places.`,
      answer: ratio,
      decimals: 2,
      calculator: 'allowed',
      hints: [`Read the values for ${A} and ${B} from the scale. Notice where the axis starts.`, `Divide ${B}'s value by ${A}'s value.`],
      solution: [
        `From the scale: ${A} $= ${a}$ and ${B} $= ${b}$.`,
        `$${b} \\div ${a} ${texApprox(b / a, 2)}$`,
        `So ${B} is only about **${num(ratio, 2)}** times ${A}, not ${rRound} times. ${why}`,
      ].join('\n\n'),
    };
  },
};

/** Contexts where one unusually large (or small) value is believable. */
const OUTLIER_KEYS: Record<string, { dir: 1 | -1; why: string }> = {
  travel: { dir: 1, why: 'perhaps that student lives a long way from school' },
  texts: { dir: 1, why: 'perhaps that student was organising an event' },
  exercise: { dir: 1, why: 'perhaps that student had a long sports tournament' },
  books: { dir: 1, why: 'perhaps that student is a very keen reader' },
  quiz: { dir: -1, why: 'perhaps that student was unwell, or missed most of the quiz' },
  crosscountry: { dir: 1, why: 'perhaps that student was injured and walked' },
};

export const outlierEffect: QuestionTemplate = {
  id: 'm9.sta.interpreting.outliers',
  topicId: 'm9.sta.interpreting',
  title: 'The effect of an outlier on the mean and the median',
  difficulties: [3, 4],
  generate({ rng, difficulty }) {
    const ctx: NumContext = rng.pick(NUM_CONTEXTS.filter((c) => OUTLIER_KEYS[c.key]));
    const info = OUTLIER_KEYS[ctx.key]!;
    const name = rng.pick(NAMES);
    const n = rng.int(7, 10);
    const span = ctx.hi - ctx.lo;
    const rest = moundData(rng, n - 1, ctx.lo + Math.round(span / 6), ctx.hi);
    const outlier =
      info.dir === 1
        ? ctx.hi + rng.int(Math.round(0.8 * span), Math.round(1.5 * span))
        : rng.int(1, Math.max(2, ctx.lo - 8));
    const values = rng.shuffle([...rest, outlier]);
    const meanWith = meanOf(values);
    const meanWithout = meanOf(rest);
    const lead = `${ctx.intro(n, name)}\n\n${listText(values)}`;
    const restSum = total(rest);

    if (difficulty === 3) {
      const ans = round(meanWithout, 1);
      return {
        type: 'numeric',
        prompt: `${lead}\n\nOne of these values is an **outlier**. Remove it, then calculate the mean of the remaining values. Give your answer to 1 decimal place.`,
        answer: ans,
        decimals: 1,
        ...unitField(ctx),
        calculator: 'allowed',
        hints: [
          'An outlier is a value that is much bigger or much smaller than the rest of the data.',
          `After removing it there are ${n - 1} values left.`,
        ],
        solution: [
          `The outlier is **${num(outlier)}**: it is much ${info.dir === 1 ? 'larger' : 'smaller'} than all the other values (${info.why}).`,
          `Total of the other ${n - 1} values: $${tex(restSum)}$`,
          `Mean $= ${tex(restSum)} \\div ${n - 1} ${texApprox(meanWithout, 1)}$ ${ctx.unitWord}.`,
          `For comparison, the mean with the outlier included is about ${num(round(meanWith, 1), 1)}. One extreme value can pull the mean a long way.`,
        ].join('\n\n'),
      };
    }

    if (rng.chance(0.5)) {
      const diff = Math.abs(meanWith - meanWithout);
      const ans = round(diff, 1);
      return {
        type: 'numeric',
        prompt: `${lead}\n\nOne of these values is an outlier. By how much does the **mean** change when the outlier is removed? Give your answer to 1 decimal place.`,
        answer: ans,
        decimals: 1,
        tolerance: 0.11,
        ...unitField(ctx),
        calculator: 'allowed',
        hints: [
          'Find the mean of all the values, then the mean without the outlier.',
          'The change is the difference between the two means.',
        ],
        solution: [
          `The outlier is ${num(outlier)}.`,
          `Mean with the outlier: $${tex(total(values))} \\div ${n} ${texApprox(meanWith, 2)}$`,
          `Mean without the outlier: $${tex(restSum)} \\div ${n - 1} ${texApprox(meanWithout, 2)}$`,
          `The mean changes by about **${num(ans, 1)} ${ctx.unitWord}**.`,
          `The median changes much less: it goes from ${num(medianOf(values))} to ${num(medianOf(rest))}. The median is not affected much by outliers, but the mean is.`,
        ].join('\n\n'),
      };
    }
    const medWith = medianOf(values);
    const medWithout = medianOf(rest);
    const change = clean(Math.abs(medWith - medWithout));
    return {
      type: 'numeric',
      prompt: `${lead}\n\nOne of these values is an outlier. By how much does the **median** change when the outlier is removed?`,
      answer: change,
      ...unitField(ctx),
      calculator: 'not-allowed',
      hints: [
        'Put the values in order and find the median.',
        `Then remove the outlier and find the median of the remaining ${n - 1} values.`,
      ],
      solution: [
        `In order: ${listText(sortAsc(values))}. The outlier is ${num(outlier)}.`,
        `Median with the outlier (${n} values): ${num(medWith)}.`,
        `Median without it (${n - 1} values): ${num(medWithout)}.`,
        `The median changes by **${num(change)}**${change === 0 ? ' (it does not change at all)' : ''}.`,
        `Compare the mean, which moves from about ${num(round(meanWith, 1), 1)} to ${num(round(meanWithout, 1), 1)}. The median is much less affected by an outlier than the mean.`,
      ].join('\n\n'),
    };
  },
};

const GROUP_PAIRS: Record<string, ReadonlyArray<readonly [string, string]>> = {
  student: [
    ['Room 9A', 'Room 9B'],
    ['Year 9', 'Year 10'],
    ['Class A', 'Class B'],
  ],
  netball: [['2024', '2025']],
  rugby: [['2024', '2025']],
  seedlings: [['Shade', 'Full sun']],
};

const COMPARE_INTRO: Record<string, (a: string, b: string, ctx: NumContext) => string> = {
  student: (a, b, ctx) => `Students in ${a} and ${b} recorded ${ctx.classPhrase}.`,
  netball: (a, b) => `A school netball team recorded the goals it scored in each game of the ${a} and ${b} seasons.`,
  rugby: (a, b) => `A school rugby team recorded the points it scored in each game of the ${a} and ${b} seasons.`,
  seedlings: () => 'A school nursery grew kauri seedlings in two places, in shade and in full sun, and measured their heights in centimetres.',
};

interface Statement {
  text: string;
  truth: boolean;
}

export const compareBoxPlots: QuestionTemplate = {
  id: 'm9.sta.interpreting.compare-box-plots',
  topicId: 'm9.sta.interpreting',
  title: 'Make careful comparisons from two box plots',
  difficulties: [3, 4],
  generate({ rng, difficulty }) {
    const ctx = rng.pick(NUM_CONTEXTS.filter((c) => c.classPhrase || GROUP_PAIRS[c.key]));
    const kind = ctx.classPhrase ? 'student' : ctx.key;
    const [A, B] = rng.pick(GROUP_PAIRS[kind]!);
    const { minor, major } = boxScale(ctx);
    let fa: FiveNumber;
    let fb: FiveNumber;
    const iqr = (f: FiveNumber) => f.q3 - f.q1;
    const range = (f: FiveNumber) => f.max - f.min;
    do {
      fa = gridFive(rng, ctx, minor);
      fb = gridFive(rng, ctx, minor);
    } while (fa.median === fb.median || iqr(fa) === iqr(fb) || range(fa) === range(fb));
    const { lo, hi } = boxAxis(ctx, [fa, fb], major, minor);
    const svg = boxPlot(
      [
        { name: A, five: fa },
        { name: B, five: fb },
      ],
      { lo, hi, minor, major, axis: ctx.axis },
    );
    const describe = (g: string, f: FiveNumber) =>
      `${g}: minimum ${f.min}, lower quartile ${f.q1}, median ${f.median}, upper quartile ${f.q3}, maximum ${f.max}`;
    const figure = { svg, alt: `Two box plots on the same scale. ${describe(A, fa)}. ${describe(B, fb)}.` };
    const lead = `${COMPARE_INTRO[kind]!(A, B, ctx)} The box plots show the results.`;

    const pair = (x: string, y: string, fx: FiveNumber, fy: FiveNumber, what: 'median' | 'IQR' | 'range'): Statement => {
      const val = (f: FiveNumber) => (what === 'median' ? f.median : what === 'IQR' ? iqr(f) : range(f));
      const text =
        what === 'median'
          ? `The median for ${x} is higher than the median for ${y}.`
          : what === 'IQR'
            ? `${x} has a larger interquartile range than ${y}.`
            : `${x} has a larger range than ${y}.`;
      return { text, truth: val(fx) > val(fy) };
    };
    const both = (what: 'median' | 'IQR' | 'range') => [pair(A, B, fa, fb, what), pair(B, A, fb, fa, what)] as const;
    const [medAB, medBA] = both('median');
    const [iqAB, iqBA] = both('IQR');
    const [rgAB, rgBA] = both('range');
    const hiG = fa.median > fb.median ? A : B;
    const loG = hiG === A ? B : A;
    const fHi = hiG === A ? fa : fb;
    const fLo = hiG === A ? fb : fa;
    const every: Statement = {
      text: `Every value for ${hiG} is higher than every value for ${loG}.`,
      truth: fHi.min > fLo.max,
    };
    const readG = rng.pick([A, B]);
    const fr = readG === A ? fa : fb;
    const shown = rng.chance(0.5) ? fr.q1 : fr.median;
    const read: Statement = { text: `The lower quartile for ${readG} is ${withUnit(ctx, shown)}.`, truth: shown === fr.q1 };

    const facts = [
      `${describe(A, fa)}.`,
      `${describe(B, fb)}.`,
      `Medians: ${A} ${fa.median}, ${B} ${fb.median}. IQRs: ${A} $${fa.q3} - ${fa.q1} = ${iqr(fa)}$, ${B} $${fb.q3} - ${fb.q1} = ${iqr(fb)}$. Ranges: ${A} $${fa.max} - ${fa.min} = ${range(fa)}$, ${B} $${fb.max} - ${fb.min} = ${range(fb)}$.`,
    ];
    const caution =
      fHi.min > fLo.max
        ? `Here the two box plots don't overlap at all, so every value for ${hiG} really is higher.`
        : `The box plots overlap, so some values for ${loG} are higher than some values for ${hiG}. ${hiG} has the higher median, but we can't claim that every value for ${hiG} is higher.`;

    if (difficulty === 3) {
      const all = [medAB, medBA, iqAB, iqBA, rgAB, rgBA, every, read];
      const trues = all.filter((st) => st.truth);
      const falses = all.filter((st) => !st.truth);
      const right = rng.pick(trues);
      const wrong = rng.sample(falses, 3);
      const opts = rng.shuffle([right, ...wrong]).map((st, i) => ({ id: 'abcd'[i]!, text: st.text, truth: st.truth }));
      return {
        type: 'mcq',
        figure,
        prompt: `${lead}\n\nWhich statement is **true**?`,
        options: opts.map(({ id, text }) => ({ id, text })),
        correct: opts.find((o) => o.truth)!.id,
        shuffle: false,
        calculator: 'not-allowed',
        hints: [
          'Read the five-number summary for each box plot first.',
          'The median is the line in the box; the IQR is the width of the box; the range is from the end of one whisker to the other.',
        ],
        solution: [...facts, `So the true statement is: **${right.text}**`, caution].join('\n\n'),
      };
    }

    const pickOne = (x: Statement, y: Statement) => (rng.chance(0.5) ? x : y);
    let med = pickOne(medAB, medBA);
    let iq = pickOne(iqAB, iqBA);
    const rg = pickOne(rgAB, rgBA);
    // Make sure at least one statement is true and at least one is false.
    if (![med, iq, rg, every, read].some((st) => st.truth)) med = med === medAB ? medBA : medAB;
    if ([med, iq, rg, every, read].every((st) => st.truth)) iq = iq === iqAB ? iqBA : iqAB;
    const statements = rng.shuffle([med, iq, rg, every, read]);
    const opts = statements.map((st, i) => ({ id: 'abcde'[i]!, text: st.text, truth: st.truth }));
    return {
      type: 'multi',
      marks: 2,
      figure,
      prompt: `${lead}\n\nSelect **all** the statements that are true.`,
      options: opts.map(({ id, text }) => ({ id, text })),
      correct: opts.filter((o) => o.truth).map((o) => o.id),
      shuffle: false,
      calculator: 'not-allowed',
      hints: [
        'Read the five-number summary for each box plot first.',
        'Check each statement on its own against the numbers you read.',
      ],
      solution: [
        ...facts,
        ...opts.map((o) => `- ${o.truth ? '✓' : '✗'} ${o.text}`),
        caution,
      ].join('\n\n'),
    };
  },
};

export const interpretingTemplates: QuestionTemplate[] = [misleadingAxis, outlierEffect, compareBoxPlots];
