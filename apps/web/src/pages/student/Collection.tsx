import {
  BADGES,
  CHARACTERS,
  describeUnlocks,
  FRAMES,
  getCharacter,
  getTitle,
  isRobotId,
  isUnlocked,
  levelForXp,
  PALETTES,
  pendingEggs,
  rarityOf,
  TITLES,
  unlockHint,
  unlocksAtLevel,
  xpForLevel,
  type UnlockDef,
} from '@study-helper/shared';
import clsx from 'clsx';
import { Check, Gift, Lock, Sparkles } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { EggOpener } from '../../components/rewards/EggOpener';
import { CharacterImage, characterName, ProfilePicture, RarityBadge } from '../../components/rewards/ProfilePicture';
import { Button, Card, Modal, PageHeader, ProgressBar, Spinner, Tabs, useToast } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { useUser } from '../../lib/auth';
import { useCharacterCollection, useLevelRewards } from '../../lib/rewards';

type Tab = 'characters' | 'frames' | 'themes' | 'titles';

const badgeTitle = (id: string) => BADGES.find((b) => b.id === id)?.title;

/** The next level (after `level`) that unlocks something, and what it unlocks. */
function nextUnlock(level: number) {
  const u = unlocksAtLevel(level + 1);
  return { level: level + 1, items: describeUnlocks(u) };
}

function useLook() {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const set = async (key: string, change: Parameters<typeof api.setLook>[0], message: string) => {
    setBusy(key);
    try {
      await api.setLook(change);
      toast(message, 'good');
    } catch (e) {
      toast(errorMessage(e), 'bad');
    } finally {
      setBusy(null);
    }
  };
  return { busy, set };
}

function LockedNote({ def }: { def: UnlockDef }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted">
      <Lock className="size-3" aria-hidden="true" /> {unlockHint(def, badgeTitle)}
    </span>
  );
}

export default function Collection() {
  const { user, profile, stats } = useUser();
  const collection = useCharacterCollection(user.uid);
  const rewards = useLevelRewards(user.uid);
  const look = useLook();
  const [tab, setTab] = useState<Tab>('characters');
  const [selected, setSelected] = useState<string | null>(null);

  const level = levelForXp(stats?.xp ?? 0);
  const badges = stats?.badges ?? [];
  const owned = collection.data?.characters ?? [];
  const ownedIds = new Set(owned.map((o) => o.id));
  const robots = owned.filter((o) => isRobotId(o.id));
  const eggs = pendingEggs(level, owned);
  const creatures = owned.filter((o) => !isRobotId(o.id)).length;
  const next = nextUnlock(level);
  const titleName = profile.title ? getTitle(profile.title)?.name : undefined;

  if (collection.loading) return <Spinner label="Loading your collection" />;

  const sel = selected ? { id: selected, def: getCharacter(selected), rarity: rarityOf(selected) ?? 'common' } : null;

  return (
    <div>
      <PageHeader title="My collection" subtitle="Level up to hatch mystery eggs and unlock frames, colour themes and titles." />

      <Card className="mb-5 flex flex-wrap items-center gap-5">
        <ProfilePicture name={profile.displayName} avatar={profile.avatar} frame={profile.frame} size="xl" />
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-extrabold break-words">{profile.displayName}</p>
          {titleName && <p className="font-semibold text-brand-700 dark:text-brand-300">{titleName}</p>}
          <p className="mt-1 text-sm text-muted">
            Level {level} · {creatures} of {CHARACTERS.length} creatures{robots.length > 0 && ` · ${robots.length} robot${robots.length === 1 ? '' : 's'}`}
          </p>
          <ProgressBar className="mt-2 max-w-sm" value={creatures} max={CHARACTERS.length} />
          {next.items.length > 0 && (
            <p className="mt-2 text-sm">
              <Sparkles className="mr-1 inline size-4 text-xp" aria-hidden="true" />
              <b>Level {next.level}:</b> {next.items.join(', ')}
            </p>
          )}
        </div>
      </Card>

      {eggs.length > 0 && (
        <Card as="section" className="mb-5 border-2 border-amber-300 bg-amber-50/60 dark:border-amber-700 dark:bg-amber-950/20">
          <h2 className="mb-4 text-center text-lg font-extrabold">
            {eggs.length === 1 ? 'You’ve got an egg to hatch!' : `You’ve got ${eggs.length} eggs to hatch!`}
          </h2>
          <EggOpener eggs={eggs} />
        </Card>
      )}

      {rewards.data.length > 0 && (
        <Card as="section" className="mb-5">
          <h2 className="flex items-center gap-2 font-bold">
            <Gift className="size-5 text-brand-700 dark:text-brand-300" aria-hidden="true" /> Rewards from your family
          </h2>
          <ul className="mt-3 grid grid-cols-1 gap-2">
            {rewards.data.map((r) => {
              const earned = level >= r.level;
              return (
                <li
                  key={r.id}
                  className={clsx(
                    'flex items-center gap-3 rounded-xl border px-3 py-2',
                    earned ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30' : 'border-line',
                  )}
                >
                  <span className="w-16 shrink-0 text-sm font-bold">Level {r.level}</span>
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold break-words">{r.reward}</span>
                    <span className="block text-xs text-muted">from {r.createdByName}</span>
                  </span>
                  <span className="text-xs font-semibold">
                    {r.status === 'given' ? '✅ Given' : earned ? '🎉 Earned!' : `${(xpForLevel(r.level) - (stats?.xp ?? 0)).toLocaleString('en-NZ')} XP to go`}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <nav className="mb-4" aria-label="Collection sections">
        <Tabs
          value={tab}
          onChange={setTab}
          options={[
            { value: 'characters', label: 'Characters' },
            { value: 'frames', label: 'Frames' },
            { value: 'themes', label: 'Colour themes' },
            { value: 'titles', label: 'Titles' },
          ]}
        />
      </nav>

      {tab === 'characters' && (
        <div className="grid grid-cols-1 gap-5">
          {robots.length > 0 && (
            <section aria-labelledby="robots-heading">
              <h2 id="robots-heading" className="mb-2 font-bold">
                Your robots <span className="font-normal text-muted">— one of a kind</span>
              </h2>
              <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-6">
                {robots.map((r) => (
                  <CharacterTile key={r.id} id={r.id} owned equipped={profile.avatar === r.id} onClick={() => setSelected(r.id)} />
                ))}
              </ul>
            </section>
          )}
          <section aria-labelledby="crew-heading">
            <h2 id="crew-heading" className="mb-2 font-bold">
              The NZ crew{' '}
              <span className="font-normal text-muted">
                ({creatures}/{CHARACTERS.length})
              </span>
            </h2>
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-6">
              {CHARACTERS.map((c) => (
                <CharacterTile
                  key={c.id}
                  id={c.id}
                  owned={ownedIds.has(c.id)}
                  equipped={profile.avatar === c.id}
                  onClick={() => ownedIds.has(c.id) && setSelected(c.id)}
                />
              ))}
            </ul>
            <p className="mt-3 text-sm text-muted">Every level gives you an egg. Every 5th level, it’s a robot egg with a robot made just for you.</p>
          </section>
        </div>
      )}

      {tab === 'frames' && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <LookTile
            label="No frame"
            active={!profile.frame}
            unlocked
            busy={look.busy === 'frame:none'}
            onPick={() => look.set('frame:none', { frame: null }, 'Frame removed')}
            preview={<ProfilePicture name={profile.displayName} avatar={profile.avatar} size="lg" />}
          />
          {FRAMES.map((f) => (
            <LookTile
              key={f.id}
              label={f.name}
              active={profile.frame === f.id}
              unlocked={isUnlocked(f, level, badges)}
              locked={<LockedNote def={f} />}
              busy={look.busy === `frame:${f.id}`}
              onPick={() => look.set(`frame:${f.id}`, { frame: f.id }, `${f.name} frame on!`)}
              preview={<ProfilePicture name={profile.displayName} avatar={profile.avatar} frame={f.id} size="lg" />}
            />
          ))}
        </ul>
      )}

      {tab === 'themes' && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <LookTile
            label="Teal (standard)"
            active={!profile.palette}
            unlocked
            busy={look.busy === 'palette:none'}
            onPick={() => look.set('palette:none', { palette: null }, 'Back to teal')}
            preview={<span className="block size-16 rounded-full bg-[#14b8a6]" />}
          />
          {PALETTES.map((p) => (
            <LookTile
              key={p.id}
              label={p.name}
              active={profile.palette === p.id}
              unlocked={isUnlocked(p, level, badges)}
              locked={<LockedNote def={p} />}
              busy={look.busy === `palette:${p.id}`}
              onPick={() => look.set(`palette:${p.id}`, { palette: p.id }, `${p.name} theme on!`)}
              preview={<span className="block size-16 rounded-full" style={{ background: p.swatch }} />}
            />
          ))}
        </ul>
      )}

      {tab === 'titles' && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <LookTile
            label="No title"
            active={!profile.title}
            unlocked
            busy={look.busy === 'title:none'}
            onPick={() => look.set('title:none', { title: null }, 'Title removed')}
          />
          {TITLES.map((t) => (
            <LookTile
              key={t.id}
              label={t.name}
              active={profile.title === t.id}
              unlocked={isUnlocked(t, level, badges)}
              locked={<LockedNote def={t} />}
              busy={look.busy === `title:${t.id}`}
              onPick={() => look.set(`title:${t.id}`, { title: t.id }, `You’re now a ${t.name}!`)}
            />
          ))}
        </ul>
      )}

      <Modal
        open={!!sel}
        onClose={() => setSelected(null)}
        title={sel ? characterName(sel.id) : ''}
        footer={
          sel && (
            <>
              <Button variant="secondary" onClick={() => setSelected(null)}>
                Close
              </Button>
              {profile.avatar === sel.id ? (
                <Button disabled icon={<Check className="size-4" />}>
                  Your picture
                </Button>
              ) : (
                <Button
                  loading={look.busy === 'avatar'}
                  onClick={async () => {
                    await look.set('avatar', { avatar: sel.id }, `${characterName(sel.id)} is your new profile picture`);
                    setSelected(null);
                  }}
                >
                  Make it my picture
                </Button>
              )}
            </>
          )
        }
      >
        {sel && (
          <div className="flex flex-col items-center text-center">
            <CharacterImage id={sel.id} className="size-40" />
            <RarityBadge rarity={sel.rarity} className="mt-3" />
            <p className="mt-3 text-sm">{sel.def ? sel.def.fact : 'A robot built just for you — nobody else has this one.'}</p>
            <p className="mt-2 text-xs text-muted">Hatched at Level {owned.find((o) => o.id === sel.id)?.level}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}

function CharacterTile({ id, owned, equipped, onClick }: { id: string; owned: boolean; equipped: boolean; onClick: () => void }) {
  const rarity = rarityOf(id) ?? 'common';
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        disabled={!owned}
        className={clsx(
          'flex w-full flex-col items-center gap-1.5 rounded-2xl border bg-surface p-2 text-center transition-shadow',
          owned ? 'border-line hover:shadow-md' : 'cursor-default border-dashed border-line',
          equipped && 'ring-2 ring-brand-500',
        )}
      >
        <CharacterImage id={id} silhouette={!owned} className="aspect-square w-full max-w-24" />
        <span className={clsx('w-full truncate text-xs font-bold', !owned && 'text-muted')}>{owned ? characterName(id) : '???'}</span>
        <RarityBadge rarity={rarity} className="!px-2 !text-[10px]" />
      </button>
    </li>
  );
}

function LookTile({
  label,
  active,
  unlocked,
  locked,
  busy,
  onPick,
  preview,
}: {
  label: string;
  active: boolean;
  unlocked: boolean;
  locked?: ReactNode;
  busy: boolean;
  onPick: () => void;
  preview?: ReactNode;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onPick}
        disabled={!unlocked || active || busy}
        aria-pressed={active}
        className={clsx(
          'flex h-full w-full flex-col items-center gap-2 rounded-2xl border bg-surface p-3 text-center transition-shadow',
          active ? 'border-brand-500 ring-2 ring-brand-500' : 'border-line',
          unlocked && !active && 'hover:shadow-md',
          !unlocked && 'cursor-default opacity-80',
        )}
      >
        {preview}
        <span className="font-bold">{label}</span>
        {active ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-good">
            <Check className="size-3" aria-hidden="true" /> On
          </span>
        ) : unlocked ? (
          <span className="text-xs font-semibold text-brand-700 dark:text-brand-300">{busy ? 'Saving…' : 'Use this'}</span>
        ) : (
          locked
        )}
      </button>
    </li>
  );
}
