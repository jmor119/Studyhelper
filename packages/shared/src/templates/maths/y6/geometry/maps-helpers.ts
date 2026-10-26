import type { Rng } from '../../../../rng';
import { ACCENT, INK, label, line, svgDoc } from '../../../svg';

// Grid maps for m6.geo.maps. As in the Year 6 curriculum, rows are labelled with letters (A at the
// top) and columns with numbers (1 on the left), so a square is named letter-then-number, e.g. B4.
// North is always up the page.

/** [column, row], both counted from 0. Column 0 is "1"; row 0 is "A". */
export type Square = [number, number];

export const ROWS = 'ABCDEFGH';
export const ref = ([c, r]: Square) => `${ROWS[r]}${c + 1}`;

export interface Place {
  name: string;
  at: Square;
}

export const MAPS = [
  { title: 'School camp', places: ['Tents', 'Kitchen', 'Lake', 'Kayaks', 'Flagpole', 'Toilets', 'Campfire', 'Hall', 'Beach', 'Wharf', 'Lookout', 'Bush walk', 'Cave', 'Bridge'] },
  { title: 'Our town', places: ['Pool', 'Shop', 'Park', 'Library', 'School', 'Marae', 'Dairy', 'Church', 'Station', 'Bakery', 'Museum', 'Wharf', 'Fire station', 'Skate park'] },
  { title: 'Farm park', places: ['Barn', 'Pond', 'Sheep', 'Cows', 'Goats', 'Gate', 'Shed', 'Orchard', 'Tractor', 'Picnic', 'Ducks', 'Hens', 'Horses', 'Café'] },
] as const;

export const DIRS = ['north', 'east', 'south', 'west'] as const;
export type Dir = (typeof DIRS)[number];
export const STEP: Record<Dir, Square> = { north: [0, -1], east: [1, 0], south: [0, 1], west: [-1, 0] };
export const turnDir = (d: Dir, quarterTurnsClockwise: number): Dir => DIRS[(((DIRS.indexOf(d) + quarterTurnsClockwise) % 4) + 4) % 4]!;
export const move = ([c, r]: Square, d: Dir, k: number): Square => [c + STEP[d][0] * k, r + STEP[d][1] * k];
export const inMap = ([c, r]: Square, cols: number, rows: number) => c >= 0 && r >= 0 && c < cols && r < rows;
export const sameSq = (a: Square, b: Square) => a[0] === b[0] && a[1] === b[1];

const COLOURS = ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#ea580c', '#0891b2', '#ca8a04', '#db2777'];

/** Places `names` in distinct random squares (avoiding `taken`). */
export function scatter(rng: Rng, names: readonly string[], cols: number, rows: number, taken: Square[] = []): Place[] {
  const used = [...taken];
  return names.map((name) => {
    for (;;) {
      const at: Square = [rng.int(0, cols - 1), rng.int(0, rows - 1)];
      if (!used.some((u) => sameSq(u, at))) {
        used.push(at);
        return { name, at };
      }
    }
  });
}

/** Draws the grid map with letters down the side, numbers along the top, places and a compass. */
export function drawMap(cols: number, rows: number, places: readonly Place[], o: { start?: Square; s?: number } = {}): string {
  const s = o.s ?? 44;
  const ox = 26;
  const oy = 26;
  const W = ox + cols * s + 76;
  const H = oy + rows * s + 12;
  let body = `<rect x="${ox}" y="${oy}" width="${cols * s}" height="${rows * s}" fill="#f0fdf4" stroke="${INK}" stroke-width="1.5"/>`;
  for (let c = 1; c < cols; c++) body += line({ x: ox + c * s, y: oy }, { x: ox + c * s, y: oy + rows * s }, { stroke: '#9ca3af', width: 1 });
  for (let r = 1; r < rows; r++) body += line({ x: ox, y: oy + r * s }, { x: ox + cols * s, y: oy + r * s }, { stroke: '#9ca3af', width: 1 });
  for (let c = 0; c < cols; c++) body += label({ x: ox + (c + 0.5) * s, y: oy - 12 }, String(c + 1), { bold: true, size: 13 });
  for (let r = 0; r < rows; r++) body += label({ x: ox - 13, y: oy + (r + 0.5) * s }, ROWS[r]!, { bold: true, size: 13 });
  if (o.start) {
    const [c, r] = o.start;
    body += `<rect x="${ox + c * s + 3}" y="${oy + r * s + 3}" width="${s - 6}" height="${s - 6}" fill="none" stroke="${ACCENT}" stroke-width="2.5" stroke-dasharray="4 3"/>`;
  }
  places.forEach((p, i) => {
    const [c, r] = p.at;
    const cx = ox + (c + 0.5) * s;
    const cy = oy + r * s;
    body += `<circle cx="${cx}" cy="${cy + s * 0.34}" r="${s * 0.14}" fill="${COLOURS[i % COLOURS.length]}" stroke="#ffffff" stroke-width="1.5"/>`;
    const words = p.name.split(' ');
    if (words.length > 1 && p.name.length > 8) {
      body += label({ x: cx, y: cy + s * 0.66 }, words[0]!, { size: 10 });
      body += label({ x: cx, y: cy + s * 0.86 }, words.slice(1).join(' '), { size: 10 });
    } else {
      body += label({ x: cx, y: cy + s * 0.72 }, p.name, { size: p.name.length > 7 ? 9.5 : 10.5 });
    }
  });
  // Compass rose to the right of the map.
  const kx = ox + cols * s + 40;
  const ky = oy + 40;
  body += line({ x: kx, y: ky - 22 }, { x: kx, y: ky + 22 }, { width: 1.5 });
  body += line({ x: kx - 22, y: ky }, { x: kx + 22, y: ky }, { width: 1.5 });
  body += `<polygon points="${kx},${ky - 26} ${kx - 6},${ky - 14} ${kx + 6},${ky - 14}" fill="${INK}"/>`;
  body += label({ x: kx, y: ky - 34 }, 'N', { bold: true, size: 13 });
  body += label({ x: kx, y: ky + 33 }, 'S', { size: 11 });
  body += label({ x: kx + 27, y: ky }, 'E', { size: 11 });
  body += label({ x: kx - 27, y: ky }, 'W', { size: 11 });
  return svgDoc(W, H, body);
}

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const squares = (n: number) => `${n} square${n === 1 ? '' : 's'}`;
