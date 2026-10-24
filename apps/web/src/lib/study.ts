import {
  CURRICULA,
  masteryLevel,
  subjectsForYear,
  type Curriculum,
  type MasteryRecord,
  type Subject,
  type Topic,
} from '@study-helper/shared';
import { collection, doc } from 'firebase/firestore';
import { useMemo } from 'react';
import { db } from './firebase';
import { useDoc, useQuery } from './hooks';

/** Live mastery records for a student, keyed by topic id. */
export function useMastery(uid: string | undefined) {
  const state = useQuery<MasteryRecord>(uid ? collection(db, 'students', uid, 'mastery') : null, uid ? `mastery:${uid}` : null);
  const byTopic = useMemo(() => new Map(state.data.map((m) => [m.topicId, m])), [state.data]);
  return { ...state, byTopic };
}

export interface StudySettings {
  schoolTopics?: string[];
  focusTopics?: string[];
  updatedAt?: number;
}

export function useStudySettings(uid: string | undefined) {
  return useDoc<StudySettings>(uid ? doc(db, 'students', uid, 'settings', 'study') : null, uid ? `study:${uid}` : null);
}

export function curriculaFor(yearLevel: number | undefined): Curriculum[] {
  const year = yearLevel ?? 9;
  const subjects = subjectsForYear(year);
  // Fall back to the nearest year with content (e.g. Year 10 students see Year 9 until Year 10 lands).
  if (subjects.length) return CURRICULA.filter((c) => c.yearLevel === year);
  const years = [...new Set(CURRICULA.map((c) => c.yearLevel))];
  const nearest = years.sort((a, b) => Math.abs(a - year) - Math.abs(b - year))[0];
  return CURRICULA.filter((c) => c.yearLevel === nearest);
}

export function topicsForStudent(yearLevel: number | undefined, subject?: Subject): Topic[] {
  return curriculaFor(yearLevel)
    .filter((c) => !subject || c.subject === subject)
    .flatMap((c) => c.topics);
}

export function levelFor(m: MasteryRecord | undefined) {
  return masteryLevel(m?.mastery, m?.attempts ?? 0);
}

export const LEVEL_TONE: Record<string, 'neutral' | 'bad' | 'warn' | 'info' | 'good' | 'brand'> = {
  'not-started': 'neutral',
  emerging: 'bad',
  developing: 'warn',
  consolidating: 'info',
  proficient: 'good',
  exceeding: 'brand',
};

export const STATUS_NOTE: Record<Topic['status'], string | null> = {
  final: null,
  proposed: 'Based on the new curriculum (not yet gazetted).',
  'draft-aligned': 'Follows the Ministry’s Year 9 learning kit (new curriculum, draft-aligned).',
  nzc2007: 'From the 2007 curriculum — still taught at many schools in 2026.',
};

export const subjectLabel = (s: Subject) => (s === 'maths' ? 'Maths' : 'Science');
