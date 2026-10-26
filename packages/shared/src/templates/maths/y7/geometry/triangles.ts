import type { QuestionTemplate } from '../../../types';
import type { Rng } from '../../../../rng';
import { triangleFromAngles } from './triangles-helpers';

// m7.geo.triangles — classifying triangles by angles and by sides, the angle sum of 180°,
// isosceles base angles and equilateral angles, and simple angle equations (x + 2x + 30 = 180).

const deg = (n: number) => `${n}°`;
const ids = ['a', 'b', 'c', 'd'] as const;

type AngleType = 'acute' | 'right' | 'obtuse';
type SideType = 'equilateral' | 'isosceles' | 'scalene';

const ANGLE_NAME: Record<AngleType, string> = { acute: 'Acute', right: 'Right-angled', obtuse: 'Obtuse' };

function angleTypeOf(angles: number[]): AngleType {
  if (angles.some((x) => x === 90)) return 'right';
  return angles.some((x) => x > 90) ? 'obtuse' : 'acute';
}

/** Three different angles of the given type, each at least 20°. */
function scaleneAngles(rng: Rng, type: AngleType): [number, number, number] {
  for (;;) {
    let t: [number, number, number];
    if (type === 'right') {
      const x = rng.int(20, 70);
      t = [90, x, 90 - x];
    } else if (type === 'obtuse') {
      const o = rng.int(95, 140);
      const a = rng.int(20, 180 - o - 20);
      t = [o, a, 180 - o - a];
    } else {
      const a = rng.int(35, 85);
      const b = rng.int(35, 85);
      t = [a, b, 180 - a - b];
    }
    const [p, q, r] = t;
    if (p !== q && q !== r && p !== r && Math.min(p, q, r) >= 20 && angleTypeOf(t) === type) return t;
  }
}

/** Shuffled into [A, B, C] positions, and the drawing is mirrored half the time. */
function placeAngles(rng: Rng, t: [number, number, number]): { A: number; B: number; C: number; mirror: boolean } {
  const [A, B, C] = rng.shuffle(t) as [number, number, number];
  return { A, B, C, mirror: rng.chance(0.5) };
}

const angleFeedback = (chosen: AngleType, actual: AngleType): string => {
  if (chosen === 'acute') return actual === 'right' ? 'One angle is exactly 90°, so the triangle is right-angled.' : 'One angle is bigger than 90°, so not all three angles are acute.';
  if (chosen === 'right') return 'A right-angled triangle has an angle of exactly 90°. None of these angles is 90°.';
  return actual === 'right' ? 'Exactly 90° is a right angle. An obtuse angle is bigger than 90°.' : 'An obtuse triangle has one angle bigger than 90°. All of these angles are less than 90°.';
};

const angleReason = (t: number[], type: AngleType) =>
  type === 'right'
    ? 'One angle is exactly 90°, so it is a **right-angled** triangle.'
    : type === 'obtuse'
      ? `${deg(Math.max(...t))} is bigger than 90° (an obtuse angle), so it is an **obtuse** triangle.`
      : 'All three angles are less than 90°, so it is an **acute** triangle.';

// ---------------------------------------------------------------------------------------------
// Classify by angles
// ---------------------------------------------------------------------------------------------

export const classifyAngles: QuestionTemplate = {
  id: 'm7.geo.triangles.classify-angles',
  topicId: 'm7.geo.triangles',
  title: 'Classify a triangle by its angles',
  difficulties: [1, 2],
  generate({ rng, difficulty }) {
    const type = rng.pick(['acute', 'right', 'obtuse'] as const);
    const t = scaleneAngles(rng, type);
    const types: AngleType[] = ['acute', 'right', 'obtuse'];
    const options = types.map((x, i) => ({ id: ids[i]!, text: `${ANGLE_NAME[x]} triangle` }));
    const feedback: Record<string, string> = {};
    types.forEach((x, i) => {
      if (x !== type) feedback[ids[i]!] = angleFeedback(x, type);
    });
    const correct = ids[types.indexOf(type)]!;
    const hintsBase = ['Acute angles are less than 90°. A right angle is exactly 90°. Obtuse angles are between 90° and 180°.'];
    if (difficulty === 1) {
      const order = rng.shuffle(t);
      const useFigure = rng.chance(0.5);
      const { A, B, C, mirror } = placeAngles(rng, t);
      return {
        type: 'mcq',
        prompt: useFigure
          ? 'What type of triangle is this, by its angles?'
          : `A triangle has angles of ${deg(order[0]!)}, ${deg(order[1]!)} and ${deg(order[2]!)}. What type of triangle is it, by its angles?`,
        ...(useFigure && {
          figure: {
            svg: triangleFromAngles(A, B, { angleLabels: [deg(A), deg(B), deg(C)], mirror }),
            alt: `A triangle with angles of ${deg(A)}, ${deg(B)} and ${deg(C)}.`,
          },
        }),
        options,
        correct,
        feedback,
        shuffle: false,
        calculator: 'not-allowed',
        hints: [...hintsBase, 'Look at the biggest angle. Is it less than, equal to, or more than 90°?'],
        solution: `The angles are ${deg(t[0])}, ${deg(t[1])} and ${deg(t[2])}. ${angleReason(t, type)}`,
      };
    }
    const [p, q] = rng.shuffle(t);
    const third = 180 - p! - q!;
    return {
      type: 'mcq',
      prompt: `Two angles of a triangle are ${deg(p!)} and ${deg(q!)}. What type of triangle is it, by its angles?`,
      options,
      correct,
      feedback,
      shuffle: false,
      calculator: 'not-allowed',
      hints: ['You need all three angles. The angles in a triangle add up to 180°.', ...hintsBase],
      solution: `The third angle is $180° - ${p}° - ${q}° = ${third}°$.\n\nSo the angles are ${deg(p!)}, ${deg(q!)} and ${deg(third)}. ${angleReason(t, type)}`,
    };
  },
};

// ---------------------------------------------------------------------------------------------
// Classify by sides, and by sides and angles together
// ---------------------------------------------------------------------------------------------

/** Angles A and B of the triangle with AB = c, BC = a and CA = b. */
function anglesFromSides(a: number, b: number, c: number): [number, number] {
  const A = (Math.acos((b * b + c * c - a * a) / (2 * b * c)) * 180) / Math.PI;
  const B = (Math.acos((a * a + c * c - b * b) / (2 * a * c)) * 180) / Math.PI;
  return [A, B];
}

const SIDE_TEXT: Record<SideType, string> = { equilateral: 'Equilateral', isosceles: 'Isosceles', scalene: 'Scalene' };

export const classifySides: QuestionTemplate = {
  id: 'm7.geo.triangles.classify-sides',
  topicId: 'm7.geo.triangles',
  title: 'Classify a triangle by its sides, or by its sides and angles',
  difficulties: [1, 2],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      const type = rng.pick(['equilateral', 'isosceles', 'isosceles', 'scalene', 'scalene'] as const);
      let a: number; // BC
      let b: number; // CA
      let c: number; // AB (base)
      if (type === 'equilateral') {
        a = b = c = rng.int(3, 12);
      } else if (type === 'isosceles') {
        a = b = rng.int(4, 12);
        do c = rng.int(3, 2 * a - 2);
        while (c === a);
      } else {
        for (;;) {
          [a, b, c] = [rng.int(4, 15), rng.int(4, 15), rng.int(4, 15)];
          const s = [a, b, c].sort((x, y) => x - y);
          if (a !== b && b !== c && a !== c && s[0]! + s[1]! > s[2]! + 1) break;
        }
      }
      const sides = rng.shuffle([a, b, c]);
      const useFigure = rng.chance(0.5);
      const [A, B] = anglesFromSides(a, b, c);
      const types: SideType[] = ['equilateral', 'isosceles', 'scalene'];
      const feedback: Record<string, string> = {};
      types.forEach((x, i) => {
        if (x === type) return;
        feedback[ids[i]!] =
          x === 'equilateral'
            ? 'Equilateral means all three sides are equal. Check the lengths again.'
            : x === 'isosceles'
              ? type === 'equilateral'
                ? 'At least two sides are equal, so it is isosceles too. But all three are equal, so the best name is equilateral.'
                : 'Isosceles needs at least two equal sides. Are any two sides the same length?'
              : 'Scalene means no sides are equal. Look for sides with the same length.';
      });
      return {
        type: 'mcq',
        prompt: useFigure
          ? 'What is the best name for this triangle, by its sides?'
          : `A triangle has sides of ${sides[0]} cm, ${sides[1]} cm and ${sides[2]} cm. What is the best name for it, by its sides?`,
        ...(useFigure && {
          figure: {
            svg: triangleFromAngles(A, B, { angleLabels: [null, null, null], sideLabels: [`${a} cm`, `${b} cm`, `${c} cm`], mirror: rng.chance(0.5) }),
            alt: `A triangle with sides of ${a} cm, ${b} cm and ${c} cm.`,
          },
        }),
        options: types.map((x, i) => ({ id: ids[i]!, text: SIDE_TEXT[x] })),
        correct: ids[types.indexOf(type)]!,
        feedback,
        shuffle: false,
        calculator: 'not-allowed',
        hints: ['Compare the three side lengths. How many are the same?', 'Equilateral: three equal sides. Isosceles: at least two equal sides. Scalene: no equal sides.'],
        solution:
          type === 'equilateral'
            ? `All three sides are ${a} cm, so it is **equilateral**.`
            : type === 'isosceles'
              ? `Two sides are ${a} cm and the third is ${c} cm. Exactly two sides are equal, so it is **isosceles**.`
              : `The sides ${sides.join(' cm, ')} cm are all different, so it is **scalene**.`,
      };
    }
    // difficulty 2: both names, from the angles and tick marks on a figure.
    const angleType = rng.pick(['acute', 'right', 'obtuse'] as const);
    const sideType = rng.pick(['isosceles', 'scalene'] as const);
    let A: number;
    let B: number;
    let C: number;
    let ticks: [number, number, number] = [0, 0, 0];
    let mirror = rng.chance(0.5);
    if (sideType === 'isosceles') {
      const apex = angleType === 'right' ? 90 : angleType === 'obtuse' ? 2 * rng.int(50, 70) : 2 * rng.pick([12, 14, 16, 18, 20, 22, 24, 26, 28, 32, 34, 36, 38, 40, 42]);
      const base = (180 - apex) / 2;
      [A, B, C] = [base, base, apex];
      ticks = [1, 1, 0];
      mirror = false;
    } else {
      ({ A, B, C, mirror } = placeAngles(rng, scaleneAngles(rng, angleType)));
    }
    const name = (a: AngleType, s: SideType) => `${ANGLE_NAME[a]} ${s} triangle`;
    const combos: Array<[AngleType, SideType]> = [];
    for (const a of ['acute', 'right', 'obtuse'] as const) for (const s of ['isosceles', 'scalene'] as const) combos.push([a, s]);
    const others = combos.filter(([a, s]) => !(a === angleType && s === sideType));
    const picked = [
      ...rng.sample(others.filter(([a, s]) => (a === angleType) !== (s === sideType)), 2),
      ...rng.sample(others.filter(([a, s]) => a !== angleType && s !== sideType), 1),
    ];
    const all = rng.shuffle<[AngleType, SideType]>([[angleType, sideType], ...picked]);
    const feedback: Record<string, string> = {};
    all.forEach(([a, s], i) => {
      if (a === angleType && s === sideType) return;
      const parts: string[] = [];
      if (a !== angleType) parts.push(angleFeedback(a, angleType));
      if (s !== sideType) parts.push(sideType === 'isosceles' ? 'Two sides have matching tick marks, so two sides are equal.' : 'No sides are marked equal, and all the angles are different.');
      feedback[ids[i]!] = parts.join(' ');
    });
    const t = [A, B, C];
    return {
      type: 'mcq',
      prompt: 'Classify this triangle by its angles **and** by its sides. Sides with the same tick marks are equal. Sides with no tick marks are all different lengths.',
      figure: {
        svg: triangleFromAngles(A, B, { angleLabels: [deg(A), deg(B), deg(C)], ticks, mirror }),
        alt: `A triangle with angles ${deg(A)}, ${deg(B)} and ${deg(C)}. ${sideType === 'isosceles' ? 'Two sides have matching tick marks.' : 'No sides have tick marks.'}`,
      },
      options: all.map(([a, s], i) => ({ id: ids[i]!, text: name(a, s) })),
      correct: ids[all.findIndex(([a, s]) => a === angleType && s === sideType)]!,
      feedback,
      calculator: 'not-allowed',
      hints: ['First decide by the biggest angle: acute, right-angled or obtuse?', 'Then look at the tick marks to decide: isosceles or scalene?'],
      solution: `${angleReason(t, angleType)}\n\n${sideType === 'isosceles' ? 'Two sides have the same tick mark, so two sides are equal: it is **isosceles**. (Its two base angles are equal too.)' : 'No two sides are equal, so it is **scalene**. (Its three angles are all different too.)'}\n\nSo it is ${angleType === 'right' ? 'a' : 'an'} **${name(angleType, sideType).toLowerCase()}**.`,
    };
  },
};

// ---------------------------------------------------------------------------------------------
// Missing angles from the angle sum
// ---------------------------------------------------------------------------------------------

export const missingAngle: QuestionTemplate = {
  id: 'm7.geo.triangles.missing-angle',
  topicId: 'm7.geo.triangles',
  title: 'Use the angle sum (180°) to find a missing angle',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    const sumHints = ['The three angles inside a triangle always add up to 180°.', 'Add the two angles you know, then take the total away from 180°.'];
    if (difficulty === 3) {
      // An exterior angle on a straight line at B, then the angle sum.
      let e: number;
      let a: number;
      for (;;) {
        e = rng.int(60, 150);
        a = rng.int(25, 100);
        if (e - a >= 20 && 180 - e >= 25) break;
      }
      const B = 180 - e;
      const x = e - a;
      const mirror = rng.chance(0.5);
      return {
        type: 'numeric',
        prompt: 'The bottom side of this triangle has been extended to make a straight line. Find the size of angle $x$.',
        figure: {
          svg: triangleFromAngles(a, B, { angleLabels: [deg(a), null, 'x'], exteriorAtB: deg(e), mirror }),
          alt: `A triangle with one angle of ${deg(a)} and an unknown angle x. The base is extended past the third corner, making an outside angle of ${deg(e)}.`,
        },
        answer: x,
        units: '°',
        variable: 'x',
        marks: 2,
        calculator: 'not-allowed',
        hints: ['Angles on a straight line add up to 180°. Use this to find the angle inside the triangle next to the ' + deg(e) + ' angle.', 'Then use the angle sum of the triangle: 180°.'],
        solution: `Angles on a straight line add to 180°, so the angle inside the triangle next to ${deg(e)} is $180° - ${e}° = ${B}°$.\n\nAngles in a triangle add to 180°: $x = 180° - ${a}° - ${B}° = ${x}°$.`,
      };
    }
    let t: [number, number, number];
    let right = false;
    if (difficulty === 1) {
      for (;;) {
        const a = 5 * rng.int(5, 22);
        const b = 5 * rng.int(5, 22);
        if (180 - a - b >= 20) {
          t = [a, b, 180 - a - b];
          break;
        }
      }
    } else if (rng.chance(0.35)) {
      right = true;
      const p = rng.int(21, 69);
      t = [90, p, 90 - p];
    } else {
      for (;;) {
        const a = rng.int(21, 115);
        const b = rng.int(21, 115);
        if (180 - a - b >= 20 && (a % 5 !== 0 || b % 5 !== 0)) {
          t = [a, b, 180 - a - b];
          break;
        }
      }
    }
    // Which angle is unknown: never the right angle.
    const unknownIdx = right ? rng.int(1, 2) : rng.int(0, 2);
    const ans = t[unknownIdx]!;
    const known = t.filter((_v, i) => i !== unknownIdx);
    const order = rng.shuffle([0, 1, 2]);
    const [A, B, C] = order.map((i) => t[i]!) as [number, number, number];
    const labels = order.map((i) => (i === unknownIdx ? 'x' : t[i] === 90 ? '' : deg(t[i]!))) as [string, string, string];
    const mirror = rng.chance(0.5);
    return {
      type: 'numeric',
      prompt: right ? 'This is a right-angled triangle. Find the size of angle $x$.' : 'Find the size of angle $x$.',
      figure: {
        svg: triangleFromAngles(A, B, { angleLabels: labels, mirror }),
        alt: `A triangle with ${right ? 'a right angle and an angle' : 'angles'} of ${known.filter((k) => k !== 90).map(deg).join(' and ')}, and an unknown angle x.`,
      },
      answer: ans,
      units: '°',
      variable: 'x',
      calculator: 'not-allowed',
      hints: right ? ['The square mark shows a right angle: 90°.', ...sumHints] : sumHints,
      solution: `Angles in a triangle add up to 180°.\n\n$${known[0]}° + ${known[1]}° = ${known[0]! + known[1]!}°$\n\n$x = 180° - ${known[0]! + known[1]!}° = ${ans}°$`,
    };
  },
};

// ---------------------------------------------------------------------------------------------
// Isosceles and equilateral triangles
// ---------------------------------------------------------------------------------------------

export const isosceles: QuestionTemplate = {
  id: 'm7.geo.triangles.isosceles',
  topicId: 'm7.geo.triangles',
  title: 'Isosceles base angles and equilateral angles',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    const baseHint = 'In an isosceles triangle, the two base angles (opposite the equal sides) are equal.';
    if (difficulty === 2) {
      const lying = rng.chance(0.3);
      const findBase = rng.chance(0.5);
      let apex: number;
      let base: number;
      if (findBase) {
        apex = 2 * rng.int(10, 70);
        base = (180 - apex) / 2;
      } else {
        base = rng.int(25, 80);
        apex = 180 - 2 * base;
      }
      // Upright: apex at C, equal sides CA and BC. Lying: apex at A, equal sides AB and CA.
      const [A, B] = lying ? [apex, base] : [base, base];
      const C = 180 - A - B;
      const ticks: [number, number, number] = lying ? [0, 1, 1] : [1, 1, 0];
      const apexLabel = findBase ? deg(apex) : 'x';
      const baseLabels = findBase ? ['x', 'x'] : [deg(base), null];
      const angleLabels: [string | null, string | null, string | null] = lying
        ? [apexLabel, baseLabels[0]!, baseLabels[1] ?? null]
        : [baseLabels[0]!, baseLabels[1] ?? null, apexLabel];
      return {
        type: 'numeric',
        prompt: `This triangle is isosceles: the tick marks show the equal sides. Find the size of angle $x$.`,
        figure: {
          svg: triangleFromAngles(A, B, { angleLabels, ticks, mirror: rng.chance(0.5) }),
          alt: findBase
            ? `An isosceles triangle. The angle between the equal sides is ${deg(apex)}. The two base angles are both marked x.`
            : `An isosceles triangle. One base angle is ${deg(base)}. The angle between the equal sides is x.`,
        },
        answer: findBase ? base : apex,
        units: '°',
        variable: 'x',
        calculator: 'not-allowed',
        hints: [baseHint, 'The three angles add up to 180°.'],
        solution: findBase
          ? `The two base angles are equal, so together they make $180° - ${apex}° = ${180 - apex}°$.\n\nEach one is $${180 - apex}° \\div 2 = ${base}°$, so $x = ${base}°$.`
          : `The base angles are equal, so the other base angle is also ${deg(base)}.\n\n$x = 180° - ${base}° - ${base}° = ${apex}°$.`,
      };
    }
    if (difficulty === 3) {
      if (rng.chance(0.5)) {
        const o = 2 * rng.int(46, 75);
        const base = (180 - o) / 2;
        return {
          type: 'numeric',
          prompt: `An isosceles triangle has one angle of ${deg(o)}. What is the size of each of the other two angles?`,
          answer: base,
          units: '°',
          marks: 2,
          calculator: 'not-allowed',
          hints: [`Could there be two angles of ${deg(o)} in the same triangle?`, baseHint],
          solution: `Two angles of ${deg(o)} would add to more than 180°, so ${deg(o)} must be the angle between the equal sides. The other two angles are the equal base angles.\n\nTogether they make $180° - ${o}° = ${180 - o}°$, so each is $${180 - o}° \\div 2 = ${base}°$.`,
        };
      }
      const base = rng.int(25, 80);
      const name = rng.pick(['PQR', 'ABC', 'KLM', 'XYZ', 'DEF']);
      const [p, q, r] = name.split('') as [string, string, string];
      return {
        type: 'numeric',
        prompt: `Triangle ${name} is isosceles with ${p}${q} = ${p}${r}. Angle ${q} is ${deg(base)}. What is the size of angle ${p}?`,
        answer: 180 - 2 * base,
        units: '°',
        marks: 2,
        calculator: 'not-allowed',
        hints: [`The equal sides ${p}${q} and ${p}${r} meet at ${p}, so the base angles are at ${q} and ${r}.`, baseHint],
        solution: `${p}${q} = ${p}${r}, so the base angles at ${q} and ${r} are equal: angle ${r} = ${deg(base)}.\n\nAngle ${p} $= 180° - ${base}° - ${base}° = ${180 - 2 * base}°$.`,
      };
    }
    // difficulty 4: an isosceles triangle with an exterior angle on a straight line.
    const e = rng.int(102, 155);
    const base = 180 - e;
    const apex = 180 - 2 * base;
    return {
      type: 'numeric',
      prompt: 'This triangle is isosceles: the tick marks show the equal sides. The bottom side has been extended to make a straight line. Find the size of angle $x$.',
      figure: {
        svg: triangleFromAngles(base, base, { angleLabels: [null, null, 'x'], ticks: [1, 1, 0], exteriorAtB: deg(e), mirror: rng.chance(0.5) }),
        alt: `An isosceles triangle with its base extended. The outside angle at one end of the base is ${deg(e)}. The angle between the equal sides is x.`,
      },
      answer: apex,
      units: '°',
      variable: 'x',
      marks: 2,
      calculator: 'not-allowed',
      hints: ['Angles on a straight line add up to 180°. Find the base angle next to the outside angle first.', baseHint],
      solution: `Angles on a straight line add to 180°, so the base angle is $180° - ${e}° = ${base}°$.\n\nThe other base angle is equal: ${deg(base)}.\n\n$x = 180° - ${base}° - ${base}° = ${apex}°$.`,
    };
  },
};

// ---------------------------------------------------------------------------------------------
// Angle equations
// ---------------------------------------------------------------------------------------------

interface Expr {
  p: number;
  k: number;
}

/** "x", "2x", "x + 20", "3x - 10" for KaTeX and plain text. */
function exprTex({ p, k }: Expr): string {
  const xs = p === 1 ? 'x' : `${p}x`;
  return k === 0 ? xs : k > 0 ? `${xs} + ${k}` : `${xs} - ${-k}`;
}
const exprLabel = (e: Expr) => (e.k === 0 ? `${exprTex(e)}°` : `(${exprTex(e).replace('-', '−')})°`);
const val = (e: Expr, x: number) => e.p * x + e.k;

function collect(es: Expr[]): { P: number; K: number } {
  return { P: es.reduce((s, e) => s + e.p, 0), K: es.reduce((s, e) => s + e.k, 0) };
}

function equationSteps(es: Expr[], total: number, x: number): string[] {
  const { P, K } = collect(es);
  const sum = es.map((e) => (e.k === 0 ? exprTex(e) : `(${exprTex(e)})`)).join(' + ');
  const lhs = K === 0 ? `${P}x` : K > 0 ? `${P}x + ${K}` : `${P}x - ${-K}`;
  const lines = [`$${sum} = ${total}$`, `Collect like terms: $${lhs} = ${total}$`];
  if (K !== 0) lines.push(`${K > 0 ? `Subtract ${K} from` : `Add ${-K} to`} both sides: $${P}x = ${total - K}$`);
  lines.push(`Divide both sides by ${P}: $x = ${x}$`);
  return lines;
}

export const angleEquations: QuestionTemplate = {
  id: 'm7.geo.triangles.angle-equations',
  topicId: 'm7.geo.triangles',
  title: 'Form and solve an equation from the angles of a triangle',
  difficulties: [4, 5],
  generate({ rng, difficulty }) {
    const isosceles = difficulty === 5 && rng.chance(0.5);
    let es: Expr[] = [];
    let x = 0;
    for (let attempt = 0; attempt < 500; attempt++) {
      if (isosceles) {
        // Base angles x and x, apex px + k.
        const p = rng.int(1, 3);
        const k = 5 * rng.int(-6, 6);
        es = [
          { p: 1, k: 0 },
          { p: 1, k: 0 },
          { p, k },
        ];
      } else {
        es = [0, 1, 2].map((i) => {
          const p = rng.pick([1, 1, 2, 3]);
          const k = difficulty === 4 && i < 2 ? 0 : 5 * rng.int(-4, 6) * (rng.chance(0.6) ? 1 : 0);
          return { p, k };
        });
      }
      const { P, K } = collect(es);
      if ((180 - K) % P !== 0) continue;
      x = (180 - K) / P;
      const angles = es.map((e) => val(e, x));
      if (x > 0 && angles.every((a) => a >= 20 && a <= 140) && new Set(es.map(exprTex)).size >= (isosceles ? 2 : 3)) break;
      es = [];
    }
    if (!es.length) {
      es = [
        { p: 1, k: 0 },
        { p: 2, k: 0 },
        { p: 1, k: 20 },
      ];
      x = 40;
    }
    const angles = es.map((e) => val(e, x)) as [number, number, number];
    // The largest angle goes at the top so the base is the longest side and the labels have room.
    const big = angles.indexOf(Math.max(...angles));
    const rest = rng.shuffle([0, 1, 2].filter((i) => i !== big));
    const order = isosceles ? [0, 1, 2] : [rest[0]!, rest[1]!, big];
    const [A, B, C] = order.map((i) => angles[i]!) as [number, number, number];
    const labels = order.map((i) => exprLabel(es[i]!)) as [string, string, string];
    const figure = {
      svg: triangleFromAngles(A, B, { angleLabels: labels, ...(isosceles && { ticks: [1, 1, 0] as [number, number, number] }), mirror: rng.chance(0.5) }),
      alt: `A triangle${isosceles ? ' with two equal sides' : ''} with angles labelled ${es.map((e) => exprLabel(e)).join(', ')}.`,
    };
    const steps = equationSteps(es, 180, x);
    const check = `Check: ${angles.map(deg).join(' + ')} = 180° ✓`;
    if (difficulty === 4) {
      return {
        type: 'numeric',
        prompt: 'The angles of this triangle are given in terms of $x$. Find the value of $x$.',
        figure,
        answer: x,
        variable: 'x',
        marks: 2,
        calculator: 'not-allowed',
        hints: ['The three angles add up to 180°, so write an equation: (first angle) + (second angle) + (third angle) = 180.', 'Collect the $x$ terms and the numbers, then solve.'],
        solution: [...steps, check].join('\n\n'),
      };
    }
    const largestIdx = angles.indexOf(Math.max(...angles));
    const largest = angles[largestIdx]!;
    const target = es[largestIdx]!;
    return {
      type: 'numeric',
      prompt: isosceles
        ? 'This triangle is isosceles. Its base angles are both $x°$. Find the size of the largest angle.'
        : 'The angles of this triangle are given in terms of $x$. Find the size of the largest angle.',
      figure,
      answer: largest,
      units: '°',
      marks: 3,
      calculator: 'not-allowed',
      hints: [
        'Write an equation: the three angles add up to 180°. Solve it to find $x$.',
        'Then substitute your value of $x$ into each angle to see which is largest.',
      ],
      solution: [
        ...steps,
        `The angles are ${angles.map(deg).join(', ')}.`,
        target.p === 1 && target.k === 0
          ? `The largest is $x = ${largest}°$.`
          : `The largest is $${exprTex(target)} = ${target.p === 1 ? '' : `${target.p} \\times `}${x}${target.k ? (target.k > 0 ? ` + ${target.k}` : ` - ${-target.k}`) : ''} = ${largest}°$.`,
        check,
      ].join('\n\n'),
    };
  },
};

export const templates: QuestionTemplate[] = [classifyAngles, classifySides, missingAngle, isosceles, angleEquations];
