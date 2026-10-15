/* AIU TOTEM 2.1.6 - Aiu Vitals: Aiu's character stats, kept up by the calm things you do in real life (not by tiles).
   Five body parts: Brain (calm focus), Heart (connection), Arms & legs (movement), Gut (fuel), Rest (recharge).
   Each part wears down over time. A check-in ("Did you brush your teeth this morning?") fills its part when you say Yes.
   Not yet: make a tile so you remember (do it, come back, say Yes), or skip it for today.
   Worn down (the average under C.VIT.DISTRESS): Aiu is distressed. He carries on, but looks tired and doesn't grow.
   The questions start with what calms YOU (Profile > "knows you"); stressors are only noted there, never used.
   The math lives in core.js (C.VIT, C.vitAdd...) so the growth engine and this screen agree.
   Data: the same synced 'gaba' calm events (with data.sys = the body part) and the 'vitals' reward. Educational only. */
(function () {
  'use strict';
  var U = AIU.util, C = AIU.core, A = AIU.art, h = U.h, G = AIU.gaba;
  var V = AIU.vitals = {};
  function app() { return AIU.app; }
  function ui() { return AIU.ui; }
  function K() { return AIU.ui.k; }
  var today = U.today;

  V.SYS = [
    { k: 'brain', name: 'Brain', what: 'calm focus', items: ['Slow breathing (4 in / 4 out)', 'Meditation / mindfulness', 'Reading', 'Journaling', 'Puzzles / LEGO', 'Calm music'] },
    { k: 'heart', name: 'Heart', what: 'connection and joy', items: ['Time with pets', 'Safe hugs / social support', 'Walk the dog', 'Playing an instrument', 'Drawing / painting'] },
    { k: 'move', name: 'Arms & legs', what: 'movement', items: ['Walk outside', 'Stretching / yoga', 'Nature time (park / woods)', 'Fishing / sitting by water', 'Light cleaning / simple chores'] },
    { k: 'gut', name: 'Gut', what: 'fuel', items: ['Drink a glass of water', 'Eat a real meal', 'Warm drink at night'] },
    { k: 'rest', name: 'Rest', what: 'recharge', items: ['Brush teeth', 'Sleep routine (same time)', 'Warm bath / shower', 'Morning sunlight', 'Short nap (20 min)', 'Low lights at night', 'Cozy blanket / comfort items', 'Lavender smell', 'Cold splash on face (quick reset)'] }
  ];
  var SYSOF = {}, BYK = {};
  V.SYS.forEach(function (s) { BYK[s.k] = s; s.items.forEach(function (it) { SYSOF[it] = s.k; }); });
  G.CALM_FOODS.forEach(function (f) { SYSOF[f[0]] = 'gut'; });
  V.sysOf = function (item) { return SYSOF[item] || 'brain'; }; // your own words: the brain
  V.part = function (k) { return BYK[k]; };

  /* ---------- the questions (some depend on the time of day) ---------- */
  function when(hr) { return hr < 12 ? 'this morning' : hr >= 18 ? 'tonight' : 'today'; }
  var ASK = {
    'Brush teeth': function (hr) { return 'Did you brush your teeth ' + when(hr) + '?'; },
    'Drink a glass of water': function () { return 'Have you had a glass of water lately?'; },
    'Eat a real meal': function (hr) { return 'Did you eat a real meal ' + (hr < 11 ? '(breakfast)' : hr < 16 ? '(lunch)' : '(dinner)') + '?'; },
    'Warm drink at night': function () { return 'Did you have a warm, caffeine-free drink tonight?'; },
    'Slow breathing (4 in / 4 out)': function () { return 'Did you take a minute of slow breathing today?'; },
    'Meditation / mindfulness': function () { return 'Did you take two quiet minutes for yourself today?'; },
    'Reading': function () { return 'Did you read for a bit today?'; },
    'Journaling': function () { return 'Did you write in your journal today?'; },
    'Puzzles / LEGO': function () { return 'Did you do a puzzle or build something today?'; },
    'Calm music': function () { return 'Did you listen to some calm music today?'; },
    'Time with pets': function () { return 'Did you spend some calm time with an animal today?'; },
    'Safe hugs / social support': function () { return 'Did you talk with (or hug) someone you trust today?'; },
    'Walk the dog': function () { return 'Did you walk the dog today?'; },
    'Playing an instrument': function () { return 'Did you play some music today?'; },
    'Drawing / painting': function () { return 'Did you draw or paint something today?'; },
    'Walk outside': function () { return 'Did you take a walk outside today?'; },
    'Stretching / yoga': function () { return 'Did you stretch today?'; },
    'Nature time (park / woods)': function () { return 'Did you spend some time in nature today?'; },
    'Fishing / sitting by water': function () { return 'Did you sit by the water (or fish) today?'; },
    'Light cleaning / simple chores': function () { return 'Did you do one small tidy-up today?'; },
    'Sleep routine (same time)': function (hr) { return hr < 12 ? 'Did you sleep well and get up on time?' : 'Are you winding down for bed on time?'; },
    'Short nap (20 min)': function () { return 'Did you rest for a bit today?'; },
    'Warm bath / shower': function () { return 'Did you have a warm bath or shower today?'; },
    'Morning sunlight': function () { return 'Did you get a few minutes of sunlight today?'; },
    'Low lights at night': function () { return 'Did you dim the lights this evening?'; },
    'Cozy blanket / comfort items': function () { return 'Did you get some cozy, comfy time today?'; },
    'Lavender smell': function () { return 'Did you take a calm minute with a smell you like (like lavender)?'; },
    'Cold splash on face (quick reset)': function () { return 'Did you splash cold water on your face to reset?'; }
  };
  function hour() { return U.wall(new Date(app().trueNow())).getHours(); }
  V.ask = function (item) { var f = ASK[item]; return f ? f(hour()) : 'Did you have some ' + item.replace(/\s*\(.*\)$/, '').toLowerCase() + ' today?'; };
  V.tileName = function (item) { return { 'Drink a glass of water': 'Drink water', 'Slow breathing (4 in / 4 out)': 'Slow breathing', 'Safe hugs / social support': 'Call or see someone I trust', 'Time with pets': 'Time with the animals', 'Light cleaning / simple chores': 'One small tidy-up', 'Fishing / sitting by water': 'Sit by the water', 'Nature time (park / woods)': 'Time in nature', 'Sleep routine (same time)': 'Bed on time', 'Cold splash on face (quick reset)': 'Cold splash reset', 'Cozy blanket / comfort items': 'Cozy blanket time', 'Short nap (20 min)': 'Short rest' }[item] || item.replace(/\s*\(.*\)$/, '').replace(/ \/ .*$/, ''); };

  /* ---------- the levels: your check-ins, worn down by time ---------- */
  var memo = { S: null, m: -1, v: null }; // the world asks every frame: remember it per view and minute (app.S is a new object after every change)
  V.state = function (S, t) {
    if (!t) { var now = app().trueNow(), m = Math.floor(now / 60000); if (memo.S === S && memo.m === m) return memo.v; memo.S = S; memo.m = m; return (memo.v = V.state(S, now)); }
    var v = C.vitInit(S.t0 || t);
    G.entries(S).forEach(function (g) { if (g.kind === 'calm' && g.t <= t) C.vitAdd(v, C.vitSys(g), g.t, C.VIT.GAIN); });
    var lv = {}; C.VIT.SYS.forEach(function (k) { lv[k] = Math.round(C.vitLevel(v, k, t)); });
    var avg = Math.round(C.vitAvg(v, t));
    var grace = t - (S.t0 || t) <= C.VIT.GRACE; // a brand-new Totem gets 3 days before it can be distressed
    return { lv: lv, avg: avg, distressed: !grace && avg < C.VIT.DISTRESS, low: avg < C.VIT.DISTRESS + 20, grace: grace };
  };
  V.distressed = function (S) { return !!(S && S.hatched && V.state(S).distressed); };
  V.word = function (st) { return st.distressed ? 'Distressed: tired, not growing' : st.low ? 'Getting tired' : st.avg >= C.VIT.FULL ? 'Full of energy' : 'Doing well'; };
  // the reward: Vitals at 90%+ grows Aiu +10, once a day (core.js counts it only once)
  var asking = '';
  V.maybeReward = function () {
    var a = app(), S = a && a.S; if (!S || !S.hatched) return;
    var d = today();
    if (asking === d || (S.vitals || {})[d] || V.state(S).avg < C.VIT.FULL) return;
    asking = d;
    a.addEvents([{ type: 'vitals', data: { day: d } }], true).then(function () { a.react('quest', '+10'); K().snack('Vitals full! ' + S.totemName + ' grows +10.'); });
  };

  /* ---------- the next check-in: the lowest part first, your own calmers first ---------- */
  function skipped(d) { var L = app().local; return (L.vSkip && L.vSkip.d === d) ? L.vSkip.items : []; } // a skip only lasts today, on this device
  function skip(item) { var a = app(), d = today(), L = a.local; if (!L.vSkip || L.vSkip.d !== d) L.vSkip = { d: d, items: [] }; if (L.vSkip.items.indexOf(item) < 0) L.vSkip.items.push(item); a.saveLocal(); }
  V.itemsFor = function (S, k) {
    var base = BYK[k].items.concat(k === 'gut' ? G.CALM_FOODS.map(function (f) { return f[0]; }) : []);
    var mine = base.filter(function (x) { return G.pref(S, x) === 'yes'; });
    var rest = BYK[k].items.filter(function (x) { return mine.indexOf(x) < 0 && G.pref(S, x) !== 'no'; });
    return mine.concat(rest);
  };
  V.next = function (S, d) {
    var st = V.state(S), sk = skipped(d), done = {};
    G.day(S, d).forEach(function (g) { if (g.kind === 'calm') done[g.item] = 1; });
    var order = C.VIT.SYS.slice().sort(function (x, y) { return st.lv[x] - st.lv[y]; });
    for (var i = 0; i < order.length; i++) {
      if (st.lv[order[i]] >= C.VIT.FULL) continue;
      var it = V.itemsFor(S, order[i]).filter(function (x) { return !done[x] && sk.indexOf(x) < 0; })[0];
      if (it) return { k: order[i], item: it };
    }
    return null;
  };
  V.checkIn = function (item, k) {
    var a = app(), d = today(), f = G.find(item), ev = G.logEvent(a.S, d, 'calm', item, f ? Math.abs(f.pts) : 6, 'check-in');
    ev.data.sys = k || V.sysOf(item);
    return a.addEvents([ev], true).then(function () { a.react('check', ''); });
  };

  /* ---------- the screen ---------- */
  function seg(n, of, cls) { var b = h('span', { cls: 'pipseg' + (cls ? ' ' + cls : ''), 'aria-hidden': 'true' }); for (var i = 0; i < of; i++) b.appendChild(h('i', { cls: i < n ? 'on' : '' })); return b; }
  function figure(st) { // Aiu, scanned (sleepy eyes when distressed)
    var sc = app().sceneState(), form = sc.skin || sc.form, cv = h('canvas', { cls: 'pipfig', width: 64, height: 64, 'aria-hidden': 'true' });
    if (!form || !sc.stage) return cv;
    var cr = A.creature(form.seed, form.stage, sc.soul), img = st.distressed && cr.frames.blink ? cr.frames.blink : cr.frames.open, c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
    var tmp = document.createElement('canvas'); tmp.width = img.width; tmp.height = img.height; var t = tmp.getContext('2d'); t.drawImage(img, 0, 0);
    var d0 = t.getImageData(0, 0, tmp.width, tmp.height).data, x0 = tmp.width, y0 = tmp.height, x1 = 0, y1 = 0;
    for (var y = 0; y < tmp.height; y++) for (var x = 0; x < tmp.width; x++) if (d0[(y * tmp.width + x) * 4 + 3]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    var bw = x1 - x0 + 1, bh = y1 - y0 + 1, k = Math.max(1, Math.floor(Math.min(56 / bw, 56 / bh))), sag = st.distressed ? 3 : 0;
    c.drawImage(tmp, x0, y0, bw, bh, Math.round(32 - bw * k / 2), Math.round(60 - bh * k) + sag, bw * k, bh * k - sag);
    var top = Math.round(60 - bh * k) + sag;
    c.fillStyle = st.lv.brain < C.VIT.DISTRESS ? '#ef7d57' : '#38b764'; [[0, 3], [-2, 4], [2, 4], [-1, 5], [1, 5]].forEach(function (q) { c.fillRect(32 + q[0] * 2, top + q[1] * 2, 2, 2); });
    return cv;
  }
  var redraw = function () { ui().renderPanel(true); }; // 2.1.13: the Vitals also open as a pop-up (the drone in the sky), which redraws itself
  V.view = function (into, opts) {
    redraw = (opts && opts.redraw) || function () { ui().renderPanel(true); };
    var a = app(), S = a.S, d = today(), tab = V.tab || 'stat', p = h('div', { cls: 'pip' }), st = V.state(S);
    into.appendChild(p);
    p.appendChild(h('div', { cls: 'piphead' }, h('b', { text: S.totemName.toUpperCase() + ' VITALS ' + st.avg + '%' }), h('span', { cls: 'pgstate' + (st.distressed ? ' red' : ''), text: V.word(st) })));
    p.appendChild(h('div', { cls: 'piptabs', role: 'tablist' }, [['stat', 'STAT'], ['log', 'LOG'], ['info', 'INFO']].map(function (x) {
      return h('button', { type: 'button', role: 'tab', cls: tab === x[0] ? 'on' : '', 'aria-selected': tab === x[0] ? 'true' : 'false', text: x[1], onclick: function () { V.tab = x[0]; redraw(); } });
    })));
    if (tab === 'log') return logTab(p, S, d);
    if (tab === 'info') return infoTab(p, S);
    p.appendChild(checkCard(S, d, null, function () { document.querySelectorAll('.sheet').forEach(function (x) { x.remove(); }); }));
    var open = V.open || null;
    function part(s) {
      var n = st.lv[s.k];
      return h('button', { type: 'button', cls: 'pippart p-' + s.k + (n >= C.VIT.FULL ? ' full' : '') + (n < C.VIT.DISTRESS ? ' low' : '') + (open === s.k ? ' open' : ''), 'aria-expanded': open === s.k ? 'true' : 'false', 'aria-label': s.name + ' ' + n + '%. Tap to check in something you did.', onclick: function () { V.open = open === s.k ? null : s.k; redraw(); } },
        h('span', { cls: 'pplabel', text: s.name.toUpperCase() + ' ' + n + '%' }), seg(Math.round(n / 20), 5), h('span', { cls: 'ppwhat', text: s.what }));
    }
    p.appendChild(h('div', { cls: 'pipbody' },
      h('div', { cls: 'pipbrain' }, part(BYK.brain)),
      h('div', { cls: 'pipcol' }, part(BYK.heart), part(BYK.gut)),
      figure(st),
      h('div', { cls: 'pipcol' }, part(BYK.move), part(BYK.rest))));
    if (open) {
      var dn = {}; G.day(S, d).forEach(function (g) { if (g.kind === 'calm') dn[g.item] = 1; });
      p.appendChild(h('div', { cls: 'piplog' }, h('p', { text: BYK[open].name + ': what did you do?' }), h('div', { cls: 'pipchips' }, V.itemsFor(S, open).map(function (it) {
        return h('button', { type: 'button', cls: dn[it] ? 'did' : '', text: (dn[it] ? 'Again: ' : '') + it, onclick: function () { V.checkIn(it, open).then(function () { K().snack(BYK[open].name + ' +' + C.VIT.GAIN); }); } });
      }))));
    }
    p.appendChild(h('div', { cls: 'piptoday' }, h('div', { cls: 'row spread' }, h('b', { text: 'VITALS ' + st.avg + '%' }), h('span', { text: (S.vitals || {})[d] ? '+10 GROWTH EARNED TODAY' : C.VIT.FULL + '% = +10 GROWTH' })), seg(Math.round(st.avg / 10), 10, 'big'),
      h('span', { cls: 'small', text: st.distressed ? S.totemName + ' is worn out. He keeps going but won\'t grow until you check in a few calm things you really did.' : 'Each part wears down through the day. Check in what you really did to fill it back up.' })));
  };
  function checkCard(S, d, onDone, onLeave) { // onDone: after Yes / Skip (default: redraw the page); onLeave: before going to make a tile
    var box = h('div', { cls: 'pipcard vcheck' }), k = K(), nx = V.next(S, d);
    if (!nx) { box.appendChild(h('p', { text: 'All caught up. Come back after your next calm thing.' })); return box; }
    var s0 = BYK[nx.k];
    function ask() {
      k.clear(box);
      box.appendChild(h('div', { cls: 'vq' }, h('span', { cls: 'vsys', text: s0.name.toUpperCase() + ' ' + V.state(S).lv[nx.k] + '%' }), h('b', { text: V.ask(nx.item) })));
      box.appendChild(h('div', { cls: 'row wrap' },
        k.btn('Yes', function () { V.checkIn(nx.item, nx.k).then(function () { k.snack(s0.name + ' +' + C.VIT.GAIN); if (onDone) onDone(); else redraw(); }); }, 'primary'),
        k.btn('Not yet', notYet)));
    }
    function notYet() {
      k.clear(box);
      box.appendChild(h('p', { text: 'Want a tile so you remember? Do it, then come back and say Yes.' }));
      box.appendChild(h('div', { cls: 'row wrap' },
        k.btn('Make a tile', function () { var nm = V.tileName(nx.item); skip(nx.item); if (onLeave) onLeave(); ui().go('quests'); ui().toPanel(); AIU.panels.newTile('list', nm); }, 'primary'),
        k.btn('Skip', function () { skip(nx.item); if (onDone) onDone(); else redraw(); }),
        k.btn('Back', ask, 'ghost')));
    }
    ask();
    return box;
  }
  V.checkCard = checkCard;
  function logTab(p, S, d) {
    var a = app(), k = K(), list = G.day(S, d).filter(function (g) { return g.kind === 'calm'; });
    p.appendChild(h('p', { cls: 'pipsub', text: 'TODAY\'S CHECK-INS' }));
    if (!list.length) p.appendChild(h('p', { cls: 'small', text: 'Nothing checked in yet today.' }));
    list.slice().reverse().forEach(function (g) {
      var s0 = BYK[C.vitSys(g)];
      p.appendChild(h('div', { cls: 'piprow' }, h('span', { text: U.fmtHm(U.hmStr(new Date(g.t)), k.c24()) }), h('span', { cls: 'grow1', text: g.item }), h('span', { cls: 'small', text: s0 ? s0.name : '' }),
        h('button', { type: 'button', cls: 'pipx', text: 'X', 'aria-label': 'Remove ' + g.item, onclick: function () { a.addEvents([{ type: 'gaba', data: { ref: g.id, removed: true } }]).then(function () { k.snack('Removed.', function () { a.addEvents([{ type: 'gaba', data: { ref: g.id, removed: false } }]); }); }); } })));
    });
    p.appendChild(h('p', { cls: 'pipsub', text: 'THIS WEEK (check-ins)' }));
    var wk = h('div', { cls: 'pipweek' });
    for (var i = 6; i >= 0; i--) {
      var dd = U.addDays(d, -i), n = G.day(S, dd).filter(function (g) { return g.kind === 'calm'; }).length;
      wk.appendChild(h('div', { cls: 'pwday' + ((S.vitals || {})[dd] ? ' full' : '') }, h('div', { cls: 'pwcol' }, h('i', { style: 'height:' + Math.max(3, Math.min(100, n * 12)) + '%' })), h('span', { text: U.DAYNAMES[U.weekday(dd)].slice(0, 2) + ' ' + n })));
    }
    p.appendChild(wk);
  }
  function infoTab(p, S) {
    var a = app();
    p.appendChild(h('p', { text: 'Aiu Vitals are ' + S.totemName + '\'s health, kept up by the calm things you do in real life, on your own time. Glutamate helps you GO; GABA helps you SLOW DOWN. These are the brake.' }));
    p.appendChild(h('p', { cls: 'small', text: 'A Yes fills that part ' + C.VIT.GAIN + '%. Each part wears down about ' + Math.round(C.VIT.RATE * 24) + '% a day. Under ' + C.VIT.DISTRESS + '% on average, ' + S.totemName + ' is distressed: he carries on, looks tired and stops growing until you check in. At ' + C.VIT.FULL + '% he grows +10 (once a day). Tiles are separate: finishing a tile doesn\'t change your Vitals.' }));
    V.SYS.forEach(function (s) { p.appendChild(h('p', { cls: 'small' }, h('b', { text: s.name + ' (' + s.what + '): ' }), V.itemsFor(S, s.k).join(', ') + '.')); });
    p.appendChild(h('p', { cls: 'small', text: 'The questions start with what calms you. Tell ' + S.totemName + ' in your Profile ("knows you").' }));
    p.appendChild(K().btn('What calms me (Profile)', function () { document.querySelectorAll('.sheet').forEach(function (x) { x.remove(); }); var st0 = AIU.panels.state; st0.folder = AIU.planner.ME; st0.bsub = 'profile'; ui().go('journal', 'profiles'); a.local.acc = Object.assign({}, a.local.acc || {}, { 'me-calm': true }); a.saveLocal(); ui().renderPanel(true); }, 'mini'));
    p.appendChild(h('p', { cls: 'small', text: G.DISCLAIMER }));
  }
})();
