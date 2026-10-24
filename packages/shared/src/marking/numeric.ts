import { latexToPlain } from './latex';

export type NumberKind = 'integer' | 'decimal' | 'fraction' | 'mixed' | 'scientific';

export type ParsedNumber =
  | {
      ok: true;
      value: number;
      kind: NumberKind;
      /** For fractions / mixed numbers: numerator & denominator of the fractional part. */
      fraction?: { whole: number; num: number; den: number; negative: boolean };
      decimalPlaces: number;
      percent: boolean;
      /** Unit text the student typed, if any. */
      unit?: string;
      /** Letter the student wrote before "=", e.g. "y" in "y = 5". */
      variable?: string;
    }
  | { ok: false; reason: string };

const UNIT_ALIASES: Record<string, string> = {
  sec: 's',
  secs: 's',
  second: 's',
  seconds: 's',
  min: 'min',
  mins: 'min',
  minute: 'min',
  minutes: 'min',
  hr: 'h',
  hrs: 'h',
  hour: 'h',
  hours: 'h',
  degree: '°',
  degrees: '°',
  deg: '°',
  litre: 'l',
  litres: 'l',
  liter: 'l',
  liters: 'l',
  millilitre: 'ml',
  millilitres: 'ml',
  gram: 'g',
  grams: 'g',
  kilogram: 'kg',
  kilograms: 'kg',
  metre: 'm',
  metres: 'm',
  meter: 'm',
  meters: 'm',
  dollars: '$',
  dollar: '$',
  millimetre: 'mm',
  millimetres: 'mm',
  millimeter: 'mm',
  centimetre: 'cm',
  centimetres: 'cm',
  centimeter: 'cm',
  kilometre: 'km',
  kilometres: 'km',
  kilometer: 'km',
  micrometre: 'um',
  micrometres: 'um',
  micron: 'um',
  microns: 'um',
  newton: 'n',
  newtons: 'n',
  joule: 'j',
  joules: 'j',
  kph: 'km/h',
  'km/hr': 'km/h',
  'km/hour': 'km/h',
  'kmph': 'km/h',
  mps: 'm/s',
  'm/s/s': 'm/s2',
  'm/sec': 'm/s',
  amp: 'a',
  amps: 'a',
  ampere: 'a',
  amperes: 'a',
  volt: 'v',
  volts: 'v',
  watt: 'w',
  watts: 'w',
  kilojoule: 'kj',
  kilojoules: 'kj',
  ohm: 'Ω',
  ohms: 'Ω',
  times: 'x',
  '×': 'x',
};

/** Normalises unit text so "cm^2", "cm2", "cm²" and "CM²" compare equal. */
export function normaliseUnit(unit: string): string {
  // Micro sign (U+00B5), Greek mu (U+03BC) and a plain "u" all mean micro.
  let u = unit.trim().toLowerCase().replace(/\s+/g, '').replace(/[µμ]/g, 'u');
  u = u.replace(/\^\(?2\)?|²/g, '2').replace(/\^\(?3\)?|³/g, '3').replace(/·/g, '');
  u = u.replace(/\bper\b/g, '/');
  if (UNIT_ALIASES[u]) return UNIT_ALIASES[u]!;
  // Plural "cms", "kgs"
  if (u.length > 2 && u.endsWith('s') && !u.endsWith('/s') && !['ms', 'ks'].includes(u)) {
    const singular = u.slice(0, -1);
    if (UNIT_ALIASES[singular]) return UNIT_ALIASES[singular]!;
    if (/^(?:m|c|k|mm)?[mgl]$|^cm2$|^m2$|^km$|^mm$|^cm$/.test(singular)) return singular;
  }
  return u;
}

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

export function isSimplestFraction(num: number, den: number): boolean {
  return den > 1 && gcd(num, den) === 1;
}

function countDecimals(s: string): number {
  const dot = s.indexOf('.');
  return dot === -1 ? 0 : s.length - dot - 1;
}

/** Parses a student's numeric answer. Accepts NZ formats: "1 234.5", "1,234", "-3/4", "2 1/2", "$12.50", "25%", "12 cm", "3.2 × 10^4", "x = 5". */
export function parseNumber(raw: string): ParsedNumber {
  const prefix = raw.trim().match(/^([a-zA-Z])\s*=\s*/);
  const result = parseNumberInner(prefix ? raw.trim().slice(prefix[0].length) : raw);
  return result.ok && prefix ? { ...result, variable: prefix[1]!.toLowerCase() } : result;
}

function parseNumberInner(raw: string): ParsedNumber {
  // Magnification written as "×400", "x400" or "400×" (but not "x = 5" or "3 × 10^4").
  const trimmed = raw.trim();
  const magnification = trimmed.match(/^[×xX]\s*(\d[\d.,]*)$/) ?? trimmed.match(/^(\d[\d.,]*)\s*[×xX]$/);
  if (magnification) {
    const inner = parseNumber(magnification[1]!);
    return inner.ok ? { ...inner, unit: '×' } : inner;
  }
  let s = latexToPlain(raw)
    .replace(/[\u2212\u2013\u2014]/g, '-')
    .replace(/[×]/g, '*')
    .replace(/[÷]/g, '/')
    .replace(/[\u00a0\u2009\u202f]/g, ' ')
    .trim();
  if (!s) return { ok: false, reason: 'empty' };

  // "x = 5" → "5" (parseNumber records the letter).
  s = s.replace(/^[a-zA-Z]\s*=\s*/, '');

  let percent = false;
  let unit: string | undefined;

  // Currency
  s = s.replace(/^(-?)\s*\$\s*/, '$1');
  if (/\$$/.test(s)) s = s.slice(0, -1).trim();
  if (/^(-?)nz\$/i.test(s)) s = s.replace(/^(-?)nz\$/i, '$1');

  if (s.endsWith('%')) {
    percent = true;
    s = s.slice(0, -1).trim();
  }

  // Trailing unit: everything after the last digit (or closing paren) that starts with a letter/° symbol.
  const unitMatch = s.match(/^(.*?[\d)])\s*([a-zA-Zµμ°²³][a-zA-Z0-9µμ°²³/^·]*)$/);
  if (unitMatch && !/^(?:e[+-]?\d+)$/i.test(unitMatch[2]!)) {
    s = unitMatch[1]!.trim();
    unit = unitMatch[2]!;
  }

  const sign = (neg: string | undefined) => (neg === '-' ? -1 : 1);
  let m: RegExpMatchArray | null;

  // Mixed number "2 1/2" or "-2 1/2"
  if ((m = s.match(/^([+-]?)\s*(\d+)\s+(\d+)\s*\/\s*(\d+)$/))) {
    const whole = Number(m[2]);
    const num = Number(m[3]);
    const den = Number(m[4]);
    if (den === 0) return { ok: false, reason: 'divide-by-zero' };
    const value = sign(m[1]) * (whole + num / den);
    return {
      ok: true,
      value,
      kind: 'mixed',
      fraction: { whole, num, den, negative: m[1] === '-' },
      decimalPlaces: 0,
      percent,
      ...(unit && { unit }),
    };
  }

  // Fraction "-3/4", "3/-4", "(3)/(4)"
  if ((m = s.replace(/[()]/g, '').match(/^([+-]?)\s*(\d+)\s*\/\s*([+-]?)\s*(\d+)$/))) {
    const num = Number(m[2]);
    const den = Number(m[4]);
    if (den === 0) return { ok: false, reason: 'divide-by-zero' };
    const negative = (m[1] === '-') !== (m[3] === '-');
    return {
      ok: true,
      value: (negative ? -1 : 1) * (num / den),
      kind: 'fraction',
      fraction: { whole: 0, num, den, negative },
      decimalPlaces: 0,
      percent,
      ...(unit && { unit }),
    };
  }

  // Scientific "3.2*10^4", "3.2 x 10^(4)", "3.2e4"
  if (
    (m = s.match(/^([+-]?\d*\.?\d+)\s*(?:\*|x|X)\s*10\s*\^\s*\(?\s*([+-]?\d+)\s*\)?$/)) ||
    (m = s.match(/^([+-]?\d*\.?\d+)[eE]([+-]?\d+)$/))
  ) {
    const value = Number(m[1]) * 10 ** Number(m[2]);
    return {
      ok: true,
      value,
      kind: 'scientific',
      decimalPlaces: countDecimals(m[1]!),
      percent,
      ...(unit && { unit }),
    };
  }

  // Plain number with optional thousands separators (commas, or spaces in groups of three).
  const compact = s.replace(/^([+-]?)\s+/, '$1');
  if (
    /^[+-]?(?:\d{1,3}(?:,\d{3})+|\d{1,3}(?: \d{3})+|\d+)?(?:\.\d+)?$/.test(compact) &&
    /\d/.test(compact)
  ) {
    const cleaned = compact.replace(/[, ]/g, '');
    const value = Number(cleaned);
    if (!Number.isFinite(value)) return { ok: false, reason: 'not-a-number' };
    const dp = countDecimals(cleaned);
    return {
      ok: true,
      value,
      kind: dp > 0 ? 'decimal' : 'integer',
      decimalPlaces: dp,
      percent,
      ...(unit && { unit }),
    };
  }
  // "5." is a decimal too
  if ((m = compact.match(/^([+-]?\d+)\.$/))) {
    return { ok: true, value: Number(m[1]), kind: 'integer', decimalPlaces: 0, percent };
  }

  return { ok: false, reason: 'not-a-number' };
}
