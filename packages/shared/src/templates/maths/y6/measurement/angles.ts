import type { QuestionTemplate } from '../../../types';
import type { Rng } from '../../../../rng';
import { ACCENT, dot, INK, label, line, rightAngleMark, svgDoc, type Pt } from '../../../svg';
import { arc, notToScale, polar } from '../../measurement/figures';

// m6.mea.angles — classifying angles, reading a protractor, and the three angle facts:
// angles on a straight line (180°), angles at a point (360°) and vertically opposite angles.
// Directions are in degrees, anticlockwise on screen, with 0° pointing right (see figures.ts).
// Reasoning figures are "not to scale": drawn angles are nudged away from the true sizes.

const deg = (n: number | string) => `${n}°`;

// ---------------------------------------------------------------- figure helpers

export interface Mark {
  /** Direction of the first arm. */
  from: number;
  /** Anticlockwise size of the angle as drawn. */
  sweep: number;
  text?: string;
  /** Draw a right-angle square instead of an arc. */
  right?: boolean;
  radius?: number;
}

/** Arc (or right-angle square) for an angle, with its label placed between the arms. */
export function markAngle(V: Pt, m: Mark): string {
  if (m.right) return rightAngleMark(V, polar(V, 10, m.from), polar(V, 10, m.from + m.sweep), 15);
  const r = m.radius ?? 26;
  let out = arc(V, r, m.from, m.from + m.sweep, { stroke: ACCENT, width: 1.8 });
  if (m.text) {
    const mid = m.from + m.sweep / 2;
    const halfW = (m.text.length * 14 * 0.56) / 2;
    const rad = (mid * Math.PI) / 180;
    const along = halfW * Math.abs(Math.cos(rad)) + 7 * Math.abs(Math.sin(rad));
    const across = halfW * Math.abs(Math.sin(rad)) + 7 * Math.abs(Math.cos(rad));
    const half = Math.min(m.sweep, 180) / 2;
    const dist = m.sweep >= 180 ? r + 6 + along : Math.max(r + 6 + along, across / Math.tan(Math.max(0.2, (half * Math.PI) / 180)) + 4);
    out += label(polar(V, dist, mid), m.text, { fill: ACCENT });
  }
  return out;
}

/** Rays from a centre point plus angle marks and optional end-point letters. */
export function raysSvg(
  directions: number[],
  marks: Mark[],
  opts: {
    names?: Array<{ dir: number; name: string }>;
    /** A letter for the centre point, placed just off it in direction `dir` (inside a wide angle). */
    centre?: { dir: number; name: string };
    scaleNote?: boolean;
    height?: number;
  } = {},
): string {
  const h = opts.height ?? 270;
  const V: Pt = { x: 190, y: h / 2 };
  const L = Math.min(150, h / 2 - 22);
  let body = '';
  for (const d of directions) body += line(V, polar(V, L, d), { width: 2.2 });
  body += dot(V);
  for (const m of marks) body += markAngle(V, m);
  for (const n of opts.names ?? []) body += label(polar(V, L + 13, n.dir), n.name, { bold: true });
  if (opts.centre) body += label(polar(V, 15, opts.centre.dir), opts.centre.name, { bold: true, size: 13 });
  if (opts.scaleNote !== false) body += notToScale({ x: 372, y: h - 10 });
  return svgDoc(380, h, body);
}

/** Drawn sizes near the real ones (nudged so the figure can't be measured), scaled to `total`. */
function drawnSizes(rng: Rng, actual: number[], total: number, min = 24): number[] {
  let v = actual.map((a) => (a === 90 ? 90 : a + rng.pick([-9, -6, 6, 9])));
  for (let k = 0; k < 6; k++) {
    const fixed = v.reduce((s, x, i) => s + (actual[i] === 90 ? x : 0), 0);
    const free = v.reduce((s, x, i) => s + (actual[i] === 90 ? 0 : x), 0);
    v = v.map((x, i) => (actual[i] === 90 ? 90 : Math.max(min, (x * (total - fixed)) / free)));
  }
  return v;
}

/** Turn a list of consecutive angle sizes into ray directions, starting at `start`. */
function directionsFrom(start: number, sizes: number[]): number[] {
  const dirs = [start];
  for (const s of sizes.slice(0, -1)) dirs.push(dirs[dirs.length - 1]! + s);
  return dirs;
}

// ---------------------------------------------------------------- 1. classify

const KINDS = ['acute', 'right', 'obtuse', 'straight', 'reflex'] as const;
type Kind = (typeof KINDS)[number];

const RULE: Record<Kind, string> = {
  acute: 'An acute angle is less than 90°.',
  right: 'A right angle is exactly 90°.',
  obtuse: 'An obtuse angle is more than 90° but less than 180°.',
  straight: 'A straight angle is exactly 180°.',
  reflex: 'A reflex angle is more than 180° but less than 360°.',
};

const an = (k: Kind) => (k === 'acute' || k === 'obtuse' ? 'an' : 'a');

function kindOf(a: number): Kind {
  if (a < 90) return 'acute';
  if (a === 90) return 'right';
  if (a < 180) return 'obtuse';
  if (a === 180) return 'straight';
  return 'reflex';
}

function sizeFor(rng: Rng, k: Kind, step: number, forDrawing = false): number {
  const pick = (lo: number, hi: number) => rng.int(Math.ceil(lo / step), Math.floor(hi / step)) * step;
  switch (k) {
    case 'acute':
      return forDrawing ? pick(25, 70) : pick(5, 85);
    case 'right':
      return 90;
    case 'obtuse':
      return forDrawing ? pick(110, 160) : pick(95, 175);
    case 'straight':
      return 180;
    case 'reflex':
      return forDrawing ? pick(210, 330) : pick(185, 355);
  }
}

const KIND_OPTIONS = KINDS.map((k, i) => ({ id: 'abcde'[i]!, text: `${k[0]!.toUpperCase()}${k.slice(1)}` }));

export const classify: QuestionTemplate = {
  id: 'm6.mea.angles.classify',
  topicId: 'm6.mea.angles',
  title: 'Acute, right, obtuse, straight and reflex angles',
  difficulties: [1, 2],
  generate({ rng, difficulty }) {
    const kind = rng.pick(['acute', 'acute', 'obtuse', 'obtuse', 'reflex', 'reflex', 'right', 'straight'] as const);
    const feedback = Object.fromEntries(KINDS.map((k, i) => [KIND_OPTIONS[i]!.id, RULE[k]]).filter(([id]) => id !== KIND_OPTIONS[KINDS.indexOf(kind)]!.id));
    const correct = KIND_OPTIONS[KINDS.indexOf(kind)]!.id;

    if (difficulty === 1) {
      const a = sizeFor(rng, kind, 5);
      return {
        type: 'mcq',
        prompt: `An angle measures ${deg(a)}. What type of angle is it?`,
        options: KIND_OPTIONS,
        correct,
        feedback,
        shuffle: false,
        calculator: 'not-allowed',
        hints: ['Compare the angle with 90° (a right angle) and 180° (a straight line).'],
        solution: `${RULE[kind]} ${deg(a)} is ${kind === 'right' || kind === 'straight' ? 'exactly that' : 'in that range'}, so it is **${an(kind)} ${kind} angle**.`,
      };
    }

    if (rng.chance(0.5)) {
      // A drawn angle with no size given.
      const a = sizeFor(rng, kind, 1, true);
      const start = rng.int(0, 35) * 10;
      const V: Pt = { x: 150, y: 130 };
      let body = line(V, polar(V, 110, start), { width: 2.4 }) + line(V, polar(V, 110, start + a), { width: 2.4 }) + dot(V);
      body += markAngle(V, { from: start, sweep: a, right: kind === 'right', radius: kind === 'reflex' ? 22 : 30 });
      return {
        type: 'mcq',
        prompt: 'What type of angle is marked?',
        figure: { svg: svgDoc(300, 260, body), alt: `Two arms meeting at a point with the ${kind} angle between them marked` },
        options: KIND_OPTIONS,
        correct,
        feedback,
        shuffle: false,
        calculator: 'not-allowed',
        hints: [
          'Look at the marked side of the angle. Is it smaller than a square corner, or bigger?',
          'Is the marked part more than a straight line (half a turn)?',
        ],
        solution: `${RULE[kind]} The marked angle is ${
          kind === 'acute'
            ? 'smaller than a square corner'
            : kind === 'right'
              ? 'marked with a small square, which means 90°'
              : kind === 'obtuse'
                ? 'bigger than a square corner but less than a straight line'
                : kind === 'straight'
                  ? 'a straight line'
                  : 'more than a straight line (it goes the long way round)'
        }, so it is **${an(kind)} ${kind} angle**.`,
      };
    }

    // Which of these is …? One size of each other kind as distractors.
    const others = KINDS.filter((k) => k !== kind && k !== 'straight' && k !== 'right');
    const sizes = [sizeFor(rng, kind, 5), ...others.map((k) => sizeFor(rng, k, 5))];
    if (kind !== 'right') sizes.push(90);
    else sizes.push(180);
    const unique = [...new Set(sizes)].slice(0, 4);
    const opts = rng.shuffle(unique).map((s, i) => ({ id: 'abcd'[i]!, text: deg(s) }));
    const right = opts.find((o) => o.text === deg(sizes[0]!))!;
    return {
      type: 'mcq',
      prompt: `Which of these is ${an(kind)} **${kind}** angle?`,
      options: opts,
      correct: right.id,
      feedback: Object.fromEntries(
        opts.filter((o) => o.id !== right.id).map((o) => [o.id, `${o.text} is ${an(kindOf(Number.parseInt(o.text, 10)))} ${kindOf(Number.parseInt(o.text, 10))} angle. ${RULE[kind]}`]),
      ),
      calculator: 'not-allowed',
      hints: [RULE[kind]],
      solution: `${RULE[kind]} So the answer is **${right.text}**.`,
    };
  },
};

// ---------------------------------------------------------------- 2. protractor

export function protractorSvg(arm1: number, arm2: number, reflex: boolean): string {
  const C: Pt = { x: 210, y: 210 };
  const R = 185;
  let body = `<path d="M ${C.x - R} ${C.y} A ${R} ${R} 0 0 1 ${C.x + R} ${C.y} Z" fill="#fefce8" stroke="${INK}" stroke-width="1.8"/>`;
  for (let d = 0; d <= 180; d += 5) {
    const len = d % 10 === 0 ? 14 : 8;
    body += line(polar(C, R, d), polar(C, R - len, d), { width: d % 10 === 0 ? 1.4 : 1 });
    if (d % 10 === 0) {
      // Lift the 0 and 180 labels off the baseline so the arms don't cover them.
      const at = d === 0 ? 5 : d === 180 ? 175 : d;
      body += label(polar(C, R - 25, at), String(180 - d), { size: 10 });
      body += label(polar(C, R - 45, at), String(d), { size: 10, fill: ACCENT });
    }
  }
  body += `<path d="M ${C.x - 34} ${C.y} A 34 34 0 0 1 ${C.x + 34} ${C.y}" fill="none" stroke="${INK}" stroke-width="1"/>`;
  const armEnd = (d: number) => polar(C, R + 12, d);
  body += line(C, armEnd(arm1), { stroke: '#dc2626', width: 3 });
  body += line(C, armEnd(arm2), { stroke: '#dc2626', width: 3 });
  const lo = Math.min(arm1, arm2);
  const hi = Math.max(arm1, arm2);
  body += reflex ? arc(C, 22, hi, lo + 360, { stroke: '#dc2626', width: 2 }) : arc(C, 22, lo, hi, { stroke: '#dc2626', width: 2 });
  body += dot(C, 4);
  return svgDoc(420, reflex ? 250 : 222, body);
}

export const protractor: QuestionTemplate = {
  id: 'm6.mea.angles.protractor',
  topicId: 'm6.mea.angles',
  title: 'Read an angle on a protractor',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    const prompt = 'Read the protractor. What is the size of the angle marked in red?';
    const commonHint = 'Find the arm that lies along the 0 line. Use the scale that starts at 0 on that arm.';
    if (difficulty === 1 || difficulty === 2) {
      // Difficulty 1: one arm on the right, so the inner scale reads directly. Difficulty 2: arm on the left.
      const step = difficulty === 1 && rng.chance(0.5) ? 10 : 5;
      let a = rng.int(1, Math.floor(175 / step)) * step;
      if (a === 90 && difficulty === 2) a = 95;
      const left = difficulty === 2 && rng.chance(0.75);
      const arm2 = left ? 180 - a : a;
      return {
        type: 'numeric',
        prompt,
        figure: { svg: protractorSvg(left ? 180 : 0, arm2, false), alt: 'A protractor with an angle drawn on it' },
        answer: a,
        units: '°',
        form: 'integer',
        calculator: 'not-allowed',
        hints: [commonHint, 'Is the angle smaller or bigger than a right angle (90°)? Check that your reading makes sense.'],
        solution: [
          left
            ? 'One arm lies along the 0 line on the **left**, so use the outer (black) scale, which starts at 0 on the left.'
            : 'One arm lies along the 0 line on the **right**, so use the inner (blue) scale, which starts at 0 on the right.',
          `Count round from 0 to the other arm. It points to **${deg(a)}**.`,
          a < 90 ? 'The angle is acute (less than 90°), so this makes sense.' : 'The angle is obtuse (more than 90°), so this makes sense.',
        ].join('\n\n'),
      };
    }
    if (rng.chance(0.5)) {
      // neither arm on 0
      const p = rng.int(1, 8) * 10;
      const a = rng.int(5, Math.floor((170 - p) / 5)) * 5;
      return {
        type: 'numeric',
        prompt: `${prompt} (Neither arm is on the 0 line.)`,
        figure: { svg: protractorSvg(p, p + a, false), alt: 'A protractor with an angle drawn on it; neither arm is on the zero line' },
        answer: a,
        units: '°',
        form: 'integer',
        calculator: 'not-allowed',
        hints: ['Read where each arm crosses the same scale.', 'The angle is the difference between the two readings.'],
        solution: [
          `On the inner (blue) scale, one arm is at ${deg(p)} and the other is at ${deg(p + a)}.`,
          `The angle is the gap between them: $${p + a} - ${p} = ${a}$.`,
          `The angle is **${deg(a)}**.`,
        ].join('\n\n'),
      };
    }
    const a = rng.int(4, 34) * 5;
    const reflex = 360 - a;
    return {
      type: 'numeric',
      prompt: 'The red arc shows a **reflex** angle. Use the protractor to work out its size.',
      figure: { svg: protractorSvg(0, a, true), alt: 'A protractor with two arms drawn and the reflex angle between them marked underneath' },
      answer: reflex,
      units: '°',
      form: 'integer',
      calculator: 'not-allowed',
      hints: [
        'A protractor only goes to 180°. Read the smaller angle between the arms first.',
        'A full turn is 360°. The reflex angle and the smaller angle make a full turn together.',
      ],
      solution: [
        `The smaller angle between the arms reads ${deg(a)} on the inner (blue) scale.`,
        `The two angles make a full turn: $360 - ${a} = ${reflex}$.`,
        `The reflex angle is **${deg(reflex)}**.`,
      ].join('\n\n'),
    };
  },
};

// ---------------------------------------------------------------- 3. angles on a straight line

export const straightLine: QuestionTemplate = {
  id: 'm6.mea.angles.straight-line',
  topicId: 'm6.mea.angles',
  title: 'Angles on a straight line',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    const hints = ['Angles on a straight line add up to 180°.', 'Add the angles you know, then take the total away from 180°.'];
    if (difficulty === 1 || difficulty === 2) {
      let k = difficulty === 1 ? rng.int(2, 16) * 10 : rng.int(12, 168);
      if (k === 90) k = difficulty === 1 ? 110 : 97;
      const x = 180 - k;
      const knownFirst = rng.chance(0.5);
      const sizes = knownFirst ? [k, x] : [x, k];
      const [d1, d2] = drawnSizes(rng, sizes, 180, 30);
      const dirs = [0, d1!, 180];
      return {
        type: 'numeric',
        prompt: 'The diagram shows a straight line. Find the size of angle $a$.',
        figure: {
          svg: raysSvg(dirs, [
            { from: 0, sweep: d1!, text: knownFirst ? deg(k) : 'a' },
            { from: d1!, sweep: d2!, text: knownFirst ? 'a' : deg(k) },
          ], { height: 210 }),
          alt: `A straight line with a ray from a point on it. One angle is ${k}° and the other is a`,
        },
        answer: x,
        units: '°',
        form: 'integer',
        calculator: 'not-allowed',
        hints,
        solution: `Angles on a straight line add to 180°.\n\n$a = 180 - ${k} = ${x}$\n\nSo $a$ = **${deg(x)}**.`,
      };
    }
    // difficulty 3: three angles on the line
    if (rng.chance(0.35)) {
      const k = rng.int(10, 70) * 2;
      const b = (180 - k) / 2;
      const order = rng.pick([0, 1, 2]);
      const actual = order === 0 ? [k, b, b] : order === 1 ? [b, k, b] : [b, b, k];
      const drawn = drawnSizes(rng, actual, 180, 26);
      const dirs = directionsFrom(0, drawn);
      dirs.push(180);
      return {
        type: 'numeric',
        prompt: 'The diagram shows a straight line. The two angles marked $b$ are equal. Find the size of angle $b$.',
        figure: {
          svg: raysSvg(dirs, drawn.map((d, i) => ({ from: dirs[i]!, sweep: d, text: i === order ? deg(k) : 'b' })), { height: 210 }),
          alt: `A straight line with two rays from one point, making three angles: ${k}°, b and b`,
        },
        answer: b,
        units: '°',
        form: 'integer',
        marks: 2,
        calculator: 'not-allowed',
        hints: ['Angles on a straight line add up to 180°.', `Take ${k}° away from 180° first. What is left is shared equally between the two angles.`],
        solution: `Angles on a straight line add to 180°.\n\nThe two $b$ angles together: $180 - ${k} = ${180 - k}$.\n\nThey are equal, so $b = ${180 - k} \\div 2 = ${b}$.\n\nSo $b$ = **${deg(b)}**.`,
      };
    }
    let p = 0;
    let q = 0;
    let r = 0;
    do {
      p = rng.int(20, 120);
      q = rng.int(20, 120);
      r = 180 - p - q;
    } while (r < 20 || p === 90 || q === 90 || r === 90);
    const actual = [p, q, r];
    const unknown = rng.int(0, 2);
    const drawn = drawnSizes(rng, actual, 180, 26);
    const dirs = directionsFrom(0, drawn);
    dirs.push(180);
    const known = actual.filter((_, i) => i !== unknown);
    const ans = actual[unknown]!;
    return {
      type: 'numeric',
      prompt: 'The diagram shows a straight line. Find the size of angle $c$.',
      figure: {
        svg: raysSvg(dirs, drawn.map((d, i) => ({ from: dirs[i]!, sweep: d, text: i === unknown ? 'c' : deg(actual[i]!) })), { height: 210 }),
        alt: `A straight line with two rays from one point, making three angles: ${known.map(deg).join(', ')} and c`,
      },
      answer: ans,
      units: '°',
      form: 'integer',
      calculator: 'not-allowed',
      hints,
      solution: `Angles on a straight line add to 180°.\n\n$${known[0]} + ${known[1]} = ${known[0]! + known[1]!}$\n\n$c = 180 - ${known[0]! + known[1]!} = ${ans}$\n\nSo $c$ = **${deg(ans)}**.`,
    };
  },
};

// ---------------------------------------------------------------- 4. angles at a point

export const atAPoint: QuestionTemplate = {
  id: 'm6.mea.angles.at-a-point',
  topicId: 'm6.mea.angles',
  title: 'Angles at a point',
  difficulties: [2, 3, 4, 5],
  generate({ rng, difficulty }) {
    const hints = ['Angles at a point (all the way round) add up to 360°.', 'Add the angles you know, then take the total away from 360°.'];
    const start = rng.int(0, 35) * 10;

    if (difficulty === 3 && rng.chance(0.35)) {
      // reflex angle from the angle you can see
      const k = rng.int(25, 160);
      const ans = 360 - k;
      const [dk] = drawnSizes(rng, [k, ans], 360, 25);
      return {
        type: 'numeric',
        prompt: 'Two arms meet at a point. The smaller angle between them is marked. Find the size of the reflex angle $r$.',
        figure: {
          svg: raysSvg([start, start + dk!], [
            { from: start, sweep: dk!, text: deg(k) },
            { from: start + dk!, sweep: 360 - dk!, text: 'r', radius: 20 },
          ]),
          alt: `Two arms from a point, with a ${k}° angle between them and the reflex angle r marked the other way round`,
        },
        answer: ans,
        units: '°',
        form: 'integer',
        calculator: 'not-allowed',
        hints: ['The two angles go all the way round the point.', 'Angles at a point add up to 360°.'],
        solution: `The ${deg(k)} angle and $r$ make a full turn, so they add to 360°.\n\n$r = 360 - ${k} = ${ans}$\n\nSo $r$ = **${deg(ans)}**. (It is more than 180°, so it is a reflex angle.)`,
      };
    }

    let actual: number[] = [];
    let unknownIdx: number[] = [];
    let letter = 'a';
    if (difficulty === 2) {
      do {
        actual = [rng.int(6, 17) * 10, rng.int(6, 17) * 10];
        actual.push(360 - actual[0]! - actual[1]!);
      } while (actual[2]! < 50 || actual[2]! > 170 || actual.includes(90));
      unknownIdx = [rng.int(0, 2)];
    } else if (difficulty === 3) {
      do {
        actual = [rng.int(40, 130), rng.int(40, 130), rng.int(40, 130)];
        actual.push(360 - actual[0]! - actual[1]! - actual[2]!);
      } while (actual[3]! < 35 || actual[3]! > 160 || actual.includes(90));
      unknownIdx = [rng.int(0, 3)];
    } else if (difficulty === 4) {
      do {
        actual = [90, rng.int(40, 150), rng.int(40, 150)];
        actual.push(360 - 90 - actual[1]! - actual[2]!);
      } while (actual[3]! < 35 || actual[3]! > 160 || actual.slice(1).includes(90));
      unknownIdx = [rng.pick([1, 2, 3])];
      const rot = rng.int(0, 3);
      actual = [...actual.slice(rot), ...actual.slice(0, rot)];
      unknownIdx = [(unknownIdx[0]! - rot + 4) % 4];
    } else {
      // two equal unknowns
      const withRight = rng.chance(0.5);
      let b = 0;
      do {
        const k = rng.int(40, 160);
        const rest = 360 - k - (withRight ? 90 : 0);
        if (rest % 2 === 0 && rest / 2 >= 35 && rest / 2 <= 160 && rest / 2 !== 90 && rest / 2 !== k && k !== 90) {
          b = rest / 2;
          actual = withRight ? [90, b, k, b] : [b, k, b];
        }
      } while (!b);
      unknownIdx = actual.map((v, i) => (v === b ? i : -1)).filter((i) => i >= 0);
      letter = 'b';
    }
    const drawn = drawnSizes(rng, actual, 360, 28);
    const dirs = directionsFrom(start, drawn);
    const marks: Mark[] = drawn.map((d, i) => ({
      from: dirs[i]!,
      sweep: d,
      ...(actual[i] === 90 && difficulty >= 4 ? { right: true } : { text: unknownIdx.includes(i) ? letter : deg(actual[i]!) }),
    }));
    const knownVals = actual.filter((_, i) => !unknownIdx.includes(i));
    const knownSum = knownVals.reduce((s, x) => s + x, 0);
    const ans = actual[unknownIdx[0]!]!;
    const hasRight = difficulty >= 4 && actual.includes(90);
    const sumText = knownVals.join(' + ');
    return {
      type: 'numeric',
      prompt:
        difficulty === 5
          ? `Find the size of angle $b$. The two angles marked $b$ are equal.${hasRight ? ' The small square shows a right angle.' : ''}`
          : `Find the size of angle $a$.${hasRight ? ' The small square shows a right angle.' : ''}`,
      figure: {
        svg: raysSvg(dirs, marks),
        alt: `${actual.length} angles around a point: ${actual.map((v, i) => (unknownIdx.includes(i) ? letter : v === 90 && hasRight ? 'a right angle' : deg(v))).join(', ')}`,
      },
      answer: ans,
      units: '°',
      form: 'integer',
      ...(difficulty >= 4 && { marks: 2 }),
      calculator: 'not-allowed',
      hints:
        difficulty === 5
          ? [hints[0]!, 'Take the angles you know away from 360°. What is left is shared equally between the two $b$ angles.']
          : hasRight
            ? [hints[0]!, 'A right angle is 90°. Include it when you add up the angles you know.']
            : hints,
      solution: [
        'Angles at a point add to 360°.',
        hasRight ? 'The small square means one angle is 90°.' : '',
        `Angles you know: $${sumText} = ${knownSum}$.`,
        difficulty === 5
          ? `The two $b$ angles together: $360 - ${knownSum} = ${360 - knownSum}$. So $b = ${360 - knownSum} \\div 2 = ${ans}$.`
          : `$a = 360 - ${knownSum} = ${ans}$`,
        `So $${letter}$ = **${deg(ans)}**.`,
      ]
        .filter(Boolean)
        .join('\n\n'),
    };
  },
};

// ---------------------------------------------------------------- 5. vertically opposite angles

const NAMES4 = ['A', 'B', 'C', 'D'];

export const verticallyOpposite: QuestionTemplate = {
  id: 'm6.mea.angles.vertically-opposite',
  topicId: 'm6.mea.angles',
  title: 'Vertically opposite angles (and angle notation)',
  difficulties: [2, 3, 4, 5],
  generate({ rng, difficulty }) {
    const start = rng.int(0, 17) * 10;
    if (difficulty <= 4) {
      let g = rng.int(25, 155);
      if (g === 90) g = 72;
      const actual = [g, 180 - g, g, 180 - g];
      const t = drawnSizes(rng, [g, 180 - g], 180, 30)[0]!;
      const dirs = [start, start + t, start + 180, start + 180 + t];
      const angleName = (i: number) => `${NAMES4[i]}E${NAMES4[(i + 1) % 4]}`;
      const givenIdx = rng.int(0, 3);
      const names = dirs.map((d, i) => ({ dir: d, name: NAMES4[i]! }));
      const intro = 'Lines AC and BD are straight lines that cross at E.';
      const drawnSweep = (i: number) => (i % 2 === 0 ? t : 180 - t);
      // Label the crossing point E inside one of the wider (drawn) angles, clear of the arms.
      const wide = t >= 90 ? 0 : 1;
      const centre = { dir: dirs[wide]! + drawnSweep(wide) / 2, name: 'E' };

      if (difficulty === 4) {
        const others = [1, 2, 3].map((k) => (givenIdx + k) % 4);
        const marks: Mark[] = [{ from: dirs[givenIdx]!, sweep: drawnSweep(givenIdx), text: deg(actual[givenIdx]!) }];
        return {
          type: 'cloze',
          prompt: `${intro} $\\angle ${angleName(givenIdx)} = ${actual[givenIdx]}°$. Find the other three angles.\n\n$\\angle ${angleName(others[0]!)}$ = [[a]]°\n\n$\\angle ${angleName(others[1]!)}$ = [[b]]°\n\n$\\angle ${angleName(others[2]!)}$ = [[c]]°`,
          figure: {
            svg: raysSvg(dirs, marks, { names, centre }),
            alt: `Two straight lines AC and BD crossing at E, with angle ${angleName(givenIdx)} marked as ${actual[givenIdx]}°`,
          },
          blanks: others.map((i, k) => ({ id: 'abc'[k]!, accepted: [String(actual[i]), `${actual[i]}°`] })),
          marks: 2,
          calculator: 'not-allowed',
          hints: [
            'Vertically opposite angles are equal.',
            'Angles next to each other on a straight line add up to 180°.',
          ],
          solution: [
            `$\\angle ${angleName(others[1]!)}$ is vertically opposite $\\angle ${angleName(givenIdx)}$, so it is also **${deg(actual[givenIdx]!)}**.`,
            `$\\angle ${angleName(others[0]!)}$ sits next to $\\angle ${angleName(givenIdx)}$ on a straight line: $180 - ${actual[givenIdx]} = ${actual[others[0]!]}$, so it is **${deg(actual[others[0]!]!)}**.`,
            `$\\angle ${angleName(others[2]!)}$ is vertically opposite that one, so it is also **${deg(actual[others[2]!]!)}**.`,
            `Check: $${actual.join(' + ')} = 360$ ✓`,
          ].join('\n\n'),
        };
      }

      const askIdx = difficulty === 2 ? (givenIdx + 2) % 4 : (givenIdx + rng.pick([1, 3])) % 4;
      const ans = actual[askIdx]!;
      const marks: Mark[] = [
        { from: dirs[givenIdx]!, sweep: drawnSweep(givenIdx), text: deg(actual[givenIdx]!) },
        { from: dirs[askIdx]!, sweep: drawnSweep(askIdx), text: '?' },
      ];
      return {
        type: 'numeric',
        prompt: `${intro} $\\angle ${angleName(givenIdx)} = ${actual[givenIdx]}°$. What is the size of $\\angle ${angleName(askIdx)}$?`,
        figure: {
          svg: raysSvg(dirs, marks, { names, centre }),
          alt: `Two straight lines AC and BD crossing at E. Angle ${angleName(givenIdx)} is ${actual[givenIdx]}° and angle ${angleName(askIdx)} is marked with a question mark`,
        },
        answer: ans,
        units: '°',
        form: 'integer',
        calculator: 'not-allowed',
        hints: [
          `$\\angle ${angleName(askIdx)}$ means the angle at E between the arms going to ${angleName(askIdx)[0]} and ${angleName(askIdx)[2]}.`,
          difficulty === 2
            ? 'Are the two angles opposite each other, or next to each other?'
            : 'The two angles sit next to each other on a straight line.',
        ],
        solution:
          difficulty === 2
            ? `$\\angle ${angleName(askIdx)}$ is vertically opposite $\\angle ${angleName(givenIdx)}$. Vertically opposite angles are equal, so $\\angle ${angleName(askIdx)}$ = **${deg(ans)}**.`
            : `$\\angle ${angleName(givenIdx)}$ and $\\angle ${angleName(askIdx)}$ are next to each other on a straight line, so they add to 180°.\n\n$180 - ${actual[givenIdx]} = ${ans}$\n\nSo $\\angle ${angleName(askIdx)}$ = **${deg(ans)}**.`,
      };
    }

    // difficulty 5: three lines through one point
    let p = 0;
    let q = 0;
    let r = 0;
    do {
      p = rng.int(30, 100);
      q = rng.int(30, 100);
      r = 180 - p - q;
    } while (r < 30 || p === 90 || q === 90 || r === 90);
    const [dp, dq, dr] = drawnSizes(rng, [p, q, r], 180, 28);
    const u = [start, start + dp!, start + dp! + dq!];
    const dirs = [...u, ...u.map((d) => d + 180)];
    const marks: Mark[] = [
      { from: u[0]!, sweep: dp!, text: deg(p) },
      { from: u[1]!, sweep: dq!, text: deg(q) },
      { from: u[2]! + 180, sweep: dr!, text: 'x' },
    ];
    return {
      type: 'numeric',
      prompt: 'Three straight lines cross at one point. Find the size of angle $x$.',
      figure: { svg: raysSvg(dirs, marks), alt: `Three straight lines crossing at a point, with angles of ${p}° and ${q}° marked next to each other and angle x marked on the far side` },
      answer: r,
      units: '°',
      form: 'integer',
      marks: 2,
      calculator: 'not-allowed',
      hints: [
        'Look for the angle that is vertically opposite $x$. It is equal to $x$.',
        `That angle sits on a straight line with the ${deg(p)} and ${deg(q)} angles.`,
      ],
      solution: [
        `The angle vertically opposite $x$ sits next to the ${deg(p)} and ${deg(q)} angles, and the three of them make a straight line.`,
        `So that angle is $180 - ${p} - ${q} = ${r}$.`,
        `Vertically opposite angles are equal, so $x$ = **${deg(r)}**.`,
      ].join('\n\n'),
    };
  },
};

export const templates: QuestionTemplate[] = [classify, protractor, straightLine, atAPoint, verticallyOpposite];
