# NZ curriculum research: Year 6 (2026) and Year 7 (2027), Mathematics & Statistics

Researched: 26 October 2026. Student: Year 6 in 2026, Year 7 in 2027.
Scope: what officially applies, a per-year topic map to build app content on, vocabulary, progress descriptors, official assessment tools, licensing, and supporting material. Companion to `nz-curriculum-year9.md`, which uses the same method.

## How to read this document

Every section carries one of these tags (same scheme as the Year 9 document):

| Tag | Meaning |
|---|---|
| **[OFFICIAL-FINAL]** | Read directly from a final Ministry of Education document that is in force or confirmed. |
| **[OFFICIAL-PROPOSED]** | Final content described as "proposed" until gazetted. *(Not used here: maths Years 0–10 is gazetted.)* |
| **[OFFICIAL-DRAFT]** | Ministry material written before the final October 2025 release. Here, mainly the Parent Portal Year 6 and Year 7 pages (March 2025), which describe the earlier Years 0–8 version that has since been replaced. |
| **[SECONDARY]** | News, union, school, test-provider or third-party source. |
| **[INFERRED]** | My own inference. Treat it as unverified. |

### Access and copyright notes (read first)

- **Tāhūrangi blocks scripted access.** Direct requests to newzealandcurriculum.tahurangi.education.govt.nz and tahurangi.education.govt.nz return HTTP 403. I did not try to get around it. I used these routes instead:
  - **Internet Archive snapshots** of Tāhūrangi pages:
    - Maths Phase 2 (Years 4–6) page, captured 24 Aug 2026.
    - Maths Phase 3 (Years 7–8) page, captured 24 Aug 2026.
    - Maths Phases 1–4 (Years 0–10) overview page, captured 2 Apr 2026.
    - Copyright notice, captured 6 Jul 2026.
    - SMART announcement, captured 14 Jan 2026.
  - **Official PDFs on the Ministry file CDN** (`files-au-prod.cms.commerce.dynamics.com`): the infosheet, the "What's New 0–8" sheet, the poster and the implementation timeline. All downloaded normally on 26 Oct 2026.
  - **Live pages on education.govt.nz** (Parent Portal), plus NZCER and DPMC pages.
  - **NZ Gazette notice 2025-sl7165**, via its archive snapshot (12 Feb 2026). gazette.govt.nz itself served a bot challenge (Incapsula), so I stopped there.
- **Other bot blocks I hit and did not bypass:**
  - **nzc-maths-practice.nz** (the Ministry's practice site, Cloudflare block). Not read; described only from the Ministry page that links to it.
  - **educationcounts.govt.nz** (403). Not read.
- **Per-year PDFs not obtained.** The Phases 1–4 page's File Downloads list includes "-Mathematics-and-Statistics-Yr-6-Teaching-Sequence-.pdf" (385 KB) and "-Mathematics-and-Statistics–Yr-7-Teaching-Sequence-.pdf" (407 KB). That list was seen on the live page on 25 Oct 2026 during the Year 9 research. The list loads dynamically, so no copy I could access exposed the download links; the archived pages show "No files available for download". **The topic maps below come from the HTML teaching-sequence tables on the archived Phase 2 and Phase 3 pages**, not from the PDFs.
- **Archive date vs live.** The Phase 2 and Phase 3 text is from 24 Aug 2026, and I could not confirm the live pages are unchanged since. For comparison, the Year 9 research found the Phase 4 page unchanged between April and October 2026. **[INFERRED: low risk]**
- **How the tables were read.** The teaching-sequence tables use merged cells, where one cell can span two or three years. I expanded every merged cell programmatically before assigning statements to a year, so each statement below sits in the year column(s) the official table puts it in.
- **Why the topic map is condensed rather than copied word for word.** As in the Year 9 doc, statements are condensed but keep the official meaning, examples and number ranges. Pointers (strand → element → Knowledge or Practices → year) show where each sits in the source. The text is CC BY-NC 4.0 (section 7), so the app can import the verbatim statements with attribution. **Nothing in the topic map is written from memory.**

---

## 1. Summary: what applies in 2026 and 2027

| Year | What applies | Phase | Status |
|---|---|---|---|
| **Year 6 (2026)** | The "During Year 6" columns of *Curriculum Statement (The New Zealand Curriculum – Mathematics and Statistics Years 0–10) 2025*. | **Phase 2 (Years 4–6)** | In force from **1 Jan 2026** for English-medium state and state-integrated schools. Gazetted (notice 2025-sl7165, 11 Dec 2025). **[OFFICIAL-FINAL]** |
| **Year 7 (2027)** | The "During Year 7" columns of the same statement. | **Phase 3 (Years 7–8)** | Already in force. The June 2026 timeline shows no further maths change for 2027. **[OFFICIAL-FINAL]** |

Unlike Years 0–8 Science, maths is **not** "proposed": it is gazetted secondary legislation.

### Key dates [OFFICIAL-FINAL unless marked]

- **31 Oct 2024.** Gazette notice 2024-sl5500: the *earlier* Years 0–8 maths statement (Phases 1–3).
  - The implementation timeline PDF shows Maths Years 0–8 as required from **2025**.
  - This is the version the student was taught in Year 5 (2025).
- **20 Oct 2025.** Final Years 0–10 maths released.
  - The Years 0–8 content was also revised "to ensure strong alignment and a well-sequenced progression" (Maths infosheet, 20 Oct 2025).
  - Use starts Term 1, 2026.
- **11 Dec 2025.** Gazette notice 2025-sl7165.
  - It makes the 2025 Years 0–10 statement.
  - It is in force **1 Jan 2026**, except for schools run by specified kura boards, where it is in force 1 Jan 2027.
  - It **revokes and replaces** the 2024 "Mathematics and Statistics Learning Area Years 0–8 (phases 1–3)" statements.
  - The assessment requirements are the "foundation curriculum policy statement" part; the teaching sequence is the "national curriculum statement" part.
- **1 Jan 2026.** In force.
  - A school not ready on day one must "make a start by developing, and then executing, a plan that achieves full implementation as soon as practicable over the course of 2026" (Phases 1–4 page).
  - Maths is a required learning area, "to be taught through to Year 10 in full to all students".
- **3 Feb 2026.** Parent guide to SMART published. 2026 windows: Term 2 (20 Apr – 22 May) and Term 4 (12 Oct – 13 Nov).
- **Term 2 2026.** SMART used for the first time: more than 200,000 students in more than 1,330 schools and kura (DPMC Target 7 factsheet, quarter ending June 2026).
- **4 Jun 2026.** Implementation timeline PDF. Its note says the updated Years 0–10 Mathematics and Statistics, including its assessment requirements, "were required to be used from the start of 2026". The 14 May 2026 timeline changes affected other learning areas, not maths.
- **2026 only.** e-asTTle is still a permitted maths assessment tool in 2026; it is listed as "(during 2026 only)" (section 5).
- **From 1 Jan 2027.** School reports must include a set of new required elements (section 5.4).

### Conflicts and flags

1. **The timeline graphic says "2025" for Maths Years 0–8.**
   - That is when the first (2024) Years 0–8 version became required.
   - The note on the same sheet, the Phases 1–4 page and the Gazette all say the updated Years 0–10 version applies from 2026.
   - So Year 6 in 2026 follows the 2026 version.
2. **The Parent Portal Year 6 and Year 7 maths pages (published 25 Mar 2025) describe the earlier 2025 version, not the current one.** **[OFFICIAL-DRAFT]** Examples where they differ from the current teaching sequence:
   - **Year 6:**
     - The page says "numbers up to a million"; the current Year 6 says "any whole number".
     - The page's Year 6 vocabulary includes "percentage" and "milli-, centi-, kilo-". The current lists put percentage in Year 5, and centi– and kilo– in Year 4 (milli– in Year 5).
   - **Year 7:**
     - The page says "estimate and measure length, area, volume…" and gives "724 g = 0.724 kg". The current Year 7 practice is only about choosing a base unit plus prefix; the estimate-and-measure statement is in the current **Year 8**.
     - The page says "check data for inconsistencies and accuracy" and "nets… like boxes or cones". The current text has "drawing nets for prisms and pyramids" and has no data-accuracy statement.
   - **Use:** treat these pages as a source of at-home ideas only, and take content from the teaching sequence.
3. **Two errors in the official Years 0–10 glossary.** The same glossary appears on every phase page.
   - "Irrational number" gives √4 as an example, but √4 = 2 is rational (already flagged in the Year 9 doc).
   - "Relative frequency" is defined as occurrences "divided by the total number of possible outcomes". The Year 7–8 knowledge statement says "divided by the total number of trials in the experiment", which is the correct one.
   - The app should use the teaching-sequence wording.
4. **Partial implementation in 2026 is allowed** (see 1 Jan 2026 above). A Year 6 class could therefore still be partly following the older 2025 sequence in 2026. **[INFERRED]**
5. **No Year 6 or Year 7 maths learning kits were found.** Learning kits exist for Year 9 maths, and DPMC reports Years 7–8 *English* kits. I found no Ministry kits for Years 6–7 maths. **[SECONDARY: search results only]**

---

## 2. Structure (Phases 2–3) [OFFICIAL-FINAL]

**Sources:**
- Phases 1–4 overview page (archived 2 Apr 2026).
- Phase 2 and Phase 3 pages (archived 24 Aug 2026).
- Infosheet (20 Oct 2025).
- "What's New in Mathematics and Statistics 0–8".
- Poster (Learning Area Narrative).

- **Six strands:** Number, Algebra, Measurement, Geometry, Statistics, Probability.
- Each strand has **elements**, which were called sub-strands in the earlier version.
- Each element has **Knowledge** ("the facts, concepts, principles, and theories to teach") and **Practices** ("the skills, strategies, and applications to teach").
- Both are split by year: "During Year 4/5/6" in Phase 2 and "During Year 7/8" in Phase 3. Many cells span two or three years.
- **The elements by phase:**

| Strand | Phase 2 (Years 4–6) elements | Phase 3 (Years 7–8) elements |
|---|---|---|
| Number | Number structures; Operations; Rational numbers; Financial mathematics | Number structures and operations; Financial mathematics |
| Algebra | Equations and relationships | Equations and relationships |
| Measurement | Measuring | Measuring |
| Geometry | Shapes; Spatial reasoning; Pathways | Shapes; Spatial reasoning; Pathways |
| Statistics | Developing knowledge from data; Visualisation of data; Interpretation of data | Same three |
| Probability | Experimental probability | Experimental probability; Theoretical probability |

- **Phase emphasis** (condensed from the official Introduction):
  - **Years 4–6:**
    - using a variety of representations to model number operations and solve word problems
    - extending whole numbers to fractions and decimals
    - visualising, classifying and drawing angles using benchmarks
    - applying number operations to measurement, and to variation in patterns, shapes, probabilities and data
    - beginning to work with exponents
    - telling the time and converting units of time
  - **Years 7–8:**
    - logic and reasoning to identify, clarify and solve problems
    - using conventions, vocabulary and algebraic notation to explain and justify
    - selecting and adapting representations (number lines for integers, equations for linear patterns)
    - generalising and calculating unknowns (e.g. angle sizes)
    - using data visualisations to evaluate claims and make conjectures
    - beginning to explore irrational numbers and operating fluently with integers
- **Mathematical and statistical processes** underpin all teaching: investigating, representing and connecting situations; generalising, explaining and justifying findings.
- **Teachers may reorder.** The sequences "set out what is to be taught". Teachers shape the enactment, "adjusting the order and emphasis, and adding contexts and content".
- **Teaching time:** schools with Years 0–8 must provide **5 hours per week** of maths teaching and learning.
- **Changes from the earlier (2025) Years 0–8 version** (infosheet; What's New):
  - Algorithmic Thinking removed (now in Technology).
  - Statistics reorganised: the statistical enquiry cycle is no longer the organising structure, and there is less to teach in most years.
  - **Probability now starts at Year 5.**
  - Phase 2: more focus on multiplication and division facts, a clearer fractions progression, and decimals to three places.
  - Phase 3: a clearer Year 7 → Year 8 progression, and preparation for Years 9–10 (e.g. parts of a circle, algebraic notation).
  - Key year-level changes listed: see section 4.

---

## 3. Topic maps

**Conventions**
- Statements are condensed. *(Y6)* = cell for that year only; *(Y5–6)*, *(Y4–6)*, *(Y7–8)* = the cell spans those years.
- **Knowledge** lists every knowledge cell that covers the year, including ones that span earlier years.
- **Practices** lists only cells that cover the year. Practices from earlier years are assumed prior learning and are not repeated.
- Examples in brackets are the official examples.

### 3.1 Year 6 (2026): Phase 2, "During Year 6"

**Source:** "NZC – Mathematics and Statistics Phase 2 (Years 4–6)", https://newzealandcurriculum.tahurangi.education.govt.nz/new-zealand-curriculum-online/nzc---mathematics-and-statistics-phase-2-years-4-6/5637289332.p
- Read from the archive snapshot of 24 Aug 2026.
- The page states: "From 1 January 2026 this content is part of the statement of official policy…"
- **Status: [OFFICIAL-FINAL]**

#### Strand: NUMBER

**Element: Number structures**

| Knowledge | Practices (Y6) |
|---|---|
| <ul><li>*(Y6)* The base 10 system extends infinitely in two directions.</li><li>*(Y4–6)* Rounding helps predict or estimate a calculation's result. It rests on identifying the nearest place value or unit (ten, hundred, thousand); a number line supports this.</li><li>*(Y6)* Square numbers = a number × itself; cube numbers = a number multiplied by itself twice (4 × 4 × 4).</li><li>*(Y5–6)* Negative numbers sit left of 0 on a horizontal number line and below 0 on a vertical one. They are written with a negative sign (−) and named "negative" plus the numeral (−4 = "negative four"). Zero is neither positive nor negative. Negatives arise in contexts such as debt and temperature.</li></ul> | <ul><li>Read, write, compare and order **any** whole number; represent it using base 10 structure.</li><li>Factor pairs for products of any two whole numbers from 1 to **12**.</li><li>Round whole numbers to the nearest million, hundred thousand, ten thousand, thousand, hundred or ten.</li><li>Round hundredths to the nearest whole number or tenth.</li><li>Recognise square and cube numbers and the ² and ³ notation.</li><li>**Memorise square numbers to 144 and cube numbers to 125.**</li><li>Count forwards and backwards with whole numbers, including negatives (start at −6 and count back in 2s).</li></ul> |

**Element: Operations**

| Knowledge | Practices (Y6) |
|---|---|
| <ul><li>*(Y6)* **Order of operations** for expressions with more than one operation: brackets; exponents such as squaring; × and ÷ left to right; + and − left to right. *(The GEMA mnemonic first appears in Years 7–8.)*</li><li>*(Y4–6)* Addition and subtraction can be done mentally (known facts, place value, partitioning) or with column methods. Written algorithms rely on place value, regrouping and renaming.</li><li>*(Y6)* Division remainders can be whole numbers, fractions or decimals, depending on the context.</li></ul> | <ul><li>Calculate expressions using the order of operations.</li><li>Add and subtract any whole numbers.</li><li>Multiply any whole number by a two-digit number (542 × 12).</li><li>Divide up to five-digit whole numbers by a one-digit divisor, with remainder (1283 ÷ 5 = 256 r 3).</li><li>Connect unit fractions of whole numbers to division with remainders (1/6 of 31 = 31 ÷ 6 = 5 1/6).</li><li>Represent remainders as whole numbers, fractions or rounded decimals to suit the context.</li></ul> |

*Note:* memorising ×/÷ facts for 2s to **12s** is a **Year 5** practice. Year 6 does not restate it, but its practices assume it.

**Element: Rational numbers**

| Knowledge | Practices (Y6) |
|---|---|
| <ul><li>*(Y6)* **Thousandths** come from dividing whole numbers by 1,000 and can be written as fractions or decimals.</li><li>*(Y6)* Equivalent fractions can be generated **and simplified** using common factors.</li><li>*(Y6)* Percentages can compare quantities to a value or whole.</li><li>*(Y5–6)* Fractions should have the same denominator before adding or subtracting.</li><li>*(Y5–6)* ×, ÷, fractions, decimals and percentages solve problems about relative quantities and measures.</li></ul> | <ul><li>Read, write and represent tenths, hundredths and thousandths as fractions and decimals.</li><li>Compare and order numbers with up to **three decimal places**.</li><li>Memorise decimal and percentage equivalents of 1/2, 1/4, 3/4, 1/5, 2/5, 3/5, 4/5, and of fractions with denominator 10 or 100.</li><li>Convert decimal tenths and hundredths to fractions and percentages (0.31 = 31/100 = 31%).</li><li>Multiply and divide by 10, 100 or 1,000 to make decimals and whole numbers (1.3 × 10 = 13); identify tenths, hundredths and thousandths places.</li><li>Find equivalent fractions.</li><li>Compare and order fractions where at least one denominator is a common multiple of all the others.</li><li>Convert between mixed numbers and improper fractions.</li><li>Add and subtract fractions and mixed numbers when one denominator is a multiple of the other.</li><li>Add and subtract decimals to three decimal places.</li><li>Find a non-unit fraction of a whole number, with a whole-number answer (2/3 of 240).</li><li>Find the whole from a non-unit fraction (3/4 of the set is 90; what is the whole set?).</li><li>Find 1%, 10%, 20%, 25%, 50% and 75% of whole numbers.</li><li>Find the whole (100%) from a percentage (75% is 24).</li><li>Reason proportionally with fractions, decimals and percentages to compare two quantities and find missing values.</li></ul> |

**Element: Financial mathematics**

| Knowledge | Practices (Y6) |
|---|---|
| *(Y5–6)* Money uses the decimal place-value system to two decimal places. | <ul><li>Calculate 10%, 25% and 50% of whole-dollar amounts (50% of $280).</li><li>Investigate questions about purchases (e.g. is there enough money?).</li></ul> |

#### Strand: ALGEBRA

**Element: Equations and relationships**

| Knowledge | Practices (Y6) |
|---|---|
| <ul><li>*(Y6)* Inequalities can include "or equal to" (≤, ≥).</li><li>*(Y6)* Tables organise the positions and elements of a pattern to reveal relationships or rules.</li><li>*(Y6)* A **coordinate plane** forms where two perpendicular number lines meet at (0, 0), usually with a horizontal x-axis and a vertical y-axis.</li><li>*(Y6)* Coordinates are written (x, y): x = horizontal movement, y = vertical movement. Plotting points helps visualise numeric patterns.</li></ul> | <ul><li>Check the truth of, and complete, open number sentences with all four operations, including inequalities, respecting the order of operations (8 × 7 ≤ 8 × 5 + 4²: true or false?).</li><li>Develop a rule in words for a growing pattern; make conjectures about further elements.</li><li>Locate coordinate points, including points on the x- or y-axis.</li><li>Generate a table of values from a growing-pattern rule and plot the points.</li></ul> |

*Note:* the Year 6 text does not say which quadrants to use. Four quadrants are explicit from Year 7.

#### Strand: MEASUREMENT

**Element: Measuring**

| Knowledge | Practices (Y6) |
|---|---|
| <ul><li>*(Y6)* Measurements can be approximated from previously measured benchmark lengths, volumes or areas.</li><li>*(Y6)* **Metric prefixes:** milli– (m) = 1000× smaller than the base unit; centi– (c) = 100× smaller; kilo– (k) = 1000× larger. Converting can mean × or ÷ by 10, 100 or 1000.</li><li>*(Y6)* Area of a right-angled triangle = half the area of the rectangle with the same base and height.</li><li>*(Y6)* Volume of a rectangular prism = product of its side lengths.</li><li>*(Y6)* Angles at a point sum to 360°; angles on a straight line sum to 180°; vertically opposite angles are equal.</li><li>*(Y6)* Time and duration appear in solar calendars (Roman, Gregorian) and lunar calendars (maramataka Māori, Chinese). Timetables record the time and duration of events.</li></ul> | <ul><li>*(Y5–6)* Accurately measure length (ruler), mass (scales), capacity (jugs), temperature (thermometer) and duration (timer), in suitable metric or time units or combinations (2 hours and 30 minutes).</li><li>Estimate, using benchmarks: length, mass, capacity, temperature and duration.</li><li>Convert m↔cm, g↔kg and L↔mL, including combining mixed units into values with up to 2 decimal places (10 kg and 500 g = 10.5 kg).</li><li>Calculate, estimate and compare volumes of cubes and rectangular prisms in cm³ and m³.</li><li>Visualise, estimate and calculate (by multiplication) areas of rectangles and right-angled triangles (cm², m²) and volumes of rectangular prisms (cm³).</li><li>Classify, measure and construct angles up to **360°** with a protractor.</li><li>Identify and describe angles at a point, angles on a straight line and vertically opposite angles, using angle notation.</li><li>Reason about and find unknown angles in those situations.</li><li>Convert between units of time (h, min, s).</li><li>Measure duration in 12- and 24-hour time.</li><li>Find elapsed time in minutes across an hour (2:53 pm to 3:28 pm).</li><li>Use timetables to calculate durations (bus and train schedules).</li></ul> |

*Note:* perimeter practices sit in Years 4–5. Year 6 adds no perimeter statement.

#### Strand: GEOMETRY

**Element: Shapes**

| Knowledge | Practices (Y6) |
|---|---|
| <ul><li>*(Y6)* Quadrilaterals fall into one or more categories: trapezium (one pair of parallel sides); parallelogram (two pairs); kite (two pairs of equal-length adjacent sides); rectangle (four right angles); rhombus (four equal-length sides); square (four right angles and four equal-length sides).</li><li>*(Y6)* **Order of rotational symmetry** = the number of times a shape looks identical during a full 360° turn. For a circle it is infinite.</li></ul> | <ul><li>Identify, classify and explain similarities and differences between 2D shapes (including types of triangles and quadrilaterals) and between prisms and pyramids.</li><li>Identify and describe the interior angles of triangles and quadrilaterals.</li><li>Identify shapes with rotational symmetry and find the order.</li></ul> |

**Element: Spatial reasoning**

| Knowledge | Practices (Y6) |
|---|---|
| <ul><li>*(Y6)* A **tessellation** is a pattern of a repeated shape, or combination of shapes, rotated or reflected to fit with no gaps or overlaps.</li><li>*(Y4–6)* Reflection = flipped over a line (mirror image); translation = slid without turning; rotation = turned about a fixed point.</li></ul> | <ul><li>Visualise, create and describe 2D patterns and tessellations using rotation, reflection and translation; identify the properties that don't change.</li><li>Predict the results of **two-step** transformations on 2D shapes.</li></ul> |

**Element: Pathways**

| Knowledge | Practices (Y6) |
|---|---|
| *(Y4–6)* An alphanumeric grid reference labels rows with letters and columns with numbers, so each square is a letter plus a number (A1, B2). | Interpret and create grid references and **simple map scales**, using directional language: the four main compass points, turn (in degrees) and distance (m, km), to locate and describe positions and pathways. |

#### Strand: STATISTICS

**Element: Developing knowledge from data**

| Knowledge | Practices (Y6) |
|---|---|
| <ul><li>*(Y6)* Bivariate data includes **time-series data**: two numerical values, one time-based.</li><li>*(Y6)* Answers to a statistical investigative question vary between subjects.</li><li>*(Y6)* **Mean** = sum of values ÷ number of values; it measures centre.</li><li>*(Y6)* **Range** = highest − lowest; it measures spread.</li></ul> | <ul><li>Collect time-series data (how the mass of a kilogram of carrots varies over 5 days).</li><li>Calculate the mean of numerical data.</li><li>Calculate the range of numerical data.</li></ul> |

**Element: Visualisation of data**

| Knowledge | Practices (Y6) |
|---|---|
| *(Y6)* Time-series data is shown with a time-series (line) graph on a coordinate plane: x-axis = time, y-axis = the second variable. | <ul><li>Create time-series graphs.</li><li>Choose and create an appropriate visualisation for a given data set.</li></ul> |

*Note:* the "what a good visualisation includes" checklist (title, variables, group, units, values or categories, frequency scale from 0) is **Year 4** knowledge.

**Element: Interpretation of data**

| Knowledge | Practices (Y6) |
|---|---|
| *(Y4–6)* Interpreting a visualisation means describing its variables and units, the context, and key features: **shape** (e.g. number of peaks), **middle group(s)**, and **spread** (from minimum to maximum). | <ul><li>Identify whether a time-series graph shows a trend.</li><li>Calculate an average and a range for continuous numerical data.</li><li>Interpret data visualisations, including from contemporary media.</li></ul> |

#### Strand: PROBABILITY

**Element: Experimental probability**

| Knowledge | Practices (Y6) |
|---|---|
| <ul><li>*(Y5–6)* Chance-based situations involve chance, uncertainty and randomness; probability describes them.</li><li>*(Y5–6)* A **trial** is a single run, with one of a set of possible outcomes. Outcomes can be arranged into **events**. The probability of an outcome is the chance of it occurring.</li><li>*(Y5–6)* Probabilities run from 0 to 1: 0 = impossible; between 0 and 0.5 (1/2) = very unlikely to unlikely; 0.5 = equally likely; between 0.5 and 1 = likely to very likely; 1 = certain. They can be shown on a 0–1 number line.</li><li>*(Y5–6)* The **sample space** is all possible outcomes.</li><li>*(Y5–6)* If outcomes are believed equally likely, P(event) = number of ways the event can happen ÷ total number of possible outcomes.</li><li>*(Y5–6)* The probabilities of all outcomes sum to 1.</li></ul> | <ul><li>List the sample space of an event (rolling a die: 1, 2, 3, 4, 5, 6).</li><li>Calculate probabilities of individual outcomes.</li><li>Calculate probabilities with a spinner, where each event is a fraction or combination of fractions of the spinner.</li><li>Answer questions about the probability of combinations of outcomes, including checking that all probabilities sum to 1.</li></ul> |

#### Year 6 vocabulary (official "language of Mathematics and Statistics for Years 4–6", Year 6 column)

"Students will be taught the following new words":
- **Number:** brackets, efficient, simplest form, square number, cube number, systematically, thousandth
- **Algebra:** constant (amount of change); coordinate plane, XY graph, x-axis, y-axis; inequality; ordered pairs
- **Measurement:** cubic centimetre (cm³), cubic metre (m³), protractor, square centimetre (cm²), square metre (m²)
- **Geometry:** angles at a point, on a straight line, vertically opposite angles; interior angle; kite, parallelogram, rhombus, trapezium; map scale; right-angled triangle; rotational symmetry; tessellation
- **Statistics:** mean, range, time-series data
- **Probability:** experiment; impossible, unlikely, evenly likely, likely, certain; outcome; sample space

Words from Years 4–5 are assumed. Examples: decimal, improper fraction, mixed number, factor, percentage, proportion, quotient, negative/positive, bivariate data, clustered bar graph, event, equally likely outcome.

### 3.2 Year 7 (2027): Phase 3, "During Year 7"

**Source:** "NZC – Mathematics and Statistics Phase 3 (Years 7–8)", https://newzealandcurriculum.tahurangi.education.govt.nz/new-zealand-curriculum-online/nzc---mathematics-and-statistics-phase-3-years-7-8/5637289333.p
- Read from the archive snapshot of 24 Aug 2026.
- Same official-policy statement as Phase 2.
- **Status: [OFFICIAL-FINAL]**

In Phase 3, **every Statistics and Probability cell spans Years 7–8**. The Year 8 differences are in Number, Algebra, Measurement and Geometry.

#### Strand: NUMBER

**Element: Number structures and operations** (place value, powers, primes, integers)

| Knowledge | Practices (Y7) |
|---|---|
| <ul><li>*(Y7)* Each place value is a power of 10, continuing infinitely.</li><li>*(Y7)* Repeated multiplication can be written in exponent notation with positive exponents. An exponent means "raising to the power of" (5² = 5 raised to the power of 2, or 5 to the second power).</li><li>*(Y7)* Expanded form uses powers of 10 to show place value.</li><li>*(Y7)* Whole numbers greater than 0 are prime, composite, or 1. Prime = exactly two distinct factors (1 and itself); composite = more than two; 1 is neither.</li><li>*(Y7)* **HCF** = the greatest number that is a factor of both numbers. **LCM** = the smallest number that both are factors of.</li><li>*(Y7–8)* The number system extends infinitely, including into negatives, and can be shown on a number line. **Integers** are positive and negative whole numbers and zero. Every number has an **additive inverse**, and the two sum to zero (−5 + 5 = 0).</li><li>*(Y7–8)* Rounding, estimation and benchmarks support comparing numbers and checking that findings are reasonable. A division remainder can be a whole number, fraction or decimal.</li><li>*(Y7–8)* **Order of operations:** brackets; exponents (squaring and cubing); × and ÷ left to right; + and − left to right. Mnemonic **GEMA**: grouped, exponents, multiplicative (× and ÷), additive (+ and −).</li></ul> | <ul><li>Read, write, compare and order whole numbers using powers of 10 (10,000 = 10⁴; 1000 < 10⁴).</li><li>Write numbers in expanded form with powers of 10 (34,506 = 3 × 10⁴ + 4 × 10³ + 5 × 10² + 6).</li><li>Use exponents; identify square roots of square numbers up to at least 144.</li><li>Use the radical sign (√) for square roots.</li><li>Use divisibility rules for 2, 3, 4, 5, 6, 8, 9 and 10.</li><li>Identify prime numbers to 100.</li><li>Find the HCF of two numbers under 100, and the LCM of two numbers under 10.</li><li>Locate integers on a number line; order negative and positive whole numbers on a number line.</li><li>Identify the additive inverse of any number.</li><li>Show addition and subtraction of integers on a number line.</li><li>Use negative numbers in contexts including temperature and finance.</li><li>Use rounding and estimation to predict and check (0.73 + 0.8 + 0.999 must be less than 3).</li><li>Round whole numbers to any specified power of 10; round decimals to the nearest whole number, tenth or hundredth.</li><li>Multiply whole numbers.</li><li>Divide whole numbers by one- or two-digit divisors (327 ÷ 5 = 65.4 or 65 2/5).</li><li>Evaluate expressions using the order of operations.</li></ul> |

**Element: Number structures and operations** (fractions, decimals, percentages; same element, separate rows)

| Knowledge | Practices |
|---|---|
| <ul><li>*(Y7)* A fraction can describe a proportional relationship between two amounts.</li><li>*(Y7)* Every fraction has an infinite set of equivalent fractions, all at the same point on the number line.</li><li>*(Y7)* Fractions convert to decimals by division, giving either a **terminating** decimal (5/16 = 0.3125) or a **repeating, infinite** decimal (7/3 = 2.3 recurring; 1/7 = 0.142857 recurring).</li><li>*(Y7)* In simplest form, numerator and denominator share no common factor.</li><li>*(Y7)* Scaling by powers of 10 and using number facts supports multiplying decimals.</li><li>*(Y7)* Multiplying a whole number by a fraction gives the same result as finding that fraction of the whole number.</li><li>*(Y7)* Percentages are decimal fractions with denominator 100, written with %.</li></ul> | <ul><li>*(Y7–8)* Identify, read, write and represent fractions, decimals and percentages.</li><li>*(Y7–8)* Compare, order and convert between fractions, decimals and percentages.</li><li>*(Y7)* Find equivalent fractions; write fractions in simplest form.</li><li>*(Y7)* Add and subtract fractions, including improper fractions and mixed numbers; answer in simplest form.</li><li>*(Y7)* Add and subtract decimals.</li><li>*(Y7)* Multiply and divide numbers by powers of 10.</li><li>*(Y7)* Multiply whole numbers by fractions (simplest form).</li><li>*(Y7)* Multiply decimals by whole numbers (0.7 × 5 and 0.7 × 50, both from 7 × 5 = 35).</li><li>*(Y7)* **Divide fractions by whole numbers** (simplest form).</li><li>*(Y7)* **Divide a whole number by a unit fraction.**</li><li>*(Y7)* Find a fraction of a whole number (5/3 of 186).</li><li>*(Y7)* Find the whole from a fraction (5/4 of the set is 85; what is the whole set?).</li><li>*(Y7)* Find common percentages of whole numbers.</li><li>*(Y7)* Find the whole (100%) from a percentage (40% is 28).</li><li>*(Y7)* Use proportional reasoning about multiplicative relationships ("3 red for every 7 blue balls; how many balls altogether when there are 18 red?").</li></ul> |

**Element: Financial mathematics**

| Knowledge | Practices (Y7) |
|---|---|
| *(Y7–8)* Answers to NZ-currency problems are rounded to two decimal places. Cash payments in New Zealand are rounded up or down to the nearest 10 cents. | <ul><li>Calculate the total cost and change for a transaction of any amount.</li><li>Apply percentage discounts to whole-dollar amounts (a 20%-off sale).</li></ul> |

#### Strand: ALGEBRA

**Element: Equations and relationships**

| Knowledge | Practices |
|---|---|
| <ul><li>*(Y7–8)* A **variable** can represent an unknown number, often in formulae (s in s²); a quantity that varies (y = 3x + 4; A = bh); or a specific unknown to solve for (3a = 18).</li><li>*(Y7–8)* A solution satisfies its equation. Equations can be rearranged with inverse operations (+/−, ×/÷). Check solutions by substitution. Trial and error works but can be inefficient.</li><li>*(Y7)* **Algebraic notation conventions:**<ul><li>3b for b + b + b, 3 × b and b × 3</li><li>b for 1b</li><li>ab for a × b or b × a (alphabetical order)</li><li>a² for a × a; a³ for a × a × a</li><li>a/b for a ÷ b and a × 1/b</li><li>a for a¹</li><li>1 for a/a when a ≠ 0</li></ul></li><li>*(Y7–8)* The coordinate plane extends to **four quadrants** meeting at the origin (0, 0).</li><li>*(Y7–8)* Linear patterns have a constant increase or decrease, can be described by the rule t = a × n + d, and graph as a straight line.</li></ul> | <ul><li>*(Y7)* Form and solve **one- and two-step linear equations with integer solutions** (t + 7 = 12; 5s + 3 = 18).</li><li>*(Y7)* Check the truth of, and complete, number sentences with all four operations, including inequalities (0.8 × 12 ≤ 8 × 0.5 + 8: true or false?).</li><li>*(Y7–8)* Use substitution to find the value of an expression or formula (w + 12 given w = 4).</li><li>*(Y7)* Rearrange known formulae in one or two steps (make w the subject of A = lw).</li><li>*(Y7)* Simplify expressions with any of the four operations by collecting like terms (3a + a + a = 5a; 3b − 2b = b).</li><li>*(Y7–8)* Identify and plot points in all four quadrants from ordered pairs and tables.</li><li>*(Y7–8)* Use tables, coordinate graphs and diagrams to relate ordinal position to its element in a linear pattern; state the rule in words; make conjectures.</li><li>*(Y7–8)* Identify the constant increase or decrease in a linear pattern, write the rule as an equation using variables, and use it to make conjectures.</li></ul> |

#### Strand: MEASUREMENT

**Element: Measuring**

| Knowledge | Practices (Y7) |
|---|---|
| <ul><li>*(Y7)* Area is two-dimensional, so its units are squared (cm²). Volume is three-dimensional, so its units are cubed (cm³).</li><li>*(Y7)* Formulae represent relationships between measurements and find unknowns from knowns.</li><li>*(Y7)* Shapes can be decomposed or recomposed to find perimeters, areas and volumes.</li><li>*(Y7)* **Perimeter:** square P = 4l; rectangle P = 2(l + w).</li><li>*(Y7)* **Area:** triangle A = ½bh (= bh/2); square A = l²; rectangle A = lw or A = bh.</li><li>*(Y7)* **Volume:** cube V = l³; rectangular prism V = lwh.</li><li>*(Y7–8)* Duration questions can involve fractions of time and converting between units of time.</li></ul> | <ul><li>Select and use an appropriate base unit (metre, gram, litre) with a prefix (kilo–, centi–) to show the unit's size.</li><li>Use formulae to find unknown perimeter measurements (the side of a square from its perimeter; an unknown side of a composite shape from its perimeter).</li><li>Use formulae to find unknown area measurements (a triangle's base from its area and height; the area of a triangle-plus-rectangle shape from its side lengths).</li><li>Use formulae to find unknown volume measurements (a cube's dimensions from its volume; a rectangular prism's volume from its side lengths).</li><li>Read, interpret and use timetables and charts that present duration information.</li></ul> |

*Note:* the Year 7 knowledge cell for the first Measuring row is empty in the source. Angle work in Year 7 sits under Geometry → Spatial reasoning.

#### Strand: GEOMETRY

**Element: Shapes**

| Knowledge | Practices (Y7) |
|---|---|
| <ul><li>*(Y7)* **Triangles by angles:** acute (three acute angles), right (one right angle), obtuse (one obtuse angle).</li><li>*(Y7)* **Triangles by sides:** equilateral (three equal sides), isosceles (at least two equal sides), scalene (all sides different).</li><li>*(Y7)* All angles in an equilateral triangle are 60°. The base angles of an isosceles triangle (opposite the equal sides) are equal.</li></ul> | Classify triangles by both their angle and side properties. |

**Element: Spatial reasoning**

| Knowledge | Practices (Y7) |
|---|---|
| <ul><li>*(Y7–8)* The exterior angles of a polygon sum to 360°.</li><li>*(Y7–8)* In a regular polygon all exterior angles are equal; an exterior angle = 180° − the interior angle, or 360° ÷ the number of sides.</li><li>*(Y7–8)* Interior angle sum: triangle 180°, quadrilateral 360°; any polygon 180(n − 2)°, where n = number of sides.</li></ul> | <ul><li>Transform 2D shapes on the coordinate plane by a single translation, a reflection across a given mirror line, or a rotation about a given point by a multiple of 90°.</li><li>Identify the 2D shapes that make up 3D shapes.</li><li>**Draw nets for prisms and pyramids.**</li><li>Reason about unknown angles with perpendicular lines, parallel lines and transversals.</li><li>Find an unknown angle by setting up and solving a **multi-step equation** from supplementary, complementary, vertical and adjacent angle relationships.</li></ul> |

**Element: Pathways**

| Knowledge | Practices (Y7) |
|---|---|
| *(Y7: empty cell in source.)* | Interpret and communicate positions and pathways using coordinates, angle measures, and the eight main and halfway compass points (NE = 45° E from N). |

#### Strand: STATISTICS (all cells Y7–8)

**Element: Developing knowledge from data**

| Knowledge | Practices |
|---|---|
| <ul><li>A variable is an attribute or measurement of the people or objects studied. Categorical variables classify into groups; discrete numerical variables are counted; continuous numerical variables are measured.</li><li>The response to a statistical question can be summarised by a **measure of central tendency**: the **mean** (average of numerical data), the **median** (middle value of sorted numerical data) or the **mode** (the highest-frequency value, for categorical or discrete numerical data).</li><li>It can also be summarised by the **range** as a measure of spread (highest − lowest).</li></ul> | <ul><li>Plan and collect data to answer a statistical question (Are our feet the same length?).</li><li>Calculate the mean, median and mode of numerical data.</li><li>Calculate the range.</li></ul> |

**Element: Visualisation of data**

| Knowledge | Practices |
|---|---|
| <ul><li>Categorical data → dot plots and bar graphs. Paired categorical variables → stacked or clustered bar graph. Bivariate time-series data → time-series graph.</li><li>A good visualisation lets viewers see the variable(s) and who the data came from, then, depending on its type, units, frequency, proportions, patterns and trends.</li><li>**Outliers** are points very much bigger or smaller than most. They pull the mean towards themselves but not the median. They are not necessarily errors; some events occur rarely.</li></ul> | <ul><li>Choose and construct an appropriate visualisation for the data type (dot plot, bar graph, time-series graph).</li><li>Notice and explain outliers.</li></ul> |

**Element: Interpretation of data**

| Knowledge | Practices |
|---|---|
| <ul><li>The response to a statistical question includes findings summarised and interpreted in context, with evidence.</li><li>The tapering sides of a visualisation are **tails**. Tails tapering at the same rate give a symmetrical shape; at uneven rates, a skewed shape. In **positively skewed** data the right tail tapers more slowly than the left; in **negatively skewed** data the left tail tapers more slowly than the right.</li><li>Interpreting a visualisation means describing variables and units, the context, and key features:<ul><li>**shape**: peaks; symmetrical or skewed</li><li>**central tendency**: the visual centre, and numerically the median</li><li>**spread**: minimum to maximum, and the range value</li><li>**other features**: least and most frequent categories; trends in time series</li></ul></li><li>A graph that is missing parts (title, axis labels, axis scales) or has errors may have been made to mislead or to hide information.</li></ul> | <ul><li>Answer statistical questions by calculating an appropriate measure of central tendency and the range from data tables and visualisations.</li><li>Interpret visualisations, including from contemporary media.</li><li>Identify when a visualisation can't be interpreted accurately because information is missing.</li><li>Identify outliers by eye and allow for them when using the range.</li></ul> |

#### Strand: PROBABILITY (all cells Y7–8)

**Element: Experimental probability**

| Knowledge | Practices |
|---|---|
| <ul><li>Some chance situations, such as a weighted die, can only be explored by experiment.</li><li>Results from repeated sets of trials of the same experiment may vary.</li><li>**Law of Large Numbers:** as trials increase, the experimental probability approaches the theoretical probability.</li><li>Estimated probability of an event = number of times it happens ÷ total number of trials (its **relative frequency**).</li></ul> | <ul><li>Carry out a chance experiment and calculate the experimental probability of each outcome.</li><li>Compare experimental probability (at least **30 trials**) with theoretical probability; explain why they differ and how more trials reduce the difference.</li><li>Carry out experiments of at least **100 trials**, comparing each outcome's experimental and theoretical probability, to demonstrate the Law of Large Numbers.</li></ul> |

**Element: Theoretical probability** (new element in Phase 3)

| Knowledge | Practices |
|---|---|
| <ul><li>Lists, tables and **tree diagrams** are systematic ways to generate all possible outcomes.</li><li>If all outcomes are assumed equally likely, P(event) = number of ways the event can happen ÷ total number of possible outcomes.</li><li>Probabilities can be written as a fraction or decimal from 0 to 1, or as a percentage from 0% to 100%.</li><li>An event is a subset of the sample space: a single outcome or a combination of outcomes.</li><li>The probability of an event and its **complement** add to 1.</li></ul> | <ul><li>Calculate probabilities as decimals, fractions and percentages.</li><li>Compare the likelihood of different events.</li><li>Calculate probabilities of complementary events.</li></ul> |

#### Year 7 vocabulary (official "language of Mathematics and Statistics for Years 7–8", Year 7 columns)

"Students will be taught the following new words":
- **Number:** associative, benchmark, brackets, commutative, discount, distributive, divisibility rule, evaluating expressions, expanded form, exponent, power, GEMA, highest common factor (HCF), integer, least common multiple (LCM), order of operations, negative, prime numbers, composite numbers, radicals, repeating and non-repeating decimals, round up or round down (finance), square root, terminating decimals
- **Algebra:** algebraic notation, expanded form, formulae, like terms, linear equation, linear patterns, ordered pairs, origin, rearrange, substitution, variable, value
- **Measurement:** angles (complementary, supplementary, vertical, adjacent), composite shape, duration, recompose
- **Geometry:** base angles; equilateral, isosceles, scalene triangle; exterior angle and interior angle
- **Statistics:** central tendency; median, mode
  - *In a cell spanning part of Year 7 and all of Year 8:* outlier; skewed data (positively, negatively), tapering and tails
- **Probability:** complements / complementary event; experimental or theoretical probability; estimated probability; law of large numbers; relative frequency

**Year 8 list, for reference (2028):**
- Number: budget, cube number, cube root, negative exponent, prime factors, ratio
- Algebra: algebraic expression, factorised form/factorising, simplifying expression, triangular numbers
- Measurement: deriving (formulae)
- Geometry: grid reference; radius, diameter, circumference; scale (map)
- Probability: tree diagrams, weighted die

The Phase 3 page also carries the full Years 0–10 glossary (see flag 3 in section 1 for its two errors).

---

## 4. Version changes and bridging (2025 → 2026)

**Official list of key changes** in the revised Years 0–8 content ("What's New in Mathematics and Statistics 0–8", PDF) **[OFFICIAL-FINAL]**:
- **Year 5:**
  - numbers up to one million
  - counting back through 0 to negative numbers
  - ×/÷ facts to 12 × 12
  - dividing a 3-digit number by a 1-digit number
  - knowing some fraction–decimal equivalents
  - adding and subtracting related fractions
- **Year 6:**
  - exponents for square and cube numbers
  - factors statement clarified
  - introduction to thousandths
  - × and ÷ by 1000
  - locating points on a coordinate plane
  - percentage statements clarified
- **Year 7:**
  - identifying prime numbers
  - two-step linear equations
  - drawing nets
  - dividing a fraction by a whole number
- **Year 8** (for later): cube roots; expanded form; multiplying two fractions; area of a parallelogram or trapezium; parts of a circle.

**What it means for this student** [INFERRED]
- **Year 6 in 2026.** The student did Year 5 in 2025 under the earlier statement, so the 2026 Year 5 changes above may not have been taught. Year 6 builds on them, for example:
  - ×/÷ facts to 12 × 12 feed Year 6 factor pairs to 12 and multiplying by two-digit numbers
  - related-fraction addition feeds Year 6 mixed numbers
  - counting through zero feeds Year 6 negatives

  The app should offer short "bridge" checks on these before the Year 6 content.
- **Year 7 in 2027.** It builds on the 2026 Year 6 sequence, so there is no version gap. Year 7 is also where probability splits into experimental and theoretical, statistics adds median, mode, outliers and skew, and algebra becomes symbolic (notation conventions, two-step equations).
- **School order.** Teachers may reorder within a year (section 2), and some schools could still be finishing implementation during 2026. The app should let the user choose "my school's topic order", as in the Year 9 recommendation.

---

## 5. Assessment (Years 6 and 7)

### 5.1 Mandatory twice-yearly maths assessment, Years 3–8 [OFFICIAL-FINAL]

**Source:** assessment requirements on the Phases 1–4 page (archived 2 Apr 2026). This is the gazetted foundation curriculum policy statement part.

- "School boards and principals must make sure that staff administer **twice-yearly assessments for each student in Years 3–8** to monitor their progress in maths using one of the following tools":
  - **SMART** (Student Monitoring, Assessment and Reporting Tool), Ministry of Education
  - **PATs** (Progressive Achievement Tests), NZCER
  - **e-asTTle, during 2026 only**, Ministry of Education
- **So:**
  - **Year 6 (2026):** SMART, PAT or e-asTTle.
  - **Year 7 (2027):** SMART or PAT. **[INFERRED from "2026 only"]**
- These tools are used alongside observation, conversations, self-assessment and learning activities. Results are shared with parents.
- Alternative methods may be agreed in a support plan for a small number of students.

### 5.2 SMART

**Sources:** Parent guide to SMART (education.govt.nz, 3 Feb 2026); Tāhūrangi announcement (15 Jul 2025, archived). **[OFFICIAL-FINAL]**
- A new online tool that replaces e-asTTle. It covers reading, writing and maths (and pānui, tuhituhi, pāngarau) for **Years 3–10**.
- The supplier is Janison Solution Pty Ltd. It is "aligned with the National Curriculum".
- "Not a high-stakes test… more of a learning check-in." "Not all schools use SMART yet."
- **Format:**
  - Mostly online, one question at a time.
  - Students answer by **selecting an option, dragging and dropping, or typing a short response**.
  - A paper version is available. Most assessments take **30–45 minutes**.
- **2026 windows:** Term 2, 20 April – 22 May; Term 4, 12 October – 13 November. Schools choose timing within each window.
- **2027 windows: not found.**
- First use: Term 2 2026, more than 200,000 students in more than 1,330 schools and kura (DPMC Target 7 factsheet, June 2026 quarter).

### 5.3 PAT Pāngarau | PAT Mathematics (NZCER) [SECONDARY: NZCER is the provider named in the official text]

- A standardised maths assessment for Years 3–10, online (NZCER Assist, including an adaptive version) or on paper.
- It assesses Number, Algebra, Measurement, Geometry, Statistics and Probability.
- Recently refreshed. Scores are "provisionally mapped to the progress descriptors"; NZCER's May 2026 update calls this "interim mapping". NZCER also says full reporting against the curriculum is still in development.
- Norms are based on Term 1 data. Stanines are relative, so a high stanine does not necessarily mean year-level expectations are met.
- **Licensing:** PAT items are NZCER material. The app should not reproduce them. **[INFERRED]**

### 5.4 Progress descriptors and reporting [OFFICIAL-FINAL]

**Five common progress descriptors** are mandatory for maths (Phases 1–4 page):
- **Emerging:** needs support to meet year-level expectations or goals in a personalised plan.
- **Developing:** making some progress towards year-level expectations.
- **Consolidating:** meeting many expectations and steadily strengthening understanding.
- **Proficient:** meeting year-level expectations.
- **Exceeding:** exceeding year-level expectations.

**How they are applied:**
- Teachers judge **each strand**, then make an overall judgement, against the year-level teaching sequence.
- **Mid-year:** Consolidating, Proficient or Exceeding = on track.
- **End of year:** only **Proficient or Exceeding = met** expectations. Emerging, Developing and Consolidating = not yet met.
- The parent guide (28 Jan 2026) adds plain-language "your child…" descriptions for each descriptor, e.g. Proficient: "can use what they've learned in different situations without help… can share their thoughts clearly and explain their reasoning".

**Reports to parents:**
- At least twice a year, in plain language.
- **From 1 Jan 2027** reports must include:
  - results from twice-yearly assessments
  - progress against strands in English and in Mathematics & Statistics
  - progress and achievement in reading and writing
  - progress descriptors
  - support information if the student is well below expectations
  - an attendance record
  - next learning steps
- There is an exemplar report PDF (section 9).

### 5.5 System-level monitoring (not individual tests) [OFFICIAL-FINAL: DPMC]

- **Government Target 7:** 80% of **Year 8** students at or above the expected curriculum level in reading, writing and maths by December 2030.
  - Maths: 22% at the Term 4 2023 baseline; 24% in Term 4 2025.
  - Measured through the **Curriculum Insights and Progress Study**, which the factsheet says shows "encouraging signs for Year 6 achievement".
  - This student is Year 8 in 2028.
  - I could not open Education Counts to confirm how the study samples students.
- **Maths acceleration programme** for Years 7 and 8 students needing extra support: the first cohort has finished and a second is underway (same factsheet).

### 5.6 Not found

- No national Year 6 or Year 7 maths exam, and no official exemplars of Year 6 or Year 7 student work against the 2026 sequence.
- No SMART maths item framework or sample items.

### 5.7 App implications [INFERRED]

- Mirror the five descriptors, judged per strand, then overall.
- Schedule "check-ins" before the SMART windows (Term 2 and Term 4).
- Use the SMART answer formats: multiple choice, drag-and-drop, short typed answers, about 30–45 minutes.
- Show a progress-over-time graph like the new reports.
- Remember that Year 7 often means a new school (intermediate or Years 7–13), so the teacher, tool or topic order may change.

---

## 6. Year 6 → Year 7 at a glance [INFERRED summary of section 3; check against the tables]

| Strand | New in Year 6 (2026) | New in Year 7 (2027) |
|---|---|---|
| Number | Any whole number; rounding to millions; squares to 144 and cubes to 125; order of operations; × by two-digit numbers; ÷ five-digit numbers by one digit; thousandths; fractions with related denominators; 1%–75% of amounts; finding the whole | Powers of 10 and expanded form; exponents and √; divisibility rules; primes to 100; HCF and LCM; integers and additive inverse; GEMA; fraction ÷ whole number and whole number ÷ unit fraction; terminating and recurring decimals; proportional reasoning; discounts; cash rounding |
| Algebra | ≤ and ≥; open number sentences with all operations; pattern rules in words; coordinate plane and tables of values | Variables and notation conventions; one- and two-step linear equations; substitution; rearranging formulae; like terms; four quadrants; linear rule t = a × n + d |
| Measurement | Metric prefixes and conversions to 2 dp; area of a right-angled triangle; volume of a rectangular prism; protractor to 360°; angle facts; 24-hour time; timetables | Base unit + prefix; perimeter, area and volume formulae and solving for unknowns; composite shapes |
| Geometry | Quadrilateral categories; rotational symmetry; tessellations; two-step transformations; map scales and compass | Triangle classification; exterior and interior angle sums, 180(n − 2)°; transformations on the coordinate plane; nets; angle equations; parallel lines and transversals; 8-point compass |
| Statistics | Time-series data and graphs; mean and range; choosing a display; trends; media graphs | Median and mode; stacked and clustered bars; outliers; skew and tails; misleading graphs |
| Probability | Sample space; P = favourable ÷ total; spinners; probabilities sum to 1 | Experiments (≥30 and ≥100 trials); Law of Large Numbers; relative frequency; tree diagrams; complements; fractions, decimals and percentages |

---

## 7. Licensing

**Tāhūrangi copyright notice** (archive snapshot 6 Jul 2026): https://newzealandcurriculum.tahurangi.education.govt.nz/copyright **[OFFICIAL-FINAL]**

- Material is Crown copyright, owned by the Ministry of Education on behalf of the Crown.
- "Unless indicated otherwise… licensed for re-use under a **Creative Commons Attribution-NonCommercial 4.0** Licence" (linked deed: Attribution-NonCommercial 4.0 International). You may copy, distribute and adapt it, attributed to the Ministry of Education, under the licence terms.
- **Excluded:**
  - logos, emblems and trade marks
  - website design elements
  - photography and imagery
  - third-party copyright material, "including whānau/hapū and iwi"

  For images, contact the supplier first.
- **This is the same CC BY-NC 4.0 notice the Year 9 doc recorded** (it read the live page on 25 Oct 2026). The wording in the July 2026 snapshot matches that summary.

**education.govt.nz copyright** (live, last updated 2 Dec 2024), which covers the Parent Portal pages:
- Crown copyright, licensed under "Creative Commons Attribution-Non Commercial 4.0".
- The text says "New Zealand licence", but the deed it links to is the 4.0 International one. This is a minor inconsistency in the page.
- **Same exclusions:** logos, emblems, trademarks, design elements, photography and imagery, and third-party material.

**For the app** (as in the Year 9 doc):
- Non-commercial use with attribution is fine. Example: "Contains content from The New Zealand Curriculum – Mathematics and Statistics Phase 2 (Years 4–6) and Phase 3 (Years 7–8), Ministry of Education, Tāhūrangi, licensed under CC BY-NC 4.0; adapted." Mark changes and link the licence.
- If the app is ever monetised, ask Copyright.Permissions@education.govt.nz.
- Do not copy SMART or PAT items, NZCER material, images, or te ao Māori cultural content (e.g. maramataka examples) without checking their rights. **[INFERRED]**
- I did not review the Tāhūrangi Terms of Use. This is not legal advice.

---

## 8. Supporting material and free resources

| Resource | Use | Status / notes |
|---|---|---|
| Parent Portal, "Mathematics and Statistics in Year 6" and "…in Year 7" (education.govt.nz, 25 Mar 2025) | Plain-language summaries, "ideas to help at home", word lists | **[OFFICIAL-DRAFT]**: they describe the earlier 2025 version (section 1, flag 2). Use for at-home ideas, not content. |
| "Maths at home – Year 6" and "– Year 7" PDFs (Oct 2024) | Parent activity ideas | Pre-date the 2026 sequence. Generic. |
| **NZC Maths practice** (nzc-maths-practice.nz), linked from the Parent Portal | Ministry pilot practice site for Years 3–8: number problems, money, fractions, decimals and percentages, ratios, rounding and estimation, squares and cubes, powers, roots, multiples and factors. Suggests a summary and next steps after each question. | **[OFFICIAL-FINAL description; site not read]**: Cloudflare blocked automated access. The Ministry page (17 Dec 2025) says it is "a pilot that will run until the end of December 2026", so it may not exist in 2027. It advises practising the year level the child has *just finished*. |
| Infosheet, Maths Years 0–10 (20 Oct 2025) | Summary of changes | [OFFICIAL-FINAL] |
| "What's New in Mathematics and Statistics 0–8" | Year-level change list (section 4) | [OFFICIAL-FINAL] |
| Information poster / Learning Area Narrative | Phase emphasis statements | [OFFICIAL-FINAL] |
| Example year, unit and weekly plans, Years 0–10 (Tāhūrangi) | Teacher planning exemplars | Not read. The only archive snapshot is May 2025, so the plans may predate the Oct 2025 revision. |
| Ordering Ministry-funded maths resources (Tāhūrangi) | Funded maths resources for schools | Not read for 2026. A search result says Oxford's "Mathematics and Statistics for Aotearoa New Zealand" (2nd ed.) is an approved resource, with ordering in Terms 2–3 2026 for Term 1 2027 delivery. **[SECONDARY]** |
| NZCER PAT Pāngarau resources (teacher guide, guide to assessing twice a year, scale-score progress guide March 2026, interim mapping to progress descriptors) | Understanding PAT results | [SECONDARY] |
| NZMaths, CensusAtSchool NZ | Practice tasks and real data | Listed in the Year 9 doc; not re-checked for Years 6–7. |

---

## 9. Biggest uncertainties and gaps

1. **Per-year PDFs not obtained.** The topic maps come from the HTML tables in the 24 Aug 2026 archive snapshots. Live Tāhūrangi pages could not be re-checked.
2. **The 2026 "What's New" list is a summary.** I did not diff the full 2025 Year 5 sequence against the 2026 one. The 2025-version Phase 2 page is archived (Apr 2025: https://newzealandcurriculum.tahurangi.education.govt.nz/nzc---mathematics-and-statistics-phase-2/5637239084.p) if a detailed bridge list is wanted.
3. **SMART details:** no 2027 windows, no maths item framework, no sample items. nzc-maths-practice.nz could not be read, and it is a pilot ending in Dec 2026.
4. **Curriculum Insights and Progress Study** method (which year levels and how students are sampled) not verified; Education Counts was blocked.
5. **No later Gazette amendments checked.** gazette.govt.nz blocks scripted access, so I read only the archived 2025-sl7165 notice.
6. **School variation.** Teachers may reorder topics. Ask the school for its Year 6 (2026) and Year 7 (2027) maths overviews.

**Recommended next steps**
1. In a normal browser, download "-Mathematics-and-Statistics-Yr-6-Teaching-Sequence-.pdf" and "-Mathematics-and-Statistics–Yr-7-Teaching-Sequence-.pdf" from File Downloads on the Phases 1–4 page. Check them against section 3 and import the verbatim statements, with attribution.
2. Ask the school which tool it uses (SMART or PAT) and when, and get the mid-year and end-of-year reports.
3. Re-check nzc-maths-practice.nz in a browser before linking to it in 2027.

**Suggested data model** [INFERRED]: as in the Year 9 doc, plus `phase` and `span`.
- Tag each node with `subject`, `strand`, `element`, `year`, `span` (e.g. "Y5–6", "Y7–8"), `kind` (knowledge or practice), `phase`, `status` (official-final / draft-aligned / school), `sourceUrl` and `sourceDate`.
- Include `vocab` nodes per year and strand.
- Add a `bridge` flag for the Year 5 items in section 4.

---

## 10. Sources

**Official: Ministry of Education / Tāhūrangi**
- NZC – Mathematics and Statistics Phase 2 (Years 4–6): https://newzealandcurriculum.tahurangi.education.govt.nz/new-zealand-curriculum-online/nzc---mathematics-and-statistics-phase-2-years-4-6/5637289332.p (archive 2026-08-24: http://web.archive.org/web/20260824134614/https://newzealandcurriculum.tahurangi.education.govt.nz/new-zealand-curriculum-online/nzc---mathematics-and-statistics-phase-2-years-4-6/5637289332.p)
- NZC – Mathematics and Statistics Phase 3 (Years 7–8): https://newzealandcurriculum.tahurangi.education.govt.nz/new-zealand-curriculum-online/nzc---mathematics-and-statistics-phase-3-years-7-8/5637289333.p (archive 2026-08-24: http://web.archive.org/web/20260824134614/https://newzealandcurriculum.tahurangi.education.govt.nz/new-zealand-curriculum-online/nzc---mathematics-and-statistics-phase-3-years-7-8/5637289333.p)
- NZC – Mathematics and Statistics Phases 1–4 (Years 0–10): https://newzealandcurriculum.tahurangi.education.govt.nz/new-zealand-curriculum-online/nzc---mathematics-and-statistics-phases-1-4-years-0-10/5637289330.p (archive 2026-04-02, URL with a `?domain=` suffix, found via the Wayback CDX index; File Downloads list as seen live on 2026-10-25 in the Year 9 research)
- NZ Gazette notice 2025-sl7165, Foundation Curriculum Policy Statements and National Curriculum Statements (11 Dec 2025): https://gazette.govt.nz/notice/id/2025-sl7165 (archive 2026-02-12: http://web.archive.org/web/20260212075837/https://gazette.govt.nz/notice/id/2025-sl7165)
- Maths infosheet (20 Oct 2025): https://files-au-prod.cms.commerce.dynamics.com/cms/api/qwxsnqcpfm/binary/MLetvO
- What's New in Mathematics and Statistics 0–8: https://files-au-prod.cms.commerce.dynamics.com/cms/api/qwxsnqcpfm/binary/MLeoj0
- Information poster, Maths Years 0–10: https://files-au-prod.cms.commerce.dynamics.com/cms/api/qwxsnqcpfm/binary/MLeGvG
- Implementation timeline PDF (4 Jun 2026): https://files-au-prod.cms.commerce.dynamics.com/cms/api/qwxsnqcpfm/binary/MLjAST
- Tāhūrangi copyright notice: https://newzealandcurriculum.tahurangi.education.govt.nz/copyright (archive 2026-07-06: http://web.archive.org/web/20260706080346/https://newzealandcurriculum.tahurangi.education.govt.nz/copyright)
- "Exciting step forward for new Assessment and Aromatawai Tool" (15 Jul 2025): https://tahurangi.education.govt.nz/new-aa-tool-update (archive 2026-01-14: http://web.archive.org/web/20260114075236/https://tahurangi.education.govt.nz/new-aa-tool-update)
- Earlier Phase 2 (2025 version) page, for diffing: https://newzealandcurriculum.tahurangi.education.govt.nz/nzc---mathematics-and-statistics-phase-2/5637239084.p (archived 2024–2025)
- Example plans: https://newzealandcurriculum.tahurangi.education.govt.nz/example-plans-for-revised-maths-and-stats-learning-area/5637253331.p ; funded resources: https://newzealandcurriculum.tahurangi.education.govt.nz/ordering-ministry-funded-maths-resources/5637240578.p (not read)

**Official: education.govt.nz (read live 26 Oct 2026)**
- Mathematics and Statistics in Year 6 (25 Mar 2025): https://www.education.govt.nz/parents-and-caregivers/schools-year-0-13/parent-portal/guide-for-the-new-zealand-curriculum-years-0-to-8/year-6-new-zealand-curriculum/maths-and-statistics-in-year-6
- Mathematics and Statistics in Year 7 (25 Mar 2025): https://www.education.govt.nz/parents-and-caregivers/schools-year-0-13/parent-portal/guide-for-the-new-zealand-curriculum-years-0-to-8/year-7-new-zealand-curriculum/maths-and-statistics-in-year-7
- Maths at home – Year 6 PDF: https://web-assets.education.govt.nz/s3fs-public/2024-11/Maths%20at%20Home%20%28Year%206%29Oct%2024.pdf ; Year 7: https://web-assets.education.govt.nz/s3fs-public/2024-11/Maths%20at%20Home%20%28Year%207%29Oct%2024.pdf
- Maths practice (17 Dec 2025): https://www.education.govt.nz/parents-and-caregivers/schools-year-0-13/parent-portal/maths-practice (links to https://nzc-maths-practice.nz/, not read)
- Guide to SMART (3 Feb 2026): https://www.education.govt.nz/parents-and-caregivers/schools-year-0-13/parent-portal/guide-smart-new-assessment-tool-your-child
- Guide to your child's reporting and progress (28 Jan 2026): https://www.education.govt.nz/parents-and-caregivers/schools-year-0-13/parent-portal/guide-your-childs-reporting-and-progress ; exemplar report: https://web-assets.education.govt.nz/s3fs-public/2026-02/NZC%20Exemplar%20School%20Report_LO_02.pdf
- education.govt.nz copyright: https://www.education.govt.nz/copyright

**Official: other government**
- DPMC, Government Target 7 factsheet, quarter ending June 2026: https://www.dpmc.govt.nz/sites/default/files/2026-09/gt-factsheet-target-7-jun26.pdf

**Secondary**
- NZCER, PAT Pāngarau | PAT Mathematics: https://www.nzcer.org.nz/node/62221
- NZCER, How PATs relate to the new curriculum (7 Mar 2025, updated May 2026): https://www.nzcer.org.nz/node/72398
- Search-result summary only (not opened): Oxford University Press NZ, Ministry-funded resource ordering: https://www.oup.com.au/newzealand
