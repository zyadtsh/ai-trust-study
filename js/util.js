/* Small shared helpers. No dependencies. */
(function () {
  'use strict';
  var U = {};
  var MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  /* Escape text for safe insertion into HTML. */
  U.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return MAP[c]; });
  };

  /* Plain text -> paragraphs. A blank line starts a new paragraph. */
  U.paras = function (s) {
    return String(s == null ? '' : s)
      .split(/\n\s*\n/)
      .map(function (p) { return '<p>' + U.esc(p.trim()).replace(/\n/g, '<br>') + '</p>'; })
      .join('');
  };

  /* "Hello {name}" + {name: "x"} -> "Hello x" */
  U.fill = function (tpl, vars) {
    return String(tpl == null ? '' : tpl).replace(/\{(\w+)\}/g, function (m, k) {
      return Object.prototype.hasOwnProperty.call(vars, k) ? vars[k] : m;
    });
  };

  U.clock = function (ms) {
    if (!ms) return '';
    return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  U.randInt = function (n) {
    var a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] % n;
  };

  /* Random, anonymous session id (not linked to any person). */
  U.rid = function () {
    var a = new Uint8Array(6);
    crypto.getRandomValues(a);
    return Array.prototype.map.call(a, function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  };

  /* Seeded random generator (mulberry32), so a pid always gives the same shuffle. */
  U.rng = function (seed) {
    var t = seed >>> 0;
    return function () {
      t += 0x6D2B79F5;
      var r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  };

  U.shuffle = function (arr, rand) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  };

  U.readJSON = function (key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; }
  };
  U.writeJSON = function (key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
  };

  window.U = U;
})();
