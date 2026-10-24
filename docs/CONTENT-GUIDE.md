# Content guide

How to write lessons, questions, flashcards and maths templates for Study Helper. The audience is NZ
Year 9 students (13–14 years old) preparing for school tests and exams.

## 1. Where things go

| What | Path | Example |
|---|---|---|
| Topic list (read-only source of truth) | `packages/shared/src/curriculum/nz/year9-*.ts` | outcomes + key terms per topic |
| Lessons | `content/lessons/<subject>/<topicId>.md` | `content/lessons/maths/m9.alg.equations.md` |
| Bank questions | `content/questions/<subject>/<topicId>.json` | `content/questions/science/s9.bio.cells.json` |
| Flashcards | `content/flashcards/<subject>/<topicId>.json` | `content/flashcards/science/s9.bio.cells.json` |
| Maths templates | `packages/shared/src/templates/maths/<strand>/<name>.ts` (+ add to that strand's `index.ts`) | `templates/maths/algebra/equations.ts` |
| Science calculation templates | `packages/shared/src/templates/science/<area>.ts` | — |

`<subject>` is `maths` or `science`. File names are the topic id exactly (e.g. `s9.chem.reactions.json`).

## 2. Checking your work

```bash
npm run validate:content -- --topic s9.chem.reactions    # schema, ids, answers self-mark correctly
npx vitest run packages/shared/src/templates -t "m9.num.fractions"   # templates: 150 seeds each
npx tsc -p packages/shared/tsconfig.json                 # types (ignore errors in files you don't own)
```

Content isn't finished until the validator reports **0 errors** for your topics and your template tests pass.

## 3. Questions (JSON)

The schema is in `packages/shared/src/questions/schema.ts`. The validator fills in `subject`, `yearLevel` and `topicId` from the file name. Every question needs:

- `id`: `<topicId>.q001`, `<topicId>.q002`, …, unique.
- `type`: one of the types below.
- `difficulty` (see §6), and `marks` (default 1; use 2–4 for multi-step or explain questions).
- `prompt` (Markdown + KaTeX), `hints` (1–3, progressively more helpful, **never revealing the answer**), and `solution` (a worked solution that explains *why*).
- Optional: `calculator` (`"allowed"` / `"not-allowed"`), `figure` (`{ "svg": "<svg …>", "alt": "…" }`), `tags`.

| type | Answer fields | Use for |
|---|---|---|
| `mcq` | `options` [{id,text}], `correct`, optional `feedback` {optionId: why it's wrong} | concepts, misconceptions |
| `multi` | `options`, `correct` [ids] | "select all that apply" |
| `numeric` | `answer`, optional `decimals`, `tolerance`, `units`, `form` (`any` · `integer` · `decimal` · `fraction` · `simplest-fraction` · `mixed`), `alternatives` | calculations |
| `expression` | `answer` (mathjs syntax, e.g. `"3*x + 6"`), `variables` (["x"]), `form` (`any` · `expanded` · `factorised` · `simplified`) | algebra |
| `text` | `accepted` [strings], optional `keywords` {all, any} | one word or short phrase answers |
| `cloze` | `prompt` with `[[a]]` markers, `blanks` [{id, accepted, options?}] | fill in the gaps (with `options` = dropdown) |
| `order` | `items` in the **correct** order (the app shuffles them) | sequences and processes |
| `match` | `pairs` [{left:{id,text}, right:{id,text}}] | term ↔ definition |
| `extended` | `modelAnswer`, `rubric` [{criterion, marks}] (rubric marks must add up to `marks`) | "explain", "describe", "compare" |

Marking is lenient where it should be. Text answers ignore case, a leading "the", macrons, US spellings (vapor → vapour) and small typos in longer words. Numbers accept fractions, thousands separators, units, `$` and `%`. Give **all reasonable phrasings** in `accepted` (singular and plural, common synonyms), and keep `text` questions to answers of one to three words. Anything longer should be an `extended` question.

**MCQ quality:**
- 4 options, one clearly correct.
- Distractors should come from real misconceptions, and `feedback` should explain each one.
- No "all of the above" and no joke options.
- Options should be similar in length.

**Multi-part exam-style questions:**
- Give each part the same `groupId` and `stem` (the shared context), with `part` set to `"a"`, `"b"`, ….
- Each part is its own question object.

**JSON and maths:**
- Inline maths is `$…$`; display maths is `$$…$$`.
- In JSON every backslash must be doubled: `"$\\frac{3}{4}$"`, `"$10 \\times 40$"`.
- For money in prose, escape the dollar sign: `\\$12` inside JSON or `\$12` in Markdown. A bare `$12 and $15` would be read as maths.
- Chemical formulas: unicode subscripts (H₂O, CO₂) are simplest.

## 4. Maths templates (TypeScript)

Templates generate unlimited questions where **code computes the answer**, which makes them the most reliable content we have. Use them for anything calculational. See `templates/types.ts` and the examples in `templates/maths/number/integers.ts`, `algebra/equations.ts` and `measurement/pythagoras.ts`.

Rules:
- `id` = `<topicId>.<slug>`, and `topicId` must be a real topic.
- **Choose the answer first, then build the question from it** (e.g. pick x, then compute the constants). That keeps answers whole numbers or terminating decimals and avoids awkward numbers.
- Use the helpers in `templates/format.ts`: `tex()` for numbers in KaTeX, `texSigned()` for negatives in brackets, `frac()`, `mixed()`, `poly()` / `polyAnswer()`, `money()`, `round()`, `clean()`, and `NAMES` / `PLACES` for NZ contexts. Remove floating-point noise with `clean()`.
- If an answer isn't exact, set `decimals` and say "Give your answer to N decimal places" in the prompt. Set `units` when there is one.
- Hints and solutions must use the actual numbers from this instance, worked step by step.
- MCQ options generated from parameters must be distinct. Guard against two distractors coming out equal.
- Variety: at least 20 distinct questions over 150 seeds per difficulty. If that's impossible (e.g. a conceptual MCQ), set `variety`.
- Figures: use `templates/svg.ts` (`svgDoc`, `polygon`, `line`, `label`, `sideLabel`, `angleArc`, `rightAngleMark`, `coordinatePlane`). Keep figures under about 420 × 320 px. Don't draw figures "to scale" if that gives the answer away; add the label "Not to scale" if needed.
- Use `rng` for all randomness (never `Math.random`), so a seed always reproduces the same question.
- Register each template in the strand's `index.ts`.
- One template can serve several difficulties (`difficulties: [2, 3]`), branching on `difficulty`.

## 5. Lessons (Markdown)

```markdown
---
topicId: s9.chem.reactions
title: Chemical reactions
minutes: 12
---

Short intro paragraph (2–3 sentences, why this matters).

## First idea
Explanation, in short paragraphs, plus bullet lists, tables and examples.

> **Tip:** …
> **Watch out:** … (common mistakes)

### Example
Worked example, step by step.

```check
{ "type": "mcq", "prompt": "…", "options": […], "correct": "b", "solution": "…" }
```

## Second idea
…
```

- **3–6 sections** (`## ` headings). Each section is shown as one screen, so keep it to about 150–250 words.
- Put a ```` ```check ```` block (a question as JSON, **without** id/difficulty) at the end of 2–4 of the sections. These are ungraded quick checks.
- Cover every outcome listed for the topic in the curriculum file. Use the topic's key terms and **bold** them where they're defined.
- Maths lessons need worked examples with the method spelled out. Science lessons need clear explanations, everyday NZ examples, and the key equations or word equations.
- End with a section such as "Exam tips" or "Putting it together".

## 6. Difficulty scale

| | Meaning | Typical marks |
|---|---|---|
| 1 | Warm-up: recall a fact, a single easy step | 1 |
| 2 | Straightforward: apply one idea directly | 1 |
| 3 | Typical test question: two steps or a small context | 1–2 |
| 4 | Harder: multi-step, unfamiliar context, explain or justify | 2–3 |
| 5 | Challenge/extension: the top end of Year 9 | 2–4 |

Keep everything at **Year 9 level** as defined by the topic outcomes. Don't drift into Year 10 content. For example, Year 9 Pythagoras finds the hypotenuse only, Year 9 inequalities only have positive coefficients, and there's no trigonometry.

## 7. Flashcards (JSON)

`[{ "id": "<topicId>.f01", "front": "…", "back": "…" }]`. Markdown and KaTeX are allowed.
- One fact per card: key terms → definitions, formulas, units, symbols, word equations, and "what's the difference between X and Y".
- Fronts are short questions or prompts. Backs are one or two sentences at most.

## 8. Style

- **NZ English:** colour, metre, litre, centre, organise, analyse, programme, aluminium, sulfur, fibre, grey, mould. Use "maths", not "math".
- **NZ contexts:**
  - NZ dollars, GST at 15%, metric units, Celsius.
  - NZ places, sports (rugby, netball, cricket), wildlife (kiwi, tūī, kererū, pīwakawaka, weta, kauri, pōhutukawa) and foods.
  - Names from `NAMES` in `templates/format.ts`.
  - Te reo Māori words with correct macrons.
- **Tone:** friendly, clear and direct, like a good teacher talking to a 13-year-old. Short sentences, with no condescension or slang overload.
- **Mātauranga Māori:**
  - Include it where the curriculum does: Matariki, maramataka, observing environmental patterns, kaitiakitanga.
  - Keep claims accurate and general, and never invent cultural details or practices.
  - Don't present sacred or restricted knowledge. If you're unsure, leave it out.
- **Originality:** write everything yourself. Don't copy from textbooks, Education Perfect, Khan Academy, Science Learning Hub or websites. You may paraphrase the curriculum outcomes in the topic file (CC BY-NC).
- **Accuracy:**
  - Double-check every fact and calculation. If a science fact is contested or simplified at this level, use the standard school-level explanation.
  - Use SI units with correct symbols (m/s, N, kg, J, °C).
  - Use g = 10 N/kg unless a question says otherwise (NZ Year 9 convention), and state it in the question.

## 9. Targets per topic

**Science**, per topic:
- 1 lesson.
- At least 20 bank questions:
  - at least 4 at each of difficulty 1 and 2, at least 6 at difficulty 3, at least 4 at difficulty 4, and at least 2 at difficulty 5
  - mixed types: about 40% mcq or multi, plus text/cloze, match/order, numeric where it fits, and 2–3 `extended` with rubrics
- At least 12 flashcards.
- Calculation topics (speed, acceleration, F = ma, density, weight, magnification) should also get a template.

**Maths**, per topic:
- 1 lesson.
- At least 3 templates covering difficulties 1–5 between them, where the topic allows.
- At least 6 bank questions for what templates can't do well: concept MCQs, "explain" questions, vocabulary, interpreting displays, and choosing a method.
- At least 8 flashcards (key terms, formulas, facts).
