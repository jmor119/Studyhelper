// Formatting helpers for template authors. All output is Markdown + KaTeX ($…$) in NZ English.

export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

export function lcm(a: number, b: number): number {
  return Math.abs(a * b) / gcd(a, b);
}

/** Rounds to n decimal places without floating-point noise (e.g. 2.675 → 2.68). */
export function round(x: number, dp = 0): number {
  const f = 10 ** dp;
  return Math.round((x + Number.EPSILON * Math.sign(x)) * f) / f;
}

/** Removes floating-point noise: 0.1 + 0.2 → 0.3. */
export function clean(x: number): number {
  return Number.parseFloat(x.toPrecision(12));
}

/** NZ number formatting with thousands separators: 12345.6 → "12,345.6". Uses a true minus sign. */
export function num(x: number, dp?: number): string {
  const v = dp === undefined ? clean(x) : round(x, dp);
  const s = v.toLocaleString('en-NZ', {
    minimumFractionDigits: dp ?? 0,
    maximumFractionDigits: dp ?? 10,
  });
  return s.replace('-', '−');
}

/** Number for use inside KaTeX: thousands separators as {,} so KaTeX doesn't add a space. */
export function tex(x: number, dp?: number): string {
  return num(x, dp).replace(/,/g, '{,}').replace('−', '-');
}

/** A number wrapped in brackets if negative, for substitution: −3 → "(-3)". */
export function texSigned(x: number): string {
  return x < 0 ? `(${tex(x)})` : tex(x);
}

/** Money: 12.5 → "$12.50". */
export function money(x: number): string {
  const s = `$${Math.abs(round(x, 2)).toLocaleString('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return x < 0 ? `−${s}` : s;
}

/** LaTeX fraction (simplified unless keep=true). Whole numbers print plainly. */
export function frac(n: number, d: number, keep = false): string {
  if (d === 0) throw new Error('frac: zero denominator');
  let a = n;
  let b = d;
  if (b < 0) {
    a = -a;
    b = -b;
  }
  if (!keep) {
    const g = gcd(a, b);
    a /= g;
    b /= g;
  }
  if (b === 1) return `${a}`;
  return a < 0 ? `-\\frac{${-a}}{${b}}` : `\\frac{${a}}{${b}}`;
}

/** Mixed-number LaTeX for an improper fraction: 7/4 → "1\frac{3}{4}". */
export function mixed(n: number, d: number): string {
  const g = gcd(n, d);
  let a = n / g;
  const b = d / g;
  const neg = a < 0;
  a = Math.abs(a);
  const whole = Math.floor(a / b);
  const rem = a % b;
  const body = rem === 0 ? `${whole}` : whole === 0 ? `\\frac{${rem}}{${b}}` : `${whole}\\frac{${rem}}{${b}}`;
  return neg ? `-${body}` : body;
}

/**
 * Formats a linear term: (3,'x') → "3x", (1,'x') → "x", (-1,'x') → "-x", (0,'x') → "".
 * `first` controls whether a leading "+" is added for positive terms.
 */
export function term(coef: number, variable = '', first = true): string {
  if (coef === 0) return '';
  const abs = Math.abs(coef);
  const body = variable ? `${abs === 1 ? '' : abs}${variable}` : `${abs}`;
  if (first) return coef < 0 ? `-${body}` : body;
  return coef < 0 ? ` - ${body}` : ` + ${body}`;
}

/** Joins terms into a polynomial string, skipping zeros: [[2,'x'],[-3,'']] → "2x - 3". */
export function poly(terms: Array<[number, string]>): string {
  const nonZero = terms.filter(([c]) => c !== 0);
  if (!nonZero.length) return '0';
  return nonZero.map(([c, v], i) => term(c, v, i === 0)).join('');
}

/** mathjs-syntax version of poly for expression answers: "2*x - 3". */
export function polyAnswer(terms: Array<[number, string]>): string {
  const nonZero = terms.filter(([c]) => c !== 0);
  if (!nonZero.length) return '0';
  return nonZero
    .map(([c, v], i) => {
      const abs = Math.abs(c);
      const body = v ? (abs === 1 ? v : `${abs}*${v}`) : `${abs}`;
      if (i === 0) return c < 0 ? `-${body}` : body;
      return c < 0 ? ` - ${body}` : ` + ${body}`;
    })
    .join('');
}

/** Ordinal for NZ English: 1 → "1st". */
export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

/** Common NZ first names (mixed backgrounds) for word problems. */
export const NAMES = [
  'Aroha', 'Tama', 'Mere', 'Nikau', 'Ana', 'Sione', 'Losa', 'Wiremu', 'Priya', 'Jack', 'Olivia', 'Liam',
  'Isla', 'Mateo', 'Hana', 'Kai', 'Grace', 'Ethan', 'Mia', 'Noah', 'Ruby', 'Leo', 'Talia', 'Rawiri',
  'Amelia', 'Hemi', 'Sofia', 'Tevita', 'Ella', 'Arjun',
] as const;

/** NZ places for contexts. */
export const PLACES = [
  'Auckland', 'Wellington', 'Christchurch', 'Hamilton', 'Tauranga', 'Dunedin', 'Palmerston North', 'Napier',
  'Nelson', 'Rotorua', 'New Plymouth', 'Whangārei', 'Invercargill', 'Queenstown', 'Gisborne', 'Timaru',
] as const;
