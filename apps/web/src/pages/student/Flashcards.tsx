import {
  getTopic,
  newStoredCard,
  nextReviewLabel,
  reviewCard,
  type Flashcard,
  type FlashcardGrade,
  type StoredCard,
  type Subject,
} from '@study-helper/shared';
import clsx from 'clsx';
import { collection, doc, setDoc } from 'firebase/firestore';
import { Clock, Layers, Sparkles, Trophy, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Markdown } from '../../components/Markdown';
import { badgeTitle } from '../../components/question/Feedback';
import { plural } from '../../components/study/format';
import { Meter } from '../../components/study/Meter';
import { Button, Card, EmptyState, Notice, PageHeader, ProgressBar, Spinner, Tabs, useToast } from '../../components/ui';
import { api } from '../../lib/api';
import { useUser } from '../../lib/auth';
import { hasFlashcards, loadFlashcards } from '../../lib/content';
import { db } from '../../lib/firebase';
import { useQuery } from '../../lib/hooks';
import { curriculaFor, subjectLabel, useStudySettings } from '../../lib/study';

const NEW_PER_SESSION = 10;
const MAX_PER_SESSION = 100;
/** Log XP every this many reviews (and at the end). */
const LOG_EVERY = 10;

const GRADES: { grade: FlashcardGrade; label: string; key: string; className: string }[] = [
  { grade: 'again', label: 'Again', key: '1', className: 'border-rose-300 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-950/40' },
  { grade: 'hard', label: 'Hard', key: '2', className: 'border-amber-300 hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-950/40' },
  { grade: 'good', label: 'Good', key: '3', className: 'border-emerald-300 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950/40' },
  { grade: 'easy', label: 'Easy', key: '4', className: 'border-sky-300 hover:bg-sky-50 dark:border-sky-800 dark:hover:bg-sky-950/40' },
];

interface Deck {
  title: string;
  cards: Flashcard[];
}

type StoredDoc = StoredCard & { id: string };

const plainText = (md: string) => md.replace(/[*_`$#>]/g, '');

export default function Flashcards() {
  const { user, profile } = useUser();
  const [params, setParams] = useSearchParams();
  const topicParam = params.get('topic');
  const curricula = useMemo(() => curriculaFor(profile.yearLevel), [profile.yearLevel]);
  const settings = useStudySettings(user.uid);

  // Every topic with a flashcard file, plus the requested topic if it's from another year level.
  const deckTopicIds = useMemo(() => {
    const ids = curricula.flatMap((c) => c.topics.map((t) => t.id)).filter(hasFlashcards);
    if (topicParam && hasFlashcards(topicParam) && !ids.includes(topicParam)) ids.push(topicParam);
    return ids;
  }, [curricula, topicParam]);

  const [content, setContent] = useState<Flashcard[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadFlashcards(deckTopicIds)
      .then((cards) => !cancelled && setContent(cards))
      .catch(() => !cancelled && setContent([]));
    return () => {
      cancelled = true;
    };
  }, [deckTopicIds]);

  const states = useQuery<StoredCard>(collection(db, 'students', user.uid, 'cards'), `cards:${user.uid}`);
  const stateById = useMemo(() => new Map<string, StoredDoc>(states.data.map((s) => [s.cardId, s])), [states.data]);

  const [deck, setDeck] = useState<Deck | null>(null);
  const [sessionKey, setSessionKey] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const focusTopic = topicParam ? getTopic(topicParam) : undefined;
  const [subject, setSubject] = useState<Subject | null>(focusTopic?.subject ?? null);

  const byTopic = useMemo(() => {
    const map = new Map<string, Flashcard[]>();
    for (const c of content ?? []) map.set(c.topicId, [...(map.get(c.topicId) ?? []), c]);
    return map;
  }, [content]);

  const start = (d: Deck) => {
    if (!d.cards.length) return;
    setDeck({ ...d, cards: d.cards.slice(0, MAX_PER_SESSION) });
    setSessionKey((k) => k + 1);
    window.scrollTo({ top: 0 });
  };
  const exitSession = () => {
    setDeck(null);
    setNow(Date.now());
  };

  if (deck) {
    return <ReviewSession key={sessionKey} uid={user.uid} deck={deck} initialStates={stateById} onExit={exitSession} />;
  }

  const header = <PageHeader title="Flashcards" subtitle="Quick-fire recall of key terms and ideas. Cards come back just before you’d forget them." />;
  if (content === null || states.loading)
    return (
      <div>
        {header}
        <Spinner label="Loading flashcards" />
      </div>
    );
  if (!content.length)
    return (
      <div>
        {header}
        <EmptyState icon={<Layers className="size-10" />} title="No flashcards yet">
          Flashcards for your subjects are on their way. Try a lesson or some practice meanwhile.
        </EmptyState>
      </div>
    );

  const isDueCard = (c: Flashcard) => {
    const s = stateById.get(c.id);
    return !!s && s.due <= now;
  };
  const byDue = (a: Flashcard, b: Flashcard) => (stateById.get(a.id)?.due ?? 0) - (stateById.get(b.id)?.due ?? 0);
  const due = content.filter(isDueCard).sort(byDue);
  const upcoming = content.map((c) => stateById.get(c.id)).filter((s): s is StoredDoc => !!s && s.due > now);
  const nextUp = upcoming.length ? upcoming.reduce((a, b) => (a.due < b.due ? a : b)) : undefined;

  const deckCurricula = curricula.filter((c) => c.topics.some((t) => byTopic.has(t.id)));
  const activeSubject = subject && deckCurricula.some((c) => c.subject === subject) ? subject : (deckCurricula[0]?.subject ?? null);
  const curriculum = deckCurricula.find((c) => c.subject === activeSubject);
  const school = new Set(settings.data?.schoolTopics ?? []);

  // New cards for the chosen subject: school topics first, then curriculum order.
  const subjectTopics = curriculum ? curriculum.topics.filter((t) => byTopic.has(t.id)) : [];
  const orderedTopics = [...subjectTopics.filter((t) => school.has(t.id)), ...subjectTopics.filter((t) => !school.has(t.id))];
  const unseen = orderedTopics.flatMap((t) => (byTopic.get(t.id) ?? []).filter((c) => !stateById.has(c.id)));

  const topicDeck = (topicId: string): Deck => {
    const cards = byTopic.get(topicId) ?? [];
    const title = getTopic(topicId)?.title ?? topicId;
    const dueHere = cards.filter(isDueCard).sort(byDue);
    const fresh = cards.filter((c) => !stateById.has(c.id)).slice(0, NEW_PER_SESSION);
    if (dueHere.length || fresh.length) return { title, cards: [...dueHere, ...fresh] };
    // Nothing due: practise the whole deck, soonest-due first.
    return { title: `${title} — extra practice`, cards: [...cards].sort(byDue) };
  };

  const topicStats = (topicId: string) => {
    const cards = byTopic.get(topicId) ?? [];
    return {
      total: cards.length,
      due: cards.filter(isDueCard).length,
      fresh: cards.filter((c) => !stateById.has(c.id)).length,
    };
  };

  return (
    <div>
      {header}

      {topicParam && !focusTopic && <Notice tone="warn" className="mb-4">We couldn’t find that topic.</Notice>}
      {focusTopic && !byTopic.has(focusTopic.id) && (
        <Notice tone="info" className="mb-4">
          There aren’t any flashcards for {focusTopic.title} yet.
        </Notice>
      )}
      {focusTopic && byTopic.has(focusTopic.id) && (
        <Card as="section" className="mb-5 border-brand-300 dark:border-brand-800">
          {(() => {
            const s = topicStats(focusTopic.id);
            return (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-muted">Topic deck</p>
                  <h2 className="text-lg font-bold">{focusTopic.title}</h2>
                  <p className="text-sm text-muted">
                    {plural(s.total, 'card')} · {s.due} due · {s.fresh} new
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="lg" onClick={() => start(topicDeck(focusTopic.id))}>
                    Study this deck
                  </Button>
                  <Button variant="ghost" icon={<X className="size-4" />} onClick={() => setParams({}, { replace: true })} aria-label="Show all decks">
                    All decks
                  </Button>
                </div>
              </div>
            );
          })()}
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="flex flex-col">
          <div className="flex items-center gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-800 dark:bg-brand-900/60 dark:text-brand-200">
              <Clock className="size-6" aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 className="font-bold">Due now</h2>
              <p className="text-sm text-muted">{due.length ? `${plural(due.length, 'card')} ready to review` : 'All caught up!'}</p>
            </div>
          </div>
          {!due.length && nextUp && <p className="mt-3 text-sm text-muted">Your next card is due {nextReviewLabel(nextUp, now)}.</p>}
          <div className="mt-auto pt-4">
            <Button className="w-full sm:w-auto" disabled={!due.length} onClick={() => start({ title: 'Due now', cards: due })}>
              Review {due.length ? plural(due.length, 'card') : 'cards'}
            </Button>
          </div>
        </Card>
        <Card className="flex flex-col">
          <div className="flex items-center gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
              <Sparkles className="size-6" aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 className="font-bold">Learn new</h2>
              <p className="text-sm text-muted">
                {unseen.length
                  ? `${plural(unseen.length, 'card')} you haven’t seen${activeSubject ? ` in ${subjectLabel(activeSubject)}` : ''}`
                  : 'You’ve started every card here. Ka pai!'}
              </p>
            </div>
          </div>
          <div className="mt-auto pt-4">
            <Button
              variant="secondary"
              className="w-full sm:w-auto"
              disabled={!unseen.length}
              onClick={() => start({ title: 'New cards', cards: unseen.slice(0, NEW_PER_SESSION) })}
            >
              {unseen.length ? `Learn ${plural(Math.min(NEW_PER_SESSION, unseen.length), 'new card')}` : 'Learn new cards'}
            </Button>
          </div>
        </Card>
      </div>

      <div className="mt-8 mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Decks by topic</h2>
        {deckCurricula.length > 1 && activeSubject && (
          <Tabs value={activeSubject} onChange={setSubject} options={deckCurricula.map((c) => ({ value: c.subject, label: subjectLabel(c.subject) }))} />
        )}
      </div>
      {curriculum && (
        <div className="grid grid-cols-1 gap-6">
          {curriculum.strands.map((strand) => {
            const topics = curriculum.topics.filter((t) => t.strandId === strand.id && byTopic.has(t.id));
            if (!topics.length) return null;
            return (
              <section key={strand.id} aria-labelledby={`strand-${strand.id}`}>
                <h3 id={`strand-${strand.id}`} className="mb-2 font-bold">
                  {strand.title}
                </h3>
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {topics.map((t) => {
                    const s = topicStats(t.id);
                    const started = s.total - s.fresh;
                    return (
                      <li key={t.id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold leading-snug">{t.title}</p>
                          <p className="mt-0.5 text-sm text-muted">
                            {plural(s.total, 'card')}
                            {s.due > 0 && <> · <span className="font-semibold text-ink">{s.due} due</span></>}
                            {s.fresh > 0 && <> · {s.fresh} new</>}
                          </p>
                          <Meter className="mt-2" value={started} max={s.total} label={`${t.title}: ${started} of ${s.total} cards started`} />
                        </div>
                        <Button variant={s.due ? 'primary' : 'secondary'} onClick={() => start(topicDeck(t.id))} aria-label={`Study ${t.title}`}>
                          Study
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------

function ReviewSession({ uid, deck, initialStates, onExit }: { uid: string; deck: Deck; initialStates: ReadonlyMap<string, StoredCard>; onExit: () => void }) {
  const toast = useToast();
  const byId = useMemo(() => new Map(deck.cards.map((c) => [c.id, c])), [deck]);
  const [queue, setQueue] = useState<string[]>(() => deck.cards.map((c) => c.id));
  const [flipped, setFlipped] = useState(false);
  const [counts, setCounts] = useState<Record<FlashcardGrade, number>>({ again: 0, hard: 0, good: 0, easy: 0 });
  const [xp, setXp] = useState(0);
  const [ended, setEnded] = useState(false);
  const states = useRef(new Map(initialStates));
  const pending = useRef(0);
  const lastLog = useRef(Date.now());
  const saveFailed = useRef(false);
  const showRef = useRef<HTMLButtonElement>(null);
  const goodRef = useRef<HTMLButtonElement>(null);

  const finished = ended || queue.length === 0;
  const current = !finished && queue[0] ? byId.get(queue[0]) : undefined;
  const reviewed = counts.again + counts.hard + counts.good + counts.easy;

  // Next-interval previews, computed once per flip so the labels match what gets saved.
  const previews = useMemo(() => {
    if (!current || !flipped) return null;
    const at = Date.now();
    const saved = states.current.get(current.id);
    const base = saved && typeof saved.due === 'number' ? saved : newStoredCard(current.id, current.topicId, at);
    const next = Object.fromEntries(GRADES.map((g) => [g.grade, reviewCard(base, g.grade, at)])) as Record<FlashcardGrade, StoredCard>;
    return { at, next };
  }, [current, flipped]);

  const flush = useCallback(() => {
    const count = pending.current;
    if (!count) return;
    pending.current = 0;
    const minutes = Math.min(120, Math.round((Date.now() - lastLog.current) / 60_000));
    lastLog.current = Date.now();
    api
      .logActivity({ kind: 'flashcards', count, minutes })
      .then((res) => {
        setXp((x) => x + res.xpGained);
        res.newBadges.forEach((b) => toast(`New badge: ${badgeTitle(b)} 🎉`, 'good'));
      })
      .catch(() => undefined); // e.g. the daily flashcard XP limit — reviews still count for scheduling
  }, [toast]);

  useEffect(() => () => flush(), [flush]); // leaving mid-session still logs the reviews
  useEffect(() => {
    if (finished) flush();
  }, [finished, flush]);

  const flip = () => {
    setFlipped(true);
    requestAnimationFrame(() => goodRef.current?.focus());
  };

  const grade = (g: FlashcardGrade) => {
    if (!current || !previews) return;
    const stored = previews.next[g];
    states.current.set(current.id, stored);
    // Exactly the StoredCard fields the security rules allow.
    setDoc(doc(db, 'students', uid, 'cards', current.id), stored).catch(() => {
      if (saveFailed.current) return;
      saveFailed.current = true;
      toast('Couldn’t save your progress on a card. Check your connection.', 'bad');
    });
    setCounts((c) => ({ ...c, [g]: c[g] + 1 }));
    setQueue((q) => {
      const [head, ...rest] = q;
      if (g !== 'again' || !head) return rest;
      // "Again" brings the card back a few cards later in this session.
      const at = Math.min(3, rest.length);
      return [...rest.slice(0, at), head, ...rest.slice(at)];
    });
    setFlipped(false);
    pending.current += 1;
    if (pending.current >= LOG_EVERY) flush();
    requestAnimationFrame(() => showRef.current?.focus());
  };

  // Keyboard: Space shows the answer, 1–4 grade it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat || finished || !current) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, dialog, [contenteditable="true"]')) return;
      if (!flipped && e.key === ' ') {
        e.preventDefault();
        flip();
      } else if (flipped) {
        const g = GRADES.find((x) => x.key === e.key);
        if (g) {
          e.preventDefault();
          grade(g.grade);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (finished) {
    const deckStates = deck.cards.map((c) => states.current.get(c.id)).filter((s): s is StoredCard => !!s);
    const nextDue = deckStates.length ? deckStates.reduce((a, b) => (a.due < b.due ? a : b)) : undefined;
    return (
      <div>
        <PageHeader title="Flashcards" subtitle={deck.title} />
        <Card className="text-center">
          <Trophy className="mx-auto size-12 text-xp" aria-hidden />
          <h2 className="mt-2 text-2xl font-extrabold">{queue.length ? 'Nice work!' : 'Session complete!'}</h2>
          <p className="mt-1 text-muted">
            {plural(reviewed, 'card')} reviewed{xp > 0 && ` · +${xp} XP`}
          </p>
          <dl className="mx-auto mt-5 grid max-w-md grid-cols-4 gap-2">
            {GRADES.map((g) => (
              <div key={g.grade} className={clsx('rounded-xl border-2 bg-surface px-2 py-2', g.className)}>
                <dt className="text-xs font-semibold text-muted">{g.label}</dt>
                <dd className="text-xl font-bold">{counts[g.grade]}</dd>
              </div>
            ))}
          </dl>
          {nextDue && <p className="mt-4 text-sm text-muted">The next of these cards comes back {nextReviewLabel(nextDue)}.</p>}
          <Button className="mt-6" size="lg" onClick={onExit}>
            Back to decks
          </Button>
        </Card>
      </div>
    );
  }

  if (!current) return <Spinner />;
  const topic = getTopic(current.topicId);
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold">{deck.title}</h1>
          <p className="text-sm text-muted">
            {plural(queue.length, 'card')} left · {reviewed} reviewed
          </p>
        </div>
        <Button variant="ghost" onClick={() => setEnded(true)}>
          End session
        </Button>
      </div>
      <ProgressBar value={reviewed} max={reviewed + queue.length} className="mb-5" />

      <div
        onClick={flipped ? undefined : flip}
        className={clsx(
          'flex min-h-64 flex-col items-center justify-center rounded-2xl border border-line bg-surface p-6 text-center shadow-sm sm:min-h-72 sm:p-10',
          !flipped && 'cursor-pointer transition-shadow hover:shadow-md',
        )}
      >
        {topic && <p className="text-xs font-semibold tracking-wide text-muted uppercase">{topic.title}</p>}
        <Markdown className={clsx('mt-3', flipped ? 'text-base text-muted' : 'text-xl sm:text-2xl')}>{current.front}</Markdown>
        {flipped && (
          <>
            <hr className="my-5 w-full border-line" />
            <Markdown className="text-xl font-medium sm:text-2xl">{current.back}</Markdown>
          </>
        )}
      </div>
      <div className="sr-only" aria-live="polite">
        {flipped ? `Answer: ${plainText(current.back)}` : ''}
      </div>

      {!flipped ? (
        <div className="mt-4 text-center">
          <Button ref={showRef} size="lg" className="w-full sm:w-auto" onClick={flip}>
            Show answer
          </Button>
          <p className="mt-2 hidden text-xs text-muted sm:block">
            Tip: press <kbd className="rounded border border-line px-1.5">Space</kbd> to flip, then <kbd className="rounded border border-line px-1.5">1</kbd>–
            <kbd className="rounded border border-line px-1.5">4</kbd> to grade.
          </p>
        </div>
      ) : (
        previews && (
          <div className="mt-4">
            <p className="mb-2 text-center text-sm font-semibold text-muted">How well did you know it?</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="How well did you know it?">
              {GRADES.map((g) => {
                const label = nextReviewLabel(previews.next[g.grade], previews.at);
                return (
                  <button
                    key={g.grade}
                    ref={g.grade === 'good' ? goodRef : undefined}
                    type="button"
                    onClick={() => grade(g.grade)}
                    aria-keyshortcuts={g.key}
                    aria-label={`${g.label}, see it again ${label}`}
                    className={clsx('flex min-h-16 flex-col items-center justify-center rounded-xl border-2 bg-surface px-2 py-2 font-semibold text-ink transition-colors', g.className)}
                  >
                    <span>
                      {g.label}
                      <kbd className="ml-1.5 hidden rounded border border-line px-1.5 text-xs font-normal text-muted sm:inline" aria-hidden>
                        {g.key}
                      </kbd>
                    </span>
                    <span className="text-xs font-normal text-muted" aria-hidden>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )
      )}
    </div>
  );
}
