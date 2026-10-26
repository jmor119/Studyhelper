import type { QuestionTemplate } from '../../../types';
import type { Rng } from '../../../../rng';
import { gcd, NAMES } from '../../../format';
import { bothTex, cash, f, mixedTex, niceTex, partName, partsName, properFraction, simp } from './fractions-helpers';

// m7.num.fraction-operations — fractions of amounts, whole number × fraction, fraction ÷ whole number,
// whole number ÷ unit fraction, and finding the whole from a fraction.
// Year 7 scope: no fraction × fraction and no fraction ÷ fraction (other than whole ÷ unit fraction).
// Every answer is chosen first, then the question is built from it.

const NA = 'not-allowed' as const;

/** A proper fraction a/b in simplest form with a ≥ 2. */
function nonUnitFraction(rng: Rng, dens: readonly number[]): [number, number] {
  for (;;) {
    const [a, b] = properFraction(rng, dens);
    if (a >= 2) return [a, b];
  }
}

const OF_CONTEXTS = [
  {
    text: (a: string, N: number) => `The school hall has ${N} chairs set out for assembly. $${a}$ of the chairs are taken. How many chairs are taken?`,
    units: undefined,
    money: false,
  },
  {
    text: (a: string, N: number) => `There are ${N} students at school camp. $${a}$ of them go kayaking on the first day. How many students go kayaking?`,
    units: undefined,
    money: false,
  },
  {
    text: (a: string, N: number, name: string) => `${name} has saved ${cash(N)}. ${name} spends $${a}$ of it on a new netball. How much does the netball cost?`,
    units: '$',
    money: true,
  },
  {
    text: (a: string, N: number) => `A farmer has ${N} sheep. $${a}$ of them have been shorn. How many sheep have been shorn?`,
    units: undefined,
    money: false,
  },
  {
    text: (a: string, N: number) => `A packet of seeds has ${N} seeds. $${a}$ of them sprout. How many seeds sprout?`,
    units: undefined,
    money: false,
  },
] as const;

export const fractionOfAmount: QuestionTemplate = {
  id: 'm7.num.fraction-operations.fraction-of-amount',
  topicId: 'm7.num.fraction-operations',
  title: 'Find a fraction of a whole number',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      const b = rng.int(2, 10);
      const m = rng.int(2, 12);
      const N = b * m;
      return {
        type: 'numeric',
        prompt: `Find $${f(1, b)}$ of ${N}.`,
        answer: m,
        form: 'integer',
        calculator: NA,
        hints: [`$${f(1, b)}$ of a number means split it into ${b} equal parts and take one part.`, `So divide ${N} by ${b}.`],
        solution: `Split ${N} into ${b} equal parts: $${N} \\div ${b} = ${m}$.\n\nSo $${f(1, b)}$ of ${N} is ${m}.`,
      };
    }
    if (difficulty === 2) {
      const [a, b] = nonUnitFraction(rng, [3, 4, 5, 6, 8, 10]);
      const m = rng.int(2, 12);
      const N = b * m;
      const answer = a * m;
      const lines = [
        `First find $${f(1, b)}$: $${N} \\div ${b} = ${m}$.`,
        `Then find $${f(a, b)}$: $${m} \\times ${a} = ${answer}$.`,
      ];
      if (rng.chance(0.4)) {
        return {
          type: 'numeric',
          prompt: `Find $${f(a, b)}$ of ${N}.`,
          answer,
          form: 'integer',
          calculator: NA,
          hints: [`Start by finding $${f(1, b)}$ of ${N}.`, `$${f(a, b)}$ is ${a} lots of $${f(1, b)}$.`],
          solution: lines.join('\n\n'),
        };
      }
      const c = rng.pick(OF_CONTEXTS);
      const name = rng.pick(NAMES);
      return {
        type: 'numeric',
        prompt: c.text(f(a, b), N, name),
        answer,
        form: 'integer',
        ...(c.units ? { units: c.units } : {}),
        calculator: NA,
        hints: [`Start by finding $${f(1, b)}$ of ${c.money ? cash(N) : N}.`, `$${f(a, b)}$ is ${a} lots of $${f(1, b)}$.`],
        solution: `${lines.join('\n\n')}\n\nSo the answer is ${c.money ? cash(answer) : answer}.`,
      };
    }
    // difficulty 3: improper fraction of a bigger number, written as "of" or "×"
    let a = 5;
    let b = 3;
    for (;;) {
      b = rng.pick([2, 3, 4, 5, 6, 8]);
      a = rng.int(b + 1, 2 * b + 1);
      if (gcd(a, b) === 1) break;
    }
    const m = rng.int(11, 60);
    const N = b * m;
    const answer = a * m;
    const asTimes = rng.chance(0.4);
    return {
      type: 'numeric',
      prompt: asTimes ? `Work out $${N} \\times ${f(a, b)}$.` : `Find $${f(a, b)}$ of ${N}.`,
      answer,
      form: 'integer',
      calculator: NA,
      hints: [
        asTimes ? `Multiplying by $${f(a, b)}$ is the same as finding $${f(a, b)}$ of the number.` : `Find $${f(1, b)}$ of ${N} first.`,
        `Divide by the denominator, then multiply by the numerator.`,
      ],
      solution: `${asTimes ? `$${N} \\times ${f(a, b)}$ is the same as $${f(a, b)}$ of ${N}.\n\n` : ''}$${f(1, b)}$ of ${N} is $${N} \\div ${b} = ${m}$.\n\n$${f(a, b)}$ is ${a} lots of that: $${m} \\times ${a} = ${answer}$.\n\nCheck: $${f(a, b)}$ is more than 1, so the answer should be more than ${N}. It is.`,
    };
  },
};

const TIMES_STORIES = [
  { text: (name: string, n: number, fr: string) => `One lap of the school field is $${fr}$ km. ${name} runs ${n} laps. How many kilometres does ${name} run?`, units: 'km', what: 'distance' },
  { text: (name: string, n: number, fr: string) => `A water bottle holds $${fr}$ L. ${name} fills ${n} bottles for a class trip. How many litres of water is that altogether?`, units: 'L', what: 'amount of water' },
  { text: (name: string, n: number, fr: string) => `${name} lays ${n} paving stones in a row. Each stone is $${fr}$ m long. How long is the row?`, units: 'm', what: 'length' },
  { text: (name: string, n: number, fr: string) => `Each bag of kūmara weighs $${fr}$ kg. ${name} buys ${n} bags for the hāngī. How many kilograms of kūmara is that?`, units: 'kg', what: 'mass' },
] as const;

export const multiplyWhole: QuestionTemplate = {
  id: 'm7.num.fraction-operations.multiply-whole',
  topicId: 'm7.num.fraction-operations',
  title: 'Multiply a whole number by a fraction',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    let n = 2;
    let a = 1;
    let b = 3;
    for (;;) {
      [a, b] = properFraction(rng, [3, 4, 5, 6, 8, 10]);
      n = rng.int(2, 9);
      if (n * a <= b) continue; // keep answers above 1
      if (n % b === 0) continue; // not a whole number
      const shares = gcd(n, b) > 1;
      if (difficulty === 2 && shares) continue;
      if (difficulty === 3 && !shares) continue;
      break;
    }
    const top = n * a;
    const [sn, sd] = simp(top, b);
    const simplifyLine = sn !== top ? `\n\nSimplify by dividing the top and bottom by ${top / sn}: $${f(top, b)} = ${f(sn, sd)}$.` : '';
    const mixedLine = `\n\nAs a mixed number: $${f(sn, sd)} = ${niceTex(sn, sd)}$.`;
    if (difficulty === 4) {
      const s = rng.pick(TIMES_STORIES);
      const name = rng.pick(NAMES);
      return {
        type: 'numeric',
        prompt: `${s.text(name, n, f(a, b))} Give your answer as a mixed number in simplest form.`,
        answer: sn / sd,
        form: 'mixed',
        units: s.units,
        marks: 2,
        calculator: NA,
        hints: ['When the same amount is repeated, multiply.', `Multiply the numerator by ${n}. The denominator stays the same.`],
        solution: `The ${s.what} is $${n} \\times ${f(a, b)} = ${f(top, b)}$.${simplifyLine}${mixedLine}\n\nSo the answer is $${niceTex(sn, sd)}$ ${s.units}.`,
      };
    }
    const fracFirst = rng.chance(0.4);
    return {
      type: 'numeric',
      prompt: `Work out $${fracFirst ? `${f(a, b)} \\times ${n}` : `${n} \\times ${f(a, b)}`}$. Give your answer in simplest form.${difficulty === 3 ? ' You can give an improper fraction or a mixed number.' : ''}`,
      answer: sn / sd,
      form: 'simplest-fraction',
      calculator: NA,
      hints: [`$${n} \\times ${f(a, b)}$ means ${n} lots of $${f(a, b)}$.`, 'Multiply the numerator by the whole number. The denominator stays the same.'],
      solution: `${n} lots of $${f(a, b)}$ is $\\frac{${n} \\times ${a}}{${b}} = ${f(top, b)}$.${simplifyLine}${mixedLine}`,
    };
  },
};

const SHARE_STORIES = [
  {
    text: (name: string, fr: string, n: number) => `There is $${fr}$ of a pizza left. ${name} shares it equally between ${n} friends. What fraction of a whole pizza does each friend get?`,
    units: undefined,
    tail: 'of a pizza',
  },
  {
    text: (name: string, fr: string, n: number) => `${name} has $${fr}$ kg of mince. ${name} splits it equally into ${n} batches of burger patties. How many kilograms of mince are in each batch?`,
    units: 'kg',
    tail: 'kg',
  },
  {
    text: (name: string, fr: string, n: number) => `${name} pours $${fr}$ L of juice equally into ${n} cups. How many litres of juice are in each cup?`,
    units: 'L',
    tail: 'L',
  },
  {
    text: (name: string, fr: string, n: number) => `${name} cuts a piece of wood $${fr}$ m long into ${n} equal pieces. How long is each piece?`,
    units: 'm',
    tail: 'm',
  },
] as const;

export const divideByWhole: QuestionTemplate = {
  id: 'm7.num.fraction-operations.divide-by-whole',
  topicId: 'm7.num.fraction-operations',
  title: 'Divide a fraction by a whole number',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    if (difficulty === 2) {
      if (rng.chance(0.35)) {
        const b = rng.int(2, 5);
        const n = rng.int(2, 6);
        return {
          type: 'numeric',
          prompt: `Work out $${f(1, b)} \\div ${n}$.`,
          answer: 1 / (b * n),
          form: 'simplest-fraction',
          calculator: NA,
          hints: [`Imagine $${f(1, b)}$ of a cake shared equally between ${n} people.`, `Each ${partName(b)} is cut into ${n} smaller pieces. How many of those small pieces make a whole?`],
          solution: `Sharing $${f(1, b)}$ between ${n} cuts it into ${n} equal pieces. Each piece is $${f(1, b * n)}$ of the whole, because $${b} \\times ${n} = ${b * n}$ of those pieces make a whole.\n\n$${f(1, b)} \\div ${n} = \\frac{1}{${b} \\times ${n}} = ${f(1, b * n)}$`,
        };
      }
      for (;;) {
        const b = rng.pick([5, 7, 8, 9, 10, 11, 12]);
        const n = rng.int(2, 4);
        const c = rng.int(1, Math.floor((b - 1) / n));
        const a = c * n;
        if (gcd(a, b) !== 1 || gcd(c, b) !== 1) continue;
        return {
          type: 'numeric',
          prompt: `Work out $${f(a, b)} \\div ${n}$.`,
          answer: c / b,
          form: 'simplest-fraction',
          calculator: NA,
          hints: [`$${f(a, b)}$ means ${a} pieces, each $${f(1, b)}$ of the whole.`, `Share those ${a} pieces equally into ${n} groups.`],
          solution: `$${f(a, b)}$ is ${a} ${partsName(b)}. Sharing ${a} ${partsName(b)} into ${n} equal groups gives $${a} \\div ${n} = ${c}$ ${c === 1 ? partName(b) : partsName(b)} in each group.\n\n$${f(a, b)} \\div ${n} = ${f(c, b)}$`,
        };
      }
    }
    if (difficulty === 3) {
      for (;;) {
        const [a, b] = properFraction(rng, [2, 3, 4, 5, 6]);
        const n = rng.int(2, 6);
        if (a % n === 0 || b * n > 36) continue;
        const [an, ad] = simp(a, b * n);
        return {
          type: 'numeric',
          prompt: `Work out $${f(a, b)} \\div ${n}$. Give your answer in simplest form.`,
          answer: an / ad,
          form: 'simplest-fraction',
          calculator: NA,
          hints: [`Dividing by ${n} is the same as finding $${f(1, n)}$ of the fraction.`, `Each ${partName(b)} gets cut into ${n} smaller pieces, so multiply the denominator by ${n}.`],
          solution: `Dividing by ${n} cuts every piece into ${n} smaller pieces, so the denominator is multiplied by ${n} and the numerator stays the same:\n\n$${f(a, b)} \\div ${n} = \\frac{${a}}{${b} \\times ${n}} = ${f(a, b * n)}$${an !== a ? `\n\nSimplify by dividing the top and bottom by ${a / an}: $${f(a, b * n)} = ${f(an, ad)}$` : ''}`,
        };
      }
    }
    // difficulty 4: word problems, sometimes with a mixed number
    for (;;) {
      const s = rng.pick(SHARE_STORIES);
      const name = rng.pick(NAMES);
      const n = rng.int(2, 5);
      let top: number;
      let d: number;
      let shown: string;
      if (s.units && rng.chance(0.6)) {
        const w = rng.int(1, 2);
        const [r, dd] = properFraction(rng, [2, 3, 4]);
        top = w * dd + r;
        d = dd;
        shown = mixedTex(w, r, dd);
      } else {
        [top, d] = properFraction(rng, [2, 3, 4, 5, 6]);
        shown = f(top, d);
      }
      if (d * n > 30) continue;
      const [an, ad] = simp(top, d * n);
      const improperLine = shown !== f(top, d) ? `Change the mixed number to an improper fraction: $${shown} = ${f(top, d)}$.\n\n` : '';
      return {
        type: 'numeric',
        prompt: `${s.text(name, shown, n)} Give your answer in simplest form.`,
        answer: an / ad,
        form: 'simplest-fraction',
        ...(s.units ? { units: s.units } : {}),
        marks: 2,
        calculator: NA,
        hints: ['Sharing equally means dividing by the number of shares.', 'Change any mixed number to an improper fraction. Then multiply the denominator by the number of shares.'],
        solution: `${improperLine}$${f(top, d)} \\div ${n} = \\frac{${top}}{${d} \\times ${n}} = ${f(top, d * n)}$${an !== top ? ` $= ${f(an, ad)}$` : ''}\n\nEach share is $${bothTex(an, ad)}$ ${s.tail}.`,
      };
    }
  },
};

const UNIT_STORIES = [
  {
    dens: [2, 3, 4, 5, 10],
    text: (name: string, N: number, b: number) => `${name} has ${N} m of ribbon. ${name} cuts it into pieces that are each $${f(1, b)}$ m long. How many pieces does ${name} get?`,
    what: 'pieces',
  },
  {
    dens: [2, 3, 4],
    text: (name: string, N: number, b: number) => `A scoop holds $${f(1, b)}$ of a cup of flour. How many scoops does ${name} need to measure out ${N} cups of flour?`,
    what: 'scoops',
  },
  {
    dens: [4, 6, 8, 10, 12],
    text: (name: string, N: number, b: number) => `For the class shared lunch, ${name} brings ${N} pizzas. Each pizza is cut into slices that are $${f(1, b)}$ of a pizza. How many slices are there?`,
    what: 'slices',
  },
  {
    dens: [2, 3, 4, 6],
    text: (name: string, N: number, b: number) => `${name} is helping in the kitchen at the marae. Each pot of boil-up needs $${f(1, b)}$ of a bag of potatoes. How many pots can be made with ${N} bags of potatoes?`,
    what: 'pots',
  },
] as const;

export const wholeDivideUnit: QuestionTemplate = {
  id: 'm7.num.fraction-operations.whole-divide-unit',
  topicId: 'm7.num.fraction-operations',
  title: 'Divide a whole number by a unit fraction',
  difficulties: [2, 3],
  generate({ rng, difficulty }) {
    const b = rng.int(2, 10);
    const N = rng.int(2, 12);
    const answer = N * b;
    if (difficulty === 2) {
      const asWords = rng.chance(0.3);
      return {
        type: 'numeric',
        prompt: asWords ? `How many ${partsName(b)} are there in ${N}?` : `Work out $${N} \\div ${f(1, b)}$.`,
        answer,
        form: 'integer',
        calculator: NA,
        hints: [
          asWords ? `How many ${partsName(b)} make one whole?` : `$${N} \\div ${f(1, b)}$ asks: how many ${partsName(b)} fit into ${N}?`,
          `There are ${b} ${partsName(b)} in every whole.`,
        ],
        solution: `There are ${b} ${partsName(b)} in one whole, so in ${N} wholes there are $${N} \\times ${b} = ${answer}$.\n\n$${N} \\div ${f(1, b)} = ${answer}$\n\nDividing by a fraction smaller than 1 gives an answer bigger than ${N}.`,
      };
    }
    // difficulty 3: a word problem, or a missing number
    if (rng.chance(0.3)) {
      return {
        type: 'numeric',
        prompt: `Find the missing number: $\\square \\div ${f(1, b)} = ${answer}$`,
        answer: N,
        form: 'integer',
        calculator: NA,
        hints: [`Dividing by $${f(1, b)}$ is the same as multiplying by ${b}.`, `So what number times ${b} makes ${answer}?`],
        solution: `Dividing by $${f(1, b)}$ gives the same answer as multiplying by ${b}. So the missing number times ${b} is ${answer}.\n\n$${answer} \\div ${b} = ${N}$\n\nCheck: there are ${b} ${partsName(b)} in each whole, so ${N} wholes hold $${N} \\times ${b} = ${answer}$ ${partsName(b)}.`,
      };
    }
    const s = rng.pick(UNIT_STORIES);
    const name = rng.pick(NAMES);
    const bb = rng.pick(s.dens);
    const ans = N * bb;
    return {
      type: 'numeric',
      prompt: s.text(name, N, bb),
      answer: ans,
      form: 'integer',
      calculator: NA,
      hints: [`"How many ${partsName(bb)} fit into ${N}?" is a division: $${N} \\div ${f(1, bb)}$.`, `How many ${partsName(bb)} are in one whole?`],
      solution: `Work out $${N} \\div ${f(1, bb)}$.\n\nEach whole has ${bb} ${partsName(bb)}, so ${N} wholes have $${N} \\times ${bb} = ${ans}$.\n\nThe answer is **${ans} ${s.what}**.`,
    };
  },
};

export const findWhole: QuestionTemplate = {
  id: 'm7.num.fraction-operations.find-whole',
  topicId: 'm7.num.fraction-operations',
  title: 'Find the whole from a fraction',
  difficulties: [3, 4, 5],
  generate({ rng, difficulty }) {
    if (difficulty === 3) {
      const [a, b] = properFraction(rng, [2, 3, 4, 5, 6, 8, 10]);
      const m = rng.int(2, 12);
      const W = b * m;
      const P = a * m;
      return {
        type: 'numeric',
        prompt: `$${f(a, b)}$ of a number is ${P}. What is the number?`,
        answer: W,
        form: 'integer',
        calculator: NA,
        hints: [a === 1 ? `If one part is ${P}, how big are ${b} parts?` : `If ${a} parts are ${P}, how big is one part?`, `The whole number is ${b} parts.`],
        solution: `${a === 1 ? `$${f(1, b)}$ of the number is ${P}.` : `$${f(a, b)}$ is ${a} parts, so one part ($${f(1, b)}$) is $${P} \\div ${a} = ${m}$.`}\n\nThe whole is ${b} parts: $${m} \\times ${b} = ${W}$.\n\nCheck: $${f(a, b)}$ of ${W} is $${W} \\div ${b} \\times ${a} = ${P}$ ✓`,
      };
    }
    if (difficulty === 4) {
      let [a, b] = properFraction(rng, [3, 4, 5, 6, 8, 10]);
      while (a < 2) [a, b] = properFraction(rng, [3, 4, 5, 6, 8, 10]);
      const m = rng.int(3, 12);
      const W = b * m;
      const P = a * m;
      const name = rng.pick(NAMES);
      const kind = rng.pick(['class', 'money', 'tank', 'book'] as const);
      const prompt =
        kind === 'class'
          ? `$${f(a, b)}$ of the students in Room ${rng.int(1, 24)} walk to school. That is ${P} students. How many students are in the class?`
          : kind === 'money'
            ? `${name} has saved $${f(a, b)}$ of the cost of a skateboard. ${name} has saved ${cash(P * 5)}. How much does the skateboard cost?`
            : kind === 'tank'
              ? `A water tank is $${f(a, b)}$ full. It has ${P * 10} L of water in it. How many litres does the tank hold when it is full?`
              : `${name} has read $${f(a, b)}$ of a book. That is ${P * 5} pages. How many pages are in the whole book?`;
      const scale = kind === 'money' || kind === 'book' ? 5 : kind === 'tank' ? 10 : 1;
      const part = P * scale;
      const one = m * scale;
      const whole = W * scale;
      const show = (x: number) => (kind === 'money' ? cash(x) : String(x));
      return {
        type: 'numeric',
        prompt,
        answer: whole,
        form: 'integer',
        ...(kind === 'money' ? { units: '$' } : kind === 'tank' ? { units: 'L' } : {}),
        marks: 2,
        calculator: NA,
        hints: [`${a} parts out of ${b} are worth ${show(part)}. How much is one part worth?`, `The whole is ${b} parts.`],
        solution: `$${f(a, b)}$ is ${a} equal parts, so one part is ${show(part)} ÷ ${a} = ${show(one)}.\n\nThe whole is ${b} parts: ${show(one)} × ${b} = **${show(whole)}**.`,
      };
    }
    // difficulty 5: an improper fraction of the whole, or what's left after spending a fraction
    if (rng.chance(0.5)) {
      let a = 5;
      let b = 4;
      for (;;) {
        b = rng.pick([2, 3, 4, 5, 6]);
        a = rng.int(b + 1, Math.max(b + 1, 2 * b - 1));
        if (gcd(a, b) === 1) break;
      }
      const m = rng.int(4, 25);
      const W = b * m;
      const P = a * m;
      return {
        type: 'numeric',
        prompt: `$${f(a, b)}$ of a number is ${P}. What is the number?`,
        answer: W,
        form: 'integer',
        marks: 2,
        calculator: NA,
        hints: [`$${f(a, b)}$ is ${a} parts, and each part is $${f(1, b)}$. How big is one part?`, `The whole is only ${b} of those parts, so it is smaller than ${P}.`],
        solution: `$${f(a, b)}$ is ${a} parts, so one part is $${P} \\div ${a} = ${m}$.\n\nThe whole is ${b} parts: $${m} \\times ${b} = ${W}$.\n\nCheck: $${f(a, b)}$ is more than 1, so ${P} should be more than the whole. It is.`,
      };
    }
    const [s, b] = properFraction(rng, [3, 4, 5, 8, 10]);
    const m = rng.int(2, 12);
    const left = (b - s) * m;
    const W = b * m;
    const name = rng.pick(NAMES);
    return {
      type: 'numeric',
      prompt: `At the school fair, ${name} spends $${f(s, b)}$ of their pocket money and has ${cash(left)} left. How much pocket money did ${name} have to start with?`,
      answer: W,
      form: 'integer',
      units: '$',
      marks: 3,
      calculator: NA,
      hints: ['What fraction of the money is left?', `If you know what that fraction is worth, find one ${partName(b)} first.`],
      solution: `${name} spends $${f(s, b)}$, so $1 - ${f(s, b)} = ${f(b - s, b)}$ is left.\n\n${b - s === 1 ? `So $${f(1, b)}$ of the money is ${cash(left)}.` : `$${f(b - s, b)}$ is worth ${cash(left)}, so $${f(1, b)}$ is worth ${cash(left)} ÷ ${b - s} = ${cash(m)}.`}\n\nThe whole is ${b} parts: ${cash(m)} × ${b} = **${cash(W)}**.\n\nCheck: $${f(s, b)}$ of ${cash(W)} is ${cash(s * m)}, and ${cash(W)} − ${cash(s * m)} = ${cash(left)} ✓`,
    };
  },
};

export const templates: QuestionTemplate[] = [fractionOfAmount, multiplyWhole, divideByWhole, wholeDivideUnit, findWhole];

