import type { Rng } from '../../../../rng';
import { lcm, NAMES } from '../../../format';
import type { QuestionTemplate } from '../../../types';
import { barModel, cash, fr, properFraction } from './fractions-helpers';

// m6.num.fractions-of-amounts: a fraction of a whole number (always a whole-number answer),
// finding the whole from a part, and word problems about parts of quantities and measures.
// The whole is always built as (denominator × a chosen number), so every answer is exact.

const TOPIC = 'm6.num.fractions-of-amounts';

/** A fraction a/b in simplest form with a ≥ 2 (a non-unit fraction). */
function nonUnit(rng: Rng, dens: readonly number[]): [number, number] {
  for (;;) {
    const [a, b] = properFraction(rng, dens);
    if (a >= 2) return [a, b];
  }
}

/** Solution lines for a/b of N, where N = b × m. */
function ofSteps(a: number, b: number, N: number): string {
  const m = N / b;
  return a === 1
    ? `$${fr(1, b)}$ of ${N} means ${N} shared into ${b} equal parts: $${N} \\div ${b} = ${m}$.`
    : `First find one part: $${fr(1, b)}$ of ${N} is $${N} \\div ${b} = ${m}$.\n\nYou want ${a} parts: $${a} \\times ${m} = ${a * m}$. So $${fr(a, b)}$ of ${N} is ${a * m}.`;
}

function ofHints(a: number, b: number, N: number): string[] {
  return a === 1
    ? [`To find $${fr(1, b)}$ of a number, share it into ${b} equal parts.`, `That is the same as working out ${N} ÷ ${b}.`]
    : [`First find $${fr(1, b)}$ of ${N} by dividing by ${b}.`, `Then multiply by ${a}, because you want ${a} of those parts.`];
}

export const unitFraction: QuestionTemplate = {
  id: `${TOPIC}.unit-fraction`,
  topicId: TOPIC,
  title: 'A unit fraction of a number',
  difficulties: [1, 2],
  generate({ rng, difficulty }) {
    const b = difficulty === 1 ? rng.int(2, 10) : rng.pick([2, 3, 4, 5, 6, 8, 10]);
    const m = difficulty === 1 ? rng.int(2, 10) : rng.chance(0.5) ? rng.int(11, 25) : rng.int(2, 9) * 10;
    const N = b * m;
    return {
      type: 'numeric',
      prompt: rng.chance(0.5) ? `Find $${fr(1, b)}$ of ${N}.` : `What is $${fr(1, b)}$ of ${N}?`,
      answer: m,
      form: 'integer',
      calculator: 'not-allowed',
      hints: ofHints(1, b, N),
      solution: ofSteps(1, b, N),
    };
  },
};

export const nonUnitFraction: QuestionTemplate = {
  id: `${TOPIC}.non-unit-fraction`,
  topicId: TOPIC,
  title: 'A non-unit fraction of a number',
  difficulties: [2, 3],
  generate({ rng, difficulty }) {
    const [a, b] = nonUnit(rng, [3, 4, 5, 6, 8, 10]);
    const m = difficulty === 2 ? rng.int(2, 12) : rng.chance(0.5) ? rng.int(2, 9) * 10 : rng.int(11, 30);
    const N = b * m;
    const pic = difficulty === 2 && rng.chance(0.35);
    return {
      type: 'numeric',
      prompt: pic
        ? `The whole bar is ${N}. It is split into ${b} equal parts. What is $${fr(a, b)}$ of ${N}?`
        : rng.chance(0.5)
          ? `Find $${fr(a, b)}$ of ${N}.`
          : `What is $${fr(a, b)}$ of ${N}?`,
      ...(pic && {
        figure: {
          svg: barModel(b, a, '?', String(N)),
          alt: `A bar labelled ${N} split into ${b} equal parts, with ${a} parts shaded and a question mark over the shaded parts.`,
        },
      }),
      answer: a * m,
      form: 'integer',
      calculator: 'not-allowed',
      hints: ofHints(a, b, N),
      solution: ofSteps(a, b, N),
    };
  },
};

export const findWhole: QuestionTemplate = {
  id: `${TOPIC}.find-whole`,
  topicId: TOPIC,
  title: 'Find the whole from a fraction of it',
  difficulties: [3, 4, 5],
  generate({ rng, difficulty }) {
    if (difficulty === 3) {
      const b = rng.int(2, 10);
      const p = rng.int(3, 15);
      const ctx = rng.pick(['number', 'number', 'class', 'shells'] as const);
      const prompt =
        ctx === 'number'
          ? `$${fr(1, b)}$ of a number is ${p}. What is the number?`
          : ctx === 'class'
            ? `$${fr(1, b)}$ of the students in a class is ${p} students. How many students are in the class?`
            : `${rng.pick(NAMES)} found some shells at the beach. $${fr(1, b)}$ of them is ${p} shells. How many shells were found altogether?`;
      return {
        type: 'numeric',
        prompt,
        answer: b * p,
        form: 'integer',
        calculator: 'not-allowed',
        hints: [`${p} is one of ${b} equal parts.`, `The whole is all ${b} parts put together.`],
        solution: `$${fr(1, b)}$ is one part out of ${b}, and that part is ${p}.\n\nThe whole is ${b} parts: $${b} \\times ${p} = ${b * p}$.\n\nCheck: $${b * p} \\div ${b} = ${p}$ ✓`,
      };
    }
    const [a, b] = nonUnit(rng, [3, 4, 5, 6, 8, 10]);
    const m = difficulty === 4 ? rng.int(2, 30) : rng.int(4, 25);
    const P = a * m;
    const W = b * m;
    const steps = `$${fr(a, b)}$ is ${a} equal parts, and they add up to ${P}. So one part is $${P} \\div ${a} = ${m}$.\n\nThe whole is ${b} parts: $${b} \\times ${m} = ${W}$.`;
    if (difficulty === 4) {
      const pic = rng.chance(0.4);
      return {
        type: 'numeric',
        prompt: pic ? `The shaded part of the bar is $${fr(a, b)}$ of the whole bar, and it is worth ${P}. What is the whole bar worth?` : `$${fr(a, b)}$ of a number is ${P}. What is the number?`,
        ...(pic && {
          figure: {
            svg: barModel(b, a, String(P), '?'),
            alt: `A bar split into ${b} equal parts with ${a} parts shaded. The shaded parts are labelled ${P} and the whole bar has a question mark.`,
          },
        }),
        answer: W,
        form: 'integer',
        marks: 2,
        calculator: 'not-allowed',
        hints: [`Find what one part is worth first: ${P} ÷ ${a}.`, `The whole has ${b} parts.`],
        solution: `${steps}\n\nCheck: $${fr(a, b)}$ of ${W} is $${W} \\div ${b} \\times ${a} = ${P}$ ✓`,
      };
    }
    const name = rng.pick(NAMES);
    const ctx = rng.pick(['book', 'savings', 'lambs'] as const);
    const rest = rng.chance(0.5);
    const restAns = W - P;
    let prompt: string;
    let restLine: string;
    if (ctx === 'book') {
      prompt = `${name} has read $${fr(a, b)}$ of a book. That is ${P} pages. ${rest ? 'How many pages does ' + name + ' still have to read?' : 'How many pages are in the whole book?'}`;
      restLine = `Pages still to read: $${W} - ${P} = ${restAns}$.`;
    } else if (ctx === 'savings') {
      prompt = `${name} has saved $${fr(a, b)}$ of the money needed for a new skateboard. So far ${name} has saved ${cash(P)}. ${rest ? 'How much more money does ' + name + ' need to save?' : 'How much does the skateboard cost?'}`;
      restLine = `Still to save: ${cash(W)} − ${cash(P)} = ${cash(restAns)}.`;
    } else {
      prompt = `A farmer has sold $${fr(a, b)}$ of her lambs. She sold ${P} lambs. ${rest ? 'How many lambs does she have left?' : 'How many lambs did she have to start with?'}`;
      restLine = `Lambs left: $${W} - ${P} = ${restAns}$.`;
    }
    return {
      type: 'numeric',
      prompt,
      answer: rest ? restAns : W,
      ...(ctx === 'savings' ? { units: '$' } : { form: 'integer' as const }),
      marks: 2,
      calculator: 'not-allowed',
      hints: [`${P} is $${fr(a, b)}$ of the whole. Find what $${fr(1, b)}$ is worth first.`, rest ? 'Find the whole, then take away the part you already know.' : `The whole has ${b} of those parts.`],
      solution: `${steps}${rest ? `\n\n${restLine}` : ''}`,
    };
  },
};

/** Measures where a fraction of one unit is a whole number of a smaller unit. */
const MEASURES = [
  { of: 'an hour', whole: 60, small: 'minutes', units: 'minutes', dens: [2, 3, 4, 5, 6, 10, 12] },
  { of: 'a day', whole: 24, small: 'hours', units: 'hours', dens: [2, 3, 4, 6, 8, 12] },
  { of: 'a kilogram', whole: 1000, small: 'grams', units: 'g', dens: [2, 4, 5, 8, 10] },
  { of: 'a metre', whole: 100, small: 'centimetres', units: 'cm', dens: [2, 4, 5, 10] },
  { of: 'a litre', whole: 1000, small: 'millilitres', units: 'mL', dens: [2, 4, 5, 8, 10] },
] as const;

const COUNT_CONTEXTS = [
  (N: number, f: string) => `There are ${N} students at a school assembly. ${f} of them walk to school. How many of the students walk to school?`,
  (N: number, f: string) => `A bag has ${N} lollies in it. ${f} of them are red. How many red lollies are there?`,
  (N: number, f: string) => `A farmer has ${N} sheep. ${f} of them are lambs. How many lambs are there?`,
  (N: number, f: string, name: string) => `A netball team scored ${N} goals this season. ${name} scored ${f} of them. How many goals did ${name} score?`,
  (N: number, f: string) => `A class planted ${N} native trees at the marae. ${f} of them were kōwhai. How many kōwhai trees did they plant?`,
] as const;

const LEFT_CONTEXTS = [
  (N: number, f: string, name: string) => ({ q: `${name} had ${N} lollies and gave ${f} of them to friends. How many lollies does ${name} have left?`, what: 'lollies left' }),
  (N: number, f: string) => ({ q: `There were ${N} people at a hāngī. ${f} of them were children. How many adults were there?`, what: 'adults' }),
  (N: number, f: string) => ({ q: `A school bus has ${N} seats. ${f} of the seats are taken. How many seats are empty?`, what: 'empty seats' }),
  (N: number, f: string, name: string) => ({ q: `${name} has ${N} stickers and puts ${f} of them in a sticker book. How many stickers are not in the book?`, what: 'stickers not in the book' }),
] as const;

export const wordProblems: QuestionTemplate = {
  id: `${TOPIC}.word-problems`,
  topicId: TOPIC,
  title: 'Fractions of quantities and measures',
  difficulties: [2, 3, 4, 5],
  generate({ rng, difficulty }) {
    const name = rng.pick(NAMES);
    if (difficulty === 2) {
      const ms = rng.pick(MEASURES);
      const [a, b] = properFraction(rng, ms.dens);
      const one = ms.whole / b;
      return {
        type: 'numeric',
        prompt: `How many ${ms.small} are in $${fr(a, b)}$ of ${ms.of}?`,
        answer: a * one,
        units: ms.units,
        calculator: 'not-allowed',
        hints: [`How many ${ms.small} are in ${ms.of.replace(/^an? /, 'one ')}?`, a === 1 ? `Then divide by ${b}.` : `Find $${fr(1, b)}$ first, then multiply by ${a}.`],
        solution: `There are ${ms.whole} ${ms.small} in ${ms.of.replace(/^an? /, 'one ')}.\n\n${ofSteps(a, b, ms.whole)}`,
      };
    }
    const [a, b] = rng.chance(0.25) && difficulty === 3 ? [1, rng.pick([2, 3, 4, 5, 6, 8, 10])] : nonUnit(rng, [3, 4, 5, 6, 8, 10]);
    const m = rng.int(2, 12);
    const N = b * m;
    const f = `$${fr(a, b)}$`;
    if (difficulty === 3) {
      const ctx = rng.pick(COUNT_CONTEXTS);
      return {
        type: 'numeric',
        prompt: ctx(N, f, name),
        answer: a * m,
        form: 'integer',
        calculator: 'not-allowed',
        hints: ofHints(a, b, N),
        solution: ofSteps(a, b, N),
      };
    }
    if (difficulty === 4) {
      const ctx = rng.pick(LEFT_CONTEXTS)(N, f, name);
      const part = a * m;
      return {
        type: 'numeric',
        prompt: ctx.q,
        answer: N - part,
        form: 'integer',
        marks: 2,
        calculator: 'not-allowed',
        hints: [`Find $${fr(a, b)}$ of ${N} first.`, 'Then take that away from the whole amount.'],
        solution: `${ofSteps(a, b, N)}\n\nThe rest is $${N} - ${part} = ${N - part}$ ${ctx.what}.\n\nAnother way: the rest is $${fr(b - a, b)}$ of ${N}, which is $${b - a} \\times ${m} = ${N - part}$.`,
      };
    }
    // difficulty 5
    if (rng.chance(0.5)) {
      // Two fractions of the same amount of money.
      const [b1, b2] = rng.pick([
        [4, 3],
        [2, 5],
        [4, 5],
        [3, 5],
        [2, 10],
        [5, 10],
        [3, 4],
        [2, 6],
      ] as const);
      const a1 = 1;
      const a2 = b2 >= 5 && rng.chance(0.5) ? 2 : 1;
      const base = lcm(b1, b2);
      const k = rng.int(1, Math.max(1, Math.floor(120 / base)));
      const N = base * Math.max(k, base < 20 ? 2 : 1);
      const p1 = (N / b1) * a1;
      const p2 = (N / b2) * a2;
      const left = N - p1 - p2;
      const [thing1, thing2] = rng.pick([
        ['a book', 'a movie ticket'],
        ['a new jersey', 'snacks for camp'],
        ['a gift for a friend', 'a bus pass top-up'],
        ['a phone cover', 'lunch with friends'],
      ] as const);
      return {
        type: 'numeric',
        prompt: `${name} has ${cash(N)} of birthday money. ${name} spends $${fr(a1, b1)}$ of it on ${thing1} and $${fr(a2, b2)}$ of it on ${thing2}. How much money does ${name} have left?`,
        answer: left,
        units: '$',
        marks: 2,
        calculator: 'not-allowed',
        hints: ['Work out each fraction of the birthday money on its own.', 'Add what was spent, then take it away from the total.'],
        solution: `$${fr(a1, b1)}$ of ${cash(N)}: $${N} \\div ${b1} = ${p1}$, so ${cash(p1)}.\n\n$${fr(a2, b2)}$ of ${cash(N)}: $${N} \\div ${b2} = ${N / b2}$${a2 > 1 ? `, and $${a2} \\times ${N / b2} = ${p2}$` : ''}, so ${cash(p2)}.\n\nLeft: ${cash(N)} − ${cash(p1)} − ${cash(p2)} = ${cash(left)}.`,
      };
    }
    // Compare two fractions of amounts.
    for (;;) {
      const [x1, y1] = nonUnit(rng, [3, 4, 5, 6, 8]);
      const [x2, y2] = nonUnit(rng, [3, 4, 5, 6, 8]);
      const N1 = y1 * rng.int(3, 15);
      const N2 = y2 * rng.int(3, 15);
      const v1 = (N1 / y1) * x1;
      const v2 = (N2 / y2) * x2;
      if (v1 === v2 || (x1 === x2 && y1 === y2)) continue;
      return {
        type: 'numeric',
        prompt: `Which is more: $${fr(x1, y1)}$ of ${N1}, or $${fr(x2, y2)}$ of ${N2}? Work out both, then find **how much more** the bigger one is.`,
        answer: Math.abs(v1 - v2),
        form: 'integer',
        marks: 2,
        calculator: 'not-allowed',
        hints: ['Work out each fraction of its amount: divide by the denominator, then multiply by the numerator.', 'Then subtract the smaller answer from the bigger one.'],
        solution: `$${fr(x1, y1)}$ of ${N1}: $${N1} \\div ${y1} = ${N1 / y1}$, then $${x1} \\times ${N1 / y1} = ${v1}$.\n\n$${fr(x2, y2)}$ of ${N2}: $${N2} \\div ${y2} = ${N2 / y2}$, then $${x2} \\times ${N2 / y2} = ${v2}$.\n\n$${fr(v1 > v2 ? x1 : x2, v1 > v2 ? y1 : y2)}$ of ${v1 > v2 ? N1 : N2} is bigger, by $${Math.max(v1, v2)} - ${Math.min(v1, v2)} = ${Math.abs(v1 - v2)}$.`,
      };
    }
  },
};

export const templates: QuestionTemplate[] = [unitFraction, nonUnitFraction, findWhole, wordProblems];
