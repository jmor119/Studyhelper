import { CHARACTERS, LEVEL_REWARD_MAX_LENGTH, levelForXp, xpForLevel, type StudentStats } from '@study-helper/shared';
import clsx from 'clsx';
import { addDoc, collection, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Check, Gift, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { errorMessage } from '../../lib/api';
import { useUser } from '../../lib/auth';
import { db } from '../../lib/firebase';
import { useCharacterCollection, useLevelRewards } from '../../lib/rewards';
import { CharacterImage, characterName } from '../rewards/ProfilePicture';
import { Button, Card, Field, Input, Notice, Select, Spinner, useToast } from '../ui';
import { CardTitle } from './bits';

/** Parents promise a reward for reaching a level ("Level 10 = pick the movie"). */
export function LevelRewardsCard({ uid, name, stats }: { uid: string; name: string; stats: StudentStats | null }) {
  const { user, profile } = useUser();
  const toast = useToast();
  const rewards = useLevelRewards(uid);
  const level = levelForXp(stats?.xp ?? 0);
  const xp = stats?.xp ?? 0;
  const [target, setTarget] = useState(String(Math.max(2, level + 2)));
  const [reward, setReward] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const levels = Array.from({ length: 30 }, (_, i) => level + 1 + i);
  const add = async (e: FormEvent) => {
    e.preventDefault();
    const text = reward.trim();
    if (!text) return setError('Describe the reward, e.g. “Pick the movie on Friday”.');
    setBusy(true);
    setError('');
    try {
      // Only these keys are allowed by the security rules; the server marks it earned.
      await addDoc(collection(db, 'students', uid, 'levelRewards'), {
        level: Number(target),
        reward: text,
        createdBy: user.uid,
        createdByName: profile.displayName,
        createdAt: Date.now(),
        status: 'active',
      });
      toast(`Reward set for Level ${target}`, 'good');
      setReward('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const markGiven = async (id: string) => {
    try {
      await updateDoc(doc(db, 'students', uid, 'levelRewards', id), { status: 'given', givenAt: Date.now() });
      toast('Marked as given', 'good');
    } catch (err) {
      toast(errorMessage(err), 'bad');
    }
  };
  const remove = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'students', uid, 'levelRewards', id));
      toast('Reward removed', 'neutral');
    } catch (err) {
      toast(errorMessage(err), 'bad');
    }
  };

  return (
    <Card as="section">
      <CardTitle icon={<Gift className="size-5 text-brand-700 dark:text-brand-300" aria-hidden="true" />}>Level rewards</CardTitle>
      <p className="mt-1 text-sm text-muted">
        {name} is on Level {level}. Promise something for reaching a level — they’ll see it on their home screen, and you’ll get an email when they earn it.
      </p>

      {rewards.loading ? (
        <Spinner className="py-3" />
      ) : rewards.data.length > 0 ? (
        <ul className="mt-3 grid grid-cols-1 gap-2">
          {rewards.data.map((r) => {
            const earned = level >= r.level;
            return (
              <li
                key={r.id}
                className={clsx(
                  'flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border px-3 py-2',
                  earned && r.status !== 'given' ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30' : 'border-line',
                )}
              >
                <span className="w-16 shrink-0 text-sm font-bold">Level {r.level}</span>
                <span className="min-w-0 flex-1">
                  <span className="font-semibold break-words">{r.reward}</span>
                  <span className="block text-xs text-muted">
                    Set by {r.createdByName} ·{' '}
                    {r.status === 'given' ? 'given' : earned ? 'earned — time to deliver!' : `${(xpForLevel(r.level) - xp).toLocaleString('en-NZ')} XP to go`}
                  </span>
                </span>
                <span className="flex gap-1">
                  {earned && r.status !== 'given' && (
                    <Button size="sm" onClick={() => markGiven(r.id)} icon={<Check className="size-4" />}>
                      Mark given
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => remove(r.id)} aria-label={`Remove the Level ${r.level} reward`}>
                    <Trash2 className="size-4" />
                  </Button>
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}

      <form onSubmit={add} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[8rem_minmax(0,1fr)_auto] sm:items-end">
        <Field label="At level">
          <Select value={target} onChange={(e) => setTarget(e.target.value)}>
            {levels.map((l) => (
              <option key={l} value={l}>
                Level {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="What they get">
          <Input value={reward} onChange={(e) => setReward(e.target.value)} maxLength={LEVEL_REWARD_MAX_LENGTH} placeholder="e.g. Pick the movie on Friday" />
        </Field>
        <Button type="submit" loading={busy}>
          Add reward
        </Button>
      </form>
      <p className="mt-1.5 text-xs text-muted">
        Level {Number(target)} is {Math.max(0, xpForLevel(Number(target)) - xp).toLocaleString('en-NZ')} XP away — roughly{' '}
        {Math.ceil(Math.max(0, xpForLevel(Number(target)) - xp) / 12)} correct answers.
      </p>
      {error && (
        <Notice tone="bad" className="mt-3">
          {error}
        </Notice>
      )}
    </Card>
  );
}

/** What the child has hatched so far. */
export function CollectionCard({ uid, name }: { uid: string; name: string }) {
  const collection = useCharacterCollection(uid);
  const owned = collection.data?.characters ?? [];
  const creatures = owned.filter((o) => !o.id.startsWith('robot-')).length;
  return (
    <Card as="section">
      <CardTitle>{name}’s collection</CardTitle>
      <p className="mt-1 text-sm text-muted">
        {creatures} of {CHARACTERS.length} NZ creatures
        {owned.length > creatures && ` and ${owned.length - creatures} one-of-a-kind robot${owned.length - creatures === 1 ? '' : 's'}`}. They hatch a new one
        each level.
      </p>
      {owned.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {[...owned].reverse().map((o) => (
            <li key={o.id} title={characterName(o.id)}>
              <CharacterImage id={o.id} className="size-12" />
              <span className="sr-only">{characterName(o.id)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
