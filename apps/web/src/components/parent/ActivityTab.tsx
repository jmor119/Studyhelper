import { nzDateKey, type AttemptRecord } from '@study-helper/shared';
import { collection, limit, orderBy, query } from 'firebase/firestore';
import { Clock, Lightbulb } from 'lucide-react';
import { db } from '../../lib/firebase';
import { useQuery } from '../../lib/hooks';
import { Markdown } from '../Markdown';
import { Badge, EmptyState, Notice, Spinner } from '../ui';
import { attemptOutcome, CONTEXT_LABELS, dayLabel, displayPrompt, formatDuration, formatTime, plural, topicTitle } from './format';
import { useQuestionPrompts, type PromptInfo } from './useQuestionPrompts';

// Option-based answers are stored as option text (Markdown); typed answers are shown verbatim.
const MARKDOWN_ANSWERS = new Set(['mcq', 'multi', 'order', 'match']);

export function QuestionPrompt({ info, loading }: { info: PromptInfo | null | undefined; loading: boolean }) {
  if (loading) return <p className="text-sm text-muted">Loading question…</p>;
  if (!info) return <p className="text-sm text-muted italic">This question’s text isn’t available any more.</p>;
  return (
    <div className="text-sm">
      {info.stem && <Markdown className="text-muted">{displayPrompt(info.stem)}</Markdown>}
      <Markdown>{displayPrompt(info.prompt)}</Markdown>
      {info.hasFigure && <p className="text-xs text-muted">(This question includes a diagram.)</p>}
    </div>
  );
}

export function AnswerText({ type, text }: { type: string; text: string | undefined }) {
  if (!text) return <span className="text-muted italic">No answer recorded</span>;
  return MARKDOWN_ANSWERS.has(type) ? <Markdown inline>{text}</Markdown> : <span className="break-words whitespace-pre-wrap">{text}</span>;
}

function AttemptItem({ a, info, loading }: { a: AttemptRecord & { id: string }; info: PromptInfo | null | undefined; loading: boolean }) {
  const outcome = attemptOutcome(a);
  return (
    <li className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-sm font-semibold text-muted tabular-nums">{formatTime(a.createdAt)}</span>
        <span className="min-w-0 flex-1 font-semibold">{topicTitle(a.topicId)}</span>
        <Badge tone={outcome.tone}>{outcome.label}</Badge>
      </div>
      <div className="mt-2 rounded-xl bg-canvas px-3 py-2">
        <QuestionPrompt info={info} loading={loading} />
      </div>
      <div className="mt-2 text-sm">
        <span className="font-semibold">Their answer: </span>
        <AnswerText type={a.type} text={a.answerText} />
      </div>
      {a.expected && !a.correct && (
        <div className="mt-1 text-sm">
          <span className="font-semibold">Correct answer: </span>
          <Markdown inline>{a.expected}</Markdown>
        </div>
      )}
      {a.feedback && <p className="mt-1 text-sm text-muted">Feedback: {a.feedback}</p>}
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {!a.needsReview && (
          <li>
            {a.marksAwarded}/{plural(a.marksAvailable, 'mark')}
            {a.selfMarked && ' (self-marked)'}
            {a.aiMarked && ' (AI-marked)'}
          </li>
        )}
        <li className="flex items-center gap-1">
          <Lightbulb className="size-3.5" aria-hidden="true" />
          {a.hintsUsed ? plural(a.hintsUsed, 'hint') : 'No hints'}
        </li>
        {a.timeMs > 0 && (
          <li className="flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden="true" />
            {formatDuration(a.timeMs)}
          </li>
        )}
        <li>{CONTEXT_LABELS[a.context] ?? a.context}</li>
        <li>Difficulty {a.difficulty}/5</li>
      </ul>
    </li>
  );
}

export function ActivityTab({ uid, name }: { uid: string; name: string }) {
  const attempts = useQuery<AttemptRecord>(query(collection(db, 'students', uid, 'attempts'), orderBy('createdAt', 'desc'), limit(50)), `attempts:latest50:${uid}`);
  const prompts = useQuestionPrompts(
    uid,
    attempts.data.map((a) => a.questionId),
  );
  const today = nzDateKey();

  if (attempts.loading) return <Spinner label="Loading answers" />;
  if (attempts.error) return <Notice tone="bad">We couldn’t load {name}’s answers.</Notice>;
  if (!attempts.data.length) return <EmptyState title="No answers yet">When {name} answers practice or exam questions, each one shows up here.</EmptyState>;

  // Group by NZ day.
  const groups: { key: string; items: typeof attempts.data }[] = [];
  for (const a of attempts.data) {
    const key = nzDateKey(a.createdAt);
    const last = groups[groups.length - 1];
    if (last?.key === key) last.items.push(a);
    else groups.push({ key, items: [a] });
  }

  return (
    <div>
      <p className="mb-4 text-sm text-muted">{name}’s latest {attempts.data.length} answers, newest first. Times are NZ time.</p>
      <div className="grid grid-cols-1 gap-6">
        {groups.map((g) => (
          <section key={g.key} aria-labelledby={`day-${g.key}`}>
            <h2 id={`day-${g.key}`} className="mb-2 text-sm font-bold tracking-wide text-muted uppercase">
              {dayLabel(g.key, today)}
            </h2>
            <ul className="grid grid-cols-1 gap-3">
              {g.items.map((a) => (
                <AttemptItem key={a.id} a={a} info={prompts.get(a.questionId)} loading={!prompts.has(a.questionId)} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
