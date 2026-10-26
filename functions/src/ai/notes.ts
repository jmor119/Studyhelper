import { correctResponseFor, curriculaForYear, getTopic, markResponse, toPublicQuestion, type Question } from '@study-helper/shared';
import { onCall } from 'firebase-functions/https';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { db } from '../lib/firebase';
import { fail, parseInput, requireAuth } from '../lib/http';
import { rateLimit } from '../lib/ratelimit';
import { requireProfile } from '../lib/users';
import { loadAttachment } from './attachments';
import { KEY_ENCRYPTION_KEY, recordUsage, requireAi } from './keys';
import { NOTES_SYSTEM } from './prompts';
import { fromFlat, NotesAnalysis } from './schema';

// Class notes / worksheets → summary, key terms, matched topics and private practice questions.
// Questions from a student's own notes stay private to them (the material may be their teacher's).

export const analyseNotes = onCall({ secrets: [KEY_ENCRYPTION_KEY], timeoutSeconds: 300, memory: '1GiB' }, async (req) => {
  const uid = requireAuth(req);
  const profile = await requireProfile(uid, 'student');
  await rateLimit(`notes:${uid}`, 15, 86400, "You've analysed a lot of notes today — try again tomorrow.");
  const input = parseInput(z.object({ paths: z.array(z.string().min(5).max(300)).min(1).max(4) }), req.data);
  const ai = await requireAi(uid);
  const attachments = await Promise.all(input.paths.map((p) => loadAttachment(uid, p)));
  const year = profile.yearLevel ?? 9;
  const yearTopics = curriculaForYear(year).flatMap((c) => c.topics);
  if (!yearTopics.length) throw fail.precondition(`Study Helper doesn't have Year ${year} content yet.`);
  const topicList = yearTopics
    .map((t) => `${t.id}: ${t.title}`)
    .join('\n');

  const res = await ai.llm.generateJson(
    {
      system: NOTES_SYSTEM,
      turns: [
        {
          role: 'user',
          attachments,
          text: `Student: Year ${year}.\n\nCurriculum topics (use only these ids in topicIds):\n${topicList}\n\nAnalyse the attached notes and write up to 8 practice questions on them.`,
        },
      ],
      maxTokens: 16000,
      effort: 'medium',
    },
    NotesAnalysis,
    'notes_analysis',
  );
  await recordUsage(ai, uid, 'notes', res.usage);
  if (!res.data) throw fail.precondition("The AI couldn't read those notes. Try clearer photos or a PDF.");

  const setId = randomBytes(8).toString('hex');
  const topicIds = res.data.topicIds.filter((id) => getTopic(id));
  const primary = getTopic(topicIds[0] ?? '') ?? yearTopics[0]!;
  const questions: Question[] = [];
  res.data.questions.forEach((flat) => {
    const id = `note:${setId}:${questions.length}`;
    const converted = fromFlat(flat, { id, subject: primary.subject, yearLevel: year, topicId: primary.id });
    if ('error' in converted) return;
    const self = correctResponseFor(converted.question);
    if (self && !markResponse(converted.question, self).correct) return;
    questions.push(converted.question);
  });

  const now = Date.now();
  await db.doc(`noteAnswers/${setId}`).set({ ownerUid: uid, questions, createdAt: now });
  await db.doc(`students/${uid}/noteSets/${setId}`).set({
    title: res.data.title.slice(0, 80),
    summary: res.data.summary,
    keyTerms: res.data.keyTerms.slice(0, 30),
    topicIds,
    paths: input.paths,
    questions: questions.map((q) => toPublicQuestion(q, { source: 'ai' })),
    createdAt: now,
  });
  return { setId, title: res.data.title, questionCount: questions.length, topicIds };
});
