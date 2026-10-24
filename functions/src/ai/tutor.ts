import { describeAnswer, getTopic } from '@study-helper/shared';
import { onCall } from 'firebase-functions/https';
import { z } from 'zod';
import { db } from '../lib/firebase';
import { fail, parseInput, requireAuth } from '../lib/http';
import { loadQuestion } from '../lib/questions';
import { rateLimit } from '../lib/ratelimit';
import { requireProfile } from '../lib/users';
import { loadAttachment } from './attachments';
import { KEY_ENCRYPTION_KEY, recordUsage, requireAi } from './keys';
import { topicContext, tutorSystemPrompt } from './prompts';
import type { ChatTurn } from './providers';

const HISTORY_TURNS = 20;

const TutorSchema = z.object({
  chatId: z.string().max(40).optional(),
  mode: z.enum(['learn', 'question', 'assignment', 'notes']).default('learn'),
  topicId: z.string().max(60).optional(),
  questionId: z.string().max(200).optional(),
  message: z.string().trim().min(1).max(4000),
  attachments: z.array(z.string().max(300)).max(3).default([]),
});

interface ChatMessageDoc {
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  attachments?: string[];
}

/** Context about the question being discussed. Answers are only included once the student has attempted it. */
async function questionContext(uid: string, questionId: string): Promise<string> {
  const loaded = await loadQuestion(questionId);
  if (!loaded || (loaded.ownerUid && loaded.ownerUid !== uid)) return '';
  const q = loaded.question;
  const attempted = !(
    await db.collection(`students/${uid}/attempts`).where('questionId', '==', questionId).limit(1).get()
  ).empty;
  const parts = [`The practice question:\n${q.stem ? `${q.stem}\n\n` : ''}${q.prompt}`];
  if (q.type === 'mcq' || q.type === 'multi') parts.push(`Options: ${q.options.map((o) => `(${o.id}) ${o.text}`).join('  ')}`);
  if (attempted) {
    parts.push(`The student HAS already answered this question. Correct answer: ${describeAnswer(q)}\nWorked solution: ${q.solution}`);
  } else {
    parts.push('The student has NOT answered this question yet — do not reveal the answer.');
  }
  return parts.join('\n\n');
}

export const tutorChat = onCall({ secrets: [KEY_ENCRYPTION_KEY], timeoutSeconds: 300 }, async (req, res) => {
  const uid = requireAuth(req);
  const profile = await requireProfile(uid, 'student');
  await rateLimit(`tutor:${uid}`, 40, 600, "That's a lot of messages — have a go at a question, then come back.");
  await rateLimit(`tutor-day:${uid}`, 300, 86400, "You've reached today's tutor limit. Try again tomorrow.");
  const input = parseInput(TutorSchema, req.data);
  const ai = await requireAi(uid);

  const chats = db.collection(`students/${uid}/chats`);
  const chatRef = input.chatId ? chats.doc(input.chatId) : chats.doc();
  const chatSnap = await chatRef.get();
  if (input.chatId && !chatSnap.exists) throw fail.notFound('That conversation');
  const chat = chatSnap.data();
  const mode = (chat?.mode as string | undefined) ?? input.mode;
  const topicId = (chat?.topicId as string | undefined) ?? input.topicId;
  const questionId = (chat?.questionId as string | undefined) ?? input.questionId;

  const history = chatSnap.exists
    ? (await chatRef.collection('messages').orderBy('createdAt', 'desc').limit(HISTORY_TURNS).get()).docs
        .map((d) => d.data() as ChatMessageDoc)
        .reverse()
    : [];

  // Context for the first user turn (kept out of the system prompt so caching stays effective).
  const context = [
    `Student: ${profile.displayName}, Year ${profile.yearLevel ?? 9}.`,
    topicContext(topicId ? getTopic(topicId) : undefined),
    questionId ? await questionContext(uid, questionId) : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const attachments = await Promise.all(input.attachments.map((p) => loadAttachment(uid, p)));
  const turns: ChatTurn[] = history.map((m) => ({ role: m.role, text: m.content }));
  if (turns.length && turns[0]!.role === 'user') turns[0] = { ...turns[0]!, text: `[Context]\n${context}\n\n[Student]\n${turns[0]!.text}` };
  const userText = turns.length ? input.message : `[Context]\n${context}\n\n[Student]\n${input.message}`;
  turns.push({ role: 'user', text: userText, attachments });

  const now = Date.now();
  if (!chatSnap.exists) {
    await chatRef.set({
      title: input.message.slice(0, 60),
      mode,
      topicId: topicId ?? null,
      questionId: questionId ?? null,
      createdAt: now,
      updatedAt: now,
      messageCount: 0,
    });
  }
  await chatRef.collection('messages').add({
    role: 'user',
    content: input.message,
    createdAt: now,
    ...(input.attachments.length && { attachments: input.attachments }),
  } satisfies ChatMessageDoc);

  let streamed = '';
  const result = await ai.llm.streamText(
    { system: tutorSystemPrompt(mode), turns, maxTokens: 4000, effort: 'low' },
    (delta) => {
      streamed += delta;
      void res?.sendChunk({ chatId: chatRef.id, delta });
    },
  );
  const reply = result.refused
    ? "I can't help with that one. Let's get back to your school work — what are you studying?"
    : result.text || streamed;
  await chatRef.collection('messages').add({ role: 'assistant', content: reply, createdAt: Date.now() } satisfies ChatMessageDoc);
  await chatRef.update({ updatedAt: Date.now(), messageCount: (chat?.messageCount ?? 0) + 2 });
  await recordUsage(ai, uid, 'tutor', result.usage);
  return { chatId: chatRef.id, reply, refused: result.refused };
});
