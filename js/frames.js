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
    el.querySelectorAll('[data-tab]').forEach(function (b) {
      b.addEventListener('click', function () {
        appTab.idx = Number(b.getAttribute('data-tab'));
        F.render(el, ctx);
      });
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
    if (req && !req.classList.contains('msg--out') && !req.hasAttribute('data-req')) req = null;
    var room = sc.clientHeight - ai.offsetHeight - 24;
    var extra = req && room > 0 ? Math.min(req.offsetHeight + 10, room) : 0;
    sc.scrollTop = Math.max(0, Math.min(max, ai.offsetTop - 12 - extra));
  }

  function extraButtons(ctx, cls) {
    var x = ctx.extras;
    if (!x || !x.inFrame || !x.enabled) return '';
    var b = function (kind, label, done) {
      return '<button type="button" class="' + cls + '" data-extra="' + kind + '"' + (done ? ' disabled' : '') + '>' + esc(label) + '</button>';
    };
    var P = C.text.panel;
    return (x.followUp ? b('followup', P.followUpButton, x.followupDone) : '') + (x.second ? b('second', P.secondOpinionButton, x.secondDone) : '');
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
    // Neutral tool-style wording by default; "same" shows the chat message word for word.
    return ctx.options.toolQuery !== 'same' && ctx.item.toolQuery ? ctx.item.toolQuery : ctx.item.askText;
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

    if (look === 'app') return app(ctx, t, runEnabled, pending, lock);
    if (look === 'terminal') return terminal(ctx, t, runEnabled, pending);
    if (look === 'notebook') return notebook(ctx, t, runEnabled, pending);
    if (look === 'report') return report(ctx, t, runEnabled, pending);

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
    var runs = turns.map(function (turn, i) {
      var fn = turn.kind === 'followup'
        ? t.explainFn + '(' + t.outputTitle + ' 1)'
        : t.fn + '(' + range + ')' + (turn.kind === 'second' ? ' · ' + secondNote(ctx, t) : '');
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

  /* ================================================================== */
  /* Tool, "App" look: decision-support software, not a spreadsheet      */
  /* ================================================================== */
  /* Which result tab is open. Kept outside the render so a re-render keeps
     it; a new result (or a new item) opens its own tab automatically. */
  var appTab = { key: '', count: 0, idx: 0 };

  function app(ctx, t, runEnabled, pending, lock) {
    var a = t.app, item = ctx.item, turns = ctx.rec.turns;
    var runBtn = '<button class="run-btn ap-run' + (runEnabled ? ' is-ready' : '') + '" type="button" data-act="ask"' + (runEnabled ? '' : ' disabled') + '>' +
      '<span class="run-icon" aria-hidden="true">▶</span>' + esc(a.runButton) + '</button>';
    var state = '<span class="ap-state' + (pending ? ' is-busy' : '') + '"><i aria-hidden="true"></i>' + esc(pending ? a.processing : t.ready) + '</span>';

    return '<div class="tool tool--app" data-frame="tool">' +
      '<header class="ap-bar"><span class="ap-logo" aria-hidden="true"></span>' +
        '<span class="ap-title">' + esc(a.title) + '</span><span class="ap-ver">' + esc(a.version) + '</span>' + state +
      '</header>' +
      '<div class="ap-main">' +
        '<section class="ap-in">' +
          '<div class="ap-pane-head">' + esc(a.inputTitle) + '</div>' +
          '<div class="ap-in-body">' +
            '<label class="ap-label">' + esc(t.queryLabel) + '</label><div class="ap-query">' + esc(queryText(ctx)) + '</div>' +
            '<div class="ap-label">' + esc(t.inputsLabel) + '</div>' +
            '<div class="ap-cards">' + appCard(item, 'A') + appCard(item, 'B') + '</div>' +
          '</div>' +
          '<div class="ap-actions">' + runBtn + lock + '</div>' +
        '</section>' +
        appOutput(ctx, t, a, pending) +
      '</div>' +
    '</div>';
  }

  function appCard(item, side) {
    var o = item['option' + side];
    var attrs = (item.attributes || []).map(function (x) {
      return '<div class="ap-attr"><span>' + esc(x.label) + '</span><b>' + esc(side === 'A' ? x.a : x.b) + '</b></div>';
    }).join('');
    var hasName = item.attributes && item.attributes.length;
    return '<div class="ap-card"><div class="ap-card-head">' + esc(o.label) + '</div>' +
      (hasName ? '<div class="ap-card-name">' + esc(o.name) + '</div>' : '') +
      '<div class="ap-card-text">' + (item.type === 'emotional' ? '“' + esc(o.text) + '”' : esc(o.text)) + '</div>' +
      (attrs ? '<div class="ap-attrs">' + attrs + '</div>' : '') + '</div>';
  }

  /* Output pane: one tab per AI turn. The summary holds exactly the same text
     as the chat reply, and nothing else: no run statistics, IDs or timings. */
  function appOutput(ctx, t, a, pending) {
    var turns = ctx.rec.turns, item = ctx.item;
    var key = item.id + '|' + (ctx.rec.started_at || '');
    if (appTab.key !== key || appTab.count !== turns.length) {
      appTab = { key: key, count: turns.length, idx: Math.max(0, turns.length - 1) };
    }
    var idx = Math.min(appTab.idx, Math.max(0, turns.length - 1));
    var tabName = function (turn) {
      return turn.kind === 'main' ? a.tabMain : turn.kind === 'followup' ? a.kindFollowUp
        : a.kindSecond + ' (' + secondNote(ctx, t) + ')';
    };

    var tabs = turns.map(function (turn, i) {
      return '<button type="button" role="tab" class="ap-tab' + (i === idx ? ' on' : '') + '" data-tab="' + i + '" aria-selected="' + (i === idx) + '">' +
        esc(tabName(turn)) + (turn.shown ? '' : ' <span class="ap-tab-busy" aria-hidden="true">…</span>') + '</button>';
    }).join('');

    var panel = '';
    var turn = turns[idx];
    if (turn) {
      panel = turn.shown
        ? '<div class="ap-report" data-latest>' +
            '<div class="ap-res-label">' + esc(a.rationaleLabel) + '</div>' +
            '<div class="run-body">' + U.paras(ctx.turnText(turn)) + '</div>' +
          '</div>'
        : '<div class="ap-report" data-latest data-pending>' +
            '<div class="run-body is-busy" role="status"><span class="bar"><i></i></span><span>' + esc(a.processing) + '</span></div>' +
          '</div>';
    }

    var actions = extraButtons(ctx, 'out-btn');
    return '<section class="ap-out">' +
      '<div class="ap-pane-head"><span>' + esc(a.outputTitle) + '</span>' +
        (actions ? '<span class="out-actions">' + actions + '</span>' : '') + '</div>' +
      (tabs ? '<div class="ap-tabs" role="tablist">' + tabs + '</div>' : '') +
      '<div class="ap-out-body" data-scroll>' + (panel || '<div class="out-empty">' + esc(a.outputEmpty) + '</div>') + '</div>' +
    '</section>';
  }

  /* "run 2" (the same AI again) or "model 2" (a second AI), per secondOpinionSource. */
  function secondNote(ctx, t) {
    return ctx.options.secondOpinionSource === 'same' ? t.secondSameNote : t.secondSeparateNote;
  }

  /* The inputs every look shows: the two options with their label, name (only
     for items with attributes, as in the other frames), text and attributes. */
  function optionParts(item, side) {
    var o = item['option' + side];
    var hasAttrs = item.attributes && item.attributes.length;
    return {
      label: o.label,
      name: hasAttrs ? o.name : '',
      text: item.type === 'emotional' ? '“' + o.text + '”' : o.text,
      attrs: (item.attributes || []).map(function (x) { return { label: x.label, value: side === 'A' ? x.a : x.b }; })
    };
  }

  function lockLine(ctx, t, cls, hint) {
    return !ctx.rec.turns.length && !ctx.canAsk ? '<div class="' + cls + '">' + esc(hint || t.lockedHint) + '</div>' : '';
  }

  /* ================================================================== */
  /* Tool, "Terminal" look: a command line                               */
  /* ================================================================== */
  function terminal(ctx, t, runEnabled, pending) {
    var m = t.terminal, item = ctx.item, turns = ctx.rec.turns;
    var p = '<span class="tm-prompt" aria-hidden="true">' + esc(m.prompt) + '</span> ';
    var cmdFor = function (turn) {
      return turn.kind === 'main' ? m.runCommand : turn.kind === 'followup' ? m.followUpCommand
        : U.fill(m.secondCommand, { flag: ctx.options.secondOpinionSource === 'same' ? m.secondSameFlag : m.secondSeparateFlag });
    };
    var opt = function (side) {
      var o = optionParts(item, side);
      return '<div class="tm-opt"><div><span class="tm-key">[' + esc(side) + ']</span> ' + esc(o.label) +
          (o.name ? ' · <b>' + esc(o.name) + '</b>' : '') + '</div>' +
        '<div class="tm-ind">' + esc(o.text) + '</div>' +
        (o.attrs.length ? '<div class="tm-ind tm-attrs">' + o.attrs.map(function (x) {
          return '<span>' + esc(x.label) + '</span><span>' + esc(x.value) + '</span>';
        }).join('') + '</div>' : '') +
      '</div>';
    };

    var log = '<div class="tm-line">' + p + esc(m.showCommand) + '</div>' +
      '<div class="tm-out"><div><span class="tm-dim">' + esc(m.queryLabel) + ':</span> ' + esc(queryText(ctx)) + '</div>' + opt('A') + opt('B') + '</div>';
    turns.forEach(function (turn) {
      log += '<div class="tm-line" data-req>' + p + esc(cmdFor(turn)) + '</div>';
      log += turn.shown
        ? '<div class="tm-reply" data-latest>' +
            (turn.kind === 'second' ? '<div class="tm-dim">' + esc(t.secondOpinionCaption) + '</div>' : '') +
            U.paras(ctx.turnText(turn)) + '</div>'
        : '<div class="tm-reply tm-busy" data-latest data-pending role="status"><span class="tm-spin" aria-hidden="true"></span>' + esc(m.running) + '</div>';
    });

    var runBtn = '<button class="run-btn tm-run' + (runEnabled ? ' is-ready' : '') + '" type="button" data-act="ask"' + (runEnabled ? '' : ' disabled') + '>' +
      esc(m.runButton) + '</button>';
    var input = turns.length
      ? (pending ? '' : p + '<span class="tm-cursor" aria-hidden="true"></span>')
      : p + '<span class="' + (ctx.canAsk ? '' : 'tm-dim') + '">' + esc(m.runCommand) + '</span><span class="tm-cursor" aria-hidden="true"></span>';
    var extras = extraButtons(ctx, 'tm-btn');

    return '<div class="tool tool--terminal" data-frame="tool">' +
      '<header class="tm-bar"><span class="tm-dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="tm-title">' + esc(m.title) + '</span></header>' +
      '<div class="tm-screen" data-scroll>' + log + '</div>' +
      lockLine(ctx, t, 'tm-lock') +
      '<footer class="tm-input"><div class="tm-cmd">' + input + '</div>' + (extras || '') + (turns.length ? '' : runBtn) + '</footer>' +
    '</div>';
  }

  /* ================================================================== */
  /* Tool, "Notebook" look: code cells with outputs                      */
  /* ================================================================== */
  function notebook(ctx, t, runEnabled, pending) {
    var n = t.notebook, item = ctx.item, turns = ctx.rec.turns;
    var str = function (s) { return '<span class="nb-str">"' + esc(s) + '"</span>'; };
    var code = function (s) { // highlights only the function name before "("
      return esc(s).replace(/^(\w+)\(/, '<span class="nb-fn">$1</span>(');
    };
    var cell = function (count, src, out) {
      return '<div class="nb-cell"><div class="nb-in" data-req><span class="nb-count">' + esc(n.inLabel) + ' [' + count + ']:</span>' +
        '<pre class="nb-code">' + src + '</pre></div>' + (out || '') + '</div>';
    };
    var outCell = function (count, body, attrs) {
      return '<div class="nb-out"' + (attrs || '') + '><span class="nb-count nb-count--out">' + esc(n.outLabel) + ' [' + count + ']:</span><div class="nb-out-body">' + body + '</div></div>';
    };

    // Cell 1 (already run): the query and the options table.
    var a = optionParts(item, 'A'), b = optionParts(item, 'B');
    var rows = (a.name ? [[t.nameRow, a.name, b.name]] : [])
      .concat([[item.type === 'emotional' ? t.textRowEmotional : t.textRowOther, a.text, b.text]])
      .concat(a.attrs.map(function (x, i) { return [x.label, x.value, b.attrs[i].value]; }));
    var table = '<table class="nb-table"><thead><tr><th></th><th>' + esc(a.label) + '</th><th>' + esc(b.label) + '</th></tr></thead><tbody>' +
      rows.map(function (r) { return '<tr><th>' + esc(r[0]) + '</th><td>' + esc(r[1]) + '</td><td>' + esc(r[2]) + '</td></tr>'; }).join('') + '</tbody></table>';
    var cells = cell(1, n.queryVar + ' = ' + str(queryText(ctx)) + '\n' + esc(n.optionsVar), outCell(1, table));

    var count = 2, lastOut = 0;
    var call = function (turn) {
      if (turn.kind === 'main') return n.runCall;
      if (turn.kind === 'followup') return U.fill(n.followUpCall, { out: lastOut || 2 });
      return U.fill(n.secondCall, { arg: ctx.options.secondOpinionSource === 'same' ? n.secondSameArg : n.secondSeparateArg });
    };
    turns.forEach(function (turn) {
      var src = code(call(turn));
      var body = turn.shown
        ? (turn.kind === 'second' ? '<div class="nb-cap">' + esc(t.secondOpinionCaption) + '</div>' : '') + '<div class="run-body">' + U.paras(ctx.turnText(turn)) + '</div>'
        : '';
      var out = turn.shown ? outCell(count, body, ' data-latest') : '<div class="nb-out" data-latest data-pending role="status"><div class="nb-out-body nb-busy"><span class="bar"><i></i></span>' + esc(n.running) + '</div></div>';
      cells += cell(turn.shown ? count : '*', src, out);
      if (turn.kind === 'main' && turn.shown) lastOut = count;
      if (turn.shown) count++;
    });

    var runBtn = '<button class="run-btn nb-run' + (runEnabled ? ' is-ready' : '') + '" type="button" data-act="ask"' + (runEnabled ? '' : ' disabled') + '>' +
      '<span class="run-icon" aria-hidden="true">▶</span>' + esc(n.runButton) + '</button>';
    if (!turns.length) {
      cells += '<div class="nb-cell nb-cell--next"><div class="nb-in"><span class="nb-count">' + esc(n.inLabel) + ' [ ]:</span>' +
        '<pre class="nb-code">' + code(n.runCall) + '</pre></div>' +
        '<div class="nb-run-row">' + runBtn + lockLine(ctx, t, 'nb-lock') + '</div></div>';
    }
    var extras = extraButtons(ctx, 'out-btn');

    return '<div class="tool tool--notebook" data-frame="tool">' +
      '<header class="nb-bar"><span class="nb-title">' + esc(n.title) + '</span>' +
        '<span class="nb-kernel' + (pending ? ' is-busy' : '') + '"><i aria-hidden="true"></i>' + esc(pending ? n.busy : n.idle) + '</span></header>' +
      '<div class="nb-sheet" data-scroll>' + cells + (extras ? '<div class="nb-extras">' + extras + '</div>' : '') + '</div>' +
    '</div>';
  }

  /* ================================================================== */
  /* Tool, "Report" look: one generated document that grows             */
  /* ================================================================== */
  function report(ctx, t, runEnabled, pending) {
    var r = t.report, item = ctx.item, turns = ctx.rec.turns;
    var a = optionParts(item, 'A'), b = optionParts(item, 'B');
    var optBlock = function (o) {
      return '<div class="rp-opt"><div class="rp-opt-head">' + esc(o.label) + (o.name ? ': ' + esc(o.name) : '') + '</div>' +
        '<p>' + esc(o.text) + '</p>' +
        (o.attrs.length ? '<table class="rp-attrs">' + o.attrs.map(function (x) {
          return '<tr><th>' + esc(x.label) + '</th><td>' + esc(x.value) + '</td></tr>';
        }).join('') + '</table>' : '') + '</div>';
    };
    var heading = function (turn) {
      return turn.kind === 'main' ? r.mainHeading : turn.kind === 'followup' ? r.followUpHeading
        : r.secondHeading + ' (' + secondNote(ctx, t) + ')';
    };
    var sections = turns.map(function (turn, i) {
      var h = '<h2>' + (i + 2) + '. ' + esc(heading(turn)) + '</h2>';
      return turn.shown
        ? '<section class="rp-sec" data-latest>' + h + '<div class="run-body">' + U.paras(ctx.turnText(turn)) + '</div></section>'
        : '<section class="rp-sec" data-latest data-pending>' + h + '<div class="run-body is-busy" role="status"><span class="bar"><i></i></span><span>' + esc(r.running) + '</span></div></section>';
    }).join('');

    var runBtn = '<button class="run-btn rp-run' + (runEnabled ? ' is-ready' : '') + '" type="button" data-act="ask"' + (runEnabled ? '' : ' disabled') + '>' +
      '<span class="run-icon" aria-hidden="true">▶</span>' + esc(r.runButton) + '</button>';
    var extras = extraButtons(ctx, 'out-btn');

    return '<div class="tool tool--report" data-frame="tool">' +
      '<header class="rp-bar"><span class="rp-title">' + esc(r.title) + '</span>' +
        '<span class="rp-state">' + esc(pending ? r.running : t.ready) + '</span></header>' +
      '<div class="rp-desk" data-scroll><article class="rp-page">' +
        '<h1>' + esc(r.docTitle) + '</h1>' +
        '<section class="rp-sec"><h2>1. ' + esc(r.requestHeading) + '</h2>' +
          '<div class="rp-query"><span>' + esc(t.queryLabel) + '</span> ' + esc(queryText(ctx)) + '</div>' +
          '<div class="rp-opts">' + optBlock(a) + optBlock(b) + '</div>' +
          (turns.length ? '' : '<div class="rp-run-row">' + runBtn + lockLine(ctx, t, 'rp-lock', r.lockedHint) + '</div>') +
        '</section>' +
        sections +
        (extras ? '<div class="rp-extras">' + extras + '</div>' : '') +
      '</article></div>' +
    '</div>';
  }

  window.Frames = F;
})();
