import type { Rng } from '../../../../rng';
import { frac } from '../../../format';
import { ACCENT, INK, label, line, svgDoc } from '../../../svg';

// Helpers for the Year 7 probability templates (m7.pro.*): fraction formatting, NZ contexts, and
// figures (spinners and tree diagrams) built on templates/svg.ts. Adapted for Year 7 from the
// Year 9 probability figures.

const r2 = (n: number) => Math.round(n * 100) / 100;

/** "\frac{4}{12} = \frac{1}{3}" (or just "\frac{3}{7}" when already simplest). */
export function pTex(n: number, d: number): string {
  const raw = frac(n, d, true);
  const simple = frac(n, d);
  return raw === simple ? raw : `${raw} = ${simple}`;
}

/** Prompt suffix and form for a fraction answer. Simplest form is only required when asked for. */
export function fractionAsk(rng: Rng, chanceSimplest: number): { text: string; form: 'any' | 'simplest-fraction' } {
  return rng.chance(chanceSimplest)
    ? { text: 'Give your answer as a fraction in its simplest form.', form: 'simplest-fraction' }
    : { text: 'Give your answer as a fraction.', form: 'any' };
}

export const COLOURS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'] as const;
export type Colour = (typeof COLOURS)[number];

export const COLOUR_FILL: Record<string, string> = {
  red: '#fca5a5',
  blue: '#93c5fd',
  green: '#86efac',
  yellow: '#fde047',
  purple: '#d8b4fe',
  orange: '#fdba74',
  white: '#ffffff',
};

/** "3 red, 5 blue and 2 green" */
export function listAnd(items: readonly string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

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
    body += label({ x: cx + 64 * Math.cos(am), y: cy + 64 * Math.sin(am) }, s.label, { size: /^\d+$/.test(s.label) ? 16 : 12, bold: true });
  });
  const tip = { x: cx + 34 * Math.cos(-Math.PI / 3), y: cy + 34 * Math.sin(-Math.PI / 3) };
  body += line({ x: cx, y: cy }, tip, { width: 3 });
  body += `<circle cx="${cx}" cy="${cy}" r="6" fill="${INK}"/>`;
  return svgDoc(240, 240, body);
}

/** Rough half-width of a label in px (Arial, given font size). */
const halfWidth = (text: string, size: number) => (text.length * size * 0.56) / 2 + 4;

/** A left-to-right tree diagram. `stages[i]` lists the branch labels at stage i. Outcomes are listed at the end. */
export function treeDiagram(stages: ReadonlyArray<ReadonlyArray<string>>, o: { outcomes?: boolean; sep?: string } = {}): string {
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
  const draw = (stage: number, firstLeaf: number, span: number, px: number, py: number, path: string[]) => {
    const branches = stages[stage]!;
    const sub = span / branches.length;
    branches.forEach((b, k) => {
      const lf = firstLeaf + k * sub;
      const cy = top + (lf + sub / 2) * rowH;
      const cx = x0 + (stage + 1) * colW;
      const hw = halfWidth(b, 13);
      body += line({ x: px, y: py }, { x: cx - hw, y: cy }, { width: 1.5 });
      body += label({ x: cx, y: cy }, b, { size: 13 });
      const next = [...path, b];
      if (stage + 1 < d) {
        draw(stage + 1, lf, sub, cx + hw, cy, next);
      } else {
        maxRight = Math.max(maxRight, cx + hw);
        if (o.outcomes) {
          const text = next.join(sep);
          body += label({ x: cx + hw + 22, y: cy }, text, { anchor: 'start', size: 12, fill: ACCENT });
          maxRight = Math.max(maxRight, cx + hw + 22 + text.length * 12 * 0.56);
        }
      }
    });
  };
  draw(0, 0, leaves, x0 + 3, top + (leaves * rowH) / 2, []);
  return svgDoc(Math.round(maxRight + 16), Math.round(height), body);
}

/** Markdown table of the sums (or another rule) for two dice or two spinners. */
export function gridTable(rows: readonly number[], cols: readonly number[], f: (a: number, b: number) => number | string, corner = '+'): string {
  const head = `| ${corner} | ${cols.join(' | ')} |`;
  const sepRow = `|${'---|'.repeat(cols.length + 1)}`;
  const body = rows.map((a) => `| **${a}** | ${cols.map((b) => f(a, b)).join(' | ')} |`);
  return [head, sepRow, ...body].join('\n');
}
