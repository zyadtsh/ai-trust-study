/* The two interface frames.
   Both get exactly the same AI text from app.js (ctx.turnText) and the same
   timing; only the presentation differs. Nothing in here writes AI words.

   ctx = { ui, options, item, rec, canAsk, turnText(turn), onAsk(),
           extras: { inFrame, enabled, followUp, followupDone, secondDone }, onExtra(kind) } */
(function () {
  'use strict';
  var C = window.STUDY_CONFIG;
  var S = C.interfaceText.shared;   // words both interfaces use for the same thing
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

  /* The words of each request, the same in every interface and look: the
     question, then the follow-up and second-opinion requests. */
  function requestText(ctx, turn) {
    if (turn.kind === 'main') return ctx.ui === 'chat' ? ctx.item.askText : queryText(ctx);
    if (turn.kind === 'followup') return U.fill(S.followUpPrompt, { option: recLabel(ctx) });
    return S.secondOpinionPrompt;
  }

  /* Caption above a second-opinion reply: "Second opinion", plus the second
     source's name when it comes from "A second AI" (Assistant 2 / Model 2). */
  function secondCaption(ctx, name) {
    return ctx.options.secondOpinionSource === 'same' ? S.secondOpinionCaption : name + ' · ' + S.secondOpinionCaption;
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
      var out = turn.kind === 'main' ? askBubble(ctx.item) : esc(requestText(ctx, turn));
      var caption = turn.kind === 'second' ? '<div class="msg-caption">' + esc(secondCaption(ctx, secondName)) + '</div>' : '';
      log += '<div class="turn">' +
        '<div class="msg msg--out"><div class="bubble">' + out + '</div>' +
          '<div class="msg-meta">' + esc(U.clock(turn.requested_at)) + '</div></div>';
      if (turn.shown) {
        log += '<div class="msg msg--in" data-latest>' + av + '<div class="msg-col">' + caption +
          '<div class="bubble bubble--ai">' + U.paras(ctx.turnText(turn)) + '</div>' +
          '<div class="msg-meta">' + esc(U.clock(turn.shown_at)) + '</div></div></div>';
      } else {
        log += '<div class="msg msg--in" data-latest data-pending>' + av + '<div class="msg-col">' + caption +
          '<div class="bubble bubble--typing" role="status" aria-label="' + esc(S.waitingLabel) + '"><span></span><span></span><span></span></div>' +
          '</div></div>';
      }
      log += '</div>';
    });

    var asked = turns.length > 0;
    var composer = asked
      ? '<div class="composer-field is-empty">' + esc(t.composerPlaceholder) + '</div>' +
        '<button class="send-btn" type="button" disabled>' + esc(S.askButton) + '</button>'
      : '<div class="composer-field' + (ctx.canAsk ? '' : ' is-locked') + '">' + esc(ctx.item.askText) + '</div>' +
        '<button class="send-btn' + (ctx.canAsk ? ' is-ready' : '') + '" type="button" data-act="ask"' + (ctx.canAsk ? '' : ' disabled') + '>' + esc(S.askButton) + '</button>';
    var chips = extraButtons(ctx, 'chip');

    return '<div class="chat' + (o.chatCues === 'minimal' ? ' chat--minimal' : '') + '" data-frame="chat">' +
      '<header class="chat-head">' + avatar() +
        '<div class="chat-id"><div class="chat-name">' + esc(name) + '</div><div class="chat-status">' + esc(status) + '</div></div>' +
      '</header>' +
      '<div class="chat-log" data-scroll>' + log + '</div>' +
      (chips ? '<div class="chips">' + chips + '</div>' : '') +
      (!asked && !ctx.canAsk ? '<div class="frame-lock">' + esc(S.lockedHint) + '</div>' : '') +
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
  /* Every Tool look uses the shared words (interfaceText.shared) for anything
     that has a counterpart in Messaging: the question, the Ask button, the
     follow-up and second-opinion requests, their caption and the locked hint.
     Waiting is shown without words (a bar or spinner), like the typing dots.
     Only each look's own frame (title bar, labels, layout) differs. */
  var BAR = '<span class="bar" aria-hidden="true"><i></i></span>';

  function queryText(ctx) {
    // Default "same": the chat message word for word. "terse": the item's neutral toolQuery.
    return ctx.options.toolQuery === 'terse' && ctx.item.toolQuery ? ctx.item.toolQuery : ctx.item.askText;
  }

  function askButton(ctx, cls, icon) {
    var on = ctx.canAsk && ctx.rec.turns.length === 0;
    return '<button class="run-btn' + (cls ? ' ' + cls : '') + (on ? ' is-ready' : '') + '" type="button" data-act="ask"' + (on ? '' : ' disabled') + '>' +
      (icon === false ? '' : '<span class="run-icon" aria-hidden="true">▶</span>') + esc(S.askButton) + '</button>';
  }

  function lockLine(ctx, cls) {
    return !ctx.rec.turns.length && !ctx.canAsk ? '<div class="' + cls + '">' + esc(S.lockedHint) + '</div>' : '';
  }

  function isPending(ctx) {
    return ctx.rec.turns.some(function (x) { return !x.shown; });
  }

  /* The inputs every look shows: label, name (only for items with attributes,
     as in the chat), text (in quotes for emotional items, as in the chat) and attributes. */
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

  function tool(ctx) {
    var t = C.interfaceText.tool;
    var look = ctx.options.toolLook;
    if (look === 'app') return app(ctx, t);
    if (look === 'terminal') return terminal(ctx, t);
    if (look === 'notebook') return notebook(ctx, t);
    if (look === 'report') return report(ctx, t);
    if (look === 'light') return light(ctx, t);
    return sheet(ctx, t, look === 'full');
  }

  /* ---- Light: a plain form ---------------------------------------- */
  function light(ctx, t) {
    return '<div class="tool tool--light" data-frame="tool">' +
      '<div class="tl-head">' + esc(t.title) + '</div>' +
      '<div class="tl-body">' +
        '<div class="tl-label">' + esc(t.queryLabel) + '</div><div class="tl-query">' + esc(queryText(ctx)) + '</div>' +
        '<div class="tl-label">' + esc(t.optionsLabel) + '</div>' + inputsTable(ctx.item, t) +
        '<div class="tl-actions">' + askButton(ctx) + '</div>' +
        lockLine(ctx, 'frame-lock') +
      '</div>' +
      output(ctx, t, null) +
    '</div>';
  }

  function inputsTable(item, t) {
    var a = optionParts(item, 'A'), b = optionParts(item, 'B');
    var rows = (a.name ? [[t.nameRow, a.name, b.name]] : [])
      .concat([[item.type === 'emotional' ? t.textRowEmotional : t.textRowOther, a.text, b.text]])
      .concat(a.attrs.map(function (x, i) { return [x.label, x.value, b.attrs[i].value]; }));
    return '<table class="tl-table"><thead><tr><th></th><th>' + esc(a.label) + '</th><th>' + esc(b.label) + '</th></tr></thead><tbody>' +
      rows.map(function (r) { return '<tr><th>' + esc(r[0]) + '</th><td>' + esc(r[1]) + '</td><td>' + esc(r[2]) + '</td></tr>'; }).join('') +
      '</tbody></table>';
  }

  /* ---- Medium / Full: a spreadsheet ------------------------------- */
  function sheet(ctx, t, full) {
    var item = ctx.item, turns = ctx.rec.turns, pending = isPending(ctx);
    var g = gridModel(item, t, queryText(ctx));
    // The question's own words in the call, as for the follow-up and second-opinion requests.
    var call = t.fn + '("' + queryText(ctx) + '", B3:C' + g.lastDataRow + ')';
    return '<div class="tool tool--' + (full ? 'full' : 'medium') + '" data-frame="tool">' +
      (full
        ? '<div class="tool-title"><span class="doc-icon" aria-hidden="true"></span>' + esc(t.title) + '</div>' +
          '<div class="tool-menu" aria-hidden="true">' + t.menus.map(function (m) { return '<span>' + esc(m) + '</span>'; }).join('') + '</div>' +
          '<div class="tool-toolbar">' + toolbarIcons() + '<span class="tb-sep"></span>' + askButton(ctx) + '</div>'
        : '') +
      '<div class="formula-bar"><span class="cellref">D2</span><span class="fx">fx</span><code>=' + esc(call) + '</code>' + (full ? '' : askButton(ctx)) + '</div>' +
      lockLine(ctx, 'frame-lock') +
      '<div class="grid-wrap">' + grid(g, turns, t) + '</div>' +
      output(ctx, t, call) +
      (full
        ? '<div class="tool-tabs"><span class="tab on">' + esc(t.sheetName) + '</span><span class="tab">+</span></div>' +
          '<div class="tool-status">' + (pending ? BAR : '') + '</div>'
        : '') +
    '</div>';
  }

  function toolbarIcons() {
    var icons = ['↶', '↷', '|', 'B', 'I', 'U', '|', 'Σ', '↕', '≣', '%', '.00'];
    return icons.map(function (i) {
      return i === '|' ? '<span class="tb-sep"></span>' : '<span class="tb-icon" aria-hidden="true">' + esc(i) + '</span>';
    }).join('');
  }

  /* Rows of the sheet: the question in row 2 (always in view, with the result
     cell D2 next to it), then the options. The Name row only appears for items
     with attributes, so the Tool never shows option summaries the chat lacks. */
  function gridModel(item, t, query) {
    var a = optionParts(item, 'A'), b = optionParts(item, 'B');
    var rows = [];
    rows.push({ cells: [t.fieldHeader, a.label, b.label, t.outputLabel], head: true });
    rows.push({ query: true, cells: [t.queryLabel, query, '__RESULT__'] });
    if (a.name) rows.push({ cells: [t.nameRow, a.name, b.name, ''] });
    rows.push({ cells: [item.type === 'emotional' ? t.textRowEmotional : t.textRowOther, a.text, b.text, ''], wrap: true });
    a.attrs.forEach(function (x, i) { rows.push({ cells: [x.label, x.value, b.attrs[i].value, ''], num: true }); });
    var lastDataRow = rows.length;
    while (rows.length < 12) rows.push({ cells: ['', '', '', ''] });
    return { rows: rows, lastDataRow: lastDataRow };
  }

  function grid(g, turns, t) {
    var main = turns.filter(function (x) { return x.kind === 'main'; })[0];
    var resultCell = !main ? '' : !main.shown ? BAR : '<span class="cell-link">→ ' + esc(t.outputLabel) + ' 1</span>';
    var cols = '<colgroup><col class="c-n"><col class="c-a"><col class="c-b"><col class="c-c"><col class="c-d"><col class="c-e"></colgroup>';
    var head = '<tr class="col-heads"><th class="corner"></th>' + ['A', 'B', 'C', 'D', 'E'].map(function (c) { return '<th>' + c + '</th>'; }).join('') + '</tr>';
    var body = g.rows.map(function (r, i) {
      var cells;
      if (r.query) {
        cells = '<td class="is-field">' + esc(r.cells[0]) + '</td><td colspan="2" class="is-query">' + esc(r.cells[1]) + '</td><td class="is-selected">' + resultCell + '</td>';
      } else {
        cells = r.cells.map(function (c, j) {
          var cls = [j === 0 ? 'is-field' : '', r.num && j > 0 ? 'is-num' : ''].join(' ').trim();
          return '<td' + (cls ? ' class="' + cls + '"' : '') + '>' + esc(c) + '</td>';
        }).join('');
      }
      return '<tr class="' + (r.head ? 'is-head' : '') + (r.wrap || r.query ? ' is-wrap' : '') + '"><th>' + (i + 1) + '</th>' + cells + '<td></td></tr>';
    }).join('');
    return '<table class="grid">' + cols + head + body + '</table>';
  }

  /* Output panel (Light, Medium, Full): one numbered output per AI turn, headed
     by its request in the shared words (as a formula in the spreadsheet looks). */
  function output(ctx, t, mainCall) {
    var runs = ctx.rec.turns.map(function (turn, i) {
      var req = requestText(ctx, turn);
      var label = mainCall
        ? '<code>' + esc(turn.kind === 'main' ? mainCall : t.fn + '("' + req + '")') + '</code>'
        : '<span class="run-req">' + esc(req) + '</span>';
      var cap = turn.kind === 'second' ? '<span class="run-cap">' + esc(secondCaption(ctx, t.secondName)) + '</span>' : '';
      var head = '<div class="run-head"><span class="run-n">' + esc(t.outputLabel) + ' ' + (i + 1) + '</span>' + label + cap + '</div>';
      var body = turn.shown
        ? '<div class="run-body">' + U.paras(ctx.turnText(turn)) + '</div>'
        : '<div class="run-body is-busy" role="status" aria-label="' + esc(S.waitingLabel) + '">' + BAR + '</div>';
      return '<div class="run" data-latest' + (turn.shown ? '' : ' data-pending') + '>' + head + body + '</div>';
    }).join('');
    var actions = extraButtons(ctx, 'out-btn');
    return '<section class="tool-output">' +
      '<div class="out-head"><span>' + esc(t.outputLabel) + '</span>' +
        (actions ? '<span class="out-actions">' + actions + '</span>' : '') + '</div>' +
      '<div class="out-body" data-scroll>' + runs + '</div>' +
    '</section>';
  }

  /* ---- App: decision software ------------------------------------- */
  function app(ctx, t) {
    var item = ctx.item, pending = isPending(ctx);
    return '<div class="tool tool--app" data-frame="tool">' +
      '<header class="ap-bar"><span class="ap-logo" aria-hidden="true"></span>' +
        '<span class="ap-title">' + esc(t.title) + '</span>' +
        '<span class="ap-state' + (pending ? ' is-busy' : '') + '" aria-hidden="true"><i></i></span>' +
      '</header>' +
      '<div class="ap-main">' +
        '<section class="ap-in">' +
          '<div class="ap-in-body">' +
            '<div class="ap-label">' + esc(t.queryLabel) + '</div><div class="ap-query">' + esc(queryText(ctx)) + '</div>' +
            '<div class="ap-label">' + esc(t.optionsLabel) + '</div>' +
            '<div class="ap-cards">' + appCard(item, 'A') + appCard(item, 'B') + '</div>' +
          '</div>' +
          '<div class="ap-actions">' + askButton(ctx, 'ap-run') + lockLine(ctx, 'frame-lock') + '</div>' +
        '</section>' +
        appOutput(ctx, t) +
      '</div>' +
    '</div>';
  }

  function appCard(item, side) {
    var o = optionParts(item, side);
    var attrs = o.attrs.map(function (x) {
      return '<div class="ap-attr"><span>' + esc(x.label) + '</span><b>' + esc(x.value) + '</b></div>';
    }).join('');
    return '<div class="ap-card"><div class="ap-card-head">' + esc(o.label) + (o.name ? ': ' + esc(o.name) : '') + '</div>' +
      '<div class="ap-card-text">' + esc(o.text) + '</div>' +
      (attrs ? '<div class="ap-attrs">' + attrs + '</div>' : '') + '</div>';
  }

  /* Output pane: every AI turn stays on screen, numbered, with its request in
     the shared words and the reply (as in every other look and in the chat).
     No run statistics, IDs or timings. */
  function appOutput(ctx, t) {
    var outs = ctx.rec.turns.map(function (turn, i) {
      return '<div class="ap-report" data-latest' + (turn.shown ? '' : ' data-pending') + '>' +
        '<div class="ap-out-n">' + esc(t.outputLabel + ' ' + (i + 1)) + '</div>' +
        '<div class="ap-req"><span>' + esc(t.queryLabel) + '</span> ' + esc(requestText(ctx, turn)) + '</div>' +
        (turn.kind === 'second' ? '<div class="ap-cap">' + esc(secondCaption(ctx, t.secondName)) + '</div>' : '') +
        (turn.shown
          ? '<div class="run-body">' + U.paras(ctx.turnText(turn)) + '</div>'
          : '<div class="run-body is-busy" role="status" aria-label="' + esc(S.waitingLabel) + '">' + BAR + '</div>') +
      '</div>';
    }).join('');
    var actions = extraButtons(ctx, 'out-btn');
    return '<section class="ap-out">' +
      '<div class="ap-pane-head"><span>' + esc(t.outputLabel) + '</span>' +
        (actions ? '<span class="out-actions">' + actions + '</span>' : '') + '</div>' +
      '<div class="ap-out-body" data-scroll>' + outs + '</div>' +
    '</section>';
  }

  /* ---- Terminal: a command line ----------------------------------- */
  /* The AI text keeps the shared size and line height, in monospace. */
  function terminal(ctx, t) {
    var item = ctx.item, turns = ctx.rec.turns, pending = isPending(ctx);
    var p = '<span class="tm-prompt" aria-hidden="true">' + esc(t.prompt) + '</span> ';
    var cursor = '<span class="tm-cursor" aria-hidden="true"></span>';
    var cmd = function (turn) { return t.askCommand + ' "' + requestText(ctx, turn) + '"'; };
    var opt = function (side) {
      var o = optionParts(item, side);
      return '<div class="tm-opt"><div class="tm-opt-head">' + esc(o.label) + (o.name ? ': ' + esc(o.name) : '') + '</div>' +
        '<div class="tm-ind">' + esc(o.text) + '</div>' +
        (o.attrs.length ? '<div class="tm-ind tm-attrs">' + o.attrs.map(function (x) {
          return '<span>' + esc(x.label) + '</span><span>' + esc(x.value) + '</span>';
        }).join('') + '</div>' : '') +
      '</div>';
    };

    var log = '<div class="tm-line">' + p + esc(t.optionsCommand) + '</div><div class="tm-out">' + opt('A') + opt('B') + '</div>';
    turns.forEach(function (turn) {
      log += '<div class="tm-line" data-req>' + p + esc(cmd(turn)) + '</div>';
      log += turn.shown
        ? '<div class="tm-reply" data-latest>' +
            (turn.kind === 'second' ? '<div class="tm-dim">' + esc(secondCaption(ctx, t.secondName)) + '</div>' : '') +
            U.paras(ctx.turnText(turn)) + '</div>'
        : '<div class="tm-reply tm-busy" data-latest data-pending role="status" aria-label="' + esc(S.waitingLabel) + '"><span class="tm-spin" aria-hidden="true"></span></div>';
    });

    var input = turns.length
      ? (pending ? '' : p + cursor)
      : p + '<span class="' + (ctx.canAsk ? '' : 'tm-dim') + '">' + esc(cmd({ kind: 'main' })) + '</span>' + cursor;
    var extras = extraButtons(ctx, 'tm-btn');

    return '<div class="tool tool--terminal" data-frame="tool">' +
      '<header class="tm-bar"><span class="tm-dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="tm-title">' + esc(t.title) + '</span></header>' +
      '<div class="tm-screen" data-scroll>' + log + '</div>' +
      lockLine(ctx, 'tm-lock') +
      '<footer class="tm-input"><div class="tm-cmd">' + input + '</div>' + (extras || '') + (turns.length ? '' : askButton(ctx, 'tm-run', false)) + '</footer>' +
    '</div>';
  }

  /* ---- Notebook: code cells with outputs -------------------------- */
  function notebook(ctx, t) {
    var item = ctx.item, turns = ctx.rec.turns, pending = isPending(ctx);
    var call = function (turn) { // ask("<request>", options) for the main question, ask("<request>") after it
      return '<span class="nb-fn">' + esc(t.askFn) + '</span>(<span class="nb-str">"' + esc(requestText(ctx, turn)) + '"</span>' +
        (turn.kind === 'main' ? ', ' + esc(t.optionsVar) : '') + ')';
    };
    var cell = function (count, src, out) {
      return '<div class="nb-cell"><div class="nb-in" data-req><span class="nb-count">' + esc(t.inLabel) + ' [' + count + ']:</span>' +
        '<pre class="nb-code">' + src + '</pre></div>' + (out || '') + '</div>';
    };
    var outCell = function (count, body) {
      return '<div class="nb-out" data-latest><span class="nb-count nb-count--out">' + esc(t.outLabel) + ' [' + count + ']:</span><div class="nb-out-body">' + body + '</div></div>';
    };

    // Cell 1 (already run): the options as a table.
    var a = optionParts(item, 'A'), b = optionParts(item, 'B');
    var rows = (a.name ? [[t.nameRow, a.name, b.name]] : [])
      .concat([[item.type === 'emotional' ? t.textRowEmotional : t.textRowOther, a.text, b.text]])
      .concat(a.attrs.map(function (x, i) { return [x.label, x.value, b.attrs[i].value]; }));
    var table = '<table class="nb-table"><thead><tr><th></th><th>' + esc(a.label) + '</th><th>' + esc(b.label) + '</th></tr></thead><tbody>' +
      rows.map(function (r) { return '<tr><th>' + esc(r[0]) + '</th><td>' + esc(r[1]) + '</td><td>' + esc(r[2]) + '</td></tr>'; }).join('') + '</tbody></table>';
    var cells = cell(1, esc(t.optionsVar), outCell(1, table).replace(' data-latest', ''));

    var count = 2;
    turns.forEach(function (turn) {
      var out = turn.shown
        ? outCell(count, (turn.kind === 'second' ? '<div class="nb-cap">' + esc(secondCaption(ctx, t.secondName)) + '</div>' : '') +
            '<div class="run-body">' + U.paras(ctx.turnText(turn)) + '</div>')
        : '<div class="nb-out" data-latest data-pending role="status" aria-label="' + esc(S.waitingLabel) + '"><div class="nb-out-body nb-busy">' + BAR + '</div></div>';
      cells += cell(turn.shown ? count : '*', call(turn), out);
      if (turn.shown) count++;
    });
    if (!turns.length) {
      cells += '<div class="nb-cell nb-cell--next"><div class="nb-in"><span class="nb-count">' + esc(t.inLabel) + ' [ ]:</span>' +
        '<pre class="nb-code">' + call({ kind: 'main' }) + '</pre></div>' +
        '<div class="nb-run-row">' + askButton(ctx, 'nb-run') + lockLine(ctx, 'nb-lock') + '</div></div>';
    }
    var extras = extraButtons(ctx, 'out-btn');

    return '<div class="tool tool--notebook" data-frame="tool">' +
      '<header class="nb-bar"><span class="nb-title">' + esc(t.title) + '</span>' +
        '<span class="nb-kernel' + (pending ? ' is-busy' : '') + '" aria-hidden="true"><i></i></span></header>' +
      '<div class="nb-sheet" data-scroll>' + cells + (extras ? '<div class="nb-extras">' + extras + '</div>' : '') + '</div>' +
    '</div>';
  }

  /* ---- Report: one document that grows ---------------------------- */
  function report(ctx, t) {
    var item = ctx.item, turns = ctx.rec.turns, pending = isPending(ctx);
    var optBlock = function (o) {
      return '<div class="rp-opt"><div class="rp-opt-head">' + esc(o.label) + (o.name ? ': ' + esc(o.name) : '') + '</div>' +
        '<p>' + esc(o.text) + '</p>' +
        (o.attrs.length ? '<table class="rp-attrs">' + o.attrs.map(function (x) {
          return '<tr><th>' + esc(x.label) + '</th><td>' + esc(x.value) + '</td></tr>';
        }).join('') + '</table>' : '') + '</div>';
    };
    // Each reply is a section headed by its request, in the shared words.
    var sections = turns.map(function (turn) {
      var h = '<h2 class="rp-req">' + esc(requestText(ctx, turn)) + '</h2>' +
        (turn.kind === 'second' ? '<div class="rp-cap">' + esc(secondCaption(ctx, t.secondName)) + '</div>' : '');
      return '<section class="rp-sec" data-latest' + (turn.shown ? '' : ' data-pending') + '>' + h +
        (turn.shown ? '<div class="run-body">' + U.paras(ctx.turnText(turn)) + '</div>' : '<div class="run-body is-busy" role="status" aria-label="' + esc(S.waitingLabel) + '">' + BAR + '</div>') +
      '</section>';
    }).join('');
    var extras = extraButtons(ctx, 'out-btn');

    return '<div class="tool tool--report" data-frame="tool">' +
      '<header class="rp-bar"><span class="rp-title">' + esc(t.title) + '</span>' + (pending ? '<span class="rp-state">' + BAR + '</span>' : '') + '</header>' +
      '<div class="rp-desk" data-scroll><article class="rp-page">' +
        '<section class="rp-sec">' +
          '<div class="rp-query"><span>' + esc(t.queryLabel) + '</span> ' + esc(queryText(ctx)) + '</div>' +
          '<h2>' + esc(t.optionsLabel) + '</h2>' +
          '<div class="rp-opts">' + optBlock(optionParts(item, 'A')) + optBlock(optionParts(item, 'B')) + '</div>' +
          (turns.length ? '' : '<div class="rp-run-row">' + askButton(ctx, 'rp-run') + lockLine(ctx, 'rp-lock') + '</div>') +
        '</section>' +
        sections +
        (extras ? '<div class="rp-extras">' + extras + '</div>' : '') +
      '</article></div>' +
    '</div>';
  }

  window.Frames = F;
})();
