import { addDays, buildStudyPlan, daysBetween, formatDateKey, getTopic, nzDateKey, weekday, type PlanDay, type PlanItem } from '@study-helper/shared';
import clsx from 'clsx';
import { collection, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { BookOpen, CalendarDays, ClipboardCheck, Dumbbell, GraduationCap, Layers, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router';
import { ChoiceGroup, ToggleChips } from '../../components/study/Choices';
import { plural } from '../../components/study/format';
import { TopicPicker } from '../../components/study/TopicPicker';
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Notice, PageHeader, Select, Spinner, useToast } from '../../components/ui';
import { useUser } from '../../lib/auth';
import { db } from '../../lib/firebase';
import { useQuery } from '../../lib/hooks';
import { curriculaFor, useMastery, useStudySettings } from '../../lib/study';

type PlanSubject = 'maths' | 'science' | 'mixed';

/** students/{uid}/plans/{planId} — exactly the fields the security rules allow. */
interface PlanDoc {
  title: string;
  subject: PlanSubject;
  examDate: string;
  topicIds: string[];
  minutesPerDay: number;
  restDays: number[];
  createdAt: number;
  updatedAt: number;
}
type Plan = PlanDoc & { id: string };

const MAX_TOPICS = 60;
const MINUTES = [10, 15, 20, 30, 45, 60, 90, 120, 180, 240];
const WEEKDAYS = [
  { value: 1, label: 'Mon', name: 'Monday' },
  { value: 2, label: 'Tue', name: 'Tuesday' },
  { value: 3, label: 'Wed', name: 'Wednesday' },
  { value: 4, label: 'Thu', name: 'Thursday' },
  { value: 5, label: 'Fri', name: 'Friday' },
  { value: 6, label: 'Sat', name: 'Saturday' },
  { value: 0, label: 'Sun', name: 'Sunday' },
];
const SUBJECT_NAME: Record<PlanSubject, string> = { maths: 'Maths', science: 'Science', mixed: 'Maths & Science' };
const FUTURE_DAYS_SHOWN = 14;

const KIND_ICON: Record<PlanItem['kind'], ReactNode> = {
  learn: <BookOpen className="size-5" aria-hidden />,
  practice: <Dumbbell className="size-5" aria-hidden />,
  flashcards: <Layers className="size-5" aria-hidden />,
  'mock-exam': <ClipboardCheck className="size-5" aria-hidden />,
  review: <RotateCcw className="size-5" aria-hidden />,
  rest: <CalendarDays className="size-5" aria-hidden />,
};

function itemLink(item: PlanItem): string {
  switch (item.kind) {
    case 'learn':
      return item.topicId ? `/learn/${item.topicId}` : '/learn';
    case 'practice':
      return item.topicId ? `/practice/${item.topicId}` : '/learn';
    case 'flashcards':
      return '/flashcards';
    case 'mock-exam':
      return '/exams';
    case 'review':
      return '/mistakes';
    default:
      return '/home';
  }
}

function countdown(days: number): string {
  if (days > 1) return `${days} days to go`;
  if (days === 1) return 'Tomorrow!';
  if (days === 0) return 'Today — kia kaha!';
  return 'Finished';
}

export default function Planner() {
  const { user, profile } = useUser();
  const plans = useQuery<PlanDoc>(collection(db, 'students', user.uid, 'plans'), `plans:${user.uid}`);
  const today = nzDateKey();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Plan | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Plan | null>(null);
  const toast = useToast();

  // Upcoming exams first (soonest first), then finished ones (most recent first).
  const sorted = useMemo(
    () =>
      [...plans.data].sort((a, b) => {
        const au = a.examDate >= today;
        const bu = b.examDate >= today;
        if (au !== bu) return au ? -1 : 1;
        return au ? a.examDate.localeCompare(b.examDate) : b.examDate.localeCompare(a.examDate);
      }),
    [plans.data, today],
  );
  const selected = sorted.find((p) => p.id === selectedId) ?? sorted[0];

  const remove = (plan: Plan) => {
    deleteDoc(doc(db, 'students', user.uid, 'plans', plan.id)).catch(() => toast('Couldn’t delete that plan. Try again.', 'bad'));
    setDeleting(null);
    setSelectedId(null);
    toast('Plan deleted.', 'neutral');
  };

  return (
    <div>
      <PageHeader
        title="Study planner"
        subtitle="Add an exam date and its topics — you’ll get a day-by-day plan that spends more time on your weaker topics."
        actions={
          sorted.length > 0 && (
            <Button onClick={() => setEditing('new')} icon={<Plus className="size-4" />}>
              New plan
            </Button>
          )
        }
      />

      {plans.loading ? (
        <Spinner label="Loading your plans" />
      ) : plans.error ? (
        <Notice tone="bad">Couldn’t load your plans. Check your connection and try again.</Notice>
      ) : !selected ? (
        <EmptyState
          icon={<CalendarDays className="size-10" />}
          title="No study plans yet"
          action={
            <Button onClick={() => setEditing('new')} icon={<Plus className="size-4" />}>
              Make a plan
            </Button>
          }
        >
          Got a test or exam coming up? Tell us when it is and what’s in it, and we’ll spread your revision out so you’re ready on the day.
        </EmptyState>
      ) : (
        <>
          {sorted.length > 1 && (
            <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Your plans">
              {sorted.map((p) => {
                const days = daysBetween(today, p.examDate);
                const active = p.id === selected.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedId(p.id)}
                    className={clsx(
                      'min-h-11 rounded-xl border-2 px-4 py-1.5 text-left text-sm',
                      active ? 'border-brand-600 bg-brand-50 dark:bg-brand-950' : 'border-line bg-surface hover:border-brand-300',
                      days < 0 && !active && 'opacity-70',
                    )}
                  >
                    <span className="block font-semibold">{p.title}</span>
                    <span className="block text-xs text-muted">{days < 0 ? `Finished ${formatDateKey(p.examDate)}` : countdown(days)}</span>
                  </button>
                );
              })}
            </div>
          )}
          <PlanView key={selected.id} plan={selected} today={today} uid={user.uid} onEdit={() => setEditing(selected)} onDelete={() => setDeleting(selected)} />
        </>
      )}

      {editing && (
        <PlanForm
          uid={user.uid}
          yearLevel={profile.yearLevel}
          today={today}
          plan={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(id) => {
            setEditing(null);
            setSelectedId(id);
          }}
        />
      )}

      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete this plan?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Keep it
            </Button>
            <Button variant="danger" onClick={() => deleting && remove(deleting)} icon={<Trash2 className="size-4" />}>
              Delete plan
            </Button>
          </>
        }
      >
        <p>
          “{deleting?.title}” will be removed. Your practice history and progress aren’t affected.
        </p>
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------

type TimelineDay = { date: string; items: PlanItem[]; rest: boolean };

function PlanView({ plan, today, uid, onEdit, onDelete }: { plan: Plan; today: string; uid: string; onEdit: () => void; onDelete: () => void }) {
  const mastery = useMastery(uid);
  const [showPast, setShowPast] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const daysLeft = daysBetween(today, plan.examDate);
  const startKey = nzDateKey(plan.createdAt || Date.now());

  const timeline = useMemo(() => {
    const topics = plan.topicIds.map((id) => ({ topicId: id, title: getTopic(id)?.title ?? id, mastery: mastery.byTopic.get(id)?.mastery }));
    const base = { examDate: plan.examDate, minutesPerDay: plan.minutesPerDay, restDays: plan.restDays ?? [], topics };
    // Today onwards matches the plan on the home screen; earlier days are rebuilt from when the plan was made.
    const future = buildStudyPlan({ ...base, today });
    const past = startKey < today ? buildStudyPlan({ ...base, today: startKey }).filter((d) => d.date < today) : [];
    const byDate = new Map<string, PlanDay>([...past, ...future].map((d) => [d.date, d]));
    const rest = new Set(plan.restDays ?? []);
    const first = startKey < today ? startKey : today;
    const out: TimelineDay[] = [];
    for (let d = first; d < plan.examDate; d = addDays(d, 1)) {
      const day = byDate.get(d);
      out.push({ date: d, items: day?.items ?? [], rest: !day && rest.has(weekday(d)) });
    }
    return out;
  }, [plan, today, startKey, mastery.byTopic]);

  const pastDays = timeline.filter((d) => d.date < today);
  const futureDays = timeline.filter((d) => d.date >= today);
  const visibleFuture = showAll ? futureDays : futureDays.slice(0, FUTURE_DAYS_SHOWN);
  const restNames = WEEKDAYS.filter((w) => plan.restDays?.includes(w.value)).map((w) => w.label);
  const plannedMinutes = futureDays.reduce((s, d) => s + d.items.reduce((m, i) => m + i.minutes, 0), 0);

  return (
    <div>
      <Card as="section" className="grid grid-cols-1 gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold">{plan.title}</h2>
            <Badge tone="brand">{SUBJECT_NAME[plan.subject] ?? plan.subject}</Badge>
          </div>
          <p className="mt-1 text-muted">Exam on {formatDateKey(plan.examDate)}</p>
          <p className="mt-2 text-sm text-muted">
            {plural(plan.topicIds.length, 'topic')} · {plan.minutesPerDay} min a day
            {restNames.length > 0 && <> · rest days: {restNames.join(', ')}</>}
            {daysLeft > 0 && plannedMinutes > 0 && <> · about {Math.round(plannedMinutes / 60)} h of study planned</>}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={onEdit} icon={<Pencil className="size-4" />}>
              Edit
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete} icon={<Trash2 className="size-4" />}>
              Delete
            </Button>
          </div>
        </div>
        <div className="rounded-2xl bg-brand-50 px-6 py-4 text-center text-brand-900 dark:bg-brand-950 dark:text-brand-100">
          {daysLeft > 1 ? (
            <>
              <p className="text-5xl leading-none font-extrabold">{daysLeft}</p>
              <p className="mt-1 text-sm font-semibold">days to go</p>
            </>
          ) : (
            <p className="text-xl font-extrabold">{countdown(daysLeft)}</p>
          )}
        </div>
      </Card>

      {daysLeft <= 0 ? (
        <Card className="mt-5 text-center">
          <GraduationCap className="mx-auto size-10 text-brand-700 dark:text-brand-300" aria-hidden />
          <p className="mt-2 font-semibold">{daysLeft === 0 ? 'It’s exam day. You’ve got this!' : 'This exam has been and gone — hope it went well!'}</p>
          <p className="mt-1 text-sm text-muted">Got another one coming up? Make a new plan, or edit this one with the new date.</p>
        </Card>
      ) : (
        <section className="mt-6" aria-labelledby="plan-days-heading">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 id="plan-days-heading" className="text-lg font-bold">
              Day by day
            </h2>
            {pastDays.length > 0 && (
              <Button variant="ghost" size="sm" aria-expanded={showPast} onClick={() => setShowPast((s) => !s)}>
                {showPast ? 'Hide earlier days' : `Show ${plural(pastDays.length, 'earlier day')}`}
              </Button>
            )}
          </div>
          <ol className="grid grid-cols-1 gap-3">
            {showPast && pastDays.map((d) => <DayCard key={d.date} day={d} past />)}
            {visibleFuture.map((d) => (
              <DayCard key={d.date} day={d} today={d.date === today} />
            ))}
            {(showAll || futureDays.length <= FUTURE_DAYS_SHOWN) && (
              <li className="rounded-2xl border-2 border-dashed border-brand-400 bg-surface p-4 text-center">
                <p className="font-bold">
                  <GraduationCap className="mr-1.5 inline size-5 text-brand-700 dark:text-brand-300" aria-hidden />
                  {formatDateKey(plan.examDate)} — exam day
                </p>
                <p className="text-sm text-muted">Get a good sleep the night before. Kia kaha!</p>
              </li>
            )}
          </ol>
          {futureDays.length > FUTURE_DAYS_SHOWN && (
            <div className="mt-3 text-center">
              <Button variant="secondary" onClick={() => setShowAll((s) => !s)} aria-expanded={showAll}>
                {showAll ? 'Show fewer days' : `Show all ${futureDays.length} days`}
              </Button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function DayCard({ day, today, past }: { day: TimelineDay; today?: boolean; past?: boolean }) {
  const minutes = day.items.reduce((s, i) => s + i.minutes, 0);
  return (
    <li
      aria-current={today ? 'date' : undefined}
      className={clsx(
        'rounded-2xl border bg-surface p-4',
        today ? 'border-brand-600 ring-2 ring-brand-600/25' : 'border-line',
        past && 'opacity-60',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold">
          {today ? (
            <>
              Today <span className="font-normal text-muted">· {formatDateKey(day.date)}</span>
            </>
          ) : (
            formatDateKey(day.date)
          )}
          {past && <span className="sr-only"> (past)</span>}
        </h3>
        {minutes > 0 && <span className="text-sm text-muted">{minutes} min</span>}
      </div>
      {day.items.length === 0 ? (
        <p className="mt-1 text-sm text-muted">{day.rest ? 'Rest day — recharge 😴' : 'Nothing planned.'}</p>
      ) : (
        <ul className="mt-2 grid grid-cols-1 gap-2">
          {day.items.map((item, i) => (
            <li key={i}>
              <Link
                to={itemLink(item)}
                className="flex min-h-11 items-center gap-3 rounded-xl border border-line px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5"
              >
                <span className="shrink-0 text-brand-700 dark:text-brand-300">{KIND_ICON[item.kind]}</span>
                <span className="min-w-0 flex-1 font-semibold">{item.label}</span>
                <span className="shrink-0 text-sm text-muted">{item.minutes} min</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------------------------

function PlanForm({
  uid,
  yearLevel,
  today,
  plan,
  onClose,
  onSaved,
}: {
  uid: string;
  yearLevel: number | undefined;
  today: string;
  plan: Plan | null;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const toast = useToast();
  const curricula = curriculaFor(yearLevel);
  const settings = useStudySettings(uid);
  const [title, setTitle] = useState(plan?.title ?? '');
  const [subject, setSubject] = useState<PlanSubject>(plan?.subject ?? curricula[0]?.subject ?? 'maths');
  const [examDate, setExamDate] = useState(plan?.examDate ?? addDays(today, 14));
  const [minutes, setMinutes] = useState(plan?.minutesPerDay ?? 30);
  const [restDays, setRestDays] = useState<number[]>(plan?.restDays ?? []);
  const [picked, setPicked] = useState<string[] | null>(plan?.topicIds ?? null);
  const [error, setError] = useState('');

  const scope = subject === 'mixed' ? curricula : curricula.filter((c) => c.subject === subject);
  const scopeIds = scope.flatMap((c) => c.topics.map((t) => t.id));
  const school = new Set(settings.data?.schoolTopics ?? []);
  const schoolInScope = scopeIds.filter((id) => school.has(id));
  const selected = picked ?? (schoolInScope.length ? schoolInScope : scopeIds);

  const subjectOptions: { value: PlanSubject; label: string }[] = [
    ...curricula.map((c) => ({ value: c.subject, label: c.subject === 'maths' ? 'Maths' : 'Science' })),
    ...(curricula.length > 1 || plan?.subject === 'mixed' ? [{ value: 'mixed' as const, label: 'Both' }] : []),
  ];
  const minuteOptions = MINUTES.includes(minutes) ? MINUTES : [...MINUTES, minutes].sort((a, b) => a - b);
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ block: 'nearest' });
  }, [error]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const name = title.trim();
    if (!name) return setError('Give your plan a name, e.g. “End-of-year maths exam”.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(examDate) || examDate <= today) return setError('Choose an exam date after today.');
    if (!selected.length) return setError('Choose at least one topic.');
    if (selected.length > MAX_TOPICS) return setError(`A plan can have up to ${MAX_TOPICS} topics.`);
    if (restDays.length >= 7) return setError('Leave at least one day for study.');

    const now = Date.now();
    const data: PlanDoc = {
      title: name.slice(0, 80),
      subject,
      examDate,
      topicIds: selected,
      minutesPerDay: Math.round(Math.max(10, Math.min(240, minutes))),
      restDays: [...restDays].sort((a, b) => a - b),
      createdAt: plan?.createdAt ?? now,
      updatedAt: now,
    };
    const ref = plan ? doc(db, 'students', uid, 'plans', plan.id) : doc(collection(db, 'students', uid, 'plans'));
    // The local cache updates straight away (works offline); a rejected write is reported.
    setDoc(ref, data).catch(() => toast('Couldn’t save your plan. Try again.', 'bad'));
    toast(plan ? 'Plan updated.' : 'Plan made — good luck!', 'good');
    onSaved(ref.id);
  };

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={plan ? 'Edit plan' : 'New study plan'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="plan-form">
            {plan ? 'Save changes' : 'Make my plan'}
          </Button>
        </>
      }
    >
      <form id="plan-form" onSubmit={submit} className="grid grid-cols-1 gap-5">
        {error && (
          <div ref={errorRef}>
            <Notice tone="bad">{error}</Notice>
          </div>
        )}
        <Field label="Name">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="e.g. End-of-year maths exam" required />
        </Field>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Exam date">
            <Input type="date" value={examDate} min={addDays(today, 1)} onChange={(e) => setExamDate(e.target.value)} required />
          </Field>
          <Field label="Study time each day">
            <Select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
              {minuteOptions.map((m) => (
                <option key={m} value={m}>
                  {m < 60 ? `${m} minutes` : m % 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m / 60} hour${m === 60 ? '' : 's'}`}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <ToggleChips
          label="Rest days"
          hint="Days you won’t study (sport, whānau time, part-time job…)."
          values={restDays}
          onChange={setRestDays}
          options={WEEKDAYS.map((w) => ({ value: w.value, label: w.label, ariaLabel: w.name }))}
        />
        {subjectOptions.length > 1 && (
          <ChoiceGroup
            name="plan-subject"
            label="Subject"
            value={subject}
            onChange={(s) => {
              setSubject(s);
              setPicked(null);
            }}
            options={subjectOptions}
          />
        )}
        <TopicPicker label="Topics in the exam" curricula={scope} selected={selected} onChange={setPicked} starred={school} max={MAX_TOPICS} />
      </form>
    </Modal>
  );
}
