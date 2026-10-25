import type { QuestionTemplate } from '../../types';
import { num, round, tex } from '../../format';
import { polygon, rightAngleMark, svgDoc, type Pt } from '../../svg';
import { centroid, labelAway } from './figures';

// m9.mea.pythagoras — Year 9 finds the hypotenuse and checks for right angles
// (finding a shorter side is Year 10).

const TRIPLES: Array<[number, number, number]> = [
  [3, 4, 5],
  [5, 12, 13],
  [8, 15, 17],
  [7, 24, 25],
  [6, 8, 10],
  [9, 12, 15],
  [20, 21, 29],
  [9, 40, 41],
  [12, 16, 20],
  [15, 20, 25],
];

/** A right-angled triangle figure with the right angle at the bottom left. */
function rightTriangle(a: number, b: number, labels: { a: string; b: string; c: string }) {
  const maxW = 260;
  const maxH = 170;
  const s = Math.min(maxW / b, maxH / a);
  const w = Math.max(60, b * s);
  const h = Math.max(50, a * s);
  const A: Pt = { x: 70, y: 30 + h }; // right angle
  const B: Pt = { x: 70 + w, y: 30 + h };
  const C: Pt = { x: 70, y: 30 };
  const body =
    polygon([A, B, C]) +
    rightAngleMark(A, B, C) +
    labelAway(C, A, centroid([A, B, C]), labels.a) +
    labelAway(A, B, centroid([A, B, C]), labels.b) +
    labelAway(B, C, centroid([A, B, C]), labels.c);
  return { svg: svgDoc(w + 160, h + 80, body), w, h };
}

export const hypotenuse: QuestionTemplate = {
  id: 'm9.mea.pythagoras.hypotenuse',
  topicId: 'm9.mea.pythagoras',
  title: 'Find the hypotenuse',
  difficulties: [2, 3],
  generate({ rng, difficulty }) {
    const unit = rng.pick(['cm', 'm', 'mm']);
    let a: number;
    let b: number;
    let c: number;
    if (difficulty === 2) {
      const t = rng.pick(TRIPLES);
      [a, b] = rng.chance(0.5) ? [t[0], t[1]] : [t[1], t[0]];
      c = t[2];
    } else {
      a = rng.int(3, 15);
      b = rng.int(3, 15);
      c = Math.sqrt(a * a + b * b);
      if (Number.isInteger(c)) b += 1;
      c = Math.sqrt(a * a + b * b);
    }
    const exact = Number.isInteger(c);
    const fig = rightTriangle(a, b, { a: `${a} ${unit}`, b: `${b} ${unit}`, c: 'x' });
    const sum = a * a + b * b;
    return {
      type: 'numeric',
      prompt: `Find the length of the hypotenuse, $x$.${exact ? '' : ' Give your answer to 1 decimal place.'}`,
      figure: { svg: fig.svg, alt: `Right-angled triangle with shorter sides ${a} ${unit} and ${b} ${unit}; the hypotenuse is labelled x.` },
      answer: exact ? c : round(c, 1),
      ...(exact ? {} : { decimals: 1 }),
      units: unit,
      calculator: 'allowed',
      hints: [
        'The hypotenuse is the longest side, opposite the right angle.',
        `Use $c^2 = a^2 + b^2$: square the two shorter sides and add them.`,
      ],
      solution: [
        `$x^2 = ${a}^2 + ${b}^2 = ${a * a} + ${b * b} = ${tex(sum)}$`,
        `$x = \\sqrt{${tex(sum)}} ${exact ? '=' : '\\approx'} ${exact ? c : num(round(c, 1), 1)}$ ${unit}`,
      ].join('\n\n'),
    };
  },
};

export const checkRightAngle: QuestionTemplate = {
  id: 'm9.mea.pythagoras.check-right-angle',
  topicId: 'm9.mea.pythagoras',
  title: 'Is the triangle right-angled?',
  difficulties: [3],
  generate({ rng }) {
    const t = rng.pick(TRIPLES);
    const k = rng.pick([1, 1, 2, 3]);
    const [a, b] = [t[0] * k, t[1] * k];
    let c = t[2] * k;
    const isRight = rng.chance(0.5);
    if (!isRight) c += rng.pick([-1, 1]);
    const sides = rng.shuffle([a, b, c]);
    const sumSq = a * a + b * b;
    const options = [
      { id: 'yes', text: 'Yes, it is right-angled' },
      { id: 'no', text: 'No, it is not right-angled' },
    ];
    return {
      type: 'mcq',
      prompt: `A triangle has sides of length ${sides.join(' cm, ')} cm. Is it a right-angled triangle?`,
      options,
      correct: isRight ? 'yes' : 'no',
      shuffle: false,
      calculator: 'allowed',
      hints: [
        'The longest side would have to be the hypotenuse.',
        'Check whether the squares of the two shorter sides add up to the square of the longest side.',
      ],
      solution: [
        `The longest side is ${c} cm.`,
        `$${a}^2 + ${b}^2 = ${a * a} + ${b * b} = ${sumSq}$ and $${c}^2 = ${c * c}$.`,
        isRight
          ? `These are equal, so by Pythagoras' theorem the triangle **is** right-angled.`
          : `These are not equal, so the triangle is **not** right-angled.`,
      ].join('\n\n'),
    };
  },
};
