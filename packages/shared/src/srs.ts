import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card, type Grade } from 'ts-fsrs';

// Flashcard scheduling with FSRS. Card state is stored as plain JSON (epoch ms) in Firestore.

export interface StoredCard {
  cardId: string;
  topicId: string;
  due: number;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: number;
  lastReview: number | null;
  learningSteps: number;
}

export type FlashcardGrade = 'again' | 'hard' | 'good' | 'easy';

const GRADES: Record<FlashcardGrade, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

const scheduler = fsrs(generatorParameters({ enable_fuzz: true, maximum_interval: 365 }));

function toCard(s: StoredCard): Card {
  return {
    due: new Date(s.due),
    stability: s.stability,
    difficulty: s.difficulty,
    elapsed_days: s.elapsedDays,
    scheduled_days: s.scheduledDays,
    reps: s.reps,
    lapses: s.lapses,
    state: s.state as State,
    last_review: s.lastReview ? new Date(s.lastReview) : undefined,
    learning_steps: s.learningSteps,
  };
}

function fromCard(cardId: string, topicId: string, c: Card): StoredCard {
  return {
    cardId,
    topicId,
    due: c.due.getTime(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsedDays: c.elapsed_days,
    scheduledDays: c.scheduled_days,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    lastReview: c.last_review ? new Date(c.last_review).getTime() : null,
    learningSteps: c.learning_steps,
  };
}

export function newStoredCard(cardId: string, topicId: string, now = Date.now()): StoredCard {
  return fromCard(cardId, topicId, createEmptyCard(new Date(now)));
}

export function reviewCard(stored: StoredCard, grade: FlashcardGrade, now = Date.now()): StoredCard {
  const result = scheduler.next(toCard(stored), new Date(now), GRADES[grade]);
  return fromCard(stored.cardId, stored.topicId, result.card);
}

export function isDue(stored: StoredCard, now = Date.now()): boolean {
  return stored.due <= now;
}

/** Human-friendly "next review" label, e.g. "in 3 days". */
export function nextReviewLabel(stored: StoredCard, now = Date.now()): string {
  const ms = stored.due - now;
  if (ms <= 0) return 'now';
  const mins = Math.round(ms / 60_000);
  if (mins < 60) return `in ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `in ${hours} h`;
  const days = Math.round(hours / 24);
  return `in ${days} day${days === 1 ? '' : 's'}`;
}

export interface Flashcard {
  id: string;
  topicId: string;
  front: string;
  back: string;
  tags?: string[];
}
