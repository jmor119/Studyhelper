# Study Helper — product & architecture plan

Exam prep and study support for NZ students, starting with **Year 9 Mathematics & Statistics and Science**
on the New Zealand Curriculum. Built for families: parents and students link accounts, and every family
shares one growing, curriculum-aligned question bank.

## Decisions (agreed 2026-10-25)

| Area | Decision |
|---|---|
| Curriculum | NZ Curriculum (refreshed). Year 9 Maths & Science first; architecture supports any year/subject. Year 6 (daughter) next. |
| Platform | Installable web app (PWA) for Chromebook, tablet and laptop. Vite + React + TypeScript. |
| Backend | Firebase: Auth, Firestore, Cloud Functions (2nd gen, TypeScript), Storage, Hosting. Project `study-helper-11021` (Blaze). |
| Sign-up | Open sign-up. Google or email/password. Parents can create child accounts (username + password). |
| Families | Many-to-many parent ↔ student links. Either side can invite (code or link); the other accepts. |
| AI | Bring your own key (Anthropic or OpenAI). Keys are encrypted at rest, used only server-side, never returned to the browser. Kids use a linked parent's key. Monthly caps. |
| Integrity | The tutor never gives final answers on assignments or graded work. Practice shows worked solutions after an attempt. |
| Question bank | Shared by everyone. Seed bank + code-verified maths templates + AI-generated top-ups. Generated questions enter the shared bank, so nobody pays twice. |
| MCP | Remote MCP server (Streamable HTTP) exposing the whole app, scoped by the caller's role. OAuth 2.1 (with dynamic client registration) for Claude/ChatGPT connectors, plus personal access tokens for Claude Code. |
| Language | NZ English throughout, NZ$ and NZ contexts. |

## Repository layout

```
apps/web/            Vite + React PWA (student app, parent portal, admin, OAuth consent)
functions/           Cloud Functions (callables, scheduled jobs, MCP + OAuth HTTP endpoints)
packages/shared/     Shared TypeScript: types, zod schemas, curriculum map, marking, maths
                     templates, mastery model, spaced repetition, planner, exam builder
content/             Seed content: lessons (markdown), questions (JSON), flashcards (JSON)
tests/rules/         Firestore & Storage security-rules tests (run against the emulator)
scripts/             Dev helpers: emulators, seeding, content validation, set-admin
docs/                Plan, research, security notes, setup guide
```

## Data model (Firestore)

| Path | Contents | Client access |
|---|---|---|
| `users/{uid}` | role (`student`/`parent`), displayName, yearLevel, prefs, managedBy | self + linked family read; self may edit displayName/avatar/prefs only |
| `users/{uid}/private/ai` | key summary (provider, last 4, model, cap) — never the key | self read |
| `links/{parentUid}_{studentUid}` | an active family link | either party read; functions write |
| `invites/{code}` | single-use invite codes | functions only |
| `usernames/{username}` | child username → uid | functions only |
| `bank/{questionId}` | public question data (prompt, options, hints, metadata, status) | signed-in read |
| `bankAnswers/{questionId}` | answer key + worked solution | functions only |
| `students/{uid}` | XP, streak, badges, totals | self + linked parents read |
| `students/{uid}/attempts/*` | every marked answer | self + parents read |
| `students/{uid}/mastery/{topicId}` | per-topic mastery | self + parents read |
| `students/{uid}/exams/*` | mock exams + results | self + parents read |
| `students/{uid}/chats/*/messages/*` | AI tutor conversations | self + parents read (student is told) |
| `students/{uid}/cards/*` | flashcard spaced-repetition state | self read/write, parents read |
| `students/{uid}/plans/*` | study plans + exam dates | self read/write, parents read |
| `students/{uid}/goals/*` | parent-set goals & rewards | parents write, self read |
| `students/{uid}/uploads/*`, `noteSets/*` | assignment/notes uploads + analysis | self + parents read |
| `secrets/{uid}` | encrypted AI keys | none |
| `usage/{uid}/months/*` | AI token usage per key owner | self read |
| `oauth*`, `apiTokens/*` | MCP auth state (hashed tokens) | none |
| `mail/*` | outbound email (Trigger Email extension) | none |

Writes that affect progress, XP, links, the bank or keys go through Cloud Functions, so the data parents
see can be trusted and the shared bank can't be vandalised.

## Shared question bank lifecycle

1. **Seed** — curated questions in `content/questions`, loaded by `npm run seed` (status `verified`).
2. **Templates** — parameterised maths generators in `packages/shared/src/templates`; the correct answer is
   computed by code, giving unlimited verified practice.
3. **AI top-up** — when a student runs low on unseen questions for a topic/difficulty, the generator uses the
   family's key. Inputs are enums only (topic, difficulty, type). Each question is schema-validated,
   deduplicated, and independently re-solved by a second call. It enters the bank as `unverified` (visible to
   all, marked "new"). It is promoted to `verified` after consistent correct answers and no flags, or by an admin.
4. **Contributions via MCP** — non-admin contributions are `pending` and visible only to the contributor's
   family until an admin approves them (open sign-up means untrusted text must not reach other children).
5. **Flags** — any student can report a problem; 3 flags auto-hide a question until reviewed.

## Phases (all in scope)

1. Foundation: auth, onboarding, family links + child accounts, security rules + tests, curriculum map,
   seed bank + templates, lessons, practice with hints/solutions, mistakes review, mock exams, mastery,
   XP/streaks/badges.
2. AI: key management + caps, tutor (Socratic), question generation, assignment help (photo/PDF), AI marking
   of written answers.
3. Parent portal: dashboard, activity, exam results, chat history, goals & rewards, weekly email.
4. MCP server + OAuth, flashcards (FSRS), study planner, notes upload, handwritten-working feedback, admin
   review queue.
5. Year 6 content.
