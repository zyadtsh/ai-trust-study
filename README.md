# Decision study: mock-up (v0.1)

This is a clickable mock-up of the study instrument. It asks whether the look of an AI interface (a messaging-style chat or a spreadsheet-style tool) changes how much people trust the same scripted AI output, on emotional and on analytical decisions.

It has no backend and no dependencies, and it never calls an AI model. Every AI reply is pre-written in `config.js`.

---

## Run it

From a terminal in this folder:

```bash
open index.html
```

That opens the study in your default browser; nothing else is needed. To add options such as `?review=1` or `?pid=1`, type them at the end of the address in the browser's address bar (the terminal can't pass them).

If you prefer to use links, serve the folder instead:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000/?review=1> or <http://localhost:8000/?pid=1>.

**Pick one way and stick to it on the lab laptop.** Saved data belongs to one browser *and* one address: sessions saved under `file://…` don't show up under `localhost:8000`, and the reverse.

### Useful links

Add these after `index.html` (or after `http://localhost:8000/`):

| Link | What it does |
|---|---|
| `?review=1` | **Reviewer mode.** Switch interface, jump to any item and step, flip every design option (with notes), and see or export data. |
| `?pid=7` | A participant run. The pid picks the interface and item order from the balanced schedule (below). |
| `?pid=7&ui=tool` | Force the interface (`chat`/`messaging` or `tool`/`spreadsheet`). Works with or without a pid. |
| `?followUp=on&secondOpinion=agree` | Set any design option by name (see `config.js` → `designOptions`). |
| no parameters | Random interface, and a randomly chosen row of the item-order scheme. |

In reviewer mode, the yellow label in the top bar shows where you are, for example `E2 · step 3 · reply + final answer · Tool`. Quote it when you comment.

### Running a lab session

1. Open the study with the participant's pid: `…/index.html?pid=1`, then 2, 3 and so on. Keep your own sheet of which pid ran when.
2. If that pid was already used in this browser, a yellow researcher note appears on the first screen. Change the address to the next pid before handing over.
3. The participant goes through consent, instructions, 1 practice item, 6 decisions, the end questions and the debrief.
4. On the debrief screen, press **Shift + D** to show the researcher tools. They are hidden from participants. The tools are:
   - **Start next participant**, which opens the next pid.
   - Download this session as CSV.
   - Download all participant sessions in this browser as CSV.

   Reviewer mode (`?review=1` → Data) offers the same exports.

Data stays in this browser until you download it, and clearing browser data deletes it. Download at the end of each day at least. If saving ever fails, a red banner tells you.

---

## Files

| File | What's in it |
|---|---|
| `config.js` | **Everything you will edit.** All items, AI replies, screen text, questionnaire items, and the design-option defaults with their notes. |
| `index.html` | Page shell. |
| `styles.css` | All styling. The neutral study panel, the Messaging frame and the Tool frame each have their own section. |
| `js/app.js` | Study flow: screens, the steps inside each item, timing. |
| `js/frames.js` | The two interfaces. They receive the same AI text and the same delay. |
| `js/data.js` | Assignment, item order, browser storage, CSV export. |
| `js/review.js` | Reviewer mode. |
| `js/util.js` | Small helpers. |

To change content, edit `config.js` and reload. A red box at the top of the page lists missing fields and duplicate ids. If it says *config.js did not load*, there's a typo (usually a missing comma or quote). Open the browser console (Chrome: Cmd+Option+J; Safari: Cmd+Option+C) to see the line number.

---

## How one item works

The same steps run in both interfaces. Only the right-hand panel changes.

1. **Read.** The scenario and the two options appear in the left panel, which looks identical in both conditions.
2. **First answer.** A 0–100 slider from "Definitely A" to "Definitely B". It shows no handle until it is clicked, so 50 is never a default answer. Participants see labels, not numbers.
3. **Get the recommendation.** The left panel says "press the highlighted button on the right" in both conditions.
   - Messaging: a pre-written message is in the compose box, and "Ask" sends it, quoting both options.
   - Tool: the options sit in cells, and "Run" executes `=RECOMMEND(...)`.
4. **Reply.** Both interfaces wait the same delay (default 2.5 s).
   - Messaging shows typing dots, then a bubble.
   - Tool shows "Calculating…" with a progress bar, then a numbered output.

   The words are identical, and so are the font size, the line height and the scroll rule: a new reply is shown from its first line.
5. **Final answer** on the same slider, with a marker at the first answer.
6. **Optional.**
   - "Get a second opinion" (always available) shows a second scripted AI reply.
   - "Get an explanation" (only if switched on) shows a scripted explanation of the main recommendation.

   Both clicks are logged.
7. **Item questions** (if on): trust in the AI's main recommendation, and how well the AI understood the situation.

---

## Design options (switchable live in reviewer mode, each with a note on what it implies)

| Option | Default | Choices |
|---|---|---|
| Interface (the manipulation) | by pid schedule / random | Messaging / Tool |
| Tool look | **Full spreadsheet** (title bar, menus, toolbar, formula bar, grid, tabs, status bar) | light / medium / full |
| Tool query wording | **Terse** (`Select reply (A/B): …`) | terse / same as chat message |
| Messaging contact | **Generic "Assistant"** | generic / named persona "Robin" |
| Messaging social cues | **Full** (avatars, timestamps, day divider) | full / minimal |
| Which side the AI recommends | **Opposite to first answer** | opposite / fixed per item |
| Lean as a number | **Off** | off / on |
| Second scripted turn ("Get an explanation") | **Off** | off / on |
| What the second opinion says | **Neutral** | neutral / agrees / disagrees |
| Who gives the second opinion | **A second AI** ("Assistant 2" / "model 2") | second AI / same AI again |
| Where the optional buttons sit | **Shared left panel** | panel / inside each interface |
| Trust questions after each item | **On** | on / off |
| Final slider starts | **At the first answer** | first / blank |
| Item order | **Balanced Latin square** | latin / blocked / random |
| Reply delay | **2500 ms** | 0–15000 ms |

When the Design options drawer is open, the study shifts left so you can watch each switch take effect. The notes live in `config.js`, so you can edit them too.

---

## Assignment and order

- **Interface:** odd pids get Messaging and even pids get Tool. With pids 1–48 that is 24 and 24.
- **Order:** the 6 main items go into a balanced Latin square (Williams design). Pids cycle through its 6 orders, so pids 1–12 cover all 12 interface × order combinations, and 48 people give 4 per combination. Each item appears in each position 8 times, and each item directly follows every other item 8 times. Task types are mixed, never three of one type in a row. The practice item always comes first. If you change to an odd number of items, the square doubles to stay balanced.
- **No pid:** the interface is random and the order is a random row, recorded as `assignment_method = random`.
- `?ui=` overrides the interface, recorded as `...+ui_param`.

---

## Data dictionary (CSV)

There is one row per participant per item reached; the practice item is included, flagged `is_practice=1`. Session-level answers repeat on every row of that session. All `ms_*` and `t_*` values are milliseconds.

**Session and settings**

- `session_id`: random code, not linked to anyone.
- `study_version`.
- `pid`.
- `pid_prior_sessions`: how many earlier sessions in this browser used the same pid. Anything above 0 is a possible repeat or mistake.
- `assignment_method`.
- `is_review`: 1 if the session ran in reviewer mode.
- `session_completed`: 1 if the participant reached the debrief.
- `started_at`, `finished_at`: ISO times.
- `order_row`, `item_order_seen`.
- `ui`, `tool_look`, `tool_query`, `chat_identity`, `chat_cues`, `advice_direction`, `lean_as_number`, `follow_up`, `second_opinion_mode`, `second_opinion_source`, `optional_buttons`, `per_item_ratings`, `final_slider_start`, `item_order`, `delay_ms`: the settings in force for this item.

**Item and answers**

- `item_id`, `item_type`, `is_practice`, `position`: position 1–6 in the main sequence; 0 for practice.
- `item_done`.
- `item_jumped_in_review`: 1 if a reviewer jumped into this item (earlier steps were faked).
- `default_side`.
- `first_answer`, `final_answer`: 0 = definitely A, 100 = definitely B.
- `rec_side` (A or B), `rec_position`: where the AI's recommendation sits on the slider (B → strength, A → 100 − strength; default 80 / 20).
- `change`: final − first.
- `change_toward_rec`: positive means the answer moved toward the AI.
- `woa`: weight of advice, (final − first) / (rec_position − first). 0 means the answer ignored the advice and 1 means it fully adopted it.
- `first_slider_moves`, `final_slider_moves`.
- `followup_clicked`, `second_opinion_clicked`: 0 or 1.
- `second_opinion_variant`: which second reply was shown (A, B or neutral).

**Time on each step**

- `ms_step1_read_and_first_answer`: from the scenario appearing to saving the first answer.
- `ms_step2_first_answer_to_ask`: from saving the first answer to pressing Ask or Run. Ask and Run sit in different places, so compare this one only *within* a condition.
- `ms_step3_wait`: the reply delay as it actually ran.
- `ms_step4_reply_to_final_answer`.
- `ms_step5_item_ratings`.
- `ms_item_total`.
- `ms_to_first_touch`: a reading-time proxy.
- `ms_reply_to_final_touch`, `ms_reply_to_followup_click`, `ms_reply_to_second_opinion_click`.
- `t_*`: the raw event times, in ms since the scenario appeared.

**Questionnaires**

- `item_trust`, `item_ai_understood`: per-item questions, 1–7.
- `scen_emotional`, `scen_analytical`: end-of-study rating of this row's scenario, 1–7; blank for practice.
- `comp_*` (competence), `warm_*` (warmth), `tw_*` (trustworthiness: trustworthy, honest, has my interests in mind), `trust_*` (trust in the recommendations), `aiund_*` (AI understood the situations), `expl_*` (I understood its reasoning), `rel_*` (would rely on it), `human_*` (humanlikeness word pairs): all 1–7.
- `<block>_mean`: the mean of each block.

No names, emails, IP addresses or free-text answers are collected.

---

## Placeholders (all must be replaced before the real study)

- **All 7 items** (practice P1, emotional E1–E3, analytical A1–A3): scenarios, options, attribute numbers, terse tool queries, and every AI text (`replies`, `followUp`, `secondOpinion`). Each is marked `placeholder: true`, and reviewer mode shows a "placeholder content" tag.
- **Intro / consent, instructions, debrief.** The debrief currently discloses the opposite-advice rule; change it if you switch that option.
- **All questionnaire items:** the per-item questions, the scenario ratings and every end-of-study scale. They are reasonable stand-ins, not validated scales.
- **Interface chrome names:** "Assistant", "Assistant 2", "Robin", "Alex", "Decision workbook", `RECOMMEND`, `EXPLAIN`.
- **Study title** ("Decision study").
- **Recommendation strength** of 80 for every item.

---

## Assumptions made in this version

**Interfaces**

1. The Tool version is as un-humanlike as possible (your answer 1). It has no name, no avatar, no conversation, no first-person query (by default), and no "assistant" wording.
2. Only the right-hand panel differs between conditions. The scenario, options, sliders, hint text and buttons on the left are identical.
3. Both interfaces get the same inputs. The chat message quotes what the Tool's cells hold. Option short names (e.g. "Maple Ave studio") appear only for analytical items, and then in the left panel and both interfaces.
4. Each item starts fresh, with a new conversation or a new sheet.
5. The AI text avoids first person ("I", "we") so that the identical words read naturally in a chat bubble and in a tool output. Second person ("you") is used.
6. The study's own text calls it "the AI" everywhere, in both conditions.

**Advice and the slider**

7. The same 0–100 slider is used for both task types: "Definitely A" to "Definitely B", with "No preference" in the middle. Answers are recorded as whole numbers.
8. Each item has two scripted main replies, one per side, plus one explanation per side and three second opinions (for A, for B, neutral).
9. The recommendation's slider position is only stored in the data. It is not shown, unless "lean as a number" is on.
10. Each optional button can be used once per item. The final answer can't be saved while a reply is still loading.

**Fixed choices (not toggleable yet; say if you want any of these switchable)**

11. Replies appear all at once after the delay, never word by word.
12. End questions are in a fixed order on a 7-point scale. The AI ratings come as one list without construct headings, then the word pairs.
13. One practice item, flagged in the data, followed by a "practice done" screen.
14. Every question is required. There is no back button and no free-text box.
15. Built for laptop or desktop screens in English. It works on narrower screens but is not designed for phones.
16. Data lives in the browser's localStorage and is exported as CSV with a UTF-8 BOM so Excel opens it cleanly. Reviewer sessions are stored only once they reach an item, are flagged, and are excluded from the "all participants" export.
17. Reloading mid-session starts a new session. The partial one is kept (`session_completed=0`), and the new one shows the pid-reuse note.

---

## Before the real study (not needed for this mock-up)

- Final items and replies, ideally pretested so first answers aren't all on one side.
- Validated scales, and your ethics-approved consent and debrief wording. Make sure the debrief matches the advice rule you lock in.
- Where it runs. In-lab on one laptop works as is. Remote participants on their own devices would need a data endpoint, for example a form service, JATOS, Pavlovia, or a small server, instead of a CSV download.
- Lock the design options you choose in `config.js`, and re-check the `woa` definition against your analysis plan.
