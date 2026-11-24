# Decision study (v1.0-pilot)

A browser-based study instrument. It tests whether the look of an AI interface (a messaging-style chat or a software-style tool) changes how much people trust the same scripted AI advice, on emotional and on analytical decisions.

It never calls an AI model: every AI reply is pre-written in `config.js`. Participants take it remotely through a link. Their answers go to a private Google Sheet you own, through a small Google Apps Script (`apps-script/Code.gs`).

---

## Before sending the link (checklist)

1. **Set up the Google Sheet endpoint** (next section) and paste its URL into `config.js` → `dataCollection.endpoint`.
2. **Set your contact email** in `config.js` → `dataCollection.contact`. Participants see it on the first and last screen.
3. **Host the participant files** somewhere neutral (see *Hosting*), then make the GitHub repo private and turn off GitHub Pages.
4. **Test once** with `?new=1` on the hosted link. Check that a row appears in the Sheet and that the last screen says "Your answers have been saved". If it says they could not be sent, the deployment is probably not set to *Anyone*.
5. **Clean up after testing:** in Apps Script, run `resetParticipantCounter`. Delete the test rows from the Sheet: row 2 and below, keeping the header in row 1 (or delete the whole *sessions* tab; it is recreated on the next save). **Never reset the counter after the first real participant.**
6. **Write down the analysis plan** (primary outcome, exclusions) before the first participant.

Open the study with `?review=1`: a red box at the top lists what is still missing in `config.js` (endpoint, contact email, version). `make-site.sh` also refuses to build while the endpoint or contact email is missing. The other steps you check yourself.

---

## Collecting data remotely (Google Sheet, about 5 minutes)

1. In Google Drive, create a new Google Sheet, e.g. "Decision study data". Share it with your teammate.
   - Use an account that is allowed to publish Apps Script web apps to **Anyone**. Some university accounts block this. If the Anyone option is missing in step 3, use a personal Gmail account.
2. In the Sheet, open **Extensions → Apps Script**. Delete the sample code, paste the whole of `apps-script/Code.gs`, and click **Save**.
3. Click **Deploy → New deployment**. Click the gear icon and choose **Web app**, then set:
   - **Execute as:** Me
   - **Who has access:** Anyone

   Click **Deploy** and allow access. Google warns that the app isn't verified; it's your own script, so choose **Advanced → Go to … (unsafe)**.
4. Copy the **Web app URL**, which ends in `/exec`, into `config.js` → `dataCollection.endpoint`.
5. Check it works:
   - Opening the URL in a browser should show `{"ok":true,"service":"study data endpoint"}`.
   - Take the study once with `?new=1`. A row appears in the Sheet's **sessions** tab.

How it works:

- The study sends the whole session after consent, after every decision, after the end questions and on the last screen. It also sends one last copy if the page is closed.
- The script keeps **one row per session**. Every change to a session raises its revision number, and the script only replaces a row with a higher revision. Repeated sends, or an old copy from a forgotten second tab, can never overwrite newer answers.
- It never sends data back out: the URL can only save rows and hand out participant numbers.
- With one shared link, the script hands out participant numbers 1, 2, 3… when someone presses Start on the consent page, so people who only open the link don't use up numbers. This keeps Messaging/Tool and item orders balanced. Run `resetParticipantCounter` once after testing, so the first real participant gets number 1.
- If you later edit `Code.gs`, go to **Deploy → Manage deployments → Edit → Version: New version**. The URL stays the same.

If a participant's connection fails at the end, the last screen tells them to try again, or to download their answers and email them to you. Load that `.json` file in the dashboard together with the Sheet export: copies of the same session are merged, and the most complete one is kept. Save the file and delete the email, since the consent promises that no email addresses are collected.

---

## Hosting the study

The GitHub repo and Pages site are public: anyone can read the README, the debrief and the "AI always disagrees" rule. Host only the participant files, at a neutral address. The hosted `config.js` still contains the debrief and the design notes, and `?review=1` still works there, so never post the participant link next to anything that names the study's purpose.

1. In this folder, run:
   ```bash
   sh make-site.sh
   ```
   This makes a `site/` folder with only what participants need. The dashboard, README and Apps Script are left out.
2. Upload `site/`, for example by dragging it onto <https://app.netlify.com/drop>. Create a free account so the site doesn't expire, and give it a neutral name in the site settings. Cloudflare Pages (direct upload) works the same way.
3. Make the GitHub repo **private** and turn off **GitHub Pages**:
   - **Settings → Pages**: open the **…** menu next to "Your site is live at" and choose **Unpublish site**.
   - **Settings → General → Danger Zone → Change visibility → Private**.

To change the live study later, edit, run `make-site.sh` again, and update **the same site**:
- **Netlify:** open your site → **Deploys**, and drag the new `site/` folder onto the drop area at the bottom of that page. Dragging it onto app.netlify.com/drop again makes a second site at a new address.
- **Cloudflare Pages:** your project → **Create new deployment**.

Change `config.js` → `version` first, so rows from different versions can be told apart.

A browser study can't hide its own files completely: someone who opens the page source can read `config.js`. The neutral address and the missing README make it unlikely anyone finds the debrief by accident.

---

## Links

| Link | Use |
|---|---|
| `https://your-site/` | **The participant link.** One shared link; participant numbers come from the Sheet script. |
| `…/?pid=1001` | A personal link with a fixed participant number. While the shared link hands out numbers, give personal links numbers from **1001** up, so they never clash with the counter's 1, 2, 3… (odd/even and order balance still hold). Or set `dataCollection.assignPid` to `false` and use only personal links. |
| `…/?new=1` | **For testing:** starts a fresh session even if this browser already took part. Test sessions still go to the Sheet; delete them afterwards. |
| `…/?review=1` | **Reviewer mode:** switch interface, jump to any item and step, flip design options (with notes), see the data. Never sent to the Sheet. |

Don't put `?ui=` or design options in participant links. If you do, they're recorded in the `settings_changed` column, but they change the design for that person.

What participants experience:

- **Phones and narrow windows** see "Please use a computer" until the window is at least 900 px wide (`dataCollection.minWidth`).
- **Reloading or closing the tab** asks "Leave site?". If they come back within 12 hours, a "Welcome back" page continues the study at the same decision. That decision starts over, is flagged `item_restarted`, and the AI recommends the same option as before.
- **Two tabs at once:** if the same session moves on in another tab, the older tab stops and says to continue in the other one.
- **Each browser can take part once.** Within a day of finishing, opening the link again shows the debrief again (with the withdraw box). After that it shows "Already completed".
- **Withdrawing:** the last screen has a "Please do not use my answers" box and shows a **participation code** (the `session_id`). Ticking the box marks the session `withdrawn`, and the dashboard leaves it out. If someone emails a code later, find that `session_id` and drop it.

---

## Getting the data out

1. In the Google Sheet, open the **sessions** tab, then **File → Download → Comma-separated values (.csv)**.
2. Open `results.html` from your own copy of this folder (double-click it) and click **Load data files…**. Choose that CSV, plus any `.json` files participants emailed.
3. The dashboard shows the main comparisons, manipulation checks, item checks and a participant list with flags.
4. **Download data CSV** gives the analysis file: one row per participant per decision, for finished sessions only (withdrawn and unfinished sessions left out, as the consent promises). **Download codebook** explains every column.

The dashboard's **Open results dashboard** button in reviewer mode works only in your local copy; `results.html` is not uploaded.

---

## Files

| File | What's in it |
|---|---|
| `config.js` | **Everything you edit:** data collection settings, all items and AI replies, screen text, questionnaires, design-option defaults and notes. |
| `apps-script/Code.gs` | The Google Sheet endpoint (paste into Apps Script). |
| `make-site.sh` | Copies the participant files into `site/` for hosting. |
| `results.html`, `js/results.js` | Results dashboard (researchers only; not uploaded). |
| `index.html`, `styles.css` | Page shell and styling. |
| `js/app.js` | Study flow: screens, steps, resume, sending. |
| `js/frames.js` | The two interfaces (same AI text, same delay). |
| `js/data.js` | Assignment, order, storage, sending, CSV export. |
| `js/review.js` | Reviewer mode. |
| `js/util.js` | Small helpers. |

If something in `config.js` is broken, a red box at the top of the page lists the problem. If it says *config.js did not load*, open the browser console (Chrome: Cmd+Option+J) to see the line number.

---

## How one decision works

1. Read the scenario and the two options. The left panel is identical in both conditions.
2. **First answer** on a 0–10 slider ("Definitely A" … "Definitely B"). There's no handle until it's clicked.
3. **Get the recommendation:** "Ask" (Messaging) or "Run analysis" (Tool). Both wait the same 2.5 s.
4. **Reply:** the same words in both interfaces.
5. **Final answer** on the same slider. It starts at the first answer, with a marker there.
6. **Two questions:** trust in the AI's recommendation, and how well it understood the situation (1–7).

At the end come 13 ratings of the AI: trust, competence and warmth (3 items each), and 4 humanlikeness word pairs. Then one emotional-vs-analytical rating per decision, then the debrief.

---

## Design options (reviewer mode → Design options, each with a note on what it implies)

| Option | Default |
|---|---|
| Tool look | **App** (with made-up "Run details" statistics; see the note in reviewer mode) |
| Messaging contact / social cues | Generic "Assistant" / full |
| Which side the AI recommends | Opposite to the first answer |
| Lean as a number | Off |
| "Get an explanation" | Off |
| Second opinion | Off |
| Trust questions after each decision | On |
| Final slider starts | At the first answer |
| Item order | Balanced Latin square |
| Reply delay | 2500 ms |

---

## Assignment and order

- **Participant number** comes from the link (`?pid=N`), from the Sheet script (one shared link), or, if neither is available, is left blank and the assignment is random.
- **Interface:** odd numbers get Messaging, even numbers get Tool.
- **Order:** a balanced Latin square of the 8 decisions. Numbers 1–16 cover all 16 interface × order combinations, so 48 people give 3 per combination. The practice item is always first.
- **Gaps:** numbers handed out to people who never finish leave small gaps. Check the balance in the dashboard as you go.

---

## Data columns (key ones; the codebook lists all)

- **Who and which condition:** `participant_id`, `session_id`, `interface`, `decision_type`, `topic_pair`, `item_id`, `trial_number`.
- **Answers:**
  - `first_answer`, `final_answer` (0–10).
  - `ai_recommended`, `ai_position` (8 for B, 2 for A).
  - `moved_toward_ai`.
  - `weight_of_advice` (limited to 0–1) and `weight_of_advice_uncapped`.
  - `switched_to_ai`.
  - `final_slider_touched` (0 = saved the preset answer without touching it).
- **Ratings:** `item_trust`, `item_ai_understood`, `scen_type`, and the end-of-study items with `*_mean` per scale.
- **Time, in seconds:**
  - `sec_first_answer`.
  - `sec_to_ask`: compare only within an interface.
  - `sec_final_answer`, `sec_ratings`, `sec_total`.
- **Checks:** `session_completed`, `withdrawn`, `is_reviewer_session`, `item_jumped_in_review`, `item_restarted`, `settings_changed`, `assignment_method`, `pid_prior_sessions`, `prior_sessions_in_browser`, `screen_width`, `study_version`, `started_at`, `finished_at`.

**Always drop:** `withdrawn = 1`, `is_reviewer_session = 1`, `session_completed = 0`, `item_jumped_in_review = 1`, `is_practice = 1`.

**Decide in the analysis plan** what to do with:
- `item_restarted > 0`;
- a non-blank `settings_changed`;
- `pid_prior_sessions > 0` or `prior_sessions_in_browser > 0`;
- very fast sessions (the dashboard flags under 6 minutes);
- first answers of exactly 5.

No names, emails or IP addresses are collected, and there are no free-text answers. The exception is a participant who emails their answers file or participation code: save what you need, then delete the email.

---

## Assumptions in this version

1. The AI's words, delay, font size and the left panel are identical in both conditions. Only the right-hand interface differs.
2. The AI text avoids "I" and "we", so the same words read naturally in a chat bubble and in tool output.
3. The Tool's query box shows the chat message word for word, so the inputs are identical.
4. Each decision starts fresh: a new conversation or a new analysis.
5. Replies appear all at once after the delay. End questions come in a fixed order.
6. Every question is required. There's no back button and no free text.
7. Built for laptop or desktop screens, in English.
8. Sessions are saved in the participant's browser and sent to the Sheet. Reviewer sessions are never sent.
