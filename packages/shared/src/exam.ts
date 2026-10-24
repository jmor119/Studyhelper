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

  const take = (c: ExamCandidate) => {
    const seed = rng.int(1, 2_000_000_000);
    const questionId = c.isTemplate ? `tpl:${c.id}:${c.difficulty}:${seed}` : c.id;
    chosen.push({ questionId, topicId: c.topicId, difficulty: c.difficulty, marks: c.marks });
    usedIds.add(`${c.id}@${c.difficulty}`);
    if (c.groupId) usedGroups.add(c.groupId);
    marks += c.marks;
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
          marks + c.marks <= targetMarks + 2,
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
      take(c);
      bandMarks += c.marks;
      if (marks >= targetMarks) break;
    }
  }

  // Order: by difficulty, keeping groups (multi-part questions) together.
  return chosen.sort((a, b) => a.difficulty - b.difficulty);
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
