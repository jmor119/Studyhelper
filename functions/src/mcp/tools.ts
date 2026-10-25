import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  allTopics,
  describeAnswer,
  getTopic,
  masteryLevel,
  SUBJECTS,
  type MasteryRecord,
  type QuestionResponse,
  type UserProfile,
} from '@study-helper/shared';
import { z } from 'zod';
import { bankStats, contributeQuestions, reviewQueue, setQuestionStatus } from '../callables/admin';
import { practiceSetFor, submitAnswerFor } from '../callables/practice';
import { db } from '../lib/firebase';
import { loadQuestion } from '../lib/questions';
import { rateLimit } from '../lib/ratelimit';
import { isLinked, linkedParents, linkedStudents } from '../lib/users';

// MCP tools, registered per request for the authenticated user and filtered by role.
// Tools never return answers to questions the student hasn't attempted yet.

const json = (value: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] });
const error = (message: string) => ({ content: [{ type: 'text' as const, text: message }], isError: true });

async function studentSummary(studentUid: string) {
  const [statsSnap, masterySnap, recent, exams] = await Promise.all([
    db.doc(`students/${studentUid}`).get(),
    db.collection(`students/${studentUid}/mastery`).get(),
    db.collection(`students/${studentUid}/attempts`).orderBy('createdAt', 'desc').limit(20).get(),
    db.collection(`students/${studentUid}/exams`).orderBy('startedAt', 'desc').limit(5).get(),
  ]);
  const mastery = masterySnap.docs
    .map((d) => d.data() as MasteryRecord)
    .map((m) => ({
      topicId: m.topicId,
      topic: getTopic(m.topicId)?.title ?? m.topicId,
      mastery: m.mastery,
      level: masteryLevel(m.mastery, m.attempts).label,
      attempts: m.attempts,
      accuracy: m.attempts ? Math.round((m.correct / m.attempts) * 100) : 0,
      lastPractised: new Date(m.lastPracticedAt).toISOString().slice(0, 10),
    }))
    .sort((a, b) => a.mastery - b.mastery);
  const s = statsSnap.data() ?? {};
  return {
    stats: {
      xp: s.xp, level: s.level, streak: s.streak, bestStreak: s.bestStreak, totalAnswered: s.totalAnswered,
      totalCorrect: s.totalCorrect, thisWeek: { answered: s.weekAnswered ?? 0, correct: s.weekCorrect ?? 0, minutes: Math.round(s.weekMinutes ?? 0) },
      badges: s.badges ?? [],
    },
    weakestTopics: mastery.slice(0, 5),
    allTopics: mastery,
    recentActivity: recent.docs.map((d) => {
      const a = d.data();
      return { when: new Date(a.createdAt).toISOString(), topic: getTopic(a.topicId)?.title ?? a.topicId, correct: a.correct, context: a.context };
    }),
    recentExams: exams.docs.map((d) => {
      const e = d.data();
      return { title: e.title, status: e.status, startedAt: new Date(e.startedAt).toISOString().slice(0, 10), percent: e.summary?.percent, grade: e.summary?.grade?.grade };
    }),
  };
}

/** Turns a plain-text answer from an MCP client into a typed response for marking. */
function toResponse(type: string, answer: string): QuestionResponse {
  const a = answer.trim();
  switch (type) {
    case 'mcq':
      return { type: 'mcq', optionId: a };
    case 'multi':
      return { type: 'multi', optionIds: a.split(/[,\s]+/).filter(Boolean) };
    case 'cloze':
      return { type: 'cloze', values: Object.fromEntries(a.split(/[;\n]/).map((p) => p.split('=').map((s) => s.trim()) as [string, string])) };
    case 'order':
      return { type: 'order', order: a.split(/[,\s]+/).filter(Boolean) };
    case 'match':
      return { type: 'match', pairs: Object.fromEntries(a.split(/[,;\n]/).map((p) => p.split('=').map((s) => s.trim()) as [string, string])) };
    case 'numeric':
    case 'expression':
    case 'text':
    case 'extended':
      return { type, value: a };
    default:
      return { type: 'text', value: a };
  }
}

export async function buildMcpServer(uid: string, profile: UserProfile, isAdminUser: boolean): Promise<McpServer> {
  const { McpServer: McpServerImpl } = await import('@modelcontextprotocol/sdk/server/mcp.js');
  const server = new McpServerImpl(
    { name: 'study-helper', version: '1.0.0' },
    {
      instructions:
        'Study Helper: NZ Year 9 Maths & Science study app. Use NZ English. When helping a student, guide and hint — never give final answers to assignments or questions they have not attempted.',
    },
  );

  // ---------- everyone ----------
  server.registerTool(
    'whoami',
    { title: 'Who am I', description: 'Your Study Helper account: role, year level and linked family members.', inputSchema: {} },
    async () => {
      const links = profile.role === 'student' ? await linkedParents(uid) : await linkedStudents(uid);
      return json({
        displayName: profile.displayName,
        role: profile.role,
        yearLevel: profile.yearLevel,
        admin: isAdminUser,
        family: links.map((l) => (profile.role === 'student' ? { parent: l.parentName, uid: l.parentUid } : { child: l.studentName, uid: l.studentUid })),
      });
    },
  );

  server.registerTool(
    'list_topics',
    {
      title: 'List curriculum topics',
      description: 'NZ Curriculum topics available in Study Helper, with ids, strands and summaries.',
      inputSchema: { subject: z.enum(SUBJECTS).optional(), yearLevel: z.number().int().min(1).max(13).optional() },
    },
    async ({ subject, yearLevel }) =>
      json(
        allTopics()
          .filter((t) => (!subject || t.subject === subject) && (!yearLevel || t.yearLevel === yearLevel))
          .map((t) => ({ id: t.id, subject: t.subject, yearLevel: t.yearLevel, strand: t.strandId, title: t.title, summary: t.summary })),
      ),
  );

  server.registerTool(
    'get_topic',
    { title: 'Topic details', description: 'Learning outcomes, key terms and prerequisites for a topic.', inputSchema: { topicId: z.string() } },
    async ({ topicId }) => {
      const t = getTopic(topicId);
      return t ? json(t) : error(`Unknown topic ${topicId}. Use list_topics.`);
    },
  );

  server.registerTool(
    'add_questions',
    {
      title: 'Contribute questions to the shared bank',
      description:
        'Add practice questions (full Study Helper question JSON, see docs/CONTENT-GUIDE.md: id "<topicId>.<slug>", type, difficulty 1–5, prompt, hints, solution, answer fields). Each is validated and self-checked. Admin contributions are published; others are visible only to your family until reviewed.',
      inputSchema: { questions: z.array(z.record(z.string(), z.unknown())).min(1).max(50) },
    },
    async ({ questions }) => {
      await rateLimit(`mcp-contribute:${uid}`, isAdminUser ? 100 : 10, 3600);
      return json(await contributeQuestions(uid, isAdminUser, questions));
    },
  );

  // ---------- students ----------
  if (profile.role === 'student') {
    server.registerTool(
      'get_my_progress',
      { title: 'My progress', description: 'XP, streak, mastery per topic (weakest first), recent activity and exams.', inputSchema: {} },
      async () => json(await studentSummary(uid)),
    );

    server.registerTool(
      'get_practice_questions',
      {
        title: 'Get practice questions',
        description: 'Adaptive practice questions for a topic (no answers). Answer them with submit_answer.',
        inputSchema: { topicId: z.string(), count: z.number().int().min(1).max(10).default(5), difficulty: z.number().int().min(1).max(5).optional() },
      },
      async ({ topicId, count, difficulty }) => {
        await rateLimit(`mcp-practice:${uid}`, 60, 600);
        const set = await practiceSetFor(uid, { topicId, count, difficulty, mode: 'adaptive' });
        return json(
          set.questions.map((q) => ({
            questionId: q.id,
            type: q.type,
            difficulty: q.difficulty,
            stem: q.stem,
            prompt: q.prompt,
            ...('options' in q && { options: q.options }),
            ...('items' in q && { items: q.items }),
            ...('left' in q && { left: q.left, right: q.right }),
            ...('blanks' in q && { blanks: q.blanks }),
            ...('units' in q && q.units && { units: q.units }),
            hints: q.hints,
            ...(q.figure && { figure: q.figure.alt }),
            howToAnswer:
              {
                mcq: 'the option id, e.g. "b"',
                multi: 'comma-separated option ids',
                numeric: 'a number (fractions ok)',
                expression: 'an expression, e.g. 3x + 6',
                text: 'a short answer',
                cloze: 'blankId=answer pairs separated by ;',
                order: 'item ids in order, comma-separated',
                match: 'leftId=rightId pairs, comma-separated',
                extended: 'a written answer',
              }[q.type],
          })),
        );
      },
    );

    server.registerTool(
      'submit_answer',
      {
        title: 'Submit an answer',
        description: "Mark the student's answer to a practice question. Returns correctness, the worked solution and progress.",
        inputSchema: { questionId: z.string(), answer: z.string().max(4000), hintsUsed: z.number().int().min(0).max(4).default(0) },
      },
      async ({ questionId, answer, hintsUsed }) => {
        await rateLimit(`mcp-submit:${uid}`, 120, 600);
        const loaded = await loadQuestion(questionId);
        if (!loaded) return error('Unknown question id.');
        const result = await submitAnswerFor(uid, { questionId, response: toResponse(loaded.question.type, answer), hintsUsed, timeMs: 0, context: 'mcp' });
        return json(result);
      },
    );

    server.registerTool(
      'get_mistakes',
      {
        title: 'Recent mistakes',
        description: 'Questions answered incorrectly recently, with the correct answer and solution (already attempted).',
        inputSchema: { topicId: z.string().optional(), limit: z.number().int().min(1).max(20).default(10) },
      },
      async ({ topicId, limit }) => {
        const snap = await db.collection(`students/${uid}/attempts`).where('correct', '==', false).orderBy('createdAt', 'desc').limit(60).get();
        const rows = snap.docs.map((d) => d.data()).filter((a) => !a.needsReview && (!topicId || a.topicId === topicId)).slice(0, limit);
        const out = [];
        for (const a of rows) {
          const loaded = await loadQuestion(a.questionId);
          if (!loaded) continue;
          out.push({ topic: getTopic(a.topicId)?.title, prompt: loaded.question.prompt, yourAnswer: a.answerText, correctAnswer: describeAnswer(loaded.question), solution: loaded.question.solution });
        }
        return json(out);
      },
    );

    server.registerTool(
      'get_study_plans',
      { title: 'Study plans', description: 'Exam dates and study plans the student has set up.', inputSchema: {} },
      async () => json((await db.collection(`students/${uid}/plans`).get()).docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
  }

  // ---------- parents ----------
  if (profile.role === 'parent') {
    const requireChild = async (studentUid: string) => {
      if (!(await isLinked(uid, studentUid))) throw new Error('Not one of your linked children. Use list_children.');
    };

    server.registerTool(
      'list_children',
      { title: 'My children', description: 'Linked student accounts with a quick summary.', inputSchema: {} },
      async () => {
        const links = await linkedStudents(uid);
        const out = await Promise.all(
          links.map(async (l) => {
            const s = (await db.doc(`students/${l.studentUid}`).get()).data() ?? {};
            return { studentUid: l.studentUid, name: l.studentName, streak: s.streak ?? 0, xp: s.xp ?? 0, thisWeekAnswered: s.weekAnswered ?? 0, thisWeekCorrect: s.weekCorrect ?? 0 };
          }),
        );
        return json(out);
      },
    );

    server.registerTool(
      'get_child_progress',
      { title: "Child's progress", description: 'Mastery by topic (weakest first), recent activity, exam results.', inputSchema: { studentUid: z.string() } },
      async ({ studentUid }) => {
        await requireChild(studentUid);
        return json(await studentSummary(studentUid));
      },
    );

    server.registerTool(
      'get_child_tutor_chats',
      { title: "Child's tutor chats", description: 'Recent AI tutor conversations (titles and messages).', inputSchema: { studentUid: z.string(), limit: z.number().int().min(1).max(10).default(5) } },
      async ({ studentUid, limit }) => {
        await requireChild(studentUid);
        const chats = await db.collection(`students/${studentUid}/chats`).orderBy('updatedAt', 'desc').limit(limit).get();
        const out = await Promise.all(
          chats.docs.map(async (c) => ({
            title: c.data().title,
            mode: c.data().mode,
            updated: new Date(c.data().updatedAt).toISOString(),
            messages: (await c.ref.collection('messages').orderBy('createdAt').limit(40).get()).docs.map((m) => ({ role: m.data().role, content: m.data().content })),
          })),
        );
        return json(out);
      },
    );

    server.registerTool(
      'set_goal',
      {
        title: 'Set a goal',
        description: 'Create a goal (and optional reward) for a linked child, e.g. 100 questions this week.',
        inputSchema: {
          studentUid: z.string(),
          title: z.string().min(1).max(80),
          metric: z.enum(['questions', 'correct', 'minutes', 'xp', 'sessions', 'flashcards', 'exams']),
          target: z.number().int().min(1).max(100000),
          period: z.enum(['day', 'week', 'once']),
          reward: z.string().max(200).optional(),
        },
      },
      async ({ studentUid, ...goal }) => {
        await requireChild(studentUid);
        const ref = await db.collection(`students/${studentUid}/goals`).add({ ...goal, createdBy: uid, createdAt: Date.now(), progress: 0, status: 'active' });
        return json({ goalId: ref.id });
      },
    );

    server.registerTool(
      'list_goals',
      { title: "Child's goals", description: 'Goals and their progress for a linked child.', inputSchema: { studentUid: z.string() } },
      async ({ studentUid }) => {
        await requireChild(studentUid);
        return json((await db.collection(`students/${studentUid}/goals`).get()).docs.map((d) => ({ id: d.id, ...d.data() })));
      },
    );
  }

  // ---------- admins ----------
  if (isAdminUser) {
    server.registerTool('bank_stats', { title: 'Bank stats', description: 'Question counts by status and open flags.', inputSchema: {} }, async () => json(await bankStats()));

    server.registerTool(
      'list_review_queue',
      {
        title: 'Review queue',
        description: 'Questions awaiting review (with answers and flags).',
        inputSchema: { status: z.enum(['unverified', 'pending', 'flagged']).default('flagged'), limit: z.number().int().min(1).max(50).default(20) },
      },
      async ({ status, limit }) => json(await reviewQueue(status, limit)),
    );

    server.registerTool(
      'set_question_status',
      { title: 'Set question status', description: 'Publish, hide or retire a bank question.', inputSchema: { questionId: z.string(), status: z.enum(['verified', 'unverified', 'flagged', 'retired']) } },
      async ({ questionId, status }) => {
        await setQuestionStatus(questionId, status);
        return json({ ok: true });
      },
    );
  }

  return server;
}
