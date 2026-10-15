/* AIU TOTEM 2.2.0 - the Log: your journal, written over time into a book (an autobiography, with you as the author).
   2.3.0: two tabs.
   Today  - today's I Ching (one word, the number and name, the changing lines, and folded: translation, interpretation,
            suggestions), your entries for today (or any day before: "Add to another day"), what got done, past readings.
   Book   - your story (cover, read the whole book), search, the outline: books (years) > chapters (months) > pages
            (days), the glossary (the words and names you use most) and your life so far, summed up.
   The I Ching is stamped on every day, written in or not. Tiles go in as plain sentences ("Sam washed the dog").
   Calm things (Vitals) stay in Vitals: the journal only counts them. Adding to an old day updates everything that reads it. */
(function () {
  'use strict';
  var U = AIU.util, C = AIU.core, M = AIU.mind, Wd = AIU.words, h = U.h, ui = AIU.ui, PN = AIU.panels, G = AIU.gaba;
  function app() { return AIU.app; }
  function K() { return ui.k; }
  function body() { return K().clear(ui.els.panel); }
  var today = PN.today;
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var st = PN.state;

  /* ---------- the menu ---------- */
  var JSUBS = [['write', 'Today'], ['book', 'Book']];
  var OLD = { today: 'write', journal: 'book', pages: 'book', profiles: 'write', me: 'write', self: 'write', words: 'book', story: 'book', iching: 'write' }; // 2.3.0: Glossary and My story live in Book; the I Ching in Today
  function sentences2(t) { var m = String(t || '').match(/[^.!?]+[.!?]+/g) || [t]; return m.slice(0, 2).join(' ').trim(); }
  PN.journal = function () {
    var a = app(), S = a.S, k = K(), cur = ui.sub.journal || 'write';
    PN.todaySpeech = null;
    cur = OLD[cur] || cur;
    if (!JSUBS.some(function (x) { return x[0] === cur; })) cur = 'write';
    if (st.jview === 'iching') { cur = 'write'; st.jview = null; }
    ui.sub.journal = cur;
    function onSub(v) { st.jday = null; st.jbook = null; ui.go('journal', v); }
    var acts = [k.btn('+ New entry', function () { ui.journalSheet(null, { day: st.jday && st.jday !== today() ? st.jday : null }); }, 'mini primary')];
    ui.panelHead('Log', acts, JSUBS, cur, onSub);
    if (st.jday) return dayPage(st.jday, cur);
    if (cur === 'book') return st.jbook ? bookReader() : bookView();
    writeView();
  };
  PN.openDay = function (d, from) { st.jday = d; ui.sub.journal = from || 'book'; ui.go('journal', from || 'book'); st.jday = d; ui.renderPanel(true); ui.toPanel(); };

  /* ---------- the I Ching stamp (shown only after Aiu has tossed the coins on this device) ---------- */
  PN.readingFor = function (S, d) { var a = app(), rv = (S.reviews || {})[d]; if (!rv) return null; return a.readingShown && !a.readingShown(d) ? null : rv; };
  function stampLine(rv) {
    var I = AIU.iching, X = I.info(rv.hex), R = rv.rel && rv.rel !== rv.hex ? I.info(rv.rel) : null;
    return X.theme + ' · #' + rv.hex + ' ' + X.name + ((rv.moving || []).length ? ' · changing line' + (rv.moving.length > 1 ? 's ' : ' ') + rv.moving.join(', ') : ' · no changing lines') + (R ? ' → #' + R.n + ' ' + R.name : '');
  }
  PN.stampLine = stampLine;
  function stampCard(S, d, compact) {
    var a = app(), k = K(), rv = PN.readingFor(S, d), I = AIU.iching;
    if (!rv) {
      var castingNow = a.casting && a.casting.day === d;
      return h('div', { cls: 'jstamp none' }, ui.pix('yin'), h('span', { cls: 'small', text: castingNow ? S.totemName + ' is tossing the coins right now...' : d === today() ? (S.hatched ? S.totemName + ' tosses today\'s coins in the yard as soon as he\'s free (every night at midnight, or the next time you open Aiu). Watch for it.' : 'The first reading comes a few moments after the egg hatches.') : 'No reading this day.' }));
    }
    var X = I.info(rv.hex);
    return h('div', { cls: 'jstamp' + (compact ? ' compact' : '') }, k.hexPic(rv.vals, rv.hex),
      h('div', { cls: 'col' }, h('b', { cls: 'jword', text: X.theme }), h('span', { text: stampLine(rv).replace(/^[^·]+· /, '') }), compact ? null : h('span', { cls: 'small', text: X.advice })),
      compact ? null : k.btn('Open', function () { st.jday = null; ui.go('journal', 'write'); ui.toPanel(); }, 'mini'));
  }
  PN.stampCard = stampCard;

  /* ---------- Today ---------- */
  var PROMPTS = ['What went well today?', 'What\'s on your mind right now?', 'What did you get done, big or small?', 'What would make tomorrow easier?', 'Who did you spend time with, and how was it?', 'What\'s one thing you want to remember about today?', 'What\'s bugging you? Get it out of your head.', 'What are you looking forward to?', 'What did you learn today?', 'How\'s your body feeling: tired, rested, sore, wired?'];
  function prompts(S, d) {
    var rv = PN.readingFor(S, d), X = rv ? AIU.iching.info(rv.hex) : null, hr = U.wall(new Date(app().trueNow())).getHours(), out = [];
    if (hr < 12) out.push('What\'s on your mind this morning?'); else if (hr >= 18) out.push('How did today go?');
    if (X) out.push('Today\'s word is "' + X.theme.toLowerCase() + '". Where does that show up for you?');
    var start = U.hash32(d) % PROMPTS.length;
    for (var i = 0; i < PROMPTS.length; i++) out.push(PROMPTS[(start + i) % PROMPTS.length]);
    return out;
  }
  function entriesOn(S, d) { var hid = S.jhide || {}; return (S.journal || []).filter(function (e) { return e.d === d && !(hid[e.id] && hid[e.id].v); }); }
  function writeView() {
    var a = app(), S = a.S, k = K(), p = body(), d = today(), mine = entriesOn(S, d);
    p.appendChild(h('h3', { cls: 'jtitle', text: Wd.cap(PN.nice(d)) }));
    PN.ichingInto(p); // 2.3.0: the I Ching lives on Today
    var ps = prompts(S, d), pi = (st.jpi || 0) % ps.length, q = h('p', { cls: 'jprompt', text: ps[pi] });
    var ents = h('div'); mine.slice().reverse().forEach(function (e) { ents.appendChild(k.journalCard(a, e)); });
    var other = k.inp({ type: 'date', value: U.addDays(d, -1), max: d, 'aria-label': 'Another day' });
    p.appendChild(h('section', { cls: 'jsec' }, h('h4', { text: 'Today\'s entry' + (mine.length ? ' (' + mine.length + ')' : '') }), q,
      h('div', { cls: 'row wrap' },
        k.btn('Write', function () { ui.journalSheet(null, { prompt: q.textContent }); }, 'primary'),
        (function (b) { b.insertBefore(ui.pix('mic'), b.firstChild); return b; })(k.btn(' Talk it', function () { ui.journalSheet(null, { prompt: q.textContent, listen: true }); })),
        k.btn('Another question', function () { st.jpi = (pi + 1) % ps.length; q.textContent = ps[st.jpi]; }, 'ghost')),
      h('p', { cls: 'small', text: '80+ letters today grows ' + S.totemName + ' +10.' }), ents,
      k.acc('j-otherday', 'Add to another day', [h('p', { cls: 'small', text: 'Remembered something from before? Pick the day and write it there. Its page, the book and the summary update by themselves.' }),
        h('div', { cls: 'row' }, other, k.btn('Write on that day', function () { var v = other.value; if (!/^\d{4}-\d\d-\d\d$/.test(v) || v > d) return k.snack('Pick a day up to today.'); ui.journalSheet(null, { day: v === d ? null : v }); }, 'mini primary'))], false)));
    var tl = PN.tileLog(S, d), done = doneOn(S, d);
    p.appendChild(h('section', { cls: 'jsec' }, h('h4', { text: 'What got done today' }),
      tl.length || done.length ? h('ul', { cls: 'tilelog' }, tl.map(function (x) { return h('li', { text: x.text }); }).concat(done.map(function (x) { return h('li', { text: x }); }))) : h('p', { cls: 'small', text: 'As you add and finish tiles they\'re written here as sentences, like "' + PN.who(S) + ' washed the dog."' })));
    p.appendChild(statsLine(S, d));
    PN.pastReadingsInto(p);
  }
  function statsLine(S, d) {
    var ent = entriesOn(S, d).length, tl = PN.tileLog(S, d).filter(function (x) { return x.done; }).length, calm = G.day(S, d).filter(function (g) { return g.kind === 'calm'; });
    var names = {}; calm.forEach(function (g) { names[g.item] = 1; });
    return h('p', { cls: 'small jstats', text: 'This day: ' + plural(ent, 'entry', 'entries') + ' · ' + plural(tl, 'tile done', 'tiles done') + ' · ' + plural(Object.keys(names).length, 'calm thing', 'calm things') + ' (in Vitals)' });
  }

  /* ---------- tiles as journal sentences ---------- */
  var IRR = { buy: 'bought', go: 'went', take: 'took', make: 'made', do: 'did', get: 'got', pay: 'paid', feed: 'fed', write: 'wrote', eat: 'ate', drink: 'drank', run: 'ran', read: 'read', send: 'sent', bring: 'brought', build: 'built', sell: 'sold',
    find: 'found', give: 'gave', see: 'saw', meet: 'met', put: 'put', set: 'set', cut: 'cut', sweep: 'swept', sleep: 'slept', teach: 'taught', think: 'thought', catch: 'caught', swim: 'swam', ride: 'rode', drive: 'drove', begin: 'began',
    sing: 'sang', speak: 'spoke', wear: 'wore', hang: 'hung', lay: 'laid', leave: 'left', lend: 'lent', mow: 'mowed', shop: 'shopped', plan: 'planned', stop: 'stopped', prep: 'prepped', mop: 'mopped', scrub: 'scrubbed', chop: 'chopped',
    drop: 'dropped', jog: 'jogged', plug: 'plugged', hug: 'hugged', grind: 'ground', fly: 'flew', grow: 'grew', throw: 'threw', draw: 'drew', sit: 'sat', stand: 'stood', win: 'won', fall: 'fell', keep: 'kept', spend: 'spent' };
  var VERB = /^(wash|clean|call|brush|walk|fix|change|check|finish|water|cook|bake|paint|print|order|email|text|organize|organise|sort|tidy|vacuum|dust|repair|replace|install|update|file|book|schedule|visit|study|practice|practise|work|exercise|stretch|fold|load|unload|empty|fill|pick|plant|weed|rake|trim|charge|post|upload|download|research|review|start|return|renew|cancel|mail|ship|pack|unpack|move|wrap|sand|glue|sew|knit|wipe|polish|recycle|sharpen|measure|test|edit|record|mix|listen|watch|play|learn|help|answer|ask|invite|thank|open|close|wake|bathe|shower|floss|clip|groom|cook|clear|collect|gather|deliver|finish|design|model|draft|sketch|prune|harvest|mulch|till|stack|split|haul|tune|oil|grease|rotate|inflate|jump|vent|seal|caulk|patch|scan|backup|journal)$/i;
  function past(w) { var l = w.toLowerCase(); if (IRR[l]) return IRR[l]; if (/e$/.test(l)) return l + 'd'; if (/[^aeiou]y$/.test(l)) return l.slice(0, -1) + 'ied'; return l + 'ed'; }
  PN.who = function (S) { var n = (S && S.callMe && S.callMe !== 'friend') ? S.callMe : 'You'; return Wd.cap(n); };
  function their(S) { var p = C.setting(S, 'pronoun', 'they'); return p === 'he' ? 'his' : p === 'she' ? 'her' : 'their'; }
  PN.didText = function (S, title) { // "Wash the dog" -> "Sam washed the dog."  "Shopping list" -> "Sam finished his shopping list."
    var t = String(title || '').trim(), w = t.split(/\s+/), first = w[0] || '';
    if (VERB.test(first) || IRR[first.toLowerCase()]) return PN.who(S) + ' ' + past(first) + (w.length > 1 ? ' ' + w.slice(1).join(' ') : '') + '.';
    return PN.who(S) + ' finished ' + their(S) + ' ' + (/^[A-Z][a-z]/.test(t) && !/^[A-Z][a-z]+ [A-Z]/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t) + '.';
  };
  // What happened to your tiles on a day, as sentences: [{t, text, done}]
  var TFIELD = { when: 'when', who: 'who', dur: 'how long', status: 'status', acct: 'account card' };
  PN.tileLog = function (S, day) {
    var T = AIU.tiles, out = [], dayOf = function (t) { return U.dayStr(new Date(t)); }, c24 = K().c24(), nm = PN.who(S), SL = {}; (T ? T.STATUS : []).forEach(function (x) { SL[x[0]] = x[1]; });
    Object.keys(S.quests || {}).forEach(function (k0) {
      var q = S.quests[k0]; if (!q.title) return;
      var first = q.first || 0, born = dayOf(first) === day, starter = /^starter-/.test(k0);
      if (born && !starter) out.push({ t: first, text: nm + ' added a new tile: ' + q.title + '.' });
      var changed = {}, ct = 0;
      var fin = Object.keys(S.tdone || {}).filter(function (tk) { return tk.indexOf(k0 + '|') === 0; }).map(function (tk) { return S.tdone[tk].t; });
      var nearFinish = function (t) { return fin.some(function (x) { return Math.abs(x - t) < 600; }); };
      Object.keys(q.tileM || {}).forEach(function (f) { var m = q.tileM[f]; if (m && dayOf(m.t) === day && m.t - first > 3000 && TFIELD[f] && !nearFinish(m.t) && !(f === 'status' && /^(done|doing)$/.test(q.tile.status))) { changed[f] = 1; ct = Math.max(ct, m.t); } });
      if (q.setM && dayOf(q.setM.t) === day && q.setM.t - first > 3000 && !nearFinish(q.setM.t)) { changed.steps = 1; ct = Math.max(ct, q.setM.t); }
      var cf = Object.keys(changed);
      if (cf.length && !starter) out.push({ t: ct, text: nm + ' changed ' + q.title + ' (' + cf.map(function (f) { var v = f === 'when' && T ? T.whenText(q, c24) : f === 'status' ? (SL[q.tile.status] || q.tile.status) : f === 'steps' ? '' : (q.tile[f] && f !== 'acct' ? String(q.tile[f]) : ''); return (f === 'steps' ? 'its steps' : TFIELD[f]) + (v ? ': ' + v : ''); }).join(', ') + ').' });
      (q.steps || []).forEach(function (sp) { var x = (S.qsteps || {})[k0 + '|' + sp.id]; if (x && x.done && dayOf(x.t) === day && !starter) out.push({ t: x.t, text: nm + ' checked off "' + sp.title.replace(/\s*\(.*\)$/, '') + '" (' + q.title + ').' }); });
      Object.keys(S.tdone || {}).forEach(function (tk) {
        var r = S.tdone[tk]; if (tk.indexOf(k0 + '|') !== 0 || !r.done || dayOf(r.t) !== day) return;
        var bought = (r.items || []).filter(function (x) { return !/^example:/i.test(x); });
        out.push({ t: r.t, done: true, text: r.items ? nm + ' went shopping' + (bought.length ? ' and got ' + list3(bought.slice(0, 8)) + (bought.length > 8 ? ' and more' : '') : '') + ' (' + q.title + ').' : PN.didText(S, q.title) });
      });
      if (q.stateM && dayOf(q.stateM.t) === day && (q.state === 'dropped' || q.state === 'deleted') && !starter) out.push({ t: q.stateM.t, text: nm + (q.state === 'dropped' ? ' archived ' : ' deleted ') + q.title + '.' });
    });
    return out.sort(function (x, y) { return x.t - y.t; });
  };
  function doneOn(S, day) { // checked list items and reminders done that day
    var out = [], dayOf = function (t) { return U.dayStr(new Date(t)); }, nm = PN.who(S);
    Object.keys(S.lists || {}).forEach(function (l) { var L = S.lists[l]; Object.keys(L).forEach(function (k0) { var r = L[k0]; if (!r.removed && r.done && r.doneM && dayOf(r.doneM.t) === day && !/^example:/i.test(r.item)) out.push(nm + ' checked off ' + r.item + '.'); }); });
    Object.keys(S.done || {}).forEach(function (k0) { if (k0.slice(-10) === day) { var t = S.tasks[k0.slice(0, -11)]; if (!t || /^tile-/.test(k0)) return; out.push(PN.didText(S, t.title)); } });
    return out;
  }
  PN.doneOn = doneOn;

  /* ---------- words, the summary and search ---------- */
  var STOP = {};
  ('a about above after again all also am an and any are as at be because been before being below between both but by can could did do does doing down during each few for from further had has have having he her here hers him his how i if in into is it its just like me more most my no nor not now of off on once only or other our out over own really same she should so some still such than that the their them then there these they this those through to too under until up us very was we were what when where which while who why will with would you your yours im ive dont didnt cant got get gets going go went today yesterday tomorrow day days time thing things lot much one two three back well good bad make made need want lets let thats its it\'s i\'m i\'ve don\'t didn\'t can\'t').split(' ').forEach(function (w) { STOP[w] = 1; });
  function words(text) { return String(text || '').toLowerCase().replace(/[’']/g, '').match(/[a-z][a-z0-9-]{2,}/g) || []; }
  function entries(S) { var hid = S.jhide || {}; return (S.journal || []).filter(function (e) { return !(hid[e.id] && hid[e.id].v); }); }
  // every entry you ever wrote (the engine keeps only the newest 40 in memory; the rest come from this device's storage)
  var allMemo = { k: '', v: null };
  PN.allEntries = function () {
    var a = app(), S = a.S, key = a.pid + '|' + (a.E ? a.E.events : 0);
    if (allMemo.k === key && allMemo.v) return Promise.resolve(allMemo.v);
    var months = Object.keys(S.lib || {}).filter(function (m) { var D = S.lib[m].days; return Object.keys(D).some(function (d) { return D[d].journal; }); }).sort();
    return Promise.all(months.map(function (m) { return a.chapter(m).catch(function () { return []; }); })).then(function (lists) {
      var seen = {}, out = [];
      [].concat.apply([], lists).concat(entries(S)).forEach(function (e) { if (e.type === 'journal' && !seen[e.id]) { seen[e.id] = 1; out.push(e); } });
      out.sort(C.cmpT); allMemo = { k: key, v: out }; return out;
    });
  };
  PN.wordCounts = function (S, since, list) {
    var c = {}, disp = {};
    (list || entries(S)).forEach(function (e) {
      if (since && e.d < since) return;
      var raw = String((e.data && e.data.text) || ''), seen = {};
      words(raw).forEach(function (w) { if (STOP[w] || /^\d/.test(w) || seen[w]) return; seen[w] = 1; c[w] = (c[w] || 0) + 1; });
      (raw.match(/[a-z,;]\s+[A-Z][a-z]{2,}\b/g) || []).forEach(function (n) { n = n.replace(/^[a-z,;]\s+/, ''); disp[n.toLowerCase()] = n; });
    });
    return Object.keys(c).map(function (w) { return { w: disp[w] || w, n: c[w], name: !!disp[w] }; }).sort(function (x, y) { return y.n - x.n || (x.w < y.w ? -1 : 1); });
  };
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }
  function list3(a) { return a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
  PN.plural = plural; PN.list3 = list3;
  // A summary of the whole journal, rebuilt from what's in it every time it changes
  var sumMemo = { S: null, v: null };
  PN.journalSummary = function (S, allE) {
    if (sumMemo.S === S && !allE) return sumMemo.v;
    var t = today(), I = AIU.iching, T = AIU.tiles, out = [], E = allE || entries(S), days = PN.allDays(S).slice().sort();
    var wordsN = 0, edays = {}; E.forEach(function (e) { wordsN += words(e.data && e.data.text).length; edays[e.d] = 1; });
    var streak = 0, x = edays[t] ? t : U.addDays(t, -1); while (edays[x]) { streak++; x = U.addDays(x, -1); }
    var best = 0, run = 0, prev = null; Object.keys(edays).sort().forEach(function (d) { run = prev && U.addDays(prev, 1) === d ? run + 1 : 1; best = Math.max(best, run); prev = d; });
    var lastE = Object.keys(edays).sort().pop();
    if (!days.length) { sumMemo = { S: S, v: [] }; return []; }
    out.push({ h: 'Overview', p: 'Your book runs from ' + PN.nice(days[0]) + ' to ' + (days[days.length - 1] === t ? 'today' : PN.nice(days[days.length - 1])) + ': ' + plural(days.length, 'page') + ', ' + plural(E.length, 'entry', 'entries') + (wordsN ? ' (about ' + wordsN.toLocaleString() + ' words)' : '') + '. ' +
      (streak >= 2 ? 'You\'ve written ' + streak + ' days in a row' + (best > streak ? ' (your best run is ' + best + ')' : '') + '.' : lastE ? (lastE === t ? 'You wrote today.' : 'Your last entry was ' + U.fmtDay(lastE) + '.') + (best >= 3 ? ' Your best run is ' + best + ' days.' : '') : 'No written entries yet: the pages so far come from readings and tiles.') });
    var rk = Object.keys(S.reviews || {}).sort();
    if (rk.length) {
      var cnt = {}, modes = {}, mov = 0, recent = rk.slice(-7);
      rk.forEach(function (d) { var rv = S.reviews[d], X = I.info(rv.hex); if (!X) return; cnt[rv.hex] = (cnt[rv.hex] || 0) + 1; modes[X.mode] = (modes[X.mode] || 0) + 1; if (rv.moving && rv.moving.length) mov++; });
      var top = Object.keys(cnt).sort(function (a0, b0) { return cnt[b0] - cnt[a0]; }), rep0 = top.filter(function (n) { return cnt[n] > 1; });
      var themes = recent.map(function (d) { var X = I.info(S.reviews[d].hex); return X ? X.theme : ''; }).filter(Boolean);
      var tm = Object.keys(modes).sort(function (a0, b0) { return modes[b0] - modes[a0]; })[0], X0 = I.info(+top[0]);
      var p1 = plural(rk.length, 'reading') + ' so far. ' + (rep0.length ? 'Coming back again and again: ' + list3(rep0.slice(0, 3).map(function (n) { var X = I.info(+n); return '#' + n + ' ' + X.name + ' (' + cnt[n] + ' times)'; })) + '. ' : '') +
        'Lately the words are ' + list3(themes.slice(-4).reverse()) + '. The readings lean toward "' + (I.MODES[tm] ? I.MODES[tm].label : tm) + '"' + (mov ? ', and ' + Math.round(mov / rk.length * 100) + '% had changing lines' : '') + '.';
      if (rep0.length && X0) p1 += ' ' + X0.name + ' keeps showing up: ' + X0.advice;
      out.push({ h: 'I Ching pattern', p: p1 });
    }
    var all = PN.wordCounts(S, null, E).filter(function (w) { return w.n >= 2; }), wk = PN.wordCounts(S, U.addDays(t, -6), E), allMap = {}; all.forEach(function (w) { allMap[w.w.toLowerCase()] = w.n; });
    if (all.length) {
      var fresh = wk.filter(function (w) { return (allMap[w.w.toLowerCase()] || 0) <= w.n && w.n >= 1; }).slice(0, 4).map(function (w) { return w.w; });
      out.push({ h: 'What you write about', p: 'You come back to ' + list3(all.slice(0, 6).map(function (w) { return w.w + ' (' + w.n + ')'; })) + ' the most.' + (fresh.length && E.length > 3 ? ' New this week: ' + list3(fresh) + '.' : '') });
    }
    var since = new Date(U.dayToDate(U.addDays(t, -6))).getTime(), fin = {}, finAll = 0;
    Object.keys(S.tdone || {}).forEach(function (k0) { var r = S.tdone[k0], q = S.quests[k0.split('|')[0]]; if (r && r.done && q && !(T && T.isStarter(q))) { finAll++; if (r.t >= since) fin[q.title] = 1; } });
    var finL = Object.keys(fin), p3 = [];
    if (finL.length) p3.push('This week: ' + list3(finL.slice(0, 5).map(function (x) { return PN.didText(S, x).replace(/^\S+\s/, '').replace(/\.$/, ''); })) + (finL.length > 5 ? ' and ' + (finL.length - 5) + ' more' : '') + '.');
    if (finAll) p3.push(plural(finAll, 'tile', 'tiles') + ' finished in all.');
    if (p3.length) out.push({ h: 'Done', p: p3.join(' ') });
    var hu = [];
    if (T) { var od = T.list(S).filter(function (q) { var w = T.tile(q).when || {}; return !T.isStarter(q) && w.t === 'once' && w.date && w.date < t && q.state !== 'done' && !T.doneNow(S, q, t); }).map(function (q) { return q.title; }); if (od.length) hu.push('Still waiting: ' + list3(od.slice(0, 3)) + (od.length > 3 ? ' and more' : '') + '.'); }
    if (lastE && lastE < U.addDays(t, -2)) hu.push('It\'s been a few days since you wrote. Even one line helps.');
    if (hu.length) out.push({ h: 'Heads up', p: hu.join(' ') });
    if (!allE) sumMemo = { S: S, v: out };
    return out;
  };
  // search: every word you type has to be on that day (entries, your notes, the reading, tile sentences)
  function searchDays(S, q, allE) {
    var terms = String(q || '').toLowerCase().split(/\s+/).filter(Boolean), byDay = {}, I = AIU.iching;
    if (!terms.length) return [];
    function add(d, text, kind) { if (!d || !text) return; (byDay[d] = byDay[d] || []).push({ text: String(text), kind: kind }); }
    (allE || entries(S)).forEach(function (e) { add(e.d, e.data && e.data.text, 'entry'); });
    Object.keys(S.jpages || {}).forEach(function (d) { var pg = S.jpages[d]; Object.keys(pg).forEach(function (f) { if (pg[f] && pg[f].text) add(d, pg[f].text, 'note'); }); });
    Object.keys(S.reviews || {}).forEach(function (d) { var rv = PN.readingFor(S, d), X = rv && I.info(rv.hex); if (X) add(d, '#' + rv.hex + ' ' + X.name + ' ' + X.theme, 'I Ching'); });
    var tdays = {}; Object.keys(S.tdone || {}).forEach(function (k0) { if (S.tdone[k0].done) tdays[U.dayStr(new Date(S.tdone[k0].t))] = 1; }); Object.keys(S.quests || {}).forEach(function (k0) { if (S.quests[k0].first) tdays[U.dayStr(new Date(S.quests[k0].first))] = 1; });
    Object.keys(tdays).forEach(function (d) { PN.tileLog(S, d).forEach(function (x) { add(d, x.text, 'tiles'); }); });
    var hits = [];
    Object.keys(byDay).forEach(function (d) {
      var blob = byDay[d].map(function (x) { return x.text; }).join(' \n ').toLowerCase();
      if (!terms.every(function (tm) { return blob.indexOf(tm) >= 0; })) return;
      var score = function (x) { var lt = x.text.toLowerCase(); return terms.filter(function (tm) { return lt.indexOf(tm) >= 0; }).length; }, bestX = byDay[d].slice().sort(function (x, y) { return score(y) - score(x); })[0], tx = bestX.text, at = tx.toLowerCase().indexOf(terms[0]);
      var snip = at > 40 ? '...' + tx.slice(at - 30, at + 80) : tx.slice(0, 110); if (tx.length > (at > 40 ? at + 80 : 110)) snip += '...';
      hits.push({ day: d, kind: bestX.kind, text: snip });
    });
    return hits.sort(function (x, y) { return x.day < y.day ? 1 : -1; });
  }
  function searchBox(S, p) {
    var k = K(), q = k.inp({ type: 'search', placeholder: 'Search your book: groceries, birthday, truck...', 'aria-label': 'Search your journal', value: st.jq || '', enterkeyhint: 'search' }), out = h('div', { cls: 'results', 'aria-live': 'polite' });
    function run() {
      var v = q.value.trim(); st.jq = v; k.clear(out); if (!v) return;
      out.appendChild(h('p', { cls: 'small', text: 'Looking...' }));
      PN.allEntries().then(function (allE) {
        var hits = searchDays(S, v, allE); k.clear(out);
        out.appendChild(h('p', { cls: 'small', text: hits.length ? plural(hits.length, 'page') + ' with "' + v + '"' : 'Nothing found for "' + v + '".' }));
        hits.slice(0, 60).forEach(function (x) { out.appendChild(h('button', { type: 'button', cls: 'item col linkish', onclick: function () { st.jday = x.day; ui.renderPanel(true); ui.toPanel(); } }, h('span', { cls: 'tag', text: U.fmtDay(x.day) + ' · ' + x.kind }), h('span', { text: x.text }))); });
      });
    }
    q.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); q.blur(); run(); } });
    q.addEventListener('search', run);
    p.appendChild(h('div', { cls: 'row jsearch' }, q, k.btn('Search', run, 'primary'), st.jq ? k.btn('Clear', function () { st.jq = ''; q.value = ''; k.clear(out); }, 'ghost') : null));
    p.appendChild(out); if (st.jq) run();
  }

  /* ---------- Book: the outline (years > months > days) ---------- */
  function monthWords(S, mo, n) { var ch = (S.lib || {})[mo]; return ch ? C.top(ch.words || {}, n || 3).filter(function (w) { return !STOP[w]; }) : []; }
  PN.chapterTitle = function (S, mo) { var w = monthWords(S, mo, 3); return MONTHS[+mo.slice(5) - 1] + ' ' + mo.slice(0, 4) + (w.length ? ': ' + w.join(', ') : ''); };
  function bookView() {
    var a = app(), S = a.S, k = K(), p = body();
    PN.bookSpeech = function () { var dd = PN.allDays(S), js1 = (S.journal || S.journals || []); var last = js1.length ? js1[js1.length - 1] : null; return 'Your book, ' + bookTitle(S) + ', by ' + author(S) + '. ' + (dd.length ? dd.length + ' page' + (dd.length === 1 ? '' : 's') + ' so far.' : 'Your first page starts today.') + (last ? ' Your latest entry: ' + String(last.data.text || '').split(/(?<=[.!?])\s+/).slice(0, 2).join(' ') : ''); }; // 2.4.0: the page reader
    storyHead(p);
    searchBox(S, p);
    var days = PN.allDays(S), years = {};
    days.forEach(function (d) { var y = d.slice(0, 4), m = d.slice(0, 7); years[y] = years[y] || {}; (years[y][m] = years[y][m] || []).push(d); });
    var ys = Object.keys(years).sort().reverse(), t = today();
    p.appendChild(h('h4', { cls: 'jhead', text: 'Your book' }));
    p.appendChild(h('p', { cls: 'small', text: 'Each year is a book, each month a chapter, each day a page. Tap a page to read it or add to it.' }));
    if (!ys.length) p.appendChild(K().empty('Your first page starts today.'));
    ys.forEach(function (y, yi) {
      var ms = Object.keys(years[y]).sort().reverse(), inner = h('div');
      ms.forEach(function (mo, mi) {
        var list = years[y][mo].slice().sort().reverse(), pg = h('div');
        list.forEach(function (d) { pg.appendChild(tocRow(S, d)); });
        inner.appendChild(k.acc('jm-' + mo, PN.chapterTitle(S, mo), [pg], yi === 0 && mi === 0, list.length));
      });
      var n = ms.reduce(function (s0, mo) { return s0 + years[y][mo].length; }, 0);
      p.appendChild(k.acc('jy-' + y, 'Book ' + y + (y === t.slice(0, 4) ? ' (this year)' : ''), [inner], yi === 0, n));
    });
    var gl = h('div'), lf = h('div');
    p.appendChild(k.acc('lib-glossary', 'Glossary: the words and names you use most', [gl], false));
    p.appendChild(k.acc('lib-story', 'Your life so far', [lf], false));
    wordsView(gl); storyView(lf);
    var hid = Object.keys(S.jhide || {}).filter(function (id) { return S.jhide[id].v; });
    if (hid.length) p.appendChild(k.acc('lib-hidden', 'Hidden entries', hid.slice(-40).reverse().map(function (id) {
      return h('div', { cls: 'item' }, h('span', { cls: 'ititle', text: 'Hidden ' + U.ago(S.jhide[id].t) }), k.btn('Bring back', function () { a.addEvents([{ type: 'line_hide', data: { ref: id, hidden: false } }]); }, 'mini'));
    }), false, hid.length));
  }
  function tocRow(S, d) {
    var rv = PN.readingFor(S, d), X = rv ? AIU.iching.info(rv.hex) : null;
    var ent = entriesOn(S, d), pg = (S.lib[d.slice(0, 7)] || { days: {} }).days[d] || {}, nE = Math.max(ent.length, pg.journal || 0), first = ent.length ? ent[ent.length - 1].data.text : '';
    var tn = PN.tileLog(S, d).length, bits = [X ? '#' + rv.hex + ' ' + X.theme : '', nE ? plural(nE, 'entry', 'entries') : '', tn ? plural(tn, 'tile line') : ''].filter(Boolean);
    return h('button', { type: 'button', cls: 'qrow dayrow', onclick: function () { st.jday = d; ui.renderPanel(true); ui.toPanel(); } },
      h('span', { cls: 'qrtitle', text: (d === today() ? 'Today · ' : '') + PN.nice(d) }),
      h('span', { cls: 'qrmeta', text: bits.join(' · ') || 'a quiet day' }),
      first ? h('span', { cls: 'qrsnip', text: first.length > 90 ? first.slice(0, 88) + '...' : first }) : null);
  }

  /* ---------- one page (a day) ---------- */
  function dayPage(d0, from) {
    var a = app(), S = a.S, k = K(), p = body();
    p.appendChild(h('div', { cls: 'row spread' }, k.btn(from === 'write' ? '< Today' : '< ' + (JSUBS.filter(function (x) { return x[0] === from; })[0] || ['', 'Book'])[1], function () { st.jday = null; ui.renderPanel(true); }, 'mini ghost'),
      h('span', { cls: 'row' }, k.btn('Older', function () { var all = PN.allDays(S), i = all.indexOf(d0); if (i >= 0 && i < all.length - 1) { st.jday = all[i + 1]; ui.renderPanel(true); } }, 'mini'),
        k.btn('Newer', function () { var all = PN.allDays(S), i = all.indexOf(d0); if (i > 0) { st.jday = all[i - 1]; ui.renderPanel(true); } }, 'mini'))));
    p.appendChild(h('h3', { cls: 'jtitle', text: (d0 === today() ? 'Today · ' : '') + Wd.cap(PN.nice(d0)) }));
    p.appendChild(h('p', { cls: 'small', text: 'Book ' + d0.slice(0, 4) + ' · ' + PN.chapterTitle(S, d0.slice(0, 7)) }));
    var pg = h('div', { cls: 'jpbody' });
    p.appendChild(pg); pg.appendChild(k.empty('Opening...'));
    function draw(evs) {
      k.clear(pg);
      pg.appendChild(stampCard(S, d0, true));
      var ents = (evs || []).filter(function (e) { return e.type === 'journal' && e.d === d0; });
      entriesOn(S, d0).forEach(function (e) { if (!ents.some(function (x) { return x.id === e.id; })) ents.push(e); });
      ents.sort(C.cmpT);
      var eb = h('div'); ents.forEach(function (e) { eb.appendChild(k.journalCard(a, e)); });
      pg.appendChild(h('section', { cls: 'jsec' }, h('h4', { text: 'Entries' }), ents.length ? eb : h('p', { cls: 'small', text: 'No entries this day yet.' }),
        k.btn(d0 === today() ? 'Write' : 'Add to this day', function () { ui.journalSheet(null, { day: d0 === today() ? null : d0 }); }, 'mini primary')));
      var tl = PN.tileLog(S, d0), done = doneOn(S, d0);
      if (tl.length || done.length) pg.appendChild(h('section', { cls: 'jsec' }, h('h4', { text: 'What got done' }), h('ul', { cls: 'tilelog' }, tl.map(function (x) { return h('li', { text: x.text }); }).concat(done.map(function (x) { return h('li', { text: x }); })))));
      var jp = (S.jpages || {})[d0] || {}, notes = Object.keys(jp).filter(function (f) { return jp[f] && jp[f].text; });
      if (notes.length) { var lab = {}; AIU.hilltop.FIELDS.forEach(function (f) { lab[f[0]] = f[1]; }); lab.went = 'How it went'; pg.appendChild(h('section', { cls: 'jsec' }, h('h4', { text: 'Your notes' }), h('dl', { cls: 'jkv' }, notes.map(function (f) { return [h('dt', { text: lab[f] || f }), h('dd', { text: jp[f].text })]; })))); }
      pg.appendChild(statsLine(S, d0));
      var rv = PN.readingFor(S, d0);
      st.readText = [PN.nice(d0) + '.'].concat(rv ? ['I Ching: ' + stampLine(rv) + '.'] : [], ents.map(function (e) { return e.data.text; }), tl.map(function (x) { return x.text; })).join(' ');
      var talk = (evs || []).filter(function (e) { return e.d === d0 && (e.type === 'say' || e.type === 'totem') && e.data && e.data.text; }).sort(C.cmpT);
      if (talk.length) {
        var tb = h('div', { cls: 'chat logday' });
        talk.forEach(function (e) { tb.appendChild(h('div', { cls: 'msg ' + (e.type === 'say' ? 'you' : 'totem') }, h('div', { cls: 'mtext', text: e.data.text }), h('div', { cls: 'mmeta', text: (e.type === 'say' ? 'You' : S.totemName) + ' · ' + U.fmtHm(e.h || '', k.c24()) }))); });
        pg.appendChild(k.acc('jp-talk', 'Conversation that day (from the old Log)', [tb], false, talk.length));
      }
    }
    a.chapter(d0.slice(0, 7)).then(draw, function () { draw([]); });
  }

  /* ---------- Glossary ---------- */
  function wordsView(p) {
    var a = app(), S = a.S, k = K(), f = k.inp({ type: 'search', placeholder: 'Find a word...', 'aria-label': 'Find a word in your glossary', value: st.gq || '' }), box = h('div');
    p.appendChild(h('p', { cls: 'small', text: 'The words, names and places you write about most, across your whole book. Tap one to find its pages.' }));
    p.appendChild(f); p.appendChild(box);
    box.appendChild(k.empty('Reading your book...'));
    PN.allEntries().then(function (allE) {
      var all = PN.wordCounts(S, null, allE).filter(function (w) { return w.n >= 1; });
      function draw() {
        k.clear(box); var q = f.value.trim().toLowerCase(); st.gq = f.value;
        var list = all.filter(function (w) { return !q || w.w.toLowerCase().indexOf(q) >= 0; }), names = list.filter(function (w) { return w.name; }).slice(0, 40), rest = list.filter(function (w) { return !w.name; }).slice(0, 120);
        if (!list.length) { box.appendChild(k.empty(all.length ? 'No words match.' : 'As you write, your words collect here.')); return; }
        function chips(arr) { return h('div', { cls: 'chips glossary' }, arr.map(function (w) { return k.btn(w.w + ' ' + w.n, function () { st.jq = w.w; ui.go('journal', 'book'); ui.renderPanel(true); ui.toPanel(); }, 'chip'); })); }
        if (names.length) { box.appendChild(h('h4', { cls: 'jhead', text: 'Names, people, pets and places' })); box.appendChild(chips(names)); }
        box.appendChild(h('h4', { cls: 'jhead', text: 'Words (A to Z, with how many pages)' }));
        box.appendChild(chips(rest.slice().sort(function (x, y) { return x.w.toLowerCase() < y.w.toLowerCase() ? -1 : 1; })));
      }
      f.addEventListener('input', draw); draw();
    });
  }

  /* ---------- My story: the summary, the chapters of your life, and the whole book ---------- */
  function bookTitle(S) { return C.setting(S, 'bookTitle', '') || 'The Hilltop Book of ' + PN.who(S); }
  function author(S) { return C.setting(S, 'author', '') || PN.who(S); }
  // 2.3.0: the cover sits at the top of Book (the PDF is in Settings > Save as PDF)
  function storyHead(p) {
    var a = app(), S = a.S, k = K();
    p.appendChild(h('div', { cls: 'bookcover' }, h('b', { cls: 'btitle', text: bookTitle(S) }), h('span', { cls: 'small', text: 'by ' + author(S) })));
    p.appendChild(h('div', { cls: 'row wrap' }, k.btn('Read the whole book', function () { st.jbook = { y: null }; ui.renderPanel(true); ui.toPanel(); }, 'primary'),
      k.btn('Title and author', function () { k.editSheet('Your book', [{ label: 'Title', value: bookTitle(S) }, { label: 'Author', value: author(S) }], function (v) { var ev = []; if (v[0].trim()) ev.push({ type: 'set', data: { k: 'bookTitle', v: v[0].trim().slice(0, 80) } }); if (v[1].trim()) ev.push({ type: 'set', data: { k: 'author', v: v[1].trim().slice(0, 60) } }); if (ev.length) a.addEvents(ev); }); }, 'ghost')));
  }
  PN.bookPdf = function (btn0) { var k = K(), S = app().S, t0 = btn0 ? btn0.textContent : ''; if (btn0) k.busy(btn0, true, 'Making the book...'); return PN.bookDoc().then(function (doc) { PN.savePdf(doc, 'book-' + String(author(S)).replace(/[^A-Za-z0-9]+/g, '-')); if (btn0) k.busy(btn0, false, t0); }, function () { if (btn0) k.busy(btn0, false, t0); }); };
  function storyView(p) {
    var a = app(), S = a.S, k = K(), box = h('div');
    p.appendChild(box); box.appendChild(k.empty('Reading your book...'));
    PN.allEntries().then(function (allE) {
      k.clear(box);
      var sum = PN.journalSummary(S, allE);
      box.appendChild(h('h4', { cls: 'jhead', text: 'Your life so far' }));
      if (!sum.length) box.appendChild(h('p', { cls: 'small', text: 'Write an entry or let ' + S.totemName + ' cast a reading and your story starts here.' }));
      sum.forEach(function (x) { box.appendChild(h('p', null, h('b', { text: x.h + ': ' }), x.p)); });
      var days = PN.allDays(S), years = {}; days.forEach(function (d) { (years[d.slice(0, 4)] = years[d.slice(0, 4)] || {})[d.slice(0, 7)] = 1; });
      box.appendChild(h('h4', { cls: 'jhead', text: 'The chapters of your life' }));
      Object.keys(years).sort().reverse().forEach(function (y) {
        var ms = Object.keys(years[y]).sort(), ye = allE.filter(function (e) { return e.d.slice(0, 4) === y; }), yw = PN.wordCounts(S, null, ye).slice(0, 5).map(function (w) { return w.w; });
        box.appendChild(k.acc('js-' + y, 'Book ' + y + (yw.length ? ': ' + yw.join(', ') : ''), [h('ul', null, ms.map(function (mo) {
          var me = allE.filter(function (e) { return e.d.slice(0, 7) === mo; }), mw = PN.wordCounts(S, null, me).slice(0, 4).map(function (w) { return w.w; });
          return h('li', null, h('button', { type: 'button', cls: 'linkish', text: MONTHS[+mo.slice(5) - 1] + (mw.length ? ': ' + mw.join(', ') : '') + ' (' + plural(me.length, 'entry', 'entries') + ')', onclick: function () { st.jbook = { y: mo }; ui.renderPanel(true); ui.toPanel(); } }));
        }))], false));
      });
    });
  }
  // the book, a chapter (month) at a time
  function bookReader() {
    var a = app(), S = a.S, k = K(), p = body(), months = {}, days = PN.allDays(S).slice().sort();
    days.forEach(function (d) { months[d.slice(0, 7)] = 1; });
    var ms = Object.keys(months).sort(), mo = st.jbook.y && months[st.jbook.y] ? st.jbook.y : ms[ms.length - 1], i = ms.indexOf(mo);
    p.appendChild(h('div', { cls: 'row spread' }, k.btn('< Book', function () { st.jbook = null; ui.renderPanel(true); }, 'mini ghost'),
      h('span', { cls: 'row' }, k.btn('Earlier', function () { if (i > 0) { st.jbook = { y: ms[i - 1] }; ui.renderPanel(true); ui.toPanel(); } }, 'mini'), k.btn('Later', function () { if (i < ms.length - 1) { st.jbook = { y: ms[i + 1] }; ui.renderPanel(true); ui.toPanel(); } }, 'mini'))));
    if (!mo) { p.appendChild(k.empty('Nothing in the book yet.')); return; }
    var page = h('article', { cls: 'bookpage' });
    p.appendChild(page);
    page.appendChild(h('p', { cls: 'small', text: bookTitle(S) + ' · by ' + author(S) + ' · Book ' + mo.slice(0, 4) }));
    page.appendChild(h('h3', { cls: 'jtitle', text: 'Chapter ' + (i + 1) + '. ' + PN.chapterTitle(S, mo) }));
    a.chapter(mo).then(function (evs) {
      days.filter(function (d) { return d.slice(0, 7) === mo; }).forEach(function (d) {
        var rv = PN.readingFor(S, d), ents = evs.filter(function (e) { return e.type === 'journal' && e.d === d; }).sort(C.cmpT), tl = PN.tileLog(S, d);
        page.appendChild(h('h4', { cls: 'bookday', text: PN.nice(d) }));
        if (rv) page.appendChild(h('p', { cls: 'small', text: 'I Ching: ' + stampLine(rv) }));
        ents.forEach(function (e) { page.appendChild(h('p', { cls: 'booktext', text: e.data.text })); });
        if (tl.length) page.appendChild(h('p', { cls: 'small', text: tl.map(function (x) { return x.text; }).join(' ') }));
        if (!ents.length && !tl.length && !rv) page.appendChild(h('p', { cls: 'small', text: 'A quiet day.' }));
      });
    });
  }
  // the whole book as a PDF: title page, the summary as a foreword, then every chapter
  PN.bookDoc = function () {
    var a = app(), S = a.S, days = PN.allDays(S).slice().sort();
    return PN.allEntries().then(function (allE) {
      var months = {}; days.forEach(function (d) { months[d.slice(0, 7)] = 1; });
      return Promise.all(Object.keys(months).map(function (m) { return a.chapter(m).catch(function () { return []; }); })).then(function (lists) {
        var evs = [].concat.apply([], lists), b = [{ t: 'title', text: bookTitle(S), center: true }, { t: 'sub', text: 'by ' + author(S) + ' · ' + (days.length ? PN.nice(days[0]) + ' to ' + PN.nice(days[days.length - 1]) : '') }, { t: 'h2', text: 'Foreword' }];
        PN.journalSummary(S, allE).forEach(function (x) { b.push({ t: 'p', text: x.h + ': ' + x.p }); });
        var lastY = '', lastM = '', n = 0;
        days.forEach(function (d) {
          if (d.slice(0, 4) !== lastY) { lastY = d.slice(0, 4); b.push({ t: 'break' }); b.push({ t: 'title', text: 'Book ' + lastY }); }
          if (d.slice(0, 7) !== lastM) { lastM = d.slice(0, 7); n++; b.push({ t: 'h1', text: 'Chapter ' + n + '. ' + PN.chapterTitle(S, lastM) }); }
          var rv = PN.readingFor(S, d), ents = evs.filter(function (e) { return e.type === 'journal' && e.d === d && !((S.jhide || {})[e.id] && S.jhide[e.id].v); }).sort(C.cmpT), tl = PN.tileLog(S, d);
          b.push({ t: 'h3', text: PN.nice(d) });
          if (rv) b.push({ t: 'small', text: 'I Ching: ' + stampLine(rv) });
          ents.forEach(function (e) { b.push({ t: 'p', text: e.data.text }); });
          if (tl.length) b.push({ t: 'small', text: tl.map(function (x) { return x.text; }).join(' ') });
        });
        return { title: bookTitle(S), blocks: b };
      });
    });
  };

  PN.personaInto = function (p) { var a = app(); p.appendChild(K().personaBox(a)); if (!C.setting(a.S, 'seenPersona', null)) a.setSetting('seenPersona', 1).then(function () { a.checkStarter(); }); };
  // every day that has something in the book (calm check-ins stay in Vitals, so they don't make a page by themselves)
  PN.allDays = function (S) {
    var days = {}, t = today();
    Object.keys(S.reviews || {}).forEach(function (d) { days[d] = 1; });
    Object.keys(S.jpages || {}).forEach(function (d) { days[d] = 1; });
    (S.journal || []).forEach(function (e) { days[e.d] = 1; });
    Object.keys(S.lib || {}).forEach(function (mo) { Object.keys(S.lib[mo].days).forEach(function (d) { var pg = S.lib[mo].days[d]; if (pg.say || pg.journal || pg.done || pg.memory) days[d] = 1; }); });
    var dOf = function (x) { return x ? U.dayStr(new Date(x)) : null; };
    Object.keys(S.quests || {}).forEach(function (k0) { var q = S.quests[k0]; if (!/^starter-/.test(k0) && q.first) days[dOf(q.first)] = 1; }); Object.keys(S.tdone || {}).forEach(function (x) { if (S.tdone[x].done) days[dOf(S.tdone[x].t)] = 1; }); Object.keys(S.qsteps || {}).forEach(function (x) { if (S.qsteps[x].done) days[dOf(S.qsteps[x].t)] = 1; });
    days[t] = 1;
    return Object.keys(days).filter(function (d) { return d <= t && /^\d{4}-\d\d-\d\d$/.test(d); }).sort().reverse();
  };
  /* ---------- journal PDFs (Settings > Save as PDF > Journal pages) ---------- */
  function pageBlocks(S, d, evs) {
    var b = [], rv = PN.readingFor(S, d), ents = (evs || []).filter(function (e) { return e.type === 'journal' && e.d === d && !((S.jhide || {})[e.id] && S.jhide[e.id].v); }).sort(C.cmpT);
    b.push({ t: 'h2', text: PN.nice(d) });
    if (rv) { b.push({ t: 'small', text: 'I Ching: ' + stampLine(rv) }); if (rv.vals) b.push({ t: 'hex', vals: rv.vals }); }
    ents.forEach(function (e) { b.push({ t: 'small', text: (e.h || '') + (e.dn ? ' · ' + e.dn : '') }); b.push({ t: 'p', text: e.data.text }); });
    var tl = PN.tileLog(S, d); if (tl.length) { b.push({ t: 'h3', text: 'What got done' }); tl.forEach(function (x) { b.push({ t: 'li', text: x.text }); }); }
    return b;
  }
  PN.journalDoc = function (days, label) {
    var a = app(), months = {};
    days.forEach(function (d) { months[d.slice(0, 7)] = 1; });
    return Promise.all(Object.keys(months).map(function (m) { return a.chapter(m).catch(function () { return []; }); })).then(function (lists) {
      var evs = [].concat.apply([], lists), S = a.S, b = [{ t: 'title', text: 'Journal: ' + label }, { t: 'sub', text: S.totemName + ' · ' + days.length + ' page' + (days.length === 1 ? '' : 's') }], lastMo = '';
      days.slice().sort().forEach(function (d) {
        var mo = d.slice(0, 7);
        if (mo !== lastMo) { b.push({ t: 'h1', text: PN.chapterTitle(S, mo) }); lastMo = mo; }
        b = b.concat(pageBlocks(S, d, evs)); b.push({ t: 'hr' });
      });
      if (!days.length) b.push({ t: 'p', text: 'No pages in this range.' });
      return { title: 'Journal ' + label, blocks: b };
    });
  };
  PN.readingsDoc = function (S) { return readingsDoc(S); };
  PN.gabaDoc = function (S, mo) { return gabaDoc(S, mo); };
  PN.exportDay = function (day) { var a = app(); a.chapter(day.slice(0, 7)).then(function (evs) { PN.savePdf({ title: 'Journal ' + day, blocks: pageBlocks(a.S, day, evs) }, 'aiu-journal-' + day); }); };

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
     I CHING: today's reading in one look (the word, the number, the changing lines, what to do), and every past reading.
     2.2.0: Aiu casts by himself every night at midnight (and a few moments after hatching). The toss plays first; the
     reading shows only after it lands, on every device (a reading cast on another device plays its toss here first).
     ===================================================================================== */
  PN.ichingActions = function () { return []; };
  // 2.3.0: the I Ching on Today: the word, the number and name, the changing lines up top; the rest folded
  PN.ichingInto = function (p) {
    var a = app(), S = a.S, k = K(), d = today(), rv = PN.readingFor(S, d), I = AIU.iching, sec = h('section', { cls: 'jsec icsec' }, h('h4', { text: 'Today\'s I Ching' }));
    p.appendChild(sec);
    if (!S.hatched) { sec.appendChild(h('p', { cls: 'small', text: 'The first reading comes a few moments after the egg hatches.' })); return; }
    if (!rv) {
      var castingNow = a.casting && a.casting.day === d;
      sec.appendChild(h('p', { text: castingNow ? S.totemName + ' is tossing the coins right now. Watch the yard!' : 'Today\'s coins haven\'t been tossed yet.' }));
      if (!castingNow) {
        sec.appendChild(h('p', { cls: 'small', text: S.totemName + ' casts every night at midnight. If Aiu wasn\'t open then, he tosses them the next time he\'s free while you\'re here. The reading shows up here as soon as the coins land.' }));
        sec.appendChild(k.btn('Ask ' + S.totemName + ' to cast now', function () { ui.go('world'); a.castReading(); } /* 2.4.0: watch the toss in the World tab */, 'primary'));
      }
      return;
    }
    var X = I.info(rv.hex), R = rv.rel && rv.rel !== rv.hex ? I.info(rv.rel) : null, tg = I.trigramsOf(rv.hex), M0 = I.MODES[X.mode];
    sec.appendChild(h('div', { cls: 'ichead' }, h('b', { cls: 'icword', text: X.theme }), h('span', { cls: 'icnum', text: '#' + rv.hex + ' ' + X.name })));
    sec.appendChild(h('div', { cls: 'row jcast' }, k.hexPic(rv.vals, rv.hex), h('div', { cls: 'col' },
      h('span', { text: (rv.moving && rv.moving.length ? 'Changing line' + (rv.moving.length > 1 ? 's ' : ' ') + rv.moving.join(', ') : 'No changing lines') + (R ? ' → #' + R.n + ' ' + R.name + ' (' + R.theme + ')' : '') }),
      h('span', { cls: 'small', text: 'Cast ' + (rv.hm ? 'at ' + U.fmtHm(rv.hm, k.c24()) : 'today') + ' by ' + S.totemName + '. Practical wisdom, not fortune-telling.' }))));
    sec.appendChild(h('p', null, h('b', { text: 'Today: ' }), X.advice));
    var full = X.theme + '. Hexagram ' + rv.hex + ', ' + X.name + '. ' + X.meaning + ' ' + X.modern + ' ' + X.advice;
    PN.todaySpeech = function () { return X.theme + '. Hexagram ' + rv.hex + ', ' + X.name + '. ' + sentences2(X.modern) + ' Today: ' + X.advice; }; void full; // 2.4.0: the page reader
    sec.appendChild(k.acc('ic-tr', 'Translation', [h('p', null, h('b', { text: X.pinyin + ': ' }), X.name + ' (' + tg.upper + ' over ' + tg.lower + ').'),
      h('p', { cls: 'small', text: 'Six lines from the bottom up. Solid = yang (active), broken = yin (receptive). Red lines are changing: they flip, and the reading moves toward the next hexagram.' })], false));
    sec.appendChild(k.acc('ic-in', 'Interpretation', [h('p', null, h('b', { text: 'Traditional: ' }), X.meaning), h('p', null, h('b', { text: 'Modern: ' }), X.modern),
      (rv.moving || []).map(function (n) { var lp = I.LINEPOS[n]; return h('p', null, h('b', { text: 'Line ' + n + ' (' + lp[0] + '): ' }), 'points at ' + lp[1] + '.'); }),
      R ? h('p', null, h('b', { text: 'Heading toward #' + R.n + ' ' + R.name + ': ' }), R.meaning) : null], false));
    sec.appendChild(k.acc('ic-su', 'Suggestions for today', [h('ul', null, h('li', { text: X.advice }), M0 ? h('li', { text: M0.line + ' ' + M0.q }) : null, X.principle ? h('li', { text: 'Hilltop principle: ' + X.principle }) : null, X.feed ? h('li', { text: 'Ask yourself: what am I feeding, and what am I starving?' }) : null)], false));
    if (rv.text) sec.appendChild(k.acc('ic-hv', S.totemName + '\'s Hilltop View', [h('p', { cls: 'jval', text: rv.text })], false));
  };
  PN.pastReadingsInto = function (p) {
    var a = app(), S = a.S, k = K(), d = today(), days = Object.keys(S.reviews || {}).filter(function (x) { return x !== d && PN.readingFor(S, x); }).sort().reverse();
    p.appendChild(k.acc('ic-past', 'Past readings', days.length ? days.slice(0, 120).map(function (x) { return k.readingCard(a, S.reviews[x]); }) : [k.empty('Your past readings will collect here.')], false, days.length));
  };
  PN.ichingView = function () { var p = body(); PN.ichingInto(p); PN.pastReadingsInto(p); }; // (kept for anything that still calls it)
  function readingsDoc(S) {
    var b = [{ t: 'title', text: 'I Ching readings' }, { t: 'sub', text: S.totemName + ' · practical wisdom, not fortune-telling' }];
    Object.keys(S.reviews || {}).sort().reverse().forEach(function (d) {
      var rv = PN.readingFor(S, d), X = rv && AIU.iching.info(rv.hex); if (!X) return;
      b.push({ t: 'h2', text: Wd.cap(U.fmtDay(d)) + ' (' + d + '): ' + stampLine(rv) });
      if (rv.vals && rv.vals.length === 6) b.push({ t: 'hex', vals: rv.vals });
      b.push({ t: 'p', text: X.advice });
      if (rv.text) b.push({ t: 'small', text: rv.text });
    });
    return { title: 'I Ching readings', blocks: b };
  }
})();
