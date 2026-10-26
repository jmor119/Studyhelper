// A tiny expression engine for m6.num.order-operations: parse "(3 + 5) × 4 - 2^2", evaluate it
// with the order of operations (or with a common wrong order, for MCQ distractors), and write a
// step-by-step solution. Year 6 keeps every step a whole number of 0 or more, so any step that
// goes negative or divides unevenly makes the expression invalid (null).
import { tex } from '../../../format';

export type Op = '+' | '-' | '×' | '÷';
export type Tok = { k: 'n'; v: number } | { k: 'op'; v: Op } | { k: '(' } | { k: ')' } | { k: 'sq' };

/**
 * How the expression is worked out:
 * - `correct`: brackets, squares, × and ÷ left to right, then + and − left to right.
 * - `left-to-right`: brackets and squares first, then every operation strictly left to right.
 * - `fixed-rank`: the "BODMAS letters" mistake: × before ÷ and + before −.
 * - `add-first`: + and − before × and ÷.
 */
export type Mode = 'correct' | 'left-to-right' | 'fixed-rank' | 'add-first';

export interface Step {
  /** The expression after this step. */
  toks: Tok[];
  /** What was done, e.g. "Brackets first". */
  what: string;
  /** The calculation, in KaTeX, e.g. "3 + 5 = 8". */
  calc: string;
}

/** Parses numbers, + - × ÷ ( ) and ^2. Use "-" (hyphen) for minus. */
export function parse(s: string): Tok[] {
  const out: Tok[] = [];
  for (const m of s.matchAll(/\d+|\^2|[-+×÷()]/g)) {
    const t = m[0];
    if (/^\d+$/.test(t)) out.push({ k: 'n', v: Number(t) });
    else if (t === '^2') out.push({ k: 'sq' });
    else if (t === '(') out.push({ k: '(' });
    else if (t === ')') out.push({ k: ')' });
    else out.push({ k: 'op', v: t as Op });
  }
  return out;
}

const opTex = (o: Op) => (o === '×' ? '\\times' : o === '÷' ? '\\div' : o);

/** KaTeX for a token list. */
export function toTex(toks: Tok[]): string {
  const parts: string[] = [];
  for (const t of toks) {
    if (t.k === 'n') parts.push(tex(t.v));
    else if (t.k === 'op') parts.push(opTex(t.v));
    else if (t.k === '(') parts.push('(');
    else if (t.k === ')') parts.push(')');
    else parts.push('^2');
  }
  return parts.join(' ').replace(/\( /g, '(').replace(/ \)/g, ')').replace(/ \^2/g, '^2');
}

/** Plain-text version (for MCQ options and prose): "(3 + 5) × 4". */
export function toPlain(toks: Tok[]): string {
  return toTex(toks).replace(/\\times/g, '×').replace(/\\div/g, '÷').replace(/\{,\}/g, ',').replace(/-/g, '−').replace(/\^2/g, '²');
}

function apply(a: number, o: Op, b: number): number | null {
  switch (o) {
    case '+':
      return a + b;
    case '-':
      return a - b < 0 ? null : a - b;
    case '×':
      return a * b;
    case '÷':
      return b !== 0 && a % b === 0 ? a / b : null;
  }
}

/** Removes brackets around a single number: ( 8 ) → 8. */
function collapse(toks: Tok[]): Tok[] {
  const cur = [...toks];
  for (let i = 0; i + 2 < cur.length; ) {
    if (cur[i]!.k === '(' && cur[i + 1]!.k === 'n' && cur[i + 2]!.k === ')') {
      cur.splice(i, 3, cur[i + 1]!);
      i = Math.max(0, i - 1);
    } else i++;
  }
  return cur;
}

/** Index of the operator to do next inside [s, e), for the given mode. */
function pickOp(toks: Tok[], s: number, e: number, mode: Mode): number {
  const idx: number[] = [];
  for (let i = s; i < e; i++) if (toks[i]!.k === 'op') idx.push(i);
  const opAt = (i: number) => (toks[i] as { v: Op }).v;
  const first = (ops: Op[]) => idx.find((i) => ops.includes(opAt(i)));
  switch (mode) {
    case 'left-to-right':
      return idx[0]!;
    case 'fixed-rank':
      return first(['×']) ?? first(['÷']) ?? first(['+']) ?? first(['-'])!;
    case 'add-first':
      return first(['+', '-']) ?? first(['×', '÷'])!;
    default:
      return first(['×', '÷']) ?? first(['+', '-'])!;
  }
}

const VERB: Record<Op, string> = { '+': 'Add', '-': 'Subtract', '×': 'Multiply', '÷': 'Divide' };

/** Works the expression out one operation at a time. Returns null if any step is invalid. */
export function solve(toks: Tok[], mode: Mode = 'correct'): { value: number; steps: Step[] } | null {
  let cur = collapse(toks);
  const steps: Step[] = [];
  for (let guard = 0; guard < 40; guard++) {
    if (cur.length === 1 && cur[0]!.k === 'n') return { value: cur[0]!.v, steps };
    // Innermost brackets first, otherwise the whole expression.
    const close = cur.findIndex((t) => t.k === ')');
    let s = 0;
    let e = cur.length;
    if (close !== -1) {
      let open = close - 1;
      while (open >= 0 && cur[open]!.k !== '(') open--;
      if (open < 0) return null;
      s = open + 1;
      e = close;
    }
    const bracketed = close !== -1;
    let what: string;
    let calc: string;
    const sqAt = cur.findIndex((t, i) => i >= s && i < e && t.k === 'n' && cur[i + 1]?.k === 'sq' && i + 1 < (bracketed ? e : cur.length));
    if (sqAt !== -1) {
      const v = (cur[sqAt] as { v: number }).v;
      what = bracketed ? 'Brackets first, square' : 'Squares next';
      calc = `${tex(v)}^2 = ${tex(v)} \\times ${tex(v)} = ${tex(v * v)}`;
      cur.splice(sqAt, 2, { k: 'n', v: v * v });
    } else {
      const i = pickOp(cur, s, e, mode);
      if (i === undefined) return null;
      const a = cur[i - 1];
      const b = cur[i + 1];
      if (a?.k !== 'n' || b?.k !== 'n') return null;
      const o = (cur[i] as { v: Op }).v;
      const r = apply(a.v, o, b.v);
      if (r === null) return null;
      const sameRank = cur.slice(s, e).filter((t) => t.k === 'op' && (['+', '-'].includes(o) ? ['+', '-'] : ['×', '÷']).includes(t.v)).length > 1;
      const verb = `${VERB[o]}${sameRank && mode === 'correct' ? ' (working left to right)' : ''}`;
      what = bracketed ? `Brackets first, ${verb.toLowerCase()}` : verb;
      calc = `${tex(a.v)} ${opTex(o)} ${tex(b.v)} = ${tex(r)}`;
      cur.splice(i - 1, 3, { k: 'n', v: r });
    }
    cur = collapse(cur);
    steps.push({ toks: [...cur], what, calc });
  }
  return null;
}

/** Value with the order of operations, or null if a step isn't a whole number ≥ 0. */
export function value(toks: Tok[], mode: Mode = 'correct'): number | null {
  return solve(toks, mode)?.value ?? null;
}

/** A worked solution in Markdown, one step per paragraph. */
export function solutionText(toks: Tok[]): string {
  const res = solve(toks);
  if (!res) throw new Error(`order-operations: invalid expression ${toPlain(toks)}`);
  const lines = [`$${toTex(toks)}$`];
  res.steps.forEach((st, i) => {
    const last = i === res.steps.length - 1;
    lines.push(`**${st.what}:** $${st.calc}$.${last ? '' : ` Now it is $${toTex(st.toks)}$.`}`);
  });
  lines.push(`So the answer is **${tex(res.value).replace(/\{,\}/g, ',')}**.`);
  return lines.join('\n\n');
}

/** Hints that match the features of the expression (never the answer). */
export function hintsFor(toks: Tok[]): string[] {
  const ops = toks.filter((t): t is { k: 'op'; v: Op } => t.k === 'op').map((t) => t.v);
  // Operations outside any brackets (for the left-to-right hint).
  let depth = 0;
  const outer: Op[] = [];
  for (const t of toks) {
    if (t.k === '(') depth++;
    else if (t.k === ')') depth--;
    else if (t.k === 'op' && depth === 0) outer.push(t.v);
  }
  const hints: string[] = [];
  if (toks.some((t) => t.k === '(')) hints.push('Work out the part in brackets first.');
  if (toks.some((t) => t.k === 'sq')) hints.push('Squares come next. A small 2 means multiply the number by itself.');
  const mul = ops.some((o) => o === '×' || o === '÷');
  const add = ops.some((o) => o === '+' || o === '-');
  if (mul && add) hints.push('Do × and ÷ before + and −.');
  const plusMinus = outer.filter((o) => o === '+' || o === '-').length;
  const timesDiv = outer.filter((o) => o === '×' || o === '÷').length;
  if ((plusMinus > 1 && outer.includes('-')) || (timesDiv > 1 && outer.includes('÷'))) {
    hints.push('When two operations have the same rank (like + and −, or × and ÷), work from left to right.');
  }
  if (!hints.length) hints.push('Work from left to right.');
  return hints.slice(0, 3);
}
