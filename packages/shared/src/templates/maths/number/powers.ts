import type { QuestionTemplate } from '../../types';
import { clean, frac, lcm, num, tex } from '../../format';
import { ACCENT, dot, label, line, svgDoc } from '../../svg';
import { mcqFields, orderItems, simp } from './helpers';

// m9.num.powers — powers (including 0, 1 and negative exponents), square roots between
// perfect squares, and scientific notation. Exponent laws are Year 10, so they aren't used.

/** "2 × 2 × 2" for a^n (n ≥ 2). */
const repeated = (a: number, n: number) => Array.from({ length: n }, () => String(a)).join(' \\times ');

/** a^e as an exact fraction [numerator, denominator]. */
function powerFraction(a: number, e: number): [number, number] {
  return e >= 0 ? [a ** e, 1] : [1, a ** -e];
}

/** Explains a^e (any integer e) in one line of LaTeX + prose. */
function explainPower(a: number, e: number): string {
  if (e === 0) return `$${a}^{0} = 1$ (any non-zero number to the power 0 is 1)`;
  if (e === 1) return `$${a}^{1} = ${a}$`;
  if (e > 1) return `$${a}^{${e}} = ${repeated(a, e)} = ${tex(a ** e)}$`;
  const p = a ** -e;
  return `$${a}^{${e}} = \\frac{1}{${a}^{${-e}}} = ${frac(1, p)}$`;
}

const POSITIVE_POWERS: Array<[number, number]> = [
  [3, 2], [3, 3], [3, 4], [4, 2], [4, 3], [5, 2], [5, 3], [6, 2], [7, 2], [8, 2], [9, 2],
  [10, 2], [10, 3], [10, 4], [10, 5], [10, 6], [1, 5], [1, 9], [11, 2], [12, 2], [6, 3],
];

const NEGATIVE_POWERS: Array<[number, number]> = [
  [2, 1], [2, 2], [2, 3], [2, 4], [2, 5], [3, 1], [3, 2], [3, 3], [4, 1], [4, 2], [4, 3], [5, 1], [5, 2], [5, 3],
  [6, 1], [6, 2], [7, 1], [7, 2], [8, 1], [8, 2], [9, 1], [9, 2], [10, 1], [10, 2], [10, 3], [10, 4],
];

export const evaluatePowers: QuestionTemplate = {
  id: 'm9.num.powers.evaluate',
  topicId: 'm9.num.powers',
  title: 'Evaluate powers, including zero and negative exponents',
  difficulties: [1, 2, 3, 4],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      const kind = rng.pick(['pow2', 'power', 'zeroOne'] as const);
      if (kind === 'pow2') {
        const n = rng.int(0, 10);
        const doubling = Array.from({ length: Math.max(n, 1) }, (_, i) => num(2 ** (i + 1))).join(', ');
        return {
          type: 'numeric',
          prompt: `Work out $2^{${n}}$.`,
          answer: 2 ** n,
          form: 'integer',
          calculator: 'not-allowed',
          hints: ['The exponent tells you how many 2s to multiply together.', 'Keep doubling: $2^1 = 2$, $2^2 = 4$, $2^3 = 8$, …'],
          solution:
            n === 0
              ? '$2^0 = 1$. Any non-zero number to the power 0 is 1. (Follow the pattern: $2^2 = 4$, $2^1 = 2$, $2^0 = 1$, halving each time.)'
              : n === 1
                ? '$2^1 = 2$. A power of 1 is just the number itself.'
                : `Keep doubling: ${doubling}.\n\nSo $2^{${n}} = ${tex(2 ** n)}$.`,
        };
      }
      if (kind === 'power') {
        const [a, n] = rng.pick(POSITIVE_POWERS);
        return {
          type: 'numeric',
          prompt: `Work out $${a}^{${n}}$.`,
          answer: a ** n,
          form: 'integer',
          calculator: 'not-allowed',
          hints: [`$${a}^{${n}}$ means ${n} lots of ${a} multiplied together, not $${a} \\times ${n}$.`],
          solution: `${explainPower(a, n)}${a === 10 ? `\n\nA power of 10 is 1 followed by ${n} zeros.` : ''}${a === 1 ? '\n\n1 multiplied by itself is always 1.' : ''}`,
        };
      }
      const a = rng.int(2, 60);
      const e = rng.pick([0, 1]);
      return {
        type: 'numeric',
        prompt: `Work out $${a}^{${e}}$.`,
        answer: e === 0 ? 1 : a,
        form: 'integer',
        calculator: 'not-allowed',
        hints: [e === 0 ? `Look at the pattern $${a}^2$, $${a}^1$, … Each step down divides by ${a}.` : 'A power of 1 means just one of the number.'],
        solution:
          e === 0
            ? `$${a}^0 = 1$. Following the pattern, $${a}^1 = ${a}$ and dividing by ${a} again gives $${a}^0 = ${a} \\div ${a} = 1$.`
            : `$${a}^1 = ${a}$. A power of 1 is just the number itself.`,
      };
    }
    if (difficulty === 2) {
      const [a, n] = rng.pick(NEGATIVE_POWERS);
      const p = a ** n;
      return {
        type: 'numeric',
        prompt: `Write $${a}^{-${n}}$ as a fraction.`,
        answer: 1 / p,
        form: 'fraction',
        calculator: 'not-allowed',
        hints: ['A negative exponent means divide by the base that many times, starting from 1.', `$${a}^{-${n}} = \\frac{1}{${a}^{${n}}}$`],
        solution: `$${a}^{-${n}} = \\frac{1}{${a}^{${n}}}${n > 1 ? ` = \\frac{1}{${repeated(a, n)}}` : ''} = ${frac(1, p)}$\n\nFollow the pattern: each time the exponent goes down by 1, divide by ${a}: $${a}^1 = ${a}$, $${a}^0 = 1$, $${a}^{-1} = ${frac(1, a)}$${n > 1 ? ', …' : ''}`,
      };
    }
    if (difficulty === 3) {
      const kind = rng.pick(['pos', 'neg', 'neg', 'decimal'] as const);
      if (kind === 'decimal') {
        const n = rng.int(1, 5);
        const value = clean(10 ** -n);
        return {
          type: 'numeric',
          prompt: `Find $n$ if $10^{n} = ${tex(value)}$.`,
          answer: -n,
          form: 'integer',
          calculator: 'not-allowed',
          hints: ['Write the decimal as a fraction with a power of 10 on the bottom.', 'A negative exponent gives a number smaller than 1.'],
          solution: `$${tex(value)} = \\frac{1}{${tex(10 ** n)}} = \\frac{1}{10^{${n}}} = 10^{-${n}}$, so $n = -${n}$.`,
        };
      }
      const list: Array<[number, number]> =
        kind === 'pos'
          ? [[2, 5], [2, 6], [2, 7], [2, 8], [2, 9], [2, 10], [3, 3], [3, 4], [3, 5], [4, 3], [4, 4], [5, 3], [5, 4], [10, 4], [10, 6], [6, 3], [7, 3]]
          : NEGATIVE_POWERS.filter(([, e]) => e >= 2);
      const [a, k] = rng.pick(list);
      const p = a ** k;
      const neg = kind === 'neg';
      return {
        type: 'numeric',
        prompt: `Find $n$ if $${a}^{n} = ${neg ? frac(1, p) : tex(p)}$.`,
        answer: neg ? -k : k,
        form: 'integer',
        calculator: 'not-allowed',
        hints: [
          neg ? `First find which power of ${a} gives ${num(p)}.` : `Keep multiplying by ${a} and count the steps until you reach ${num(p)}.`,
          neg ? `One over a power means a negative exponent: $\\frac{1}{${a}^{k}} = ${a}^{-k}$.` : `Count how many ${a}s are multiplied together.`,
        ],
        solution: neg
          ? `$${a}^{${k}} = ${repeated(a, k)} = ${tex(p)}$, so $${frac(1, p)} = \\frac{1}{${a}^{${k}}} = ${a}^{-${k}}$.\n\nSo $n = -${k}$.`
          : `$${repeated(a, k)} = ${tex(p)}$, which is ${k} lots of ${a}, so $n = ${k}$.`,
      };
    }
    // difficulty 4: add or subtract two powers, at least one with a negative exponent
    const bases = [2, 3, 4, 5, 10];
    let a1 = 2;
    let e1 = -1;
    let a2 = 2;
    let e2 = -2;
    let op: '+' | '-' = '+';
    let top = 0;
    let L = 1;
    let t1 = 0;
    let t2 = 0;
    for (let attempt = 0; attempt < 100; attempt++) {
      a1 = rng.pick(bases);
      a2 = rng.chance(0.5) ? a1 : rng.pick(bases);
      e1 = rng.int(-3, 2);
      e2 = rng.int(-3, -1);
      if (a1 === a2 && e1 === e2) continue;
      if (a1 ** Math.abs(e1) > 1000 || a2 ** Math.abs(e2) > 1000) continue;
      op = rng.pick(['+', '-'] as const);
      const [n1, d1] = powerFraction(a1, e1);
      const [n2, d2] = powerFraction(a2, e2);
      L = lcm(d1, d2);
      t1 = n1 * (L / d1);
      t2 = n2 * (L / d2);
      top = op === '+' ? t1 + t2 : t1 - t2;
      if (top !== 0) break;
    }
    const [an, ad] = simp(top, L);
    const [n1, d1] = powerFraction(a1, e1);
    const [n2, d2] = powerFraction(a2, e2);
    const terminating = 10000 % ad === 0;
    return {
      type: 'numeric',
      prompt: `Work out $${a1}^{${e1}} ${op} ${a2}^{${e2}}$. Give your answer as a fraction${terminating ? ' or a decimal' : ''}.`,
      answer: an / ad,
      marks: 2,
      calculator: 'not-allowed',
      hints: ['Work out each power on its own first.', 'Then add or subtract the fractions using a common denominator.'],
      solution: [
        `${explainPower(a1, e1)} and ${explainPower(a2, e2)}.`,
        `$${frac(n1, d1)} ${op} ${frac(n2, d2)} = ${frac(t1, L, true)} ${op} ${frac(t2, L, true)} = ${frac(top, L, true)}${an !== top ? ` = ${frac(an, ad)}` : ''}${terminating && ad !== 1 ? ` = ${tex(clean(an / ad))}` : ''}$`,
      ].join('\n\n'),
    };
  },
};

/** Number line from lo to hi with points labelled A–D at the given positions. */
function rootLineSvg(lo: number, hi: number, points: number[]): string {
  const x0 = 30;
  const x1 = 370;
  const y = 60;
  const xAt = (v: number) => x0 + ((x1 - x0) * (v - lo)) / (hi - lo);
  let body = line({ x: x0 - 12, y }, { x: x1 + 12, y });
  for (let v = lo; v <= hi; v++) {
    body += line({ x: xAt(v), y: y - 9 }, { x: xAt(v), y: y + 9 });
    body += label({ x: xAt(v), y: y + 24 }, String(v), { size: 15 });
  }
  points.forEach((p, i) => {
    body += dot({ x: xAt(p), y }, 5, ACCENT);
    body += label({ x: xAt(p), y: y - 22 }, 'ABCD'[i]!, { size: 16, bold: true, fill: ACCENT });
  });
  return svgDoc(400, 100, body);
}

export const squareRoots: QuestionTemplate = {
  id: 'm9.num.powers.square-roots',
  topicId: 'm9.num.powers',
  title: 'Square roots and where they lie between perfect squares',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      const k = rng.int(2, 15);
      if (rng.chance(0.5)) {
        return {
          type: 'numeric',
          prompt: `Work out $\\sqrt{${k * k}}$.`,
          answer: k,
          form: 'integer',
          calculator: 'not-allowed',
          hints: [`Which number multiplied by itself gives ${k * k}?`],
          solution: `$${k} \\times ${k} = ${k * k}$, so $\\sqrt{${k * k}} = ${k}$.`,
        };
      }
      return {
        type: 'numeric',
        prompt: `Work out $${k}^2$.`,
        answer: k * k,
        form: 'integer',
        calculator: 'not-allowed',
        hints: [`Squaring means multiplying a number by itself, not doubling it.`],
        solution: `$${k}^2 = ${k} \\times ${k} = ${k * k}$.`,
      };
    }
    // a non-square n with k² < n < (k+1)²
    const k = rng.int(3, 14);
    const n = rng.int(k * k + 1, (k + 1) * (k + 1) - 1);
    const between = `$${k}^2 = ${k * k}$ and $${k + 1}^2 = ${(k + 1) * (k + 1)}$. Since ${k * k} < ${n} < ${(k + 1) * (k + 1)}, $\\sqrt{${n}}$ is between ${k} and ${k + 1}.`;
    const closerLow = n - k * k <= (k + 1) * (k + 1) - n;
    if (difficulty === 2) {
      const half = Math.floor(n / 2);
      const m = mcqFields(
        rng,
        { text: `Between ${k} and ${k + 1}` },
        [
          { text: `Between ${half} and ${half + 1}`, feedback: `That is roughly half of ${n}. A square root is the number that multiplies by itself to give ${n}.` },
          { text: `Between ${k - 1} and ${k}`, feedback: `$${k}^2 = ${k * k}$, which is already less than ${n}, so the root is more than ${k}.` },
          { text: `Between ${k + 1} and ${k + 2}`, feedback: `$${k + 1}^2 = ${(k + 1) * (k + 1)}$, which is more than ${n}, so the root is less than ${k + 1}.` },
          { text: `Between ${k + 2} and ${k + 3}`, feedback: `$${k + 2}^2 = ${(k + 2) * (k + 2)}$, which is far more than ${n}.` },
        ],
      );
      return {
        type: 'mcq',
        prompt: `Between which two consecutive whole numbers does $\\sqrt{${n}}$ lie?`,
        ...m,
        calculator: 'not-allowed',
        hints: [`List the perfect squares near ${n}: …, ${(k - 1) * (k - 1)}, ${k * k}, ${(k + 1) * (k + 1)}, …`, `Which two perfect squares is ${n} between?`],
        solution: between,
      };
    }
    // difficulty 3: which letter marks √n on a number line?
    const root = Math.sqrt(n);
    const f = root - k;
    let inside = k + (1 - f);
    if (Math.abs(inside - root) < 0.3) inside = f < 0.5 ? k + 0.85 : k + 0.15;
    // One distractor in the same gap (so you must decide which end it's closer to) and two
    // in other gaps, chosen at random so the answer can be any letter.
    const others = rng.sample([k - 1.5, k - 0.5, k + 1.5, k + 2.5], 2);
    const positions = [root, inside, ...others].sort((x, y) => x - y);
    const letter = 'ABCD'[positions.indexOf(root)]!;
    const svg = rootLineSvg(k - 2, k + 3, positions);
    const options = ['A', 'B', 'C', 'D'].map((l) => ({ id: l.toLowerCase(), text: l }));
    return {
      type: 'mcq',
      prompt: `Which letter shows the best position of $\\sqrt{${n}}$ on the number line?`,
      figure: {
        svg,
        alt: `Number line from ${k - 2} to ${k + 3} with four points: ${positions.map((p, i) => `${'ABCD'[i]} at about ${num(Math.round(p * 10) / 10)}`).join(', ')}.`,
      },
      options,
      correct: letter.toLowerCase(),
      shuffle: false,
      calculator: 'not-allowed',
      hints: ['Find the two perfect squares either side of the number under the root sign.', `Is ${n} closer to ${k * k} or to ${(k + 1) * (k + 1)}?`],
      solution: `${between}\n\n${n} is closer to ${closerLow ? k * k : (k + 1) * (k + 1)} than to ${closerLow ? (k + 1) * (k + 1) : k * k}, so $\\sqrt{${n}}$ is closer to ${closerLow ? k : k + 1}. (In fact $\\sqrt{${n}} \\approx ${tex(Math.round(root * 100) / 100)}$.)\n\nThe best position is **${letter}**.`,
    };
  },
};

interface Sci {
  m: number;
  k: number;
  tex: string;
  value: number;
}

/** A number m × 10^k with 1 ≤ m < 10 and 1–3 significant figures. */
function randomSci(rng: { int(a: number, b: number): number; pick<T>(x: readonly T[]): T }, k: number): Sci {
  const digits = rng.pick([1, 2, 2, 3]);
  let M = rng.int(10 ** (digits - 1), 10 ** digits - 1);
  if (digits > 1 && M % 10 === 0) M += 1;
  const m = clean(M / 10 ** (digits - 1));
  return { m, k, tex: `${tex(m)} \\times 10^{${k}}`, value: clean(m * 10 ** k) };
}

const sciTex = (m: number, k: number) => `$${tex(m)} \\times 10^{${k}}$`;

export const scientificNotation: QuestionTemplate = {
  id: 'm9.num.powers.scientific-notation',
  topicId: 'm9.num.powers',
  title: 'Scientific notation: convert, write and order',
  difficulties: [2, 3, 4, 5],
  generate({ rng, difficulty }) {
    if (difficulty === 2) {
      const k = rng.pick([-4, -3, -2, -1, 2, 3, 4, 5, 6, 7]);
      const s = randomSci(rng, k);
      return {
        type: 'numeric',
        prompt: `Write $${s.tex}$ as an ordinary number.`,
        answer: s.value,
        calculator: 'not-allowed',
        hints: [
          k > 0 ? `Multiplying by $10^{${k}}$ makes the number bigger.` : `$10^{${k}}$ means dividing by $10^{${-k}}$, so the number gets smaller.`,
          `Move the decimal point ${Math.abs(k)} place${Math.abs(k) === 1 ? '' : 's'} to the ${k > 0 ? 'right' : 'left'}.`,
        ],
        solution: `${k > 0 ? `Multiplying by $10^{${k}} = ${tex(10 ** k)}$ moves the decimal point ${k} places to the right` : `Multiplying by $10^{${k}}$ is the same as dividing by ${num(10 ** -k)}, which moves the decimal point ${-k} place${k === -1 ? '' : 's'} to the left`}:\n\n$${s.tex} = ${tex(s.value)}$`,
      };
    }
    if (difficulty === 3) {
      const k = rng.pick([-5, -4, -3, -2, 2, 3, 4, 5, 6, 7]);
      const s = randomSci(rng, k);
      const m = mcqFields(
        rng,
        { text: sciTex(s.m, k) },
        [
          { text: sciTex(s.m, k + (rng.chance(0.5) ? 1 : -1)), feedback: 'The power of 10 is out by one. Count how many places the decimal point moves.' },
          { text: sciTex(clean(s.m * 10), k - 1), feedback: `This has the right value, but ${num(clean(s.m * 10))} is not between 1 and 10, so it isn't scientific notation.` },
          {
            text: sciTex(s.m, -k),
            feedback: 'Check the sign of the power: numbers of 10 or more have a positive power, and numbers less than 1 have a negative power.',
          },
        ],
      );
      return {
        type: 'mcq',
        prompt: `Write ${num(s.value)} in scientific notation.`,
        ...m,
        calculator: 'not-allowed',
        hints: ['Scientific notation is $a \\times 10^k$ where $1 \\le a < 10$.', 'Count how many places the decimal point has to move to make a number between 1 and 10.'],
        solution: `Move the decimal point to get a number between 1 and 10: $${tex(s.m)}$. That is ${Math.abs(k)} place${Math.abs(k) === 1 ? '' : 's'} ${k > 0 ? 'to the left, so the power is positive' : 'to the right, so the power is negative'}.\n\n${num(s.value)} $= ${s.tex}$`,
      };
    }
    if (difficulty === 4) {
      const items: Sci[] = [];
      const kBase = rng.int(-4, 5);
      // Two numbers with the same power (compare the front numbers), plus two others.
      const ks = [kBase, kBase, kBase + rng.pick([1, 2, 3]), rng.pick([-6, -5, -3, -2, -1]) - (kBase < 0 ? 2 : 0)];
      for (const k of ks) {
        for (let attempt = 0; attempt < 50; attempt++) {
          const s = randomSci(rng, k);
          if (items.every((x) => x.value !== s.value)) {
            items.push(s);
            break;
          }
        }
      }
      const sorted = [...items].sort((x, y) => x.k - y.k || x.m - y.m);
      const descending = rng.chance(0.3);
      if (descending) sorted.reverse();
      const shown = rng.shuffle(items);
      return {
        type: 'order',
        prompt: `Put these numbers in order from **${descending ? 'largest to smallest' : 'smallest to largest'}**:\n\n${shown.map((s) => `$${s.tex}$`).join(', ')}`,
        items: orderItems(rng, sorted.map((s) => `$${s.tex}$`)),
        marks: 2,
        calculator: 'not-allowed',
        hints: ['Compare the powers of 10 first: a bigger power means a bigger number (−2 is bigger than −5).', 'If two numbers have the same power of 10, compare the front numbers.'],
        solution: `Sort by the power of 10 first, then by the front number when the powers match.\n\nOrder: ${sorted.map((s) => `$${s.tex}$`).join(', ')}.`,
      };
    }
    // difficulty 5: rewrite a × 10^j (a not between 1 and 10) in proper scientific notation
    const s = randomSci(rng, 0);
    const shift = rng.pick([-2, -1, 1, 2]);
    let j = rng.int(-6, 8);
    if (j === 0) j = 3;
    const shown = clean(s.m * 10 ** shift);
    const k = j + shift;
    const m = mcqFields(
      rng,
      { text: sciTex(s.m, k) },
      [
        { text: sciTex(s.m, j - shift), feedback: `The power has moved the wrong way. ${num(shown)} = ${num(s.m)} × ${num(10 ** shift)}, so the power must ${shift > 0 ? 'go up' : 'go down'} by ${Math.abs(shift)}.` },
        { text: sciTex(s.m, j), feedback: 'Changing the front number changes the value, so the power of 10 must change to make up for it.' },
        { text: sciTex(s.m, k + (shift > 0 ? 1 : -1)), feedback: 'The power is out by one. Count how many places the decimal point moved.' },
      ],
    );
    return {
      type: 'mcq',
      prompt: `$${tex(shown)} \\times 10^{${j}}$ is not in scientific notation. Which of these is the same number written in scientific notation?`,
      ...m,
      marks: 2,
      calculator: 'not-allowed',
      hints: [
        'First move the decimal point in the front number to make a number between 1 and 10.',
        'If the front number becomes 10 times smaller, the power of 10 must go up by 1 to keep the value the same (and the other way round).',
      ],
      solution: `$${tex(shown)} = ${tex(s.m)} \\times 10^{${shift}}$ (the decimal point moves ${Math.abs(shift)} place${Math.abs(shift) === 1 ? '' : 's'} ${shift > 0 ? 'left' : 'right'}).\n\nMaking the front number ${shift > 0 ? `${num(10 ** shift)} times smaller` : `${num(10 ** -shift)} times bigger`} means the power of 10 must ${shift > 0 ? `go up by ${shift}` : `go down by ${-shift}`}: $${j} ${shift > 0 ? '+' : '-'} ${Math.abs(shift)} = ${k}$.\n\nSo the answer is ${sciTex(s.m, k)}.`,
    };
  },
};
