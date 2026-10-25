import type { QuestionTemplate } from '../../types';
import { clean, money, tex } from '../../format';
import { line, polygon, rightAngleMark, svgDoc, type Pt } from '../../svg';
import { centroid, labelAway, notToScale, parallelMarks } from './figures';
import { lShapeFigure, rectFigure } from './perimeter';

// m9.mea.area — rectangles, triangles, parallelograms, trapeziums, kites and composite shapes.
// Figures are deliberately "not to scale", and slanted sides are sometimes labelled so students
// must pick out the perpendicular height.

const HEIGHT_COLOUR = '#2563eb';

/** Fits a w × h shape (maths units) into roughly maxW × maxH px, keeping the aspect ratio within limits. */
function fit(w: number, h: number, maxW = 250, maxH = 150, minRatio = 0.5) {
  const ratio = Math.min(2.4, Math.max(minRatio, w / h));
  let W = maxW;
  let H = W / ratio;
  if (H > maxH) {
    H = maxH;
    W = H * ratio;
  }
  return { W, H };
}

/**
 * Triangle with base b along the bottom and apex above the point `apexT` (fraction along the base;
 * < 0 or > 1 puts the height outside the triangle). Shows the perpendicular height dashed.
 */
function triangleFigure(b: number, h: number, apexT: number, labels: { b: string; h: string; slant?: string }) {
  const { W, H } = fit(b, h, 220, 150, 1);
  const minT = Math.min(0, apexT);
  const maxT = Math.max(1, apexT);
  const x0 = 50 + (0 - minT) * W;
  const y0 = 30 + H;
  const P0 = { x: x0, y: y0 };
  const P1 = { x: x0 + W, y: y0 };
  const A = { x: x0 + apexT * W, y: y0 - H };
  const foot = { x: A.x, y: y0 };
  const cen = centroid([P0, P1, A]);
  let body = polygon([P0, P1, A]);
  if (apexT < 0) body += line(foot, P0, { stroke: '#6b7280', width: 1.2, dash: true });
  if (apexT > 1) body += line(P1, foot, { stroke: '#6b7280', width: 1.2, dash: true });
  const rightAngled = Math.abs(apexT) < 1e-9 || Math.abs(apexT - 1) < 1e-9;
  if (!rightAngled) body += line(A, foot, { stroke: HEIGHT_COLOUR, width: 1.6, dash: true });
  const toward = apexT <= 0.5 ? { x: foot.x + 10, y: foot.y } : { x: foot.x - 10, y: foot.y };
  body += rightAngleMark(foot, toward, A, 10);
  body += labelAway(P0, P1, cen, labels.b);
  // Height label beside the dashed line: inside the wider part of the triangle, or outside it
  // when the height is an edge or lies outside the triangle.
  const labelRight = apexT >= 1 || (apexT > 0 && apexT <= 0.5);
  const hSideRef = { x: A.x + (labelRight ? -30 : 30), y: (A.y + y0) / 2 };
  body += labelAway(A, foot, hSideRef, labels.h, { fill: HEIGHT_COLOUR, offset: 6 });
  if (labels.slant) {
    // Label the slanted side furthest from the height line.
    const [s1, s2] = apexT <= 0.5 ? [A, P1] : [P0, A];
    body += labelAway(s1, s2, cen, labels.slant);
  }
  const width = 50 + (maxT - minT) * W + 70;
  body += notToScale({ x: width - 8, y: y0 + 38 });
  return svgDoc(width, y0 + 50, body);
}

function parallelogramFigure(labels: { b: string; h: string; slant?: string }, lean: number) {
  const W = 200;
  const H = 110;
  const off = lean * 70;
  const x0 = 50 + Math.max(0, -off);
  const y0 = 30 + H;
  const pts: Pt[] = [
    { x: x0, y: y0 },
    { x: x0 + W, y: y0 },
    { x: x0 + W + off, y: y0 - H },
    { x: x0 + off, y: y0 - H },
  ];
  const cen = centroid(pts);
  // Height dropped from the top vertex that sits above the base.
  const top = off >= 0 ? pts[3]! : pts[2]!;
  const foot = { x: top.x, y: y0 };
  let body = polygon(pts);
  body += line(top, foot, { stroke: HEIGHT_COLOUR, width: 1.6, dash: true });
  body += rightAngleMark(foot, { x: foot.x + (off >= 0 ? 10 : -10), y: y0 }, top, 10);
  body += labelAway(pts[0]!, pts[1]!, cen, labels.b);
  body += labelAway(top, foot, { x: foot.x + (off >= 0 ? -30 : 30), y: y0 - H / 2 }, labels.h, { fill: HEIGHT_COLOUR, offset: 6 });
  if (labels.slant) body += labelAway(off >= 0 ? pts[1]! : pts[0]!, off >= 0 ? pts[2]! : pts[3]!, cen, labels.slant);
  body += parallelMarks(pts[0]!, pts[1]!, 1) + parallelMarks(pts[3]!, pts[2]!, 1);
  const width = 50 + W + Math.abs(off) + 70;
  body += notToScale({ x: width - 8, y: y0 + 38 });
  return svgDoc(width, y0 + 50, body);
}

function trapeziumFigure(labels: { a: string; b: string; h: string }, shift: number) {
  const A = 240;
  const B = 130;
  const H = 110;
  const x0 = 50;
  const y0 = 30 + H;
  const xTop = x0 + shift * (A - B);
  const pts: Pt[] = [
    { x: x0, y: y0 },
    { x: x0 + A, y: y0 },
    { x: xTop + B, y: y0 - H },
    { x: xTop, y: y0 - H },
  ];
  const cen = centroid(pts);
  const hx = xTop + B * 0.35;
  let body = polygon(pts);
  body += line({ x: hx, y: y0 - H }, { x: hx, y: y0 }, { stroke: HEIGHT_COLOUR, width: 1.6, dash: true });
  body += rightAngleMark({ x: hx, y: y0 }, { x: hx + 10, y: y0 }, { x: hx, y: y0 - 10 }, 10);
  body += labelAway(pts[0]!, pts[1]!, cen, labels.a);
  body += labelAway(pts[3]!, pts[2]!, cen, labels.b);
  body += labelAway({ x: hx, y: y0 - H }, { x: hx, y: y0 }, { x: hx + 30, y: y0 - H / 2 }, labels.h, { fill: HEIGHT_COLOUR, offset: 6 });
  body += parallelMarks(pts[0]!, pts[1]!, 1) + parallelMarks(pts[3]!, pts[2]!, 1);
  body += notToScale({ x: x0 + A + 60, y: y0 + 38 });
  return svgDoc(x0 + A + 70, y0 + 50, body);
}

function kiteFigure(labels: { d1: string; d2: string }, t: number) {
  // Vertical diagonal of length L, horizontal diagonal of width Wd crossing at fraction t from the top.
  const L = 190;
  const Wd = 150;
  const cx = 160;
  const yTop = 25;
  const yCross = yTop + t * L;
  const pts: Pt[] = [
    { x: cx, y: yTop },
    { x: cx + Wd / 2, y: yCross },
    { x: cx, y: yTop + L },
    { x: cx - Wd / 2, y: yCross },
  ];
  let body = polygon(pts);
  body += line(pts[0]!, pts[2]!, { stroke: HEIGHT_COLOUR, width: 1.6, dash: true });
  body += line(pts[3]!, pts[1]!, { stroke: HEIGHT_COLOUR, width: 1.6, dash: true });
  body += rightAngleMark({ x: cx, y: yCross }, { x: cx + 10, y: yCross }, { x: cx, y: yCross + 10 }, 9);
  body += labelAway(pts[0]!, { x: cx, y: yTop + L * 0.95 }, { x: cx - 20, y: yTop + L * 0.8 }, labels.d1, { fill: HEIGHT_COLOUR, offset: 6 });
  body += labelAway(pts[3]!, pts[1]!, { x: cx, y: yCross + 30 }, labels.d2, { fill: HEIGHT_COLOUR, offset: 6 });
  body += notToScale({ x: 310, y: yTop + L + 16 });
  return svgDoc(320, yTop + L + 28, body);
}

export const rectanglesAndTriangles: QuestionTemplate = {
  id: 'm9.mea.area.rectangles-triangles',
  topicId: 'm9.mea.area',
  title: 'Area of rectangles and triangles',
  difficulties: [1, 2],
  generate({ rng, difficulty }) {
    const u = rng.pick(['cm', 'm', 'mm'] as const);
    if (difficulty === 1) {
      const l = rng.int(3, 20);
      const w = rng.int(2, 12);
      const square = l === w;
      return {
        type: 'numeric',
        prompt: `Find the area of this ${square ? 'square' : 'rectangle'}.`,
        figure: { svg: rectFigure(l, w, { l: `${l} ${u}`, w: `${w} ${u}` }, square), alt: `A ${square ? 'square' : 'rectangle'} ${l} ${u} by ${w} ${u}.` },
        answer: l * w,
        units: `${u}²`,
        calculator: 'not-allowed',
        hints: ['Area of a rectangle = length × width.', `Area is measured in square units, here ${u}².`],
        solution: `Area $= ${l} \\times ${w} = ${l * w}$ ${u}².`,
      };
    }
    // difficulty 2: triangle, ½ × base × perpendicular height.
    const b = rng.int(4, 24);
    const h = rng.int(3, 18);
    const kind = rng.pick(['acute', 'acute', 'right'] as const);
    const apexT = kind === 'right' ? rng.pick([0, 1]) : rng.pick([0.3, 0.4, 0.6, 0.7]);
    let slant: number | undefined;
    if (kind === 'acute' && rng.chance(0.6)) {
      // A slanted side, longer than the height (it really must be), as a distractor.
      const run = (apexT <= 0.5 ? 1 - apexT : apexT) * b;
      slant = Math.ceil(Math.sqrt(run * run + h * h));
    }
    const area = clean((b * h) / 2);
    return {
      type: 'numeric',
      prompt: 'Find the area of this triangle.',
      figure: {
        svg: triangleFigure(b, h, apexT, { b: `${b} ${u}`, h: `${h} ${u}`, ...(slant !== undefined && { slant: `${slant} ${u}` }) }),
        alt: `A triangle with base ${b} ${u} and perpendicular height ${h} ${u}${slant !== undefined ? `; one slanted side is labelled ${slant} ${u}` : ''}.`,
      },
      answer: area,
      units: `${u}²`,
      calculator: 'not-allowed',
      hints: [
        'Area of a triangle = ½ × base × perpendicular height.',
        slant !== undefined
          ? 'The perpendicular height meets the base at a right angle. The slanted side is not the height.'
          : 'The perpendicular height is the one that meets the base at a right angle.',
      ],
      solution: [
        `Base $= ${b}$ ${u}, perpendicular height $= ${h}$ ${u}.${slant !== undefined ? ` (The ${slant} ${u} side is not needed.)` : ''}`,
        `Area $= \\frac{1}{2} \\times ${b} \\times ${h} = ${tex(area)}$ ${u}².`,
        'A triangle is half of a rectangle with the same base and height.',
      ].join('\n\n'),
    };
  },
};

export const quadrilaterals: QuestionTemplate = {
  id: 'm9.mea.area.quadrilaterals',
  topicId: 'm9.mea.area',
  title: 'Area of parallelograms, trapeziums and kites',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    const u = rng.pick(['cm', 'm'] as const);
    if (difficulty === 2) {
      const b = rng.int(5, 25);
      const h = rng.int(3, 15);
      const slant = h + rng.int(1, 6);
      return {
        type: 'numeric',
        prompt: 'Find the area of this parallelogram.',
        figure: {
          svg: parallelogramFigure({ b: `${b} ${u}`, h: `${h} ${u}`, slant: `${slant} ${u}` }, rng.pick([1, -1])),
          alt: `A parallelogram with base ${b} ${u}, perpendicular height ${h} ${u} (dashed) and slanted side ${slant} ${u}.`,
        },
        answer: b * h,
        units: `${u}²`,
        calculator: 'not-allowed',
        hints: ['Area of a parallelogram = base × perpendicular height.', 'The slanted side is not the height. Use the dashed line, which meets the base at a right angle.'],
        solution: [
          `Area $= \\text{base} \\times \\text{perpendicular height} = ${b} \\times ${h} = ${b * h}$ ${u}².`,
          `The slanted side (${slant} ${u}) is not used. Cutting the triangle off one end and moving it to the other end turns the parallelogram into a rectangle ${b} ${u} by ${h} ${u}.`,
        ].join('\n\n'),
      };
    }
    if (difficulty === 3) {
      const kind = rng.pick(['trapezium', 'kite', 'obtuse'] as const);
      if (kind === 'trapezium') {
        let a = rng.int(8, 24);
        let b = rng.int(3, 20);
        if (b >= a) [a, b] = [b + 2, a];
        const h = rng.int(3, 14);
        const area = clean(((a + b) * h) / 2);
        return {
          type: 'numeric',
          prompt: 'Find the area of this trapezium. (The arrows show the parallel sides.)',
          figure: {
            svg: trapeziumFigure({ a: `${a} ${u}`, b: `${b} ${u}`, h: `${h} ${u}` }, rng.pick([0.2, 0.5, 0.8])),
            alt: `A trapezium with parallel sides ${a} ${u} and ${b} ${u}, and perpendicular height ${h} ${u}.`,
          },
          answer: area,
          units: `${u}²`,
          calculator: 'allowed',
          hints: ['Area of a trapezium = ½ × (sum of the parallel sides) × perpendicular height.', `Add the parallel sides first: ${a} + ${b}.`],
          solution: [
            `Area $= \\frac{1}{2} \\times (a + b) \\times h = \\frac{1}{2} \\times (${a} + ${b}) \\times ${h}$`,
            `$= \\frac{1}{2} \\times ${a + b} \\times ${h} = ${tex(area)}$ ${u}².`,
            `(Two copies of this trapezium fit together to make a parallelogram with base ${a + b} ${u} and height ${h} ${u}. The trapezium is half of that.)`,
          ].join('\n\n'),
        };
      }
      if (kind === 'kite') {
        const d1 = rng.int(6, 24);
        const d2 = rng.int(4, 18);
        const area = clean((d1 * d2) / 2);
        return {
          type: 'numeric',
          prompt: 'Find the area of this kite. The dashed lines are its diagonals.',
          figure: { svg: kiteFigure({ d1: `${d1} ${u}`, d2: `${d2} ${u}` }, rng.pick([0.25, 0.3, 0.35])), alt: `A kite with diagonals ${d1} ${u} and ${d2} ${u}, crossing at right angles.` },
          answer: area,
          units: `${u}²`,
          calculator: 'allowed',
          hints: ['Area of a kite = ½ × (one diagonal) × (the other diagonal).', 'The kite fills exactly half of the rectangle drawn around it.'],
          solution: [
            `The rectangle around the kite is ${d1} ${u} by ${d2} ${u}, and the kite is half of it.`,
            `Area $= \\frac{1}{2} \\times ${d1} \\times ${d2} = ${tex(area)}$ ${u}².`,
          ].join('\n\n'),
        };
      }
      // Obtuse triangle: the perpendicular height falls outside the triangle.
      const b = rng.int(4, 16);
      const h = rng.int(4, 16);
      const apexT = rng.pick([-0.5, -0.35, 1.35, 1.5]);
      const area = clean((b * h) / 2);
      return {
        type: 'numeric',
        prompt: 'Find the area of this triangle.',
        figure: { svg: triangleFigure(b, h, apexT, { b: `${b} ${u}`, h: `${h} ${u}` }), alt: `An obtuse triangle with base ${b} ${u}. Its perpendicular height, ${h} ${u}, is drawn outside the triangle to the extended base.` },
        answer: area,
        units: `${u}²`,
        calculator: 'allowed',
        hints: ['The height can be outside the triangle. It is still the perpendicular distance from the top vertex to the line of the base.', 'Area = ½ × base × perpendicular height.'],
        solution: `The base is ${b} ${u} (not including the dashed extension) and the perpendicular height is ${h} ${u}.\n\nArea $= \\frac{1}{2} \\times ${b} \\times ${h} = ${tex(area)}$ ${u}².`,
      };
    }
    // difficulty 4: work backwards from the area.
    const kind = rng.pick(['parallelogram', 'triangle', 'trapezium'] as const);
    if (kind === 'parallelogram') {
      const b = rng.int(4, 20);
      const h = rng.int(3, 15);
      const A = b * h;
      return {
        type: 'numeric',
        prompt: `A parallelogram has an area of ${A} ${u}² and a base of ${b} ${u}. Find its perpendicular height.`,
        answer: h,
        units: u,
        calculator: 'allowed',
        hints: ['Area = base × height. Write in what you know.', `${b} × height = ${A}. What number times ${b} gives ${A}?`],
        solution: `$${b} \\times h = ${A}$, so $h = ${A} \\div ${b} = ${h}$ ${u}.`,
      };
    }
    if (kind === 'triangle') {
      const b = rng.int(4, 20);
      let h = rng.int(3, 16);
      if ((b * h) % 2 === 1) h += 1;
      const A = (b * h) / 2;
      return {
        type: 'numeric',
        prompt: `A triangle has an area of ${A} ${u}² and a base of ${b} ${u}. Find its perpendicular height.`,
        answer: h,
        units: u,
        calculator: 'allowed',
        hints: ['Area = ½ × base × height.', `Doubling the area gives base × height: $2 \\times ${A} = ${2 * A}$.`],
        solution: [
          `$\\frac{1}{2} \\times ${b} \\times h = ${A}$`,
          `Double both sides: $${b} \\times h = ${2 * A}$`,
          `$h = ${2 * A} \\div ${b} = ${h}$ ${u}.`,
        ].join('\n\n'),
      };
    }
    let a = rng.int(6, 20);
    let b = rng.int(2, 16);
    if (b >= a) [a, b] = [b + 2, a];
    let h = rng.int(2, 12);
    if (((a + b) * h) % 2 === 1) h += 1;
    const A = ((a + b) * h) / 2;
    return {
      type: 'numeric',
      prompt: `A trapezium has parallel sides of ${a} ${u} and ${b} ${u}. Its area is ${A} ${u}². Find its perpendicular height.`,
      answer: h,
      units: u,
      calculator: 'allowed',
      hints: ['Area = ½ × (a + b) × h.', `Here ½ × ${a + b} × h = ${A}. Work out ½ × ${a + b} first.`],
      solution: [
        `$\\frac{1}{2} \\times (${a} + ${b}) \\times h = ${A}$`,
        `$${tex(clean((a + b) / 2))} \\times h = ${A}$`,
        `$h = ${A} \\div ${tex(clean((a + b) / 2))} = ${h}$ ${u}.`,
      ].join('\n\n'),
    };
  },
};

function houseFigure(labels: { w: string; hr: string; ht: string }) {
  const x0 = 60;
  const W = 220;
  const HR = 110;
  const HT = 70;
  const yBase = 30 + HT + HR;
  const pts: Pt[] = [
    { x: x0, y: yBase },
    { x: x0 + W, y: yBase },
    { x: x0 + W, y: yBase - HR },
    { x: x0 + W / 2, y: yBase - HR - HT },
    { x: x0, y: yBase - HR },
  ];
  const cen = { x: x0 + W / 2, y: yBase - HR / 2 };
  let body = polygon(pts);
  body += line(pts[4]!, pts[2]!, { stroke: '#6b7280', width: 1.2, dash: true });
  const apex = pts[3]!;
  const foot = { x: apex.x, y: yBase - HR };
  body += line(apex, foot, { stroke: HEIGHT_COLOUR, width: 1.6, dash: true });
  body += rightAngleMark(foot, { x: foot.x + 10, y: foot.y }, apex, 9);
  body += labelAway(pts[0]!, pts[1]!, cen, labels.w);
  body += labelAway(pts[1]!, pts[2]!, cen, labels.hr);
  body += labelAway(apex, foot, { x: apex.x + 30, y: foot.y - HT / 2 }, labels.ht, { fill: HEIGHT_COLOUR, offset: 6 });
  for (const i of [0, 1]) body += rightAngleMark(pts[i]!, pts[i === 0 ? 1 : 0]!, pts[i === 0 ? 4 : 2]!, 9);
  body += notToScale({ x: x0 + W + 75, y: yBase + 38 });
  return svgDoc(x0 + W + 85, yBase + 50, body);
}

function holeFigure(labels: { W: string; H: string; w: string; h: string }) {
  const x0 = 60;
  const y0 = 25;
  const W = 260;
  const H = 170;
  const iw = 110;
  const ih = 65;
  const ix = x0 + 95;
  const iy = y0 + 55;
  const outer: Pt[] = [
    { x: x0, y: y0 },
    { x: x0 + W, y: y0 },
    { x: x0 + W, y: y0 + H },
    { x: x0, y: y0 + H },
  ];
  const inner: Pt[] = [
    { x: ix, y: iy },
    { x: ix + iw, y: iy },
    { x: ix + iw, y: iy + ih },
    { x: ix, y: iy + ih },
  ];
  let body = polygon(outer, { fill: '#bbf7d0' });
  body += polygon(inner, { fill: '#ffffff' });
  body += labelAway(outer[3]!, outer[2]!, centroid(outer), labels.W);
  body += labelAway(outer[0]!, outer[3]!, centroid(outer), labels.H);
  // Inner labels go inside the hole.
  body += labelAway(inner[3]!, inner[2]!, { x: ix + iw / 2, y: iy + ih + 40 }, labels.w, { offset: 4 });
  body += labelAway(inner[1]!, inner[2]!, { x: ix + iw + 40, y: iy + ih / 2 }, labels.h, { offset: 4 });
  body += notToScale({ x: x0 + W, y: y0 + H + 38 });
  return svgDoc(x0 + W + 20, y0 + H + 50, body);
}

export const compositeArea: QuestionTemplate = {
  id: 'm9.mea.area.composite',
  topicId: 'm9.mea.area',
  title: 'Area of composite shapes',
  difficulties: [3, 4, 5],
  generate({ rng, difficulty }) {
    const u = rng.pick(['cm', 'm'] as const);
    if (difficulty === 3) {
      const W = rng.int(8, 20);
      const H = rng.int(6, 16);
      const w2 = rng.int(2, W - 3);
      const h2 = rng.int(2, H - 3);
      const top = W - w2;
      const right = H - h2;
      const area = W * H - w2 * h2;
      return {
        type: 'numeric',
        prompt: 'Find the area of this shape. All the corners are right angles.',
        figure: {
          svg: lShapeFigure(W, H, w2, h2, rng.chance(0.5), { bottom: `${W} ${u}`, left: `${H} ${u}`, top: `${top} ${u}`, right: `${right} ${u}` }),
          alt: `An L-shape: bottom ${W} ${u}, tall side ${H} ${u}, shorter top edge ${top} ${u}, shorter side edge ${right} ${u}.`,
        },
        answer: area,
        units: `${u}²`,
        calculator: 'allowed',
        hints: ['Split the shape into two rectangles with one straight cut.', 'Work out any missing lengths first, then add the two areas.'],
        solution: [
          `Cut the shape into two rectangles: one ${W} by ${right} along the bottom, and one ${top} by ${h2} on top (the missing edge is $${H} - ${right} = ${h2}$).`,
          `Area $= ${W} \\times ${right} + ${top} \\times ${h2} = ${W * right} + ${top * h2} = ${area}$ ${u}².`,
          `Check another way: the big ${W} by ${H} rectangle minus the missing ${w2} by ${h2} corner: $${W * H} - ${w2 * h2} = ${area}$ ✓`,
        ].join('\n\n'),
      };
    }
    const W = rng.int(12, 30);
    const H = rng.int(8, 20);
    const w = rng.int(2, Math.floor(W / 2));
    const h = rng.int(2, Math.floor(H / 2));
    const lawn = W * H - w * h;
    if (difficulty === 4 && rng.chance(0.4)) {
      return {
        type: 'numeric',
        prompt: `A rectangular section is ${W} m by ${H} m. A ${w} m by ${h} m vegetable garden is in the middle, and the rest (shaded) is lawn. Find the area of the lawn.`,
        figure: { svg: holeFigure({ W: `${W} m`, H: `${H} m`, w: `${w} m`, h: `${h} m` }), alt: `A ${W} m by ${H} m rectangle shaded green, with an unshaded ${w} m by ${h} m rectangle inside it.` },
        answer: lawn,
        units: 'm²',
        calculator: 'allowed',
        hints: ['Find the area of the whole section, then take away the garden.'],
        solution: `Whole section: $${W} \\times ${H} = ${W * H}$ m². Garden: $${w} \\times ${h} = ${w * h}$ m².\n\nLawn $= ${W * H} - ${w * h} = ${lawn}$ m².`,
      };
    }
    if (difficulty === 4) {
      const w = 2 * rng.int(3, 12);
      const hr = rng.int(3, 12);
      const ht = rng.int(2, 9);
      const rect = w * hr;
      const tri = (w * ht) / 2;
      const area = rect + tri;
      return {
        type: 'numeric',
        prompt: 'This shape is a rectangle with a triangle on top. Find its total area.',
        figure: { svg: houseFigure({ w: `${w} ${u}`, hr: `${hr} ${u}`, ht: `${ht} ${u}` }), alt: `A house shape: a rectangle ${w} ${u} wide and ${hr} ${u} tall, with a triangle on top whose perpendicular height is ${ht} ${u}.` },
        answer: area,
        units: `${u}²`,
        calculator: 'allowed',
        hints: ['Find the area of the rectangle and the triangle separately, then add.', `The triangle's base is the top of the rectangle, ${w} ${u}.`],
        solution: [
          `Rectangle: $${w} \\times ${hr} = ${rect}$ ${u}².`,
          `Triangle: $\\frac{1}{2} \\times ${w} \\times ${ht} = ${tri}$ ${u}².`,
          `Total area $= ${rect} + ${tri} = ${area}$ ${u}².`,
        ].join('\n\n'),
      };
    }
    // difficulty 5: lawn with a garden bed cut out, then cost of turf.
    const price = rng.pick([8, 9, 12, 14, 15, 18]);
    const cost = lawn * price;
    return {
      type: 'numeric',
      prompt: `A rectangular section is ${W} m by ${H} m. A ${w} m by ${h} m vegetable garden is in the middle, and the rest (shaded) will be covered in new grass turf. Turf costs \\$${price} per square metre. How much will the turf cost?`,
      figure: { svg: holeFigure({ W: `${W} m`, H: `${H} m`, w: `${w} m`, h: `${h} m` }), alt: `A ${W} m by ${H} m rectangle shaded green, with an unshaded ${w} m by ${h} m rectangle inside it.` },
      answer: cost,
      units: '$',
      calculator: 'allowed',
      hints: ['First find the area to be turfed: the whole section minus the garden.', `Then multiply the area by \\$${price}.`],
      solution: [
        `Whole section: $${W} \\times ${H} = ${W * H}$ m². Garden: $${w} \\times ${h} = ${w * h}$ m².`,
        `Area of turf: $${W * H} - ${w * h} = ${lawn}$ m².`,
        `Cost: $${lawn} \\times ${price} = ${tex(cost)}$, so the turf costs **${money(cost).replace('$', '\\$')}**.`,
      ].join('\n\n'),
    };
  },
};
