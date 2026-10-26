import type { QuestionTemplate } from '../../../types';
import { gcd, lcm, NAMES, num, tex } from '../../../format';
import type { Rng } from '../../../../rng';

// m7.num.primes-factors — factors and multiples, primes and composites, divisibility rules, HCF and LCM.
// Year 7: HCF of two numbers under 100 and LCM of two numbers under 10, found by listing.
// Prime factorisation is Year 8, so it isn't used here. No calculators.

const TOPIC = 'm7.num.primes-factors';

function factorsOf(n: number): number[] {
  const out: number[] = [];
  for (let i = 1; i <= n; i++) if (n % i === 0) out.push(i);
  return out;
}

const isPrime = (n: number) => n > 1 && factorsOf(n).length === 2;

const PRIMES_TO_100 = Array.from({ length: 100 }, (_, i) => i + 1).filter(isPrime);

/** Odd composites that are often mistaken for primes. */
const LOOKALIKES = [21, 27, 33, 39, 49, 51, 57, 63, 69, 77, 81, 87, 91, 93, 99] as const;

/** "51 = 3 × 17" using the smallest factor bigger than 1. */
function splitText(n: number): string {
  const f = factorsOf(n).find((x) => x > 1 && x < n)!;
  return `${n} = ${f} × ${n / f}`;
}

/** Factor pairs as text: "1 × 36, 2 × 18, 3 × 12, 4 × 9, 6 × 6". */
function factorPairs(n: number): string {
  const pairs: string[] = [];
  for (let i = 1; i * i <= n; i++) if (n % i === 0) pairs.push(`${i} × ${n / i}`);
  return pairs.join(', ');
}

const multiplesTo = (k: number, limit: number) => Array.from({ length: Math.floor(limit / k) }, (_, i) => k * (i + 1));

const digitSum = (n: number) =>
  String(n)
    .split('')
    .reduce((s, d) => s + Number(d), 0);

/** Why n is or isn't divisible by d, using the divisibility rule. */
function ruleReason(n: number, d: number): string {
  const yes = n % d === 0;
  const s = String(n);
  const last = Number(s.slice(-1));
  const last2 = n % 100;
  const last3 = n % 1000;
  const ds = digitSum(n);
  switch (d) {
    case 2:
      return yes ? `${num(n)} ends in ${last}, an even digit.` : `${num(n)} ends in ${last}, which is odd.`;
    case 5:
      return yes ? `${num(n)} ends in ${last}.` : `${num(n)} ends in ${last}. A number divisible by 5 ends in 0 or 5.`;
    case 10:
      return yes ? `${num(n)} ends in 0.` : `${num(n)} ends in ${last}. A number divisible by 10 ends in 0.`;
    case 3:
    case 9:
      return yes
        ? `The digits of ${num(n)} add to ${ds}, and ${ds} is a multiple of ${d}.`
        : `The digits of ${num(n)} add to ${ds}, and ${ds} is not a multiple of ${d}.`;
    case 4:
      return yes
        ? `The last two digits make ${last2}, and ${last2} is divisible by 4.`
        : `The last two digits make ${last2}, and ${last2} is not divisible by 4.`;
    case 8:
      return yes
        ? `The last three digits make ${last3}, and ${last3} is divisible by 8.`
        : `The last three digits make ${last3}, and ${last3} is not divisible by 8.`;
    case 6: {
      const even = n % 2 === 0;
      if (yes) return `${num(n)} is even, and its digits add to ${ds}, a multiple of 3.`;
      if (!even) return `${num(n)} is odd, so it can't be divisible by 6.`;
      return `${num(n)} is even, but its digits add to ${ds}, which is not a multiple of 3.`;
    }
    default:
      return '';
  }
}

const RULE_TEXT: Record<number, string> = {
  2: 'A number is divisible by 2 if its last digit is even (0, 2, 4, 6 or 8).',
  3: 'A number is divisible by 3 if its digits add to a multiple of 3.',
  4: 'A number is divisible by 4 if its last two digits make a number divisible by 4.',
  5: 'A number is divisible by 5 if its last digit is 0 or 5.',
  6: 'A number is divisible by 6 if it is even **and** its digits add to a multiple of 3.',
  8: 'A number is divisible by 8 if its last three digits make a number divisible by 8.',
  9: 'A number is divisible by 9 if its digits add to a multiple of 9.',
  10: 'A number is divisible by 10 if its last digit is 0.',
};

/** Picks a random number in [lo, hi] that passes the test. */
function pickWhere(rng: Rng, lo: number, hi: number, test: (n: number) => boolean): number {
  for (let attempt = 0; attempt < 500; attempt++) {
    const n = rng.int(lo, hi);
    if (test(n)) return n;
  }
  for (let n = lo; n <= hi; n++) if (test(n)) return n;
  throw new Error('pickWhere: no number found');
}

/** Option ids a, b, c, … assigned in ascending order of value, so ids never hint at the answer. */
function numberOptions(values: number[]): Array<{ id: string; text: string; value: number }> {
  return [...values].sort((x, y) => x - y).map((v, i) => ({ id: String.fromCharCode(97 + i), text: num(v), value: v }));
}

/** The candidate numbers spaced out on one line, e.g. "$21 \quad 37 \quad 51 \quad 87$". */
const listLine = (values: number[]) => `$${values.map((v) => tex(v)).join(' \\qquad ')}$`;

const COMPOSITE_LIST = [12, 16, 18, 20, 24, 28, 30, 32, 36, 40, 42, 44, 45, 48, 50, 52, 54, 56, 60, 63, 64, 72] as const;

export const factorsMultiples: QuestionTemplate = {
  id: `${TOPIC}.factors-multiples`,
  topicId: TOPIC,
  title: 'Factors and multiples',
  difficulties: [1, 2],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      if (rng.chance(0.5)) {
        const n = rng.pick(COMPOSITE_LIST);
        const fs = factorsOf(n).filter((f) => f > 1 && f < n);
        const f = rng.pick(fs);
        const multiple = n * rng.int(2, 3);
        const nonFactors = rng.sample(
          Array.from({ length: 11 }, (_, i) => i + 2).filter((x) => n % x !== 0),
          2,
        );
        const opts = numberOptions([f, multiple, ...nonFactors]);
        const correct = opts.find((o) => o.value === f)!.id;
        const feedback: Record<string, string> = {};
        for (const o of opts) {
          if (o.value === multiple) feedback[o.id] = `${num(multiple)} is a **multiple** of ${n} ($${n} \\times ${multiple / n}$), not a factor. Factors of ${n} are never bigger than ${n}.`;
          else if (o.value !== f) feedback[o.id] = `${o.value} does not divide into ${n} exactly: $${n} \\div ${o.value}$ leaves a remainder.`;
        }
        return {
          type: 'mcq',
          prompt: `Which of these numbers is a **factor** of ${n}?`,
          options: opts.map(({ id, text }) => ({ id, text })),
          correct,
          feedback,
          calculator: 'not-allowed',
          hints: [`A factor of ${n} divides into ${n} exactly, with no remainder.`, `Try dividing ${n} by each number.`],
          solution: `$${n} \\div ${f} = ${n / f}$ exactly, so ${f} is a factor of ${n}.\n\nThe factor pairs of ${n} are ${factorPairs(n)}.`,
        };
      }
      const k = rng.int(3, 12);
      const j = rng.int(3, 12);
      const m = k * j;
      const near = Array.from({ length: 2 * k - 1 }, (_, i) => m - k + 1 + i).filter((x) => x !== m && x % k !== 0);
      const distractors = rng.sample(near, 3);
      const opts = numberOptions([m, ...distractors]);
      const correct = opts.find((o) => o.value === m)!.id;
      const feedback: Record<string, string> = {};
      for (const o of opts) {
        if (o.value !== m) feedback[o.id] = `${o.value} is not in the ${k} times table: $${o.value} \\div ${k}$ leaves a remainder of ${o.value % k}.`;
      }
      return {
        type: 'mcq',
        prompt: `Which of these numbers is a **multiple** of ${k}?`,
        options: opts.map(({ id, text }) => ({ id, text })),
        correct,
        feedback,
        calculator: 'not-allowed',
        hints: [`Multiples of ${k} are the numbers in the ${k} times table.`, `Which number can be divided by ${k} with no remainder?`],
        solution: `$${k} \\times ${j} = ${m}$, so ${m} is a multiple of ${k}.\n\nThe other numbers are not in the ${k} times table.`,
      };
    }

    // difficulty 2
    const n = rng.pick(COMPOSITE_LIST);
    const fs = factorsOf(n);
    if (rng.chance(0.5)) {
      return {
        type: 'numeric',
        prompt: `How many factors does ${n} have?`,
        answer: fs.length,
        form: 'integer',
        calculator: 'not-allowed',
        hints: ['Find the factors in pairs that multiply to make the number. Start with 1 and the number itself.', 'Count every factor once. Don\'t forget 1 and the number itself.'],
        solution: `Factor pairs of ${n}: ${factorPairs(n)}.\n\nThe factors are ${fs.join(', ')}. That is **${fs.length}** factors.${Number.isInteger(Math.sqrt(n)) ? `\n\n${Math.sqrt(n)} × ${Math.sqrt(n)} is a pair with the same number twice, so ${Math.sqrt(n)} is only counted once.` : ''}`,
      };
    }
    const chosenFactors = rng.sample(
      fs.filter((f) => f > 1),
      Math.min(4, fs.length - 1),
    );
    const non = rng.sample(
      Array.from({ length: n - 2 }, (_, i) => i + 2).filter((x) => n % x !== 0),
      7 - chosenFactors.length,
    );
    const opts = numberOptions([...chosenFactors, ...non]);
    return {
      type: 'multi',
      prompt: `Select **all** the numbers that are factors of ${n}.`,
      options: opts.map(({ id, text }) => ({ id, text })),
      correct: opts.filter((o) => n % o.value === 0).map((o) => o.id),
      calculator: 'not-allowed',
      hints: [`A factor divides into ${n} with no remainder.`, `List the factor pairs of ${n}: 1 × ${n}, 2 × …`],
      solution: `Factor pairs of ${n}: ${factorPairs(n)}.\n\nSo the factors of ${n} are ${fs.join(', ')}. From the list, the factors are ${opts
        .filter((o) => n % o.value === 0)
        .map((o) => o.text)
        .join(', ')}.`,
    };
  },
};

export const primes: QuestionTemplate = {
  id: `${TOPIC}.primes`,
  topicId: TOPIC,
  title: 'Prime and composite numbers',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      const n = rng.chance(0.05) ? 1 : rng.int(2, 50);
      const fs = factorsOf(n);
      const kind = n === 1 ? 'neither' : fs.length === 2 ? 'prime' : 'composite';
      const why =
        n === 1
          ? '1 has only one factor (itself). A prime needs exactly two factors, so 1 is **neither** prime nor composite.'
          : kind === 'prime'
            ? `The only factors of ${n} are 1 and ${n}. It has exactly two factors, so it is **prime**.`
            : `${n} has more than two factors: ${fs.join(', ')}. So it is **composite**.`;
      return {
        type: 'cloze',
        prompt: `Is ${n} prime, composite or neither?\n\n${n} is [[a]].`,
        blanks: [{ id: 'a', accepted: [kind], options: ['prime', 'composite', 'neither'] }],
        calculator: 'not-allowed',
        hints: [`List the factors of ${n}.`, 'A prime number has exactly two factors: 1 and itself. A composite number has more than two.'],
        solution: why,
      };
    }
    if (difficulty === 2) {
      const notPrime = rng.chance(0.4);
      const ps = rng.sample(
        PRIMES_TO_100.filter((p) => p > 10),
        notPrime ? 3 : 1,
      );
      const cs = rng.sample(LOOKALIKES, notPrime ? 1 : 3);
      const opts = numberOptions([...ps, ...cs]);
      const target = notPrime ? cs[0]! : ps[0]!;
      const correct = opts.find((o) => o.value === target)!.id;
      const feedback: Record<string, string> = {};
      for (const o of opts) {
        if (o.value === target) continue;
        feedback[o.id] = isPrime(o.value)
          ? `${o.value} is prime: its only factors are 1 and ${o.value}.`
          : `${splitText(o.value)}, so ${o.value} has more than two factors. It is composite.`;
      }
      return {
        type: 'mcq',
        prompt: `${notPrime ? 'One of these numbers is **not** prime. Which one?' : 'One of these numbers is a **prime** number. Which one?'}\n\n${listLine(opts.map((o) => o.value))}`,
        options: opts.map(({ id, text }) => ({ id, text })),
        correct,
        feedback,
        calculator: 'not-allowed',
        hints: ['Odd numbers are not always prime. Test each one.', 'Try dividing by 3, 7 and other small primes.'],
        solution: notPrime
          ? `${splitText(target)}, so ${target} is composite (not prime). The others have only two factors each: 1 and themselves.`
          : `${target} has only two factors, 1 and ${target}, so it is prime. ${cs.map((c) => splitText(c)).join('; ')}.`,
      };
    }
    // difficulty 3
    if (rng.chance(0.5)) {
      const n = rng.int(20, 95);
      const next = PRIMES_TO_100.find((p) => p > n)!;
      const skipped = Array.from({ length: next - n - 1 }, (_, i) => n + 1 + i);
      return {
        type: 'numeric',
        prompt: `What is the first prime number after ${n}?`,
        answer: next,
        form: 'integer',
        calculator: 'not-allowed',
        hints: [`Test ${n + 1}, then ${n + 2}, and so on.`, 'Even numbers (except 2) are never prime. Use the rules for 3 and 5 to rule others out quickly.'],
        solution: `${skipped.length ? `${skipped.map((x) => `${x} is composite (${splitText(x)})`).join('; ')}.\n\n` : ''}${next} has only the factors 1 and ${next}, so the first prime after ${n} is **${next}**.`,
      };
    }
    let a = 0;
    let b = 0;
    for (let attempt = 0; attempt < 100; attempt++) {
      a = rng.int(10, 80);
      b = a + rng.int(10, 20);
      if (b <= 100 && !isPrime(a) && !isPrime(b)) break;
    }
    const between = PRIMES_TO_100.filter((p) => p > a && p < b);
    return {
      type: 'numeric',
      prompt: `How many prime numbers are there between ${a} and ${b}?`,
      answer: between.length,
      form: 'integer',
      calculator: 'not-allowed',
      hints: ['Cross out the even numbers first, then the multiples of 3, 5 and 7.', 'The numbers left over are prime. Count them.'],
      solution: `The prime numbers between ${a} and ${b} are ${between.join(', ')}.\n\nThat is **${between.length}** prime number${between.length === 1 ? '' : 's'}.`,
    };
  },
};

export const divisibility: QuestionTemplate = {
  id: `${TOPIC}.divisibility`,
  topicId: TOPIC,
  title: 'Divisibility rules for 2, 3, 4, 5, 6, 8, 9 and 10',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    if (difficulty === 2 || difficulty === 3) {
      const d = difficulty === 2 ? rng.pick([2, 3, 5, 9, 10] as const) : rng.pick([4, 6, 8] as const);
      const lo = difficulty === 2 ? 100 : 1000;
      const hi = difficulty === 2 ? 9999 : 99999;
      const correctValue = pickWhere(rng, lo, hi, (n) => n % d === 0);
      const used = new Set([correctValue]);
      const distract = (test: (n: number) => boolean) => {
        const v = pickWhere(rng, lo, hi, (n) => n % d !== 0 && !used.has(n) && test(n));
        used.add(v);
        return v;
      };
      // One distractor built on a common mix-up for each rule.
      const tricky: Record<number, (n: number) => boolean> = {
        2: (n) => Math.floor(n / 10) % 2 === 0 && Math.floor(n / 10) % 10 !== 0,
        3: (n) => n % 10 === 3,
        5: (n) => Math.floor(n / 10) % 10 === 5,
        9: (n) => n % 3 === 0,
        10: (n) => n % 5 === 0,
        4: (n) => n % 2 === 0,
        6: (n) => n % 3 === 0,
        8: (n) => n % 4 === 0,
      };
      const values = [correctValue, distract(tricky[d]!), distract(d === 6 ? (n) => n % 2 === 0 : () => true), distract(() => true)];
      const opts = numberOptions(values);
      const correct = opts.find((o) => o.value === correctValue)!.id;
      const feedback: Record<string, string> = {};
      for (const o of opts) if (o.value !== correctValue) feedback[o.id] = ruleReason(o.value, d);
      return {
        type: 'mcq',
        prompt: `Use a divisibility rule. Which of these numbers is divisible by ${d}?\n\n${listLine(opts.map((o) => o.value))}`,
        options: opts.map(({ id, text }) => ({ id, text })),
        correct,
        feedback,
        calculator: 'not-allowed',
        hints: [RULE_TEXT[d]!.replace(/\*\*/g, ''), 'Check each number with the rule. Only one passes.'],
        solution: `${RULE_TEXT[d]}\n\n${opts.map((o) => `- ${ruleReason(o.value, d)}`).join('\n')}\n\nSo **${num(correctValue)}** is divisible by ${d}.`,
      };
    }
    // difficulty 4
    if (rng.chance(0.4)) {
      // Which of the rules apply to one number?
      const n = pickWhere(rng, 120, 9999, (x) => [2, 3, 4, 5, 6, 8, 9, 10].filter((d) => x % d === 0).length >= 3);
      const ds = [2, 3, 4, 5, 6, 8, 9, 10];
      const yes = ds.filter((d) => n % d === 0);
      return {
        type: 'multi',
        prompt: `Use the divisibility rules. Select **all** the numbers that ${num(n)} is divisible by.`,
        options: ds.map((d, i) => ({ id: String.fromCharCode(97 + i), text: String(d) })),
        correct: ds.map((d, i) => (n % d === 0 ? String.fromCharCode(97 + i) : '')).filter(Boolean),
        calculator: 'not-allowed',
        hints: ['Check the last digit first (for 2, 5 and 10), then add the digits (for 3 and 9).', 'Use the last two digits for 4 and the last three digits for 8. For 6, it must pass the tests for 2 and 3.'],
        solution: `${ds.map((d) => `- **${d}:** ${ruleReason(n, d)}`).join('\n')}\n\nSo ${num(n)} is divisible by ${yes.join(', ')}.`,
      };
    }
    // Missing digit.
    const by9 = rng.chance(0.5);
    for (;;) {
      const len = rng.int(3, 4);
      const ds = Array.from({ length: len }, (_, i) => (i === 0 ? rng.int(1, 9) : rng.int(0, 9)));
      const pos = rng.int(1, len - 1);
      ds[pos] = 0;
      const s = ds.reduce((t, v) => t + v, 0);
      const shown = ds.map((v, i) => (i === pos ? '\\square' : String(v))).join('');
      if (by9) {
        if (s % 9 === 0) continue;
        const x = 9 - (s % 9);
        return {
          type: 'numeric',
          prompt: `The number $${shown}$ is divisible by 9. What is the missing digit?`,
          answer: x,
          form: 'integer',
          calculator: 'not-allowed',
          hints: [RULE_TEXT[9]!, `Add the digits you can see. What must the missing digit add to make a multiple of 9?`],
          solution: `The digits you can see add to ${s}. The next multiple of 9 is ${s + x}, so the missing digit is $${s + x} - ${s} = ${x}$.\n\nCheck: ${ds.map((v, i) => (i === pos ? x : v)).join('')} has digit sum ${s + x}, which is a multiple of 9 ✓`,
        };
      }
      const smallest = rng.chance(0.5);
      const okDigits = Array.from({ length: 10 }, (_, i) => i).filter((x) => (s + x) % 3 === 0);
      const x = smallest ? okDigits[0]! : okDigits[okDigits.length - 1]!;
      return {
        type: 'numeric',
        prompt: `The number $${shown}$ is divisible by 3. What is the ${smallest ? 'smallest' : 'largest'} digit that could go in the box?`,
        answer: x,
        form: 'integer',
        calculator: 'not-allowed',
        hints: [RULE_TEXT[3]!, `Add the digits you can see. Which digits would make the total a multiple of 3?`],
        solution: `The digits you can see add to ${s}. The digit in the box must make the total a multiple of 3.\n\nThe digits that work are ${okDigits.join(', ')}, so the ${smallest ? 'smallest' : 'largest'} is **${x}**.`,
      };
    }
  },
};

export const hcfLcm: QuestionTemplate = {
  id: `${TOPIC}.hcf-lcm`,
  topicId: TOPIC,
  title: 'Highest common factor and lowest common multiple',
  difficulties: [2, 3, 4, 5],
  generate({ rng, difficulty }) {
    const lcmWorking = (a: number, b: number) => {
      const L = lcm(a, b);
      return `Multiples of ${a}: ${multiplesTo(a, L).join(', ')}, …\n\nMultiples of ${b}: ${multiplesTo(b, L).join(', ')}, …\n\nThe first number in both lists is **${L}**.`;
    };
    const hcfWorking = (a: number, b: number) => {
      const fa = factorsOf(a);
      const fb = factorsOf(b);
      const common = fa.filter((f) => fb.includes(f));
      return `Factors of ${a}: ${fa.join(', ')}\n\nFactors of ${b}: ${fb.join(', ')}\n\nCommon factors: ${common.join(', ')}. The highest is **${gcd(a, b)}**.`;
    };
    const lcmPair = () => {
      for (;;) {
        const [a, b] = rng.sample([2, 3, 4, 5, 6, 7, 8, 9], 2) as [number, number];
        if (lcm(a, b) > Math.max(a, b) || rng.chance(0.15)) return [a, b] as const;
      }
    };
    const hcfPair = (max: number, minVal: number) => {
      for (;;) {
        const h = rng.int(2, max >= 99 ? 20 : 12);
        const p = rng.int(1, 9);
        const q = rng.int(2, 9);
        if (p === q || gcd(p, q) !== 1) continue;
        const a = h * p;
        const b = h * q;
        if (a > max || b > max || a < minVal || b < minVal) continue;
        return rng.chance(0.5) ? ([a, b] as const) : ([b, a] as const);
      }
    };

    if (difficulty === 2) {
      const [a, b] = lcmPair();
      return {
        type: 'numeric',
        prompt: `Find the lowest common multiple (LCM) of ${a} and ${b}.`,
        answer: lcm(a, b),
        form: 'integer',
        calculator: 'not-allowed',
        hints: [`List the multiples of ${a} and of ${b}.`, 'The LCM is the smallest number that is in both lists.'],
        solution: lcmWorking(a, b),
      };
    }
    if (difficulty === 3 || difficulty === 4) {
      const [a, b] = difficulty === 3 ? hcfPair(49, 4) : hcfPair(99, 20);
      return {
        type: 'numeric',
        prompt: `Find the highest common factor (HCF) of ${a} and ${b}.`,
        answer: gcd(a, b),
        form: 'integer',
        calculator: 'not-allowed',
        marks: difficulty === 4 ? 2 : 1,
        hints: [`List all the factors of ${a}, then all the factors of ${b}.`, 'The HCF is the biggest number that is in both lists.'],
        solution: hcfWorking(a, b),
      };
    }
    // difficulty 5: word problems.
    if (rng.chance(0.5)) {
      const [a, b] = lcmPair();
      const name = rng.pick(NAMES);
      const ctx = rng.pick(['bus', 'sausages', 'lights'] as const);
      const L = lcm(a, b);
      if (ctx === 'bus') {
        return {
          type: 'numeric',
          prompt: `A bus to the beach leaves the bus station every ${a} minutes. A bus to the city leaves every ${b} minutes. Both buses leave together at 8:00 am.\n\nHow many minutes is it until they next leave at the same time?`,
          answer: L,
          units: 'min',
          form: 'integer',
          calculator: 'not-allowed',
          marks: 2,
          hints: ['Beach buses leave at a multiple of their gap after 8:00 am, and so do city buses.', 'You need the lowest common multiple of the two gaps.'],
          solution: `${lcmWorking(a, b)}\n\nSo they next leave together after **${L} minutes**.`,
        };
      }
      if (ctx === 'sausages') {
        return {
          type: 'numeric',
          prompt: `For a class barbecue, sausages come in packs of ${a} and bread rolls come in packs of ${b}. ${name} wants exactly the same number of sausages and rolls, with none left over.\n\nWhat is the smallest number of sausages ${name} can buy?`,
          answer: L,
          form: 'integer',
          calculator: 'not-allowed',
          marks: 2,
          hints: [`The number of sausages must be a multiple of ${a}. The number of rolls must be a multiple of ${b}.`, 'Find the lowest common multiple.'],
          solution: `${lcmWorking(a, b)}\n\nSo ${name} needs **${L}** sausages: ${L / a} pack${L / a > 1 ? 's' : ''} of sausages and ${L / b} pack${L / b > 1 ? 's' : ''} of rolls.`,
        };
      }
      return {
        type: 'numeric',
        prompt: `Two lights on a Matariki display flash at the same moment. After that, the blue light flashes every ${a} seconds and the gold light flashes every ${b} seconds.\n\nAfter how many seconds do they next flash at the same moment?`,
        answer: L,
        units: 's',
        form: 'integer',
        calculator: 'not-allowed',
        marks: 2,
        hints: [`The blue light flashes at multiples of ${a} seconds; the gold light at multiples of ${b} seconds.`, 'Find the lowest common multiple.'],
        solution: `${lcmWorking(a, b)}\n\nSo they next flash together after **${L} seconds**.`,
      };
    }
    const [a, b] = hcfPair(99, 12);
    const H = gcd(a, b);
    const name = rng.pick(NAMES);
    const ctx = rng.pick(['fruit', 'ribbon', 'groups'] as const);
    if (ctx === 'fruit') {
      return {
        type: 'numeric',
        prompt: `${name} has ${a} feijoas and ${b} mandarins. ${name} packs them into bags so that every bag has the same number of feijoas and the same number of mandarins, with no fruit left over.\n\nWhat is the largest number of bags ${name} can make?`,
        answer: H,
        form: 'integer',
        calculator: 'not-allowed',
        marks: 2,
        hints: [`The number of bags must divide into ${a} and into ${b} exactly.`, 'Find the highest common factor.'],
        solution: `${hcfWorking(a, b)}\n\nSo ${name} can make **${H}** bags, each with ${a / H} feijoa${a / H > 1 ? 's' : ''} and ${b / H} mandarin${b / H > 1 ? 's' : ''}.`,
      };
    }
    if (ctx === 'ribbon') {
      return {
        type: 'numeric',
        prompt: `Two pieces of ribbon are ${a} cm and ${b} cm long. ${name} cuts both of them into pieces that are all the same length, with none left over.\n\nWhat is the longest each piece can be?`,
        answer: H,
        units: 'cm',
        form: 'integer',
        calculator: 'not-allowed',
        marks: 2,
        hints: [`The piece length must divide into ${a} and into ${b} exactly.`, 'Find the highest common factor.'],
        solution: `${hcfWorking(a, b)}\n\nSo the longest each piece can be is **${H} cm**.`,
      };
    }
    return {
      type: 'numeric',
      prompt: `At a school sports day there are ${a} Year 7 students and ${b} Year 8 students. They are split into teams that are all the same size. Each team has students from only one year group, and no one is left out.\n\nWhat is the largest possible team size?`,
      answer: H,
      form: 'integer',
      calculator: 'not-allowed',
      marks: 2,
      hints: [`The team size must divide into ${a} and into ${b} exactly.`, 'Find the highest common factor.'],
      solution: `${hcfWorking(a, b)}\n\nSo the largest team size is **${H}** students: ${a / H} Year 7 team${a / H > 1 ? 's' : ''} and ${b / H} Year 8 team${b / H > 1 ? 's' : ''}.`,
    };
  },
};

export const templates: QuestionTemplate[] = [factorsMultiples, primes, divisibility, hcfLcm];
