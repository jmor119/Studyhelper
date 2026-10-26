import type { Rng } from '../../../../rng';
import type { QuestionTemplate } from '../../../types';
import { NAMES, frac, num } from '../../../format';
import { COLOURS, COLOUR_FILL, pTex, spinner } from './theoretical-helpers';

// m7.pro.experimental — relative frequency (experimental probability), expected numbers,
// comparing experiment with theory, the Law of Large Numbers, and weighted dice.

const ALPHA = 'abcdefgh';

interface Outcome {
  /** Label for tables, e.g. "Point up". */
  label: string;
  /** "the pin lands point up" */
  phrase: string;
}

interface Experiment {
  /** "Aroha dropped a drawing pin 40 times" (n can be "many"). */
  did: (name: string, n: number | string) => string;
  outcomes: readonly Outcome[];
  /** Rough chance of the first outcome, used to make realistic results. */
  p: [number, number];
  /** Plural noun for one trial. */
  trials: string;
}

/** Situations that can only be explored by experiment (the outcomes are not equally likely). */
const EXPERIMENTS: readonly Experiment[] = [
  { did: (n, k) => `${n} dropped a drawing pin ${k} times and recorded how it landed`, outcomes: [{ label: 'Point up', phrase: 'the pin lands point up' }, { label: 'Point down', phrase: 'the pin lands point down' }], p: [0.3, 0.7], trials: 'drops' },
  { did: (n, k) => `${n} tossed a paper cup ${k} times and recorded how it landed`, outcomes: [{ label: 'On its side', phrase: 'the cup lands on its side' }, { label: 'Upright', phrase: 'the cup lands upright' }, { label: 'Upside down', phrase: 'the cup lands upside down' }], p: [0.5, 0.75], trials: 'tosses' },
  { did: (n, k) => `${n} tried ${k} water-bottle flips`, outcomes: [{ label: 'Lands upright', phrase: 'the bottle lands upright' }, { label: 'Falls over', phrase: 'the bottle falls over' }], p: [0.15, 0.4], trials: 'flips' },
  { did: (n, k) => `${n} took ${k} netball shots at goal from the same spot`, outcomes: [{ label: 'Goal', phrase: 'a shot is a goal' }, { label: 'Miss', phrase: 'a shot misses' }], p: [0.4, 0.8], trials: 'shots' },
  { did: (n, k) => `${n} tossed a jandal ${k} times and recorded how it landed`, outcomes: [{ label: 'Sole down', phrase: 'the jandal lands sole down' }, { label: 'Sole up', phrase: 'the jandal lands sole up' }, { label: 'On its side', phrase: 'the jandal lands on its side' }], p: [0.4, 0.65], trials: 'tosses' },
  { did: (n, k) => `${n} tossed a bottle cap ${k} times and recorded how it landed`, outcomes: [{ label: 'Top up', phrase: 'the cap lands top up' }, { label: 'Top down', phrase: 'the cap lands top down' }, { label: 'On its side', phrase: 'the cap lands on its side' }], p: [0.3, 0.55], trials: 'tosses' },
  { did: (n, k) => `${n} took ${k} shots at the basketball hoop from the free-throw line`, outcomes: [{ label: 'In', phrase: 'a shot goes in' }, { label: 'Miss', phrase: 'a shot misses' }], p: [0.3, 0.7], trials: 'shots' },
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
  return ['| Outcome | Frequency |', '|---|---|', ...e.outcomes.map((o, i) => `| ${o.label} | ${counts[i]} |`)].join('\n');
}

/** "= 0.35 = 35%" style conversion for a count out of n, where n divides 100. */
function hundredths(k: number, n: number): string {
  return `${frac(k, n, true)} = ${frac((k * 100) / n, 100, true)}`;
}

const times = (k: number) => (k === 1 ? 'once' : `${k} times`);

// ---------------- Relative frequency ----------------

export const relativeFrequency: QuestionTemplate = {
  id: 'm7.pro.experimental.relative-frequency',
  topicId: 'm7.pro.experimental',
  title: 'Experimental probability (relative frequency) from results',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    const e = rng.pick(EXPERIMENTS);
    const name = rng.pick(NAMES);

    if (difficulty === 1) {
      const n = rng.pick([20, 25, 30, 40, 50]);
      const counts = results(rng, e, n);
      const i = rng.int(0, e.outcomes.length - 1);
      const o = e.outcomes[i]!;
      return {
        type: 'numeric',
        prompt: `${e.did(name, n)}. The result was **${o.label}** ${times(counts[i]!)}.\n\nWhat is the experimental probability that ${o.phrase}? Give your answer as a fraction.`,
        answer: counts[i]! / n,
        form: 'any',
        calculator: 'not-allowed',
        hints: ['Experimental probability = number of times it happened ÷ total number of trials.', `How many ${e.trials} were there altogether?`],
        solution: `It happened ${times(counts[i]!)} out of ${n} ${e.trials}.\n\nExperimental probability $= ${pTex(counts[i]!, n)}$`,
      };
    }

    const n = difficulty === 2 ? rng.pick([20, 25, 50, 100]) : rng.pick([20, 25, 50]);
    const counts = results(rng, e, n);
    const table = resultsTable(e, counts);
    const intro = `${e.did(name, 'many')}. The table shows the results.\n\n${table}`;

    if (difficulty === 2) {
      const i = rng.int(0, e.outcomes.length - 1);
      const o = e.outcomes[i]!;
      const asPct = rng.chance(0.5);
      const pct = (counts[i]! * 100) / n;
      return {
        type: 'numeric',
        prompt: `${intro}\n\nWhat is the experimental probability that ${o.phrase}? Give your answer as ${asPct ? 'a percentage' : 'a decimal'}.`,
        answer: asPct ? pct : pct / 100,
        ...(asPct ? { units: '%' } : { form: 'decimal' as const }),
        calculator: 'not-allowed',
        hints: ['First add up the frequencies to find the total number of trials.', 'Write the probability as a fraction, then make an equivalent fraction out of 100.'],
        solution: `Total trials: $${counts.join(' + ')} = ${n}$\n\n${o.label}: ${counts[i]} out of ${n}.\n\n$${hundredths(counts[i]!, n)} = ${asPct ? `${pct}\\%` : num(pct / 100)}$`,
      };
    }

    // difficulty 3: "not" or "or", from the table.
    const three = e.outcomes.length === 3;
    const i = rng.int(0, e.outcomes.length - 1);
    const o = e.outcomes[i]!;
    const useOr = three && rng.chance(0.5);
    const j = useOr ? [0, 1, 2].filter((x) => x !== i)[rng.int(0, 1)]! : -1;
    const fav = useOr ? counts[i]! + counts[j]! : n - counts[i]!;
    const what = useOr ? `the result is "${o.label}" **or** "${e.outcomes[j]!.label}"` : `the result is **not** "${o.label}"`;
    const asPct = rng.chance(0.6);
    const pct = (fav * 100) / n;
    return {
      type: 'numeric',
      prompt: `${intro}\n\nBased on these results, estimate the probability that ${what}. Give your answer as ${asPct ? 'a percentage' : 'a fraction in simplest form'}.`,
      answer: asPct ? pct : fav / n,
      ...(asPct ? { units: '%' } : { form: 'simplest-fraction' as const }),
      calculator: 'not-allowed',
      hints: ['Add up all the frequencies to find the total number of trials.', useOr ? 'Add the frequencies of the two results you want.' : `Count every trial that was not ${o.label}.`],
      solution: `Total trials: $${counts.join(' + ')} = ${n}$\n\n${useOr ? `${o.label} or ${e.outcomes[j]!.label}: $${counts[i]} + ${counts[j]} = ${fav}$` : `Not ${o.label}: $${n} - ${counts[i]} = ${fav}$`}\n\n$P \\approx ${asPct ? `${hundredths(fav, n)} = ${pct}\\%` : pTex(fav, n)}$`,
    };
  },
};

// ---------------- Expected numbers ----------------

export const expected: QuestionTemplate = {
  id: 'm7.pro.experimental.expected',
  topicId: 'm7.pro.experimental',
  title: 'Expected numbers from theoretical or experimental probability',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    const name = rng.pick(NAMES);

    if (difficulty === 2) {
      const kind = rng.pick(['coin', 'die', 'spinner'] as const);
      if (kind === 'coin') {
        const N = rng.pick([20, 30, 40, 50, 60, 80, 100, 200]);
        const side = rng.pick(['heads', 'tails']);
        return {
          type: 'numeric',
          prompt: `${name} tosses a fair coin ${N} times. About how many times would you expect it to land on **${side}**?`,
          answer: N / 2,
          form: 'integer',
          calculator: 'not-allowed',
          hints: [`What is the theoretical probability of ${side}?`, 'Expected number = probability × number of trials.'],
          solution: `$P(\\text{${side}}) = \\frac{1}{2}$\n\nExpected number $= \\frac{1}{2} \\times ${N} = ${N / 2}$\n\nThe real result will probably be close to ${N / 2}, but not exactly ${N / 2} every time.`,
        };
      }
      if (kind === 'die') {
        const N = rng.pick([30, 60, 90, 120, 180, 300]);
        const ev = rng.pick([
          { name: `a ${rng.int(1, 6)}`, k: 1 },
          { name: 'an even number', k: 3 },
          { name: 'a number greater than 4', k: 2 },
          { name: 'a 1 or a 2', k: 2 },
        ]);
        return {
          type: 'numeric',
          prompt: `${name} rolls a fair six-sided die ${N} times. About how many times would you expect to roll **${ev.name}**?`,
          answer: (N * ev.k) / 6,
          form: 'integer',
          calculator: 'not-allowed',
          hints: [`What is the theoretical probability of rolling ${ev.name}?`, 'Expected number = probability × number of trials.'],
          solution: `$P = ${pTex(ev.k, 6)}$\n\nExpected number $= ${frac(ev.k, 6)} \\times ${N} = ${(N * ev.k) / 6}$`,
        };
      }
      const k = rng.pick([4, 5, 8]);
      const target = rng.pick(COLOURS.slice(0, 4));
      const others = COLOURS.slice(0, 4).filter((c) => c !== target);
      const m = rng.int(1, k - 1);
      const sectors = rng.shuffle([...Array.from({ length: m }, () => target), ...Array.from({ length: k - m }, () => rng.pick(others))]);
      const N = k * rng.int(5, 25);
      return {
        type: 'numeric',
        prompt: `${name} spins this spinner ${N} times. All the sections are the same size. About how many times would you expect it to land on **${target}**?`,
        figure: {
          svg: spinner(sectors.map((s) => ({ label: s, fill: COLOUR_FILL[s]! }))),
          alt: `A spinner with ${k} equal sections. ${m} of them are ${target}.`,
        },
        answer: (N * m) / k,
        form: 'integer',
        calculator: 'not-allowed',
        hints: [`What fraction of the spinner is ${target}?`, 'Expected number = probability × number of spins.'],
        solution: `$P(\\text{${target}}) = ${pTex(m, k)}$\n\nExpected number $= ${frac(m, k)} \\times ${N} = ${(N * m) / k}$`,
      };
    }

    if (difficulty === 3) {
      for (;;) {
        const e = rng.pick(EXPERIMENTS);
        const n = rng.pick([20, 25, 40, 50, 100]);
        const counts = results(rng, e, n);
        const mult = rng.pick([2, 3, 4, 5, 10]);
        const N = n * mult;
        if (N > 500) continue;
        const i = rng.int(0, e.outcomes.length - 1);
        const o = e.outcomes[i]!;
        const ans = counts[i]! * mult;
        return {
          type: 'numeric',
          prompt: `${e.did(name, n)}. The result was **${o.label}** ${times(counts[i]!)}.\n\nIf ${name} did the same thing ${N} times, about how many times would you expect the result to be ${o.label}?`,
          answer: ans,
          form: 'integer',
          calculator: 'not-allowed',
          hints: [`What is the experimental probability of ${o.label} from the first ${n} ${e.trials}?`, `${N} is how many times as many as ${n}?`],
          solution: `Experimental probability of ${o.label}: $${frac(counts[i]!, n, true)}$\n\n${N} ${e.trials} is ${mult} times as many as ${n}, so expect about $${counts[i]} \\times ${mult} = ${ans}$.\n\n(Or: $${frac(counts[i]!, n, true)} \\times ${N} = ${ans}$.)`,
        };
      }
    }

    // difficulty 4: compare a result with the expected number.
    for (;;) {
      const fairDie = rng.chance(0.5);
      const N = fairDie ? rng.pick([60, 120]) : rng.pick([40, 80, 100]);
      const E = fairDie ? N / 6 : N / 4;
      const actual = E + rng.int(-Math.round(E / 2.5), Math.round(E / 2.5));
      if (actual === E || actual <= 0) continue;
      const face = fairDie ? `a ${rng.int(1, 6)}` : rng.pick(COLOURS.slice(0, 4));
      const more = actual > E;
      const setup = fairDie
        ? `${name} rolled a fair six-sided die ${N} times. ${face[0]!.toUpperCase()}${face.slice(1)} came up ${actual} times.`
        : `${name} spun a spinner with four equal sections (red, blue, green and yellow) ${N} times. It landed on ${face} ${actual} times.`;
      return {
        type: 'numeric',
        prompt: `${setup}\n\nHow many ${more ? 'more' : 'fewer'} times is that than you would expect from the theoretical probability?`,
        answer: Math.abs(actual - E),
        form: 'integer',
        marks: 2,
        calculator: 'not-allowed',
        hints: [`What is the theoretical probability of ${face}?`, `Expected number = probability × ${N}. Then compare it with ${actual}.`],
        solution: `Theoretical probability: $${fairDie ? frac(1, 6) : frac(1, 4)}$\n\nExpected number: $${fairDie ? frac(1, 6) : frac(1, 4)} \\times ${N} = ${E}$\n\nDifference: $${Math.max(actual, E)} - ${Math.min(actual, E)} = ${Math.abs(actual - E)}$ ${more ? 'more' : 'fewer'}.\n\nResults usually differ a little from the expected number. That is normal: each trial is random.`,
      };
    }
  },
};

// ---------------- Comparing experiment with theory ----------------

export const compareTheory: QuestionTemplate = {
  id: 'm7.pro.experimental.compare-theory',
  topicId: 'm7.pro.experimental',
  title: 'Compare experimental results with theoretical probability',
  difficulties: [3, 4],
  generate({ rng, difficulty }) {
    const name = rng.pick(NAMES);

    if (difficulty === 3) {
      const cols = ['red', 'blue', 'green', 'yellow'];
      for (;;) {
        const N = rng.pick([40, 60, 80, 100]);
        const E = N / 4;
        const counts = cols.map(() => E + rng.int(-Math.round(E / 2), Math.round(E / 2)));
        const diff = N - counts.reduce((s, c) => s + c, 0);
        counts[3] = counts[3]! + diff;
        if (counts[3]! <= 0) continue;
        const devs = counts.map((c) => Math.abs(c - E));
        const top = Math.max(...devs);
        if (devs.filter((d) => d === top).length !== 1 || top < 3) continue;
        const bi = devs.indexOf(top);
        return {
          type: 'mcq',
          prompt: `${name} spun a spinner with four equal sections ${N} times. The table shows the results.\n\n| Colour | Red | Blue | Green | Yellow |\n|---|---|---|---|---|\n| Frequency | ${counts.join(' | ')} |\n\nWhich colour's result is **furthest** from what you would expect from the theoretical probability?`,
          options: cols.map((c, i) => ({ id: ALPHA[i]!, text: c[0]!.toUpperCase() + c.slice(1) })),
          correct: ALPHA[bi]!,
          feedback: Object.fromEntries(
            cols.map((c, i) => [ALPHA[i]!, `${c[0]!.toUpperCase() + c.slice(1)} came up ${counts[i]} times, which is ${devs[i]} away from the expected ${E}.`]).filter((_, i) => i !== bi),
          ),
          calculator: 'not-allowed',
          hints: ['Each colour has a theoretical probability of $\\frac{1}{4}$.', `Work out the expected number for each colour, then see how far each result is from it.`],
          solution: `Expected number for each colour: $\\frac{1}{4} \\times ${N} = ${E}$\n\n${cols.map((c, i) => `- ${c[0]!.toUpperCase() + c.slice(1)}: ${counts[i]} (${devs[i]} away)`).join('\n')}\n\n**${cols[bi]![0]!.toUpperCase() + cols[bi]!.slice(1)}** is furthest from ${E}. Even with a fair spinner, results vary. With more spins, the results would probably get closer to the theory.`,
        };
      }
    }

    // difficulty 4: is the die fair?
    for (;;) {
      const N = rng.pick([60, 120]);
      const E = N / 6;
      const weighted = rng.chance(0.6);
      const counts = [1, 2, 3, 4, 5, 6].map(() => E + rng.int(-Math.round(E / 4), Math.round(E / 4)));
      const wf = rng.int(0, 5);
      if (weighted) counts[wf] = Math.round(E * (2 + rng.next() * 0.6));
      // Rebalance the other faces so the total is N.
      let diff = N - counts.reduce((s, c) => s + c, 0);
      const others = [0, 1, 2, 3, 4, 5].filter((i) => !weighted || i !== wf);
      let guard = 0;
      while (diff !== 0 && guard++ < 200) {
        const i = rng.pick(others);
        const step = diff > 0 ? 1 : -1;
        if (counts[i]! + step < 2) continue;
        counts[i] = counts[i]! + step;
        diff -= step;
      }
      if (diff !== 0) continue;
      const table = `| Number | 1 | 2 | 3 | 4 | 5 | 6 |\n|---|---|---|---|---|---|---|\n| Frequency | ${counts.join(' | ')} |`;
      const intro = `${name} thinks a die might be **weighted** (more likely to land on some numbers than others). ${name} rolls it ${N} times.\n\n${table}\n\nWhat is the best conclusion?`;
      if (weighted) {
        const small = others.map((i) => ({ i, d: Math.abs(counts[i]! - E) })).filter((x) => x.d >= 1 && x.d <= E / 4 + 1);
        if (!small.length) continue;
        const s = rng.pick(small);
        return {
          type: 'mcq',
          prompt: intro,
          options: [
            { id: 'a', text: `It is probably weighted: ${wf + 1} came up ${counts[wf]} times, far more than the ${E} you would expect.` },
            { id: 'b', text: 'It must be fair, because every number came up at least once.' },
            { id: 'c', text: `It is probably weighted, because ${s.i + 1} came up ${counts[s.i]} times instead of ${E}.` },
            { id: 'd', text: 'You can’t learn anything about a die by rolling it.' },
          ],
          correct: 'a',
          feedback: {
            b: 'A weighted die can still land on every number. What matters is how often each number comes up.',
            c: `${counts[s.i]} is close to ${E}. Small differences like this happen with a fair die too.`,
            d: 'An experiment is the only way to find out about a weighted die. Lots of trials give good evidence.',
          },
          marks: 2,
          calculator: 'not-allowed',
          hints: [`If the die were fair, about how many times would each number come up in ${N} rolls?`, 'Small differences are normal. Look for a result that is much too big.'],
          solution: `For a fair die, each number would come up about $\\frac{1}{6} \\times ${N} = ${E}$ times.\n\nMost results are close to ${E}, but ${wf + 1} came up ${counts[wf]} times: far more than expected. That is strong evidence the die is **weighted** towards ${wf + 1}. To be more sure, ${name} could roll it many more times.`,
        };
      }
      const hi = counts.indexOf(Math.max(...counts));
      const lo = counts.indexOf(Math.min(...counts));
      if (hi === lo || counts[hi] === E) continue;
      return {
        type: 'mcq',
        prompt: intro,
        options: [
          { id: 'a', text: `It could well be fair: all the results are fairly close to the ${E} you would expect.` },
          { id: 'b', text: `It must be weighted, because the results are not all exactly ${E}.` },
          { id: 'c', text: `It is weighted towards ${hi + 1}, because ${hi + 1} came up most often.` },
          { id: 'd', text: `It is weighted against ${lo + 1}, because ${lo + 1} came up least often.` },
        ],
        correct: 'a',
        feedback: {
          b: 'Even a fair die almost never gives exactly the expected number for every face. Results always vary a little.',
          c: `${counts[hi]} is not far from ${E}. One number has to come up most often, even with a fair die.`,
          d: `${counts[lo]} is not far from ${E}. One number has to come up least often, even with a fair die.`,
        },
        marks: 2,
        calculator: 'not-allowed',
        hints: [`If the die were fair, about how many times would each number come up in ${N} rolls?`, 'Small differences are normal. Is any result much too big or much too small?'],
        solution: `For a fair die, each number would come up about $\\frac{1}{6} \\times ${N} = ${E}$ times.\n\nThe results go from ${Math.min(...counts)} to ${Math.max(...counts)}. These are all fairly close to ${E}, and small differences are normal for a fair die. So the die **could well be fair**. Rolling it many more times would give stronger evidence either way.`,
      };
    }
  },
};

// ---------------- Law of Large Numbers ----------------

interface LlnSetup {
  what: string;
  outcome: string;
  /** Theoretical probability as [numerator, denominator]. */
  p: [number, number];
  /** Trial counts for four groups; the first is the small "lucky" one. */
  trials: [number, number, number, number];
}

const LLN: readonly LlnSetup[] = [
  { what: 'tossed a fair coin', outcome: 'heads', p: [1, 2], trials: [10, 30, 50, 400] },
  { what: 'tossed a fair coin', outcome: 'tails', p: [1, 2], trials: [8, 20, 60, 300] },
  { what: 'rolled a fair die', outcome: 'a six', p: [1, 6], trials: [6, 30, 60, 600] },
  { what: 'rolled a fair die', outcome: 'a one', p: [1, 6], trials: [12, 24, 48, 480] },
  { what: 'spun a spinner with four equal sections', outcome: 'red', p: [1, 4], trials: [8, 20, 40, 400] },
];

export const largeNumbers: QuestionTemplate = {
  id: 'm7.pro.experimental.large-numbers',
  topicId: 'm7.pro.experimental',
  title: 'The Law of Large Numbers, combining results, and estimating from many trials',
  difficulties: [4, 5],
  generate({ rng, difficulty }) {
    if (difficulty === 4) {
      const s = rng.pick(LLN);
      const names = rng.sample(NAMES, 4);
      const [pn, pd] = s.p;
      const counts = s.trials.map((t, i) => {
        if (i === 0) return (t * pn) / pd; // exactly the theory, by luck
        const e = (t * pn) / pd;
        let c = e;
        while (c === e) c = Math.round(e + (rng.next() - 0.5) * Math.max(3, t * 0.12));
        return Math.max(0, Math.min(t, c));
      });
      const order = rng.shuffle([0, 1, 2, 3]);
      const rows = order.map((i) => `| ${names[i]} | ${s.trials[i]} | ${counts[i]} |`);
      const big = 3;
      return {
        type: 'mcq',
        prompt: `Four students each ${s.what} and recorded how many times they got ${s.outcome}.\n\n| Student | Number of trials | Times they got ${s.outcome} |\n|---|---|---|\n${rows.join('\n')}\n\nWhose results give the **most reliable** estimate of the probability of ${s.outcome}?`,
        options: order.map((i) => ({ id: ALPHA[i]!, text: names[i]! })),
        correct: ALPHA[big]!,
        feedback: Object.fromEntries(
          [0, 1, 2].map((i) => [
            ALPHA[i]!,
            i === 0
              ? `${names[0]}'s result is exactly $${frac(pn, pd)}$, but with only ${s.trials[0]} trials that could easily be luck. A few more trials could change it a lot.`
              : `${names[i]} did only ${s.trials[i]} trials. More trials give a more reliable estimate.`,
          ]),
        ),
        calculator: 'not-allowed',
        hints: ['Which student did the most trials?', 'The Law of Large Numbers: the more trials, the closer the experimental probability tends to get to the theoretical probability.'],
        solution: `**${names[big]}** did the most trials (${s.trials[big]}).\n\nThe **Law of Large Numbers** says that as the number of trials increases, the experimental probability gets closer to the theoretical probability. So the estimate from ${s.trials[big]} trials is the most reliable, even though ${names[0]}'s small experiment happened to give exactly $${frac(pn, pd)}$.`,
      };
    }

    // difficulty 5
    const name = rng.pick(NAMES);
    if (rng.chance(0.5)) {
      const groups = rng.pick([
        { g: 4, each: 25 },
        { g: 5, each: 20 },
        { g: 10, each: 10 },
      ]);
      const pTrue = rng.pick([0.25, 0.3, 0.4, 0.5]);
      const counts = Array.from({ length: groups.g }, () => Math.max(0, Math.min(groups.each, Math.round(groups.each * pTrue + rng.int(-3, 3)))));
      const sum = counts.reduce((a, b) => a + b, 0);
      const asPct = rng.chance(0.5);
      const outcome = rng.pick(['red', 'blue', 'green']);
      return {
        type: 'numeric',
        prompt: `${groups.g} groups in ${name}'s class each spun the same spinner ${groups.each} times and counted how often it landed on ${outcome}.\n\n| Group | ${counts.map((_, i) => i + 1).join(' | ')} |\n|---|${'---|'.repeat(groups.g)}\n| ${outcome[0]!.toUpperCase() + outcome.slice(1)} | ${counts.join(' | ')} |\n\nThe class combines all the results. What is the combined experimental probability of ${outcome}? Give your answer as ${asPct ? 'a percentage' : 'a decimal'}.`,
        answer: asPct ? sum : sum / 100,
        ...(asPct ? { units: '%' } : { form: 'decimal' as const }),
        marks: 2,
        calculator: 'not-allowed',
        hints: [`How many spins were there altogether? (${groups.g} groups × ${groups.each} spins.)`, `Add up the number of times it landed on ${outcome}.`],
        solution: `Total spins: $${groups.g} \\times ${groups.each} = 100$\n\nTotal ${outcome}: $${counts.join(' + ')} = ${sum}$\n\nCombined experimental probability $= ${frac(sum, 100, true)} = ${asPct ? `${sum}\\%` : num(sum / 100)}$\n\nCombining the groups' results gives more trials, so this estimate is more reliable than any one group's.`,
      };
    }
    for (;;) {
      const n = rng.pick([40, 100, 200]);
      const N = n === 40 ? 100 : n === 100 ? 250 : 500;
      const k = rng.int(Math.round(n * 0.25), Math.round(n * 0.45));
      const ans = (k * N) / n;
      if (!Number.isInteger(ans)) continue;
      return {
        type: 'numeric',
        prompt: `${name} thinks a die is weighted. ${name} rolls it ${n} times, and a 6 comes up ${k} times.\n\nBased on these results, about how many 6s would you expect in ${N} rolls of the same die?`,
        answer: ans,
        form: 'integer',
        marks: 2,
        calculator: 'not-allowed',
        hints: ['For a weighted die you can’t use 1/6. Use the experimental probability instead.', `Experimental probability = ${k} ÷ ${n}. Then multiply by ${N}.`],
        solution: `Experimental probability of a 6: $${pTex(k, n)}$\n\nExpected number in ${N} rolls: $${frac(k, n, true)} \\times ${N} = ${ans}$\n\n(For a fair die you would expect only about $\\frac{1}{6} \\times ${N} \\approx ${Math.round(N / 6)}$.)`,
      };
    }
  },
};

export const templates: QuestionTemplate[] = [relativeFrequency, expected, compareTheory, largeNumbers];
