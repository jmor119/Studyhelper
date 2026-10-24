import { parse, type MathNode } from 'mathjs';
import { latexToPlain } from './latex';

// Algebraic answers are checked by parsing to a whitelisted AST and evaluating it ourselves at
// random points. mathjs is used only as a parser — student input is never passed to evaluate().

const FUNCTIONS: Record<string, (x: number) => number> = {
  sqrt: Math.sqrt,
  abs: Math.abs,
};
const CONSTANTS: Record<string, number> = { pi: Math.PI };
const RESERVED = new Set([...Object.keys(FUNCTIONS), ...Object.keys(CONSTANTS)]);

export class ExpressionError extends Error {}

/** Splits runs of letters like "xy" or "2ab" into products of single-letter variables. */
function splitVariables(s: string, variables: readonly string[]): string {
  return s.replace(/[a-zA-Z]+/g, (word) => {
    if (RESERVED.has(word.toLowerCase())) return word.toLowerCase();
    if (word.length === 1) return word;
    const letters = word.split('');
    if (letters.every((ch) => variables.includes(ch))) return letters.join('*');
    return word; // unknown multi-letter symbol → rejected during validation
  });
}

export function normaliseExpressionInput(raw: string, variables: readonly string[]): string {
  let s = latexToPlain(raw)
    .replace(/[\u2212\u2013\u2014]/g, '-')
    .replace(/[×·]/g, '*')
    .replace(/÷/g, '/')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/√\s*\(/g, 'sqrt(')
    .trim()
    // Year 9 answers use single lowercase letters; accept capitals typed by accident ("P = 2L + 2W").
    .toLowerCase();
  // Students sometimes write "y = 2x + 3" when the answer is the expression. Only strip the prefix
  // when that letter isn't part of the expression (otherwise it's an equation, e.g. "x = 2x + 1").
  const prefix = s.match(/^([a-z])\s*=\s*/);
  if (prefix && !variables.includes(prefix[1]!)) s = s.slice(prefix[0].length);
  s = splitVariables(s, variables);
  // A single-letter variable directly before a bracket is multiplication, not a function call:
  // "3x(2y + 1)" → "3x*(2y + 1)".
  return s.replace(/(^|[^a-z])([a-z])\s*\(/g, (_m, before: string, v: string) => (variables.includes(v) ? `${before}${v}*(` : `${before}${v}(`));
}

function validate(node: MathNode, variables: readonly string[]): void {
  switch (node.type) {
    case 'ConstantNode': {
      const value = (node as unknown as { value: unknown }).value;
      if (typeof value !== 'number') throw new ExpressionError('Only numbers are allowed.');
      return;
    }
    case 'SymbolNode': {
      const name = (node as unknown as { name: string }).name;
      if (variables.includes(name) || name in CONSTANTS) return;
      throw new ExpressionError(`Unexpected symbol "${name}".`);
    }
    case 'ParenthesisNode':
      return validate((node as unknown as { content: MathNode }).content, variables);
    case 'OperatorNode': {
      const op = node as unknown as { fn: string; args: MathNode[] };
      if (!['add', 'subtract', 'multiply', 'divide', 'pow', 'unaryMinus', 'unaryPlus'].includes(op.fn)) {
        throw new ExpressionError(`Operator "${op.fn}" isn't supported.`);
      }
      op.args.forEach((a) => validate(a, variables));
      return;
    }
    case 'FunctionNode': {
      const fn = node as unknown as { fn: { name?: string }; args: MathNode[] };
      const name = fn.fn?.name;
      if (!name || !(name in FUNCTIONS) || fn.args.length !== 1) {
        throw new ExpressionError(`Function "${name ?? '?'}" isn't supported.`);
      }
      fn.args.forEach((a) => validate(a, variables));
      return;
    }
    default:
      throw new ExpressionError('That expression contains something unexpected.');
  }
}

function evaluateNode(node: MathNode, scope: Record<string, number>): number {
  switch (node.type) {
    case 'ConstantNode':
      return (node as unknown as { value: number }).value;
    case 'SymbolNode': {
      const name = (node as unknown as { name: string }).name;
      return name in CONSTANTS ? CONSTANTS[name]! : scope[name]!;
    }
    case 'ParenthesisNode':
      return evaluateNode((node as unknown as { content: MathNode }).content, scope);
    case 'OperatorNode': {
      const { fn, args } = node as unknown as { fn: string; args: MathNode[] };
      const v = args.map((a) => evaluateNode(a, scope));
      switch (fn) {
        case 'add':
          return v[0]! + v[1]!;
        case 'subtract':
          return v[0]! - v[1]!;
        case 'multiply':
          return v[0]! * v[1]!;
        case 'divide':
          return v[0]! / v[1]!;
        case 'pow':
          return v[0]! ** v[1]!;
        case 'unaryMinus':
          return -v[0]!;
        default:
          return v[0]!;
      }
    }
    case 'FunctionNode': {
      const { fn, args } = node as unknown as { fn: { name: string }; args: MathNode[] };
      return FUNCTIONS[fn.name]!(evaluateNode(args[0]!, scope));
    }
    default:
      return Number.NaN;
  }
}

export interface ParsedExpression {
  node: MathNode;
  evaluate(scope: Record<string, number>): number;
}

export function parseExpression(raw: string, variables: readonly string[]): ParsedExpression {
  const text = normaliseExpressionInput(raw, variables);
  if (!text) throw new ExpressionError('Enter an expression.');
  if (/[=<>]/.test(text)) throw new ExpressionError('Enter an expression, not an equation.');
  let node: MathNode;
  try {
    node = parse(text);
  } catch {
    throw new ExpressionError("That expression couldn't be read — check your brackets.");
  }
  validate(node, variables);
  return { node, evaluate: (scope) => evaluateNode(node, scope) };
}

/** Deterministic sample points, avoiding integers and small values where division by zero hides. */
const SAMPLE_POINTS = [0.37, -1.29, 2.61, -3.43, 1.73, 4.19, -0.83, 3.07, -2.47, 0.59];

export function areEquivalent(a: ParsedExpression, b: ParsedExpression, variables: readonly string[]): boolean {
  let compared = 0;
  for (let i = 0; i < SAMPLE_POINTS.length; i++) {
    const scope: Record<string, number> = {};
    variables.forEach((v, k) => {
      scope[v] = SAMPLE_POINTS[(i + k * 3) % SAMPLE_POINTS.length]! + k * 0.11;
    });
    const va = a.evaluate(scope);
    const vb = b.evaluate(scope);
    if (!Number.isFinite(va) && !Number.isFinite(vb)) continue;
    if (!Number.isFinite(va) || !Number.isFinite(vb)) return false;
    const scale = Math.max(1, Math.abs(va), Math.abs(vb));
    if (Math.abs(va - vb) > 1e-7 * scale) return false;
    compared++;
  }
  return compared >= 4;
}

// ---- Form checks ----

function unwrap(node: MathNode): MathNode {
  let n = node;
  while (n.type === 'ParenthesisNode') n = (n as unknown as { content: MathNode }).content;
  return n;
}

function opOf(node: MathNode): string | undefined {
  const n = unwrap(node);
  return n.type === 'OperatorNode' ? (n as unknown as { fn: string }).fn : undefined;
}

function argsOf(node: MathNode): MathNode[] {
  const n = unwrap(node);
  return (n as unknown as { args?: MathNode[] }).args ?? [];
}

function isSum(node: MathNode): boolean {
  const op = opOf(node);
  return op === 'add' || op === 'subtract';
}

function containsSymbol(node: MathNode): boolean {
  let found = false;
  node.traverse((n) => {
    if (n.type === 'SymbolNode' && !((n as unknown as { name: string }).name in CONSTANTS)) found = true;
  });
  return found;
}

/** True when no product or power has a sum as an operand — e.g. "x^2 + 5x + 6". */
export function isExpanded(expr: ParsedExpression): boolean {
  let expanded = true;
  expr.node.traverse((n) => {
    if (n.type !== 'OperatorNode') return;
    const { fn, args } = n as unknown as { fn: string; args: MathNode[] };
    if (fn === 'multiply' && args.some((a) => isSum(a) && containsSymbol(a))) expanded = false;
    if (fn === 'pow' && isSum(args[0]!) && containsSymbol(args[0]!)) expanded = false;
  });
  return expanded;
}

/** Leaves of a product chain: 3*x*(x+2) → [3, x, (x+2)]. */
function factorsOf(node: MathNode): MathNode[] {
  const n = unwrap(node);
  if (opOf(n) === 'multiply') return argsOf(n).flatMap(factorsOf);
  if (opOf(n) === 'unaryMinus') return [...factorsOf(argsOf(n)[0]!)];
  return [n];
}

/** Integer coefficient of a monomial term (variables set to 1), or null if it isn't a whole number. */
function termCoefficient(node: MathNode, variables: readonly string[]): number | null {
  const scope = Object.fromEntries(variables.map((v) => [v, 1]));
  const value = Math.abs(evaluateNode(node, scope));
  return Number.isInteger(value) ? value : null;
}

function gcdAll(values: number[]): number {
  const g2 = (a: number, b: number): number => (b ? g2(b, a % b) : a);
  return values.reduce((g, v) => g2(g, v), 0);
}

/**
 * True when the expression is a product with a bracketed sum, and every bracket is fully factorised
 * (no common whole-number factor left inside) — "3(x + 2)" yes, "2(6x + 9)" no.
 */
export function isFactorised(expr: ParsedExpression, variables: readonly string[] = []): boolean {
  let root = unwrap(expr.node);
  if (opOf(root) === 'unaryMinus') root = unwrap(argsOf(root)[0]!);
  const op = opOf(root);
  let hasBracket = false;
  if (op === 'multiply') hasBracket = factorsOf(root).some((a) => isSum(a) || (opOf(a) === 'pow' && isSum(argsOf(a)[0]!)));
  else if (op === 'pow') hasBracket = isSum(argsOf(root)[0]!);
  if (!hasBracket) return false;
  for (const f of factorsOf(root)) {
    const inner = opOf(f) === 'pow' ? unwrap(argsOf(f)[0]!) : f;
    if (!isSum(inner)) continue;
    const coefficients = terms(inner).map((t) => termCoefficient(t, variables));
    if (coefficients.every((c): c is number => c !== null && c > 0) && gcdAll(coefficients) > 1) return false;
  }
  return true;
}

function terms(node: MathNode): MathNode[] {
  const n = unwrap(node);
  const op = opOf(n);
  if (op === 'add' || op === 'subtract') return argsOf(n).flatMap(terms);
  return [n];
}

/** Signature of a term's variable part, e.g. 3x^2y → "x^2*y". */
function termSignature(node: MathNode): string {
  const powers: Record<string, number> = {};
  const walk = (n: MathNode, exp: number) => {
    const u = unwrap(n);
    if (u.type === 'SymbolNode') {
      const name = (u as unknown as { name: string }).name;
      if (!(name in CONSTANTS)) powers[name] = (powers[name] ?? 0) + exp;
      return;
    }
    const op = opOf(u);
    if (op === 'multiply') argsOf(u).forEach((a) => walk(a, exp));
    else if (op === 'divide') {
      walk(argsOf(u)[0]!, exp);
      walk(argsOf(u)[1]!, -exp);
    } else if (op === 'unaryMinus' || op === 'unaryPlus') walk(argsOf(u)[0]!, exp);
    else if (op === 'pow') {
      const e = unwrap(argsOf(u)[1]!);
      const k = e.type === 'ConstantNode' ? (e as unknown as { value: number }).value : 1;
      walk(argsOf(u)[0]!, exp * k);
    }
  };
  walk(node, 1);
  return Object.entries(powers)
    .filter(([, p]) => p !== 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([v, p]) => (p === 1 ? v : `${v}^${p}`))
    .join('*');
}

/** A term multiplies several numbers, or repeats a letter, e.g. "3a*4b" or "2*x*x". */
function termNotCollected(node: MathNode): boolean {
  const factors = factorsOf(node);
  const numbers = factors.filter((f) => f.type === 'ConstantNode').length;
  const letters = factors.filter((f) => f.type === 'SymbolNode').map((f) => (f as unknown as { name: string }).name);
  return numbers > 1 || new Set(letters).size !== letters.length;
}

/** Expanded with like terms collected, each term written once, and no more terms than the model answer. */
export function isSimplified(expr: ParsedExpression, model: ParsedExpression): boolean {
  if (!isExpanded(expr)) return false;
  const studentTerms = terms(expr.node);
  if (studentTerms.some(termNotCollected)) return false;
  const signatures = studentTerms.map(termSignature);
  if (new Set(signatures).size !== signatures.length) return false;
  return studentTerms.length <= terms(model.node).length;
}
