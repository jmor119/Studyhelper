import { nzDateKey, type MasteryRecord, type Subject, type Topic } from '@study-helper/shared';
import { useState } from 'react';
import { curriculaFor, LEVEL_TONE, levelFor, subjectLabel } from '../../lib/study';
import { Badge, Card, EmptyState, ProgressBar, Select, Spinner, Tabs } from '../ui';
import { dayLabel, percent, plural } from './format';

type Sort = 'curriculum' | 'weakest';

function TopicRow({ topic, m, strand, today }: { topic: Topic; m: MasteryRecord | undefined; strand?: string; today: string }) {
  const level = levelFor(m);
  const accuracy = m ? percent(m.correct, m.attempts) : null;
  return (
    <li className="grid grid-cols-1 gap-2 rounded-xl border border-line bg-surface px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4">
      <div className="min-w-0">
        <p className="font-semibold">{topic.title}</p>
        {strand && <p className="text-xs text-muted">{strand}</p>}
        <p className="mt-0.5 text-sm text-muted">
          {m && m.attempts ? (
            <>
              {accuracy}% correct · {plural(m.attempts, 'answer')} · last practised {dayLabel(nzDateKey(m.lastPracticedAt), today).replace(/^(Today|Yesterday)$/, (s) => s.toLowerCase())}
            </>
          ) : (
            'Not practised yet'
          )}
        </p>
      </div>
      <div className="flex items-center gap-3 sm:justify-end">
        <div className="w-24 sm:w-28" aria-hidden="true">
          <ProgressBar value={m?.mastery ?? 0} />
        </div>
        <span className="w-12 text-right text-sm font-bold tabular-nums">
          {m && m.attempts ? `${m.mastery}%` : '–'}
          <span className="sr-only"> mastery</span>
        </span>
        <Badge tone={LEVEL_TONE[level.id]} className="min-w-[6.5rem] justify-center">
          {level.label}
        </Badge>
      </div>
    </li>
  );
}

export function TopicsTab({ yearLevel, mastery, name }: { yearLevel: number | undefined; mastery: { byTopic: Map<string, MasteryRecord>; loading: boolean }; name: string }) {
  const curricula = curriculaFor(yearLevel);
  const [subject, setSubject] = useState<Subject>(curricula[0]?.subject ?? 'maths');
  const [sort, setSort] = useState<Sort>('curriculum');
  const [onlyPractised, setOnlyPractised] = useState(false);
  const today = nzDateKey();
  const curriculum = curricula.find((c) => c.subject === subject) ?? curricula[0];

  if (mastery.loading) return <Spinner />;
  if (!curriculum) return <EmptyState title="No topics for this year level yet" />;

  const practised = (t: Topic) => (mastery.byTopic.get(t.id)?.attempts ?? 0) > 0;
  const visible = curriculum.topics.filter((t) => !onlyPractised || practised(t));
  const needsWork = curriculum.topics.filter((t) => {
    const m = mastery.byTopic.get(t.id);
    return m && m.attempts > 0 && m.mastery < 50;
  }).length;
  const strandTitle = new Map(curriculum.strands.map((s) => [s.id, s.title]));

  const weakestFirst = [...visible].sort((a, b) => {
    const ma = mastery.byTopic.get(a.id);
    const mb = mastery.byTopic.get(b.id);
    const pa = ma && ma.attempts > 0;
    const pb = mb && mb.attempts > 0;
    if (pa !== pb) return pa ? -1 : 1; // practised topics first, then not started
    return (ma?.mastery ?? 0) - (mb?.mastery ?? 0);
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {curricula.length > 1 ? (
          <Tabs value={subject} onChange={setSubject} options={curricula.map((c) => ({ value: c.subject, label: subjectLabel(c.subject) }))} />
        ) : (
          <h2 className="text-lg font-bold">{subjectLabel(curriculum.subject)}</h2>
        )}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            <span className="font-semibold">Sort</span>
            <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="w-auto py-1.5 text-sm">
              <option value="curriculum">Curriculum order</option>
              <option value="weakest">Weakest first</option>
            </Select>
          </label>
          <label className="flex items-center gap-2 font-semibold">
            <input type="checkbox" className="size-4 accent-brand-700" checked={onlyPractised} onChange={(e) => setOnlyPractised(e.target.checked)} />
            Only practised
          </label>
        </div>
      </div>

      <Card className="mb-5 py-3 text-sm">
        <p>
          {/\.$/.test(curriculum.basis) ? curriculum.basis : `${curriculum.basis}.`}{' '}
          {needsWork > 0 ? (
            <>
              <b>{plural(needsWork, 'practised topic')}</b> {needsWork === 1 ? 'is' : 'are'} below Consolidating — good ones for {name} to revisit.
            </>
          ) : (
            <>No practised topics are below Consolidating.</>
          )}
        </p>
        <p className="mt-1 text-xs text-muted">Mastery estimates how likely {name} is to get a harder question right. The top levels need at least 5–10 answers.</p>
      </Card>

      {!visible.length ? (
        <EmptyState title="Nothing practised yet">
          {name} hasn’t answered any {subjectLabel(curriculum.subject).toLowerCase()} questions so far.
        </EmptyState>
      ) : sort === 'weakest' ? (
        <ul className="grid grid-cols-1 gap-2">
          {weakestFirst.map((t) => (
            <TopicRow key={t.id} topic={t} m={mastery.byTopic.get(t.id)} strand={strandTitle.get(t.strandId)} today={today} />
          ))}
        </ul>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {curriculum.strands.map((s) => {
            const topics = visible.filter((t) => t.strandId === s.id);
            if (!topics.length) return null;
            return (
              <section key={s.id} aria-labelledby={`strand-${s.id}`}>
                <h3 id={`strand-${s.id}`} className="mb-2 font-bold">
                  {s.title}
                </h3>
                <ul className="grid grid-cols-1 gap-2">
                  {topics.map((t) => (
                    <TopicRow key={t.id} topic={t} m={mastery.byTopic.get(t.id)} today={today} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
