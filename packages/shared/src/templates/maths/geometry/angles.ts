import type { QuestionTemplate, TemplateOutput } from '../../types';
import type { Rng } from '../../../rng';
import { dot, label, line, polygon, svgDoc, type Pt } from '../../svg';
import { arcWithLabel, equalTick, notToScale, parallelMarks, polar } from '../measurement/figures';

// m9.geo.angles-parallel — basic angle facts (straight line, around a point, vertically
// opposite, triangles) and angles formed by a transversal crossing parallel lines.
// Figures are never drawn to scale: drawn angles are nudged away from the true values.

/** A drawn angle near `actual` (but not equal to it), staying on the same side of 90°. */
function drawn(rng: Rng, actual: number, lo = 25, hi = 155): number {
  let d = actual + rng.pick([-14, -10, -7, 7, 10, 14]);
  if (actual < 90) d = Math.min(d, 80);
  if (actual > 90) d = Math.max(d, 100);
  return Math.max(lo, Math.min(hi, d));
}

const deg = (n: number | string) => `${n}°`;

// ---------------------------------------------------------------- basic angle facts

/** Rays from V in the given screen directions (degrees), arcs between consecutive pairs. */
function raysFigure(directions: number[], arcs: Array<{ from: number; to: number; text: string }>, opts: { straight?: boolean } = {}) {
  const V: Pt = { x: 190, y: opts.straight ? 175 : 135 };
  const L = 140;
  let body = '';
  for (const d of directions) body += line(V, polar(V, L, d), { width: 2.2 });
  body += dot(V);
  for (const a of arcs) body += arcWithLabel(V, polar(V, 50, a.from), polar(V, 50, a.to), a.text, 26);
  const h = opts.straight ? 215 : 275;
  body += notToScale({ x: 372, y: h - 10 });
  return svgDoc(380, h, body);
}

/** Triangle with drawn base angles dA (left) and dB (right), scaled to fit the figure. */
function triangleShape(dA: number, dB: number): [Pt, Pt, Pt] {
  // Base from (0,0) to (1,0); apex where rays at angles dA and 180° − dB meet (y up).
  const ta = Math.tan((dA * Math.PI) / 180);
  const tb = Math.tan((dB * Math.PI) / 180);
  const ax = tb / (ta + tb);
  const ay = Math.min(ax * ta, 1.1); // squash very tall triangles (not to scale anyway)
  const raw: Pt[] = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: ax, y: ay },
  ];
  const minX = Math.min(...raw.map((p) => p.x));
  const maxX = Math.max(...raw.map((p) => p.x));
  const s = Math.min(270 / (maxX - minX), 175 / ay);
  const pts = raw.map((p) => ({ x: 50 + (p.x - minX) * s, y: 215 - p.y * s }));
  return [pts[0]!, pts[1]!, pts[2]!];
}

/** Scales positive sizes to a total, keeping each within [lo, hi]. */
function spread(values: number[], total: number, lo: number, hi: number): number[] {
  let v = [...values];
  for (let k = 0; k < 8; k++) {
    const sum = v.reduce((s, x) => s + x, 0);
    v = v.map((x) => Math.max(lo, Math.min(hi, (x * total) / sum)));
  }
  const sum = v.reduce((s, x) => s + x, 0);
  return v.map((x) => (x * total) / sum);
}

export const basicAngleFacts: QuestionTemplate = {
  id: 'm9.geo.angles-parallel.basic',
  topicId: 'm9.geo.angles-parallel',
  title: 'Basic angle facts: straight lines, points, vertically opposite, triangles',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }): TemplateOutput {
    const base = {
      type: 'numeric' as const,
      units: '°',
      calculator: 'not-allowed' as const,
    };
    if (difficulty === 1) {
      if (rng.chance(0.5)) {
        // Angles on a straight line.
        const a = rng.int(25, 155);
        const x = 180 - a;
        const da = drawn(rng, a);
        const right = rng.chance(0.5);
        const rayDir = right ? da : 180 - da;
        const arcs = right
          ? [
              { from: 0, to: rayDir, text: deg(a) },
              { from: rayDir, to: 180, text: 'x' },
            ]
          : [
              { from: 0, to: rayDir, text: 'x' },
              { from: rayDir, to: 180, text: deg(a) },
            ];
        return {
          ...base,
          prompt: 'Find the size of angle $x$.',
          figure: { svg: raysFigure([0, 180, rayDir], arcs, { straight: true }), alt: `A straight line with a ray from a point on it, making angles of ${a}° and x.` },
          answer: x,
          hints: ['The two angles sit together on a straight line.', 'Angles on a straight line add up to 180°.'],
          solution: `Angles on a straight line add to 180°.\n\n$x = 180° - ${a}° = ${x}°$`,
        };
      }
      // Vertically opposite.
      const a = rng.int(30, 150);
      const da = drawn(rng, a);
      const tilt = rng.int(-15, 15);
      const arcs = [
        { from: tilt, to: tilt + da, text: deg(a) },
        { from: tilt + 180, to: tilt + 180 + da, text: 'x' },
      ];
      return {
        ...base,
        prompt: 'Two straight lines cross. Find the size of angle $x$.',
        figure: { svg: raysFigure([tilt, tilt + da, tilt + 180, tilt + 180 + da], arcs), alt: `Two straight lines crossing. One angle is ${a}°; the angle opposite it is x.` },
        answer: a,
        hints: ['Angle $x$ is directly opposite the given angle.', 'Vertically opposite angles are equal.'],
        solution: `Vertically opposite angles are equal, so $x = ${a}°$.`,
      };
    }

    if (difficulty === 2) {
      if (rng.chance(0.5)) {
        // Angles around a point: 4 angles, each 40°–170°.
        let a: number;
        let b: number;
        let c: number;
        let x: number;
        do {
          a = rng.int(40, 150);
          b = rng.int(40, 150);
          c = rng.int(40, 150);
          x = 360 - a - b - c;
        } while (x < 40 || x > 170);
        const actual = [a, b, c, x];
        const sizes = spread(
          actual.map((v) => drawn(rng, v, 35, 165)),
          360,
          35,
          160,
        );
        const start = rng.int(0, 35) * 10;
        const dirs: number[] = [];
        let acc = start;
        for (const s of sizes) {
          dirs.push(acc);
          acc += s;
        }
        const texts = [deg(a), deg(b), deg(c), 'x'];
        const arcs = dirs.map((d, i) => ({ from: d, to: d + sizes[i]!, text: texts[i]! }));
        return {
          ...base,
          prompt: 'Find the size of angle $x$.',
          figure: { svg: raysFigure(dirs, arcs), alt: `Four angles around a point: ${a}°, ${b}°, ${c}° and x.` },
          answer: x,
          hints: ['The angles go all the way around the point.', 'Angles around a point add up to 360°.'],
          solution: `Angles around a point add to 360°.\n\n$x = 360° - ${a}° - ${b}° - ${c}° = ${x}°$`,
        };
      }
      // Angles in a triangle.
      let a: number;
      let b: number;
      do {
        a = rng.int(25, 85);
        b = rng.int(25, 85);
      } while (a + b > 150);
      const x = 180 - a - b;
      const [A, B, C] = triangleShape(drawn(rng, a, 30, 80), drawn(rng, b, 30, 80));
      let body = polygon([A, B, C]);
      body += arcWithLabel(A, B, C, deg(a), 28) + arcWithLabel(B, C, A, deg(b), 28) + arcWithLabel(C, A, B, 'x', 24);
      body += notToScale({ x: 372, y: 240 });
      return {
        ...base,
        prompt: 'Find the size of angle $x$ in this triangle.',
        figure: { svg: svgDoc(380, 250, body), alt: `A triangle with angles ${a}°, ${b}° and x.` },
        answer: x,
        hints: ['Angles in a triangle add up to 180°.'],
        solution: `Angles in a triangle add to 180°.\n\n$x = 180° - ${a}° - ${b}° = ${x}°$`,
      };
    }

    // difficulty 3: two-step facts.
    const kind = rng.pick(['isosceles', 'exterior', 'line3'] as const);
    if (kind === 'isosceles') {
      const askBase = rng.chance(0.5);
      const apex = 2 * rng.int(15, 65); // even, so base angles are whole
      const baseAngle = (180 - apex) / 2;
      const dBase = drawn(rng, baseAngle, 35, 78);
      const [A, B, C] = triangleShape(dBase, dBase);
      let body = polygon([A, B, C]) + equalTick(A, C) + equalTick(B, C);
      if (askBase) body += arcWithLabel(C, A, B, deg(apex), 26) + arcWithLabel(A, B, C, 'x', 28);
      else body += arcWithLabel(A, B, C, deg(baseAngle), 28) + arcWithLabel(C, A, B, 'x', 24);
      body += notToScale({ x: 372, y: 240 });
      return {
        ...base,
        prompt: 'This triangle is isosceles (the marked sides are equal). Find the size of angle $x$.',
        figure: { svg: svgDoc(380, 250, body), alt: askBase ? `An isosceles triangle with top angle ${apex}°; x is one of the base angles.` : `An isosceles triangle with base angle ${baseAngle}°; x is the top angle.` },
        answer: askBase ? baseAngle : apex,
        hints: ['In an isosceles triangle, the two angles at the base of the equal sides are equal.', 'The three angles still add up to 180°.'],
        solution: askBase
          ? `The two base angles are equal, and the angles in a triangle add to 180°.\n\n$x = (180° - ${apex}°) \\div 2 = ${baseAngle}°$`
          : `The two base angles are equal, so both are ${baseAngle}°.\n\n$x = 180° - ${baseAngle}° - ${baseAngle}° = ${apex}°$`,
      };
    }
    if (kind === 'exterior') {
      let a: number;
      let b: number;
      do {
        a = rng.int(30, 95);
        b = rng.int(30, 95);
      } while (a + b > 160);
      const x = a + b;
      const [A, B, C] = triangleShape(drawn(rng, b, 30, 85), drawn(rng, 180 - x, 25, 85));
      const ext: Pt = { x: B.x + 48, y: B.y };
      let body = polygon([A, B, C]) + line(B, ext);
      body += arcWithLabel(C, A, B, deg(a), 24) + arcWithLabel(A, B, C, deg(b), 28) + arcWithLabel(B, C, ext, 'x', 24);
      body += notToScale({ x: 372, y: 240 });
      return {
        ...base,
        prompt: 'One side of the triangle has been extended. Find the size of the exterior angle $x$.',
        figure: { svg: svgDoc(380, 250, body), alt: `A triangle with interior angles ${a}° and ${b}°. The base is extended and the exterior angle at the third corner is x.` },
        answer: x,
        hints: ['First find the third angle inside the triangle.', 'Then use angles on a straight line.'],
        solution: [
          `Third angle of the triangle: $180° - ${a}° - ${b}° = ${180 - x}°$ (angles in a triangle).`,
          `$x = 180° - ${180 - x}° = ${x}°$ (angles on a straight line).`,
          `Notice that $x = ${a}° + ${b}°$: an exterior angle equals the sum of the two opposite interior angles.`,
        ].join('\n\n'),
      };
    }
    // Three angles on a straight line, one of them unknown.
    let a: number;
    let b: number;
    do {
      a = rng.int(25, 100);
      b = rng.int(25, 100);
    } while (a + b > 150);
    const x = 180 - a - b;
    const s = spread(
      [a, x, b].map((v) => drawn(rng, v, 25, 120)),
      180,
      25,
      120,
    );
    const dirs = [0, s[0]!, s[0]! + s[1]!, 180];
    const arcs = [
      { from: 0, to: dirs[1]!, text: deg(a) },
      { from: dirs[1]!, to: dirs[2]!, text: 'x' },
      { from: dirs[2]!, to: 180, text: deg(b) },
    ];
    return {
      ...base,
      prompt: 'Find the size of angle $x$.',
      figure: { svg: raysFigure(dirs, arcs, { straight: true }), alt: `Three angles on a straight line: ${a}°, x and ${b}°.` },
      answer: x,
      hints: ['All three angles sit on one straight line.', 'Angles on a straight line add up to 180°.'],
      solution: `Angles on a straight line add to 180°.\n\n$x = 180° - ${a}° - ${b}° = ${x}°$`,
    };
  },
};

// ---------------------------------------------------------------- parallel lines and a transversal

// Sector i at an intersection: 0 above-right, 1 above-left, 2 below-left, 3 below-right
// (anticlockwise from the right-hand ray). With transversal angle θ: sectors 0 and 2 are θ,
// sectors 1 and 3 are 180° − θ.
type Sector = 0 | 1 | 2 | 3;
type Pair = 'corresponding' | 'alternate' | 'co-interior' | 'two-step';

function pairType(i: Sector, j: Sector): Pair {
  if (i === j) return 'corresponding';
  if ((i === 2 && j === 0) || (i === 3 && j === 1)) return 'alternate';
  if ((i === 3 && j === 0) || (i === 2 && j === 1)) return 'co-interior';
  return 'two-step';
}

const sectorValue = (theta: number, s: Sector) => (s % 2 === 0 ? theta : 180 - theta);

interface Mark {
  at: 'P' | 'Q';
  sector: Sector;
  text: string;
}

function transversalFigure(phi: number, marks: Mark[], opts: { parallel?: boolean; names?: boolean } = {}) {
  const yP = 85;
  const yQ = 215;
  const P: Pt = { x: 200 + (yQ - yP) / Math.tan((phi * Math.PI) / 180) / 2, y: yP };
  const Q: Pt = { x: P.x - (yQ - yP) / Math.tan((phi * Math.PI) / 180), y: yQ };
  let body = '';
  body += line({ x: 30, y: yP }, { x: 370, y: yP }, { width: 2.2 });
  body += line({ x: 30, y: yQ }, { x: 370, y: yQ }, { width: 2.2 });
  if (opts.parallel !== false) {
    body += parallelMarks({ x: 300, y: yP }, { x: 350, y: yP }, 1) + parallelMarks({ x: 300, y: yQ }, { x: 350, y: yQ }, 1);
    body += parallelMarks({ x: 60, y: yP }, { x: 110, y: yP }, 1) + parallelMarks({ x: 60, y: yQ }, { x: 110, y: yQ }, 1);
  }
  const ext = 70;
  body += line(polar(P, ext, phi), polar(Q, ext, phi + 180), { width: 2.2 });
  if (opts.names) {
    body += label({ x: 20, y: yP }, 'A', { bold: true }) + label({ x: 382, y: yP }, 'B', { bold: true });
    body += label({ x: 20, y: yQ }, 'C', { bold: true }) + label({ x: 382, y: yQ }, 'D', { bold: true });
  }
  const dirs = (s: Sector): [number, number] => [[0, phi], [phi, 180], [180, 180 + phi], [180 + phi, 360]][s] as [number, number];
  for (const m of marks) {
    const V = m.at === 'P' ? P : Q;
    const [a1, a2] = dirs(m.sector);
    body += arcWithLabel(V, polar(V, 40, a1), polar(V, 40, a2), m.text, 22);
  }
  body += dot(P, 3) + dot(Q, 3);
  body += notToScale({ x: 392, y: 290 });
  return svgDoc(400, 300, body);
}

const SECTOR_WORDS = ['above the line, to the right of the transversal', 'above the line, to the left', 'below the line, to the left', 'below the line, to the right'];

function reasonFor(t: Pair): string {
  if (t === 'corresponding') return 'corresponding angles are equal';
  if (t === 'alternate') return 'alternate angles are equal';
  if (t === 'co-interior') return 'co-interior angles add to 180°';
  return '';
}

/** Two-step reasoning from P sector i to Q sector j via the corresponding angle at Q. */
function twoStepSolution(theta: number, i: Sector, j: Sector, given: number): string {
  const via = sectorValue(theta, i);
  const steps = [`The angle in the same position at the other intersection is also ${given}° (corresponding angles are equal).`];
  if ((j - i + 4) % 4 === 2) steps.push(`Angle $x$ is vertically opposite that angle, so $x = ${via}°$.`);
  else steps.push(`Angle $x$ is next to that angle on a straight line, so $x = 180° - ${via}° = ${180 - via}°$.`);
  return steps.join('\n\n');
}

export const parallelLines: QuestionTemplate = {
  id: 'm9.geo.angles-parallel.parallel-lines',
  topicId: 'm9.geo.angles-parallel',
  title: 'Corresponding, alternate and co-interior angles',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }): TemplateOutput {
    const theta = rng.int(35, 145);
    const phi = drawn(rng, theta, 40, 140);
    const sectors: Sector[] = [0, 1, 2, 3];

    // Pick a (given, unknown) pair of the right type.
    const wanted: Pair[] = difficulty === 2 ? ['corresponding', 'alternate'] : difficulty === 3 ? ['co-interior', 'corresponding', 'alternate'] : ['two-step'];
    let i: Sector;
    let j: Sector;
    do {
      i = rng.pick(sectors);
      j = rng.pick(sectors);
    } while (!wanted.includes(pairType(i, j)) || (difficulty === 3 && pairType(i, j) !== 'co-interior' && rng.chance(0.7)));
    const type = pairType(i, j);
    const givenAtP = rng.chance(0.5);
    const gVal = sectorValue(theta, i);
    const xVal = sectorValue(theta, j);

    if (difficulty === 2 && rng.chance(0.3)) {
      // Name the pair.
      const marks: Mark[] = [
        { at: 'P', sector: i, text: 'a' },
        { at: 'Q', sector: j, text: 'b' },
      ];
      const opts = ['corresponding', 'alternate', 'co-interior', 'vertically opposite'];
      return {
        type: 'mcq',
        prompt: 'The lines marked with arrows are parallel. What type of angle pair are $a$ and $b$?',
        figure: { svg: transversalFigure(phi, marks), alt: `Two parallel lines cut by a transversal. Angle a is at the top crossing (${SECTOR_WORDS[i]}) and angle b is at the bottom crossing (${SECTOR_WORDS[j]}).` },
        options: opts.map((o) => ({ id: o.replace(' ', '-'), text: o[0]!.toUpperCase() + o.slice(1) })),
        correct: type,
        shuffle: false,
        feedback: {
          corresponding: 'Corresponding angles are in the same position at each crossing (an F shape).',
          alternate: 'Alternate angles are between the parallel lines, on opposite sides of the transversal (a Z shape).',
          'co-interior': 'Co-interior angles are between the parallel lines, on the same side of the transversal (a C shape).',
          'vertically-opposite': 'Vertically opposite angles are at the same crossing point, opposite each other.',
        },
        calculator: 'not-allowed',
        hints: ['Are both angles between the parallel lines, or not?', 'Same position at each crossing → corresponding (F). Between the lines, opposite sides → alternate (Z). Between the lines, same side → co-interior (C).'],
        solution: `$a$ and $b$ are **${type}** angles: ${type === 'corresponding' ? 'they are in the same position at each crossing (F shape)' : 'they are between the parallel lines on opposite sides of the transversal (Z shape)'}. So $a = b$.`,
      };
    }

    const marks: Mark[] = givenAtP
      ? [
          { at: 'P', sector: i, text: deg(gVal) },
          { at: 'Q', sector: j, text: 'x' },
        ]
      : [
          { at: 'Q', sector: j, text: deg(xVal) },
          { at: 'P', sector: i, text: 'x' },
        ];
    const given = givenAtP ? gVal : xVal;
    const answer = givenAtP ? xVal : gVal;
    const fig = { svg: transversalFigure(phi, marks), alt: `Two parallel lines cut by a transversal. One angle is ${given}° and another is x.` };

    let solution: string;
    if (type === 'two-step') {
      solution = givenAtP ? twoStepSolution(theta, i, j, given) : twoStepSolution(theta, j, i, given);
    } else if (type === 'co-interior') {
      solution = `The angles are **co-interior** (between the parallel lines, on the same side of the transversal), so they add to 180°.\n\n$x = 180° - ${given}° = ${answer}°$`;
    } else {
      solution = `The angles are **${type}** angles, and ${reasonFor(type)}.\n\nSo $x = ${answer}°$.`;
    }
    return {
      type: 'numeric',
      prompt: 'The lines marked with arrows are parallel. Find the size of angle $x$.',
      figure: fig,
      answer,
      units: '°',
      calculator: 'not-allowed',
      hints:
        type === 'two-step'
          ? ['You may need two steps. First find another angle at the same crossing as $x$.', 'Use corresponding angles to move between the crossings, then angles on a straight line or vertically opposite angles.']
          : ['Decide which type of angle pair this is: corresponding (F), alternate (Z) or co-interior (C).', 'Corresponding and alternate angles are equal. Co-interior angles add to 180°.'],
      solution,
    };
  },
};

// ---------------------------------------------------------------- algebra and proving lines parallel

export const parallelAlgebraAndProof: QuestionTemplate = {
  id: 'm9.geo.angles-parallel.algebra-proof',
  topicId: 'm9.geo.angles-parallel',
  title: 'Angle equations with parallel lines, and proving lines are parallel',
  difficulties: [4, 5],
  generate({ rng, difficulty }): TemplateOutput {
    if (difficulty === 4) {
      const kind = rng.pick(['equal', 'equal', 'co-interior'] as const);
      let i: Sector;
      let j: Sector;
      do {
        i = rng.pick([0, 1, 2, 3] as const);
        j = rng.pick([0, 1, 2, 3] as const);
      } while (kind === 'equal' ? !['corresponding', 'alternate'].includes(pairType(i, j)) : pairType(i, j) !== 'co-interior');
      const type = pairType(i, j);
      // Pick x, then the expressions.
      let x: number;
      let a: number;
      let b: number;
      let c: number;
      let d: number;
      let theta: number;
      let ok: boolean;
      do {
        x = rng.int(5, 30);
        a = rng.int(2, 6);
        c = rng.int(1, 5);
        if (kind === 'equal' && c === a) c = a + 1;
        b = rng.int(-20, 40);
        const angleI = a * x + b;
        if (kind === 'equal') {
          d = angleI - c * x;
        } else {
          d = 180 - angleI - c * x;
        }
        theta = i % 2 === 0 ? angleI : 180 - angleI;
        ok = angleI >= 35 && angleI <= 145 && d !== 0 && b !== 0 && Math.abs(d) <= 120;
      } while (!ok);
      const expr = (k: number, m: number) => `${k === 1 ? '' : k}x ${m < 0 ? '−' : '+'} ${Math.abs(m)}`;
      const ex1 = `(${expr(a, b)})°`;
      const ex2 = `(${expr(c, d)})°`;
      const phi = drawn(rng, theta, 40, 140);
      const marks: Mark[] = [
        { at: 'P', sector: i, text: ex1 },
        { at: 'Q', sector: j, text: ex2 },
      ];
      const texE = (k: number, m: number) => `${k === 1 ? '' : k}x ${m < 0 ? '-' : '+'} ${Math.abs(m)}`;
      const angle1 = a * x + b;
      const angle2 = c * x + d;
      return {
        type: 'numeric',
        prompt: 'The lines marked with arrows are parallel. Find the value of $x$.',
        figure: { svg: transversalFigure(phi, marks), alt: `Two parallel lines cut by a transversal. The ${type} angles are labelled ${ex1} and ${ex2}.` },
        answer: x,
        calculator: 'not-allowed',
        hints: [
          `These are ${type} angles. ${type === 'co-interior' ? 'They add to 180°.' : 'They are equal.'}`,
          type === 'co-interior' ? `Write $${texE(a, b)} + ${texE(c, d)} = 180$ and solve.` : `Write $${texE(a, b)} = ${texE(c, d)}$ and solve.`,
        ],
        solution:
          type === 'co-interior'
            ? [
                `Co-interior angles add to 180°: $(${texE(a, b)}) + (${texE(c, d)}) = 180$`,
                b + d === 0 ? `Collect like terms: $${a + c}x = 180$` : `Collect like terms: $${a + c}x ${b + d < 0 ? '-' : '+'} ${Math.abs(b + d)} = 180$`,
                `$${a + c}x = ${180 - b - d}$, so $x = ${x}$.`,
                `Check: $${angle1}° + ${angle2}° = 180°$ ✓`,
              ].join('\n\n')
            : [
                `${type[0]!.toUpperCase() + type.slice(1)} angles are equal: $${texE(a, b)} = ${texE(c, d)}$`,
                a > c
                  ? `Subtract $${c === 1 ? '' : c}x$ and ${b < 0 ? `add ${-b}` : `subtract ${b}`} on both sides: $${a - c === 1 ? '' : a - c}x = ${d - b}$`
                  : `Subtract $${a === 1 ? '' : a}x$ and ${d < 0 ? `add ${-d}` : `subtract ${d}`} on both sides: $${b - d} = ${c - a === 1 ? '' : c - a}x$`,
                `$x = ${x}$`,
                `Check: both angles are $${angle1}°$ ✓`,
              ].join('\n\n'),
      };
    }

    // difficulty 5: are the lines parallel?
    const kind = rng.pick(['corresponding', 'alternate', 'co-interior'] as const);
    let i: Sector;
    let j: Sector;
    do {
      i = rng.pick([0, 1, 2, 3] as const);
      j = rng.pick([0, 1, 2, 3] as const);
    } while (pairType(i, j) !== kind);
    const theta = rng.int(40, 140);
    const isParallel = rng.chance(0.5);
    const v1 = sectorValue(theta, i);
    let v2 = sectorValue(theta, j);
    if (!isParallel) v2 += rng.pick([-6, -4, -3, -2, 2, 3, 4, 6]);
    const phi = drawn(rng, theta, 45, 135);
    const marks: Mark[] = [
      { at: 'P', sector: i, text: deg(v1) },
      { at: 'Q', sector: j, text: deg(v2) },
    ];
    const rule = kind === 'co-interior' ? 'co-interior angles add to 180°' : `${kind} angles are equal`;
    const ruleNot = kind === 'co-interior' ? 'co-interior angles do not add to 180°' : `${kind} angles are not equal`;
    const other = kind === 'co-interior' ? 'corresponding' : 'co-interior';
    const otherRule = other === 'co-interior' ? 'co-interior angles add to 180°' : 'corresponding angles are equal';
    const options = [
      { id: 'yes', text: `Yes, because the ${rule}` },
      { id: 'no', text: `No, because the ${ruleNot}` },
      { id: 'yes-other', text: `Yes, because the ${otherRule}` },
      { id: 'no-cross', text: 'No, because the transversal is not at right angles to the lines' },
    ];
    const check = kind === 'co-interior' ? `$${v1}° + ${v2}° = ${v1 + v2}°$` : `$${v1}°$ and $${v2}°$`;
    return {
      type: 'mcq',
      prompt: 'Is line AB parallel to line CD? Choose the answer with the correct reason.',
      figure: { svg: transversalFigure(phi, marks, { parallel: false, names: true }), alt: `Lines AB and CD cut by a transversal. Two ${kind} angles are labelled ${v1}° and ${v2}°.` },
      options,
      correct: isParallel ? 'yes' : 'no',
      feedback: {
        'yes-other': `These two angles are not ${other} angles. Check which type of pair they are.`,
        'no-cross': 'The transversal does not need to be at right angles. Parallel lines can be crossed at any angle.',
        ...(isParallel ? { no: `Check again: ${check}.` } : { yes: `Check again: ${check}.` }),
      },
      calculator: 'not-allowed',
      hints: ['First decide what type of angle pair is marked.', kind === 'co-interior' ? 'If the lines were parallel, these angles would add to 180°.' : 'If the lines were parallel, these angles would be equal.'],
      solution: [
        `The marked angles are **${kind}** angles.`,
        kind === 'co-interior' ? `${check}.` : `${check}.`,
        isParallel
          ? `Because the ${rule}, AB **is** parallel to CD.`
          : `Because the ${ruleNot}, AB is **not** parallel to CD. (If they were parallel, the ${rule}.)`,
      ].join('\n\n'),
    };
  },
};
