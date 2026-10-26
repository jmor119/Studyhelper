import {
  correctResponseFor,
  getTopic,
  markResponse,
  normaliseText,
  toPublicQuestion,
  type PublicQuestion,
  type Question,
} from '@study-helper/shared';
import { onCall } from 'firebase-functions/https';
import { logger } from 'firebase-functions';
import { z } from 'zod';
import { db } from '../lib/firebase';
import { fail, parseInput, requireAuth } from '../lib/http';
import { bankCandidates, writeBankQuestion } from '../lib/questions';
import { rateLimit } from '../lib/ratelimit';
import { requireProfile } from '../lib/users';
import { KEY_ENCRYPTION_KEY, recordUsage, requireAi, type ResolvedAi } from './keys';
import { GENERATOR_SYSTEM, SOLVER_SYSTEM, topicContext } from './prompts';
import { FlatQuestionList, fromFlat, SolverAnswer, solverResponse } from './schema';
import { randomBytes } from 'node:crypto';

// AI question generation into the SHARED bank. Inputs are enums only (topic, difficulty), so no
// user text reaches other families. Each question is schema-checked, self-marked, de-duplicated and
// independently re-solved before it's stored as "unverified".

const words = (s: string) => new Set(normaliseText(s.replace(/\$[^$]*\$/g, ' $ ')).split(' ').filter((w) => w.length > 2));

function similarity(a: string, b: string): number {
  const A = words(a);
  const B = words(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  return inter / (A.size + B.size - inter);
}

async function independentlySolve(ai: ResolvedAi, uid: string, q: Question): Promise<{ ok: boolean; reason?: string }> {
  if (q.type === 'extended') return { ok: true };
  const pub = toPublicQuestion(q);
  const description = JSON.stringify({
    type: pub.type,
    prompt: pub.prompt,
    ...('options' in pub && { options: pub.options }),
    ...('items' in pub && { items: pub.items }),
    ...('left' in pub && { left: pub.left, right: pub.right }),
    ...('blanks' in pub && { blanks: pub.blanks }),
    ...('units' in pub && pub.units && { units: pub.units }),
    ...('decimals' in pub && pub.decimals !== undefined && { decimals: pub.decimals }),
  });
  const res = await ai.llm.generateJson(
    {
      system: SOLVER_SYSTEM,
      turns: [
        {
          role: 'user',
          text: `Year ${q.yearLevel} question. Solve it. Put option ids in optionIds (mcq/multi), a number or short text in value, blank answers in blanks, item ids in correct order in order, and leftId/rightId pairs in pairs. Leave unused fields empty.\n\n${description}`,
        },
      ],
      maxTokens: 4000,
      effort: 'medium',
    },
    SolverAnswer,
    'solver_answer',
  );
  await recordUsage(ai, uid, 'verify', res.usage);
  if (!res.data) return { ok: false, reason: 'no solver answer' };
  if (res.data.problem) return { ok: false, reason: `solver flagged: ${res.data.problem}` };
  const response = solverResponse(q, res.data);
  if (!response) return { ok: true };
  const mark = markResponse(q, response);
  return mark.correct ? { ok: true } : { ok: false, reason: 'solver disagreed with the answer key' };
}

export async function generateForTopic(
  uid: string,
  input: { topicId: string; difficulty?: number | undefined; count: number },
): Promise<{ generated: number; discarded: number; questions: PublicQuestion[]; skipped?: string }> {
  const topic = getTopic(input.topicId);
  if (!topic) throw fail.notFound('That topic');

  // Don't pay to generate what the bank already has.
  const existing = await bankCandidates(topic.id, 200);
  const seenSnap = await db.doc(`students/${uid}/seen/${topic.id}`).get();
  const seen = new Set<string>((seenSnap.data()?.ids as string[] | undefined) ?? []);
  const atDifficulty = existing.filter((q) => input.difficulty === undefined || q.difficulty === input.difficulty);
  const unseen = atDifficulty.filter((q) => !seen.has(q.id));
  if (unseen.length >= input.count * 2) {
    return { generated: 0, discarded: 0, questions: unseen.slice(0, input.count), skipped: 'enough-unseen' };
  }

  // One generation per topic/difficulty at a time across all families.
  const lockRef = db.doc(`generationLocks/${topic.id}_${input.difficulty ?? 'any'}`);
  const gotLock = await db.runTransaction(async (tx) => {
    const lock = await tx.get(lockRef);
    if (lock.exists && Date.now() - (lock.data()!.at as number) < 120_000) return false;
    tx.set(lockRef, { at: Date.now(), by: uid });
    return true;
  });
  if (!gotLock) throw fail.exhausted('New questions for this topic are being made right now — try again in a couple of minutes.');

  try {
    const ai = await requireAi(uid);
    const avoid = existing.slice(0, 40).map((q) => `- ${q.prompt.slice(0, 160)}`).join('\n');
    const res = await ai.llm.generateJson(
      {
        system: GENERATOR_SYSTEM,
        turns: [
          {
            role: 'user',
            text: [
              topicContext(topic),
              `Write ${input.count + 2} new questions${input.difficulty ? ` at difficulty ${input.difficulty}` : ' across difficulties 1–5'}.`,
              topic.subject === 'science'
                ? 'Mix types: mostly mcq/multi, plus text, cloze, match/order, numeric where it fits, and at most one extended.'
                : 'Focus on conceptual and applied questions (mcq, multi, numeric, text); at most one extended.',
              avoid ? `These questions already exist — don't repeat them:\n${avoid}` : '',
            ]
              .filter(Boolean)
              .join('\n\n'),
          },
        ],
        maxTokens: 16000,
        effort: 'medium',
      },
      FlatQuestionList,
      'question_list',
    );
    await recordUsage(ai, uid, 'generate', res.usage);
    if (!res.data) throw fail.precondition("The AI couldn't write questions for this topic just now. Try again later.");

    const accepted: Question[] = [];
    let discarded = 0;
    for (const flat of res.data.questions) {
      if (accepted.length >= input.count) break;
      const id = `${topic.id}.ai.${randomBytes(5).toString('hex')}`;
      const converted = fromFlat(flat, { id, subject: topic.subject, yearLevel: topic.yearLevel, topicId: topic.id });
      if ('error' in converted) {
        discarded++;
        logger.info('generated question rejected (schema)', { topic: topic.id, error: converted.error });
        continue;
      }
      const q = converted.question;
      const self = correctResponseFor(q);
      if (self && !markResponse(q, self).correct) {
        discarded++;
        continue;
      }
      if ([...existing, ...accepted].some((e) => similarity(e.prompt, q.prompt) > 0.75)) {
        discarded++;
        continue;
      }
      const check = await independentlySolve(ai, uid, q);
      if (!check.ok) {
        discarded++;
        logger.info('generated question rejected (verification)', { topic: topic.id, reason: check.reason });
        continue;
      }
      accepted.push(q);
    }

    for (const q of accepted) {
      await writeBankQuestion(q, {
        status: 'unverified',
        source: 'ai',
        createdBy: uid,
        verification: { solver: ai.llm.model, at: Date.now() },
      });
    }
    return {
      generated: accepted.length,
      discarded,
      questions: accepted.map((q) => toPublicQuestion(q, { status: 'unverified', source: 'ai' })),
    };
  } finally {
    await lockRef.delete().catch(() => undefined);
  }
}

export const generateQuestions = onCall({ secrets: [KEY_ENCRYPTION_KEY], timeoutSeconds: 300, memory: '1GiB' }, async (req) => {
  const uid = requireAuth(req);
  await requireProfile(uid);
  await rateLimit(`generate:${uid}`, 10, 3600, "You've made lots of new questions this hour — practise those first!");
  const input = parseInput(
    z.object({
      topicId: z.string().min(3),
      difficulty: z.number().int().min(1).max(5).optional(),
      count: z.number().int().min(1).max(8).default(5),
    }),
    req.data,
  );
  return generateForTopic(uid, input);
});
