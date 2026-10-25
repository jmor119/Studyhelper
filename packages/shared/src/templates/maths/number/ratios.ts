import type { QuestionTemplate } from '../../types';
import { clean, frac, gcd, lcm, NAMES, num, tex } from '../../format';
import { cash, cents, properFraction, simp } from './helpers';

// m9.num.ratios-rates — simplifying and sharing in ratios, equivalent ratios, and rates.

/** Coprime pair a:b with 1 ≤ a, b ≤ max and a ≠ b. */
function coprimePair(rng: { int(a: number, b: number): number }, max: number): [number, number] {
  for (;;) {
    const a = rng.int(1, max);
    const b = rng.int(1, max);
    if (a !== b && gcd(a, b) === 1) return [a, b];
  }
}

const ratioTex = (xs: number[]) => xs.map((x) => tex(x)).join(' : ');

/** Cloze answer fields for a ratio in simplest form. */
function ratioCloze(parts: number[]) {
  const ids = ['a', 'b', 'c'];
  return {
    blanksText: parts.map((_, i) => `[[${ids[i]}]]`).join(' : '),
    blanks: parts.map((x, i) => ({ id: ids[i]!, accepted: [String(x)] })),
  };
}

export const simplifyRatios: QuestionTemplate = {
  id: 'm9.num.ratios-rates.simplify',
  topicId: 'm9.num.ratios-rates',
  title: 'Simplify ratios and find equivalent ratios',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      const [a, b] = coprimePair(rng, 9);
      const k = rng.int(2, 9);
      if (rng.chance(0.5)) {
        const c = ratioCloze([a, b]);
        return {
          type: 'cloze',
          prompt: `Write $${ratioTex([k * a, k * b])}$ in simplest form.\n\n${c.blanksText}`,
          blanks: c.blanks,
          calculator: 'not-allowed',
          hints: ['Find the highest common factor of the two numbers.', 'Divide both parts of the ratio by it.'],
          solution: `The HCF of ${k * a} and ${k * b} is ${k}. Divide both parts by ${k}:\n\n$${ratioTex([k * a, k * b])} = ${ratioTex([a, b])}$`,
        };
      }
      const missingSecond = rng.chance(0.5);
      return {
        type: 'numeric',
        prompt: `Find the missing number: $${ratioTex([a, b])} = ${missingSecond ? `${tex(k * a)} : \\square` : `\\square : ${tex(k * b)}`}$`,
        answer: missingSecond ? k * b : k * a,
        form: 'integer',
        calculator: 'not-allowed',
        hints: [missingSecond ? `What has ${a} been multiplied by to get ${k * a}?` : `What has ${b} been multiplied by to get ${k * b}?`, 'Multiply the other part by the same number.'],
        solution: `${missingSecond ? `$${a} \\times ${k} = ${k * a}$, so multiply ${b} by ${k} too: $${b} \\times ${k} = ${k * b}$.` : `$${b} \\times ${k} = ${k * b}$, so multiply ${a} by ${k} too: $${a} \\times ${k} = ${k * a}$.`}\n\n$${ratioTex([a, b])} = ${ratioTex([k * a, k * b])}$`,
      };
    }
    if (difficulty === 2) {
      if (rng.chance(0.5)) {
        // three-part ratio
        let parts: number[] = [];
        for (;;) {
          parts = [rng.int(1, 7), rng.int(1, 7), rng.int(1, 7)];
          if (gcd(gcd(parts[0]!, parts[1]!), parts[2]!) === 1 && new Set(parts).size > 1) break;
        }
        const k = rng.int(2, 8);
        const big = parts.map((x) => x * k);
        const c = ratioCloze(parts);
        return {
          type: 'cloze',
          prompt: `Write $${ratioTex(big)}$ in simplest form.\n\n${c.blanksText}`,
          blanks: c.blanks,
          calculator: 'not-allowed',
          hints: ['Find the highest number that divides into all three parts.', 'Divide every part by it.'],
          solution: `The HCF of ${big.join(', ')} is ${k}. Divide every part by ${k}:\n\n$${ratioTex(big)} = ${ratioTex(parts)}$`,
        };
      }
      // different units
      const unit = rng.pick([
        { small: 'cm', big: 'm', factor: 100 },
        { small: 'g', big: 'kg', factor: 1000 },
        { small: 'min', big: 'h', factor: 60 },
        { small: 'mL', big: 'L', factor: 1000 },
        { small: 'mm', big: 'cm', factor: 10 },
      ]);
      for (;;) {
        const B = rng.int(1, 5);
        const total = B * unit.factor;
        const qs: number[] = [];
        for (let q = 2; q <= 12; q++) if (total % q === 0) qs.push(q);
        const q = rng.pick(qs);
        const p = rng.int(1, 12);
        if (p === q || gcd(p, q) !== 1) continue;
        const A = p * (total / q);
        if (A % unit.factor === 0) continue;
        const c = ratioCloze([p, q]);
        const g = total / q;
        return {
          type: 'cloze',
          prompt: `Write the ratio ${num(A)} ${unit.small} : ${B} ${unit.big} in simplest form.\n\n${c.blanksText}`,
          blanks: c.blanks,
          calculator: 'not-allowed',
          hints: [`Both parts must be in the same units. Change ${B} ${unit.big} into ${unit.small}.`, 'Then simplify by dividing both parts by their HCF.'],
          solution: `$${B}$ ${unit.big} $= ${tex(total)}$ ${unit.small}, so the ratio is $${ratioTex([A, total])}$.\n\nThe HCF is ${num(g)}, so this simplifies to $${ratioTex([p, q])}$.`,
        };
      }
    }
    // difficulty 3: decimals or fractions in the ratio
    if (rng.chance(0.5)) {
      const [p, q] = coprimePair(rng, 9);
      const t = rng.pick([0.1, 0.2, 0.25, 0.4, 0.5]);
      const a = clean(p * t);
      const b = clean(q * t);
      const scale = t === 0.25 ? 100 : 10;
      const A = Math.round(a * scale);
      const B = Math.round(b * scale);
      const c = ratioCloze([p, q]);
      return {
        type: 'cloze',
        prompt: `Write $${ratioTex([a, b])}$ in simplest form, using whole numbers.\n\n${c.blanksText}`,
        blanks: c.blanks,
        calculator: 'not-allowed',
        hints: ['Multiply both parts by 10 (or 100) to get whole numbers.', 'Then simplify.'],
        solution: `Multiply both parts by ${scale}: $${ratioTex([a, b])} = ${ratioTex([A, B])}$.\n\n${gcd(A, B) > 1 ? `The HCF of ${A} and ${B} is ${gcd(A, B)}, so this simplifies to $${ratioTex([p, q])}$.` : `${A} and ${B} have no common factor other than 1, so this is already in simplest form.`}`,
      };
    }
    let [a1, b1] = properFraction(rng, [2, 3, 4, 5, 6, 8]);
    let [a2, b2] = properFraction(rng, [2, 3, 4, 5, 6, 8]);
    while (b2 === b1 || a1 * b2 === a2 * b1) [a2, b2] = properFraction(rng, [2, 3, 4, 5, 6, 8]);
    if (rng.chance(0.5)) [a1, b1, a2, b2] = [a2, b2, a1, b1];
    const L = lcm(b1, b2);
    const X = a1 * (L / b1);
    const Y = a2 * (L / b2);
    const g = gcd(X, Y);
    const c = ratioCloze([X / g, Y / g]);
    return {
      type: 'cloze',
      prompt: `Write $\\frac{${a1}}{${b1}} : \\frac{${a2}}{${b2}}$ in simplest form, using whole numbers.\n\n${c.blanksText}`,
      blanks: c.blanks,
      calculator: 'not-allowed',
      hints: ['Multiply both parts by the lowest common multiple of the denominators.', 'Then simplify if you can.'],
      solution: `The LCM of ${b1} and ${b2} is ${L}. Multiply both parts by ${L}:\n\n$\\frac{${a1}}{${b1}} \\times ${L} = ${X}$ and $\\frac{${a2}}{${b2}} \\times ${L} = ${Y}$, so the ratio is $${ratioTex([X, Y])}$${g > 1 ? `, which simplifies to $${ratioTex([X / g, Y / g])}$` : ''}.`,
    };
  },
};

export const shareInRatio: QuestionTemplate = {
  id: 'm9.num.ratios-rates.share',
  topicId: 'm9.num.ratios-rates',
  title: 'Share in a ratio, and part-to-part / part-to-whole problems',
  difficulties: [2, 3, 4, 5],
  generate({ rng, difficulty }) {
    const [n1, n2, n3] = rng.sample(NAMES, 3) as [string, string, string];
    if (difficulty === 2) {
      const [a, b] = coprimePair(rng, 9);
      const u = rng.int(2, 15) * (rng.chance(0.5) ? 5 : 1);
      const T = (a + b) * u;
      const askFirst = rng.chance(0.5);
      return {
        type: 'numeric',
        prompt: `${n1} and ${n2} share ${cash(T)} in the ratio $${a} : ${b}$. How much does ${askFirst ? n1 : n2} get?`,
        answer: askFirst ? a * u : b * u,
        units: '$',
        calculator: 'not-allowed',
        hints: ['Add the parts of the ratio to find the total number of shares.', 'Find the value of one share, then multiply.'],
        solution: `Total shares: $${a} + ${b} = ${a + b}$.\n\nOne share: $${tex(T)} \\div ${a + b} = ${tex(u)}$.\n\n${askFirst ? n1 : n2} gets $${askFirst ? a : b} \\times ${tex(u)} = ${tex(askFirst ? a * u : b * u)}$, so **${cash(askFirst ? a * u : b * u)}**.`,
      };
    }
    if (difficulty === 3) {
      if (rng.chance(0.5)) {
        let parts: number[] = [];
        for (;;) {
          parts = [rng.int(1, 6), rng.int(1, 6), rng.int(1, 6)];
          if (gcd(gcd(parts[0]!, parts[1]!), parts[2]!) === 1 && new Set(parts).size > 1) break;
        }
        const total = parts.reduce((s, x) => s + x, 0);
        const u = rng.int(2, 12) * 5;
        const T = total * u;
        const who = rng.int(0, 2);
        const names = [n1, n2, n3];
        return {
          type: 'numeric',
          prompt: `${n1}, ${n2} and ${n3} share ${cash(T)} of prize money in the ratio $${ratioTex(parts)}$. How much does ${names[who]} get?`,
          answer: parts[who]! * u,
          units: '$',
          calculator: 'not-allowed',
          hints: ['Add all three parts to find the total number of shares.', 'Find the value of one share, then multiply.'],
          solution: `Total shares: $${parts.join(' + ')} = ${total}$.\n\nOne share: $${tex(T)} \\div ${total} = ${tex(u)}$.\n\n${names[who]} gets $${parts[who]} \\times ${tex(u)} = ${tex(parts[who]! * u)}$, so **${cash(parts[who]! * u)}**.`,
        };
      }
      const [a, b] = coprimePair(rng, 9);
      const u = rng.int(2, 12);
      const ctx = rng.pick([
        { first: 'girls', second: 'boys', where: 'in a kapa haka group' },
        { first: 'kererū', second: 'tūī', where: 'counted in a garden' },
        { first: 'red counters', second: 'blue counters', where: 'in a bag' },
      ]);
      return {
        type: 'numeric',
        prompt: `The ratio of ${ctx.first} to ${ctx.second} ${ctx.where} is $${a} : ${b}$. There are ${a * u} ${ctx.first}. How many ${ctx.second} are there?`,
        answer: b * u,
        form: 'integer',
        calculator: 'not-allowed',
        hints: [`${a} part${a === 1 ? ' is' : 's are'} worth ${a * u}. What is one part worth?`, `Then find ${b} part${b === 1 ? '' : 's'}.`],
        solution: `${a} part${a === 1 ? '' : 's'} $= ${a * u}$, so one part $= ${a * u} \\div ${a} = ${u}$.\n\n${ctx.second.charAt(0).toUpperCase() + ctx.second.slice(1)}: $${b} \\times ${u} = ${b * u}$.`,
      };
    }
    if (difficulty === 4) {
      const [a, b] = coprimePair(rng, 9);
      const [lo, hi] = a < b ? [a, b] : [b, a];
      if (rng.chance(0.5)) {
        const u = rng.int(2, 15);
        const diff = (hi - lo) * u;
        const askSmall = rng.chance(0.5);
        const smallName = a < b ? n1 : n2;
        const bigName = a < b ? n2 : n1;
        return {
          type: 'numeric',
          prompt: `${n1} and ${n2} share some money in the ratio $${a} : ${b}$. ${bigName} gets ${cash(diff)} more than ${smallName}. How much does ${askSmall ? smallName : bigName} get?`,
          answer: (askSmall ? lo : hi) * u,
          units: '$',
          marks: 2,
          calculator: 'not-allowed',
          hints: [`The difference between the shares is $${hi} - ${lo} = ${hi - lo}$ part${hi - lo === 1 ? '' : 's'}.`, 'Find what one part is worth.'],
          solution: `The difference is $${hi} - ${lo} = ${hi - lo}$ part${hi - lo === 1 ? '' : 's'}, worth ${cash(diff)}.\n\nOne part: $${tex(diff)} \\div ${hi - lo} = ${tex(u)}$.\n\n${askSmall ? smallName : bigName} gets $${askSmall ? lo : hi} \\times ${tex(u)} = ${tex((askSmall ? lo : hi) * u)}$, so **${cash((askSmall ? lo : hi) * u)}**.`,
        };
      }
      const [boys, girls] = [a, b];
      const askGirls = rng.chance(0.5);
      const [fn, fd] = simp(askGirls ? girls : boys, boys + girls);
      return {
        type: 'numeric',
        prompt: `In a class, the ratio of boys to girls is $${boys} : ${girls}$. What fraction of the class are ${askGirls ? 'girls' : 'boys'}?`,
        answer: fn / fd,
        form: 'simplest-fraction',
        marks: 2,
        calculator: 'not-allowed',
        hints: ['A ratio compares part to part. A fraction compares part to whole.', `How many parts are there altogether?`],
        solution: `There are $${boys} + ${girls} = ${boys + girls}$ parts altogether, and ${askGirls ? girls : boys} of them are ${askGirls ? 'girls' : 'boys'}.\n\nSo $${frac(askGirls ? girls : boys, boys + girls, true)}${fd !== boys + girls ? ` = ${frac(fn, fd)}` : ''}$ of the class are ${askGirls ? 'girls' : 'boys'}.\n\n(A common mistake is to write $\\frac{${askGirls ? girls : boys}}{${askGirls ? boys : girls}}$, which compares one part with the other part.)`,
      };
    }
    // difficulty 5: a ratio changes when some are added
    for (let attempt = 0; attempt < 200; attempt++) {
      const [p, q] = coprimePair(rng, 6);
      const [r, s] = coprimePair(rng, 8);
      if (r * q <= p * s) continue; // the red share must go up
      const w = rng.int(1, 4);
      const g = gcd(q, s);
      const u = (s / g) * w;
      const v = (q / g) * w;
      const c = r * v - p * u;
      if (c <= 0 || c > 30 || q * u > 80) continue;
      const blue = q * u;
      const red = p * u;
      const kt = (x: number) => (x === 1 ? 'k' : `${x}k`);
      return {
        type: 'numeric',
        prompt: `A bag has red and blue marbles in the ratio $${p} : ${q}$. After ${c} more red marbles are added, the ratio of red to blue becomes $${r} : ${s}$. How many blue marbles are in the bag?`,
        answer: blue,
        form: 'integer',
        marks: 3,
        calculator: 'not-allowed',
        hints: ['The number of blue marbles does not change.', `Let the original numbers be $${kt(p)}$ red and $${kt(q)}$ blue. Write an equation using the new ratio.`],
        solution: [
          `Let there be $${kt(p)}$ red and $${kt(q)}$ blue marbles to start with.`,
          `After adding ${c} red: $\\frac{${kt(p)} + ${c}}{${kt(q)}} = \\frac{${r}}{${s}}$, so $${s === 1 ? '' : s}(${kt(p)} + ${c}) = ${r === 1 ? '' : `${r} \\times `}${kt(q)}$.`,
          `$${kt(s * p)} + ${s * c} = ${kt(r * q)}$, so $${s * c} = ${kt(r * q - s * p)}$ and $k = ${s * c} \\div ${r * q - s * p} = ${u}$.`,
          `Blue marbles: $${q} \\times ${u} = ${blue}$. (Check: red goes from ${red} to ${red + c}, and $${red + c} : ${blue} = ${r} : ${s}$ ✓)`,
        ].join('\n\n'),
      };
    }
    return {
      type: 'numeric',
      prompt: 'A bag has red and blue marbles in the ratio $3 : 5$. After 6 more red marbles are added, the ratio of red to blue becomes $3 : 4$. How many blue marbles are in the bag?',
      answer: 40,
      form: 'integer',
      marks: 3,
      calculator: 'not-allowed',
      hints: ['The number of blue marbles does not change.'],
      solution: 'Let there be $3k$ red and $5k$ blue. Then $4(3k + 6) = 15k$, so $12k + 24 = 15k$, $k = 8$ and there are $5 \\times 8 = 40$ blue marbles.',
    };
  },
};

export const rates: QuestionTemplate = {
  id: 'm9.num.ratios-rates.rates',
  topicId: 'm9.num.ratios-rates',
  title: 'Unit rates, using rates, best buys and converting rates',
  difficulties: [1, 2, 3, 4],
  generate({ rng, difficulty }) {
    const name = rng.pick(NAMES);
    if (difficulty === 1) {
      const ctx = rng.pick(['apples', 'typing', 'tap', 'reading'] as const);
      if (ctx === 'apples') {
        const kg = rng.int(2, 6);
        const unitCents = rng.int(25, 90) * 10; // $2.50 … $9.00 per kg
        const total = (kg * unitCents) / 100;
        return {
          type: 'numeric',
          prompt: `${kg} kg of apples cost ${cents(total)}. What is the cost per kilogram?`,
          answer: unitCents / 100,
          units: '$',
          calculator: 'not-allowed',
          hints: ['"Per kilogram" means "for each 1 kg".', `Divide the cost by ${kg}.`],
          solution: `$${tex(total, 2)} \\div ${kg} = ${tex(unitCents / 100, 2)}$, so the apples cost **${cents(unitCents / 100)} per kg**.`,
        };
      }
      const [what, unitText, per] =
        ctx === 'typing'
          ? [`${name} typed`, 'words', 'minute']
          : ctx === 'tap'
            ? ['A tap filled a tank with', 'litres', 'minute']
            : [`${name} read`, 'pages', 'hour'];
      const t = rng.int(2, 8);
      const rate = ctx === 'typing' ? rng.int(20, 60) : ctx === 'tap' ? rng.int(6, 20) : rng.int(15, 40);
      return {
        type: 'numeric',
        prompt: `${what} ${num(rate * t)} ${unitText} in ${t} ${per}s. How many ${unitText} is that per ${per}?`,
        answer: rate,
        calculator: 'not-allowed',
        hints: [`"Per ${per}" means "for each ${per}".`, `Divide by ${t}.`],
        solution: `$${tex(rate * t)} \\div ${t} = ${rate}$, so the rate is **${rate} ${unitText} per ${per}**.`,
      };
    }
    if (difficulty === 2) {
      const ctx = rng.pick(['fuel', 'tap', 'wage'] as const);
      if (ctx === 'fuel') {
        const per100 = rng.pick([5, 6, 7, 8, 9, 5.5, 6.5, 7.5]);
        const km = rng.int(3, 12) * 50;
        const answer = clean((per100 * km) / 100);
        return {
          type: 'numeric',
          prompt: `A car uses ${num(per100)} L of petrol per 100 km. How many litres does it use to travel ${km} km?`,
          answer,
          units: 'L',
          calculator: 'allowed',
          hints: [`How many lots of 100 km are in ${km} km?`, `Multiply that by ${num(per100)} L.`],
          solution: `${km} km is $${km} \\div 100 = ${tex(km / 100)}$ lots of 100 km.\n\n$${tex(km / 100)} \\times ${tex(per100)} = ${tex(answer)}$ L`,
        };
      }
      if (ctx === 'tap') {
        const rate = rng.int(6, 25);
        const minutes = rng.int(4, 30);
        return {
          type: 'numeric',
          prompt: `A hose fills a paddling pool at ${rate} litres per minute. How many minutes will it take to put ${rate * minutes} litres in the pool?`,
          answer: minutes,
          units: 'min',
          calculator: 'allowed',
          hints: [`Each minute adds ${rate} litres.`, `How many lots of ${rate} are in ${rate * minutes}?`],
          solution: `$${rate * minutes} \\div ${rate} = ${minutes}$, so it takes **${minutes} minutes**.`,
        };
      }
      const rateCents = rng.int(46, 56) * 50; // $23.00 … $28.00
      const hours = rng.int(3, 9);
      const pay = (rateCents * hours) / 100;
      return {
        type: 'numeric',
        prompt: `${name} is paid ${cents(rateCents / 100)} per hour. How much does ${name} earn for ${hours} hours of work?`,
        answer: pay,
        units: '$',
        calculator: 'allowed',
        hints: ['Pay = hourly rate × number of hours.'],
        solution: `$${tex(rateCents / 100, 2)} \\times ${hours} = ${tex(pay, 2)}$, so ${name} earns **${cents(pay)}**.`,
      };
    }
    if (difficulty === 3) {
      // best buy
      const product = rng.pick(['muesli', 'rice', 'peanut butter', 'cheese', 'yoghurt']);
      let g1 = 500;
      let g2 = 750;
      let u1 = 80;
      let u2 = 90;
      for (let attempt = 0; attempt < 200; attempt++) {
        [g1, g2] = rng.sample([250, 300, 400, 500, 600, 750, 1000], 2) as [number, number];
        u1 = rng.int(30, 160); // cents per 100 g
        u2 = rng.chance(0.1) ? u1 : rng.int(30, 160);
        if (u1 !== u2 && Math.abs(u1 - u2) < 3) continue;
        if ((u1 * g1) % 100 === 0 && (u2 * g2) % 100 === 0 && (u1 * g1) / 100 < 2000) break;
      }
      const p1 = (u1 * g1) / 10000; // dollars
      const p2 = (u2 * g2) / 10000;
      const correct = u1 < u2 ? 'a' : u2 < u1 ? 'b' : 'c';
      const show = (g: number) => (g >= 1000 ? `${g / 1000} kg` : `${g} g`);
      return {
        type: 'mcq',
        prompt: `A supermarket sells ${product} in two sizes:\n\n- Pack A: ${show(g1)} for ${cents(p1)}\n- Pack B: ${show(g2)} for ${cents(p2)}\n\nWhich is the better value for money?`,
        options: [
          { id: 'a', text: 'Pack A' },
          { id: 'b', text: 'Pack B' },
          { id: 'c', text: 'They are the same value' },
        ],
        correct,
        shuffle: false,
        calculator: 'allowed',
        hints: ['Compare the price for the same amount, such as the price per 100 g.', 'The lower price per 100 g is the better value.'],
        solution: `Price per 100 g:\n\n- Pack A: $${tex(p1, 2)} \\div ${g1 / 100} = ${tex(u1 / 100, 2)}$\n- Pack B: $${tex(p2, 2)} \\div ${g2 / 100} = ${tex(u2 / 100, 2)}$\n\n${correct === 'c' ? 'They cost the same per 100 g, so they are the same value.' : `Pack ${correct.toUpperCase()} is cheaper per 100 g, so **Pack ${correct.toUpperCase()}** is the better value.`}`,
      };
    }
    // difficulty 4: convert a rate
    const kind = rng.pick(['dripDay', 'perMinute', 'wageCents', 'pumpHour'] as const);
    if (kind === 'dripDay') {
      const mL = rng.pick([5, 10, 15, 20, 25, 30, 40, 50]);
      const answer = clean((mL * 60 * 24) / 1000);
      return {
        type: 'numeric',
        prompt: `A leaking tap drips ${mL} mL of water every minute. How many litres is that per day?`,
        answer,
        units: 'L',
        marks: 2,
        calculator: 'allowed',
        hints: ['There are 60 minutes in an hour and 24 hours in a day.', 'There are 1000 mL in 1 L.'],
        solution: `Minutes in a day: $60 \\times 24 = 1440$.\n\nPer day: $${mL} \\times 1440 = ${tex(mL * 1440)}$ mL.\n\nIn litres: $${tex(mL * 1440)} \\div 1000 = ${tex(answer)}$ L per day.`,
      };
    }
    if (kind === 'perMinute') {
      const perMin = rng.int(3, 25);
      const item = rng.pick(['pies', 'bottles', 'pens', 'loaves of bread']);
      return {
        type: 'numeric',
        prompt: `A factory machine makes ${num(perMin * 60)} ${item} per hour. How many is that per minute?`,
        answer: perMin,
        marks: 2,
        calculator: 'allowed',
        hints: ['There are 60 minutes in an hour.'],
        solution: `$${tex(perMin * 60)} \\div 60 = ${perMin}$ ${item} per minute.`,
      };
    }
    if (kind === 'wageCents') {
      const centsPerMin = rng.int(38, 48);
      const perHour = (centsPerMin * 60) / 100;
      return {
        type: 'numeric',
        prompt: `${name} earns ${cents(perHour)} per hour. How many cents is that per minute?`,
        answer: centsPerMin,
        marks: 2,
        calculator: 'allowed',
        hints: ['Change dollars to cents first (× 100).', 'Then divide by 60 minutes.'],
        solution: `${cents(perHour)} $= ${tex(perHour * 100)}$ cents per hour.\n\n$${tex(perHour * 100)} \\div 60 = ${centsPerMin}$ cents per minute.`,
      };
    }
    const perMinL = rng.int(4, 30);
    return {
      type: 'numeric',
      prompt: `A pump moves ${perMinL} litres of water per minute. How many kilolitres is that per hour? (1 kL = 1000 L)`,
      answer: clean((perMinL * 60) / 1000),
      marks: 2,
      calculator: 'allowed',
      hints: ['First find litres per hour.', 'Then divide by 1000 to get kilolitres.'],
      solution: `Per hour: $${perMinL} \\times 60 = ${tex(perMinL * 60)}$ L.\n\nIn kilolitres: $${tex(perMinL * 60)} \\div 1000 = ${tex(clean((perMinL * 60) / 1000))}$ kL per hour.`,
    };
  },
};
