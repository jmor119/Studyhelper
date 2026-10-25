// End-to-end backend flows against the Firebase emulators (auth, firestore, functions).
// Run: npm run test:integration   (or with emulators already running: npx vitest run --config tests/integration/vitest.config.ts)
import {
  correctResponseFor,
  questionFromTemplateId,
  wrongResponseFor,
  type PublicQuestion,
  type QuestionResponse,
} from '@study-helper/shared';
import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword, signOut, type Auth } from 'firebase/auth';
import { addDoc, collection, connectFirestoreEmulator, doc, getDoc, getDocs, getFirestore, orderBy, query, type Firestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions, httpsCallable, type Functions } from 'firebase/functions';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const PROJECT = 'demo-study-helper';
const REGION = 'australia-southeast1';
const run = Date.now().toString(36);

interface Client {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  fns: Functions;
  call: <T = any>(name: string, data?: unknown) => Promise<T>;
}

function client(name: string): Client {
  const app = initializeApp({ projectId: PROJECT, apiKey: 'demo-key', authDomain: 'localhost' }, name);
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  const fns = getFunctions(app, REGION);
  connectFunctionsEmulator(fns, '127.0.0.1', 5001);
  return { app, auth, db, fns, call: async (n, data = {}) => (await httpsCallable(fns, n)(data)).data as never };
}

const student = client('student');
const parent = client('parent');
const parent2 = client('parent2');
const kid = client('kid');
let studentUid = '';
let parentUid = '';
let kidUid = '';

/** The student's perfect answer to a template question (the test can rebuild templates locally). */
function rightAnswer(q: PublicQuestion): QuestionResponse {
  const full = questionFromTemplateId(q.id);
  if (!full) throw new Error(`not a template question: ${q.id}`);
  return correctResponseFor(full)!;
}

beforeAll(async () => {
  const s = await createUserWithEmailAndPassword(student.auth, `student-${run}@example.com`, 'password123');
  studentUid = s.user.uid;
  const p = await createUserWithEmailAndPassword(parent.auth, `parent-${run}@example.com`, 'password123');
  parentUid = p.user.uid;
  await createUserWithEmailAndPassword(parent2.auth, `parent2-${run}@example.com`, 'password123');
}, 60_000);

afterAll(async () => {
  await Promise.all([student, parent, parent2, kid].map((c) => deleteApp(c.app)));
});

describe('onboarding', () => {
  it('creates profiles and student stats', async () => {
    const res = await student.call('completeOnboarding', { role: 'student', displayName: 'Sam', yearLevel: 9 });
    expect(res.created).toBe(true);
    await parent.call('completeOnboarding', { role: 'parent', displayName: 'Pat' });
    await parent2.call('completeOnboarding', { role: 'parent', displayName: 'Robin' });
    const stats = await getDoc(doc(student.db, 'students', studentUid));
    expect(stats.data()?.xp).toBe(0);
    await expect(student.call('completeOnboarding', { role: 'parent', displayName: 'Sam' })).rejects.toThrow(/already set up/);
  });
});

describe('practice', () => {
  it('serves an adaptive maths set and marks answers server-side', async () => {
    const set = await student.call<{ questions: PublicQuestion[] }>('getPracticeSet', { topicId: 'm9.alg.equations', count: 6 });
    expect(set.questions.length).toBe(6);
    const tpl = set.questions.find((q) => q.id.startsWith('tpl:'))!;
    expect(tpl).toBeDefined();
    expect(JSON.stringify(tpl)).not.toContain('"solution":');
    expect(JSON.stringify(tpl)).not.toContain('"correct":');

    const right = await student.call('submitAnswer', { questionId: tpl.id, response: rightAnswer(tpl), hintsUsed: 0, timeMs: 15000 });
    expect(right.mark.correct).toBe(true);
    expect(right.xpGained).toBeGreaterThan(0);
    expect(right.solution).toBeTruthy();

    const second = set.questions.filter((q) => q.id.startsWith('tpl:'))[1]!;
    const wrong = await student.call('submitAnswer', {
      questionId: second.id,
      response: wrongResponseFor(questionFromTemplateId(second.id)!),
      hintsUsed: 1,
      timeMs: 20000,
    });
    expect(wrong.mark.correct).toBe(false);

    const mastery = await getDoc(doc(student.db, 'students', studentUid, 'mastery', 'm9.alg.equations'));
    expect(mastery.data()?.attempts).toBe(2);
    const stats = await getDoc(doc(student.db, 'students', studentUid));
    expect(stats.data()?.totalAnswered).toBe(2);
    expect(stats.data()?.streak).toBe(1);
  });

  it('rejects malformed answers without counting them', async () => {
    const set = await student.call<{ questions: PublicQuestion[] }>('getPracticeSet', { topicId: 'm9.mea.pythagoras', count: 3 });
    const numeric = set.questions.find((q) => q.type === 'numeric');
    if (!numeric) return;
    const res = await student.call('submitAnswer', { questionId: numeric.id, response: { type: 'numeric', value: 'banana' }, hintsUsed: 0, timeMs: 1000 });
    expect(res.invalid).toBe(true);
  });

  it('serves science questions from the seeded bank', async () => {
    const set = await student.call<{ questions: PublicQuestion[] }>('getPracticeSet', { topicId: 's9.bio.cells', count: 5 });
    expect(set.questions.length).toBeGreaterThan(0);
    expect(set.questions.every((q) => q.topicId === 's9.bio.cells')).toBe(true);
  });

  it('does not let parents submit answers', async () => {
    await expect(parent.call('submitAnswer', { questionId: 'x', response: { type: 'text', value: 'a' } })).rejects.toThrow(/student/i);
  });
});

describe('family', () => {
  it('lets a parent create a child account that signs in with a username', async () => {
    const username = `kid${run}`.slice(0, 20);
    const res = await parent.call('createChildAccount', { displayName: 'Kiri', username, password: 'kidpass123', yearLevel: 6 });
    kidUid = res.uid;
    await signInWithEmailAndPassword(kid.auth, `${username}@kids.study-helper.invalid`, 'kidpass123');
    const profile = await getDoc(doc(kid.db, 'users', kidUid));
    expect(profile.data()?.role).toBe('student');
    expect(profile.data()?.managedBy).toBe(parentUid);
    // The parent can read the child's progress via the link.
    const stats = await getDoc(doc(parent.db, 'students', kidUid));
    expect(stats.exists()).toBe(true);
    await expect(parent.call('createChildAccount', { displayName: 'Dup', username, password: 'kidpass123', yearLevel: 6 })).rejects.toThrow(/taken/);
    await expect(student.call('createChildAccount', { displayName: 'X', username: `x${run}`, password: 'kidpass123', yearLevel: 6 })).rejects.toThrow(/parent/i);
  });

  it('links a student and parent through an invite code', async () => {
    const invite = await student.call<{ code: string }>('createInvite');
    const peek = await parent2.call('peekInvite', { code: invite.code });
    expect(peek.fromName).toBe('Sam');
    const accepted = await parent2.call('acceptInvite', { code: invite.code });
    expect(accepted.otherName).toBe('Sam');
    await expect(parent.call('acceptInvite', { code: invite.code })).rejects.toThrow();
    const stats = await getDoc(doc(parent2.db, 'students', studentUid));
    expect(stats.exists()).toBe(true);
  });

  it('emails invites (or falls back to the email app), only for the inviter, max 3 addresses', async () => {
    const invite = await parent.call<{ code: string }>('createInvite');
    const res = await parent.call('emailInvite', { code: invite.code, email: 'Child@Example.com' });
    expect(res.emailed).toBe(false); // no email service in the emulator → the browser opens the email app
    await expect(student.call('emailInvite', { code: invite.code, email: 'x@example.com' })).rejects.toThrow();
    await parent.call('emailInvite', { code: invite.code, email: 'b@example.com' });
    await parent.call('emailInvite', { code: invite.code, email: 'c@example.com' });
    await expect(parent.call('emailInvite', { code: invite.code, email: 'd@example.com' })).rejects.toThrow(/3 addresses/);
    await expect(parent.call('emailInvite', { code: invite.code, email: 'not-an-email' })).rejects.toThrow();
  });

  it('tracks parent-set goals as the child practises', async () => {
    const parent2Uid = parent2.auth.currentUser!.uid;
    const goalRef = await addDoc(collection(parent2.db, 'students', studentUid, 'goals'), {
      title: 'Answer 2 questions',
      metric: 'questions',
      target: 2,
      period: 'once',
      reward: 'Movie night',
      createdBy: parent2Uid,
      createdAt: Date.now(),
      progress: 0,
      status: 'active',
    });
    const set = await student.call<{ questions: PublicQuestion[] }>('getPracticeSet', { topicId: 'm9.num.integers', count: 4 });
    const tpls = set.questions.filter((q) => q.id.startsWith('tpl:')).slice(0, 2);
    let last: any;
    for (const q of tpls) last = await student.call('submitAnswer', { questionId: q.id, response: rightAnswer(q), hintsUsed: 0, timeMs: 5000 });
    expect(last.goalsAchieved).toContain('Answer 2 questions');
    const goal = await getDoc(goalRef);
    expect(goal.data()?.status).toBe('achieved');
  });

  it('parents can unlink, but not from accounts they manage', async () => {
    await expect(parent.call('unlink', { otherUid: kidUid })).rejects.toThrow(/created by the parent/);
  });
});

describe('mock exams', () => {
  it('builds, takes and marks an exam', async () => {
    const start = await student.call('startExam', { topicIds: ['m9.alg.equations', 'm9.num.integers'], durationMinutes: 15, calculator: 'not-allowed' });
    expect(start.questionCount).toBeGreaterThan(0);
    const qs = await getDocs(query(collection(student.db, 'students', studentUid, 'exams', start.examId, 'questions'), orderBy('order')));
    const responses: Record<string, QuestionResponse> = {};
    for (const d of qs.docs) {
      const q = d.data() as PublicQuestion;
      if (q.id.startsWith('tpl:')) responses[q.id] = rightAnswer(q);
    }
    const res = await student.call('submitExam', { examId: start.examId, responses, timeTakenMs: 600000 });
    expect(res.summary.percent).toBeGreaterThan(0);
    expect(res.results.length).toBe(start.questionCount);
    await expect(student.call('submitExam', { examId: start.examId, responses, timeTakenMs: 1 })).rejects.toThrow(/already/);
  });
});

describe('AI without a key', () => {
  it('reports unavailable and refuses AI calls with a helpful message', async () => {
    const status = await student.call('getAiStatus');
    expect(status.available).toBe(false);
    await expect(student.call('tutorChat', { message: 'Help with fractions' })).rejects.toThrow(/API key/);
  });
});

describe('MCP server', () => {
  const base = `http://127.0.0.1:5001/${PROJECT}/${REGION}/mcp`;

  it('publishes OAuth metadata and challenges unauthenticated calls', async () => {
    const meta = await (await fetch(`${base}/.well-known/oauth-authorization-server`)).json();
    expect(meta.code_challenge_methods_supported).toContain('S256');
    const res = await fetch(`${base}/mcp`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    expect(res.status).toBe(401);
    expect(res.headers.get('www-authenticate')).toContain('resource_metadata');
  });

  it('lists role-scoped tools with a personal token', async () => {
    const { token } = await student.call<{ token: string }>('createApiToken', { name: 'tests' });
    const headers = { 'content-type': 'application/json', accept: 'application/json, text/event-stream', authorization: `Bearer ${token}` };
    const init = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } } }),
    });
    expect(init.status).toBe(200);
    const list = await fetch(`${base}/mcp`, { method: 'POST', headers, body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }) });
    const body = await list.json();
    const names = body.result.tools.map((t: { name: string }) => t.name);
    expect(names).toContain('get_practice_questions');
    expect(names).toContain('submit_answer');
    expect(names).not.toContain('list_children');
    expect(names).not.toContain('set_question_status');
  });
});

describe('cleanup', () => {
  it('signs everyone out', async () => {
    await Promise.all([student, parent, parent2, kid].map((c) => signOut(c.auth)));
  });
});
