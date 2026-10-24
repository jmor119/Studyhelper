# Security model

## Principles

- **The server is the source of truth for anything that matters.** Progress, XP, mastery, streaks, family links, the shared question bank, AI keys, usage and OAuth state are written only by Cloud Functions, which use the Admin SDK and are not subject to rules. The browser can't forge progress or links.
- **Answers never reach the browser before an attempt.** The bank is split: `bank/*` (public question data) and `bankAnswers/*` (answer keys, never client-readable). Marking runs on the server. Template questions are rebuilt from their seed on the server.
- **Family access is explicit.** A parent can read a student's data only while a `links/{parentUid}_{studentUid}` document exists. Links are created only by the `acceptInvite` and `createChildAccount` functions. Both sides must take part (single-use invite codes, 7-day expiry), or the parent created the child account.
- **Least privilege for client writes.** Clients may write only small, validated, low-stakes documents: profile cosmetics, flashcard scheduling, study plans, study settings, and parent-set goals. Every field is checked with `keys().hasOnly(...)` and type and range checks.

## Firestore rules summary

| Data | Read | Write |
|---|---|---|
| `users/{uid}` | self, linked family, admins | self: `displayName`, `avatar`, `prefs` (validated) |
| `users/{uid}/private/*` | self | functions |
| `links/*` | either party | functions |
| `bank/*` | signed-in: verified/unverified; `pending` only for the contributor's family; admins: all | functions |
| `bankAnswers/*`, `bankFlags/*`, `noteAnswers/*` | none | functions |
| `students/{uid}/**` | student, linked parents, admins | functions, except: `cards/*`, `plans/*`, `settings/study` (student, validated) and `goals/*` (linked parents, validated) |
| `usage/{uid}/**` | owner, admins | functions |
| `secrets/*`, `apiTokens/*`, `oauth*/*`, `invites/*`, `usernames/*`, `rateLimits/*`, `mail/*` | none | functions |

Storage: students upload images or PDFs (< 10 MB, safe file names) to `uploads/{uid}/`. Linked parents can read them. Nothing else is accessible.

These rules are covered by `tests/rules/rules.test.ts` (`npm run test:rules`).

## Accounts

- **Open sign-up** with Google or email/password. Role (student or parent) is set once by `completeOnboarding` and can't be changed.
- **Child accounts:** a parent creates a username + password account. Usernames map to `<username>@kids.study-helper.invalid`. The `.invalid` TLD is reserved and never receives mail (RFC 2606), so nobody can use a password-reset email to take over a child account. Only a linked parent can reset a child's password, through a function.
- **Admins:** granted with a custom claim via `npm run set-admin`. Only admins can moderate the bank.

## AI keys (bring your own)

- Keys are validated by listing models, then encrypted with **AES-256-GCM**. The key is derived from the `KEY_ENCRYPTION_KEY` Secret Manager secret, with additional authenticated data `uid:provider`, so a ciphertext can't be moved to another account. Keys are stored in `secrets/{uid}`, which clients can never read.
- Only the last four characters are shown. Keys are decrypted only inside functions, and only for AI calls.
- Students use their own key or a linked parent's key (if the parent allows sharing). Monthly USD budgets are enforced before every call. Usage is recorded per owner, per user and per feature.
- Rate limits apply to the tutor, generation, marking, notes, invites, child creation and token creation.

## Shared question bank integrity

- AI generation takes only enumerated inputs (topic, difficulty), so no user text reaches other families. Each question is schema-validated, self-marked, de-duplicated and independently re-solved by a second model call before it's stored as `unverified`.
- `unverified` questions are promoted to `verified` automatically after at least 8 answers, plausible accuracy and no reports, or by an admin.
- Contributions made through MCP by non-admins are `pending` and visible only to the contributor's family until an admin approves them.
- Reports: three distinct reporters, or one "inappropriate" report, hide a question until it's reviewed.

## Tutor safety

- The system prompt enforces Socratic teaching and academic integrity (no final answers on graded work), keeps chats on school learning, and responds to wellbeing concerns with NZ helplines (1737, Youthline).
- Student answers sent for AI marking are wrapped as data, with an instruction to ignore embedded instructions.
- Tutor chats are visible to linked parents, and students are told so.
- Markdown is rendered without raw HTML, and figures are shown as `<img>` data URIs, so SVG scripts never run.

## MCP / OAuth

- OAuth 2.1 authorisation code flow with mandatory PKCE (S256), dynamic client registration (https or localhost redirects only), single-use codes (5 minutes), 1-hour access tokens and rotating 30-day refresh tokens. Tokens are stored only as SHA-256 hashes.
- Personal access tokens (`shp_…`) for Claude Code are hashed, listable and revocable in Settings.
- Tools are registered per request for the caller's role. Student tools never reveal answers to questions the student hasn't attempted.

## Privacy (NZ Privacy Act 2020)

- Minimal data: first name, year level, progress, chats and uploads. No ads, no data selling.
- Settings → Download my data (export) and Delete my account (deletes the profile, progress, chats, uploads, keys, tokens and the auth user).
- Firestore and Functions are hosted in `australia-southeast1` (Sydney).
