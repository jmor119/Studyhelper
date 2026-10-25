import { nzDateKey, type Goal, type GoalMetric, type GoalPeriod } from '@study-helper/shared';
import { addDoc, collection, deleteDoc, deleteField, doc, updateDoc } from 'firebase/firestore';
import { Archive, Gift, Pause, Pencil, Play, Plus, RotateCcw, Trash2, Trophy } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { errorMessage } from '../../lib/api';
import { db } from '../../lib/firebase';
import { Badge, Button, Card, Field, Input, Modal, Notice, ProgressBar, Select, Spinner, useToast } from '../ui';
import { CardTitle } from './bits';
import { formatDate, GOAL_STATUS, goalProgress, metricInfo, METRICS, periodLabel, PERIODS, plural, suggestGoalTitle, unitFor } from './format';

type GoalRow = Goal & { id: string };

const MAX_TARGET = 100_000;

function parseTarget(raw: string): number | null {
  if (!/^\d+$/.test(raw.trim())) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) && n > 0 && n <= MAX_TARGET ? n : null;
}

function targetProblem(raw: string, metric: GoalMetric, period: GoalPeriod): string | null {
  const n = parseTarget(raw);
  if (n === null) return `Enter a whole number from 1 to ${MAX_TARGET.toLocaleString('en-NZ')}.`;
  if (metric === 'sessions' && period === 'day' && n > 1) return 'Each day can only count once — use 1, or choose “Every week”.';
  return null;
}

// ---------------- Create ----------------

function CreateGoalForm({ uid, parentUid, name }: { uid: string; parentUid: string; name: string }) {
  const formId = useId();
  const toast = useToast();
  const [metric, setMetric] = useState<GoalMetric>('questions');
  const [period, setPeriod] = useState<GoalPeriod>('day');
  const [target, setTarget] = useState('20');
  const [title, setTitle] = useState('');
  const [titleEdited, setTitleEdited] = useState(false);
  const [reward, setReward] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const suggested = suggestGoalTitle(metric, parseTarget(target) ?? 0, period);
  const effectiveTitle = (titleEdited ? title : suggested).trim();
  const tProblem = targetProblem(target, metric, period);
  const titleProblem = !effectiveTitle ? 'Give the goal a title.' : effectiveTitle.length > 80 ? 'Keep the title under 80 characters.' : null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const n = parseTarget(target);
    if (tProblem || titleProblem || n === null || busy) return;
    setBusy(true);
    setError('');
    try {
      // Only these keys are allowed by the security rules; progress is tracked by the server.
      await addDoc(collection(db, 'students', uid, 'goals'), {
        title: effectiveTitle,
        metric,
        target: n,
        period,
        ...(reward.trim() ? { reward: reward.trim() } : {}),
        createdBy: parentUid,
        createdAt: Date.now(),
        progress: 0,
        status: 'active',
      });
      toast(`Goal set for ${name}`, 'good');
      setTitle('');
      setTitleEdited(false);
      setReward('');
      setSubmitted(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card as="section">
      <CardTitle icon={<Plus className="size-5 text-brand-700 dark:text-brand-300" aria-hidden="true" />}>Set a new goal</CardTitle>
      <form id={formId} onSubmit={submit} className="mt-3 grid grid-cols-1 gap-4" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-1">
          <Field label="What counts" hint={metricInfo(metric).hint}>
            <Select value={metric} onChange={(e) => setMetric(e.target.value as GoalMetric)}>
              {METRICS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Target" error={submitted || target ? tProblem : null}>
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_TARGET}
              step={1}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              aria-invalid={!!tProblem}
              required
            />
          </Field>
          <Field label="How often" hint={PERIODS.find((p) => p.value === period)?.hint}>
            <Select value={period} onChange={(e) => setPeriod(e.target.value as GoalPeriod)}>
              {PERIODS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Title" hint={titleEdited ? `${name} sees this on their home screen.` : 'Suggested from your choices — edit it if you like.'} error={submitted ? titleProblem : null}>
          <Input
            value={titleEdited ? title : suggested}
            onChange={(e) => {
              setTitleEdited(true);
              setTitle(e.target.value);
            }}
            maxLength={80}
            required
          />
        </Field>
        <Field label="Reward (optional)" hint="Something to look forward to, like “Pick the Friday movie” or “$5 pocket money”.">
          <Input value={reward} onChange={(e) => setReward(e.target.value)} maxLength={200} />
        </Field>
        {error && <Notice tone="bad">{error}</Notice>}
        <div>
          <Button type="submit" loading={busy} icon={<Plus className="size-4" />}>
            Add goal
          </Button>
        </div>
      </form>
    </Card>
  );
}

// ---------------- List & edit ----------------

function EditGoalForm({ uid, goal, onDone }: { uid: string; goal: GoalRow; onDone: () => void }) {
  const toast = useToast();
  const [title, setTitle] = useState(goal.title);
  const [target, setTarget] = useState(String(goal.target));
  const [reward, setReward] = useState(goal.reward ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const tProblem = targetProblem(target, goal.metric, goal.period);
  const titleProblem = !title.trim() ? 'Give the goal a title.' : null;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const n = parseTarget(target);
    if (tProblem || titleProblem || n === null) return;
    setBusy(true);
    setError('');
    try {
      // Only title, target, reward and status may change.
      await updateDoc(doc(db, 'students', uid, 'goals', goal.id), {
        title: title.trim(),
        target: n,
        reward: reward.trim() ? reward.trim() : deleteField(),
      });
      toast('Goal updated', 'good');
      onDone();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="mt-3 grid grid-cols-1 gap-3 rounded-xl bg-canvas p-3" noValidate>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
        <Field label="Title" error={titleProblem}>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} required />
        </Field>
        <Field label="Target" error={tProblem}>
          <Input type="number" inputMode="numeric" min={1} max={MAX_TARGET} step={1} value={target} onChange={(e) => setTarget(e.target.value)} required />
        </Field>
      </div>
      <Field label="Reward (optional)">
        <Input value={reward} onChange={(e) => setReward(e.target.value)} maxLength={200} />
      </Field>
      {error && <Notice tone="bad">{error}</Notice>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" loading={busy}>
          Save changes
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function GoalItem({ uid, goal, today, onDelete }: { uid: string; goal: GoalRow; today: string; onDelete: (g: GoalRow) => void }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const p = goalProgress(goal, today);
  const status = GOAL_STATUS[goal.status];
  const recurring = goal.period !== 'once';
  const finishedOnce = goal.period === 'once' && goal.lastAchievedPeriod === 'once';

  const setStatus = async (next: Goal['status'], message: string) => {
    setBusy(true);
    try {
      await updateDoc(doc(db, 'students', uid, 'goals', goal.id), { status: next });
      toast(message, 'neutral');
    } catch (err) {
      toast(errorMessage(err), 'bad');
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold break-words">{goal.title}</p>
          <p className="text-sm text-muted">
            {metricInfo(goal.metric).label} · {periodLabel(goal.period)} · target {goal.target.toLocaleString('en-NZ')}
          </p>
        </div>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>

      {goal.status !== 'archived' && (
        <div className="mt-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
            <span className="font-semibold">
              {Math.min(p.current, goal.target).toLocaleString('en-NZ')}/{goal.target.toLocaleString('en-NZ')} {unitFor(goal.metric, goal.target)}
              {p.periodText && ` ${p.periodText}`}
            </span>
            {recurring && p.achievedThisPeriod && goal.status === 'active' && <span className="font-semibold text-good">Done {p.periodText} ✓</span>}
          </div>
          <div aria-hidden="true">
            <ProgressBar className="mt-1.5" tone="good" value={p.current} max={goal.target} />
          </div>
        </div>
      )}

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        {goal.reward && (
          <li className="flex items-center gap-1">
            <Gift className="size-4 text-xp" aria-hidden="true" /> {goal.reward}
          </li>
        )}
        {recurring && (
          <li className="flex items-center gap-1">
            <Trophy className="size-4 text-xp" aria-hidden="true" />
            {goal.achievedCount ? `Achieved ${plural(goal.achievedCount, 'time')}` : 'Not achieved yet'}
          </li>
        )}
        {goal.achievedAt && <li>{recurring ? 'Last achieved' : 'Achieved'} {formatDate(goal.achievedAt)}</li>}
        <li>Set {formatDate(goal.createdAt)}</li>
      </ul>

      {editing ? (
        <EditGoalForm uid={uid} goal={goal} onDone={() => setEditing(false)} />
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {goal.status !== 'archived' && (
            <Button size="sm" variant="secondary" icon={<Pencil className="size-4" />} onClick={() => setEditing(true)}>
              Edit
            </Button>
          )}
          {goal.status === 'active' && (
            <Button size="sm" variant="secondary" icon={<Pause className="size-4" />} loading={busy} onClick={() => setStatus('paused', 'Goal paused')}>
              Pause
            </Button>
          )}
          {goal.status === 'paused' && (
            <Button size="sm" variant="secondary" icon={<Play className="size-4" />} loading={busy} onClick={() => setStatus('active', 'Goal resumed')}>
              Resume
            </Button>
          )}
          {goal.status !== 'archived' ? (
            <Button size="sm" variant="ghost" icon={<Archive className="size-4" />} loading={busy} onClick={() => setStatus('archived', 'Goal archived')}>
              Archive
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              icon={<RotateCcw className="size-4" />}
              loading={busy}
              onClick={() => setStatus(finishedOnce ? 'achieved' : 'paused', 'Goal restored')}
            >
              Restore
            </Button>
          )}
          <Button size="sm" variant="ghost" className="text-bad" icon={<Trash2 className="size-4" />} onClick={() => onDelete(goal)}>
            Delete
          </Button>
        </div>
      )}
    </li>
  );
}

export function GoalsTab({
  uid,
  parentUid,
  name,
  goals,
}: {
  uid: string;
  parentUid: string;
  name: string;
  goals: { data: GoalRow[]; loading: boolean; error: Error | null };
}) {
  const toast = useToast();
  const today = nzDateKey();
  const [deleting, setDeleting] = useState<GoalRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await deleteDoc(doc(db, 'students', uid, 'goals', deleting.id));
      toast('Goal deleted', 'neutral');
      setDeleting(null);
    } catch (err) {
      toast(errorMessage(err), 'bad');
    } finally {
      setDeleteBusy(false);
    }
  };

  const groups: { title: string; items: GoalRow[] }[] = [
    { title: 'Active', items: goals.data.filter((g) => g.status === 'active') },
    { title: 'Paused', items: goals.data.filter((g) => g.status === 'paused') },
    { title: 'Achieved', items: goals.data.filter((g) => g.status === 'achieved') },
  ];
  const archived = goals.data.filter((g) => g.status === 'archived');

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-start">
      <div className="order-2 grid min-w-0 grid-cols-1 gap-5 lg:order-1">
        {goals.loading ? (
          <Spinner label="Loading goals" />
        ) : goals.error ? (
          <Notice tone="bad">We couldn’t load {name}’s goals.</Notice>
        ) : !goals.data.length ? (
          <Card>
            <p className="font-semibold">No goals yet</p>
            <p className="mt-1 text-sm text-muted">
              Goals show on {name}’s home screen with a progress bar, and they get a message when they reach one. Progress is counted automatically as they study.
            </p>
          </Card>
        ) : (
          <>
            {groups.map((g) =>
              g.items.length ? (
                <section key={g.title} aria-labelledby={`goals-${g.title}`}>
                  <h2 id={`goals-${g.title}`} className="mb-2 font-bold">
                    {g.title} <span className="font-normal text-muted">({g.items.length})</span>
                  </h2>
                  <ul className="grid grid-cols-1 gap-3">
                    {g.items.map((goal) => (
                      <GoalItem key={goal.id} uid={uid} goal={goal} today={today} onDelete={setDeleting} />
                    ))}
                  </ul>
                </section>
              ) : null,
            )}
            {archived.length > 0 && (
              <details>
                <summary className="cursor-pointer font-bold">
                  Archived <span className="font-normal text-muted">({archived.length})</span>
                </summary>
                <ul className="mt-2 grid grid-cols-1 gap-3">
                  {archived.map((goal) => (
                    <GoalItem key={goal.id} uid={uid} goal={goal} today={today} onDelete={setDeleting} />
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </div>
      <div className="order-1 min-w-0 lg:order-2">
        <CreateGoalForm uid={uid} parentUid={parentUid} name={name} />
      </div>

      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete this goal?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Keep it
            </Button>
            <Button variant="danger" loading={deleteBusy} onClick={confirmDelete}>
              Delete goal
            </Button>
          </>
        }
      >
        <p>
          “{deleting?.title}” will be removed for {name}, along with its progress{deleting?.achievedCount ? ' and achievement count' : ''}. To keep a record
          instead, archive it.
        </p>
      </Modal>
    </div>
  );
}
