/* Assignment, item order, browser storage and CSV export.
   Nothing here ever sends data anywhere: sessions are kept in this browser
   (localStorage) until you download them as CSV. */
(function () {
  'use strict';
  var C = window.STUDY_CONFIG;
  var STORE_KEY = 'haitrust.sessions.v1';
  var D = {};

  /* ------------------------------------------------------------------ */
  /* Storage                                                             */
  /* ------------------------------------------------------------------ */
  D.storageOK = (function () {
    try { localStorage.setItem('__haitrust_test', '1'); localStorage.removeItem('__haitrust_test'); return true; }
    catch (e) { return false; }
  })();

  D.loadAll = function () {
    if (!D.storageOK) return {};
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}') || {}; } catch (e) { return {}; }
  };

  /* Returns true if saved. On failure, sets D.saveError so the app can show a warning. */
  D.save = function (session) {
    if (!D.storageOK) { D.saveError = 'Browser storage is not available here.'; return false; }
    try {
      var all = D.loadAll();
      all[session.session_id] = session;
      localStorage.setItem(STORE_KEY, JSON.stringify(all));
      D.saveError = null;
      return true;
    } catch (e) {
      console.warn('Could not save to browser storage', e);
      D.saveError = String(e && e.message || e);
      return false;
    }
  };

  /* Earlier non-review sessions in this browser that used the same pid. */
  D.priorSessionsForPid = function (pid) {
    if (!pid) return 0;
    return Object.values(D.loadAll()).filter(function (s) { return !s.is_review && s.pid === pid; }).length;
  };

  D.clearAll = function () {
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
  };

  /* ------------------------------------------------------------------ */
  /* Design options                                                      */
  /* ------------------------------------------------------------------ */
  D.defaultOptions = function () {
    var o = {};
    Object.keys(C.designOptions).forEach(function (k) { o[k] = C.designOptions[k]['default']; });
    return o;
  };

  /* Returns a valid value for option `key`, or undefined if `raw` is not valid. */
  D.coerceOption = function (key, raw) {
    var def = C.designOptions[key];
    if (!def || raw == null || raw === '') return undefined;
    if (def.type === 'number') {
      var n = Number(raw);
      if (!isFinite(n)) return undefined;
      return Math.max(def.min == null ? 0 : def.min, Math.min(def.max == null ? 1e9 : def.max, Math.round(n)));
    }
    return Object.prototype.hasOwnProperty.call(def.choices, raw) ? raw : undefined;
  };

  D.applyOptions = function (base, source) {
    var o = Object.assign({}, base);
    if (!source) return o;
    Object.keys(C.designOptions).forEach(function (k) {
      var raw = typeof source.get === 'function' ? source.get(k) : source[k];
      var v = D.coerceOption(k, raw);
      if (v !== undefined) o[k] = v;
    });
    return o;
  };

  D.normalizeUI = function (v) {
    v = String(v || '').toLowerCase();
    if (['chat', 'messaging', 'message', 'msg'].indexOf(v) >= 0) return 'chat';
    if (['tool', 'spreadsheet', 'sheet'].indexOf(v) >= 0) return 'tool';
    return null;
  };

  /* ------------------------------------------------------------------ */
  /* Items and order                                                     */
  /* ------------------------------------------------------------------ */
  D.practiceItems = function () { return C.items.filter(function (i) { return i.type === 'practice'; }); };
  D.mainItems = function () { return C.items.filter(function (i) { return i.type !== 'practice'; }); };

  /* E1, A1, E2, A2, ... (any other types go at the end). */
  function interleaved() {
    var main = D.mainItems();
    var em = main.filter(function (i) { return i.type === 'emotional'; });
    var an = main.filter(function (i) { return i.type === 'analytical'; });
    var other = main.filter(function (i) { return i.type !== 'emotional' && i.type !== 'analytical'; });
    var out = [];
    for (var k = 0; k < Math.max(em.length, an.length); k++) {
      if (em[k]) out.push(em[k]);
      if (an[k]) out.push(an[k]);
    }
    return out.concat(other);
  }

  /* First row of a Williams (balanced Latin) square: 0, 1, n-1, 2, n-2, ... */
  function williamsRow(n) {
    var r = [0], lo = 1, hi = n - 1;
    for (var k = 1; k < n; k++) r.push(k % 2 ? lo++ : hi--);
    return r;
  }

  /* How many distinct orders a mode has (used to cycle pids through them).
     Latin: n rows when n is even; 2n (each row plus its reverse) when n is odd,
     which keeps "each item follows every other item equally often" true. */
  D.orderRows = function (mode) {
    var base = interleaved();
    if (mode === 'latin') return Math.max(1, base.length % 2 ? 2 * base.length : base.length);
    if (mode === 'blocked') {
      var em = base.filter(function (i) { return i.type === 'emotional'; }).length;
      var an = base.filter(function (i) { return i.type === 'analytical'; }).length;
      return 2 * Math.max(1, em, an);
    }
    return 1;
  };

  D.buildOrder = function (mode, row, seed) {
    var base = interleaved(), n = base.length;
    if (!n) return [];
    if (mode === 'latin') {
      var order = williamsRow(n).map(function (x) { return base[(x + (row % n)) % n]; });
      return (n % 2 && row >= n) ? order.reverse() : order;
    }
    if (mode === 'blocked') {
      var rot = function (arr, k) { return arr.map(function (_, i) { return arr[(i + k) % arr.length]; }); };
      var em = base.filter(function (i) { return i.type === 'emotional'; });
      var an = base.filter(function (i) { return i.type === 'analytical'; });
      var k = Math.floor(row / 2);
      var emFirst = row % 2 === 0;
      return (emFirst ? rot(em, k) : rot(an, k)).concat(emFirst ? rot(an, k) : rot(em, k));
    }
    return U.shuffle(base, U.rng(seed));
  };

  /* Interface + order for this participant.
     ?pid=N  -> balanced schedule: odd pids Messaging, even pids Tool; orders cycle.
     no pid  -> random.
     ?ui=chat|tool overrides the interface either way. */
  D.assign = function (params, options) {
    var raw = String(params.get('pid') || '').trim();
    var pid = /^\d{1,6}$/.test(raw) && Number(raw) > 0 ? Number(raw) : null;
    var rows = D.orderRows(options.itemOrder);
    var ui, row, method;
    if (pid) {
      ui = (pid - 1) % 2 === 0 ? 'chat' : 'tool';
      row = Math.floor((pid - 1) / 2) % rows;
      method = 'pid_schedule';
    } else {
      ui = U.randInt(2) === 0 ? 'chat' : 'tool';
      row = U.randInt(rows);
      method = 'random';
    }
    var forced = D.normalizeUI(params.get('ui'));
    if (forced) { ui = forced; method += '+ui_param'; }
    return { pid: pid, ui: ui, order_row: row, order_seed: pid || U.randInt(2147483647), assignment_method: method };
  };

  D.newSession = function (a, options, isReview) {
    return {
      session_id: U.rid(),
      study_version: C.version,
      pid: a.pid,
      pid_prior_sessions: isReview ? null : D.priorSessionsForPid(a.pid),
      assignment_method: a.assignment_method,
      ui: a.ui,
      order_row: a.order_row,
      order_seed: a.order_seed,
      order: D.buildOrder(options.itemOrder, a.order_row, a.order_seed).map(function (i) { return i.id; }),
      options: Object.assign({}, options),
      is_review: isReview ? 1 : 0,
      started_at: new Date().toISOString(),
      finished_at: null,
      completed: 0,
      consented: 0,
      items: {},
      end: {},
      scen: {}
    };
  };

  /* ------------------------------------------------------------------ */
  /* Advice logic (shared by both interfaces)                            */
  /* ------------------------------------------------------------------ */
  D.recSide = function (firstAnswer, item, adviceDirection) {
    var mid = C.slider.max / 2;
    if (adviceDirection === 'fixed' || firstAnswer == null || firstAnswer === mid) return item.defaultSide;
    return firstAnswer < mid ? 'B' : 'A';
  };
  D.recPosition = function (side, item) {
    var s = Number(item.strength);
    return side === 'B' ? s : C.slider.max - s;
  };
  D.secondVariant = function (recSide, mode) {
    if (mode === 'agree') return recSide;
    if (mode === 'disagree') return recSide === 'A' ? 'B' : 'A';
    return 'neutral';
  };

  /* ------------------------------------------------------------------ */
  /* CSV                                                                 */
  /* ------------------------------------------------------------------ */
  /* Every column is defined once here, with its meaning, so the same list
     drives the CSV files and the codebook (Download codebook). Columns are in
     the order an analysis needs them: who, which condition, which decision,
     the answers, then ratings, timing, and finally settings and raw times. */
  var TIME_KEYS = ['first_touch', 'first_submit', 'ask', 'reply_shown', 'followup_click', 'followup_shown',
    'second_click', 'second_shown', 'final_touch', 'final_submit', 'ratings_submit', 'done'];

  function blank(v) { return v == null ? '' : v; }
  function sec(ms) { return (ms === '' || ms == null) ? '' : +(ms / 1000).toFixed(2); }
  function mean(vals) {
    vals = vals.filter(function (v) { return v !== '' && v != null && !isNaN(v); });
    return vals.length ? +(vals.reduce(function (a, b) { return a + b; }, 0) / vals.length).toFixed(3) : '';
  }
  function interfaceName(ui) { return ui === 'chat' ? 'messaging' : ui === 'tool' ? 'tool' : blank(ui); }
  /* Which option an answer leans toward: A, B, or none (exactly the middle). */
  function lean(v) {
    if (v == null) return '';
    var mid = C.slider.max / 2;
    return v < mid ? 'A' : v > mid ? 'B' : 'none';
  }
  function itemById(id) { return C.items.filter(function (i) { return i.id === id; })[0] || {}; }
  var SCALE = function () { return '0 = Definitely Option A … ' + (C.slider.max / 2) + ' = No preference … ' + C.slider.max + ' = Definitely Option B'; };

  /* Trial-level columns: one row per participant per decision. */
  function trialColumns() {
    var cols = [
      ['Participant and condition', 'participant_id', 'The pid in the address (?pid=N); blank if none was given.', 'whole number'],
      ['Participant and condition', 'session_id', 'Random code for this run of the study; not linked to anyone.', 'text'],
      ['Participant and condition', 'interface', 'Which interface this participant used.', 'messaging / tool'],
      ['Participant and condition', 'session_completed', 'Reached the debrief screen.', '1 = yes, 0 = no'],
      ['Participant and condition', 'is_reviewer_session', 'Ran in reviewer mode (?review=1). Exclude these from analysis.', '1 = yes, 0 = no'],

      ['Decision', 'trial_number', 'Position in the sequence of real decisions; the practice item is 0.', '0 (practice), 1, 2, …'],
      ['Decision', 'is_practice', 'The practice item. Usually excluded from analysis.', '1 = yes, 0 = no'],
      ['Decision', 'item_id', 'Item code from config.js.', 'P1, E1–E4, A1–A4'],
      ['Decision', 'item_title', 'Short name of the decision.', 'text'],
      ['Decision', 'decision_type', 'Kind of decision.', 'emotional / analytical / practice'],
      ['Decision', 'topic_pair', 'Topic shared by a matched emotional and analytical item.', 'roommates / friends / job / group project'],
      ['Decision', 'option_a', 'Short name of Option A.', 'text'],
      ['Decision', 'option_b', 'Short name of Option B.', 'text'],

      ['Answers and advice', 'first_answer', 'Answer before seeing the AI. ' + SCALE() + '.', '0–' + C.slider.max],
      ['Answers and advice', 'first_choice', 'Which option the first answer leans toward.', 'A / B / none'],
      ['Answers and advice', 'ai_recommended', 'Option the AI recommended.', 'A / B'],
      ['Answers and advice', 'ai_recommended_name', 'Short name of the option the AI recommended.', 'text'],
      ['Answers and advice', 'ai_position', 'Where the AI\'s advice sits on the answer scale (used for weight of advice).', '0–' + C.slider.max],
      ['Answers and advice', 'final_answer', 'Answer after seeing the AI. Same scale as first_answer.', '0–' + C.slider.max],
      ['Answers and advice', 'final_choice', 'Which option the final answer leans toward.', 'A / B / none'],
      ['Answers and advice', 'answer_change', 'final_answer − first_answer.', 'negative = toward A, positive = toward B'],
      ['Answers and advice', 'moved_toward_ai', 'How many scale points the answer moved toward the AI\'s option.', 'positive = toward the AI, negative = away, 0 = no change'],
      ['Answers and advice', 'weight_of_advice', 'Share of the distance to the AI\'s position that the participant moved: (final − first) / (ai_position − first). Blank when first_answer equals ai_position.', '0 = ignored the advice, 1 = adopted it fully; can be below 0 or above 1'],
      ['Answers and advice', 'weight_of_advice_capped', 'weight_of_advice limited to the 0–1 range, as is usual in advice-taking studies.', '0–1'],
      ['Answers and advice', 'switched_to_ai', 'The final answer leans toward the AI\'s option and the first answer did not.', '1 = yes, 0 = no'],
      ['Answers and advice', 'asked_explanation', 'Clicked "Get an explanation".', '1 = yes, 0 = no'],
      ['Answers and advice', 'asked_second_opinion', 'Clicked "Get a second opinion".', '1 = yes, 0 = no'],
      ['Answers and advice', 'second_opinion_content', 'What the second opinion said, relative to the AI\'s first recommendation. Blank if not clicked.', 'agreed / disagreed / neutral']
    ];
    C.perItemRatings.questions.forEach(function (q) {
      cols.push(['Ratings after each decision', q.id, '"' + q.text + '"', '1 = ' + q.low + ' … ' + C.perItemRatings.points + ' = ' + q.high + '; blank for skipped']);
    });
    C.scenarioRatings.questions.forEach(function (q) {
      cols.push(['Ratings after each decision', q.id, 'Asked at the end of the study for this decision: "' + q.text + '" Blank for the practice item.', '1 = ' + q.low + ' … ' + C.scenarioRatings.points + ' = ' + q.high]);
    });
    cols = cols.concat([
      ['Time spent (seconds)', 'sec_reading_and_first_answer', 'From the decision appearing to saving the first answer.', 'seconds'],
      ['Time spent (seconds)', 'sec_first_answer_to_ask', 'From saving the first answer to pressing Ask / Run analysis. The buttons differ between interfaces, so compare only within an interface.', 'seconds'],
      ['Time spent (seconds)', 'sec_waiting_for_ai', 'The AI\'s delay as it actually ran.', 'seconds'],
      ['Time spent (seconds)', 'sec_reply_to_final_answer', 'From the AI\'s reply appearing to saving the final answer.', 'seconds'],
      ['Time spent (seconds)', 'sec_item_ratings', 'Time on the two questions after the decision.', 'seconds'],
      ['Time spent (seconds)', 'sec_item_total', 'Whole decision, start to finish.', 'seconds'],
      ['Time spent (seconds)', 'sec_to_first_touch', 'From the decision appearing to first touching the answer scale (a reading-time proxy).', 'seconds'],
      ['Time spent (seconds)', 'sec_reply_to_final_touch', 'From the AI\'s reply appearing to first touching the final answer scale.', 'seconds'],
      ['Time spent (seconds)', 'sec_reply_to_explanation_click', 'From the AI\'s reply to clicking "Get an explanation".', 'seconds'],
      ['Time spent (seconds)', 'sec_reply_to_second_opinion_click', 'From the AI\'s reply to clicking "Get a second opinion".', 'seconds']
    ]);
    endColumns().forEach(function (c) { cols.push(c); });
    cols = cols.concat([
      ['Data quality', 'item_finished', 'The participant finished this decision.', '1 = yes, 0 = no'],
      ['Data quality', 'item_jumped_in_review', 'A reviewer jumped into this item, so earlier steps were filled in automatically. Exclude.', '1 = yes, 0 = no'],
      ['Data quality', 'first_slider_moves', 'Times the first answer was changed before saving.', 'count'],
      ['Data quality', 'final_slider_moves', 'Times the final answer was changed before saving.', 'count'],
      ['Data quality', 'pid_prior_sessions', 'Earlier sessions in this browser with the same pid. Above 0 means a possible repeat or typo.', 'count'],
      ['Session details', 'started_at', 'When the session started.', 'date and time (ISO, UTC)'],
      ['Session details', 'finished_at', 'When the participant reached the debrief.', 'date and time (ISO, UTC)'],
      ['Session details', 'study_version', 'Version of the study software.', 'text'],
      ['Session details', 'assignment_method', 'How the interface and order were chosen. "+ui_param" means the interface was forced in the address.', 'pid_schedule / random, optionally +ui_param'],
      ['Session details', 'order_row', 'Which item order (row of the Latin square) was used.', 'whole number'],
      ['Session details', 'item_order_seen', 'The decisions in the order shown.', 'item ids separated by |']
    ]);
    [['toolLook', 'Tool version look'], ['chatIdentity', 'Messaging contact identity'], ['chatCues', 'Messaging social cues'],
     ['adviceDirection', 'Which side the AI recommends'], ['leanAsNumber', 'AI states its lean as a number'], ['followUp', 'Explanation button available'],
     ['secondOpinion', 'What the second opinion says'], ['secondOpinionSource', 'Who gives the second opinion'], ['optionalButtons', 'Where the optional buttons sit'],
     ['perItemRatings', 'Questions after each decision'], ['finalSliderStart', 'Where the final answer scale starts'], ['itemOrder', 'Item order scheme'],
     ['delayMs', 'AI reply delay (ms)']].forEach(function (x) {
      var def = C.designOptions[x[0]];
      cols.push(['Settings in force', 'setting_' + x[0].replace(/[A-Z]/g, function (m) { return '_' + m.toLowerCase(); }),
        x[1] + '. See config.js → designOptions.', def && def.choices ? Object.keys(def.choices).join(' / ') : 'number']);
    });
    TIME_KEYS.forEach(function (k) {
      cols.push(['Raw event times', 'raw_ms_' + k, 'Milliseconds from the decision appearing to the "' + k.replace(/_/g, ' ') + '" event. Blank if it did not happen.', 'milliseconds']);
    });
    return cols.map(function (c) { return { group: c[0], name: c[1], desc: c[2], values: c[3] }; });
  }

  /* End-of-study questions: every item and each block's mean. */
  function endColumns() {
    var cols = [];
    C.endMeasures.blocks.forEach(function (b) {
      b.items.forEach(function (it) {
        var what = b.kind === 'pairs' ? '"' + it.left + '" vs "' + it.right + '"' : '"' + it.text + '"';
        var ends = b.kind === 'pairs' ? '1 = ' + it.left + ' … ' + C.endMeasures.points + ' = ' + it.right : '1 = ' + b.low + ' … ' + C.endMeasures.points + ' = ' + b.high;
        cols.push(['End-of-study ratings of the AI (same on every row of a session)', it.id, what, ends]);
      });
      cols.push(['End-of-study ratings of the AI (same on every row of a session)', b.id + '_mean', 'Mean of the ' + b.id.replace(/_/g, ' ') + ' items above.', '1–' + C.endMeasures.points]);
    });
    return cols;
  }

  /* One row per item the participant reached. Keys match trialColumns(). */
  D.rows = function (s) {
    var ids = Object.keys(s.items).sort(function (a, b) { return s.items[a].seq_index - s.items[b].seq_index; });
    var end = endValues(s);
    return ids.map(function (id) {
      var r = s.items[id];
      var o = r.snapshot || Object.assign({ ui: s.ui }, s.options);
      var t = r.times || {};
      var item = itemById(id);
      var diff = function (a, b) { return (t[a] != null && t[b] != null) ? t[b] - t[a] : ''; };
      var first = r.first_answer, fin = r.final_answer, rec = r.rec_position;
      var hasFF = first != null && fin != null;
      var dir = (first != null && rec != null) ? Math.sign(rec - first) : 0;
      var woa = (hasFF && rec != null && rec !== first) ? +((fin - first) / (rec - first)).toFixed(3) : '';
      var recSide = r.rec_side;
      var variant = r.second_opinion_clicked && recSide ? D.secondVariant(recSide, o.secondOpinion) : '';

      var row = {
        participant_id: blank(s.pid), session_id: s.session_id, interface: interfaceName(o.ui),
        session_completed: s.completed ? 1 : 0, is_reviewer_session: s.is_review ? 1 : 0,
        trial_number: r.position, is_practice: r.is_practice ? 1 : 0, item_id: id, item_title: blank(item.title),
        decision_type: r.item_type, topic_pair: blank(item.pair),
        option_a: item.optionA ? item.optionA.name : '', option_b: item.optionB ? item.optionB.name : '',
        first_answer: blank(first), first_choice: lean(first),
        ai_recommended: blank(recSide), ai_recommended_name: recSide && item['option' + recSide] ? item['option' + recSide].name : '',
        ai_position: blank(rec), final_answer: blank(fin), final_choice: lean(fin),
        answer_change: hasFF ? fin - first : '',
        moved_toward_ai: hasFF && dir !== 0 ? (fin - first) * dir : (hasFF ? 0 : ''),
        weight_of_advice: woa,
        weight_of_advice_capped: woa === '' ? '' : Math.max(0, Math.min(1, woa)),
        switched_to_ai: hasFF && recSide ? (lean(fin) === recSide && lean(first) !== recSide ? 1 : 0) : '',
        asked_explanation: r.followup_clicked ? 1 : 0, asked_second_opinion: r.second_opinion_clicked ? 1 : 0,
        second_opinion_content: !variant ? '' : variant === 'neutral' ? 'neutral' : variant === recSide ? 'agreed' : 'disagreed',
        sec_reading_and_first_answer: sec(t.first_submit),
        sec_first_answer_to_ask: sec(diff('first_submit', 'ask')),
        sec_waiting_for_ai: sec(diff('ask', 'reply_shown')),
        sec_reply_to_final_answer: sec(diff('reply_shown', 'final_submit')),
        sec_item_ratings: sec(diff('final_submit', 'ratings_submit')),
        sec_item_total: sec(t.done),
        sec_to_first_touch: sec(t.first_touch),
        sec_reply_to_final_touch: sec(diff('reply_shown', 'final_touch')),
        sec_reply_to_explanation_click: sec(diff('reply_shown', 'followup_click')),
        sec_reply_to_second_opinion_click: sec(diff('reply_shown', 'second_click')),
        item_finished: r.done ? 1 : 0, item_jumped_in_review: r.jumped ? 1 : 0,
        first_slider_moves: r.first_moves, final_slider_moves: r.final_moves,
        pid_prior_sessions: blank(s.pid_prior_sessions),
        started_at: s.started_at, finished_at: blank(s.finished_at), study_version: s.study_version,
        assignment_method: s.assignment_method, order_row: s.order_row, item_order_seen: (s.order || []).join('|')
      };
      Object.keys(o).forEach(function (k) {
        if (k !== 'ui') row['setting_' + k.replace(/[A-Z]/g, function (m) { return '_' + m.toLowerCase(); })] = o[k];
      });
      TIME_KEYS.forEach(function (k) { row['raw_ms_' + k] = blank(t[k]); });
      C.perItemRatings.questions.forEach(function (q) { row[q.id] = blank(r.ratings[q.id]); });
      var sc = (s.scen && s.scen[id]) || {};
      C.scenarioRatings.questions.forEach(function (q) { row[q.id] = blank(sc[q.id]); });
      Object.keys(end).forEach(function (k) { row[k] = end[k]; });
      return row;
    });
  };

  function endValues(s) {
    var out = {};
    C.endMeasures.blocks.forEach(function (b) {
      b.items.forEach(function (it) { out[it.id] = blank(s.end[it.id]); });
      out[b.id + '_mean'] = mean(b.items.map(function (it) { return s.end[it.id]; }));
    });
    return out;
  }

  /* Participant-level summary: one row per session, practice excluded. */
  function summaryColumns() {
    var cols = [
      ['Participant and condition', 'participant_id', 'The pid in the address; blank if none was given.', 'whole number'],
      ['Participant and condition', 'session_id', 'Random code for this run of the study.', 'text'],
      ['Participant and condition', 'interface', 'Which interface this participant used.', 'messaging / tool'],
      ['Participant and condition', 'session_completed', 'Reached the debrief screen.', '1 = yes, 0 = no'],
      ['Participant and condition', 'is_reviewer_session', 'Ran in reviewer mode. Exclude.', '1 = yes, 0 = no'],
      ['Participant and condition', 'n_decisions', 'Real decisions finished (practice excluded).', 'count'],
      ['Participant and condition', 'minutes_total', 'From start to the debrief.', 'minutes']
    ];
    var types = [['all', 'all real decisions'], ['emotional', 'emotional decisions'], ['analytical', 'analytical decisions']];
    types.forEach(function (ty) {
      var g = 'Advice taking: ' + ty[1];
      cols.push([g, 'woa_' + ty[0], 'Mean weight_of_advice_capped over ' + ty[1] + '.', '0 = ignored the advice … 1 = adopted it fully']);
      cols.push([g, 'moved_toward_ai_' + ty[0], 'Mean moved_toward_ai over ' + ty[1] + '.', 'scale points']);
      cols.push([g, 'switched_to_ai_' + ty[0], 'Share of ' + ty[1] + ' where the answer switched to the AI\'s option.', '0–1']);
      C.perItemRatings.questions.forEach(function (q) {
        cols.push([g, q.id + '_' + ty[0], 'Mean of "' + q.text + '" over ' + ty[1] + '.', '1–' + C.perItemRatings.points]);
      });
      cols.push([g, 'second_opinions_' + ty[0], 'Number of ' + ty[1] + ' where a second opinion was requested.', 'count']);
    });
    C.scenarioRatings.questions.forEach(function (q) {
      cols.push(['Decision-type check', q.id + '_emotional', 'Mean end-of-study "' + q.text + '" for the emotional decisions.', '1 = ' + q.low + ' … ' + C.scenarioRatings.points + ' = ' + q.high]);
      cols.push(['Decision-type check', q.id + '_analytical', 'Same, for the analytical decisions. Should be clearly higher than for emotional ones.', '1 = ' + q.low + ' … ' + C.scenarioRatings.points + ' = ' + q.high]);
    });
    endColumns().forEach(function (c) { cols.push(c); });
    return cols.map(function (c) { return { group: c[0], name: c[1], desc: c[2], values: c[3] }; });
  }

  D.summaryRow = function (s) {
    var rows = D.rows(s).filter(function (r) { return !r.is_practice && r.item_finished; });
    var start = Date.parse(s.started_at), endT = s.finished_at ? Date.parse(s.finished_at) : NaN;
    var out = {
      participant_id: blank(s.pid), session_id: s.session_id, interface: interfaceName(s.ui),
      session_completed: s.completed ? 1 : 0, is_reviewer_session: s.is_review ? 1 : 0,
      n_decisions: rows.length, minutes_total: isNaN(endT) ? '' : +((endT - start) / 60000).toFixed(1)
    };
    ['all', 'emotional', 'analytical'].forEach(function (ty) {
      var sub = rows.filter(function (r) { return ty === 'all' || r.decision_type === ty; });
      var col = function (k) { return sub.map(function (r) { return r[k]; }); };
      out['woa_' + ty] = mean(col('weight_of_advice_capped'));
      out['moved_toward_ai_' + ty] = mean(col('moved_toward_ai'));
      out['switched_to_ai_' + ty] = mean(col('switched_to_ai'));
      C.perItemRatings.questions.forEach(function (q) { out[q.id + '_' + ty] = mean(col(q.id)); });
      out['second_opinions_' + ty] = sub.filter(function (r) { return r.asked_second_opinion === 1; }).length;
    });
    C.scenarioRatings.questions.forEach(function (q) {
      ['emotional', 'analytical'].forEach(function (ty) {
        out[q.id + '_' + ty] = mean(rows.filter(function (r) { return r.decision_type === ty; }).map(function (r) { return r[q.id]; }));
      });
    });
    var end = endValues(s);
    Object.keys(end).forEach(function (k) { out[k] = end[k]; });
    return out;
  };

  function csv(cols, rows) {
    var cell = function (v) {
      if (v == null) return '';
      var str = String(v);
      return /[",\r\n]/.test(str) ? '"' + str.replace(/"/g, '""') + '"' : str;
    };
    var lines = [cols.join(',')];
    rows.forEach(function (row) { lines.push(cols.map(function (c) { return cell(row[c]); }).join(',')); });
    return lines.join('\r\n') + '\r\n';
  }

  D.columns = function () { return trialColumns().map(function (c) { return c.name; }); };

  /* Trial-level file: one row per participant per decision. */
  D.toCSV = function (sessions) {
    var rows = [];
    sessions.forEach(function (s) { rows = rows.concat(D.rows(s)); });
    return csv(D.columns(), rows);
  };

  /* Participant-level file: one row per participant. */
  D.toSummaryCSV = function (sessions) {
    return csv(summaryColumns().map(function (c) { return c.name; }), sessions.map(D.summaryRow));
  };

  /* Codebook: what every column in both files means. */
  D.codebookCSV = function () {
    var rows = [];
    [['decisions file (one row per decision)', trialColumns()], ['participants file (one row per participant)', summaryColumns()]].forEach(function (f) {
      f[1].forEach(function (c) { rows.push({ file: f[0], section: c.group, column: c.name, meaning: c.desc, values: c.values }); });
    });
    return csv(['file', 'section', 'column', 'meaning', 'values'], rows);
  };

  D.download = function (filename, text) {
    var blob = new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  };

  D.fileStamp = function () {
    var d = new Date(), p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes());
  };

  window.Data = D;
})();
