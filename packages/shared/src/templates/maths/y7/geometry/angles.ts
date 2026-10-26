import type { QuestionTemplate, TemplateOutput } from '../../../types';
import type { Rng } from '../../../../rng';
import {
  deg,
  drawnAngle,
  raysFigure,
  sectorValue,
  SECTOR_WORDS,
  SECTORS,
  spread,
  transversalFigure,
  type RayArc,
  type Sector,
  type TransversalMark,
} from './angles-helpers';

// m7.geo.angles templates: complementary and supplementary angles, vertically opposite and
// adjacent angles, parallel lines with a transversal (corresponding and alternate angles),
// simple angle equations, and choosing the right reason. Figures are never drawn to scale.

const NUM = { type: 'numeric' as const, units: '°', calculator: 'not-allowed' as const };

/** Plain-text tex for an expression like 2x + 15 or 3x − 10 (for prompts in $…$). */
function texExpr(p: number, b: number): string {
  const xs = p === 1 ? 'x' : `${p}x`;
  if (b === 0) return xs;
  return `${xs} ${b < 0 ? '-' : '+'} ${Math.abs(b)}`;
}

/** Figure label for an expression angle: "2x°", "(x + 40)°". */
function figExpr(p: number, b: number): string {
  const xs = p === 1 ? 'x' : `${p}x`;
  if (b === 0) return `${xs}°`;
  return `(${xs} ${b < 0 ? '−' : '+'} ${Math.abs(b)})°`;
}

/** Substitution working: "2 \times 35 + 15 = 85". */
function substTex(p: number, b: number, x: number): string {
  const prod = p === 1 ? `${x}` : `${p} \\times ${x}`;
  const val = p * x + b;
  return b === 0 ? `${prod} = ${val}` : `${prod} ${b < 0 ? '-' : '+'} ${Math.abs(b)} = ${val}`;
}

/** Directions for consecutive angles starting at `start`. */
function directionsFor(start: number, sizes: number[]): number[] {
  const dirs = [start];
  let acc = start;
  for (const s of sizes) {
    acc += s;
    dirs.push(acc);
  }
  return dirs;
}

// ---------------------------------------------------------------- complementary and supplementary

export const complementSupplement: QuestionTemplate = {
  id: 'm7.geo.angles.complement-supplement',
  topicId: 'm7.geo.angles',
  title: 'Complementary and supplementary angles',
  difficulties: [1, 2],
  generate({ rng, difficulty }): TemplateOutput {
    const comp = rng.chance(0.5);
    if (difficulty === 1) {
      let a: number;
      do a = comp ? rng.int(8, 82) : rng.int(12, 168);
      while (a === 45 || a === 90);
      const total = comp ? 90 : 180;
      const ans = total - a;
      const word = comp ? 'complementary' : 'supplementary';
      const noun = comp ? 'complement' : 'supplement';
      const prompt = rng.chance(0.5)
        ? `Two angles are **${word}**. One of them is ${a}°. What is the size of the other angle?`
        : `What is the **${noun}** of ${a}°?`;
      return {
        ...NUM,
        prompt,
        answer: ans,
        hints: [
          comp
            ? 'Complementary angles add up to 90°, like the two parts of a right angle.'
            : 'Supplementary angles add up to 180°, like the two parts of a straight line.',
          `Take ${a}° away from the total.`,
        ],
        solution: `${comp ? 'Complementary' : 'Supplementary'} angles add to ${total}°.\n\n$${total}° - ${a}° = ${ans}°$`,
      };
    }

    // difficulty 2: read it from a diagram.
    const knownFirst = rng.chance(0.5);
    if (comp) {
      const a = rng.int(15, 75);
      const x = 90 - a;
      const tilt = rng.pick([0, 0, 5, 10, -5, -10]);
      const first = knownFirst ? a : x;
      const d = Math.max(24, Math.min(66, first + rng.pick([-8, -5, 5, 8])));
      const arcs: RayArc[] = [
        { from: tilt, to: tilt + d, text: knownFirst ? deg(a) : 'x' },
        { from: tilt + d, to: tilt + 90, text: knownFirst ? 'x' : deg(a) },
      ];
      return {
        ...NUM,
        prompt: 'The two outer arms are **perpendicular**: they meet at a right angle. Find the size of angle $x$.',
        figure: {
          svg: raysFigure([tilt, tilt + d, tilt + 90], arcs, { rightAngle: [tilt, tilt + 90], centre: { x: 120, y: 215 }, length: 165, height: 250 }),
          alt: `A right angle split into two parts by a line from the corner. One part is ${a}° and the other is x.`,
        },
        answer: x,
        hints: ['The square in the corner means the whole angle is a right angle.', 'The two parts are complementary: they add up to 90°.'],
        solution: `The two parts make a right angle, so they add to 90° (complementary angles).\n\n$x = 90° - ${a}° = ${x}°$`,
      };
    }
    let a: number;
    do a = rng.int(20, 160);
    while (Math.abs(a - 90) < 6);
    const x = 180 - a;
    const first = knownFirst ? a : x;
    const d = drawnAngle(rng, first, 25, 155);
    const arcs: RayArc[] = [
      { from: 0, to: d, text: knownFirst ? deg(a) : 'x' },
      { from: d, to: 180, text: knownFirst ? 'x' : deg(a) },
    ];
    return {
      ...NUM,
      prompt: 'The bottom line is a straight line. Find the size of angle $x$.',
      figure: { svg: raysFigure([0, 180, d], arcs, { straight: true }), alt: `A straight line with a line coming out of a point on it, making angles of ${a}° and x.` },
      answer: x,
      hints: ['The two angles sit next to each other on a straight line.', 'Angles on a straight line are supplementary: they add up to 180°.'],
      solution: `Angles on a straight line add to 180° (supplementary angles).\n\n$x = 180° - ${a}° = ${x}°$`,
    };
  },
};

// ---------------------------------------------------------------- crossing lines

export const crossingLines: QuestionTemplate = {
  id: 'm7.geo.angles.crossing-lines',
  topicId: 'm7.geo.angles',
  title: 'Vertically opposite and adjacent angles where lines cross',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }): TemplateOutput {
    const tilt = rng.int(-15, 15);
    if (difficulty <= 2) {
      let a: number;
      do a = rng.int(25, 155);
      while (Math.abs(a - 90) < 6);
      const da = drawnAngle(rng, a, 30, 150);
      const dirs = [tilt, tilt + da, tilt + 180, tilt + 180 + da];
      if (difficulty === 1) {
        const arcs: RayArc[] = [
          { from: tilt, to: tilt + da, text: deg(a) },
          { from: tilt + 180, to: tilt + 180 + da, text: 'x' },
        ];
        return {
          ...NUM,
          prompt: 'Two straight lines cross. Find the size of angle $x$.',
          figure: { svg: raysFigure(dirs, arcs), alt: `Two straight lines crossing. One angle is ${a}° and the angle directly opposite it is x.` },
          answer: a,
          hints: ['Angle $x$ is directly across from the angle you know.', 'Vertically opposite angles are equal.'],
          solution: `Angle $x$ and the ${a}° angle are **vertically opposite**, and vertically opposite angles are equal.\n\nSo $x = ${a}°$.`,
        };
      }
      const upper = rng.chance(0.5);
      const arcs: RayArc[] = [
        { from: tilt, to: tilt + da, text: deg(a) },
        upper ? { from: tilt + da, to: tilt + 180, text: 'y' } : { from: tilt + 180 + da, to: tilt + 360, text: 'y' },
      ];
      return {
        ...NUM,
        prompt: 'Two straight lines cross. Find the size of angle $y$.',
        figure: { svg: raysFigure(dirs, arcs), alt: `Two straight lines crossing. One angle is ${a}° and angle y is next to it.` },
        answer: 180 - a,
        hints: ['Angle $y$ is next to the angle you know. Together they make a straight line.', 'Angles on a straight line add up to 180°.'],
        solution: `Angle $y$ and the ${a}° angle are **adjacent** angles on a straight line, so they add to 180°.\n\n$y = 180° - ${a}° = ${180 - a}°$`,
      };
    }

    // difficulty 3: three lines through one point.
    let a: number;
    let b: number;
    let c: number;
    do {
      a = rng.int(25, 100);
      b = rng.int(25, 100);
      c = 180 - a - b;
    } while (c < 25 || c > 110 || a === b || b === c || a === c);
    const [sa, sb, sc] = spread([a, b, c].map((v) => drawnAngle(rng, v, 25, 115)), 180, 25, 115) as [number, number, number];
    const dirs = [tilt, tilt + sa, tilt + sa + sb, tilt + 180, tilt + 180 + sa, tilt + 180 + sa + sb];
    const missingMiddle = rng.chance(0.5);
    // Given two angles on one side of a line; x is opposite the third one.
    const arcs: RayArc[] = missingMiddle
      ? [
          { from: tilt, to: tilt + sa, text: deg(a) },
          { from: tilt + sa + sb, to: tilt + 180, text: deg(c) },
          { from: tilt + 180 + sa, to: tilt + 180 + sa + sb, text: 'x' },
        ]
      : [
          { from: tilt, to: tilt + sa, text: deg(a) },
          { from: tilt + sa, to: tilt + sa + sb, text: deg(b) },
          { from: tilt + 180 + sa + sb, to: tilt + 360, text: 'x' },
        ];
    const ans = missingMiddle ? b : c;
    const k1 = a;
    const k2 = missingMiddle ? c : b;
    return {
      ...NUM,
      marks: 2,
      prompt: 'Three straight lines cross at one point. Find the size of angle $x$.',
      figure: {
        svg: raysFigure(dirs, arcs),
        alt: missingMiddle
          ? `Three straight lines crossing at a point, making six angles. Along one side of a line the angles are ${a}°, an unmarked angle, then ${c}°. Angle x is opposite the unmarked angle.`
          : `Three straight lines crossing at a point, making six angles. Along one side of a line the angles are ${a}°, ${b}°, then an unmarked angle. Angle x is opposite the unmarked angle.`,
      },
      answer: ans,
      hints: [
        'Find the angle that is vertically opposite $x$ first.',
        'That angle sits on a straight line with the two angles you know. Angles on a straight line add to 180°.',
      ],
      solution: [
        `The angle vertically opposite $x$ is on a straight line with the ${k1}° and ${k2}° angles.`,
        `Angles on a straight line add to 180°: $180° - ${k1}° - ${k2}° = ${ans}°$.`,
        `Vertically opposite angles are equal, so $x = ${ans}°$.`,
      ].join('\n\n'),
    };
  },
};

// ---------------------------------------------------------------- parallel lines

type Pair = 'corresponding' | 'alternate' | 'two-step';

function pairType(i: Sector, j: Sector): Pair {
  if (i === j) return 'corresponding';
  if ((i === 2 && j === 0) || (i === 3 && j === 1)) return 'alternate';
  return 'two-step';
}

function pickTheta(rng: Rng): number {
  let t: number;
  do t = rng.int(35, 145);
  while (Math.abs(t - 90) < 10);
  return t;
}

/** Steps from a known angle in sector i at one crossing to sector j at the other. */
function twoStep(theta: number, i: Sector, j: Sector, given: number, givenAtTop: boolean): { steps: string[]; value: number } {
  const via = sectorValue(theta, i);
  const other = givenAtTop ? 'bottom' : 'top';
  const steps = [`The angle in the same position at the ${other} crossing is also ${given}° (corresponding angles are equal).`];
  if ((j - i + 4) % 4 === 2) {
    steps.push(`Angle $x$ is vertically opposite that angle, so $x = ${via}°$ (vertically opposite angles are equal).`);
    return { steps, value: via };
  }
  steps.push(`Angle $x$ is next to that angle on a straight line, so $x = 180° - ${via}° = ${180 - via}°$ (angles on a straight line add to 180°).`);
  return { steps, value: 180 - via };
}

export const parallelLines: QuestionTemplate = {
  id: 'm7.geo.angles.parallel-lines',
  topicId: 'm7.geo.angles',
  title: 'Corresponding and alternate angles with parallel lines',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }): TemplateOutput {
    const theta = pickTheta(rng);
    const phi = drawnAngle(rng, theta, 40, 140);
    const intro = 'The lines marked with arrows are **parallel**.';

    if (difficulty === 2) {
      if (rng.chance(0.4)) {
        // Name the pair.
        const kind = rng.pick(['corresponding', 'alternate', 'vertically-opposite', 'straight-line'] as const);
        let marks: TransversalMark[];
        if (kind === 'corresponding') {
          const s = rng.pick(SECTORS);
          marks = [
            { at: 'P', sector: s, text: 'a' },
            { at: 'Q', sector: s, text: 'b' },
          ];
        } else if (kind === 'alternate') {
          const [i, j] = rng.pick([
            [2, 0],
            [3, 1],
          ] as const);
          marks = [
            { at: 'P', sector: i, text: 'a' },
            { at: 'Q', sector: j, text: 'b' },
          ];
        } else {
          const at = rng.pick(['P', 'Q'] as const);
          const s = rng.pick(SECTORS);
          const t = ((s + (kind === 'vertically-opposite' ? 2 : rng.pick([1, 3]))) % 4) as Sector;
          marks = [
            { at, sector: s, text: 'a' },
            { at, sector: t, text: 'b' },
          ];
        }
        const value = sectorValue(theta, marks[0]!.sector);
        return {
          type: 'mcq',
          prompt: `${intro} Angle $a$ is ${value}°. What type of angle pair are $a$ and $b$?`,
          figure: {
            svg: transversalFigure(phi, marks),
            alt: `Two parallel lines crossed by a third line. Angle a is ${marks[0]!.at === 'P' ? 'at the top crossing' : 'at the bottom crossing'}, ${SECTOR_WORDS[marks[0]!.sector]}. Angle b is ${marks[1]!.at === 'P' ? 'at the top crossing' : 'at the bottom crossing'}, ${SECTOR_WORDS[marks[1]!.sector]}.`,
          },
          options: [
            { id: 'corresponding', text: 'Corresponding angles' },
            { id: 'alternate', text: 'Alternate angles' },
            { id: 'vertically-opposite', text: 'Vertically opposite angles' },
            { id: 'straight-line', text: 'Adjacent angles on a straight line' },
          ],
          correct: kind,
          feedback: {
            corresponding: 'Corresponding angles are at different crossings, in the same position at each one (an F shape).',
            alternate: 'Alternate angles are at different crossings, between the parallel lines, on opposite sides of the crossing line (a Z shape).',
            'vertically-opposite': 'Vertically opposite angles are at the same crossing, directly across from each other.',
            'straight-line': 'Adjacent angles on a straight line are at the same crossing, side by side, and add to 180°.',
          },
          calculator: 'not-allowed',
          hints: ['Are $a$ and $b$ at the same crossing, or at different crossings?', 'F shape: same position at each crossing. Z shape: between the parallel lines, on opposite sides.'],
          solution: {
            corresponding: `$a$ and $b$ are in the **same position** at each crossing (an F shape), so they are **corresponding angles**. Corresponding angles are equal, so $b = ${value}°$ too.`,
            alternate: `$a$ and $b$ are between the parallel lines, on opposite sides of the crossing line (a Z shape), so they are **alternate angles**. Alternate angles are equal, so $b = ${value}°$ too.`,
            'vertically-opposite': `$a$ and $b$ are at the same crossing, directly across from each other, so they are **vertically opposite angles**. They are equal, so $b = ${value}°$ too.`,
            'straight-line': `$a$ and $b$ are side by side at the same crossing, so they are **adjacent angles on a straight line**. They add to 180°, so $b = ${180 - value}°$.`,
          }[kind],
        };
      }
      // Find x: one step (corresponding or alternate).
      const type = rng.pick(['corresponding', 'alternate'] as const);
      let i: Sector;
      let j: Sector;
      if (type === 'corresponding') i = j = rng.pick(SECTORS);
      else [i, j] = rng.pick([[2, 0], [3, 1]] as const);
      const givenAtP = rng.chance(0.5);
      const v = sectorValue(theta, i);
      const marks: TransversalMark[] = givenAtP
        ? [
            { at: 'P', sector: i, text: deg(v) },
            { at: 'Q', sector: j, text: 'x' },
          ]
        : [
            { at: 'Q', sector: j, text: deg(v) },
            { at: 'P', sector: i, text: 'x' },
          ];
      return {
        ...NUM,
        prompt: `${intro} Find the size of angle $x$.`,
        figure: { svg: transversalFigure(phi, marks), alt: `Two parallel lines crossed by a third line. One angle is ${v}° and the ${type} angle at the other crossing is x.` },
        answer: v,
        hints: ['Is angle $x$ in the same position as the angle you know (F shape), or between the lines on the opposite side (Z shape)?', 'Corresponding angles are equal. Alternate angles are equal.'],
        solution:
          type === 'corresponding'
            ? `Angle $x$ is in the same position at its crossing as the ${v}° angle (an F shape). They are **corresponding angles**, and corresponding angles are equal.\n\nSo $x = ${v}°$.`
            : `Angle $x$ and the ${v}° angle are between the parallel lines, on opposite sides of the crossing line (a Z shape). They are **alternate angles**, and alternate angles are equal.\n\nSo $x = ${v}°$.`,
      };
    }

    // d3 and d4: two steps.
    let i: Sector;
    let j: Sector;
    do {
      i = rng.pick(SECTORS);
      j = rng.pick(SECTORS);
    } while (pairType(i, j) !== 'two-step');
    const givenAtP = rng.chance(0.5);
    const g = sectorValue(theta, i);
    const { steps, value } = twoStep(theta, i, j, g, givenAtP);

    if (difficulty === 3) {
      const marks: TransversalMark[] = [
        { at: givenAtP ? 'P' : 'Q', sector: i, text: deg(g) },
        { at: givenAtP ? 'Q' : 'P', sector: j, text: 'x' },
      ];
      return {
        ...NUM,
        marks: 2,
        prompt: `${intro} Find the size of angle $x$. You will need two steps.`,
        figure: { svg: transversalFigure(phi, marks), alt: `Two parallel lines crossed by a third line. One angle is ${g}° at one crossing, and angle x is at the other crossing in a different position.` },
        answer: value,
        hints: [
          'First copy the angle you know to the other crossing, in the same position (corresponding angles).',
          'Then use vertically opposite angles or angles on a straight line at that crossing.',
        ],
        solution: steps.join('\n\n'),
      };
    }

    // d4: find x and y.
    const k = ((j + rng.pick([1, 3])) % 4) as Sector;
    const y = 180 - value;
    const marks: TransversalMark[] = [
      { at: givenAtP ? 'P' : 'Q', sector: i, text: deg(g) },
      { at: givenAtP ? 'Q' : 'P', sector: j, text: 'x' },
      { at: givenAtP ? 'Q' : 'P', sector: k, text: 'y' },
    ];
    return {
      type: 'cloze',
      marks: 2,
      prompt: `${intro} Find the sizes of angles $x$ and $y$.\n\n$x$ = [[x]]°\n\n$y$ = [[y]]°`,
      figure: { svg: transversalFigure(phi, marks), alt: `Two parallel lines crossed by a third line. One angle is ${g}° at one crossing. Angles x and y are next to each other at the other crossing.` },
      blanks: [
        { id: 'x', accepted: [String(value), `${value} degrees`] },
        { id: 'y', accepted: [String(y), `${y} degrees`] },
      ],
      calculator: 'not-allowed',
      hints: [
        'Start by copying the angle you know to the other crossing, in the same position (corresponding angles).',
        'Angles $x$ and $y$ sit side by side on a straight line.',
      ],
      solution: [...steps, `Angles $x$ and $y$ are on a straight line, so $y = 180° - ${value}° = ${y}°$.`].join('\n\n'),
    };
  },
};

// ---------------------------------------------------------------- angle equations

export const angleEquations: QuestionTemplate = {
  id: 'm7.geo.angles.equations',
  topicId: 'm7.geo.angles',
  title: 'Write and solve an equation to find an unknown angle',
  difficulties: [3, 4, 5],
  generate({ rng, difficulty }): TemplateOutput {
    if (difficulty === 3) {
      // Two angles making a right angle or a straight line.
      const total = rng.pick([90, 180] as const);
      const form = rng.pick(['kx', 'x+b', 'kx+b'] as const);
      let x = 0;
      let k = 1;
      let b = 0;
      for (;;) {
        k = form === 'x+b' ? 1 : rng.int(2, form === 'kx' ? 5 : 3);
        x = rng.int(total === 90 ? 8 : 15, total === 90 ? 40 : 80);
        b = form === 'kx' ? 0 : total - (k + 1) * x;
        if (form === 'kx' && (k + 1) * x !== total) continue;
        if (form !== 'kx' && (b < 5 || k * x + b > total - 12)) continue;
        if (x < 10 || k * x + b < 10) continue;
        break;
      }
      const big = k * x + b;
      const knownFirst = rng.chance(0.5);
      const sizes = [x, big];
      const drawn = spread(sizes.map((v) => v + rng.pick([-6, 6])), total, total === 90 ? 22 : 30, total === 90 ? 68 : 150);
      const order = knownFirst ? [0, 1] : [1, 0];
      const texts = ['x°', figExpr(k, b)];
      const s0 = drawn[order[0]!]!;
      const arcs: RayArc[] = [
        { from: 0, to: s0, text: texts[order[0]!]! },
        { from: s0, to: total, text: texts[order[1]!]! },
      ];
      const fig =
        total === 90
          ? raysFigure([0, s0, 90], arcs, { rightAngle: [0, 90], centre: { x: 120, y: 215 }, length: 165, height: 250 })
          : raysFigure([0, s0, 180], arcs, { straight: true });
      const eq = `x + ${texExpr(k, b)} = ${total}`;
      const collected = `${k + 1}x${b ? ` + ${b}` : ''} = ${total}`;
      return {
        type: 'numeric',
        marks: 2,
        prompt: `${total === 90 ? 'The angle is a right angle.' : 'The bottom line is a straight line.'} Write an equation and solve it to find the value of $x$.`,
        figure: { svg: fig, alt: `${total === 90 ? 'A right angle' : 'A straight line'} split into two angles, x° and ${figExpr(k, b)}.` },
        answer: x,
        calculator: 'not-allowed',
        hints: [
          total === 90 ? 'The two angles add up to 90°.' : 'The two angles add up to 180°.',
          'Add the two angles together and set them equal to the total. Collect the $x$ terms, then solve.',
        ],
        solution: [
          `The angles add to ${total}° (${total === 90 ? 'complementary angles' : 'angles on a straight line'}):`,
          `$${eq}$`,
          `Collect like terms: $${collected}$`,
          b ? `Subtract ${b} from both sides: $${k + 1}x = ${total - b}$` : '',
          `Divide both sides by ${k + 1}: $x = ${x}$`,
          `Check: $${x}° + ${big}° = ${total}°$ ✓`,
        ]
          .filter(Boolean)
          .join('\n\n'),
      };
    }

    if (difficulty === 4) {
      // Three angles on a straight line, or around a point.
      const around = rng.chance(0.4);
      const total = around ? 360 : 180;
      let x = 0;
      let k = 1;
      let c = 0;
      let c2 = 0;
      for (;;) {
        k = rng.int(1, 3);
        x = rng.int(around ? 20 : 15, around ? 70 : 50);
        if (around) {
          c2 = rng.pick([90, 100, 110, 120, 80, 70]);
          c = total - (k + 1) * x - c2;
          if (c < 30 || c > 160 || k * x > 160) continue;
        } else {
          c = total - (k + 1) * x;
          if (c < 20 || c > 120 || k * x > 120) continue;
        }
        if (x % 5 !== 0 && rng.chance(0.5)) continue;
        break;
      }
      const values = around ? [x, k * x, c, c2] : [x, k * x, c];
      const texts = around ? ['x°', k === 1 ? 'x°' : `${k}x°`, deg(c), deg(c2)] : ['x°', k === 1 ? 'x°' : `${k}x°`, deg(c)];
      const order = rng.shuffle(values.map((_, i) => i));
      const drawn = spread(order.map((i) => values[i]! + rng.pick([-6, 6])), total, 28, around ? 160 : 120);
      const start = around ? rng.int(0, 7) * 45 + 10 : 0;
      const dirs = directionsFor(start, drawn);
      const arcs: RayArc[] = order.map((idx, n) => ({ from: dirs[n]!, to: dirs[n + 1]!, text: texts[idx]! }));
      const rays = around ? dirs.slice(0, -1) : [0, ...dirs.slice(1, -1), 180];
      const fig = around ? raysFigure(rays, arcs) : raysFigure(rays, arcs, { straight: true });
      const consts = around ? c + c2 : c;
      const eqParts = around ? `x + ${k === 1 ? 'x' : `${k}x`} + ${c} + ${c2} = 360` : `x + ${k === 1 ? 'x' : `${k}x`} + ${c} = 180`;
      return {
        type: 'numeric',
        marks: 2,
        prompt: around
          ? 'The angles are around a point. Write an equation and solve it to find the value of $x$.'
          : 'The bottom line is a straight line. Write an equation and solve it to find the value of $x$.',
        figure: { svg: fig, alt: `${around ? 'Four angles around a point' : 'Three angles on a straight line'}: ${texts.join(', ')}.` },
        answer: x,
        calculator: 'not-allowed',
        hints: [
          around ? 'Angles around a point add up to 360°.' : 'Angles on a straight line add up to 180°.',
          'Add all the angles and set them equal to the total. Collect the $x$ terms and the numbers, then solve.',
        ],
        solution: [
          `${around ? 'Angles around a point add to 360°' : 'Angles on a straight line add to 180°'}:`,
          `$${eqParts}$`,
          `Collect like terms: $${k + 1}x + ${consts} = ${total}$`,
          `Subtract ${consts} from both sides: $${k + 1}x = ${total - consts}$`,
          `Divide both sides by ${k + 1}: $x = ${x}$`,
          `Check: $${values.join('° + ')}° = ${total}°$ ✓`,
        ].join('\n\n'),
      };
    }

    // difficulty 5
    if (rng.chance(0.5)) {
      // Two expressions on a straight line or in a right angle; find x and the larger angle.
      const total = rng.chance(0.65) ? 180 : 90;
      let x = 0;
      let p = 1;
      let q = 1;
      let b = 0;
      let c = 0;
      for (;;) {
        p = rng.int(1, 4);
        q = rng.int(1, 4);
        x = rng.int(total === 90 ? 6 : 10, total === 90 ? 20 : 40);
        b = rng.int(-20, 40);
        c = total - (p + q) * x - b;
        const A = p * x + b;
        const B = q * x + c;
        if (b === 0 || c === 0 || Math.abs(c) > 50 || A === B) continue;
        if (A < 15 || B < 15 || (b + c === 0 && rng.chance(0.8))) continue;
        break;
      }
      const A = p * x + b;
      const B = q * x + c;
      const larger = Math.max(A, B);
      const largerExpr = A > B ? figExpr(p, b) : figExpr(q, c);
      const drawn = spread([A, B].map((v) => v + rng.pick([-6, 6])), total, total === 90 ? 22 : 30, total === 90 ? 68 : 150);
      const arcs: RayArc[] = [
        { from: 0, to: drawn[0]!, text: figExpr(p, b) },
        { from: drawn[0]!, to: total, text: figExpr(q, c) },
      ];
      const fig =
        total === 90
          ? raysFigure([0, drawn[0]!, 90], arcs, { rightAngle: [0, 90], centre: { x: 120, y: 215 }, length: 165, height: 250 })
          : raysFigure([0, drawn[0]!, 180], arcs, { straight: true });
      const sumConst = b + c;
      return {
        type: 'cloze',
        marks: 3,
        prompt: `${total === 90 ? 'The angle is a right angle.' : 'The bottom line is a straight line.'} Find the value of $x$, then the size of the larger angle.\n\n$x$ = [[x]]\n\nLarger angle = [[a]]°`,
        figure: { svg: fig, alt: `${total === 90 ? 'A right angle' : 'A straight line'} split into two angles, ${figExpr(p, b)} and ${figExpr(q, c)}.` },
        blanks: [
          { id: 'x', accepted: [String(x)] },
          { id: 'a', accepted: [String(larger), `${larger} degrees`] },
        ],
        calculator: 'not-allowed',
        hints: [
          `The two angles add up to ${total}°. Write that as an equation.`,
          'Collect the $x$ terms and the numbers first. Once you know $x$, substitute it into each expression.',
        ],
        solution: [
          `The angles add to ${total}°: $${texExpr(p, b)} + ${texExpr(q, c)} = ${total}$`,
          sumConst === 0
            ? `Collect like terms: $${p + q}x = ${total}$`
            : `Collect like terms: $${p + q}x ${sumConst < 0 ? '-' : '+'} ${Math.abs(sumConst)} = ${total}$`,
          sumConst === 0 ? '' : `${sumConst < 0 ? `Add ${-sumConst} to` : `Subtract ${sumConst} from`} both sides: $${p + q}x = ${total - sumConst}$`,
          `Divide by ${p + q}: $x = ${x}$`,
          `Substitute $x = ${x}$ into each angle: $${substTex(p, b, x)}$ and $${substTex(q, c, x)}$.`,
          `The larger angle is ${largerExpr} $= ${larger}°$. Check: $${A}° + ${B}° = ${total}°$ ✓`,
        ]
          .filter(Boolean)
          .join('\n\n'),
      };
    }

    // Parallel lines (or crossing lines) with one angle as an expression.
    const parallel = rng.chance(0.6);
    let x = 0;
    let p = 2;
    let b = 0;
    let g = 0;
    for (;;) {
      p = rng.int(2, 5);
      x = rng.int(8, 35);
      b = rng.int(-20, 30);
      g = p * x + b;
      if (b === 0 || g < 35 || g > 145 || Math.abs(g - 90) < 10) continue;
      break;
    }
    const expr = figExpr(p, b);
    const solveSteps = [
      `$${texExpr(p, b)} = ${g}$`,
      b < 0 ? `Add ${-b} to both sides: $${p}x = ${g - b}$` : `Subtract ${b} from both sides: $${p}x = ${g - b}$`,
      `Divide both sides by ${p}: $x = ${x}$`,
      `Check: $${p} \\times ${x} ${b < 0 ? '-' : '+'} ${Math.abs(b)} = ${g}$ ✓`,
    ];
    if (parallel) {
      const type = rng.pick(['corresponding', 'alternate'] as const);
      let i: Sector;
      let j: Sector;
      if (type === 'corresponding') i = j = rng.pick(SECTORS);
      else [i, j] = rng.pick([[2, 0], [3, 1]] as const);
      const theta = i % 2 === 0 ? g : 180 - g;
      const phi = drawnAngle(rng, theta, 40, 140);
      const exprAtP = rng.chance(0.5);
      const marks: TransversalMark[] = [
        { at: 'P', sector: i, text: exprAtP ? expr : deg(g) },
        { at: 'Q', sector: j, text: exprAtP ? deg(g) : expr },
      ];
      return {
        type: 'numeric',
        marks: 2,
        prompt: 'The lines marked with arrows are **parallel**. Write an equation and solve it to find the value of $x$.',
        figure: { svg: transversalFigure(phi, marks), alt: `Two parallel lines crossed by a third line. Two ${type} angles are labelled ${expr} and ${g}°.` },
        answer: x,
        calculator: 'not-allowed',
        hints: ['Decide how the two marked angles are related: corresponding (F shape) or alternate (Z shape)?', 'Those angles are equal, so set the expression equal to the number and solve.'],
        solution: [`The marked angles are **${type} angles**, so they are equal:`, ...solveSteps].join('\n\n'),
      };
    }
    const tilt = rng.int(-15, 15);
    const da = drawnAngle(rng, g, 30, 150);
    const dirs = [tilt, tilt + da, tilt + 180, tilt + 180 + da];
    const arcs: RayArc[] = [
      { from: tilt, to: tilt + da, text: deg(g) },
      { from: tilt + 180, to: tilt + 180 + da, text: expr },
    ];
    return {
      type: 'numeric',
      marks: 2,
      prompt: 'Two straight lines cross. Write an equation and solve it to find the value of $x$.',
      figure: { svg: raysFigure(dirs, arcs), alt: `Two straight lines crossing. An angle of ${g}° is vertically opposite the angle ${expr}.` },
      answer: x,
      calculator: 'not-allowed',
      hints: ['The two marked angles are directly opposite each other.', 'Vertically opposite angles are equal, so set the expression equal to the number and solve.'],
      solution: ['The marked angles are **vertically opposite**, so they are equal:', ...solveSteps].join('\n\n'),
    };
  },
};

// ---------------------------------------------------------------- giving reasons

type Reason = 'vo' | 'line' | 'comp' | 'point' | 'corr' | 'alt';

const REASON_TEXT: Record<Reason, string> = {
  vo: 'Vertically opposite angles are equal',
  line: 'Angles on a straight line add to 180°',
  comp: 'Angles that make a right angle add to 90°',
  point: 'Angles around a point add to 360°',
  corr: 'Corresponding angles are equal',
  alt: 'Alternate angles are equal',
};

const REASON_FEEDBACK: Record<Reason, string> = {
  vo: 'Vertically opposite angles are directly across from each other where two lines cross. Check where $a$ and $b$ are.',
  line: 'Angles on a straight line sit side by side along one straight line. Check whether $a$ and $b$ do that.',
  comp: 'This is for two angles that fill a right angle. There is no right angle split here.',
  point: 'Angles around a point go all the way round. Only two angles are being used here.',
  corr: 'Corresponding angles are at two different crossings of parallel lines, in the same position (F shape).',
  alt: 'Alternate angles are at two different crossings of parallel lines, between the lines on opposite sides (Z shape).',
};

export const angleReasons: QuestionTemplate = {
  id: 'm7.geo.angles.reasons',
  topicId: 'm7.geo.angles',
  title: 'Choose the reason for an angle fact',
  difficulties: [2, 3],
  generate({ rng, difficulty }): TemplateOutput {
    let correct: Reason;
    let figure: { svg: string; alt: string };
    let a: number;
    let b: number;
    if (difficulty === 2) {
      correct = rng.pick(['vo', 'line', 'comp'] as const);
      if (correct === 'comp') {
        a = rng.int(15, 75);
        b = 90 - a;
        const d = Math.max(24, Math.min(66, a + rng.pick([-8, -5, 5, 8])));
        figure = {
          svg: raysFigure([0, d, 90], [
            { from: 0, to: d, text: 'a' },
            { from: d, to: 90, text: 'b' },
          ], { rightAngle: [0, 90], centre: { x: 120, y: 215 }, length: 165, height: 250 }),
          alt: 'A right angle split into two angles, a and b.',
        };
      } else {
        do a = rng.int(25, 155);
        while (Math.abs(a - 90) < 6);
        b = correct === 'vo' ? a : 180 - a;
        const tilt = rng.int(-15, 15);
        const da = drawnAngle(rng, a, 30, 150);
        const arcs: RayArc[] = [
          { from: tilt, to: tilt + da, text: 'a' },
          correct === 'vo' ? { from: tilt + 180, to: tilt + 180 + da, text: 'b' } : { from: tilt + da, to: tilt + 180, text: 'b' },
        ];
        figure = {
          svg: raysFigure([tilt, tilt + da, tilt + 180, tilt + 180 + da], arcs),
          alt: `Two straight lines crossing. Angle b is ${correct === 'vo' ? 'directly opposite' : 'next to'} angle a.`,
        };
      }
    } else {
      correct = rng.pick(['corr', 'alt', 'vo', 'line'] as const);
      const theta = pickTheta(rng);
      const phi = drawnAngle(rng, theta, 40, 140);
      let marks: TransversalMark[];
      if (correct === 'corr') {
        const s = rng.pick(SECTORS);
        marks = [
          { at: 'P', sector: s, text: 'a' },
          { at: 'Q', sector: s, text: 'b' },
        ];
      } else if (correct === 'alt') {
        const [i, j] = rng.pick([[2, 0], [3, 1]] as const);
        marks = [
          { at: 'P', sector: i, text: 'a' },
          { at: 'Q', sector: j, text: 'b' },
        ];
      } else {
        const at = rng.pick(['P', 'Q'] as const);
        const s = rng.pick(SECTORS);
        const t = ((s + (correct === 'vo' ? 2 : rng.pick([1, 3]))) % 4) as Sector;
        marks = [
          { at, sector: s, text: 'a' },
          { at, sector: t, text: 'b' },
        ];
      }
      a = sectorValue(theta, marks[0]!.sector);
      b = sectorValue(theta, marks[1]!.sector);
      figure = {
        svg: transversalFigure(phi, marks),
        alt: `Two parallel lines crossed by a third line, with angles a and b marked. Angle a is ${marks[0]!.at === 'P' ? 'at the top crossing' : 'at the bottom crossing'}, ${SECTOR_WORDS[marks[0]!.sector]}. Angle b is ${marks[1]!.at === 'P' ? 'at the top crossing' : 'at the bottom crossing'}, ${SECTOR_WORDS[marks[1]!.sector]}.`,
      };
    }
    const pool: Reason[] = difficulty === 2 ? ['vo', 'line', 'comp', 'point', 'corr'] : ['corr', 'alt', 'vo', 'line'];
    const others = rng.sample(pool.filter((r) => r !== correct), 3);
    const opts = [correct, ...others];
    return {
      type: 'mcq',
      prompt: `${difficulty === 3 ? 'The lines marked with arrows are parallel. ' : ''}In the diagram, $a = ${a}°$ and $b = ${b}°$. Which reason explains how you can work out $b$ from $a$?`,
      figure,
      options: opts.map((r) => ({ id: r, text: REASON_TEXT[r] })),
      correct,
      feedback: Object.fromEntries(others.map((r) => [r, REASON_FEEDBACK[r]])),
      calculator: 'not-allowed',
      hints: [
        difficulty === 3 ? 'Are $a$ and $b$ at the same crossing or at different crossings?' : 'Look at where $a$ and $b$ sit: opposite each other, side by side on a line, or inside a right angle?',
        'Check the numbers too: are $a$ and $b$ equal, or do they add to a total?',
      ],
      solution: {
        vo: `$a$ and $b$ are directly across from each other where two lines cross, so they are **vertically opposite**. Vertically opposite angles are equal, so $b = a = ${a}°$.`,
        line: `$a$ and $b$ sit side by side on a straight line, so they add to 180°: $b = 180° - ${a}° = ${b}°$.`,
        comp: `$a$ and $b$ fill a right angle, so they add to 90° (they are complementary): $b = 90° - ${a}° = ${b}°$.`,
        point: '',
        corr: `$a$ and $b$ are in the same position at each crossing (an F shape), so they are **corresponding angles**. Corresponding angles are equal, so $b = ${a}°$.`,
        alt: `$a$ and $b$ are between the parallel lines on opposite sides of the crossing line (a Z shape), so they are **alternate angles**. Alternate angles are equal, so $b = ${a}°$.`,
      }[correct],
    };
  },
};

export const templates: QuestionTemplate[] = [complementSupplement, crossingLines, parallelLines, angleEquations, angleReasons];
