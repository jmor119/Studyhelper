import type { QuestionTemplate } from '../../../types';
import { NAMES, clean, tex } from '../../../format';
import { cash, mcqFields, rectangleSvg, triangleSvg, type Choice } from './notation-helpers';

// m7.alg.equations — checking solutions by substitution, one- and two-step linear equations with
// integer solutions (inverse operations), forming equations from words, and number sentences
// (including inequalities). Year 7 scope: no brackets, no unknowns on both sides, and no
// multiplying or dividing negatives, so negative solutions only come from adding or subtracting.

const NO_CALC = { calculator: 'not-allowed' as const };
const LETTERS = ['x', 'n', 'm', 'a', 'p', 'k', 't', 'y', 'b', 'w'] as const;

/** A linear equation in one letter, with a way to show what the left side is for any value. */
interface Eq {
  tex: string;
  /** Value of the left-hand side for this value of the letter. */
  lhs: (x: number) => number;
  /** TeX of the left-hand side with this value substituted, e.g. "3 \times 4 + 2". */
  sub: (x: number) => string;
  rhs: number;
}

/** "If x = 5, then 3 × 5 + 2 = 17, not 14." */
function checkLine(eq: Eq, v: string, x: number): string {
  const value = clean(eq.lhs(x));
  return `If $${v} = ${tex(x)}$, then $${eq.sub(x)} = ${tex(value)}$${value === eq.rhs ? ' ✓' : `, not ${tex(eq.rhs)}`}.`;
}

/** ax + b = c (op '+') or ax − b = c (op '−'), with a = 1 allowed. */
function linearEq(v: string, a: number, op: '+' | '-', b: number, x: number): Eq {
  const ax = a === 1 ? v : `${a}${v}`;
  const rhs = op === '+' ? a * x + b : a * x - b;
  return {
    tex: `${ax} ${op} ${b} = ${tex(rhs)}`,
    lhs: (n) => (op === '+' ? a * n + b : a * n - b),
    sub: (n) => `${a === 1 ? `${n < 0 ? `(${tex(n)})` : tex(n)}` : `${a} \\times ${n < 0 ? `(${tex(n)})` : tex(n)}`} ${op} ${b}`,
    rhs,
  };
}

export const oneStep: QuestionTemplate = {
  id: 'm7.alg.equations.one-step',
  topicId: 'm7.alg.equations',
  title: 'Solve one-step equations',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    const v = rng.pick(LETTERS);
    const kinds =
      difficulty === 1
        ? (['plus', 'minus', 'times'] as const)
        : difficulty === 2
          ? (['plus', 'minus', 'times', 'divide', 'plus-swapped', 'plus-first'] as const)
          : (['neg-plus', 'neg-minus', 'divide', 'times'] as const);
    const kind = rng.pick(kinds as readonly string[]);
    const big = difficulty >= 2;
    let eqTex: string;
    let answer: number;
    let steps: string;
    let check: string;

    if (kind === 'plus' || kind === 'plus-swapped' || kind === 'plus-first') {
      const a = rng.int(2, big ? 40 : 15);
      answer = rng.int(1, big ? 50 : 20);
      const b = answer + a;
      eqTex = kind === 'plus' ? `${v} + ${a} = ${b}` : kind === 'plus-first' ? `${a} + ${v} = ${b}` : `${b} = ${v} + ${a}`;
      steps = `${a} has been added to $${v}$. The inverse of adding ${a} is subtracting ${a}, so subtract ${a} from both sides:\n\n$${v} = ${b} - ${a} = ${answer}$`;
      check = `$${answer} + ${a} = ${b}$ ✓`;
    } else if (kind === 'minus') {
      const a = rng.int(2, big ? 30 : 12);
      answer = rng.int(a + 1, a + (big ? 40 : 15));
      const b = answer - a;
      eqTex = `${v} - ${a} = ${b}`;
      steps = `${a} has been subtracted from $${v}$. The inverse is adding ${a}, so add ${a} to both sides:\n\n$${v} = ${b} + ${a} = ${answer}$`;
      check = `$${answer} - ${a} = ${b}$ ✓`;
    } else if (kind === 'times') {
      const a = rng.int(2, big ? 12 : 9);
      answer = rng.int(2, big ? 12 : 10);
      eqTex = `${a}${v} = ${a * answer}`;
      steps = `$${a}${v}$ means $${a} \\times ${v}$. The inverse of multiplying by ${a} is dividing by ${a}, so divide both sides by ${a}:\n\n$${v} = ${a * answer} \\div ${a} = ${answer}$`;
      check = `$${a} \\times ${answer} = ${a * answer}$ ✓`;
    } else if (kind === 'divide') {
      const a = rng.int(2, difficulty === 3 ? 12 : 9);
      const b = rng.int(2, difficulty === 3 ? 12 : 10);
      answer = a * b;
      eqTex = `\\frac{${v}}{${a}} = ${b}`;
      steps = `$${v}$ has been divided by ${a}. The inverse of dividing by ${a} is multiplying by ${a}, so multiply both sides by ${a}:\n\n$${v} = ${b} \\times ${a} = ${answer}$`;
      check = `$${answer} \\div ${a} = ${b}$ ✓`;
    } else if (kind === 'neg-plus') {
      const a = rng.int(5, 20);
      const b = rng.int(1, a - 1);
      answer = b - a;
      eqTex = `${v} + ${a} = ${b}`;
      steps = `Subtract ${a} from both sides:\n\n$${v} = ${b} - ${a} = ${tex(answer)}$\n\nOn a number line, start at ${b} and move ${a} to the left. You pass 0 and land on $${tex(answer)}$.`;
      check = `$${tex(answer)} + ${a} = ${b}$ ✓`;
    } else {
      // neg-minus: x − a = −b
      const a = rng.int(2, 12);
      const b = rng.int(1, 15);
      answer = a - b;
      eqTex = `${v} - ${a} = ${tex(-b)}`;
      steps = `Add ${a} to both sides:\n\n$${v} = ${tex(-b)} + ${a} = ${tex(answer)}$\n\nOn a number line, start at $${tex(-b)}$ and move ${a} to the right.`;
      check = `$${tex(answer)} - ${a} = ${tex(-b)}$ ✓`;
    }

    return {
      type: 'numeric',
      ...NO_CALC,
      prompt: `Solve $${eqTex}$.`,
      answer,
      form: 'integer',
      variable: v,
      hints: [`What has been done to $${v}$?`, 'Do the inverse (opposite) operation to both sides to get the letter on its own.'],
      solution: `${steps}\n\nCheck: ${check}`,
    };
  },
};

export const twoStep: QuestionTemplate = {
  id: 'm7.alg.equations.two-step',
  topicId: 'm7.alg.equations',
  title: 'Solve two-step equations',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    const v = rng.pick(LETTERS);
    let eqTex: string;
    let answer: number;
    let steps: string[];
    let check: string;

    if (difficulty === 2 || difficulty === 3) {
      const kind = difficulty === 2 ? 'ax+b' : rng.pick(['ax+b', 'ax-b', 'b+ax', 'c=ax+b'] as const);
      const a = rng.int(2, difficulty === 2 ? 5 : 9);
      answer = rng.int(1, difficulty === 2 ? 10 : 12);
      if (kind === 'ax-b') {
        const b = rng.int(1, a * answer - 1);
        const c = a * answer - b;
        eqTex = `${a}${v} - ${b} = ${c}`;
        steps = [`Undo the − ${b} first. Add ${b} to both sides: $${a}${v} = ${c} + ${b} = ${a * answer}$.`, `Then undo the × ${a}. Divide both sides by ${a}: $${v} = ${a * answer} \\div ${a} = ${answer}$.`];
        check = `$${a} \\times ${answer} - ${b} = ${a * answer} - ${b} = ${c}$ ✓`;
      } else {
        const b = rng.int(1, difficulty === 2 ? 10 : 20);
        const c = a * answer + b;
        eqTex = kind === 'b+ax' ? `${b} + ${a}${v} = ${c}` : kind === 'c=ax+b' ? `${c} = ${a}${v} + ${b}` : `${a}${v} + ${b} = ${c}`;
        steps = [`Undo the + ${b} first. Subtract ${b} from both sides: $${a}${v} = ${c} - ${b} = ${a * answer}$.`, `Then undo the × ${a}. Divide both sides by ${a}: $${v} = ${a * answer} \\div ${a} = ${answer}$.`];
        check = `$${a} \\times ${answer} + ${b} = ${a * answer} + ${b} = ${c}$ ✓`;
      }
    } else {
      const kind = rng.pick(['x/a+b', 'x/a-b', 'c-ax'] as const);
      if (kind === 'c-ax') {
        const a = rng.int(2, 9);
        answer = rng.int(1, 10);
        const b = rng.int(1, 20);
        const c = a * answer + b;
        eqTex = `${c} - ${a}${v} = ${b}`;
        steps = [
          `${c} take away $${a}${v}$ leaves ${b}. So $${a}${v}$ must be the difference: $${a}${v} = ${c} - ${b} = ${a * answer}$.`,
          `Divide both sides by ${a}: $${v} = ${a * answer} \\div ${a} = ${answer}$.`,
        ];
        check = `$${c} - ${a} \\times ${answer} = ${c} - ${a * answer} = ${b}$ ✓`;
      } else {
        const a = rng.int(2, 6);
        const b = rng.int(1, 9);
        const k = kind === 'x/a+b' ? rng.int(1, 10) : rng.int(b + 1, b + 10);
        answer = a * k;
        const c = kind === 'x/a+b' ? k + b : k - b;
        const op = kind === 'x/a+b' ? '+' : '-';
        eqTex = `\\frac{${v}}{${a}} ${op} ${b} = ${c}`;
        steps = [
          op === '+'
            ? `Undo the + ${b} first. Subtract ${b} from both sides: $\\frac{${v}}{${a}} = ${c} - ${b} = ${k}$.`
            : `Undo the − ${b} first. Add ${b} to both sides: $\\frac{${v}}{${a}} = ${c} + ${b} = ${k}$.`,
          `Then undo the ÷ ${a}. Multiply both sides by ${a}: $${v} = ${k} \\times ${a} = ${answer}$.`,
        ];
        check = `$${answer} \\div ${a} ${op} ${b} = ${k} ${op} ${b} = ${c}$ ✓`;
      }
    }

    return {
      type: 'numeric',
      ...NO_CALC,
      ...(difficulty === 4 ? { marks: 2 } : {}),
      prompt: `Solve $${eqTex}$.`,
      answer,
      form: 'integer',
      variable: v,
      hints: [`Two things have been done to $${v}$. Which was done last?`, 'Undo the last operation first, then the other one. Do the same to both sides each time.'],
      solution: `${steps.join('\n\n')}\n\nCheck: ${check}`,
    };
  },
};

export const checkSolution: QuestionTemplate = {
  id: 'm7.alg.equations.check-solution',
  topicId: 'm7.alg.equations',
  title: 'Check which value (or equation) is a solution (MCQ)',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    const v = rng.pick(LETTERS);
    const hints = ['Substitute each option into the equation. Which one makes both sides equal?', 'You could also solve the equation with inverse operations, then check.'];

    if (difficulty === 1 || difficulty === 2) {
      let eq: Eq;
      let answer: number;
      let candidates: number[];
      if (difficulty === 1) {
        const kind = rng.pick(['plus', 'times', 'minus'] as const);
        if (kind === 'plus') {
          const a = rng.int(3, 15);
          answer = rng.int(2, 20);
          eq = linearEq(v, 1, '+', a, answer);
          candidates = [eq.rhs + a, eq.rhs, answer + 1, a];
        } else if (kind === 'minus') {
          const a = rng.int(3, 12);
          answer = rng.int(a + 2, a + 20);
          eq = linearEq(v, 1, '-', a, answer);
          candidates = [eq.rhs - a, eq.rhs, answer - 1, answer + 2];
        } else {
          const a = rng.int(2, 9);
          answer = rng.int(2, 10);
          const c = a * answer;
          eq = { tex: `${a}${v} = ${c}`, lhs: (n) => a * n, sub: (n) => `${a} \\times ${tex(n)}`, rhs: c };
          candidates = [c - a, c, c + a, answer + 1];
        }
      } else {
        const a = rng.int(2, 6);
        const b = rng.int(1, 15);
        answer = rng.int(2, 10);
        eq = linearEq(v, a, '+', b, answer);
        const c = eq.rhs;
        candidates = [c - b, (c + b) / a, c / a - b, c - b - a, answer + 1, answer - 1];
      }
      const distractors: Choice[] = candidates
        .filter((x) => Number.isInteger(x) && x > 0 && x !== answer)
        .map((x) => ({ text: `$${v} = ${x}$`, feedback: checkLine(eq, v, x) }));
      return {
        ...NO_CALC,
        prompt: `Which value of $${v}$ is the solution of $${eq.tex}$?`,
        ...mcqFields(rng, { text: `$${v} = ${answer}$` }, distractors),
        hints,
        solution: `${checkLine(eq, v, answer)} Both sides are equal, so $${v} = ${answer}$ is the solution.`,
      };
    }

    // difficulty 3: which equation has this solution?
    const k = rng.int(2, 9);
    const a = rng.int(2, 6);
    let b = rng.int(1, 12);
    if (b === a) b += 1;
    const op: '+' | '-' = rng.chance(0.5) && a * k > b ? '-' : '+';
    const other: '+' | '-' = op === '+' ? '-' : '+';
    const correctEq = linearEq(v, a, op, b, k);
    const c = correctEq.rhs;
    const make = (coef: number, sign: '+' | '-', konst: number, rhs: number): Eq => {
      const base = linearEq(v, coef, sign, konst, 0);
      return { ...base, tex: `${base.tex.replace(/ = .*$/, '')} = ${tex(rhs)}`, rhs };
    };
    const pool = [make(a, op, b, c + a), make(b, op, a, c), make(a, other, b, c)].filter((e) => e.lhs(k) !== e.rhs);
    return {
      ...NO_CALC,
      prompt: `Which equation has the solution $${v} = ${k}$?`,
      ...mcqFields(
        rng,
        { text: `$${correctEq.tex}$` },
        pool.map((e) => ({ text: `$${e.tex}$`, feedback: checkLine(e, v, k) })),
      ),
      hints: [`Substitute $${v} = ${k}$ into each equation.`, 'The right one has both sides equal.'],
      solution: `Substitute $${v} = ${k}$ into each equation.

${checkLine(correctEq, v, k)}

So $${correctEq.tex}$ is the one with this solution. The other equations give a different value on the left.`,
    };
  },
};

export const formAndSolve: QuestionTemplate = {
  id: 'm7.alg.equations.form-and-solve',
  topicId: 'm7.alg.equations',
  title: 'Form and solve an equation from words',
  difficulties: [3, 4, 5],
  generate({ rng, difficulty }) {
    const name = rng.pick(NAMES);
    if (difficulty === 3) {
      const kind = rng.pick(['times-add', 'times-sub', 'div-add', 'double-add'] as const);
      const a = kind === 'double-add' ? 2 : rng.int(2, 9);
      const b = rng.int(1, 20);
      let n = rng.int(2, 12);
      let text: string;
      let eqTex: string;
      let steps: string;
      if (kind === 'times-add' || kind === 'double-add') {
        const c = a * n + b;
        text = kind === 'double-add' ? `I double it, then add ${b}. The answer is ${c}.` : `I multiply it by ${a}, then add ${b}. The answer is ${c}.`;
        eqTex = `${a}n + ${b} = ${c}`;
        steps = `$${a}n = ${c} - ${b} = ${a * n}$, so $n = ${a * n} \\div ${a} = ${n}$.`;
      } else if (kind === 'times-sub') {
        const bb = Math.min(b, a * n - 1);
        const c = a * n - bb;
        text = `I multiply it by ${a}, then subtract ${bb}. The answer is ${c}.`;
        eqTex = `${a}n - ${bb} = ${c}`;
        steps = `$${a}n = ${c} + ${bb} = ${a * n}$, so $n = ${a * n} \\div ${a} = ${n}$.`;
      } else {
        const k = n;
        n = a * k;
        const c = k + b;
        text = `I divide it by ${a}, then add ${b}. The answer is ${c}.`;
        eqTex = `\\frac{n}{${a}} + ${b} = ${c}`;
        steps = `$\\frac{n}{${a}} = ${c} - ${b} = ${k}$, so $n = ${k} \\times ${a} = ${n}$.`;
      }
      return {
        type: 'numeric',
        ...NO_CALC,
        prompt: `${name} says: "I am thinking of a number. ${text}" What is ${name}'s number?`,
        answer: n,
        form: 'integer',
        hints: ['Call the number $n$ and write an equation.', 'Solve it by undoing the steps in reverse order.'],
        solution: `Let the number be $n$. The equation is $${eqTex}$.\n\n${steps}\n\n${name}'s number is ${n}.`,
      };
    }

    if (difficulty === 4) {
      const kind = rng.pick(['seeds', 'taxi', 'savings', 'plumber', 'bus'] as const);
      let prompt: string;
      let eqTex: string;
      let a: number;
      let b: number;
      let n: number;
      let unit = '';
      if (kind === 'seeds') {
        a = rng.int(2, 5);
        b = rng.int(4, 15);
        n = rng.int(2, 9);
        prompt = `${name} buys some packets of seeds for the school garden. Each packet costs ${cash(a)}. ${name} also buys a trowel for ${cash(b)}. Altogether ${name} spends ${cash(a * n + b)}. How many packets of seeds did ${name} buy?`;
        eqTex = `${a}n + ${b} = ${a * n + b}`;
      } else if (kind === 'taxi') {
        a = rng.int(2, 4);
        b = rng.int(3, 8);
        n = rng.int(3, 15);
        prompt = `A taxi in ${rng.pick(['Wellington', 'Hamilton', 'Dunedin', 'Napier', 'Nelson'])} charges a ${cash(b)} starting fee plus ${cash(a)} for each kilometre. A trip costs ${cash(a * n + b)}. How many kilometres long was the trip?`;
        eqTex = `${a}n + ${b} = ${a * n + b}`;
        unit = 'km';
      } else if (kind === 'savings') {
        a = rng.pick([5, 10, 15, 20]);
        b = rng.int(5, 40);
        n = rng.int(3, 12);
        prompt = `${name} already has ${cash(b)} saved and saves ${cash(a)} every week. After how many weeks will ${name} have ${cash(a * n + b)} saved?`;
        eqTex = `${a}n + ${b} = ${a * n + b}`;
      } else if (kind === 'plumber') {
        a = rng.pick([40, 50, 60, 80]);
        b = rng.pick([30, 40, 50, 60]);
        n = rng.int(2, 6);
        prompt = `A plumber charges a ${cash(b)} call-out fee plus ${cash(a)} for each hour of work. A job costs ${cash(a * n + b)}. How many hours did the plumber work?`;
        eqTex = `${a}n + ${b} = ${a * n + b}`;
        unit = 'hours';
      } else {
        a = rng.int(3, 9);
        b = rng.int(2, 9);
        n = rng.int(4, 12);
        prompt = `Each row of seats on a bus to the marae holds ${a} people. The bus is full and there are also ${b} people standing. Altogether there are ${a * n + b} people on the bus. How many rows of seats are there?`;
        eqTex = `${a}n + ${b} = ${a * n + b}`;
      }
      return {
        type: 'numeric',
        ...NO_CALC,
        marks: 2,
        prompt,
        answer: n,
        form: 'integer',
        ...(unit ? { units: unit } : {}),
        hints: ['Let $n$ be the number you are trying to find, and write an equation.', `Which amount is paid (or counted) once, and which one is paid (or counted) $n$ times?`],
        solution: `Let $n$ be the unknown number. The equation is $${eqTex}$.\n\nSubtract ${b} from both sides: $${a}n = ${a * n}$.\n\nDivide both sides by ${a}: $n = ${n}$.\n\nCheck: $${a} \\times ${n} + ${b} = ${a * n + b}$ ✓`,
      };
    }

    // difficulty 5
    const kind = rng.pick(['consecutive', 'rectangle', 'isosceles'] as const);
    if (kind === 'consecutive') {
      const n = rng.int(5, 40);
      const s = 3 * n + 3;
      return {
        type: 'numeric',
        ...NO_CALC,
        marks: 2,
        prompt: `Three consecutive whole numbers (like 7, 8 and 9) add up to ${s}. What is the smallest of the three numbers?`,
        answer: n,
        form: 'integer',
        hints: ['If the smallest number is $n$, what are the next two?', 'Add the three expressions, collect like terms, then solve.'],
        solution: `Call the numbers $n$, $n + 1$ and $n + 2$.\n\n$n + n + 1 + n + 2 = ${s}$, so $3n + 3 = ${s}$.\n\nSubtract 3: $3n = ${s - 3}$. Divide by 3: $n = ${n}$.\n\nThe numbers are ${n}, ${n + 1} and ${n + 2}. Check: $${n} + ${n + 1} + ${n + 2} = ${s}$ ✓`,
      };
    }
    if (kind === 'rectangle') {
      const a = rng.int(2, 9);
      const w = rng.int(3, 15);
      const P = 4 * w + 2 * a;
      return {
        type: 'numeric',
        ...NO_CALC,
        marks: 2,
        prompt: `The length of this rectangle is ${a} cm more than its width, $w$. The perimeter is ${P} cm. Find the width, $w$.`,
        figure: { svg: rectangleSvg(`w + ${a}`, 'w'), alt: `A rectangle with its long side labelled w + ${a} and its short side labelled w.` },
        answer: w,
        form: 'integer',
        units: 'cm',
        variable: 'w',
        hints: ['Add up all four sides as an expression, and collect like terms.', `Set your expression equal to ${P}, then solve.`],
        solution: `Perimeter $= (w + ${a}) + w + (w + ${a}) + w = 4w + ${2 * a}$.\n\nSo $4w + ${2 * a} = ${P}$.\n\nSubtract ${2 * a}: $4w = ${4 * w}$. Divide by 4: $w = ${w}$.\n\nCheck: the sides are ${w + a}, ${w}, ${w + a} and ${w}, and $${w + a} + ${w} + ${w + a} + ${w} = ${P}$ ✓`,
      };
    }
    const base = rng.int(4, 20);
    const x = rng.int(Math.ceil(base / 2) + 1, Math.ceil(base / 2) + 15);
    const P = 2 * x + base;
    return {
      type: 'numeric',
      ...NO_CALC,
      marks: 2,
      prompt: `This triangle has two equal sides of length $x$ cm and a base of ${base} cm. Its perimeter is ${P} cm. Find $x$.`,
      figure: { svg: triangleSvg('x', 'x', `${base}`), alt: `A triangle with two sides labelled x and a base labelled ${base}.` },
      answer: x,
      form: 'integer',
      units: 'cm',
      variable: 'x',
      hints: ['Write the perimeter as an expression, then make it equal to the perimeter you are given.', 'Undo the + first, then the ×.'],
      solution: `Perimeter $= x + x + ${base} = 2x + ${base}$.\n\nSo $2x + ${base} = ${P}$.\n\nSubtract ${base}: $2x = ${2 * x}$. Divide by 2: $x = ${x}$.\n\nCheck: $${x} + ${x} + ${base} = ${P}$ ✓`,
    };
  },
};

/** An expression with the given whole-number value: a + b, a − b, a × b or a ÷ b. */
function exprFor(rng: Parameters<QuestionTemplate['generate']>[0]['rng'], T: number): { tex: string; working: string } {
  const forms: Array<() => { tex: string; working: string }> = [];
  if (T >= 3)
    forms.push(() => {
      const p = rng.int(1, T - 1);
      return { tex: `${p} + ${T - p}`, working: `${p} + ${T - p} = ${T}` };
    });
  forms.push(() => {
    const q = rng.int(2, 20);
    return { tex: `${T + q} - ${q}`, working: `${T + q} - ${q} = ${T}` };
  });
  const divs: number[] = [];
  for (let d = 2; d * d <= T; d++) if (T % d === 0) divs.push(d);
  if (divs.length)
    forms.push(() => {
      const d = rng.pick(divs);
      return { tex: `${d} \\times ${T / d}`, working: `${d} \\times ${T / d} = ${T}` };
    });
  if (T <= 25)
    forms.push(() => {
      const q = rng.int(2, 8);
      return { tex: `${T * q} \\div ${q}`, working: `${T * q} \\div ${q} = ${T}` };
    });
  return rng.pick(forms)();
}

export const numberSentences: QuestionTemplate = {
  id: 'm7.alg.equations.number-sentences',
  topicId: 'm7.alg.equations',
  title: 'Complete and check number sentences (including inequalities)',
  difficulties: [2, 3, 4, 5],
  generate({ rng, difficulty }) {
    if (difficulty === 2) {
      const kind = rng.pick(['times-eq-plus', 'plus-eq-minus', 'box-times', 'times-eq-times', 'div-eq-minus'] as const);
      let sentence: string;
      let answer: number;
      let working: string;
      if (kind === 'times-eq-plus') {
        const [a, b] = [rng.int(3, 12), rng.int(3, 12)];
        const c = rng.int(1, a * b - 1);
        sentence = `${a} \\times ${b} = \\square + ${c}`;
        answer = a * b - c;
        working = `The left side is $${a} \\times ${b} = ${a * b}$. So $\\square + ${c} = ${a * b}$, which means $\\square = ${a * b} - ${c} = ${answer}$.`;
      } else if (kind === 'plus-eq-minus') {
        const [a, b] = [rng.int(5, 40), rng.int(5, 40)];
        const c = a + b + rng.int(1, 40);
        sentence = `${a} + ${b} = ${c} - \\square`;
        answer = c - a - b;
        working = `The left side is $${a} + ${b} = ${a + b}$. So $${c} - \\square = ${a + b}$, which means $\\square = ${c} - ${a + b} = ${answer}$.`;
      } else if (kind === 'box-times') {
        const a = rng.int(3, 9);
        const k = rng.int(3, 12);
        const b = rng.int(2, a * k - 2);
        sentence = `\\square \\times ${a} = ${b} + ${a * k - b}`;
        answer = k;
        working = `The right side is $${b} + ${a * k - b} = ${a * k}$. So $\\square \\times ${a} = ${a * k}$, which means $\\square = ${a * k} \\div ${a} = ${k}$.`;
      } else if (kind === 'times-eq-times') {
        let found: [number, number, number] | null = null;
        for (let i = 0; i < 40 && !found; i++) {
          const a = rng.int(2, 9);
          const k = rng.int(2, 12);
          const P = a * k;
          const ds: number[] = [];
          for (let d = 2; d < P; d++) if (P % d === 0 && d !== a && d !== k && d <= 12 && P / d <= 12) ds.push(d);
          if (ds.length) {
            const b = rng.pick(ds);
            found = [a, b, P / b];
          }
        }
        const [a, b, c] = found ?? [4, 3, 8];
        sentence = `${a} \\times \\square = ${b} \\times ${c}`;
        answer = (b * c) / a;
        working = `The right side is $${b} \\times ${c} = ${b * c}$. So $${a} \\times \\square = ${b * c}$, which means $\\square = ${b * c} \\div ${a} = ${answer}$.`;
      } else {
        const a = rng.int(2, 9);
        const b = rng.int(2, 12);
        const c = rng.int(1, 20);
        sentence = `${a * b} \\div ${a} = \\square - ${c}`;
        answer = b + c;
        working = `The left side is $${a * b} \\div ${a} = ${b}$. So $\\square - ${c} = ${b}$, which means $\\square = ${b} + ${c} = ${answer}$.`;
      }
      return {
        type: 'numeric',
        ...NO_CALC,
        prompt: `What number goes in the box to make this number sentence true?\n\n$$${sentence}$$`,
        answer,
        form: 'integer',
        hints: ['Work out the side without the box first.', 'Both sides must have the same value. What number makes that happen?'],
        solution: working,
      };
    }

    if (difficulty === 3) {
      const a = rng.int(3, 12);
      const b = rng.int(3, 12);
      const L = a * b;
      const delta = rng.pick([0, 0, -1, 1, -2, 2, -3, 3]);
      const R = Math.max(2, L + delta);
      const right = exprFor(rng, R);
      const leftFirst = rng.chance(0.5);
      const [lt, rt] = leftFirst ? [`${a} \\times ${b}`, right.tex] : [right.tex, `${a} \\times ${b}`];
      const [lv, rv] = leftFirst ? [L, R] : [R, L];
      const shownSym = lv < rv ? '<' : lv > rv ? '>' : '=';
      return {
        type: 'cloze',
        ...NO_CALC,
        prompt: `Choose $<$, $>$ or $=$ to make this number sentence true.\n\n$${lt}$ [[a]] $${rt}$`,
        blanks: [{ id: 'a', accepted: [shownSym], options: ['<', '>', '='] }],
        hints: ['Work out the value of each side first.', '$<$ means "is less than" and $>$ means "is greater than".'],
        solution: `Left side: $${leftFirst ? `${a} \\times ${b} = ${L}` : right.working}$\n\nRight side: $${leftFirst ? right.working : `${a} \\times ${b} = ${L}`}$\n\n${lv === rv ? `Both sides are ${lv}, so the answer is $=$.` : `${lv} is ${lv < rv ? 'less' : 'greater'} than ${rv}, so the answer is $${shownSym}$.`}`,
      };
    }

    if (difficulty === 4) {
      // true/false with decimals and ≤, ≥, <, >
      const d = rng.int(2, 9) / 10;
      const w = rng.int(3, 20);
      const L = clean(d * w);
      let e = 2;
      let f = 0.5;
      let g = 0;
      for (let i = 0; i < 50; i++) {
        e = rng.int(2, 10);
        f = rng.pick([0.5, 0.2, 0.4, 0.3, 0.6]);
        const delta = rng.pick([-1.5, -1, -0.4, 0, 0, 0.4, 1, 1.5]);
        g = clean(L - e * f + delta);
        if (g >= 1) break;
      }
      if (g < 1) g = 1;
      const R = clean(e * f + g);
      const sym = rng.pick(['≤', '≥', '<', '>'] as const);
      const symTex = { '≤': '\\le', '≥': '\\ge', '<': '<', '>': '>' }[sym];
      const truth = sym === '≤' ? L <= R : sym === '≥' ? L >= R : sym === '<' ? L < R : L > R;
      const words = { '≤': 'less than or equal to', '≥': 'greater than or equal to', '<': 'less than', '>': 'greater than' }[sym];
      return {
        type: 'cloze',
        ...NO_CALC,
        prompt: `Is this number sentence true or false?\n\n$$${tex(d)} \\times ${w} ${symTex} ${e} \\times ${tex(f)} + ${tex(g)}$$\n\nIt is [[a]].`,
        blanks: [{ id: 'a', accepted: [truth ? 'true' : 'false'], options: ['true', 'false'] }],
        hints: ['Work out each side separately. Multiply before you add.', `$${symTex}$ means "is ${words}".`],
        solution: `Left side: $${tex(d)} \\times ${w} = ${tex(L)}$ (because $${Math.round(d * 10)} \\times ${w} = ${Math.round(d * 10) * w}$, and then divide by 10).\n\nRight side: $${e} \\times ${tex(f)} + ${tex(g)} = ${tex(clean(e * f))} + ${tex(g)} = ${tex(R)}$\n\nIs ${tex(L)} ${words} ${tex(R)}? ${truth ? 'Yes' : 'No'}, so the number sentence is **${truth ? 'true' : 'false'}**.`,
      };
    }

    // difficulty 5: largest or smallest whole number that makes an inequality true
    const kind = rng.pick(['largest-plus', 'smallest-minus', 'largest-le'] as const);
    const a = rng.int(3, 9);
    const n = rng.int(3, 12);
    let sentence: string;
    let ask: string;
    let working: string;
    if (kind === 'largest-plus') {
      const b = rng.int(1, 15);
      const r = rng.int(1, a);
      const c = a * n + b + r;
      sentence = `${a} \\times \\square + ${b} < ${c}`;
      ask = 'largest';
      working = `Try ${n}: $${a} \\times ${n} + ${b} = ${a * n + b}$, which is less than ${c} ✓\n\nTry ${n + 1}: $${a} \\times ${n + 1} + ${b} = ${a * (n + 1) + b}$, which is not less than ${c} ✗\n\nSo the largest whole number is ${n}.`;
    } else if (kind === 'smallest-minus') {
      const b = rng.int(1, 10);
      const r = rng.int(1, a);
      let c = a * n - b - r;
      if (c < 1) c = 1;
      sentence = `${a} \\times \\square - ${b} > ${c}`;
      ask = 'smallest';
      const nn = Math.floor((c + b) / a) + 1;
      working = `Try ${nn}: $${a} \\times ${nn} - ${b} = ${a * nn - b}$, which is greater than ${c} ✓\n\nTry ${nn - 1}: $${a} \\times ${nn - 1} - ${b} = ${a * (nn - 1) - b}$, which is not greater than ${c} ✗\n\nSo the smallest whole number is ${nn}.`;
      return {
        type: 'numeric',
        ...NO_CALC,
        marks: 2,
        prompt: `What is the ${ask} whole number that makes this number sentence true?\n\n$$${sentence}$$`,
        answer: nn,
        form: 'integer',
        hints: ['Try a number in the box and see if the sentence is true. Then try the numbers next to it.', 'Find where the two sides would be closest, then check the whole numbers on each side of that.'],
        solution: working,
      };
    } else {
      const r = rng.int(0, a - 1);
      const c = a * n + r;
      sentence = `${a} \\times \\square \\le ${c}`;
      ask = 'largest';
      working = `Try ${n}: $${a} \\times ${n} = ${a * n}$, which is less than or equal to ${c} ✓\n\nTry ${n + 1}: $${a} \\times ${n + 1} = ${a * (n + 1)}$, which is greater than ${c} ✗\n\nSo the largest whole number is ${n}.`;
    }
    return {
      type: 'numeric',
      ...NO_CALC,
      marks: 2,
      prompt: `What is the ${ask} whole number that makes this number sentence true?\n\n$$${sentence}$$`,
      answer: n,
      form: 'integer',
      hints: ['Try a number in the box and see if the sentence is true. Then try the numbers next to it.', 'Find where the two sides would be closest, then check the whole numbers on each side of that.'],
      solution: working,
    };
  },
};

export const templates: QuestionTemplate[] = [oneStep, twoStep, checkSolution, formAndSolve, numberSentences];
