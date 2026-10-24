// Per-topic mastery: an Elo-style ability estimate updated after every marked answer.
// Ability lives on a logit scale; question difficulty 1–5 maps to −1.6…+1.6.
// Mastery (0–100) is the predicted chance of answering a difficulty-4 question correctly.

export const MASTERY_LEVELS = [
  { id: 'not-started', label: 'Not started', min: -1 },
  { id: 'emerging', label: 'Emerging', min: 0 },
  { id: 'developing', label: 'Developing', min: 30 },
  { id: 'consolidating', label: 'Consolidating', min: 50 },
  { id: 'proficient', label: 'Proficient', min: 70 },
  { id: 'exceeding', label: 'Exceeding', min: 88 },
] as const;
// The level names mirror the NZ curriculum's five progress descriptors.

export type MasteryLevelId = (typeof MASTERY_LEVELS)[number]['id'];

const difficultyLogit = (d: number) => (d - 3) * 0.8;
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

export function predictCorrect(ability: number, difficulty: number): number {
  return sigmoid(ability - difficultyLogit(difficulty));
}

export function masteryFromAbility(ability: number): number {
  return Math.round(predictCorrect(ability, 4) * 100);
}

export interface MasteryState {
  ability: number;
  attempts: number;
  correct: number;
}

export const INITIAL_ABILITY = -1.2;

/**
 * Updates ability after an answer. `score` is 0–1 (partial credit allowed).
 * Hints reduce the credit for a correct answer.
 */
export function updateMastery(
  state: MasteryState | undefined,
  difficulty: number,
  score: number,
  hintsUsed = 0,
): MasteryState & { mastery: number } {
  const prev = state ?? { ability: INITIAL_ABILITY, attempts: 0, correct: 0 };
  const credit = Math.max(0, score - hintsUsed * 0.2 * score);
  const expected = predictCorrect(prev.ability, difficulty);
  // Learn faster early on, then settle.
  const k = Math.max(0.25, 0.9 / Math.sqrt(prev.attempts + 1));
  const ability = Math.max(-4, Math.min(4, prev.ability + k * (credit - expected)));
  const next = {
    ability,
    attempts: prev.attempts + 1,
    correct: prev.correct + (score >= 0.999 ? 1 : 0),
  };
  return { ...next, mastery: masteryFromAbility(ability) };
}

export function masteryLevel(mastery: number | undefined, attempts = 0): (typeof MASTERY_LEVELS)[number] {
  if (mastery === undefined || attempts === 0) return MASTERY_LEVELS[0];
  // Need a handful of answers before claiming the top levels.
  const capped = attempts < 5 ? Math.min(mastery, 69) : attempts < 10 ? Math.min(mastery, 87) : mastery;
  let level: (typeof MASTERY_LEVELS)[number] = MASTERY_LEVELS[1];
  for (const l of MASTERY_LEVELS) if (capped >= l.min && l.min >= 0) level = l;
  return level;
}

/** Picks a difficulty that should feel like a stretch (~70% success) for the current ability. */
export function targetDifficulty(ability: number | undefined, available: readonly number[]): number {
  const a = ability ?? INITIAL_ABILITY;
  const sorted = [...available].sort((x, y) => x - y);
  if (!sorted.length) return 2;
  let best = sorted[0]!;
  let bestGap = Infinity;
  for (const d of sorted) {
    const gap = Math.abs(predictCorrect(a, d) - 0.7);
    if (gap < bestGap) {
      bestGap = gap;
      best = d;
    }
  }
  return best;
}
