/* AIU TOTEM 2.0 - tiles: the Quest board's engine (no UI here).
   A tile is a quest (the same quest_set / quest_step / quest_state events as 1.x) plus its pieces, kept by 'tile' events:
     status  next (green: go) | doing (yellow) | done (red: stop). 2.0.6: the old 'backlog' reads as go.
     when    { t: 'once', date, time } | { t: 'repeat', every: 'day'|'week'|'2weeks'|'month', date, time } |
             { t: 'window', from: 'MM-DD', to: 'MM-DD' } (every year, like apple picking) | { t: 'any' }
     who, dur (how long), acct (an Accounts card key), calm (true = a GABA brake)
   Butler rules (plain word matching, no AI) decide which pieces a tile needs and which question Aiu asks next.
   One ranking (T.rank) orders the board AND decides what Aiu points you to next (DRY: nothing else announces things). */
(function () {
  'use strict';
  var U = AIU.util, C = AIU.core;
  var T = AIU.tiles = {};
  T.STATUS = [['next', 'Go'], ['doing', 'Doing'], ['done', 'Done']]; // 2.0.6: a traffic light. green = go, yellow = doing, red = stop (finished)
  T.LIGHT = { next: 'green', doing: 'yellow', done: 'red' };
  T.EVERY = { day: 'Every day', days: 'On certain days', week: 'Every week', '2weeks': 'Every 2 weeks', month: 'Every month' };
  // 2.1.12: repeat on any days of the week ({ every: 'days', days: [1, 3, 5] } with 0 = Sunday), every week or every other week (step 2)
  T.DAYS_ORDER = [1, 2, 3, 4, 5, 6, 0];
  function dayOn(w, day) { // is this day one of the picked weekdays (and in the right week, for every other week)?
    if (!w.days || w.days.indexOf(U.weekday(day)) < 0) return false;
    if ((w.step || 1) === 1) return true;
    var wk = function (d) { var dd = U.dayToDate(d); dd.setDate(dd.getDate() - ((dd.getDay() + 6) % 7)); return Math.round(dd.getTime() / 604800000); }; // Monday-based week number
    return (wk(day) - wk(w.date || day)) % 2 === 0;
  }
  T.dayOn = dayOn;
  T.multi = function (q) { var w = T.tile(q).when || {}; return w.t === 'repeat' && (w.every === 'day' || w.every === 'days') && T.times(q).length > 1; };
  T.PIECES = { when: 'When', steps: 'Steps', who: 'Who', dur: 'How long', acct: 'Account card' };
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // The butler's rules: words in the title pick the pieces (and a few ideas for the steps)
  T.RULES = [
    { id: 'shop', re: /\b(inventory|shopping|groceries|grocery|store run|supplies|restock)\b/i, pieces: [], shop: true, steps: [] },
    { id: 'pet', re: /\b(walk|dog|dogs|pup|puppy|cat|cats|pet|pets|chickens?|hens?|coop|horse|feed the)\b/i, pieces: ['who', 'dur'], steps: ['Leash and bags', 'Fresh water', 'Treat when we get back'] },
    { id: 'account', re: /\b(account|gmail|e-?mail|login|log ?in|sign ?up|password|register|subscription|app store|website)\b/i, pieces: [], steps: ['Make the account', 'Save the login in Accounts'] /* 2.0.2: no Accounts-card piece (kept simple) */ },
    { id: 'season', re: /\b(pick|picking|plant|planting|harvest|prune|pruning|season|apples?|berries|pumpkins?|garden|mulch|leaves|snow)\b/i, pieces: [], window: true, steps: ['Get the tools out', 'Do it', 'Put it all away'] },
    { id: 'meet', re: /\b(meet|meeting|interview|appointment|call|visit|tea|party|dinner|lunch|date|class|lesson)\b/i, pieces: ['who'], steps: ['Put it on the calendar', 'Get ready', 'Go'] },
    { id: 'calm', re: /\b(walk|shower|bath|yoga|stretch|nap|meditat\w*|breath\w*|read|reading|music|draw|drawing|paint|painting|tea|nature|sunlight|journal\w*)\b/i, pieces: ['dur'], calm: true, steps: [] }
  ];
  T.rulesFor = function (title) { return T.RULES.filter(function (r) { return r.re.test(String(title || '')); }); };
  T.isStarter = function (q) { return /^starter-/.test(q.key); };
  // 2.1.1: you pick the kind when you make a tile: a task list (finishes when every box is checked) or a shopping list
  T.KINDS = { list: 'Task list', shop: 'Shopping list' };
  T.isShop = function (q) { var k = T.tile(q).kind; return k ? k === 'shop' : q.key === 'inventory'; }; // a shopping list: its steps are the things to get
  T.stepsLeft = function (S, q) { return C.questSteps(S, q).filter(function (x) { return !x.done; }).length; };
  // can it turn red? a task list: when every box is checked (or it has no boxes); a shopping list: once something is checked
  T.canFinish = function (S, q) { var st = C.questSteps(S, q); if (T.isShop(q)) return st.some(function (x) { return x.done; }); return !st.length || st.every(function (x) { return x.done; }); };
  T.tile = function (q) { return (q && q.tile) || {}; };
  // which pieces this tile needs, in the order Aiu asks
  T.needs = function (q) {
    if (T.isStarter(q)) return ['steps'];
    if (T.isShop(q)) return ['steps'];
    if (q.subject === 'standup') return ['when']; // today's brake from the GABA standup: nothing to ask
    var out = ['when'], rs = T.rulesFor(q.title);
    rs.forEach(function (r) { r.pieces.forEach(function (p) { if (out.indexOf(p) < 0) out.push(p); }); });
    out.push('steps');
    return out;
  };
  T.isCalm = function (q) { var t = T.tile(q); if (t.calm !== undefined) return !!t.calm; return /^gaba:/.test(q.subject || '') || T.rulesFor(q.title).some(function (r) { return r.calm; }); };
  T.hasCard = function (S, k) { return !!(k && ((S.accts && S.accts[k] && !S.accts[k].removed) || (S.vault && S.vault[k] && !S.vault[k].removed))); };
  T.filled = function (S, q, piece) {
    var t = T.tile(q);
    if (piece === 'steps') return (q.steps || []).length > 0;
    if (piece === 'acct') return t.acct === 'later' || T.hasCard(S, t.acct);
    if (piece === 'when') return !!(t.when && t.when.t);
    return !!t[piece];
  };
  T.pieces = function (S, q) { return T.needs(q).map(function (p) { return { id: p, label: p === 'steps' && T.isShop(q) ? 'Your items' : T.PIECES[p], ok: T.filled(S, q, p) }; }); };
  T.missing = function (S, q) { return T.pieces(S, q).filter(function (p) { return !p.ok; }); };

  /* ---------- when: dates, repeats and season windows ---------- */
  function md(day) { return day.slice(5); }
  function inWindow(w, day) { var x = md(day); return w.from <= w.to ? x >= w.from && x <= w.to : x >= w.from || x <= w.to; }
  T.mdText = function (m) { return m ? MON[+m.slice(0, 2) - 1] + ' ' + (+m.slice(3)) : ''; };
  // This occurrence of the tile, seen from `today`: {day: the date it's for (or null), p: its period key (one finish each), due: on or past it}
  T.occurrence = function (q, today) {
    var w = T.tile(q).when || {};
    if (w.t === 'repeat') {
      var a = w.date || today;
      if (today < a) return { day: a, p: a, due: false }; // starts later
      if (w.every === 'days') { // 2.1.12: the latest picked day up to today (several times a day works too)
        var ts2 = T.times(q), d1 = today, n1 = 0;
        while (n1 < 15 && !(d1 >= a && dayOn(w, d1))) { d1 = U.addDays(d1, -1); n1++; }
        if (n1 >= 15) { var nx = today; for (var j = 0; j < 15 && !(nx >= a && dayOn(w, nx)); j++) nx = U.addDays(nx, 1); return { day: nx, p: nx, due: false }; }
        if (d1 === today && ts2.length > 1) { var nowHM2 = T.nowHM(today), slot2 = ts2.filter(function (x) { return x <= nowHM2; }).pop() || ts2[0], i2 = ts2.indexOf(slot2); return { day: today, p: today + '@' + slot2, due: true, slot: slot2, slotIx: i2, nextSlot: ts2[i2 + 1] || null }; }
        return { day: d1, p: d1, due: true };
      }
      if (w.every === 'day') {
        var ts = T.times(q);
        if (ts.length > 1) { // 2.0.5: more than once a day (brush teeth 8am and 9pm): each time is its own finish
          var nowHM = T.nowHM(today), slot = ts.filter(function (x) { return x <= nowHM; }).pop() || ts[0], i = ts.indexOf(slot);
          return { day: today, p: today + '@' + slot, due: true, slot: slot, slotIx: i, nextSlot: ts[i + 1] || null };
        }
        return { day: today, p: today, due: true };
      }
      if (w.every === 'week' || w.every === '2weeks') {
        var step = w.every === 'week' ? 7 : 14, diff = Math.round((U.dayToDate(today) - U.dayToDate(a)) / 86400000), k = Math.floor(diff / step), d0 = U.addDays(a, k * step);
        if (diff < 0) return { day: a, p: a, due: false };
        return { day: d0, p: d0, due: true, next: U.addDays(d0, step) };
      }
      if (w.every === 'month') { var cur = T.monthDay(a, today.slice(0, 7)); if (cur <= today) return { day: cur, p: cur, due: true }; var prev = U.dayToDate(today.slice(0, 7) + '-01'); prev.setMonth(prev.getMonth() - 1); var pm = T.monthDay(a, prev.getFullYear() + '-' + U.p2(prev.getMonth() + 1)); return pm >= a ? { day: pm, p: pm, due: true, next: cur } : { day: cur, p: cur, due: false }; }
    }
    if (w.t === 'window' && w.from && w.to) {
      var yr = today.slice(0, 4), inside = inWindow(w, today);
      return { day: null, p: (w.from > w.to && md(today) <= w.to ? String(+yr - 1) : yr), due: inside, window: true, starts: inside ? null : w.from };
    }
    if (w.t === 'once' && w.date) return { day: w.date, p: 'once', due: w.date <= today };
    return { day: null, p: 'once', due: false };
  };
  // the day a monthly tile lands on in a month (the 31st becomes the 30th or the 28th in short months)
  T.monthDay = function (anchor, month) { var last = new Date(+month.slice(0, 4), +month.slice(5, 7), 0).getDate(); return month + '-' + U.p2(Math.min(+anchor.slice(8), last)); };
  // a step id that's never been used on this tile (old finished steps keep their "done" records, so ids must not come back)
  T.stepId = function (q, used) { var n = 0, id; do { id = 's' + Date.now().toString(36).slice(-4) + (n ? n : '') + Math.random().toString(36).slice(2, 4); n++; } while ((q.steps || []).concat(used || []).some(function (x) { return x.id === id; })); return id; };
  // the times a tile happens in a day (one or more), and the clock now (for today only)
  T.times = function (q) { var w = T.tile(q).when || {}; var t = (w.times && w.times.length ? w.times : w.time ? [w.time] : []).filter(function (x) { return /^\d\d:\d\d$/.test(x); }); return t.slice().sort(); };
  T.nowHM = function (day) { var a = AIU.app, n = a ? a.trueNow() : Date.now(), w = U.wall(new Date(n)); return U.dayStr(new Date(n)) === day ? U.p2(w.getHours()) + ':' + U.p2(w.getMinutes()) : '00:00'; };
  T.repeats = function (q) { var w = T.tile(q).when || {}; return w.t === 'repeat' || w.t === 'window'; };
  T.doneNow = function (S, q, today) {
    if (q.state === 'done') return true;
    // 2.4.0: a shopping tile finishes like any other (Done shopping)
    var o = T.occurrence(q, today), r = (S.tdone || {})[q.key + '|' + o.p];
    return !!(r && r.done);
  };
  T.status = function (S, q, today) {
    if (T.doneNow(S, q, today)) return 'done';
    var st = T.tile(q).status;
    if (st === 'done') return T.repeats(q) ? 'next' : 'done';
    return st === 'doing' ? 'doing' : 'next'; // backlog, up next or nothing yet: all green (go)
  };
  T.whenText = function (q, c24) {
    var w = T.tile(q).when || {}, tms = T.times(q), tm = tms.length ? ' · ' + tms.map(function (x) { return U.fmtHm(x, c24); }).join(', ') : '';
    if (w.t === 'repeat' && w.every === 'days') return T.daysText(w) + tm;
    if (w.t === 'repeat') return (T.EVERY[w.every] || 'Repeats') + (w.every === 'week' || w.every === '2weeks' ? ' · ' + U.DAYNAMES[U.weekday(w.date)].slice(0, 3) : w.every === 'month' ? ' · day ' + (+w.date.slice(8)) + (+w.date.slice(8) > 28 ? ' (or the last day)' : '') : '') + tm + (w.date && w.date > U.dayStr(new Date((AIU.app && AIU.app.trueNow()) || Date.now())) ? ' · starts ' + U.fmtDay(w.date) : '');
    if (w.t === 'window') return T.mdText(w.from) + ' - ' + T.mdText(w.to) + ' · yearly';
    if (w.t === 'once' && w.date) return U.fmtDay(w.date) + tm;
    if (w.t === 'any') return 'Any time';
    return T.isStarter(q) ? 'Getting started' : 'When? (Aiu will ask)';
  };
  T.daysText = function (w) {
    var d = (w.days || []).slice().sort(), k = d.join(','), base = k === '0,1,2,3,4,5,6' ? 'Every day' : k === '1,2,3,4,5' ? 'Weekdays' : k === '0,6' ? 'Weekends' : T.DAYS_ORDER.filter(function (x) { return d.indexOf(x) >= 0; }).map(function (x) { return U.DAYNAMES[x].slice(0, 3); }).join(', ');
    return (w.step === 2 ? 'Every other week: ' : '') + base;
  };
  // does the tile show on this calendar day?
  T.onDay = function (q, day) {
    var w = T.tile(q).when || {};
    if (q.state === 'deleted' || q.state === 'dropped') return false;
    if (w.t === 'once') return w.date === day;
    if (w.t === 'window') return inWindow(w, day);
    if (w.t === 'repeat') {
      if (day < (w.date || day)) return false;
      if (w.every === 'day') return true;
      if (w.every === 'days') return dayOn(w, day);
      var diff = Math.round((U.dayToDate(day) - U.dayToDate(w.date)) / 86400000);
      if (w.every === 'week') return diff % 7 === 0;
      if (w.every === '2weeks') return diff % 14 === 0;
      if (w.every === 'month') return day === T.monthDay(w.date, day.slice(0, 7));
    }
    return false;
  };
  T.list = function (S) { return C.questList(S).filter(function (q) { return q.state !== 'deleted' && q.state !== 'dropped'; }); };

  /* ---------- the master backlog: one score for every tile ---------- */
  T.score = function (S, q, today, ctx) {
    var st = T.status(S, q, today); if (st === 'done') return -1;
    if (T.isShop(q)) { var left = C.questSteps(S, q).filter(function (x) { return !x.done && !/^example:/i.test(x.title); }).length; return left ? 20 + Math.min(left, 10) : -1; } // only when there's something to get
    var o = T.occurrence(q, today), miss = T.missing(S, q).length, w = T.tile(q).when || {}, s = 0;
    if (o.due && (o.day ? o.day <= today : o.window)) s += o.day && o.day < today && !T.repeats(q) ? 90 : 70; // overdue, due today, or in season
    if (st === 'doing') s += 50;
    if (miss) s += 40 - miss; // Aiu wants the missing pieces
    if (st === 'next') s += 25;
    if (o.day && o.day > today && o.day <= U.addDays(today, 3)) s += 15;
    if (w.time && o.day === today && ctx && ctx.nowHM && w.time <= ctx.nowHM) s += 5;
    if (T.isStarter(q)) s -= 10;
    return s; // (older tiles win ties: see T.rank)
  };
  T.rank = function (S, today, ctx) {
    return T.list(S).map(function (q) { return { q: q, s: T.score(S, q, today, ctx) }; }).filter(function (x) { return x.s >= 0; })
      .sort(function (a, b) { return b.s - a.s || a.q.first - b.q.first; }).map(function (x) { return x.q; });
  };

  /* ---------- Aiu's questions: the first missing piece, as tap-to-answer choices ---------- */
  T.question = function (S, q, today) {
    var m = T.missing(S, q)[0]; if (!m) return null;
    var rs = T.rulesFor(q.title), name = q.title;
    if (m.id === 'when') {
      if (rs.some(function (r) { return r.window; })) return { piece: 'when', ask: 'Which part of the year is "' + name + '"?', kind: 'window' };
      return { piece: 'when', ask: 'When is "' + name + '"?', kind: 'when',
        opts: [['Today', { t: 'once', date: today }], ['Tomorrow', { t: 'once', date: U.addDays(today, 1) }], ['This weekend', { t: 'once', date: nextSat(today) }], ['Every day', { t: 'repeat', every: 'day', date: today }], ['Morning and night', { t: 'repeat', every: 'day', date: today, time: '08:00', times: ['08:00', '21:00'] }], ['Every week', { t: 'repeat', every: 'week', date: today }], ['Any time', { t: 'any' }]] };
    }
    if (m.id === 'who') {
      var names = Object.keys(S.entities || {}).map(function (k) { return S.entities[k]; }).filter(function (x) { return x && !x.hidden && (x.kind === 'pet' || x.kind === 'person') && x.name; }).slice(0, 4).map(function (x) { return x.name; });
      return { piece: 'who', ask: rs.some(function (r) { return r.id === 'pet'; }) ? 'Who\'s coming along?' : 'Who is it with?', kind: 'chips', opts: names.concat(['Just me', 'The family']), other: 'Someone else' };
    }
    if (m.id === 'dur') return { piece: 'dur', ask: 'How long does it take?', kind: 'chips', opts: ['15 min', '30 min', '1 hour', '2 hours', 'Half a day'] };
    if (m.id === 'acct') return { piece: 'acct', ask: 'Which Accounts card holds this login?', kind: 'acct' };
    if (m.id === 'steps' && T.isShop(q)) return { piece: 'steps', ask: 'What do you need to get?', kind: 'steps', ideas: [] };
    if (m.id === 'steps') { var ideas = []; rs.forEach(function (r) { (r.steps || []).forEach(function (x) { if (ideas.indexOf(x) < 0) ideas.push(x); }); }); return { piece: 'steps', ask: 'What\'s the first step?', kind: 'steps', ideas: ideas.slice(0, 4) }; }
    return null;
  };
  function nextSat(d) { var w = U.weekday(d); return U.addDays(d, w === 6 ? 0 : (6 - w)); }

  /* ---------- 2.0 upgrade: the Inventory tile (your shopping list) and to-dos as tiles ---------- */
  // Only makes what doesn't exist yet (fixed keys), so two devices upgrading end up the same. The old lists stay in the data.
  T.upgradeEvents = function (S, today) {
    var ev = [], M = AIU.mind;
    if (!S.quests.inventory) { // 2.1.1: only when there's an old 1.x shopping list to carry over (new Totems choose their own tiles)
      var items = [], n = 0;
      Object.keys(S.lists || {}).forEach(function (L) {
        var meta = (S.listMeta || {})[L], shop = meta ? meta.kind === 'shopping' : /^(shopping|grocery|groceries|store|market)$/.test(L);
        if (!shop) return;
        C.listItems(S, L).filter(function (x) { return !x.done; }).forEach(function (x) { if (items.length < 30) items.push({ id: 's' + (++n), title: (x.item + (x.label && !/^example:/i.test(x.item) ? ' (' + x.label + ')' : '')).slice(0, 80) }); });
      });
      if (items.length) {
        ev.push({ type: 'quest_set', data: { key: 'inventory', title: 'Shopping', why: 'Your shopping list. Check things off as you get them.', steps: items } });
        ev.push({ type: 'quest_state', data: { key: 'inventory', state: 'active' } });
        ev.push(T.setEv('inventory', { status: 'next', kind: 'shop', when: { t: 'any' } }));
      }
    }
    Object.keys(S.lists || {}).forEach(function (L) {
      var meta = (S.listMeta || {})[L], shop = meta ? meta.kind === 'shopping' : /^(shopping|grocery|groceries|store|market)$/.test(L);
      if (shop || (meta && meta.hidden)) return;
      C.listItems(S, L).filter(function (x) { return !x.done && !/^example:/i.test(x.item); }).forEach(function (x) {
        var key = 'todo-' + M.slug(x.item).slice(0, 40); if (S.quests[key]) return;
        ev.push({ type: 'quest_set', data: { key: key, title: AIU.words.cap(x.item).slice(0, 60), steps: [] } }, { type: 'quest_state', data: { key: key, state: 'active' } }, T.setEv(key, { status: 'next' }));
      });
    });
    return ev;
  };

  T.taskKeys = function (S, key) { return Object.keys(S.tasks || {}).filter(function (k) { return k === 'tile-' + key || k.indexOf('tile-' + key + '~') === 0; }); };
  T.taskKey = function (key, i) { return 'tile-' + key + (i ? '~' + (i + 1) : ''); };
  T.tileOfTask = function (S, tk) { var m = /^tile-(.+?)(~\d+)?$/.exec(tk || ''), q = m && S.quests[m[1]]; return q && q.state !== 'deleted' && q.state !== 'dropped' ? q : null; }; // 2.0.7: a tile's own reminder
  T.NEXTLIGHT = { next: 'doing', doing: 'done', done: 'next' };
  // 2.1.1: undo a finish: the finish is taken back and the boxes go back the way they were (minus `except`, the box that just finished it)
  T.undoEvents = function (S, q, p, except) {
    var r = (S.tdone || {})[q.key + '|' + p] || {}, ev = [{ type: 'tile_done', data: { key: q.key, p: p, undone: true } }], had = r.steps || [];
    except = except || r.last;
    if (T.isShop(q) && r.list && r.list.length) ev.push({ type: 'quest_set', data: AIU.mind.questSetData(q, r.list) });
    had.forEach(function (id) { if (id !== except) ev.push({ type: 'quest_step', data: { key: q.key, step: id, done: true, p: p } }); }); // same period: the pay-once rule sees them as already paid
    if (except) ev.push({ type: 'quest_step', data: { key: q.key, step: except, done: false, p: p } });
    if (!T.repeats(q)) ev.push({ type: 'quest_state', data: { key: q.key, state: 'active' } });
    ev.push(T.setEv(q.key, { status: had.length ? 'doing' : 'next' }));
    return ev;
  };

  /* ---------- events ---------- */
  T.setEv = function (key, set) { return { type: 'tile', data: { key: key, set: set } }; };
  // a new tile: the quest record + its starting pieces (calm is guessed from the words)
  T.createEvents = function (S, title, extra) {
    var M = AIU.mind, key = M.slug(title); if (S.quests[key] && S.quests[key].state !== 'deleted') key = key + '-' + U.id().slice(-3).toLowerCase();
    var ev = [{ type: 'quest_set', data: Object.assign({ key: key, title: title, steps: [] }, extra && extra.quest || {}) }, { type: 'quest_state', data: { key: key, state: 'active' } }];
    var set = Object.assign({ status: 'next' }, (extra && extra.set) || {});
    if (T.rulesFor(title).some(function (r) { return r.calm; }) && set.calm === undefined) set.calm = true;
    ev.push(T.setEv(key, set));
    return { key: key, events: ev };
  };
  // finishing it: once = the quest is complete; repeating = this day/week/month/year is done (and its steps reset)
  T.doneEvents = function (S, q, today) {
    var o = T.occurrence(q, today), st0 = C.questSteps(S, q), ev = [{ type: 'tile_done', data: { key: q.key, p: o.p, steps: st0.filter(function (x) { return x.done; }).map(function (x) { return x.id; }), list: T.isShop(q) ? (q.steps || []).map(function (x) { return { id: x.id, title: x.title }; }) : undefined } }]; // 2.1.1: remembers the boxes, so Undo can put them back
    if (T.isShop(q)) ev[0].data.items = C.questSteps(S, q).filter(function (x) { return x.done; }).map(function (x) { return x.title.slice(0, 60); }); // what got bought (for the day's Log)
    if (T.repeats(q)) C.questSteps(S, q).forEach(function (st) { if (st.done) ev.push({ type: 'quest_step', data: { key: q.key, step: st.id, done: false } }); });
    else { ev.push({ type: 'quest_state', data: { key: q.key, state: 'done' } }); ev.push(T.setEv(q.key, { status: 'done' })); }
    var S0 = S.tasks || {};
    T.taskKeys(S, q.key).forEach(function (tk) {
      if (!S0[tk] || S0[tk].off) return;
      if (o.slot && S0[tk].time !== o.slot) return; // more than once a day: only this time's reminder
      ev.push(T.isShop(q) || T.repeats(q) ? { type: 'task_done', data: { key: tk, date: today } } : { type: 'task_off', data: { key: tk, removed: true } }); // its reminder: done for today, or gone with the tile
    });
    return ev;
  };
})();
