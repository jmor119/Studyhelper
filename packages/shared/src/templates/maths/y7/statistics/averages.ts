import type { QuestionTemplate } from '../../../types';
import { NAMES, num, ordinal, tex } from '../../../format';
import {
  CAT_CONTEXTS,
  NUM_CONTEXTS,
  boldList,
  countOf,
  distinctValues,
  listText,
  maxOf,
  meanOf,
  medianOf,
  middleIdx,
  minOf,
  modesOf,
  randomValues,
  sortAsc,
  sumTex,
  total,
  valuesWithMean,
  valuesWithMode,
  withUnit,
  type NumContext,
} from './averages-helpers';

// m7.sta.averages — variable types, mean, median, mode and range, and how outliers affect them.
// Numbers are chosen so everything can be worked out without a calculator.

const unitTex = (unit: string) => (!unit ? '' : unit === '°C' ? '^{\\circ}\\text{C}' : `\\text{ ${unit}}`);
const unitOf = (ctx: NumContext) => (ctx.unit ? { units: ctx.unit } : {});

export const rangeMode: QuestionTemplate = {
  id: 'm7.sta.averages.range-mode',
  topicId: 'm7.sta.averages',
  title: 'Find the range or the mode of a small data set',
  difficulties: [1, 2],
  generate({ rng, difficulty }) {
    const name = rng.pick(NAMES);

    if (difficulty === 2 && rng.chance(0.35)) {
      // Mode of categorical data.
      const ctx = rng.pick(CAT_CONTEXTS);
      const cats = rng.sample(ctx.categories, 4);
      const top = rng.int(4, 6);
      const others = rng.sample([1, 2, 3, ...(top > 4 ? [top - 1] : [])], 3);
      const counts = [top, ...others];
      const answers = rng.shuffle(cats.flatMap((c, i) => Array.from({ length: counts[i]! }, () => c)));
      const modeCat = cats[0]!;
      return {
        type: 'mcq',
        prompt: `${ctx.intro(name)}. Here are the results:\n\n${answers.join(', ')}\n\nWhat is the **mode**?`,
        options: cats.map((c, i) => ({ id: String.fromCharCode(97 + i), text: c })),
        correct: 'a',
        feedback: Object.fromEntries(
          cats.slice(1).map((c, i) => [
            String.fromCharCode(98 + i),
            `${c} appears ${counts[i + 1]} time${counts[i + 1] === 1 ? '' : 's'}. Another answer appears more often than that.`,
          ]),
        ),
        calculator: 'not-allowed',
        hints: ['The mode is the answer that appears most often.', 'Make a tally: count how many times each answer appears.'],
        solution: `Tally of the results:\n\n${cats.map((c, i) => `- ${c}: ${counts[i]}`).join('\n')}\n\n${modeCat} appears most often (${top} times), so the mode is **${modeCat}**. The mode is the only average you can find for categorical data like this.`,
      };
    }

    const ctx = rng.pick(NUM_CONTEXTS);
    const n = difficulty === 1 ? rng.int(5, 7) : rng.int(8, 11);
    const kind = rng.pick(['range', 'mode'] as const);
    const u = unitTex(ctx.unit);

    if (kind === 'range') {
      let xs = randomValues(rng, n, ctx.lo, ctx.hi);
      while (maxOf(xs) - minOf(xs) < 3) xs = randomValues(rng, n, ctx.lo, ctx.hi);
      const hi = maxOf(xs);
      const lo = minOf(xs);
      return {
        type: 'numeric',
        prompt: `${ctx.intro(name)}:\n\n**${listText(xs)}**\n\nWhat is the **range**?`,
        answer: hi - lo,
        ...unitOf(ctx),
        calculator: 'not-allowed',
        hints: [
          'The range is the highest value take away the lowest value.',
          'Check the whole list carefully for the highest and lowest values. Writing the values in order can help.',
        ],
        solution: `Highest value: ${withUnit(hi, ctx.unit)}. Lowest value: ${withUnit(lo, ctx.unit)}.\n\nRange $= ${tex(hi)} - ${tex(lo)} = ${tex(hi - lo)}${u}$\n\nThe range measures how spread out the data is.`,
      };
    }

    const xs = valuesWithMode(rng, n, ctx.lo, ctx.hi, difficulty === 1 ? 2 : 3);
    const mode = modesOf(xs)[0]!;
    const sorted = sortAsc(xs);
    const idx = sorted.map((v, i) => (v === mode ? i : -1)).filter((i) => i >= 0);
    return {
      type: 'numeric',
      prompt: `${ctx.intro(name)}:\n\n**${listText(xs)}**\n\nWhat is the **mode**?`,
      answer: mode,
      ...unitOf(ctx),
      calculator: 'not-allowed',
      hints: ['The mode is the value that appears most often.', 'Count how many times each value appears. Writing the values in order makes this easier.'],
      solution: `In order: ${boldList(sorted, idx)}\n\n${num(mode)} appears ${countOf(xs, mode)} times, more than any other value, so the mode is ${withUnit(mode, ctx.unit)}.`,
    };
  },
};

export const median: QuestionTemplate = {
  id: 'm7.sta.averages.median',
  topicId: 'm7.sta.averages',
  title: 'Find the median (odd or even number of values)',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    const name = rng.pick(NAMES);
    const ctx = rng.pick(NUM_CONTEXTS);
    const u = unitTex(ctx.unit);
    let xs: number[];
    if (difficulty === 1) {
      xs = distinctValues(rng, rng.pick([5, 7]), ctx.lo, ctx.hi);
    } else if (difficulty === 2) {
      xs = randomValues(rng, rng.pick([7, 9, 11]), ctx.lo, ctx.hi);
    } else {
      const n = rng.pick([6, 8, 10]);
      xs = randomValues(rng, n, ctx.lo, ctx.hi);
      for (let i = 0; i < 50; i++) {
        const s = sortAsc(xs);
        if (s[n / 2 - 1] !== s[n / 2]) break;
        xs = randomValues(rng, n, ctx.lo, ctx.hi);
      }
    }
    const n = xs.length;
    const sorted = sortAsc(xs);
    const mid = middleIdx(n);
    const med = medianOf(xs);
    const solutionEnd =
      n % 2
        ? `There are ${n} values, so the median is the ${ordinal(mid[0]! + 1)} value: **${withUnit(med, ctx.unit)}**. There are ${mid[0]} values below it and ${mid[0]} above it.`
        : `There are ${n} values, so there are two middle values: ${num(sorted[mid[0]!]!)} and ${num(sorted[mid[1]!]!)}.\n\nThe median is halfway between them: $(${tex(sorted[mid[0]!]!)} + ${tex(sorted[mid[1]!]!)}) \\div 2 = ${tex(sorted[mid[0]!]! + sorted[mid[1]!]!)} \\div 2 = ${tex(med)}${u}$`;
    return {
      type: 'numeric',
      prompt: `${ctx.intro(name)}:\n\n**${listText(xs)}**\n\nWhat is the **median**?`,
      answer: med,
      ...unitOf(ctx),
      calculator: 'not-allowed',
      hints: [
        'Write the values in order from smallest to largest first.',
        n % 2
          ? `There are ${n} values. Cross off one from each end until you reach the middle.`
          : `There are ${n} values, so there are two middle values. The median is halfway between them.`,
      ],
      solution: `In order: ${boldList(sorted, mid)}\n\n${solutionEnd}`,
    };
  },
};

export const mean: QuestionTemplate = {
  id: 'm7.sta.averages.mean',
  topicId: 'm7.sta.averages',
  title: 'Calculate the mean, or find a missing value from the mean',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    const name = rng.pick(NAMES);
    for (;;) {
      const ctx = rng.pick(NUM_CONTEXTS);
      const u = unitTex(ctx.unit);
      if (difficulty === 4) {
        const n = rng.int(4, 6);
        const m = rng.int(ctx.lo + 2, ctx.hi - 2);
        const xs = valuesWithMean(rng, n, m, ctx.lo, ctx.hi);
        if (!xs) continue;
        const gap = rng.int(0, n - 1);
        const missing = xs[gap]!;
        const known = xs.filter((_, i) => i !== gap);
        const shown = xs.map((x, i) => (i === gap ? '?' : num(x))).join(', ');
        const S = total(known);
        return {
          type: 'numeric',
          prompt: `${ctx.intro(name)}. One value got smudged and can't be read:\n\n**${shown}**\n\nThe mean of all ${n} values is ${withUnit(m, ctx.unit)}. What is the missing value?`,
          answer: missing,
          ...unitOf(ctx),
          marks: 2,
          calculator: 'not-allowed',
          hints: [`If ${n} values have a mean of ${num(m)}, what must they add up to?`, 'Then take away the values you can read.'],
          solution: `The mean is the total divided by ${n}, so the total of all ${n} values is $${n} \\times ${tex(m)} = ${tex(n * m)}$.\n\nThe values you can read add up to $${sumTex(known)} = ${tex(S)}$.\n\nMissing value $= ${tex(n * m)} - ${tex(S)} = ${tex(missing)}${u}$\n\nCheck: $${tex(n * m)} \\div ${n} = ${tex(m)}$ ✓`,
        };
      }
      const half = difficulty === 3 && rng.chance(0.35);
      const n = difficulty === 2 ? rng.int(3, 5) : half ? rng.pick([4, 6]) : rng.int(5, 7);
      const whole = rng.int(ctx.lo + 2, ctx.hi - 3);
      const m = half ? whole + 0.5 : whole;
      const xs = valuesWithMean(rng, n, m, ctx.lo, ctx.hi);
      if (!xs) continue;
      const T = total(xs);
      return {
        type: 'numeric',
        prompt: `${ctx.intro(name)}:\n\n**${listText(xs)}**\n\nWhat is the **mean**?${half ? ' Your answer might be a decimal.' : ''}`,
        answer: meanOf(xs),
        ...unitOf(ctx),
        calculator: 'not-allowed',
        hints: ['Add up all the values.', `Then share the total equally: divide it by how many values there are.`],
        solution: `Total: $${sumTex(xs)} = ${tex(T)}$\n\nThere are ${n} values.\n\nMean $= ${tex(T)} \\div ${n} = ${tex(meanOf(xs))}${u}$`,
      };
    }
  },
};

interface OutlierContext {
  intro: (name: string) => string;
  unit: string;
  /** Typical values sit within ±spread of the mean. */
  centre: [number, number];
  spread: number;
  /** How far above the typical values the outlier is, as a range of "mean increase" k (outlier = m + n·k). */
  k: [number, number];
}

const OUTLIER_CONTEXTS: readonly OutlierContext[] = [
  { intro: (n) => `${n} recorded the ages of the people at a birthday party. Everyone was from the same class except Koro, who came to help`, unit: '', centre: [10, 12], spread: 1, k: [8, 11] },
  { intro: (n) => `${n} recorded how many minutes the school bus was late on some school days. One day a slip closed the road`, unit: 'min', centre: [3, 6], spread: 2, k: [4, 7] },
  { intro: (n) => `${n} counted how many people were in the school library each lunchtime. One day was the book fair`, unit: '', centre: [12, 18], spread: 3, k: [4, 7] },
  { intro: (n) => `${n} recorded how many minutes some students take to get to school. One student lives on a farm a long way out of town`, unit: 'min', centre: [8, 14], spread: 3, k: [5, 8] },
  { intro: (n) => `${n} recorded how many points a basketball player scored in each game. In one game she was on fire`, unit: '', centre: [8, 14], spread: 3, k: [3, 5] },
  { intro: (n) => `${n} counted the shells each student collected on a beach walk. One student found a huge pile of tiny shells`, unit: '', centre: [6, 12], spread: 3, k: [5, 9] },
];

interface TargetContext {
  text: (name: string, n: number, m: number, m2: number) => string;
  unit: string;
  /** Allowed range of the mean so far. */
  mean: [number, number];
  /** Largest sensible value for one trial (e.g. a test out of 20). */
  cap: number;
}

const TARGET_CONTEXTS: readonly TargetContext[] = [
  { text: (name, n, m, m2) => `${name} has played ${n} basketball games this season and has scored a mean of ${m} points per game. How many points does ${name} need to score in the next game to make the mean ${m2} points per game?`, unit: '', mean: [8, 16], cap: 40 },
  { text: (name, n, m, m2) => `${name} has done ${n} spelling tests, each out of 30. The mean score so far is ${m}. What score does ${name} need in the next test to make the mean ${m2}?`, unit: '', mean: [16, 24], cap: 30 },
  { text: (name, n, m, m2) => `${name}'s cricket team has played ${n} games and has scored a mean of ${m} runs per game. How many runs does the team need in the next game to make the mean ${m2}?`, unit: '', mean: [40, 70], cap: 150 },
  { text: (name, n, m, m2) => `${name} has gone on ${n} bush walks at camp, with a mean of ${m} kererū seen on each walk. How many kererū does ${name} need to see on the next walk to make the mean ${m2}?`, unit: '', mean: [3, 8], cap: 25 },
];

export const outliersAndTargets: QuestionTemplate = {
  id: 'm7.sta.averages.outliers-targets',
  topicId: 'm7.sta.averages',
  title: 'How an outlier changes the mean, and working backwards from a mean',
  difficulties: [4, 5],
  generate({ rng, difficulty }) {
    const name = rng.pick(NAMES);
    if (difficulty === 4) {
      for (;;) {
        const c = rng.pick(OUTLIER_CONTEXTS);
        const n = rng.pick([5, 6]);
        const m = rng.int(c.centre[0], c.centre[1]);
        const k = rng.int(c.k[0], c.k[1]);
        const typical = valuesWithMean(rng, n - 1, m, m - c.spread, m + c.spread);
        if (!typical) continue;
        const outlier = m + n * k;
        const xs = rng.shuffle([...typical, outlier]);
        const all = total(xs);
        const u = unitTex(c.unit);
        const units = c.unit ? { units: c.unit } : {};
        if (rng.chance(0.55)) {
          return {
            type: 'numeric',
            prompt: `${c.intro(name)}:\n\n**${listText(xs)}**\n\nWork out the mean with the outlier and the mean without it. How much **bigger** is the mean when the outlier is included?`,
            answer: k,
            ...units,
            marks: 2,
            calculator: 'not-allowed',
            hints: [`The outlier is the value that is much bigger than the others.`, 'Find the mean of all the values, then the mean of the values without the outlier, and subtract.'],
            solution: `The outlier is ${num(outlier)}.\n\nWith the outlier: $${tex(all)} \\div ${n} = ${tex(all / n)}$\n\nWithout it: $${tex(all - outlier)} \\div ${n - 1} = ${tex(m)}$\n\nDifference: $${tex(all / n)} - ${tex(m)} = ${tex(k)}${u}$\n\nOne very large value pulls the mean up a lot.`,
          };
        }
        const med = medianOf(xs);
        const meanAll = all / n;
        return {
          type: 'mcq',
          prompt: `${c.intro(name)}:\n\n**${listText(xs)}**\n\nWhich average best describes a typical value here, and why?`,
          options: [
            { id: 'a', text: `The median (${num(med)}), because the outlier pulls the mean up to ${num(meanAll)}.` },
            { id: 'b', text: `The mean (${num(meanAll)}), because it uses every value, so it is always the best.` },
            { id: 'c', text: `The range (${num(maxOf(xs) - minOf(xs))}), because it includes the outlier.` },
            { id: 'd', text: `The mean (${num(meanAll)}), because the outlier makes it more accurate.` },
          ],
          correct: 'a',
          feedback: {
            b: `The mean does use every value, but that is the problem here: the outlier ${num(outlier)} drags it above almost all of the other values.`,
            c: 'The range measures spread, not centre. It does not tell you what a typical value is.',
            d: `The outlier makes the mean less typical, not more accurate. ${num(meanAll)} is bigger than most of the values.`,
          },
          calculator: 'not-allowed',
          hints: ['Find the mean and the median. Which one is closer to most of the values?', 'An outlier pulls the mean towards it, but it hardly changes the median.'],
          solution: `In order: ${listText(sortAsc(xs))}\n\nMedian $= ${tex(med)}$. Mean $= ${tex(all)} \\div ${n} = ${tex(meanAll)}$.\n\nThe outlier ${num(outlier)} pulls the mean up, so the mean is bigger than most of the values. The median stays in the middle of the typical values, so the **median** is the better average here.`,
        };
      }
    }

    // difficulty 5: work backwards from a mean.
    for (;;) {
      if (rng.chance(0.6)) {
        const c = rng.pick(TARGET_CONTEXTS);
        const n = rng.int(3, 5);
        const m = rng.int(c.mean[0], c.mean[1]);
        const m2 = m + rng.int(1, 3);
        const need = (n + 1) * m2 - n * m;
        if (need > c.cap) continue;
        return {
          type: 'numeric',
          prompt: c.text(name, n, m, m2),
          answer: need,
          marks: 2,
          calculator: 'not-allowed',
          hints: [`What is the total so far after ${n} games or tests?`, `What total is needed after ${n + 1} for a mean of ${m2}?`],
          solution: `Total so far: $${n} \\times ${m} = ${n * m}$\n\nTotal needed after ${n + 1}: $${n + 1} \\times ${m2} = ${(n + 1) * m2}$\n\nNeeded next time: $${(n + 1) * m2} - ${n * m} = ${need}$\n\nCheck: $${(n + 1) * m2} \\div ${n + 1} = ${m2}$ ✓`,
        };
      }
      const n = rng.int(5, 7);
      const m = rng.int(10, 20);
      const m2 = m - rng.int(1, 2);
      const removed = n * m - (n - 1) * m2;
      if (removed > 30) continue;
      return {
        type: 'numeric',
        prompt: `${name} wrote down the scores of ${n} teams in a class quiz. The mean score was ${m}.\n\nThen ${name} noticed that one score had been copied wrongly, so it was crossed out. The mean of the other ${n - 1} scores is ${m2}.\n\nWhat was the score that was crossed out?`,
        answer: removed,
        marks: 2,
        calculator: 'not-allowed',
        hints: [`What was the total of all ${n} scores?`, `What is the total of the ${n - 1} scores that are left?`],
        solution: `Total of all ${n} scores: $${n} \\times ${m} = ${n * m}$\n\nTotal of the other ${n - 1}: $${n - 1} \\times ${m2} = ${(n - 1) * m2}$\n\nThe crossed-out score: $${n * m} - ${(n - 1) * m2} = ${removed}$\n\nCheck: $${(n - 1) * m2} \\div ${n - 1} = ${m2}$ ✓`,
      };
    }
  },
};

interface VarItem {
  variable: string;
  question: string;
  kind: 'categorical' | 'discrete' | 'continuous';
}

const VARIABLES: readonly VarItem[] = [
  { variable: 'the favourite colour of each student', question: 'What is your favourite colour?', kind: 'categorical' },
  { variable: 'the type of pet each family has', question: 'What type of pet do you have?', kind: 'categorical' },
  { variable: 'the way each student gets to school', question: 'How do you usually get to school?', kind: 'categorical' },
  { variable: 'the eye colour of each student', question: 'What colour are your eyes?', kind: 'categorical' },
  { variable: 'the favourite sport of each student', question: 'What is your favourite sport to play?', kind: 'categorical' },
  { variable: 'the country each student was born in', question: 'Which country were you born in?', kind: 'categorical' },
  { variable: 'the ice cream flavour each person chose', question: 'Which ice cream flavour do you like best?', kind: 'categorical' },
  { variable: 'the type of tree growing in each part of the school grounds', question: 'What type of tree is this?', kind: 'categorical' },
  { variable: 'the colour of each car in the school car park', question: 'What colour is the car?', kind: 'categorical' },
  { variable: 'the favourite fruit of each student', question: 'What is your favourite fruit?', kind: 'categorical' },
  { variable: 'the instrument each student in the school band plays', question: 'Which instrument do you play?', kind: 'categorical' },
  { variable: 'the number of siblings each student has', question: 'How many brothers and sisters do you have?', kind: 'discrete' },
  { variable: 'the number of pets each family has', question: 'How many pets do you have?', kind: 'discrete' },
  { variable: 'the number of goals scored in each netball game', question: 'How many goals did your team score?', kind: 'discrete' },
  { variable: 'the number of books each student read this term', question: 'How many books did you read this term?', kind: 'discrete' },
  { variable: 'the number of letters in each student’s first name', question: 'How many letters are in your first name?', kind: 'discrete' },
  { variable: 'the number of people living in each student’s home', question: 'How many people live in your home?', kind: 'discrete' },
  { variable: 'the number of tūī seen in the school garden each day', question: 'How many tūī did you see in the garden today?', kind: 'discrete' },
  { variable: 'the number of times each student went to the beach in the holidays', question: 'How many times did you go to the beach in the holidays?', kind: 'discrete' },
  { variable: 'the number of students on each school bus', question: 'How many students are on this bus?', kind: 'discrete' },
  { variable: 'the number of cousins each student has', question: 'How many cousins do you have?', kind: 'discrete' },
  { variable: 'the height of each student', question: 'How tall are you?', kind: 'continuous' },
  { variable: 'the mass of each student’s school bag', question: 'How heavy is your school bag?', kind: 'continuous' },
  { variable: 'the time each student takes to run 100 m', question: 'How long does it take you to run 100 m?', kind: 'continuous' },
  { variable: 'the arm span of each student', question: 'How long is your arm span?', kind: 'continuous' },
  { variable: 'the temperature at noon each day', question: 'What was the temperature at noon today?', kind: 'continuous' },
  { variable: 'the amount of rain that falls each day', question: 'How much rain fell today?', kind: 'continuous' },
  { variable: 'the length of each pāua shell found on the beach', question: 'How long is this pāua shell?', kind: 'continuous' },
  { variable: 'the distance from each student’s home to school', question: 'How far is it from your home to school?', kind: 'continuous' },
  { variable: 'the time each student spent reading last night', question: 'How long did you spend reading last night?', kind: 'continuous' },
  { variable: 'the mass of each pumpkin grown in the school garden', question: 'How heavy is this pumpkin?', kind: 'continuous' },
];

const KIND_TEXT = { categorical: 'Categorical', discrete: 'Discrete numerical', continuous: 'Continuous numerical' } as const;

const KIND_WHY = {
  categorical: 'The answers are groups or names, not numbers, so the variable is categorical.',
  discrete: 'The answers are numbers you get by counting, so the variable is discrete numerical.',
  continuous: 'The answers are numbers you get by measuring (they could be any value, including decimals), so the variable is continuous numerical.',
} as const;

export const variableType: QuestionTemplate = {
  id: 'm7.sta.averages.variable-type',
  topicId: 'm7.sta.averages',
  title: 'Categorical, discrete or continuous variables',
  difficulties: [1, 2],
  generate({ rng, difficulty }) {
    const item = rng.pick(VARIABLES);
    const name = rng.pick(NAMES);
    const kinds = ['categorical', 'discrete', 'continuous'] as const;
    const ids = { categorical: 'a', discrete: 'b', continuous: 'c' } as const;
    const why = (k: (typeof kinds)[number]): string => {
      if (item.kind === 'categorical') return 'The answers are names or groups, not numbers, so the data is not numerical.';
      if (k === 'categorical') return 'Categorical answers are names or groups, like colours or sports. These answers are numbers.';
      if (k === 'continuous') return 'These answers are counted in whole numbers, so they are discrete. Continuous data is measured.';
      return 'These answers are measured, not counted, so they can be any value (like 1.37 m). That makes them continuous.';
    };
    const prompt =
      difficulty === 1
        ? `What type of variable is **${item.variable}**?`
        : `${name} is planning a class survey and wants to ask each student: "${item.question}"\n\nWhat type of data will ${name} collect?`;
    return {
      type: 'mcq',
      prompt,
      options: kinds.map((k) => ({ id: ids[k], text: KIND_TEXT[k] })),
      correct: ids[item.kind],
      feedback: Object.fromEntries(kinds.filter((k) => k !== item.kind).map((k) => [ids[k], why(k)])),
      calculator: 'not-allowed',
      hints: [
        'Are the answers words (groups) or numbers?',
        'If they are numbers, would you get them by counting or by measuring?',
      ],
      solution: KIND_WHY[item.kind],
    };
  },
};

export const templates: QuestionTemplate[] = [rangeMode, median, mean, outliersAndTargets, variableType];
