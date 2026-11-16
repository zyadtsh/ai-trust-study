/* The two interface frames.
   Both get exactly the same AI text from app.js (ctx.turnText) and the same
   timing; only the presentation differs. Nothing in here writes AI words.

   ctx = { ui, options, item, rec, canAsk, turnText(turn), onAsk(),
           extras: { inFrame, enabled, followUp, followupDone, secondDone }, onExtra(kind) } */
(function () {
  'use strict';
  var C = window.STUDY_CONFIG;
  var esc = function (s) { return U.esc(s); };
  var F = {};

  F.render = function (el, ctx) {
    el.innerHTML = ctx.ui === 'chat' ? chat(ctx) : tool(ctx);
    var ask = el.querySelector('[data-act="ask"]');
    if (ask) ask.addEventListener('click', ctx.onAsk);
    el.querySelectorAll('[data-extra]').forEach(function (b) {
      b.addEventListener('click', function () { ctx.onExtra(b.getAttribute('data-extra')); });
    });
    el.querySelectorAll('[data-scroll]').forEach(scrollToLatest);
  };

  /* Same rule in both frames: while waiting, show the bottom (typing dots /
     progress bar); once a reply is shown, show it from its first line, plus as
     much of the participant's request above it as fits. */
  function scrollToLatest(sc) {
    var max = sc.scrollHeight - sc.clientHeight;
    var latest = sc.querySelectorAll('[data-latest]');
    var ai = latest[latest.length - 1];
    if (!ai || ai.hasAttribute('data-pending')) { sc.scrollTop = max; return; }
    var req = ai.previousElementSibling;
    if (req && !req.classList.contains('msg--out')) req = null;
    var room = sc.clientHeight - ai.offsetHeight - 24;
    var extra = req && room > 0 ? Math.min(req.offsetHeight + 10, room) : 0;
    sc.scrollTop = Math.max(0, Math.min(max, ai.offsetTop - 12 - extra));
  }

  function extraButtons(ctx, cls) {
    var x = ctx.extras, P = C.text.panel;
    if (!x || !x.inFrame || !x.enabled) return '';
    var b = function (kind, label, done) {
      return '<button type="button" class="' + cls + '" data-extra="' + kind + '"' + (done ? ' disabled' : '') + '>' + esc(label) + '</button>';
    };
    return (x.followUp ? b('followup', P.followUpButton, x.followupDone) : '') + b('second', P.secondOpinionButton, x.secondDone);
  }

  function recLabel(ctx) {
    var side = ctx.rec.rec_side || ctx.item.defaultSide;
    return ctx.item['option' + side].label;
  }

  /* ================================================================== */
  /* Messaging                                                           */
  /* ================================================================== */
  function chat(ctx) {
    var t = C.interfaceText.chat, o = ctx.options;
    var persona = o.chatIdentity === 'persona';
    var name = persona ? t.personaName : t.name;
    var status = persona ? t.personaStatus : t.status;
    var separate = o.secondOpinionSource !== 'same';
    var secondName = persona ? t.secondPersonaName : t.secondName;
    var avatar = function (extra, who) {
      var n = who || name;
      return '<div class="avatar' + (persona ? ' avatar--persona' : '') + (extra ? ' ' + extra : '') +
        '" aria-hidden="true">' + esc(who === secondName && !persona ? '2' : n.charAt(0)) + '</div>';
    };
    var turns = ctx.rec.turns;
    var log = '';
    if (turns.length) log += '<div class="chat-day">' + esc(t.today) + '</div>';

    turns.forEach(function (turn) {
      var fromSecond = turn.kind === 'second' && separate;
      var who = fromSecond ? secondName : name;
      var av = avatar('avatar--sm' + (fromSecond ? ' avatar--second' : ''), who);
      var out = turn.kind === 'main' ? askBubble(ctx.item)
        : esc(turn.kind === 'followup' ? U.fill(t.followUpPrompt, { option: recLabel(ctx) }) : t.secondOpinionPrompt);
      var caption = turn.kind === 'second'
        ? '<div class="msg-caption">' + esc(fromSecond ? secondName + ' · ' + t.secondOpinionCaption : t.secondOpinionCaption) + '</div>' : '';
      log += '<div class="turn">' +
        '<div class="msg msg--out"><div class="bubble">' + out + '</div>' +
          '<div class="msg-meta">' + esc(U.clock(turn.requested_at)) + '</div></div>';
      if (turn.shown) {
        log += '<div class="msg msg--in" data-latest>' + av + '<div class="msg-col">' + caption +
          '<div class="bubble bubble--ai">' + U.paras(ctx.turnText(turn)) + '</div>' +
          '<div class="msg-meta">' + esc(U.clock(turn.shown_at)) + '</div></div></div>';
      } else {
        log += '<div class="msg msg--in" data-latest data-pending>' + av + '<div class="msg-col">' + caption +
          '<div class="bubble bubble--typing" role="status" aria-label="' + esc(who) + ' is typing"><span></span><span></span><span></span></div>' +
          '</div></div>';
      }
      log += '</div>';
    });

    var asked = turns.length > 0;
    var composer = asked
      ? '<div class="composer-field is-empty">' + esc(t.composerPlaceholder) + '</div>' +
        '<button class="send-btn" type="button" disabled>' + esc(t.sendButton) + '</button>'
      : '<div class="composer-field' + (ctx.canAsk ? '' : ' is-locked') + '">' + esc(ctx.item.askText) + '</div>' +
        '<button class="send-btn' + (ctx.canAsk ? ' is-ready' : '') + '" type="button" data-act="ask"' + (ctx.canAsk ? '' : ' disabled') + '>' + esc(t.sendButton) + '</button>';
    var chips = extraButtons(ctx, 'chip');

    return '<div class="chat' + (o.chatCues === 'minimal' ? ' chat--minimal' : '') + '" data-frame="chat">' +
      '<header class="chat-head">' + avatar() +
        '<div class="chat-id"><div class="chat-name">' + esc(name) + '</div><div class="chat-status">' + esc(status) + '</div></div>' +
      '</header>' +
      '<div class="chat-log" data-scroll>' + log + '</div>' +
      (chips ? '<div class="chips">' + chips + '</div>' : '') +
      (!asked && !ctx.canAsk ? '<div class="frame-lock">' + esc(t.lockedHint) + '</div>' : '') +
      '<footer class="composer">' + composer + '</footer>' +
    '</div>';
  }

  /* The participant's outgoing message: the request plus the two options
     (the same inputs the Tool shows in its cells). */
  function askBubble(item) {
    var hasAttrs = item.attributes && item.attributes.length;
    var opt = function (key, o) {
      if (hasAttrs) {
        return '<div class="quote"><b>' + esc(o.label) + ': ' + esc(o.name) + '</b><br>' + esc(o.text) + '<br>' +
          item.attributes.map(function (a) { return esc(a.label) + ' ' + esc(key === 'A' ? a.a : a.b); }).join(' · ') +
          '</div>';
      }
      var q = item.type === 'emotional';
      return '<div class="quote"><b>' + esc(o.label) + ':</b> ' + (q ? '“' : '') + esc(o.text) + (q ? '”' : '') + '</div>';
    };
    return '<div>' + esc(item.askText) + '</div>' + opt('A', item.optionA) + opt('B', item.optionB);
  }

  /* ================================================================== */
  /* Tool                                                                */
  /* ================================================================== */
  function queryText(ctx) {
    return ctx.options.toolQuery === 'terse' && ctx.item.toolQuery ? ctx.item.toolQuery : ctx.item.askText;
  }

  function tool(ctx) {
    var t = C.interfaceText.tool;
    var look = ctx.options.toolLook;
    var item = ctx.item;
    var turns = ctx.rec.turns;
    var pending = turns.some(function (x) { return !x.shown; });
    var status = pending ? t.running : t.ready;
    var runEnabled = ctx.canAsk && turns.length === 0;
    var runBtn = '<button class="run-btn' + (runEnabled ? ' is-ready' : '') + '" type="button" data-act="ask"' + (runEnabled ? '' : ' disabled') + '>' +
      '<span class="run-icon" aria-hidden="true">▶</span>' + esc(t.runButton) + '</button>';
    var lock = !turns.length && !ctx.canAsk ? '<div class="frame-lock">' + esc(t.lockedHint) + '</div>' : '';

    if (look === 'light') {
      return '<div class="tool tool--light" data-frame="tool">' +
        '<div class="tl-head">' + esc(t.lightTitle) + '</div>' +
        '<div class="tl-body">' +
          '<div class="tl-label">' + esc(t.inputsLabel) + '</div>' + inputsTable(item, t) +
          '<div class="tl-label">' + esc(t.queryLabel) + '</div><div class="tl-query">' + esc(queryText(ctx)) + '</div>' +
          '<div class="tl-actions">' + runBtn + '<span class="tl-status">' + esc(status) + '</span></div>' +
          lock +
        '</div>' +
        output(ctx, t, 'inputs') +
      '</div>';
    }

    var g = gridModel(item, t, queryText(ctx));
    var range = 'B2:C' + g.lastDataRow;
    var formula = '=' + t.fn + '(' + range + ', B' + g.queryRow + ')';
    var full = look === 'full';
    return '<div class="tool tool--' + look + '" data-frame="tool">' +
      (full
        ? '<div class="tool-title"><span class="doc-icon" aria-hidden="true"></span>' + esc(t.appTitle) + '</div>' +
          '<div class="tool-menu" aria-hidden="true">' + t.menus.map(function (m) { return '<span>' + esc(m) + '</span>'; }).join('') + '</div>' +
          '<div class="tool-toolbar">' + toolbarIcons() + '<span class="tb-sep"></span>' + runBtn + '</div>'
        : '') +
      '<div class="formula-bar"><span class="cellref">D2</span><span class="fx">fx</span><code>' + esc(formula) + '</code>' + (full ? '' : runBtn) + '</div>' +
      lock +
      '<div class="grid-wrap">' + grid(g, turns, t) + '</div>' +
      output(ctx, t, range) +
      (full
        ? '<div class="tool-tabs"><span class="tab on">' + esc(t.sheetName) + '</span><span class="tab">+</span></div>' +
          '<div class="tool-status"><span>' + esc(status) + '</span>' + (pending ? '<span class="bar"><i></i></span>' : '') + '</div>'
        : '') +
    '</div>';
  }

  function toolbarIcons() {
    var icons = ['↶', '↷', '|', 'B', 'I', 'U', '|', 'Σ', '↕', '≣', '%', '.00'];
    return icons.map(function (i) {
      return i === '|' ? '<span class="tb-sep"></span>' : '<span class="tb-icon" aria-hidden="true">' + esc(i) + '</span>';
    }).join('');
  }

  /* Rows of the sheet. The Name row only appears for items with numeric
     attributes, so the Tool never shows option summaries the other frame lacks. */
  function gridModel(item, t, query) {
    var hasAttrs = item.attributes && item.attributes.length;
    var rows = [];
    rows.push({ cells: [t.fieldHeader, item.optionA.label, item.optionB.label, t.resultHeader], head: true });
    if (hasAttrs) rows.push({ cells: [t.nameRow, item.optionA.name, item.optionB.name, ''] });
    rows.push({ cells: [item.type === 'emotional' ? t.textRowEmotional : t.textRowOther, item.optionA.text, item.optionB.text, ''], wrap: true });
    (item.attributes || []).forEach(function (a) { rows.push({ cells: [a.label, a.a, a.b, ''], num: true }); });
    rows[1].cells[3] = '__RESULT__';
    var lastDataRow = rows.length;
    rows.push({ cells: ['', '', '', ''] });
    rows.push({ query: true, cells: [t.queryRow, query] });
    var queryRow = rows.length;
    while (rows.length < 12) rows.push({ cells: ['', '', '', ''] });
    return { rows: rows, lastDataRow: lastDataRow, queryRow: queryRow };
  }

  function grid(g, turns, t) {
    var main = turns.filter(function (x) { return x.kind === 'main'; })[0];
    var resultCell = !main ? '' : !main.shown
      ? '<span class="cell-busy">' + esc(t.running) + '</span>'
      : '<span class="cell-link">→ ' + esc(t.outputTitle) + ' 1</span>';
    var cols = '<colgroup><col class="c-n"><col class="c-a"><col class="c-b"><col class="c-c"><col class="c-d"><col class="c-e"></colgroup>';
    var head = '<tr class="col-heads"><th class="corner"></th>' + ['A', 'B', 'C', 'D', 'E'].map(function (c) { return '<th>' + c + '</th>'; }).join('') + '</tr>';
    var body = g.rows.map(function (r, i) {
      var cells;
      if (r.query) {
        cells = '<td class="is-field">' + esc(r.cells[0]) + '</td><td colspan="3">' + esc(r.cells[1]) + '</td>';
      } else {
        cells = r.cells.map(function (c, j) {
          var isResult = c === '__RESULT__';
          var cls = [j === 0 ? 'is-field' : '', isResult ? 'is-selected' : '', r.num && j > 0 ? 'is-num' : ''].join(' ').trim();
          return '<td' + (cls ? ' class="' + cls + '"' : '') + '>' + (isResult ? resultCell : esc(c)) + '</td>';
        }).join('');
      }
      return '<tr class="' + (r.head ? 'is-head' : '') + (r.wrap ? ' is-wrap' : '') + '"><th>' + (i + 1) + '</th>' + cells + '<td></td></tr>';
    }).join('');
    return '<table class="grid">' + cols + head + body + '</table>';
  }

  function inputsTable(item, t) {
    var hasAttrs = item.attributes && item.attributes.length;
    var rows = (hasAttrs ? [[t.nameRow, item.optionA.name, item.optionB.name]] : [])
      .concat([[item.type === 'emotional' ? t.textRowEmotional : t.textRowOther, item.optionA.text, item.optionB.text]])
      .concat((item.attributes || []).map(function (a) { return [a.label, a.a, a.b]; }));
    return '<table class="tl-table"><thead><tr><th></th><th>' + esc(item.optionA.label) + '</th><th>' + esc(item.optionB.label) + '</th></tr></thead><tbody>' +
      rows.map(function (r) { return '<tr><th>' + esc(r[0]) + '</th><td>' + esc(r[1]) + '</td><td>' + esc(r[2]) + '</td></tr>'; }).join('') +
      '</tbody></table>';
  }

  /* Output panel: one numbered output per AI turn, same text as the chat. */
  function output(ctx, t, range) {
    var turns = ctx.rec.turns;
    var pending = turns.some(function (x) { return !x.shown; });
    var secondNote = ctx.options.secondOpinionSource === 'same' ? t.secondSameNote : t.secondSeparateNote;
    var runs = turns.map(function (turn, i) {
      var fn = turn.kind === 'followup'
        ? t.explainFn + '(' + t.outputTitle + ' 1)'
        : t.fn + '(' + range + ')' + (turn.kind === 'second' ? ' · ' + secondNote : '');
      var cap = turn.kind === 'second' ? '<span class="run-cap">' + esc(t.secondOpinionCaption) + '</span>' : '';
      var head = '<div class="run-head"><span class="run-n">' + esc(t.outputTitle) + ' ' + (i + 1) + '</span><code>' + esc(fn) + '</code>' + cap +
        '<span class="run-time">' + (turn.shown ? esc(U.clock(turn.shown_at)) : '') + '</span></div>';
      var body = turn.shown
        ? '<div class="run-body">' + U.paras(ctx.turnText(turn)) + '</div>'
        : '<div class="run-body is-busy" role="status"><span class="bar"><i></i></span><span>' + esc(t.running) + '</span></div>';
      return '<div class="run" data-latest' + (turn.shown ? '' : ' data-pending') + '>' + head + body + '</div>';
    }).join('');
    var actions = extraButtons(ctx, 'out-btn');
    return '<section class="tool-output">' +
      '<div class="out-head"><span>' + esc(t.outputTitle) + '</span>' +
        (actions ? '<span class="out-actions">' + actions + '</span>' : '') +
        '<span class="out-status">' + esc(pending ? t.running : t.ready) + '</span></div>' +
      '<div class="out-body" data-scroll>' + (runs || '<div class="out-empty">' + esc(t.outputEmpty) + '</div>') + '</div>' +
    '</section>';
  }

  window.Frames = F;
})();
