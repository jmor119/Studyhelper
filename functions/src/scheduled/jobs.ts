import { getTopic, masteryLevel, nzDateKey, weekStart, type MasteryRecord, type StudentStats } from '@study-helper/shared';
import { logger } from 'firebase-functions';
import { onSchedule } from 'firebase-functions/scheduler';
import { appBaseUrl, auth, db } from '../lib/firebase';
import { linkedStudents } from '../lib/users';

const TZ = 'Pacific/Auckland';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function childSection(studentUid: string, name: string): Promise<{ html: string; text: string }> {
  const stats = ((await db.doc(`students/${studentUid}`).get()).data() ?? {}) as Partial<StudentStats>;
  const thisWeek = weekStart(nzDateKey());
  const current = stats.weekStart === thisWeek;
  const answered = current ? (stats.weekAnswered ?? 0) : 0;
  const correct = current ? (stats.weekCorrect ?? 0) : 0;
  const minutes = current ? Math.round(stats.weekMinutes ?? 0) : 0;
  const mastery = (await db.collection(`students/${studentUid}/mastery`).get()).docs.map((d) => d.data() as MasteryRecord);
  const weekAgo = Date.now() - 7 * 86_400_000;
  const practised = mastery.filter((m) => m.lastPracticedAt >= weekAgo).sort((a, b) => b.mastery - a.mastery);
  const weakest = [...mastery].sort((a, b) => a.mastery - b.mastery).slice(0, 3);
  const exams = await db.collection(`students/${studentUid}/exams`).where('startedAt', '>=', weekAgo).get();
  const examLines = exams.docs
    .map((d) => d.data())
    .filter((e) => e.status === 'submitted')
    .map((e) => `${e.title}: ${e.summary?.percent ?? '?'}% (${e.summary?.grade?.grade ?? ''})`);
  const accuracy = answered ? Math.round((correct / answered) * 100) : 0;

  const topicLine = (m: MasteryRecord) => `${getTopic(m.topicId)?.title ?? m.topicId} — ${masteryLevel(m.mastery, m.attempts).label}`;
  const text = [
    `${name}`,
    `  Questions answered: ${answered} (${accuracy}% correct), about ${minutes} minutes, ${stats.streak ?? 0}-day streak`,
    practised.length ? `  Practised: ${practised.slice(0, 5).map(topicLine).join('; ')}` : '  No topics practised this week.',
    weakest.length ? `  Worth some attention: ${weakest.map(topicLine).join('; ')}` : '',
    examLines.length ? `  Mock exams: ${examLines.join('; ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  const html = `
    <h2 style="margin:24px 0 8px;font-size:18px">${esc(name)}</h2>
    <p style="margin:0 0 8px">${answered} questions answered (${accuracy}% correct) · about ${minutes} min · ${stats.streak ?? 0}-day streak</p>
    ${practised.length ? `<p style="margin:0 0 8px"><b>Practised:</b> ${practised.slice(0, 5).map((m) => esc(topicLine(m))).join(' · ')}</p>` : '<p style="margin:0 0 8px">No topics practised this week.</p>'}
    ${weakest.length ? `<p style="margin:0 0 8px"><b>Worth some attention:</b> ${weakest.map((m) => esc(topicLine(m))).join(' · ')}</p>` : ''}
    ${examLines.length ? `<p style="margin:0 0 8px"><b>Mock exams:</b> ${examLines.map(esc).join(' · ')}</p>` : ''}`;
  return { html, text };
}

/** Sunday-evening summary email for parents (sent via the Firebase "Trigger Email" extension's mail collection). */
export const weeklySummary = onSchedule({ schedule: 'every sunday 18:00', timeZone: TZ }, async () => {
  const parents = await db.collection('users').where('role', '==', 'parent').get();
  let sent = 0;
  for (const p of parents.docs) {
    const profile = p.data();
    if (profile.prefs?.weeklyEmail === false) continue;
    const children = await linkedStudents(p.id);
    if (!children.length) continue;
    const user = await auth.getUser(p.id).catch(() => null);
    if (!user?.email || !user.emailVerified) continue;
    const sections = await Promise.all(children.map((c) => childSection(c.studentUid, c.studentName)));
    const link = `${appBaseUrl()}/parent`;
    await db.collection('mail').add({
      to: [user.email],
      message: {
        subject: `Study Helper — your weekly summary`,
        text: `Kia ora ${profile.displayName},\n\nHere's how this week went:\n\n${sections.map((s) => s.text).join('\n\n')}\n\nSee more: ${link}\n\nTurn these emails off in Settings.`,
        html: `<div style="font-family:Arial,sans-serif;max-width:560px;color:#1f2937">
          <p>Kia ora ${esc(profile.displayName)},</p><p>Here's how this week went:</p>
          ${sections.map((s) => s.html).join('')}
          <p style="margin-top:24px"><a href="${link}" style="color:#2563eb">Open the parent dashboard</a></p>
          <p style="color:#6b7280;font-size:12px">You can turn these emails off in Settings.</p></div>`,
      },
      createdAt: Date.now(),
    });
    sent++;
  }
  logger.info('weekly summaries queued', { sent });
});

/**
 * Promotes AI-generated questions to "verified" once real students have answered them consistently
 * with no reports. Questions everyone gets wrong (likely a bad key) or that are trivially easy stay
 * unverified for an admin to look at.
 */
export const promoteQuestions = onSchedule({ schedule: 'every day 03:00', timeZone: TZ }, async () => {
  const snap = await db.collection('bank').where('status', '==', 'unverified').limit(1000).get();
  let promoted = 0;
  for (const doc of snap.docs) {
    const s = doc.data().stats as { attempts: number; correct: number; flags: number } | undefined;
    if (!s || s.attempts < 8 || s.flags > 0) continue;
    const rate = s.correct / s.attempts;
    if (rate < 0.15 || rate > 0.98) continue;
    await Promise.all([doc.ref.update({ status: 'verified' }), db.doc(`bankAnswers/${doc.id}`).update({ status: 'verified', promotedAt: Date.now() })]);
    promoted++;
  }
  logger.info('questions promoted', { promoted });
});

/** Removes expired invites, OAuth state and rate-limit windows. */
export const cleanup = onSchedule({ schedule: 'every day 04:00', timeZone: TZ }, async () => {
  const now = Date.now();
  const expired = async (collection: string) => {
    const snap = await db.collection(collection).where('expiresAt', '<', now).limit(500).get();
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
    return snap.size;
  };
  const counts = {
    invites: await expired('invites'),
    oauthRequests: await expired('oauthRequests'),
    oauthCodes: await expired('oauthCodes'),
    oauthTokens: await expired('oauthTokens'),
    rateLimits: await expired('rateLimits'),
  };
  logger.info('cleanup', counts);
});
