import { describeUnlocks, levelForXp, pendingEggs, unlocksAtLevel } from '@study-helper/shared';
import { Gift, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../lib/auth';
import { useCharacterCollection, useLevelRewards } from '../../lib/rewards';
import { Button, Modal } from '../ui';
import { EggOpener } from './EggOpener';

const storageKey = (uid: string) => `celebrated-level:${uid}`;

function readSeen(uid: string): number | null {
  try {
    const v = Number(localStorage.getItem(storageKey(uid)));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

function writeSeen(uid: string, level: number) {
  try {
    localStorage.setItem(storageKey(uid), String(level));
  } catch {
    /* storage blocked: we still celebrate within this session */
  }
}

/**
 * Watches the student's level and celebrates each level-up with what it unlocked, any reward their
 * parents promised, and a chance to hatch the new egg straight away.
 */
export function LevelUpCelebration() {
  const { user, stats } = useAuth();
  const uid = user?.uid ?? null;
  const navigate = useNavigate();
  const collection = useCharacterCollection(uid);
  const rewards = useLevelRewards(uid);
  const [shown, setShown] = useState<{ from: number; to: number } | null>(null);
  const [hatching, setHatching] = useState(false);
  const seen = useRef<number | null>(null);
  const level = stats ? levelForXp(stats.xp) : null;

  useEffect(() => {
    if (!uid || level === null) return;
    if (seen.current === null) seen.current = readSeen(uid);
    // First visit on this device: don't replay old level-ups (unopened eggs still show on Home).
    if (seen.current === null) {
      seen.current = level;
      writeSeen(uid, level);
      return;
    }
    if (level > seen.current) {
      const from = seen.current;
      setShown((s) => ({ from: s?.from ?? from, to: level }));
      seen.current = level;
      writeSeen(uid, level);
    }
  }, [uid, level]);

  if (!shown || !uid) return null;
  const levels = Array.from({ length: shown.to - shown.from }, (_, i) => shown.from + 1 + i);
  const unlocked = levels.flatMap((l) => describeUnlocks(unlocksAtLevel(l)));
  const earned = rewards.data.filter((r) => r.level > shown.from && r.level <= shown.to && r.status !== 'given');
  const eggs = pendingEggs(shown.to, collection.data?.characters ?? []);
  const close = () => {
    setShown(null);
    setHatching(false);
  };

  return (
    <Modal open onClose={close} title={hatching ? 'Hatch your egg' : `Level ${shown.to}!`}>
      {hatching ? (
        <EggOpener eggs={eggs} onDone={close} />
      ) : (
        <div className="text-center">
          <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
            <Sparkles className="size-10 text-xp" aria-hidden="true" />
          </div>
          <p className="mt-3 text-lg font-extrabold">You reached Level {shown.to}!</p>
          {unlocked.length > 0 && (
            <>
              <p className="mt-3 text-sm font-semibold text-muted">You unlocked</p>
              <ul className="mt-1 grid grid-cols-1 gap-1">
                {unlocked.map((u) => (
                  <li key={u} className="font-semibold">
                    {u.charAt(0).toUpperCase() + u.slice(1)}
                  </li>
                ))}
              </ul>
            </>
          )}
          {earned.map((r) => (
            <div key={r.id} className="mt-4 flex items-start gap-3 rounded-xl bg-amber-50 p-3 text-left dark:bg-amber-950/40">
              <Gift className="mt-0.5 size-5 shrink-0 text-xp" aria-hidden="true" />
              <p className="text-sm">
                <b>You earned a reward from {r.createdByName}:</b> {r.reward}
              </p>
            </div>
          ))}
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {eggs.length > 0 && <Button onClick={() => setHatching(true)}>Hatch your egg</Button>}
            <Button
              variant="secondary"
              onClick={() => {
                close();
                navigate('/collection');
              }}
            >
              See my collection
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
