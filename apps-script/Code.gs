/**
 * Data endpoint for the decision study.
 *
 * Paste this whole file into a Google Apps Script project that belongs to a
 * Google Sheet you own (Sheet → Extensions → Apps Script), then deploy it as a
 * web app (Deploy → New deployment → Web app; Execute as: Me; Who has access:
 * Anyone). Put the web-app URL (…/exec) into config.js → dataCollection.endpoint.
 * Full steps: README → "Collecting data remotely".
 *
 * What it does
 *  - POST {action:"save", session_id, rev, updated_at, data}: keeps ONE row per
 *    session in the "sessions" tab and replaces it only with a copy that has a
 *    higher rev (the study bumps rev on every change), so sending the same
 *    session many times, or a stale copy from a forgotten tab, is harmless.
 *  - GET ?action=assign: hands out the next participant number (1, 2, 3, …),
 *    so one shared link still gives a balanced Messaging/Tool split.
 *  - Anything else (e.g. opening the URL in a browser) just says it is running.
 *    It never sends any stored data back out.
 *
 * Before real data collection: run resetParticipantCounter() once (select it
 * in the toolbar and press Run) so the first real participant gets number 1,
 * and delete the test rows from the "sessions" tab (row 2 and below; keep the
 * header row 1, or delete the whole tab: it is recreated on the next save).
 * Never reset the counter after the first real participant.
 */

var SHEET_NAME = 'sessions';
var HEADER = ['session_id', 'participant_id', 'interface', 'completed', 'withdrawn', 'reviewer',
  'started_at', 'updated_at', 'rev', 'received_at', 'json'];
var COL_REV = 9;
var MAX_CELL = 49000;   // Google Sheets allows 50,000 characters per cell

function doPost(e) {
  var lock = LockService.getScriptLock();
  var locked = false;
  try {
    locked = lock.tryLock(25000);
    if (!locked) return reply_({ ok: false, error: 'busy, try again' });
    var body = JSON.parse(e.postData.contents);
    if (body.action === 'save') return reply_(saveSession_(body));
    if (body.action === 'assign') return reply_(assignPid_());
    return reply_({ ok: false, error: 'unknown action' });
  } catch (err) {
    return reply_({ ok: false, error: String(err) });
  } finally {
    if (locked) lock.releaseLock();
  }
}

function doGet(e) {
  var action = e && e.parameter && e.parameter.action;
  if (action === 'assign') {
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(25000)) return reply_({ ok: false, error: 'busy, try again' });
    try { return reply_(assignPid_()); } finally { lock.releaseLock(); }
  }
  return reply_({ ok: true, service: 'study data endpoint' });
}

function saveSession_(body) {
  var s = body.data;
  if (!s || typeof s !== 'object' || !/^[0-9a-f]{8,32}$/.test(String(body.session_id)) || s.session_id !== body.session_id) {
    return { ok: false, error: 'not a study session' };
  }
  var json = JSON.stringify(s);
  if (json.length > MAX_CELL) return { ok: false, error: 'session too large for one cell' };

  var sheet = sheet_();
  var updated = String(body.updated_at || '');
  var rev = Number(body.rev) || 0;
  var row = [s.session_id, s.pid == null ? '' : s.pid, s.ui === 'chat' ? 'messaging' : s.ui === 'tool' ? 'tool' : '',
    s.completed ? 1 : 0, s.withdrawn ? 1 : 0, s.is_review ? 1 : 0,
    s.started_at || '', updated, String(rev), new Date().toISOString(), json];

  var last = sheet.getLastRow();
  var found = last > 1
    ? sheet.getRange(2, 1, last - 1, 1).createTextFinder(s.session_id).matchEntireCell(true).findNext()
    : null;
  if (found) {
    var r = found.getRow();
    var storedRev = Number(sheet.getRange(r, COL_REV).getValue()) || 0;
    if (storedRev > rev) return { ok: true, kept: 'newer copy already stored' };
    sheet.getRange(r, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
  return { ok: true };
}

function assignPid_() {
  var props = PropertiesService.getScriptProperties();
  var next = Number(props.getProperty('next_pid') || '1');
  props.setProperty('next_pid', String(next + 1));
  return { ok: true, pid: next };
}

/** Run this once before real data collection (and after testing). */
function resetParticipantCounter() {
  PropertiesService.getScriptProperties().setProperty('next_pid', '1');
}

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADER);
    sh.setFrozenRows(1);
    sh.getRange('A:K').setNumberFormat('@');   // keep everything as plain text
  }
  return sh;
}

function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
