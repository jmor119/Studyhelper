// Tiny SVG builder for question figures. Figures render as <img src="data:image/svg+xml,…">,
// so they must be self-contained (no external fonts or images) and use explicit colours.

export const INK = '#1f2937';
export const ACCENT = '#2563eb';
export const MUTED = '#9ca3af';
export const FILL = '#dbeafe';

export interface Pt {
  x: number;
  y: number;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const r2 = (n: number) => Math.round(n * 100) / 100;

export function svgDoc(width: number, height: number, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" font-family="Arial, Helvetica, sans-serif" font-size="14"><rect width="100%" height="100%" fill="#ffffff"/>${body}</svg>`;
}

export function line(a: Pt, b: Pt, opts: { stroke?: string; width?: number; dash?: boolean } = {}): string {
  return `<line x1="${r2(a.x)}" y1="${r2(a.y)}" x2="${r2(b.x)}" y2="${r2(b.y)}" stroke="${opts.stroke ?? INK}" stroke-width="${opts.width ?? 2}"${opts.dash ? ' stroke-dasharray="5 4"' : ''}/>`;
}

export function polygon(points: Pt[], opts: { fill?: string; stroke?: string } = {}): string {
  const p = points.map((pt) => `${r2(pt.x)},${r2(pt.y)}`).join(' ');
  return `<polygon points="${p}" fill="${opts.fill ?? FILL}" stroke="${opts.stroke ?? INK}" stroke-width="2"/>`;
}

export function circle(c: Pt, r: number, opts: { fill?: string; stroke?: string } = {}): string {
  return `<circle cx="${r2(c.x)}" cy="${r2(c.y)}" r="${r2(r)}" fill="${opts.fill ?? 'none'}" stroke="${opts.stroke ?? INK}" stroke-width="2"/>`;
}

export function dot(c: Pt, r = 3.5, fill = INK): string {
  return `<circle cx="${r2(c.x)}" cy="${r2(c.y)}" r="${r}" fill="${fill}"/>`;
}

export function label(
  at: Pt,
  text: string,
  opts: { anchor?: 'start' | 'middle' | 'end'; size?: number; fill?: string; bold?: boolean } = {},
): string {
  return `<text x="${r2(at.x)}" y="${r2(at.y)}" text-anchor="${opts.anchor ?? 'middle'}" dominant-baseline="middle" font-size="${opts.size ?? 14}" fill="${opts.fill ?? INK}"${opts.bold ? ' font-weight="bold"' : ''}>${esc(text)}</text>`;
}

/** Label placed at the midpoint of a segment, pushed outward by `offset` px (perpendicular). */
export function sideLabel(a: Pt, b: Pt, text: string, offset = 14): string {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  return label({ x: mx + (dy / len) * offset, y: my - (dx / len) * offset }, text);
}

/** Small square marking a right angle at `corner`, between directions to p1 and p2. */
export function rightAngleMark(corner: Pt, p1: Pt, p2: Pt, size = 12): string {
  const u = (p: Pt) => {
    const dx = p.x - corner.x;
    const dy = p.y - corner.y;
    const l = Math.hypot(dx, dy) || 1;
    return { x: (dx / l) * size, y: (dy / l) * size };
  };
  const a = u(p1);
  const b = u(p2);
  const pts = [
    { x: corner.x + a.x, y: corner.y + a.y },
    { x: corner.x + a.x + b.x, y: corner.y + a.y + b.y },
    { x: corner.x + b.x, y: corner.y + b.y },
  ];
  return `<polyline points="${pts.map((p) => `${r2(p.x)},${r2(p.y)}`).join(' ')}" fill="none" stroke="${INK}" stroke-width="1.5"/>`;
}

/** Arc marking the angle at `vertex` from direction p1 to p2 (the smaller angle), with optional label. */
export function angleArc(vertex: Pt, p1: Pt, p2: Pt, text?: string, radius = 24): string {
  const a1 = Math.atan2(p1.y - vertex.y, p1.x - vertex.x);
  const a2 = Math.atan2(p2.y - vertex.y, p2.x - vertex.x);
  let delta = a2 - a1;
  while (delta <= -Math.PI) delta += 2 * Math.PI;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  const start = { x: vertex.x + radius * Math.cos(a1), y: vertex.y + radius * Math.sin(a1) };
  const end = { x: vertex.x + radius * Math.cos(a1 + delta), y: vertex.y + radius * Math.sin(a1 + delta) };
  const sweep = delta > 0 ? 1 : 0;
  let out = `<path d="M ${r2(start.x)} ${r2(start.y)} A ${radius} ${radius} 0 0 ${sweep} ${r2(end.x)} ${r2(end.y)}" fill="none" stroke="${ACCENT}" stroke-width="1.8"/>`;
  if (text) {
    const mid = a1 + delta / 2;
    out += label({ x: vertex.x + (radius + 14) * Math.cos(mid), y: vertex.y + (radius + 14) * Math.sin(mid) }, text, {
      fill: ACCENT,
    });
  }
  return out;
}

export interface GridOptions {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  /** Pixels per unit. */
  scale?: number;
  padding?: number;
}

/**
 * Coordinate plane helper. Returns a mapper from maths coordinates to SVG pixels plus the
 * grid/axes markup. Use `toPx` to place your own points and lines.
 */
export function coordinatePlane(o: GridOptions): { width: number; height: number; toPx: (p: Pt) => Pt; body: string } {
  const scale = o.scale ?? 28;
  const pad = o.padding ?? 24;
  const width = (o.xMax - o.xMin) * scale + pad * 2;
  const height = (o.yMax - o.yMin) * scale + pad * 2;
  const toPx = (p: Pt): Pt => ({ x: pad + (p.x - o.xMin) * scale, y: pad + (o.yMax - p.y) * scale });
  let body = '';
  for (let x = o.xMin; x <= o.xMax; x++) {
    body += line(toPx({ x, y: o.yMin }), toPx({ x, y: o.yMax }), { stroke: '#e5e7eb', width: 1 });
  }
  for (let y = o.yMin; y <= o.yMax; y++) {
    body += line(toPx({ x: o.xMin, y }), toPx({ x: o.xMax, y }), { stroke: '#e5e7eb', width: 1 });
  }
  if (o.yMin <= 0 && o.yMax >= 0) body += line(toPx({ x: o.xMin, y: 0 }), toPx({ x: o.xMax, y: 0 }), { width: 1.5 });
  if (o.xMin <= 0 && o.xMax >= 0) body += line(toPx({ x: 0, y: o.yMin }), toPx({ x: 0, y: o.yMax }), { width: 1.5 });
  for (let x = o.xMin; x <= o.xMax; x++) {
    if (x !== 0 && (o.xMax - o.xMin <= 12 || x % 2 === 0)) {
      body += label({ ...toPx({ x, y: 0 }), y: toPx({ x, y: 0 }).y + 13 }, String(x).replace('-', '−'), { size: 11, fill: '#4b5563' });
    }
  }
  for (let y = o.yMin; y <= o.yMax; y++) {
    if (y !== 0 && (o.yMax - o.yMin <= 12 || y % 2 === 0)) {
      body += label({ x: toPx({ x: 0, y }).x - 12, y: toPx({ x: 0, y }).y }, String(y).replace('-', '−'), { size: 11, fill: '#4b5563' });
    }
  }
  body += label({ x: toPx({ x: o.xMax, y: 0 }).x + 12, y: toPx({ x: 0, y: 0 }).y }, 'x', { size: 13 });
  body += label({ x: toPx({ x: 0, y: o.yMax }).x, y: toPx({ x: 0, y: o.yMax }).y - 12 }, 'y', { size: 13 });
  return { width, height, toPx, body };
}
