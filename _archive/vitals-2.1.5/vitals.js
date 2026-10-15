/* AIU TOTEM 2.1.5 - Aiu Vitals: the GABA (Go / Brake) system as a scanner-style screen (in the app's own colors).
   Your calm things feed five body systems on Aiu: Brain (calm focus), Heart (connection), Arms & legs (movement),
   Gut (fuel) and Rest (recharge). Each system fills at 10 brake points; all five full = today's Vitals at 100%,
   which grows Aiu +10 (once a day: core.js counts it). Go things show in the brain's Go / Brake gauge; they never
   take your bar away. Data: the same synced 'gaba' events as before (nothing new to store except the 'vitals' reward).
   Educational only, not medical advice. */
(function () {
  'use strict';
  var U = AIU.util, C = AIU.core, A = AIU.art, P = A.P, h = U.h, G = AIU.gaba;
  var V = AIU.vitals = {};
  function app() { return AIU.app; }
  function ui() { return AIU.ui; }
  function K() { return AIU.ui.k; }
  var today = U.today;

  V.FULL = 10; // brake points that fill one system
  V.SYS = [
    { k: 'brain', name: 'Brain', what: 'calm focus', items: ['Slow breathing (4 in / 4 out)', 'Meditation / mindfulness', 'Reading', 'Journaling', 'Puzzles / LEGO', 'Calm music'] },
    { k: 'heart', name: 'Heart', what: 'connection and joy', items: ['Time with pets', 'Safe hugs / social support', 'Walk the dog', 'Playing an instrument', 'Drawing / painting'] },
    { k: 'move', name: 'Arms & legs', what: 'movement', items: ['Walk outside', 'Stretching / yoga', 'Nature time (park / woods)', 'Fishing / sitting by water', 'Light cleaning / simple chores'] },
    { k: 'gut', name: 'Gut', what: 'fuel', items: ['Drink a glass of water', 'Eat a real meal', 'Warm drink at night'] },
    { k: 'rest', name: 'Rest', what: 'recharge', items: ['Sleep routine (same time)', 'Short nap (20 min)', 'Warm bath / shower', 'Low lights at night', 'Cozy blanket / comfort items', 'Lavender smell', 'Morning sunlight', 'Cold splash on face (quick reset)', 'Brush teeth'] }
  ];
  var SYSOF = {}; V.SYS.forEach(function (s) { s.items.forEach(function (it) { SYSOF[it] = s.k; }); });
  G.CALM_FOODS.forEach(function (f) { SYSOF[f[0]] = 'gut'; });
  V.sysOf = function (item) { return SYSOF[item] || 'brain'; }; // your own words or a "mixed" thing that calmed you: the brain
  // today's (or any day's) Vitals: points per system, and the % (each system counts up to FULL)
  V.day = function (S, d) {
    var pts = {}; V.SYS.forEach(function (s) { pts[s.k] = 0; });
    G.day(S, d).forEach(function (g) { if (g.kind === 'calm' && g.pts > 0) pts[V.sysOf(g.item)] += g.pts; });
    var sum = 0; V.SYS.forEach(function (s) { sum += Math.min(V.FULL, pts[s.k]); });
    return { pts: pts, pct: Math.round(sum / (V.FULL * V.SYS.length) * 100), done: !!((S.vitals || {})[d]) };
  };
  V.pct = function (S, d) { return V.day(S, d).pct; };
  V.streak = function (S, d) { var n = 0, x = (S.vitals || {})[d] ? d : U.addDays(d, -1); while ((S.vitals || {})[x]) { n++; x = U.addDays(x, -1); } return n; };
  // the reward: the first time today reaches 100% (called after every change; core.js makes sure it only ever pays once a day)
  var asking = '';
  V.maybeReward = function () {
    var a = app(), S = a && a.S; if (!S || !S.hatched) return;
    var d = today(), v = V.day(S, d);
    if (v.pct < 100 || v.done || asking === d) return;
    asking = d;
    a.addEvents([{ type: 'vitals', data: { day: d } }], true).then(function () { a.react('quest', '+10'); K().snack('Vitals 100%! ' + S.totemName + ' grows +10.'); });
  };

  /* ---------- the screen ---------- */
  function seg(n, of, cls) { var b = h('span', { cls: 'pipseg' + (cls ? ' ' + cls : ''), 'aria-hidden': 'true' }); for (var i = 0; i < of; i++) b.appendChild(h('i', { cls: i < n ? 'on' : '' })); return b; }
  function figure(S) { // Aiu, in scanner green
    var a = app(), sc = a.sceneState(), form = sc.skin || sc.form, cv = h('canvas', { cls: 'pipfig', width: 64, height: 64, 'aria-hidden': 'true' });
    if (!form || !sc.stage) return cv;
    var cr = A.creature(form.seed, form.stage, sc.soul), img = cr.frames.open, c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
    var tmp = document.createElement('canvas'); tmp.width = img.width; tmp.height = img.height; var t = tmp.getContext('2d'); t.drawImage(img, 0, 0);
    var id = t.getImageData(0, 0, tmp.width, tmp.height), d0 = id.data, x0 = tmp.width, y0 = tmp.height, x1 = 0, y1 = 0;
    for (var y = 0; y < tmp.height; y++) for (var x = 0; x < tmp.width; x++) { var i = (y * tmp.width + x) * 4; if (!d0[i + 3]) continue; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    var bw = x1 - x0 + 1, bh = y1 - y0 + 1, k = Math.max(1, Math.floor(Math.min(56 / bw, 56 / bh)));
    c.drawImage(tmp, x0, y0, bw, bh, Math.round(32 - bw * k / 2), Math.round(60 - bh * k), bw * k, bh * k);
    // the "scan": a brain spot on top and a few ligament lines
    var top = Math.round(60 - bh * k), cx = 32;
    c.fillStyle = G.bar(S, U.dayStr(new Date(app().trueNow()))) < G.RED ? '#ef7d57' : '#38b764'; [[0, 3], [-2, 4], [2, 4], [-1, 5], [1, 5]].forEach(function (q) { c.fillRect(cx + q[0] * 2, top + q[1] * 2, 2, 2); });
    c.fillStyle = '#41a6f6'; for (var j = 0; j < 4; j++) { c.fillRect(cx - Math.round(bw * k / 2) - 4 + j, top + Math.round(bh * k * 0.55) + j, 1, 1); c.fillRect(cx + Math.round(bw * k / 2) + 3 - j, top + Math.round(bh * k * 0.55) + j, 1, 1); }
    return cv;
  }
  V.view = function (into) {
    var a = app(), S = a.S, k = K(), d = today(), tab = V.tab || 'stat', p = h('div', { cls: 'pip' });
    into.appendChild(p);
    var v = V.day(S, d), gv = G.bar(S, d), lv = G.level(S), streak = V.streak(S, d);
    p.appendChild(h('div', { cls: 'piphead' }, h('b', { text: S.totemName.toUpperCase() + ' VITALS' }), h('span', { text: 'LV ' + lv.n + ' ' + lv.name.toUpperCase() })));
    p.appendChild(h('div', { cls: 'piptabs', role: 'tablist' }, [['stat', 'STAT'], ['log', 'LOG'], ['info', 'INFO']].map(function (x) {
      return h('button', { type: 'button', role: 'tab', cls: tab === x[0] ? 'on' : '', 'aria-selected': tab === x[0] ? 'true' : 'false', text: x[1], onclick: function () { V.tab = x[0]; ui().renderPanel(true); } });
    })));
    if (tab === 'log') return logTab(p, S, d);
    if (tab === 'info') return infoTab(p, S);
    // STAT: the body, the brain's Go / Brake gauge, today's bar, one suggestion
    var open = V.part || null;
    function part(s) {
      var n = Math.min(V.FULL, v.pts[s.k]), full = n >= V.FULL;
      return h('button', { type: 'button', cls: 'pippart p-' + s.k + (full ? ' full' : '') + (open === s.k ? ' open' : ''), 'aria-expanded': open === s.k ? 'true' : 'false', 'aria-label': s.name + ': ' + Math.round(n / V.FULL * 100) + '%. Tap to log something.', onclick: function () { V.part = open === s.k ? null : s.k; ui().renderPanel(true); } },
        h('span', { cls: 'pplabel', text: s.name.toUpperCase() }), seg(Math.round(n / V.FULL * 5), 5), h('span', { cls: 'ppwhat', text: s.what }));
    }
    var SY = {}; V.SYS.forEach(function (s) { SY[s.k] = s; });
    p.appendChild(h('div', { cls: 'pipbody' },
      h('div', { cls: 'pipbrain' }, part(SY.brain), h('div', { cls: 'pipgauge', role: 'img', 'aria-label': 'Go / Brake at ' + gv + ' of 100: ' + G.state(gv) }, h('span', { text: 'GO' }), h('span', { cls: 'pgtrack' }, h('i', { style: 'left:' + gv + '%' })), h('span', { text: 'BRAKE' })),
        h('span', { cls: 'pgstate' + (gv < G.RED ? ' red' : ''), text: G.state(gv) })),
      h('div', { cls: 'pipcol' }, part(SY.heart), part(SY.gut)),
      figure(S),
      h('div', { cls: 'pipcol' }, part(SY.move), part(SY.rest))));
    if (open) {
      var s0 = SY[open], items = s0.items.concat(open === 'gut' ? G.CALM_FOODS.map(function (f) { return f[0]; }) : []).filter(function (it) { return G.pref(S, it) !== 'no'; });
      p.appendChild(h('div', { cls: 'piplog' }, h('p', { text: s0.name + ': what did you do?' }), h('div', { cls: 'pipchips' }, items.map(function (it) {
        var f = G.find(it), pts = f ? f.pts : 6;
        return h('button', { type: 'button', text: (G.pref(S, it) === 'yes' ? '* ' : '') + it + ' +' + pts, onclick: function () { a.logGaba('calm', it, pts); } });
      }))));
    }
    p.appendChild(h('div', { cls: 'piptoday' }, h('div', { cls: 'row spread' }, h('b', { text: 'TODAY ' + v.pct + '%' }), h('span', { text: v.done ? '+10 GROWTH EARNED' : 'FILL ALL 5 = +10 GROWTH' })), seg(Math.round(v.pct / 10), 10, 'big'),
      h('span', { cls: 'small', text: streak ? streak + ' full day' + (streak === 1 ? '' : 's') + ' in a row' : 'Tap a body part to log a calm thing. Finishing calm tiles and journal entries ("I went for a walk") count too.' })));
    // one suggestion a day-ish (Yes makes it a tile, Not today, Never)
    var nx = AIU.panels.q21Next && AIU.panels.q21Next(S, 'gaba');
    if (nx) { var card = AIU.panels.q21Card(nx, function () { ui().renderPanel(true); }); card.classList.add('pipcard'); p.appendChild(card); }
  };
  function logTab(p, S, d) {
    var a = app(), k = K(), list = G.day(S, d);
    p.appendChild(h('p', { cls: 'pipsub', text: 'TODAY' }));
    if (!list.length) p.appendChild(h('p', { cls: 'small', text: 'Nothing logged yet today.' }));
    list.slice().reverse().forEach(function (g) {
      p.appendChild(h('div', { cls: 'piprow' }, h('span', { text: U.fmtHm(U.hmStr(new Date(g.t)), k.c24()) }), h('span', { cls: 'grow1', text: g.item }), h('span', { text: (g.pts > 0 ? '+' : '') + g.pts }),
        h('button', { type: 'button', cls: 'pipx', text: 'X', 'aria-label': 'Remove ' + g.item, onclick: function () { a.addEvents([{ type: 'gaba', data: { ref: g.id, removed: true } }]).then(function () { k.snack('Removed.', function () { a.addEvents([{ type: 'gaba', data: { ref: g.id, removed: false } }]); }); }); } })));
    });
    function grid(arr, kind) { return h('div', { cls: 'pipchips' }, arr.map(function (x) { return h('button', { type: 'button', text: x[0] + ' ' + x[1], onclick: function () { a.logGaba(kind, x[0], x[1]); } }); })); }
    p.appendChild(k.acc('pip-go', 'Something revved me up (Go)', [h('p', { cls: 'small', text: 'No judgment: it just moves the brain\'s gauge toward Go. It never empties your Vitals.' }), grid(G.STRESS_ACTS, 'stress'), grid(G.STRESS_FOODS, 'stress')], false));
    p.appendChild(k.acc('pip-mixed', 'Mixed: it depends on you', [h('div', { cls: 'pipchips' }, G.MIXED.map(function (x) { return h('button', { type: 'button', text: x[0], onclick: function () { AIU.panels.mixedAsk(x[0]); } }); }))], false));
    p.appendChild(h('p', { cls: 'pipsub', text: 'THIS WEEK' }));
    var wk = h('div', { cls: 'pipweek' });
    for (var i = 6; i >= 0; i--) { var dd = U.addDays(d, -i), pc = V.pct(S, dd); wk.appendChild(h('div', { cls: 'pwday' + ((S.vitals || {})[dd] ? ' full' : '') }, h('div', { cls: 'pwcol' }, h('i', { style: 'height:' + Math.max(3, pc) + '%' })), h('span', { text: U.DAYNAMES[U.weekday(dd)].slice(0, 2) }))); }
    p.appendChild(wk);
    var lv = G.level(S);
    p.appendChild(h('p', { cls: 'small', text: 'Brake level ' + lv.n + ' (' + lv.name + ')' + (lv.next ? ': ' + (lv.next - lv.xp) + ' brake points to ' + lv.nextName : ': top level!') + '.' }));
  }
  function infoTab(p, S) {
    var a = app(), k = K(), Pf = S.prefs || {};
    p.appendChild(h('p', { text: 'Glutamate helps you GO. GABA helps you SLOW DOWN. Balance the gas with the brake: one calm thing for each part of you, every day.' }));
    V.SYS.forEach(function (s) { p.appendChild(h('p', { cls: 'small' }, h('b', { text: s.name + ' (' + s.what + '): ' }), s.items.join(', ') + (s.k === 'gut' ? ', and calming foods' : '') + '.')); });
    function list(title, kind, v) {
      var items = G.questions().filter(function (q) { return q.kind === kind && Pf[q.id] && Pf[q.id].v === v; });
      if (!items.length) return null;
      return k.acc('pip-' + kind + v, title, items.map(function (q) {
        return h('div', { cls: 'piprow' }, h('span', { cls: 'grow1', text: q.item }), h('button', { type: 'button', cls: 'pipx', text: 'Change', onclick: function () { a.addEvents([{ type: 'pref', data: { item: q.id, kind: q.kind, v: v === 'yes' ? 'no' : 'yes' } }], true).then(function () { ui().renderPanel(true); }); } }));
      }), false, items.length);
    }
    [list('Calms you', 'calm', 'yes'), list('Calming foods you like', 'calmfood', 'yes'), list('Things you\'re cutting back on', 'stress', 'yes'), list('Not for you (no more suggestions)', 'calm', 'no')].forEach(function (x) { if (x) p.appendChild(x); });
    p.appendChild(h('p', { cls: 'small', text: G.DISCLAIMER + ' In the red (under ' + G.RED + '), ' + S.totemName + ' is stressed and grows at a quarter speed until you do something calm.' }));
  }
})();
