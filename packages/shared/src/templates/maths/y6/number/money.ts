import type { QuestionTemplate } from '../../../types';
import type { Rng } from '../../../../rng';
import { NAMES } from '../../../format';
import {
  SHOP_ITEMS,
  SNACKS,
  article,
  cash,
  cashC,
  countUpSteps,
  dollars,
  partsText,
  priceIn,
  texC,
} from './whole-numbers-helpers';

// m6.num.money templates: dollars and cents (decimal place value to two places), adding prices,
// change, 10% / 25% / 50% of whole-dollar amounts, budgets ("is there enough?") and best buys.
// All prices are worked in whole cents so answers are exact. Cash prices are multiples of 10c
// (New Zealand's smallest coin is 10c).

const NOTES = [500, 1000, 2000, 5000, 10000] as const;

/** The smallest note that pays for `totalC`, or occasionally the next one up. */
function noteFor(rng: Rng, totalC: number): number {
  const i = NOTES.findIndex((n) => n > totalC);
  const idx = i === -1 ? NOTES.length - 1 : i;
  // Bump to the next note sometimes, but never past $50 for a small purchase.
  const bump = rng.chance(0.25) && NOTES[idx + 1] !== undefined && NOTES[idx + 1]! <= 5000 ? 1 : 0;
  return NOTES[idx + bump]!;
}

/** Distinct snacks, with prices in cents. */
function pickSnacks(rng: Rng, n: number): Array<{ name: string; price: number }> {
  return rng.sample(SNACKS, n).map((s) => ({ name: s.name, price: priceIn(rng, s) }));
}

/** Working for adding a list of prices: dollars and cents separately. */
function addPricesLines(prices: number[]): string[] {
  const D = prices.map((p) => Math.floor(p / 100));
  const C = prices.map((p) => p % 100);
  const sD = D.reduce((a, b) => a + b, 0);
  const sC = C.reduce((a, b) => a + b, 0);
  const total = sD * 100 + sC;
  const lines = [`Add the dollars: $${D.join(' + ')} = ${sD}$ dollars.`];
  if (C.some((c) => c > 0)) {
    lines.push(
      sC >= 100
        ? `Add the cents: $${C.join(' + ')} = ${sC}$ cents, which is ${cashC(sC)}.`
        : `Add the cents: $${C.join(' + ')} = ${sC}$ cents.`,
    );
  }
  lines.push(`Total: ${cashC(total)}.`);
  return lines;
}

/** "3 × \$4.50 = \$13.50" working, using dollars and cents. */
function timesPriceLine(k: number, p: number): string {
  const D = Math.floor(p / 100);
  const C = p % 100;
  if (C === 0) return `$${k} \\times ${D} = ${k * D}$, so ${k} cost ${cashC(k * p)}.`;
  if (D === 0) return `$${k} \\times ${C}$c $= ${k * C}$c, so ${k} cost ${cashC(k * p)}.`;
  return `$${k} \\times ${D} = ${k * D}$ dollars and $${k} \\times ${C} = ${k * C}$ cents, so ${k} cost ${cashC(k * D * 100)} + ${cashC(k * C)} = ${cashC(k * p)}.`;
}

export const dollarsCents: QuestionTemplate = {
  id: 'm6.num.money.dollars-cents',
  topicId: 'm6.num.money',
  title: 'Dollars and cents: converting and adding prices',
  difficulties: [1, 2],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      const kind = rng.pick(['toDollars', 'toCents', 'same'] as const);
      if (kind === 'same') {
        const D = rng.int(2, 9);
        const X = rng.int(1, 9);
        const options = [
          { text: `${100 * D + X} cents` },
          { text: `${10 * D + X} cents`, feedback: `${10 * D + X} cents is less than 1 dollar, but ${cashC(100 * D + X)} is more than ${D} dollars.` },
          { text: `${100 * D + 10 * X} cents`, feedback: `${100 * D + 10 * X} cents is ${cashC(100 * D + 10 * X)}. In ${cashC(100 * D + X)}, the 0 means there are no 10-cent parts.` },
          { text: `${1000 * D + X} cents`, feedback: 'Each dollar is 100 cents, not 1000 cents.' },
        ];
        const order = rng.shuffle([0, 1, 2, 3]);
        const ids = ['a', 'b', 'c', 'd'];
        const feedback: Record<string, string> = {};
        order.forEach((o, i) => {
          if (options[o]!.feedback) feedback[ids[i]!] = options[o]!.feedback!;
        });
        return {
          type: 'mcq',
          prompt: `Which amount is the same as ${cashC(100 * D + X)}?`,
          options: order.map((o, i) => ({ id: ids[i]!, text: options[o]!.text })),
          correct: ids[order.indexOf(0)]!,
          feedback,
          calculator: 'not-allowed',
          hints: ['There are 100 cents in 1 dollar.', `How many cents are in ${D} dollars? Then add the cents part.`],
          solution: `${D} dollar${D === 1 ? '' : 's'} is $${D} \\times 100 = ${100 * D}$ cents. The cents part of ${cashC(100 * D + X)} is 0${X}, which is ${X} cent${X === 1 ? '' : 's'}.\n\nSo ${cashC(100 * D + X)} $= ${100 * D} + ${X} = ${100 * D + X}$ cents.`,
        };
      }
      const D = rng.int(1, 12);
      const cc = rng.chance(0.4) ? rng.int(1, 9) : 5 * rng.int(2, 19);
      const c = 100 * D + cc;
      const ccText = cc < 10 ? `0${cc}` : `${cc}`;
      if (kind === 'toDollars') {
        return {
          type: 'numeric',
          prompt: `Write ${c} cents in dollars.`,
          answer: dollars(c),
          units: '$',
          calculator: 'not-allowed',
          hints: ['There are 100 cents in 1 dollar.', `How many whole dollars are in ${c} cents? How many cents are left over?`],
          solution: `$${D} \\times 100 = ${100 * D}$, so ${c} cents is ${D} dollar${D === 1 ? '' : 's'} and ${cc} cent${cc === 1 ? '' : 's'}.\n\nThe cents always take two places after the decimal point${cc < 10 ? `, so ${cc} cent${cc === 1 ? '' : 's'} is written .${ccText}` : ''}.\n\n${c} cents $=$ **${cashC(c)}**.`,
        };
      }
      return {
        type: 'numeric',
        prompt: `How many cents are in ${cashC(c)}?`,
        answer: c,
        units: 'c',
        form: 'integer',
        calculator: 'not-allowed',
        hints: ['There are 100 cents in 1 dollar.', `Change the ${D} dollar${D === 1 ? '' : 's'} into cents, then add the cents part.`],
        solution: `${D} dollar${D === 1 ? ' is' : 's are'} $${D} \\times 100 = ${100 * D}$ cents. The two digits after the point, ${ccText}, ${cc === 1 ? 'are 1 cent' : `are ${cc} cents`}.\n\n$${100 * D} + ${cc} = ${c}$ cents.`,
      };
    }
    if (rng.chance(0.5)) {
      const [a, b] = pickSnacks(rng, 2) as [{ name: string; price: number }, { name: string; price: number }];
      return {
        type: 'numeric',
        prompt: `At the school canteen, ${article(a.name)} ${a.name} costs ${cashC(a.price)} and ${article(b.name)} ${b.name} costs ${cashC(b.price)}. How much do they cost altogether?`,
        answer: dollars(a.price + b.price),
        units: '$',
        calculator: 'not-allowed',
        hints: ['Add the dollars and the cents separately.', 'If the cents add to 100 or more, regroup 100 cents as 1 dollar.'],
        solution: [`$${texC(a.price)} + ${texC(b.price)}$`, ...addPricesLines([a.price, b.price]), `They cost **${cashC(a.price + b.price)}** altogether.`].join('\n\n'),
      };
    }
    const [x, y] = rng.sample(SHOP_ITEMS, 2) as [(typeof SHOP_ITEMS)[number], (typeof SHOP_ITEMS)[number]];
    let px = priceIn(rng, x);
    let py = priceIn(rng, y);
    while (px === py) py += 10;
    let [cheap, dear] = [x.name, y.name];
    if (px > py) {
      [px, py] = [py, px];
      [cheap, dear] = [dear, cheap];
    }
    const { lines, parts } = countUpSteps(px, py);
    return {
      type: 'numeric',
      prompt: `${cap1(article(cheap))} ${cheap} costs ${cashC(px)} and ${article(dear)} ${dear} costs ${cashC(py)}. How much more does the ${dear} cost than the ${cheap}?`,
      answer: dollars(py - px),
      units: '$',
      calculator: 'not-allowed',
      hints: ['"How much more" means find the difference.', `Count up from ${cashC(px)} to ${cashC(py)} in friendly jumps.`],
      solution: [
        `Count up from ${cashC(px)} to ${cashC(py)}:`,
        ...lines,
        parts.length > 1 ? `Add the jumps: ${partsText(parts)} $=$ ${cashC(py - px)}.` : '',
        `The ${dear} costs **${cashC(py - px)}** more. (Check: $${texC(py)} - ${texC(px)} = ${texC(py - px)}$.)`,
      ]
        .filter(Boolean)
        .join('\n\n'),
    };
  },
};

const cap1 = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const change: QuestionTemplate = {
  id: 'm6.num.money.change',
  topicId: 'm6.num.money',
  title: 'Work out the change',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    const name = rng.pick(NAMES);
    let lines: string[] = [];
    let total: number;
    let prompt: string;
    let marks = 1;
    if (difficulty === 2) {
      const item = rng.chance(0.5) ? rng.pick(SNACKS) : rng.pick(SHOP_ITEMS);
      total = priceIn(rng, item);
      const paid = noteFor(rng, total);
      prompt = `${name} buys ${article(item.name)} ${item.name} for ${cashC(total)} and pays with a ${cashC(paid)} note. How much change should ${name} get?`;
      return finish(paid);
    }
    if (difficulty === 3) {
      const items = pickSnacks(rng, rng.chance(0.5) ? 2 : 3);
      total = items.reduce((s, it) => s + it.price, 0);
      const list = items.map((it) => `${article(it.name)} ${it.name} for ${cashC(it.price)}`);
      const listText = list.length === 2 ? list.join(' and ') : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
      const paid = noteFor(rng, total);
      prompt = `${name} buys ${listText}. ${name} pays with a ${cashC(paid)} note. How much change should ${name} get?`;
      lines = [`**Total:** $${items.map((it) => texC(it.price)).join(' + ')}$`, ...addPricesLines(items.map((it) => it.price))];
      return finish(paid);
    }
    marks = 2;
    const [a, b] = pickSnacks(rng, 2) as [{ name: string; price: number }, { name: string; price: number }];
    const ka = rng.int(2, 4);
    const kb = rng.int(2, 4);
    const plural = (s: string) =>
      s.startsWith('bottle of') ? s.replace('bottle', 'bottles') : s.startsWith('scoop of') ? s.replace('scoop', 'scoops') : /(ch|sh)$/.test(s) ? `${s}es` : `${s}s`;
    total = ka * a.price + kb * b.price;
    const paid = noteFor(rng, total);
    prompt = `${name} buys ${ka} ${plural(a.name)} at ${cashC(a.price)} each and ${kb} ${plural(b.name)} at ${cashC(b.price)} each for a picnic. ${name} pays with a ${cashC(paid)} note. How much change should ${name} get?`;
    lines = [
      `**${cap1(plural(a.name))}:** ${timesPriceLine(ka, a.price)}`,
      `**${cap1(plural(b.name))}:** ${timesPriceLine(kb, b.price)}`,
      `**Total:** ${cashC(ka * a.price)} + ${cashC(kb * b.price)} = ${cashC(total)}.`,
    ];
    return finish(paid);

    function finish(paid: number) {
      const up = countUpSteps(total, paid);
      return {
        type: 'numeric' as const,
        prompt,
        answer: dollars(paid - total),
        units: '$',
        marks,
        calculator: 'not-allowed' as const,
        hints:
          difficulty === 2
            ? ['Change is the difference between the money you hand over and the price.', `Count up from ${cashC(total)} to ${cashC(paid)}.`]
            : ['First find the total cost.', 'Then count up from the total to the amount paid.'],
        solution: [
          ...lines,
          `**Change:** count up from ${cashC(total)} to ${cashC(paid)}.`,
          ...up.lines,
          up.parts.length > 1 ? `Add the jumps: ${partsText(up.parts)} $=$ ${cashC(paid - total)}.` : '',
          `${name} should get **${cashC(paid - total)}** change. (Check: $${texC(paid)} - ${texC(total)} = ${texC(paid - total)}$.)`,
        ]
          .filter(Boolean)
          .join('\n\n'),
      };
    }
  },
};

export const percentOf: QuestionTemplate = {
  id: 'm6.num.money.percent-of',
  topicId: 'm6.num.money',
  title: '10%, 25% and 50% of whole-dollar amounts, discounts and sale prices',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    const percentWork = (p: number, A: number): string => {
      const AC = A * 100;
      if (p === 50) return `50% is one half. Half of ${cash(A)} is $${A} \\div 2$ = ${cashC(AC / 2)}.`;
      if (p === 10) return `10% is one tenth. One tenth of ${cash(A)} is $${A} \\div 10$ = ${cashC(AC / 10)}.`;
      return `25% is one quarter. Halve ${cash(A)} to get ${cashC(AC / 2)}, then halve again to get ${cashC(AC / 4)}.`;
    };
    const percentHint = (p: number) =>
      p === 50 ? '50% is the same as one half.' : p === 10 ? '10% is the same as one tenth. Divide by 10.' : '25% is the same as one quarter. Halve, then halve again.';
    if (difficulty === 2) {
      const p = rng.pick([50, 10] as const);
      const A = rng.chance(0.5) ? 10 * rng.int(2, 90) : rng.int(12, 199);
      return {
        type: 'numeric',
        prompt: `Find ${p}% of ${cash(A)}.`,
        answer: dollars((A * 100 * p) / 100),
        units: '$',
        calculator: 'not-allowed',
        hints: [percentHint(p), p === 50 ? `What is ${cash(A)} shared into 2 equal parts?` : `What is ${cash(A)} shared into 10 equal parts?`],
        solution: `${percentWork(p, A)}\n\nSo ${p}% of ${cash(A)} is **${cashC(A * p)}**.`,
      };
    }
    const item = rng.pick(SHOP_ITEMS);
    const p = rng.pick([10, 25, 50] as const);
    // Whole-dollar prices; 25% uses multiples of 4 half the time so some answers are whole dollars.
    let A = Math.round(priceIn(rng, item) / 100);
    if (p === 25 && rng.chance(0.5)) A = 4 * Math.max(3, Math.round(A / 4));
    const discC = A * p; // cents
    if (difficulty === 3) {
      if (rng.chance(0.4)) {
        const B = 4 * rng.int(3, 100) + (rng.chance(0.5) ? rng.int(1, 3) : 0);
        return {
          type: 'numeric',
          prompt: `Find 25% of ${cash(B)}.`,
          answer: dollars(B * 25),
          units: '$',
          calculator: 'not-allowed',
          hints: [percentHint(25), `Halve ${cash(B)} first.`],
          solution: `${percentWork(25, B)}\n\nSo 25% of ${cash(B)} is **${cashC(B * 25)}**.`,
        };
      }
      return {
        type: 'numeric',
        prompt: `${cap1(article(item.name))} ${item.name} costs ${cash(A)}. In a sale it has ${p}% off. How much money is taken off the price?`,
        answer: dollars(discC),
        units: '$',
        calculator: 'not-allowed',
        hints: [`The amount taken off is ${p}% of ${cash(A)}.`, percentHint(p)],
        solution: `${percentWork(p, A)}\n\nThe **discount** is ${cashC(discC)}.`,
      };
    }
    const saleC = A * 100 - discC;
    return {
      type: 'numeric',
      prompt: `${cap1(article(item.name))} ${item.name} normally costs ${cash(A)}. In a sale it has ${p}% off. What is the sale price?`,
      answer: dollars(saleC),
      units: '$',
      marks: 2,
      calculator: 'not-allowed',
      hints: [`First find ${p}% of ${cash(A)}. That is the discount.`, 'The sale price is the normal price take away the discount.'],
      solution: `**Discount:** ${percentWork(p, A)}\n\n**Sale price:** $${texC(A * 100)} - ${texC(discC)} = ${texC(saleC)}$.\n\nThe sale price is **${cashC(saleC)}**.`,
    };
  },
};

const BUY_MANY = [
  { one: 'ice block', many: 'ice blocks', prices: [150, 180, 250, 350] },
  { one: 'muesli bar', many: 'muesli bars', prices: [120, 150, 180, 220] },
  { one: 'bus trip', many: 'bus trips', prices: [120, 150, 220, 250] },
  { one: 'packet of seeds', many: 'packets of seeds', prices: [250, 350, 450] },
  { one: 'raffle ticket', many: 'raffle tickets', prices: [150, 200, 250] },
] as const;

export const budget: QuestionTemplate = {
  id: 'm6.num.money.budget',
  topicId: 'm6.num.money',
  title: 'Budgets: is there enough money, and how many can you buy?',
  difficulties: [3, 4, 5],
  generate({ rng, difficulty }) {
    const name = rng.pick(NAMES);
    if (difficulty === 3) {
      let B = 2000;
      let items: Array<{ name: string; price: number }> = [];
      let T = 0;
      for (let attempt = 0; attempt < 200; attempt++) {
        B = 100 * rng.pick([10, 15, 20, 25, 30] as const);
        const count = rng.chance(0.5) ? 2 : 3;
        items = rng.chance(0.5)
          ? pickSnacks(rng, count)
          : rng.sample(SHOP_ITEMS.filter((s) => s.lo < B), count).map((s) => ({ name: s.name, price: priceIn(rng, { lo: s.lo, hi: Math.min(s.hi, B) }) }));
        T = items.reduce((s, it) => s + it.price, 0);
        if (T !== B && Math.abs(T - B) <= 500 && T % 100 !== 0) break;
      }
      const diff = Math.abs(B - T);
      const alt = diff > 100 && rng.chance(0.5) ? diff - 100 : diff + 100;
      const low = Math.min(diff, alt);
      const high = Math.max(diff, alt);
      const enough = T <= B;
      const options = [
        { id: 'a', text: `Yes, with ${cashC(low)} left over`, yes: true, amt: low },
        { id: 'b', text: `Yes, with ${cashC(high)} left over`, yes: true, amt: high },
        { id: 'c', text: `No, ${name} is ${cashC(low)} short`, yes: false, amt: low },
        { id: 'd', text: `No, ${name} is ${cashC(high)} short`, yes: false, amt: high },
      ];
      const correct = options.find((o) => o.yes === enough && o.amt === diff)!.id;
      const feedback: Record<string, string> = {};
      for (const o of options) {
        if (o.id === correct) continue;
        feedback[o.id] =
          o.yes !== enough
            ? `The total is ${cashC(T)}, which is ${enough ? 'less' : 'more'} than ${cash(B / 100)}.`
            : `Check your working: did you regroup 100 cents as 1 dollar when you added or subtracted?`;
      }
      const list = items.map((it) => `${article(it.name)} ${it.name} for ${cashC(it.price)}`);
      const listText = list.length === 2 ? list.join(' and ') : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
      return {
        type: 'mcq',
        prompt: `${name} has ${cash(B / 100)}. ${name} wants to buy ${listText}. Does ${name} have enough money?`,
        options: options.map(({ id, text }) => ({ id, text })),
        correct,
        feedback,
        shuffle: false,
        calculator: 'not-allowed',
        hints: ['Add up the prices to find the total cost.', `Compare the total with ${cash(B / 100)}, and find the difference.`],
        solution: [
          ...addPricesLines(items.map((it) => it.price)),
          enough
            ? `${cashC(T)} is less than ${cash(B / 100)}, so ${name} has enough. Left over: $${texC(B)} - ${texC(T)} = ${texC(diff)}$, so **${cashC(diff)}**.`
            : `${cashC(T)} is more than ${cash(B / 100)}, so ${name} does not have enough. Short by: $${texC(T)} - ${texC(B)} = ${texC(diff)}$, so **${cashC(diff)}**.`,
        ].join('\n\n'),
      };
    }
    if (difficulty === 4) {
      const thing = rng.pick(BUY_MANY);
      const p = rng.pick(thing.prices);
      let n = rng.int(3, 9);
      let B = Math.ceil(((n + rng.next()) * p) / 100);
      while ((B * 100) % p === 0) B++;
      n = Math.floor((B * 100) / p);
      const leftC = B * 100 - n * p;
      const askChange = rng.chance(0.35);
      const multiples = Array.from({ length: n + 1 }, (_, i) => cashC((i + 1) * p));
      const reasoning = [
        `Count up in ${cashC(p)}: ${multiples.slice(0, n).join(', ')}.`,
        `${n} ${thing.many} cost ${cashC(n * p)}. ${n + 1} would cost ${cashC((n + 1) * p)}, which is more than ${cash(B)}.`,
      ];
      if (askChange) {
        return {
          type: 'numeric',
          prompt: `${cap1(thing.many)} cost ${cashC(p)} each. ${name} has ${cash(B)} and buys as many ${thing.many} as possible. How much money does ${name} have left?`,
          answer: dollars(leftC),
          units: '$',
          marks: 2,
          calculator: 'not-allowed',
          hints: [`How many ${thing.many} can ${name} buy without going over ${cash(B)}?`, `Then take their cost away from the money ${name} has.`],
          solution: [...reasoning, `So ${name} buys ${n}. Money left: $${texC(B * 100)} - ${texC(n * p)} = ${texC(leftC)}$, so **${cashC(leftC)}**.`].join('\n\n'),
        };
      }
      return {
        type: 'numeric',
        prompt: `${cap1(thing.many)} cost ${cashC(p)} each. ${name} has ${cash(B)}. What is the greatest number of ${thing.many} ${name} can buy?`,
        answer: n,
        form: 'integer',
        marks: 2,
        calculator: 'not-allowed',
        hints: [`Count up in ${cashC(p)} steps, or work out what 2, 4 or 5 of them cost.`, `Stop before the total goes over ${cash(B)}.`],
        solution: [...reasoning, `So the greatest number ${name} can buy is **${n}**, with ${cashC(leftC)} left over.`].join('\n\n'),
      };
    }
    // difficulty 5: a discount and a remainder
    const item = rng.pick(SHOP_ITEMS);
    const p = rng.pick([10, 25, 50] as const);
    let A = Math.round(priceIn(rng, item) / 100);
    if (p === 25) A = 4 * Math.max(3, Math.round(A / 4));
    if (p === 50 && A % 2 === 1) A += 1;
    const saleC = A * 100 - A * p;
    if (rng.chance(0.5)) {
      const extra = rng.pick(SNACKS);
      const ex = priceIn(rng, extra);
      const spent = saleC + ex;
      const B = 10 * Math.ceil((spent + 100) / 1000);
      return {
        type: 'numeric',
        prompt: `${name} has ${cash(B)}. ${name} buys ${article(item.name)} ${item.name} that normally costs ${cash(A)} but has ${p}% off. ${name} also buys ${article(extra.name)} ${extra.name} for ${cashC(ex)}. How much money does ${name} have left?`,
        answer: dollars(B * 100 - spent),
        units: '$',
        marks: 3,
        calculator: 'not-allowed',
        hints: [`Find the sale price of the ${item.name} first: work out ${p}% of ${cash(A)} and take it off.`, 'Add the two things together, then take the total away from what ' + name + ' has.'],
        solution: [
          `**Discount:** ${p}% of ${cash(A)} is ${cashC(A * p)}. Sale price: $${texC(A * 100)} - ${texC(A * p)} = ${texC(saleC)}$.`,
          `**Total spent:** $${texC(saleC)} + ${texC(ex)} = ${texC(spent)}$.`,
          `**Left:** $${texC(B * 100)} - ${texC(spent)} = ${texC(B * 100 - spent)}$, so ${name} has **${cashC(B * 100 - spent)}** left.`,
        ].join('\n\n'),
      };
    }
    const thing = rng.pick(BUY_MANY);
    const u = rng.pick(thing.prices);
    let B = 10 * Math.ceil((saleC + 3 * u) / 1000);
    while ((B * 100 - saleC) % u === 0) B += 1;
    const rest = B * 100 - saleC;
    const n = Math.floor(rest / u);
    return {
      type: 'numeric',
      prompt: `${name} has ${cash(B)}. ${name} buys ${article(item.name)} ${item.name} that normally costs ${cash(A)} but has ${p}% off. ${name} spends the rest of the money on ${thing.many} at ${cashC(u)} each. How many ${thing.many} can ${name} buy?`,
      answer: n,
      form: 'integer',
      marks: 3,
      calculator: 'not-allowed',
      hints: [`Find the sale price of the ${item.name}, then how much money is left.`, `How many lots of ${cashC(u)} fit into the money left? Any money left over can't buy a whole one.`],
      solution: [
        `**Sale price:** ${p}% of ${cash(A)} is ${cashC(A * p)}, so the ${item.name} costs $${texC(A * 100)} - ${texC(A * p)} = ${texC(saleC)}$.`,
        `**Money left:** $${texC(B * 100)} - ${texC(saleC)} = ${texC(rest)}$.`,
        `**${cap1(thing.many)}:** ${n} cost ${cashC(n * u)} and ${n + 1} would cost ${cashC((n + 1) * u)}, which is too much. So ${name} can buy **${n}** ${thing.many} (with ${cashC(rest - n * u)} left over).`,
      ].join('\n\n'),
    };
  },
};

const PACK_ITEMS = ['muesli bars', 'juice boxes', 'pottles of yoghurt', 'tennis balls', 'gel pens'] as const;
const FRUIT = ['feijoas', 'mandarins', 'avocados', 'kiwifruit', 'apples'] as const;

export const bestBuy: QuestionTemplate = {
  id: 'm6.num.money.best-buy',
  topicId: 'm6.num.money',
  title: 'Best buy: compare prices',
  difficulties: [4, 5],
  generate({ rng, difficulty }) {
    if (difficulty === 4) {
      const item = rng.pick(PACK_ITEMS);
      const nA = rng.int(2, 8);
      let nB = rng.int(2, 8);
      while (nB === nA) nB = rng.int(2, 8);
      const uA = 10 * rng.int(6, 30);
      let uB = 10 * rng.int(6, 30);
      while (uB === uA) uB = 10 * rng.int(6, 30);
      const TA = nA * uA;
      const TB = nB * uB;
      const best = uA < uB ? 'a' : 'b';
      const unit = (n: number, T: number, u: number, label: string) =>
        `**Pack ${label}:** ${cashC(T)} for ${n}. $${T} \\div ${n} = ${u}$ cents, so one costs ${cashC(u)}.`;
      return {
        type: 'mcq',
        prompt: `A shop sells ${item} in two packs.\n\n- **Pack A:** ${nA} ${item} for ${cashC(TA)}\n- **Pack B:** ${nB} ${item} for ${cashC(TB)}\n\nWhich pack is better value?`,
        options: [
          { id: 'a', text: 'Pack A' },
          { id: 'b', text: 'Pack B' },
          { id: 'c', text: 'They are the same value' },
        ],
        correct: best,
        feedback: {
          [best === 'a' ? 'b' : 'a']: `Work out the price of one in each pack. One in Pack ${best === 'a' ? 'B' : 'A'} costs ${cashC(Math.max(uA, uB))}, which is more.`,
          c: 'The packs have different prices for one item. Work out the price of one in each pack.',
        },
        shuffle: false,
        marks: 2,
        calculator: 'not-allowed',
        hints: ['The cheaper pack is not always the better value: the packs hold different numbers.', 'Work out the price of one in each pack. Change the price to cents, then divide.'],
        solution: [unit(nA, TA, uA, 'A'), unit(nB, TB, uB, 'B'), `One costs less in Pack ${best.toUpperCase()}, so **Pack ${best.toUpperCase()}** is better value.`].join('\n\n'),
      };
    }
    const fruit = rng.pick(FRUIT);
    const k = rng.int(3, 6);
    // Keep fruit prices realistic: at most about $1.50 each.
    const TA = 100 * rng.int(2, Math.floor(1.5 * k));
    const fair = Math.round(TA / k / 10) * 10;
    let y = fair + 10 * rng.int(-3, 3);
    while (k * y === TA || y <= 0) y += 10;
    const TB = k * y;
    const best = TA < TB ? 'a' : 'b';
    return {
      type: 'mcq',
      prompt: `Shop A sells ${fruit} at ${k} for ${cashC(TA)}. Shop B sells them for ${cashC(y)} each. ${rng.pick(NAMES)} wants to buy ${k} ${fruit}. Which shop is cheaper?`,
      options: [
        { id: 'a', text: 'Shop A' },
        { id: 'b', text: 'Shop B' },
        { id: 'c', text: 'They cost the same' },
      ],
      correct: best,
      feedback: {
        [best === 'a' ? 'b' : 'a']: `Work out the cost of ${k} ${fruit} at each shop. Shop ${best === 'a' ? 'B' : 'A'} costs ${cashC(Math.max(TA, TB))} for ${k}.`,
        c: `Work out the cost of ${k} ${fruit} at Shop B and compare it with ${cashC(TA)}.`,
      },
      shuffle: false,
      marks: 2,
      calculator: 'not-allowed',
      hints: [`Compare the same number of ${fruit} at each shop.`, `How much would ${k} ${fruit} cost at Shop B?`],
      solution: `Compare the cost of ${k} ${fruit}.\n\n**Shop A:** ${cashC(TA)}.\n\n**Shop B:** $${k} \\times ${y}$ cents $= ${TB}$ cents $=$ ${cashC(TB)}.\n\n${cashC(Math.min(TA, TB))} is less than ${cashC(Math.max(TA, TB))}, so **Shop ${best.toUpperCase()}** is cheaper.`,
    };
  },
};

export const templates: QuestionTemplate[] = [dollarsCents, change, percentOf, budget, bestBuy];
