import type { QuestionTemplate, TemplateOutput } from '../../types';
import { NAMES, poly, tex, texSigned } from '../../format';
import type { Rng } from '../../../rng';
import { cash, mcqFields, t } from './helpers';

// m9.alg.equations — forming equations from situations, and checking solutions by substitution.
// As with the other equation templates, the solution is chosen first.

const ITEMS: ReadonlyArray<readonly [string, string]> = [
  ['pies', 'pie'],
  ['movie tickets', 'movie ticket'],
  ['notebooks', 'notebook'],
  ['bags of feijoas', 'bag of feijoas'],
  ['netball bibs', 'netball bib'],
  ['packets of seeds', 'packet of seeds'],
];
const EXTRAS = ['a drink bottle', 'a pen', 'a sandwich', 'a phone charger', 'a bag of ice'] as const;

function wordProblem(
  prompt: string,
  letter: string,
  meaning: string,
  equation: string,
  steps: string[],
  answer: number,
  sentence: string,
  extra: Partial<TemplateOutput> = {},
): TemplateOutput {
  return {
    type: 'numeric',
    prompt,
    answer,
    calculator: 'not-allowed',
    hints: [
      `Let $${letter}$ be ${meaning}. Write an equation using $${letter}$.`,
      `The equation is $${equation}$. Now solve it.`,
    ],
    solution: [`Let $${letter}$ = ${meaning}.`, `Equation: $${equation}$`, ...steps, sentence].join('\n\n'),
    ...extra,
  } as TemplateOutput;
}

function thinkOfNumberMcq(rng: Rng): TemplateOutput {
  const name = rng.pick(NAMES);
  const a = rng.int(2, 9);
  let b = rng.int(1, 12);
  if (b === a) b += 1;
  const op = rng.pick(['add', 'sub'] as const);
  const n = rng.int(1, 12) + (op === 'sub' ? b : 0);
  const multFirst = rng.chance(0.5);
  const s = op === 'add' ? '+' : '-';
  const other = op === 'add' ? '-' : '+';
  const r = multFirst ? (op === 'add' ? a * n + b : a * n - b) : op === 'add' ? a * (n + b) : a * (n - b);
  const words = multFirst
    ? `multiplies it by ${a}, then ${op === 'add' ? `adds ${b}` : `subtracts ${b}`}`
    : `${op === 'add' ? `adds ${b} to it` : `subtracts ${b} from it`}, then multiplies the result by ${a}`;
  const multEq = `$${a}n ${s} ${b} = ${r}$`;
  const bracketEq = `$${a}(n ${s} ${b}) = ${r}$`;
  const correct = multFirst ? multEq : bracketEq;
  const mcq = mcqFields(rng, { text: correct }, [
    {
      text: multFirst ? bracketEq : multEq,
      feedback: multFirst
        ? 'This adds or subtracts first and then multiplies. The number was multiplied first.'
        : 'This multiplies only the number by ' + a + '. The whole result was multiplied, so you need brackets.',
    },
    {
      text: multFirst ? `$${b}n ${s} ${a} = ${r}$` : `$${b}(n ${s} ${a}) = ${r}$`,
      feedback: `The number was multiplied by ${a}, not ${b}.`,
    },
    {
      text: multFirst ? `$${a}n ${other} ${b} = ${r}$` : `$${a}(n ${other} ${b}) = ${r}$`,
      feedback: `Check the operation: the question says ${op === 'add' ? 'adds' : 'subtracts'}.`,
    },
  ]);
  const solve = multFirst
    ? `To solve it: $${a}n = ${op === 'add' ? r - b : r + b}$, so $n = ${n}$.`
    : `To solve it: $n ${s} ${b} = ${r / a}$, so $n = ${n}$.`;
  return {
    type: 'mcq',
    prompt: `${name} thinks of a number, ${words}. The answer is ${r}.\n\nIf the number is $n$, which equation matches this?`,
    ...mcq,
    calculator: 'not-allowed',
    hints: [
      'Follow the steps in order, starting from $n$.',
      multFirst ? 'Is the number multiplied before or after the adding or subtracting?' : 'When a whole result is multiplied, the result needs to be in brackets.',
    ],
    solution: [
      multFirst
        ? `Start with $n$. Multiply by ${a}: $${a}n$. Then ${op === 'add' ? `add ${b}` : `subtract ${b}`}: $${a}n ${s} ${b}$.`
        : `Start with $n$. ${op === 'add' ? `Add ${b}` : `Subtract ${b}`}: $n ${s} ${b}$. Then multiply the whole result by ${a}: $${a}(n ${s} ${b})$.`,
      `So the equation is ${correct}.`,
      solve,
    ].join('\n\n'),
  };
}

function shopping(rng: Rng): TemplateOutput {
  const name = rng.pick(NAMES);
  const [items, item] = rng.pick(ITEMS);
  const extra = rng.pick(EXTRAS);
  const k = rng.int(2, 6);
  const p = rng.int(2, 20);
  const e = rng.int(2, 15);
  const total = k * p + e;
  return wordProblem(
    `${name} buys ${k} ${items}, all the same price, and ${extra} for ${cash(e)}. ${name} spends ${cash(total)} altogether. How much does one ${item} cost?`,
    'p',
    `the price of one ${item} in dollars`,
    `${k}p + ${e} = ${total}`,
    [`Subtract ${e} from both sides: $${k}p = ${total - e}$`, `Divide both sides by ${k}: $p = ${p}$`],
    p,
    `One ${item} costs ${cash(p)}. Check: $${k} \\times ${p} + ${e} = ${total}$ ✓`,
    { units: '$' },
  );
}

function membership(rng: Rng): TemplateOutput {
  const name = rng.pick(NAMES);
  const join = rng.pick([20, 25, 30, 40, 45, 50, 60]);
  const w = rng.pick([8, 9, 10, 12, 14, 15, 18]);
  const n = rng.int(3, 20);
  const total = join + w * n;
  const club = rng.pick(['A gym', 'A swimming club', 'A climbing wall', 'A dance studio']);
  return wordProblem(
    `${club} charges a joining fee of ${cash(join)} plus ${cash(w)} per week. ${name} has paid ${cash(total)} in total so far. How many weeks has ${name} been a member?`,
    'w',
    'the number of weeks',
    `${join} + ${w}w = ${total}`,
    [`Subtract ${join} from both sides: $${w}w = ${total - join}$`, `Divide both sides by ${w}: $w = ${n}$`],
    n,
    `${name} has been a member for ${n} weeks.`,
  );
}

function divideThinkOfNumber(rng: Rng): TemplateOutput {
  const name = rng.pick(NAMES);
  const a = rng.int(2, 6);
  const q = rng.int(2, 12);
  const b = rng.int(1, 15);
  const n = a * q;
  const r = q + b;
  return wordProblem(
    `${name} thinks of a number, divides it by ${a}, then adds ${b}. The answer is ${r}. What was the number?`,
    'n',
    'the number',
    `\\dfrac{n}{${a}} + ${b} = ${r}`,
    [`Subtract ${b} from both sides: $\\dfrac{n}{${a}} = ${q}$`, `Multiply both sides by ${a}: $n = ${n}$`],
    n,
    `The number was ${n}. Check: $${n} \\div ${a} + ${b} = ${q} + ${b} = ${r}$ ✓`,
  );
}

function sausageSizzle(rng: Rng): TemplateOutput {
  const price = rng.pick([2, 3, 4]);
  const costs = rng.pick([20, 30, 40, 45, 50, 60]);
  const s = rng.int(20, 80);
  const profit = price * s - costs;
  const group = rng.pick(['The Year 9 class', 'A netball team', 'The school kapa haka group', 'A rugby club']);
  return wordProblem(
    `${group} runs a sausage sizzle. They sell sausages for ${cash(price)} each and spend ${cash(costs)} on supplies. They make a profit of ${cash(profit)}. How many sausages did they sell?`,
    's',
    'the number of sausages sold',
    `${price}s - ${costs} = ${profit}`,
    [`Add ${costs} to both sides: $${price}s = ${profit + costs}$`, `Divide both sides by ${price}: $s = ${s}$`],
    s,
    `They sold ${s} sausages. (Profit = money taken − costs.)`,
  );
}

function rectanglePerimeter(rng: Rng): TemplateOutput {
  const w = rng.int(2, 20);
  const d = rng.int(1, 10);
  const P = 2 * w + 2 * (w + d);
  return wordProblem(
    `A rectangle is ${d} cm longer than it is wide. Its perimeter is ${P} cm. Find its width.`,
    'w',
    'the width in cm (so the length is $w + ' + d + '$)',
    `2w + 2(w + ${d}) = ${P}`,
    [
      `Expand and simplify: $2w + 2w + ${2 * d} = ${P}$, so $4w + ${2 * d} = ${P}$`,
      `Subtract ${2 * d}: $4w = ${P - 2 * d}$`,
      `Divide by 4: $w = ${w}$`,
    ],
    w,
    `The width is ${w} cm (and the length is ${w + d} cm). Check: $2 \\times ${w} + 2 \\times ${w + d} = ${P}$ ✓`,
    { units: 'cm', marks: 2 },
  );
}

function consecutive(rng: Rng): TemplateOutput {
  const n = rng.int(5, 60);
  const S = 3 * n + 3;
  return wordProblem(
    `The sum of three consecutive whole numbers is ${S}. What is the smallest of the three numbers?`,
    'n',
    'the smallest number (so the others are $n + 1$ and $n + 2$)',
    `n + (n + 1) + (n + 2) = ${S}`,
    [`Collect like terms: $3n + 3 = ${S}$`, `Subtract 3: $3n = ${S - 3}$`, `Divide by 3: $n = ${n}$`],
    n,
    `The numbers are ${n}, ${n + 1} and ${n + 2}, so the smallest is ${n}. Check: $${n} + ${n + 1} + ${n + 2} = ${S}$ ✓`,
    { marks: 2 },
  );
}

function triangleAngles(rng: Rng): TemplateOutput {
  const k = rng.int(2, 4);
  let x = 20;
  let b = 0;
  for (;;) {
    x = rng.int(12, 40);
    b = 180 - (k + 2) * x;
    if (b !== 0 && x + b > 0 && Math.abs(b) <= 60) break;
  }
  const third = `x ${b < 0 ? '-' : '+'} ${Math.abs(b)}`;
  return wordProblem(
    `The three angles of a triangle are $x°$, $${k}x°$ and $(${third})°$. Find the value of $x$.`,
    'x',
    'the size of the first angle in degrees',
    `x + ${k}x + ${third} = 180`,
    [
      `The angles in a triangle add to 180°. Collect like terms: $${k + 2}x ${b < 0 ? '-' : '+'} ${Math.abs(b)} = 180$`,
      `${b < 0 ? `Add ${-b}` : `Subtract ${b}`}: $${k + 2}x = ${180 - b}$`,
      `Divide by ${k + 2}: $x = ${x}$`,
    ],
    x,
    `So $x = ${x}$. The angles are ${x}°, ${k * x}° and ${x + b}°, which add to 180° ✓`,
    { marks: 2 },
  );
}

function ages(rng: Rng): TemplateOutput {
  const name = rng.pick(NAMES);
  // Keep the ages realistic: parents and aunts/uncles 3–4 times as old, grandparents 5–6 times.
  const grand = rng.chance(0.35);
  const rel = grand ? rng.pick(['koro', 'nan', 'grandad', 'grandma']) : rng.pick(['aunty', 'uncle', 'mum', 'dad']);
  const k = grand ? rng.int(5, 6) : rng.int(3, 4);
  const a = grand ? rng.int(10, 14) : rng.int(9, 14);
  const S = a + k * a;
  return wordProblem(
    `${name}'s ${rel} is ${k} times as old as ${name}. Their ages add up to ${S}. How old is ${name}?`,
    'a',
    `${name}'s age in years (so ${name}'s ${rel} is $${k}a$)`,
    `a + ${k}a = ${S}`,
    [`Collect like terms: $${k + 1}a = ${S}$`, `Divide by ${k + 1}: $a = ${a}$`],
    a,
    `${name} is ${a} years old, and ${name}'s ${rel} is ${k * a}.`,
    { marks: 2 },
  );
}

function equalPlans(rng: Rng): TemplateOutput {
  const n = rng.int(4, 20);
  const gap = rng.int(1, 5);
  const w2 = rng.int(5, 15);
  const w1 = w2 + gap;
  const J1 = rng.pick([0, 10, 15, 20, 25, 30]);
  const J2 = J1 + gap * n;
  const first = J1 ? `charges ${cash(J1)} to join plus ${cash(w1)} per week` : `has no joining fee and charges ${cash(w1)} per week`;
  return wordProblem(
    `Gym A ${first}. Gym B charges ${cash(J2)} to join plus ${cash(w2)} per week. After how many weeks will the total cost be the same at both gyms?`,
    'w',
    'the number of weeks',
    `${poly([t(J1), t(w1, 'w')])} = ${J2} + ${w2}w`,
    [
      `Subtract $${w2}w$ from both sides: $${poly([t(J1), t(gap, 'w')])} = ${J2}$`,
      J1 ? `Subtract ${J1}: $${poly([t(gap, 'w')])} = ${J2 - J1}$` : '',
      gap === 1 ? `So $w = ${n}$` : `Divide by ${gap}: $w = ${n}$`,
    ].filter(Boolean),
    n,
    `The cost is the same after ${n} weeks: ${cash(J1 + w1 * n)} at each gym.`,
    { marks: 3 },
  );
}

function savings(rng: Rng): TemplateOutput {
  const [p1, p2] = rng.sample(NAMES, 2) as [string, string];
  const n = rng.int(3, 20);
  const gap = rng.int(2, 8);
  const b = rng.int(5, 20);
  const a = b + gap;
  const X = rng.int(1, 10) * 5;
  const Y = X + gap * n;
  return wordProblem(
    `${p1} has ${cash(X)} and saves ${cash(a)} each week. ${p2} has ${cash(Y)} and saves ${cash(b)} each week. After how many weeks will they have the same amount?`,
    'w',
    'the number of weeks',
    `${X} + ${a}w = ${Y} + ${b}w`,
    [
      `Subtract $${b}w$ from both sides: $${X} + ${gap}w = ${Y}$`,
      `Subtract ${X}: $${gap}w = ${Y - X}$`,
      `Divide by ${gap}: $w = ${n}$`,
    ],
    n,
    `After ${n} weeks they each have ${cash(X + a * n)}.`,
    { marks: 3 },
  );
}

function fractionOfNumber(rng: Rng): TemplateOutput {
  const name = rng.pick(NAMES);
  const k = rng.pick([2, 3]);
  const m = rng.int(3, 15);
  const n = k * m;
  const total = (k - 1) * m; // p + q
  const p = rng.int(1, total - 1);
  const q = total - p;
  const part = k === 2 ? 'halves a number' : 'finds one third of a number';
  return wordProblem(
    `${name} ${part} and adds ${p}. The result is the same as subtracting ${q} from the number. What is the number?`,
    'n',
    'the number',
    `\\dfrac{n}{${k}} + ${p} = n - ${q}`,
    [
      `Multiply both sides by ${k}: $n + ${k * p} = ${k}n - ${k * q}$`,
      `Subtract $n$ from both sides: $${k * p} = ${k - 1 === 1 ? '' : k - 1}n - ${k * q}$`,
      `Add ${k * q}: $${k * p + k * q} = ${k - 1 === 1 ? '' : k - 1}n$`,
      k === 2 ? `So $n = ${n}$` : `Divide by 2: $n = ${n}$`,
    ],
    n,
    `The number is ${n}. Check: $${n} \\div ${k} + ${p} = ${m + p}$ and $${n} - ${q} = ${n - q}$ ✓`,
    { marks: 3 },
  );
}

export const formingEquations: QuestionTemplate = {
  id: 'm9.alg.equations.forming',
  topicId: 'm9.alg.equations',
  title: 'Form and solve equations from word problems',
  difficulties: [2, 3, 4, 5],
  generate({ rng, difficulty }) {
    if (difficulty === 2) return thinkOfNumberMcq(rng);
    if (difficulty === 3) return rng.pick([shopping, membership, divideThinkOfNumber, sausageSizzle] as const)(rng);
    if (difficulty === 4) return rng.pick([rectanglePerimeter, consecutive, triangleAngles, ages] as const)(rng);
    return rng.pick([equalPlans, savings, fractionOfNumber] as const)(rng);
  },
};

export const checkSolution: QuestionTemplate = {
  id: 'm9.alg.equations.check-solution',
  topicId: 'm9.alg.equations',
  title: 'Check a solution by substitution',
  difficulties: [1, 2],
  generate({ rng, difficulty }) {
    const v = rng.pick(['x', 'n', 'a', 'm', 'y'] as const);
    if (difficulty === 1) {
      const a = rng.int(2, 6);
      const x = rng.int(1, 10);
      const b = rng.int(1, 12);
      const c = a * x + b;
      const check = (k: number) => `$${a} \\times ${texSigned(k)} + ${b} = ${tex(a * k + b)}$, not ${c}.`;
      const candidates = [(c + b) / a, c - b, c / a, x + 1, x - 1, x + 2].filter(
        (k) => Number.isInteger(k) && k !== x && k >= 0,
      );
      const mcq = mcqFields(
        rng,
        { text: `$${v} = ${x}$` },
        candidates.map((k) => ({ text: `$${v} = ${k}$`, feedback: `Substitute to check: ${check(k)}` })),
      );
      return {
        type: 'mcq',
        prompt: `Which value of $${v}$ is the solution of $${a}${v} + ${b} = ${c}$?`,
        ...mcq,
        calculator: 'not-allowed',
        hints: [`Substitute each option for $${v}$ and see which one makes the left side equal ${c}.`],
        solution: [
          `Substitute $${v} = ${x}$: $${a} \\times ${x} + ${b} = ${a * x} + ${b} = ${c}$ ✓`,
          `Or solve it: subtract ${b} to get $${a}${v} = ${c - b}$, then divide by ${a} to get $${v} = ${x}$.`,
        ].join('\n\n'),
      };
    }
    // difficulty 2: is the claimed value a solution of ax + b = cx + d?
    const x0 = rng.int(-5, 9);
    const a = rng.int(2, 9);
    let c = rng.int(-4, 8);
    if (c === a) c = a - 1;
    const b = rng.nonZeroInt(-12, 12);
    const d = a * x0 + b - c * x0;
    const isRight = rng.chance(0.5);
    const k = isRight ? x0 : x0 + rng.pick([-2, -1, 1, 2]);
    const name = rng.pick(NAMES);
    const left = poly([t(a, v), t(b)]);
    const right = poly([t(c, v), t(d)]);
    const L = a * k + b;
    const R = c * k + d;
    const side = (coef: number, konst: number, value: number) => {
      if (coef === 0) return `$${tex(value)}$ (there is no $${v}$ term)`;
      const prod = `${tex(coef)} \\times ${texSigned(k)}`;
      const expr = konst === 0 ? prod : `${prod} ${konst < 0 ? '-' : '+'} ${Math.abs(konst)}`;
      return `$${expr} = ${tex(value)}$`;
    };
    return {
      type: 'mcq',
      prompt: `${name} says that $${v} = ${k}$ is the solution of $${left} = ${right}$. Is ${name} correct?`,
      options: [
        { id: 'yes', text: `Yes, $${v} = ${k}$ is the solution` },
        { id: 'no', text: `No, $${v} = ${k}$ is not the solution` },
      ],
      correct: isRight ? 'yes' : 'no',
      shuffle: false,
      calculator: 'not-allowed',
      hints: [
        `Substitute $${v} = ${k}$ into the left side and the right side separately.`,
        'If both sides give the same number, it is the solution.',
      ],
      solution: [
        `Left side: ${side(a, b, L)}`,
        `Right side: ${side(c, d, R)}`,
        isRight
          ? `Both sides equal $${tex(L)}$, so ${name} is **correct**.`
          : `$${tex(L)} \\ne ${tex(R)}$, so ${name} is **not** correct. (The actual solution is $${v} = ${x0}$.)`,
      ].join('\n\n'),
    };
  },
};
