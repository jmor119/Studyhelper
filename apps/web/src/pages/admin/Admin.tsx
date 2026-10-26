import { describeAnswer, getTopic, toPublicQuestion, type Question, type QuestionSource, type QuestionStatus } from '@study-helper/shared';
import { Archive, CheckCircle2, Flag, RefreshCw, ShieldQuestion } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Markdown } from '../../components/Markdown';
import { emptyResponse, QuestionView } from '../../components/question/QuestionView';
import { Badge, Button, Card, EmptyState, Notice, PageHeader, Spinner, Tabs, useToast } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';

type QueueStatus = 'flagged' | 'unverified' | 'pending';
type Item = Awaited<ReturnType<typeof api.adminReviewQueue>>['items'][number];
type Stats = Awaited<ReturnType<typeof api.adminStats>>;

const TABS: { value: QueueStatus; label: string }[] = [
  { value: 'flagged', label: 'Flagged' },
  { value: 'unverified', label: 'Unverified (AI)' },
  { value: 'pending', label: 'Pending (contributed)' },
];

const TILES: { key: string; label: string; tone: string }[] = [
  { key: 'verified', label: 'Verified', tone: 'text-good' },
  { key: 'unverified', label: 'Unverified', tone: 'text-xp' },
  { key: 'pending', label: 'Pending', tone: 'text-sky-600 dark:text-sky-400' },
  { key: 'flagged', label: 'Flagged (hidden)', tone: 'text-bad' },
  { key: 'retired', label: 'Retired', tone: 'text-muted' },
];

const SOURCE_LABEL: Record<string, string> = { seed: 'Seed bank', template: 'Template', ai: 'AI-generated', contributed: 'Contributed' };
const FLAG_LABEL: Record<string, string> = {
  'wrong-answer': 'The answer is wrong',
  unclear: 'Unclear',
  typo: 'Typo',
  'too-hard': 'Not right for the year level',
  inappropriate: 'Inappropriate',
  other: 'Other',
};

// Fields already shown by QuestionView (or as metadata); everything else is answer/marking data.
const SHOWN = new Set(['id', 'type', 'subject', 'yearLevel', 'topicId', 'difficulty', 'marks', 'calculator', 'stem', 'groupId', 'part', 'prompt', 'figure', 'hints', 'tags', 'solution', 'options', 'items', 'shuffle']);

function answerFields(q: Question): [string, unknown][] {
  return Object.entries(q).filter(([k, v]) => !SHOWN.has(k) && v !== undefined);
}

function FieldValue({ value }: { value: unknown }) {
  if (typeof value === 'string') return <Markdown inline>{value}</Markdown>;
  if (typeof value === 'number' || typeof value === 'boolean') return <code className="font-mono">{String(value)}</code>;
  return <pre className="overflow-x-auto rounded-lg bg-canvas p-2 font-mono text-xs whitespace-pre-wrap">{JSON.stringify(value, null, 2)}</pre>;
}

export default function Admin() {
  const toast = useToast();
  const [tab, setTab] = useState<QueueStatus>('flagged');
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const loadStats = useCallback(() => {
    api
      .adminStats({})
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  const loadQueue = useCallback((status: QueueStatus) => {
    setItems(null);
    setError('');
    api
      .adminReviewQueue({ status, limit: 30 })
      .then((r) => setItems(r.items))
      .catch((e) => setError(errorMessage(e)));
  }, []);

  useEffect(loadStats, [loadStats]);
  useEffect(() => loadQueue(tab), [tab, loadQueue]);

  const decide = async (item: Item, status: QuestionStatus) => {
    setBusy(`${item.id}:${status}`);
    try {
      await api.adminSetQuestionStatus({ questionId: item.id, status });
      setItems((list) => list?.filter((x) => x.id !== item.id) ?? null);
      toast(status === 'verified' ? 'Verified.' : status === 'retired' ? 'Retired.' : 'Marked unverified.', 'good');
      loadStats();
    } catch (e) {
      toast(errorMessage(e), 'bad');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Question review"
        subtitle="Check questions before they reach (or go back to) everyone’s practice."
        actions={
          <Button
            variant="secondary"
            icon={<RefreshCw className="size-4" />}
            onClick={() => {
              loadStats();
              loadQueue(tab);
            }}
          >
            Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {TILES.map((t) => (
          <Card key={t.key} className="p-4">
            <p className="text-xs font-semibold text-muted">{t.label}</p>
            <p className={`mt-1 text-2xl font-extrabold ${t.tone}`}>{stats ? (stats.counts[t.key] ?? 0).toLocaleString('en-NZ') : '–'}</p>
          </Card>
        ))}
        <Card className="p-4">
          <p className="text-xs font-semibold text-muted">Open flags</p>
          <p className="mt-1 text-2xl font-extrabold text-bad">{stats ? stats.openFlags.toLocaleString('en-NZ') : '–'}</p>
        </Card>
      </div>

      <Tabs className="mt-6" value={tab} onChange={setTab} options={TABS} />

      <div className="mt-4 grid grid-cols-1 gap-4" role="tabpanel" aria-label={TABS.find((t) => t.value === tab)?.label}>
        {error ? (
          <Notice tone="bad">{error}</Notice>
        ) : !items ? (
          <Spinner />
        ) : !items.length ? (
          <EmptyState icon={<CheckCircle2 className="size-10" />} title="All clear">
            Nothing waiting in this queue.
          </EmptyState>
        ) : (
          items.map((item) => <ReviewCard key={item.id} item={item} tab={tab} busy={busy} onDecide={decide} />)
        )}
      </div>
    </div>
  );
}

function ReviewCard({ item, tab, busy, onDecide }: { item: Item; tab: QueueStatus; busy: string | null; onDecide: (item: Item, status: QuestionStatus) => void }) {
  const q = item.question;
  const pub = useMemo(() => toPublicQuestion(q, { status: item.status as QuestionStatus, source: item.source as QuestionSource }), [q, item.status, item.source]);
  const response = useMemo(() => emptyResponse(pub), [pub]);
  const topic = getTopic(q.topicId);
  let answer = '';
  try {
    answer = describeAnswer(q);
  } catch {
    answer = '(couldn’t describe the answer)';
  }
  const fields = answerFields(q);
  const disabled = !!busy;

  return (
    <Card as="article" className="min-w-0">
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <code className="min-w-0 truncate rounded bg-canvas px-1.5 py-0.5 font-mono text-xs">{item.id}</code>
        <Badge tone="info">{SOURCE_LABEL[item.source] ?? item.source}</Badge>
        <Badge>{q.type}</Badge>
        <span className="min-w-0 truncate text-muted">
          {topic?.title ?? q.topicId} · Year {q.yearLevel}
        </span>
      </div>

      {item.flags.length > 0 && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 dark:border-rose-900 dark:bg-rose-950/30">
          <p className="flex items-center gap-1.5 text-sm font-bold text-rose-800 dark:text-rose-200">
            <Flag className="size-4" aria-hidden /> {item.flags.length} open flag{item.flags.length === 1 ? '' : 's'}
          </p>
          <ul className="mt-1.5 grid grid-cols-1 gap-1 text-sm">
            {item.flags.map((f, i) => (
              <li key={i}>
                <b>{FLAG_LABEL[f.reason] ?? f.reason}</b>
                {f.comment && <span className="text-muted"> — “{f.comment}”</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <QuestionView question={pub} value={response} onChange={() => undefined} disabled result={q.type === 'mcq' ? { correct: true, expected: answer } : null} />

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="min-w-0 rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950/30">
          <p className="text-sm font-bold">Answer</p>
          <Markdown className="mt-1">{answer || '—'}</Markdown>
          {fields.length > 0 && (
            <dl className="mt-3 grid grid-cols-1 gap-2 text-sm">
              {fields.map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <dt className="font-mono text-xs font-semibold text-muted">{k}</dt>
                  <dd className="min-w-0">
                    <FieldValue value={v} />
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
        <div className="min-w-0 rounded-xl bg-canvas p-3">
          <p className="text-sm font-bold">Worked solution</p>
          <Markdown className="mt-1">{q.solution || '—'}</Markdown>
          {q.hints.length > 0 && (
            <>
              <p className="mt-3 text-sm font-bold">Hints</p>
              <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm">
                {q.hints.map((h, i) => (
                  <li key={i}>
                    <Markdown inline>{h}</Markdown>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
        <Button variant="success" icon={<CheckCircle2 className="size-4" />} loading={busy === `${item.id}:verified`} disabled={disabled} onClick={() => onDecide(item, 'verified')}>
          Verify
        </Button>
        <Button variant="secondary" icon={<ShieldQuestion className="size-4" />} loading={busy === `${item.id}:unverified`} disabled={disabled} onClick={() => onDecide(item, 'unverified')}>
          {tab === 'pending' ? 'Publish as unverified' : 'Keep unverified'}
        </Button>
        <Button variant="danger" icon={<Archive className="size-4" />} loading={busy === `${item.id}:retired`} disabled={disabled} onClick={() => onDecide(item, 'retired')}>
          Retire
        </Button>
      </div>
    </Card>
  );
}
