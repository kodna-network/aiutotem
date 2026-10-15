/* AIU TOTEM 1.1.0 - the menus: Quests (lists) and the Planner. (Log is in ui.js; Library, I Ching and Accounts have their own files.)
   Everything here is always editable, and every delete has Undo. */
(function () {
  'use strict';
  var U = AIU.util, C = AIU.core, M = AIU.mind, Wd = AIU.words, h = U.h, ui = AIU.ui;
  var PN = AIU.panels = { state: {} };
  function app() { return AIU.app; }
  function K() { return ui.k; }
  function body() { return K().clear(ui.els.panel); }
  function today() { return U.dayStr(new Date(app().trueNow())); }
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
  function pdfBtn(fn) { return K().btn('Save as PDF', fn, 'mini'); }
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
  function labelsOf(S, list) { var o = {}; C.listItems(S, list).forEach(function (it) { if (it.label) o[it.label] = 1; }); Object.keys(S.lists).forEach(function (L) { C.listItems(S, L).forEach(function (it) { if (it.label) o[it.label] = 1; }); }); return Object.keys(o).sort(); }

  // 1.1.0i: two tabs. Quests (bigger goals with steps) and Lists (every list on one page: to-do, shopping, your own).
  PN.quests = function () {
    var a = app(), S = a.S, k = K(), lists = PN.lists(S), cur = ui.sub.quests || 'big';
    if (cur !== 'big') { if (cur !== 'lists' && lists.some(function (L) { return L.key === cur; })) PN.state.listFocus = cur; cur = 'lists'; }
    var openN = 0; lists.forEach(function (L) { openN += C.listItems(S, L.key).filter(function (x) { return !x.done; }).length; });
    var bigN = C.questList(S, 'active').filter(function (q) { return q.kind !== 'idea'; }).length;
    var subs = [['big', 'Quests' + (bigN ? ' ' + bigN : '')], ['lists', 'Lists' + (openN ? ' ' + openN : '')]];
    ui.panelHead(cur === 'lists' ? 'Lists' : 'Quests', [
      cur === 'lists' ? k.btn('+ New list', function () { newListSheet(); }, 'mini') : null,
      pdfBtn(function () { PN.savePdf(questsDoc(S), 'aiu-quests-' + today()); })
    ].filter(Boolean), subs, cur, function (v) { ui.questOpen = null; ui.go('quests', v); });
    if (cur === 'big') { if (ui.questOpen && S.quests[ui.questOpen] && S.quests[ui.questOpen].state !== 'deleted') k.questDetail(ui.questOpen); else { ui.questOpen = null; bigQuests(); } return; }
    allLists(lists);
  };
  // Every list on one page. One box adds to whichever list you pick (it remembers your last pick).
  function allLists(lists) {
    var a = app(), S = a.S, k = K(), p = body();
    var focus = PN.state.listFocus && lists.some(function (L) { return L.key === PN.state.listFocus; }) ? PN.state.listFocus : 'to-do';
    var opts = {}; lists.forEach(function (L) { opts[L.key] = L.title; });
    var which = k.sel(opts, focus, function (v) { PN.state.listFocus = v; showStore(); });
    which.setAttribute('aria-label', 'Which list');
    var allLabels = labelsOf(S, 'shopping'), dlId = 'stores-all';
    var store = k.inp({ placeholder: 'Store (optional)', 'aria-label': 'Store (optional)', cls: 'storein', value: PN.state.lastStore || '' });
    store.setAttribute('list', dlId);
    function kindOf(key) { var L = lists.filter(function (x) { return x.key === key; })[0]; return L ? L.kind : 'todo'; }
    function showStore() { store.style.display = kindOf(which.value) === 'shopping' ? '' : 'none'; }
    p.appendChild(h('datalist', { id: dlId }, allLabels.map(function (x) { return h('option', { value: x }); })));
    var add = k.addRow('Add something', function (v) {
      var key = which.value, shop = kindOf(key) === 'shopping', ev = [], lb = shop ? store.value.trim().slice(0, 30) : '';
      v.split(/\s*,\s*/).map(Wd.clean).filter(Boolean).slice(0, 20).forEach(function (it) { ev.push({ type: 'list_add', data: { list: key, item: it } }); if (lb) ev.push({ type: 'list_label', data: { list: key, item: it, label: Wd.cap(lb) } }); });
      if (shop) PN.state.lastStore = lb;
      PN.state.listFocus = key;
      a.addEvents(ev);
    }, store);
    p.appendChild(h('div', { cls: 'listadd' }, add, h('div', { cls: 'row wrap lpick' }, h('span', { cls: 'small', text: 'on the list:' }), which)));
    showStore();
    var any = false;
    lists.forEach(function (L) {
      var items = C.listItems(S, L.key), open = items.filter(function (x) { return !x.done; });
      if (!items.length && L.key !== 'to-do' && L.key !== 'shopping') return;
      any = true;
      p.appendChild(listSection(L, items, open));
    });
    if (!any) p.appendChild(k.empty('Nothing on your lists. Add something above.'));
    // everything checked off, in one place
    var done = []; lists.forEach(function (L) { C.listItems(S, L.key).filter(function (x) { return x.done; }).forEach(function (it) { done.push({ L: L, it: it }); }); });
    if (done.length) {
      var dbox = h('div');
      done.forEach(function (x) { dbox.appendChild(itemRow(x.L, x.it, [], true)); });
      dbox.appendChild(h('div', { cls: 'row wrap' }, k.btn('Clear checked items', function () {
        var back = done.slice();
        a.addEvents(back.map(function (x) { return { type: 'list_remove', data: { list: x.L.key, item: x.it.item } }; })).then(function () {
          k.snack('Cleared ' + back.length + ' item' + (back.length === 1 ? '' : 's') + '.', function () { a.addEvents([].concat.apply([], back.map(function (x) { return [{ type: 'list_add', data: { list: x.L.key, item: x.it.item } }, { type: 'list_check', data: { list: x.L.key, item: x.it.item, done: true } }]; }))); });
        });
      }, 'mini')));
      p.appendChild(k.acc('ql-done-all', 'Checked off', [dbox], false, done.length));
    }
  }
  function listSection(L, items, open) {
    var S = app().S, k = K(), shop = L.kind === 'shopping', labels = labelsOf(S, L.key), sec = h('section', { cls: 'lsec' });
    var tb = h('button', { type: 'button', cls: 'ltitle linkish', title: 'Rename or change this list', onclick: function () { newListSheet(L); } }, ui.pix(shop ? 'cart' : 'list'), ' ' + L.title + (open.length ? ' · ' + open.length : ''));
    sec.appendChild(h('h3', { cls: 'lhead' }, tb));
    if (!open.length) sec.appendChild(h('p', { cls: 'small dim', text: shop ? 'Nothing to buy.' : 'All clear.' }));
    if (shop && open.length) {
      var groups = {}; open.forEach(function (it) { var g = it.label || ''; (groups[g] = groups[g] || []).push(it); });
      Object.keys(groups).sort(function (x, y) { return !x ? 1 : !y ? -1 : x.localeCompare(y); }).forEach(function (g) {
        sec.appendChild(h('div', { cls: 'lgroup' }, h('span', { text: g || 'Any store' }), h('span', { cls: 'acount', text: String(groups[g].length) })));
        groups[g].forEach(function (it) { sec.appendChild(itemRow(L, it, labels)); });
      });
    } else open.forEach(function (it) { sec.appendChild(itemRow(L, it, labels)); });
    return sec;
  }
  function newListSheet(edit) {
    var a = app(), k = K(), name = k.inp({ placeholder: 'e.g. Walmart, Hardware store, Garden chores', value: edit ? edit.title : '', autocapitalize: 'sentences' }), m = h('p', { cls: 'formmsg' }), s;
    var kind = k.sel({ todo: 'To-do list (check things off)', shopping: 'Shopping list (sorted by store)' }, edit ? edit.kind : 'todo', function () {});
    s = k.sheet(edit ? 'List options' : 'New list', [k.field('Name', name), k.field('Kind', kind), m,
      h('div', { cls: 'row spread' },
        edit && edit.key !== 'to-do' && edit.key !== 'shopping' ? k.btn('Delete list', function () {
          s.remove(); var e0 = { list: edit.key, title: edit.title, kind: edit.kind };
          a.addEvents([{ type: 'list_meta', data: Object.assign({}, e0, { hidden: true }) }]).then(function () { ui.go('quests', 'lists'); k.snack('List "' + edit.title + '" deleted.', function () { a.addEvents([{ type: 'list_meta', data: e0 }]); }); });
        }, 'mini del') : h('span'),
        k.btn('Save', function () {
          var t = name.value.trim().slice(0, 40); if (!t) return k.msg(m, 'Give the list a name.', true);
          var key = edit ? edit.key : M.slug(t).slice(0, 30) || 'list';
          if (!edit && PN.lists(a.S).some(function (x) { return x.key === key; })) key = key + '-' + U.id().slice(-3).toLowerCase();
          s.remove(); a.addEvents([{ type: 'list_meta', data: { list: key, title: t, kind: kind.value } }]).then(function () { PN.state.listFocus = key; ui.go('quests', 'lists'); });
        }, 'primary'))]);
  }
  function listView(L) {
    var a = app(), S = a.S, k = K(), p = body(), items = C.listItems(S, L.key), open = items.filter(function (x) { return !x.done; }), done = items.filter(function (x) { return x.done; });
    var shop = L.kind === 'shopping', labels = labelsOf(S, L.key);
    p.appendChild(h('div', { cls: 'row spread lhead' }, h('h3', { cls: 'ltitle', text: L.title + (/list$/i.test(L.title) ? '' : ' list') + (shop ? ' (by store)' : '') }), k.btn('Options', function () { newListSheet(L); }, 'mini ghost')));
    // add
    var store = null;
    if (shop) {
      var dlId = 'stores-' + L.key; store = k.inp({ placeholder: 'Store', 'aria-label': 'Store (optional)', list: dlId, cls: 'storein', value: PN.state.lastStore || '' });
      store.setAttribute('list', dlId);
      p.appendChild(h('datalist', { id: dlId }, labels.map(function (x) { return h('option', { value: x }); })));
    }
    p.appendChild(k.addRow(shop ? 'Add an item' : 'Add a to-do', function (v) {
      var ev = [], lb = store ? store.value.trim().slice(0, 30) : '';
      v.split(/\s*,\s*/).map(Wd.clean).filter(Boolean).slice(0, 20).forEach(function (it) { ev.push({ type: 'list_add', data: { list: L.key, item: it } }); if (lb) ev.push({ type: 'list_label', data: { list: L.key, item: it, label: Wd.cap(lb) } }); });
      if (store) PN.state.lastStore = lb;
      a.addEvents(ev);
    }, store));
    if (!items.length) p.appendChild(k.empty(shop ? 'Nothing to buy. Add items above (put the store in the box beside it to group them).' : 'All clear. Add a to-do above.'));
    // open items (shopping: grouped by store)
    if (shop && open.length) {
      var groups = {}; open.forEach(function (it) { var g = it.label || ''; (groups[g] = groups[g] || []).push(it); });
      Object.keys(groups).sort(function (x, y) { return !x ? 1 : !y ? -1 : x.localeCompare(y); }).forEach(function (g) {
        p.appendChild(h('div', { cls: 'lgroup' }, h('span', { text: g || 'Any store' }), h('span', { cls: 'acount', text: String(groups[g].length) })));
        groups[g].forEach(function (it) { p.appendChild(itemRow(L, it, labels)); });
      });
    } else open.forEach(function (it) { p.appendChild(itemRow(L, it, labels)); });
    // checked off
    if (done.length) {
      var dbox = h('div');
      done.forEach(function (it) { dbox.appendChild(itemRow(L, it, labels)); });
      dbox.appendChild(h('div', { cls: 'row wrap' }, k.btn('Clear checked items', function () {
        var back = done.map(function (it) { return it.item; });
        a.addEvents(back.map(function (x) { return { type: 'list_remove', data: { list: L.key, item: x } }; })).then(function () {
          k.snack('Cleared ' + back.length + ' item' + (back.length === 1 ? '' : 's') + '.', function () { a.addEvents(back.map(function (x) { return { type: 'list_add', data: { list: L.key, item: x } }; }).concat(back.map(function (x) { return { type: 'list_check', data: { list: L.key, item: x, done: true } }; }))); });
        });
      }, 'mini')));
      p.appendChild(k.acc('ql-done-' + L.key, 'Checked off', [dbox], false, done.length));
    }
  }
  function itemRow(L, it, labels, showList) {
    var a = app(), k = K();
    var cb = h('input', { type: 'checkbox', checked: it.done, 'aria-label': (it.done ? 'Not done: ' : 'Done: ') + it.item, onchange: function () { a.addEvents([{ type: 'list_check', data: { list: L.key, item: it.item, done: !it.done } }]); } });
    var t = h('button', { type: 'button', cls: 'ititle linkish', text: it.item, title: 'Edit', onclick: function () { editItem(L, it, labels); } });
    return h('div', { cls: 'item' + (it.done ? ' done' : '') }, cb, t, showList ? h('span', { cls: 'tag', text: L.title }) : it.label && L.kind !== 'shopping' ? h('span', { cls: 'tag', text: it.label }) : null,
      k.iconBtn('Delete ' + it.item, 'X', function () {
        a.addEvents([{ type: 'list_remove', data: { list: L.key, item: it.item } }]).then(function () { k.snack('Deleted "' + it.item + '".', function () { a.addEvents([{ type: 'list_add', data: { list: L.key, item: it.item } }].concat(it.label ? [{ type: 'list_label', data: { list: L.key, item: it.item, label: it.label } }] : [])); }); });
      }, 'del'));
  }
  function editItem(L, it, labels) {
    var a = app(), S = a.S, k = K(), lists = PN.lists(S), opts = {};
    lists.forEach(function (x) { opts[x.key] = x.title; });
    k.editSheet('Edit item', [
      { label: 'Item', value: it.item },
      { label: L.kind === 'shopping' ? 'Store' : 'Label (optional)', value: it.label || '', hint: labels.length ? 'Used before: ' + labels.slice(0, 8).join(', ') : '' },
      { label: 'List', value: L.key, options: opts }
    ], function (v) {
      var nv = Wd.clean(v[0]), lb = Wd.cap(v[1].trim().slice(0, 30)), to = v[2], ev = [];
      if (!nv) return;
      if (nv !== it.item || to !== L.key) {
        ev.push({ type: 'list_remove', data: { list: L.key, item: it.item } }, { type: 'list_add', data: { list: to, item: nv } });
        if (it.done) ev.push({ type: 'list_check', data: { list: to, item: nv, done: true } });
        if (lb) ev.push({ type: 'list_label', data: { list: to, item: nv, label: lb } });
      } else if (lb !== (it.label || '')) ev.push({ type: 'list_label', data: { list: L.key, item: it.item, label: lb } });
      a.addEvents(ev);
    });
  }
  function bigQuests() {
    var a = app(), S = a.S, k = K(), p = body(), tr = C.tracked(S);
    p.appendChild(h('p', { cls: 'small', text: 'Something to get done, big or small, with steps. Tea with the animal friends, a job interview, a new garden bed.' }));
    var act = C.questList(S, 'active'), mains = act.filter(function (q) { return q.kind === 'main' || !q.kind; }), sides = act.filter(function (q) { return q.kind === 'side'; }), ideas = act.filter(function (q) { return q.kind === 'idea'; });
    var nq = k.inp({ placeholder: 'New quest, like "Mow the lawn"', autocapitalize: 'sentences', 'aria-label': 'New quest title' }), nk = { value: 'main' }; // 1.1.0i: kind can be changed on the quest itself
    function addQuest() {
      var v = Wd.cap(nq.value.trim()).slice(0, 48); if (!v) return;
      var key = M.slug(v), ev = M.questEvents(v, [], { kind: nk.value });
      if (!tr && nk.value !== 'idea') ev.push({ type: 'set', data: { k: 'track', v: key } });
      a.addEvents(ev).then(function () { ui.openQuest(key); if (nk.value !== 'idea') { a.addLine('Quest started: "' + v + '". What\'s the first step?'); a.pending = { type: 'quest_steps', data: { key: key, title: v, steps: [], kind: nk.value } }; a.store.set('pending', a.pending); } });
    }
    nq.addEventListener('keydown', function (e) { if (e.key === 'Enter') addQuest(); });
    p.appendChild(h('div', { cls: 'row addrow' }, nq, k.btn('Add', addQuest, 'mini primary')));
    if (!act.length) p.appendChild(k.empty('No quests yet. Add one above.'));
    if (mains.length) { p.appendChild(h('h3', { cls: 'qgroup', text: 'Main quests' })); mains.forEach(function (q) { p.appendChild(k.questRow(S, q, tr && tr.key === q.key)); }); }
    if (sides.length) { p.appendChild(h('h3', { cls: 'qgroup', text: 'Side quests' })); sides.forEach(function (q) { p.appendChild(k.questRow(S, q, tr && tr.key === q.key)); }); }
    if (ideas.length) { p.appendChild(h('h3', { cls: 'qgroup', text: 'Ideas' })); ideas.forEach(function (q) { p.appendChild(k.questRow(S, q, false)); }); }
    var past = C.questList(S).filter(function (q) { return q.state === 'done' || q.state === 'dropped'; });
    if (past.length) p.appendChild(k.acc('q-done', 'Done and set aside', past.map(function (q) {
      return h('div', { cls: 'item dim' }, h('span', { cls: 'ititle', text: q.title }), h('span', { cls: 'tag', text: q.state === 'done' ? 'complete' : 'set aside' }),
        k.btn('Open', function () { ui.openQuest(q.key); }, 'mini'), k.btn('Restart', function () { a.addEvents([{ type: 'quest_state', data: { key: q.key, state: 'active' } }]); }, 'mini'));
    }), false, past.length));
  }
  function questsDoc(S) {
    var b = [{ t: 'title', text: 'Quests' }, { t: 'sub', text: S.totemName + ' · ' + PN.nice(today()) }];
    PN.lists(S).forEach(function (L) {
      var items = C.listItems(S, L.key); if (!items.length) return;
      b.push({ t: 'h1', text: L.title });
      if (L.kind === 'shopping') {
        var groups = {}; items.forEach(function (it) { (groups[it.label || 'Any store'] = groups[it.label || 'Any store'] || []).push(it); });
        Object.keys(groups).sort().forEach(function (g) { b.push({ t: 'h3', text: g }); groups[g].forEach(function (it) { b.push({ t: 'check', text: it.item, done: it.done }); }); });
      } else items.forEach(function (it) { b.push({ t: 'check', text: it.item + (it.label ? '  (' + it.label + ')' : ''), done: it.done }); });
    });
    var qs = C.questList(S).filter(function (q) { return q.state === 'active'; });
    if (qs.length) {
      b.push({ t: 'h1', text: 'Quests' });
      qs.forEach(function (q) {
        b.push({ t: 'h2', text: q.title + (q.kind === 'side' ? ' (side quest)' : q.kind === 'idea' ? ' (idea)' : '') });
        if (q.why) b.push({ t: 'p', text: q.why });
        C.questSteps(S, q).forEach(function (st) { b.push({ t: 'check', text: st.title, done: st.done }); });
        C.questNotes(S, q.key).slice(-5).forEach(function (n) { b.push({ t: 'small', text: U.fmtDay(U.dayStr(new Date(n.t))) + ': ' + n.text }); });
      });
    }
    return { title: 'Quests - ' + today(), blocks: b };
  }

  /* =====================================================================================
     PLANNER: agenda, calendar, business folders, money, reminders.
     ===================================================================================== */
  var PL = AIU.planner;
  // 1.1.0i: the Planner is just the schedule. Finance is its own menu; Business is set aside (its data is kept).
  PN.planner = function () {
    var a = app(), S = a.S, k = K(), cur = ui.sub.planner || 'schedule';
    if (cur === 'money' || cur === 'finance') { ui.sub.planner = 'schedule'; return ui.go('finance'); }
    if (cur === 'self' || cur === 'iching') { ui.sub.planner = 'schedule'; return ui.go('journal', cur === 'self' ? 'me' : 'iching'); }
    ui.sub.planner = 'schedule';
    ui.panelHead('Planner', [k.btn('+ Add', function () { planSheet(null, { date: PN.state.calDay || today() }); }, 'mini primary'),
      k.btn('+ Reminder', function () { k.editReminder(null); }, 'mini'),
      pdfBtn(function () { var mo = PN.state.calMonth || today().slice(0, 7); PN.savePdf(agendaDoc(S, mo), 'aiu-planner-' + mo); })], null);
    schedule();
  };
  // Finance (its own menu): your money. Books a business kept in 1.1.0i still show, as a pick at the top.
  function bizBooks(S) { var o = {}; (PL.items(S) || []).forEach(function (x) { if (x.folder && x.folder !== PL.ME) o[x.folder] = 1; }); return Object.keys(o).sort(); }
  PN.bizBooks = bizBooks;
  function financeEnt(S) { var e = PN.state.fent || ''; if (e && bizBooks(S).indexOf(e) < 0) e = PN.state.fent = ''; return e; }
  PN.openFinance = function (ent) { PN.state.fent = ent || ''; ui.go('finance'); };
  PN.finance = function () {
    var a = app(), S = a.S, k = K(), ent = financeEnt(S), books = bizBooks(S);
    ui.panelHead('Finance', [pdfBtn(function () { PN.financePdf(ent); })], null);
    var p = body();
    if (books.length) p.appendChild(h('div', { cls: 'chips bsub', role: 'group', 'aria-label': 'Whose books' }, [['', 'Mine']].concat(books.map(function (f) { return [f, f]; })).map(function (x) {
      return k.btn(x[1], function () { PN.state.fent = x[0]; ui.renderPanel(true); }, 'chip' + (ent === x[0] ? ' on' : ''));
    })));
    money(p, ent);
  };
  // Schedule: bills due, the month calendar with the picked day's list, then what's coming and your reminders
  function schedule() {
    var p = body();
    billsDue(p);
    calendar(p);
    var ag = h('div'), rm = h('div');
    agenda(ag, true); reminders(rm);
    p.appendChild(K().acc('pl-coming', 'Coming up (next two weeks)', [ag], false));
    p.appendChild(K().acc('pl-reminders', 'Reminders', [rm], false, Object.keys(app().S.tasks).filter(function (kk) { var t0 = app().S.tasks[kk]; return t0.title && !t0.off && (t0.repeat !== 'once' || t0.date >= today()); }).length));
  }
  function c24() { return K().c24(); }
  function fmtT(t) { return t ? U.fmtHm(t, c24()) : ''; }
  // One row in the agenda / calendar
  function dayRow(it, day) {
    var a = app(), k = K(), p = it.p;
    var tag = it.src === 'task' ? (it.kind === 'wake' ? 'wake-up' : 'reminder') : it.src === 'iching' ? 'i ching' : (PL.KINDS[it.kind] || it.kind).toLowerCase() + (p && p.folder ? ' · ' + p.folder : '');
    if (it.src === 'iching') return h('div', { cls: 'item prow k-iching' + (it.done ? ' done' : '') }, h('span', { cls: 'pdot', text: it.done ? 'x' : '' }), h('span', { cls: 'itime', text: fmtT(it.time) }),
      h('button', { type: 'button', cls: 'ititle linkish', text: it.title, onclick: function () { ui.go('journal', 'iching'); } }), h('span', { cls: 'tag', text: tag }));
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
  function calendar(into) {
    var a = app(), S = a.S, k = K(), p = into || body(), t = today(), month = PN.state.calMonth || t.slice(0, 7), sel = PN.state.calDay || t;
    if (sel.slice(0, 7) !== month) sel = month === t.slice(0, 7) ? t : month + '-01';
    var first = U.dayToDate(month + '-01'), title = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][first.getMonth()] + ' ' + first.getFullYear();
    function shift(n) { var d = U.dayToDate(month + '-01'); d.setMonth(d.getMonth() + n); PN.state.calMonth = d.getFullYear() + '-' + U.p2(d.getMonth() + 1); PN.state.calDay = null; ui.renderPanel(true); }
    p.appendChild(h('div', { cls: 'row spread calnav' }, k.btn('<', function () { shift(-1); }, 'mini'), h('b', { cls: 'caltitle', text: title }), k.btn('>', function () { shift(1); }, 'mini')));
    var grid = h('div', { cls: 'cal', role: 'grid' });
    ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(function (d) { grid.appendChild(h('div', { cls: 'calh', text: d })); });
    for (var i = 0; i < first.getDay(); i++) grid.appendChild(h('div', { cls: 'calc empty' }));
    var last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    for (var dd = 1; dd <= last; dd++) (function (day) {
      var items = PL.dayItems(S, day), kinds = {};
      items.forEach(function (it) { kinds[it.kind] = 1; });
      var cell = h('button', { type: 'button', cls: 'calc' + (day === t ? ' today' : '') + (day === sel ? ' sel' : ''), 'aria-label': U.fmtDay(day) + ': ' + items.length + ' item' + (items.length === 1 ? '' : 's'), onclick: function () { PN.state.calMonth = month; PN.state.calDay = day; ui.renderPanel(true); } },
        h('span', { cls: 'cald', text: String(+day.slice(8)) }), h('span', { cls: 'caldots' }, Object.keys(kinds).slice(0, 4).map(function (kk) { return h('i', { cls: 'k-' + kk }); })));
      grid.appendChild(cell);
    })(month + '-' + U.p2(dd));
    p.appendChild(grid);
    p.appendChild(h('div', { cls: 'row spread daysep2' }, h('span', { text: Wd.cap(U.fmtDay(sel)) }), k.btn('+ Add on this day', function () { planSheet(null, { date: sel }); }, 'mini')));
    var its = PL.dayItems(S, sel);
    if (!its.length) p.appendChild(k.empty('Nothing on this day.'));
    its.forEach(function (it) { p.appendChild(dayRow(it, sel)); });
    p.appendChild(h('p', { cls: 'small calkey' }, h('i', { cls: 'k-event' }), ' event  ', h('i', { cls: 'k-bill' }), ' bill  ', h('i', { cls: 'k-income' }), ' money in  ', h('i', { cls: 'k-expense' }), ' money out  ', h('i', { cls: 'k-reminder' }), ' reminder  ', h('i', { cls: 'k-iching' }), ' I Ching'));
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
    var ents = { '': 'Mine' }; bizBooks(S).forEach(function (f) { ents[f] = f; }); if (it.folder && !ents[it.folder]) ents[it.folder] = it.folder;
    var owner = k.sel(ents, it.key ? (it.folder || '') : (dflt.ent || ''), function () {}), fOwner = k.field('Whose books', owner);
    if (Object.keys(ents).length < 2) fOwner.hidden = true; // 1.1.0i: only when older business books exist
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
    p.appendChild(h('p', { cls: 'small', text: 'Reminders pop up with a knock while ' + S.totemName + ' is open.' }));
    p.appendChild(k.btn('+ Reminder', function () { k.editReminder(null); }, 'mini'));
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
  PN.financePdf = function (ent) { var S = app().S, mo = PN.state.moneyMonth || today().slice(0, 7); PN.savePdf(moneyDoc(S, mo, ent || ''), 'aiu-finance-' + (ent ? ent.replace(/[^A-Za-z0-9]+/g, '-').toLowerCase() : 'personal') + '-' + mo); };
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
    var t = today(), b = [{ t: 'title', text: month ? 'Planner - ' + monthName(month) : 'Planner - next two weeks' }, { t: 'sub', text: S.totemName + ' · made ' + U.fmtDay(t) }];
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
    return { title: month ? 'Planner ' + monthName(month) : 'Planner ' + t, blocks: b };
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
