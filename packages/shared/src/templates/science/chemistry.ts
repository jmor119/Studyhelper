import type { Rng } from '../../rng';
import type { QuestionTemplate, TemplateOutput } from '../types';

// Calculation and recall templates for chemistry topics. Answers are computed from the data
// tables below (element data, a formula parser, salt-naming rules), never typed in by hand.

// ---------------------------------------------------------------------------------------------
// Element data: the first 20 elements plus the common metals students are expected to know.
// ---------------------------------------------------------------------------------------------

type Kind = 'metal' | 'non-metal' | 'metalloid';

interface Element {
  z: number;
  symbol: string;
  name: string;
  kind: Kind;
  group: number;
  period: number;
}

const ELEMENTS: readonly Element[] = [
  { z: 1, symbol: 'H', name: 'hydrogen', kind: 'non-metal', group: 1, period: 1 },
  { z: 2, symbol: 'He', name: 'helium', kind: 'non-metal', group: 18, period: 1 },
  { z: 3, symbol: 'Li', name: 'lithium', kind: 'metal', group: 1, period: 2 },
  { z: 4, symbol: 'Be', name: 'beryllium', kind: 'metal', group: 2, period: 2 },
  { z: 5, symbol: 'B', name: 'boron', kind: 'metalloid', group: 13, period: 2 },
  { z: 6, symbol: 'C', name: 'carbon', kind: 'non-metal', group: 14, period: 2 },
  { z: 7, symbol: 'N', name: 'nitrogen', kind: 'non-metal', group: 15, period: 2 },
  { z: 8, symbol: 'O', name: 'oxygen', kind: 'non-metal', group: 16, period: 2 },
  { z: 9, symbol: 'F', name: 'fluorine', kind: 'non-metal', group: 17, period: 2 },
  { z: 10, symbol: 'Ne', name: 'neon', kind: 'non-metal', group: 18, period: 2 },
  { z: 11, symbol: 'Na', name: 'sodium', kind: 'metal', group: 1, period: 3 },
  { z: 12, symbol: 'Mg', name: 'magnesium', kind: 'metal', group: 2, period: 3 },
  { z: 13, symbol: 'Al', name: 'aluminium', kind: 'metal', group: 13, period: 3 },
  { z: 14, symbol: 'Si', name: 'silicon', kind: 'metalloid', group: 14, period: 3 },
  { z: 15, symbol: 'P', name: 'phosphorus', kind: 'non-metal', group: 15, period: 3 },
  { z: 16, symbol: 'S', name: 'sulfur', kind: 'non-metal', group: 16, period: 3 },
  { z: 17, symbol: 'Cl', name: 'chlorine', kind: 'non-metal', group: 17, period: 3 },
  { z: 18, symbol: 'Ar', name: 'argon', kind: 'non-metal', group: 18, period: 3 },
  { z: 19, symbol: 'K', name: 'potassium', kind: 'metal', group: 1, period: 4 },
  { z: 20, symbol: 'Ca', name: 'calcium', kind: 'metal', group: 2, period: 4 },
  { z: 26, symbol: 'Fe', name: 'iron', kind: 'metal', group: 8, period: 4 },
  { z: 29, symbol: 'Cu', name: 'copper', kind: 'metal', group: 11, period: 4 },
  { z: 30, symbol: 'Zn', name: 'zinc', kind: 'metal', group: 12, period: 4 },
  { z: 47, symbol: 'Ag', name: 'silver', kind: 'metal', group: 11, period: 5 },
  { z: 50, symbol: 'Sn', name: 'tin', kind: 'metal', group: 14, period: 5 },
  { z: 79, symbol: 'Au', name: 'gold', kind: 'metal', group: 11, period: 6 },
  { z: 80, symbol: 'Hg', name: 'mercury', kind: 'metal', group: 12, period: 6 },
  { z: 82, symbol: 'Pb', name: 'lead', kind: 'metal', group: 14, period: 6 },
];

const bySymbol = new Map(ELEMENTS.map((e) => [e.symbol, e]));
const el = (symbol: string): Element => {
  const e = bySymbol.get(symbol);
  if (!e) throw new Error(`Unknown element ${symbol}`);
  return e;
};

const FIRST_20 = ELEMENTS.filter((e) => e.z <= 20);
const FIRST_20_LIST = FIRST_20.map((e) => e.symbol).join(', ');

/** Latin names behind the symbols that don't match the English name. */
const LATIN: Record<string, string> = {
  Na: 'natrium',
  K: 'kalium',
  Fe: 'ferrum',
  Cu: 'cuprum',
  Ag: 'argentum',
  Sn: 'stannum',
  Au: 'aurum',
  Hg: 'hydrargyrum',
  Pb: 'plumbum',
};

/** Plausible wrong symbols for each element (common slips: first letter only, wrong second letter). */
const WRONG_SYMBOLS: Record<string, readonly string[]> = {
  H: ['He', 'Hy', 'Hd'],
  He: ['H', 'Hl', 'Hm'],
  Li: ['L', 'Lt', 'Lm'],
  Be: ['B', 'Br', 'By'],
  B: ['Bo', 'Br', 'Be'],
  C: ['Ca', 'Cb', 'Co'],
  N: ['Ni', 'Na', 'Nt'],
  O: ['Ox', 'Os', 'Oy'],
  F: ['Fl', 'Fe', 'Fr'],
  Ne: ['N', 'Ni', 'Nn'],
  Na: ['S', 'So', 'Sd'],
  Mg: ['Ma', 'Mn', 'Mm'],
  Al: ['A', 'Am', 'Au'],
  Si: ['S', 'Sn', 'Sl'],
  P: ['Ph', 'Po', 'Pr'],
  S: ['Su', 'Sf', 'Sl'],
  Cl: ['C', 'Ch', 'Cr'],
  Ar: ['A', 'Ag', 'Am'],
  K: ['P', 'Po', 'Pt'],
  Ca: ['C', 'Cl', 'Cm'],
  Fe: ['I', 'Ir', 'Io'],
  Cu: ['Co', 'C', 'Cp'],
  Zn: ['Z', 'Zi', 'Zc'],
  Ag: ['Si', 'S', 'Sv'],
  Sn: ['T', 'Ti', 'Tn'],
  Au: ['G', 'Go', 'Ag'],
  Hg: ['M', 'Me', 'Mr'],
  Pb: ['L', 'Le', 'Ld'],
};

/** Element names students confuse with each symbol (filled up with others from the table). */
const CONFUSED_NAMES: Record<string, readonly string[]> = {
  H: ['helium', 'mercury'],
  He: ['hydrogen', 'mercury'],
  Li: ['lead'],
  Be: ['boron', 'bromine'],
  B: ['beryllium', 'bromine'],
  C: ['calcium', 'chlorine', 'copper'],
  N: ['neon', 'sodium', 'nickel'],
  O: ['nitrogen'],
  F: ['iron', 'phosphorus'],
  Ne: ['nitrogen', 'nickel', 'sodium'],
  Na: ['nitrogen', 'neon', 'nickel'],
  Mg: ['manganese', 'mercury'],
  Al: ['argon', 'gold'],
  Si: ['sulfur', 'silver', 'tin'],
  P: ['potassium', 'lead'],
  S: ['sodium', 'silicon', 'silver'],
  Cl: ['carbon', 'calcium', 'copper'],
  Ar: ['aluminium', 'silver'],
  K: ['krypton', 'calcium'],
  Ca: ['carbon', 'chlorine', 'copper'],
  Fe: ['fluorine', 'lead'],
  Cu: ['carbon', 'calcium'],
  Zn: ['tin'],
  Ag: ['argon', 'gold', 'aluminium'],
  Sn: ['sodium', 'sulfur', 'silicon'],
  Au: ['silver', 'aluminium', 'argon'],
  Hg: ['hydrogen', 'helium', 'magnesium'],
  Pb: ['phosphorus', 'potassium'],
};

/** Symbols that start with the element's English name, so they can be worked out (difficulty 1). */
const EASY_SYMBOLS = ['H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'Ca', 'Zn'];
/** Symbols from Latin names (difficulty 2). */
const LATIN_SYMBOLS = ['Na', 'K', 'Fe', 'Cu', 'Ag', 'Sn', 'Au', 'Hg', 'Pb'];
const TWO_LETTER = ELEMENTS.filter((e) => e.symbol.length === 2).map((e) => e.symbol);

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Builds MCQ fields from a correct answer and distractors (ids a–d; the app shuffles). */
function mcq(correct: string, wrong: readonly string[], rng: Rng, shuffle = true) {
  const texts = shuffle ? rng.shuffle([correct, ...wrong]) : [correct, ...wrong];
  const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
  const options = texts.map((text, i) => ({ id: ids[i]!, text }));
  return { options, correct: options.find((o) => o.text === correct)!.id };
}

/** Picks n distinct items, taking from `preferred` first and topping up from `pool`. */
function pickDistinct(rng: Rng, preferred: readonly string[], pool: readonly string[], n: number, exclude: string): string[] {
  const out: string[] = [];
  for (const p of rng.shuffle(preferred)) {
    if (out.length < n && p !== exclude && !out.includes(p)) out.push(p);
  }
  for (const p of rng.shuffle(pool)) {
    if (out.length < n && p !== exclude && !out.includes(p)) out.push(p);
  }
  return out;
}

function symbolSolution(e: Element): string {
  const latin = LATIN[e.symbol];
  const origin = latin
    ? `The symbol comes from its Latin name, *${latin}*.`
    : e.symbol.length === 1
      ? 'The symbol is the first letter of its name.'
      : e.name.slice(0, 2).toLowerCase() === e.symbol.toLowerCase()
        ? 'The symbol is the first two letters of its name.'
        : 'The symbol is the first letter of its name plus another letter from the name.';
  return `The symbol for ${e.name} is **${e.symbol}**. ${origin}\n\nA symbol always starts with a capital letter, and any second letter is lower case.`;
}

export const elementSymbols: QuestionTemplate = {
  id: 's9.chem.atoms-elements.symbols',
  topicId: 's9.chem.atoms-elements',
  title: 'Element names and symbols',
  difficulties: [1, 2],
  generate({ rng, difficulty }) {
    if (difficulty === 2 && rng.chance(0.35)) {
      // Capitalisation: which way of writing the symbol is correct?
      const e = el(rng.pick(TWO_LETTER));
      const [a, b] = [e.symbol[0]!, e.symbol[1]!];
      const wrong = [`${a}${b.toUpperCase()}`, `${a.toLowerCase()}${b}`, `${a.toLowerCase()}${b.toUpperCase()}`];
      return {
        type: 'mcq',
        prompt: `Which is the correct way to write the chemical symbol for **${e.name}**?`,
        ...mcq(e.symbol, wrong, rng),
        hints: ['Look carefully at which letters are capitals. Think of how the symbol for cobalt, Co, is written.'],
        solution: `**${e.symbol}** is correct. The first letter is a capital and the second is lower case.\n\nThis matters: Co is the element cobalt, but CO is carbon monoxide, a compound of carbon and oxygen.`,
      };
    }
    const symbol = rng.pick(difficulty === 1 ? EASY_SYMBOLS : LATIN_SYMBOLS);
    const e = el(symbol);
    if (rng.chance(0.5)) {
      // Name → symbol
      return {
        type: 'mcq',
        prompt: `What is the chemical symbol for **${e.name}**?`,
        ...mcq(e.symbol, WRONG_SYMBOLS[e.symbol]!, rng),
        hints: [
          difficulty === 1
            ? 'This symbol comes from letters in the English name.'
            : 'Some symbols come from old Latin names, so they don\'t match the English name.',
        ],
        solution: symbolSolution(e),
      };
    }
    // Symbol → name
    const others = ELEMENTS.map((x) => x.name);
    const wrong = pickDistinct(rng, CONFUSED_NAMES[e.symbol] ?? [], others, 3, e.name);
    return {
      type: 'mcq',
      prompt: `Which element has the chemical symbol **${e.symbol}**?`,
      ...mcq(cap(e.name), wrong.map(cap), rng),
      hints: [
        difficulty === 1
          ? 'For most elements the symbol is the first letter (or first two letters) of the name.'
          : 'This symbol comes from a Latin name, so it doesn\'t match the English name.',
      ],
      solution: symbolSolution(e),
    };
  },
};

// ---------------------------------------------------------------------------------------------
// Protons and electrons from the atomic number.
// ---------------------------------------------------------------------------------------------

export const protonsElectrons: QuestionTemplate = {
  id: 's9.chem.atoms-elements.protons-electrons',
  topicId: 's9.chem.atoms-elements',
  title: 'Protons and electrons from the atomic number',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    if (difficulty === 3) {
      const e = rng.pick(FIRST_20);
      const byElectrons = rng.chance(0.5);
      // Neighbouring elements make the best distractors (an off-by-one count is the usual slip).
      const wrongZ = [e.z - 1, e.z + 1, e.z - 2, e.z + 2, e.z - 3, e.z + 3].filter((z) => z >= 1 && z <= 20).slice(0, 3);
      const wrong = wrongZ.map((z) => cap(FIRST_20.find((x) => x.z === z)!.name));
      return {
        type: 'mcq',
        prompt: byElectrons
          ? `A neutral atom has **${e.z} electrons**. Which element is it?`
          : `An atom has **${e.z} protons**. Which element is it?`,
        ...mcq(cap(e.name), wrong, rng),
        hints: [
          byElectrons
            ? 'In a neutral atom, the number of electrons equals the number of protons, which is the atomic number.'
            : 'The number of protons is the atomic number, and each element has its own atomic number.',
          `The first 20 elements in order of atomic number are ${FIRST_20_LIST}.`,
        ],
        solution: `${byElectrons ? `A neutral atom has the same number of protons as electrons, so it has ${e.z} protons. ` : ''}The number of protons is the atomic number, so the atomic number is ${e.z}.\n\nElement number ${e.z} is **${e.name} (${e.symbol})**.`,
      };
    }
    const e = rng.pick(ELEMENTS.filter((x) => x.z <= 30));
    const intro = `${cap(e.name)} (${e.symbol})`;
    if (difficulty === 1) {
      if (rng.chance(0.5)) {
        return {
          type: 'numeric',
          prompt: `${intro} has atomic number ${e.z}. How many protons are in one atom of ${e.name}?`,
          answer: e.z,
          form: 'integer',
          hints: ['The atomic number tells you how many protons are in the nucleus.'],
          solution: `The atomic number is the number of protons, so a ${e.name} atom has **${e.z} protons**.`,
        };
      }
      return {
        type: 'numeric',
        prompt: `Every atom of ${e.name} (${e.symbol}) has ${e.z} protons in its nucleus. What is the atomic number of ${e.name}?`,
        answer: e.z,
        form: 'integer',
        hints: ['Which particle does the atomic number count?'],
        solution: `The atomic number is the number of protons in each atom, so the atomic number of ${e.name} is **${e.z}**.`,
      };
    }
    // difficulty 2: electrons in a neutral atom
    if (rng.chance(0.5)) {
      return {
        type: 'numeric',
        prompt: `${intro} has atomic number ${e.z}. How many electrons are in a neutral atom of ${e.name}?`,
        answer: e.z,
        form: 'integer',
        hints: ['A neutral atom has no overall charge.', 'Each proton (+) is balanced by one electron (−).'],
        solution: `The atomic number ${e.z} means there are ${e.z} protons. A neutral atom has the same number of electrons as protons, so there are **${e.z} electrons**.`,
      };
    }
    return {
      type: 'numeric',
      prompt: `A neutral atom has ${e.z} electrons. How many protons does it have?`,
      answer: e.z,
      form: 'integer',
      hints: ['A neutral atom has no overall charge, so the positive and negative charges must balance.'],
      solution: `In a neutral atom the number of protons (+) equals the number of electrons (−), so it has **${e.z} protons**. (It is ${e.name}, ${e.symbol}.)`,
    };
  },
};

// ---------------------------------------------------------------------------------------------
// Metal or non-metal, from the name (difficulty 1) or from the position in the table (difficulty 2).
// ---------------------------------------------------------------------------------------------

/** Extra elements (beyond the core list) used only to vary positions in the table. */
const POSITION_EXTRAS: readonly Element[] = [
  { z: 37, symbol: 'Rb', name: 'rubidium', kind: 'metal', group: 1, period: 5 },
  { z: 55, symbol: 'Cs', name: 'caesium', kind: 'metal', group: 1, period: 6 },
  { z: 38, symbol: 'Sr', name: 'strontium', kind: 'metal', group: 2, period: 5 },
  { z: 56, symbol: 'Ba', name: 'barium', kind: 'metal', group: 2, period: 6 },
  { z: 22, symbol: 'Ti', name: 'titanium', kind: 'metal', group: 4, period: 4 },
  { z: 24, symbol: 'Cr', name: 'chromium', kind: 'metal', group: 6, period: 4 },
  { z: 25, symbol: 'Mn', name: 'manganese', kind: 'metal', group: 7, period: 4 },
  { z: 27, symbol: 'Co', name: 'cobalt', kind: 'metal', group: 9, period: 4 },
  { z: 28, symbol: 'Ni', name: 'nickel', kind: 'metal', group: 10, period: 4 },
  { z: 78, symbol: 'Pt', name: 'platinum', kind: 'metal', group: 10, period: 6 },
  { z: 35, symbol: 'Br', name: 'bromine', kind: 'non-metal', group: 17, period: 4 },
  { z: 53, symbol: 'I', name: 'iodine', kind: 'non-metal', group: 17, period: 5 },
  { z: 36, symbol: 'Kr', name: 'krypton', kind: 'non-metal', group: 18, period: 4 },
  { z: 54, symbol: 'Xe', name: 'xenon', kind: 'non-metal', group: 18, period: 5 },
  { z: 86, symbol: 'Rn', name: 'radon', kind: 'non-metal', group: 18, period: 6 },
];

/**
 * Positions where the left/centre = metal, right = non-metal rule gives the right answer.
 * Leaves out hydrogen (non-metal at the top of Group 1), the metalloids and Groups 13–14 below
 * the staircase line (aluminium, tin, lead), which need more than the simple rule.
 */
const POSITION_POOL: readonly Element[] = [...ELEMENTS, ...POSITION_EXTRAS].filter(
  (e) => e.kind !== 'metalloid' && e.symbol !== 'H' && !['Al', 'Sn', 'Pb'].includes(e.symbol),
);

const NAME_POOL = ELEMENTS.filter((e) => e.kind !== 'metalloid');

const NAME_NOTES: Record<string, string> = {
  H: 'Hydrogen is placed at the top of Group 1, but it is a non-metal gas.',
  Hg: 'Mercury is a liquid at room temperature, but it is still a metal: it is shiny and conducts electricity.',
  C: 'One form of carbon (graphite) conducts electricity, but carbon is still a non-metal.',
  Al: 'Group 13 is on the right-hand side, but aluminium is below the "staircase" line that separates metals from non-metals, so it is a metal.',
  Sn: 'Group 14 is on the right-hand side, but tin is below the "staircase" line that separates metals from non-metals, so it is a metal.',
  Pb: 'Group 14 is on the right-hand side, but lead is below the "staircase" line that separates metals from non-metals, so it is a metal.',
};

function region(group: number): string {
  if (group <= 2) return 'on the left-hand side of the periodic table';
  if (group <= 12) return 'in the centre of the periodic table (the transition metals)';
  return 'on the right-hand side of the periodic table';
}

export const metalOrNonMetal: QuestionTemplate = {
  id: 's9.chem.atoms-elements.metal-or-non-metal',
  topicId: 's9.chem.atoms-elements',
  title: 'Metal or non-metal?',
  difficulties: [1, 2],
  generate({ rng, difficulty }) {
    const options = [
      { id: 'a', text: 'Metal' },
      { id: 'b', text: 'Non-metal' },
    ];
    if (difficulty === 1) {
      const e = rng.pick(NAME_POOL);
      const note = NAME_NOTES[e.symbol];
      return {
        type: 'mcq',
        prompt: `Is **${e.name}** (${e.symbol}) a metal or a non-metal?`,
        options,
        correct: e.kind === 'metal' ? 'a' : 'b',
        shuffle: false,
        hints: [
          'Metals are usually shiny solids that conduct electricity. Many non-metals are gases or dull, brittle solids.',
          'Metals are found on the left and in the centre of the periodic table; non-metals are on the right (with a few exceptions near the staircase line).',
        ],
        solution: `${cap(e.name)} is a **${e.kind}**. It is in Group ${e.group}, ${region(e.group)}.${note ? `\n\n${note}` : ''}`,
      };
    }
    const e = rng.pick(POSITION_POOL);
    return {
      type: 'mcq',
      prompt: `An element is in **Group ${e.group}** and **Period ${e.period}** of the periodic table. Is it a metal or a non-metal?`,
      options,
      correct: e.kind === 'metal' ? 'a' : 'b',
      shuffle: false,
      hints: [
        'Groups are the columns, numbered 1 to 18 from left to right.',
        'Groups 1 and 2 are on the left, Groups 3–12 are in the centre, and Groups 13–18 are on the right.',
      ],
      solution: `Group ${e.group} is ${region(e.group)}, where the ${e.kind === 'metal' ? 'metals' : 'non-metals'} are found. So the element is a **${e.kind}**.\n\nIt is ${e.name} (${e.symbol}).`,
    };
  },
};

// ---------------------------------------------------------------------------------------------
// Counting atoms in a formula.
// ---------------------------------------------------------------------------------------------

const ELEMENT_NAMES: Record<string, string> = {
  H: 'hydrogen',
  C: 'carbon',
  N: 'nitrogen',
  O: 'oxygen',
  S: 'sulfur',
  P: 'phosphorus',
  Na: 'sodium',
  K: 'potassium',
  Mg: 'magnesium',
  Ca: 'calcium',
  Al: 'aluminium',
  Cl: 'chlorine',
  Cu: 'copper',
  Fe: 'iron',
};

interface Term {
  symbol: string;
  n: number;
  mult: number;
}

/** Parses a formula like "C2H5OH" or "Al2(SO4)3" into one term per symbol written. */
export function parseFormula(formula: string): Term[] {
  const terms: Term[] = [];
  let i = 0;
  const readNumber = (): number => {
    const d = /^\d+/.exec(formula.slice(i));
    if (!d) return 1;
    i += d[0].length;
    return Number(d[0]);
  };
  while (i < formula.length) {
    if (formula[i] === '(') {
      const close = formula.indexOf(')', i);
      if (close === -1) throw new Error(`Unbalanced brackets in ${formula}`);
      const inside = formula.slice(i + 1, close);
      i = close + 1;
      const k = readNumber();
      terms.push(...parseFormula(inside).map((t) => ({ ...t, mult: t.mult * k })));
      continue;
    }
    const m = /^[A-Z][a-z]?/.exec(formula.slice(i));
    if (!m) throw new Error(`Bad formula ${formula}`);
    i += m[0].length;
    terms.push({ symbol: m[0], n: readNumber(), mult: 1 });
  }
  return terms;
}

/** Total of each element, in order of first appearance. */
export function countAtoms(formula: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const t of parseFormula(formula)) counts.set(t.symbol, (counts.get(t.symbol) ?? 0) + t.n * t.mult);
  return counts;
}

const SUB = '₀₁₂₃₄₅₆₇₈₉';
const pretty = (formula: string) => formula.replace(/\d/g, (d) => SUB[Number(d)]!);

/** "O: 4 × 3 = 12" style working for one element. */
function workingFor(formula: string, symbol: string): string {
  const parts = parseFormula(formula)
    .filter((t) => t.symbol === symbol)
    .map((t) => (t.mult > 1 ? `${t.n} × ${t.mult}` : `${t.n}`));
  const total = countAtoms(formula).get(symbol)!;
  return parts.length === 1 && !parts[0]!.includes('×') ? `${symbol}: ${total}` : `${symbol}: ${parts.join(' + ')} = ${total}`;
}

interface Compound {
  formula: string;
  name: string;
  /** true = made of molecules ("one molecule of"); false = ionic ("the formula of"). */
  molecular: boolean;
}

const SIMPLE: readonly Compound[] = [
  { formula: 'H2O', name: 'water', molecular: true },
  { formula: 'CO2', name: 'carbon dioxide', molecular: true },
  { formula: 'CH4', name: 'methane', molecular: true },
  { formula: 'NH3', name: 'ammonia', molecular: true },
  { formula: 'HCl', name: 'hydrogen chloride', molecular: true },
  { formula: 'SO2', name: 'sulfur dioxide', molecular: true },
  { formula: 'O3', name: 'ozone', molecular: true },
  { formula: 'CO', name: 'carbon monoxide', molecular: true },
  { formula: 'H2O2', name: 'hydrogen peroxide', molecular: true },
  { formula: 'NO2', name: 'nitrogen dioxide', molecular: true },
  { formula: 'HNO3', name: 'nitric acid', molecular: true },
  { formula: 'NaOH', name: 'sodium hydroxide', molecular: false },
  { formula: 'MgO', name: 'magnesium oxide', molecular: false },
  { formula: 'CaCl2', name: 'calcium chloride', molecular: false },
  { formula: 'NaCl', name: 'sodium chloride', molecular: false },
];

const LARGER: readonly Compound[] = [
  { formula: 'C6H12O6', name: 'glucose', molecular: true },
  { formula: 'H2SO4', name: 'sulfuric acid', molecular: true },
  { formula: 'C3H8', name: 'propane', molecular: true },
  { formula: 'C4H10', name: 'butane', molecular: true },
  { formula: 'C12H22O11', name: 'sucrose (table sugar)', molecular: true },
  { formula: 'C6H8O7', name: 'citric acid', molecular: true },
  { formula: 'C8H18', name: 'octane', molecular: true },
  { formula: 'C2H4', name: 'ethene', molecular: true },
  { formula: 'C2H6', name: 'ethane', molecular: true },
  { formula: 'H3PO4', name: 'phosphoric acid', molecular: true },
  { formula: 'NaHCO3', name: 'sodium hydrogen carbonate (baking soda)', molecular: false },
  { formula: 'CuSO4', name: 'copper sulfate', molecular: false },
  { formula: 'Fe2O3', name: 'iron oxide', molecular: false },
  { formula: 'CaCO3', name: 'calcium carbonate', molecular: false },
  { formula: 'KNO3', name: 'potassium nitrate', molecular: false },
];

/** Formulas where an element appears more than once. */
const REPEATS: readonly Compound[] = [
  { formula: 'C2H5OH', name: 'ethanol', molecular: true },
  { formula: 'CH3COOH', name: 'ethanoic acid (in vinegar)', molecular: true },
  { formula: 'CH3OH', name: 'methanol', molecular: true },
  { formula: 'HCOOH', name: 'methanoic acid', molecular: true },
  { formula: 'C3H7OH', name: 'propanol', molecular: true },
  { formula: 'NH4NO3', name: 'ammonium nitrate', molecular: false },
];

const BRACKETS: readonly Compound[] = [
  { formula: 'Ca(OH)2', name: 'calcium hydroxide', molecular: false },
  { formula: 'Mg(OH)2', name: 'magnesium hydroxide', molecular: false },
  { formula: 'Al(OH)3', name: 'aluminium hydroxide', molecular: false },
  { formula: 'Al2(SO4)3', name: 'aluminium sulfate', molecular: false },
  { formula: '(NH4)2SO4', name: 'ammonium sulfate', molecular: false },
  { formula: 'Ca(NO3)2', name: 'calcium nitrate', molecular: false },
  { formula: 'Cu(NO3)2', name: 'copper nitrate', molecular: false },
  { formula: 'Mg(NO3)2', name: 'magnesium nitrate', molecular: false },
  { formula: '(NH4)3PO4', name: 'ammonium phosphate', molecular: false },
  { formula: 'Ca3(PO4)2', name: 'calcium phosphate', molecular: false },
];

function where(c: Compound): string {
  return c.molecular ? `one molecule of ${c.name}, ${pretty(c.formula)}` : `the formula of ${c.name}, ${pretty(c.formula)}`;
}

function countQuestion(c: Compound, rng: Rng, allowElements: boolean): TemplateOutput {
  const counts = countAtoms(c.formula);
  const symbols = [...counts.keys()];
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  const hasBrackets = c.formula.includes('(');
  const hasRepeats = parseFormula(c.formula).length !== symbols.length;
  const working = symbols.map((s) => workingFor(c.formula, s)).join('; ');
  const rules = [
    'A small number after a symbol tells you how many of that atom there are. No number means 1.',
    hasBrackets ? 'A number after a bracket multiplies everything inside the bracket.' : '',
    hasRepeats ? 'An element that appears in more than one place must be added up.' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const verb = c.molecular ? 'are in' : 'are shown in';

  const kind = rng.pick(allowElements && symbols.length > 1 ? (['element', 'element', 'total', 'distinct'] as const) : (['element', 'total'] as const));
  if (kind === 'distinct') {
    return {
      type: 'numeric',
      prompt: `How many different elements are in ${c.name}, ${pretty(c.formula)}?`,
      answer: symbols.length,
      form: 'integer',
      hints: ['Each new element in a formula starts with a capital letter.', 'Count the different symbols, not the atoms.'],
      solution: `The symbols in ${pretty(c.formula)} are ${symbols.join(', ')}, so it contains **${symbols.length} different elements**: ${symbols
        .map((s) => ELEMENT_NAMES[s] ?? s)
        .join(', ')}.`,
    };
  }
  if (kind === 'total') {
    return {
      type: 'numeric',
      prompt: `How many atoms altogether ${verb} ${where(c)}?`,
      answer: total,
      form: 'integer',
      hints: [rules, 'Count the atoms of each element, then add them up.'],
      solution: `Count each element: ${working}.\n\nTotal: ${[...counts.values()].join(' + ')} = **${total} atoms**.`,
    };
  }
  // With brackets or repeats, ask about an element that the bracket or repeat actually affects.
  const terms = parseFormula(c.formula);
  const tricky = symbols.filter((s) => terms.filter((t) => t.symbol === s).length > 1 || terms.some((t) => t.symbol === s && t.mult > 1));
  const symbol = rng.pick(tricky.length ? tricky : symbols);
  const name = ELEMENT_NAMES[symbol]!;
  const n = counts.get(symbol)!;
  return {
    type: 'numeric',
    prompt: `How many ${name} atoms ${verb} ${where(c)}?`,
    answer: n,
    form: 'integer',
    hints: [rules, `Find every ${symbol} in the formula.`],
    solution: `Count each element in ${pretty(c.formula)}: ${working}.\n\nSo there ${n === 1 ? 'is' : 'are'} **${n} ${name} atom${n === 1 ? '' : 's'}**.`,
  };
}

export const countingAtoms: QuestionTemplate = {
  id: 's9.chem.compounds-mixtures.count-atoms',
  topicId: 's9.chem.compounds-mixtures',
  title: 'Count the atoms in a formula',
  difficulties: [1, 2, 3, 4],
  generate({ rng, difficulty }) {
    if (difficulty === 1) return countQuestion(rng.pick(SIMPLE), rng, false);
    if (difficulty === 2) return countQuestion(rng.pick(LARGER), rng, true);
    if (difficulty === 4) return countQuestion(rng.pick(BRACKETS), rng, false);
    // difficulty 3: repeated elements, or several molecules
    if (rng.chance(0.5)) return countQuestion(rng.pick(REPEATS), rng, false);
    const c = rng.pick([...SIMPLE, ...LARGER].filter((x) => x.molecular && x.formula !== 'O3'));
    const counts = countAtoms(c.formula);
    const symbol = rng.pick([...counts.keys()]);
    const per = counts.get(symbol)!;
    const n = rng.int(2, 6);
    const name = ELEMENT_NAMES[symbol]!;
    return {
      type: 'numeric',
      prompt: `How many ${name} atoms are in ${n} molecules of ${c.name}, ${pretty(c.formula)}?`,
      answer: n * per,
      form: 'integer',
      hints: [`First work out how many ${name} atoms are in one molecule.`, `Then multiply by the number of molecules.`],
      solution: `One molecule of ${pretty(c.formula)} has ${per} ${name} atom${per === 1 ? '' : 's'}.\n\n${n} molecules have ${n} × ${per} = **${n * per} ${name} atoms**.`,
    };
  },
};

// ---------------------------------------------------------------------------------------------
// The pH scale.
// ---------------------------------------------------------------------------------------------

function phClass(v: number): 'acidic' | 'neutral' | 'alkaline' {
  return v < 7 ? 'acidic' : v > 7 ? 'alkaline' : 'neutral';
}

const PH_VALUES = [
  ...Array.from({ length: 15 }, (_, i) => i),
  ...Array.from({ length: 14 }, (_, i) => i + 0.5).filter((v) => v !== 6.5 && v !== 7.5),
];

export const phScale: QuestionTemplate = {
  id: 's9.chem.acids-bases.ph-scale',
  topicId: 's9.chem.acids-bases',
  title: 'Reading the pH scale',
  difficulties: [1, 2],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      const v = rng.pick(PH_VALUES);
      const cls = phClass(v);
      const options = [
        { id: 'a', text: 'Acidic' },
        { id: 'b', text: 'Neutral' },
        { id: 'c', text: 'Alkaline' },
      ];
      const reason =
        cls === 'neutral'
          ? 'pH 7 is exactly neutral, like pure water.'
          : cls === 'acidic'
            ? `${v} is below 7, so the solution is acidic. The lower the pH, the more acidic it is.`
            : `${v} is above 7, so the solution is alkaline (basic). The higher the pH, the more alkaline it is.`;
      return {
        type: 'mcq',
        prompt: `A solution has a pH of ${v}. Is it acidic, neutral or alkaline?`,
        options,
        correct: cls === 'acidic' ? 'a' : cls === 'neutral' ? 'b' : 'c',
        shuffle: false,
        hints: ['The pH scale runs from 0 to 14, with 7 in the middle.'],
        solution: `Below 7 is acidic, 7 is neutral and above 7 is alkaline.\n\n${reason} So the answer is **${cls}**.`,
      };
    }
    // difficulty 2: compare four solutions
    const kind = rng.pick(['most-acidic', 'most-alkaline', 'neutral', 'blue-litmus', 'red-litmus'] as const);
    let values: number[];
    if (kind === 'neutral') {
      values = rng.shuffle([7, ...rng.sample([0, 1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14], 3)]);
    } else if (kind === 'blue-litmus') {
      values = rng.shuffle([rng.int(1, 6), ...rng.sample([7, 8, 9, 10, 11, 12, 13], 3)]);
    } else if (kind === 'red-litmus') {
      values = rng.shuffle([rng.int(8, 13), ...rng.sample([1, 2, 3, 4, 5, 6, 7], 3)]);
    } else {
      values = rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], 4);
    }
    const letters = ['A', 'B', 'C', 'D'];
    const target =
      kind === 'most-acidic'
        ? Math.min(...values)
        : kind === 'most-alkaline'
          ? Math.max(...values)
          : kind === 'neutral'
            ? 7
            : kind === 'blue-litmus'
              ? values.find((v) => v < 7)!
              : values.find((v) => v > 7)!;
    const idx = values.indexOf(target);
    const table = `| Solution | A | B | C | D |\n|---|---|---|---|---|\n| pH | ${values.join(' | ')} |`;
    const question = {
      'most-acidic': 'Which solution is the most acidic?',
      'most-alkaline': 'Which solution is the most alkaline?',
      neutral: 'Which solution is neutral?',
      'blue-litmus': 'Which solution would turn blue litmus paper red?',
      'red-litmus': 'Which solution would turn red litmus paper blue?',
    }[kind];
    const why = {
      'most-acidic': `The lowest pH is the most acidic. Solution ${letters[idx]} has the lowest pH (${target}).`,
      'most-alkaline': `The highest pH is the most alkaline. Solution ${letters[idx]} has the highest pH (${target}).`,
      neutral: `A neutral solution has a pH of exactly 7. That is solution ${letters[idx]}.`,
      'blue-litmus': `Acids turn blue litmus red, and acids have a pH below 7. Only solution ${letters[idx]} (pH ${target}) is acidic. A neutral solution (pH 7) leaves both colours of litmus unchanged.`,
      'red-litmus': `Alkalis turn red litmus blue, and alkalis have a pH above 7. Only solution ${letters[idx]} (pH ${target}) is alkaline. A neutral solution (pH 7) leaves both colours of litmus unchanged.`,
    }[kind];
    return {
      type: 'mcq',
      prompt: `Four solutions were tested with universal indicator.\n\n${table}\n\n${question}`,
      options: letters.map((l) => ({ id: l.toLowerCase(), text: `Solution ${l}` })),
      correct: letters[idx]!.toLowerCase(),
      shuffle: false,
      hints: [
        kind === 'blue-litmus' || kind === 'red-litmus'
          ? 'Acids turn blue litmus red; alkalis turn red litmus blue.'
          : 'Below 7 is acidic, 7 is neutral and above 7 is alkaline.',
        kind === 'most-acidic' ? 'The further below 7, the more acidic.' : kind === 'most-alkaline' ? 'The further above 7, the more alkaline.' : 'Decide whether each solution is acidic, neutral or alkaline.',
      ],
      solution: `${why}\n\nThe answer is **Solution ${letters[idx]}**.`,
    };
  },
};

// ---------------------------------------------------------------------------------------------
// Naming salts in word equations.
// ---------------------------------------------------------------------------------------------

interface Acid {
  name: string;
  ending: string;
  alt?: string;
}

const ACIDS: readonly Acid[] = [
  { name: 'hydrochloric acid', ending: 'chloride' },
  { name: 'sulfuric acid', ending: 'sulfate', alt: 'sulphuric acid' },
  { name: 'nitric acid', ending: 'nitrate' },
];

const BASES: ReadonlyArray<{ metal: string; base: string }> = [
  ...['sodium', 'potassium', 'lithium', 'calcium', 'magnesium'].map((metal) => ({ metal, base: `${metal} hydroxide` })),
  ...['copper', 'magnesium', 'zinc'].map((metal) => ({ metal, base: `${metal} oxide` })),
];

const CARBONATES = ['calcium', 'magnesium', 'sodium', 'potassium', 'copper', 'zinc'];

/** Metal + acid pairs that react steadily to give hydrogen. Nitric acid is left out: with most metals it doesn't give hydrogen. */
const METAL_ACID: ReadonlyArray<[string, Acid]> = [
  ['magnesium', ACIDS[0]!],
  ['magnesium', ACIDS[1]!],
  ['zinc', ACIDS[0]!],
  ['zinc', ACIDS[1]!],
  ['aluminium', ACIDS[0]!],
];

const SALT_METALS = ['sodium', 'potassium', 'lithium', 'magnesium', 'calcium', 'zinc', 'copper'];

/** Accepted names for a salt. ("Sulphate" is already normalised to "sulfate" by the marker.) */
function saltForms(metal: string, acid: Acid): string[] {
  const salt = `${metal} ${acid.ending}`;
  return metal === 'copper' ? [salt, `copper(II) ${acid.ending}`] : [salt];
}

const SALT_HINT = 'Hydrochloric acid makes chlorides, sulfuric acid makes sulfates and nitric acid makes nitrates.';

function saltWorking(metal: string, acid: Acid, from: string): string {
  return `The first part of the salt's name is the metal from the ${from} (${metal}). The second part comes from the acid: ${acid.name} → ${acid.ending}. So the salt is **${metal} ${acid.ending}**.`;
}

export const saltNames: QuestionTemplate = {
  id: 's9.chem.acids-bases.salt-names',
  topicId: 's9.chem.acids-bases',
  title: 'Name the salt in a word equation',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    if (difficulty === 2) {
      const { metal, base } = rng.pick(BASES);
      const acid = rng.pick(ACIDS);
      const salt = `${metal} ${acid.ending}`;
      return {
        type: 'cloze',
        prompt: `Complete the word equation for this neutralisation reaction.\n\n${acid.name} + ${base} → [[a]] + water`,
        blanks: [{ id: 'a', accepted: saltForms(metal, acid) }],
        allowTypos: false,
        hints: ['A neutralisation makes a salt and water. The salt\'s name has two parts: the metal, then a part from the acid.', SALT_HINT],
        solution: `${saltWorking(metal, acid, 'base')}\n\n${acid.name} + ${base} → ${salt} + water`,
      };
    }
    if (difficulty === 3) {
      if (rng.chance(0.3)) {
        const [metal, acid] = rng.pick(METAL_ACID);
        const salt = `${metal} ${acid.ending}`;
        return {
          type: 'cloze',
          prompt: `Complete the word equation. Write the salt in the first gap and the gas in the second.\n\n${metal} + ${acid.name} → [[a]] + [[b]]`,
          blanks: [
            { id: 'a', accepted: saltForms(metal, acid) },
            { id: 'b', accepted: ['hydrogen', 'hydrogen gas', 'H2'] },
          ],
          allowTypos: false,
          hints: ['An acid reacting with a metal makes a salt and a gas that burns with a squeaky pop.', SALT_HINT],
          solution: `Acid + metal → salt + hydrogen.\n\n${saltWorking(metal, acid, 'reactants')}\n\n${metal} + ${acid.name} → ${salt} + hydrogen`,
        };
      }
      const metal = rng.pick(CARBONATES);
      const acid = rng.pick(ACIDS);
      const salt = `${metal} ${acid.ending}`;
      return {
        type: 'cloze',
        prompt: `Complete the word equation. Write the salt in the first gap and the gas in the second.\n\n${metal} carbonate + ${acid.name} → [[a]] + water + [[b]]`,
        blanks: [
          { id: 'a', accepted: saltForms(metal, acid) },
          { id: 'b', accepted: ['carbon dioxide', 'carbon dioxide gas', 'CO2'] },
        ],
        allowTypos: false,
        hints: ['An acid reacting with a carbonate makes a salt, water and a gas that turns limewater milky.', SALT_HINT],
        solution: `Acid + carbonate → salt + water + carbon dioxide.\n\n${saltWorking(metal, acid, 'carbonate')}\n\n${metal} carbonate + ${acid.name} → ${salt} + water + carbon dioxide`,
      };
    }
    // difficulty 4: work backwards from the salt to an acid and a base
    const metal = rng.pick(SALT_METALS);
    const acid = rng.pick(ACIDS);
    const salt = `${metal} ${acid.ending}`;
    return {
      type: 'cloze',
      prompt: `Name an acid and a base that would react to make **${salt}**. Write the acid in the first gap.\n\n[[a]] + [[b]] → ${salt} + water`,
      blanks: [
        { id: 'a', accepted: [acid.name, ...(acid.alt ? [acid.alt] : [])] },
        { id: 'b', accepted: [`${metal} hydroxide`, `${metal} oxide`, ...(metal === 'copper' ? ['copper(II) hydroxide', 'copper(II) oxide'] : [])] },
      ],
      allowTypos: false,
      hints: ['The second part of the salt\'s name tells you which acid was used.', `The base must contain ${metal}. Hydroxides and oxides of metals are bases.`],
      solution: `The ending "${acid.ending}" comes from ${acid.name}, and the metal ${metal} must come from the base.\n\n**${acid.name} + ${metal} hydroxide → ${salt} + water**\n\n(${cap(metal)} oxide would also work as the base.)`,
    };
  },
};

export const templates: QuestionTemplate[] = [
  elementSymbols,
  protonsElectrons,
  metalOrNonMetal,
  countingAtoms,
  phScale,
  saltNames,
];
