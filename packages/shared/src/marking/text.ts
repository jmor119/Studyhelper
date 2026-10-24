// Text answers: lenient normalisation, NZ/US spelling equivalence and small-typo tolerance.

/** US → NZ spellings (NZ English is canonical). Applied word-by-word. */
const SPELLING: Record<string, string> = {
  color: 'colour',
  colors: 'colours',
  vapor: 'vapour',
  vaporize: 'vaporise',
  vaporization: 'vaporisation',
  evaporize: 'evaporise',
  meter: 'metre',
  meters: 'metres',
  liter: 'litre',
  liters: 'litres',
  center: 'centre',
  fiber: 'fibre',
  aluminum: 'aluminium',
  sulphur: 'sulfur',
  sulphate: 'sulfate',
  hemoglobin: 'haemoglobin',
  fetus: 'foetus',
  esophagus: 'oesophagus',
  behavior: 'behaviour',
  neighbor: 'neighbour',
  analyze: 'analyse',
  catalyze: 'catalyse',
  organization: 'organisation',
  ionize: 'ionise',
  neutralize: 'neutralise',
  neutralization: 'neutralisation',
  crystalize: 'crystallise',
  crystallize: 'crystallise',
  sterilize: 'sterilise',
  gray: 'grey',
  mold: 'mould',
  favorite: 'favourite',
};

export function normaliseText(s: string): string {
  return s
    .normalize('NFKD') // NFKD also maps subscripts: H₂O → H2O
    .replace(/[\u0300-\u036f]/g, '') // strip macrons/diacritics: "kōura" → "koura"
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .replace(/[^a-z0-9'.\-+/<>= ]+/g, ' ')
    .replace(/\s*([<>]=?|=)\s*/g, ' $1 ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((w) => SPELLING[w] ?? w)
    .join(' ')
    .replace(/^(?:a|an|the) /, '')
    .replace(/[.]+$/, '');
}

/** Optimal-string-alignment distance (Levenshtein + adjacent transpositions). */
export function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > 3) return Math.abs(m - n);
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i]![j] = Math.min(d[i]![j]!, d[i - 2]![j - 2]! + 1);
      }
    }
  }
  return d[m]![n]!;
}

/** How many typos to forgive for a target of this length. Short words must be exact. */
function typoAllowance(len: number): number {
  if (len < 6) return 0;
  if (len < 10) return 1;
  return 2;
}

const isPluralOf = (a: string, b: string) => a === `${b}s` || a === `${b}es` || (b.endsWith('y') && a === `${b.slice(0, -1)}ies`);

export function textMatches(given: string, target: string, allowTypos: boolean): boolean {
  const g = normaliseText(given);
  const t = normaliseText(target);
  if (!g) return false;
  if (g === t) return true;
  if (!allowTypos) return false;
  // Numbers and chemical formulae must be exact.
  if (/\d/.test(t)) return false;
  // Singular/plural slips are fine ("cell" for "cells").
  if (isPluralOf(g, t) || isPluralOf(t, g)) return true;
  // A different word is not a typo: "invertebrate" ≠ "vertebrate", "endothermic" ≠ "exothermic".
  if (differentPrefix(g, t)) return false;
  // Real typos rarely change the first letter ("father" ≠ "mother").
  if (g[0] !== t[0]) return false;
  return editDistance(g, t) <= typoAllowance(t.length);
}

const PREFIXES = ['endo', 'exo', 'hyper', 'hypo', 'inter', 'intra', 'in', 'un', 'non', 'dis', 'sub', 'super', 'mono', 'poly', 'homo', 'hetero', 'micro', 'macro', 'uni', 'bi', 'tri', 'de', 're'];

/** True when the two words differ by an added or swapped meaning-changing prefix. */
function differentPrefix(a: string, b: string): boolean {
  if (a.length - b.length >= 2 && a.endsWith(b)) return true;
  if (b.length - a.length >= 2 && b.endsWith(a)) return true;
  const split = (w: string) => {
    const p = PREFIXES.find((x) => w.startsWith(x) && w.length - x.length >= 4);
    return p ? [p, w.slice(p.length)] : ['', w];
  };
  const [pa, ra] = split(a);
  const [pb, rb] = split(b);
  return pa !== pb && ra === rb;
}

/** True if a keyword (single word or phrase) appears in the answer as whole words, allowing small typos per word. */
export function containsKeyword(answer: string, keyword: string, allowTypos: boolean): boolean {
  const a = normaliseText(answer);
  const k = normaliseText(keyword);
  if (!k) return false;
  if (` ${a} `.includes(` ${k} `)) return true;
  if (!allowTypos) return false;
  const words = a.split(' ');
  const kWords = k.split(' ');
  for (let i = 0; i + kWords.length <= words.length; i++) {
    const window = words.slice(i, i + kWords.length).join(' ');
    if (textMatches(window, k, true)) return true;
  }
  return false;
}
