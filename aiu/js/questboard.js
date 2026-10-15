/* AIU TOTEM 2.0 - Quest: the scrum board. Tiles like folders; open one to fill its pieces (Aiu asks), work its steps, finish it.
   The engine (pieces, rules, ranking) is tiles.js; this file is only the screens. */
(function () {
  'use strict';
  var U = AIU.util, C = AIU.core, M = AIU.mind, Wd = AIU.words, h = U.h, ui = AIU.ui, PN = AIU.panels, T = AIU.tiles;
  function app() { return AIU.app; }
  function K() { return ui.k; }
  function body() { return K().clear(ui.els.panel); }
  var today = U.today;
  var st = PN.state;
  function ctx(S) { var w = U.wall(new Date(app().trueNow())); return { nowHM: U.p2(w.getHours()) + ':' + U.p2(w.getMinutes()) }; }

  PN.quests = function () {
    var a = app(), S = a.S, k = K();
    if (ui.questOpen && S.quests[ui.questOpen] && S.quests[ui.questOpen].state !== 'purged' && (S.quests[ui.questOpen].state !== 'deleted' || st.tfilt === 'discard')) return tileView(ui.questOpen);
    ui.questOpen = null;
    ui.panelHead('Quest', [k.btn('+ New tile', newTile, 'mini primary'), null], null);
    var p = body(); // 2.4.0: Plan on top (the calendar and the picked day), your tiles below
    if (PN.planInto) { var pl = h('section', { cls: 'qplan', 'aria-label': 'Plan' }); p.appendChild(pl); PN.planInto(pl); p.appendChild(h('h3', { cls: 'qsec', text: 'Your tiles' })); }
    board(p);
  };

  /* ---------- the board ---------- */
  function board(p0) {
    var a = app(), S = a.S, k = K(), p = p0 || body(), d = today(), filt = st.tfilt === 'backlog' ? 'next' : (st.tfilt || 'all'), aside = C.questList(S).filter(function (x) { return x.state === 'dropped'; }), disc = C.questList(S, 'deleted'), all = filt === 'aside' ? aside : filt === 'discard' ? disc : T.list(S); // 2.4.0: the discard pile
    var ranked = T.rank(S, d, ctx(S)), order = {}; ranked.forEach(function (q, i) { order[q.key] = i; });
    var q = k.inp({ type: 'search', placeholder: 'Search your tiles', value: st.tq || '', 'aria-label': 'Search tiles' });
    var grid = h('div', { cls: 'tiles' });
    function count(f) { if (f === 'aside') return aside.length; if (f === 'discard') return disc.length; return T.list(S).filter(function (x) { return f === 'all' ? T.status(S, x, d) !== 'done' : f === 'repeats' ? T.repeats(x) : T.status(S, x, d) === f; }).length; }
    var chips = h('div', { cls: 'chips tfilt', role: 'group', 'aria-label': 'Show' }, [['all', 'All'], ['next', 'Go'], ['doing', 'Doing'], ['done', 'Done'], ['repeats', 'Repeats'], ['aside', 'Archived'], ['discard', 'Discard pile']].filter(function (f) { return (f[0] !== 'aside' || aside.length || filt === 'aside') && (f[0] !== 'discard' || disc.length || filt === 'discard'); }).map(function (f) {
      var n = count(f[0]);
      var b = k.btn(f[1] + (n && f[0] !== 'done' ? ' ' + n : ''), function () { st.tfilt = f[0]; ui.renderPanel(true); }, 'chip' + (filt === f[0] ? ' on' : ''));
      if (T.LIGHT[f[0]]) b.insertBefore(h('i', { cls: 'lamp ' + T.LIGHT[f[0]], 'aria-hidden': 'true' }), b.firstChild);
      return b;
    }));
    function draw() {
      k.clear(grid);
      var term = q.value.trim().toLowerCase();
      var list = all.filter(function (x) {
        var s0 = T.status(S, x, d);
        if (filt === 'aside' || filt === 'discard') s0 = filt;
        if (filt === 'all' && s0 === 'done') return false;
        if (filt === 'repeats' && !T.repeats(x)) return false;
        if (filt !== 'all' && filt !== 'repeats' && filt !== 'aside' && filt !== 'discard' && s0 !== filt) return false;
        if (term) { var hay = [x.title, x.why, T.tile(x).who].concat((x.steps || []).map(function (y) { return y.title; })).join(' ').toLowerCase(); if (hay.indexOf(term) < 0) return false; }
        return true;
      }).sort(function (x, y) { var ox = order[x.key], oy = order[y.key]; return (ox === undefined ? 999 : ox) - (oy === undefined ? 999 : oy) || y.first - x.first; });
      if (!list.length) grid.appendChild(k.empty(term ? 'No tiles match "' + q.value.trim() + '".' : filt === 'done' ? 'Nothing finished yet.' : 'No tiles here. Tap + New tile.'));
      list.forEach(function (x) { grid.appendChild(tileCard(S, x, d)); });
    }
    q.addEventListener('input', function () { st.tq = q.value; draw(); });
    p.appendChild(h('label', { cls: 'tsearch' }, h('span', { cls: 'small', text: 'Search tiles' }), q));
    p.appendChild(chips);
    p.appendChild(grid); draw();
    var wk = U.addDays(d, -6), doneWk = Object.keys(S.tdone || {}).filter(function (x) { var r = S.tdone[x]; return r.done && U.dayStr(new Date(r.t)) >= wk; }).length;
    if (doneWk) p.appendChild(h('p', { cls: 'small tdonewk' }, ui.pix('check'), ' Finished this week: ' + doneWk + ' tile' + (doneWk === 1 ? '' : 's') + '.'));
  }
  function tileCard(S, q, d) {
    var pcs = T.pieces(S, q), miss = pcs.filter(function (x) { return !x.ok; }), stt = T.status(S, q, d), o = T.occurrence(q, d), steps = C.questSteps(S, q), sd = steps.filter(function (x) { return x.done; }).length;
    var hint = stt === 'done' ? (T.repeats(q) ? 'Done for now' : 'Done') : miss.length && !T.isStarter(q) ? S.totemName + ' has ' + (miss.length === 1 ? 'a question' : miss.length + ' questions')
      : o.due && (o.day ? o.day <= d : o.window) ? (o.window ? 'In season now' : o.day < d && !T.repeats(q) ? 'Overdue' : 'Today') : stt === 'doing' ? 'Doing · ' + sd + ' of ' + steps.length + ' steps' : T.STATUS.filter(function (x) { return x[0] === stt; })[0][1];
    var hot = miss.length && !T.isStarter(q) || (o.due && stt !== 'done');
    return h('button', { type: 'button', cls: 'tcard' + (hot ? ' hot' : '') + (stt === 'done' ? ' done' : ''), onclick: function () { ui.openQuest(q.key); } },
      h('span', { cls: 'ttab', 'aria-hidden': 'true' }),
      h('i', { cls: 'lamp tlamp ' + T.LIGHT[stt], title: T.STATUS.filter(function (x) { return x[0] === stt; })[0][1], 'aria-hidden': 'true' }),
      h('b', { cls: 'tttl', text: q.title }),
      h('span', { cls: 'twhen', text: T.whenText(q, K().c24()) }),
      T.isShop(q) ? h('span', { cls: 'twhen', text: steps.length ? sd + ' of ' + steps.length + ' in the cart' : 'Add your items' }) : h('span', { cls: 'tpcs', 'aria-label': (pcs.length - miss.length) + ' of ' + pcs.length + ' pieces' }, pcs.map(function (x) { return h('i', { cls: x.ok ? 'ok' : '' }); })),
      h('span', { cls: 'thint' + (miss.length && !T.isStarter(q) ? ' ask' : ''), text: hint }));
  }

  /* ---------- a new tile: just the name; Aiu asks the rest ---------- */
  function newTile(kind0, title0) { // title0: a starting name (2.1.6: from a Vitals check-in you said 'not yet' to)
    var a = app(), k = K(), s, kind = kind0 === 'shop' ? 'shop' : 'list', m = h('p', { cls: 'formmsg' });
    var name = k.inp({ placeholder: '', autocapitalize: 'sentences', value: title0 || '' }), lab = h('span', { cls: 'flabel' }), hint = h('p', { cls: 'small' });
    var kb = {}, seg = h('div', { cls: 'seg tkind', role: 'radiogroup', 'aria-label': 'Kind of tile' }, ['list', 'shop'].map(function (x) {
      var b = k.btn(T.KINDS[x], function () { kind = x; show(); }); b.setAttribute('role', 'radio'); kb[x] = b; return b;
    }));
    function show() {
      ['list', 'shop'].forEach(function (x) { kb[x].classList.toggle('on', kind === x); kb[x].setAttribute('aria-checked', kind === x ? 'true' : 'false'); });
      lab.textContent = kind === 'shop' ? 'Name the list' : 'What do you want to get done?';
      name.placeholder = kind === 'shop' ? 'e.g. Groceries, Hardware store, Pet supplies' : 'e.g. Water the plants, Clean my room, Call a friend';
      hint.textContent = kind === 'shop' ? 'A shopping list: add your items, check them off as you get them, then tap Done shopping to finish it.' : 'A task list: ' + a.S.totemName + ' asks when, then you add the to-do boxes. It finishes by itself when every box is checked.';
    }
    function go() {
      var t = Wd.cap(name.value.trim()).slice(0, 60); if (!t) return k.msg(m, 'Give it a name.', true);
      s.remove(); var r = T.createEvents(a.S, t, { set: kind === 'shop' ? { kind: 'shop', when: { t: 'any' } } : { kind: 'list' } });
      a.addEvents(r.events).then(function () { ui.openQuest(r.key); });
    }
    name.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    s = k.sheet('New tile', [h('span', { cls: 'flabel', text: 'Kind' }), seg, h('label', { cls: 'field' }, lab, name), hint, m,
      h('div', { cls: 'row spread' }, h('span'), k.btn('Make the tile', go, 'primary'))]);
    show();
    setTimeout(function () { try { name.focus(); } catch (e) {} }, 60);
  }
  PN.newTile = newTile;

  /* ---------- when: set it (and its reminder, when it has a time) ---------- */
  PN.setWhen = function (q, w) {
    var ev = [T.setEv(q.key, { when: w })], S = app().S, keep = {};
    if (q.state === 'done' && w && (w.t === 'repeat' || w.t === 'window')) ev.push({ type: 'quest_state', data: { key: q.key, state: 'active' } }, T.setEv(q.key, { status: 'next' })); // repeats now: it comes back
    // one reminder per time (2.0.5: a tile can happen more than once a day)
    var times = w && (w.t === 'once' || (w.t === 'repeat' && (w.every === 'day' || w.every === 'days' || w.every === 'week'))) ? T.times({ tile: { when: w } }) : [];
    if (w && w.t === 'once') times = times.slice(0, 1);
    times.forEach(function (tm, i) {
      var td = { key: T.taskKey(q.key, i), title: q.title.slice(0, 60), time: tm };
      if (w.t === 'once') { td.repeat = 'once'; td.date = w.date; } else if (w.every === 'day') td.repeat = 'daily'; else if (w.every === 'days') { td.repeat = 'days'; td.days = (w.days || []).slice(); } else { td.repeat = 'days'; td.days = [U.weekday(w.date)]; }
      keep[td.key] = 1; ev.push({ type: 'task_set', data: td });
    });
    T.taskKeys(S, q.key).forEach(function (tk) { if (!keep[tk] && !S.tasks[tk].off) ev.push({ type: 'task_off', data: { key: tk, removed: true } }); });
    return app().addEvents(ev);
  };
  /* 2.1.12: When is it? Three simple ways: On a date (the calendar picker, or type it), Repeat (tap the days of the week,
     every week or every other week, from a start date), or Any time. Add a time if you want a reminder (or several). */
  function whenPicker(q, onSaved) {
    var a = app(), k = K(), w = T.tile(q).when || {}, d = today(), box = h('div', { cls: 'wpick' });
    var mode = w.t === 'repeat' ? 'repeat' : w.t === 'any' ? 'any' : w.t === 'window' ? 'season' : 'date';
    var days = w.t === 'repeat' ? (w.every === 'days' ? (w.days || []).slice() : w.every === 'day' ? [0, 1, 2, 3, 4, 5, 6] : w.date ? [U.weekday(w.date)] : []) : [];
    var step = w.step === 2 || w.every === '2weeks' ? 2 : 1, monthly = w.every === 'month';
    var date = k.inp({ type: 'date', value: (w.t === 'once' && w.date) || d, 'aria-label': 'Date' }), start = k.inp({ type: 'date', value: (w.t === 'repeat' && w.date) || d, 'aria-label': 'Starting' });
    var y = d.slice(0, 4), from = k.inp({ type: 'date', value: w.from ? y + '-' + w.from : d, 'aria-label': 'From' }), to = k.inp({ type: 'date', value: w.to ? y + '-' + w.to : U.addDays(d, 30), 'aria-label': 'To' });
    var tbox = h('div', { cls: 'timelist' });
    function timeRow(v) { var inp0 = k.inp({ type: 'time', value: v || '', 'aria-label': 'Time' }), row = h('div', { cls: 'row' }, inp0, k.btn('Remove', function () { row.remove(); }, 'mini ghost')); tbox.appendChild(row); return inp0; }
    var t0 = T.times(q); (t0.length ? t0 : ['']).forEach(function (x) { timeRow(x); });
    var body = h('div'), msgEl = h('p', { cls: 'formmsg' });
    var MODES = [['date', 'On a date'], ['repeat', 'Repeat'], ['any', 'Any time']].concat(mode === 'season' || T.rulesFor(q.title).some(function (r) { return r.window; }) ? [['season', 'A season']] : []);
    var seg = h('div', { cls: 'seg wmode' });
    function draw() {
      k.clear(seg); MODES.forEach(function (m0) { seg.appendChild(k.btn(m0[1], function () { mode = m0[0]; draw(); }, mode === m0[0] ? 'on' : '')); });
      k.clear(body);
      if (mode === 'date') body.appendChild(k.field('Date', date, 'Tap to pick it on the calendar (or type it, like 01/02/2027).'));
      if (mode === 'repeat') {
        var dbox = h('div', { cls: 'wdays', role: 'group', 'aria-label': 'Days of the week' });
        T.DAYS_ORDER.forEach(function (n) { var on = days.indexOf(n) >= 0; dbox.appendChild(h('button', { type: 'button', cls: 'wday' + (on ? ' on' : ''), 'aria-pressed': on ? 'true' : 'false', 'aria-label': U.DAYNAMES[n], text: U.DAYNAMES[n].charAt(0), onclick: function () { if (on) days.splice(days.indexOf(n), 1); else days.push(n); monthly = false; draw(); } })); });
        body.appendChild(h('div', { cls: 'field' }, h('span', { cls: 'flabel', text: 'Which days' }), dbox,
          h('div', { cls: 'row wrap' }, [['Every day', [0, 1, 2, 3, 4, 5, 6]], ['Weekdays', [1, 2, 3, 4, 5]], ['Weekends', [0, 6]], ['Clear', []]].map(function (x) { return k.btn(x[0], function () { days = x[1].slice(); monthly = false; draw(); }, 'mini ghost'); }))));
        body.appendChild(k.field('How often', k.sel({ 1: 'Every week', 2: 'Every other week', m: 'Once a month (on the start date)' }, monthly ? 'm' : String(step), function (v) { if (v === 'm') monthly = true; else { monthly = false; step = +v; } draw(); })));
        body.appendChild(k.field(monthly ? 'Day of the month (pick any date in a month)' : 'Starting', start));
      }
      if (mode === 'season') { body.appendChild(h('div', { cls: 'row2' }, k.field('From', from), k.field('To', to))); body.appendChild(h('p', { cls: 'small', text: 'Every year between these dates.' })); }
      if (mode === 'date' || mode === 'repeat') body.appendChild(h('div', { cls: 'field' }, h('span', { cls: 'flabel', text: 'Time (optional, makes a reminder)' }), tbox, k.btn('+ Another time', function () { timeRow('').focus(); }, 'mini'),
        h('span', { cls: 'hint', text: 'More than one time = it happens several times that day (morning and night).' })));
    }
    function save() {
      var tv = Array.prototype.map.call(tbox.querySelectorAll('input'), function (x) { return x.value; }).filter(Boolean).sort().filter(function (x, i, arr) { return arr.indexOf(x) === i; }), nw;
      if (mode === 'any') nw = { t: 'any' };
      else if (mode === 'season') nw = { t: 'window', from: (from.value || d).slice(5), to: (to.value || d).slice(5) };
      else if (mode === 'date') { if (!/^\d{4}-\d{2}-\d{2}$/.test(date.value)) return k.msg(msgEl, 'Pick a date.', true); nw = { t: 'once', date: date.value }; if (tv.length) nw.time = tv[0]; }
      else {
        var st0 = /^\d{4}-\d{2}-\d{2}$/.test(start.value) ? start.value : d;
        if (monthly) nw = { t: 'repeat', every: 'month', date: st0 };
        else {
          if (!days.length) return k.msg(msgEl, 'Tap at least one day.', true);
          nw = days.length === 7 && step === 1 ? { t: 'repeat', every: 'day', date: st0 } : { t: 'repeat', every: 'days', days: days.slice().sort(), date: st0 };
          if (step === 2 && nw.every === 'day') { nw.every = 'days'; nw.days = [0, 1, 2, 3, 4, 5, 6]; }
          if (step === 2) nw.step = 2;
        }
        if (tv.length) { nw.time = tv[0]; if (tv.length > 1 && nw.every !== 'month') nw.times = tv; }
      }
      PN.setWhen(q, nw).then(function () { if (onSaved) onSaved(); });
    }
    box.appendChild(seg); box.appendChild(body); box.appendChild(msgEl);
    box.appendChild(h('div', { cls: 'row spread' }, h('span'), k.btn('Save', save, 'primary')));
    draw();
    return box;
  }
  function whenSheet(q) { var s = K().sheet('When: ' + q.title, [whenPicker(q, function () { s.remove(); })]); }
  var SEASONS = [['Spring', '03-01', '05-31'], ['Summer', '06-01', '08-31'], ['Fall', '09-01', '11-30'], ['Winter', '12-01', '02-28']];

  /* ---------- one tile, opened ---------- */
  function tileView(key) {
    var a = app(), S = a.S, k = K(), q = S.quests[key], d = today(), stt = T.status(S, q, d), tl = T.tile(q);
    var tsks = T.taskKeys(S, key).filter(function (tk) { return !S.tasks[tk].off; }).map(function (tk) { return Object.assign({}, S.tasks[tk], { key: tk }); }), tsk = tsks[0] || null;
    var offTask = tsks.map(function (t) { return { type: 'task_off', data: { key: t.key, removed: true } }; }), backTask = tsks.map(function (t) { return { type: 'task_set', data: taskData(t) }; });
    ui.panelHead(q.title, [k.btn('< All tiles', function () { ui.questOpen = null; ui.renderPanel(true); }, 'mini ghost'), ui.speakBtn ? ui.speakBtn(function () { // 2.3.0: hear the whole tile
      var st0 = T.STATUS.filter(function (x) { return x[0] === T.status(S, q, today()); })[0], steps = (q.steps || []).map(function (sp, i) { var x = (S.qsteps || {})[key + '|' + sp.id]; return 'Step ' + (i + 1) + ': ' + sp.title + (x && x.done ? ', done' : '') + '.'; });
      return [q.title + '.', T.whenText(q, false) + '.', st0 ? 'Status: ' + st0[1] + '.' : '', q.why ? 'Notes: ' + q.why + '.' : ''].concat(steps).join(' ');
    }, true) : null], null);
    var optBtns = [
      k.btn('Rename', function () { k.editSheet('Rename tile', [{ label: 'Name', value: q.title }, { label: 'Notes (optional)', value: q.why || '', type: 'textarea' }], function (v) { var t = Wd.cap(v[0].trim()).slice(0, 60); if (!t) return; var dd = M.questSetData(q, (q.steps || []).slice()); dd.title = t; dd.why = v[1].trim() || undefined; a.addEvents([{ type: 'quest_set', data: dd }].concat(tsks.map(function (x) { return { type: 'task_set', data: Object.assign(taskData(x), { title: t.slice(0, 60) }) }; }))); }); }),
      null && k.btn('Archive', function () { a.addEvents([{ type: 'quest_state', data: { key: key, state: 'dropped' } }].concat(offTask)).then(function () { ui.questOpen = null; ui.renderPanel(true); k.snack('Archived "' + q.title + '". Find it under the Archived filter.', function () { a.addEvents([{ type: 'quest_state', data: { key: key, state: 'active' } }].concat(backTask)); }); }); }),
      q.state === 'deleted' ? null : k.btn('Discard', function () { var was = q.state; a.addEvents([{ type: 'quest_state', data: { key: key, state: 'deleted' } }].concat(offTask)).then(function () { ui.questOpen = null; ui.renderPanel(true); k.snack('"' + q.title + '" is in the discard pile.', function () { a.addEvents([{ type: 'quest_state', data: { key: key, state: was } }].concat(backTask)); }); }); }, 'del')];
    var p = body();
    if (q.state === 'deleted') p.appendChild(h('div', { cls: 'askcard' }, h('p', { text: 'This tile is in the discard pile.' }), h('div', { cls: 'row wrap' }, // 2.4.0: bring it back, or delete it for good
      k.btn('Restore it', function () { a.addEvents([{ type: 'quest_state', data: { key: key, state: 'active' } }]).then(function () { st.tfilt = 'all'; if (tl.when) PN.setWhen(S.quests[key], tl.when); ui.renderPanel(true); }); }, 'primary'),
      k.btn('Delete forever', function () { var inp0 = k.inp({ placeholder: 'type DELETE' }), m0 = h('p', { cls: 'formmsg' }), s0 = k.sheet('Delete forever', [h('p', { text: 'This removes "' + q.title + '" for good. Type DELETE to confirm.' }), inp0, m0, k.btn('Delete forever', function () { if (inp0.value.trim().toUpperCase() !== 'DELETE') return k.msg(m0, 'Type DELETE to confirm.', true); s0.remove(); a.addEvents([{ type: 'quest_state', data: { key: key, state: 'purged' } }]).then(function () { ui.questOpen = null; ui.renderPanel(true); k.snack('Deleted for good.'); }); }, 'danger')]); }, 'del'))));
    if (q.state === 'dropped') p.appendChild(h('div', { cls: 'askcard' }, h('p', { text: 'This tile is archived.' }), k.btn('Restore it', function () { a.addEvents([{ type: 'quest_state', data: { key: key, state: 'active' } }]).then(function () { if (tl.when) PN.setWhen(S.quests[key], tl.when); }); }, 'primary')));
    p.appendChild(h('p', { cls: 'small', text: T.whenText(q, k.c24()) + (q.why ? ' · ' + q.why : '') }));
    // status
    // status: a traffic light. Green = go, yellow = doing, red = stop (finished)
    p.appendChild(h('div', { cls: 'lights', role: 'radiogroup', 'aria-label': 'Status' }, T.STATUS.map(function (x) {
      var locked = x[0] === 'done' && stt !== 'done' && !T.canFinish(S, q);
      var b = k.btn(x[1], function () { if (locked) return k.snack(T.isShop(q) ? 'Check off what you got first.' : 'Check off every box first (' + T.stepsLeft(S, q) + ' left).'); PN.setLight(q, x[0]); }, 'light ' + T.LIGHT[x[0]] + (stt === x[0] ? ' on' : '') + (locked ? ' locked' : ''));
      if (locked) b.setAttribute('aria-disabled', 'true');
      b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', stt === x[0] ? 'true' : 'false');
      b.insertBefore(h('i', { cls: 'lamp ' + T.LIGHT[x[0]], 'aria-hidden': 'true' }), b.firstChild);
      return b;
    })));
    // pieces
    var pcs = T.isShop(q) ? [] : T.pieces(S, q); // 2.4.0: a shopping list is just its items (no pieces)
    if (pcs.length) p.appendChild(h('h3', { cls: 'qgroup', text: 'Pieces ' + pcs.filter(function (x) { return x.ok; }).length + ' of ' + pcs.length }));
    if (pcs.length) p.appendChild(h('div', { cls: 'pieces' }, pcs.map(function (pc) {
      var val = pieceText(S, q, pc.id);
      return h('button', { type: 'button', cls: 'piece' + (pc.ok ? ' ok' : ''), onclick: function () { editPiece(q, pc.id); } }, h('span', { cls: 'plabel', text: pc.label }), h('span', { cls: 'pval', text: pc.ok ? val : 'missing' }));
    })));
    // Aiu asks
    var qq = T.question(S, q, d);
    if (qq) p.appendChild(askCard(q, qq));
    // steps
    p.appendChild(stepsBox(q, !qq || qq.piece !== 'steps'));
    // linked
    var links = [];
    if (tsks.length) links.push(h('button', { type: 'button', cls: 'linkrow', onclick: function () { ui.go('planner'); } }, h('span', { text: (tsks.length > 1 ? 'Reminders · ' : 'Reminder · ') + tsks.map(function (x) { return x.time; }).sort().map(function (x) { return U.fmtHm(x, k.c24()); }).join(', ') }), h('span', { cls: 'small', text: 'Plan >' })));
    if (T.hasCard(S, tl.acct)) links.push(h('button', { type: 'button', cls: 'linkrow', onclick: function () { ui.go('accounts'); } }, h('span', { text: 'Accounts card' }), h('span', { cls: 'small', text: 'Accounts >' })));
    if (links.length) { p.appendChild(h('h3', { cls: 'qgroup', text: 'Linked' })); links.forEach(function (x) { p.appendChild(x); }); }
    // notes (the quest journal)
    var notes = C.questNotes(S, key), nb = [K().addRow('Add a note', function (v) { a.addEvents([{ type: 'quest_note', data: { key: key, text: v, by: 'you' } }]); })];
    notes.slice().reverse().forEach(function (n) { nb.push(h('div', { cls: 'item col' }, h('span', { cls: 'tag', text: U.fmtDay(U.dayStr(new Date(n.t))) }), h('span', { text: n.text }))); });
    p.appendChild(k.acc('tile-notes', 'Notes', nb, false, notes.length));
    // finish: a task list finishes by itself when the last box is checked; a shopping list has Done shopping
    var rep = T.repeats(q), left = T.stepsLeft(S, q), nSteps = C.questSteps(S, q).length, shop = T.isShop(q), fin = h('div', { cls: 'tfinish' });
    if (stt === 'done') {
      fin.appendChild(h('p', { cls: 'small', text: rep ? 'Done for now. It comes back ' + nextText(q, d) + '.' : 'Finished.' }));
      fin.appendChild(k.btn('Undo complete', function () { PN.undoComplete(q); }, 'big'));
    } else if (shop) {
      fin.appendChild(h('p', { cls: 'small', text: 'Check things off as you get them, then tap Done shopping: the tile is finished (+5 growth). Find it later under Done.' }));
      var ds = k.btn('Done shopping', function () { if (T.canFinish(S, q)) finish(q); else k.snack('Check off what you got first.'); }, 'primary big'); // 2.4.0: finishing the trip finishes the tile if (!T.canFinish(S, q)) ds.classList.add('locked');
      fin.appendChild(ds);
    } else if (nSteps) {
      fin.appendChild(h('p', { cls: 'small tleft', text: left + ' of ' + nSteps + ' box' + (nSteps === 1 ? '' : 'es') + ' left. It finishes by itself when the last one is checked: +5 growth.' + (rep ? ' Then it comes back ' + nextText(q, d) + '.' : '') }));
    } else {
      fin.appendChild(h('p', { cls: 'small', text: 'No boxes on this one. Finish it: +5 growth.' + (rep ? ' It comes back ' + nextText(q, d) + '.' : '') }));
      fin.appendChild(k.btn(rep ? 'Done for ' + (T.tile(q).when.t === 'window' ? 'this year' : ((T.tile(q).when.every === 'day' || T.tile(q).when.every === 'days') && T.times(q).length < 2 ? 'today' : 'now')) : 'Done', function () { finish(q); }, 'primary big'));
    }
    p.appendChild(fin);
    // tile options (no More menu)
    p.appendChild(h('div', { cls: 'topts' }, optBtns.filter(Boolean))); // 2.1.13: Rename · Archive · Delete on one line
  }
  function nextText(q, d) { var w = T.tile(q).when || {}; if (w.t === 'window') return 'next ' + T.mdText(w.from); var o0 = T.occurrence(q, d); if (o0.slot) return o0.nextSlot ? 'at ' + U.fmtHm(o0.nextSlot, K().c24()) : 'tomorrow at ' + U.fmtHm(T.times(q)[0], K().c24()); if (w.every === 'day') return 'tomorrow'; var o = T.occurrence(q, d); return o.next ? U.fmtDay(o.next) : w.every === 'month' ? 'next month' : 'next time'; }
  function finish(q, opt) {
    var a = app(), S = a.S, d = today();
    if (T.doneNow(S, q, d)) return Promise.resolve(); // already finished for now: no double points
    var o = T.occurrence(q, d), ev = T.doneEvents(S, q, d); if (opt && opt.except) ev[0].data.last = opt.except;
    var tsk = T.taskKeys(S, q.key).filter(function (tk) { return !S.tasks[tk].off; }).map(function (tk) { return Object.assign({}, S.tasks[tk], { key: tk }); });
    return a.addEvents(ev).then(function () {
      a.react('quest', '+5'); ui.renderPanel(true);
      K().snack((T.isShop(q) ? 'Done shopping: ' : 'Finished: ') + q.title + '. +5', function () { PN.undoComplete(S.quests[q.key] || q, { p: o.p, except: opt && opt.except, tasks: tsk }); });
    });
  }
  // 2.1.1: take a finish back (the snack's Undo, the "Undo complete" button, or the green light on a red tile)
  PN.undoComplete = function (q, opt) {
    var a = app(), S = a.S, d = today(), p0 = (opt && opt.p) || T.occurrence(q, d).p;
    if (!(S.tdone || {})[q.key + '|' + p0] && q.state !== 'done') return Promise.resolve();
    var ev = T.undoEvents(S, q, p0, opt && opt.except);
    if (!T.repeats(q) && !T.isShop(q)) { var tw = T.tile(q).when; if (tw && tw.t === 'once' && (tw.time)) ev = ev.concat(T.taskKeys(S, q.key).map(function (tk) { var t0 = S.tasks[tk]; return t0 && t0.off ? { type: 'task_set', data: taskData(Object.assign({}, t0, { key: tk })) } : null; }).filter(Boolean)); } // a one-time tile's reminder comes back
    return a.addEvents(ev).then(function () { ui.renderPanel(true); K().snack('Undone: ' + q.title + ' is open again.'); });
  };
  PN.finishTile = finish;
  // 2.0.7: change a tile's light from anywhere (the tile, the Plan). green = go, yellow = doing, red = done (finish)
  PN.setLight = function (q, to) {
    var a = app(), S = a.S, d = today(), stt = T.status(S, q, d), key = q.key;
    if (to === stt) return Promise.resolve();
    if (to === 'done') { if (!T.canFinish(S, q)) { K().snack(T.isShop(q) ? 'Check off what you got first.' : 'Check off every box first (' + T.stepsLeft(S, q) + ' left).'); return Promise.resolve(false); } return finish(q); }
    if (stt === 'done') return PN.undoComplete(q).then(function () { return a.addEvents([T.setEv(key, { status: to })]); });
    return a.addEvents([T.setEv(key, { status: to })]);
  };
  function pieceText(S, q, id) {
    var t = T.tile(q);
    if (id === 'when') return T.whenText(q, K().c24());
    if (id === 'steps') { var st0 = C.questSteps(S, q); return st0.filter(function (x) { return x.done; }).length + ' of ' + st0.length + ' done'; }
    if (id === 'acct') return t.acct === 'later' ? 'Later' : 'Linked';
    return String(t[id] || '');
  }
  function editPiece(q, id) {
    var k = K();
    if (id === 'when') return whenSheet(q);
    if (id === 'steps') { var el = document.querySelector('.tsteps input'); if (el) el.focus(); return; }
    if (id === 'acct') return acctSheet(q);
    k.editSheet(T.PIECES[id], [{ label: T.PIECES[id], value: T.tile(q)[id] || '' }], function (v) { var o = {}; o[id] = v[0].trim().slice(0, 60); app().addEvents([T.setEv(q.key, o)]); });
  }
  // the question card: tap an answer
  function askCard(q, qq) {
    var a = app(), k = K(), d = today(), box = h('section', { cls: 'askcard', 'aria-label': a.S.totemName + ' asks' }, h('div', { cls: 'askq' }, ui.pix('ask'), h('b', { text: qq.ask })));
    var row = h('div', { cls: 'chips' });
    function set(o) { return a.addEvents([T.setEv(q.key, o)]); }
    if (qq.kind === 'when') box.appendChild(whenPicker(q)); // 2.1.12: pick a date or the days of the week, right here
    else if (qq.kind === 'window') { SEASONS.forEach(function (x) { row.appendChild(k.btn(x[0], function () { PN.setWhen(q, { t: 'window', from: x[1], to: x[2] }); }, 'chip ans')); }); row.appendChild(k.btn('Pick dates...', function () { whenSheet(q); }, 'chip ghost')); row.appendChild(k.btn('Just once', function () { PN.setWhen(q, { t: 'once', date: d }); }, 'chip ghost')); }
    else if (qq.kind === 'chips') { qq.opts.forEach(function (o) { var v = {}; v[qq.piece] = o; row.appendChild(k.btn(o, function () { set(v); }, 'chip ans')); }); if (qq.other) row.appendChild(k.btn(qq.other + '...', function () { editPiece(q, qq.piece); }, 'chip ghost')); }
    else if (qq.kind === 'acct') { row.appendChild(k.btn('Pick a card', function () { acctSheet(q); }, 'chip ans')); row.appendChild(k.btn('Make it in Accounts', function () { ui.go('accounts'); }, 'chip ghost')); row.appendChild(k.btn('Later', function () { set({ acct: 'later' }); }, 'chip ghost')); }
    else if (qq.kind === 'steps') {
      box.appendChild(k.addRow(T.isShop(q) ? 'Type an item (apple, bread...)' : 'Type a step', function (v) { addSteps(q, v); }));
      (qq.ideas || []).forEach(function (t) { row.appendChild(k.btn(t, function () { addSteps(q, t); }, 'chip ans')); });
    }
    box.appendChild(row);
    return box;
  }
  function taskData(t) { return { key: t.key, title: t.title, time: t.time, repeat: t.repeat, date: t.date, days: t.days }; }
  function addSteps(q, v) { // 2.4.0: no doubles (milk is already on the list), and a clear message when the list is full
    var S = app().S, raw = (q.steps || []).slice(), done = {}, have = {}, skip = [];
    C.questSteps(S, q).forEach(function (x) { if (x.done) done[x.id] = 1; });
    raw.forEach(function (x) { if (!done[x.id]) have[String(x.title).toLowerCase().trim()] = 1; });
    M.stepsFrom(v).forEach(function (t) { var k0 = String(t).toLowerCase().trim(); if (have[k0]) { skip.push(t); return; } have[k0] = 1; raw.push({ id: T.stepId(q, raw), title: t }); });
    if (skip.length) K().snack(skip.join(', ') + (skip.length === 1 ? ' is' : ' are') + ' already on the list.');
    if (raw.length > 80) { K().snack('This list is full (80). Check some off or finish it first.'); raw = raw.slice(0, 80); }
    app().addEvents([{ type: 'quest_set', data: M.questSetData(q, raw) }]);
  }
  function acctSheet(q) {
    var a = app(), k = K(), s, box = h('div', { cls: 'morelist' }, k.empty('Opening your cards...'));
    s = k.sheet('Which Accounts card?', [box, h('div', { cls: 'row wrap' }, k.btn('Open Accounts', function () { s.remove(); ui.go('accounts'); }), k.btn('Later', function () { s.remove(); a.addEvents([T.setEv(q.key, { acct: 'later' })]); }, 'ghost'))]);
    a.vaultCards().then(function (cards) {
      k.clear(box);
      cards = cards.filter(function (c) { return !c.locked; });
      if (!cards.length) { box.appendChild(h('p', { cls: 'small', text: 'No cards to pick from here yet (or Accounts needs your password on this device). Make the card in Accounts, then come back.' })); return; }
      cards.forEach(function (c) { box.appendChild(k.btn(c.name || 'Card', function () { s.remove(); a.addEvents([T.setEv(q.key, { acct: c.key })]); })); });
    }, function () { k.clear(box); box.appendChild(h('p', { cls: 'small', text: 'Open Accounts first, then come back.' })); });
  }
  function stepsBox(q, withAdd) {
    var a = app(), S = a.S, k = K(), key = q.key, raw = (q.steps || []).slice(), steps = C.questSteps(S, q), ns = C.nextStep(S, q);
    function setSteps(list) { return a.addEvents([{ type: 'quest_set', data: M.questSetData(q, list) }]); }
    var shop = T.isShop(q), box = h('section', { cls: 'tsteps' }, h('h3', { cls: 'qgroup', text: shop ? 'Your list' : 'Steps' }));
    steps.forEach(function (stp) {
      var cb = h('input', { type: 'checkbox', checked: stp.done, 'aria-label': (stp.done ? 'Undo: ' : 'Done: ') + stp.title, onchange: function (e) {
        var on = e.target.checked, d0 = today(), ev = [{ type: 'quest_step', data: { key: key, step: stp.id, done: on, p: T.occurrence(q, d0).p } }];
        if (on && T.tile(q).status !== 'doing' && T.status(S, q, d0) !== 'done') ev.push(T.setEv(key, { status: 'doing' }));
        if (!on && T.status(S, q, d0) === 'done') return PN.undoComplete(q, { except: stp.id }); // unchecking a finished tile opens it again
        a.addEvents(ev).then(function () {
          var q2 = S.quests[key]; if (!on || !q2 || T.isShop(q2)) return;
          if (C.questSteps(S, q2).every(function (x) { return x.done; })) finish(q2, { except: stp.id }); // the last box: it's finished
        });
      } });
      box.appendChild(h('div', { cls: 'item objective' + (stp.done ? ' done' : '') + (ns && ns.id === stp.id ? ' current' : '') }, cb,
        h('button', { type: 'button', cls: 'ititle linkish', text: stp.title, onclick: function () {
          k.editSheet('Edit step', [{ label: 'Step', value: stp.title }], function (v) { var t = Wd.cap(v[0].trim()); if (!t) return; setSteps(raw.map(function (x) { return x.id === stp.id ? { id: x.id, title: t.slice(0, 80) } : x; })); },
            k.btn('Delete step', function () { document.querySelector('.sheet').remove(); var l = raw.filter(function (x) { return x.id !== stp.id; }); setSteps(l).then(function () { k.snack('Deleted step.', function () { setSteps(raw); }); }); }, 'mini del'));
        } })));
    });
    if (withAdd) box.appendChild(k.addRow(shop ? 'Type an item (apple, bread...)' : 'Add a step', function (v) { addSteps(q, v); }));
    else if (!steps.length) box.appendChild(h('p', { cls: 'small', text: shop ? 'Add your first item above.' : 'Add the first step above.' }));
    return box;
  }
})();
