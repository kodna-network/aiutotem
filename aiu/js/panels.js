/* AIU TOTEM 1.1.0 - the menus: Quests (lists) and the Planner. (Log is in ui.js; Library, I Ching and Accounts have their own files.)
   Everything here is always editable, and every delete has Undo. */
(function () {
  'use strict';
  var U = AIU.util, C = AIU.core, M = AIU.mind, Wd = AIU.words, h = U.h, ui = AIU.ui;
  var PN = AIU.panels = { state: {} };
  function app() { return AIU.app; }
  function K() { return ui.k; }
  function body() { return K().clear(ui.els.panel); }
  var today = U.today;
  function cap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
  PN.today = today;
  PN.nice = function (day) { var d = U.dayToDate(day); return U.DAYNAMES[d.getDay()].slice(0, 3) + ' ' + U.MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear(); };
  // Save a PDF to the device (the viewer can print it too)
  PN.savePdf = function (doc, base) {
    try {
      var blob = AIU.pdf.make(doc), name = AIU.pdf.fileName(base) + '.pdf';
      U.download(blob, name);
      K().snack('Saved ' + name + ' (open it to print).');
    } catch (e) { K().snack('Could not make the PDF: ' + (e && e.message || e)); }
  };
  function pdfBtn() { return null; } // 2.0: every PDF is made in Settings > Save as PDF (check off what you want)
  PN.pdfBtn = pdfBtn;

  /* =====================================================================================
     QUESTS: your lists. Shopping (split by store) and to-do lists, plus quests with steps.
     ===================================================================================== */
  var SHOPLIKE = /^(shopping|grocery|groceries|store|market)$/;
  PN.lists = function (S) {
    var LM = S.listMeta || {}, keys = {};
    Object.keys(S.lists).forEach(function (k) { keys[k] = 1; });
    Object.keys(LM).forEach(function (k) { keys[k] = 1; });
    keys['to-do'] = 1; keys.shopping = 1;
    return Object.keys(keys).map(function (k) {
      var m = LM[k] || {};
      return { key: k, title: m.title || (k === 'to-do' ? 'To-do' : cap(k)), kind: m.kind || (SHOPLIKE.test(k) ? 'shopping' : 'todo'), hidden: !!m.hidden, order: m.order || 0 };
    }).filter(function (L) { return !L.hidden; }).sort(function (a, b) {
      var ra = a.key === 'to-do' ? 0 : a.key === 'shopping' ? 1 : 2, rb = b.key === 'to-do' ? 0 : b.key === 'shopping' ? 1 : 2;
      return ra - rb || a.title.localeCompare(b.title);
    });
  };

  // 2.0: the lists screen below is retired (Inventory is a shopping tile now); kept for reference, not shown.
  // Every list on one page. One box adds to whichever list you pick (it remembers your last pick).
  // 2.0: the Quest board as a document: every tile with its pieces and steps
  function questsDoc(S) {
    var T = AIU.tiles, d = today(), c24 = K().c24(), b = [{ t: 'title', text: 'Quest board' }, { t: 'sub', text: S.totemName + ' · ' + PN.nice(d) }];
    T.STATUS.forEach(function (stx) {
      var list = T.list(S).filter(function (q) { return T.status(S, q, d) === stx[0]; });
      if (!list.length) return;
      b.push({ t: 'h1', text: stx[1] });
      list.forEach(function (q) {
        b.push({ t: 'h2', text: q.title });
        b.push({ t: 'small', text: T.whenText(q, c24) });
        var t = T.tile(q); if (t.who) b.push({ t: 'kv', k: 'Who', v: t.who }); if (t.dur) b.push({ t: 'kv', k: 'How long', v: t.dur });
        if (q.why) b.push({ t: 'p', text: q.why });
        C.questSteps(S, q).forEach(function (st) { b.push({ t: 'check', text: st.title, done: st.done }); });
        C.questNotes(S, q.key).slice(-5).forEach(function (n) { b.push({ t: 'small', text: U.fmtDay(U.dayStr(new Date(n.t))) + ': ' + n.text }); });
      });
    });
    return { title: 'Quest board - ' + d, blocks: b };
  }

  /* =====================================================================================
     PLANNER: agenda, calendar, business folders, money, reminders.
     ===================================================================================== */
  var PL = AIU.planner;
  // 2.0: Plan = the calendar and reminders. Tiles with a date, a repeat or a season show on it too.
  PN.planner = function () {
    var a = app(), S = a.S, k = K(), cur = ui.sub.planner || 'schedule';
    if (cur === 'money' || cur === 'finance') { ui.sub.planner = 'schedule'; return ui.go('finance'); }
    if (cur === 'self' || cur === 'iching') { ui.sub.planner = 'schedule'; return ui.go('journal', cur === 'self' ? 'profiles' : 'today'); }
    ui.sub.planner = 'schedule';
    ui.panelHead('Plan', [], null); // 2.1.5: Plan only shows (the calendar and your tiles); you make tiles in Quest
    planView();
  };
  /* ---------- 2.1.5: Plan = the calendar + the tiles on the picked day or days ----------
     Default: today. Tap a day to see it. "This week" or "Pick days" (tap the first day, then the last) shows a range. */
  function planRange() {
    var t = today(), f = PN.state.planFrom || t, to = PN.state.planTo || f;
    if (to < f) { var x = f; f = to; to = x; }
    if (U.addDays(f, 400) < to) to = U.addDays(f, 400); // 2.2.0: a range can run across months (up to about a year)
    return { from: f, to: to };
  }
  function planView(p0) {
    var a = app(), S = a.S, k = K(), p = p0 || body(), t = today(), rg = planRange(), picking = PN.state.planPick;
    var wk0 = U.addDays(t, -U.weekday(t)), isToday = rg.from === t && rg.to === t, isWeek = rg.from === wk0 && rg.to === U.addDays(wk0, 6);
    p.appendChild(h('div', { cls: 'chips prange', role: 'group', 'aria-label': 'Show' },
      k.btn('Today', function () { PN.state.planFrom = PN.state.planTo = t; PN.state.planPick = null; PN.state.calMonth = t.slice(0, 7); ui.renderPanel(true); }, 'chip' + (isToday && !picking ? ' on' : '')),
      k.btn('This week', function () { PN.state.planFrom = wk0; PN.state.planTo = U.addDays(wk0, 6); PN.state.planPick = null; ui.renderPanel(true); }, 'chip' + (isWeek && !picking ? ' on' : '')),
      k.btn(picking ? 'Tap the last day' : 'Pick days', function () { PN.state.planPick = picking ? null : 'first'; ui.renderPanel(true); }, 'chip' + (picking ? ' on' : ''))));
    if (picking) p.appendChild(h('p', { cls: 'small', text: picking === 'first' ? 'Tap the first day.' : 'Now tap the last day (use < > to go to another month).' }));
    else if (rg.from !== rg.to && rg.from.slice(0, 7) !== rg.to.slice(0, 7)) p.appendChild(h('p', { cls: 'small', text: 'Showing ' + PN.nice(rg.from) + ' to ' + PN.nice(rg.to) + ' (' + (Math.round((U.dayToDate(rg.to) - U.dayToDate(rg.from)) / 864e5) + 1) + ' days).' }));
    calendar(p, rg);
    // the list: tiles on those days (season tiles once, at the top)
    var days = []; for (var d = rg.from; d <= rg.to; d = U.addDays(d, 1)) days.push(d);
    p.appendChild(h('h3', { cls: 'qgroup', text: days.length === 1 ? (rg.from === t ? 'Today' : Wd.cap(U.fmtDay(rg.from))) : Wd.cap(U.fmtDay(rg.from)) + ' - ' + U.fmtDay(rg.to) }));
    var seen = {}, any = false, seasons = [];
    days.forEach(function (d) { tileItems(S, d).forEach(function (it) { if (it.win && !seen[it.key]) { seen[it.key] = 1; seasons.push(it); } }); });
    if (seasons.length) { any = true; seasons.forEach(function (it) { p.appendChild(dayRow(it, rg.from)); }); }
    days.forEach(function (d) {
      var its = tileItems(S, d).filter(function (x) { return !x.win; }).sort(function (x, y) { return (x.time || '99') < (y.time || '99') ? -1 : 1; });
      if (!its.length) return; any = true;
      if (days.length > 1) p.appendChild(h('div', { cls: 'daysep2', text: d === t ? 'Today' : Wd.cap(U.fmtDay(d)) }));
      its.forEach(function (it) { p.appendChild(dayRow(it, d)); });
    });
    if (!any) p.appendChild(k.empty(days.length === 1 ? 'No tiles on this day.' : 'No tiles on these days.'));
    if (!p0) p.appendChild(h('p', { cls: 'small', text: 'Tap a tile to open it. Today you can tap its light (green, yellow, red). New tiles: Quest > + New tile.' }));
  }
  PN.planInto = function (p) { planView(p); }; // 2.4.0: the calendar sits at the top of Quest
  PN.world = function () { ui.panelHead('World', [], null); body(); }; // 2.4.0: the World tab is Aiu's place (no panel under it)
  // Finance (its own menu): your money. Books a business kept in 2.0.0 still show, as a pick at the top.
  function bizBooks(S) { var o = {}; (PL.items(S) || []).forEach(function (x) { if (x.folder && x.folder !== PL.ME) o[x.folder] = 1; }); return Object.keys(o).sort(); }
  PN.bizBooks = bizBooks;
  function financeEnt(S) { var e = PN.state.fent || ''; if (e && bizBooks(S).indexOf(e) < 0) e = PN.state.fent = ''; return e; }
  PN.finance = function () {
    var a = app(), S = a.S, k = K(), ent = financeEnt(S), books = bizBooks(S);
    ui.panelHead('Finance', [null], null);
    var p = body();
    if (books.length) p.appendChild(h('div', { cls: 'chips bsub', role: 'group', 'aria-label': 'Whose books' }, [['', 'Mine']].concat(books.map(function (f) { return [f, f]; })).map(function (x) {
      return k.btn(x[1], function () { PN.state.fent = x[0]; ui.renderPanel(true); }, 'chip' + (ent === x[0] ? ' on' : ''));
    })));
    money(p, ent);
  };
  // Schedule: bills due, the month calendar with the picked day's list, then what's coming and your reminders
  function schedule() {
    var p = body(), rm = h('div');
    calendar(p);
    p.appendChild(h('h3', { cls: 'qgroup', text: 'Reminders' }));
    reminders(rm); p.appendChild(rm);
  }
  // tiles on a calendar day, as rows like the rest
  function tileItems(S, day) {
    var T = AIU.tiles; if (!T) return [];
    var t = today(), out = [];
    T.list(S).filter(function (q) { return T.onDay(q, day); }).forEach(function (q) {
      var w = T.tile(q).when || {}, ts = T.times(q), now = day === t ? T.occurrence(q, t) : null;
      // 2.0.7: one row per time (brush teeth 8am and 9pm); each has its own light
      if (T.multi(q)) return ts.forEach(function (tm) {
        var pp = day + '@' + tm, r = (S.tdone || {})[q.key + '|' + pp], dn = !!(r && r.done), live = !!(now && now.p === pp);
        out.push({ src: 'tile', key: q.key, kind: 'tile', title: q.title, time: tm, done: dn, light: dn ? 'done' : live ? T.status(S, q, t) : 'next', live: live });
      });
      var dn = T.doneNow(S, q, day);
      out.push({ src: 'tile', key: q.key, kind: 'tile', title: q.title, time: w.t === 'window' ? '' : w.time || '', done: dn, win: w.t === 'window', light: day === t ? T.status(S, q, t) : dn ? 'done' : 'next', live: day === t });
    });
    return out;
  }
  // 2.0.7: the Plan's list for a day: a tile's own reminder is shown on the tile's row, not twice
  PN.tileItems = tileItems;
  function c24() { return K().c24(); }
  function fmtT(t) { return t ? U.fmtHm(t, c24()) : ''; }
  // One row in the agenda / calendar
  function dayRow(it, day) {
    var a = app(), k = K(), p = it.p;
    var tag = it.src === 'task' ? (it.kind === 'wake' ? 'wake-up' : 'reminder') : it.src === 'iching' ? 'i ching' : (PL.KINDS[it.kind] || it.kind).toLowerCase() + (p && p.folder ? ' · ' + p.folder : '');
    if (it.src === 'tile') {
      // 2.0.7: the tile's traffic light. Today you can tap it: green > yellow > red (done) > green. It's the same status as inside the tile.
      var T = AIU.tiles, LB = { next: 'Do', doing: 'Doing', done: 'Done' }, lt = it.light || 'next', q0 = a.S.quests[it.key];
      var lamp = it.live && q0 ? h('button', { type: 'button', cls: 'plight', 'aria-label': it.title + ': ' + LB[lt] + '. Tap for ' + LB[T.NEXTLIGHT[lt]] + '.', onclick: function () {
        var to = T.NEXTLIGHT[lt]; PN.setLight(q0, to).then(function (r) { if (r !== false && to !== 'done' && lt !== 'done') k.snack(it.title + ': ' + LB[to] + '.'); });
      } }, h('i', { cls: 'lamp ' + T.LIGHT[lt] })) : h('span', { cls: 'plight off', title: LB[lt] }, h('i', { cls: 'lamp ' + T.LIGHT[lt] }));
      return h('div', { cls: 'item prow k-tile' + (it.done ? ' done' : '') }, lamp, h('span', { cls: 'itime', text: it.win ? 'season' : fmtT(it.time) }),
        h('button', { type: 'button', cls: 'ititle linkish', text: it.title, onclick: function () { ui.openQuest(it.key); } }), h('span', { cls: 'tag', text: (q0 && T.labelOf && (T.labelOf(a.S, q0) || {}).name) || 'tile' })); // 2.8.0: its label, if it has one
    }
    if (it.src === 'iching') return h('div', { cls: 'item prow k-iching' + (it.done ? ' done' : '') }, h('span', { cls: 'pdot', text: it.done ? 'x' : '' }), h('span', { cls: 'itime', text: fmtT(it.time) }),
      h('button', { type: 'button', cls: 'ititle linkish', text: it.title, onclick: function () { ui.go('journal', 'today'); } }), h('span', { cls: 'tag', text: tag }));
    var row = h('div', { cls: 'item prow k-' + it.kind + (it.done ? ' done' : '') },
      it.src === 'task' || it.kind === 'bill' || it.kind === 'event' ? h('input', { type: 'checkbox', checked: !!it.done, 'aria-label': (it.kind === 'bill' ? 'Paid: ' : 'Done: ') + it.title, onchange: function (e) {
        if (it.src === 'task') a.addEvents([{ type: 'task_done', data: { key: it.key, date: day } }]);
        else a.addEvents([{ type: 'plan_paid', data: { key: p.key, period: PL.period(p, day), paid: e.target.checked } }]);
      } }) : h('span', { cls: 'pdot' }),
      h('span', { cls: 'itime', text: fmtT(it.time) || '' }),
      h('button', { type: 'button', cls: 'ititle linkish', text: it.title + (it.amount ? ' · ' + PL.money(it.amount) : ''), onclick: function () { if (it.src === 'task') k.editReminder(it.key); else planSheet(p); } }),
      h('span', { cls: 'tag', text: tag }));
    return row;
  }
  function billsDue(p) {
    var a = app(), S = a.S, k = K(), t = today();
    var due = PL.billsDue(S, t, 7);
    if (due.length) {
      p.appendChild(h('h3', { cls: 'qgroup', text: 'Bills to pay' }));
      due.forEach(function (b) {
        p.appendChild(h('div', { cls: 'item billdue' + (b.late ? ' late' : '') }, h('span', { cls: 'ititle', text: b.p.title + (b.p.amount ? ' · ' + PL.money(b.p.amount) : '') }),
          h('span', { cls: 'tag', text: b.late ? 'past due ' + U.fmtDay(b.day) : b.day === t ? 'due today' : 'due ' + U.fmtDay(b.day) }),
          k.btn('Paid', function () { a.addEvents([{ type: 'plan_paid', data: { key: b.p.key, period: PL.period(b.p, b.day), paid: true } }]).then(function () { k.snack(b.p.title + ' marked paid.', function () { a.addEvents([{ type: 'plan_paid', data: { key: b.p.key, period: PL.period(b.p, b.day), paid: false } }]); }); }); }, 'mini primary')));
      });
    }
  }
  function agenda(into, noBills) {
    var a = app(), S = a.S, k = K(), p = into || body(), t = today();
    if (!noBills) billsDue(p);
    var ag = PL.agenda(S, t, 15);
    if (!ag.length || ag[0].day !== t) { p.appendChild(h('div', { cls: 'daysep2', text: 'Today' })); p.appendChild(k.empty('Nothing planned today. Tap + Add for an event, a bill, or money in and out.')); }
    ag.forEach(function (d) {
      p.appendChild(h('div', { cls: 'daysep2', text: d.day === t ? 'Today' : d.day === U.addDays(t, 1) ? 'Tomorrow' : Wd.cap(U.fmtDay(d.day)) }));
      d.items.forEach(function (it) { p.appendChild(dayRow(it, d.day)); });
    });
    p.appendChild(h('p', { cls: 'small', text: 'Tap anything to change it.' }));
  }
  function calendar(into, rg) {
    var a = app(), S = a.S, k = K(), p = into || body(), t = today(), month = PN.state.calMonth || (rg ? rg.from.slice(0, 7) : t.slice(0, 7));
    rg = rg || { from: t, to: t };
    var first = U.dayToDate(month + '-01'), title = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][first.getMonth()] + ' ' + first.getFullYear();
    function shift(n) { var d = U.dayToDate(month + '-01'); d.setMonth(d.getMonth() + n); PN.state.calMonth = d.getFullYear() + '-' + U.p2(d.getMonth() + 1); ui.renderPanel(true); }
    p.appendChild(h('div', { cls: 'row spread calnav' }, k.btn('<', function () { shift(-1); }, 'mini'), h('b', { cls: 'caltitle', text: title }), k.btn('>', function () { shift(1); }, 'mini')));
    var grid = h('div', { cls: 'cal', role: 'grid' });
    ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(function (d) { grid.appendChild(h('div', { cls: 'calh', text: d })); });
    for (var i = 0; i < first.getDay(); i++) grid.appendChild(h('div', { cls: 'calc empty' }));
    var last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    for (var dd = 1; dd <= last; dd++) (function (day) {
      var ti = tileItems(S, day), n = ti.filter(function (x) { return !x.win; }).length, left = ti.filter(function (x) { return !x.win && !x.done; }).length, inR = day >= rg.from && day <= rg.to;
      var cell = h('button', { type: 'button', cls: 'calc' + (day === t ? ' today' : '') + (inR ? ' sel' : '') + (inR && rg.from !== rg.to ? ' rng' : '') + (ti.some(function (x) { return x.win; }) ? ' inrange' : ''), 'aria-pressed': inR ? 'true' : 'false', 'aria-label': U.fmtDay(day) + ': ' + n + ' tile' + (n === 1 ? '' : 's'), onclick: function () {
          var st0 = PN.state;
          if (st0.planPick === 'first') { st0.planFrom = st0.planTo = day; st0.planPick = 'last'; }
          else if (st0.planPick === 'last') { if (day < st0.planFrom) { st0.planTo = st0.planFrom; st0.planFrom = day; } else st0.planTo = day; st0.planPick = null; }
          else { st0.planFrom = st0.planTo = day; }
          st0.calMonth = month; ui.renderPanel(true);
        } },
        h('span', { cls: 'cald', text: String(+day.slice(8)) }), h('span', { cls: 'caldots' }, n ? h('i', { cls: 'k-tile' + (left ? '' : ' alldone') }) : null, n > 1 ? h('i', { cls: 'k-tile' + (left > 1 ? '' : ' alldone') }) : null));
      grid.appendChild(cell);
    })(month + '-' + U.p2(dd));
    p.appendChild(grid);
  }

  // Add or edit a planner item
  function planSheet(p0, dflt) {
    var a = app(), S = a.S, k = K(), it = p0 || {}, s;
    dflt = dflt || {};
    var kind = k.sel(PL.KINDS, it.kind || dflt.kind || 'event', function () { showFields(); });
    var title = k.inp({ value: it.title || '', placeholder: 'e.g. Electric bill, Vet visit, Sold a print', autocapitalize: 'sentences', spellcheck: true });
    var date = k.inp({ type: 'date', value: it.date || dflt.date || today() }), time = k.inp({ type: 'time', value: it.time || '' });
    var amount = k.inp({ type: 'number', step: '0.01', min: '0', inputmode: 'decimal', value: it.amount || '', placeholder: '0.00' });
    var repeat = k.sel(PL.REPEATS, it.repeat || (it.kind === 'bill' || dflt.kind === 'bill' ? 'monthly' : 'once'), function () { showFields(); });
    var catOpts = {}; PL.CATS.forEach(function (c) { catOpts[c] = c; }); if (it.cat && !catOpts[it.cat]) catOpts[it.cat] = it.cat;
    var cat = k.sel(catOpts, it.cat || 'Other', function () {});
    var notes = h('textarea', { rows: 3, value: it.notes || '', 'aria-label': 'Notes' });
    var ents = { '': 'Mine (personal)' }; PL.folders(S).forEach(function (f) { ents[f.name] = f.name; }); bizBooks(S).forEach(function (f) { ents[f] = f; }); if (it.folder && !ents[it.folder]) ents[it.folder] = it.folder;
    var owner = k.sel(ents, it.key ? (it.folder || '') : (dflt.ent || ''), function () {}), fOwner = k.field('Whose books', owner);
    if (Object.keys(ents).length < 2) fOwner.hidden = true; // only when you have a business
    var remind = h('input', { type: 'checkbox', checked: !!(it.key && S.tasks['plan-' + it.key] && !S.tasks['plan-' + it.key].off) });
    var fDate = k.field('Date', date), fTime = k.field('Time (optional)', time);
    var fAmt = k.field('Amount ($)', amount), fRep = k.field('Repeats', repeat), fCat = k.field('Category', cat), fRem = h('label', { cls: 'item' }, remind, h('span', { cls: 'ititle', text: 'Remind me at that time (once or weekly)' }));
    var m = h('p', { cls: 'formmsg' });
    function showFields() {
      var kd = kind.value, worth = kd === 'asset' || kd === 'debt';
      fAmt.style.display = kd === 'event' ? 'none' : '';
      fAmt.querySelector('.flabel').textContent = worth ? 'What it\'s worth / what you owe ($)' : 'Amount ($)';
      fRep.style.display = kd === 'income' || kd === 'expense' || worth ? 'none' : '';
      fCat.style.display = kd === 'event' ? 'none' : '';
      fRem.style.display = kd === 'event' || kd === 'bill' ? '' : 'none';
      fTime.style.display = worth ? 'none' : '';
      fDate.querySelector('.flabel').textContent = worth ? 'As of' : 'Date';
    }
    function save() {
      var kd = kind.value, t = title.value.trim();
      if (!t) return k.msg(m, 'Give it a name.', true);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date.value)) return k.msg(m, 'Pick a date.', true);
      var key = it.key || ('p-' + U.id().replace(/[^A-Za-z0-9]/g, '').slice(0, 12));
      var d = { key: key, kind: kd, title: t.slice(0, 80), date: date.value, time: kd === 'asset' || kd === 'debt' ? '' : time.value || '', amount: kd === 'event' ? 0 : Math.abs(+amount.value || 0), folder: owner.value, repeat: kd === 'income' || kd === 'expense' || kd === 'asset' || kd === 'debt' ? 'once' : repeat.value, cat: kd === 'event' ? '' : cat.value, notes: notes.value.trim() };
      var ev = [{ type: 'plan', data: d }], tk = 'plan-' + key;
      // the reminder lives in the reminder system (so it pops up and knocks like any other)
      var canRemind = (kd === 'event' || kd === 'bill') && (d.repeat === 'once' || d.repeat === 'weekly');
      if (remind.checked && canRemind) {
        var td = { key: tk, title: t.slice(0, 60), time: d.time || '09:00' };
        if (d.repeat === 'weekly') { td.repeat = 'days'; td.days = [U.weekday(d.date)]; } else { td.repeat = 'once'; td.date = d.date; }
        ev.push({ type: 'task_set', data: td });
      } else if (S.tasks[tk] && !S.tasks[tk].off) ev.push({ type: 'task_off', data: { key: tk, removed: true } });
      s.remove();
      a.addEvents(ev).then(function () { k.snack((it.key ? 'Updated ' : 'Added ') + t + '.'); if (remind.checked && !canRemind) k.snack('Saved. Reminders work for one-time and weekly items; monthly ones show in your agenda and ' + S.totemName + ' mentions bills when they\'re due.'); });
    }
    s = k.sheet(it.key ? 'Edit' : 'Add to the planner', [
      k.field('What kind', kind), k.field('Name', title), fOwner, h('div', { cls: 'row2' }, fDate, fTime),
      h('div', { cls: 'row2' }, fAmt, fRep), fCat, fRem, k.field('Notes', notes), m,
      h('div', { cls: 'row spread' }, it.key ? k.btn('Delete', function () {
        s.remove(); var back = Object.assign({}, it); delete back.m;
        a.addEvents([{ type: 'plan', data: Object.assign({}, back, { removed: true }) }].concat(S.tasks['plan-' + it.key] && !S.tasks['plan-' + it.key].off ? [{ type: 'task_off', data: { key: 'plan-' + it.key, removed: true } }] : []))
          .then(function () { k.snack('Deleted "' + it.title + '".', function () { a.addEvents([{ type: 'plan', data: Object.assign({}, back, { removed: false }) }]); }); });
      }, 'mini del') : h('span'), k.btn('Save', save, 'primary'))]);
    showFields();
  }
  PN.planSheet = planSheet;
  function reminders(into) {
    var a = app(), S = a.S, k = K(), p = into || body(), t = today();
    var keys = Object.keys(S.tasks).filter(function (kk) { return S.tasks[kk].title && !(S.tasks[kk].off && S.tasks[kk].removed); }).sort(function (x, y) { return S.tasks[x].time < S.tasks[y].time ? -1 : 1; });
    var on = keys.filter(function (kk) { return !S.tasks[kk].off && (S.tasks[kk].repeat !== 'once' || S.tasks[kk].date >= t); });
    p.appendChild(h('p', { cls: 'small', text: 'Reminders ring (sound and voice) while ' + S.totemName + ' is open, and the Today counter in ' + S.totemName + '\'s world turns red. A tile with a time keeps its own reminder here.' }));
    if (!on.length) p.appendChild(k.empty('No reminders yet.'));
    var RL = { once: '', daily: 'every day', weekdays: 'weekdays', weekends: 'weekends', days: 'some days' };
    on.forEach(function (kk) {
      var tt = S.tasks[kk];
      p.appendChild(h('div', { cls: 'item' }, h('span', { cls: 'itime', text: fmtT(tt.time) }), h('button', { type: 'button', cls: 'ititle linkish', text: tt.title, onclick: function () { k.editReminder(kk); } }),
        h('span', { cls: 'tag', text: tt.repeat === 'once' ? U.fmtDay(tt.date) : (RL[tt.repeat] || tt.repeat) }),
        k.iconBtn('Delete ' + tt.title, 'X', function () { k.deleteReminder(kk); }, 'del')));
    });
    var offs = keys.filter(function (kk) { return S.tasks[kk].off; });
    if (offs.length) p.appendChild(k.acc('pl-off', 'Turned off', offs.map(function (kk) {
      var tt = S.tasks[kk];
      return h('div', { cls: 'item dim' }, h('span', { cls: 'itime', text: fmtT(tt.time) }), h('span', { cls: 'ititle', text: tt.title }),
        k.btn('Turn on', function () { var d = { key: kk, title: tt.title, time: tt.time, repeat: tt.repeat, date: tt.date, days: tt.days, kind: tt.kind }; if (d.repeat === 'once' && d.date < t) d.date = t; a.addEvents([{ type: 'task_set', data: d }]); }, 'mini'),
        k.iconBtn('Delete ' + tt.title, 'X', function () { k.deleteReminder(kk); }, 'del'));
    }), false, offs.length));
  }
  /* ---------- money ---------- */
  // Finance for one entity: you (ent '') or a business (its folder name). Each keeps its own books.
  PN.financeInto = function (into, ent) { money(into, ent || ''); };
  function money(into, ent) {
    var a = app(), S = a.S, k = K(), p = into || body(), t = today(), mo = PN.state.moneyMonth || t.slice(0, 7), sum = PL.month(S, mo, ent);
    function shift(n) { var d = U.dayToDate(mo + '-01'); d.setMonth(d.getMonth() + n); PN.state.moneyMonth = d.getFullYear() + '-' + U.p2(d.getMonth() + 1); ui.renderPanel(true); }
    var d0 = U.dayToDate(mo + '-01');
    p.appendChild(h('div', { cls: 'row spread calnav' }, k.btn('<', function () { shift(-1); }, 'mini'), h('b', { cls: 'caltitle', text: U.MONTHS[d0.getMonth()] + ' ' + d0.getFullYear() }), k.btn('>', function () { shift(1); }, 'mini')));
    p.appendChild(h('div', { cls: 'mgrid' },
      h('div', { cls: 'mcell in' }, h('span', { text: 'Money in' }), h('b', { text: PL.money(sum.income) })),
      h('div', { cls: 'mcell out' }, h('span', { text: 'Money out' }), h('b', { text: PL.money(sum.out) }), h('small', { text: 'spending + paid bills' })),
      h('div', { cls: 'mcell' }, h('span', { text: 'Bills' }), h('b', { text: PL.money(sum.billsPaid) + ' / ' + PL.money(sum.bills) }), h('small', { text: 'paid / due' })),
      h('div', { cls: 'mcell' + (sum.net < 0 ? ' out' : ' in') }, h('span', { text: 'Cash flow' }), h('b', { text: PL.money(sum.net) }), h('small', { text: 'in minus out' }))));
    p.appendChild(h('div', { cls: 'row wrap' }, k.btn('+ Money in', function () { planSheet(null, { kind: 'income', ent: ent, date: mo === t.slice(0, 7) ? t : mo + '-01' }); }, 'mini'),
      k.btn('+ Money out', function () { planSheet(null, { kind: 'expense', ent: ent, date: mo === t.slice(0, 7) ? t : mo + '-01' }); }, 'mini'), k.btn('+ Bill', function () { planSheet(null, { kind: 'bill', ent: ent, date: t }); }, 'mini')));
    // cash flow, last 6 months (bars drawn to one scale)
    var cf = PL.cashflow(S, mo, 6, ent), top = Math.max.apply(null, [1].concat(cf.map(function (x) { return Math.max(x.income, x.out); })));
    var chart = h('div', { cls: 'cflow', role: 'img', 'aria-label': 'Cash flow, last 6 months: ' + cf.map(function (x) { return U.MONTHS[+x.month.slice(5) - 1] + ' in ' + PL.money(x.income) + ' out ' + PL.money(x.out); }).join('; ') });
    cf.forEach(function (x) {
      chart.appendChild(h('div', { cls: 'cfm' + (x.month === mo ? ' cur' : '') },
        h('div', { cls: 'cfbars' }, h('i', { cls: 'bin', style: 'height:' + Math.round(x.income / top * 100) + '%', title: 'In ' + PL.money(x.income) }), h('i', { cls: 'bout', style: 'height:' + Math.round(x.out / top * 100) + '%', title: 'Out ' + PL.money(x.out) })),
        h('span', { text: U.MONTHS[+x.month.slice(5) - 1] }), h('small', { cls: x.net < 0 ? 'neg' : 'pos', text: (x.net < 0 ? '-' : '+') + PL.money(Math.abs(x.net)).replace('$', '$') })));
    });
    p.appendChild(h('h3', { cls: 'qgroup', text: 'Cash flow (last 6 months)' }));
    p.appendChild(chart);
    p.appendChild(h('p', { cls: 'small calkey' }, h('i', { cls: 'k-income' }), ' money in  ', h('i', { cls: 'k-expense' }), ' money out (spending + paid bills)  · tallest bar = ' + PL.money(top)));
    // the accountant's T-chart for this month's cash
    var leftRows = sum.rows.filter(function (r) { return r.kind === 'income'; }), rightRows = sum.rows.filter(function (r) { return r.kind === 'expense'; }).map(function (r) { return { title: r.title, amount: r.amount, date: r.date }; });
    PL.items(S, 'bill', ent).forEach(function (b) { var last = new Date(d0.getFullYear(), d0.getMonth() + 1, 0).getDate(); for (var dd = 1; dd <= last; dd++) { var day = mo + '-' + U.p2(dd); if (PL.occursOn(b, day) && PL.isPaid(S, b, day)) rightRows.push({ title: b.title + ' (bill)', amount: b.amount, date: day }); } });
    function tcol(title, rows, total, cls) {
      return h('div', { cls: 'tcol ' + cls }, h('b', { cls: 'thead', text: title }),
        rows.length ? rows.map(function (r) { return h('div', { cls: 'trow' }, h('span', { text: (+r.date.slice(8)) + ' ' + r.title }), h('span', { cls: 'tamt', text: PL.money(r.amount) })); }) : h('div', { cls: 'trow empty', text: 'nothing yet' }),
        h('div', { cls: 'trow ttotal' }, h('span', { text: 'Total' }), h('span', { cls: 'tamt', text: PL.money(total) })));
    }
    p.appendChild(h('h3', { cls: 'qgroup', text: 'T-chart: cash this month' }));
    p.appendChild(h('div', { cls: 'tchart' }, tcol('Debit (money in)', leftRows, sum.income, 'tl'), tcol('Credit (money out)', rightRows, sum.out, 'tr')));
    p.appendChild(h('div', { cls: 'tbal ' + (sum.net < 0 ? 'neg' : 'pos'), text: (sum.net < 0 ? 'Short by ' : 'Left over: ') + PL.money(Math.abs(sum.net)) }));
    // net worth
    var W0 = PL.worth(S, ent);
    p.appendChild(h('h3', { cls: 'qgroup', text: 'Net worth (what you own minus what you owe)' }));
    p.appendChild(h('div', { cls: 'tchart' },
      h('div', { cls: 'tcol tl' }, h('b', { cls: 'thead', text: 'Own (assets)' }), W0.assets.map(function (x) { return h('button', { type: 'button', cls: 'trow linkish', onclick: function () { planSheet(x); } }, h('span', { text: x.title }), h('span', { cls: 'tamt', text: PL.money(x.amount) })); }),
        h('div', { cls: 'trow ttotal' }, h('span', { text: 'Total' }), h('span', { cls: 'tamt', text: PL.money(W0.totalAssets) }))),
      h('div', { cls: 'tcol tr' }, h('b', { cls: 'thead', text: 'Owe (debts)' }), W0.debts.map(function (x) { return h('button', { type: 'button', cls: 'trow linkish', onclick: function () { planSheet(x); } }, h('span', { text: x.title }), h('span', { cls: 'tamt', text: PL.money(x.amount) })); }),
        h('div', { cls: 'trow ttotal' }, h('span', { text: 'Total' }), h('span', { cls: 'tamt', text: PL.money(W0.totalDebts) })))));
    p.appendChild(h('div', { cls: 'tbal ' + (W0.net < 0 ? 'neg' : 'pos'), text: 'Net worth: ' + PL.money(W0.net) }));
    p.appendChild(h('div', { cls: 'row wrap' }, k.btn('+ Something I own', function () { planSheet(null, { kind: 'asset', ent: ent, date: t }); }, 'mini'), k.btn('+ Something I owe', function () { planSheet(null, { kind: 'debt', ent: ent, date: t }); }, 'mini')));
    p.appendChild(h('p', { cls: 'small', text: ent ? 'Business assets: equipment, inventory, the business account, a work vehicle. Business debts: loans, the business card. Keep personal things in You (personal).' : 'Assets: savings, a vehicle, your home, equipment. Debts: loans, credit cards. Business money goes in that business\'s Finance.' }));
    // bills this month
    var bills = PL.items(S, 'bill', ent);
    p.appendChild(h('h3', { cls: 'qgroup', text: 'Bills' }));
    if (!bills.length) p.appendChild(k.empty('No bills yet. Add electric, water, phone... and check them off each month.'));
    bills.forEach(function (b) {
      var last = new Date(d0.getFullYear(), d0.getMonth() + 1, 0).getDate(), dues = [];
      for (var dd = 1; dd <= last; dd++) { var day = mo + '-' + U.p2(dd); if (PL.occursOn(b, day)) dues.push(day); }
      dues.forEach(function (day) {
        var paid = PL.isPaid(S, b, day);
        p.appendChild(h('div', { cls: 'item' + (paid ? ' done' : '') }, h('input', { type: 'checkbox', checked: paid, 'aria-label': 'Paid: ' + b.title, onchange: function (e) { a.addEvents([{ type: 'plan_paid', data: { key: b.key, period: PL.period(b, day), paid: e.target.checked } }]); } }),
          h('span', { cls: 'itime', text: U.MONTHS[d0.getMonth()] + ' ' + (+day.slice(8)) }), h('button', { type: 'button', cls: 'ititle linkish', text: b.title + ' · ' + PL.money(b.amount), onclick: function () { planSheet(b); } }), h('span', { cls: 'tag', text: b.cat || 'bill' })));
      });
    });
    // log
    p.appendChild(h('h3', { cls: 'qgroup', text: 'Money in and out' }));
    if (!sum.rows.length) p.appendChild(k.empty('Nothing logged this month.'));
    sum.rows.forEach(function (r) {
      p.appendChild(h('div', { cls: 'item' }, h('span', { cls: 'itime', text: U.MONTHS[+r.date.slice(5, 7) - 1] + ' ' + (+r.date.slice(8)) }), h('button', { type: 'button', cls: 'ititle linkish', text: r.title, onclick: function () { planSheet(r); } }),
        h('span', { cls: 'tag', text: r.cat || 'Other' }), h('b', { cls: 'amt ' + (r.kind === 'income' ? 'in' : 'out'), text: (r.kind === 'income' ? '+' : '-') + PL.money(r.amount).replace('-', '') })));
    });
    var cats = Object.keys(sum.cats);
    if (cats.length) p.appendChild(k.acc('pl-cats', 'Where the money went', cats.sort(function (x, y) { return sum.cats[y] - sum.cats[x]; }).map(function (c) {
      return h('div', { cls: 'item' }, h('span', { cls: 'ititle', text: c }), h('span', { cls: 'catbar' }, h('i', { style: 'width:' + Math.round(sum.cats[c] / Math.max(1, sum.expense) * 100) + '%' })), h('b', { text: PL.money(sum.cats[c]) }));
    }), true, cats.length));
  }
  /* ---------- planner PDFs ---------- */
  function agendaDoc(S, month) {
    var t = today(), b = [{ t: 'title', text: month ? 'Plan - ' + monthName(month) : 'Plan - next two weeks' }, { t: 'sub', text: S.totemName + ' · made ' + U.fmtDay(t) }];
    var days = [];
    if (month) { var last = new Date(+month.slice(0, 4), +month.slice(5, 7), 0).getDate(); for (var i = 1; i <= last; i++) days.push(month + '-' + U.p2(i)); }
    else for (var j = 0; j < 15; j++) days.push(U.addDays(t, j));
    var any = false;
    days.forEach(function (d) {
      var its = PL.dayItems(S, d); if (!its.length) return; any = true;
      b.push({ t: 'h3', text: Wd.cap(U.fmtDay(d)) + ' (' + d + ')' });
      its.forEach(function (it) { b.push({ t: 'check', done: it.done, text: (it.time ? fmtT(it.time) + '  ' : '') + it.title + (it.amount ? '  ' + PL.money(it.amount) : '') + '  [' + (it.src === 'task' ? 'reminder' : PL.KINDS[it.kind] || it.kind) + ']' }); });
    });
    if (!any) b.push({ t: 'p', text: 'Nothing planned.' });
    var due = PL.billsDue(S, t, 14);
    if (due.length) { b.push({ t: 'h1', text: 'Bills to pay' }); due.forEach(function (x) { b.push({ t: 'check', text: x.p.title + '  ' + PL.money(x.p.amount) + '  due ' + x.day + (x.late ? ' (past due)' : '') }); }); }
    return { title: month ? 'Plan ' + monthName(month) : 'Plan ' + t, blocks: b };
  }
  function monthName(mo) { var d = U.dayToDate(mo + '-01'); return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][d.getMonth()] + ' ' + d.getFullYear(); }
  PN.monthName = monthName;
  function moneyDoc(S, mo, ent) {
    ent = ent || '';
    var sum = PL.month(S, mo, ent), b = [{ t: 'title', text: 'Finance - ' + PL.entName(ent) + ' - ' + monthName(mo) }, { t: 'sub', text: S.totemName + ' · made ' + PN.nice(today()) },
      { t: 'h1', text: 'T-chart: cash this month' }, { t: 'kv', k: 'Debit (money in)', v: PL.money(sum.income) }, { t: 'kv', k: 'Credit (money out: spending ' + PL.money(sum.expense) + ' + paid bills ' + PL.money(sum.billsPaid) + ')', v: PL.money(sum.out) }, { t: 'quote', text: (sum.net < 0 ? 'Short by ' : 'Left over: ') + PL.money(Math.abs(sum.net)) }, { t: 'kv', k: 'Bills paid / due', v: PL.money(sum.billsPaid) + ' / ' + PL.money(sum.bills) }];
    var bills = PL.items(S, 'bill', ent);
    if (bills.length) {
      b.push({ t: 'h1', text: 'Bills' });
      bills.forEach(function (x) { var last = new Date(+mo.slice(0, 4), +mo.slice(5, 7), 0).getDate(); for (var i = 1; i <= last; i++) { var day = mo + '-' + U.p2(i); if (PL.occursOn(x, day)) b.push({ t: 'check', done: PL.isPaid(S, x, day), text: day + '  ' + x.title + '  ' + PL.money(x.amount) + (x.cat ? '  (' + x.cat + ')' : '') }); } });
    }
    if (sum.rows.length) { b.push({ t: 'h1', text: 'Money in and out' }); sum.rows.forEach(function (r) { b.push({ t: 'li', text: r.date + '  ' + (r.kind === 'income' ? '+' : '-') + PL.money(r.amount).replace('-', '') + '  ' + r.title + '  (' + (r.cat || 'Other') + ')' + (r.notes ? ' - ' + r.notes : '') }); }); }
    var cf = PL.cashflow(S, mo, 6, ent); b.push({ t: 'h1', text: 'Cash flow, last 6 months' });
    cf.forEach(function (x) { b.push({ t: 'kv', k: monthName(x.month), v: 'in ' + PL.money(x.income) + '   out ' + PL.money(x.out) + '   cash flow ' + PL.money(x.net) }); });
    var W0 = PL.worth(S, ent);
    if (W0.assets.length || W0.debts.length) {
      b.push({ t: 'h1', text: 'Net worth' });
      b.push({ t: 'h3', text: 'Own (assets)' }); W0.assets.forEach(function (x) { b.push({ t: 'kv', k: x.title, v: PL.money(x.amount) + ' (as of ' + x.date + ')' }); });
      b.push({ t: 'h3', text: 'Owe (debts)' }); W0.debts.forEach(function (x) { b.push({ t: 'kv', k: x.title, v: PL.money(x.amount) + ' (as of ' + x.date + ')' }); });
      b.push({ t: 'quote', text: 'Net worth: ' + PL.money(W0.totalAssets) + ' - ' + PL.money(W0.totalDebts) + ' = ' + PL.money(W0.net) });
    }
    var cats = Object.keys(sum.cats);
    if (cats.length) { b.push({ t: 'h2', text: 'Where the money went' }); cats.sort(function (x, y) { return sum.cats[y] - sum.cats[x]; }).forEach(function (c) { b.push({ t: 'kv', k: c, v: PL.money(sum.cats[c]) }); }); }
    return { title: 'Finance ' + PL.entName(ent) + ' ' + monthName(mo), blocks: b };
  }
  PN.agendaDoc = agendaDoc; PN.moneyDoc = moneyDoc; PN.questsDoc = questsDoc;
})();
