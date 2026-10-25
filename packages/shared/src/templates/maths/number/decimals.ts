import type { QuestionTemplate } from '../../types';
import { clean, frac, mixed, NAMES, num, round, tex } from '../../format';
import { cents, mcqFields, simp } from './helpers';

// m9.num.decimals — operations with decimals, rounding, remainders and estimation.
// Values are built from integers (e.g. 346 hundredths) so there is no floating-point drift.

const POW10 = [1, 10, 100, 1000, 10000] as const;
const p10 = (k: number) => POW10[k]!;

/** A decimal with exactly `dp` decimal places (last digit non-zero) and whole part 0…maxWhole. */
function randDecimal(rng: { int(a: number, b: number): number }, maxWhole: number, dp: number) {
  const whole = rng.int(0, maxWhole);
  let f = rng.int(1, p10(dp) - 1);
  if (f % 10 === 0) f += 1;
  const units = whole * p10(dp) + f;
  return { units, dp, value: units / p10(dp) };
}

const places = (dp: number) => `${dp} decimal place${dp === 1 ? '' : 's'}`;

/** "= 4.5" if a ÷ b has at most `dp` decimal places, otherwise "≈ 4.27" (rounded to dp). For use inside $…$. */
function divResult(a: number, b: number, dp = 2): string {
  const exact = Number.isInteger((a * 10 ** dp) / b);
  return exact ? `= ${tex(clean(a / b))}` : `\\approx ${tex(round(a / b, dp))}`;
}

export const decimalOperations: QuestionTemplate = {
  id: 'm9.num.decimals.operations',
  topicId: 'm9.num.decimals',
  title: 'Add, subtract, multiply and divide decimals',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      const kind = rng.pick(['add', 'sub', 'subFromWhole'] as const);
      let A = randDecimal(rng, 40, rng.int(1, 2));
      let B = randDecimal(rng, 20, rng.int(1, 3));
      if (kind === 'subFromWhole') {
        const W = rng.int(Math.floor(B.value) + 2, 30);
        A = { units: W, dp: 0, value: W };
      } else if (kind === 'sub' && A.value < B.value) {
        [A, B] = [B, A];
      }
      const D = Math.max(A.dp, B.dp);
      const a = A.units * p10(D - A.dp);
      const b = B.units * p10(D - B.dp);
      const op = kind === 'add' ? '+' : '-';
      const R = op === '+' ? a + b : a - b;
      if (R === 0) return decimalOperations.generate({ rng, difficulty });
      const answer = clean(R / p10(D));
      const padded = `${(a / p10(D)).toFixed(D)} ${op} ${(b / p10(D)).toFixed(D)} = ${(R / p10(D)).toFixed(D)}`;
      return {
        type: 'numeric',
        prompt: `Work out $${tex(A.value)} ${op} ${tex(B.value)}$.`,
        answer,
        calculator: 'not-allowed',
        hints: [
          'Line up the decimal points, one under the other.',
          kind === 'subFromWhole' ? `Write ${A.value} as ${A.value}.${'0'.repeat(D)} so both numbers have the same number of decimal places.` : 'Fill any gaps with zeros so both numbers have the same number of decimal places.',
        ],
        solution: `Write both numbers with ${places(D)} and line up the decimal points:\n\n$${padded}$${(R / p10(D)).toFixed(D) !== String(answer) ? `\n\nSo the answer is $${tex(answer)}$.` : ''}`,
      };
    }
    if (difficulty === 2) {
      const A = rng.pick([2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 25]);
      const pa = A > 10 ? 1 : rng.int(1, 2);
      const B = rng.int(2, 9);
      const pb = 1;
      const t = pa + pb;
      const AB = A * B;
      const answer = clean(AB / p10(t));
      const a = clean(A / p10(pa));
      const b = clean(B / p10(pb));
      return {
        type: 'numeric',
        prompt: `Work out $${tex(a)} \\times ${tex(b)}$.`,
        answer,
        calculator: 'not-allowed',
        hints: ['Multiply the numbers as if there were no decimal points.', 'Then count the decimal places in the question: the answer has the same total number of decimal places.'],
        solution: [
          `Ignore the decimal points: $${A} \\times ${B} = ${AB}$.`,
          `There ${t === 1 ? 'is 1 decimal place' : `are ${t} decimal places`} altogether in the question (${pa} in $${tex(a)}$ and ${pb} in $${tex(b)}$), so the answer has ${places(t)}: $${(AB / p10(t)).toFixed(t)}${(AB / p10(t)).toFixed(t) !== String(answer) ? ` = ${tex(answer)}` : ''}$.`,
          `As fractions this is $\\frac{${A}}{${p10(pa)}} \\times \\frac{${B}}{${p10(pb)}} = \\frac{${AB}}{${p10(t)}}$, which is why the decimal places add.`,
        ].join('\n\n'),
      };
    }
    // difficulty 3: dividing by a decimal
    const divisor = rng.pick([
      [2, 10], [3, 10], [4, 10], [5, 10], [6, 10], [7, 10], [8, 10], [9, 10],
      [5, 100], [4, 100], [25, 100], [12, 100], [15, 100], [12, 10], [15, 10], [25, 10],
    ] as const);
    const [bUnits, scale] = divisor;
    const Q = rng.int(3, 40);
    const dividendUnits = Q * bUnits; // in units of 1/scale
    const dividend = clean(dividendUnits / scale);
    const b = clean(bUnits / scale);
    return {
      type: 'numeric',
      prompt: `Work out $${tex(dividend)} \\div ${tex(b)}$.`,
      answer: Q,
      calculator: 'not-allowed',
      hints: ['Make the number you are dividing by a whole number.', `Multiply both numbers by ${scale}. The answer stays the same.`],
      solution: `Multiply both numbers by ${scale} so you divide by a whole number:\n\n$${tex(dividend)} \\div ${tex(b)} = ${tex(dividendUnits)} \\div ${bUnits} = ${Q}$\n\nCheck: $${Q} \\times ${tex(b)} = ${tex(dividend)}$ ✓`,
    };
  },
};

export const knownFact: QuestionTemplate = {
  id: 'm9.num.decimals.known-fact',
  topicId: 'm9.num.decimals',
  title: 'Use a known multiplication fact with decimals',
  difficulties: [4, 5],
  generate({ rng, difficulty }) {
    let A = rng.int(12, 49);
    if (A % 10 === 0) A += 1;
    let B = rng.int(13, 89);
    if (B % 10 === 0) B += 3;
    const P = A * B;
    const fact = `Given that $${A} \\times ${B} = ${tex(P)}$`;
    if (difficulty === 4) {
      // (A × 10^-i) × (B × 10^-j); i may be -1 (A × 10)
      let i = 0;
      let j = 0;
      while (i + j < 1 || i + j > 3) {
        i = rng.int(-1, 2);
        j = rng.int(0, 2);
      }
      const a = clean(A / 10 ** i);
      const b = clean(B / 10 ** j);
      const shift = i + j;
      const answer = clean(P / 10 ** shift);
      const ea = clean((Math.round(A / 10) * 10) / 10 ** i);
      const eb = clean((Math.round(B / 10) * 10) / 10 ** j);
      return {
        type: 'numeric',
        prompt: `${fact}, work out $${tex(a)} \\times ${tex(b)}$.`,
        answer,
        marks: 2,
        calculator: 'not-allowed',
        hints: [
          `Compare $${tex(a)}$ with ${A}, and $${tex(b)}$ with ${B}. How many times bigger or smaller is each?`,
          'Estimate the answer to check the size of your answer.',
        ],
        solution: [
          `${[
            i > 0 ? `$${tex(a)} = ${A} \\div ${10 ** i}$` : i < 0 ? `$${tex(a)} = ${A} \\times 10$` : '',
            j > 0 ? `$${tex(b)} = ${B} \\div ${10 ** j}$` : '',
          ]
            .filter(Boolean)
            .join(' and ')}.`,
          `Altogether the answer is ${num(10 ** shift)} times smaller than ${num(P)}: $${tex(P)} \\div ${10 ** shift} = ${tex(answer)}$.`,
          `Estimate: $${tex(a)} \\times ${tex(b)}$ is roughly $${tex(ea)} \\times ${tex(eb)} = ${tex(clean(ea * eb))}$, so an answer of about this size makes sense.`,
        ].join('\n\n'),
      };
    }
    // difficulty 5: (P ÷ 10^k) ÷ (B ÷ 10^j) = A × 10^(j-k)
    let k = 0;
    let j = 0;
    while ((k === 0 && j === 0) || j - k < -2 || j - k > 1) {
      k = rng.int(0, 3);
      j = rng.int(0, 2);
    }
    const top = clean(P / 10 ** k);
    const bottom = clean(B / 10 ** j);
    const answer = clean(A * 10 ** (j - k));
    const parts: string[] = [`From the fact, $${tex(P)} \\div ${B} = ${A}$.`];
    if (k > 0) parts.push(`$${tex(top)}$ is $${tex(P)} \\div ${10 ** k}$, which makes the answer ${10 ** k} times smaller.`);
    if (j > 0) parts.push(`$${tex(bottom)}$ is $${B} \\div ${10 ** j}$. Dividing by a number ${10 ** j} times smaller makes the answer ${10 ** j} times bigger.`);
    parts.push(`So the answer is $${A}${j > 0 ? ` \\times ${10 ** j}` : ''}${k > 0 ? ` \\div ${10 ** k}` : ''} = ${tex(answer)}$.`);
    parts.push(`Check: $${tex(answer)} \\times ${tex(bottom)} = ${tex(top)}$ ✓`);
    return {
      type: 'numeric',
      prompt: `${fact}, work out $${tex(top)} \\div ${tex(bottom)}$.`,
      answer,
      marks: 3,
      calculator: 'not-allowed',
      hints: [
        `Start from $${tex(P)} \\div ${B} = ${A}$.`,
        'Think about how the number being divided and the number you divide by have changed, and what each change does to the answer.',
      ],
      solution: parts.join('\n\n'),
    };
  },
};

export const rounding: QuestionTemplate = {
  id: 'm9.num.decimals.rounding',
  topicId: 'm9.num.decimals',
  title: 'Round to decimal places and to the nearest cent',
  difficulties: [1, 2],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      const dp = rng.pick([0, 1, 1, 2, 2]);
      for (;;) {
        const X = rng.int(1001, 99999); // thousandths
        if (X % 10 === 0) continue;
        const unit = p10(3 - dp);
        const rem = X % unit;
        const up = rem >= unit / 2;
        const R = (X - rem) / unit + (up ? 1 : 0);
        if (dp > 0 && R % 10 === 0) continue;
        if (dp === 2 && rem === 0) continue;
        const x = clean(X / 1000);
        const answer = clean(R / p10(dp));
        const nextDigit = Math.floor(rem / (unit / 10));
        const target = dp === 0 ? 'the nearest whole number' : places(dp);
        const placeName = ['ones place', 'first decimal place', 'second decimal place'][dp]!;
        return {
          type: 'numeric',
          prompt: `Round $${tex(x)}$ to ${target}.`,
          answer,
          decimals: dp,
          tolerance: 1e-9,
          calculator: 'not-allowed',
          hints: [`Look at the digit just after the ${placeName}.`, 'If that digit is 5 or more, round up. If it is 4 or less, round down.'],
          solution: `The digit after the ${placeName} is ${nextDigit}. ${up ? 'That is 5 or more, so round **up**.' : 'That is 4 or less, so round **down** (the kept digits stay the same).'}\n\n$${tex(x)} \\approx ${tex(answer)}$`,
        };
      }
    }
    // difficulty 2: money to the nearest cent
    if (rng.chance(0.5)) {
      const n = rng.pick([3, 6, 7, 9]);
      let C = rng.int(2000, 15000);
      if (C % n === 0) C += 1;
      const exact = C / n; // cents
      const R = Math.round(exact);
      const answer = clean(R / 100);
      return {
        type: 'numeric',
        prompt: `${n} friends share a restaurant bill of ${cents(C / 100)} equally. How much should each person pay? Give your answer to the nearest cent.`,
        answer,
        units: '$',
        decimals: 2,
        tolerance: 1e-9,
        calculator: 'allowed',
        hints: ['Divide the bill by the number of people.', 'The nearest cent means 2 decimal places.'],
        solution: `$${tex(C / 100, 2)} \\div ${n} ${divResult(C, n * 100, 4)}$\n\nThe third decimal place is ${Math.floor((exact * 10) % 10)}, so round ${R > exact ? 'up' : 'down'}: each person pays **${cents(answer)}**.`,
      };
    }
    let P = rng.int(2400, 3199); // tenths of a cent per litre, e.g. 2879 = $2.879
    if (P % 10 === 0) P += 9;
    let L = rng.int(12, 60);
    if ((P * L) % 10 === 0) L += 1;
    const tenths = P * L;
    const rem = tenths % 10;
    const R = (tenths - rem) / 10 + (rem >= 5 ? 1 : 0);
    const answer = clean(R / 100);
    const name = rng.pick(NAMES);
    return {
      type: 'numeric',
      prompt: `Petrol costs \\$${(P / 1000).toFixed(3)} per litre. ${name} buys ${L} litres. How much does this cost, to the nearest cent?`,
      answer,
      units: '$',
      decimals: 2,
      tolerance: 1e-9,
      calculator: 'allowed',
      hints: ['Multiply the price per litre by the number of litres.', 'The nearest cent means 2 decimal places.'],
      solution: `$${L} \\times ${(P / 1000).toFixed(3)} = ${tex(clean(tenths / 1000))}$\n\nThe third decimal place is ${rem}, so round ${rem >= 5 ? 'up' : 'down'}: the cost is **${cents(answer)}**.`,
    };
  },
};

export const remainders: QuestionTemplate = {
  id: 'm9.num.decimals.remainders',
  topicId: 'm9.num.decimals',
  title: 'Remainders as fractions or decimals, and rounding in context',
  difficulties: [2, 3],
  generate({ rng, difficulty }) {
    if (difficulty === 2) {
      const asFraction = rng.chance(0.5);
      const b = asFraction ? rng.int(3, 12) : rng.pick([4, 5, 8]);
      const q = rng.int(3, 15);
      const r = rng.int(1, b - 1);
      const a = b * q + r;
      const [rn, rd] = simp(r, b);
      if (asFraction) {
        return {
          type: 'numeric',
          prompt: `Write $${a} \\div ${b}$ as a mixed number in simplest form.`,
          answer: a / b,
          form: 'mixed',
          calculator: 'not-allowed',
          hints: [`How many whole times does ${b} go into ${a}? What is left over?`, `The remainder is a fraction of ${b}.`],
          solution: `$${a} \\div ${b} = ${q}$ remainder ${r}.\n\nThe remainder ${r} out of ${b} is $\\frac{${r}}{${b}}${rn !== r ? ` = ${frac(rn, rd)}` : ''}$, so the answer is $${mixed(a, b)}$.`,
        };
      }
      const answer = clean(a / b);
      return {
        type: 'numeric',
        prompt: `Work out $${a} \\div ${b}$, giving your answer as a decimal.`,
        answer,
        calculator: 'not-allowed',
        hints: [`Find the whole-number part and the remainder first.`, `Then write the remainder over ${b} as a decimal.`],
        solution: `$${a} \\div ${b} = ${q}$ remainder ${r}.\n\n$\\frac{${r}}{${b}} = ${tex(clean(r / b))}$, so the answer is $${tex(answer)}$.`,
      };
    }
    // difficulty 3: does the context need rounding up or down?
    const name = rng.pick(NAMES);
    if (rng.chance(0.5)) {
      const cap = rng.pick([24, 30, 36, 40, 45, 50, 53]);
      const q = rng.int(2, 9);
      const s = cap * q + rng.int(1, cap - 1);
      return {
        type: 'numeric',
        prompt: `${s} students are going on a school trip. Each bus can carry ${cap} students. How many buses are needed?`,
        answer: q + 1,
        form: 'integer',
        calculator: 'allowed',
        hints: ['Divide the number of students by the number each bus holds.', 'Can you leave students behind? Think about which way to round.'],
        solution: `$${s} \\div ${cap} ${divResult(s, cap)}$\n\n${q} buses would carry only ${q * cap} students, so ${s - q * cap} students would be left behind. Round **up**: **${q + 1} buses** are needed.`,
      };
    }
    const size = rng.pick([12, 18, 24, 30, 36]);
    const thing = rng.pick([
      { item: 'kiwifruit', box: 'tray', boxes: 'trays' },
      { item: 'eggs', box: 'carton', boxes: 'cartons' },
      { item: 'muffins', box: 'box', boxes: 'boxes' },
      { item: 'apples', box: 'crate', boxes: 'crates' },
    ]);
    const q = rng.int(4, 25);
    const n = size * q + rng.int(2, size - 1);
    return {
      type: 'numeric',
      prompt: `${name} has ${n} ${thing.item} to pack. Each ${thing.box} holds ${size}. How many ${thing.boxes} can be completely filled?`,
      answer: q,
      form: 'integer',
      calculator: 'allowed',
      hints: [`Divide ${n} by ${size}.`, `Only full ${thing.boxes} count. Think about which way to round.`],
      solution: `$${n} \\div ${size} ${divResult(n, size)}$\n\nThe last ${thing.box} would only have ${n - q * size} ${thing.item}, so it isn't full. Round **down**: **${q} ${thing.boxes}** can be filled.`,
    };
  },
};

export const estimation: QuestionTemplate = {
  id: 'm9.num.decimals.estimation',
  topicId: 'm9.num.decimals',
  title: 'Estimate to predict and check answers',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    const offset = (max: number) => rng.int(1, max) * rng.sign();
    if (difficulty === 2) {
      const A = rng.int(2, 9) * 10;
      const B = rng.int(3, 9);
      const aT = A * 10 + offset(18); // tenths
      const bT = B * 10 + offset(3);
      const a = clean(aT / 10);
      const b = clean(bT / 10);
      const est = A * B;
      const exact = clean((aT * bT) / 100);
      const m = mcqFields(
        rng,
        { text: `$${tex(est)}$` },
        [
          { text: `$${tex(est * 10)}$`, feedback: 'This is 10 times too big. Check the size of each rounded number.' },
          { text: `$${tex(clean(est / 10))}$`, feedback: 'This is 10 times too small. Check the size of each rounded number.' },
          { text: `$${tex(A + B)}$`, feedback: 'This adds the rounded numbers instead of multiplying them.' },
          { text: `$${tex((A + 10) * B)}$`, feedback: `Round ${tex(a)} to the nearest 10, which is ${A}.` },
        ],
      );
      return {
        type: 'mcq',
        prompt: `By rounding each number, which is the best estimate of $${tex(a)} \\times ${tex(b)}$?`,
        ...m,
        calculator: 'not-allowed',
        hints: [`Round $${tex(a)}$ to the nearest 10 and $${tex(b)}$ to the nearest whole number.`],
        solution: `$${tex(a)} \\approx ${A}$ and $${tex(b)} \\approx ${B}$, so the estimate is $${A} \\times ${B} = ${tex(est)}$.\n\n(The exact answer is $${tex(exact)}$, which is close.)`,
      };
    }
    if (difficulty === 3) {
      const aH = rng.int(150, 949); // hundredths: 1.50 … 9.49
      const bT = rng.int(150, 949); // tenths: 15.0 … 94.9
      const a = clean(aH / 100);
      const b = clean(bT / 10);
      const exact = clean((aH * bT) / 1000);
      const ra = Math.round(aH / 100);
      const rb = Math.round(bT / 100) * 10;
      const est = ra * rb;
      const scenario = rng.pick(['right', 'big', 'small'] as const);
      const shown = scenario === 'right' ? exact : scenario === 'big' ? clean(exact * 10) : clean(exact / 10);
      const name = rng.pick(NAMES);
      const options = [
        { id: 'a', text: 'Yes, it is about the right size' },
        { id: 'b', text: 'No, it is about 10 times too big' },
        { id: 'c', text: 'No, it is about 10 times too small' },
      ];
      const correct = scenario === 'right' ? 'a' : scenario === 'big' ? 'b' : 'c';
      return {
        type: 'mcq',
        prompt: `${name} used a calculator to work out $${tex(a)} \\times ${tex(b)}$ and wrote down $${tex(shown)}$. Use an estimate to decide whether this answer is reasonable.`,
        options,
        correct,
        shuffle: false,
        calculator: 'not-allowed',
        hints: [`Round $${tex(a)}$ to the nearest whole number and $${tex(b)}$ to the nearest 10.`, `Compare your estimate with ${name}'s answer.`],
        solution: `Estimate: $${ra} \\times ${rb} = ${tex(est)}$.\n\n${scenario === 'right' ? `$${tex(shown)}$ is close to ${num(est)}, so it is reasonable.` : `$${tex(shown)}$ is about 10 times ${scenario === 'big' ? 'bigger' : 'smaller'} than ${num(est)}, so the decimal point is probably in the wrong place.`} The correct answer is $${tex(exact)}$.`,
      };
    }
    // difficulty 4: estimate (a × b) ÷ c
    let A = 20;
    let B = 3;
    let C = 4;
    for (let attempt = 0; attempt < 100; attempt++) {
      A = rng.int(2, 9) * 10;
      B = rng.int(2, 9);
      C = rng.int(2, 9);
      if ((A * B) % C === 0 && C !== B) break;
    }
    const aT = A * 10 + offset(18);
    const bT = B * 10 + offset(3);
    const cT = C * 10 + offset(3);
    const a = clean(aT / 10);
    const b = clean(bT / 10);
    const c = clean(cT / 10);
    const est = (A * B) / C;
    const exact = (aT * bT) / (cT * 10);
    const m = mcqFields(
      rng,
      { text: `$${tex(est)}$` },
      [
        { text: `$${tex(A * B)}$`, feedback: `This is the estimate for the top only. You still need to divide by ${C}.` },
        { text: `$${tex(est * 10)}$`, feedback: 'This is 10 times too big. Check your rounded numbers.' },
        { text: `$${tex(clean(est / 10))}$`, feedback: 'This is 10 times too small. Check your rounded numbers.' },
        { text: `$${tex(est * 100)}$`, feedback: 'This is far too big. Check your rounded numbers.' },
      ],
    );
    return {
      type: 'mcq',
      prompt: `Which is the best estimate of $\\dfrac{${tex(a)} \\times ${tex(b)}}{${tex(c)}}$?`,
      ...m,
      calculator: 'not-allowed',
      hints: [`Round $${tex(a)}$ to the nearest 10, and the other two numbers to the nearest whole number.`, 'Work out the top first, then divide.'],
      solution: `$${tex(a)} \\approx ${A}$, $${tex(b)} \\approx ${B}$ and $${tex(c)} \\approx ${C}$.\n\nEstimate: $\\dfrac{${A} \\times ${B}}{${C}} = \\dfrac{${A * B}}{${C}} = ${tex(est)}$.\n\n(The exact answer is about $${num(exact, 1)}$.)`,
    };
  },
};
