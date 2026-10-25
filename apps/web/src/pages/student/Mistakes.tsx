import { getTopic, type AttemptRecord, type Subject } from '@study-helper/shared';
import { collection, limit, orderBy, query, where } from 'firebase/firestore';
import { ClipboardCheck, RotateCcw, Target } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Markdown } from '../../components/Markdown';
import { formatDateTime, plural, timeAgo } from '../../components/study/format';
import { AnswerText, QuestionPrompt, useQuestionLookup } from '../../components/study/QuestionPrompt';
import { Badge, Button, ButtonLink, Card, EmptyState, Notice, PageHeader, Spinner, Tabs } from '../../components/ui';
import { useUser } from '../../lib/auth';
import { db } from '../../lib/firebase';
import { useQuery } from '../../lib/hooks';
import { subjectLabel } from '../../lib/study';

type Attempt = AttemptRecord & { id: string };

const SHOW_FIRST = 5;

export default function Mistakes() {
  const { user } = useUser();
  const attempts = useQuery<AttemptRecord>(
    query(collection(db, 'students', user.uid, 'attempts'), where('correct', '==', false), orderBy('createdAt', 'desc'), limit(100)),
    `mistakes:${user.uid}`,
  );
  const [subject, setSubject] = useState<'all' | Subject>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Most recent wrong answer per question, skipping answers still waiting to be marked.
  const mistakes = useMemo(() => {
    const seen = new Set<string>();
    const out: Attempt[] = [];
    for (const a of attempts.data) {
      if (a.needsReview || seen.has(a.questionId)) continue;
      seen.add(a.questionId);
      out.push(a);
    }
    return out;
  }, [attempts.data]);

  const subjects = [...new Set(mistakes.map((m) => m.subject))];
  const visible = subject === 'all' ? mistakes : mistakes.filter((m) => m.subject === subject);

  // Group by topic, most recently missed topic first.
  const groups = useMemo(() => {
    const map = new Map<string, Attempt[]>();
    for (const m of visible) {
      const list = map.get(m.topicId) ?? [];
      list.push(m);
      map.set(m.topicId, list);
    }
    return [...map.entries()];
  }, [visible]);

  const questions = useQuestionLookup(
    user.uid,
    mistakes.map((m) => m.questionId),
  );

  const header = (
    <PageHeader
      title="My mistakes"
      subtitle="Every wrong answer is a chance to learn. Have another go until it sticks."
      actions={
        subjects.length > 1 ? (
          <Tabs
            value={subject}
            onChange={setSubject}
            options={[{ value: 'all' as const, label: 'All' }, ...subjects.map((s) => ({ value: s, label: subjectLabel(s) }))]}
          />
        ) : undefined
      }
    />
  );

  if (attempts.loading)
    return (
      <div>
        {header}
        <Spinner label="Loading your mistakes" />
      </div>
    );
  if (attempts.error)
    return (
      <div>
        {header}
        <Notice tone="bad" title="Couldn’t load your mistakes">
          Check your connection and try again.
        </Notice>
      </div>
    );
  if (!mistakes.length)
    return (
      <div>
        {header}
        <EmptyState icon={<Target className="size-10" />} title="No mistakes to review" action={<ButtonLink to="/learn">Start practising</ButtonLink>}>
          When you get a question wrong, it shows up here so you can learn from it and try again.
        </EmptyState>
      </div>
    );

  return (
    <div>
      {header}
      <p className="mb-4 text-sm text-muted">
        {plural(visible.length, 'question')} to revisit across {plural(groups.length, 'topic')}. Retrying gives you fresh numbers where it can, so you
        can’t just remember the answer.
      </p>
      <div className="grid grid-cols-1 gap-5">
        {groups.map(([topicId, items]) => {
          const topic = getTopic(topicId);
          const open = expanded.has(topicId);
          const shown = open ? items : items.slice(0, SHOW_FIRST);
          return (
            <Card as="section" key={topicId} className="p-0">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold">
                    {topic ? (
                      <Link to={`/learn/${topicId}`} className="hover:underline">
                        {topic.title}
                      </Link>
                    ) : (
                      topicId
                    )}
                  </h2>
                  <p className="text-sm text-muted">
                    {topic ? `${subjectLabel(topic.subject)} · ` : ''}
                    {plural(items.length, 'question')}
                  </p>
                </div>
                {topic && (
                  <ButtonLink to={`/practice/${topicId}?mode=mistakes`} icon={<RotateCcw className="size-4" />}>
                    Retry these
                  </ButtonLink>
                )}
              </div>
              <ul className="divide-y divide-line">
                {shown.map((m) => {
                  const q = questions.get(m.questionId);
                  return (
                    <li key={m.id} className="px-5 py-4">
                      {q === undefined ? (
                        <div className="h-6 w-2/3 animate-pulse rounded bg-slate-200 motion-reduce:animate-none dark:bg-slate-800" aria-hidden />
                      ) : q ? (
                        <QuestionPrompt question={q} />
                      ) : (
                        <p className="text-sm text-muted italic">This question isn’t available any more.</p>
                      )}
                      <div className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm dark:bg-rose-950/30">
                        <p className="font-semibold">Your answer</p>
                        <AnswerText text={m.answerText} type={m.type} clamp />
                      </div>
                      {m.expected && (
                        <div className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm dark:bg-emerald-950/30">
                          <p className="font-semibold">Correct answer</p>
                          <Markdown inline>{m.expected}</Markdown>
                        </div>
                      )}
                      {m.feedback && <p className="mt-2 text-sm">{m.feedback}</p>}
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                        <time dateTime={new Date(m.createdAt).toISOString()} title={formatDateTime(m.createdAt)}>
                          {timeAgo(m.createdAt)}
                        </time>
                        {m.context === 'exam' && (
                          <Badge tone="info">
                            <ClipboardCheck className="size-3" aria-hidden /> Mock exam
                          </Badge>
                        )}
                        {m.marksAvailable > 1 && (
                          <span>
                            {m.marksAwarded}/{m.marksAvailable} marks
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
              {items.length > SHOW_FIRST && (
                <div className="border-t border-line px-5 py-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-expanded={open}
                    onClick={() =>
                      setExpanded((s) => {
                        const next = new Set(s);
                        if (open) next.delete(topicId);
                        else next.add(topicId);
                        return next;
                      })
                    }
                  >
                    {open ? 'Show fewer' : `Show all ${items.length}`}
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
      {attempts.data.length >= 100 && <p className="mt-4 text-center text-xs text-muted">Showing your 100 most recent wrong answers.</p>}
    </div>
  );
}
