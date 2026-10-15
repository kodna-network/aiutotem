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
  function mine(q) { return q && q.key.indexOf('starter-') !== 0 && q.key !== 'inventory' && q.key.indexOf('todo-') !== 0 && q.state !== 'deleted'; }
  // [step id, what to do, done when...]
  Q.QUESTS = [
    { key: 'starter-meet', title: 'Meet your Totem', kind: 'main', why: 'Your first quest. Every step checks itself off when you do it. Rename, reorder or delete steps like any quest.', steps: [
      ['hello', 'Tap your Totem to say hi', function (S, L) { return !!L.petted || S.chat.some(function (e) { return e.type === 'say'; }); }],
      ['callme', 'Tell it what to call you (Settings)', function (S) { return !!(S.nameIsUser || S.settings.callMe && S.settings.callMe.v); }],
      ['quiz', 'Take the personality quiz (Accounts > your profile card > Personality)', function (S) { return !!(S.ptype && S.ptype.answered >= ((AIU.persona && AIU.persona.QUIZ.length) || 12)); }],
      ['look', 'See your type (Accounts > your profile card > Personality)', function (S, L) { return !!(L.seenPersona || (S.settings.seenPersona && S.settings.seenPersona.v)); }]
    ] },
    { key: 'starter-hilltop', title: 'Start the Hilltop habit', kind: 'side', why: 'The daily I Ching reading and journal page. Practical wisdom, not fortune-telling.', steps: [
      ['cast', 'Watch Aiu cast your first I Ching reading (Log > I Ching)', function (S) { return Object.keys(S.reviews || {}).length > 0; }],
      ['time', 'Get two readings in a row (visit Aiu two days running)', function (S) { var r = S.reviews || {}; return Object.keys(r).some(function (d) { return r[AIU.util.addDays(d, 1)]; }); }],
      ['story', 'Write your first entry (Log > Today > Write)', function (S) { return (S.journal || []).length > 0; }],
      ['direction', 'Finish a tile, then find its sentence in Log > Today (What got done)', function (S) { return Object.keys(S.tdone || {}).some(function (k) { return S.tdone[k].done; }); }]
    ] },
    { key: 'starter-gaba', title: 'Aiu Vitals', kind: 'side', why: 'Your Totem\'s health, kept up by calm things you really do (brush your teeth, drink water, take a walk). Let it run down and it gets tired and stops growing.', steps: [
      ['calm', 'Check in one calm thing (tap the drone in the sky: answer Yes)', function (S) { return Object.keys(gabaCalm(S)).length > 0; }],
      ['goal', 'Log 3 calm things in one day', function (S) { var n = gabaCalm(S); return Object.keys(n).some(function (d) { return n[d] >= 3; }); }],
      ['three', 'Get your Vitals to 90% (+10 growth)', function (S) { return Object.keys(S.vitals || {}).length > 0; }]
    ] },
    { key: 'starter-organize', title: 'Get organized', kind: 'side', why: 'Lists, the planner, money and accounts, one small step each.', steps: [
      ['shop', 'Make a shopping list tile and add one thing to get (Quest > + New tile > Shopping list)', function (S) { return AIU.tiles.list(S).some(function (q) { return AIU.tiles.isShop(q) && (q.steps || []).some(function (x) { return !/^example:/i.test(x.title); }); }); }],
      ['plan', 'Give a tile a day or a repeat, then find it on the Plan', function (S) { return any(S.quests, function (q) { return mine(q) && q.tile && q.tile.when && (q.tile.when.t === 'once' || q.tile.when.t === 'repeat'); }); }],
      ['money', 'Log money in or out (Accounts > your profile card > Finance)', function (S) { return any(S.plans, function (p) { return !p.removed && (p.kind === 'income' || p.kind === 'expense'); }); }],
      ['acct', 'Add your first account card (Accounts > + New)', function (S) { return any(S.vault, function (v, k) { return !v.removed && k !== 'v-me'; }) || any(S.accts, function (v, k) { return !v.removed && k !== 'v-me'; }); }]
    ] },
    { key: 'starter-own', title: 'Make your own tile', kind: 'side', why: 'You write the tiles; your Totem keeps them in order and asks what it needs.', steps: [
      ['new', 'Make a tile of your own (Quest > + New tile)', function (S) { return any(S.quests, function (q) { return mine(q); }); }],
      ['step', 'Give it at least one step', function (S) { return any(S.quests, function (q) { return mine(q) && (q.steps || []).length; }); }],
      ['done', 'Check off a step on your own tile', function (S) { return Object.keys(S.qsteps).some(function (k) { var qk = k.split('|')[0]; return S.qsteps[k].done && mine(S.quests[qk]); }); }]
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
      var U = AIU.util, today = U.dayStr(new Date(AIU.app.trueNow())), tmw = U.addDays(today, 1); void today;
      // 2.0: the Inventory tile gets its own examples (tiles.js upgradeEvents); lists are retired
      ev.push({ type: 'plan', data: { key: 'p-example-event', kind: 'event', title: 'Example: try the Plan (tap me to edit or delete)', date: tmw, time: '10:00', repeat: 'once', notes: 'Events, bills, money in and out all live in the Planner.' } });
    }
    return ev;
  };
  // 1.1.0 final: starter quests made by earlier builds asked you to talk to Aiu. Give their steps the new wording (once).
  Q.DROP = { 'starter-organize': ['biz', 'todo'] }; // 2.0.0: Business is set aside, so its starter step goes
  Q.retitle = function (S) {
    var ev = [];
    Q.QUESTS.forEach(function (def) {
      var q = S.quests[def.key]; if (!q || q.state === 'deleted') return;
      var titles = {}, drop = Q.DROP[def.key] || []; def.steps.forEach(function (st) { titles[st[0]] = st[1]; });
      var old = (q.steps || []).some(function (sp) { return titles[sp.id] && titles[sp.id] !== sp.title && /\bLog\b|\bsay\b|tell it|Library|Big quests|Planner > Money|Planner > Self|Planner > I Ching|> Business > You|Quests > Quests|Journal > \+ New entry|Journal > today >|list \(Quests\)|\(Planner > Finance\)|Journal > |\(Finance\)|\(Planner\)|\(Quests\)|own quest|\(or just you\)|Log > Profiles|Profiles > your name|Log > Today\)|Me card is already|Hilltop View at the end/i.test(sp.title); });
      if (!old && q.title !== 'Make your own quest' && !(q.steps || []).some(function (sp) { return drop.indexOf(sp.id) >= 0; })) return;
      ev.push({ type: 'quest_set', data: { key: q.key, title: q.title === 'Make your own quest' ? def.title : q.title, why: def.why, kind: q.kind, subject: q.subject, tip: q.tip, due: q.due, steps: (q.steps || []).filter(function (sp) { return drop.indexOf(sp.id) < 0; }).map(function (sp) { return { id: sp.id, title: titles[sp.id] || sp.title }; }) } });
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
