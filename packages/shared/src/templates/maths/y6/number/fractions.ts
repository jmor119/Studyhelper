import type { Rng } from '../../../../rng';
import { lcm, NAMES } from '../../../format';
import type { QuestionTemplate } from '../../../types';
import { CMP, cmp, cmpWords, fr, fracOrMixed, fractionBar, fractionBars, mcqFields, mx, orderItems, properFraction, simp } from './fractions-helpers';

// m6.num.fractions: equivalent fractions and simplest form, mixed numbers and improper fractions,
// comparing and ordering, and adding and subtracting when one denominator is a multiple of the other.
// Everything is done with whole-number numerators and denominators, so answers are exact.

const TOPIC = 'm6.num.fractions';

/** Denominator pairs where the second is a multiple of the first (Year 6: one denominator is a multiple of the other). */
const RELATED: ReadonlyArray<readonly [number, number]> = [
  [2, 4], [2, 6], [2, 8], [2, 10], [3, 6], [3, 9], [3, 12], [4, 8], [4, 12], [5, 10], [6, 12], [2, 12],
];

const PLURAL: Record<number, string> = {
  2: 'halves', 3: 'thirds', 4: 'quarters', 5: 'fifths', 6: 'sixths', 8: 'eighths', 9: 'ninths', 10: 'tenths', 12: 'twelfths',
};
const SINGULAR: Record<number, string> = {
  2: 'half', 3: 'third', 4: 'quarter', 5: 'fifth', 6: 'sixth', 8: 'eighth', 9: 'ninth', 10: 'tenth', 12: 'twelfth',
};
const parts = (n: number, d: number) => `${n} ${n === 1 ? SINGULAR[d] : PLURAL[d]}`;

/** A related pair in a random order. */
function relatedPair(rng: Rng): [number, number] {
  const [a, b] = rng.pick(RELATED);
  return rng.chance(0.5) ? [a, b] : [b, a];
}

/** " = 9/4 = 2 1/4": simplified and mixed forms of top/L, when they differ from top/L. */
function finish(top: number, L: number): string {
  const [a, b] = simp(top, L);
  let s = '';
  if (b !== L) s += ` = ${b === 1 ? a : fr(a, b)}`;
  if (b !== 1 && a > b) s += ` = ${mx(Math.floor(a / b), a % b, b)}`;
  return s;
}

interface Mixed {
  w: number;
  r: number;
  d: number;
}
const texOf = (m: Mixed) => mx(m.w, m.r, m.d);
/** Value of a mixed number counted in L-ths. */
const inL = (m: Mixed, L: number) => (m.w * m.d + m.r) * (L / m.d);
function randMixed(rng: Rng, d: number, wMin: number, wMax: number): Mixed {
  const [r] = properFraction(rng, [d]);
  return { w: rng.int(wMin, wMax), r, d };
}

/** Worked lines for A ± B using the larger denominator. */
function addSubLines(A: Mixed, B: Mixed, op: '+' | '-'): string[] {
  const L = lcm(A.d, B.d);
  const a = inL(A, L);
  const b = inL(B, L);
  const top = op === '+' ? a + b : a - b;
  const conv = [A, B].filter((m) => m.w > 0 || m.d !== L).map((m) => `$${texOf(m)} = ${fr(inL(m, L), L)}$`);
  const lines: string[] = [];
  if (conv.length) {
    lines.push(`${A.w > 0 || B.w > 0 ? 'Change to improper fractions with' : 'Use'} the same denominator, ${L}: ${conv.join(' and ')}.`);
  }
  lines.push(`$${fr(a, L)} ${op} ${fr(b, L)} = ${fr(top, L)}${finish(top, L)}$`);
  return lines;
}

export const equivalent: QuestionTemplate = {
  id: `${TOPIC}.equivalent`,
  topicId: TOPIC,
  title: 'Equivalent fractions and simplest form',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      const [n, d] = properFraction(rng, [2, 3, 4, 5, 6, 8, 10]);
      const k = rng.int(2, 6);
      const top = rng.chance(0.5);
      return {
        type: 'numeric',
        prompt: `Find the missing number: $${fr(n, d)} = ${top ? fr('\\square', d * k) : fr(n * k, '\\square')}$`,
        answer: top ? n * k : d * k,
        form: 'integer',
        calculator: 'not-allowed',
        hints: [
          top ? `What do you multiply ${d} by to get ${d * k}?` : `What do you multiply ${n} by to get ${n * k}?`,
          `Whatever you do to the ${top ? 'denominator' : 'numerator'}, do the same to the ${top ? 'numerator' : 'denominator'}.`,
        ],
        solution: top
          ? `$${d} \\times ${k} = ${d * k}$, so multiply the numerator by ${k} too: $${n} \\times ${k} = ${n * k}$.\n\n$${fr(n, d)} = ${fr(n * k, d * k)}$`
          : `$${n} \\times ${k} = ${n * k}$, so multiply the denominator by ${k} too: $${d} \\times ${k} = ${d * k}$.\n\n$${fr(n, d)} = ${fr(n * k, d * k)}$`,
      };
    }
    if (difficulty === 2) {
      const [n, d] = properFraction(rng, [2, 3, 4, 5, 6, 8, 10, 12]);
      const k = rng.int(2, 6);
      const N = n * k;
      const D = d * k;
      const pic = D <= 24 && rng.chance(0.4);
      return {
        type: 'numeric',
        prompt: pic ? 'What fraction of the bar is shaded? Give your answer in simplest form.' : `Write $${fr(N, D)}$ in simplest form.`,
        ...(pic && { figure: { svg: fractionBar(D, N), alt: `A bar split into ${D} equal parts with ${N} of the parts shaded.` } }),
        answer: n / d,
        form: 'simplest-fraction',
        calculator: 'not-allowed',
        hints: [
          pic ? 'Write the shaded part as a fraction first: shaded parts over total parts.' : `Find a number that divides exactly into both ${N} and ${D}.`,
          'Divide the numerator and the denominator by the same number. Keep going until the only common factor is 1.',
        ],
        solution: `${pic ? `${N} of the ${D} parts are shaded, which is $${fr(N, D)}$.\n\n` : ''}The biggest number that divides into both ${N} and ${D} is ${k}. Divide the numerator and the denominator by ${k}:\n\n$${fr(N, D)} = ${fr(`${N} \\div ${k}`, `${D} \\div ${k}`)} = ${fr(n, d)}$\n\n${n} and ${d} have no common factor except 1, so this is the simplest form.`,
      };
    }
    // difficulty 3: spot the equivalent (or non-equivalent) fraction
    const [n, d] = properFraction(rng, [3, 4, 5, 6, 8, 10]);
    if (rng.chance(0.5)) {
      const k = rng.int(2, 5);
      const m = rng.pick([2, 3, 4, 5].filter((x) => x !== k));
      const mcq = mcqFields(rng, { text: `$${fr(n * k, d * k)}$` }, [
        { text: `$${fr(n + m, d + m)}$`, feedback: `This adds ${m} to the top and the bottom. Adding does not make an equivalent fraction. You need to multiply (or divide) both by the same number.` },
        { text: `$${fr(n * k, d * m)}$`, feedback: `The numerator was multiplied by ${k} but the denominator by ${m}. Both must be multiplied by the same number.` },
        { text: `$${fr(n, d * m)}$`, feedback: `Only the denominator was multiplied by ${m}. That makes the pieces smaller, so the fraction is smaller.` },
        { text: `$${fr(n * m, d)}$`, feedback: `Only the numerator was multiplied by ${m}. That gives more pieces of the same size, so the fraction is bigger.` },
      ]);
      return {
        type: 'mcq',
        prompt: `Which fraction is **equivalent** to $${fr(n, d)}$?`,
        ...mcq,
        calculator: 'not-allowed',
        hints: ['Equivalent fractions have the same value.', 'Look for one where the numerator and denominator have both been multiplied by the same number.'],
        solution: `$${fr(n, d)} = ${fr(`${n} \\times ${k}`, `${d} \\times ${k}`)} = ${fr(n * k, d * k)}$\n\nThe top and the bottom were both multiplied by ${k}, so the value stays the same.`,
      };
    }
    const m = rng.int(1, 4);
    const ks = rng.sample([2, 3, 4, 5, 6], 3);
    const mcq = mcqFields(
      rng,
      { text: `$${fr(n + m, d + m)}$` },
      ks.map((k) => ({ text: `$${fr(n * k, d * k)}$`, feedback: `This one is equivalent: both the top and the bottom of $${fr(n, d)}$ have been multiplied by ${k}.` })),
    );
    return {
      type: 'mcq',
      prompt: `Which fraction is **not** equivalent to $${fr(n, d)}$?`,
      ...mcq,
      calculator: 'not-allowed',
      hints: ['For each fraction, ask: were the top and the bottom multiplied by the same number?', 'Adding the same number to the top and bottom does not keep the value the same.'],
      solution: `${ks.map((k) => `$${fr(n * k, d * k)}$`).join(', ')} are all equivalent to $${fr(n, d)}$: multiply the top and bottom by ${ks.join(', ').replace(/, (\d)$/, ' or $1')}.\n\n$${fr(n + m, d + m)}$ has had ${m} **added** to the top and the bottom. That changes the value, so it is not equivalent.`,
    };
  },
};

export const mixedImproper: QuestionTemplate = {
  id: `${TOPIC}.mixed-improper`,
  topicId: TOPIC,
  title: 'Mixed numbers and improper fractions',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      const [r, d] = properFraction(rng, [2, 3, 4, 5, 6, 8, 10]);
      const w = rng.int(1, 4);
      const top = w * d + r;
      const pic = d <= 6 && w <= 2 && rng.chance(0.5);
      return {
        type: 'numeric',
        prompt: pic
          ? `Each bar is one whole. The shaded parts show $${fr(top, d)}$.\n\nWrite $${fr(top, d)}$ as a mixed number.`
          : `Write $${fr(top, d)}$ as a mixed number.`,
        ...(pic && { figure: { svg: fractionBars(d, top, w + 1), alt: `${w + 1} bars, each split into ${d} equal parts. ${top} parts are shaded altogether.` } }),
        answer: top / d,
        form: 'mixed',
        calculator: 'not-allowed',
        hints: [`How many whole groups of ${d} are there in ${top}?`, 'Whatever is left over becomes the numerator of the fraction part.'],
        solution: `Each whole is $${fr(d, d)}$. $${top} \\div ${d} = ${w}$ remainder ${r}.\n\nSo $${fr(top, d)} = ${mx(w, r, d)}$: ${w} whole${w > 1 ? 's' : ''} and $${fr(r, d)}$ more.`,
      };
    }
    if (difficulty === 2) {
      const [r, d] = properFraction(rng, [2, 3, 4, 5, 6, 8, 10, 12]);
      const w = rng.int(1, 6);
      const top = w * d + r;
      const howMany = rng.chance(0.4);
      return {
        type: 'numeric',
        prompt: howMany ? `How many ${PLURAL[d]} are there in $${mx(w, r, d)}$?` : `Find the missing number: $${mx(w, r, d)} = ${fr('\\square', d)}$`,
        answer: top,
        form: 'integer',
        calculator: 'not-allowed',
        hints: [`Each whole is $${fr(d, d)}$. How many ${PLURAL[d]} are in ${w} whole${w > 1 ? 's' : ''}?`, `Then add on the extra ${parts(r, d)}.`],
        solution: `Each whole has ${d} ${PLURAL[d]}, so ${w} whole${w > 1 ? 's have' : ' has'} $${w} \\times ${d} = ${w * d}$ ${PLURAL[d]}.\n\nAdd the extra ${r}: $${w * d} + ${r} = ${top}$.\n\nSo $${mx(w, r, d)} = ${fr(top, d)}$.`,
      };
    }
    // difficulty 3: compare an improper fraction with a mixed number
    const [dI, dM] = relatedPair(rng);
    const L = Math.max(dI, dM);
    const M = randMixed(rng, dM, 1, 3);
    const xM = inL(M, L);
    const step = L / dI;
    let nI = rng.chance(0.2) && xM % step === 0 ? xM / step : Math.round(xM / step) + rng.pick([-1, 1]);
    if (nI % dI === 0) nI += 1;
    if (nI <= dI) nI = dI + 1;
    const xI = nI * step;
    const impFirst = rng.chance(0.5);
    const left = impFirst ? fr(nI, dI) : texOf(M);
    const right = impFirst ? texOf(M) : fr(nI, dI);
    const [lv, rv] = impFirst ? [xI, xM] : [xM, xI];
    const sym = cmp(lv, rv);
    const conv = [`$${texOf(M)} = ${fr(M.w * M.d + M.r, M.d)}${M.d !== L ? ` = ${fr(xM, L)}` : ''}$`];
    if (dI !== L) conv.push(`$${fr(nI, dI)} = ${fr(xI, L)}$`);
    return {
      type: 'cloze',
      prompt: `Choose the symbol that makes this true.\n\n$${left}$ [[s]] $${right}$`,
      blanks: [{ id: 's', accepted: [sym], options: [...CMP] }],
      calculator: 'not-allowed',
      hints: ['Change the mixed number into an improper fraction.', `Make the denominators the same (use ${L}), then compare the numerators.`],
      solution: `Write both as ${PLURAL[L]}: ${conv.join(' and ')}.\n\n$${fr(lv, L)}$ ${cmpWords[sym]} $${fr(rv, L)}$, so $${left} ${sym} ${right}$.`,
    };
  },
};

/** Families of denominators where the biggest is a multiple of all the others. */
const FAMILIES = [
  { L: 8, dens: [2, 4, 8] },
  { L: 6, dens: [2, 3, 6] },
  { L: 12, dens: [2, 3, 4, 6, 12] },
  { L: 10, dens: [2, 5, 10] },
  { L: 12, dens: [3, 4, 6, 12] },
] as const;

/** Distinct values (in L-ths) whose simplest forms use at least `minDens` different denominators. */
function familyValues(rng: Rng, count: number, maxX: (L: number) => number): { L: number; xs: number[] } {
  for (let attempt = 0; attempt < 200; attempt++) {
    const fam = rng.pick(FAMILIES);
    const pool: number[] = [];
    for (let x = 1; x <= maxX(fam.L); x++) {
      const [, b] = simp(x, fam.L);
      if (x % fam.L !== 0 && (fam.dens as readonly number[]).includes(b)) pool.push(x);
    }
    const xs = rng.sample(pool, count);
    const dens = new Set(xs.map((x) => simp(x, fam.L)[1]));
    if (dens.size >= Math.min(3, count)) return { L: fam.L, xs };
  }
  return { L: 8, xs: [1, 2, 4, 6].slice(0, count) };
}

const simpTex = (x: number, L: number) => {
  const [a, b] = simp(x, L);
  return fr(a, b);
};

export const compare: QuestionTemplate = {
  id: `${TOPIC}.compare-order`,
  topicId: TOPIC,
  title: 'Compare and order fractions',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    if (difficulty === 2) {
      const [d1, d2] = rng.pick(RELATED);
      const m = d2 / d1;
      const [n1] = properFraction(rng, [d1]);
      let n2: number;
      if (rng.chance(0.15)) n2 = n1 * m;
      else {
        const near = [-2, -1, 1, 2].map((k) => n1 * m + k).filter((x) => x >= 1 && x < d2);
        n2 = rng.pick(near);
      }
      const smallFirst = rng.chance(0.5);
      const left = smallFirst ? fr(n1, d1) : fr(n2, d2);
      const right = smallFirst ? fr(n2, d2) : fr(n1, d1);
      const [lv, rv] = smallFirst ? [n1 * m, n2] : [n2, n1 * m];
      const sym = cmp(lv, rv);
      return {
        type: 'cloze',
        prompt: `Choose the symbol that makes this true.\n\n$${left}$ [[s]] $${right}$`,
        blanks: [{ id: 's', accepted: [sym], options: [...CMP] }],
        calculator: 'not-allowed',
        hints: [`${d2} is a multiple of ${d1}. Change $${fr(n1, d1)}$ into ${PLURAL[d2]}.`, 'When the denominators are the same, compare the numerators.'],
        solution: `$${fr(n1, d1)} = ${fr(`${n1} \\times ${m}`, `${d1} \\times ${m}`)} = ${fr(n1 * m, d2)}$\n\n$${fr(lv, d2)}$ ${cmpWords[sym]} $${fr(rv, d2)}$, so $${left} ${sym} ${right}$.`,
      };
    }
    if (difficulty === 3) {
      const { L, xs } = familyValues(rng, 4, (l) => l - 1);
      const largest = rng.chance(0.5);
      const best = largest ? Math.max(...xs) : Math.min(...xs);
      const [bn, bd] = simp(best, L);
      const mcq = mcqFields(
        rng,
        { text: `$${simpTex(best, L)}$` },
        xs
          .filter((x) => x !== best)
          .map((x) => {
            const [a, b] = simp(x, L);
            const bigNumbers = largest ? a > bn || b > bd : false;
            return {
              text: `$${simpTex(x, L)}$`,
              feedback: `$${simpTex(x, L)} = ${fr(x, L)}$ and $${simpTex(best, L)} = ${fr(best, L)}$, so $${simpTex(x, L)}$ is ${largest ? 'smaller' : 'bigger'}.${bigNumbers ? ' Bigger numbers in a fraction do not always mean a bigger fraction.' : ''}`,
            };
          }),
      );
      return {
        type: 'mcq',
        prompt: `Look at these fractions: ${xs.map((x) => `$${simpTex(x, L)}$`).join(', ')}.\n\nWhich one is the **${largest ? 'largest' : 'smallest'}**?`,
        ...mcq,
        calculator: 'not-allowed',
        hints: [`All the denominators divide into ${L}.`, `Change every fraction into ${PLURAL[L]}, then compare the numerators.`],
        solution: `In ${PLURAL[L]}: ${xs.map((x) => (simp(x, L)[1] === L ? `$${fr(x, L)}$` : `$${simpTex(x, L)} = ${fr(x, L)}$`)).join(', ')}.\n\nThe ${largest ? 'largest' : 'smallest'} is $${simpTex(best, L)}$.`,
      };
    }
    // difficulty 4: order four fractions, one of which may be bigger than 1
    const { L, xs } = familyValues(rng, 4, (l) => l + Math.floor(l / 2));
    const descending = rng.chance(0.4);
    const show = (x: number) => {
      const [a, b] = simp(x, L);
      return a > b && rng.chance(0.5) ? mx(Math.floor(a / b), a % b, b) : fr(a, b);
    };
    const shown = new Map(xs.map((x) => [x, show(x)]));
    const sorted = [...xs].sort((p, q) => (descending ? q - p : p - q));
    return {
      type: 'order',
      prompt: `Put these fractions in order from **${descending ? 'largest to smallest' : 'smallest to largest'}**.\n\n${xs.map((x) => `$${shown.get(x)}$`).join(', ')}`,
      items: orderItems(rng, sorted.map((x) => `$${shown.get(x)}$`)),
      marks: 2,
      calculator: 'not-allowed',
      hints: [`Change every fraction so it has the denominator ${L}.`, 'Any fraction bigger than 1 goes after all the fractions less than 1.'],
      solution: `In ${PLURAL[L]}: ${xs.map((x) => (shown.get(x) === fr(x, L) ? `$${fr(x, L)}$` : `$${shown.get(x)} = ${fr(x, L)}$`)).join(', ')}.\n\nIn order: ${sorted.map((x) => `$${shown.get(x)}$`).join(', ')}.`,
    };
  },
};

export const addSubtract: QuestionTemplate = {
  id: `${TOPIC}.add-subtract`,
  topicId: TOPIC,
  title: 'Add and subtract fractions and mixed numbers',
  difficulties: [2, 3, 4, 5],
  generate({ rng, difficulty }) {
    if (difficulty === 2) {
      const d = rng.pick([4, 5, 6, 8, 10, 12]);
      const op = rng.pick(['+', '-'] as const);
      let n1: number;
      let n2: number;
      if (op === '+') {
        n1 = rng.int(1, d - 1);
        n2 = rng.int(1, d - 1);
      } else {
        n1 = rng.int(2, d - 1);
        n2 = rng.int(1, n1 - 1);
      }
      const top = op === '+' ? n1 + n2 : n1 - n2;
      const [a, b] = simp(top, d);
      return {
        type: 'numeric',
        prompt: `Work out $${fr(n1, d)} ${op} ${fr(n2, d)}$. Give your answer in simplest form.`,
        answer: a / b,
        form: 'simplest-fraction',
        calculator: 'not-allowed',
        hints: ['The denominators are the same, so all the pieces are the same size.', `${op === '+' ? 'Add' : 'Subtract'} the numerators and keep the denominator. Then simplify if you can.`],
        solution: `The denominators are the same, so ${op === '+' ? 'add' : 'subtract'} the numerators: $${n1} ${op} ${n2} = ${top}$.\n\n$${fr(n1, d)} ${op} ${fr(n2, d)} = ${fr(top, d)}${finish(top, d)}$`,
      };
    }
    if (difficulty === 3) {
      const [dA, dB] = relatedPair(rng);
      let A: Mixed = randMixed(rng, dA, 0, 0);
      let B: Mixed = randMixed(rng, dB, 0, 0);
      const L = Math.max(dA, dB);
      let op = rng.pick(['+', '-'] as const);
      if (op === '-' && inL(A, L) < inL(B, L)) [A, B] = [B, A];
      if (inL(A, L) === inL(B, L)) op = '+';
      const top = op === '+' ? inL(A, L) + inL(B, L) : inL(A, L) - inL(B, L);
      const [a, b] = simp(top, L);
      const small = Math.min(dA, dB);
      return {
        type: 'numeric',
        prompt: `Work out $${texOf(A)} ${op} ${texOf(B)}$. Give your answer in simplest form.`,
        answer: a / b,
        form: 'simplest-fraction',
        calculator: 'not-allowed',
        hints: [`${L} is a multiple of ${small}. Change the fraction with denominator ${small} so it has denominator ${L}.`, `Then ${op === '+' ? 'add' : 'subtract'} the numerators, and simplify if you can.`],
        solution: addSubLines(A, B, op).join('\n\n'),
      };
    }
    if (difficulty === 4) {
      let A: Mixed = { w: 2, r: 1, d: 4 };
      let B: Mixed = { w: 1, r: 1, d: 2 };
      let op: '+' | '-' = '+';
      let L = 4;
      let top = 0;
      for (let attempt = 0; attempt < 100; attempt++) {
        const [dA, dB] = relatedPair(rng);
        A = randMixed(rng, dA, 1, 4);
        B = randMixed(rng, dB, 1, 3);
        op = rng.pick(['+', '-'] as const);
        L = Math.max(dA, dB);
        if (op === '-' && inL(A, L) < inL(B, L)) [A, B] = [B, A];
        top = op === '+' ? inL(A, L) + inL(B, L) : inL(A, L) - inL(B, L);
        if (top > L && top % L !== 0) break;
      }
      const [an, ad] = simp(top, L);
      const a = A.r * (L / A.d);
      const b = B.r * (L / B.d);
      const solution =
        op === '+'
          ? [
              `Add the wholes: $${A.w} + ${B.w} = ${A.w + B.w}$.`,
              `Add the fractions, using the denominator ${L}: $${fr(a, L)} + ${fr(b, L)} = ${fr(a + b, L)}${a + b >= L ? ` = ${mx(1, a + b - L, L)}` : ''}$.`,
              `Put them together: $${A.w + B.w} + ${a + b >= L ? mx(1, a + b - L, L) : fr(a + b, L)} = ${mx(Math.floor(top / L), top % L, L)}$${simp(top % L, L)[1] !== L ? `, which simplifies to $${fracOrMixed(top, L)}$` : ''}.`,
            ]
          : [
              ...addSubLines(A, B, '-'),
              'Changing to improper fractions first means you never have to break up a whole.',
            ];
      return {
        type: 'numeric',
        prompt: `Work out $${texOf(A)} ${op} ${texOf(B)}$. Give your answer as a mixed number in simplest form.`,
        answer: an / ad,
        form: 'mixed',
        marks: 2,
        calculator: 'not-allowed',
        hints:
          op === '+'
            ? ['Add the whole numbers, then add the fractions.', 'Give the fractions the same denominator before you add them.']
            : ['Change both mixed numbers into improper fractions with the same denominator.', 'Subtract the numerators, then change the answer back into a mixed number.'],
        solution: solution.join('\n\n'),
      };
    }
    // difficulty 5: word problems
    const name = rng.pick(NAMES);
    const kind = rng.pick(['pizza', 'ribbon', 'garden', 'walk', 'paint'] as const);
    for (let attempt = 0; attempt < 100; attempt++) {
      const [dA, dB] = relatedPair(rng);
      const L = Math.max(dA, dB);
      if (kind === 'garden') {
        const A = randMixed(rng, dA, 0, 0);
        const B = randMixed(rng, dB, 0, 0);
        const used = inL(A, L) + inL(B, L);
        if (used >= L) continue;
        const top = L - used;
        const [a, b] = simp(top, L);
        const [veg, other] = rng.pick([
          ['vegetables', 'flowers'],
          ['vegetables', 'fruit trees'],
          ['herbs', 'flowers'],
        ] as const);
        return {
          type: 'numeric',
          prompt: `$${texOf(A)}$ of ${name}'s garden is planted with ${veg} and $${texOf(B)}$ is planted with ${other}. The rest is lawn. What fraction of the garden is lawn? Give your answer in simplest form.`,
          answer: a / b,
          form: 'simplest-fraction',
          marks: 2,
          calculator: 'not-allowed',
          hints: ['The whole garden is 1. Find how much is planted, then take that away from 1.', `Use the denominator ${L} for every fraction.`],
          solution: [
            `Planted: ${addSubLines(A, B, '+').join(' ')}`,
            `The whole garden is $1 = ${fr(L, L)}$, so the lawn is $${fr(L, L)} - ${fr(used, L)} = ${fr(top, L)}${finish(top, L)}$.`,
          ].join('\n\n'),
        };
      }
      const add = kind === 'pizza' || kind === 'walk';
      const A = randMixed(rng, dA, add ? rng.int(0, 1) : rng.int(2, 3), add ? 2 : 4);
      const B = randMixed(rng, dB, 0, add ? 1 : 1);
      if (!add && inL(A, L) <= inL(B, L)) continue;
      const top = add ? inL(A, L) + inL(B, L) : inL(A, L) - inL(B, L);
      if (top % L === 0) continue;
      const [a, b] = simp(top, L);
      const unit = kind === 'ribbon' ? 'm' : kind === 'walk' ? 'km' : kind === 'paint' ? 'L' : undefined;
      const prompt =
        kind === 'pizza'
          ? `${name}'s whānau ate $${texOf(A)}$ ${A.w >= 1 ? 'pizzas' : 'of a pizza'} on Friday and $${texOf(B)}$ ${B.w >= 1 ? 'pizzas' : 'of a pizza'} on Saturday. How much pizza did they eat altogether?`
          : kind === 'walk'
            ? `${name} walks $${texOf(A)}$ km to the beach, then $${texOf(B)}$ km along the sand. How far does ${name} walk altogether?`
            : kind === 'ribbon'
              ? `${name} has a piece of ribbon $${texOf(A)}$ m long. ${name} cuts off $${texOf(B)}$ m to wrap a present. How much ribbon is left?`
              : `A tin has $${texOf(A)}$ L of paint in it. ${name} uses $${texOf(B)}$ L to paint a fence. How much paint is left in the tin?`;
      return {
        type: 'numeric',
        prompt: `${prompt} Give your answer in simplest form.`,
        answer: a / b,
        form: 'simplest-fraction',
        ...(unit && { units: unit }),
        marks: 2,
        calculator: 'not-allowed',
        hints: [add ? 'Do you need to add or subtract? "Altogether" means add.' : 'Do you need to add or subtract? "Left" means take away.', `Give both fractions the denominator ${L} before you ${add ? 'add' : 'subtract'}.`],
        solution: addSubLines(A, B, add ? '+' : '-').join('\n\n'),
      };
    }
    return {
      type: 'numeric',
      prompt: `${name} has a piece of ribbon $3\\frac{1}{4}$ m long. ${name} cuts off $1\\frac{3}{8}$ m to wrap a present. How much ribbon is left? Give your answer in simplest form.`,
      answer: 15 / 8,
      form: 'simplest-fraction',
      units: 'm',
      marks: 2,
      calculator: 'not-allowed',
      hints: ['"Left" means take away.', 'Give both fractions the denominator 8 before you subtract.'],
      solution: 'Change to improper fractions with the same denominator, 8: $3\\frac{1}{4} = \\frac{26}{8}$ and $1\\frac{3}{8} = \\frac{11}{8}$.\n\n$\\frac{26}{8} - \\frac{11}{8} = \\frac{15}{8} = 1\\frac{7}{8}$',
    };
  },
};

export const templates: QuestionTemplate[] = [equivalent, mixedImproper, compare, addSubtract];
