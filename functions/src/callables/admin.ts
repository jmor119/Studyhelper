import {
  correctResponseFor,
  markResponse,
  QuestionSchema,
  type Question,
  type QuestionStatus,
} from '@study-helper/shared';
import { onCall } from 'firebase-functions/https';
import { z } from 'zod';
import { db } from '../lib/firebase';
import { fail, parseInput, requireAdmin } from '../lib/http';
import { writeBankQuestion } from '../lib/questions';
import { familyOf, requireProfile } from '../lib/users';

// Question-bank moderation. Shared with the MCP server's admin/content tools.

export async function reviewQueue(status: QuestionStatus, limit: number) {
  const snap = await db.collection('bankAnswers').where('status', '==', status).limit(limit).get();
  const flags = await db.collection('bankFlags').where('resolved', '==', false).limit(500).get();
  const flagsById = new Map<string, Array<{ reason: string; comment?: string }>>();
  for (const f of flags.docs) {
    const d = f.data();
    const list = flagsById.get(d.questionId) ?? [];
    list.push({ reason: d.reason, ...(d.comment && { comment: d.comment }) });
    flagsById.set(d.questionId, list);
  }
  return snap.docs.map((d) => {
    const data = d.data();
    return { id: d.id, status: data.status, source: data.source, question: data.question as Question, flags: flagsById.get(d.id) ?? [] };
  });
}

export async function setQuestionStatus(questionId: string, status: QuestionStatus) {
  const answers = db.doc(`bankAnswers/${questionId}`);
  if (!(await answers.get()).exists) throw fail.notFound('That question');
  await Promise.all([
    answers.update({ status, reviewedAt: Date.now() }),
    db.doc(`bank/${questionId}`).update({ status, ...(status !== 'pending' && { visibleTo: [] }) }),
  ]);
  if (status === 'verified' || status === 'retired') {
    const flags = await db.collection('bankFlags').where('questionId', '==', questionId).where('resolved', '==', false).get();
    await Promise.all(flags.docs.map((f) => f.ref.update({ resolved: true, resolvedAt: Date.now() })));
  }
}

export async function bankStats() {
  const statuses: QuestionStatus[] = ['verified', 'unverified', 'pending', 'flagged', 'retired'];
  const counts: Record<string, number> = {};
  for (const s of statuses) counts[s] = (await db.collection('bank').where('status', '==', s).count().get()).data().count;
  const openFlags = (await db.collection('bankFlags').where('resolved', '==', false).count().get()).data().count;
  return { counts, openFlags };
}

/**
 * Adds questions to the shared bank (e.g. written with Claude via MCP). Admin contributions are
 * verified immediately; anyone else's are "pending" and visible only to their family until reviewed.
 */
export async function contributeQuestions(uid: string, isAdminUser: boolean, raw: unknown[]) {
  const profile = await requireProfile(uid);
  const visibleTo = isAdminUser ? undefined : await familyOf(uid, profile.role);
  const results: Array<{ index: number; id?: string; error?: string }> = [];
  for (let i = 0; i < raw.length; i++) {
    const parsed = QuestionSchema.safeParse(raw[i]);
    if (!parsed.success) {
      results.push({ index: i, error: parsed.error.issues.slice(0, 3).map((x) => `${x.path.join('.')}: ${x.message}`).join('; ') });
      continue;
    }
    const q = parsed.data;
    const self = correctResponseFor(q);
    if (self && !markResponse(q, self).correct) {
      results.push({ index: i, error: 'Its own correct answer is not marked correct — check the answer fields.' });
      continue;
    }
    if (q.id.startsWith('tpl:') || q.id.startsWith('note:')) {
      results.push({ index: i, error: 'Reserved id prefix.' });
      continue;
    }
    if ((await db.doc(`bankAnswers/${q.id}`).get()).exists) {
      results.push({ index: i, error: 'A question with that id already exists.' });
      continue;
    }
    await writeBankQuestion(q, {
      status: isAdminUser ? 'verified' : 'pending',
      source: 'contributed',
      createdBy: uid,
      ...(visibleTo && { visibleTo }),
    });
    results.push({ index: i, id: q.id });
  }
  return { added: results.filter((r) => r.id).length, results };
}

// ---------------------------------------------------------------------------------------------

export const adminReviewQueue = onCall(async (req) => {
  requireAdmin(req);
  const input = parseInput(
    z.object({ status: z.enum(['unverified', 'pending', 'flagged', 'verified', 'retired']).default('flagged'), limit: z.number().int().min(1).max(100).default(30) }),
    req.data,
  );
  return { items: await reviewQueue(input.status, input.limit) };
});

export const adminSetQuestionStatus = onCall(async (req) => {
  requireAdmin(req);
  const input = parseInput(
    z.object({ questionId: z.string().min(3), status: z.enum(['verified', 'unverified', 'flagged', 'retired']) }),
    req.data,
  );
  await setQuestionStatus(input.questionId, input.status);
  return { ok: true };
});

export const adminStats = onCall(async (req) => {
  requireAdmin(req);
  return bankStats();
});
