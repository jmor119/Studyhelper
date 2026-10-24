// Security-rules tests. Run with `npm run test:rules` (starts the Firestore + Storage emulators).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  deleteDoc,
} from 'firebase/firestore';
import { getBytes, ref, uploadBytes } from 'firebase/storage';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '..', '..');
let env: RulesTestEnvironment;

const PARENT = 'parentA';
const OTHER_PARENT = 'parentB';
const STUDENT = 'studentS';
const OTHER_STUDENT = 'studentT';

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-study-helper',
    firestore: { rules: readFileSync(path.join(root, 'firestore.rules'), 'utf8') },
    storage: { rules: readFileSync(path.join(root, 'storage.rules'), 'utf8') },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const now = Date.now();
    await setDoc(doc(db, 'users', PARENT), { role: 'parent', displayName: 'Parent A', createdAt: now });
    await setDoc(doc(db, 'users', OTHER_PARENT), { role: 'parent', displayName: 'Parent B', createdAt: now });
    await setDoc(doc(db, 'users', STUDENT), { role: 'student', displayName: 'Sam', yearLevel: 9, createdAt: now });
    await setDoc(doc(db, 'users', OTHER_STUDENT), { role: 'student', displayName: 'Tia', yearLevel: 9, createdAt: now });
    await setDoc(doc(db, 'users', PARENT, 'private', 'ai'), { provider: 'anthropic', last4: 'abcd' });
    await setDoc(doc(db, 'links', `${PARENT}_${STUDENT}`), {
      parentUid: PARENT,
      studentUid: STUDENT,
      parentName: 'Parent A',
      studentName: 'Sam',
      createdAt: now,
      createdBy: PARENT,
    });
    await setDoc(doc(db, 'bank', 'q1'), { topicId: 'm9.alg.equations', status: 'verified', prompt: 'x' });
    await setDoc(doc(db, 'bank', 'q2'), { topicId: 'm9.alg.equations', status: 'pending', visibleTo: [STUDENT], prompt: 'y' });
    await setDoc(doc(db, 'bank', 'q3'), { topicId: 'm9.alg.equations', status: 'retired', prompt: 'z' });
    await setDoc(doc(db, 'bankAnswers', 'q1'), { answer: 4 });
    await setDoc(doc(db, 'students', STUDENT), { xp: 100, streak: 2 });
    await setDoc(doc(db, 'students', STUDENT, 'attempts', 'a1'), { topicId: 'm9.alg.equations', correct: true });
    await setDoc(doc(db, 'secrets', PARENT), { anthropic: 'encrypted' });
    await setDoc(doc(db, 'usage', PARENT, 'months', '2026-10'), { tokens: 100 });
  });
});

const as = (uid: string, claims: Record<string, unknown> = {}) => env.authenticatedContext(uid, claims).firestore();
const anon = () => env.unauthenticatedContext().firestore();

describe('users', () => {
  it('lets users read themselves and their linked family only', async () => {
    await assertSucceeds(getDoc(doc(as(STUDENT), 'users', STUDENT)));
    await assertSucceeds(getDoc(doc(as(PARENT), 'users', STUDENT)));
    await assertSucceeds(getDoc(doc(as(STUDENT), 'users', PARENT)));
    await assertFails(getDoc(doc(as(OTHER_PARENT), 'users', STUDENT)));
    await assertFails(getDoc(doc(as(OTHER_STUDENT), 'users', STUDENT)));
    await assertFails(getDoc(doc(as(STUDENT), 'users', OTHER_PARENT)));
    await assertFails(getDoc(doc(anon(), 'users', STUDENT)));
  });

  it('allows editing cosmetic fields only', async () => {
    await assertSucceeds(updateDoc(doc(as(STUDENT), 'users', STUDENT), { displayName: 'Sammy' }));
    await assertSucceeds(updateDoc(doc(as(STUDENT), 'users', STUDENT), { prefs: { theme: 'dark', dailyGoal: 20 } }));
    await assertFails(updateDoc(doc(as(STUDENT), 'users', STUDENT), { role: 'parent' }));
    await assertFails(updateDoc(doc(as(STUDENT), 'users', STUDENT), { yearLevel: 13 }));
    await assertFails(updateDoc(doc(as(STUDENT), 'users', STUDENT), { prefs: { theme: 'neon' } }));
    await assertFails(updateDoc(doc(as(STUDENT), 'users', STUDENT), { displayName: '' }));
    await assertFails(updateDoc(doc(as(PARENT), 'users', STUDENT), { displayName: 'Changed by parent' }));
    await assertFails(setDoc(doc(as('newUser'), 'users', 'newUser'), { role: 'parent', displayName: 'X' }));
  });

  it('keeps the AI key summary private to its owner', async () => {
    await assertSucceeds(getDoc(doc(as(PARENT), 'users', PARENT, 'private', 'ai')));
    await assertFails(getDoc(doc(as(STUDENT), 'users', PARENT, 'private', 'ai')));
    await assertFails(setDoc(doc(as(PARENT), 'users', PARENT, 'private', 'ai'), { provider: 'openai' }));
  });
});

describe('links', () => {
  it('are readable by either party and never writable by clients', async () => {
    await assertSucceeds(getDoc(doc(as(PARENT), 'links', `${PARENT}_${STUDENT}`)));
    await assertSucceeds(getDoc(doc(as(STUDENT), 'links', `${PARENT}_${STUDENT}`)));
    await assertFails(getDoc(doc(as(OTHER_PARENT), 'links', `${PARENT}_${STUDENT}`)));
    await assertSucceeds(getDocs(query(collection(as(PARENT), 'links'), where('parentUid', '==', PARENT))));
    await assertFails(getDocs(query(collection(as(OTHER_PARENT), 'links'), where('parentUid', '==', PARENT))));
    // A parent can't link themselves to a child, and a stranger can't forge a link.
    await assertFails(
      setDoc(doc(as(OTHER_PARENT), 'links', `${OTHER_PARENT}_${STUDENT}`), { parentUid: OTHER_PARENT, studentUid: STUDENT }),
    );
    await assertFails(deleteDoc(doc(as(STUDENT), 'links', `${PARENT}_${STUDENT}`)));
  });
});

describe('question bank', () => {
  it('serves public questions to signed-in users only', async () => {
    await assertSucceeds(getDoc(doc(as(STUDENT), 'bank', 'q1')));
    await assertFails(getDoc(doc(anon(), 'bank', 'q1')));
  });

  it('hides pending contributions outside the family, and retired questions from everyone but admins', async () => {
    await assertSucceeds(getDoc(doc(as(STUDENT), 'bank', 'q2')));
    await assertFails(getDoc(doc(as(OTHER_STUDENT), 'bank', 'q2')));
    await assertFails(getDoc(doc(as(STUDENT), 'bank', 'q3')));
    await assertSucceeds(getDoc(doc(as('admin1', { admin: true }), 'bank', 'q3')));
  });

  it('requires queries to filter by status', async () => {
    const db = as(STUDENT);
    await assertSucceeds(
      getDocs(
        query(collection(db, 'bank'), where('topicId', '==', 'm9.alg.equations'), where('status', 'in', ['verified', 'unverified'])),
      ),
    );
    await assertFails(getDocs(query(collection(db, 'bank'), where('topicId', '==', 'm9.alg.equations'))));
  });

  it('never exposes answers and never accepts client writes', async () => {
    await assertFails(getDoc(doc(as(STUDENT), 'bankAnswers', 'q1')));
    await assertFails(getDoc(doc(as('admin1', { admin: true }), 'bankAnswers', 'q1')));
    await assertFails(setDoc(doc(as(STUDENT), 'bank', 'q9'), { status: 'verified', prompt: 'spam' }));
    await assertFails(updateDoc(doc(as(STUDENT), 'bank', 'q1'), { status: 'retired' }));
  });
});

describe('student progress', () => {
  it('is readable by the student and linked parents only', async () => {
    await assertSucceeds(getDoc(doc(as(STUDENT), 'students', STUDENT)));
    await assertSucceeds(getDoc(doc(as(PARENT), 'students', STUDENT)));
    await assertSucceeds(getDoc(doc(as(PARENT), 'students', STUDENT, 'attempts', 'a1')));
    await assertFails(getDoc(doc(as(OTHER_PARENT), 'students', STUDENT)));
    await assertFails(getDoc(doc(as(OTHER_PARENT), 'students', STUDENT, 'attempts', 'a1')));
    await assertFails(getDoc(doc(as(OTHER_STUDENT), 'students', STUDENT, 'attempts', 'a1')));
  });

  it('cannot be forged by the student', async () => {
    await assertFails(updateDoc(doc(as(STUDENT), 'students', STUDENT), { xp: 999999 }));
    await assertFails(setDoc(doc(as(STUDENT), 'students', STUDENT, 'attempts', 'a2'), { correct: true }));
    await assertFails(setDoc(doc(as(STUDENT), 'students', STUDENT, 'mastery', 'm9.alg.equations'), { mastery: 100 }));
  });

  it('lets students store flashcard state with validation', async () => {
    const card = {
      cardId: 'c1',
      topicId: 's9.bio.cells',
      due: Date.now(),
      stability: 0,
      difficulty: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      reps: 0,
      lapses: 0,
      state: 0,
      lastReview: null,
      learningSteps: 0,
    };
    await assertSucceeds(setDoc(doc(as(STUDENT), 'students', STUDENT, 'cards', 'c1'), card));
    await assertFails(setDoc(doc(as(STUDENT), 'students', STUDENT, 'cards', 'c2'), card)); // id mismatch
    await assertFails(setDoc(doc(as(STUDENT), 'students', STUDENT, 'cards', 'c1'), { ...card, xp: 5 }));
    await assertFails(setDoc(doc(as(PARENT), 'students', STUDENT, 'cards', 'c1'), card));
  });

  it('lets students manage study plans', async () => {
    const plan = {
      title: 'End of year maths',
      subject: 'maths',
      examDate: '2026-11-18',
      topicIds: ['m9.alg.equations'],
      minutesPerDay: 30,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await assertSucceeds(setDoc(doc(as(STUDENT), 'students', STUDENT, 'plans', 'p1'), plan));
    await assertFails(setDoc(doc(as(STUDENT), 'students', STUDENT, 'plans', 'p2'), { ...plan, examDate: 'next week' }));
    await assertFails(setDoc(doc(as(STUDENT), 'students', STUDENT, 'plans', 'p3'), { ...plan, minutesPerDay: 9999 }));
  });

  it('lets linked parents (only) set goals', async () => {
    const goal = {
      title: '100 questions this week',
      metric: 'questions',
      target: 100,
      period: 'week',
      reward: '$10 towards the new boots',
      createdBy: PARENT,
      createdAt: Date.now(),
      progress: 0,
      status: 'active',
    };
    await assertSucceeds(setDoc(doc(as(PARENT), 'students', STUDENT, 'goals', 'g1'), goal));
    await assertFails(setDoc(doc(as(OTHER_PARENT), 'students', STUDENT, 'goals', 'g2'), { ...goal, createdBy: OTHER_PARENT }));
    await assertFails(setDoc(doc(as(STUDENT), 'students', STUDENT, 'goals', 'g3'), { ...goal, createdBy: STUDENT }));
    await assertFails(setDoc(doc(as(PARENT), 'students', STUDENT, 'goals', 'g4'), { ...goal, progress: 100 }));
    await assertSucceeds(getDoc(doc(as(STUDENT), 'students', STUDENT, 'goals', 'g1')));
    await assertFails(updateDoc(doc(as(STUDENT), 'students', STUDENT, 'goals', 'g1'), { status: 'achieved' }));
    await assertFails(updateDoc(doc(as(PARENT), 'students', STUDENT, 'goals', 'g1'), { progress: 100 }));
    await assertSucceeds(updateDoc(doc(as(PARENT), 'students', STUDENT, 'goals', 'g1'), { status: 'paused' }));
  });
});

describe('server-only data', () => {
  it('keeps secrets, tokens and usage locked down', async () => {
    await assertFails(getDoc(doc(as(PARENT), 'secrets', PARENT)));
    await assertFails(getDoc(doc(as('admin1', { admin: true }), 'secrets', PARENT)));
    await assertSucceeds(getDoc(doc(as(PARENT), 'usage', PARENT, 'months', '2026-10')));
    await assertFails(getDoc(doc(as(STUDENT), 'usage', PARENT, 'months', '2026-10')));
    await assertFails(setDoc(doc(as(PARENT), 'usage', PARENT, 'months', '2026-10'), { tokens: 0 }));
    await assertFails(getDoc(doc(as(PARENT), 'apiTokens', 'anything')));
    await assertFails(setDoc(doc(as(PARENT), 'invites', 'ABCD'), { fromUid: PARENT }));
    await assertFails(setDoc(doc(as(PARENT), 'mail', 'm1'), { to: 'x@example.com' }));
  });
});

describe('storage uploads', () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]);

  it('lets students upload images and PDFs to their own folder', async () => {
    const storage = env.authenticatedContext(STUDENT).storage();
    await assertSucceeds(uploadBytes(ref(storage, `uploads/${STUDENT}/worksheet-1.png`), png, { contentType: 'image/png' }));
    await assertSucceeds(uploadBytes(ref(storage, `uploads/${STUDENT}/notes.pdf`), png, { contentType: 'application/pdf' }));
    await assertFails(uploadBytes(ref(storage, `uploads/${OTHER_STUDENT}/x.png`), png, { contentType: 'image/png' }));
    await assertFails(uploadBytes(ref(storage, `uploads/${STUDENT}/evil.html`), png, { contentType: 'text/html' }));
    await assertFails(uploadBytes(ref(storage, `other/${STUDENT}.png`), png, { contentType: 'image/png' }));
  });

  it('lets linked parents view uploads', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await uploadBytes(ref(ctx.storage(), `uploads/${STUDENT}/photo.png`), png, { contentType: 'image/png' });
    });
    await assertSucceeds(getBytes(ref(env.authenticatedContext(PARENT).storage(), `uploads/${STUDENT}/photo.png`)));
    await assertFails(getBytes(ref(env.authenticatedContext(OTHER_PARENT).storage(), `uploads/${STUDENT}/photo.png`)));
  });
});
