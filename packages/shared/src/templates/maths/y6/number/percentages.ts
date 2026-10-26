import type { Rng } from '../../../../rng';
import { clean, NAMES, num, tex } from '../../../format';
import type { QuestionTemplate, TemplateOutput } from '../../../types';
import { cash, CMP, cmp, cmpWords, fr, hundredSquare, mcqFields, simp } from './fractions-helpers';

// m6.num.percentages: fractions, decimals and percentages, finding 1%, 10%, 20%, 25%, 50% and 75%
// of whole numbers, finding the whole from a percentage, and comparing with percentages.
// Wholes are always built from the percentage (e.g. a multiple of 4 for 25%) so answers are whole numbers.

const TOPIC = 'm6.num.percentages';

/** Fractions with known percentage equivalents at Year 6: halves, quarters, fifths and tenths. */
const KNOWN: ReadonlyArray<readonly [number, number]> = [
  [1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5],
  [1, 10], [3, 10], [7, 10], [9, 10],
];
const pctOf = (a: number, b: number) => (100 * a) / b;

/** How to find P% of a number, in words. */
const HOW: Record<number, { fraction: string; hint: string; k: number }> = {
  50: { fraction: 'one half', hint: 'Halve the number.', k: 2 },
  10: { fraction: 'one tenth', hint: 'Divide the number by 10.', k: 10 },
  25: { fraction: 'one quarter', hint: 'Halve the number, then halve it again.', k: 4 },
  20: { fraction: 'one fifth', hint: 'Find 10%, then double it. (Or divide by 5.)', k: 5 },
  1: { fraction: 'one hundredth', hint: 'Divide the number by 100.', k: 100 },
  75: { fraction: 'three quarters', hint: 'Find 25% first, then multiply by 3.', k: 4 },
};

/** A whole number that P% of gives a whole-number answer: N = k × m. */
function wholeFor(rng: Rng, P: number, maxM: number): { N: number; m: number } {
  const k = HOW[P]!.k;
  const m = rng.int(2, maxM);
  return { N: k * m, m };
}

/** Worked solution for P% of N. */
function percentSteps(P: number, N: number): string {
  const k = HOW[P]!.k;
  const one = N / k;
  if (P === 75) return `75% is three quarters. First find 25% (one quarter): $${tex(N)} \\div 4 = ${tex(one)}$.\n\nThen 75% is three lots of that: $3 \\times ${tex(one)} = ${tex(3 * one)}$.`;
  if (P === 20 && N % 10 !== 0) return `20% is one fifth, so divide by 5: $${tex(N)} \\div 5 = ${tex(one)}$.`;
  if (P === 20) return `20% is one fifth. 10% of ${tex(N)} is $${tex(N)} \\div 10 = ${tex(N / 10)}$, so 20% is $2 \\times ${tex(N / 10)} = ${tex(one)}$.\n\n(Or: $${tex(N)} \\div 5 = ${tex(one)}$.)`;
  return `${P}% is ${HOW[P]!.fraction}, so divide by ${k}: $${tex(N)} \\div ${k} = ${tex(one)}$.`;
}
const percentValue = (P: number, N: number) => (P * N) / 100;

export const convert: QuestionTemplate = {
  id: `${TOPIC}.convert`,
  topicId: TOPIC,
  title: 'Fractions, decimals and percentages',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      const kind = rng.pick(['grid', 'fracToPct', 'decToPct', 'pctToDec'] as const);
      const k = kind === 'grid' ? rng.int(3, 97) : rng.chance(0.8) ? rng.int(11, 99) : rng.int(1, 9);
      if (kind === 'grid') {
        return {
          type: 'numeric',
          prompt: 'What percentage of the hundred square is shaded?',
          figure: { svg: hundredSquare(k), alt: `A 10 by 10 hundred square. ${Math.floor(k / 10)} full rows of 10 and ${k % 10} more squares are shaded.` },
          answer: k,
          units: '%',
          calculator: 'not-allowed',
          hints: ['A hundred square has 100 small squares. Per cent means "out of 100".', 'Count the full rows of 10 first, then the extra squares.'],
          solution: `${Math.floor(k / 10)} full rows of 10 and ${k % 10} more: $${Math.floor(k / 10) * 10} + ${k % 10} = ${k}$ squares are shaded out of 100.\n\n$${fr(k, 100)} = ${k}\\%$`,
        };
      }
      if (kind === 'fracToPct') {
        return {
          type: 'numeric',
          prompt: `Write $${fr(k, 100)}$ as a percentage.`,
          answer: k,
          units: '%',
          calculator: 'not-allowed',
          hints: ['Per cent means "out of 100".', 'A fraction out of 100 can be written straight away as a percentage.'],
          solution: `$${fr(k, 100)}$ means ${k} out of 100, which is ${k}%.`,
        };
      }
      const dec = tex(k / 100, 2);
      if (kind === 'decToPct') {
        return {
          type: 'numeric',
          prompt: `Write $${dec}$ as a percentage.`,
          answer: k,
          units: '%',
          calculator: 'not-allowed',
          hints: ['Two decimal places means hundredths.', 'How many hundredths is it? Hundredths are the same as per cent.'],
          solution: `$${dec}$ is ${k} hundredths: $${dec} = ${fr(k, 100)} = ${k}\\%$.\n\n(Multiplying by 100 gives the same answer: $${dec} \\times 100 = ${k}$.)`,
        };
      }
      return {
        type: 'numeric',
        prompt: `Write ${k}% as a decimal.`,
        answer: clean(k / 100),
        form: 'decimal',
        calculator: 'not-allowed',
        hints: ['Per cent means "out of 100", so write it as hundredths first.', 'Hundredths fill two places after the decimal point.'],
        solution: `${k}% means ${k} out of 100: $${k}\\% = ${fr(k, 100)} = ${tex(k / 100)}$.\n\n(Dividing by 100 gives the same answer: $${k} \\div 100 = ${tex(k / 100)}$.)`,
      };
    }
    if (difficulty === 2) {
      const kind = rng.pick(['tenthsToPct', 'fracToPct', 'fracToDec', 'pctToFrac', 'decToFrac'] as const);
      if (kind === 'tenthsToPct') {
        const t = rng.int(1, 9);
        return {
          type: 'numeric',
          prompt: `Write $${tex(t / 10)}$ as a percentage.`,
          answer: t * 10,
          units: '%',
          calculator: 'not-allowed',
          hints: ['Write it with two decimal places first, so it shows hundredths.', 'Hundredths are the same as per cent.'],
          solution: `$${tex(t / 10)} = ${tex(t / 10, 2)} = ${fr(t * 10, 100)} = ${t * 10}\\%$.\n\nWatch out: $${tex(t / 10)}$ is not ${t}%. It is ${t} tenths, which is ${t * 10} hundredths.`,
        };
      }
      const [a, b] = rng.pick(KNOWN);
      const p = pctOf(a, b);
      const conv = b === 10 ? `$${fr(a, 10)} = ${fr(p, 100)}$` : `$${fr(a, b)} = ${fr(`${a} \\times ${100 / b}`, `${b} \\times ${100 / b}`)} = ${fr(p, 100)}$`;
      if (kind === 'fracToPct' || kind === 'fracToDec') {
        const toPct = kind === 'fracToPct';
        return {
          type: 'numeric',
          prompt: `Write $${fr(a, b)}$ as a ${toPct ? 'percentage' : 'decimal'}.`,
          answer: toPct ? p : clean(p / 100),
          ...(toPct ? { units: '%' } : { form: 'decimal' as const }),
          calculator: 'not-allowed',
          hints: ['Make an equivalent fraction with denominator 100.', `What do you multiply ${b} by to get 100?`],
          solution: `${conv}.\n\n${toPct ? `${p} out of 100 is ${p}%.` : `${p} hundredths is $${tex(p / 100)}$.`}`,
        };
      }
      const fromPct = kind === 'pctToFrac';
      const shown = fromPct ? `${p}%` : `$${tex(p / 100)}$`;
      return {
        type: 'numeric',
        prompt: `Write ${shown} as a fraction in simplest form.`,
        answer: a / b,
        form: 'simplest-fraction',
        calculator: 'not-allowed',
        hints: [fromPct ? 'Per cent means "out of 100". Write it as a fraction out of 100.' : 'Write the decimal as hundredths (or tenths) first.', 'Then simplify the fraction.'],
        solution: `${fromPct ? `${p}% means ${p} out of 100` : `$${tex(p / 100)}$ is ${p} hundredths`}: $${fr(p, 100)}$.\n\nSimplify: $${fr(p, 100)} = ${fr(a, b)}$.`,
      };
    }
    // difficulty 3
    const kind = rng.pick(['fracMcq', 'pctMcq', 'cloze'] as const);
    if (kind === 'pctMcq') {
      const p = rng.chance(0.5) ? rng.int(1, 9) * 10 : rng.int(11, 99);
      const asDec = (x: number) => `$${tex(x)}$`;
      const mcq = mcqFields(rng, { text: asDec(p / 100) }, [
        { text: asDec(p / 1000), feedback: `$${tex(p / 1000)}$ is only ${tex(p / 10)}%. Per cent means hundredths, so ${p}% needs ${p} hundredths.` },
        { text: asDec(p / 10), feedback: `$${tex(p / 10)}$ is ${p * 10}%. To change a percentage into a decimal, divide by 100, not 10.` },
        { text: asDec(p), feedback: `${p} is ${p} wholes, which is ${p * 100}%. Divide by 100 to change ${p}% into a decimal.` },
      ]);
      return {
        type: 'mcq',
        prompt: `Which decimal is the same as ${p}%?`,
        ...mcq,
        calculator: 'not-allowed',
        hints: ['Per cent means "out of 100".', `Write ${p}% as a fraction out of 100 first.`],
        solution: `${p}% $= ${fr(p, 100)} = ${tex(p / 100)}$`,
      };
    }
    const [a, b] = rng.pick(KNOWN);
    const p = pctOf(a, b);
    if (kind === 'fracMcq') {
      const cands = [
        { v: Number(`${a}${b}`), feedback: `This puts the digits ${a} and ${b} side by side. $${fr(a, b)}$ means ${a} out of ${b}, which is the same as ${p} out of 100.` },
        { v: 100 - p, feedback: `${100 - p}% is the part that is left over, not $${fr(a, b)}$ itself.` },
        { v: p / 10, feedback: `This is 10 times too small. $${fr(a, b)} = ${fr(p, 100)}$, which is ${p}%.` },
        { v: a, feedback: `${a}% is only ${a} out of 100. $${fr(a, b)}$ is ${p} out of 100.` },
        { v: b, feedback: `${b}% is ${b} out of 100. $${fr(a, b)}$ is ${p} out of 100.` },
        { v: p / 100, feedback: `This is the decimal $${tex(p / 100)}$ with a % sign stuck on. To change a decimal into a percentage, multiply by 100.` },
      ].filter((c) => c.v !== p && c.v <= 100);
      const mcq = mcqFields(rng, { text: `${p}%` }, cands.map((c) => ({ text: `${tex(c.v)}%`, feedback: c.feedback })));
      return {
        type: 'mcq',
        prompt: `Which percentage is the same as $${fr(a, b)}$?`,
        ...mcq,
        calculator: 'not-allowed',
        hints: ['Make an equivalent fraction with denominator 100.', `What do you multiply ${b} by to get 100?`],
        solution: `$${fr(a, b)} = ${fr(p, 100)} = ${p}\\%$`,
      };
    }
    const dec = tex(p / 100);
    const decAlts = [dec, dec.replace(/^0/, ''), ...(p % 10 === 0 ? [tex(p / 100, 2), tex(p / 100, 2).replace(/^0/, '')] : [])];
    return {
      type: 'cloze',
      prompt: `Fill in the gaps.\n\n$${fr(a, b)}$ = [[d]] (as a decimal) = [[p]]%`,
      blanks: [
        { id: 'd', accepted: decAlts },
        { id: 'p', accepted: [String(p), `${p}%`] },
      ],
      allowTypos: false,
      marks: 2,
      calculator: 'not-allowed',
      hints: ['Make an equivalent fraction with denominator 100.', 'Hundredths can be written as a decimal with two places, or as a percentage.'],
      solution: `$${fr(a, b)} = ${fr(p, 100)}$, which is ${p} hundredths.\n\nAs a decimal: $${dec}$. As a percentage: ${p}%.`,
    } as TemplateOutput;
  },
};

const ITEMS = [
  (N: number, P: number) => `A packet has ${N} biscuits. ${P}% of them are chocolate. How many chocolate biscuits are there?`,
  (N: number, P: number) => `${N} people watched a netball game. ${P}% of them wore the home team's colours. How many people wore the home team's colours?`,
  (N: number, P: number) => `A school library has ${N} books. ${P}% of them are about animals. How many books about animals are there?`,
  (N: number, P: number) => `There are ${N} sheep in a paddock. ${P}% of them are lambs. How many lambs are there?`,
  (N: number, P: number) => `A school has ${N} students. ${P}% of them bike to school. How many students bike to school?`,
] as const;

const SALE_ITEMS = ['jersey', 'pair of shoes', 'skateboard', 'rugby ball', 'board game', 'scooter'] as const;

export const percentOf: QuestionTemplate = {
  id: `${TOPIC}.percent-of`,
  topicId: TOPIC,
  title: 'Find 1%, 10%, 20%, 25%, 50% and 75% of a number',
  difficulties: [1, 2, 3, 4],
  generate({ rng, difficulty }) {
    const plain = (P: number, maxM: number): TemplateOutput => {
      const { N } = wholeFor(rng, P, maxM);
      return {
        type: 'numeric',
        prompt: rng.chance(0.5) ? `Find ${P}% of ${num(N)}.` : `What is ${P}% of ${num(N)}?`,
        answer: percentValue(P, N),
        form: 'integer',
        calculator: 'not-allowed',
        hints: [`${P}% is ${HOW[P]!.fraction}.`, HOW[P]!.hint],
        solution: percentSteps(P, N),
      };
    };
    if (difficulty === 1) return plain(rng.pick([50, 10]), 50);
    if (difficulty === 2) {
      const P = rng.pick([25, 20, 1]);
      return plain(P, P === 1 ? 15 : P === 25 ? 30 : 20);
    }
    if (difficulty === 3) {
      if (rng.chance(0.5)) return plain(75, 25);
      const P = rng.pick([50, 10, 25, 75, 20]);
      const { N } = wholeFor(rng, P, P === 10 ? 20 : 25);
      return {
        type: 'numeric',
        prompt: rng.pick(ITEMS)(N, P),
        answer: percentValue(P, N),
        form: 'integer',
        calculator: 'not-allowed',
        hints: [`${P}% is ${HOW[P]!.fraction}.`, HOW[P]!.hint],
        solution: percentSteps(P, N),
      };
    }
    // difficulty 4: two steps
    const kind = rng.pick(['complement', 'sale', 'compare'] as const);
    if (kind === 'complement') {
      const P = rng.pick([10, 20, 25, 50, 75]);
      const { N } = wholeFor(rng, P, P === 10 ? 20 : 30);
      const part = percentValue(P, N);
      return {
        type: 'numeric',
        prompt: `There are ${N} people at a hui. ${P}% of them are children. The rest are adults. How many adults are there?`,
        answer: N - part,
        form: 'integer',
        marks: 2,
        calculator: 'not-allowed',
        hints: [`Find ${P}% of ${N} first.`, 'Then take that away from the total.'],
        solution: `${percentSteps(P, N)}\n\nSo ${part} are children, and the adults are $${N} - ${part} = ${N - part}$.\n\n(Or: the adults are ${100 - P}% of ${N}.)`,
      };
    }
    if (kind === 'sale') {
      const P = rng.pick([10, 20, 25, 50]);
      const { N } = wholeFor(rng, P, P === 10 ? 15 : P === 20 ? 30 : 40);
      const off = percentValue(P, N);
      const item = rng.pick(SALE_ITEMS);
      return {
        type: 'numeric',
        prompt: `A ${item} usually costs ${cash(N)}. In a sale it has ${P}% off. What is the sale price?`,
        answer: N - off,
        units: '$',
        marks: 2,
        calculator: 'not-allowed',
        hints: [`Find ${P}% of ${cash(N)}. That is how much you save.`, 'Take the saving away from the usual price.'],
        solution: `${percentSteps(P, N)}\n\nSo you save ${cash(off)}. The sale price is ${cash(N)} − ${cash(off)} = ${cash(N - off)}.`,
      };
    }
    for (;;) {
      const [P1, P2] = rng.sample([10, 20, 25, 50, 75], 2) as [number, number];
      const A = wholeFor(rng, P1, P1 === 10 ? 12 : 20).N;
      const B = wholeFor(rng, P2, P2 === 10 ? 12 : 20).N;
      const v1 = percentValue(P1, A);
      const v2 = percentValue(P2, B);
      if (v1 === v2) continue;
      return {
        type: 'numeric',
        prompt: `Which is bigger: ${P1}% of ${A}, or ${P2}% of ${B}? Work out both, then find **how much bigger** the larger one is.`,
        answer: Math.abs(v1 - v2),
        form: 'integer',
        marks: 2,
        calculator: 'not-allowed',
        hints: ['Work out each percentage on its own.', 'Then subtract the smaller answer from the bigger one.'],
        solution: `${P1}% of ${A}: ${percentSteps(P1, A)}\n\n${P2}% of ${B}: ${percentSteps(P2, B)}\n\n${v1 > v2 ? `${P1}% of ${A}` : `${P2}% of ${B}`} is bigger, by $${Math.max(v1, v2)} - ${Math.min(v1, v2)} = ${Math.abs(v1 - v2)}$.`,
      };
    }
  },
};

/** How many lots of P% make 100%. */
const LOTS: Record<number, number> = { 50: 2, 10: 10, 25: 4, 20: 5, 1: 100 };

function wholeSteps(P: number, X: number): string {
  if (P === 75) {
    const one = X / 3;
    return `75% is three quarters, so ${X} is 3 equal parts. One part (25%) is $${X} \\div 3 = ${one}$.\n\n100% is 4 parts: $4 \\times ${one} = ${4 * one}$.`;
  }
  const k = LOTS[P]!;
  return `There are ${k} lots of ${P}% in 100%, so multiply by ${k}: $${tex(X)} \\times ${k} = ${tex(X * k)}$.`;
}
const wholeOf = (P: number, X: number) => (P === 75 ? (X / 3) * 4 : X * LOTS[P]!);
function wholeHints(P: number, X: number): string[] {
  if (P === 75) return ['75% is three quarters, so the number you know is 3 equal parts.', `Find 25% (one part) first: ${X} ÷ 3. The whole is 4 parts.`];
  return [`${P}% is ${HOW[P]!.fraction} of the whole.`, `How many lots of ${P}% make 100%?`];
}

export const findWhole: QuestionTemplate = {
  id: `${TOPIC}.find-whole`,
  topicId: TOPIC,
  title: 'Find the whole (100%) from a percentage',
  difficulties: [3, 4, 5],
  generate({ rng, difficulty }) {
    if (difficulty === 3 || difficulty === 4) {
      const P = difficulty === 3 ? rng.pick([50, 10, 25]) : rng.pick([75, 75, 20, 1]);
      const X = P === 75 ? 3 * rng.int(2, 20) : P === 1 ? rng.int(2, 9) : P === 50 ? rng.int(4, 60) : rng.int(2, 30);
      return {
        type: 'numeric',
        prompt: rng.chance(0.5) ? `${P}% of a number is ${X}. What is the number?` : `If ${P}% is ${X}, what is 100%?`,
        answer: wholeOf(P, X),
        form: 'integer',
        ...(P === 75 && { marks: 2 }),
        calculator: 'not-allowed',
        hints: wholeHints(P, X),
        solution: `${wholeSteps(P, X)}\n\nCheck: ${P}% of ${num(wholeOf(P, X))} is ${X} ✓`,
      };
    }
    const name = rng.pick(NAMES);
    const P = rng.pick([75, 50, 25, 20]);
    const ctx = rng.pick(['camp', 'book', 'tank', 'savings'] as const);
    // Camp: keep the class to 12–32 students. Otherwise the known part is scaled up below.
    const X =
      ctx === 'camp'
        ? P === 75
          ? 3 * rng.int(3, 8)
          : P === 50
            ? rng.int(6, 16)
            : P === 25
              ? rng.int(3, 8)
              : rng.int(3, 6)
        : P === 75
          ? 3 * rng.int(2, 10)
          : rng.int(3, 18);
    const W = wholeOf(P, X);
    const rest = ctx === 'camp' && rng.chance(0.5);
    let prompt: string;
    let units: string | undefined;
    let tail = '';
    if (ctx === 'camp') {
      const room = rng.int(1, 12);
      prompt = `${P}% of the students in Room ${room} went on camp. That was ${X} students. ${rest ? 'How many students in Room ' + room + ' did not go on camp?' : 'How many students are in Room ' + room + '?'}`;
      if (rest) tail = `\n\nThe students who did not go: $${W} - ${X} = ${W - X}$.`;
    } else if (ctx === 'book') {
      prompt = `${name} has read ${P}% of a book. That is ${X * 5} pages. How many pages are in the book?`;
    } else if (ctx === 'tank') {
      prompt = `A water tank is ${P}% full. It has ${X * 10} L of water in it. How much water does the tank hold when it is full?`;
      units = 'L';
    } else {
      prompt = `${name} has saved ${P}% of the cost of a new bike. So far ${name} has saved ${cash(X * 5)}. How much does the bike cost?`;
      units = '$';
    }
    const scale = ctx === 'book' || ctx === 'savings' ? 5 : ctx === 'tank' ? 10 : 1;
    const known = X * scale;
    const whole = W * scale;
    return {
      type: 'numeric',
      prompt,
      answer: rest ? W - X : whole,
      ...(units ? { units } : { form: 'integer' as const }),
      marks: 2,
      calculator: 'not-allowed',
      hints: wholeHints(P, known),
      solution: `${wholeSteps(P, known)}${tail}`,
    };
  },
};

/** How a percentage looks as a fraction, decimal or percentage (for KaTeX). */
function showAs(p: number, form: 'frac' | 'dec' | 'pct'): string {
  if (form === 'pct') return `${p}\\%`;
  if (form === 'dec') return tex(p / 100);
  const [a, b] = simp(p, 100);
  return [2, 4, 5, 10].includes(b) ? fr(a, b) : fr(p, 100);
}

const TOTALS = [10, 20, 25, 50] as const;

export const comparing: QuestionTemplate = {
  id: `${TOPIC}.compare`,
  topicId: TOPIC,
  title: 'Use percentages to compare',
  difficulties: [2, 3, 4, 5],
  generate({ rng, difficulty }) {
    const name = rng.pick(NAMES);
    if (difficulty === 2) {
      const small = rng.chance(0.25);
      const T = small ? rng.pick([2, 4, 5]) : rng.pick(TOTALS);
      const k = rng.int(1, T - 1);
      const p = (k * 100) / T;
      const prompt = small
        ? `What percentage is ${k} out of ${T}?`
        : rng.pick([
            `${name} got ${k} out of ${T} in a spelling test. What percentage is that?`,
            `In a class of ${T} students, ${k} walk to school. What percentage of the class walk to school?`,
            `${k} out of ${T} people chose sushi for lunch. What percentage chose sushi?`,
            `What percentage is ${k} out of ${T}?`,
          ]);
      return {
        type: 'numeric',
        prompt,
        answer: p,
        units: '%',
        calculator: 'not-allowed',
        hints: ['Per cent means "out of 100". Make an equivalent fraction with denominator 100.', `What do you multiply ${T} by to get 100?`],
        solution: `$${fr(k, T)} = ${fr(`${k} \\times ${100 / T}`, `${T} \\times ${100 / T}`)} = ${fr(p, 100)}$, which is ${p}%.`,
      };
    }
    if (difficulty === 3) {
      const p1 = rng.pick([10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 35, 45, 65, 15, 5]);
      let p2 = p1;
      if (!rng.chance(0.2)) {
        const deltas = [-15, -10, -5, -1, 1, 5, 10, 15].filter((d) => p1 + d >= 1 && p1 + d <= 99);
        p2 = p1 + rng.pick(deltas);
      }
      const forms = rng.sample(['frac', 'dec', 'pct'] as const, 2) as ['frac' | 'dec' | 'pct', 'frac' | 'dec' | 'pct'];
      const L = showAs(p1, forms[0]);
      const R = showAs(p2, forms[1]);
      const sym = cmp(p1, p2);
      const explain = (p: number, f: 'frac' | 'dec' | 'pct', s: string) => (f === 'pct' ? `$${s}$` : `$${s} = ${p}\\%$`);
      return {
        type: 'cloze',
        prompt: `Choose the symbol that makes this true.\n\n$${L}$ [[s]] $${R}$`,
        blanks: [{ id: 's', accepted: [sym], options: [...CMP] }],
        calculator: 'not-allowed',
        hints: ['Change both into the same form. Percentages are often easiest.', 'A fraction or a decimal can be written as hundredths, and hundredths are per cent.'],
        solution: `As percentages: ${explain(p1, forms[0], L)} and ${explain(p2, forms[1], R)}.\n\n${p1}% ${cmpWords[sym]} ${p2}%, so $${L} ${sym} ${R}$.`,
      };
    }
    let other = rng.pick(NAMES);
    while (other === name) other = rng.pick(NAMES);
    if (difficulty === 4) {
      for (;;) {
        const [T1, T2] = rng.sample([10, 20, 25, 50, 5, 4], 2) as [number, number];
        const s1 = rng.int(1, T1 - 1);
        const p1 = (s1 * 100) / T1;
        let s2: number;
        if (rng.chance(0.15) && (p1 * T2) % 100 === 0) s2 = (p1 * T2) / 100;
        else s2 = rng.int(1, T2 - 1);
        const p2 = (s2 * 100) / T2;
        if (s2 === 0 || s2 === T2) continue;
        // Most of the time, make the person with more marks NOT the one with the higher percentage.
        if (p1 !== p2 && (s1 > s2) === (p1 > p2) && rng.chance(0.6)) continue;
        const same = 'They got the same percentage';
        const winner = p1 === p2 ? same : p1 > p2 ? name : other;
        const fb = (who: string, s: number, T: number, p: number, rivalP: number) =>
          p1 === p2
            ? `Both are ${p1}%: ${s1} out of ${T1} and ${s2} out of ${T2} are equivalent.`
            : `${who} got ${s} out of ${T}, which is ${p}%. That is less than ${rivalP}%.${s > (who === name ? s2 : s1) ? ` ${who} got more marks, but the quiz was out of more.` : ''}`;
        const mcq = mcqFields(rng, { text: winner }, [
          { text: name, feedback: fb(name, s1, T1, p1, p2) },
          { text: other, feedback: fb(other, s2, T2, p2, p1) },
          { text: same, feedback: `They got different percentages: ${name} got ${p1}% and ${other} got ${p2}%.` },
        ]);
        return {
          type: 'mcq',
          prompt: `${name} got ${s1} out of ${T1} in a maths quiz. ${other} got ${s2} out of ${T2} in a different maths quiz. Who got the higher percentage?`,
          ...mcq,
          marks: 2,
          calculator: 'not-allowed',
          hints: ['The quizzes are out of different totals, so you cannot just compare the marks.', 'Change each score into a percentage (a fraction out of 100).'],
          solution: `${name}: $${fr(s1, T1)} = ${fr(p1, 100)} = ${p1}\\%$.\n\n${other}: $${fr(s2, T2)} = ${fr(p2, 100)} = ${p2}\\%$.\n\n${p1 === p2 ? 'They got the same percentage.' : `${p1 > p2 ? name : other} got the higher percentage.`}`,
        };
      }
    }
    // difficulty 5: same proportion, different total
    for (;;) {
      const [T1, T2] = rng.sample([10, 20, 25, 40, 50, 100], 2) as [number, number];
      const p = rng.int(1, 19) * 5;
      if ((p * T1) % 100 !== 0 || (p * T2) % 100 !== 0) continue;
      const s1 = (p * T1) / 100;
      const s2 = (p * T2) / 100;
      const biscuits = rng.chance(0.5);
      const prompt = biscuits
        ? `A packet of ${T1} biscuits has ${s1} chocolate biscuits. A different packet of ${T2} biscuits has the same percentage of chocolate biscuits. How many chocolate biscuits are in the packet of ${T2}?`
        : `${name} scored ${s1} out of ${T1} in a test. ${other} got the same percentage in a test out of ${T2}. What did ${other} score?`;
      return {
        type: 'numeric',
        prompt,
        answer: s2,
        form: 'integer',
        marks: 2,
        calculator: 'not-allowed',
        hints: [`Change ${s1} out of ${T1} into a percentage first.`, `Then find that percentage of ${T2}.`],
        solution: `$${fr(s1, T1)} = ${fr(p, 100)} = ${p}\\%$.\n\n${p}% is $${fr(...simp(p, 100))}$, and $${fr(...simp(p, 100))}$ of ${T2} is $${T2} \\div ${simp(p, 100)[1]} \\times ${simp(p, 100)[0]} = ${s2}$.${
          T2 % T1 === 0 ? `\n\n(Or: ${T2} is ${T2 / T1} times ${T1}, so the answer is $${T2 / T1} \\times ${s1} = ${s2}$.)` : T1 % T2 === 0 ? `\n\n(Or: ${T2} is ${T1} divided by ${T1 / T2}, so the answer is $${s1} \\div ${T1 / T2} = ${s2}$.)` : ''
        }`,
      };
    }
  },
};

export const templates: QuestionTemplate[] = [convert, percentOf, findWhole, comparing];
