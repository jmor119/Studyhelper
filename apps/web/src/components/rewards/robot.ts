import { createRng, hashString, type Rng } from '@study-helper/shared/rng';

// One-of-a-kind robot avatars (a reward every 5th level). Drawn in the same style as the hand-made
// characters in public/characters (see kiwi.svg): #1f2937 outline 3 wide with round caps/joins, kiwi eyes
// (dark pupil + two white highlights), pink cheeks, flat fill with a darker crescent on the lower right and
// a light highlight stroke on the upper left. Everything is derived from the seed, so the same seed always
// draws the same robot. Output follows the character brief: viewBox 0 0 128 128, transparent, inside a
// radius-58 circle, plain shape elements only, ids prefixed `robot-<seed>-`.

const INK = '#1f2937';
const WHITE = '#fff';
const CHEEK = '#f9a8b8';
const SCREEN = '#1e293b';
const GLOWS = ['#67e8f9', '#a3e635', '#fde047', '#f9a8d4'] as const;
const LIGHTS = ['#f87171', '#fde047', '#4ade80'] as const;

interface Palette {
  main: string;
  shade: string;
  light: string;
  accent: string;
  /** Neutral metal for necks, ears and joints. */
  trim: string;
  /** Gradient stops for the shiny rare finishes. */
  shine?: readonly string[];
}

const pal = (main: string, shade: string, light: string, accent: string, trim = '#cbd5e1'): Palette => ({
  main,
  shade,
  light,
  accent,
  trim,
});

// [palette, weight]: gold and chrome are rare.
const PALETTES: readonly (readonly [Palette, number])[] = [
  [pal('#60a5fa', '#3b82f6', '#bfdbfe', '#fbbf24'), 10], // sky
  [pal('#2dd4bf', '#14b8a6', '#99f6e4', '#f472b6'), 10], // teal
  [pal('#4ade80', '#22c55e', '#bbf7d0', '#fb923c'), 10], // mint
  [pal('#fb923c', '#f97316', '#fed7aa', '#38bdf8'), 10], // orange
  [pal('#f87171', '#ef4444', '#fecaca', '#fde047'), 10], // red
  [pal('#a78bfa', '#8b5cf6', '#ddd6fe', '#34d399'), 10], // purple
  [pal('#f472b6', '#ec4899', '#fbcfe8', '#60a5fa'), 10], // pink
  [pal('#facc15', '#eab308', '#fef08a', '#f87171'), 10], // yellow
  [pal('#a3e635', '#84cc16', '#ecfccb', '#a78bfa'), 10], // lime
  [pal('#818cf8', '#6366f1', '#c7d2fe', '#fbbf24'), 10], // indigo
  [pal('#38bdf8', '#0ea5e9', '#bae6fd', '#fb7185'), 10], // cyan
  [pal('#cbd5e1', '#94a3b8', '#f1f5f9', '#f87171', '#94a3b8'), 8], // silver
  [pal('#f1f5f9', '#cbd5e1', '#ffffff', '#38bdf8'), 6], // white
  [{ ...pal('#fbbf24', '#d97706', '#fef3c7', '#f87171'), shine: ['#fef08a', '#fbbf24', '#f59e0b'] }, 3], // gold
  [{ ...pal('#e2e8f0', '#94a3b8', '#ffffff', '#38bdf8', '#94a3b8'), shine: ['#ffffff', '#cbd5e1', '#f1f5f9', '#94a3b8'] }, 3], // chrome
];

const NAMES = [
  'Bolt', 'Sprocket', 'Gizmo', 'Widget', 'Byte', 'Pixel', 'Cog', 'Zap', 'Rivet', 'Nano', 'Turbo', 'Sparky',
  'Clunk', 'Blip', 'Dynamo', 'Gadget', 'Servo', 'Volt', 'Ratchet', 'Beep', 'Tinker', 'Flux', 'Gears', 'Chip',
  'Boop', 'Zippy', 'Whirr', 'Ziggy',
] as const;

// ---------- seed ----------

function parseSeed(seed: string): { num: number; key: string } {
  if (/^[0-9a-f]{6}$/i.test(seed)) {
    const key = seed.toLowerCase();
    return { num: parseInt(key, 16), key };
  }
  const h = hashString(seed);
  return { num: h, key: h.toString(16).padStart(8, '0') };
}

// Spread neighbouring seeds apart before they reach the PRNG.
const mix = (v: number, salt: number) => {
  let h = (v ^ salt) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  return (h ^ (h >>> 16)) >>> 0;
};

function pickWeighted<T>(rng: Rng, items: readonly (readonly [T, number])[]): T {
  let total = 0;
  for (const [, w] of items) total += w;
  let r = rng.next() * total;
  for (const [item, w] of items) {
    r -= w;
    if (r < 0) return item;
  }
  return items[items.length - 1]![0];
}

// ---------- svg helpers ----------

const n = (v: number) => String(Math.round(v * 10) / 10);
const rect = (x: number, y: number, w: number, h: number, rx: number, a = '') =>
  `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${n(rx)}"${a}/>`;
const circle = (cx: number, cy: number, r: number, a = '') => `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}"${a}/>`;
const path = (d: string, a = '') => `<path d="${d}"${a}/>`;
const fill = (c: string) => ` fill="${c}"`;
const NOSTROKE = ' stroke="none"';
const line = (d: string, c: string, w: number, extra = '') => path(d, ` fill="none" stroke="${c}" stroke-width="${w}"${extra}`);
const group = (attrs: string, body: string) => (body ? `<g${attrs}>${body}</g>` : '');

/** Flat fill + darker crescent (the shape scaled toward its upper left) + outline on top. */
function shaded(shape: (a: string) => string, main: string, shade: string, px: number, py: number, s = 0.9): string {
  const t = (v: number) => n(v * (1 - s));
  return (
    shape(fill(shade) + NOSTROKE) +
    shape(`${fill(main)}${NOSTROKE} transform="matrix(${s} 0 0 ${s} ${t(px)} ${t(py)})"`) +
    shape(' fill="none"')
  );
}

/** Kiwi eye: pupil with a big highlight up-right and a tiny one low-left. */
const eye = (x: number, y: number, r: number, c = INK) =>
  circle(x, y, r, fill(c)) +
  circle(x + r * 0.35, y - r * 0.35, r * 0.37, fill(WHITE)) +
  circle(x - r * 0.2, y + r * 0.42, r * 0.17, fill(WHITE));

// ---------- heads ----------

interface Head {
  shape: (a: string) => string;
  /** y of the top edge at x 64 (head-tops attach here). */
  top: number;
  left: number;
  right: number;
  bottom: number;
  /** Shade pivot. */
  px: number;
  py: number;
  glint: string;
  /** Face plate: x, y, w, h, rx. */
  plate: readonly [number, number, number, number, number];
  fx: number;
  ey: number;
  my: number;
  dx: number;
  forceScreen?: boolean;
  extra?: (p: Palette) => string;
}

const HEADS: readonly (readonly [Head, number])[] = [
  [{
    shape: (a) => rect(26, 26, 76, 56, 14, a),
    top: 26, left: 26, right: 102, bottom: 82, px: 40, py: 36,
    glint: 'M33 48v-6q0-9 9-9h6', plate: [34, 35, 60, 40, 12], fx: 64, ey: 52, my: 67, dx: 15,
  }, 3],
  [{
    shape: (a) => `<ellipse cx="64" cy="56" rx="37" ry="30"${a}/>`,
    top: 26, left: 27, right: 101, bottom: 86, px: 46, py: 40,
    glint: 'M35 50q4-12 17-17', plate: [37, 38, 54, 38, 14], fx: 64, ey: 53, my: 69, dx: 15,
  }, 2],
  [{
    shape: (a) => rect(22, 30, 84, 52, 26, a),
    top: 30, left: 22, right: 106, bottom: 82, px: 40, py: 40,
    glint: 'M30 52q1-11 13-15', plate: [35, 37, 58, 38, 16], fx: 64, ey: 53, my: 68, dx: 15,
  }, 2],
  [{
    shape: (a) => path('M31 84q-5 0-5-5V60a38 34 0 0 1 76 0v19q0 5-5 5z', a),
    top: 26, left: 26, right: 102, bottom: 84, px: 44, py: 42,
    glint: 'M33 52q3-13 16-19', plate: [34, 42, 60, 36, 12], fx: 64, ey: 56, my: 70, dx: 15,
  }, 2],
  [{
    shape: (a) => rect(22, 28, 84, 54, 10, a),
    top: 28, left: 22, right: 106, bottom: 82, px: 36, py: 38,
    // The screen fills the upper left, so the glint sits by the knobs.
    glint: 'M97 33h3', plate: [28, 34, 62, 42, 12], fx: 59, ey: 51, my: 67, dx: 14, forceScreen: true,
    extra: (p) =>
      circle(98, 44, 4, fill(p.accent)) + circle(98, 56, 4, fill(p.trim)) + line('M94 67h8M94 73h8', INK, 2.5),
  }, 2],
  [{
    shape: (a) => path('M42 26h44l18 30-18 28H42L24 56z', a),
    top: 26, left: 24, right: 104, bottom: 84, px: 44, py: 40,
    glint: 'M32 52l9-15q2-3 6-3h4', plate: [37, 37, 54, 38, 12], fx: 64, ey: 53, my: 68, dx: 15,
  }, 2],
  [{
    shape: (a) => path('M27 34q0-8 8-8h58q8 0 8 8l-4 42q-1 8-9 8H40q-8 0-9-8z', a),
    top: 26, left: 28, right: 100, bottom: 84, px: 42, py: 38,
    glint: 'M34 52l-1-15q0-4 4-4h8', plate: [36, 36, 56, 38, 12], fx: 64, ey: 52, my: 68, dx: 15,
  }, 2],
];

// ---------- head tops ----------

type Top = 'ball' | 'heart' | 'star' | 'bolt' | 'twin' | 'spring' | 'propeller' | 'dish' | 'beacon' | 'crest' | 'none';
const TOPS: readonly (readonly [Top, number])[] = [
  ['ball', 5], ['heart', 2], ['star', 2], ['bolt', 3], ['twin', 4], ['spring', 3], ['propeller', 1.5],
  ['dish', 2], ['beacon', 2], ['crest', 2], ['none', 3],
];

function star(cx: number, cy: number, ro: number, ri: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? ri : ro;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${n(cx + r * Math.cos(a))},${n(cy + r * Math.sin(a))}`);
  }
  return `<polygon points="${pts.join(' ')}"`;
}

function headTop(kind: Top, T: number, p: Palette, glow: string): string {
  const stem = (y: number) => line(`M64 ${T + 6}V${y}`, INK, 3);
  const shine = (x: number, y: number, r = 1.6) => circle(x, y, r, fill(WHITE) + NOSTROKE);
  switch (kind) {
    case 'ball':
      return stem(18) + circle(64, 14, 5.5, fill(p.accent)) + shine(62, 12);
    case 'heart':
      return (
        stem(18) +
        path('M64 21c-6-3.5-8.5-7-7-9.8 1.4-2.6 5-2.6 7 .2 2-2.8 5.6-2.8 7-.2 1.5 2.8-1 6.3-7 9.8z', fill('#fb7185')) +
        shine(60.5, 13, 1.3)
      );
    case 'star':
      return stem(20) + `${star(64, 15, 8, 3.8)}${fill('#fde047')} stroke-width="2.5"/>`;
    case 'bolt':
      return stem(22) + path('M67 9l-10 11h6l-3 8 11-12h-6l3-7z', fill('#fde047') + ' stroke-width="2.5"');
    case 'twin':
      return (
        line(`M55 ${T + 5}L46 19M73 ${T + 5}L82 19`, INK, 3) +
        circle(45, 17, 4.5, fill(p.accent)) + circle(83, 17, 4.5, fill(p.accent)) +
        shine(43.5, 15.5, 1.3) + shine(81.5, 15.5, 1.3)
      );
    case 'spring':
      return (
        stem(20) +
        [24, 20.5, 17].map((y) => `<ellipse cx="64" cy="${y}" rx="6" ry="2.2" fill="none" stroke-width="2.5"/>`).join('') +
        circle(64, 12.5, 4.5, fill(p.accent)) + shine(62.5, 11, 1.3)
      );
    case 'propeller':
      return (
        stem(17) +
        `<ellipse cx="53" cy="15" rx="10" ry="4"${fill(p.accent)}/><ellipse cx="75" cy="15" rx="10" ry="4"${fill(p.accent)}/>` +
        circle(64, 16, 3.5, fill(p.trim))
      );
    case 'dish':
      return (
        line(`M68 ${T + 5}L75 20`, INK, 3) +
        path('M67 10a12 12 0 0 0 17 17z', fill(p.trim)) +
        line('M75.5 18.5l4.5-4.5', INK, 2.5) + circle(80.5, 13.5, 2.5, fill(p.accent))
      );
    case 'beacon':
      return (
        line(`M50 ${T - 12}l-4-3M78 ${T - 12}l4-3M64 ${T - 16}v-2`, glow === '#fde047' ? '#fbbf24' : '#fde047', 3) +
        path(`M56 ${T + 2}v-6a8 8 0 0 1 16 0v6z`, fill(p.accent)) + rect(53, T - 3, 22, 6, 2, fill(p.trim)) + shine(60, T - 8)
      );
    case 'crest':
      return circle(53, T - 1, 6, fill(p.accent)) + circle(75, T - 1, 6, fill(p.accent)) + circle(64, T - 5, 7, fill(p.accent));
    case 'none':
      return '';
  }
}

// ---------- ears ----------

type Ears = 'bolts' | 'discs' | 'phones' | 'fins' | 'speakers' | 'none';
const EARS: readonly (readonly [Ears, number])[] = [
  ['bolts', 3], ['discs', 3], ['phones', 2], ['fins', 2], ['speakers', 2], ['none', 2],
];

function ears(kind: Ears, h: Head, p: Palette, band: boolean): string {
  const E = 55;
  const L = h.left;
  const R = h.right;
  switch (kind) {
    case 'bolts':
      return (
        rect(L - 8, E - 5, 11, 10, 2, fill(p.trim)) + rect(L - 12, E - 8, 6, 16, 2.5, fill(p.accent)) +
        rect(R - 3, E - 5, 11, 10, 2, fill(p.trim)) + rect(R + 6, E - 8, 6, 16, 2.5, fill(p.accent))
      );
    case 'discs':
      return (
        circle(L - 1, E, 10, fill(p.accent)) + circle(R + 1, E, 10, fill(p.accent)) +
        circle(L - 5, E, 3, fill(p.trim) + ' stroke-width="2"') + circle(R + 5, E, 3, fill(p.trim) + ' stroke-width="2"')
      );
    case 'phones': {
      const d = `M${L - 3} ${E - 10}C${L - 3} 2 ${R + 3} 2 ${R + 3} ${E - 10}`;
      const b = band ? line(d, INK, 9) + line(d, p.trim, 3.5) : '';
      return b + rect(L - 9, E - 12, 13, 24, 6, fill(p.accent)) + rect(R - 4, E - 12, 13, 24, 6, fill(p.accent));
    }
    case 'fins': {
      // Wide heads tuck the fins in a little so the tips stay inside the circle.
      const fl = Math.max(L, 25);
      const fr = Math.min(R, 103);
      return (
        path(`M${fl + 3} ${E - 8}L${fl - 9} ${E - 15}q-3-1-3 2l2 20q1 4 5 2l8-4z`, fill(p.accent)) +
        path(`M${fr - 3} ${E - 8}L${fr + 9} ${E - 15}q3-1 3 2l-2 20q-1 4-5 2l-8-4z`, fill(p.accent))
      );
    }
    case 'speakers':
      return (
        rect(L - 8, E - 10, 12, 20, 4, fill(p.trim)) + rect(R - 4, E - 10, 12, 20, 4, fill(p.trim)) +
        line(`M${L - 4} ${E - 4}v8M${R + 4} ${E - 4}v8`, INK, 2.5)
      );
    case 'none':
      return '';
  }
}

// ---------- face ----------

type Face = 'bare' | 'plate' | 'screen';
type Eyes = 'round' | 'lens' | 'cyclops' | 'visor' | 'led' | 'happy' | 'sleepy' | 'mismatch' | 'wink';
const EYES: readonly (readonly [Eyes, number])[] = [
  ['round', 6], ['lens', 3], ['cyclops', 1.5], ['visor', 2], ['led', 3], ['happy', 2], ['sleepy', 1.5],
  ['mismatch', 2], ['wink', 1.5],
];
type Mouth = 'smile' | 'grin' | 'grille' | 'zigzag' | 'dots' | 'screen' | 'cat';
const MOUTHS: readonly (readonly [Mouth, number])[] = [
  ['smile', 4], ['grin', 3], ['grille', 3], ['zigzag', 2], ['dots', 2], ['screen', 2], ['cat', 2],
];

function eyes(kind: Eyes, h: Head, ink: string, p: Palette, glow: string, rng: Rng): string {
  const { fx, ey, dx } = h;
  const xl = fx - dx;
  const xr = fx + dx;
  const arc = (x: number) => line(`M${x - 6} ${ey + 2}q6-9 12 0`, ink, 3.5);
  switch (kind) {
    case 'round': {
      const r = rng.pick([6.5, 7, 7.5, 8]);
      return eye(xl, ey, r, ink) + eye(xr, ey, r, ink);
    }
    case 'lens':
      return (
        circle(xl, ey, 10.5, fill(p.trim)) + circle(xr, ey, 10.5, fill(p.trim)) +
        group(NOSTROKE, eye(xl, ey, 6.5) + eye(xr, ey, 6.5))
      );
    case 'cyclops':
      // One big eye with a glowing iris ring around the dark pupil.
      return (
        circle(fx, ey - 1, 13, fill(p.trim)) + circle(fx, ey - 1, 9, fill(glow) + ' stroke-width="2.5"') +
        group(NOSTROKE, eye(fx, ey - 1, 5.5))
      );
    case 'visor':
      return (
        rect(fx - 27, ey - 8.5, 54, 17, 8.5, fill(SCREEN)) +
        group(NOSTROKE, eye(xl + 2, ey, 4.5, glow) + eye(xr - 2, ey, 4.5, glow)) +
        line(`M${fx - 21} ${ey - 4}h5`, WHITE, 2.5, ' opacity=".35"')
      );
    case 'led': {
      const sq = (x: number) =>
        rect(x - 6.5, ey - 6.5, 13, 13, 3.5, fill(ink)) +
        rect(x + 0.5, ey - 4.5, 4, 4, 1.2, fill(WHITE)) +
        circle(x - 3, ey + 3, 1.2, fill(WHITE));
      return group(NOSTROKE, sq(xl) + sq(xr));
    }
    case 'happy':
      return arc(xl) + arc(xr);
    case 'sleepy':
      return line(`M${xl - 6} ${ey - 1}q6 7 12 0M${xr - 6} ${ey - 1}q6 7 12 0`, ink, 3.5);
    case 'mismatch':
      return rng.chance(0.5)
        ? group(NOSTROKE, eye(xl - 1, ey - 1, 9, ink) + eye(xr + 1, ey + 1, 5.5, ink))
        : group(NOSTROKE, eye(xl - 1, ey + 1, 5.5, ink) + eye(xr + 1, ey - 1, 9, ink));
    case 'wink':
      return rng.chance(0.5)
        ? group(NOSTROKE, eye(xl, ey, 7.5, ink)) + arc(xr)
        : arc(xl) + group(NOSTROKE, eye(xr, ey, 7.5, ink));
  }
}

function mouth(kind: Mouth, fx: number, my: number, face: Face, ink: string, p: Palette, glow: string): string {
  switch (kind) {
    case 'smile':
      return line(`M${fx - 7} ${my - 2}q7 7 14 0`, ink, 3);
    case 'grin':
      return (
        path(`M${fx - 8} ${my - 3}h16a8 8 0 0 1-16 0z`, fill(INK)) +
        `<ellipse cx="${fx}" cy="${my + 2.5}" rx="4" ry="2.2"${fill('#fb7185')}${NOSTROKE}/>`
      );
    case 'grille': {
      // A smiling speaker grille: flat top, round bottom, slots following the curve.
      const bg = p.trim === '#94a3b8' && face === 'bare' ? '#f1f5f9' : WHITE;
      return (
        path(`M${fx - 10} ${my - 4}h20a10 9 0 0 1-20 0z`, fill(bg) + ' stroke-width="2.5"') +
        line(`M${fx - 5} ${my - 3}v5.5M${fx} ${my - 3}v7M${fx + 5} ${my - 3}v5.5`, INK, 2)
      );
    }
    case 'zigzag': {
      // Zigzag that follows a smile curve, so it reads happy rather than wobbly.
      const pts: string[] = [];
      for (let i = 0; i <= 6; i++) {
        const x = -10 + (i * 10) / 3;
        pts.push(`${n(fx + x)},${n(my - 1 - 3.5 * (x / 10) ** 2 + (i % 2 ? 1.3 : -1.3))}`);
      }
      return `<polyline points="${pts.join(' ')}" fill="none" stroke="${ink}" stroke-width="2.5"/>`;
    }
    case 'dots': {
      // Speaker holes: three over two.
      const holes = [[-6, -2.5], [0, -2.5], [6, -2.5], [-3, 2.5], [3, 2.5]] as const;
      return group(fill(ink) + NOSTROKE, holes.map(([x, y]) => circle(fx + x, my + y, 1.8)).join(''));
    }
    case 'screen':
      // Smile-shaped little screen showing a glowing sound wave.
      return (
        path(`M${fx - 10} ${my - 4}h20a10 9 0 0 1-20 0z`, fill(SCREEN) + ' stroke-width="2.5"') +
        line(`M${fx - 6} ${my}q1.5-3 3 0t3 0 3 0 3 0`, glow, 2)
      );
    case 'cat':
      return line(`M${fx - 8} ${my - 2}q4 5 8 0q4 5 8 0`, ink, 3);
  }
}

// ---------- body ----------

type Torso = 'box' | 'barrel' | 'wedge';
type Panel = 'lights' | 'heart' | 'core' | 'gauge' | 'vent' | 'bolt';
type Arms = 'joints' | 'pads' | 'stubs';

interface TorsoDef {
  shape: (a: string) => string;
  glint: string;
  /** Left shoulder joint (mirrored for the right). */
  joint: readonly [number, number];
  arms: readonly Arms[];
}

// Stubby arms and shoulder pads only fit the flat-shouldered torsos.
const TORSOS: Record<Torso, TorsoDef> = {
  box: {
    shape: (a) => rect(38, 88, 52, 28, 10, a),
    glint: 'M43 98q0-5 5-5', joint: [38, 95], arms: ['joints', 'pads', 'stubs'],
  },
  barrel: {
    shape: (a) => `<ellipse cx="64" cy="103" rx="29" ry="16"${a}/>`,
    glint: 'M42 98q3-4 8-5', joint: [36, 102], arms: ['joints'],
  },
  wedge: {
    shape: (a) => path('M38 88h52q6 0 5 6l-4 17q-1 4-5 4H42q-4 0-5-4l-4-17q-1-6 5-6z', a),
    glint: 'M42 95h5', joint: [36, 94], arms: ['joints', 'pads', 'stubs'],
  },
};

function panel(kind: Panel, p: Palette, glow: string): string {
  const y = 102;
  switch (kind) {
    case 'lights':
      return (
        rect(50, y - 7, 28, 13, 4, fill(p.light) + ' stroke-width="2.5"') +
        LIGHTS.map((c, i) => circle(57 + i * 7, y - 0.5, 2.6, fill(c) + ' stroke-width="1.5"')).join('')
      );
    case 'heart':
      return (
        path(
          `M64 ${y + 7}c-7-4-10-8-8.2-11.4 1.7-3.1 6-3.1 8.2.3 2.2-3.4 6.5-3.4 8.2-.3 1.8 3.4-1.2 7.4-8.2 11.4z`,
          fill('#fb7185') + ' stroke-width="2.5"',
        ) + circle(60, y - 1.5, 1.4, fill(WHITE) + NOSTROKE)
      );
    case 'core':
      return (
        circle(64, y, 8, fill(p.trim) + ' stroke-width="2.5"') + circle(64, y, 4.5, fill(glow) + ' stroke-width="2"') +
        circle(62.5, y - 1.5, 1.3, fill(WHITE) + NOSTROKE)
      );
    case 'gauge':
      return (
        path(`M53 ${y + 5}a11 11 0 0 1 22 0z`, fill(WHITE) + ' stroke-width="2.5"') +
        line(`M64 ${y + 5}l5-7`, INK, 2.5) + circle(64, y + 5, 1.8, fill(p.accent) + NOSTROKE)
      );
    case 'vent':
      return line(`M54 ${y - 5}h20M54 ${y}h20M54 ${y + 5}h20`, INK, 3);
    case 'bolt':
      return path(`M66 ${y - 9}l-8 10h5l-2 7 9-10h-5l2-7z`, fill('#fde047') + ' stroke-width="2.5"');
  }
}

/** Shoulders: joints and stubby arms tuck behind the torso, pads sit on top of it. */
function arms(kind: Arms, joint: readonly [number, number], p: Palette, hand: string): { back: string; front: string } {
  const [x, y] = joint;
  switch (kind) {
    case 'joints':
      return { back: circle(x, y, 6, fill(p.trim)) + circle(128 - x, y, 6, fill(p.trim)), front: '' };
    case 'stubs':
      return {
        back:
          rect(28, 91, 12, 10, 4, fill(p.trim)) + rect(88, 91, 12, 10, 4, fill(p.trim)) +
          circle(33, 104, 5.5, fill(hand)) + circle(95, 104, 5.5, fill(hand)),
        front: '',
      };
    case 'pads':
      return {
        back: '',
        front: path('M31 99q-1-11 11-11h5v11z', fill(p.accent)) + path('M97 99q1-11-11-11h-5v11z', fill(p.accent)),
      };
  }
}

// ---------- public ----------

/** A complete SVG for the robot with this seed (6 hex characters, e.g. "a7f2c9"; anything else is hashed). */
export function robotSvg(seed: string): string {
  const { num, key } = parseSeed(seed);
  const rng = createRng(mix(num, 0x5eed));
  const p = pickWeighted(rng, PALETTES);
  const h = pickWeighted(rng, HEADS);
  const glow = rng.pick(GLOWS);
  const face: Face = h.forceScreen
    ? rng.pick(['plate', 'screen'] as const)
    : pickWeighted(rng, [['bare', 4], ['plate', 3], ['screen', 3]] as const);
  // Visors need a bare or plated face; grilles and dark mouths vanish (or look like fangs) on a dark screen;
  // the big cyclops eye only leaves room for a slim mouth.
  const eyeKind = pickWeighted(rng, face === 'screen' ? EYES.filter(([e]) => e !== 'visor') : EYES);
  const mouthOk = (m: Mouth) =>
    !(face === 'screen' && (m === 'grin' || m === 'screen' || m === 'grille')) &&
    !(eyeKind === 'cyclops' && (m === 'dots' || m === 'screen' || m === 'grille')) &&
    !(eyeKind === 'lens' && m === 'grille');
  const mouthKind = pickWeighted(rng, MOUTHS.filter(([m]) => mouthOk(m)));
  const top = pickWeighted(rng, TOPS);
  const earKind = pickWeighted(rng, EARS);
  const torso = rng.pick(['box', 'barrel', 'wedge'] as const);
  const panelKind = rng.pick(['lights', 'heart', 'core', 'gauge', 'vent', 'bolt'] as const);
  const armKind = rng.pick(TORSOS[torso].arms);
  const twoTone = rng.chance(0.3);
  const cheeks = rng.chance(0.8);

  const id = `robot-${key}-shine`;
  const main = p.shine ? `url(#${id})` : p.main;
  const torsoMain = twoTone ? p.trim : main;
  const torsoShade = twoTone ? (p.trim === '#94a3b8' ? '#64748b' : '#94a3b8') : p.shade;
  const ink = face === 'screen' ? glow : INK;

  const defs = p.shine
    ? `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">${p.shine
        .map((c, i) => `<stop offset="${n(i / (p.shine!.length - 1))}" stop-color="${c}"/>`)
        .join('')}</linearGradient></defs>`
    : '';

  const T = TORSOS[torso];
  const band = earKind === 'phones' && (top === 'ball' || top === 'heart' || top === 'star' || top === 'none');

  let faceSvg = '';
  if (face !== 'bare') {
    const [x, y, w, hh, rx] = h.plate;
    faceSvg += rect(x, y, w, hh, rx, fill(face === 'screen' ? SCREEN : p.light));
    if (face === 'screen') faceSvg += line(`M${x + 6} ${y + 12}v-2q0-5 5-5h4`, WHITE, 3, ' opacity=".3"');
  }
  if (cheeks && eyeKind !== 'visor') {
    const cheek = (x: number) => `<ellipse cx="${x}" cy="${h.ey + 11}" rx="6" ry="4"/>`;
    // A touch stronger on dark screens so the blush still shows.
    const opacity = face === 'screen' ? '.8' : '.6';
    faceSvg += group(`${fill(CHEEK)}${NOSTROKE} opacity="${opacity}"`, cheek(h.fx - 22) + cheek(h.fx + 22));
  }
  faceSvg += group(eyeKind === 'round' ? NOSTROKE : '', eyes(eyeKind, h, ink, p, glow, rng));
  faceSvg += mouth(mouthKind, h.fx, h.my + (eyeKind === 'cyclops' ? 2 : 0), face, ink, p, glow);

  const shoulders = arms(armKind, T.joint, p, torsoMain);
  const body =
    shoulders.back +
    rect(55, h.bottom - 6, 18, 14, 3, fill(p.trim)) +
    shaded(T.shape, torsoMain, torsoShade, 52, 94) +
    line(T.glint, twoTone ? '#f1f5f9' : p.light, 4, ' opacity=".8"') +
    shoulders.front +
    panel(panelKind, p, glow);

  const head =
    ears(earKind, h, p, band) +
    headTop(top, h.top, p, glow) +
    shaded(h.shape, main, p.shade, h.px, h.py) +
    line(h.glint, p.light, 5, ' opacity=".8"') +
    (h.extra ? h.extra(p) : '') +
    faceSvg;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">${defs}` +
    `<g stroke="${INK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${body}${head}</g></svg>`
  );
}

/** A friendly name for the robot with this seed, e.g. "Sprocket-27". */
export function robotName(seed: string): string {
  const rng = createRng(mix(parseSeed(seed).num, 0x4e414d45));
  return `${rng.pick(NAMES)}-${rng.int(10, 99)}`;
}
