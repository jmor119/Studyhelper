# Study Helper — notes for Claude

NZ Year 9 Maths & Science study app (expanding to other years). npm workspaces: `apps/web` (Vite + React 19 + React Router 8 + Tailwind v4), `functions` (Firebase Functions v2, TypeScript, bundled with esbuild), `packages/shared` (consumed as TS source by both), `content/`.

## Conventions
- **NZ English** in all user-facing text: colour, metre, organise, maths. Use NZ contexts.
- Curriculum topic ids look like `m9.alg.equations` and `s9.bio.cells`. They're defined in `packages/shared/src/curriculum/nz/*`. New year levels are new files registered in `curriculum/index.ts`.
- Questions follow `packages/shared/src/questions/schema.ts`. Content rules are in `docs/CONTENT-GUIDE.md`. Always run `npm run validate:content` after editing content.
- Maths templates compute their own answers. `templates.test.ts` runs every template × difficulty × 150 seeds (correct answer marks correct, wrong answer marks wrong, no answer leakage).
- Security: anything trust-related is written only by Cloud Functions. Client-writable docs are strictly validated in `firestore.rules`. If you change the rules, update `tests/rules/rules.test.ts`. See `docs/SECURITY.md`.
- Answers never go to the browser before an attempt (`bank` vs `bankAnswers`). Marking happens in functions.
- AI calls go through `functions/src/ai/providers.ts` (Anthropic or OpenAI, bring your own key). Default Claude model: `claude-opus-5-5`. System prompts live in `functions/src/ai/prompts.ts`; keep them free of timestamps or ids so prompt caching works.
- Web pages use the UI kit in `apps/web/src/components/ui` and semantic colour tokens (`bg-surface`, `text-muted`, `border-line`, `brand-*`), which handle dark mode. Responsive grids need an explicit `grid-cols-1`.

## Commands
- `npm test`, `npm run test:rules`, `npm run test:integration`, `npm run typecheck`, `npm run validate:content`
- Local: `npm run build -w functions && npm run emulators`, then `npm run seed:emulator` and `npm run dev -w apps/web`.
- Java for the emulators: `scripts/with-java.mjs` finds JDK 21+ in `~/.jdks`.
- Windows: the shell is Git Bash. Avoid `$'` in JS `String.replace` replacement strings.

## Never
- Commit service-account keys or `.secret.local`. `.gitignore` covers `*-firebase-adminsdk-*.json`.
- Let user-provided text into the shared bank without admin review (MCP contributions from non-admins are `pending`).
