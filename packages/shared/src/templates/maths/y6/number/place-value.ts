import type { Rng } from '../../../../rng';
import { NAMES, num, tex } from '../../../format';
import type { QuestionTemplate } from '../../../types';

// m6.num.place-value — reading, writing, ordering and rounding whole numbers up to the millions,
// rounding hundredths, and estimating. Year 6: no calculator, so every number is chosen for
// mental or written work.

const PLACE_NAMES: Record<number, string> = {
  1: 'ones',
  10: 'tens',
  100: 'hundreds',
  1000: 'thousands',
  10000: 'ten thousands',
  100000: 'hundred thousands',
  1000000: 'millions',
  10000000: 'ten millions',
};
const PLACE_LIST = [1, 10, 100, 1000, 10000, 100000, 1000000, 10000000] as const;

/** "nearest ___" words. */
const ROUND_WORD: Record<number, string> = {
  10: 'ten',
  100: 'hundred',
  1000: 'thousand',
  10000: 'ten thousand',
  100000: 'hundred thousand',
  1000000: 'million',
};

const placeName = (p: number) => PLACE_NAMES[p] ?? `${num(p)}s`;
const roundWord = (p: number) => ROUND_WORD[p] ?? num(p);

/** Tries `fn` until it returns a value. */
function retry<T>(fn: () => T | null): T {
  for (let i = 0; i < 500; i++) {
    const v = fn();
    if (v !== null) return v;
  }
  throw new Error('place-value: could not generate a question');
}

/** A random whole number with exactly `digits` digits. */
function randDigits(rng: Rng, digits: number): number {
  let n = rng.int(1, 9);
  for (let i = 1; i < digits; i++) n = n * 10 + rng.int(0, 9);
  return n;
}

const digitsOf = (n: number) => String(n).split('').map(Number);
const fromDigits = (ds: number[]) => Number(ds.join(''));
/** The digit in place p (p = 1, 10, 100, …). */
const digitAt = (n: number, p: number) => Math.floor(n / p) % 10;

/** Order items with shuffled ids so the ids never give the order away. */
function orderItems(rng: Rng, textsInOrder: string[]) {
  const ids = rng.shuffle(['p', 'q', 'r', 's', 't', 'u', 'v', 'w']);
  return textsInOrder.map((text, i) => ({ id: ids[i]!, text }));
}

const ONES = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function words99(n: number): string {
  if (n < 20) return ONES[n]!;
  const o = n % 10;
  return o ? `${TENS[Math.floor(n / 10)]}-${ONES[o]}` : TENS[Math.floor(n / 10)]!;
}

function words999(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (!h) return words99(r);
  return r ? `${ONES[h]} hundred and ${words99(r)}` : `${ONES[h]} hundred`;
}

/** NZ-style number words: 4060005 → "four million, sixty thousand and five". */
export function numberWords(n: number): string {
  const m = Math.floor(n / 1_000_000);
  const t = Math.floor(n / 1000) % 1000;
  const u = n % 1000;
  const parts: string[] = [];
  if (m) parts.push(`${words999(m)} million`);
  if (t) parts.push(`${words999(t)} thousand`);
  let out = parts.join(', ');
  if (u) out = out ? (u < 100 ? `${out} and ${words99(u)}` : `${out}, ${words999(u)}`) : words999(u);
  return out || 'zero';
}

const pad = (n: number, w: number) => String(n).padStart(w, '0');
/** 14.67 from 1467 hundredths, as text with two decimal places. */
const hundredthsText = (h: number) => `${Math.floor(h / 100)}.${pad(h % 100, 2)}`;
/** 14.7 from 147 tenths, as text with one decimal place. */
const tenthsText = (t: number) => `${Math.floor(t / 10)}.${t % 10}`;

// ---------------------------------------------------------------------------------------------

export const digitValue: QuestionTemplate = {
  id: 'm6.num.place-value.digit-value',
  topicId: 'm6.num.place-value',
  title: 'Value of a digit, and writing big numbers in digits',
  difficulties: [1, 2],
  generate({ rng, difficulty }) {
    const kind =
      difficulty === 1 ? rng.pick(['value', 'value', 'place'] as const) : rng.pick(['value', 'write', 'write'] as const);

    if (kind === 'write') {
      // Words → digits, with zeros as place holders.
      const { n, m, t, u } = retry(() => {
        const m = rng.chance(0.6) ? rng.int(1, 9) : rng.int(10, 99);
        const group = () =>
          rng.pick([rng.int(1, 9), rng.int(1, 9) * 10, rng.int(1, 9) * 100, rng.int(11, 99), rng.int(101, 999), 0]);
        const t = group();
        const u = group();
        if (t === 0 && u === 0) return null;
        if (t >= 100 && u >= 100) return null; // make sure a zero place holder is needed
        return { n: m * 1_000_000 + t * 1000 + u, m, t, u };
      });
      return {
        type: 'numeric',
        prompt: `Write this number in digits:\n\n**${numberWords(n)}**`,
        answer: n,
        form: 'integer',
        calculator: 'not-allowed',
        hints: [
          'Write the millions first, then the thousands, then the hundreds, tens and ones.',
          'After the millions, each group needs exactly three digits. Use zeros to fill any empty places.',
        ],
        solution: [
          `Split the number into groups:`,
          `- millions: **${m}**`,
          `- thousands: ${t ? numberWords(t) : 'none'} → **${pad(t, 3)}**`,
          `- hundreds, tens and ones: ${u ? numberWords(u) : 'none'} → **${pad(u, 3)}**`,
          ``,
          `Put the groups together: **${num(n)}**.`,
        ].join('\n'),
      };
    }

    const digits = difficulty === 1 ? rng.pick([5, 6]) : rng.pick([7, 8]);
    const { n, d, place } = retry(() => {
      const n = randDigits(rng, digits);
      const ds = digitsOf(n);
      const choices: Array<{ d: number; place: number }> = [];
      ds.forEach((d, i) => {
        const place = 10 ** (ds.length - 1 - i);
        if (d !== 0 && place >= 10 && ds.filter((x) => x === d).length === 1) choices.push({ d, place });
      });
      return choices.length ? { n, ...rng.pick(choices) } : null;
    });

    if (kind === 'place') {
      const idx = PLACE_LIST.indexOf(place as (typeof PLACE_LIST)[number]);
      const others = PLACE_LIST.filter((p, i) => i !== idx && i <= digits)
        .map((p) => ({ p, gap: Math.abs(PLACE_LIST.indexOf(p) - idx) }))
        .sort((a, b) => a.gap - b.gap)
        .slice(0, 3)
        .map((x) => x.p);
      const ids = ['a', 'b', 'c', 'd'];
      const opts = rng.shuffle([place, ...others]);
      const correctId = ids[opts.indexOf(place)]!;
      return {
        type: 'mcq',
        prompt: `In the number ${num(n)}, which place is the digit **${d}** in?`,
        options: opts.map((p, i) => ({ id: ids[i]!, text: `The ${placeName(p)} place` })),
        correct: correctId,
        feedback: Object.fromEntries(
          opts
            .map((p, i) => [ids[i]!, p] as const)
            .filter(([, p]) => p !== place)
            .map(([id]) => [id, `Count the places from the right: ones, tens, hundreds, thousands, … The ${d} is in the ${placeName(place)} place.`]),
        ),
        calculator: 'not-allowed',
        hints: ['Start at the right-hand end of the number: that digit is in the ones place.', 'Move left one place at a time: ones, tens, hundreds, thousands, ten thousands, …'],
        solution: `Counting places from the right of ${num(n)}: ones, tens, hundreds, … The ${d} is in the **${placeName(place)}** place, so it is worth ${num(d * place)}.`,
      };
    }

    const value = d * place;
    return {
      type: 'numeric',
      prompt: `What is the value of the digit **${d}** in ${num(n)}?`,
      answer: value,
      form: 'integer',
      calculator: 'not-allowed',
      hints: [
        `Find which place the ${d} is in: ones, tens, hundreds, thousands, …`,
        'The value of a digit is the digit × the value of its place.',
      ],
      solution: `In ${num(n)}, the ${d} is in the **${placeName(place)}** place.\n\nSo it is worth $${d} \\times ${tex(place)} = ${tex(value)}$.`,
    };
  },
};

// ---------------------------------------------------------------------------------------------

/** All orderings of the given digits. */
function permutations(ds: number[]): number[][] {
  if (ds.length <= 1) return [ds];
  const out: number[][] = [];
  ds.forEach((d, i) => {
    for (const rest of permutations([...ds.slice(0, i), ...ds.slice(i + 1)])) out.push([d, ...rest]);
  });
  return out;
}

/** n with the digit at place p replaced by `digit`. */
function setDigit(n: number, p: number, digit: number): number {
  return n - digitAt(n, p) * p + digit * p;
}

export const compareOrder: QuestionTemplate = {
  id: 'm6.num.place-value.compare-order',
  topicId: 'm6.num.place-value',
  title: 'Compare and order whole numbers',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      if (rng.chance(0.5)) {
        // Largest or smallest of four numbers made from the same digits.
        const ds = rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], 4);
        const chosen = rng.sample(permutations(ds), 4).map(fromDigits);
        const largest = rng.chance(0.5);
        const target = largest ? Math.max(...chosen) : Math.min(...chosen);
        const ids = ['a', 'b', 'c', 'd'];
        const sorted = [...chosen].sort((x, y) => x - y);
        return {
          type: 'mcq',
          prompt: `Which number is the **${largest ? 'largest' : 'smallest'}**?`,
          options: chosen.map((v, i) => ({ id: ids[i]!, text: num(v) })),
          correct: ids[chosen.indexOf(target)]!,
          feedback: Object.fromEntries(
            chosen
              .map((v, i) => [ids[i]!, v] as const)
              .filter(([, v]) => v !== target)
              .map(([id, v]) => [id, `${num(v)} is ${largest ? 'smaller' : 'bigger'} than ${num(target)}. Compare the thousands digits first, then the hundreds, then the tens.`]),
          ),
          calculator: 'not-allowed',
          hints: [
            'All four numbers have the same number of digits.',
            'Compare the thousands digits first. If they are the same, compare the hundreds digits, and so on.',
          ],
          solution: `All four numbers have 4 digits, so compare the thousands first, then the hundreds, then the tens.\n\nFrom smallest to largest: ${sorted.map((v) => num(v)).join(', ')}.\n\nSo the ${largest ? 'largest' : 'smallest'} is **${num(target)}**.`,
        };
      }
      // < or > between two numbers that differ in one place.
      const digits = rng.pick([4, 5]);
      const a = randDigits(rng, digits);
      const places = [1, 10, 100, 1000, 10000].filter((p) => p < 10 ** digits);
      const p = rng.pick(places);
      const b = retry(() => {
        const dig = rng.int(p === 10 ** (digits - 1) ? 1 : 0, 9);
        return dig === digitAt(a, p) ? null : setDigit(a, p, dig);
      });
      const sym = a < b ? '<' : '>';
      return {
        type: 'cloze',
        prompt: `Choose the symbol that makes this true.\n\n$${tex(a)}$ [[a]] $${tex(b)}$`,
        blanks: [{ id: 'a', accepted: [sym], options: ['<', '>', '='] }],
        calculator: 'not-allowed',
        hints: ['$<$ means "is less than" and $>$ means "is greater than". The pointy end points to the smaller number.', 'Compare the digits from the left until you find a place where they are different.'],
        solution: `Both numbers have ${digits} digits. They match until the **${placeName(p)}** place, where ${num(a)} has ${digitAt(a, p)} and ${num(b)} has ${digitAt(b, p)}.\n\nSo $${tex(a)} ${sym} ${tex(b)}$.`,
      };
    }

    if (difficulty === 2) {
      // Order five numbers, including a trap with fewer digits but a bigger first digit.
      const values = retry(() => {
        const base = randDigits(rng, 6);
        const ds = digitsOf(base);
        const i = rng.int(1, 4);
        const swapped = [...ds];
        [swapped[i], swapped[i + 1]] = [swapped[i + 1]!, swapped[i]!];
        const vals = [
          base,
          fromDigits(swapped),
          setDigit(base, rng.pick([1000, 10000]), rng.int(0, 9)),
          randDigits(rng, 5) % 10000 + 90000, // 5 digits starting with 9
          base + rng.pick([-1, 1]) * rng.int(1, 9) * 1000,
        ];
        // Only the trap (index 3) has 5 digits.
        if (new Set(vals).size !== 5 || vals.some((v, i) => i !== 3 && v < 100000)) return null;
        return vals;
      });
      const descending = rng.chance(0.4);
      const sorted = [...values].sort((x, y) => (descending ? y - x : x - y));
      return {
        type: 'order',
        prompt: `Put these numbers in order from **${descending ? 'largest to smallest' : 'smallest to largest'}**:\n\n${rng
          .shuffle(values)
          .map((v) => num(v))
          .join(',   ')}`,
        items: orderItems(rng, sorted.map((v) => num(v))),
        calculator: 'not-allowed',
        hints: [
          'Count the digits first. A number with more digits is bigger.',
          'For numbers with the same number of digits, compare from the left: hundred thousands, then ten thousands, and so on.',
        ],
        solution: `The 5-digit number is the smallest, even though it starts with 9, because it has no hundred thousands.\n\nFor the 6-digit numbers, compare the digits from the left.\n\nThe order is: ${sorted.map((v) => num(v)).join(', ')}.`,
      };
    }

    // difficulty 3
    if (rng.chance(0.5)) {
      // Which number is between two benchmarks?
      const { A, B, k } = retry(() => {
        const A = rng.int(1, 8);
        const B = rng.int(1, 8);
        const k = rng.int(1, 9);
        return k === B ? null : { A, B, k };
      });
      const lo = A * 1_000_000 + B * 100_000;
      const hi = lo + 100_000;
      const correct = lo + k * 10_000;
      const swapped = A * 1_000_000 + k * 100_000 + B * 10_000;
      const short = correct / 10;
      const shifted = A * 1_000_000 + k * 10_000 + B * 1_000;
      const ids = ['a', 'b', 'c', 'd'];
      const vals = rng.shuffle([correct, swapped, short, shifted]);
      const why = (v: number) =>
        v === short
          ? `${num(v)} has only 6 digits, so it is less than one million.`
          : v < lo
            ? `${num(v)} is less than ${num(lo)}.`
            : `${num(v)} is more than ${num(hi)}.`;
      return {
        type: 'mcq',
        prompt: `Which number is **between** ${num(lo)} and ${num(hi)}?`,
        options: vals.map((v, i) => ({ id: ids[i]!, text: num(v) })),
        correct: ids[vals.indexOf(correct)]!,
        feedback: Object.fromEntries(vals.map((v, i) => [ids[i]!, v] as const).filter(([, v]) => v !== correct).map(([id, v]) => [id, why(v)])),
        calculator: 'not-allowed',
        hints: ['Check how many digits each number has.', `The number must have ${A} million and ${B} hundred thousand.`],
        solution: `A number between ${num(lo)} and ${num(hi)} has **${A}** millions and **${B}** hundred thousands.\n\n${num(correct)} has ${A} millions and ${B} hundred thousands, so it is the one.`,
      };
    }
    // 10 000 / 100 000 more or less, often crossing into the next place.
    const p = rng.pick([1000, 10000, 100000]);
    const more = rng.chance(0.5);
    const n = retry(() => {
      let n = randDigits(rng, 7);
      if (rng.chance(0.6)) n = setDigit(n, p, more ? 9 : 0); // force a carry or a borrow
      return n - (more ? 0 : p) > 0 ? n : null;
    });
    const answer = more ? n + p : n - p;
    return {
      type: 'numeric',
      prompt: `What number is **${num(p)} ${more ? 'more' : 'less'}** than ${num(n)}?`,
      answer,
      form: 'integer',
      calculator: 'not-allowed',
      hints: [
        `${num(p)} is one in the ${placeName(p)} place. Which digit changes?`,
        more ? 'If that digit is 9, it becomes 0 and the next place to the left goes up by 1.' : 'If that digit is 0, it becomes 9 and the next place to the left goes down by 1.',
      ],
      solution: `${more ? 'Adding' : 'Taking away'} ${num(p)} changes the **${placeName(p)}** digit by 1.\n\nThe ${placeName(p)} digit of ${num(n)} is ${digitAt(n, p)}.${
        more && digitAt(n, p) === 9
          ? ` One more than 9 ${placeName(p)} is 10 ${placeName(p)}, so write 0 and carry 1 to the next place.`
          : !more && digitAt(n, p) === 0
            ? ` There are 0 ${placeName(p)}, so swap 1 from the next place for 10 ${placeName(p)} first.`
            : ''
      }\n\n${num(n)} ${more ? '+' : '−'} ${num(p)} = **${num(answer)}**.`,
    };
  },
};

// ---------------------------------------------------------------------------------------------

export const roundWhole: QuestionTemplate = {
  id: 'm6.num.place-value.round-whole',
  topicId: 'm6.num.place-value',
  title: 'Round whole numbers (to the nearest ten up to the nearest million)',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    if (difficulty === 3 && rng.chance(0.35)) {
      // A rounded number: which original could it be?
      const p = rng.pick([100, 1000, 10000]);
      const R = rng.int(2, 19) * p;
      const half = p / 2;
      const tenth = p / 10;
      const correct = R + retry(() => {
        const j = rng.int(-half, half - 1);
        return j === 0 || j % tenth === 0 ? null : j;
      });
      const up = R + half + rng.int(0, 9) * (tenth / 10 >= 1 ? tenth / 10 : 1);
      const down = R - half - rng.int(1, tenth);
      const trunc = R + rng.int(6, 9) * tenth;
      const vals = rng.shuffle([correct, up, down, trunc]);
      if (new Set(vals).size < 4) {
        vals.splice(0, 4, ...rng.shuffle([correct, R + half, R - half - 1, R + 7 * tenth]));
      }
      const ids = ['a', 'b', 'c', 'd'];
      const roundP = (v: number) => Math.round(v / p) * p;
      return {
        type: 'mcq',
        prompt: `A number rounded to the nearest ${roundWord(p)} is ${num(R)}. Which of these could the number be?`,
        options: vals.map((v, i) => ({ id: ids[i]!, text: num(v) })),
        correct: ids[vals.indexOf(correct)]!,
        feedback: Object.fromEntries(
          vals
            .map((v, i) => [ids[i]!, v] as const)
            .filter(([, v]) => v !== correct)
            .map(([id, v]) => [
              id,
              v === trunc
                ? `${num(v)} rounds up to ${num(roundP(v))}. Rounding isn't just dropping the end digits: look at the digit to the right.`
                : `${num(v)} rounds to ${num(roundP(v))}, not ${num(R)}.`,
            ]),
        ),
        calculator: 'not-allowed',
        hints: [
          `Round each option to the nearest ${roundWord(p)}.`,
          `Numbers from ${num(R - half)} up to (but not including) ${num(R + half)} round to ${num(R)}.`,
        ],
        solution: `Numbers from ${num(R - half)} up to ${num(R + half - 1)} round to ${num(R)}.\n\n${num(correct)} is in that range, so it could be the number.`,
      };
    }

    const p = difficulty === 1 ? rng.pick([10, 100]) : difficulty === 2 ? rng.pick([1000, 10000]) : rng.pick([100000, 1000000]);
    const digits = Math.max(String(p).length, difficulty === 1 ? rng.pick([3, 4]) : difficulty === 2 ? rng.pick([5, 6]) : 7);
    const n = retry(() => {
      let n = randDigits(rng, digits);
      if (rng.chance(0.2)) n = setDigit(n, p / 10, 5); // the "exactly 5" case
      if (difficulty >= 2 && rng.chance(0.3)) n = setDigit(setDigit(n, p, 9), p / 10, rng.int(5, 9)); // rounding carries
      return n % p === 0 || n < p ? null : n;
    });
    const lower = Math.floor(n / p) * p;
    const upper = lower + p;
    const answer = Math.round(n / p) * p;
    const dig = digitAt(n, p / 10);
    return {
      type: 'numeric',
      prompt: `Round ${num(n)} to the nearest **${roundWord(p)}**.`,
      answer,
      form: 'integer',
      calculator: 'not-allowed',
      hints: [
        `Which two multiples of ${num(p)} does ${num(n)} sit between?`,
        `Look at the digit just to the right of the ${placeName(p)} place. 5 or more rounds up; 4 or less rounds down.`,
      ],
      solution: `${num(n)} is between ${num(lower)} and ${num(upper)}.\n\nThe ${placeName(p / 10)} digit is **${dig}**. ${
        dig >= 5 ? 'That is 5 or more, so round **up**.' : 'That is 4 or less, so round **down**.'
      }\n\n${num(n)} rounded to the nearest ${roundWord(p)} is **${num(answer)}**.`,
    };
  },
};

// ---------------------------------------------------------------------------------------------

/** Contexts for rounding hundredths; `h` is the range of the value in hundredths. */
const DECIMAL_CONTEXTS = [
  { text: (name: string, x: string) => `${name} ran 100 m in ${x} seconds.`, what: 'this time', units: 's', unitWord: 'second', h: [1201, 1999] },
  { text: (_n: string, x: string) => `A bag of kūmara weighs ${x} kg.`, what: 'this mass', units: 'kg', unitWord: 'kilogram', h: [101, 999] },
  { text: (_n: string, x: string) => `It rained ${x} mm in Westport on Tuesday.`, what: 'the rainfall', units: 'mm', unitWord: 'millimetre', h: [101, 4999] },
  { text: (name: string, x: string) => `${name}'s drink bottle holds ${x} L of water.`, what: 'this amount', units: 'L', unitWord: 'litre', h: [51, 199] },
  { text: (name: string, x: string) => `${name} jumped ${x} m in the long jump at the school athletics day.`, what: 'this distance', units: 'm', unitWord: 'metre', h: [201, 499] },
] as const;

export const roundDecimal: QuestionTemplate = {
  id: 'm6.num.place-value.round-decimal',
  topicId: 'm6.num.place-value',
  title: 'Round hundredths to the nearest whole number or tenth',
  difficulties: [2, 3],
  generate({ rng, difficulty }) {
    if (difficulty === 3 && rng.chance(0.35)) {
      // Which number rounds to T tenths?
      const T = retry(() => {
        const t = rng.int(12, 99);
        return t % 10 < 2 ? null : t;
      });
      const correct = 10 * T + retry(() => {
        const j = rng.int(-5, 4);
        return j === 0 ? null : j;
      });
      const up = 10 * T + 5 + rng.int(0, 4);
      const down = 10 * T - 6 - rng.int(0, 2);
      const shifted = Math.floor(T / 10) * 100 + (T % 10); // 6.04 for 6.4
      const vals = rng.shuffle([correct, up, down, shifted]);
      const ids = ['a', 'b', 'c', 'd'];
      const r = (h: number) => tenthsText(Math.round(h / 10));
      return {
        type: 'mcq',
        prompt: `Which number rounds to **${tenthsText(T)}** when you round it to the nearest tenth?`,
        options: vals.map((v, i) => ({ id: ids[i]!, text: hundredthsText(v) })),
        correct: ids[vals.indexOf(correct)]!,
        feedback: Object.fromEntries(
          vals
            .map((v, i) => [ids[i]!, v] as const)
            .filter(([, v]) => v !== correct)
            .map(([id, v]) => [
              id,
              v === shifted
                ? `${hundredthsText(v)} has 0 tenths and ${v % 10} hundredths. It rounds to ${r(v)}.`
                : `${hundredthsText(v)} rounds to ${r(v)}. Look at the hundredths digit.`,
            ]),
        ),
        calculator: 'not-allowed',
        hints: ['Round each option to one decimal place.', 'Look at the hundredths digit (the second digit after the point). 5 or more rounds up.'],
        solution: `Numbers from ${hundredthsText(10 * T - 5)} up to ${hundredthsText(10 * T + 4)} round to ${tenthsText(T)}.\n\n${hundredthsText(correct)} is in that range, so it rounds to **${tenthsText(T)}**.`,
      };
    }

    const ctx = difficulty === 3 ? rng.pick(DECIMAL_CONTEXTS) : null;
    const [hMin, hMax] = ctx ? ctx.h : [101, 2999];
    const h = retry(() => {
      const h = rng.int(hMin, hMax);
      return h % 10 === 0 ? null : h;
    });
    const toWhole = rng.chance(0.4);
    const x = hundredthsText(h);
    const answer = toWhole ? Math.round(h / 100) : Math.round(h / 10) / 10;
    const ansText = toWhole ? String(answer) : tenthsText(Math.round(h / 10));
    const target = toWhole ? 'whole number' : 'tenth';
    const dig = toWhole ? Math.floor(h / 10) % 10 : h % 10;
    const lo = toWhole ? String(Math.floor(h / 100)) : tenthsText(Math.floor(h / 10));
    const hi = toWhole ? String(Math.floor(h / 100) + 1) : tenthsText(Math.floor(h / 10) + 1);
    const name = rng.pick(NAMES);
    const prompt = ctx
      ? `${ctx.text(name, x)} Round ${ctx.what} to the nearest ${toWhole ? `whole ${ctx.unitWord}` : `tenth of a ${ctx.unitWord}`}.`
      : `Round ${x} to the nearest **${target}**.`;
    return {
      type: 'numeric',
      prompt,
      answer,
      ...(ctx && { units: ctx.units }),
      calculator: 'not-allowed',
      hints: [
        toWhole ? `Which two whole numbers is ${x} between?` : `Which two tenths is ${x} between? (Tenths have one decimal place.)`,
        `Look at the ${toWhole ? 'tenths digit (the first digit after the point)' : 'hundredths digit (the second digit after the point)'}. 5 or more rounds up.`,
      ],
      solution: `${x} is between ${lo} and ${hi}.\n\nThe ${toWhole ? 'tenths' : 'hundredths'} digit is **${dig}**. ${
        dig >= 5 ? 'That is 5 or more, so round **up**.' : 'That is 4 or less, so round **down**.'
      }\n\nSo ${x} rounded to the nearest ${target} is **${ansText}${ctx ? ` ${ctx.units}` : ''}**.`,
    };
  },
};

// ---------------------------------------------------------------------------------------------

export const baseTen: QuestionTemplate = {
  id: 'm6.num.place-value.base-ten',
  topicId: 'm6.num.place-value',
  title: 'Base 10: decimal places, renaming and "times as much"',
  difficulties: [3, 4],
  generate({ rng, difficulty }) {
    const kind =
      difficulty === 3 ? rng.pick(['decimal-digit', 'times'] as const) : rng.pick(['rename', 'tenths-in', 'times'] as const);

    if (kind === 'decimal-digit') {
      const { h, d, place } = retry(() => {
        const h = rng.int(101, 9999);
        const ds = digitsOf(h);
        const tenthsD = Math.floor(h / 10) % 10;
        const hundD = h % 10;
        const pick = rng.pick(['tenths', 'hundredths'] as const);
        const d = pick === 'tenths' ? tenthsD : hundD;
        if (d === 0 || ds.filter((x) => x === d).length !== 1) return null;
        return { h, d, place: pick };
      });
      const value = place === 'tenths' ? d / 10 : d / 100;
      return {
        type: 'numeric',
        prompt: `What is the value of the digit **${d}** in ${hundredthsText(h)}? Write your answer as a decimal or a fraction.`,
        answer: value,
        calculator: 'not-allowed',
        hints: ['The first place after the decimal point is tenths. The second place is hundredths.', `So what is the ${d} worth?`],
        solution: `In ${hundredthsText(h)}, the ${d} is in the **${place}** place.\n\nSo it is worth ${d} ${place}: $${place === 'tenths' ? `\\frac{${d}}{10}` : `\\frac{${d}}{100}`} = ${place === 'tenths' ? `0.${d}` : `0.0${d}`}$.`,
      };
    }

    if (kind === 'times') {
      // The same digit in two places: how many times as much is the left one worth?
      const gap = difficulty === 3 ? rng.int(1, 2) : rng.int(3, 4);
      const { n, d, p1, p2 } = retry(() => {
        const digits = rng.int(gap + 1, 6);
        const d = rng.int(1, 9);
        const p2 = 10 ** rng.int(0, digits - 1 - gap);
        const p1 = p2 * 10 ** gap;
        let n = 0;
        for (let i = 0; i < digits; i++) {
          const p = 10 ** i;
          let dig = p === p1 || p === p2 ? d : rng.int(0, 9);
          if (p !== p1 && p !== p2 && dig === d) dig = (d + 1 + rng.int(0, 7)) % 10;
          if (i === digits - 1 && dig === 0) return null;
          n += dig * p;
        }
        return { n, d, p1, p2 };
      });
      const ratio = p1 / p2;
      return {
        type: 'numeric',
        prompt: `The digit ${d} appears twice in ${num(n)}. How many times as much is the **left-hand** ${d} worth as the **right-hand** ${d}?`,
        answer: ratio,
        form: 'integer',
        calculator: 'not-allowed',
        hints: ['Work out the value of each digit.', 'Each place is worth 10 times as much as the place to its right.'],
        solution: `The left-hand ${d} is in the ${placeName(p1)} place, so it is worth ${num(d * p1)}.\n\nThe right-hand ${d} is in the ${placeName(p2)} place, so it is worth ${num(d * p2)}.\n\nThey are ${gap} place${gap === 1 ? '' : 's'} apart. Each place is worth 10 times as much as the place to its right, so the left-hand ${d} is worth **${num(ratio)}** times as much.`,
      };
    }

    if (kind === 'tenths-in') {
      const t = rng.int(12, 99);
      const hundredths = rng.chance(0.3);
      const n = hundredths ? rng.int(101, 999) : t;
      const x = hundredths ? hundredthsText(n) : tenthsText(n);
      const unit = hundredths ? 'hundredths' : 'tenths';
      return {
        type: 'numeric',
        prompt: `How many **${unit}** are there in ${x}?`,
        answer: n,
        form: 'integer',
        calculator: 'not-allowed',
        hints: [`How many ${unit} make one whole?`, `Count the ${unit} in the whole-number part, then add the ${unit} after the point.`],
        solution: `One whole is ${hundredths ? 100 : 10} ${unit}, so ${Math.floor(n / (hundredths ? 100 : 10))} wholes are ${Math.floor(n / (hundredths ? 100 : 10)) * (hundredths ? 100 : 10)} ${unit}.\n\nAdd the ${n % (hundredths ? 100 : 10)} ${unit} after the point: there are **${n}** ${unit} in ${x}.`,
      };
    }

    // rename: how many hundreds are in 45 000?
    const u = rng.pick([10, 100, 1000]);
    const c = rng.int(12, 999);
    const n = c * u;
    return {
      type: 'numeric',
      prompt: `How many **${placeName(u)}** are there in ${num(n)}?`,
      answer: c,
      form: 'integer',
      calculator: 'not-allowed',
      hints: [`How many ${placeName(u)} are in ${num(u * 10)}? In ${num(u * 100)}?`, `Think of ${num(n)} as a number of ${placeName(u)}: what is left when you take off the last ${String(u).length - 1} zero${u === 10 ? '' : 's'}?`],
      solution: `One ${roundWord(u)} is ${num(u)}, so count how many lots of ${num(u)} make ${num(n)}.\n\n$${tex(c)} \\times ${tex(u)} = ${tex(n)}$, so there are **${num(c)}** ${placeName(u)} in ${num(n)}.`,
    };
  },
};

// ---------------------------------------------------------------------------------------------

const roundTo = (v: number, p: number) => Math.round(v / p) * p;

export const estimate: QuestionTemplate = {
  id: 'm6.num.place-value.estimate',
  topicId: 'm6.num.place-value',
  title: 'Estimate by rounding',
  difficulties: [3, 4, 5],
  generate({ rng, difficulty }) {
    const name = rng.pick(NAMES);
    if (difficulty === 3) {
      const p = rng.pick([100, 1000]);
      const digits = p === 100 ? 3 : 4;
      const op = rng.pick(['+', '−'] as const);
      const { a, b } = retry(() => {
        const a = randDigits(rng, digits);
        const b = randDigits(rng, digits);
        if (a % p === 0 || b % p === 0) return null;
        if (op === '−' && roundTo(a, p) <= roundTo(b, p)) return null;
        return { a, b };
      });
      const ra = roundTo(a, p);
      const rb = roundTo(b, p);
      const answer = op === '+' ? ra + rb : ra - rb;
      const context = rng.chance(0.5);
      const prompt = context
        ? op === '+'
          ? `${num(a)} people went to the A&P show on Saturday and ${num(b)} went on Sunday. Estimate how many people went altogether by rounding each number to the nearest ${roundWord(p)}.`
          : `The school wants to raise \\$${num(a)} for new netball hoops. So far it has raised \\$${num(b)}. Estimate how much more it needs by rounding each amount to the nearest ${roundWord(p)} dollars.`
        : `Estimate $${tex(a)} ${op === '+' ? '+' : '-'} ${tex(b)}$ by rounding each number to the nearest ${roundWord(p)}.`;
      return {
        type: 'numeric',
        prompt,
        answer,
        form: 'integer',
        ...(context && op === '−' && { units: '$' }),
        calculator: 'not-allowed',
        hints: [`Round each number to the nearest ${roundWord(p)} first.`, `Then ${op === '+' ? 'add' : 'subtract'} the rounded numbers. You don't need the exact answer.`],
        solution: `${num(a)} rounds to ${num(ra)}, and ${num(b)} rounds to ${num(rb)}.\n\n$${tex(ra)} ${op === '+' ? '+' : '-'} ${tex(rb)} = ${tex(answer)}$\n\nThe estimate is **${context && op === '−' ? '\\$' : ''}${num(answer)}**.`,
      };
    }

    if (difficulty === 4) {
      if (rng.chance(0.5)) {
        // two-digit × two-digit, both to the nearest ten
        const { a, b } = retry(() => {
          const a = rng.int(12, 94);
          const b = rng.int(12, 94);
          return a % 10 === 0 || b % 10 === 0 || a % 10 === 5 || b % 10 === 5 ? null : { a, b };
        });
        const ra = roundTo(a, 10);
        const rb = roundTo(b, 10);
        return {
          type: 'numeric',
          prompt: `Estimate $${a} \\times ${b}$ by rounding each number to the nearest ten.`,
          answer: ra * rb,
          form: 'integer',
          marks: 2,
          calculator: 'not-allowed',
          hints: ['Round each number to the nearest ten.', `To multiply two tens numbers, multiply the tens digits, then put two zeros on the end.`],
          solution: `${a} rounds to ${ra}, and ${b} rounds to ${rb}.\n\n$${ra} \\times ${rb} = ${ra / 10} \\times ${rb / 10} \\times 100 = ${tex(ra * rb)}$\n\nThe estimate is **${num(ra * rb)}**.`,
        };
      }
      // three-digit × one-digit, rounding the big number to the nearest hundred
      const { a, b } = retry(() => {
        const a = randDigits(rng, 3);
        const b = rng.int(3, 9);
        return a % 100 === 0 || Math.floor(a / 10) % 10 === 5 ? null : { a, b };
      });
      const ra = roundTo(a, 100);
      const ctx = rng.chance(0.5);
      return {
        type: 'numeric',
        prompt: ctx
          ? `A school bus travels ${a} km each week. Estimate how far it travels in ${b} weeks by rounding ${a} to the nearest hundred.`
          : `Estimate $${a} \\times ${b}$ by rounding ${a} to the nearest hundred.`,
        answer: ra * b,
        form: 'integer',
        ...(ctx && { units: 'km' }),
        marks: 2,
        calculator: 'not-allowed',
        hints: [`Round ${a} to the nearest hundred.`, 'Multiply the hundreds digit by the other number, then put two zeros on the end.'],
        solution: `${a} rounds to ${ra}.\n\n$${ra} \\times ${b} = ${ra / 100} \\times ${b} \\times 100 = ${tex(ra * b)}$\n\nThe estimate is **${num(ra * b)}${ctx ? ' km' : ''}**.`,
      };
    }

    // difficulty 5
    if (rng.chance(0.5)) {
      // Is the exact answer more or less than the estimate?
      const up = rng.chance(0.5);
      const { a, b } = retry(() => {
        const a = rng.int(12, 94);
        const b = rng.int(12, 94);
        const okA = up ? a % 10 >= 6 : a % 10 >= 1 && a % 10 <= 4;
        const okB = up ? b % 10 >= 6 : b % 10 >= 1 && b % 10 <= 4;
        return okA && okB && a !== b ? { a, b } : null;
      });
      const ra = roundTo(a, 10);
      const rb = roundTo(b, 10);
      const est = ra * rb;
      const dir = up ? 'up' : 'down';
      const right = up ? 'Less' : 'More';
      const wrong = up ? 'More' : 'Less';
      const ids = ['a', 'b', 'c', 'd'];
      const texts = [
        `${right} than ${num(est)}, because both numbers were rounded ${dir}`,
        `${wrong} than ${num(est)}, because both numbers were rounded ${dir}`,
        `Exactly ${num(est)}, because rounding doesn't change the answer`,
        `You can't tell without working out the exact answer`,
      ];
      return {
        type: 'mcq',
        prompt: `${name} estimates $${a} \\times ${b}$ as $${ra} \\times ${rb} = ${tex(est)}$.\n\nWill the exact answer be more or less than ${num(est)}?`,
        options: texts.map((text, i) => ({ id: ids[i]!, text })),
        correct: 'a',
        feedback: {
          b: `Rounding ${dir} made both numbers ${up ? 'bigger' : 'smaller'}, so the estimate is too ${up ? 'big' : 'small'}.`,
          c: 'Rounding changes the numbers, so an estimate is close to the exact answer but not the same.',
          d: `You can tell: both numbers were rounded ${dir}, so the estimate must be too ${up ? 'big' : 'small'}.`,
        },
        marks: 2,
        calculator: 'not-allowed',
        hints: [`Was ${a} rounded up or down? What about ${b}?`, `If both numbers get ${up ? 'bigger' : 'smaller'}, what happens to the answer?`],
        solution: `${a} was rounded ${dir} to ${ra}, and ${b} was rounded ${dir} to ${rb}.\n\nBoth numbers got ${up ? 'bigger' : 'smaller'}, so the estimate ${num(est)} is too ${up ? 'big' : 'small'}. The exact answer is **${right.toLowerCase()} than ${num(est)}**. (It is ${num(a * b)}.)`,
      };
    }
    // Budget: estimate the money left over.
    const budget = rng.pick([800, 900, 1000, 1200, 1500]);
    const { c1, c2 } = retry(() => {
      const c1 = rng.int(210, 590);
      const c2 = rng.int(110, 490);
      if (c1 % 100 === 50 || c2 % 100 === 50 || c1 % 10 === 0 || c2 % 10 === 0) return null;
      return roundTo(c1, 100) + roundTo(c2, 100) < budget ? { c1, c2 } : null;
    });
    const r1 = roundTo(c1, 100);
    const r2 = roundTo(c2, 100);
    const answer = budget - (r1 + r2);
    return {
      type: 'numeric',
      prompt: `Room ${rng.int(3, 18)} has \\$${num(budget)} for a class trip to the museum. The bus costs \\$${c1} and the entry tickets cost \\$${c2}.\n\nRound each cost to the nearest hundred dollars to **estimate** how much money will be left over.`,
      answer,
      form: 'integer',
      units: '$',
      marks: 2,
      calculator: 'not-allowed',
      hints: ['Round each cost to the nearest hundred dollars.', 'Add the rounded costs, then take the total away from the money the class has.'],
      solution: `\\$${c1} rounds to \\$${r1}, and \\$${c2} rounds to \\$${r2}.\n\nEstimated cost: $${r1} + ${r2} = ${tex(r1 + r2)}$ dollars.\n\nMoney left over: $${tex(budget)} - ${tex(r1 + r2)} = ${tex(answer)}$ dollars.\n\nAbout **\\$${num(answer)}** will be left over.`,
    };
  },
};

export const templates: QuestionTemplate[] = [digitValue, compareOrder, roundWhole, roundDecimal, baseTen, estimate];
