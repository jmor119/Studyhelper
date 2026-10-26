import type { Rng } from '../../../../rng';
import { clean, NAMES, num, PLACES, tex } from '../../../format';
import type { QuestionTemplate, TemplateOutput } from '../../../types';
import { cash, CMP, cmp, cmpWords, decimalLine, fr, mcqFields, orderItems, th } from './fractions-helpers';

// m6.num.decimals: place value to thousandths, comparing and ordering, × and ÷ by 10, 100 and 1000,
// and adding and subtracting decimals. All values are held as whole numbers of thousandths so the
// arithmetic is exact.

const TOPIC = 'm6.num.decimals';
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
const PLACE_NAMES = ['tenths', 'hundredths', 'thousandths'] as const;

/** Number of decimal places needed to show a whole number of thousandths. */
const dpOf = (t: number) => (t % 10 ? 3 : t % 100 ? 2 : t % 1000 ? 1 : 0);

/** A whole number in [min, max] whose last digit isn't 0. */
function noTrailingZero(rng: Rng, min: number, max: number): number {
  for (;;) {
    const n = rng.int(min, max);
    if (n % 10 !== 0) return n;
  }
}

/** Shows a number of thousandths with exactly `dp` decimal places (adding zeros), for KaTeX. */
const padded = (t: number, dp: number) => tex(t / 1000, dp);

export const placeValue: QuestionTemplate = {
  id: `${TOPIC}.place-value`,
  topicId: TOPIC,
  title: 'Tenths, hundredths and thousandths',
  difficulties: [1, 2],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      const kind = rng.pick(['place', 'value', 'fraction', 'line'] as const);
      if (kind === 'place' || kind === 'value') {
        const [w, a, b, c] = rng.sample(DIGITS, 4) as [number, number, number, number];
        const ds = [a, b, c];
        const pos = rng.int(0, 2);
        const d = ds[pos]!;
        const shown = `${w}.${a}${b}${c}`;
        const breakdown = `In $${shown}$: ${w} is in the ones place, ${a} is in the tenths place, ${b} is in the hundredths place and ${c} is in the thousandths place.`;
        if (kind === 'place') {
          const mcq = mcqFields(rng, { text: PLACE_NAMES[pos]! }, [
            { text: 'ones', feedback: `The ones digit is the one just before the decimal point. In $${shown}$ that is ${w}.` },
            ...PLACE_NAMES.map((p, i) => ({
              text: p,
              feedback: `In $${shown}$ the ${p} digit is ${ds[i]}, not ${d}. After the decimal point the places go tenths, hundredths, thousandths.`,
            })).filter((_, i) => i !== pos),
          ]);
          return {
            type: 'mcq',
            prompt: `In the number $${shown}$, which place is the digit **${d}** in?`,
            ...mcq,
            calculator: 'not-allowed',
            hints: ['Find the decimal point first.', 'The places after the decimal point are tenths, then hundredths, then thousandths.'],
            solution: `${breakdown}\n\nSo the ${d} is in the **${PLACE_NAMES[pos]}** place.`,
          };
        }
        const den = 10 ** (pos + 1);
        const answer = clean(d / den);
        return {
          type: 'numeric',
          prompt: `What is the value of the digit **${d}** in $${shown}$? Write your answer as a decimal.`,
          answer,
          form: 'decimal',
          calculator: 'not-allowed',
          hints: ['First work out which place the digit is in.', 'A digit in the hundredths place is worth that many hundredths, and so on.'],
          solution: `${breakdown}\n\nThe ${d} is worth ${d} ${PLACE_NAMES[pos]}: $${fr(d, den)} = ${tex(answer)}$.`,
        };
      }
      if (kind === 'fraction') {
        const tenths = rng.chance(0.4);
        const n = tenths ? rng.int(1, 9) : noTrailingZero(rng, 11, 99);
        const den = tenths ? 10 : 100;
        const answer = clean(n / den);
        return {
          type: 'numeric',
          prompt: `Write $${fr(n, den)}$ as a decimal.`,
          answer,
          form: 'decimal',
          calculator: 'not-allowed',
          hints: [
            tenths ? 'Tenths go in the first place after the decimal point.' : 'Hundredths need two places after the decimal point.',
            'There are no whole ones, so start with 0 and a decimal point.',
          ],
          solution: tenths
            ? `$${fr(n, 10)}$ is ${n} tenths. Tenths go in the first place after the decimal point, so it is $${tex(answer)}$.`
            : `$${fr(n, 100)}$ is ${n} hundredths, which is ${Math.floor(n / 10)} tenths and ${n % 10} hundredths. So it is $${tex(answer)}$.`,
        };
      }
      // Number line in tenths.
      const w = rng.int(0, 5);
      const at = rng.int(1, 9);
      const answer = clean(w + at / 10);
      return {
        type: 'numeric',
        prompt: 'What decimal is the arrow pointing to?',
        figure: {
          svg: decimalLine(w * 1000, 100, 10, at),
          alt: `A number line from ${w} to ${w + 1} split into 10 equal parts, with an arrow pointing at one of the marks.`,
        },
        answer,
        form: 'decimal',
        calculator: 'not-allowed',
        hints: [`The gap from ${w} to ${w + 1} is split into 10 equal parts. What is each part worth?`, `Count the steps from ${w} to the arrow.`],
        solution: `The line from ${w} to ${w + 1} is split into 10 equal steps, so each step is one tenth ($0.1$).\n\nThe arrow is ${at} step${at === 1 ? '' : 's'} after ${w}, so it points to $${tex(answer)}$.`,
      };
    }

    // difficulty 2
    const kind = rng.pick(['thousandths', 'toFraction', 'expanded', 'howMany', 'line'] as const);
    if (kind === 'thousandths') {
      const band = rng.int(0, 3);
      const [n, den] =
        band === 0 ? [rng.int(1, 9), 1000] : band === 1 ? [noTrailingZero(rng, 11, 99), 1000] : band === 2 ? [noTrailingZero(rng, 101, 999), 1000] : [rng.int(1, 9), 100];
      const answer = clean(n / den);
      const dp = den === 1000 ? 3 : 2;
      return {
        type: 'numeric',
        prompt: `Write $${fr(n, den)}$ as a decimal.`,
        answer,
        form: 'decimal',
        calculator: 'not-allowed',
        hints: [
          den === 1000 ? 'Thousandths need three places after the decimal point.' : 'Hundredths need two places after the decimal point.',
          'Use zeros to fill any empty places.',
        ],
        solution: `$${fr(n, den)}$ is ${n} ${den === 1000 ? 'thousandths' : 'hundredths'}. ${den === 1000 ? 'Thousandths' : 'Hundredths'} fill ${dp} places after the decimal point, so put the last digit in the ${den === 1000 ? 'thousandths' : 'hundredths'} place and fill any gaps with zeros: $${tex(answer)}$.`,
      };
    }
    if (kind === 'toFraction') {
      const three = rng.chance(0.6);
      const n = three ? noTrailingZero(rng, 1, 999) : noTrailingZero(rng, 1, 99);
      const den = three ? 1000 : 100;
      const shown = th(three ? n : n * 10);
      return {
        type: 'numeric',
        prompt: `Write $${shown}$ as a fraction.`,
        answer: n / den,
        form: 'fraction',
        calculator: 'not-allowed',
        hints: ['Count the decimal places.', 'Two decimal places means hundredths. Three decimal places means thousandths.'],
        solution: `$${shown}$ has ${three ? 'three' : 'two'} decimal places, so it is ${n} ${three ? 'thousandths' : 'hundredths'}: $${fr(n, den)}$.`,
      };
    }
    if (kind === 'expanded') {
      const w = rng.int(1, 9);
      const zeroAt = rng.int(0, 2);
      const ds = [0, 1, 2].map((i) => (i === zeroAt ? 0 : rng.int(1, 9)));
      const t = w * 1000 + ds[0]! * 100 + ds[1]! * 10 + ds[2]!;
      const answer = clean(t / 1000);
      const words = rng.chance(0.5);
      const parts = ds
        .map((d, i) => ({ d, i }))
        .filter((p) => p.d !== 0);
      const prompt = words
        ? `Write this as a decimal: ${w} ones, ${parts.map((p, k) => `${k === parts.length - 1 ? 'and ' : ''}${p.d} ${PLACE_NAMES[p.i]}`).join(parts.length > 2 ? ', ' : ' ')}.`
        : `Write this as one decimal number: $${[`${w}`, ...parts.map((p) => tex(p.d / 10 ** (p.i + 1)))].join(' + ')}$`;
      return {
        type: 'numeric',
        prompt,
        answer,
        calculator: 'not-allowed',
        hints: ['Put each digit in its place: tenths, then hundredths, then thousandths.', 'If a place has nothing in it, write a 0 there.'],
        solution: `Ones: ${w}. Tenths: ${ds[0]}. Hundredths: ${ds[1]}. Thousandths: ${ds[2]}.\n\nSo the number is $${tex(answer)}$${ds[zeroAt] === 0 && zeroAt < 2 ? `. The 0 holds the empty ${PLACE_NAMES[zeroAt]} place` : ''}.`,
      };
    }
    if (kind === 'howMany') {
      const band = rng.int(0, 2);
      const n = band === 0 ? rng.int(1, 9) * 100 : band === 1 ? noTrailingZero(rng, 11, 99) * 10 : noTrailingZero(rng, 101, 999);
      return {
        type: 'numeric',
        prompt: `How many **thousandths** are there in $${th(n)}$?`,
        answer: n,
        form: 'integer',
        calculator: 'not-allowed',
        hints: ['One tenth is the same as 100 thousandths, and one hundredth is the same as 10 thousandths.', 'Write the number with three decimal places, using zeros if you need to.'],
        solution: `Write it with three decimal places: $${th(n)} = ${padded(n, 3)}$. That is ${n} thousandths, because $${fr(n, 1000)} = ${padded(n, 3)}$.`,
      };
    }
    // Number line in hundredths.
    const w = rng.int(0, 4);
    const t = rng.int(0, 9);
    const at = rng.int(1, 9);
    const start = w * 1000 + t * 100;
    const answer = clean((start + at * 10) / 1000);
    return {
      type: 'numeric',
      prompt: 'What decimal is the arrow pointing to?',
      figure: {
        svg: decimalLine(start, 10, 10, at),
        alt: `A number line from ${num(start / 1000)} to ${num((start + 100) / 1000)} split into 10 equal parts, with an arrow pointing at one of the marks.`,
      },
      answer,
      form: 'decimal',
      calculator: 'not-allowed',
      hints: [`The gap from ${num(start / 1000)} to ${num((start + 100) / 1000)} is one tenth, split into 10 equal parts. What is each part worth?`, 'Count the steps from the left end to the arrow.'],
      solution: `The gap is one tenth, split into 10 equal steps, so each step is one hundredth ($0.01$).\n\nThe arrow is ${at} step${at === 1 ? '' : 's'} after $${th(start)}$, so it points to $${tex(answer)}$.`,
    };
  },
};

/** Seven decimals that share a whole number and two digits, chosen to catch "longer means bigger". */
function trickySet(rng: Rng): number[] {
  const w = rng.int(0, 5);
  const [x, y] = rng.sample(DIGITS, 2) as [number, number];
  const z = rng.int(1, 9);
  return [x * 100, x * 100 + y * 10, y * 100 + x * 10, x * 100 + y, x * 10 + y, x * 100 + y * 10 + z, x * 10].map((f) => w * 1000 + f);
}

export const compareOrder: QuestionTemplate = {
  id: `${TOPIC}.compare-order`,
  topicId: TOPIC,
  title: 'Compare and order decimals',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      const w = rng.int(0, 9);
      const kind = rng.pick(['longerSmaller', 'longerSmaller', 'longerBigger', 'equal', 'sameLength'] as const);
      let a: number;
      let b: number;
      let bDp: number | undefined;
      if (kind === 'longerSmaller') {
        const x = rng.int(2, 9);
        a = w * 1000 + x * 100;
        b = w * 1000 + rng.int(1, x - 1) * 100 + rng.int(1, 9) * 10;
      } else if (kind === 'longerBigger') {
        const x = rng.int(1, 9);
        a = w * 1000 + x * 100;
        b = a + rng.int(1, 9) * 10;
      } else if (kind === 'equal') {
        a = w * 1000 + rng.int(1, 9) * 100;
        b = a;
        bDp = 2;
      } else {
        a = w * 1000 + noTrailingZero(rng, 11, 99) * 10;
        do b = w * 1000 + noTrailingZero(rng, 11, 99) * 10;
        while (b === a);
      }
      const show = (t: number, dp?: number) => (dp === undefined ? th(t) : padded(t, dp));
      let left = { t: a, s: show(a) };
      let right = { t: b, s: show(b, bDp) };
      if (rng.chance(0.5)) [left, right] = [right, left];
      const sym = cmp(left.t, right.t);
      const dp = Math.max(dpOf(a), dpOf(b), 1);
      return {
        type: 'cloze',
        prompt: `Choose the symbol that makes this true.\n\n$${left.s}$ [[s]] $${right.s}$`,
        blanks: [{ id: 's', accepted: [sym], options: [...CMP] }],
        calculator: 'not-allowed',
        hints: ['Compare the digits place by place, starting with the biggest place.', 'Add zeros on the end so both numbers have the same number of decimal places, e.g. 0.5 = 0.50.'],
        solution: `Write both with ${dp} decimal places: $${padded(left.t, dp)}$ and $${padded(right.t, dp)}$.\n\n${sym === '=' ? 'Every digit is the same, so they are equal' : `Compare place by place: ${left.s} ${cmpWords[sym]} ${right.s}`}.\n\nSo $${left.s} ${sym} ${right.s}$.`,
      };
    }
    const set = trickySet(rng);
    if (difficulty === 2) {
      const chosen = rng.sample(set, 4);
      const largest = rng.chance(0.5);
      const best = largest ? Math.max(...chosen) : Math.min(...chosen);
      const mcq = mcqFields(
        rng,
        { text: `$${th(best)}$` },
        chosen
          .filter((t) => t !== best)
          .map((t) => ({
            text: `$${th(t)}$`,
            feedback: `$${th(t)} = ${padded(t, 3)}$ and $${th(best)} = ${padded(best, 3)}$, so $${th(t)}$ is ${largest ? 'smaller' : 'bigger'}.${
              dpOf(t) > dpOf(best) && largest ? ' Having more digits does not make a decimal bigger.' : ''
            }${dpOf(t) < dpOf(best) && !largest ? ' Having fewer digits does not make a decimal smaller.' : ''}`,
          })),
      );
      return {
        type: 'mcq',
        prompt: `Look at these numbers: ${chosen.map((t) => `$${th(t)}$`).join(', ')}.\n\nWhich one is the **${largest ? 'largest' : 'smallest'}**?`,
        ...mcq,
        calculator: 'not-allowed',
        hints: ['Give every number three decimal places by adding zeros on the end.', 'Then compare the tenths digits first, then the hundredths, then the thousandths.'],
        solution: `With three decimal places: ${chosen.map((t) => `$${padded(t, 3)}$`).join(', ')}.\n\nThe ${largest ? 'largest' : 'smallest'} is $${th(best)}$.`,
      };
    }
    // difficulty 3: order
    const count = rng.chance(0.5) ? 5 : 4;
    const chosen = rng.sample(set, count);
    const descending = rng.chance(0.3);
    const sorted = [...chosen].sort((p, q) => (descending ? q - p : p - q));
    return {
      type: 'order',
      prompt: `Put these numbers in order from **${descending ? 'largest to smallest' : 'smallest to largest'}**.\n\n${chosen.map((t) => `$${th(t)}$`).join(', ')}`,
      items: orderItems(rng, sorted.map((t) => `$${th(t)}$`)),
      calculator: 'not-allowed',
      hints: ['Give every number three decimal places by adding zeros on the end.', 'Then compare them as thousandths, like whole numbers.'],
      solution: `With three decimal places: ${chosen.map((t) => `$${padded(t, 3)}$`).join(', ')}.\n\nIn order from ${descending ? 'largest to smallest' : 'smallest to largest'}: ${sorted.map((t) => `$${th(t)}$`).join(', ')}.`,
    };
  },
};

const POW = [10, 100, 1000] as const;
const zerosOf = (f: number) => Math.round(Math.log10(f));
const placesWord = (k: number) => `${k} place${k === 1 ? '' : 's'}`;

/** Explains × or ÷ by a power of ten. */
function shiftLine(x: string, op: 'times' | 'div', f: number, ans: string): string {
  const k = zerosOf(f);
  return op === 'times'
    ? `Multiplying by ${num(f)} makes the number ${num(f)} times bigger, so every digit moves ${placesWord(k)} to the left:\n\n$${x} \\times ${tex(f)} = ${ans}$`
    : `Dividing by ${num(f)} makes the number ${num(f)} times smaller, so every digit moves ${placesWord(k)} to the right:\n\n$${x} \\div ${tex(f)} = ${ans}$`;
}

function powHints(op: 'times' | 'div', f: number): string[] {
  const k = zerosOf(f);
  return op === 'times'
    ? [`Multiplying by ${num(f)} makes a number ${num(f)} times bigger.`, `Move every digit ${placesWord(k)} to the left. Fill any empty places before the decimal point with zeros.`]
    : [`Dividing by ${num(f)} makes a number ${num(f)} times smaller.`, `Move every digit ${placesWord(k)} to the right. Use zeros to hold any empty places after the decimal point.`];
}

/** A random starting number (in thousandths) for × or ÷ by f, so the answer has at most 3 decimal places. */
function startFor(rng: Rng, op: 'times' | 'div', f: number): number {
  if (op === 'times') {
    // 1 to 3 decimal places, but never more places than f can clear.
    const maxDp = Math.min(3, zerosOf(f) + 1);
    const dp = rng.int(1, Math.max(1, maxDp));
    if (dp === 1) return noTrailingZero(rng, 1, 99) * 100;
    if (dp === 2) return noTrailingZero(rng, 1, 999) * 10;
    return noTrailingZero(rng, 1, 999);
  }
  // ÷ f: the start is a whole number or has few enough places that the answer stops at thousandths.
  const room = 3 - zerosOf(f); // decimal places the start may have
  const dp = rng.int(0, room);
  if (dp === 0) return noTrailingZero(rng, 2, f === 1000 ? 9999 : 999) * 1000;
  if (dp === 1) return noTrailingZero(rng, 11, 199) * 100;
  return noTrailingZero(rng, 101, 999) * 10;
}

export const multiplyDivide: QuestionTemplate = {
  id: `${TOPIC}.multiply-divide-10-100-1000`,
  topicId: TOPIC,
  title: 'Multiply and divide decimals by 10, 100 and 1000',
  difficulties: [1, 2, 3, 4],
  generate({ rng, difficulty }) {
    const plain = (f: number): TemplateOutput => {
      const op = rng.pick(['times', 'div'] as const);
      const x = startFor(rng, op, f);
      const ansTh = op === 'times' ? x * f : x / f;
      const answer = clean(ansTh / 1000);
      const xs = th(x);
      return {
        type: 'numeric',
        prompt: `Work out $${xs} ${op === 'times' ? '\\times' : '\\div'} ${tex(f)}$.`,
        answer,
        calculator: 'not-allowed',
        hints: powHints(op, f),
        solution: shiftLine(xs, op, f, tex(answer)),
      };
    };
    if (difficulty === 1) return plain(10);
    if (difficulty === 2) return plain(100);
    if (difficulty === 3) {
      if (rng.chance(0.6)) return plain(1000);
      // Missing multiplier or divisor.
      const f = rng.pick(POW);
      const op = rng.pick(['times', 'div'] as const);
      const x = startFor(rng, op, f);
      const y = op === 'times' ? x * f : x / f;
      const sign = op === 'times' ? '\\times' : '\\div';
      return {
        type: 'numeric',
        prompt: `Find the missing number: $${th(x)} ${sign} \\square = ${th(y)}$`,
        answer: f,
        form: 'integer',
        calculator: 'not-allowed',
        hints: [
          op === 'times' ? 'Has the number got bigger or smaller?' : 'The number has got smaller. How many places has each digit moved?',
          'Moving 1 place is 10, moving 2 places is 100 and moving 3 places is 1000.',
        ],
        solution: `Compare the digits: they have moved ${placesWord(zerosOf(f))} to the ${op === 'times' ? 'left' : 'right'}.\n\nSo the missing number is ${num(f)}: $${th(x)} ${sign} ${tex(f)} = ${th(y)}$.`,
      };
    }
    // difficulty 4
    const kind = rng.pick(['missingStart', 'twoStep', 'context'] as const);
    if (kind === 'missingStart') {
      const f = rng.pick(POW);
      const op = rng.pick(['times', 'div'] as const);
      // Choose the answer first, then build the result from it.
      const start = startFor(rng, op, f);
      const result = op === 'times' ? start * f : start / f;
      const sign = op === 'times' ? '\\times' : '\\div';
      const undo = op === 'times' ? 'div' : 'times';
      return {
        type: 'numeric',
        prompt: `Find the missing number: $\\square ${sign} ${tex(f)} = ${th(result)}$`,
        answer: clean(start / 1000),
        marks: 2,
        calculator: 'not-allowed',
        hints: ['Work backwards: do the opposite operation.', `The opposite of ${op === 'times' ? 'multiplying' : 'dividing'} by ${num(f)} is ${op === 'times' ? 'dividing' : 'multiplying'} by ${num(f)}.`],
        solution: `Undo the ${op === 'times' ? 'multiplying' : 'dividing'}. ${shiftLine(th(result), undo, f, th(start))}\n\nCheck: $${th(start)} ${sign} ${tex(f)} = ${th(result)}$ ✓`,
      };
    }
    if (kind === 'twoStep') {
      let [f1, f2] = rng.sample(POW, 2) as [number, number];
      // × 10 then ÷ 1000 would leave four decimal places, which is beyond Year 6.
      if (f1 === 10 && f2 === 1000) [f1, f2] = [f2, f1];
      const x = noTrailingZero(rng, 101, 999) * 10; // 2 decimal places
      const mid = x * f1;
      const end = mid / f2;
      return {
        type: 'numeric',
        prompt: `Work out $${th(x)} \\times ${tex(f1)} \\div ${tex(f2)}$.`,
        answer: clean(end / 1000),
        marks: 2,
        calculator: 'not-allowed',
        hints: ['Work from left to right: do the multiplying first.', 'Then divide your answer.'],
        solution: `First $${th(x)} \\times ${tex(f1)} = ${th(mid)}$.\n\nThen $${th(mid)} \\div ${tex(f2)} = ${th(end)}$.`,
      };
    }
    const ctx = rng.pick([
      { one: 'marble', many: 'marbles', unit: 'g', unitWord: 'grams', perDp: 1, thick: false },
      { one: 'bead', many: 'beads', unit: 'g', unitWord: 'grams', perDp: 2, thick: false },
      { one: 'sheet of card', many: 'sheets of card', unit: 'mm', unitWord: 'millimetres', perDp: 2, thick: true },
      { one: 'teaspoon of sugar', many: 'teaspoons of sugar', unit: 'g', unitWord: 'grams', perDp: 1, thick: false },
    ] as const);
    const f = rng.pick(POW);
    const each = ctx.perDp === 1 ? noTrailingZero(rng, 11, 99) * 100 : noTrailingZero(rng, 11, 99) * 10;
    const total = each * f;
    if (rng.chance(0.5)) {
      return {
        type: 'numeric',
        prompt: ctx.thick
          ? `One ${ctx.one} is $${th(each)}$ mm thick. How thick is a pile of ${num(f)} ${ctx.many}?`
          : `One ${ctx.one} has a mass of $${th(each)}$ g. What is the total mass of ${num(f)} ${ctx.many}?`,
        answer: clean(total / 1000),
        units: ctx.unit,
        marks: 2,
        calculator: 'not-allowed',
        hints: [`${num(f)} lots of something means multiply by ${num(f)}.`, ...powHints('times', f).slice(1)],
        solution: `Multiply by ${num(f)}. ${shiftLine(th(each), 'times', f, th(total))}\n\nThe total is $${th(total)}$ ${ctx.unitWord}.`,
      };
    }
    return {
      type: 'numeric',
      prompt: ctx.thick
        ? `A pile of ${num(f)} identical ${ctx.many} is $${th(total)}$ mm thick. How thick is one ${ctx.one}?`
        : `${num(f)} identical ${ctx.many} have a total mass of $${th(total)}$ g. What is the mass of one ${ctx.one}?`,
      answer: clean(each / 1000),
      units: ctx.unit,
      marks: 2,
      calculator: 'not-allowed',
      hints: [`Share the total equally between ${num(f)} ${ctx.many}.`, ...powHints('div', f).slice(1)],
      solution: `Divide by ${num(f)}. ${shiftLine(th(total), 'div', f, th(each))}\n\nOne ${ctx.one} is $${th(each)}$ ${ctx.unitWord}.`,
    };
  },
};

/** Column working for a ± b (thousandths), lined up on the decimal point. */
function column(a: number, b: number, op: '+' | '-', minDp = 1): string {
  const res = op === '+' ? a + b : a - b;
  const dp = Math.max(dpOf(a), dpOf(b), minDp);
  return `$$\\begin{array}{r} ${padded(a, dp)} \\\\ ${op}\\ ${padded(b, dp)} \\\\ \\hline ${padded(res, dp)} \\end{array}$$`;
}

const lineUpHints = ['Line up the decimal points, one under the other.', 'Fill any empty places with zeros so both numbers have the same number of decimal places.'];

/** A random amount (thousandths) between min and max (in thousandths) with exactly dp decimal places. */
function amount(rng: Rng, minTh: number, maxTh: number, dp: 1 | 2 | 3): number {
  const step = 10 ** (3 - dp);
  for (;;) {
    const t = rng.int(Math.ceil(minTh / step), Math.floor(maxTh / step)) * step;
    if (dpOf(t) === dp) return t;
  }
}

export const addSubtract: QuestionTemplate = {
  id: `${TOPIC}.add-subtract`,
  topicId: TOPIC,
  title: 'Add and subtract decimals',
  difficulties: [2, 3, 4, 5],
  generate({ rng, difficulty }) {
    if (difficulty === 2 || difficulty === 3) {
      let a: number;
      let b: number;
      if (difficulty === 2) {
        const dp = rng.pick([1, 2] as const);
        a = amount(rng, 1000, 19_999, dp);
        b = amount(rng, 1000, 19_999, dp);
      } else {
        const kind = rng.pick(['1v2', '1v3', '2v3', 'whole'] as const);
        if (kind === 'whole') {
          a = rng.int(2, 15) * 1000;
          b = amount(rng, 100, a - 100, rng.pick([2, 3] as const));
        } else {
          const [p, q] = kind === '1v2' ? [1, 2] : kind === '1v3' ? [1, 3] : [2, 3];
          a = amount(rng, 500, 15_000, p as 1 | 2);
          b = amount(rng, 100, 9_999, q as 2 | 3);
        }
        if (rng.chance(0.5)) [a, b] = [b, a];
      }
      let op = rng.pick(['+', '-'] as const);
      if (op === '-' && a < b) [a, b] = [b, a];
      if (a === b) op = '+';
      const res = op === '+' ? a + b : a - b;
      return {
        type: 'numeric',
        prompt: `Work out $${th(a)} ${op} ${th(b)}$.`,
        answer: clean(res / 1000),
        calculator: 'not-allowed',
        hints: lineUpHints,
        solution: `Line up the decimal points and fill gaps with zeros:\n\n${column(a, b, op)}\n\nSo $${th(a)} ${op} ${th(b)} = ${th(res)}$.`,
      };
    }
    const name = rng.pick(NAMES);
    let other = rng.pick(NAMES);
    while (other === name) other = rng.pick(NAMES);
    if (difficulty === 4) {
      const kind = rng.pick(['jump', 'baking', 'swim', 'rain', 'jug', 'makeWhole'] as const);
      if (kind === 'makeWhole') {
        const w = rng.int(1, 9);
        const a = amount(rng, Math.max(100, (w - 2) * 1000), w * 1000 - 1, 3);
        const res = w * 1000 - a;
        return {
          type: 'numeric',
          prompt: `What number must you add to $${th(a)}$ to make ${w}?`,
          answer: clean(res / 1000),
          marks: 2,
          calculator: 'not-allowed',
          hints: [`Work out $${w} - ${th(a)}$.`, `Write ${w} as $${padded(w * 1000, 3)}$ so it has the same number of decimal places.`],
          solution: `Subtract:\n\n${column(w * 1000, a, '-')}\n\nCheck: $${th(a)} + ${th(res)} = ${w}$ ✓`,
        };
      }
      type Ctx = { a: number; b: number; op: '+' | '-'; prompt: string; unit: string; unitWord: string };
      let c: Ctx;
      if (kind === 'jump' || kind === 'swim') {
        const jump = kind === 'jump';
        let a = jump ? amount(rng, 1500, 3500, rng.pick([1, 2] as const)) : amount(rng, 30_000, 45_000, 2);
        let b = jump ? amount(rng, 1500, 3500, 2) : amount(rng, 30_000, 45_000, rng.pick([1, 2] as const));
        while (a === b) b += 10;
        if (rng.chance(0.5)) [a, b] = [b, a];
        // a belongs to name, b to other.
        const big = Math.max(a, b);
        const small = Math.min(a, b);
        const winner = jump ? (a > b ? name : other) : a < b ? name : other;
        c = {
          a: big,
          b: small,
          op: '-',
          unit: jump ? 'm' : 's',
          unitWord: jump ? 'metres' : 'seconds',
          prompt: jump
            ? `${name}'s long jump was $${th(a)}$ m. ${other}'s long jump was $${th(b)}$ m. How much further did ${winner} jump?`
            : `${name} swam 50 m in $${th(a)}$ seconds. ${other} swam 50 m in $${th(b)}$ seconds. How many seconds faster was ${winner}?`,
        };
      } else if (kind === 'baking') {
        const a = amount(rng, 500, 2500, rng.pick([1, 2] as const));
        const b = amount(rng, 100, 900, 3);
        c = { a, b, op: '+', unit: 'kg', unitWord: 'kilograms', prompt: `A recipe for a big batch of biscuits uses $${th(a)}$ kg of flour and $${th(b)}$ kg of sugar. What is the total mass of the flour and sugar?` };
      } else if (kind === 'rain') {
        const place = rng.pick(PLACES);
        const a = amount(rng, 2000, 30_000, 1);
        const b = amount(rng, 1000, 20_000, 2);
        c = { a, b, op: '+', unit: 'mm', unitWord: 'millimetres', prompt: `On Monday, ${place} had $${th(a)}$ mm of rain. On Tuesday it had $${th(b)}$ mm. How much rain fell over the two days?` };
      } else {
        const a = amount(rng, 1000, 3000, rng.pick([1, 2] as const));
        const b = amount(rng, 100, 900, 3);
        const pour = rng.chance(0.5);
        c = pour
          ? { a, b, op: '+', unit: 'L', unitWord: 'litres', prompt: `A jug has $${th(a)}$ L of juice in it. ${name} pours in another $${th(b)}$ L. How much juice is in the jug now?` }
          : { a, b, op: '-', unit: 'L', unitWord: 'litres', prompt: `A jug has $${th(a)}$ L of juice in it. ${name} pours out $${th(b)}$ L for the class. How much juice is left in the jug?` };
      }
      const res = c.op === '+' ? c.a + c.b : c.a - c.b;
      return {
        type: 'numeric',
        prompt: c.prompt,
        answer: clean(res / 1000),
        units: c.unit,
        marks: 2,
        calculator: 'not-allowed',
        hints: [c.op === '+' ? 'Do you need to add or subtract? "Altogether" and "total" mean add.' : 'Do you need to add or subtract? Finding a difference means subtract.', lineUpHints[0]!],
        solution: `${c.op === '+' ? 'Add' : 'Subtract to find the difference'}:\n\n${column(c.a, c.b, c.op)}\n\nThe answer is $${th(res)}$ ${c.unitWord}.`,
      };
    }
    // difficulty 5: two steps
    const kind = rng.pick(['bottle', 'change', 'bag', 'relay'] as const);
    if (kind === 'bottle') {
      const w = rng.pick([1500, 2000, 1250, 2500]);
      const a = amount(rng, 200, 600, rng.pick([2, 3] as const));
      const b = amount(rng, 150, 500, rng.pick([2, 3] as const));
      const used = a + b;
      const res = w - used;
      return {
        type: 'numeric',
        prompt: `${name} has a full $${th(w)}$ L bottle of water. ${name} pours out two glasses: one with $${th(a)}$ L and one with $${th(b)}$ L. How much water is left in the bottle?`,
        answer: clean(res / 1000),
        units: 'L',
        marks: 2,
        calculator: 'not-allowed',
        hints: ['First find how much water was poured out altogether.', 'Then take that away from the full bottle.'],
        solution: `Poured out:\n\n${column(a, b, '+')}\n\nLeft:\n\n${column(w, used, '-')}\n\nThere is $${th(res)}$ L left.`,
      };
    }
    if (kind === 'change') {
      const have = rng.pick([10, 20]) * 1000;
      const pie = rng.int(35, 55) * 100; // $3.50 to $5.50
      const drink = rng.int(18, 35) * 100; // $1.80 to $3.50
      const spent = pie + drink;
      const res = have - spent;
      const food = rng.pick(['pie', 'sushi roll', 'sandwich', 'filled roll']);
      return {
        type: 'numeric',
        prompt: `${name} has ${cash(have / 1000)}. ${name} buys a ${food} for ${cash(pie / 1000)} and a drink for ${cash(drink / 1000)}. How much money does ${name} have left?`,
        answer: clean(res / 1000),
        units: '$',
        marks: 2,
        calculator: 'not-allowed',
        hints: ['First add up what was spent.', 'Then take that away from the money at the start.'],
        solution: `Spent:\n\n${column(pie, drink, '+', 2)}\n\nLeft:\n\n${column(have, spent, '-', 2)}\n\n${name} has ${cash(res / 1000)} left.`,
      };
    }
    if (kind === 'bag') {
      const a = amount(rng, 300, 900, 2);
      const b = amount(rng, 400, 999, 3);
      const c = amount(rng, 500, 1900, 1);
      const ab = a + b;
      const res = ab + c;
      return {
        type: 'numeric',
        prompt: `${name}'s school bag holds a lunchbox ($${th(a)}$ kg), a drink bottle ($${th(b)}$ kg) and a book ($${th(c)}$ kg). What is the total mass of these three things?`,
        answer: clean(res / 1000),
        units: 'kg',
        marks: 2,
        calculator: 'not-allowed',
        hints: ['Add two of the masses first, then add the third.', lineUpHints[1]!],
        solution: `${column(a, b, '+')}\n\n${column(ab, c, '+')}\n\nThe total mass is $${th(res)}$ kg.`,
      };
    }
    const legs = [0, 1, 2, 3].map(() => amount(rng, 12_000, 16_000, 2));
    const total = legs.reduce((s, x) => s + x, 0);
    const firstThree = legs[0]! + legs[1]! + legs[2]!;
    return {
      type: 'numeric',
      prompt: `A relay team of four ran a race in $${th(total)}$ seconds altogether. The first three runners took $${th(legs[0]!)}$ s, $${th(legs[1]!)}$ s and $${th(legs[2]!)}$ s. How long did the last runner take?`,
      answer: clean(legs[3]! / 1000),
      units: 's',
      marks: 2,
      calculator: 'not-allowed',
      hints: ['Add up the times of the first three runners.', 'Then subtract that from the total time.'],
      solution: `First three runners: $${th(legs[0]!)} + ${th(legs[1]!)} + ${th(legs[2]!)} = ${th(firstThree)}$ s.\n\nLast runner:\n\n${column(total, firstThree, '-')}\n\nThe last runner took $${th(legs[3]!)}$ seconds.`,
    };
  },
};

export const templates: QuestionTemplate[] = [placeValue, compareOrder, multiplyDivide, addSubtract];
