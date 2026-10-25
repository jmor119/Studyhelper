import type { QuestionTemplate } from '../../types';
import { frac, gcd, NAMES, num, tex, texSigned } from '../../format';
import { COLD_PLACES, fracSigned, mixedTex, simp } from './helpers';

// m9.num.integers — reciprocals, integer word problems and a multi-step challenge.
// (The core arithmetic and GEMA templates are in integers.ts.)

const DECIMAL_RECIPROCALS: Array<[number, number, number]> = [
  // [decimal, numerator, denominator]
  [0.1, 1, 10],
  [0.2, 1, 5],
  [0.25, 1, 4],
  [0.4, 2, 5],
  [0.5, 1, 2],
  [0.6, 3, 5],
  [0.75, 3, 4],
  [0.8, 4, 5],
  [0.125, 1, 8],
  [0.05, 1, 20],
  [1.25, 5, 4],
  [1.5, 3, 2],
  [2.5, 5, 2],
];

export const reciprocals: QuestionTemplate = {
  id: 'm9.num.integers.reciprocals',
  topicId: 'm9.num.integers',
  title: 'Reciprocals (a number times its reciprocal is 1)',
  difficulties: [1, 3],
  generate({ rng, difficulty }) {
    const hints = [
      'A number multiplied by its reciprocal gives 1.',
      'To find the reciprocal of a fraction, swap the numerator and the denominator. A whole number $n$ is the same as $\\frac{n}{1}$.',
    ];
    if (difficulty === 1) {
      let n: number;
      let d: number;
      if (rng.chance(0.5)) {
        n = rng.int(2, 12) * (rng.chance(0.3) ? -1 : 1);
        d = 1;
      } else {
        d = rng.int(2, 9);
        const tops: number[] = [];
        for (let k = 1; k <= 11; k++) if (gcd(k, d) === 1 && k !== d) tops.push(k);
        n = rng.pick(tops) * (rng.chance(0.3) ? -1 : 1);
      }
      const [rn, rd] = simp(d, n);
      const sign =
        n < 0 ? '\n\nA negative number has a negative reciprocal, because a negative times a negative is positive.' : '';
      return {
        type: 'numeric',
        prompt: `What is the reciprocal of $${frac(n, d)}$?`,
        answer: rn / rd,
        calculator: 'not-allowed',
        hints,
        solution: `${d === 1 ? `Write $${tex(n)}$ as $${n < 0 ? '-' : ''}\\frac{${Math.abs(n)}}{1}$, then flip it.` : 'Swap the numerator and the denominator.'} The reciprocal is $${frac(rn, rd)}$.${sign}\n\nCheck: $${frac(n, d)} \\times ${fracSigned(rn, rd)} = 1$ ✓`,
      };
    }
    // difficulty 3: mixed numbers, decimals, or a missing factor
    const kind = rng.pick(['mixed', 'decimal', 'missing'] as const);
    if (kind === 'mixed') {
      const w = rng.int(1, 4);
      const d = rng.int(2, 9);
      const tops: number[] = [];
      for (let k = 1; k < d; k++) if (gcd(k, d) === 1) tops.push(k);
      const r = rng.pick(tops);
      const top = w * d + r;
      return {
        type: 'numeric',
        prompt: `What is the reciprocal of $${mixedTex(w, r, d)}$?`,
        answer: d / top,
        calculator: 'not-allowed',
        hints: ['Write the mixed number as an improper fraction first.', hints[1]!],
        solution: `As an improper fraction, $${mixedTex(w, r, d)} = \\frac{${w} \\times ${d} + ${r}}{${d}} = \\frac{${top}}{${d}}$.\n\nFlip it: the reciprocal is $${frac(d, top)}$.\n\nCheck: $\\frac{${top}}{${d}} \\times \\frac{${d}}{${top}} = 1$ ✓`,
      };
    }
    if (kind === 'decimal') {
      const [dec, n0, d0] = rng.pick(DECIMAL_RECIPROCALS);
      const s = rng.chance(0.3) ? -1 : 1;
      const n = s * n0;
      const [rn, rd] = simp(d0, n);
      return {
        type: 'numeric',
        prompt: `What is the reciprocal of $${tex(s * dec)}$?`,
        answer: rn / rd,
        calculator: 'not-allowed',
        hints: ['Write the decimal as a fraction first.', hints[1]!],
        solution: `$${tex(s * dec)} = ${frac(n, d0)}$.\n\nFlip it: the reciprocal is $${frac(rn, rd)}${rd !== 1 && Number.isInteger((rn / rd) * 100) ? ` = ${tex(rn / rd)}` : ''}$.\n\nCheck: $${tex(s * dec)} \\times ${fracSigned(rn, rd)} = 1$ ✓`,
      };
    }
    // missing factor: (n/d) × □ = 1
    const d = rng.int(2, 12);
    const tops: number[] = [];
    for (let k = 1; k <= 15; k++) if (gcd(k, d) === 1 && k !== d) tops.push(k);
    const n = rng.pick(tops) * (rng.chance(0.5) ? -1 : 1);
    const [rn, rd] = simp(d, n);
    return {
      type: 'numeric',
      prompt: `Find the missing number: $${frac(n, d)} \\times \\square = 1$.`,
      answer: rn / rd,
      calculator: 'not-allowed',
      hints: ['Two numbers that multiply to give 1 are reciprocals of each other.', hints[1]!],
      solution: `The missing number is the reciprocal of $${frac(n, d)}$, which is $${frac(rn, rd)}$${n < 0 ? ' (still negative, because negative × negative = positive)' : ''}.\n\nCheck: $${frac(n, d)} \\times ${fracSigned(rn, rd)} = 1$ ✓`,
    };
  },
};

export const integerContexts: QuestionTemplate = {
  id: 'm9.num.integers.contexts',
  topicId: 'm9.num.integers',
  title: 'Integer word problems (temperature, depth, scores)',
  difficulties: [3, 4],
  generate({ rng, difficulty }) {
    const place = rng.pick(COLD_PLACES);
    if (difficulty === 3) {
      const kind = rng.pick(['rise', 'fall', 'diver'] as const);
      if (kind === 'rise') {
        const t1 = rng.int(-12, -1);
        const t2 = rng.int(1, 15);
        const answer = t2 - t1;
        return {
          type: 'numeric',
          prompt: `At 6 am the temperature in ${place} was ${num(t1)} °C. By 2 pm it was ${num(t2)} °C. By how many degrees did the temperature rise?`,
          answer,
          form: 'integer',
          calculator: 'not-allowed',
          hints: [
            'The rise is the final temperature minus the starting temperature.',
            'On a number line, count up from the start to 0, then from 0 up to the final temperature.',
          ],
          solution: `Rise $= ${tex(t2)} - (${tex(t1)}) = ${tex(t2)} + ${tex(-t1)} = ${tex(answer)}$ degrees.\n\nOn a number line: ${-t1} degrees up to 0 °C, then ${t2} more, which is ${answer} degrees.`,
        };
      }
      if (kind === 'fall') {
        const t1 = rng.int(1, 10);
        const drop = rng.int(t1 + 1, t1 + 14);
        const answer = t1 - drop;
        return {
          type: 'numeric',
          prompt: `At 9 pm the temperature in ${place} was ${t1} °C. Overnight it fell by ${drop} degrees. What was the temperature in the morning?`,
          answer,
          form: 'integer',
          calculator: 'not-allowed',
          hints: ['A fall in temperature means subtract.', `Falling ${t1} degrees takes you to 0 °C. How much further is left to fall?`],
          solution: `$${tex(t1)} - ${tex(drop)} = ${tex(answer)}$\n\nFalling ${t1} degrees reaches 0 °C, and the other ${drop - t1} degrees takes it below zero, so it was **${num(answer)} °C**.`,
        };
      }
      const depth = rng.int(8, 30);
      const up = rng.chance(0.5);
      const change = up ? rng.int(2, depth - 1) : rng.int(2, 15);
      const answer = up ? -depth + change : -depth - change;
      return {
        type: 'numeric',
        prompt: `A diver is at $-${depth}$ m (${depth} m below sea level). She swims ${up ? 'up' : 'down'} ${change} m. What is her new position? Use a negative number for below sea level.`,
        answer,
        form: 'integer',
        units: 'm',
        calculator: 'not-allowed',
        hints: [
          up ? 'Swimming up makes the number bigger (closer to 0).' : 'Swimming down makes the number smaller (more negative).',
          `Start at $-${depth}$ and ${up ? 'add' : 'subtract'} ${change}.`,
        ],
        solution: `$-${depth} ${up ? '+' : '-'} ${change} = ${tex(answer)}$\n\nShe is at **${num(answer)} m**, which is ${-answer} m below sea level.`,
      };
    }
    // difficulty 4
    const kind = rng.pick(['mean', 'repeated', 'quiz'] as const);
    if (kind === 'mean') {
      let temps: number[] = [];
      let mean = 0;
      for (let attempt = 0; attempt < 100; attempt++) {
        mean = rng.int(-6, 2);
        temps = [rng.int(-10, 6), rng.int(-10, 6), rng.int(-10, 6), rng.int(-10, 6)];
        const fifth = 5 * mean - temps.reduce((s, x) => s + x, 0);
        if (fifth >= -12 && fifth <= 8) {
          temps.push(fifth);
          if (new Set(temps).size >= 3) break;
        }
        temps = [];
      }
      if (temps.length !== 5) {
        mean = -2;
        temps = [-3, 2, -6, -1, -2];
      }
      const sum = temps.reduce((s, x) => s + x, 0);
      const sumTex = temps.map((x, i) => (i === 0 ? tex(x) : texSigned(x))).join(' + ');
      return {
        type: 'numeric',
        prompt: `The minimum temperatures in ${place} over five winter nights were ${temps.map((x) => `${num(x)} °C`).join(', ')}. Find the mean minimum temperature.`,
        answer: mean,
        form: 'integer',
        marks: 2,
        calculator: 'not-allowed',
        hints: ['Mean = total ÷ number of values.', 'Add the five temperatures carefully, keeping track of the signs.'],
        solution: `Total: $${sumTex} = ${tex(sum)}$\n\nMean: $${tex(sum)} \\div 5 = ${tex(mean)}$, so the mean minimum was **${num(mean)} °C**.`,
      };
    }
    if (kind === 'repeated') {
      const k = rng.int(2, 3);
      const h = rng.int(3, 6);
      const t = rng.int(Math.max(1, k * h - 10), k * h - 1);
      const answer = t - k * h;
      return {
        type: 'numeric',
        prompt: `At 8 pm the temperature in ${place} was ${t} °C. It then fell steadily by ${k} °C every hour for ${h} hours. What was the temperature at the end of this time?`,
        answer,
        form: 'integer',
        marks: 2,
        calculator: 'not-allowed',
        hints: ['Work out the total fall first.', 'Then subtract the total fall from the starting temperature.'],
        solution: `Total fall: $${h} \\times ${k} = ${h * k}$ degrees.\n\nFinal temperature: $${t} - ${h * k} = ${tex(answer)}$, so it was **${num(answer)} °C**.`,
      };
    }
    const name = rng.pick(NAMES);
    const plus = rng.int(2, 4);
    const minus = rng.int(1, 3);
    const right = rng.int(1, 6);
    const wrong = rng.int(4, 12);
    const answer = right * plus - wrong * minus;
    return {
      type: 'numeric',
      prompt: `In a quiz, a correct answer scores ${plus} points and a wrong answer scores −${minus} point${minus === 1 ? '' : 's'}. ${name} got ${right} right and ${wrong} wrong. What was ${name}'s total score?`,
      answer,
      form: 'integer',
      marks: 2,
      calculator: 'not-allowed',
      hints: ['Work out the points for the right answers and for the wrong answers separately.', 'A wrong answer adds a negative number to the score.'],
      solution: `Right: $${right} \\times ${plus} = ${right * plus}$.\n\nWrong: $${wrong} \\times (-${minus}) = ${tex(-wrong * minus)}$.\n\nTotal: $${right * plus} + (${tex(-wrong * minus)}) = ${tex(answer)}$ points.`,
    };
  },
};

export const fractionBar: QuestionTemplate = {
  id: 'm9.num.integers.fraction-bar',
  topicId: 'm9.num.integers',
  title: 'Multi-step integer expressions with a fraction bar',
  difficulties: [5],
  generate({ rng }) {
    for (let attempt = 0; attempt < 300; attempt++) {
      const kind = rng.pick(['bracketSquare', 'plainSquare', 'cube'] as const);
      const a = kind === 'cube' ? rng.int(2, 3) : rng.int(2, 6);
      const power = kind === 'bracketSquare' ? a * a : kind === 'plainSquare' ? -a * a : -(a ** 3);
      const powerTex = kind === 'bracketSquare' ? `(-${a})^2` : kind === 'plainSquare' ? `-${a}^2` : `(-${a})^3`;
      const powerNote =
        kind === 'bracketSquare'
          ? `$(-${a})^2 = (-${a}) \\times (-${a}) = ${a * a}$`
          : kind === 'plainSquare'
            ? `$-${a}^2 = -(${a} \\times ${a}) = ${-a * a}$ (only the ${a} is squared)`
            : `$(-${a})^3 = (-${a}) \\times (-${a}) \\times (-${a}) = ${-(a ** 3)}$`;
      const m = rng.nonZeroInt(-6, 6);
      const n = rng.nonZeroInt(-6, 6);
      const top = power - m * n;
      if (top === 0) continue;
      const divisors: number[] = [];
      for (let k = 2; k <= 12; k++) if (top % k === 0) divisors.push(k);
      if (!divisors.length) continue;
      const den = rng.pick(divisors) * rng.sign();
      const d = rng.nonZeroInt(-8, 8);
      const e = d - den;
      if (e === 0) continue;
      const answer = top / den;
      return {
        type: 'numeric',
        prompt: `Work out $\\dfrac{${powerTex} - ${texSigned(m)} \\times ${texSigned(n)}}{${tex(d)} - ${texSigned(e)}}$.`,
        answer,
        form: 'integer',
        marks: 3,
        calculator: 'not-allowed',
        hints: [
          'A fraction bar acts like brackets: work out the whole top and the whole bottom first, then divide.',
          'On the top, do the power first, then the multiplication, then the subtraction.',
        ],
        solution: [
          `**Top.** Power: ${powerNote}.`,
          `Multiply: $${texSigned(m)} \\times ${texSigned(n)} = ${tex(m * n)}$.`,
          `Subtract: $${tex(power)} - ${texSigned(m * n)} = ${tex(top)}$.`,
          `**Bottom.** $${tex(d)} - ${texSigned(e)} = ${tex(den)}$.`,
          `**Divide.** $${tex(top)} \\div ${texSigned(den)} = ${tex(answer)}$.`,
        ].join('\n\n'),
      };
    }
    // Unreachable in practice; a fixed, checked example keeps the type total.
    return {
      type: 'numeric',
      prompt: 'Work out $\\dfrac{(-4)^2 - 2 \\times (-7)}{-3 - 2}$.',
      answer: -6,
      form: 'integer',
      marks: 3,
      calculator: 'not-allowed',
      hints: ['A fraction bar acts like brackets: work out the whole top and the whole bottom first, then divide.'],
      solution: 'Top: $16 - (-14) = 30$. Bottom: $-3 - 2 = -5$. Divide: $30 \\div (-5) = -6$.',
    };
  },
};
