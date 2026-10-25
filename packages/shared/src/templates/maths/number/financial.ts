import type { QuestionTemplate } from '../../types';
import { clean, NAMES, round, tex } from '../../format';
import { cash, cents, pct } from './helpers';

// m9.num.financial — discounts, mark-ups, GST at 15%, simple interest and wages.
// (Compound interest and currency conversion are Year 10, so they aren't included.)

const money2 = (x: number) => tex(round(x, 2), Number.isInteger(round(x, 2)) ? 0 : 2);

const ITEMS = [
  { name: 'a pair of running shoes', lo: 6, hi: 18 },
  { name: 'a hoodie', lo: 3, hi: 8 },
  { name: 'a school bag', lo: 3, hi: 9 },
  { name: 'a skateboard', lo: 4, hi: 12 },
  { name: 'a netball', lo: 2, hi: 4 },
  { name: 'a tent', lo: 8, hi: 30 },
  { name: 'a bike helmet', lo: 3, hi: 8 },
] as const;

export const discountMarkup: QuestionTemplate = {
  id: 'm9.num.financial.discount-markup',
  topicId: 'm9.num.financial',
  title: 'Discounts and mark-ups',
  difficulties: [1, 2, 3, 4],
  generate({ rng, difficulty }) {
    const item = rng.pick(ITEMS);
    const P = 10 * rng.int(item.lo, item.hi); // price in whole dollars, a multiple of 10
    if (difficulty === 1) {
      const p = rng.pick([10, 20, 25, 50, 30, 15, 5]);
      const d = clean((p * P) / 100);
      return {
        type: 'numeric',
        prompt: `${item.name.charAt(0).toUpperCase() + item.name.slice(1)} costs ${cash(P)}. In a sale it has ${p}% off. How much is the discount?`,
        answer: d,
        units: '$',
        calculator: 'allowed',
        hints: ['The discount is the amount taken off the price.', `Find ${p}% of ${cash(P)}.`],
        solution: `Discount $= ${p}\\% \\text{ of } ${tex(P)} = ${tex(P)} \\times ${tex(p / 100)} = ${money2(d)}$, so the discount is **${cash(d)}**.`,
      };
    }
    if (difficulty === 2) {
      if (rng.chance(0.5)) {
        const p = rng.pick([10, 15, 20, 25, 30, 40, 35]);
        const m = clean(1 - p / 100);
        const S = round(P * m, 2);
        return {
          type: 'numeric',
          prompt: `${item.name.charAt(0).toUpperCase() + item.name.slice(1)} normally costs ${cash(P)}. It is on sale with ${p}% off. What is the sale price?`,
          answer: S,
          units: '$',
          calculator: 'allowed',
          hints: [`After ${p}% off you pay $100\\% - ${p}\\% = ${100 - p}\\%$ of the price.`, `Multiply by $${tex(m)}$.`],
          solution: `You pay ${100 - p}% of the price, so multiply by $${tex(m)}$:\n\n$${tex(P)} \\times ${tex(m)} = ${money2(S)}$\n\nThe sale price is **${cash(S)}**. (Or: discount $= ${money2(P - S)}$, and $${tex(P)} - ${money2(P - S)} = ${money2(S)}$.)`,
        };
      }
      const p = rng.pick([20, 25, 30, 40, 50, 60, 75]);
      const C = 5 * rng.int(2, 30);
      const m = clean(1 + p / 100);
      const S = round(C * m, 2);
      return {
        type: 'numeric',
        prompt: `A shop buys a jacket for ${cash(C)} and adds a mark-up of ${p}%. What is the selling price?`,
        answer: S,
        units: '$',
        calculator: 'allowed',
        hints: ['A mark-up is an amount added on to the cost price.', `The selling price is $100\\% + ${p}\\% = ${100 + p}\\%$ of the cost.`],
        solution: `Multiply the cost by $${tex(m)}$:\n\n$${tex(C)} \\times ${tex(m)} = ${money2(S)}$\n\nThe selling price is **${cash(S)}**.`,
      };
    }
    if (difficulty === 3) {
      if (rng.chance(0.5)) {
        const p = rng.pick([10, 15, 20, 25, 30, 40, 35, 45, 60]);
        const S = round(P * (1 - p / 100), 2);
        return {
          type: 'numeric',
          prompt: `${item.name.charAt(0).toUpperCase() + item.name.slice(1)} is reduced from ${cash(P)} to ${cash(S)}. What is the percentage discount?`,
          answer: p,
          units: '%',
          marks: 2,
          calculator: 'allowed',
          hints: ['Find the discount in dollars first.', 'Percentage discount = discount ÷ original price × 100.'],
          solution: `Discount: $${tex(P)} - ${money2(S)} = ${money2(P - S)}$.\n\nPercentage: $\\frac{${money2(P - S)}}{${tex(P)}} \\times 100 = ${p}$, so it is a **${p}%** discount.`,
        };
      }
      let p = 40;
      let costC = 150; // cents
      for (let attempt = 0; attempt < 100; attempt++) {
        p = rng.pick([20, 40, 50, 60, 80, 100]);
        costC = 25 * rng.int(4, 12); // $1.00 … $3.00
        if ((costC * p) % 100 === 0) break;
      }
      const sellC = costC + (costC * p) / 100;
      return {
        type: 'numeric',
        prompt: `A café buys muffins for ${cents(costC / 100)} each and sells them for ${cents(sellC / 100)} each. What is the percentage mark-up?`,
        answer: p,
        units: '%',
        marks: 2,
        calculator: 'allowed',
        hints: ['Find the mark-up in dollars first (selling price − cost price).', 'Percentage mark-up = mark-up ÷ cost price × 100.'],
        solution: `Mark-up: $${tex(sellC / 100, 2)} - ${tex(costC / 100, 2)} = ${tex((sellC - costC) / 100, 2)}$.\n\nPercentage: $\\frac{${tex((sellC - costC) / 100, 2)}}{${tex(costC / 100, 2)}} \\times 100 = ${p}$, so the mark-up is **${p}%**.\n\nAlways divide by the **cost** price for a mark-up.`,
      };
    }
    // difficulty 4: two changes in a row
    if (rng.chance(0.5)) {
      let p1 = 20;
      let p2 = 10;
      for (let attempt = 0; attempt < 100; attempt++) {
        p1 = rng.pick([10, 20, 25, 30, 40]);
        p2 = rng.pick([10, 20, 25, 50]);
        if ((P * (100 - p1) * (100 - p2)) % 100 === 0) break; // exact cents
      }
      const S = round(P * (1 - p1 / 100) * (1 - p2 / 100), 2);
      const mid = round(P * (1 - p1 / 100), 2);
      return {
        type: 'numeric',
        prompt: `${item.name.charAt(0).toUpperCase() + item.name.slice(1)} costs ${cash(P)}. It is reduced by ${p1}%. Later, the sale price is reduced by a further ${p2}%. What is the final price?`,
        answer: S,
        units: '$',
        marks: 3,
        calculator: 'allowed',
        hints: ['Do the two discounts one after the other.', `The second discount is ${p2}% of the **sale** price, not the original price.`],
        solution: `First discount: $${tex(P)} \\times ${tex(clean(1 - p1 / 100))} = ${money2(mid)}$.\n\nSecond discount: $${money2(mid)} \\times ${tex(clean(1 - p2 / 100))} = ${money2(S)}$.\n\nThe final price is **${cash(S)}**. Note this is not the same as ${p1 + p2}% off (which would give ${cash(round(P * (1 - (p1 + p2) / 100), 2))}).`,
      };
    }
    const m = rng.pick([25, 40, 50, 60, 80, 100]);
    const d = rng.pick([10, 20, 25, 30]);
    const C = 20 * rng.int(2, 15);
    const sell = round(C * (1 + m / 100), 2);
    const S = round(sell * (1 - d / 100), 2);
    return {
      type: 'numeric',
      prompt: `A sports shop buys rugby boots for ${cash(C)} a pair. It marks them up by ${m}%, then later sells them in a sale at ${d}% off. What is the sale price?`,
      answer: S,
      units: '$',
      marks: 3,
      calculator: 'allowed',
      hints: ['First find the normal selling price after the mark-up.', `Then take ${d}% off that price.`],
      solution: `Mark-up: $${tex(C)} \\times ${tex(clean(1 + m / 100))} = ${money2(sell)}$.\n\nSale: $${money2(sell)} \\times ${tex(clean(1 - d / 100))} = ${money2(S)}$.\n\nThe sale price is **${cash(S)}**.`,
    };
  },
};

export const gst: QuestionTemplate = {
  id: 'm9.num.financial.gst',
  topicId: 'm9.num.financial',
  title: 'Add and remove GST at 15%',
  difficulties: [1, 2, 3, 4],
  generate({ rng, difficulty }) {
    const X = rng.int(4, 400); // price excluding GST, whole dollars
    const G = round(X * 0.15, 2);
    const I = round(X * 1.15, 2);
    const thing = rng.pick(['a lawnmower service', 'a plumber’s call-out', 'a box of printer paper', 'a pair of headphones', 'a set of rugby jerseys', 'a bike repair']);
    const gstNote = 'In New Zealand, GST (goods and services tax) is 15%.';
    if (difficulty === 1) {
      return {
        type: 'numeric',
        prompt: `The price of ${thing} is ${cash(X)} before GST. How much GST (15%) must be added?`,
        answer: G,
        units: '$',
        calculator: 'allowed',
        hints: [gstNote, 'Find 15% of the price: multiply by 0.15.'],
        solution: `GST $= ${tex(X)} \\times 0.15 = ${money2(G)}$, so the GST is **${cents(G)}**.\n\n(Mental method: 10% is ${cents(X / 10)} and 5% is ${cents(X / 20)}, which add to ${cents(G)}.)`,
      };
    }
    if (difficulty === 2) {
      return {
        type: 'numeric',
        prompt: `The price of ${thing} is ${cash(X)} plus GST. What is the price including GST?`,
        answer: I,
        units: '$',
        calculator: 'allowed',
        hints: [gstNote, 'Adding 15% is the same as multiplying by 1.15.'],
        solution: `Price including GST $= ${tex(X)} \\times 1.15 = ${money2(I)}$, so it costs **${cents(I)}**.`,
      };
    }
    if (difficulty === 3) {
      return {
        type: 'numeric',
        prompt: `The price of ${thing} is ${cents(I)} including GST. What was the price before GST was added?`,
        answer: X,
        units: '$',
        marks: 2,
        calculator: 'allowed',
        hints: ['The price including GST is 115% of the price before GST.', 'To remove GST, divide by 1.15. (Taking 15% off the GST-inclusive price does not work!)'],
        solution: `Price including GST = price before GST × 1.15, so divide by 1.15:\n\n$${money2(I)} \\div 1.15 = ${tex(X)}$\n\nThe price before GST was **${cash(X)}**.\n\nCheck: $${tex(X)} \\times 1.15 = ${money2(I)}$ ✓`,
      };
    }
    const name = rng.pick(NAMES);
    return {
      type: 'numeric',
      prompt: `${name}'s receipt shows a total of ${cents(I)}, including GST. How much of this total is GST?`,
      answer: G,
      units: '$',
      marks: 3,
      calculator: 'allowed',
      hints: ['First find the price before GST by dividing by 1.15.', 'The GST is the difference between the two prices.'],
      solution: `Price before GST: $${money2(I)} \\div 1.15 = ${tex(X)}$.\n\nGST: $${money2(I)} - ${tex(X)} = ${money2(G)}$, so the GST is **${cents(G)}**.\n\n(Shortcut: the GST part of a GST-inclusive price is $\\frac{3}{23}$ of it, because $\\frac{0.15}{1.15} = \\frac{3}{23}$.)`,
    };
  },
};

export const simpleInterest: QuestionTemplate = {
  id: 'm9.num.financial.simple-interest',
  topicId: 'm9.num.financial',
  title: 'Simple interest',
  difficulties: [2, 3, 4, 5],
  generate({ rng, difficulty }) {
    const name = rng.pick(NAMES);
    const P = rng.pick([400, 500, 600, 800, 1000, 1200, 1500, 2000, 2500, 3000, 4000, 5000]);
    const r = rng.pick([2, 2.5, 3, 3.5, 4, 4.5, 5, 6]);
    const t = rng.int(2, 6);
    const formula = '$I = P \\times r \\times t$, where $P$ is the principal, $r$ is the interest rate per year (as a decimal) and $t$ is the time in years.';
    if (difficulty === 2) {
      const I = round(P * (r / 100) * t, 2);
      return {
        type: 'numeric',
        prompt: `${name} invests ${cash(P)} at ${pct(r)} per year simple interest for ${t} years. How much interest does ${name} earn?`,
        answer: I,
        units: '$',
        calculator: 'allowed',
        hints: ['Use $I = P \\times r \\times t$.', `Write ${pct(r)} as a decimal: $${tex(r)} \\div 100 = ${tex(clean(r / 100))}$.`],
        solution: `${formula}\n\n$I = ${tex(P)} \\times ${tex(clean(r / 100))} \\times ${t} = ${money2(I)}$\n\n${name} earns **${cash(I)}** interest.`,
      };
    }
    if (difficulty === 3) {
      if (rng.chance(0.5)) {
        const I = round(P * (r / 100) * t, 2);
        const A = round(P + I, 2);
        return {
          type: 'numeric',
          prompt: `${name} puts ${cash(P)} in a savings account that pays ${pct(r)} per year simple interest. How much is in the account after ${t} years?`,
          answer: A,
          units: '$',
          marks: 2,
          calculator: 'allowed',
          hints: ['First work out the interest with $I = P \\times r \\times t$.', 'Then add the interest to the amount invested.'],
          solution: `Interest: $${tex(P)} \\times ${tex(clean(r / 100))} \\times ${t} = ${money2(I)}$.\n\nTotal: $${tex(P)} + ${money2(I)} = ${money2(A)}$, so there is **${cash(A)}** in the account.`,
        };
      }
      // time given in months
      let months = 18;
      let rate = r;
      let principal = P;
      for (let attempt = 0; attempt < 100; attempt++) {
        months = rng.pick([6, 9, 18, 30, 15]);
        rate = rng.pick([2, 3, 4, 5, 6, 8]);
        principal = rng.pick([600, 800, 1200, 1500, 2000, 2400, 3000, 3600, 4800]);
        if ((principal * rate * months) % 12 === 0) break;
      }
      const years = months / 12;
      const I = round((principal * rate * months) / 1200, 2);
      return {
        type: 'numeric',
        prompt: `${name} borrows ${cash(principal)} at ${rate}% per year simple interest for ${months} months. How much interest is charged?`,
        answer: I,
        units: '$',
        marks: 2,
        calculator: 'allowed',
        hints: ['The time must be in years.', `${months} months is $\\frac{${months}}{12}$ of a year.`],
        solution: `Time: $${months} \\div 12 = ${tex(years)}$ years.\n\n$I = ${tex(principal)} \\times ${tex(clean(rate / 100))} \\times ${tex(years)} = ${money2(I)}$, so the interest is **${cash(I)}**.`,
      };
    }
    if (difficulty === 4) {
      const I = round(P * (r / 100) * t, 2);
      if (rng.chance(0.5)) {
        return {
          type: 'numeric',
          prompt: `${name} invests ${cash(P)} for ${t} years and earns ${cash(I)} simple interest. What is the interest rate per year?`,
          answer: r,
          units: '%',
          marks: 2,
          calculator: 'allowed',
          hints: ['Find the interest earned in one year first.', 'Then write one year’s interest as a percentage of the principal.'],
          solution: `Interest per year: $${money2(I)} \\div ${t} = ${money2(I / t)}$.\n\nRate: $\\frac{${money2(I / t)}}{${tex(P)}} \\times 100 = ${tex(r)}$, so the rate is **${pct(r)} per year**.\n\n(Or rearrange $I = Prt$: $r = \\frac{I}{P \\times t}$.)`,
        };
      }
      return {
        type: 'numeric',
        prompt: `${name} invests ${cash(P)} at ${pct(r)} per year simple interest. How many years will it take to earn ${cash(I)} in interest?`,
        answer: t,
        marks: 2,
        calculator: 'allowed',
        hints: ['Find the interest earned in one year.', 'How many years of that interest make the total?'],
        solution: `One year's interest: $${tex(P)} \\times ${tex(clean(r / 100))} = ${money2((P * r) / 100)}$.\n\nYears: $${money2(I)} \\div ${money2((P * r) / 100)} = ${t}$, so it takes **${t} years**.`,
      };
    }
    // difficulty 5: find the principal from the final amount
    const A = round(P * (1 + (r / 100) * t), 2);
    const factor = clean(1 + (r / 100) * t);
    return {
      type: 'numeric',
      prompt: `${name} invested some money at ${pct(r)} per year simple interest. After ${t} years the account holds ${cash(A)} (the original amount plus interest). How much did ${name} invest?`,
      answer: P,
      units: '$',
      marks: 3,
      calculator: 'allowed',
      hints: [`Each year the interest is ${pct(r)} of the original amount, so after ${t} years it is ${pct(clean(r * t))} of it.`, `So the final amount is ${pct(clean(100 + r * t))} of the original amount.`],
      solution: `Total interest over ${t} years: $${t} \\times ${tex(r)}\\% = ${tex(clean(r * t))}\\%$ of the original amount.\n\nSo the final amount is ${pct(clean(100 + r * t))} of the original: original × ${tex(factor)} = ${cash(A)}.\n\nOriginal: $${money2(A)} \\div ${tex(factor)} = ${tex(P)}$, so ${name} invested **${cash(P)}**.\n\nCheck: interest $= ${tex(P)} \\times ${tex(clean(r / 100))} \\times ${t} = ${money2(A - P)}$, and $${tex(P)} + ${money2(A - P)} = ${money2(A)}$ ✓`,
    };
  },
};

export const wages: QuestionTemplate = {
  id: 'm9.num.financial.wages',
  topicId: 'm9.num.financial',
  title: 'Wages, overtime, commission and sharing money',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    const name = rng.pick(NAMES);
    const rateCents = rng.int(92, 112) * 25; // $23.00 … $28.00 in 25c steps
    const rate = rateCents / 100;
    if (difficulty === 1) {
      const hours = rng.int(4, 30);
      const pay = (rateCents * hours) / 100;
      return {
        type: 'numeric',
        prompt: `${name} works at a café and is paid ${cents(rate)} per hour. How much does ${name} earn for ${hours} hours?`,
        answer: pay,
        units: '$',
        calculator: 'allowed',
        hints: ['Pay = hourly rate × hours worked.'],
        solution: `$${tex(rate, 2)} \\times ${hours} = ${tex(pay, 2)}$, so ${name} earns **${cents(pay)}**.`,
      };
    }
    if (difficulty === 2) {
      const rate = (50 * rng.int(46, 56)) / 100; // a multiple of 50c, so time-and-a-half is exact
      const normal = rng.int(20, 40);
      const extra = rng.int(2, 8);
      const overtimeRate = round(rate * 1.5, 2);
      const pay = round(rate * normal + overtimeRate * extra, 2);
      return {
        type: 'numeric',
        prompt: `${name} earns ${cents(rate)} per hour. One week ${name} works ${normal} normal hours and ${extra} hours of overtime at time-and-a-half. What is ${name}'s total pay for the week?`,
        answer: pay,
        units: '$',
        marks: 2,
        calculator: 'allowed',
        hints: ['Time-and-a-half means 1.5 times the normal hourly rate.', 'Work out normal pay and overtime pay separately, then add.'],
        solution: `Normal pay: $${tex(rate, 2)} \\times ${normal} = ${tex(round(rate * normal, 2), 2)}$.\n\nOvertime rate: $${tex(rate, 2)} \\times 1.5 = ${tex(overtimeRate, 2)}$ per hour, so overtime pay is $${tex(overtimeRate, 2)} \\times ${extra} = ${tex(round(overtimeRate * extra, 2), 2)}$.\n\nTotal: **${cents(pay)}**.`,
      };
    }
    if (rng.chance(0.5)) {
      const p = rng.pick([2, 3, 4, 5, 6, 8, 10]);
      const sales = 1000 * rng.int(15, 120);
      const comm = (sales * p) / 100;
      return {
        type: 'numeric',
        prompt: `${name} sells cars and earns ${p}% commission on sales. One month ${name} sells ${cash(sales)} worth of cars. How much commission does ${name} earn?`,
        answer: comm,
        units: '$',
        calculator: 'allowed',
        hints: ['Commission is a percentage of the value of the sales.', `Find ${p}% of the sales.`],
        solution: `$${tex(sales)} \\times ${tex(p / 100)} = ${tex(comm)}$, so the commission is **${cash(comm)}**.`,
      };
    }
    const [n2, n3] = rng.sample(NAMES.filter((x) => x !== name), 2) as [string, string];
    const h = [rng.int(2, 6), rng.int(2, 6), rng.int(2, 6)];
    const total = h[0]! + h[1]! + h[2]!;
    const u = rng.int(4, 15) * 2;
    const profit = total * u;
    const who = rng.int(0, 2);
    const names = [name, n2, n3];
    return {
      type: 'numeric',
      prompt: `${name}, ${n2} and ${n3} ran a car wash for the school ball fund and made ${cash(profit)}. They share the money in the ratio of the hours they worked: ${h[0]} hours, ${h[1]} hours and ${h[2]} hours. How much does ${names[who]} get?`,
      answer: h[who]! * u,
      units: '$',
      marks: 2,
      calculator: 'allowed',
      hints: [`The ratio is $${h.join(' : ')}$. How many shares is that altogether?`, 'Find the value of one share.'],
      solution: `Total shares: $${h.join(' + ')} = ${total}$.\n\nOne share: $${tex(profit)} \\div ${total} = ${tex(u)}$.\n\n${names[who]}: $${h[who]} \\times ${tex(u)} = ${tex(h[who]! * u)}$, so **${cash(h[who]! * u)}**.`,
    };
  },
};

