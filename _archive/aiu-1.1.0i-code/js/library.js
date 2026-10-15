/* AIU TOTEM 1.1.0 - the Journal: search, a table of contents (one line per day), one page per day (summary, entries,
   I Ching, what got done, GABA, and the old conversation), and the notebook (what Aiu has learned).
   Also Journal > Me (personality, GABA, suggestions) and Journal > I Ching (moved from the Planner in 1.1.0i). Any day, month or year saves as a PDF. */
(function () {
  'use strict';
  var U = AIU.util, C = AIU.core, M = AIU.mind, Wd = AIU.words, h = U.h, ui = AIU.ui, PN = AIU.panels, G = AIU.gaba;
  function app() { return AIU.app; }
  function K() { return ui.k; }
  function body() { return K().clear(ui.els.panel); }
  var today = PN.today;
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  /* ---------- the Journal ---------- */
  var st = PN.state;
  // 1.1.0i: four tabs. Today (a step-by-step page for today), Pages (search + every day), I Ching, Me (personality, GABA, suggestions).
  var JSUBS = [['today', 'Today'], ['pages', 'Pages'], ['iching', 'I Ching'], ['me', 'Me']];
  PN.journal = function () {
    var a = app(), S = a.S, k = K(), nb = S.totemName + '\'s notebook', cur = ui.sub.journal || 'today';
    if (cur === 'self') cur = 'me';
    if (!JSUBS.some(function (x) { return x[0] === cur; })) cur = 'today';
    if (st.jday || st.jview === 'notebook') cur = 'pages';
    ui.sub.journal = cur;
    function onSub(v) { st.jday = null; st.jview = null; st.jfromToday = false; ui.go('journal', v); }
    var acts = [];
    if (cur === 'iching') acts = PN.ichingActions(S);
    else if (cur === 'me') acts = PN.selfActions(S);
    else {
      acts.push(k.btn('+ New entry', function () { ui.journalSheet(); }, 'mini primary'));
      if (st.jday && !a.dev.mute) acts.push(k.btn('Read aloud', function (e) { var on = a.readAloud(st.readText || ''); e.target.textContent = on ? 'Stop' : 'Read aloud'; }, 'mini'));
      if (st.jday) acts.push(PN.pdfBtn(function () { exportDay(st.jday); }));
      else if (cur === 'pages' && !st.jview) acts.push(PN.pdfBtn(function () { pdfPicker(); }));
    }
    ui.panelHead(st.jview === 'notebook' ? nb : 'Journal', acts, JSUBS, cur, onSub);
    if (cur === 'iching') return PN.ichingView();
    if (cur === 'me') return PN.selfView();
    if (st.jview === 'notebook') return notebook();
    if (st.jday) return dayPage(st.jday);
    if (cur === 'today') return todayView();
    contents();
  };
  /* ---------- Journal > Today: the day, one step at a time ---------- */
  var PROMPTS = ['What went well today?', 'What\'s on your mind right now?', 'What did you get done, big or small?', 'What would make tomorrow easier?', 'Who did you spend time with, and how was it?', 'What\'s one thing you want to remember about today?', 'What\'s bugging you? Get it out of your head.', 'What are you looking forward to?', 'What did you learn today?', 'How\'s your body feeling: tired, rested, sore, wired?'];
  function prompts(S, d) {
    var rv = (S.reviews || {})[d], X = rv ? AIU.iching.info(rv.hex) : null, hr = U.wall(new Date(app().trueNow())).getHours(), out = [];
    if (hr < 12) out.push('What\'s the plan for today?'); else if (hr >= 18) out.push('How did today go?');
    if (X) out.push('Today\'s reading is about "' + X.theme.toLowerCase() + '". Where did that show up in your day?');
    var start = U.hash32(d) % PROMPTS.length;
    for (var i = 0; i < PROMPTS.length; i++) out.push(PROMPTS[(start + i) % PROMPTS.length]);
    return out;
  }
  function todayView() {
    var a = app(), S = a.S, k = K(), p = body(), d = today(), name = S.totemName;
    var rv = (S.reviews || {})[d], X = rv ? AIU.iching.info(rv.hex) : null;
    var gl = G.day(S, d), gv = G.bar(S, d), mine = (S.journal || []).filter(function (e) { return e.d === d; });
    var seen = a.local.pageSeen === d;
    var doneN = (rv ? 1 : 0) + (gl.length ? 1 : 0) + (mine.length ? 1 : 0) + (seen ? 1 : 0);
    p.appendChild(h('div', { cls: 'jtoday' }, h('h3', { cls: 'jtitle', text: Wd.cap(PN.nice(d)) }),
      h('p', { cls: 'small', text: doneN === 4 ? 'All four done today. Nice. ' + name + ' is proud of you.' : 'Four small steps, in any order. Each one helps ' + name + ' grow.' }),
      h('div', { cls: 'bar thin', role: 'img', 'aria-label': doneN + ' of 4 steps done' }, h('i', { cls: 'conf', style: 'width:' + doneN * 25 + '%' }))));
    function step(n, done, icon, title, kids) {
      return h('section', { cls: 'jstep' + (done ? ' done' : '') }, h('div', { cls: 'jsh' }, h('span', { cls: 'jsn', 'aria-hidden': 'true', text: done ? '✓' : String(n) }), h('span', { cls: 'jsi', 'aria-hidden': 'true' }, ui.pix(icon)), h('b', { text: title + (done ? ' (done)' : '') })), h('div', { cls: 'jsb' }, kids));
    }
    // 1. the reading
    p.appendChild(step(1, !!rv, 'yin', 'Today\'s I Ching', rv ? [
      h('div', { cls: 'row jcast' }, k.hexPic(rv.vals, rv.hex), h('div', { cls: 'col' }, h('b', { text: rv.hex + '. ' + X.name }), h('span', { text: X.theme }))),
      h('div', { cls: 'row wrap' }, k.btn('Read it', function () { ui.go('journal', 'iching'); }, 'primary'))
    ] : [
      h('p', { text: S.hatched ? name + ' tosses three coins six times and gives you the Hilltop View: practical wisdom for the day, not fortune-telling.' : 'Hatch your egg first.' }),
      S.hatched ? h('div', { cls: 'row wrap' }, k.btn('Cast it now', function () { a.castReading(true); k.snack(name + ' is tossing the coins (watch the scene)...'); }, 'primary')) : null
    ]));
    // 2. Go / Brake
    var goals = G.goals(S, d).filter(function (g) { return !g.done; }).slice(0, 3);
    p.appendChild(step(2, gl.length > 0, 'leaf', 'Check your Go / Brake', [
      h('p', { text: 'Right now: ' + gv + ' · ' + G.state(gv) + '. ' + (G.stressed(S, d) ? name + ' is stressed, so do one calm thing.' : 'Tap anything calm you did today.') }),
      h('div', { cls: 'ggrid' }, goals.map(function (g) { var f = G.find(g.label); return k.btn(g.label + ' +' + (f ? f.pts : 8), function () { a.logGaba('calm', g.label, f ? f.pts : 8); }, 'chip g-calm'); })),
      h('div', { cls: 'row wrap' }, k.btn('More calm things', function () { st.selfSub = 'gaba'; ui.go('journal', 'me'); }), k.btn('Something revved me up', function () { st.selfSub = 'gaba'; ui.go('journal', 'me'); }, 'ghost')),
      gl.length ? h('p', { cls: 'small', text: 'Logged today: ' + gl.map(function (g) { return g.item; }).join(', ') + '.' }) : null
    ]));
    // 3. write (or talk)
    var ps = prompts(S, d), pi = (st.jpi || 0) % ps.length, q = h('p', { cls: 'jprompt', text: ps[pi] });
    var ents = h('div'); mine.slice().reverse().forEach(function (e) { ents.appendChild(k.journalCard(a, e)); });
    p.appendChild(step(3, mine.length > 0, 'pen', 'Write in your journal', [
      h('p', { cls: 'small', text: 'A question to get you going (or write about anything):' }), q,
      h('div', { cls: 'row wrap' },
        k.btn('Write', function () { ui.journalSheet(null, { prompt: q.textContent }); }, 'primary'),
        (function (b) { b.insertBefore(ui.pix('mic'), b.firstChild); return b; })(k.btn(' Talk it', function () { ui.journalSheet(null, { prompt: q.textContent, listen: true }); })),
        k.btn('Another question', function () { st.jpi = (pi + 1) % ps.length; q.textContent = ps[st.jpi]; }, 'ghost')),
      h('p', { cls: 'small', text: '80+ letters grows ' + name + ' +10. Calm or stressful things you mention count toward GABA too.' }),
      ents
    ]));
    // 4. the whole page
    p.appendChild(step(4, seen, 'book', 'Read today\'s page', [
      h('p', { text: 'Everything from today on one page: your entries, the reading, what got done, your GABA and the Hilltop View.' }),
      h('div', { cls: 'row wrap' }, k.btn('Open today\'s page', function () { a.local.pageSeen = d; a.saveLocal(); st.jday = d; st.jfromToday = true; ui.renderPanel(true); ui.toPanel(); }, 'primary'))
    ]));
    p.appendChild(h('div', { cls: 'row wrap jmore' }, k.btn('Earlier days (Pages) ›', function () { ui.go('journal', 'pages'); }), k.btn(name + '\'s notebook ›', function () { st.jview = 'notebook'; ui.renderPanel(true); })));
  }
  // search + the table of contents
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
  function tocRow(S, d) {
    var rv = (S.reviews || {})[d], X = rv ? AIU.iching.info(rv.hex) : null, gv = G.day(S, d).length ? G.bar(S, d) : null;
    var ent = (S.journal || []).filter(function (e) { return e.d === d; }), first = ent.length ? ent[ent.length - 1].data.text : '';
    var bits = [X ? 'I Ching ' + rv.hex + ' ' + X.theme : '', ent.length ? ent.length + ' entr' + (ent.length === 1 ? 'y' : 'ies') : '', gv !== null ? 'Go/Brake ' + gv : ''].filter(Boolean);
    return h('button', { type: 'button', cls: 'qrow dayrow', onclick: function () { st.jday = d; st.jfromToday = false; ui.renderPanel(true); ui.toPanel(); } },
      h('span', { cls: 'qrtitle', text: (d === today() ? 'Today · ' : '') + PN.nice(d) }),
      h('span', { cls: 'qrmeta', text: bits.join(' · ') || 'a quiet day' }),
      first ? h('span', { cls: 'qrsnip', text: first.length > 90 ? first.slice(0, 88) + '...' : first }) : null);
  }
  // What got done on a day: quest steps, checked list items, reminders, paid bills
  function doneOn(S, day) {
    var out = [], dayOf = function (t) { return U.dayStr(new Date(t)); };
    Object.keys(S.quests || {}).forEach(function (k0) { var q = S.quests[k0]; (q.steps || []).forEach(function (sp) { var x = (S.qsteps || {})[k0 + '|' + sp.id]; if (x && x.done && dayOf(x.t) === day) out.push(sp.title.replace(/\s*\(.*\)$/, '') + ' (' + q.title + ')'); }); });
    Object.keys(S.lists || {}).forEach(function (l) { var L = S.lists[l]; Object.keys(L).forEach(function (k0) { var r = L[k0]; if (!r.removed && r.done && r.doneM && dayOf(r.doneM.t) === day && !/^example:/i.test(r.item)) out.push(r.item); }); });
    Object.keys(S.done || {}).forEach(function (k0) { if (k0.slice(-10) === day) { var t = S.tasks[k0.slice(0, -11)]; out.push(t ? t.title : k0.slice(0, -11)); } });
    return out;
  }
  // One page per day: in short, your entries, the I Ching, what got done, GABA, then the rest and the old conversation
  function dayPage(d0) {
    var a = app(), S = a.S, k = K(), p = body();
    p.appendChild(h('div', { cls: 'row spread' }, k.btn(st.jfromToday ? '< Today' : '< Pages', function () { st.jday = null; if (st.jfromToday) { st.jfromToday = false; ui.go('journal', 'today'); } else ui.renderPanel(true); }, 'mini ghost'),
      h('span', { cls: 'row' }, k.btn('Older', function () { var all = PN.allDays(S), i = all.indexOf(d0); if (i >= 0 && i < all.length - 1) { st.jday = all[i + 1]; ui.renderPanel(true); } }, 'mini'),
        k.btn('Newer', function () { var all = PN.allDays(S), i = all.indexOf(d0); if (i > 0) { st.jday = all[i - 1]; ui.renderPanel(true); } }, 'mini'))));
    p.appendChild(h('h3', { cls: 'jtitle', text: (d0 === today() ? 'Today · ' : '') + Wd.cap(PN.nice(d0)) }));
    var pg = h('div', { cls: 'jpbody' });
    p.appendChild(pg); pg.appendChild(k.empty('Opening...'));
    function draw(evs) {
      k.clear(pg);
      var P = AIU.hilltop.page(a.S, d0, k.pageOpts(a, d0, d0 === today() ? null : evs));
      // in short
      var done = doneOn(S, d0), gl = G.dayLine(S, d0), X = P.cast;
      var sum = [];
      sum.push(h('ul', { cls: 'jshort' },
        h('li', { text: P.stories.length ? P.stories.length + ' journal entr' + (P.stories.length === 1 ? 'y' : 'ies') : 'No journal entries' }),
        X ? h('li', { text: 'I Ching ' + X.hex + ' ' + X.name + ': ' + X.theme }) : null,
        done.length ? h('li', { text: done.length + ' thing' + (done.length === 1 ? '' : 's') + ' done' }) : null,
        gl ? h('li', { text: gl }) : null));
      pg.appendChild(h('section', { cls: 'jsec jsum' }, h('h4', { text: 'In short' }), sum));
      st.readText = [PN.nice(d0) + '.'].concat(P.stories.map(function (e) { return e.data.text; }), X ? ['I Ching: ' + X.hex + ', ' + X.name + '. ' + X.theme + '.'] : [], P.principle ? [P.principle] : [], done.length ? ['Done: ' + done.slice(0, 10).join(', ') + '.'] : []).join(' ');
      k.renderPage(a, P, pg, { journal: true });
      if (done.length) pg.appendChild(h('section', { cls: 'jsec' }, h('h4', { text: 'Done' }), h('ul', null, done.slice(0, 40).map(function (x) { return h('li', { text: x }); }))));
      if (gl) pg.appendChild(h('button', { type: 'button', cls: 'gabaline', onclick: function () { st.jday = null; st.selfSub = 'gaba'; ui.go('journal', 'me'); } }, gl));
      var talk = talkOf(d0 === today() ? S.chat : evs, d0);
      if (talk.length) {
        var tb = h('div', { cls: 'chat logday' });
        talk.forEach(function (e) { tb.appendChild(h('div', { cls: 'msg ' + (e.type === 'say' ? 'you' : 'totem') }, h('div', { cls: 'mtext', text: e.data.text }), h('div', { cls: 'mmeta', text: (e.type === 'say' ? 'You' : S.totemName) + ' · ' + U.fmtHm(e.h || '', k.c24()) }))); });
        pg.appendChild(k.acc('jp-talk', 'Conversation that day (from the old Log)', [tb], false, talk.length));
      }
    }
    if (d0 === today()) draw(null);
    else a.chapter(d0.slice(0, 7)).then(draw, function () { draw([]); });
  }
  // PDF of a month or a year
  function pdfPicker() {
    var a = app(), S = a.S, k = K(), s, days = PN.allDays(S), opts = {}, mos = {}, yrs = {};
    days.forEach(function (d) { mos[d.slice(0, 7)] = 1; yrs[d.slice(0, 4)] = 1; });
    Object.keys(mos).sort().reverse().forEach(function (m) { opts['m' + m] = MONTHS[+m.slice(5) - 1] + ' ' + m.slice(0, 4); });
    Object.keys(yrs).sort().reverse().forEach(function (y) { opts['y' + y] = 'The whole year ' + y; });
    var pick = k.sel(opts, Object.keys(opts)[0], function () {});
    s = k.sheet('Save your journal as a PDF', [k.field('Which pages', pick), h('p', { cls: 'small', text: 'A single day: open it and tap PDF.' }),
      h('div', { cls: 'row spread' }, h('span'), k.btn('Next', function () {
        var v = pick.value, sel = days.filter(function (d) { return v.charAt(0) === 'm' ? d.slice(0, 7) === v.slice(1) : d.slice(0, 4) === v.slice(1); });
        s.remove(); exportRange(sel, opts[v], 'aiu-journal-' + v.slice(1));
      }, 'primary'))]);
  }
  /* ---------- Journal > Me (was Planner > Self): your personality and your GABA (Go / Brake) ---------- */
  PN.selfActions = function (S) { return (PN.state.selfSub || 'personality') === 'gaba' ? [PN.pdfBtn(function () { var mo = today().slice(0, 7); PN.savePdf(gabaDoc(S, mo), 'aiu-gaba-' + mo); })] : []; };
  PN.selfView = function () {
    var a = app(), k = K(), p = body(), sub = PN.state.selfSub || 'personality';
    p.appendChild(h('div', { cls: 'chips bsub' }, [['personality', 'Personality'], ['gaba', 'GABA (Go / Brake)'], ['q21', 'Suggestions']].map(function (x) {
      return k.btn(x[1], function () { PN.state.selfSub = x[0]; ui.renderPanel(true); }, 'chip' + (sub === x[0] ? ' on' : ''));
    })));
    if (sub === 'gaba') return gabaView(p);
    if (sub === 'q21') return q21View(p);
    p.appendChild(k.personaBox(a));
    if (!a.local.seenPersona) { a.local.seenPersona = 1; a.saveLocal(); a.checkStarter(); }
  };
  PN.allDays = function (S) {
    var days = {}, t = today();
    Object.keys(S.reviews || {}).forEach(function (d) { days[d] = 1; });
    Object.keys(S.jpages || {}).forEach(function (d) { days[d] = 1; });
    (S.journal || []).forEach(function (e) { days[e.d] = 1; });
    Object.keys(S.lib || {}).forEach(function (mo) { Object.keys(S.lib[mo].days).forEach(function (d) { var pg = S.lib[mo].days[d]; if (pg.say || pg.journal || pg.done || pg.memory) days[d] = 1; }); });
    G.entries(S).forEach(function (g) { days[g.d] = 1; });
    days[t] = 1;
    return Object.keys(days).filter(function (d) { return d <= t && /^\d{4}-\d\d-\d\d$/.test(d); }).sort().reverse();
  };
  /* ---------- journal PDFs ---------- */
  // A whole Hilltop page as PDF blocks. full=false: the short version used in chapters, seasons and years.
  function pageBlocks(S, P, full, talk) {
    var b = [];
    b.push({ t: full ? 'title' : 'h1', text: P.title.replace(/^Hilltop View: /, '') });
    if (P.stamp) b.push({ t: 'sub', text: P.stamp });
    if (P.weather || P.forecast) b.push({ t: 'small', text: [P.weather ? 'Weather: ' + P.weather : '', P.forecast ? 'Today: ' + P.forecast : ''].filter(Boolean).join('   ') });
    if (P.cast) {
      var c = P.cast;
      b.push({ t: 'h2', text: 'I Ching: ' + c.hex + ' ' + c.name + ' (' + c.pinyin + ')' + ' - ' + c.theme });
      if (full && c.vals) b.push({ t: 'hex', vals: c.vals });
      b.push({ t: 'small', text: c.tri.upper + ' over ' + c.tri.lower + ' · changing lines: ' + (c.moving.length ? c.moving.join(', ') + ' -> ' + c.rel + ' ' + c.relName : 'none') });
      if (full) { P.interp.forEach(function (x) { b.push({ t: 'kv', k: x[0], v: x[1] }); }); P.lines.forEach(function (x) { b.push({ t: 'small', text: x }); }); if (P.transformed) b.push({ t: 'small', text: P.transformed }); }
    }
    var gl = G.dayLine(S, P.day); if (gl) b.push({ t: 'h3', text: 'GABA' }, { t: 'p', text: gl });
    if (full) {
      if (P.continuity.length) { b.push({ t: 'h2', text: 'Continuity' }); P.continuity.forEach(function (x) { b.push({ t: 'li', text: x }); }); }
      if (P.areas.length) { b.push({ t: 'h2', text: 'The whole terrain' }); P.areas.forEach(function (ar) { b.push({ t: 'h3', text: ar.name }); ar.lines.forEach(function (x) { b.push({ t: 'li', text: x }); }); }); }
      if (P.loose.length) { b.push({ t: 'h2', text: 'Leave no one behind' }); P.loose.forEach(function (x) { b.push({ t: 'li', text: x }); }); }
      if (P.plan) {
        b.push({ t: 'h2', text: 'Today\'s practical plan' });
        [['must', 'Must do'], ['should', 'Should do'], ['energy', 'If energy remains']].forEach(function (g) { if (P.plan[g[0]].length) { b.push({ t: 'h3', text: g[1] }); P.plan[g[0]].forEach(function (it) { b.push({ t: 'check', text: it.text }); }); } });
      }
    }
    if (P.principle) b.push({ t: 'quote', text: 'Hilltop principle: ' + P.principle });
    var log = [];
    ['theme'].concat(AIU.hilltop.FIELDS.map(function (f) { return f[0]; })).forEach(function (key) { var L = P.log[key]; if (L && L.text) log.push({ t: 'kv', k: L.label, v: L.text }); });
    if (log.length) { b.push({ t: 'h2', text: 'Daily log' }); b = b.concat(log); }
    if (P.stories.length) { b.push({ t: 'h2', text: 'Your stories' }); P.stories.forEach(function (e) { b.push({ t: 'small', text: (e.h || '') + (e.dn ? ' · ' + e.dn : '') }); b.push({ t: 'p', text: e.data.text }); }); }
    if (P.ai) { b.push({ t: 'h2', text: 'AI Hilltop View' }); b.push({ t: 'p', text: P.ai }); }
    if (talk && talk.length) { b.push({ t: 'h2', text: 'The day\'s log (conversation)' }); talk.forEach(function (e) { b.push({ t: 'small', text: (e.h || '') + '  ' + (e.type === 'say' ? 'You' : S.totemName) + ': ' + e.data.text }); }); }
    return b;
  }
  function talkOf(evs, day) { return (evs || []).filter(function (e) { return e.d === day && (e.type === 'say' || e.type === 'totem') && e.data && e.data.text; }).sort(C.cmpT); }
  function askTalk(title, go) {
    var k = K(), s, cb = h('input', { type: 'checkbox' });
    s = k.sheet('Save as PDF', [h('p', { cls: 'small', text: title }), h('label', { cls: 'item' }, cb, h('span', { cls: 'ititle', text: 'Include the conversation (from the old Log, if any)' })),
      h('div', { cls: 'row spread' }, h('span'), k.btn('Save PDF', function () { s.remove(); go(cb.checked); }, 'primary'))]);
  }
  function exportDay(day) {
    var a = app();
    askTalk('Your journal page for ' + U.fmtDay(day) + '.', function (withTalk) {
      a.chapter(day.slice(0, 7)).then(function (evs) {
        var P = AIU.hilltop.page(a.S, day, K().pageOpts(a, day, day === today() ? null : evs));
        PN.savePdf({ title: 'Journal ' + day, blocks: pageBlocks(a.S, P, true, withTalk ? talkOf(evs, day) : null) }, 'aiu-journal-' + day);
      });
    });
  }
  function exportRange(days, label, base) {
    var a = app(), months = {};
    days.forEach(function (d) { months[d.slice(0, 7)] = 1; });
    askTalk(label + ': ' + days.length + ' page' + (days.length === 1 ? '' : 's') + '. Each page is the short version (reading, GABA, daily log, stories).', function (withTalk) {
      K().snack('Making the PDF...');
      Promise.all(Object.keys(months).map(function (m) { return a.chapter(m); })).then(function (lists) {
        var evs = [].concat.apply([], lists), S = a.S, b = [{ t: 'title', text: 'Journal: ' + label }, { t: 'sub', text: S.totemName + ' · ' + days.length + ' pages · made ' + PN.nice(today()) }];
        var lastMo = '';
        days.slice().sort().forEach(function (d) {
          var mo = d.slice(0, 7);
          if (mo !== lastMo) { if (lastMo) b.push({ t: 'break' }); b.push({ t: 'title', text: 'Chapter: ' + MONTHS[+mo.slice(5) - 1] + ' ' + mo.slice(0, 4) }); lastMo = mo; }
          var P = AIU.hilltop.page(S, d, K().pageOpts(a, d, d === today() ? null : evs));
          b = b.concat(pageBlocks(S, P, false, withTalk ? talkOf(evs, d) : null)); b.push({ t: 'hr' });
        });
        PN.savePdf({ title: 'Journal ' + label, blocks: b }, base);
      });
    });
  }
  PN.exportDay = exportDay;

  /* ---------- 21 Questions: the puzzle pieces Aiu fills in about you ----------
     GABA questions learn which brakes really calm YOU and which Go things to avoid; either/or questions tighten your
     personality type. Each answer is +2 growth. Asked a few at a time under Aiu, or all in a row here. */
  function dayOf(t) { return U.dayStr(new Date(t)); }
  function gabaOrder(S) { // a steady mix of calm and Go questions, the same order on every device
    var qs = G.questions(), r = U.rng(U.hash32(((S.egg && S.egg.id) || 'aiu') + ':q21'));
    var calm = qs.filter(function (q) { return q.kind === 'calm'; }), go = qs.filter(function (q) { return q.kind === 'stress'; }), food = qs.filter(function (q) { return q.kind === 'calmfood'; });
    [calm, go, food].forEach(function (L) { for (var i = L.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = L[i]; L[i] = L[j]; L[j] = t; } });
    var out = []; while (calm.length || go.length || food.length) { if (calm.length) out.push(calm.shift()); if (calm.length) out.push(calm.shift()); if (go.length) out.push(go.shift()); if (food.length && out.length % 5 === 0) out.push(food.shift()); if (!calm.length && !go.length && food.length) out.push(food.shift()); }
    return out;
  }
  PN.q21Today = function (S) { var t = today(), P = S.prefs || {}; return Object.keys(P).filter(function (k0) { return dayOf(P[k0].t) === t; }).length; };
  PN.q21Progress = function (S) {
    var P = S.prefs || {}, quiz = (S.traits || {}).quiz || {}, all = G.questions().length + AIU.persona.allQuestions().length;
    var done = G.questions().filter(function (q) { return P[q.id]; }).length + AIU.persona.allQuestions().filter(function (q) { return quiz[q.id]; }).length;
    return { done: done, total: all, pct: Math.round(done / Math.max(1, all) * 100) };
  };
  PN.q21Next = function (S) {
    var P = S.prefs || {}, n = PN.q21Today(S), took = S.ptype && S.ptype.answered >= 6;
    var skip = (app().local.offSkip || {}), open = {};
    Object.keys(S.quests || {}).forEach(function (k0) { var q = S.quests[k0]; if (q.state === 'active' && q.subject) open[q.subject.replace(/^gaba:\w+:/, '')] = 1; });
    var doneToday = {}; G.day(S, today()).forEach(function (g) { doneToday[g.item] = 1; });
    var fresh = function (q) { return skip[q.id] !== today() && !open[q.item] && !doneToday[q.item]; }, now = app().trueNow();
    var pq = took ? AIU.persona.nextExtra(S) : null, gq = gabaOrder(S).filter(function (q) { return !P[q.id] && fresh(q); })[0] || null;
    if (!gq) gq = gabaOrder(S).filter(function (q) { return P[q.id] && P[q.id].v === 'no' && now - P[q.id].t > 90 * 86400000 && fresh(q); })[0] || null; // a "Never" from months ago: ask once more
    if (pq && (n % 3 === 2 || !gq)) return { type: 'persona', q: pq };
    return gq ? { type: 'gaba', q: gq } : null;
  };
  PN.q21Answer = function (x, v) {
    var a = app(), S = a.S, ev = [];
    if (x.type === 'gaba') ev.push({ type: 'pref', data: { item: x.q.id, kind: x.q.kind, v: v } });
    else {
      var val = v === 'a' ? 1 : v === 'b' ? -1 : 0;
      ev.push({ type: 'trait', data: { qid: x.q.id, v: val } }, { type: 'pref', data: { item: 'q:' + x.q.id, kind: 'persona', v: v } });
      var TR = JSON.parse(JSON.stringify(S.traits || {})); TR.quiz = TR.quiz || {}; TR.quiz[x.q.id] = { v: val, t: a.trueNow() + 1 };
      var prev = S.ptypes && S.ptypes.length ? S.ptypes[S.ptypes.length - 1].code : '', r = AIU.persona.compute(Object.assign({ lastCode: prev }, TR));
      if (r.code && r.code !== prev) ev.push({ type: 'ptype', data: { code: r.code, from: prev } });
    }
    a.local.q21At = a.trueNow(); a.saveLocal();
    return a.addEvents(ev, true).then(function () { a.react(v === 'skip' ? 'save' : 'check', v === 'skip' ? '' : '+2'); });
  };
  // One question as a little card (under Aiu, or in Journal > Me > Suggestions)
  // Aiu suggests a small GABA quest. Yes = make it a quest (asks one detail first), No = not for me (never again), Not today.
  PN.offerQuest = function (x, onDone) {
    var a = app(), k = K(), o = G.offer(x.q), s;
    function make(detail) {
      var d = String(detail || '').trim(), title = o.follow && d ? (o.title + ': ' + d).slice(0, 48) : o.title.slice(0, 48);
      var steps = o.steps.map(function (t) { return t.replace('{x}', d || 'it'); });
      var ev = [{ type: 'pref', data: { item: x.q.id, kind: x.q.kind, v: 'yes' } }].concat(M.questEvents(title, steps, { kind: 'side', subject: o.tag, why: 'Aiu\'s suggestion. Good for your GABA (the Brake).' }));
      a.local.q21At = a.trueNow(); a.saveLocal();
      a.addEvents(ev, true).then(function () { a.react('save'); K().snack('New quest: ' + title + '. Finish it for GABA and growth.'); if (onDone) onDone(); });
    }
    if (!o.follow) return make('');
    var inp = k.inp({ placeholder: 'Type it, or tap an idea', autocapitalize: 'sentences', 'aria-label': o.follow });
    s = k.sheet(o.title, [h('p', { text: o.follow }), inp,
      o.ideas.length ? h('div', { cls: 'chips' }, o.ideas.map(function (t) { return k.btn(t, function () { inp.value = t; }, 'chip'); })) : null,
      h('div', { cls: 'row spread' }, k.btn('Skip the detail', function () { s.remove(); make(''); }, 'ghost'), k.btn('Make it a quest', function () { s.remove(); make(inp.value); }, 'primary'))]);
  };
  PN.q21Card = function (x, onDone, compact) {
    var k = K(), S = app().S, box = h('div', { cls: 'q21card' + (compact ? ' compact' : '') });
    function go(v) { PN.q21Answer(x, v).then(function () { if (onDone) onDone(); }); }
    if (x.type === 'gaba') {
      var o = G.offer(x.q);
      box.appendChild(h('div', { cls: 'q21q' }, h('span', { cls: 'nicon', 'aria-hidden': 'true' }, ui.pix(o.avoid ? 'no' : 'bulb')), ' ', o.ask, h('span', { cls: 'small', text: ' Yes makes it a quest (good for your GABA).' })));
      box.appendChild(h('div', { cls: 'row wrap' }, k.btn('Yes', function () { PN.offerQuest(x, onDone); }, 'primary'),
        k.btn('Not today', function () { var L = app().local; L.offSkip = L.offSkip || {}; L.offSkip[x.q.id] = today(); L.q21At = app().trueNow(); app().saveLocal(); if (onDone) onDone(); }),
        k.btn('Never', function () { go('no'); }, 'ghost')));
      box.lastChild.lastChild.title = 'Stop suggesting this. ' + S.totemName + ' might check back in a few months, in case you change your mind.';
    } else {
      box.appendChild(h('div', { cls: 'q21head' }, h('span', { cls: 'nicon', 'aria-hidden': 'true' }, ui.pix('ask')), h('b', { text: 'Getting to know you' })));
      box.appendChild(h('div', { cls: 'q21q' }, x.q.q + '...'));
      box.appendChild(h('div', { cls: 'row wrap' }, k.btn(Wd.cap(x.q.a), function () { go('a'); }, 'primary'), k.btn(Wd.cap(x.q.b), function () { go('b'); }, 'primary'), k.btn('Skip', function () { go('skip'); }, 'ghost')));
    }
    return box;
  };
  function q21View(p) {
    var a = app(), S = a.S, k = K(), pr = PN.q21Progress(S), P = S.prefs || {};
    p.appendChild(h('p', { cls: 'small', text: S.totemName + ' suggests small quests that help your GABA, and asks a few either/or questions to know your personality better. Yes makes it a quest. Not today asks another day. Never stops it (it may check back in a few months, in case you change your mind). Each answer is +2 growth.' }));
    p.appendChild(h('div', { cls: 'q21prog' }, h('b', { text: S.totemName + ' knows you ' + pr.pct + '%' }), h('span', { cls: 'small', text: ' · ' + pr.done + ' of ' + pr.total + ' pieces' })));
    p.appendChild(h('div', { cls: 'bar thin' }, h('i', { cls: 'conf', style: 'width:' + pr.pct + '%' })));
    var nx = PN.q21Next(S);
    if (!(S.ptype && S.ptype.answered >= 6)) p.appendChild(h('p', { cls: 'small', text: 'Take the personality quiz (Personality) and ' + S.totemName + ' will ask a few more either/or questions to tighten up your type.' }));
    if (nx) p.appendChild(PN.q21Card(nx, function () { ui.renderPanel(true); }));
    else p.appendChild(k.empty('Every piece is in place. ' + S.totemName + ' knows you 100%!'));
    // what it learned (tap to change)
    function list(title, kind, v) {
      var items = G.questions().filter(function (q) { return q.kind === kind && P[q.id] && P[q.id].v === v; });
      if (!items.length) return null;
      return k.acc('q21-' + kind + v, title, items.map(function (q) {
        return h('div', { cls: 'item' }, h('span', { cls: 'ititle', text: q.item }), k.btn('Change', function () { a.addEvents([{ type: 'pref', data: { item: q.id, kind: q.kind, v: v === 'yes' ? 'no' : 'yes' } }], true).then(function () { ui.renderPanel(true); }); }, 'mini'));
      }), false, items.length);
    }
    [list('You said yes to', 'calm', 'yes'), list('Calming foods you said yes to', 'calmfood', 'yes'), list('Things you\'re cutting back on', 'stress', 'yes'), list('Not for you (no more suggestions)', 'calm', 'no')].forEach(function (x) { if (x) p.appendChild(x); });
  }

  /* ---------- GABA ---------- */
  function gabaView(into) {
    var a = app(), S = a.S, k = K(), p = into || body(), d = today(), v = G.bar(S, d), lv = G.level(S), streak = G.streak(S, d);
    p.appendChild(h('div', { cls: 'gabahead' },
      h('div', { cls: 'gabascale' }, h('span', { cls: 'go', text: 'GO' }), h('div', { cls: 'gbar big', role: 'img', 'aria-label': 'Go / Brake bar at ' + v + ' of 100' }, h('i', { style: 'left:' + v + '%' })), h('span', { cls: 'brake', text: 'BRAKE' })),
      h('div', { cls: 'gabastate', text: 'Today: ' + v + ' · ' + G.state(v) }),
      h('div', { cls: 'gabalv' }, h('b', { text: 'Level ' + lv.n + ': ' + lv.name }), h('span', { cls: 'small', text: lv.next ? ' · ' + (lv.next - lv.xp) + ' brake points to ' + lv.nextName : ' · top level!' }), h('span', { cls: 'small', text: streak ? ' · ' + streak + '-day calm streak' : '' })),
      lv.next ? h('div', { cls: 'bar thin' }, h('i', { cls: 'conf', style: 'width:' + Math.round((lv.xp - lv.floor) / (lv.next - lv.floor) * 100) + '%' })) : null));
    p.appendChild(h('p', { cls: 'small', text: 'The day wears on you: from 8 am the bar slides toward Go about ' + G.DRIFT + ' points an hour. Below ' + G.RED + ' (the red), ' + S.totemName + ' is stressed and grows at a quarter speed. Calm things push it back up.' }));
    // goals
    var goals = G.goals(S, d);
    p.appendChild(h('h3', { cls: 'qgroup', text: 'Today\'s brake goals' }));
    goals.forEach(function (g) {
      var f = G.find(g.label);
      p.appendChild(h('div', { cls: 'item' + (g.done ? ' done' : '') }, h('input', { type: 'checkbox', checked: g.done, disabled: g.done, 'aria-label': 'Did it: ' + g.label, onchange: function () { a.logGaba('calm', g.label, f ? f.pts : 8); } }),
        h('span', { cls: 'ititle', text: g.label }), h('span', { cls: 'tag', text: '+' + (f ? f.pts : 8) + ' +5 goal' })));
    });
    // quick log
    function grid(list, kind) {
      var L = list.filter(function (x) { return !(kind === 'calm' && G.pref(S, x[0]) === 'no'); }).sort(function (x, y) { return (G.pref(S, y[0]) === 'yes') - (G.pref(S, x[0]) === 'yes'); });
      return h('div', { cls: 'ggrid' }, L.map(function (x) { return K().btn((G.pref(S, x[0]) === 'yes' ? '★ ' : '') + x[0] + ' ' + (x[1] > 0 ? '+' : '') + x[1], function () { a.logGaba(kind, x[0], x[1]); }, 'chip g-' + kind); }));
    }
    var avoid = G.avoid(S);
    if (avoid.length) p.appendChild(h('div', { cls: 'item col' }, h('b', { text: 'Your avoid list' }), h('span', { cls: 'small', text: avoid.join(' · ') })));
    p.appendChild(h('h3', { cls: 'qgroup', text: 'I did something calming' }));
    p.appendChild(h('p', { cls: 'small', text: '★ = it calms you (from 21 Questions). Brakes you said aren\'t for you are left out.' }));
    p.appendChild(grid(G.CALM_ACTS, 'calm'));
    p.appendChild(k.acc('g-cfood', 'Calm foods I ate', [grid(G.CALM_FOODS, 'calm')], false));
    p.appendChild(k.acc('g-stress', 'Something revved me up (GO)', [h('p', { cls: 'small', text: 'No judgment. Logging it just shows the balance, and ' + S.totemName + ' suggests a brake.' }), grid(G.STRESS_ACTS, 'stress'), h('b', { text: 'Foods and substances' }), grid(G.STRESS_FOODS, 'stress')], false));
    p.appendChild(k.acc('g-mixed', 'Mixed: it depends on you', [h('p', { cls: 'small', text: 'These can calm you OR stress you, depending on timing, amount and mood. Ask yourself:' }),
      h('ul', null, G.MIXED_QUESTIONS.map(function (x) { return h('li', { text: x }); })),
      h('div', { cls: 'ggrid' }, G.MIXED.map(function (x) { return K().btn(x[0], function () { mixedAsk(x[0]); }, 'chip g-mixed'); }))], false));
    // today's log
    var list = G.day(S, d);
    p.appendChild(h('h3', { cls: 'qgroup', text: 'Today\'s log' }));
    if (!list.length) p.appendChild(k.empty('Nothing yet. Tap something above, or write it in a journal entry ("I went for a walk").'));
    list.slice().reverse().forEach(function (g) {
      p.appendChild(h('div', { cls: 'item' }, h('span', { cls: 'itime', text: U.fmtHm(U.hmStr(new Date(g.t)), k.c24()) }), h('span', { cls: 'ititle', text: g.item + (g.goal ? ' (goal)' : '') }),
        h('span', { cls: 'tag g-' + g.kind, text: (g.pts > 0 ? '+' : '') + g.pts }),
        k.iconBtn('Delete ' + g.item, 'X', function () { a.addEvents([{ type: 'gaba', data: { ref: g.id, removed: true } }]).then(function () { k.snack('Removed.', function () { a.addEvents([{ type: 'gaba', data: { ref: g.id, removed: false } }]); }); }); }, 'del')));
    });
    // the week
    var wk = h('div', { cls: 'gweek' });
    for (var i = 6; i >= 0; i--) { var dd = U.addDays(d, -i), has = G.day(S, dd).length, bv = has ? G.bar(S, dd) : null; wk.appendChild(h('div', { cls: 'gday' }, h('div', { cls: 'gcol' }, h('i', { style: 'height:' + (bv === null ? 0 : Math.max(4, bv)) + '%' })), h('span', { text: U.DAYNAMES[U.weekday(dd)].slice(0, 2) }), h('small', { text: bv === null ? '-' : String(bv) }))); }
    p.appendChild(h('h3', { cls: 'qgroup', text: 'This week' })); p.appendChild(wk);
    // learn (the GABA Explorer)
    function lst(title, arr) { return h('div', { cls: 'glearn' }, h('b', { text: title }), h('ul', null, arr.map(function (x) { return h('li', { text: x[0] }); }))); }
    p.appendChild(k.acc('g-learn', 'Learn: Go vs Brake', [h('p', { text: 'Glutamate helps you GO. GABA helps you SLOW DOWN. Simple rule: balance the GO (energy) with the BRAKE (calm).' }),
      lst('Activities that support calm', G.CALM_ACTS), lst('Foods that support calm', G.CALM_FOODS), lst('Activities that can create stress', G.STRESS_ACTS), lst('Foods and substances that can increase stress', G.STRESS_FOODS), lst('Mixed: depends on you', G.MIXED.map(function (x) { return [x[0]]; }))], false));
    p.appendChild(h('p', { cls: 'small dim', text: G.DISCLAIMER + ' ' + S.totemName + ' notices calm and stress things you write in your journal entries, and now and then suggests a brake as a side quest (Settings > Sounds & GABA > GABA coach).' }));
  }
  PN.mixedAsk = function (item) { mixedAsk(item); };
  function mixedAsk(item) {
    var a = app(), k = K(), s, q = G.MIXED_QUESTIONS[U.hash32(item + today()) % G.MIXED_QUESTIONS.length];
    s = k.sheet(item, [h('p', { text: item + ' can go either way. ' + q }), h('div', { cls: 'row wrap' },
      k.btn('It calmed me (+5)', function () { s.remove(); a.logGaba('calm', item, 5); }, 'primary'), k.btn('It revved me up (-5)', function () { s.remove(); a.logGaba('stress', item, -5); }), k.btn('Skip', function () { s.remove(); }, 'ghost'))]);
  }
  function gabaDoc(S, mo) {
    var days = {}, b = [{ t: 'title', text: 'GABA log - ' + PN.monthName(mo) }, { t: 'sub', text: S.totemName + ' · ' + G.DISCLAIMER }];
    var lv = G.level(S); b.push({ t: 'kv', k: 'Level', v: lv.n + ' ' + lv.name + ' (' + lv.xp + ' brake points)' });
    G.entries(S).filter(function (g) { return g.d.slice(0, 7) === mo; }).forEach(function (g) { (days[g.d] = days[g.d] || []).push(g); });
    Object.keys(days).sort().forEach(function (d) {
      b.push({ t: 'h3', text: Wd.cap(U.fmtDay(d)) + ' - bar ' + G.bar(S, d) + ' (' + G.state(G.bar(S, d)).toLowerCase() + ')' });
      days[d].forEach(function (g) { b.push({ t: 'li', text: U.hmStr(new Date(g.t)) + '  ' + g.item + '  ' + (g.pts > 0 ? '+' : '') + g.pts + (g.goal ? '  (goal)' : '') + (g.note ? ' - ' + g.note : '') }); });
    });
    if (!Object.keys(days).length) b.push({ t: 'p', text: 'Nothing logged this month.' });
    return { title: 'GABA ' + PN.monthName(mo), blocks: b };
  }

  /* ---------- the notebook (was More): what Aiu has learned about you, and its own past forms ---------- */
  function notebook() {
    var a = app(), S = a.S, k = K(), p = body(), A = AIU.art;
    p.appendChild(h('div', { cls: 'row spread' }, k.btn('< Journal', function () { st.jview = null; ui.go('journal', 'pages'); }, 'mini ghost')));
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

  /* =====================================================================================
     I CHING: today's cast, the time it's cast each day, and every past reading.
     ===================================================================================== */
  PN.ichingActions = function (S) { var a = app(), rv = (S.reviews || {})[today()]; return [rv && !a.dev.mute ? K().btn('Read aloud', function (e) { var on = a.readAloud(rv.text); e.target.textContent = on ? 'Stop' : 'Read aloud'; }, 'mini') : null, PN.pdfBtn(function () { PN.savePdf(readingsDoc(S), 'aiu-iching-readings'); })]; };
  PN.ichingView = function () {
    var a = app(), S = a.S, k = K(), p, d = today(), rv = (S.reviews || {})[d];
    p = body();
    if (!S.hatched) { p.appendChild(k.empty('Hatch your egg first.')); return; }
    if (rv) {
      var X = AIU.iching.info(rv.hex), R = rv.rel && rv.rel !== rv.hex ? AIU.iching.info(rv.rel) : null;
      p.appendChild(h('div', { cls: 'row jcast' }, k.hexPic(rv.vals, rv.hex), h('div', { cls: 'col' },
        h('b', { text: 'Today: ' + rv.hex + '. ' + X.name + ' (' + X.pinyin + ')' }), h('span', { text: 'Theme: ' + X.theme }),
        h('span', { cls: 'small', text: (rv.moving && rv.moving.length ? 'Changing line' + (rv.moving.length > 1 ? 's ' : ' ') + rv.moving.join(', ') : 'No changing lines') + (R ? ' -> ' + R.n + ' ' + R.name : '') }))));
      p.appendChild(h('div', { cls: 'jsec' }, h('h4', { text: 'Hilltop View' }), h('p', { cls: 'jval', text: rv.text })));
      p.appendChild(h('div', { cls: 'jsec' }, h('p', null, h('b', { text: 'Traditional principle: ' }), X.meaning), h('p', null, h('b', { text: 'Modern interpretation: ' }), X.modern), h('p', null, h('b', { text: 'Hilltop application: ' }), X.advice),
        X.principle ? h('blockquote', { cls: 'jprinciple', text: X.principle }) : null));
      p.appendChild(h('div', { cls: 'row wrap' }, k.btn('Today\'s journal page', function () { ui.openToday(); }, 'primary')));
    } else {
      p.appendChild(h('p', { text: 'Today\'s coins haven\'t been tossed yet.' + (M.readingTime(S) ? ' ' + S.totemName + ' casts at ' + U.fmtHm(M.readingTime(S), k.c24()) + '.' : '') }));
      p.appendChild(k.btn('Cast today\'s reading now', function () { a.castReading(true); k.snack(S.totemName + ' is tossing the coins (watch the scene)...'); }, 'primary'));
    }
    var rtimes = [['off', 'Off']], rcur = C.setting(S, 'reading', M.readingDefault(S));
    for (var rm = 240; rm <= 1320; rm += rm < 720 ? 30 : 60) rtimes.push([U.minToHm(rm), U.fmtHm(U.minToHm(rm), k.c24())]);
    if (!rtimes.some(function (x) { return x[0] === rcur; })) rtimes.push([rcur, U.fmtHm(rcur, k.c24())]);
    p.appendChild(k.field('Daily cast time', k.sel(rtimes, rcur, function (v) { a.setSetting('reading', v); }), 'At this time ' + S.totemName + ' tosses three coins six times, then gives you the Hilltop View. Practical wisdom, not fortune-telling.'));
    var days = Object.keys(S.reviews || {}).filter(function (x) { return x !== d; }).sort().reverse();
    p.appendChild(h('h3', { cls: 'qgroup', text: 'Past readings' }));
    if (!days.length) p.appendChild(k.empty('Your past readings will collect here.'));
    days.slice(0, 90).forEach(function (x) { p.appendChild(k.readingCard(a, S.reviews[x])); });
  };
  function readingsDoc(S) {
    var b = [{ t: 'title', text: 'I Ching readings' }, { t: 'sub', text: S.totemName + ' · practical wisdom, not fortune-telling' }];
    Object.keys(S.reviews || {}).sort().reverse().forEach(function (d) {
      var rv = S.reviews[d], X = AIU.iching.info(rv.hex); if (!X) return;
      b.push({ t: 'h2', text: Wd.cap(U.fmtDay(d)) + ' (' + d + '): ' + rv.hex + ' ' + X.name + ' - ' + X.theme });
      if (rv.vals && rv.vals.length === 6) b.push({ t: 'hex', vals: rv.vals });
      b.push({ t: 'p', text: rv.text });
    });
    return { title: 'I Ching readings', blocks: b };
  }
})();
