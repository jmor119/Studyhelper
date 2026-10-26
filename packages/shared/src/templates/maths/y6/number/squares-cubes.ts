import type { Rng } from '../../../../rng';
import { NAMES } from '../../../format';
import type { QuestionTemplate } from '../../../types';

// m6.num.squares-cubes — factor pairs (products of 1–12), square numbers to 12² = 144 and
// cube numbers to 5³ = 125, with the ² and ³ notation. No square roots (that's Year 7).

const SQUARES = Array.from({ length: 12 }, (_, i) => (i + 1) ** 2);
const CUBES = [1, 8, 27, 64, 125];
const isSquare = (n: number) => Number.isInteger(Math.sqrt(n));
const isCube = (n: number) => CUBES.includes(n) || Math.round(Math.cbrt(n)) ** 3 === n;
const IDS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

function retry<T>(fn: () => T | null): T {
  for (let i = 0; i < 500; i++) {
    const v = fn();
    if (v !== null) return v;
  }
  throw new Error('squares-cubes: could not generate a question');
}

function factorsOf(n: number): number[] {
  const out: number[] = [];
  for (let i = 1; i <= n; i++) if (n % i === 0) out.push(i);
  return out;
}

/** Factor pairs [a, b] with a ≤ b. */
function factorPairs(n: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let a = 1; a * a <= n; a++) if (n % a === 0) out.push([a, n / a]);
  return out;
}

/** Products of two whole numbers from 2 to 12 that have at least `minPairs` factor pairs. */
function productsWithPairs(minPairs: number, lo = 12, hi = 144): number[] {
  const set = new Set<number>();
  for (let a = 2; a <= 12; a++) for (let b = a; b <= 12; b++) set.add(a * b);
  return [...set].filter((n) => n >= lo && n <= hi && factorPairs(n).length >= minPairs).sort((x, y) => x - y);
}

/** MCQ options in a random order, with feedback for each wrong option. */
function buildMcq(rng: Rng, correct: string, wrong: Array<{ text: string; why: string }>) {
  const all = rng.shuffle([{ text: correct, why: '' }, ...wrong]);
  const correctIdx = all.findIndex((o) => o.text === correct);
  return {
    options: all.map((o, i) => ({ id: IDS[i]!, text: o.text })),
    correct: IDS[correctIdx]!,
    feedback: Object.fromEntries(all.map((o, i) => [IDS[i]!, o.why] as const).filter((_, i) => i !== correctIdx)),
  };
}

const times = (n: number, k: number) => Array.from({ length: k }, () => String(n)).join(' \\times ');

// ---------------------------------------------------------------------------------------------

export const evaluate: QuestionTemplate = {
  id: 'm6.num.squares-cubes.evaluate',
  topicId: 'm6.num.squares-cubes',
  title: 'Square and cube numbers with ² and ³',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      const kind = rng.pick(['square', 'words', 'meaning'] as const);
      if (kind === 'meaning') {
        const n = rng.int(3, 12);
        return {
          type: 'mcq',
          prompt: `Which calculation is the same as $${n}^2$?`,
          ...buildMcq(rng, `$${n} \\times ${n}$`, [
            { text: `$${n} \\times 2$`, why: `$${n} \\times 2$ is double ${n}. The small 2 means "multiply ${n} by itself".` },
            { text: `$${n} + ${n}$`, why: `$${n} + ${n}$ is double ${n}. Squaring means multiplying, not adding.` },
            { text: `$${n} + 2$`, why: `The small 2 is not added on. It tells you to multiply two ${n}s together.` },
          ]),
          calculator: 'not-allowed',
          hints: ['The small raised 2 is read as "squared".', 'A square number is a number multiplied by itself.'],
          solution: `$${n}^2$ is "${n} squared", which means ${n} multiplied by itself: $${n}^2 = ${n} \\times ${n} = ${n * n}$.`,
        };
      }
      const n = rng.int(2, 12);
      return {
        type: 'numeric',
        prompt: kind === 'square' ? `Work out $${n}^2$.` : `What is ${n} squared?`,
        answer: n * n,
        form: 'integer',
        calculator: 'not-allowed',
        hints: ['"Squared" (the small 2) means multiply the number by itself.', n === 2 ? 'So write it as 2 × 2.' : `So write it as ${n} × ${n}, not ${n} × 2.`],
        solution: `$${n}^2 = ${n} \\times ${n} = ${n * n}$\n\n${n * n} is a **square number**.`,
      };
    }

    if (difficulty === 2) {
      const kind = rng.pick(['cube', 'inverse', 'word'] as const);
      if (kind === 'cube') {
        const n = rng.int(2, 5);
        return {
          type: 'numeric',
          prompt: rng.chance(0.5) ? `Work out $${n}^3$.` : `What is ${n} cubed?`,
          answer: n ** 3,
          form: 'integer',
          calculator: 'not-allowed',
          hints: ['"Cubed" (the small 3) means three of the number multiplied together.', `Work out ${n} × ${n} first, then multiply by ${n} again.`],
          solution: `$${n}^3 = ${n} \\times ${n} \\times ${n} = ${n * n} \\times ${n} = ${n ** 3}$\n\n${n ** 3} is a **cube number**.`,
        };
      }
      if (kind === 'inverse') {
        const n = rng.int(2, 12);
        return {
          type: 'numeric',
          prompt: `What number, multiplied by itself, makes ${n * n}?`,
          answer: n,
          form: 'integer',
          calculator: 'not-allowed',
          hints: ['Say your square numbers: 1, 4, 9, 16, 25, …', 'Look for a times-table fact with the same number twice.'],
          solution: `$${n} \\times ${n} = ${n * n}$, so the number is **${n}**.\n\nWe can also say ${n * n} is ${n} squared: $${n}^2 = ${n * n}$.`,
        };
      }
      const n = rng.int(2, 9);
      const k = rng.pick([2, 3]);
      const word = k === 2 ? 'squared' : 'cubed';
      return {
        type: 'cloze',
        prompt: `$${times(n, k)}$ can be written as ${n} [[a]].`,
        blanks: [{ id: 'a', accepted: [word], options: ['squared', 'cubed', 'tripled'] }],
        calculator: 'not-allowed',
        hints: [`Count how many ${n}s are multiplied together.`, 'Two of the same number multiplied is "squared". Three is "cubed".'],
        solution: `There are ${k === 2 ? 'two' : 'three'} ${n}s multiplied together, so it is ${n} **${word}**: $${n}^${k} = ${n ** k}$.\n\n("Tripled" would mean $${n} \\times 3$.)`,
      };
    }

    // difficulty 3: combine squares and cubes
    if (rng.chance(0.5)) {
      const { p, q } = retry(() => {
        const p = rng.int(2, 12);
        const q = rng.int(2, 5);
        return p * p === q ** 3 ? null : { p, q };
      });
      const s = p * p;
      const c = q ** 3;
      const [bigTex, smallTex, big, small] = s > c ? [`${p}^2`, `${q}^3`, s, c] : [`${q}^3`, `${p}^2`, c, s];
      return {
        type: 'numeric',
        prompt: `How much bigger is $${bigTex}$ than $${smallTex}$?`,
        answer: big - small,
        form: 'integer',
        calculator: 'not-allowed',
        hints: ['Work out each one first.', 'Then find the difference by subtracting the smaller number from the bigger one.'],
        solution: `$${p}^2 = ${p} \\times ${p} = ${s}$\n\n$${q}^3 = ${q} \\times ${q} \\times ${q} = ${c}$\n\n$${big} - ${small} = ${big - small}$, so $${bigTex}$ is **${big - small}** bigger.`,
      };
    }
    const kind = rng.pick(['sum', 'diff', 'mixed'] as const);
    const p = rng.int(3, 12);
    const q = rng.int(2, kind === 'diff' ? p - 1 : 10);
    const r = rng.int(2, 5);
    const parts =
      kind === 'mixed'
        ? { texExpr: `${p}^2 + ${r}^3`, a: p * p, b: r ** 3, op: '+', lines: [`$${p}^2 = ${p * p}$`, `$${r}^3 = ${r} \\times ${r} \\times ${r} = ${r ** 3}$`] }
        : {
            texExpr: `${p}^2 ${kind === 'sum' ? '+' : '-'} ${q}^2`,
            a: p * p,
            b: q * q,
            op: kind === 'sum' ? '+' : '-',
            lines: [`$${p}^2 = ${p} \\times ${p} = ${p * p}$`, `$${q}^2 = ${q} \\times ${q} = ${q * q}$`],
          };
    const answer = parts.op === '+' ? parts.a + parts.b : parts.a - parts.b;
    return {
      type: 'numeric',
      prompt: `Work out $${parts.texExpr}$.`,
      answer,
      form: 'integer',
      calculator: 'not-allowed',
      hints: ['Work out each square or cube first.', `Then ${parts.op === '+' ? 'add' : 'subtract'}.`],
      solution: `${parts.lines.join('\n\n')}\n\n$${parts.a} ${parts.op} ${parts.b} = ${answer}$`,
    };
  },
};

// ---------------------------------------------------------------------------------------------

export const factorPairsTemplate: QuestionTemplate = {
  id: 'm6.num.squares-cubes.factor-pairs',
  topicId: 'm6.num.squares-cubes',
  title: 'Factors and factor pairs',
  difficulties: [1, 2, 3, 4],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      const a = rng.int(2, 12);
      const b = rng.int(2, 12);
      const N = a * b;
      const left = rng.chance(0.5);
      return {
        type: 'numeric',
        prompt: `Find the missing number.\n\n$${left ? `\\square \\times ${b}` : `${a} \\times \\square`} = ${N}$`,
        answer: left ? a : b,
        form: 'integer',
        calculator: 'not-allowed',
        hints: [
          `Count in ${left ? b : a}s until you reach ${N}.`,
          `How many ${left ? b : a}s make ${N}?`,
        ],
        solution: `$${a} \\times ${b} = ${N}$, so the missing number is **${left ? a : b}**.\n\n${a} and ${b} are a **factor pair** of ${N}: they multiply to make ${N}.`,
      };
    }

    if (difficulty === 2) {
      const { a, b, N, k } = retry(() => {
        const a = rng.int(3, 12);
        const b = rng.int(a, 12);
        const N = a * b;
        if (N < 20) return null;
        const k = rng.int(2, Math.min(9, N - 14));
        return { a, b, N, k };
      });
      const pair = (x: number, y: number) => `${x} and ${y}`;
      return {
        type: 'mcq',
        prompt: `Which of these is a **factor pair** of ${N}?`,
        ...buildMcq(rng, pair(a, b), [
          { text: pair(a, b + 1), why: `${a} × ${b + 1} = ${a * (b + 1)}, not ${N}.` },
          { text: pair(a - 1, b), why: `${a - 1} × ${b} = ${(a - 1) * b}, not ${N}.` },
          { text: pair(N - k, k), why: `${N - k} and ${k} add to ${N}. A factor pair must **multiply** to make ${N}.` },
        ]),
        calculator: 'not-allowed',
        hints: ['A factor pair is two numbers that multiply to make the number.', 'Multiply each pair and check.'],
        solution: `$${a} \\times ${b} = ${N}$, so **${a} and ${b}** are a factor pair of ${N}.`,
      };
    }

    if (difficulty === 3) {
      const N = rng.pick(productsWithPairs(3, 12, 100));
      const pairs = factorPairs(N);
      const pairList = pairs.map(([x, y]) => `${x} × ${y}`).join(',  ');
      const factors = factorsOf(N);
      if (rng.chance(0.5)) {
        return {
          type: 'numeric',
          prompt: `How many factors does ${N} have?`,
          answer: factors.length,
          form: 'integer',
          calculator: 'not-allowed',
          hints: [
            `Find all the factor pairs of ${N}, starting with 1 × ${N}.`,
            'Stop when the pairs start to repeat. Count each different number once.',
          ],
          solution: `Factor pairs of ${N}: ${pairList}.\n\nThe factors are ${factors.join(', ')}.${
            isSquare(N) ? ` (${Math.sqrt(N)} × ${Math.sqrt(N)} only gives one factor, because the two numbers are the same.)` : ''
          }\n\nThat is **${factors.length}** factors.`,
        };
      }
      // Complete the factor pairs.
      const blanks = rng.sample(pairs.slice(1).map((_, i) => i + 1), Math.min(3, pairs.length - 1)).sort((x, y) => x - y);
      const shown = pairs.map(([x, y], i) => {
        const bi = blanks.indexOf(i);
        return bi === -1 ? `${x} × ${y}` : `${x} × [[${IDS[bi]}]]`;
      });
      return {
        type: 'cloze',
        prompt: `Complete the factor pairs of ${N}.\n\n${shown.join(',   ')}`,
        blanks: blanks.map((i, bi) => ({ id: IDS[bi]!, accepted: [String(pairs[i]![1])] })),
        calculator: 'not-allowed',
        hints: [`For each one, ask: what times the first number makes ${N}?`, 'Use your times tables, or divide.'],
        solution: `The factor pairs of ${N} are ${pairList}.`,
      };
    }

    // difficulty 4: select all the factors (plain or in context)
    const N = rng.pick(productsWithPairs(4, 24, 144));
    const factors = factorsOf(N);
    const middle = factors.filter((f) => f !== 1 && f !== N);
    const chosen = rng.sample(middle, Math.min(4, middle.length));
    const nonFactors = new Set<number>();
    const context = rng.chance(0.5);
    if (!context) nonFactors.add(2 * N); // a multiple, not a factor
    for (let attempt = 0; nonFactors.size < 4 && attempt < 200; attempt++) {
      const f = rng.pick(middle);
      const v = f + rng.pick([-1, 1, 2]);
      if (v > 1 && N % v !== 0 && v < N) nonFactors.add(v);
    }
    const values = [...chosen, ...nonFactors].sort((x, y) => x - y);
    const name = rng.pick(NAMES);
    const thing = rng.pick(['cupcakes', 'muffins', 'pikelets', 'cookies'] as const);
    const pairList = factorPairs(N)
      .map(([x, y]) => `${x} × ${y}`)
      .join(', ');
    return {
      type: 'multi',
      prompt: context
        ? `${name} has baked ${N} ${thing} for the school fair. Every box must hold the same number of ${thing}, with none left over.\n\nSelect **all** the box sizes that would work.`
        : `Select **all** the factors of ${N}.`,
      options: values.map((v, i) => ({ id: IDS[i]!, text: context ? `${v} ${thing} in a box` : String(v) })),
      correct: values.map((v, i) => [v, IDS[i]!] as const).filter(([v]) => N % v === 0).map(([, id]) => id),
      marks: 2,
      calculator: 'not-allowed',
      hints: [
        context ? `A box size works if it divides into ${N} exactly. That means it is a factor of ${N}.` : `A factor of ${N} divides into ${N} exactly, with nothing left over.`,
        `List the factor pairs of ${N}, starting with 1 × ${N}.`,
      ],
      solution: `Factor pairs of ${N}: ${pairList}.\n\nSo the factors of ${N} are ${factors.join(', ')}.\n\nFrom the list, the ${context ? 'box sizes that work' : 'factors'} are **${chosen.sort((x, y) => x - y).join(', ')}**.${
        context ? '' : ` ${2 * N} is a **multiple** of ${N}, not a factor.`
      }`,
    };
  },
};

// ---------------------------------------------------------------------------------------------

export const identify: QuestionTemplate = {
  id: 'm6.num.squares-cubes.identify',
  topicId: 'm6.num.squares-cubes',
  title: 'Recognise square and cube numbers',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    if (difficulty === 2) {
      if (rng.chance(0.6)) {
        const p = rng.int(3, 12);
        const wrong: Array<{ text: string; why: string }> = [];
        const used = new Set([p * p]);
        const add = (v: number, why: string) => {
          if (!used.has(v) && !isSquare(v) && wrong.length < 3) {
            used.add(v);
            wrong.push({ text: String(v), why });
          }
        };
        add(2 * p, `${2 * p} is ${p} × 2. A square number is a number multiplied by itself.`);
        const cube = rng.pick([8, 27, 125]);
        add(cube, `${cube} is a cube number (${Math.round(Math.cbrt(cube))} × ${Math.round(Math.cbrt(cube))} × ${Math.round(Math.cbrt(cube))}), but no whole number times itself makes ${cube}.`);
        add(p * p + 1, `${p * p + 1} is 1 more than ${p * p}, which is ${p} squared.`);
        add(p * p - 1, `${p * p - 1} is 1 less than ${p * p}, which is ${p} squared.`);
        add(p * (p + 1), `${p * (p + 1)} is ${p} × ${p + 1}. The two numbers are different, so it isn't a square number.`);
        return {
          type: 'mcq',
          prompt: `${rng.pick(NAMES)} has four number cards. Which card shows a **square number**?`,
          ...buildMcq(rng, String(p * p), wrong),
          calculator: 'not-allowed',
          hints: ['A square number is a whole number multiplied by itself.', 'Say your square numbers: 1, 4, 9, 16, 25, 36, …'],
          solution: `${p * p} = ${p} × ${p}, so **${p * p}** is a square number.`,
        };
      }
      const q = rng.int(2, 5);
      const wrong: Array<{ text: string; why: string }> = [];
      const used = new Set([q ** 3]);
      const add = (v: number, why: string) => {
        if (!used.has(v) && !isCube(v) && wrong.length < 3) {
          used.add(v);
          wrong.push({ text: String(v), why });
        }
      };
      add(3 * q, `${3 * q} is ${q} × 3. A cube number is three of the same number multiplied together.`);
      const sq = rng.pick([16, 25, 36, 49, 81, 100]);
      add(sq, `${sq} is a square number (${Math.sqrt(sq)} × ${Math.sqrt(sq)}), but it isn't a cube number.`);
      add(q * q, `${q * q} is ${q} × ${q}, which is ${q} squared, not ${q} cubed.`);
      add(q ** 3 + 1, `${q ** 3 + 1} is 1 more than ${q ** 3}, which is ${q} cubed.`);
      add(q ** 3 - 1, `${q ** 3 - 1} is 1 less than ${q ** 3}, which is ${q} cubed.`);
      return {
        type: 'mcq',
        prompt: `${rng.pick(NAMES)} has four number cards. Which card shows a **cube number**?`,
        ...buildMcq(rng, String(q ** 3), wrong),
        calculator: 'not-allowed',
        hints: ['A cube number is a number multiplied by itself, and then by itself again.', 'The cube numbers start 1, 8, 27, …'],
        solution: `${q ** 3} = ${q} × ${q} × ${q}, so **${q ** 3}** is a cube number.`,
      };
    }

    if (difficulty === 3) {
      const squares = rng.chance(0.6);
      const correct = squares ? rng.sample(SQUARES.slice(1), 3) : rng.sample(CUBES.slice(1), 2);
      const pool = new Set<number>();
      for (const v of correct) {
        const base = squares ? Math.sqrt(v) : Math.round(Math.cbrt(v));
        pool.add(squares ? 2 * base : 3 * base); // the "× 2" / "× 3" mistake
      }
      const extras = squares ? [8, 27, 125, 12, 18, 24, 32, 40, 50, 60, 90] : [9, 16, 25, 36, 49, 81, 100, 12, 15, 30, 100];
      for (const v of rng.shuffle(extras)) pool.add(v);
      const check = squares ? isSquare : isCube;
      const distractors = [...pool].filter((v) => !check(v) && !correct.includes(v)).slice(0, squares ? 5 : 5);
      const values = [...correct, ...distractors].sort((x, y) => x - y);
      return {
        type: 'multi',
        prompt: `${rng.pick(NAMES)} has ${values.length} number cards. Select **all** the cards that show a ${squares ? 'square' : 'cube'} number.`,
        options: values.map((v, i) => ({ id: IDS[i]!, text: String(v) })),
        correct: values.map((v, i) => [v, IDS[i]!] as const).filter(([v]) => correct.includes(v)).map(([, id]) => id),
        calculator: 'not-allowed',
        hints: [
          squares ? 'A square number is a number times itself, like 6 × 6.' : 'A cube number is a number times itself times itself, like 2 × 2 × 2.',
          squares ? 'Say the square numbers up to 144: 1, 4, 9, 16, …' : 'Say the cube numbers up to 125: 1, 8, 27, …',
        ],
        solution: `The ${squares ? 'square' : 'cube'} numbers in the list are **${[...correct].sort((x, y) => x - y).join(', ')}**:\n\n${[...correct]
          .sort((x, y) => x - y)
          .map((v) => (squares ? `${v} = ${Math.sqrt(v)} × ${Math.sqrt(v)}` : `${v} = ${times(Math.round(Math.cbrt(v)), 3).replace(/\\times/g, '×')}`))
          .join('\n\n')}`,
      };
    }

    // difficulty 4
    const N = retry(() => {
      const n = rng.int(10, 140);
      return isSquare(n) ? null : n;
    });
    const p = Math.floor(Math.sqrt(N));
    const prev = p * p;
    const next = (p + 1) * (p + 1);
    if (rng.chance(0.5)) {
      return {
        type: 'numeric',
        prompt: `What is the **smallest** number you can add to ${N} to make a square number?`,
        answer: next - N,
        form: 'integer',
        calculator: 'not-allowed',
        hints: [`What is the first square number bigger than ${N}?`, `Then work out how far ${N} is from it.`],
        solution: `The square numbers either side of ${N} are ${prev} (${p} × ${p}) and ${next} (${p + 1} × ${p + 1}).\n\nThe next square number after ${N} is ${next}, and $${next} - ${N} = ${next - N}$.\n\nSo add **${next - N}**.`,
      };
    }
    return {
      type: 'cloze',
      prompt: `${N} is between two square numbers that are next to each other. Fill in the gaps.\n\n[[a]] < ${N} < [[b]]`,
      blanks: [
        { id: 'a', accepted: [String(prev)] },
        { id: 'b', accepted: [String(next)] },
      ],
      calculator: 'not-allowed',
      hints: ['List the square numbers: 1, 4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144.', `Find the last one before ${N} and the first one after it.`],
      solution: `$${p}^2 = ${prev}$ and $${p + 1}^2 = ${next}$.\n\nSo **${prev}** < ${N} < **${next}**.`,
    };
  },
};

// ---------------------------------------------------------------------------------------------

export const problems: QuestionTemplate = {
  id: 'm6.num.squares-cubes.problems',
  topicId: 'm6.num.squares-cubes',
  title: 'Square and cube number problems',
  difficulties: [4, 5],
  generate({ rng, difficulty }) {
    const name = rng.pick(NAMES);
    if (difficulty === 4) {
      if (rng.chance(0.5)) {
        const N = retry(() => {
          const n = rng.int(20, 140);
          return isSquare(n) ? null : n;
        });
        const p = Math.floor(Math.sqrt(N));
        return {
          type: 'numeric',
          prompt: `${name} has ${N} square tiles. ${name} makes the biggest square possible, with the same number of tiles in every row and every column. How many tiles are left over?`,
          answer: N - p * p,
          form: 'integer',
          marks: 2,
          calculator: 'not-allowed',
          hints: [`A square made of tiles uses a square number of tiles. Which is the biggest square number that is not more than ${N}?`, `Then take that away from ${N}.`],
          solution: `The biggest square number that is not more than ${N} is ${p * p}, because $${p} \\times ${p} = ${p * p}$ (and $${p + 1} \\times ${p + 1} = ${(p + 1) ** 2}$ is too many).\n\n${name} makes ${p === 8 || p === 11 ? 'an' : 'a'} ${p} by ${p} square using ${p * p} tiles.\n\n$${N} - ${p * p} = ${N - p * p}$, so **${N - p * p}** tiles are left over.`,
        };
      }
      const p = rng.int(3, 12);
      return {
        type: 'numeric',
        prompt: `A square vegetable garden at school has an area of ${p * p} m². How many metres of fencing are needed to go all the way around it?`,
        answer: 4 * p,
        form: 'integer',
        units: 'm',
        marks: 2,
        calculator: 'not-allowed',
        hints: ['The area of a square is side × side. Which number times itself makes the area?', 'A square has 4 equal sides.'],
        solution: `The area is side × side, and $${p} \\times ${p} = ${p * p}$, so each side is ${p} m.\n\nThe fence goes around all 4 sides: $4 \\times ${p} = ${4 * p}$.\n\nSo **${4 * p} m** of fencing is needed.`,
      };
    }

    // difficulty 5
    const kind = rng.pick(['cube-left', 'next-cube', 'think'] as const);
    if (kind === 'cube-left') {
      const N = retry(() => {
        const n = rng.int(10, 140);
        return isCube(n) ? null : n;
      });
      const q = Math.floor(Math.cbrt(N + 1e-9));
      const used = q ** 3;
      return {
        type: 'numeric',
        prompt: `${name} has ${N} small cubes. ${name} builds the biggest solid cube possible, with the same number of small cubes along every edge. How many small cubes are left over?`,
        answer: N - used,
        form: 'integer',
        marks: 2,
        calculator: 'not-allowed',
        hints: [`A solid cube uses a cube number of small cubes. Which is the biggest cube number that is not more than ${N}?`, `Then take that away from ${N}.`],
        solution: `The cube numbers are 1, 8, 27, 64, 125, … The biggest one that is not more than ${N} is ${used} ($${q} \\times ${q} \\times ${q}$).\n\n${name} builds a ${q} by ${q} by ${q} cube using ${used} small cubes.\n\n$${N} - ${used} = ${N - used}$, so **${N - used}** small cubes are left over.`,
      };
    }
    if (kind === 'next-cube') {
      const q = rng.int(2, 4);
      const now = q ** 3;
      const nxt = (q + 1) ** 3;
      return {
        type: 'numeric',
        prompt: `${name} built a solid cube from ${now} small cubes. Next, ${name} wants to build a solid cube that is one small cube longer, wider and taller. How many **more** small cubes are needed?`,
        answer: nxt - now,
        form: 'integer',
        marks: 2,
        calculator: 'not-allowed',
        hints: [`How many small cubes long is each edge of the first cube? (Which number cubed makes ${now}?)`, 'Work out how many small cubes the bigger cube needs, then find the difference.'],
        solution: `$${q} \\times ${q} \\times ${q} = ${now}$, so the first cube is ${q} small cubes along each edge.\n\nThe new cube is ${q + 1} along each edge: $${q + 1} \\times ${q + 1} \\times ${q + 1} = ${nxt}$.\n\n$${nxt} - ${now} = ${nxt - now}$, so **${nxt - now}** more small cubes are needed.`,
      };
    }
    const n = rng.int(3, 12);
    const add = rng.chance(0.6);
    const c = add ? rng.int(5, 30) : rng.int(2, Math.min(30, n * n - 1));
    const result = add ? n * n + c : n * n - c;
    return {
      type: 'numeric',
      prompt: `${name} thinks of a number. ${name} squares it, then ${add ? 'adds' : 'subtracts'} ${c}. The answer is ${result}. What number did ${name} think of?`,
      answer: n,
      form: 'integer',
      marks: 2,
      calculator: 'not-allowed',
      hints: [`Work backwards. First undo the ${add ? 'adding' : 'subtracting'} of ${c}.`, 'Then ask: which number, multiplied by itself, gives that?'],
      solution: `Work backwards. Undo ${add ? 'adding' : 'subtracting'} ${c}: $${result} ${add ? '-' : '+'} ${c} = ${n * n}$.\n\nSo the number squared is ${n * n}. Since $${n} \\times ${n} = ${n * n}$, ${name} thought of **${n}**.`,
    };
  },
};

export const templates: QuestionTemplate[] = [evaluate, factorPairsTemplate, identify, problems];
