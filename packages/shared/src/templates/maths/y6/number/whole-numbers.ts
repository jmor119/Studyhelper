import type { QuestionTemplate } from '../../../types';
import { NAMES, PLACES, num, tex } from '../../../format';
import {
  additionSteps,
  cash,
  columnTex,
  digitsOf,
  fromDigits,
  mcqFields,
  randomDigits,
  subtractionSteps,
} from './whole-numbers-helpers';

// m6.num.whole-numbers templates: adding and subtracting any whole numbers (mentally and with
// column methods), multiplying by a two-digit number, estimating, and word problems.
// Year 6: no calculators, multiply by at most a two-digit number.

/** How many columns regroup (carry) when adding a and b. */
function carries(a: number, b: number): number {
  const da = digitsOf(a);
  const db = digitsOf(b);
  let c = 0;
  let count = 0;
  for (let i = 0; i < Math.max(da.length, db.length); i++) {
    const s = (da[i] ?? 0) + (db[i] ?? 0) + c;
    c = s >= 10 ? 1 : 0;
    count += c;
  }
  return count;
}

/** Number of columns where the top digit is smaller than the bottom digit (before any renaming). */
function borrows(a: number, b: number): number {
  const da = digitsOf(a);
  const db = digitsOf(b);
  return db.filter((y, i) => (da[i] ?? 0) < y).length;
}

/** Round to the nearest multiple of `place` (halves round up). */
const roundTo = (n: number, place: number) => Math.round(n / place) * place;

/** A two-digit number that doesn't end in 0. */
function twoDigitNoZero(rng: { int(a: number, b: number): number }, lo: number, hi: number): number {
  let n = rng.int(lo, hi);
  while (n % 10 === 0) n = rng.int(lo, hi);
  return n;
}

/** Long multiplication working for a × b (b has two digits and doesn't end in 0). */
function longMultiply(a: number, b: number): { layout: string; lines: string[] } {
  const ones = b % 10;
  const tens = b - ones;
  const p1 = a * ones;
  const p2 = a * tens;
  const lines = [
    `Split ${b} into ${tens} + ${ones}.`,
    `$${tex(a)} \\times ${ones} = ${tex(p1)}$`,
    tens === 10
      ? `$${tex(a)} \\times 10 = ${tex(p2)}$`
      : `$${tex(a)} \\times ${tens} = ${tex(p2)}$ (work out $${tex(a)} \\times ${tens / 10} = ${tex(a * (tens / 10))}$, then make it 10 times bigger).`,
    `Add the two parts: $${tex(p1)} + ${tex(p2)} = ${tex(a * b)}$.`,
  ];
  const layout = columnTex(
    [
      ['', a],
      ['\\times', b],
    ],
    [
      ['', p1],
      ['+', p2],
      ['', a * b],
    ],
    true,
  );
  return { layout, lines };
}

export const addSubtract: QuestionTemplate = {
  id: 'm6.num.whole-numbers.add-subtract',
  topicId: 'm6.num.whole-numbers',
  title: 'Add and subtract whole numbers (mental and column methods)',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      const kind = rng.pick(['nearAdd', 'nearSub', 'hundreds', 'partition'] as const);
      if (kind === 'nearAdd' || kind === 'nearSub') {
        const k = rng.int(1, 4);
        const c = rng.int(1, 3);
        const b = 100 * k - c;
        const add = kind === 'nearAdd';
        const a = add ? rng.int(121, 689) : rng.int(100 * k + 120, 980);
        const friendly = 100 * k;
        const ans = add ? a + b : a - b;
        return {
          type: 'numeric',
          prompt: `Work out $${a} ${add ? '+' : '-'} ${b}$ in your head.`,
          answer: ans,
          form: 'integer',
          calculator: 'not-allowed',
          hints: [
            `${b} is very close to a friendly number. Which one?`,
            add
              ? `Add the friendly number first, then fix it up, because ${b} is a little less than it.`
              : 'Take away the friendly number first, then fix it up, because you took away a little too much.',
          ],
          solution: add
            ? `${b} is ${c} less than ${friendly}.\n\n$${a} + ${friendly} = ${a + friendly}$, then take away ${c}: $${a + friendly} - ${c} = ${ans}$.`
            : `${b} is ${c} less than ${friendly}.\n\n$${a} - ${friendly} = ${a - friendly}$. You took away ${c} too many, so add ${c} back: $${a - friendly} + ${c} = ${ans}$.`,
        };
      }
      if (kind === 'hundreds') {
        const x = rng.int(12, 79);
        let y = rng.int(12, 79);
        while (y === x) y = rng.int(12, 79);
        const add = rng.chance(0.5);
        const [p, q] = add ? [x, y] : [Math.max(x, y), Math.min(x, y)];
        const ans = add ? 100 * (p + q) : 100 * (p - q);
        return {
          type: 'numeric',
          prompt: `Work out $${tex(100 * p)} ${add ? '+' : '-'} ${tex(100 * q)}$ in your head.`,
          answer: ans,
          form: 'integer',
          calculator: 'not-allowed',
          hints: [`Think of each number as a number of hundreds: ${num(100 * p)} is ${p} hundreds.`, `Now work out ${p} ${add ? '+' : '−'} ${q}.`],
          solution: `Think in hundreds: ${p} hundreds ${add ? '+' : '−'} ${q} hundreds $= ${add ? p + q : p - q}$ hundreds $= ${tex(ans)}$.`,
        };
      }
      let a = rng.int(25, 89);
      let b = rng.int(25, 89);
      while ((a % 10) + (b % 10) < 10 || a % 10 === 0 || b % 10 === 0) {
        a = rng.int(25, 89);
        b = rng.int(25, 89);
      }
      const ta = a - (a % 10);
      const tb = b - (b % 10);
      return {
        type: 'numeric',
        prompt: `Work out $${a} + ${b}$ in your head by **partitioning** (splitting) the numbers into tens and ones.`,
        answer: a + b,
        form: 'integer',
        calculator: 'not-allowed',
        hints: [`Split ${a} into ${ta} + ${a % 10} and ${b} into ${tb} + ${b % 10}.`, 'Add the tens, add the ones, then add the two answers together.'],
        solution: `Tens: $${ta} + ${tb} = ${ta + tb}$. Ones: $${a % 10} + ${b % 10} = ${(a % 10) + (b % 10)}$.\n\nTogether: $${ta + tb} + ${(a % 10) + (b % 10)} = ${a + b}$.`,
      };
    }

    const add = rng.chance(0.5);
    let a = 0;
    let b = 0;
    if (difficulty === 2) {
      for (let attempt = 0; attempt < 200; attempt++) {
        if (add) {
          a = rng.int(1050, 7999);
          b = rng.int(1050, 7999);
          if (carries(a, b) >= 1) break;
        } else {
          a = rng.int(3000, 9899);
          b = rng.int(1050, a - 500);
          if (borrows(a, b) >= 1) break;
        }
      }
    } else if (add) {
      for (let attempt = 0; attempt < 200; attempt++) {
        a = rng.int(10500, 69999);
        b = rng.int(rng.chance(0.5) ? 1200 : 10500, 29999);
        if (carries(a, b) >= 2) break;
      }
    } else {
      // Subtract from a number with zeros in it (renaming across zeros).
      for (let attempt = 0; attempt < 200; attempt++) {
        const len = rng.chance(0.75) ? 5 : 6;
        const d = [rng.int(0, 9)];
        for (let i = 1; i < len - 1; i++) d.push(rng.chance(0.6) ? 0 : rng.int(1, 9));
        d.push(rng.int(2, 9));
        a = fromDigits(d);
        const zeros = d.slice(0, -1).filter((x) => x === 0).length;
        b = randomDigits(rng, len - (rng.chance(0.4) ? 1 : 0));
        if (zeros >= 2 && b < a - 1000 && borrows(a, b) >= 1) break;
      }
    }
    const ans = add ? a + b : a - b;
    const layout = columnTex(
      [
        ['', a],
        [add ? '+' : '-', b],
      ],
      [['', ans]],
    );
    const steps = add ? additionSteps(a, b) : subtractionSteps(a, b);
    return {
      type: 'numeric',
      prompt: `Use the **column method** to work out $${tex(a)} ${add ? '+' : '-'} ${tex(b)}$.`,
      answer: ans,
      form: 'integer',
      calculator: 'not-allowed',
      hints: add
        ? ['Line up the digits by place value: ones under ones, tens under tens, and so on.', 'Start with the ones. If a column adds to 10 or more, regroup 10 of them as 1 in the next column.']
        : [
            'Line up the digits by place value, with the bigger number on top.',
            'Start with the ones. If the top digit is smaller than the bottom digit, rename 1 from the next column on the left.',
          ],
      solution: [
        layout,
        ...steps,
        add
          ? `So $${tex(a)} + ${tex(b)} = ${tex(ans)}$.`
          : `So $${tex(a)} - ${tex(b)} = ${tex(ans)}$. Check by adding: $${tex(ans)} + ${tex(b)} = ${tex(a)}$ ✓`,
      ].join('\n\n'),
    };
  },
};

export const multiply: QuestionTemplate = {
  id: 'm6.num.whole-numbers.multiply',
  topicId: 'm6.num.whole-numbers',
  title: 'Multiply whole numbers (facts, one-digit and two-digit multipliers)',
  difficulties: [1, 2, 3, 4],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      if (rng.chance(0.5)) {
        const a = rng.int(3, 12);
        const b = rng.int(3, 12);
        return {
          type: 'numeric',
          prompt: `Work out $${a} \\times ${b}$.`,
          answer: a * b,
          form: 'integer',
          calculator: 'not-allowed',
          hints: [`Use your ${a} times table. Or start from a fact you know, like $${a} \\times ${b - 1}$, and add one more ${a}.`],
          solution: `From the ${a} times table: $${a} \\times ${b} = ${a * b}$.\n\nCheck: $${a} \\times ${b - 1} = ${a * (b - 1)}$, and $${a * (b - 1)} + ${a} = ${a * b}$ ✓`,
        };
      }
      const a = rng.int(2, 12);
      const c = rng.int(2, 9);
      const z = rng.pick([10, 10, 100] as const);
      const b = c * z;
      return {
        type: 'numeric',
        prompt: `Work out $${a} \\times ${tex(b)}$.`,
        answer: a * b,
        form: 'integer',
        calculator: 'not-allowed',
        hints: [`${num(b)} is $${c} \\times ${z}$. Start with $${a} \\times ${c}$.`, `Then make your answer ${z} times bigger.`],
        solution: `$${a} \\times ${c} = ${a * c}$, so $${a} \\times ${tex(b)} = ${a * c} \\times ${z} = ${tex(a * b)}$.`,
      };
    }
    if (difficulty === 2) {
      let a = rng.int(102, 989);
      while (a % 10 === 0) a = rng.int(102, 989);
      const b = rng.int(3, 9);
      const parts = digitsOf(a)
        .map((d, i) => d * 10 ** i)
        .reverse()
        .filter((x) => x > 0);
      return {
        type: 'numeric',
        prompt: `Work out $${a} \\times ${b}$.`,
        answer: a * b,
        form: 'integer',
        calculator: 'not-allowed',
        hints: [`Partition ${a} into ${parts.join(' + ')}.`, `Multiply each part by ${b}, then add the answers.`],
        solution: [
          `Partition: $${a} = ${parts.join(' + ')}$.`,
          parts.map((p) => `$${p} \\times ${b} = ${tex(p * b)}$`).join('\n\n'),
          `Add: $${parts.map((p) => tex(p * b)).join(' + ')} = ${tex(a * b)}$.`,
        ].join('\n\n'),
      };
    }
    const a = difficulty === 3 ? twoDigitNoZero(rng, 13, 98) : rng.chance(0.6) ? rng.int(123, 989) : rng.int(1012, 2999);
    const b = difficulty === 3 ? twoDigitNoZero(rng, 12, 39) : twoDigitNoZero(rng, 12, 49);
    const { layout, lines } = longMultiply(a, b);
    return {
      type: 'numeric',
      prompt: `Work out $${tex(a)} \\times ${b}$.`,
      answer: a * b,
      form: 'integer',
      marks: difficulty === 4 ? 2 : 1,
      calculator: 'not-allowed',
      hints: [
        `Split ${b} into tens and ones: ${b - (b % 10)} + ${b % 10}.`,
        `Work out $${tex(a)} \\times ${b % 10}$ and $${tex(a)} \\times ${b - (b % 10)}$, then add them.`,
      ],
      solution: [...lines, layout].join('\n\n'),
    };
  },
};

export const estimate: QuestionTemplate = {
  id: 'm6.num.whole-numbers.estimate',
  topicId: 'm6.num.whole-numbers',
  title: 'Estimate answers by rounding, and check answers are reasonable',
  difficulties: [2, 3],
  generate({ rng, difficulty }) {
    if (difficulty === 2) {
      const place = rng.pick([100, 1000] as const);
      const placeWord = place === 100 ? 'hundred' : 'thousand';
      const pick = () => {
        let n = rng.int(1050, 8949);
        while (n % place === place / 2 || n % place === 0) n = rng.int(1050, 8949);
        return n;
      };
      let a = pick();
      let b = pick();
      while (roundTo(a, place) === roundTo(b, place)) b = pick();
      const add = rng.chance(0.5);
      if (!add && a < b) [a, b] = [b, a];
      const ra = roundTo(a, place);
      const rb = roundTo(b, place);
      const est = add ? ra + rb : ra - rb;
      const fa = Math.floor(a / place) * place;
      const fb = Math.floor(b / place) * place;
      const trunc = add ? fa + fb : fa - fb;
      const other = add ? Math.abs(ra - rb) : ra + rb;
      const roundingNote = `Check your rounding: one of the numbers rounds to a different ${placeWord}.`;
      const m = mcqFields(rng, { text: `$${tex(est)}$` }, [
        { text: `$${tex(trunc)}$`, feedback: `This rounds both numbers down. To round to the nearest ${placeWord}, look at the next digit to the right: 5 or more rounds up.` },
        { text: `$${tex(other)}$`, feedback: add ? 'This takes away instead of adding.' : 'This adds instead of taking away.' },
        { text: `$${tex(est * 10)}$`, feedback: 'This is 10 times too big. Check the place value of your rounded numbers.' },
        { text: `$${tex(est + place)}$`, feedback: roundingNote },
        ...(est - place > 0 ? [{ text: `$${tex(est - place)}$`, feedback: roundingNote }] : []),
      ]);
      return {
        type: 'mcq',
        prompt: `Round each number to the nearest ${placeWord} to **estimate** $${tex(a)} ${add ? '+' : '-'} ${tex(b)}$.`,
        ...m,
        calculator: 'not-allowed',
        hints: [
          `Round ${num(a)} to the nearest ${placeWord} first. Look at the digit just to the right of the ${placeWord}s place.`,
          `Then round ${num(b)} the same way, and ${add ? 'add' : 'subtract'} the rounded numbers.`,
        ],
        solution: `$${tex(a)} \\approx ${tex(ra)}$ and $${tex(b)} \\approx ${tex(rb)}$.\n\nEstimate: $${tex(ra)} ${add ? '+' : '-'} ${tex(rb)} = ${tex(est)}$.\n\n(The exact answer is ${num(add ? a + b : a - b)}, which is close to the estimate.)`,
      };
    }
    // difficulty 3
    if (rng.chance(0.5)) {
      // Best estimate of a product.
      const threeDigit = rng.chance(0.4);
      let a: number;
      let b: number;
      let ra: number;
      let rb: number;
      let step: number;
      if (threeDigit) {
        a = rng.int(110, 940);
        while (a % 100 >= 40 && a % 100 <= 60) a = rng.int(110, 940);
        b = rng.int(3, 9);
        ra = roundTo(a, 100);
        rb = b;
        step = 100;
      } else {
        const two = () => {
          let n = rng.int(12, 97);
          while (n % 10 === 5 || n % 10 === 0) n = rng.int(12, 97);
          return n;
        };
        a = two();
        b = two();
        ra = roundTo(a, 10);
        rb = roundTo(b, 10);
        step = 10;
      }
      const est = ra * rb;
      const roundedDown = threeDigit ? Math.floor(a / 100) * 100 * b : Math.floor(a / 10) * 10 * Math.floor(b / 10) * 10;
      const m = mcqFields(rng, { text: `$${tex(est)}$` }, [
        { text: `$${tex(ra + rb)}$`, feedback: 'This adds the rounded numbers instead of multiplying them.' },
        { text: `$${tex(est * 10)}$`, feedback: `This is 10 times too big. Check your zeros in $${tex(ra)} \\times ${rb}$.` },
        { text: `$${tex(est / 10)}$`, feedback: `This is 10 times too small. Check your zeros in $${tex(ra)} \\times ${rb}$.` },
        { text: `$${tex(roundedDown)}$`, feedback: 'This rounds down every time. Round to the nearest: 5 or more rounds up.' },
        { text: `$${tex((ra + step) * rb)}$`, feedback: `Check your rounding of ${a}.` },
      ]);
      return {
        type: 'mcq',
        prompt: threeDigit
          ? `Round ${a} to the nearest hundred to **estimate** $${a} \\times ${b}$.`
          : `Round each number to the nearest ten to **estimate** $${a} \\times ${b}$.`,
        ...m,
        calculator: 'not-allowed',
        hints: threeDigit
          ? [`Round ${a} to the nearest hundred.`, `Then use a times-table fact: multiply the number of hundreds by ${b}.`]
          : [`Round ${a} and ${b} to the nearest ten.`, 'Multiply the tens digits using a times-table fact, then put two zeros on the end.'],
        solution: threeDigit
          ? `$${a} \\approx ${ra}$, so the estimate is $${ra} \\times ${b} = ${tex(est)}$.\n\n(The exact answer is ${num(a * b)}.)`
          : `$${a} \\approx ${ra}$ and $${b} \\approx ${rb}$.\n\n$${ra} \\times ${rb} = ${ra / 10} \\times ${rb / 10} \\times 100 = ${tex(est)}$.\n\n(The exact answer is ${num(a * b)}.)`,
      };
    }
    // Is this answer reasonable?
    const two = () => {
      let n = rng.int(21, 97);
      while (n % 10 === 5 || n % 10 === 0) n = rng.int(21, 97);
      return n;
    };
    const a = two();
    const b = two();
    const exact = a * b;
    const scenario = rng.pick(['right', 'small', 'big'] as const);
    const shown = scenario === 'right' ? exact : scenario === 'small' ? a * (b % 10) + a * Math.floor(b / 10) : exact * 10;
    const name = rng.pick(NAMES);
    const est = roundTo(a, 10) * roundTo(b, 10);
    return {
      type: 'mcq',
      prompt: `${name} worked out $${a} \\times ${b}$ and got ${num(shown)}. Use an estimate to decide whether ${name}'s answer is reasonable.`,
      options: [
        { id: 'a', text: 'Yes, it is close to the estimate' },
        { id: 'b', text: 'No, it is much too small' },
        { id: 'c', text: 'No, it is much too big' },
      ],
      correct: scenario === 'right' ? 'a' : scenario === 'small' ? 'b' : 'c',
      feedback: {
        ...(scenario !== 'right' && { a: `Compare ${num(shown)} with your estimate of ${num(est)}. Are they close?` }),
        ...(scenario !== 'small' && {
          b: scenario === 'big'
            ? `${num(shown)} is bigger than the estimate of ${num(est)}, not smaller.`
            : `${num(shown)} is not much smaller than the estimate of ${num(est)}.`,
        }),
        ...(scenario !== 'big' && {
          c: scenario === 'small'
            ? `${num(shown)} is smaller than the estimate of ${num(est)}, not bigger.`
            : `${num(shown)} is not much bigger than the estimate of ${num(est)}.`,
        }),
      },
      shuffle: false,
      calculator: 'not-allowed',
      hints: [`Round ${a} and ${b} to the nearest ten and multiply.`, `Compare your estimate with ${num(shown)}.`],
      solution: `Estimate: $${roundTo(a, 10)} \\times ${roundTo(b, 10)} = ${tex(est)}$.\n\n${
        scenario === 'right'
          ? `${num(shown)} is close to ${num(est)}, so the answer is reasonable. (It is correct.)`
          : scenario === 'small'
            ? `${num(shown)} is much smaller than ${num(est)}, so it can't be right. ${name} probably forgot that the ${Math.floor(b / 10)} in ${b} means ${Math.floor(b / 10)} tens. The correct answer is ${num(exact)}.`
            : `${num(shown)} is about 10 times bigger than ${num(est)}, so it can't be right. The correct answer is ${num(exact)}.`
      }`,
    };
  },
};

export const wordProblems: QuestionTemplate = {
  id: 'm6.num.whole-numbers.word-problems',
  topicId: 'm6.num.whole-numbers',
  title: 'Word problems with adding, subtracting and multiplying',
  difficulties: [3, 4, 5],
  generate({ rng, difficulty }) {
    const place = rng.pick(PLACES);
    if (difficulty === 3) {
      const kind = rng.pick(['crowd', 'fundraise', 'library'] as const);
      if (kind === 'crowd') {
        const A = rng.int(12000, 38000);
        const B = rng.int(1200, 9800);
        const second = A - B;
        return {
          type: 'numeric',
          prompt: `On Saturday, ${num(A)} people watched a rugby game in ${place}. On Sunday, ${num(B)} fewer people watched a netball game there. How many people watched a game over the two days altogether?`,
          answer: A + second,
          form: 'integer',
          calculator: 'not-allowed',
          hints: ['First work out how many people watched on Sunday.', 'Then add the Saturday and Sunday crowds together.'],
          solution: `Sunday: $${tex(A)} - ${tex(B)} = ${tex(second)}$ people.\n\nAltogether: $${tex(A)} + ${tex(second)} = ${tex(A + second)}$ people.`,
        };
      }
      if (kind === 'fundraise') {
        const goal = 100 * rng.int(18, 40);
        const a = rng.int(Math.round(goal * 0.25), Math.round(goal * 0.4));
        const b = rng.int(Math.round(goal * 0.2), Math.round(goal * 0.35));
        const room = rng.int(3, 24);
        return {
          type: 'numeric',
          prompt: `Room ${room} wants to raise ${cash(goal)} for a trip to ${place}. They raise ${cash(a)} at a sausage sizzle and ${cash(b)} at a cake stall. How much more money do they need?`,
          answer: goal - a - b,
          units: '$',
          form: 'integer',
          calculator: 'not-allowed',
          hints: ['Find how much they have raised so far.', 'Then find the difference between that and their goal.'],
          solution: `Raised so far: $${tex(a)} + ${tex(b)} = ${tex(a + b)}$.\n\nStill needed: $${tex(goal)} - ${tex(a + b)} = ${tex(goal - a - b)}$, so they need **${cash(goal - a - b)}** more.`,
        };
      }
      const N = rng.int(3200, 9400);
      const g = rng.int(140, 980);
      const k = rng.int(120, 760);
      return {
        type: 'numeric',
        prompt: `A school library has ${num(N)} books. It gives away ${g} old books, then buys ${k} new books. How many books does the library have now?`,
        answer: N - g + k,
        form: 'integer',
        calculator: 'not-allowed',
        hints: ['Giving books away makes the total smaller. Buying books makes it bigger.', 'Do one step at a time, in order.'],
        solution: `After giving books away: $${tex(N)} - ${g} = ${tex(N - g)}$.\n\nAfter buying new books: $${tex(N - g)} + ${k} = ${tex(N - g + k)}$ books.`,
      };
    }
    if (difficulty === 4) {
      // Equal groups: size × number of groups, where one number has two digits.
      const kind = rng.pick(['hall', 'pies', 'kiwifruit', 'ferry'] as const);
      let x: number; // the number being multiplied
      let y: number; // the two-digit multiplier
      let prompt: string;
      let reason: string;
      let answerText: (n: number) => string;
      let money = false;
      if (kind === 'hall') {
        x = rng.int(14, 36);
        y = twoDigitNoZero(rng, 12, 28);
        prompt = `The school hall has ${y} rows of chairs, with ${x} chairs in each row. How many chairs are there altogether?`;
        reason = `There are ${y} rows of ${x} chairs, so multiply: $${x} \\times ${y}$.`;
        answerText = (n) => `There are **${num(n)} chairs**.`;
      } else if (kind === 'pies') {
        x = rng.int(125, 480);
        y = twoDigitNoZero(rng, 12, 31);
        prompt = `A bakery in ${place} makes ${x} pies every day. How many pies does it make in ${y} days?`;
        reason = `${y} days of ${x} pies is $${x} \\times ${y}$.`;
        answerText = (n) => `The bakery makes **${num(n)} pies**.`;
      } else if (kind === 'kiwifruit') {
        x = rng.int(120, 650);
        y = twoDigitNoZero(rng, 18, 39);
        prompt = `An orchard packs ${x} trays of kiwifruit. Each tray holds ${y} kiwifruit. How many kiwifruit is that altogether?`;
        reason = `${x} trays with ${y} in each is $${x} \\times ${y}$.`;
        answerText = (n) => `That is **${num(n)} kiwifruit**.`;
      } else {
        x = rng.int(21, 64);
        y = twoDigitNoZero(rng, 12, 48);
        prompt = `A ferry ticket costs ${cash(y)} for each student. ${x} students are going on the ferry. What is the total cost?`;
        reason = `${x} tickets at ${cash(y)} each is $${x} \\times ${y}$.`;
        answerText = (n) => `The total cost is **${cash(n)}**.`;
        money = true;
      }
      const { layout, lines } = longMultiply(x, y);
      return {
        type: 'numeric',
        prompt,
        answer: x * y,
        form: 'integer',
        ...(money && { units: '$' }),
        marks: 2,
        calculator: 'not-allowed',
        hints: ['Is this an adding, subtracting or multiplying problem? Look for equal groups.', `Work out $${x} \\times ${y}$. Split ${y} into tens and ones.`],
        solution: [reason, ...lines, layout, answerText(x * y)].join('\n\n'),
      };
    }
    // difficulty 5: multi-step
    const kind = rng.pick(['camp', 'tickets', 'compare'] as const);
    if (kind === 'camp') {
      const c = rng.int(95, 185);
      const n = twoDigitNoZero(rng, 21, 34);
      const T = c * n;
      const p = 10 * rng.int(Math.round((T * 0.4) / 10), Math.round((T * 0.85) / 10));
      const tens = n - (n % 10);
      return {
        type: 'numeric',
        prompt: `School camp costs ${cash(c)} for each student. ${n} students are going. The school has already collected ${cash(p)}. How much more money does the school need to collect?`,
        answer: T - p,
        units: '$',
        form: 'integer',
        marks: 3,
        calculator: 'not-allowed',
        hints: ['First find the total cost of camp for all the students.', 'Then take away the money already collected.'],
        solution: `Total cost: $${c} \\times ${n}$. Split ${n} into ${tens} + ${n % 10}: $${c} \\times ${tens} = ${tex(c * tens)}$ and $${c} \\times ${n % 10} = ${tex(c * (n % 10))}$, so the total is $${tex(c * tens)} + ${tex(c * (n % 10))} = ${tex(T)}$.\n\nStill needed: $${tex(T)} - ${tex(p)} = ${tex(T - p)}$, so the school needs **${cash(T - p)}** more.`,
      };
    }
    if (kind === 'tickets') {
      const A = rng.int(18, 32);
      const C = rng.int(9, 16);
      const na = rng.int(2, 6);
      const nc = rng.int(11, 28);
      const total = A * na + C * nc;
      const paid = 100 * Math.ceil((total + 1) / 100);
      const where = rng.pick(['the aquarium', 'the zoo', 'the museum', 'the hot pools', 'the trampoline park'] as const);
      return {
        type: 'numeric',
        prompt: `Tickets to ${where} cost ${cash(A)} for an adult and ${cash(C)} for a child. A group of ${na} adults and ${nc} children go. They pay with ${cash(paid)}. How much change do they get?`,
        answer: paid - total,
        units: '$',
        form: 'integer',
        marks: 3,
        calculator: 'not-allowed',
        hints: ['Work out the cost for the adults and the cost for the children separately.', 'Add them to get the total, then take the total away from the amount paid.'],
        solution: `Adults: $${na} \\times ${A} = ${na * A}$. Children: $${nc} \\times ${C} = ${nc * C}$.\n\nTotal: $${na * A} + ${nc * C} = ${tex(total)}$.\n\nChange: $${tex(paid)} - ${tex(total)} = ${paid - total}$, so they get **${cash(paid - total)}** change.`,
      };
    }
    let cA = twoDigitNoZero(rng, 24, 58);
    let pA = rng.int(105, 160);
    let cB = twoDigitNoZero(rng, 24, 58);
    let pB = rng.int(105, 160);
    while (cA * pA === cB * pB) pB++;
    if (cA * pA > cB * pB) [cA, pA, cB, pB] = [cB, pB, cA, pA];
    const fruit = rng.pick(['apples', 'avocados', 'mandarins', 'feijoas'] as const);
    const A = cA * pA;
    const B = cB * pB;
    return {
      type: 'numeric',
      prompt: `Farm A picks ${cA} crates of ${fruit}, with ${pA} ${fruit} in each crate. Farm B picks ${cB} crates, with ${pB} ${fruit} in each crate. How many more ${fruit} does Farm B pick than Farm A?`,
      answer: B - A,
      form: 'integer',
      marks: 3,
      calculator: 'not-allowed',
      hints: ['Find how many each farm picks by multiplying.', 'Then find the difference by subtracting.'],
      solution: `Farm A: $${pA} \\times ${cA} = ${tex(A)}$ ${fruit}.\n\nFarm B: $${pB} \\times ${cB} = ${tex(B)}$ ${fruit}.\n\nDifference: $${tex(B)} - ${tex(A)} = ${tex(B - A)}$, so Farm B picks **${num(B - A)} more**.`,
    };
  },
};

export const spotMistake: QuestionTemplate = {
  id: 'm6.num.whole-numbers.spot-mistake',
  topicId: 'm6.num.whole-numbers',
  title: 'Spot the mistake in a written method',
  difficulties: [3, 4],
  generate({ rng, difficulty }) {
    const name = rng.pick(NAMES);
    if (difficulty === 3) {
      if (rng.chance(0.5)) {
        // Subtraction: took the smaller digit from the bigger one in each column.
        let a = 0;
        let b = 0;
        let wrong = 0;
        for (let attempt = 0; attempt < 200; attempt++) {
          a = rng.int(3000, 9899);
          b = rng.int(1050, a - 600);
          const db = digitsOf(b);
          wrong = fromDigits(digitsOf(a).map((x, i) => Math.abs(x - (db[i] ?? 0))));
          if (borrows(a, b) >= 1 && wrong !== a - b) break;
        }
        const ans = a - b;
        return {
          type: 'numeric',
          prompt: `${name} worked out $${tex(a)} - ${tex(b)}$ like this:\n\n${columnTex([['', a], ['-', b]], [['', wrong]])}\n\n${name}'s answer is wrong. What is the correct answer?`,
          answer: ans,
          form: 'integer',
          calculator: 'not-allowed',
          hints: ['Look at each column. Is the top digit ever smaller than the bottom digit?', "In those columns you can't swap the digits around. Rename 1 from the next column on the left instead."],
          solution: [
            `${name}'s mistake: in some columns the top digit is smaller, and ${name} took the smaller digit away from the bigger one instead of renaming.`,
            columnTex([['', a], ['-', b]], [['', ans]]),
            ...subtractionSteps(a, b),
            `Check: $${tex(ans)} + ${tex(b)} = ${tex(a)}$ ✓`,
          ].join('\n\n'),
        };
      }
      // Addition: forgot to regroup (carry).
      let a = 0;
      let b = 0;
      let wrong = 0;
      for (let attempt = 0; attempt < 200; attempt++) {
        a = rng.int(1200, 6999);
        b = rng.int(1200, 2999);
        const db = digitsOf(b);
        wrong = fromDigits(digitsOf(a).map((x, i) => (x + (db[i] ?? 0)) % 10));
        if (carries(a, b) >= 1 && wrong !== a + b) break;
      }
      return {
        type: 'numeric',
        prompt: `${name} worked out $${tex(a)} + ${tex(b)}$ like this:\n\n${columnTex([['', a], ['+', b]], [['', wrong]])}\n\n${name}'s answer is wrong. What is the correct answer?`,
        answer: a + b,
        form: 'integer',
        calculator: 'not-allowed',
        hints: ['Look for a column that adds to 10 or more.', 'What should happen to the extra ten in that column?'],
        solution: [
          `${name}'s mistake: when a column added to 10 or more, ${name} wrote down only the last digit and forgot to regroup the 1 into the next column.`,
          columnTex([['', a], ['+', b]], [['', a + b]]),
          ...additionSteps(a, b),
        ].join('\n\n'),
      };
    }
    // difficulty 4: multiplication mistakes
    if (rng.chance(0.55)) {
      // Forgot that the tens digit is worth tens (no place-holder zero).
      let a = rng.int(23, 389);
      while (a % 10 === 0) a = rng.int(23, 389);
      const b = twoDigitNoZero(rng, 21, 49);
      const t = Math.floor(b / 10);
      const o = b % 10;
      const p1 = a * o;
      const bad2 = a * t;
      const wrong = p1 + bad2;
      const { layout, lines } = longMultiply(a, b);
      return {
        type: 'numeric',
        prompt: `${name} worked out $${a} \\times ${b}$ like this:\n\n${columnTex([['', a], ['\\times', b]], [['', p1], ['+', bad2], ['', wrong]], true)}\n\n${name}'s answer is wrong. What is the correct answer?`,
        answer: a * b,
        form: 'integer',
        marks: 2,
        calculator: 'not-allowed',
        hints: [`What is the ${t} in ${b} really worth?`, `Estimate first: about $${roundTo(a, a < 100 ? 10 : 100)} \\times ${roundTo(b, 10)}$. Is ${name}'s answer close to that?`],
        solution: [
          `${name}'s mistake: the ${t} in ${b} means ${t} tens, so the second line should be $${a} \\times ${10 * t} = ${tex(a * 10 * t)}$, not $${a} \\times ${t} = ${tex(bad2)}$. (This is why the second line ends in a 0.)`,
          ...lines,
          layout,
        ].join('\n\n'),
      };
    }
    // Partitioning slip: treated the tens digit as ones.
    let a = rng.int(312, 989);
    while (Math.floor(a / 10) % 10 === 0 || a % 10 === 0) a = rng.int(312, 989);
    const b = rng.int(3, 9);
    const h = Math.floor(a / 100) * 100;
    const t = Math.floor((a % 100) / 10);
    const o = a % 10;
    const wrong = h * b + t * b + o * b;
    return {
      type: 'numeric',
      prompt: `${name} worked out $${a} \\times ${b}$ like this:\n\n$${h} \\times ${b} = ${tex(h * b)}$\n\n$${t} \\times ${b} = ${t * b}$\n\n$${o} \\times ${b} = ${o * b}$\n\n$${tex(h * b)} + ${t * b} + ${o * b} = ${tex(wrong)}$\n\n${name}'s answer is wrong. What is the correct answer?`,
      answer: a * b,
      form: 'integer',
      marks: 2,
      calculator: 'not-allowed',
      hints: [`Partition ${a} carefully. What is the ${t} in ${a} worth?`, `Estimate: about $${roundTo(a, 100)} \\times ${b}$. Is ${name}'s answer close to that?`],
      solution: [
        `${name}'s mistake: the ${t} in ${a} is ${t} ten${t === 1 ? '' : 's'}, which is ${10 * t}. So the middle line should be $${10 * t} \\times ${b} = ${10 * t * b}$.`,
        `$${a} = ${h} + ${10 * t} + ${o}$`,
        `$${tex(h * b)} + ${10 * t * b} + ${o * b} = ${tex(a * b)}$`,
      ].join('\n\n'),
    };
  },
};

export const templates: QuestionTemplate[] = [addSubtract, multiply, estimate, wordProblems, spotMistake];
