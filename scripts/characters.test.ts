// Character artwork checks: every character has an SVG that follows docs/CHARACTER-ART.md's hard
// rules, and the robot generator only ever produces SVG that follows them too.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { CHARACTERS } from '@study-helper/shared/rewards';
import { describe, expect, it } from 'vitest';
import { robotName, robotSvg } from '../apps/web/src/components/rewards/robot';

const dir = path.resolve(import.meta.dirname, '../apps/web/public/characters');
const ALLOWED = new Set(['svg', 'g', 'path', 'circle', 'ellipse', 'rect', 'polygon', 'polyline', 'line', 'defs', 'lineargradient', 'radialgradient', 'stop', 'clippath']);
const ROOT = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">';

function problems(svg: string, idPrefix: string): string[] {
  const out: string[] = [];
  if (!svg.trimStart().startsWith(ROOT)) out.push('root tag');
  if (svg.length > 6 * 1024) out.push(`too big (${svg.length} bytes)`);
  for (const [, tag] of svg.matchAll(/<\/?([a-zA-Z][\w:-]*)/g)) if (!ALLOWED.has(tag!.toLowerCase())) out.push(`<${tag}>`);
  if (/\s(on\w+|href|xlink:href|class|style)\s*=/i.test(svg)) out.push('forbidden attribute');
  if (/url\(\s*['"]?(?!#)/i.test(svg)) out.push('external url()');
  for (const [, id] of svg.matchAll(/\sid="([^"]+)"/g)) if (!id!.startsWith(idPrefix)) out.push(`id ${id} not prefixed`);
  return out;
}

describe('character artwork', () => {
  it('has a safe, on-spec SVG for every character, and no strays', () => {
    const files = readdirSync(dir).filter((f) => f.endsWith('.svg'));
    expect(files.sort()).toEqual(CHARACTERS.map((c) => `${c.id}.svg`).sort());
    for (const c of CHARACTERS) {
      expect(problems(readFileSync(path.join(dir, `${c.id}.svg`), 'utf8'), `${c.id}-`), c.id).toEqual([]);
    }
  });

  it('generates safe, deterministic robots', () => {
    for (let i = 0; i < 300; i++) {
      const seed = ((i * 2654435761) >>> 8).toString(16).padStart(6, '0').slice(-6);
      const svg = robotSvg(seed);
      expect(problems(svg, 'robot-'), seed).toEqual([]);
      expect(robotSvg(seed)).toBe(svg);
      expect(robotName(seed)).toMatch(/^[A-Z][a-z]+-\d{2}$/);
    }
    expect(problems(robotSvg('"><script>'), 'robot-')).toEqual([]);
  });
});
