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

  C.VERSION = 13; // 2.7.0: 13 = no Good Star multiplier (from C.T270), and game wins pay tokens by stars (2 a star, 30 a day).
  // was: C.VERSION = 12; // 2.6.0: 12 = the allowance (10 a day, +25 the first day of each week), Good Stars (x1 to x2 on earned tokens) and treats ('tspend').
  // was: C.VERSION = 11; // 2.5.0: 11 = tokens (every growth point from 2.5.0 on also drops a token in your wallet) and the token shop.
  // was: C.VERSION = 10; // 2.4.0: 10 = the dice-roll games (first win of each game a day +3, beating today's score +1, twice) and the joy streak (x2).
  // was: C.VERSION = 9; // 2.2.0: 9 = building lessons (+3 once a day per building).
  // was: C.VERSION = 8; // 2.1.6: 8 = Vitals wear down; distressed = no growth (the old Go/Brake quarter-speed rule is gone). 7: 2.1.5: 7 = vitals, and removed GABA entries leave the growth tally.  2.0.8: 5 = game wins (capped). 2.0.6: 4 = finishes and steps pay once (growth rebuilds). 2.0.3: 3 = knows tiles; an older checkpoint rebuilds once from every stored event (a 1.x device may have skipped tile events)
  C.HATCH_MS = 0;        // the egg cracks open when you tap Begin
  C.DAILY_CAP = 30;      // growth per day
  C.T240 = 1792022400000; // 2.4.0 rules start (2026-10-15 UTC): older events keep the old rules, so past growth never changes
  C.T250 = 1792065600000; // 2.5.0: tokens start (2026-10-15 12:00 UTC). The joy streak's x2 stops here.
  C.TOK_START = 100;      // 2.5.0: every wallet starts with 100 tokens
  C.ALLOW_DAY = 10; C.ALLOW_WEEK = 25; // 2.6.0: the allowance: 10 tokens a day you open Aiu, +25 on the first of them each week
  C.STAR_NEED = 10;       // 2.6.0: a Good Star day = at least 10 growth earned that day (care, tiles, check-ins, writing, games)
  C.STAR_MULT = [1, 1.25, 1.5, 1.75, 2]; // Good Star levels: each Good Star day steps up, each missed day steps down one
  C.T270 = 1792083600000; // 2.7.0 rules start (2026-10-15 17:00 UTC): no multiplier; game tokens
  C.GAME_TOK = 2; C.GAME_TOK_CAP = 30; // 2.7.0: a won game pays 2 tokens a star (up to 6), at most 30 a day from games
  C.TOK_EARN_CAP = 60;    // earned tokens a day, at most (the allowance is on top)
  function wk(day) { var d = U.dayToDate(day), w = (d.getDay() + 6) % 7; d.setDate(d.getDate() - w); return U.dayStr(d); } // the Monday of that week
  C.weekOf = wk;
  C.OFFLINE_MS = 5 * 60 * 1000; // events that waited longer than this on a device count as "offline"
  C.KEEP_DAYS = 60;      // growth bookkeeping kept per day (older days are folded away)
  C.STAGE_NAMES = ['Egg', 'Hatchling', 'Sprout', 'Scout', 'Ranger', 'Guardian', 'Elder', 'Totem'];
  C.stageName = function (s) { return s < C.STAGE_NAMES.length ? C.STAGE_NAMES[s] : 'Totem ' + (s - C.STAGE_NAMES.length + 2); };
  C.thresholdFor = function (stage) { // total growth needed to reach a stage
    var t = [0, 0, 100, 300, 600, 1000, 1500, 2100];
    return stage < t.length ? t[stage] : 2100 + (stage - 7) * 700;
  };
  C.formSeed = function (eggId, stage) { return U.hash32(eggId + ':form:' + stage); };
  // 2.1.7: evolutions from now on roll a new look (same species, its own colors, markings and shape), nudged by his strongest
  // Vitals part at that moment. Forms he already grew into stay exactly as they were.
  C.VARIATION_FROM = Date.UTC(2026, 9, 11);
  C.formSeedAt = function (eggId, c) { return c.vk && c.t >= C.VARIATION_FROM ? U.hash32(eggId + ':form:' + c.stage + ':' + c.vk + ':' + Math.floor(c.t / 86400000)) : C.formSeed(eggId, c.stage); };
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
      tok: 0, tokSpent: 0, tokOwned: {}, tokDays: {}, tokBuys: [],
      allowDays: {}, allowWeeks: {}, stars: { lv: 0, last: '' }, tokEarn: {}, treats: [],
      topics: {}, traits: { quiz: {}, nudge: {}, resetT: 0 }, reviews: {}, ptypes: [], jpages: {},
      g: { total: 0, next: 2, cross: [], days: {}, seen: {}, grp: null, room: 0, foldDay: '' },
      lex: {}, lib: {}
    };
  };

  C.pointsFor = function (e) {
    var d = e.data || {}, txt = textOf(e);
    switch (e.type) {
      case 'journal': return txt.length >= 80 && !(e.d && e.t && e.d < new Date(e.t - 36e5 * 14).toISOString().slice(0, 10)) ? 10 : 0; // 2.2.0: writing on an earlier day's page doesn't grow Aiu (only today's). UTC-based so every device agrees
      case 'say': return (txt.length >= 60 && txt.split(/\s+/).length >= 10) ? 5 : 0;
      case 'remember': return txt.length >= 12 ? 3 : 0;
      case 'learn': case 'fact': case 'teach': return 3;
      case 'entity': return d.taught ? 3 : 0;
      case 'quest_step': return d.done ? 2 : 0;
      case 'tile_done': return d.undone ? 0 : 5; // 2.0: finishing a tile (the whole puzzle)
      case 'topic': return (d.a && !d.confirm && !d.removed && String(d.a).length >= 2) ? 2 : 0; // teaching Aiu about you
      case 'jpage': return txt.length >= 80 ? 10 : txt.length >= 20 ? 3 : 0; // writing on your Hilltop journal page
      case 'gaba': return d.kind === 'calm' && !d.ref && !d.removed ? 2 : 0; // doing something calming (the Brake) helps Aiu grow too
      case 'pref': return d.v && d.v !== 'skip' ? 2 : 0;
      case 'vitals': return 10; // 2.1.6: Aiu Vitals full (90%+) (once a day: see growthStep)
      case 'game': return d.win ? 1 : 0; // 2.0.8: a mini game win (at most 3 a day count: see growthStep)
      case 'lesson': return 3; // 2.2.0: a lesson at one of the buildings (once a day per building: see growthStep)
      case 'pet': return 1; // 10 pets (the app sends at most 3 a day) // 1.1.0: answering one of Aiu's 21 Questions (a puzzle piece)
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
  /* ---------- 2.1.6: Aiu Vitals: five body parts that wear down over time; your calm check-ins fill them ----------
     One copy of the math, used by the growth engine (below) and the Vitals screen (vitals.js), so they always agree. */
  C.VIT = { SYS: ['brain', 'heart', 'move', 'gut', 'rest'], START: 70, GAIN: 50, RATE: 45 / 24, DISTRESS: 25, FULL: 90, GRACE: 3 * 86400000 }; // RATE: points lost per hour. 2.1.7: GRACE: a new Totem can't be distressed in its first 3 days
  C.vitInit = function (t) { var v = {}; C.VIT.SYS.forEach(function (k) { v[k] = { l: C.VIT.START, t: t }; }); return v; };
  C.vitLevel = function (v, k, t) { var x = v[k]; return x ? Math.max(0, Math.min(100, x.l - C.VIT.RATE * Math.max(0, t - x.t) / 3600000)) : 0; };
  C.vitAdd = function (v, k, t, n) { if (v[k]) v[k] = { l: Math.max(0, Math.min(100, C.vitLevel(v, k, t) + n)), t: t }; };
  C.vitAvg = function (v, t) { var s = 0; C.VIT.SYS.forEach(function (k) { s += C.vitLevel(v, k, t); }); return s / C.VIT.SYS.length; };
  C.vitSys = function (d) { return d && d.sys && C.VIT.SYS.indexOf(d.sys) >= 0 ? d.sys : (AIU.vitals && AIU.vitals.sysOf ? AIU.vitals.sysOf(d && d.item) : 'brain'); };
  C.apply = function (S, e) {
    var d = e.data || {}, m = meta(e), key, rec, list;
    if (e.ls && e.ls > S.ls) S.ls = e.ls;
    S.events++;
    if (e.t && (!S.t0 || e.t < S.t0)) S.t0 = e.t; // 2.1.6: when this Totem began (the Vitals clock starts here)
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
      case 'journal_edit': case 'line_edit': if (d.ref && newer(m, S.jedit[d.ref])) S.jedit[d.ref] = Object.assign({ text: String(d.text || '') }, m); break; // line_* = a chat line (1.1.0)
      case 'journal_hide': case 'line_hide': if (d.ref && newer(m, S.jhide[d.ref])) S.jhide[d.ref] = Object.assign({ v: d.hidden !== false }, m); break;
      case 'quest_set':
        if (!d.key) break;
        rec = S.quests[d.key] || (S.quests[d.key] = { key: d.key, state: 'active', first: e.t });
        if (newer(m, rec.setM)) { ['title', 'why', 'subject', 'tip', 'due'].forEach(function (f) { rec[f] = d[f]; }); rec.kind = d.kind === 'side' || d.kind === 'idea' ? d.kind : 'main'; rec.steps = (d.steps || []).slice(0, 80); /* 2.4.0: room for a long grocery list (it was 30, and new items quietly didn't stick) */ rec.setM = m; rec.dn = e.dn; }
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
      case 'tile': // 2.0: a quest is a tile on the board. Its pieces (status, when, who, how long, account, calm) merge one field at a time; newest wins per field
        if (!d.key || !d.set || typeof d.set !== 'object') break;
        rec = S.quests[d.key] || (S.quests[d.key] = { key: d.key, state: 'active', first: e.t });
        rec.tile = rec.tile || {}; rec.tileM = rec.tileM || {};
        Object.keys(d.set).forEach(function (f) { if (!/^(status|when|who|dur|acct|calm|rule|kind)$/.test(f)) return; if (newer(m, rec.tileM[f])) { rec.tile[f] = d.set[f]; rec.tileM[f] = m; } });
        break;
      case 'vitals': if (d.day) { var VT = S.vitals || (S.vitals = {}); if (!VT[d.day]) VT[d.day] = { t: e.t }; } break; // 2.1.5: the day's Vitals hit 100%
      case 'tile_done': // 2.0: one finish of a tile (a repeating tile has one per day, week, month or year); undone:true takes it back
        if (!d.key || !d.p) break;
        var TD = S.tdone || (S.tdone = {}), tk = d.key + '|' + d.p;
        if (newer(m, TD[tk])) TD[tk] = Object.assign({ done: !d.undone, items: Array.isArray(d.items) ? d.items.slice(0, 40) : undefined, steps: Array.isArray(d.steps) ? d.steps.slice(0, 80) : undefined, list: Array.isArray(d.list) ? d.list.slice(0, 80) : undefined, last: d.last ? String(d.last).slice(0, 40) : undefined }, m);
        break;
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
      /* ---------- 1.1.0: list labels, GABA, planner, business folders, accounts vault ---------- */
      case 'list_meta': // a list's own name, kind (shopping / to-do) and whether it's hidden; newest wins
        key = String(d.list || '').toLowerCase(); if (!key) break;
        var LM = S.listMeta || (S.listMeta = {});
        if (newer(m, LM[key])) LM[key] = Object.assign({ title: String(d.title || key).slice(0, 40), kind: d.kind === 'shopping' ? 'shopping' : 'todo', hidden: !!d.hidden, order: +d.order || 0 }, m);
        break;
      case 'list_label': // which store / label an item belongs to (the shopping list splits by store)
        list = String(d.list || 'shopping').toLowerCase(); key = Wd.clean(d.item).toLowerCase(); if (!key) break;
        S.lists[list] = S.lists[list] || {};
        rec = S.lists[list][key] || (S.lists[list][key] = { item: Wd.clean(d.item), done: false, removed: false, t: 0 });
        if (newer(m, rec.labelM)) { rec.labelM = m; rec.label = String(d.label || '').slice(0, 30); }
        break;
      case 'vcustom': // 2.2.0: your own Vitals calm thing (a label and the body part it heals); newest wins
        if (!d.key) break;
        var VC = S.vcustom || (S.vcustom = {});
        if (newer(m, VC[d.key])) VC[d.key] = Object.assign({ key: String(d.key).slice(0, 30), label: String(d.label || '').slice(0, 50), sys: C.VIT.SYS.indexOf(d.sys) >= 0 ? d.sys : 'brain', removed: !!d.removed }, m);
        break;
      case 'place': // 2.2.0: the buildings (garage, barn, greenhouse, lab): one small value per key, newest wins
        if (!d.b || !d.k) break;
        var PLB = (S.places || (S.places = {}))[d.b] || (S.places[d.b] = {}), pkk = String(d.k).slice(0, 60);
        if (newer(m, PLB[pkk])) PLB[pkk] = Object.assign({ v: d.v === undefined ? null : d.v }, m);
        break;
      case 'lesson': var LS = S.lessons || (S.lessons = {}), lsk = String(d.b || '').slice(0, 20) + '|' + dayOf(e); LS[lsk] = (LS[lsk] || 0) + 1; break;
      case 'pet': var PD = S.petDays || (S.petDays = {}), pdk = dayOf(e); PD[pdk] = (PD[pdk] || 0) + 1; break; // 2.1.5: the 3-a-day pet points, on every device
      case 'game': if (d.g && isFinite(+d.score)) { var GB0 = S.gbest || (S.gbest = {}); if (+d.score > (GB0[d.g] || 0)) GB0[d.g] = +d.score; } break; // 2.1.5: best scores sync
      case 'pref': // 1.1.0: an answer to Aiu's 21 Questions (does lavender calm you? does scrolling rev you up? a personality either/or)
        if (!d.item) break;
        var PF = S.prefs || (S.prefs = {}), pk = String(d.item).slice(0, 80);
        if (newer(m, PF[pk])) PF[pk] = Object.assign({ kind: String(d.kind || '').slice(0, 12), v: String(d.v || '').slice(0, 12) }, m);
        break;
      case 'gaba': // you did something calming (brake) or something that revs you up (go)
        var GB = S.gaba || (S.gaba = {}), GR = S.gabaRem || (S.gabaRem = {});
        if (d.ref) { // undo / delete a log line (kept as a tombstone, so the order events arrive in doesn't matter)
          if (newer(m, GR[d.ref])) GR[d.ref] = Object.assign({ v: !!d.removed }, m);
          if (GB[d.ref]) GB[d.ref].removed = GR[d.ref].v;
          break;
        }
        if (!GB[e.id]) GB[e.id] = { id: e.id, t: e.t, d: dayOf(e), kind: d.kind === 'stress' ? 'stress' : d.kind === 'mixed' ? 'mixed' : 'calm', item: String(d.item || '').slice(0, 60), note: String(d.note || '').slice(0, 300),
          pts: Math.max(-30, Math.min(30, +d.pts || 0)), goal: !!d.goal, removed: !!(GR[e.id] && GR[e.id].v), sys: C.VIT.SYS.indexOf(d.sys) >= 0 ? d.sys : undefined }; // 2.1.6: sys = the Vitals body part it fed
        pruneGaba(S);
        break;
      case 'plan': // a planner entry: event, bill, income, expense, goal or note (newest wins)
        if (!d.key) break;
        var PL = S.plans || (S.plans = {});
        rec = PL[d.key];
        if (!rec || newer(m, rec.m)) {
          PL[d.key] = { key: d.key, m: m, kind: String(d.kind || 'event').slice(0, 12), title: String(d.title || '').slice(0, 80), date: String(d.date || '').slice(0, 10), time: String(d.time || '').slice(0, 5),
            amount: isFinite(+d.amount) ? Math.round(+d.amount * 100) / 100 : 0, repeat: String(d.repeat || 'once').slice(0, 10), folder: String(d.folder || '').slice(0, 30), cat: String(d.cat || '').slice(0, 30),
            notes: String(d.notes || '').slice(0, 2000), removed: !!d.removed, first: rec ? rec.first : e.t, done: !!d.done };
        }
        break;
      case 'plan_paid': // a bill marked paid for one period ("2026-10"), or a planner item checked off on a day
        if (!d.key || !d.period) break;
        var PP = S.planPaid || (S.planPaid = {}), pk = d.key + '|' + d.period;
        if (newer(m, PP[pk])) PP[pk] = Object.assign({ v: d.paid !== false }, m);
        break;
      case 'pdoc': // a business folder document (its sections come in psec events)
        if (!d.key) break;
        var PD = S.pdocs || (S.pdocs = {});
        rec = PD[d.key];
        if (!rec || newer(m, rec.m)) PD[d.key] = { key: d.key, m: m, folder: String(d.folder || 'My business').slice(0, 40), title: String(d.title || 'Untitled').slice(0, 80), kind: String(d.kind || 'notes').slice(0, 20),
          order: (d.order || []).slice(0, 80).map(String), removed: !!d.removed, first: rec ? rec.first : e.t };
        break;
      case 'psec': // one section of a business document; newest wins
        if (!d.doc || !d.sid) break;
        var PSx = S.psecs || (S.psecs = {}), sk = d.doc + '|' + d.sid;
        if (newer(m, PSx[sk])) PSx[sk] = Object.assign({ h: String(d.h || '').slice(0, 80), text: String(d.text || '').slice(0, 15000) }, m);
        break;
      case 'acct': // one card in the Accounts phone book (newest wins; removed = deleted, with undo)
        if (!d.key) break;
        var AC = S.accts || (S.accts = {});
        if (newer(m, AC[d.key])) AC[d.key] = Object.assign({ card: d.removed ? (AC[d.key] && AC[d.key].card) || null : (d.card || null), removed: !!d.removed }, m);
        break;
      /* ---------- Career (resume builder, outreach package, outreach list); newest wins everywhere ---------- */
      case 'cv': // one resume field (name, headline, summary, skills...)
        if (!d.f) break;
        var CV = S.cv || (S.cv = {}), cf = String(d.f).slice(0, 20);
        if (newer(m, CV[cf])) CV[cf] = Object.assign({ v: String(d.v || '').slice(0, 6000) }, m);
        break;
      case 'cv_item': case 'cv_doc': case 'cv_target': // a job / school / project, a draft (pitch, email, letter), or someone you're reaching out to
        if (!d.key) break;
        var CB = e.type === 'cv_item' ? (S.cvItems || (S.cvItems = {})) : e.type === 'cv_doc' ? (S.cvDocs || (S.cvDocs = {})) : (S.cvTargets || (S.cvTargets = {}));
        if (newer(m, CB[d.key])) { var cx = {}; Object.keys(d).forEach(function (k2) { var v2 = d[k2]; cx[k2] = typeof v2 === 'string' ? v2.slice(0, 8000) : v2; }); CB[d.key] = Object.assign(cx, { m: m, t: e.t, removed: !!d.removed }); }
        break;
      case 'vault': // (early 1.1.0 test builds only: a PIN-locked card; kept so old test data still loads) (the server only ever sees scrambled data)
        if (!d.key) break;
        var VA = S.vault || (S.vault = {});
        if (newer(m, VA[d.key])) VA[d.key] = Object.assign({ iv: String(d.iv || ''), ct: String(d.ct || ''), removed: !!d.removed, gen: +d.gen || 0 }, m);
        break;
      case 'dfile': // 2.5.0: Accounts > Docs: one file or folder. Synced, it's scrambled (iv/ct) like an account card; device-only, it's plain (p)
        if (!d.key) break;
        var DF = S.dfiles || (S.dfiles = {});
        if (newer(m, DF[d.key])) DF[d.key] = Object.assign({ iv: String(d.iv || ''), ct: String(d.ct || ''), p: d.p && typeof d.p === 'object' ? d.p : null, removed: !!d.removed, gen: +d.gen || 0 }, m);
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
  // GABA log lines older than ~13 months fold into running totals, so the checkpoint stays small on a Pi.
  function pruneGaba(S) {
    var GB = S.gaba, ids = Object.keys(GB);
    if (ids.length < 1600) return;
    var A = S.gabaAgg || (S.gabaAgg = { calmN: 0, calmPts: 0, stressN: 0, goalN: 0 });
    ids.sort(function (a, b) { return GB[a].t - GB[b].t; }).slice(0, ids.length - 1400).forEach(function (id) {
      var g = GB[id];
      if (!g.removed) { if (g.kind === 'calm') { A.calmN++; A.calmPts += Math.max(0, g.pts); if (g.goal) A.goalN++; } else if (g.kind === 'stress') A.stressN++; }
      delete GB[id]; if (S.gabaRem) delete S.gabaRem[id];
    });
  }
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
    var day = dayOf(e), d0 = e.data || {}, GA = AIU.gaba;
    // 1.1.0: a running Go/Brake tally per day (only what's confirmed, in order, so every device agrees)
    if (e.type === 'gaba' && !d0.ref && !d0.removed && isFinite(+d0.pts)) { g.gb = g.gb || {}; g.gb[day] = (g.gb[day] || 0) + (+d0.pts); g.gbe = g.gbe || {}; g.gbe[e.id] = { d: day, p: +d0.pts, on: true }; }
    if (e.type === 'gaba' && d0.ref && g.gbe && g.gbe[d0.ref]) { var ge = g.gbe[d0.ref], on = !d0.removed; if (ge.on !== on) { g.gb[ge.d] = (g.gb[ge.d] || 0) + (on ? ge.p : -ge.p); ge.on = on; } } // 2.1.5: removing an entry takes it out of the tally too
    // 2.1.6: Vitals: calm check-ins fill a body part; time wears them down
    if (!g.vit) { g.vit = C.vitInit(e.t); g.vitT0 = e.t; }
    if (e.type === 'gaba' && d0.kind === 'calm' && !d0.ref && !d0.removed) { var vk0 = C.vitSys(d0); C.vitAdd(g.vit, vk0, e.t, C.VIT.GAIN); g.vitE = g.vitE || {}; g.vitE[e.id] = { k: vk0, d: day, on: true }; }
    if (e.type === 'gaba' && d0.ref && g.vitE && g.vitE[d0.ref]) { var ve = g.vitE[d0.ref], von = !d0.removed; if (ve.on !== von) { C.vitAdd(g.vit, ve.k, e.t, von ? C.VIT.GAIN : -C.VIT.GAIN); ve.on = von; } }
    var p = C.pointsFor(e);
    if (!p) return 0;
    // distressed (Vitals worn down): Aiu carries on, but doesn't grow until you check in some calm things (the check-ins themselves still count)
    if (!(e.type === 'gaba' && d0.kind === 'calm') && e.type !== 'vitals' && e.t - (g.vitT0 || 0) > C.VIT.GRACE && C.vitAvg(g.vit, e.t) < C.VIT.DISTRESS) return 0;
    // 2.0.6: a finish or a step pays once. Undo and redo (Start it again, Not done after all, unchecking a step) earns nothing more
    var once = e.type === 'tile_done' ? day + '|T|' + d0.key + '|' + d0.p : e.type === 'quest_step' ? day + '|S|' + d0.key + '|' + d0.step + '|' + (d0.p || '') : null;
    if (once) { if (g.seen[once]) return 0; g.seen[once] = 1; }
    if (e.type === 'pref' && d0.item) { g.pp = g.pp || {}; if (g.pp[d0.item]) return 0; g.pp[d0.item] = 1; } // 2.1.9: an answer pays +2 once; changing it later earns nothing more
    if (e.type === 'lesson') { var lk = day + '|L|' + String(d0.b || ''); if (g.seen[lk]) return 0; g.seen[lk] = 1; } // 2.2.0: +3 once a day per building
    if (e.type === 'vitals') { var vk = day + '|V'; if (g.seen[vk]) return 0; g.seen[vk] = 1; }
    if (e.type === 'game' && e.t >= C.T240) { // 2.4.0: the first win of each game today +3; a replay pays +1 only when it beats today's score (twice a game a day)
      var gg = day + '|G|' + String(d0.g || ''), sc0 = +d0.score || 0; g.gs = g.gs || {};
      if (g.gs[gg] === undefined) { g.gs[gg] = sc0; p = 3; }
      else { if (sc0 <= g.gs[gg]) return 0; g.gs[gg] = sc0; var bk = gg + '|b'; if ((g.seen[bk] || 0) >= 2) return 0; g.seen[bk] = (g.seen[bk] || 0) + 1; p = 1; }
    } else if (e.type === 'game') { var gk = day + '|G'; if ((g.seen[gk] || 0) >= 3) return 0; g.seen[gk] = (g.seen[gk] || 0) + 1; } // 2.0.8: 3 game wins a day grow Aiu, no more
    if (d0.x2 && e.t >= C.T240 && e.t < C.T250) p *= 2; // 2.4.0: the joy streak (the daily cap still holds); retired in 2.5.0 (tokens instead)
    var txt = textOf(e).toLowerCase().replace(/\s+/g, ' ');
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
    if (g.gb) Object.keys(g.gb).forEach(function (d) { if (d < cut) delete g.gb[d]; });
    if (g.gbe) Object.keys(g.gbe).forEach(function (k) { if (g.gbe[k].d < cut) delete g.gbe[k]; });
    if (g.vitE) Object.keys(g.vitE).forEach(function (k) { if (g.vitE[k].d < cut) delete g.vitE[k]; });
    Object.keys(g.seen).forEach(function (k) { if (k.slice(0, 10) < cut) delete g.seen[k]; });
  }
  // 2.6.0: Good Stars. Moving to a new day settles the days in between: a day with C.STAR_NEED growth steps the level up
  // (to 4 = x2), a day without steps it down one (never below 0). The same on every device (event days, server order).
  function starsTo(S, day) {
    var st = S.stars || (S.stars = { lv: 0, last: '' });
    if (!st.last) { st.last = day; return; }
    if (day <= st.last) return;
    var d = st.last, n = 0;
    while (d < day && n++ < 60) { var got = (S.g.days[d] || 0) >= C.STAR_NEED; st.lv = got ? Math.min(4, st.lv + 1) : Math.max(0, st.lv - 1); d = U.addDays(d, 1); }
    st.last = day;
  }
  C.starsTo = starsTo;
  C.confirm = function (S, e) {
    if (!e.seq || e.seq <= S.W) return;
    S.W = e.seq;
    var g = S.g, day = dayOf(e);
    fold(g, day);
    var offline = !e.imp && (e.off === 1 || (e.rt && (e.rt - e.t) > C.OFFLINE_MS)); // 2.2.0: imported history isn't an offline trip
    var raw = growthStep(g, e);
    if (raw) {
      var gain = raw;
      if (offline) { // points earned away from the Poke Center can fill the bar once, not more, per trip
        var gk = (e.dev || '') + '|' + e.rt;
        if (g.grp !== gk) { g.grp = gk; g.room = C.thresholdFor(g.next) - g.total; }
        gain = Math.max(0, Math.min(gain, g.room)); g.room -= gain;
      } else g.grp = null;
      g.total += gain;
      if (e.t >= C.T250 && gain > 0 && !e.imp && e.type !== 'dev_growth') { // 2.6.0: times your Good Star multiplier, up to 60 a day
        starsTo(S, day); S.tokEarn = S.tokEarn || {};
        var mul = e.t >= C.T270 ? 1 : (C.STAR_MULT[(S.stars && S.stars.lv) || 0] || 1), /* 2.7.0: no multiplier any more */ tk = Math.max(0, Math.min(Math.round(gain * mul), C.TOK_EARN_CAP - (S.tokEarn[day] || 0)));
        if (tk) { S.tok = (S.tok || 0) + tk; S.tokDays = S.tokDays || {}; S.tokDays[day] = (S.tokDays[day] || 0) + tk; S.tokEarn[day] = (S.tokEarn[day] || 0) + tk; }
      } // 2.5.0: each growth point is a token too (2.6.0: not test growth, not events brought in from a capsule)
      while (g.total >= C.thresholdFor(g.next)) {
        var vk = null; if (g.vit) C.VIT.SYS.forEach(function (k0) { if (!vk || C.vitLevel(g.vit, k0, e.t) > C.vitLevel(g.vit, vk, e.t)) vk = k0; }); // 2.1.7: his strongest Vitals part when he evolves
        g.cross.push({ stage: g.next, t: e.t, words: topWords(S), points: g.total, vk: vk });
        g.next++;
      }
    }
    if (e.type === 'game' && !e.imp && e.t >= C.T270 && e.data && e.data.win) { // 2.7.0: a win pays tokens by its stars
      S.gameTok = S.gameTok || {}; S.tokEarn = S.tokEarn || {};
      var gt = Math.max(0, Math.min(3, +e.data.stars || 1)) * C.GAME_TOK; gt = Math.max(0, Math.min(gt, C.GAME_TOK_CAP - (S.gameTok[day] || 0), C.TOK_EARN_CAP - (S.tokEarn[day] || 0)));
      if (gt) { S.gameTok[day] = (S.gameTok[day] || 0) + gt; S.tokEarn[day] = (S.tokEarn[day] || 0) + gt; S.tok = (S.tok || 0) + gt; S.tokDays = S.tokDays || {}; S.tokDays[day] = (S.tokDays[day] || 0) + gt; }
    }
    if (e.type === 'allow' && !e.imp) { // 2.6.0: the allowance, once a day; the day is checked against the server's clock (up to a week back)
      var sday = U.dayStr(new Date(e.rt || e.t)), ad = (e.data && e.data.day) || day;
      S.allowDays = S.allowDays || {}; S.allowWeeks = S.allowWeeks || {};
      if (/^\d{4}-\d{2}-\d{2}$/.test(ad) && ad <= U.addDays(sday, 1) && ad >= U.addDays(sday, -7) && !S.allowDays[ad]) {
        var amt = C.ALLOW_DAY, wkk = wk(ad); if (!S.allowWeeks[wkk]) { S.allowWeeks[wkk] = 1; amt += C.ALLOW_WEEK; }
        S.allowDays[ad] = amt; S.tok = (S.tok || 0) + amt; S.tokDays = S.tokDays || {}; S.tokDays[ad] = (S.tokDays[ad] || 0) + amt;
      }
    }
    if (e.type === 'tspend' && !e.imp) { // 2.6.0: a treat (used up): fireworks, a party, a fancy snack
      var ts = e.data || {}, tpr = Math.max(0, +ts.price || 0), hv = C.TOK_START + (S.tok || 0) - (S.tokSpent || 0);
      S.treats = S.treats || [];
      if (ts.what && hv >= tpr) { S.tokSpent = (S.tokSpent || 0) + tpr; S.treats.push({ t: e.t, what: String(ts.what).slice(0, 30), price: tpr, day: day }); if (S.treats.length > 200) S.treats.shift(); }
    }
    if (e.type === 'tbuy' && !e.imp) { // 2.5.0 (2.6.0: a purchase inside an imported capsule doesn't spend here): something from the token shop (only if the wallet holds enough when the server sees it)
      var tb = e.data || {}, tp = Math.max(0, +tb.price || 0), have = C.TOK_START + (S.tok || 0) - (S.tokSpent || 0);
      S.tokOwned = S.tokOwned || {}; S.tokBuys = S.tokBuys || [];
      if (tb.item && !S.tokOwned[tb.item] && have >= tp) { S.tokOwned[tb.item] = { t: e.t, price: tp }; S.tokSpent = (S.tokSpent || 0) + tp; S.tokBuys.push({ t: e.t, item: String(tb.item).slice(0, 40), price: tp, day: day }); }
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
      'quests', 'qsteps', 'tdone', 'vitals', 'petDays', 'gbest', 't0', 'recaps', 'owned', 'lex', 'lib', 'habits', 'jedit', 'jhide'].forEach(function (k) { V[k] = S[k]; });
    V.taught = S.taught || [];
    V.qnotes = S.qnotes || {};
    V.topics = S.topics || {}; V.reviews = S.reviews || {}; V.jpages = S.jpages || {}; V.ptypes = S.ptypes || []; V.traits = traits(S);
    var lastPt = V.ptypes.length ? V.ptypes[V.ptypes.length - 1].code : null;
    V.ptype = AIU.persona ? AIU.persona.compute(Object.assign({ lastCode: lastPt }, V.traits)) : { code: null, answered: 0 };
    V.tasks = {};
    Object.keys(S.tasks).forEach(function (k) { if (S.tasks[k].title) V.tasks[k] = S.tasks[k]; });
    V.chat = S.recent.filter(function (e) { return !(S.jhide[e.id] && S.jhide[e.id].v); }).map(function (e) { return withEdit(S, e); }); // 1.1.0: any line can be edited or deleted
    V.vcustom = S.vcustom || {}; V.places = S.places || {}; V.lessons = S.lessons || {}; // 2.2.0
    V.listMeta = S.listMeta || {}; V.prefs = S.prefs || {}; V.gaba = S.gaba || {}; V.gabaAgg = S.gabaAgg || { calmN: 0, calmPts: 0, stressN: 0, goalN: 0 };
    V.plans = S.plans || {}; V.planPaid = S.planPaid || {}; V.pdocs = S.pdocs || {}; V.psecs = S.psecs || {}; V.vault = S.vault || {}; V.dfiles = S.dfiles || {}; V.accts = S.accts || {}; V.cv = S.cv || {}; V.cvItems = S.cvItems || {}; V.cvDocs = S.cvDocs || {}; V.cvTargets = S.cvTargets || {};
    V.journal = S.journals.filter(function (e) { return !(S.jhide[e.id] && S.jhide[e.id].v); }).map(function (e) { return withEdit(S, e); });
    V.total = S.events; V.unsent = unsent.length;
    var set = function (k, dflt) { return S.settings[k] ? S.settings[k].v : dflt; };
    V.totemName = set('totemName', S.egg ? S.egg.name : 'Aiu');
    V.callMe = opts.username ? (opts.display && opts.display.toLowerCase() === String(opts.username).toLowerCase() ? opts.display : Wd.cap(opts.username)) : set('callMe', 'friend'); V.nameIsUser = !!opts.username; // 2.5.0: signed in, Aiu calls you by your username
    if (S.egg) {
      V.hatchAt = S.egg.t + (S.egg.wait || C.HATCH_MS);
      if (S.rush !== null && S.rush >= S.egg.t) V.hatchAt = Math.min(V.hatchAt, S.rush);
      V.hatched = now >= V.hatchAt;
    } else { V.hatchAt = null; V.hatched = false; }
    // growth still waiting for the server, worked out on a scratch copy of the day counters
    var g = S.g, scratch = { days: Object.assign({}, g.days), seen: Object.assign({}, g.seen), gb: Object.assign({}, g.gb || {}), pp: Object.assign({}, g.pp || {}), vit: g.vit ? JSON.parse(JSON.stringify(g.vit)) : null, vitT0: g.vitT0, vitE: JSON.parse(JSON.stringify(g.vitE || {})) }, pend = 0;
    unsent.slice().sort(cmpT).forEach(function (e) { pend += growthStep(scratch, e); });
    var room = Math.max(0, C.thresholdFor(g.next) - g.total), today = U.dayStr(new Date(now));
    V.stage = V.hatched ? 1 + g.cross.length : 0;
    V.forms = [];
    if (V.hatched) {
      V.forms.push({ stage: 1, seed: C.formSeed(S.egg.id, 1), t: V.hatchAt, words: [], points: 0 });
      g.cross.forEach(function (c) { V.forms.push({ stage: c.stage, seed: C.formSeedAt(S.egg.id, c), t: Math.max(c.t, V.hatchAt), words: c.words, points: c.points }); });
    }
    V.form = V.forms.length ? V.forms[V.forms.length - 1] : null;
    V.growth = {
      confirmed: g.total, pending: Math.min(pend, room), pendingRaw: pend, full: V.hatched && pend > room, cap: C.DAILY_CAP,
      today: Math.min(C.DAILY_CAP, scratch.days[today] || 0),
      stageFloor: C.thresholdFor(Math.max(1, V.stage)), stageNext: C.thresholdFor(Math.max(2, V.stage + 1))
    };
    V.growth.readyAtSync = V.hatched && room > 0 && pend >= room;
    V.coins = g.total - S.spent;
    var pendT = unsent.filter(function (e) { return e.type === 'tbuy' && e.data && !(S.tokOwned || {})[e.data.item]; }); // 2.5.0: the wallet (bought on this device but not synced yet counts right away)
    V.tokens = C.TOK_START + (S.tok || 0) - (S.tokSpent || 0) - pendT.reduce(function (n, e) { return n + Math.max(0, +e.data.price || 0); }, 0);
    V.tokOwned = Object.assign({}, S.tokOwned || {}); pendT.forEach(function (e) { V.tokOwned[e.data.item] = { t: e.t, price: +e.data.price || 0, pending: 1 }; });
    var pendS = unsent.filter(function (e) { return e.type === 'tspend' && e.data; }); V.tokens -= pendS.reduce(function (n, e) { return n + Math.max(0, +e.data.price || 0); }, 0);
    var stv = S.stars || { lv: 0, last: '' }, tday = U.dayStr(new Date(opts.now || Date.now())), lv0 = stv.lv;
    if (stv.last && tday > stv.last) { var dd = stv.last, nn = 0; while (dd < tday && nn++ < 60) { lv0 = (S.g.days[dd] || 0) >= C.STAR_NEED ? Math.min(4, lv0 + 1) : Math.max(0, lv0 - 1); dd = U.addDays(dd, 1); } }
    V.stars = { lv: lv0, mult: C.STAR_MULT[lv0], today: S.g.days[tday] || 0, need: C.STAR_NEED, earned: (S.tokEarn || {})[tday] || 0, cap: C.TOK_EARN_CAP, allowed: !!(S.allowDays || {})[tday] || unsent.some(function (e) { return e.type === 'allow' && e.data && e.data.day === tday; }) };
    V.treats = (S.treats || []).concat(pendS.map(function (e) { return { t: e.t, what: e.data.what, price: +e.data.price || 0, pending: 1 }; }));
    V.allowDays = S.allowDays || {};
    V.tokDays = S.tokDays || {}; V.tokBuys = (S.tokBuys || []).concat(pendT.map(function (e) { return { t: e.t, item: e.data.item, price: +e.data.price || 0, pending: 1 }; }));
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
    return Object.keys(S.quests).map(function (k) { return S.quests[k]; }).filter(function (q) { return q.title && (state ? q.state === state : q.state !== 'deleted' && q.state !== 'purged'); })
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
})();
