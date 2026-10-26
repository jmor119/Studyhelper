import type { Rng } from '../../../../rng';
import type { QuestionTemplate } from '../../../types';
import { NAMES, frac, gcd, lcm, num } from '../../../format';
import { COLOURS, COLOUR_FILL, fractionAsk, gridTable, listAnd, pTex, spinner, treeDiagram } from './theoretical-helpers';

// m7.pro.theoretical — equally likely outcomes, P(event) = favourable ÷ total, probabilities as
// fractions, decimals and percentages, complements, and two-step experiments (lists, tables and
// tree diagrams). Fraction answers are accepted in any equivalent form unless the prompt asks
// for simplest form.

const ALPHA = 'abcdefgh';

const WORDS = ['MATARIKI', 'AOTEAROA', 'WAIKATO', 'ROTORUA', 'TARANAKI', 'WHANGANUI', 'TAURANGA', 'HAMILTON', 'TIMARU', 'NORTHLAND', 'PAPAKURA', 'OTAGO', 'CANTERBURY', 'NELSON'] as const;
const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

const isPrime = (x: number) => {
  if (x < 2) return false;
  for (let i = 2; i * i <= x; i++) if (x % i === 0) return false;
  return true;
};

interface NumEvent {
  name: string;
  test: (x: number) => boolean;
}

function numberEvents(rng: Rng, N: number): NumEvent[] {
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

const DIE_EVENTS = [
  { name: 'an even number', set: [2, 4, 6] },
  { name: 'an odd number', set: [1, 3, 5] },
  { name: 'a number greater than 4', set: [5, 6] },
  { name: 'a number less than 3', set: [1, 2] },
  { name: 'a multiple of 3', set: [3, 6] },
  { name: 'a factor of 6', set: [1, 2, 3, 6] },
  { name: 'a prime number', set: [2, 3, 5] },
  { name: 'a square number', set: [1, 4] },
  { name: 'a number greater than 1', set: [2, 3, 4, 5, 6] },
] as const;

const setText = (xs: readonly (number | string)[]) => xs.join(', ');

/** A spinner of k equal sectors using the given colours, each at least once. */
function spinnerColours(rng: Rng, k: number, cols: readonly string[]): string[] {
  const out = [...cols];
  while (out.length < k) out.push(rng.pick(cols));
  return rng.shuffle(out);
}

function spinnerFigure(sectors: readonly string[]) {
  const counts = new Map<string, number>();
  for (const s of sectors) counts.set(s, (counts.get(s) ?? 0) + 1);
  return {
    svg: spinner(sectors.map((s) => ({ label: s, fill: COLOUR_FILL[s] ?? '#ffffff' }))),
    alt: `A spinner with ${sectors.length} equal sections: ${[...counts.entries()].map(([c, n]) => `${n} ${c}`).join(', ')}.`,
  };
}

// ---------------- Single events ----------------

export const singleEvent: QuestionTemplate = {
  id: 'm7.pro.theoretical.single',
  topicId: 'm7.pro.theoretical',
  title: 'Probability of an event with equally likely outcomes',
  difficulties: [1, 2],
  generate({ rng, difficulty }) {
    const name = rng.pick(NAMES);
    const kind = rng.pick(difficulty === 1 ? (['bag', 'bag', 'spinner', 'letters'] as const) : (['bag', 'spinner', 'die', 'cards', 'letters'] as const));
    const ask = difficulty === 1 ? { text: 'Give your answer as a fraction.', form: 'any' as const } : fractionAsk(rng, 0.5);
    const baseHints = (total: string, fav: string) => [`How many equally likely outcomes are there altogether? ${total}`, `How many of them are ${fav}?`];

    if (kind === 'bag') {
      const cols = rng.sample(COLOURS, difficulty === 1 ? rng.int(2, 3) : 3);
      const counts = cols.map(() => rng.int(1, 6));
      const T = counts.reduce((s, c) => s + c, 0);
      const pickIdx = difficulty === 1 ? [rng.int(0, cols.length - 1)] : rng.sample([0, 1, 2], 2).sort();
      const target = pickIdx.map((i) => cols[i]!).join(' or ');
      const fav = pickIdx.reduce((s, i) => s + counts[i]!, 0);
      return {
        type: 'numeric',
        prompt: `A bag has ${listAnd(cols.map((c, i) => `${counts[i]} ${c}`))} counters. ${name} takes one counter without looking.\n\nWhat is the probability that it is **${target}**? ${ask.text}`,
        answer: fav / T,
        form: ask.form,
        calculator: 'not-allowed',
        hints: baseHints('(Count every counter in the bag.)', target),
        solution: `There are $${counts.join(' + ')} = ${T}$ counters, and each one is equally likely to be picked.\n\n${pickIdx.length > 1 ? `$${pickIdx.map((i) => counts[i]).join(' + ')} = ${fav}$` : fav} of them ${fav === 1 ? 'is' : 'are'} ${target}.\n\n$P(\\text{${target}}) = ${pTex(fav, T)}$`,
      };
    }

    if (kind === 'spinner') {
      const k = rng.pick([4, 5, 6, 8]);
      const cols: string[] = rng.sample(COLOURS.slice(0, 5), 3);
      const sectors = spinnerColours(rng, k, cols);
      const pick: string[] = difficulty === 1 ? [rng.pick(cols)] : rng.sample(cols, 2);
      const target = pick.join(' or ');
      const fav = sectors.filter((s) => pick.includes(s)).length;
      return {
        type: 'numeric',
        prompt: `${name} spins this spinner once. All the sections are the same size.\n\nWhat is the probability that it lands on **${target}**? ${ask.text}`,
        figure: spinnerFigure(sectors),
        answer: fav / k,
        form: ask.form,
        calculator: 'not-allowed',
        hints: baseHints('(Count the sections.)', target),
        solution: `The spinner has ${k} equal sections, so there are ${k} equally likely outcomes.\n\n${fav} of the sections ${fav === 1 ? 'is' : 'are'} ${target}.\n\n$P(\\text{${target}}) = ${pTex(fav, k)}$`,
      };
    }

    if (kind === 'die') {
      const ev = rng.pick(DIE_EVENTS);
      return {
        type: 'numeric',
        prompt: `${name} rolls a fair six-sided die. What is the probability of rolling **${ev.name}**? ${ask.text}`,
        answer: ev.set.length / 6,
        form: ask.form,
        calculator: 'not-allowed',
        hints: ['The sample space is 1, 2, 3, 4, 5, 6: six equally likely outcomes.', `Which of these outcomes are ${ev.name}?`],
        solution: `The outcomes that are ${ev.name}: ${setText(ev.set)}. That is ${ev.set.length} out of 6.\n\n$P = ${pTex(ev.set.length, 6)}$`,
      };
    }

    if (kind === 'cards') {
      const N = rng.pick([10, 12, 15, 20]);
      const all = Array.from({ length: N }, (_, i) => i + 1);
      for (;;) {
        const ev = rng.pick(numberEvents(rng, N));
        const good = all.filter(ev.test);
        if (good.length === 0 || good.length === N) continue;
        return {
          type: 'numeric',
          prompt: `Cards numbered 1 to ${N} are shuffled and placed face down. ${name} picks one card at random.\n\nWhat is the probability that the number is **${ev.name}**? ${ask.text}`,
          answer: good.length / N,
          form: ask.form,
          calculator: 'not-allowed',
          hints: [`There are ${N} cards, so there are ${N} equally likely outcomes.`, `List the numbers from 1 to ${N} that are ${ev.name}.`],
          solution: `The numbers that are ${ev.name}: ${setText(good)}. That is ${good.length} out of ${N}.\n\n$P = ${pTex(good.length, N)}$`,
        };
      }
    }

    // letters
    const word = rng.pick(WORDS);
    const letters = [...word];
    const n = letters.length;
    if (difficulty === 2 && rng.chance(0.6)) {
      const vowels = letters.filter((l) => VOWELS.has(l)).length;
      const wantVowel = rng.chance(0.6);
      const fav = wantVowel ? vowels : n - vowels;
      return {
        type: 'numeric',
        prompt: `The letters of the word **${word}** are written on separate cards and placed in a bag. ${name} takes one card without looking.\n\nWhat is the probability that the letter is a **${wantVowel ? 'vowel' : 'consonant'}**? ${ask.text}`,
        answer: fav / n,
        form: ask.form,
        calculator: 'not-allowed',
        hints: [`There are ${n} cards.`, 'The vowels are A, E, I, O and U. Count every card, including repeated letters.'],
        solution: `${word} has ${n} letters. The ${wantVowel ? 'vowels' : 'consonants'} are ${letters.filter((l) => VOWELS.has(l) === wantVowel).join(', ')}: ${fav} cards.\n\n$P(\\text{${wantVowel ? 'vowel' : 'consonant'}}) = ${pTex(fav, n)}$`,
      };
    }
    const distinct = [...new Set(letters)];
    const repeated = distinct.filter((l) => letters.filter((x) => x === l).length > 1);
    const letter = repeated.length && rng.chance(0.6) ? rng.pick(repeated) : rng.pick(distinct);
    const fav = letters.filter((l) => l === letter).length;
    return {
      type: 'numeric',
      prompt: `The letters of the word **${word}** are written on separate cards and placed in a bag. ${name} takes one card without looking.\n\nWhat is the probability that the card shows the letter **${letter}**? ${ask.text}`,
      answer: fav / n,
      form: ask.form,
      calculator: 'not-allowed',
      hints: [`How many cards are there? (One for each letter of ${word}.)`, `How many of the cards show ${letter}?`],
      solution: `${word} has ${n} letters, so there are ${n} cards. ${fav === 1 ? `Only 1 card shows ${letter}.` : `${fav} cards show ${letter}.`}\n\n$P(${letter}) = ${pTex(fav, n)}$`,
    };
  },
};

// ---------------- Fractions, decimals and percentages; comparing ----------------

/** "\frac{7}{20} = \frac{35}{100} = 0.35" */
function toHundredths(n: number, d: number): string {
  const k = 100 / d;
  return `${frac(n, d, true)} = ${frac(n * k, 100, true)}`;
}

/** A probability in one of three forms, for comparing. */
function formOf(pct: number, form: 'fraction' | 'decimal' | 'percent'): string {
  if (form === 'percent') return `${pct}%`;
  if (form === 'decimal') return num(pct / 100);
  return `$${frac(pct, 100)}$`;
}

export const formsAndCompare: QuestionTemplate = {
  id: 'm7.pro.theoretical.forms-compare',
  topicId: 'm7.pro.theoretical',
  title: 'Probabilities as fractions, decimals and percentages, and comparing likelihood',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    const name = rng.pick(NAMES);

    if (difficulty === 2) {
      const asPct = rng.chance(0.5);
      const ending = asPct ? 'Give your answer as a percentage.' : 'Give your answer as a decimal.';
      const kind = rng.pick(['bag', 'cards', 'spinner'] as const);
      let prompt: string;
      let fav: number;
      let T: number;
      let solutionStart: string;
      let figure: { svg: string; alt: string } | undefined;
      if (kind === 'bag') {
        T = rng.pick([10, 20, 25, 50]);
        fav = rng.int(1, T - 2);
        const other = T - fav;
        const [c1, c2] = rng.sample(COLOURS, 2) as [string, string];
        prompt = `A bag has ${fav} ${c1} and ${other} ${c2} marbles. ${name} takes one marble without looking. What is the probability that it is ${c1}? ${ending}`;
        solutionStart = `There are $${fav} + ${other} = ${T}$ marbles, and ${fav} are ${c1}.`;
      } else if (kind === 'cards') {
        T = rng.pick([10, 20, 25, 50]);
        const all = Array.from({ length: T }, (_, i) => i + 1);
        let ev = rng.pick(numberEvents(rng, T));
        while (!all.some(ev.test) || all.every(ev.test)) ev = rng.pick(numberEvents(rng, T));
        const good = all.filter(ev.test);
        fav = good.length;
        prompt = `Raffle tickets numbered 1 to ${T} are put in a hat, and ${name} draws one at random. What is the probability that the number is ${ev.name}? ${ending}`;
        solutionStart = `There are ${T} tickets. The numbers that are ${ev.name} are ${setText(good)}: ${fav} tickets.`;
      } else {
        T = rng.pick([4, 5, 10]);
        const cols = rng.sample(COLOURS.slice(0, 5), T === 4 ? 2 : 3);
        const sectors = spinnerColours(rng, T, cols);
        const target = rng.pick(cols);
        fav = sectors.filter((s) => s === target).length;
        figure = spinnerFigure(sectors);
        prompt = `${name} spins this spinner. All the sections are the same size. What is the probability that it lands on ${target}? ${ending}`;
        solutionStart = `There are ${T} equal sections, and ${fav} ${fav === 1 ? 'is' : 'are'} ${target}.`;
      }
      const pct = (fav * 100) / T;
      return {
        type: 'numeric',
        prompt,
        ...(figure ? { figure } : {}),
        answer: asPct ? pct : pct / 100,
        ...(asPct ? { units: '%' } : { form: 'decimal' as const }),
        calculator: 'not-allowed',
        hints: ['Write the probability as a fraction first.', asPct ? 'Then make an equivalent fraction out of 100. "Per cent" means "out of 100".' : 'Then make an equivalent fraction with a denominator of 10 or 100, and write it as a decimal.'],
        solution: `${solutionStart}\n\n$P = ${toHundredths(fav, T)}${asPct ? ` = ${pct}\\%` : ` = ${num(pct / 100)}`}$`,
      };
    }

    if (difficulty === 3) {
      // Four spinners with P(red) given in mixed forms. Which is most likely?
      const pool = [20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80];
      for (;;) {
        const pcts = rng.sample(pool, 4);
        const best = Math.max(...pcts);
        if (pcts.filter((p) => p >= best - 5).length > 1 && rng.chance(0.5)) continue;
        const forms = rng.shuffle(['fraction', 'decimal', 'percent', rng.pick(['fraction', 'decimal', 'percent'] as const)] as const);
        const labels = ['A', 'B', 'C', 'D'];
        const shown = pcts.map((p, i) => formOf(p, forms[i]!));
        const bi = pcts.indexOf(best);
        return {
          type: 'mcq',
          prompt: `${name} has four spinners. The probability of each one landing on red is:\n\n${labels.map((l, i) => `- Spinner ${l}: ${shown[i]}`).join('\n')}\n\nWhich spinner is **most likely** to land on red?`,
          options: labels.map((l, i) => ({ id: ALPHA[i]!, text: `Spinner ${l}` })),
          correct: ALPHA[bi]!,
          feedback: Object.fromEntries(
            labels.map((l, i) => [ALPHA[i]!, `Spinner ${l}: ${shown[i]} is ${pcts[i]}%, which is less than ${best}%.`]).filter((_, i) => i !== bi),
          ),
          calculator: 'not-allowed',
          hints: ['Write all four probabilities in the same form, for example as percentages.', 'To change a fraction to a percentage, make an equivalent fraction out of 100.'],
          solution: `As percentages:\n\n${labels.map((l, i) => `- Spinner ${l}: ${forms[i] === 'percent' ? shown[i] : `${shown[i]} = ${pcts[i]}%`}`).join('\n')}\n\nThe biggest is ${best}%, so **Spinner ${labels[bi]}** is most likely to land on red.`,
        };
      }
    }

    // difficulty 4: which bag gives the better chance of red?
    const outcome = rng.pick(['A', 'B', 'same'] as const);
    for (;;) {
      let r1 = rng.int(1, 7);
      let b1 = rng.int(1, 8);
      let r2: number;
      let b2: number;
      if (outcome === 'same') {
        const k = rng.int(2, 3);
        r2 = r1 * k;
        b2 = b1 * k;
        if (r2 + b2 > 24) continue;
      } else {
        r2 = rng.int(1, 9);
        b2 = rng.int(1, 9);
      }
      const t1 = r1 + b1;
      const t2 = r2 + b2;
      const diff = r1 * t2 - r2 * t1;
      if (outcome === 'same' && diff !== 0) continue;
      if (outcome !== 'same') {
        if (diff === 0 || Math.abs(r1 / t1 - r2 / t2) < 0.04) continue;
        const better = diff > 0 ? 'A' : 'B';
        if (better !== outcome) continue;
        // Usually make the worse bag the one with more red counters (a common trap).
        const worseReds = better === 'A' ? r2 : r1;
        const betterReds = better === 'A' ? r1 : r2;
        if (worseReds <= betterReds && rng.chance(0.75)) continue;
      }
      if (r1 === r2 && b1 === b2) continue;
      const L = lcm(t1, t2);
      const ids = { A: 'a', B: 'b', same: 'c' } as const;
      const pA = pTex(r1, t1);
      const pB = pTex(r2, t2);
      return {
        type: 'mcq',
        prompt: `**Bag A** has ${r1} red and ${b1} blue counters.\n\n**Bag B** has ${r2} red and ${b2} blue counters.\n\n${name} wants to pick a red counter without looking. Which bag gives ${name} the better chance?`,
        options: [
          { id: 'a', text: 'Bag A' },
          { id: 'b', text: 'Bag B' },
          { id: 'c', text: 'Both bags give the same chance' },
        ],
        correct: ids[outcome],
        feedback: Object.fromEntries(
          (['A', 'B', 'same'] as const)
            .filter((x) => x !== outcome)
            .map((x) => [
              ids[x],
              x === 'same'
                ? 'Write both probabilities with the same denominator. They are not equal.'
                : `Having more red counters doesn’t always mean a better chance. Compare the fraction of each bag that is red.`,
            ]),
        ),
        marks: 2,
        calculator: 'not-allowed',
        hints: ['Work out the probability of red for each bag as a fraction: red counters ÷ total counters.', 'To compare the fractions, give them the same denominator.'],
        solution: `Bag A: $P(\\text{red}) = ${pA}$. Bag B: $P(\\text{red}) = ${pB}$.\n\nWith a common denominator of ${L}: $${frac(r1, t1, true)} = ${frac((r1 * L) / t1, L, true)}$ and $${frac(r2, t2, true)} = ${frac((r2 * L) / t2, L, true)}$.\n\n${outcome === 'same' ? 'The probabilities are equal, so **both bags give the same chance**.' : `**Bag ${outcome}** has the bigger probability, so it gives the better chance.`} What matters is the fraction of the counters that are red, not the number of red counters.`,
      };
    }
  },
};

// ---------------- Complements ----------------

const EVENTS = [
  { e: 'it rains on the day of the school picnic', not: 'it does **not** rain on the day of the picnic' },
  { e: 'the school bus is late tomorrow', not: 'the bus is **not** late tomorrow' },
  { e: 'the netball team wins its next game', not: 'the team does **not** win its next game' },
  { e: 'a bean seed sprouts', not: 'the seed does **not** sprout' },
  { e: 'a raffle ticket wins a prize', not: 'the ticket does **not** win a prize' },
  { e: 'the ferry to Waiheke Island leaves on time', not: 'the ferry does **not** leave on time' },
  { e: 'a spinner lands on green', not: 'it does **not** land on green' },
  { e: 'a pīwakawaka visits the school garden at lunchtime', not: 'a pīwakawaka does **not** visit at lunchtime' },
] as const;

export const complement: QuestionTemplate = {
  id: 'm7.pro.theoretical.complement',
  topicId: 'm7.pro.theoretical',
  title: 'Complementary events: P(not A) = 1 − P(A)',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    const name = rng.pick(NAMES);
    const ev = rng.pick(EVENTS);
    const hints = ['An event and its complement add up to 1 (or 100%).', 'Take the probability you know away from 1.'];

    if (difficulty === 2) {
      const d = rng.int(3, 12);
      const a = rng.int(1, d - 1);
      return {
        type: 'numeric',
        prompt: `The probability that ${ev.e} is $${frac(a, d, true)}$.\n\nWhat is the probability that ${ev.not}? Give your answer as a fraction.`,
        answer: (d - a) / d,
        form: 'any',
        calculator: 'not-allowed',
        hints: [...hints, `Write 1 as $\\frac{${d}}{${d}}$.`],
        solution: `"${ev.not.replace(/\*\*/g, '')}" is the **complement** of "${ev.e}". Together they add up to 1.\n\n$1 - ${frac(a, d, true)} = ${frac(d, d, true)} - ${frac(a, d, true)} = ${frac(d - a, d, true)}$`,
      };
    }

    if (difficulty === 3) {
      const pct = rng.int(1, 19) * 5 + (rng.chance(0.3) ? rng.int(1, 4) : 0);
      const safePct = Math.min(pct, 98);
      const asPct = rng.chance(0.5);
      const shown = asPct ? `${safePct}%` : num(safePct / 100);
      return {
        type: 'numeric',
        prompt: `The probability that ${ev.e} is ${shown}.\n\nWhat is the probability that ${ev.not}?${asPct ? ' Give your answer as a percentage.' : ' Give your answer as a decimal.'}`,
        answer: asPct ? 100 - safePct : (100 - safePct) / 100,
        ...(asPct ? { units: '%' } : { form: 'decimal' as const }),
        calculator: 'not-allowed',
        hints: asPct ? ['An event and its complement add up to 100%.', `Work out $100 - ${safePct}$.`] : ['An event and its complement add up to 1.', `Work out $1 - ${num(safePct / 100)}$. Think of 1 as 1.00.`],
        solution: asPct
          ? `The two probabilities add up to 100%.\n\n$100\\% - ${safePct}\\% = ${100 - safePct}\\%$`
          : `The two probabilities add up to 1.\n\n$1 - ${num(safePct / 100)} = 1.00 - ${(safePct / 100).toFixed(2)} = ${num((100 - safePct) / 100)}$`,
      };
    }

    // difficulty 4: three colours, find the missing one.
    if (rng.chance(0.5)) {
      for (;;) {
        const N = rng.pick([12, 20, 24, 30, 36, 40]);
        const dens = [2, 3, 4, 5, 6, 10, 12].filter((d) => N % d === 0);
        const [d1, d2] = rng.sample(dens, 2) as [number, number];
        const a1 = rng.int(1, d1 - 1);
        const a2 = rng.int(1, d2 - 1);
        const red = (N * a1) / d1;
        const blue = (N * a2) / d2;
        const green = N - red - blue;
        if (green <= 0 || gcd(a1, d1) !== 1 || gcd(a2, d2) !== 1) continue;
        const askCount = rng.chance(0.6);
        return {
          type: 'numeric',
          prompt: `A bag has ${N} counters. Each one is red, blue or green. ${name} takes one without looking.\n\n$P(\\text{red}) = ${frac(a1, d1)}$ and $P(\\text{blue}) = ${frac(a2, d2)}$.\n\n${askCount ? 'How many **green** counters are in the bag?' : 'What is the probability of picking a **green** counter? Give your answer as a fraction in simplest form.'}`,
          answer: askCount ? green : green / N,
          form: askCount ? 'integer' : 'simplest-fraction',
          marks: 2,
          calculator: 'not-allowed',
          hints: [`How many red counters are there? Find $${frac(a1, d1)}$ of ${N}.`, `Find the number of blue counters the same way. The rest are green.`],
          solution: `Red: $${frac(a1, d1)}$ of ${N} $= ${red}$. Blue: $${frac(a2, d2)}$ of ${N} $= ${blue}$.\n\nGreen: $${N} - ${red} - ${blue} = ${green}$${askCount ? '' : `\n\n$P(\\text{green}) = ${pTex(green, N)}$`}`,
        };
      }
    }
    for (;;) {
      const p1 = rng.int(2, 9) * 5;
      const p2 = rng.int(2, 9) * 5;
      const p3 = 100 - p1 - p2;
      if (p3 <= 0) continue;
      const [c1, c2, c3] = rng.sample(COLOURS.slice(0, 5), 3) as [string, string, string];
      return {
        type: 'numeric',
        prompt: `A spinner can land on ${c1}, ${c2} or ${c3}. The sections are **not** all the same size.\n\n$P(\\text{${c1}}) = ${num(p1 / 100)}$ and $P(\\text{${c2}}) = ${num(p2 / 100)}$.\n\nWhat is the probability that it lands on **${c3}**? Give your answer as a decimal.`,
        answer: p3 / 100,
        form: 'decimal',
        marks: 2,
        calculator: 'not-allowed',
        hints: ['The probabilities of all the outcomes add up to 1.', `Add the two probabilities you know, then take the total away from 1.`],
        solution: `$${num(p1 / 100)} + ${num(p2 / 100)} = ${num((p1 + p2) / 100)}$\n\n$P(\\text{${c3}}) = 1 - ${num((p1 + p2) / 100)} = ${num(p3 / 100)}$`,
      };
    }
  },
};

// ---------------- Two-step experiments ----------------

const twoDiceTable = (f: (a: number, b: number) => number | string, corner = '+') => gridTable([1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6], f, corner);

export const twoEvents: QuestionTemplate = {
  id: 'm7.pro.theoretical.two-events',
  topicId: 'm7.pro.theoretical',
  title: 'Two-step experiments: lists, tables and tree diagrams',
  difficulties: [3, 4, 5],
  generate({ rng, difficulty }) {
    const name = rng.pick(NAMES);

    if (difficulty === 3) {
      const kind = rng.pick(['count', 'count', 'pair'] as const);
      if (kind === 'count') {
        const s = rng.pick(['coinDie', 'coinSpinner', 'menu', 'twoSpinners'] as const);
        if (s === 'menu') {
          const mains = rng.int(2, 5);
          const drinks = rng.int(2, 4);
          return {
            type: 'numeric',
            prompt: `The school camp menu has ${mains} choices of main meal and ${drinks} choices of drink. ${name} chooses one main and one drink.\n\nHow many different combinations are possible?`,
            answer: mains * drinks,
            form: 'integer',
            calculator: 'not-allowed',
            hints: ['Make a systematic list or a table: list every drink for the first main, then every drink for the second main, and so on.', 'How many combinations are there for each main?'],
            solution: `Each of the ${mains} mains can go with any of the ${drinks} drinks.\n\nA table with ${mains} rows and ${drinks} columns has $${mains} \\times ${drinks} = ${mains * drinks}$ cells, so there are **${mains * drinks}** combinations.`,
          };
        }
        const a = s === 'coinDie' ? 2 : s === 'coinSpinner' ? 2 : rng.int(3, 5);
        const b = s === 'coinDie' ? 6 : rng.int(3, 6);
        const text =
          s === 'coinDie'
            ? `${name} tosses a coin and rolls a six-sided die.`
            : s === 'coinSpinner'
              ? `${name} tosses a coin and spins a spinner with ${b} equal sections numbered 1 to ${b}.`
              : `${name} spins two spinners. The first has ${a} equal sections numbered 1 to ${a}. The second has ${b} equal sections numbered 1 to ${b}.`;
        return {
          type: 'numeric',
          prompt: `${text}\n\nHow many different outcomes are possible altogether?`,
          answer: a * b,
          form: 'integer',
          calculator: 'not-allowed',
          hints: ['Draw a table or a tree diagram to list every outcome.', `For each outcome of the first part, how many outcomes can the second part have?`],
          solution: `The first part has ${a} outcomes and the second has ${b}. Each first outcome can go with every second outcome.\n\nTotal: $${a} \\times ${b} = ${a * b}$ outcomes.`,
        };
      }
      const k = rng.pick([4, 5, 6]);
      const side = rng.pick(['heads', 'tails'] as const);
      const v = rng.int(1, k);
      const what = k === 6 ? 'rolls a six-sided die' : `spins a spinner with ${k} equal sections numbered 1 to ${k}`;
      return {
        type: 'numeric',
        prompt: `${name} tosses a coin and ${what}.\n\nWhat is the probability of getting **${side}** and a **${v}**? Give your answer as a fraction.`,
        answer: 1 / (2 * k),
        form: 'any',
        calculator: 'not-allowed',
        hints: ['How many equally likely outcomes are there altogether? A table or tree diagram helps.', `How many of those outcomes are ${side} with a ${v}?`],
        solution: `There are $2 \\times ${k} = ${2 * k}$ equally likely outcomes (H1, H2, …, T${k}).\n\nOnly one of them is ${side} with a ${v}.\n\n$P = ${frac(1, 2 * k)}$`,
      };
    }

    if (difficulty === 4) {
      const kind = rng.pick(['dice', 'dice', 'spinners', 'tree'] as const);
      const ask = fractionAsk(rng, 0.4);
      if (kind === 'tree') {
        const cols = rng.sample(COLOURS.slice(0, 5), 3).map((c) => c[0]!.toUpperCase() + c.slice(1));
        const svg = treeDiagram([['Heads', 'Tails'], cols], { outcomes: true });
        const side = rng.pick(['Heads', 'Tails'] as const);
        const notCol = rng.pick(cols);
        const fav = cols.filter((c) => c !== notCol).length;
        return {
          type: 'numeric',
          prompt: `${name} tosses a coin and then spins a spinner with three equal sections: ${listAnd(cols.map((c) => c.toLowerCase()))}. The tree diagram shows all the outcomes.\n\nWhat is the probability of getting **${side.toLowerCase()}** and **not ${notCol.toLowerCase()}**? ${ask.text}`,
          figure: { svg, alt: `Tree diagram. First branches: Heads, Tails. From each, three branches: ${cols.join(', ')}. Six outcomes: ${['Heads', 'Tails'].flatMap((h) => cols.map((c) => `${h} ${c}`)).join(', ')}.` },
          answer: fav / 6,
          form: ask.form,
          calculator: 'not-allowed',
          hints: ['Count the outcomes at the ends of the branches.', `Which outcomes start with ${side.toLowerCase()} and are not ${notCol.toLowerCase()}?`],
          solution: `There are 6 equally likely outcomes. The ones that are ${side.toLowerCase()} and not ${notCol.toLowerCase()}: ${cols
            .filter((c) => c !== notCol)
            .map((c) => `${side}, ${c}`)
            .join(' and ')}.\n\n$P = ${pTex(fav, 6)}$`,
        };
      }
      if (kind === 'spinners') {
        const a = rng.int(3, 4);
        const b = rng.int(3, 5);
        const rows = Array.from({ length: a }, (_, i) => i + 1);
        const cols = Array.from({ length: b }, (_, i) => i + 1);
        const sums = rows.flatMap((x) => cols.map((y) => x + y));
        const evs = [
          ...[...new Set(sums)].map((s) => ({ name: `a total of ${s}`, test: (t: number) => t === s })),
          { name: 'an even total', test: (t: number) => t % 2 === 0 },
          { name: `a total greater than ${a + 1}`, test: (t: number) => t > a + 1 },
        ];
        const ev = rng.pick(evs.filter((e) => sums.some(e.test) && !sums.every(e.test)));
        const fav = sums.filter(ev.test).length;
        return {
          type: 'numeric',
          prompt: `${name} spins two spinners and adds the numbers. Spinner 1 has ${a} equal sections numbered 1 to ${a}. Spinner 2 has ${b} equal sections numbered 1 to ${b}.\n\nWhat is the probability of getting **${ev.name}**? ${ask.text}`,
          answer: fav / (a * b),
          form: ask.form,
          calculator: 'not-allowed',
          hints: ['Draw a table: spinner 1 down the side, spinner 2 across the top, and the totals in the middle.', `How many cells in the table give ${ev.name}?`],
          solution: `Table of totals:\n\n${gridTable(rows, cols, (x, y) => x + y)}\n\nThere are $${a} \\times ${b} = ${a * b}$ equally likely outcomes, and ${fav} of them give ${ev.name}.\n\n$P = ${pTex(fav, a * b)}$`,
        };
      }
      const sums = [1, 2, 3, 4, 5, 6].flatMap((x) => [1, 2, 3, 4, 5, 6].map((y) => x + y));
      const s = rng.int(3, 11);
      const evs = [
        { name: `a total of ${s}`, fav: sums.filter((t) => t === s).length },
        { name: `a total greater than ${s}`, fav: sums.filter((t) => t > s).length },
        { name: `a total less than ${s}`, fav: sums.filter((t) => t < s).length },
        { name: 'a double (both dice the same)', fav: 6 },
      ];
      const ev = rng.pick(evs);
      return {
        type: 'numeric',
        prompt: `${name} rolls two fair six-sided dice and adds the numbers.\n\nWhat is the probability of getting **${ev.name}**? ${ask.text}`,
        answer: ev.fav / 36,
        form: ask.form,
        calculator: 'not-allowed',
        hints: ['Draw a 6 by 6 table of the totals. There are 36 equally likely outcomes.', `Count the cells that give ${ev.name}.`],
        solution: `Table of totals:\n\n${twoDiceTable((x, y) => x + y)}\n\n${ev.fav} of the 36 outcomes give ${ev.name}.\n\n$P = ${pTex(ev.fav, 36)}$`,
      };
    }

    // difficulty 5
    if (rng.chance(0.5)) {
      const evs = [
        { name: 'exactly two heads', fav: 3, list: 'HHT, HTH, THH' },
        { name: 'exactly one head', fav: 3, list: 'HTT, THT, TTH' },
        { name: 'at least one head', fav: 7, list: 'every outcome except TTT' },
        { name: 'at least one tail', fav: 7, list: 'every outcome except HHH' },
        { name: 'all three the same', fav: 2, list: 'HHH, TTT' },
        { name: 'more heads than tails', fav: 4, list: 'HHH, HHT, HTH, THH' },
      ];
      const ev = rng.pick(evs);
      const ask = fractionAsk(rng, 0.5);
      return {
        type: 'numeric',
        prompt: `${name} tosses three coins.\n\nWhat is the probability of getting **${ev.name}**? ${ask.text}`,
        answer: ev.fav / 8,
        form: ask.form,
        marks: 2,
        calculator: 'not-allowed',
        hints: ['Draw a tree diagram with three stages, one for each coin. How many outcomes are there?', ev.name.startsWith('at least') ? 'It can be quicker to count the outcomes that do NOT fit, then use the complement.' : 'List the outcomes at the end of the branches and count the ones that fit.'],
        solution: `The tree diagram has $2 \\times 2 \\times 2 = 8$ equally likely outcomes: HHH, HHT, HTH, HTT, THH, THT, TTH, TTT.\n\nThe outcomes with ${ev.name}: ${ev.list} (${ev.fav} outcomes).${ev.name.startsWith('at least') ? `\n\nUsing the complement: $1 - ${frac(1, 8)} = ${frac(7, 8)}$.` : ''}\n\n$P = ${pTex(ev.fav, 8)}$`,
      };
    }
    const evs = [
      { name: 'at least one 6', fav: 11, table: twoDiceTable((x, y) => (x === 6 || y === 6 ? '✓' : '·'), ' '), note: 'Using the complement: no 6 on either die happens in $5 \\times 5 = 25$ ways, so at least one 6 happens in $36 - 25 = 11$ ways.' },
      { name: 'an even product (when the two numbers are multiplied)', fav: 27, table: twoDiceTable((x, y) => x * y, '×'), note: 'The product is odd only when both numbers are odd: $3 \\times 3 = 9$ ways. So it is even in $36 - 9 = 27$ ways.' },
      { name: 'a total that is a prime number', fav: 15, table: twoDiceTable((x, y) => x + y), note: 'The prime totals are 2, 3, 5, 7 and 11. They appear 1 + 2 + 4 + 6 + 2 = 15 times in the table.' },
      { name: 'a difference of 1 between the two numbers', fav: 10, table: twoDiceTable((x, y) => Math.abs(x - y), '−'), note: 'A difference of 1 appears 10 times in the table: (1,2), (2,1), (2,3), (3,2), (3,4), (4,3), (4,5), (5,4), (5,6), (6,5).' },
      { name: 'a total of 10 or more', fav: 6, table: twoDiceTable((x, y) => x + y), note: 'Totals of 10, 11 and 12 appear 3 + 2 + 1 = 6 times.' },
    ];
    const ev = rng.pick(evs);
    const ask = fractionAsk(rng, 0.6);
    return {
      type: 'numeric',
      prompt: `${name} rolls two fair six-sided dice.\n\nWhat is the probability of getting **${ev.name}**? ${ask.text}`,
      answer: ev.fav / 36,
      form: ask.form,
      marks: 2,
      calculator: 'not-allowed',
      hints: ['Draw a 6 by 6 table to show all 36 equally likely outcomes.', 'Fill in each cell, then count the cells that fit. Sometimes it is quicker to count the ones that don’t fit.'],
      solution: `${ev.table}\n\n${ev.note}\n\n$P = ${pTex(ev.fav, 36)}$`,
    };
  },
};

export const templates: QuestionTemplate[] = [singleEvent, formsAndCompare, complement, twoEvents];
