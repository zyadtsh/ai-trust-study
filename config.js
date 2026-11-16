/* =========================================================================
   STUDY CONFIG
   All study text and settings live in this one file. You can edit it
   without touching any code. Save, then reload the page.

   Anything marked [PLACEHOLDER] must be replaced before the real study:
   every item, every AI reply, the intro/consent and closing text, and
   every questionnaire item.

   Text fields are plain text; a blank line starts a new paragraph.
   Fields called "html" accept simple HTML.
   ========================================================================= */
window.STUDY_CONFIG = {
  studyTitle: "Decision study",   // [PLACEHOLDER]
  version: "0.1-mockup",

  /* -----------------------------------------------------------------------
     INTERFACE (the manipulation)
     Assigned per participant (see README: ?pid= schedule, random, or ?ui=).
     These notes appear in reviewer mode.
     ----------------------------------------------------------------------- */
  interfaceInfo: {
    label: "Interface (the manipulation)",
    what: "Each participant gets one. ?pid=N assigns from the balanced schedule (odd = Messaging, even = Tool); no pid = random; ?ui=chat or ?ui=tool forces it.",
    choices: {
      chat: { label: "Messaging", note: "Humanlike frame: a conversation with a named contact, an avatar, message bubbles, timestamps and a typing indicator. The participant sends a pre-written message with “Ask”." },
      tool: { label: "Tool", note: "Tool-like frame: no name, no avatar, no conversation. The inputs sit in cells, “Run” calls a function, and the identical text appears as a numbered output." }
    }
  },

  /* -----------------------------------------------------------------------
     DESIGN OPTIONS
     "default" is what participants get. In reviewer mode (?review=1) you can
     flip each one live from the "Design options" panel, which shows these
     notes. Any option can also be set in the URL, e.g.
       index.html?pid=7&followUp=on&secondOpinion=agree
     ----------------------------------------------------------------------- */
  designOptions: {
    toolLook: {
      label: "Tool version: how spreadsheet-like",
      what: "Only affects the Tool interface.",
      "default": "full",
      choices: {
        light:  { label: "Light",  note: "A form with inputs, a Run button and an output box. Reads as generic software rather than a spreadsheet. Weakest tool cue: the two conditions would differ mostly in layout and turn-taking." },
        medium: { label: "Medium", note: "A grid with column letters and row numbers, a formula bar and an output panel. Clearly a spreadsheet-style tool while staying uncluttered." },
        full:   { label: "Full",   note: "Adds a title bar, menus, a toolbar, sheet tabs and a status bar. The strongest, least humanlike tool cue (your pick). Trade-off: more visual clutter than the chat, so “more on screen” becomes part of the difference, and inert menus may distract a few people." }
      }
    },

    toolQuery: {
      label: "Tool version: wording of the query",
      what: "What the Tool shows in its Query cell. Messaging always sends the item's askText as a message.",
      "default": "terse",
      choices: {
        terse: { label: "Terse (tool-style)", note: "Uses the item's toolQuery, e.g. “Pick reply (A/B): friend cancelled plans, 3rd time this month”. Keeps the Tool free of first-person, conversational wording (your answer 1). The inputs then differ slightly in wording between frames; the AI's reply words stay identical." },
        same:  { label: "Same as chat message", note: "Shows the exact chat message, e.g. “How should I reply to Jordan cancelling again?”. Inputs are word-for-word identical across frames, but the Tool then contains a conversational, first-person question, which is a humanlike cue." }
      }
    },

    chatIdentity: {
      label: "Messaging version: who the contact is",
      what: "Only affects the Messaging interface.",
      "default": "generic",
      choices: {
        generic: { label: "Generic “Assistant”", note: "Labelled “Assistant” with a plain grey initial and an “AI assistant” status line. The humanlike cue comes from the messaging layout and turn-taking, not from a personal identity." },
        persona: { label: "Named persona", note: "Named “Robin”, with a coloured avatar and an “online” status. A stronger humanlike manipulation, but you are now also manipulating identity cues, so a difference could come from the name and avatar rather than the layout." }
      }
    },

    chatCues: {
      label: "Messaging version: extra social cues",
      what: "Avatars next to messages, per-message timestamps and the “Today” divider. The typing indicator always stays (it is part of your design).",
      "default": "full",
      choices: {
        full:    { label: "Full", note: "Looks like a real messaging app: avatars, timestamps, day divider. Strongest humanlike frame; the extra cues are part of what you are manipulating." },
        minimal: { label: "Minimal", note: "Bubbles, the contact name and the typing indicator only. Isolates the conversational layout and turn-taking as the manipulation, so a difference is easier to attribute, but the chat looks less like a real app." }
      }
    },

    adviceDirection: {
      label: "Which side the AI recommends",
      what: "Decides which of the item's two scripted replies is shown.",
      "default": "opposite",
      choices: {
        opposite: { label: "Opposite to first answer", note: "Recommends the side the participant did not lean toward (exactly 50 → the item's default side). Every trial leaves room to move toward the advice, so weight of advice is measurable on every trial. People may notice the AI always disagrees, which can lower trust in both conditions." },
        fixed:    { label: "Fixed per item", note: "Each item always recommends its default side. More natural, but people who already agreed have nowhere to move, so those trials say little about trust, and you lose usable trials unevenly across items." }
      }
    },

    leanAsNumber: {
      label: "Say the lean as a number",
      what: "Adds one sentence with the recommendation's position on the 0–100 slider.",
      "default": "off",
      choices: {
        off: { label: "Off (words only)", note: "The lean is only given in words. Reads naturally in both frames. Weight of advice is computed from the configured position (20 or 80), which participants never see, so it is approximate." },
        on:  { label: "On", note: "Appends e.g. “On a 0–100 scale from Reply A to Reply B, this comes out at about 80.” Makes weight of advice exact and comparable with classic advice-taking studies, but numbers read tool-like (which may shrink the difference between frames) and act as an anchor." }
      }
    },

    followUp: {
      label: "Second scripted turn (“Get an explanation”)",
      what: "An optional button that shows one scripted explanation per item.",
      "default": "off",
      choices: {
        off: { label: "Off", note: "One reply per item. Everyone reads the same amount of AI text." },
        on:  { label: "On", note: "A “Get an explanation” button appears with the reply and shows a scripted explanation (typing dots / Calculating…, same delay). Adds a second behavioural measure, but people who click read more AI text before their final answer, so exposure differs between people." }
      }
    },

    secondOpinion: {
      label: "What the second opinion says",
      what: "“Get a second opinion” always shows a second scripted AI reply; this picks which one.",
      "default": "neutral",
      choices: {
        neutral:  { label: "Neutral", note: "A second AI reply that lays out both options without picking one. The click itself is the measure (wanting to check); the content pushes neither way, though it may pull final answers toward the middle." },
        agree:    { label: "Agrees", note: "Reaches the same recommendation with different reasoning, like regenerating an answer. People who click get a double dose of the same advice, which inflates their shift toward it." },
        disagree: { label: "Disagrees", note: "Recommends the other side. Creates real conflict between the two AI answers; final answers of people who click become hard to read as trust in the first reply." }
      }
    },

    secondOpinionSource: {
      label: "Who gives the second opinion",
      what: "How each frame presents the source of the second AI reply.",
      "default": "separate",
      choices: {
        separate: { label: "A second AI", note: "Messaging: a second contact (“Assistant 2”) answers in the same thread. Tool: output labelled “model 2”. Matches the everyday meaning of a second opinion (from someone else) and avoids the first AI appearing to change its mind." },
        same:     { label: "The same AI again", note: "Messaging: the same contact answers again. Tool: output labelled “run 2”. Like regenerating an answer. With “Neutral” or “Disagrees” content, the same contact appears to contradict itself, which reads more strongly in a conversation than in a second run of a function." }
      }
    },

    optionalButtons: {
      label: "Where the optional buttons sit",
      what: "“Get a second opinion” (and “Get an explanation” if on).",
      "default": "panel",
      choices: {
        panel: { label: "Shared left panel", note: "Same place and look in both conditions, so click rates are directly comparable. Slightly less natural: the reply they trigger appears on the right." },
        frame: { label: "Inside each interface", note: "Messaging: as quick-reply chips above the message box. Tool: as buttons on the output bar. More natural use of each interface, but the button's position and look now differ between conditions, which can change how often people click." }
      }
    },

    perItemRatings: {
      label: "Trust questions after each item",
      what: "Two 1–7 questions after each final answer (trust in this recommendation; how well the AI understood the situation).",
      "default": "on",
      choices: {
        on:  { label: "On", note: "Gives self-reported trust and understanding per item, so you can compare emotional vs. analytical items directly. Adds about 10 seconds per item and makes trust salient, which could change later behaviour." },
        off: { label: "Off", note: "Trust is only asked once at the end. Less reactive, but the end questions are about the AI overall, so you cannot split self-reported trust by task type." }
      }
    },

    finalSliderStart: {
      label: "Where the final-answer slider starts",
      what: "The first-answer slider always starts empty (no handle until clicked).",
      "default": "first",
      choices: {
        first: { label: "At the first answer", note: "The final slider starts where the first answer was, so keeping the same answer is one click. Standard in advice-taking studies; may slightly understate change because the starting point anchors." },
        blank: { label: "Empty", note: "The final slider starts empty and must be placed again (the first answer stays visible as a small marker). Removes the default but adds noise: people cannot hit exactly the same spot, so small “changes” appear even when they did not change their mind." }
      }
    },

    itemOrder: {
      label: "Item order",
      what: "How the 6 main items are ordered (the practice item is always first). With ?pid=, orders cycle so each is used equally often.",
      "default": "latin",
      choices: {
        latin:   { label: "Balanced Latin square", note: "6 orders; each item appears in each position equally often and follows every other item equally often. Task types are mixed (never three of one type in a row). With ?pid=: 6 orders × 2 interfaces = 12 cells, so 48 people gives 4 per cell." },
        blocked: { label: "Blocked by task type", note: "All of one task type, then the other; which type comes first alternates. Cleaner task contexts, but task type is then tied to time in session (fatigue, growing familiarity with the AI)." },
        random:  { label: "Random", note: "A fresh shuffle per person (fixed per pid). Simplest, but with 48 people some positions will be unbalanced by chance." }
      }
    },

    delayMs: {
      label: "Reply delay (milliseconds)",
      what: "Same in both interfaces: typing dots in Messaging, “Calculating…” in Tool. Applies to every AI reply.",
      "default": 2500,
      type: "number", min: 0, max: 15000, step: 250,
      note: "Longer delays make the typing indicator or progress bar more noticeable; very short ones can feel instant or fake."
    }
  },

  /* -----------------------------------------------------------------------
     SCREEN TEXT
     ----------------------------------------------------------------------- */
  text: {   // [PLACEHOLDER] all participant-facing wording below
    intro: {
      title: "Welcome",
      html:
        '<p class="ph-note">[PLACEHOLDER: replace with your approved information sheet and consent text.]</p>' +
        '<p>In this study you will make a few short, everyday decisions. For each one you give your own answer, see a recommendation from an AI, and then give your final answer. At the end there are a few short questions. It takes about 15 minutes.</p>' +
        '<p>We do not collect your name, email address or any other personal information. You can stop at any time.</p>',
      consentLabel: "I have read the information above and agree to take part.",
      button: "Start"
    },
    instructions: {
      title: "How it works",
      html:
        '<p class="ph-note">[PLACEHOLDER: instructions wording.]</p>' +
        '<ol class="steps">' +
        '<li>Read a short situation and the two choices.</li>' +
        '<li>Give your first answer on the slider.</li>' +
        '<li>Get the AI’s recommendation.</li>' +
        '<li>Give your final answer on the same slider. You can keep your first answer or change it.</li>' +
        '<li>If you like, you can get a second opinion before your final answer.</li>' +
        '</ol>' +
        '<p>There are no right or wrong answers. We’ll start with one practice item.</p>',
      button: "Start the practice item"
    },
    interlude: {
      title: "Practice done",
      html: "<p>That was the practice item. The real decisions start now. There are {total} of them.</p>",
      button: "Continue"
    },
    panel: {
      practiceLabel: "Practice item",
      progress: "Decision {n} of {total}",
      firstPrompt: "Your first answer: click or drag on the line.",
      firstDone: "First answer saved.",
      submitFirst: "Save first answer",
      askHint: "Now get the AI’s recommendation: press the highlighted button on the right.",
      waitingHint: "Waiting for the AI…",
      finalPrompt: "Your final answer",
      finalSub: "You can keep your first answer or change it.",
      optionalHeading: "Optional",
      followUpButton: "Get an explanation",
      secondOpinionButton: "Get a second opinion",
      submitFinal: "Save final answer",
      pendingNote: "Wait for the reply before saving.",
      ratingsHeading: "Two quick questions",
      next: "Next",
      missing: "Please answer every question."
    },
    endMeasures: {
      title: "About the AI",
      html: '<p>Please rate the AI you used in this study.</p><p class="ph-note">[PLACEHOLDER: swap in the validated scales you choose.]</p>',
      button: "Continue"
    },
    scenarioRatings: {
      title: "About the decisions",
      html: '<p>Think back to each decision you made.</p><p class="ph-note">[PLACEHOLDER: scenario-rating questions.]</p>',
      button: "Continue"
    },
    closing: {
      title: "Thank you",
      html:
        '<p class="ph-note">[PLACEHOLDER: replace with your approved debrief.]</p>' +
        '<p>Thank you for taking part. The AI’s replies in this study were written in advance by the researchers; no AI generated them live. ' +
        'Which option the AI recommended was set by a fixed rule: it recommended the option you had <em>not</em> leaned toward in your first answer (or a preset option if you had no preference). ' +
        'We are studying whether the way an AI is presented changes how people use its advice.</p>' +
        '<p class="ph-note">[If you switch “Which side the AI recommends” to “Fixed per item”, change the sentence above.]</p>' +
        '<p>Your answers have been saved. Please let the researcher know you have finished.</p>',
      researcherHeading: "For the researcher"
    }
  },

  /* Slider labels. {A} and {B} become each item's option labels. */
  slider: {
    left: "Definitely {A}",
    middle: "No preference",
    right: "Definitely {B}",
    firstMarker: "your first answer"
  },

  /* Used only when "Say the lean as a number" is on. */
  leanNumberTemplate: "On a 0–100 scale from {A} to {B}, this comes out at about {pos}.",

  /* Interface chrome [PLACEHOLDER names]. The AI's words come from the items, never from here. */
  interfaceText: {
    chat: {
      name: "Assistant",
      status: "AI assistant",
      personaName: "Robin",
      personaStatus: "online",
      secondName: "Assistant 2",          // second-opinion contact when "A second AI" is chosen
      secondPersonaName: "Alex",          // ...and when the named persona is on
      today: "Today",
      sendButton: "Ask",
      composerPlaceholder: "Message",
      lockedHint: "Save your first answer to send this message.",
      followUpPrompt: "Why {option}?",    // {option} = the option the main reply recommended
      secondOpinionPrompt: "Can I get a second opinion?",
      secondOpinionCaption: "Second opinion"
    },
    tool: {
      appTitle: "Decision workbook",
      sheetName: "Sheet1",
      menus: ["File", "Edit", "View", "Insert", "Format", "Data", "Help"],
      runButton: "Run",
      running: "Calculating…",
      ready: "Ready",
      fn: "RECOMMEND",
      explainFn: "EXPLAIN",
      secondSameNote: "run 2",           // second opinion, "The same AI again"
      secondSeparateNote: "model 2",     // second opinion, "A second AI"
      outputTitle: "Output",
      outputEmpty: "No output yet.",
      lockedHint: "Save your first answer to enable Run.",
      secondOpinionCaption: "Second opinion",
      fieldHeader: "Field",
      resultHeader: "Result",
      nameRow: "Name",
      textRowEmotional: "Message",
      textRowOther: "Description",
      queryRow: "Query",
      lightTitle: "Recommendation",
      inputsLabel: "Inputs",
      queryLabel: "Query"
    }
  },

  /* -----------------------------------------------------------------------
     QUESTIONNAIRES   [PLACEHOLDER items: swap in validated scales]
     ----------------------------------------------------------------------- */
  perItemRatings: {
    points: 7,
    questions: [
      { id: "item_trust", text: "How much do you trust the AI’s main recommendation on this decision?", low: "Not at all", high: "Completely" },
      { id: "item_ai_understood", text: "How well did the AI understand this situation?", low: "Not at all", high: "Very well" }
    ]
  },

  /* End-of-study ratings of the AI. Block titles are for you (CSV column
     names and means); participants see one list without headings. */
  endMeasures: {
    points: 7,
    blocks: [
      { id: "competence", kind: "likert", low: "Strongly disagree", high: "Strongly agree", items: [
        { id: "comp_1", text: "The AI was competent." },
        { id: "comp_2", text: "The AI was capable." },
        { id: "comp_3", text: "The AI knew what it was talking about." }
      ] },
      { id: "warmth", kind: "likert", low: "Strongly disagree", high: "Strongly agree", items: [
        { id: "warm_1", text: "The AI seemed warm." },
        { id: "warm_2", text: "The AI seemed friendly." },
        { id: "warm_3", text: "The AI seemed good-natured." }
      ] },
      { id: "trustworthiness", kind: "likert", low: "Strongly disagree", high: "Strongly agree", items: [
        { id: "tw_1", text: "The AI seemed trustworthy." },
        { id: "tw_2", text: "The AI seemed honest." },
        { id: "tw_3", text: "The AI seemed to have my interests in mind." }
      ] },
      { id: "trust", kind: "likert", low: "Strongly disagree", high: "Strongly agree", items: [
        { id: "trust_1", text: "I trusted the AI’s recommendations." },
        { id: "trust_2", text: "The AI’s recommendations were reliable." },
        { id: "trust_3", text: "I could depend on the AI’s recommendations." }
      ] },
      { id: "ai_understanding", kind: "likert", low: "Strongly disagree", high: "Strongly agree", items: [
        { id: "aiund_1", text: "The AI understood the situations it was asked about." },
        { id: "aiund_2", text: "The AI took the details of each situation into account." }
      ] },
      { id: "explainability", kind: "likert", low: "Strongly disagree", high: "Strongly agree", items: [
        { id: "expl_1", text: "I understood how the AI reached its recommendations." },
        { id: "expl_2", text: "The AI’s reasoning was clear." }
      ] },
      { id: "reliance", kind: "likert", low: "Strongly disagree", high: "Strongly agree", items: [
        { id: "rel_1", text: "I would use this AI for decisions like these." },
        { id: "rel_2", text: "I would follow this AI’s advice in the future." }
      ] },
      { id: "humanlike", kind: "pairs", prompt: "Please rate your impression of the AI on these scales.", items: [
        { id: "human_1", left: "Machinelike", right: "Humanlike" },
        { id: "human_2", left: "Artificial", right: "Lifelike" },
        { id: "human_3", left: "Fake", right: "Natural" },
        { id: "human_4", left: "Like using a tool", right: "Like talking to someone" }
      ] }
    ]
  },

  /* Asked at the end, once per main item (manipulation check for task type). */
  scenarioRatings: {
    points: 7,
    questions: [
      { id: "scen_emotional", text: "How emotional did this decision feel?", low: "Not at all", high: "Very" },
      { id: "scen_analytical", text: "How analytical did this decision feel?", low: "Not at all", high: "Very" }
    ]
  },

  /* -----------------------------------------------------------------------
     ITEMS   [PLACEHOLDER: every item and every AI reply]

     Each item:
       id, type ("practice" | "emotional" | "analytical"), title (short
       reminder used in the end ratings), scenario, question (slider
       question), askText (the message the participant sends in Messaging),
       toolQuery (optional terse version shown in the Tool's Query cell),
       optionA / optionB { label, name, text },
       attributes: [{ label, a, b }]   (analytical items; [] otherwise)
       defaultSide "A" | "B"  (fixed mode, or when the first answer is 50)
       strength  (where the recommendation sits: B -> strength, A -> 100 - strength) [PLACEHOLDER: 80 everywhere]
       replies { A, B }          main AI reply arguing for each side
       followUp { A, B }         "Get an explanation" text (only if that option is on)
       secondOpinion { A, B, neutral }
     The same words are shown in both interfaces.
     ----------------------------------------------------------------------- */
  items: [
    /* ITEMS_START */
    /* ---- P1 (practice) [PLACEHOLDER] ---- */
    {
      "id": "P1",
      "type": "practice",
      "placeholder": true,
      "title": "Snack for study group",
      "scenario": "You are meeting four classmates in a library study room on Thursday evening to review for a midterm, and everyone agreed to bring something small to share. You have time to grab one thing on the way. You want something easy to pass around, that will not make a mess on shared notes, and that most people will actually eat during a two-hour session. The store next to the library has both options in stock.",
      "question": "Which would you choose?",
      "askText": "Which snack should I bring to the study group?",
      "toolQuery": "Select option (A/B): snack for 2-hour study group",
      "optionA": {
        "label": "Option A",
        "name": "Bag of pretzels",
        "text": "Bring a big bag of pretzels to share."
      },
      "optionB": {
        "label": "Option B",
        "name": "Box of clementines",
        "text": "Bring a box of clementines to share."
      },
      "attributes": [],
      "defaultSide": "A",
      "strength": 80,
      "replies": {
        "A": "Option A suits this session better: a bag of pretzels can sit open in the middle of the table, people can grab a handful without stopping, and there is nothing to peel or throw away near the notes. Option A is the better pick.",
        "B": "Option B suits this session better: clementines come in single servings, so each person can take one without passing a bag around, they leave no salty crumbs on notes or laptops, and nearly everyone likes them. Option B is the better pick."
      },
      "followUp": {
        "A": "Pretzels also keep well if nobody finishes them. The bag folds shut and goes back in a backpack, while a half-empty box of fruit is bulkier to carry home after a long evening.",
        "B": "Clementines also come across as a slightly more considered contribution, and they are easy to set aside for anyone who arrives late, since each one stays fresh in its peel."
      },
      "secondOpinion": {
        "A": "Looking at the full two hours: one big bag lasts the whole session, with people taking a few at a time, while fruit tends to get eaten in one round near the start. That favors Option A.",
        "B": "Looking at the second hour: after an hour of reviewing, something fresh and juicy tends to go over better than another salty handful. That favors Option B.",
        "neutral": "Both work well. Pretzels are easy to share from one bag and leave no peels behind; clementines leave no crumbs and feel fresher halfway through a long session. Either choice is reasonable, and neither is clearly better here."
      },
      "designNote": "Both snacks are cheap, common, and easy to share, with offsetting downsides (crumbs versus peels), so there is no correct answer."
    },

    /* ---- E1 (emotional) [PLACEHOLDER] ---- */
    {
      "id": "E1",
      "type": "emotional",
      "placeholder": true,
      "title": "Friend cancels plans again",
      "scenario": "Your friend Jordan was supposed to meet you for dinner at a new ramen place tonight, a plan the two of you made a week ago. Forty minutes before, Jordan messages to say something came up and asks to reschedule. This is the third time this month. You like Jordan and want to stay close, but the pattern is starting to bother you, and you are deciding how to reply.",
      "question": "Which reply would you send?",
      "askText": "How should I reply to Jordan cancelling again?",
      "toolQuery": "Select reply (A/B): friend cancelled plans, 3rd time this month",
      "optionA": {
        "label": "Reply A",
        "name": "Say it bothers you",
        "text": "no worries about tonight, but honestly this is the third time this month and it's kinda starting to bug me. can we pick a time you're sure about?"
      },
      "optionB": {
        "label": "Reply B",
        "name": "Keep it light",
        "text": "all good, things come up! let's just find another night soon, maybe sometime next week? let me know what works for you"
      },
      "attributes": [],
      "defaultSide": "B",
      "strength": 80,
      "replies": {
        "A": "Reply A fits better here. This is the third cancellation this month, and saying so now, while it is still a small irritation, keeps it from building into resentment later. The wording stays friendly, opens with \"no worries,\" and asks for a time Jordan is sure about, which is a fair request rather than a complaint. Reply A is the better one to send.",
        "B": "Reply B fits better here. A cancellation forty minutes out is annoying, but a warm, easy reply keeps the friendship relaxed and gives Jordan room to make it up next time. Raising the pattern in a quick reply can land harder than intended; it can come up later, in person, if it keeps happening. Reply B is the better one to send."
      },
      "followUp": {
        "A": "Naming the pattern also gives Jordan useful information. People who cancel a lot may not realize how often it happens, and a calm mention of \"third time this month\" lets Jordan adjust before the friendship starts to feel one-sided.",
        "B": "Reply B also proposes a concrete next step, a night next week, which keeps the plan alive instead of dwelling on what went wrong. Starting from goodwill tends to make any later conversation about the pattern easier, because Jordan has no reason to feel defensive."
      },
      "secondOpinion": {
        "A": "Consider your side of the plan: you kept tonight free for a week, and three plans in one month have now fallen through. Reply A says that plainly without blaming Jordan, and it treats the friendship as solid enough to handle an honest comment. That makes Reply A the stronger choice.",
        "B": "Consider what is still unknown: Jordan has not said what came up, and the reason may be a fair one. Reply B gives Jordan the benefit of the doubt and leaves room to hear the explanation before deciding whether the pattern is worth raising. That makes Reply B the stronger choice.",
        "neutral": "Both replies are reasonable. Reply A's strength is that it names the pattern early, while it is still easy to talk about. Reply B's strength is that it keeps things warm and saves the bigger conversation for a calmer moment. Neither is clearly better here; it depends on what matters more to you."
      },
      "designNote": "Naming a repeated pattern and extending a friend some grace are both widely endorsed responses, and both replies are polite and offer to reschedule."
    },

    /* ---- E2 (emotional) [PLACEHOLDER] ---- */
    {
      "id": "E2",
      "type": "emotional",
      "placeholder": true,
      "title": "Roommate takes your groceries",
      "scenario": "Your roommate Sam has been eating your groceries lately: first some yogurt, then most of a box of cereal, and this morning the last of your orange juice. Sam just wrote: \"hey, finished your OJ this morning, sorry, will grab some later.\" You get along well with Sam and split chores fairly, but you plan your food for the week and want this to stop without making things tense at home.",
      "question": "Which reply would you send?",
      "askText": "Sam keeps eating my groceries. How should I reply this time?",
      "toolQuery": "Select reply (A/B): roommate using groceries without asking",
      "optionA": {
        "label": "Reply A",
        "name": "Ask to check first",
        "text": "thanks for telling me! honestly though it's been happening a lot lately, could you check with me before taking my stuff from now on?"
      },
      "optionB": {
        "label": "Reply B",
        "name": "Suggest a shared shelf",
        "text": "no stress, thanks for the heads up! maybe we could set up a shared shelf for stuff we both use and keep the rest separate?"
      },
      "attributes": [],
      "defaultSide": "A",
      "strength": 80,
      "replies": {
        "A": "Reply A fits better here. This is the third item in a short stretch, and a plain request to check first addresses exactly that, without blaming Sam or turning it into a bigger issue. It opens by thanking Sam for being upfront, which keeps the tone friendly, and sets one simple rule that is easy to follow. Reply A is the better one to send.",
        "B": "Reply B fits better here. Sam was upfront about the juice, and a relaxed reply rewards that honesty, while a shared shelf turns the problem into a practical setup rather than a correction. A clear line between shared and personal food often settles this kind of drift on its own, without either of you feeling called out. Reply B is the better one to send."
      },
      "followUp": {
        "A": "Reply A also protects the way you plan your food. You shop for the week, and even with a shared shelf, the boundary between shared and personal items can blur. Asking Sam to check first keeps every item yours until you say otherwise, so the week's plan holds.",
        "B": "A shared shelf can also be a small upside for both of you. Basics you each buy anyway, like bread or milk, stop doubling up in the fridge, and Sam gets a clear place to take from, which makes the rest of your food easier to leave alone."
      },
      "secondOpinion": {
        "A": "Reading Sam's note closely: Sam already apologized and offered to replace the juice, so the topic is open right now. Reply A uses that moment to make the request honestly, and a short ask today is easier than raising it out of nowhere the next time something goes missing. Reply A is the stronger choice.",
        "B": "Looking at the relationship rather than the juice: you and Sam already split chores fairly, so organizing food the same way fits how the two of you share the place. Treating it as one more thing to set up together keeps it from turning into a point of friction. Reply B is the stronger choice.",
        "neutral": "Each reply has a real strength. Reply A states the problem plainly, so there is little chance Sam misses the point. Reply B offers a cooperative setup that keeps things easy at home. Neither is clearly better here; it depends on how Sam usually takes direct requests."
      },
      "designNote": "A direct request and a structural compromise are both common, constructive ways to handle a minor roommate boundary, and neither reply is rude or passive."
    },

    /* ---- E3 (emotional) [PLACEHOLDER] ---- */
    {
      "id": "E3",
      "type": "emotional",
      "placeholder": true,
      "title": "Friend's poster feedback",
      "scenario": "Your friend Priya designed a poster for her campus film club's movie night and sends you a photo asking, \"be honest, is this good?\" The colors are bright and the movie title stands out, but the date, time, and room number are in small text at the bottom and hard to read. The poster goes to print tomorrow morning. You want Priya's event to go well, and you know she put a lot of work into the design.",
      "question": "Which reply would you send?",
      "askText": "Priya wants honest feedback on her poster. Which reply works better?",
      "toolQuery": "Select reply (A/B): honest feedback on friend's event poster",
      "optionA": {
        "label": "Reply A",
        "name": "Point out the problem",
        "text": "honestly the title looks great, but the date and room are really hard to read. i'd make those way bigger before it prints or people might miss it"
      },
      "optionB": {
        "label": "Reply B",
        "name": "Encourage, suggest a tweak",
        "text": "it looks really good, the colors totally pop! if you have a sec maybe bump up the date and time a little, but it's great either way"
      },
      "attributes": [],
      "defaultSide": "B",
      "strength": 80,
      "replies": {
        "A": "Reply A fits better here. Priya asked directly for honesty, and the small date, time, and room number are the details people need to actually show up. With printing tomorrow morning, a clear note now is the most useful thing you can offer, and Reply A still opens by praising the title. Reply A is the better one to send.",
        "B": "Reply B fits better here. The poster already does the hard part, with bright colors and a title that stands out, and Reply B says so. It still flags the date and time, just gently enough that Priya can fix them tonight without feeling the whole design missed the mark. Reply B is the better one to send."
      },
      "followUp": {
        "A": "Reply A also makes the fix more likely to happen. A suggestion framed as optional, like \"if you have a sec,\" is easy to skip the night before printing. Saying that people might miss the event gives Priya a concrete reason to change it.",
        "B": "Reply B also leaves the final call with Priya, who knows the layout and how much space the bottom of the poster has. Offering the change as a suggestion treats her as the designer, which makes her more likely to ask you for feedback again."
      },
      "secondOpinion": {
        "A": "Weighing what makes feedback useful: praise carries more weight when it comes with a specific, honest note. Because Reply A names the problem directly, Priya can trust that the compliment about the title is real, and she knows exactly what to change. Reply A is the stronger choice.",
        "B": "Weighing the size of the problem: enlarging the date, time, and room number is a quick fix on an otherwise strong poster. Reply B describes it at that scale, as a small tweak, while Reply A's warning that people might miss the event makes it sound bigger than it is. Reply B is the stronger choice.",
        "neutral": "Both replies point to the same fix. Reply A's strength is clarity: Priya will know the date and room need to change before printing. Reply B's strength is encouragement: she hears the design works and gets a gentler nudge. Neither is clearly better here; it depends on what Priya meant by honest."
      },
      "designNote": "Both replies flag the same readability problem and differ only in how firmly, so the choice trades clarity of feedback against encouragement."
    },

    /* ---- A1 (analytical) [PLACEHOLDER] ---- */
    {
      "id": "A1",
      "type": "analytical",
      "placeholder": true,
      "title": "Cheaper apartment or closer one",
      "scenario": "You are choosing an apartment for next school year and have narrowed it down to two studios. You are on campus about five days a week, often for early classes, and you work part-time, so both money and time feel tight. You want to keep living costs down, but you also want more time for studying and sleep. Both leases run 12 months, and either place would be fine to live in.",
      "question": "Which option would you choose?",
      "askText": "Which of these two apartments should I sign the lease for?",
      "toolQuery": "Select option (A/B): apartment lease, 12 months",
      "optionA": {
        "label": "Option A",
        "name": "Maple Ave studio",
        "text": "A studio on Maple Ave, a 25-minute bus ride from campus."
      },
      "optionB": {
        "label": "Option B",
        "name": "Campus Row studio",
        "text": "A studio on Campus Row, a 10-minute walk from campus."
      },
      "attributes": [
        {
          "label": "Monthly rent",
          "a": "$1,050",
          "b": "$1,290"
        },
        {
          "label": "Utilities per month",
          "a": "About $90",
          "b": "Included"
        },
        {
          "label": "Commute each way",
          "a": "25 min (bus)",
          "b": "10 min (walk)"
        },
        {
          "label": "Floor space",
          "a": "420 sq ft",
          "b": "300 sq ft"
        }
      ],
      "defaultSide": "A",
      "strength": 80,
      "replies": {
        "A": "Option A, the Maple Ave studio, comes out ahead on cost. Even with about $90 in utilities, it totals roughly $1,140 a month against $1,290 for Option B, a gap of $150 a month or $1,800 over the 12-month lease. It also adds 120 square feet for a desk and storage, and the bus ride can double as reading time. Option A is the better one to sign.",
        "B": "Option B, the Campus Row studio, buys back time. The walk saves 30 minutes a day compared with the bus, which comes to 10 hours over about 20 campus days a month. With utilities included, the real cost gap is about $150 a month, or roughly $15 for each hour saved. That time can go to sleep, study, or shifts. Option B is the better one to sign."
      },
      "followUp": {
        "A": "Floor space matters more than it looks on paper. At 420 square feet, Option A has room for a real desk, so studying at home is practical. In a 300-square-foot studio, schoolwork tends to drift back to the library, which adds trips and time of its own.",
        "B": "Bus time is also less predictable than walking time. A 25-minute ride can stretch with missed connections, bad weather, or reduced evening service, while a 10-minute walk stays about the same. For early classes, that reliability means less buffer time and fewer rushed mornings."
      },
      "secondOpinion": {
        "A": "A lease locks in the cost for all 12 months, so the lower bill is the safer commitment while money is tight. The $1,800 saved over the year can also buy back time by allowing a few dropped work shifts during exam weeks. A slow month at work is easier to absorb, too. Option A is the stronger pick.",
        "B": "Time on campus days is the scarcer resource here. With early classes and a part-time job, a 10-minute walk makes it easy to go home between classes to eat or rest, which a 25-minute ride each way rarely allows. Included utilities also keep the monthly bill fixed. Option B fits this schedule better.",
        "neutral": "Both are reasonable. Option A's strongest point is money and space: about $1,800 saved over the lease plus 120 more square feet. Option B's strongest point is time: roughly 10 hours a month back and an easy walk home between classes. The choice depends on whether money or time feels tighter this year, and neither is clearly better."
      },
      "designNote": "Option A saves $150 a month and adds space, while Option B saves about 10 hours of commuting a month, so the implied price of about $15 per hour saved sits right where students could reasonably go either way."
    },

    /* ---- A2 (analytical) [PLACEHOLDER] ---- */
    {
      "id": "A2",
      "type": "analytical",
      "placeholder": true,
      "title": "Choosing a summer job",
      "scenario": "You are picking a job for a 10-week summer break and have two offers. You want to save as much as you can for rent and books in the fall, but you also plan to take one online course this summer and would like some time to rest. Both jobs use fixed 8-hour shifts, and the city bus is free with your student ID.",
      "question": "Which option would you choose?",
      "askText": "Which of these two summer job offers should I accept?",
      "toolQuery": "Select option (A/B): summer job offer, 10 weeks",
      "optionA": {
        "label": "Option A",
        "name": "Hotel front desk job",
        "text": "A front desk job at a downtown hotel, working three 8-hour shifts a week."
      },
      "optionB": {
        "label": "Option B",
        "name": "Campus bookstore job",
        "text": "A register and stockroom job at the campus bookstore, working four 8-hour shifts a week."
      },
      "attributes": [
        {
          "label": "Hourly pay",
          "a": "$18.00",
          "b": "$15.00"
        },
        {
          "label": "Hours per week",
          "a": "24",
          "b": "32"
        },
        {
          "label": "Shifts per week",
          "a": "3",
          "b": "4"
        },
        {
          "label": "Commute each way",
          "a": "40 min (bus)",
          "b": "10 min (walk)"
        }
      ],
      "defaultSide": "B",
      "strength": 80,
      "replies": {
        "A": "Option A, the hotel front desk job, pays more per hour spent. Three shifts at $18 an hour earn $432 a week over 28 hours with the bus, roughly $15.40 per hour. Option B earns $480 a week over about 33 hours with travel, roughly $14.40 per hour. Option A gets 90 percent of the pay in about 5 fewer hours. Option A is the better one to take.",
        "B": "Option B, the campus bookstore job, earns more over the summer. Four 8-hour shifts at $15 an hour come to $480 a week, or $4,800 over 10 weeks, compared with $4,320 for Option A, a difference of $480. The 10-minute walk also means about 13 hours of commuting all summer instead of 40 hours on the bus. Option B is the better one to take."
      },
      "followUp": {
        "A": "Whole free days are worth more than spare evenings. Three shifts leave four open days a week for course videos, assignments, and rest, while four shifts leave three. Over 10 weeks, that is 40 free days against 30, which makes the online course much easier to keep up with.",
        "B": "Option B also asks less of each workday. With a 10-minute walk, a shift day takes under 9 hours door to door, while each Option A shift day runs over 9 hours with the bus ride. Shorter days leave more evening energy for the online course."
      },
      "secondOpinion": {
        "A": "Consider what the extra $480 from Option B actually costs. Option B takes about 53 more hours over the summer once shifts and travel are counted, roughly $9 for each added hour. Giving up that much time for $9 an hour is a weak trade when an online course also needs attention. Option A is the stronger choice.",
        "B": "The main goal here is saving for fall rent and books, and those bills are paid in total dollars, not hourly rates. Option B puts $48 more toward them every week. Working on campus also keeps the library a short walk away, so course study can fit right before or after a shift. Option B fits better.",
        "neutral": "The strongest case for Option A is efficiency: about $15.40 per hour once the bus ride is counted, plus four free days a week. The strongest case for Option B is total pay: $480 more over the summer with a short walk. Neither is clearly better; it depends on whether fall savings or summer free time matters more."
      },
      "designNote": "Option A pays a higher rate per hour of total time and leaves an extra free day each week, while Option B earns $480 more over the summer with far less commuting, so the answer depends on whether savings or free time matters more."
    },

    /* ---- A3 (analytical) [PLACEHOLDER] ---- */
    {
      "id": "A3",
      "type": "analytical",
      "placeholder": true,
      "title": "Picking a used laptop",
      "scenario": "Your old laptop just stopped working, and you have three years left in your degree. You have found two used laptops in good condition. You carry your laptop to campus most days, often for long stretches between classes, and you keep a lot of photos and project files. Your budget is tight, so spending less matters, but you also want something that will hold up until graduation.",
      "question": "Which option would you choose?",
      "askText": "Which of these two used laptops should I buy?",
      "toolQuery": "Select option (A/B): used laptop purchase",
      "optionA": {
        "label": "Option A",
        "name": "2021 15-inch laptop",
        "text": "A used 15-inch laptop from 2021, in good condition."
      },
      "optionB": {
        "label": "Option B",
        "name": "2023 13-inch laptop",
        "text": "A used 13-inch laptop from 2023, in good condition."
      },
      "attributes": [
        {
          "label": "Price",
          "a": "$450",
          "b": "$650"
        },
        {
          "label": "Battery life",
          "a": "About 5 hours",
          "b": "About 11 hours"
        },
        {
          "label": "Storage",
          "a": "512 GB",
          "b": "256 GB"
        },
        {
          "label": "Update support left",
          "a": "3 more years",
          "b": "6 more years"
        }
      ],
      "defaultSide": "A",
      "strength": 80,
      "replies": {
        "A": "Option A, the 2021 15-inch laptop, covers what you need for less. At $200 less, it costs about $150 per year of your degree versus about $217 for Option B, and its 3 years of update support match the 3 years you have left. Its 512 GB drive also holds twice as much, with room for photos and project files. Option A is the better one to buy.",
        "B": "Option B, the 2023 13-inch laptop, fits long days on campus. About 11 hours of battery is more than double Option A's 5, so there is no need to hunt for outlets between classes. It also gets twice the update support, 6 years against 3. The extra $200, spread over 3 years, is under $6 a month. Option B is the better one to buy."
      },
      "followUp": {
        "A": "The storage gap is easy to underestimate. Photos and project files grow every semester, and 256 GB fills quickly, since part of it is used before any files are added. Option B would likely need an external drive or a paid cloud plan, adding to its $200 higher price.",
        "B": "Update support matters for more than new features. A laptop whose updates end right at graduation leaves no margin if your degree runs a semester longer, and it may stop getting security fixes just when you need it for job applications. Option B's 6 years remove that concern."
      },
      "secondOpinion": {
        "A": "Option A's weak spot, battery life, has a free fix: bringing the charger and sitting near an outlet, which most libraries and lecture halls offer. Option B's weak spot, storage, usually costs money to fix. The 15-inch screen also gives more room for papers and photos. With $200 left for textbooks, Option A comes out ahead.",
        "B": "Over a longer horizon, Option B holds its value better. Its updates continue for 3 years after graduation, so it can carry into a first job or be resold for part of its price, while Option A's support ends when school does. The 13-inch size is also easier to carry daily. Option B is the stronger choice.",
        "neutral": "The strongest point for Option A is cost and storage: $200 less and twice the space for files, with updates lasting through graduation. The strongest point for Option B is daily convenience: more than double the battery life and updates well past graduation. Neither is clearly the better buy; it depends on whether budget or battery matters more."
      },
      "designNote": "Option A is $200 cheaper with double the storage and support that just covers the degree, while Option B has more than double the battery life and twice the support period, so the better value depends on how a student weighs budget, storage, and portability."
    }
    /* ITEMS_END */
  ]
};
