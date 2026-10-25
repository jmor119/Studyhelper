import { createRng } from './rng';

// Mock-exam assembly. Works on lightweight question metadata so it can run against bank
// queries (server) or local candidates (tests). Template questions are represented by a
// `templateId` + difficulty and get a fresh seed per exam.

export interface ExamCandidate {
  /** Bank question id, or a template id when `isTemplate`. */
  id: string;
  topicId: string;
  difficulty: number;
  marks: number;
  groupId?: string;
  /** Part letter within a multi-part group ("a", "b", …). */
  part?: string;
  isTemplate?: boolean;
}

export interface ExamConfig {
  topicIds: string[];
  durationMinutes: number;
  /** Roughly one mark per minute, like NZ school exams. */
  marksPerMinute?: number;
  seed: number;
}

export interface ExamSlot {
  /** For bank questions the question id; for templates "tpl:<id>:<difficulty>:<seed>". */
  questionId: string;
  topicId: string;
  difficulty: number;
  marks: number;
  groupId?: string;
  part?: string;
}

/** Target share of marks by difficulty band: accessible start, solid middle, a few challenges. */
const DIFFICULTY_MIX: Array<[number[], number]> = [
  [[1, 2], 0.3],
  [[3], 0.4],
  [[4, 5], 0.3],
];

export function buildExam(candidates: ExamCandidate[], config: ExamConfig): ExamSlot[] {
  const rng = createRng(config.seed);
  const targetMarks = Math.max(5, Math.round(config.durationMinutes * (config.marksPerMinute ?? 1)));
  const inScope = candidates.filter((c) => config.topicIds.includes(c.topicId));
  if (!inScope.length) return [];

  const chosen: ExamSlot[] = [];
  const usedIds = new Set<string>();
  const usedGroups = new Set<string>();
  let marks = 0;

  // A multi-part question comes as a whole: all its parts, in order.
  const unitOf = (c: ExamCandidate): ExamCandidate[] =>
    c.groupId && !c.isTemplate
      ? inScope.filter((x) => x.groupId === c.groupId && !x.isTemplate).sort((a, b) => (a.part ?? '').localeCompare(b.part ?? ''))
      : [c];
  const unitMarks = (c: ExamCandidate) => unitOf(c).reduce((s, x) => s + x.marks, 0);

  const take = (c: ExamCandidate): number => {
    let added = 0;
    for (const x of unitOf(c)) {
      const seed = rng.int(1, 2_000_000_000);
      const questionId = x.isTemplate ? `tpl:${x.id}:${x.difficulty}:${seed}` : x.id;
      chosen.push({
        questionId,
        topicId: x.topicId,
        difficulty: x.difficulty,
        marks: x.marks,
        ...(x.groupId && !x.isTemplate && { groupId: x.groupId }),
        ...(x.part && { part: x.part }),
      });
      usedIds.add(`${x.id}@${x.difficulty}`);
      added += x.marks;
    }
    if (c.groupId) usedGroups.add(c.groupId);
    marks += added;
    return added;
  };

  for (const [band, share] of DIFFICULTY_MIX) {
    const bandTarget = targetMarks * share;
    let bandMarks = 0;
    // Round-robin across topics so every topic in scope is represented.
    const topicOrder = rng.shuffle(config.topicIds);
    let stalled = 0;
    let i = 0;
    while (bandMarks < bandTarget && stalled < topicOrder.length) {
      const topicId = topicOrder[i % topicOrder.length]!;
      i++;
      const pool = inScope.filter(
        (c) =>
          c.topicId === topicId &&
          band.includes(c.difficulty) &&
          (c.isTemplate || !usedIds.has(`${c.id}@${c.difficulty}`)) &&
          (!c.groupId || !usedGroups.has(c.groupId)) &&
          marks + unitMarks(c) <= targetMarks + 3,
      );
      // Templates may be reused (fresh seed) but no more than twice per topic per band.
      const templateUses = chosen.filter((s) => s.topicId === topicId && band.includes(s.difficulty)).length;
      const usable = pool.filter((c) => !c.isTemplate || templateUses < 2);
      if (!usable.length) {
        stalled++;
        continue;
      }
      stalled = 0;
      const c = rng.pick(usable);
      bandMarks += take(c);
      if (marks >= targetMarks) break;
    }
  }

  // Order by difficulty (easiest first), keeping each multi-part question's parts together and in order.
  const units: ExamSlot[][] = [];
  const byGroup = new Map<string, ExamSlot[]>();
  for (const slot of chosen) {
    if (!slot.groupId) {
      units.push([slot]);
      continue;
    }
    const existing = byGroup.get(slot.groupId);
    if (existing) existing.push(slot);
    else {
      const unit = [slot];
      byGroup.set(slot.groupId, unit);
      units.push(unit);
    }
  }
  const unitDifficulty = (u: ExamSlot[]) => Math.min(...u.map((s) => s.difficulty));
  return units.sort((a, b) => unitDifficulty(a) - unitDifficulty(b)).flat();
}

export function examGrade(percent: number): { grade: string; label: string } {
  // Uses the letters of the new NZCE A+ … E scale (C or above is a pass) so students get used to
  // them. The percentage boundaries are our own approximation — NZQA has not published any.
  if (percent >= 90) return { grade: 'A+', label: 'Outstanding' };
  if (percent >= 80) return { grade: 'A', label: 'Excellent' };
  if (percent >= 65) return { grade: 'B', label: 'Very good' };
  if (percent >= 50) return { grade: 'C', label: 'Pass' };
  if (percent >= 35) return { grade: 'D', label: 'Not yet' };
  return { grade: 'E', label: 'Keep practising' };
}
