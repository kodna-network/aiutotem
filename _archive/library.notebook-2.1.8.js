// Removed in 2.1.9: Aiu's notebook (topics, weekly recaps, questions, remembered, time capsules, the word-table glossary).
// The Journal page now has its own summary, search and glossary (words you use most). Hidden entries moved to the Journal page.
  /* ---------- the notebook (was More): what Aiu has learned about you, and its own past forms ---------- */
  function notebook() {
    var a = app(), S = a.S, k = K(), p = body(), A = AIU.art;
    p.appendChild(h('div', { cls: 'row spread' }, k.btn('< Journal', function () { st.jview = null; ui.go('journal', 'journal'); }, 'mini ghost')));
    p.appendChild(h('p', { cls: 'small', text: 'Everything ' + S.totemName + ' has learned from your journal: topics, things to remember, and its own word list (the glossary). Plus every form it has grown into.' }));
    var tl = C.topicList(S), tpb = h('div');
    if (!tl.length) tpb.appendChild(k.empty('Pages about the things in your life (fishing, the truck, your sister). Older ones came from talking with ' + S.totemName + '; you can edit them here.'));
    tl.forEach(function (rec) { tpb.appendChild(k.topicCard(a, rec)); });
    p.appendChild(k.acc('lib-topics', 'Topics', [tpb], true, tl.length));
    var rk = Object.keys(S.recaps).sort().reverse();
    if (rk.length) p.appendChild(k.acc('lib-recaps', 'Weekly recaps', rk.slice(0, 12).map(function (kk) { return h('div', { cls: 'item col' }, h('span', { cls: 'tag', text: 'week of ' + U.fmtDay(U.addDays(kk, -6)) }), h('span', { text: S.recaps[kk].text })); }), false, rk.length));
    var review = S.hatched ? M.reviewWords(S, 5) : [];
    if (review.length) {
      var qb = h('div');
      review.forEach(function (w) {
        var row = h('div', { cls: 'item col' }, h('span', { text: 'Who or what is ' + w.display + '?' })), bs = h('div', { cls: 'row wrap' });
        [['person', 'Person'], ['pet', 'Pet'], ['place', 'Place'], ['thing', 'Thing'], ['skip', 'Skip']].forEach(function (o) {
          bs.appendChild(k.btn(o[1], function () { var ev = [{ type: 'learn', data: { word: w.norm, kind: o[0], note: o[1] } }]; if (o[0] !== 'skip') ev.push({ type: 'entity', data: { name: w.display, kind: o[0] } }); a.addEvents(ev); }, 'mini'));
        });
        row.appendChild(bs); qb.appendChild(row);
      });
      p.appendChild(k.acc('lib-questions', 'Questions from ' + S.totemName, [qb], true, review.length));
    }
    var mem = h('div');
    S.memories.slice().reverse().slice(0, 30).forEach(function (e) { mem.appendChild(h('div', { cls: 'item col' }, h('span', { cls: 'tag', text: U.fmtDay(e.d) }), h('span', { text: e.data.text }))); });
    Object.keys(S.facts).forEach(function (kk) { mem.appendChild(h('div', { cls: 'item' }, h('span', { cls: 'ititle', text: 'Your ' + kk }), h('span', { cls: 'tag', text: S.facts[kk].value }))); });
    if (!S.memories.length && !Object.keys(S.facts).length) mem.appendChild(k.empty('Nothing yet.'));
    p.appendChild(k.acc('lib-remembered', 'Remembered', [mem], false, S.memories.length + Object.keys(S.facts).length));
    // time capsules (every form the Totem has grown into)
    var tb = h('div'), skin = C.setting(S, 'skin', 'current');
    if (!S.forms.length) tb.appendChild(k.empty('Each form ' + S.totemName + ' grows into is saved here.'));
    S.forms.slice().reverse().forEach(function (f) {
      var cr = A.creature(f.seed, f.stage, S.accentSeed), cv = A.crop(cr, 'open', 3); cv.className = 'fpic';
      var isSkin = String(skin) === String(f.stage), isCur = f === S.form;
      tb.appendChild(h('div', { cls: 'form' }, cv, h('div', { cls: 'fbody' }, h('b', { text: 'Stage ' + f.stage + ' · ' + C.stageName(f.stage) }), h('div', { cls: 'small', text: U.fmtDay(U.dayStr(f.t)) }), h('div', { cls: 'small', text: cr.parts.join(', ') }),
        isCur && skin === 'current' ? h('span', { cls: 'tag', text: 'showing' }) : isSkin ? h('span', { cls: 'tag', text: 'wearing this look' }) : k.btn(isCur ? 'Show current look' : 'Wear this look', function () { a.setSetting('skin', isCur ? 'current' : String(f.stage)); }, 'mini'))));
    });
    p.appendChild(k.acc('lib-capsules', 'Time capsules (' + S.totemName + '\'s forms)', [tb], false, S.forms.length));
    var gl = M.glossary(S, 40), tbl = h('table', { cls: 'matrix' }, h('thead', null, h('tr', null, ['Word', 'Root', 'Type', 'Conf', 'State'].map(function (t) { return h('th', { text: t }); })))), tbody = h('tbody');
    gl.forEach(function (w) { tbody.appendChild(h('tr', null, h('td', { text: w.display }), h('td', { text: w.typoOf ? w.norm + ' -> ' + w.typoOf : w.norm }), h('td', { text: w.kind && w.kind !== 'skip' ? w.kind : '-' }), h('td', { text: w.conf.toFixed(2) }), h('td', null, h('span', { cls: 'st ' + w.state.toLowerCase(), text: w.state })))); });
    tbl.appendChild(tbody);
    p.appendChild(k.acc('lib-glossary', 'Glossary (' + S.totemName + '\'s own word list, learned from you)', [gl.length ? h('div', { cls: 'tablewrap' }, tbl) : k.empty('Write journal entries to fill this in.')], false, gl.length));
    var hid = Object.keys(S.jhide).filter(function (id) { return S.jhide[id].v; });
    if (hid.length) p.appendChild(k.acc('lib-hidden', 'Hidden pages and deleted lines', hid.slice(-40).reverse().map(function (id) {
      return h('div', { cls: 'item' }, h('span', { cls: 'ititle', text: 'Hidden ' + U.ago(S.jhide[id].t) }), k.btn('Bring back', function () { a.addEvents([{ type: 'line_hide', data: { ref: id, hidden: false } }]); }, 'mini'));
    }), false, hid.length));
  }


// the 2.1.8 Journal page (contents):
  function contents() {
    var a = app(), S = a.S, k = K(), p = body();
    var q = k.inp({ placeholder: 'Search your journal: groceries, birthday, truck...', 'aria-label': 'Search your journal', value: st.jq || '' }), out = h('div', { cls: 'results' }), timer = null;
    function run() {
      var v = q.value.trim(); st.jq = v; k.clear(out); if (!v) return;
      a.prefetch(v).catch(function () {}).then(function () {
        var hits = M.search(S, v, 12); k.clear(out);
        if (!hits.length) out.appendChild(k.empty('Nothing found.'));
        hits.forEach(function (d) { out.appendChild(h('button', { type: 'button', cls: 'item col linkish', onclick: function () { st.jday = d.day; st.jfromToday = false; ui.renderPanel(true); } }, h('span', { cls: 'tag', text: U.fmtDay(d.day) + ' · ' + d.kind }), h('span', { text: d.text }))); });
      });
    }
    q.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(run, 250); });
    p.appendChild(h('div', { cls: 'jsearch' }, q)); p.appendChild(out); if (st.jq) run();
    p.appendChild(h('div', { cls: 'row spread jtools' },
      k.btn(st.jold ? 'Oldest first' : 'Newest first', function () { st.jold = !st.jold; ui.renderPanel(true); }, 'mini'),
      k.btn(S.totemName + '\'s notebook', function () { st.jview = 'notebook'; ui.renderPanel(true); }, 'mini')));
    p.appendChild(h('p', { cls: 'small', text: 'Every day you wrote, cast or logged something, newest first. Tap a day to open its page.' }));
    // one line per day, grouped by month
    var days = PN.allDays(S), months = {};
    days.forEach(function (d) { (months[d.slice(0, 7)] = months[d.slice(0, 7)] || []).push(d); });
    var keys = Object.keys(months).sort(); if (!st.jold) keys.reverse();
    keys.forEach(function (mo, i) {
      var list = months[mo].slice().sort(); if (!st.jold) list.reverse();
      var inner = h('div');
      list.forEach(function (d) { inner.appendChild(tocRow(S, d)); });
      p.appendChild(k.acc('jm-' + mo, MONTHS[+mo.slice(5) - 1] + ' ' + mo.slice(0, 4), [inner], i === 0, list.length));
    });
  }
