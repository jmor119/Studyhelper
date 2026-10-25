import type { QuestionTemplate, TemplateOutput } from '../../types';
import type { Rng } from '../../../rng';
import { clean, num, tex } from '../../format';
import { ACCENT, circle, dot, label, line, polygon, svgDoc, type Pt } from '../../svg';
import { arc, arcWithLabel, labelAway, notToScale, polar } from '../measurement/figures';

// m9.geo.circles — the parts of a circle (centre, radius, diameter, chord, arc, circumference),
// d = 2r, and simple reasoning from "every point on the circle is the same distance from the centre".

type Part = 'centre' | 'radius' | 'diameter' | 'chord' | 'arc' | 'circumference';

const NAMES: Record<Part, string> = {
  centre: 'Centre',
  radius: 'Radius',
  diameter: 'Diameter',
  chord: 'Chord',
  arc: 'Arc',
  circumference: 'Circumference',
};

const DEF: Record<Part, string> = {
  centre: 'The centre is the point in the middle of the circle.',
  radius: 'A radius is a straight line from the centre to the circle.',
  diameter: 'A diameter is a straight line across the circle that passes through the centre.',
  chord: 'A chord is a straight line joining two points on the circle.',
  arc: 'An arc is part of the curved edge of the circle.',
  circumference: 'The circumference is the whole curved edge, all the way around.',
};

const WHY: Record<Part, string> = {
  centre: 'The centre is the point in the middle, the same distance from every point on the circle.',
  radius: 'A radius goes from the centre to the circle.',
  diameter: 'A diameter is a chord that passes through the centre. It goes all the way across.',
  chord: 'A chord is a straight line joining two points on the circle. This one does not pass through the centre.',
  arc: 'An arc is part of the circumference (a curved section of the circle).',
  circumference: 'The circumference is the whole distance around the circle.',
};

const C0: Pt = { x: 150, y: 125 };
const R0 = 95;

function partFigure(rng: Rng, part: Part) {
  const a = rng.int(0, 35) * 10;
  let body = circle(C0, R0, { stroke: '#6b7280' });
  if (part !== 'centre') body += dot(C0, 3, '#6b7280');
  const hl = { stroke: ACCENT, width: 4 };
  switch (part) {
    case 'centre':
      body += dot(C0, 6, ACCENT);
      break;
    case 'radius':
      body += line(C0, polar(C0, R0, a), hl) + dot(C0, 3.5, ACCENT);
      break;
    case 'diameter':
      body += line(polar(C0, R0, a), polar(C0, R0, a + 180), hl);
      break;
    case 'chord': {
      const span = rng.int(7, 15) * 10; // not 180, so it misses the centre
      body += line(polar(C0, R0, a), polar(C0, R0, a + span), hl);
      break;
    }
    case 'arc': {
      const span = rng.int(6, 14) * 10;
      body += arc(C0, R0, a, a + span, hl);
      break;
    }
    case 'circumference':
      body += `<circle cx="${C0.x}" cy="${C0.y}" r="${R0}" fill="none" stroke="${ACCENT}" stroke-width="4"/>`;
      break;
  }
  return svgDoc(300, 250, body);
}

export const nameThePart: QuestionTemplate = {
  id: 'm9.geo.circles.name-the-part',
  topicId: 'm9.geo.circles',
  title: 'Name the highlighted part of a circle',
  difficulties: [1, 2],
  generate({ rng, difficulty }) {
    const pool: Part[] = difficulty === 1 ? ['centre', 'radius', 'diameter', 'circumference'] : ['chord', 'arc', 'diameter', 'radius', 'chord', 'arc'];
    const part = rng.pick(pool);
    // Distractors: confusable names that are definitely wrong. (A diameter is also a chord, so
    // "chord" is never offered when the answer is "diameter".)
    const confusable: Record<Part, Part[]> = {
      centre: ['radius', 'diameter', 'circumference'],
      radius: ['diameter', 'chord', 'circumference'],
      diameter: ['radius', 'arc', 'circumference'],
      chord: ['diameter', 'radius', 'arc'],
      arc: ['circumference', 'chord', 'diameter'],
      circumference: ['arc', 'diameter', 'radius'],
    };
    const options = [part, ...confusable[part]].sort().map((p) => ({ id: p, text: NAMES[p] }));
    const feedback: Record<string, string> = {};
    for (const p of confusable[part]) feedback[p] = `Not quite. ${DEF[p]} Look again at what is highlighted.`;
    return {
      type: 'mcq',
      prompt: `What is the name of the part of the circle highlighted in blue?`,
      figure: { svg: partFigure(rng, part), alt: `A circle with its ${part === 'centre' ? 'centre point' : part} highlighted in blue.` },
      options,
      correct: part,
      shuffle: false,
      feedback,
      calculator: 'not-allowed',
      hints: [
        part === 'chord' || part === 'diameter' ? 'Does the line pass through the centre of the circle?' : 'Is the highlighted part straight or curved? Does it touch the centre?',
      ],
      solution: `It is the **${part}**. ${WHY[part]}`,
    };
  },
};

function radiusFigure(kind: 'radius' | 'diameter', text: string, a: number) {
  let body = circle(C0, R0, { fill: '#eff6ff' }) + dot(C0);
  const p = polar(C0, R0, a);
  if (kind === 'radius') body += line(C0, p, { stroke: ACCENT });
  else body += line(polar(C0, R0, a + 180), p, { stroke: ACCENT });
  const from = kind === 'radius' ? C0 : polar(C0, R0, a + 180);
  body += labelAway(from, p, polar(C0, 30, a - 90), text, { fill: ACCENT, offset: 8 });
  return svgDoc(300, 250, body);
}

export const radiusDiameter: QuestionTemplate = {
  id: 'm9.geo.circles.radius-diameter',
  topicId: 'm9.geo.circles',
  title: 'Radius and diameter (d = 2r)',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }): TemplateOutput {
    const u = rng.pick(['cm', 'mm', 'm'] as const);
    const a = rng.pick([15, 25, 160, 200, 330, 345]);
    if (difficulty <= 2) {
      const r = difficulty === 1 ? rng.int(2, 30) : clean(rng.int(1, 30) + rng.pick([0.5, 0.25, 0.4, 0.8]));
      const giveR = rng.chance(0.5);
      const d = clean(2 * r);
      const val = giveR ? r : d;
      return {
        type: 'numeric',
        prompt: giveR ? 'The radius of this circle is shown. What is its diameter?' : 'The diameter of this circle is shown. What is its radius?',
        figure: { svg: radiusFigure(giveR ? 'radius' : 'diameter', `${num(val)} ${u}`, a), alt: `A circle with its ${giveR ? 'radius' : 'diameter'} labelled ${num(val)} ${u}.` },
        answer: giveR ? d : r,
        units: u,
        calculator: 'not-allowed',
        hints: ['The diameter goes all the way across the circle through the centre. The radius goes from the centre to the edge.', 'Diameter = 2 × radius.'],
        solution: giveR ? `$d = 2r = 2 \\times ${tex(r)} = ${tex(d)}$ ${u}.` : `$r = d \\div 2 = ${tex(d)} \\div 2 = ${tex(r)}$ ${u}.`,
      };
    }
    // difficulty 3: short contexts.
    const kind = rng.pick(['longest-chord', 'square', 'coins', 'pizza'] as const);
    if (kind === 'longest-chord') {
      const d = 2 * rng.int(3, 25);
      return {
        type: 'numeric',
        prompt: `The longest chord that can be drawn in a circle is ${d} ${u} long. What is the radius of the circle?`,
        answer: d / 2,
        units: u,
        calculator: 'not-allowed',
        hints: ['Which special chord is the longest one in any circle?', 'The longest chord passes through the centre.'],
        solution: `The longest chord is the **diameter**, so $d = ${d}$ ${u}.\n\n$r = ${d} \\div 2 = ${d / 2}$ ${u}.`,
      };
    }
    if (kind === 'square') {
      const s = rng.int(4, 40);
      return {
        type: 'numeric',
        prompt: `A circle fits exactly inside a square with sides of ${s} ${u}, touching all four sides. What is the radius of the circle?`,
        answer: clean(s / 2),
        units: u,
        calculator: 'not-allowed',
        hints: ['Sketch it. The circle touches two opposite sides of the square.', 'So the diameter of the circle is the same as the side of the square.'],
        solution: `The diameter equals the side of the square: $d = ${s}$ ${u}.\n\n$r = ${s} \\div 2 = ${tex(clean(s / 2))}$ ${u}.`,
      };
    }
    if (kind === 'coins') {
      const n = rng.int(3, 8);
      const r = rng.pick([0.9, 1, 1.2, 1.25, 1.5]);
      const total = clean(n * 2 * r);
      return {
        type: 'numeric',
        prompt: `${n} identical coins, each with a radius of ${num(r)} cm, are placed in a straight row, each touching the next. How long is the row, from one end to the other?`,
        answer: total,
        units: 'cm',
        calculator: 'allowed',
        hints: ['Each coin takes up its diameter along the row.', `Diameter of one coin = 2 × ${num(r)} cm.`],
        solution: `Diameter of one coin: $2 \\times ${tex(r)} = ${tex(clean(2 * r))}$ cm.\n\nLength of the row: $${n} \\times ${tex(clean(2 * r))} = ${tex(total)}$ cm.`,
      };
    }
    const d = 2 * rng.int(10, 22);
    return {
      type: 'numeric',
      prompt: `A round pizza has a diameter of ${d} cm. It is cut into slices by straight cuts through the centre. How long is the straight edge of a slice, from the centre to the crust?`,
      answer: d / 2,
      units: 'cm',
      calculator: 'not-allowed',
      hints: ['A cut from the centre to the crust is a radius.'],
      solution: `The straight edges of each slice go from the centre to the edge, so each is a **radius**.\n\n$r = ${d} \\div 2 = ${d / 2}$ cm.`,
    };
  },
};

/** Circle with centre O and two points A, B on it; radii OA, OB and chord AB drawn. */
function triangleOAB(angleAOB: number, labels: { oa?: string; ab?: string; aob?: string; oab?: string }, rot: number) {
  const O = C0;
  const A = polar(O, R0, rot);
  const B = polar(O, R0, rot + angleAOB);
  let body = circle(O, R0, { stroke: '#6b7280' });
  body += polygon([O, A, B], { fill: '#fef3c7' });
  body += dot(O) + dot(A) + dot(B);
  // Vertex letters, pushed outwards.
  body += label(polar(O, R0 + 14, rot), 'A', { bold: true }) + label(polar(O, R0 + 14, rot + angleAOB), 'B', { bold: true });
  body += label(polar(O, 16, rot + angleAOB / 2 + 180), 'O', { bold: true });
  if (labels.oa) body += labelAway(O, A, B, labels.oa, { offset: 6 });
  if (labels.ab) {
    const m = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
    body += labelAway(A, B, { x: 2 * m.x - O.x, y: 2 * m.y - O.y }, labels.ab, { offset: 6 }); // inside, on O's side
  }
  if (labels.aob) body += arcWithLabel(O, A, B, labels.aob, 26);
  if (labels.oab) body += arcWithLabel(A, O, B, labels.oab, 26);
  body += notToScale({ x: 296, y: 240 });
  return svgDoc(300, 250, body);
}

function touchingCircles(external: boolean, labels: { big: string; small: string }) {
  const y = 125;
  let body = '';
  if (external) {
    const A = { x: 110, y };
    const B = { x: 240, y };
    const RA = 80;
    const RB = 50;
    body += circle(A, RA, { fill: '#eff6ff' }) + circle(B, RB, { fill: '#fef3c7' });
    body += dot(A) + dot(B) + label({ x: A.x, y: y + 16 }, 'P', { bold: true }) + label({ x: B.x, y: y + 16 }, 'Q', { bold: true });
    body += line(A, B, { stroke: '#6b7280', width: 1.2, dash: true });
    body += label({ x: A.x, y: y - RA - 12 }, labels.big) + label({ x: B.x, y: y - RB - 12 }, labels.small);
    body += notToScale({ x: 315, y: 238 });
    return svgDoc(320, 250, body);
  }
  const A = { x: 160, y };
  const RA = 105;
  const B = { x: A.x + RA - 45, y };
  body += circle(A, RA, { fill: '#eff6ff' }) + circle(B, 45, { fill: '#fef3c7' });
  body += dot(A) + dot(B) + label({ x: A.x, y: y + 16 }, 'P', { bold: true }) + label({ x: B.x, y: y + 16 }, 'Q', { bold: true });
  body += line(A, B, { stroke: '#6b7280', width: 1.2, dash: true });
  body += label({ x: A.x - 30, y: y - RA + 22 }, labels.big) + label({ x: B.x, y: y - 58 }, labels.small, { size: 13 });
  body += notToScale({ x: 315, y: 245 });
  return svgDoc(320, 255, body);
}

export const circleReasoning: QuestionTemplate = {
  id: 'm9.geo.circles.reasoning',
  topicId: 'm9.geo.circles',
  title: 'Reasoning with radii: isosceles triangles and touching circles',
  difficulties: [3, 4, 5],
  generate({ rng, difficulty }): TemplateOutput {
    const rot = rng.pick([200, 210, 220, 230]);
    if (difficulty === 3) {
      const r = rng.int(3, 15);
      const ab = rng.int(2, 2 * r - 1);
      const angle = 2 * Math.round((Math.asin(Math.min(0.98, ab / (2 * r))) * 180) / Math.PI);
      return {
        type: 'numeric',
        prompt: `O is the centre of the circle, and A and B are points on the circle. The radius OA is ${r} cm and the chord AB is ${ab} cm. Find the perimeter of triangle OAB.`,
        figure: { svg: triangleOAB(Math.max(55, Math.min(150, angle)), { oa: `${r} cm`, ab: `${ab} cm` }, rot), alt: `A circle with centre O. Triangle OAB has OA = ${r} cm (a radius) and chord AB = ${ab} cm. OB is not labelled.` },
        answer: 2 * r + ab,
        units: 'cm',
        calculator: 'not-allowed',
        hints: ['OB is not labelled. What kind of line is OB?', 'OA and OB are both radii, so they are the same length.'],
        solution: `OA and OB are both radii, so $OB = OA = ${r}$ cm.\n\nPerimeter $= ${r} + ${r} + ${ab} = ${2 * r + ab}$ cm.`,
      };
    }
    if (difficulty === 4) {
      const aob = 2 * rng.int(15, 70); // even, 30°–140°
      const base = (180 - aob) / 2;
      const askBase = rng.chance(0.6);
      return {
        type: 'numeric',
        prompt: askBase
          ? `O is the centre of the circle, and A and B are on the circle. Angle AOB is ${aob}°. Find angle OAB.`
          : `O is the centre of the circle, and A and B are on the circle. Angle OAB is ${base}°. Find angle AOB.`,
        figure: {
          svg: triangleOAB(Math.max(75, Math.min(140, aob + rng.int(-10, 10))), askBase ? { aob: `${aob}°`, oab: '?' } : { oab: `${base}°`, aob: '?' }, rot),
          alt: askBase ? `Triangle OAB inside a circle with centre O. Angle AOB is ${aob}°. Angle OAB is marked with a question mark.` : `Triangle OAB inside a circle with centre O. Angle OAB is ${base}°. Angle AOB is marked with a question mark.`,
        },
        answer: askBase ? base : aob,
        units: '°',
        calculator: 'not-allowed',
        hints: ['OA and OB are both radii. What does that tell you about triangle OAB?', 'Triangle OAB is isosceles, so angles OAB and OBA are equal. The angles of a triangle add to 180°.'],
        solution: askBase
          ? `OA = OB (both radii), so triangle OAB is isosceles and $\\angle OAB = \\angle OBA$.\n\n$\\angle OAB = (180° - ${aob}°) \\div 2 = ${base}°$.`
          : `OA = OB (both radii), so triangle OAB is isosceles and $\\angle OBA = \\angle OAB = ${base}°$.\n\n$\\angle AOB = 180° - ${base}° - ${base}° = ${aob}°$.`,
      };
    }
    // difficulty 5: touching circles.
    const external = rng.chance(0.5);
    const R = rng.int(5, 20);
    const r = rng.int(2, R - 2);
    const giveDiam = rng.chance(0.5);
    const bigText = giveDiam ? `diameter ${2 * R} cm` : `radius ${R} cm`;
    const smallText = giveDiam ? `radius ${r} cm` : `diameter ${2 * r} cm`;
    const answer = external ? R + r : R - r;
    return {
      type: 'numeric',
      prompt: external
        ? `Two circles touch at exactly one point, on the outside of each other. The large circle (centre P) has a ${bigText}. The small circle (centre Q) has a ${smallText}. How far apart are the centres P and Q?`
        : `A small circle sits inside a large circle and touches it at exactly one point. The large circle (centre P) has a ${bigText}. The small circle (centre Q) has a ${smallText}. The centres and the touching point are in a straight line. How far apart are the centres P and Q?`,
      figure: {
        svg: touchingCircles(external, { big: bigText, small: smallText }),
        alt: external ? 'Two circles touching on the outside, with centres P and Q joined by a dashed line.' : 'A small circle inside a large circle, touching it at one point, with centres P and Q joined by a dashed line.',
      },
      answer,
      units: 'cm',
      calculator: 'not-allowed',
      hints: [
        'Change any diameters into radii first.',
        external ? 'The dashed line PQ is made of one radius of each circle.' : 'Going from P to the touching point is one radius of the big circle. Q is part of the way along it.',
      ],
      solution: [
        `Radii: large circle ${R} cm, small circle ${r} cm.`,
        external
          ? `PQ goes from P to the touching point (a radius of the large circle) and on to Q (a radius of the small circle): $PQ = ${R} + ${r} = ${answer}$ cm.`
          : `From P to the touching point is ${R} cm. Q is one small radius back from the touching point: $PQ = ${R} - ${r} = ${answer}$ cm.`,
      ].join('\n\n'),
    };
  },
};
