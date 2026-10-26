import type { QuestionTemplate } from '../../../types';
import { NAMES, num, tex } from '../../../format';
import { numberLineSvg, signed } from './integers-helpers';

// m7.num.integers — integers on a number line, ordering, additive inverses, and adding and
// subtracting integers (shown as moves on a number line), in temperature and money contexts.
// Year 7: no multiplying or dividing negative numbers. No calculators.

const TOPIC = 'm7.num.integers';

const COLD_PLACES = ['Tekapo', 'Twizel', 'Ōhakune', 'Ranfurly', 'Queenstown', 'Waiouru', 'Hanmer Springs'] as const;

/** A term after the first in a sum: "+ 5" or "+ (-5)". */
const addTerm = (v: number) => (v < 0 ? ` + (${tex(v)})` : ` + ${tex(v)}`);

/** Describes a move along the number line from `start` by `delta`, noting when it crosses 0. */
function move(start: number, delta: number): string {
  const end = start + delta;
  const dir = delta > 0 ? 'right' : 'left';
  const steps = Math.abs(delta);
  const crosses = (start < 0 && end > 0) || (start > 0 && end < 0);
  const detail = crosses ? ` (${Math.abs(start)} to reach 0, then ${steps - Math.abs(start)} more)` : '';
  return `Start at ${signed(start)} and move ${steps} to the ${dir}${detail}. You land on **${signed(end)}**.`;
}

export const numberLine: QuestionTemplate = {
  id: `${TOPIC}.number-line`,
  topicId: TOPIC,
  title: 'Read integers and jumps on a number line',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    if (difficulty === 1 || difficulty === 2) {
      let min: number;
      let max: number;
      let labelled: (v: number) => boolean;
      if (difficulty === 1) {
        min = -rng.int(4, 9);
        max = min + 12;
        labelled = (v) => v % 2 === 0;
      } else {
        min = -rng.pick([10, 15, 20] as const);
        max = min + 25;
        labelled = (v) => v % 5 === 0;
      }
      const candidates = Array.from({ length: max - min - 1 }, (_, i) => min + 1 + i).filter((v) => !labelled(v));
      // Lean towards negative answers, which is what this topic is about.
      const negatives = candidates.filter((v) => v < 0);
      const target = rng.chance(0.75) && negatives.length ? rng.pick(negatives) : rng.pick(candidates);
      const below = difficulty === 1 ? target - 1 : Math.floor(target / 5) * 5;
      const step = difficulty === 1 ? 2 : 5;
      return {
        type: 'numeric',
        prompt: 'What integer is shown by the dot marked **?** on this number line?',
        figure: {
          svg: numberLineSvg({ min, max, labelled, marks: [{ at: target, text: '?' }] }),
          alt: `A number line from ${signed(min)} to ${signed(max)} with a tick for every integer. Every ${step === 2 ? 'second' : 'fifth'} tick is labelled. A dot is marked with a question mark.`,
        },
        answer: target,
        form: 'integer',
        calculator: 'not-allowed',
        hints: [
          'Find 0 first. Numbers to the left of 0 are negative.',
          `Each small tick is 1 more than the tick to its left. Count on from the nearest labelled number.`,
        ],
        solution: `The labelled number just to the left of the dot is ${signed(below)}. The dot is ${target - below} tick${target - below > 1 ? 's' : ''} to the right of it, so it shows **${signed(target)}**.${target < 0 ? `\n\nIt is to the left of 0, so it is negative: ${num(target)} is "negative ${-target}".` : ''}`,
      };
    }
    // difficulty 3: which calculation does a jump show?
    const min = -10;
    const max = 10;
    let s = 0;
    let j = 0;
    for (let attempt = 0; attempt < 100; attempt++) {
      s = rng.int(-8, 8);
      j = rng.sign() * rng.int(3, 9);
      const e = s + j;
      // Make most jumps start or end below zero.
      if (e >= min + 1 && e <= max - 1 && s !== 0 && (s < 0 || e < 0)) break;
    }
    const e = s + j;
    const a = Math.abs(j);
    const plus = j > 0;
    const options = [
      { id: 'a', text: plus ? `$${tex(s)} + ${a} = ${tex(e)}$` : `$${tex(s)} - ${a} = ${tex(e)}$` },
      { id: 'b', text: plus ? `$${tex(s)} - ${a} = ${tex(s - a)}$` : `$${tex(s)} + ${a} = ${tex(s + a)}$` },
      { id: 'c', text: plus ? `$${tex(e)} - ${a} = ${tex(s)}$` : `$${tex(e)} + ${a} = ${tex(s)}$` },
      { id: 'd', text: plus ? `$${tex(s)} + ${a + 1} = ${tex(e + 1)}$` : `$${tex(s)} - ${a + 1} = ${tex(e - 1)}$` },
    ];
    return {
      type: 'mcq',
      prompt: `The arrow starts at the black dot. Which calculation does it show?`,
      figure: {
        svg: numberLineSvg({ min, max, labelled: (v) => v % 2 === 0, jump: { from: s, to: e } }),
        alt: `A number line from −10 to 10. A black dot is at ${signed(s)}, and a curved arrow jumps from there to ${signed(e)}.`,
      },
      options,
      correct: 'a',
      feedback: {
        b: `This moves ${plus ? 'left' : 'right'}, but the arrow goes to the ${plus ? 'right' : 'left'}.`,
        c: `This starts at ${signed(e)}, where the arrow ends. The arrow starts at the black dot, ${signed(s)}.`,
        d: `Count the jumps between ticks, not the ticks themselves. The arrow moves ${a} places, not ${a + 1}.`,
      },
      calculator: 'not-allowed',
      hints: ['Where does the arrow start, and which way does it go?', 'Moving right means adding. Moving left means subtracting. Count the steps.'],
      solution: `The arrow starts at ${signed(s)} and moves ${a} to the ${plus ? 'right' : 'left'}, landing on ${signed(e)}.\n\nMoving ${plus ? 'right is adding' : 'left is subtracting'}, so the calculation is ${options[0]!.text}.`,
    };
  },
};

export const compareOrder: QuestionTemplate = {
  id: `${TOPIC}.compare-order`,
  topicId: TOPIC,
  title: 'Compare and order integers',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      let a = 0;
      let b = 0;
      do {
        a = rng.int(-20, 20);
        b = rng.int(-20, 20);
      } while (a === b || (a >= 0 && b >= 0));
      const sym = a < b ? '<' : '>';
      const [lo, hi] = a < b ? [a, b] : [b, a];
      return {
        type: 'cloze',
        prompt: `Choose < or > to make this true.\n\n$${tex(a)}$ [[s]] $${tex(b)}$`,
        blanks: [{ id: 's', accepted: [sym], options: ['<', '>'] }],
        calculator: 'not-allowed',
        hints: ['Picture a number line. Numbers further to the right are bigger.', 'A negative number is less than 0, and less than every positive number.'],
        solution: `${signed(lo)} is further to the left on the number line than ${signed(hi)}, so ${signed(lo)} is smaller.\n\n$${tex(a)} ${sym} ${tex(b)}$${lo < 0 && hi < 0 ? `\n\nWith two negative numbers, the one further from 0 is smaller.` : ''}`,
      };
    }
    if (difficulty === 2) {
      if (rng.chance(0.5)) {
        let vals: number[] = [];
        do {
          vals = rng.sample(
            Array.from({ length: 41 }, (_, i) => i - 20),
            5,
          );
        } while (vals.filter((v) => v < 0).length < 2 || vals.filter((v) => v >= 0).length < 1);
        const sorted = [...vals].sort((x, y) => x - y);
        const largestFirst = rng.chance(0.3);
        const order = largestFirst ? [...sorted].reverse() : sorted;
        return {
          type: 'order',
          prompt: `Put these integers in order from **${largestFirst ? 'largest' : 'smallest'}** to **${largestFirst ? 'smallest' : 'largest'}**.\n\n$${vals.map((v) => tex(v)).join(' \\qquad ')}$`,
          items: order.map((v) => ({ id: v < 0 ? `n${-v}` : v === 0 ? 'z' : `p${v}`, text: `$${tex(v)}$` })),
          calculator: 'not-allowed',
          hints: ['Picture the numbers on a number line.', 'The negative number furthest from 0 is the smallest.'],
          solution: `On a number line, from left to right: ${sorted.map((v) => signed(v)).join(', ')}.\n\nSo from ${largestFirst ? 'largest to smallest' : 'smallest to largest'}: ${order.map((v) => signed(v)).join(', ')}.`,
        };
      }
      const towns = rng.sample(COLD_PLACES, 4);
      let temps: number[] = [];
      do {
        temps = rng.sample([-12, -11, -10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4], 4);
      } while (temps.filter((t) => t < 0).length < 2);
      const coldest = rng.chance(0.7);
      const target = coldest ? Math.min(...temps) : Math.max(...temps);
      const ti = temps.indexOf(target);
      const feedback: Record<string, string> = {};
      towns.forEach((t, i) => {
        if (i === ti) return;
        feedback[String.fromCharCode(97 + i)] =
          temps[i]! < 0 && coldest
            ? `${signed(temps[i]!)} °C is closer to 0 than ${signed(target)} °C, so it is warmer.`
            : `${signed(temps[i]!)} °C is ${coldest ? 'warmer' : 'colder'} than ${signed(target)} °C.`;
      });
      return {
        type: 'mcq',
        prompt: `These were the temperatures in four towns early one winter morning.\n\n| Town | Temperature |\n|---|---|\n${towns.map((t, i) => `| ${t} | ${signed(temps[i]!)} °C |`).join('\n')}\n\nWhich town was the **${coldest ? 'coldest' : 'warmest'}**?`,
        options: towns.map((t, i) => ({ id: String.fromCharCode(97 + i), text: t })),
        correct: String.fromCharCode(97 + ti),
        feedback,
        calculator: 'not-allowed',
        hints: ['Picture the temperatures on a thermometer, which is a vertical number line.', coldest ? 'The coldest temperature is the lowest one on the thermometer.' : 'The warmest temperature is the highest one on the thermometer.'],
        solution: `From coldest to warmest: ${[...temps].sort((x, y) => x - y).map((v) => `${signed(v)} °C`).join(', ')}.\n\nThe ${coldest ? 'coldest' : 'warmest'} was **${towns[ti]}** at ${signed(target)} °C.`,
      };
    }
    // difficulty 3
    const kind = rng.pick(['halfway', 'between', 'distance'] as const);
    let a = 0;
    let b = 0;
    for (let attempt = 0; attempt < 100; attempt++) {
      a = rng.int(-20, -1);
      b = rng.int(-15, 15);
      if (b - a >= 4 && (kind !== 'halfway' || (b - a) % 2 === 0)) break;
    }
    if (kind === 'halfway') {
      const mid = (a + b) / 2;
      return {
        type: 'numeric',
        prompt: `What integer is exactly halfway between ${signed(a)} and ${signed(b)} on a number line?`,
        answer: mid,
        form: 'integer',
        calculator: 'not-allowed',
        hints: [`How far is it from ${signed(a)} to ${signed(b)}?`, 'Go half of that distance from the smaller number.'],
        solution: `From ${signed(a)} to ${signed(b)} is ${b - a} steps. Half of ${b - a} is ${(b - a) / 2}.\n\n${move(a, (b - a) / 2)}`,
      };
    }
    if (kind === 'between') {
      return {
        type: 'numeric',
        prompt: `How many integers are there between ${signed(a)} and ${signed(b)}? Do not count ${signed(a)} or ${signed(b)}.`,
        answer: b - a - 1,
        form: 'integer',
        calculator: 'not-allowed',
        hints: ['Remember that 0 is an integer too.', `How many steps is it from ${signed(a)} to ${signed(b)}? The numbers in between are one fewer than the steps.`],
        solution: `From ${signed(a)} to ${signed(b)} is ${b - a} steps. The integers strictly between them are one fewer: $${b - a} - 1 = ${b - a - 1}$.${b - a - 1 <= 12 ? `\n\nThey are ${Array.from({ length: b - a - 1 }, (_, i) => signed(a + 1 + i)).join(', ')}.` : ''}`,
      };
    }
    return {
      type: 'numeric',
      prompt: `How far apart are ${signed(a)} and ${signed(b)} on a number line?`,
      answer: b - a,
      form: 'integer',
      calculator: 'not-allowed',
      hints: [b > 0 ? `How far is ${signed(a)} from 0? How far is ${signed(b)} from 0?` : `Count the steps from ${signed(a)} up to ${signed(b)}.`, b > 0 ? 'The numbers are on opposite sides of 0, so add the two distances.' : 'Both numbers are negative, so they are on the same side of 0.'],
      solution:
        b > 0
          ? `${signed(a)} is ${-a} from 0 and ${signed(b)} is ${b} from 0. They are on opposite sides of 0, so the distance is $${-a} + ${b} = ${b - a}$.`
          : b === 0
            ? `${signed(a)} is ${-a} steps from 0.`
            : `From ${signed(a)} up to ${signed(b)} is $${-a} - ${-b} = ${b - a}$ steps.`,
    };
  },
};

export const additiveInverse: QuestionTemplate = {
  id: `${TOPIC}.additive-inverse`,
  topicId: TOPIC,
  title: 'Additive inverses',
  difficulties: [1, 2],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      const n = rng.nonZeroInt(-60, 60);
      if (rng.chance(0.5)) {
        return {
          type: 'numeric',
          prompt: `What is the additive inverse of ${signed(n)}?`,
          answer: -n,
          form: 'integer',
          calculator: 'not-allowed',
          hints: ['The additive inverse is the number you add to get 0.', 'It is the same distance from 0, but on the other side.'],
          solution: `${signed(n)} and ${signed(-n)} are the same distance from 0, on opposite sides.\n\n$${tex(n)} + ${n > 0 ? `(${tex(-n)})` : tex(-n)} = 0$, so the additive inverse of ${signed(n)} is **${signed(-n)}**.`,
        };
      }
      return {
        type: 'numeric',
        prompt: `What number goes in the box?\n\n$${tex(n)} + \\square = 0$`,
        answer: -n,
        form: 'integer',
        calculator: 'not-allowed',
        hints: [`Starting at ${signed(n)}, how far do you move to get to 0, and which way?`, 'A number plus its additive inverse is always 0.'],
        solution: `To get from ${signed(n)} to 0 you move ${Math.abs(n)} to the ${n < 0 ? 'right' : 'left'}, so add ${signed(-n)}.\n\n$${tex(n)} + ${n > 0 ? `(${tex(-n)})` : tex(-n)} = 0$. The box is the additive inverse, **${signed(-n)}**.`,
      };
    }
    // difficulty 2
    if (rng.chance(0.5)) {
      // Spot the zero pair.
      const x = rng.int(6, 25);
      const xs = rng.sign() * x;
      let y = rng.nonZeroInt(-12, 12);
      while (Math.abs(y) === x) y = rng.nonZeroInt(-12, 12);
      const order = rng.pick([
        [xs, y, -xs],
        [xs, -xs, y],
        [y, xs, -xs],
      ] as const);
      const exprTex = `${tex(order[0])}${order.slice(1).map((v) => addTerm(v)).join('')}`;
      return {
        type: 'numeric',
        prompt: `Work out $${exprTex}$.\n\nLook for a shortcut first.`,
        answer: y,
        form: 'integer',
        calculator: 'not-allowed',
        hints: ['Look for two numbers that are additive inverses of each other.', 'A number and its additive inverse add to 0.'],
        solution: `${signed(xs)} and ${signed(-xs)} are additive inverses, so together they make 0.\n\nThat leaves ${signed(y)}, so $${exprTex} = ${tex(y)}$.`,
      };
    }
    const a = rng.nonZeroInt(-12, 12);
    let b = rng.nonZeroInt(-15, 15);
    while (a + b === 0) b = rng.nonZeroInt(-15, 15);
    const v = a + b;
    return {
      type: 'numeric',
      prompt: `What is the additive inverse of the answer to $${tex(a)}${addTerm(b)}$?`,
      answer: -v,
      form: 'integer',
      calculator: 'not-allowed',
      hints: ['Work out the calculation first.', 'Then find the number that adds to it to make 0.'],
      solution: `$${tex(a)}${addTerm(b)} = ${tex(v)}$.\n\nThe additive inverse of ${signed(v)} is **${signed(-v)}**, because $${tex(v)}${addTerm(-v)} = 0$.`,
    };
  },
};

export const addSubtract: QuestionTemplate = {
  id: `${TOPIC}.add-subtract`,
  topicId: TOPIC,
  title: 'Add and subtract integers',
  difficulties: [1, 2, 3, 4, 5],
  generate({ rng, difficulty }) {
    const hintsLine = [
      'Think of a number line. Adding a positive number moves right; subtracting a positive number moves left.',
      'If you cross 0, split the jump: first get to 0, then keep going.',
    ];
    if (difficulty === 1) {
      if (rng.chance(0.5)) {
        const a = rng.int(1, 15);
        const b = rng.int(1, 15);
        const ans = -a + b;
        return {
          type: 'numeric',
          prompt: `Work out $-${a} + ${b}$.`,
          answer: ans,
          form: 'integer',
          calculator: 'not-allowed',
          hints: hintsLine,
          solution: `${move(-a, b)}\n\n$-${a} + ${b} = ${tex(ans)}$`,
        };
      }
      const a = rng.int(1, 12);
      const b = rng.int(a + 1, 20);
      return {
        type: 'numeric',
        prompt: `Work out $${a} - ${b}$.`,
        answer: a - b,
        form: 'integer',
        calculator: 'not-allowed',
        hints: hintsLine,
        solution: `${move(a, -b)}\n\n$${a} - ${b} = ${tex(a - b)}$`,
      };
    }
    if (difficulty === 2) {
      const kind = rng.pick(['negMinus', 'plusNeg', 'negPlusNeg'] as const);
      const a = rng.int(1, 15);
      const b = rng.int(1, 15);
      if (kind === 'negMinus') {
        return {
          type: 'numeric',
          prompt: `Work out $-${a} - ${b}$.`,
          answer: -a - b,
          form: 'integer',
          calculator: 'not-allowed',
          hints: [hintsLine[0]!, 'You start below 0 and move further left, so the answer is more negative.'],
          solution: `${move(-a, -b)}\n\n$-${a} - ${b} = ${tex(-a - b)}$`,
        };
      }
      const start = kind === 'plusNeg' ? a : -a;
      return {
        type: 'numeric',
        prompt: `Work out $${tex(start)} + (-${b})$.`,
        answer: start - b,
        form: 'integer',
        calculator: 'not-allowed',
        hints: ['Adding a negative number moves you left on the number line.', `So $${tex(start)} + (-${b})$ is the same as $${tex(start)} - ${b}$.`],
        solution: `Adding ${signed(-b)} is the same as subtracting ${b}: $${tex(start)} + (-${b}) = ${tex(start)} - ${b}$.\n\n${move(start, -b)}`,
      };
    }
    if (difficulty === 3) {
      const s = rng.chance(0.7) ? -rng.int(1, 15) : rng.int(1, 12);
      const n1 = rng.int(2, 15);
      const n2 = rng.int(2, 15);
      const o1 = rng.pick(['+', '-'] as const);
      const o2 = o1 === '+' ? '-' : rng.pick(['+', '-'] as const);
      const mid = o1 === '+' ? s + n1 : s - n1;
      const end = o2 === '+' ? mid + n2 : mid - n2;
      const exprTex = `${tex(s)} ${o1} ${n1} ${o2} ${n2}`;
      return {
        type: 'numeric',
        prompt: `Work out $${exprTex}$.`,
        answer: end,
        form: 'integer',
        calculator: 'not-allowed',
        hints: ['Work from left to right, one step at a time.', 'Use a number line for each step.'],
        solution: `Step 1: $${tex(s)} ${o1} ${n1} = ${tex(mid)}$\n\nStep 2: $${tex(mid)} ${o2} ${n2} = ${tex(end)}$\n\nSo $${exprTex} = ${tex(end)}$.`,
      };
    }
    if (difficulty === 4) {
      const kind = rng.pick(['xPlusBox', 'boxPlusX', 'xMinusBox', 'boxMinusX'] as const);
      let x = 0;
      let y = 0;
      let box = 0;
      let lhs = '';
      for (let attempt = 0; attempt < 100; attempt++) {
        x = rng.nonZeroInt(-15, 15);
        y = rng.nonZeroInt(-15, 15);
        if (kind === 'xPlusBox' || kind === 'boxPlusX') box = y - x;
        if (kind === 'xMinusBox') box = x - y;
        if (kind === 'boxMinusX') {
          x = rng.int(2, 15);
          box = y + x;
        }
        if (box !== 0 && Math.abs(box) <= 25 && (kind !== 'xMinusBox' || box > 0) && (x < 0 || y < 0 || box < 0)) break;
      }
      if (kind === 'xPlusBox') lhs = `${tex(x)} + \\square`;
      if (kind === 'boxPlusX') lhs = `\\square${addTerm(x)}`;
      if (kind === 'xMinusBox') lhs = `${tex(x)} - \\square`;
      if (kind === 'boxMinusX') lhs = `\\square - ${x}`;
      const working =
        kind === 'xPlusBox'
          ? `Count from ${signed(x)} to ${signed(y)} on the number line: that is ${Math.abs(box)} to the ${box > 0 ? 'right' : 'left'}, so the box is ${signed(box)}.`
          : kind === 'boxPlusX'
            ? `Work backwards from ${signed(y)}: undo adding ${signed(x)} by moving ${Math.abs(x)} to the ${x > 0 ? 'left' : 'right'}. That lands on ${signed(box)}.`
            : kind === 'xMinusBox'
            ? `Going from ${signed(x)} down to ${signed(y)} is ${box} to the left, so ${box} was subtracted.`
            : `Undo subtracting ${x} by adding ${x}: $${tex(y)} + ${x} = ${tex(box)}$.`;
      return {
        type: 'numeric',
        prompt: `What number goes in the box?\n\n$${lhs} = ${tex(y)}$`,
        answer: box,
        form: 'integer',
        calculator: 'not-allowed',
        marks: 2,
        hints: ['Picture the start and the end on a number line.', 'How far apart are they, and in which direction? You can check by putting your answer in the box.'],
        solution: `${working}\n\nCheck: $${lhs.replace('\\square', box < 0 && lhs.indexOf('\\square') > 0 ? `(${tex(box)})` : tex(box))} = ${tex(y)}$ ✓`,
      };
    }
    // difficulty 5: subtracting a negative.
    if (rng.chance(0.6)) {
      const a = rng.int(-15, 15);
      const b = rng.int(2, 12);
      return {
        type: 'numeric',
        prompt: `Work out $${tex(a)} - (-${b})$.`,
        answer: a + b,
        form: 'integer',
        calculator: 'not-allowed',
        hints: ['Subtracting a number is the same as adding its additive inverse.', `The additive inverse of ${signed(-b)} is ${b}.`],
        solution: `Subtracting ${signed(-b)} is the same as adding its additive inverse, ${b}:\n\n$${tex(a)} - (-${b}) = ${tex(a)} + ${b} = ${tex(a + b)}$\n\nThink of money: taking away a debt of \\$${b} leaves you \\$${b} better off.`,
      };
    }
    const s = rng.nonZeroInt(-10, 10);
    const p = rng.int(2, 9);
    const q = rng.int(2, 9);
    const ans = s - p + q;
    const exprTex = `${tex(s)} + (-${p}) - (-${q})`;
    return {
      type: 'numeric',
      prompt: `Work out $${exprTex}$.`,
      answer: ans,
      form: 'integer',
      calculator: 'not-allowed',
      marks: 2,
      hints: ['Adding a negative is the same as subtracting. Subtracting a negative is the same as adding.', 'Rewrite the calculation without brackets, then work from left to right.'],
      solution: `$+ (-${p})$ becomes $- ${p}$, and $- (-${q})$ becomes $+ ${q}$:\n\n$${exprTex} = ${tex(s)} - ${p} + ${q}$\n\n$${tex(s)} - ${p} = ${tex(s - p)}$, then $${tex(s - p)} + ${q} = ${tex(ans)}$.`,
    };
  },
};

export const contexts: QuestionTemplate = {
  id: `${TOPIC}.contexts`,
  topicId: TOPIC,
  title: 'Integers in temperature, money and height contexts',
  difficulties: [2, 3, 4, 5],
  generate({ rng, difficulty }) {
    const place = rng.pick(COLD_PLACES);
    const name = rng.pick(NAMES);
    if (difficulty === 2) {
      const kind = rng.pick(['warm', 'cool', 'lift', 'diver'] as const);
      if (kind === 'warm') {
        const t0 = -rng.int(1, 9);
        const c = rng.int(3, 15);
        return {
          type: 'numeric',
          prompt: `At 7 am the temperature in ${place} was ${signed(t0)} °C. By 1 pm it had risen by ${c} °C.\n\nWhat was the temperature at 1 pm?`,
          answer: t0 + c,
          units: '°C',
          form: 'integer',
          calculator: 'not-allowed',
          hints: ['Rising temperatures move up a thermometer (like moving right on a number line).', `Work out $${tex(t0)} + ${c}$.`],
          solution: `$${tex(t0)} + ${c} = ${tex(t0 + c)}$\n\n${move(t0, c)}\n\nThe temperature at 1 pm was ${signed(t0 + c)} °C.`,
        };
      }
      if (kind === 'cool') {
        const t0 = rng.int(1, 8);
        const c = rng.int(t0 + 1, t0 + 9);
        return {
          type: 'numeric',
          prompt: `At 6 pm the temperature in ${place} was ${t0} °C. Overnight it fell by ${c} °C.\n\nWhat was the temperature in the morning?`,
          answer: t0 - c,
          units: '°C',
          form: 'integer',
          calculator: 'not-allowed',
          hints: ['Falling temperatures move down a thermometer (like moving left on a number line).', `Work out $${t0} - ${c}$.`],
          solution: `$${t0} - ${c} = ${tex(t0 - c)}$\n\n${move(t0, -c)}\n\nThe morning temperature was ${signed(t0 - c)} °C.`,
        };
      }
      if (kind === 'lift') {
        const start = rng.int(1, 8);
        const down = rng.int(start + 1, start + 3);
        return {
          type: 'numeric',
          prompt: `In a city car park building, the ground floor is level 0. The levels underground are −1, −2 and −3.\n\n${name} gets in the lift on level ${start} and goes down ${down} levels. Which level does ${name} get out on?`,
          answer: start - down,
          form: 'integer',
          calculator: 'not-allowed',
          hints: ['Going down means subtracting.', `Work out $${start} - ${down}$.`],
          solution: `$${start} - ${down} = ${tex(start - down)}$\n\n${move(start, -down)}\n\n${name} gets out on level ${signed(start - down)}.`,
        };
      }
      const depth = rng.int(8, 20);
      const up = rng.int(2, depth - 1);
      return {
        type: 'numeric',
        prompt: `${name} is diving at ${signed(-depth)} m, which means ${depth} m below the surface of the sea. ${name} swims up ${up} m.\n\nWhat is ${name}'s new position? Use a negative number for below the surface.`,
        answer: -depth + up,
        units: 'm',
        form: 'integer',
        calculator: 'not-allowed',
        hints: ['Swimming up means adding.', `Work out $${tex(-depth)} + ${up}$.`],
        solution: `$${tex(-depth)} + ${up} = ${tex(-depth + up)}$\n\n${move(-depth, up)}\n\n${name} is now at ${signed(-depth + up)} m, which is ${depth - up} m below the surface.`,
      };
    }
    if (difficulty === 3) {
      const kind = rng.pick(['range', 'bank', 'height'] as const);
      if (kind === 'range') {
        const lo = -rng.int(1, 9);
        const hi = rng.int(3, 16);
        return {
          type: 'numeric',
          prompt: `One winter day in ${place}, the highest temperature was ${hi} °C and the lowest was ${signed(lo)} °C.\n\nWhat is the difference between the highest and lowest temperatures?`,
          answer: hi - lo,
          units: '°C',
          form: 'integer',
          calculator: 'not-allowed',
          hints: [`How far is ${signed(lo)} from 0? How far is ${hi} from 0?`, 'The temperatures are on opposite sides of 0, so add the two distances.'],
          solution: `From ${signed(lo)} °C up to 0 °C is ${-lo} degrees. From 0 °C up to ${hi} °C is ${hi} degrees.\n\nDifference: $${-lo} + ${hi} = ${hi - lo}$ °C. (This is $${hi} - (${tex(lo)}) = ${hi - lo}$.)`,
        };
      }
      if (kind === 'bank') {
        const owe = rng.int(5, 30);
        const pay = rng.int(owe + 5, owe + 40);
        return {
          type: 'numeric',
          prompt: `${name} owes their brother \\$${owe}, so ${name}'s balance is −\\$${owe}. ${name} earns \\$${pay} from a paper run and pays the brother back in full.\n\nHow much money does ${name} have left?`,
          answer: pay - owe,
          units: '$',
          form: 'integer',
          calculator: 'not-allowed',
          hints: [`Start at ${signed(-owe)} on a number line and add ${pay}.`, 'The first part of the money gets you back to 0.'],
          solution: `$${tex(-owe)} + ${pay} = ${tex(pay - owe)}$\n\n${move(-owe, pay)}\n\n${name} has **\\$${pay - owe}** left.`,
        };
      }
      const birdH = rng.int(4, 30);
      const fishD = rng.int(3, 15);
      const [bird, fish] = rng.pick([
        ['A kererū is flying', 'a snapper is swimming'],
        ['A tūī is sitting in a pōhutukawa', 'a crayfish is resting on a rock'],
        ['A kāhu (hawk) is gliding', 'a stingray is swimming'],
      ] as const);
      return {
        type: 'numeric',
        prompt: `${bird} ${birdH} m above sea level, and ${fish} ${fishD} m below sea level.\n\nHow far apart are they, measured straight up and down?`,
        answer: birdH + fishD,
        units: 'm',
        form: 'integer',
        calculator: 'not-allowed',
        hints: ['Sea level is 0. Above is positive and below is negative.', 'They are on opposite sides of 0, so add the two distances.'],
        solution: `The heights are ${birdH} m and ${signed(-fishD)} m. They are on opposite sides of 0 (sea level).\n\nDistance apart: $${birdH} + ${fishD} = ${birdH + fishD}$ m. (This is $${birdH} - (${tex(-fishD)}) = ${birdH + fishD}$.)`,
      };
    }
    if (difficulty === 4) {
      if (rng.chance(0.5)) {
        const t0 = rng.int(-6, 4);
        const drop = rng.int(3, 8);
        const rise = rng.int(5, 15);
        const mid = t0 - drop;
        const end = mid + rise;
        return {
          type: 'numeric',
          prompt: `At midnight in ${place} it was ${signed(t0)} °C. By 6 am the temperature had dropped ${drop} °C. By noon it had risen ${rise} °C from the 6 am temperature.\n\nWhat was the temperature at noon?`,
          answer: end,
          units: '°C',
          form: 'integer',
          calculator: 'not-allowed',
          marks: 2,
          hints: ['Do it in two steps. Find the 6 am temperature first.', 'A drop means subtract; a rise means add.'],
          solution: `6 am: $${tex(t0)} - ${drop} = ${tex(mid)}$ °C\n\nNoon: $${tex(mid)} + ${rise} = ${tex(end)}$ °C\n\nThe temperature at noon was ${signed(end)} °C.`,
        };
      }
      const has = rng.int(4, 15);
      const cost = rng.int(has + 3, has + 20);
      const earn = rng.int(cost - has + 2, cost - has + 25);
      const mid = has - cost;
      const end = mid + earn;
      const gift = rng.pick(['a birthday present', 'a new netball', 'a book', 'a pair of jandals'] as const);
      return {
        type: 'numeric',
        prompt: `${name} has \\$${has}. ${name} buys ${gift} for \\$${cost} and borrows the rest of the money from Mum. Then ${name} earns \\$${earn} by mowing lawns and pays Mum back.\n\nHow much money does ${name} have now?`,
        answer: end,
        units: '$',
        form: 'integer',
        calculator: 'not-allowed',
        marks: 2,
        hints: [`After buying the present, ${name}'s balance is negative. Work it out: $${has} - ${cost}$.`, `Then add the \\$${earn}.`],
        solution: `After buying ${gift}: $${has} - ${cost} = ${tex(mid)}$, so ${name} owes Mum \\$${-mid}.\n\nAfter mowing lawns: $${tex(mid)} + ${earn} = ${tex(end)}$.\n\n${name} has **\\$${end}** now.`,
      };
    }
    // difficulty 5: work backwards, or a change between two negatives.
    const kind = rng.pick(['before', 'before', 'change'] as const);
    if (kind === 'change') {
      const a = -rng.int(6, 15);
      const b = rng.chance(0.5) ? -rng.int(1, -a - 2) : rng.int(1, 8);
      return {
        type: 'numeric',
        prompt: `Early one morning in ${place} the temperature was ${signed(a)} °C. By lunchtime it was ${signed(b)} °C.\n\nBy how many degrees did the temperature rise?`,
        answer: b - a,
        units: '°C',
        form: 'integer',
        calculator: 'not-allowed',
        marks: 2,
        hints: [`Picture a thermometer. Count up from ${signed(a)} to ${signed(b)}.`, b > 0 ? 'Count up to 0 first, then keep going.' : 'Both temperatures are below 0. Count the steps between them.'],
        solution:
          b > 0
            ? `From ${signed(a)} °C up to 0 °C is ${-a} degrees, then up to ${b} °C is ${b} more.\n\nRise: $${-a} + ${b} = ${b - a}$ °C.`
            : `Counting up from ${signed(a)} to ${signed(b)} is ${b - a} steps (that is $${-a} - ${-b} = ${b - a}$).\n\nThe temperature rose by ${b - a} °C.`,
      };
    }
    const fell = rng.chance(0.5);
    const change = rng.int(4, 14);
    const after = fell ? -rng.int(1, 9) : rng.int(-6, 6);
    const before = fell ? after + change : after - change;
    return {
      type: 'numeric',
      prompt: fell
        ? `The temperature in ${place} fell by ${change} °C overnight. In the morning it was ${signed(after)} °C.\n\nWhat was the temperature before it fell?`
        : `The temperature in ${place} rose by ${change} °C during the morning. At noon it was ${signed(after)} °C.\n\nWhat was the temperature before it rose?`,
      answer: before,
      units: '°C',
      form: 'integer',
      calculator: 'not-allowed',
      marks: 2,
      hints: ['Work backwards from the final temperature.', fell ? 'To undo a fall, go back up: add.' : 'To undo a rise, go back down: subtract.'],
      solution: fell
        ? `Work backwards: undo the fall by adding ${change}.\n\n$${tex(after)} + ${change} = ${tex(before)}$\n\nCheck: $${tex(before)} - ${change} = ${tex(after)}$ ✓ The temperature was ${signed(before)} °C.`
        : `Work backwards: undo the rise by subtracting ${change}.\n\n$${tex(after)} - ${change} = ${tex(before)}$\n\nCheck: $${tex(before)} + ${change} = ${tex(after)}$ ✓ The temperature was ${signed(before)} °C.`,
    };
  },
};

export const templates: QuestionTemplate[] = [numberLine, compareOrder, additiveInverse, addSubtract, contexts];
