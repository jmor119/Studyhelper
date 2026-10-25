import type { Rng } from '../../../rng';
import type { QuestionTemplate } from '../../types';
import { NAMES, frac } from '../../format';
import { COLOUR_FILL, spinner, treeDiagram } from './figures';

// m9.pro.theoretical — sample spaces (lists, tables, two-way tables, tree diagrams), theoretical
// probability, mutually exclusive events, and avoiding double counting with "or".
//
// Fraction answers are accepted in any equivalent form unless the prompt asks for simplest form.

/** "\frac{4}{12} = \frac{1}{3}" (or just "\frac{3}{7}" when already simplest). */
export function pTex(n: number, d: number): string {
  const raw = frac(n, d, true);
  const simple = frac(n, d);
  return raw === simple ? raw : `${raw} = ${simple}`;
}

/** Prompt suffix and form for a fraction answer. Simplest form is only required when asked for. */
export function fractionAsk(rng: Rng, chanceSimplest: number): { text: string; form: 'any' | 'simplest-fraction' } {
  return rng.chance(chanceSimplest)
    ? { text: 'Give your answer as a fraction in its simplest form.', form: 'simplest-fraction' }
    : { text: 'Give your answer as a fraction.', form: 'any' };
}

const COLOURS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'] as const;
const WORDS = [
  'TAURANGA', 'ROTORUA', 'WELLINGTON', 'WHANGANUI', 'PAPAKURA', 'MATARIKI', 'AOTEAROA', 'WAIKATO',
  'HAMILTON', 'NAPIER', 'DUNEDIN', 'GISBORNE', 'NELSON', 'TIMARU', 'CHRISTCHURCH', 'INVERCARGILL',
] as const;
const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

const isPrime = (x: number) => {
  if (x < 2) return false;
  for (let i = 2; i * i <= x; i++) if (x % i === 0) return false;
  return true;
};

interface Prop {
  name: string;
  test: (x: number) => boolean;
}

function numberProps(rng: Rng, N: number): Prop[] {
  const k1 = rng.int(Math.ceil(N / 3), N - 2);
  const k2 = rng.int(3, Math.floor((2 * N) / 3));
  return [
    { name: 'an even number', test: (x) => x % 2 === 0 },
    { name: 'an odd number', test: (x) => x % 2 === 1 },
    { name: 'a multiple of 3', test: (x) => x % 3 === 0 },
    { name: 'a multiple of 4', test: (x) => x % 4 === 0 },
    { name: 'a multiple of 5', test: (x) => x % 5 === 0 },
    { name: 'a prime number', test: isPrime },
    { name: 'a square number', test: (x) => Number.isInteger(Math.sqrt(x)) },
    { name: `greater than ${k1}`, test: (x) => x > k1 },
    { name: `less than ${k2}`, test: (x) => x < k2 },
  ];
}

const setText = (xs: readonly number[]) => (xs.length ? xs.join(', ') : 'none');

export const singleEvent: QuestionTemplate = {
  id: 'm9.pro.theoretical.single-event',
  topicId: 'm9.pro.theoretical',
  title: 'Probability of a single event, including "not" and "or"',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    const name = rng.pick(NAMES);

    if (difficulty === 3) {
      // A or B with overlapping events: count each outcome once.
      const setup = rng.pick([
        { N: 6, text: 'A fair six-sided die is rolled.', what: 'the number rolled' },
        { N: 10, text: 'A spinner has ten equal sections numbered 1 to 10. It is spun once.', what: 'the number it lands on' },
        { N: 12, text: 'Twelve cards numbered 1 to 12 are shuffled and one is picked at random.', what: 'the number on the card' },
        { N: 15, text: 'Fifteen cards numbered 1 to 15 are shuffled and one is picked at random.', what: 'the number on the card' },
        { N: 20, text: 'Twenty cards numbered 1 to 20 are shuffled and one is picked at random.', what: 'the number on the card' },
        { N: 30, text: 'Raffle tickets numbered 1 to 30 are put in a hat and one is drawn at random.', what: 'the number on the ticket' },
      ]);
      const N = setup.N;
      const outcomes = Array.from({ length: N }, (_, i) => i + 1);
      const props = numberProps(rng, N);
      for (;;) {
        const [A, B] = rng.sample(props, 2) as [Prop, Prop];
        const a = outcomes.filter(A.test);
        const b = outcomes.filter(B.test);
        const both = a.filter(B.test);
        const union = outcomes.filter((x) => A.test(x) || B.test(x));
        if (!both.length || both.length === a.length || both.length === b.length || union.length >= N) continue;
        const ask = fractionAsk(rng, 0.35);
        return {
          type: 'numeric',
          prompt: `${setup.text} What is the probability that ${setup.what} is ${A.name} **or** ${B.name} (or both)? ${ask.text}`,
          answer: union.length / N,
          form: ask.form,
          calculator: 'not-allowed',
          hints: [
            `List the outcomes that are ${A.name}, then the outcomes that are ${B.name}.`,
            'Some outcomes are in both lists. Count each outcome only once.',
          ],
          solution: [
            `There are ${N} equally likely outcomes.`,
            `${A.name[0]!.toUpperCase()}${A.name.slice(1)}: ${setText(a)}`,
            `${B.name[0]!.toUpperCase()}${B.name.slice(1)}: ${setText(b)}`,
            `${setText(both)} ${both.length === 1 ? 'is' : 'are'} in both lists, so count ${both.length === 1 ? 'it' : 'them'} only once. The outcomes that are ${A.name} or ${B.name}: ${setText(union)} (${union.length} outcomes).`,
            `$P = ${pTex(union.length, N)}$`,
            `Adding $${frac(a.length, N, true)} + ${frac(b.length, N, true)}$ would be wrong: it counts ${setText(both)} twice. These events are not mutually exclusive.`,
          ].join('\n\n'),
        };
      }
    }

    const kind = rng.pick(['bag', 'spinner', 'letters', ...(difficulty === 2 ? (['die'] as const) : [])] as const);

    if (kind === 'die') {
      const ev = rng.pick([
        { name: 'an even number', set: [2, 4, 6] },
        { name: 'a number greater than 4', set: [5, 6] },
        { name: 'a multiple of 3', set: [3, 6] },
        { name: 'a factor of 6', set: [1, 2, 3, 6] },
        { name: 'a prime number', set: [2, 3, 5] },
        { name: 'a number less than 3', set: [1, 2] },
        { name: 'a number that is not a 6', set: [1, 2, 3, 4, 5] },
      ]);
      const ask = fractionAsk(rng, 0.35);
      return {
        type: 'numeric',
        prompt: `${name} rolls a fair six-sided die. What is the probability of rolling ${ev.name}? ${ask.text}`,
        answer: ev.set.length / 6,
        form: ask.form,
        calculator: 'not-allowed',
        hints: ['The sample space is 1, 2, 3, 4, 5, 6: six equally likely outcomes.', `Which of these outcomes count as "${ev.name}"?`],
        solution: `The favourable outcomes are ${ev.set.join(', ')}: ${ev.set.length} out of 6.\n\n$P = ${pTex(ev.set.length, 6)}$`,
      };
    }

    if (kind === 'letters') {
      const word = rng.pick(WORDS);
      const letters = [...word];
      const n = letters.length;
      const vowelCount = letters.filter((l) => VOWELS.has(l)).length;
      const card = `Each letter of the word **${word}** is written on its own card. The ${n} cards are shuffled and ${name} picks one at random.`;
      if (difficulty === 2 && rng.chance(0.5)) {
        const ask = fractionAsk(rng, 0.35);
        return {
          type: 'numeric',
          prompt: `${card} What is the probability that the letter is a vowel (A, E, I, O or U)? ${ask.text}`,
          answer: vowelCount / n,
          form: ask.form,
          calculator: 'not-allowed',
          hints: [`There are ${n} cards altogether.`, 'Count every vowel card, including repeated letters.'],
          solution: `Vowel cards: ${letters.filter((l) => VOWELS.has(l)).join(', ')}: ${vowelCount} out of ${n}.\n\n$P(\\text{vowel}) = ${pTex(vowelCount, n)}$`,
        };
      }
      const counts = new Map<string, number>();
      for (const l of letters) counts.set(l, (counts.get(l) ?? 0) + 1);
      const letter = rng.pick([...counts.keys()]);
      const c = counts.get(letter)!;
      if (difficulty === 2) {
        const ask = fractionAsk(rng, 0.35);
        return {
          type: 'numeric',
          prompt: `${card} What is the probability that the letter is **not** ${letter}? ${ask.text}`,
          answer: (n - c) / n,
          form: ask.form,
          calculator: 'not-allowed',
          hints: [`First find P(${letter}).`, `P(not ${letter}) = 1 − P(${letter}).`],
          solution: `There ${c === 1 ? 'is 1 card' : `are ${c} cards`} with ${letter}, out of ${n}, so $P(${letter}) = ${frac(c, n, true)}$.\n\n$P(\\text{not } ${letter}) = 1 - ${frac(c, n, true)} = ${pTex(n - c, n)}$`,
        };
      }
      return {
        type: 'numeric',
        prompt: `${card} What is the probability that the letter is ${letter}? Give your answer as a fraction.`,
        answer: c / n,
        calculator: 'not-allowed',
        hints: [`There are ${n} cards, all equally likely.`, `How many cards show ${letter}?`],
        solution: `${c} of the ${n} cards ${c === 1 ? 'shows' : 'show'} ${letter}.\n\n$P(${letter}) = ${pTex(c, n)}$`,
      };
    }

    if (kind === 'spinner') {
      const k = rng.pick([4, 5, 6, 8, 10]);
      const cols = rng.sample(COLOURS, rng.int(2, 3));
      const sectors = Array.from({ length: k }, (_, i) => cols[i % cols.length]!);
      const shuffled = rng.shuffle(sectors);
      const c = rng.pick(cols);
      const count = shuffled.filter((x) => x === c).length;
      const figure = {
        svg: spinner(shuffled.map((x) => ({ label: x[0]!.toUpperCase() + x.slice(1), fill: COLOUR_FILL[x]! }))),
        alt: `A spinner with ${k} equal sections: ${shuffled.join(', ')}.`,
      };
      if (difficulty === 2) {
        const ask = fractionAsk(rng, 0.35);
        return {
          type: 'numeric',
          figure,
          prompt: `The spinner has ${k} equal sections. ${name} spins it once. What is the probability that it does **not** land on ${c}? ${ask.text}`,
          answer: (k - count) / k,
          form: ask.form,
          calculator: 'not-allowed',
          hints: [`Count the sections that are not ${c}.`, `Or use P(not ${c}) = 1 − P(${c}).`],
          solution: `${count} of the ${k} sections are ${c}, so ${k - count} are not.\n\n$P(\\text{not ${c}}) = ${pTex(k - count, k)}$`,
        };
      }
      return {
        type: 'numeric',
        figure,
        prompt: `The spinner has ${k} equal sections. ${name} spins it once. What is the probability that it lands on ${c}? Give your answer as a fraction.`,
        answer: count / k,
        calculator: 'not-allowed',
        hints: ['All the sections are the same size, so each one is equally likely.', `Count the ${c} sections.`],
        solution: `${count} of the ${k} equal sections ${count === 1 ? 'is' : 'are'} ${c}.\n\n$P(\\text{${c}}) = ${pTex(count, k)}$`,
      };
    }

    // bag
    const item = rng.pick(['counters', 'marbles', 'jelly beans']);
    const cols = rng.sample(COLOURS, 3);
    const counts = cols.map(() => rng.int(1, 9));
    const T = counts.reduce((a, b) => a + b, 0);
    const desc = `A bag contains ${cols.map((c, i) => `${counts[i]} ${c}`).join(', ').replace(/, ([^,]*)$/, ' and $1')} ${item}. ${name} takes one out without looking.`;
    if (difficulty === 1) {
      const i = rng.int(0, 2);
      return {
        type: 'numeric',
        prompt: `${desc} What is the probability that it is ${cols[i]}? Give your answer as a fraction.`,
        answer: counts[i]! / T,
        calculator: 'not-allowed',
        hints: [`First find the total number of ${item}.`, 'Probability = number of favourable outcomes ÷ total number of outcomes.'],
        solution: `Total: $${counts.join(' + ')} = ${T}$ ${item}.\n\n$P(\\text{${cols[i]}}) = ${pTex(counts[i]!, T)}$`,
      };
    }
    const ask = fractionAsk(rng, 0.35);
    if (rng.chance(0.5)) {
      const [i, j] = rng.sample([0, 1, 2], 2) as [number, number];
      const fav = counts[i]! + counts[j]!;
      return {
        type: 'numeric',
        prompt: `${desc} What is the probability that it is ${cols[i]} **or** ${cols[j]}? ${ask.text}`,
        answer: fav / T,
        form: ask.form,
        calculator: 'not-allowed',
        hints: [
          `A ${item.replace(/s$/, '')} can't be both ${cols[i]} and ${cols[j]}, so these events are mutually exclusive.`,
          `Add the number of ${cols[i]} and ${cols[j]} ${item}.`,
        ],
        solution: `Total: $${counts.join(' + ')} = ${T}$.\n\n${cols[i]![0]!.toUpperCase()}${cols[i]!.slice(1)} or ${cols[j]}: $${counts[i]} + ${counts[j]} = ${fav}$. (These events are **mutually exclusive**, so nothing is counted twice.)\n\n$P = ${pTex(fav, T)}$`,
      };
    }
    const i = rng.int(0, 2);
    return {
      type: 'numeric',
      prompt: `${desc} What is the probability that it is **not** ${cols[i]}? ${ask.text}`,
      answer: (T - counts[i]!) / T,
      form: ask.form,
      calculator: 'not-allowed',
      hints: [`First find P(${cols[i]}).`, `P(not ${cols[i]}) = 1 − P(${cols[i]}).`],
      solution: `Total: $${counts.join(' + ')} = ${T}$. There are ${counts[i]} ${cols[i]}, so ${T - counts[i]!} are not ${cols[i]}.\n\n$P(\\text{not ${cols[i]}}) = ${pTex(T - counts[i]!, T)}$`,
    };
  },
};

// ---------------- Two-event sample spaces (tables) ----------------

interface TableExperiment {
  text: string;
  rowsLabel: string;
  rows: readonly (string | number)[];
  cols: readonly (string | number)[];
  op?: { sym: string; f: (a: number, b: number) => number; word: string };
}

const DICE: Array<{ sym: string; f: (a: number, b: number) => number; word: string }> = [
  { sym: '+', f: (a, b) => a + b, word: 'sum' },
  { sym: '×', f: (a, b) => a * b, word: 'product' },
  { sym: '−', f: (a, b) => Math.abs(a - b), word: 'difference (larger − smaller)' },
];

function experiment(rng: Rng): TableExperiment {
  const which = rng.pick(['dice', 'dice', 'spinners', 'four-sided'] as const);
  if (which === 'dice') {
    const op = rng.pick(DICE);
    return {
      text: `Two fair six-sided dice are rolled and the ${op.word} of the two numbers is found.`,
      rowsLabel: op.sym,
      rows: [1, 2, 3, 4, 5, 6],
      cols: [1, 2, 3, 4, 5, 6],
      op,
    };
  }
  if (which === 'spinners') {
    return {
      text: 'Spinner A has four equal sections numbered 1 to 4. Spinner B has three equal sections numbered 1 to 3. Both are spun and the two numbers are added.',
      rowsLabel: '+',
      rows: [1, 2, 3, 4],
      cols: [1, 2, 3],
      op: DICE[0]!,
    };
  }
  const op = rng.pick(DICE.slice(0, 2));
  return {
    text: `Two fair four-sided dice (numbered 1 to 4) are rolled and the ${op.word} of the two numbers is found.`,
    rowsLabel: op.sym,
    rows: [1, 2, 3, 4],
    cols: [1, 2, 3, 4],
    op,
  };
}

function tableMarkdown(e: TableExperiment): string {
  const head = `| ${e.rowsLabel} | ${e.cols.join(' | ')} |`;
  const sepLine = `|---|${e.cols.map(() => '---').join('|')}|`;
  const body = e.rows.map((r) => `| **${r}** | ${e.cols.map((c) => e.op!.f(Number(r), Number(c))).join(' | ')} |`);
  return [head, sepLine, ...body].join('\n');
}

export const sampleSpaceTable: QuestionTemplate = {
  id: 'm9.pro.theoretical.sample-space-table',
  topicId: 'm9.pro.theoretical',
  title: 'Sample space tables for two events (including "or" without double counting)',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    if (difficulty === 4) {
      // Union of overlapping events on two dice, or a die and a coin.
      if (rng.chance(0.3)) {
        const ev = rng.pick([
          { a: 'a head', b: 'an even number', fa: (c: string) => c === 'H', fb: (_c: string, n: number) => n % 2 === 0 },
          { a: 'a tail', b: 'a 6', fa: (c: string) => c === 'T', fb: (_c: string, n: number) => n === 6 },
          { a: 'a head', b: 'a number greater than 4', fa: (c: string) => c === 'H', fb: (_c: string, n: number) => n > 4 },
          { a: 'a tail', b: 'a number less than 3', fa: (c: string) => c === 'T', fb: (_c: string, n: number) => n < 3 },
        ]);
        const all = ['H', 'T'].flatMap((c) => [1, 2, 3, 4, 5, 6].map((n) => ({ c, n })));
        const A = all.filter((o) => ev.fa(o.c));
        const B = all.filter((o) => ev.fb(o.c, o.n));
        const both = all.filter((o) => ev.fa(o.c) && ev.fb(o.c, o.n));
        const union = all.filter((o) => ev.fa(o.c) || ev.fb(o.c, o.n));
        const show = (xs: typeof all) => xs.map((o) => `${o.c}${o.n}`).join(', ');
        return {
          type: 'numeric',
          prompt: `A fair coin is tossed and a fair six-sided die is rolled. What is the probability of getting ${ev.a} **or** ${ev.b} (or both)? Give your answer as a fraction.`,
          answer: union.length / 12,
          calculator: 'not-allowed',
          hints: [
            'List the sample space: H1, H2, …, H6, T1, …, T6. That is 12 equally likely outcomes.',
            `Mark the outcomes with ${ev.a} or ${ev.b}. Don't count an outcome twice.`,
          ],
          solution: [
            'The sample space has $2 \\times 6 = 12$ equally likely outcomes.',
            `${ev.a[0]!.toUpperCase()}${ev.a.slice(1)}: ${show(A)} (${A.length}). ${ev.b[0]!.toUpperCase()}${ev.b.slice(1)}: ${show(B)} (${B.length}).`,
            `${show(both)} ${both.length === 1 ? 'is' : 'are'} in both, so the outcomes with ${ev.a} or ${ev.b} are ${A.length} + ${B.length} − ${both.length} = ${union.length}.`,
            `$P = ${pTex(union.length, 12)}$`,
            `Adding $${frac(A.length, 12, true)} + ${frac(B.length, 12, true)}$ would double count.`,
          ].join('\n\n'),
        };
      }
      const k = rng.int(4, 10);
      const ev = rng.pick([
        { a: 'a 6 on the first die', b: 'a 6 on the second die', text: 'at least one of the dice shows a 6', fa: (x: number) => x === 6, fb: (_x: number, y: number) => y === 6 },
        { a: 'a double', b: `a sum of ${2 * Math.ceil(k / 2)}`, text: `a double or a sum of ${2 * Math.ceil(k / 2)}`, fa: (x: number, y: number) => x === y, fb: (x: number, y: number) => x + y === 2 * Math.ceil(k / 2) },
        { a: 'a double', b: 'a sum greater than 8', text: 'a double or a sum greater than 8', fa: (x: number, y: number) => x === y, fb: (x: number, y: number) => x + y > 8 },
        { a: 'both dice even', b: 'a sum of 8', text: 'both dice even or a sum of 8', fa: (x: number, y: number) => x % 2 === 0 && y % 2 === 0, fb: (x: number, y: number) => x + y === 8 },
        { a: 'a 1 on the first die', b: 'a 1 on the second die', text: 'at least one of the dice shows a 1', fa: (x: number) => x === 1, fb: (_x: number, y: number) => y === 1 },
        { a: 'at least one 5', b: 'a sum of 10 or more', text: 'at least one 5 or a sum of 10 or more', fa: (x: number, y: number) => x === 5 || y === 5, fb: (x: number, y: number) => x + y >= 10 },
      ]);
      const all: Array<[number, number]> = [];
      for (let x = 1; x <= 6; x++) for (let y = 1; y <= 6; y++) all.push([x, y]);
      const A = all.filter(([x, y]) => ev.fa(x, y));
      const B = all.filter(([x, y]) => ev.fb(x, y));
      const both = all.filter(([x, y]) => ev.fa(x, y) && ev.fb(x, y));
      const union = all.filter(([x, y]) => ev.fa(x, y) || ev.fb(x, y));
      const show = (xs: Array<[number, number]>) => xs.map(([x, y]) => `(${x}, ${y})`).join(', ');
      const ask = fractionAsk(rng, 0.3);
      return {
        type: 'numeric',
        prompt: `Two fair six-sided dice are rolled. What is the probability of getting ${ev.text}? ${ask.text}`,
        answer: union.length / 36,
        form: ask.form,
        calculator: 'not-allowed',
        hints: [
          'Draw a 6 × 6 table of outcomes (first die down the side, second die across the top). There are 36 equally likely outcomes.',
          'Mark every outcome that fits. Check you have not counted any outcome twice.',
        ],
        solution: [
          'There are $6 \\times 6 = 36$ equally likely outcomes.',
          `Outcomes with ${ev.a}: ${A.length}. Outcomes with ${ev.b}: ${B.length}.`,
          `${both.length === 1 ? 'One outcome fits both' : `${both.length} outcomes fit both`}: ${show(both)}. Count ${both.length === 1 ? 'it' : 'them'} only once: $${A.length} + ${B.length} - ${both.length} = ${union.length}$.`,
          `$P = ${pTex(union.length, 36)}$`,
          `A common mistake is to add $${frac(A.length, 36, true)} + ${frac(B.length, 36, true)}$, which counts ${show(both)} twice.`,
        ].join('\n\n'),
      };
    }

    const e = experiment(rng);
    const N = e.rows.length * e.cols.length;
    const results = e.rows.flatMap((r) => e.cols.map((c) => e.op!.f(Number(r), Number(c))));
    const distinct = [...new Set(results)].sort((a, b) => a - b);
    const word = e.op!.word.replace(/ \(.*\)/, '');
    const kind = rng.pick(['equal', 'greater', 'less', 'even'] as const);
    let test: (v: number) => boolean;
    let desc: string;
    if (kind === 'equal') {
      const v = rng.pick(distinct);
      test = (x) => x === v;
      desc = `the ${word} is ${v}`;
    } else if (kind === 'greater') {
      const v = rng.pick(distinct.slice(0, -1));
      test = (x) => x > v;
      desc = `the ${word} is greater than ${v}`;
    } else if (kind === 'less') {
      const v = rng.pick(distinct.slice(1));
      test = (x) => x < v;
      desc = `the ${word} is less than ${v}`;
    } else {
      const odd = rng.chance(0.5);
      test = (x) => (odd ? x % 2 === 1 : x % 2 === 0);
      desc = `the ${word} is ${odd ? 'odd' : 'even'}`;
    }
    const fav = results.filter(test).length;
    const showTable = difficulty === 2;
    const ask = difficulty === 2 ? { text: 'Give your answer as a fraction.', form: 'any' as const } : fractionAsk(rng, 0.35);
    return {
      type: 'numeric',
      prompt: `${e.text}${showTable ? ` The table shows every possible outcome.\n\n${tableMarkdown(e)}\n\n` : ' '}What is the probability that ${desc}? ${ask.text}`,
      answer: fav / N,
      form: ask.form,
      calculator: 'not-allowed',
      hints: showTable
        ? [`There are ${N} equally likely outcomes in the table.`, `Count the cells where ${desc}.`]
        : [
            `Draw a table with one ${e.rows.length === e.cols.length ? 'die' : 'spinner'} down the side and the other across the top, and fill in every ${word}.`,
            `There are ${e.rows.length} × ${e.cols.length} = ${N} equally likely outcomes. Count the ones where ${desc}.`,
          ],
      solution: [
        ...(showTable ? [] : [`Sample space table:\n\n${tableMarkdown(e)}`]),
        `There are ${N} equally likely outcomes, and ${fav} of them ${fav === 1 ? 'has' : 'have'} ${desc.replace(/^the [a-z]+ is /, `a ${word} that is `)}.`,
        `$P = ${pTex(fav, N)}$`,
      ].join('\n\n'),
    };
  },
};

// ---------------- Tree diagrams ----------------

interface TreeExperiment {
  text: string;
  stages: string[][];
  events: Array<{ text: string; test: (o: string[]) => boolean }>;
}

function treeExperiment(rng: Rng, big: boolean): TreeExperiment {
  const coin = ['H', 'T'];
  const countH = (o: string[]) => o.filter((x) => x === 'H').length;
  if (big && rng.chance(0.5)) {
    const cols = ['Red', 'Blue', 'Green'];
    return {
      text: 'A fair coin is tossed twice, and then a spinner with three equal sections (red, blue and green) is spun.',
      stages: [coin, coin, cols],
      events: [
        { text: 'two heads and red', test: (o) => countH(o) === 2 && o[2] === 'Red' },
        { text: 'exactly one head and blue', test: (o) => countH(o) === 1 && o[2] === 'Blue' },
        { text: 'at least one tail and green', test: (o) => countH(o) < 2 && o[2] === 'Green' },
        { text: 'two tails or red (or both)', test: (o) => countH(o) === 0 || o[2] === 'Red' },
        { text: 'not getting green', test: (o) => o[2] !== 'Green' },
      ],
    };
  }
  const which = rng.pick(['coins', 'coin-spinner', 'meal', 'spinner-coin', 'spinners'] as const);
  if (which === 'spinners') {
    const nums = ['1', '2', '3'];
    const sum = (o: string[]) => Number(o[0]) + Number(o[1]);
    return {
      text: 'Two spinners each have three equal sections numbered 1, 2 and 3. Both spinners are spun.',
      stages: [nums, nums],
      events: [
        { text: 'a total of 4', test: (o) => sum(o) === 4 },
        { text: 'a total greater than 4', test: (o) => sum(o) > 4 },
        { text: 'two odd numbers', test: (o) => Number(o[0]) % 2 === 1 && Number(o[1]) % 2 === 1 },
        { text: 'the same number on both spinners', test: (o) => o[0] === o[1] },
        { text: 'at least one 3', test: (o) => o[0] === '3' || o[1] === '3' },
      ],
    };
  }
  if (which === 'coins') {
    return {
      text: 'A fair coin is tossed three times.',
      stages: [coin, coin, coin],
      events: [
        { text: 'exactly two heads', test: (o) => countH(o) === 2 },
        { text: 'exactly one head', test: (o) => countH(o) === 1 },
        { text: 'at least one head', test: (o) => countH(o) >= 1 },
        { text: 'at least two tails', test: (o) => countH(o) <= 1 },
        { text: 'all three the same', test: (o) => countH(o) === 0 || countH(o) === 3 },
        { text: 'a head on the first toss and a tail on the last toss', test: (o) => o[0] === 'H' && o[2] === 'T' },
        { text: 'no heads at all', test: (o) => countH(o) === 0 },
        { text: 'more heads than tails', test: (o) => countH(o) >= 2 },
      ],
    };
  }
  if (which === 'coin-spinner') {
    const cols = ['Red', 'Blue', 'Green'];
    return {
      text: 'A fair coin is tossed and then a spinner with three equal sections (red, blue and green) is spun.',
      stages: [coin, cols],
      events: [
        { text: 'a head and blue', test: (o) => o[0] === 'H' && o[1] === 'Blue' },
        { text: 'a tail or red (or both)', test: (o) => o[0] === 'T' || o[1] === 'Red' },
        { text: 'a head or green (or both)', test: (o) => o[0] === 'H' || o[1] === 'Green' },
        { text: 'a tail and not red', test: (o) => o[0] === 'T' && o[1] !== 'Red' },
      ],
    };
  }
  if (which === 'spinner-coin') {
    const nums = ['1', '2', '3', '4'];
    return {
      text: 'A spinner with four equal sections numbered 1 to 4 is spun, and then a fair coin is tossed.',
      stages: [nums, coin],
      events: [
        { text: 'an even number and a head', test: (o) => Number(o[0]) % 2 === 0 && o[1] === 'H' },
        { text: 'a 4 or a tail (or both)', test: (o) => o[0] === '4' || o[1] === 'T' },
        { text: 'a number less than 3 and a tail', test: (o) => Number(o[0]) < 3 && o[1] === 'T' },
        { text: 'an odd number or a head (or both)', test: (o) => Number(o[0]) % 2 === 1 || o[1] === 'H' },
      ],
    };
  }
  return {
    text: 'A school fundraiser sells lucky-dip lunches. Each lunch has a filling chosen at random (chicken, cheese or egg) and a drink chosen at random (juice or water).',
    stages: [
      ['Chicken', 'Cheese', 'Egg'],
      ['Juice', 'Water'],
    ],
    events: [
      { text: 'egg and water', test: (o) => o[0] === 'Egg' && o[1] === 'Water' },
      { text: 'not chicken', test: (o) => o[0] !== 'Chicken' },
      { text: 'cheese or juice (or both)', test: (o) => o[0] === 'Cheese' || o[1] === 'Juice' },
      { text: 'chicken and juice', test: (o) => o[0] === 'Chicken' && o[1] === 'Juice' },
      { text: 'water', test: (o) => o[1] === 'Water' },
    ],
  };
}

function allOutcomes(stages: string[][]): string[][] {
  return stages.reduce<string[][]>((acc, s) => acc.flatMap((o) => s.map((b) => [...o, b])), [[]]);
}

export const treeDiagrams: QuestionTemplate = {
  id: 'm9.pro.theoretical.tree-diagram',
  topicId: 'm9.pro.theoretical',
  title: 'Tree diagrams: equally likely outcomes, then branch probabilities',
  difficulties: [3, 4, 5],
  generate({ rng, difficulty }) {
    if (difficulty === 5) {
      const r = rng.int(2, 6);
      const b = rng.int(2, 6);
      const T = r + b;
      const replace = rng.chance(0.5);
      const name = rng.pick(NAMES);
      const item = rng.pick(['counters', 'marbles']);
      const T2 = replace ? T : T - 1;
      // Probabilities on the second set of branches.
      const p2 = (first: 'R' | 'B') => ({
        R: replace ? r : first === 'R' ? r - 1 : r,
        B: replace ? b : first === 'B' ? b - 1 : b,
      });
      const paths = {
        RR: r * p2('R').R,
        RB: r * p2('R').B,
        BR: b * p2('B').R,
        BB: b * p2('B').B,
      };
      const den = T * T2;
      const ev = rng.pick([
        { text: 'both are red', keys: ['RR'] },
        { text: 'both are blue', keys: ['BB'] },
        { text: 'they are the same colour', keys: ['RR', 'BB'] },
        { text: 'one is red and one is blue', keys: ['RB', 'BR'] },
        { text: 'at least one is red', keys: ['RR', 'RB', 'BR'] },
      ] as const);
      const num = ev.keys.reduce((s, k) => s + paths[k], 0);
      const branch = (k: 'RR' | 'RB' | 'BR' | 'BB') => {
        const first = k[0] as 'R' | 'B';
        const second = k[1] as 'R' | 'B';
        const a = first === 'R' ? r : b;
        const c = p2(first)[second];
        return `P(${first}${second}) = $\\frac{${a}}{${T}} \\times \\frac{${c}}{${T2}} = \\frac{${a * c}}{${den}}$`;
      };
      const figure = {
        svg: treeDiagram(
          [
            ['R', 'B'],
            ['R', 'B'],
          ],
          {
            probs: (stage, path, k) => {
              if (stage === 0) return k === 0 ? `${r}/${T}` : `${b}/${T}`;
              const q = p2(path[0] as 'R' | 'B');
              return k === 0 ? `${q.R}/${T2}` : `${q.B}/${T2}`;
            },
            outcomes: true,
          },
        ),
        alt: `Tree diagram for two draws. First draw: red ${r}/${T}, blue ${b}/${T}. Second draw probabilities out of ${T2}.`,
      };
      return {
        type: 'numeric',
        marks: 3,
        figure,
        prompt: `A bag contains ${r} red and ${b} blue ${item}. ${name} takes one ${item.replace(/s$/, '')} at random, ${replace ? 'notes its colour and **puts it back**' : 'notes its colour and **does not put it back**'}. Then ${name} takes a second ${item.replace(/s$/, '')} at random.\n\nThe tree diagram shows the probabilities (R = red, B = blue). What is the probability that ${ev.text}? Give your answer as a fraction.`,
        answer: num / den,
        calculator: 'allowed',
        hints: [
          'Multiply along the branches to find the probability of each outcome (RR, RB, BR, BB).',
          ev.keys.length > 1 ? `Then add the probabilities of the outcomes where ${ev.text}.` : 'Only one path gives this outcome.',
          replace
            ? 'The counter is put back, so the second draw has the same probabilities as the first (independent events).'
            : 'The counter is not put back, so there is one fewer counter for the second draw (dependent events).',
        ],
        solution: [
          replace
            ? `The ${item} are put back, so the two draws are **independent**: the second draw is out of ${T} again.`
            : `The first ${item.replace(/s$/, '')} is not put back, so the draws are **dependent**: the second draw is out of ${T2}, and there is one fewer of the colour taken first.`,
          ...ev.keys.map((k) => branch(k)),
          ev.keys.length > 1
            ? `Add the paths: $${ev.keys.map((k) => `\\frac{${paths[k]}}{${den}}`).join(' + ')} = ${pTex(num, den)}$`
            : `So $P = ${pTex(num, den)}$`,
        ].join('\n\n'),
      };
    }

    const ex = treeExperiment(rng, difficulty === 4);
    const ev = rng.pick(ex.events);
    const outs = allOutcomes(ex.stages);
    const fav = outs.filter(ev.test);
    const N = outs.length;
    const sep = ex.stages.every((s) => s.every((x) => x.length === 1)) ? '' : ', ';
    const showO = (o: string[]) => (sep ? `(${o.join(sep)})` : o.join(''));
    const showFig = difficulty === 3;
    const ask = fractionAsk(rng, difficulty === 4 ? 0.35 : 0);
    return {
      type: 'numeric',
      ...(showFig && {
        figure: {
          svg: treeDiagram(ex.stages, { outcomes: true }),
          alt: `Tree diagram listing all ${N} equally likely outcomes: ${outs.map(showO).join(', ')}.`,
        },
      }),
      prompt: `${ex.text}${showFig ? ' The tree diagram shows all the possible outcomes.' : ''}\n\nWhat is the probability of getting ${ev.text}? ${ask.text}`,
      answer: fav.length / N,
      form: ask.form,
      calculator: 'not-allowed',
      hints: showFig
        ? [`Each of the ${N} outcomes at the end of the tree is equally likely.`, `Count the outcomes with ${ev.text}.`]
        : [
            `Draw a tree diagram with ${ex.stages.length} stages. How many outcomes are there at the end?`,
            `${ex.stages.map((s) => s.length).join(' × ')} = ${N} equally likely outcomes. Count those with ${ev.text}.`,
          ],
      solution: [
        `There are ${ex.stages.map((s) => s.length).join(' × ')} = ${N} equally likely outcomes.`,
        `Outcomes with ${ev.text}: ${fav.map(showO).join(', ')} (${fav.length}).`,
        `$P = ${pTex(fav.length, N)}$`,
      ].join('\n\n'),
    };
  },
};

// ---------------- Two-way tables ----------------

interface TwoWayContext {
  intro: string;
  rows: [string, string];
  cols: [string, string];
  rowDesc: [string, string];
  colDesc: [string, string];
  who: string;
}

const TWO_WAY: readonly TwoWayContext[] = [
  {
    intro: 'Year 9 and Year 10 students at a school were asked whether they have a pet.',
    rows: ['Year 9', 'Year 10'],
    cols: ['Pet', 'No pet'],
    rowDesc: ['is in Year 9', 'is in Year 10'],
    colDesc: ['has a pet', 'does not have a pet'],
    who: 'student',
  },
  {
    intro: 'Students were asked whether they play a summer sport and whether they walk or bike to school.',
    rows: ['Summer sport', 'No summer sport'],
    cols: ['Walk or bike', 'Other transport'],
    rowDesc: ['plays a summer sport', 'does not play a summer sport'],
    colDesc: ['walks or bikes to school', 'gets to school another way'],
    who: 'student',
  },
  {
    intro: 'Students on a school camp chose one activity, and said whether this was their first camp.',
    rows: ['Kayaking', 'High ropes'],
    cols: ['First camp', 'Been before'],
    rowDesc: ['chose kayaking', 'chose high ropes'],
    colDesc: ['was on their first camp', 'had been on a camp before'],
    who: 'student',
  },
  {
    intro: 'Visitors to a school gala were asked whether they bought a sausage and whether they bought a raffle ticket.',
    rows: ['Sausage', 'No sausage'],
    cols: ['Raffle ticket', 'No raffle ticket'],
    rowDesc: ['bought a sausage', 'did not buy a sausage'],
    colDesc: ['bought a raffle ticket', 'did not buy a raffle ticket'],
    who: 'visitor',
  },
];

export const twoWayTable: QuestionTemplate = {
  id: 'm9.pro.theoretical.two-way-table',
  topicId: 'm9.pro.theoretical',
  title: 'Probabilities from a two-way table',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    const c = rng.pick(TWO_WAY);
    const cell = [
      [rng.int(4, 30), rng.int(4, 30)],
      [rng.int(4, 30), rng.int(4, 30)],
    ] as const;
    const at = (i: number, j: number) => cell[i]![j]!;
    const rowT = [at(0, 0) + at(0, 1), at(1, 0) + at(1, 1)];
    const colT = [at(0, 0) + at(1, 0), at(0, 1) + at(1, 1)];
    const N = rowT[0]! + rowT[1]!;
    const i = rng.int(0, 1);
    const j = rng.int(0, 1);
    const table = (hide: Array<[number, number]> = []) => {
      const v = (a: number, b: number) => (hide.some(([x, y]) => x === a && y === b) ? '?' : String(at(a, b)));
      return [
        `| | ${c.cols[0]} | ${c.cols[1]} | Total |`,
        '|---|---|---|---|',
        `| **${c.rows[0]}** | ${v(0, 0)} | ${v(0, 1)} | ${rowT[0]} |`,
        `| **${c.rows[1]}** | ${v(1, 0)} | ${v(1, 1)} | ${rowT[1]} |`,
        `| **Total** | ${colT[0]} | ${colT[1]} | ${N} |`,
      ].join('\n');
    };
    const lead = `${c.intro} The two-way table shows the results.`;
    const pick = `One ${c.who} is chosen at random from everyone in the table.`;

    if (difficulty === 2) {
      if (rng.chance(0.5)) {
        return {
          type: 'numeric',
          prompt: `${lead}\n\n${table()}\n\n${pick} What is the probability that the ${c.who} ${c.rowDesc[i]} **and** ${c.colDesc[j]}? Give your answer as a fraction.`,
          answer: at(i, j) / N,
          calculator: 'not-allowed',
          hints: [`The total number of ${c.who}s is in the bottom-right corner.`, `Find the cell in the "${c.rows[i]}" row and the "${c.cols[j]}" column.`],
          solution: `There are ${N} ${c.who}s altogether, and ${at(i, j)} of them ${c.rowDesc[i]} and ${c.colDesc[j]} (the "${c.rows[i]}" row, "${c.cols[j]}" column).\n\n$P = ${pTex(at(i, j), N)}$`,
        };
      }
      const byRow = rng.chance(0.5);
      const fav = byRow ? rowT[i]! : colT[j]!;
      const d = byRow ? c.rowDesc[i] : c.colDesc[j];
      return {
        type: 'numeric',
        prompt: `${lead}\n\n${table()}\n\n${pick} What is the probability that the ${c.who} ${d}? Give your answer as a fraction.`,
        answer: fav / N,
        calculator: 'not-allowed',
        hints: [`Use the totals. The total number of ${c.who}s is ${N}.`, `Find the total for "${byRow ? c.rows[i] : c.cols[j]}".`],
        solution: `${fav} of the ${N} ${c.who}s ${d} (the "${byRow ? c.rows[i] : c.cols[j]}" total).\n\n$P = ${pTex(fav, N)}$`,
      };
    }

    if (difficulty === 3) {
      const fav = rowT[i]! + colT[j]! - at(i, j);
      const ask = fractionAsk(rng, 0.3);
      return {
        type: 'numeric',
        prompt: `${lead}\n\n${table()}\n\n${pick} What is the probability that the ${c.who} ${c.rowDesc[i]} **or** ${c.colDesc[j]} (or both)? ${ask.text}`,
        answer: fav / N,
        form: ask.form,
        calculator: 'not-allowed',
        hints: [
          `Add the "${c.rows[i]}" total and the "${c.cols[j]}" total…`,
          `…but the ${at(i, j)} ${c.who}s in the "${c.rows[i]}" row **and** the "${c.cols[j]}" column have then been counted twice.`,
        ],
        solution: [
          `"${c.rows[i]}" total: ${rowT[i]}. "${c.cols[j]}" total: ${colT[j]}.`,
          `${at(i, j)} ${c.who}s are in both, so they would be counted twice. Subtract them once: $${rowT[i]} + ${colT[j]} - ${at(i, j)} = ${fav}$.`,
          `(Check: the only ${c.who}s left out are the ${at(1 - i, 1 - j)} in the other corner, and $${N} - ${at(1 - i, 1 - j)} = ${fav}$ ✓.)`,
          `$P = ${pTex(fav, N)}$`,
        ].join('\n\n'),
      };
    }

    // difficulty 4
    if (rng.chance(0.5)) {
      const byRow = rng.chance(0.5);
      const given = byRow ? c.rowDesc[i] : c.colDesc[j];
      const target = byRow ? c.colDesc[j] : c.rowDesc[i];
      const totalGiven = byRow ? rowT[i]! : colT[j]!;
      return {
        type: 'numeric',
        prompt: `${lead}\n\n${table()}\n\nA ${c.who} who ${given} is chosen at random. What is the probability that this ${c.who} ${target}? Give your answer as a fraction.`,
        answer: at(i, j) / totalGiven,
        calculator: 'not-allowed',
        hints: [
          `The ${c.who} is chosen only from those who ${given}. How many is that?`,
          `Of those, how many ${target}?`,
        ],
        solution: [
          `We only look at the ${totalGiven} ${c.who}s who ${given}. This is the new sample space.`,
          `${at(i, j)} of them ${target}.`,
          `$P = ${pTex(at(i, j), totalGiven)}$`,
          `(Not $${frac(at(i, j), N, true)}$: the ${c.who} is not chosen from all ${N}.)`,
        ].join('\n\n'),
      };
    }
    // Missing cells: hide one cell in each row (different columns), then ask about one of them.
    const hideCol = rng.int(0, 1);
    const hidden: Array<[number, number]> = [
      [0, hideCol],
      [1, 1 - hideCol],
    ];
    const [hi, hj] = rng.pick(hidden);
    const ask = fractionAsk(rng, 0.3);
    return {
      type: 'numeric',
      prompt: `${lead} Some entries are missing.\n\n${table(hidden)}\n\n${pick} What is the probability that the ${c.who} ${c.rowDesc[hi]} and ${c.colDesc[hj]}? ${ask.text}`,
      answer: at(hi, hj) / N,
      form: ask.form,
      calculator: 'not-allowed',
      hints: ['Use the row totals to fill in the missing numbers.', `Then find the cell for "${c.rows[hi]}" and "${c.cols[hj]}" and divide by the overall total.`],
      solution: [
        `Missing value in the "${c.rows[hi]}" row: $${rowT[hi]} - ${at(hi, 1 - hj)} = ${at(hi, hj)}$.`,
        `$P = ${pTex(at(hi, hj), N)}$`,
      ].join('\n\n'),
    };
  },
};

export const theoreticalTemplates: QuestionTemplate[] = [singleEvent, sampleSpaceTable, treeDiagrams, twoWayTable];
