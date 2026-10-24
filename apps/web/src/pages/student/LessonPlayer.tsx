import { getTopic, markResponse, toPublicQuestion, type Lesson, type MarkResult, type Question, type QuestionResponse } from '@study-helper/shared';
import { CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Markdown } from '../../components/Markdown';
import { emptyResponse, isAnswered, QuestionView } from '../../components/question/QuestionView';
import { Button, Card, EmptyState, PageHeader, ProgressBar, Spinner, useToast } from '../../components/ui';
import { api } from '../../lib/api';
import { loadLesson } from '../../lib/content';
import NotFound from '../shared/NotFound';

/** A quick check inside a lesson — marked in the browser, ungraded. */
function QuickCheck({ question }: { question: Question }) {
  const pub = useMemo(() => toPublicQuestion(question), [question]);
  const [response, setResponse] = useState<QuestionResponse>(() => emptyResponse(pub));
  const [result, setResult] = useState<MarkResult | null>(null);
  return (
    <div className="mt-6 rounded-2xl border-2 border-dashed border-brand-300 p-4">
      <p className="mb-2 text-sm font-bold tracking-wide text-brand-700 uppercase dark:text-brand-300">Quick check</p>
      <QuestionView
        question={pub}
        value={response}
        onChange={setResponse}
        disabled={!!result?.correct}
        hideMeta
        result={result ? { correct: result.correct, details: result.details, expected: result.correct ? result.expected : undefined } : null}
        onSubmit={() => isAnswered(pub, response) && setResult(markResponse(question, response))}
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {!result?.correct && (
          <Button size="sm" onClick={() => setResult(markResponse(question, response))} disabled={!isAnswered(pub, response)}>
            Check
          </Button>
        )}
        {result && !result.invalid && (
          <span className={result.correct ? 'font-bold text-good' : 'font-bold text-bad'}>{result.correct ? 'Nice one!' : 'Not yet — have another go.'}</span>
        )}
        {result?.invalid && <span className="text-sm text-muted">{result.feedback}</span>}
      </div>
      {result && !result.correct && result.feedback && <p className="mt-2 text-sm">{result.feedback}</p>}
      {result && (result.correct || !result.invalid) && (
        <details className="mt-2">
          <summary className="cursor-pointer text-sm font-semibold text-muted">Show the explanation</summary>
          <Markdown className="mt-1 text-sm">{question.solution}</Markdown>
        </details>
      )}
    </div>
  );
}

export default function LessonPlayer() {
  const { topicId = '' } = useParams();
  const topic = getTopic(topicId);
  const navigate = useNavigate();
  const toast = useToast();
  const [lesson, setLesson] = useState<Lesson | null | undefined>(undefined);
  const [index, setIndex] = useState(0);
  const started = useRef(Date.now());

  useEffect(() => {
    loadLesson(topicId)
      .then(setLesson)
      .catch(() => setLesson(null));
  }, [topicId]);

  if (!topic) return <NotFound />;
  if (lesson === undefined) return <Spinner />;
  if (lesson === null)
    return <EmptyState title="Lesson coming soon">There isn’t a lesson for {topic.title} yet — try practising or the flashcards.</EmptyState>;

  const total = lesson.sections.length;
  const section = lesson.sections[index];
  const finish = async () => {
    try {
      const res = await api.logActivity({ kind: 'lesson', topicId, minutes: Math.round((Date.now() - started.current) / 60000) });
      toast(`Lesson complete! +${res.xpGained} XP`, 'good');
    } catch {
      toast('Lesson complete!', 'good');
    }
    navigate(`/practice/${topicId}`);
  };

  return (
    <div>
      <PageHeader title={lesson.meta.title} back={{ to: `/learn/${topicId}`, label: topic.title }} subtitle={`About ${lesson.meta.minutes} minutes`} />
      <div className="mb-4 flex items-center gap-3">
        <ProgressBar value={index + 1} max={total} />
        <span className="shrink-0 text-sm font-semibold text-muted">
          {index + 1}/{total}
        </span>
      </div>
      <Card className="sm:p-8">
        {index === 0 && lesson.intro && <Markdown className="mb-4 text-lg">{lesson.intro}</Markdown>}
        {section && (
          <>
            <h2 className="text-xl font-bold">{section.title}</h2>
            <Markdown className="mt-2 text-[1.05rem]">{section.body}</Markdown>
            {section.checks.map((q) => (
              <QuickCheck key={q.id} question={q} />
            ))}
          </>
        )}
      </Card>
      <div className="mt-5 flex justify-between gap-2">
        <Button variant="secondary" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0} icon={<ChevronLeft className="size-4" />}>
          Back
        </Button>
        {index + 1 < total ? (
          <Button onClick={() => { setIndex(index + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
            Next <ChevronRight className="size-4" />
          </Button>
        ) : (
          <Button variant="success" onClick={finish} icon={<CheckCircle2 className="size-4" />}>
            Finish and practise
          </Button>
        )}
      </div>
    </div>
  );
}
