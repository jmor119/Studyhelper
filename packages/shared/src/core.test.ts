import { describe, expect, it } from 'vitest';
import { CURRICULA, curriculaForYear, getCurriculum, getTopic } from './curriculum';
import { parseFigureBlock, parseLesson } from './content/lesson';
import { inviteEmail, inviteMailto } from './invites';
import { addDays, daysBetween, nzDateKey, weekStart } from './dates';
import { buildExam, examGrade, type ExamCandidate } from './exam';
import { applyActivity, currentStreak, emptyStats, levelForXp, newBadges, xpForAnswer } from './gamification';
import { masteryLevel, updateMastery } from './mastery';
import { buildStudyPlan } from './planner';
import { isDue, newStoredCard, reviewCard } from './srs';

describe('curriculum', () => {
  it('has unique topics whose prerequisites exist', () => {
    for (const c of CURRICULA) {
      const strands = new Set(c.strands.map((s) => s.id));
      for (const t of c.topics) {
        expect(strands.has(t.strandId), `${t.id} strand`).toBe(true);
        for (const p of t.prerequisites) expect(getTopic(p), `${t.id} prereq ${p}`).toBeDefined();
        expect(t.id).not.toContain('/');
      }
    }
  });

  it('gives each year its own curriculum, or one a year either side, never further', () => {
    for (let year = 1; year <= 13; year++) {
      const chosen = curriculaForYear(year);
      expect(new Set(chosen.map((c) => c.subject)).size, `Year ${year} subjects`).toBe(chosen.length);
      for (const c of chosen) {
        expect(Math.abs(c.yearLevel - year), `Year ${year} ${c.subject}`).toBeLessThanOrEqual(1);
        if (getCurriculum(c.subject, year)) expect(c.yearLevel).toBe(year);
      }
    }
    expect(curriculaForYear(10).map((c) => `${c.subject}${c.yearLevel}`).sort()).toEqual(['maths9', 'science9']);
    expect(curriculaForYear(6).some((c) => c.subject === 'science')).toBe(false);
    expect(curriculaForYear(3)).toEqual([]);
  });
});

describe('invite emails', () => {
  it('builds a clear message and a mailto link', () => {
    const input = { fromName: 'Jo', forRole: 'student' as const, url: 'https://example.app/join/ABCD-EFGH', code: 'ABCD-EFGH', expiresAt: Date.UTC(2026, 10, 2) };
    const m = inviteEmail(input);
    expect(m.subject).toBe('Jo invited you to Study Helper');
    expect(m.text).toContain('https://example.app/join/ABCD-EFGH');
    expect(m.text).toContain('ABCD-EFGH');
    expect(m.text).toContain('student account');
    expect(m.html).not.toContain('<script');
    const link = inviteMailto('kid@example.com', input);
    expect(link.startsWith('mailto:kid%40example.com?subject=')).toBe(true);
    expect(decodeURIComponent(link)).toContain('Accept and link');
    expect(inviteEmail({ ...input, fromName: '<b>x</b>' }).html).toContain('&lt;b&gt;');
  });
});

describe('dates', () => {
  it('uses NZ calendar dates', () => {
    // 2026-10-25 11:30 UTC is 2026-10-26 00:30 NZDT
    expect(nzDateKey(Date.UTC(2026, 9, 25, 11, 30))).toBe('2026-10-26');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(daysBetween('2026-10-25', '2026-11-10')).toBe(16);
    expect(weekStart('2026-10-25')).toBe('2026-10-19'); // Sunday → previous Monday
  });
});

describe('mastery', () => {
  it('rises with correct answers and falls with wrong ones', () => {
    let s = updateMastery(undefined, 3, 1);
    const afterOne = s.mastery;
    for (let i = 0; i < 10; i++) s = updateMastery(s, 3, 1);
    expect(s.mastery).toBeGreaterThan(afterOne);
    const high = s.mastery;
    s = updateMastery(s, 2, 0);
    expect(s.mastery).toBeLessThan(high);
  });
  it('needs several attempts before top levels', () => {
    expect(masteryLevel(95, 2).id).toBe('consolidating');
    expect(masteryLevel(95, 12).id).toBe('exceeding');
    expect(masteryLevel(undefined).id).toBe('not-started');
  });
});

describe('gamification', () => {
  it('computes XP and levels', () => {
    expect(xpForAnswer({ score: 1, difficulty: 3, hintsUsed: 0, firstTry: true })).toBe(21);
    expect(xpForAnswer({ score: 0, difficulty: 3, hintsUsed: 0, firstTry: true })).toBe(1);
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(100)).toBe(2);
    expect(levelForXp(299)).toBe(2);
    expect(levelForXp(300)).toBe(3);
  });
  it('tracks streaks across NZ days', () => {
    let s = applyActivity(emptyStats(), '2026-10-24');
    s = applyActivity(s, '2026-10-25');
    expect(s.streak).toBe(2);
    expect(currentStreak(s, '2026-10-26')).toBe(2);
    expect(currentStreak(s, '2026-10-28')).toBe(0);
    s = applyActivity(s, '2026-10-28');
    expect(s.streak).toBe(1);
    expect(s.bestStreak).toBe(2);
  });
  it('awards badges once', () => {
    const stats = { ...emptyStats(), totalCorrect: 1, totalAnswered: 1 };
    expect(newBadges({ stats })).toContain('first-correct');
    expect(newBadges({ stats: { ...stats, badges: ['first-correct'] } })).not.toContain('first-correct');
  });
});

describe('srs', () => {
  it('schedules a good review into the future', () => {
    const now = Date.UTC(2026, 9, 25);
    const card = newStoredCard('c1', 's9.bio.cells', now);
    expect(isDue(card, now)).toBe(true);
    const next = reviewCard(card, 'good', now);
    expect(next.due).toBeGreaterThan(now);
    expect(next.reps).toBe(1);
  });
});

describe('planner', () => {
  it('fills study days up to the exam with a mock exam near the end', () => {
    const plan = buildStudyPlan({
      today: '2026-10-26',
      examDate: '2026-11-09',
      minutesPerDay: 30,
      restDays: [6],
      topics: [
        { topicId: 'm9.alg.equations', title: 'Linear equations', mastery: 20 },
        { topicId: 'm9.num.fractions', title: 'Fractions', mastery: 80 },
        { topicId: 'm9.mea.pythagoras', title: 'Pythagoras' },
      ],
    });
    expect(plan.length).toBeGreaterThan(8);
    expect(plan.some((d) => d.items.some((i) => i.kind === 'mock-exam'))).toBe(true);
    const counts: Record<string, number> = {};
    for (const d of plan) for (const i of d.items) if (i.topicId) counts[i.topicId] = (counts[i.topicId] ?? 0) + 1;
    expect(counts['m9.alg.equations']!).toBeGreaterThan(counts['m9.num.fractions']!);
  });
});

describe('exam builder', () => {
  it('covers every topic and roughly hits the target marks', () => {
    const candidates: ExamCandidate[] = [];
    for (const topicId of ['a', 'b', 'c']) {
      for (let d = 1; d <= 5; d++) {
        for (let i = 0; i < 4; i++) candidates.push({ id: `${topicId}-${d}-${i}`, topicId, difficulty: d, marks: d >= 4 ? 3 : 1 + (i % 2) });
      }
    }
    const exam = buildExam(candidates, { topicIds: ['a', 'b', 'c'], durationMinutes: 40, seed: 7 });
    const marks = exam.reduce((s, q) => s + q.marks, 0);
    expect(marks).toBeGreaterThanOrEqual(30);
    expect(marks).toBeLessThanOrEqual(42);
    expect(new Set(exam.map((q) => q.topicId)).size).toBe(3);
    expect(examGrade(55).grade).toBe('C');
  });

  it('includes every part of a multi-part question, in order and together', () => {
    const candidates: ExamCandidate[] = [];
    for (let i = 0; i < 6; i++) {
      for (const part of ['a', 'b', 'c']) {
        candidates.push({ id: `g${i}-${part}`, topicId: 'a', difficulty: part === 'a' ? 2 : part === 'b' ? 3 : 4, marks: 1, groupId: `g${i}`, part });
      }
    }
    for (let i = 0; i < 10; i++) candidates.push({ id: `s${i}`, topicId: 'a', difficulty: 1 + (i % 5), marks: 1 });
    for (let seed = 1; seed <= 20; seed++) {
      const exam = buildExam(candidates, { topicIds: ['a'], durationMinutes: 15, seed });
      const groups = new Map<string, number[]>();
      exam.forEach((s, idx) => s.groupId && groups.set(s.groupId, [...(groups.get(s.groupId) ?? []), idx]));
      for (const [g, idxs] of groups) {
        expect(idxs.length, `group ${g} incomplete`).toBe(3);
        expect(idxs[2]! - idxs[0]!, `group ${g} split up`).toBe(2);
        expect(exam.slice(idxs[0], idxs[0]! + 3).map((s) => s.part)).toEqual(['a', 'b', 'c']);
      }
    }
  });
});

describe('lesson figures', () => {
  const fence = '```';
  const lesson = (figure: string) =>
    `---\ntopicId: m6.num.fractions\ntitle: Fractions\n---\nIntro\n\n## Halves\nText\n\n${fence}figure\n${figure}\n${fence}\n`;

  it('accepts a valid figure and keeps it in the section body', () => {
    const fig = JSON.stringify({ svg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>', alt: 'A bar split in half' });
    expect(parseFigureBlock(fig)).toEqual({ svg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>', alt: 'A bar split in half' });
    const parsed = parseLesson(lesson(fig), { subject: 'maths', yearLevel: 6 });
    expect(parsed.sections[0]!.body).toContain(`${fence}figure`);
  });

  it('rejects figures without alt text or SVG', () => {
    expect(parseFigureBlock('{"svg":"<svg></svg>"}')).toMatch(/alt/);
    expect(parseFigureBlock('{"svg":"<img>","alt":"x"}')).toMatch(/svg/);
    expect(parseFigureBlock('not json')).toMatch(/JSON/);
    expect(() => parseLesson(lesson('{"svg":"<svg></svg>"}'), { subject: 'maths', yearLevel: 6 })).toThrow(/Figure 1/);
  });
});
