import type { Subject } from '@study-helper/shared';
import clsx from 'clsx';
import { School, Star } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { useState } from 'react';
import { Link } from 'react-router';
import { NoYearContent } from '../../components/study/NoYearContent';
import { Badge, PageHeader, ProgressRing, Tabs } from '../../components/ui';
import { useUser } from '../../lib/auth';
import { db } from '../../lib/firebase';
import { curriculaFor, LEVEL_TONE, levelFor, subjectLabel, useMastery, useStudySettings } from '../../lib/study';

export default function Learn() {
  const { user, profile } = useUser();
  const curricula = curriculaFor(profile.yearLevel);
  const [subject, setSubject] = useState<Subject>(curricula[0]?.subject ?? 'maths');
  const [onlySchool, setOnlySchool] = useState(false);
  const mastery = useMastery(user.uid);
  const settings = useStudySettings(user.uid);
  const schoolTopics = new Set(settings.data?.schoolTopics ?? []);
  const curriculum = curricula.find((c) => c.subject === subject) ?? curricula[0];

  const toggleSchool = async (topicId: string) => {
    const next = new Set(schoolTopics);
    if (next.has(topicId)) next.delete(topicId);
    else next.add(topicId);
    await setDoc(doc(db, 'students', user.uid, 'settings', 'study'), { schoolTopics: [...next], updatedAt: Date.now() }, { merge: true });
  };

  if (!curriculum) return <NoYearContent yearLevel={profile.yearLevel} />;
  return (
    <div>
      <PageHeader
        title="Learn"
        subtitle={curriculum.basis}
        actions={
          <Tabs
            value={subject}
            onChange={setSubject}
            options={curricula.map((c) => ({ value: c.subject, label: subjectLabel(c.subject) }))}
          />
        }
      />
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl bg-surface p-3 text-sm ring-1 ring-line">
        <School className="size-5 text-brand-700" />
        <span className="flex-1 text-muted">
          Tap the <Star className="inline size-4" /> on topics your school teaches this year. Mock exams and your planner can then focus on them.
        </span>
        <label className="flex items-center gap-2 font-semibold">
          <input type="checkbox" className="size-4 accent-brand-700" checked={onlySchool} onChange={(e) => setOnlySchool(e.target.checked)} />
          Only my school’s topics
        </label>
      </div>

      <div className="grid gap-8">
        {curriculum.strands.map((strand) => {
          const topics = curriculum.topics.filter((t) => t.strandId === strand.id && (!onlySchool || schoolTopics.has(t.id)));
          if (!topics.length) return null;
          return (
            <section key={strand.id}>
              <h2 className="text-lg font-bold">{strand.title}</h2>
              <p className="mb-3 text-sm text-muted">{strand.description}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {topics.map((t) => {
                  const m = mastery.byTopic.get(t.id);
                  const level = levelFor(m);
                  const starred = schoolTopics.has(t.id);
                  return (
                    <div key={t.id} className="relative flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 transition-shadow hover:shadow-md">
                      <ProgressRing value={m?.mastery ?? 0} size={56} stroke={6}>
                        <span className="text-xs">{m ? m.mastery : '–'}</span>
                      </ProgressRing>
                      <Link to={`/learn/${t.id}`} className="min-w-0 flex-1 after:absolute after:inset-0">
                        <p className="font-bold leading-snug">{t.title}</p>
                        <p className="line-clamp-2 text-sm text-muted">{t.summary}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          <Badge tone={LEVEL_TONE[level.id]}>{level.label}</Badge>
                          {t.status === 'nzc2007' && <Badge>2007 curriculum</Badge>}
                        </div>
                      </Link>
                      <button
                        onClick={() => toggleSchool(t.id)}
                        className={clsx('relative z-10 rounded-lg p-2', starred ? 'text-amber-500' : 'text-muted hover:text-amber-500')}
                        aria-label={starred ? 'Remove from my school topics' : 'Mark as a school topic'}
                        aria-pressed={starred}
                      >
                        <Star className={clsx('size-5', starred && 'fill-current')} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
      <p className="mt-10 text-xs text-muted">{curriculum.attribution}</p>
    </div>
  );
}
