import type { EggKind, InviteKind, MarkResult, PublicQuestion, QuestionResponse, Role } from '@study-helper/shared';
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

// Typed wrappers around the Cloud Functions callables.

function call<Req, Res>(name: string) {
  const fn = httpsCallable<Req, Res>(functions, name, { timeout: 300_000 });
  return async (data: Req): Promise<Res> => (await fn(data)).data;
}

export interface ProgressResult {
  attemptId: string;
  xpGained: number;
  xp: number;
  level: number;
  previousLevel: number;
  streak: number;
  mastery: number;
  masteryLevel: string;
  newBadges: string[];
  goalsAchieved: string[];
  todayCount: number;
}

export type SubmitResult =
  | { invalid: true; feedback: string }
  | {
      invalid: false;
      needsReview: true;
      attemptId: string;
      modelAnswer?: string;
      rubric: { criterion: string; marks: number }[];
      solution: string;
      marksAvailable: number;
    }
  | ({ invalid: false; needsReview: false; mark: MarkResult; solution: string } & ProgressResult);

export interface ExamSummary {
  awarded: number;
  available: number;
  percent: number;
  grade: { grade: string; label: string };
  byTopic: Record<string, { awarded: number; available: number }>;
  pendingReview: number;
}

export interface ExamResultItem {
  questionId: string;
  topicId: string;
  correct: boolean;
  marksAwarded: number;
  marksAvailable: number;
  needsReview: boolean;
  attemptId?: string;
  feedback?: string;
  expected?: string;
  solution: string;
  answerText?: string;
}

export const api = {
  completeOnboarding: call<{ role: Role; displayName: string; yearLevel?: number }, { uid: string; role: Role; created: boolean }>('completeOnboarding'),
  checkUsername: call<{ username: string }, { username: string; available: boolean }>('checkUsername'),
  createChildAccount: call<{ displayName: string; username: string; password: string; yearLevel: number }, { uid: string; username: string }>('createChildAccount'),
  resetChildPassword: call<{ childUid: string; password: string }, { ok: true }>('resetChildPassword'),
  setYearLevel: call<{ studentUid: string; yearLevel: number }, { ok: true }>('setYearLevel'),
  renameChild: call<{ childUid: string; displayName: string }, { ok: true }>('renameChild'),
  deleteChildAccount: call<{ childUid: string }, { ok: true }>('deleteChildAccount'),
  deleteMyAccount: call<Record<string, never>, { ok: true }>('deleteMyAccount'),
  exportMyData: call<Record<string, never>, Record<string, unknown>>('exportMyData'),

  createInvite: call<{ kind?: InviteKind }, { code: string; url: string; expiresAt: number; forRole: Role; kind: InviteKind }>('createInvite'),
  emailInvite: call<{ code: string; email: string }, { emailed: boolean }>('emailInvite'),
  peekInvite: call<{ code: string }, { fromName: string; fromRole: Role; forRole: Role; kind: InviteKind; childNames?: string[] }>('peekInvite'),
  acceptInvite: call<
    { code: string },
    { alreadyLinked: boolean; otherUid: string; otherName: string; kind: InviteKind; shared?: number; skipped?: string[] }
  >('acceptInvite'),
  removeCoParent: call<{ otherUid: string }, { ok: true; unlinked: number }>('removeCoParent'),
  unlink: call<{ otherUid: string }, { ok: true }>('unlink'),

  openEgg: call<Record<string, never>, { id: string; level: number; kind: EggKind; remaining: number; equipped: boolean }>('openEgg'),
  setLook: call<{ avatar?: string | null; frame?: string | null; title?: string | null; palette?: string | null }, { ok: true }>('setLook'),

  getPracticeSet: call<
    { topicId: string; count?: number; difficulty?: number; mode?: 'adaptive' | 'mistakes' },
    { questions: PublicQuestion[]; lowOnQuestions: boolean }
  >('getPracticeSet'),
  submitAnswer: call<
    { questionId: string; response: QuestionResponse; hintsUsed: number; timeMs: number; context?: 'practice' | 'review' | 'plan' },
    SubmitResult
  >('submitAnswer'),
  selfMark: call<{ attemptId: string; marksAwarded: number }, { mark: MarkResult } & ProgressResult>('selfMark'),
  flagQuestion: call<{ questionId: string; reason: string; comment?: string }, { ok: true }>('flagQuestion'),
  logActivity: call<
    { kind: 'flashcards' | 'lesson'; count?: number; topicId?: string; minutes?: number },
    { xpGained: number; newBadges: string[]; goalsAchieved: string[]; level: number; previousLevel: number }
  >('logActivity'),

  startExam: call<
    { title?: string; topicIds: string[]; durationMinutes: number; calculator: 'allowed' | 'not-allowed' },
    { examId: string; questionCount: number; totalMarks: number; endsAt: number }
  >('startExam'),
  submitExam: call<
    { examId: string; responses: Record<string, QuestionResponse>; timeTakenMs: number },
    { summary: ExamSummary; results: ExamResultItem[]; late: boolean; xpGained: number; newBadges: string[] }
  >('submitExam'),
  selfMarkExam: call<{ examId: string; questionId: string; marksAwarded: number }, { summary: ExamSummary }>('selfMarkExam'),

  saveAiKey: call<{ provider: 'anthropic' | 'openai'; apiKey: string }, { ok: true; models: { id: string; name: string }[]; model: string }>('saveAiKey'),
  deleteAiKey: call<{ provider: 'anthropic' | 'openai' }, { ok: true }>('deleteAiKey'),
  setAiPrefs: call<{ activeProvider?: 'anthropic' | 'openai'; model?: string; monthlyLimitUsd?: number }, { ok: true }>('setAiPrefs'),
  getAiStatus: call<
    Record<string, never>,
    | { available: false }
    | { available: true; fromOwnName: boolean; ownerName: string; provider: string; model: string; limitUsd: number; spentUsd: number; budgetLeft: boolean }
  >('getAiStatus'),
  generateQuestions: call<
    { topicId: string; difficulty?: number; count?: number },
    { generated: number; discarded: number; questions: PublicQuestion[]; skipped?: string }
  >('generateQuestions'),
  aiMarkAttempt: call<{ attemptId: string }, { mark: MarkResult; criteria: { criterion: string; met: boolean; marks: number }[] } & ProgressResult>('aiMarkAttempt'),
  aiMarkExam: call<{ examId: string }, { awarded: number; available: number; percent: number }>('aiMarkExam'),
  markWorking: call<
    { questionId: string; path: string },
    { readable: boolean; methodCorrect: boolean; whatWentWell: string; firstError: string | null; nextStep: string }
  >('markWorking'),
  analyseNotes: call<{ paths: string[] }, { setId: string; title: string; questionCount: number; topicIds: string[] }>('analyseNotes'),

  oauthGetRequest: call<{ requestId: string }, { clientName: string; redirectHost: string }>('oauthGetRequest'),
  oauthDecide: call<{ requestId: string; approve: boolean }, { redirectTo: string }>('oauthDecide'),
  createApiToken: call<{ name: string }, { token: string; tokenId: string; name: string }>('createApiToken'),
  listConnections: call<
    Record<string, never>,
    {
      tokens: { tokenId: string; name: string; prefix: string; createdAt: number; lastUsedAt: number | null }[];
      apps: { clientId: string; name: string; connectedAt: number }[];
    }
  >('listConnections'),
  revokeConnection: call<{ tokenId?: string; clientId?: string }, { ok: true }>('revokeConnection'),

  adminReviewQueue: call<{ status: string; limit?: number }, { items: Array<{ id: string; status: string; source: string; question: import('@study-helper/shared').Question; flags: { reason: string; comment?: string }[] }> }>('adminReviewQueue'),
  adminSetQuestionStatus: call<{ questionId: string; status: string }, { ok: true }>('adminSetQuestionStatus'),
  adminStats: call<Record<string, never>, { counts: Record<string, number>; openFlags: number }>('adminStats'),
};

/** Streams the tutor's reply. `onDelta` receives text as it arrives. */
export async function streamTutor(
  data: {
    chatId?: string;
    mode: 'learn' | 'question' | 'assignment' | 'notes';
    topicId?: string;
    questionId?: string;
    message: string;
    attachments?: string[];
  },
  onDelta: (delta: string, chatId: string) => void,
): Promise<{ chatId: string; reply: string; refused: boolean }> {
  const fn = httpsCallable<typeof data, { chatId: string; reply: string; refused: boolean }, { chatId: string; delta: string }>(
    functions,
    'tutorChat',
    { timeout: 300_000 },
  );
  const { stream, data: result } = await fn.stream(data);
  for await (const chunk of stream) onDelta(chunk.delta, chunk.chatId);
  return result;
}

/** Friendly message from a callable error. */
export function errorMessage(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) {
    const msg = String((e as { message: string }).message);
    return msg.replace(/^Firebase: /, '').replace(/ \(functions\/[\w-]+\)\.?$/, '');
  }
  return 'Something went wrong. Please try again.';
}
