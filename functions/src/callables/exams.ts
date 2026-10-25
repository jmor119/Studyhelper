import {
  buildExam,
  examGrade,
  getTopic,
  instantiateTemplate,
  markFromRubric,
  markResponse,
  questionFromTemplateId,
  randomSeed,
  ResponseSchema,
  templatesForTopic,
  toPublicQuestion,
  XP,
  type ExamCandidate,
  type MarkResult,
  type PublicQuestion,
} from '@study-helper/shared';
import { onCall } from 'firebase-functions/https';
import { z } from 'zod';
import { db } from '../lib/firebase';
import { fail, parseInput, requireAuth } from '../lib/http';
import { recordActivity, recordAttempt, recordPendingAttempt } from '../lib/progress';
import { bankDocToPublic, loadQuestion } from '../lib/questions';
import { rateLimit } from '../lib/ratelimit';
import { requireProfile } from '../lib/users';
import { describeResponse } from './practice';

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

const StartSchema = z.object({
  title: z.string().max(80).optional(),
  topicIds: z.array(z.string()).min(1).max(60),
  durationMinutes: z.number().int().min(10).max(180),
  calculator: z.enum(['allowed', 'not-allowed']).default('allowed'),
});

export async function startExamFor(uid: string, input: z.infer<typeof StartSchema>) {
  const topics = input.topicIds.map((id) => getTopic(id)).filter((t) => t !== undefined);
  if (!topics.length) throw fail.invalid('Choose at least one topic.');
  const subjects = new Set(topics.map((t) => t.subject));

  const candidates: ExamCandidate[] = [];
  const bankById = new Map<string, PublicQuestion>();
  for (const topic of topics) {
    for (const t of templatesForTopic(topic.id)) {
      for (const d of t.difficulties) {
        const sample = instantiateTemplate(t, d, 1);
        if (input.calculator === 'not-allowed' && sample.calculator === 'allowed') continue;
        candidates.push({ id: t.id, topicId: topic.id, difficulty: d, marks: sample.marks, isTemplate: true });
      }
    }
    const bank = await db
      .collection('bank')
      .where('topicId', '==', topic.id)
      .where('status', 'in', ['verified', 'unverified'])
      .limit(80)
      .get();
    for (const doc of bank.docs) {
      const q = bankDocToPublic(doc.id, doc.data());
      if (input.calculator === 'not-allowed' && q.calculator === 'allowed') continue;
      bankById.set(q.id, q);
      candidates.push({
        id: q.id,
        topicId: q.topicId,
        difficulty: q.difficulty,
        marks: q.marks,
        ...(q.groupId && { groupId: q.groupId }),
      });
    }
  }
  const slots = buildExam(candidates, { topicIds: topics.map((t) => t.id), durationMinutes: input.durationMinutes, seed: randomSeed() });
  if (!slots.length) throw fail.precondition("There aren't enough questions for those topics yet.");

  const questions: PublicQuestion[] = slots.map((s) => {
    if (s.questionId.startsWith('tpl:')) {
      const q = questionFromTemplateId(s.questionId);
      if (!q) throw new Error(`bad template slot ${s.questionId}`);
      return toPublicQuestion(q, { source: 'template', status: 'verified' });
    }
    return bankById.get(s.questionId)!;
  });

  const now = Date.now();
  const examRef = db.collection(`students/${uid}/exams`).doc();
  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
  const subject = subjects.size === 1 ? [...subjects][0]! : 'mixed';
  const batch = db.batch();
  batch.set(examRef, {
    title: input.title ?? `${subject === 'maths' ? 'Maths' : subject === 'science' ? 'Science' : 'Mixed'} mock exam`,
    subject,
    topicIds: topics.map((t) => t.id),
    durationMinutes: input.durationMinutes,
    calculator: input.calculator,
    startedAt: now,
    endsAt: now + input.durationMinutes * 60_000,
    status: 'in-progress',
    questionIds: questions.map((q) => q.id),
    questionCount: questions.length,
    totalMarks,
  });
  questions.forEach((q, i) => batch.set(examRef.collection('questions').doc(String(i).padStart(3, '0')), { ...q, order: i }));
  await batch.commit();
  return { examId: examRef.id, questionCount: questions.length, totalMarks, endsAt: now + input.durationMinutes * 60_000 };
}

export const startExam = onCall(async (req) => {
  const uid = requireAuth(req);
  await requireProfile(uid, 'student');
  await rateLimit(`exam-start:${uid}`, 15, 3600, "You've started a lot of exams — try again later.");
  return startExamFor(uid, parseInput(StartSchema, req.data));
});

export function summarise(items: ExamResultItem[]) {
  const marked = items.filter((i) => !i.needsReview);
  const awarded = marked.reduce((s, i) => s + i.marksAwarded, 0);
  const available = items.reduce((s, i) => s + i.marksAvailable, 0);
  const byTopic: Record<string, { awarded: number; available: number }> = {};
  for (const i of items) {
    const t = (byTopic[i.topicId] ??= { awarded: 0, available: 0 });
    t.available += i.marksAvailable;
    if (!i.needsReview) t.awarded += i.marksAwarded;
  }
  const percent = available ? Math.round((awarded / available) * 100) : 0;
  return { awarded, available, percent, grade: examGrade(percent), byTopic, pendingReview: items.filter((i) => i.needsReview).length };
}

const SubmitSchema = z.object({
  examId: z.string().min(1),
  responses: z.record(z.string(), ResponseSchema),
  timeTakenMs: z.number().int().min(0).max(4 * 3_600_000).default(0),
});

export async function submitExamFor(uid: string, input: z.infer<typeof SubmitSchema>) {
  const examRef = db.doc(`students/${uid}/exams/${input.examId}`);
  const claimed = await db.runTransaction(async (tx) => {
    const snap = await tx.get(examRef);
    const exam = snap.data();
    if (!exam) throw fail.notFound('That exam');
    if (exam.status !== 'in-progress') throw fail.precondition('This exam has already been submitted.');
    tx.update(examRef, { status: 'marking' });
    return exam as { questionIds: string[]; endsAt: number; startedAt: number };
  });

  const items: ExamResultItem[] = [];
  try {
    for (const questionId of claimed.questionIds) {
      const loaded = await loadQuestion(questionId);
      if (!loaded) continue;
      const q = loaded.question;
      const response = input.responses[questionId];
      let mark: MarkResult;
      if (!response) {
        mark = { correct: false, score: 0, marksAwarded: 0, marksAvailable: q.marks };
      } else {
        mark = markResponse(q, response);
        if (mark.invalid) mark = { ...mark, invalid: false, correct: false, score: 0, marksAwarded: 0 };
      }
      const answerText = response ? describeResponse(q, response) : '';
      const perQuestionMs = Math.round(input.timeTakenMs / Math.max(1, claimed.questionIds.length));
      if (mark.needsReview && response) {
        const attemptId = await recordPendingAttempt(uid, q, { hintsUsed: 0, timeMs: perQuestionMs, context: 'exam', answerText, examId: input.examId });
        items.push({
          questionId, topicId: q.topicId, correct: false, marksAwarded: 0, marksAvailable: q.marks, needsReview: true,
          attemptId, solution: q.solution, answerText, expected: q.type === 'extended' ? q.modelAnswer : mark.expected,
        });
        continue;
      }
      const progress = await recordAttempt(uid, q, mark, {
        hintsUsed: 0, timeMs: perQuestionMs, context: 'exam', answerText, examId: input.examId, noXp: true,
      });
      items.push({
        questionId, topicId: q.topicId, correct: mark.correct, marksAwarded: mark.marksAwarded, marksAvailable: q.marks,
        needsReview: false, attemptId: progress.attemptId, solution: q.solution, answerText,
        ...(mark.feedback && { feedback: mark.feedback }),
        ...(mark.expected && { expected: mark.expected }),
      });
    }
  } catch (e) {
    // Don't leave the exam stuck in "marking": let the student submit again.
    await examRef.update({ status: 'in-progress' }).catch(() => undefined);
    throw e;
  }

  const summary = summarise(items);
  const late = Date.now() > claimed.endsAt + 120_000;
  await examRef.update({ status: 'submitted', submittedAt: Date.now(), timeTakenMs: input.timeTakenMs, late, results: items, summary });
  const activity = await recordActivity(uid, {
    xp: XP.examCompleted + Math.round(summary.percent / 2),
    exams: 1,
    examPercent: summary.percent,
    minutes: Math.round(input.timeTakenMs / 60_000),
  });
  return { summary, results: items, late, ...activity };
}

export const submitExam = onCall(async (req) => {
  const uid = requireAuth(req);
  await requireProfile(uid, 'student');
  return submitExamFor(uid, parseInput(SubmitSchema, req.data));
});

export const selfMarkExam = onCall(async (req) => {
  const uid = requireAuth(req);
  const input = parseInput(
    z.object({ examId: z.string().min(1), questionId: z.string().min(1), marksAwarded: z.number().min(0).max(12) }),
    req.data,
  );
  const examRef = db.doc(`students/${uid}/exams/${input.examId}`);
  const exam = (await examRef.get()).data();
  if (!exam || exam.status !== 'submitted') throw fail.notFound('That exam');
  const items = exam.results as ExamResultItem[];
  const item = items.find((i) => i.questionId === input.questionId);
  if (!item?.needsReview || !item.attemptId) throw fail.precondition('That question is already marked.');
  const loaded = await loadQuestion(input.questionId);
  if (!loaded) throw fail.notFound('That question');
  const mark = markFromRubric(loaded.question, Math.min(input.marksAwarded, loaded.question.marks));
  await recordAttempt(uid, loaded.question, mark, {
    hintsUsed: 0, timeMs: 0, context: 'exam', examId: input.examId, noXp: true, selfMarked: true,
    attemptRef: db.doc(`students/${uid}/attempts/${item.attemptId}`),
  });
  item.needsReview = false;
  item.marksAwarded = mark.marksAwarded;
  item.correct = mark.correct;
  const summary = summarise(items);
  await examRef.update({ results: items, summary });
  return { summary };
});
