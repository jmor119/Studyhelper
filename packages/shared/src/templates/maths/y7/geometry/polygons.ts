import type { QuestionTemplate, TemplateOutput } from '../../../types';
import type { Rng } from '../../../../rng';
import { line, polygon, rightAngleMark, svgDoc, type Pt } from '../../../svg';
import { arcWithLabel, deg, notToScale, nudgeAngles, polygonWithAngles, regularPolygon } from './angles-helpers';

// m7.geo.polygons templates: interior angle sums (180(n − 2)°), missing interior angles,
// exterior angles (they add to 360°), and regular polygons (exterior = 360° ÷ n,
// interior = 180° − exterior). Figures are never drawn to scale.

const NAMES: Record<number, string> = { 3: 'triangle', 4: 'quadrilateral', 5: 'pentagon', 6: 'hexagon', 8: 'octagon', 10: 'decagon' };

/** "a pentagon", "an octagon", or "a polygon with 7 sides". */
function called(n: number): string {
  const name = NAMES[n];
  if (!name) return `a polygon with ${n} sides`;
  return /^[aeiou]/.test(name) ? `an ${name}` : `a ${name}`;
}

const sumOf = (n: number) => 180 * (n - 2);

/** Working for an angle sum: "180° × (5 − 2) = 180° × 3 = 540°". */
const sumWorking = (n: number) => `$180° \\times (${n} - 2) = 180° \\times ${n - 2} = ${sumOf(n)}°$`;

const NUM = { type: 'numeric' as const, calculator: 'not-allowed' as const };

/** Random whole-number angles in [lo, hi] (multiples of `step`) adding to `total`. */
function anglesAddingTo(rng: Rng, count: number, total: number, lo: number, hi: number, step = 1): number[] {
  for (;;) {
    const known = Array.from({ length: count - 1 }, () => step * rng.int(Math.ceil(lo / step), Math.floor(hi / step)));
    const last = total - known.reduce((s, a) => s + a, 0);
    if (last >= lo && last <= hi) return [...known, last];
  }
}

interface AngleLabel {
  text: string;
  right?: boolean;
}

/** A convex polygon with each interior angle labelled (or marked as a right angle). */
function labelledPolygon(rng: Rng, actual: number[], labels: AngleLabel[]): string {
  const pts = polygonWithAngles(rng, nudgeAngles(rng, actual), { x: 60, y: 30, w: 260, h: 215 });
  const n = pts.length;
  let body = polygon(pts);
  pts.forEach((p, i) => {
    const prev = pts[(i - 1 + n) % n]!;
    const next = pts[(i + 1) % n]!;
    const lab = labels[i]!;
    if (lab.right) body += rightAngleMark(p, prev, next, 13);
    else if (lab.text) body += arcWithLabel(p, prev, next, lab.text, 20);
  });
  body += notToScale({ x: 372, y: 270 });
  return svgDoc(380, 280, body);
}

/** A polygon with sides extended at the chosen vertices, exterior angles labelled there. */
function exteriorFigure(
  rng: Rng,
  interiors: number[],
  ext: Array<{ at: number; text: string }>,
  interiorLabels: Array<{ at: number; text: string }> = [],
): string {
  const pts = polygonWithAngles(rng, nudgeAngles(rng, interiors, 50, 160), { x: 95, y: 60, w: 190, h: 160 });
  const n = pts.length;
  let body = polygon(pts);
  for (const e of ext) {
    const p = pts[e.at]!;
    const prev = pts[(e.at - 1 + n) % n]!;
    const next = pts[(e.at + 1) % n]!;
    const dx = p.x - prev.x;
    const dy = p.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    const out: Pt = { x: p.x + (dx / len) * 48, y: p.y + (dy / len) * 48 };
    body += line(p, out, { width: 2 });
    body += arcWithLabel(p, out, next, e.text, 20);
  }
  for (const l of interiorLabels) {
    const p = pts[l.at]!;
    body += arcWithLabel(p, pts[(l.at - 1 + n) % n]!, pts[(l.at + 1) % n]!, l.text, 18);
  }
  body += notToScale({ x: 372, y: 280 });
  return svgDoc(380, 290, body);
}

// ---------------------------------------------------------------- angle sums

export const angleSum: QuestionTemplate = {
  id: 'm7.geo.polygons.angle-sum',
  topicId: 'm7.geo.polygons',
  title: 'Interior angle sums of polygons',
  difficulties: [1, 2, 3],
  variety: 12,
  generate({ rng, difficulty }): TemplateOutput {
    if (difficulty === 1) {
      const kind = rng.pick(['basic', 'sides', 'name', 'triangles'] as const);
      if (kind === 'basic') {
        const n = rng.pick([3, 4] as const);
        return {
          ...NUM,
          prompt: `What do the interior angles of ${called(n)} add up to?`,
          answer: sumOf(n),
          units: '°',
          hints: [n === 3 ? 'Think about tearing the three corners off a paper triangle and putting them together.' : 'A quadrilateral can be cut into two triangles.', 'Each triangle has angles that add up to 180°.'],
          solution: n === 3 ? 'The interior angles of any triangle add up to **180°**. The three corners fit together to make a straight line.' : 'A quadrilateral can be split into 2 triangles from one corner, so its angles add to $2 \\times 180° = 360°$.',
        };
      }
      const n = rng.pick([5, 6, 8, 10] as const);
      if (kind === 'name') {
        const opts = [5, 6, 8, 10].map((m) => ({ id: NAMES[m]!, text: NAMES[m]![0]!.toUpperCase() + NAMES[m]!.slice(1) }));
        return {
          type: 'mcq',
          prompt: `What is the name of a polygon with ${n} sides?`,
          options: opts,
          correct: NAMES[n]!,
          feedback: Object.fromEntries(
            [5, 6, 8, 10].filter((m) => m !== n).map((m) => [NAMES[m]!, `${called(m)[0]!.toUpperCase()}${called(m).slice(1)} has ${m} sides.`]),
          ),
          calculator: 'not-allowed',
          hints: ['The first part of each name is a number word.', 'Tri- means 3, as in triangle and tricycle. The other names work the same way.'],
          solution: `A polygon with ${n} sides is called ${called(n)}. (Pentagon 5, hexagon 6, octagon 8, decagon 10.)`,
        };
      }
      if (kind === 'sides') {
        return {
          ...NUM,
          prompt: `How many sides does ${called(n)} have?`,
          answer: n,
          form: 'integer',
          hints: ['The first part of the name is a number word.', 'Tri- means 3, as in triangle and tricycle. The other names work the same way.'],
          solution: `${called(n)[0]!.toUpperCase()}${called(n).slice(1)} has **${n}** sides. (Pentagon 5, hexagon 6, octagon 8, decagon 10.)`,
        };
      }
      return {
        ...NUM,
        prompt: `You draw lines from one corner of ${called(n)} to every other corner. How many triangles do you make?`,
        answer: n - 2,
        form: 'integer',
        hints: ['Sketch it. The two sides next to your corner already join it, so you can only draw to the other corners.', `${called(n)[0]!.toUpperCase()}${called(n).slice(1)} has ${n} sides.`],
        solution: `From one corner you can draw lines to ${n - 3} other corners, which makes $${n} - 2 = ${n - 2}$ triangles. A polygon with $n$ sides always splits into $n - 2$ triangles this way.`,
      };
    }
    if (difficulty === 2) {
      const n = rng.pick([5, 6, 7, 8, 9, 10, 11, 12]);
      return {
        ...NUM,
        prompt: rng.chance(0.5) || !NAMES[n] ? `Find the sum of the interior angles of ${called(n)}.` : `What do the interior angles of ${called(n)} add up to?`,
        answer: sumOf(n),
        units: '°',
        hints: [`A polygon with $n$ sides can be split into $n - 2$ triangles.`, 'Each triangle adds 180° to the total.'],
        solution: `It has ${n} sides, so it splits into $${n} - 2 = ${n - 2}$ triangles.\n\nAngle sum $= ${sumWorking(n).slice(1)}`,
      };
    }
    // difficulty 3: work backwards.
    if (rng.chance(0.5)) {
      const n = rng.int(5, 16);
      return {
        ...NUM,
        prompt: `The interior angles of a polygon add up to ${sumOf(n).toLocaleString('en-NZ')}°. How many sides does the polygon have?`,
        answer: n,
        form: 'integer',
        hints: ['How many lots of 180° make that total? That is the number of triangles.', 'The number of sides is 2 more than the number of triangles.'],
        solution: `$${sumOf(n)} \\div 180 = ${n - 2}$, so the polygon splits into ${n - 2} triangles.\n\nNumber of sides $= ${n - 2} + 2 = ${n}$.`,
      };
    }
    const n = rng.int(13, 22);
    return {
      ...NUM,
      prompt: `Find the sum of the interior angles of a polygon with ${n} sides.`,
      answer: sumOf(n),
      units: '°',
      hints: ['Use angle sum $= 180° \\times (n - 2)$.', `To multiply by 180, you can multiply by 18 and then by 10.`],
      solution: `Angle sum $= 180° \\times (${n} - 2) = 180° \\times ${n - 2}$.\n\n$18 \\times ${n - 2} = ${18 * (n - 2)}$, so $180 \\times ${n - 2} = ${sumOf(n)}$.\n\nThe angles add to **${sumOf(n).toLocaleString('en-NZ')}°**.`,
    };
  },
};

// ---------------------------------------------------------------- missing interior angles

export const missingAngle: QuestionTemplate = {
  id: 'm7.geo.polygons.missing-angle',
  topicId: 'm7.geo.polygons',
  title: 'Find a missing interior angle in a polygon',
  difficulties: [2, 3, 4, 5],
  generate({ rng, difficulty }): TemplateOutput {
    if (difficulty === 2 || difficulty === 3) {
      const n = difficulty === 2 ? 4 : rng.pick([5, 5, 6]);
      const range = n === 4 ? [55, 150] : n === 5 ? [78, 160] : [95, 165];
      // Multiples of 5 for the bigger shapes, so the adding can be done in your head.
      const angles = anglesAddingTo(rng, n, sumOf(n), range[0]!, range[1]!, n === 4 ? 1 : 5);
      const xi = rng.int(0, n - 1);
      const x = angles[xi]!;
      const labels: AngleLabel[] = angles.map((a, i) => (i === xi ? { text: 'x' } : a === 90 ? { text: '', right: true } : { text: deg(a) }));
      const known = angles.filter((_, i) => i !== xi);
      const knownSum = known.reduce((s, a) => s + a, 0);
      return {
        ...NUM,
        prompt: `Find the size of angle $x$ in this ${NAMES[n]}.${known.includes(90) ? ' The square shows a right angle.' : ''}`,
        figure: { svg: labelledPolygon(rng, angles, labels), alt: `A ${NAMES[n]} with interior angles ${angles.map((a, i) => (i === xi ? 'x' : `${a}°`)).join(', ')}.` },
        answer: x,
        units: '°',
        hints: [
          n === 4 ? 'The interior angles of a quadrilateral add up to 360°.' : `First find the angle sum of a ${NAMES[n]}: it has ${n} sides.`,
          'Add up the angles you know, then subtract from the angle sum.',
        ],
        solution: [
          n === 4 ? 'The angles of a quadrilateral add to 360°.' : `Angle sum of a ${NAMES[n]}: ${sumWorking(n)}.`,
          `Angles you know: $${known.join('° + ')}° = ${knownSum}°$`,
          `$x = ${sumOf(n)}° - ${knownSum}° = ${x}°$`,
        ].join('\n\n'),
      };
    }
    if (difficulty === 4) {
      // Two equal unknown angles, sometimes with a right angle.
      const n = rng.pick([5, 6]);
      let angles: number[];
      let x: number;
      for (;;) {
        const known = n === 5 ? anglesAddingTo(rng, 3, 5 * rng.int(60, 66), 85, 140, 5) : anglesAddingTo(rng, 4, 5 * rng.int(88, 96), 90, 150, 5);
        if (rng.chance(0.5)) known[0] = 90;
        const rest = sumOf(n) - known.reduce((s, a) => s + a, 0);
        if (rest % 2 !== 0) continue;
        x = rest / 2;
        if (x < 80 || x > 165 || known.includes(x)) continue;
        angles = rng.chance(0.5) ? [x, ...known.slice(0, 2), x, ...known.slice(2)] : [x, x, ...known];
        break;
      }
      const labels: AngleLabel[] = angles.map((a) => (a === x ? { text: 'x' } : a === 90 ? { text: '', right: true } : { text: deg(a) }));
      const known = angles.filter((a) => a !== x);
      const knownSum = known.reduce((s, a) => s + a, 0);
      const hasRight = known.includes(90);
      return {
        ...NUM,
        marks: 2,
        prompt: `The two angles marked $x$ are equal. Find the size of angle $x$ in this ${NAMES[n]}.${hasRight ? ' The square shows a right angle.' : ''}`,
        figure: { svg: labelledPolygon(rng, angles, labels), alt: `A ${NAMES[n]} with interior angles ${angles.map((a) => (a === x ? 'x' : `${a}°`)).join(', ')}.` },
        answer: x,
        units: '°',
        hints: [`Find the angle sum of a ${NAMES[n]} first.`, 'Take away the angles you know. What is left is shared equally between the two angles marked $x$.'],
        solution: [
          `Angle sum of a ${NAMES[n]}: ${sumWorking(n)}.`,
          `Angles you know: $${known.join('° + ')}° = ${knownSum}°$${hasRight ? ' (the right angle is 90°)' : ''}.`,
          `The two $x$ angles share what is left: $${sumOf(n)}° - ${knownSum}° = ${2 * x}°$.`,
          `$x = ${2 * x}° \\div 2 = ${x}°$`,
        ].join('\n\n'),
      };
    }
    // difficulty 5: an equation.
    const n = rng.pick([4, 4, 5]);
    let x: number;
    let k: number;
    let known: number[];
    for (;;) {
      k = rng.int(2, 3);
      x = rng.int(n === 4 ? 25 : 35, n === 4 ? 60 : 75);
      if (k * x > 165 || x < 30) continue;
      const rest = sumOf(n) - (k + 1) * x;
      const count = n - 2;
      const lo = n === 4 ? 60 : 85;
      if (rest < count * lo || rest > count * 160) continue;
      known = anglesAddingTo(rng, count, rest, lo, 160);
      break;
    }
    const vals = [x, k * x, ...known];
    const order = rng.shuffle(vals.map((_, i) => i));
    const texts = [`x°`, `${k}x°`, ...known.map((a) => deg(a))];
    const angles = order.map((i) => vals[i]!);
    const labels: AngleLabel[] = order.map((i) => ({ text: texts[i]! }));
    const knownSum = known.reduce((s, a) => s + a, 0);
    return {
      ...NUM,
      marks: 2,
      prompt: `Write an equation and solve it to find the value of $x$ in this ${NAMES[n]}.`,
      figure: { svg: labelledPolygon(rng, angles, labels), alt: `A ${NAMES[n]} with interior angles ${order.map((i) => texts[i]).join(', ')}.` },
      answer: x,
      hints: [`What do the angles of a ${NAMES[n]} add up to?`, 'Add all the angles, set them equal to the angle sum, collect the $x$ terms, then solve.'],
      solution: [
        n === 4 ? 'The angles of a quadrilateral add to 360°:' : `The angles of a pentagon add to ${sumWorking(n)}:`,
        `$x + ${k}x + ${known.join(' + ')} = ${sumOf(n)}$`,
        `Collect like terms: $${k + 1}x + ${knownSum} = ${sumOf(n)}$`,
        `Subtract ${knownSum}: $${k + 1}x = ${sumOf(n) - knownSum}$`,
        `Divide by ${k + 1}: $x = ${x}$`,
        `Check: $${x}° + ${k * x}° + ${known.join('° + ')}° = ${sumOf(n)}°$ ✓`,
      ].join('\n\n'),
    };
  },
};

// ---------------------------------------------------------------- regular polygons

const REGULAR_N = [3, 4, 5, 6, 8, 9, 10, 12, 15, 18, 20] as const;

function regularFigure(n: number, mark: 'interior' | 'exterior'): string {
  const c: Pt = { x: 190, y: 150 };
  const pts = regularPolygon(c, 100, n, 270 - 180 / n);
  let body = polygon(pts);
  // Mark the angle at the lowest right-hand vertex.
  let k = 0;
  pts.forEach((p, i) => {
    if (p.y > pts[k]!.y + 0.5 || (Math.abs(p.y - pts[k]!.y) <= 0.5 && p.x > pts[k]!.x)) k = i;
  });
  const p = pts[k]!;
  const prev = pts[(k - 1 + n) % n]!;
  const next = pts[(k + 1) % n]!;
  if (mark === 'interior') {
    body += arcWithLabel(p, prev, next, 'x', 20);
  } else {
    const dx = p.x - prev.x;
    const dy = p.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    const out: Pt = { x: p.x + (dx / len) * 55, y: p.y + (dy / len) * 55 };
    body += line(p, out) + arcWithLabel(p, out, next, 'x', 22);
  }
  return svgDoc(380, 300, body);
}

export const regularPolygons: QuestionTemplate = {
  id: 'm7.geo.polygons.regular',
  topicId: 'm7.geo.polygons',
  title: 'Interior and exterior angles of regular polygons',
  difficulties: [2, 3, 4, 5],
  variety: 11,
  generate({ rng, difficulty }): TemplateOutput {
    if (difficulty === 2 || difficulty === 3) {
      const n = rng.pick(REGULAR_N);
      const ext = 360 / n;
      const int = 180 - ext;
      const exterior = difficulty === 2;
      const what = exterior ? 'exterior' : 'interior';
      return {
        ...NUM,
        prompt: `Find the size of each **${what}** angle of a regular ${NAMES[n] ?? `polygon with ${n} sides`}.`,
        ...(n <= 10 && { figure: { svg: regularFigure(n, exterior ? 'exterior' : 'interior'), alt: `A regular polygon with ${n} equal sides. One ${what} angle is marked x.` } }),
        answer: exterior ? ext : int,
        units: '°',
        hints: exterior
          ? ['The exterior angles of any polygon add up to 360°.', `In a regular polygon all ${n} exterior angles are equal, so share 360° between them.`]
          : ['Find the exterior angle first: share 360° equally between the corners.', 'At each corner, the interior and exterior angles make a straight line (180°).'],
        solution: exterior
          ? `The exterior angles add to 360°, and there are ${n} equal ones.\n\nEach exterior angle $= 360° \\div ${n} = ${ext}°$.`
          : `Each exterior angle $= 360° \\div ${n} = ${ext}°$.\n\nEach interior angle $= 180° - ${ext}° = ${int}°$.`,
      };
    }
    if (difficulty === 4) {
      const n = rng.pick([...REGULAR_N, 24, 30, 36]);
      const ext = 360 / n;
      return {
        ...NUM,
        prompt: `Each exterior angle of a regular polygon is ${ext}°. How many sides does the polygon have?`,
        answer: n,
        form: 'integer',
        hints: ['All the exterior angles add up to 360°.', `How many lots of ${ext}° make 360°?`],
        solution: `The exterior angles add to 360°, so the number of sides is $360 \\div ${ext} = ${n}$.`,
      };
    }
    // difficulty 5
    const n = rng.pick([5, 6, 8, 9, 10, 12, 15, 18, 20, 24, 30, 36]);
    const ext = 360 / n;
    const int = 180 - ext;
    if (rng.chance(0.5)) {
      return {
        ...NUM,
        marks: 2,
        prompt: `Each interior angle of a regular polygon is ${int}°. How many sides does the polygon have?`,
        answer: n,
        form: 'integer',
        hints: ['At each corner the interior and exterior angles add to 180°. Find the exterior angle first.', 'The exterior angles add up to 360°.'],
        solution: `Each exterior angle $= 180° - ${int}° = ${ext}°$.\n\nNumber of sides $= 360 \\div ${ext} = ${n}$.`,
      };
    }
    return {
      ...NUM,
      marks: 2,
      prompt: `Each exterior angle of a regular polygon is ${ext}°. What do its interior angles add up to?`,
      answer: sumOf(n),
      units: '°',
      hints: ['Work out how many sides the polygon has first.', 'Then use angle sum $= 180° \\times (n - 2)$.'],
      solution: `Number of sides $= 360 \\div ${ext} = ${n}$.\n\nAngle sum $= 180° \\times (${n} - 2) = 180° \\times ${n - 2} = ${sumOf(n).toLocaleString('en-NZ')}°$.`,
    };
  },
};

// ---------------------------------------------------------------- exterior angles

export const exteriorAngles: QuestionTemplate = {
  id: 'm7.geo.polygons.exterior',
  topicId: 'm7.geo.polygons',
  title: 'Exterior angles of polygons',
  difficulties: [1, 2, 3, 4],
  generate({ rng, difficulty }): TemplateOutput {
    if (difficulty === 1) {
      const n = rng.pick([4, 5, 5, 6]);
      const interiors = anglesAddingTo(rng, n, sumOf(n), n === 4 ? 60 : 85, n === 4 ? 150 : 160);
      const at = rng.int(0, n - 1);
      const a = interiors[at]!;
      return {
        ...NUM,
        prompt: `One side of this ${NAMES[n]} has been extended. Find the size of the exterior angle $x$.`,
        figure: { svg: exteriorFigure(rng, interiors, [{ at, text: 'x' }], [{ at, text: deg(a) }]), alt: `A ${NAMES[n]} with one side extended. The interior angle at that corner is ${a}° and the exterior angle is x.` },
        answer: 180 - a,
        units: '°',
        hints: ['The interior angle and the exterior angle sit together on a straight line.', 'Angles on a straight line add up to 180°.'],
        solution: `The interior and exterior angles at a corner make a straight line, so they add to 180°.\n\n$x = 180° - ${a}° = ${180 - a}°$`,
      };
    }
    if (difficulty === 2) {
      const n = rng.pick([4, 5]);
      const exts = anglesAddingTo(rng, n, 360, n === 4 ? 45 : 40, n === 4 ? 120 : 105);
      const xi = rng.int(0, n - 1);
      const known = exts.filter((_, i) => i !== xi);
      return {
        ...NUM,
        prompt: `Each side of this ${NAMES[n]} has been extended to make an exterior angle at every corner. Find the size of the exterior angle $x$.`,
        figure: {
          svg: exteriorFigure(
            rng,
            exts.map((e) => 180 - e),
            exts.map((e, i) => ({ at: i, text: i === xi ? 'x' : deg(e) })),
          ),
          alt: `A ${NAMES[n]} with an exterior angle at each corner: ${exts.map((e, i) => (i === xi ? 'x' : `${e}°`)).join(', ')}.`,
        },
        answer: exts[xi]!,
        units: '°',
        hints: ['Imagine walking around the shape, turning at each corner. One full lap is one full turn.', 'The exterior angles of any polygon add up to 360°.'],
        solution: `The exterior angles of any polygon add to 360°.\n\n$x = 360° - ${known.join('° - ')}° = ${exts[xi]}°$`,
      };
    }
    const n = difficulty === 3 ? rng.pick([5, 6]) : rng.pick([5, 6, 7]);
    const exts = anglesAddingTo(rng, n, 360, n <= 6 ? 30 : 25, n <= 6 ? 95 : 75);
    const x = exts[n - 1]!;
    const known = exts.slice(0, -1);
    const knownSum = known.reduce((s, e) => s + e, 0);
    const shape = called(n);
    if (difficulty === 3) {
      return {
        ...NUM,
        prompt: `The exterior angles of ${shape} are ${known.join('°, ')}° and $x$. Find $x$.`,
        answer: x,
        units: '°',
        hints: ['It does not matter how many sides the polygon has: the exterior angles always add to the same total.', 'Exterior angles add up to 360°.'],
        solution: `The exterior angles add to 360°.\n\n$${known.join(' + ')} = ${knownSum}$\n\n$x = 360° - ${knownSum}° = ${x}°$`,
      };
    }
    return {
      ...NUM,
      marks: 2,
      prompt: `The exterior angles of ${shape} are ${known.join('°, ')}° and one more angle. What is the **interior** angle at the corner with the missing exterior angle?`,
      answer: 180 - x,
      units: '°',
      hints: ['Find the missing exterior angle first. Exterior angles add up to 360°.', 'At each corner, the interior and exterior angles add to 180°.'],
      solution: `Missing exterior angle: $360° - ${knownSum}° = ${x}°$ (exterior angles add to 360°).\n\nInterior angle at that corner: $180° - ${x}° = ${180 - x}°$ (angles on a straight line).`,
    };
  },
};

export const templates: QuestionTemplate[] = [angleSum, missingAngle, regularPolygons, exteriorAngles];
