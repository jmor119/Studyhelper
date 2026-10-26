import { collection, limit, orderBy, query } from 'firebase/firestore';
import { ChevronRight, ClipboardCheck, Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { ChoiceGroup } from '../../components/study/Choices';
import { GRADE_TONE, summariseResults, type ExamDoc } from '../../components/study/exam';
import { formatDateTime, formatDuration, plural } from '../../components/study/format';
import { TopicPicker } from '../../components/study/TopicPicker';
import { Badge, Button, Card, EmptyState, Field, Input, Notice, PageHeader, Spinner } from '../../components/ui';
import { api } from '../../lib/api';
import { useUser } from '../../lib/auth';
import { db } from '../../lib/firebase';
import { useAsync, useQuery } from '../../lib/hooks';
import { curriculaFor, useStudySettings } from '../../lib/study';

/** startExam accepts at most this many topics. */
const MAX_TOPICS = 40;
const DURATIONS = [20, 30, 45, 60, 90];

type SubjectChoice = 'maths' | 'science' | 'both';

function NewExamForm({ onCancel }: { onCancel?: () => void }) {
  const { user, profile } = useUser();
  const navigate = useNavigate();
  const curricula = curriculaFor(profile.yearLevel);
  const settings = useStudySettings(user.uid);
  const [subject, setSubject] = useState<SubjectChoice>(curricula[0]?.subject ?? 'maths');
  const [picked, setPicked] = useState<string[] | null>(null);
  const [duration, setDuration] = useState(45);
  // Primary and intermediate maths (Years 6–7) is all non-calculator, so start there.
  const [calculator, setCalculator] = useState<'allowed' | 'not-allowed'>(() =>
    curricula.length && curricula.every((c) => c.topics.every((t) => t.calculator === 'not-allowed')) ? 'not-allowed' : 'allowed',
  );
  const [title, setTitle] = useState('');
  const start = useAsync(api.startExam);

  const scope = subject === 'both' ? curricula : curricula.filter((c) => c.subject === subject);
  const scopeIds = scope.flatMap((c) => c.topics.map((t) => t.id));
  const school = new Set(settings.data?.schoolTopics ?? []);
  const schoolInScope = scopeIds.filter((id) => school.has(id));
  // Until the student changes the selection, default to their school's topics (or everything).
  const selected = picked ?? (schoolInScope.length ? schoolInScope : scopeIds);
  const tooMany = selected.length > MAX_TOPICS;

  const subjectOptions: { value: SubjectChoice; label: string }[] = [
    ...curricula.map((c) => ({ value: c.subject, label: c.subject === 'maths' ? 'Maths' : 'Science' })),
    ...(curricula.length > 1 ? [{ value: 'both' as const, label: 'Both' }] : []),
  ];

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected.length || tooMany) return;
    const res = await start.run({
      topicIds: selected,
      durationMinutes: duration,
      calculator,
      ...(title.trim() && { title: title.trim() }),
    });
    if (res) navigate(`/exams/${res.examId}`);
  };

  return (
    <Card as="section" className="mb-6">
      <h2 className="text-lg font-bold">New mock exam</h2>
      <p className="mt-0.5 text-sm text-muted">About one mark per minute, like a real school exam. Your answers are saved on this device as you go.</p>
      <form onSubmit={submit} className="mt-5 grid grid-cols-1 gap-5">
        <ChoiceGroup
          name="exam-subject"
          label="Subject"
          value={subject}
          onChange={(s) => {
            setSubject(s);
            setPicked(null);
          }}
          options={subjectOptions}
        />
        <TopicPicker curricula={scope} selected={selected} onChange={setPicked} starred={school} max={MAX_TOPICS} />
        {tooMany && (
          <Notice tone="warn">
            A mock exam can cover up to {MAX_TOPICS} topics. Untick {selected.length - MAX_TOPICS} or try one subject at a time.
          </Notice>
        )}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <ChoiceGroup
            name="exam-duration"
            label="How long?"
            value={duration}
            onChange={setDuration}
            options={DURATIONS.map((d) => ({ value: d, label: `${d} min` }))}
          />
          <ChoiceGroup
            name="exam-calculator"
            label="Calculator"
            value={calculator}
            onChange={setCalculator}
            options={[
              { value: 'allowed', label: 'Allowed' },
              { value: 'not-allowed', label: 'Not allowed' },
            ]}
            hint={calculator === 'not-allowed' ? 'Only questions you can do without a calculator.' : undefined}
          />
        </div>
        <Field label="Name (optional)" hint="e.g. “Term 4 maths test”">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Mock exam" />
        </Field>
        {start.error && <Notice tone="bad">{start.error}</Notice>}
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" size="lg" loading={start.loading} disabled={!selected.length || tooMany} icon={<ClipboardCheck className="size-5" />}>
            Start exam
          </Button>
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <span className="text-sm text-muted">The timer starts straight away.</span>
        </div>
      </form>
    </Card>
  );
}

function ExamStatus({ exam, now }: { exam: ExamDoc; now: number }) {
  if (exam.status === 'in-progress') {
    const left = exam.endsAt - now;
    return left > 0 ? (
      <div className="text-right">
        <Badge tone="warn">In progress</Badge>
        <p className="mt-1 text-sm text-muted">{formatDuration(left)} left · Resume</p>
      </div>
    ) : (
      <div className="text-right">
        <Badge tone="warn">Time’s up</Badge>
        <p className="mt-1 text-sm text-muted">Open to hand it in</p>
      </div>
    );
  }
  if (exam.status === 'marking' || !exam.results) return <Badge tone="info">Marking…</Badge>;
  const s = summariseResults(exam.results);
  return (
    <div className="flex items-center gap-3">
      <div className="text-right">
        <p className="font-bold tabular-nums">
          {s.awarded}/{s.available} <span className="font-semibold text-muted">· {s.percent}%</span>
        </p>
        {s.pendingReview > 0 && <p className="text-xs font-semibold text-muted">{plural(s.pendingReview, 'answer')} to mark</p>}
      </div>
      <Badge tone={GRADE_TONE[s.grade.grade] ?? 'neutral'} className="px-3 py-1 text-sm">
        <span className="sr-only">Grade </span>
        {s.grade.grade}
      </Badge>
    </div>
  );
}

export default function Exams() {
  const { user } = useUser();
  const exams = useQuery<ExamDoc>(query(collection(db, 'students', user.uid, 'exams'), orderBy('startedAt', 'desc'), limit(50)), `exams:${user.uid}`);
  const [formOpen, setFormOpen] = useState<boolean | null>(null);
  const showForm = formOpen ?? (!exams.loading && exams.data.length === 0);
  const now = Date.now();

  return (
    <div>
      <PageHeader
        title="Mock exams"
        subtitle="Practise under exam conditions: a timer, no hints, and your marks at the end."
        actions={
          !showForm && (
            <Button onClick={() => setFormOpen(true)} icon={<Plus className="size-4" />}>
              New mock exam
            </Button>
          )
        }
      />
      {showForm && <NewExamForm onCancel={exams.data.length ? () => setFormOpen(false) : undefined} />}

      {exams.loading ? (
        <Spinner label="Loading your exams" />
      ) : exams.error ? (
        <Notice tone="bad">Couldn’t load your exams. Check your connection and try again.</Notice>
      ) : !exams.data.length ? (
        !showForm && <EmptyState title="No mock exams yet">Start one when you’re ready — even a 20-minute exam is great practice.</EmptyState>
      ) : (
        <Card as="section" className="p-0">
          <h2 className="border-b border-line px-5 py-3 font-bold">Your exams</h2>
          <ul className="divide-y divide-line">
            {exams.data.map((exam) => (
              <li key={exam.id}>
                <Link
                  to={exam.status === 'in-progress' ? `/exams/${exam.id}` : `/exams/${exam.id}/results`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{exam.title}</p>
                    <p className="text-sm text-muted">
                      {formatDateTime(exam.startedAt)} · {plural(exam.questionCount, 'question')} · {exam.durationMinutes} min
                      {exam.calculator === 'not-allowed' && ' · no calculator'}
                    </p>
                  </div>
                  <ExamStatus exam={exam} now={now} />
                  <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
