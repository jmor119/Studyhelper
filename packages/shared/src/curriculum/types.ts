import type { Subject } from '../types';

/**
 * How confident we are that a topic matches the official curriculum.
 * - final: in force, read from the final Ministry text
 * - proposed: final text published but not yet gazetted
 * - draft-aligned: based on draft-era Ministry material (learning kits, parent guides)
 * - nzc2007: the 2007 curriculum, still in force for Years 9–10 science until the end of 2026
 */
export type CurriculumStatus = 'final' | 'proposed' | 'draft-aligned' | 'nzc2007';

export interface Strand {
  id: string;
  title: string;
  description: string;
}

export interface Topic {
  /** Stable id, e.g. "m9.alg.equations". Used in Firestore doc ids — no slashes. */
  id: string;
  subject: Subject;
  yearLevel: number;
  strandId: string;
  title: string;
  /** One-line, student-friendly description. */
  summary: string;
  /** Condensed learning statements (knowledge and practices). */
  outcomes: string[];
  keyTerms: string[];
  /** Topic ids worth knowing first. */
  prerequisites: string[];
  status: CurriculumStatus;
  /** Where this sits in the official documents, e.g. "Number › Financial mathematics". */
  curriculumRef: string;
  /** For science: the 2007 NZC strand this topic belongs to. */
  nzc2007Strand?: string;
  /** For science: the refreshed-curriculum element. */
  refreshedElement?: string;
  /** Calculator usually expected for this topic's questions. */
  calculator?: 'allowed' | 'not-allowed';
}

export interface Curriculum {
  id: string;
  subject: Subject;
  yearLevel: number;
  title: string;
  /** Short description of which document(s) this follows. */
  basis: string;
  sourceUrl: string;
  attribution: string;
  strands: Strand[];
  topics: Topic[];
}

export const CURRICULUM_ATTRIBUTION =
  'Learning statements adapted from The New Zealand Curriculum (Ministry of Education, Tāhūrangi), licensed under CC BY-NC 4.0. Condensed and reworded for study use.';
