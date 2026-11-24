/* Assignment, item order, browser storage, sending data and CSV export.
   Every session is kept in this browser (localStorage). If config.js →
   dataCollection.endpoint is set, it is also sent to that address (a Google
   Apps Script web app that writes one row per session to a private Google
   Sheet; see apps-script/Code.gs). With no endpoint, nothing leaves the browser. */
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

  /* Returns true if saved. On failure, sets D.saveError so the app can show a warning.
     Every save bumps session.rev (unless opt.keepRev), so the newest copy can
     always be told apart, here and in the Google Sheet. If this browser already
     holds a newer copy (the same session moved on in another tab), nothing is
     overwritten and D.stale is set. */
  D.stale = false;
  D.save = function (session, opt) {
    if (!D.storageOK) { D.saveError = 'Browser storage is not available here.'; return false; }
    try {
      var all = D.loadAll();
      var stored = all[session.session_id];
      if (stored && (stored.rev || 0) > (session.rev || 0)) { D.stale = true; return true; }
      if (!(opt && opt.keepRev)) session.rev = (session.rev || 0) + 1;
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

  /* A session counts as "started" once the participant consented or reached an
     item; pages that were only opened are ignored. */
  function started(s) { return !!(s.consented || (s.items && Object.keys(s.items).length)); }

  /* Earlier started, non-review sessions in this browser that used the same pid. */
  D.priorSessionsForPid = function (pid) {
    if (!pid) return 0;
    return Object.values(D.loadAll()).filter(function (s) { return !s.is_review && s.pid === pid && started(s); }).length;
  };

  /* Earlier started, non-review sessions in this browser, whatever their pid
     (e.g. someone who came back after 12 hours and started again). */
  D.priorSessionsInBrowser = function (exceptId) {
    return Object.values(D.loadAll()).filter(function (s) { return !s.is_review && started(s) && s.session_id !== exceptId; }).length;
  };

  /* Participant sessions in this browser, newest first. */
  function participantSessions() {
    return Object.values(D.loadAll()).filter(function (s) { return !s.is_review && started(s); })
      .sort(function (a, b) { return String(b.started_at).localeCompare(String(a.started_at)); });
  }

  /* An unfinished session to pick up again after a reload or a closed tab:
     same pid if the link has one, otherwise the most recent one. Only sessions
     started in the last 12 hours count. */
  D.findResumable = function (pid) {
    var cutoff = Date.now() - 12 * 3600 * 1000;
    return participantSessions().filter(function (s) {
      return !s.completed && (pid ? s.pid === pid : true) && Date.parse(s.started_at) > cutoff;
    })[0] || null;
  };

  /* A finished session (same pid if given, otherwise any) — used to stop the
     same person from taking the study twice in this browser. */
  D.findCompleted = function (pid) {
    return participantSessions().filter(function (s) { return s.completed && (pid ? s.pid === pid : true); })[0] || null;
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

  D.pidFromParams = function (params) {
    var raw = String(params.get('pid') || '').trim();
    return /^\d{1,6}$/.test(raw) && Number(raw) > 0 ? Number(raw) : null;
  };

  /* Interface + order for this participant.
     ?pid=N           -> balanced schedule: odd pids Messaging, even pids Tool; orders cycle.
     no pid, serverPid -> the same schedule, with the next number handed out by the
                         data endpoint (one shared link, still balanced).
     neither          -> random.
     ?ui=chat|tool overrides the interface either way. */
  D.assign = function (params, options, serverPid) {
    var pid = D.pidFromParams(params);
    var rows = D.orderRows(options.itemOrder);
    var ui, row, method;
    if (pid || serverPid) {
      method = pid ? 'pid_schedule' : 'server_counter';
      pid = pid || serverPid;
      ui = (pid - 1) % 2 === 0 ? 'chat' : 'tool';
      row = Math.floor((pid - 1) / 2) % rows;
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
      defaults: D.defaultOptions(),        // config.js defaults when this session ran (for settings_changed)
      prior_sessions_in_browser: isReview ? null : D.priorSessionsInBrowser(),
      rev: 0,
      is_review: isReview ? 1 : 0,
      started_at: new Date().toISOString(),
      finished_at: null,
      completed: 0,
      consented: 0,
      withdrawn: 0,
      resumes: 0,
      device: typeof window !== 'undefined' && window.innerWidth ? {
        w: window.innerWidth, h: window.innerHeight,
        touch: !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
      } : null,
      items: {},
      end: {},
      scen: {}
    };
  };

  /* ------------------------------------------------------------------ */
  /* Sending data (only when config.js → dataCollection.endpoint is set)  */
  /* ------------------------------------------------------------------ */
  D.endpoint = function () { return String((C.dataCollection || {}).endpoint || '').trim(); };

  function payload(session) {
    return JSON.stringify({ action: 'save', session_id: session.session_id, rev: session.rev || 0,
      updated_at: new Date().toISOString(), data: session });
  }

  /* Sends the whole session. The endpoint keeps one row per session_id and
     replaces it only with a copy that has a higher rev, so sending again (or a
     stale copy from another tab) can never overwrite newer answers.
     Resolves to:
       'confirmed' the endpoint answered that it saved;
       'failed'    the endpoint answered with an error (not deployed for Anyone,
                   busy, quota…) or there is no connection at all;
       'sent'      the reply could not be read, so it was sent once more without
                   reading the reply: probably saved, but not confirmed;
       'off'       no endpoint set, or a reviewer session. */
  D.send = function (session) {
    var url = D.endpoint();
    if (!url || session.is_review || typeof fetch === 'undefined') return Promise.resolve('off');
    var body = payload(session);
    var headers = { 'Content-Type': 'text/plain;charset=utf-8' };   // a "simple" request: no CORS preflight
    var opts = { method: 'POST', body: body, headers: headers };
    if (body.length < 60000) opts.keepalive = true;
    return fetch(url, opts).then(function (r) {
      return r.text().then(function (t) {
        var j = null;
        try { j = JSON.parse(t); } catch (e) { /* an HTML error page */ }
        return j && j.ok ? 'confirmed' : 'failed';
      }, function () { return 'failed'; });
    }, function () {
      // No readable reply (offline, or the browser blocked reading it): send once more blind.
      return fetch(url, { method: 'POST', body: body, headers: headers, mode: 'no-cors' })
        .then(function () { return 'sent'; }, function () { return 'failed'; });
    });
  };

  /* Last-chance send when the page is being closed (cannot report back). */
  D.beacon = function (session) {
    var url = D.endpoint();
    if (!url || session.is_review || !navigator.sendBeacon) return false;
    try { return navigator.sendBeacon(url, new Blob([payload(session)], { type: 'text/plain;charset=utf-8' })); }
    catch (e) { return false; }
  };

  /* Asks the endpoint for the next participant number. Resolves to a number,
     or null if it is switched off or unreachable (the study then assigns at random). */
  D.requestPid = function (timeoutMs) {
    var url = D.endpoint();
    if (!url || !(C.dataCollection || {}).assignPid || typeof fetch === 'undefined') return Promise.resolve(null);
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, timeoutMs || 8000);
    return fetch(url + (url.indexOf('?') >= 0 ? '&' : '?') + 'action=assign', { signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { return r.json(); })
      .then(function (j) { clearTimeout(timer); return j && j.ok && Number(j.pid) > 0 ? Number(j.pid) : null; },
        function () { clearTimeout(timer); return null; });
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
  /* ONE data file: one row per participant per decision. Every column is
     defined once here, with its meaning, so the same list drives the CSV and
     the codebook (results dashboard → Download codebook). Only what the
     analysis or the exclusion rules need is exported; settings that never
     change during the study are not repeated on every row. */
  function blank(v) { return v == null ? '' : v; }
  function sec(ms) { return (ms === '' || ms == null) ? '' : +(ms / 1000).toFixed(1); }
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
  /* The explanation and second-opinion buttons are off in this study. Their
     columns appear when they are switched on, in config.js or for any exported
     session (e.g. through the address), so clicks are never silently dropped. */
  function explanationOn(sessions) {
    return (C.designOptions.followUp && C.designOptions.followUp['default'] === 'on') ||
      (sessions || []).some(function (s) { return s.options && s.options.followUp === 'on'; });
  }
  D.secondOpinionOn = function (sessions) {
    return (C.designOptions.secondOpinion && C.designOptions.secondOpinion['default'] !== 'off') ||
      (sessions || []).some(function (s) { return s.options && s.options.secondOpinion && s.options.secondOpinion !== 'off'; });
  };

  /* Options that differ from config.js defaults, e.g. "ui=tool (forced); delayMs=0".
     Blank for a normal participant; anything here means the link carried settings. */
  function settingsChanged(s, o) {
    var defs = s.defaults || D.defaultOptions(), out = [];
    Object.keys(defs).forEach(function (k) { if (o[k] !== undefined && o[k] !== defs[k]) out.push(k + '=' + o[k]); });
    if (/ui_param/.test(s.assignment_method || '')) out.unshift('ui=' + interfaceName(o.ui) + ' (forced)');
    return out.join('; ');
  }

  /* `sessions` decides the optional columns; pass {all: true} for the codebook. */
  function columnSpec(sessions, opt) {
    var all = opt && opt.all;
    var cols = [
      ['Participant', 'participant_id', 'Participant number: from the link (?pid=N) or handed out by the data endpoint; blank if neither.', 'whole number'],
      ['Participant', 'session_id', 'Random code for this run of the study; not linked to anyone.', 'text'],
      ['Participant', 'interface', 'Which interface this participant used.', 'messaging / tool'],
      ['Participant', 'session_completed', 'Reached the debrief screen.', '1 = yes, 0 = no'],
      ['Participant', 'withdrawn', 'Ticked "Please do not use my answers" on the debrief. Exclude.', '1 = yes, 0 = no'],
      ['Participant', 'is_reviewer_session', 'Ran in reviewer mode (?review=1). Exclude.', '1 = yes, 0 = no'],

      ['Decision', 'trial_number', 'Position among the real decisions; the practice item is 0.', '0 (practice), 1, 2, …'],
      ['Decision', 'is_practice', 'The practice item. Exclude from analysis.', '1 = yes, 0 = no'],
      ['Decision', 'item_id', 'Item code from config.js.', 'P1, E1–E4, A1–A4'],
      ['Decision', 'item_title', 'Short name of the decision.', 'text'],
      ['Decision', 'decision_type', 'Kind of decision.', 'emotional / analytical / practice'],
      ['Decision', 'topic_pair', 'Topic shared by a matched emotional and analytical item.', 'roommates / friends / job / group project'],
      ['Decision', 'option_a', 'Short name of Option A.', 'text'],
      ['Decision', 'option_b', 'Short name of Option B.', 'text'],

      ['Answers and advice', 'first_answer', 'Answer before seeing the AI. ' + SCALE() + '.', '0–' + C.slider.max],
      ['Answers and advice', 'first_choice', 'Which option the first answer leans toward.', 'A / B / none'],
      ['Answers and advice', 'ai_recommended', 'Option the AI recommended.', 'A / B'],
      ['Answers and advice', 'ai_position', 'Where the AI\'s advice sits on the answer scale (used for weight of advice).', '0–' + C.slider.max],
      ['Answers and advice', 'final_answer', 'Answer after seeing the AI. Same scale as first_answer.', '0–' + C.slider.max],
      ['Answers and advice', 'final_choice', 'Which option the final answer leans toward.', 'A / B / none'],
      ['Answers and advice', 'moved_toward_ai', 'Scale points the answer moved toward the AI\'s option.', 'positive = toward the AI, negative = away, 0 = no change'],
      ['Answers and advice', 'weight_of_advice', 'Share of the distance to the AI\'s position that the participant moved, (final − first) / (ai_position − first), limited to 0–1 as is usual. Blank when first_answer equals ai_position.', '0 = ignored the advice … 1 = adopted it fully'],
      ['Answers and advice', 'weight_of_advice_uncapped', 'The same before limiting to 0–1: below 0 = moved away from the AI, above 1 = went past it.', 'any number'],
      ['Answers and advice', 'switched_to_ai', 'The final answer leans toward the AI\'s option and the first answer did not.', '1 = yes, 0 = no'],
      ['Answers and advice', 'final_slider_touched', 'The participant touched the final-answer slider before saving. 0 = saved the preset first answer without touching it.', '1 = yes, 0 = no']
    ];
    if (all || explanationOn(sessions)) cols.push(['Answers and advice', 'asked_explanation', 'Clicked "Get an explanation" (only when that button is switched on).', '1 = yes, 0 = no']);
    if (all || D.secondOpinionOn(sessions)) cols.push(['Answers and advice', 'asked_second_opinion', 'Clicked "Get a second opinion" (only when that button is switched on).', '1 = yes, 0 = no']);
    if (all || D.secondOpinionOn(sessions)) cols.push(['Answers and advice', 'second_opinion_content', 'What the second opinion said, relative to the AI\'s first recommendation. Blank if not clicked.', 'agreed / disagreed / neutral']);
    C.perItemRatings.questions.forEach(function (q) {
      cols.push(['Ratings of this decision', q.id, 'Asked right after the decision: "' + q.text + '"', '1 = ' + q.low + ' … ' + C.perItemRatings.points + ' = ' + q.high]);
    });
    C.scenarioRatings.questions.forEach(function (q) {
      cols.push(['Ratings of this decision', q.id, 'Asked at the end of the study: "' + q.text + '" Blank for the practice item.', '1 = ' + q.low + ' … ' + C.scenarioRatings.points + ' = ' + q.high]);
    });
    cols = cols.concat([
      ['Time (seconds)', 'sec_first_answer', 'From the decision appearing to saving the first answer (reading and deciding).', 'seconds'],
      ['Time (seconds)', 'sec_to_ask', 'From saving the first answer to pressing Ask. The buttons sit in different places, so compare only within an interface.', 'seconds'],
      ['Time (seconds)', 'sec_final_answer', 'From the AI\'s reply appearing to saving the final answer.', 'seconds'],
      ['Time (seconds)', 'sec_ratings', 'Time on the questions after the decision.', 'seconds'],
      ['Time (seconds)', 'sec_total', 'The whole decision, including its two ratings.', 'seconds']
    ]);
    C.endMeasures.blocks.forEach(function (b) {
      b.items.forEach(function (it) {
        var what = b.kind === 'pairs' ? '"' + it.left + '" vs "' + it.right + '"' : '"' + it.text + '"';
        var ends = b.kind === 'pairs' ? '1 = ' + it.left + ' … ' + C.endMeasures.points + ' = ' + it.right : '1 = ' + b.low + ' … ' + C.endMeasures.points + ' = ' + b.high;
        cols.push(['End-of-study ratings of the AI (same on every row of a session)', it.id, what, ends]);
      });
      cols.push(['End-of-study ratings of the AI (same on every row of a session)', b.id + '_mean', 'Mean of the ' + b.id.replace(/_/g, ' ') + ' items above.', '1–' + C.endMeasures.points]);
    });
    cols = cols.concat([
      ['Checks', 'item_finished', 'The participant finished this decision.', '1 = yes, 0 = no'],
      ['Checks', 'item_restarted', 'The page was reloaded or reopened during this decision, so it was started again (the participant may already have seen the AI\'s advice). Consider excluding.', 'count, 0 = no'],
      ['Checks', 'item_jumped_in_review', 'A reviewer jumped into this item, so earlier steps were filled in automatically. Exclude.', '1 = yes, 0 = no'],
      ['Checks', 'pid_prior_sessions', 'Earlier started sessions in this browser with the same pid. Above 0 means a possible repeat or typo.', 'count'],
      ['Checks', 'prior_sessions_in_browser', 'Earlier started sessions in this browser with any pid (e.g. someone who started again after 12 hours, possibly in the other interface). Above 0 = possible repeat participant.', 'count'],
      ['Checks', 'settings_changed', 'Settings that differed from config.js defaults for this participant (for example an interface forced in the link). Blank = normal.', 'text'],
      ['Checks', 'assignment_method', 'How interface and order were chosen. +ui_param = the interface was forced in the link.', 'pid_schedule / server_counter / random, optionally +ui_param'],
      ['Checks', 'order_row', 'Which item order (row of the Latin square) was used.', 'whole number'],
      ['Checks', 'screen_width', 'Browser window width in pixels when the study started.', 'pixels'],
      ['Checks', 'study_version', 'Version of the study (config.js → version). Rows from different versions should not be pooled without checking.', 'text'],
      ['Checks', 'started_at', 'When the session started.', 'date and time (ISO, UTC)'],
      ['Checks', 'finished_at', 'When the participant reached the debrief.', 'date and time (ISO, UTC)']
    ]);
    return cols.map(function (c) { return { group: c[0], name: c[1], desc: c[2], values: c[3] }; });
  }

  /* One row per item the participant reached. Keys match columnSpec(). */
  D.rows = function (s) {
    var ids = Object.keys(s.items).sort(function (a, b) { return s.items[a].seq_index - s.items[b].seq_index; });
    var end = {};
    C.endMeasures.blocks.forEach(function (b) {
      b.items.forEach(function (it) { end[it.id] = blank(s.end[it.id]); });
      end[b.id + '_mean'] = mean(b.items.map(function (it) { return s.end[it.id]; }));
    });
    return ids.map(function (id) {
      var r = s.items[id];
      var o = r.snapshot || Object.assign({ ui: s.ui }, s.options);
      var t = r.times || {};
      var item = itemById(id);
      var diff = function (a, b) { return (t[a] != null && t[b] != null) ? t[b] - t[a] : ''; };
      var first = r.first_answer, fin = r.final_answer, rec = r.rec_position;
      var hasFF = first != null && fin != null;
      var dir = (first != null && rec != null) ? Math.sign(rec - first) : 0;
      var woaRaw = (hasFF && rec != null && rec !== first) ? +((fin - first) / (rec - first)).toFixed(3) : '';
      var woa = woaRaw === '' ? '' : Math.max(0, Math.min(1, woaRaw));
      var recSide = r.rec_side;
      var variant = r.second_opinion_clicked && recSide ? D.secondVariant(recSide, o.secondOpinion) : '';

      var row = {
        participant_id: blank(s.pid), session_id: s.session_id, interface: interfaceName(o.ui),
        session_completed: s.completed ? 1 : 0, withdrawn: s.withdrawn ? 1 : 0, is_reviewer_session: s.is_review ? 1 : 0,
        trial_number: r.position, is_practice: r.is_practice ? 1 : 0, item_id: id, item_title: blank(item.title),
        decision_type: r.item_type, topic_pair: blank(item.pair),
        option_a: item.optionA ? item.optionA.name : '', option_b: item.optionB ? item.optionB.name : '',
        first_answer: blank(first), first_choice: lean(first), ai_recommended: blank(recSide), ai_position: blank(rec),
        final_answer: blank(fin), final_choice: lean(fin),
        moved_toward_ai: hasFF && dir !== 0 ? (fin - first) * dir : (hasFF ? 0 : ''),
        weight_of_advice: woa, weight_of_advice_uncapped: woaRaw,
        switched_to_ai: hasFF && recSide ? (lean(fin) === recSide && lean(first) !== recSide ? 1 : 0) : '',
        final_slider_touched: fin == null ? '' : (t.final_touch != null || r.final_moves > 0 ? 1 : 0),
        // Blank (not 0) when the button was switched off for this participant.
        asked_explanation: o.followUp === 'on' ? (r.followup_clicked ? 1 : 0) : '',
        asked_second_opinion: o.secondOpinion && o.secondOpinion !== 'off' ? (r.second_opinion_clicked ? 1 : 0) : '',
        second_opinion_content: !variant ? '' : variant === 'neutral' ? 'neutral' : variant === recSide ? 'agreed' : 'disagreed',
        sec_first_answer: sec(t.first_submit), sec_to_ask: sec(diff('first_submit', 'ask')),
        sec_final_answer: sec(diff('reply_shown', 'final_submit')), sec_ratings: sec(diff('final_submit', 'ratings_submit')),
        sec_total: sec(t.done),
        item_finished: r.done ? 1 : 0, item_restarted: r.restarted || 0, item_jumped_in_review: r.jumped ? 1 : 0,
        pid_prior_sessions: blank(s.pid_prior_sessions), prior_sessions_in_browser: blank(s.prior_sessions_in_browser),
        settings_changed: settingsChanged(s, o),
        assignment_method: blank(s.assignment_method), order_row: s.order_row,
        screen_width: s.device ? s.device.w : '', study_version: blank(s.study_version),
        started_at: s.started_at, finished_at: blank(s.finished_at)
      };
      C.perItemRatings.questions.forEach(function (q) { row[q.id] = blank(r.ratings[q.id]); });
      var sc = (s.scen && s.scen[id]) || {};
      C.scenarioRatings.questions.forEach(function (q) { row[q.id] = blank(sc[q.id]); });
      Object.keys(end).forEach(function (k) { row[k] = end[k]; });
      return row;
    });
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

  D.columns = function (sessions) { return columnSpec(sessions).map(function (c) { return c.name; }); };

  /* The data file. */
  D.toCSV = function (sessions) {
    var rows = [];
    sessions.forEach(function (s) { rows = rows.concat(D.rows(s)); });
    return csv(D.columns(sessions), rows);
  };

  /* The codebook: what every column means (optional columns included). */
  D.codebookCSV = function () {
    return csv(['section', 'column', 'meaning', 'values'], columnSpec(null, { all: true }).map(function (c) {
      return { section: c.group, column: c.name, meaning: c.desc, values: c.values };
    }));
  };

  /* Keeps one copy per session_id: the most advanced one (finished first, then
     the highest rev, then the most decisions). Withdrawn if any copy is. Used
     when the same session arrives twice, e.g. the Sheet row plus an emailed file. */
  D.dedupeSessions = function (list) {
    var best = {}, withdrawn = {};
    var score = function (s) { return [s.completed ? 1 : 0, s.rev || 0, Object.keys(s.items || {}).length]; };
    var better = function (a, b) {
      var x = score(a), y = score(b);
      for (var i = 0; i < x.length; i++) { if (x[i] !== y[i]) return x[i] > y[i]; }
      return false;
    };
    (list || []).forEach(function (s) {
      if (!s || !s.session_id) return;
      if (s.withdrawn) withdrawn[s.session_id] = 1;
      if (!best[s.session_id] || better(s, best[s.session_id])) best[s.session_id] = s;
    });
    return Object.keys(best).map(function (id) {
      var s = best[id];
      return withdrawn[id] && !s.withdrawn ? Object.assign({}, s, { withdrawn: 1 }) : s;
    });
  };

  /* Sessions from a Google Sheet export (CSV with a "json" column, one row per
     session) or from a downloaded .json file. Returns [] if it is neither. */
  D.sessionsFromText = function (text, parseCSV) {
    text = String(text || '').replace(/^﻿/, '').trim();
    if (!text) return [];
    if (text.charAt(0) === '{' || text.charAt(0) === '[') {
      try {
        var j = JSON.parse(text);
        var list = Array.isArray(j) ? j : [j];
        return list.map(function (x) { return x && x.data && x.session_id ? x.data : x; })
          .filter(function (s) { return s && s.session_id && s.items; });
      } catch (e) { return []; }
    }
    var rows = parseCSV(text);
    if (!rows.length || !('json' in rows[0])) return [];
    return rows.map(function (r) {
      try { var s = JSON.parse(r.json); return s && s.session_id && s.items ? s : null; } catch (e) { return null; }
    }).filter(Boolean);
  };

  /* Sessions to export: participants only, unless reviewer sessions are asked for. */
  D.exportList = function (includeReview) {
    return Object.values(D.loadAll()).filter(function (s) { return includeReview || !s.is_review; });
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
