import { ResponseSchema, type QuestionResponse } from '@study-helper/shared';
import clsx from 'clsx';
import { collection, doc, orderBy, query } from 'firebase/firestore';
import { AlarmClock, ChevronLeft, ChevronRight, Flag, LogOut, Send } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { badgeTitle } from '../../components/question/Feedback';
import { emptyResponse, isAnswered, QuestionView } from '../../components/question/QuestionView';
import type { ExamDoc, ExamQuestion } from '../../components/study/exam';
import { formatClock, plural } from '../../components/study/format';
import { Badge, Button, Modal, Notice, Spinner, useToast } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { useUser } from '../../lib/auth';
import { db } from '../../lib/firebase';
import { useDoc, useQuery } from '../../lib/hooks';
import NotFound from '../shared/NotFound';

// ---- Answers are kept in localStorage so a refresh (or a flat Chromebook battery) doesn't lose them ----

interface Saved {
  responses: Record<string, QuestionResponse>;
  flagged: string[];
  index: number;
}

const storageKey = (examId: string) => `exam:${examId}`;

function readSaved(examId: string): Saved {
  try {
    const raw = localStorage.getItem(storageKey(examId));
    if (raw) {
      const p = JSON.parse(raw) as Partial<Saved>;
      return {
        responses: p.responses && typeof p.responses === 'object' ? p.responses : {},
        flagged: Array.isArray(p.flagged) ? p.flagged.filter((x): x is string => typeof x === 'string') : [],
        index: typeof p.index === 'number' && p.index >= 0 ? Math.floor(p.index) : 0,
      };
    }
  } catch {
    /* storage blocked or corrupt */
  }
  return { responses: {}, flagged: [], index: 0 };
}

function writeSaved(examId: string, saved: Saved) {
  try {
    localStorage.setItem(storageKey(examId), JSON.stringify(saved));
  } catch {
    /* storage full or blocked */
  }
}

function clearSaved(examId: string) {
  try {
    localStorage.removeItem(storageKey(examId));
  } catch {
    /* storage blocked */
  }
}

const WARN_AT = 5 * 60_000;
const MAX_TIME_MS = 4 * 3_600_000;

export default function ExamTakePage() {
  const { examId = '' } = useParams();
  return <ExamTake key={examId} examId={examId} />;
}

function ExamTake({ examId }: { examId: string }) {
  const { user } = useUser();
  const navigate = useNavigate();
  const toast = useToast();
  const examRef = doc(db, 'students', user.uid, 'exams', examId);
  const exam = useDoc<ExamDoc>(examRef, `exam:${user.uid}:${examId}`);
  const qs = useQuery<ExamQuestion>(query(collection(examRef, 'questions'), orderBy('order')), `examq:${user.uid}:${examId}`);
  const questions = qs.data;

  const [initial] = useState(() => readSaved(examId));
  const [responses, setResponses] = useState(initial.responses);
  const [flagged, setFlagged] = useState<string[]>(initial.flagged);
  const [index, setIndex] = useState(initial.index);
  const [now, setNow] = useState(() => Date.now());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const submittedRef = useRef(false);
  const autoTriedRef = useRef(false);
  const warnedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const data = exam.data;
  const inProgress = data?.status === 'in-progress';
  const remaining = data ? data.endsAt - now : Infinity;

  // Persist answers locally while the exam is open.
  useEffect(() => {
    if (inProgress && !submittedRef.current) writeSaved(examId, { responses, flagged, index });
  }, [examId, inProgress, responses, flagged, index]);

  // Already handed in (e.g. on another device): the local copy is no longer needed.
  useEffect(() => {
    if (data && data.status !== 'in-progress') clearSaved(examId);
  }, [examId, data]);

  // Tick the clock.
  useEffect(() => {
    if (!inProgress) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [inProgress]);

  // Exam mode: lock the page behind the full-screen overlay so only the exam scrolls.
  const overlay = !!data && (inProgress || submitting) && questions.length > 0;
  useEffect(() => {
    if (!overlay) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [overlay]);

  const isDone = (q: ExamQuestion) => {
    const r = responses[q.id];
    return !!r && r.type === q.type && isAnswered(q, r);
  };

  const submit = useCallback(
    async (auto: boolean) => {
      if (!data || submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);
      setSubmitError('');
      const payload: Record<string, QuestionResponse> = {};
      for (const q of questions) {
        const r = responses[q.id];
        if (r && r.type === q.type && isAnswered(q, r) && ResponseSchema.safeParse(r).success) payload[q.id] = r;
      }
      const timeTakenMs = Math.min(MAX_TIME_MS, Math.round(Math.max(0, Math.min(Date.now(), data.endsAt) - data.startedAt)));
      try {
        const res = await api.submitExam({ examId, responses: payload, timeTakenMs });
        clearSaved(examId);
        toast(auto ? `Time’s up — your exam has been handed in. +${res.xpGained} XP` : `Exam handed in! +${res.xpGained} XP`, 'good');
        res.newBadges.forEach((b) => toast(`New badge: ${badgeTitle(b)} 🎉`, 'good'));
        navigate(`/exams/${examId}/results`, { replace: true });
      } catch (e) {
        const msg = errorMessage(e);
        if (/already been submitted/i.test(msg)) {
          clearSaved(examId);
          navigate(`/exams/${examId}/results`, { replace: true });
          return;
        }
        submittedRef.current = false;
        setSubmitting(false);
        setConfirmOpen(false);
        setSubmitError(msg);
      }
    },
    [data, questions, responses, examId, navigate, toast],
  );

  // Hand in automatically when the time runs out (once — a failure shows a retry button instead).
  useEffect(() => {
    if (!inProgress || qs.loading || autoTriedRef.current || remaining > 0) return;
    autoTriedRef.current = true;
    setConfirmOpen(false);
    setAnnouncement('Time’s up. Handing in your exam.');
    void submit(true);
  }, [inProgress, qs.loading, remaining, submit]);

  // One warning when time is nearly up.
  useEffect(() => {
    if (!inProgress || warnedRef.current || remaining <= 0 || remaining > WARN_AT) return;
    warnedRef.current = true;
    const msg = `${plural(Math.ceil(remaining / 60_000), 'minute')} to go — check your answers.`;
    setAnnouncement(msg);
    toast(msg, 'warn');
  }, [inProgress, remaining, toast]);

  if (exam.loading || (qs.loading && !questions.length)) return <Spinner label="Loading your exam" />;
  if (!data) return <NotFound />;
  if (!inProgress && !submitting) return <Navigate to={`/exams/${examId}/results`} replace />;
  if (!questions.length) {
    return (
      <Notice tone="bad" title="Couldn’t load this exam">
        Check your connection and try again.
      </Notice>
    );
  }

  const total = questions.length;
  const i = Math.min(index, total - 1);
  const q = questions[i]!;
  const flaggedSet = new Set(flagged);
  const isFlagged = flaggedSet.has(q.id);
  const answeredCount = questions.filter(isDone).length;
  const unanswered = questions.map((x, n) => ({ x, n })).filter(({ x }) => !isDone(x));
  const flaggedList = questions.map((x, n) => ({ x, n })).filter(({ x }) => flaggedSet.has(x.id));
  const low = remaining <= WARN_AT;
  const critical = remaining <= 60_000;

  const go = (n: number) => {
    setIndex(Math.max(0, Math.min(total - 1, n)));
    scrollRef.current?.scrollTo({ top: 0 });
  };
  const toggleFlag = () => setFlagged((f) => (f.includes(q.id) ? f.filter((x) => x !== q.id) : [...f, q.id]));
  const jumpButtons = (items: { n: number }[]) => (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {items.map(({ n }) => (
        <button
          key={n}
          type="button"
          onClick={() => {
            setConfirmOpen(false);
            go(n);
          }}
          className="h-10 min-w-10 rounded-lg border border-line bg-surface px-2 text-sm font-bold text-ink tabular-nums hover:border-brand-400"
          aria-label={`Go to question ${n + 1}`}
        >
          {n + 1}
        </button>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-canvas text-ink">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b border-line bg-surface px-3 sm:gap-3 sm:px-5">
        <Button variant="ghost" size="sm" onClick={() => navigate('/exams')} icon={<LogOut className="size-4" />} aria-label="Save and leave (the timer keeps running)">
          <span className="hidden sm:inline">Save and leave</span>
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{data.title}</p>
          <p className="truncate text-xs text-muted">
            {answeredCount} of {total} answered · {data.calculator === 'not-allowed' ? 'No calculator' : 'Calculator allowed'}
          </p>
        </div>
        <div
          role="timer"
          aria-label={`Time left: ${formatClock(remaining)}`}
          className={clsx(
            'flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-1.5 font-mono text-lg font-bold tabular-nums sm:px-3',
            critical
              ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200'
              : low
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200'
                : 'bg-slate-100 text-ink dark:bg-slate-800',
          )}
        >
          <AlarmClock className="size-5" aria-hidden />
          {formatClock(remaining)}
        </div>
        <Button size="sm" onClick={() => setConfirmOpen(true)} disabled={submitting} icon={<Send className="size-4" />}>
          Submit
        </Button>
      </header>
      <div className="sr-only" aria-live="assertive">
        {announcement}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-5 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_15rem] lg:px-8">
          <section aria-labelledby="exam-question-heading" className="min-w-0">
            {submitting && (
              <Notice tone="info" className="mb-4" title="Handing in your exam…">
                Marking can take a few seconds.
              </Notice>
            )}
            {submitError && (
              <Notice tone="bad" className="mb-4" title="Couldn’t hand in your exam">
                <p>{submitError} Your answers are still saved on this device.</p>
                <Button size="sm" className="mt-2" onClick={() => submit(false)}>
                  Try again
                </Button>
              </Notice>
            )}
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-7">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 id="exam-question-heading" className="font-bold">
                  Question {i + 1} <span className="font-normal text-muted">of {total}</span>
                </h2>
                <div className="flex items-center gap-2">
                  <Badge>{plural(q.marks, 'mark')}</Badge>
                  <Button
                    variant={isFlagged ? 'secondary' : 'ghost'}
                    size="sm"
                    aria-pressed={isFlagged}
                    onClick={toggleFlag}
                    icon={<Flag className={clsx('size-4', isFlagged && 'fill-amber-400 text-amber-600')} />}
                  >
                    {isFlagged ? 'Flagged' : 'Flag for review'}
                  </Button>
                </div>
              </div>
              <QuestionView
                key={q.id}
                question={q}
                value={responses[q.id] ?? emptyResponse(q)}
                onChange={(r) => setResponses((prev) => ({ ...prev, [q.id]: r }))}
                disabled={submitting}
                hideMeta
              />
            </div>
            <div className="mt-4 flex items-center justify-between gap-2">
              <Button variant="secondary" onClick={() => go(i - 1)} disabled={i === 0} icon={<ChevronLeft className="size-4" />}>
                Previous
              </Button>
              {i + 1 < total ? (
                <Button onClick={() => go(i + 1)}>
                  Next <ChevronRight className="size-4" />
                </Button>
              ) : (
                <Button onClick={() => setConfirmOpen(true)} disabled={submitting}>
                  Review and submit
                </Button>
              )}
            </div>
          </section>

          <aside aria-label="Question navigator" className="lg:sticky lg:top-5 lg:self-start">
            <div className="rounded-2xl border border-line bg-surface p-4">
              <p className="text-sm font-semibold">
                {answeredCount} of {total} answered
              </p>
              <ol className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-2">
                {questions.map((x, n) => {
                  const done = isDone(x);
                  const flag = flaggedSet.has(x.id);
                  const current = n === i;
                  return (
                    <li key={x.id}>
                      <button
                        type="button"
                        onClick={() => go(n)}
                        aria-current={current ? 'step' : undefined}
                        aria-label={`Question ${n + 1}, ${done ? 'answered' : 'not answered'}${flag ? ', flagged for review' : ''}`}
                        className={clsx(
                          'relative flex h-11 w-full items-center justify-center rounded-lg text-sm font-bold tabular-nums transition-colors',
                          done ? 'bg-brand-600 text-white hover:bg-brand-700' : 'border border-line bg-surface text-ink hover:border-brand-400',
                          current && 'ring-2 ring-ink ring-offset-2 ring-offset-surface',
                        )}
                      >
                        {n + 1}
                        {flag && <Flag className="absolute -top-1.5 -right-1.5 size-4 fill-amber-400 text-amber-600" aria-hidden />}
                      </button>
                    </li>
                  );
                })}
              </ol>
              <ul className="mt-4 grid grid-cols-1 gap-1.5 text-xs text-muted">
                <li className="flex items-center gap-2">
                  <span className="size-4 rounded bg-brand-600" aria-hidden /> Answered
                </li>
                <li className="flex items-center gap-2">
                  <span className="size-4 rounded border border-line bg-surface" aria-hidden /> Not answered
                </li>
                <li className="flex items-center gap-2">
                  <Flag className="size-4 fill-amber-400 text-amber-600" aria-hidden /> Flagged for review
                </li>
              </ul>
              <p className="mt-4 text-xs text-muted">If you leave, the timer keeps running and your answers stay saved on this device.</p>
            </div>
          </aside>
        </div>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Submit your exam?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Keep working
            </Button>
            <Button loading={submitting} onClick={() => submit(false)}>
              Submit exam
            </Button>
          </>
        }
      >
        <p>
          You’ve answered <strong>{answeredCount}</strong> of {total} questions, with <strong className="tabular-nums">{formatClock(remaining)}</strong> left.
        </p>
        {unanswered.length > 0 ? (
          <Notice tone="warn" className="mt-3" title={`${plural(unanswered.length, 'question')} not answered`}>
            Unanswered questions score 0. Tap a number to go back to it.
            {jumpButtons(unanswered)}
          </Notice>
        ) : (
          <Notice tone="good" className="mt-3">
            Every question has an answer. Nice work!
          </Notice>
        )}
        {flaggedList.length > 0 && (
          <Notice tone="info" className="mt-3" title={`${plural(flaggedList.length, 'question')} flagged for review`}>
            {jumpButtons(flaggedList)}
          </Notice>
        )}
        <p className="mt-3 text-sm text-muted">You can’t change your answers after you submit.</p>
      </Modal>
    </div>
  );
}
