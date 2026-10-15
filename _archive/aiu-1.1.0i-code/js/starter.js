/* AIU TOTEM 1.1.0 - starter quests: the app's tour, as real quests in Quests.
   Each step checks itself off when you do the thing (Aiu never asks you to take the quiz or casts the I Ching on
   its own any more: those are steps here). Rename, reorder or delete them like any quest. When they're done, make
   your own quests in Quests. (1.1.0 final: no chat, so no step asks you to talk to Aiu.) */
(function () {
  'use strict';
  var C = AIU.core;
  var Q = AIU.starter = {};
  function any(o, fn) { return Object.keys(o || {}).some(function (k) { return fn(o[k], k); }); }
  function gabaCalm(S) { var n = {}; any(S.gaba, function (g) { if (!g.removed && g.kind === 'calm') n[g.d] = (n[g.d] || 0) + 1; }); return n; }
  function mine(q) { return q && q.key.indexOf('starter-') !== 0 && q.state !== 'deleted'; }
  function listKind(S, L) { var m = (S.listMeta || {})[L]; return m ? m.kind : /^(shopping|grocery|groceries|store|market)$/.test(L) ? 'shopping' : 'todo'; }
  // [step id, what to do, done when...]
  Q.QUESTS = [
    { key: 'starter-meet', title: 'Meet your Totem', kind: 'main', why: 'Your first quest. Every step checks itself off when you do it. Rename, reorder or delete steps like any quest.', steps: [
      ['hello', 'Tap your Totem to say hi', function (S, L) { return !!L.petted || S.chat.some(function (e) { return e.type === 'say'; }); }],
      ['callme', 'Tell it what to call you (Settings)', function (S) { return !!(S.settings.callMe && S.settings.callMe.v); }],
      ['quiz', 'Take the personality quiz (Journal > Me)', function (S) { return !!(S.ptype && S.ptype.answered >= ((AIU.persona && AIU.persona.QUIZ.length) || 12)); }],
      ['look', 'Open Journal > Me to see your type', function (S, L) { return !!L.seenPersona; }]
    ] },
    { key: 'starter-hilltop', title: 'Start the Hilltop habit', kind: 'side', why: 'The daily I Ching reading and journal page. Practical wisdom, not fortune-telling.', steps: [
      ['cast', 'Cast your first I Ching reading (Journal > I Ching)', function (S) { return Object.keys(S.reviews || {}).length > 0; }],
      ['time', 'Pick a daily cast time (Journal > I Ching)', function (S) { return !!(S.settings.reading && S.settings.reading.v && S.settings.reading.v !== 'off'); }],
      ['story', 'Write your first journal entry (Journal > Today)', function (S) { return (S.journal || []).length > 0; }],
      ['direction', 'Set your long-term direction (Journal > Today > Read today\'s page > More from the Hilltop View)', function (S) { return !!(S.settings.direction && S.settings.direction.v); }]
    ] },
    { key: 'starter-gaba', title: 'Brake training (GABA)', kind: 'side', why: 'Balance the GO with the BRAKE. Do something calming, then log it. Your Totem suggests brakes as side quests too.', steps: [
      ['calm', 'Log one calm thing (Journal > Today, or write it in a journal entry)', function (S) { return Object.keys(gabaCalm(S)).length > 0; }],
      ['goal', 'Finish one of today\'s brake goals (Journal > Me > GABA)', function (S) { return any(S.gaba, function (g) { return !g.removed && g.goal; }); }],
      ['three', 'Log 3 calm things in one day', function (S) { var n = gabaCalm(S); return Object.keys(n).some(function (d) { return n[d] >= 3; }); }]
    ] },
    { key: 'starter-organize', title: 'Get organized', kind: 'side', why: 'Lists, the planner, money and accounts, one small step each.', steps: [
      ['shop', 'Add something of your own to the shopping list (Quests > Lists)', function (S) { return Object.keys(S.lists).some(function (L) { return listKind(S, L) === 'shopping' && C.listItems(S, L).some(function (x) { return !/^example:/i.test(x.item); }); }); }],
      ['todo', 'Check off a to-do', function (S) { return Object.keys(S.lists).some(function (L) { return listKind(S, L) === 'todo' && C.listItems(S, L).some(function (x) { return x.done; }); }); }],
      ['plan', 'Add an event or a bill (Planner)', function (S) { return any(S.plans, function (p) { return !p.removed && (p.kind === 'event' || p.kind === 'bill') && p.key.indexOf('p-example') !== 0; }); }],
      ['money', 'Log money in or out (Finance)', function (S) { return any(S.plans, function (p) { return !p.removed && (p.kind === 'income' || p.kind === 'expense'); }); }],
      ['acct', 'Add your first account card (Accounts)', function (S) { return any(S.vault, function (v) { return !v.removed; }) || any(S.accts, function (v) { return !v.removed; }); }]
    ] },
    { key: 'starter-own', title: 'Make your own quest', kind: 'side', why: 'You write the quests; your Totem keeps them in order.', steps: [
      ['new', 'Create a quest of your own (Quests)', function (S) { return any(S.quests, function (q) { return mine(q); }); }],
      ['step', 'Give it at least one step', function (S) { return any(S.quests, function (q) { return mine(q) && (q.steps || []).length; }); }],
      ['done', 'Check off a step on your own quest', function (S) { return Object.keys(S.qsteps).some(function (k) { var qk = k.split('|')[0]; return S.qsteps[k].done && mine(S.quests[qk]); }); }]
    ] }
  ];
  // Events that add the starter quests (only ones that don't exist yet; a deleted one stays deleted)
  Q.createEvents = function (S) {
    var ev = [];
    Q.QUESTS.forEach(function (q) {
      if (S.quests[q.key]) return;
      ev.push({ type: 'quest_set', data: { key: q.key, title: q.title, why: q.why, kind: q.kind, steps: q.steps.map(function (st) { return { id: st[0], title: st[1] }; }) } });
    });
    if (ev.length && !C.tracked(S)) ev.push({ type: 'set', data: { k: 'track', v: 'starter-meet' } });
    // the first time only: a few examples so every menu shows what it's for (all start with "Example:" and can be deleted)
    // (not for a Totem that already uses lists: an upgrade from 1.0.5 keeps its lists clean)
    var used = Object.keys(S.lists || {}).some(function (l) { var L = S.lists[l]; return Object.keys(L).some(function (k) { return !L[k].removed; }); });
    if (!S.quests['starter-meet'] && !used) {
      var U = AIU.util, today = U.dayStr(new Date(AIU.app.trueNow())), tmw = U.addDays(today, 1);
      [['to-do', 'Example: tap the box to check me off'], ['to-do', 'Example: tap my name to rename me or move me to another list']].forEach(function (x) { ev.push({ type: 'list_add', data: { list: x[0], item: x[1] } }); });
      [['Example: eggs', 'Grocery store'], ['Example: chicken feed', 'Farm store'], ['Example: printer filament', '']].forEach(function (x) {
        ev.push({ type: 'list_add', data: { list: 'shopping', item: x[0] } });
        if (x[1]) ev.push({ type: 'list_label', data: { list: 'shopping', item: x[0], label: x[1] } });
      });
      ev.push({ type: 'plan', data: { key: 'p-example-event', kind: 'event', title: 'Example: try the Planner (tap me to edit or delete)', date: tmw, time: '10:00', repeat: 'once', notes: 'Events, bills, money in and out all live in the Planner.' } });
    }
    return ev;
  };
  // 1.1.0 final: starter quests made by earlier builds asked you to talk to Aiu. Give their steps the new wording (once).
  Q.DROP = { 'starter-organize': ['biz'] }; // 1.1.0i: Business is set aside, so its starter step goes
  Q.retitle = function (S) {
    var ev = [];
    Q.QUESTS.forEach(function (def) {
      var q = S.quests[def.key]; if (!q || q.state === 'deleted') return;
      var titles = {}, drop = Q.DROP[def.key] || []; def.steps.forEach(function (st) { titles[st[0]] = st[1]; });
      var old = (q.steps || []).some(function (sp) { return titles[sp.id] && titles[sp.id] !== sp.title && /\bLog\b|\bsay\b|tell it|Library|Big quests|Planner > Money|Planner > Self|Planner > I Ching|> Business > You|Quests > Quests|Journal > \+ New entry|Journal > today >|list \(Quests\)|\(Planner > Finance\)|\(or just you\)/i.test(sp.title); });
      if (!old && !(q.steps || []).some(function (sp) { return drop.indexOf(sp.id) >= 0; })) return;
      ev.push({ type: 'quest_set', data: { key: q.key, title: q.title, why: def.why, kind: q.kind, subject: q.subject, tip: q.tip, due: q.due, steps: (q.steps || []).filter(function (sp) { return drop.indexOf(sp.id) < 0; }).map(function (sp) { return { id: sp.id, title: titles[sp.id] || sp.title }; }) } });
    });
    return ev;
  };
  // Steps you've done that aren't checked yet, plus finished quests. -> {events, lines}
  Q.check = function (S, local) {
    var ev = [], lines = [];
    Q.QUESTS.forEach(function (def) {
      var q = S.quests[def.key];
      if (!q || q.state !== 'active') return;
      var steps = C.questSteps(S, q), changed = false;
      def.steps.forEach(function (st) {
        var cur = steps.filter(function (x) { return x.id === st[0]; })[0];
        if (!cur || cur.done) return;
        var ok = false; try { ok = !!st[2](S, local || {}); } catch (e) { ok = false; }
        if (ok) { ev.push({ type: 'quest_step', data: { key: q.key, step: st[0], done: true } }); cur.done = true; changed = true; lines.push('Quest step done: ' + cur.title.replace(/\s*\(.*\)$/, '') + '.'); }
      });
      if (changed && steps.length && steps.every(function (x) { return x.done; })) {
        ev.push({ type: 'quest_state', data: { key: q.key, state: 'done' } });
        lines.push('Quest complete: ' + q.title + '!');
        var next = Q.QUESTS.map(function (d) { return S.quests[d.key]; }).filter(function (x) { return x && x.state === 'active' && x.key !== q.key; })[0];
        var tr = C.tracked(S);
        if (next && (!tr || tr.key === q.key)) { ev.push({ type: 'set', data: { k: 'track', v: next.key } }); lines.push('Next quest: ' + next.title + '.'); }
      }
    });
    return { events: ev, lines: lines };
  };
})();
