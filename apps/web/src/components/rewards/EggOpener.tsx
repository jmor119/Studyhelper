import { getCharacter, rarityOf, type EggKind } from '@study-helper/shared/rewards';
import clsx from 'clsx';
import { useState } from 'react';
import { api, errorMessage } from '../../lib/api';
import { Button, Notice, useToast } from '../ui';
import { CharacterImage, characterName, RarityBadge } from './ProfilePicture';

type OpenResult = Awaited<ReturnType<typeof api.openEgg>>;
type Phase = 'ready' | 'shaking' | 'cracking' | 'revealed';

const RAY_COLOURS = { common: '#94a3b8', rare: '#38bdf8', epic: '#a78bfa', legendary: '#facc15', unique: '#34d399' } as const;
const CONFETTI = ['#f43f5e', '#f59e0b', '#22c55e', '#0ea5e9', '#a855f7', '#facc15'];

/** A mystery egg: speckled for the NZ crew, a metal capsule for robots. */
export function EggGraphic({ kind, className }: { kind: EggKind; className?: string }) {
  const shell = 'M60 6C92 6 112 60 112 92c0 34-24 54-52 54S8 126 8 92C8 60 28 6 60 6z';
  if (kind === 'robot') {
    return (
      <svg viewBox="0 0 120 150" className={className} aria-hidden="true">
        <defs>
          <linearGradient id="egg-metal" x1="0" x2="1">
            <stop offset="0" stopColor="#94a3b8" />
            <stop offset=".35" stopColor="#f1f5f9" />
            <stop offset=".7" stopColor="#cbd5e1" />
            <stop offset="1" stopColor="#64748b" />
          </linearGradient>
        </defs>
        <path d={shell} fill="url(#egg-metal)" stroke="#1f2937" strokeWidth="4" />
        <path d="M11 80h98v18H11z" fill="#334155" stroke="#1f2937" strokeWidth="3" />
        <circle cx="38" cy="89" r="4" fill="#34d399" />
        <circle cx="60" cy="89" r="4" fill="#facc15" />
        <circle cx="82" cy="89" r="4" fill="#38bdf8" />
        <circle cx="34" cy="40" r="3" fill="#475569" />
        <circle cx="86" cy="40" r="3" fill="#475569" />
        <path d="M44 24c6-6 14-8 20-7" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity=".8" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 120 150" className={className} aria-hidden="true">
      <path d={shell} fill="#fef3c7" stroke="#1f2937" strokeWidth="4" />
      <path d="M100 74c6 34-10 62-40 64 22-8 38-30 40-64z" fill="#fde68a" />
      <g fill="#14b8a6">
        <circle cx="42" cy="44" r="7" />
        <circle cx="74" cy="66" r="9" />
        <circle cx="38" cy="96" r="8" />
        <circle cx="82" cy="110" r="6" />
        <circle cx="60" cy="28" r="4" />
      </g>
      <g fill="#f59e0b">
        <circle cx="62" cy="96" r="5" />
        <circle cx="88" cy="40" r="4" />
        <circle cx="24" cy="70" r="4" />
      </g>
      <path d="M40 22c6-7 14-10 21-9" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

const TOP = 'polygon(0 0,100% 0,100% 52%,88% 46%,76% 54%,64% 45%,52% 55%,40% 46%,28% 54%,16% 45%,0 53%)';
const BOTTOM = 'polygon(0 53%,16% 45%,28% 54%,40% 46%,52% 55%,64% 45%,76% 54%,88% 46%,100% 52%,100% 100%,0 100%)';

function Confetti() {
  return (
    <div className="pointer-events-none absolute top-1/3 left-1/2" aria-hidden="true">
      {Array.from({ length: 28 }, (_, i) => (
        <span
          key={i}
          className="confetti-bit"
          style={{
            background: CONFETTI[i % CONFETTI.length],
            left: 0,
            top: 0,
            animationDelay: `${(i % 7) * 40}ms`,
            ['--dx' as string]: `${Math.round(Math.cos(i * 2.4) * 150)}px`,
            transform: `translateY(${-20 - (i % 5) * 12}px)`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Opens the student's unopened eggs one at a time: tap → the egg shakes while the server picks a
 * character → it cracks open → the character is revealed.
 */
export function EggOpener({ eggs, onDone }: { eggs: { level: number; kind: EggKind }[]; onDone?: () => void }) {
  const toast = useToast();
  const [phase, setPhase] = useState<Phase>('ready');
  const [opening, setOpening] = useState<{ level: number; kind: EggKind } | null>(null);
  const [result, setResult] = useState<OpenResult | null>(null);
  const [error, setError] = useState('');
  const [equipped, setEquipped] = useState(false);
  const [equipping, setEquipping] = useState(false);
  const egg = opening ?? eggs[0];

  const open = async () => {
    const target = eggs[0];
    if (!target || phase !== 'ready') return;
    setOpening(target);
    setError('');
    setPhase('shaking');
    const started = Date.now();
    try {
      const res = await api.openEgg({});
      await new Promise((r) => setTimeout(r, Math.max(0, 1400 - (Date.now() - started))));
      setResult(res);
      setEquipped(res.equipped);
      setPhase('cracking');
      setTimeout(() => setPhase('revealed'), 550);
    } catch (e) {
      setError(errorMessage(e));
      setOpening(null);
      setPhase('ready');
    }
  };

  const next = () => {
    setOpening(null);
    setResult(null);
    setEquipped(false);
    setPhase('ready');
  };

  const equip = async () => {
    if (!result) return;
    setEquipping(true);
    try {
      await api.setLook({ avatar: result.id });
      setEquipped(true);
      toast(`${characterName(result.id)} is your new profile picture`, 'good');
    } catch (e) {
      toast(errorMessage(e), 'bad');
    } finally {
      setEquipping(false);
    }
  };

  if (!egg) return null;

  if (phase === 'revealed' && result) {
    const rarity = rarityOf(result.id) ?? 'common';
    const def = getCharacter(result.id);
    const left = eggs.length;
    return (
      <div className="relative flex flex-col items-center text-center" aria-live="polite">
        <div className="relative flex size-56 items-center justify-center">
          <div className="reveal-rays absolute inset-0 rounded-full" style={{ ['--ray' as string]: RAY_COLOURS[rarity] }} />
          <CharacterImage id={result.id} className="reveal-pop relative size-40 shadow-lg ring-4 ring-white dark:ring-slate-800" />
          <Confetti />
        </div>
        <RarityBadge rarity={rarity} className="mt-1" />
        <h3 className="mt-2 text-2xl font-extrabold">{characterName(result.id)}</h3>
        <p className="mt-1 max-w-sm text-sm text-muted">{def ? def.fact : 'A robot built just for you — nobody else has this one.'}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {equipped ? (
            <p className="w-full text-sm font-semibold text-good">It’s your profile picture now!</p>
          ) : (
            <Button onClick={equip} loading={equipping}>
              Make it my profile picture
            </Button>
          )}
          {left > 0 ? (
            <Button variant={equipped ? 'primary' : 'secondary'} onClick={next}>
              Open the next egg ({left} left)
            </Button>
          ) : (
            onDone && (
              <Button variant={equipped ? 'primary' : 'secondary'} onClick={onDone}>
                Done
              </Button>
            )
          )}
        </div>
      </div>
    );
  }

  const cracking = phase === 'cracking';
  return (
    <div className="flex flex-col items-center text-center">
      <button
        type="button"
        onClick={open}
        disabled={phase !== 'ready'}
        className="group relative h-48 w-40 rounded-3xl outline-none focus-visible:ring-4 focus-visible:ring-brand-400 disabled:cursor-default"
        aria-label={egg.kind === 'robot' ? 'Open your robot egg' : 'Open your mystery egg'}
      >
        {cracking ? (
          <>
            <div className="egg-top-off absolute inset-0" style={{ clipPath: TOP }}>
              <EggGraphic kind={egg.kind} className="size-full" />
            </div>
            <div className="egg-bottom-off absolute inset-0" style={{ clipPath: BOTTOM }}>
              <EggGraphic kind={egg.kind} className="size-full" />
            </div>
          </>
        ) : (
          <div className={clsx('absolute inset-0', phase === 'shaking' ? 'egg-shaking' : 'egg-idle')}>
            <EggGraphic kind={egg.kind} className="size-full" />
          </div>
        )}
      </button>
      <p className="mt-3 font-bold">{egg.kind === 'robot' ? 'Robot egg' : 'Mystery egg'}</p>
      <p className="text-sm text-muted">{phase === 'ready' ? `From reaching Level ${egg.level}. Tap it to hatch!` : 'Something’s hatching…'}</p>
      {phase === 'ready' && (
        <Button className="mt-3" onClick={open}>
          Hatch it
        </Button>
      )}
      {error && (
        <Notice tone="bad" className="mt-3">
          {error}
        </Notice>
      )}
    </div>
  );
}
