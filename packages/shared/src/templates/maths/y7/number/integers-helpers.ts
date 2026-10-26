import { ACCENT, INK, dot, label, line, svgDoc } from '../../../svg';

// Number-line figures for m7.num.integers (questions and lesson pictures).

export interface NumberLineOptions {
  min: number;
  max: number;
  /** Which tick values get a number written under them. */
  labelled: (v: number) => boolean;
  /** Dots on the line, with text written above (e.g. "?" or "A"). */
  marks?: Array<{ at: number; text?: string }>;
  /** A curved arrow from one value to another, drawn above the line. */
  jump?: { from: number; to: number; text?: string };
  width?: number;
}

/** "−5" with a true minus sign, for figure labels. */
export const signed = (v: number) => (v < 0 ? `−${-v}` : String(v));

export function numberLineSvg(o: NumberLineOptions): string {
  const W = o.width ?? 420;
  const H = o.jump ? 118 : 84;
  const pad = 30;
  const y = H - 38;
  const x = (v: number) => pad + ((v - o.min) * (W - 2 * pad)) / (o.max - o.min);
  let body = '';
  // The line carries on forever, so it has arrowheads at both ends.
  const left = x(o.min) - 16;
  const right = x(o.max) + 16;
  body += line({ x: left, y }, { x: right, y });
  body += `<polygon points="${left - 8},${y} ${left + 2},${y - 5} ${left + 2},${y + 5}" fill="${INK}"/>`;
  body += `<polygon points="${right + 8},${y} ${right - 2},${y - 5} ${right - 2},${y + 5}" fill="${INK}"/>`;
  for (let v = o.min; v <= o.max; v++) {
    const big = v === 0;
    body += line({ x: x(v), y: y - (big ? 8 : 6) }, { x: x(v), y: y + (big ? 8 : 6) }, { width: big ? 2.2 : 1.5 });
    if (o.labelled(v)) body += label({ x: x(v), y: y + 20 }, signed(v), { size: 12, bold: big });
  }
  if (o.jump) {
    const x1 = x(o.jump.from);
    const x2 = x(o.jump.to);
    const top = y - 10 - Math.min(48, 14 + Math.abs(x2 - x1) * 0.35);
    const cx = (x1 + x2) / 2;
    body += `<path d="M ${x1.toFixed(1)} ${y - 4} Q ${cx.toFixed(1)} ${top.toFixed(1)} ${x2.toFixed(1)} ${y - 6}" fill="none" stroke="${ACCENT}" stroke-width="2"/>`;
    // Arrowhead pointing along the end of the curve.
    const dx = x2 - cx;
    const dy = y - 6 - top;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const tip = { x: x2, y: y - 5 };
    const back = { x: tip.x - ux * 10, y: tip.y - uy * 10 };
    const p1 = { x: back.x - uy * 5, y: back.y + ux * 5 };
    const p2 = { x: back.x + uy * 5, y: back.y - ux * 5 };
    body += `<polygon points="${tip.x.toFixed(1)},${tip.y.toFixed(1)} ${p1.x.toFixed(1)},${p1.y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}" fill="${ACCENT}"/>`;
    body += dot({ x: x1, y }, 4.5, INK);
    // The curve's highest point is halfway between the line and the control point.
    const peak = (y - 5 + top) / 2;
    if (o.jump.text) body += label({ x: cx, y: peak - 11 }, o.jump.text, { size: 13, fill: ACCENT, bold: true });
  }
  for (const m of o.marks ?? []) {
    body += dot({ x: x(m.at), y }, 5, ACCENT);
    if (m.text) body += label({ x: x(m.at), y: y - 20 }, m.text, { size: 15, fill: ACCENT, bold: true });
  }
  return svgDoc(W, H, body);
}
