import type { QuestionTemplate } from '../../../types';
import type { Rng } from '../../../../rng';
import { NAMES, PLACES, gcd, num, tex } from '../../../format';
import { cash, shortDivisionSteps, wholeAccepted } from './whole-numbers-helpers';

// m6.num.division templates: dividing by a one-digit number, remainders (as a whole number,
// a fraction or a decimal), unit fractions as division, and deciding what to do with the
// remainder in a word problem. Year 6 divides by one-digit numbers only.
// "256 r 3" answers are cloze questions with separate quotient and remainder blanks.

/** A mixed number in KaTeX: 5, 1, 6 → "5\frac{1}{6}". */
const mixedTex = (w: number, r: number, d: number) => `${w}\\frac{${r}}{${d}}`;

/** A remainder in 1..d−1 that shares no factor with d (so r/d is already in simplest form). */
function coprimeRemainder(rng: Rng, d: number): number {
  const options: number[] = [];
  for (let r = 1; r < d; r++) if (gcd(r, d) === 1) options.push(r);
  return rng.pick(options);
}

/** n = q·d + r with n inside [lo, hi]. */
function dividendIn(rng: Rng, d: number, r: number, lo: number, hi: number): { q: number; n: number } {
  const q = rng.int(Math.ceil((lo - r) / d), Math.floor((hi - r) / d));
  return { q, n: q * d + r };
}

/** "$1{,}283 \div 5 = 256$ r 3" as a line of working, with a multiplication check. */
function divisionWithCheck(n: number, d: number): { lines: string[]; q: number; r: number } {
  const { lines, q, r } = shortDivisionSteps(n, d);
  const result = `So $${tex(n)} \\div ${d} = ${tex(q)}$${r ? ` remainder ${r}` : ''}.`;
  const check = r
    ? `Check: $${tex(q)} \\times ${d} + ${r} = ${tex(q * d)} + ${r} = ${tex(n)}$ ✓`
    : `Check: $${tex(q)} \\times ${d} = ${tex(n)}$ ✓`;
  return { lines: [...lines, result, check], q, r };
}

export const facts: QuestionTemplate = {
  id: 'm6.num.division.facts',
  topicId: 'm6.num.division',
  title: 'Division facts and short division with no remainder',
  difficulties: [1, 2],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      if (rng.chance(0.5)) {
        const d = rng.int(2, 12);
        const q = rng.int(2, 12);
        const n = d * q;
        return {
          type: 'numeric',
          prompt: `Work out $${n} \\div ${d}$.`,
          answer: q,
          form: 'integer',
          calculator: 'not-allowed',
          hints: [`Think: ${d} times what number makes ${n}?`, `Use your ${d} times table.`],
          solution: `$${d} \\times ${q} = ${n}$, so $${n} \\div ${d} = ${q}$.\n\nDividing undoes multiplying.`,
        };
      }
      const d = rng.int(2, 9);
      const f = rng.int(2, 9);
      const z = rng.pick([10, 10, 100] as const);
      const n = d * f * z;
      const word = z === 10 ? 'tens' : 'hundreds';
      return {
        type: 'numeric',
        prompt: `Work out $${tex(n)} \\div ${d}$.`,
        answer: f * z,
        form: 'integer',
        calculator: 'not-allowed',
        hints: [`${num(n)} is ${d * f} ${word}.`, `Work out $${d * f} \\div ${d}$ first.`],
        solution: `${num(n)} is ${d * f} ${word}. $${d * f} \\div ${d} = ${f}$, so ${d * f} ${word} $\\div ${d} = ${f}$ ${word} $= ${tex(f * z)}$.`,
      };
    }
    const d = rng.int(3, 9);
    const q = rng.int(Math.max(12, Math.ceil(100 / d)), Math.floor(999 / d));
    const n = q * d;
    const { lines } = divisionWithCheck(n, d);
    return {
      type: 'numeric',
      prompt: `Work out $${n} \\div ${d}$.`,
      answer: q,
      form: 'integer',
      calculator: 'not-allowed',
      hints: [`Use short division. Start with the hundreds digit: how many ${d}s fit into it?`, 'If there is anything left over, carry it to the next digit.'],
      solution: lines.join('\n\n'),
    };
  },
};

export const remainders: QuestionTemplate = {
  id: 'm6.num.division.remainders',
  topicId: 'm6.num.division',
  title: 'Divide by a one-digit number with a remainder',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    const d = rng.int(3, 9);
    const r = rng.int(1, d - 1);
    const [lo, hi] = difficulty === 2 ? [20, 999] : difficulty === 3 ? [1000, 9999] : [10000, 99999];
    let { q, n } = dividendIn(rng, d, r, lo, hi);
    if (difficulty === 4 && rng.chance(0.5)) {
      // Put a zero inside the quotient (e.g. 4 503 ÷ 9 → 500 r 3 style working).
      const digits = String(q).split('');
      const pos = rng.int(1, digits.length - 2);
      digits[pos] = '0';
      const q2 = Number(digits.join(''));
      if (q2 * d + r >= lo) {
        q = q2;
        n = q * d + r;
      }
    }
    const { lines } = divisionWithCheck(n, d);
    return {
      type: 'cloze',
      prompt: `Work out $${tex(n)} \\div ${d}$. Write the **quotient** in the first box and the **remainder** in the second box.\n\n$${tex(n)} \\div ${d} =$ [[q]] r [[r]]`,
      blanks: [
        { id: 'q', accepted: wholeAccepted(q) },
        { id: 'r', accepted: [String(r), `r${r}`, `r ${r}`] },
      ],
      marks: difficulty === 2 ? 1 : 2,
      calculator: 'not-allowed',
      hints: [
        `Use short division. How many ${d}s fit into the first digit (or the first two digits)?`,
        'Carry each remainder across to the next digit. Whatever is left over at the end is the remainder.',
      ],
      solution: lines.join('\n\n'),
    };
  },
};

export const remainderForms: QuestionTemplate = {
  id: 'm6.num.division.remainder-forms',
  topicId: 'm6.num.division',
  title: 'Write a remainder as a fraction or a decimal',
  difficulties: [3, 4],
  generate({ rng, difficulty }) {
    if (difficulty === 3) {
      const d = rng.int(3, 9);
      const r = coprimeRemainder(rng, d);
      if (rng.chance(0.5)) {
        const q = rng.int(2, 30);
        const n = q * d + r;
        return {
          type: 'numeric',
          prompt: `Find $\\frac{1}{${d}}$ of ${n}. Give your answer as a mixed number.`,
          answer: n / d,
          form: 'mixed',
          calculator: 'not-allowed',
          hints: [`Finding $\\frac{1}{${d}}$ of a number is the same as dividing it by ${d}.`, `The remainder is shared into ${d} equal parts too, so it becomes a fraction.`],
          solution: `$\\frac{1}{${d}}$ of ${n} means $${n} \\div ${d}$: share ${n} into ${d} equal parts.\n\n$${n} \\div ${d} = ${q}$ remainder ${r}.\n\nThe ${r} left over is shared into ${d} parts as well, which gives $\\frac{${r}}{${d}}$.\n\nSo $\\frac{1}{${d}}$ of ${n} is $${mixedTex(q, r, d)}$.`,
        };
      }
      const q = rng.int(11, 120);
      const n = q * d + r;
      return {
        type: 'numeric',
        prompt: `Work out $${n} \\div ${d}$. Write the remainder as a fraction, so your answer is a mixed number.`,
        answer: n / d,
        form: 'mixed',
        calculator: 'not-allowed',
        hints: [`First find the quotient and the remainder of $${n} \\div ${d}$.`, `A remainder of 1 when dividing by ${d} is $\\frac{1}{${d}}$, a remainder of 2 is $\\frac{2}{${d}}$, and so on.`],
        solution: `$${n} \\div ${d} = ${q}$ remainder ${r}, because $${q} \\times ${d} = ${q * d}$ and $${n} - ${q * d} = ${r}$.\n\nThe remainder ${r} out of ${d} is the fraction $\\frac{${r}}{${d}}$.\n\nSo $${n} \\div ${d} = ${mixedTex(q, r, d)}$.`,
      };
    }
    if (rng.chance(0.5)) {
      // Remainder as a decimal (divisors 2, 4, 5 give tenths or hundredths).
      const d = rng.pick([2, 4, 4, 5, 5] as const);
      const r = rng.int(1, d - 1);
      const q = rng.int(12, 240);
      const n = q * d + r;
      const dec = num(r / d);
      const g = gcd(r, d);
      const fracNote = g > 1 ? `$\\frac{${r}}{${d}} = \\frac{${r / g}}{${d / g}}$, which is ${dec}` : `$\\frac{${r}}{${d}} = ${dec}$`;
      return {
        type: 'numeric',
        prompt: `Work out $${n} \\div ${d}$. Write your answer as a decimal.`,
        answer: n / d,
        form: 'decimal',
        marks: 2,
        calculator: 'not-allowed',
        hints: [`First find the quotient and the remainder.`, `The remainder is a fraction of ${d}. What is that fraction as a decimal?`],
        solution: `$${n} \\div ${d} = ${q}$ remainder ${r}.\n\nThe remainder ${r} out of ${d} is $\\frac{${r}}{${d}}$, and ${fracNote}.\n\nSo $${n} \\div ${d} = ${q} + ${dec} = ${num(n / d)}$.`,
      };
    }
    // Remainder as a fraction that needs simplifying.
    const d = rng.pick([4, 6, 8, 9, 10] as const);
    const options: number[] = [];
    for (let x = 1; x < d; x++) if (gcd(x, d) > 1) options.push(x);
    const r = rng.pick(options);
    const q = rng.int(3, 40);
    const n = q * d + r;
    const g = gcd(r, d);
    return {
      type: 'numeric',
      prompt: `Write $${n} \\div ${d}$ as a mixed number in simplest form.`,
      answer: n / d,
      form: 'mixed',
      marks: 2,
      calculator: 'not-allowed',
      hints: ['Find the quotient and the remainder, and write the remainder as a fraction.', 'Can the top and bottom of that fraction both be divided by the same number?'],
      solution: `$${n} \\div ${d} = ${q}$ remainder ${r}, so $${n} \\div ${d} = ${mixedTex(q, r, d)}$.\n\n${r} and ${d} can both be divided by ${g}: $\\frac{${r}}{${d}} = \\frac{${r / g}}{${d / g}}$.\n\nIn simplest form, the answer is $${mixedTex(q, r / g, d / g)}$.`,
    };
  },
};

export const wordProblems: QuestionTemplate = {
  id: 'm6.num.division.word-problems',
  topicId: 'm6.num.division',
  title: 'Division word problems: round up, round down or use the remainder',
  difficulties: [3, 4, 5],
  generate({ rng, difficulty }) {
    const name = rng.pick(NAMES);
    if (difficulty === 3) {
      const kind = rng.pick(['vans', 'tents', 'tables', 'cartons', 'bows', 'teams', 'lollies'] as const);
      const setup: Record<typeof kind, { d: number[]; lo: number; hi: number }> = {
        vans: { d: [7, 8, 9], lo: 30, hi: 150 },
        tents: { d: [3, 4, 6], lo: 20, hi: 90 },
        tables: { d: [6, 8], lo: 40, hi: 200 },
        cartons: { d: [6], lo: 40, hi: 200 },
        bows: { d: [3, 4, 5, 6, 7, 8, 9], lo: 50, hi: 400 },
        teams: { d: [5, 6, 7], lo: 30, hi: 160 },
        lollies: { d: [3, 4, 5, 6, 7, 8, 9], lo: 25, hi: 120 },
      };
      const s = setup[kind];
      const d = rng.pick(s.d);
      const r = rng.int(1, d - 1);
      const { q, n } = dividendIn(rng, d, r, s.lo, s.hi);
      const div = `$${n} \\div ${d} = ${q}$ remainder ${r} (because $${q} \\times ${d} = ${q * d}$, with ${r} left over).`;
      if (kind === 'vans' || kind === 'tents' || kind === 'tables') {
        const prompt =
          kind === 'vans'
            ? `${n} students are going to the beach for a class trip. Each van can carry ${d} students. How many vans are needed?`
            : kind === 'tents'
              ? `${n} people are going to school camp. Each tent sleeps ${d} people. How many tents are needed so everyone has a bed?`
              : `${n} people are coming to the school's Matariki shared lunch. Each table seats ${d} people. How many tables are needed?`;
        const thing = kind === 'vans' ? 'van' : kind === 'tents' ? 'tent' : 'table';
        return {
          type: 'numeric',
          prompt,
          answer: q + 1,
          form: 'integer',
          calculator: 'not-allowed',
          hints: [`Work out $${n} \\div ${d}$.`, `Think about the people left over. Do they still need a ${thing}?`],
          solution: `${div}\n\n${q} ${thing}s are not enough, because ${r} ${r === 1 ? 'person would be' : 'people would be'} left out. They need one more ${thing} for them, so **round up**: ${q + 1} ${thing}s.`,
        };
      }
      if (kind === 'cartons' || kind === 'bows' || kind === 'teams') {
        const prompt =
          kind === 'cartons'
            ? `${name}'s chooks laid ${n} eggs this month. Each egg carton holds 6 eggs. How many cartons can ${name} fill completely?`
            : kind === 'bows'
              ? `${name} has ${n} cm of ribbon. Each bow needs ${d} cm of ribbon. How many bows can ${name} make?`
              : `${n} students are put into teams of ${d} for sports day. How many full teams can be made?`;
        const leftover =
          kind === 'cartons'
            ? `The ${r} extra egg${r === 1 ? '' : 's'} can't fill another carton`
            : kind === 'bows'
              ? `The ${r} cm left over is not enough for another bow`
              : `The ${r} student${r === 1 ? '' : 's'} left over can't make a full team`;
        return {
          type: 'numeric',
          prompt,
          answer: q,
          form: 'integer',
          calculator: 'not-allowed',
          hints: [`Work out $${n} \\div ${d}$.`, 'Is the amount left over enough to make another one?'],
          solution: `${div}\n\n${leftover}, so **round down**: the answer is ${q}.`,
        };
      }
      return {
        type: 'numeric',
        prompt: `${name} shares ${n} lollies equally between ${d} friends. Each friend gets as many as possible. How many lollies are left over?`,
        answer: r,
        form: 'integer',
        calculator: 'not-allowed',
        hints: [`Work out $${n} \\div ${d}$.`, 'The question asks about the lollies left over, not how many each friend gets.'],
        solution: `${div}\n\nEach friend gets ${q} lollies, and the **remainder** is the answer: ${r === 1 ? '1 lolly is' : `${r} lollies are`} left over.`,
      };
    }
    if (difficulty === 4) {
      const kind = rng.pick(['money', 'pizza', 'lastBag', 'eggs'] as const);
      if (kind === 'money') {
        const d = rng.pick([2, 4, 4, 5] as const);
        let N = rng.int(11, 199);
        while (N % d === 0) N = rng.int(11, 199);
        const q = Math.floor(N / d);
        const r = N % d;
        const each = N / d;
        const extraC = (r * 100) / d;
        return {
          type: 'numeric',
          prompt: `${d} friends earn ${cash(N)} by washing cars. They share the money equally. How much does each friend get?`,
          answer: each,
          units: '$',
          marks: 2,
          calculator: 'not-allowed',
          hints: [`Work out $${N} \\div ${d}$.`, `Don't leave a remainder: change the dollars left over into cents and share those too.`],
          solution: `$${N} \\div ${d} = ${q}$ remainder ${r}, so each friend gets ${cash(q)} and there ${r === 1 ? 'is' : 'are'} ${cash(r)} left over.\n\n${cash(r)} is ${r * 100} cents. $${r * 100} \\div ${d} = ${extraC}$, so each friend gets ${extraC}c more.\n\nEach friend gets **${cash(each)}**.`,
        };
      }
      if (kind === 'pizza') {
        const d = rng.int(3, 8);
        const r = coprimeRemainder(rng, d);
        const q = rng.int(1, 4);
        const n = q * d + r;
        return {
          type: 'numeric',
          prompt: `${n} pizzas are shared equally between ${d} people. How much pizza does each person get? Give your answer as a mixed number.`,
          answer: n / d,
          form: 'mixed',
          marks: 2,
          calculator: 'not-allowed',
          hints: [`Work out $${n} \\div ${d}$.`, `The leftover pizza can be cut up and shared too, so write the remainder as a fraction.`],
          solution: `$${n} \\div ${d} = ${q}$ remainder ${r}. Each person gets ${q} whole pizza${q === 1 ? '' : 's'}.\n\nThe ${r} leftover pizza${r === 1 ? ' is' : 's are'} cut and shared between ${d} people, so each person also gets $\\frac{${r}}{${d}}$ of a pizza.\n\nEach person gets $${mixedTex(q, r, d)}$ pizzas.`,
        };
      }
      if (kind === 'lastBag') {
        const d = rng.int(4, 9);
        const r = rng.int(1, d - 1);
        const { q, n } = dividendIn(rng, d, r, 250, 2500);
        return {
          type: 'numeric',
          prompt: `A fruit shop has ${num(n)} feijoas. It packs them into bags of ${d}. How many more feijoas are needed to fill the last bag?`,
          answer: d - r,
          form: 'integer',
          marks: 2,
          calculator: 'not-allowed',
          hints: [`Work out $${tex(n)} \\div ${d}$ and look at the remainder.`, `The last bag already has the leftover feijoas in it. How many more make ${d}?`],
          solution: `$${tex(n)} \\div ${d} = ${tex(q)}$ remainder ${r}. So ${num(q)} bags are full and the last bag has only ${r} feijoa${r === 1 ? '' : 's'}.\n\nTo fill it: $${d} - ${r} = ${d - r}$ more feijoas.`,
        };
      }
      const r = rng.int(1, 5);
      const { q, n } = dividendIn(rng, 6, r, 1000, 4000);
      return {
        type: 'numeric',
        prompt: `A farm has ${num(n)} eggs to pack into cartons of 6. How many cartons are needed to hold **all** the eggs?`,
        answer: q + 1,
        form: 'integer',
        marks: 2,
        calculator: 'not-allowed',
        hints: [`Work out $${tex(n)} \\div 6$.`, 'The leftover eggs still need a carton, even if it is not full.'],
        solution: `${divisionWithCheck(n, 6).lines.join('\n\n')}\n\n${num(q)} cartons hold ${num(q * 6)} eggs, and ${r} egg${r === 1 ? ' is' : 's are'} left. They need one more carton, so **round up**: ${num(q + 1)} cartons.`,
      };
    }
    // difficulty 5: multi-step
    const kind = rng.pick(['camp', 'bake', 'rides'] as const);
    if (kind === 'camp') {
      const c = rng.int(3, 5);
      const s = rng.int(22, 31);
      const d = rng.pick([7, 8, 9] as const);
      let a = rng.int(4, 12);
      while ((c * s + a) % d === 0) a++;
      const T = c * s + a;
      const q = Math.floor(T / d);
      const r = T % d;
      return {
        type: 'numeric',
        prompt: `${c} classes of ${s} students are going to camp, with ${a} adults. Each van carries ${d} people. How many vans do they need?`,
        answer: q + 1,
        form: 'integer',
        marks: 3,
        calculator: 'not-allowed',
        hints: ['First find the total number of people, including the adults.', `Then divide by ${d}, and think about what to do with any people left over.`],
        solution: `Students: $${c} \\times ${s} = ${c * s}$. Everyone: $${c * s} + ${a} = ${T}$ people.\n\n$${T} \\div ${d} = ${q}$ remainder ${r}.\n\n${q} vans leave ${r} ${r === 1 ? 'person' : 'people'} behind, so **round up**: they need **${q + 1} vans**.`,
      };
    }
    if (kind === 'bake') {
      const d = rng.int(4, 9);
      const r = rng.int(1, d - 1);
      const { q, n } = dividendIn(rng, d, r, 60, 400);
      const p = rng.int(2, 5);
      return {
        type: 'numeric',
        prompt: `${name} bakes ${n} biscuits for the school gala. ${name} puts ${d} biscuits in each bag and sells each full bag for ${cash(p)}. How much money does ${name} make by selling all the full bags?`,
        answer: q * p,
        units: '$',
        form: 'integer',
        marks: 3,
        calculator: 'not-allowed',
        hints: [`How many full bags can ${name} make? Work out $${n} \\div ${d}$.`, 'Then multiply the number of full bags by the price of one bag.'],
        solution: `$${n} \\div ${d} = ${q}$ remainder ${r}. The ${r} leftover biscuit${r === 1 ? '' : 's'} can't fill a bag, so **round down**: ${q} full bags.\n\nMoney: $${q} \\times ${p} = ${q * p}$, so ${name} makes **${cash(q * p)}**.`,
      };
    }
    const d = rng.int(3, 9);
    const x = rng.int(6, 14);
    let B = rng.int(20, 60);
    while ((B - x) % d === 0 || B - x < 2 * d) B++;
    const rest = B - x;
    const q = Math.floor(rest / d);
    const r = rest % d;
    const where = rng.pick(['the A&P show', 'the fun park', 'the Matariki fair', 'the school fair'] as const);
    return {
      type: 'numeric',
      prompt: `${name} takes ${cash(B)} to ${where}. ${name} spends ${cash(x)} on lunch. Rides cost ${cash(d)} each. What is the greatest number of rides ${name} can go on?`,
      answer: q,
      form: 'integer',
      marks: 3,
      calculator: 'not-allowed',
      hints: ['First find how much money is left after lunch.', `Then divide by ${d}. Can ${name} pay for a ride with the money left over?`],
      solution: `Money left after lunch: $${B} - ${x} = ${rest}$ dollars.\n\n$${rest} \\div ${d} = ${q}$ remainder ${r}.\n\nThe ${cash(r)} left over is not enough for another ride, so **round down**: ${name} can go on **${q} rides**.`,
    };
  },
};

export const inverse: QuestionTemplate = {
  id: 'm6.num.division.inverse',
  topicId: 'm6.num.division',
  title: 'Find the number that was divided (use multiplication to undo division)',
  difficulties: [4],
  generate({ rng }) {
    const d = rng.int(3, 9);
    const r = rng.int(1, d - 1);
    const kind = rng.pick(['box', 'think', 'shells'] as const);
    const q = kind === 'shells' ? rng.int(15, 80) : rng.int(25, 999);
    const n = q * d + r;
    const name = rng.pick(NAMES);
    const place = rng.pick(PLACES);
    const prompt =
      kind === 'box'
        ? `Find the missing number: $\\square \\div ${d} = ${tex(q)}$ remainder ${r}.`
        : kind === 'think'
          ? `${name} thinks of a number and divides it by ${d}. The answer is ${num(q)} remainder ${r}. What number did ${name} think of?`
          : `${name} collects shells at a beach near ${place}. ${name} shares them equally into ${d} buckets. Each bucket gets ${num(q)} shells, and there ${r === 1 ? 'is 1 shell' : `are ${r} shells`} left over. How many shells did ${name} collect?`;
    return {
      type: 'numeric',
      prompt,
      answer: n,
      form: 'integer',
      marks: 2,
      calculator: 'not-allowed',
      hints: ['Multiplication undoes division. Start with the quotient and multiply.', 'The remainder was left over, so it has to be added back on.'],
      solution: `Undo the division: multiply the quotient by ${d}, then add the remainder.\n\n$${tex(q)} \\times ${d} = ${tex(q * d)}$, and $${tex(q * d)} + ${r} = ${tex(n)}$.\n\nCheck: $${tex(n)} \\div ${d} = ${tex(q)}$ remainder ${r} ✓`,
    };
  },
};

export const templates: QuestionTemplate[] = [facts, remainders, remainderForms, wordProblems, inverse];
