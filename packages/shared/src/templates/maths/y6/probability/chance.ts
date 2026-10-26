import type { Rng } from '../../../../rng';
import type { QuestionTemplate, TemplateOutput } from '../../../types';
import { NAMES, PLACES, frac, gcd } from '../../../format';
import { COLOURS, COLOUR_FILL, cap, probabilityLine, spinner, type Colour, type Sector } from './chance-helpers';

// m6.pro.chance — chance words and the 0–1 probability line, sample spaces and events,
// P(event) = ways it can happen ÷ total outcomes (equally likely), spinners, and checking that
// the probabilities of all the outcomes add to 1. Year 6: one trial at a time, no tree diagrams.
// Fraction answers are accepted in any equivalent form unless the prompt asks for simplest form.

/** "\frac{4}{12} = \frac{1}{3}" (or just "\frac{3}{7}" when already simplest). */
function pTex(n: number, d: number): string {
  const raw = frac(n, d, true);
  const simple = frac(n, d);
  return raw === simple ? raw : `${raw} = ${simple}`;
}

const ITEMS = ['counters', 'marbles', 'lollies', 'beads'] as const;

// ---------------------------------------------------------------- chance words
type Word = 'imp' | 'unl' | 'even' | 'lik' | 'cert';
const WORD_OPTIONS = [
  { id: 'imp', text: 'Impossible' },
  { id: 'unl', text: 'Unlikely' },
  { id: 'even', text: 'Even chance' },
  { id: 'lik', text: 'Likely' },
  { id: 'cert', text: 'Certain' },
];
const WORD_TEXT: Record<Word, string> = { imp: 'impossible', unl: 'unlikely', even: 'even chance', lik: 'likely', cert: 'certain' };

function wordFor(fav: number, total: number): Word {
  if (fav === 0) return 'imp';
  if (fav === total) return 'cert';
  if (2 * fav === total) return 'even';
  return 2 * fav < total ? 'unl' : 'lik';
}

function countFeedback(correct: Word, fav: number, total: number): Record<string, string> {
  const outOf = `${fav} out of ${total}`;
  const all: Record<Word, string> = {
    imp: `It can happen: ${outOf} outcomes work. Impossible means there is no way at all.`,
    cert: `It might not happen: ${total - fav} of the ${total} outcomes don't work. Certain means it must happen.`,
    even: `Even chance means exactly half of the outcomes work. Here it is ${outOf}.`,
    lik: `Likely means more than half of the outcomes work. Here it is ${outOf}.`,
    unl: `Unlikely means fewer than half of the outcomes work (but not none). Here it is ${outOf}.`,
  };
  delete (all as Partial<Record<Word, string>>)[correct];
  return all;
}

const NUMBER_FEEDBACK: Record<Word, string> = {
  imp: 'Impossible means a probability of exactly 0.',
  cert: 'Certain means a probability of exactly 1.',
  even: 'Even chance means a probability of exactly $\\frac{1}{2}$ (0.5).',
  lik: 'Likely means a probability between $\\frac{1}{2}$ and 1.',
  unl: 'Unlikely means a probability between 0 and $\\frac{1}{2}$.',
};

interface PValue {
  tex: string;
  v: number;
}
const P_VALUES: PValue[] = [
  { tex: '0', v: 0 },
  { tex: '1', v: 1 },
  { tex: '\\frac{1}{2}', v: 0.5 },
  { tex: '0.5', v: 0.5 },
  ...[0.1, 0.2, 0.3, 0.4, 0.05].map((v) => ({ tex: String(v), v })),
  ...[0.6, 0.7, 0.8, 0.9, 0.95].map((v) => ({ tex: String(v), v })),
  ...([[1, 4], [1, 3], [1, 10], [2, 5], [3, 10], [1, 5], [3, 4], [2, 3], [4, 5], [7, 10], [3, 5], [9, 10]] as const).map(([n, d]) => ({ tex: `\\frac{${n}}{${d}}`, v: n / d })),
];
const wordForP = (v: number): Word => (v === 0 ? 'imp' : v === 1 ? 'cert' : v === 0.5 ? 'even' : v < 0.5 ? 'unl' : 'lik');

export const chanceWords: QuestionTemplate = {
  id: 'm6.pro.chance.chance-words',
  topicId: 'm6.pro.chance',
  title: 'Describe chance with words and the 0–1 probability line',
  difficulties: [1, 2],
  generate({ rng, difficulty }) {
    const name = rng.pick(NAMES);
    if (difficulty === 1) {
      if (rng.chance(0.3)) {
        const ev = rng.pick([
          { e: 'a number less than 7', n: 6 },
          { e: 'a 7', n: 0 },
          { e: 'a 0', n: 0 },
          { e: 'an even number', n: 3 },
          { e: 'an odd number', n: 3 },
          { e: 'a number less than 4', n: 3 },
          { e: 'a number greater than 3', n: 3 },
          { e: 'a 6', n: 1 },
          { e: 'a 1 or a 2', n: 2 },
          { e: 'a number greater than 4', n: 2 },
          { e: 'a number greater than 1', n: 5 },
          { e: 'a number less than 5', n: 4 },
          { e: 'a number from 1 to 6', n: 6 },
        ]);
        const w = wordFor(ev.n, 6);
        return {
          type: 'mcq',
          prompt: `${name} rolls a normal six-sided die once. How likely is it that ${name} rolls ${ev.e}?`,
          options: WORD_OPTIONS,
          correct: w,
          feedback: countFeedback(w, ev.n, 6),
          shuffle: false,
          calculator: 'not-allowed',
          hints: ['A die has 6 outcomes: 1, 2, 3, 4, 5 and 6.', 'How many of the 6 outcomes give this event? Is that none, fewer than half, half, more than half, or all?'],
          solution: `${ev.n} of the 6 outcomes give ${ev.e}. ${ev.n === 0 ? 'None of them, so it is **impossible**.' : ev.n === 6 ? 'All of them, so it is **certain**.' : ev.n === 3 ? 'That is exactly half, so it is an **even chance**.' : ev.n < 3 ? 'That is fewer than half, so it is **unlikely**.' : 'That is more than half, so it is **likely**.'}`,
        };
      }
      const items = rng.pick(ITEMS);
      const [cA, cB, cC] = rng.sample(COLOURS, 3) as [Colour, Colour, Colour];
      const kind = rng.pick(['imp', 'unl', 'even', 'lik', 'cert', 'unl', 'lik'] as const);
      let a: number;
      let b: number;
      let ask: string;
      let fav: number;
      if (kind === 'even') {
        a = rng.int(2, 6);
        b = a;
        ask = `a ${cA} one`;
        fav = a;
      } else if (kind === 'lik') {
        a = rng.int(4, 9);
        b = rng.int(1, a - 1);
        ask = `a ${cA} one`;
        fav = a;
      } else if (kind === 'unl') {
        a = rng.int(1, 4);
        b = rng.int(a + 1, 9);
        ask = `a ${cA} one`;
        fav = a;
      } else if (kind === 'imp') {
        a = rng.int(2, 7);
        b = rng.int(2, 7);
        ask = `a ${cC} one`;
        fav = 0;
      } else {
        a = rng.int(2, 7);
        b = rng.int(2, 7);
        ask = `a ${cA} one or a ${cB} one`;
        fav = a + b;
      }
      const total = a + b;
      return {
        type: 'mcq',
        prompt: `A bag has ${a} ${cA} ${items} and ${b} ${cB} ${items}. ${name} takes one without looking. How likely is it that ${name} takes ${ask}?`,
        options: WORD_OPTIONS,
        correct: kind,
        feedback: countFeedback(kind, fav, total),
        shuffle: false,
        calculator: 'not-allowed',
        hints: [`There are ${total} ${items} altogether.`, 'How many of them would give this result? Compare that with half of the bag.'],
        solution: `There are $${a} + ${b} = ${total}$ ${items}, and ${fav} of them ${fav === 1 ? 'gives' : 'give'} ${ask}.\n\n${fav === 0 ? 'None of them do, so it is **impossible**.' : fav === total ? 'All of them do, so it is **certain**.' : 2 * fav === total ? 'That is exactly half, so it is an **even chance**.' : 2 * fav < total ? 'That is fewer than half, so it is **unlikely**.' : 'That is more than half, so it is **likely**.'}`,
      };
    }
    // difficulty 2: from a probability (number or arrow on the probability line) to a word
    if (rng.chance(0.4)) {
      const v = rng.pick([0, 0.5, 1, 0.1, 0.2, 0.25, 0.3, 0.7, 0.75, 0.8, 0.9]);
      const w = wordForP(v);
      const fb = { ...NUMBER_FEEDBACK } as Partial<Record<Word, string>>;
      delete fb[w];
      return {
        type: 'mcq',
        prompt: 'Arrow A on the probability line shows the chance of an event. Which word best describes the chance of the event?',
        figure: {
          svg: probabilityLine(v),
          alt: `A probability line from 0 to 1 with a mark at one half. Arrow A points at ${v === 0 ? '0' : v === 1 ? '1' : v === 0.5 ? 'one half' : `about ${v}`}.`,
        },
        options: WORD_OPTIONS,
        correct: w,
        feedback: fb as Record<string, string>,
        shuffle: false,
        calculator: 'not-allowed',
        hints: ['0 means impossible and 1 means certain.', 'Is the arrow exactly on a mark, or between two marks? Which half of the line is it in?'],
        solution: `Arrow A is at ${v === 0 ? '0' : v === 1 ? '1' : v === 0.5 ? 'exactly $\\frac{1}{2}$' : `about ${v}, which is ${v < 0.5 ? 'between 0 and $\\frac{1}{2}$' : 'between $\\frac{1}{2}$ and 1'}`}, so the event is **${WORD_TEXT[w]}**.`,
      };
    }
    const pv = rng.pick(P_VALUES);
    const w = wordForP(pv.v);
    const ctx = rng.pick([
      `The weather app says the probability that it will rain in ${rng.pick(PLACES)} tomorrow is $${pv.tex}$.`,
      `The probability that the school bus is late on Monday is $${pv.tex}$.`,
      `The probability that ${name}'s netball team wins on Saturday is $${pv.tex}$.`,
      `The probability that a tūī visits ${name}'s garden today is $${pv.tex}$.`,
      `The probability that it is sunny at the beach on Saturday is $${pv.tex}$.`,
      `The probability that ${name}'s class wins the school quiz is $${pv.tex}$.`,
    ]);
    const fb = { ...NUMBER_FEEDBACK } as Partial<Record<Word, string>>;
    delete fb[w];
    return {
      type: 'mcq',
      prompt: `${ctx} Which word best describes this chance?`,
      options: WORD_OPTIONS,
      correct: w,
      feedback: fb as Record<string, string>,
      shuffle: false,
      calculator: 'not-allowed',
      hints: ['Probabilities go from 0 (impossible) to 1 (certain). $\\frac{1}{2}$ is in the middle.', `Is $${pv.tex}$ less than, equal to or more than $\\frac{1}{2}$?`],
      solution:
        pv.v === 0
          ? 'A probability of 0 means it cannot happen: **impossible**.'
          : pv.v === 1
            ? 'A probability of 1 means it must happen: **certain**.'
            : pv.v === 0.5
              ? `$${pv.tex}$ is exactly a half: **even chance**.`
              : `$${pv.tex}$ is ${pv.v < 0.5 ? 'between 0 and $\\frac{1}{2}$' : 'between $\\frac{1}{2}$ and 1'}, so it is **${WORD_TEXT[w]}**.`,
    };
  },
};

// ---------------------------------------------------------------- sample space and events
interface NumEvent {
  name: string;
  test: (x: number) => boolean;
}
function numberEvents(rng: Rng, N: number): NumEvent[] {
  const hi = rng.int(2, N - 2);
  const lo = rng.int(3, N - 1);
  return [
    { name: 'an even number', test: (x) => x % 2 === 0 },
    { name: 'an odd number', test: (x) => x % 2 === 1 },
    { name: 'a multiple of 3', test: (x) => x % 3 === 0 },
    { name: 'a multiple of 4', test: (x) => x % 4 === 0 },
    { name: `greater than ${hi}`, test: (x) => x > hi },
    { name: `less than ${lo}`, test: (x) => x < lo },
    { name: `a factor of ${N}`, test: (x) => N % x === 0 },
    { name: 'a square number', test: (x) => Number.isInteger(Math.sqrt(x)) },
  ];
}

export const sampleSpace: QuestionTemplate = {
  id: 'm6.pro.chance.sample-space',
  topicId: 'm6.pro.chance',
  title: 'Sample spaces and the outcomes in an event',
  difficulties: [1, 2],
  generate({ rng, difficulty }) {
    const name = rng.pick(NAMES);
    if (difficulty === 1) {
      if (rng.chance(0.5)) {
        const N = rng.int(3, 12);
        const M = rng.int(5, 20);
        const s = rng.pick([
          { t: `${name} rolls a normal six-sided die.`, n: 6, list: '1, 2, 3, 4, 5, 6' },
          { t: `${name} tosses a coin.`, n: 2, list: 'heads, tails' },
          { t: `A spinner has ${N} equal sections numbered 1 to ${N}. ${name} spins it once.`, n: N, list: `1, 2, …, ${N}` },
          { t: `${name} picks a day of the week at random.`, n: 7, list: 'Monday, Tuesday, …, Sunday' },
          { t: `${name} picks a month of the year at random.`, n: 12, list: 'January, February, …, December' },
          { t: `Cards numbered 1 to ${M} are shuffled and ${name} picks one.`, n: M, list: `1, 2, …, ${M}` },
          { t: `Cards numbered 1 to ${N} are shuffled and ${name} picks one.`, n: N, list: `1, 2, …, ${N}` },
        ]);
        return {
          type: 'numeric',
          prompt: `${s.t} How many different outcomes are in the **sample space**?`,
          answer: s.n,
          form: 'integer',
          calculator: 'not-allowed',
          hints: ['The sample space is the list of every possible outcome.', 'Try writing the list, then count it.'],
          solution: `The sample space is ${s.list}. That is **${s.n}** outcomes.`,
        };
      }
      // Spinner with a repeated colour: each outcome is listed once.
      const distinct = rng.sample(COLOURS, rng.int(3, 4)) as Colour[];
      const k = rng.int(distinct.length + 1, 6);
      let sectors: Colour[];
      do {
        sectors = rng.shuffle([...distinct, ...Array.from({ length: k - distinct.length }, () => rng.pick(distinct))]);
      } while (sectors.some((c, i) => c === sectors[(i + 1) % sectors.length]));
      const firstSeen = sectors.filter((c, i) => sectors.indexOf(c) === i);
      const list = (cs: readonly string[]) => cs.map(cap).join(', ');
      const missing = firstSeen.slice(0, -1);
      const extra = rng.pick(COLOURS.filter((c) => !distinct.includes(c)));
      return {
        type: 'mcq',
        prompt: `${name} spins this spinner once. Which list is the **sample space**?`,
        figure: {
          svg: spinner(sectors.map((c) => ({ label: cap(c), fill: COLOUR_FILL[c] }))),
          alt: `A spinner with ${k} equal sections coloured ${sectors.join(', ')}.`,
        },
        options: [
          { id: 'a', text: list(firstSeen) },
          { id: 'b', text: list(sectors) },
          { id: 'c', text: list(missing) },
          { id: 'd', text: list([...firstSeen, extra]) },
        ],
        correct: 'a',
        feedback: {
          b: 'This lists a colour more than once. The sample space lists each possible outcome only once.',
          c: `This misses out ${cap(firstSeen[firstSeen.length - 1]!)}, which can also happen.`,
          d: `There is no ${extra} section, so ${extra} is not a possible outcome.`,
        },
        calculator: 'not-allowed',
        hints: ['The sample space is every outcome that could happen.', 'List each colour once, even if it is on more than one section.'],
        solution: `The spinner can land on ${list(firstSeen)}. Each outcome is listed once, so the sample space is **${list(firstSeen)}**.`,
      };
    }
    // difficulty 2: outcomes in an event
    if (rng.chance(0.6)) {
      const N = 8;
      let ev: NumEvent;
      let good: number[];
      do {
        ev = rng.pick(numberEvents(rng, N));
        good = Array.from({ length: N }, (_, i) => i + 1).filter(ev.test);
      } while (good.length === 0 || good.length === N);
      return {
        type: 'multi',
        prompt: `A spinner has 8 equal sections numbered 1 to 8. ${name} spins it once.\n\nSelect **all** the outcomes in the event "the number is ${ev.name}".`,
        options: Array.from({ length: N }, (_, i) => ({ id: `n${i + 1}`, text: String(i + 1) })),
        correct: good.map((x) => `n${x}`),
        shuffle: false,
        calculator: 'not-allowed',
        hints: ['The sample space is 1, 2, 3, 4, 5, 6, 7, 8.', `Check each number: is it ${ev.name}?`],
        solution: `The outcomes in the event "the number is ${ev.name}" are **${good.join(', ')}** (${good.length} outcome${good.length === 1 ? '' : 's'}).`,
      };
    }
    const N = rng.pick([10, 12, 15, 20, 24, 30]);
    let ev: NumEvent;
    let good: number[];
    do {
      ev = rng.pick(numberEvents(rng, N));
      good = Array.from({ length: N }, (_, i) => i + 1).filter(ev.test);
    } while (good.length === 0 || good.length === N);
    return {
      type: 'numeric',
      prompt: `Raffle tickets numbered 1 to ${N} are in a hat. One ticket is drawn. How many outcomes are in the event "the number is ${ev.name}"?`,
      answer: good.length,
      form: 'integer',
      calculator: 'not-allowed',
      hints: [`The sample space is the numbers 1 to ${N}.`, 'List the numbers that fit the event, then count them.'],
      solution: `The numbers that are ${ev.name}: ${good.join(', ')}.\n\nThat is **${good.length}** outcomes.`,
    };
  },
};

// ---------------------------------------------------------------- probability of an event
const WORDS = ['AOTEAROA', 'MATARIKI', 'TARANAKI', 'WAIKATO', 'KAKAPO', 'NETBALL', 'CRICKET', 'BANANA', 'PAPAKURA', 'TAKAPUNA'] as const;

export const singleProbability: QuestionTemplate = {
  id: 'm6.pro.chance.probability',
  topicId: 'm6.pro.chance',
  title: 'P(event) = number of ways ÷ total number of outcomes',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    const name = rng.pick(NAMES);
    const formula = `P(\\text{event}) = \\dfrac{\\text{number of ways it can happen}}{\\text{total number of outcomes}}`;
    if (difficulty === 1) {
      if (rng.chance(0.3)) {
        const N = rng.pick([10, 20, 25, 30, 40, 50]);
        const t = rng.int(1, 6);
        return {
          type: 'numeric',
          prompt: `There are ${N} raffle tickets at the school fair. ${name} buys ${t} of them. One ticket is drawn to win the prize. What is the probability that ${name} wins? Give your answer as a fraction.`,
          answer: t / N,
          calculator: 'not-allowed',
          hints: [`Every ticket has the same chance. How many tickets are there altogether?`, `How many of those tickets are ${name}'s?`],
          solution: `${name} has ${t} of the ${N} tickets, so $P(\\text{${name} wins}) = ${frac(t, N, true)}$.`,
        };
      }
      const items = rng.pick(ITEMS);
      const [cA, cB] = rng.sample(COLOURS, 2) as [Colour, Colour];
      const a = rng.int(1, 9);
      const b = rng.int(1, 9);
      const ask = rng.chance(0.5) ? cA : cB;
      const n = ask === cA ? a : b;
      return {
        type: 'numeric',
        prompt: `A bag has ${a} ${cA} ${items} and ${b} ${cB} ${items}. ${name} takes one without looking. What is the probability that it is ${ask}? Give your answer as a fraction.`,
        answer: n / (a + b),
        calculator: 'not-allowed',
        hints: [`How many ${items} are in the bag altogether?`, `The top of the fraction is the number of ${ask} ${items}.`],
        solution: `There are $${a} + ${b} = ${a + b}$ ${items}, and ${n} ${n === 1 ? 'is' : 'are'} ${ask}.\n\n$P(\\text{${ask}}) = ${frac(n, a + b, true)}$`,
      };
    }
    if (difficulty === 2) {
      const kind = rng.pick(['die', 'cards', 'letters'] as const);
      if (kind === 'die') {
        const ev = rng.pick([
          { e: 'an even number', set: [2, 4, 6] },
          { e: 'a number greater than 4', set: [5, 6] },
          { e: 'a multiple of 3', set: [3, 6] },
          { e: 'a number less than 3', set: [1, 2] },
          { e: 'a factor of 6', set: [1, 2, 3, 6] },
          { e: 'a 5', set: [5] },
          { e: 'a number that is not 6', set: [1, 2, 3, 4, 5] },
          { e: 'an odd number', set: [1, 3, 5] },
          { e: 'a number greater than 1', set: [2, 3, 4, 5, 6] },
        ]);
        return {
          type: 'numeric',
          prompt: `${name} rolls a normal six-sided die. What is the probability of rolling ${ev.e}? Give your answer as a fraction.`,
          answer: ev.set.length / 6,
          calculator: 'not-allowed',
          hints: ['The sample space is 1, 2, 3, 4, 5, 6.', `Which of these are ${ev.e}?`],
          solution: `The outcomes that are ${ev.e}: ${ev.set.join(', ')}. That is ${ev.set.length} of the 6 equally likely outcomes.\n\n$P = ${pTex(ev.set.length, 6)}$`,
        };
      }
      if (kind === 'cards') {
        const N = rng.pick([10, 12, 20]);
        let ev: NumEvent;
        let good: number[];
        do {
          ev = rng.pick(numberEvents(rng, N));
          good = Array.from({ length: N }, (_, i) => i + 1).filter(ev.test);
        } while (good.length === 0 || good.length === N);
        return {
          type: 'numeric',
          prompt: `Cards numbered 1 to ${N} are shuffled. ${name} picks one at random. What is the probability that the number is ${ev.name}? Give your answer as a fraction.`,
          answer: good.length / N,
          calculator: 'not-allowed',
          hints: [`There are ${N} equally likely outcomes.`, `List the numbers from 1 to ${N} that are ${ev.name}.`],
          solution: `The numbers that are ${ev.name}: ${good.join(', ')}. That is ${good.length} out of ${N}.\n\n$P = ${pTex(good.length, N)}$`,
        };
      }
      const word = rng.pick(WORDS);
      const letters = [...word];
      const counts = new Map<string, number>();
      for (const l of letters) counts.set(l, (counts.get(l) ?? 0) + 1);
      const letter = rng.pick([...counts.keys()]);
      const c = counts.get(letter)!;
      return {
        type: 'numeric',
        prompt: `Each letter of the word **${word}** is written on its own card. The ${letters.length} cards are shuffled and ${name} picks one without looking. What is the probability that the card shows ${letter}? Give your answer as a fraction.`,
        answer: c / letters.length,
        calculator: 'not-allowed',
        hints: [`There are ${letters.length} cards, all equally likely.`, `Count every card that shows ${letter}, including repeats.`],
        solution: `${c} of the ${letters.length} cards ${c === 1 ? 'shows' : 'show'} ${letter}.\n\n$P(${letter}) = ${pTex(c, letters.length)}$`,
      };
    }
    // difficulty 3: a combination of outcomes, sometimes in simplest form
    const items = rng.pick(ITEMS);
    const [cA, cB, cC] = rng.sample(COLOURS, 3) as [Colour, Colour, Colour];
    const n = [rng.int(1, 8), rng.int(1, 8), rng.int(1, 8)] as const;
    const total = n[0] + n[1] + n[2];
    const simplest = rng.chance(0.5);
    const ask = simplest ? 'Give your answer as a fraction in simplest form.' : 'Give your answer as a fraction.';
    const not = rng.chance(0.4);
    const target = rng.int(0, 2);
    const cols = [cA, cB, cC];
    const fav = not ? total - n[target]! : n[0] + n[2];
    const what = not ? `**not** ${cols[target]}` : `${cA} **or** ${cC}`;
    return {
      type: 'numeric',
      prompt: `A bag has ${n[0]} ${cA}, ${n[1]} ${cB} and ${n[2]} ${cC} ${items}. ${name} takes one without looking. What is the probability that it is ${what}? ${ask}`,
      answer: fav / total,
      form: simplest ? 'simplest-fraction' : 'any',
      calculator: 'not-allowed',
      hints: [`How many ${items} are there altogether?`, not ? `Count all the ${items} that are not ${cols[target]}.` : `Add the ${cA} ${items} and the ${cC} ${items}.`],
      solution: [
        `There are $${n[0]} + ${n[1]} + ${n[2]} = ${total}$ ${items}.`,
        not
          ? `The ${items} that are not ${cols[target]}: $${cols
              .map((c, i) => (i === target ? null : `${n[i]}`))
              .filter(Boolean)
              .join(' + ')} = ${fav}$.`
          : `${cap(cA)} or ${cC}: $${n[0]} + ${n[2]} = ${fav}$ ${items}.`,
        `$$${formula}$$`,
        `$P = ${simplest ? pTex(fav, total) : frac(fav, total, true)}$`,
      ].join('\n\n'),
    };
  },
};

// ---------------------------------------------------------------- spinners
export const spinners: QuestionTemplate = {
  id: 'm6.pro.chance.spinners',
  topicId: 'm6.pro.chance',
  title: 'Probabilities with spinners',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    const name = rng.pick(NAMES);
    if (difficulty === 2) {
      const k = rng.pick([4, 5, 6, 8]);
      const cols = rng.sample(COLOURS, rng.int(2, 3)) as Colour[];
      const sectors = rng.shuffle(Array.from({ length: k }, (_, i) => cols[i % cols.length]!));
      const c = rng.pick(cols);
      const count = sectors.filter((x) => x === c).length;
      return {
        type: 'numeric',
        prompt: `The spinner has ${k} equal sections. ${name} spins it once. What is the probability that it lands on ${c}? Give your answer as a fraction.`,
        figure: {
          svg: spinner(sectors.map((x) => ({ label: cap(x), fill: COLOUR_FILL[x] }))),
          alt: `A spinner with ${k} equal sections: ${sectors.join(', ')}.`,
        },
        answer: count / k,
        calculator: 'not-allowed',
        hints: ['Each section is equally likely.', `Count the ${c} sections. How many sections are there altogether?`],
        solution: `${count} of the ${k} equal sections ${count === 1 ? 'is' : 'are'} ${c}.\n\n$P(\\text{${c}}) = ${frac(count, k, true)}$`,
      };
    }
    if (difficulty === 3) {
      const parts = rng.pick([6, 8]);
      const cols = rng.sample(COLOURS, 3) as Colour[];
      let sizes: number[];
      do sizes = [rng.int(1, parts - 2), rng.int(1, parts - 2)];
      while (sizes[0]! + sizes[1]! >= parts);
      sizes.push(parts - sizes[0]! - sizes[1]!);
      const sectors: Sector[] = cols.map((c, i) => ({ label: cap(c), fill: COLOUR_FILL[c], parts: sizes[i] }));
      const both = rng.chance(0.5);
      const i1 = rng.int(0, 2);
      const i2 = (i1 + rng.int(1, 2)) % 3;
      const fav = both ? sizes[i1]! + sizes[i2]! : sizes[i1]!;
      const what = both ? `${cols[i1]} **or** ${cols[i2]}` : cols[i1]!;
      return {
        type: 'numeric',
        prompt: `This spinner is split into ${parts} equal parts (shown by the dashed lines). ${name} spins it once. What is the probability that it lands on ${what}? Give your answer as a fraction in simplest form.`,
        figure: {
          svg: spinner(sectors, { showParts: true }),
          alt: `A spinner split into ${parts} equal parts: ${cols.map((c, i) => `${sizes[i]} ${c}`).join(', ')}.`,
        },
        answer: fav / parts,
        form: 'simplest-fraction',
        calculator: 'not-allowed',
        hints: [`Count the equal parts that are ${both ? `${cols[i1]} or ${cols[i2]}` : cols[i1]}.`, 'Write it as a fraction of all the parts, then simplify.'],
        solution: [
          both
            ? `${cap(cols[i1]!)} covers ${sizes[i1]} part${sizes[i1] === 1 ? '' : 's'} and ${cols[i2]} covers ${sizes[i2]} part${sizes[i2] === 1 ? '' : 's'}: $${sizes[i1]} + ${sizes[i2]} = ${fav}$ parts.`
            : `${cap(cols[i1]!)} covers ${fav} of the ${parts} equal parts.`,
          `$P = ${pTex(fav, parts)}$`,
        ].join('\n\n'),
      };
    }
    // difficulty 4: sized sectors labelled with fractions; one colour appears twice.
    const [X, Y, Z] = rng.sample(COLOURS, 3) as [Colour, Colour, Colour];
    const sX = rng.pick([3, 4]);
    const y1 = 1;
    // Keep P(Y) < P(X) so the "more sections" claim is always wrong.
    const y2 = sX === 4 ? rng.pick([1, 1, 2]) : 1;
    const sZ = 8 - sX - y1 - y2;
    const fracText = (p: number) => {
      const t = frac(p, 8);
      const m = t.match(/\\frac\{(\d+)\}\{(\d+)\}/);
      return m ? `${m[1]}/${m[2]}` : t;
    };
    const sectors: Sector[] = [
      { label: cap(X), fill: COLOUR_FILL[X], parts: sX, sub: fracText(sX) },
      { label: cap(Y), fill: COLOUR_FILL[Y], parts: y1, sub: fracText(y1) },
      { label: cap(Z), fill: COLOUR_FILL[Z], parts: sZ, sub: fracText(sZ) },
      { label: cap(Y), fill: COLOUR_FILL[Y], parts: y2, sub: fracText(y2) },
    ];
    const figure = {
      svg: spinner(sectors),
      alt: `A spinner with four sections: ${X} (${fracText(sX)}), ${Y} (${fracText(y1)}), ${Z} (${fracText(sZ)}) and ${Y} (${fracText(y2)}).`,
    };
    const pY = y1 + y2;
    if (rng.chance(0.5)) {
      return {
        type: 'numeric',
        prompt: `The fraction in each section shows how much of the spinner it covers. ${name} spins it once. What is the probability that it lands on ${Y}? Give your answer as a fraction in simplest form.`,
        figure,
        answer: pY / 8,
        form: 'simplest-fraction',
        marks: 2,
        calculator: 'not-allowed',
        hints: [`${cap(Y)} is in two sections. Add their fractions.`, 'Write both fractions in eighths before you add.'],
        solution: [
          `${cap(Y)} has two sections: $${frac(y1, 8)} + ${frac(y2, 8)}$.`,
          `In eighths: $${frac(y1, 8, true)} + ${frac(y2, 8, true)} = ${pTex(pY, 8)}$.`,
          `$P(\\text{${Y}}) = ${frac(pY, 8)}$`,
        ].join('\n\n'),
      };
    }
    return {
      type: 'mcq',
      prompt: `The fraction in each section shows how much of the spinner it covers. ${name} says, "${cap(Y)} is more likely than ${X}, because ${Y} has two sections and ${X} has only one." Is ${name} right?`,
      figure,
      options: [
        { id: 'a', text: `No. $P(\\text{${X}}) = ${frac(sX, 8)}$, which is more than $P(\\text{${Y}}) = ${frac(pY, 8)}$.` },
        { id: 'b', text: `Yes. ${cap(Y)} has two sections and ${X} has only one.` },
        { id: 'c', text: `No. Every colour has the same chance, because each colour is one outcome.` },
        { id: 'd', text: `Yes. Two small sections always add up to more than one big section.` },
      ],
      correct: 'a',
      feedback: {
        b: 'The number of sections does not matter. What matters is how much of the spinner each colour covers.',
        c: `The colours cover different amounts of the spinner, so they are not equally likely.`,
        d: `Add the fractions: $${frac(y1, 8)} + ${frac(y2, 8)} = ${frac(pY, 8)}$, which is less than $${frac(sX, 8)}$.`,
      },
      marks: 2,
      calculator: 'not-allowed',
      hints: [`Add up the fractions for ${Y}.`, `Compare that with the fraction for ${X}.`],
      solution: [
        `$P(\\text{${Y}}) = ${frac(y1, 8)} + ${frac(y2, 8)} = ${frac(y1, 8, true)} + ${frac(y2, 8, true)} = ${pTex(pY, 8)}$`,
        `$P(\\text{${X}}) = ${pTex(sX, 8)}$`,
        `${cap(X)} covers more of the spinner, so ${X} is more likely. ${name} is **not** right: the size of the sections matters, not how many there are.`,
      ].join('\n\n'),
    };
  },
};

// ---------------------------------------------------------------- probabilities add to 1
/** Denominator pairs where one is a multiple of the other (Year 6 fraction adding). */
const RELATED: Array<[number, number]> = [
  [2, 4],
  [2, 8],
  [4, 8],
  [2, 6],
  [3, 6],
  [2, 10],
  [5, 10],
  [3, 12],
  [4, 12],
  [6, 12],
  [2, 12],
];

function addToOneD4(rng: Rng): TemplateOutput {
  const name = rng.pick(NAMES);
  const [cA, cB, cC] = rng.sample(COLOURS, 3) as [Colour, Colour, Colour];
  for (;;) {
    const [d1, D] = rng.pick(RELATED);
    const n1 = rng.int(1, d1 - 1);
    const n2 = rng.int(1, D - 1);
    const used = n1 * (D / d1) + n2;
    if (used >= D || gcd(n1, d1) !== 1 || gcd(n2, D) !== 1) continue;
    const rest = D - used;
    if (rng.chance(0.4)) {
      // Check a claim: do the probabilities add to 1?
      const wrongThird = rng.chance(0.5);
      const shownRest = wrongThird ? rest + rng.pick([-1, 1]) : rest;
      if (shownRest <= 0 || shownRest >= D) continue;
      const total = used + shownRest;
      return {
        type: 'mcq',
        prompt: `${name} has a spinner with ${cA}, ${cB} and ${cC} sections and no other colours. ${name} says the probabilities are:\n\n$P(\\text{${cA}}) = ${frac(n1, d1)}$, $P(\\text{${cB}}) = ${frac(n2, D, true)}$ and $P(\\text{${cC}}) = ${frac(shownRest, D, true)}$.\n\nCould ${name} be right?`,
        options: [
          { id: 'y', text: `Yes, because the probabilities add up to 1.` },
          { id: 'n', text: `No, because the probabilities do not add up to 1.` },
          { id: 'big', text: `No, because $P(\\text{${cA}})$ should be the biggest.` },
          { id: 'any', text: `Yes, any three fractions can be the probabilities.` },
        ],
        correct: total === D ? 'y' : 'n',
        feedback: {
          ...(total === D
            ? { n: `Add them in ${D}ths: they make $\\frac{${D}}{${D}} = 1$.` }
            : { y: `Add them in ${D}ths: $\\frac{${n1 * (D / d1)}}{${D}} + \\frac{${n2}}{${D}} + \\frac{${shownRest}}{${D}} = \\frac{${total}}{${D}}$, not 1.` }),
          big: 'Any colour could have the biggest probability. The rule to check is that they all add to 1.',
          any: 'The probabilities of all the outcomes must add up to exactly 1.',
        },
        marks: 2,
        calculator: 'not-allowed',
        hints: ['The spinner must land on one of the three colours. What must the probabilities add up to?', `Write all three fractions in ${D}ths, then add.`],
        solution: [
          `In ${D}ths: $${frac(n1, d1)} = \\frac{${n1 * (D / d1)}}{${D}}$.`,
          `$\\frac{${n1 * (D / d1)}}{${D}} + \\frac{${n2}}{${D}} + \\frac{${shownRest}}{${D}} = \\frac{${total}}{${D}}$${total === D ? ' $= 1$' : ''}`,
          total === D
            ? `They add up to 1, so ${name} **could be right**.`
            : `They add up to $\\frac{${total}}{${D}}$, not 1, so ${name} **cannot be right**.`,
        ].join('\n\n'),
      };
    }
    return {
      type: 'numeric',
      prompt: `A spinner has only ${cA}, ${cB} and ${cC} sections. $P(\\text{${cA}}) = ${frac(n1, d1)}$ and $P(\\text{${cB}}) = ${frac(n2, D, true)}$. What is $P(\\text{${cC}})$? Give your answer as a fraction.`,
      answer: rest / D,
      marks: 2,
      calculator: 'not-allowed',
      hints: ['The probabilities of all the outcomes add up to 1.', `Write the fractions in ${D}ths, add them, then see how much more makes 1.`],
      solution: [
        `$${frac(n1, d1)} = \\frac{${n1 * (D / d1)}}{${D}}$`,
        `$\\frac{${n1 * (D / d1)}}{${D}} + \\frac{${n2}}{${D}} = \\frac{${used}}{${D}}$`,
        `The three probabilities add to $1 = \\frac{${D}}{${D}}$, so $P(\\text{${cC}}) = \\frac{${D}}{${D}} - \\frac{${used}}{${D}} = ${pTex(rest, D)}$.`,
      ].join('\n\n'),
    };
  }
}

export const addToOne: QuestionTemplate = {
  id: 'm6.pro.chance.add-to-one',
  topicId: 'm6.pro.chance',
  title: 'The probabilities of all the outcomes add to 1',
  difficulties: [3, 4, 5],
  generate({ rng, difficulty }) {
    const name = rng.pick(NAMES);
    if (difficulty === 3) {
      if (rng.chance(0.4)) {
        const team = rng.pick(['rugby', 'netball', 'football', 'hockey'] as const);
        const win = rng.int(2, 7) / 10;
        const draw = rng.int(1, Math.round(10 - win * 10) - 1) / 10;
        const lose = Math.round((1 - win - draw) * 10) / 10;
        return {
          type: 'numeric',
          prompt: `In ${name}'s next ${team} game, the team can win, draw or lose. The probability of winning is ${win} and the probability of a draw is ${draw}. What is the probability that the team loses? Give your answer as a decimal.`,
          answer: lose,
          form: 'decimal',
          calculator: 'not-allowed',
          hints: ['Win, draw and lose are all the outcomes, so their probabilities add up to 1.', 'Add the two probabilities you know, then find how much more makes 1.'],
          solution: `$${win} + ${draw} = ${Math.round((win + draw) * 10) / 10}$\n\n$1 - ${Math.round((win + draw) * 10) / 10} = ${lose}$\n\nThe probability of losing is **${lose}**.`,
        };
      }
      const [cA, cB, cC] = rng.sample(COLOURS, 3) as [Colour, Colour, Colour];
      const D = rng.pick([5, 6, 8, 10, 12]);
      const a = rng.int(1, D - 2);
      const b = rng.int(1, D - 1 - a);
      const rest = D - a - b;
      const items = rng.pick(ITEMS);
      return {
        type: 'numeric',
        prompt: `A bag has only ${cA}, ${cB} and ${cC} ${items}. ${name} takes one without looking. $P(\\text{${cA}}) = \\frac{${a}}{${D}}$ and $P(\\text{${cB}}) = \\frac{${b}}{${D}}$. What is $P(\\text{${cC}})$? Give your answer as a fraction.`,
        answer: rest / D,
        calculator: 'not-allowed',
        hints: ['The probabilities of all the outcomes add up to 1.', `1 whole is $\\frac{${D}}{${D}}$.`],
        solution: `$\\frac{${a}}{${D}} + \\frac{${b}}{${D}} = \\frac{${a + b}}{${D}}$\n\nAll three add to $1 = \\frac{${D}}{${D}}$, so $P(\\text{${cC}}) = \\frac{${D}}{${D}} - \\frac{${a + b}}{${D}} = ${pTex(rest, D)}$.`,
      };
    }
    if (difficulty === 4) return addToOneD4(rng);
    // difficulty 5: from probabilities back to numbers of things
    const items = rng.pick(ITEMS);
    const [cA, cB, cC] = rng.sample(COLOURS, 3) as [Colour, Colour, Colour];
    if (rng.chance(0.4)) {
      // Find the whole from a fraction.
      const [n, d] = rng.pick([[1, 4], [1, 3], [1, 5], [2, 5], [3, 4], [2, 3], [3, 10], [1, 6], [3, 8]] as const);
      const k = rng.int(2, 6);
      const count = n * k;
      const total = d * k;
      return {
        type: 'numeric',
        prompt: `A bag of ${items} has ${count} ${cA} ones. The probability of taking a ${cA} one is $\\frac{${n}}{${d}}$. How many ${items} are in the bag altogether?`,
        answer: total,
        form: 'integer',
        marks: 2,
        calculator: 'not-allowed',
        hints: [`$\\frac{${n}}{${d}}$ of the bag is ${count} ${items}.`, n === 1 ? `If $\\frac{1}{${d}}$ is ${count}, what is the whole?` : `First find $\\frac{1}{${d}}$ of the bag: share ${count} into ${n} equal parts.`],
        solution: [
          `$\\frac{${n}}{${d}}$ of the ${items} are ${cA}, and that is ${count} ${items}.`,
          ...(n === 1 ? [] : [`So $\\frac{1}{${d}}$ of the bag is $${count} \\div ${n} = ${k}$ ${items}.`]),
          `The whole bag is $${k} \\times ${d} = ${total}$ ${items}.`,
          `Check: $\\frac{${count}}{${total}} = ${frac(count, total)}$ ✓`,
        ].join('\n\n'),
      };
    }
    for (;;) {
      const N = rng.pick([12, 20, 24, 30, 36, 40, 48, 60]);
      const fracs = ([[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [1, 6], [1, 10], [3, 10], [1, 12], [5, 12]] as const).filter(([, d]) => N % d === 0);
      const [p1, p2] = rng.sample(fracs, 2);
      if (!p1 || !p2) continue;
      const a = (N / p1[1]) * p1[0];
      const b = (N / p2[1]) * p2[0];
      const c = N - a - b;
      if (c < 2) continue;
      return {
        type: 'numeric',
        prompt: `A bag has ${N} ${items}. They are ${cA}, ${cB} or ${cC}. $P(\\text{${cA}}) = \\frac{${p1[0]}}{${p1[1]}}$ and $P(\\text{${cB}}) = \\frac{${p2[0]}}{${p2[1]}}$. How many ${cC} ${items} are in the bag?`,
        answer: c,
        form: 'integer',
        marks: 2,
        calculator: 'not-allowed',
        hints: [`$P(\\text{${cA}}) = \\frac{${p1[0]}}{${p1[1]}}$ means $\\frac{${p1[0]}}{${p1[1]}}$ of the ${N} ${items} are ${cA}.`, `Find how many are ${cA} and how many are ${cB}. The rest are ${cC}.`],
        solution: [
          `${cap(cA)}: $\\frac{${p1[0]}}{${p1[1]}}$ of ${N} $= ${N} \\div ${p1[1]}${p1[0] === 1 ? '' : ` \\times ${p1[0]}`} = ${a}$`,
          `${cap(cB)}: $\\frac{${p2[0]}}{${p2[1]}}$ of ${N} $= ${N} \\div ${p2[1]}${p2[0] === 1 ? '' : ` \\times ${p2[0]}`} = ${b}$`,
          `${cap(cC)}: $${N} - ${a} - ${b} = ${c}$ ${items}.`,
        ].join('\n\n'),
      };
    }
  },
};

export const templates: QuestionTemplate[] = [chanceWords, sampleSpace, singleProbability, spinners, addToOne];
