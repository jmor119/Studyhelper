import type { Rng } from '../../../../rng';
import type { QuestionTemplate, TemplateOutput } from '../../../types';
import { NAMES, num, tex } from '../../../format';

// m6.alg.number-sentences — true/false number sentences (with the order of operations), missing
// numbers in open number sentences, and the inequality signs <, >, ≤ and ≥.
// Year 6: no calculator, whole numbers only, squares up to 12², division by one digit.

const T = '\\times';
const D = '\\div';

/** One side of a number sentence, with its working. */
interface Side {
  tex: string;
  value: number;
  /** Working after the first "=", e.g. ["40 + 16", "56"]. Empty for a plain number. */
  steps: string[];
  /** The (wrong) value you get by working strictly left to right, if that differs. */
  ltr?: number;
}

type Maker = (rng: Rng, v: number) => Side | null;

/** "8 × 5 + 4² = 40 + 16 = 56" (or just "56"). */
function work(s: Side): string {
  return s.steps.length ? `${s.tex} = ${s.steps.join(' = ')}` : s.tex;
}

function factorPairs(v: number, lo = 2, hi = 12): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let a = lo; a <= hi; a++) if (v % a === 0 && v / a >= lo && v / a <= hi) out.push([a, v / a]);
  return out;
}

// ---- Simple sides: one operation ----
const add: Maker = (r, v) => {
  if (v < 5) return null;
  const a = r.int(2, v - 2);
  return { tex: `${a} + ${v - a}`, value: v, steps: [`${v}`] };
};
const sub: Maker = (r, v) => {
  const b = r.int(2, 30);
  return { tex: `${v + b} - ${b}`, value: v, steps: [`${v}`] };
};
const mul: Maker = (r, v) => {
  const pairs = factorPairs(v);
  if (!pairs.length) return null;
  const [a, b] = r.pick(pairs);
  return { tex: `${a} ${T} ${b}`, value: v, steps: [`${v}`] };
};
const div: Maker = (r, v) => {
  if (v < 2 || v > 15) return null;
  const b = r.int(2, 9);
  return { tex: `${v * b} ${D} ${b}`, value: v, steps: [`${v}`] };
};

// ---- Two operations: × or ÷ must be done before + or − ----
const mulAdd: Maker = (r, v) => {
  for (let i = 0; i < 20; i++) {
    const a = r.int(2, 9);
    const b = r.int(2, 9);
    const c = v - a * b;
    if (c < 1 || c > 60) continue;
    return { tex: `${a} ${T} ${b} + ${c}`, value: v, steps: [`${a * b} + ${c}`, `${v}`] };
  }
  return null;
};
const addMul: Maker = (r, v) => {
  for (let i = 0; i < 20; i++) {
    const a = r.int(2, 9);
    const b = r.int(2, 9);
    const c = v - a * b;
    if (c < 2 || c > 60) continue;
    return { tex: `${c} + ${a} ${T} ${b}`, value: v, steps: [`${c} + ${a * b}`, `${v}`], ltr: (c + a) * b };
  }
  return null;
};
const mulSub: Maker = (r, v) => {
  for (let i = 0; i < 20; i++) {
    const a = r.int(2, 9);
    const b = r.int(2, 9);
    const c = a * b - v;
    if (c < 1 || c > 40) continue;
    return { tex: `${a} ${T} ${b} - ${c}`, value: v, steps: [`${a * b} - ${c}`, `${v}`] };
  }
  return null;
};
const subMul: Maker = (r, v) => {
  const a = r.int(2, 9);
  const b = r.int(2, 6);
  const c = v + a * b;
  if (c - a < 1) return null;
  return { tex: `${c} - ${a} ${T} ${b}`, value: v, steps: [`${c} - ${a * b}`, `${v}`], ltr: (c - a) * b };
};
const divAdd: Maker = (r, v) => {
  for (let i = 0; i < 20; i++) {
    const q = r.int(2, 9);
    const b = r.int(2, 9);
    const c = v - q;
    if (c < 1) continue;
    return { tex: `${q * b} ${D} ${b} + ${c}`, value: v, steps: [`${q} + ${c}`, `${v}`] };
  }
  return null;
};
const addDiv: Maker = (r, v) => {
  for (let i = 0; i < 20; i++) {
    const q = r.int(2, 9);
    const b = r.int(2, 9);
    const c = v - q;
    if (c < 2) continue;
    const ltr = (c + q * b) / b;
    return {
      tex: `${c} + ${q * b} ${D} ${b}`,
      value: v,
      steps: [`${c} + ${q}`, `${v}`],
      ...(Number.isInteger(ltr) && { ltr }),
    };
  }
  return null;
};

// ---- Squares and brackets ----
const sqAdd: Maker = (r, v) => {
  const ks = [2, 3, 4, 5, 6].filter((k) => k * k < v - 3);
  if (!ks.length) return null;
  const k = r.pick(ks);
  const rest = v - k * k;
  const pairs = factorPairs(rest, 2, 9);
  if (pairs.length && r.chance(0.8)) {
    const [a, b] = r.pick(pairs);
    return { tex: `${a} ${T} ${b} + ${k}^2`, value: v, steps: [`${a} ${T} ${b} + ${k * k}`, `${rest} + ${k * k}`, `${v}`] };
  }
  return { tex: `${rest} + ${k}^2`, value: v, steps: [`${rest} + ${k * k}`, `${v}`] };
};
const sqSub: Maker = (r, v) => {
  const ks = [4, 5, 6, 7, 8, 9, 10, 11, 12].filter((k) => k * k > v && k * k - v <= 60);
  if (!ks.length) return null;
  const k = r.pick(ks);
  return { tex: `${k}^2 - ${k * k - v}`, value: v, steps: [`${k * k} - ${k * k - v}`, `${v}`] };
};
const bracketMul: Maker = (r, v) => {
  const cs = [2, 3, 4, 5, 6, 7, 8, 9].filter((c) => v % c === 0 && v / c >= 3 && v / c <= 20);
  if (!cs.length) return null;
  const c = r.pick(cs);
  const s = v / c;
  const a = r.int(1, s - 1);
  if (r.chance(0.5)) {
    return { tex: `(${a} + ${s - a}) ${T} ${c}`, value: v, steps: [`${s} ${T} ${c}`, `${v}`] };
  }
  return { tex: `${c} ${T} (${a} + ${s - a})`, value: v, steps: [`${c} ${T} ${s}`, `${v}`], ltr: c * a + (s - a) };
};

const SIMPLE: Maker[] = [add, sub, mul, div];
const TWO_STEP: Maker[] = [mulAdd, addMul, mulSub, subMul, divAdd, addDiv];
const HARD: Maker[] = [sqAdd, sqSub, bracketMul];

function makeSide(rng: Rng, v: number, makers: readonly Maker[], fallback: readonly Maker[] = SIMPLE): Side {
  for (const m of rng.shuffle(makers)) {
    const s = m(rng, v);
    if (s) return s;
  }
  for (const m of rng.shuffle(fallback)) {
    const s = m(rng, v);
    if (s) return s;
  }
  return { tex: `${v}`, value: v, steps: [] };
}

// ---- Signs ----
type Sign = '=' | '<' | '>' | '≤' | '≥';
const SIGN_TEX: Record<Sign, string> = { '=': '=', '<': '<', '>': '>', '≤': '\\le', '≥': '\\ge' };
const SIGN_WORDS: Record<Sign, string> = {
  '=': 'is equal to',
  '<': 'is less than',
  '>': 'is greater than',
  '≤': 'is less than or equal to',
  '≥': 'is greater than or equal to',
};

function holds(sign: Sign, l: number, r: number): boolean {
  switch (sign) {
    case '=':
      return l === r;
    case '<':
      return l < r;
    case '>':
      return l > r;
    case '≤':
      return l <= r;
    case '≥':
      return l >= r;
  }
}

/** Picks a right-hand value that makes `L sign R` true or false as asked. */
function rightValue(rng: Rng, sign: Sign, L: number, truth: boolean, boundaryChance: number): number {
  const k = rng.int(1, 9);
  const equalCase = rng.chance(boundaryChance);
  switch (sign) {
    case '=':
      return truth ? L : L + rng.pick([-3, -2, -1, 1, 2, 3]);
    case '<':
      return truth ? L + k : equalCase ? L : L - k;
    case '>':
      return truth ? L - k : equalCase ? L : L + k;
    case '≤':
      return truth ? (equalCase ? L : L + k) : L - k;
    case '≥':
      return truth ? (equalCase ? L : L - k) : L + k;
  }
}

function truthReason(sign: Sign, l: number, r: number): string {
  const ok = holds(sign, l, r);
  if (l === r && (sign === '≤' || sign === '≥')) {
    return `The two sides are equal, and $${SIGN_TEX[sign]}$ means "${SIGN_WORDS[sign]}", so the number sentence is **true**.`;
  }
  if (l === r && (sign === '<' || sign === '>')) {
    return `The two sides are equal. $${SIGN_TEX[sign]}$ means "${SIGN_WORDS[sign]}" and does not include "equal to", so the number sentence is **false**.`;
  }
  const rel = l === r ? 'is equal to' : l < r ? 'is less than' : 'is greater than';
  return `${l} ${rel} ${r}, so the number sentence is **${ok ? 'true' : 'false'}**.`;
}

export const trueFalse: QuestionTemplate = {
  id: 'm6.alg.number-sentences.true-false',
  topicId: 'm6.alg.number-sentences',
  title: 'Is the number sentence true or false?',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    const signs: Sign[] =
      difficulty === 2 ? ['=', '=', '<', '>'] : difficulty === 3 ? ['=', '<', '>', '≤', '≥'] : ['≤', '≥', '≤', '≥', '=', '<', '>'];
    const sign = rng.pick(signs);
    const L = difficulty === 2 ? rng.int(12, 60) : difficulty === 3 ? rng.int(15, 80) : rng.int(20, 100);
    const truth = rng.chance(0.5);
    let R = rightValue(rng, sign, L, truth, difficulty === 4 ? 0.5 : 0.25);
    if (R < 2) R = L + rng.int(1, 5);
    const complex = difficulty === 2 ? SIMPLE : difficulty === 3 ? TWO_STEP : HARD;
    const other = difficulty === 4 ? TWO_STEP : SIMPLE;
    const complexLeft = rng.chance(0.5);
    const left = makeSide(rng, L, complexLeft ? complex : other, difficulty === 4 ? TWO_STEP : SIMPLE);
    const right = makeSide(rng, R, complexLeft ? other : complex, difficulty === 4 ? TWO_STEP : SIMPLE);
    const isTrue = holds(sign, L, R);
    const sentence = `$$${left.tex} ${SIGN_TEX[sign]} ${right.tex}$$`;
    const hints = [
      'Work out the value of each side on its own first.',
      difficulty === 2
        ? `$${SIGN_TEX[sign]}$ means "${SIGN_WORDS[sign]}".`
        : difficulty === 3
          ? 'Do × and ÷ before + and −.'
          : 'Brackets first, then squares, then × and ÷, then + and −.',
      ...(difficulty > 2 ? [`$${SIGN_TEX[sign]}$ means "${SIGN_WORDS[sign]}".`] : []),
    ];
    const solution = [
      'Work out each side first.',
      `Left side: $${work(left)}$`,
      `Right side: $${work(right)}$`,
      truthReason(sign, L, R),
    ].join('\n\n');

    if (difficulty === 2) {
      return {
        type: 'mcq',
        prompt: `Is this number sentence true or false?\n\n${sentence}`,
        options: [
          { id: 't', text: 'True' },
          { id: 'f', text: 'False' },
        ],
        correct: isTrue ? 't' : 'f',
        feedback: {
          [isTrue ? 'f' : 't']: `Work out both sides. The left side is ${L} and the right side is ${R}.`,
        },
        calculator: 'not-allowed',
        hints,
        solution,
      };
    }
    return {
      type: 'cloze',
      prompt: `Work out each side of this number sentence.\n\n${sentence}\n\nLeft side = [[l]]\n\nRight side = [[r]]\n\nSo the number sentence is [[tf]].`,
      blanks: [
        { id: 'l', accepted: [String(L)] },
        { id: 'r', accepted: [String(R)] },
        { id: 'tf', accepted: [isTrue ? 'true' : 'false'], options: ['true', 'false'] },
      ],
      marks: 2,
      calculator: 'not-allowed',
      hints,
      solution,
    };
  },
};

// ---- Choose the sign ----
type Rel = 'lt' | 'gt' | 'eq';
const relOf = (l: number, r: number): Rel => (l < r ? 'lt' : l > r ? 'gt' : 'eq');
const REL_TEX: Record<Rel, string> = { lt: '<', gt: '>', eq: '=' };

/** A whole number near n with two digits swapped or one place changed. */
function nearNumber(rng: Rng, n: number): number {
  const s = String(n).split('');
  for (let i = 0; i < 20; i++) {
    if (rng.chance(0.5)) {
      const i1 = rng.int(1, s.length - 2);
      const t = [...s];
      [t[i1], t[i1 + 1]] = [t[i1 + 1]!, t[i1]!];
      const m = Number(t.join(''));
      if (m !== n) return m;
    } else {
      const m = n + rng.pick([-1000, -100, -10, 10, 100, 1000]);
      if (m > 999) return m;
    }
  }
  return n + 10;
}

export const chooseSign: QuestionTemplate = {
  id: 'm6.alg.number-sentences.choose-sign',
  topicId: 'm6.alg.number-sentences',
  title: 'Choose <, > or = to make a true number sentence',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    let left: Side;
    let right: Side;
    if (difficulty === 1) {
      if (rng.chance(0.5)) {
        const a = rng.int(1000, 99999);
        const b = nearNumber(rng, a);
        left = { tex: tex(a), value: a, steps: [] };
        right = { tex: tex(b), value: b, steps: [] };
      } else {
        const L = rng.int(10, 60);
        left = makeSide(rng, L, [add, sub, mul]);
        const R = rng.chance(0.2) ? L : L + rng.pick([-4, -3, -2, -1, 1, 2, 3, 4]);
        right = { tex: `${R}`, value: R, steps: [] };
      }
    } else if (difficulty === 2) {
      const L = rng.int(12, 70);
      left = makeSide(rng, L, SIMPLE);
      const R = rng.chance(0.25) ? L : L + rng.pick([-5, -3, -2, -1, 1, 2, 3, 5]);
      right = makeSide(rng, R, SIMPLE);
    } else {
      const L = rng.int(15, 70);
      left = makeSide(rng, L, [addMul, subMul, addDiv]);
      const R = rng.chance(0.25) ? L : L + rng.pick([-6, -4, -3, -2, -1, 1, 2, 3, 4, 6]);
      right = rng.chance(0.5) ? { tex: `${R}`, value: R, steps: [] } : makeSide(rng, R, SIMPLE);
    }
    if (rng.chance(0.5) && difficulty > 1) [left, right] = [right, left];
    const rel = relOf(left.value, right.value);
    const feedback: Record<string, string> = {};
    const values = `The left side is ${num(left.value)} and the right side is ${num(right.value)}.`;
    for (const o of ['lt', 'gt', 'eq'] as const) {
      if (o === rel) continue;
      feedback[o] =
        o === 'eq'
          ? `The two sides are not equal. ${values}`
          : rel === 'eq'
            ? `The two sides have the same value. ${values}`
            : `That sign points the wrong way. The open side faces the bigger number. ${values}`;
    }
    // Working strictly left to right is the big misconception here.
    for (const s of [left, right]) {
      if (s.ltr === undefined || s.ltr === s.value) continue;
      const wrongRel = s === left ? relOf(s.ltr, right.value) : relOf(left.value, s.ltr);
      if (wrongRel !== rel) {
        feedback[wrongRel] = `It looks like you worked from left to right and got ${s.ltr}. Do × and ÷ before + and −: $${work(s)}$.`;
      }
    }
    return {
      type: 'mcq',
      prompt: `Which sign makes this number sentence true?\n\n$$${left.tex} \\;\\square\\; ${right.tex}$$`,
      options: [
        { id: 'lt', text: '$<$ (is less than)' },
        { id: 'gt', text: '$>$ (is greater than)' },
        { id: 'eq', text: '$=$ (is equal to)' },
      ],
      correct: rel,
      feedback,
      calculator: 'not-allowed',
      hints: [
        'Work out the value of each side first.',
        difficulty === 3 ? 'Do × and ÷ before + and −.' : 'The open side of < or > faces the bigger number.',
      ],
      solution: [
        ...(left.steps.length ? [`Left side: $${work(left)}$`] : []),
        ...(right.steps.length ? [`Right side: $${work(right)}$`] : []),
        `${num(left.value)} ${rel === 'lt' ? 'is less than' : rel === 'gt' ? 'is greater than' : 'is equal to'} ${num(right.value)}, so the sign is $${REL_TEX[rel]}$:`,
        `$$${left.tex} ${REL_TEX[rel]} ${right.tex}$$`,
      ].join('\n\n'),
    };
  },
};

// ---- Missing numbers ----
interface Missing {
  tex: string;
  answer: number;
  hints: string[];
  solution: string[];
}

function missingD1(rng: Rng): Missing {
  const kind = rng.pick(['x+a', 'a+x', 'c-x', 'x-a', 'a*x', 'x*a'] as const);
  const box = '\\square';
  if (kind === 'a*x' || kind === 'x*a') {
    const a = rng.int(2, 10);
    const x = rng.int(2, 10);
    return {
      tex: kind === 'a*x' ? `${a} ${T} ${box} = ${a * x}` : `${box} ${T} ${a} = ${a * x}`,
      answer: x,
      hints: [`Which number times ${a} makes ${a * x}?`, `Use a division fact: ${a * x} ÷ ${a}.`],
      solution: [`$${a * x} ${D} ${a} = ${x}$, so the missing number is ${x}.`, `Check: $${a} ${T} ${x} = ${a * x}$ ✓`],
    };
  }
  const a = rng.int(3, 45);
  const x = rng.int(3, 45);
  if (kind === 'x+a' || kind === 'a+x') {
    return {
      tex: kind === 'x+a' ? `${box} + ${a} = ${a + x}` : `${a} + ${box} = ${a + x}`,
      answer: x,
      hints: [`What do you add to ${a} to make ${a + x}?`, 'Subtraction undoes addition.'],
      solution: [`$${a + x} - ${a} = ${x}$, so the missing number is ${x}.`, `Check: $${a} + ${x} = ${a + x}$ ✓`],
    };
  }
  if (kind === 'c-x') {
    const c = a + x;
    return {
      tex: `${c} - ${box} = ${a}`,
      answer: x,
      hints: [`How much do you take away from ${c} to leave ${a}?`, `Find the difference between ${c} and ${a}.`],
      solution: [`$${c} - ${a} = ${x}$, so the missing number is ${x}.`, `Check: $${c} - ${x} = ${a}$ ✓`],
    };
  }
  return {
    tex: `${box} - ${a} = ${x}`,
    answer: a + x,
    hints: [`Which number is ${a} more than ${x}?`, 'Addition undoes subtraction.'],
    solution: [`$${x} + ${a} = ${a + x}$, so the missing number is ${a + x}.`, `Check: $${a + x} - ${a} = ${x}$ ✓`],
  };
}

function missingD2(rng: Rng): Missing {
  const box = '\\square';
  const kind = rng.pick(['x/a', 'c/x', 'balance+', 'balance*', 'balance-'] as const);
  if (kind === 'x/a' || kind === 'c/x') {
    const a = rng.int(2, 9);
    const q = rng.int(2, 12);
    if (kind === 'x/a') {
      return {
        tex: `${box} ${D} ${a} = ${q}`,
        answer: a * q,
        hints: [`Which number shared into ${a} equal groups gives ${q} in each group?`, 'Multiplication undoes division.'],
        solution: [`$${q} ${T} ${a} = ${a * q}$, so the missing number is ${a * q}.`, `Check: $${a * q} ${D} ${a} = ${q}$ ✓`],
      };
    }
    return {
      tex: `${a * q} ${D} ${box} = ${q}`,
      answer: a,
      hints: [`${a * q} is split into equal groups of ${q}. How many groups are there?`, `Which number times ${q} makes ${a * q}?`],
      solution: [`$${q} ${T} ${a} = ${a * q}$, so $${a * q} ${D} ${a} = ${q}$. The missing number is ${a}.`],
    };
  }
  if (kind === 'balance+') {
    const a = rng.int(5, 30);
    const b = rng.int(5, 30);
    const c = rng.int(2, a + b - 2);
    const x = a + b - c;
    return {
      tex: `${a} + ${b} = ${box} + ${c}`,
      answer: x,
      hints: ['The equals sign means both sides have the same value.', `Work out ${a} + ${b} first. What must you add to ${c} to get the same total?`],
      solution: [
        `The left side is $${a} + ${b} = ${a + b}$.`,
        `The right side must also be ${a + b}, so $${box} + ${c} = ${a + b}$. That means $${box} = ${a + b} - ${c} = ${x}$.`,
        `Check: $${x} + ${c} = ${a + b}$ ✓ (${a + b} is the total, not the missing number.)`,
      ],
    };
  }
  if (kind === 'balance-') {
    const a = rng.int(25, 60);
    const b = rng.int(3, 20);
    const v = a - b;
    const c = v + rng.int(3, 25);
    return {
      tex: `${a} - ${b} = ${c} - ${box}`,
      answer: c - v,
      hints: ['The equals sign means both sides have the same value.', `Work out ${a} − ${b} first.`],
      solution: [
        `The left side is $${a} - ${b} = ${v}$.`,
        `So $${c} - ${box} = ${v}$. You take away $${c} - ${v} = ${c - v}$ from ${c} to leave ${v}.`,
        `The missing number is ${c - v}.`,
      ],
    };
  }
  // balance ×: same product, different factor pair
  for (;;) {
    const p = rng.pick([12, 16, 18, 20, 24, 30, 36, 40, 48, 60, 72]);
    const pairs = factorPairs(p, 2, 12);
    if (pairs.length < 3) continue;
    const [p1, p2] = rng.sample(pairs, 2) as [[number, number], [number, number]];
    if (p1[0] === p2[1]) continue;
    return {
      tex: `${p1[0]} ${T} ${p1[1]} = ${p2[0]} ${T} ${box}`,
      answer: p2[1],
      hints: ['The equals sign means both sides have the same value.', `Work out ${p1[0]} × ${p1[1]} first.`],
      solution: [
        `The left side is $${p1[0]} ${T} ${p1[1]} = ${p}$.`,
        `So $${p2[0]} ${T} ${box} = ${p}$, and $${p} ${D} ${p2[0]} = ${p2[1]}$.`,
        `The missing number is ${p2[1]}.`,
      ],
    };
  }
}

function missingD3(rng: Rng): Missing {
  const box = '\\square';
  const kind = rng.pick(['ax+b', 'xa-b', 'b+ax', 'x/a+b', 'ab=x+c'] as const);
  const twoStepHints = (first: string) => [
    'Work backwards. Undo the + or − first.',
    first,
  ];
  if (kind === 'ab=x+c') {
    const a = rng.int(3, 9);
    const b = rng.int(3, 9);
    const c = rng.int(2, a * b - 2);
    return {
      tex: `${a} ${T} ${b} = ${box} + ${c}`,
      answer: a * b - c,
      hints: ['The equals sign means both sides have the same value.', `Work out ${a} × ${b} first.`],
      solution: [
        `The left side is $${a} ${T} ${b} = ${a * b}$.`,
        `So $${box} + ${c} = ${a * b}$, and $${a * b} - ${c} = ${a * b - c}$.`,
        `The missing number is ${a * b - c}.`,
      ],
    };
  }
  const a = rng.int(2, 9);
  const x = rng.int(2, 12);
  if (kind === 'x/a+b') {
    const b = rng.int(2, 25);
    const v = x + b;
    return {
      tex: `${box} ${D} ${a} + ${b} = ${v}`,
      answer: a * x,
      hints: twoStepHints(`Once you know what $\\square ${D} ${a}$ equals, undo the ÷ ${a}.`),
      solution: [
        `$\\square ${D} ${a}$ plus ${b} makes ${v}, so $\\square ${D} ${a} = ${v} - ${b} = ${x}$.`,
        `Then $\\square = ${x} ${T} ${a} = ${a * x}$.`,
        `Check: $${a * x} ${D} ${a} + ${b} = ${x} + ${b} = ${v}$ ✓`,
      ],
    };
  }
  if (kind === 'xa-b') {
    const b = rng.int(1, a * x - 1);
    const v = a * x - b;
    return {
      tex: `${box} ${T} ${a} - ${b} = ${v}`,
      answer: x,
      hints: twoStepHints(`Once you know what $\\square ${T} ${a}$ equals, undo the × ${a}.`),
      solution: [
        `$\\square ${T} ${a}$ take away ${b} leaves ${v}, so $\\square ${T} ${a} = ${v} + ${b} = ${a * x}$.`,
        `Then $\\square = ${a * x} ${D} ${a} = ${x}$.`,
        `Check: $${x} ${T} ${a} - ${b} = ${a * x} - ${b} = ${v}$ ✓`,
      ],
    };
  }
  const b = rng.int(1, 30);
  const v = a * x + b;
  return {
    tex: kind === 'ax+b' ? `${a} ${T} ${box} + ${b} = ${v}` : `${b} + ${a} ${T} ${box} = ${v}`,
    answer: x,
    hints: twoStepHints(`Once you know what $${a} ${T} \\square$ equals, undo the × ${a}.`),
    solution: [
      `$${a} ${T} \\square$ plus ${b} makes ${v}, so $${a} ${T} \\square = ${v} - ${b} = ${a * x}$.`,
      `Then $\\square = ${a * x} ${D} ${a} = ${x}$.`,
      `Check: ${kind === 'ax+b' ? `$${a} ${T} ${x} + ${b}` : `$${b} + ${a} ${T} ${x}`} = ${kind === 'ax+b' ? `${a * x} + ${b}` : `${b} + ${a * x}`} = ${v}$ ✓`,
    ],
  };
}

function missingD4(rng: Rng): Missing {
  const box = '\\square';
  const kind = rng.pick(['ax+b=k2', 'ax-k2=c', '(x+a)b=c', 'ab+x=cd'] as const);
  if (kind === 'ab+x=cd') {
    for (;;) {
      const a = rng.int(2, 9);
      const b = rng.int(2, 9);
      const c = rng.int(3, 12);
      const d = rng.int(3, 9);
      const x = c * d - a * b;
      if (x < 2) continue;
      return {
        tex: `${a} ${T} ${b} + ${box} = ${c} ${T} ${d}`,
        answer: x,
        hints: ['Work out both multiplications first.', 'The equals sign means both sides have the same value.'],
        solution: [
          `The left side is $${a * b} + \\square$ and the right side is $${c} ${T} ${d} = ${c * d}$.`,
          `So $${a * b} + \\square = ${c * d}$, and $\\square = ${c * d} - ${a * b} = ${x}$.`,
          `Check: $${a} ${T} ${b} + ${x} = ${a * b} + ${x} = ${c * d}$ ✓`,
        ],
      };
    }
  }
  if (kind === '(x+a)b=c') {
    const x = rng.int(2, 9);
    const a = rng.int(1, 9);
    const b = rng.int(2, 9);
    const c = (x + a) * b;
    return {
      tex: `(${box} + ${a}) ${T} ${b} = ${c}`,
      answer: x,
      hints: ['Work backwards. The bracket is multiplied by ' + b + ', so what must the bracket equal?', 'Then find the number that goes with ' + a + ' to make that.'],
      solution: [
        `The bracket times ${b} is ${c}, so the bracket equals $${c} ${D} ${b} = ${x + a}$.`,
        `$\\square + ${a} = ${x + a}$, so $\\square = ${x}$.`,
        `Check: $(${x} + ${a}) ${T} ${b} = ${x + a} ${T} ${b} = ${c}$ ✓`,
      ],
    };
  }
  for (;;) {
    const a = rng.int(2, 9);
    const x = rng.int(2, 12);
    const k = rng.int(3, 10);
    if (kind === 'ax+b=k2') {
      const b = k * k - a * x;
      if (b < 1 || b > 40) continue;
      return {
        tex: `${a} ${T} ${box} + ${b} = ${k}^2`,
        answer: x,
        hints: [`Work out $${k}^2$ first.`, `Then work backwards: undo the + ${b}, then the × ${a}.`],
        solution: [
          `$${k}^2 = ${k} ${T} ${k} = ${k * k}$.`,
          `$${a} ${T} \\square + ${b} = ${k * k}$, so $${a} ${T} \\square = ${k * k} - ${b} = ${a * x}$.`,
          `$\\square = ${a * x} ${D} ${a} = ${x}$.`,
        ],
      };
    }
    const c = a * x - k * k;
    if (c < 1 || c > 50) continue;
    return {
      tex: `${a} ${T} ${box} - ${k}^2 = ${c}`,
      answer: x,
      hints: [`Work out $${k}^2$ first.`, `Then work backwards: undo the − ${k * k}, then the × ${a}.`],
      solution: [
        `$${k}^2 = ${k * k}$, so $${a} ${T} \\square - ${k * k} = ${c}$.`,
        `$${a} ${T} \\square = ${c} + ${k * k} = ${a * x}$.`,
        `$\\square = ${a * x} ${D} ${a} = ${x}$.`,
      ],
    };
  }
}

export const missingNumber: QuestionTemplate = {
  id: 'm6.alg.number-sentences.missing-number',
  topicId: 'm6.alg.number-sentences',
  title: 'Find the missing number in an open number sentence',
  difficulties: [1, 2, 3, 4],
  generate({ rng, difficulty }) {
    const m = difficulty === 1 ? missingD1(rng) : difficulty === 2 ? missingD2(rng) : difficulty === 3 ? missingD3(rng) : missingD4(rng);
    return {
      type: 'numeric',
      prompt: `Find the missing number.\n\n$$${m.tex}$$`,
      answer: m.answer,
      form: 'integer',
      marks: difficulty === 4 ? 2 : 1,
      calculator: 'not-allowed',
      hints: m.hints,
      solution: m.solution.join('\n\n'),
    };
  },
};

// ---- Which whole numbers make an inequality true? ----
type ISign = '<' | '>' | '≤' | '≥';

function wholeNumbersThatWork(op: '+' | '×', a: number, sign: ISign, c: number, from: number, to: number): number[] {
  const out: number[] = [];
  for (let n = from; n <= to; n++) {
    const v = op === '+' ? n + a : n * a;
    if (holds(sign, v, c)) out.push(n);
  }
  return out;
}

/** Whole-dollar amount for prose, with the $ escaped so it isn't read as maths: "\$35". */
const dollars = (n: number) => `\\$${n}`;

function wordProblem(rng: Rng): TemplateOutput {
  const name = rng.pick(NAMES);
  const kind = rng.pick(['tickets', 'buses', 'shelves'] as const);
  if (kind === 'tickets') {
    const price = rng.int(4, 9);
    const bus = rng.int(2, 6);
    const n = rng.int(4, 9);
    const budget = price * n + bus + rng.int(0, price - 1);
    const left = budget - bus;
    return {
      type: 'numeric',
      prompt: `${name} has ${dollars(budget)} to spend at the A&P show. ${name} needs to keep ${dollars(bus)} for the bus home. Rides cost ${dollars(price)} each.\n\nWhat is the greatest number of rides ${name} can go on? (This is the largest whole number that makes $${price} \\times \\square + ${bus} \\le ${budget}$ true.)`,
      answer: n,
      form: 'integer',
      marks: 2,
      calculator: 'not-allowed',
      hints: [`Take away the bus money first. How much is left for rides?`, `How many lots of ${dollars(price)} fit into that?`],
      solution: [
        `Money for rides: ${dollars(budget)} − ${dollars(bus)} = ${dollars(left)}.`,
        `$${price} \\times ${n} = ${price * n}$, which is ${price * n === left ? 'exactly' : 'not more than'} ${left}. $${price} \\times ${n + 1} = ${price * (n + 1)}$, which is too much.`,
        `So ${name} can go on **${n}** rides.`,
      ].join('\n\n'),
    };
  }
  if (kind === 'buses') {
    const seats = rng.pick([12, 15, 20, 25]);
    const n = rng.int(3, 8);
    const people = seats * (n - 1) + rng.int(1, seats);
    return {
      type: 'numeric',
      prompt: `${people} students are going on a school trip to the museum. Each minibus can carry ${seats} students.\n\nWhat is the smallest number of minibuses they need? (This is the smallest whole number that makes $${seats} \\times \\square \\ge ${people}$ true.)`,
      answer: n,
      form: 'integer',
      marks: 2,
      calculator: 'not-allowed',
      hints: ['Every student needs a seat, so the minibuses must carry at least that many students.', `Count in ${seats}s until you reach or pass ${people}.`],
      solution: [
        `$${seats} \\times ${n - 1} = ${seats * (n - 1)}$, which is less than ${people}. Not enough seats.`,
        `$${seats} \\times ${n} = ${seats * n}$, which is ${seats * n === people ? 'equal to' : 'greater than'} ${people}. Enough seats.`,
        `They need **${n}** minibuses.`,
      ].join('\n\n'),
    };
  }
  const per = rng.int(6, 9);
  const start = rng.int(3, 12);
  const n = rng.int(4, 9);
  const cap = start + per * n + rng.int(0, per - 1);
  return {
    type: 'numeric',
    prompt: `A library shelf can hold at most ${cap} books. There are already ${start} books on it. ${name} adds books in piles of ${per}.\n\nWhat is the greatest number of whole piles ${name} can add? (This is the largest whole number that makes $${start} + ${per} \\times \\square \\le ${cap}$ true.)`,
    answer: n,
    form: 'integer',
    marks: 2,
    calculator: 'not-allowed',
    hints: [`How much space is left on the shelf after the first ${start} books?`, `How many piles of ${per} fit into that space?`],
    solution: [
      `Space left: $${cap} - ${start} = ${cap - start}$ books.`,
      `$${per} \\times ${n} = ${per * n}$ fits, but $${per} \\times ${n + 1} = ${per * (n + 1)}$ is too many.`,
      `So ${name} can add **${n}** piles.`,
    ].join('\n\n'),
  };
}

export const inequalityWholeNumbers: QuestionTemplate = {
  id: 'm6.alg.number-sentences.inequality-numbers',
  topicId: 'm6.alg.number-sentences',
  title: 'Which whole numbers make an inequality true?',
  difficulties: [3, 4, 5],
  generate({ rng, difficulty }) {
    const sign = rng.pick(['<', '>', '≤', '≥'] as const);
    const box = '\\square';
    if (difficulty === 3) {
      const op = rng.pick(['+', '×'] as const);
      const a = op === '+' ? rng.int(3, 20) : rng.int(2, 9);
      const boundary = rng.int(4, 10);
      const c = op === '+' ? boundary + a : boundary * a;
      const start = boundary - 2;
      const candidates = [start, start + 1, start + 2, start + 3, start + 4];
      const good = wholeNumbersThatWork(op, a, sign, c, start, start + 4);
      const lhs = op === '+' ? `${box} + ${a}` : `${box} ${T} ${a}`;
      const valueOf = (n: number) => (op === '+' ? n + a : n * a);
      return {
        type: 'multi',
        prompt: `Select **all** the numbers that make this number sentence true when they go in the box.\n\n$$${lhs} ${SIGN_TEX[sign]} ${c}$$`,
        options: candidates.map((n) => ({ id: `n${n}`, text: `${n}` })),
        correct: good.map((n) => `n${n}`),
        calculator: 'not-allowed',
        hints: ['Try each number in the box and work out the left side.', `$${SIGN_TEX[sign]}$ means "${SIGN_WORDS[sign]}".`],
        solution: [
          ...candidates.map((n) => `$${op === '+' ? `${n} + ${a}` : `${n} ${T} ${a}`} = ${valueOf(n)}$: ${holds(sign, valueOf(n), c) ? 'true ✓' : 'false ✗'}`),
          `So the numbers are ${good.join(', ')}.${sign === '≤' || sign === '≥' ? ` ${boundary} works because $${SIGN_TEX[sign]}$ includes "equal to".` : ` ${boundary} does not work, because $${SIGN_TEX[sign]}$ does not include "equal to".`}`,
        ].join('\n\n'),
      };
    }
    if (difficulty === 4) {
      const a = rng.int(3, 9);
      const exact = rng.chance(0.5);
      const q = rng.int(4, 11);
      const c = exact ? a * q : a * q + rng.int(1, a - 1);
      const largest = sign === '<' || sign === '≤';
      // For ≤ / ≥ an exact multiple is allowed; for < / > it isn't.
      let ans: number;
      if (largest) ans = sign === '≤' ? Math.floor(c / a) : Math.ceil(c / a) - 1;
      else ans = sign === '≥' ? Math.ceil(c / a) : Math.floor(c / a) + 1;
      return {
        type: 'numeric',
        prompt: `What is the **${largest ? 'largest' : 'smallest'}** whole number that makes this number sentence true?\n\n$$${a} ${T} ${box} ${SIGN_TEX[sign]} ${c}$$`,
        answer: ans,
        form: 'integer',
        marks: 2,
        calculator: 'not-allowed',
        hints: [`Count in ${a}s and find where you get close to ${c}.`, `$${SIGN_TEX[sign]}$ means "${SIGN_WORDS[sign]}". Does "equal to" count here?`],
        solution: [
          `$${a} ${T} ${ans - 1} = ${a * (ans - 1)}$, $${a} ${T} ${ans} = ${a * ans}$ and $${a} ${T} ${ans + 1} = ${a * (ans + 1)}$.`,
          `We need $${a} ${T} \\square$ to be ${SIGN_WORDS[sign].replace('is ', '')} ${c}.`,
          `The ${largest ? 'largest' : 'smallest'} whole number that works is **${ans}**${a * ans === c ? `, because $${a} ${T} ${ans} = ${c}$ and $${SIGN_TEX[sign]}$ includes "equal to"` : ''}.`,
        ].join('\n\n'),
      };
    }
    if (rng.chance(0.5)) return wordProblem(rng);
    // Two-step inequality: a × □ + b compared with c.
    const a = rng.int(3, 9);
    const b = rng.int(2, 20);
    const q = rng.int(4, 10);
    const exact = rng.chance(0.4);
    const c = b + a * q + (exact ? 0 : rng.int(1, a - 1));
    const largest = sign === '<' || sign === '≤';
    const k = (c - b) / a;
    let ans: number;
    if (largest) ans = sign === '≤' ? Math.floor(k) : Math.ceil(k) - 1;
    else ans = sign === '≥' ? Math.ceil(k) : Math.floor(k) + 1;
    const val = (n: number) => a * n + b;
    return {
      type: 'numeric',
      prompt: `What is the **${largest ? 'largest' : 'smallest'}** whole number that makes this number sentence true?\n\n$$${a} ${T} ${box} + ${b} ${SIGN_TEX[sign]} ${c}$$`,
      answer: ans,
      form: 'integer',
      marks: 2,
      calculator: 'not-allowed',
      hints: [`Take ${b} away from ${c} to see what $${a} ${T} \\square$ needs to be close to.`, 'Try a number, check it, then try one more and one less.'],
      solution: [
        `$${a} ${T} \\square$ needs to be ${SIGN_WORDS[sign].replace('is ', '')} $${c} - ${b} = ${c - b}$.`,
        `Check: $${a} ${T} ${ans} + ${b} = ${val(ans)}$ (works) and $${a} ${T} ${largest ? ans + 1 : ans - 1} + ${b} = ${val(largest ? ans + 1 : ans - 1)}$ (doesn't work).`,
        `The ${largest ? 'largest' : 'smallest'} whole number is **${ans}**.`,
      ].join('\n\n'),
    };
  },
};

export const templates: QuestionTemplate[] = [chooseSign, trueFalse, missingNumber, inequalityWholeNumbers];
