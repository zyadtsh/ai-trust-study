/* =========================================================================
   STUDY CONFIG
   All study text and settings live in this one file. You can edit it
   without touching any code. Save, then reload the page.

   Items and AI replies are drafts: pilot them before the real study.

   Text fields are plain text; a blank line starts a new paragraph.
   Fields called "html" accept simple HTML.
   ========================================================================= */
window.STUDY_CONFIG = {
  studyTitle: "Decision study",   // neutral on purpose: does not reveal the interface manipulation
  version: "1.2-pilot",   // 1.1: answer scale 0–100, no made-up run details, neutral Tool query. Change this whenever items, text or settings change during data collection

  /* -----------------------------------------------------------------------
     DATA COLLECTION (remote participants)
     endpoint: the web-app address from apps-script/Code.gs (README → "Collecting
       data remotely"). Each session is sent there and lands as one row in your
       private Google Sheet. Leave it "" for in-person sessions only: answers
       then stay in the browser that ran them.
     assignPid: with one shared link (no ?pid=), ask the endpoint for the next
       participant number, so Messaging/Tool and item orders stay balanced.
     contact: shown to participants on the first and last screen.
     minWidth: narrower screens (phones) are asked to switch to a computer.
     ----------------------------------------------------------------------- */
  dataCollection: {
    endpoint: "",
    assignPid: true,
    contact: "[TEAM CONTACT EMAIL]",
    minWidth: 900
  },

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
      tool: { label: "Tool", note: "Tool-like frame: no name, no avatar, no conversation. The two options are shown as inputs, a Run button starts the analysis, and the identical text appears as the output." }
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
      label: "Tool version: look",
      what: "Only affects the Tool interface.",
      "default": "app",
      choices: {
        light:  { label: "Light",  note: "A form with inputs, a Run button and an output box. Reads as generic software rather than a spreadsheet. Weakest tool cue: the two conditions would differ mostly in layout and turn-taking." },
        medium: { label: "Medium", note: "A grid with column letters and row numbers, a formula bar and an output panel. Clearly a spreadsheet-style tool while staying uncluttered." },
        full:   { label: "Full",   note: "Adds a title bar, menus, a toolbar, sheet tabs and a status bar. The strongest, least humanlike tool cue (your pick). Trade-off: more visual clutter than the chat, so “more on screen” becomes part of the difference, and inert menus may distract a few people." },
        app:    { label: "App",    note: "Decision-support software, not a spreadsheet: a product title bar, the two options as input cards, a “Run analysis” button, inputs on the left and output on the right; each AI reply opens in its own tab under “Generated summary”. Only the AI text: no run details, IDs, timings, scores or “Selected” field, so the reply carries the same information as in Messaging. Strong tool cue without the numbers/analysis feel of a grid." },
        terminal: { label: "Terminal", note: "A command line: dark window, monospace text, the inputs printed by a command, a “Run” button that sends the next command, and the reply printed below it. The most machine-like look, with no product branding. Trade-offs: the AI text is in a monospace font, light on dark (every other look uses the shared font, dark on light), which reads more slowly and may itself change trust; it still has turn-taking (command, then reply), like the chat; and it can feel technical or unfamiliar to people who never use a terminal, so familiarity becomes part of the difference." },
        notebook: { label: "Notebook", note: "A data-science notebook: code cells (In [1]) with outputs (Out [1]). The inputs appear as a table produced by code, the Run button runs a recommend(…) cell, and the reply appears as the cell's output in the shared font. Strong “computed by an analysis” cue, which may raise trust on analytical items for reasons other than the absence of humanlike cues; showing code can feel technical to some participants." },
        report: { label: "Report", note: "A generated document on a page: “1. Request” (query and both options) with a “Generate recommendation” button, then each AI reply is added as a numbered section of the same document. No conversation layout or turn-taking at all, only a document that grows. Formal and authoritative; with the Light look it is the least technical tool look, but the document style may lend extra authority." }
      }
    },

    toolQuery: {
      label: "Tool version: wording of the query",
      what: "What the Tool shows in its Query box. Messaging always sends the item's askText as a message.",
      "default": "terse",
      choices: {
        terse: { label: "Neutral (tool-style)", note: "Uses the item's toolQuery, e.g. “Choose message (A/B): roommate's late-night calls”. Keeps the first-person, conversational request out of the Tool's Query line, so it reads as software (the option texts themselves are the same in both interfaces). The inputs then differ slightly in wording between the two interfaces; the AI's reply words stay identical." },
        same:  { label: "Same as chat message", note: "Shows the exact chat message, e.g. “How should I bring up Sam's late-night calls?”. Inputs are word for word identical across interfaces, but the Tool then contains a first-person, conversational line, which is a humanlike cue." }
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
        opposite: { label: "Opposite to first answer", note: "Recommends the side the participant did not lean toward (exactly 50, the middle → the item's default side). Every trial leaves room to move toward the advice, so weight of advice is measurable on every trial. People may notice the AI always disagrees, which can lower trust in both conditions." },
        fixed:    { label: "Fixed per item", note: "Each item always recommends its default side. More natural, but people who already agreed have nowhere to move, so those trials say little about trust, and you lose usable trials unevenly across items." }
      }
    },

    leanAsNumber: {
      label: "Say the lean as a number",
      what: "Adds one sentence with the recommendation's position on the 0–100 slider.",
      "default": "off",
      choices: {
        off: { label: "Off (words only)", note: "The lean is only given in words. Reads naturally in both frames. Weight of advice is computed from the configured position (20 or 80), which participants never see, so it is approximate." },
        on:  { label: "On", note: "Appends e.g. “On a 0–100 scale from Option A to Option B, this comes out at about 80.” Makes weight of advice exact and comparable with classic advice-taking studies, but numbers read tool-like (which may shrink the difference between frames) and act as an anchor." }
      }
    },

    followUp: {
      label: "Second scripted turn (“Get an explanation”)",
      what: "An optional button that shows one scripted explanation per item.",
      "default": "off",
      choices: {
        off: { label: "Off", note: "One reply per item. Everyone reads the same amount of AI text." },
        on:  { label: "On", note: "A “Get an explanation” button appears with the reply and shows a scripted explanation (typing dots in Messaging, a progress indicator in Tool; same delay). Adds a second behavioural measure, but people who click read more AI text before their final answer, so exposure differs between people." }
      }
    },

    secondOpinion: {
      label: "What the second opinion says",
      what: "Whether participants can ask for a second opinion, and if so which scripted reply it shows.",
      "default": "off",
      choices: {
        off:      { label: "Off (no second opinion)", note: "No “Get a second opinion” button. Every final answer reflects only the main AI’s advice, so weight of advice is clean on every decision, and the session is a little shorter. You lose the second-opinion request as a measure, and “Who gives the second opinion” no longer matters." },
        neutral:  { label: "Neutral", note: "A second AI reply that lays out both options without picking one. The click itself is the measure (wanting to check); the content pushes neither way, though it may pull final answers toward the middle." },
        agree:    { label: "Agrees", note: "Reaches the same recommendation with different reasoning, like regenerating an answer. People who click get a double dose of the same advice, which inflates their shift toward it." },
        disagree: { label: "Disagrees", note: "Recommends the other side. Creates real conflict between the two AI answers; final answers of people who click become hard to read as trust in the first reply." }
      }
    },

    secondOpinionSource: {
      label: "Who gives the second opinion",
      what: "How each frame presents the source of the second AI reply.",
      "default": "same",
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
      what: "How the 8 main items are ordered (the practice item is always first). With ?pid=, orders cycle so each is used equally often.",
      "default": "latin",
      choices: {
        latin:   { label: "Balanced Latin square", note: "8 orders; each item appears in each position equally often and follows every other item equally often (so the two items of a topic pair sit next to each other in 1 of every 7 transitions, the minimum this design allows). Task types are mixed (never three of one type in a row). With ?pid=: 8 orders × 2 interfaces = 16 cells, so 48 people gives 3 per cell and 64 gives 4." },
        blocked: { label: "Blocked by task type", note: "All of one task type, then the other; which type comes first alternates. Cleaner task contexts, but task type is then tied to time in session (fatigue, growing familiarity with the AI)." },
        random:  { label: "Random", note: "A fresh shuffle per person (fixed per pid). Simplest, but with 48 people some positions will be unbalanced by chance." }
      }
    },

    delayMs: {
      label: "Reply delay (milliseconds)",
      what: "Same in both interfaces: typing dots in Messaging, a progress indicator (“Processing…”) in Tool. Applies to every AI reply.",
      "default": 2500,
      type: "number", min: 0, max: 15000, step: 250,
      note: "Longer delays make the typing indicator or progress bar more noticeable; very short ones can feel instant or fake."
    }
  },

  /* -----------------------------------------------------------------------
     SCREEN TEXT
     ----------------------------------------------------------------------- */
  text: {   // all participant-facing wording below; {contact} = dataCollection.contact
            // NOTE: the debrief (closing) describes the "Opposite to first answer"
            // rule. If you switch "Which side the AI recommends" to "Fixed per
            // item", rewrite that sentence.
    intro: {
      title: "Welcome",
      html:
        '<p>This study is a class project for <b>CSCI 1952A: Human‑AI Interaction</b>.</p>' +
        '<p><b>What you will do.</b> You will make a few short, everyday decisions. For each one you give your own answer, see a recommendation from an AI, and then give your final answer. At the end there are a few short questions, and some details about the study are explained. It takes about 15–20 minutes. Please use a laptop or desktop computer and finish in one sitting.</p>' +
        '<p><b>What we record.</b> Your answers, your ratings, how long each step takes, the size of your browser window and whether your device has a touch screen. We do not collect your name, email address or any other information that identifies you. {storage} Results are used only for this class project and are reported only as group averages.</p>' +
        '<p><b>Taking part is voluntary.</b> You can stop at any time, without giving a reason, by closing this page (your browser may ask you to confirm). If you open the link again within 12 hours, you can continue where you left off. Answers from sessions that are never finished are not used. The study involves no risks beyond those of everyday life.</p>' +
        '<p><b>Questions?</b> Contact us at {contact}.</p>',
      // {storage} in the text above becomes one of these:
      storageRemote: "Your answers are sent to a private spreadsheet that only the research team can open, and a copy is kept in this browser so you can continue if the page closes.",
      storageLocal: "Your answers are saved on this computer for the research team.",
      consentLabel: "I have read the information above and agree to take part.",
      button: "Start"
    },
    instructions: {
      title: "How it works",
      html:
        '<ol class="steps">' +
        '<li>Read a short situation and the two choices.</li>' +
        '<li>Give your first answer on the slider.</li>' +
        '<li>Get the AI’s recommendation.</li>' +
        '<li>Give your final answer on the same slider. You can keep your first answer or change it.</li>' +
        '<li data-if="secondOpinion">If you like, you can get a second opinion before your final answer.</li>' +
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
      html: '<p>Please rate the AI you used in this study. There are no right or wrong answers; go with your first impression.</p>',
      button: "Continue"
    },
    scenarioRatings: {
      title: "About the decisions",
      html: '<p>Last step. Think back to each decision you made and rate how it felt to you.</p>',
      button: "Continue"
    },
    closing: {
      title: "Thank you",
      html:
        '<p>Thank you for taking part.</p>' +
        '<p><b>What this study is about.</b> We are studying whether the way an AI is presented changes how much people trust and use its advice. Some participants saw the AI as a contact in a messaging app; others saw it as an analysis tool. The AI’s written replies were word for word the same in both versions.</p>' +
        '<p><b>What was set up in advance.</b> There was no live AI in this study. All replies were written ahead of time by the researchers and were not based on any analysis of your situation: for every decision we wrote a convincing reply for each option, and both options were designed to be equally reasonable, so there was no right answer. Which option the AI recommended followed a fixed rule: it recommended the option you had <em>not</em> leaned toward in your first answer (or a preset option if you had no preference).</p>' +
        '<p>We could not tell you this at the start, because knowing it could have changed how you responded.</p>' +
        '<p><b>Your choice.</b> If you would rather your answers not be used, tick the box below. If you change your mind later, email us your participation code (below) and we will delete your answers; without the code we cannot tell which answers are yours, because we do not record your name.</p>',
      withdrawLabel: "Please do not use my answers.",
      codeLine: "Your participation code: {code}",
      after:
        '<p><b>Questions or concerns?</b> Contact us at {contact}.</p>' +
        '<p>Please do not share details of the study with anyone who may still take part.</p>',
      researcherHeading: "For the researcher"
    },
    /* Remote-session messages (see dataCollection above). */
    remote: {
      startWaiting: "One moment…",
      gateTitle: "Please use a computer",
      gateHtml: "<p>This study needs a laptop or desktop computer, with a browser window at least {width} pixels wide.</p><p>Please open this link on a computer. If you are already on one, make this window wider or full screen, or zoom out (Ctrl or Cmd and the minus key), and the study will start by itself.</p>",
      resumeTitle: "Welcome back",
      resumeHtml: "<p>You started this study earlier in this browser. Press Continue to carry on where you left off; the decision you were on will start again.</p><p>If you did not start this study yourself (for example, someone else used this computer), please do not continue, and contact us at {contact}.</p>",
      resumeButton: "Continue",
      doneTitle: "Already completed",
      doneHtml: "<p>This study has already been completed in this browser. Each person can take part only once. Thank you!</p><p>If you have not taken part yourself (for example, someone else used this computer), please contact us at {contact}.</p>",
      staleTitle: "Open in another tab",
      staleHtml: "<p>This study is open in another tab or window. Please continue there and close this one.</p>",
      saving: "Saving your answers…",
      saved: "Your answers have been saved. You can close this page.",
      savedWithdrawn: "Your choice has been saved: your answers will not be used. You can close this page.",
      savedLocal: "Your answers have been saved.",
      failedHtml: "<b>Your answers could not be sent yet.</b> Please check your internet connection and press Try again. If it keeps failing, press Download my answers and email the file to {contact} (we will save the file and delete your email).",
      failedWithdrawnHtml: "<b>Your choice could not be sent yet.</b> Please check your internet connection and press Try again. If it keeps failing, email {contact} with your participation code {code} and we will delete your answers.",
      retry: "Try again",
      download: "Download my answers",
      downloadCopy: "Download a copy"
    }
  },

  /* Slider labels. {A} and {B} become each item's option labels. */
  slider: {
    left: "Definitely {A}",
    middle: "No preference",
    right: "Definitely {B}",
    firstMarker: "your first answer",
    max: 100           // scale runs 0..max in whole steps; the middle (max / 2) is "No preference"
  },

  /* Used only when "Say the lean as a number" is on. */
  leanNumberTemplate: "On a 0–100 scale from {A} to {B}, this comes out at about {pos}.",

  /* Interface chrome. The AI's words come from the items, never from here. */
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
      queryLabel: "Query",
      app: {                              // the "App" look (designOptions → toolLook)
        title: "Decision Analysis",
        version: "v2.1",
        runButton: "Run analysis",
        processing: "Processing…",
        inputTitle: "New analysis",
        outputTitle: "Output",
        outputEmpty: "No output yet. Run an analysis to see results.",
        tabMain: "Result",                // tab names; one tab per AI reply
        kindFollowUp: "Factor details",
        kindSecond: "Alternate run",
        rationaleLabel: "Generated summary"
      },
      terminal: {                         // the "Terminal" look
        title: "decide — terminal",
        prompt: "$",
        showCommand: "decide show",       // already run: prints the query and the options
        runCommand: "decide recommend",
        followUpCommand: "decide explain",
        secondCommand: "decide recommend {flag}",
        secondSameFlag: "--run 2",        // second opinion, "The same AI again"
        secondSeparateFlag: "--model 2",  // second opinion, "A second AI"
        queryLabel: "query",
        runButton: "Run ⏎",
        running: "running…"
      },
      notebook: {                         // the "Notebook" look
        title: "Notebook · decision",
        idle: "Idle",
        busy: "Busy",
        inLabel: "In",
        outLabel: "Out",
        queryVar: "query",
        optionsVar: "options",
        runCall: "recommend(options, query)",
        followUpCall: "explain(Out[{out}])",
        secondCall: "recommend(options, query, {arg})",
        secondSameArg: "run=2",
        secondSeparateArg: "model=2",
        runButton: "Run",
        running: "Running…"
      },
      report: {                           // the "Report" look
        title: "Report generator",
        docTitle: "Recommendation report",
        requestHeading: "Request",
        mainHeading: "Recommendation",
        followUpHeading: "Explanation",
        secondHeading: "Second opinion",
        runButton: "Generate recommendation",
        lockedHint: "Save your first answer to generate the recommendation.",
        running: "Generating…"
      }
    }
  },

  /* -----------------------------------------------------------------------
     QUESTIONNAIRES   (study-specific items, not published scales)
     ----------------------------------------------------------------------- */
  perItemRatings: {
    points: 7,
    questions: [
      { id: "item_trust", text: "How much do you trust the AI’s recommendation on this decision?", low: "Not at all", high: "Completely" },
      { id: "item_ai_understood", text: "How well did the AI understand this situation?", low: "Not at all", high: "Very well" }
    ]
  },

  /* End-of-study ratings of the AI. Block titles are for you (CSV column
     names and means); participants see one list without headings. */
  endMeasures: {
    points: 7,
    blocks: [
      /* At least 3 items per scale, so each scale's reliability (Cronbach's
         alpha) can be checked: trust 3, competence 3, warmth 3, humanlikeness 4
         word pairs (the interface manipulation check). 13 questions, about a
         minute. To shorten later, drop items only after the pilot shows which
         ones hang together. */
      { id: "trust", kind: "likert", low: "Strongly disagree", high: "Strongly agree", items: [
        { id: "trust_1", text: "I trusted the AI’s recommendations." },
        { id: "trust_2", text: "The AI’s recommendations were reliable." },
        { id: "trust_3", text: "I could depend on the AI’s recommendations." }
      ] },
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
      /* One two-ended question instead of separate "how emotional" and "how
         analytical" ratings: 1 = purely emotional, 7 = purely analytical. */
      { id: "scen_type", text: "Did this decision feel more emotional or more analytical?", low: "Emotional", high: "Analytical" }
    ]
  },

  /* -----------------------------------------------------------------------
     ITEMS   (1 neutral practice item + 4 matched topic pairs, each with one
             emotional and one analytical item)

     Each item:
       id, type ("practice" | "emotional" | "analytical"), pair (topic the
       emotional and analytical versions share; for your notes), title (short
       reminder used in the end ratings), scenario, question (slider
       question), askText (the message the participant sends in Messaging),
       toolQuery (neutral line shown in the Tool's Query box; see designOptions → toolQuery),
       optionA / optionB { label, name, text },
       attributes: [{ label, a, b }]   (analytical items; [] otherwise)
       defaultSide "A" | "B"  (fixed mode, or when the first answer is 50, the middle)
       strength  (where the recommendation sits on the 0–100 scale: B -> strength, A -> 100 - strength) (80 everywhere)
       replies { A, B }          main AI reply arguing for each side
       followUp { A, B }         "Get an explanation" text (only if that option is on)
       secondOpinion { A, B, neutral }
     The same words are shown in both interfaces.

     Writing rules (reviewer mode flags lengths that drift apart):
       - Both options defensible; no correct answer.
       - Paired emotional and analytical scenarios within about 15% in length.
       - Replies: the pick, two reasons, the pick restated; A and B within
         about 10% in length. Impersonal (no "I"), no facts beyond the scenario.
       - Explanations and second opinions within about 15% of each other.
     ----------------------------------------------------------------------- */
  items: [
    /* ITEMS_START */
    /* ---- P1 (practice, neutral: neither emotional nor analytical) ---- */
    {
      "id": "P1",
      "type": "practice",
      "title": "Snack for study group",
      "scenario": "You are meeting four classmates in a library study room on Thursday evening to review for a midterm, and everyone agreed to bring something small to share. You have time to grab one thing on the way. You want something easy to pass around, that will not make a mess on shared notes, and that most people will actually eat during a two-hour session. The store next to the library has both options in stock.",
      "question": "Which would you choose?",
      "askText": "Which snack should I bring to the study group?",
      "toolQuery": "Choose snack (A/B): study group",
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
        "B": "Looking at the second hour: after an hour of reviewing, something fresh and juicy tends to go over better than another salty handful, and peeling one takes only a moment. That favors Option B.",
        "neutral": "Both work well. Pretzels are easy to share from one bag and leave no peels behind; clementines leave no crumbs and feel fresher halfway through a long session. Either choice is reasonable, and neither is clearly better here."
      },
      "designNote": "Both snacks are cheap, common, and easy to share, with offsetting downsides (crumbs versus peels), so there is no correct answer."
    },

    /* ---- E1 (emotional, pair 1: roommates) ---- */
    {
      "id": "E1",
      "type": "emotional",
      "pair": "roommates",
      "title": "Roommate's late-night calls",
      "scenario": "You share a two-bedroom apartment with your roommate Sam, and you get along well. For a few weeks, Sam has taken long video calls in the living room until about 1 a.m. on weeknights, and the sound carries into your room. You have 8 a.m. classes three days a week and are starting to feel worn out. You have not said anything yet. You are deciding what to text Sam.",
      "question": "Which message would you send?",
      "askText": "How should I bring up Sam's late-night calls?",
      "toolQuery": "Choose message (A/B): roommate's late-night calls",
      "optionA": {
        "label": "Option A",
        "name": "Ask directly",
        "text": "hey, could you take your late calls in your room after 11 on weeknights? the sound carries and I have 8ams"
      },
      "optionB": {
        "label": "Option B",
        "name": "Suggest shared quiet hours",
        "text": "hey, would you be up for setting some quiet hours for both of us on weeknights? I've been having trouble sleeping before my 8ams"
      },
      "attributes": [],
      "defaultSide": "B",
      "strength": 80,
      "replies": {
        "A": "Option A is the clearer message. It names the specific problem, the late calls, and offers a simple fix: taking them in Sam's room after 11 on weeknights. A concrete request is easy to agree to and hard to misread, and the reason given, 8 a.m. classes, makes it practical rather than personal. Option A is the better message to send.",
        "B": "Option B is the gentler message. Framing quiet hours as a rule for both roommates avoids singling Sam out, which keeps a good relationship from feeling like a complaint. It still mentions the 8 a.m. classes, so the reason is clear, and it invites Sam to help shape the solution rather than simply comply. Option B is the better message to send."
      },
      "followUp": {
        "A": "A shared quiet-hours proposal can also be vaguer than intended. Sam might agree to quiet hours without connecting them to the calls, and the problem continues. Naming the calls directly, as Option A does, makes the change clear, so a second and more awkward conversation is less likely.",
        "B": "Sam has never been told the calls are a problem, so a first message that sounds like a correction can feel sudden. Option B raises the issue as a shared arrangement, which leaves room for Sam to mention habits of their own, and makes the agreement feel mutual rather than one-sided."
      },
      "secondOpinion": {
        "A": "Looking at the timing: the problem has run for weeks, and the early classes are already taking a toll. A specific request gets the fastest change, and roommates who get along well can usually handle a direct, polite ask without strain. Option A is the stronger choice.",
        "B": "Looking at the relationship: the two roommates get along well, and living together lasts the rest of the year. A message that treats quiet hours as something both share protects that, while still making the sleep problem clear. Option B is the stronger choice.",
        "neutral": "Both messages are polite and give the same reason. Option A's strength is clarity: it names the calls and asks for one specific change. Option B's strength is tone: it frames the fix as shared and invites Sam in. Either is a reasonable start, and neither is clearly better."
      },
      "designNote": "Both messages are polite and cite the same reason; they trade directness against a softer, shared framing."
    },

    /* ---- A1 (analytical, pair 1: roommates) ---- */
    {
      "id": "A1",
      "type": "analytical",
      "pair": "roommates",
      "title": "Choosing an internet plan",
      "scenario": "You and your roommate are setting up internet for your apartment and will split the bill evenly. Your lease runs 10 months, from August to May. You both stream video and sometimes take classes online, and your roommate games online a few evenings a week. You have narrowed it to two plans from the same provider. Either plan would handle video calls and streaming without trouble.",
      "question": "Which plan would you choose?",
      "askText": "Which internet plan should we sign up for?",
      "toolQuery": "Choose plan (A/B): apartment internet",
      "optionA": {
        "label": "Option A",
        "name": "Flex 500",
        "text": "A 500 Mbps plan with no contract."
      },
      "optionB": {
        "label": "Option B",
        "name": "Saver 200",
        "text": "A 200 Mbps plan with a 12-month contract."
      },
      "attributes": [
        {
          "label": "Monthly price",
          "a": "$55",
          "b": "$45"
        },
        {
          "label": "Setup fee",
          "a": "$75",
          "b": "None"
        },
        {
          "label": "Fee for cancelling after 10 months",
          "a": "None",
          "b": "$100"
        },
        {
          "label": "Download speed",
          "a": "500 Mbps",
          "b": "200 Mbps"
        },
        {
          "label": "Total for the 10-month lease",
          "a": "$625",
          "b": "$550"
        }
      ],
      "defaultSide": "A",
      "strength": 80,
      "replies": {
        "A": "Option A, the Flex 500 plan, gives more for a small difference. It costs $75 more over the 10-month lease, or $37.50 per roommate, under $4 a month each. For that, it delivers two and a half times the speed, which helps when one roommate is gaming while the other is on a video call. With no contract, it also ends cleanly in May. Option A is the better plan.",
        "B": "Option B, the Saver 200 plan, covers the apartment's needs for less. At 200 Mbps it handles streaming, online classes, and gaming at the same time, and it costs $75 less over the lease, even after the $100 cancellation fee. Split evenly, that is $37.50 back for each roommate. Speed beyond what is used adds cost without benefit. Option B is the better plan."
      },
      "followUp": {
        "A": "The contract carries a risk the totals do not show. If plans change and the apartment is given up early, Option B's cancellation fee still applies, and one roommate, as the named account holder, may have to pay it. Option A can be cancelled at any time with nothing owed.",
        "B": "Speed matters less than it seems for these uses. A video call needs a few megabits per second and high-definition streaming about 25, so several devices at once stay well under 200. Most of Option A's extra speed would go unused, so the $75 buys little in practice."
      },
      "secondOpinion": {
        "A": "Looking at shared use: two people online at once, one of them gaming, is where slower plans start to show lag. Option A's extra speed gives room for busy evenings, and under $4 a month each is a small price for a smoother connection. Option A is the stronger choice.",
        "B": "Looking at the whole lease: Option B is cheaper every month, and the cancellation fee only narrows the gap to $75. For two students on a budget, the plan that meets every listed need at the lowest total cost is the sensible default. Option B is the stronger choice.",
        "neutral": "Both plans handle streaming, classes, and gaming. Option A's strength is speed and flexibility: two and a half times faster, with no contract. Option B's strength is cost: $37.50 less per roommate over the lease. It depends on what the extra speed is worth, and neither is clearly better."
      },
      "designNote": "Option A costs $37.50 more per roommate over the lease for 2.5 times the speed and no contract; both plans meet the stated needs."
    },

    /* ---- E2 (emotional, pair 2: friends) ---- */
    {
      "id": "E2",
      "type": "emotional",
      "pair": "friends",
      "title": "Friend forgot your birthday",
      "scenario": "Your close friend Riley forgot your birthday yesterday. You had mentioned it a few times the week before, and most of your other friends sent messages or stopped by. This morning Riley texted: \"oh no, I totally forgot your birthday yesterday!! happy belated, I feel terrible.\" You were a little hurt, but you know Riley has had a stressful week of exams. You are deciding how to reply.",
      "question": "Which reply would you send?",
      "askText": "How should I reply to Riley forgetting my birthday?",
      "toolQuery": "Choose reply (A/B): friend forgot birthday",
      "optionA": {
        "label": "Option A",
        "name": "Say it stung",
        "text": "thank you! honestly it stung a little, but I know you've had a rough week. want to get dinner this weekend?"
      },
      "optionB": {
        "label": "Option B",
        "name": "Let it go",
        "text": "thank you!! don't worry about it at all, I know exams have been a lot. want to get dinner this weekend?"
      },
      "attributes": [],
      "defaultSide": "A",
      "strength": 80,
      "replies": {
        "A": "Option A is the more honest reply. It thanks Riley, says briefly that the forgotten birthday hurt, and still shows understanding about the stressful week. Close friends usually handle a small, kind admission well, and saying it now keeps the hurt from quietly building up. The dinner invitation ends things warmly. Option A is the better reply to send.",
        "B": "Option B is the more generous reply. Riley has already apologized and said they feel terrible, so adding that it stung mostly increases the guilt without changing anything. Mentioning the exams shows understanding, and the dinner invitation makes clear the friendship is fine. A forgotten birthday is a small slip. Option B is the better reply to send."
      },
      "followUp": {
        "A": "Saying it lightly now is easier than saying it later. If the hurt goes unmentioned, it can come out more sharply the next time Riley forgets something. Option A names it once, gently, alongside understanding, so the moment can pass without leaving anything unsaid between the two friends.",
        "B": "Riley's message already does what an honest reply would do: it admits the mistake and shows they care. Option B accepts that apology fully, which tends to make the next plan feel easy rather than awkward, and keeps the focus on spending time together at dinner."
      },
      "secondOpinion": {
        "A": "Looking at the friendship over time: close friends benefit from being able to say small things honestly. Option A does that with care, pairing the admission with sympathy and an invitation. It treats Riley as someone who can hear a gentle truth. Option A is the stronger choice.",
        "B": "Looking at Riley's side: a friend who forgot during exam week and apologized right away is unlikely to repeat it carelessly. Option B lets the apology land and moves straight to making plans, which is usually what a quick slip calls for. Option B is the stronger choice.",
        "neutral": "Both replies are kind, and both suggest dinner. Option A's strength is honesty: it gently says the forgotten birthday hurt. Option B's strength is generosity: it accepts the apology fully and moves on. Either fits a close friendship, and neither is clearly better here."
      },
      "designNote": "Both replies are warm and suggest dinner; they trade gentle honesty about the hurt against fully accepting the apology."
    },

    /* ---- A2 (analytical, pair 2: friends) ---- */
    {
      "id": "A2",
      "type": "analytical",
      "pair": "friends",
      "title": "Getting to a weekend trip",
      "scenario": "You and three friends are planning a weekend trip to a city about 150 miles away, leaving Friday afternoon and returning Sunday evening. The group needs to decide how to get there, and everyone will split the cost evenly. Two of you have driver's licenses. You would like to keep costs low, but you also have a paper due Monday and were hoping to work on it during the trip.",
      "question": "Which option would you choose?",
      "askText": "Should we rent a car or take the train for our trip?",
      "toolQuery": "Choose option (A/B): travel to weekend trip",
      "optionA": {
        "label": "Option A",
        "name": "Rental car",
        "text": "Rent a car for the weekend and drive, sharing the cost of gas."
      },
      "optionB": {
        "label": "Option B",
        "name": "Train",
        "text": "Take the train both ways, with one transfer each way."
      },
      "attributes": [
        {
          "label": "Cost per person, round trip",
          "a": "$48",
          "b": "$62"
        },
        {
          "label": "Travel time each way",
          "a": "2 h 30 min",
          "b": "3 h 15 min"
        },
        {
          "label": "Driving",
          "a": "Two drivers take turns",
          "b": "None"
        },
        {
          "label": "Getting around the city",
          "a": "By car",
          "b": "Transit and walking"
        }
      ],
      "defaultSide": "B",
      "strength": 80,
      "replies": {
        "A": "Option A, the rental car, is cheaper and faster. It costs $14 less per person and saves 45 minutes each way, an hour and a half over the weekend. A car also makes getting around the city easier. With two drivers taking turns, each drives only part of the way, and the passengers can still work on the paper. Option A is the better choice.",
        "B": "Option B, the train, turns travel time into work time. With no driving, there are about 6 hours of round-trip travel for the paper due Monday, which takes pressure off the weekend itself. The extra $14 per person buys that time plus a break from driving 300 miles. Transit covers most trips in the city. Option B is the better choice."
      },
      "followUp": {
        "A": "Transfers add risk that the listed times do not show. One late train can mean a missed connection and a long wait, especially on a Sunday evening. A car leaves on the group's schedule and returns the same way, which matters with a paper due the next morning.",
        "B": "Driving costs more than the price suggests. One person is at the wheel for every minute of the trip, so at least one person cannot work at all, and both drivers arrive more tired. On the train, all four can rest, read, or write, which matters with a deadline on Monday."
      },
      "secondOpinion": {
        "A": "Looking at the group as a whole: four people sharing a car is the most efficient way to travel together, and the savings and shorter trip apply to everyone. Having a car in the city also opens up more of what the weekend can include. Option A is the stronger choice.",
        "B": "Looking at the paper due Monday: a weekend away leaves little time for it, and the train adds about 6 hours of usable time without taking anything from the trip. For $14 per person, that time is worth more than a shorter ride. Option B is the stronger choice.",
        "neutral": "Both options get the group there and back. Option A's strength is cost and speed: $14 less per person, 45 minutes shorter each way, and a car in the city. Option B's strength is usable time: about 6 hours to work on the paper. Neither is clearly better here."
      },
      "designNote": "Option A saves $14 per person and 90 minutes in total; Option B costs more but frees about 6 hours of travel time for the paper due Monday."
    },

    /* ---- E3 (emotional, pair 3: job) ---- */
    {
      "id": "E3",
      "type": "emotional",
      "pair": "job",
      "title": "Manager asks you to cover a shift",
      "scenario": "You work part-time at a campus café, and you like your manager, Dana. On Thursday, Dana texts asking whether you can cover an extra shift this Saturday because someone called in sick. You have already covered two extra shifts this month, and Saturday is the one day you had kept free to rest. Nothing is planned, but you were counting on the break. You are deciding how to reply.",
      "question": "Which reply would you send?",
      "askText": "How should I answer Dana about covering Saturday?",
      "toolQuery": "Choose reply (A/B): request to cover Saturday shift",
      "optionA": {
        "label": "Option A",
        "name": "Decline politely",
        "text": "hi Dana, sorry, I can't this Saturday. I've covered a couple of extra shifts already and need the day. hope you find someone!"
      },
      "optionB": {
        "label": "Option B",
        "name": "Cover with a limit",
        "text": "hi Dana, I can cover this Saturday, but I'll need to keep the next few Saturdays free. thanks for understanding!"
      },
      "attributes": [],
      "defaultSide": "B",
      "strength": 80,
      "replies": {
        "A": "Option A protects the day off. After two extra shifts this month, Saturday is the only planned rest, and giving it up risks burning out halfway through the semester. The reply is polite, gives a brief and honest reason, and wishes Dana luck finding someone. Managers expect staff to decline extra shifts sometimes. Option A is the better reply to send.",
        "B": "Option B helps Dana while setting a clear limit. Covering a shift when someone is sick builds goodwill with a manager you like, which can matter later for scheduling or references. Saying the next few Saturdays stay free keeps it from becoming a habit and makes the boundary explicit. Option B is the better reply to send."
      },
      "followUp": {
        "A": "Saying yes again makes the next request more likely. After two extra shifts, a third can quietly set the expectation of always being the one who covers. A polite no now resets that expectation, and a short reason like the one in Option A is enough without over-explaining.",
        "B": "A limit attached to a yes is often clearer than a plain no. Option B tells Dana exactly what to expect for the coming weeks, so future requests are less likely, while the help this Saturday shows reliability at a moment when the café is short-staffed."
      },
      "secondOpinion": {
        "A": "Looking at the whole semester: rest days are hard to get back once they are gone, and a third extra shift in one month is a lot alongside classes. A polite, honest no keeps the arrangement sustainable for both sides. Option A is the stronger choice.",
        "B": "Looking at the working relationship: a coworker is out sick, and Dana is asking, not demanding. Helping this once, with a clear limit on the coming weeks, earns goodwill and sets the boundary at the same time. Option B is the stronger choice.",
        "neutral": "Both replies are polite, and both set a boundary. Option A's strength is protecting the planned rest after two extra shifts. Option B's strength is helping Dana now while limiting future requests. Either is a reasonable way to answer, and neither is clearly better."
      },
      "designNote": "Both replies are polite and set a boundary; they trade protecting rest against helping a liked manager with an explicit limit."
    },

    /* ---- A3 (analytical, pair 3: job) ---- */
    {
      "id": "A3",
      "type": "analytical",
      "pair": "job",
      "title": "Choosing a work schedule",
      "scenario": "You work part-time at a campus café and are choosing your shift schedule for the semester. Both options are 12 hours a week, and the café is a 20-minute bus ride from your apartment each way. Your classes run on weekdays until mid-afternoon. You want to earn as much as you can while keeping time for coursework and friends. Your manager has offered two schedules, and you need to pick one by Friday.",
      "question": "Which schedule would you choose?",
      "askText": "Which of these two work schedules should I pick?",
      "toolQuery": "Choose schedule (A/B): part-time job",
      "optionA": {
        "label": "Option A",
        "name": "Weekday evenings",
        "text": "Three 4-hour evening shifts: Monday, Wednesday and Thursday."
      },
      "optionB": {
        "label": "Option B",
        "name": "Weekend days",
        "text": "Two 6-hour day shifts: Saturday and Sunday."
      },
      "attributes": [
        {
          "label": "Hourly pay",
          "a": "$17",
          "b": "$16"
        },
        {
          "label": "Weekly pay (12 hours)",
          "a": "$204",
          "b": "$192"
        },
        {
          "label": "Commuting per week",
          "a": "2 h (3 round trips)",
          "b": "1 h 20 min (2 round trips)"
        },
        {
          "label": "Weekday evenings free",
          "a": "2 of 5",
          "b": "5 of 5"
        },
        {
          "label": "Weekend days free",
          "a": "2 of 2",
          "b": "0 of 2"
        }
      ],
      "defaultSide": "A",
      "strength": 80,
      "replies": {
        "A": "Option A, the weekday evenings, pays more and keeps weekends free. At $17 an hour it brings in $12 more a week, about $180 over a 15-week semester. Saturdays and Sundays stay open for longer study sessions, errands, and time with friends. The extra 40 minutes of commuting each week is a small cost against both. Option A is the better schedule.",
        "B": "Option B, the weekend days, keeps weekday evenings free for coursework. Classes run until mid-afternoon, so evening shifts would cut into the main time for homework three nights a week. Two trips instead of three also save 40 minutes of commuting each week. The $12 a week less in pay is about $1 an hour. Option B is the better schedule."
      },
      "followUp": {
        "A": "Long weekend shifts carry a cost the hours do not show. Working both days leaves no full day off in the week, and 6-hour shifts are more tiring than 4-hour ones. Over a semester, a schedule with two free days usually makes the weekday workload easier to sustain.",
        "B": "Evening shifts also affect the next morning. Finishing work late, then riding the bus home, often pushes homework past midnight three nights a week. With Option B, weekdays follow a predictable pattern of classes, then study, and work stays contained in two blocks on the weekend."
      },
      "secondOpinion": {
        "A": "Looking at earnings and balance together: Option A earns about $180 more over the semester and still leaves two full days free every week. Weekends are also when friends are most available, which matters for a semester-long schedule. Option A is the stronger choice.",
        "B": "Looking at the weekly routine: keeping every weekday evening open for coursework is valuable during midterms and finals, when evening study time is hardest to replace. Fewer trips add to that, and the pay difference is small. Option B is the stronger choice.",
        "neutral": "Both schedules are 12 hours a week. Option A's strength is pay and free weekends: about $180 more over the semester. Option B's strength is free weekday evenings and 40 fewer minutes of commuting a week. It depends on which time matters more, and neither is clearly better."
      },
      "designNote": "Option A earns about $180 more per semester and keeps weekends free; Option B keeps every weekday evening free and saves 40 minutes of commuting a week."
    },

    /* ---- E4 (emotional, pair 4: group project) ---- */
    {
      "id": "E4",
      "type": "emotional",
      "pair": "group project",
      "title": "Group member hasn't contributed",
      "scenario": "You are in a four-person group for a class presentation due in five days. Last week everyone agreed on a plan, and each person took a set of slides. Three of you have finished drafts, but Jamie has not added anything or replied in the group chat for four days. You do not know Jamie well. You are usually the one who keeps the group organized, and you are deciding what message to send.",
      "question": "Which message would you send?",
      "askText": "What should I say about Jamie not doing their slides?",
      "toolQuery": "Choose message (A/B): group member's missing slides",
      "optionA": {
        "label": "Option A",
        "name": "Message Jamie privately",
        "text": "hey Jamie, just checking in. haven't seen your slides yet, is everything okay? happy to help if you're stuck"
      },
      "optionB": {
        "label": "Option B",
        "name": "Post in the group chat",
        "text": "hi all! quick check-in: can everyone have their slides in by Thursday so we have time to practice together?"
      },
      "attributes": [],
      "defaultSide": "A",
      "strength": 80,
      "replies": {
        "A": "Option A is more likely to get a real answer. A private message reaches Jamie directly, avoids embarrassing them in front of the group, and leaves room to explain if something is going on. The offer to help makes it easy to reply honestly instead of staying quiet. Option A is the better message to send.",
        "B": "Option B sets a clear deadline without singling anyone out. Asking everyone for slides by Thursday applies the same expectation to all four members, so Jamie is reminded without being called out. It also gives the group a shared date to plan practice around, which keeps the project on track. Option B is the better message to send."
      },
      "followUp": {
        "A": "Group-wide reminders are easy to overlook. Jamie has already gone quiet in the group chat for four days, so another message there may be missed in the same way. A direct message is harder to ignore and shows that someone has noticed, in a caring rather than critical way.",
        "B": "A private message from someone Jamie does not know well can feel more pointed than intended, as if Jamie is being watched. A group check-in keeps things neutral and lets Jamie respond without explaining anything to one person. It also creates a deadline everyone shares."
      },
      "secondOpinion": {
        "A": "Looking at Jamie's silence: four days without a reply can mean something is wrong. A private, friendly message is the most direct way to find out and to offer help, and it avoids any public pressure. Option A is the stronger choice.",
        "B": "Looking at the group's timeline: what the project needs most is a clear shared deadline. A group check-in sets one for everyone, nudges Jamie without singling them out, and makes planning the practice easier. Option B is the stronger choice.",
        "neutral": "Both messages are friendly and aim to get the slides done. Option A's strength is reaching Jamie directly and offering help. Option B's strength is setting a clear deadline for the whole group without singling anyone out. Either is reasonable, and neither is clearly better."
      },
      "designNote": "Both messages are friendly; they trade a direct, caring private check-in against a neutral group deadline."
    },

    /* ---- A4 (analytical, pair 4: group project) ---- */
    {
      "id": "A4",
      "type": "analytical",
      "pair": "group project",
      "title": "Choosing a dataset for a project",
      "scenario": "Your four-person group must analyze a dataset for a class project due in three weeks. Each person can put in about 5 hours a week, so the group has about 60 hours in total. You have narrowed the choice to two datasets on student housing. The grade depends mostly on the quality of the analysis and the presentation, and nobody in the group has much experience cleaning data.",
      "question": "Which dataset would you choose?",
      "askText": "Which of these two datasets should our group use?",
      "toolQuery": "Choose dataset (A/B): group project",
      "optionA": {
        "label": "Option A",
        "name": "Campus survey",
        "text": "A small, already-cleaned survey of students at your university."
      },
      "optionB": {
        "label": "Option B",
        "name": "City records",
        "text": "A large set of rental listings from city records that needs cleanup."
      },
      "attributes": [
        {
          "label": "Rows",
          "a": "2,000",
          "b": "50,000"
        },
        {
          "label": "Variables",
          "a": "12",
          "b": "40"
        },
        {
          "label": "Estimated cleaning time",
          "a": "3 hours",
          "b": "15 hours"
        },
        {
          "label": "Hours left for analysis and slides",
          "a": "57",
          "b": "45"
        },
        {
          "label": "Used by past groups",
          "a": "Often",
          "b": "Rarely"
        }
      ],
      "defaultSide": "B",
      "strength": 80,
      "replies": {
        "A": "Option A, the campus survey, leaves the most time for the graded work. With only about 3 hours of cleaning, the group keeps 57 of its 60 hours for analysis and the presentation, 12 more than Option B. That margin matters in a group without data-cleaning experience. Twelve variables are enough for a focused, well-explained analysis. Option A is the better dataset.",
        "B": "Option B, the city records, gives the analysis more to work with. Forty variables and 50,000 rows allow comparisons a 2,000-row survey cannot support, and a dataset past groups rarely used helps the project stand out. Even after 15 hours of cleaning, 45 hours remain, about 11 per person, which is enough for careful work. Option B is the better dataset."
      },
      "followUp": {
        "A": "Cleaning estimates for messy data usually run long, especially without experience. If 15 hours becomes 25, Option B leaves only 35 hours for the parts that are graded. Option A's estimate is far less likely to grow, since the data has already been cleaned.",
        "B": "A familiar dataset sets a high bar. Graders who have seen many projects on the same survey tend to compare them with each other, so a solid analysis can still look routine. Option B gives the group findings that are new, which makes a strong presentation easier to build."
      },
      "secondOpinion": {
        "A": "Looking at risk: three weeks and little data-cleaning experience make a smaller, clean dataset the safer plan. The graded work gets 12 more hours, and the group is less likely to be caught short near the deadline. Option A is the stronger choice.",
        "B": "Looking at what the grade rewards: the quality of the analysis depends on what the data can show. Forty variables and real rental listings support richer findings, and 45 hours is still a workable amount of time. Option B is the stronger choice.",
        "neutral": "Both datasets can support a good project. Option A's strength is time: 57 hours left for analysis and slides, with little risk. Option B's strength is depth: 40 variables and 50,000 rows for richer findings. It depends on the group's appetite for risk, and neither is clearly better."
      },
      "designNote": "Option A leaves 12 more hours for graded work with little risk; Option B offers far richer data at the cost of time and cleaning risk."
    }
    /* ITEMS_END */
  ]
};
