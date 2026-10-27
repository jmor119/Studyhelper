import type { LevelReward } from '@study-helper/shared';
import { logger } from 'firebase-functions';
import { appBaseUrl, db } from './firebase';
import { queueMail } from './mail';
import { getProfile, linkedParents } from './users';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Called after a student levels up. Rewards their parents promised for reaching this level (or an
 * earlier one) are marked earned, and every linked parent gets an email about them.
 */
export async function handleLevelUp(studentUid: string, level: number): Promise<void> {
  try {
    const snap = await db.collection(`students/${studentUid}/levelRewards`).where('status', '==', 'active').get();
    const earned = snap.docs.filter((d) => (d.data() as LevelReward).level <= level);
    if (!earned.length) return;
    const now = Date.now();
    await Promise.all(earned.map((d) => d.ref.update({ status: 'earned', earnedAt: now })));

    const [student, parents] = await Promise.all([getProfile(studentUid), linkedParents(studentUid)]);
    const name = student?.displayName ?? 'Your child';
    const rewards = earned.map((d) => d.data() as LevelReward).sort((a, b) => a.level - b.level);
    const url = `${appBaseUrl()}/parent/child/${studentUid}`;
    const lines = rewards.map((r) => `${r.reward} (Level ${r.level}, from ${r.createdByName})`);
    for (const p of parents) {
      const hi = p.parentName ? `Kia ora ${p.parentName},` : 'Kia ora,';
      await queueMail(p.parentUid, 'level-reward', {
        subject: `${name} reached Level ${level} and earned a reward`,
        text: [
          hi,
          '',
          `${name} just reached Level ${level} on Study Helper and earned:`,
          ...lines.map((l) => `  • ${l}`),
          '',
          `When you've sorted it, mark it as given on ${name}'s page: ${url}`,
        ].join('\n'),
        html: `<div style="font-family:Arial,sans-serif;max-width:520px;color:#1f2937;line-height:1.5">
  <p>${esc(hi)}</p>
  <p><b>${esc(name)}</b> just reached <b>Level ${level}</b> on Study Helper and earned:</p>
  <ul>${lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
  <p style="margin:24px 0"><a href="${esc(url)}" style="background:#0f766e;color:#ffffff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold">Open ${esc(name)}’s page</a></p>
  <p style="color:#6b7280;font-size:13px">When you’ve sorted it, mark it as given there.</p>
</div>`,
      });
    }
  } catch (e) {
    logger.error('level-up rewards failed', { studentUid, level, error: (e as Error).message });
  }
}
