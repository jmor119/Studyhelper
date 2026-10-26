import type { Rng } from '../../../../rng';
import { gcd, NAMES, num, tex } from '../../../format';
import type { QuestionTemplate, TemplateOutput } from '../../../types';
import { cap, cash, type Choice, mcqFields, plural, texMoney } from './money-helpers';

// m7.num.multiply-divide — multiply whole numbers, divide by one- or two-digit divisors, write
// remainders as whole numbers, fractions or decimals, and estimate to check. No calculators.
// "256 r 3" answers are asked as two cloze blanks (quotient and remainder), because the numeric
// marker reads "r" as a unit.

/** Splits a whole number into its non-zero place-value parts: 347 → [300, 40, 7]. */
function placeParts(n: number): number[] {
  const parts: number[] = [];
  let p = 1;
  while (p * 10 <= n) p *= 10;
  let rest = n;
  for (; p >= 1; p /= 10) {
    const part = Math.floor(rest / p) * p;
    if (part) parts.push(part);
    rest -= part;
  }
  return parts;
}

/** Leading-digit estimate: one-digit numbers stay, others round to their biggest place (47 → 50, 347 → 300). */
function roundLead(n: number): number {
  if (n < 10) return n;
  const p = n >= 1000 ? 1000 : n >= 100 ? 100 : 10;
  return Math.round(n / p) * p;
}

/** A whole number in [lo, hi] whose last digit is not 0 (and optionally not 5). */
function notRound(rng: Rng, lo: number, hi: number, avoid5 = false): number {
  for (;;) {
    const n = rng.int(lo, hi);
    if (n % 10 !== 0 && (!avoid5 || n % 10 !== 5)) return n;
  }
}

/** Worked partitioning for a × b, splitting b into place-value parts. */
function multiplySolution(a: number, b: number): string {
  const parts = placeParts(b);
  if (parts.length === 1) return `$${tex(a)} \\times ${tex(b)} = ${tex(a * b)}$`;
  const products = parts.map((p) => a * p);
  return [
    `Split ${num(b)} into $${parts.map((p) => tex(p)).join(' + ')}$ and multiply each part by ${num(a)}:`,
    `$${tex(a)} \\times ${tex(b)} = ${parts.map((p) => `${tex(a)} \\times ${tex(p)}`).join(' + ')}$`,
    `$= ${products.map((p) => tex(p)).join(' + ')}$`,
    `$= ${tex(a * b)}$`,
  ].join('\n\n');
}

export const multiply: QuestionTemplate = {
  id: 'm7.num.multiply-divide.multiply',
  topicId: 'm7.num.multiply-divide',
  title: 'Multiply whole numbers (written and mental methods)',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    let a: number;
    let b: number;
    let marks = 1;
    if (difficulty === 1) {
      if (rng.chance(0.35)) {
        const p = rng.int(2, 9);
        const q = rng.int(2, 9);
        const big = rng.chance(0.3) ? 100 : 10;
        a = p * 10;
        b = q * big;
        return {
          type: 'numeric',
          prompt: `Work out $${tex(a)} \\times ${tex(b)}$ in your head.`,
          answer: a * b,
          calculator: 'not-allowed',
          hints: [`Use the fact $${p} \\times ${q}$ first.`, 'Then count how many zeros you took off, and put them back on.'],
          solution: `$${p} \\times ${q} = ${p * q}$\n\n$${tex(a)} \\times ${tex(b)} = ${p} \\times ${q} \\times 10 \\times ${big}$\n\n$= ${p * q} \\times ${tex(10 * big)} = ${tex(a * b)}$`,
        };
      }
      a = notRound(rng, 12, 99);
      b = rng.int(3, 9);
      // Partition the two-digit number: 47 × 6 = 40 × 6 + 7 × 6.
      const [t, o] = placeParts(a) as [number, number];
      return {
        type: 'numeric',
        prompt: `Work out $${a} \\times ${b}$.`,
        answer: a * b,
        calculator: 'not-allowed',
        hints: [`Split ${a} into ${t} and ${o}.`, `Multiply each part by ${b}, then add the answers.`],
        solution: `$${a} \\times ${b} = ${t} \\times ${b} + ${o} \\times ${b}$\n\n$= ${t * b} + ${o * b}$\n\n$= ${tex(a * b)}$`,
      };
    }
    if (difficulty === 2) {
      if (rng.chance(0.5)) {
        a = notRound(rng, 102, 999);
        b = rng.int(3, 9);
      } else {
        a = notRound(rng, 13, 99);
        b = notRound(rng, 12, 49);
      }
    } else if (rng.chance(0.65)) {
      a = notRound(rng, 123, 899);
      b = notRound(rng, 12, 49);
      marks = 2;
    } else {
      a = notRound(rng, 1012, 9876);
      b = rng.int(3, 9);
    }
    const est = roundLead(a) * roundLead(b);
    const bParts = placeParts(b);
    return {
      type: 'numeric',
      prompt: `Work out $${tex(a)} \\times ${tex(b)}$.`,
      answer: a * b,
      ...(marks > 1 && { marks }),
      calculator: 'not-allowed',
      hints: [
        `Estimate first: $${tex(roundLead(a))} \\times ${tex(roundLead(b))} = ${tex(est)}$, so the answer should be near that.`,
        bParts.length > 1
          ? `Split ${num(b)} into ${bParts.map((p) => num(p)).join(' and ')}. Multiply ${num(a)} by each part, then add.`
          : `Split ${num(a)} into ${placeParts(a)
              .map((p) => num(p))
              .join(', ')}. Multiply each part by ${b}, then add.`,
      ],
      solution:
        bParts.length > 1
          ? `${multiplySolution(a, b)}\n\nCheck: the estimate was ${num(est)}, so ${num(a * b)} is a sensible size.`
          : `Split ${num(a)} into place-value parts and multiply each by ${b}:\n\n$${placeParts(a)
              .map((p) => `${tex(p)} \\times ${b}`)
              .join(' + ')}$\n\n$= ${placeParts(a)
              .map((p) => tex(p * b))
              .join(' + ')}$\n\n$= ${tex(a * b)}$\n\nCheck: the estimate was ${num(est)}, so ${num(a * b)} is a sensible size.`,
    };
  },
};

/** Chunking explanation for N ÷ d = q (exact): split q into place-value parts. */
function chunkSolution(N: number, d: number, q: number): string {
  const parts = placeParts(q);
  if (parts.length === 1) return `$${tex(d)} \\times ${tex(q)} = ${tex(N)}$, so $${tex(N)} \\div ${tex(d)} = ${tex(q)}$.`;
  return [
    `Split ${num(N)} into chunks that ${d} divides into easily:`,
    `$${tex(N)} = ${parts.map((p) => tex(p * d)).join(' + ')}$`,
    `$${parts.map((p) => `${tex(p * d)} \\div ${d}`).join(' + ')} = ${parts.map((p) => tex(p)).join(' + ')} = ${tex(q)}$`,
    `Check: $${tex(q)} \\times ${d} = ${tex(N)}$ ✓`,
  ].join('\n\n');
}

/** Remainder explanation: biggest multiple of d that fits, then what is left. */
function remainderLine(N: number, d: number, q: number, rem: number): string {
  return `$${tex(d)} \\times ${tex(q)} = ${tex(q * d)}$, and $${tex(N)} - ${tex(q * d)} = ${rem}$. So $${tex(N)} \\div ${tex(d)} = ${tex(q)}$ remainder ${rem}.`;
}

export const divide: QuestionTemplate = {
  id: 'm7.num.multiply-divide.divide',
  topicId: 'm7.num.multiply-divide',
  title: 'Divide by one- or two-digit numbers, with remainders as whole numbers, fractions or decimals',
  difficulties: [1, 2, 3, 4],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      const d = rng.int(2, 9);
      const q = rng.int(12, Math.floor(999 / d));
      const N = q * d;
      return {
        type: 'numeric',
        prompt: `Work out $${tex(N)} \\div ${d}$.`,
        answer: q,
        calculator: 'not-allowed',
        hints: [`Think: how many lots of ${d} make ${num(N)}?`, `Split ${num(N)} into parts that are easy to divide by ${d}.`],
        solution: chunkSolution(N, d, q),
      };
    }
    if (difficulty === 2) {
      const d = rng.int(3, 9);
      const q = rng.int(12, 199);
      const rem = rng.int(1, d - 1);
      const N = q * d + rem;
      return {
        type: 'cloze',
        prompt: `Work out $${tex(N)} \\div ${d}$. Write the answer as a whole number and a remainder.\n\n$${tex(N)} \\div ${d} =$ [[q]] remainder [[r]]`,
        blanks: [
          { id: 'q', accepted: [String(q)] },
          { id: 'r', accepted: [String(rem)] },
        ],
        calculator: 'not-allowed',
        hints: [`How many whole lots of ${d} fit into ${num(N)}?`, `The remainder is what is left over. It must be smaller than ${d}.`],
        solution: remainderLine(N, d, q, rem),
      };
    }
    if (difficulty === 3) {
      if (rng.chance(0.5)) {
        const d = rng.int(3, 9);
        const q = rng.int(11, 150);
        const rem = rng.int(1, d - 1);
        const N = q * d + rem;
        const g = gcd(rem, d);
        return {
          type: 'numeric',
          prompt: `Work out $${tex(N)} \\div ${d}$. Give your answer as a mixed number in simplest form.`,
          answer: N / d,
          form: 'mixed',
          calculator: 'not-allowed',
          hints: ['Find the whole number part and the remainder first.', `The remainder goes on top of a fraction with ${d} on the bottom. Then simplify if you can.`],
          solution: `${remainderLine(N, d, q, rem)}\n\nThe remainder ${rem} is shared between ${d}, so it is $\\frac{${rem}}{${d}}$${g > 1 ? ` $= \\frac{${rem / g}}{${d / g}}$` : ''}.\n\n$${tex(N)} \\div ${d} = ${tex(q)}\\frac{${rem / g}}{${d / g}}$`,
        };
      }
      const d = rng.pick([2, 4, 5]);
      const q = rng.int(21, 299);
      const rem = rng.int(1, d - 1);
      const N = q * d + rem;
      const dec = rem / d;
      return {
        type: 'numeric',
        prompt: `Work out $${tex(N)} \\div ${d}$. Give your answer as a decimal.`,
        answer: N / d,
        form: 'decimal',
        calculator: 'not-allowed',
        hints: ['Find the whole number part and the remainder first.', `Write the remainder as a fraction of ${d}, then change that fraction to a decimal.`],
        solution: `${remainderLine(N, d, q, rem)}\n\nThe remainder as a fraction is $\\frac{${rem}}{${d}}$, and $\\frac{${rem}}{${d}} = ${tex(dec)}$.\n\nSo $${tex(N)} \\div ${d} = ${tex(q)} + ${tex(dec)} = ${tex(N / d)}$`,
      };
    }
    // difficulty 4: two-digit divisors
    const kind = rng.pick(['exact', 'exact', 'mixed', 'decimal'] as const);
    if (kind === 'exact') {
      const d = rng.int(11, 25);
      const q = notRound(rng, 12, 60);
      const N = q * d;
      const tens = Math.floor(q / 10) * 10;
      const ones = q - tens;
      return {
        type: 'numeric',
        prompt: `Work out $${tex(N)} \\div ${d}$.`,
        answer: q,
        marks: 2,
        calculator: 'not-allowed',
        hints: [`Write out some easy multiples of ${d}: $${d} \\times 10 = ${d * 10}$, $${d} \\times 20 = ${d * 20}$, …`, `Take away the biggest of those multiples that fits, then work out how many ${d}s are in what is left.`],
        solution: `$${d} \\times ${tens} = ${tex(d * tens)}$, and $${tex(N)} - ${tex(d * tens)} = ${tex(N - d * tens)}$.\n\n$${tex(N - d * tens)} \\div ${d} = ${ones}$ (because $${d} \\times ${ones} = ${tex(d * ones)}$).\n\nSo $${tex(N)} \\div ${d} = ${tens} + ${ones} = ${q}$.\n\nCheck: $${q} \\times ${d} = ${tex(N)}$ ✓`,
      };
    }
    if (kind === 'mixed') {
      const d = rng.int(12, 25);
      const q = rng.int(12, 40);
      const rem = rng.int(1, d - 1);
      const N = q * d + rem;
      const g = gcd(rem, d);
      return {
        type: 'numeric',
        prompt: `Work out $${tex(N)} \\div ${d}$. Give your answer as a mixed number in simplest form.`,
        answer: N / d,
        form: 'mixed',
        marks: 2,
        calculator: 'not-allowed',
        hints: [`Use multiples of ${d} to find the whole number part: $${d} \\times 10 = ${d * 10}$, $${d} \\times 20 = ${d * 20}$, …`, 'The remainder goes on top of the fraction, and the divisor goes on the bottom. Then simplify.'],
        solution: `${remainderLine(N, d, q, rem)}\n\nThe fraction part is $\\frac{${rem}}{${d}}$${g > 1 ? ` $= \\frac{${rem / g}}{${d / g}}$` : ''}.\n\n$${tex(N)} \\div ${d} = ${tex(q)}\\frac{${rem / g}}{${d / g}}$`,
      };
    }
    const d = rng.pick([20, 25, 50]);
    const q = rng.int(4, 39);
    const rem = rng.int(1, d - 1);
    const N = q * d + rem;
    const dec = rem / d;
    return {
      type: 'numeric',
      prompt: `Work out $${tex(N)} \\div ${d}$. Give your answer as a decimal.`,
      answer: N / d,
      form: 'decimal',
      marks: 2,
      calculator: 'not-allowed',
      hints: ['Find the whole number part and the remainder first.', `Make the fraction $\\frac{\\text{remainder}}{${d}}$ into hundredths: multiply the top and bottom by ${100 / d}.`],
      solution: `${remainderLine(N, d, q, rem)}\n\n$\\frac{${rem}}{${d}} = \\frac{${rem * (100 / d)}}{100} = ${tex(dec)}$\n\nSo $${tex(N)} \\div ${d} = ${tex(q)} + ${tex(dec)} = ${tex(N / d)}$`,
    };
  },
};

// ---------------------------------------------------------------------------
// Remainders in context: round up, round down, the leftover, or share it as a fraction or decimal.

interface Ctx {
  /** Question text builder. */
  text: (N: number, k: number, name: string) => string;
  unit: string;
  /** Contexts that only make sense with small (one-digit) or large (two-digit) group sizes. */
  size?: 'small' | 'large';
}

const ROUND_UP: Ctx[] = [
  { text: (N, k) => `${N} students are going on a school trip. Each van can carry ${k} students. How many vans are needed?`, unit: 'vans', size: 'small' },
  { text: (N, k) => `${N} students are going on a school trip. Each bus can carry ${k} students. How many buses are needed?`, unit: 'buses', size: 'large' },
  { text: (N, k) => `${N} people are coming to a whānau day at the marae. Each table seats ${k} people. How many tables are needed so everyone can sit down?`, unit: 'tables' },
  { text: (N, k) => `${N} parents are coming to the school production. Each row has ${k} chairs. How many rows are needed so every parent has a seat?`, unit: 'rows' },
  { text: (N, k) => `${N} students are going to camp. Each tent sleeps ${k} students. How many tents are needed?`, unit: 'tents', size: 'small' },
];
const ROUND_DOWN: Ctx[] = [
  { text: (N, k) => `A bakery makes ${N} muffins and packs them into boxes of ${k}. How many boxes can be completely filled?`, unit: 'boxes' },
  { text: (N, k) => `${N} students sign up for touch rugby. Each team needs exactly ${k} players. How many full teams can be made?`, unit: 'teams', size: 'small' },
  { text: (N, k, n) => `${n} has a ${N} cm length of ribbon and cuts it into pieces ${k} cm long. How many whole pieces can ${n} cut?`, unit: 'pieces' },
  { text: (N, k, n) => `${n} has ${N} stickers and sticks ${k} on each page of a book. How many pages can be completely filled?`, unit: 'pages' },
];
const LEFTOVER: Ctx[] = [
  { text: (N, k) => `A teacher shares ${N} cards equally between ${k} groups. Each group gets as many as possible. How many cards are left over?`, unit: 'cards' },
  { text: (N, k) => `${N} kiwifruit are packed into trays of ${k}. Only full trays can be sold. How many kiwifruit are left over?`, unit: 'kiwifruit' },
  { text: (N, k, n) => `${n} has ${N} beads and makes bracelets with ${k} beads each. How many beads are left over?`, unit: 'beads' },
];

export const remainderContext: QuestionTemplate = {
  id: 'm7.num.multiply-divide.remainder-context',
  topicId: 'm7.num.multiply-divide',
  title: 'Choose what to do with a remainder in a word problem',
  difficulties: [2, 3, 4, 5],
  generate({ rng, difficulty }) {
    const name = rng.pick(NAMES);
    if (difficulty === 5) return twoStepProblem(rng, name);
    if (difficulty === 3 && rng.chance(0.5)) {
      if (rng.chance(0.5)) {
        const k = rng.pick([2, 4, 5]);
        const N = k * rng.int(3, 15) + rng.int(1, k - 1);
        const each = N / k;
        const friends = plural(k, 'friend', 'friends');
        return {
          type: 'numeric',
          prompt: `${name} and some friends earn ${cash(N)} washing cars. They share it equally between ${friends} (including ${name}). How much does each person get?`,
          answer: each,
          units: '$',
          calculator: 'not-allowed',
          hints: [`Money can be split into cents, so the remainder doesn't have to be left over.`, `Work out ${N} ÷ ${k}, and write the remainder as a decimal.`],
          solution: `$${N} \\div ${k} = ${Math.floor(each)}$ remainder ${N % k}.\n\nMoney can be split into cents. The leftover ${cash(N % k)} shared between ${k} is $\\frac{${N % k}}{${k}}$ of a dollar, which is ${Math.round((each - Math.floor(each)) * 100)} cents.\n\nEach person gets $${texMoney(each)}$, which is **${cash(each)}**.`,
        };
      }
      const k = rng.int(3, 8);
      let N = rng.int(k + 1, 4 * k);
      if (N % k === 0) N += 1;
      const g = gcd(N % k, k);
      return {
        type: 'numeric',
        prompt: `${N} pizzas are shared equally between ${k} people. How many pizzas does each person get? Give your answer as a mixed number.`,
        answer: N / k,
        form: 'mixed',
        calculator: 'not-allowed',
        hints: ['Pizza can be cut into pieces, so the remainder can be shared too.', `Work out ${N} ÷ ${k}, and write the remainder as a fraction.`],
        solution: `$${N} \\div ${k} = ${Math.floor(N / k)}$ remainder ${N % k}.\n\nThe ${N % k} leftover pizza${N % k === 1 ? ' is' : 's are'} shared between ${k} people, so each person gets $\\frac{${N % k}}{${k}}$${g > 1 ? ` $= \\frac{${(N % k) / g}}{${k / g}}$` : ''} more.\n\nEach person gets $${Math.floor(N / k)}\\frac{${(N % k) / g}}{${k / g}}$ pizzas.`,
      };
    }
    const kind = rng.pick(['up', 'down', 'left'] as const);
    const k = difficulty === 4 ? rng.int(11, 30) : rng.int(3, 9);
    const q = difficulty === 2 ? rng.int(4, 12) : difficulty === 3 ? rng.int(12, 40) : rng.int(5, 30);
    const rem = rng.int(1, k - 1);
    const N = q * k + rem;
    const size = difficulty === 4 ? 'large' : 'small';
    const ctx = rng.pick((kind === 'up' ? ROUND_UP : kind === 'down' ? ROUND_DOWN : LEFTOVER).filter((c) => !c.size || c.size === size));
    const answer = kind === 'up' ? q + 1 : kind === 'down' ? q : rem;
    const why =
      kind === 'up'
        ? `${q} ${ctx.unit} would only hold ${num(q * k)}, leaving ${rem} out, so you need one more. The answer is **${q + 1}** ${ctx.unit}.`
        : kind === 'down'
          ? `The ${rem} left over ${rem === 1 ? 'is' : 'are'} not enough for another one, so the answer is **${q}** ${ctx.unit}.`
          : `The question asks for the remainder: **${rem}** ${ctx.unit} are left over.`;
    return {
      type: 'numeric',
      prompt: ctx.text(N, k, name),
      answer,
      form: 'integer',
      ...(difficulty === 4 && { marks: 2 }),
      calculator: 'not-allowed',
      hints: [
        `Work out ${num(N)} ÷ ${k}. Find the whole number part and the remainder.`,
        kind === 'up' ? 'Can the leftover ones be left behind?' : kind === 'down' ? 'Is the leftover part enough to make another full one?' : 'Which number does the question ask for: the quotient or the remainder?',
      ],
      solution: `$${tex(N)} \\div ${k} = ${q}$ remainder ${rem} (because $${k} \\times ${q} = ${tex(q * k)}$ and $${tex(N)} - ${tex(q * k)} = ${rem}$).\n\n${why}`,
    };
  },
};

function twoStepProblem(rng: Rng, name: string): TemplateOutput {
  const kind = rng.pick(['beds', 'packs', 'juice'] as const);
  if (kind === 'beds') {
    const k = rng.pick([6, 8, 9, 10, 12]);
    const S = rng.int(50, 140);
    const T = rng.int(4, 12);
    const total = S + T;
    const cabins = Math.ceil(total / k);
    const empty = cabins * k - total;
    if (empty === 0) return twoStepProblem(rng, name);
    return {
      type: 'numeric',
      prompt: `${S} students and ${T} adults are going on a school camp. Each cabin has ${k} beds. They use as few cabins as possible. How many beds will be empty?`,
      answer: empty,
      form: 'integer',
      marks: 2,
      calculator: 'not-allowed',
      hints: ['Find the total number of people first.', 'Work out how many cabins are needed. Remember that a part-full cabin still counts.'],
      solution: `People: $${S} + ${T} = ${total}$.\n\nCabins: $${total} \\div ${k} = ${Math.floor(total / k)}$ remainder ${total % k}, so they need ${cabins} cabins (one more for the ${plural(total % k, 'person', 'people')} left over).\n\nBeds: $${cabins} \\times ${k} = ${cabins * k}$, so $${cabins * k} - ${total} = ${empty}$ beds are empty.`,
    };
  }
  if (kind === 'packs') {
    const k = rng.pick([8, 10, 12, 15, 20, 24]);
    const N = rng.int(3, 12) * k + rng.int(1, k - 1);
    const price = rng.int(6, 18) + rng.pick([0, 0.5]);
    const packs = Math.ceil(N / k);
    const cost = packs * price;
    return {
      type: 'numeric',
      prompt: `The school needs ${N} sausages for a sausage sizzle. Sausages come in packs of ${k}, and each pack costs ${cash(price)}. What is the cheapest cost to buy enough sausages?`,
      answer: cost,
      units: '$',
      marks: 2,
      calculator: 'not-allowed',
      hints: ['Work out how many packs are needed. You can only buy whole packs.', 'Then multiply the number of packs by the price of one pack.'],
      solution: `$${N} \\div ${k} = ${Math.floor(N / k)}$ remainder ${N % k}, so ${Math.floor(N / k)} packs is not quite enough. They need **${packs}** packs.\n\nCost: $${packs} \\times ${texMoney(price)} = ${texMoney(cost)}$, which is **${cash(cost)}**.`,
    };
  }
  const classes = [rng.int(24, 32), rng.int(24, 32), rng.int(24, 32)];
  const total = classes[0]! + classes[1]! + classes[2]!;
  const k = rng.pick([6, 8, 10, 12]);
  if (total % k === 0) classes[0] = classes[0]! + 1;
  const t2 = classes[0]! + classes[1]! + classes[2]!;
  const packs = Math.ceil(t2 / k);
  const spare = packs * k - t2;
  return {
    type: 'numeric',
    prompt: `Three Year 7 classes have ${classes[0]}, ${classes[1]} and ${classes[2]} students. ${name} is buying juice boxes so every student gets one. Juice boxes come in packs of ${k}. After everyone gets one, how many juice boxes will be spare?`,
    answer: spare,
    form: 'integer',
    marks: 2,
    calculator: 'not-allowed',
    hints: ['Add up the students first.', `Work out how many packs of ${k} are needed. A part pack isn't possible.`],
    solution: `Students: $${classes[0]} + ${classes[1]} + ${classes[2]} = ${t2}$.\n\nPacks: $${t2} \\div ${k} = ${Math.floor(t2 / k)}$ remainder ${t2 % k}, so ${name} needs ${packs} packs.\n\nJuice boxes: $${packs} \\times ${k} = ${packs * k}$, so $${packs * k} - ${t2} = ${spare}$ are spare.`,
  };
}

// ---------------------------------------------------------------------------
// Estimation to check answers.

export const estimate: QuestionTemplate = {
  id: 'm7.num.multiply-divide.estimate',
  topicId: 'm7.num.multiply-divide',
  title: 'Estimate products to check answers',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    const name = rng.pick(NAMES);
    if (difficulty === 1 || difficulty === 2) {
      const a = notRound(rng, 12, 98, true);
      const b = difficulty === 1 ? rng.int(3, 9) : notRound(rng, 12, 98, true);
      const ra = roundLead(a);
      const rb = difficulty === 1 ? b : roundLead(b);
      const E = ra * rb;
      const otherA = ra > a ? ra - 10 : ra + 10;
      const wrongWay = otherA * rb;
      const fields = mcqFields(rng, { text: `$${tex(E)}$` }, [
        { text: `$${tex(E / 10)}$`, feedback: `Check the place value. ${a} is about ${ra}, so the answer is about $${tex(ra)} \\times ${tex(rb)}$.` },
        { text: `$${tex(E * 10)}$`, feedback: `That has an extra zero. $${tex(ra)} \\times ${tex(rb)} = ${tex(E)}$.` },
        { text: `$${tex(wrongWay)}$`, feedback: `${a} is closer to ${ra} than to ${otherA}, so round it to ${ra}.` },
      ]);
      return {
        type: 'mcq',
        prompt:
          difficulty === 1
            ? `Which is the best estimate for $${a} \\times ${b}$?`
            : `Round both numbers to the nearest 10 to estimate $${a} \\times ${b}$. Which estimate do you get?`,
        ...fields,
        calculator: 'not-allowed',
        hints: [difficulty === 1 ? `Round ${a} to the nearest 10.` : 'Round both numbers to the nearest 10.', 'Then multiply the rounded numbers.'],
        solution: `${difficulty === 1 ? `Round ${a} to ${ra}` : `Round ${a} to ${ra} and ${b} to ${rb}`}:\n\n$${tex(ra)} \\times ${tex(rb)} = ${tex(E)}$\n\n(The exact answer is $${tex(a * b)}$, ${Math.abs(E - a * b) <= 0.2 * a * b ? `which is close to ${num(E)}` : 'so the estimate is the right size'}.)`,
      };
    }
    // difficulty 3: is a given answer reasonable? (Both numbers are at least 34, so the product has 4 digits.)
    const a = notRound(rng, 34, 98, true);
    const b = notRound(rng, 34, 98, true);
    const ra = roundLead(a);
    const rb = roundLead(b);
    const E = ra * rb;
    const exact = a * b;
    const slip = rng.pick(['right', 'times10', 'div10'] as const);
    const W = slip === 'right' ? exact : slip === 'times10' ? exact * 10 : Math.floor(exact / 10);
    const lastDigit = (W % 10) === ((a % 10) * (b % 10)) % 10;
    const yes: Choice = { text: `Yes. $${tex(ra)} \\times ${tex(rb)} = ${tex(E)}$, and ${num(W)} is close to that.` };
    const no: Choice = { text: `No. $${tex(ra)} \\times ${tex(rb)} = ${tex(E)}$, so the answer should be close to ${num(E)}.` };
    const digitChoice: Choice = {
      text: `Yes, because the last digit is the same as the last digit of $${a % 10} \\times ${b % 10}$.`,
      feedback: 'The last digit can match even when the place value is wrong. An estimate checks the size of the answer.',
    };
    const fourDigits: Choice = {
      text: 'No. Multiplying two 2-digit numbers always gives a 3-digit answer.',
      feedback: `Not true: $${a} \\times ${b} = ${tex(exact)}$ has ${String(exact).length} digits. Use an estimate instead.`,
    };
    const correct = slip === 'right' ? yes : no;
    const wrongMain: Choice =
      slip === 'right'
        ? { ...no, feedback: `${num(W)} is close to the estimate of ${num(E)}, so the answer is reasonable.` }
        : { ...yes, feedback: `${num(W)} is about 10 times ${slip === 'times10' ? 'bigger' : 'smaller'} than the estimate ${num(E)}, so it is not close.` };
    const rangeChoice: Choice = {
      text: `Yes. Both numbers are less than 100, so any answer under ${num(10000)} is fine.`,
      feedback: 'That range is far too wide to be a useful check. Round each number and multiply.',
    };
    const distractors = [wrongMain, fourDigits, lastDigit ? digitChoice : rangeChoice];
    const fields = mcqFields(rng, correct, distractors);
    return {
      type: 'mcq',
      prompt: `${name} worked out $${a} \\times ${b}$ and got ${num(W)}. Use an estimate to check. Is ${name}'s answer reasonable?`,
      ...fields,
      calculator: 'not-allowed',
      hints: ['Round each number to the nearest 10.', `Multiply the rounded numbers and compare with ${num(W)}.`],
      solution: `Estimate: $${a} \\approx ${ra}$ and $${b} \\approx ${rb}$, so $${a} \\times ${b} \\approx ${tex(ra)} \\times ${tex(rb)} = ${tex(E)}$.\n\nThe exact answer is $${tex(exact)}$. ${slip === 'right' ? `${cap(name)}'s answer is close to the estimate, so it is reasonable.` : `${name}'s answer of ${num(W)} is about 10 times too ${slip === 'times10' ? 'big' : 'small'}, so it is not reasonable. It looks like a place-value slip.`}`,
    };
  },
};

export const templates: QuestionTemplate[] = [multiply, divide, remainderContext, estimate];
