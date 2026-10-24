import {
  getTopic,
  isTemplateQuestionId,
  markFromRubric,
  markResponse,
  parseTemplateQuestionId,
  randomSeed,
  getTemplate,
  instantiateTemplate,
  toPublicQuestion,
  ResponseSchema,
  XP,
  type MasteryRecord,
  type PublicQuestion,
  type Question,
  type QuestionResponse,
} from '@study-helper/shared';
import { onCall } from 'firebase-functions/https';
import { z } from 'zod';
import { db, FieldValue } from '../lib/firebase';
import { fail, parseInput, requireAuth } from '../lib/http';
import { recordActivity, recordAttempt, recordPendingAttempt } from '../lib/progress';
import { bankDocToPublic, buildPracticeSet, loadQuestion } from '../lib/questions';
import { rateLimit } from '../lib/ratelimit';
import { familyOf, requireProfile } from '../lib/users';

/** A short, human-readable version of a response for attempt history and parent views. */
export function describeResponse(q: Question, r: QuestionResponse): string {
  switch (r.type) {
    case 'mcq':
      return q.type === 'mcq' ? (q.options.find((o) => o.id === r.optionId)?.text ?? r.optionId) : r.optionId;
    case 'multi':
      return q.type === 'multi'
        ? q.options.filter((o) => r.optionIds.includes(o.id)).map((o) => o.text).join('; ')
        : r.optionIds.join(', ');
    case 'cloze':
      return Object.values(r.values).join(' | ');
    case 'order':
      return q.type === 'order' ? r.order.map((id) => q.items.find((i) => i.id === id)?.text ?? id).join(' → ') : r.order.join(',');
    case 'match':
      return q.type === 'match'
        ? q.pairs.map((p) => `${p.left.text} — ${q.pairs.find((x) => x.right.id === r.pairs[p.left.id])?.right.text ?? '?'}`).join('; ')
        : JSON.stringify(r.pairs);
    default:
      return r.value;
  }
}

async function masteryFor(uid: string, topicId: string): Promise<MasteryRecord | undefined> {
  const snap = await db.doc(`students/${uid}/mastery/${topicId}`).get();
  return snap.data() as MasteryRecord | undefined;
}

async function seenFor(uid: string, topicId: string): Promise<Set<string>> {
  const snap = await db.doc(`students/${uid}/seen/${topicId}`).get();
  return new Set((snap.data()?.ids as string[] | undefined) ?? []);
}

// ---------------------------------------------------------------------------------------------

export async function practiceSetFor(
  uid: string,
  input: { topicId: string; count: number; difficulty?: number | undefined; mode: 'adaptive' | 'mistakes' },
): Promise<{ questions: PublicQuestion[]; lowOnQuestions: boolean }> {
  if (!getTopic(input.topicId)) throw fail.notFound('That topic');
  if (input.mode === 'mistakes') {
    const wrong = await db
      .collection(`students/${uid}/attempts`)
      .where('topicId', '==', input.topicId)
      .orderBy('createdAt', 'desc')
      .limit(80)
      .get();
    const ids = [...new Set(wrong.docs.filter((d) => !d.data().correct && !d.data().needsReview).map((d) => d.data().questionId as string))];
    const questions: PublicQuestion[] = [];
    for (const id of ids.slice(0, input.count)) {
      if (isTemplateQuestionId(id)) {
        // Retry the same kind of question with fresh numbers.
        const parsed = parseTemplateQuestionId(id);
        const t = parsed && getTemplate(parsed.templateId);
        if (t && parsed) questions.push(toPublicQuestion(instantiateTemplate(t, parsed.difficulty, randomSeed()), { source: 'template' }));
      } else {
        const snap = await db.doc(`bank/${id}`).get();
        if (snap.exists && ['verified', 'unverified'].includes(snap.data()!.status)) questions.push(bankDocToPublic(id, snap.data()!));
      }
    }
    return { questions, lowOnQuestions: false };
  }
  const [mastery, seen] = await Promise.all([masteryFor(uid, input.topicId), seenFor(uid, input.topicId)]);
  return buildPracticeSet(input.topicId, {
    count: input.count,
    seen,
    ...(mastery && { mastery }),
    ...(input.difficulty !== undefined && { difficulty: input.difficulty }),
  });
}

export const getPracticeSet = onCall(async (req) => {
  const uid = requireAuth(req);
  await requireProfile(uid, 'student');
  await rateLimit(`practice-set:${uid}`, 120, 600);
  const input = parseInput(
    z.object({
      topicId: z.string().min(3),
      count: z.number().int().min(1).max(30).default(10),
      difficulty: z.number().int().min(1).max(5).optional(),
      mode: z.enum(['adaptive', 'mistakes']).default('adaptive'),
    }),
    req.data,
  );
  return practiceSetFor(uid, input);
});

// ---------------------------------------------------------------------------------------------

const SubmitSchema = z.object({
  questionId: z.string().min(3).max(200),
  response: ResponseSchema,
  hintsUsed: z.number().int().min(0).max(4).default(0),
  timeMs: z.number().int().min(0).max(3_600_000).default(0),
  context: z.enum(['practice', 'review', 'plan', 'mcp']).default('practice'),
});

export async function submitAnswerFor(uid: string, input: z.infer<typeof SubmitSchema>) {
  const loaded = await loadQuestion(input.questionId);
  if (!loaded) throw fail.notFound('That question');
  if (loaded.ownerUid && loaded.ownerUid !== uid) throw fail.denied();
  const q = loaded.question;
  const mark = markResponse(q, input.response);
  if (mark.invalid) return { invalid: true as const, feedback: mark.feedback ?? 'Check your answer format.' };

  const answerText = describeResponse(q, input.response);
  if (mark.needsReview) {
    const attemptId = await recordPendingAttempt(uid, q, { ...input, answerText });
    return {
      invalid: false as const,
      needsReview: true as const,
      attemptId,
      modelAnswer: q.type === 'extended' ? q.modelAnswer : mark.expected,
      rubric: q.type === 'extended' ? q.rubric : [{ criterion: 'Matches the correct answer', marks: q.marks }],
      solution: q.solution,
      marksAvailable: q.marks,
    };
  }
  const progress = await recordAttempt(uid, q, mark, { ...input, answerText });
  return {
    invalid: false as const,
    needsReview: false as const,
    mark,
    solution: q.solution,
    ...progress,
  };
}

export const submitAnswer = onCall(async (req) => {
  const uid = requireAuth(req);
  await requireProfile(uid, 'student');
  await rateLimit(`submit:${uid}`, 300, 600, 'That was a lot of answers very quickly — take a breather.');
  const input = parseInput(SubmitSchema, req.data);
  return submitAnswerFor(uid, input);
});

/** The student marks their own written answer against the model answer and rubric. */
export const selfMark = onCall(async (req) => {
  const uid = requireAuth(req);
  const input = parseInput(z.object({ attemptId: z.string().min(1), marksAwarded: z.number().min(0).max(12) }), req.data);
  const ref = db.doc(`students/${uid}/attempts/${input.attemptId}`);
  const attempt = (await ref.get()).data();
  if (!attempt) throw fail.notFound('That attempt');
  if (!attempt.needsReview) throw fail.precondition('That answer has already been marked.');
  const loaded = await loadQuestion(attempt.questionId as string);
  if (!loaded) throw fail.notFound('That question');
  const marks = Math.min(input.marksAwarded, loaded.question.marks);
  const mark = markFromRubric(loaded.question, marks);
  const progress = await recordAttempt(uid, loaded.question, mark, {
    hintsUsed: attempt.hintsUsed ?? 0,
    timeMs: attempt.timeMs ?? 0,
    context: attempt.context ?? 'practice',
    attemptRef: ref,
    selfMarked: true,
  });
  return { mark, ...progress };
});

// ---------------------------------------------------------------------------------------------

export const flagQuestion = onCall(async (req) => {
  const uid = requireAuth(req);
  await rateLimit(`flag:${uid}`, 30, 3600);
  const input = parseInput(
    z.object({
      questionId: z.string().min(3).max(200),
      reason: z.enum(['wrong-answer', 'unclear', 'typo', 'too-hard', 'inappropriate', 'other']),
      comment: z.string().max(500).optional(),
    }),
    req.data,
  );
  const now = Date.now();
  await db.collection('bankFlags').add({ ...input, uid, createdAt: now, resolved: false });
  if (isTemplateQuestionId(input.questionId) || input.questionId.startsWith('note:')) return { ok: true };

  // Hide a question once several different students report it, until an admin reviews it.
  const ref = db.doc(`bank/${input.questionId}`);
  const distinct = await db.collection('bankFlags').where('questionId', '==', input.questionId).where('resolved', '==', false).get();
  const reporters = new Set(distinct.docs.map((d) => d.data().uid as string));
  const serious = input.reason === 'inappropriate';
  await ref.update({ 'stats.flags': FieldValue.increment(1) }).catch(() => undefined);
  if (reporters.size >= 3 || serious) {
    await ref.update({ status: 'flagged' }).catch(() => undefined);
    await db.doc(`bankAnswers/${input.questionId}`).update({ status: 'flagged' }).catch(() => undefined);
  }
  return { ok: true };
});

/** XP for flashcard reviews and completed lessons (capped daily so it can't be farmed). */
export const logActivity = onCall(async (req) => {
  const uid = requireAuth(req);
  await requireProfile(uid, 'student');
  const input = parseInput(
    z.object({
      kind: z.enum(['flashcards', 'lesson']),
      count: z.number().int().min(1).max(100).default(1),
      topicId: z.string().optional(),
      minutes: z.number().min(0).max(120).default(0),
    }),
    req.data,
  );
  if (input.kind === 'lesson') {
    if (!input.topicId || !getTopic(input.topicId)) throw fail.invalid('Unknown topic.');
    await rateLimit(`lesson:${uid}:${input.topicId}`, 1, 86400, 'Lesson XP already earned today.').catch(() => {
      throw fail.precondition('Lesson XP already earned today — nice revision though!');
    });
    return recordActivity(uid, { xp: XP.lessonCompleted, minutes: input.minutes });
  }
  await rateLimit(`flashcards:${uid}`, 20, 86400, 'Daily flashcard XP limit reached.');
  return recordActivity(uid, { xp: input.count * XP.flashcardReview, flashcards: input.count, minutes: input.minutes });
});

/** Family members who can see a student's pending (contributed) questions. */
export async function visibleToFamily(uid: string): Promise<string[]> {
  const profile = await requireProfile(uid);
  return familyOf(uid, profile.role);
}
