import { ACCENT, INK, label, line, svgDoc } from '../../svg';

// Probability figures: tree diagrams and spinners, built on templates/svg.ts.

const r2 = (n: number) => Math.round(n * 100) / 100;
const OUTCOME_TEXT = '#374151';

/** Rough half-width of a label in px (Arial, given font size). */
const halfWidth = (text: string, size: number) => (text.length * size * 0.56) / 2 + 4;

export interface TreeOptions {
  /** Probability written on each branch, per stage (same for every node in that stage), or per node path. */
  probs?: ReadonlyArray<ReadonlyArray<string>> | ((stage: number, path: readonly string[], branch: number) => string);
  /** Show the list of outcomes at the end of each final branch. */
  outcomes?: boolean;
  /** Separator between labels when listing outcomes (default ", " or "" for one-letter labels). */
  sep?: string;
}

/** A left-to-right tree diagram. `stages[i]` lists the branch labels at stage i. */
export function treeDiagram(stages: ReadonlyArray<ReadonlyArray<string>>, o: TreeOptions = {}): string {
  const d = stages.length;
  const leaves = stages.reduce((p, s) => p * s.length, 1);
  const rowH = leaves > 8 ? 22 : leaves > 4 ? 28 : 36;
  const top = 14;
  const height = top * 2 + leaves * rowH;
  const longest = Math.max(...stages.flat().map((s) => s.length));
  const colW = d >= 3 ? 92 : Math.max(110, 70 + longest * 7);
  const x0 = 14;
  const oneLetter = stages.every((s) => s.every((b) => b.length === 1));
  const sep = o.sep ?? (oneLetter ? '' : ', ');
  let body = `<circle cx="${x0}" cy="${r2(top + (leaves * rowH) / 2)}" r="3" fill="${INK}"/>`;
  let maxRight = 0;
  const probFor = (stage: number, path: readonly string[], k: number): string | undefined => {
    if (!o.probs) return undefined;
    if (typeof o.probs === 'function') return o.probs(stage, path, k);
    return o.probs[stage]?.[k];
  };
  const draw = (stage: number, firstLeaf: number, span: number, px: number, py: number, path: string[]) => {
    const branches = stages[stage]!;
    const sub = span / branches.length;
    branches.forEach((b, k) => {
      const lf = firstLeaf + k * sub;
      const cy = top + (lf + sub / 2) * rowH;
      const cx = x0 + (stage + 1) * colW;
      const hw = halfWidth(b, 13);
      const end = { x: cx - hw, y: cy };
      body += line({ x: px, y: py }, end, { width: 1.5 });
      body += label({ x: cx, y: cy }, b, { size: 13 });
      const p = probFor(stage, path, k);
      if (p) {
        const mx = (px + end.x) / 2;
        const my = (py + end.y) / 2;
        body += label({ x: mx, y: my + (cy < py ? -9 : cy > py ? 9 : -9) }, p, { size: 11, fill: ACCENT });
      }
      const next = [...path, b];
      if (stage + 1 < d) {
        draw(stage + 1, lf, sub, cx + hw, cy, next);
      } else {
        maxRight = Math.max(maxRight, cx + hw);
        if (o.outcomes) {
          const text = next.join(sep);
          body += label({ x: cx + hw + 22, y: cy }, text, { anchor: 'start', size: 12, fill: OUTCOME_TEXT });
          maxRight = Math.max(maxRight, cx + hw + 22 + text.length * 12 * 0.56);
        }
      }
    });
  };
  draw(0, 0, leaves, x0 + 3, top + (leaves * rowH) / 2, []);
  return svgDoc(Math.round(maxRight + 16), Math.round(height), body);
}

export const COLOUR_FILL: Record<string, string> = {
  red: '#fca5a5',
  blue: '#93c5fd',
  green: '#86efac',
  yellow: '#fde047',
  purple: '#d8b4fe',
  orange: '#fdba74',
  white: '#ffffff',
};

/** A spinner with equal sectors. Each sector has a text label (colour name or number) and a fill. */
export function spinner(sectors: ReadonlyArray<{ label: string; fill: string }>): string {
  const cx = 120;
  const cy = 120;
  const r = 100;
  const k = sectors.length;
  let body = '';
  sectors.forEach((s, i) => {
    const a1 = -Math.PI / 2 + (i * 2 * Math.PI) / k;
    const a2 = -Math.PI / 2 + ((i + 1) * 2 * Math.PI) / k;
    const p1 = { x: cx + r * Math.cos(a1), y: cy + r * Math.sin(a1) };
    const p2 = { x: cx + r * Math.cos(a2), y: cy + r * Math.sin(a2) };
    body += `<path d="M ${cx} ${cy} L ${r2(p1.x)} ${r2(p1.y)} A ${r} ${r} 0 0 1 ${r2(p2.x)} ${r2(p2.y)} Z" fill="${s.fill}" stroke="${INK}" stroke-width="1.5"/>`;
    const am = (a1 + a2) / 2;
    body += label({ x: cx + 64 * Math.cos(am), y: cy + 64 * Math.sin(am) }, s.label, { size: /^\d+$/.test(s.label) ? 16 : 13, bold: true });
  });
  // Pointer
  const tip = { x: cx + 34 * Math.cos(-Math.PI / 3), y: cy + 34 * Math.sin(-Math.PI / 3) };
  body += line({ x: cx, y: cy }, tip, { width: 3 });
  body += `<circle cx="${cx}" cy="${cy}" r="6" fill="${INK}"/>`;
  return svgDoc(240, 240, body);
}
