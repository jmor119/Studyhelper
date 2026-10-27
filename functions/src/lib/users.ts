import type { CoParentLink, FamilyLink, Role, UserProfile } from '@study-helper/shared';
import { db } from './firebase';
import { fail } from './http';

export async function getProfile(uid: string): Promise<UserProfile | null> {
  const snap = await db.doc(`users/${uid}`).get();
  return snap.exists ? ({ uid, ...snap.data() } as UserProfile) : null;
}

export async function requireProfile(uid: string, role?: Role): Promise<UserProfile> {
  const profile = await getProfile(uid);
  if (!profile) throw fail.precondition('Finish setting up your account first.');
  if (role && profile.role !== role) {
    throw fail.denied(role === 'parent' ? 'Only parent accounts can do that.' : 'Only student accounts can do that.');
  }
  return profile;
}

export const linkId = (parentUid: string, studentUid: string) => `${parentUid}_${studentUid}`;

export async function isLinked(parentUid: string, studentUid: string): Promise<boolean> {
  return (await db.doc(`links/${linkId(parentUid, studentUid)}`).get()).exists;
}

/**
 * The caller must be the student or a linked parent. Returns how they relate.
 */
export async function requireStudentAccess(callerUid: string, studentUid: string): Promise<'self' | 'parent'> {
  if (callerUid === studentUid) return 'self';
  if (await isLinked(callerUid, studentUid)) return 'parent';
  throw fail.denied();
}

export async function linkedParents(studentUid: string): Promise<FamilyLink[]> {
  const snap = await db.collection('links').where('studentUid', '==', studentUid).get();
  return snap.docs.map((d) => d.data() as FamilyLink);
}

export async function linkedStudents(parentUid: string): Promise<FamilyLink[]> {
  const snap = await db.collection('links').where('parentUid', '==', parentUid).get();
  return snap.docs.map((d) => d.data() as FamilyLink);
}

/** A student can have at most this many linked parents. */
export const MAX_PARENTS = 4;

/** The co-parents of a parent, with the coparents doc id that pairs them. */
export async function coParentsOf(parentUid: string): Promise<{ uid: string; name: string; pair: string }[]> {
  const snap = await db.collection('coparents').where('parents', 'array-contains', parentUid).get();
  return snap.docs.map((d) => {
    const c = d.data() as CoParentLink;
    const uid = c.parents.find((p) => p !== parentUid)!;
    return { uid, name: c.names[uid] ?? 'Co-parent', pair: d.id };
  });
}

/** After a parent gains a child, links that child to the parent's co-parents as well. */
export async function shareWithCoParents(parentUid: string, studentUid: string, studentName: string): Promise<void> {
  const coParents = await coParentsOf(parentUid);
  if (!coParents.length) return;
  const parents = new Set((await linkedParents(studentUid)).map((l) => l.parentUid));
  const now = Date.now();
  for (const cp of coParents) {
    if (parents.has(cp.uid) || parents.size >= MAX_PARENTS) continue;
    parents.add(cp.uid);
    await db
      .doc(`links/${linkId(cp.uid, studentUid)}`)
      .create({
        parentUid: cp.uid,
        studentUid,
        parentName: cp.name,
        studentName,
        createdAt: now,
        createdBy: parentUid,
        coParent: cp.pair,
      } satisfies FamilyLink)
      .catch(() => undefined); // already linked
  }
}

/** Everyone in a student's family (the student plus linked parents). */
export async function familyOf(uid: string, role: Role): Promise<string[]> {
  if (role === 'student') return [uid, ...(await linkedParents(uid)).map((l) => l.parentUid)];
  const kids = (await linkedStudents(uid)).map((l) => l.studentUid);
  return [uid, ...kids];
}
