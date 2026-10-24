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
    .trim();
  // Students sometimes write "y = 2x + 3" when the answer is the expression.
  s = s.replace(/^[a-zA-Z]\s*=\s*/, '');
  return splitVariables(s, variables);
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

/** True when the top level is a product/power containing a bracketed sum — e.g. "3(x + 2)". */
export function isFactorised(expr: ParsedExpression): boolean {
  let root = unwrap(expr.node);
  if (opOf(root) === 'unaryMinus') root = unwrap(argsOf(root)[0]!);
  const op = opOf(root);
  if (op === 'multiply') return argsOf(root).some((a) => isSum(a) || opOf(a) === 'pow' || opOf(a) === 'multiply');
  if (op === 'pow') return isSum(argsOf(root)[0]!);
  return false;
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

/** Expanded with like terms collected, and no more terms than the model answer. */
export function isSimplified(expr: ParsedExpression, model: ParsedExpression): boolean {
  if (!isExpanded(expr)) return false;
  const studentTerms = terms(expr.node);
  const signatures = studentTerms.map(termSignature);
  if (new Set(signatures).size !== signatures.length) return false;
  return studentTerms.length <= terms(model.node).length;
}
