import type { QuestionTemplate } from '../../types';
import { clean, frac, gcd, mixed, num, tex } from '../../format';
import { ACCENT, label, line, polygon, svgDoc } from '../../svg';
import { decimalExpansion, isTerminating, mcqFields, orderItems, pct, simp } from './helpers';

// m9.num.fdp — converting, ordering and placing fractions, decimals and percentages, and
// terminating vs recurring decimals.

/** Smallest k (1–4) with 10^k divisible by d, or 0 if d has prime factors other than 2 and 5. */
function powerOfTenFor(d: number): number {
  for (let k = 1; k <= 4; k++) if (10 ** k % d === 0) return k;
  return 0;
}

/** Steps to turn n/d (terminating) into a decimal by making the denominator a power of 10. */
function fracToDecimalSteps(n: number, d: number): string {
  const k = powerOfTenFor(d);
  const m = 10 ** k / d;
  return m === 1
    ? `$\\frac{${n}}{${d}} = ${tex(clean(n / d))}$`
    : `$\\frac{${n}}{${d}} = \\frac{${n} \\times ${m}}{${d} \\times ${m}} = \\frac{${n * m}}{${tex(10 ** k)}} = ${tex(clean(n / d))}$`;
}

/** Fractions n/d in simplest form with 0 < n/d < 1 and denominator from the list. */
function fractionPool(dens: readonly number[]): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (const d of dens) for (let n = 1; n < d; n++) if (gcd(n, d) === 1) out.push([n, d]);
  return out;
}

export const convertFdp: QuestionTemplate = {
  id: 'm9.num.fdp.convert',
  topicId: 'm9.num.fdp',
  title: 'Convert between fractions, decimals and percentages',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      const kind = rng.pick(['pctToDec', 'decToPct', 'fracToPct'] as const);
      if (kind === 'pctToDec') {
        const p = rng.int(1, 99);
        return {
          type: 'numeric',
          prompt: `Write ${p}% as a decimal.`,
          answer: clean(p / 100),
          calculator: 'not-allowed',
          hints: ['Percent means "out of 100".', 'To change a percentage to a decimal, divide by 100.'],
          solution: `${p}% means ${p} out of 100, so divide by 100: $${p} \\div 100 = ${tex(clean(p / 100))}$.`,
        };
      }
      if (kind === 'decToPct') {
        const h = rng.int(1, 99);
        const d = clean(h / 100);
        return {
          type: 'numeric',
          prompt: `Write $${tex(d)}$ as a percentage.`,
          answer: h,
          units: '%',
          calculator: 'not-allowed',
          hints: ['To change a decimal to a percentage, multiply by 100.'],
          solution: `Multiply by 100: $${tex(d)} \\times 100 = ${h}$, so $${tex(d)} = ${h}\\%$.`,
        };
      }
      const [n, d] = rng.pick(fractionPool([2, 4, 5, 10, 20, 25]));
      const m = 100 / d;
      return {
        type: 'numeric',
        prompt: `Write $\\frac{${n}}{${d}}$ as a percentage.`,
        answer: n * m,
        units: '%',
        calculator: 'not-allowed',
        hints: ['A percentage is a number of hundredths.', `What do you multiply ${d} by to get 100?`],
        solution: `Make the denominator 100: $\\frac{${n}}{${d}} = \\frac{${n} \\times ${m}}{${d} \\times ${m}} = \\frac{${n * m}}{100} = ${n * m}\\%$.`,
      };
    }
    if (difficulty === 2) {
      const kind = rng.pick(['fracToDec', 'decToFrac', 'pctToFrac'] as const);
      if (kind === 'fracToDec') {
        const [n, d] = rng.pick(fractionPool([4, 5, 8, 20, 25, 40, 50]));
        return {
          type: 'numeric',
          prompt: `Write $\\frac{${n}}{${d}}$ as a decimal.`,
          answer: clean(n / d),
          calculator: 'not-allowed',
          hints: ['Make an equivalent fraction with a denominator of 10, 100 or 1000.', `Or divide ${n} by ${d}.`],
          solution: fracToDecimalSteps(n, d),
        };
      }
      if (kind === 'decToFrac') {
        const [n, d] = rng.pick(fractionPool([4, 5, 8, 20, 25, 40, 50, 125, 200, 250]).filter(([, b]) => b !== 2));
        const k = powerOfTenFor(d);
        const top = (n * 10 ** k) / d;
        const g = gcd(top, 10 ** k);
        return {
          type: 'numeric',
          prompt: `Write $${tex(clean(n / d))}$ as a fraction in simplest form.`,
          answer: n / d,
          form: 'simplest-fraction',
          calculator: 'not-allowed',
          hints: [`The last digit is in the ${['', 'tenths', 'hundredths', 'thousandths'][k]} place, so write it over ${num(10 ** k)}.`, 'Then simplify by dividing the top and bottom by their highest common factor.'],
          solution: `$${tex(clean(n / d))} = \\frac{${top}}{${tex(10 ** k)}}$. The HCF of ${top} and ${num(10 ** k)} is ${g}, so this simplifies to $\\frac{${n}}{${d}}$.`,
        };
      }
      let p = rng.int(2, 98);
      if (p % 10 === 0) p += 4;
      const [n, d] = simp(p, 100);
      return {
        type: 'numeric',
        prompt: `Write ${p}% as a fraction in simplest form.`,
        answer: n / d,
        form: 'simplest-fraction',
        calculator: 'not-allowed',
        hints: ['Percent means "out of 100", so write it over 100.', 'Then simplify.'],
        solution: `$${p}\\% = \\frac{${p}}{100}${d !== 100 ? ` = ${frac(n, d)}` : ''}$${d !== 100 ? ` (dividing the top and bottom by ${100 / d})` : ` (${p} and 100 have no common factor, so this is already in simplest form)`}.`,
      };
    }
    // difficulty 3
    const kind = rng.pick(['fracToPct', 'pctToFrac', 'mixedToPct', 'bigPctToDec'] as const);
    if (kind === 'fracToPct') {
      const [n, d] = rng.pick(fractionPool([8, 16, 40, 200]).filter(([a, b]) => (100 * a) % b !== 0));
      const answer = clean((100 * n) / d);
      return {
        type: 'numeric',
        prompt: `Write $\\frac{${n}}{${d}}$ as a percentage.`,
        answer,
        units: '%',
        calculator: 'not-allowed',
        hints: ['Change the fraction to a decimal first.', 'Then multiply by 100.'],
        solution: `${fracToDecimalSteps(n, d)}\n\nThen $${tex(clean(n / d))} \\times 100 = ${tex(answer)}$, so $\\frac{${n}}{${d}} = ${tex(answer)}\\%$.`,
      };
    }
    if (kind === 'pctToFrac') {
      const p = rng.pick([12.5, 37.5, 62.5, 87.5, 2.5, 7.5, 17.5, 22.5, 27.5, 32.5, 42.5, 0.5, 1.5]);
      const [n, d] = simp(p * 10, 1000);
      return {
        type: 'numeric',
        prompt: `Write ${pct(p)} as a fraction in simplest form.`,
        answer: n / d,
        form: 'simplest-fraction',
        calculator: 'not-allowed',
        hints: [`Write it over 100, then multiply the top and bottom by 10 to get rid of the decimal.`, 'Then simplify fully.'],
        solution: `$${tex(p)}\\% = \\frac{${tex(p)}}{100} = \\frac{${p * 10}}{1000} = ${frac(n, d)}$ (dividing the top and bottom by ${1000 / d}).`,
      };
    }
    if (kind === 'mixedToPct') {
      const w = rng.int(1, 3);
      const [r, d] = rng.pick(fractionPool([2, 4, 5, 10, 20, 25]));
      const answer = clean(100 * w + (100 * r) / d);
      return {
        type: 'numeric',
        prompt: `Write $${w}\\frac{${r}}{${d}}$ as a percentage.`,
        answer,
        units: '%',
        calculator: 'not-allowed',
        hints: ['Each whole one is 100%.', `Then change $\\frac{${r}}{${d}}$ to a percentage and add.`],
        solution: `$${w}$ whole${w > 1 ? 's' : ''} $= ${100 * w}\\%$ and $\\frac{${r}}{${d}} = ${tex(clean((100 * r) / d))}\\%$.\n\nSo $${w}\\frac{${r}}{${d}} = ${tex(answer)}\\%$. A percentage bigger than 100% means more than one whole.`,
      };
    }
    let p = rng.int(101, 399);
    if (p % 100 === 0) p += 5;
    return {
      type: 'numeric',
      prompt: `Write ${p}% as a decimal.`,
      answer: clean(p / 100),
      calculator: 'not-allowed',
      hints: ['Divide by 100.', '100% is 1 whole, so the answer will be bigger than 1.'],
      solution: `$${p} \\div 100 = ${tex(clean(p / 100))}$. This is bigger than 1 because ${p}% is more than one whole.`,
    };
  },
};

/** A horizontal number line from lo to hi with `parts` equal divisions and an arrow at mark k. */
function numberLineSvg(lo: number, hi: number, parts: number, k: number): string {
  const x0 = 30;
  const x1 = 370;
  const y = 56;
  const xAt = (i: number) => x0 + ((x1 - x0) * i) / parts;
  let body = line({ x: x0 - 12, y }, { x: x1 + 12, y });
  for (let i = 0; i <= parts; i++) {
    const value = lo + ((hi - lo) * i) / parts;
    const whole = Math.abs(value - Math.round(value)) < 1e-9;
    body += line({ x: xAt(i), y: y - (whole ? 10 : 6) }, { x: xAt(i), y: y + (whole ? 10 : 6) }, { width: whole ? 2 : 1.5 });
    if (whole) body += label({ x: xAt(i), y: y + 24 }, num(Math.round(value)), { size: 15 });
  }
  const ax = xAt(k);
  body += polygon(
    [
      { x: ax - 7, y: y - 30 },
      { x: ax + 7, y: y - 30 },
      { x: ax, y: y - 14 },
    ],
    { fill: ACCENT, stroke: ACCENT },
  );
  body += line({ x: ax, y: y - 42 }, { x: ax, y: y - 30 }, { stroke: ACCENT, width: 3 });
  return svgDoc(400, 96, body);
}

export const numberLine: QuestionTemplate = {
  id: 'm9.num.fdp.number-line',
  topicId: 'm9.num.fdp',
  title: 'Read fractions, decimals and percentages from a number line',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    let lo = 0;
    let hi = 1;
    let perUnit = 10;
    let as: 'decimal' | 'percentage' = 'decimal';
    if (difficulty === 1) {
      if (rng.chance(0.5)) {
        hi = rng.pick([1, 2]);
        perUnit = 10;
      } else {
        perUnit = rng.pick([2, 4, 5]);
      }
    } else if (difficulty === 2) {
      perUnit = rng.pick([4, 5, 10, 20]);
      as = 'percentage';
    } else {
      [lo, hi] = rng.pick([
        [0, 2],
        [1, 2],
        [2, 3],
        [-1, 1],
        [-1, 0],
        [3, 4],
      ] as const);
      perUnit = rng.pick([4, 5, 8]);
    }
    const parts = (hi - lo) * perUnit;
    let k = rng.int(1, parts - 1);
    while (k % perUnit === 0) k = rng.int(1, parts - 1);
    const [fn, fd] = simp(lo * perUnit + k, perUnit);
    const value = clean(fn / fd);
    const svg = numberLineSvg(lo, hi, parts, k);
    const stepFrac = `\\frac{1}{${perUnit}}`;
    const stepDec = tex(clean(1 / perUnit));
    const alt = `Number line from ${num(lo)} to ${num(hi)}. Each whole is split into ${perUnit} equal parts. An arrow points to the mark ${k} part${k === 1 ? '' : 's'} to the right of ${num(lo)}.`;
    if (as === 'percentage') {
      const answer = clean(value * 100);
      return {
        type: 'numeric',
        prompt: 'What number is the arrow pointing to? Give your answer as a **percentage**.',
        figure: { svg, alt },
        answer,
        units: '%',
        calculator: 'not-allowed',
        hints: [`How many equal parts is the gap from 0 to 1 split into?`, '0 is 0% and 1 is 100%.'],
        solution: `The gap from 0 to 1 is split into ${perUnit} equal parts, so each part is $${stepFrac} = ${tex(clean(100 / perUnit))}\\%$.\n\nThe arrow is ${k} part${k === 1 ? '' : 's'} along: $${k} \\times ${tex(clean(100 / perUnit))}\\% = ${tex(answer)}\\%$ $\\left(= ${frac(fn, fd)}\\right)$.`,
      };
    }
    return {
      type: 'numeric',
      prompt: 'What number is the arrow pointing to? Give your answer as a **decimal**.',
      figure: { svg, alt },
      answer: value,
      calculator: 'not-allowed',
      hints: ['Count how many equal parts each whole is split into.', lo < 0 ? 'Numbers to the left of 0 are negative.' : 'Work out what one part is worth, then count from a labelled number.'],
      solution: `Each whole is split into ${perUnit} equal parts, so each part is $${stepFrac} = ${stepDec}$.\n\nThe arrow is ${k} part${k === 1 ? '' : 's'} to the right of ${num(lo)}: $${tex(lo)} + ${k} \\times ${stepDec} = ${tex(value)}$${fd !== 1 ? ` $\\left(= ${value < 0 ? '-' : ''}${Math.abs(fn) > fd ? mixed(Math.abs(fn), fd) : frac(Math.abs(fn), fd)}\\right)$` : ''}.`,
    };
  },
};

interface Num {
  n: number;
  d: number;
  text: string;
  dec: string;
}

/** Shows n/d as a fraction, decimal or percentage (only forms that are exact). */
function showAs(n: number, d: number, form: 'fraction' | 'decimal' | 'percent'): Num {
  const value = n / d;
  const dec = isTerminating(n, d) ? tex(clean(value)) : decimalExpansion(n, d, 4);
  if (form === 'fraction') return { n, d, text: `$\\frac{${n}}{${d}}$`, dec };
  if (form === 'decimal') return { n, d, text: `$${tex(clean(value))}$`, dec };
  return { n, d, text: pct(clean(value * 100)), dec };
}

function formsFor(n: number, d: number): Array<'fraction' | 'decimal' | 'percent'> {
  if (!isTerminating(n, d)) return ['fraction'];
  const forms: Array<'fraction' | 'decimal' | 'percent'> = ['decimal'];
  if (d <= 40) forms.push('fraction');
  if (Number.isInteger(((100 * n) / d) * 10)) forms.push('percent');
  return forms;
}

export const orderFdp: QuestionTemplate = {
  id: 'm9.num.fdp.order',
  topicId: 'm9.num.fdp',
  title: 'Order fractions, decimals and percentages',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    const count = difficulty === 2 ? 4 : 5;
    const minGap = difficulty === 2 ? 0.04 : difficulty === 3 ? 0.012 : 0.003;
    const pool =
      difficulty === 2
        ? fractionPool([2, 4, 5, 10, 20, 25])
        : fractionPool([4, 5, 8, 10, 20, 25, 40, 50, 100]);
    const chosen: Array<[number, number]> = [];
    if (difficulty === 4) {
      // A cluster around a recurring fraction, e.g. 2/3, 0.66, 67%.
      const [rn, rd] = rng.pick([
        [1, 3],
        [2, 3],
        [1, 6],
        [5, 6],
        [4, 9],
        [5, 9],
        [7, 9],
        [1, 9],
      ] as const);
      chosen.push([rn, rd]);
      const lowH = Math.floor((100 * rn) / rd);
      chosen.push(simp(lowH, 100));
      chosen.push(simp(lowH * 10 + 5, 1000));
    }
    for (let attempt = 0; chosen.length < count && attempt < 500; attempt++) {
      const c = rng.pick(pool);
      const v = c[0] / c[1];
      if (chosen.every(([a, b]) => Math.abs(a / b - v) >= minGap)) chosen.push(c);
    }
    const values = chosen.map(([n, d]) => {
      const forms = formsFor(n, d);
      return showAs(n, d, rng.pick(forms));
    });
    const descending = rng.chance(0.3);
    const sorted = [...values].sort((x, y) => (descending ? y.n / y.d - x.n / x.d : x.n / x.d - y.n / y.d));
    return {
      type: 'order',
      prompt: `Put these numbers in order from **${descending ? 'largest to smallest' : 'smallest to largest'}**:\n\n${values.map((v) => v.text).join(', ')}`,
      items: orderItems(rng, sorted.map((s) => s.text)),
      marks: difficulty === 4 ? 2 : 1,
      calculator: 'not-allowed',
      hints: [
        'Change them all to the same form. Decimals are usually easiest to compare.',
        difficulty === 4 ? 'Write recurring decimals with several decimal places, e.g. $\\frac{1}{3} = 0.3333\\ldots$' : 'Give each decimal the same number of decimal places, e.g. 0.5 = 0.50.',
      ],
      solution: `As decimals: ${values.map((v) => (v.text === `$${v.dec}$` ? v.text : `${v.text} = $${v.dec}$`)).join(', ')}.\n\nSo the order is ${sorted.map((s) => s.text).join(', ')}.`,
    };
  },
};

const TERMINATING_DENS = [2, 4, 5, 8, 10, 16, 20, 25, 40, 50];
const RECURRING_DENS = [3, 6, 7, 9, 11, 12, 15];

export const betweenAndRecurring: QuestionTemplate = {
  id: 'm9.num.fdp.between-recurring',
  topicId: 'm9.num.fdp',
  title: 'Terminating and recurring decimals; numbers between numbers',
  difficulties: [3, 4, 5],
  generate({ rng, difficulty }) {
    if (difficulty === 3) {
      const askRecurring = rng.chance(0.5);
      const oddDens = askRecurring ? RECURRING_DENS : TERMINATING_DENS;
      const mainDens = askRecurring ? TERMINATING_DENS : RECURRING_DENS;
      const [cn, cd] = rng.pick(fractionPool(oddDens));
      const others: Array<[number, number]> = [];
      const usedDens = new Set([cd]);
      while (others.length < 3) {
        const f = rng.pick(fractionPool(mainDens));
        if (usedDens.has(f[1])) continue;
        usedDens.add(f[1]);
        others.push(f);
      }
      const describe = (n: number, d: number) =>
        `$\\frac{${n}}{${d}} = ${decimalExpansion(n, d, 6)}$, which ${isTerminating(n, d) ? 'stops (terminates)' : 'repeats forever (recurs)'}.`;
      const m = mcqFields(
        rng,
        { text: `$\\frac{${cn}}{${cd}}$` },
        others.map(([n, d]) => ({ text: `$\\frac{${n}}{${d}}$`, feedback: describe(n, d) })),
      );
      return {
        type: 'mcq',
        prompt: `Here are four fractions: ${m.options.map((o) => o.text).join(', ')}.\n\nWhich one is equal to a **${askRecurring ? 'recurring' : 'terminating'}** decimal?`,
        ...m,
        calculator: 'allowed',
        hints: [
          'Divide the numerator by the denominator and see whether the decimal stops.',
          'Shortcut: in simplest form, a fraction gives a terminating decimal only if its denominator has no prime factors other than 2 and 5.',
        ],
        solution: [describe(cn, cd), ...others.map(([n, d]) => describe(n, d))].join('\n\n'),
      };
    }
    if (difficulty === 4) {
      let a = 0;
      let b = 0;
      while (Math.abs(a - b) < 4) {
        a = rng.int(5, 95);
        b = rng.int(5, 95);
      }
      if (a > b) [a, b] = [b, a];
      const [fn, fd] = simp(a, 100);
      const firstText = fd <= 20 && rng.chance(0.6) ? `$\\frac{${fn}}{${fd}}$` : `${a}%`;
      const secondText = `$${tex(clean(b / 100))}$`;
      const [x, y] = rng.chance(0.5) ? [firstText, secondText] : [secondText, firstText];
      const answer = clean((a + b) / 200);
      return {
        type: 'numeric',
        prompt: `Find the number exactly halfway between ${x} and ${y}. Give your answer as a decimal.`,
        answer,
        marks: 2,
        calculator: 'not-allowed',
        hints: ['Write both numbers as decimals first.', 'The number halfway between two numbers is their total divided by 2.'],
        solution: `Write ${firstText} as a decimal: ${firstText} $= ${tex(clean(a / 100))}$.\n\nHalfway: $(${tex(clean(a / 100))} + ${tex(clean(b / 100))}) \\div 2 = ${tex(clean((a + b) / 100))} \\div 2 = ${tex(answer)}$.`,
      };
    }
    // difficulty 5: fraction halfway between two fractions
    let [a, b] = [1, 3];
    let [c, d] = [1, 2];
    for (let attempt = 0; attempt < 100; attempt++) {
      [a, b] = rng.pick(fractionPool([2, 3, 4, 5, 6, 7, 8, 9]));
      [c, d] = rng.pick(fractionPool([2, 3, 4, 5, 6, 7, 8, 9]));
      if (b !== d && a * d !== c * b) break;
    }
    if (a * d > c * b) [a, b, c, d] = [c, d, a, b];
    const L = b * d / gcd(b, d);
    const A = a * (L / b);
    const C = c * (L / d);
    const [mn, md] = simp(A + C, 2 * L);
    return {
      type: 'numeric',
      prompt: `Find the fraction exactly halfway between $\\frac{${a}}{${b}}$ and $\\frac{${c}}{${d}}$.`,
      answer: mn / md,
      form: 'fraction',
      marks: 2,
      calculator: 'not-allowed',
      hints: ['Write both fractions with the same denominator.', 'Halfway = (first + second) ÷ 2. If the numerators differ by an odd number, double the denominator first.'],
      solution: [
        `Common denominator ${L}: ${[b !== L ? `$\\frac{${a}}{${b}} = \\frac{${A}}{${L}}$` : '', d !== L ? `$\\frac{${c}}{${d}} = \\frac{${C}}{${L}}$` : '']
          .filter(Boolean)
          .join(' and ')}.`,
        `Add and halve: $\\left(\\frac{${A}}{${L}} + \\frac{${C}}{${L}}\\right) \\div 2 = \\frac{${A + C}}{${L}} \\div 2 = \\frac{${A + C}}{${2 * L}}${mn !== A + C ? ` = ${frac(mn, md)}` : ''}$.`,
        'You could keep halving the gap again and again, which shows there are infinitely many fractions between any two numbers.',
      ].join('\n\n'),
    };
  },
};
