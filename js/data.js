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
    if (adviceDirection === 'fixed' || firstAnswer == null || firstAnswer === 50) return item.defaultSide;
    return firstAnswer < 50 ? 'B' : 'A';
  };
  D.recPosition = function (side, item) {
    var s = Number(item.strength);
    return side === 'B' ? s : 100 - s;
  };
  D.secondVariant = function (recSide, mode) {
    if (mode === 'agree') return recSide;
    if (mode === 'disagree') return recSide === 'A' ? 'B' : 'A';
    return 'neutral';
  };

  /* ------------------------------------------------------------------ */
  /* CSV                                                                 */
  /* ------------------------------------------------------------------ */
  var TIME_KEYS = ['first_touch', 'first_submit', 'ask', 'reply_shown', 'followup_click', 'followup_shown',
    'second_click', 'second_shown', 'final_touch', 'final_submit', 'ratings_submit', 'done'];

  D.columns = function () {
    var cols = [
      'session_id', 'study_version', 'pid', 'pid_prior_sessions', 'assignment_method', 'is_review', 'session_completed',
      'started_at', 'finished_at', 'order_row', 'item_order_seen',
      'ui', 'tool_look', 'tool_query', 'chat_identity', 'chat_cues', 'advice_direction', 'lean_as_number', 'follow_up',
      'second_opinion_mode', 'second_opinion_source', 'optional_buttons', 'per_item_ratings', 'final_slider_start',
      'item_order', 'delay_ms',
      'item_id', 'item_type', 'is_practice', 'position', 'item_done', 'item_jumped_in_review',
      'default_side', 'first_answer', 'rec_side', 'rec_position', 'final_answer',
      'change', 'change_toward_rec', 'woa',
      'first_slider_moves', 'final_slider_moves',
      'followup_clicked', 'second_opinion_clicked', 'second_opinion_variant',
      'ms_step1_read_and_first_answer', 'ms_step2_first_answer_to_ask', 'ms_step3_wait',
      'ms_step4_reply_to_final_answer', 'ms_step5_item_ratings', 'ms_item_total',
      'ms_to_first_touch', 'ms_reply_to_final_touch', 'ms_reply_to_followup_click', 'ms_reply_to_second_opinion_click'
    ];
    TIME_KEYS.forEach(function (k) { cols.push('t_' + k); });
    C.perItemRatings.questions.forEach(function (q) { cols.push(q.id); });
    C.scenarioRatings.questions.forEach(function (q) { cols.push(q.id); });
    C.endMeasures.blocks.forEach(function (b) {
      b.items.forEach(function (it) { cols.push(it.id); });
      cols.push(b.id + '_mean');
    });
    return cols;
  };

  function blank(v) { return v == null ? '' : v; }

  /* One row per item the participant reached. */
  D.rows = function (s) {
    var ids = Object.keys(s.items).sort(function (a, b) { return s.items[a].seq_index - s.items[b].seq_index; });
    var endMeans = {};
    C.endMeasures.blocks.forEach(function (b) {
      var vals = b.items.map(function (it) { return s.end[it.id]; }).filter(function (v) { return v != null; });
      endMeans[b.id] = vals.length ? +(vals.reduce(function (x, y) { return x + y; }, 0) / vals.length).toFixed(3) : '';
    });

    return ids.map(function (id) {
      var r = s.items[id];
      var o = r.snapshot || Object.assign({ ui: s.ui }, s.options);
      var t = r.times || {};
      var item = C.items.filter(function (i) { return i.id === id; })[0] || {};
      var diff = function (a, b) { return (t[a] != null && t[b] != null) ? t[b] - t[a] : ''; };
      var first = r.first_answer, fin = r.final_answer, rec = r.rec_position;
      var hasFF = first != null && fin != null;
      var change = hasFF ? fin - first : '';
      var dir = (first != null && rec != null) ? Math.sign(rec - first) : 0;
      var woa = (hasFF && rec != null && rec !== first) ? +((fin - first) / (rec - first)).toFixed(3) : '';

      var row = {
        session_id: s.session_id, study_version: s.study_version, pid: blank(s.pid),
        pid_prior_sessions: blank(s.pid_prior_sessions),
        assignment_method: s.assignment_method, is_review: s.is_review, session_completed: s.completed,
        started_at: s.started_at, finished_at: blank(s.finished_at), order_row: s.order_row,
        item_order_seen: (s.order || []).join('|'),
        ui: o.ui, tool_look: o.toolLook, tool_query: o.toolQuery, chat_identity: o.chatIdentity, chat_cues: o.chatCues,
        advice_direction: o.adviceDirection, lean_as_number: o.leanAsNumber, follow_up: o.followUp,
        second_opinion_mode: o.secondOpinion, second_opinion_source: o.secondOpinionSource, optional_buttons: o.optionalButtons,
        per_item_ratings: o.perItemRatings, final_slider_start: o.finalSliderStart, item_order: o.itemOrder,
        delay_ms: o.delayMs,
        item_id: id, item_type: r.item_type, is_practice: r.is_practice, position: r.position,
        item_done: r.done, item_jumped_in_review: r.jumped,
        default_side: item.defaultSide, first_answer: blank(first), rec_side: blank(r.rec_side),
        rec_position: blank(rec), final_answer: blank(fin),
        change: change, change_toward_rec: hasFF && dir !== 0 ? (fin - first) * dir : '', woa: woa,
        first_slider_moves: r.first_moves, final_slider_moves: r.final_moves,
        followup_clicked: r.followup_clicked, second_opinion_clicked: r.second_opinion_clicked,
        second_opinion_variant: r.second_opinion_clicked && r.rec_side ? D.secondVariant(r.rec_side, o.secondOpinion) : '',
        ms_step1_read_and_first_answer: blank(t.first_submit),
        ms_step2_first_answer_to_ask: diff('first_submit', 'ask'),
        ms_step3_wait: diff('ask', 'reply_shown'),
        ms_step4_reply_to_final_answer: diff('reply_shown', 'final_submit'),
        ms_step5_item_ratings: diff('final_submit', 'ratings_submit'),
        ms_item_total: blank(t.done),
        ms_to_first_touch: blank(t.first_touch),
        ms_reply_to_final_touch: diff('reply_shown', 'final_touch'),
        ms_reply_to_followup_click: diff('reply_shown', 'followup_click'),
        ms_reply_to_second_opinion_click: diff('reply_shown', 'second_click')
      };
      TIME_KEYS.forEach(function (k) { row['t_' + k] = blank(t[k]); });
      C.perItemRatings.questions.forEach(function (q) { row[q.id] = blank(r.ratings[q.id]); });
      var sc = (s.scen && s.scen[id]) || {};
      C.scenarioRatings.questions.forEach(function (q) { row[q.id] = blank(sc[q.id]); });
      C.endMeasures.blocks.forEach(function (b) {
        b.items.forEach(function (it) { row[it.id] = blank(s.end[it.id]); });
        row[b.id + '_mean'] = endMeans[b.id];
      });
      return row;
    });
  };

  D.toCSV = function (sessions) {
    var cols = D.columns();
    var cell = function (v) {
      if (v == null) return '';
      var str = String(v);
      return /[",\r\n]/.test(str) ? '"' + str.replace(/"/g, '""') + '"' : str;
    };
    var lines = [cols.join(',')];
    sessions.forEach(function (s) {
      D.rows(s).forEach(function (row) { lines.push(cols.map(function (c) { return cell(row[c]); }).join(',')); });
    });
    return lines.join('\r\n') + '\r\n';
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
