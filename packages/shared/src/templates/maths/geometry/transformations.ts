import type { QuestionTemplate, TemplateOutput } from '../../types';
import type { Rng } from '../../../rng';
import { coordinatePlane, dot, label, line, polygon, svgDoc, type Pt } from '../../svg';

// m9.geo.transformations — translations (by a vector), reflections in a line, and rotations by
// multiples of 90° about a point, on a coordinate grid. Answers are coordinates, so these are
// MCQs whose distractors come from common mistakes (wrong direction, wrong axis, swapped signs).

const LIM = 6;
type XY = [number, number];

const inGrid = (p: XY, lim = LIM) => Math.abs(p[0]) <= lim && Math.abs(p[1]) <= lim;
const same = (p: XY, q: XY) => p[0] === q[0] && p[1] === q[1];
const coord = (p: XY) => `$(${p[0]}, ${p[1]})$`;
const vec = (a: number, b: number) => `$\\begin{pmatrix} ${a} \\\\ ${b} \\end{pmatrix}$`;

/** A small non-degenerate triangle with integer vertices inside [x0, x0+3] × [y0, y0+3]. */
function smallTriangle(rng: Rng, x0: number, y0: number): [XY, XY, XY] {
  for (;;) {
    const pts: XY[] = [0, 1, 2].map(() => [x0 + rng.int(0, 3), y0 + rng.int(0, 3)] as XY);
    const [a, b, c] = pts as [XY, XY, XY];
    const area2 = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]));
    if (area2 >= 3) return [a, b, c];
  }
}

interface Shape {
  pts: XY[];
  names: string[];
  colour?: string;
  fill?: string;
}

function gridFigure(shapes: Shape[], extras: { lines?: Array<{ v?: number; h?: number; diag?: boolean; text: string }>; points?: Array<{ p: XY; text: string; colour?: string }> } = {}) {
  const g = coordinatePlane({ xMin: -LIM, xMax: LIM, yMin: -LIM, yMax: LIM, scale: 26 });
  let body = g.body;
  const toPx = (p: XY) => g.toPx({ x: p[0], y: p[1] });
  // Mirror-line name on a white tag so grid lines and points do not hide it.
  const tag = (at: Pt, text: string) => {
    const w = text.length * 7 + 8;
    return `<rect x="${at.x - w / 2}" y="${at.y - 9}" width="${w}" height="18" rx="3" fill="#ffffff" stroke="#dc2626" stroke-width="1"/>` + label(at, text, { fill: '#dc2626', size: 12, bold: true });
  };
  let tags = '';
  for (const l of extras.lines ?? []) {
    if (l.v !== undefined) {
      body += line(toPx([l.v, -LIM]), toPx([l.v, LIM]), { stroke: '#dc2626', width: 2, dash: true });
      tags += tag({ x: toPx([l.v, -LIM]).x, y: toPx([l.v, -LIM]).y + 11 }, l.text);
    } else if (l.h !== undefined) {
      body += line(toPx([-LIM, l.h]), toPx([LIM, l.h]), { stroke: '#dc2626', width: 2, dash: true });
      tags += tag({ x: toPx([-LIM, l.h]).x + 4, y: toPx([-LIM, l.h]).y }, l.text);
    } else if (l.diag) {
      body += line(toPx([-LIM, -LIM]), toPx([LIM, LIM]), { stroke: '#dc2626', width: 2, dash: true });
      tags += tag({ x: toPx([LIM, LIM]).x - 6, y: toPx([LIM, LIM]).y + 4 }, l.text);
    }
  }
  for (const s of shapes) {
    const px = s.pts.map(toPx);
    const c = { x: px.reduce((t, p) => t + p.x, 0) / px.length, y: px.reduce((t, p) => t + p.y, 0) / px.length };
    if (px.length > 1) body += polygon(px, { fill: s.fill ?? 'rgba(37,99,235,0.25)', stroke: s.colour ?? '#1d4ed8' });
    px.forEach((p, i) => {
      body += dot(p, 3.5, s.colour ?? '#1d4ed8');
      const dx = p.x - c.x;
      const dy = p.y - c.y;
      const len = Math.hypot(dx, dy) || 1;
      const off = px.length > 1 ? 13 : 0;
      const at = px.length > 1 ? { x: p.x + (dx / len) * off, y: p.y + (dy / len) * off } : { x: p.x + 11, y: p.y - 11 };
      body += label(at, s.names[i] ?? '', { bold: true, fill: s.colour ?? '#1d4ed8', size: 13 });
    });
  }
  for (const pt of extras.points ?? []) {
    const p = toPx(pt.p);
    body += dot(p, 4.5, pt.colour ?? '#dc2626') + label({ x: p.x + 12, y: p.y - 11 }, pt.text, { bold: true, fill: pt.colour ?? '#dc2626', size: 13 });
  }
  return svgDoc(g.width, g.height, body + tags);
}

/** MCQ over coordinate answers: the correct one plus distinct distractors (falls back to nearby points). */
function coordOptions(rng: Rng, correct: XY, candidates: XY[]): { options: Array<{ id: string; text: string }>; correctId: string } {
  const picked: XY[] = [];
  for (const c of candidates) {
    if (!same(c, correct) && !picked.some((p) => same(p, c))) picked.push(c);
    if (picked.length === 3) break;
  }
  while (picked.length < 3) {
    const c: XY = [correct[0] + rng.pick([-2, -1, 1, 2]), correct[1] + rng.pick([-2, -1, 1, 2])];
    if (!same(c, correct) && !picked.some((p) => same(p, c))) picked.push(c);
  }
  const all = rng.shuffle([correct, ...picked]);
  const ids = ['a', 'b', 'c', 'd'];
  return {
    options: all.map((p, i) => ({ id: ids[i]!, text: coord(p) })),
    correctId: ids[all.findIndex((p) => same(p, correct))]!,
  };
}

const dirWords = (a: number, b: number) =>
  [a !== 0 ? `${Math.abs(a)} unit${Math.abs(a) === 1 ? '' : 's'} ${a > 0 ? 'right' : 'left'}` : '', b !== 0 ? `${Math.abs(b)} unit${Math.abs(b) === 1 ? '' : 's'} ${b > 0 ? 'up' : 'down'}` : '']
    .filter(Boolean)
    .join(' and ');

// ---------------------------------------------------------------- translation

export const translations: QuestionTemplate = {
  id: 'm9.geo.transformations.translation',
  topicId: 'm9.geo.transformations',
  title: 'Translations on a grid (including vectors)',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }): TemplateOutput {
    let a: number;
    let b: number;
    do {
      a = rng.int(-5, 5);
      b = rng.int(-5, 5);
    } while (a === 0 || b === 0 || Math.abs(a) === Math.abs(b));

    if (difficulty === 1) {
      let P: XY;
      do P = [rng.int(-5, 5), rng.int(-5, 5)];
      while (!inGrid([P[0] + a, P[1] + b], 6));
      const img: XY = [P[0] + a, P[1] + b];
      const { options, correctId } = coordOptions(rng, img, [
        [P[0] - a, P[1] - b],
        [P[0] + b, P[1] + a],
        [P[0] + a, P[1] - b],
        [P[0] - a, P[1] + b],
      ]);
      return {
        type: 'mcq',
        prompt: `Point $P$ is at ${coord(P)}. It is translated ${dirWords(a, b)}. What are the coordinates of its image, $P'$?`,
        figure: { svg: gridFigure([{ pts: [P], names: ['P'] }]), alt: `A coordinate grid with point P at (${P[0]}, ${P[1]}).` },
        options,
        correct: correctId,
        calculator: 'not-allowed',
        hints: ['Right and left change the $x$-coordinate. Up and down change the $y$-coordinate.', `Right is +, left is −, up is +, down is −.`],
        solution: `$x$: $${P[0]} ${a > 0 ? '+' : '-'} ${Math.abs(a)} = ${img[0]}$. $y$: $${P[1]} ${b > 0 ? '+' : '-'} ${Math.abs(b)} = ${img[1]}$.\n\nSo $P'$ is at ${coord(img)}.`,
      };
    }

    // Object triangle placed so that both it and its image fit on the grid.
    let tri: [XY, XY, XY];
    let image: XY[];
    do {
      tri = smallTriangle(rng, rng.int(-6, 3), rng.int(-6, 3));
      image = tri.map((p) => [p[0] + a, p[1] + b] as XY);
    } while (!image.every((p) => inGrid(p)) || !tri.every((p) => inGrid(p)));

    if (difficulty === 2) {
      const k = rng.int(0, 2);
      const v = tri[k]!;
      const ans = image[k]!;
      const letter = ['A', 'B', 'C'][k]!;
      const { options, correctId } = coordOptions(rng, ans, [
        [v[0] - a, v[1] - b],
        [v[0] + b, v[1] + a],
        [v[0] + a, v[1] - b],
        [v[0] - a, v[1] + b],
      ]);
      return {
        type: 'mcq',
        prompt: `Triangle $ABC$ is translated by the vector ${vec(a, b)}. What are the coordinates of $${letter}'$, the image of $${letter}$?`,
        figure: { svg: gridFigure([{ pts: tri, names: ['A', 'B', 'C'] }]), alt: `Triangle ABC with A(${tri[0][0]}, ${tri[0][1]}), B(${tri[1][0]}, ${tri[1][1]}) and C(${tri[2][0]}, ${tri[2][1]}).` },
        options,
        correct: correctId,
        calculator: 'not-allowed',
        hints: ['In a column vector, the top number is the move in $x$ (right +, left −) and the bottom number is the move in $y$ (up +, down −).', `Read the coordinates of $${letter}$ from the grid first.`],
        solution: `$${letter}$ is at ${coord(v)}. The vector ${vec(a, b)} means ${dirWords(a, b)}.\n\n$${letter}' = (${v[0]} ${a > 0 ? '+' : '-'} ${Math.abs(a)}, ${v[1]} ${b > 0 ? '+' : '-'} ${Math.abs(b)}) = (${ans[0]}, ${ans[1]})$`,
      };
    }

    // difficulty 3: describe the translation as a vector.
    const ids = ['a', 'b', 'c', 'd'];
    const cands: XY[] = rng.shuffle([
      [a, b],
      [-a, -b],
      [b, a],
      [a, -b],
    ] as XY[]);
    return {
      type: 'mcq',
      prompt: "Triangle $A'B'C'$ is the image of triangle $ABC$ after a translation. Which vector describes the translation?",
      figure: {
        svg: gridFigure([
          { pts: tri, names: ['A', 'B', 'C'] },
          { pts: image, names: ["A'", "B'", "C'"], colour: '#b45309', fill: 'rgba(245,158,11,0.3)' },
        ]),
        alt: `Triangle ABC and its image A'B'C' on a grid. A(${tri[0][0]}, ${tri[0][1]}) moves to A'(${image[0]![0]}, ${image[0]![1]}).`,
      },
      options: cands.map((c, i) => ({ id: ids[i]!, text: vec(c[0], c[1]) })),
      correct: ids[cands.findIndex((c) => same(c, [a, b]))]!,
      calculator: 'not-allowed',
      hints: ['Pick one corner, say $A$, and count how far it moves to reach $A\'$.', 'Count across first ($x$: right +, left −), then up or down ($y$: up +, down −).'],
      solution: `$A$ ${coord(tri[0])} moves to $A'$ ${coord(image[0]!)}: that is ${dirWords(a, b)}.\n\nThe vector is ${vec(a, b)}. (The reverse vector, ${vec(-a, -b)}, would move $A'$ back to $A$.)`,
    };
  },
};

// ---------------------------------------------------------------- reflection

type Mirror = { kind: 'x-axis' } | { kind: 'y-axis' } | { kind: 'v'; k: number } | { kind: 'h'; k: number } | { kind: 'diag' };

function reflect(p: XY, m: Mirror): XY {
  switch (m.kind) {
    case 'x-axis':
      return [p[0], -p[1]];
    case 'y-axis':
      return [-p[0], p[1]];
    case 'v':
      return [2 * m.k - p[0], p[1]];
    case 'h':
      return [p[0], 2 * m.k - p[1]];
    case 'diag':
      return [p[1], p[0]];
  }
}

function mirrorName(m: Mirror): string {
  switch (m.kind) {
    case 'x-axis':
      return 'the $x$-axis';
    case 'y-axis':
      return 'the $y$-axis';
    case 'v':
      return m.k === 0 ? 'the $y$-axis' : `the line $x = ${m.k}$`;
    case 'h':
      return m.k === 0 ? 'the $x$-axis' : `the line $y = ${m.k}$`;
    case 'diag':
      return 'the line $y = x$';
  }
}

function mirrorLine(m: Mirror) {
  switch (m.kind) {
    case 'v':
      return { v: m.k, text: `x = ${m.k}`.replace('-', '−') };
    case 'h':
      return { h: m.k, text: `y = ${m.k}`.replace('-', '−') };
    case 'diag':
      return { diag: true, text: 'y = x' };
    default:
      return undefined;
  }
}

export const reflections: QuestionTemplate = {
  id: 'm9.geo.transformations.reflection',
  topicId: 'm9.geo.transformations',
  title: 'Reflections in the axes and in other lines',
  difficulties: [2, 3, 4, 5],
  generate({ rng, difficulty }): TemplateOutput {
    if (difficulty === 2) {
      const m: Mirror = rng.chance(0.5) ? { kind: 'x-axis' } : { kind: 'y-axis' };
      let P: XY;
      do P = [rng.nonZeroInt(-5, 5), rng.nonZeroInt(-5, 5)];
      while (Math.abs(P[0]) === Math.abs(P[1]));
      const ans = reflect(P, m);
      const other: Mirror = m.kind === 'x-axis' ? { kind: 'y-axis' } : { kind: 'x-axis' };
      const { options, correctId } = coordOptions(rng, ans, [reflect(P, other), [-P[0], -P[1]], [P[1], P[0]]]);
      return {
        type: 'mcq',
        prompt: `Point $P$ ${coord(P)} is reflected in ${mirrorName(m)}. What are the coordinates of its image, $P'$?`,
        figure: { svg: gridFigure([{ pts: [P], names: ['P'] }]), alt: `Point P at (${P[0]}, ${P[1]}) on a coordinate grid.` },
        options,
        correct: correctId,
        calculator: 'not-allowed',
        hints: [
          m.kind === 'x-axis' ? 'The $x$-axis is the horizontal axis. The point flips from above it to below it (or the other way).' : 'The $y$-axis is the vertical axis. The point flips from one side of it to the other.',
          'The image is the same distance from the mirror line as the original point, on the other side.',
        ],
        solution:
          m.kind === 'x-axis'
            ? `Reflecting in the $x$-axis keeps $x$ the same and changes the sign of $y$: ${coord(P)} → ${coord(ans)}.`
            : `Reflecting in the $y$-axis keeps $y$ the same and changes the sign of $x$: ${coord(P)} → ${coord(ans)}.`,
      };
    }

    // Shapes for d3–d5.
    let m: Mirror;
    let tri: [XY, XY, XY];
    let image: XY[];
    for (;;) {
      if (difficulty === 5) m = { kind: 'diag' };
      else m = rng.chance(0.5) ? { kind: 'v', k: rng.int(-3, 3) } : { kind: 'h', k: rng.int(-3, 3) };
      tri = smallTriangle(rng, rng.int(-6, 3), rng.int(-6, 3));
      const mm = m;
      image = tri.map((p) => reflect(p, mm));
      const onLine = tri.some((p, i) => same(p, image[i]!));
      const ok = image.every((p) => inGrid(p)) && !onLine;
      // Keep the object fully on one side of the mirror line.
      const side = (p: XY) => (mm.kind === 'v' ? Math.sign(p[0] - mm.k) : mm.kind === 'h' ? Math.sign(p[1] - mm.k) : mm.kind === 'diag' ? Math.sign(p[1] - p[0]) : 0);
      const oneSide = new Set(tri.map(side)).size === 1;
      if (ok && oneSide) break;
    }
    const mLine = mirrorLine(m);

    if (difficulty === 3 || difficulty === 5) {
      const k = rng.int(0, 2);
      const v = tri[k]!;
      const ans = image[k]!;
      const letter = ['A', 'B', 'C'][k]!;
      const cands: XY[] =
        m.kind === 'diag'
          ? [
              [-v[1], -v[0]],
              [-v[0], v[1]],
              [v[0], -v[1]],
            ]
          : m.kind === 'v'
            ? [
                [-v[0], v[1]],
                [v[0], 2 * m.k - v[1]],
                [2 * m.k + v[0], v[1]],
              ]
            : m.kind === 'h'
              ? [
                  [v[0], -v[1]],
                  [2 * m.k - v[0], v[1]],
                  [v[0], 2 * m.k + v[1]],
                ]
              : [];
      const { options, correctId } = coordOptions(rng, ans, cands);
      return {
        type: 'mcq',
        prompt: `Triangle $ABC$ is reflected in ${mirrorName(m)} (the dashed red line). What are the coordinates of $${letter}'$, the image of $${letter}$?`,
        figure: {
          svg: gridFigure([{ pts: tri, names: ['A', 'B', 'C'] }], { lines: mLine ? [mLine] : [] }),
          alt: `Triangle ABC with A(${tri[0][0]}, ${tri[0][1]}), B(${tri[1][0]}, ${tri[1][1]}), C(${tri[2][0]}, ${tri[2][1]}), and the mirror line ${mirrorName(m).replace(/\$/g, '')} dashed.`,
        },
        options,
        correct: correctId,
        calculator: 'not-allowed',
        hints:
          m.kind === 'diag'
            ? ['Reflecting in $y = x$ swaps the roles of $x$ and $y$.', `Try it with a simple point: (1, 3) reflects to (3, 1).`]
            : [`Count how far $${letter}$ is from the mirror line, measured straight across (at right angles to the line).`, 'The image is the same distance away on the other side.'],
        solution:
          m.kind === 'diag'
            ? `Reflecting in $y = x$ swaps the coordinates: ${coord(v)} → ${coord(ans)}.`
            : m.kind === 'v'
              ? `$${letter}$ ${coord(v)} is ${Math.abs(v[0] - m.k)} unit${Math.abs(v[0] - m.k) === 1 ? '' : 's'} ${v[0] > m.k ? 'right' : 'left'} of $x = ${m.k}$. The image is the same distance on the other side, at $x = ${ans[0]}$. The $y$-coordinate does not change.\n\nSo $${letter}'$ is ${coord(ans)}.`
              : m.kind === 'h'
                ? `$${letter}$ ${coord(v)} is ${Math.abs(v[1] - m.k)} unit${Math.abs(v[1] - m.k) === 1 ? '' : 's'} ${v[1] > m.k ? 'above' : 'below'} $y = ${m.k}$. The image is the same distance on the other side, at $y = ${ans[1]}$. The $x$-coordinate does not change.\n\nSo $${letter}'$ is ${coord(ans)}.`
                : '',
      };
    }

    // difficulty 4: identify the mirror line.
    const label0 = (mm: Mirror) => {
      if (mm.kind === 'v') return mm.k === 0 ? 'The $y$-axis ($x = 0$)' : `The line $x = ${mm.k}$`;
      if (mm.kind === 'h') return mm.k === 0 ? 'The $x$-axis ($y = 0$)' : `The line $y = ${mm.k}$`;
      return 'The line $y = x$';
    };
    const k = (m as { k: number }).k;
    const flipped: Mirror = m.kind === 'v' ? { kind: 'h', k } : { kind: 'v', k };
    const near1: Mirror = m.kind === 'v' ? { kind: 'v', k: k + 1 } : { kind: 'h', k: k + 1 };
    const near2: Mirror = m.kind === 'v' ? { kind: 'v', k: k - 1 } : { kind: 'h', k: k - 1 };
    const list = rng.shuffle([m, flipped, near1, near2]);
    const ids = ['a', 'b', 'c', 'd'];
    return {
      type: 'mcq',
      prompt: "Triangle $A'B'C'$ is the reflection of triangle $ABC$. What is the mirror line?",
      figure: {
        svg: gridFigure([
          { pts: tri, names: ['A', 'B', 'C'] },
          { pts: image, names: ["A'", "B'", "C'"], colour: '#b45309', fill: 'rgba(245,158,11,0.3)' },
        ]),
        alt: `Triangle ABC and its mirror image A'B'C'. A(${tri[0][0]}, ${tri[0][1]}) reflects to A'(${image[0]![0]}, ${image[0]![1]}).`,
      },
      options: list.map((mm, i) => ({ id: ids[i]!, text: label0(mm) })),
      correct: ids[list.indexOf(m)]!,
      calculator: 'not-allowed',
      hints: ['The mirror line is exactly halfway between each point and its image.', "Find the midpoint of $A$ and $A'$."],
      solution:
        m.kind === 'v'
          ? `$A$ is at $x = ${tri[0][0]}$ and $A'$ is at $x = ${image[0]![0]}$. Halfway between them is $x = ${k}$, and the $y$-coordinates do not change.\n\nThe mirror line is **${label0(m).replace(/^The /, 'the ')}**.`
          : `$A$ is at $y = ${tri[0][1]}$ and $A'$ is at $y = ${image[0]![1]}$. Halfway between them is $y = ${k}$, and the $x$-coordinates do not change.\n\nThe mirror line is **${label0(m).replace(/^The /, 'the ')}**.`,
    };
  },
};

// ---------------------------------------------------------------- rotation

type Turn = 'cw90' | 'acw90' | '180';

function rotate(p: XY, t: Turn, c: XY = [0, 0]): XY {
  const x = p[0] - c[0];
  const y = p[1] - c[1];
  const r: XY = t === 'cw90' ? [y, -x] : t === 'acw90' ? [-y, x] : [-x, -y];
  return [r[0] + c[0], r[1] + c[1]];
}

const br = (n: number) => (n < 0 ? `(${n})` : `${n}`);

/** "3 right and 1 down" for an offset of (3, −1). */
const moveWords = (d: XY) =>
  [d[0] ? `${Math.abs(d[0])} ${d[0] > 0 ? 'right' : 'left'}` : '', d[1] ? `${Math.abs(d[1])} ${d[1] > 0 ? 'up' : 'down'}` : '']
    .filter(Boolean)
    .join(' and ') || 'at the centre';

const turnWords = (t: Turn) => (t === 'cw90' ? '90° clockwise' : t === 'acw90' ? '90° anticlockwise' : '180°');

export const rotations: QuestionTemplate = {
  id: 'm9.geo.transformations.rotation',
  topicId: 'm9.geo.transformations',
  title: 'Rotations by 90° and 180° about a point',
  difficulties: [3, 4, 5],
  generate({ rng, difficulty }): TemplateOutput {
    const t: Turn = difficulty === 3 ? rng.pick(['180', '180', 'cw90', 'acw90'] as const) : rng.pick(['cw90', 'acw90', '180'] as const);
    const centre: XY = difficulty === 5 ? [rng.nonZeroInt(-2, 2), rng.nonZeroInt(-2, 2)] : [0, 0];
    const cText = difficulty === 5 ? `the point ${coord(centre)}` : 'the origin';

    if (difficulty === 3) {
      let P: XY;
      do P = [rng.nonZeroInt(-5, 5), rng.nonZeroInt(-5, 5)];
      while (Math.abs(P[0]) === Math.abs(P[1]));
      const ans = rotate(P, t);
      const { options, correctId } = coordOptions(rng, ans, [
        rotate(P, t === 'cw90' ? 'acw90' : t === 'acw90' ? 'cw90' : 'cw90'),
        [-P[0], P[1]],
        [P[0], -P[1]],
        [P[1], P[0]],
      ]);
      return {
        type: 'mcq',
        prompt: `Point $P$ ${coord(P)} is rotated ${turnWords(t)} about the origin. What are the coordinates of its image, $P'$?`,
        figure: { svg: gridFigure([{ pts: [P], names: ['P'] }], { points: [{ p: [0, 0], text: 'O', colour: '#dc2626' }] }), alt: `Point P at (${P[0]}, ${P[1]}) on a coordinate grid, with the origin O marked.` },
        options,
        correct: correctId,
        calculator: 'not-allowed',
        hints:
          t === '180'
            ? ['A half turn about the origin sends a point to the opposite side of the origin.', 'Both coordinates change sign.']
            : ['Imagine tracing paper pinned at the origin. Turn it a quarter turn in the right direction.', 'A quarter turn about the origin swaps the coordinates and changes one sign. Check the quadrant the image should be in.'],
        solution:
          t === '180'
            ? `A rotation of 180° about the origin changes the sign of both coordinates: ${coord(P)} → ${coord(ans)}.`
            : `A quarter turn ${t === 'cw90' ? 'clockwise' : 'anticlockwise'} about the origin sends $(x, y)$ to ${t === 'cw90' ? '$(y, -x)$' : '$(-y, x)$'}.\n\n${coord(P)} → ${coord(ans)}.`,
      };
    }

    // Triangle, about the origin (d4) or another point (d5).
    let tri: [XY, XY, XY];
    let image: XY[];
    do {
      tri = smallTriangle(rng, centre[0] + rng.int(-4, 1), centre[1] + rng.int(-4, 1));
      image = tri.map((p) => rotate(p, t, centre));
    } while (!tri.every((p) => inGrid(p)) || !image.every((p) => inGrid(p)) || tri.some((p) => same(p, centre)));
    const k = rng.int(0, 2);
    const v = tri[k]!;
    const ans = image[k]!;
    const letter = ['A', 'B', 'C'][k]!;
    const wrongTurn: Turn = t === 'cw90' ? 'acw90' : t === 'acw90' ? 'cw90' : 'cw90';
    const cands: XY[] = [rotate(v, wrongTurn, centre), rotate(v, t), [-v[0], v[1]], [v[0], -v[1]], rotate(v, t === '180' ? 'acw90' : '180', centre)];
    const { options, correctId } = coordOptions(rng, ans, difficulty === 5 ? cands : [cands[0]!, cands[4]!, cands[2]!, cands[3]!]);
    const rel: XY = [v[0] - centre[0], v[1] - centre[1]];
    const relImg: XY = [ans[0] - centre[0], ans[1] - centre[1]];
    return {
      type: 'mcq',
      prompt: `Triangle $ABC$ is rotated ${turnWords(t)} about ${cText}. What are the coordinates of $${letter}'$, the image of $${letter}$?`,
      figure: {
        svg: gridFigure([{ pts: tri, names: ['A', 'B', 'C'] }], { points: [{ p: centre, text: difficulty === 5 ? 'centre' : 'O', colour: '#dc2626' }] }),
        alt: `Triangle ABC with A(${tri[0][0]}, ${tri[0][1]}), B(${tri[1][0]}, ${tri[1][1]}), C(${tri[2][0]}, ${tri[2][1]}). The centre of rotation (${centre[0]}, ${centre[1]}) is marked in red.`,
      },
      options,
      correct: correctId,
      calculator: 'not-allowed',
      hints: [
        difficulty === 5 ? `Work out how far $${letter}$ is from the centre of rotation: across and up/down.` : 'Use tracing paper in your head: pin it at the origin and turn.',
        t === '180'
          ? 'A half turn reverses both the across and the up/down distances.'
          : `In a quarter turn, the "across" and "up/down" distances swap over. ${t === 'cw90' ? 'Clockwise' : 'Anticlockwise'} is the direction ${t === 'cw90' ? 'a clock hand moves' : 'opposite to a clock hand'}.`,
      ],
      solution: [
        difficulty === 5
          ? `From the centre ${coord(centre)}, $${letter}$ ${coord(v)} is ${moveWords(rel)} from the centre. As a pair of numbers that is ${coord(rel)}.`
          : `$${letter}$ is at ${coord(v)}.`,
        t === '180'
          ? `A 180° turn reverses both: ${difficulty === 5 ? `${moveWords(relImg)}, which is ${coord(relImg)}` : `${coord(v)} → ${coord(ans)}`}.`
          : `A quarter turn ${t === 'cw90' ? 'clockwise' : 'anticlockwise'} sends $(x, y)$ to ${t === 'cw90' ? '$(y, -x)$' : '$(-y, x)$'}${difficulty === 5 ? ` (measured from the centre): ${coord(rel)} → ${coord(relImg)}` : `: ${coord(v)} → ${coord(ans)}`}.`,
        difficulty === 5 ? `Add the centre back on: $(${centre[0]} + ${br(relImg[0])}, ${centre[1]} + ${br(relImg[1])}) = ${coord(ans).replace(/\$/g, '')}$.` : '',
        `So $${letter}'$ is ${coord(ans)}.`,
      ]
        .filter(Boolean)
        .join('\n\n'),
    };
  },
};
