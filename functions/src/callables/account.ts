import { emptyStats, ROLES, type UserProfile } from '@study-helper/shared';
import { onCall } from 'firebase-functions/https';
import { z } from 'zod';
import { auth, bucket, CHILD_EMAIL_DOMAIN, db } from '../lib/firebase';
import { fail, HttpsError, parseInput, requireAuth } from '../lib/http';
import { rateLimit } from '../lib/ratelimit';
import { getProfile, isLinked, linkId, linkedParents, linkedStudents, requireProfile } from '../lib/users';

const DisplayName = z.string().trim().min(1).max(60);
const YearLevel = z.number().int().min(1).max(13);
const Username = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9._-]{2,23}$/, '3–24 letters, numbers, dots, dashes or underscores');
const Password = z.string().min(8, 'at least 8 characters').max(128);

export const usernameEmail = (username: string) => `${username}@${CHILD_EMAIL_DOMAIN}`;

// ---------------------------------------------------------------------------------------------

export const completeOnboarding = onCall(async (req) => {
  const uid = requireAuth(req);
  const input = parseInput(
    z.object({ role: z.enum(ROLES), displayName: DisplayName, yearLevel: YearLevel.optional() }),
    req.data,
  );
  if (input.role === 'student' && !input.yearLevel) throw fail.invalid('Choose your year level.');

  const userRef = db.doc(`users/${uid}`);
  return db.runTransaction(async (tx) => {
    const existing = await tx.get(userRef);
    if (existing.exists) {
      const profile = existing.data() as UserProfile;
      if (profile.role !== input.role) {
        throw fail.precondition(`This account is already set up as a ${profile.role}.`);
      }
      return { uid, role: profile.role, created: false };
    }
    const now = Date.now();
    const profile: Omit<UserProfile, 'uid'> = {
      role: input.role,
      displayName: input.displayName,
      createdAt: now,
      prefs: input.role === 'parent' ? { weeklyEmail: true, shareAiKey: true } : { dailyGoal: 20, subjects: ['maths', 'science'] },
      ...(input.role === 'student' && { yearLevel: input.yearLevel }),
    };
    tx.set(userRef, profile);
    if (input.role === 'student') tx.set(db.doc(`students/${uid}`), emptyStats(now));
    return { uid, role: input.role, created: true };
  });
});

// ---------------------------------------------------------------------------------------------

export const checkUsername = onCall(async (req) => {
  const uid = requireAuth(req);
  await rateLimit(`username:${uid}`, 60, 3600);
  const { username } = parseInput(z.object({ username: Username }), req.data);
  const snap = await db.doc(`usernames/${username}`).get();
  return { username, available: !snap.exists };
});

export const createChildAccount = onCall(async (req) => {
  const parentUid = requireAuth(req);
  const parent = await requireProfile(parentUid, 'parent');
  await rateLimit(`child-create:${parentUid}`, 10, 3600, "You've created a lot of accounts — try again later.");
  const input = parseInput(
    z.object({ displayName: DisplayName, username: Username, password: Password, yearLevel: YearLevel }),
    req.data,
  );
  if ((await linkedStudents(parentUid)).length >= 12) throw fail.precondition('You can link up to 12 children.');

  // Reserve the username first so two parents can't race for it.
  const nameRef = db.doc(`usernames/${input.username}`);
  await db.runTransaction(async (tx) => {
    if ((await tx.get(nameRef)).exists) throw new HttpsError('already-exists', 'That username is taken.');
    tx.set(nameRef, { uid: null, reservedBy: parentUid, createdAt: Date.now() });
  });

  let childUid: string;
  try {
    const user = await auth.createUser({
      email: usernameEmail(input.username),
      emailVerified: false,
      password: input.password,
      displayName: input.displayName,
    });
    childUid = user.uid;
  } catch (e) {
    await nameRef.delete();
    const code = (e as { code?: string }).code;
    if (code === 'auth/email-already-exists') throw new HttpsError('already-exists', 'That username is taken.');
    if (code === 'auth/invalid-password') throw fail.invalid('That password is too weak.');
    throw e;
  }

  const now = Date.now();
  const batch = db.batch();
  batch.set(nameRef, { uid: childUid, reservedBy: parentUid, createdAt: now });
  batch.set(db.doc(`users/${childUid}`), {
    role: 'student',
    displayName: input.displayName,
    yearLevel: input.yearLevel,
    username: input.username,
    managedBy: parentUid,
    createdAt: now,
    prefs: { dailyGoal: 20, subjects: ['maths', 'science'] },
  } satisfies Omit<UserProfile, 'uid'>);
  batch.set(db.doc(`students/${childUid}`), emptyStats(now));
  batch.set(db.doc(`links/${linkId(parentUid, childUid)}`), {
    parentUid,
    studentUid: childUid,
    parentName: parent.displayName,
    studentName: input.displayName,
    createdAt: now,
    createdBy: parentUid,
  });
  await batch.commit();
  return { uid: childUid, username: input.username };
});

export const resetChildPassword = onCall(async (req) => {
  const parentUid = requireAuth(req);
  await requireProfile(parentUid, 'parent');
  await rateLimit(`child-reset:${parentUid}`, 20, 3600);
  const input = parseInput(z.object({ childUid: z.string().min(1), password: Password }), req.data);
  if (!(await isLinked(parentUid, input.childUid))) throw fail.denied();
  const child = await getProfile(input.childUid);
  // Parents can only reset username accounts; students with their own email/Google manage their own.
  if (!child?.username) throw fail.precondition('This child signs in with their own email or Google account.');
  await auth.updateUser(input.childUid, { password: input.password });
  await auth.revokeRefreshTokens(input.childUid);
  return { ok: true };
});

/** Year level changes every year; the student or a linked parent can update it. */
export const setYearLevel = onCall(async (req) => {
  const callerUid = requireAuth(req);
  const input = parseInput(z.object({ studentUid: z.string().min(1), yearLevel: YearLevel }), req.data);
  if (callerUid !== input.studentUid && !(await isLinked(callerUid, input.studentUid))) throw fail.denied();
  const profile = await requireProfile(input.studentUid, 'student');
  await db.doc(`users/${profile.uid}`).update({ yearLevel: input.yearLevel });
  return { ok: true };
});

export const renameChild = onCall(async (req) => {
  const parentUid = requireAuth(req);
  const input = parseInput(z.object({ childUid: z.string().min(1), displayName: DisplayName }), req.data);
  if (!(await isLinked(parentUid, input.childUid))) throw fail.denied();
  await db.doc(`users/${input.childUid}`).update({ displayName: input.displayName });
  const links = await db.collection('links').where('studentUid', '==', input.childUid).get();
  await Promise.all(links.docs.map((d) => d.ref.update({ studentName: input.displayName })));
  return { ok: true };
});

// ---------------------------------------------------------------------------------------------
// Privacy: export and deletion (NZ Privacy Act 2020 — access and correction rights).

async function deleteStudentData(uid: string) {
  await db.recursiveDelete(db.doc(`students/${uid}`));
  const links = await db.collection('links').where('studentUid', '==', uid).get();
  await Promise.all(links.docs.map((d) => d.ref.delete()));
  try {
    await bucket().deleteFiles({ prefix: `uploads/${uid}/` });
  } catch {
    // Storage may be empty or unavailable in the emulator.
  }
}

async function deleteCommon(uid: string, username?: string) {
  await db.recursiveDelete(db.doc(`users/${uid}`));
  await db.recursiveDelete(db.doc(`usage/${uid}`));
  await db.doc(`secrets/${uid}`).delete();
  const tokens = await db.collection('apiTokens').where('uid', '==', uid).get();
  await Promise.all(tokens.docs.map((d) => d.ref.delete()));
  const oauth = await db.collection('oauthTokens').where('uid', '==', uid).get();
  await Promise.all(oauth.docs.map((d) => d.ref.delete()));
  if (username) await db.doc(`usernames/${username}`).delete();
  await auth.deleteUser(uid).catch(() => undefined);
}

export const deleteChildAccount = onCall(async (req) => {
  const parentUid = requireAuth(req);
  const { childUid } = parseInput(z.object({ childUid: z.string().min(1) }), req.data);
  const child = await requireProfile(childUid, 'student');
  if (child.managedBy !== parentUid) throw fail.denied('Only the parent who created this account can delete it.');
  await deleteStudentData(childUid);
  await deleteCommon(childUid, child.username);
  return { ok: true };
});

export const deleteMyAccount = onCall(async (req) => {
  const uid = requireAuth(req);
  const profile = await getProfile(uid);
  if (profile?.role === 'parent') {
    const managed = await db.collection('users').where('managedBy', '==', uid).limit(1).get();
    if (!managed.empty) {
      throw fail.precondition('Delete the child accounts you created first (Family → child → Delete account).');
    }
    const links = await db.collection('links').where('parentUid', '==', uid).get();
    await Promise.all(links.docs.map((d) => d.ref.delete()));
  } else if (profile?.role === 'student') {
    await deleteStudentData(uid);
  }
  await deleteCommon(uid, profile?.username);
  return { ok: true };
});

export const exportMyData = onCall(async (req) => {
  const uid = requireAuth(req);
  await rateLimit(`export:${uid}`, 5, 3600);
  const profile = await getProfile(uid);
  const out: Record<string, unknown> = { exportedAt: new Date().toISOString(), profile };
  out.links = profile?.role === 'student' ? await linkedParents(uid) : await linkedStudents(uid);
  if (profile?.role === 'student') {
    const studentRef = db.doc(`students/${uid}`);
    out.stats = (await studentRef.get()).data();
    for (const sub of ['mastery', 'exams', 'goals', 'plans', 'cards', 'settings', 'uploads', 'noteSets']) {
      out[sub] = (await studentRef.collection(sub).limit(2000).get()).docs.map((d) => ({ id: d.id, ...d.data() }));
    }
    out.attempts = (await studentRef.collection('attempts').orderBy('createdAt', 'desc').limit(5000).get()).docs.map((d) => d.data());
    const chats = await studentRef.collection('chats').limit(500).get();
    out.chats = await Promise.all(
      chats.docs.map(async (c) => ({
        id: c.id,
        ...c.data(),
        messages: (await c.ref.collection('messages').orderBy('createdAt').get()).docs.map((m) => m.data()),
      })),
    );
  }
  const ai = await db.doc(`users/${uid}/private/ai`).get();
  if (ai.exists) out.aiSettings = ai.data();
  return out;
});
