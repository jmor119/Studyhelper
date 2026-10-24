// Core domain types shared by the web app, Cloud Functions and the MCP server.

export const SUBJECTS = ['maths', 'science'] as const;
export type Subject = (typeof SUBJECTS)[number];

export const SUBJECT_LABELS: Record<Subject, string> = {
  maths: 'Mathematics & Statistics',
  science: 'Science',
};

export const ROLES = ['student', 'parent'] as const;
export type Role = (typeof ROLES)[number];

export const AI_PROVIDERS = ['anthropic', 'openai'] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

/** A NZ calendar date in Pacific/Auckland time, formatted YYYY-MM-DD. */
export type DateKey = string;

export interface UserProfile {
  uid: string;
  role: Role;
  displayName: string;
  /** Students only. */
  yearLevel?: number;
  /** Child accounts created by a parent sign in with a username. */
  username?: string;
  /** uid of the parent who created this account, if any. */
  managedBy?: string;
  avatar?: string;
  prefs?: UserPrefs;
  createdAt: number;
}

export interface UserPrefs {
  theme?: 'system' | 'light' | 'dark';
  /** Parents: receive the weekly email summary. */
  weeklyEmail?: boolean;
  /** Parents: allow linked children to use this account's AI key. */
  shareAiKey?: boolean;
  /** Students: daily question goal. */
  dailyGoal?: number;
  /** Students: subjects shown on the home screen. */
  subjects?: Subject[];
}

export interface FamilyLink {
  parentUid: string;
  studentUid: string;
  parentName: string;
  studentName: string;
  createdAt: number;
  createdBy: string;
}

export interface StudentStats {
  xp: number;
  level: number;
  streak: number;
  bestStreak: number;
  lastActiveDate: DateKey | null;
  /** Questions answered today (NZ date) — reset when the date changes. */
  todayCount: number;
  todayDate: DateKey | null;
  totalAnswered: number;
  totalCorrect: number;
  badges: string[];
  updatedAt: number;
}

export interface MasteryRecord {
  topicId: string;
  subject: Subject;
  /** Latent ability estimate (logit scale). */
  ability: number;
  /** 0–100, derived from ability. */
  mastery: number;
  attempts: number;
  correct: number;
  lastPracticedAt: number;
}

export type QuestionStatus = 'verified' | 'unverified' | 'pending' | 'flagged' | 'retired';
export type QuestionSource = 'seed' | 'template' | 'ai' | 'contributed';
