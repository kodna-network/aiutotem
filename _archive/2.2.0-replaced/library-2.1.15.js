/* AIU TOTEM 1.1.0 - the Journal: search, a table of contents (one line per day), one page per day (summary, entries,
   I Ching, what got done, GABA, and the old conversation), and the notebook (what Aiu has learned).
   Also Journal > Me (personality, GABA, suggestions) and Journal > I Ching (moved from the Planner in 2.0.0). Any day, month or year saves as a PDF. */
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
  // 2.0: the Log has three tabs. Today (the I Ching, your Go/Brake, today's entry), Journal (every page) and Profiles (you and your businesses).
  var JSUBS = [['today', 'Today'], ['journal', 'Journal'], ['profiles', 'Profiles']];
  PN.journal = function () {
    var a = app(), S = a.S, k = K(), cur = ui.sub.journal || 'today', PL = AIU.planner;
    if (cur === 'pages') cur = 'journal';
    if (cur === 'iching') { cur = 'today'; st.jview = 'iching'; }
    if (cur === 'me' || cur === 'self') { cur = 'profiles'; st.folder = PL.ME; st.bsub = st.selfSub || 'personality'; }
    if (!JSUBS.some(function (x) { return x[0] === cur; })) cur = 'today';
    if (st.jday) cur = 'journal';
    ui.sub.journal = cur;
    function onSub(v) { st.jday = null; st.jview = null; st.jfromToday = false; if (v === 'profiles') { st.folder = null; st.person = null; st.doc = null; } ui.go('journal', v); }
    var acts = [];
    if (cur === 'profiles') acts = AIU.business.actions(S);
    else if (st.jview === 'iching') acts = PN.ichingActions(S);
    else {
      acts.push(k.btn('+ New entry', function () { ui.journalSheet(); }, 'mini primary'));
      if (st.jday && !a.dev.mute) acts.push(k.btn('Read aloud', function (e) { var on = a.readAloud(st.readText || ''); e.target.textContent = on ? 'Stop' : 'Read aloud'; }, 'mini'));
      if (st.jday) acts.push(null);
      else if (cur === 'journal' && !st.jview) acts.push(null);
    }
    ui.panelHead('Log', acts, JSUBS, cur, onSub);
    if (cur === 'profiles') return AIU.business.view();
    if (st.jview === 'iching') return PN.ichingView();
    if (st.jday) return dayPage(st.jday);
    if (cur === 'today') return todayView();
    contents();
  };
  /* ---------- Log > Today: the I Ching, your Go/Brake and today's entry ---------- */
  var PROMPTS = ['What went well today?', 'What\'s on your mind right now?', 'What did you get done, big or small?', 'What would make tomorrow easier?', 'Who did you spend time with, and how was it?', 'What\'s one thing you want to remember about today?', 'What\'s bugging you? Get it out of your head.', 'What are you looking forward to?', 'What did you learn today?', 'How\'s your body feeling: tired, rested, sore, wired?'];
  function prompts(S, d) {
    var rv = (S.reviews || {})[d], X = rv ? AIU.iching.info(rv.hex) : null, hr = U.wall(new Date(app().trueNow())).getHours(), out = [];
    if (hr < 12) out.push('What\'s the plan for today?'); else if (hr >= 18) out.push('How did today go?');
    if (X) out.push('Today\'s reading is about "' + X.theme.toLowerCase() + '". Where did that show up in your day?');
    var start = U.hash32(d) % PROMPTS.length;
    for (var i = 0; i < PROMPTS.length; i++) out.push(PROMPTS[(start + i) % PROMPTS.length]);
    return out;
  }
  // (2.1.1-2.1.4 GABA standup removed in 2.1.5: its daily suggestion lives in Aiu Vitals now; old code in _archive/hilltop-page-2.1.1)
  /* ---------- 2.1.2: the Daily Hilltop: ONE standup a day, three short parts ----------
     1 Cast: today's I Ching in one line.  2 Look back and ahead: how yesterday went (next to what you expected), today's
     one focus, what you expect tomorrow.  3 Brake: one calm thing for today.  Answers go on the day's page:
     'went' on yesterday's page, 'priorities' (today's focus) and 'carry' (tomorrow) on today's, 'look' = 1 when done. */
  PN.hilltopParts = function (S, d) { return { cast: !!(S.reviews || {})[d] || !S.hatched }; }; // 2.1.5: the Daily Hilltop is the cast (look back / brake moved out)
  PN.hilltopDone = function (S, d) { return PN.hilltopParts(S, d).cast; };
  PN.WENT = ['As planned', 'Partly', 'Off track'];
  function gistOf(rv) { return rv ? (String(rv.text || '').match(/[^.!?]+[.!?]+/g) || [String(rv.text || '')]).map(function (x) { return x.trim(); }).filter(function (x) { return x && !/^Hilltop View for|I Ching:|^\d+\./.test(x); }).slice(0, 1).join(' ') : ''; }
  function hilltopCard(S, d, onChange) {
    var a = app(), k = K(), box = h('div', { cls: 'dhill' }), rv = (S.reviews || {})[d], X = rv ? AIU.iching.info(rv.hex) : null;
    box.appendChild(rv && X ? h('div', null,
      h('div', { cls: 'row jcast' }, k.hexPic(rv.vals, rv.hex), h('div', { cls: 'col' }, h('b', { text: rv.hex + '. ' + X.name + ': ' + X.theme }), gistOf(rv) ? h('span', { cls: 'small', text: gistOf(rv) }) : null)),
      k.btn('Read more', function () { document.querySelectorAll('.sheet').forEach(function (x) { x.remove(); }); ui.go('journal', 'today'); st.jday = null; st.jview = 'iching'; ui.renderPanel(true); ui.toPanel(); }, 'mini ghost'))
      : a.casting ? h('p', { text: S.totemName + ' is tossing the coins...' })
      : h('div', null, h('p', { cls: 'small', text: 'Today\'s reading is ready. ' + S.totemName + ' tosses the three coins in the yard the next time he\'s free while you\'re here. Practical wisdom for the day, not fortune-telling.' })));
    return box;
  }
  /* ---------- 2.1.5: Aiu's Hilltop View: its overview of you, in a few plain lines (no AI: counted from your tiles, entries and Vitals) ---------- */
  PN.hilltopSummary = function (S, d) {
    var T = AIU.tiles, y = U.addDays(d, -1), out = [], head = '';
    function missedOn(day) { // tiles that were due that day and didn't get finished
      var miss = [], done = [];
      T.list(S).forEach(function (q) {
        if (T.isStarter(q) || T.isShop(q) || !T.onDay(q, day) || (q.first && U.dayStr(new Date(q.first)) > day)) return;
        var w = T.tile(q).when || {}, ts = T.times(q);
        if (w.t === 'window') return;
        if (T.multi(q)) ts.forEach(function (tm) { var r = (S.tdone || {})[q.key + '|' + day + '@' + tm]; (r && r.done ? done : miss).push(q.title + ' (' + U.fmtHm(tm, K().c24()) + ')'); });
        else { var o = T.occurrence(q, day), r2 = (S.tdone || {})[q.key + '|' + o.p]; ((r2 && r2.done) || q.state === 'done' ? done : miss).push(q.title); }
      });
      return { miss: miss, done: done };
    }
    var Y = missedOn(y), tot = Y.miss.length + Y.done.length, vs = AIU.vitals ? AIU.vitals.state(S) : null;
    var entY = (S.journal || []).filter(function (e) { return e.d === y; }).length;
    if (tot) {
      head = !Y.miss.length ? 'Yesterday went to plan: everything due got done.' : Y.done.length >= Y.miss.length ? 'Good day yesterday, with a couple of loose ends.' : 'Yesterday got away from you a bit. Today is a fresh start.';
      if (Y.done.length) out.push('Done yesterday: ' + Y.done.slice(0, 4).join(', ') + (Y.done.length > 4 ? ' and ' + (Y.done.length - 4) + ' more' : '') + '.');
      if (Y.miss.length) out.push('Missed yesterday: ' + Y.miss.slice(0, 4).join(', ') + (Y.miss.length > 4 ? ' and ' + (Y.miss.length - 4) + ' more' : '') + '.');
    } else head = 'Nothing was due yesterday.';
    var overdue = T.list(S).filter(function (q) { var w = T.tile(q).when || {}; return !T.isStarter(q) && w.t === 'once' && w.date && w.date < y && q.state !== 'done' && !T.doneNow(S, q, d); }).map(function (q) { return q.title; });
    if (overdue.length) out.push('Still waiting from before: ' + overdue.slice(0, 3).join(', ') + (overdue.length > 3 ? ' and more' : '') + '.');
    var Td = missedOn(d), left = Td.miss.length;
    out.push(Td.miss.length + Td.done.length ? (left ? 'Today: ' + left + ' to go (' + Td.miss.slice(0, 3).join(', ') + (left > 3 ? '...' : '') + ')' + (Td.done.length ? ', ' + Td.done.length + ' done.' : '.') : 'Today: all ' + Td.done.length + ' done. Nice.') : 'Today: nothing due. A good day to start a tile.');
    if (vs) { var ny = G.day(S, y).filter(function (g) { return g.kind === 'calm'; }).length, low = C.VIT.SYS.slice().sort(function (p0, p1) { return vs.lv[p0] - vs.lv[p1]; })[0];
      out.push(S.totemName + '\'s Vitals: ' + vs.avg + '%' + (vs.distressed ? ' (worn out: he\'s tired and not growing)' : '') + '. ' + (ny ? ny + ' check-in' + (ny === 1 ? '' : 's') + ' yesterday. ' : '') + (vs.lv[low] < C.VIT.FULL ? 'Lowest: ' + AIU.vitals.part(low).name + ' (' + vs.lv[low] + '%).' : '')); }
    var streak = 0, x = d; if (!(S.journal || []).some(function (e) { return e.d === x; })) x = y; while ((S.journal || []).some(function (e) { return e.d === x; })) { streak++; x = U.addDays(x, -1); }
    if (streak >= 2) out.push(streak + ' days in a row with a journal entry.'); else if (!entY && !(S.journal || []).some(function (e) { return e.d === d; })) out.push('No journal entry yesterday or today yet.');
    return { head: head, lines: out };
  };
  PN.hilltopSheet = function () {
    var a = app(), d = today(), s, wrap = h('div');
    function draw() { if (!wrap.isConnected && s) { PN._hsRedraw = null; return; } K().clear(wrap); wrap.appendChild(hilltopCard(a.S, d, draw)); if (PN.hilltopDone(a.S, d)) wrap.appendChild(h('p', { cls: 'dhdone', text: 'That\'s your Daily Hilltop. See you tomorrow.' })); }
    draw();
    s = K().sheet('Daily Hilltop', [h('p', { cls: 'small', text: 'Once a day: today\'s reading, practical wisdom for the day.' }), wrap]);
    PN._hsRedraw = draw; // the coins land while it's open: show the reading
    return s;
  };
  function todayView() { // 2.1.5: the date, the Daily Hilltop (cast), today's entry, the day's tiles, and Aiu's overview
    var a = app(), S = a.S, k = K(), p = body(), d = today(), name = S.totemName, mine = (S.journal || []).filter(function (e) { return e.d === d; });
    p.appendChild(h('h3', { cls: 'jtitle', text: Wd.cap(PN.nice(d)) }));
    // 2.1.15: one Daily Hilltop card: today's reading and Aiu's overview of you (it was two boxes)
    var sm = PN.hilltopSummary(S, d);
    p.appendChild(k.acc('t-hill', 'Daily Hilltop', [hilltopCard(S, d, function () { ui.renderPanel(true); }),
      h('section', { cls: 'tsum' }, h('div', { cls: 'tsumhead' }, ui.pix('yin'), h('b', { text: name + '\'s Hilltop View' })), h('p', { cls: 'tsumh', text: sm.head }), h('ul', null, sm.lines.map(function (l) { return h('li', { text: l }); })))], true));
    // today's entry
    var ps = prompts(S, d), pi = (st.jpi || 0) % ps.length, q = h('p', { cls: 'jprompt', text: ps[pi] });
    var ents = h('div'); mine.slice().reverse().forEach(function (e) { ents.appendChild(k.journalCard(a, e)); });
    p.appendChild(k.acc('t-entry', 'Today\'s entry', [q,
      h('div', { cls: 'row wrap' },
        k.btn('Write', function () { ui.journalSheet(null, { prompt: q.textContent }); }, 'primary'),
        (function (b) { b.insertBefore(ui.pix('mic'), b.firstChild); return b; })(k.btn(' Talk it', function () { ui.journalSheet(null, { prompt: q.textContent, listen: true }); })),
        k.btn('Another question', function () { st.jpi = (pi + 1) % ps.length; q.textContent = ps[st.jpi]; }, 'ghost')),
      h('p', { cls: 'small', text: '80+ letters grows ' + name + ' +10.' }), ents
    ], true, mine.length || null));
    // the day's tile log (collapsed)
    var tl = PN.tileLog(S, d);
    p.appendChild(k.acc('t-tiles', 'Tile log', [tl.length ? h('ul', { cls: 'tilelog' }, tl.map(function (x) { return h('li', null, h('span', { cls: 'itime', text: U.fmtHm(U.hmStr(new Date(x.t)), k.c24()) }), ' ' + x.text); }))
      : h('p', { cls: 'small', text: 'When you add, change or finish a tile, it\'s written here by itself.' })], false, tl.length || null));
  }
  // search + the table of contents
  /* ---------- 2.1.9: Log > Journal: the summary, the contents (every day), search and the glossary ---------- */
  var STOP = {}; ('a about above after again all also am an and any are as at be because been before being below between both but by can could did do does doing down during each few for from further had has have having he her here hers him his how i if in into is it its just like me more most my no nor not now of off on once only or other our out over own really same she should so some still such than that the their them then there these they this those through to too under until up us very was we were what when where which while who why will with would you your yours im ive dont didnt cant got get gets going go went today yesterday tomorrow day days time thing things lot much one two three back well good bad make made need want lets let thats its it\'s i\'m i\'ve don\'t didn\'t can\'t').split(' ').forEach(function (w) { STOP[w] = 1; });
  function words(text) { return String(text || '').toLowerCase().replace(/[’']/g, '').match(/[a-z][a-z0-9-]{2,}/g) || []; }
  function entries(S) { var hid = S.jhide || {}; return (S.journal || []).filter(function (e) { return !(hid[e.id] && hid[e.id].v); }); }
  // the words and names you use most (the glossary), optionally only since a day
  PN.wordCounts = function (S, since) {
    var c = {}, disp = {};
    entries(S).forEach(function (e) {
      if (since && e.d < since) return;
      var raw = String((e.data && e.data.text) || ''), seen = {};
      words(raw).forEach(function (w) { if (STOP[w] || /^\d/.test(w) || seen[w]) return; seen[w] = 1; c[w] = (c[w] || 0) + 1; });
      (raw.match(/[a-z,;]\s+[A-Z][a-z]{2,}\b/g) || []).forEach(function (n) { n = n.replace(/^[a-z,;]\s+/, ''); disp[n.toLowerCase()] = n; }); // keep names capitalized (not just a word starting a sentence)
    });
    return Object.keys(c).map(function (w) { return { w: disp[w] || w, n: c[w] }; }).sort(function (x, y) { return y.n - x.n || (x.w < y.w ? -1 : 1); });
  };
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }
  function list3(a) { return a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
  // A summary of the whole journal, rebuilt from what's in it every time it changes
  var sumMemo = { S: null, v: null };
  PN.journalSummary = function (S) {
    if (sumMemo.S === S) return sumMemo.v;
    var t = today(), I = AIU.iching, T = AIU.tiles, out = [], E = entries(S), days = PN.allDays(S).slice().sort();
    // 1. the shape of it
    var wordsN = 0, edays = {}; E.forEach(function (e) { wordsN += words(e.data && e.data.text).length; edays[e.d] = 1; });
    var streak = 0, x = edays[t] ? t : U.addDays(t, -1); while (edays[x]) { streak++; x = U.addDays(x, -1); }
    var lastE = Object.keys(edays).sort().pop();
    if (!days.length) { sumMemo = { S: S, v: [] }; return []; }
    out.push({ h: 'Overview', p: 'Your journal runs from ' + PN.nice(days[0]) + ' to ' + (days[days.length - 1] === t ? 'today' : PN.nice(days[days.length - 1])) + ': ' + plural(days.length, 'day') + ' with something in ' + (days.length === 1 ? 'it' : 'them') + ', ' + plural(E.length, 'entry', 'entries') + (wordsN ? ' (about ' + wordsN.toLocaleString() + ' words)' : '') + '. ' +
      (streak >= 2 ? 'You\'ve written ' + streak + ' days in a row.' : lastE ? (lastE === t ? 'You wrote today.' : 'Your last entry was ' + U.fmtDay(lastE) + '.') : 'No written entries yet: the days here come from readings, tiles and check-ins.') });
    // 2. the I Ching pattern
    var rk = Object.keys(S.reviews || {}).sort();
    if (rk.length) {
      var cnt = {}, modes = {}, mov = 0, recent = rk.slice(-7);
      rk.forEach(function (d) { var rv = S.reviews[d], X = I.info(rv.hex); if (!X) return; cnt[rv.hex] = (cnt[rv.hex] || 0) + 1; modes[X.mode] = (modes[X.mode] || 0) + 1; if (rv.moving && rv.moving.length) mov++; });
      var top = Object.keys(cnt).sort(function (a0, b0) { return cnt[b0] - cnt[a0]; }), rep0 = top.filter(function (n) { return cnt[n] > 1; });
      var themes = recent.map(function (d) { var X = I.info(S.reviews[d].hex); return X ? X.theme : ''; }).filter(Boolean);
      var tm = Object.keys(modes).sort(function (a0, b0) { return modes[b0] - modes[a0]; })[0], X0 = I.info(+top[0]);
      var p1 = plural(rk.length, 'reading') + ' so far. ' + (rep0.length ? 'Coming back again and again: ' + list3(rep0.slice(0, 3).map(function (n) { var X = I.info(+n); return n + ' ' + X.name + ' (' + cnt[n] + ' times)'; })) + '. ' : '') +
        'Lately the themes are ' + list3(themes.slice(-4).reverse()) + '. The readings lean toward "' + (I.MODES[tm] ? I.MODES[tm].label : tm) + '"' + (mov ? ', and ' + Math.round(mov / rk.length * 100) + '% had changing lines' : '') + '.';
      if (rep0.length && X0) p1 += ' ' + X0.name + ' keeps showing up: ' + X0.advice;
      out.push({ h: 'I Ching pattern', p: p1 });
    }
    // 3. what you write about
    var all = PN.wordCounts(S).filter(function (w) { return w.n >= 2; }), wk = PN.wordCounts(S, U.addDays(t, -6)), allMap = {}; all.forEach(function (w) { allMap[w.w.toLowerCase()] = w.n; });
    if (all.length) {
      var fresh = wk.filter(function (w) { return (allMap[w.w.toLowerCase()] || 0) <= w.n && w.n >= 1; }).slice(0, 4).map(function (w) { return w.w; });
      out.push({ h: 'What you write about', p: 'You come back to ' + list3(all.slice(0, 6).map(function (w) { return w.w + ' (' + w.n + ')'; })) + ' the most.' + (fresh.length && E.length > 3 ? ' New this week: ' + list3(fresh) + '.' : '') });
    }
    // 4. what got done, and Vitals
    var since = new Date(U.dayToDate(U.addDays(t, -6))).getTime(), fin = {}, steps = 0;
    Object.keys(S.tdone || {}).forEach(function (k0) { var r = S.tdone[k0], q = S.quests[k0.split('|')[0]]; if (r && r.done && r.t >= since && q && !(T && T.isStarter(q))) fin[q.title] = 1; });
    Object.keys(S.qsteps || {}).forEach(function (k0) { var r = S.qsteps[k0]; if (r && r.done && r.t >= since) steps++; });
    var calm = {}; G.entries(S).forEach(function (g) { if (g.kind === 'calm' && g.t >= since) calm[g.item] = (calm[g.item] || 0) + 1; });
    var calmTop = Object.keys(calm).sort(function (a0, b0) { return calm[b0] - calm[a0]; }), calmN = Object.keys(calm).reduce(function (n, k0) { return n + calm[k0]; }, 0);
    var finL = Object.keys(fin), p3 = [];
    if (finL.length) p3.push('Finished this week: ' + list3(finL.slice(0, 5)) + (finL.length > 5 ? ' and ' + (finL.length - 5) + ' more' : '') + '.');
    if (steps) p3.push(plural(steps, 'step') + ' checked off.');
    if (calmN) p3.push(plural(calmN, 'Vitals check-in') + ', most often ' + calmTop[0].replace(/\s*\(.*\)$/, '').toLowerCase() + '.');
    if (p3.length) out.push({ h: 'Done lately', p: p3.join(' ') });
    // 5. heads up
    var hu = [];
    if (T) { var od = T.list(S).filter(function (q) { var w = T.tile(q).when || {}; return !T.isStarter(q) && w.t === 'once' && w.date && w.date < t && q.state !== 'done' && !T.doneNow(S, q, t); }).map(function (q) { return q.title; }); if (od.length) hu.push('Still waiting: ' + list3(od.slice(0, 3)) + (od.length > 3 ? ' and more' : '') + '.'); }
    if (all.length && T) { var titles = T.list(S).map(function (q) { return q.title.toLowerCase(); }).join(' '), loose = all.slice(0, 8).filter(function (w) { return w.n >= 3 && titles.indexOf(w.w.toLowerCase()) < 0 && /^[a-z]/i.test(w.w); }).slice(0, 2).map(function (w) { return w.w; }); if (loose.length) hu.push('You mention ' + list3(loose) + ' a lot but have no tile for ' + (loose.length > 1 ? 'them' : 'it') + '.'); }
    if (lastE && lastE < U.addDays(t, -2)) hu.push('It\'s been a few days since you wrote. Even one line helps.');
    if (hu.length) out.push({ h: 'Heads up', p: hu.join(' ') });
    sumMemo = { S: S, v: out };
    return out;
  };
  // search: every word you type has to be on that day (entries, your notes, the reading's theme, tile titles)
  function searchDays(S, q) {
    var terms = String(q || '').toLowerCase().split(/\s+/).filter(Boolean), byDay = {}, I = AIU.iching;
    if (!terms.length) return [];
    function add(d, text, kind) { if (!d || !text) return; (byDay[d] = byDay[d] || []).push({ text: String(text), kind: kind }); }
    entries(S).forEach(function (e) { add(e.d, e.data && e.data.text, 'entry'); });
    Object.keys(S.jpages || {}).forEach(function (d) { var pg = S.jpages[d]; Object.keys(pg).forEach(function (f) { if (pg[f] && pg[f].text) add(d, pg[f].text, 'note'); }); });
    Object.keys(S.reviews || {}).forEach(function (d) { var rv = S.reviews[d], X = I.info(rv.hex); if (X) add(d, rv.hex + ' ' + X.name + ' ' + X.theme, 'reading'); });
    G.entries(S).forEach(function (g) { add(g.d, g.item, 'check-in'); });
    var hits = [];
    Object.keys(byDay).forEach(function (d) {
      var blob = byDay[d].map(function (x) { return x.text; }).join(' \n ').toLowerCase();
      if (!terms.every(function (tm) { return blob.indexOf(tm) >= 0; })) return;
      var score = function (x) { var lt = x.text.toLowerCase(); return terms.filter(function (tm) { return lt.indexOf(tm) >= 0; }).length; }, best = byDay[d].slice().sort(function (x, y) { return score(y) - score(x); })[0], tx = best.text, at = tx.toLowerCase().indexOf(terms[0]);
      var snip = at > 40 ? '...' + tx.slice(at - 30, at + 80) : tx.slice(0, 110); if (tx.length > (at > 40 ? at + 80 : 110)) snip += '...';
      hits.push({ day: d, kind: best.kind, text: snip });
    });
    return hits.sort(function (x, y) { return x.day < y.day ? 1 : -1; });
  }
  function contents() {
    var a = app(), S = a.S, k = K(), p = body();
    // the summary
    var sum = PN.journalSummary(S), sb = h('div', { cls: 'jsummary' });
    if (!sum.length) sb.appendChild(h('p', { cls: 'small', text: 'Write an entry or cast a reading and your journal summary starts here.' }));
    sum.forEach(function (x) { sb.appendChild(h('p', null, h('b', { text: x.h + ': ' }), x.p)); });
    p.appendChild(k.acc('j-sum', 'Journal summary', [sb], true));
    // the contents: one line per day, grouped by month, with a sort and a filter
    var SHOW = { all: 'Every day', entry: 'Days with entries', reading: 'Days with a reading', tiles: 'Days with tile updates', calm: 'Days with check-ins' }, show = st.jshow || 'all';
    var tools = h('div', { cls: 'row wrap jtools' },
      k.sel({ new: 'Newest first', old: 'Oldest first' }, st.jold ? 'old' : 'new', function (v) { st.jold = v === 'old'; ui.renderPanel(true); }),
      k.sel(SHOW, show, function (v) { st.jshow = v; ui.renderPanel(true); }));
    tools.querySelectorAll('select').forEach(function (x, i) { x.setAttribute('aria-label', i ? 'Which days' : 'Order'); });
    var days = PN.allDays(S).filter(function (d) {
      if (show === 'entry') return entries(S).some(function (e) { return e.d === d; });
      if (show === 'reading') return !!(S.reviews || {})[d];
      if (show === 'tiles') return PN.tileLog(S, d).length > 0;
      if (show === 'calm') return G.day(S, d).some(function (g) { return g.kind === 'calm'; });
      return true;
    }), months = {}, cbox = h('div');
    days.forEach(function (d) { (months[d.slice(0, 7)] = months[d.slice(0, 7)] || []).push(d); });
    var keys = Object.keys(months).sort(); if (!st.jold) keys.reverse();
    if (!keys.length) cbox.appendChild(k.empty('No days match.'));
    keys.forEach(function (mo, i) {
      var list = months[mo].slice().sort(); if (!st.jold) list.reverse();
      var inner = h('div'); list.forEach(function (d) { inner.appendChild(tocRow(S, d)); });
      cbox.appendChild(k.acc('jm-' + mo, MONTHS[+mo.slice(5) - 1] + ' ' + mo.slice(0, 4), [inner], i === 0, list.length));
    });
    p.appendChild(h('h4', { cls: 'jhead', text: 'Contents' })); p.appendChild(tools); p.appendChild(cbox);
    // search (type, then Search or the keyboard's Go)
    var q = k.inp({ type: 'search', placeholder: 'Search: groceries, birthday, truck...', 'aria-label': 'Search your journal', value: st.jq || '', enterkeyhint: 'search' }), out = h('div', { cls: 'results', 'aria-live': 'polite' });
    function run() {
      var v = q.value.trim(); st.jq = v; k.clear(out); if (!v) return;
      var hits = searchDays(S, v);
      out.appendChild(h('p', { cls: 'small', text: hits.length ? plural(hits.length, 'day') + ' with "' + v + '"' : 'Nothing found for "' + v + '".' }));
      hits.slice(0, 40).forEach(function (d) { out.appendChild(h('button', { type: 'button', cls: 'item col linkish', onclick: function () { st.jday = d.day; st.jfromToday = false; ui.renderPanel(true); ui.toPanel(); } }, h('span', { cls: 'tag', text: U.fmtDay(d.day) + ' · ' + d.kind }), h('span', { text: d.text }))); });
    }
    q.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); q.blur(); run(); } });
    q.addEventListener('search', run);
    p.appendChild(h('h4', { cls: 'jhead', text: 'Search' }));
    p.appendChild(h('div', { cls: 'row jsearch' }, q, k.btn('Search', run, 'primary'), st.jq ? k.btn('Clear', function () { st.jq = ''; q.value = ''; k.clear(out); }, 'ghost') : null));
    p.appendChild(out); if (st.jq) run();
    // the glossary: the words and names you use most (tap one to search it)
    var gl = PN.wordCounts(S).filter(function (w) { return w.n >= 2; }).slice(0, 60), gb = h('div', { cls: 'chips glossary' });
    if (!gl.length) gb.appendChild(h('p', { cls: 'small', text: 'The words and names you write about most show up here as you write.' }));
    gl.forEach(function (w) { gb.appendChild(k.btn(w.w + ' ' + w.n, function () { st.jq = w.w; ui.renderPanel(true); }, 'chip')); });
    p.appendChild(k.acc('j-gloss', 'Glossary (the words you use most)', [gb], false, gl.length || null));
    // hidden entries can come back
    var hid = Object.keys(S.jhide || {}).filter(function (id) { return S.jhide[id].v; });
    if (hid.length) p.appendChild(k.acc('lib-hidden', 'Hidden entries', hid.slice(-40).reverse().map(function (id) {
      return h('div', { cls: 'item' }, h('span', { cls: 'ititle', text: 'Hidden ' + U.ago(S.jhide[id].t) }), k.btn('Bring back', function () { a.addEvents([{ type: 'line_hide', data: { ref: id, hidden: false } }]); }, 'mini'));
    }), false, hid.length));
  }
  function tocRow(S, d) {
    var rv = (S.reviews || {})[d], X = rv ? AIU.iching.info(rv.hex) : null, gv = G.day(S, d).filter(function (g) { return g.kind === 'calm'; }).length || null;
    var ent = (S.journal || []).filter(function (e) { return e.d === d; }), first = ent.length ? ent[ent.length - 1].data.text : '';
    var tn = PN.tileLog(S, d).length, bits = [X ? 'I Ching ' + rv.hex + ' ' + X.theme : '', ent.length ? ent.length + ' entr' + (ent.length === 1 ? 'y' : 'ies') : '', tn ? tn + ' tile update' + (tn === 1 ? '' : 's') : '', gv ? gv + ' check-in' + (gv === 1 ? '' : 's') : ''].filter(Boolean);
    return h('button', { type: 'button', cls: 'qrow dayrow', onclick: function () { st.jday = d; st.jfromToday = false; ui.renderPanel(true); ui.toPanel(); } },
      h('span', { cls: 'qrtitle', text: (d === today() ? 'Today · ' : '') + PN.nice(d) }),
      h('span', { cls: 'qrmeta', text: bits.join(' · ') || 'a quiet day' }),
      first ? h('span', { cls: 'qrsnip', text: first.length > 90 ? first.slice(0, 88) + '...' : first }) : null);
  }
  // What got done on a day: quest steps, checked list items, reminders, paid bills
  // 2.0.4: what happened to your tiles on a day, written into that day's Log by itself: new, changed, steps done, finished, set aside
  var TFIELD = { when: 'when', who: 'who', dur: 'how long', status: 'status', acct: 'account card' };
  PN.tileLog = function (S, day) {
    var T = AIU.tiles, out = [], dayOf = function (t) { return U.dayStr(new Date(t)); }, c24 = K().c24(), SL = {}; (T ? T.STATUS : []).forEach(function (x) { SL[x[0]] = x[1]; });
    Object.keys(S.quests || {}).forEach(function (k0) {
      var q = S.quests[k0]; if (!q.title) return;
      var name = '"' + q.title + '"', first = q.first || 0, born = dayOf(first) === day;
      if (born && !/^starter-/.test(k0)) out.push({ t: first, text: 'New tile: ' + name + '.' });
      var changed = {}, ct = 0;
      var fin = Object.keys(S.tdone || {}).filter(function (tk) { return tk.indexOf(k0 + '|') === 0; }).map(function (tk) { return S.tdone[tk].t; });
      var nearFinish = function (t) { return fin.some(function (x) { return Math.abs(x - t) < 600; }); }; // finishing rewrites a few things: that's the finish, not an update
      Object.keys(q.tileM || {}).forEach(function (f) { var m = q.tileM[f]; if (m && dayOf(m.t) === day && m.t - first > 3000 && TFIELD[f] && !nearFinish(m.t) && !(f === 'status' && /^(done|doing)$/.test(q.tile.status))) { changed[f] = 1; ct = Math.max(ct, m.t); } });
      if (q.setM && dayOf(q.setM.t) === day && q.setM.t - first > 3000 && !nearFinish(q.setM.t)) { changed.steps = 1; ct = Math.max(ct, q.setM.t); }
      var cf = Object.keys(changed);
      if (cf.length) out.push({ t: ct, text: 'Updated ' + name + ': ' + cf.map(function (f) { var v = f === 'when' && T ? T.whenText(q, c24) : f === 'status' ? (SL[q.tile.status] || q.tile.status) : f === 'steps' ? '' : (q.tile[f] && f !== 'acct' ? String(q.tile[f]) : ''); return (f === 'steps' ? 'steps' : TFIELD[f]) + (v ? ' (' + v + ')' : ''); }).join(', ') + '.' });
      (q.steps || []).forEach(function (sp) { var x = (S.qsteps || {})[k0 + '|' + sp.id]; if (x && x.done && dayOf(x.t) === day) out.push({ t: x.t, text: 'Step done: ' + sp.title.replace(/\s*\(.*\)$/, '') + ' (' + q.title + ').' }); });
      Object.keys(S.tdone || {}).forEach(function (tk) { var r = S.tdone[tk]; if (tk.indexOf(k0 + '|') === 0 && r.done && dayOf(r.t) === day) { var bought = (r.items || []).filter(function (x) { return !/^example:/i.test(x); }); out.push({ t: r.t, text: r.items ? 'Done shopping (' + q.title + ')' + (bought.length ? ': ' + bought.join(', ') : '') + '.' : 'Finished: ' + name + '.' }); } });
      if (q.stateM && dayOf(q.stateM.t) === day && (q.state === 'dropped' || q.state === 'deleted')) out.push({ t: q.stateM.t, text: (q.state === 'dropped' ? 'Archived: ' : 'Deleted: ') + name + '.' });
    });
    return out.sort(function (x, y) { return x.t - y.t; });
  };
  function doneOn(S, day) {
    var out = [], dayOf = function (t) { return U.dayStr(new Date(t)); }; // (tile steps are in the tile log now)
    Object.keys(S.lists || {}).forEach(function (l) { var L = S.lists[l]; Object.keys(L).forEach(function (k0) { var r = L[k0]; if (!r.removed && r.done && r.doneM && dayOf(r.doneM.t) === day && !/^example:/i.test(r.item)) out.push(r.item); }); });
    Object.keys(S.done || {}).forEach(function (k0) { if (k0.slice(-10) === day) { var t = S.tasks[k0.slice(0, -11)]; out.push(t ? t.title : k0.slice(0, -11)); } });
    return out;
  }
  // One page per day: in short, your entries, the I Ching, what got done, GABA, then the rest and the old conversation
  function dayPage(d0) {
    var a = app(), S = a.S, k = K(), p = body();
    p.appendChild(h('div', { cls: 'row spread' }, k.btn(st.jfromToday ? '< Today' : '< Journal', function () { st.jday = null; if (st.jfromToday) { st.jfromToday = false; ui.go('journal', 'today'); } else ui.renderPanel(true); }, 'mini ghost'),
      h('span', { cls: 'row' }, k.btn('Older', function () { var all = PN.allDays(S), i = all.indexOf(d0); if (i >= 0 && i < all.length - 1) { st.jday = all[i + 1]; ui.renderPanel(true); } }, 'mini'),
        k.btn('Newer', function () { var all = PN.allDays(S), i = all.indexOf(d0); if (i > 0) { st.jday = all[i - 1]; ui.renderPanel(true); } }, 'mini'))));
    p.appendChild(h('h3', { cls: 'jtitle', text: (d0 === today() ? 'Today · ' : '') + Wd.cap(PN.nice(d0)) }));
    var pg = h('div', { cls: 'jpbody' });
    p.appendChild(pg); pg.appendChild(k.empty('Opening...'));
    function draw(evs) {
      k.clear(pg);
      var P = AIU.hilltop.page(a.S, d0, k.pageOpts(a, d0, d0 === today() ? null : evs));
      // 2.1.2: a short page: the Daily Hilltop answers, the reading in one line, your entries, tiles, GABA
      var done = doneOn(S, d0), gl = G.dayLine(S, d0), X = P.cast, tl = PN.tileLog(S, d0), jp = (S.jpages || {})[d0] || {};
      function jt(f) { return jp[f] && jp[f].text ? jp[f].text : ''; }
      var hl = [['How it went', jt('went')], ['Focus', jt('priorities')], ['Expected for tomorrow', jt('carry')]].filter(function (x) { return x[1]; });
      var rv0 = (S.reviews || {})[d0];
      if (X || hl.length) pg.appendChild(h('section', { cls: 'jsec jhill' }, h('h4', { text: 'Daily Hilltop' }),
        X ? h('div', { cls: 'row jcast' }, k.hexPic(X.vals, X.hex), h('div', { cls: 'col' }, h('b', { text: X.hex + '. ' + X.name + ': ' + X.theme }), rv0 && gistOf(rv0) ? h('span', { cls: 'small', text: gistOf(rv0) }) : null)) : null,
        hl.length ? h('dl', { cls: 'jkv' }, hl.map(function (x) { return [h('dt', { text: x[0] }), h('dd', { text: x[1] })]; })) : null,
        null));
      if (P.stories.length) { var eb = h('div'); P.stories.slice().sort(function (x, y) { return x.t - y.t; }).forEach(function (e) { eb.appendChild(k.journalCard(a, e)); }); pg.appendChild(h('section', { cls: 'jsec' }, h('h4', { text: 'Entries' }), eb)); }
      else pg.appendChild(h('section', { cls: 'jsec' }, h('h4', { text: 'Entries' }), h('p', { cls: 'small', text: 'No entries this day.' }), d0 === today() ? k.btn('Write', function () { ui.journalSheet(); }, 'mini') : null));
      if (tl.length) pg.appendChild(h('section', { cls: 'jsec' }, h('h4', { text: 'Tiles' }), h('ul', { cls: 'tilelog' }, tl.map(function (x) { return h('li', null, h('span', { cls: 'itime', text: U.fmtHm(U.hmStr(new Date(x.t)), k.c24()) }), ' ' + x.text); }))));
      if (done.length) pg.appendChild(h('section', { cls: 'jsec' }, h('h4', { text: 'Done' }), h('ul', null, done.slice(0, 40).map(function (x) { return h('li', { text: x }); }))));
      if (gl) pg.appendChild(h('button', { type: 'button', cls: 'gabaline', onclick: function () { PN.openVitals(); } }, gl));
      var mine = AIU.hilltop.FIELDS.map(function (f) { return f[0]; }).filter(function (f) { return f !== 'priorities' && f !== 'carry' && P.log[f] && P.log[f].edited; });
      if (mine.length) pg.appendChild(h('section', { cls: 'jsec' }, h('h4', { text: 'Your notes' }), h('dl', { cls: 'jkv' }, mine.map(function (f) { return [h('dt', { text: P.log[f].label }), h('dd', { text: P.log[f].text })]; }))));
      if (P.ai) pg.appendChild(k.acc('jp-ai', 'AI Hilltop View (older page)', [h('p', { text: P.ai })], false));
      st.readText = [PN.nice(d0) + '.'].concat(X ? ['I Ching: ' + X.hex + ', ' + X.name + '. ' + X.theme + '.'] : [], hl.map(function (x) { return x[0] + ': ' + x[1] + '.'; }), P.stories.map(function (e) { return e.data.text; }), tl.map(function (x) { return x.text; })).join(' ');
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
  /* ---------- Journal > Me (was Planner > Self): your personality and your GABA (Go / Brake) ---------- */
  // 2.0: the same three pages, drawn inside Log > Profiles > You
  PN.personaInto = function (p) { var a = app(); p.appendChild(K().personaBox(a)); if (!C.setting(a.S, 'seenPersona', null)) a.setSetting('seenPersona', 1).then(function () { a.checkStarter(); }); };
  PN.allDays = function (S) {
    var days = {}, t = today();
    Object.keys(S.reviews || {}).forEach(function (d) { days[d] = 1; });
    Object.keys(S.jpages || {}).forEach(function (d) { days[d] = 1; });
    (S.journal || []).forEach(function (e) { days[e.d] = 1; });
    Object.keys(S.lib || {}).forEach(function (mo) { Object.keys(S.lib[mo].days).forEach(function (d) { var pg = S.lib[mo].days[d]; if (pg.say || pg.journal || pg.done || pg.memory) days[d] = 1; }); });
    G.entries(S).forEach(function (g) { days[g.d] = 1; });
    var dOf = function (t) { return t ? U.dayStr(new Date(t)) : null; };
    Object.keys(S.quests || {}).forEach(function (k0) { var q = S.quests[k0]; if (!/^starter-/.test(k0) && q.first) days[dOf(q.first)] = 1; }); Object.keys(S.tdone || {}).forEach(function (x) { if (S.tdone[x].done) days[dOf(S.tdone[x].t)] = 1; }); Object.keys(S.qsteps || {}).forEach(function (x) { if (S.qsteps[x].done) days[dOf(S.qsteps[x].t)] = 1; });
    days[t] = 1;
    return Object.keys(days).filter(function (d) { return d <= t && /^\d{4}-\d\d-\d\d$/.test(d); }).sort().reverse();
  };
  /* ---------- journal PDFs ---------- */
  // A whole Hilltop page as PDF blocks. full=false: the short version used in chapters, seasons and years.
  function pageBlocks(S, P, full, talk) { // 2.1.2: the short page (the long Hilltop page is archived in _archive/hilltop-page-2.1.1)
    var b = [], jp = (S.jpages || {})[P.day] || {}; function jt(f) { return jp[f] && jp[f].text ? jp[f].text : ''; }
    b.push({ t: full ? 'title' : 'h1', text: P.title.replace(/^Hilltop View: /, '') });
    if (P.cast) {
      var c = P.cast, X0 = AIU.iching.info(c.hex);
      b.push({ t: 'h2', text: 'I Ching: ' + c.hex + ' ' + c.name + ' - ' + c.theme });
      if (full && c.vals) b.push({ t: 'hex', vals: c.vals });
      if (X0 && X0.advice) b.push({ t: 'p', text: X0.advice });
    }
    var hl = [['How it went', jt('went')], ['Focus', jt('priorities')], ['Expected for tomorrow', jt('carry')]].filter(function (x) { return x[1]; });
    if (hl.length) { b.push({ t: 'h3', text: 'Daily Hilltop' }); hl.forEach(function (x) { b.push({ t: 'kv', k: x[0], v: x[1] }); }); }
    if (P.stories.length) { b.push({ t: 'h3', text: 'Entries' }); P.stories.slice().sort(function (x, y) { return x.t - y.t; }).forEach(function (e) { b.push({ t: 'small', text: (e.h || '') + (e.dn ? ' · ' + e.dn : '') }); b.push({ t: 'p', text: e.data.text }); }); }
    var tlg = PN.tileLog(S, P.day); if (tlg.length) { b.push({ t: 'h3', text: 'Tiles' }); tlg.forEach(function (x) { b.push({ t: 'li', text: U.hmStr(new Date(x.t)) + '  ' + x.text }); }); }
    var gl = G.dayLine(S, P.day); if (gl) b.push({ t: 'h3', text: 'Vitals' }, { t: 'p', text: gl });
    var mine = AIU.hilltop.FIELDS.map(function (f) { return f[0]; }).filter(function (f) { return f !== 'priorities' && f !== 'carry' && P.log[f] && P.log[f].edited; });
    if (mine.length) { b.push({ t: 'h3', text: 'Your notes' }); mine.forEach(function (f) { b.push({ t: 'kv', k: P.log[f].label, v: P.log[f].text }); }); }
    if (P.ai) { b.push({ t: 'h3', text: 'AI Hilltop View' }); b.push({ t: 'p', text: P.ai }); }
    if (talk && talk.length) { b.push({ t: 'h3', text: 'The day\'s log (conversation)' }); talk.forEach(function (e) { b.push({ t: 'small', text: (e.h || '') + '  ' + (e.type === 'say' ? 'You' : S.totemName) + ': ' + e.data.text }); }); }
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
  // 2.0: the journal pages for some days, as a document (the Settings exporter puts it together with the rest)
  PN.journalDoc = function (days, label) {
    var a = app(), months = {};
    days.forEach(function (d) { months[d.slice(0, 7)] = 1; });
    return Promise.all(Object.keys(months).map(function (m) { return a.chapter(m).catch(function () { return []; }); })).then(function (lists) {
      var evs = [].concat.apply([], lists), S = a.S, b = [{ t: 'title', text: 'Journal: ' + label }, { t: 'sub', text: S.totemName + ' · ' + days.length + ' page' + (days.length === 1 ? '' : 's') }], lastMo = '';
      days.slice().sort().forEach(function (d) {
        var mo = d.slice(0, 7);
        if (mo !== lastMo) { b.push({ t: 'h1', text: MONTHS[+mo.slice(5) - 1] + ' ' + mo.slice(0, 4) }); lastMo = mo; }
        var P = AIU.hilltop.page(S, d, K().pageOpts(a, d, d === today() ? null : evs));
        b = b.concat(pageBlocks(S, P, days.length === 1, null)); b.push({ t: 'hr' });
      });
      if (!days.length) b.push({ t: 'p', text: 'No pages in this range.' });
      return { title: 'Journal ' + label, blocks: b };
    });
  };
  PN.readingsDoc = function (S) { return readingsDoc(S); };
  PN.gabaDoc = function (S, mo) { return gabaDoc(S, mo); };
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
  PN.q21Next = function (S) { // 2.1.6: one mixed stream in Profile: personality either/or + what calms / stresses you
    var P = S.prefs || {}, n = PN.q21Today(S), took = S.ptype && S.ptype.answered >= 6, skip = app().local.offSkip || {}, now = app().trueNow();
    var fresh = function (q) { return skip[q.id] !== today(); };
    var pq = took ? AIU.persona.nextExtra(S) : null, gq = gabaOrder(S).filter(function (q) { return !P[q.id] && fresh(q); })[0] || null;
    if (!gq) gq = gabaOrder(S).filter(function (q) { return P[q.id] && P[q.id].v === 'skip' && now - P[q.id].t > 60 * 86400000 && fresh(q); })[0] || null; // a skip from months ago: ask once more
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
  // the calm / stress question in words ("Does walking outside calm you down?")
  PN.q21Ask = function (q) {
    var nm = '"' + q.item.replace(/ \/ /g, ' or ') + '"';
    return q.kind === 'stress' ? 'Does ' + nm + ' rev you up or stress you out?' : q.kind === 'calmfood' ? 'Do you like ' + nm + '? (a calming food)' : 'Does ' + nm + ' calm you down?';
  };
  // One question as a little card (Profile > knows you). Calm / stress ones only learn about you: no tiles, no logging.
  PN.q21Card = function (x, onDone, compact) {
    var k = K(), S = app().S, box = h('div', { cls: 'q21card' + (compact ? ' compact' : '') });
    function go(v) { PN.q21Answer(x, v).then(function () { if (onDone) onDone(); }); }
    box.appendChild(h('div', { cls: 'q21head' }, h('span', { cls: 'nicon', 'aria-hidden': 'true' }, ui.pix(x.type === 'gaba' ? 'leaf' : 'ask')), h('b', { text: 'Getting to know you' })));
    if (x.type === 'gaba') {
      box.appendChild(h('div', { cls: 'q21q' }, PN.q21Ask(x.q)));
      if (x.q.kind === 'stress') box.appendChild(h('p', { cls: 'small', text: 'Just so ' + S.totemName + ' knows. Stressors are noted, never counted against you.' }));
      else box.appendChild(h('p', { cls: 'small', text: 'Yes: ' + S.totemName + '\'s Vitals check-ins ask about it first.' }));
      box.appendChild(h('div', { cls: 'row wrap' }, k.btn('Yes', function () { go('yes'); }, 'primary'), k.btn('No', function () { go('no'); }, 'primary'), k.btn('Skip', function () { go('skip'); }, 'ghost')));
    } else {
      box.appendChild(h('div', { cls: 'q21q' }, x.q.q + '...'));
      box.appendChild(h('div', { cls: 'row wrap' }, k.btn(Wd.cap(x.q.a), function () { go('a'); }, 'primary'), k.btn(Wd.cap(x.q.b), function () { go('b'); }, 'primary'), k.btn('Skip', function () { go('skip'); }, 'ghost')));
    }
    return box;
  };
  // 2.1.9: every answer you've given Aiu, so you can change one you tapped by mistake
  PN.answersInto = function (into) {
    var a = app(), S = a.S, k = K(), P = AIU.persona, quiz = (S.traits || {}).quiz || {}, Pf = S.prefs || {}, rows = [];
    P.allQuestions().forEach(function (q) { if (quiz[q.id]) rows.push({ t: quiz[q.id].t || 0, x: { type: 'persona', q: q }, v: quiz[q.id].v }); });
    G.questions().forEach(function (q) { if (Pf[q.id]) rows.push({ t: Pf[q.id].t || 0, x: { type: 'gaba', q: q }, v: Pf[q.id].v }); });
    rows.sort(function (x, y) { return y.t - x.t; });
    if (!rows.length) { into.appendChild(h('p', { cls: 'small', text: 'Nothing answered yet.' })); return; }
    into.appendChild(h('p', { cls: 'small', text: 'Newest first. Tap a different answer to change it.' }));
    rows.forEach(function (r) {
      var x = r.x, opts = x.type === 'persona' ? [['a', Wd.cap(x.q.a), 1], ['b', Wd.cap(x.q.b), -1], ['skip', 'Skip', 0]] : [['yes', 'Yes', 'yes'], ['no', 'No', 'no'], ['skip', 'Skip', 'skip']];
      into.appendChild(h('div', { cls: 'item col ansrow' }, h('span', { text: x.type === 'persona' ? x.q.q + '...' : PN.q21Ask(x.q) }),
        h('div', { cls: 'row wrap' }, opts.map(function (o) { var on = r.v === o[2]; return k.btn(o[1], function () { if (on) return; PN.q21Answer(x, o[0]).then(function () { ui.renderPanel(true); }); }, 'mini' + (on ? ' on' : ' ghost')); }))));
    });
  };
  // what you've told Aiu: calmers, calming foods, stressors (noted only), not for you. Change flips the answer.
  PN.calmLists = function (into) {
    var a = app(), S = a.S, k = K(), Pf = S.prefs || {}, any = false;
    function list(title, kind, v, note) {
      var items = G.questions().filter(function (q) { return q.kind === kind && Pf[q.id] && Pf[q.id].v === v; });
      if (!items.length) return;
      any = true;
      into.appendChild(h('p', { cls: 'pipsub', text: title + ' (' + items.length + ')' }));
      if (note) into.appendChild(h('p', { cls: 'small', text: note }));
      items.forEach(function (q) {
        into.appendChild(h('div', { cls: 'piprow' }, h('span', { cls: 'grow1', text: q.item }), h('button', { type: 'button', cls: 'pipx', text: 'Change', 'aria-label': 'Change your answer for ' + q.item, onclick: function () { a.addEvents([{ type: 'pref', data: { item: q.id, kind: q.kind, v: v === 'yes' ? 'no' : 'yes' } }], true).then(function () { ui.renderPanel(true); }); } })));
      });
    }
    list('Calms you', 'calm', 'yes'); list('Calming foods you like', 'calmfood', 'yes');
    list('Stresses you', 'stress', 'yes', 'Noted, not counted: ' + S.totemName + ' just knows to go easy.');
    list('Not for you', 'calm', 'no', 'Vitals check-ins won\'t ask about these.');
    if (!any) into.appendChild(h('p', { cls: 'small', text: 'Answer the "getting to know you" questions above and your calmers and stressors show up here.' }));
  };

  /* ---------- GABA ---------- */
  PN.mixedAsk = function (item) { mixedAsk(item); };
  PN.openVitals = function () { ui.vitalsPop(); }; // 2.1.13: a pop-up over wherever you are (the drone, the leaf bar)
  function mixedAsk(item) {
    var a = app(), k = K(), s, q = G.MIXED_QUESTIONS[U.hash32(item + today()) % G.MIXED_QUESTIONS.length];
    s = k.sheet(item, [h('p', { text: item + ' can go either way. ' + q }), h('div', { cls: 'row wrap' },
      k.btn('It calmed me', function () { s.remove(); a.logGaba('calm', item, 5); }, 'primary'), k.btn('It revved me up', function () { s.remove(); a.logGaba('stress', item, 0); K().snack('Noted.'); }), k.btn('Skip', function () { s.remove(); }, 'ghost'))]);
  }
  function gabaDoc(S, mo) { // 2.1.6: the Vitals check-ins for a month (stressors you noted are listed, not counted)
    var days = {}, V = AIU.vitals, b = [{ t: 'title', text: 'Vitals log - ' + PN.monthName(mo) }, { t: 'sub', text: S.totemName + ' · ' + G.DISCLAIMER }];
    var vs = V.state(S); b.push({ t: 'kv', k: 'Vitals now', v: vs.avg + '% (' + V.word(vs) + ')' });
    G.entries(S).filter(function (g) { return g.d.slice(0, 7) === mo; }).forEach(function (g) { (days[g.d] = days[g.d] || []).push(g); });
    Object.keys(days).sort().forEach(function (d) {
      b.push({ t: 'h3', text: Wd.cap(U.fmtDay(d)) + ((S.vitals || {})[d] ? ' - Vitals full (+10)' : '') });
      days[d].forEach(function (g) { b.push({ t: 'li', text: U.hmStr(new Date(g.t)) + '  ' + g.item + '  ' + (g.kind === 'calm' ? (V.part(C.vitSys(g)) || {}).name || '' : '(noted)') + (g.note && g.note !== 'check-in' ? ' - ' + g.note : '') }); });
    });
    if (!Object.keys(days).length) b.push({ t: 'p', text: 'Nothing checked in this month.' });
    return { title: 'Vitals ' + PN.monthName(mo), blocks: b };
  }

  /* =====================================================================================
     I CHING: today's cast, the time it's cast each day, and every past reading.
     ===================================================================================== */
  PN.ichingActions = function (S) { var a = app(), rv = (S.reviews || {})[today()]; return [rv && !a.dev.mute ? K().btn('Read aloud', function (e) { var on = a.readAloud(rv.text); e.target.textContent = on ? 'Stop' : 'Read aloud'; }, 'mini') : null, null]; };
  PN.ichingView = function () {
    var a = app(), S = a.S, k = K(), p, d = today(), rv = (S.reviews || {})[d];
    p = body();
    p.appendChild(h('div', { cls: 'row spread' }, k.btn('< Today', function () { st.jview = null; ui.renderPanel(true); }, 'mini ghost')));
    if (!S.hatched) { p.appendChild(k.empty('Hatch your egg first.')); return; }
    if (rv) {
      var X = AIU.iching.info(rv.hex), R = rv.rel && rv.rel !== rv.hex ? AIU.iching.info(rv.rel) : null;
      p.appendChild(h('div', { cls: 'row jcast' }, k.hexPic(rv.vals, rv.hex), h('div', { cls: 'col' },
        h('b', { text: 'Today: ' + rv.hex + '. ' + X.name + ' (' + X.pinyin + ')' }), h('span', { text: 'Theme: ' + X.theme }),
        h('span', { cls: 'small', text: (rv.moving && rv.moving.length ? 'Changing line' + (rv.moving.length > 1 ? 's ' : ' ') + rv.moving.join(', ') : 'No changing lines') + (R ? ' -> ' + R.n + ' ' + R.name : '') }))));
      p.appendChild(h('div', { cls: 'jsec' }, h('h4', { text: 'Hilltop View' }), h('p', { cls: 'jval', text: rv.text })));
      p.appendChild(h('div', { cls: 'jsec' }, h('p', null, h('b', { text: 'Traditional principle: ' }), X.meaning), h('p', null, h('b', { text: 'Modern interpretation: ' }), X.modern), h('p', null, h('b', { text: 'Hilltop application: ' }), X.advice),
        X.principle ? h('blockquote', { cls: 'jprinciple', text: X.principle }) : null));
    } else {
      p.appendChild(h('p', { text: 'Today\'s coins haven\'t been tossed yet.' }));
      p.appendChild(h('p', { cls: 'small', text: 'Cast it from the Daily Hilltop (Log > Today).' })); // 2.1.5: one cast button
    }
    // 2.1.10: no daily cast time: you cast it yourself from Log > Today
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
