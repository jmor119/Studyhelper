import type { QuestionTemplate, TemplateOutput } from '../../types';
import { NAMES, frac, mixed, num, poly, tex, texSigned } from '../../format';
import type { Rng } from '../../../rng';
import { SYMS, cash, flip, mcqFields, numberLineSvg, symTex, symWords, t, type Sym } from './helpers';

// m9.alg.inequalities — Year 9 solves inequalities with positive coefficients, and learns what
// multiplying or dividing both sides by −1 does. No other negative coefficients.
//
// Answers like "x < 4" use a cloze: a dropdown for the sign and a typed number. (Plain text
// answers can't be used: the text marker strips "<" and ">", so "x < 4" would equal "x > 4".)

const VARS = ['x', 'x', 'x', 'n', 'a', 'y', 'm'] as const;

function cloze(
  prompt: string,
  v: string,
  sym: Sym,
  boundary: number,
  rest: { hints: string[]; solution: string; marks?: number },
): TemplateOutput {
  return {
    type: 'cloze',
    prompt: `${prompt}\n\nComplete the answer: $${v}$ [[s]] [[n]]`,
    blanks: [
      { id: 's', accepted: [sym], options: [...SYMS] },
      { id: 'n', accepted: [String(boundary)] },
    ],
    calculator: 'not-allowed',
    ...rest,
  } as TemplateOutput;
}

/** "Check with x = 3: 2 × 3 + 1 = 7, and 7 < 11 ✓" using a value inside the solution set. */
function testLine(
  v: string,
  sym: Sym,
  boundary: number,
  show: (x: number) => string,
  value: (x: number) => number,
  rhs: number,
): string {
  const inside = sym === '<' || sym === '≤' ? boundary - 1 : boundary + 1;
  const L = value(inside);
  return `Check with a value in the solution set, $${v} = ${inside}$: $${show(inside)} = ${tex(L)}$, and $${tex(L)} ${symTex[sym]} ${tex(rhs)}$ ✓`;
}

export const readNumberLine: QuestionTemplate = {
  id: 'm9.alg.inequalities.number-line',
  topicId: 'm9.alg.inequalities',
  title: 'Read inequalities on a number line',
  difficulties: [1, 2],
  generate({ rng, difficulty }) {
    const b = rng.int(-6, 8);
    const sym = rng.pick(SYMS);
    const lo = b - rng.int(3, 7);
    const hi = lo + 10;
    const svg = numberLineSvg(b, sym, lo, hi);
    const closed = sym === '≤' || sym === '≥';
    const right = sym === '>' || sym === '≥';
    const alt = `Number line from ${num(lo)} to ${num(hi)} with ${closed ? 'a filled' : 'an open'} circle at ${num(b)} and an arrow pointing ${right ? 'right' : 'left'}.`;
    const reading = `The circle at ${num(b)} is **${closed ? 'filled in' : 'open'}**, so ${num(b)} is ${closed ? '' : '**not** '}included. The arrow points to the ${right ? 'right (bigger numbers)' : 'left (smaller numbers)'}.`;

    if (difficulty === 1) {
      const fb = (s: Sym) => {
        const sClosed = s === '≤' || s === '≥';
        const sRight = s === '>' || s === '≥';
        if (sRight !== right) return `The arrow points ${right ? 'right' : 'left'}, towards ${right ? 'bigger' : 'smaller'} numbers.`;
        return sClosed ? 'A filled circle would mean the boundary is included. This circle is open.' : 'An open circle would mean the boundary is not included. This circle is filled in.';
      };
      const mcq = mcqFields(
        rng,
        { text: `$x ${symTex[sym]} ${b}$` },
        SYMS.filter((s) => s !== sym).map((s) => ({ text: `$x ${symTex[s]} ${b}$`, feedback: fb(s) })),
      );
      return {
        type: 'mcq',
        prompt: 'Which inequality is shown on the number line?',
        figure: { svg, alt },
        ...mcq,
        calculator: 'not-allowed',
        hints: [
          'An open circle means the number is not included; a filled circle means it is included.',
          'An arrow to the right means "greater than"; to the left means "less than".',
        ],
        solution: `${reading}\n\nSo the number line shows $x ${symTex[sym]} ${b}$: $x$ is ${symWords[sym]} ${num(b)}.`,
      };
    }

    // difficulty 2: which value is in the solution set?
    const dir = right ? 1 : -1;
    const steps = [0.5, 1, 1.5, 2, 3];
    let correct: number;
    if (closed && rng.chance(0.35)) correct = b;
    else correct = b + dir * rng.pick(steps);
    const outside = rng.sample(steps, 3).map((s) => b - dir * s);
    const distractors = [
      ...(closed ? [] : [{ value: b, feedback: `The circle at ${num(b)} is open, so ${num(b)} itself is **not** in the solution set.` }]),
      ...outside.map((value) => ({ value, feedback: `$${tex(value)}$ is on the wrong side of ${num(b)}.` })),
    ];
    const mcq = mcqFields(
      rng,
      { text: `$${tex(correct)}$` },
      distractors.map((d) => ({ text: `$${tex(d.value)}$`, feedback: d.feedback })),
    );
    return {
      type: 'mcq',
      prompt: 'The number line shows the solution set of an inequality. Which of these values of $x$ is in the solution set?',
      figure: { svg, alt },
      ...mcq,
      calculator: 'not-allowed',
      hints: [
        'First write the inequality the number line shows.',
        `Is ${num(b)} itself included? Look at the circle.`,
      ],
      solution: [
        reading,
        `So the solution set is $x ${symTex[sym]} ${b}$.`,
        correct === b
          ? `$${tex(b)}$ is included because the circle is filled in ($${tex(b)} ${symTex[sym]} ${b}$ is true).`
          : `$${tex(correct)} ${symTex[sym]} ${b}$ is true, so ${num(correct)} is in the solution set.`,
      ].join('\n\n'),
    };
  },
};

export const solveInequality: QuestionTemplate = {
  id: 'm9.alg.inequalities.solve',
  topicId: 'm9.alg.inequalities',
  title: 'Solve linear inequalities (positive coefficients)',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    const v = rng.pick(VARS);
    const sym = rng.pick(SYMS);
    const x0 = rng.int(-6, 12);
    const hint1 = 'Solve it like an equation, using inverse operations on both sides.';
    const hint2 = 'Adding, subtracting, or multiplying and dividing by a **positive** number does not change the inequality sign.';

    if (difficulty === 2) {
      const kind = rng.pick(['add', 'sub', 'mult', 'div'] as const);
      if (kind === 'add' || kind === 'sub') {
        const b = rng.int(1, 15);
        const c = kind === 'add' ? x0 + b : x0 - b;
        const lhs = kind === 'add' ? `${v} + ${b}` : `${v} - ${b}`;
        return cloze(`Solve $${lhs} ${symTex[sym]} ${c}$.`, v, sym, x0, {
          hints: [hint1, hint2],
          solution: [
            `${kind === 'add' ? `Subtract ${b} from` : `Add ${b} to`} both sides: $${v} ${symTex[sym]} ${tex(c)} ${kind === 'add' ? '-' : '+'} ${b}$`,
            `So $${v} ${symTex[sym]} ${x0}$.`,
          ].join('\n\n'),
        });
      }
      const a = rng.int(2, 9);
      if (kind === 'mult') {
        const c = a * x0;
        return cloze(`Solve $${a}${v} ${symTex[sym]} ${c}$.`, v, sym, x0, {
          hints: [hint1, hint2],
          solution: `Divide both sides by ${a} (a positive number, so the sign stays the same):\n\n$${v} ${symTex[sym]} ${tex(c)} \\div ${a} = ${x0}$\n\nSo $${v} ${symTex[sym]} ${x0}$.`,
        });
      }
      const q = rng.int(-5, 8);
      const boundary = a * q;
      return cloze(`Solve $\\dfrac{${v}}{${a}} ${symTex[sym]} ${q}$.`, v, sym, boundary, {
        hints: [hint1, hint2],
        solution: `Multiply both sides by ${a} (a positive number, so the sign stays the same):\n\n$${v} ${symTex[sym]} ${tex(q)} \\times ${a} = ${boundary}$\n\nSo $${v} ${symTex[sym]} ${boundary}$.`,
      });
    }

    if (difficulty === 3) {
      if (rng.chance(0.7)) {
        const a = rng.int(2, 9);
        const b = rng.nonZeroInt(-15, 15);
        const c = a * x0 + b;
        const lhs = poly([t(a, v), t(b)]);
        return cloze(`Solve $${lhs} ${symTex[sym]} ${c}$.`, v, sym, x0, {
          hints: [hint1, `First ${b > 0 ? `subtract ${b} from` : `add ${-b} to`} both sides, then divide by ${a}.`],
          solution: [
            `${b > 0 ? `Subtract ${b} from` : `Add ${-b} to`} both sides: $${a}${v} ${symTex[sym]} ${tex(c - b)}$`,
            `Divide both sides by ${a}: $${v} ${symTex[sym]} ${x0}$`,
            testLine(v, sym, x0, (x) => `${a} \\times ${texSigned(x)} ${b > 0 ? '+' : '-'} ${Math.abs(b)}`, (x) => a * x + b, c),
          ].join('\n\n'),
        });
      }
      const a = rng.int(2, 6);
      const q = rng.int(-4, 8);
      const b = rng.int(1, 12);
      const c = q + b;
      const boundary = a * q;
      return cloze(`Solve $\\dfrac{${v}}{${a}} + ${b} ${symTex[sym]} ${c}$.`, v, sym, boundary, {
        hints: [hint1, `First subtract ${b} from both sides, then multiply by ${a}.`],
        solution: [
          `Subtract ${b} from both sides: $\\dfrac{${v}}{${a}} ${symTex[sym]} ${tex(q)}$`,
          `Multiply both sides by ${a}: $${v} ${symTex[sym]} ${boundary}$`,
        ].join('\n\n'),
      });
    }

    // difficulty 4
    if (rng.chance(0.6)) {
      // ax + b ? cx + d with a > c > 0
      const c = rng.int(1, 6);
      const a = c + rng.int(1, 5);
      const b = rng.nonZeroInt(-12, 12);
      const d = (a - c) * x0 + b;
      const lhs = poly([t(a, v), t(b)]);
      const rhs = poly([t(c, v), t(d)]);
      return cloze(`Solve $${lhs} ${symTex[sym]} ${rhs}$.`, v, sym, x0, {
        marks: 2,
        hints: [`Subtract $${poly([t(c, v)])}$ from both sides so the $${v}$ terms are on one side.`, 'Then solve the two-step inequality that is left.'],
        solution: [
          `Subtract $${poly([t(c, v)])}$ from both sides: $${poly([t(a - c, v), t(b)])} ${symTex[sym]} ${tex(d)}$`,
          `${b > 0 ? `Subtract ${b}` : `Add ${-b}`}: $${poly([t(a - c, v)])} ${symTex[sym]} ${tex(d - b)}$`,
          a - c === 1 ? '' : `Divide by ${a - c}: $${v} ${symTex[sym]} ${x0}$`,
        ]
          .filter(Boolean)
          .join('\n\n'),
      });
    }
    // a(x + b) ? c
    const a = rng.int(2, 6);
    const b = rng.nonZeroInt(-9, 9);
    const c = a * (x0 + b);
    return cloze(`Solve $${a}(${poly([t(1, v), t(b)])}) ${symTex[sym]} ${c}$.`, v, sym, x0, {
      marks: 2,
      hints: [`Divide both sides by ${a} first, or expand the bracket.`, 'Then undo the number added to or subtracted from the unknown.'],
      solution: [
        `Divide both sides by ${a}: $${poly([t(1, v), t(b)])} ${symTex[sym]} ${tex(x0 + b)}$`,
        `${b > 0 ? `Subtract ${b}` : `Add ${-b}`}: $${v} ${symTex[sym]} ${x0}$`,
      ].join('\n\n'),
    });
  },
};

export const negativeInequalities: QuestionTemplate = {
  id: 'm9.alg.inequalities.multiply-by-negative',
  topicId: 'm9.alg.inequalities',
  title: 'Multiplying or dividing an inequality by −1',
  difficulties: [4, 5],
  generate({ rng, difficulty }) {
    const v = rng.pick(VARS);
    if (difficulty === 4 && rng.chance(0.5)) {
      // Flip a true numerical statement.
      let [p, q] = [0, 0];
      while (p === q) [p, q] = [rng.nonZeroInt(-9, 12), rng.nonZeroInt(-9, 12)];
      const rel: Sym = p < q ? '<' : '>';
      const op = rng.pick(['Multiply', 'Divide'] as const);
      const newRel = flip[rel];
      return {
        type: 'cloze',
        prompt: `The statement $${p} ${rel} ${q}$ is true.\n\n${op} both sides by $-1$. Choose the symbol that makes the new statement true: $${tex(-p)}$ [[s]] $${tex(-q)}$`,
        blanks: [{ id: 's', accepted: [newRel], options: ['<', '>', '='] }],
        calculator: 'not-allowed',
        hints: [`Work out $-1 \\times ${texSigned(p)}$ and $-1 \\times ${texSigned(q)}$, then compare them on a number line.`],
        solution: [
          `${op === 'Multiply' ? 'Multiplying' : 'Dividing'} by $-1$ gives $${tex(-p)}$ and $${tex(-q)}$.`,
          `On a number line, $${tex(-p)}$ is to the ${-p < -q ? 'left' : 'right'} of $${tex(-q)}$, so $${tex(-p)} ${newRel} ${tex(-q)}$.`,
          `The sign has **reversed** from $${rel}$ to $${newRel}$. This always happens when you multiply or divide both sides by a negative number.`,
        ].join('\n\n'),
      };
    }
    const sym = rng.pick(SYMS);
    const newSym = flip[sym];
    if (difficulty === 4) {
      // −x ? c
      const c = rng.nonZeroInt(-9, 9);
      const testX = -c + (newSym === '<' || newSym === '≤' ? -1 : 1);
      return cloze(`Solve $-${v} ${symTex[sym]} ${c}$.`, v, newSym, -c, {
        marks: 2,
        hints: [`Multiply (or divide) both sides by $-1$ to get $${v}$ on its own.`, 'What happens to the inequality sign when you multiply by a negative number?'],
        solution: [
          `Multiply both sides by $-1$. This **reverses** the inequality sign, so $${symTex[sym]}$ becomes $${symTex[newSym]}$:`,
          `$${v} ${symTex[newSym]} ${tex(-c)}$`,
          `Check with $${v} = ${testX}$: then $-${v} = ${tex(-testX)}$, and $${tex(-testX)} ${symTex[sym]} ${c}$ ✓`,
        ].join('\n\n'),
      });
    }
    // difficulty 5: k − x ? c  →  x (flipped) k − c
    const k = rng.int(2, 20);
    const boundary = rng.int(-6, 15);
    const c = k - boundary;
    const order = rng.chance(0.7);
    const lhs = order ? `${k} - ${v}` : `-${v} + ${k}`;
    const testX = boundary + (newSym === '<' || newSym === '≤' ? -1 : 1);
    return cloze(`Solve $${lhs} ${symTex[sym]} ${c}$.`, v, newSym, boundary, {
      marks: 2,
      hints: [`Subtract ${k} from both sides first.`, `You'll get $-${v}$ on its own. Multiplying or dividing by $-1$ reverses the sign.`],
      solution: [
        `Subtract ${k} from both sides: $-${v} ${symTex[sym]} ${tex(c - k)}$`,
        `Multiply both sides by $-1$ and **reverse** the sign: $${v} ${symTex[newSym]} ${tex(boundary)}$`,
        `Another way: add $${v}$ to both sides to keep it positive: $${k} ${symTex[sym]} ${tex(c)} + ${v}$, so $${tex(boundary)} ${symTex[sym]} ${v}$, which is the same as $${v} ${symTex[newSym]} ${tex(boundary)}$.`,
        `Check with $${v} = ${testX}$: $${k} - ${texSigned(testX)} = ${tex(k - testX)}$, and $${tex(k - testX)} ${symTex[sym]} ${tex(c)}$ ✓`,
      ].join('\n\n'),
    });
  },
};

// ---------------------------------------------------------------------------------------------

interface IntegerCase {
  prompt: string;
  answer: number;
  hints: string[];
  solution: string[];
  marks?: number;
}

/** Largest/smallest integer satisfying a·x + b <sym> c, with a > 0. */
function integerAnswer(a: number, b: number, c: number, sym: Sym): { boundaryTex: string; answer: number; exact: boolean } {
  const num = c - b;
  const exact = num % a === 0;
  const B = num / a;
  let answer: number;
  if (sym === '<') answer = exact ? B - 1 : Math.floor(B);
  else if (sym === '≤') answer = Math.floor(B);
  else if (sym === '>') answer = exact ? B + 1 : Math.ceil(B);
  else answer = Math.ceil(B);
  const boundaryTex = exact ? tex(B) : `${frac(num, a)} = ${mixed(num, a)}`;
  return { boundaryTex, answer, exact };
}

function abstractInteger(rng: Rng, needFraction: boolean): IntegerCase {
  const v = rng.pick(VARS);
  const sym = rng.pick(SYMS);
  const a = rng.int(2, 7);
  const b = rng.nonZeroInt(-10, 12);
  let c = a * rng.int(-3, 9) + b;
  if (needFraction) c += rng.int(1, a - 1);
  const { boundaryTex, answer, exact } = integerAnswer(a, b, c, sym);
  const largest = sym === '<' || sym === '≤';
  const word = largest ? 'largest' : 'smallest';
  const lhs = poly([t(a, v), t(b)]);
  const why = exact
    ? sym === '<' || sym === '>'
      ? `The sign is strict (${symWords[sym]}), so ${num((c - b) / a)} itself is not allowed. The ${word} integer is ${num(answer)}.`
      : `${num((c - b) / a)} itself is allowed (${symWords[sym]}), so the ${word} integer is ${num(answer)}.`
    : `The ${word} integer ${largest ? 'below' : 'above'} $${mixed(c - b, a)}$ is ${num(answer)}.`;
  return {
    prompt: `What is the **${word}** integer $${v}$ that satisfies $${lhs} ${symTex[sym]} ${c}$?`,
    answer,
    hints: ['Solve the inequality first.', `Then think about which integers are ${symWords[sym]} the boundary value.`],
    solution: [
      `${b > 0 ? `Subtract ${b}` : `Add ${-b}`}: $${a}${v} ${symTex[sym]} ${tex(c - b)}$`,
      `Divide by ${a}: $${v} ${symTex[sym]} ${boundaryTex}$`,
      why,
      `Check: $${a} \\times ${texSigned(answer)} ${b > 0 ? '+' : '-'} ${Math.abs(b)} = ${tex(a * answer + b)}$, and $${tex(a * answer + b)} ${symTex[sym]} ${c}$ ✓`,
    ],
  };
}

function contextInteger(rng: Rng): IntegerCase {
  const name = rng.pick(NAMES);
  const kind = rng.pick(['taxi', 'lift', 'phone'] as const);
  if (kind === 'taxi') {
    const flag = rng.pick([3, 4, 5]);
    const rate = rng.pick([2, 3, 4]);
    const budget = flag + rate * rng.int(4, 12) + rng.int(0, rate - 1);
    const k = Math.floor((budget - flag) / rate);
    return {
      prompt: `A taxi charges a ${cash(flag)} flag fall plus ${cash(rate)} per kilometre. ${name} has ${cash(budget)}. What is the greatest whole number of kilometres ${name} can travel?`,
      answer: k,
      marks: 2,
      hints: [`Let $k$ be the number of kilometres. The cost is $${flag} + ${rate}k$, and it must be $\\le ${budget}$.`, 'Solve the inequality, then choose the largest whole number that fits.'],
      solution: [
        `$${flag} + ${rate}k \\le ${budget}$`,
        `Subtract ${flag}: $${rate}k \\le ${budget - flag}$`,
        `Divide by ${rate}: $k \\le ${(budget - flag) % rate === 0 ? (budget - flag) / rate : `${frac(budget - flag, rate)} = ${mixed(budget - flag, rate)}`}$`,
        `The greatest whole number is ${k}, so ${name} can travel ${k} km.`,
      ],
    };
  }
  if (kind === 'lift') {
    const limit = rng.pick([500, 600, 750, 800, 1000]);
    const person = rng.pick([70, 75, 80, 85]);
    const box = rng.pick([20, 25, 30, 40, 45]);
    const n = Math.floor((limit - person) / box);
    return {
      prompt: `A goods lift can carry at most ${limit} kg. A worker who weighs ${person} kg rides in the lift with some boxes that are ${box} kg each. What is the greatest number of boxes the lift can carry with the worker?`,
      answer: n,
      marks: 2,
      hints: [`Let $b$ be the number of boxes. Then $${person} + ${box}b \\le ${limit}$.`, 'Solve the inequality, then round to a whole number of boxes that keeps the load under the limit.'],
      solution: [
        `$${person} + ${box}b \\le ${limit}$`,
        `Subtract ${person}: $${box}b \\le ${limit - person}$`,
        `Divide by ${box}: $b \\le ${(limit - person) % box === 0 ? (limit - person) / box : `${frac(limit - person, box)} = ${mixed(limit - person, box)}`}$`,
        `The lift can carry at most ${n} boxes. (Check: $${person} + ${box} \\times ${n} = ${person + box * n} \\le ${limit}$ ✓, but ${n + 1} boxes would be ${person + box * (n + 1)} kg.)`,
      ],
    };
  }
  const plan = rng.pick([10, 15, 20, 25]);
  const perGb = rng.pick([3, 4, 5, 6]);
  const budget = plan + perGb * rng.int(3, 10) + rng.int(0, perGb - 1);
  const g = Math.floor((budget - plan) / perGb);
  return {
    prompt: `${name}'s phone plan costs ${cash(plan)} a month, plus ${cash(perGb)} for each extra gigabyte (GB) of data. ${name} wants to spend no more than ${cash(budget)} this month. What is the greatest number of extra whole GB ${name} can buy?`,
    answer: g,
    marks: 2,
    hints: [`Let $g$ be the number of extra GB. Then $${plan} + ${perGb}g \\le ${budget}$.`, 'Solve the inequality, then choose the largest whole number that fits.'],
    solution: [
      `$${plan} + ${perGb}g \\le ${budget}$`,
      `Subtract ${plan}: $${perGb}g \\le ${budget - plan}$`,
      `Divide by ${perGb}: $g \\le ${(budget - plan) % perGb === 0 ? (budget - plan) / perGb : `${frac(budget - plan, perGb)} = ${mixed(budget - plan, perGb)}`}$`,
      `The greatest whole number is ${g}, so ${name} can buy ${g} extra GB.`,
    ],
  };
}

export const integerSolutions: QuestionTemplate = {
  id: 'm9.alg.inequalities.integer-solutions',
  topicId: 'm9.alg.inequalities',
  title: 'Largest or smallest integer solution (including word problems)',
  difficulties: [3, 4],
  generate({ rng, difficulty }) {
    const c = difficulty === 3 ? abstractInteger(rng, false) : rng.chance(0.5) ? abstractInteger(rng, true) : contextInteger(rng);
    return {
      type: 'numeric',
      prompt: c.prompt,
      answer: c.answer,
      form: 'integer',
      ...(c.marks ? { marks: c.marks } : {}),
      calculator: 'not-allowed',
      hints: c.hints,
      solution: c.solution.join('\n\n'),
    };
  },
};

