import type { QuestionTemplate, TemplateOutput } from '../../types';
import { clean, NAMES, num, round, tex } from '../../format';
import { circle, dot, label, line, polygon, rightAngleMark, svgDoc, type Pt } from '../../svg';
import { centroid, equalTick, labelAway, notToScale, parallelMarks, pathShape, polar, sector } from './figures';

// m9.mea.perimeter-circles — perimeter of polygons, circumference (C = πd = 2πr) and the
// perimeter of semicircles, quarter circles and simple composite shapes.

const UNITS = ['cm', 'm', 'mm'] as const;

/** Rounds a π answer to dp, and also accepts the value found using π ≈ 3.14 if it differs. */
function piAnswer(exact: number, with314: number, dp = 1) {
  const answer = round(exact, dp);
  const alt = round(with314, dp);
  return { answer, decimals: dp, ...(alt !== answer ? { alternatives: [alt] } : {}) };
}

/** True if x is close to a rounding boundary at dp places (avoid these so rounded working agrees). */
function borderline(x: number, dp = 1): boolean {
  const scaled = x * 10 ** dp;
  return Math.abs((scaled - Math.floor(scaled)) - 0.5) < 0.15;
}

/** x to 2 dp with "≈", or exactly if it is exact at 2 dp. */
function approx(x: number): string {
  return Math.abs(round(x, 2) - x) < 1e-9 ? `= ${tex(x)}` : `\\approx ${tex(round(x, 2), 2)}`;
}

const PI_PROMPT = 'Use the π button on your calculator and give your answer to 1 decimal place.';

// ---------------------------------------------------------------- polygons

export function rectFigure(l: number, w: number, labels: { l: string; w: string }, square = false) {
  const ratio = square ? 1 : Math.min(2.6, Math.max(1.25, l / w));
  const W = ratio >= 1.6 ? 240 : 190;
  const H = W / ratio;
  const x0 = 70;
  const y0 = 30;
  const pts: Pt[] = [
    { x: x0, y: y0 },
    { x: x0 + W, y: y0 },
    { x: x0 + W, y: y0 + H },
    { x: x0, y: y0 + H },
  ];
  const c = centroid(pts);
  let body = polygon(pts);
  body += labelAway(pts[3]!, pts[2]!, c, labels.l);
  body += labelAway(pts[1]!, pts[2]!, c, labels.w);
  if (square) {
    for (let i = 0; i < 4; i++) body += equalTick(pts[i]!, pts[(i + 1) % 4]!);
  }
  for (let i = 0; i < 4; i++) body += rightAngleMark(pts[i]!, pts[(i + 1) % 4]!, pts[(i + 3) % 4]!, 9);
  body += notToScale({ x: x0 + W + 70, y: y0 + H + 40 });
  return svgDoc(x0 + W + 80, y0 + H + 55, body);
}

/** Triangle with sides a (right), b (left), c (base), drawn to shape. */
function triangleFigure(a: number, b: number, c: number, labels: [string, string, string], ticks?: [number, number, number]) {
  const ax = (c * c + b * b - a * a) / (2 * c);
  const ay = Math.sqrt(Math.max(0, b * b - ax * ax));
  const minX = Math.min(0, ax);
  const maxX = Math.max(c, ax);
  const s = Math.min(250 / (maxX - minX), 150 / ay);
  const ox = 60 - minX * s;
  const oy = 30 + ay * s;
  const P0 = { x: ox, y: oy };
  const P1 = { x: ox + c * s, y: oy };
  const A = { x: ox + ax * s, y: oy - ay * s };
  const cen = centroid([P0, P1, A]);
  let body = polygon([P0, P1, A]);
  body += labelAway(P1, A, cen, labels[0]);
  body += labelAway(A, P0, cen, labels[1]);
  body += labelAway(P0, P1, cen, labels[2]);
  if (ticks) {
    if (ticks[0]) body += equalTick(P1, A, ticks[0]);
    if (ticks[1]) body += equalTick(A, P0, ticks[1]);
    if (ticks[2]) body += equalTick(P0, P1, ticks[2]);
  }
  const width = (maxX - minX) * s + 120;
  body += notToScale({ x: width - 10, y: oy + 40 });
  return svgDoc(width, oy + 55, body);
}

function regularPolygonFigure(n: number, sideLabel: string) {
  const c = { x: 150, y: 120 };
  const R = 85;
  const start = n % 2 === 1 ? 90 : 90 + 180 / n; // flat bottom edge
  const pts = Array.from({ length: n }, (_, i) => polar(c, R, start + (360 * i) / n));
  let body = polygon(pts);
  for (let i = 0; i < n; i++) body += equalTick(pts[i]!, pts[(i + 1) % n]!);
  // Label the bottom edge (the edge with the largest midpoint y).
  let best = 0;
  for (let i = 0; i < n; i++) {
    const my = (pts[i]!.y + pts[(i + 1) % n]!.y) / 2;
    const bm = (pts[best]!.y + pts[(best + 1) % n]!.y) / 2;
    if (my > bm) best = i;
  }
  body += labelAway(pts[best]!, pts[(best + 1) % n]!, c, sideLabel);
  return svgDoc(300, 240, body);
}

function parallelogramFigure(base: string, side: string) {
  const pts: Pt[] = [
    { x: 60, y: 160 },
    { x: 260, y: 160 },
    { x: 320, y: 50 },
    { x: 120, y: 50 },
  ];
  const c = centroid(pts);
  let body = polygon(pts);
  body += labelAway(pts[0]!, pts[1]!, c, base);
  body += labelAway(pts[1]!, pts[2]!, c, side);
  body += parallelMarks(pts[0]!, pts[1]!, 1) + parallelMarks(pts[3]!, pts[2]!, 1);
  body += parallelMarks(pts[0]!, pts[3]!, 2) + parallelMarks(pts[1]!, pts[2]!, 2);
  body += notToScale({ x: 370, y: 205 });
  return svgDoc(380, 220, body);
}

/** L-shape: W × H with a w2 × h2 notch cut from the top-right (or top-left if mirrored). */
export function lShapeFigure(W: number, H: number, w2: number, h2: number, mirror: boolean, labels: Record<string, string>) {
  const s = Math.min(240 / W, 170 / H);
  const ox = 70;
  const oy = 30;
  const X = (x: number) => ox + (mirror ? W - x : x) * s;
  const Y = (y: number) => oy + (H - y) * s;
  const P = (x: number, y: number): Pt => ({ x: X(x), y: Y(y) });
  // Corners (maths coords, y up) going round.
  const pts = [P(0, 0), P(W, 0), P(W, H - h2), P(W - w2, H - h2), P(W - w2, H), P(0, H)];
  const inside = P((W - w2) / 2, (H - h2) / 2);
  let body = polygon(pts);
  const edge = (i: number, text: string | undefined) => {
    if (!text) return '';
    const a = pts[i]!;
    const b = pts[(i + 1) % 6]!;
    // For the notch edges the "inside" reference must be inside the shape near that edge.
    return labelAway(a, b, i === 2 || i === 3 ? P(W - w2 - 0.5, H - h2 - 0.5) : inside, text);
  };
  body += edge(0, labels.bottom) + edge(1, labels.right) + edge(2, labels.notchH) + edge(3, labels.notchV) + edge(4, labels.top) + edge(5, labels.left);
  for (let i = 0; i < 6; i++) {
    if (i === 3) continue; // reflex corner
    body += rightAngleMark(pts[i]!, pts[(i + 1) % 6]!, pts[(i + 5) % 6]!, 8);
  }
  body += notToScale({ x: ox + W * s + 75, y: oy + H * s + 42 });
  return svgDoc(ox + W * s + 85, oy + H * s + 55, body);
}

export const polygonPerimeter: QuestionTemplate = {
  id: 'm9.mea.perimeter-circles.polygons',
  topicId: 'm9.mea.perimeter-circles',
  title: 'Perimeter of rectangles, triangles, polygons and L-shapes',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    const u = rng.pick(UNITS);
    if (difficulty === 1) {
      if (rng.chance(0.3)) {
        const s = rng.int(3, 25);
        return {
          type: 'numeric',
          prompt: 'Find the perimeter of this square.',
          figure: { svg: rectFigure(s, s, { l: `${s} ${u}`, w: '' }, true), alt: `A square with side ${s} ${u}.` },
          answer: 4 * s,
          units: u,
          calculator: 'not-allowed',
          hints: ['Perimeter is the total distance around the outside.', 'A square has four equal sides.'],
          solution: `All four sides are ${s} ${u}.\n\nPerimeter $= 4 \\times ${s} = ${4 * s}$ ${u}.`,
        };
      }
      const l = rng.int(5, 30);
      const w = rng.int(2, l - 2);
      return {
        type: 'numeric',
        prompt: 'Find the perimeter of this rectangle.',
        figure: { svg: rectFigure(l, w, { l: `${l} ${u}`, w: `${w} ${u}` }), alt: `A rectangle ${l} ${u} long and ${w} ${u} wide.` },
        answer: 2 * (l + w),
        units: u,
        calculator: 'not-allowed',
        hints: ['Perimeter is the total distance around the outside.', 'A rectangle has two lengths and two widths.'],
        solution: `Perimeter $= ${l} + ${w} + ${l} + ${w} = 2 \\times (${l} + ${w}) = ${2 * (l + w)}$ ${u}.`,
      };
    }

    if (difficulty === 2) {
      const kind = rng.pick(['scalene', 'isosceles', 'regular', 'parallelogram'] as const);
      if (kind === 'scalene') {
        let a: number;
        let b: number;
        let c: number;
        do {
          c = rng.int(8, 20);
          a = rng.int(5, 18);
          b = rng.int(5, 18);
        } while (!(a + b > c + 2 && a + c > b + 2 && b + c > a + 2) || a === b);
        return {
          type: 'numeric',
          prompt: 'Find the perimeter of this triangle.',
          figure: {
            svg: triangleFigure(a, b, c, [`${a} ${u}`, `${b} ${u}`, `${c} ${u}`]),
            alt: `A triangle with sides ${a} ${u}, ${b} ${u} and ${c} ${u}.`,
          },
          answer: a + b + c,
          units: u,
          calculator: 'not-allowed',
          hints: ['Add up the lengths of all the sides.'],
          solution: `Perimeter $= ${a} + ${b} + ${c} = ${a + b + c}$ ${u}.`,
        };
      }
      if (kind === 'isosceles') {
        const e = rng.int(6, 20);
        let base = rng.int(4, 2 * e - 3);
        if (base === e) base += 1;
        return {
          type: 'numeric',
          prompt: 'This triangle is isosceles: the sides with the same marks are equal. Find its perimeter.',
          figure: {
            svg: triangleFigure(e, e, base, ['', `${e} ${u}`, `${base} ${u}`], [1, 1, 0]),
            alt: `An isosceles triangle with two equal sides of ${e} ${u} (only one is labelled) and a base of ${base} ${u}.`,
          },
          answer: 2 * e + base,
          units: u,
          calculator: 'not-allowed',
          hints: ['The marks show which sides are equal.', 'There are two sides of the labelled length, plus the base.'],
          solution: `The two marked sides are both ${e} ${u}.\n\nPerimeter $= ${e} + ${e} + ${base} = ${2 * e + base}$ ${u}.`,
        };
      }
      if (kind === 'regular') {
        const [n, name] = rng.pick([
          [5, 'pentagon'],
          [6, 'hexagon'],
          [8, 'octagon'],
        ] as const);
        const s = rng.chance(0.5) ? rng.int(3, 15) : clean(rng.int(3, 14) + 0.5);
        const P = clean(n * s);
        return {
          type: 'numeric',
          prompt: `This is a regular ${name} (all its sides are equal). Find its perimeter.`,
          figure: { svg: regularPolygonFigure(n, `${num(s)} ${u}`), alt: `A regular ${name} with each side ${num(s)} ${u}.` },
          answer: P,
          units: u,
          calculator: 'not-allowed',
          hints: [`Count the sides of a ${name}.`, 'Every side has the same length.'],
          solution: `A ${name} has ${n} sides, each ${num(s)} ${u}.\n\nPerimeter $= ${n} \\times ${tex(s)} = ${tex(P)}$ ${u}.`,
        };
      }
      const p = rng.int(6, 20);
      let q = rng.int(3, 15);
      if (q === p) q -= 1;
      return {
        type: 'numeric',
        prompt: 'Find the perimeter of this parallelogram. (Arrows show parallel sides.)',
        figure: { svg: parallelogramFigure(`${p} ${u}`, `${q} ${u}`), alt: `A parallelogram with sides ${p} ${u} and ${q} ${u}.` },
        answer: 2 * (p + q),
        units: u,
        calculator: 'not-allowed',
        hints: ['Opposite sides of a parallelogram are equal.', 'So there are two sides of each length.'],
        solution: `Opposite sides are equal, so the sides are ${p}, ${q}, ${p} and ${q} ${u}.\n\nPerimeter $= 2 \\times (${p} + ${q}) = ${2 * (p + q)}$ ${u}.`,
      };
    }

    // difficulty 3
    if (rng.chance(0.6)) {
      const W = rng.int(8, 20);
      const H = rng.int(6, 16);
      const w2 = rng.int(2, W - 3);
      const h2 = rng.int(2, H - 3);
      const mirror = rng.chance(0.5);
      const top = W - w2;
      const right = H - h2;
      const P = 2 * (W + H);
      return {
        type: 'numeric',
        prompt: 'Find the perimeter of this shape. All the corners are right angles.',
        figure: {
          svg: lShapeFigure(W, H, w2, h2, mirror, {
            bottom: `${W} ${u}`,
            left: `${H} ${u}`,
            top: `${top} ${u}`,
            right: `${right} ${u}`,
          }),
          alt: `An L-shape. The bottom is ${W} ${u}, the tall side is ${H} ${u}, the shorter top edge is ${top} ${u} and the shorter side edge is ${right} ${u}. Two edges of the step are not labelled.`,
        },
        answer: P,
        units: u,
        calculator: 'not-allowed',
        hints: [
          'Two sides are not labelled. Work them out first.',
          `The two horizontal edges at the top must add up to the bottom edge, ${W} ${u}. The two vertical edges on the stepped side must add up to ${H} ${u}.`,
        ],
        solution: [
          `Missing horizontal edge: $${W} - ${top} = ${w2}$ ${u}.`,
          `Missing vertical edge: $${H} - ${right} = ${h2}$ ${u}.`,
          `Perimeter $= ${W} + ${right} + ${w2} + ${h2} + ${top} + ${H} = ${P}$ ${u}.`,
        ].join('\n\n'),
      };
    }
    const l = rng.int(8, 30);
    const w = rng.int(3, l - 2);
    const P = 2 * (l + w);
    return {
      type: 'numeric',
      prompt: `A rectangular vegetable garden has a perimeter of ${P} ${u}. Its length is ${l} ${u}. How wide is it?`,
      answer: w,
      units: u,
      calculator: 'not-allowed',
      hints: ['The perimeter is two lengths plus two widths.', `Take away the two lengths from ${P} ${u}, then share what is left between the two widths.`],
      solution: [
        `Two lengths: $2 \\times ${l} = ${2 * l}$ ${u}.`,
        `The two widths together: $${P} - ${2 * l} = ${P - 2 * l}$ ${u}.`,
        `One width: $${P - 2 * l} \\div 2 = ${w}$ ${u}.`,
        `Check: $2 \\times (${l} + ${w}) = ${P}$ ✓`,
      ].join('\n\n'),
    };
  },
};

// ---------------------------------------------------------------- circumference

function circleFigure(kind: 'diameter' | 'radius', text: string, angle: number) {
  const c = { x: 150, y: 120 };
  const R = 85;
  let body = circle(c, R, { fill: '#eff6ff' }) + dot(c);
  const p = polar(c, R, angle);
  if (kind === 'diameter') {
    const q = polar(c, R, angle + 180);
    body += line(p, q, { stroke: '#2563eb' });
    body += labelAway(q, p, polar(c, 30, angle - 90), text, { fill: '#2563eb', offset: 16 });
  } else {
    body += line(c, p, { stroke: '#2563eb' });
    body += labelAway(c, p, polar(c, 30, angle - 90), text, { fill: '#2563eb' });
  }
  return svgDoc(300, 240, body);
}

export const circumference: QuestionTemplate = {
  id: 'm9.mea.perimeter-circles.circumference',
  topicId: 'm9.mea.perimeter-circles',
  title: 'Circumference of a circle (C = πd = 2πr)',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    const u = rng.pick(['cm', 'm', 'mm'] as const);
    const angle = rng.pick([10, 20, 30, 150, 160, 170, 200, 340]);
    if (difficulty === 2) {
      let d: number;
      do d = rng.chance(0.7) ? rng.int(3, 60) : clean(rng.int(3, 30) + 0.5);
      while (borderline(Math.PI * d) || borderline(3.14 * d));
      const C = Math.PI * d;
      return {
        type: 'numeric',
        prompt: `Find the circumference of this circle. ${PI_PROMPT}`,
        figure: { svg: circleFigure('diameter', `${num(d)} ${u}`, angle), alt: `A circle with a diameter of ${num(d)} ${u} drawn through its centre.` },
        ...piAnswer(C, 3.14 * d),
        units: u,
        calculator: 'allowed',
        hints: ['The line goes right across the circle through the centre, so it is the diameter.', 'Use $C = \\pi d$.'],
        solution: `$C = \\pi d = \\pi \\times ${tex(d)} ${approx(C)}$, so $C \\approx ${tex(round(C, 1), 1)}$ ${u}.`,
      };
    }
    if (difficulty === 3) {
      if (rng.chance(0.55)) {
        let r: number;
        do r = rng.chance(0.7) ? rng.int(2, 30) : clean(rng.int(2, 15) + 0.5);
        while (borderline(2 * Math.PI * r) || borderline(2 * 3.14 * r));
        const C = 2 * Math.PI * r;
        return {
          type: 'numeric',
          prompt: `Find the circumference of this circle. ${PI_PROMPT}`,
          figure: { svg: circleFigure('radius', `${num(r)} ${u}`, angle), alt: `A circle with a radius of ${num(r)} ${u} drawn from the centre to the edge.` },
          ...piAnswer(C, 2 * 3.14 * r),
          units: u,
          calculator: 'allowed',
          hints: ['The line goes from the centre to the edge, so it is the radius, not the diameter.', 'Use $C = 2\\pi r$ (or double the radius to get the diameter, then use $C = \\pi d$).'],
          solution: `$C = 2\\pi r = 2 \\times \\pi \\times ${tex(r)} ${approx(C)}$, so $C \\approx ${tex(round(C, 1), 1)}$ ${u}.\n\n(Or: $d = 2 \\times ${tex(r)} = ${tex(2 * r)}$, and $C = \\pi \\times ${tex(2 * r)}$.)`,
        };
      }
      // Reverse: circumference → diameter.
      const [what, cu, lo, hi] = rng.pick([
        ['a hula hoop', 'cm', 60, 100],
        ['a round table', 'cm', 80, 150],
        ['a circular pond', 'm', 2, 25],
        ['a tree trunk', 'cm', 30, 200],
        ['a round trampoline', 'm', 2, 5],
      ] as const);
      let d: number;
      let C: number;
      do {
        d = rng.int(lo, hi);
        C = round(Math.PI * d, 1);
      } while (borderline(C / Math.PI) || borderline(C / 3.14));
      return {
        type: 'numeric',
        prompt: `The circumference of ${what} is ${num(C)} ${cu}. Find its diameter. ${PI_PROMPT}`,
        ...piAnswer(C / Math.PI, C / 3.14),
        units: cu,
        calculator: 'allowed',
        hints: ['$\\pi = C \\div d$, so $d = C \\div \\pi$.'],
        solution: `$C = \\pi d$, so $d = C \\div \\pi = ${tex(C)} \\div \\pi ${approx(C / Math.PI)}$.\n\nThe diameter is about **${num(round(C / Math.PI, 1), 1)} ${cu}**.`,
      };
    }
    // difficulty 4: contexts
    const kind = rng.pick(['wheel', 'laps', 'radius'] as const);
    if (kind === 'wheel') {
      let D: number;
      let n: number;
      let dist: number;
      do {
        D = rng.int(50, 72);
        n = 10 * rng.int(2, 30);
        dist = (n * Math.PI * D) / 100;
      } while (borderline(dist) || borderline((n * 3.14 * D) / 100));
      const who = rng.pick(NAMES);
      return {
        type: 'numeric',
        prompt: `The wheels on ${who}'s bike have a diameter of ${D} cm. How far does the bike travel when the wheels turn ${n} times? Give your answer in metres to 1 decimal place.`,
        ...piAnswer(dist, (n * 3.14 * D) / 100),
        units: 'm',
        calculator: 'allowed',
        hints: ['In one turn, the bike moves forward one circumference of the wheel.', 'Find the circumference in cm, multiply by the number of turns, then change cm to m.'],
        solution: [
          `One turn: $C = \\pi \\times ${D} ${approx(Math.PI * D)}$ cm.`,
          `${n} turns: $${n} \\times ${tex(round(Math.PI * D, 2), 2)} ${approx(n * Math.PI * D)}$ cm.`,
          `In metres: $\\div 100$, so about **${num(round(dist, 1), 1)} m**.`,
        ].join('\n\n'),
      };
    }
    if (kind === 'laps') {
      let d: number;
      let laps: number;
      let dist: number;
      do {
        d = rng.int(12, 60);
        laps = rng.int(2, 6);
        dist = laps * Math.PI * d;
      } while (borderline(dist) || borderline(laps * 3.14 * d));
      const who = rng.pick(NAMES);
      return {
        type: 'numeric',
        prompt: `A circular pond has a diameter of ${d} m. ${who} walks around the edge of the pond ${laps} times. How far does ${who} walk? ${PI_PROMPT}`,
        ...piAnswer(dist, laps * 3.14 * d),
        units: 'm',
        calculator: 'allowed',
        hints: ['One lap is one circumference.', `Find the circumference, then multiply by ${laps}.`],
        solution: `One lap: $C = \\pi \\times ${d} ${approx(Math.PI * d)}$ m.\n\n${laps} laps: $${laps} \\times \\pi \\times ${d} ${approx(dist)}$ m, so about **${num(round(dist, 1), 1)} m**.`,
      };
    }
    let r: number;
    let C: number;
    do {
      r = rng.int(3, 40);
      C = round(2 * Math.PI * r, 1);
    } while (borderline(C / (2 * Math.PI)) || borderline(C / 6.28));
    return {
      type: 'numeric',
      prompt: `A circle has a circumference of ${num(C, 1)} ${u}. Find its **radius**. ${PI_PROMPT}`,
      ...piAnswer(C / (2 * Math.PI), C / 6.28),
      units: u,
      calculator: 'allowed',
      hints: ['First find the diameter using $d = C \\div \\pi$.', 'The radius is half the diameter.'],
      solution: `$d = C \\div \\pi = ${tex(C, 1)} \\div \\pi ${approx(C / Math.PI)}$ ${u}.\n\n$r = d \\div 2 ${approx(C / (2 * Math.PI))}$, so the radius is about **${num(round(C / (2 * Math.PI), 1), 1)} ${u}**.`,
    };
  },
};

// ---------------------------------------------------------------- semicircles, quarter circles, composites

function semicircleFigure(text: string) {
  const c = { x: 160, y: 150 };
  const R = 110;
  let body = sector(c, R, 0, 180);
  body += label({ x: c.x, y: c.y + 18 }, text, { fill: '#2563eb' });
  body += notToScale({ x: 310, y: 190 });
  return svgDoc(320, 200, body);
}

function quarterFigure(text: string) {
  const c = { x: 70, y: 210 };
  const R = 170;
  let body = sector(c, R, 0, 90);
  body += rightAngleMark(c, polar(c, 10, 0), polar(c, 10, 90), 12);
  body += label({ x: c.x + R / 2, y: c.y + 18 }, text, { fill: '#2563eb' });
  body += notToScale({ x: 300, y: 240 });
  return svgDoc(310, 250, body);
}

function windowFigure(wText: string, hText: string) {
  // Rectangle with a semicircle on top.
  const x0 = 90;
  const W = 160;
  const H = 130;
  const yTop = 110;
  const c = { x: x0 + W / 2, y: yTop };
  const d = `M ${x0} ${yTop} A ${W / 2} ${W / 2} 0 0 1 ${x0 + W} ${yTop} L ${x0 + W} ${yTop + H} L ${x0} ${yTop + H} Z`;
  let body = pathShape(d);
  body += line({ x: x0, y: yTop }, { x: x0 + W, y: yTop }, { stroke: '#6b7280', width: 1.2, dash: true });
  body += label({ x: c.x, y: yTop + H + 18 }, wText);
  body += labelAway({ x: x0 + W, y: yTop }, { x: x0 + W, y: yTop + H }, { x: c.x, y: yTop + H / 2 }, hText);
  body += notToScale({ x: 340, y: yTop + H + 40 });
  return svgDoc(350, yTop + H + 52, body);
}

function trackFigure(lText: string, dText: string) {
  const x0 = 90;
  const L = 180;
  const D = 110;
  const y0 = 30;
  const r = D / 2;
  const d = `M ${x0} ${y0} L ${x0 + L} ${y0} A ${r} ${r} 0 0 1 ${x0 + L} ${y0 + D} L ${x0} ${y0 + D} A ${r} ${r} 0 0 1 ${x0} ${y0} Z`;
  let body = pathShape(d);
  body += line({ x: x0, y: y0 }, { x: x0, y: y0 + D }, { stroke: '#6b7280', width: 1.2, dash: true });
  body += line({ x: x0 + L, y: y0 }, { x: x0 + L, y: y0 + D }, { stroke: '#6b7280', width: 1.2, dash: true });
  body += label({ x: x0 + L / 2, y: y0 + D + 18 }, lText);
  body += label({ x: x0 + L + 14, y: y0 + D / 2 }, dText, { anchor: 'start' });
  body += notToScale({ x: x0 + L + r + 30, y: y0 + D + 40 });
  return svgDoc(x0 + L + r + 40, y0 + D + 52, body);
}

export const semicirclesAndComposites: QuestionTemplate = {
  id: 'm9.mea.perimeter-circles.semicircles',
  topicId: 'm9.mea.perimeter-circles',
  title: 'Perimeter of semicircles, quarter circles and composite shapes',
  difficulties: [3, 4, 5],
  generate({ rng, difficulty }): TemplateOutput {
    const u = rng.pick(['cm', 'm'] as const);
    if (difficulty === 3) {
      let d: number;
      do d = rng.int(4, 40);
      while (borderline((Math.PI * d) / 2 + d) || borderline((3.14 * d) / 2 + d));
      const curved = (Math.PI * d) / 2;
      const P = curved + d;
      return {
        type: 'numeric',
        prompt: `Find the perimeter of this semicircle. ${PI_PROMPT}`,
        figure: { svg: semicircleFigure(`${d} ${u}`), alt: `A semicircle. Its straight edge (the diameter) is ${d} ${u}.` },
        ...piAnswer(P, (3.14 * d) / 2 + d),
        units: u,
        calculator: 'allowed',
        hints: [
          'The perimeter has two parts: the curved edge and the straight edge.',
          'The curved edge is half the circumference of a full circle with this diameter.',
        ],
        solution: [
          `Curved edge: $\\frac{1}{2} \\times \\pi \\times ${d} ${approx(curved)}$ ${u}.`,
          `Straight edge: the diameter, ${d} ${u}.`,
          `Perimeter $\\approx ${tex(round(curved, 2), 2)} + ${d} ${approx(P)}$, so about **${num(round(P, 1), 1)} ${u}**.`,
        ].join('\n\n'),
      };
    }
    if (difficulty === 4) {
      if (rng.chance(0.6)) {
        let r: number;
        do r = rng.int(3, 30);
        while (borderline((Math.PI * r) / 2 + 2 * r) || borderline((3.14 * r) / 2 + 2 * r));
        const curved = (2 * Math.PI * r) / 4;
        const P = curved + 2 * r;
        return {
          type: 'numeric',
          prompt: `This shape is a quarter of a circle. Find its perimeter. ${PI_PROMPT}`,
          figure: { svg: quarterFigure(`${r} ${u}`), alt: `A quarter circle with radius ${r} ${u}. It has two straight edges (both radii) meeting at a right angle, and a curved edge.` },
          ...piAnswer(P, (2 * 3.14 * r) / 4 + 2 * r),
          units: u,
          calculator: 'allowed',
          hints: [
            'The curved edge is one quarter of the circumference of the full circle.',
            'Do not forget the two straight edges. Each one is a radius.',
          ],
          solution: [
            `Curved edge: $\\frac{1}{4} \\times 2 \\times \\pi \\times ${r} ${approx(curved)}$ ${u}.`,
            `Straight edges: $2 \\times ${r} = ${2 * r}$ ${u}.`,
            `Perimeter $\\approx ${tex(round(curved, 2), 2)} + ${2 * r} ${approx(P)}$, so about **${num(round(P, 1), 1)} ${u}**.`,
          ].join('\n\n'),
        };
      }
      let r: number;
      do r = rng.int(3, 25);
      while (borderline(Math.PI * r + 2 * r) || borderline(3.14 * r + 2 * r));
      const curved = Math.PI * r;
      const P = curved + 2 * r;
      return {
        type: 'numeric',
        prompt: `A semicircle has a **radius** of ${r} ${u}. Find its perimeter. ${PI_PROMPT}`,
        ...piAnswer(P, 3.14 * r + 2 * r),
        units: u,
        calculator: 'allowed',
        hints: ['The straight edge of a semicircle is a diameter, which is twice the radius.', 'The curved edge is half of $2\\pi r$.'],
        solution: [
          `Diameter: $2 \\times ${r} = ${2 * r}$ ${u}.`,
          `Curved edge: $\\frac{1}{2} \\times 2 \\times \\pi \\times ${r} = \\pi \\times ${r} ${approx(curved)}$ ${u}.`,
          `Perimeter $\\approx ${tex(round(curved, 2), 2)} + ${2 * r} ${approx(P)}$, so about **${num(round(P, 1), 1)} ${u}**.`,
        ].join('\n\n'),
      };
    }
    // difficulty 5: composite shapes
    if (rng.chance(0.5)) {
      let w: number;
      let h: number;
      do {
        w = rng.int(4, 16) * 10;
        h = rng.int(5, 20) * 10;
      } while (borderline(w + 2 * h + (Math.PI * w) / 2) || borderline(w + 2 * h + (3.14 * w) / 2));
      const curved = (Math.PI * w) / 2;
      const P = curved + w + 2 * h;
      return {
        type: 'numeric',
        prompt: `A window is a rectangle with a semicircle on top. Find the perimeter of the window (the distance around its outside edge). ${PI_PROMPT}`,
        figure: { svg: windowFigure(`${w} cm`, `${h} cm`), alt: `A window shape: a rectangle ${w} cm wide and ${h} cm tall, with a semicircle on top. The join between them is dashed.` },
        ...piAnswer(P, (3.14 * w) / 2 + w + 2 * h),
        units: 'cm',
        calculator: 'allowed',
        hints: [
          'The dashed line is inside the shape, so it is not part of the perimeter.',
          `The outside edge is: the curved top, two sides of ${h} cm, and the bottom of ${w} cm.`,
        ],
        solution: [
          `Curved top: half the circumference of a circle with diameter ${w} cm: $\\frac{1}{2} \\times \\pi \\times ${w} ${approx(curved)}$ cm.`,
          `Straight edges: $${h} + ${h} + ${w} = ${2 * h + w}$ cm.`,
          `Perimeter $\\approx ${tex(round(curved, 2), 2)} + ${2 * h + w} ${approx(P)}$, so about **${num(round(P, 1), 1)} cm**.`,
        ].join('\n\n'),
      };
    }
    let L: number;
    let D: number;
    do {
      D = rng.int(3, 8) * 10;
      L = D + rng.int(2, 9) * 10;
    } while (borderline(2 * L + Math.PI * D) || borderline(2 * L + 3.14 * D));
    const curved = Math.PI * D;
    const P = curved + 2 * L;
    return {
      type: 'numeric',
      prompt: `A school running track has two straight sides of ${L} m and a semicircle at each end. The semicircles have a diameter of ${D} m. How far is one lap of the track? ${PI_PROMPT}`,
      figure: { svg: trackFigure(`${L} m`, `${D} m`), alt: `A running track: two straight sides of ${L} m joined by semicircular ends with diameter ${D} m (shown dashed).` },
      ...piAnswer(P, 3.14 * D + 2 * L),
      units: 'm',
      calculator: 'allowed',
      hints: ['The two semicircles together make one full circle.', 'Add the circumference of that circle to the two straight sides.'],
      solution: [
        `Two semicircles of diameter ${D} m make a whole circle: $\\pi \\times ${D} ${approx(curved)}$ m.`,
        `Straight sides: $2 \\times ${L} = ${2 * L}$ m.`,
        `One lap $\\approx ${tex(round(curved, 2), 2)} + ${2 * L} ${approx(P)}$, so about **${num(round(P, 1), 1)} m**.`,
      ].join('\n\n'),
    };
  },
};
