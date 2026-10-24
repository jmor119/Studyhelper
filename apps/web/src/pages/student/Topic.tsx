import { getTopic, templatesForTopic } from '@study-helper/shared';
import { BookOpen, Dumbbell, Layers, MessageCircle, RotateCcw, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Badge, Button, ButtonLink, Card, Notice, PageHeader, ProgressBar, Select } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { useUser } from '../../lib/auth';
import { hasFlashcards, hasLesson } from '../../lib/content';
import { LEVEL_TONE, levelFor, STATUS_NOTE, subjectLabel, useMastery } from '../../lib/study';
import NotFound from '../shared/NotFound';

export default function Topic() {
  const { topicId = '' } = useParams();
  const topic = getTopic(topicId);
  const { user } = useUser();
  const navigate = useNavigate();
  const mastery = useMastery(user.uid);
  const [difficulty, setDifficulty] = useState('');
  const [ai, setAi] = useState<{ available: boolean } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genMsg, setGenMsg] = useState<{ tone: 'good' | 'bad' | 'info'; text: string } | null>(null);

  useEffect(() => {
    api.getAiStatus({}).then(setAi).catch(() => setAi({ available: false }));
  }, []);

  if (!topic) return <NotFound />;
  const m = mastery.byTopic.get(topic.id);
  const level = levelFor(m);
  const templateCount = templatesForTopic(topic.id).length;

  const generate = async () => {
    setGenerating(true);
    setGenMsg(null);
    try {
      const res = await api.generateQuestions({ topicId: topic.id, count: 5, ...(difficulty && { difficulty: Number(difficulty) }) });
      setGenMsg(
        res.skipped
          ? { tone: 'info', text: 'There are already plenty of questions you haven’t tried — no need to make more yet!' }
          : { tone: 'good', text: `Added ${res.generated} new question${res.generated === 1 ? '' : 's'} to the bank for everyone to use.` },
      );
    } catch (e) {
      setGenMsg({ tone: 'bad', text: errorMessage(e) });
    } finally {
      setGenerating(false);
    }
  };

  const practise = (mode?: 'mistakes') => {
    const params = new URLSearchParams();
    if (difficulty) params.set('difficulty', difficulty);
    if (mode) params.set('mode', mode);
    navigate(`/practice/${topic.id}?${params}`);
  };

  return (
    <div>
      <PageHeader title={topic.title} subtitle={topic.summary} back={{ to: '/learn', label: `${subjectLabel(topic.subject)} topics` }} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="grid gap-5 lg:col-span-2">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-muted">Your mastery</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-3xl font-extrabold">{m?.mastery ?? 0}</span>
                  <Badge tone={LEVEL_TONE[level.id]}>{level.label}</Badge>
                </div>
              </div>
              {m && (
                <p className="text-sm text-muted">
                  {m.attempts} answered · {Math.round((m.correct / Math.max(1, m.attempts)) * 100)}% correct
                </p>
              )}
            </div>
            <ProgressBar value={m?.mastery ?? 0} className="mt-3" />
            <div className="mt-5 flex flex-wrap gap-2">
              {hasLesson(topic.id) && (
                <ButtonLink to={`/lesson/${topic.id}`} variant="secondary" icon={<BookOpen className="size-4" />}>
                  Lesson
                </ButtonLink>
              )}
              <Button onClick={() => practise()} icon={<Dumbbell className="size-4" />}>
                Practise
              </Button>
              {m && m.attempts > m.correct && (
                <Button variant="secondary" onClick={() => practise('mistakes')} icon={<RotateCcw className="size-4" />}>
                  Retry mistakes
                </Button>
              )}
              {hasFlashcards(topic.id) && (
                <ButtonLink to={`/flashcards?topic=${topic.id}`} variant="secondary" icon={<Layers className="size-4" />}>
                  Flashcards
                </ButtonLink>
              )}
              <ButtonLink to={`/tutor?topic=${topic.id}`} variant="secondary" icon={<MessageCircle className="size-4" />}>
                Ask the tutor
              </ButtonLink>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted">Difficulty:</span>
              <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="w-auto py-1.5 text-sm">
                <option value="">Adaptive (recommended)</option>
                <option value="1">1 · Warm-up</option>
                <option value="2">2 · Core</option>
                <option value="3">3 · Standard</option>
                <option value="4">4 · Harder</option>
                <option value="5">5 · Challenge</option>
              </Select>
            </div>
          </Card>

          <Card>
            <h2 className="font-bold">What you’ll learn</h2>
            <ul className="mt-2 grid gap-1.5">
              {topic.outcomes.map((o) => (
                <li key={o} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-600" />
                  <span>{o}</span>
                </li>
              ))}
            </ul>
            {STATUS_NOTE[topic.status] && <p className="mt-3 text-xs text-muted">{STATUS_NOTE[topic.status]}</p>}
          </Card>
        </div>

        <div className="grid content-start gap-5">
          <Card>
            <h2 className="font-bold">Key terms</h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {topic.keyTerms.map((k) => (
                <Badge key={k} tone="brand">
                  {k}
                </Badge>
              ))}
            </div>
          </Card>
          {topic.prerequisites.length > 0 && (
            <Card>
              <h2 className="font-bold">Helps to know first</h2>
              <ul className="mt-2 grid gap-1">
                {topic.prerequisites.map((p) => (
                  <li key={p}>
                    <Link to={`/learn/${p}`} className="font-semibold text-brand-700 hover:underline dark:text-brand-300">
                      {getTopic(p)?.title ?? p}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <Card>
            <h2 className="flex items-center gap-2 font-bold">
              <Sparkles className="size-4 text-xp" /> Need more questions?
            </h2>
            <p className="mt-1 text-sm text-muted">
              {templateCount > 0
                ? 'This topic has endless practice built in. You can also make extra AI questions for the shared bank.'
                : 'Make new AI questions for this topic. They go into the shared bank so every student can use them.'}
            </p>
            {ai?.available ? (
              <Button className="mt-3" variant="secondary" onClick={generate} loading={generating}>
                Make 5 new questions
              </Button>
            ) : (
              <p className="mt-2 text-xs text-muted">Needs an AI key — a parent can add one in Settings.</p>
            )}
            {genMsg && (
              <Notice tone={genMsg.tone} className="mt-3">
                {genMsg.text}
              </Notice>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
