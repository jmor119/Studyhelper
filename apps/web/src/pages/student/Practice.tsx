import { getTopic, type MarkResult, type PublicQuestion, type QuestionResponse } from '@study-helper/shared';
import { Lightbulb, Sparkles, Trophy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { Feedback, SelfMark } from '../../components/question/Feedback';
import { emptyResponse, isAnswered, QuestionView } from '../../components/question/QuestionView';
import { Markdown } from '../../components/Markdown';
import { Button, ButtonLink, Card, EmptyState, Notice, PageHeader, ProgressBar, Spinner, useToast } from '../../components/ui';
import { api, errorMessage, type ProgressResult, type SubmitResult } from '../../lib/api';
import NotFound from '../shared/NotFound';

interface Slot {
  question: PublicQuestion;
  response: QuestionResponse;
  hintsShown: number;
  startedAt: number;
  result?: { mark: MarkResult; solution: string; progress?: Partial<ProgressResult> };
  pending?: Extract<SubmitResult, { needsReview: true }>;
}

export default function Practice() {
  const { topicId = '' } = useParams();
  const [params] = useSearchParams();
  const topic = getTopic(topicId);
  const mode = params.get('mode') === 'mistakes' ? 'mistakes' : 'adaptive';
  const difficulty = params.get('difficulty') ? Number(params.get('difficulty')) : undefined;
  const toast = useToast();

  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [index, setIndex] = useState(0);
  const [loadError, setLoadError] = useState('');
  const [lowOnQuestions, setLowOnQuestions] = useState(false);
  const [checking, setChecking] = useState(false);
  const [inlineError, setInlineError] = useState('');
  const [xpTotal, setXpTotal] = useState(0);
  const [aiAvailable, setAiAvailable] = useState(false);
  const [finished, setFinished] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoadError('');
    try {
      const set = await api.getPracticeSet({ topicId, count: 10, mode, ...(difficulty && { difficulty }) });
      setSlots(set.questions.map((q) => ({ question: q, response: emptyResponse(q), hintsShown: 0, startedAt: Date.now() })));
      setLowOnQuestions(set.lowOnQuestions);
      setIndex(0);
      setFinished(false);
    } catch (e) {
      setLoadError(errorMessage(e));
    }
  };

  useEffect(() => {
    if (topic) void load();
    api.getAiStatus({}).then((s) => setAiAvailable(s.available && s.budgetLeft)).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId, mode, difficulty]);

  if (!topic) return <NotFound />;
  const header = <PageHeader title={topic.title} subtitle={mode === 'mistakes' ? 'Retrying questions you got wrong' : 'Practice'} back={{ to: `/learn/${topic.id}`, label: 'Topic' }} />;
  if (loadError)
    return (
      <div>
        {header}
        <Notice tone="bad">{loadError}</Notice>
      </div>
    );
  if (!slots)
    return (
      <div>
        {header}
        <Spinner />
      </div>
    );
  if (!slots.length)
    return (
      <div>
        {header}
        <EmptyState title={mode === 'mistakes' ? 'No mistakes to retry 🎉' : 'No questions yet'} action={<ButtonLink to={`/learn/${topic.id}`}>Back to topic</ButtonLink>}>
          {mode === 'mistakes' ? 'You’ve got nothing to fix here. Try some new practice instead.' : 'Questions for this topic are on their way. Try the lesson or flashcards meanwhile.'}
        </EmptyState>
      </div>
    );

  const slot = slots[index]!;
  const update = (patch: Partial<Slot>) => setSlots((s) => s!.map((x, i) => (i === index ? { ...x, ...patch } : x)));
  const answered = slots.filter((s) => s.result).length;
  const correct = slots.filter((s) => s.result?.mark.correct).length;

  const check = async () => {
    if (!isAnswered(slot.question, slot.response) || checking) return;
    setChecking(true);
    setInlineError('');
    try {
      const res = await api.submitAnswer({
        questionId: slot.question.id,
        response: slot.response,
        hintsUsed: slot.hintsShown,
        timeMs: Date.now() - slot.startedAt,
      });
      if (res.invalid) {
        setInlineError(res.feedback);
      } else if (res.needsReview) {
        update({ pending: res });
      } else {
        update({ result: { mark: res.mark, solution: res.solution, progress: res } });
        setXpTotal((x) => x + res.xpGained);
        res.newBadges.forEach((b) => toast(`New badge earned! 🎉`, 'good'));
      }
    } catch (e) {
      setInlineError(errorMessage(e));
    } finally {
      setChecking(false);
    }
  };

  const selfMark = async (marks: number) => {
    if (!slot.pending) return;
    setChecking(true);
    try {
      const res = await api.selfMark({ attemptId: slot.pending.attemptId, marksAwarded: marks });
      update({ result: { mark: res.mark, solution: slot.pending.solution, progress: res }, pending: undefined });
      setXpTotal((x) => x + res.xpGained);
    } catch (e) {
      setInlineError(errorMessage(e));
    } finally {
      setChecking(false);
    }
  };

  const aiMark = async () => {
    if (!slot.pending) return;
    setChecking(true);
    try {
      const res = await api.aiMarkAttempt({ attemptId: slot.pending.attemptId });
      update({ result: { mark: res.mark, solution: slot.pending.solution, progress: res }, pending: undefined });
      setXpTotal((x) => x + res.xpGained);
    } catch (e) {
      setInlineError(errorMessage(e));
    } finally {
      setChecking(false);
    }
  };

  const next = () => {
    setInlineError('');
    if (index + 1 >= slots.length) setFinished(true);
    else {
      setIndex(index + 1);
      setSlots((s) => s!.map((x, i) => (i === index + 1 ? { ...x, startedAt: Date.now() } : x)));
    }
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const moreQuestions = async () => {
    try {
      const res = await api.generateQuestions({ topicId, count: 5, ...(difficulty && { difficulty }) });
      if (res.questions.length) {
        setSlots((s) => [...s!, ...res.questions.map((q) => ({ question: q, response: emptyResponse(q), hintsShown: 0, startedAt: Date.now() }))]);
        setFinished(false);
        setIndex(slots.length);
        setLowOnQuestions(false);
      }
    } catch (e) {
      toast(errorMessage(e), 'bad');
    }
  };

  if (finished) {
    const pct = answered ? Math.round((correct / answered) * 100) : 0;
    return (
      <div>
        {header}
        <Card className="text-center">
          <Trophy className="mx-auto size-12 text-xp" />
          <h2 className="mt-2 text-2xl font-extrabold">Session complete!</h2>
          <p className="mt-1 text-muted">
            {correct} of {answered} correct ({pct}%) · +{xpTotal} XP
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button onClick={load}>Practise again</Button>
            {slots.some((s) => s.result && !s.result.mark.correct) && (
              <ButtonLink variant="secondary" to={`/practice/${topic.id}?mode=mistakes`}>
                Retry mistakes
              </ButtonLink>
            )}
            <ButtonLink variant="secondary" to={`/learn/${topic.id}`}>
              Back to topic
            </ButtonLink>
          </div>
          {lowOnQuestions && aiAvailable && (
            <div className="mt-6">
              <p className="text-sm text-muted">You’ve nearly used up the questions for this topic.</p>
              <Button className="mt-2" variant="secondary" icon={<Sparkles className="size-4" />} onClick={moreQuestions}>
                Make new questions with AI
              </Button>
            </div>
          )}
        </Card>
      </div>
    );
  }

  const hints = slot.question.hints;
  const done = !!slot.result;
  return (
    <div ref={topRef}>
      {header}
      <div className="mb-4 flex items-center gap-3">
        <ProgressBar value={index + (done ? 1 : 0)} max={slots.length} />
        <span className="shrink-0 text-sm font-semibold text-muted">
          {index + 1}/{slots.length}
        </span>
        {xpTotal > 0 && <span className="shrink-0 text-sm font-bold text-xp">+{xpTotal} XP</span>}
      </div>

      <Card>
        <QuestionView
          question={slot.question}
          value={slot.response}
          onChange={(r) => update({ response: r })}
          disabled={done || !!slot.pending}
          result={slot.result ? { correct: slot.result.mark.correct, details: slot.result.mark.details, expected: slot.result.mark.expected } : null}
          onSubmit={check}
        />

        {slot.hintsShown > 0 && (
          <div className="mt-4 grid gap-2">
            {hints.slice(0, slot.hintsShown).map((h, i) => (
              <div key={i} className="flex gap-2 rounded-xl bg-amber-50 p-3 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                <Lightbulb className="mt-0.5 size-5 shrink-0" />
                <Markdown>{h}</Markdown>
              </div>
            ))}
          </div>
        )}

        {inlineError && (
          <Notice tone="warn" className="mt-4">
            {inlineError}
          </Notice>
        )}

        {slot.pending && (
          <SelfMark modelAnswer={slot.pending.modelAnswer} rubric={slot.pending.rubric} onSubmit={selfMark} onAiMark={aiMark} aiAvailable={aiAvailable} busy={checking} />
        )}

        {slot.result && (
          <Feedback
            mark={slot.result.mark}
            solution={slot.result.solution}
            progress={slot.result.progress}
            questionId={slot.question.id}
            tutorLink={`/tutor?question=${encodeURIComponent(slot.question.id)}&topic=${topic.id}`}
          />
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          {!done && !slot.pending && hints.length > slot.hintsShown ? (
            <Button variant="ghost" icon={<Lightbulb className="size-4" />} onClick={() => update({ hintsShown: slot.hintsShown + 1 })}>
              {slot.hintsShown ? 'Another hint' : 'Show a hint'}
            </Button>
          ) : (
            <span />
          )}
          {done ? (
            <Button size="lg" onClick={next}>
              {index + 1 >= slots.length ? 'Finish' : 'Next question'}
            </Button>
          ) : !slot.pending ? (
            <Button size="lg" onClick={check} loading={checking} disabled={!isAnswered(slot.question, slot.response)}>
              Check answer
            </Button>
          ) : null}
        </div>
      </Card>
      <p className="mt-3 text-center text-xs text-muted">
        Stuck? <Link to={`/tutor?question=${encodeURIComponent(slot.question.id)}&topic=${topic.id}`} className="font-semibold underline">Ask the tutor for a hint</Link> — it won’t just give you the answer.
      </p>
    </div>
  );
}
