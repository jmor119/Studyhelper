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
    // Keep negative signs: "−14" (U+2212 minus, dashes) must not become "14".
    .replace(/[−‒–—﹣－]/g, '-')
    // Thousands separators: "1,283" and "1 283" both mean 1283.
    .replace(/(\d)[,   ](?=\d{3}(?!\d))/g, '$1')
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

const PLAIN_NUMBER = /^-?(?:\d+\.?\d*|\.\d+)$/;

const isPluralOf = (a: string, b: string) => a === `${b}s` || a === `${b}es` || (b.endsWith('y') && a === `${b.slice(0, -1)}ies`);

export function textMatches(given: string, target: string, allowTypos: boolean): boolean {
  const g = normaliseText(given);
  const t = normaliseText(target);
  if (!g) return false;
  if (g === t) return true;
  // Plain numbers match by value: "0.40" = "0.4" = ".4", "07" = "7".
  if (PLAIN_NUMBER.test(g) && PLAIN_NUMBER.test(t)) return Number(g) === Number(t);
  if (!allowTypos) return false;
  // Numbers and chemical formulae must be exact.
  if (/\d/.test(t)) return false;
  // Singular/plural slips are fine ("cell" for "cells").
  if (isPluralOf(g, t) || isPluralOf(t, g)) return true;
  // A different word is not a typo: "invertebrate" ≠ "vertebrate", "endothermic" ≠ "exothermic".
  if (differentPrefix(g, t)) return false;
  // Real typos rarely change the first letter ("father" ≠ "mother").
  if (g[0] !== t[0]) return false;
  // If the student wrote a real, different subject term ("chlorine" for "chloride", "waning" for
  // "waxing"), it's a misconception, not a typo.
  const gw = g.split(' ');
  const tw = t.split(' ');
  if (gw.length === tw.length && gw.some((w, i) => w !== tw[i] && KNOWN_TERMS.has(w))) return false;
  return editDistance(g, t) <= typoAllowance(t.length);
}

/**
 * Subject words that are easily confused with each other by spelling. A student answer containing
 * one of these in place of the expected word is never treated as a typo.
 */
const KNOWN_TERMS = new Set(
  `chloride chlorine fluoride fluorine bromide bromine iodide iodine sulfide sulfate sulfite oxide oxygen hydroxide hydrogen
  carbonate carbon carbide nitrate nitrite nitride nitrogen sodium potassium calcium magnesium
  conduction convection conductor conductors insulator insulators reflection refraction diffraction absorption
  transmission series parallel current voltage kinetic potential friction gravity weight mass velocity acceleration
  waxing waning crescent gibbous igneous sedimentary metamorphic magma lava mantle crust core erosion weathering
  deposition evaporation condensation precipitation transpiration respiration photosynthesis fermentation
  mitosis meiosis xylem phloem osmosis diffusion artery arteries vein veins capillary capillaries atrium ventricle
  producer producers consumer consumers decomposer decomposers herbivore herbivores carnivore carnivores omnivore
  omnivores predator predators prey vertebrate vertebrates invertebrate invertebrates genus genes gene species
  habitat habitats nucleus nuclei neutron neutrons proton protons electron electrons element elements compound
  compounds mixture mixtures solute solvent solution dissolve melt melting freezing boiling exothermic endothermic
  acid acidic alkali alkaline base neutral mean median mode range maximum minimum quartile
  north south east west north-east north-west south-east south-west northeast northwest southeast southwest
  tens tenths hundreds hundredths thousands thousandths acute obtuse reflex isosceles scalene equilateral
  parallelogram trapezium rhombus kite prism prisms pyramid pyramids numerator denominator factor factors
  multiple multiples prime composite horizontal vertical translation rotation perimeter area volume
  certain impossible likely unlikely`
    .split(/\s+/)
    .filter(Boolean),
);

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
