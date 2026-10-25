import type { PublicQuestion } from '@study-helper/shared';
import clsx from 'clsx';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { CheckCircle2, ChevronDown, CircleDashed, Clock, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ExamResultItem, ExamSummary } from '../../lib/api';
import { db } from '../../lib/firebase';
import { useQuery } from '../../lib/hooks';
import { Markdown } from '../Markdown';
import { Badge, Button, Card, EmptyState, Notice, ProgressBar, Spinner } from '../ui';
import { AnswerText, QuestionPrompt } from './ActivityTab';
import { formatDateTime, formatDuration, percent, plural, topicTitle } from './format';
import type { PromptInfo } from './useQuestionPrompts';

export interface ExamDoc {
  title: string;
  subject: string;
  topicIds: string[];
  durationMinutes: number;
  calculator: 'allowed' | 'not-allowed';
  startedAt: number;
  endsAt: number;
  status: 'in-progress' | 'marking' | 'submitted';
  questionIds: string[];
  questionCount: number;
  totalMarks: number;
  submittedAt?: number;
  timeTakenMs?: number;
  late?: boolean;
  results?: ExamResultItem[];
  summary?: ExamSummary;
}

/** Exam questions are stored on the exam itself (students/{uid}/exams/{id}/questions). */
function useExamQuestions(uid: string, examId: string, enabled: boolean) {
  const [state, setState] = useState<{ loading: boolean; byId: Map<string, PublicQuestion> }>({ loading: false, byId: new Map() });
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    getDocs(query(collection(db, 'students', uid, 'exams', examId, 'questions'), orderBy('order')))
      .then((snap) => !cancelled && setState({ loading: false, byId: new Map(snap.docs.map((d) => [(d.data() as PublicQuestion).id, d.data() as PublicQuestion])) }))
      .catch(() => !cancelled && setState({ loading: false, byId: new Map() }));
    return () => {
      cancelled = true;
    };
  }, [uid, examId, enabled]);
  return state;
}

function ResultIcon({ r }: { r: ExamResultItem }) {
  if (r.needsReview) return <CircleDashed className="size-5 shrink-0 text-sky-600 dark:text-sky-300" role="img" aria-label="Awaiting marking" />;
  if (r.correct) return <CheckCircle2 className="size-5 shrink-0 text-good" role="img" aria-label="Correct" />;
  if (r.marksAwarded > 0) return <CheckCircle2 className="size-5 shrink-0 text-xp" role="img" aria-label="Partly correct" />;
  return <XCircle className="size-5 shrink-0 text-bad" role="img" aria-label="Incorrect" />;
}

function ExamQuestions({ uid, examId, results }: { uid: string; examId: string; results: ExamResultItem[] }) {
  const questions = useExamQuestions(uid, examId, true);
  return (
    <ol className="mt-3 grid grid-cols-1 gap-3">
      {results.map((r, i) => {
        const q = questions.byId.get(r.questionId);
        const info: PromptInfo | null = q ? { prompt: q.prompt, ...(q.stem && { stem: q.stem }), hasFigure: !!q.figure } : null;
        return (
          <li key={`${r.questionId}-${i}`} className="rounded-xl border border-line p-3">
            <div className="flex flex-wrap items-center gap-2">
              <ResultIcon r={r} />
              <span className="font-semibold">Question {i + 1}</span>
              <span className="min-w-0 flex-1 text-sm text-muted">{topicTitle(r.topicId)}</span>
              <span className="text-sm font-semibold tabular-nums">
                {r.needsReview ? `–/${r.marksAvailable}` : `${r.marksAwarded}/${r.marksAvailable}`}
                <span className="sr-only"> marks</span>
              </span>
            </div>
            <div className="mt-2 rounded-lg bg-canvas px-3 py-2">
              <QuestionPrompt info={info} loading={questions.loading} />
            </div>
            <div className="mt-2 text-sm">
              <span className="font-semibold">Their answer: </span>
              <AnswerText type={q?.type ?? 'text'} text={r.answerText} />
            </div>
            {!r.correct && r.expected && (
              <div className="mt-1 text-sm">
                <span className="font-semibold">Expected: </span>
                <Markdown inline>{r.expected}</Markdown>
              </div>
            )}
            {r.feedback && <p className="mt-1 text-sm text-muted">Feedback: {r.feedback}</p>}
            {r.needsReview && <p className="mt-1 text-sm text-muted">This written answer is still waiting to be marked.</p>}
            {r.solution && (
              <details className="mt-2 text-sm">
                <summary className="cursor-pointer font-semibold text-brand-700 dark:text-brand-300">Worked solution</summary>
                <Markdown className="mt-1">{r.solution}</Markdown>
              </details>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function ExamCard({ uid, exam }: { uid: string; exam: ExamDoc & { id: string } }) {
  const [open, setOpen] = useState(false);
  const s = exam.summary;
  const submitted = exam.status === 'submitted' && !!s;
  const panelId = `exam-${exam.id}-questions`;
  const expired = exam.status === 'in-progress' && Date.now() > exam.endsAt + 120_000;

  return (
    <Card as="article">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-bold">{exam.title}</h2>
          <p className="text-sm text-muted">
            {formatDateTime(exam.submittedAt ?? exam.startedAt)} · {plural(exam.questionCount, 'question')} · {exam.durationMinutes} min
            {exam.calculator === 'not-allowed' && ' · no calculator'}
          </p>
        </div>
        {submitted ? (
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">{s.percent}%</span>
            <Badge tone={s.percent >= 50 ? 'good' : 'warn'}>
              {s.grade.grade} · {s.grade.label}
            </Badge>
          </div>
        ) : (
          <Badge tone="info">{exam.status === 'marking' ? 'Being marked' : expired ? 'Not submitted' : 'In progress'}</Badge>
        )}
      </div>

      {submitted && (
        <>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            <li>
              {s.awarded}/{plural(s.available, 'mark')}
            </li>
            {exam.timeTakenMs !== undefined && (
              <li className="flex items-center gap-1">
                <Clock className="size-3.5" aria-hidden="true" />
                {formatDuration(exam.timeTakenMs)}
              </li>
            )}
            {exam.late && <li className="font-semibold text-xp">Submitted after the time limit</li>}
          </ul>
          {s.pendingReview > 0 && (
            <Notice tone="info" className="mt-3">
              {plural(s.pendingReview, 'written answer')} still {s.pendingReview === 1 ? 'needs' : 'need'} marking, so the score may go up.
            </Notice>
          )}

          <h3 className="mt-4 text-sm font-bold">By topic</h3>
          <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {Object.entries(s.byTopic).map(([topicId, t]) => {
              const p = percent(t.awarded, t.available) ?? 0;
              return (
                <li key={topicId} className="min-w-0">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate">{topicTitle(topicId)}</span>
                    <span className="shrink-0 font-semibold tabular-nums">
                      {t.awarded}/{t.available} <span className="font-normal text-muted">({p}%)</span>
                    </span>
                  </div>
                  <div aria-hidden="true">
                    <ProgressBar className="mt-1" value={t.awarded} max={t.available} tone={p >= 50 ? 'good' : 'brand'} />
                  </div>
                </li>
              );
            })}
          </ul>

          {!!exam.results?.length && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 -ml-3"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpen((o) => !o)}
                icon={<ChevronDown className={clsx('size-4 transition-transform', open && 'rotate-180')} aria-hidden="true" />}
              >
                {open ? 'Hide each question' : 'Show each question'}
              </Button>
              <div id={panelId} hidden={!open}>
                {open && <ExamQuestions uid={uid} examId={exam.id} results={exam.results} />}
              </div>
            </>
          )}
        </>
      )}
    </Card>
  );
}

export function ExamsTab({ uid, name }: { uid: string; name: string }) {
  const exams = useQuery<ExamDoc>(query(collection(db, 'students', uid, 'exams'), orderBy('startedAt', 'desc'), limit(30)), `exams:all:${uid}`);
  if (exams.loading) return <Spinner label="Loading exams" />;
  if (exams.error) return <Notice tone="bad">We couldn’t load {name}’s mock exams.</Notice>;
  if (!exams.data.length)
    return <EmptyState title="No mock exams yet">When {name} sits a mock exam, the score, grade and each answer will show up here.</EmptyState>;
  return (
    <div className="grid grid-cols-1 gap-4">
      <p className="text-sm text-muted">Grades use the NZCE letters (A+ to E, C is a pass). The percentage cut-offs are our own guide, not official NZQA boundaries.</p>
      {exams.data.map((e) => (
        <ExamCard key={e.id} uid={uid} exam={e} />
      ))}
    </div>
  );
}
