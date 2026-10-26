import type { Rng } from '../../../../rng';
import { NAMES } from '../../../format';
import type { QuestionTemplate, TemplateOutput } from '../../../types';
import { cap, cash, cents, type Choice, dollars, mcqFields, texMoney } from './money-helpers';

// m7.num.money — totals and change, rounding to the cent, NZ cash rounding to the nearest 10 cents,
// and percentage discounts on whole-dollar prices. All amounts are worked in integer cents so there
// is no floating-point drift. No calculators.
//
// Cash rounding: 1–4 cents round down, 6–9 cents round up. A total ending in 5 cents is rounded
// whichever way the shop chooses, so questions never use one.

interface Item {
  name: string;
  /** Plural, for "3 mince and cheese pies". */
  many: string;
  /** Price range in cents (multiples of 10 are drawn from it). */
  lo: number;
  hi: number;
}

const SNACKS: Item[] = [
  { name: 'a mince and cheese pie', many: 'mince and cheese pies', lo: 450, hi: 650 },
  { name: 'a sausage roll', many: 'sausage rolls', lo: 300, hi: 450 },
  { name: 'a bottle of water', many: 'bottles of water', lo: 200, hi: 350 },
  { name: 'a sushi roll', many: 'sushi rolls', lo: 250, hi: 420 },
  { name: 'a juice', many: 'juices', lo: 220, hi: 380 },
  { name: 'a muesli bar', many: 'muesli bars', lo: 120, hi: 220 },
  { name: 'an ice cream', many: 'ice creams', lo: 300, hi: 550 },
  { name: 'a packet of chips', many: 'packets of chips', lo: 180, hi: 350 },
  { name: 'a pen', many: 'pens', lo: 150, hi: 300 },
  { name: 'a notebook', many: 'notebooks', lo: 250, hi: 600 },
  { name: 'a glue stick', many: 'glue sticks', lo: 150, hi: 280 },
  { name: 'a scoop of hot chips', many: 'scoops of hot chips', lo: 300, hi: 500 },
];

/** Supermarket items with any cents value (for cash-rounding questions). */
const GROCERIES: Item[] = [
  { name: 'a loaf of bread', many: 'loaves of bread', lo: 250, hi: 520 },
  { name: 'a bottle of milk', many: 'bottles of milk', lo: 280, hi: 480 },
  { name: 'a bag of apples', many: 'bags of apples', lo: 350, hi: 650 },
  { name: 'a block of cheese', many: 'blocks of cheese', lo: 780, hi: 1290 },
  { name: 'a packet of crackers', many: 'packets of crackers', lo: 190, hi: 420 },
  { name: 'a tin of spaghetti', many: 'tins of spaghetti', lo: 120, hi: 260 },
  { name: 'a bunch of bananas', many: 'bunches of bananas', lo: 290, hi: 480 },
  { name: 'a pottle of yoghurt', many: 'pottles of yoghurt', lo: 160, hi: 590 },
  { name: 'a bag of rice', many: 'bags of rice', lo: 220, hi: 560 },
];

const BIG_ITEMS = [
  { name: 'a hoodie', lo: 30, hi: 80 },
  { name: 'a pair of sneakers', lo: 60, hi: 160 },
  { name: 'a skateboard', lo: 40, hi: 120 },
  { name: 'a netball', lo: 20, hi: 40 },
  { name: 'a rugby ball', lo: 20, hi: 50 },
  { name: 'a set of headphones', lo: 25, hi: 90 },
  { name: 'a board game', lo: 20, hi: 60 },
  { name: 'a scooter', lo: 50, hi: 150 },
  { name: 'a bike helmet', lo: 30, hi: 80 },
  { name: 'a school bag', lo: 25, hi: 70 },
  { name: 'a sleeping bag', lo: 40, hi: 120 },
] as const;

/** A price in cents, a multiple of 10 in the item's range. */
const tenCents = (rng: Rng, it: Item) => 10 * rng.int(Math.ceil(it.lo / 10), Math.floor(it.hi / 10));
/** A price in cents whose last digit is anything. */
const anyCents = (rng: Rng, it: Item) => rng.int(it.lo, it.hi);

/** NZ cash rounding of an amount in cents (never called with a 5-cent ending). */
function cashRound(c: number): number {
  const last = c % 10;
  return last < 5 ? c - last : c + (10 - last);
}

const noteFor = (c: number, rng: Rng) => {
  const notes = [500, 1000, 2000, 5000, 10000].filter((n) => n > c);
  return rng.chance(0.75) ? notes[0]! : (notes[1] ?? notes[0]!);
};

/** "Counting on" explanation for change from a note. */
function countOn(price: number, note: number): string {
  const steps: string[] = [];
  let at = price;
  const toDollar = (100 - (at % 100)) % 100;
  if (toDollar) {
    steps.push(`${toDollar} cents takes you to ${cash(dollars(at + toDollar))}`);
    at += toDollar;
  }
  if (note > at) steps.push(`${cash(dollars(note - at))} more takes you to ${cash(dollars(note))}`);
  return `Count on from ${cents(dollars(price))}: ${steps.join(', and ')}. The change is ${cents(dollars(note - price))}.`;
}

const sumLine = (parts: number[]) => `$${parts.map((c) => texMoney(dollars(c))).join(' + ')} = ${texMoney(dollars(parts.reduce((s, x) => s + x, 0)))}$`;

/** Picks k different items from a list. */
const items = <T>(rng: Rng, list: readonly T[], k: number) => rng.sample(list, k);

export const totalChange: QuestionTemplate = {
  id: 'm7.num.money.total-change',
  topicId: 'm7.num.money',
  title: 'Work out totals and change',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    const name = rng.pick(NAMES);
    if (difficulty === 1) {
      if (rng.chance(0.5)) {
        const it = rng.pick(SNACKS);
        const p = tenCents(rng, it);
        const note = noteFor(p, rng);
        return {
          type: 'numeric',
          prompt: `${name} buys ${it.name} for ${cents(dollars(p))}. ${name} pays with a ${cash(dollars(note))} note. How much change should ${name} get?`,
          answer: dollars(note - p),
          units: '$',
          calculator: 'not-allowed',
          hints: ['Change is the note take away the price.', `Count on from ${cents(dollars(p))} to the next whole dollar, then on to ${cash(dollars(note))}.`],
          solution: `$${texMoney(dollars(note))} - ${texMoney(dollars(p))} = ${texMoney(dollars(note - p))}$\n\n${countOn(p, note)}`,
        };
      }
      const [a, b] = items(rng, SNACKS, 2) as [Item, Item];
      const pa = tenCents(rng, a);
      const pb = tenCents(rng, b);
      return {
        type: 'numeric',
        prompt: `${name} buys ${a.name} for ${cents(dollars(pa))} and ${b.name} for ${cents(dollars(pb))}. What is the total cost?`,
        answer: dollars(pa + pb),
        units: '$',
        calculator: 'not-allowed',
        hints: ['"Total" means add the prices together.', 'Add the dollars, then add the cents. 100 cents make another dollar.'],
        solution: `${sumLine([pa, pb])}\n\nThe total is **${cents(dollars(pa + pb))}**.`,
      };
    }
    if (difficulty === 2) {
      if (rng.chance(0.5)) {
        const list = items(rng, SNACKS, 3);
        const ps = list.map((it) => tenCents(rng, it));
        const total = ps.reduce((s, x) => s + x, 0);
        return {
          type: 'numeric',
          prompt: `At the school canteen, ${name} buys ${list[0]!.name} (${cents(dollars(ps[0]!))}), ${list[1]!.name} (${cents(dollars(ps[1]!))}) and ${list[2]!.name} (${cents(dollars(ps[2]!))}). What is the total cost?`,
          answer: dollars(total),
          units: '$',
          calculator: 'not-allowed',
          hints: ['Add the three prices.', 'Line up the decimal points if you add in columns.'],
          solution: `${sumLine(ps)}\n\nThe total is **${cents(dollars(total))}**.`,
        };
      }
      const [a, b] = items(rng, SNACKS, 2) as [Item, Item];
      const pa = tenCents(rng, a);
      const pb = tenCents(rng, b);
      const total = pa + pb;
      const note = total < 1000 ? rng.pick([1000, 2000]) : 2000;
      return {
        type: 'numeric',
        prompt: `${name} buys ${a.name} for ${cents(dollars(pa))} and ${b.name} for ${cents(dollars(pb))}. ${name} pays with a ${cash(dollars(note))} note. How much change should ${name} get?`,
        answer: dollars(note - total),
        units: '$',
        calculator: 'not-allowed',
        hints: ['Find the total cost first.', 'Then take the total away from the note.'],
        solution: `Total: ${sumLine([pa, pb])}\n\nChange: $${texMoney(dollars(note))} - ${texMoney(dollars(total))} = ${texMoney(dollars(note - total))}$\n\n${name} gets **${cents(dollars(note - total))}** change.`,
      };
    }
    // difficulty 3: quantities, and either change or "how much more is needed?"
    const [a, b] = items(rng, SNACKS, 2) as [Item, Item];
    const pa = tenCents(rng, a);
    const pb = tenCents(rng, b);
    const qa = rng.int(2, 5);
    const qb = rng.int(2, 4);
    const total = qa * pa + qb * pb;
    const plural = (it: Item, q: number) => `${q} ${it.many}`;
    const lines = `$${qa} \\times ${texMoney(dollars(pa))} = ${texMoney(dollars(qa * pa))}$\n\n$${qb} \\times ${texMoney(dollars(pb))} = ${texMoney(dollars(qb * pb))}$\n\nTotal: $${texMoney(dollars(qa * pa))} + ${texMoney(dollars(qb * pb))} = ${texMoney(dollars(total))}$`;
    if (rng.chance(0.5)) {
      const note = total < 5000 ? 5000 : 10000;
      return {
        type: 'numeric',
        prompt: `${name} is buying lunch for friends: ${plural(a, qa)} at ${cents(dollars(pa))} each and ${plural(b, qb)} at ${cents(dollars(pb))} each. ${name} pays with a ${cash(dollars(note))} note. How much change should ${name} get?`,
        answer: dollars(note - total),
        units: '$',
        marks: 2,
        calculator: 'not-allowed',
        hints: ['Multiply to find the cost of each kind of item, then add.', 'Take the total away from the note.'],
        solution: `${lines}\n\nChange: $${texMoney(dollars(note))} - ${texMoney(dollars(total))} = ${texMoney(dollars(note - total))}$\n\n${name} gets **${cents(dollars(note - total))}** change.`,
      };
    }
    const have = Math.max(100, Math.floor((total - rng.int(50, 600)) / 100) * 100);
    return {
      type: 'numeric',
      prompt: `${name} has ${cash(dollars(have))}. ${name} wants to buy ${plural(a, qa)} at ${cents(dollars(pa))} each and ${plural(b, qb)} at ${cents(dollars(pb))} each. How much more money does ${name} need?`,
      answer: dollars(total - have),
      units: '$',
      marks: 2,
      calculator: 'not-allowed',
      hints: ['Find the total cost first.', `Then work out the difference between the total and ${cash(dollars(have))}.`],
      solution: `${lines}\n\n${name} needs $${texMoney(dollars(total))} - ${texMoney(dollars(have))} = ${texMoney(dollars(total - have))}$ more, which is **${cents(dollars(total - have))}**.`,
    };
  },
};

// ---------------------------------------------------------------------------

/** A cents amount in [lo, hi] whose last digit is not 0 or 5. */
function oddCents(rng: Rng, lo: number, hi: number): number {
  for (;;) {
    const c = rng.int(lo, hi);
    if (c % 5 !== 0) return c;
  }
}

const ROUNDING_HINTS = [
  'Cash is rounded to the nearest 10 cents, because New Zealand has no 1c, 2c or 5c coins.',
  'Look at the last cents digit: 1 to 4 rounds down, 6 to 9 rounds up.',
];

function roundingWhy(c: number): string {
  const r = cashRound(c);
  const last = c % 10;
  return `${cents(dollars(c))} ends in ${last} ${last === 1 ? 'cent' : 'cents'}, so it rounds ${last < 5 ? 'down' : 'up'} to **${cents(dollars(r))}**.`;
}

export const cashRounding: QuestionTemplate = {
  id: 'm7.num.money.cash-rounding',
  topicId: 'm7.num.money',
  title: 'Round cash payments to the nearest 10 cents',
  difficulties: [1, 2, 3, 4],
  generate({ rng, difficulty }) {
    const name = rng.pick(NAMES);
    if (difficulty === 1) {
      const c = oddCents(rng, 101, 4999);
      return {
        type: 'numeric',
        prompt: `In New Zealand, cash payments are rounded to the nearest 10 cents. Round ${cents(dollars(c))} to the nearest 10 cents.`,
        answer: dollars(cashRound(c)),
        units: '$',
        calculator: 'not-allowed',
        hints: ROUNDING_HINTS,
        solution: roundingWhy(c),
      };
    }
    if (difficulty === 2) {
      let pa = 0;
      let pb = 0;
      const [a, b] = items(rng, GROCERIES, 2) as [Item, Item];
      for (let i = 0; i < 100; i++) {
        pa = anyCents(rng, a);
        pb = anyCents(rng, b);
        if ((pa + pb) % 5 !== 0) break;
      }
      if ((pa + pb) % 5 === 0) pb += 1;
      const t = pa + pb;
      return {
        type: 'numeric',
        prompt: `${name} buys ${a.name} for ${cents(dollars(pa))} and ${b.name} for ${cents(dollars(pb))}, and pays with cash. How much does ${name} pay?`,
        answer: dollars(cashRound(t)),
        units: '$',
        calculator: 'not-allowed',
        hints: ['Add the prices first. Round the total, not each price.', ROUNDING_HINTS[1]!],
        solution: `Total: ${sumLine([pa, pb])}\n\nPaying cash, the total is rounded: ${roundingWhy(t)}`,
      };
    }
    if (difficulty === 3) {
      const t = oddCents(rng, 312, 4789);
      const note = noteFor(cashRound(t), rng);
      const r = cashRound(t);
      return {
        type: 'numeric',
        prompt: `At the supermarket, ${name}'s shopping comes to ${cents(dollars(t))}. ${name} pays with a ${cash(dollars(note))} note. How much change does ${name} get?`,
        answer: dollars(note - r),
        units: '$',
        calculator: 'not-allowed',
        hints: ['Paying cash, the total is rounded to the nearest 10 cents first.', 'Then work out the change from the rounded total.'],
        solution: `${roundingWhy(t)}\n\nChange: $${texMoney(dollars(note))} - ${texMoney(dollars(r))} = ${texMoney(dollars(note - r))}$\n\n${name} gets **${cents(dollars(note - r))}** change.`,
      };
    }
    // difficulty 4: several items, quantities, cash rounding and change
    const [a, b] = items(rng, GROCERIES, 2) as [Item, Item];
    let pa = 0;
    let pb = 0;
    let qa = 2;
    let t = 0;
    for (let i = 0; i < 200; i++) {
      pa = anyCents(rng, a);
      pb = anyCents(rng, b);
      qa = rng.int(2, 3);
      t = qa * pa + pb;
      if (t % 5 !== 0 && t < 4900) break;
    }
    if (t % 5 === 0) {
      pb += 1;
      t += 1;
    }
    const note = t < 2000 ? 2000 : 5000;
    const r = cashRound(t);
    return {
      type: 'numeric',
      prompt: `${name} buys ${qa} ${a.many} at ${cents(dollars(pa))} each and ${b.name} for ${cents(dollars(pb))}. ${name} pays cash with a ${cash(dollars(note))} note. How much change does ${name} get?`,
      answer: dollars(note - r),
      units: '$',
      marks: 2,
      calculator: 'not-allowed',
      hints: ['Find the exact total first.', 'Round the total to the nearest 10 cents (cash rounding), then find the change.'],
      solution: `$${qa} \\times ${texMoney(dollars(pa))} = ${texMoney(dollars(qa * pa))}$\n\nTotal: ${sumLine([qa * pa, pb])}\n\n${roundingWhy(t)}\n\nChange: $${texMoney(dollars(note))} - ${texMoney(dollars(r))} = ${texMoney(dollars(note - r))}$, so ${name} gets **${cents(dollars(note - r))}**.`,
    };
  },
};

// ---------------------------------------------------------------------------
// Percentage discounts on whole-dollar prices.

const pctHow: Record<number, string> = {
  5: '5% is half of 10%',
  10: '10% is one tenth: divide by 10',
  15: '15% is 10% plus 5% (and 5% is half of 10%)',
  20: '20% is 2 lots of 10%',
  25: '25% is one quarter: divide by 4',
  30: '30% is 3 lots of 10%',
  40: '40% is 4 lots of 10%',
  50: '50% is one half: divide by 2',
  75: '75% is three quarters: divide by 4, then multiply by 3',
};

/** Discount in cents for p% of P whole dollars, with a mental-method line. */
function discountWork(P: number, p: number): { d: number; line: string } {
  const d = P * p; // cents: P dollars × p% = P × p cents
  const ten = P * 10; // 10% in cents
  let line: string;
  if (p === 10) line = `10% of ${cash(P)} is ${cash(P)} ÷ 10 = ${cents(dollars(ten))}.`;
  else if (p === 50) line = `50% of ${cash(P)} is ${cash(P)} ÷ 2 = ${cents(dollars(d))}.`;
  else if (p === 25) line = `25% of ${cash(P)} is ${cash(P)} ÷ 4 = ${cents(dollars(d))}.`;
  else if (p === 75) line = `25% of ${cash(P)} is ${cash(P)} ÷ 4 = ${cents(dollars(P * 25))}, so 75% is 3 × ${cents(dollars(P * 25))} = ${cents(dollars(d))}.`;
  else if (p === 5) line = `10% of ${cash(P)} is ${cents(dollars(ten))}, so 5% is half of that: ${cents(dollars(d))}.`;
  else if (p === 15) line = `10% of ${cash(P)} is ${cents(dollars(ten))} and 5% is ${cents(dollars(ten / 2))}, so 15% is ${cents(dollars(d))}.`;
  else line = `10% of ${cash(P)} is ${cents(dollars(ten))}, so ${p}% is ${p / 10} × ${cents(dollars(ten))} = ${cents(dollars(d))}.`;
  return { d, line };
}

function bigItem(rng: Rng, evenOnly = false) {
  const it = rng.pick(BIG_ITEMS);
  let P = rng.int(it.lo, it.hi);
  if (evenOnly && P % 2 === 1) P += 1;
  return { name: it.name, P };
}

export const discount: QuestionTemplate = {
  id: 'm7.num.money.discount',
  topicId: 'm7.num.money',
  title: 'Percentage discounts and sale prices',
  difficulties: [2, 3, 4, 5],
  generate({ rng, difficulty }) {
    const name = rng.pick(NAMES);
    if (difficulty === 2) {
      const p = rng.pick([10, 50, 25]);
      const { name: item, P } = bigItem(rng);
      const { d, line } = discountWork(P, p);
      const askSale = rng.chance(0.5);
      return {
        type: 'numeric',
        prompt: `${cap(item)} costs ${cash(P)}. In a sale it has ${p}% off. ${askSale ? 'What is the sale price?' : 'How much is the discount?'}`,
        answer: dollars(askSale ? P * 100 - d : d),
        units: '$',
        calculator: 'not-allowed',
        hints: [`${pctHow[p]}.`, askSale ? 'The sale price is the original price take away the discount.' : 'The discount is the amount taken off the price.'],
        solution: askSale
          ? `${line}\n\nSale price: $${texMoney(P)} - ${texMoney(dollars(d))} = ${texMoney(P - dollars(d))}$, so the sale price is **${cents(P - dollars(d))}**.`
          : `${line}\n\nThe discount is **${cents(dollars(d))}**.`,
      };
    }
    if (difficulty === 3) {
      const p = rng.pick([20, 30, 40, 15, 5, 75]);
      const { name: item, P } = bigItem(rng, p === 5 || p === 15);
      const { d, line } = discountWork(P, p);
      const sale = P * 100 - d;
      return {
        type: 'numeric',
        prompt: `${cap(item)} normally costs ${cash(P)}. It is on sale with ${p}% off. What is the sale price?`,
        answer: dollars(sale),
        units: '$',
        calculator: 'not-allowed',
        hints: [`Find ${p}% of ${cash(P)} first. ${pctHow[p]}.`, 'Then take the discount away from the normal price.'],
        solution: `${line}\n\nSale price: $${texMoney(P)} - ${texMoney(dollars(d))} = ${texMoney(dollars(sale))}$\n\nThe sale price is **${cents(dollars(sale))}**. (Check: you pay ${100 - p}% of the price.)`,
      };
    }
    if (difficulty === 4) {
      if (rng.chance(0.5)) {
        // Discount, then change from a note.
        const p = rng.pick([10, 20, 25, 30, 40, 50]);
        const { name: item, P } = bigItem(rng);
        const { d, line } = discountWork(P, p);
        const sale = P * 100 - d;
        const note = [2000, 5000, 10000, 20000].find((n) => n >= sale + 100)!;
        return {
          type: 'numeric',
          prompt: `${cap(item)} is ${cash(P)}, but today everything is ${p}% off. ${name} pays for it with a ${cash(dollars(note))} note. How much change does ${name} get?`,
          answer: dollars(note - sale),
          units: '$',
          marks: 2,
          calculator: 'not-allowed',
          hints: [`Find the discount: ${pctHow[p]}.`, 'Work out the sale price, then the change from the note.'],
          solution: `${line}\n\nSale price: $${texMoney(P)} - ${texMoney(dollars(d))} = ${texMoney(dollars(sale))}$\n\nChange: $${texMoney(dollars(note))} - ${texMoney(dollars(sale))} = ${texMoney(dollars(note - sale))}$, so ${name} gets **${cents(dollars(note - sale))}**.`,
        };
      }
      return compareShops(rng);
    }
    // difficulty 5: find the original price from the sale price.
    const p = rng.pick([10, 20, 25, 40, 50]);
    const step = p === 25 || p === 50 ? 4 : 10;
    const big = rng.pick(BIG_ITEMS);
    const P = step * rng.int(Math.ceil(big.lo / step), Math.floor(big.hi / step));
    const sale = (P * (100 - p)) / 100;
    const item = big.name;
    const pay = 100 - p;
    const unitLine =
      p === 25 || p === 50
        ? p === 25
          ? `75% is ${cash(sale)}, so 25% is ${cash(sale)} ÷ 3 = ${cash(sale / 3)}. Then 100% is 4 × ${cash(sale / 3)} = ${cash(P)}.`
          : `50% is ${cash(sale)}, so 100% is 2 × ${cash(sale)} = ${cash(P)}.`
        : `${pay}% is ${cash(sale)}, so 10% is ${cash(sale)} ÷ ${pay / 10} = ${cash(sale / (pay / 10))}. Then 100% is 10 × ${cash(sale / (pay / 10))} = ${cash(P)}.`;
    return {
      type: 'numeric',
      prompt: `${name} buys ${item} in a ${p}%-off sale and pays ${cash(sale)}. What was the price before the sale?`,
      answer: P,
      units: '$',
      marks: 2,
      calculator: 'not-allowed',
      hints: [`With ${p}% off, ${name} paid ${pay}% of the original price.`, `So ${pay}% of the original price is ${cash(sale)}. Find ${p === 25 || p === 50 ? `${p === 25 ? 25 : 50}%` : '10%'} first.`],
      solution: `${name} paid ${100}% − ${p}% = ${pay}% of the original price.\n\n${unitLine}\n\nThe original price was **${cash(P)}**. (Check: ${p}% of ${cash(P)} is ${cash((P * p) / 100)}, and ${cash(P)} − ${cash((P * p) / 100)} = ${cash(sale)}.)`,
    };
  },
};

function compareShops(rng: Rng): TemplateOutput {
  for (let attempt = 0; attempt < 100; attempt++) {
    const it = rng.pick(BIG_ITEMS);
    const pa = rng.pick([10, 20, 25, 50]);
    const PA = (pa === 25 ? 4 : 10) * rng.int(Math.ceil(it.lo / 10), Math.ceil(it.hi / 8));
    const PB = PA + rng.pick([-10, -5, 5, 10, 15]);
    const off = rng.pick([5, 8, 10, 12, 15, 20]);
    if (PB <= off + 5) continue;
    const saleA = PA * 100 - PA * pa; // cents
    const saleB = (PB - off) * 100;
    const diff = Math.abs(saleA - saleB);
    if (diff === 0 || diff > 2000) continue;
    const better = saleA < saleB ? 'A' : 'B';
    const worse = better === 'A' ? 'B' : 'A';
    const correct: Choice = { text: `Shop ${better}, by ${cents(dollars(diff))}` };
    if (PA === PB) continue;
    const lowerStart = PA < PB ? 'A' : 'B';
    const beforeDiff = Math.abs(PA - PB) * 100;
    const distractors: Choice[] = [
      { text: `Shop ${worse}, by ${cents(dollars(diff))}`, feedback: `Shop ${worse} works out at ${cents(dollars(better === 'A' ? saleB : saleA))}, which is more than Shop ${better}'s ${cents(dollars(better === 'A' ? saleA : saleB))}.` },
      lowerStart === worse
        ? { text: `Shop ${worse}, because its price starts lower`, feedback: 'Compare the prices after the discounts, not before.' }
        : { text: `Shop ${better}, by ${cents(dollars(beforeDiff))}`, feedback: 'That is the difference before the discounts. Compare the sale prices.' },
      { text: 'They cost the same', feedback: `Work out both sale prices: Shop A is ${cents(dollars(saleA))} and Shop B is ${cents(dollars(saleB))}.` },
    ];
    const fields = mcqFields(rng, correct, distractors);
    if (fields.options.length < 4) continue;
    return {
      type: 'mcq',
      prompt: `Two shops sell the same ${it.name.replace(/^an? /, '')}.\n\n- **Shop A:** ${cash(PA)}, with ${pa}% off.\n- **Shop B:** ${cash(PB)}, with ${cash(off)} off.\n\nWhich shop is cheaper, and by how much?`,
      ...fields,
      marks: 2,
      calculator: 'not-allowed',
      hints: ['Work out the sale price at each shop.', `${pctHow[pa]}.`],
      solution: `**Shop A:** ${pa}% of ${cash(PA)} is ${cents(dollars(PA * pa))}, so the price is ${cents(dollars(saleA))}.\n\n**Shop B:** ${cash(PB)} − ${cash(off)} = ${cents(dollars(saleB))}.\n\nShop ${better} is cheaper by ${cents(dollars(saleA > saleB ? saleA : saleB))} − ${cents(dollars(saleA > saleB ? saleB : saleA))} = **${cents(dollars(diff))}**.`,
    };
  }
  const fields = mcqFields(rng, { text: 'Shop A, by \\$2.00' }, [
    { text: 'Shop B, by \\$2.00', feedback: 'Shop B works out at \\$47.00, which is more than Shop A.' },
    { text: 'Shop B, because its price starts lower', feedback: 'Compare the prices after the discounts, not before.' },
    { text: 'They cost the same', feedback: 'Shop A is \\$45.00 and Shop B is \\$47.00.' },
  ]);
  return {
    type: 'mcq',
    prompt: 'Two shops sell the same hoodie.\n\n- **Shop A:** \\$60, with 25% off.\n- **Shop B:** \\$55, with \\$8 off.\n\nWhich shop is cheaper, and by how much?',
    ...fields,
    marks: 2,
    calculator: 'not-allowed',
    hints: ['Work out the sale price at each shop.'],
    solution: 'Shop A: 25% of \\$60 is \\$15, so \\$45.00. Shop B: \\$55 − \\$8 = \\$47.00. Shop A is cheaper by **\\$2.00**.',
  };
}

// ---------------------------------------------------------------------------
// Rounding to the nearest cent, unit prices and best buys.

export const unitPrice: QuestionTemplate = {
  id: 'm7.num.money.unit-price',
  topicId: 'm7.num.money',
  title: 'Share amounts, round to the nearest cent, and compare unit prices',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    const name = rng.pick(NAMES);
    if (difficulty === 2) {
      const k = rng.pick([3, 6, 9]);
      let A = rng.int(4, 40);
      while ((A * 100) % k === 0) A += 1;
      const exact = A / k;
      const ans = Math.round(exact * 100) / 100;
      const third = Math.floor((A * 1000) / k) / 1000;
      return {
        type: 'numeric',
        prompt: `${name} and some friends share a ${cash(A)} prize equally between ${k} people. How much does each person get? Give your answer to the nearest cent.`,
        answer: ans,
        decimals: 2,
        units: '$',
        calculator: 'not-allowed',
        hints: [`Work out ${A} ÷ ${k} as a decimal. Keep going to 3 decimal places.`, 'Money is rounded to 2 decimal places (cents). Look at the third decimal place to decide.'],
        solution: `$${A} \\div ${k} = ${third.toFixed(3)}\\ldots$\n\nRounded to 2 decimal places, that is $${texMoney(ans)}$, so each person gets **${cents(ans)}**.`,
      };
    }
    if (difficulty === 3) {
      const packs = [
        { what: 'muesli bars', n: rng.pick([3, 6, 9]) },
        { what: 'yoghurt pottles', n: rng.pick([3, 6]) },
        { what: 'bread rolls', n: rng.pick([6, 9]) },
        { what: 'mandarins', n: rng.pick([3, 6, 7, 9]) },
      ];
      const pk = rng.pick(packs);
      let P = rng.int(2 * pk.n, 4 * pk.n) * 50; // cents, a multiple of 50
      if (P % pk.n === 0) P += 50;
      if (P % pk.n === 0) P += 50;
      const exact = P / pk.n / 100;
      const ans = Math.round(exact * 100) / 100;
      const third = Math.floor((P * 10) / pk.n) / 1000;
      return {
        type: 'numeric',
        prompt: `A pack of ${pk.n} ${pk.what} costs ${cents(dollars(P))}. What is the price of one, to the nearest cent?`,
        answer: ans,
        decimals: 2,
        units: '$',
        calculator: 'not-allowed',
        hints: [`Divide the price by ${pk.n}.`, 'Work to 3 decimal places, then round to 2 (the nearest cent).'],
        solution: `$${texMoney(dollars(P))} \\div ${pk.n} = ${third.toFixed(3)}\\ldots$\n\nTo the nearest cent, one costs **${cents(ans)}**.`,
      };
    }
    // difficulty 4: best buy
    for (let attempt = 0; attempt < 100; attempt++) {
      const what = rng.pick(['muesli bars', 'juice boxes', 'bread rolls', 'pens', 'apples']);
      const nA = rng.pick([3, 4, 5]);
      const nB = rng.pick([6, 8, 10, 12]);
      const uA = 10 * rng.int(6, 25); // unit price in cents
      const uB = uA + 10 * rng.pick([-3, -2, -1, 1, 2]);
      if (uB <= 0) continue;
      const PA = nA * uA;
      const PB = nB * uB;
      const better = uA < uB ? 'A' : 'B';
      const correct: Choice = {
        text: `Pack ${better}: it costs ${cents(dollars(better === 'A' ? uA : uB))} for each one, and Pack ${better === 'A' ? 'B' : 'A'} costs ${cents(dollars(better === 'A' ? uB : uA))}`,
      };
      const distractors: Choice[] = [
        {
          text: `Pack ${better === 'A' ? 'B' : 'A'}: it costs ${cents(dollars(better === 'A' ? uA : uB))} for each one, and Pack ${better} costs ${cents(dollars(better === 'A' ? uB : uA))}`,
          feedback: 'Check which pack each price per item belongs to. Divide each pack price by the number in that pack.',
        },
        better === 'B'
          ? { text: 'Pack A, because it costs less altogether', feedback: 'Pack A has fewer in it, so it costs less altogether. Compare the price of one item instead.' }
          : { text: 'Pack B, because it has more in it', feedback: 'A bigger pack is not always better value. Compare the price of one item.' },
        {
          text: 'They are the same value',
          feedback: `Work out the price of one: Pack A is ${cents(dollars(uA))} each and Pack B is ${cents(dollars(uB))} each.`,
        },
      ];
      if (PA >= PB) continue;
      const fields = mcqFields(rng, correct, distractors);
      return {
        type: 'mcq',
        prompt: `Which pack of ${what} is better value?\n\n- **Pack A:** ${nA} for ${cents(dollars(PA))}\n- **Pack B:** ${nB} for ${cents(dollars(PB))}`,
        ...fields,
        marks: 2,
        calculator: 'not-allowed',
        hints: ['Better value means a lower price for each one.', 'Divide each pack price by the number in the pack.'],
        solution: `Pack A: $${texMoney(dollars(PA))} \\div ${nA} = ${texMoney(dollars(uA))}$ each.\n\nPack B: $${texMoney(dollars(PB))} \\div ${nB} = ${texMoney(dollars(uB))}$ each.\n\n**Pack ${better}** is better value, because each one costs less.`,
      };
    }
    return {
      type: 'numeric',
      prompt: 'A pack of 6 muesli bars costs \\$5.00. What is the price of one, to the nearest cent?',
      answer: 0.83,
      decimals: 2,
      units: '$',
      calculator: 'not-allowed',
      hints: ['Divide the price by 6.'],
      solution: '$5.00 \\div 6 = 0.833\\ldots$, so one costs **\\$0.83**.',
    };
  },
};

export const templates: QuestionTemplate[] = [totalChange, cashRounding, discount, unitPrice];
