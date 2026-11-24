/* Study flow: screens, the steps inside each item, and logging.
   Screens: intro -> instructions -> practice item(s) -> interlude ->
            main items -> end (AI ratings) -> scen (scenario ratings) -> closing */
(function () {
  'use strict';
  var C = window.STUDY_CONFIG;
  var D = window.Data;
  var esc = function (s) { return U.esc(s); };
  var A = {};
  window.App = A;

  var params = new URLSearchParams(location.search);
  var REVIEW_KEY = 'haitrust.review.v1';
  A.review = ['1', 'true', 'yes', 'on'].indexOf(String(params.get('review') || '').toLowerCase()) >= 0;
  A.skipDelays = false;
  A.screen = null;
  A.rec = null;
  A.item = null;
  var token = 0;   // bumps on every navigation so stale reply timers do nothing

  function itemById(id) { return C.items.filter(function (i) { return i.id === id; })[0]; }
  A.opts = function () { return A.session.options; };
  A.nPractice = function () { return D.practiceItems().length; };
  A.nMain = function () { return A.session.order.length; };

  /* Saves the session to browser storage. A participant session is kept only
     once they consent (so just opening a link leaves no trace); reviewer
     sessions only once they reach an item. */
  function save() {
    if (A.stale) return;
    if (A.review && !Object.keys(A.session.items).length) return;
    if (!A.review && !A.session.consented && !Object.keys(A.session.items).length) return;
    if (!D.save(A.session)) showSaveWarning();
    if (D.stale && !A.review) staleTab();
  }

  /* Sends the session to the data endpoint (if one is set in config.js) and
     updates the status line on the last screen. */
  A.syncState = 'idle';
  function sync() {
    if (A.review || A.stale || !D.endpoint()) return;
    A.syncState = 'saving';
    renderSyncStatus();
    var s = A.session, rev = s.rev;
    D.send(s).then(function (st) {
      if (A.session !== s) return;
      A.syncState = st;
      if (st === 'confirmed') { s.confirmed_rev = rev; D.save(s, { keepRev: true }); }
      renderSyncStatus();
    });
  }

  /* The same session moved on in another tab or window: stop this one, so its
     older copy can't overwrite the newer answers. */
  A.stale = false;
  function staleTab() {
    A.stale = true;
    token++;                     // cancel pending reply timers
    message('staleTitle', 'staleHtml');
  }
  window.addEventListener('storage', function () {
    if (A.review || A.stale || !A.session || !A.session.consented) return;
    var stored = D.loadAll()[A.session.session_id];
    if (stored && (stored.rev || 0) > (A.session.rev || 0)) staleTab();
  });
  function showSaveWarning() {
    // Remote sessions still reach the Google Sheet without browser storage (only
    // resuming after a reload is lost), so participants are not alarmed.
    if (D.endpoint() && !A.review) return;
    if (document.getElementById('save-warning')) return;
    var box = document.createElement('div');
    box.id = 'save-warning';
    box.className = 'config-errors';
    box.innerHTML = '<strong>Answers are not being saved in this browser.</strong> Please tell the researcher. ' +
      '(Researcher: download this session from reviewer mode before closing the page. Reason: ' + esc(D.saveError || 'unknown') + ')';
    document.body.insertBefore(box, document.body.firstChild);
  }

  /* ------------------------------------------------------------------ */
  /* Start                                                               */
  /* ------------------------------------------------------------------ */
  A.start = function () {
    var problems = validateConfig();
    if (problems.length) showConfigProblems(problems);
    if (!C || !Array.isArray(C.items) || !D.mainItems().length) return;
    if (A.review) {
      var notes = deployWarnings();
      if (notes.length) showConfigProblems(notes, 'Before sending the link to participants (reviewer mode only)');
    }

    var options = D.defaultOptions();
    var saved = A.review ? (U.readJSON(REVIEW_KEY) || {}) : {};
    if (A.review) { options = D.applyOptions(options, saved.options); A.skipDelays = !!saved.skipDelays; }
    options = D.applyOptions(options, params);           // URL wins

    /* Participants: pick up an unfinished session after a reload or a closed
       tab, and don't let someone take the study twice in this browser.
       Add ?new=1 to the link to force a fresh session (for testing). Without a
       pid this only happens when data is sent to an endpoint (remote links),
       so a shared lab laptop never hands one person's session to the next. */
    if (!A.review && !params.has('new')) {
      var pid = D.pidFromParams(params), remote = !!D.endpoint();
      var done = pid ? D.findCompleted(pid) : remote ? D.findCompleted(null) : null;
      if (done) {
        // Back on the debrief soon after finishing (e.g. a reload): show it again,
        // with the withdraw box, and re-send if the last copy wasn't confirmed.
        if (Date.now() - Date.parse(done.finished_at || 0) < 24 * 3600 * 1000) return resume(done);
        if (remote && done.confirmed_rev !== done.rev) D.send(done);
        return message('doneTitle', 'doneHtml');
      }
      var open = pid ? D.findResumable(pid) : remote ? D.findResumable(null) : null;
      if (open) {
        return message('resumeTitle', 'resumeHtml', { label: C.text.remote.resumeButton, onClick: function () { resume(open); } });
      }
    }

    deviceGate(function () {
      var assignment = D.assign(params, options, null);
      if (A.review && saved.ui && !params.get('ui')) assignment.ui = saved.ui;
      A.session = D.newSession(assignment, options, A.review);
      // One shared link: the participant number comes from the data endpoint
      // when they press Start on the consent page (so people who only open the
      // link don't use up numbers). Until then the assignment above is a placeholder.
      A.needPid = !A.review && !D.pidFromParams(params) && !!D.endpoint() && !!(C.dataCollection || {}).assignPid;
      A.buildSeq();
      if (window.Review) window.Review.init();
      A.go({ name: 'intro' });
    });
  };

  /* Applies the participant number handed out by the data endpoint. */
  function applyServerPid(pid) {
    var s = A.session, a = D.assign(params, s.options, pid);
    s.pid = a.pid;
    s.ui = a.ui;
    s.order_row = a.order_row;
    s.order_seed = a.order_seed;
    s.assignment_method = a.assignment_method;
    s.order = D.buildOrder(s.options.itemOrder, a.order_row, a.order_seed).map(function (i) { return i.id; });
    s.pid_prior_sessions = D.priorSessionsForPid(a.pid);
    A.buildSeq();
  }

  function resume(s) {
    A.session = s;
    s.resumes = (s.resumes || 0) + 1;
    A.buildSeq();
    var at = s.at || { name: 'intro' };
    if (at.name === 'item' && A.seq[at.index] == null) at = { name: 'intro' };
    A.go(at.name === 'item' ? { name: 'item', index: at.index } : { name: at.name });
  }

  /* A plain message page (welcome back, already done, use a computer, other tab),
     optionally with one button. */
  function message(titleKey, htmlKey, button) {
    var t = C.text.remote, app = document.getElementById('app');
    app.className = 'screen-message';
    app.innerHTML = page(t[titleKey], U.fill(t[htmlKey], { contact: esc(contact()), width: minWidth() }) +
      (button ? '<div class="actions"><button class="btn primary" id="msg-btn" type="button">' + esc(button.label) + '</button></div>' : ''));
    if (button) document.getElementById('msg-btn').addEventListener('click', button.onClick);
  }

  function contact() { return String((C.dataCollection || {}).contact || ''); }
  function minWidth() { return Number((C.dataCollection || {}).minWidth) || 0; }

  /* Participants need a screen wide enough for the two panels side by side.
     On a phone or a narrow window this waits, and continues on its own once
     the window is wide enough. */
  function deviceGate(then) {
    if (A.review || !minWidth() || window.innerWidth >= minWidth()) return then();
    message('gateTitle', 'gateHtml');
    // Check on resize and also every second (some browsers don't report every resize, e.g. full-screen toggles).
    var timer = null;
    var check = function () {
      if (window.innerWidth < minWidth()) return;
      window.removeEventListener('resize', check);
      clearInterval(timer);
      then();
    };
    window.addEventListener('resize', check);
    timer = setInterval(check, 1000);
  }

  /* Warn before leaving mid-study; the session is resumed if they come back. */
  window.addEventListener('beforeunload', function (e) {
    if (A.review || !A.session || !A.screen) return;
    if (['instructions', 'item', 'interlude', 'end', 'scen'].indexOf(A.screen.name) < 0) return;
    e.preventDefault();
    e.returnValue = '';
  });
  /* Last-chance copy to the data endpoint when the page goes away. */
  window.addEventListener('pagehide', function () {
    if (A.session && !A.review && !A.stale && A.session.consented) D.beacon(A.session);
  });

  A.buildSeq = function () {
    A.seq = D.practiceItems().map(function (i) { return i.id; }).concat(A.session.order);
  };

  A.persistReview = function () {
    if (!A.review) return;
    U.writeJSON(REVIEW_KEY, { options: A.session.options, ui: A.session.ui, skipDelays: A.skipDelays });
  };

  /* ------------------------------------------------------------------ */
  /* Navigation                                                          */
  /* ------------------------------------------------------------------ */
  A.go = function (screen) {
    token++;
    A.screen = screen;
    if (screen.name === 'item') {
      startItem(screen.index);
      if (screen.jumpStep) applyJump(screen.jumpStep);
    } else {
      A.rec = null; A.item = null;
    }
    if (screen.name === 'closing') {
      A.session.completed = 1;
      A.session.finished_at = A.session.finished_at || new Date().toISOString();
    }
    if (!screen.jumpStep) A.session.at = { name: screen.name, index: screen.index };
    save();
    A.render();
    window.scrollTo(0, 0);
    if (A.session.consented && screen.name !== 'intro' && !screen.jumpStep) sync();
  };

  A.render = function () {
    var app = document.getElementById('app');
    var s = A.screen;
    app.className = 'screen-' + s.name;
    if (s.name === 'item') {
      app.innerHTML = '<div class="item-layout">' +
        '<section class="study-panel" id="panel" aria-label="Decision"></section>' +
        '<section class="frame-col" aria-label="AI"><div class="frame" id="frame"></div></section>' +
      '</div>';
      renderPanel();
      renderFrame();
    } else {
      var builders = { intro: introScreen, instructions: instructionsScreen, interlude: interludeScreen, end: endScreen, scen: scenScreen, closing: closingScreen };
      builders[s.name](app);
    }
    syncReview();
  };

  function syncReview() { if (window.Review) window.Review.sync(); }

  A.screenLabel = function () {
    var s = A.screen;
    if (!s) return '';
    if (s.name !== 'item') {
      return { intro: 'Intro / consent', instructions: 'Instructions', interlude: 'After practice', end: 'End questions', scen: 'Scenario ratings', closing: 'Closing / debrief' }[s.name];
    }
    var steps = { first: 'step 1 · first answer', ask: 'step 2 · ask', waiting: 'step 2 · waiting', reply: 'step 3 · reply + final answer', ratings: 'step 4 · item ratings' };
    return A.rec.item_id + ' · ' + steps[A.rec.step];
  };

  /* ------------------------------------------------------------------ */
  /* Simple pages                                                        */
  /* ------------------------------------------------------------------ */
  function page(title, body) {
    return '<div class="page"><h1>' + esc(title) + '</h1>' + body + '</div>';
  }

  function introScreen(app) {
    var t = C.text.intro;
    // Researcher note for lab sessions only; remote participants never see it.
    var reused = A.session.pid_prior_sessions && !D.endpoint()
      ? '<p class="pid-warning">Researcher: pid ' + esc(A.session.pid) + ' has already been used ' + A.session.pid_prior_sessions +
        ' time(s) in this browser. If this is a new participant, change the address to the next pid before starting. ' +
        '(This session will be marked <code>pid_prior_sessions=' + A.session.pid_prior_sessions + '</code> in the data.)</p>'
      : '';
    app.innerHTML = page(t.title,
      reused + U.fill(t.html, { contact: esc(contact()), storage: D.endpoint() ? t.storageRemote : t.storageLocal }) +
      '<label class="consent"><input type="checkbox" id="consent"' + (A.session.consented ? ' checked' : '') + '> <span>' + esc(t.consentLabel) + '</span></label>' +
      '<div class="actions"><button class="btn primary" id="next" type="button"' + (A.session.consented ? '' : ' disabled') + '>' + esc(t.button) + '</button></div>');
    var box = document.getElementById('consent'), next = document.getElementById('next');
    box.addEventListener('change', function () { next.disabled = !box.checked; });
    next.addEventListener('click', function () {
      if (!box.checked || next.getAttribute('aria-busy')) return;
      var go = function () {
        A.session.consented = 1;
        A.go({ name: 'instructions' });
      };
      if (!A.needPid) return go();
      // Shared link: get the next participant number now. If the endpoint can't
      // be reached, the random assignment made on page load is kept.
      next.setAttribute('aria-busy', 'true');
      next.disabled = true;
      next.textContent = C.text.remote.startWaiting;
      D.requestPid().then(function (pid) {
        A.needPid = false;
        if (pid) applyServerPid(pid);
        go();
      });
    });
  }

  function instructionsScreen(app) {
    var t = C.text.instructions, html = t.html;
    if (A.opts().secondOpinion === 'off') html = html.replace(/<li data-if="secondOpinion">[\s\S]*?<\/li>/g, '');
    app.innerHTML = page(t.title, html + '<div class="actions"><button class="btn primary" id="next" type="button">' + esc(t.button) + '</button></div>');
    document.getElementById('next').addEventListener('click', function () { A.go({ name: 'item', index: 0 }); });
  }

  function interludeScreen(app) {
    var t = C.text.interlude;
    app.innerHTML = page(t.title, U.fill(t.html, { total: A.nMain() }) +
      '<div class="actions"><button class="btn primary" id="next" type="button">' + esc(t.button) + '</button></div>');
    document.getElementById('next').addEventListener('click', function () { A.go({ name: 'item', index: A.nPractice() }); });
  }

  /* A row of 1..points radio buttons. `name` is the storage key. */
  function rateRow(name, text, points, value, low, high) {
    var opts = '';
    for (var v = 1; v <= points; v++) {
      opts += '<label class="rate-opt"><input type="radio" name="' + esc(name) + '" value="' + v + '"' + (value === v ? ' checked' : '') + '><span>' + v + '</span></label>';
    }
    return '<div class="rate-row" data-name="' + esc(name) + '">' +
      (text ? '<div class="rate-text">' + esc(text) + '</div>' : '') +
      '<div class="rate-scale"><span class="rate-end rate-end--low">' + esc(low) + '</span><div class="rate-opts" role="radiogroup" aria-label="' + esc(text || (low + ' to ' + high)) + '">' + opts + '</div><span class="rate-end rate-end--high">' + esc(high) + '</span></div>' +
    '</div>';
  }

  /* Reads every rate-row in `root`; returns {values, missing[]} and marks missing rows. */
  function readRatings(root) {
    var values = {}, missing = [];
    root.querySelectorAll('.rate-row').forEach(function (row) {
      var name = row.getAttribute('data-name');
      var checked = row.querySelector('input:checked');
      row.classList.toggle('is-missing', !checked);
      if (checked) values[name] = Number(checked.value); else missing.push(name);
    });
    return { values: values, missing: missing };
  }

  function endScreen(app) {
    var t = C.text.endMeasures, M = C.endMeasures, h = t.html;
    var likert = M.blocks.filter(function (b) { return b.kind !== 'pairs'; });
    var pairs = M.blocks.filter(function (b) { return b.kind === 'pairs'; });
    h += '<div class="rate-list">';
    likert.forEach(function (b) {
      b.items.forEach(function (it) { h += rateRow(it.id, it.text, M.points, A.session.end[it.id], b.low, b.high); });
    });
    h += '</div>';
    pairs.forEach(function (b) {
      h += '<p class="block-prompt">' + esc(b.prompt) + '</p><div class="rate-list rate-list--pairs">';
      b.items.forEach(function (it) { h += rateRow(it.id, '', M.points, A.session.end[it.id], it.left, it.right); });
      h += '</div>';
    });
    h += '<p class="form-missing" hidden>' + esc(C.text.panel.missing) + '</p>' +
      '<div class="actions"><button class="btn primary" id="next" type="button">' + esc(t.button) + '</button></div>';
    app.innerHTML = page(t.title, h);
    wireRatingsPage(app, function (values) {
      Object.assign(A.session.end, values);
      A.session.end_submitted_at = new Date().toISOString();
      A.go({ name: 'scen' });
    }, function (values) { Object.assign(A.session.end, values); save(); });
  }

  function scenScreen(app) {
    var t = C.text.scenarioRatings, Q = C.scenarioRatings, h = t.html;
    A.session.order.forEach(function (id) {
      var it = itemById(id), prev = A.session.scen[id] || {};
      h += '<div class="scen-card"><div class="scen-title">' + esc(it.title) + '</div>' +
        '<div class="scen-sub">' + esc(it.optionA.label + ': ' + it.optionA.name + '  ·  ' + it.optionB.label + ': ' + it.optionB.name) + '</div>';
      Q.questions.forEach(function (q) { h += rateRow(id + '::' + q.id, q.text, Q.points, prev[q.id], q.low, q.high); });
      h += '</div>';
    });
    h += '<p class="form-missing" hidden>' + esc(C.text.panel.missing) + '</p>' +
      '<div class="actions"><button class="btn primary" id="next" type="button">' + esc(t.button) + '</button></div>';
    app.innerHTML = page(t.title, h);
    var store = function (values) {
      Object.keys(values).forEach(function (k) {
        var parts = k.split('::');
        A.session.scen[parts[0]] = A.session.scen[parts[0]] || {};
        A.session.scen[parts[0]][parts[1]] = values[k];
      });
    };
    wireRatingsPage(app, function (values) { store(values); A.go({ name: 'closing' }); }, function (values) { store(values); save(); });
  }

  function wireRatingsPage(app, onDone, onChange) {
    app.querySelectorAll('.rate-row input').forEach(function (inp) {
      inp.addEventListener('change', function () {
        inp.closest('.rate-row').classList.remove('is-missing');
        var v = {}; v[inp.name] = Number(inp.value); onChange(v);
      });
    });
    document.getElementById('next').addEventListener('click', function () {
      var res = readRatings(app);
      var msg = app.querySelector('.form-missing');
      if (res.missing.length) {
        msg.hidden = false;
        var firstMissing = app.querySelector('.rate-row.is-missing');
        if (firstMissing) firstMissing.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      msg.hidden = true;
      onDone(res.values);
    });
  }

  /* The researcher tools on the debrief are hidden from participants:
     press Shift+D on this screen to show them (always shown in reviewer mode). */
  function closingScreen(app) {
    var t = C.text.closing;
    var all = Object.values(D.loadAll());
    var participantSessions = all.filter(function (s) { return !s.is_review; });
    var nextUrl = null;
    if (A.session.pid) {
      // Only the pid (and reviewer mode) carries over; settings in the link never do.
      var p = new URLSearchParams();
      p.set('pid', String(A.session.pid + 1));
      if (A.review) p.set('review', '1');
      nextUrl = location.pathname + '?' + p.toString();
    }
    var fill = { contact: esc(contact()) };
    app.innerHTML = page(t.title, U.fill(t.html, fill) +
      '<label class="consent withdraw"><input type="checkbox" id="withdraw"' + (A.session.withdrawn ? ' checked' : '') + '> <span>' + esc(t.withdrawLabel) + '</span></label>' +
      (A.review ? '' : '<p class="code-line">' + U.fill(t.codeLine, { code: '<b>' + esc(A.session.session_id) + '</b>' }) + '</p>') +
      '<p class="sync-status" id="sync-status" role="status"></p>' +
      U.fill(t.after || '', fill) +
      '<section class="researcher"' + (A.review ? '' : ' hidden') + ' id="researcher">' +
        '<h3>' + esc(t.researcherHeading) + '</h3>' +
        '<div class="researcher-body">' +
          (nextUrl ? '<a class="btn primary" href="' + esc(nextUrl) + '">Start next participant (pid ' + (A.session.pid + 1) + ')</a>' : '') +
          '<button class="btn secondary" id="dl-all" type="button">Download data (CSV)</button>' +
          '<a class="btn secondary" href="results.html" target="_blank" rel="noopener">Open results dashboard</a>' +
          '<p class="muted small">' + participantSessions.length + ' participant session(s) stored in this browser for this address' +
          (D.storageOK ? '' : ' — browser storage is unavailable, so the download holds only this session') + '.</p>' +
        '</div>' +
      '</section>');
    if (!A.review) {
      var reveal = function (e) {
        if (A.screen.name !== 'closing') return document.removeEventListener('keydown', reveal);
        if (e.shiftKey && (e.key === 'D' || e.key === 'd')) {
          var r = document.getElementById('researcher');
          if (r) r.hidden = false;
        }
      };
      document.addEventListener('keydown', reveal);
    }
    /* All participant sessions in this browser (this one included) in one file. */
    document.getElementById('dl-all').addEventListener('click', function () {
      var sessions = D.exportList(false);
      D.download('haitrust_data_' + D.fileStamp() + '.csv', D.toCSV(sessions.length ? sessions : [A.session]));
    });
    document.getElementById('withdraw').addEventListener('change', function (e) {
      A.session.withdrawn = e.target.checked ? 1 : 0;
      save();
      sync();
    });
    renderSyncStatus();
  }

  /* Status line on the last screen: saving / saved / could not reach the server. */
  function renderSyncStatus() {
    var el = document.getElementById('sync-status');
    if (!el) return;
    var t = C.text.remote, st = A.syncState, w = !!A.session.withdrawn;
    var fill = { contact: esc(contact()), code: '<b>' + esc(A.session.session_id) + '</b>' };
    var dl = function () { D.download('study-answers-' + A.session.session_id + '.json', JSON.stringify(A.session)); };
    if (!D.endpoint() || A.review) { el.className = 'sync-status'; el.textContent = A.review ? '' : (w ? t.savedWithdrawn : t.savedLocal); return; }
    if (st === 'confirmed') { el.className = 'sync-status is-ok'; el.textContent = w ? t.savedWithdrawn : t.saved; return; }
    if (st === 'saving' || st === 'idle') { el.className = 'sync-status'; el.textContent = t.saving; return; }
    if (st === 'sent') {
      // Sent, but the reply could not be read: almost certainly saved; offer a copy just in case.
      el.className = 'sync-status is-ok';
      el.innerHTML = esc(w ? t.savedWithdrawn : t.saved) + (w ? '' : ' <button type="button" class="link-btn" id="sync-download">' + esc(t.downloadCopy) + '</button>');
      if (!w) document.getElementById('sync-download').addEventListener('click', dl);
      return;
    }
    el.className = 'sync-status is-bad';
    el.innerHTML = U.fill(w ? t.failedWithdrawnHtml : t.failedHtml, fill) +
      ' <button type="button" class="btn secondary" id="sync-retry">' + esc(t.retry) + '</button>' +
      (w ? '' : ' <button type="button" class="btn secondary" id="sync-download">' + esc(t.download) + '</button>');
    document.getElementById('sync-retry').addEventListener('click', sync);
    if (!w) document.getElementById('sync-download').addEventListener('click', dl);
  }

  /* ------------------------------------------------------------------ */
  /* Items                                                               */
  /* ------------------------------------------------------------------ */
  function snapshot() { return Object.assign({ ui: A.session.ui }, A.session.options); }

  function startItem(index) {
    var id = A.seq[index], item = itemById(id);
    var practice = item.type === 'practice';
    // Started before and not finished (reload or closed tab): count it, so it can be
    // excluded, and keep the side the AI already recommended, so it never contradicts itself.
    var prev = A.session.items[id];
    var restarted = prev && !A.review ? (prev.restarted || 0) + (prev.done ? 0 : 1) : 0;
    var keepSide = prev && !A.review && !prev.done ? (prev.fixed_rec_side || prev.rec_side || null) : null;
    A.item = item;
    A.rec = A.session.items[id] = {
      restarted: restarted,
      fixed_rec_side: keepSide,
      item_id: id, item_type: item.type, is_practice: practice ? 1 : 0, seq_index: index,
      position: practice ? 0 : index - A.nPractice() + 1,
      started_at: new Date().toISOString(), t0: Date.now(), times: {}, step: 'first',
      first_value: null, first_answer: null, first_moves: 0,
      final_value: null, final_answer: null, final_moves: 0,
      rec_side: null, rec_position: null, turns: [],
      followup_clicked: 0, second_opinion_clicked: 0, ratings: {},
      jumped: 0, done: 0, snapshot: snapshot()
    };
  }

  /* Records ms since the scenario appeared (first occurrence only). */
  function mark(key) {
    var r = A.rec;
    if (r && r.times[key] == null) r.times[key] = Date.now() - r.t0;
  }

  /* The AI's words for a turn. Identical for both interfaces. */
  function turnText(turn) {
    var r = A.rec, item = A.item, o = A.opts();
    var side = r.rec_side || item.defaultSide;
    if (turn.kind === 'main') {
      var txt = item.replies[side];
      if (o.leanAsNumber === 'on') {
        txt += ' ' + U.fill(C.leanNumberTemplate, { A: item.optionA.label, B: item.optionB.label, pos: D.recPosition(side, item) });
      }
      return txt;
    }
    if (turn.kind === 'followup') return item.followUp[side];
    return item.secondOpinion[D.secondVariant(side, o.secondOpinion)];
  }

  function renderFrame() {
    var el = document.getElementById('frame');
    if (!el || !A.rec) return;
    var r = A.rec, o = A.opts();
    window.Frames.render(el, {
      ui: A.session.ui, options: o, item: A.item, rec: r,
      canAsk: r.step === 'ask', turnText: turnText, onAsk: onAsk,
      extras: {
        inFrame: o.optionalButtons === 'frame', enabled: r.step === 'reply', followUp: o.followUp === 'on', second: o.secondOpinion !== 'off',
        followupDone: !!r.followup_clicked, secondDone: !!r.second_opinion_clicked
      },
      onExtra: extra
    });
  }

  function renderPanel() {
    var el = document.getElementById('panel');
    if (!el || !A.rec) return;
    el.innerHTML = panelHTML(A.item, A.rec);
    wirePanel(el);
    // Bring the part that needs attention into view (the panel scrolls on its own).
    if (A.rec.step !== 'first') {
      var target = el.querySelector('.item-ratings, .answer--final.is-active, .hint');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    syncReview();
  }

  function optionsHTML(item) {
    var oa = item.optionA, ob = item.optionB;
    if (item.attributes && item.attributes.length) {
      return '<table class="compare"><thead><tr><th></th>' +
        [oa, ob].map(function (o) { return '<th><div class="compare-label">' + esc(o.label) + '</div><div class="compare-name">' + esc(o.name) + '</div><div class="compare-text">' + esc(o.text) + '</div></th>'; }).join('') +
        '</tr></thead><tbody>' +
        item.attributes.map(function (a) { return '<tr><th>' + esc(a.label) + '</th><td>' + esc(a.a) + '</td><td>' + esc(a.b) + '</td></tr>'; }).join('') +
        '</tbody></table>';
    }
    var q = item.type === 'emotional';
    return '<div class="options">' + [oa, ob].map(function (o) {
      return '<div class="option"><div class="option-label">' + esc(o.label) + '</div><div class="option-text">' +
        (q ? '“' : '') + esc(o.text) + (q ? '”' : '') + '</div></div>';
    }).join('') + '</div>';
  }

  function sliderHTML(which, item, rec) {
    var S = C.slider;
    var active = which === 'first' ? rec.step === 'first' : rec.step === 'reply';
    var val = which === 'first' ? rec.first_value : rec.final_value;
    var marker = which === 'final' && rec.first_answer != null
      ? '<div class="slider-marker" style="--v:' + (rec.first_answer * 100 / S.max) + '"><span>' + esc(S.firstMarker) + '</span></div>' : '';
    return '<div class="slider' + (val == null ? ' is-untouched' : '') + (active ? '' : ' is-locked') + (marker ? ' has-marker' : '') + '" data-slider="' + which + '">' +
      '<div class="slider-track">' + marker +
        '<input type="range" min="0" max="' + S.max + '" step="1" value="' + (val == null ? S.max / 2 : val) + '"' + (active ? '' : ' disabled') +
        ' aria-label="' + esc(item.question) + '">' +
      '</div>' +
      '<div class="slider-labels"><span>' + esc(U.fill(S.left, { A: item.optionA.label })) + '</span><span>' + esc(S.middle) + '</span><span>' + esc(U.fill(S.right, { B: item.optionB.label })) + '</span></div>' +
    '</div>';
  }

  function panelHTML(item, rec) {
    var P = C.text.panel, o = A.opts(), step = rec.step;
    var pending = rec.turns.some(function (t) { return !t.shown; });
    var head = rec.is_practice ? P.practiceLabel : U.fill(P.progress, { n: rec.position, total: A.nMain() });
    var h = '<div class="panel-head"><span class="pill' + (rec.is_practice ? ' pill--practice' : '') + '">' + esc(head) + '</span>' +
      (A.review && item.placeholder ? '<span class="pill pill--ph">placeholder content</span>' : '') + '</div>';
    if (A.review) {
      var warn = lengthWarnings(item);
      if (warn.length) h += '<ul class="len-warn" title="Reviewer mode only">' + warn.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul>';
    }
    h += '<div class="scenario">' + U.paras(item.scenario) + '</div>';
    h += optionsHTML(item);

    h += '<div class="answer' + (step === 'first' ? ' is-active' : ' is-done') + '">' +
      '<div class="answer-q">' + esc(item.question) + '</div>' +
      '<div class="answer-sub">' + esc(step === 'first' ? P.firstPrompt : P.firstDone) + '</div>' +
      sliderHTML('first', item, rec) +
      (step === 'first' ? '<div class="actions"><button class="btn primary" type="button" data-act="submit-first"' + (rec.first_value == null ? ' disabled' : '') + '>' + esc(P.submitFirst) + '</button></div>' : '') +
    '</div>';

    if (step === 'ask') h += '<div class="hint hint--go">' + esc(P.askHint) + '</div>';
    if (step === 'waiting') h += '<div class="hint">' + esc(P.waitingHint) + '</div>';

    if (step === 'reply' || step === 'ratings') {
      h += '<div class="answer answer--final' + (step === 'reply' ? ' is-active' : ' is-done') + '">' +
        '<div class="answer-q">' + esc(P.finalPrompt) + '</div>' +
        '<div class="answer-sub">' + esc(item.question) + ' ' + esc(P.finalSub) + '</div>' +
        sliderHTML('final', item, rec);
      if (step === 'reply') {
        var secondOn = o.secondOpinion !== 'off';
        h += (o.optionalButtons === 'frame' || (!secondOn && o.followUp !== 'on') ? '' :
          '<div class="optional"><span class="optional-label">' + esc(P.optionalHeading) + '</span>' +
          (o.followUp === 'on' ? '<button class="btn secondary" type="button" data-act="followup"' + (rec.followup_clicked ? ' disabled' : '') + '>' + esc(P.followUpButton) + '</button>' : '') +
          (secondOn ? '<button class="btn secondary" type="button" data-act="second"' + (rec.second_opinion_clicked ? ' disabled' : '') + '>' + esc(P.secondOpinionButton) + '</button>' : '') +
        '</div>') +
        '<div class="actions"><button class="btn primary" type="button" data-act="submit-final"' + (rec.final_value == null || pending ? ' disabled' : '') + '>' + esc(P.submitFinal) + '</button>' +
          '<span class="pending-note"' + (pending ? '' : ' hidden') + '>' + esc(P.pendingNote) + '</span></div>';
      }
      h += '</div>';
    }

    if (step === 'ratings') {
      var R = C.perItemRatings;
      h += '<div class="answer is-active item-ratings"><div class="answer-q">' + esc(P.ratingsHeading) + '</div>' +
        R.questions.map(function (q) { return rateRow(q.id, q.text, R.points, rec.ratings[q.id], q.low, q.high); }).join('') +
        '<p class="form-missing" hidden>' + esc(P.missing) + '</p>' +
        '<div class="actions"><button class="btn primary" type="button" data-act="ratings-next">' + esc(P.next) + '</button></div></div>';
    }
    return h;
  }

  function wirePanel(el) {
    el.querySelectorAll('[data-slider]').forEach(wireSlider);
    var on = function (act, fn) { var b = el.querySelector('[data-act="' + act + '"]'); if (b) b.addEventListener('click', fn); };
    on('submit-first', submitFirst);
    on('submit-final', submitFinal);
    on('followup', function () { extra('followup'); });
    on('second', function () { extra('second'); });
    on('ratings-next', submitRatings);
    el.querySelectorAll('.item-ratings input[type=radio]').forEach(function (inp) {
      inp.addEventListener('change', function () {
        A.rec.ratings[inp.name] = Number(inp.value);
        inp.closest('.rate-row').classList.remove('is-missing');
        save();
      });
    });
  }

  function wireSlider(wrap) {
    var input = wrap.querySelector('input');
    if (input.disabled) return;
    var key = wrap.getAttribute('data-slider');            // 'first' | 'final'
    var set = function () {
      A.rec[key + '_value'] = Number(input.value);
      wrap.classList.remove('is-untouched');
      mark(key + '_touch');
      updateControls();
    };
    input.addEventListener('pointerdown', set);
    input.addEventListener('keydown', function (e) { if (/^(Arrow|Home|End|Page)/.test(e.key)) set(); });
    input.addEventListener('input', set);
    input.addEventListener('change', function () { A.rec[key + '_moves']++; set(); save(); });
  }

  /* Updates buttons without rebuilding the panel (so a slider drag is never interrupted). */
  function updateControls() {
    var el = document.getElementById('panel');
    if (!el || !A.rec) return;
    var r = A.rec, pending = r.turns.some(function (t) { return !t.shown; });
    var b1 = el.querySelector('[data-act="submit-first"]'); if (b1) b1.disabled = r.first_value == null;
    var b2 = el.querySelector('[data-act="submit-final"]'); if (b2) b2.disabled = r.final_value == null || pending;
    var fu = el.querySelector('[data-act="followup"]'); if (fu) fu.disabled = !!r.followup_clicked;
    var so = el.querySelector('[data-act="second"]'); if (so) so.disabled = !!r.second_opinion_clicked;
    var pn = el.querySelector('.pending-note'); if (pn) pn.hidden = !pending;
  }

  function submitFirst() {
    var r = A.rec;
    if (r.step !== 'first' || r.first_value == null) return;
    r.first_answer = r.first_value;
    mark('first_submit');
    r.step = 'ask';
    renderPanel(); renderFrame(); save();
  }

  function onAsk() {
    var r = A.rec;
    if (!r || r.step !== 'ask') return;
    r.rec_side = r.fixed_rec_side || D.recSide(r.first_answer, A.item, A.opts().adviceDirection);
    r.rec_position = D.recPosition(r.rec_side, A.item);
    mark('ask');
    r.step = 'waiting';
    addTurn('main');
  }

  function extra(kind) {
    var r = A.rec;
    if (r.step !== 'reply') return;
    if (kind === 'followup') { if (r.followup_clicked) return; r.followup_clicked = 1; mark('followup_click'); }
    else { if (r.second_opinion_clicked || A.opts().secondOpinion === 'off') return; r.second_opinion_clicked = 1; mark('second_click'); }
    addTurn(kind);
  }

  /* Same delay for every turn, in both interfaces. */
  function addTurn(kind) {
    var r = A.rec, my = token;
    var turn = { kind: kind, requested_at: Date.now(), shown: false, shown_at: null };
    r.turns.push(turn);
    renderFrame();
    if (kind === 'main') renderPanel(); else updateControls();
    save();
    var delay = A.skipDelays ? 150 : Math.max(0, Number(A.opts().delayMs) || 0);
    setTimeout(function () {
      if (my !== token || A.rec !== r) return;
      turn.shown = true;
      turn.shown_at = Date.now();
      mark(kind === 'main' ? 'reply_shown' : kind === 'followup' ? 'followup_shown' : 'second_shown');
      if (kind === 'main') {
        r.step = 'reply';
        r.final_value = A.opts().finalSliderStart === 'first' ? r.first_answer : null;
        renderPanel();
      } else {
        updateControls();
      }
      renderFrame();
      save();
    }, delay);
  }

  function submitFinal() {
    var r = A.rec;
    if (r.step !== 'reply' || r.final_value == null || r.turns.some(function (t) { return !t.shown; })) return;
    r.final_answer = r.final_value;
    mark('final_submit');
    if (A.opts().perItemRatings === 'on') {
      r.step = 'ratings';
      renderPanel(); save();
    } else {
      finishItem();
    }
  }

  function submitRatings() {
    var el = document.querySelector('.item-ratings');
    var res = readRatings(el);
    el.querySelector('.form-missing').hidden = !res.missing.length;
    if (res.missing.length) return;
    Object.assign(A.rec.ratings, res.values);
    mark('ratings_submit');
    finishItem();
  }

  function finishItem() {
    var r = A.rec;
    r.done = 1;
    mark('done');
    save();
    var i = A.screen.index, np = A.nPractice();
    if (np > 0 && i === np - 1) A.go({ name: 'interlude' });
    else if (i + 1 < A.seq.length) A.go({ name: 'item', index: i + 1 });
    else A.go({ name: 'end' });
  }

  /* ------------------------------------------------------------------ */
  /* Reviewer hooks                                                      */
  /* ------------------------------------------------------------------ */
  A.setUI = function (ui) {
    A.session.ui = ui;
    if (A.rec) A.rec.snapshot = snapshot();
    A.persistReview(); save(); A.render();
  };

  /* Applies one option change, including its knock-on effects, without rendering. */
  function applyOption(key, val) {
    A.session.options[key] = val;
    if (key === 'itemOrder') {
      var currentId = A.rec ? A.rec.item_id : null;
      A.session.order = D.buildOrder(val, A.session.order_row % D.orderRows(val), A.session.order_seed).map(function (i) { return i.id; });
      A.buildSeq();
      if (currentId) {
        A.screen.index = A.seq.indexOf(currentId);
        A.rec.seq_index = A.screen.index;
        if (!A.rec.is_practice) A.rec.position = A.screen.index - A.nPractice() + 1;
      }
    }
    if (A.rec) {
      if (key === 'adviceDirection' && A.rec.rec_side) {
        A.rec.rec_side = D.recSide(A.rec.first_answer, A.item, val);
        A.rec.rec_position = D.recPosition(A.rec.rec_side, A.item);
      }
      if (key === 'finalSliderStart' && A.rec.step === 'reply' && !A.rec.times.final_touch) {
        A.rec.final_value = val === 'first' ? A.rec.first_answer : null;
      }
      A.rec.snapshot = snapshot();
    }
  }

  A.setOption = function (key, val) {
    applyOption(key, val);
    A.persistReview(); save(); A.render();
  };

  A.resetOptions = function () {
    var defs = D.defaultOptions();
    Object.keys(defs).forEach(function (k) {
      if (A.session.options[k] !== defs[k]) applyOption(k, defs[k]);
    });
    A.persistReview(); save(); A.render();
  };

  A.setSkipDelays = function (v) { A.skipDelays = !!v; A.persistReview(); };

  /* target: 'intro' | 'instructions' | 'interlude' | 'end' | 'scen' | 'closing' | 'item:<id>' */
  A.jump = function (target, step) {
    if (target.indexOf('item:') === 0) {
      var idx = A.seq.indexOf(target.slice(5));
      if (idx >= 0) A.go({ name: 'item', index: idx, jumpStep: Number(step) || 1 });
    } else {
      A.go({ name: target });
    }
  };

  /* Fakes the earlier steps so a reviewer can land on any step. Flagged in the data. */
  function applyJump(step) {
    var r = A.rec, o = A.opts();
    if (step <= 1) return;
    r.jumped = 1;
    r.first_value = r.first_answer = Math.round(C.slider.max * 0.3);
    r.times.first_submit = 0;
    r.step = 'ask';
    if (step >= 3) {
      r.rec_side = D.recSide(r.first_answer, A.item, o.adviceDirection);
      r.rec_position = D.recPosition(r.rec_side, A.item);
      r.turns.push({ kind: 'main', requested_at: Date.now(), shown: true, shown_at: Date.now() });
      r.step = 'reply';
      r.final_value = o.finalSliderStart === 'first' ? r.first_answer : null;
    }
    if (step >= 4 && o.perItemRatings === 'on') {
      if (r.final_value == null) r.final_value = r.first_answer;
      r.final_answer = r.final_value;
      r.step = 'ratings';
    }
  }

  /* Reviewer-mode length check: texts that should match in length but drift
     apart (see the writing rules above the items in config.js). */
  function lengthWarnings(item) {
    var words = function (t) { return String(t || '').split(/\s+/).filter(Boolean).length; };
    var out = [];
    var check = function (what, texts, limit) {
      var n = texts.map(words), hi = Math.max.apply(null, n), lo = Math.min.apply(null, n);
      if (hi && (hi - lo) / hi > limit) out.push(what + ' differ in length: ' + n.join(' / ') + ' words (limit ' + Math.round(limit * 100) + '%).');
    };
    if (item.replies) check('Replies A / B', [item.replies.A, item.replies.B], 0.10);
    if (item.followUp) check('Explanations A / B', [item.followUp.A, item.followUp.B], 0.15);
    if (item.secondOpinion) check('Second opinions A / B / neutral', [item.secondOpinion.A, item.secondOpinion.B, item.secondOpinion.neutral], 0.15);
    if (item.pair) {
      var partner = C.items.filter(function (x) { return x.pair === item.pair && x.id !== item.id; })[0];
      if (partner) check('Scenarios ' + item.id + ' / ' + partner.id + ' (' + item.pair + ')', [item.scenario, partner.scenario], 0.15);
    }
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* Config checks (shown on screen so typos in config.js are easy to find) */
  /* ------------------------------------------------------------------ */
  function validateConfig() {
    var p = [], seen = {};
    if (!C || !Array.isArray(C.items)) {
      return ['config.js did not load. This is usually a typo such as a missing comma or quote. ' +
        'Open the browser console (Chrome: Cmd+Option+J, Safari: Cmd+Option+C) to see the line number.'];
    }
    if (!C.items.some(function (i) { return i.type === 'emotional' || i.type === 'analytical'; })) {
      p.push('config.js needs at least one emotional or analytical item.');
    }
    C.items.forEach(function (it, n) {
      var where = 'Item ' + (it.id || '#' + (n + 1));
      if (!it.id) p.push(where + ': missing id.');
      if (seen[it.id]) p.push(where + ': duplicate id.');
      seen[it.id] = true;
      if (['practice', 'emotional', 'analytical'].indexOf(it.type) < 0) p.push(where + ': type must be practice, emotional or analytical.');
      ['title', 'scenario', 'question', 'askText'].forEach(function (f) { if (!it[f]) p.push(where + ': missing ' + f + '.'); });
      ['optionA', 'optionB'].forEach(function (f) {
        if (!it[f] || !it[f].label || !it[f].name || !it[f].text) p.push(where + ': ' + f + ' needs label, name and text.');
      });
      if (['A', 'B'].indexOf(it.defaultSide) < 0) p.push(where + ': defaultSide must be "A" or "B".');
      if (!(it.strength > C.slider.max / 2 && it.strength <= C.slider.max)) p.push(where + ': strength should be above ' + (C.slider.max / 2) + ' and at most ' + C.slider.max + '.');
      ['replies', 'followUp'].forEach(function (f) {
        if (!it[f] || !it[f].A || !it[f].B) p.push(where + ': ' + f + ' needs both A and B.');
      });
      if (!it.secondOpinion || !it.secondOpinion.A || !it.secondOpinion.B || !it.secondOpinion.neutral) p.push(where + ': secondOpinion needs A, B and neutral.');
    });
    return p;
  }

  function showConfigProblems(problems, heading) {
    var box = document.createElement('div');
    box.className = 'config-errors';
    box.innerHTML = '<strong>' + esc(heading || 'Problems in config.js') + '</strong><ul>' + problems.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
    document.body.insertBefore(box, document.body.firstChild);
  }

  /* Things that are fine for testing but must be set before real participants. */
  function deployWarnings() {
    var p = [], dc = C.dataCollection || {};
    if (!D.endpoint()) p.push('No data endpoint in config.js → dataCollection.endpoint: answers stay in each participant’s own browser and never reach you. Fine for in-person sessions only.');
    if (!contact() || /\[|\]/.test(contact())) p.push('Set your contact email in config.js → dataCollection.contact (participants see it on the first and last screen).');
    if (/mockup|draft/i.test(C.version || '')) p.push('config.js → version still says "' + C.version + '".');
    if (dc.endpoint && !/^https:\/\/script\.google\.com\/(a\/macros\/[^/]+|macros)\/s\/.+\/exec$/.test(D.endpoint())) p.push('The endpoint does not look like a Google Apps Script web-app address (https://script.google.com/macros/s/…/exec).');
    return p;
  }
})();
