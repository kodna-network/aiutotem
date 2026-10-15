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
  function bigQuests() {
    var a = app(), S = a.S, k = K(), p = body(), tr = C.tracked(S);
    p.appendChild(h('p', { cls: 'small', text: 'Something to get done, big or small, with steps. Tea with the animal friends, a job interview, a new garden bed.' }));
    var act = C.questList(S, 'active'), mains = act.filter(function (q) { return q.kind === 'main' || !q.kind; }), sides = act.filter(function (q) { return q.kind === 'side'; }), ideas = act.filter(function (q) { return q.kind === 'idea'; });
    var nq = k.inp({ placeholder: 'New quest, like "Mow the lawn"', autocapitalize: 'sentences', 'aria-label': 'New quest title' }), nk = { value: 'main' }; // 2.0.0: kind can be changed on the quest itself
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
  function addSheet() {
    var k = K(), s, day = PN.state.calDay || today();
    s = k.sheet('Add to ' + U.fmtDay(day), [h('div', { cls: 'morelist' },
      k.btn('An event', function () { s.remove(); planSheet(null, { date: day, kind: 'event' }); }),
      k.btn('A reminder', function () { s.remove(); k.editReminder(null); }),
      k.btn('A tile (something to get done)', function () { s.remove(); ui.go('quests'); PN.newTile(); }))]);
  }
  PN.openFinance = function (ent) { PN.state.fent = ent || ''; ui.go('finance'); };
  function planItems(S, day) {
    var T = AIU.tiles;
    return PL.dayItems(S, day).filter(function (it) { return !(it.src === 'task' && T && T.tileOfTask(S, it.key) && T.onDay(T.tileOfTask(S, it.key), day)); });
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
  function labelsOf(S, list) { var o = {}; C.listItems(S, list).forEach(function (it) { if (it.label) o[it.label] = 1; }); Object.keys(S.lists).forEach(function (L) { C.listItems(S, L).forEach(function (it) { if (it.label) o[it.label] = 1; }); }); return Object.keys(o).sort(); }
  function newListSheet(edit) {
    var a = app(), k = K(), name = k.inp({ placeholder: 'e.g. Weekend chores', value: edit ? edit.title : '', autocapitalize: 'sentences' }), m = h('p', { cls: 'formmsg' }), s;
    var kind = k.sel({ todo: 'To-do list (check things off)', shopping: 'Shopping list (sorted by store)' }, edit ? edit.kind : 'todo', function () {});
    s = k.sheet(edit ? 'List options' : 'New list', [k.field('Name', name), k.field('Kind', kind), m,
      h('div', { cls: 'row spread' },
        edit && edit.key !== 'to-do' && edit.key !== 'shopping' ? k.btn('Delete list', function () {
          s.remove(); var e0 = { list: edit.key, title: edit.title, kind: edit.kind };
          a.addEvents([{ type: 'list_meta', data: Object.assign({}, e0, { hidden: true }) }]).then(function () { ui.go('inventory'); k.snack('List "' + edit.title + '" deleted.', function () { a.addEvents([{ type: 'list_meta', data: e0 }]); }); });
        }, 'mini del') : h('span'),
        k.btn('Save', function () {
          var t = name.value.trim().slice(0, 40); if (!t) return k.msg(m, 'Give the list a name.', true);
          var key = edit ? edit.key : M.slug(t).slice(0, 30) || 'list';
          if (!edit && PN.lists(a.S).some(function (x) { return x.key === key; })) key = key + '-' + U.id().slice(-3).toLowerCase();
          s.remove(); a.addEvents([{ type: 'list_meta', data: { list: key, title: t, kind: kind.value } }]).then(function () { PN.state.listFocus = key; ui.go('inventory'); });
        }, 'primary'))]);
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
  PN.financePdf = function (ent) { var S = app().S, mo = PN.state.moneyMonth || today().slice(0, 7); PN.savePdf(moneyDoc(S, mo, ent || ''), 'aiu-finance-' + (ent ? ent.replace(/[^A-Za-z0-9]+/g, '-').toLowerCase() : 'personal') + '-' + mo); };
