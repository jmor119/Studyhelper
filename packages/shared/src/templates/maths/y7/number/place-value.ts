import type { QuestionTemplate } from '../../../types';
import { money, NAMES, num, round, tex } from '../../../format';

// m7.num.place-value — powers of 10, expanded form, rounding, and estimating to check answers.
// Year 7: no negative exponents (Year 8), no calculators.

const TOPIC = 'm7.num.place-value';

const PLACE = [
  'ones',
  'tens',
  'hundreds',
  'thousands',
  'ten thousands',
  'hundred thousands',
  'millions',
  'ten millions',
  'hundred millions',
] as const;

/** Singular place name for "the nearest …". */
const NEAREST = ['one', 'ten', 'hundred', 'thousand', 'ten thousand', 'hundred thousand', 'million'] as const;

const DECIMAL_PLACE = ['whole number', 'tenth', 'hundredth'] as const;

/** Money in Markdown prose: the $ is escaped so it isn't read as maths. */
const cash = (x: number) => money(x).replace('$', '\\$');

/** 10, 10^{2}, 10^{3} … in KaTeX. */
const pow = (e: number) => (e === 1 ? '10' : `10^{${e}}`);

/** One term of an expanded form: 4 × 10^{3}, 5 × 10, or a plain ones digit. */
const expTerm = (d: number, e: number) => (e === 0 ? `${d}` : `${d} \\times ${pow(e)}`);

/** Digits of a whole number, most significant first. */
const digitsOf = (n: number) => String(n).split('').map(Number);

/** A whole number from digits, most significant first. */
const fromDigits = (ds: number[]) => Number(ds.join(''));

/** Expanded-form terms (non-zero digits only), biggest place first. */
function expandedTerms(n: number): Array<{ d: number; e: number }> {
  const ds = digitsOf(n);
  return ds.map((d, i) => ({ d, e: ds.length - 1 - i })).filter((t) => t.d !== 0);
}

/** Rounds a whole number to the nearest 10^k (halves round up). */
const roundTo = (n: number, k: number) => Math.round(n / 10 ** k) * 10 ** k;

export const powersOfTen: QuestionTemplate = {
  id: `${TOPIC}.powers-of-ten`,
  topicId: TOPIC,
  title: 'Powers of 10 and the value of a digit',
  difficulties: [1, 2],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      const kind = rng.pick(['toNumber', 'toPower', 'digitValue', 'digitValue'] as const);
      if (kind === 'toNumber' || kind === 'toPower') {
        const n = rng.int(3, 9);
        const tens = Array.from({ length: n }, () => '10').join(' \\times ');
        if (kind === 'toNumber') {
          return {
            type: 'numeric',
            prompt: `Write $10^{${n}}$ as an ordinary number.`,
            answer: 10 ** n,
            form: 'integer',
            calculator: 'not-allowed',
            hints: [
              `$10^{${n}}$ means ${n} tens multiplied together.`,
              '$10^2 = 10 \\times 10 = 100$, which has 2 zeros. Use the same pattern.',
            ],
            solution: `$10^{${n}} = ${tens} = ${tex(10 ** n)}$\n\nThe exponent is ${n}, so the number is a 1 followed by ${n} zeros.`,
          };
        }
        return {
          type: 'numeric',
          prompt: `$${tex(10 ** n)} = 10^{\\square}$\n\nWhat number goes in the box?`,
          answer: n,
          form: 'integer',
          calculator: 'not-allowed',
          hints: [
            'How many tens do you multiply together to get this number?',
            'Count the zeros after the 1.',
          ],
          solution: `$${tex(10 ** n)}$ is a 1 followed by ${n} zeros, so it is ${n} tens multiplied together.\n\n$${tex(10 ** n)} = 10^{${n}}$`,
        };
      }
      // digitValue: the digit d is worth d × 10^p.
      const len = rng.int(6, 7);
      const ds = rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], len);
      const p = rng.int(2, len - 1);
      const d = ds[len - 1 - p]!;
      const n = fromDigits(ds);
      return {
        type: 'numeric',
        prompt: `In the number ${num(n)}, the digit ${d} is worth $${d} \\times 10^{\\square}$.\n\nWhat number goes in the box?`,
        answer: p,
        form: 'integer',
        calculator: 'not-allowed',
        hints: [
          `Which place is the ${d} in? Count from the ones place: ones, tens, hundreds, …`,
          'Tens are $10^1$, hundreds are $10^2$, and each place to the left is one more power of 10.',
        ],
        solution: `The ${d} is in the **${PLACE[p]}** place.\n\nOne ${NEAREST[p]} is $${tex(10 ** p)} = 10^{${p}}$, so the digit is worth $${d} \\times 10^{${p}} = ${tex(d * 10 ** p)}$.`,
      };
    }

    // difficulty 2
    const kind = rng.pick(['compare', 'compare', 'timesBigger', 'coefficient'] as const);
    if (kind === 'compare') {
      const a = rng.int(3, 7);
      const P = 10 ** a;
      const variant = rng.pick(['justUnder', 'justOver', 'equal', 'lotsOfLower', 'twoLots'] as const);
      const N =
        variant === 'justUnder'
          ? P - 1
          : variant === 'justOver'
            ? P + 10 ** rng.int(0, a - 1)
            : variant === 'equal'
              ? P
              : variant === 'lotsOfLower'
                ? rng.int(2, 9) * 10 ** (a - 1)
                : rng.int(2, 9) * P;
      const powerFirst = rng.chance(0.5);
      const cmp = P === N ? '=' : P > N ? '>' : '<';
      const flip = (s: string) => (s === '>' ? '<' : s === '<' ? '>' : '=');
      const sym = powerFirst ? cmp : flip(cmp);
      const left = powerFirst ? `$10^{${a}}$` : `$${tex(N)}$`;
      const right = powerFirst ? `$${tex(N)}$` : `$10^{${a}}$`;
      const relation =
        P === N
          ? `They are the same number.`
          : P > N
            ? `$${tex(P)}$ is bigger than $${tex(N)}$.`
            : `$${tex(P)}$ is smaller than $${tex(N)}$.`;
      return {
        type: 'cloze',
        prompt: `Choose the symbol that makes this true.\n\n${left} [[s]] ${right}`,
        blanks: [{ id: 's', accepted: [sym], options: ['<', '>', '='] }],
        calculator: 'not-allowed',
        hints: [
          `Write $10^{${a}}$ as an ordinary number first.`,
          'Compare the number of digits. If they have the same number of digits, compare from the left.',
        ],
        solution: `$10^{${a}} = ${tex(P)}$. ${relation}\n\nSo ${left} ${sym} ${right}.`,
      };
    }
    if (kind === 'timesBigger') {
      const a = rng.int(3, 8);
      const gap = rng.int(1, Math.min(3, a - 1));
      const b = a - gap;
      return {
        type: 'numeric',
        prompt: `How many times bigger is $10^{${a}}$ than $10^{${b}}$?`,
        answer: 10 ** gap,
        form: 'integer',
        calculator: 'not-allowed',
        hints: [
          'Write both numbers as ordinary numbers.',
          'Each step up to the next power of 10 multiplies the number by 10. How many steps are there?',
        ],
        solution: `$10^{${a}} = ${tex(10 ** a)}$ and $10^{${b}} = ${tex(10 ** b)}$.\n\nGoing from $10^{${b}}$ to $10^{${a}}$ is ${gap} step${gap > 1 ? 's' : ''} of "× 10", so $10^{${a}}$ is $${Array.from({ length: gap }, () => '10').join(' \\times ')} = ${tex(10 ** gap)}$ times bigger.`,
      };
    }
    const d = rng.int(2, 9);
    const e = rng.int(2, 6);
    if (rng.chance(0.5)) {
      return {
        type: 'numeric',
        prompt: `Write $${d} \\times 10^{${e}}$ as an ordinary number.`,
        answer: d * 10 ** e,
        form: 'integer',
        calculator: 'not-allowed',
        hints: [`Work out $10^{${e}}$ first.`, `Then multiply that by ${d}.`],
        solution: `$10^{${e}} = ${tex(10 ** e)}$, so $${d} \\times 10^{${e}} = ${d} \\times ${tex(10 ** e)} = ${tex(d * 10 ** e)}$.`,
      };
    }
    return {
      type: 'numeric',
      prompt: `$${tex(d * 10 ** e)} = ${d} \\times 10^{\\square}$\n\nWhat number goes in the box?`,
      answer: e,
      form: 'integer',
      calculator: 'not-allowed',
      hints: [`${num(d * 10 ** e)} is ${d} lots of a power of 10. Which one?`, `Count the zeros after the ${d}.`],
      solution: `$${tex(d * 10 ** e)} = ${d} \\times ${tex(10 ** e)}$, and $${tex(10 ** e)} = 10^{${e}}$.\n\nSo $${tex(d * 10 ** e)} = ${d} \\times 10^{${e}}$.`,
    };
  },
};

export const expandedForm: QuestionTemplate = {
  id: `${TOPIC}.expanded-form`,
  topicId: TOPIC,
  title: 'Expanded form with powers of 10',
  difficulties: [2, 3],
  generate({ rng, difficulty }) {
    let n: number;
    if (difficulty === 2) {
      const len = rng.int(4, 5);
      n = fromDigits(Array.from({ length: len }, () => rng.int(1, 9)));
    } else {
      // 5 or 6 digits with one or two zeros (never the first digit).
      const len = rng.int(5, 6);
      const ds = Array.from({ length: len }, () => rng.int(1, 9));
      const zeroCount = rng.int(1, 2);
      for (const i of rng.sample(
        Array.from({ length: len - 1 }, (_, i) => i + 1),
        zeroCount,
      )) {
        ds[i] = 0;
      }
      n = fromDigits(ds);
    }
    const terms = expandedTerms(n);
    const placeLines = terms
      .map((t) => {
        const name = t.d === 1 ? NEAREST[t.e] : PLACE[t.e];
        return t.e === 0 ? `- ${t.d} ${name}: $${t.d}$` : `- ${t.d} ${name}: $${expTerm(t.d, t.e)} = ${tex(t.d * 10 ** t.e)}$`;
      })
      .join('\n');

    if (rng.chance(0.5)) {
      // Expanded form → ordinary number (shuffled at difficulty 3).
      const shown = difficulty === 3 ? rng.shuffle(terms) : terms;
      return {
        type: 'numeric',
        prompt: `Write this as an ordinary number.\n\n$$${shown.map((t) => expTerm(t.d, t.e)).join(' + ')}$$`,
        answer: n,
        form: 'integer',
        calculator: 'not-allowed',
        hints: [
          'Work out each part on its own, e.g. $3 \\times 10^{2} = 300$.',
          difficulty === 3
            ? 'The parts are not in order, and some places are missing. A missing place gets a 0.'
            : 'Then add the parts together.',
        ],
        solution: `Work out each part:\n\n${placeLines}\n\nAdd them: ${difficulty === 3 ? 'places that are missing get a 0, so the ' : 'the '}number is $${tex(n)}$.`,
      };
    }

    // Cloze: fill in two missing digits (coefficients).
    const blankIdx = rng
      .sample(
        terms.map((_, i) => i),
        2,
      )
      .sort((x, y) => x - y);
    const ids = ['a', 'b'];
    const parts = terms.map((t, i) => {
      const k = blankIdx.indexOf(i);
      if (k === -1) return `$${expTerm(t.d, t.e)}$`;
      return t.e === 0 ? `[[${ids[k]}]]` : `[[${ids[k]}]] $\\times ${pow(t.e)}$`;
    });
    const blanks = blankIdx.map((i, k) => ({ id: ids[k]!, accepted: [String(terms[i]!.d)] }));
    return {
      type: 'cloze',
      prompt: `Fill in the missing digits to write ${num(n)} in expanded form.\n\n${parts.join(' + ')}`,
      blanks,
      calculator: 'not-allowed',
      hints: [
        'Line up each digit with its place: ones, tens ($10$), hundreds ($10^2$), thousands ($10^3$), …',
        difficulty === 3 ? 'Digits that are 0 are left out of the expanded form.' : 'The number in each gap is a single digit of the number.',
      ],
      solution: `${num(n)} in expanded form:\n\n$$${terms.map((t) => expTerm(t.d, t.e)).join(' + ')}$$\n\n${placeLines}`,
    };
  },
};

export const rounding: QuestionTemplate = {
  id: `${TOPIC}.rounding`,
  topicId: TOPIC,
  title: 'Round whole numbers and decimals',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    if (difficulty === 1 || difficulty === 2) {
      let n = 0;
      let k = 1;
      for (let attempt = 0; attempt < 50; attempt++) {
        if (difficulty === 1) {
          n = rng.int(1001, 99999);
          k = rng.int(1, 3);
        } else {
          n = rng.int(100001, 9999999);
          k = rng.int(2, 5);
        }
        if (n % 10 ** k !== 0) break;
      }
      const answer = roundTo(n, k);
      const low = Math.floor(n / 10 ** k) * 10 ** k;
      const high = low + 10 ** k;
      const nextDigit = Math.floor(n / 10 ** (k - 1)) % 10;
      const up = nextDigit >= 5;
      const target = difficulty === 1 ? `the nearest ${NEAREST[k]}` : `the nearest $10^{${k}}$ (the nearest ${NEAREST[k]})`;
      return {
        type: 'numeric',
        prompt: `Round ${num(n)} to ${target}.`,
        answer,
        form: 'integer',
        calculator: 'not-allowed',
        hints: [
          `Find the ${PLACE[k]} digit. Which two multiples of ${num(10 ** k)} is ${num(n)} between?`,
          `Look at the digit just to the right of the ${PLACE[k]} digit. 5 or more rounds up; less than 5 rounds down.`,
        ],
        solution: `${num(n)} is between ${num(low)} and ${num(high)}.\n\nThe digit to the right of the ${PLACE[k]} place is ${nextDigit}. ${up ? `That is 5 or more, so round **up**` : `That is less than 5, so round **down**`} to ${num(answer)}.`,
      };
    }
    // difficulty 3: decimals to the nearest whole number, tenth or hundredth.
    const dp = rng.int(0, 2);
    let x = 0;
    for (let attempt = 0; attempt < 50; attempt++) {
      // Sometimes force a carry (e.g. 3.962 → 4.0) because that is where mistakes happen.
      const carry = rng.chance(0.25);
      let whole = rng.int(1, 49);
      const digits = [rng.int(0, 9), rng.int(0, 9), rng.int(1, 9)];
      if (carry) {
        if (dp === 0) whole = rng.int(0, 4) * 10 + 9;
        for (let i = 0; i < dp; i++) digits[i] = 9;
        digits[dp] = rng.int(5, 9);
        if (digits[2] === 0) digits[2] = 1;
      }
      x = round(whole + digits[0]! / 10 + digits[1]! / 100 + digits[2]! / 1000, 3);
      if (round(x, dp) !== x) break;
    }
    const answer = round(x, dp);
    const xs = x.toFixed(3);
    const keepDigit = dp === 0 ? Math.floor(x) % 10 : Number(xs[xs.indexOf('.') + dp]);
    const nextDigit = Number(xs[xs.indexOf('.') + dp + 1]);
    const up = nextDigit >= 5;
    const keepName = dp === 0 ? 'ones' : dp === 1 ? 'tenths' : 'hundredths';
    const nextName = dp === 0 ? 'tenths' : dp === 1 ? 'hundredths' : 'thousandths';
    const ansText = answer.toFixed(dp);
    return {
      type: 'numeric',
      prompt: `Round ${xs} to the nearest ${DECIMAL_PLACE[dp]}.`,
      answer,
      decimals: dp,
      tolerance: 1e-9,
      form: 'any',
      calculator: 'not-allowed',
      hints: [
        `Find the ${keepName} digit. That is the last digit you keep.`,
        `Look at the ${nextName} digit, just to its right. 5 or more rounds up; less than 5 rounds down.`,
      ],
      solution: `The ${keepName} digit is ${keepDigit}. The next digit (${nextName}) is ${nextDigit}. ${up ? 'That is 5 or more, so round **up**' : 'That is less than 5, so round **down**'}.\n\n${xs} rounded to the nearest ${DECIMAL_PLACE[dp]} is **${ansText}**.${up && keepDigit === 9 ? '\n\nRounding the 9 up makes 10, so carry 1 into the place to its left.' : ''}`,
    };
  },
};

export const roundingReverse: QuestionTemplate = {
  id: `${TOPIC}.rounding-reverse`,
  topicId: TOPIC,
  title: 'Smallest and largest numbers that round to a value',
  difficulties: [4, 5],
  generate({ rng, difficulty }) {
    const smallest = rng.chance(0.5);
    if (difficulty === 4) {
      const k = rng.int(1, 3);
      const contexts = [
        { what: 'The crowd at a netball game', unitWord: 'people', verb: 'the crowd' },
        { what: 'The number of people at a Matariki festival', unitWord: 'people', verb: 'the number of people' },
        { what: 'The number of books in a school library', unitWord: 'books', verb: 'the number of books' },
        { what: 'The number of cars that crossed a bridge in one day', unitWord: 'cars', verb: 'the number of cars' },
        { what: 'The number of runners in a fun run', unitWord: 'runners', verb: 'the number of runners' },
      ] as const;
      const c = rng.pick(contexts);
      const R = rng.int(11, 99) * 10 ** k + (k === 1 ? rng.int(0, 9) * 1000 : 0);
      const half = 10 ** k / 2;
      const answer = smallest ? R - half : R + half - 1;
      return {
        type: 'numeric',
        prompt: `${c.what} was ${num(R)}, rounded to the nearest ${NEAREST[k]}.\n\nWhat is the ${smallest ? 'smallest' : 'largest'} ${c.verb} could have been?`,
        answer,
        form: 'integer',
        calculator: 'not-allowed',
        hints: [
          `Which whole numbers round to ${num(R)}? Think about the halfway points on each side of it.`,
          smallest
            ? `Find the number halfway between ${num(R - 10 ** k)} and ${num(R)}. Does that halfway number round up or down?`
            : `Find the number halfway between ${num(R)} and ${num(R + 10 ** k)}. That halfway number rounds up, so it is too big.`,
        ],
        solution: smallest
          ? `Halfway between ${num(R - 10 ** k)} and ${num(R)} is ${num(R - half)}. Halfway numbers round **up**, so ${num(R - half)} rounds to ${num(R)}, but ${num(R - half - 1)} rounds down.\n\nThe smallest is **${num(answer)}** ${c.unitWord}.`
          : `Halfway between ${num(R)} and ${num(R + 10 ** k)} is ${num(R + half)}. Halfway numbers round **up**, so ${num(R + half)} would round to ${num(R + 10 ** k)}.\n\nThe largest whole number that still rounds to ${num(R)} is **${num(answer)}** ${c.unitWord}.`,
      };
    }
    // difficulty 5: measurements with decimals.
    const contexts = [
      { thing: 'long jump', verb: 'measured', units: 'm', unitWord: 'metre', lo: 2, hi: 5, small: 'shortest', big: 'longest' },
      { thing: 'parcel', verb: 'weighed', units: 'kg', unitWord: 'kilogram', lo: 1, hi: 9, small: 'lightest', big: 'heaviest' },
      { thing: 'pumpkin', verb: 'weighed', units: 'kg', unitWord: 'kilogram', lo: 2, hi: 12, small: 'lightest', big: 'heaviest' },
      { thing: 'piece of rope', verb: 'measured', units: 'm', unitWord: 'metre', lo: 1, hi: 15, small: 'shortest', big: 'longest' },
    ] as const;
    const c = rng.pick(contexts);
    const name = rng.pick(NAMES);
    const toTenth = rng.chance(0.6);
    let R = rng.int(c.lo + 1, c.hi);
    if (toTenth) {
      // Keep the tenths digit non-zero so the question reads naturally.
      let tenths = rng.int(c.lo * 10 + 1, c.hi * 10 - 1);
      if (tenths % 10 === 0) tenths += rng.int(1, 9);
      R = round(tenths / 10, 1);
    }
    const step = toTenth ? 0.1 : 1;
    const half = step / 2;
    const answer = smallest ? round(R - half, toTenth ? 2 : 1) : round(R + half - step / 10, toTenth ? 2 : 1);
    const measuredTo = toTenth ? 'two decimal places' : 'one decimal place';
    const roundedTo = toTenth ? `the nearest tenth of a ${c.unitWord}` : `the nearest whole ${c.unitWord}`;
    const Rs = toTenth ? R.toFixed(1) : String(R);
    const below = toTenth ? (R - step).toFixed(1) : String(R - 1);
    const above = toTenth ? (R + step).toFixed(1) : String(R + 1);
    const dps = toTenth ? 2 : 1;
    const word = smallest ? c.small : c.big;
    return {
      type: 'numeric',
      prompt: `${name}'s ${c.thing} ${c.verb} ${Rs} ${c.units}, rounded to ${roundedTo}.\n\nBefore rounding, the measurement had ${measuredTo}. What is the ${word} it could have been?`,
      answer,
      decimals: dps,
      tolerance: 1e-9,
      units: c.units,
      calculator: 'not-allowed',
      hints: [
        `Which numbers with ${measuredTo} round to ${Rs}? Think about the halfway points on each side.`,
        smallest
          ? `Find the number halfway between ${below} and ${Rs}. Does it round up or down?`
          : `Find the number halfway between ${Rs} and ${above}. It rounds up, so it is too big. Go back one step.`,
      ],
      solution: smallest
        ? `Halfway between ${below} and ${Rs} is ${(R - half).toFixed(dps)}. Halfway numbers round **up**, so ${(R - half).toFixed(dps)} rounds to ${Rs}.\n\nThe ${word} it could have been is **${answer.toFixed(dps)} ${c.units}**.`
        : `Halfway between ${Rs} and ${above} is ${(R + half).toFixed(dps)}, and that rounds up to ${above}. The number with ${measuredTo} just below it is ${answer.toFixed(dps)}.\n\nThe ${word} it could have been is **${answer.toFixed(dps)} ${c.units}**.`,
    };
  },
};

export const estimate: QuestionTemplate = {
  id: `${TOPIC}.estimate`,
  topicId: TOPIC,
  title: 'Estimate to predict and check answers',
  difficulties: [3, 4, 5],
  generate({ rng, difficulty }) {
    if (difficulty === 3) {
      // Round three decimals to the nearest whole number and add.
      const pickHundredths = () => {
        const options = [...Array.from({ length: 40 }, (_, i) => i + 5), ...Array.from({ length: 40 }, (_, i) => i + 56)];
        return rng.pick(options);
      };
      if (rng.chance(0.5)) {
        const xs = [0, 1, 2].map(() => round(rng.int(1, 9) + pickHundredths() / 100, 2));
        const rs = xs.map((x) => Math.round(x));
        const answer = rs.reduce((s, v) => s + v, 0);
        return {
          type: 'numeric',
          prompt: `Estimate $${xs.map((x) => x.toFixed(2)).join(' + ')}$ by rounding each number to the nearest whole number first.`,
          answer,
          form: 'integer',
          calculator: 'not-allowed',
          hints: ['Round each number on its own: look at the tenths digit.', 'Then add the rounded numbers.'],
          solution: `${xs.map((x, i) => `$${x.toFixed(2)} \\approx ${rs[i]}$`).join(', ')}.\n\nEstimate: $${rs.join(' + ')} = ${answer}$`,
        };
      }
      const items = rng.sample(
        [
          ['a pie', 3, 6],
          ['a drink', 1, 4],
          ['a sandwich', 4, 8],
          ['a muffin', 2, 5],
          ['an ice block', 1, 3],
          ['a bag of chips', 2, 4],
          ['a sushi pack', 6, 9],
        ] as const,
        3,
      );
      const centsOptions = [10, 15, 20, 25, 30, 35, 40, 60, 65, 70, 75, 80, 85, 90, 95, 99];
      const prices = items.map(([, lo, hi]) => round(rng.int(lo, hi) + rng.pick(centsOptions) / 100, 2));
      const rs = prices.map((p) => Math.round(p));
      const answer = rs.reduce((s, v) => s + v, 0);
      const name = rng.pick(NAMES);
      return {
        type: 'numeric',
        prompt: `${name} buys ${items[0]![0]} for ${cash(prices[0]!)}, ${items[1]![0]} for ${cash(prices[1]!)} and ${items[2]![0]} for ${cash(prices[2]!)}.\n\nRound each price to the nearest dollar to estimate the total cost.`,
        answer,
        units: '$',
        form: 'integer',
        calculator: 'not-allowed',
        hints: ['Look at the cents. 50 cents or more rounds up to the next dollar.', 'Add the rounded prices.'],
        solution: `${prices.map((p, i) => `${cash(p)} ≈ \\$${rs[i]}`).join(', ')}.\n\nEstimate: \\$${rs.join(' + \\$')} = **\\$${answer}**`,
      };
    }

    // A product of a 3-digit and a 2-digit number, rounded to its leading place.
    let a = 0;
    let b = 0;
    for (let attempt = 0; attempt < 50; attempt++) {
      a = rng.int(151, 949);
      b = rng.int(21, 94);
      if (a % 100 !== 50 && a % 100 !== 0 && b % 10 !== 5 && b % 10 !== 0) break;
    }
    const ra = roundTo(a, 2);
    const rb = roundTo(b, 1);
    const E = ra * rb;

    if (difficulty === 4) {
      return {
        type: 'numeric',
        prompt: `Estimate $${a} \\times ${b}$ by rounding ${a} to the nearest hundred and ${b} to the nearest ten.`,
        answer: E,
        form: 'integer',
        calculator: 'not-allowed',
        hints: [
          `Round each number first: ${a} to the nearest hundred, ${b} to the nearest ten.`,
          'Multiply the non-zero digits, then put back all the zeros. For example, $70 \\times 30$: $7 \\times 3 = 21$, then put back two zeros.',
        ],
        solution: `$${a} \\approx ${ra}$ and $${b} \\approx ${rb}$.\n\n$${ra} \\times ${rb}$: $${ra / 100} \\times ${rb / 10} = ${(ra / 100) * (rb / 10)}$, then put back the three zeros: $${tex(E)}$.\n\nSo $${a} \\times ${b} \\approx ${tex(E)}$.`,
      };
    }

    // difficulty 5
    if (rng.chance(0.5)) {
      // Check a claimed answer that has a place-value slip.
      const t = Math.floor(b / 10);
      const u = b % 10;
      const claimed = a * u + a * t;
      const name = rng.pick(NAMES);
      const options = [
        { id: 'a', text: `The answer is too small. The estimate is about ${num(E)}.` },
        { id: 'b', text: `The answer is about right. The estimate is about ${num(E / 10)}.` },
        { id: 'c', text: `The answer is too big. The estimate is about ${num(E / 100)}.` },
        { id: 'd', text: `The answer is too small. The estimate is about ${num(E * 10)}.` },
      ];
      return {
        type: 'mcq',
        prompt: `${name} worked out $${a} \\times ${b}$ and got $${tex(claimed)}$.\n\nCheck by rounding ${a} to the nearest hundred and ${b} to the nearest ten. Which statement is right?`,
        options,
        correct: 'a',
        feedback: {
          b: `Check the zeros. $${ra} \\times ${rb}$ has three zeros on the end, not two.`,
          c: `$${ra} \\times ${rb}$ is much bigger than ${num(E / 100)}. Count the zeros carefully.`,
          d: `There are too many zeros. $${ra} \\times ${rb}$ has three zeros on the end.`,
        },
        calculator: 'not-allowed',
        hints: [`Round first: ${a} becomes ${ra} and ${b} becomes ${rb}.`, 'Multiply the non-zero digits, then put back all the zeros.'],
        solution: `$${ra} \\times ${rb} = ${tex(E)}$, so the answer should be about ${num(E)}. ${name}'s answer of ${num(claimed)} is far too small.\n\n${name} multiplied by ${t} instead of ${t * 10} for the tens digit of ${b}. The exact answer is $${a} \\times ${b} = ${tex(a * b)}$.`,
      };
    }
    // Two-step money estimate.
    let n = 0;
    for (let attempt = 0; attempt < 50; attempt++) {
      n = rng.int(21, 89);
      if (n % 10 !== 5 && n % 10 !== 0) break;
    }
    const dollars = rng.int(2, 9);
    const cents = rng.pick([10, 15, 20, 25, 30, 35, 40, 60, 65, 70, 75, 80, 85, 90, 95]);
    const price = round(dollars + cents / 100, 2);
    const rn = roundTo(n, 1);
    const rp = Math.round(price);
    const what = rng.pick([
      ['students go on a bus trip to the museum. The fare is', 'each'],
      ['students buy a sausage sizzle lunch at school camp. Each lunch costs', ''],
      ['players in a rugby club each buy a pair of socks for', ''],
      ['people buy tickets for a school production. Each ticket costs', ''],
    ] as const);
    return {
      type: 'numeric',
      prompt: `${n} ${what[0]} ${cash(price)}${what[1] ? ` ${what[1]}` : ''}.\n\nRound the number of people to the nearest ten and the price to the nearest dollar. Use these to estimate the total cost.`,
      answer: rn * rp,
      units: '$',
      form: 'integer',
      calculator: 'not-allowed',
      hints: ['Round both numbers first.', 'Then multiply the rounded numbers. Use a basic fact and put the zero back on.'],
      solution: `${n} ≈ ${rn} and ${cash(price)} ≈ \\$${rp}.\n\nEstimate: $${rn} \\times ${rp}$. Since $${rn / 10} \\times ${rp} = ${(rn / 10) * rp}$, the estimate is **\\$${rn * rp}**.`,
    };
  },
};

export const templates: QuestionTemplate[] = [powersOfTen, expandedForm, rounding, roundingReverse, estimate];
