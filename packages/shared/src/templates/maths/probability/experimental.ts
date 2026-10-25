import type { Rng } from '../../../rng';
import type { QuestionTemplate } from '../../types';
import { NAMES, clean, frac, gcd, num, round, tex } from '../../format';
import { pTex } from './theoretical';

// m9.pro.experimental — relative frequency, expected numbers, comparing experiment with theory,
// the Law of Large Numbers, and combining results.

const times = (n: number) => (n === 1 ? '1 time' : `${n} times`);

/** "= 0.7" when exact to 2 d.p., otherwise "≈ 0.80" (for KaTeX). */
const approx2 = (x: number) => (Math.abs(round(x, 2) - x) < 1e-9 ? `= ${tex(round(x, 2))}` : `\\approx ${tex(round(x, 2), 2)}`);

interface Experiment {
  intro: (name: string, n: number) => string;
  outcomes: readonly string[];
  /** Rough chance of the first outcome, used to make realistic results. */
  p: [number, number];
  /** What one trial is called, plural. */
  trials: string;
  /** The experiment as a phrase, e.g. "dropping a drawing pin and recording how it lands". */
  activity: string;
}

/** Situations that can only be explored by experiment (no equally likely outcomes). */
const EXPERIMENTS: readonly Experiment[] = [
  { intro: (name, n) => `${name} dropped a drawing pin ${n} times and recorded how it landed.`, outcomes: ['Point up', 'Point down'], p: [0.3, 0.7], trials: 'drops', activity: 'dropping a drawing pin and recording how it lands' },
  { intro: (name, n) => `${name} tossed a paper cup ${n} times and recorded how it landed.`, outcomes: ['On its side', 'Upright', 'Upside down'], p: [0.5, 0.8], trials: 'tosses', activity: 'tossing a paper cup and recording how it lands' },
  { intro: (name, n) => `${name} tried a water-bottle flip ${n} times.`, outcomes: ['Landed upright', 'Fell over'], p: [0.15, 0.45], trials: 'flips', activity: 'flipping a water bottle to see if it lands upright' },
  { intro: (name, n) => `${name} practised ${n} rugby conversion kicks from the same spot.`, outcomes: ['Successful', 'Missed'], p: [0.5, 0.85], trials: 'kicks', activity: 'taking rugby conversion kicks from the same spot' },
  { intro: (name, n) => `${name} tossed a bottle cap ${n} times and recorded how it landed.`, outcomes: ['Top up', 'Top down', 'On its side'], p: [0.3, 0.6], trials: 'tosses', activity: 'tossing a bottle cap and recording how it lands' },
  { intro: (name, n) => `${name} took ${n} netball shots at goal from the same spot.`, outcomes: ['Goal', 'Miss'], p: [0.4, 0.8], trials: 'shots', activity: 'taking netball shots at goal from the same spot' },
];

/** Splits n trials into outcome counts (each at least 1). */
function results(rng: Rng, e: Experiment, n: number): number[] {
  const first = Math.max(1, Math.min(n - e.outcomes.length + 1, Math.round(n * (e.p[0] + rng.next() * (e.p[1] - e.p[0])))));
  if (e.outcomes.length === 2) return [first, n - first];
  const left = n - first;
  const second = rng.int(1, left - 1);
  return [first, second, left - second];
}

function resultsTable(e: Experiment, counts: readonly number[]): string {
  return ['| Outcome | Frequency |', '|---|---|', ...e.outcomes.map((o, i) => `| ${o} | ${counts[i]} |`)].join('\n');
}

export const relativeFrequency: QuestionTemplate = {
  id: 'm9.pro.experimental.relative-frequency',
  topicId: 'm9.pro.experimental',
  title: 'Relative frequency from experimental results, and estimating from it',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    const e = rng.pick(EXPERIMENTS);
    const name = rng.pick(NAMES);
    const asPct = difficulty === 2 && rng.chance(0.5);
    const n =
      difficulty === 1
        ? rng.pick([20, 24, 30, 36, 40, 45, 50, 60])
        : difficulty === 2
          ? rng.pick(asPct ? [20, 25, 50, 100, 200] : [20, 25, 40, 50, 80, 100, 200])
          : rng.pick([20, 25, 30, 40, 50, 60, 80, 100]);
    const counts = results(rng, e, n);
    const k = rng.int(0, e.outcomes.length - 1);
    const c = counts[k]!;
    const o = e.outcomes[k]!;
    const lead = `${e.intro(name, n)}\n\n${resultsTable(e, counts)}`;
    const oq = `"${o}"`;

    if (difficulty === 1) {
      return {
        type: 'numeric',
        prompt: `${lead}\n\nWhat is the relative frequency of ${oq}? Give your answer as a fraction.`,
        answer: c / n,
        calculator: 'not-allowed',
        hints: ['Relative frequency = number of times the outcome happened ÷ total number of trials.', `There were ${n} ${e.trials} altogether.`],
        solution: `${oq} happened ${times(c)} out of ${n}.\n\nRelative frequency $= ${pTex(c, n)}$`,
      };
    }
    if (difficulty === 2) {
      const value = asPct ? clean((100 * c) / n) : clean(c / n);
      return {
        type: 'numeric',
        prompt: `${lead}\n\nWhat is the relative frequency of ${oq}? Give your answer as a ${asPct ? 'percentage' : 'decimal'}.`,
        answer: value,
        ...(asPct && { units: '%' }),
        calculator: 'allowed',
        hints: [`Relative frequency $= \\dfrac{${c}}{${n}}$.`, asPct ? 'Multiply by 100 to change it to a percentage.' : 'Divide to change the fraction to a decimal.'],
        solution: `Relative frequency $= \\dfrac{${c}}{${n}} = ${tex(c / n)}${asPct ? ` = ${tex(value)}\\%` : ''}$`,
      };
    }
    // difficulty 3: use relative frequency to estimate
    const options = [100, 200, 300, 500, 1000, 2 * n, 3 * n, 5 * n, 10 * n].filter((m) => m > n && (m * c) % n === 0);
    const m = rng.pick([...new Set(options)]);
    const est = (m * c) / n;
    return {
      type: 'numeric',
      prompt: `${lead}\n\nUse these results to estimate how many times ${oq} would happen in ${num(m)} ${e.trials}.`,
      answer: est,
      calculator: 'allowed',
      hints: ['First find the relative frequency of the outcome.', `Then multiply it by the new number of trials, ${num(m)}.`],
      solution: [
        `Relative frequency of ${oq} $= ${frac(c, n, true)}$.`,
        `Estimate $= ${frac(c, n, true)} \\times ${tex(m)} = ${tex(est)}$`,
        `So about **${num(est)}** times. This is only an estimate: if the experiment were repeated, the result would vary.`,
      ].join('\n\n'),
    };
  },
};

interface Fair {
  text: string;
  event: string;
  num: number;
  den: number;
  ns: number[];
}

function fairSituation(rng: Rng, forDecimals: boolean): Fair {
  const kind = rng.pick(forDecimals ? (['coin', 'spinner', 'coins'] as const) : (['die', 'die', 'coin', 'spinner', 'coins'] as const));
  if (kind === 'die') {
    const ev = rng.pick([
      { event: 'a 6', num: 1 },
      { event: 'a 3', num: 1 },
      { event: 'an even number', num: 3 },
      { event: 'a number greater than 4', num: 2 },
      { event: 'a multiple of 3', num: 2 },
      { event: 'a 1 or a 2', num: 2 },
    ]);
    return { text: 'A fair six-sided die is rolled', ...ev, den: 6, ns: [60, 120, 180, 240, 300, 600] };
  }
  if (kind === 'coin') {
    const event = rng.pick(['a head', 'a tail']);
    return { text: 'A fair coin is tossed', event, num: 1, den: 2, ns: forDecimals ? [20, 40, 50, 100, 200] : [50, 80, 100, 200, 500] };
  }
  if (kind === 'coins') {
    const ev = rng.pick([
      { event: 'two heads', num: 1 },
      { event: 'two tails', num: 1 },
      { event: 'one head and one tail', num: 2 },
    ]);
    return { text: 'Two fair coins are tossed together', ...ev, den: 4, ns: forDecimals ? [20, 40, 50, 100, 200] : [40, 60, 100, 200, 400] };
  }
  const k = rng.pick(forDecimals ? [4, 5, 10] : [4, 5, 8, 10]);
  const m = rng.int(1, k - 1);
  const colour = rng.pick(['red', 'blue', 'green', 'yellow']);
  return {
    text: `A spinner has ${k} equal sections, and ${m} of them ${m === 1 ? 'is' : 'are'} ${colour}. It is spun`,
    event: colour,
    num: m,
    den: k,
    ns: forDecimals ? [20, 40, 50, 100, 200].filter((x) => x % k === 0) : [40, 80, 100, 200, 400].filter((x) => x % k === 0),
  };
}

export const expectedVsObserved: QuestionTemplate = {
  id: 'm9.pro.experimental.expected-vs-observed',
  topicId: 'm9.pro.experimental',
  title: 'Expected numbers, comparing experiment with theory, and the Law of Large Numbers',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    const name = rng.pick(NAMES);

    if (difficulty === 2) {
      const f = fairSituation(rng, false);
      const N = rng.pick(f.ns);
      const E = (N * f.num) / f.den;
      return {
        type: 'numeric',
        prompt: `${f.text} ${num(N)} times. How many times would you expect to get ${f.event}?`,
        answer: E,
        calculator: 'allowed',
        hints: [`First find the theoretical probability of getting ${f.event}.`, `Expected number = probability × number of trials (${num(N)}).`],
        solution: `$P(\\text{${f.event}}) = ${pTex(f.num, f.den)}$\n\nExpected number $= ${frac(f.num, f.den)} \\times ${tex(N)} = ${tex(E)}$`,
      };
    }

    if (difficulty === 3) {
      if (rng.chance(0.5)) {
        const f = fairSituation(rng, false);
        const N = rng.pick(f.ns);
        const E = (N * f.num) / f.den;
        let O = E + rng.pick([-1, 1]) * rng.int(2, Math.max(3, Math.round(E * 0.2)));
        if (O < 0 || O > N) O = E + 2;
        const more = O > E;
        return {
          type: 'numeric',
          prompt: `${f.text} ${num(N)} times. ${name} got ${f.event} ${num(O)} times.\n\nHow many ${more ? 'more' : 'fewer'} times is this than the number you would expect from the theoretical probability?`,
          answer: Math.abs(O - E),
          calculator: 'allowed',
          hints: ['Work out the expected number: theoretical probability × number of trials.', `Then find the difference between ${num(O)} and the expected number.`],
          solution: [
            `Expected number $= ${frac(f.num, f.den)} \\times ${tex(N)} = ${tex(E)}$`,
            `Difference $= ${tex(Math.max(O, E))} - ${tex(Math.min(O, E))} = ${tex(Math.abs(O - E))}$`,
            `Results from an experiment almost never match the expected number exactly. Chance causes variation, and a difference like this is normal.`,
          ].join('\n\n'),
        };
      }
      const f = fairSituation(rng, true);
      const N = rng.pick(f.ns);
      const E = (N * f.num) / f.den;
      let O = E + rng.pick([-1, 1]) * rng.int(1, Math.max(2, Math.round(E * 0.25)));
      if (O < 0 || O > N) O = E + 1;
      const rf = clean(O / N);
      const tp = clean(f.num / f.den);
      const diff = clean(Math.abs(rf - tp));
      return {
        type: 'numeric',
        prompt: `${f.text} ${num(N)} times, and ${name} gets ${f.event} ${num(O)} times.\n\nWork out the experimental probability (relative frequency) and the theoretical probability as decimals. What is the difference between them?`,
        answer: diff,
        calculator: 'allowed',
        hints: [`Experimental probability $= \\dfrac{${O}}{${N}}$.`, `Theoretical probability $= ${frac(f.num, f.den)}$. Change both to decimals and subtract.`],
        solution: [
          `Experimental probability $= \\dfrac{${O}}{${N}} = ${tex(rf)}$`,
          `Theoretical probability $= ${frac(f.num, f.den)} = ${tex(tp)}$`,
          `Difference $= ${tex(Math.max(rf, tp))} - ${tex(Math.min(rf, tp))} = ${tex(diff)}$`,
          'The more trials you do, the closer the experimental probability is likely to get to the theoretical probability (the Law of Large Numbers).',
        ].join('\n\n'),
      };
    }

    // difficulty 4: which estimate is more reliable, or combine two sets of results
    const e = rng.pick(EXPERIMENTS);
    const [A, B] = rng.sample(NAMES, 2) as [string, string];
    const nA = rng.pick([10, 12, 15, 20]);
    const nB = rng.pick([150, 200, 250, 300]);
    const cA = results(rng, e, nA)[0]!;
    const cB = results(rng, e, nB)[0]!;
    const o = e.outcomes[0]!;
    const setup = `${A} and ${B} each did the same experiment: ${e.activity}. They are interested in the outcome "${o}".\n\n- ${A} did ${nA} ${e.trials} and got "${o}" ${times(cA)}.\n- ${B} did ${nB} ${e.trials} and got "${o}" ${times(cB)}.`;
    if (rng.chance(0.5)) {
      return {
        type: 'mcq',
        prompt: `${setup}\n\nWhose results give the more reliable estimate of the probability of "${o}"?`,
        options: [
          { id: 'b', text: `${B}'s, because ${B} did many more trials.` },
          { id: 'a', text: `${A}'s, because doing fewer trials means fewer mistakes.` },
          { id: 'same', text: 'Both are equally reliable, because they did the same experiment.' },
          { id: 'none', text: "Neither, because experiments can't be used to estimate probability." },
        ],
        correct: 'b',
        feedback: {
          a: 'Small numbers of trials vary a lot from one set to the next, so they give less reliable estimates.',
          same: 'Same experiment, but not the same number of trials. More trials usually give a better estimate.',
          none: `For something like this there are no equally likely outcomes, so an experiment is the only way to estimate the probability.`,
        },
        shuffle: true,
        calculator: 'allowed',
        hints: ['Think about the Law of Large Numbers.', 'Which estimate is likely to change least if the experiment were repeated?'],
        solution: [
          `${A}'s relative frequency is $${frac(cA, nA, true)} ${approx2(cA / nA)}$ and ${B}'s is $${frac(cB, nB, true)} ${approx2(cB / nB)}$.`,
          `${B}'s estimate is more reliable. By the **Law of Large Numbers**, the more trials you do, the closer the relative frequency is likely to be to the true probability. With only ${nA} trials, chance can easily push the result a long way off.`,
        ].join('\n\n'),
      };
    }
    const tot = cA + cB;
    const nTot = nA + nB;
    const ans = round(tot / nTot, 2);
    return {
      type: 'numeric',
      prompt: `${setup}\n\nThey combine their results. What is the relative frequency of "${o}" for the combined results? Give your answer as a decimal to 2 decimal places.`,
      answer: ans,
      decimals: 2,
      calculator: 'allowed',
      hints: ['Add the number of times the outcome happened, and add the numbers of trials.', 'Combined relative frequency = total times ÷ total trials. Don\'t just average the two relative frequencies.'],
      solution: [
        `Total "${o}": $${cA} + ${cB} = ${tot}$. Total trials: $${nA} + ${nB} = ${nTot}$.`,
        `Relative frequency $= \\dfrac{${tot}}{${nTot}} ${approx2(tot / nTot)}$`,
        `Averaging ${A}'s and ${B}'s relative frequencies would be wrong, because ${B} did far more trials.`,
      ].join('\n\n'),
    };
  },
};

export const pooledEstimates: QuestionTemplate = {
  id: 'm9.pro.experimental.estimates',
  topicId: 'm9.pro.experimental',
  title: 'Pooling class results and estimating from relative frequency',
  difficulties: [4, 5],
  generate({ rng, difficulty }) {
    const name = rng.pick(NAMES);
    if (difficulty === 4 || rng.chance(0.4)) {
      const e = rng.pick(EXPERIMENTS);
      const groups = rng.int(4, 6);
      const each = rng.pick(difficulty === 5 ? [20, 25, 40, 50] : [20, 25, 30, 40]);
      const N = groups * each;
      const counts = Array.from({ length: groups }, () => results(rng, e, each)[0]!);
      const tot = counts.reduce((a, b) => a + b, 0);
      const o = e.outcomes[0]!;
      const table = ['| Group | Trials | "' + o + '" |', '|---|---|---|', ...counts.map((c, i) => `| ${i + 1} | ${each} | ${c} |`)].join('\n');
      const lead = `A class investigated ${e.activity}. Each of ${groups} groups did ${each} ${e.trials}. The table shows how many times each group got "${o}".\n\n${table}`;
      if (difficulty === 4) {
        const ans = round(tot / N, 2);
        return {
          type: 'numeric',
          prompt: `${lead}\n\nCombine all the results to estimate the probability of "${o}". Give your answer as a decimal to 2 decimal places.`,
          answer: ans,
          decimals: 2,
          calculator: 'allowed',
          hints: ['Add up all the "' + o + '" results, and the total number of trials.', 'Estimate = total times ÷ total trials.'],
          solution: [
            `Total "${o}": $${counts.join(' + ')} = ${tot}$`,
            `Total trials: $${groups} \\times ${each} = ${N}$`,
            `Estimate $= \\dfrac{${tot}}{${N}} ${approx2(tot / N)}$`,
            `The combined estimate uses ${N} trials, so it is more reliable than any one group's estimate (each based on only ${each} trials).`,
          ].join('\n\n'),
        };
      }
      // difficulty 5: pooled estimate scaled up
      const M = [1000, 2000, 5000].find((m) => (m * tot) % N === 0) ?? 0;
      if (M) {
        const est = (M * tot) / N;
        return {
          type: 'numeric',
          marks: 2,
          prompt: `${lead}\n\nUse the combined results to estimate how many times "${o}" would happen in ${num(M)} ${e.trials}.`,
          answer: est,
          calculator: 'allowed',
          hints: ['First combine the results: total "' + o + '" ÷ total trials.', `Then multiply by ${num(M)}.`],
          solution: [
            `Total "${o}": $${counts.join(' + ')} = ${tot}$ out of $${groups} \\times ${each} = ${N}$ trials.`,
            `Estimate $= \\dfrac{${tot}}{${N}} \\times ${tex(M)} = ${tex(est)}$`,
          ].join('\n\n'),
        };
      }
    }
    // difficulty 5: estimate how many counters of a colour are in a bag
    for (;;) {
      const [N, T] = rng.pick([
        [10, 50],
        [10, 100],
        [20, 100],
        [20, 200],
        [25, 100],
        [40, 200],
        [50, 200],
      ] as const);
      const colour = rng.pick(['red', 'blue', 'green', 'yellow']);
      const R = rng.int(2, N - 2);
      const c = (R * T) / N + rng.int(-1, 1);
      const raw = (N * c) / T;
      if (Math.abs(raw - Math.floor(raw) - 0.5) < 1e-9) continue;
      const est = Math.round(raw);
      return {
        type: 'numeric',
        marks: 2,
        prompt: `A bag contains ${N} counters. Some are ${colour}. ${name} takes a counter at random, records its colour and puts it back, ${num(T)} times. A ${colour} counter came out ${c} times.\n\nEstimate the number of ${colour} counters in the bag. Give your answer to the nearest whole number.`,
        answer: est,
        calculator: 'allowed',
        hints: [`The relative frequency of ${colour} is ${c} out of ${T}.`, `About that fraction of the ${N} counters should be ${colour}.`],
        solution: [
          `Relative frequency of ${colour} $= \\dfrac{${c}}{${T}}${gcd(c, T) > 1 ? ` = ${frac(c, T)}` : ''}$`,
          `Estimated number of ${colour} counters $= \\dfrac{${c}}{${T}} \\times ${N} = ${tex(raw)} \\approx ${est}$`,
          'This is only an estimate. The real number could be a little different, because the results of an experiment vary.',
        ].join('\n\n'),
      };
    }
  },
};

export const experimentalTemplates: QuestionTemplate[] = [relativeFrequency, expectedVsObserved, pooledEstimates];
