import type { QuestionTemplate } from '../../../types';
import type { Rng } from '../../../../rng';
import { NAMES, num } from '../../../format';

// m6.mea.time — converting h/min/s, 12- and 24-hour time, elapsed time across the hour, and
// bus timetables. Clock times are answered as `text` (the numeric marker can't read "3:28 pm"),
// with every common way of writing the time accepted. Durations in hours and minutes use two
// cloze blanks.

// ---------------------------------------------------------------- time helpers

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Minutes since midnight → hour (0–23) and minute. */
function hm(mins: number): { h: number; m: number } {
  const t = ((mins % 1440) + 1440) % 1440;
  return { h: Math.floor(t / 60), m: t % 60 };
}

/** "3:28 pm" */
function t12(mins: number): string {
  const { h, m } = hm(mins);
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${pad2(m)} ${h < 12 ? 'am' : 'pm'}`;
}

/** "15:28" */
function t24(mins: number): string {
  const { h, m } = hm(mins);
  return `${pad2(h)}:${pad2(m)}`;
}

/** Ways a student might type a 12-hour time. The first is the canonical one. */
function accept12(mins: number): string[] {
  const { h, m } = hm(mins);
  const hh = h % 12 === 0 ? 12 : h % 12;
  const ap = h < 12 ? 'am' : 'pm';
  const out: string[] = [];
  for (const sep of [':', '.']) {
    for (const suffix of [` ${ap}`, ap, ` ${ap[0]}.m.`, `${ap[0]}.m.`]) {
      out.push(`${hh}${sep}${pad2(m)}${suffix}`);
      if (hh < 10) out.push(`0${hh}${sep}${pad2(m)}${suffix}`);
    }
  }
  return out;
}

/** Ways a student might type a 24-hour time. The first is the canonical one. */
function accept24(mins: number): string[] {
  const { h, m } = hm(mins);
  const out = [`${pad2(h)}:${pad2(m)}`, `${pad2(h)}${pad2(m)}`, `${pad2(h)}.${pad2(m)}`, `${pad2(h)}:${pad2(m)} h`, `${pad2(h)}${pad2(m)} hours`, `${pad2(h)}${pad2(m)} hrs`];
  if (h < 10) out.push(`${h}:${pad2(m)}`, `${h}${pad2(m)}`, `${h}.${pad2(m)}`);
  return out;
}

/** "1 hour 35 minutes", "45 minutes", "2 hours" */
function dur(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const hs = h ? `${h} hour${h === 1 ? '' : 's'}` : '';
  const ms = m ? `${m} minute${m === 1 ? '' : 's'}` : '';
  return [hs, ms].filter(Boolean).join(' ') || '0 minutes';
}

/** Cloze blanks for a duration in hours and minutes. */
function hmBlanks(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return [
    { id: 'h', accepted: [String(h), `${h} h`, `${h}h`, `${h} hours`, `${h} hour`] },
    { id: 'm', accepted: [String(m), `${m} min`, `${m}min`, `${m} minutes`, `${pad2(m)}`] },
  ];
}

/** Step-by-step "count on" explanation from start to end (end > start, same day). */
function countOn(start: number, end: number, show: (t: number) => string): string {
  const onHour = start % 60 === 0;
  const nextHour = onHour ? start : Math.ceil(start / 60) * 60;
  if (!onHour && end <= nextHour) {
    return `From ${show(start)} to ${show(end)} is $${hm(end).m === 0 ? 60 : hm(end).m} - ${hm(start).m} = ${end - start}$ minutes.`;
  }
  const toHour = nextHour - start;
  const lastHour = Math.floor(end / 60) * 60;
  const wholeHours = (lastHour - nextHour) / 60;
  const after = end - lastHour;
  const steps = toHour > 0 ? [`${show(start)} → ${show(nextHour)} is ${toHour} minutes.`] : [];
  if (wholeHours > 0) steps.push(`${show(nextHour)} → ${show(lastHour)} is ${wholeHours} hour${wholeHours === 1 ? '' : 's'}.`);
  if (after > 0) steps.push(`${show(lastHour)} → ${show(end)} is ${after} minutes.`);
  const total = end - start;
  const extra = toHour + after;
  const extraText = after > 0 && toHour > 0 ? `$${toHour} + ${after} = ${extra}$ minutes` : `${extra} minutes`;
  steps.push(
    wholeHours === 0
      ? `Altogether: ${extraText}.`.replace('Altogether: 0 minutes.', '')
      : extra === 0
        ? `Altogether: **${dur(total)}**.`
        : extra >= 60
        ? `Altogether: ${wholeHours} hour${wholeHours === 1 ? '' : 's'} and ${extraText}. ${extra} minutes is 1 hour ${extra - 60} minutes, so the total is **${dur(total)}**.`
        : `Altogether: ${wholeHours} hour${wholeHours === 1 ? '' : 's'} and ${extraText}, which is **${dur(total)}**.`,
  );
  return steps.map((s) => `- ${s}`).join('\n');
}

// ---------------------------------------------------------------- 1. converting units of time

export const convertTime: QuestionTemplate = {
  id: 'm6.mea.time.convert',
  topicId: 'm6.mea.time',
  title: 'Convert hours, minutes and seconds',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    const facts = 'There are 60 seconds in 1 minute and 60 minutes in 1 hour.';
    if (difficulty === 1) {
      const kind = rng.pick(['hToMin', 'minToS', 'minToH', 'sToMin', 'fraction'] as const);
      const n = rng.int(2, 10);
      if (kind === 'fraction') {
        const [word, frac, ans] = rng.pick([
          ['half an hour', '$\\frac{1}{2}$ of 60', 30],
          ['a quarter of an hour', '$\\frac{1}{4}$ of 60', 15],
          ['three-quarters of an hour', '$\\frac{3}{4}$ of 60', 45],
          ['half a minute', '$\\frac{1}{2}$ of 60', 30],
        ] as const);
        const unit = word.includes('minute') ? 's' : 'min';
        return {
          type: 'numeric',
          prompt: `How many ${unit === 's' ? 'seconds' : 'minutes'} are in ${word}?`,
          answer: ans,
          units: unit,
          form: 'integer',
          calculator: 'not-allowed',
          hints: [facts, 'Think of a clock face: how far round does the minute hand go?'],
          solution: `${facts}\n\n${frac} is ${ans}, so ${word} is **${ans} ${unit === 's' ? 'seconds' : 'minutes'}**.`,
        };
      }
      const [from, fromU, to, toU, ans, op] =
        kind === 'hToMin'
          ? [n, 'hours', 'minutes', 'min', n * 60, '×']
          : kind === 'minToS'
            ? [n, 'minutes', 'seconds', 's', n * 60, '×']
            : kind === 'minToH'
              ? [n * 60, 'minutes', 'hours', 'h', n, '÷']
              : [n * 60, 'seconds', 'minutes', 'min', n, '÷'];
      return {
        type: 'numeric',
        prompt: `How many ${to} are in ${num(from)} ${fromU}?`,
        answer: ans,
        units: toU,
        form: 'integer',
        calculator: 'not-allowed',
        hints: [facts, op === '×' ? 'You are changing to a smaller unit, so you will get a bigger number.' : 'You are changing to a bigger unit, so you will get a smaller number.'],
        solution: `${facts}\n\n$${from} ${op === '×' ? '\\times' : '\\div'} 60 = ${ans}$\n\nSo ${num(from)} ${fromU} = **${num(ans)} ${to}**.`,
      };
    }
    if (difficulty === 2) {
      const kind = rng.pick(['hmToMin', 'minToHm', 'msToS', 'halfHours'] as const);
      if (kind === 'hmToMin') {
        const h = rng.int(1, 4);
        const m = rng.int(1, 11) * 5;
        return {
          type: 'numeric',
          prompt: `How many minutes are in ${dur(h * 60 + m)}?`,
          answer: h * 60 + m,
          units: 'min',
          form: 'integer',
          calculator: 'not-allowed',
          hints: ['Change the hours into minutes first (1 hour = 60 minutes).', 'Then add the extra minutes.'],
          solution: `${h} hour${h === 1 ? '' : 's'} = $${h} \\times 60 = ${h * 60}$ minutes.\n\n$${h * 60} + ${m} = ${h * 60 + m}$\n\nSo the answer is **${h * 60 + m} minutes**.`,
        };
      }
      if (kind === 'minToHm') {
        let total = rng.int(13, 58) * 5;
        if (total % 60 === 0) total += 15;
        return {
          type: 'cloze',
          prompt: `Write ${total} minutes in hours and minutes.\n\n${total} minutes = [[h]] h [[m]] min`,
          blanks: hmBlanks(total),
          calculator: 'not-allowed',
          hints: ['How many whole lots of 60 minutes fit into this?', 'The minutes left over go in the second gap.'],
          solution: `60 minutes make 1 hour. $${Math.floor(total / 60)} \\times 60 = ${Math.floor(total / 60) * 60}$, and $${total} - ${Math.floor(total / 60) * 60} = ${total % 60}$.\n\nSo ${total} minutes = **${Math.floor(total / 60)} h ${total % 60} min**.`,
        };
      }
      if (kind === 'msToS') {
        const m = rng.int(1, 5);
        const s = rng.int(1, 11) * 5;
        return {
          type: 'numeric',
          prompt: `${rng.pick(NAMES)} ran once around the school field in ${m} minute${m === 1 ? '' : 's'} ${s} seconds. How many seconds is that altogether?`,
          answer: m * 60 + s,
          units: 's',
          form: 'integer',
          calculator: 'not-allowed',
          hints: ['1 minute = 60 seconds.', 'Change the minutes into seconds, then add the extra seconds.'],
          solution: `${m} minute${m === 1 ? '' : 's'} = $${m} \\times 60 = ${m * 60}$ seconds.\n\n$${m * 60} + ${s} = ${m * 60 + s}$\n\nSo the answer is **${m * 60 + s} seconds**.`,
        };
      }
      const h = rng.int(1, 5);
      return {
        type: 'numeric',
        prompt: `How many minutes are in ${h} and a half hours?`,
        answer: h * 60 + 30,
        units: 'min',
        form: 'integer',
        calculator: 'not-allowed',
        hints: ['1 hour = 60 minutes.', 'Half an hour is half of 60 minutes.'],
        solution: `${h} hour${h === 1 ? '' : 's'} = ${h * 60} minutes, and half an hour = 30 minutes.\n\n$${h * 60} + 30 = ${h * 60 + 30}$, so the answer is **${h * 60 + 30} minutes**.`,
      };
    }
    // difficulty 3
    const kind = rng.pick(['sToMs', 'days', 'hoursToDays', 'compare'] as const);
    if (kind === 'sToMs') {
      let total = rng.int(70, 595);
      if (total % 60 === 0) total += 7;
      const m = Math.floor(total / 60);
      const s = total % 60;
      return {
        type: 'cloze',
        prompt: `A song lasts ${total} seconds. Write this in minutes and seconds.\n\n${total} seconds = [[m]] min [[s]] s`,
        blanks: [
          { id: 'm', accepted: [String(m), `${m} min`, `${m} minutes`] },
          { id: 's', accepted: [String(s), `${s} s`, `${s} seconds`, `${s} sec`] },
        ],
        calculator: 'not-allowed',
        hints: ['How many whole lots of 60 seconds fit into this?', 'The seconds left over go in the second gap.'],
        solution: `60 seconds make 1 minute. $${m} \\times 60 = ${m * 60}$, and $${total} - ${m * 60} = ${s}$.\n\nSo ${total} seconds = **${m} min ${s} s**.`,
      };
    }
    if (kind === 'days') {
      const d = rng.int(2, 7);
      return {
        type: 'numeric',
        prompt: `A school camp lasts ${d} days. How many hours is that?`,
        answer: d * 24,
        units: 'h',
        form: 'integer',
        calculator: 'not-allowed',
        hints: ['How many hours are in 1 day?', `Multiply that by ${d}.`],
        solution: `There are 24 hours in 1 day.\n\n$${d} \\times 24 = ${d * 24}$\n\nSo ${d} days = **${d * 24} hours**.`,
      };
    }
    if (kind === 'hoursToDays') {
      const d = rng.int(2, 7);
      return {
        type: 'numeric',
        prompt: `A kiwi chick hatched ${d * 24} hours ago. How many days ago is that?`,
        answer: d,
        units: 'd',
        form: 'integer',
        calculator: 'not-allowed',
        hints: ['How many hours are in 1 day?', 'How many lots of 24 make this number?'],
        solution: `There are 24 hours in 1 day.\n\n$${d * 24} \\div 24 = ${d}$\n\nSo ${d * 24} hours = **${d} days**.`,
      };
    }
    const h = rng.int(1, 3);
    const m = rng.int(1, 11) * 5;
    const a = h * 60 + m;
    let b = rng.int(10, 30) * 5;
    if (b === a) b += 5;
    const name = rng.pick(NAMES);
    const other = rng.pick(NAMES.filter((x) => x !== name));
    const diff = Math.abs(a - b);
    return {
      type: 'numeric',
      prompt: `${name} spent ${dur(a)} at the beach. ${other} spent ${b} minutes at the beach. How many minutes longer did ${a > b ? name : other} spend there?`,
      answer: diff,
      units: 'min',
      form: 'integer',
      marks: 2,
      calculator: 'not-allowed',
      hints: ['Write both times in minutes first.', 'Then find the difference.'],
      solution: `${dur(a)} = $${h} \\times 60 + ${m} = ${a}$ minutes.\n\nDifference: $${Math.max(a, b)} - ${Math.min(a, b)} = ${diff}$.\n\n${a > b ? name : other} spent **${diff} minutes** longer.`,
    };
  },
};

// ---------------------------------------------------------------- 2. 12-hour and 24-hour time

export const clock24: QuestionTemplate = {
  id: 'm6.mea.time.clock-24',
  topicId: 'm6.mea.time',
  title: '12-hour (am/pm) and 24-hour time',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    const rule12 = 'For pm times (except 12 pm), add 12 to the hour. For am times, keep the hour, and write it with two digits.';
    const rule24 = 'For hours from 13 to 23, take away 12 and write pm. Hours from 01 to 11 are am.';
    if (difficulty === 1) {
      const h = rng.int(1, 11);
      const m = rng.int(0, 11) * 5;
      const mm = pad2(m);
      if (rng.chance(0.5)) {
        const offBy = h + 13 <= 23 ? h + 13 : h + 11;
        const texts = [`${h + 12}:${mm}`, `${pad2(h)}:${mm}`, `${h + 10}:${mm}`, `${offBy}:${mm}`];
        const ids = rng.shuffle(['a', 'b', 'c', 'd']);
        const options = texts.map((text, i) => ({ id: ids[i]!, text })).sort((x, y) => x.id.localeCompare(y.id));
        return {
          type: 'mcq',
          prompt: `What is ${h}:${mm} pm in 24-hour time?`,
          options,
          correct: ids[0]!,
          feedback: {
            [ids[1]!]: `${pad2(h)}:${mm} is ${h}:${mm} in the **morning**. Afternoon and evening times need 12 added to the hour.`,
            [ids[2]!]: 'This adds 10 to the hour. There are 12 hours from midnight to midday, so add 12.',
            [ids[3]!]: `Check the hour: ${h} + 12 = ${h + 12}.`,
          },
          calculator: 'not-allowed',
          hints: ['pm means after midday. How many hours are there from midnight to midday?'],
          solution: `pm times are after midday, so add 12 to the hour: $${h} + 12 = ${h + 12}$.\n\n${h}:${mm} pm = **${h + 12}:${mm}**.`,
        };
      }
      const H = h + 12;
      const wrongHalf = `${h}:${mm} am`;
      const plus2 = h + 2 > 12 ? h + 2 - 12 : h + 2;
      const plus1 = h + 1;
      const texts = [`${h}:${mm} pm`, wrongHalf, `${plus2}:${mm} pm`, `${plus1}:${mm} pm`];
      const ids = rng.shuffle(['a', 'b', 'c', 'd']);
      const options = texts.map((text, i) => ({ id: ids[i]!, text })).sort((x, y) => x.id.localeCompare(y.id));
      return {
        type: 'mcq',
        prompt: `What is ${H}:${mm} in 12-hour time?`,
        options,
        correct: ids[0]!,
        feedback: {
          [ids[1]!]: `${H}:${mm} is after midday (the hour is bigger than 12), so it is pm, not am.`,
          [ids[2]!]: 'This takes away 10 from the hour. Take away 12 instead.',
          [ids[3]!]: `Check the hour: ${H} − 12 = ${h}.`,
        },
        calculator: 'not-allowed',
        hints: ['Hours bigger than 12 are after midday. Take away 12 to get the 12-hour time.'],
        solution: `${H} is more than 12, so the time is after midday (pm). $${H} - 12 = ${h}$.\n\n${H}:${mm} = **${h}:${mm} pm**.`,
      };
    }
    if (difficulty === 2) {
      // any minutes, am or pm, either direction (avoiding the 12 o'clock hours)
      let h = rng.int(1, 22);
      if (h === 12) h = 13;
      const t = h * 60 + rng.int(1, 59);
      if (rng.chance(0.5)) {
        return {
          type: 'text',
          prompt: `Write ${t12(t)} in 24-hour time.`,
          accepted: accept24(t),
          allowTypos: false,
          calculator: 'not-allowed',
          hints: [rule12, '24-hour times always have four digits, like 07:15 or 19:40.'],
          solution:
            hm(t).h >= 12
              ? `${t12(t)} is after midday, so add 12 to the hour: $${hm(t).h - 12} + 12 = ${hm(t).h}$.\n\n${t12(t)} = **${t24(t)}**.`
              : `${t12(t)} is in the morning, so the hour stays the same. Write it with two digits.\n\n${t12(t)} = **${t24(t)}**.`,
        };
      }
      return {
        type: 'text',
        prompt: `Write ${t24(t)} in 12-hour time. Remember am or pm.`,
        accepted: accept12(t),
        allowTypos: false,
        calculator: 'not-allowed',
        hints: [rule24, 'Is the time before or after midday?'],
        solution:
          hm(t).h >= 12
            ? `${t24(t)} is after midday because the hour is more than 12. $${hm(t).h} - 12 = ${hm(t).h - 12}$, so it is **${t12(t)}**.`
            : `${t24(t)} is before midday, so it is am: **${t12(t)}**.`,
      };
    }
    // difficulty 3: midnight and midday, or putting mixed times in order
    if (rng.chance(0.5)) {
      const midnight = rng.chance(0.5);
      const t = (midnight ? 0 : 12 * 60) + rng.int(1, 59);
      const to24 = rng.chance(0.5);
      const explain = midnight
        ? 'The hour after midnight is 12 am in 12-hour time, but 00 in 24-hour time.'
        : 'The hour after midday is 12 pm in 12-hour time, and 12 in 24-hour time. Nothing is added.';
      return to24
        ? {
            type: 'text',
            prompt: `Write ${t12(t)} in 24-hour time.`,
            accepted: accept24(t),
            allowTypos: false,
            calculator: 'not-allowed',
            hints: ['Be careful with times in the 12 o\'clock hour.', midnight ? 'Is this just after midnight or just after midday?' : 'Is this just after midday or just after midnight?'],
            solution: `${explain}\n\n${t12(t)} = **${t24(t)}**.`,
          }
        : {
            type: 'text',
            prompt: `Write ${t24(t)} in 12-hour time. Remember am or pm.`,
            accepted: accept12(t),
            allowTypos: false,
            calculator: 'not-allowed',
            hints: ['Be careful with times in the 12 o\'clock hour.', midnight ? 'A 24-hour time starting with 00 is just after midnight.' : 'A 24-hour time starting with 12 is just after midday.'],
            solution: `${explain}\n\n${t24(t)} = **${t12(t)}**.`,
          };
    }
    let times: number[] = [];
    do {
      times = [0, 1, 2, 3].map(() => rng.int(1, 23) * 60 + rng.int(0, 11) * 5);
    } while (new Set(times).size < 4 || new Set(times.map((t) => Math.floor(t / 60))).size < 3);
    const sorted = [...times].sort((a, b) => a - b);
    // Two of each format, so the times have to be compared across formats.
    const formats = rng.shuffle([true, true, false, false]);
    const shown = sorted.map((t, i) => (formats[i] ? t12(t) : t24(t)));
    return {
      type: 'order',
      prompt: 'Put these times in order, from **earliest** in the day to **latest**.',
      items: shown.map((text, i) => ({ id: `t${i + 1}`, text })),
      calculator: 'not-allowed',
      hints: ['Change them all to the same kind of time first. 24-hour time is easiest to compare.', 'In 24-hour time, a smaller number is earlier in the day.'],
      solution: `Change the 12-hour times to 24-hour time: ${sorted
        .map((t, i) => (formats[i] ? `${shown[i]} = ${t24(t)}` : ''))
        .filter(Boolean)
        .join(', ')}.\n\nNow compare: ${sorted.map(t24).join(', ')}.\n\nSo the order is **${shown.join(', ')}**.`,
    };
  },
};

// ---------------------------------------------------------------- 3. elapsed time

const EVENTS = [
  'a netball game',
  'a swimming lesson',
  'a movie',
  'kapa haka practice',
  'a rugby game',
  'a school assembly',
  'a piano lesson',
  'a ferry trip',
  'a bus trip',
  'a waka ama race',
] as const;

export const elapsed: QuestionTemplate = {
  id: 'm6.mea.time.elapsed',
  topicId: 'm6.mea.time',
  title: 'Elapsed time and finishing times',
  difficulties: [2, 3, 4, 5],
  generate({ rng, difficulty }) {
    const name = rng.pick(NAMES);
    const show = rng.chance(0.65) ? t12 : t24;
    const countHint = 'Count on to the next o\'clock first, then count on from there.';
    if (difficulty === 2 || (difficulty === 3 && rng.chance(0.5))) {
      // minutes across one hour
      // Always crosses the hour: the duration is longer than the minutes left to the o'clock.
      const h = rng.int(7, 20);
      const sm = difficulty === 2 ? rng.int(6, 11) * 5 : rng.int(31, 58);
      const minD = 60 - sm + (difficulty === 2 ? 5 : 1);
      const d = difficulty === 2 ? rng.int(minD / 5, 11) * 5 : rng.int(minD, 55);
      const start = h * 60 + sm;
      const end = start + d;
      return {
        type: 'numeric',
        prompt: `How many minutes is it from ${show(start)} to ${show(end)}?`,
        answer: d,
        units: 'min',
        form: 'integer',
        calculator: 'not-allowed',
        hints: [countHint, `How many minutes from ${show(start)} to ${show(Math.ceil(start / 60) * 60)}?`],
        solution: countOn(start, end, show),
      };
    }
    if (difficulty === 3) {
      // finishing time
      const event = rng.pick(EVENTS);
      const start = rng.int(8, 19) * 60 + rng.int(2, 11) * 5;
      const d = rng.int(4, 11) * 5;
      const end = start + d;
      const nextHour = Math.ceil((start + 1) / 60) * 60;
      const crosses = end > nextHour;
      return {
        type: 'text',
        prompt: `${name} goes to ${event}. It starts at ${t12(start)} and lasts ${d} minutes. What time does it finish? (Write a 12-hour time with am or pm.)`,
        accepted: accept12(end),
        allowTypos: false,
        calculator: 'not-allowed',
        hints: [crosses ? `How many minutes is it from ${t12(start)} to ${t12(nextHour)}?` : 'Add the minutes on to the start time.', 'Then count on the rest of the minutes.'],
        solution: crosses
          ? `${t12(start)} → ${t12(nextHour)} uses ${nextHour - start} minutes.\n\nThere are $${d} - ${nextHour - start} = ${end - nextHour}$ minutes left, so count on from ${t12(nextHour)}.\n\nIt finishes at **${t12(end)}**.`
          : `$${hm(start).m} + ${d} = ${hm(end).m}$, so it finishes at **${t12(end)}**.`,
      };
    }
    if (difficulty === 4) {
      if (rng.chance(0.6)) {
        // duration over several hours, in hours and minutes
        const start = rng.int(7, 12) * 60 + rng.int(1, 11) * 5 - rng.int(0, 4);
        let d = rng.int(2, 5) * 60 + rng.int(1, 11) * 5 + rng.int(0, 4);
        if (d % 60 === 0) d += 10;
        const end = start + d;
        const useShow = rng.chance(0.5) ? t12 : t24;
        return {
          type: 'cloze',
          prompt: `A school trip leaves at ${useShow(start)} and gets back at ${useShow(end)}. How long is the trip?\n\n[[h]] hours [[m]] minutes`,
          blanks: hmBlanks(d),
          marks: 2,
          calculator: 'not-allowed',
          hints: [countHint, 'Then count the whole hours, then the minutes at the end.'],
          solution: countOn(start, end, useShow),
        };
      }
      const start = rng.int(8, 20) * 60 + rng.int(0, 11) * 5;
      const dh = rng.int(1, 2);
      const dm = rng.int(1, 11) * 5;
      const end = start + dh * 60 + dm;
      return {
        type: 'text',
        prompt: `A train leaves at ${t24(start)}. The trip takes ${dur(dh * 60 + dm)}. What time does the train arrive? Give your answer in 24-hour time.`,
        accepted: accept24(end),
        allowTypos: false,
        calculator: 'not-allowed',
        hints: ['Add the hours first.', 'Then add the minutes. If you go past 60 minutes, that makes another hour.'],
        solution: `Add ${dh} hour${dh === 1 ? '' : 's'}: ${t24(start)} → ${t24(start + dh * 60)}.\n\nAdd ${dm} minutes: ${t24(start + dh * 60)} → ${t24(end)}.\n\nThe train arrives at **${t24(end)}**.`,
      };
    }
    // difficulty 5: two steps
    if (rng.chance(0.5)) {
      const start = rng.int(17, 19) * 60 + rng.int(0, 11) * 5;
      const film = 60 + rng.int(20, 55);
      const walk = rng.int(2, 7) * 5;
      const end = start + film + walk;
      return {
        type: 'text',
        prompt: `${name} goes to a movie that starts at ${t12(start)}. The movie is ${dur(film)} long. Afterwards, the drive home takes ${walk} minutes. What time does ${name} get home? (Write a 12-hour time with am or pm.)`,
        accepted: accept12(end),
        allowTypos: false,
        marks: 2,
        calculator: 'not-allowed',
        hints: ['Work out when the movie finishes first.', 'Then add on the time for the drive home.'],
        solution: `Movie ends: ${t12(start)} + ${dur(film)} = ${t12(start + film)}.\n\nHome: ${t12(start + film)} + ${walk} minutes = ${t12(end)}.\n\n${name} gets home at **${t12(end)}**.`,
      };
    }
    const leave = 8 * 60 + rng.int(0, 11) * 5;
    const back = 14 * 60 + rng.int(6, 11) * 5;
    const bus = rng.int(30, 75);
    const total = back - leave;
    const there = total - 2 * bus;
    return {
      type: 'cloze',
      prompt: `A class goes on a trip to the museum. The bus leaves school at ${t24(leave)} and gets back at ${t24(back)}. The bus ride takes ${bus} minutes each way. How long is the class at the museum?\n\n[[h]] hours [[m]] minutes`,
      blanks: hmBlanks(there),
      marks: 3,
      calculator: 'not-allowed',
      hints: ['Find how long the whole trip takes, from leaving to getting back.', 'Then take away the time spent on the bus, going there and coming back.'],
      solution: [
        `Whole trip: ${t24(leave)} to ${t24(back)}:`,
        countOn(leave, back, t24),
        `Bus time: $2 \\times ${bus} = ${2 * bus}$ minutes = ${dur(2 * bus)}.`,
        `In minutes, the whole trip is $${Math.floor(total / 60)} \\times 60 + ${total % 60} = ${total}$ minutes.`,
        `At the museum: $${total} - ${2 * bus} = ${there}$ minutes, which is **${dur(there)}**.`,
      ].join('\n\n'),
    };
  },
};

// ---------------------------------------------------------------- 4. timetables

const STOPS = [
  'Beach Road',
  'Library',
  'Town Centre',
  'Hospital',
  'Sports Park',
  'Marae Road',
  'School Gate',
  'Train Station',
  'Shopping Centre',
  'Pool',
] as const;

interface Timetable {
  stops: string[];
  /** times[bus][stop] in minutes since midnight */
  times: number[][];
  markdown: string;
}

function makeTimetable(rng: Rng, buses: number): Timetable {
  const stops = rng.sample(STOPS, 4);
  const legs = [rng.int(4, 15), rng.int(4, 15), rng.int(4, 15)];
  const gap = rng.pick([15, 20, 25, 30]);
  const first = rng.int(82, 100) * 5; // 06:50 to 08:20
  const times = Array.from({ length: buses }, (_, b) => {
    let t = first + b * gap;
    const row = [t];
    for (const leg of legs) {
      t += leg;
      row.push(t);
    }
    return row;
  });
  const header = `| Stop | ${times.map((_, b) => `Bus ${b + 1}`).join(' | ')} |`;
  const sep = `|---|${times.map(() => '---').join('|')}|`;
  const rows = stops.map((s, i) => `| ${s} | ${times.map((row) => t24(row[i]!)).join(' | ')} |`);
  return { stops, times, markdown: [header, sep, ...rows].join('\n') };
}

export const timetable: QuestionTemplate = {
  id: 'm6.mea.time.timetable',
  topicId: 'm6.mea.time',
  title: 'Read a bus timetable',
  difficulties: [3, 4, 5],
  generate({ rng, difficulty }) {
    const tt = makeTimetable(rng, difficulty === 3 ? 3 : 4);
    const name = rng.pick(NAMES);
    const intro = `Here is part of a bus timetable.\n\n${tt.markdown}`;
    if (difficulty === 3) {
      const b = rng.int(0, tt.times.length - 1);
      const from = rng.int(0, 1);
      const to = rng.int(from + 2, 3);
      const d = tt.times[b]![to]! - tt.times[b]![from]!;
      return {
        type: 'numeric',
        prompt: `${intro}\n\nHow many minutes does Bus ${b + 1} take to go from ${tt.stops[from]} to ${tt.stops[to]}?`,
        answer: d,
        units: 'min',
        form: 'integer',
        calculator: 'not-allowed',
        hints: [`Find the time Bus ${b + 1} leaves ${tt.stops[from]} and the time it gets to ${tt.stops[to]}.`, 'Count on from the first time to the second.'],
        solution: `Bus ${b + 1} is at ${tt.stops[from]} at ${t24(tt.times[b]![from]!)} and at ${tt.stops[to]} at ${t24(tt.times[b]![to]!)}.\n\n${countOn(tt.times[b]![from]!, tt.times[b]![to]!, t24)}\n\nThe trip takes **${d} minutes**.`,
      };
    }
    if (difficulty === 4) {
      // latest bus that arrives in time
      const k = rng.int(1, tt.times.length - 2); // index of the right bus: not the first, not the last
      const arriveK = tt.times[k]![3]!;
      const arriveNext = tt.times[k + 1]![3]!;
      const deadline = rng.int(arriveK, arriveNext - 1);
      const options = tt.times.map((row, b) => ({ id: 'abcd'[b]!, text: `Bus ${b + 1}, leaving ${tt.stops[0]} at ${t24(row[0]!)}` }));
      const feedback: Record<string, string> = {};
      tt.times.forEach((row, b) => {
        if (b === k) return;
        feedback[options[b]!.id] =
          b > k
            ? `Bus ${b + 1} gets to ${tt.stops[3]} at ${t24(row[3]!)}, which is after ${t24(deadline)}. ${name} would be late.`
            : `Bus ${b + 1} would get there in time, but a later bus also arrives by ${t24(deadline)}.`;
      });
      return {
        type: 'mcq',
        prompt: `${intro}\n\n${name} needs to be at ${tt.stops[3]} by ${t24(deadline)}. What is the **latest** bus ${name} can catch from ${tt.stops[0]}?`,
        options,
        correct: options[k]!.id,
        feedback,
        shuffle: false,
        calculator: 'not-allowed',
        hints: [`Look along the ${tt.stops[3]} row. Which buses arrive by ${t24(deadline)}?`, 'Of those, which one leaves last?'],
        solution: `In the ${tt.stops[3]} row, Bus ${k + 1} arrives at ${t24(arriveK)}, which is in time. Bus ${k + 2} arrives at ${t24(arriveNext)}, which is too late.\n\nSo the latest bus is **Bus ${k + 1}, leaving at ${t24(tt.times[k]![0]!)}**.`,
      };
    }
    // difficulty 5: wait for the next bus, then ride
    const k = rng.int(1, tt.times.length - 1); // the bus caught
    const atStop = tt.times[k]![1]!;
    const prev = tt.times[k - 1]![1]!;
    const arrive = rng.int(prev + 1, atStop - 3);
    const wait = atStop - arrive;
    const ride = tt.times[k]![3]! - atStop;
    return {
      type: 'numeric',
      prompt: `${intro}\n\n${name} gets to the ${tt.stops[1]} stop at ${t24(arrive)} and catches the next bus to ${tt.stops[3]}. How many minutes is it from when ${name} gets to the stop until ${name} arrives at ${tt.stops[3]}?`,
      answer: wait + ride,
      units: 'min',
      form: 'integer',
      marks: 2,
      calculator: 'not-allowed',
      hints: [`Which is the first bus that leaves ${tt.stops[1]} after ${t24(arrive)}?`, `Find the time that bus gets to ${tt.stops[3]}, then count on from ${t24(arrive)}.`],
      solution: [
        `The bus at ${t24(prev)} has already gone, so ${name} catches Bus ${k + 1} at ${t24(atStop)}. That is a wait of ${wait} minutes.`,
        `Bus ${k + 1} gets to ${tt.stops[3]} at ${t24(tt.times[k]![3]!)}, so the ride takes ${ride} minutes.`,
        `Total: $${wait} + ${ride} = ${wait + ride}$ minutes. (Or count on from ${t24(arrive)} to ${t24(tt.times[k]![3]!)}.)`,
        `The answer is **${wait + ride} minutes**.`,
      ].join('\n\n'),
    };
  },
};

export const templates: QuestionTemplate[] = [convertTime, clock24, elapsed, timetable];
