// Converts the LaTeX produced by MathLive (and common typed variants) into plain maths syntax
// that the numeric and expression parsers understand. Not a general LaTeX parser — just the
// subset a student's maths keyboard emits.

/** Reads a balanced {...} group starting at s[i] === '{'. Returns [content, indexAfter]. */
function readGroup(s: string, i: number): [string, number] {
  if (s[i] !== '{') {
    // Single-token argument, e.g. \frac12
    return [s[i] ?? '', i + 1];
  }
  let depth = 0;
  for (let j = i; j < s.length; j++) {
    if (s[j] === '{') depth++;
    else if (s[j] === '}') {
      depth--;
      if (depth === 0) return [s.slice(i + 1, j), j + 1];
    }
  }
  return [s.slice(i + 1), s.length];
}

export function latexToPlain(input: string): string {
  let s = input;
  if (!s.includes('\\') && !s.includes('{')) return s;

  s = s
    .replace(/\\left|\\right/g, '')
    .replace(/\\[,;:!]|\\ |~/g, ' ')
    .replace(/\\(?:cdot|times|ast)/g, '*')
    .replace(/\\div/g, '/')
    .replace(/\\pi/g, 'pi')
    .replace(/\\%/g, '%')
    .replace(/\\\$/g, '$')
    .replace(/\\degree|\^\{?\\circ\}?/g, '°')
    .replace(/\\(?:mathrm|text|operatorname|mathit)\{([^{}]*)\}/g, '$1');

  // Structural commands with group arguments: \frac, \dfrac, \tfrac, \sqrt.
  let out = '';
  for (let i = 0; i < s.length; ) {
    const rest = s.slice(i);
    const frac = rest.match(/^\\[dt]?frac/);
    if (frac) {
      let j = i + frac[0].length;
      const [num, afterNum] = readGroup(s, j);
      j = afterNum;
      const [den, afterDen] = readGroup(s, j);
      // A digit right before \frac is a mixed number: 2\frac{1}{2} → "2 1/2".
      const mixed = /\d$/.test(out);
      const n = latexToPlain(num);
      const d = latexToPlain(den);
      const simple = /^\d+$/.test(n) && /^\d+$/.test(d);
      out += mixed ? ` ${n}/${d}` : simple ? `${n}/${d}` : `((${n})/(${d}))`;
      i = afterDen;
      continue;
    }
    if (rest.startsWith('\\sqrt')) {
      const [arg, after] = readGroup(s, i + 5);
      out += `sqrt(${latexToPlain(arg)})`;
      i = after;
      continue;
    }
    if (rest.startsWith('^{')) {
      const [arg, after] = readGroup(s, i + 1);
      out += `^(${latexToPlain(arg)})`;
      i = after;
      continue;
    }
    if (rest.startsWith('_{')) {
      // Subscripts aren't meaningful in answers; drop them.
      const [, after] = readGroup(s, i + 1);
      i = after;
      continue;
    }
    out += s[i];
    i++;
  }
  return out.replace(/[{}]/g, (b) => (b === '{' ? '(' : ')')).replace(/\\/g, '');
}
