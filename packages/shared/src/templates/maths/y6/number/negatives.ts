import type { Rng } from '../../../../rng';
import { NAMES, ordinal, tex } from '../../../format';
import type { QuestionTemplate } from '../../../types';
import { minus, numberLineSvg, temp, thermometerSvg } from './negatives-helpers';

// m6.num.negatives — negative numbers on number lines and thermometers, ordering, counting
// forwards and backwards past zero, temperature and debt. Year 6 counts along a number line;
// it doesn't add or subtract negative numbers, so solutions count steps (often via 0).

const COLD_PLACES = ['Ōhakune', 'Lake Tekapo', 'Twizel', 'Ranfurly', 'Queenstown', 'Alexandra', 'Wānaka', 'Methven', 'Naseby', 'Waiouru'] as const;
const WARM_PLACES = ['Auckland', 'Whangārei', 'Tauranga', 'Gisborne', 'Napier', 'Nelson', 'Kaitāia'] as const;
const IDS = ['a', 'b', 'c', 'd'];

function retry<T>(fn: () => T | null): T {
  for (let i = 0; i < 500; i++) {
    const v = fn();
    if (v !== null) return v;
  }
  throw new Error('negatives: could not generate a question');
}

function orderItems(rng: Rng, textsInOrder: string[]) {
  const ids = rng.shuffle(['p', 'q', 'r', 's', 't', 'u', 'v', 'w']);
  return textsInOrder.map((text, i) => ({ id: ids[i]!, text }));
}

/** The numbers you say when you count from `from` to `to` in ones (not including `from`). */
function onesBetween(from: number, to: number): number[] {
  const out: number[] = [];
  const dir = to > from ? 1 : -1;
  for (let v = from + dir; dir > 0 ? v <= to : v >= to; v += dir) out.push(v);
  return out;
}

/**
 * Explains one jump of `k` along the number line from `from` to `to`, counting through 0 when it
 * crosses zero: "From −3, count up 3 to reach 0, then 5 more to reach 5."
 */
function describeJump(from: number, to: number, unit = ''): string {
  const k = Math.abs(to - from);
  const up = to > from;
  const word = up ? 'up' : 'down';
  const u = (v: number) => (unit === '°C' ? temp(v) : unit === '$' ? money(v) : minus(v));
  if ((from < 0 && to > 0) || (from > 0 && to < 0)) {
    return `From ${u(from)}, count ${word} ${Math.abs(from)} to reach ${u(0)}, then ${k - Math.abs(from)} more to reach **${u(to)}**.`;
  }
  if (k <= 4) return `From ${u(from)}, count ${word} ${k}: ${onesBetween(from, to).map((v) => u(v)).join(', ')}. That is **${u(to)}**.`;
  return `Counting ${word} ${k} from ${u(from)} reaches **${u(to)}**.`;
}

/** Whole-dollar amounts in prose, escaped for Markdown: −\$6. */
function money(v: number): string {
  return `${v < 0 ? '−' : ''}\\$${Math.abs(v)}`;
}

// ---------------------------------------------------------------------------------------------

export const numberLine: QuestionTemplate = {
  id: 'm6.num.negatives.number-line',
  topicId: 'm6.num.negatives',
  title: 'Read negative numbers on a number line or thermometer',
  difficulties: [1, 2],
  generate({ rng, difficulty }) {
    const thermo = rng.chance(0.4);
    const scale =
      difficulty === 1 ? { step: 1, labelEvery: 5 } : rng.pick([{ step: 2, labelEvery: 10 }, { step: 5, labelEvery: 20 }]);
    const { step, labelEvery } = scale;
    let lo: number;
    let hi: number;
    if (thermo) {
      lo = difficulty === 1 ? rng.pick([-10, -15]) : step === 2 ? rng.pick([-20, -30]) : -40;
      hi = lo + (difficulty === 1 ? 30 : step === 2 ? 60 : 80);
    } else {
      lo = difficulty === 1 ? rng.pick([-10, -15, -20]) : step === 2 ? rng.pick([-20, -30]) : -40;
      hi = lo + (difficulty === 1 ? 15 : step === 2 ? 30 : 60);
    }
    const mark = retry(() => {
      const k = rng.int(1, Math.round((Math.min(hi, 0) - lo) / step) - 1);
      const v = lo + k * step;
      return v < 0 && v % labelEvery !== 0 ? v : null;
    });
    // Nearest labelled number (ties go to the one nearer 0).
    const labels: number[] = [];
    for (let v = lo; v <= hi; v += labelEvery) labels.push(v);
    const ref = labels.reduce((best, v) => {
      const d = Math.abs(v - mark);
      const bd = Math.abs(best - mark);
      return d < bd || (d === bd && Math.abs(v) < Math.abs(best)) ? v : best;
    });
    const k = Math.abs(mark - ref) / step;
    const dirWord = thermo ? (mark < ref ? 'below' : 'above') : mark < ref ? 'to the left of' : 'to the right of';
    const steps = Array.from({ length: k }, (_, i) => ref + (mark < ref ? -1 : 1) * step * (i + 1));
    const figure = thermo
      ? { svg: thermometerSvg({ lo, hi, minor: step, labelEvery, value: mark }), alt: `A thermometer marked in °C from ${minus(lo)} to ${minus(hi)}, with labels every ${labelEvery} degrees.` }
      : { svg: numberLineSvg({ lo, hi, step, labelEvery, mark }), alt: `A number line from ${minus(lo)} to ${minus(hi)} with an arrow pointing to one of the marks.` };
    return {
      type: 'numeric',
      prompt: thermo ? 'What temperature does this thermometer show?' : 'What number is the arrow pointing to?',
      figure,
      answer: mark,
      form: 'integer',
      ...(thermo && { units: '°C' }),
      calculator: 'not-allowed',
      hints: [
        thermo ? 'Temperatures below 0 are negative.' : 'Numbers to the left of 0 are negative.',
        difficulty === 1
          ? 'Each small mark is 1. Count the marks from the nearest labelled number.'
          : `Work out what each small mark is worth first. How many marks are there between two labels?`,
      ],
      solution: `Each small mark is worth ${step}.\n\n${thermo ? 'The top of the red line' : 'The arrow'} is ${k} mark${k === 1 ? '' : 's'} ${dirWord} ${minus(ref)}. Counting ${
        mark < ref ? (thermo ? 'down' : 'back') : thermo ? 'up' : 'on'
      } from ${minus(ref)}: ${steps.map((v) => minus(v)).join(', ')}.\n\nSo ${thermo ? 'the temperature is' : 'the arrow points to'} **${thermo ? temp(mark) : minus(mark)}**.`,
    };
  },
};

// ---------------------------------------------------------------------------------------------

export const compareOrder: QuestionTemplate = {
  id: 'm6.num.negatives.compare-order',
  topicId: 'm6.num.negatives',
  title: 'Compare and order negative and positive numbers',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      const vals = retry(() => {
        const negs = rng.sample([-12, -11, -10, -9, -8, -7, -6, -5, -4, -3, -2, -1], 2);
        const all = [...negs, rng.int(1, 12), rng.pick([0, rng.int(-12, -1), rng.int(1, 12)])];
        return new Set(all).size === 4 ? all : null;
      });
      const temps = rng.chance(0.4);
      const small = rng.chance(0.6);
      const target = small ? Math.min(...vals) : Math.max(...vals);
      const show = (v: number) => (temps ? temp(v) : minus(v));
      const word = temps ? (small ? 'coldest' : 'warmest') : small ? 'smallest' : 'largest';
      const why = (v: number): string => {
        if (small) {
          if (v > 0) return temps ? `${show(v)} is above 0, so it is warmer than any temperature below 0.` : `${show(v)} is positive, so it is bigger than every negative number.`;
          if (v === 0) return temps ? '0 °C is warmer than any temperature below 0.' : '0 is bigger than every negative number.';
          return `${show(v)} is closer to 0 than ${show(target)}, so it is ${temps ? 'warmer' : 'bigger'}.`;
        }
        if (v < 0) return `${show(v)} is negative, so it is ${temps ? 'colder' : 'smaller'} than 0.`;
        if (v === 0) return temps ? '0 °C is colder than any temperature above 0.' : '0 is smaller than every positive number.';
        return `${show(v)} is ${temps ? 'colder' : 'smaller'} than ${show(target)}.`;
      };
      const opts = rng.shuffle(vals);
      const sorted = [...vals].sort((x, y) => x - y);
      // Temperatures belong to towns, and the options are the town names.
      const towns = rng.sample(COLD_PLACES, 4);
      const townOf = (v: number) => towns[opts.indexOf(v)]!;
      const name = rng.pick(NAMES);
      return {
        type: 'mcq',
        prompt: temps
          ? `These were the temperatures in four towns at 7 am one winter morning.\n\n${opts.map((v) => `- ${townOf(v)}: ${temp(v)}`).join('\n')}\n\nWhich town was the **${word}**?`
          : `${name} has four number cards: ${opts.map((v) => minus(v)).join(',  ')}. Which card shows the **${word}** number?`,
        options: opts.map((v, i) => ({ id: IDS[i]!, text: temps ? townOf(v) : show(v) })),
        correct: IDS[opts.indexOf(target)]!,
        feedback: Object.fromEntries(
          opts
            .map((v, i) => [IDS[i]!, v] as const)
            .filter(([, v]) => v !== target)
            .map(([id, v]) => [id, temps ? `${townOf(v)} was ${temp(v)}. ${why(v)}` : why(v)]),
        ),
        calculator: 'not-allowed',
        hints: [
          temps ? 'Picture a thermometer: colder temperatures are lower down.' : 'Picture a number line: smaller numbers are further to the left.',
          'For negative numbers, the further the number is from 0, the smaller it is.',
        ],
        solution: `From ${temps ? 'coldest to warmest' : 'smallest to largest'}: ${sorted.map((v) => show(v)).join(', ')}.\n\nSo the ${word} ${temps ? `town was **${townOf(target)}** (${temp(target)})` : `number is **${show(target)}**`}.`,
      };
    }

    if (difficulty === 2) {
      const vals = retry(() => {
        const negs = rng.sample(Array.from({ length: 20 }, (_, i) => -(i + 1)), 3);
        const all = [...negs, rng.int(0, 15), rng.int(-20, 15)];
        return new Set(all).size === 5 ? all : null;
      });
      const temps = rng.chance(0.5);
      const show = (v: number) => (temps ? temp(v) : minus(v));
      const desc = rng.chance(0.4);
      const sorted = [...vals].sort((x, y) => (desc ? y - x : x - y));
      const order = temps ? (desc ? 'warmest to coldest' : 'coldest to warmest') : desc ? 'largest to smallest' : 'smallest to largest';
      return {
        type: 'order',
        prompt: `Put these ${temps ? 'temperatures' : 'numbers'} in order from **${order}**:\n\n${rng
          .shuffle(vals)
          .map((v) => show(v))
          .join(',   ')}`,
        items: orderItems(rng, sorted.map((v) => show(v))),
        calculator: 'not-allowed',
        hints: [
          'Negative numbers are less than 0, and positive numbers are more than 0.',
          'For negative numbers, the bigger the number after the − sign, the smaller (or colder) it is.',
        ],
        solution: `Picture a ${temps ? 'thermometer' : 'number line'}. ${
          temps ? 'Colder temperatures are lower.' : 'Smaller numbers are further left.'
        } A negative number further from 0 is ${temps ? 'colder' : 'smaller'}: for example, ${show(Math.min(...vals))} is ${temps ? 'colder' : 'smaller'} than ${show(
          Math.max(...vals.filter((v) => v < 0)),
        )}.\n\nThe order is: ${sorted.map((v) => show(v)).join(', ')}.`,
      };
    }

    // difficulty 3: two comparisons with < and >
    const { a, b } = retry(() => {
      const a = rng.int(2, 25);
      const b = rng.int(1, 25);
      return a === b ? null : { a, b };
    });
    const { x, y } = retry(() => {
      const x = -rng.int(2, 15);
      const y = rng.pick([0, rng.int(1, Math.abs(x) - 1)]);
      return x === y ? null : { x, y };
    });
    const flip = rng.chance(0.5);
    const [l2, r2] = flip ? [y, x] : [x, y];
    const s1 = -a < -b ? '<' : '>';
    const s2 = l2 < r2 ? '<' : '>';
    const word = (s: string) => (s === '<' ? 'is less than' : 'is greater than');
    return {
      type: 'cloze',
      prompt: `Choose $<$ or $>$ to make each one true.\n\n$${tex(-a)}$ [[a]] $${tex(-b)}$\n\n$${tex(l2)}$ [[b]] $${tex(r2)}$`,
      blanks: [
        { id: 'a', accepted: [s1], options: ['<', '>'] },
        { id: 'b', accepted: [s2], options: ['<', '>'] },
      ],
      calculator: 'not-allowed',
      hints: ['On a number line, the number further to the left is the smaller one.', 'The pointy end of < or > points to the smaller number.'],
      solution: `${minus(-a)} is ${a > b ? 'further from' : 'closer to'} 0 than ${minus(-b)}, so it is further ${a > b ? 'left' : 'right'} on the number line: $${tex(-a)} ${s1} ${tex(-b)}$ (${minus(-a)} ${word(s1)} ${minus(-b)}).\n\n${
        y === 0 ? 'Every negative number is less than 0' : 'Every negative number is less than every positive number'
      }: $${tex(l2)} ${s2} ${tex(r2)}$.`,
    };
  },
};

// ---------------------------------------------------------------------------------------------

export const counting: QuestionTemplate = {
  id: 'm6.num.negatives.counting',
  topicId: 'm6.num.negatives',
  title: 'Count forwards and backwards past zero',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    if (difficulty === 2) {
      const k = rng.int(1, 3);
      const back = rng.chance(0.6);
      const s = back ? rng.int(1, 4 * k - 1) : -rng.int(1, 4 * k - 1);
      const terms = [0, 1, 2, 3].map((i) => (back ? s - i * k : s + i * k));
      const last = terms[3]!;
      const next = back ? s - 4 * k : s + 4 * k;
      return {
        type: 'numeric',
        prompt: `What number comes next?\n\n$${terms.map((v) => tex(v)).join(',\\ ')},\\ \\square$`,
        answer: next,
        form: 'integer',
        calculator: 'not-allowed',
        hints: ['How much does the number change each time? Is it going up or down?', 'Keep counting past 0. A number line can help.'],
        solution: `The numbers go ${back ? 'down' : 'up'} by ${k} each time.\n\nCount ${back ? 'back' : 'on'} ${k} from ${minus(last)}: ${onesBetween(last, next)
          .map((v) => minus(v))
          .join(', ')}.\n\nSo the next number is **${minus(next)}**.`,
      };
    }

    if (difficulty === 3) {
      const { terms, m, k, dir } = retry(() => {
        const k = rng.pick([3, 4, 5, 10]);
        const dir = rng.chance(0.5) ? 1 : -1;
        const s = rng.int(-3 * k, 3 * k);
        const terms = [0, 1, 2, 3, 4].map((i) => s + dir * i * k);
        if (!(Math.min(...terms) < 0 && Math.max(...terms) > 0)) return null;
        return { terms, m: rng.int(1, 3), k, dir };
      });
      const shown = terms.map((v, i) => (i === m ? '\\square' : tex(v)));
      const known = m === 1 ? [terms[2]!, terms[3]!] : [terms[0]!, terms[1]!];
      return {
        type: 'numeric',
        prompt: `Find the missing number.\n\n$${shown.join(',\\ ')}$`,
        answer: terms[m]!,
        form: 'integer',
        calculator: 'not-allowed',
        hints: [`Look at two numbers next to each other. How far apart are they?`, 'Then count on or back from the number before the gap.'],
        solution: `From ${minus(known[0]!)} to ${minus(known[1]!)} is ${k} ${dir > 0 ? 'up' : 'down'}, so the numbers go ${dir > 0 ? 'up' : 'down'} by ${k} each time.\n\n${describeJump(terms[m - 1]!, terms[m]!)}\n\nCheck: ${k} ${dir > 0 ? 'more' : 'less'} than ${minus(terms[m]!)} is ${minus(terms[m + 1]!)} ✓`,
      };
    }

    // difficulty 4
    const kind = rng.pick(['nth', 'first-positive', 'first-negative'] as const);
    if (kind === 'nth') {
      const { s, k, n } = retry(() => {
        const s = rng.int(-10, 10);
        const k = rng.int(2, 5);
        const n = rng.int(5, 8);
        return s - (n - 1) * k < 0 ? { s, k, n } : null;
      });
      const seq = Array.from({ length: n }, (_, i) => s - i * k);
      return {
        type: 'numeric',
        prompt: `Start at ${minus(s)} and count back in ${k}s. ${minus(s)} is the 1st number you say. What is the ${ordinal(n)} number you say?`,
        answer: seq[n - 1]!,
        form: 'integer',
        marks: 2,
        calculator: 'not-allowed',
        hints: ['Write the numbers down as you count, or use a number line.', `The 1st number is ${minus(s)}, so you need ${n - 1} jumps back to reach the ${ordinal(n)} number.`],
        solution: `Counting back in ${k}s from ${minus(s)}:\n\n${seq.map((v, i) => `${ordinal(i + 1)}: ${minus(v)}`).join(',  ')}\n\nThe ${ordinal(n)} number is **${minus(seq[n - 1]!)}**.`,
      };
    }
    const positive = kind === 'first-positive';
    const k = rng.int(3, 6);
    const s = positive ? -rng.int(8, 30) : rng.int(8, 30);
    const seq: number[] = [s];
    while (positive ? seq[seq.length - 1]! <= 0 : seq[seq.length - 1]! >= 0) seq.push(seq[seq.length - 1]! + (positive ? k : -k));
    const answer = seq[seq.length - 1]!;
    const hadZero = seq.includes(0);
    return {
      type: 'numeric',
      prompt: `Start at ${minus(s)} and count ${positive ? 'forward' : 'back'} in ${k}s. What is the first **${positive ? 'positive' : 'negative'}** number you say?`,
      answer,
      form: 'integer',
      marks: 2,
      calculator: 'not-allowed',
      hints: ['Write the numbers down as you count.', positive ? 'Positive numbers are bigger than 0. Is 0 positive?' : 'Negative numbers are less than 0. Is 0 negative?'],
      solution: `Counting ${positive ? 'forward' : 'back'} in ${k}s: ${seq.map((v) => minus(v)).join(', ')}.\n\n${
        hadZero ? '0 is neither positive nor negative, so keep going. ' : ''
      }The first ${positive ? 'positive' : 'negative'} number is **${minus(answer)}**.`,
    };
  },
};

// ---------------------------------------------------------------------------------------------

export const temperatureDebt: QuestionTemplate = {
  id: 'm6.num.negatives.temperature-debt',
  topicId: 'm6.num.negatives',
  title: 'Temperature and money problems with negative numbers',
  difficulties: [3, 4, 5],
  generate({ rng, difficulty }) {
    const place = rng.pick(COLD_PLACES);
    const name = rng.pick(NAMES);
    if (difficulty === 3) {
      const rise = rng.chance(0.5);
      const t0 = rise ? -rng.int(1, 9) : rng.int(1, 9);
      const c = Math.abs(t0) + rng.int(1, 9);
      const t1 = rise ? t0 + c : t0 - c;
      return {
        type: 'numeric',
        prompt: rise
          ? `At 6 am the temperature in ${place} was ${temp(t0)}, as shown. By midday it had **risen** by ${c} degrees. What was the temperature at midday?`
          : `At 4 pm the temperature in ${place} was ${temp(t0)}, as shown. By midnight it had **dropped** by ${c} degrees. What was the temperature at midnight?`,
        figure: {
          svg: thermometerSvg({ lo: -10, hi: 20, minor: 1, labelEvery: 5, value: t0 }),
          alt: `A thermometer from −10 °C to 20 °C showing ${temp(t0)}.`,
        },
        answer: t1,
        form: 'integer',
        units: '°C',
        calculator: 'not-allowed',
        hints: [rise ? 'Rising means counting up the thermometer.' : 'Dropping means counting down the thermometer.', `Count to 0 first, then count the degrees that are left.`],
        solution: `${describeJump(t0, t1, '°C')}\n\nThe temperature at ${rise ? 'midday' : 'midnight'} was **${temp(t1)}**.`,
      };
    }

    if (difficulty === 4) {
      if (rng.chance(0.6)) {
        const both = rng.chance(0.35);
        const { cold, warm } = retry(() => {
          const cold = -rng.int(2, 15);
          // Winter-morning temperatures in the warmer towns stay realistic (up to 12 °C).
          const warm = both ? rng.int(cold + 1, -1) : rng.int(1, 12);
          return warm > cold ? { cold, warm } : null;
        });
        const coldPlace = place;
        const warmPlace = both ? rng.pick(COLD_PLACES.filter((p) => p !== place)) : rng.pick(WARM_PLACES);
        const diff = warm - cold;
        return {
          type: 'numeric',
          prompt: `Early one winter morning it was ${temp(warm)} in ${warmPlace} and ${temp(cold)} in ${coldPlace}. How many degrees warmer was it in ${warmPlace}?`,
          answer: diff,
          form: 'integer',
          units: '°C',
          marks: 2,
          calculator: 'not-allowed',
          hints: ['Picture a thermometer and count the degrees from the colder temperature up to the warmer one.', both ? 'Both temperatures are below 0. How far below 0 is each one?' : 'Count up to 0 first, then on to the warmer temperature.'],
          solution: both
            ? `${temp(cold)} is ${-cold} degrees below 0, and ${temp(warm)} is ${-warm} degree${warm === -1 ? '' : 's'} below 0.\n\nThe difference is $${-cold} - ${-warm} = ${diff}$, so it was **${diff} degree${diff === 1 ? '' : 's'}** warmer in ${warmPlace}.`
            : `From ${temp(cold)} up to 0 °C is ${-cold} degrees. From 0 °C up to ${temp(warm)} is ${warm} degree${warm === 1 ? '' : 's'}.\n\nAltogether: $${-cold} + ${warm} = ${diff}$, so it was **${diff} degrees** warmer in ${warmPlace}.`,
        };
      }
      // Work backwards: what was it before it dropped?
      const t1 = -rng.int(1, 9);
      const c = -t1 + rng.int(1, 10);
      const t0 = t1 + c;
      return {
        type: 'numeric',
        prompt: `At midnight the temperature in ${place} was ${temp(t1)}. It had **dropped** by ${c} degrees since 6 pm. What was the temperature at 6 pm?`,
        answer: t0,
        form: 'integer',
        units: '°C',
        marks: 2,
        calculator: 'not-allowed',
        hints: ['Work backwards. The temperature went down, so to go back in time you count up.', `Count up ${c} degrees from ${temp(t1)}.`],
        solution: `The temperature dropped by ${c} degrees to reach ${temp(t1)}. Working backwards, count **up** ${c} degrees from ${temp(t1)}.\n\n${describeJump(t1, t0, '°C')}\n\nAt 6 pm it was **${temp(t0)}**.`,
      };
    }

    // difficulty 5: two steps
    if (rng.chance(0.5)) {
      const t0 = -rng.int(1, 8);
      const r1 = -t0 + rng.int(2, 12);
      const t1 = t0 + r1;
      const r2 = t1 + rng.int(1, 8);
      const t2 = t1 - r2;
      return {
        type: 'numeric',
        prompt: `At 6 am in ${place} it was ${temp(t0)}. By 2 pm the temperature had risen by ${r1} degrees. Then, by 10 pm, it had dropped by ${r2} degrees from the 2 pm temperature. What was the temperature at 10 pm?`,
        answer: t2,
        form: 'integer',
        units: '°C',
        marks: 2,
        calculator: 'not-allowed',
        hints: ['Do one step at a time. First find the temperature at 2 pm.', 'Then count down from the 2 pm temperature.'],
        solution: `**6 am to 2 pm:** ${describeJump(t0, t1, '°C')}\n\n**2 pm to 10 pm:** ${describeJump(t1, t2, '°C')}\n\nAt 10 pm it was **${temp(t2)}**.`,
      };
    }
    const owe = rng.int(2, 8);
    const pay = rng.pick([5, 10, 15, 20].filter((p) => p > owe));
    const lunch = rng.int(4, 9);
    const b1 = pay - owe;
    const b2 = b1 - lunch;
    return {
      type: 'numeric',
      prompt: `The school canteen lets students owe a small amount of money. ${name}'s canteen account shows ${money(-owe)}, which means ${name} owes ${money(owe)}.\n\n${name} pays in ${money(pay)}, then buys lunch for ${money(lunch)}. What does the account show now?`,
      answer: b2,
      form: 'integer',
      units: '$',
      marks: 2,
      calculator: 'not-allowed',
      hints: ['Paying money in moves the balance up. Spending moves it down.', 'Use a number line, and do one step at a time.'],
      solution: `**Paying in ${money(pay)}:** ${describeJump(-owe, b1, '$')}\n\n**Buying lunch for ${money(lunch)}:** ${describeJump(b1, b2, '$')}\n\nThe account shows **${money(b2)}**${b2 < 0 ? `, so ${name} owes ${money(-b2)}` : b2 === 0 ? `, so ${name} owes nothing` : ''}.`,
    };
  },
};

export const templates: QuestionTemplate[] = [numberLine, compareOrder, counting, temperatureDebt];
