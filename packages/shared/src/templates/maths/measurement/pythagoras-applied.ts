import type { QuestionTemplate } from '../../types';
import { NAMES, num, round, tex } from '../../format';
import { label, line, polygon, rightAngleMark, svgDoc, type Pt } from '../../svg';
import { centroid, labelAway, notToScale } from './figures';

// m9.mea.pythagoras — more templates: naming the hypotenuse, squares on the sides, Pythagorean
// triples, and word problems. Year 9 only finds the hypotenuse (or checks for a right angle).

const TRIPLES: Array<[number, number, number]> = [
  [3, 4, 5],
  [5, 12, 13],
  [8, 15, 17],
  [7, 24, 25],
  [20, 21, 29],
  [9, 40, 41],
];

/** Right-angled triangle with squares drawn outward on each side (the classic proof picture). */
function squaresFigure(a: number, b: number, texts: { a: string; b: string; c: string }) {
  // Not to scale: keep the legs within a sensible ratio.
  const ratio = Math.min(1.6, Math.max(0.7, a / b));
  const sb = 70;
  const sa = sb * ratio;
  const C: Pt = { x: 30 + sa, y: 30 + sb + sa };
  const B: Pt = { x: C.x + sb, y: C.y };
  const A: Pt = { x: C.x, y: C.y - sa };
  const n = { x: sa, y: -sb }; // outward from the hypotenuse
  const sqA = [C, A, { x: A.x - sa, y: A.y }, { x: C.x - sa, y: C.y }];
  const sqB = [C, B, { x: B.x, y: B.y + sb }, { x: C.x, y: C.y + sb }];
  const sqC = [A, B, { x: B.x + n.x, y: B.y + n.y }, { x: A.x + n.x, y: A.y + n.y }];
  let body = polygon(sqA, { fill: '#fef3c7' }) + polygon(sqB, { fill: '#fef3c7' }) + polygon(sqC, { fill: '#dcfce7' });
  body += polygon([A, B, C], { fill: '#ffffff' }) + rightAngleMark(C, A, B, 10);
  body += label(centroid(sqA), texts.a, { bold: true });
  body += label(centroid(sqB), texts.b, { bold: true });
  body += label(centroid(sqC), texts.c, { bold: true, size: 16 });
  const width = Math.max(B.x + n.x, A.x + n.x) + 20;
  const height = C.y + sb + 40;
  body += notToScale({ x: width - 6, y: height - 12 });
  return svgDoc(width, height, body);
}

/** A right-angled triangle rotated by `turn` quarter turns (+ optional flip), sides labelled. */
function namedTriangle(turn: number, flip: boolean, labels: { legA: string; legB: string; hyp: string }) {
  // Base shape: right angle at R, legs along +x and −y.
  const base: Pt[] = [
    { x: 0, y: 0 }, // R (right angle)
    { x: 1.6, y: 0 },
    { x: 0, y: -1.1 },
  ];
  const rot = (p: Pt): Pt => {
    let q = flip ? { x: -p.x, y: p.y } : p;
    for (let i = 0; i < turn; i++) q = { x: -q.y, y: q.x };
    return q;
  };
  const pts = base.map(rot);
  const minX = Math.min(...pts.map((p) => p.x));
  const minY = Math.min(...pts.map((p) => p.y));
  const s = 120;
  const P = pts.map((p) => ({ x: 50 + (p.x - minX) * s, y: 40 + (p.y - minY) * s }));
  const [R, X, Y] = P as [Pt, Pt, Pt];
  const cen = centroid(P);
  let body = polygon(P) + rightAngleMark(R, X, Y, 12);
  body += labelAway(R, X, cen, labels.legA, { bold: true });
  body += labelAway(R, Y, cen, labels.legB, { bold: true });
  body += labelAway(X, Y, cen, labels.hyp, { bold: true });
  const maxX = Math.max(...P.map((p) => p.x));
  const maxY = Math.max(...P.map((p) => p.y));
  return svgDoc(maxX + 50, maxY + 40, body);
}

export const triplesAndSquares: QuestionTemplate = {
  id: 'm9.mea.pythagoras.triples-and-squares',
  topicId: 'm9.mea.pythagoras',
  title: 'Name the hypotenuse, squares on the sides, Pythagorean triples',
  difficulties: [1, 2],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      if (rng.chance(0.5)) {
        const letters = rng.pick([
          ['p', 'q', 'r'],
          ['a', 'b', 'c'],
          ['x', 'y', 'z'],
          ['k', 'm', 'n'],
          ['d', 'e', 'f'],
        ]);
        const [legA, legB, hyp] = rng.shuffle(letters) as [string, string, string];
        const svg = namedTriangle(rng.int(0, 3), rng.chance(0.5), { legA, legB, hyp });
        const options = [...letters].sort().map((l) => ({ id: l, text: `Side $${l}$` }));
        return {
          type: 'mcq',
          prompt: 'Which side of this right-angled triangle is the **hypotenuse**?',
          figure: { svg, alt: `A right-angled triangle with sides labelled ${letters.join(', ')}. The right angle is marked with a small square.` },
          options,
          correct: hyp,
          shuffle: false,
          calculator: 'not-allowed',
          hints: ['Find the small square that marks the right angle.', 'The hypotenuse is the side opposite (not touching) the right angle. It is always the longest side.'],
          solution: `Sides $${legA}$ and $${legB}$ both touch the right angle. Side **$${hyp}$** is opposite the right angle, so it is the hypotenuse (the longest side).`,
        };
      }
      const a = rng.int(2, 12);
      let b = rng.int(2, 12);
      if (b === a) b += 1;
      const u = rng.pick(['cm', 'm'] as const);
      const A = a * a;
      const B = b * b;
      return {
        type: 'numeric',
        prompt: 'Squares have been drawn on each side of this right-angled triangle. The areas of the two smaller squares are shown. What is the area of the largest square?',
        figure: {
          svg: squaresFigure(a, b, { a: `${A} ${u}²`, b: `${B} ${u}²`, c: '?' }),
          alt: `A right-angled triangle with a square on each side. The squares on the two shorter sides have areas ${A} ${u}² and ${B} ${u}². The square on the hypotenuse is marked with a question mark.`,
        },
        answer: A + B,
        units: `${u}²`,
        calculator: 'not-allowed',
        hints: ["Pythagoras' theorem is really about these squares.", 'The square on the hypotenuse has the same area as the other two squares put together.'],
        solution: `By Pythagoras' theorem, the area of the square on the hypotenuse equals the sum of the areas of the squares on the other two sides:\n\n$${A} + ${B} = ${A + B}$ ${u}².`,
      };
    }

    // difficulty 2
    if (rng.chance(0.5)) {
      // Scale a known triple.
      const t = rng.pick(TRIPLES.slice(0, 4));
      const k = rng.int(2, 10);
      const [a, b, c] = [t[0] * k, t[1] * k, t[2] * k];
      const u = rng.pick(['cm', 'm', 'mm'] as const);
      return {
        type: 'numeric',
        prompt: `$(${t[0]}, ${t[1]}, ${t[2]})$ is a Pythagorean triple. Without a calculator, find the length of the hypotenuse of a right-angled triangle whose shorter sides are ${a} ${u} and ${b} ${u}.`,
        answer: c,
        units: u,
        calculator: 'not-allowed',
        hints: [`Compare ${a} and ${b} with ${t[0]} and ${t[1]}. What have they been multiplied by?`, 'Multiplying every side of a triple by the same number gives another triple.'],
        solution: `$${a} = ${k} \\times ${t[0]}$ and $${b} = ${k} \\times ${t[1]}$, so the triangle is the $(${t[0]}, ${t[1]}, ${t[2]})$ triangle scaled by ${k}.\n\nHypotenuse $= ${k} \\times ${t[2]} = ${c}$ ${u}.\n\nCheck: $${a}^2 + ${b}^2 = ${tex(a * a)} + ${tex(b * b)} = ${tex(c * c)} = ${c}^2$ ✓`,
      };
    }
    // Which of these are Pythagorean triples?
    const triples = rng.sample(TRIPLES.slice(0, 5), 4).map((t) => {
      const k = rng.pick([1, 1, 2, 3]);
      return [t[0] * k, t[1] * k, t[2] * k] as [number, number, number];
    });
    const nTrue = rng.int(1, 3);
    const sets = triples.map((t, i) => {
      if (i < nTrue) return { set: t, ok: true };
      const off = rng.pick([-1, 1]);
      return { set: [t[0], t[1], t[2] + off] as [number, number, number], ok: false };
    });
    const shuffled = rng.shuffle(sets);
    const ids = ['a', 'b', 'c', 'd'];
    const options = shuffled.map((s, i) => ({ id: ids[i]!, text: `$(${s.set.join(', ')})$` }));
    const correct = shuffled.flatMap((s, i) => (s.ok ? [ids[i]!] : []));
    return {
      type: 'multi',
      prompt: 'Select **all** the sets of numbers that are Pythagorean triples.',
      options,
      correct,
      calculator: 'allowed',
      hints: ['For each set, square the two smaller numbers and add them.', 'It is a triple only if that total equals the square of the largest number.'],
      solution: shuffled
        .map((s) => {
          const [a, b, c] = s.set;
          return `$(${s.set.join(', ')})$: $${a}^2 + ${b}^2 = ${tex(a * a + b * b)}$ and $${c}^2 = ${tex(c * c)}$, so ${s.ok ? '**it is** a triple' : 'it is **not** a triple'}.`;
        })
        .join('\n\n'),
    };
  },
};

function contextTriangle(kind: 'ladder' | 'rectangle', labels: { a: string; b: string; c: string }) {
  if (kind === 'ladder') {
    const C: Pt = { x: 105, y: 220 }; // foot of wall
    const top: Pt = { x: 105, y: 40 };
    const foot: Pt = { x: 235, y: 220 };
    let body = line({ x: 80, y: 220 }, { x: 320, y: 220 }, { width: 3 }); // ground
    body += `<rect x="80" y="30" width="25" height="190" fill="#e5e7eb" stroke="#1f2937" stroke-width="2"/>`; // wall
    body += line(top, foot, { stroke: '#92400e', width: 5 });
    body += rightAngleMark(C, foot, top, 12);
    const cen = { x: 135, y: 160 };
    body += label({ x: 72, y: 130 }, labels.a, { anchor: 'end' });
    body += labelAway(C, foot, cen, labels.b);
    body += labelAway(top, foot, cen, labels.c);
    body += notToScale({ x: 330, y: 250 });
    return svgDoc(340, 262, body);
  }
  const pts: Pt[] = [
    { x: 50, y: 40 },
    { x: 290, y: 40 },
    { x: 290, y: 190 },
    { x: 50, y: 190 },
  ];
  let body = polygon(pts);
  body += line(pts[3]!, pts[1]!, { stroke: '#2563eb', width: 2, dash: true });
  for (let i = 0; i < 4; i++) body += rightAngleMark(pts[i]!, pts[(i + 1) % 4]!, pts[(i + 3) % 4]!, 9);
  const cen = centroid(pts);
  body += labelAway(pts[3]!, pts[2]!, cen, labels.b);
  body += labelAway(pts[1]!, pts[2]!, cen, labels.a);
  body += labelAway(pts[3]!, pts[1]!, pts[2]!, labels.c, { fill: '#2563eb', offset: 4 });
  body += notToScale({ x: 330, y: 228 });
  return svgDoc(340, 240, body);
}

/** Pythagoras answer: exact if a perfect square, otherwise rounded to 1 dp. */
function hyp(a: number, b: number) {
  const sum = a * a + b * b;
  const c = Math.sqrt(sum);
  const exact = Number.isInteger(round(c, 9));
  return { sum, c, exact, answer: exact ? round(c, 9) : round(c, 1) };
}

/** Avoid lengths whose 1 dp rounding sits right on a boundary. */
const awkward = (x: number) => {
  const f = x * 10 - Math.floor(x * 10);
  return Math.abs(f - 0.5) < 0.1;
};

export const pythagorasProblems: QuestionTemplate = {
  id: 'm9.mea.pythagoras.problems',
  topicId: 'm9.mea.pythagoras',
  title: "Pythagoras' theorem in context",
  difficulties: [3, 4, 5],
  generate({ rng, difficulty }) {
    const who = rng.pick(NAMES);
    if (difficulty === 3) {
      if (rng.chance(0.5)) {
        let up: number;
        let out: number;
        let h: ReturnType<typeof hyp>;
        do {
          up = rng.int(30, 60) / 10;
          out = rng.int(8, 20) / 10;
          h = hyp(up, out);
        } while (awkward(h.c));
        return {
          type: 'numeric',
          prompt: `${who} leans a ladder against a vertical wall. The top of the ladder reaches ${num(up)} m up the wall, and the foot of the ladder is ${num(out)} m from the bottom of the wall. How long is the ladder? Give your answer to 1 decimal place.`,
          figure: { svg: contextTriangle('ladder', { a: `${num(up)} m`, b: `${num(out)} m`, c: 'ladder' }), alt: `A ladder leaning against a wall, reaching ${num(up)} m up the wall with its foot ${num(out)} m from the wall. The wall meets the ground at a right angle.` },
          answer: round(h.c, 1),
          decimals: 1,
          units: 'm',
          calculator: 'allowed',
          hints: ['The wall, the ground and the ladder make a right-angled triangle.', 'The ladder is the hypotenuse, because it is opposite the right angle.'],
          solution: [
            `$c^2 = ${tex(up)}^2 + ${tex(out)}^2 = ${tex(round(up * up, 4))} + ${tex(round(out * out, 4))} = ${tex(round(h.sum, 4))}$`,
            `$c = \\sqrt{${tex(round(h.sum, 4))}} \\approx ${tex(round(h.c, 3), 3)}$, so the ladder is about **${num(round(h.c, 1), 1)} m** long.`,
          ].join('\n\n'),
        };
      }
      const [thing, u, lo, hi] = rng.pick([
        ['rectangular rugby training field', 'm', 30, 90],
        ['rectangular phone screen', 'cm', 6, 16],
        ['rectangular gate', 'cm', 90, 200],
        ['rectangular classroom floor', 'm', 5, 12],
      ] as const);
      let a: number;
      let b: number;
      let h: ReturnType<typeof hyp>;
      do {
        b = rng.int(lo, hi);
        a = rng.int(Math.ceil(lo / 2), b - 1);
        h = hyp(a, b);
      } while (!h.exact && awkward(h.c));
      return {
        type: 'numeric',
        prompt: `A ${thing} is ${b} ${u} long and ${a} ${u} wide. How long is its diagonal?${h.exact ? '' : ' Give your answer to 1 decimal place.'}`,
        figure: { svg: contextTriangle('rectangle', { a: `${a} ${u}`, b: `${b} ${u}`, c: 'diagonal' }), alt: `A rectangle ${b} ${u} by ${a} ${u} with a dashed diagonal.` },
        answer: h.answer,
        ...(h.exact ? {} : { decimals: 1 }),
        units: u,
        calculator: 'allowed',
        hints: ['The diagonal cuts the rectangle into two right-angled triangles.', 'The diagonal is the hypotenuse. The length and width are the two shorter sides.'],
        solution: [
          `$d^2 = ${b}^2 + ${a}^2 = ${tex(b * b)} + ${tex(a * a)} = ${tex(h.sum)}$`,
          `$d = \\sqrt{${tex(h.sum)}} ${h.exact ? '=' : '\\approx'} ${h.exact ? tex(h.answer) : tex(round(h.c, 3), 3)}$, so the diagonal is ${h.exact ? '' : 'about '}**${h.exact ? num(h.answer) : num(h.answer, 1)} ${u}**.`,
        ].join('\n\n'),
      };
    }

    if (difficulty === 4) {
      if (rng.chance(0.5)) {
        // Shortcut across a field.
        let a: number;
        let b: number;
        let h: ReturnType<typeof hyp>;
        do {
          a = rng.int(30, 90);
          b = rng.int(40, 120);
          h = hyp(a, b);
        } while (h.exact || awkward(a + b - h.c) || awkward(h.c));
        const saving = a + b - h.c;
        return {
          type: 'numeric',
          prompt: `A rectangular park is ${b} m long and ${a} m wide. ${who} usually walks along two edges to get from one corner to the opposite corner. How much shorter is it to walk straight across the diagonal instead? Give your answer to 1 decimal place.`,
          figure: { svg: contextTriangle('rectangle', { a: `${a} m`, b: `${b} m`, c: 'shortcut' }), alt: `A rectangle ${b} m by ${a} m with a dashed diagonal marked shortcut.` },
          answer: round(saving, 1),
          decimals: 1,
          units: 'm',
          calculator: 'allowed',
          hints: ['Find the length of the diagonal using Pythagoras.', `Then compare it with walking around the edges: ${b} + ${a} m.`],
          solution: [
            `Around the edges: $${b} + ${a} = ${a + b}$ m.`,
            `Diagonal: $d = \\sqrt{${b}^2 + ${a}^2} = \\sqrt{${tex(h.sum)}} \\approx ${tex(round(h.c, 2), 2)}$ m.`,
            `Saving: $${a + b} - ${tex(round(h.c, 2), 2)} \\approx ${tex(round(saving, 2), 2)}$, so about **${num(round(saving, 1), 1)} m** shorter.`,
          ].join('\n\n'),
        };
      }
      // Builder's check for a square corner.
      const t = rng.pick([TRIPLES[0]!, TRIPLES[1]!, TRIPLES[2]!]);
      const k = t[2] <= 5 ? rng.pick([20, 30, 40, 60]) : rng.pick([5, 10]);
      const [a, b] = [t[0] * k, t[1] * k];
      const isSquare = rng.chance(0.5);
      const c = isSquare ? t[2] * k : t[2] * k + rng.pick([-3, -2, 2, 3]);
      return {
        type: 'mcq',
        prompt: `A builder is checking that the corner of a concrete slab is a right angle. She measures ${a} cm along one edge and ${b} cm along the other edge from the corner. The distance between those two points is ${c} cm. Is the corner a right angle?`,
        options: [
          { id: 'yes', text: `Yes, because $${a}^2 + ${b}^2 = ${c}^2$` },
          { id: 'no', text: `No, because $${a}^2 + ${b}^2 \\neq ${c}^2$` },
        ],
        correct: isSquare ? 'yes' : 'no',
        shuffle: false,
        calculator: 'allowed',
        hints: ['The two edges and the diagonal form a triangle. It is right-angled only if the sides fit $a^2 + b^2 = c^2$.', `Work out $${a}^2 + ${b}^2$ and $${c}^2$, and compare.`],
        solution: [
          `$${a}^2 + ${b}^2 = ${tex(a * a)} + ${tex(b * b)} = ${tex(a * a + b * b)}$`,
          `$${c}^2 = ${tex(c * c)}$`,
          isSquare
            ? `These are equal, so the corner **is** a right angle. (This is the $(${t.join(', ')})$ triple scaled by ${k}.)`
            : `These are not equal, so the corner is **not** a right angle. For a right angle the diagonal would need to be ${t[2] * k} cm.`,
        ].join('\n\n'),
      };
    }

    // difficulty 5
    if (rng.chance(0.5)) {
      // Isosceles roof truss: base 2s, height h → sloping sides √(s² + h²); total timber = 2·slope + base.
      let s: number;
      let hgt: number;
      let h: ReturnType<typeof hyp>;
      do {
        s = rng.int(15, 50) / 10;
        hgt = rng.int(10, 30) / 10;
        h = hyp(s, hgt);
      } while (awkward(2 * h.c + 2 * s) || h.exact);
      const total = 2 * h.c + 2 * s;
      const pts: Pt[] = [
        { x: 40, y: 170 },
        { x: 320, y: 170 },
        { x: 180, y: 50 },
      ];
      const mid = { x: 180, y: 170 };
      let body = polygon(pts, { fill: '#fde68a' });
      body += line(pts[2]!, mid, { stroke: '#2563eb', width: 1.6, dash: true });
      body += rightAngleMark(mid, pts[1]!, pts[2]!, 10);
      body += labelAway(pts[0]!, pts[1]!, { x: 180, y: 120 }, `${num(2 * s)} m`);
      body += labelAway(pts[2]!, mid, { x: 150, y: 110 }, `${num(hgt)} m`, { fill: '#2563eb', offset: 6 });
      body += notToScale({ x: 350, y: 215 });
      const svg = svgDoc(360, 226, body);
      return {
        type: 'numeric',
        prompt: `The frame of a roof is an isosceles triangle made of timber. It is ${num(2 * s)} m wide and ${num(hgt)} m high in the middle. Find the total length of timber needed for the three outside edges of the triangle. Give your answer to 1 decimal place.`,
        figure: { svg, alt: `An isosceles triangle ${num(2 * s)} m wide with a dashed vertical height of ${num(hgt)} m from the top to the middle of the base.` },
        answer: round(total, 1),
        decimals: 1,
        units: 'm',
        calculator: 'allowed',
        hints: [
          'The dashed height splits the triangle into two right-angled triangles.',
          `Each right-angled triangle has shorter sides of ${num(s)} m (half the width) and ${num(hgt)} m. The sloping edge is its hypotenuse.`,
        ],
        solution: [
          `Half the width: $${tex(2 * s)} \\div 2 = ${tex(s)}$ m.`,
          `Sloping edge: $\\sqrt{${tex(s)}^2 + ${tex(hgt)}^2} = \\sqrt{${tex(round(h.sum, 4))}} \\approx ${tex(round(h.c, 3), 3)}$ m.`,
          `Total: $2 \\times ${tex(round(h.c, 3), 3)} + ${tex(2 * s)} \\approx ${tex(round(total, 2), 2)}$, so about **${num(round(total, 1), 1)} m** of timber.`,
        ].join('\n\n'),
      };
    }
    // Journey: east then north (or similar) — straight-line distance back to the start.
    let d1: number;
    let d2: number;
    let h: ReturnType<typeof hyp>;
    do {
      d1 = rng.int(3, 25);
      d2 = rng.int(3, 25);
      h = hyp(d1, d2);
    } while (!h.exact && awkward(h.c));
    const [dirA, dirB] = rng.pick([
      ['east', 'north'],
      ['west', 'south'],
      ['north', 'west'],
      ['south', 'east'],
    ] as const);
    const vehicle = rng.pick(['A kayaker paddles', 'A tramper walks', 'A boat sails', 'A drone flies']);
    return journey(vehicle, dirA, dirB, d1, d2, h);
  },
};

function journey(vehicle: string, dirA: string, dirB: string, d1: number, d2: number, h: ReturnType<typeof hyp>) {
  return {
    type: 'numeric' as const,
    prompt: `${vehicle} ${d1} km ${dirA}, then ${d2} km ${dirB}. How far is it now from its starting point, in a straight line?${h.exact ? '' : ' Give your answer to 1 decimal place.'}`,
    answer: h.answer,
    ...(h.exact ? {} : { decimals: 1 }),
    units: 'km',
    calculator: 'allowed' as const,
    hints: [`Sketch the journey. Going ${dirA} and then ${dirB} makes a right angle.`, 'The straight line back to the start is the hypotenuse.'],
    solution: [
      `The two parts of the journey are at right angles, so use Pythagoras.`,
      `$d^2 = ${d1}^2 + ${d2}^2 = ${d1 * d1} + ${d2 * d2} = ${h.sum}$`,
      `$d = \\sqrt{${h.sum}} ${h.exact ? '=' : '\\approx'} ${h.exact ? tex(h.answer) : tex(round(h.c, 3), 3)}$, so it is ${h.exact ? '' : 'about '}**${h.exact ? num(h.answer) : num(h.answer, 1)} km** from the start.`,
    ].join('\n\n'),
  };
}
