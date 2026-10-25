import { getTopic } from '@study-helper/shared';
import clsx from 'clsx';
import { collection, doc, orderBy, query } from 'firebase/firestore';
import { CheckCircle2, CircleDashed, Dumbbell, PenLine, RotateCcw, Sparkles, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { Markdown } from '../../components/Markdown';
import { FlagButton, SelfMark } from '../../components/question/Feedback';
import { summariseResults, type ExamDoc, type ExamQuestion } from '../../components/study/exam';
import { formatDateTime, formatDuration, plural } from '../../components/study/format';
import { MeterRow } from '../../components/study/Meter';
import { AnswerText, QuestionPrompt } from '../../components/study/QuestionPrompt';
import { Badge, Button, ButtonLink, Card, Notice, PageHeader, ProgressBar, Spinner, Tabs, useToast } from '../../components/ui';
import { api, errorMessage, type ExamResultItem } from '../../lib/api';
import { useUser } from '../../lib/auth';
import { db } from '../../lib/firebase';
import { useAsync, useDoc, useQuery } from '../../lib/hooks';
import NotFound from '../shared/NotFound';

/** Below this percentage a topic counts as "weak" (roughly below a B). */
const WEAK_BELOW = 65;

type Filter = 'all' | 'wrong' | 'review';

export default function ExamResultsPage() {
  const { examId = '' } = useParams();
  return <ExamResults key={examId} examId={examId} />;
}

function ExamResults({ examId }: { examId: string }) {
  const { user } = useUser();
  const toast = useToast();
  const navigate = useNavigate();
  const examRef = doc(db, 'students', user.uid, 'exams', examId);
  const exam = useDoc<ExamDoc>(examRef, `exam:${user.uid}:${examId}`);
  const qs = useQuery<ExamQuestion>(query(collection(examRef, 'questions'), orderBy('order')), `examq:${user.uid}:${examId}`);
  const [aiAvailable, setAiAvailable] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const aiMark = useAsync(api.aiMarkExam);
  const retake = useAsync(api.startExam);

  useEffect(() => {
    api
      .getAiStatus({})
      .then((s) => setAiAvailable(s.available && s.budgetLeft))
      .catch(() => setAiAvailable(false));
  }, []);

  const data = exam.data;
  const results = useMemo(() => data?.results ?? [], [data]);
  const questionById = useMemo(() => new Map(qs.data.map((q) => [q.id, q])), [qs.data]);
  const summary = useMemo(() => summariseResults(results), [results]);

  // Per-topic marks. Answers still to be marked don't count against a topic's percentage.
  const topics = useMemo(() => {
    const map = new Map<string, { awarded: number; available: number; pending: number }>();
    for (const r of results) {
      const t = map.get(r.topicId) ?? { awarded: 0, available: 0, pending: 0 };
      t.available += r.marksAvailable;
      if (r.needsReview) t.pending += r.marksAvailable;
      else t.awarded += r.marksAwarded;
      map.set(r.topicId, t);
    }
    return [...map.entries()]
      .map(([topicId, t]) => {
        const marked = t.available - t.pending;
        return { topicId, ...t, percent: marked ? Math.round((t.awarded / marked) * 100) : null };
      })
      .sort((a, b) => (a.percent ?? 101) - (b.percent ?? 101));
  }, [results]);
  const weak = topics.filter((t) => t.percent !== null && t.percent < WEAK_BELOW && getTopic(t.topicId)).slice(0, 4);

  if (exam.loading) return <Spinner label="Loading your results" />;
  if (!data) return <NotFound />;
  if (data.status === 'in-progress') return <Navigate to={`/exams/${examId}`} replace />;

  const header = (
    <PageHeader
      title={data.title}
      subtitle={`${formatDateTime(data.startedAt)} · ${plural(data.questionCount, 'question')} · ${data.durationMinutes} min`}
      back={{ to: '/exams', label: 'Mock exams' }}
      actions={
        data.status === 'submitted' && (
          <Button
            variant="secondary"
            icon={<RotateCcw className="size-4" />}
            loading={retake.loading}
            onClick={async () => {
              const res = await retake.run({ topicIds: data.topicIds.slice(0, 40), durationMinutes: data.durationMinutes, calculator: data.calculator });
              if (res) navigate(`/exams/${res.examId}`);
            }}
          >
            Try another like this
          </Button>
        )
      }
    />
  );

  if (data.status === 'marking') {
    return (
      <div>
        {header}
        <Card className="text-center">
          <Spinner label="Marking your exam" className="py-4" />
          <p className="font-semibold">Marking your exam…</p>
          <p className="mt-1 text-sm text-muted">This usually takes a few seconds.</p>
        </Card>
      </div>
    );
  }

  const selfMark = async (questionId: string, marks: number) => {
    setBusyId(questionId);
    try {
      await api.selfMarkExam({ examId, questionId, marksAwarded: marks });
      toast('Marked — thanks for being honest!', 'good');
    } catch (e) {
      toast(errorMessage(e), 'bad');
    } finally {
      setBusyId(null);
    }
  };
  const markAllWithAi = async () => {
    const res = await aiMark.run({ examId });
    if (res) toast(`AI marking done — your score is now ${res.percent}%.`, 'good');
  };

  const counts = {
    all: results.length,
    wrong: results.filter((r) => !r.needsReview && !r.correct).length,
    review: summary.pendingReview,
  };
  const shown = results.filter((r) => (filter === 'wrong' ? !r.needsReview && !r.correct : filter === 'review' ? r.needsReview : true));

  return (
    <div>
      {header}
      {retake.error && (
        <Notice tone="bad" className="mb-4">
          {retake.error}
        </Notice>
      )}

      <Card as="section" className="grid grid-cols-1 gap-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
        <div className="flex items-center gap-4">
          <div className="flex size-24 shrink-0 flex-col items-center justify-center rounded-2xl bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-200">
            <span className="text-5xl leading-none font-extrabold">
              <span className="sr-only">Grade </span>
              {summary.grade.grade}
            </span>
          </div>
          <div className="sm:hidden">
            <p className="text-lg font-bold">{summary.grade.label}</p>
            <p className="text-muted">{summary.percent}%</p>
          </div>
        </div>
        <div className="min-w-0">
          <p className="hidden text-lg font-bold sm:block">{summary.grade.label}</p>
          <p className="mt-0.5">
            <span className="text-2xl font-extrabold">
              {summary.awarded}/{summary.available}
            </span>{' '}
            <span className="text-muted">marks · {summary.percent}%</span>
          </p>
          <ProgressBar className="mt-2" value={summary.awarded} max={summary.available} />
          <p className="mt-2 text-sm text-muted">
            {data.timeTakenMs !== undefined && <>Time taken: {formatDuration(data.timeTakenMs)} of {data.durationMinutes} min. </>}
            {data.submittedAt !== undefined && <>Handed in {formatDateTime(data.submittedAt)}.</>}
          </p>
        </div>
        <p className="text-xs text-muted sm:col-span-2">
          This is a practice grade. It uses the NZCE letters (A+ to E, where C is a pass) so you get used to them, but the percentage cut-offs are our own
          estimate — they aren’t official NZQA grade boundaries.
        </p>
      </Card>

      {data.late && (
        <Notice tone="warn" className="mt-4">
          This exam was handed in after the time ran out.
        </Notice>
      )}

      {summary.pendingReview > 0 && (
        <Notice tone="info" className="mt-4" title={`${plural(summary.pendingReview, 'written answer')} still to mark`}>
          <p>Your score goes up as you mark them. Compare each answer with the model answer below{aiAvailable ? ', or let the AI mark them all' : ''}.</p>
          {aiAvailable && (
            <Button className="mt-2" size="sm" variant="secondary" icon={<Sparkles className="size-4" />} loading={aiMark.loading} onClick={markAllWithAi}>
              Mark all written answers with AI
            </Button>
          )}
          {aiMark.error && <p className="mt-2 font-semibold">{aiMark.error}</p>}
        </Notice>
      )}

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-5">
        <Card as="section" className="lg:col-span-3">
          <h2 className="font-bold">By topic</h2>
          <p className="text-sm text-muted">Weakest first.</p>
          <ul className="mt-4 grid grid-cols-1 gap-4">
            {topics.map((t) => {
              const topic = getTopic(t.topicId);
              const title = topic?.title ?? t.topicId;
              const valueText = `${t.awarded}/${t.available}${t.percent !== null ? ` · ${t.percent}%` : ''}`;
              return (
                <li key={t.topicId}>
                  <MeterRow
                    label={
                      topic ? (
                        <Link to={`/learn/${t.topicId}`} className="hover:underline">
                          {title}
                        </Link>
                      ) : (
                        title
                      )
                    }
                    ariaLabel={`${title}: ${t.awarded} of ${t.available} marks`}
                    value={t.awarded}
                    max={t.available}
                    valueText={valueText}
                    extra={t.pending > 0 ? <Badge tone="warn">{t.pending} to mark</Badge> : undefined}
                  />
                </li>
              );
            })}
          </ul>
        </Card>
        <Card as="section" className="lg:col-span-2">
          <h2 className="flex items-center gap-2 font-bold">
            <Dumbbell className="size-5 text-brand-700 dark:text-brand-300" aria-hidden /> Practise weak topics
          </h2>
          {weak.length ? (
            <>
              <p className="mt-1 text-sm text-muted">These cost you the most marks. A short practice session on each will help.</p>
              <ul className="mt-3 grid grid-cols-1 gap-2">
                {weak.map((t) => (
                  <li key={t.topicId}>
                    <Link
                      to={`/practice/${t.topicId}`}
                      className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-line px-3 py-2.5 hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      <span className="min-w-0 font-semibold">{getTopic(t.topicId)?.title}</span>
                      <span className="shrink-0 text-sm text-muted tabular-nums">{t.percent}%</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted">
              No weak spots this time — ka pai! Try a longer exam or turn the calculator off for a bigger challenge.
            </p>
          )}
          <ButtonLink to="/mistakes" variant="secondary" size="sm" className="mt-4">
            Review all my mistakes
          </ButtonLink>
        </Card>
      </div>

      <section className="mt-8" aria-labelledby="review-heading">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 id="review-heading" className="text-lg font-bold">
            Question by question
          </h2>
          <Tabs
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: `All (${counts.all})` },
              { value: 'wrong', label: `Not right (${counts.wrong})` },
              ...(counts.review ? [{ value: 'review' as const, label: `To mark (${counts.review})` }] : []),
            ]}
          />
        </div>
        {qs.loading && !qs.data.length ? (
          <Spinner label="Loading questions" />
        ) : !shown.length ? (
          <p className="rounded-2xl border border-dashed border-line px-5 py-8 text-center text-muted">Nothing here — nice!</p>
        ) : (
          <ol className="grid grid-cols-1 gap-4">
            {shown.map((item) => {
              const question = questionById.get(item.questionId);
              return (
                <li key={item.questionId}>
                  <ResultCard
                    number={(question?.order ?? results.indexOf(item)) + 1}
                    item={item}
                    question={question}
                    busy={busyId === item.questionId || aiMark.loading}
                    onSelfMark={(marks) => selfMark(item.questionId, marks)}
                  />
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}

function ResultCard({
  number,
  item,
  question,
  busy,
  onSelfMark,
}: {
  number: number;
  item: ExamResultItem;
  question: ExamQuestion | undefined;
  busy: boolean;
  onSelfMark: (marks: number) => void;
}) {
  const partial = !item.correct && item.marksAwarded > 0;
  const state = item.needsReview ? 'review' : item.correct ? 'correct' : partial ? 'partial' : 'wrong';
  const status = {
    review: { icon: <PenLine className="size-5 text-brand-700 dark:text-brand-300" />, label: 'Needs marking', border: 'border-l-brand-500' },
    correct: { icon: <CheckCircle2 className="size-5 text-good" />, label: 'Correct', border: 'border-l-good' },
    partial: { icon: <CircleDashed className="size-5 text-xp" />, label: 'Partly right', border: 'border-l-xp' },
    wrong: { icon: <XCircle className="size-5 text-bad" />, label: 'Not right', border: 'border-l-bad' },
  }[state];
  const isExtended = question?.type === 'extended';
  const rubric = question?.type === 'extended' ? question.rubric : [{ criterion: 'Matches the correct answer', marks: item.marksAvailable }];

  return (
    <Card as="article" className={clsx('border-l-4', status.border)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-bold">Question {number}</h3>
          <p className="text-sm text-muted">{getTopic(item.topicId)?.title ?? item.topicId}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
            {status.icon}
            {status.label}
          </span>
          <Badge tone={state === 'correct' ? 'good' : state === 'review' ? 'brand' : state === 'partial' ? 'warn' : 'bad'}>
            {item.needsReview ? `${item.marksAvailable} marks` : `${item.marksAwarded}/${item.marksAvailable}`}
          </Badge>
        </div>
      </div>

      <div className="mt-3">{question ? <QuestionPrompt question={question} /> : <p className="text-sm text-muted italic">This question can’t be shown.</p>}</div>

      <div className={clsx('mt-3 rounded-xl px-3 py-2 text-sm', state === 'correct' ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-slate-50 dark:bg-slate-900')}>
        <p className="font-semibold">Your answer</p>
        <AnswerText text={item.answerText} type={question?.type} />
      </div>

      {!item.needsReview && !item.correct && item.expected && (
        <div className="mt-3 text-sm">
          <p className="font-semibold">{isExtended ? 'Model answer' : 'Correct answer'}</p>
          <Markdown>{item.expected}</Markdown>
        </div>
      )}
      {item.feedback && <p className="mt-2 text-sm font-medium">{item.feedback}</p>}

      {item.needsReview && <SelfMark modelAnswer={item.expected} rubric={rubric} onSubmit={onSelfMark} busy={busy} />}

      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-semibold text-brand-800 dark:text-brand-300">Worked solution</summary>
        <Markdown className="mt-2">{item.solution}</Markdown>
      </details>
      <div className="mt-2 flex justify-end">
        <FlagButton questionId={item.questionId} />
      </div>
    </Card>
  );
}
