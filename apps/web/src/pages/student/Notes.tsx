import { formatDateKey, getTopic, nzDateKey, type MarkResult, type PublicQuestion, type QuestionResponse } from '@study-helper/shared';
import { collection, doc, limit, orderBy, query } from 'firebase/firestore';
import { BookOpen, FileText, Lightbulb, MessageCircle, NotebookPen, Sparkles, Trophy } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { AiErrorNotice, AiUnavailable, aiError, useAiStatus, type AiErrorView } from '../../components/assist/ai';
import { sendTutor } from '../../components/assist/tutorStream';
import { AttachmentThumbs, UploadPicker, uploadPrepared, useUploadItems } from '../../components/assist/uploads';
import { useServerDoc } from '../../components/assist/useServerDoc';
import { Markdown } from '../../components/Markdown';
import { Feedback, SelfMark } from '../../components/question/Feedback';
import { emptyResponse, isAnswered, QuestionView } from '../../components/question/QuestionView';
import { Badge, Button, ButtonLink, Card, EmptyState, Notice, PageHeader, ProgressBar, Spinner, Textarea, useToast } from '../../components/ui';
import { api, errorMessage, type ProgressResult, type SubmitResult } from '../../lib/api';
import { useUser } from '../../lib/auth';
import { db } from '../../lib/firebase';
import { useQuery } from '../../lib/hooks';

const MAX_FILES = 4;
const SET_ID = /^[0-9a-f]{16}$/;

interface NoteSetDoc {
  title: string;
  summary: string;
  keyTerms: { term: string; definition: string }[];
  topicIds: string[];
  paths: string[];
  questions: PublicQuestion[];
  createdAt: number;
}

export default function Notes() {
  const { setId } = useParams();
  return setId ? <NoteSetView key={setId} setId={setId} /> : <NotesHome />;
}

// ---------------------------------------------------------------------------------------------
// /notes — upload + list

const ANALYSE_STEPS: { after: number; text: string }[] = [
  { after: 0, text: 'Reading your notes…' },
  { after: 12, text: 'Picking out the key ideas and terms…' },
  { after: 35, text: 'Writing practice questions…' },
  { after: 75, text: 'Checking the questions — nearly there…' },
  { after: 150, text: 'Still working — big sets of notes take a few minutes.' },
];

function useElapsedSeconds(running: boolean) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!running) return;
    setSecs(0);
    const start = Date.now();
    const t = setInterval(() => setSecs(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(t);
  }, [running]);
  return secs;
}

function NotesHome() {
  const { user } = useUser();
  const navigate = useNavigate();
  const toast = useToast();
  const ai = useAiStatus();
  const files = useUploadItems();
  const sets = useQuery<NoteSetDoc>(query(collection(db, 'students', user.uid, 'noteSets'), orderBy('createdAt', 'desc'), limit(50)), `noteSets:${user.uid}`);
  const [stage, setStage] = useState<'idle' | 'uploading' | 'analysing'>('idle');
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<AiErrorView | null>(null);
  const secs = useElapsedSeconds(stage === 'analysing');
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  const busy = stage !== 'idle';
  const step = [...ANALYSE_STEPS].reverse().find((s) => secs >= s.after)!;

  const analyse = async (e: FormEvent) => {
    e.preventDefault();
    if (!files.items.length || busy) return;
    setError(null);
    setStage('uploading');
    let phase: 'upload' | 'analyse' = 'upload';
    try {
      const paths = await uploadPrepared(user.uid, files.items, (done, total) => setProgress({ done, total }));
      phase = 'analyse';
      setStage('analysing');
      const res = await api.analyseNotes({ paths });
      if (!mounted.current) return;
      toast(`Done! ${res.questionCount} practice question${res.questionCount === 1 ? '' : 's'} from your notes.`, 'good');
      files.clear();
      navigate(`/notes/${res.setId}`);
    } catch (err) {
      if (!mounted.current) return;
      setError(
        phase === 'upload'
          ? { title: 'Upload failed', message: 'We couldn’t upload your files. Check your internet connection and try again.', tone: 'bad' }
          : aiError(err),
      );
    } finally {
      if (mounted.current) setStage('idle');
    }
  };

  return (
    <div>
      <PageHeader title="My notes" subtitle="Turn class notes or worksheets into a summary, key terms and practice questions." />

      {ai.loading ? (
        <Spinner />
      ) : ai.status && !ai.ready ? (
        <AiUnavailable status={ai.status} feature="Notes analysis" />
      ) : (
        <Card as="section">
          <form onSubmit={analyse} className="grid grid-cols-1 gap-4">
            <div>
              <h2 className="font-bold">Add your notes</h2>
              <p className="mt-0.5 text-sm text-muted">Clear, well-lit photos work best — one page per photo. Your notes and the questions made from them stay private to you (and your parent).</p>
            </div>
            <UploadPicker state={files} max={MAX_FILES} disabled={busy} label="Photos or PDFs of your notes or worksheet" />
            {error && <AiErrorNotice error={error} />}
            {stage === 'analysing' && (
              <div role="status" className="rounded-xl bg-brand-50 p-4 dark:bg-brand-950/40">
                <p className="flex items-center gap-2 font-semibold">
                  <Sparkles className="size-4 animate-pulse text-brand-700 dark:text-brand-300" aria-hidden /> {step.text}
                </p>
                <ProgressBar className="mt-3" value={Math.min(95, (secs / 120) * 100)} />
                <p className="mt-2 text-xs text-muted">This usually takes a minute or two. Keep this page open.</p>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" size="lg" loading={busy} disabled={!files.items.length || busy || !(ai.ready || ai.failed)} icon={<Sparkles className="size-5" />}>
                Analyse my notes
              </Button>
              {stage === 'uploading' && (
                <p className="text-sm text-muted" role="status">
                  Uploading {Math.min(progress.done + 1, progress.total)} of {progress.total}…
                </p>
              )}
            </div>
          </form>
        </Card>
      )}

      <section className="mt-8" aria-labelledby="sets-heading">
        <h2 id="sets-heading" className="mb-3 text-lg font-bold">
          Your note sets
        </h2>
        {sets.loading ? (
          <Spinner />
        ) : sets.error ? (
          <Notice tone="bad">Couldn’t load your notes. Check your connection.</Notice>
        ) : !sets.data.length ? (
          <EmptyState icon={<NotebookPen className="size-10" />} title="No notes yet">
            Upload your class notes above and you’ll get a summary, key terms and questions to practise.
          </EmptyState>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {sets.data.map((s) => (
              <li key={s.id} className="min-w-0">
                <Link to={`/notes/${s.id}`} className="block h-full rounded-2xl border border-line bg-surface p-4 transition-shadow hover:shadow-md">
                  <div className="flex items-start gap-3">
                    <span className="rounded-xl bg-brand-100 p-2 text-brand-700 dark:bg-brand-900 dark:text-brand-300" aria-hidden>
                      <FileText className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{s.title || 'Untitled notes'}</p>
                      <p className="text-sm text-muted">
                        {formatDateKey(nzDateKey(s.createdAt))} · {s.questions?.length ?? 0} question{s.questions?.length === 1 ? '' : 's'}
                      </p>
                      {s.topicIds?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {s.topicIds.slice(0, 3).map((id) => (
                            <Badge key={id} tone="brand">
                              {getTopic(id)?.title ?? id}
                            </Badge>
                          ))}
                          {s.topicIds.length > 3 && <Badge>+{s.topicIds.length - 3}</Badge>}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// /notes/:setId — one note set

function NoteSetView({ setId }: { setId: string }) {
  const { user } = useUser();
  const valid = SET_ID.test(setId);
  const set = useServerDoc<NoteSetDoc>(valid ? doc(db, 'students', user.uid, 'noteSets', setId) : null, valid ? `noteSet:${user.uid}:${setId}` : null);
  const back = { to: '/notes', label: 'My notes' };

  if (set.loading) return <Spinner />;
  if (!set.data) {
    return (
      <div>
        <PageHeader title="Notes" back={back} />
        <EmptyState icon={<NotebookPen className="size-10" />} title="We couldn’t find those notes" action={<ButtonLink to="/notes">Back to my notes</ButtonLink>}>
          They may have been deleted, or the link is wrong.
        </EmptyState>
      </div>
    );
  }
  const s = set.data;
  const topics = (s.topicIds ?? []).map((id) => getTopic(id)).filter((t) => !!t);

  return (
    <div>
      <PageHeader title={s.title || 'My notes'} subtitle={`Uploaded ${formatDateKey(nzDateKey(s.createdAt))}`} back={back} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card as="section" className="min-w-0 lg:col-span-2">
          <h2 className="text-lg font-bold">Summary</h2>
          <Markdown className="mt-2">{s.summary || '_No summary._'}</Markdown>
        </Card>

        <div className="grid min-w-0 grid-cols-1 content-start gap-5">
          {topics.length > 0 && (
            <Card as="section">
              <h2 className="font-bold">Curriculum topics</h2>
              <ul className="mt-2 grid grid-cols-1 gap-1.5">
                {topics.map((t) => (
                  <li key={t.id}>
                    <Link to={`/learn/${t.id}`} className="inline-flex items-center gap-1.5 font-semibold text-brand-700 hover:underline dark:text-brand-300">
                      <BookOpen className="size-4 shrink-0" aria-hidden /> {t.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {s.paths?.length > 0 && (
            <Card as="section">
              <h2 className="font-bold">Your pages</h2>
              <AttachmentThumbs paths={s.paths} className="mt-2" size="md" />
            </Card>
          )}
        </div>
      </div>

      {s.keyTerms?.length > 0 && (
        <Card as="section" className="mt-5">
          <h2 className="text-lg font-bold">Key terms</h2>
          <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {s.keyTerms.map((k, i) => (
              <div key={`${k.term}-${i}`} className="min-w-0 rounded-xl border border-line p-3">
                <dt className="font-bold">
                  <Markdown inline>{k.term}</Markdown>
                </dt>
                <dd className="mt-0.5 text-sm text-muted">
                  <Markdown inline>{k.definition}</Markdown>
                </dd>
              </div>
            ))}
          </dl>
        </Card>
      )}

      <section className="mt-5" aria-labelledby="practice-heading">
        <h2 id="practice-heading" className="mb-3 text-lg font-bold">
          Practise from your notes
        </h2>
        {s.questions?.length ? (
          <NotePractice questions={s.questions} />
        ) : (
          <EmptyState title="No practice questions">We couldn’t make questions from these notes. Try clearer photos, or ask the tutor to quiz you instead.</EmptyState>
        )}
      </section>

      <AskAboutNotes set={s} />
    </div>
  );
}

function AskAboutNotes({ set }: { set: NoteSetDoc & { id: string } }) {
  const ai = useAiStatus();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AiErrorView | null>(null);
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );
  if (!ai.ready && !ai.failed) return null;

  const ask = (e: FormEvent) => {
    e.preventDefault();
    const text = message.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    const { done } = sendTutor(
      { mode: 'notes', message: text, attachments: (set.paths ?? []).slice(0, 3), ...(set.topicIds?.[0] && { topicId: set.topicIds[0] }) },
      { baseCount: 0, onChatId: (id) => mounted.current && navigate(`/tutor/${id}`) },
    );
    done.catch((err) => {
      if (!mounted.current) return;
      setError(aiError(err));
      setBusy(false);
    });
  };

  return (
    <Card as="section" className="mt-5">
      <h2 className="flex items-center gap-2 font-bold">
        <MessageCircle className="size-5 text-brand-700 dark:text-brand-300" aria-hidden /> Ask the tutor about these notes
      </h2>
      <p className="mt-1 text-sm text-muted">
        The tutor can see your pages{set.paths?.length > 3 ? ' (the first three)' : ''} and will help you understand them or quiz you.
      </p>
      <form onSubmit={ask} className="mt-3 grid grid-cols-1 gap-3">
        <label className="sr-only" htmlFor="ask-notes">
          Your question about these notes
        </label>
        <Textarea id="ask-notes" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="e.g. Quiz me on these notes, or explain the second page" maxLength={4000} disabled={busy} />
        {error && <AiErrorNotice error={error} />}
        <div>
          <Button type="submit" loading={busy} disabled={!message.trim()}>
            Ask the tutor
          </Button>
        </div>
      </form>
    </Card>
  );
}

// ---------------------------------------------------------------------------------------------
// Practice (same flow as Practice.tsx, for the set's private questions)

interface Slot {
  question: PublicQuestion;
  response: QuestionResponse;
  hintsShown: number;
  startedAt: number;
  result?: { mark: MarkResult; solution: string; progress?: Partial<ProgressResult> };
  pending?: Extract<SubmitResult, { needsReview: true }>;
}

const makeSlots = (qs: PublicQuestion[]): Slot[] => qs.map((q) => ({ question: q, response: emptyResponse(q), hintsShown: 0, startedAt: Date.now() }));

function NotePractice({ questions }: { questions: PublicQuestion[] }) {
  const toast = useToast();
  const ai = useAiStatus();
  const [slots, setSlots] = useState<Slot[]>(() => makeSlots(questions));
  const [index, setIndex] = useState(0);
  const [checking, setChecking] = useState(false);
  const [inlineError, setInlineError] = useState('');
  const [xpTotal, setXpTotal] = useState(0);
  const [finished, setFinished] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  const slot = slots[index];
  if (!slot) return null;
  const update = (patch: Partial<Slot>) => setSlots((s) => s.map((x, i) => (i === index ? { ...x, ...patch } : x)));
  const answered = slots.filter((s) => s.result).length;
  const correct = slots.filter((s) => s.result?.mark.correct).length;

  const check = async () => {
    if (!isAnswered(slot.question, slot.response) || checking) return;
    setChecking(true);
    setInlineError('');
    try {
      const res = await api.submitAnswer({ questionId: slot.question.id, response: slot.response, hintsUsed: slot.hintsShown, timeMs: Date.now() - slot.startedAt });
      if (res.invalid) setInlineError(res.feedback);
      else if (res.needsReview) update({ pending: res });
      else {
        update({ result: { mark: res.mark, solution: res.solution, progress: res } });
        setXpTotal((x) => x + res.xpGained);
        if (res.newBadges.length) toast('New badge earned! 🎉', 'good');
      }
    } catch (e) {
      setInlineError(errorMessage(e));
    } finally {
      setChecking(false);
    }
  };

  const finishReview = async (fn: () => Promise<{ mark: MarkResult } & ProgressResult>) => {
    if (!slot.pending) return;
    const pending = slot.pending;
    setChecking(true);
    setInlineError('');
    try {
      const res = await fn();
      update({ result: { mark: res.mark, solution: pending.solution, progress: res }, pending: undefined });
      setXpTotal((x) => x + res.xpGained);
    } catch (e) {
      setInlineError(errorMessage(e));
    } finally {
      setChecking(false);
    }
  };

  const next = () => {
    setInlineError('');
    if (index + 1 >= slots.length) setFinished(true);
    else {
      setIndex(index + 1);
      setSlots((s) => s.map((x, i) => (i === index + 1 ? { ...x, startedAt: Date.now() } : x)));
    }
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const restart = () => {
    setSlots(makeSlots(questions));
    setIndex(0);
    setXpTotal(0);
    setFinished(false);
  };

  if (finished) {
    const pct = answered ? Math.round((correct / answered) * 100) : 0;
    return (
      <Card className="text-center">
        <Trophy className="mx-auto size-12 text-xp" aria-hidden />
        <h3 className="mt-2 text-2xl font-extrabold">All done!</h3>
        <p className="mt-1 text-muted">
          {correct} of {answered} correct ({pct}%) · +{xpTotal} XP
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button onClick={restart}>Try them again</Button>
          <ButtonLink variant="secondary" to="/notes">
            Back to my notes
          </ButtonLink>
        </div>
      </Card>
    );
  }

  const hints = slot.question.hints;
  const done = !!slot.result;
  const tutorLink = `/tutor?question=${encodeURIComponent(slot.question.id)}&topic=${encodeURIComponent(slot.question.topicId)}`;
  return (
    <div ref={topRef} className="scroll-mt-20">
      <div className="mb-3 flex items-center gap-3">
        <ProgressBar value={index + (done ? 1 : 0)} max={slots.length} />
        <span className="shrink-0 text-sm font-semibold text-muted">
          {index + 1}/{slots.length}
        </span>
        {xpTotal > 0 && <span className="shrink-0 text-sm font-bold text-xp">+{xpTotal} XP</span>}
      </div>
      <Card>
        <QuestionView
          question={slot.question}
          value={slot.response}
          onChange={(r) => update({ response: r })}
          disabled={done || !!slot.pending}
          result={slot.result ? { correct: slot.result.mark.correct, details: slot.result.mark.details, expected: slot.result.mark.expected } : null}
          onSubmit={check}
        />

        {slot.hintsShown > 0 && (
          <div className="mt-4 grid grid-cols-1 gap-2">
            {hints.slice(0, slot.hintsShown).map((h, i) => (
              <div key={i} className="flex gap-2 rounded-xl bg-amber-50 p-3 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                <Lightbulb className="mt-0.5 size-5 shrink-0" aria-hidden />
                <Markdown>{h}</Markdown>
              </div>
            ))}
          </div>
        )}

        {inlineError && (
          <Notice tone="warn" className="mt-4">
            {inlineError}
          </Notice>
        )}

        {slot.pending && (
          <SelfMark
            modelAnswer={slot.pending.modelAnswer}
            rubric={slot.pending.rubric}
            onSubmit={(marks) => finishReview(() => api.selfMark({ attemptId: slot.pending!.attemptId, marksAwarded: marks }))}
            onAiMark={() => finishReview(() => api.aiMarkAttempt({ attemptId: slot.pending!.attemptId }))}
            aiAvailable={ai.ready}
            busy={checking}
          />
        )}

        {slot.result && <Feedback mark={slot.result.mark} solution={slot.result.solution} progress={slot.result.progress} questionId={slot.question.id} tutorLink={tutorLink} />}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          {!done && !slot.pending && hints.length > slot.hintsShown ? (
            <Button variant="ghost" icon={<Lightbulb className="size-4" />} onClick={() => update({ hintsShown: slot.hintsShown + 1 })}>
              {slot.hintsShown ? 'Another hint' : 'Show a hint'}
            </Button>
          ) : (
            <span />
          )}
          {done ? (
            <Button size="lg" onClick={next}>
              {index + 1 >= slots.length ? 'Finish' : 'Next question'}
            </Button>
          ) : !slot.pending ? (
            <Button size="lg" onClick={check} loading={checking} disabled={!isAnswered(slot.question, slot.response)}>
              Check answer
            </Button>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
