import type { QuestionTemplate } from '../../../types';
import { gcd, NAMES, num, tex } from '../../../format';
import { decimalExpansion, f, fromUnits, isTerminating, listAnd, mcqFields, partsName, properFraction, roundUnits } from './fractions-helpers';

// m7.num.decimals — add and subtract decimals, multiply and divide by powers of 10, multiply decimals
// by whole numbers, convert fractions to terminating or recurring decimals, and round decimals.
// Numbers are built as whole counts of tenths, hundredths or thousandths, so answers are exact.

const NA = 'not-allowed' as const;
/** For rounding questions: only the correctly rounded value counts (not the unrounded one). */
const EXACT = 1e-9;

/** Decimal places in a short decimal (up to 6). */
function dpOf(x: number): number {
  const s = String(x);
  const i = s.indexOf('.');
  return i === -1 ? 0 : s.length - i - 1;
}

/** Pads a decimal with zeros to `dp` places, for lining up: (5.4, 2) → "5.40". */
function padded(x: number, dp: number): string {
  return x.toFixed(dp);
}

/** Thousandths count → exact decimal. */
const th = (n: number) => fromUnits(n, 3);

export const addSubtract: QuestionTemplate = {
  id: 'm7.num.decimals.add-subtract',
  topicId: 'm7.num.decimals',
  title: 'Add and subtract decimals',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    if (difficulty === 1 || difficulty === 2) {
      let a: number;
      let b: number;
      let op = rng.pick(['+', '-'] as const);
      if (difficulty === 1) {
        a = rng.int(11, 199) * 100; // tenths, stored in thousandths
        b = rng.int(11, 99) * 100;
      } else {
        const kind = rng.pick(['twoOne', 'twoOne', 'fromWhole'] as const);
        if (kind === 'fromWhole') {
          a = rng.int(3, 20) * 1000;
          b = rng.int(101, Math.min(a / 10 - 1, 999)) * 10;
          op = '-';
        } else {
          a = rng.int(101, 999) * 10; // hundredths
          b = rng.int(11, 99) * 100; // tenths
          if (rng.chance(0.5)) [a, b] = [b, a];
        }
      }
      if (op === '-' && a < b) [a, b] = [b, a];
      if (a === b) op = '+';
      const x = th(a);
      const y = th(b);
      const ans = th(op === '+' ? a + b : a - b);
      const dp = Math.max(dpOf(x), dpOf(y));
      const sameDp = dpOf(x) === dpOf(y);
      return {
        type: 'numeric',
        prompt: `Work out $${tex(x)} ${op} ${tex(y)}$.`,
        answer: ans,
        calculator: NA,
        hints: [
          'Line up the decimal points, so tenths are under tenths and hundredths are under hundredths.',
          sameDp ? `Work from the right. Remember to ${op === '+' ? 'carry' : 'regroup (borrow)'} if you need to.` : 'Fill any empty places with zeros so both numbers have the same number of decimal places.',
        ],
        solution: `${sameDp ? 'Line up the decimal points' : `Line up the decimal points and fill the gaps with zeros: ${padded(x, dp)} and ${padded(y, dp)}`}.\n\n$$\\begin{array}{r} ${padded(x, dp)} \\\\ ${op === '+' ? '+' : '-'}\\; ${padded(y, dp)} \\\\ \\hline ${padded(ans, dp)} \\end{array}$$\n\nSo $${tex(x)} ${op} ${tex(y)} = ${tex(ans)}$.`,
      };
    }
    // difficulty 3: word problems
    const name = rng.pick(NAMES);
    const kind = rng.pick(['jug', 'jump', 'flour', 'sprint'] as const);
    if (kind === 'jug' || kind === 'flour') {
      const total = kind === 'jug' ? rng.int(2, 3) * 1000 : rng.int(3, 6) * 250;
      const a = kind === 'jug' ? rng.int(3, 9) * 125 : rng.int(4, 12) * 25;
      const b = kind === 'jug' ? rng.int(2, 6) * 50 : rng.int(4, 16) * 20;
      if (a + b >= total) {
        return addSubtract.generate({ rng, difficulty });
      }
      const left = total - a - b;
      const unit = kind === 'jug' ? 'L' : 'kg';
      const prompt =
        kind === 'jug'
          ? `A jug holds ${num(th(total))} L of water. ${name} pours out ${num(th(a))} L to water the vege garden, then ${num(th(b))} L for the dog. How much water is left in the jug?`
          : `A bag holds ${num(th(total))} kg of flour. ${name} uses ${num(th(a))} kg to make bread and ${num(th(b))} kg to make pancakes. How much flour is left?`;
      return {
        type: 'numeric',
        prompt,
        answer: th(left),
        units: unit,
        marks: 2,
        calculator: NA,
        hints: ['First add the two amounts that were used.', 'Then subtract that from the starting amount. Line up the decimal points and fill gaps with zeros.'],
        solution: `Used: $${tex(th(a))} + ${tex(th(b))} = ${tex(th(a + b))}$ ${unit}.\n\nLeft: $${tex(th(total))} - ${tex(th(a + b))} = ${tex(th(left))}$ ${unit}.\n\n(Write ${num(th(total))} as ${padded(th(total), 3)} so the places line up.)`,
      };
    }
    if (kind === 'jump') {
      const other = rng.pick(NAMES.filter((n) => n !== name));
      const a = rng.int(250, 420) * 10;
      const b = rng.int(20, 36) * 100;
      const [hi, lo, hiName, loName] = a > b ? [a, b, name, other] : [b, a, other, name];
      if (hi === lo) return addSubtract.generate({ rng, difficulty });
      return {
        type: 'numeric',
        prompt: `At the school athletics day, ${name} jumps ${num(th(a))} m in the long jump and ${other} jumps ${num(th(b))} m. How much further does ${hiName} jump than ${loName}?`,
        answer: th(hi - lo),
        units: 'm',
        marks: 2,
        calculator: NA,
        hints: ['"How much further" means find the difference: subtract.', 'Line up the decimal points. Fill an empty place with a zero.'],
        solution: `$${padded(th(hi), 2)} - ${padded(th(lo), 2)} = ${tex(th(hi - lo))}$\n\n${hiName} jumps ${num(th(hi - lo))} m further.`,
      };
    }
    const other = rng.pick(NAMES.filter((n) => n !== name));
    const a = rng.int(1350, 1690) * 10;
    let b = rng.int(135, 169) * 100;
    if (b === a) b += 100;
    const [fast, slow, fastName] = a < b ? [a, b, name] : [b, a, other];
    return {
      type: 'numeric',
      prompt: `In the 100 m sprint, ${name} runs it in ${num(th(a))} seconds and ${other} runs it in ${num(th(b))} seconds. How many seconds faster is ${fastName}?`,
      answer: th(slow - fast),
      units: 's',
      marks: 2,
      calculator: NA,
      hints: ['The faster runner has the smaller time. Find the difference.', 'Line up the decimal points and fill any gap with a zero.'],
      solution: `$${padded(th(slow), 2)} - ${padded(th(fast), 2)} = ${tex(th(slow - fast))}$\n\n${fastName} is ${num(th(slow - fast))} seconds faster.`,
    };
  },
};

/** x × 10^p exactly, where x has `dp` decimal places and is given as an integer count m (x = m / 10^dp). */
function scaled(m: number, dp: number, p: number): number {
  const e = p - dp;
  return e >= 0 ? m * 10 ** e : fromUnits(m, -e);
}

const POW_WORD: Record<number, string> = { 1: '10', 2: '100', 3: '1000' };
const POW_TEX: Record<number, string> = { 1: '10', 2: '100', 3: '1000' };

export const powersOfTen: QuestionTemplate = {
  id: 'm7.num.decimals.powers-of-ten',
  topicId: 'm7.num.decimals',
  title: 'Multiply and divide by powers of 10',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    // x = m / 10^dp
    const dp = difficulty === 1 ? rng.int(0, 1) : rng.int(1, 2);
    let m = difficulty === 1 ? rng.int(12, 99) : rng.int(11, 999);
    if (m % 10 === 0) m += rng.int(1, 9);
    const x = fromUnits(m, dp);
    const p = difficulty === 1 ? rng.int(1, 2) : rng.int(1, 3);
    const times = rng.chance(0.5);
    const result = times ? scaled(m, dp, p) : scaled(m, dp, -p);
    const usePower = difficulty >= 2 && rng.chance(0.4);
    const pTex = usePower ? `10^${p}` : POW_TEX[p]!;
    const opTex = times ? '\\times' : '\\div';
    const moveText = `${times ? 'Multiplying' : 'Dividing'} by ${POW_WORD[p]} makes the number ${POW_WORD[p]} times ${times ? 'bigger' : 'smaller'}. Every digit moves ${p} place${p > 1 ? 's' : ''} to the ${times ? 'left' : 'right'}.`;
    const powerNote = usePower ? `$10^${p} = ${POW_WORD[p]}$.\n\n` : '';
    if (difficulty === 3) {
      // Missing number.
      const kind = rng.pick(['power', 'start'] as const);
      if (kind === 'power') {
        return {
          type: 'numeric',
          prompt: `Find the missing number: $${tex(x)} ${opTex} \\square = ${tex(result)}$`,
          answer: 10 ** p,
          form: 'integer',
          calculator: NA,
          hints: [`Compare the digits. Have they moved to the left or to the right?`, 'Count how many places the digits have moved. Each place is a factor of 10.'],
          solution: `The digits have moved ${p} place${p > 1 ? 's' : ''} to the ${times ? 'left' : 'right'}, so the number has been ${times ? 'multiplied' : 'divided'} by ${POW_WORD[p]}.\n\n$${tex(x)} ${opTex} ${POW_WORD[p]} = ${tex(result)}$`,
        };
      }
      return {
        type: 'numeric',
        prompt: `Find the missing number: $\\square ${opTex} ${pTex} = ${tex(result)}$`,
        answer: x,
        calculator: NA,
        hints: ['Work backwards: do the opposite operation.', `The opposite of ${times ? 'multiplying' : 'dividing'} by ${POW_WORD[p]} is ${times ? 'dividing' : 'multiplying'} by ${POW_WORD[p]}.`],
        solution: `${powerNote}Undo it: $${tex(result)} ${times ? '\\div' : '\\times'} ${POW_WORD[p]} = ${tex(x)}$.\n\nCheck: $${tex(x)} ${opTex} ${POW_WORD[p]} = ${tex(result)}$ ✓`,
      };
    }
    return {
      type: 'numeric',
      prompt: `Work out $${tex(x)} ${opTex} ${pTex}$.`,
      answer: result,
      calculator: NA,
      hints: [
        `Will the answer be bigger or smaller than ${num(x)}?`,
        `${times ? 'Multiplying' : 'Dividing'} by ${POW_WORD[p]} moves every digit ${p} place${p > 1 ? 's' : ''}. Use zeros to fill empty places.`,
      ],
      solution: `${powerNote}${moveText}\n\n$${tex(x)} ${opTex} ${POW_WORD[p]} = ${tex(result)}$`,
    };
  },
};

interface MultStory {
  text: (name: string, n: number, x: string) => string;
  units: string;
  /** Amounts as [count, decimal places]: [25, 3] is 0.025. */
  amounts: Array<[number, number]>;
  counts: [number, number];
}

const MULT_STORIES: MultStory[] = [
  {
    text: (name: string, n: number, x: string) => `Each muffin needs ${x} kg of flour. ${name} makes ${n} muffins for the school bake sale. How much flour does ${name} need?`,
    units: 'kg',
    amounts: [[4, 2], [5, 2], [6, 2], [8, 2]],
    counts: [6, 24],
  },
  {
    text: (name: string, n: number, x: string) => `One length of the school pool is ${x} km. ${name} swims ${n} lengths. How far does ${name} swim?`,
    units: 'km',
    amounts: [[25, 3], [5, 2]],
    counts: [4, 20],
  },
  {
    text: (name: string, n: number, x: string) => `A bottle holds ${x} L of water. ${name} fills ${n} bottles for the class trip. How much water is that?`,
    units: 'L',
    amounts: [[6, 1], [75, 2], [15, 1], [35, 2], [8, 1]],
    counts: [4, 12],
  },
];

export const multiplyWhole: QuestionTemplate = {
  id: 'm7.num.decimals.multiply-whole',
  topicId: 'm7.num.decimals',
  title: 'Multiply decimals by whole numbers',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    if (difficulty === 2) {
      const a = rng.int(2, 9);
      const n = rng.int(2, 9);
      const dp = rng.chance(0.7) ? 1 : 2;
      const x = fromUnits(a, dp);
      const ans = fromUnits(a * n, dp);
      return {
        type: 'numeric',
        prompt: `Work out $${tex(x)} \\times ${n}$.`,
        answer: ans,
        calculator: NA,
        hints: [`Start with the fact $${a} \\times ${n}$.`, `$${tex(x)}$ is ${a} ${dp === 1 ? 'tenths' : 'hundredths'}. So the answer is that many ${dp === 1 ? 'tenths' : 'hundredths'}.`],
        solution: `$${a} \\times ${n} = ${a * n}$.\n\n$${tex(x)}$ is ${a} ${dp === 1 ? 'tenths' : 'hundredths'}, so $${tex(x)} \\times ${n}$ is ${a * n} ${dp === 1 ? 'tenths' : 'hundredths'} $= ${tex(ans)}$.\n\nEstimate to check: $${tex(x)}$ is less than 1, so the answer is less than ${n}.`,
      };
    }
    if (difficulty === 3) {
      if (rng.chance(0.5)) {
        // 0.7 × 50 type: decimal × multiple of 10 or 100
        const a = rng.int(2, 9);
        const dp = rng.chance(0.7) ? 1 : 2;
        const k = rng.int(2, 9);
        const z = rng.int(1, 2);
        const n = k * 10 ** z;
        const x = fromUnits(a, dp);
        const ans = scaled(a * k, dp, z);
        return {
          type: 'numeric',
          prompt: `Work out $${tex(x)} \\times ${tex(n)}$.`,
          answer: ans,
          calculator: NA,
          hints: [`Start with the fact $${a} \\times ${k}$.`, `Then think about the place value: $${tex(n)} = ${k} \\times ${10 ** z}$.`],
          solution: `$${tex(x)} \\times ${k} = ${tex(fromUnits(a * k, dp))}$ (because $${a} \\times ${k} = ${a * k}$).\n\nThen multiply by ${10 ** z}: $${tex(fromUnits(a * k, dp))} \\times ${10 ** z} = ${tex(ans)}$.\n\nSo $${tex(x)} \\times ${tex(n)} = ${tex(ans)}$.`,
        };
      }
      // 2.6 × 4 type
      const m = rng.int(11, 99);
      const mm = m % 10 === 0 ? m + 1 : m;
      const n = rng.int(3, 9);
      const x = fromUnits(mm, 1);
      const whole = Math.floor(mm / 10);
      const tenths = mm % 10;
      const ans = fromUnits(mm * n, 1);
      return {
        type: 'numeric',
        prompt: `Work out $${tex(x)} \\times ${n}$.`,
        answer: ans,
        calculator: NA,
        hints: [`Split $${tex(x)}$ into ${whole} and $${tex(fromUnits(tenths, 1))}$.`, `Multiply each part by ${n}, then add.`],
        solution: `$${tex(x)} = ${whole} + ${tex(fromUnits(tenths, 1))}$.\n\n$${whole} \\times ${n} = ${whole * n}$ and $${tex(fromUnits(tenths, 1))} \\times ${n} = ${tex(fromUnits(tenths * n, 1))}$.\n\n$${whole * n} + ${tex(fromUnits(tenths * n, 1))} = ${tex(ans)}$`,
      };
    }
    // difficulty 4: use a known fact, or a word problem
    if (rng.chance(0.5)) {
      const a = rng.int(12, 49);
      const b = rng.int(3, 9);
      const prod = a * b;
      const kind = rng.pick(['d1z1', 'd2', 'd1z2', 'd2z1'] as const);
      const [dp, z] = kind === 'd1z1' ? [1, 1] : kind === 'd2' ? [2, 0] : kind === 'd1z2' ? [1, 2] : [2, 1];
      const x = fromUnits(a, dp);
      const n = b * 10 ** z;
      const ans = scaled(prod, dp, z);
      return {
        type: 'numeric',
        prompt: `You know that $${a} \\times ${b} = ${prod}$. Use this to work out $${tex(x)} \\times ${tex(n)}$.`,
        answer: ans,
        marks: 2,
        calculator: NA,
        hints: [`How is $${tex(x)}$ related to ${a}? How is ${tex(n)} related to ${b}?`, 'Adjust the answer to the fact by the same powers of 10.'],
        solution: `$${tex(x)} = ${a} \\div ${10 ** dp}$${z > 0 ? ` and $${tex(n)} = ${b} \\times ${10 ** z}$` : ''}.\n\nSo the answer is $${prod} \\div ${10 ** dp}${z > 0 ? ` \\times ${10 ** z}` : ''} = ${tex(ans)}$.`,
      };
    }
    const s = rng.pick(MULT_STORIES);
    const name = rng.pick(NAMES);
    const [a, dp] = rng.pick(s.amounts);
    const n = rng.int(s.counts[0], s.counts[1]);
    const x = fromUnits(a, dp);
    const ans = fromUnits(a * n, dp);
    const unitWord = dp === 1 ? 'tenths' : dp === 2 ? 'hundredths' : 'thousandths';
    return {
      type: 'numeric',
      prompt: s.text(name, n, num(x)),
      answer: ans,
      units: s.units,
      marks: 2,
      calculator: NA,
      hints: ['The same amount is repeated, so multiply.', `Work out $${a} \\times ${n}$ first, then think about the place value.`],
      solution: `$${tex(x)} \\times ${n}$: start with $${a} \\times ${n} = ${a * n}$.\n\n$${tex(x)}$ is ${a} ${unitWord}, so the answer is ${a * n} ${unitWord} $= ${tex(ans)}$ ${s.units}.`,
    };
  },
};

/** Short-division steps for n ÷ d to `places` decimal places, as a sentence. */
function divisionSteps(n: number, d: number, places: number): string {
  const whole = Math.floor(n / d);
  let r = n % d;
  const steps: string[] = [`${d} goes into ${n} ${whole === 0 ? 'zero' : whole} time${whole === 1 ? '' : 's'}${r ? `, remainder ${r}` : ''}`];
  for (let i = 0; i < places && r !== 0; i++) {
    const t = r * 10;
    const q = Math.floor(t / d);
    r = t % d;
    steps.push(`${d} into ${t} goes ${q}${r ? `, remainder ${r}` : ''}`);
  }
  return steps.join('; ');
}

export const fractionToDecimal: QuestionTemplate = {
  id: 'm7.num.decimals.fraction-to-decimal',
  topicId: 'm7.num.decimals',
  title: 'Fractions to terminating and recurring decimals',
  difficulties: [2, 3, 4, 5],
  generate({ rng, difficulty }) {
    if (difficulty === 2) {
      const [n, d] = properFraction(rng, [2, 4, 5, 10, 20, 25, 50]);
      const k = 100 / d;
      return {
        type: 'numeric',
        prompt: `Write $${f(n, d)}$ as a decimal.`,
        answer: fromUnits(n * k, 2),
        form: 'decimal',
        calculator: NA,
        hints: ['Can you make an equivalent fraction with a denominator of 10 or 100?', `What do you multiply ${d} by to get 100?`],
        solution: `$${d} \\times ${k} = 100$, so multiply the top and bottom by ${k}:\n\n$${f(n, d)} = ${f(n * k, 100)} = ${tex(fromUnits(n * k, 2))}$`,
      };
    }
    if (difficulty === 3) {
      let n: number;
      let d: number;
      if (rng.chance(0.25)) {
        d = 8;
        n = rng.pick([9, 11, 13, 15, 17, 19, 21]);
      } else {
        [n, d] = properFraction(rng, [8, 16, 40]);
      }
      const value = n / d;
      const places = dpOf(Number.parseFloat(value.toFixed(6)));
      return {
        type: 'numeric',
        prompt: `Write $${f(n, d)}$ as a decimal.`,
        answer: Number.parseFloat(value.toFixed(6)),
        form: 'decimal',
        calculator: NA,
        hints: [`A fraction is a division: $${f(n, d)} = ${n} \\div ${d}$.`, `Write ${n} as ${n}.0000 and use short division.`],
        solution: `$${f(n, d)} = ${n} \\div ${d}$.\n\nShort division: ${divisionSteps(n, d, places)}.\n\nSo $${f(n, d)} = ${tex(Number.parseFloat(value.toFixed(6)))}$. The division stops, so this is a **terminating decimal**.`,
      };
    }
    if (difficulty === 4) {
      let n = 1;
      let d = 3;
      for (;;) {
        d = rng.pick([3, 6, 7, 9, 11, 12, 15]);
        n = rng.int(1, d === 3 ? 8 : d - 1);
        if (gcd(n, d) === 1 && !isTerminating(n, d)) break;
      }
      const dp = rng.chance(0.75) ? 2 : 1;
      const truncated = Math.floor((n * 10 ** (dp + 1)) / d);
      const ans = fromUnits(roundUnits(truncated, 10), dp);
      const expansion = decimalExpansion(n, d, 6);
      const next = truncated % 10;
      return {
        type: 'numeric',
        prompt: `Write $${f(n, d)}$ as a decimal, rounded to ${dp} decimal place${dp > 1 ? 's' : ''}.`,
        answer: ans,
        decimals: dp,
        tolerance: EXACT,
        calculator: NA,
        hints: [`Work out $${n} \\div ${d}$ using short division. Keep going for at least ${dp + 1} decimal places.`, `Then round: look at the digit after the ${dp === 1 ? 'tenths' : 'hundredths'} place.`],
        solution: `$${n} \\div ${d} = ${expansion.replace('…', '\\ldots')}$\n\nThe digits keep going in a repeating pattern, so this is a **recurring decimal**.\n\nTo ${dp} decimal place${dp > 1 ? 's' : ''}: the next digit is ${next}, which is ${next >= 5 ? '5 or more, so round up' : 'less than 5, so round down'}. The answer is $${ans.toFixed(dp)}$.`,
      };
    }
    // difficulty 5
    if (rng.chance(0.5)) {
      // Which digit repeats?
      let n = 1;
      let d = 3;
      for (;;) {
        d = rng.pick([3, 6, 9, 12, 15]);
        n = rng.int(1, d === 3 ? 7 : d - 1);
        if (gcd(n, d) === 1) break;
      }
      const expansion = decimalExpansion(n, d, 8);
      const digit = Number(expansion.replace('…', '').slice(-1));
      return {
        type: 'numeric',
        prompt: `Write $${f(n, d)}$ as a decimal. It is a recurring decimal. Which digit repeats forever?`,
        answer: digit,
        form: 'integer',
        calculator: NA,
        hints: [`Work out $${n} \\div ${d}$ using short division.`, 'Keep dividing until you see the same remainder come back again.'],
        solution: `Short division: ${divisionSteps(n, d, 4)}, …\n\nThe same remainder keeps coming back, so the same digit keeps repeating: $${f(n, d)} = ${expansion.replace('…', '\\ldots')}$\n\nThe digit that repeats is **${digit}**.`,
      };
    }
    const term = rng.sample([[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 8], [5, 8], [7, 10], [9, 20], [7, 25], [3, 16], [11, 40]] as const, 3);
    const rec = rng.pick([[1, 3], [2, 3], [1, 6], [5, 6], [2, 9], [4, 9], [5, 12], [7, 12], [1, 7], [3, 11], [4, 15]] as const);
    const show = (fr: readonly [number, number]) => `$${f(fr[0], fr[1])}$`;
    const mcq = mcqFields(
      rng,
      { text: show(rec) },
      term.map((fr) => ({
        text: show(fr),
        feedback: `$${f(fr[0], fr[1])} = ${tex(fr[0] / fr[1])}$. The division stops, so it is a terminating decimal.`,
      })),
    );
    const listed = rng.shuffle([rec, ...term]).map(show);
    return {
      type: 'mcq',
      ...mcq,
      prompt: `Which one of ${listAnd(listed)} is a **recurring** decimal?`,
      marks: 2,
      calculator: NA,
      hints: ['Turn each fraction into a decimal by dividing the numerator by the denominator.', 'A recurring decimal never stops. The same digits keep repeating.'],
      solution: `${term.map((fr) => `$${f(fr[0], fr[1])} = ${tex(fr[0] / fr[1])}$`).join(', ')}: these all stop (terminate).\n\n$${f(rec[0], rec[1])} = ${decimalExpansion(rec[0], rec[1], 6).replace('…', '\\ldots')}$ never stops, so it is the **recurring** decimal.\n\n**Tip:** fractions whose denominator (in simplest form) can be built from only 2s and 5s, like ${partsName(8)} or ${partsName(20)}, always terminate.`,
    };
  },
};

const ROUND_CONTEXTS = [
  (x: string) => `A sack of kūmara weighs ${x} kg. Round this to`,
  (x: string, name: string) => `${name}'s time for one length of the pool was ${x} seconds. Round this to`,
  (x: string) => `A piece of timber is ${x} m long. Round this to`,
] as const;

export const rounding: QuestionTemplate = {
  id: 'm7.num.decimals.rounding',
  topicId: 'm7.num.decimals',
  title: 'Round decimals to the nearest whole number, tenth or hundredth',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    // Build x as a count of 10^-dp units, then round to `to` decimal places.
    const to = difficulty - 1; // 0 = whole number, 1 = tenth, 2 = hundredth
    const dp = to + rng.int(1, 2);
    let m = rng.int(10 ** dp, 30 * 10 ** dp);
    // Sometimes force a rounding-up across a 9 (e.g. 5.96 → 6.0).
    if (rng.chance(0.2) && to > 0) {
      const unit = 10 ** (dp - to);
      m = Math.floor(m / (unit * 10)) * unit * 10 + 9 * unit + rng.int(Math.ceil(unit / 2), unit - 1);
    }
    if (m % 10 === 0) m += rng.int(1, 9);
    const x = fromUnits(m, dp);
    const step = 10 ** (dp - to);
    const ans = fromUnits(roundUnits(m, step), to);
    const next = Math.floor((m % step) / 10 ** (dp - to - 1));
    const placeWord = to === 0 ? 'the nearest whole number' : to === 1 ? 'the nearest tenth (1 decimal place)' : 'the nearest hundredth (2 decimal places)';
    const keepWord = to === 0 ? 'ones' : to === 1 ? 'tenths' : 'hundredths';
    const nextWord = to === 0 ? 'tenths' : to === 1 ? 'hundredths' : 'thousandths';
    const ctx = rng.chance(0.35) ? rng.pick(ROUND_CONTEXTS) : null;
    const prompt = ctx ? `${ctx(num(x), rng.pick(NAMES))} ${placeWord}.` : `Round $${tex(x)}$ to ${placeWord}.`;
    const ansText = to === 0 ? tex(ans) : ans.toFixed(to);
    return {
      type: 'numeric',
      prompt,
      answer: ans,
      ...(to > 0 ? { decimals: to } : {}),
      tolerance: EXACT,
      calculator: NA,
      hints: [`Find the ${keepWord} digit. Then look at the next digit to the right (the ${nextWord} digit).`, 'If that next digit is 5 or more, round up. If it is 4 or less, round down.'],
      solution: `The ${nextWord} digit is ${next}. ${next >= 5 ? 'It is 5 or more, so round **up**.' : 'It is 4 or less, so round **down** (the kept digits stay the same).'}\n\n$${tex(x)} \\approx ${ansText}$${to > 0 && /0$/.test(ansText) ? `\n\nKeep the zero at the end: it shows the answer is rounded to ${to} decimal place${to > 1 ? 's' : ''}.` : ''}`,
    };
  },
};

export const templates: QuestionTemplate[] = [addSubtract, powersOfTen, multiplyWhole, fractionToDecimal, rounding];


