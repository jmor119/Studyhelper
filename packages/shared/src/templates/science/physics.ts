import type { Rng } from '../../rng';
import { clean, NAMES, num, tex } from '../format';
import { ACCENT, INK, label, line, polygon, svgDoc, type Pt } from '../svg';
import type { QuestionTemplate } from '../types';

// Calculation templates for physics topics (Year 9).
// Every template chooses the answer first and builds the question from it, so answers are exact.
// On Earth g = 10 N/kg (NZ Year 9 convention), and questions say so.

// ---------------------------------------------------------------- helpers

/** A value from min to max (inclusive) in steps of `step`. */
function stepped(rng: Rng, min: number, max: number, step = 1): number {
  return clean(min + step * rng.int(0, Math.round((max - min) / step)));
}

/** Picks values until `ok` passes (deterministic for a seed). Falls back to the last pick. */
function pickUntil<T>(make: () => T, ok: (v: T) => boolean, tries = 60): T {
  let v = make();
  for (let i = 0; i < tries && !ok(v); i++) v = make();
  return v;
}

/** True when x has at most `dp` decimal places. */
function hasDp(x: number, dp: number): boolean {
  return Math.abs(clean(x * 10 ** dp) - Math.round(x * 10 ** dp)) < 1e-9;
}

/** Arrow from `from` to `to` with a filled head. */
function arrow(from: Pt, to: Pt, colour = ACCENT): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const head = 12;
  const half = 6;
  const base = { x: to.x - ux * head, y: to.y - uy * head };
  const p1 = { x: base.x - uy * half, y: base.y + ux * half };
  const p2 = { x: base.x + uy * half, y: base.y - ux * half };
  return line(from, base, { stroke: colour, width: 3 }) + polygon([to, p1, p2], { fill: colour, stroke: colour });
}

type Dir = 'right' | 'left' | 'up' | 'down';
interface ForceArrow {
  dir: Dir;
  text: string;
  /** 'pull' (default) starts at the box edge; 'push' ends at the box edge (used for a 2nd force in the same direction). */
  style?: 'pull' | 'push';
}

/** Free-body diagram: a box with labelled force arrows. All arrows are the same length (not to scale). */
function freeBody(forces: ForceArrow[], boxText = ''): string {
  const W = 340;
  const hasVertical = forces.some((f) => f.dir === 'up' || f.dir === 'down');
  const H = hasVertical ? 270 : 150;
  const c = { x: W / 2, y: H / 2 };
  const bw = 80;
  const bh = 54;
  const L = hasVertical ? 76 : 90;
  const VL = 62;
  let body = polygon(
    [
      { x: c.x - bw / 2, y: c.y - bh / 2 },
      { x: c.x + bw / 2, y: c.y - bh / 2 },
      { x: c.x + bw / 2, y: c.y + bh / 2 },
      { x: c.x - bw / 2, y: c.y + bh / 2 },
    ],
    { fill: '#f3f4f6', stroke: INK },
  );
  if (boxText) body += label(c, boxText, { size: 13 });
  for (const f of forces) {
    const push = f.style === 'push';
    if (f.dir === 'right' || f.dir === 'left') {
      const s = f.dir === 'right' ? 1 : -1;
      // pull: from the edge on the side it points to; push: ends at the opposite edge.
      const edge = push ? c.x - (s * bw) / 2 : c.x + (s * bw) / 2;
      const from = push ? { x: edge - s * L, y: c.y } : { x: edge, y: c.y };
      const to = push ? { x: edge, y: c.y } : { x: edge + s * L, y: c.y };
      body += arrow(from, to);
      // "name|value" puts the name above the arrow and the value below it.
      const [top, bottom] = f.text.split('|');
      const mid = (from.x + to.x) / 2;
      body += label({ x: mid, y: c.y - 16 }, top ?? '', { size: 12 });
      if (bottom) body += label({ x: mid, y: c.y + 18 }, bottom, { size: 12 });
    } else {
      const s = f.dir === 'down' ? 1 : -1;
      const edge = c.y + (s * bh) / 2;
      const from = { x: c.x, y: edge };
      const to = { x: c.x, y: edge + s * VL };
      body += arrow(from, to);
      body += label({ x: c.x + 10, y: (from.y + to.y) / 2 }, f.text.replace('|', ' '), { size: 12, anchor: 'start' });
    }
  }
  return svgDoc(W, H, body);
}

const nameOf = (rng: Rng) => rng.pick(NAMES);

// ---------------------------------------------------------------- s9.phy.motion

interface Mover {
  start: string;
  ref: string;
  verb3: string;
  verb: string;
  v: [number, number];
  t: [number, number];
}

function moverFor(rng: Rng): Mover {
  const n = nameOf(rng);
  return rng.pick<Mover>([
    { start: n, ref: n, verb3: 'runs', verb: 'run', v: [3, 8], t: [10, 150] },
    { start: n, ref: n, verb3: 'cycles', verb: 'cycle', v: [4, 12], t: [20, 300] },
    { start: n, ref: n, verb3: 'walks', verb: 'walk', v: [1, 2], t: [30, 600] },
    { start: n, ref: n, verb3: 'swims', verb: 'swim', v: [1, 2], t: [20, 200] },
    { start: n, ref: n, verb3: 'skateboards', verb: 'skateboard', v: [3, 7], t: [10, 60] },
    { start: 'A remote-control car', ref: 'the remote-control car', verb3: 'travels', verb: 'travel', v: [2, 9], t: [5, 40] },
    { start: 'A train', ref: 'the train', verb3: 'travels', verb: 'travel', v: [15, 35], t: [20, 200] },
  ]);
}

const possessive = (s: string) => `${s}'s`;

export const speed: QuestionTemplate = {
  id: 's9.phy.motion.speed',
  topicId: 's9.phy.motion',
  title: 'Speed = distance ÷ time (with rearranging and unit changes)',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    if (difficulty === 1 || difficulty === 2) {
      const m = moverFor(rng);
      const v = rng.int(m.v[0], m.v[1]);
      const t = rng.int(m.t[0], m.t[1]);
      const d = v * t;
      if (difficulty === 1) {
        return {
          type: 'numeric',
          prompt: `${m.start} ${m.verb3} ${num(d)} m in ${t} s. What is ${possessive(m.ref)} average speed?`,
          answer: v,
          units: 'm/s',
          calculator: 'allowed',
          hints: ['Average speed = total distance ÷ total time.'],
          solution: `$v = \\dfrac{d}{t} = \\dfrac{${tex(d)}}{${tex(t)}} = ${tex(v)}$ m/s`,
        };
      }
      if (rng.chance(0.5)) {
        return {
          type: 'numeric',
          prompt: `${m.start} ${m.verb3} at an average speed of ${v} m/s for ${t} s. How far does ${m.ref} ${m.verb}?`,
          answer: d,
          units: 'm',
          calculator: 'allowed',
          hints: ['Rearrange speed = distance ÷ time to make distance the subject.', 'Distance = speed × time.'],
          solution: `$d = v \\times t = ${tex(v)} \\times ${tex(t)} = ${tex(d)}$ m`,
        };
      }
      return {
        type: 'numeric',
        prompt: `How long does it take ${m.ref} to ${m.verb} ${num(d)} m at an average speed of ${v} m/s?`,
        answer: t,
        units: 's',
        calculator: 'allowed',
        hints: ['Rearrange speed = distance ÷ time to make time the subject.', 'Time = distance ÷ speed.'],
        solution: `$t = \\dfrac{d}{v} = \\dfrac{${tex(d)}}{${tex(v)}} = ${tex(t)}$ s`,
      };
    }

    // difficulty 3: unit changes
    const kind = rng.pick(['km-min', 'm-min', 'km-h-to-ms'] as const);
    if (kind === 'km-min') {
      const veh = rng.pick([
        { start: 'A bus', ref: 'the bus', v: [30, 90] },
        { start: 'A car', ref: 'the car', v: [40, 110] },
        { start: 'A train', ref: 'the train', v: [40, 100] },
        { start: 'A ferry', ref: 'the ferry', v: [20, 45] },
      ] as const);
      const mins = rng.pick([5, 6, 10, 12, 15, 20, 30]);
      const k = 60 / mins;
      const v = k * rng.int(Math.ceil(veh.v[0] / k), Math.floor(veh.v[1] / k));
      const d = v / k;
      return {
        type: 'numeric',
        prompt: `${veh.start} travels ${num(d)} km in ${mins} minutes. What is its average speed in km/h?`,
        answer: v,
        units: 'km/h',
        calculator: 'allowed',
        hints: [
          'The speed must be in km/h, so the time must be in hours.',
          `There are 60 minutes in an hour, so ${mins} minutes is $\\frac{${mins}}{60}$ of an hour.`,
        ],
        solution: [
          `Change the time to hours: $t = ${mins} \\text{ min} = \\dfrac{${mins}}{60} \\text{ h}$.`,
          `$v = \\dfrac{d}{t} = ${tex(d)} \\div \\dfrac{${mins}}{60} = ${tex(d)} \\times \\dfrac{60}{${mins}} = ${tex(d)} \\times ${k} = ${tex(v)}$ km/h`,
          `(Another way: ${mins} minutes goes into an hour ${k} times, so in one hour ${veh.ref} would go $${k} \\times ${tex(d)} = ${tex(v)}$ km.)`,
        ].join('\n\n'),
      };
    }
    if (kind === 'm-min') {
      const n = nameOf(rng);
      const act = rng.pick([
        { verb3: 'walks', vs: [1, 1.2, 1.5, 2] },
        { verb3: 'runs', vs: [2.5, 3, 4, 5] },
        { verb3: 'cycles', vs: [4, 5, 6, 7.5] },
      ] as const);
      const v = rng.pick(act.vs);
      const mins = rng.int(2, 30);
      const t = mins * 60;
      const d = clean(v * t);
      return {
        type: 'numeric',
        prompt: `${n} ${act.verb3} ${num(d)} m in ${mins} minutes. What is ${possessive(n)} average speed in m/s?`,
        answer: v,
        units: 'm/s',
        calculator: 'allowed',
        hints: ['For m/s, the time must be in seconds.', 'Multiply the minutes by 60 to get seconds.'],
        solution: [
          `Change the time to seconds: $${mins} \\times 60 = ${tex(t)}$ s.`,
          `$v = \\dfrac{d}{t} = \\dfrac{${tex(d)}}{${tex(t)}} = ${tex(v)}$ m/s`,
        ].join('\n\n'),
      };
    }
    // km and hours → m/s
    const veh = rng.pick([
      { start: 'A car', vs: [15, 20, 25, 30] },
      { start: 'A train', vs: [20, 25, 30, 35, 40] },
      { start: 'A bus', vs: [10, 15, 20, 25] },
    ] as const);
    const v = rng.pick(veh.vs);
    const h = rng.int(1, 4);
    const kmh = clean(v * 3.6);
    const dKm = clean(kmh * h);
    const dM = dKm * 1000;
    const tS = h * 3600;
    return {
      type: 'numeric',
      prompt: `${veh.start} travels ${num(dKm)} km in ${h} hour${h === 1 ? '' : 's'}. What is its average speed in **m/s**?`,
      answer: v,
      units: 'm/s',
      calculator: 'allowed',
      hints: [
        'Change the distance to metres and the time to seconds first.',
        '1 km = 1,000 m and 1 hour = 3,600 s.',
      ],
      solution: [
        `Distance: $${tex(dKm)} \\text{ km} = ${tex(dKm)} \\times 1000 = ${tex(dM)}$ m`,
        `Time: $${h} \\text{ h} = ${h} \\times 3600 = ${tex(tS)}$ s`,
        `$v = \\dfrac{d}{t} = \\dfrac{${tex(dM)}}{${tex(tS)}} = ${tex(v)}$ m/s`,
        `(Shortcut: the speed is $${tex(dKm)} \\div ${h} = ${tex(kmh)}$ km/h, and $${tex(kmh)} \\div 3.6 = ${tex(v)}$ m/s.)`,
      ].join('\n\n'),
    };
  },
};

const SPEED_THINGS = [
  { name: 'A cyclist', ms: [4, 12] },
  { name: 'A runner', ms: [3, 9] },
  { name: 'A car', ms: [10, 33] },
  { name: 'A train', ms: [15, 40] },
  { name: 'A ferry', ms: [5, 12] },
  { name: 'The wind', ms: [2, 30] },
] as const;

export const unitConversion: QuestionTemplate = {
  id: 's9.phy.motion.unit-conversion',
  topicId: 's9.phy.motion',
  title: 'Converting between km/h and m/s',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    if (difficulty === 2) {
      const thing = rng.pick(SPEED_THINGS);
      const moving = thing.name === 'The wind' ? 'is blowing' : 'is travelling';
      if (rng.chance(0.5)) {
        // m/s → km/h
        const v = rng.int(thing.ms[0], thing.ms[1]);
        const kmh = clean(v * 3.6);
        return {
          type: 'numeric',
          prompt: `${thing.name} ${moving} at ${v} m/s. What is this speed in km/h?`,
          answer: kmh,
          units: 'km/h',
          calculator: 'allowed',
          hints: [
            'In one hour there are 3,600 seconds, and 1 km = 1,000 m.',
            'To change m/s into km/h, multiply by 3.6.',
          ],
          solution: [
            `In 1 hour (3,600 s) it would go $${v} \\times 3600 = ${tex(v * 3600)}$ m $= ${tex(kmh)}$ km.`,
            `So $${v} \\text{ m/s} = ${v} \\times 3.6 = ${tex(kmh)}$ km/h.`,
          ].join('\n\n'),
        };
      }
      // km/h → m/s with an exact answer (multiples of 9 km/h)
      const j = rng.int(Math.max(1, Math.ceil(thing.ms[0] / 2.5)), Math.floor(thing.ms[1] / 2.5));
      const v = clean(2.5 * j);
      const kmh = clean(v * 3.6);
      return {
        type: 'numeric',
        prompt: `${thing.name} ${moving} at ${num(kmh)} km/h. What is this speed in m/s?`,
        answer: v,
        units: 'm/s',
        calculator: 'allowed',
        hints: ['1 km = 1,000 m and 1 hour = 3,600 s.', 'To change km/h into m/s, divide by 3.6.'],
        solution: [
          `$${tex(kmh)}$ km/h means $${tex(kmh * 1000)}$ m in 3,600 s.`,
          `$\\dfrac{${tex(kmh * 1000)}}{3600} = ${tex(v)}$ m/s, which is the same as $${tex(kmh)} \\div 3.6 = ${tex(v)}$ m/s.`,
        ].join('\n\n'),
      };
    }

    if (difficulty === 3) {
      if (rng.chance(0.35)) {
        // Which is faster?
        const n = nameOf(rng);
        const a = { who: `${n} on an e-bike`, ms: rng.int(4, 9) };
        let kmh = rng.int(10, 40);
        if (Math.abs(kmh / 3.6 - a.ms) < 0.6) kmh += 5;
        const bMs = kmh / 3.6;
        const opts = [
          { id: 'a', text: `${n} on the e-bike` },
          { id: 'b', text: 'The scooter' },
          { id: 'c', text: 'They are travelling at the same speed' },
        ];
        const correct = a.ms > bMs ? 'a' : 'b';
        return {
          type: 'mcq',
          prompt: `${a.who} is travelling at ${a.ms} m/s. A scooter is travelling at ${kmh} km/h. Which is faster?`,
          options: opts,
          correct,
          shuffle: false,
          calculator: 'allowed',
          feedback: {
            ...(correct === 'a' ? { b: 'The bigger number is not always faster. Change both speeds to the same unit first.' } : {}),
            ...(correct === 'b' ? { a: 'The units are different. Change both speeds to the same unit before comparing.' } : {}),
            c: 'Change both speeds into the same unit and compare them.',
          },
          hints: ['You can only compare speeds when they are in the same unit.', 'To change km/h into m/s, divide by 3.6.'],
          solution: [
            `Change the scooter's speed to m/s: $${kmh} \\div 3.6 ${hasDp(bMs, 1) ? '=' : '\\approx'} ${tex(Math.round(bMs * 10) / 10)}$ m/s.`,
            `${a.ms} m/s ${a.ms > bMs ? '>' : '<'} ${num(Math.round(bMs * 10) / 10)} m/s, so **${correct === 'a' ? `${n} on the e-bike` : 'the scooter'}** is faster.`,
          ].join('\n\n'),
        };
      }
      const kmh = rng.pick([15, 20, 25, 30, 35, 40, 50, 55, 60, 65, 70, 75, 80, 85, 95, 100, 105, 110, 115, 120]);
      const veh = rng.pick(
        kmh <= 30
          ? ['A cyclist', 'An e-scooter', 'A horse']
          : kmh <= 60
            ? ['A car', 'A bus', 'A motorbike', 'A truck']
            : ['A car', 'A bus', 'A truck', 'A motorbike', 'A campervan', 'A train'],
      );
      const exact = kmh / 3.6;
      const ans = Math.round(exact * 10) / 10;
      return {
        type: 'numeric',
        prompt: `${veh} is travelling at ${kmh} km/h. What is this speed in m/s? Give your answer to 1 decimal place.`,
        answer: ans,
        decimals: 1,
        units: 'm/s',
        calculator: 'allowed',
        hints: ['1 km = 1,000 m and 1 hour = 3,600 s.', 'To change km/h into m/s, divide by 3.6.'],
        solution: [
          `$${kmh} \\text{ km/h} = \\dfrac{${tex(kmh * 1000)} \\text{ m}}{3600 \\text{ s}} = ${kmh} \\div 3.6 = ${tex(Math.round(exact * 1000) / 1000)}\\ldots$`,
          `To 1 decimal place this is **${num(ans, 1)} m/s**.`,
        ].join('\n\n'),
      };
    }

    // difficulty 4: mixed units in a two-step problem
    if (rng.chance(0.5)) {
      // reaction distance
      const v = rng.pick([10, 12.5, 15, 17.5, 20, 22.5, 25, 27.5, 30]);
      const kmh = clean(v * 3.6);
      const rt = rng.pick([0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.2, 1.5, 2]);
      const d = clean(v * rt);
      return {
        type: 'numeric',
        prompt: `A car is travelling at ${kmh} km/h when the driver sees a hazard. The driver takes ${num(rt)} s to react before braking. How far does the car travel during the reaction time?`,
        answer: d,
        units: 'm',
        calculator: 'allowed',
        hints: ['Change the speed into m/s first (divide by 3.6).', 'Then use distance = speed × time.'],
        solution: [
          `Speed in m/s: $${kmh} \\div 3.6 = ${tex(v)}$ m/s`,
          `Distance: $d = v \\times t = ${tex(v)} \\times ${tex(rt)} = ${tex(d)}$ m`,
          'The car travels this far before the brakes even go on, which is why speed and distraction matter so much on the road.',
        ].join('\n\n'),
      };
    }
    const v = rng.pick([5, 10, 15, 20, 25]);
    const kmh = clean(v * 3.6);
    const t = rng.int(4, 60);
    const d = v * t;
    const veh = rng.pick(['A bus', 'A train', 'A car']);
    return {
      type: 'numeric',
      prompt: `${veh} travels at a steady ${kmh} km/h. How many seconds does it take to travel ${num(d)} m?`,
      answer: t,
      units: 's',
      calculator: 'allowed',
      hints: ['The distance is in metres and you want seconds, so change the speed into m/s.', 'Then use time = distance ÷ speed.'],
      solution: [
        `Speed in m/s: $${kmh} \\div 3.6 = ${tex(v)}$ m/s`,
        `Time: $t = \\dfrac{d}{v} = \\dfrac{${tex(d)}}{${tex(v)}} = ${tex(t)}$ s`,
      ].join('\n\n'),
    };
  },
};

export const acceleration: QuestionTemplate = {
  id: 's9.phy.motion.acceleration',
  topicId: 's9.phy.motion',
  title: 'Acceleration = change in velocity ÷ time',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    if (difficulty === 2) {
      const obj = rng.pick([
        { name: 'A car', as: [2, 3, 4], vmax: 30 },
        { name: 'A motorbike', as: [3, 4, 5, 6], vmax: 36 },
        { name: 'A cyclist', as: [1, 2], vmax: 12 },
        { name: 'A sprinter', as: [2, 3, 4, 5], vmax: 10 },
        { name: 'An electric scooter', as: [1, 2], vmax: 8 },
        { name: 'A train', as: [1], vmax: 30 },
      ] as const);
      const a = rng.pick(obj.as);
      const t = rng.int(2, Math.max(2, Math.floor(obj.vmax / a)));
      const v = a * t;
      return {
        type: 'numeric',
        prompt: `${obj.name} speeds up from rest to ${v} m/s in ${t} s. What is the acceleration?`,
        answer: a,
        units: 'm/s²',
        calculator: 'allowed',
        hints: [
          'Acceleration = change in velocity ÷ time taken.',
          '"From rest" means the starting velocity is 0 m/s.',
        ],
        solution: [
          `Change in velocity: $\\Delta v = ${v} - 0 = ${v}$ m/s`,
          `$a = \\dfrac{\\Delta v}{t} = \\dfrac{${v}}{${t}} = ${tex(a)}$ m/s²`,
          `The ${obj.name.replace(/^An? /, '').toLowerCase()} gains ${tex(a)} m/s of velocity every second.`,
        ].join('\n\n'),
      };
    }

    if (difficulty === 3) {
      const obj = rng.pick([
        { name: 'A cyclist', as: [0.5, 1, 1.5], u: [2, 6], vmax: 16 },
        { name: 'A car', as: [1, 1.5, 2, 2.5, 3], u: [5, 20], vmax: 33 },
        { name: 'A train', as: [0.5, 1], u: [5, 20], vmax: 35 },
        { name: 'A jet boat', as: [1, 1.5, 2, 2.5, 3, 4], u: [2, 12], vmax: 30 },
      ] as const);
      const { a, u, t } = pickUntil(
        () => ({ a: rng.pick(obj.as), u: rng.int(obj.u[0], obj.u[1]), t: rng.int(2, 12) }),
        (p) => p.u + p.a * p.t <= obj.vmax,
      );
      const v = clean(u + a * t);
      const dv = clean(v - u);
      if (rng.chance(0.3)) {
        return {
          type: 'numeric',
          prompt: `${obj.name} accelerates at ${num(a)} m/s² from ${u} m/s to ${num(v)} m/s. How long does this take?`,
          answer: t,
          units: 's',
          calculator: 'allowed',
          hints: ['First find the change in velocity.', 'Rearrange $a = \\dfrac{\\Delta v}{t}$ to get $t = \\dfrac{\\Delta v}{a}$.'],
          solution: [
            `Change in velocity: $\\Delta v = ${tex(v)} - ${u} = ${tex(dv)}$ m/s`,
            `$t = \\dfrac{\\Delta v}{a} = \\dfrac{${tex(dv)}}{${tex(a)}} = ${t}$ s`,
          ].join('\n\n'),
        };
      }
      return {
        type: 'numeric',
        prompt: `${obj.name} speeds up from ${u} m/s to ${num(v)} m/s in ${t} s. What is the acceleration?`,
        answer: a,
        units: 'm/s²',
        calculator: 'allowed',
        hints: ['Acceleration = change in velocity ÷ time taken.', 'Change in velocity = final velocity − starting velocity.'],
        solution: [
          `Change in velocity: $\\Delta v = ${tex(v)} - ${u} = ${tex(dv)}$ m/s`,
          `$a = \\dfrac{\\Delta v}{t} = \\dfrac{${tex(dv)}}{${t}} = ${tex(a)}$ m/s²`,
        ].join('\n\n'),
      };
    }

    // difficulty 4
    const kind = rng.pick(['kmh', 'decel', 'final'] as const);
    if (kind === 'kmh') {
      const { v, t } = pickUntil(
        () => ({ v: rng.pick([10, 15, 20, 25, 30]), t: rng.int(3, 15) }),
        (p) => hasDp(p.v / p.t, 2) && p.v / p.t <= 5 && p.v / p.t >= 1,
      );
      const a = clean(v / t);
      const kmh = clean(v * 3.6);
      const veh = rng.pick(['A car', 'An electric car', 'A motorbike', 'A ute']);
      return {
        type: 'numeric',
        prompt: `${veh} goes from 0 to ${kmh} km/h in ${t} s. What is its average acceleration in m/s²?`,
        answer: a,
        units: 'm/s²',
        calculator: 'allowed',
        hints: ['Acceleration in m/s² needs the velocity in m/s, not km/h.', 'Divide by 3.6 to change km/h into m/s.'],
        solution: [
          `Final velocity in m/s: $${kmh} \\div 3.6 = ${v}$ m/s`,
          `$a = \\dfrac{\\Delta v}{t} = \\dfrac{${v} - 0}{${t}} = ${tex(a)}$ m/s²`,
        ].join('\n\n'),
      };
    }
    if (kind === 'decel') {
      const { u, a, t } = pickUntil(
        () => ({ u: rng.int(10, 30), a: rng.pick([1, 1.5, 2, 2.5, 3, 4, 5]), t: rng.int(2, 8) }),
        (p) => p.u - p.a * p.t >= 0 && hasDp(p.u - p.a * p.t, 1),
      );
      const v = clean(u - a * t);
      const what = rng.pick(['A car', 'A cyclist', 'A bus', 'A truck']);
      const stops = v === 0;
      return {
        type: 'numeric',
        prompt: `${what} is travelling at ${u} m/s. The brakes are applied and ${stops ? 'it comes to a stop' : `it slows to ${num(v)} m/s`} in ${t} s. What is its acceleration? (Slowing down gives a negative acceleration, so include the minus sign.)`,
        answer: -a,
        units: 'm/s²',
        calculator: 'allowed',
        hints: ['Change in velocity = final velocity − starting velocity. Here the final velocity is smaller.', 'Divide the change in velocity by the time.'],
        solution: [
          `Change in velocity: $\\Delta v = ${tex(v)} - ${u} = ${tex(clean(v - u))}$ m/s`,
          `$a = \\dfrac{\\Delta v}{t} = \\dfrac{${tex(clean(v - u))}}{${t}} = ${tex(-a)}$ m/s²`,
          `The minus sign shows the ${what.replace(/^An? /, '').toLowerCase()} is slowing down (decelerating) by ${tex(a)} m/s every second.`,
        ].join('\n\n'),
      };
    }
    // final velocity
    const n = nameOf(rng);
    const { u, a, t } = pickUntil(
      () => ({ u: rng.int(1, 6), a: rng.pick([0.5, 1, 1.5, 2]), t: rng.int(2, 10) }),
      (p) => p.u + p.a * p.t <= 15,
    );
    const v = clean(u + a * t);
    return {
      type: 'numeric',
      prompt: `${n} is cycling at ${u} m/s and starts to go down a hill. ${n} accelerates at ${num(a)} m/s² for ${t} s. What is ${possessive(n)} speed at the end of this time?`,
      answer: v,
      units: 'm/s',
      calculator: 'allowed',
      hints: ['An acceleration of 1 m/s² means the velocity goes up by 1 m/s every second.', 'Find the change in velocity ($a \\times t$), then add it to the starting speed.'],
      solution: [
        `Change in velocity: $\\Delta v = a \\times t = ${tex(a)} \\times ${t} = ${tex(a * t)}$ m/s`,
        `Final speed: $${u} + ${tex(a * t)} = ${tex(v)}$ m/s`,
      ].join('\n\n'),
    };
  },
};

// ---------------------------------------------------------------- s9.phy.forces

interface Massive {
  name: string;
  short: string;
  m: readonly [number, number, number];
  as: readonly number[];
  resist: readonly [number, number, number];
  forward: string;
  /** How to refer back to it, e.g. "the car". */
  ref: string;
}

const MASSIVE: readonly Massive[] = [
  { name: 'car', short: 'car', m: [800, 1800, 100], as: [1, 1.5, 2, 2.5, 3, 4], resist: [200, 1200, 100], forward: 'driving force', ref: 'the car' },
  { name: 'ute', short: 'ute', m: [1800, 2400, 100], as: [0.5, 1, 1.5, 2, 2.5, 3], resist: [200, 1200, 100], forward: 'driving force', ref: 'the ute' },
  { name: 'cyclist (including the bike)', short: 'cyclist', m: [60, 100, 5], as: [0.5, 1, 1.5, 2, 3], resist: [5, 60, 5], forward: 'driving force', ref: 'the cyclist and bike' },
  { name: 'shopping trolley', short: 'trolley', m: [10, 40, 5], as: [0.5, 1, 1.5, 2], resist: [5, 40, 5], forward: 'pushing force', ref: 'the trolley' },
  { name: 'rugby player', short: 'player', m: [80, 120, 5], as: [1, 1.5, 2, 2.5, 3, 4], resist: [5, 60, 5], forward: 'driving force', ref: 'the player' },
  { name: 'waka ama (outrigger canoe) with its crew', short: 'waka', m: [300, 600, 50], as: [0.5, 1, 1.5], resist: [50, 300, 25], forward: 'paddling force', ref: 'the waka and crew' },
];

export const forceMassAcceleration: QuestionTemplate = {
  id: 's9.phy.forces.f-ma',
  topicId: 's9.phy.forces',
  title: "Newton's second law: F = ma",
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    const obj = rng.pick(MASSIVE);
    const m = stepped(rng, obj.m[0], obj.m[1], obj.m[2]);
    const a = pickUntil(
      () => rng.pick(obj.as),
      (x) => Number.isInteger(m * x),
    );
    const F = clean(m * a);
    const thing = `A ${obj.name}`;
    if (difficulty === 2) {
      return {
        type: 'numeric',
        prompt: `${thing} with a mass of ${num(m)} kg accelerates at ${num(a)} m/s². What is the net force on ${obj.ref}?`,
        answer: F,
        units: 'N',
        calculator: 'allowed',
        hints: ["Use Newton's second law: $F = ma$.", 'Mass must be in kg and acceleration in m/s². The force comes out in newtons (N).'],
        solution: `$F = m \\times a = ${tex(m)} \\times ${tex(a)} = ${tex(F)}$ N`,
      };
    }
    if (difficulty === 3) {
      if (rng.chance(0.55)) {
        return {
          type: 'numeric',
          prompt: `A net force of ${num(F)} N acts on ${thing.replace(/^A /, 'a ')} with a mass of ${num(m)} kg. What is the acceleration of ${obj.ref}?`,
          answer: a,
          units: 'm/s²',
          calculator: 'allowed',
          hints: ['Start from $F = ma$.', 'Rearrange to make $a$ the subject: $a = \\dfrac{F}{m}$.'],
          solution: `$a = \\dfrac{F}{m} = \\dfrac{${tex(F)}}{${tex(m)}} = ${tex(a)}$ m/s²`,
        };
      }
      return {
        type: 'numeric',
        prompt: `A net force of ${num(F)} N gives ${thing.replace(/^A /, 'a ')} an acceleration of ${num(a)} m/s². What is the mass of ${obj.ref}?`,
        answer: m,
        units: 'kg',
        calculator: 'allowed',
        hints: ['Start from $F = ma$.', 'Rearrange to make $m$ the subject: $m = \\dfrac{F}{a}$.'],
        solution: `$m = \\dfrac{F}{a} = \\dfrac{${tex(F)}}{${tex(a)}} = ${tex(m)}$ kg`,
      };
    }
    // difficulty 4: find the net force from two opposing forces first
    const R = stepped(rng, obj.resist[0], obj.resist[1], obj.resist[2]);
    const D = clean(F + R);
    const forward = obj.forward;
    const fig = freeBody(
      [
        { dir: 'right', text: `${num(D)} N` },
        { dir: 'left', text: `${num(R)} N` },
      ],
      obj.short,
    );
    if (rng.chance(0.6)) {
      return {
        type: 'numeric',
        prompt: `${thing} of mass ${num(m)} kg has a forward ${forward} of ${num(D)} N. Friction and air resistance together push backwards with ${num(R)} N. What is the acceleration of ${obj.ref}?`,
        figure: { svg: fig, alt: `Force diagram: ${num(D)} N forwards (to the right) and ${num(R)} N backwards (to the left).` },
        answer: a,
        units: 'm/s²',
        calculator: 'allowed',
        hints: ['First find the net (unbalanced) force: the forces act in opposite directions.', 'Then use $a = \\dfrac{F_{net}}{m}$.'],
        solution: [
          `Net force: $F_{net} = ${tex(D)} - ${tex(R)} = ${tex(F)}$ N forwards`,
          `$a = \\dfrac{F_{net}}{m} = \\dfrac{${tex(F)}}{${tex(m)}} = ${tex(a)}$ m/s²`,
        ].join('\n\n'),
      };
    }
    return {
      type: 'numeric',
      prompt: `${thing} has a mass of ${num(m)} kg. Friction and air resistance push backwards with a total of ${num(R)} N. What forward ${forward} is needed to give ${obj.ref} an acceleration of ${num(a)} m/s²?`,
      answer: D,
      units: 'N',
      calculator: 'allowed',
      hints: ['Use $F = ma$ to find the net force needed.', 'The forward force has to provide that net force **and** cancel out the resistance.'],
      solution: [
        `Net force needed: $F_{net} = m \\times a = ${tex(m)} \\times ${tex(a)} = ${tex(F)}$ N`,
        `Forward force = net force + resistance $= ${tex(F)} + ${tex(R)} = ${tex(D)}$ N`,
      ].join('\n\n'),
    };
  },
};

const WEIGHABLE = [
  { name: 'school bag', m: [3, 9] },
  { name: 'Year 9 student', m: [40, 70] },
  { name: 'bicycle', m: [8, 16] },
  { name: 'bag of potatoes', m: [2, 10] },
  { name: 'dog', m: [5, 40] },
  { name: 'sheep', m: [40, 90] },
  { name: 'tramping pack', m: [8, 20] },
] as const;

const PLANETS = [
  { name: 'the Moon', g: 1.6 },
  { name: 'Mars', g: 3.7 },
  { name: 'Venus', g: 8.9 },
] as const;

export const weight: QuestionTemplate = {
  id: 's9.phy.forces.weight',
  topicId: 's9.phy.forces',
  title: 'Weight = mass × g',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      const it = rng.pick(WEIGHABLE);
      const m = rng.int(it.m[0], it.m[1]);
      const W = m * 10;
      return {
        type: 'numeric',
        prompt: `A ${it.name} has a mass of ${m} kg. What is the weight of the ${it.name} on Earth? Use $g = 10$ N/kg.`,
        answer: W,
        units: 'N',
        calculator: 'allowed',
        hints: ['Weight = mass × gravitational field strength ($W = mg$).'],
        solution: `$W = m \\times g = ${m} \\times 10 = ${tex(W)}$ N`,
      };
    }
    if (difficulty === 2) {
      if (rng.chance(0.5)) {
        const it = rng.pick(WEIGHABLE);
        const m = rng.int(it.m[0], it.m[1]);
        const W = m * 10;
        return {
          type: 'numeric',
          prompt: `A ${it.name} weighs ${num(W)} N on Earth. What is the mass of the ${it.name}? Use $g = 10$ N/kg.`,
          answer: m,
          units: 'kg',
          calculator: 'allowed',
          hints: ['Start from $W = mg$.', 'Rearrange to make mass the subject: $m = \\dfrac{W}{g}$.'],
          solution: `$m = \\dfrac{W}{g} = \\dfrac{${tex(W)}}{10} = ${m}$ kg`,
        };
      }
      const item = rng.pick([
        { name: 'An apple', g: [100, 250, 10] },
        { name: 'A netball', g: [400, 450, 10] },
        { name: 'A phone', g: [150, 250, 10] },
        { name: 'A block of butter', g: [250, 500, 250] },
        { name: 'A bag of flour', g: [500, 1500, 500] },
        { name: 'A cricket ball', g: [156, 163, 1] },
        { name: 'A kiwi (the bird)', g: [1500, 3000, 100] },
      ] as const);
      const grams = stepped(rng, item.g[0], item.g[1], item.g[2]);
      const kg = clean(grams / 1000);
      const W = clean(kg * 10);
      return {
        type: 'numeric',
        prompt: `${item.name} has a mass of ${num(grams)} g. What is its weight on Earth? Use $g = 10$ N/kg.`,
        answer: W,
        units: 'N',
        calculator: 'allowed',
        hints: ['$g = 10$ N/kg means 10 N for every **kilogram**, so change the mass into kg first.', '1 kg = 1,000 g.'],
        solution: [
          `Mass in kg: $${tex(grams)} \\div 1000 = ${tex(kg)}$ kg`,
          `$W = m \\times g = ${tex(kg)} \\times 10 = ${tex(W)}$ N`,
        ].join('\n\n'),
      };
    }
    // difficulty 3: other worlds
    const p = rng.pick(PLANETS);
    if (rng.chance(0.5)) {
      const who = rng.pick([
        { start: 'An astronaut in a spacesuit', ref: 'the astronaut' },
        { start: 'A rover', ref: 'the rover' },
        { start: 'A science probe', ref: 'the probe' },
        { start: 'A robot explorer', ref: 'the robot' },
      ]);
      const m = rng.pick([60, 75, 80, 90, 100, 110, 120, 150, 180, 200, 250]);
      const W = clean(m * p.g);
      return {
        type: 'numeric',
        prompt: `${who.start} has a mass of ${m} kg. On ${p.name}, the gravitational field strength is ${num(p.g)} N/kg. What is the weight of ${who.ref} on ${p.name}?`,
        answer: W,
        units: 'N',
        calculator: 'allowed',
        hints: ['Mass does not change from place to place, but weight does.', `Use $W = mg$ with $g = ${tex(p.g)}$ N/kg.`],
        solution: [
          `$W = m \\times g = ${m} \\times ${tex(p.g)} = ${tex(W)}$ N`,
          `The mass is still ${m} kg, because it is the same amount of matter. Only the weight changes.`,
        ].join('\n\n'),
      };
    }
    const m = rng.pick([40, 50, 60, 75, 80, 90, 100, 120, 150, 200]);
    const WE = m * 10;
    const WP = clean(m * p.g);
    const who = rng.pick(['astronaut', 'rover', 'robot', 'lander']);
    return {
      type: 'numeric',
      prompt: `${who === 'astronaut' ? 'An' : 'A'} ${who} weighs ${num(WE)} N on Earth, where $g = 10$ N/kg. What would the ${who} weigh on ${p.name}, where $g = ${tex(p.g)}$ N/kg?`,
      answer: WP,
      units: 'N',
      calculator: 'allowed',
      hints: ['First use the Earth weight to find the mass ($m = W \\div g$).', `The mass is the same on ${p.name}. Now use $W = mg$ with the new value of $g$.`],
      solution: [
        `Mass: $m = \\dfrac{W}{g} = \\dfrac{${tex(WE)}}{10} = ${m}$ kg`,
        `Weight on ${p.name}: $W = ${m} \\times ${tex(p.g)} = ${tex(WP)}$ N`,
      ].join('\n\n'),
    };
  },
};

export const netForce: QuestionTemplate = {
  id: 's9.phy.forces.net-force',
  topicId: 's9.phy.forces',
  title: 'Net force from a free-body diagram',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      const F1 = stepped(rng, 10, 200, 5);
      const same = rng.chance(0.25);
      const F2 = pickUntil(
        () => stepped(rng, 5, 200, 5),
        (x) => x !== F1,
      );
      const net = same ? F1 + F2 : Math.abs(F1 - F2);
      const dir = same || F1 > F2 ? 'right' : 'left';
      const fig = same
        ? freeBody([
            { dir: 'right', text: `${F1} N` },
            { dir: 'right', text: `${F2} N`, style: 'push' },
          ], 'box')
        : freeBody([
            { dir: 'right', text: `${F1} N` },
            { dir: 'left', text: `${F2} N` },
          ], 'box');
      return {
        type: 'numeric',
        prompt: same
          ? `Two students move a box. One pulls it to the right with ${F1} N and the other pushes it to the right with ${F2} N. What is the size of the net force on the box? (Ignore friction.)`
          : `A box is pulled to the right with a force of ${F1} N and to the left with a force of ${F2} N. What is the size of the net force on the box?`,
        figure: {
          svg: fig,
          alt: same
            ? `Force diagram of a box: ${F1} N to the right and another ${F2} N to the right.`
            : `Force diagram of a box: ${F1} N to the right and ${F2} N to the left.`,
        },
        answer: net,
        units: 'N',
        calculator: 'allowed',
        hints: [
          'Forces in the same direction add up. Forces in opposite directions subtract.',
        ],
        solution: same
          ? `Both forces act to the right, so add them: $${F1} + ${F2} = ${net}$ N to the right.`
          : `The forces act in opposite directions, so subtract the smaller from the larger: $${Math.max(F1, F2)} - ${Math.min(F1, F2)} = ${net}$ N. The net force acts to the **${dir}**, the direction of the bigger force.`,
      };
    }

    if (difficulty === 2) {
      const balanced = rng.chance(0.2);
      const R = stepped(rng, 20, 300, 10);
      const L = balanced ? R : pickUntil(() => stepped(rng, 10, 300, 10), (x) => x !== R);
      const net = Math.abs(R - L);
      const sum = R + L;
      const big = Math.max(R, L);
      const correctText = balanced ? '0 N (the forces are balanced)' : `${net} N to the ${R > L ? 'right' : 'left'}`;
      const wrongDir = `${net} N to the ${R > L ? 'left' : 'right'}`;
      const options = balanced
        ? [
            { id: 'a', text: correctText },
            { id: 'b', text: `${sum} N to the right` },
            { id: 'c', text: `${R} N to the right` },
            { id: 'd', text: `${sum} N to the left` },
          ]
        : [
            { id: 'a', text: correctText },
            { id: 'b', text: wrongDir },
            { id: 'c', text: `${sum} N to the ${R > L ? 'right' : 'left'}` },
            { id: 'd', text: `${big} N to the ${R > L ? 'right' : 'left'}` },
          ];
      const fig = freeBody(
        [
          { dir: 'right', text: `${R} N` },
          { dir: 'left', text: `${L} N` },
        ],
        'trolley',
      );
      return {
        type: 'mcq',
        prompt: `The diagram shows the two horizontal forces on a trolley: ${R} N to the right and ${L} N to the left. What is the net force on the trolley?`,
        figure: { svg: fig, alt: `Force diagram of a trolley: ${R} N to the right and ${L} N to the left.` },
        options,
        correct: 'a',
        feedback: balanced
          ? {
              b: 'Opposite forces do not add up. They cancel each other out.',
              c: 'This is just one of the forces. Compare it with the force in the other direction.',
              d: 'Opposite forces do not add up. They cancel each other out.',
            }
          : {
              b: 'The net force points the same way as the bigger force.',
              c: 'The forces act in opposite directions, so subtract them rather than adding.',
              d: 'This is just the bigger force. Take away the force acting the other way.',
            },
        calculator: 'allowed',
        hints: ['Forces in opposite directions partly cancel out.', 'The net force acts in the direction of the bigger force.'],
        solution: balanced
          ? `Both forces are ${R} N in opposite directions, so they cancel: the net force is **0 N** and the forces are **balanced**. The trolley stays still or keeps moving at a constant velocity.`
          : `Subtract the smaller force from the bigger one: $${big} - ${Math.min(R, L)} = ${net}$ N. The net force acts to the **${R > L ? 'right' : 'left'}**, the direction of the bigger force, so the forces are unbalanced.`,
      };
    }

    // difficulty 3: Newton's first law with four forces
    const vertical = rng.chance(0.4);
    const outcome = rng.pick(['faster', 'steady', 'slower'] as const);
    if (vertical) {
      const W = stepped(rng, 500, 1000, 50);
      const R = outcome === 'steady' ? W : outcome === 'faster' ? W - stepped(rng, 100, 400, 50) : W + stepped(rng, 200, 1500, 100);
      const options = [
        { id: 'fast', text: 'It speeds up (falls faster)' },
        { id: 'slow', text: 'It slows down' },
        { id: 'steady', text: 'It falls at a constant speed' },
        { id: 'up', text: 'It starts moving upwards' },
      ];
      const correct = outcome === 'faster' ? 'fast' : outcome === 'slower' ? 'slow' : 'steady';
      const fig = freeBody(
        [
          { dir: 'up', text: `air resistance ${num(R)} N` },
          { dir: 'down', text: `weight ${num(W)} N` },
        ],
        'skydiver',
      );
      const fb: Record<string, string> = {
        fast: 'It only speeds up when the weight is bigger than the air resistance.',
        slow: 'It only slows down when the air resistance is bigger than the weight.',
        steady: 'Constant speed needs balanced forces: air resistance equal to weight.',
        up: 'A bigger upward force slows the skydiver down. It does not make them go up, because they are already moving down.',
      };
      delete fb[correct];
      return {
        type: 'mcq',
        prompt: `A skydiver is falling. The forces on them are weight ${num(W)} N downwards and air resistance ${num(R)} N upwards. What happens to the skydiver's motion?`,
        figure: { svg: fig, alt: `Force diagram of a skydiver: air resistance ${num(R)} N up and weight ${num(W)} N down.` },
        options,
        correct,
        feedback: fb,
        calculator: 'allowed',
        hints: ['Compare the upward and downward forces. Are they balanced or unbalanced?', "Newton's first law: balanced forces mean no change in speed; an unbalanced force changes the speed in its direction."],
        solution:
          outcome === 'steady'
            ? `The forces are equal (${num(W)} N each way), so they are **balanced** and the net force is 0 N. By Newton's first law the skydiver keeps falling at a **constant speed**. This is **terminal velocity**.`
            : outcome === 'faster'
              ? `The weight (${num(W)} N) is bigger than the air resistance (${num(R)} N), so there is a net force of ${num(W - R)} N downwards. The skydiver **speeds up**.`
              : `The air resistance (${num(R)} N) is bigger than the weight (${num(W)} N), so there is a net force of ${num(R - W)} N **upwards**, against the motion. The skydiver keeps falling but **slows down**. This happens just after a parachute opens.`,
      };
    }
    const mass = stepped(rng, 900, 1800, 100);
    const W = mass * 10;
    const T = stepped(rng, 1000, 4000, 100);
    const D = outcome === 'steady' ? T : outcome === 'faster' ? T - stepped(rng, 200, 900, 100) : T + stepped(rng, 200, 1500, 100);
    const options = [
      { id: 'fast', text: 'It speeds up' },
      { id: 'slow', text: 'It slows down' },
      { id: 'steady', text: 'It keeps moving at a constant speed' },
      { id: 'stop', text: 'It stops straight away' },
    ];
    const correct = outcome === 'faster' ? 'fast' : outcome === 'slower' ? 'slow' : 'steady';
    const fb: Record<string, string> = {
      fast: 'It only speeds up when the forward force is bigger than the backward force.',
      slow: 'It only slows down when the backward force is bigger than the forward force.',
      steady: 'Constant speed needs balanced forces: the forward and backward forces must be equal.',
      stop: "Objects don't need a net force to keep moving. An unbalanced backward force slows it gradually; it doesn't stop instantly.",
    };
    delete fb[correct];
    const fig = freeBody(
      [
        { dir: 'right', text: `thrust|${num(T)} N` },
        { dir: 'left', text: `drag|${num(D)} N` },
        { dir: 'up', text: `support ${num(W)} N` },
        { dir: 'down', text: `weight ${num(W)} N` },
      ],
      'car',
    );
    return {
      type: 'mcq',
      prompt: `A car is moving to the right along a flat road. The forces on it are: thrust ${num(T)} N forwards, drag and friction ${num(D)} N backwards, weight ${num(W)} N down and support ${num(W)} N up. What happens to the car's motion?`,
      figure: {
        svg: fig,
        alt: `Force diagram of a car: thrust ${num(T)} N to the right, drag ${num(D)} N to the left, support ${num(W)} N up, weight ${num(W)} N down.`,
      },
      options,
      correct,
      feedback: fb,
      calculator: 'allowed',
      hints: ['The up and down forces are balanced, so look at the horizontal forces.', "Newton's first law: balanced forces mean constant speed; an unbalanced force changes the speed."],
      solution: [
        'Vertically, support and weight are equal, so they cancel.',
        outcome === 'steady'
          ? `Horizontally, thrust and drag are both ${num(T)} N, so all the forces are **balanced** (net force 0 N). By Newton's first law the car **keeps moving at a constant speed**.`
          : outcome === 'faster'
            ? `Horizontally, thrust (${num(T)} N) is bigger than drag (${num(D)} N), so there is a net force of ${num(T - D)} N forwards. The car **speeds up**.`
            : `Horizontally, drag (${num(D)} N) is bigger than thrust (${num(T)} N), so there is a net force of ${num(D - T)} N backwards. The car **slows down**.`,
      ].join('\n\n'),
    };
  },
};

// ---------------------------------------------------------------- s9.phy.pressure-floating

const MATERIALS = [
  { name: 'aluminium', rho: 2.7 },
  { name: 'iron', rho: 7.9 },
  { name: 'copper', rho: 8.96 },
  { name: 'lead', rho: 11.3 },
  { name: 'gold', rho: 19.3 },
  { name: 'silver', rho: 10.5 },
  { name: 'glass', rho: 2.5 },
  { name: 'ice', rho: 0.92 },
] as const;

const fl = (rho: number) => (rho < 1 ? 'float' : 'sink');

export const density: QuestionTemplate = {
  id: 's9.phy.pressure-floating.density',
  topicId: 's9.phy.pressure-floating',
  title: 'Density = mass ÷ volume',
  difficulties: [1, 2, 3, 4],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      const rho = rng.int(2, 12);
      const V = rng.int(2, 20);
      const m = rho * V;
      const what = rng.pick(['a rock sample', 'a metal cube', 'a small block', 'a piece of an unknown material', 'a ceramic tile']);
      return {
        type: 'numeric',
        prompt: `The mass of ${what} is ${m} g and its volume is ${V} cm³. What is its density?`,
        answer: rho,
        units: 'g/cm³',
        calculator: 'allowed',
        hints: ['Density = mass ÷ volume.'],
        solution: `$\\rho = \\dfrac{m}{V} = \\dfrac{${m}}{${V}} = ${rho}$ g/cm³`,
      };
    }
    if (difficulty === 2) {
      const mat = rng.pick(MATERIALS);
      const V = rng.int(2, 40);
      const m = clean(mat.rho * V);
      if (rng.chance(0.5)) {
        return {
          type: 'numeric',
          prompt: `The density of ${mat.name} is ${num(mat.rho)} g/cm³. What is the mass of a piece of ${mat.name} with a volume of ${V} cm³?`,
          answer: m,
          units: 'g',
          calculator: 'allowed',
          hints: ['Start from density = mass ÷ volume.', 'Rearrange it: mass = density × volume.'],
          solution: `$m = \\rho \\times V = ${tex(mat.rho)} \\times ${V} = ${tex(m)}$ g`,
        };
      }
      return {
        type: 'numeric',
        prompt: `The density of ${mat.name} is ${num(mat.rho)} g/cm³. A piece of ${mat.name} has a mass of ${num(m)} g. What is its volume?`,
        answer: V,
        units: 'cm³',
        calculator: 'allowed',
        hints: ['Start from density = mass ÷ volume.', 'Rearrange it: volume = mass ÷ density.'],
        solution: `$V = \\dfrac{m}{\\rho} = \\dfrac{${tex(m)}}{${tex(mat.rho)}} = ${V}$ cm³`,
      };
    }
    if (difficulty === 3) {
      const l = rng.int(2, 10);
      const w = rng.int(2, 8);
      const h = rng.int(1, 6);
      const V = l * w * h;
      const rho = rng.pick([0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.2, 1.5, 2.5, 2.7]);
      const m = clean(rho * V);
      return {
        type: 'numeric',
        prompt: `A rectangular block measures ${l} cm × ${w} cm × ${h} cm. Its mass is ${num(m)} g. What is its density?`,
        answer: rho,
        units: 'g/cm³',
        calculator: 'allowed',
        hints: ['First find the volume: length × width × height.', 'Then density = mass ÷ volume.'],
        solution: [
          `Volume: $V = ${l} \\times ${w} \\times ${h} = ${V}$ cm³`,
          `Density: $\\rho = \\dfrac{m}{V} = \\dfrac{${tex(m)}}{${V}} = ${tex(rho)}$ g/cm³`,
          `Water's density is 1.0 g/cm³, so this block would **${fl(rho)}** in water.`,
        ].join('\n\n'),
      };
    }
    // difficulty 4
    if (rng.chance(0.55)) {
      const thing = rng.pick([
        { name: 'small stone', rhos: [2.5, 2.6, 2.7, 3] },
        { name: 'steel bolt', rhos: [7.8, 7.9] },
        { name: 'brass key', rhos: [8.4, 8.5, 8.6] },
        { name: 'plastic toy', rhos: [1.1, 1.2, 1.3, 1.4] },
        { name: 'piece of pounamu', rhos: [2.9, 3] },
      ] as const);
      const rho = rng.pick(thing.rhos);
      const v1 = rng.pick([20, 25, 30, 40, 50, 60]);
      const vObj = rng.int(4, 30);
      const v2 = v1 + vObj;
      const m = clean(rho * vObj);
      const n = nameOf(rng);
      return {
        type: 'numeric',
        prompt: `${n} wants to find the density of a ${thing.name}. ${n} puts water in a measuring cylinder up to ${v1} mL, then lowers the ${thing.name} in. The water level rises to ${v2} mL. The ${thing.name} has a mass of ${num(m)} g. What is its density in g/cm³? (1 mL = 1 cm³)`,
        answer: rho,
        units: 'g/cm³',
        calculator: 'allowed',
        hints: [
          'The volume of the object is the volume of water it pushes aside (displaces).',
          'Volume = final reading − starting reading. Then use density = mass ÷ volume.',
        ],
        solution: [
          `Volume of the ${thing.name}: $${v2} - ${v1} = ${vObj}$ mL $= ${vObj}$ cm³`,
          `Density: $\\rho = \\dfrac{m}{V} = \\dfrac{${tex(m)}}{${vObj}} = ${tex(rho)}$ g/cm³`,
        ].join('\n\n'),
      };
    }
    const liquid = rng.pick([
      { name: 'water', rho: 1.0 },
      { name: 'cooking oil', rho: 0.92 },
      { name: 'sea water', rho: 1.03 },
    ] as const);
    const { l, w, h, rho } = pickUntil(
      () => ({ l: rng.int(2, 10), w: rng.int(2, 6), h: rng.int(2, 5), rho: rng.pick([0.4, 0.5, 0.6, 0.7, 0.8, 1.1, 1.2, 1.25, 1.5, 2]) }),
      (p) => Math.abs(p.rho - liquid.rho) >= 0.08,
    );
    const V = l * w * h;
    const m = clean(rho * V);
    const floats = rho < liquid.rho;
    return {
      type: 'mcq',
      prompt: `A solid block measures ${l} cm × ${w} cm × ${h} cm and has a mass of ${num(m)} g. It is placed in ${liquid.name}, which has a density of ${num(liquid.rho, 2)} g/cm³. Will the block float or sink?`,
      options: [
        { id: 'float', text: 'It floats' },
        { id: 'sink', text: 'It sinks' },
      ],
      correct: floats ? 'float' : 'sink',
      shuffle: false,
      calculator: 'allowed',
      hints: ['Work out the density of the block (volume first).', 'An object floats if it is less dense than the liquid, and sinks if it is denser.'],
      solution: [
        `Volume: $${l} \\times ${w} \\times ${h} = ${V}$ cm³`,
        `Density: $\\dfrac{${tex(m)}}{${V}} = ${tex(rho)}$ g/cm³`,
        `${num(rho)} g/cm³ is ${floats ? 'less' : 'more'} than ${num(liquid.rho, 2)} g/cm³, so the block **${floats ? 'floats' : 'sinks'}**.`,
      ].join('\n\n'),
    };
  },
};

// ---------------------------------------------------------------- s9.phy.energy

interface Device {
  name: string;
  /** Energy put in, e.g. "electrical energy". */
  input: string;
  /** Useful energy out. */
  useful: string;
  waste: string;
  effs: readonly number[];
  unit: 'J' | 'kJ';
  ins: readonly [number, number, number];
}

const DEVICES: readonly Device[] = [
  { name: 'an incandescent (old-style) light bulb', input: 'electrical energy', useful: 'light energy', waste: 'heat', effs: [5, 10], unit: 'J', ins: [100, 1000, 100] },
  { name: 'an electric kettle', input: 'electrical energy', useful: 'thermal energy in the water', waste: 'heat lost to the surroundings, and sound', effs: [80, 85, 90], unit: 'kJ', ins: [100, 600, 20] },
  { name: 'a car engine', input: 'chemical energy from the fuel', useful: 'kinetic energy', waste: 'heat and sound', effs: [20, 25, 30], unit: 'kJ', ins: [1000, 9000, 500] },
  { name: 'an electric motor', input: 'electrical energy', useful: 'kinetic energy', waste: 'heat and sound', effs: [70, 75, 80, 85, 90], unit: 'J', ins: [200, 2000, 100] },
  { name: 'a solar panel', input: 'light energy', useful: 'electrical energy', waste: 'heat', effs: [15, 20], unit: 'J', ins: [500, 5000, 500] },
  { name: 'a wind turbine', input: 'kinetic energy from the wind', useful: 'electrical energy', waste: 'heat and sound', effs: [30, 35, 40, 45], unit: 'kJ', ins: [1000, 9000, 1000] },
  { name: 'a hydro-electric generator', input: 'kinetic energy from the moving water', useful: 'electrical energy', waste: 'heat and sound', effs: [85, 90], unit: 'kJ', ins: [1000, 9000, 1000] },
];

/** "chemical energy from the fuel" → "chemical energy" */
const shortEnergy = (s: string) => s.replace(/ (from|in) .*$/, '');

export const efficiency: QuestionTemplate = {
  id: 's9.phy.energy.efficiency',
  topicId: 's9.phy.energy',
  title: 'Energy efficiency (%)',
  difficulties: [3, 4],
  generate({ rng, difficulty }) {
    const dev = rng.pick(DEVICES);
    const eff = rng.pick(dev.effs);
    const inE = stepped(rng, dev.ins[0], dev.ins[1], dev.ins[2]);
    const useE = clean((inE * eff) / 100);
    const wasteE = clean(inE - useE);
    const u = dev.unit;
    const Dev = dev.name.charAt(0).toUpperCase() + dev.name.slice(1);
    const dec = tex(clean(eff / 100));
    if (difficulty === 3) {
      return {
        type: 'numeric',
        prompt: `${Dev} is supplied with ${num(inE)} ${u} of ${dev.input}. It transforms ${num(useE)} ${u} of this into useful ${dev.useful}. What is its efficiency?`,
        answer: eff,
        units: '%',
        calculator: 'allowed',
        hints: ['Efficiency = useful energy output ÷ total energy input × 100%.'],
        solution: [
          `$\\text{efficiency} = \\dfrac{\\text{useful energy out}}{\\text{total energy in}} \\times 100\\% = \\dfrac{${tex(useE)}}{${tex(inE)}} \\times 100\\% = ${eff}\\%$`,
          `The other ${num(wasteE)} ${u} is wasted, mostly as ${dev.waste}.`,
        ].join('\n\n'),
      };
    }
    const kind = rng.pick(['waste', 'input', 'useful'] as const);
    if (kind === 'waste') {
      return {
        type: 'numeric',
        prompt: `${Dev} has an efficiency of ${eff}%. It is supplied with ${num(inE)} ${u} of ${dev.input}. How much energy is wasted?`,
        answer: wasteE,
        units: u,
        calculator: 'allowed',
        hints: [`${eff}% of the input energy is useful. The rest is wasted.`, 'Find the useful energy first, then subtract it from the input. (Energy is conserved, so useful + wasted = input.)'],
        solution: [
          `Useful energy: $${eff}\\% \\text{ of } ${tex(inE)} = ${dec} \\times ${tex(inE)} = ${tex(useE)}$ ${u}`,
          `Wasted energy: $${tex(inE)} - ${tex(useE)} = ${tex(wasteE)}$ ${u}, mostly as ${dev.waste}.`,
        ].join('\n\n'),
      };
    }
    if (kind === 'input') {
      return {
        type: 'numeric',
        prompt: `${Dev} has an efficiency of ${eff}%. It gives out ${num(useE)} ${u} of useful ${dev.useful}. How much ${shortEnergy(dev.input)} was supplied to it?`,
        answer: inE,
        units: u,
        calculator: 'allowed',
        hints: [`The useful energy is ${eff}% of the input energy.`, `So input energy = useful energy ÷ ${dec}.`],
        solution: [
          `${eff}% of the input is ${num(useE)} ${u}, so $${dec} \\times \\text{input} = ${tex(useE)}$.`,
          `$\\text{input} = ${tex(useE)} \\div ${dec} = ${tex(inE)}$ ${u}`,
        ].join('\n\n'),
      };
    }
    return {
      type: 'numeric',
      prompt: `${Dev} has an efficiency of ${eff}%. It is supplied with ${num(inE)} ${u} of ${dev.input}. How much useful ${dev.useful} does it give out?`,
      answer: useE,
      units: u,
      calculator: 'allowed',
      hints: [`Find ${eff}% of the input energy.`, `${eff}% = ${dec} as a decimal.`],
      solution: `Useful energy $= ${dec} \\times ${tex(inE)} = ${tex(useE)}$ ${u}`,
    };
  },
};

export const templates: QuestionTemplate[] = [
  speed,
  unitConversion,
  acceleration,
  forceMassAcceleration,
  weight,
  netForce,
  density,
  efficiency,
];
