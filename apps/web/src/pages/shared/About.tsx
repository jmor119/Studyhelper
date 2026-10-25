import { CURRICULA, CURRICULUM_ATTRIBUTION } from '@study-helper/shared';
import { useEffect, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { ButtonLink } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { homeFor } from '../../routes';

// TODO: replace with the real privacy contact before launch.
const CONTACT_EMAIL = 'privacy@example.com';
const LAST_UPDATED = '25 October 2026';

const NZC_URL = 'https://newzealandcurriculum.tahurangi.education.govt.nz/';
const LICENCE_URL = 'https://creativecommons.org/licenses/by-nc/4.0/';

function ExtLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-700 underline dark:text-brand-300">
      {children}
    </a>
  );
}

function H2({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="text-2xl font-bold tracking-tight">
      {children}
    </h2>
  );
}

function H3({ children }: { children: ReactNode }) {
  return <h3 className="mt-6 text-lg font-bold">{children}</h3>;
}

function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="mt-2 list-disc space-y-1.5 pl-5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export default function About() {
  const { user, profile } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) return;
    const t = setTimeout(() => document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: 'start' }), 50);
    return () => clearTimeout(t);
  }, [location.hash]);

  const toc = [
    { id: 'what', label: 'What Study Helper is' },
    { id: 'curriculum', label: 'The curriculum' },
    { id: 'integrity', label: 'Academic integrity' },
    { id: 'privacy', label: 'Privacy policy' },
  ];

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <img src="/icon.svg" alt="" className="size-9" />
            <span className="text-lg font-extrabold tracking-tight">Study Helper</span>
          </Link>
          {user && profile ? (
            <ButtonLink to={homeFor(profile.role)} variant="secondary">
              Back to the app
            </ButtonLink>
          ) : (
            <div className="flex gap-2">
              <ButtonLink to="/signin" variant="ghost">
                Sign in
              </ButtonLink>
              <ButtonLink to="/signup">Get started</ButtonLink>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 leading-relaxed">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">About Study Helper</h1>
        <nav aria-label="On this page" className="mt-5 flex flex-wrap gap-2">
          {toc.map((t) => (
            <a key={t.id} href={`#${t.id}`} className="rounded-full border border-line bg-surface px-3 py-1 text-sm font-semibold text-muted hover:text-ink">
              {t.label}
            </a>
          ))}
        </nav>

        <section id="what" className="mt-10 scroll-mt-6" aria-labelledby="what-title">
          <H2 id="what-title">What Study Helper is</H2>
          <p className="mt-3">
            Study Helper is an exam-prep and study app for New Zealand students, starting with Year 9 Mathematics &amp; Statistics and Science. It has short lessons, practice
            questions marked straight away with worked solutions, mock exams, flashcards, a study planner, and an AI tutor that helps you learn rather than doing the work for
            you.
          </p>
          <p className="mt-3">
            It’s built for families. Students and parents link their accounts so parents can see progress, set goals and rewards, and get a weekly summary. Everyone shares one
            growing bank of curriculum-aligned questions.
          </p>
        </section>

        <section id="curriculum" className="mt-10 scroll-mt-6" aria-labelledby="curriculum-title">
          <H2 id="curriculum-title">The curriculum</H2>
          <p className="mt-3">
            Topics and learning statements follow{' '}
            <ExtLink href={NZC_URL}>The New Zealand Curriculum</ExtLink> published by the Ministry of Education on Tāhūrangi.
          </p>
          <blockquote className="mt-4 rounded-r-xl border-l-4 border-brand-400 bg-brand-50 px-4 py-3 text-sm dark:bg-brand-950/40">
            {CURRICULUM_ATTRIBUTION} Licence: <ExtLink href={LICENCE_URL}>Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)</ExtLink>.
          </blockquote>
          <ul className="mt-4 grid grid-cols-1 gap-3">
            {CURRICULA.map((c) => (
              <li key={c.id} className="rounded-xl border border-line bg-surface p-4">
                <p className="font-bold">{c.title}</p>
                <p className="mt-1 text-sm text-muted">{c.basis}</p>
                <p className="mt-1 text-sm">
                  <ExtLink href={c.sourceUrl}>Official curriculum page</ExtLink>
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-4">
            <b>A note on science:</b> the refreshed science curriculum hasn’t been finalised and gazetted yet. Until it is, our science content follows the 2007 curriculum (still in
            force for Years 9–10) and the Ministry’s draft-aligned Year 9 learning kit. Each topic shows which one it’s based on, and we’ll update the content when the final
            science curriculum is gazetted.
          </p>
          <p className="mt-3 text-sm text-muted">
            Study Helper isn’t made or endorsed by the Ministry of Education. Questions, lessons and explanations are our own, written for study use.
          </p>
        </section>

        <section id="integrity" className="mt-10 scroll-mt-6" aria-labelledby="integrity-title">
          <H2 id="integrity-title">Academic integrity</H2>
          <p className="mt-3">Study Helper is here to help students learn, not to do their work for them.</p>
          <List
            items={[
              <>
                <b>The AI tutor teaches; it doesn’t tell.</b> It asks guiding questions, gives hints and explains ideas with similar examples, so you do the thinking.
              </>,
              <>
                <b>No answers to graded work.</b> When you share an assignment or homework, the tutor helps you understand the task, plan your answer and check your working,
                but it never gives final answers or writes any part of it for you.
              </>,
              <>
                <b>Practice is different.</b> For the app’s own practice questions, you see the worked solution after you’ve had a go — that’s how practice works.
              </>,
              <>
                <b>Parents can see tutor chats.</b> Students are told this in the app, and it helps everyone use AI well.
              </>,
              <>
                <b>Follow your school’s rules.</b> If your teacher asks whether you had help, be honest — some schools want you to say when you’ve used a tutor or AI.
              </>,
            ]}
          />
        </section>

        <section id="privacy" className="mt-10 scroll-mt-6" aria-labelledby="privacy-title">
          <H2 id="privacy-title">Privacy policy</H2>
          <p className="mt-1 text-sm text-muted">Last updated {LAST_UPDATED}</p>
          <p className="mt-3">
            This explains, in plain language, what personal information Study Helper collects, why, and what you can do about it. We follow the New Zealand{' '}
            <ExtLink href="https://www.privacy.org.nz/privacy-act-2020/privacy-principles/">Privacy Act 2020</ExtLink> and its information privacy principles.
          </p>

          <H3>What we collect</H3>
          <List
            items={[
              <>
                <b>Account details:</b> your name (the display name you choose), email address or username, whether you’re a student or parent, and a student’s year level. If
                you sign in with Google, we receive your name and email from Google. Passwords are handled by Google Firebase Authentication — we never see them.
              </>,
              <>
                <b>Learning progress:</b> the answers you give, marks, topic mastery, XP, streaks and badges, mock exam results, flashcard reviews, study plans and goals.
              </>,
              <>
                <b>Tutor chats:</b> the messages you send to the AI tutor and its replies.
              </>,
              <>
                <b>Uploads:</b> photos and PDFs you add — assignments, class notes, worksheets or handwritten working — and the summaries and questions made from them.
              </>,
              <>
                <b>Family links:</b> which parent and student accounts are linked.
              </>,
              <>
                <b>AI settings:</b> if you add an AI key, we store it encrypted, along with the last four characters, your chosen model, your monthly limit and how much has been
                used.
              </>,
              <>
                <b>Technical information:</b> basic logs (such as times and errors) needed to run the service and stop misuse. We don’t use advertising or tracking cookies. Your
                browser keeps a local copy of some data so the app works offline.
              </>,
            ]}
          />

          <H3>Why we collect it</H3>
          <List
            items={[
              'To run the app: marking answers, tracking progress, building study plans and powering the tutor.',
              'So linked parents can support their children’s learning.',
              'To keep the service safe and working, for example by limiting how fast messages can be sent.',
              'To improve the shared question bank, using counts (such as how often a question is answered correctly or reported) that don’t identify anyone.',
            ]}
          />
          <p className="mt-2">We only collect what we need for these purposes, and we don’t use it for anything else without asking.</p>

          <H3>Where it’s stored</H3>
          <p className="mt-2">
            Your information is stored with Google Firebase (Google Cloud) in its Sydney, Australia region. It’s encrypted when it travels over the internet and when it’s
            stored. Australian privacy law gives protections comparable to New Zealand’s, and Google is bound by contract to protect the data.
          </p>

          <H3>AI processing</H3>
          <p className="mt-2">
            AI features (the tutor, homework help, notes analysis, AI marking and making new questions) only work when a family adds its own API key from Anthropic or OpenAI. If
            no key has been added, nothing is sent to an AI provider.
          </p>
          <p className="mt-2">
            When a key is in use, we send that provider only what the feature needs — for example your message, the question you’re working on, your uploaded photos or notes,
            and your display name and year level so the tutor can pitch its help right. This is processed under the key owner’s account with that provider, usually in the United
            States. Read{' '}
            <ExtLink href="https://www.anthropic.com/legal/privacy">Anthropic’s privacy policy</ExtLink> or <ExtLink href="https://openai.com/policies/privacy-policy/">OpenAI’s privacy policy</ExtLink>{' '}
            to see how they handle API data.
          </p>

          <H3>Who can see your information</H3>
          <List
            items={[
              <>
                <b>Linked parents</b> can see their linked children’s data, including progress, answers, exam results, tutor chats, uploads and notes. Students are told this in
                the app. Linked students can see their parents’ names.
              </>,
              <>
                <b>Other users</b> never see your answers, chats or uploads. Practice questions are shared by everyone, but your answers to them aren’t. Questions you add yourself
                are visible only to your family until we’ve reviewed them.
              </>,
              <>
                <b>The people who run Study Helper</b> can access information when needed to run, support or secure the service — for example, reviewing a reported question.
              </>,
              <>
                <b>Service providers</b> who help us run the app: Google (hosting, sign-in and storage), an email delivery service (for the weekly summary email), and, only if
                your family adds a key, Anthropic or OpenAI.
              </>,
            ]}
          />
          <p className="mt-2 font-semibold">We don’t show ads, and we never sell or rent your information to anyone.</p>
          <p className="mt-2">We’d only share information with others if the law requires it, or to prevent a serious threat to someone’s safety.</p>

          <H3>Children</H3>
          <p className="mt-2">
            Study Helper is designed for school students, many of them under 16. Parents can create accounts for children using a username, so a child doesn’t need an email
            address. We encourage parents and children to talk about how the app is used, including the AI tutor.
          </p>

          <H3>Keeping it safe</H3>
          <p className="mt-2">
            We use access rules so people can only see what they’re allowed to, encrypt AI keys with a separate secret, and never send AI keys back to the browser. If a privacy
            breach is likely to cause serious harm, we’ll tell the people affected and the Privacy Commissioner, as the Privacy Act requires.
          </p>

          <H3>How long we keep it, and deleting it</H3>
          <p className="mt-2">
            We keep your information while your account is open. You can delete your account at any time in <b>Settings → Privacy → Delete my account</b>. This permanently
            deletes your profile, progress, chats, uploads, notes, family links, AI keys and usage records. Parents who created a child’s account can delete it from the Family
            page. Some technical logs may be kept for a short time before they’re automatically removed.
          </p>

          <H3>Your rights</H3>
          <List
            items={[
              <>
                <b>See your information:</b> download a copy any time in Settings → Privacy → Download my data, or ask us.
              </>,
              <>
                <b>Correct it:</b> change your name in Settings, or ask us to correct anything else that’s wrong.
              </>,
              <>
                <b>Complain:</b> contact us first and we’ll try to sort it out. If you’re not happy with our response, you can complain to the{' '}
                <ExtLink href="https://www.privacy.org.nz/">Office of the Privacy Commissioner</ExtLink>.
              </>,
            ]}
          />

          <H3>Contact us</H3>
          <p className="mt-2">
            Questions or requests about privacy: email{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-brand-700 underline dark:text-brand-300">
              {CONTACT_EMAIL}
            </a>
            .
          </p>

          <H3>Changes to this policy</H3>
          <p className="mt-2">If we make important changes, we’ll update this page and let you know in the app.</p>
        </section>
      </main>

      <footer className="border-t border-line py-8 text-center text-sm text-muted">
        <Link to="/" className="hover:text-ink">
          Study Helper
        </Link>{' '}
        · Made in Aotearoa New Zealand
      </footer>
    </div>
  );
}
