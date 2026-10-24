import { BookOpen, ClipboardCheck, Layers, MessageCircle, ShieldCheck, Users } from 'lucide-react';
import { Link } from 'react-router';
import { ButtonLink } from '../../components/ui';

const features = [
  { icon: <BookOpen className="size-6" />, title: 'Lessons and practice', text: 'Short lessons and endless practice for every Year 9 maths and science topic, marked instantly with worked solutions.' },
  { icon: <ClipboardCheck className="size-6" />, title: 'Mock exams', text: 'Timed, exam-style papers across the topics your school covers, with grades and a breakdown by topic.' },
  { icon: <MessageCircle className="size-6" />, title: 'A tutor that teaches', text: 'An AI tutor that gives hints and asks questions — it helps you get there yourself and never does your homework for you.' },
  { icon: <Layers className="size-6" />, title: 'Flashcards that stick', text: 'Spaced-repetition flashcards for key terms and formulas, so you review things just before you’d forget them.' },
  { icon: <Users className="size-6" />, title: 'Parents in the loop', text: 'Parents can see progress, set goals and rewards, and get a weekly summary.' },
  { icon: <ShieldCheck className="size-6" />, title: 'Built for NZ', text: 'Follows the New Zealand Curriculum, in NZ English, with NZ contexts. Your data stays private.' },
];

export default function Landing() {
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2">
          <img src="/icon.svg" alt="" className="size-9" />
          <span className="text-lg font-extrabold tracking-tight">Study Helper</span>
        </div>
        <div className="flex gap-2">
          <ButtonLink to="/signin" variant="ghost">
            Sign in
          </ButtonLink>
          <ButtonLink to="/signup">Get started</ButtonLink>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pt-10 pb-16 text-center sm:pt-16">
        <p className="mb-3 inline-block rounded-full bg-brand-100 px-3 py-1 text-sm font-semibold text-brand-800 dark:bg-brand-900 dark:text-brand-200">
          Year 9 Maths & Science · NZ Curriculum
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight sm:text-6xl">
          Study smarter. <span className="text-brand-700 dark:text-brand-400">Walk into exams ready.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted">
          Lessons, practice questions, mock exams, flashcards and a tutor that actually teaches — all following the New Zealand Curriculum.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink to="/signup?role=student" size="lg">
            I’m a student
          </ButtonLink>
          <ButtonLink to="/signup?role=parent" size="lg" variant="secondary">
            I’m a parent
          </ButtonLink>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-20 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="rounded-2xl border border-line bg-surface p-6">
            <div className="mb-3 inline-flex rounded-xl bg-brand-100 p-2.5 text-brand-700 dark:bg-brand-900 dark:text-brand-300">{f.icon}</div>
            <h2 className="text-lg font-bold">{f.title}</h2>
            <p className="mt-1 text-muted">{f.text}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-line py-8 text-center text-sm text-muted">
        <Link to="/about" className="hover:text-ink">
          About, curriculum &amp; privacy
        </Link>
      </footer>
    </div>
  );
}
