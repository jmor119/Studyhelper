import type { QuestionTemplate, TemplateOutput } from '../../types';
import { clean, num, poly, tex, texSigned } from '../../format';
import type { Rng } from '../../../rng';
import { cash, t } from './helpers';

// m9.alg.substitution — substituting into expressions and formulas, and changing the subject.
// Rearranged formulas use lowercase letters because expression answers only accept lowercase
// variables (a student typing "P" would get "unexpected symbol").

const LETTERS = ['x', 'a', 'm', 'n', 'p', 'y', 'k', 't'] as const;

export const evaluateExpressions: QuestionTemplate = {
  id: 'm9.alg.substitution.evaluate',
  topicId: 'm9.alg.substitution',
  title: 'Substitute values into an expression',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    const base = { type: 'numeric' as const, form: 'integer' as const, calculator: 'not-allowed' as const };

    if (difficulty === 1) {
      if (rng.chance(0.6)) {
        const v = rng.pick(LETTERS);
        const a = rng.int(2, 9);
        const b = rng.nonZeroInt(-12, 20);
        const x = rng.int(1, 10);
        const value = a * x + b;
        return {
          ...base,
          prompt: `Find the value of $${poly([t(a, v), t(b)])}$ when $${v} = ${x}$.`,
          answer: value,
          hints: [`Replace $${v}$ with ${x}. Remember $${a}${v}$ means $${a} \\times ${v}$.`],
          solution: `$${poly([t(a, v), t(b)])} = ${a} \\times ${x} ${b < 0 ? '-' : '+'} ${Math.abs(b)} = ${a * x} ${b < 0 ? '-' : '+'} ${Math.abs(b)} = ${tex(value)}$`,
        };
      }
      const [u, w] = rng.pick([['a', 'b'], ['x', 'y'], ['m', 'n'], ['p', 'q']] as const);
      const [a, b] = [rng.int(2, 6), rng.int(2, 6)];
      const [x, y] = [rng.int(1, 9), rng.int(1, 9)];
      const op = rng.pick(['+', '-'] as const);
      const value = op === '+' ? a * x + b * y : a * x - b * y;
      return {
        ...base,
        prompt: `Find the value of $${a}${u} ${op} ${b}${w}$ when $${u} = ${x}$ and $${w} = ${y}$.`,
        answer: value,
        hints: [`Replace each letter with its value: $${a}${u}$ means $${a} \\times ${u}$.`],
        solution: `$${a}${u} ${op} ${b}${w} = ${a} \\times ${x} ${op} ${b} \\times ${y} = ${a * x} ${op} ${b * y} = ${tex(value)}$`,
      };
    }

    if (difficulty === 2) {
      const kind = rng.pick(['linear', 'minus', 'square', 'two'] as const);
      if (kind === 'linear') {
        const v = rng.pick(LETTERS);
        const a = rng.int(2, 9);
        const b = rng.nonZeroInt(-12, 12);
        const x = -rng.int(1, 9);
        const value = a * x + b;
        return {
          ...base,
          prompt: `Find the value of $${poly([t(a, v), t(b)])}$ when $${v} = ${x}$.`,
          answer: value,
          hints: ['Put the negative number in brackets when you substitute.', 'A positive times a negative is negative.'],
          solution: `$${poly([t(a, v), t(b)])} = ${a} \\times (${x}) ${b < 0 ? '-' : '+'} ${Math.abs(b)} = ${tex(a * x)} ${b < 0 ? '-' : '+'} ${Math.abs(b)} = ${tex(value)}$`,
        };
      }
      if (kind === 'minus') {
        const v = rng.pick(LETTERS);
        const k = rng.int(5, 20);
        const a = rng.int(2, 6);
        const x = -rng.int(1, 8);
        const value = k - a * x;
        return {
          ...base,
          prompt: `Find the value of $${k} - ${a}${v}$ when $${v} = ${x}$.`,
          answer: value,
          hints: [`Work out $${a} \\times (${x})$ first.`, 'Subtracting a negative number is the same as adding.'],
          solution: [
            `$${k} - ${a}${v} = ${k} - ${a} \\times (${x}) = ${k} - (${tex(a * x)})$`,
            `Subtracting a negative is the same as adding: $${k} + ${-a * x} = ${tex(value)}$`,
          ].join('\n\n'),
        };
      }
      if (kind === 'square') {
        const v = rng.pick(LETTERS);
        const x = -rng.int(2, 9);
        const b = rng.nonZeroInt(-15, 15);
        const value = x * x + b;
        return {
          ...base,
          prompt: `Find the value of $${v}^2 ${b < 0 ? '-' : '+'} ${Math.abs(b)}$ when $${v} = ${x}$.`,
          answer: value,
          hints: [`$${v}^2$ means $${v} \\times ${v}$. Use brackets: $(${x})^2$.`, 'A negative times a negative is positive.'],
          solution: `$(${x})^2 ${b < 0 ? '-' : '+'} ${Math.abs(b)} = ${x * x} ${b < 0 ? '-' : '+'} ${Math.abs(b)} = ${tex(value)}$\n\nNote that $(${x})^2 = (${x}) \\times (${x}) = ${x * x}$, which is positive.`,
        };
      }
      const [u, w] = rng.pick([['a', 'b'], ['x', 'y'], ['m', 'n'], ['p', 'q']] as const);
      const [a, b] = [rng.int(2, 6), rng.int(2, 6)];
      const x = rng.nonZeroInt(-8, 8);
      const y = x > 0 ? -rng.int(1, 8) : rng.nonZeroInt(-8, 8);
      const value = a * x - b * y;
      return {
        ...base,
        prompt: `Find the value of $${a}${u} - ${b}${w}$ when $${u} = ${x}$ and $${w} = ${y}$.`,
        answer: value,
        hints: ['Use brackets around negative numbers when you substitute.', 'Subtracting a negative is the same as adding.'],
        solution: `$${a}${u} - ${b}${w} = ${a} \\times ${texSigned(x)} - ${b} \\times ${texSigned(y)} = ${tex(a * x)} - ${texSigned(b * y)} = ${tex(value)}$`,
      };
    }

    // difficulty 3
    const kind = rng.pick(['quadratic', 'fraction', 'bracket-square', 'coef-square'] as const);
    if (kind === 'quadratic') {
      const v = rng.pick(LETTERS);
      const a = rng.int(2, 5);
      const b = rng.nonZeroInt(-7, 7);
      const x = -rng.int(1, 5);
      const value = a * x * x + b * x;
      return {
        ...base,
        prompt: `Find the value of $${poly([t(a, `${v}^2`), t(b, v)])}$ when $${v} = ${x}$.`,
        answer: value,
        hints: [`Square first: $(${x})^2 = ${x * x}$. Then multiply by ${a}.`, `Then work out $${b} \\times (${x})$.`],
        solution: [
          `$${poly([t(a, `${v}^2`), t(b, v)])} = ${a} \\times (${x})^2 ${b < 0 ? '-' : '+'} ${Math.abs(b)} \\times (${x})$`,
          `$= ${a} \\times ${x * x} ${b < 0 ? '-' : '+'} ${Math.abs(b)} \\times (${x})$`,
          `$= ${a * x * x} ${b * x < 0 ? '-' : '+'} ${Math.abs(b * x)} = ${tex(value)}$`,
          `Remember: square before you multiply (GEMA), so $${a}${v}^2$ is $${a} \\times ${v}^2$, not $(${a}${v})^2$.`,
        ].join('\n\n'),
      };
    }
    if (kind === 'fraction') {
      const [u, w, z] = rng.pick([['a', 'b', 'c'], ['p', 'q', 'r'], ['x', 'y', 'z']] as const);
      const c = rng.pick([2, 3, 4, 5, 6, -2, -3]);
      const value = rng.int(-6, 9);
      const a = rng.int(-9, 12);
      const b = value * c - a;
      return {
        ...base,
        prompt: `Find the value of $\\dfrac{${u} + ${w}}{${z}}$ when $${u} = ${a}$, $${w} = ${b}$ and $${z} = ${c}$.`,
        answer: value,
        hints: ['The fraction line acts like a bracket: work out the top first.', 'Then divide by the bottom.'],
        solution: `$\\dfrac{${tex(a)} + ${texSigned(b)}}{${tex(c)}} = \\dfrac{${tex(a + b)}}{${tex(c)}} = ${tex(value)}$`,
      };
    }
    if (kind === 'bracket-square') {
      const [u, w] = rng.pick([['a', 'b'], ['x', 'y'], ['m', 'n'], ['p', 'q']] as const);
      const k = rng.int(2, 4);
      const x = rng.int(-5, 6);
      const y = rng.int(-5, 6);
      const d = x - y;
      if (d === 0 || Math.abs(d) > 7) {
        // keep numbers friendly
        const y2 = x - rng.pick([-3, -2, 2, 3, 4]);
        return bracketSquare(k, u, w, x, y2);
      }
      return bracketSquare(k, u, w, x, y);
    }
    // coef-square: compare 3x² with (3x)²
    const v = rng.pick(LETTERS);
    const a = rng.int(2, 5);
    const x = rng.pick([-4, -3, -2, 2, 3, 4]);
    const c = rng.nonZeroInt(-10, 10);
    const value = a * x * x + c;
    return {
      ...base,
      prompt: `Find the value of $${a}${v}^2 ${c < 0 ? '-' : '+'} ${Math.abs(c)}$ when $${v} = ${x}$.`,
      answer: value,
      hints: [`Only the $${v}$ is squared, not the ${a}.`, 'Square first, then multiply, then add or subtract (GEMA).'],
      solution: [
        `$${a}${v}^2$ means $${a} \\times ${v}^2$, so square first:`,
        `$${a} \\times ${texSigned(x)}^2 ${c < 0 ? '-' : '+'} ${Math.abs(c)} = ${a} \\times ${x * x} ${c < 0 ? '-' : '+'} ${Math.abs(c)} = ${a * x * x} ${c < 0 ? '-' : '+'} ${Math.abs(c)} = ${tex(value)}$`,
        `A common mistake is to work out $(${a} \\times ${texSigned(x)})^2 = ${(a * x) ** 2}$, which squares the ${a} as well.`,
      ].join('\n\n'),
    };
  },
};

function bracketSquare(k: number, u: string, w: string, x: number, y: number): TemplateOutput {
  const d = x - y;
  const value = k * d * d;
  return {
    type: 'numeric',
    form: 'integer',
    calculator: 'not-allowed',
    prompt: `Find the value of $${k}(${u} - ${w})^2$ when $${u} = ${x}$ and $${w} = ${y}$.`,
    answer: value,
    hints: ['Work out the bracket first (GEMA).', 'Then square, then multiply.'],
    solution: [
      `Bracket first: $${tex(x)} - ${texSigned(y)} = ${tex(d)}$`,
      `Square: $${texSigned(d)}^2 = ${d * d}$`,
      `Multiply: $${k} \\times ${d * d} = ${tex(value)}$`,
    ].join('\n\n'),
  };
}

// ---------------------------------------------------------------------------------------------

interface FormulaCase {
  /** Question about the context, ending with what to find. */
  prompt: string;
  answer: number;
  units?: string;
  hints: string[];
  solution: string[];
}

function rectangle(rng: Rng, solveFor: boolean): FormulaCase {
  const l = rng.int(5, 25);
  const w = rng.int(2, l - 1);
  const P = 2 * l + 2 * w;
  if (!solveFor) {
    return {
      prompt: `The perimeter of a rectangle is given by $P = 2l + 2w$. Find $P$ when $l = ${l}$ cm and $w = ${w}$ cm.`,
      answer: P,
      units: 'cm',
      hints: ['$2l$ means $2 \\times l$.', 'Substitute both values, multiply, then add.'],
      solution: [`$P = 2 \\times ${l} + 2 \\times ${w} = ${2 * l} + ${2 * w} = ${P}$`, `The perimeter is ${P} cm.`],
    };
  }
  return {
    prompt: `The perimeter of a rectangle is given by $P = 2l + 2w$. A rectangle has a perimeter of ${P} cm and a length of ${l} cm. Find its width, $w$.`,
    answer: w,
    units: 'cm',
    hints: ['Substitute the values you know into the formula.', 'You get an equation in $w$. Solve it with inverse operations.'],
    solution: [
      `$${P} = 2 \\times ${l} + 2w$`,
      `$${P} = ${2 * l} + 2w$`,
      `Subtract ${2 * l}: $${P - 2 * l} = 2w$`,
      `Divide by 2: $w = ${w}$`,
      `The width is ${w} cm.`,
    ],
  };
}

function triangle(rng: Rng, solveFor: boolean): FormulaCase {
  const b = rng.int(3, 16);
  const h = b % 2 === 0 ? rng.int(2, 15) : 2 * rng.int(1, 7);
  const A = (b * h) / 2;
  if (!solveFor) {
    return {
      prompt: `The area of a triangle is $A = \\frac{1}{2}bh$. Find $A$ when $b = ${b}$ cm and $h = ${h}$ cm.`,
      answer: A,
      units: 'cm²',
      hints: ['$bh$ means $b \\times h$.', 'Multiply the base by the height, then halve it.'],
      solution: [`$A = \\frac{1}{2} \\times ${b} \\times ${h} = \\frac{1}{2} \\times ${b * h} = ${A}$`, `The area is ${A} cm².`],
    };
  }
  return {
    prompt: `The area of a triangle is $A = \\frac{1}{2}bh$. A triangle has an area of ${A} cm² and a base of ${b} cm. Find its height, $h$.`,
    answer: h,
    units: 'cm',
    hints: ['Substitute $A$ and $b$ into the formula.', `Half of ${b} is ${num(b / 2)}, so you get $${A} = ${num(b / 2)}h$.`],
    solution: [
      `$${A} = \\frac{1}{2} \\times ${b} \\times h$`,
      `$${A} = ${tex(b / 2)}h$`,
      `Divide both sides by ${num(b / 2)}: $h = ${A} \\div ${tex(b / 2)} = ${h}$`,
      `The height is ${h} cm.`,
    ],
  };
}

function callout(rng: Rng, solveFor: boolean): FormulaCase {
  const fee = rng.pick([45, 50, 60, 65, 75, 80, 90]);
  const rate = rng.pick([40, 45, 55, 60, 70, 85]);
  const h = rng.int(2, 8);
  const C = fee + rate * h;
  const who = rng.pick(['An electrician', 'A plumber', 'A builder', 'A gardener']);
  const formula = `C = ${fee} + ${rate}h`;
  if (!solveFor) {
    return {
      prompt: `${who} charges a call-out fee plus an hourly rate. The cost in dollars for $h$ hours is $${formula}$. Find the cost of a ${h}-hour job.`,
      answer: C,
      units: '$',
      hints: [`Substitute $h = ${h}$.`, 'Multiply before you add.'],
      solution: [`$C = ${fee} + ${rate} \\times ${h} = ${fee} + ${rate * h} = ${C}$`, `The job costs ${cash(C)}.`],
    };
  }
  return {
    prompt: `${who} charges a call-out fee plus an hourly rate. The cost in dollars for $h$ hours is $${formula}$. A job cost ${cash(C)}. How many hours did it take?`,
    answer: h,
    units: 'hours',
    hints: [`Substitute $C = ${C}$ to get an equation.`, `Subtract ${fee}, then divide by ${rate}.`],
    solution: [
      `$${C} = ${fee} + ${rate}h$`,
      `Subtract ${fee}: $${C - fee} = ${rate}h$`,
      `Divide by ${rate}: $h = ${h}$`,
      `The job took ${h} hours.`,
    ],
  };
}

function speed(rng: Rng, _solveFor = false): FormulaCase {
  const s = rng.pick([12, 15, 18, 20, 24, 30, 45, 50, 60, 75, 80, 90, 100]);
  const tt = rng.int(2, 6);
  const d = s * tt;
  return {
    prompt: `Speed is given by $s = \\dfrac{d}{t}$. A car travels ${d} km in ${tt} hours. Find its average speed, $s$, in km/h.`,
    answer: s,
    units: 'km/h',
    hints: ['Substitute $d$ and $t$.', 'Divide the distance by the time.'],
    solution: [`$s = \\dfrac{${d}}{${tt}} = ${s}$`, `The average speed is ${s} km/h.`],
  };
}

function fahrenheit(rng: Rng, solveFor: boolean): FormulaCase {
  const C = 5 * rng.pick([-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8]);
  const F = clean(1.8 * C + 32);
  if (!solveFor) {
    return {
      prompt: `Temperatures in the United States are often given in degrees Fahrenheit. The formula $F = 1.8C + 32$ converts degrees Celsius to Fahrenheit. Convert ${num(C)} °C to °F.`,
      answer: F,
      units: '°F',
      hints: [`Substitute $C = ${C}$.`, 'Multiply by 1.8 first, then add 32.'],
      solution: [`$F = 1.8 \\times ${texSigned(C)} + 32 = ${tex(clean(1.8 * C))} + 32 = ${tex(F)}$`, `${num(C)} °C is ${num(F)} °F.`],
    };
  }
  return {
    prompt: `The formula $F = 1.8C + 32$ converts degrees Celsius to degrees Fahrenheit. A weather report says it is ${num(F)} °F. What is this in °C?`,
    answer: C,
    units: '°C',
    hints: [`Substitute $F = ${F}$ and solve for $C$.`, 'Subtract 32 first, then divide by 1.8.'],
    solution: [
      `$${tex(F)} = 1.8C + 32$`,
      `Subtract 32: $${tex(clean(F - 32))} = 1.8C$`,
      `Divide by 1.8: $C = ${tex(clean(F - 32))} \\div 1.8 = ${tex(C)}$`,
      `It is ${num(C)} °C.`,
    ],
  };
}

function velocity(rng: Rng, solveFor: boolean): FormulaCase {
  const tt = rng.int(2, 8);
  const a = rng.pick([-3, -2, 1, 2, 3, 4, 5]);
  const u = a < 0 ? rng.int(-a * tt, 30) : rng.int(0, 20);
  const v = u + a * tt;
  if (!solveFor) {
    return {
      prompt: `The formula $v = u + at$ gives the final speed $v$ (m/s) of an object with starting speed $u$ (m/s), acceleration $a$ (m/s²) and time $t$ (s). Find $v$ when $u = ${u}$, $a = ${a}$ and $t = ${tt}$.`,
      answer: v,
      units: 'm/s',
      hints: ['$at$ means $a \\times t$.', 'Multiply first, then add.'],
      solution: [`$v = ${u} + ${texSigned(a)} \\times ${tt} = ${u} + ${texSigned(a * tt)} = ${v}$`, `The final speed is ${v} m/s.`],
    };
  }
  return {
    prompt: `The formula $v = u + at$ gives the final speed $v$ (m/s) of an object with starting speed $u$ (m/s), acceleration $a$ (m/s²) and time $t$ (s). Find $a$ when $v = ${v}$, $u = ${u}$ and $t = ${tt}$.`,
    answer: a,
    units: 'm/s²',
    hints: ['Substitute the three values you know.', `You get $${v} = ${u} + ${tt}a$. Solve for $a$.`],
    solution: [
      `$${v} = ${u} + ${tt}a$`,
      `Subtract ${u}: $${tex(v - u)} = ${tt}a$`,
      `Divide by ${tt}: $a = ${tex(a)}$`,
      a < 0 ? `The acceleration is ${num(a)} m/s². It is negative because the object is slowing down.` : `The acceleration is ${a} m/s².`,
    ],
  };
}

function taxi(rng: Rng, _solveFor = false): FormulaCase {
  const flag = rng.pick([3.5, 4, 4.5, 5]);
  const rate = rng.pick([2.5, 2.8, 3, 3.2, 3.5]);
  const d = rng.int(3, 15);
  const C = clean(flag + rate * d);
  const place = rng.pick(['Wellington', 'Auckland', 'Christchurch', 'Dunedin', 'Hamilton']);
  return {
    prompt: `A taxi company in ${place} uses the formula $C = ${flag} + ${rate}d$ for the cost in dollars of a trip of $d$ km. How much does a trip of ${d} km cost?`,
    answer: C,
    units: '$',
    hints: [`Substitute $d = ${d}$.`, `Work out $${rate} \\times ${d}$ first, then add ${flag}.`],
    solution: [`$C = ${flag} + ${rate} \\times ${d} = ${flag} + ${tex(clean(rate * d))} = ${tex(C)}$`, `The trip costs ${cash(C)}.`],
  };
}

export const formulas: QuestionTemplate = {
  id: 'm9.alg.substitution.formulas',
  topicId: 'm9.alg.substitution',
  title: 'Use a formula (and work backwards)',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    let c: FormulaCase;
    if (difficulty === 2) {
      c = rng.pick([rectangle, triangle, callout, speed] as const)(rng, false);
    } else if (difficulty === 3) {
      c = rng.pick([fahrenheit, velocity, taxi] as const)(rng, false);
    } else {
      c = rng.pick([rectangle, triangle, callout, fahrenheit, velocity] as const)(rng, true);
    }
    return {
      type: 'numeric',
      prompt: c.prompt,
      answer: c.answer,
      ...(c.units ? { units: c.units } : {}),
      ...(difficulty === 4 ? { marks: 2 } : {}),
      calculator: difficulty === 2 ? 'not-allowed' : 'allowed',
      hints: c.hints,
      solution: c.solution.join('\n\n'),
    };
  },
};

// ---------------------------------------------------------------------------------------------

interface Rearrangement {
  formula: string;
  subject: string;
  answer: string;
  /** TeX of the answer, e.g. "\\dfrac{y - 5}{3}". */
  answerTex: string;
  variables: string[];
  steps: string[];
  context?: string;
}

function numericOneStep(rng: Rng): Rearrangement {
  const k = rng.int(2, 12);
  switch (rng.pick(['add', 'sub', 'mult', 'div'] as const)) {
    case 'add':
      return {
        formula: `y = x + ${k}`,
        subject: 'x',
        answer: `y - ${k}`,
        answerTex: `y - ${k}`,
        variables: ['x', 'y'],
        steps: [`Subtract ${k} from both sides: $y - ${k} = x$`],
      };
    case 'sub':
      return {
        formula: `y = x - ${k}`,
        subject: 'x',
        answer: `y + ${k}`,
        answerTex: `y + ${k}`,
        variables: ['x', 'y'],
        steps: [`Add ${k} to both sides: $y + ${k} = x$`],
      };
    case 'mult':
      return {
        formula: `y = ${k}x`,
        subject: 'x',
        answer: `y/${k}`,
        answerTex: `\\dfrac{y}{${k}}`,
        variables: ['x', 'y'],
        steps: [`Divide both sides by ${k}: $\\dfrac{y}{${k}} = x$`],
      };
    default:
      return {
        formula: `y = \\dfrac{x}{${k}}`,
        subject: 'x',
        answer: `${k}*y`,
        answerTex: `${k}y`,
        variables: ['x', 'y'],
        steps: [`Multiply both sides by ${k}: $${k}y = x$`],
      };
  }
}

const LETTER_ONE_STEP: Rearrangement[] = [
  {
    context: 'Distance $d$, speed $s$ and time $t$ are linked by',
    formula: 'd = st',
    subject: 's',
    answer: 'd/t',
    answerTex: '\\dfrac{d}{t}',
    variables: ['d', 't'],
    steps: ['$st$ means $s \\times t$. Divide both sides by $t$: $\\dfrac{d}{t} = s$'],
  },
  {
    context: 'Distance $d$, speed $s$ and time $t$ are linked by',
    formula: 'd = st',
    subject: 't',
    answer: 'd/s',
    answerTex: '\\dfrac{d}{s}',
    variables: ['d', 's'],
    steps: ['$st$ means $s \\times t$. Divide both sides by $s$: $\\dfrac{d}{s} = t$'],
  },
  {
    formula: 'v = u + at',
    subject: 'u',
    answer: 'v - a*t',
    answerTex: 'v - at',
    variables: ['v', 'a', 't'],
    steps: ['Subtract $at$ from both sides: $v - at = u$'],
  },
  {
    formula: 'y = mx + c',
    subject: 'c',
    answer: 'y - m*x',
    answerTex: 'y - mx',
    variables: ['y', 'm', 'x'],
    steps: ['Subtract $mx$ from both sides: $y - mx = c$'],
  },
  {
    context: 'Profit $p$, selling price $s$ and cost $c$ are linked by',
    formula: 'p = s - c',
    subject: 's',
    answer: 'p + c',
    answerTex: 'p + c',
    variables: ['p', 'c'],
    steps: ['Add $c$ to both sides: $p + c = s$'],
  },
  {
    context: 'Weight $w$, mass $m$ and gravitational field strength $g$ are linked by',
    formula: 'w = mg',
    subject: 'm',
    answer: 'w/g',
    answerTex: '\\dfrac{w}{g}',
    variables: ['w', 'g'],
    steps: ['$mg$ means $m \\times g$. Divide both sides by $g$: $\\dfrac{w}{g} = m$'],
  },
  {
    context: 'Density $d$, mass $m$ and volume $v$ are linked by',
    formula: 'd = \\dfrac{m}{v}',
    subject: 'm',
    answer: 'd*v',
    answerTex: 'dv',
    variables: ['d', 'v'],
    steps: ['$m$ is divided by $v$, so multiply both sides by $v$: $dv = m$'],
  },
];

function numericTwoStep(rng: Rng): Rearrangement {
  const a = rng.int(2, 9);
  const b = rng.nonZeroInt(-12, 12);
  const sign = b < 0 ? '-' : '+';
  const inv = b < 0 ? '+' : '-';
  const B = Math.abs(b);
  switch (rng.pick(['ax+b', 'a(x+b)', '(x+b)/a', 'x/a+b'] as const)) {
    case 'ax+b':
      return {
        formula: `y = ${a}x ${sign} ${B}`,
        subject: 'x',
        answer: `(y ${inv} ${B})/${a}`,
        answerTex: `\\dfrac{y ${inv} ${B}}{${a}}`,
        variables: ['x', 'y'],
        steps: [`${b < 0 ? `Add ${B} to` : `Subtract ${B} from`} both sides: $y ${inv} ${B} = ${a}x$`, `Divide both sides by ${a}: $\\dfrac{y ${inv} ${B}}{${a}} = x$`],
      };
    case 'a(x+b)':
      return {
        formula: `y = ${a}(x ${sign} ${B})`,
        subject: 'x',
        answer: `y/${a} ${inv} ${B}`,
        answerTex: `\\dfrac{y}{${a}} ${inv} ${B}`,
        variables: ['x', 'y'],
        steps: [`Divide both sides by ${a}: $\\dfrac{y}{${a}} = x ${sign} ${B}$`, `${b < 0 ? `Add ${B} to` : `Subtract ${B} from`} both sides: $\\dfrac{y}{${a}} ${inv} ${B} = x$`],
      };
    case '(x+b)/a':
      return {
        formula: `y = \\dfrac{x ${sign} ${B}}{${a}}`,
        subject: 'x',
        answer: `${a}*y ${inv} ${B}`,
        answerTex: `${a}y ${inv} ${B}`,
        variables: ['x', 'y'],
        steps: [`Multiply both sides by ${a}: $${a}y = x ${sign} ${B}$`, `${b < 0 ? `Add ${B} to` : `Subtract ${B} from`} both sides: $${a}y ${inv} ${B} = x$`],
      };
    default:
      return {
        formula: `y = \\dfrac{x}{${a}} ${sign} ${B}`,
        subject: 'x',
        answer: `${a}*(y ${inv} ${B})`,
        answerTex: `${a}(y ${inv} ${B})`,
        variables: ['x', 'y'],
        steps: [`${b < 0 ? `Add ${B} to` : `Subtract ${B} from`} both sides: $y ${inv} ${B} = \\dfrac{x}{${a}}$`, `Multiply both sides by ${a}: $${a}(y ${inv} ${B}) = x$`],
      };
  }
}

function contextTwoStep(rng: Rng): Rearrangement {
  if (rng.chance(0.5)) {
    return {
      context: 'The perimeter $p$ of a rectangle with length $l$ and width $w$ is',
      formula: 'p = 2l + 2w',
      subject: 'w',
      answer: '(p - 2*l)/2',
      answerTex: '\\dfrac{p - 2l}{2}',
      variables: ['p', 'l'],
      steps: ['Subtract $2l$ from both sides: $p - 2l = 2w$', 'Divide both sides by 2: $\\dfrac{p - 2l}{2} = w$', 'This can also be written $w = \\dfrac{p}{2} - l$.'],
    };
  }
  const fee = rng.pick([40, 50, 60, 75, 80]);
  const rate = rng.pick([15, 20, 25, 30, 35, 45]);
  return {
    context: `A kayak hire company charges a ${cash(fee)} booking fee plus ${cash(rate)} an hour. The cost $c$ dollars for $h$ hours is`,
    formula: `c = ${rate}h + ${fee}`,
    subject: 'h',
    answer: `(c - ${fee})/${rate}`,
    answerTex: `\\dfrac{c - ${fee}}{${rate}}`,
    variables: ['c', 'h'],
    steps: [`Subtract ${fee} from both sides: $c - ${fee} = ${rate}h$`, `Divide both sides by ${rate}: $\\dfrac{c - ${fee}}{${rate}} = h$`],
  };
}

const LETTER_TWO_STEP: Rearrangement[] = [
  {
    formula: 'v = u + at',
    subject: 'a',
    answer: '(v - u)/t',
    answerTex: '\\dfrac{v - u}{t}',
    variables: ['v', 'u', 't'],
    steps: ['Subtract $u$ from both sides: $v - u = at$', 'Divide both sides by $t$: $\\dfrac{v - u}{t} = a$'],
  },
  {
    formula: 'v = u + at',
    subject: 't',
    answer: '(v - u)/a',
    answerTex: '\\dfrac{v - u}{a}',
    variables: ['v', 'u', 'a'],
    steps: ['Subtract $u$ from both sides: $v - u = at$', 'Divide both sides by $a$: $\\dfrac{v - u}{a} = t$'],
  },
  {
    formula: 'y = mx + c',
    subject: 'x',
    answer: '(y - c)/m',
    answerTex: '\\dfrac{y - c}{m}',
    variables: ['y', 'c', 'm'],
    steps: ['Subtract $c$ from both sides: $y - c = mx$', 'Divide both sides by $m$: $\\dfrac{y - c}{m} = x$'],
  },
  {
    formula: 'y = mx + c',
    subject: 'm',
    answer: '(y - c)/x',
    answerTex: '\\dfrac{y - c}{x}',
    variables: ['y', 'c', 'x'],
    steps: ['Subtract $c$ from both sides: $y - c = mx$', 'Divide both sides by $x$: $\\dfrac{y - c}{x} = m$'],
  },
  {
    context: 'The perimeter $p$ of a rectangle with length $l$ and width $w$ is',
    formula: 'p = 2l + 2w',
    subject: 'l',
    answer: '(p - 2*w)/2',
    answerTex: '\\dfrac{p - 2w}{2}',
    variables: ['p', 'w'],
    steps: ['Subtract $2w$ from both sides: $p - 2w = 2l$', 'Divide both sides by 2: $\\dfrac{p - 2w}{2} = l$', 'This can also be written $l = \\dfrac{p}{2} - w$.'],
  },
  {
    context: 'The mean $m$ of two numbers $a$ and $b$ is',
    formula: 'm = \\dfrac{a + b}{2}',
    subject: 'a',
    answer: '2*m - b',
    answerTex: '2m - b',
    variables: ['m', 'b'],
    steps: ['Multiply both sides by 2: $2m = a + b$', 'Subtract $b$ from both sides: $2m - b = a$'],
  },
  {
    formula: 'y = k - x',
    subject: 'x',
    answer: 'k - y',
    answerTex: 'k - y',
    variables: ['y', 'k'],
    steps: ['Add $x$ to both sides: $y + x = k$', 'Subtract $y$ from both sides: $x = k - y$'],
  },
];

function numericHard(rng: Rng): Rearrangement {
  const a = rng.int(2, 6);
  const k = rng.int(3, 20);
  if (rng.chance(0.5)) {
    // y = k − a·x  →  x = (k − y)/a
    return {
      formula: `y = ${k} - ${a}x`,
      subject: 'x',
      answer: `(${k} - y)/${a}`,
      answerTex: `\\dfrac{${k} - y}{${a}}`,
      variables: ['x', 'y'],
      steps: [`Add $${a}x$ to both sides: $y + ${a}x = ${k}$`, `Subtract $y$ from both sides: $${a}x = ${k} - y$`, `Divide both sides by ${a}: $x = \\dfrac{${k} - y}{${a}}$`],
    };
  }
  // y = (a·x − k)/c  →  x = (c·y + k)/a
  let c = rng.int(2, 5);
  if (c === a) c += 1;
  return {
    formula: `y = \\dfrac{${a}x - ${k}}{${c}}`,
    subject: 'x',
    answer: `(${c}*y + ${k})/${a}`,
    answerTex: `\\dfrac{${c}y + ${k}}{${a}}`,
    variables: ['x', 'y'],
    steps: [`Multiply both sides by ${c}: $${c}y = ${a}x - ${k}$`, `Add ${k} to both sides: $${c}y + ${k} = ${a}x$`, `Divide both sides by ${a}: $\\dfrac{${c}y + ${k}}{${a}} = x$`],
  };
}

export const rearrangeFormulas: QuestionTemplate = {
  id: 'm9.alg.substitution.rearrange',
  topicId: 'm9.alg.substitution',
  title: 'Change the subject of a formula',
  difficulties: [3, 4, 5],
  generate({ rng, difficulty }) {
    let r: Rearrangement;
    if (difficulty === 3) r = rng.chance(0.5) ? numericOneStep(rng) : rng.pick(LETTER_ONE_STEP);
    else if (difficulty === 4) r = rng.chance(0.75) ? numericTwoStep(rng) : contextTwoStep(rng);
    else r = rng.chance(0.5) ? rng.pick(LETTER_TWO_STEP) : numericHard(rng);
    const intro = r.context ? `${r.context} $${r.formula}$.\n\nMake $${r.subject}$ the subject of the formula.` : `Make $${r.subject}$ the subject of $${r.formula}$.`;
    return {
      type: 'expression',
      prompt: `${intro}\n\nType the expression that $${r.subject}$ is equal to.`,
      answer: r.answer,
      variables: r.variables,
      ...(difficulty >= 4 ? { marks: 2 } : {}),
      calculator: 'not-allowed',
      hints: [
        `"Make $${r.subject}$ the subject" means rearrange to get $${r.subject} = \\ldots$ with $${r.subject}$ on its own.`,
        'Undo the operations on the subject in reverse order, doing the same thing to both sides, just like solving an equation.',
      ],
      solution: (r.steps[r.steps.length - 1]!.includes(`$${r.subject} = ${r.answerTex}$`)
        ? r.steps
        : [...r.steps, `So $${r.subject} = ${r.answerTex}$.`]
      ).join('\n\n'),
    };
  },
};
