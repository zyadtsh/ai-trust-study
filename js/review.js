/* Reviewer mode (?review=1): switch interface, jump anywhere, flip design
   options (with notes on what each implies), and look at / export data.
   Nothing here is visible to participants. */
(function () {
  'use strict';
  var C = window.STUDY_CONFIG;
  var D = window.Data;
  var esc = function (s) { return U.esc(s); };
  var R = {};
  window.Review = R;
  var bar, drawer, label, view = null;

  R.init = function () {
    if (!window.App.review) return;
    document.body.classList.add('is-review');
    bar = document.getElementById('review-bar');
    drawer = document.getElementById('drawer');
    bar.hidden = false;
    renderBar();
    label = document.getElementById('rb-where');
    // The bar wraps onto two lines on narrower screens; keep the page offset in step with it.
    var setHeight = function () { document.body.style.setProperty('--rb-h', bar.offsetHeight + 'px'); };
    setHeight();
    if (window.ResizeObserver) new ResizeObserver(setHeight).observe(bar);
    else window.addEventListener('resize', setHeight);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDrawer(); });
  };

  function screens() {
    var A = window.App, list = [['intro', 'Intro / consent'], ['instructions', 'Instructions']];
    A.seq.forEach(function (id, i) {
      var it = C.items.filter(function (x) { return x.id === id; })[0];
      var pos = it.type === 'practice' ? 'practice' : '#' + (i - A.nPractice() + 1) + ' · ' + it.type;
      list.push(['item:' + id, id + ' · ' + pos]);
      if (A.nPractice() > 0 && i === A.nPractice() - 1) list.push(['interlude', 'After practice']);
    });
    list.push(['end', 'End questions'], ['scen', 'Scenario ratings'], ['closing', 'Closing / debrief']);
    return list;
  }

  function renderBar() {
    bar.innerHTML =
      '<span class="rb-badge">Reviewer mode</span>' +
      '<div class="rb-group"><span class="rb-label">Interface</span>' +
        '<div class="seg" id="rb-ui"><button type="button" data-ui="chat">Messaging</button><button type="button" data-ui="tool">Tool</button></div></div>' +
      '<div class="rb-group"><span class="rb-label">Go to</span>' +
        '<select id="rb-screen" aria-label="Screen"></select>' +
        '<select id="rb-step" aria-label="Step">' +
          '<option value="1">Step 1 · first answer</option><option value="2">Step 2 · ask</option>' +
          '<option value="3">Step 3 · reply + final</option><option value="4">Step 4 · item ratings</option>' +
        '</select>' +
        '<button type="button" class="rb-btn" id="rb-go">Go</button></div>' +
      '<label class="rb-check"><input type="checkbox" id="rb-skip"> Skip delays</label>' +
      '<span class="rb-spacer"></span>' +
      '<span class="rb-where" id="rb-where" title="Where you are: quote this in comments"></span>' +
      '<button type="button" class="rb-btn rb-btn--hi" id="rb-options">Design options</button>' +
      '<button type="button" class="rb-btn" id="rb-data">Data</button>' +
      '<button type="button" class="rb-btn" id="rb-new" title="Start over at the intro with a new session id">New session</button>';

    bar.querySelectorAll('#rb-ui button').forEach(function (b) {
      b.addEventListener('click', function () { window.App.setUI(b.getAttribute('data-ui')); });
    });
    document.getElementById('rb-go').addEventListener('click', function () {
      window.App.jump(document.getElementById('rb-screen').value, document.getElementById('rb-step').value);
    });
    document.getElementById('rb-screen').addEventListener('change', function () {
      document.getElementById('rb-step').disabled = this.value.indexOf('item:') !== 0;
    });
    var skip = document.getElementById('rb-skip');
    skip.checked = window.App.skipDelays;
    skip.addEventListener('change', function () { window.App.setSkipDelays(skip.checked); });
    document.getElementById('rb-options').addEventListener('click', function () { toggleDrawer('options'); });
    document.getElementById('rb-data').addEventListener('click', function () { toggleDrawer('data'); });
    document.getElementById('rb-new').addEventListener('click', function () { location.reload(); });
  }

  /* Called after every render: keep the bar, label and open drawer in sync. */
  R.sync = function () {
    if (!bar) return;
    var A = window.App;
    bar.querySelectorAll('#rb-ui button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-ui') === A.session.ui); });
    var sel = document.getElementById('rb-screen');
    var current = A.screen && A.screen.name === 'item' ? 'item:' + A.rec.item_id : (A.screen ? A.screen.name : 'intro');
    sel.innerHTML = screens().map(function (s) { return '<option value="' + esc(s[0]) + '"' + (s[0] === current ? ' selected' : '') + '>' + esc(s[1]) + '</option>'; }).join('');
    var stepSel = document.getElementById('rb-step');
    stepSel.disabled = current.indexOf('item:') !== 0;
    var step4 = stepSel.querySelector('option[value="4"]');
    var ratingsOff = A.session.options.perItemRatings !== 'on';
    step4.disabled = ratingsOff;
    step4.textContent = ratingsOff ? 'Step 4 · item ratings (off)' : 'Step 4 · item ratings';
    if (A.rec) stepSel.value = String({ first: 1, ask: 2, waiting: 2, reply: 3, ratings: 4 }[A.rec.step]);
    label.textContent = A.screenLabel() + ' · ' + (A.session.ui === 'chat' ? 'Messaging' : 'Tool');
    if (view === 'options') renderOptions();
    if (view === 'data') renderData();
  };

  /* ------------------------------------------------------------------ */
  function toggleDrawer(which) {
    if (view === which) return closeDrawer();
    view = which;
    drawer.hidden = false;
    document.body.classList.add('drawer-open');
    document.getElementById('rb-options').classList.toggle('on', which === 'options');
    document.getElementById('rb-data').classList.toggle('on', which === 'data');
    if (which === 'options') renderOptions(); else renderData();
  }

  function closeDrawer() {
    view = null;
    if (drawer) drawer.hidden = true;
    document.body.classList.remove('drawer-open');
    ['rb-options', 'rb-data'].forEach(function (id) { var b = document.getElementById(id); if (b) b.classList.remove('on'); });
  }

  function drawerHead(title) {
    return '<div class="dr-head"><h2>' + esc(title) + '</h2><button type="button" class="dr-close" aria-label="Close">×</button></div>';
  }

  function wireClose() {
    drawer.querySelector('.dr-close').addEventListener('click', closeDrawer);
  }

  /* ------------------------------------------------------------------ */
  /* Design options                                                      */
  /* ------------------------------------------------------------------ */
  function optionBlock(key, def, current) {
    var h = '<section class="opt" data-key="' + esc(key) + '"><h3>' + esc(def.label) + '</h3>' +
      (def.what ? '<p class="opt-what">' + esc(def.what) + '</p>' : '');
    if (def.type === 'number') {
      h += '<div class="opt-num"><input type="number" data-num="' + esc(key) + '" value="' + esc(current) + '" min="' + esc(def.min) + '" max="' + esc(def.max) + '" step="' + esc(def.step || 1) + '">' +
        '<span class="muted small">default ' + esc(def['default']) + '</span></div>' +
        '<ul class="opt-notes"><li class="on">' + esc(def.note) + '</li></ul>';
      return h + '</section>';
    }
    var choices = Object.keys(def.choices);
    h += '<div class="seg seg--light" role="group" aria-label="' + esc(def.label) + '">' + choices.map(function (v) {
      return '<button type="button" data-opt="' + esc(key) + '" data-val="' + esc(v) + '" class="' + (current === v ? 'on' : '') + '">' +
        esc(def.choices[v].label) + (def['default'] === v ? ' <small>default</small>' : '') + '</button>';
    }).join('') + '</div>';
    h += '<ul class="opt-notes">' + choices.map(function (v) {
      return '<li class="' + (current === v ? 'on' : '') + '"><b>' + esc(def.choices[v].label) + ':</b> ' + esc(def.choices[v].note) + '</li>';
    }).join('') + '</ul>';
    return h + '</section>';
  }

  function renderOptions() {
    var A = window.App, o = A.session.options;
    var scrollTop = drawer.scrollTop;
    var h = drawerHead('Design options') +
      '<p class="dr-intro">Each switch changes the study live, so you can compare versions side by side. ' +
      'The defaults (what participants get) are set in <code>config.js</code> → <code>designOptions</code>. ' +
      'Choices made here are remembered for reviewer mode in this browser only.</p>';
    h += optionBlock('ui', C.interfaceInfo, A.session.ui);
    Object.keys(C.designOptions).forEach(function (k) { h += optionBlock(k, C.designOptions[k], o[k]); });
    h += '<div class="dr-foot"><button type="button" class="btn secondary" id="dr-reset">Reset all options to defaults</button>' +
      '<p class="muted small">Some options only show up at certain steps: e.g. “Get an explanation” and the second opinion appear once the reply is shown (step 3).</p></div>';
    drawer.innerHTML = '<div class="dr-panel">' + h + '</div>';
    drawer.scrollTop = scrollTop;
    wireClose();
    drawer.querySelectorAll('[data-opt]').forEach(function (b) {
      b.addEventListener('click', function () {
        var key = b.getAttribute('data-opt'), val = b.getAttribute('data-val');
        if (key === 'ui') A.setUI(val); else A.setOption(key, val);
      });
    });
    drawer.querySelectorAll('[data-num]').forEach(function (inp) {
      inp.addEventListener('change', function () {
        var key = inp.getAttribute('data-num'), v = D.coerceOption(key, inp.value);
        if (v !== undefined) A.setOption(key, v);
      });
    });
    document.getElementById('dr-reset').addEventListener('click', function () { A.resetOptions(); });
  }

  /* ------------------------------------------------------------------ */
  /* Data                                                                */
  /* ------------------------------------------------------------------ */
  function renderData() {
    var A = window.App, s = A.session;
    var rows = D.rows(s);
    var all = Object.values(D.loadAll());
    var nReview = all.filter(function (x) { return x.is_review; }).length;
    var cols = [
      ['trial_number', '#'], ['item_id', 'item'], ['decision_type', 'type'], ['first_answer', 'first'], ['ai_recommended', 'AI rec.'],
      ['final_answer', 'final'], ['moved_toward_ai', 'moved to AI'], ['weight_of_advice', 'WOA'], ['asked_second_opinion', '2nd op.'],
      ['switched_to_ai', 'switched'], ['sec_first_answer', 'read s'], ['sec_final_answer', 'decide s']
    ];
    var table = rows.length
      ? '<div class="table-scroll"><table class="data-table"><thead><tr>' + cols.map(function (c) { return '<th>' + esc(c[1]) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        rows.map(function (r) { return '<tr>' + cols.map(function (c) { return '<td>' + esc(r[c[0]]) + '</td>'; }).join('') + '</tr>'; }).join('') +
        '</tbody></table></div>'
      : '<p class="muted">No items reached yet in this session.</p>';

    var scrollTop = drawer.scrollTop;
    drawer.innerHTML = '<div class="dr-panel">' + drawerHead('Data') +
      '<dl class="kv">' +
        '<dt>Session</dt><dd><code>' + esc(s.session_id) + '</code> (reviewer session, flagged <code>is_review=1</code>)</dd>' +
        '<dt>pid</dt><dd>' + esc(s.pid == null ? '— (none: random assignment)' : s.pid) + '</dd>' +
        '<dt>Assignment</dt><dd>' + esc(s.assignment_method) + ', order row ' + esc(s.order_row) + '</dd>' +
        '<dt>Item order</dt><dd>' + esc(s.order.join(' → ')) + '</dd>' +
      '</dl>' +
      '<h3>This session</h3>' + table +
      '<div class="dr-actions">' +
        '<button type="button" class="btn secondary" id="dl-all">Download data (CSV)</button>' +
        '<a class="btn secondary" href="results.html" target="_blank" rel="noopener">Open results dashboard</a>' +
        '<label class="rb-inline"><input type="checkbox" id="dl-incl-review"> include reviewer sessions</label>' +
      '</div>' +
      '<p class="muted small">' + all.length + ' session(s) stored in this browser (' + nReview + ' from reviewer mode).' +
        (D.storageOK ? '' : ' Browser storage is unavailable here, so nothing is stored to export.') + '</p>' +
      '<div class="dr-danger"><button type="button" class="btn danger" id="dl-clear">Delete all stored sessions…</button></div>' +
    '</div>';
    drawer.scrollTop = scrollTop;
    wireClose();
    document.getElementById('dl-all').addEventListener('click', function () {
      D.download('haitrust_data_' + D.fileStamp() + '.csv', D.toCSV(D.exportList(document.getElementById('dl-incl-review').checked)));
    });
    document.getElementById('dl-clear').addEventListener('click', function () {
      var n = Object.keys(D.loadAll()).length;
      if (window.confirm('Permanently delete all ' + n + ' stored session(s) from this browser? Download them first if you need them. This cannot be undone.')) {
        D.clearAll();
        D.save(s);   // keep the current reviewer session so the page keeps working
        renderData();
      }
    });
  }
})();
