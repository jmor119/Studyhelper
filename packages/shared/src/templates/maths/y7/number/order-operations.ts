import type { Rng } from '../../../../rng';
import { tex } from '../../../format';
import type { QuestionTemplate, TemplateOutput } from '../../../types';
import { type Choice, mcqFields } from './money-helpers';

// m7.num.order-operations — GEMA: Grouping (brackets), Exponents, Multiplicative (× ÷ left to
// right), Additive (+ − left to right). Expressions are written as plain strings ("12 + 3 * (7 - 4)^2"),
// parsed into a tree, and evaluated one GEMA step at a time, so every worked solution is computed.
// No calculators; whole numbers only, no negative values at any step.

type Op = '+' | '-' | '*' | '/';
type Node =
  | { k: 'n'; v: number }
  | { k: 'op'; op: Op; l: Node; r: Node }
  | { k: 'pow'; b: Node; e: number }
  | { k: 'br'; sq: boolean; x: Node };
type Level = 'G' | 'E' | 'M' | 'A';

const OP_TEX: Record<Op, string> = { '+': '+', '-': '-', '*': '\\times', '/': '\\div' };

function parse(src: string): Node {
  const toks = src.match(/\d+|[-+*/^()[\]]/g) ?? [];
  let i = 0;
  const peek = () => toks[i];
  const next = () => toks[i++]!;
  const primary = (): Node => {
    const t = next();
    if (t === '(' || t === '[') {
      const x = expr();
      next();
      return { k: 'br', sq: t === '[', x };
    }
    return { k: 'n', v: Number(t) };
  };
  const factor = (): Node => {
    const b = primary();
    if (peek() === '^') {
      next();
      return { k: 'pow', b, e: Number(next()) };
    }
    return b;
  };
  const term = (): Node => {
    let l = factor();
    while (peek() === '*' || peek() === '/') {
      const op = next() as Op;
      l = { k: 'op', op, l, r: factor() };
    }
    return l;
  };
  function expr(): Node {
    let l = term();
    while (peek() === '+' || peek() === '-') {
      const op = next() as Op;
      l = { k: 'op', op, l, r: term() };
    }
    return l;
  }
  return expr();
}

/** Exact value, or null if a step divides unevenly or goes below zero. */
function evaluate(n: Node): number | null {
  switch (n.k) {
    case 'n':
      return n.v;
    case 'br':
      return evaluate(n.x);
    case 'pow': {
      const b = evaluate(n.b);
      return b === null ? null : b ** n.e;
    }
    case 'op': {
      const l = evaluate(n.l);
      const r = evaluate(n.r);
      if (l === null || r === null) return null;
      if (n.op === '+') return l + r;
      if (n.op === '-') return l - r >= 0 ? l - r : null;
      if (n.op === '*') return l * r;
      return r !== 0 && l % r === 0 ? l / r : null;
    }
  }
}

function render(n: Node): string {
  switch (n.k) {
    case 'n':
      return tex(n.v);
    case 'br':
      return n.sq ? `[${render(n.x)}]` : `(${render(n.x)})`;
    case 'pow':
      return `${render(n.b)}^{${n.e}}`;
    case 'op':
      return `${render(n.l)} ${OP_TEX[n.op]} ${render(n.r)}`;
  }
}

const num = (v: number): Node => ({ k: 'n', v });

function any(n: Node, test: (x: Node) => boolean): boolean {
  if (test(n)) return true;
  if (n.k === 'op') return any(n.l, test) || any(n.r, test);
  if (n.k === 'pow') return any(n.b, test);
  if (n.k === 'br') return any(n.x, test);
  return false;
}

const isOpenBracket = (x: Node) => x.k === 'br' && x.x.k !== 'n';
const isReadyPow = (x: Node) => x.k === 'pow' && x.b.k === 'n';
const isReady = (ops: Op[]) => (x: Node) => x.k === 'op' && ops.includes(x.op) && x.l.k === 'n' && x.r.k === 'n';

/** Replaces every node matching `test` (outermost first) with `f(node)`. */
function replace(n: Node, test: (x: Node) => boolean, f: (x: Node) => Node): Node {
  if (test(n)) return f(n);
  if (n.k === 'op') return { ...n, l: replace(n.l, test, f), r: replace(n.r, test, f) };
  if (n.k === 'pow') return { ...n, b: replace(n.b, test, f) };
  if (n.k === 'br') return { ...n, x: replace(n.x, test, f) };
  return n;
}

/** One line of working, following GEMA. For bracket steps, `inner` says what happened inside. */
function stepOnce(n: Node): { node: Node; level: Level; inner?: Level; closed?: boolean } {
  if (any(n, isOpenBracket)) {
    let inner: Level | undefined;
    let closed = true;
    const node = replace(n, isOpenBracket, (b) => {
      const s = stepOnce((b as Extract<Node, { k: 'br' }>).x);
      inner ??= s.inner ?? s.level;
      if (s.node.k !== 'n') closed = false;
      return s.node.k === 'n' ? s.node : { ...(b as Extract<Node, { k: 'br' }>), x: s.node };
    });
    return { node, level: 'G', ...(inner && { inner }), closed };
  }
  if (any(n, isReadyPow)) {
    return {
      node: replace(n, isReadyPow, (p) => {
        const q = p as Extract<Node, { k: 'pow' }>;
        return num((q.b as Extract<Node, { k: 'n' }>).v ** q.e);
      }),
      level: 'E',
    };
  }
  const apply = (o: Node) => num(evaluate(o)!);
  if (any(n, isReady(['*', '/']))) return { node: replace(n, isReady(['*', '/']), apply), level: 'M' };
  return { node: replace(n, isReady(['+', '-']), apply), level: 'A' };
}

const REASON: Record<Level, string> = {
  G: 'grouping (brackets) first',
  E: 'exponents next',
  M: 'multiply or divide, left to right',
  A: 'add or subtract, left to right',
};
const INSIDE: Record<Level, string> = {
  G: 'inside the brackets: the inner brackets first',
  E: 'inside the brackets: exponents first',
  M: 'inside the brackets: multiply or divide',
  A: 'inside the brackets: add or subtract',
};

/** Worked solution lines for an expression, each with the GEMA reason. */
function working(src: string): { expr: string; answer: number; lines: string[] } {
  let node = parse(src);
  const expr = render(node);
  const answer = evaluate(node)!;
  const lines = [`$${expr}$`];
  for (let guard = 0; node.k !== 'n' && guard < 20; guard++) {
    const st = stepOnce(node);
    node = st.node;
    const reason = st.level === 'G' && !(st.closed && (st.inner === 'A' || st.inner === 'M')) && st.inner ? INSIDE[st.inner] : REASON[st.level];
    lines.push(`$= ${render(node)}$ (${reason})`);
  }
  return { expr, answer, lines };
}

/** Tries `make` until it gives an expression with a whole-number value in [lo, hi]. */
function build(rng: Rng, make: (rng: Rng) => string, lo = 0, hi = 999): string {
  for (let attempt = 0; attempt < 200; attempt++) {
    const src = make(rng);
    const v = evaluate(parse(src));
    if (v !== null && v >= lo && v <= hi) return src;
  }
  return '3 + 4 * 2';
}

const r = (rng: Rng, lo: number, hi: number) => rng.int(lo, hi);

const GEMA_HINT = 'GEMA: Grouping (brackets), then Exponents, then Multiplying and dividing, then Adding and subtracting.';

function evaluateQuestion(src: string, hints: string[], marks = 1): TemplateOutput {
  const w = working(src);
  return {
    type: 'numeric',
    prompt: `Work out $${w.expr}$.`,
    answer: w.answer,
    ...(marks > 1 && { marks }),
    calculator: 'not-allowed',
    hints,
    solution: w.lines.join('\n\n'),
  };
}

// ---------------------------------------------------------------------------

export const noBrackets: QuestionTemplate = {
  id: 'm7.num.order-operations.no-brackets',
  topicId: 'm7.num.order-operations',
  title: 'Evaluate expressions without brackets (× ÷ before + −, left to right)',
  difficulties: [1, 2],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      const kind = rng.pick(['addMul', 'subMul', 'addDiv', 'subDiv', 'mulAdd'] as const);
      const src = build(rng, (g) => {
        const b = r(g, 2, 9);
        const c = r(g, 2, 9);
        const a = r(g, 2, 40);
        if (kind === 'addMul') return `${a} + ${b} * ${c}`;
        if (kind === 'subMul') return `${b * c + r(g, 1, 30)} - ${b} * ${c}`;
        if (kind === 'addDiv') return `${a} + ${b * c} / ${c}`;
        if (kind === 'subDiv') return `${b + r(g, 1, 30)} - ${b * c} / ${c}`;
        return `${b} * ${c} + ${a}`;
      });
      return evaluateQuestion(src, [GEMA_HINT, 'Find the × or ÷ part and work it out before you add or subtract.']);
    }
    const kind = rng.pick(['subAdd', 'divMul', 'twoProducts', 'addMulSub', 'subDivAdd'] as const);
    const src = build(
      rng,
      (g) => {
        const a = r(g, 2, 9);
        const b = r(g, 2, 9);
        const c = r(g, 2, 9);
        const d = r(g, 2, 9);
        if (kind === 'subAdd') return `${r(g, 20, 60)} - ${r(g, 5, 15)} + ${r(g, 2, 15)}`;
        if (kind === 'divMul') return `${a * b} / ${a} * ${c}`;
        if (kind === 'twoProducts') return `${a} * ${b} - ${c} * ${d}`;
        if (kind === 'addMulSub') return `${r(g, 5, 30)} + ${a} * ${b} - ${r(g, 2, 20)}`;
        return `${r(g, 10, 40)} - ${a * b} / ${b} + ${c}`;
      },
      1,
      999,
    );
    const hints =
      kind === 'subAdd'
        ? ['There is only adding and subtracting here.', '+ and − are partners: work them out from left to right.']
        : kind === 'divMul'
          ? ['× and ÷ are partners: work them out from left to right.', 'Do the first one you come to, reading from the left.']
          : [GEMA_HINT, 'Do all the × and ÷ parts first, then the + and − parts from left to right.'];
    return evaluateQuestion(src, hints);
  },
};

export const bracketsPowers: QuestionTemplate = {
  id: 'm7.num.order-operations.brackets-powers',
  topicId: 'm7.num.order-operations',
  title: 'Evaluate expressions with brackets, squares and cubes',
  difficulties: [2, 3, 4, 5],
  generate({ rng, difficulty }) {
    if (difficulty === 2) {
      const kind = rng.pick(['sumTimes', 'timesDiff', 'sumDiv', 'minusSum', 'twoBrackets'] as const);
      const src = build(rng, (g) => {
        const a = r(g, 2, 15);
        const b = r(g, 2, 15);
        const c = r(g, 2, 9);
        if (kind === 'sumTimes') return `(${a} + ${b}) * ${c}`;
        if (kind === 'timesDiff') return `${c} * (${a + b} - ${b})`;
        if (kind === 'sumDiv') return `(${a * c - b} + ${b}) / ${c}`;
        if (kind === 'minusSum') return `${r(g, 30, 80)} - (${a} + ${b})`;
        return `(${a} + ${c}) * (${b + c} - ${b})`;
      });
      return evaluateQuestion(src, ['Grouping comes first in GEMA.', 'Work out the bracket, then use that answer in the rest of the calculation.']);
    }
    if (difficulty === 3) {
      const kind = rng.pick(['addSq', 'mulSq', 'sqBracket', 'sqSubMul', 'bracketSqAdd', 'cube'] as const);
      const src = build(rng, (g) => {
        const a = r(g, 2, 20);
        const b = r(g, 2, 9);
        const c = r(g, 2, 6);
        if (kind === 'addSq') return `${a} + ${r(g, 2, 12)}^2`;
        if (kind === 'mulSq') return `${r(g, 2, 6)} * ${r(g, 2, 10)}^2`;
        if (kind === 'sqBracket') return `(${b} + ${c})^2`;
        if (kind === 'sqSubMul') return `${r(g, 5, 12)}^2 - ${b} * ${c}`;
        if (kind === 'bracketSqAdd') return `(${b + c} - ${b})^2 + ${a}`;
        return `${r(g, 2, 5)}^3 + ${a}`;
      });
      return evaluateQuestion(src, [
        GEMA_HINT,
        'An exponent tells you how many times to multiply the number by itself: $5^2 = 5 \\times 5$, not $5 \\times 2$.',
      ]);
    }
    if (difficulty === 4) {
      const kind = rng.pick(['a', 'b', 'c', 'd', 'e'] as const);
      const src = build(
        rng,
        (g) => {
          if (kind === 'a') {
            const e = r(g, 2, 5);
            const d = r(g, 1, 9);
            return `${r(g, 2, 30)} + ${r(g, 2, 6)} * (${d + e} - ${d})^2`;
          }
          if (kind === 'b') {
            const s = r(g, 4, 12);
            const divs = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((x) => (s * s) % x === 0);
            const c = g.pick(divs);
            const a = r(g, 1, s - 1);
            return `(${a} + ${s - a})^2 / ${c} - ${r(g, 1, 20)}`;
          }
          if (kind === 'c') return `${r(g, 3, 9)} * (${r(g, 2, 9)} + ${r(g, 2, 9)}) - ${r(g, 2, 6)}^2`;
          if (kind === 'd') return `${r(g, 3, 5)}^3 - ${r(g, 2, 9)} * ${r(g, 2, 9)}`;
          const a = r(g, 2, 9);
          return `(${a + r(g, 2, 9)} - ${a}) * ${r(g, 2, 9)} + ${r(g, 2, 9)}^2`;
        },
        1,
        999,
      );
      return evaluateQuestion(src, [GEMA_HINT, 'Write a new line after each step, so you only do one kind of operation at a time.'], 2);
    }
    // difficulty 5: longer expressions, nested grouping
    const kind = rng.pick(['a', 'b', 'c', 'd'] as const);
    const src = build(
      rng,
      (g) => {
        if (kind === 'a') {
          const e = r(g, 2, 9);
          return `${r(g, 2, 9)} * (${r(g, 2, 20)} + ${r(g, 2, 6)}^2) - ${e * r(g, 2, 9)} / ${e}`;
        }
        if (kind === 'b') {
          const a = r(g, 2, 5);
          const c = r(g, 2, 9);
          const k = r(g, 2, Math.max(2, Math.floor(a ** 3 / c) - 1));
          return `(${a}^3 - ${a ** 3 - c * k}) / ${c} + ${r(g, 2, 9)} * ${r(g, 2, 9)}`;
        }
        if (kind === 'c') {
          const e = g.pick([2, 3, 4, 5, 6]);
          const s = e * r(g, 1, 4);
          const b = r(g, 1, s - 1 || 1);
          return `${r(g, 8, 15)}^2 - (${b} + ${s - b}) * ${r(g, 2, 9)} / ${e}`;
        }
        const d = r(g, 1, 9);
        const e = r(g, 2, 4);
        return `[${r(g, 2, 20)} + (${d + e} - ${d})^2] * ${r(g, 2, 6)}`;
      },
      1,
      999,
    );
    return evaluateQuestion(
      src,
      [GEMA_HINT, 'With brackets inside brackets, start with the innermost one.', 'Keep going one step at a time, rewriting the whole line each time.'],
      2,
    );
  },
};

// ---------------------------------------------------------------------------
// Which part first? Each pattern has a unique first step, and the distractors are the parts
// students often do first by mistake.

interface FirstStep {
  expr: string;
  correct: Choice;
  wrong: Choice[];
  /** Why the correct part is first. */
  why: string;
}

function firstStepPattern(rng: Rng, difficulty: number): FirstStep {
  const a = rng.int(2, 20);
  const b = rng.int(2, 9);
  const c = rng.int(2, 9);
  const d = rng.int(2, 9);
  const mt = (x: string) => `$${x}$`;
  const either: Choice = {
    text: 'It doesn’t matter which part you do first',
    feedback: 'It does matter. Doing the parts in a different order gives a different answer, which is why we need GEMA.',
  };
  if (difficulty === 1) {
    const kind = rng.pick(['addMul', 'subDiv', 'addDiv', 'subMul'] as const);
    if (kind === 'addMul') {
      return {
        expr: `${a} + ${b} \\times ${c}`,
        correct: { text: mt(`${b} \\times ${c}`) },
        wrong: [{ text: mt(`${a} + ${b}`), feedback: 'Adding comes last in GEMA. Multiply before you add, even though the + comes first.' }, either],
        why: `Multiplying (M) comes before adding (A), so work out $${b} \\times ${c}$ first.`,
      };
    }
    if (kind === 'subMul') {
      const A = b * c + a;
      return {
        expr: `${A} - ${b} \\times ${c}`,
        correct: { text: mt(`${b} \\times ${c}`) },
        wrong: [{ text: mt(`${A} - ${b}`), feedback: 'Subtracting comes last in GEMA. Multiply before you subtract.' }, either],
        why: `Multiplying (M) comes before subtracting (A), so work out $${b} \\times ${c}$ first.`,
      };
    }
    const B = b * c;
    const A = kind === 'subDiv' ? a + b : a;
    const op = kind === 'subDiv' ? '-' : '+';
    return {
      expr: `${A} ${op} ${B} \\div ${c}`,
      correct: { text: mt(`${B} \\div ${c}`) },
      wrong: [{ text: mt(`${A} ${op} ${B}`), feedback: `${op === '+' ? 'Adding' : 'Subtracting'} comes last in GEMA. Divide first.` }, either],
      why: `Dividing (M) comes before ${op === '+' ? 'adding' : 'subtracting'} (A), so work out $${B} \\div ${c}$ first.`,
    };
  }
  if (difficulty === 2) {
    const kind = rng.pick(['subAddMul', 'divMul', 'bracketMul', 'mulBracket', 'subAdd'] as const);
    if (kind === 'subAddMul') {
      const A = a + 10;
      return {
        expr: `${A} - ${b} + ${c} \\times ${d}`,
        correct: { text: mt(`${c} \\times ${d}`) },
        wrong: [
          { text: mt(`${A} - ${b}`), feedback: 'Reading from the left is only for operations of the same kind. The × comes before any + or −.' },
          { text: mt(`${b} + ${c}`), feedback: 'Adding comes after multiplying in GEMA.' },
          either,
        ],
        why: `There is no grouping or exponent, so multiplying comes first: $${c} \\times ${d}$.`,
      };
    }
    if (kind === 'divMul') {
      const A = b * c;
      return {
        expr: `${A} \\div ${b} \\times ${d}`,
        correct: { text: mt(`${A} \\div ${b}`) },
        wrong: [
          { text: mt(`${b} \\times ${d}`), feedback: '× and ÷ are partners in GEMA. Neither one beats the other, so work from left to right.' },
          either,
        ],
        why: `× and ÷ have the same rank, so work from left to right. The ÷ comes first: $${A} \\div ${b}$.`,
      };
    }
    if (kind === 'bracketMul') {
      const B = b + c;
      return {
        expr: `${a} + (${B} - ${c}) \\times ${d}`,
        correct: { text: mt(`${B} - ${c}`) },
        wrong: [
          { text: mt(`${c} \\times ${d}`), feedback: 'The brackets group $' + `${B} - ${c}` + '$ together. Grouping comes before multiplying.' },
          { text: mt(`${a} + ${B}`), feedback: 'Adding comes last. Start with the grouping (the brackets).' },
          either,
        ],
        why: `Grouping (brackets) comes first in GEMA, so work out $${B} - ${c}$ first.`,
      };
    }
    if (kind === 'mulBracket') {
      return {
        expr: `${b} \\times (${a} + ${c}) - ${d}`,
        correct: { text: mt(`${a} + ${c}`) },
        wrong: [
          { text: mt(`${b} \\times ${a}`), feedback: 'The brackets keep $' + `${a} + ${c}` + '$ together. Work out the grouping before multiplying.' },
          { text: mt(`${c} - ${d}`), feedback: 'The $' + `${c}` + '$ is inside the brackets, so it belongs to the grouping. Do the brackets first.' },
          either,
        ],
        why: `Grouping (brackets) comes first in GEMA, so work out $${a} + ${c}$ first.`,
      };
    }
    const A = a + 15;
    return {
      expr: `${A} - ${b} + ${c}`,
      correct: { text: mt(`${A} - ${b}`) },
      wrong: [
        {
          text: mt(`${b} + ${c}`),
          feedback: `+ and − are partners, so work from left to right. Doing $${b} + ${c}$ first gives ${A - b - c}, but the answer is ${A - b + c}.`,
        },
        either,
      ],
      why: `+ and − have the same rank, so work from left to right: $${A} - ${b}$ comes first.`,
    };
  }
  // difficulty 3: exponents. The squared number is at least 3 and differs from the multiplier, so
  // no distractor ("3 × 3", "2 × 2") is secretly the same as the square.
  const kind = rng.pick(['mulSq', 'addMulSq', 'bracketSqDiv', 'mulBracketSq'] as const);
  if ((kind === 'mulSq' || kind === 'addMulSq') && (c < 3 || b === c)) return firstStepPattern(rng, difficulty);
  if (kind === 'mulSq') {
    return {
      expr: `${b} \\times ${c}^{2}`,
      correct: { text: mt(`${c}^{2}`) },
      wrong: [
        { text: mt(`${b} \\times ${c}`), feedback: `The exponent belongs to the ${c} only. Exponents come before multiplying.` },
        { text: mt(`${c} \\times 2`), feedback: `$${c}^{2}$ means $${c} \\times ${c}$, not $${c} \\times 2$. But yes, the exponent is first.` },
        either,
      ],
      why: `Exponents (E) come before multiplying (M), so work out $${c}^{2} = ${c} \\times ${c}$ first.`,
    };
  }
  if (kind === 'addMulSq') {
    return {
      expr: `${a} + ${b} \\times ${c}^{2}`,
      correct: { text: mt(`${c}^{2}`) },
      wrong: [
        { text: mt(`${b} \\times ${c}`), feedback: `The exponent belongs to the ${c} only, and exponents come before multiplying.` },
        { text: mt(`${a} + ${b}`), feedback: 'Adding comes last in GEMA.' },
        either,
      ],
      why: `There is no grouping, and exponents (E) come next, so work out $${c}^{2}$ first.`,
    };
  }
  if (kind === 'bracketSqDiv') {
    return {
      expr: `(${b} + ${c})^{2} \\div ${b + c}`,
      correct: { text: mt(`${b} + ${c}`) },
      wrong: [
        { text: mt(`${c}^{2}`), feedback: `The exponent is outside the brackets, so it squares the whole group $(${b} + ${c})$. Work out the bracket first.` },
        { text: mt(`${b}^{2} + ${c}^{2}`), feedback: `$(${b} + ${c})^{2}$ is not the same as $${b}^{2} + ${c}^{2}$. Work out the bracket first, then square it.` },
        either,
      ],
      why: `Grouping (brackets) comes before exponents, so work out $${b} + ${c}$ first, then square the answer.`,
    };
  }
  const B = c + d;
  return {
    expr: `${b} \\times (${B} - ${d})^{2}`,
    correct: { text: mt(`${B} - ${d}`) },
    wrong: [
      { text: mt(`${d}^{2}`), feedback: 'The exponent squares the whole bracket, so work out the bracket first.' },
      { text: mt(`${b} \\times ${B}`), feedback: 'Grouping and exponents both come before multiplying.' },
      either,
    ],
    why: `Grouping (brackets) comes first in GEMA, so work out $${B} - ${d}$ first.`,
  };
}

export const firstStep: QuestionTemplate = {
  id: 'm7.num.order-operations.first-step',
  topicId: 'm7.num.order-operations',
  title: 'Which part do you work out first?',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    const p = firstStepPattern(rng, difficulty);
    const fields = mcqFields(rng, p.correct, p.wrong);
    return {
      type: 'mcq',
      prompt: `Which part of $${p.expr}$ should you work out **first**?`,
      ...fields,
      calculator: 'not-allowed',
      hints: [GEMA_HINT, 'Look for brackets first, then exponents (small raised numbers), then × or ÷.'],
      solution: p.why,
    };
  },
};

// ---------------------------------------------------------------------------
// Properties: commutative, associative and distributive, used to calculate efficiently.

export const properties: QuestionTemplate = {
  id: 'm7.num.order-operations.properties',
  topicId: 'm7.num.order-operations',
  title: 'Use the commutative, associative and distributive properties',
  difficulties: [3, 4],
  generate({ rng, difficulty }) {
    if (difficulty === 3) {
      const kind = rng.pick(['nearTen', 'splitAdd', 'pairs', 'addPairs'] as const);
      if (kind === 'nearTen') {
        const a = rng.int(3, 9);
        const k = rng.pick([2, 3, 4, 5, 6, 7, 8, 9, 10]);
        const s = rng.pick([1, 2]);
        const n = 10 * k - s;
        return {
          type: 'numeric',
          prompt: `Use the distributive property to work out $${a} \\times ${n}$ in your head.`,
          answer: a * n,
          calculator: 'not-allowed',
          hints: [`$${n}$ is close to $${10 * k}$. How far away is it?`, `Work out $${a} \\times ${10 * k}$, then take away $${a}$ lots of $${s}$.`],
          solution: `$${n} = ${10 * k} - ${s}$, so\n\n$${a} \\times ${n} = ${a} \\times ${10 * k} - ${a} \\times ${s}$\n\n$= ${tex(a * 10 * k)} - ${a * s}$\n\n$= ${tex(a * n)}$`,
        };
      }
      if (kind === 'splitAdd') {
        const a = rng.int(3, 9);
        const t = rng.int(1, 9) * 10;
        const o = rng.int(1, 9);
        const n = t + o;
        return {
          type: 'numeric',
          prompt: `Use the distributive property to work out $${a} \\times ${n}$. Split ${n} into tens and ones.`,
          answer: a * n,
          calculator: 'not-allowed',
          hints: [`$${n} = ${t} + ${o}$.`, `Multiply both parts by ${a}, then add.`],
          solution: `$${a} \\times ${n} = ${a} \\times (${t} + ${o})$\n\n$= ${a} \\times ${t} + ${a} \\times ${o}$\n\n$= ${a * t} + ${a * o}$\n\n$= ${tex(a * n)}$`,
        };
      }
      if (kind === 'pairs') {
        const [p, q] = rng.pick([
          [4, 25],
          [2, 50],
          [5, 20],
          [25, 4],
          [50, 2],
          [20, 5],
        ] as const);
        const m = rng.int(3, 49);
        const order = rng.pick(['pmq', 'mpq'] as const);
        const shown = order === 'pmq' ? `${p} \\times ${m} \\times ${q}` : `${m} \\times ${p} \\times ${q}`;
        return {
          type: 'numeric',
          prompt: `Work out $${shown}$ in your head. Look for an easy pair to multiply first.`,
          answer: p * q * m,
          calculator: 'not-allowed',
          hints: ['When you only multiply, you can change the order and the grouping without changing the answer.', `Which two numbers multiply to make 100?`],
          solution: `Multiplying can be done in any order (commutative) and grouped any way (associative):\n\n$${shown} = (${p} \\times ${q}) \\times ${m}$\n\n$= 100 \\times ${m}$\n\n$= ${tex(100 * m)}$`,
        };
      }
      const x = rng.int(11, 89);
      const y = 100 - x;
      const z = rng.int(11, 89);
      const shown = rng.chance(0.5) ? `${x} + ${z} + ${y}` : `${z} + ${x} + ${y}`;
      return {
        type: 'numeric',
        prompt: `Work out $${shown}$ in your head. Look for two numbers that make 100.`,
        answer: x + y + z,
        calculator: 'not-allowed',
        hints: ['When you only add, you can change the order without changing the answer.', 'Find the pair that adds to exactly 100.'],
        solution: `Adding can be done in any order (commutative) and grouped any way (associative):\n\n$${shown} = (${x} + ${y}) + ${z}$\n\n$= 100 + ${z}$\n\n$= ${100 + z}$`,
      };
    }
    // difficulty 4
    if (rng.chance(0.55)) {
      const a = rng.int(3, 9);
      const k = rng.int(3, 9);
      const s = rng.pick([1, 2, 3]);
      const n = 10 * k - s;
      const fields = mcqFields(
        rng,
        { text: `$${a} \\times ${10 * k} - ${a} \\times ${s}$` },
        [
          { text: `$${a} \\times ${10 * k} - ${s}$`, feedback: `Every part of ${n} must be multiplied by ${a}. You need to take away ${a} lots of ${s}, not just ${s}.` },
          { text: `$${a} \\times ${10 * k} + ${a} \\times ${s}$`, feedback: `${n} is ${s} **less** than ${10 * k}, so you take away the extra ${a} lots of ${s}.` },
          {
            text: `$${a} \\times ${10 * (k - 1)} + ${10 - s}$`,
            feedback: `Splitting ${n} into ${10 * (k - 1)} + ${10 - s} is fine, but then both parts must be multiplied by ${a}.`,
          },
        ],
      );
      return {
        type: 'mcq',
        prompt: `Which calculation gives the same answer as $${a} \\times ${n}$?`,
        ...fields,
        calculator: 'not-allowed',
        hints: [`$${n} = ${10 * k} - ${s}$.`, `The distributive property says every part inside the bracket gets multiplied: $${a} \\times (${10 * k} - ${s})$.`],
        solution: `$${a} \\times ${n} = ${a} \\times (${10 * k} - ${s}) = ${a} \\times ${10 * k} - ${a} \\times ${s}$\n\n$= ${a * 10 * k} - ${a * s} = ${a * n}$\n\nThis is the **distributive** property: the ${a} multiplies every part inside the bracket.`,
      };
    }
    const kind = rng.pick(['comm-add', 'comm-mul', 'assoc-add', 'assoc-mul', 'dist'] as const);
    const x = rng.int(2, 19);
    let y = rng.int(2, 19);
    if (y === x) y = x + 1;
    let z = rng.int(2, 19);
    if (z === y || z === x) z = Math.max(x, y) + 1;
    const statement =
      kind === 'comm-add'
        ? `${x} + ${y} = ${y} + ${x}`
        : kind === 'comm-mul'
          ? `${x} \\times ${y} = ${y} \\times ${x}`
          : kind === 'assoc-add'
            ? `(${x} + ${y}) + ${z} = ${x} + (${y} + ${z})`
            : kind === 'assoc-mul'
              ? `(${x} \\times ${y}) \\times ${z} = ${x} \\times (${y} \\times ${z})`
              : `${x} \\times (${y} + ${z}) = ${x} \\times ${y} + ${x} \\times ${z}`;
    const prop = kind.startsWith('comm') ? 'commutative' : kind.startsWith('assoc') ? 'associative' : 'distributive';
    const texts: Record<string, Choice> = {
      commutative: { text: 'The commutative property', feedback: 'Commutative means you can swap the order of two numbers, like $3 + 5 = 5 + 3$.' },
      associative: { text: 'The associative property', feedback: 'Associative means you can change the grouping (where the brackets go) when you only add or only multiply.' },
      distributive: { text: 'The distributive property', feedback: 'Distributive means multiplying every part inside a bracket, like $2 \\times (3 + 4) = 2 \\times 3 + 2 \\times 4$.' },
    };
    const fields = mcqFields(
      rng,
      { text: texts[prop]!.text },
      [
        ...Object.entries(texts)
          .filter(([k]) => k !== prop)
          .map(([, v]) => v),
        { text: 'The additive inverse', feedback: 'An additive inverse is the number that adds to give zero, like $-5 + 5 = 0$.' },
      ],
    );
    const why =
      prop === 'commutative'
        ? 'The two numbers have swapped places, and the answer stays the same. That is the **commutative** property.'
        : prop === 'associative'
          ? 'The numbers stay in the same order, but the brackets group them differently. That is the **associative** property.'
          : `The ${x} multiplies each number inside the bracket. That is the **distributive** property.`;
    return {
      type: 'mcq',
      prompt: `Which property does this show?\n\n$${statement}$`,
      ...fields,
      calculator: 'not-allowed',
      hints: ['Look at what has changed between the two sides: the order, the grouping, or a bracket being multiplied out?'],
      solution: why,
    };
  },
};

// ---------------------------------------------------------------------------
// Where do the brackets go? Every single-bracket placement is evaluated; the target is one whose
// value no other placement gives.

function placements(nums: number[], ops: Op[]): { src: string; value: number }[] {
  const out: { src: string; value: number }[] = [];
  const n = nums.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      let s = '';
      for (let t = 0; t < n; t++) {
        if (t === i) s += '(';
        s += nums[t];
        if (t === j) s += ')';
        if (t < n - 1) s += ` ${ops[t]} `;
      }
      const v = evaluate(parse(s));
      if (v !== null) out.push({ src: s, value: v });
    }
  }
  return out;
}

export const insertBrackets: QuestionTemplate = {
  id: 'm7.num.order-operations.insert-brackets',
  topicId: 'm7.num.order-operations',
  title: 'Put brackets in to make a number sentence true',
  difficulties: [4, 5],
  generate({ rng, difficulty }) {
    const size = difficulty === 4 ? 4 : 5;
    const opsPool: Op[] = difficulty === 4 ? ['+', '-', '*'] : ['+', '-', '*', '*', '/'];
    for (let attempt = 0; attempt < 300; attempt++) {
      const nums = Array.from({ length: size }, () => rng.int(2, 9));
      const ops = Array.from({ length: size - 1 }, () => rng.pick(opsPool));
      if (!ops.includes('*') || !(ops.includes('+') || ops.includes('-'))) continue;
      const plain = nums.map((x, i) => (i < size - 1 ? `${x} ${ops[i]}` : `${x}`)).join(' ');
      const plainValue = evaluate(parse(plain));
      if (plainValue === null) continue;
      const all = placements(nums, ops).filter((p) => p.value !== plainValue && p.value <= 500);
      const counts = new Map<number, number>();
      for (const p of all) counts.set(p.value, (counts.get(p.value) ?? 0) + 1);
      const unique = all.filter((p) => counts.get(p.value) === 1);
      if (!unique.length) continue;
      const target = rng.pick(unique);
      const others = rng.shuffle(all.filter((p) => p.value !== target.value));
      const usedValues = new Set([target.value]);
      const distractors: Choice[] = [];
      for (const o of others) {
        if (usedValues.has(o.value)) continue;
        usedValues.add(o.value);
        distractors.push({ text: `$${render(parse(o.src))}$`, feedback: `This makes ${o.value}, not ${target.value}.` });
        if (distractors.length === 3) break;
      }
      if (distractors.length < 2) continue;
      const fields = mcqFields(rng, { text: `$${render(parse(target.src))}$` }, distractors);
      const w = working(target.src);
      return {
        type: 'mcq',
        prompt: `Where should the brackets go to make this true?\n\n$${render(parse(plain))} = ${target.value}$`,
        ...fields,
        ...(difficulty === 5 && { marks: 2 }),
        calculator: 'not-allowed',
        hints: [
          `Without brackets the answer would be ${plainValue}. Brackets change which part is worked out first.`,
          'Try each option: work out the bracket first, then follow GEMA for the rest.',
        ],
        solution: `${w.lines.join('\n\n')}\n\nSo the brackets go around $${render(parse(target.src.slice(target.src.indexOf('(') + 1, target.src.indexOf(')'))))}$.`,
      };
    }
    // Fallback (not normally reached).
    const fields = mcqFields(rng, { text: '$(3 + 4) \\times 5 - 2$' }, [
      { text: '$3 + 4 \\times (5 - 2)$', feedback: 'This makes 15, not 33.' },
      { text: '$3 + (4 \\times 5 - 2)$', feedback: 'This makes 21, not 33.' },
    ]);
    return {
      type: 'mcq',
      prompt: 'Where should the brackets go to make this true?\n\n$3 + 4 \\times 5 - 2 = 33$',
      ...fields,
      calculator: 'not-allowed',
      hints: ['Brackets change which part is worked out first.'],
      solution: '$(3 + 4) \\times 5 - 2 = 7 \\times 5 - 2 = 35 - 2 = 33$',
    };
  },
};

export const templates: QuestionTemplate[] = [noBrackets, bracketsPowers, firstStep, properties, insertBrackets];
