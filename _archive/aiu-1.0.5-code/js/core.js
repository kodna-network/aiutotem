/* AIU TOTEM - the rules engine ("flight computer").
   The event log is the Totem's DNA. This file turns events into the Totem's current state, one event at a time,
   so even a Raspberry Pi 2 never has to re-read years of history:
   - apply(): every event, once, in any order. Newest timestamp wins for settings, tasks, lists, names...
   - confirm(): server-confirmed events, once, in server order. Growth, evolution and coins happen here
     (the "Poke Center"), so every device grows the same creature.
   - view(): a read-only snapshot for the screens, including growth still waiting for sync.
   The whole state can be saved as a checkpoint and picked up later. */
(function () {
  'use strict';
  var U = AIU.util, Wd = AIU.words;
  var C = AIU.core = {};

  C.VERSION = 2;
  C.HATCH_MS = 0;        // the egg cracks open when you tap Begin
  C.DAILY_CAP = 30;      // growth per day
  C.OFFLINE_MS = 5 * 60 * 1000; // events that waited longer than this on a device count as "offline"
  C.KEEP_DAYS = 60;      // growth bookkeeping kept per day (older days are folded away)
  C.STAGE_NAMES = ['Egg', 'Hatchling', 'Sprout', 'Scout', 'Ranger', 'Guardian', 'Elder', 'Totem'];
  C.stageName = function (s) { return s < C.STAGE_NAMES.length ? C.STAGE_NAMES[s] : 'Totem ' + (s - C.STAGE_NAMES.length + 2); };
  C.thresholdFor = function (stage) { // total growth needed to reach a stage
    var t = [0, 0, 100, 300, 600, 1000, 1500, 2100];
    return stage < t.length ? t[stage] : 2100 + (stage - 7) * 700;
  };
  C.formSeed = function (eggId, stage) { return U.hash32(eggId + ':form:' + stage); };
  function cmpT(a, b) { return a.t - b.t || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0); }
  C.cmpT = cmpT;
  function newer(a, b) { return !b || a.t > b.t || (a.t === b.t && a.id > b.id); }
  function meta(e) { return { t: e.t, id: e.id, dev: e.dev, dn: e.dn }; }
  function textOf(e) { return String((e.data && e.data.text) || '').trim(); }
  function dayOf(e) { return e.d || U.dayStr(new Date(e.t)); }
  function slim(e) { return { id: e.id, t: e.t, d: dayOf(e), h: e.h, dev: e.dev, dn: e.dn, type: e.type, data: { text: textOf(e) } }; }
  function page(S, day) {
    var ch = S.lib[day.slice(0, 7)] || (S.lib[day.slice(0, 7)] = { words: {}, days: {}, n: 0 });
    return { ch: ch, pg: ch.days[day] || (ch.days[day] = { say: 0, journal: 0, memory: 0, done: 0, words: {} }) };
  }
  var CMD = /^(please )?(remember|remind|wake|add|put|cancel|stop|delete|remove|show|call me|my name|dear diary|journal|note)\b|\?\s*$|^(what|when|who|where|how|why)\b/i;

  C.newState = function () {
    return {
      v: C.VERSION, ls: 0, W: 0, events: 0,
      egg: null, rush: null, settings: {}, facts: {}, learned: {}, tasks: {}, done: {}, habits: {},
      lists: {}, entities: {}, notes: {}, unlocked: {}, devices: {}, memories: [],
      quests: {}, qsteps: {}, jedit: {}, jhide: {}, recent: [], journals: [], recaps: {},
      buys: {}, owned: {}, spent: 0, taught: [], qnotes: {},
      topics: {}, traits: { quiz: {}, nudge: {}, resetT: 0 }, reviews: {}, ptypes: [], jpages: {},
      g: { total: 0, next: 2, cross: [], days: {}, seen: {}, grp: null, room: 0, foldDay: '' },
      lex: {}, lib: {}
    };
  };

  C.pointsFor = function (e) {
    var d = e.data || {}, txt = textOf(e);
    switch (e.type) {
      case 'journal': return txt.length >= 80 ? 10 : 0;
      case 'say': return (txt.length >= 60 && txt.split(/\s+/).length >= 10) ? 5 : 0;
      case 'remember': return txt.length >= 12 ? 3 : 0;
      case 'learn': case 'fact': case 'teach': return 3;
      case 'entity': return d.taught ? 3 : 0;
      case 'quest_step': return d.done ? 2 : 0;
      case 'topic': return (d.a && !d.confirm && !d.removed && String(d.a).length >= 2) ? 2 : 0; // teaching Aiu about you
      case 'jpage': return txt.length >= 80 ? 10 : txt.length >= 20 ? 3 : 0; // writing on your Hilltop journal page
      default: return 0;
    }
  };

  /* ---------- word index (lexicon) and the library (months = chapters, days = pages) ---------- */
  var LINKS = 16, POSTS = 16;
  function addText(S, e, kind) {
    var text = textOf(e), toks = Wd.tokens(text), day = dayOf(e), norms = {}, p = page(S, day), ch = p.ch, pg = p.pg;
    ch.n++; if (kind === 'said') pg.say++; if (kind === 'journal') pg.journal++; if (kind === 'memory') pg.memory++;
    toks.forEach(function (tk) {
      if (/^\d/.test(tk.norm)) return;
      norms[tk.norm] = 1;
      var L = S.lex[tk.norm] || (S.lex[tk.norm] = { raw: {}, count: 0, capMid: 0, first: e.t, last: 0, lastDay: day, links: {}, posts: [] });
      L.count++; L.raw[tk.raw] = (L.raw[tk.raw] || 0) + 1; if (tk.cap && !tk.first) L.capMid++;
      if (e.t < L.first) L.first = e.t;
      if (e.t >= L.last) { L.last = e.t; L.lastDay = day; }
      if (L.posts.indexOf(e.id) < 0) { L.posts.push(e.id); if (L.posts.length > POSTS) L.posts.shift(); }
      if (!Wd.COMMON[tk.norm]) { ch.words[tk.norm] = (ch.words[tk.norm] || 0) + 1; pg.words[tk.norm] = (pg.words[tk.norm] || 0) + 1; }
    });
    var ks = Object.keys(norms);
    if (ks.length > 1 && ks.length <= 40) ks.forEach(function (a) {
      var Lk = S.lex[a].links;
      ks.forEach(function (b) { if (a !== b) Lk[b] = (Lk[b] || 0) + 1; });
      var lk = Object.keys(Lk);
      if (lk.length > LINKS * 2) { lk.sort(function (x, y) { return Lk[y] - Lk[x]; }); lk.slice(LINKS).forEach(function (x) { delete Lk[x]; }); }
    });
  }
  function top(obj, n) { return Object.keys(obj).sort(function (a, b) { return obj[b] - obj[a]; }).slice(0, n); }
  C.top = top;
  // Keeps the checkpoint small: old pages keep only their top words, rare old words are archived.
  C.compact = function (S, today) {
    var month = today.slice(0, 7), cutoff = Date.now() - 120 * 86400000;
    Object.keys(S.lib).forEach(function (m) {
      var ch = S.lib[m];
      Object.keys(ch.days).forEach(function (d) {
        if (d === today) return;
        var pg = ch.days[d];
        if (Object.keys(pg.words).length > 8) { var keep = {}; top(pg.words, 8).forEach(function (w) { keep[w] = pg.words[w]; }); pg.words = keep; }
      });
      if (m !== month && Object.keys(ch.words).length > 40) { var kp = {}; top(ch.words, 40).forEach(function (w) { kp[w] = ch.words[w]; }); ch.words = kp; }
    });
    var keys = Object.keys(S.lex);
    if (keys.length > 6000) keys.forEach(function (k) { var L = S.lex[k]; if (L.count <= 1 && L.last < cutoff) delete S.lex[k]; });
  };

  /* ---------- apply: every event once, any order ---------- */
  C.apply = function (S, e) {
    var d = e.data || {}, m = meta(e), key, rec, list;
    if (e.ls && e.ls > S.ls) S.ls = e.ls;
    S.events++;
    if (e.dev && newer(m, S.devices[e.dev])) S.devices[e.dev] = { dn: e.dn || 'device', t: e.t, id: e.id };
    switch (e.type) {
      case 'egg':
        if (!S.egg || cmpT(e, S.egg) < 0) S.egg = { id: e.id, t: e.t, name: String(d.name || 'Aiu').slice(0, 24), dev: e.dev, wait: Math.max(0, +d.wait || 0) };
        break;
      case 'dev_rush': if (S.rush === null || e.t < S.rush) S.rush = e.t; break;
      case 'set': if (d.k && newer(m, S.settings[d.k])) S.settings[d.k] = Object.assign({ v: d.v }, m); break;
      case 'fact': key = String(d.key || '').toLowerCase(); if (key && newer(m, S.facts[key])) S.facts[key] = Object.assign({ key: d.key, value: d.value }, m); break;
      case 'learn': key = String(d.word || '').toLowerCase(); if (key && newer(m, S.learned[key])) S.learned[key] = Object.assign({ kind: d.kind, note: d.note }, m); break;
      case 'task_set':
        if (!d.key) break;
        rec = S.tasks[d.key] || (S.tasks[d.key] = { key: d.key });
        if (newer(m, rec.setM)) {
          ['title', 'time', 'repeat', 'date', 'days', 'kind', 'routine', 'quest'].forEach(function (f) { rec[f] = d[f]; });
          rec.setM = m;
        }
        fixTask(rec);
        if (d.repeat === 'once' && d.date && d.time) { // for noticing habits
          var base = d.key.split('@')[0], hb = S.habits[base] || (S.habits[base] = {});
          hb[d.date] = d.time;
          var hd = Object.keys(hb).sort(); if (hd.length > 14) delete hb[hd[0]];
        }
        break;
      case 'task_off':
        if (!d.key) break;
        rec = S.tasks[d.key] || (S.tasks[d.key] = { key: d.key });
        if (newer(m, rec.offM)) { rec.offM = m; rec.removed = !!d.removed; } // removed = deleted, not just turned off
        fixTask(rec);
        break;
      case 'task_done':
        if (d.key && d.date) {
          var dk = d.key + '|' + d.date, was = S.done[dk];
          if (!was) page(S, d.date).pg.done++;
          if (!was || cmpT(m, was) < 0) S.done[dk] = m; // the first time it was done wins
        }
        break;
      case 'list_add': case 'list_check': case 'list_remove':
        list = String(d.list || 'shopping').toLowerCase(); key = Wd.clean(d.item).toLowerCase();
        if (!key) break;
        S.lists[list] = S.lists[list] || {};
        rec = S.lists[list][key] || (S.lists[list][key] = { item: Wd.clean(d.item), done: false, removed: false, t: 0 });
        if (e.type === 'list_add') {
          if (newer(m, rec.addM)) { rec.addM = m; rec.item = Wd.clean(d.item); }
          if (newer(m, rec.doneM)) { rec.doneM = m; rec.done = false; }
          if (newer(m, rec.remM)) { rec.remM = m; rec.removed = false; }
        }
        if (e.type === 'list_check' && newer(m, rec.doneM)) { rec.doneM = m; rec.done = d.done !== false; }
        if (e.type === 'list_remove' && newer(m, rec.remM)) { rec.remM = m; rec.removed = true; }
        rec.t = Math.max(rec.t, e.t);
        break;
      case 'entity':
        key = Wd.clean(d.name).toLowerCase();
        if (!key) break;
        rec = S.entities[key] || (S.entities[key] = { name: Wd.clean(d.name), first: e.t, fm: {}, t: 0 });
        ['name', 'kind', 'species', 'note', 'relation'].forEach(function (f) { if (d[f] && newer(m, rec.fm[f])) { rec[f] = f === 'name' ? Wd.clean(d[f]) : d[f]; rec.fm[f] = m; } });
        if (e.t < rec.first) rec.first = e.t;
        if (e.t >= rec.t) { rec.t = e.t; rec.dn = e.dn; }
        if (d.hidden !== undefined && newer(m, rec.fm.hidden)) { rec.hidden = !!d.hidden; rec.fm.hidden = m; }
        break;
      case 'item_note':
        key = String(d.key || '').toLowerCase(); if (!key || !d.text) break;
        list = S.notes[key] || (S.notes[key] = []);
        if (!list.some(function (n) { return n.id === e.id; })) { list.push({ id: e.id, t: e.t, text: String(d.text).slice(0, 300), dn: e.dn }); list.sort(cmpT); if (list.length > 40) list.shift(); }
        break;
      case 'item_note_done':
        key = String(d.key || '').toLowerCase();
        (S.notes[key] || []).forEach(function (n) { if (n.id === d.ref && newer(m, n.doneM)) { n.doneM = m; n.done = d.done !== false; } });
        break;
      case 'teach': // the butler learning what kind of thing you meant (21 Questions answers)
        var TL = S.taught || (S.taught = []);
        if (d.intent && d.text && !TL.some(function (x) { return x.id === e.id; })) {
          TL.push({ id: e.id, t: e.t, text: String(d.text).slice(0, 300), intent: String(d.intent).slice(0, 20) });
          TL.sort(cmpT); if (TL.length > 300) TL.shift();
        }
        break;
      case 'unlock': if (d.activity && (!S.unlocked[d.activity] || e.t < S.unlocked[d.activity])) S.unlocked[d.activity] = e.t; break;
      case 'remember':
        if (!S.memories.some(function (x) { return x.id === e.id; })) { S.memories.push(slim(e)); S.memories.sort(cmpT); if (S.memories.length > 400) S.memories.shift(); }
        addText(S, e, 'memory');
        break;
      case 'say': case 'totem': case 'journal':
        if (e.type !== 'totem' && !CMD.test(textOf(e))) nudge(S, textOf(e)); // how you talk shapes the personality, a little
        insertRecent(S.recent, slim(e), 150);
        if (e.type === 'journal') { insertRecent(S.journals, slim(e), 40); addText(S, e, 'journal'); }
        else if (e.type === 'say' && !CMD.test(textOf(e))) addText(S, e, 'said');
        else if (e.type === 'say') page(S, dayOf(e)).pg.say++;
        break;
      case 'journal_edit': if (d.ref && newer(m, S.jedit[d.ref])) S.jedit[d.ref] = Object.assign({ text: String(d.text || '') }, m); break;
      case 'journal_hide': if (d.ref && newer(m, S.jhide[d.ref])) S.jhide[d.ref] = Object.assign({ v: d.hidden !== false }, m); break;
      case 'quest_set':
        if (!d.key) break;
        rec = S.quests[d.key] || (S.quests[d.key] = { key: d.key, state: 'active', first: e.t });
        if (newer(m, rec.setM)) { ['title', 'why', 'subject', 'tip', 'due'].forEach(function (f) { rec[f] = d[f]; }); rec.kind = d.kind === 'side' || d.kind === 'idea' ? d.kind : 'main'; rec.steps = (d.steps || []).slice(0, 30); rec.setM = m; rec.dn = e.dn; }
        if (e.t < rec.first) rec.first = e.t;
        break;
      case 'quest_note': // the quest's journal: your notes (and anything you asked Aiu to write down)
        if (!d.key || !d.text) break;
        var QN = S.qnotes || (S.qnotes = {}), qn = QN[d.key] || (QN[d.key] = {});
        rec = qn[e.id] || (qn[e.id] = { id: e.id });
        rec.t = e.t; rec.text = String(d.text).slice(0, 2000); rec.by = d.by === 'aiu' ? 'aiu' : 'you'; rec.tag = d.tag ? String(d.tag).slice(0, 20) : ''; rec.dn = e.dn;
        if (rec.editM) { rec.text = rec.editText; }
        break;
      case 'quest_note_edit':
        if (!d.key || !d.ref) break;
        var QN2 = S.qnotes || (S.qnotes = {}), qn2 = QN2[d.key] || (QN2[d.key] = {});
        rec = qn2[d.ref] || (qn2[d.ref] = { id: d.ref, t: e.t, text: '', by: 'you' });
        if (newer(m, rec.editM)) { rec.editM = m; rec.editText = d.removed ? rec.text : String(d.text || '').slice(0, 2000); if (!d.removed) rec.text = rec.editText; rec.removed = !!d.removed; }
        break;
      case 'quest_step': if (d.key && d.step && newer(m, S.qsteps[d.key + '|' + d.step])) S.qsteps[d.key + '|' + d.step] = Object.assign({ done: d.done !== false }, m); break;
      case 'quest_state':
        if (!d.key) break;
        rec = S.quests[d.key] || (S.quests[d.key] = { key: d.key, state: 'active', first: e.t });
        if (e.t < rec.first) rec.first = e.t;
        if (newer(m, rec.stateM)) { rec.state = d.state; rec.stateM = m; }
        break;
      case 'buy': if (d.item) S.buys[e.id] = { item: d.item, price: Math.max(0, +d.price || 0), t: e.t }; break;
      case 'recap': if (d.week && (!S.recaps[d.week] || cmpT(e, S.recaps[d.week]) < 0)) S.recaps[d.week] = { t: e.t, id: e.id, text: String(d.text || '') }; break;
      case 'topic': applyTopic(S, e, d, m); break;
      case 'jpage': // your edits to a Hilltop journal page (one field at a time; newest wins; empty = back to Aiu's summary)
        if (!d.day || !d.f) break;
        var JP = S.jpages || (S.jpages = {}), pgj = JP[d.day] || (JP[d.day] = {}), f = String(d.f).slice(0, 16);
        if (newer(m, pgj[f])) pgj[f] = Object.assign({ text: String(d.text || '').slice(0, 20000) }, m);
        if (textOf(e)) addText(S, e, 'journal');
        break;
      case 'trait': // personality quiz answers (a retake starts fresh from its time)
        var TR = traits(S);
        if (d.reset) { if (e.t > TR.resetT) TR.resetT = e.t; break; }
        if (d.qid && newer(m, TR.quiz[d.qid])) TR.quiz[d.qid] = Object.assign({ v: d.v > 0 ? 1 : d.v < 0 ? -1 : 0 }, m);
        break;
      case 'ptype': // the type changing over time (the Darwinist log)
        var PT = S.ptypes || (S.ptypes = []);
        if (d.code && !PT.some(function (x) { return x.id === e.id; })) { PT.push({ id: e.id, t: e.t, code: String(d.code).slice(0, 4), from: d.from ? String(d.from).slice(0, 4) : '' }); PT.sort(cmpT); if (PT.length > 40) PT.shift(); }
        break;
      case 'review': // the daily hilltop review (I Ching reading + yesterday's track record); the first one each day wins
        var RV = S.reviews || (S.reviews = {});
        if (d.day && (!RV[d.day] || cmpT(e, RV[d.day]) < 0)) {
          RV[d.day] = { t: e.t, id: e.id, day: d.day, hex: +d.hex || 0, rel: +d.rel || 0, vals: (d.vals || []).slice(0, 6), moving: (d.moving || []).slice(0, 6), text: String(d.text || '').slice(0, 2000), dn: e.dn,
            wx: d.wx ? { now: String(d.wx.now || '').slice(0, 80), today: String(d.wx.today || '').slice(0, 160) } : null, hm: d.hm ? String(d.hm).slice(0, 5) : '', place: String(d.place || '').slice(0, 60), zone: String(d.zone || '').slice(0, 40) };
          var rk = Object.keys(RV).sort(); if (rk.length > 120) delete RV[rk[0]];
        }
        break;
    }
  };
  function traits(S) { return S.traits || (S.traits = { quiz: {}, nudge: {}, resetT: 0 }); }
  function nudge(S, text) {
    var P = AIU.persona, c = P && P.cues(text); if (!c) return;
    var N = traits(S).nudge;
    Object.keys(c).forEach(function (k) { N[k] = Math.max(-P.NUDGE_CAP, Math.min(P.NUDGE_CAP, (N[k] || 0) + c[k])); });
  }
  /* ---------- topic pages: what you've told Aiu about things (who, what, when, where, why, how) ---------- */
  // Answers are kept with their history; the newest is current. "confirm" = you said it's still true.
  // "removed" hides every answer for that question up to that moment. Logs = one entry per time you talked about it happening.
  function applyTopic(S, e, d, m) {
    var key = String(d.key || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').slice(0, 60);
    if (!key) return;
    var T = S.topics || (S.topics = {}), rec = T[key] || (T[key] = { key: key, title: '', kind: '', group: '', first: e.t, t: 0, ans: {}, checked: {}, remAt: {}, logs: {}, feel: null });
    if (d.title && newer(m, rec.titleM)) { rec.title = String(d.title).slice(0, 48); rec.kind = String(d.kind || '').slice(0, 20); rec.group = String(d.group || '').slice(0, 20); rec.titleM = m; }
    if (e.t < rec.first) rec.first = e.t;
    if (d.hidden !== undefined) { if (newer(m, rec.hidM)) { rec.hidM = m; rec.hidden = !!d.hidden; } return; } // "Remove page" (with undo); talking about it again brings it back
    if (e.t > rec.t) rec.t = e.t;
    if (rec.hidden && rec.hidM && e.t > rec.hidM.t) rec.hidden = false;
    var w = String(d.w || '').slice(0, 8), a = String(d.a || '').trim().slice(0, 300);
    if (d.feel && newer(m, rec.feel)) rec.feel = Object.assign({ v: String(d.feel).slice(0, 20) }, m);
    if (!w || w === 'feel') return;
    if (d.mode === 'log' && d.sid) {
      var L = rec.logs[d.sid] || (rec.logs[d.sid] = { sid: d.sid, day: dayOf(e), t: e.t, tense: d.tense || 'past', a: {} });
      if (e.t < L.t) { L.t = e.t; L.day = dayOf(e); }
      if (a && (!L.a[w] || newer(m, L.a[w]))) L.a[w] = Object.assign({ a: a }, m);
      var lk = Object.keys(rec.logs); if (lk.length > 40) { lk.sort(function (x, y) { return rec.logs[x].t - rec.logs[y].t; }); delete rec.logs[lk[0]]; }
      return;
    }
    if (d.removed) { if (!rec.remAt[w] || e.t > rec.remAt[w]) rec.remAt[w] = e.t; return; }
    if (d.confirm && (!rec.checked[w] || e.t > rec.checked[w])) rec.checked[w] = e.t;
    if (!a) return;
    var list = rec.ans[w] || (rec.ans[w] = []);
    if (list.some(function (x) { return x.id === e.id; })) return;
    if (d.confirm && list.some(function (x) { return x.a.toLowerCase() === a.toLowerCase(); })) return; // "still true": no new copy
    list.push({ id: e.id, t: e.t, a: a, q: d.q ? String(d.q).slice(0, 120) : '', dn: e.dn });
    list.sort(cmpT); if (list.length > 12) list.shift();
  }
  function fixTask(rec) {
    rec.off = !!rec.offM && (!rec.setM || newer(rec.offM, rec.setM));
    rec.t = Math.max(rec.setM ? rec.setM.t : 0, rec.offM ? rec.offM.t : 0);
    var w = rec.off ? rec.offM : rec.setM; rec.id = w.id; rec.dev = w.dev; rec.dn = w.dn;
  }
  function insertRecent(arr, item, max) {
    for (var i = 0; i < arr.length; i++) if (arr[i].id === item.id) return;
    var j = arr.length; while (j > 0 && cmpT(arr[j - 1], item) > 0) j--;
    arr.splice(j, 0, item);
    if (arr.length > max) arr.shift();
  }

  /* ---------- confirm: server-confirmed events, once each, in server order ---------- */
  function growthStep(g, e) {
    if (e.type === 'dev_growth') return Math.max(0, Math.min(1000, +((e.data || {}).n) || 0));
    var p = C.pointsFor(e);
    if (!p) return 0;
    var day = dayOf(e), txt = textOf(e).toLowerCase().replace(/\s+/g, ' ');
    if (txt) {
      var tk = day + '|' + U.hash32(txt);
      if (g.seen[tk]) return 0; // saying the same thing twice earns nothing
      g.seen[tk] = 1;
    }
    var used = g.days[day] || 0, got = Math.max(0, Math.min(p, C.DAILY_CAP - used));
    g.days[day] = used + got;
    return got;
  }
  function fold(g, day) { // forget per-day bookkeeping for days long gone (same on every device: based on event days)
    if (day <= g.foldDay) return;
    g.foldDay = day;
    var cut = U.addDays(day, -C.KEEP_DAYS);
    Object.keys(g.days).forEach(function (d) { if (d < cut) delete g.days[d]; });
    Object.keys(g.seen).forEach(function (k) { if (k.slice(0, 10) < cut) delete g.seen[k]; });
  }
  C.confirm = function (S, e) {
    if (!e.seq || e.seq <= S.W) return;
    S.W = e.seq;
    var g = S.g, day = dayOf(e);
    fold(g, day);
    var offline = e.off === 1 || (e.rt && (e.rt - e.t) > C.OFFLINE_MS);
    var raw = growthStep(g, e);
    if (raw) {
      var gain = raw;
      if (offline) { // points earned away from the Poke Center can fill the bar once, not more, per trip
        var gk = (e.dev || '') + '|' + e.rt;
        if (g.grp !== gk) { g.grp = gk; g.room = C.thresholdFor(g.next) - g.total; }
        gain = Math.max(0, Math.min(gain, g.room)); g.room -= gain;
      } else g.grp = null;
      g.total += gain;
      while (g.total >= C.thresholdFor(g.next)) {
        g.cross.push({ stage: g.next, t: e.t, words: topWords(S), points: g.total });
        g.next++;
      }
    }
    if (e.type === 'buy') {
      var dd = e.data || {}, b = S.buys[e.id] || { item: dd.item, price: Math.max(0, +dd.price || 0) };
      if (b.item && !S.owned[b.item] && g.total - S.spent >= b.price) { S.owned[b.item] = { t: e.t, price: b.price }; S.spent += b.price; }
    }
  };
  function topWords(S) {
    var month = Object.keys(S.lib).sort().pop();
    return month ? top(S.lib[month].words, 6) : [];
  }

  /* ---------- view: what the screens and the mind read ---------- */
  C.view = function (S, unsent, opts) {
    opts = opts || {};
    var now = opts.now || Date.now(), V = {};
    ['egg', 'rush', 'settings', 'facts', 'learned', 'done', 'lists', 'entities', 'notes', 'unlocked', 'devices', 'memories',
      'quests', 'qsteps', 'recaps', 'owned', 'lex', 'lib', 'habits', 'jedit', 'jhide'].forEach(function (k) { V[k] = S[k]; });
    V.taught = S.taught || [];
    V.qnotes = S.qnotes || {};
    V.topics = S.topics || {}; V.reviews = S.reviews || {}; V.jpages = S.jpages || {}; V.ptypes = S.ptypes || []; V.traits = traits(S);
    var lastPt = V.ptypes.length ? V.ptypes[V.ptypes.length - 1].code : null;
    V.ptype = AIU.persona ? AIU.persona.compute(Object.assign({ lastCode: lastPt }, V.traits)) : { code: null, answered: 0 };
    V.tasks = {};
    Object.keys(S.tasks).forEach(function (k) { if (S.tasks[k].title) V.tasks[k] = S.tasks[k]; });
    V.chat = S.recent.filter(function (e) { return e.type !== 'journal' || !(S.jhide[e.id] && S.jhide[e.id].v); }).map(function (e) { return withEdit(S, e); });
    V.journal = S.journals.filter(function (e) { return !(S.jhide[e.id] && S.jhide[e.id].v); }).map(function (e) { return withEdit(S, e); });
    V.total = S.events; V.unsent = unsent.length;
    var set = function (k, dflt) { return S.settings[k] ? S.settings[k].v : dflt; };
    V.totemName = set('totemName', S.egg ? S.egg.name : 'Aiu');
    V.callMe = set('callMe', opts.username ? Wd.cap(opts.username) : 'friend');
    if (S.egg) {
      V.hatchAt = S.egg.t + (S.egg.wait || C.HATCH_MS);
      if (S.rush !== null && S.rush >= S.egg.t) V.hatchAt = Math.min(V.hatchAt, S.rush);
      V.hatched = now >= V.hatchAt;
    } else { V.hatchAt = null; V.hatched = false; }
    // growth still waiting for the server, worked out on a scratch copy of the day counters
    var g = S.g, scratch = { days: Object.assign({}, g.days), seen: Object.assign({}, g.seen) }, pend = 0;
    unsent.slice().sort(cmpT).forEach(function (e) { pend += growthStep(scratch, e); });
    var room = Math.max(0, C.thresholdFor(g.next) - g.total), today = U.dayStr(new Date(now));
    V.stage = V.hatched ? 1 + g.cross.length : 0;
    V.forms = [];
    if (V.hatched) {
      V.forms.push({ stage: 1, seed: C.formSeed(S.egg.id, 1), t: V.hatchAt, words: [], points: 0 });
      g.cross.forEach(function (c) { V.forms.push({ stage: c.stage, seed: C.formSeed(S.egg.id, c.stage), t: Math.max(c.t, V.hatchAt), words: c.words, points: c.points }); });
    }
    V.form = V.forms.length ? V.forms[V.forms.length - 1] : null;
    V.growth = {
      confirmed: g.total, pending: Math.min(pend, room), pendingRaw: pend, full: V.hatched && pend > room, cap: C.DAILY_CAP,
      today: Math.min(C.DAILY_CAP, scratch.days[today] || 0),
      stageFloor: C.thresholdFor(Math.max(1, V.stage)), stageNext: C.thresholdFor(Math.max(2, V.stage + 1))
    };
    V.growth.readyAtSync = V.hatched && room > 0 && pend >= room;
    V.coins = g.total - S.spent;
    V.pendingBuys = unsent.filter(function (e) { return e.type === 'buy'; }).map(function (e) { return e.data.item; });
    var skin = set('skin', 'current');
    V.skinForm = V.form;
    if (skin !== 'current') V.forms.forEach(function (f) { if (String(f.stage) === String(skin)) V.skinForm = f; });
    V.accentSeed = S.egg ? U.hash32(S.egg.id + ':soul') : 0;
    return V;
  };
  function withEdit(S, e) {
    var ed = S.jedit[e.id];
    return ed ? Object.assign({}, e, { data: { text: ed.text }, edited: ed.t }) : e;
  }

  C.setting = function (S, k, dflt) { return S.settings[k] ? S.settings[k].v : dflt; };

  // Tasks that happen on a given day, sorted by time.
  C.occurrences = function (S, day) {
    var wd = U.weekday(day), out = [];
    Object.keys(S.tasks).forEach(function (key) {
      var t = S.tasks[key];
      if (t.off || !t.title) return;
      var on = false;
      switch (t.repeat) {
        case 'daily': on = true; break;
        case 'weekdays': on = wd >= 1 && wd <= 5; break;
        case 'weekends': on = wd === 0 || wd === 6; break;
        case 'days': on = (t.days || []).indexOf(wd) >= 0; break;
        default: on = t.date === day;
      }
      if (!on) return;
      var m = U.hmToMin(t.time);
      if (m === null) return;
      out.push({ key: key, title: t.title, time: t.time, min: m, day: day, repeat: t.repeat, routine: t.routine, kind: t.kind,
        done: !!S.done[key + '|' + day], dn: t.dn, dev: t.dev, t: t.t });
    });
    return out.sort(function (a, b) { return a.min - b.min || (a.title < b.title ? -1 : 1); });
  };

  C.listItems = function (S, list) {
    var L = S.lists[list || 'shopping'] || {};
    return Object.keys(L).map(function (k) { return L[k]; }).filter(function (r) { return !r.removed; })
      .sort(function (a, b) { return (a.done - b.done) || a.t - b.t; });
  };
  C.questList = function (S, state) {
    return Object.keys(S.quests).map(function (k) { return S.quests[k]; }).filter(function (q) { return q.title && (state ? q.state === state : q.state !== 'deleted'); })
      .sort(function (a, b) { return a.first - b.first; });
  };
  C.questSteps = function (S, q) {
    return (q.steps || []).map(function (s) { var st = S.qsteps[q.key + '|' + s.id]; return { id: s.id, title: s.title, done: !!(st && st.done) }; });
  };
  C.nextStep = function (S, q) { var s = C.questSteps(S, q).filter(function (x) { return !x.done; }); return s[0] || null; };
  C.questNotes = function (S, key) { var N = (S.qnotes || {})[key] || {}; return Object.keys(N).map(function (k) { return N[k]; }).filter(function (n) { return n.text && !n.removed; }).sort(cmpT); };
  // A topic page's current answers: {who: {a, t, checked, hist: [older answers]}, ...}
  C.topicFacts = function (S, key) {
    var rec = (S.topics || {})[key], out = {};
    if (!rec) return out;
    Object.keys(rec.ans).forEach(function (w) {
      var rem = rec.remAt[w] || 0, list = rec.ans[w].filter(function (x) { return x.t > rem; });
      if (!list.length) return;
      var cur = list[list.length - 1];
      out[w] = { a: cur.a, t: cur.t, id: cur.id, q: cur.q, checked: Math.max(cur.t, rec.checked[w] || 0), hist: list.slice(0, -1).reverse() };
    });
    return out;
  };
  C.topicLogs = function (S, key) {
    var rec = (S.topics || {})[key];
    return rec ? Object.keys(rec.logs).map(function (k) { return rec.logs[k]; }).filter(function (l) { return Object.keys(l.a).length; }).sort(function (a, b) { return b.t - a.t; }) : [];
  };
  C.topicList = function (S) {
    var T = S.topics || {};
    return Object.keys(T).map(function (k) { return T[k]; }).filter(function (r) { return r.title && !r.hidden; }).sort(function (a, b) { return b.t - a.t; });
  };
  // The quest you're tracking (Settings value 'track'), if it's still active.
  C.tracked = function (S) { var k = C.setting(S, 'track', null), q = k && S.quests[k]; return q && q.state === 'active' && q.title ? q : null; };

  // A readable summary, saved to the server and into capsules so any future shell can read it.
  C.snapshot = function (V) {
    return {
      format: 'aiu-totem/2', name: V.totemName, egg_id: V.egg ? V.egg.id : null, laid: V.egg ? new Date(V.egg.t).toISOString() : null,
      hatched: V.hatched, stage: V.stage, stage_name: C.stageName(V.stage), growth: V.growth.confirmed, coins: V.coins,
      forms: V.forms.map(function (f) { return { stage: f.stage, name: C.stageName(f.stage), seed: f.seed, date: new Date(f.t).toISOString(), words: f.words }; }),
      skin: C.setting(V, 'skin', 'current'), house: C.setting(V, 'house', 'cabin'), biome: C.setting(V, 'biome', 'meadow'),
      call_me: V.callMe, unlocked: Object.keys(V.unlocked), owned: Object.keys(V.owned), events: V.total
    };
  };

  // Rebuild everything from a full list of events (imports, tests, upgrades).
  C.replay = function (events) {
    var S = C.newState();
    events.slice().sort(function (a, b) { return (a.ls || 0) - (b.ls || 0) || cmpT(a, b); }).forEach(function (e) { C.apply(S, e); });
    events.filter(function (e) { return e.seq; }).sort(function (a, b) { return a.seq - b.seq; }).forEach(function (e) { C.confirm(S, e); });
    return S;
  };
})();
