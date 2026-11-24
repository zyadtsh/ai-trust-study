/* Results dashboard for the experiment leaders (results.html).
   Reads the sessions stored in this browser, the Google Sheet export (remote
   data), downloaded .json answer files, or decisions CSV files from lab
   laptops, and shows the study's main comparisons.
   Everything is computed per participant first (their mean over the decisions
   of one type), then averaged across participants, so each person counts once
   per cell. Error bars are 95% confidence intervals of those participant means.
   Descriptive only: run the mixed model from the analysis plan for inference. */
(function () {
  'use strict';
  var C = window.STUDY_CONFIG, D = window.Data;
  var esc = function (s) { return U.esc(s); };
  var R = {};

  var IFACES = [
    { key: 'messaging', label: 'Messaging', color: 'var(--messaging)' },
    { key: 'tool', label: 'Tool', color: 'var(--tool)' }
  ];
  var TYPES = [
    { key: 'emotional', label: 'Emotional' },
    { key: 'analytical', label: 'Analytical' }
  ];
  var dataHasSecond = false;   // set from the loaded rows in R.render
  var SECOND = function () { return D.secondOpinionOn() || dataHasSecond; };   // second-opinion button on in config.js or in the data
  var trustQ = (C.perItemRatings.questions[0] || {}).id;          // per-decision trust question
  var scenQ = (C.scenarioRatings.questions[0] || {}).id;          // end-of-study decision-type rating

  /* ------------------------------------------------------------------ */
  /* Small statistics                                                    */
  /* ------------------------------------------------------------------ */
  var T95 = [12.71, 4.30, 3.18, 2.78, 2.57, 2.45, 2.36, 2.31, 2.26, 2.23, 2.20, 2.18, 2.16, 2.14, 2.13,
    2.12, 2.11, 2.10, 2.09, 2.09, 2.08, 2.07, 2.07, 2.06, 2.06, 2.06, 2.05, 2.05, 2.05, 2.04];
  function tcrit(df) { return df < 1 ? NaN : df <= 30 ? T95.at(df - 1) : df <= 60 ? 2.00 : df <= 120 ? 1.98 : 1.96; }
  function nums(a) { return a.filter(function (v) { return typeof v === 'number' && !isNaN(v); }); }
  function mean(a) { a = nums(a); return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : null; }
  function median(a) { a = nums(a).sort(function (x, y) { return x - y; }); if (!a.length) return null; var m = Math.floor(a.length / 2); return a.length % 2 ? a.at(m) : (a.at(m - 1) + a.at(m)) / 2; }
  R.summary = function (a) {
    a = nums(a);
    var n = a.length, m = mean(a);
    if (n < 2) return { n: n, mean: m, lo: null, hi: null };
    var sd = Math.sqrt(a.reduce(function (s, v) { return s + (v - m) * (v - m); }, 0) / (n - 1));
    var half = tcrit(n - 1) * sd / Math.sqrt(n);
    return { n: n, mean: m, lo: m - half, hi: m + half };
  };

  /* ------------------------------------------------------------------ */
  /* Data in                                                             */
  /* ------------------------------------------------------------------ */
  var NUMERIC = /^-?\d+(\.\d+)?$/;
  function clean(row) {
    var out = {};
    Object.keys(row).forEach(function (k) {
      var v = row[k];
      if (v === '' || v == null) out[k] = null;
      else if (typeof v === 'string' && NUMERIC.test(v)) out[k] = Number(v);
      else out[k] = v;
    });
    return out;
  }

  /* Decision rows from the sessions saved in this browser. */
  R.rowsFromBrowser = function () {
    var rows = [];
    Object.values(D.loadAll()).forEach(function (s) { rows = rows.concat(D.rows(s).map(clean)); });
    return rows;
  };

  /* Minimal CSV parser (quotes, commas and line breaks inside quotes). */
  R.parseCSV = function (text) {
    text = String(text).replace(/^﻿/, '');
    var rows = [], row = [], cell = '', q = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      if (q) {
        if (ch === '"') { if (text.charAt(i + 1) === '"') { cell += '"'; i++; } else q = false; }
        else cell += ch;
      } else if (ch === '"') q = true;
      else if (ch === ',') { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text.charAt(i + 1) === '\n') i++;
        row.push(cell); rows.push(row); row = []; cell = '';
      } else cell += ch;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    rows = rows.filter(function (r) { return r.length > 1 || r.at(0) !== ''; });
    if (!rows.length) return [];
    var head = rows.at(0);
    return rows.slice(1).map(function (r) {
      var o = {};
      head.forEach(function (h, j) { o[h] = r.at(j) == null ? '' : r.at(j); });
      return clean(o);
    });
  };

  /* Decision rows from any supported file: the Google Sheet export (one
     session per row, in a "json" column), a downloaded answers .json, or a
     data CSV exported from the study. */
  R.rowsFromText = function (text) {
    var sessions = D.sessionsFromText(text, R.parseCSV);
    if (sessions.length) {
      var rows = [];
      sessions.forEach(function (s) { rows = rows.concat(D.rows(s).map(clean)); });
      return rows;
    }
    return R.parseCSV(text);
  };

  /* ------------------------------------------------------------------ */
  /* From decision rows to participants                                  */
  /* ------------------------------------------------------------------ */
  R.build = function (rows, opts) {
    opts = opts || {};
    var seen = {}, sessions = {};
    rows.forEach(function (r) {
      var key = r.session_id + '|' + r.item_id;
      if (seen[key]) return;                                       // same session in two files
      seen[key] = true;
      (sessions[r.session_id] = sessions[r.session_id] || []).push(r);
    });

    var all = Object.keys(sessions).map(function (id) {
      var rs = sessions[id], f = rs.at(0);
      var start = Date.parse(f.started_at), end = f.finished_at ? Date.parse(f.finished_at) : NaN;
      var p = {
        session_id: id, pid: f.participant_id, iface: f.interface,
        completed: f.session_completed === 1, review: f.is_reviewer_session === 1, withdrawn: f.withdrawn === 1,
        minutes: isNaN(end) ? null : (end - start) / 60000,
        started_at: f.started_at, end: {}, types: {}, rows: rs
      };
      C.endMeasures.blocks.forEach(function (b) { p.end[b.id] = f[b.id + '_mean']; });
      var real = rs.filter(function (r) { return r.is_practice !== 1 && r.item_finished === 1 && r.item_jumped_in_review !== 1; });
      p.decisions = real.length;
      TYPES.forEach(function (ty) {
        var sub = real.filter(function (r) { return r.decision_type === ty.key; });
        var col = function (k) { return sub.map(function (r) { return r[k]; }); };
        p.types[ty.key] = {
          woa: mean(col('weight_of_advice')),
          trust: mean(col(trustQ)),
          switched: mean(col('switched_to_ai')),
          second: mean(col('asked_second_opinion')),
          scen: mean(col(scenQ))
        };
      });
      return p;
    });

    var included = all.filter(function (p) {
      return !p.withdrawn && (opts.includeReview || !p.review) && (opts.includeIncomplete || p.completed) &&
        (p.iface === 'messaging' || p.iface === 'tool') && p.decisions > 0;
    });
    var pidCount = {};
    all.forEach(function (p) { if (p.pid != null && !p.review) pidCount[p.pid] = (pidCount[p.pid] || 0) + 1; });
    return { all: all, people: included, pidCount: pidCount };
  };

  /* ------------------------------------------------------------------ */
  /* Charts (SVG strings, so the page can also be rendered for checking)  */
  /* ------------------------------------------------------------------ */
  function fmt(v, kind) {
    if (v == null || isNaN(v)) return '–';
    if (kind === 'pct') return Math.round(v * 100) + '%';
    if (kind === 'woa') return v.toFixed(2);
    return v.toFixed(1);
  }
  function ciText(s, kind) {
    if (s.lo == null) return 'mean ' + fmt(s.mean, kind) + ', n = ' + s.n;
    return 'mean ' + fmt(s.mean, kind) + ' (95% CI ' + fmt(s.lo, kind) + ' to ' + fmt(s.hi, kind) + '), n = ' + s.n;
  }

  /* Interaction plot: decision type on x, one line per interface, mean ± 95% CI. */
  function interactionChart(people, m) {
    var W = 320, H = 220, L = 44, Rm = 86, Tm = 12, B = 32;
    var pw = W - L - Rm, ph = H - Tm - B;
    var y = function (v) { return Tm + ph - (Math.max(m.min, Math.min(m.max, v)) - m.min) / (m.max - m.min) * ph; };
    var gx = [L + pw * 0.22, L + pw * 0.78];
    var off = { messaging: -7, tool: 7 };
    var cells = {};
    IFACES.forEach(function (f) {
      cells[f.key] = TYPES.map(function (ty) {
        return R.summary(people.filter(function (p) { return p.iface === f.key; }).map(function (p) { return p.types[ty.key][m.key]; }));
      });
    });
    var h = '<svg class="ix" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(m.title) + ' by interface and decision type">';
    m.ticks.forEach(function (t) {
      h += '<line x1="' + L + '" x2="' + (L + pw) + '" y1="' + y(t) + '" y2="' + y(t) + '" stroke="var(--grid)" stroke-width="1"/>' +
        '<text x="' + (L - 8) + '" y="' + (y(t) + 4) + '" text-anchor="end" font-size="11" fill="var(--muted)">' + esc(fmt(t, m.kind)) + '</text>';
    });
    h += '<line x1="' + L + '" x2="' + (L + pw) + '" y1="' + (Tm + ph) + '" y2="' + (Tm + ph) + '" stroke="var(--axis)" stroke-width="1"/>';
    TYPES.forEach(function (ty, i) {
      h += '<text x="' + gx.at(i) + '" y="' + (H - 10) + '" text-anchor="middle" font-size="12" fill="var(--ink-2)">' + esc(ty.label) + '</text>';
    });
    IFACES.forEach(function (f) {
      var c = cells[f.key], o = off[f.key];
      var a = c.at(0), b = c.at(1);
      if (a.mean != null && b.mean != null) {
        h += '<line x1="' + (gx.at(0) + o) + '" y1="' + y(a.mean) + '" x2="' + (gx.at(1) + o) + '" y2="' + y(b.mean) + '" stroke="' + f.color + '" stroke-width="2" stroke-linecap="round"/>';
      }
      c.forEach(function (s, i) {
        if (s.mean == null) return;
        var x = gx.at(i) + o;
        if (s.lo != null) h += '<line x1="' + x + '" x2="' + x + '" y1="' + y(s.lo) + '" y2="' + y(s.hi) + '" stroke="' + f.color + '" stroke-width="1.5" stroke-linecap="round"/>';
        h += '<circle cx="' + x + '" cy="' + y(s.mean) + '" r="5" fill="' + f.color + '" stroke="var(--surface)" stroke-width="2"/>' +
          '<circle cx="' + x + '" cy="' + y(s.mean) + '" r="13" fill="transparent" data-tip="' +
          esc('<b>' + f.label + ' · ' + TYPES.at(i).label + '</b><br>' + m.title + ': ' + ciText(s, m.kind)) + '"/>';
      });
    });
    /* Direct labels at the right end of each line, pushed apart if they would touch. */
    var ends = IFACES.map(function (f) {
      var c = cells[f.key], last = c.at(1).mean != null ? c.at(1) : c.at(0);
      return { f: f, y: last.mean == null ? null : y(last.mean) };
    }).filter(function (e) { return e.y != null; });
    if (ends.length === 2 && Math.abs(ends.at(0).y - ends.at(1).y) < 14) {
      var midY = (ends.at(0).y + ends.at(1).y) / 2, up = ends.at(0).y <= ends.at(1).y ? 0 : 1;
      ends.at(up).y = midY - 7;
      ends.at(1 - up).y = midY + 7;
    }
    ends.forEach(function (e) {
      h += '<text x="' + (gx.at(1) + 22) + '" y="' + (e.y + 4) + '" font-size="12" fill="var(--ink-2)">' + esc(e.f.label) + '</text>';
    });
    h += '</svg>';
    var diff = TYPES.map(function (ty, i) {
      var a = cells.messaging.at(i).mean, b = cells.tool.at(i).mean;
      if (a == null || b == null) return null;
      var d = a - b, shown = fmt(Math.abs(d), m.kind);
      var s = /^0(\.0+)?%?$/.test(shown) ? '±' : d > 0 ? '+' : '−';
      return ty.label.toLowerCase() + ' ' + s + shown;
    }).filter(Boolean);
    var table = '<details><summary>Show numbers</summary><table class="t small"><tr><th>Interface</th>' +
      TYPES.map(function (ty) { return '<th>' + esc(ty.label) + '</th>'; }).join('') + '</tr>' +
      IFACES.map(function (f) {
        return '<tr><td>' + esc(f.label) + '</td>' + cells[f.key].map(function (s) { return '<td>' + esc(ciText(s, m.kind)) + '</td>'; }).join('') + '</tr>';
      }).join('') + '</table></details>';
    return '<div class="card"><h3>' + esc(m.title) + '</h3><div class="sub">' + esc(m.sub) + '</div>' + h +
      '<p class="read">' + (diff.length ? 'Messaging minus Tool: ' + esc(diff.join(', ')) + '.' : 'Not enough data yet.') + '</p>' + table + '</div>';
  }

  /* Horizontal dot plot on a 1–7 scale: one row per measure, a dot per group. */
  function dotRows(rowsSpec, groups, opts) {
    var W = 520, L = 132, Rm = 24, rowH = opts.rowH || 40, Tm = 10, B = 34;
    var H = Tm + rowsSpec.length * rowH + B, pw = W - L - Rm;
    var x = function (v) { return L + (Math.max(1, Math.min(7, v)) - 1) / 6 * pw; };
    var h = '<svg class="dots" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opts.title) + '">';
    [1, 2, 3, 4, 5, 6, 7].forEach(function (t) {
      h += '<line x1="' + x(t) + '" x2="' + x(t) + '" y1="' + Tm + '" y2="' + (H - B) + '" stroke="var(--grid)"/>' +
        '<text x="' + x(t) + '" y="' + (H - B + 16) + '" text-anchor="middle" font-size="11" fill="var(--muted)">' + t + '</text>';
    });
    if (opts.lowLabel) h += '<text x="' + x(1) + '" y="' + (H - 4) + '" font-size="11.5" fill="var(--ink-2)">' + esc(opts.lowLabel) + '</text>';
    if (opts.highLabel) h += '<text x="' + x(7) + '" y="' + (H - 4) + '" text-anchor="end" font-size="11.5" fill="var(--ink-2)">' + esc(opts.highLabel) + '</text>';
    var table = [];
    rowsSpec.forEach(function (r, i) {
      var cy = Tm + i * rowH + rowH / 2;
      h += '<text x="' + (L - 12) + '" y="' + (cy + 4) + '" text-anchor="end" font-size="12.5" fill="var(--ink)">' + esc(r.label) + '</text>';
      groups.forEach(function (g, j) {
        var vals = nums(r.values(g)), s = R.summary(vals);
        var yy = cy + (groups.length > 1 ? (j === 0 ? -6 : 6) : 0);
        table.push([r.label, g.label, s]);
        if (opts.points) {
          vals.forEach(function (v, k) {
            var jit = ((k * 37) % 11 - 5) * 1.2;
            h += '<circle cx="' + x(v) + '" cy="' + (yy + jit) + '" r="2.5" fill="' + g.color + '" fill-opacity="0.3"/>';
          });
        }
        if (s.mean == null) return;
        if (s.lo != null) h += '<line x1="' + x(s.lo) + '" x2="' + x(s.hi) + '" y1="' + yy + '" y2="' + yy + '" stroke="' + g.color + '" stroke-width="1.5" stroke-linecap="round"/>';
        h += '<circle cx="' + x(s.mean) + '" cy="' + yy + '" r="5" fill="' + g.color + '" stroke="var(--surface)" stroke-width="2"/>' +
          '<circle cx="' + x(s.mean) + '" cy="' + yy + '" r="12" fill="transparent" data-tip="' + esc('<b>' + r.label + (groups.length > 1 || g.label ? ' · ' + g.label : '') + '</b><br>' + ciText(s)) + '"/>';
      });
    });
    h += '</svg>';
    var tbl = '<details><summary>Show numbers</summary><table class="t small"><tr><th>Measure</th><th>Group</th><th>Result</th></tr>' +
      table.map(function (t) { return '<tr><td>' + esc(t.at(0)) + '</td><td>' + esc(t.at(1)) + '</td><td>' + esc(ciText(t.at(2))) + '</td></tr>'; }).join('') + '</table></details>';
    return h + tbl;
  }

  function legend() {
    return '<div class="legend">' + IFACES.map(function (f) {
      return '<span><span class="sw" style="background:' + f.color + '"></span>' + esc(f.label) + '</span>';
    }).join('') + '<span class="muted">Dots are means; bars are 95% confidence intervals. Hover a dot for numbers.</span></div>';
  }

  /* ------------------------------------------------------------------ */
  /* Page                                                                */
  /* ------------------------------------------------------------------ */
  R.render = function (rows, opts) {
    dataHasSecond = rows.some(function (r) { return r.asked_second_opinion != null; });
    var b = R.build(rows, opts), people = b.people;
    var byIf = function (k) { return people.filter(function (p) { return p.iface === k; }); };
    var excluded = b.all.length - people.length;
    var h = '';

    if (!b.all.length) {
      return h + '<div class="notice">No study data here yet. For remote data, download the “sessions” tab of your Google Sheet as CSV and load it with Load data files. Sessions taken in this browser also appear here.</div>';
    }

    /* Sample */
    h += '<h2>Sample</h2><p class="lead">Who is included in the charts below. Reviewer sessions and incomplete sessions are left out unless switched on above.</p>';
    h += '<div class="tiles">' +
      tile('Participants included', people.length, b.all.length + ' sessions stored or loaded') +
      tile('<span class="sw" style="background:var(--messaging)"></span>Messaging', byIf('messaging').length, 'participants') +
      tile('<span class="sw" style="background:var(--tool)"></span>Tool', byIf('tool').length, 'participants') +
      tile('Median session length', fmtMin(median(people.map(function (p) { return p.minutes; }))), 'minutes, start to debrief') +
      tile('Left out', excluded, 'reviewer, incomplete or empty sessions') +
    '</div>';
    if (people.length && Math.abs(byIf('messaging').length - byIf('tool').length) > Math.max(2, people.length * 0.15)) {
      h += '<div class="notice">The two interfaces are unbalanced. Check that participant numbers are being used in order (odd = Messaging, even = Tool).</div>';
    }

    if (!people.length) return h + '<div class="notice">No sessions match the current filters.</div>';

    /* Main results */
    h += '<h2>Main results: does the interface change trust?</h2><p class="lead">Each line is one interface. If the lines are parallel, the interface has the same effect on both decision types; if they cross or diverge, the effect depends on the decision type (the interaction).</p>' + legend();
    h += '<div class="grid2">' +
      interactionChart(people, { key: 'woa', title: 'Weight of advice', sub: 'Share of the way moved toward the AI (0 = ignored, 1 = adopted)', min: 0, max: 1, ticks: [0, 0.25, 0.5, 0.75, 1], kind: 'woa' }) +
      interactionChart(people, { key: 'trust', title: 'Trust in the recommendation', sub: 'Rating after each decision (1 = not at all, 7 = completely)', min: 1, max: 7, ticks: [1, 2, 3, 4, 5, 6, 7], kind: 'num' }) +
      interactionChart(people, { key: 'switched', title: 'Switched to the AI’s option', sub: 'Share of decisions where the answer crossed to the AI’s side', min: 0, max: 1, ticks: [0, 0.25, 0.5, 0.75, 1], kind: 'pct' }) +
      (SECOND() ? interactionChart(people, { key: 'second', title: 'Asked for a second opinion', sub: 'Share of decisions with a second-opinion request', min: 0, max: 1, ticks: [0, 0.25, 0.5, 0.75, 1], kind: 'pct' }) : '') +
    '</div>';

    /* Manipulation checks */
    var human = C.endMeasures.blocks.filter(function (x) { return x.id === 'humanlike'; })[0];
    h += '<h2>Manipulation checks: did the conditions work?</h2><p class="lead">The Messaging interface should be rated more humanlike than the Tool, and emotional decisions should be rated more emotional than analytical ones. If either fails, the main results are hard to interpret.</p>';
    h += '<div class="grid2">';
    if (human) {
      h += '<div class="card"><h3>Humanlikeness of the AI, by interface</h3><div class="sub">Mean of the ' + human.items.length + ' word pairs at the end of the study; small dots are individual participants</div>' +
        dotRows([{ label: 'Humanlikeness', values: function (g) { return byIf(g.key).map(function (p) { return p.end.humanlike; }); } }],
          IFACES, { title: 'Humanlikeness by interface', lowLabel: 'Machinelike', highLabel: 'Humanlike', points: true, rowH: 56 }) +
        verdict(byIf('messaging').map(function (p) { return p.end.humanlike; }), byIf('tool').map(function (p) { return p.end.humanlike; }), 'Messaging was rated', 'more humanlike than the Tool', 'less humanlike than the Tool: the interface manipulation may not be working') +
      '</div>';
    }
    var neutral = [{ key: 'all', label: '', color: 'var(--neutral)' }];
    h += '<div class="card"><h3>How the decisions felt, by decision type</h3><div class="sub">Rated once per decision at the end of the study</div>' +
      dotRows(TYPES.map(function (ty) {
        return { label: ty.label + ' items', values: function () { return people.map(function (p) { return p.types[ty.key].scen; }); } };
      }), neutral, { title: 'Decision type rating', lowLabel: 'Emotional', highLabel: 'Analytical', rowH: 40 }) +
      verdict(people.map(function (p) { return p.types.analytical.scen; }), people.map(function (p) { return p.types.emotional.scen; }), 'Analytical items were rated', 'more analytical than emotional items', 'no more analytical than emotional items: check the items') +
    '</div></div>';

    /* End-of-study ratings */
    h += '<h2>Ratings of the AI at the end of the study</h2><p class="lead">Each participant’s mean for each scale, compared between interfaces.</p>' + legend();
    h += '<div class="card" style="margin-top:10px">' + dotRows(C.endMeasures.blocks.map(function (blk) {
      var names = { trust: 'Trust', competence: 'Competence', warmth: 'Warmth', humanlike: 'Humanlikeness' };
      return { label: names[blk.id] || blk.id.replace(/_/g, ' '), values: function (g) { return byIf(g.key).map(function (p) { return p.end[blk.id]; }); } };
    }), IFACES, { title: 'End-of-study ratings by interface', lowLabel: 'Low (1)', highLabel: 'High (7)', rowH: 44 }) + '</div>';

    /* Items */
    h += '<h2>Items: pilot checks</h2><p class="lead">Each item should be a toss-up (first answers spread around the middle), feel like its type, and move people toward the AI in both interfaces. Flags mark items worth a second look.</p>';
    h += itemsTable(people, opts.open);

    /* Participants */
    h += '<h2>Participants</h2><p class="lead">Every session stored or loaded, including those left out of the charts.</p>';
    h += participantsTable(b, opts.open);
    h += methods(people);
    return h;
  };

  /* "How the numbers are calculated": every derived column and chart value,
     with a worked example taken from a real decision in the current data. */
  function methods(people) {
    var ex = null;
    people.some(function (p) {
      return p.rows.some(function (r) {
        if (r.is_practice !== 1 && r.weight_of_advice != null && r.moved_toward_ai > 0 && r.weight_of_advice < 1) { ex = r; return true; }
        return false;
      });
    });
    var max = C.slider.max, mid = max / 2, str = (D.mainItems()[0] || {}).strength;
    var rows = [
      ['first_choice / final_choice', 'Which option the answer leans toward: below ' + mid + ' = A, above ' + mid + ' = B, exactly ' + mid + ' = none.', ex ? R.explain.choice(ex.first_answer) : ''],
      ['ai_position', 'Where the advice sits on the 0\u2013' + max + ' scale: the item\u2019s strength (' + str + ') if the AI picked B, or ' + max + ' \u2212 strength (' + (max - str) + ') if it picked A. The AI always picks the option the first answer did not lean toward.', ex ? R.explain.position(ex) : ''],
      ['moved_toward_ai', 'Scale points the answer moved toward the AI: final \u2212 first when the AI is above the first answer, first \u2212 final when it is below. Negative = moved away.', ex ? R.explain.moved(ex) : ''],
      ['weight_of_advice', 'Share of the gap to the AI that was closed: (final \u2212 first) \u00F7 (AI position \u2212 first), then limited to 0\u20131. Blank when the first answer already equals the AI\u2019s position.', ex ? R.explain.woa(ex) : ''],
      ['switched_to_ai', 'Yes when the final answer leans toward the AI\u2019s option and the first answer did not.', ex ? R.explain.switched(ex) : ''],
      SECOND() ? ['second_opinion_content', 'Compares the side the second opinion argued for with the AI\u2019s first pick: same side = agreed, other side = disagreed, neither = neutral.', ''] : null,
      ['End-of-study scale means', 'The mean of a scale\u2019s items for one person, e.g. trust_mean = (trust_1 + trust_2 + trust_3) \u00F7 3.', ''],
      ['Chart dots', 'First each participant\u2019s mean over their decisions of one type (4 emotional, 4 analytical), then the mean of those across the participants in each interface. Each person counts once per dot.', ''],
      ['Chart bars (95% CI)', 'Mean \u00B1 t \u00D7 SD \u00F7 \u221An, over the participant means in that dot. Bars that barely overlap suggest a real difference; the mixed model gives the actual test.', ''],
      ['Item flags', 'Not a toss-up: over half of first answers are in the outer tenth at either end (0\u2013' + (max * 0.1) + ' or ' + (max * 0.9) + '\u2013' + max + '). Feels like the other type: mean rating above 4 for an emotional item, or below 4 for an analytical one. Nobody moves: mean weight of advice under 0.05.', ''],
      ['Participant flags', 'Withdrew: ticked “Please do not use my answers” on the debrief; always left out. Very fast: under 6 minutes from start to debrief. Repeated pid: the same pid in more than one participant session.', '']
    ];
    rows = rows.filter(Boolean);
    var exLine = ex
      ? 'Worked example from the current data: participant ' + (ex.participant_id == null ? '(no pid)' : ex.participant_id) + ', item ' + ex.item_id + ' (' + ex.item_title + '). First answer ' + ex.first_answer + ', AI picked ' + ex.ai_recommended + ' at ' + ex.ai_position + ', final answer ' + ex.final_answer + '.'
      : 'Load data or example data to see a worked example.';
    return '<h2 id="how">How the numbers are calculated</h2><p class="lead">' + esc(exLine) + ' The same explanations appear when you hover the underlined numbers in an expanded participant row.</p>' +
      '<div class="scroll"><table class="t"><tr><th>Column or chart</th><th>How it is calculated</th><th>In the worked example</th></tr>' +
      rows.map(function (r) { return '<tr><td>' + (/\s/.test(r[0].replace(' / ', '')) ? '<b>' + esc(r[0]) + '</b>' : '<code>' + esc(r[0]) + '</code>') + '</td><td>' + esc(r[1]) + '</td><td>' + esc(r[2]) + '</td></tr>'; }).join('') +
      '</table></div>';
  }

  function tile(k, v, s) {
    return '<div class="tile"><div class="k">' + k + '</div><div class="v">' + esc(v) + '</div><div class="s">' + esc(s) + '</div></div>';
  }
  function fmtMin(v) { return v == null ? '–' : v.toFixed(1); }

  function verdict(a, b, lead, good, bad) {
    var ma = mean(a), mb = mean(b);
    if (ma == null || mb == null) return '<p class="read">Not enough data yet.</p>';
    var d = ma - mb;
    var weak = d > 0 && d < 0.5 ? ' That gap is small: the conditions may not differ enough.' : '';
    return '<p class="read">' + esc(lead) + ' ' + Math.abs(d).toFixed(1) + ' points ' + esc(d > 0 ? good : bad) + '.' + esc(weak) + '</p>';
  }

  /* ------------------------------------------------------------------ */
  /* How each derived column is calculated, spelled out with the row's   */
  /* own numbers (tooltips in the participant detail, and the worked     */
  /* example in "How the numbers are calculated").                       */
  /* ------------------------------------------------------------------ */
  var MID = function () { return C.slider.max / 2; };
  function n2(v) { return Math.round(v * 100) / 100; }
  function sg(v) { return Number(v) < 0 ? '−' + String(v).replace('-', '') : String(v); }   // a true minus sign
  R.explain = {
    choice: function (v) {
      if (v == null) return 'No answer.';
      return v + (v < MID() ? ' is below ' + MID() + ', so it leans toward Option A.' : v > MID() ? ' is above ' + MID() + ', so it leans toward Option B.' : ' is the middle (' + MID() + '), so no preference.');
    },
    position: function (r) {
      if (!r.ai_recommended) return 'No recommendation yet.';
      var it = C.items.filter(function (i) { return i.id === r.item_id; })[0] || {};
      return 'The AI picked Option ' + r.ai_recommended + '. Its position is ' + (r.ai_recommended === 'B' ? 'the strength, ' + r.ai_position : C.slider.max + ' − strength ' + (it.strength != null ? it.strength : '') + ' = ' + r.ai_position) + '.';
    },
    moved: function (r) {
      if (r.first_answer == null || r.final_answer == null || r.ai_position == null) return 'Needs a first answer, a final answer and the AI’s position.';
      var f = r.first_answer, fin = r.final_answer, a = r.ai_position;
      if (a > f) return 'The AI (' + a + ') is above the first answer (' + f + '), so moved = final − first = ' + fin + ' − ' + f + ' = ' + (fin - f) + '.';
      if (a < f) return 'The AI (' + a + ') is below the first answer (' + f + '), so moved = first − final = ' + f + ' − ' + fin + ' = ' + (f - fin) + '.';
      return 'The first answer already equals the AI’s position, so 0.';
    },
    woa: function (r) {
      var f = r.first_answer, fin = r.final_answer, a = r.ai_position;
      if (f == null || fin == null || a == null) return 'Needs a first answer, a final answer and the AI’s position.';
      if (a === f) return 'Blank: the first answer already equals the AI’s position, so there is no gap to close.';
      var raw = (fin - f) / (a - f), capped = Math.max(0, Math.min(1, raw));
      return '(final − first) ÷ (AI − first) = (' + fin + ' − ' + f + ') ÷ (' + a + ' − ' + f + ') = ' + sg(fin - f) + ' ÷ ' + sg(a - f) + ' = ' + sg(n2(raw).toFixed(2)) +
        (raw !== capped ? ', limited to ' + capped.toFixed(0) + ' because weight of advice is kept between 0 and 1.' : '.');
    },
    switched: function (r) {
      if (!r.ai_recommended || r.first_choice == null || r.final_choice == null) return 'Needs both answers and a recommendation.';
      var yes = r.final_choice === r.ai_recommended && r.first_choice !== r.ai_recommended;
      return 'First answer leans ' + r.first_choice + ', the AI picked ' + r.ai_recommended + ', final answer leans ' + r.final_choice + '. ' +
        (yes ? 'The answer crossed to the AI’s side: yes.' : r.first_choice === r.ai_recommended ? 'It already leaned toward the AI’s option, so no.' : 'It did not end on the AI’s side, so no.');
    }
  };
  function tipCell(text, tip) { return '<span class="calc" data-tip="' + esc(tip) + '">' + text + '</span>'; }

  /* Expandable rows: a summary row with a toggle, then a hidden detail row.
     Which rows are open is kept in opts.open so a redraw keeps them open. */
  function expRow(id, cells, detail, cols, open) {
    return '<tr class="exp' + (open ? ' is-open' : '') + '" data-exp="' + esc(id) + '"><td class="tg"><button type="button" class="tgl" aria-expanded="' + !!open + '" aria-label="Show details">' + (open ? '▾' : '▸') + '</button></td>' + cells + '</tr>' +
      '<tr class="detail" data-for="' + esc(id) + '"' + (open ? '' : ' hidden') + '><td></td><td colspan="' + cols + '">' + detail + '</td></tr>';
  }
  function flagList(flags) {
    return flags.length ? flags.map(function (f) { return '<span class="flag">' + esc(f) + '</span>'; }).join('') : '<span class="ok">none</span>';
  }
  function okRows(people, id, iface) {
    var out = [];
    people.forEach(function (p) {
      if (iface && p.iface !== iface) return;
      p.rows.forEach(function (r) { if (r.item_id === id && r.item_finished === 1 && r.item_jumped_in_review !== 1) out.push(r); });
    });
    return out;
  }

  /* First answers 0..max as small bars: shows whether an item is a toss-up. */
  function histogram(vals) {
    var max = C.slider.max, step = max > 10 ? max / 10 : 1, n = max > 10 ? 11 : max + 1, W = 300, H = 74, L = 4, bw = (W - 2 * L) / n;
    var counts = Array.from({ length: n }, function () { return 0; });
    vals.forEach(function (v) { if (v >= 0 && v <= max) counts[Math.min(n - 1, Math.round(v / step))] += 1; });
    var lab = function (k) { return step === 1 ? String(k) : String(k * step); };
    var range = function (k) { return step === 1 ? String(k) : Math.max(0, k * step - step / 2) + '\u2013' + Math.min(max, k * step + step / 2 - 1 + (k === n - 1 ? 1 : 0)); };
    var top = Math.max.apply(null, counts.concat([1]));
    var h = '<svg class="hist" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="First answers from 0 to ' + max + '">';
    counts.forEach(function (c, k) {
      var bh = c / top * 44, x = L + k * bw + 2, y = 50 - bh;
      h += '<rect x="' + x + '" y="' + y + '" width="' + (bw - 4) + '" height="' + Math.max(bh, c ? 2 : 0) + '" rx="3" fill="var(--neutral)" fill-opacity="0.75"/>' +
        '<rect x="' + (x - 2) + '" y="4" width="' + bw + '" height="50" fill="transparent" data-tip="' + esc('<b>First answer ' + range(k) + '</b><br>' + c + ' answer' + (c === 1 ? '' : 's')) + '"/>' +
        '<text x="' + (x + (bw - 4) / 2) + '" y="66" text-anchor="middle" font-size="10" fill="var(--muted)">' + lab(k) + '</text>';
    });
    h += '<line x1="' + L + '" x2="' + (W - L) + '" y1="50.5" y2="50.5" stroke="var(--axis)"/></svg>';
    return h;
  }

  function itemsTable(people, open) {
    var items = C.items.filter(function (i) { return i.type !== 'practice'; });
    var max = C.slider.max;
    var h = '<div class="scroll"><table class="t"><tr><th></th><th>Item</th><th>Type</th><th class="n">n</th><th class="n">First answer, mean (0–' + max + ')</th>' +
      '<th class="n">First answers at the ends</th><th class="n">Weight of advice: Messaging</th><th class="n">Weight of advice: Tool</th><th class="n">Felt (1 emotional – 7 analytical)</th><th>Flags</th></tr>';
    items.forEach(function (it) {
      var rs = okRows(people, it.id), firsts = nums(rs.map(function (r) { return r.first_answer; }));
      var ends = firsts.filter(function (v) { return v <= max * 0.1 || v >= max * 0.9; }).length;
      var endShare = firsts.length ? ends / firsts.length : null;
      var scen = mean(rs.map(function (r) { return r[scenQ]; }));
      var wm = mean(okRows(people, it.id, 'messaging').map(function (r) { return r.weight_of_advice; }));
      var wt = mean(okRows(people, it.id, 'tool').map(function (r) { return r.weight_of_advice; }));
      var flags = [];
      if (endShare != null && firsts.length >= 3 && endShare > 0.5) flags.push('first answers piled at the ends: not a toss-up');
      if (scen != null && it.type === 'emotional' && scen > 4) flags.push('feels analytical');
      if (scen != null && it.type === 'analytical' && scen < 4) flags.push('feels emotional');
      if (rs.length >= 4 && mean(rs.map(function (r) { return r.weight_of_advice; })) < 0.05) flags.push('almost nobody moves toward the AI');
      var cells = '<td>' + esc(it.id + ' · ' + it.title) + '</td><td>' + esc(it.type) + '</td><td class="n">' + rs.length + '</td>' +
        '<td class="n">' + fmt(mean(firsts)) + '</td><td class="n">' + fmt(endShare, 'pct') + '</td>' +
        '<td class="n">' + fmt(wm, 'woa') + '</td><td class="n">' + fmt(wt, 'woa') + '</td><td class="n">' + fmt(scen) + '</td><td>' + flagList(flags) + '</td>';
      /* Detail: the options, the first-answer spread, and each interface side by side. */
      var byIf = IFACES.map(function (f) {
        var r = okRows(people, it.id, f.key), c = function (k) { return r.map(function (x) { return x[k]; }); };
        return '<tr><td><span class="sw" style="background:' + f.color + '"></span>' + esc(f.label) + '</td><td class="n">' + r.length + '</td>' +
          '<td class="n">' + fmt(mean(c('first_answer'))) + '</td><td class="n">' + fmt(mean(c('weight_of_advice')), 'woa') + '</td>' +
          '<td class="n">' + fmt(mean(c('moved_toward_ai'))) + '</td><td class="n">' + fmt(mean(c('switched_to_ai')), 'pct') + '</td>' +
          '<td class="n">' + fmt(mean(c(trustQ))) + '</td>' + (SECOND() ? '<td class="n">' + fmt(mean(c('asked_second_opinion')), 'pct') + '</td>' : '') + '</tr>';
      }).join('');
      var detail = '<div class="dgrid"><div><div class="dk">Options</div><div class="small"><b>A</b> ' + esc(it.optionA.name) + '<br><b>B</b> ' + esc(it.optionB.name) + '</div>' +
          '<div class="dk" style="margin-top:8px">First answers (0 = Definitely A, ' + max + ' = Definitely B)</div>' + histogram(firsts) + '</div>' +
        '<div><div class="dk">By interface</div><table class="t small inner"><tr><th>Interface</th><th class="n">n</th><th class="n">First answer</th><th class="n">Weight of advice</th>' +
          '<th class="n">Moved toward AI</th><th class="n">Switched</th><th class="n">Trust (1–7)</th>' + (SECOND() ? '<th class="n">Second opinion</th>' : '') + '</tr>' + byIf + '</table></div></div>';
      h += expRow('item-' + it.id, cells, detail, 9, open && open['item-' + it.id]);
    });
    return h + '</table></div>';
  }

  function participantsTable(b, open) {
    var inc = {};
    b.people.forEach(function (p) { inc[p.session_id] = true; });
    var list = b.all.slice().sort(function (x, y) { return String(x.started_at).localeCompare(String(y.started_at)); });
    var h = '<div class="scroll"><table class="t"><tr><th></th><th class="n">pid</th><th>Interface</th><th>Started</th><th class="n">Minutes</th><th class="n">Decisions</th>' +
      '<th class="n">Weight of advice: emotional</th><th class="n">Weight of advice: analytical</th><th class="n">Humanlikeness</th><th>In charts</th><th>Flags</th></tr>';
    list.forEach(function (p) {
      var flags = [];
      if (p.withdrawn) flags.push('withdrew: never included');
      if (p.review) flags.push('reviewer session');
      if (!p.completed) flags.push('did not finish');
      if (p.minutes != null && p.minutes < 6) flags.push('very fast (under 6 min)');
      if (p.pid != null && b.pidCount[p.pid] > 1 && !p.review) flags.push('pid used ' + b.pidCount[p.pid] + ' times');
      var started = p.started_at ? new Date(p.started_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '–';
      var cells = '<td class="n">' + esc(p.pid == null ? '–' : p.pid) + '</td><td>' + esc(p.iface) + '</td><td>' + esc(started) + '</td>' +
        '<td class="n">' + fmtMin(p.minutes) + '</td><td class="n">' + p.decisions + '</td>' +
        '<td class="n">' + fmt(p.types.emotional.woa, 'woa') + '</td><td class="n">' + fmt(p.types.analytical.woa, 'woa') + '</td>' +
        '<td class="n">' + fmt(p.end.humanlike) + '</td><td>' + (inc[p.session_id] ? 'yes' : '<span class="muted">no</span>') + '</td><td>' + flagList(flags) + '</td>';
      /* Detail: every decision this person made, in the order they saw them, then their end ratings. */
      var rows = p.rows.slice().sort(function (x, y) { return x.trial_number - y.trial_number; });
      var dec = rows.map(function (r) {
        var side = function (v) { return v == null ? '–' : v; };
        return '<tr' + (r.is_practice === 1 ? ' class="muted"' : '') + '><td class="n">' + esc(r.is_practice === 1 ? 'P' : r.trial_number) + '</td><td>' + esc(r.item_id + ' · ' + (r.item_title || '')) + '</td><td>' + esc(r.decision_type) + '</td>' +
          '<td class="n">' + tipCell(side(r.first_answer), R.explain.choice(r.first_answer)) + '</td>' +
          '<td>' + (r.ai_recommended ? tipCell(esc(r.ai_recommended) + ' (' + r.ai_position + ')', R.explain.position(r)) : '–') + '</td>' +
          '<td class="n">' + tipCell(side(r.final_answer), R.explain.choice(r.final_answer)) + '</td>' +
          '<td class="n">' + tipCell(fmt(r.moved_toward_ai), R.explain.moved(r)) + '</td>' +
          '<td class="n">' + tipCell(fmt(r.weight_of_advice, 'woa'), R.explain.woa(r)) + '</td>' +
          '<td>' + tipCell(r.switched_to_ai === 1 ? 'yes' : r.switched_to_ai === 0 ? 'no' : '–', R.explain.switched(r)) + '</td>' +
          (SECOND() ? '<td>' + esc(r.asked_second_opinion === 1 ? (r.second_opinion_content || 'yes') : 'no') + '</td>' : '') + '<td class="n">' + fmt(r[trustQ]) + '</td><td class="n">' + fmt(r[scenQ]) + '</td>' +
          '<td class="n">' + fmt(r.sec_total) + '</td></tr>';
      }).join('');
      var endBits = C.endMeasures.blocks.map(function (blk) {
        return '<span class="pill2">' + esc(blk.id) + ' ' + fmt(p.end[blk.id]) + '</span>';
      }).join(' ');
      var detail = '<div class="dk">Decisions in the order shown (answers on the 0–' + C.slider.max + ' scale; 0 = Definitely A). Hover an underlined number to see how it was calculated.</div>' +
        '<table class="t small inner"><tr><th class="n">#</th><th>Item</th><th>Type</th><th class="n">First</th><th>AI picked (position)</th><th class="n">Final</th>' +
        '<th class="n">Moved toward AI</th><th class="n">Weight of advice</th><th>Switched</th>' + (SECOND() ? '<th>Second opinion</th>' : '') + '<th class="n">Trust (1–7)</th><th class="n">Felt (1–7)</th><th class="n">Seconds</th></tr>' + dec + '</table>' +
        '<div class="dk" style="margin-top:8px">End-of-study ratings (means, 1–7)</div><div>' + endBits + '</div>' +
        '<div class="muted small" style="margin-top:6px">Session ' + esc(p.session_id) + '</div>';
      h += expRow('p-' + p.session_id, cells, detail, 10, open && open['p-' + p.session_id]);
    });
    return h + '</table></div>';
  }

  /* ------------------------------------------------------------------ */
  /* Made-up example data, so the dashboard can be checked before any    */
  /* real sessions exist. Generated in memory; never saved or exported.  */
  /* Each scenario sets the true weight of advice per interface × type;  */
  /* the generator adds person-level and trial-level noise around it.    */
  /* ------------------------------------------------------------------ */
  R.EXAMPLES = {
    supported: {
      label: 'Hypothesis supported (crossover)',
      about: 'Messaging earns more trust on emotional decisions; the Tool earns more on analytical ones. The lines should cross, and both manipulation checks should pass.',
      woa: { messaging: { emotional: 0.48, analytical: 0.28 }, tool: { emotional: 0.24, analytical: 0.40 } },
      humanlike: { messaging: 5.0, tool: 2.6 }, warmth: { messaging: 5.2, tool: 3.0 }
    },
    main: {
      label: 'Interface effect only (no interaction)',
      about: 'Messaging earns more trust on both decision types by about the same amount. The lines should be parallel, with Messaging above.',
      woa: { messaging: { emotional: 0.46, analytical: 0.40 }, tool: { emotional: 0.30, analytical: 0.24 } },
      humanlike: { messaging: 5.0, tool: 2.6 }, warmth: { messaging: 5.2, tool: 3.0 }
    },
    none: {
      label: 'No effect (null result)',
      about: 'The interfaces look different (manipulation check passes) but trust is the same in both. The lines should overlap, with wide overlapping intervals.',
      woa: { messaging: { emotional: 0.34, analytical: 0.33 }, tool: { emotional: 0.33, analytical: 0.34 } },
      humanlike: { messaging: 4.9, tool: 2.7 }, warmth: { messaging: 5.0, tool: 3.1 }
    },
    opposite: {
      label: 'Opposite of the hypothesis',
      about: 'The Tool earns more trust on emotional decisions and Messaging more on analytical ones. The lines cross the other way round.',
      woa: { messaging: { emotional: 0.24, analytical: 0.44 }, tool: { emotional: 0.46, analytical: 0.26 } },
      humanlike: { messaging: 5.0, tool: 2.6 }, warmth: { messaging: 5.1, tool: 3.0 }
    },
    broken: {
      label: 'Manipulation fails + data problems',
      about: 'A Messaging advantage appears, but both interfaces are rated equally humanlike, so it cannot be credited to anthropomorphism. Item E2 is not a toss-up, item A3 feels emotional, and the participant list includes very fast, repeated and unfinished sessions. Expect flags.',
      woa: { messaging: { emotional: 0.42, analytical: 0.36 }, tool: { emotional: 0.30, analytical: 0.32 } },
      humanlike: { messaging: 3.7, tool: 3.6 }, warmth: { messaging: 4.0, tool: 3.9 }, problems: true
    }
  };

  R.exampleRows = function (kind) {
    var ex = R.EXAMPLES[kind];
    var seed = 12345 + kind.length * 101;
    var rnd = function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    var noise = function (sd) { return (rnd() + rnd() + rnd() - 1.5) * sd * 2; };   // roughly normal
    var clamp = function (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); };
    var max = C.slider.max, opts = D.defaultOptions();
    var day0 = Date.parse('2026-11-23T14:00:00Z');
    var sessions = [];
    var make = function (pid, flags) {
      var a = D.assign(new URLSearchParams('pid=' + pid), opts);
      var s = D.newSession(a, opts, !!flags.review);
      var iface = s.ui === 'chat' ? 'messaging' : 'tool';
      var start = day0 + Math.floor((pid - 1) / 6) * 864e5 + ((pid - 1) % 6) * 70 * 60000 + (flags.review || flags.repeat ? 9 * 864e5 : 0);
      var minutes = flags.fast ? 4 + rnd() : 11 + rnd() * 7;
      s.started_at = new Date(start).toISOString();
      s.completed = flags.incomplete ? 0 : 1;
      s.finished_at = flags.incomplete ? null : new Date(start + minutes * 60000).toISOString();
      s.pid_prior_sessions = flags.repeat ? 1 : 0;
      var personShift = noise(0.10), personTrust = noise(0.5);
      var ids = ['P1'].concat(s.order).slice(0, flags.incomplete ? 5 : undefined);
      var wSum = 0, wN = 0;
      ids.forEach(function (id, k) {
        var it = C.items.filter(function (i) { return i.id === id; })[0];
        var first = Math.round(clamp(max / 2 + noise(max * 0.22), 0, max));
        if (ex.problems && id === 'E2') first = rnd() < 0.5 ? 0 : max;            // not a toss-up
        if (first === max / 2) first += rnd() < 0.5 ? -1 : 1;
        var side = D.recSide(first, it, 'opposite'), rec = D.recPosition(side, it);
        var base = it.type === 'practice' ? 0.3 : ex.woa[iface][it.type];
        var w = clamp(base + personShift + noise(0.18), 0, 1);
        if (flags.fast) w = clamp(noise(0.1), 0, 1);
        var fin = Math.round(clamp(first + (rec - first) * w, 0, max));
        var secs = flags.fast ? 6 : 25 + rnd() * 30;
        if (k) { wSum += w; wN++; }
        s.items[id] = {
          seq_index: k, position: k, is_practice: k ? 0 : 1, item_type: it.type,
          first_answer: first, rec_side: side, rec_position: rec, final_answer: fin,
          snapshot: Object.assign({ ui: s.ui }, opts), done: 1, first_moves: 1, final_moves: 1, jumped: 0,
          followup_clicked: 0, second_opinion_clicked: SECOND() && rnd() < (iface === 'tool' ? 0.22 : 0.15) ? 1 : 0,
          times: { first_touch: 4000, first_submit: secs * 400, ask: secs * 500, reply_shown: secs * 500 + 2000,
            final_touch: secs * 800, final_submit: secs * 900, ratings_submit: secs * 1000, done: secs * 1000 },
          ratings: {}
        };
        s.items[id].ratings[trustQ] = Math.round(clamp(2.6 + w * 4 + personTrust + noise(0.6), 1, 7));
        C.perItemRatings.questions.slice(1).forEach(function (q) { s.items[id].ratings[q.id] = Math.round(clamp(4 + noise(1), 1, 7)); });
      });
      if (!flags.incomplete) {
        var mw = wN ? wSum / wN : 0.3;
        var rate = function (m, sd) { return Math.round(clamp(m + noise(sd), 1, 7)); };
        C.endMeasures.blocks.forEach(function (b) {
          b.items.forEach(function (q) {
            var m = b.id === 'humanlike' ? ex.humanlike[iface] : b.id === 'warmth' ? ex.warmth[iface] : b.id === 'trust' ? 2.8 + mw * 5 : 4.9;
            s.end[q.id] = rate(m, 0.7);
          });
        });
        s.order.forEach(function (id) {
          var it = C.items.filter(function (i) { return i.id === id; })[0], v = {};
          var m = it.type === 'emotional' ? 2.4 : 5.8;
          if (ex.problems && id === 'A3') m = 3.0;                                  // feels emotional
          v[scenQ] = rate(m, 0.7);
          s.scen[id] = v;
        });
      }
      sessions.push(s);
    };
    for (var pid = 1; pid <= 40; pid++) make(pid, { fast: ex.problems && (pid === 7 || pid === 18) });
    make(41, { incomplete: true });
    make(1, { review: true });
    if (ex.problems) { make(12, { repeat: true }); make(42, { incomplete: true }); }
    var rows = [];
    sessions.forEach(function (s) { rows = rows.concat(D.rows(s).map(clean)); });
    return rows;
  };

  /* ------------------------------------------------------------------ */
  /* Wiring (browser only)                                               */
  /* ------------------------------------------------------------------ */
  R.start = function () {
    var root = document.getElementById('root'), tip = document.getElementById('tip');
    var state = { source: 'browser', files: [], fileRows: [], fileSessions: [], includeReview: false, includeIncomplete: false, example: 'supported', open: {} };

    function draw() {
      var rows = state.source === 'browser' ? R.rowsFromBrowser() : state.source === 'example' ? R.exampleRows(state.example) : state.fileRows;
      var ex = R.EXAMPLES[state.example];
      var srcText = state.source === 'browser'
        ? 'Data: sessions stored in this browser (' + location.host + (location.protocol === 'file:' ? 'local file' : '') + ')'
        : state.source === 'example' ? 'Data: made-up example (' + ex.label + ')'
        : 'Data: ' + state.files.length + ' file(s): ' + state.files.join(', ');
      root.innerHTML =
        '<h1>Study results</h1>' +
        '<p class="lead">For the experiment leaders only. Descriptive summaries to follow data collection and spot problems early; the statistical tests come from the mixed model in the analysis plan. <a href="#how">How the numbers are calculated</a></p>' +
        '<div class="bar">' +
          '<button type="button" data-src="browser" class="' + (state.source === 'browser' ? 'on' : '') + '">This browser</button>' +
          '<label class="btn">Load data files…<input type="file" id="csv" accept=".csv,text/csv,.json,application/json" multiple></label>' +
          '<button type="button" data-src="example" class="' + (state.source === 'example' ? 'on' : '') + '">Example data</button>' +
          (state.source === 'example' ? '<select id="example" aria-label="Example scenario">' + Object.keys(R.EXAMPLES).map(function (k) {
            return '<option value="' + k + '"' + (k === state.example ? ' selected' : '') + '>' + esc(R.EXAMPLES[k].label) + '</option>';
          }).join('') + '</select>' : '') +
          '<label class="chk"><input type="checkbox" id="inc-review"' + (state.includeReview ? ' checked' : '') + '> include reviewer sessions</label>' +
          '<label class="chk"><input type="checkbox" id="inc-incomplete"' + (state.includeIncomplete ? ' checked' : '') + '> include incomplete sessions</label>' +
          '<button type="button" id="codebook">Download codebook</button>' +
          (state.source !== 'example' ? '<button type="button" id="datacsv">Download data CSV</button>' : '') +
          '<span class="src">' + esc(srcText) + '</span>' +
        '</div>' +
        (state.error ? '<div class="notice">' + esc(state.error) + '</div>' : '') +
        (state.source === 'example' ? '<div class="notice example"><b>Made-up example data, not real results.</b> ' + esc(ex.about) +
          ' Generated in this page only: nothing is saved, exported or mixed with real sessions.</div>' : '') +
        R.render(rows, state);
      root.querySelector('[data-src="browser"]').addEventListener('click', function () { state.source = 'browser'; state.error = null; draw(); });
      root.querySelector('[data-src="example"]').addEventListener('click', function () { state.source = 'example'; state.error = null; draw(); });
      var sel = root.querySelector('#example');
      if (sel && sel.addEventListener) sel.addEventListener('change', function (e) { state.example = e.target.value; draw(); });
      root.querySelector('#codebook').addEventListener('click', function () { D.download('haitrust_codebook.csv', D.codebookCSV()); });
      var dataBtn = root.querySelector('#datacsv');
      if (dataBtn) dataBtn.addEventListener('click', function () {
        // One row per participant per decision, ready for analysis. Withdrawn and unfinished
        // sessions are left out (the consent says unfinished sessions are not used).
        var list = state.source === 'browser' ? D.dedupeSessions(D.exportList(state.includeReview)) : state.fileSessions;
        list = list.filter(function (x) { return !x.withdrawn && x.completed; });
        if (!list.length) { state.error = state.source === 'browser' ? 'No finished sessions in this browser to export.' : 'No finished sessions to export. Only the Google Sheet export and answers .json files hold whole sessions; a data CSV already is the export.'; draw(); return; }
        state.error = state.source === 'files' && state.rowOnlyFiles && state.rowOnlyFiles.length
          ? 'The download has the sessions from the Google Sheet export and .json files only. These data CSV files are not included (they already are exports): ' + state.rowOnlyFiles.join(', ') + '.' : null;
        D.download('haitrust_data_' + D.fileStamp() + '.csv', D.toCSV(list));
        if (state.error) draw();
      });
      root.querySelector('#inc-review').addEventListener('change', function (e) { state.includeReview = e.target.checked; draw(); });
      root.querySelector('#inc-incomplete').addEventListener('change', function (e) { state.includeIncomplete = e.target.checked; draw(); });
      root.querySelector('#csv').addEventListener('change', function (e) {
        var files = Array.from(e.target.files || []);
        if (!files.length) return;
        Promise.all(files.map(function (f) { return f.text().then(function (t) {
          var sessions = D.sessionsFromText(t, R.parseCSV);
          return { name: f.name, sessions: sessions, rows: sessions.length ? [] : R.parseCSV(t) };
        }); })).then(function (res) {
          // Sheet exports and emailed .json files hold whole sessions: merge copies of the same
          // session (keep the most complete one) before building rows. Data CSVs are rows already.
          var merged = D.dedupeSessions([].concat.apply([], res.map(function (r) { return r.sessions; })));
          var sessionRows = [];
          merged.forEach(function (x) { sessionRows = sessionRows.concat(D.rows(x).map(clean)); });
          res.forEach(function (r) { if (r.sessions.length) r.rows = [{ item_id: '', session_id: '' }]; });   // mark as usable
          var good = res.filter(function (r) { return r.rows.length && 'item_id' in r.rows.at(0) && 'session_id' in r.rows.at(0); });
          var bad = res.filter(function (r) { return good.indexOf(r) < 0; });
          state.error = bad.length ? 'Skipped ' + bad.map(function (r) { return r.name; }).join(', ') + ': not a study data file. Load the Google Sheet export (File → Download → CSV of the "sessions" tab), a downloaded answers .json file, or a data CSV from this study (not the codebook).' : null;
          if (good.length) {
            state.source = 'files';
            state.files = good.map(function (r) { return r.name; });
            state.fileSessions = merged;
            state.rowOnlyFiles = good.filter(function (r) { return !r.sessions.length; }).map(function (r) { return r.name; });
            state.fileRows = sessionRows.concat([].concat.apply([], good.filter(function (r) { return !r.sessions.length; }).map(function (r) { return r.rows; })));
          }
          draw();
        });
      });
    }

    /* Expand or collapse a row without redrawing the page. */
    root.addEventListener('click', function (e) {
      var tr = e.target.closest ? e.target.closest('tr.exp') : null;
      if (!tr || e.target.closest('a')) return;
      var id = tr.getAttribute('data-exp'), det = tr.nextElementSibling, btn = tr.querySelector('.tgl');
      var openNow = !state.open[id];
      state.open[id] = openNow;
      tr.classList.toggle('is-open', openNow);
      if (det) det.hidden = !openNow;
      if (btn) { btn.textContent = openNow ? '\u25BE' : '\u25B8'; btn.setAttribute('aria-expanded', String(openNow)); }
    });

    document.addEventListener('mousemove', function (e) {
      var t = e.target.closest ? e.target.closest('[data-tip]') : null;
      if (!t) { tip.hidden = true; return; }
      tip.innerHTML = t.getAttribute('data-tip');
      tip.hidden = false;
      var x = Math.min(window.innerWidth - tip.offsetWidth - 8, e.clientX + 14);
      var y = e.clientY + 14 + tip.offsetHeight > window.innerHeight ? e.clientY - tip.offsetHeight - 10 : e.clientY + 14;
      tip.style.left = x + 'px';
      tip.style.top = y + 'px';
    });
    window.addEventListener('storage', draw);   // a session finished in another tab
    draw();
  };

  window.Results = R;
  if (typeof document !== 'undefined' && document.getElementById && document.getElementById('root')) R.start();
})();
