/* AIU TOTEM 2.0.8 - the mini games. Tap the pet in the yard (or the computer when Aiu is inside) for the hub.
   Three games, all drawn in code like the world, all made by KODNA:
     Slice  - swipe the seashells and logs that fly up; miss one or crack a rainbow egg and you lose a heart.
     Wilds  - a turn-based battle with a wild pixel creature. Tap on time for stronger hits and blocks.
     Spar   - box with your own Aiu: jab, hold Block, and counter right after a good block.
   A win grows Aiu +1, at most 3 wins a day (core.js caps it, so it can't be farmed). */
(function () {
  'use strict';
  var U = AIU.util, A = AIU.art, P = A.P, h = U.h, GM = AIU.games = {};
  function app() { return AIU.app; }
  var today = U.today;
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ---------- pixel helpers (the world's own, from art.js) ---------- */
  var KIT = A.kit, R = KIT.R, disc = KIT.disc, ell = KIT.ell, mk = KIT.mk;
  function ring(c, cx, cy, r, col) { var n = Math.max(12, Math.round(r * 6)); for (var i = 0; i < n; i++) { var a = i / n * Math.PI * 2; R(c, cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1, 1, col); } }
  function txt(c, s, x, y, col, size, al) {
    c.font = (size || 8) + 'px Term, ui-monospace, monospace'; c.textAlign = al || 'left'; c.textBaseline = 'top';
    c.fillStyle = P.ink; c.fillText(s, Math.round(x) + 1, Math.round(y) + 1); c.fillStyle = col || P.white; c.fillText(s, Math.round(x), Math.round(y));
  }
  function tint(cv, col) { var t = mk(cv.width, cv.height), c = t.getContext('2d'); c.drawImage(cv, 0, 0); c.globalCompositeOperation = 'source-atop'; R(c, 0, 0, t.width, t.height, col); return t; }
  function bbox(cv) { // the drawn part of a sprite (creature canvases have room around them)
    if (cv.__bb) return cv.__bb;
    var d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data, x0 = cv.width, y0 = cv.height, x1 = -1, y1 = -1;
    for (var y = 0; y < cv.height; y++) for (var x = 0; x < cv.width; x++) if (d[(y * cv.width + x) * 4 + 3] > 0) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) { x0 = 0; y0 = 0; x1 = cv.width - 1; y1 = cv.height - 1; }
    return (cv.__bb = { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 });
  }
  function heart(c, x, y, col) { R(c, x + 1, y, 2, 1, col); R(c, x + 4, y, 2, 1, col); R(c, x, y + 1, 7, 2, col); R(c, x + 1, y + 3, 5, 1, col); R(c, x + 2, y + 4, 3, 1, col); R(c, x + 3, y + 5, 1, 1, col); }

  /* ---------- sound: tiny synth (respects the sound switch) ---------- */
  var ac = null, noiseBuf = null;
  function sfx(k) {
    var a = app(); if (a.dev.mute) return;
    try {
      if (!ac) { var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; ac = new AC(); }
      if (ac.state === 'suspended') ac.resume();
      var t = ac.currentTime;
      var tone = function (type, f0, f1, st, d, v) {
        var o = ac.createOscillator(), g = ac.createGain(); o.type = type;
        o.frequency.setValueAtTime(f0, t + st); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + st + d);
        g.gain.setValueAtTime(v, t + st); g.gain.exponentialRampToValueAtTime(0.001, t + st + d);
        o.connect(g); g.connect(ac.destination); o.start(t + st); o.stop(t + st + d + 0.02);
      };
      var noise = function (st, d, v, hp) {
        if (!noiseBuf) { noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.4, ac.sampleRate); var ch = noiseBuf.getChannelData(0); for (var i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; }
        var s = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter(); s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = hp || 800;
        g.gain.setValueAtTime(v, t + st); g.gain.exponentialRampToValueAtTime(0.001, t + st + d);
        s.connect(f); f.connect(g); g.connect(ac.destination); s.start(t + st); s.stop(t + st + d + 0.02);
      };
      if (k === 'slice') { noise(0, 0.09, 0.25, 2500); tone('triangle', 700, 1400, 0, 0.07, 0.05); }
      else if (k === 'swoosh') noise(0, 0.06, 0.06, 4000);
      else if (k === 'bomb') { noise(0, 0.4, 0.5, 100); tone('square', 120, 40, 0, 0.35, 0.12); }
      else if (k === 'miss') tone('square', 300, 150, 0, 0.18, 0.06);
      else if (k === 'hit') { noise(0, 0.08, 0.35, 300); tone('square', 200, 80, 0, 0.1, 0.1); }
      else if (k === 'block') { tone('square', 900, 700, 0, 0.05, 0.07); noise(0, 0.04, 0.15, 3000); }
      else if (k === 'great') { tone('square', 880, 880, 0, 0.06, 0.06); tone('square', 1320, 1320, 0.07, 0.1, 0.06); }
      else if (k === 'tick') tone('square', 1200, 1200, 0, 0.03, 0.04);
      else if (k === 'win') { [523, 659, 784, 1047].forEach(function (f, i) { tone('square', f, f, i * 0.11, 0.12, 0.06); }); }
      else if (k === 'lose') { [392, 330, 262].forEach(function (f, i) { tone('triangle', f, f * 0.98, i * 0.16, 0.18, 0.08); }); }
      else if (k === 'bell') { tone('sine', 1400, 1380, 0, 0.6, 0.12); tone('sine', 2100, 2080, 0, 0.4, 0.05); }
    } catch (e) {}
  }

  /* ---------- 2.3.0: Easy, Normal or Hard (picked in the Games menu). More time and lower goals on Easy, tougher foes on Hard ---------- */
  var DIFF = { easy: { t: 1.35, goal: 0.7, foe: 0.75, name: 'Easy' }, normal: { t: 1, goal: 1, foe: 1, name: 'Normal' }, hard: { t: 0.85, goal: 1.25, foe: 1.3, name: 'Hard' } };
  GM.diffId = function () { var d = app().local.gDiff; return DIFF[d] ? d : 'normal'; };
  GM.D = function () { return DIFF[GM.diffId()]; };
  /* ---------- rewards: a win grows Aiu +1, up to 3 wins a day (core.js keeps the real count) ---------- */
  GM.winsToday = function () { var L = app().local, d = today(); return L.gWinDay === d ? (L.gWins || 0) : 0; };
  function payWin(game, score) {
    var a = app(), L = a.local, d = today();
    if (L.gWinDay !== d) { L.gWinDay = d; L.gWins = 0; }
    var paid = (L.gWins || 0) < 3; L.gWins = (L.gWins || 0) + 1; a.saveLocal();
    a.addEvents([{ type: 'game', data: { g: game, win: true, score: score || 0 } }], true);
    return paid;
  }
  function bests() { var a = app(), B = Object.assign({}, a.local.gBest || {}); Object.keys(a.S.gbest || {}).forEach(function (k) { B[k] = Math.max(B[k] || 0, a.S.gbest[k]); }); return B; } // 2.1.5: synced best scores
  function best(game, score) { var B = bests(); if (score > (B[game] || 0)) { app().addEvents([{ type: 'game', data: { g: game, win: false, score: score } }], true); return true; } return false; }

  /* ---------- Aiu, as it looks right now ---------- */
  function aiu() {
    var a = app(), sc = a.sceneState(), form = sc.skin || sc.form;
    if (!form || !sc.stage) return null;
    return { cr: A.creature(form.seed, form.stage, sc.soul), stage: form.stage || 1, name: a.S.totemName, kind: A.kindOf(sc.soul) };
  }

  /* ---------- the game frame: full screen, a pixel canvas, a bar on top and controls below ---------- */
  var cur = null;
  function stage(title) {
    if (cur) cur.close();
    var ov = h('div', { cls: 'gov', role: 'dialog', 'aria-label': title });
    var hud = h('div', { cls: 'ghud', 'aria-live': 'polite' });
    var G = { alive: true, t: 0, keys: {} };
    var close = h('button', { type: 'button', cls: 'gclose', text: 'Close', onclick: function () { G.close(); } });
    var wrap = h('div', { cls: 'gwrap' }), cv = h('canvas', { cls: 'gcv' });
    var ctl = h('div', { cls: 'gctl' });
    wrap.appendChild(cv);
    ov.appendChild(h('div', { cls: 'gtop' }, h('b', { cls: 'gtitle', text: title }), hud, close));
    ov.appendChild(wrap); ov.appendChild(ctl);
    document.body.appendChild(ov); document.documentElement.classList.add('gopen');
    // 2.1.3: iPhone: stop double-tap zoom, pinch zoom and the long-press menu while a game is open
    var vp = document.querySelector('meta[name="viewport"]'), vp0 = vp ? vp.getAttribute('content') : null;
    if (vp) vp.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
    var lastTouch = 0;
    function noZoom(e) { var t = Date.now(); if (t - lastTouch < 350 && !(e.target.closest && e.target.closest('button, .gpanel'))) e.preventDefault(); lastTouch = t; }
    function noGesture(e) { e.preventDefault(); }
    ov.addEventListener('touchend', noZoom, { passive: false });
    ov.addEventListener('dblclick', noGesture);
    ov.addEventListener('contextmenu', noGesture);
    document.addEventListener('gesturestart', noGesture, { passive: false });
    ov.addEventListener('touchmove', function (e) { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });
    Object.assign(G, { ov: ov, cv: cv, ctx: cv.getContext('2d'), hud: hud, ctl: ctl, wrap: wrap });
    G.fit = function () {
      var r = wrap.getBoundingClientRect(), s = Math.max(2, Math.floor(Math.min(r.width, r.height) / 165)); G.lw = r.width; G.lh = r.height;
      G.s = s; G.W = Math.max(80, Math.floor(r.width / s)); G.H = Math.max(80, Math.floor(r.height / s));
      cv.width = G.W; cv.height = G.H; cv.style.width = (G.W * s) + 'px'; cv.style.height = (G.H * s) + 'px';
      G.ctx.imageSmoothingEnabled = false; G.m = Math.max(1, Math.round(Math.min(G.W, G.H) / 110));
      if (G.onFit) G.onFit();
    };
    G.pt = function (e) { var r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * G.W, y: (e.clientY - r.top) / r.height * G.H }; };
    G.buttons = function (list) { // [[label, fn, cls, holdFn]]
      U.clear ? U.clear(ctl) : (ctl.innerHTML = '');
      ctl.style.gridTemplateColumns = 'repeat(' + Math.max(1, list.length) + ', 1fr)';
      return list.map(function (b) {
        var el = h('button', { type: 'button', cls: 'gbtn ' + (b[2] || ''), text: b[0] });
        if (b[3]) { // hold: down/up
          var on = function (e) { e.preventDefault(); b[3](true); }, off = function (e) { e.preventDefault(); b[3](false); };
          el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('pointerleave', off);
          el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
        } else el.addEventListener('pointerdown', function (e) { e.preventDefault(); if (!el.disabled) b[1](); });
        el.addEventListener('click', function (e) { if (e.detail === 0 && b[1]) b[1](); }); // keyboard Enter / Space
        ctl.appendChild(el); return el;
      });
    };
    var _btn = G.buttons; G.buttons = function (list) { var r0 = _btn(list); if (G.W) { var r = wrap.getBoundingClientRect(); if (Math.abs(r.height - G.lh) > 1) G.fit(); } return r0; };
    G.panel = function (title2, lines, btns) {
      G.unpanel();
      var p = h('div', { cls: 'gpanel', role: 'alert' }, h('h3', { text: title2 }), lines.map(function (l) { return h('p', { text: l }); }),
        h('div', { cls: 'grow' }, btns.map(function (b) { return h('button', { type: 'button', cls: 'gbtn ' + (b[2] || ''), text: b[0], onclick: b[1] }); })));
      wrap.appendChild(p); G.pan = p; var f0 = p.querySelector('button'); if (f0) setTimeout(function () { try { f0.focus(); } catch (e) {} }, 50);
    };
    G.unpanel = function () { if (G.pan) { G.pan.remove(); G.pan = null; } };
    G.endPanel = function (game, won, title2, lines) {
      var paid = won ? payWin(game, G.score || 0) : false;
      sfx(won ? 'win' : 'lose');
      var bb = bests()[game]; if (bb) lines.push('Best: ' + Math.max(bb, G.score || 0) + ' · ' + GM.D().name);
      if (won) lines.push(paid ? app().S.totemName + ' grows +1. (' + Math.max(0, 3 - GM.winsToday()) + ' more winning games grow it today.)' : 'That\'s 3 wins today: still fun, no more growth until tomorrow.');
      G.panel(title2, lines, [['Play again', function () { G.unpanel(); G.restart(); }, 'primary'], ['Games', function () { G.close(); GM.hub(); }]]);
      if (won) { try { app().setMode('hop', 900); } catch (e) {} }
    };
    var last = 0, raf = 0;
    function loop(ts) {
      if (!G.alive) return;
      raf = requestAnimationFrame(loop);
      if (document.hidden) { last = 0; return; }
      var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0; last = ts; G.t += dt;
      if (G.update) G.update(dt);
      if (G.draw) G.draw(G.ctx);
    }
    function onKey(e) {
      if (e.key === 'Escape') { G.close(); return; }
      var down = e.type === 'keydown';
      if (G.key && G.key(e.key, down, e)) e.preventDefault();
    }
    function onResize() { G.fit(); }
    window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey); window.addEventListener('resize', onResize);
    var ro = window.ResizeObserver ? new ResizeObserver(function () { var r = wrap.getBoundingClientRect(); if (Math.abs(r.width - (G.lw || 0)) > 1 || Math.abs(r.height - (G.lh || 0)) > 1) G.fit(); }) : null;
    if (ro) ro.observe(wrap);
    G.close = function () {
      if (!G.alive) return; G.alive = false; cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); window.removeEventListener('resize', onResize);
      if (ro) ro.disconnect(); ov.remove(); document.documentElement.classList.remove('gopen'); if (cur === G) cur = null;
      if (vp && vp0) vp.setAttribute('content', vp0); document.removeEventListener('gesturestart', noGesture);
      if (G.onClose) G.onClose();
    };
    G.start = function () { G.fit(); raf = requestAnimationFrame(loop); close.focus(); };
    cur = G;
    return G;
  }

  /* =====================================================================
     SLICE: swipe the fruit
     ===================================================================== */
  // 2.1.4: seashells and tree logs to slice; the bombs are the rainbow egg from the first screen
  function lineP(c, x0, y0, x1, y1, col) { var n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1; for (var i = 0; i <= n; i++) R(c, x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, 1, 1, col); }
  var ITEMS = [
    { n: 'scallop', r: 6, in: P.white, draw: function (c, cx, cy, r) { disc(c, cx, cy, r, P.pink); c.clearRect(0, cy + Math.round(r * 0.35) + 1, c.canvas.width, c.canvas.height); R(c, cx - Math.round(r * 0.35), cy + Math.round(r * 0.35), Math.round(r * 0.7) + 1, Math.round(r * 0.45), P.orange); for (var k = -3; k <= 3; k++) lineP(c, cx, cy + Math.round(r * 0.3), cx + Math.round(Math.sin(k * 0.42) * (r - 1)), cy - Math.round(Math.cos(k * 0.42) * (r - 1)), P.red); } },
    { n: 'conch', r: 6, in: P.pink, draw: function (c, cx, cy, r) { disc(c, cx, cy, r, P.sand); disc(c, cx + 1, cy, Math.round(r * 0.65), P.orange); disc(c, cx + 1, cy, Math.round(r * 0.4), P.sand); disc(c, cx + 2, cy, Math.max(1, Math.round(r * 0.18)), P.orange); for (var t = 0; t < Math.round(r * 0.8); t++) R(c, cx - r - t + 1, cy - Math.round(t * 0.5), 1, Math.max(1, Math.round((r * 0.8 - t) * 0.7)), P.sand); } },
    { n: 'clam', r: 6, in: P.white, draw: function (c, cx, cy, r) { ell(c, cx, cy, r, Math.round(r * 0.7), P.sky); for (var y = -Math.round(r * 0.4); y <= Math.round(r * 0.5); y += 2) R(c, cx - Math.round(r * 0.8), cy + y, Math.round(r * 1.6), 1, P.blue); R(c, cx - 1, cy - Math.round(r * 0.75), 3, 2, P.navy); } },
    { n: 'log', r: 7, in: P.sand, draw: function (c, cx, cy, r) { var h0 = Math.round(r * 0.9); R(c, cx - r, cy - Math.round(h0 / 2), r * 2 - 2, h0, P.bark); for (var x = cx - r + 2; x < cx + r - 3; x += 4) R(c, x, cy - Math.round(h0 / 2) + 1 + (x % 3), 2, 1, P.wood); ell(c, cx + r - 2, cy, Math.max(2, Math.round(r * 0.3)), Math.round(h0 / 2), P.sand); ell(c, cx + r - 2, cy, Math.max(1, Math.round(r * 0.15)), Math.max(1, Math.round(h0 / 4)), P.wood); R(c, cx + r - 2, cy, 1, 1, P.bark); } },
    { n: 'birch', r: 7, in: P.sand, draw: function (c, cx, cy, r) { var h0 = Math.round(r * 0.8); R(c, cx - r, cy - Math.round(h0 / 2), r * 2 - 2, h0, P.white); for (var x = cx - r + 1; x < cx + r - 3; x += 3) R(c, x, cy - Math.round(h0 / 2) + ((x * 7) % h0), 2, 1, P.ink); ell(c, cx + r - 2, cy, Math.max(2, Math.round(r * 0.3)), Math.round(h0 / 2), P.sand); ell(c, cx + r - 2, cy, 1, Math.max(1, Math.round(h0 / 4)), P.wood); } }
  ];
  // a shape with a 1px ink outline, so it reads on any background
  function outlined(sz, hgt, fn) {
    var t = mk(sz, hgt), tc = t.getContext('2d'); fn(tc);
    var o = mk(sz, hgt), oc = o.getContext('2d'), ink = tint(t, P.ink);
    [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(function (d) { oc.drawImage(ink, d[0], d[1]); });
    oc.drawImage(t, 0, 0); return o;
  }
  function itemSprites(f, m) {
    var r = f.r * m, sz = 2 * r + 6, cx = r + 3, cy = r + 3;
    var cv = outlined(sz, sz, function (c) { f.draw(c, cx, cy, r); });
    var data = cv.getContext('2d').getImageData(cx, 0, 1, sz).data;
    var halves = [0, 1].map(function (side) {
      var hc = mk(sz, sz), x = hc.getContext('2d'); x.drawImage(cv, 0, 0);
      if (side === 0) x.clearRect(cx, 0, sz, sz); else x.clearRect(0, 0, cx, sz);
      for (var y = 0; y < sz; y++) if (data[y * 4 + 3] > 0) R(x, side === 0 ? cx - m : cx, y, m, 1, f.in); // the cut face
      return hc;
    });
    return { whole: cv, halves: halves, cx: cx, cy: cy, r: r };
  }
  // the rainbow egg: the first screen's egg, fading through the colors (frames made once, pixel by pixel: no canvas filter needed)
  function hueShift(cv, deg) {
    var o = mk(cv.width, cv.height), c = o.getContext('2d'); c.drawImage(cv, 0, 0);
    var im = c.getImageData(0, 0, o.width, o.height), d = im.data, hsh = deg / 360;
    for (var i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      var r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, hh = 0, ss = 0;
      if (mx !== mn) { var dd = mx - mn; ss = l > 0.5 ? dd / (2 - mx - mn) : dd / (mx + mn); hh = mx === r ? (g - b) / dd + (g < b ? 6 : 0) : mx === g ? (b - r) / dd + 2 : (r - g) / dd + 4; hh /= 6; }
      if (ss < 0.08) continue; // keep the ink and white
      hh = (hh + hsh) % 1; ss = Math.min(1, ss * 1.2);
      var q = l < 0.5 ? l * (1 + ss) : l + ss - l * ss, p0 = 2 * l - q;
      var f2 = function (t) { t = (t + 1) % 1; return t < 1 / 6 ? p0 + (q - p0) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p0 + (q - p0) * (2 / 3 - t) * 6 : p0; };
      d[i] = Math.round(f2(hh + 1 / 3) * 255); d[i + 1] = Math.round(f2(hh) * 255); d[i + 2] = Math.round(f2(hh - 1 / 3) * 255);
    }
    c.putImageData(im, 0, 0); return o;
  }
  function eggSprites(m) {
    var eg = A.egg(U.hash32('aiu-slice-egg'), false), w = eg.width * m, hh = eg.height * m, sz = Math.max(w, hh) + 4;
    var base = mk(sz, sz), c = base.getContext('2d'); c.imageSmoothingEnabled = false; c.drawImage(eg, Math.round((sz - w) / 2), Math.round((sz - hh) / 2), w, hh);
    var frames = []; for (var k = 0; k < 12; k++) frames.push(hueShift(base, k * 30));
    return { whole: frames[0], frames: frames, cx: Math.round(sz / 2), cy: Math.round(sz / 2), r: Math.round(Math.max(w, hh) * 0.42) };
  }
  function slice() {
    var G = stage('Slice'), m, SP = {}, bombSp;
    var fruit = [], bits = [], drops = [], splats = [], trail = [], down = false, lastPt = null, stroke = 0, strokeN = 0, strokeT = 0, pops = [];
    var lives, score, wave, spawnT, over, won, shake, flash, cheer, GOAL = Math.round(30 * GM.D().goal), TIME = Math.round(40 * GM.D().t), left, lostW = {}, extra = 0, EXTRA_MAX = 40; // 2.1.7: combos earn extra seconds
    var me = aiu();
    G.onFit = function () { m = G.m; SP = {}; ITEMS.forEach(function (f) { SP[f.n] = itemSprites(f, m); }); bombSp = eggSprites(m); };
    G.restart = function () { fruit = []; bits = []; drops = []; splats = []; pops = []; G.frz = 0; lostW = {}; lives = 3; score = 0; G.score = 0; wave = 0; spawnT = 0.3; left = TIME; extra = 0; over = false; won = false; shake = 0; flash = 0; cheer = 0; G.t = 0; hud(); };
    function hud() { G.hud.textContent = 'Score ' + score + (won ? '' : ' / ' + GOAL) + ' · Hearts ' + lives + ' · ' + Math.ceil(left || 0) + 's'; }
    function launch(isBomb) {
      var f = isBomb ? null : ITEMS[Math.floor(Math.random() * ITEMS.length)], sp = isBomb ? bombSp : SP[f.n];
      var g = G.H * 1.7, x = rnd(G.W * 0.15, G.W * 0.85), peak = rnd(G.H * 0.12, G.H * 0.42), y = G.H + sp.r + 2;
      var vy = -Math.sqrt(2 * g * (y - peak)), T = -2 * vy / g, vx = (rnd(G.W * 0.25, G.W * 0.75) - x) / T;
      fruit.push({ f: f, bomb: isBomb, sp: sp, wave: wave, x: x, y: y, vx: vx, vy: vy, g: g, rot: 0, vr: isBomb ? rnd(-1.5, 1.5) : rnd(-4, 4), cut: false, ph: Math.floor(Math.random() * 12) });
    }
    function cutAt(o, ang) {
      o.cut = true;
      if (o.bomb) { lives--; shake = 0.4; flash = 0.5; sfx('bomb'); pops.push({ x: o.x, y: o.y, s: 'Cracked an egg!', c: P.pink, t: 0 }); for (var e0 = 0; e0 < 14; e0++) drops.push({ x: o.x, y: o.y, vx: rnd(-70, 70) * m / 2, vy: rnd(-90, 0) * m / 2, c: [P.yellow, P.white, P.pink, P.cyan, P.lime][e0 % 5], t: 0 }); if (lives <= 0) end(); hud(); return; }
      sfx('slice'); score++; strokeN++; cheer = 0.4;
      var nx = -Math.sin(ang), ny = Math.cos(ang), sp = 30 * m;
      [0, 1].forEach(function (side) { var sg = side ? 1 : -1; bits.push({ img: o.sp.halves[side], sp: o.sp, x: o.x, y: o.y, vx: o.vx * 0.4 + nx * sp * sg, vy: o.vy * 0.3 + ny * sp * sg - 20, g: o.g, rot: ang - Math.PI / 2, vr: sg * 3 }); });
      for (var i = 0; i < 10; i++) drops.push({ x: o.x, y: o.y, vx: rnd(-60, 60) * m / 2, vy: rnd(-80, 10) * m / 2, c: o.f.in, t: 0 });
      splats.push({ x: o.x, y: o.y, r: o.sp.r + 2, c: o.f.in, t: 0 });
      if (!won && score >= GOAL) { won = true; sfx('win'); pops.push({ x: G.W / 2, y: G.H * 0.3, s: 'You win! Keep slicing', c: P.yellow, t: 0, big: true }); }
      hud();
    }
    function end() {
      over = true; var nb = best('slice', score);
      G.endPanel('slice', won, won ? 'Nice slicing! You won' : lives <= 0 ? 'Out of hearts' : 'Time!', ['Score: ' + score + (nb ? ' (your best!)' : ' · best ' + (bests().slice || score)), won ? '' : 'Slice ' + GOAL + ' in ' + TIME + ' seconds to win.'].filter(Boolean));
    }
    function segHits(a, b) {
      fruit.forEach(function (o) {
        if (o.cut) return;
        var dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy, t0 = L2 ? clamp(((o.x - a.x) * dx + (o.y - a.y) * dy) / L2, 0, 1) : 0;
        var px0 = a.x + dx * t0 - o.x, py0 = a.y + dy * t0 - o.y, rr = o.sp.r + 2 * m;
        if (px0 * px0 + py0 * py0 <= rr * rr) cutAt(o, Math.atan2(dy, dx));
      });
    }
    function pDown(e) { if (over || G.pan) return; e.preventDefault(); try { G.cv.setPointerCapture(e.pointerId); } catch (x) {} down = true; lastPt = G.pt(e); trail = [{ x: lastPt.x, y: lastPt.y, t: G.t }]; strokeN = 0; strokeT = G.t; }
    function pMove(e) {
      if (!down || over) return; e.preventDefault();
      var p = G.pt(e); trail.push({ x: p.x, y: p.y, t: G.t }); if (trail.length > 14) trail.shift();
      var d = Math.hypot(p.x - lastPt.x, p.y - lastPt.y); if (d > 6 * m && Math.random() < 0.3) sfx('swoosh');
      segHits(lastPt, p); lastPt = p;
    }
    function pUp() {
      if (strokeN >= 3) {
        var bonus = strokeN - 2, sec = Math.min(EXTRA_MAX - extra, bonus * 2); score += bonus; extra += sec; left += sec;
        pops.push({ x: lastPt ? lastPt.x : G.W / 2, y: lastPt ? lastPt.y - 10 : G.H / 2, s: 'Combo +' + bonus + (sec ? '  +' + sec + 's' : ''), c: P.yellow, t: 0 }); sfx('great'); hud();
      }
      down = false; strokeN = 0;
    }
    G.cv.addEventListener('pointerdown', pDown); G.cv.addEventListener('pointermove', pMove); G.cv.addEventListener('pointerup', pUp); G.cv.addEventListener('pointercancel', pUp);
    G.update = function (dt) {
      if (G.pan) return;
      if (!over) {
        var lt = Math.ceil(left); left -= dt; if (Math.ceil(left) !== lt) { hud(); if (left <= 5 && left > 0) sfx('tick'); }
        if (left <= 0) { left = 0; hud(); end(); }
        var frenzy = left < 10;
        spawnT -= dt;
        if (!over && spawnT <= 0) { // fast from the start; the last 10 seconds are a frenzy
          wave++; var n = (G.t < 8 ? 1 : 2) + Math.floor(Math.random() * (frenzy ? 5 : Math.min(4, 1 + G.t / 8))), bombs = G.t > 4 && Math.random() < (frenzy ? 0.6 : 0.4) ? 1 + (frenzy && Math.random() < 0.4 ? 1 : 0) : 0;
          for (var i = 0; i < n; i++) setTimeout(function () { if (!over && G.alive) launch(false); }, i * (frenzy ? 70 : 110));
          for (var bI = 0; bI < bombs; bI++) setTimeout(function () { if (!over && G.alive) launch(true); }, n * 110 + bI * 90);
          spawnT = frenzy ? rnd(0.45, 0.7) : Math.max(0.7, 1.3 - G.t / 40) + rnd(0, 0.3);
          if (frenzy && !G.frz) { G.frz = 1; pops.push({ x: G.W / 2, y: G.H * 0.35, s: 'FRENZY!', c: P.orange, t: 0, big: true }); sfx('great'); }
        }
      }
      fruit.forEach(function (o) { o.vy += o.g * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.rot += o.vr * dt; });
      fruit = fruit.filter(function (o) {
        if (o.cut) return false;
        if (o.vy > 0 && o.y > G.H + o.sp.r + 4) { if (!o.bomb && !over && !lostW[o.wave]) { lostW[o.wave] = 1; lives--; sfx('miss'); pops.push({ x: clamp(o.x, 12, G.W - 12), y: G.H - 16, s: 'Missed', c: P.pink, t: 0 }); hud(); if (lives <= 0) end(); } return false; }
        return true;
      });
      bits.forEach(function (b) { b.vy += b.g * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.rot += b.vr * dt; });
      bits = bits.filter(function (b) { return b.y < G.H + 40; });
      drops.forEach(function (d) { d.vy += G.H * dt * 1.5; d.x += d.vx * dt; d.y += d.vy * dt; d.t += dt; });
      drops = drops.filter(function (d) { return d.t < 0.8; });
      splats.forEach(function (s) { s.t += dt; }); splats = splats.filter(function (s) { return s.t < 1.6; });
      pops.forEach(function (p) { p.t += dt; }); pops = pops.filter(function (p) { return p.t < (p.big ? 1.8 : 0.9); });
      trail = trail.filter(function (t) { return G.t - t.t < 0.14; });
      shake = Math.max(0, shake - dt); flash = Math.max(0, flash - dt * 2); cheer = Math.max(0, cheer - dt);
    };
    G.draw = function (c) {
      var W = G.W, H = G.H;
      c.save(); if (shake) c.translate(Math.round(rnd(-2, 2) * m), Math.round(rnd(-2, 2) * m));
      // the beach: sky, sea with moving foam, then sand
      var sea = Math.round(H * 0.42), sand = Math.round(H * 0.62);
      R(c, -4, -4, W + 8, sea + 4, P.sky); R(c, -4, Math.round(sea * 0.55), W + 8, sea, P.cyan);
      disc(c, Math.round(W * 0.8), Math.round(sea * 0.3), 6, P.yellow);
      R(c, -4, sea, W + 8, sand - sea, P.blue); for (var wy = sea + 3; wy < sand; wy += 5) for (var wx = ((wy * 3 + Math.floor(G.t * 12)) % 9) - 9; wx < W; wx += 9) R(c, wx, wy, 4, 1, P.sky);
      for (var fx = 0; fx < W; fx += 2) R(c, fx, sand - 2 + Math.round(Math.sin(fx * 0.15 + G.t * 2) * 1.5), 2, 3, P.white);
      R(c, -4, sand + 1, W + 8, H - sand + 4, P.sand); for (var dy = sand + 4; dy < H; dy += 4) for (var dx = (dy * 7) % 11; dx < W; dx += 11) R(c, dx, dy, 1, 1, P.orange);
      splats.forEach(function (s) { c.globalAlpha = Math.max(0, 0.7 - s.t / 2.3); disc(c, s.x, s.y, s.r, s.c); c.globalAlpha = 1; });
      // Aiu cheering in the corner
      if (me) { var fr = cheer ? me.cr.frames.happy : me.cr.frames.open, k = Math.max(1, m), hop = cheer ? -2 * m : 0; c.drawImage(fr, 4, H - fr.height * k - 2 + hop, fr.width * k, fr.height * k); }
      fruit.forEach(function (o) { var img = o.bomb ? o.sp.frames[(Math.floor(G.t * 8) + o.ph) % 12] : o.sp.whole; c.save(); c.translate(Math.round(o.x), Math.round(o.y)); c.rotate(o.rot); c.drawImage(img, -o.sp.cx, -o.sp.cy); c.restore(); });
      bits.forEach(function (b) { c.save(); c.translate(Math.round(b.x), Math.round(b.y)); c.rotate(b.rot); c.drawImage(b.img, -b.sp.cx, -b.sp.cy); c.restore(); });
      drops.forEach(function (d) { R(c, d.x, d.y, m, m, d.c); });
      // the blade trail
      for (var i = 1; i < trail.length; i++) { var a0 = trail[i - 1], b0 = trail[i], w = Math.max(1, Math.round(i / trail.length * 3 * m)); c.strokeStyle = P.white; c.lineWidth = w; c.lineCap = 'round'; c.beginPath(); c.moveTo(a0.x, a0.y); c.lineTo(b0.x, b0.y); c.stroke(); }
      for (var l = 0; l < 3; l++) heart(c, W - 10 - l * 9, 4, l < lives ? P.red : P.dark);
      txt(c, String(score), 6, 3, P.yellow, 10);
      if (!won) { R(c, 6, 15, 40, 3, P.ink); R(c, 6, 15, Math.round(40 * Math.min(1, score / GOAL)), 3, P.lime); }
      pops.forEach(function (p) { txt(c, p.s, p.x, p.y - p.t * 14, p.c, p.big ? 10 : 8, 'center'); });
      txt(c, Math.ceil(left) + 's', W / 2, 3, left < 10 ? P.orange : P.white, 10, 'center');
      if (G.t < 1.8 && !over) txt(c, 'Swipe to slice!', W / 2, H * 0.45, P.white, 10, 'center');
      if (flash) { c.globalAlpha = flash * 0.6; R(c, 0, 0, W, H, P.red); c.globalAlpha = 1; }
      c.restore();
    };
    G.key = function () { return false; };
    G.dbgLaunch = function (bomb) { launch(!!bomb); }; GM._cur = G;
    G.buttons([]); G.ctl.hidden = true;
    G.start(); G.restart();
  }

  /* =====================================================================
     WILDS: a turn-based battle with a wild pixel creature
     ===================================================================== */
  var ELEM = { flame: 'fire', dragon: 'fire', aqua: 'water', ghost: 'water', plant: 'leaf', bug: 'leaf', beast: 'leaf', robot: 'steel', golem: 'steel', classic: 'none' };
  var BEATS = { fire: 'leaf', leaf: 'water', water: 'fire' };
  function adv(a, b) { if (BEATS[a] === b) return 1.5; if (BEATS[b] === a) return 0.7; if (b === 'steel') return 0.85; return 1; }
  var SYL = ['ka', 'zu', 'mo', 'ri', 'pi', 'to', 'ba', 'gu', 'ne', 'lo', 'fi', 'ru', 'shi', 'po', 'da', 'mi', 'wo', 'ki'];
  function wildName() { var n = 2 + (Math.random() < 0.3 ? 1 : 0), s = ''; for (var i = 0; i < n; i++) s += SYL[Math.floor(Math.random() * SYL.length)]; return s.charAt(0).toUpperCase() + s.slice(1); }
  function wilds(opt) {
    var me = aiu(); if (!me) return;
    var cup = !!(opt && opt.cup), round = 1;
    var G = stage(cup ? 'Wilds Cup' : 'Wilds'), kinds = Object.keys(A.KINDS);
    var foe, you, state, st, msg, msgT, nums, mash, guard, snacks, sp, enemyTurn, pressAt, sparks;
    function newFoe(boss) {
      var kind = kinds[Math.floor(Math.random() * kinds.length)], fst = Math.max(1, me.stage + (boss ? 1 : Math.random() < 0.3 ? -1 : 0));
      var cr = A.creature((Math.random() * 1e9) | 0, fst, (Math.random() * 1e9) | 0, kind), mx = Math.round((11 + fst * 4) * (boss ? 1.25 : 1) * GM.D().foe);
      foe = { cr: cr, name: (boss ? 'Champ ' : 'Wild ') + wildName(), kind: kind, el: ELEM[kind] || 'none', hp: mx, max: mx, atk: Math.max(2, Math.round((3 + fst * 2 + (boss ? 1 : 0)) * GM.D().foe)), x: 0, flash: 0, off: 0 };
      guard = false; enemyTurn = 0; nums = []; sparks = [];
      say((cup ? 'Round ' + round + ': ' : '') + foe.name + (boss ? ' (the champ)' : '') + ' jumps out! (' + foe.el + ')'); menu(); hud();
    }
    G.restart = function () {
      round = 1;
      you = { cr: me.cr, name: me.name, el: ELEM[me.kind] || 'none', max: 15 + me.stage * 5, atk: 4 + me.stage * 2, x: 0, flash: 0, off: 0 }; you.hp = you.max;
      snacks = 2; sp = 2; G.score = 0; newFoe(false);
    };
    function hud() { G.hud.textContent = you.name + ' ' + you.hp + '/' + you.max + ' · ' + foe.name + ' ' + foe.hp + '/' + foe.max; }
    function say(s) { msg = s; msgT = 0; }
    function setState(s) { state = s; st = 0; }
    function menu() {
      setState('menu'); guard = false;
      G.buttons([['Attack', function () { if (state === 'menu') startAttack(); }, 'primary'],
        ['Special (' + sp + ')', function () { if (state === 'menu' && sp >= 2) startSpecial(); }],
        ['Guard', function () { if (state === 'menu') { guard = true; sp = Math.min(4, sp + 1); say(you.name + ' guards. +1 special.'); sfx('block'); foeTurn(); } }],
        ['Snack (' + snacks + ')', function () { if (state === 'menu' && snacks > 0) { snacks--; var hl = Math.round(you.max * 0.4); you.hp = Math.min(you.max, you.hp + hl); num(you, '+' + hl, P.lime); say(you.name + ' eats a berry.'); sfx('great'); hud(); foeTurn(); } }]]);
      var b = G.ctl.querySelectorAll('button'); if (sp < 2) b[1].disabled = true; if (!snacks) b[3].disabled = true;
    }
    function nowBtn(label) { G.buttons([[label || 'Now!', press, 'primary big']]); }
    function startAttack() { setState('aim'); pressAt = null; say('Tap when the ring hits the target!'); nowBtn(); }
    function startSpecial() { sp -= 2; setState('mash'); mash = 0; say('Tap, tap, tap! Power up!'); nowBtn('Tap!'); }
    function press() {
      if (state === 'aim' && pressAt === null) { pressAt = st; resolveAttack(); }
      else if (state === 'mash') { mash++; sfx('tick'); }
      else if (state === 'foeWind' || state === 'foeHit') { if (pressAt === null) pressAt = state === 'foeHit' ? st + 1000 : -1; }
    }
    function dmg(atk, mult, a, b) { return Math.max(1, Math.round(atk * mult * adv(a, b) + rnd(0, 2))); }
    function resolveAttack() {
      var off = Math.abs(pressAt - 0.65), mult, word;
      if (off < 0.07) { mult = 1.6; word = 'Great!'; sp = Math.min(4, sp + 1); sfx('great'); } else if (off < 0.15) { mult = 1.1; word = 'Good'; } else { mult = 0.6; word = 'Miss...'; }
      var d = dmg(you.atk, mult, you.el, foe.el); hitAnim(you, foe, d, word);
    }
    function hitAnim(atk, def, d, word) {
      setState('lunge'); G.buttons([]);
      atk.lungeT = 0; atk.pending = function () { def.hp = Math.max(0, def.hp - d); def.flash = 0.3; num(def, '-' + d, P.white); if (word) num(def, word, P.yellow, -10); sfx('hit'); for (var i = 0; i < 8; i++) sparks.push({ x: def.x, y: def.y, vx: rnd(-40, 40), vy: rnd(-60, -10), t: 0 }); hud(); };
      atk.after = function () { if (def === foe && foe.hp <= 0) return winNow(); if (def === you && you.hp <= 0) return loseNow(); if (def === foe) foeTurn(); else { sp = Math.min(4, sp + 1); menu(); } };
      G.lunger = atk;
    }
    function foeTurn() {
      enemyTurn++; var big = enemyTurn % 3 === 0;
      setState('foeWind'); pressAt = null; foe.big = big; foe.hitAt = rnd(0.35, 1.0) + (big ? 0.3 : 0);
      say(big ? foe.name + ' is charging up a big one...' : foe.name + ' gets ready...'); nowBtn('Block!');
    }
    function resolveFoe() {
      var mult = foe.big ? 1.6 : 1, word = '';
      if (pressAt !== null && pressAt >= 0 && pressAt < 0.11) { word = 'Perfect block!'; mult = 0; }
      else if (pressAt !== null && pressAt >= 0 && pressAt < 0.24) { word = 'Blocked'; mult *= 0.5; }
      else if (pressAt === -1) word = 'Too soon!';
      if (guard) mult *= 0.5;
      if (mult === 0) { num(you, word, P.cyan, -10); sfx('block'); var c0 = 2 + Math.floor(me.stage / 2); foe.hp = Math.max(0, foe.hp - c0); foe.flash = 0.3; num(foe, 'Counter -' + c0, P.yellow); hud(); if (foe.hp <= 0) return setTimeout(winNow, 400); setTimeout(function () { sp = Math.min(4, sp + 1); menu(); }, 650); setState('wait'); return; }
      var d = dmg(foe.atk, mult, foe.el, you.el); if (mult < 1 && word) sfx('block');
      hitAnimFoe(d, word);
    }
    function hitAnimFoe(d, word) { G.buttons([]); var w = word; hitAnim(foe, you, d, w); }
    function winNow() {
      setState('over'); G.buttons([]); G.score = you.hp; say(foe.name + ' runs back into the bushes!');
      setTimeout(function () {
        if (!G.alive) return;
        if (cup && round < 3) {
          sfx('great');
          G.panel('Round ' + round + ' won!', [foe.name + ' ran off.', you.name + ' rests and gets back half its health, plus a berry.', 'Next: ' + (round === 2 ? 'the champ.' : 'round ' + (round + 1) + ' of 3.')],
            [['Next battle', function () { G.unpanel(); round++; you.hp = Math.min(you.max, you.hp + Math.round(you.max / 2)); snacks++; sp = Math.max(sp, 2); newFoe(round === 3); }, 'primary'], ['Games', function () { G.close(); GM.hub(); }]]);
          return;
        }
        G.endPanel(cup ? 'cup' : 'wilds', true, cup ? 'You won the Cup!' : 'You won!', cup ? ['Three wins in a row, champ beaten.', you.name + ' has ' + you.hp + ' of ' + you.max + ' left.'] : [foe.name + ' ran off.', you.name + ' has ' + you.hp + ' of ' + you.max + ' left.']);
      }, 700);
    }
    function loseNow() { setState('over'); G.buttons([]); say(you.name + ' needs a rest.'); setTimeout(function () { if (G.alive) G.endPanel(cup ? 'cup' : 'wilds', false, 'Time for a rest', [you.name + ' is tired out' + (cup ? ' in round ' + round + ' of 3' : '') + '. ' + foe.name + ' had ' + foe.hp + ' left.', 'Tip: tap Block right when the "!" shows.']); }, 700); }
    function num(who, s, col, dy) { nums.push({ x: who.x, y: who.y - (who.hgt || 20) + (dy || 0), s: s, c: col, t: 0 }); }
    G.cv.addEventListener('pointerdown', function (e) { if (G.pan) return; e.preventDefault(); press(); });
    G.key = function (k, down) { if (down && (k === ' ' || k === 'Enter')) { if (state !== 'menu') { press(); return true; } } return false; };
    G.update = function (dt) {
      if (G.pan) return;
      st += dt; msgT += dt;
      if (state === 'aim' && st > 0.82 && pressAt === null) { pressAt = 9; resolveAttack(); }
      if (state === 'mash' && st > 1.2) { var mult = 1 + Math.min(mash, 12) * 0.15; num(foe, 'Power x' + mult.toFixed(1), P.yellow, -10); hitAnim(you, foe, dmg(you.atk, mult, you.el, foe.el), adv(you.el, foe.el) > 1 ? 'Super!' : ''); }
      if (state === 'foeWind') {
        foe.off = Math.round(Math.sin(st * 30) * (foe.big ? 2 : 1));
        if (st >= foe.hitAt) { foe.off = 0; setState('foeHit'); if (pressAt === -1) {} else pressAt = null; }
      }
      if (state === 'foeHit') { if (pressAt === 1000 + st) {} if (pressAt !== null && pressAt >= 1000) pressAt = pressAt - 1000; if (st > 0.26) { setState('resolving'); resolveFoe(); } }
      if (state === 'lunge' && G.lunger) {
        var L = G.lunger; L.lungeT += dt;
        var dir = L === you ? 1 : -1, dist = Math.abs(foe.baseX - you.baseX) * 0.55;
        L.off = dir * dist * (L.lungeT < 0.13 ? L.lungeT / 0.13 : L.lungeT < 0.24 ? 1 : Math.max(0, 1 - (L.lungeT - 0.24) / 0.2));
        if (L.pending && L.lungeT >= 0.13) { L.pending(); L.pending = null; }
        if (L.lungeT > 0.5) { L.off = 0; var af = L.after; G.lunger = null; L.after = null; setState('wait'); setTimeout(function () { if (G.alive && state === 'wait') af(); }, 120); }
      }
      you.flash = Math.max(0, you.flash - dt); foe.flash = Math.max(0, foe.flash - dt);
      nums.forEach(function (n) { n.t += dt; }); nums = nums.filter(function (n) { return n.t < 1; });
      sparks.forEach(function (s) { s.t += dt; s.vy += 150 * dt; s.x += s.vx * dt; s.y += s.vy * dt; }); sparks = sparks.filter(function (s) { return s.t < 0.5; });
    };
    var tints = {};
    function sprite(who, frame) { var f = who.cr.frames[frame] || who.cr.frames.open; if (!who.flash) return f; var k = who.name + frame; return tints[k] || (tints[k] = tint(f, P.white)); }
    G.draw = function (c) {
      var W = G.W, H = G.H, gy = Math.round(H * 0.7), m = G.m;
      // PS1-style arena: banded sky, far hills, a grassy field and two round stands
      var bands = [P.navy, P.blue, P.sky, P.cyan]; for (var i = 0; i < 4; i++) R(c, 0, Math.round(i * gy * 0.18), W, Math.ceil(gy * 0.18) + 1, bands[i]);
      R(c, 0, Math.round(gy * 0.72), W, gy, P.cyan);
      for (var x = 0; x < W; x += 2) { var hy = Math.round(gy * 0.62 + Math.sin(x * 0.05) * 6 + Math.sin(x * 0.13) * 3); R(c, x, hy, 2, gy - hy, P.teal); }
      R(c, 0, Math.round(gy * 0.82), W, H, P.green);
      for (var y = Math.round(gy * 0.82); y < H; y += 3) for (var xx = (y % 2) * 3; xx < W; xx += 7) R(c, xx, y, 1, 1, P.lime);
      var yb = bbox(you.cr.frames.open), fb = bbox(foe.cr.frames.open);
      var k = Math.max(2, Math.floor(Math.min(W * 0.34 / Math.max(yb.w, fb.w), H * 0.3 / Math.max(yb.h, fb.h))));
      you.baseX = Math.round(W * 0.27); foe.baseX = Math.round(W * 0.73);
      [you, foe].forEach(function (who) {
        var fx = who.baseX + Math.round(who.off || 0), fr = state === 'over' && who.hp <= 0 ? 'sleep' : who.flash ? 'blink' : (state === 'over' && who.hp > 0 ? 'happy' : 'open');
        var bb = bbox(who.cr.frames.open), bcx = bb.x + bb.w / 2;
        ell(c, who.baseX, gy + 2, Math.round(bb.w * k * 0.7), Math.max(2, Math.round(3 * k / 2)), P.lime); ell(c, who.baseX, gy + 2, Math.round(bb.w * k * 0.55), Math.max(1, Math.round(2 * k / 2)), P.green);
        var img = sprite(who, fr), dw = img.width * k, dh = img.height * k, dy = gy - (who.cr.bottom + 1) * k + (who.cr.float ? -3 * k + Math.round(Math.sin(G.t * 4) * k) : 0);
        c.save(); c.translate(fx, 0); if (who === foe) c.scale(-1, 1); c.drawImage(img, -Math.round(bcx * k), dy, dw, dh); c.restore();
        who.x = fx; who.y = gy; who.hgt = bb.h * k;
      });
      // HP and special bars
      function bar(x, y, w, v, max, col, label) { txt(c, label, x, y, P.white, 8); R(c, x, y + 10, w, 5, P.ink); R(c, x + 1, y + 11, Math.round((w - 2) * v / max), 3, col); }
      var bw = Math.min(70, Math.round(W * 0.4));
      bar(4, 3, bw, you.hp, you.max, you.hp / you.max < 0.3 ? P.red : P.lime, you.name + ' ' + you.hp);
      bar(W - bw - 4, 3, bw, foe.hp, foe.max, foe.hp / foe.max < 0.3 ? P.red : P.orange, foe.name.replace('Wild ', '') + ' ' + foe.hp);
      for (var s2 = 0; s2 < 4; s2++) R(c, 4 + s2 * 6, 19, 4, 3, s2 < sp ? P.yellow : P.dark);
      // action commands
      var tr = Math.max(6, Math.round(fb.w * k * 0.45)), tcx = foe.x, tcy = gy - Math.round(foe.hgt / 2);
      if (state === 'aim') { var rr = Math.round(tr + (tr * 2.2) * Math.max(0, 1 - st / 0.65)); ring(c, tcx, tcy, tr, P.yellow); ring(c, tcx, tcy, tr + 1, P.yellow); ring(c, tcx, tcy, rr, st > 0.65 ? P.red : P.white); }
      if (state === 'mash') { var mw = Math.round(W * 0.5); R(c, W / 2 - mw / 2, gy + 10, mw, 6, P.ink); R(c, W / 2 - mw / 2 + 1, gy + 11, Math.round((mw - 2) * Math.min(1, mash / 12)), 4, mash >= 12 ? P.yellow : P.orange); R(c, W / 2 - mw / 2 + 1, gy + 11 + 4, Math.round((mw - 2) * (1 - st / 1.2)), 1, P.white); }
      if (state === 'foeHit' || (state === 'resolving')) { txt(c, '!', foe.x, gy - foe.hgt - 16, P.red, 14, 'center'); }
      sparks.forEach(function (s) { R(c, s.x, s.y - 10, m, m, s.t < 0.2 ? P.white : P.yellow); });
      nums.forEach(function (n) { txt(c, n.s, n.x, n.y - n.t * 16, n.c, 8, 'center'); });
      // message box
      var my = H - 16; R(c, 2, my - 2, W - 4, 15, P.ink); R(c, 3, my - 1, W - 6, 13, P.navy); txt(c, msg || '', 6, my + 1, P.white, 8);
    };
    G.start(); G.restart();
  }

  /* =====================================================================
     SPAR: box with your Aiu (jab, block, counter)
     ===================================================================== */
  function spar() {
    var me = aiu(); if (!me) return;
    var G = stage('Spar');
    var aHP, yHP, AMAX = Math.round((18 + me.stage * 3) * GM.D().foe), YMAX = GM.diffId() === 'easy' ? 10 : 8, mode, mt, mdur, guardUp, block, glove, cool, counter, pops, shake, flash, time, ko, winT, tints = {};
    var tele = clamp(0.6 - me.stage * 0.05, 0.32, 0.6); // older Aiu = faster punches
    G.restart = function () { aHP = AMAX; yHP = YMAX; time = Math.round(45 * GM.D().t); ko = false; pops = []; shake = 0; flash = 0; block = false; glove = { l: 0, r: 0 }; cool = 0; counter = 0; G.score = 0; next('idle'); hud(); };
    function hud() { G.hud.textContent = me.name + ' ' + aHP + '/' + AMAX + ' · You ' + yHP + '/' + YMAX + ' · ' + Math.ceil(time) + 's'; }
    function next(m2) {
      mode = m2; mt = 0;
      if (m2 === 'idle') { guardUp = true; mdur = rnd(0.3, 0.8); }
      else if (m2 === 'open') { guardUp = false; mdur = rnd(0.5, 0.85); }
      else if (m2 === 'wind') { guardUp = true; mdur = tele + rnd(0, 0.25); }
      else if (m2 === 'punch') { mdur = 0.16; }
      else if (m2 === 'stun') { guardUp = false; mdur = 0.75; }
      else if (m2 === 'flinch') { mdur = 0.22; }
    }
    function pop(s, col) { pops.push({ s: s, c: col, t: 0, x: G.W / 2 + rnd(-20, 20) }); }
    function jab(side) {
      if (ko || G.pan || cool > 0 || block) return;
      cool = 0.2; glove[side] = 0.16; sfx('swoosh');
      if (mode === 'stun') { aHP -= 2; G.score += 2; pop('Counter! -2', P.yellow); sfx('great'); shake = 0.15; }
      else if (mode === 'open') { aHP -= 1; G.score += 1; pop('-1', P.white); sfx('hit'); next('flinch'); }
      else if (mode === 'flinch') { pop('Blocked', P.silver); sfx('block'); }
      else { pop('Blocked', P.silver); sfx('block'); }
      aHP = Math.max(0, aHP); hud();
      if (aHP <= 0) finish(true);
    }
    function finish(won) {
      if (ko) return; ko = true; winT = 0; sfx(won ? 'bell' : 'lose');
      setTimeout(function () { if (!G.alive) return; best('spar', G.score); G.endPanel('spar', won, won ? 'K.O.! Good match' : (time <= 0 ? 'Time! ' + me.name + ' wins on points' : 'You got tagged out'), won ? [me.name + ' says that was fun.', 'Hits landed: ' + G.score + '.'] : ['Tip: hold Block when ' + me.name + ' winds up (it flashes), then jab fast while it\'s dizzy.']); }, 900);
    }
    G.dbg = function () { return { mode: mode, mt: mt }; }; GM._cur = G;
    G.buttons([['Left jab', function () { jab('l'); }, 'primary'], ['Block', null, 'hold', function (on) { block = on; }], ['Right jab', function () { jab('r'); }, 'primary']]);
    G.cv.addEventListener('pointerdown', function (e) { if (G.pan) return; e.preventDefault(); var p = G.pt(e); jab(p.x < G.W / 2 ? 'l' : 'r'); });
    G.key = function (k, down) {
      if (k === 'ArrowDown' || k === 's' || k === 'S' || k === ' ') { block = down; return true; }
      if (!down) return false;
      if (k === 'ArrowLeft' || k === 'a' || k === 'A') { jab('l'); return true; }
      if (k === 'ArrowRight' || k === 'd' || k === 'D') { jab('r'); return true; }
      return false;
    };
    G.update = function (dt) {
      if (G.pan) return;
      cool = Math.max(0, cool - dt); glove.l = Math.max(0, glove.l - dt); glove.r = Math.max(0, glove.r - dt);
      shake = Math.max(0, shake - dt); flash = Math.max(0, flash - dt * 2);
      pops.forEach(function (p) { p.t += dt; }); pops = pops.filter(function (p) { return p.t < 0.8; });
      if (ko) { winT += dt; return; }
      time -= dt; if (time <= 0) { time = 0; hud(); finish(aHP / AMAX < yHP / YMAX); return; }
      if (Math.floor(time) !== Math.floor(time + dt)) hud();
      mt += dt;
      if (mt < mdur) return;
      if (mode === 'idle') next(Math.random() < 0.38 ? 'open' : 'wind');
      else if (mode === 'open' || mode === 'flinch' || mode === 'stun') next('idle');
      else if (mode === 'wind') next('punch');
      else if (mode === 'punch') {
        if (block) { pop('Blocked! Counter now!', P.cyan); sfx('block'); next('stun'); }
        else { yHP -= 2; flash = 0.6; shake = 0.3; pop('Ouch -2', P.red); sfx('hit'); hud(); if (yHP <= 0) { yHP = 0; hud(); finish(false); } else next('idle'); }
      }
    };
    function glovePix(c, x, y, s, col, flip) {
      // a boxing glove: cuff, fist and thumb
      R(c, x - 6 * s, y - 1 * s, 12 * s, 10 * s, P.ink);
      R(c, x - 5 * s, y, 10 * s, 8 * s, col); R(c, x - 4 * s, y + 1 * s, 3 * s, 2 * s, P.pink);
      R(c, x + (flip ? -7 : 4) * s, y + 2 * s, 3 * s, 4 * s, P.ink); R(c, x + (flip ? -6 : 4) * s, y + 3 * s, 2 * s, 2 * s, col);
      R(c, x - 5 * s, y + 8 * s, 10 * s, 4 * s, P.ink); R(c, x - 4 * s, y + 8 * s, 8 * s, 3 * s, P.white);
    }
    G.draw = function (c) {
      var W = G.W, H = G.H, m = G.m;
      c.save(); if (shake) c.translate(Math.round(rnd(-2, 2) * m), Math.round(rnd(-2, 2) * m));
      // the ring: crowd dots, posts, ropes and canvas
      R(c, -4, -4, W + 8, H + 8, P.navy);
      for (var i = 0; i < 70; i++) { var cx0 = (i * 37) % W, cy0 = (i * 13) % Math.round(H * 0.35); R(c, cx0, cy0, 2, 2, [P.plum, P.dark, P.slate][i % 3]); }
      var floorY = Math.round(H * 0.62);
      R(c, 0, floorY, W, H - floorY, P.blue); for (var y = floorY; y < H; y += 4) R(c, 0, y, W, 1, P.navy);
      [0.38, 0.46, 0.54].forEach(function (f, j) { R(c, 0, Math.round(H * f), W, Math.max(1, m), j === 1 ? P.white : P.red); });
      R(c, 2, Math.round(H * 0.3), 3 * m, floorY - Math.round(H * 0.3), P.silver); R(c, W - 2 - 3 * m, Math.round(H * 0.3), 3 * m, floorY - Math.round(H * 0.3), P.silver);
      // Aiu, big, in the middle
      var cr = me.cr, bb = bbox(cr.frames.open), k = Math.max(2, Math.floor(Math.min(W * 0.5 / bb.w, H * 0.42 / bb.h)));
      var fr = ko ? (aHP <= 0 ? 'sleep' : 'happy') : mode === 'flinch' || mode === 'stun' ? 'blink' : mode === 'wind' ? 'open' : 'open';
      var img = cr.frames[fr] || cr.frames.open;
      if (mode === 'wind' && !ko && Math.floor(mt * 10) % 2 === 0) img = tints['y' + fr] || (tints['y' + fr] = tint(img, P.yellow));
      var bob = Math.round(Math.sin(G.t * 6) * m), lean = mode === 'wind' ? -3 * m : mode === 'punch' ? 6 * m : mode === 'stun' ? Math.round(Math.sin(G.t * 20) * 2 * m) : 0;
      var dw = img.width * k, dh = img.height * k, ay = floorY - (cr.bottom + 1) * k + bob + (mode === 'punch' ? 2 * m : 0), bcx = (bb.x + bb.w / 2) * k, btop = ay + bb.y * k, bh = bb.h * k, bw2 = bb.w * k;
      if (ko && aHP <= 0) ay += Math.min(winT * 40, 6 * m);
      var sc0 = mode === 'punch' ? 1.12 : 1; // a punch comes toward you
      c.save(); c.translate(W / 2, ay + dh); c.scale(sc0, sc0); c.drawImage(img, -bcx + (mode === 'stun' ? lean : 0), -dh, dw, dh); c.restore();
      // Aiu's own gloves: up = guarding, low = open
      var gs = Math.max(1, Math.round(k / 3)), gyA = guardUp ? btop + Math.round(bh * 0.3) : btop + Math.round(bh * 0.7), gx = Math.round(bw2 * 0.55);
      if (mode === 'punch') { glovePix(c, W / 2 + gx * 0.2, btop + bh * 0.35, gs + 1, P.blue); }
      else if (!(ko && aHP <= 0)) { glovePix(c, W / 2 - gx, gyA - (mode === 'wind' ? 4 * m : 0), gs, P.blue, true); glovePix(c, W / 2 + gx, gyA, gs, P.blue); }
      if (ko && aHP <= 0) for (var s = 0; s < 5; s++) { var a0 = G.t * 3 + s * 1.25; R(c, W / 2 + Math.cos(a0) * bw2 * 0.5, btop - 4 * m + Math.sin(a0) * 3 * m, 2 * m, 2 * m, P.yellow); }
      // your gloves
      var ys = Math.max(2, m + 1), by0 = H - 14 * ys;
      var lx = W * 0.28, rx = W * 0.72, ly = by0, ry = by0;
      if (block) { lx = W * 0.42; rx = W * 0.58; ly = ry = by0 - 10 * ys; }
      if (glove.l) { lx = W * 0.44; ly = by0 - 28 * ys * (glove.l / 0.2); }
      if (glove.r) { rx = W * 0.56; ry = by0 - 28 * ys * (glove.r / 0.2); }
      glovePix(c, lx, ly, ys, P.red, false); glovePix(c, rx, ry, ys, P.red, true);
      // bars
      var bw = Math.round(W * 0.42);
      txt(c, me.name, 4, 3, P.white, 8); R(c, 4, 13, bw, 5, P.ink); R(c, 5, 14, Math.round((bw - 2) * aHP / AMAX), 3, P.orange);
      for (var hh = 0; hh < YMAX / 2; hh++) heart(c, W - 10 - hh * 9, 4, hh < Math.ceil(yHP / 2) ? P.red : P.dark);
      txt(c, Math.ceil(time) + 's', W / 2, 3, P.white, 8, 'center');
      if (mode === 'wind' && !ko) txt(c, '!', W / 2, btop - 18, P.yellow, 14, 'center');
      if (mode === 'stun' && !ko) txt(c, 'Counter!', W / 2, btop - 14, P.cyan, 10, 'center');
      pops.forEach(function (p) { txt(c, p.s, p.x, H * 0.3 - p.t * 18, p.c, 8, 'center'); });
      if (G.t < 2.5 && !ko) txt(c, 'Jab: tap left / right. Hold Block.', W / 2, H * 0.22, P.white, 8, 'center');
      if (flash) { c.globalAlpha = flash * 0.5; R(c, 0, 0, W, H, P.red); c.globalAlpha = 1; }
      c.restore();
    };
    G.start(); G.restart();
  }

  /* =====================================================================
     DASH: a foot race. Tap left, right, left, right to run; Jump over the hurdles.
     ===================================================================== */
  function dash() {
    var me = aiu(); if (!me) return;
    var G = stage('Dash'), kinds = Object.keys(A.KINDS), LEN = 300, VMAX = 62;
    var racers, you, hurdles, lastFoot, cd, done, place, pops, finishOrder;
    G.restart = function () {
      you = { me: true, cr: me.cr, name: me.name, x: 0, v: 0, jump: 0, trip: 0, lane: 0 };
      racers = [you];
      for (var i = 1; i < 4; i++) { var kd = kinds[Math.floor(Math.random() * kinds.length)]; racers.push({ cr: A.creature((Math.random() * 1e9) | 0, Math.max(1, me.stage), (Math.random() * 1e9) | 0, kd), name: wildName(), x: 0, v: 0, jump: 0, trip: 0, lane: i, top: (rnd(29, 37) + me.stage) * (GM.diffId() === 'easy' ? 0.88 : GM.diffId() === 'hard' ? 1.1 : 1), skill: rnd(0.75, 0.95) }); }
      hurdles = racers.map(function () { var hs = [], x = rnd(50, 70); while (x < LEN - 25) { hs.push(x); x += rnd(55, 90); } return hs; });
      lastFoot = null; cd = 1.8; done = false; place = 0; pops = []; finishOrder = []; G.score = 0; hud();
    };
    function hud() { G.hud.textContent = cd > 0 ? 'Get ready...' : (place ? 'Finished ' + ord(place) : 'Place ' + ord(rank()) + ' · ' + Math.round(you.x / LEN * 100) + '%'); }
    function ord(n) { return n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'); }
    function rank() { return 1 + racers.filter(function (r) { return r !== you && (r.fin ? true : r.x > you.x); }).length; }
    function pop(s, c) { pops.push({ s: s, c: c, t: 0 }); }
    function foot(f) {
      if (cd > 0 || done || G.pan) return;
      if (you.trip > 0) return;
      if (f !== lastFoot) { you.v = Math.min(VMAX, you.v + 7.5); sfx('tick'); } else { you.v *= 0.6; pop('Left, right!', P.pink); sfx('miss'); }
      lastFoot = f;
    }
    function jump() { if (cd > 0 || done || G.pan || you.jump > 0) return; you.jump = 0.5; sfx('swoosh'); }
    G.dbg = function () { var nh = hurdles[0].filter(function (hx) { return hx > you.x; })[0]; return { gap: nh === undefined ? 999 : nh - you.x, v: you.v }; }; GM._cur = G;
    G.buttons([['Left', function () { foot('l'); }, 'primary'], ['Jump', function () { jump(); }, 'hold2'], ['Right', function () { foot('r'); }, 'primary']]);
    G.cv.addEventListener('pointerdown', function (e) { if (G.pan) return; e.preventDefault(); var p = G.pt(e); if (p.y < G.H * 0.35) jump(); else foot(p.x < G.W / 2 ? 'l' : 'r'); });
    G.key = function (k, down) {
      if (!down) return false;
      if (k === 'ArrowLeft' || k === 'a' || k === 'A') { foot('l'); return true; }
      if (k === 'ArrowRight' || k === 'd' || k === 'D') { foot('r'); return true; }
      if (k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W') { jump(); return true; }
      return false;
    };
    G.update = function (dt) {
      if (G.pan) return;
      pops.forEach(function (p) { p.t += dt; }); pops = pops.filter(function (p) { return p.t < 0.9; });
      if (cd > 0) { var c0 = Math.ceil(cd); cd -= dt; if (Math.ceil(cd) !== c0) sfx(cd <= 0 ? 'great' : 'tick'); hud(); return; }
      racers.forEach(function (r, i) {
        if (r.fin) return;
        if (!r.me) { // rivals: speed up to their top speed, hop hurdles (usually)
          if (r.trip <= 0) r.v += (r.top - r.v) * dt * 1.4;
          var nh = hurdles[i].filter(function (hx) { return hx > r.x; })[0];
          if (nh !== undefined && nh - r.x < r.v * 0.22 && r.jump <= 0 && !r.planned) { r.planned = true; if (Math.random() < r.skill) r.jump = 0.5; }
          if (nh === undefined || nh - r.x > 10) r.planned = false;
        } else if (r.trip <= 0) r.v *= Math.exp(-1.15 * dt);
        var px0 = r.x; r.x += r.v * dt; r.jump = Math.max(0, r.jump - dt); r.trip = Math.max(0, r.trip - dt);
        hurdles[i].forEach(function (hx) { if (px0 < hx && r.x >= hx && r.jump <= 0.05) { r.v *= 0.4; r.trip = 0.35; if (r.me) { pop('Trip! Jump the hurdles', P.orange); sfx('hit'); } } });
        if (r.x >= LEN) { r.x = LEN; r.fin = true; finishOrder.push(r); if (r.me) { place = finishOrder.length; finish(); } }
      });
      if (!done && Math.floor(G.t * 4) !== Math.floor((G.t - dt) * 4)) hud();
    };
    function finish() {
      done = true; hud(); G.score = 5 - place;
      setTimeout(function () { if (!G.alive) return; best('dash', 5 - place); G.endPanel('dash', place === 1, place === 1 ? 'First place!' : ord(place) + ' place', [place === 1 ? me.name + ' crossed the line first.' : 'Beat all three to win.', 'Tip: tap left and right in turn, and Jump just before a hurdle.']); }, 800);
    }
    G.draw = function (c) {
      var W = G.W, H = G.H, m = G.m, top = 24, laneH = Math.floor((H - top - 4) / 4), cam = Math.max(0, Math.min(LEN + 40 - W, you.x - W * 0.3));
      R(c, 0, 0, W, top, P.sky); R(c, 0, top - 6, W, 6, P.green);
      for (var tx = -((cam * 0.3) % 30); tx < W; tx += 30) { R(c, tx, top - 12, 10, 6, P.teal); R(c, tx + 3, top - 16, 4, 4, P.teal); } // trees far off
      racers.forEach(function (r, i) {
        var y0 = top + i * laneH, gy = y0 + laneH - 4;
        R(c, 0, y0, W, laneH, i % 2 ? P.orange : P.red); R(c, 0, y0, W, 1, P.white);
        for (var mx = -(cam % 40); mx < W; mx += 40) R(c, mx, gy + 1, 12, 1, P.sand);
        var fx = LEN - cam; if (fx > -8 && fx < W + 8) for (var cy = y0; cy < y0 + laneH; cy += 3) R(c, fx + ((cy / 3) % 2 ? 0 : 3), cy, 3, 3, P.white), R(c, fx + ((cy / 3) % 2 ? 3 : 0), cy, 3, 3, P.ink);
        hurdles[i].forEach(function (hx) { var x = hx - cam; if (x < -6 || x > W + 6) return; R(c, x - 1, gy - 9, 2, 10, P.white); R(c, x - 4, gy - 9, 8, 2, P.white); R(c, x - 3, gy - 9, 2, 2, P.red); R(c, x + 1, gy - 9, 2, 2, P.red); });
        var bb = bbox(r.cr.frames.open), k = Math.max(1, Math.floor((laneH - 8) / Math.max(bb.h, 8))), img = r.trip > 0 ? r.cr.frames.blink : r.fin ? r.cr.frames.happy : r.cr.frames.open;
        var hop = r.jump > 0 ? Math.round(Math.sin((1 - r.jump / 0.5) * Math.PI) * laneH * 0.45) : (r.v > 5 ? Math.round(Math.abs(Math.sin(G.t * 14 + i)) * 2) : 0);
        var x0 = Math.round(r.x - cam), dw = img.width * k, dh = img.height * k;
        c.drawImage(img, x0 - Math.round((bb.x + bb.w / 2) * k), gy - (bb.y + bb.h) * k - hop, dw, dh);
        if (r.me) txt(c, 'You', x0, y0 + 2, P.yellow, 8, 'center');
      });
      pops.forEach(function (p) { txt(c, p.s, W / 2, top + 4 - p.t * 10, p.c, 8, 'center'); });
      // progress strip
      R(c, 4, 4, W - 8, 4, P.ink); racers.forEach(function (r) { R(c, 4 + Math.round((W - 10) * r.x / LEN), 3, 2, 6, r.me ? P.yellow : P.white); });
      txt(c, ord(place || rank()), 4, 11, P.white, 8);
      if (cd > 0) txt(c, cd > 0.7 ? String(Math.ceil(cd - 0.7)) : 'Go!', W / 2, H * 0.42, P.yellow, 20, 'center');
      else if (G.t < 6 && !done && you.x < 40) txt(c, 'Tap Left, Right, Left, Right!', W / 2, H * 0.42, P.white, 8, 'center');
    };
    G.start(); G.restart();
  }

  /* =====================================================================
     FLING: tap tap tap to charge, swipe to throw Aiu. Through the valley forest, down the foothills, into the cave
     to the treasure. Throw it again whenever it slows down. Score: distance + coins + gems + trees knocked over.
     ===================================================================== */
  function fling() {
    var me = aiu(); if (!me) return;
    var G = stage('Fling'), XS = 1.4, END = Math.round(2380 * XS), CAVE = Math.round(1650 * XS), FOOT = Math.round(950 * XS), TIME = Math.round(45 * GM.D().t), GRAV = 260, RAD = 6;
    var gnd = new Float32Array(END + 60), ceil = new Float32Array(END + 60);
    var PTS = [[0, 80], [150, 80], [260, 190], [420, 240], [600, 252], [800, 236], [950, 272], [1100, 300], [1250, 334], [1400, 352], [1550, 382], [1650, 392], [1800, 420], [2000, 432], [2200, 440], [END + 60, 440]].map(function (q, n) { return n === 0 || n === 1 ? q : [Math.round(q[0] * (q[0] > END ? 1 : XS)), q[1] + (n > 1 ? Math.round(q[0] * 0.05) : 0)]; });
    (function () {
      for (var x = 0; x < gnd.length; x++) {
        var i = 0; while (i < PTS.length - 2 && PTS[i + 1][0] <= x) i++;
        var a = PTS[i], b = PTS[i + 1], t = (x - a[0]) / (b[0] - a[0]), e = (1 - Math.cos(t * Math.PI)) / 2;
        gnd[x] = a[1] + (b[1] - a[1]) * e + (x > 160 ? Math.sin(x * 0.045) * 4 + Math.sin(x * 0.11) * 2 : 0);
        ceil[x] = x < CAVE ? -1e9 : gnd[x] - 64 - Math.sin(x * 0.07) * 6 - (x < CAVE + 50 ? (CAVE + 50 - x) * 1.6 : 0);
      }
    })();
    function gy(x) { x = clamp(x, 0, gnd.length - 2); var i = Math.floor(x), f = x - i; return gnd[i] * (1 - f) + gnd[i + 1] * f; }
    function cy(x) { x = clamp(x, 0, ceil.length - 2); var i = Math.floor(x), f = x - i; return ceil[i] * (1 - f) + ceil[i + 1] * f; }
    var ai, trees, coins, parts, pops, charge, timeLeft, started, over, score, maxX, coinsN, gemsN, treesN, treasure, drag, shake, rest, contact, hint;
    G.restart = function () {
      ai = { x: 70, y: gy(70) - RAD, vx: 0, vy: 0, ang: 0, va: 0, limbs: [] };
      for (var l = 0; l < 4; l++) ai.limbs.push({ x: ai.x, y: ai.y, px: ai.x, py: ai.y, a: l * Math.PI / 2 + 0.6 });
      trees = []; var x = 290; while (x < CAVE - 90) { trees.push({ x: x, h: rnd(18, 30) * (x < FOOT ? 1 : 0.8), broke: 0, fall: 0, dir: 1 }); x += x < FOOT ? rnd(20, 36) : rnd(50, 85); }
      coins = []; for (var c0 = 180; c0 < CAVE; c0 += rnd(28, 48)) coins.push({ x: c0, y: gy(c0) - rnd(8, 70), gem: false, got: false });
      for (var g0 = CAVE + 70; g0 < END - 140; g0 += rnd(40, 70)) coins.push({ x: g0, y: gy(g0) - rnd(8, 40), gem: true, got: false });
      parts = []; pops = []; charge = 0; timeLeft = TIME; extraT = 0; started = false; over = false; score = 0; maxX = ai.x; coinsN = 0; gemsN = 0; treesN = 0; treasure = false; drag = null; shake = 0; rest = 0; contact = 0; hint = 'Tap tap tap to charge, then swipe to throw!';
      G.score = 0; hud();
    };
    function meters() { return Math.max(0, Math.round((maxX - 70) / 10)); }
    function calc() { score = meters() + coinsN * 10 + gemsN * 50 + treesN * 5 + (treasure ? 300 + Math.ceil(timeLeft) * 5 : 0); G.score = score; }
    function hud() { calc(); G.hud.textContent = 'Score ' + score + ' · ' + meters() + 'm · ' + Math.ceil(timeLeft) + 's'; }
    function pop(s, x, y, c) { pops.push({ s: s, x: x, y: y, c: c || P.yellow, t: 0 }); }
    var extraT = 0; function addTime(n, x, y) { n = Math.min(n, 45 - extraT); if (n <= 0) return; extraT += n; timeLeft += n; pop('+' + n + 's', x, y - 16, P.lime); } // 2.1.7: up to +45 seconds
    function speed() { return Math.hypot(ai.vx, ai.vy); }
    function ready() { return !over && (speed() < 45 || (contact > 0 && speed() < 70)); }
    function throwIt(vx, vy) {
      if (!ready()) return;
      if (!started) started = true;
      var len = Math.hypot(vx, vy) || 1, pw = clamp(len * 0.45, 70, 150) * (1 + charge * 1.25);
      ai.vx = vx / len * pw; ai.vy = vy / len * pw; ai.va = (vx >= 0 ? 1 : -1) * rnd(6, 14); ai.y -= 1;
      if (charge > 0.6) { pop('TURBO!', ai.x, ai.y - 14, P.orange); sfx('great'); } else sfx('swoosh');
      charge = 0; hint = ''; rest = 0;
    }
    G.cv.addEventListener('pointerdown', function (e) {
      if (G.pan || over) return; e.preventDefault(); try { G.cv.setPointerCapture(e.pointerId); } catch (x) {}
      var p = G.pt(e); drag = { x0: p.x, y0: p.y, t0: performance.now(), pts: [{ x: p.x, y: p.y, t: performance.now() }], x: p.x, y: p.y };
    });
    G.cv.addEventListener('pointermove', function (e) { if (!drag) return; e.preventDefault(); var p = G.pt(e); drag.x = p.x; drag.y = p.y; drag.pts.push({ x: p.x, y: p.y, t: performance.now() }); if (drag.pts.length > 8) drag.pts.shift(); });
    function up() {
      if (!drag) return; var d = drag; drag = null;
      var dist = Math.hypot(d.x - d.x0, d.y - d.y0), dt = (performance.now() - d.t0) / 1000;
      if (dist < 8 && dt < 0.3) { if (ready()) { charge = Math.min(1, charge + 0.12); sfx('tick'); if (!started) started = true; } return; } // a tap: charge up
      var a0 = d.pts[0], b0 = d.pts[d.pts.length - 1], sdt = Math.max(0.03, (b0.t - a0.t) / 1000);
      throwIt((b0.x - a0.x) / sdt, (b0.y - a0.y) / sdt);
    }
    G.cv.addEventListener('pointerup', up); G.cv.addEventListener('pointercancel', function () { drag = null; });
    G.key = function (k, down) { if (down && k === ' ') { if (ready()) { charge = Math.min(1, charge + 0.12); sfx('tick'); started = true; } return true; } if (down && (k === 'Enter' || k === 'ArrowRight')) { throwIt(1, -0.8); return true; } return false; };
    G.buttons([]);
    function burst(x, y, col, n, sp) { for (var i = 0; i < n; i++) parts.push({ x: x, y: y, vx: rnd(-sp, sp), vy: rnd(-sp * 1.4, sp * 0.3), c: col, t: 0, life: rnd(0.4, 0.9) }); }
    function end(why) {
      if (over) return; over = true; calc(); hud(); var nb = best('fling', score);
      G.endPanel('fling', treasure, treasure ? 'Treasure!' : why, ['Score: ' + score + (nb ? ' (your best!)' : ' · best ' + (bests().fling || score)), meters() + 'm · ' + coinsN + ' coins · ' + gemsN + ' gems · ' + treesN + ' trees', treasure ? 'Time bonus included.' : 'Reach the treasure in the cave to win.']);
    }
    G.update = function (dt) {
      if (G.pan) return;
      pops.forEach(function (p) { p.t += dt; }); pops = pops.filter(function (p) { return p.t < 0.9; });
      parts.forEach(function (q) { q.t += dt; q.vy += GRAV * dt; q.x += q.vx * dt; q.y += q.vy * dt; }); parts = parts.filter(function (q) { return q.t < q.life; });
      shake = Math.max(0, shake - dt); charge = Math.max(0, charge - dt * 0.25);
      trees.forEach(function (t) { if (t.broke && t.fall < 1.4) t.fall += dt * 3; });
      if (over) return;
      if (started) { var tl = Math.ceil(timeLeft); timeLeft -= dt; if (Math.ceil(timeLeft) !== tl) { hud(); if (timeLeft < 5.5 && timeLeft > 0) sfx('tick'); } if (timeLeft <= 0) { timeLeft = 0; return end('Time!'); } }
      // physics in small steps
      var steps = 3, h0 = dt / steps;
      for (var s0 = 0; s0 < steps; s0++) {
        ai.vy += GRAV * h0; ai.x += ai.vx * h0; ai.y += ai.vy * h0; ai.ang += ai.va * h0;
        if (ai.x < RAD) { ai.x = RAD; ai.vx = Math.abs(ai.vx) * 0.4; }
        if (ai.x > END - RAD) { ai.x = END - RAD; ai.vx = -Math.abs(ai.vx) * 0.3; }
        var g0 = gy(ai.x);
        if (ai.y + RAD > g0) { // ground: bounce along the slope
          var sl = (gy(ai.x + 2) - gy(ai.x - 2)) / 4, nl = Math.hypot(sl, 1), nx = sl / nl, ny = -1 / nl;
          var vn = ai.vx * nx + ai.vy * ny, imp = -vn;
          ai.y = g0 - RAD;
          if (vn < 0) { ai.vx -= (1.45) * vn * nx; ai.vy -= (1.45) * vn * ny; var tx = -ny, ty = nx, vt = ai.vx * tx + ai.vy * ty; ai.vx -= vt * 0.06 * tx; ai.vy -= vt * 0.06 * ty; ai.va = vt / RAD * 0.8; }
          if (imp > 140) { shake = Math.min(0.35, imp / 900); burst(ai.x, ai.y + RAD, ai.x > CAVE ? P.slate : P.bark, Math.min(14, Math.round(imp / 25)), 60); sfx('hit'); if (imp > 260) pop('BONK', ai.x, ai.y - 12, P.white); }
          contact = 0.15;
          ai.vx *= Math.pow(0.55, h0); // rolling friction
        }
        var c0 = cy(ai.x);
        if (ai.y - RAD < c0) { ai.y = c0 + RAD; if (ai.vy < 0) { ai.vy = -ai.vy * 0.4; burst(ai.x, ai.y - RAD, P.slate, 5, 40); sfx('block'); } }
      }
      contact = Math.max(0, contact - dt);
      ai.va *= Math.pow(0.4, dt);
      // ragdoll limbs: floppy points that trail the body
      ai.limbs.forEach(function (L, i) {
        var ax = ai.x + Math.cos(ai.ang + L.a) * (RAD + 3), ay = ai.y + Math.sin(ai.ang + L.a) * (RAD + 3);
        var nx0 = L.x + (L.x - L.px) * 0.86, ny0 = L.y + (L.y - L.py) * 0.86 + GRAV * dt * dt; L.px = L.x; L.py = L.y; L.x = nx0; L.y = ny0;
        var dx = L.x - ax, dy = L.y - ay, d = Math.hypot(dx, dy), max = 4; if (d > max) { L.x = ax + dx / d * max; L.y = ay + dy / d * max; }
        if (L.y > gy(L.x)) L.y = gy(L.x);
      });
      // trees: knock them over when going fast, bounce off when slow
      trees.forEach(function (t) {
        if (t.broke) return; var top = gy(t.x) - t.h;
        if (Math.abs(ai.x - t.x) < RAD + 2 && ai.y + RAD > top) {
          var sp = speed();
          if (sp > 110) { t.broke = 1; t.dir = ai.vx >= 0 ? 1 : -1; treesN++; ai.vx *= 0.78; ai.vy *= 0.78; burst(t.x, top + 6, P.green, 12, 70); burst(t.x, gy(t.x) - 4, P.bark, 6, 50); shake = 0.2; sfx('hit'); pop('Timber! +5', t.x, top - 8, P.lime); }
          else { ai.x = t.x + (ai.x < t.x ? -RAD - 2.5 : RAD + 2.5); ai.vx = -ai.vx * 0.35; sfx('block'); }
        }
      });
      // coins and gems
      coins.forEach(function (c) { if (!c.got && Math.hypot(c.x - ai.x, c.y - ai.y) < RAD + 4) { c.got = true; if (c.gem) { gemsN++; addTime(3, c.x, c.y); pop('+50', c.x, c.y - 6, P.cyan); burst(c.x, c.y, P.cyan, 6, 40); sfx('great'); } else { coinsN++; if (coinsN % 5 === 0) addTime(1, c.x, c.y); pop('+10', c.x, c.y - 6); sfx('tick'); } } });
      // the hoard at the end of the cave
      if (!treasure && ai.x > END - 120 && ai.y > gy(ai.x) - 40) { treasure = true; burst(ai.x, ai.y, P.yellow, 30, 120); burst(ai.x, ai.y, P.cyan, 12, 100); shake = 0.4; pop('TREASURE! +300', ai.x - 20, ai.y - 20, P.yellow); calc(); hud(); setTimeout(function () { if (G.alive) end('Treasure!'); }, 1200); }
      if (ai.x > maxX) maxX = ai.x;
      if (Math.floor(G.t * 5) !== Math.floor((G.t - dt) * 5)) hud();
      if (started && ready() && !hint && speed() < 5) { rest += dt; if (rest > 1.2) hint = 'Charge and swipe again!'; }
    };
    function pine(c, x, base, h, col, ang) {
      c.save(); c.translate(x, base); c.rotate(ang || 0);
      R(c, -1, -Math.round(h * 0.35), 2, Math.round(h * 0.35), P.bark);
      for (var i = 0; i < 3; i++) { var ty = -h + i * h * 0.22, w = 3 + i * 2.2; for (var j = 0; j < h * 0.35; j++) { var ww = Math.round(w * j / (h * 0.35)); R(c, -ww - 1, ty + j, 2 * ww + 3, 1, P.ink); } for (var j2 = 0; j2 < h * 0.35; j2++) { var w2 = Math.round(w * j2 / (h * 0.35)); R(c, -w2, ty + j2, 2 * w2 + 1, 1, i % 2 ? P.teal : col); } }
      c.restore();
    }
    G.draw = function (c) {
      var W = G.W, H = G.H, m = G.m;
      var camX = clamp(ai.x - W * 0.35, 0, END - W + 20), camY = Math.min(ai.y - H * 0.55, 620 - H);
      var inCave = ai.x > CAVE + 50;
      // sky: dawn over the valley, darker toward the mountains
      var t0 = clamp(ai.x / CAVE, 0, 1);
      var sky = [[P.plum, P.navy], [P.orange, P.plum], [P.pink, P.blue], [P.yellow, P.sky]];
      for (var b = 0; b < 4; b++) R(c, 0, Math.round(b * H / 4), W, Math.ceil(H / 4) + 1, t0 < 0.5 ? sky[b][0] : sky[b][1]);
      // aurora ribbons
      for (var ax0 = 0; ax0 < W; ax0 += 2) { var ay0 = Math.round(H * 0.12 + Math.sin((ax0 + camX * 0.1) * 0.04 + G.t) * 5); R(c, ax0, ay0, 2, 2, P.lime); R(c, ax0, ay0 + 3, 2, 1, P.cyan); }
      // far snowy peaks, and the great hall on the ridge
      for (var px1 = 0; px1 < W; px1 += 2) { var wx = px1 + camX * 0.15, hy = Math.round(H * 0.42 - Math.abs(((wx % 90) - 45)) * 0.9 - Math.sin(wx * 0.03) * 6); R(c, px1, hy, 2, H, P.slate); if (H * 0.42 - hy > 22) R(c, px1, hy, 2, 4, P.white); }
      var hallX = Math.round(140 - camX * 0.15); if (hallX > -60 && hallX < W + 10) { R(c, hallX, Math.round(H * 0.33), 40, 10, P.bark); for (var r0 = 0; r0 < 8; r0++) R(c, hallX - 3 + r0 * 0.5, Math.round(H * 0.33) - r0, 46 - r0, 1, P.yellow); R(c, hallX + 17, Math.round(H * 0.33) + 4, 5, 6, P.ink); }
      // mid forest silhouettes
      for (var px2 = 0; px2 < W; px2 += 6) { var wx2 = px2 + camX * 0.4, th = 10 + (Math.floor(wx2 / 6) * 37 % 11); var base = Math.round(H * 0.55 + Math.sin(wx2 * 0.02) * 5); for (var j = 0; j < th; j++) R(c, px2 + 3 - Math.round(j * 0.35), base - th + j, Math.round(j * 0.7) + 1, 1, P.teal); R(c, px2, base, 6, H, P.teal); }
      c.save(); if (shake) c.translate(Math.round(rnd(-2, 2) * m), Math.round(rnd(-2, 2) * m)); c.translate(-Math.round(camX), -Math.round(camY));
      // the mountain over the cave
      for (var x = Math.floor(camX); x < camX + W + 2; x++) {
        if (x < 0 || x >= END + 40) continue;
        var g1 = gnd[x], c1 = ceil[x];
        if (x > CAVE - 90) { var mtop = Math.min(c1 - 2, gnd[x] - 64 - Math.max(0, (x - CAVE + 90)) * 1.1); R(c, x, camY - 4, 1, Math.max(0, mtop - camY + 4), P.dark); }
        if (c1 > -1e8) { R(c, x, camY - 4, 1, c1 - camY + 4, P.dark); R(c, x, c1 - 2, 1, 2, P.slate); R(c, x, c1, 1, g1 - c1, P.ink); }
        var top = x > CAVE ? P.slate : x > FOOT ? P.lime : P.green;
        R(c, x, g1, 1, 3, top); R(c, x, g1 + 3, 1, camY + H - g1, x > CAVE ? P.dark : P.bark);
      }
      // cave crystals
      for (var cx1 = CAVE + 70; cx1 < END; cx1 += 47) { var cc = cx1 % 2 ? P.cyan : P.plum, glow = (Math.sin(G.t * 3 + cx1) + 1) / 2; R(c, cx1, ceil[cx1] + 1, 2, 4 + glow * 2, cc); R(c, cx1 + 9, gnd[cx1 + 9] - 5, 2, 5, cc); }
      // the hoard: a chest and a pile of coins and gems
      var hx = END - 70, hg = gy(hx);
      for (var k0 = 0; k0 < 40; k0++) { var a1 = (k0 * 2.4) % 1, rx0 = hx - 25 + (k0 * 13) % 60, ry0 = hg - 1 - Math.round(Math.max(0, 12 - Math.abs(rx0 - hx) * 0.4) * a1); R(c, rx0, ry0, 2, 2, k0 % 5 === 0 ? P.cyan : k0 % 7 === 0 ? P.pink : P.yellow); }
      R(c, hx - 6, hg - 14, 14, 10, P.ink); R(c, hx - 5, hg - 13, 12, 8, P.wood); R(c, hx - 5, hg - 13, 12, 2, P.bark); R(c, hx, hg - 10, 2, 2, P.yellow);
      if (!treasure && Math.floor(G.t * 3) % 2) txt(c, 'TREASURE', hx, hg - 28, P.yellow, 8, 'center');
      // trees
      trees.forEach(function (t) { if (t.x < camX - 20 || t.x > camX + W + 20) return; var base = gy(t.x); if (t.broke) { R(c, t.x - 1, base - 3, 3, 3, P.bark); if (t.fall < 1.4) pine(c, t.x, base - 3, t.h, P.green, t.dir * Math.min(1.5, t.fall)); else pine(c, t.x + t.dir * t.h * 0.5, base, t.h * 0.15, P.green, t.dir * 1.57); } else pine(c, t.x, base, t.h, P.green, 0); });
      // coins and gems
      coins.forEach(function (q) { if (q.got || q.x < camX - 5 || q.x > camX + W + 5) return; if (q.gem) { var gc = q.x % 2 ? P.cyan : P.pink; R(c, q.x - 1, q.y - 3, 3, 1, gc); R(c, q.x - 2, q.y - 2, 5, 2, gc); R(c, q.x - 1, q.y, 3, 1, gc); R(c, q.x, q.y + 1, 1, 1, gc); R(c, q.x - 1, q.y - 2, 1, 1, P.white); } else { var sp0 = Math.abs(Math.sin(G.t * 4 + q.x)); R(c, q.x - Math.round(sp0 * 1.5), q.y - 2, 1 + Math.round(sp0 * 3), 4, P.yellow); R(c, q.x, q.y - 1, 1, 2, P.orange); } });
      parts.forEach(function (q) { R(c, q.x, q.y, 1, 1, q.c); });
      // Aiu, the ragdoll: floppy limbs, then the body spinning
      ai.limbs.forEach(function (L) { var bx0 = ai.x + Math.cos(ai.ang + L.a) * (RAD - 1), by0 = ai.y + Math.sin(ai.ang + L.a) * (RAD - 1); c.strokeStyle = P.ink; c.lineWidth = 2; c.beginPath(); c.moveTo(bx0, by0); c.lineTo(L.x, L.y); c.stroke(); R(c, L.x - 1, L.y - 1, 2, 2, me.cr.color || P.white); });
      var fr = speed() > 150 ? me.cr.frames.happy : contact > 0 && speed() > 60 ? me.cr.frames.blink : me.cr.frames.open, bb = bbox(me.cr.frames.open), k = Math.max(1, Math.round((RAD * 2 + 2) / Math.max(bb.w, bb.h) * 1.4));
      c.save(); c.translate(Math.round(ai.x), Math.round(ai.y)); c.rotate(ai.ang); c.drawImage(fr, -Math.round((bb.x + bb.w / 2) * k), -Math.round((bb.y + bb.h / 2) * k), fr.width * k, fr.height * k); c.restore();
      if (ready() && !over && charge > 0) ring(c, Math.round(ai.x), Math.round(ai.y), RAD + 4 + Math.round(charge * 6), charge > 0.6 ? P.orange : P.yellow);
      pops.forEach(function (p) { txt(c, p.s, p.x, p.y - p.t * 16, p.c, 8, 'center'); });
      c.restore();
      // aim arrow while swiping
      if (drag && ready()) { var dx = drag.x - drag.x0, dy = drag.y - drag.y0, L2 = Math.hypot(dx, dy); if (L2 > 8) { c.strokeStyle = P.white; c.lineWidth = 2; c.beginPath(); var sx = ai.x - camX, sy = ai.y - camY; c.moveTo(sx, sy); c.lineTo(sx + dx / L2 * 26, sy + dy / L2 * 26); c.stroke(); } }
      // HUD: time, score, charge meter, distance to the treasure
      txt(c, Math.ceil(timeLeft) + 's', W / 2, 3, timeLeft < 10 ? P.orange : P.white, 10, 'center');
      txt(c, String(score), 4, 3, P.yellow, 10);
      R(c, 4, 16, 44, 5, P.ink); R(c, 5, 17, Math.round(42 * charge), 3, charge > 0.6 ? P.orange : P.yellow); txt(c, 'charge', 50, 14, P.white, 8);
      R(c, W - 54, 6, 50, 3, P.ink); R(c, W - 54, 6, Math.round(50 * clamp(maxX / (END - 70), 0, 1)), 3, P.lime); R(c, W - 5, 4, 2, 7, P.yellow);
      if (hint) txt(c, hint, W / 2, H * 0.2, P.white, 8, 'center');
      if (inCave && !treasure) txt(c, 'The cave!', W / 2, H - 14, P.cyan, 8, 'center');
    };
    G.dbg = function () { return { x: ai.x, y: ai.y, v: speed(), ready: ready(), score: score, treasure: treasure, t: timeLeft }; }; GM._cur = G;
    G.ctl.hidden = true;
    G.start(); G.restart();
  }

  /* =====================================================================
     DROP: build a drone, fly the package over, drop it on the board (rings score like shuffleboard), fly back and land.
     The battery is the clock: thrust drains it fast.
     ===================================================================== */
  function lander() {
    var me = aiu(); if (!me) return;
    var G = stage('Drop'), GRAV = 32;
    var build = { frame: 'light', thr: 'punchy', bat: 'small' };
    var BUILD = [['frame', 'Frame', [['light', 'Light', 'Zippy, but crashes easier'], ['sturdy', 'Sturdy', 'Heavier, takes bumps']]],
      ['thr', 'Thrusters', [['punchy', 'Punchy', 'Strong, drinks battery'], ['smooth', 'Smooth', 'Gentle, saves battery']]],
      ['bat', 'Battery', [['small', 'Small', 'Light'], ['big', 'Big', 'Lasts longer, heavier']]]];
    var d, pkg, parts, pops, keys, phase, over, gH, pad, board, wind, score, pkgScore, stars;
    function stats() {
      var mass = (build.frame === 'light' ? 0.85 : 1.1) + (build.bat === 'big' ? 0.15 : 0);
      return { thrust: (build.thr === 'punchy' ? 92 : 72) / mass, drain: build.thr === 'punchy' ? 5.2 : 4.0, bat: build.bat === 'big' ? 140 : 100, tough: build.frame === 'sturdy' ? 1.4 : 1 };
    }
    function ground(x) { var t = Math.abs(x - G.W * 0.45) / (G.W * 0.13), hill = t < 1 ? (1 + Math.cos(Math.PI * t)) / 2 : 0; return gH - Math.round(hill * gH * 0.3) + Math.round(Math.sin(x * 0.2) * 1); }
    G.restart = function () { showBuild(); };
    function showBuild() {
      phase = 'build'; over = false; G.buttons([]); G.unpanel();
      var body = h('div', { cls: 'gbuild' }, BUILD.map(function (row) {
        return h('div', { cls: 'gbrow' }, h('b', { text: row[1] }), h('div', { cls: 'grow' }, row[2].map(function (o) {
          var b = h('button', { type: 'button', cls: 'gbtn gopt' + (build[row[0]] === o[0] ? ' on' : ''), onclick: function () { build[row[0]] = o[0]; showBuild(); } }, h('span', { text: o[1] }), h('small', { text: o[2] }));
          b.setAttribute('aria-pressed', build[row[0]] === o[0] ? 'true' : 'false'); return b;
        })));
      }));
      var st = stats();
      G.panel('Build your drone', [me.name + ' is the pilot. Carry the package over the hill, drop it on the board, then land back on the pad before the battery runs out.', 'Thrust ' + Math.round(st.thrust) + ' · Battery ' + st.bat + ' · ' + (st.tough > 1 ? 'Sturdy' : 'Light') + ' frame'],
        [['Launch', function () { G.unpanel(); fly(); }, 'primary'], ['Games', function () { G.close(); GM.hub(); }]]);
      G.pan.insertBefore(body, G.pan.querySelector('.grow:last-child'));
      G.hud.textContent = 'Build your drone';
    }
    function fly() {
      var st = stats();
      gH = Math.min(G.H - 12, Math.round(G.W * 0.95) + 10); pad = { x: Math.round(G.W * 0.13), w: 22 }; board = { x: Math.round(G.W * 0.76), rings: [[4, 100], [9, 50], [15, 25], [22, 10]] };
      d = { x: pad.x, y: ground(pad.x) - 6, vx: 0, vy: 0, a: 0, bat: st.bat, max: st.bat, st: st, thrusting: false, landed: true, hasPkg: true };
      pkg = null; parts = []; pops = []; keys = { up: false, l: false, r: false }; phase = 'fly'; over = false; score = 0; pkgScore = null; wind = rnd(-6, 6); G.score = 0; G.t = 0;
      stars = []; for (var i = 0; i < 40; i++) stars.push([Math.floor(Math.random() * G.W), Math.floor(Math.random() * G.H * 0.6)]);
      G.buttons([['Tilt left', null, 'hold', function (on) { keys.l = on; }], ['Thrust', null, 'hold primary', function (on) { keys.up = on; }], ['Tilt right', null, 'hold', function (on) { keys.r = on; }], ['Drop', function () { drop(); }, 'hold2']]);
      hud();
    }
    function hud() { if (phase === 'build') return; G.hud.textContent = 'Battery ' + Math.max(0, Math.round(d.bat / d.max * 100)) + '% · ' + (d.hasPkg ? 'Drop it on the board' : pkgScore === null ? 'Package falling...' : 'Package ' + pkgScore + ' · now land'); }
    function drop() {
      if (phase !== 'fly' || !d.hasPkg || d.landed) return;
      d.hasPkg = false; pkg = { x: d.x, y: d.y + 6, vx: d.vx, vy: d.vy, rest: false, slide: false }; sfx('swoosh'); pop('Package away!', d.x, d.y - 10, P.white);
    }
    function pop(s, x, y, c) { pops.push({ s: s, x: x, y: y, c: c || P.yellow, t: 0 }); }
    function boom(x, y) { for (var i = 0; i < 24; i++) parts.push({ x: x, y: y, vx: rnd(-60, 60), vy: rnd(-80, 10), c: [P.orange, P.yellow, P.red, P.silver][i % 4], t: 0, life: rnd(0.5, 1.2) }); }
    G.key = function (k, down) {
      if (phase !== 'fly') return false;
      if (k === 'ArrowUp' || k === 'w' || k === 'W') { keys.up = down; return true; }
      if (k === 'ArrowLeft' || k === 'a' || k === 'A') { keys.l = down; return true; }
      if (k === 'ArrowRight' || k === 'd' || k === 'D') { keys.r = down; return true; }
      if (down && (k === ' ' || k === 'ArrowDown' || k === 's' || k === 'S')) { drop(); return true; }
      return false;
    };
    function finish(won, title, lines) {
      if (over) return; over = true; phase = 'done'; G.buttons([]);
      G.score = score; best('drop', score);
      setTimeout(function () { if (G.alive) G.endPanel('drop', won, title, lines); }, 900);
    }
    G.update = function (dt) {
      if (G.pan || phase !== 'fly' && phase !== 'done') return;
      pops.forEach(function (p) { p.t += dt; }); pops = pops.filter(function (p) { return p.t < 1; });
      parts.forEach(function (q) { q.t += dt; q.vy += GRAV * 2 * dt; q.x += q.vx * dt; q.y += q.vy * dt; }); parts = parts.filter(function (q) { return q.t < q.life; });
      if (phase !== 'fly') return;
      var st = d.st, lift = d.hasPkg ? 1 : 1.2;
      if (keys.l) d.a -= 2.4 * dt; if (keys.r) d.a += 2.4 * dt; d.a = clamp(d.a, -1.3, 1.3);
      d.thrusting = keys.up && d.bat > 0;
      if (d.thrusting) { d.vx += Math.sin(d.a) * st.thrust * lift * dt; d.vy -= Math.cos(d.a) * st.thrust * lift * dt; d.bat -= st.drain * dt; d.landed = false; if (Math.random() < 0.6) parts.push({ x: d.x - Math.sin(d.a) * 5, y: d.y + Math.cos(d.a) * 5, vx: -Math.sin(d.a) * 40 + rnd(-8, 8), vy: Math.cos(d.a) * 40, c: Math.random() < 0.5 ? P.orange : P.yellow, t: 0, life: 0.25 }); }
      d.bat -= 0.5 * dt; d.bat = Math.max(0, d.bat);
      if (!d.landed) { d.vy += GRAV * dt; d.vx += wind * dt * 0.15; d.x += d.vx * dt; d.y += d.vy * dt; }
      if (d.x < 4) { d.x = 4; d.vx = Math.abs(d.vx) * 0.3; } if (d.x > G.W - 4) { d.x = G.W - 4; d.vx = -Math.abs(d.vx) * 0.3; } if (d.y < 8) { d.y = 8; d.vy = Math.max(0, d.vy); }
      if (Math.floor(G.t * 4) !== Math.floor((G.t - dt) * 4)) hud();
      // touching the ground
      var gy0 = ground(d.x) - 6;
      if (!d.landed && d.y >= gy0) {
        var onPad = Math.abs(d.x - pad.x) < pad.w / 2, soft = d.vy < 22 * st.tough && Math.abs(d.vx) < 14 * st.tough && Math.abs(d.a) < 0.35;
        d.y = gy0;
        if (!soft) { boom(d.x, d.y); sfx('bomb'); d.dead = true; return finish(false, 'Crash!', ['Too fast or tilted when it touched down. Come in slow and level.', pkgScore !== null ? 'Package: ' + pkgScore + ' points.' : 'The package didn\'t make it to the board.']); }
        d.vx = 0; d.vy = 0; d.a = 0; d.landed = true; sfx('block');
        if (onPad && d.hasPkg && G.t > 1) pop('Drop the package first!', d.x, d.y - 14, P.pink);
      }
      if (d.landed && !d.hasPkg && pkg && pkg.rest && Math.abs(d.x - pad.x) < pad.w / 2) { // home, and the package has landed: done
        var batB = Math.round(d.bat / d.max * 100); score = (pkgScore || 0) + 50 + batB;
        return finish(pkgScore > 0, pkgScore > 0 ? 'Delivered and landed!' : 'Landed, but missed the board', ['Package: ' + pkgScore + ' · landing +50 · battery +' + batB, 'Score: ' + score]);
      }
      if (d.bat <= 0 && d.landed && !(Math.abs(d.x - pad.x) < pad.w / 2 && !d.hasPkg)) return finish(false, 'Battery flat', ['Out of power before getting home. Try Smooth thrusters or a Big battery.']);
      // the package: falls, then slides on the board like shuffleboard
      if (pkg && !pkg.rest) {
        if (!pkg.slide) { pkg.vy += GRAV * dt; pkg.x += pkg.vx * dt; pkg.y += pkg.vy * dt; if (pkg.y >= ground(pkg.x) - 2) { pkg.y = ground(pkg.x) - 2; pkg.slide = true; pkg.vy = 0; sfx('hit'); for (var i = 0; i < 6; i++) parts.push({ x: pkg.x, y: pkg.y, vx: rnd(-30, 30), vy: rnd(-30, -5), c: P.silver, t: 0, life: 0.5 }); } }
        else { pkg.x += pkg.vx * dt; pkg.vx *= Math.pow(0.15, dt); pkg.y = ground(pkg.x) - 2; if (Math.abs(pkg.vx) < 2) { pkg.rest = true; var off = Math.abs(pkg.x - board.x); pkgScore = 0; for (var r = 0; r < board.rings.length; r++) if (off <= board.rings[r][0]) { pkgScore = board.rings[r][1]; break; } pop(pkgScore ? (pkgScore === 100 ? 'BULLSEYE! 100' : '+' + pkgScore) : 'Missed the board', pkg.x, pkg.y - 12, pkgScore ? P.yellow : P.pink); sfx(pkgScore ? 'great' : 'miss'); hud(); } }
      }
    };
    G.draw = function (c) {
      var W = G.W, H = G.H;
      if (phase === 'build' && !d) { R(c, 0, 0, W, H, P.ink); return; }
      R(c, 0, 0, W, H, P.ink); stars.forEach(function (s0, i) { R(c, s0[0], s0[1], 1, 1, (i + Math.floor(G.t * 2)) % 9 ? P.silver : P.white); });
      disc(c, Math.round(W * 0.82), Math.round(H * 0.14), 8, P.blue); disc(c, Math.round(W * 0.82) - 2, Math.round(H * 0.14) - 2, 3, P.green); // a planet
      for (var x = 0; x < W; x++) { var g = ground(x); R(c, x, g, 1, H - g, P.slate); R(c, x, g, 1, 1, P.silver); if ((x * 7) % 23 === 0) R(c, x, g + 3, 2, 1, P.dark); }
      for (var sy = gH + 14; sy < H; sy += 18) for (var sx = 0; sx < W; sx += 2) R(c, sx, sy + Math.round(Math.sin(sx * 0.05 + sy) * 3), 2, 1, P.dark); // rock layers
      [[0.3, 30, 7], [0.62, 60, 5], [0.9, 44, 9], [0.15, 90, 6]].forEach(function (k0) { var cx0 = Math.round(W * k0[0]), cy0 = gH + k0[1]; if (cy0 < H - 4) { ell(c, cx0, cy0, k0[2], Math.max(1, Math.round(k0[2] / 3)), P.dark); ell(c, cx0, cy0 - 1, k0[2] - 2, Math.max(1, Math.round(k0[2] / 4)), P.ink); } }); // craters
      // the pad
      R(c, pad.x - pad.w / 2, ground(pad.x) - 1, pad.w, 2, P.yellow); for (var px0 = 0; px0 < pad.w; px0 += 4) R(c, pad.x - pad.w / 2 + px0, ground(pad.x) - 1, 2, 2, P.ink); R(c, pad.x - pad.w / 2, ground(pad.x) - 5, 1, 4, (Math.floor(G.t * 3) % 2) ? P.red : P.dark); R(c, pad.x + pad.w / 2 - 1, ground(pad.x) - 5, 1, 4, (Math.floor(G.t * 3) % 2) ? P.dark : P.red);
      // the board: scoring rings laid out on the ground
      var cols = [P.red, P.white, P.blue, P.white], gb = ground(board.x);
      for (var r = board.rings.length - 1; r >= 0; r--) R(c, board.x - board.rings[r][0], gb - 1, board.rings[r][0] * 2 + 1, 3, r === 0 ? P.red : r === 1 ? P.yellow : r === 2 ? P.blue : P.white);
      R(c, board.x, gb - 6, 1, 5, P.white); txt(c, '100', board.x, gb - 16, P.yellow, 8, 'center');
      // package
      if (pkg) { R(c, pkg.x - 2, pkg.y - 4, 5, 4, P.ink); R(c, pkg.x - 1, pkg.y - 3, 3, 2, P.wood); R(c, pkg.x, pkg.y - 4, 1, 4, P.yellow); }
      parts.forEach(function (q) { R(c, q.x, q.y, 1, 1, q.c); });
      // the drone, with Aiu in the cockpit
      if (d && !d.dead) {
        c.save(); c.translate(Math.round(d.x), Math.round(d.y)); c.rotate(d.a);
        var bb = bbox(me.cr.frames.open), k = 1, fr = d.landed ? me.cr.frames.open : me.cr.frames.happy;
        c.save(); c.beginPath(); c.rect(-6, -14, 12, 11); c.clip(); c.drawImage(fr, -Math.round((bb.x + bb.w / 2) * k), -3 - Math.round((bb.y + bb.h) * k) + Math.round(bb.h * 0.45), fr.width * k, fr.height * k); c.restore();
        R(c, -7, -4, 14, 6, P.ink); R(c, -6, -3, 12, 4, build.frame === 'sturdy' ? P.slate : P.silver); R(c, -6, -3, 12, 1, P.white); R(c, -2, -2, 4, 2, P.cyan);
        R(c, -6, 2, 1, 4, P.ink); R(c, 5, 2, 1, 4, P.ink); R(c, -8, 5, 4, 1, P.ink); R(c, 4, 5, 4, 1, P.ink);
        R(c, -9, -4, 3, 2, P.dark); R(c, 6, -4, 3, 2, P.dark);
        if (d.thrusting) { R(c, -2, 2, 4, 2 + Math.round(Math.random() * 3), P.orange); R(c, -1, 3, 2, 2, P.yellow); }
        if (d.hasPkg) { R(c, 0, 2, 1, 3, P.silver); R(c, -2, 5, 5, 4, P.ink); R(c, -1, 6, 3, 2, P.wood); }
        c.restore();
      }
      // battery and speed
      if (d) {
        var bw = Math.round(W * 0.35), pct = d.bat / d.max; R(c, 4, 4, bw + 2, 6, P.white); R(c, 5, 5, bw, 4, P.ink); R(c, 5, 5, Math.round(bw * pct), 4, pct < 0.25 ? P.red : pct < 0.5 ? P.yellow : P.lime); R(c, bw + 6, 6, 2, 2, P.white);
        var safe = Math.abs(d.vy) < 22 * d.st.tough && Math.abs(d.vx) < 14 * d.st.tough && Math.abs(d.a) < 0.35;
        txt(c, 'Down ' + Math.round(Math.max(0, d.vy)) + ' · Side ' + Math.round(Math.abs(d.vx)), 4, 13, safe ? P.lime : P.orange, 8);
        if (Math.abs(wind) > 3) txt(c, 'Wind ' + (wind > 0 ? '>' : '<'), W - 4, 13, P.silver, 8, 'right');
        if (G.t < 3 && phase === 'fly') txt(c, 'Hold Thrust. Tilt to steer.', W / 2, H * 0.32, P.white, 8, 'center');
      }
      pops.forEach(function (p) { txt(c, p.s, p.x, p.y - p.t * 14, p.c, 8, 'center'); });
    };
    G._keys = function () { return keys; };
    G.dbg = function () { return d ? { x: d.x, y: d.y, vx: d.vx, vy: d.vy, a: d.a, bat: d.bat, hasPkg: d.hasPkg, landed: d.landed, pkg: pkgScore, phase: phase, padX: pad.x, boardX: board.x } : { phase: phase }; }; GM._cur = G;
    G.start(); showBuild();
  }

  /* =====================================================================
     DELIVER (2.2.0): Aiu takes the ride from the garage on a paper route. Steer down the street, toss packages onto the
     porches with a red flag (tap the left or right side of the street to throw that way), and pull over at the bus stops
     to pick up totem passengers. Drop them at the green flag. 60 seconds; each passenger dropped off adds 5. 100 to win.
     ===================================================================== */
  function deliver() {
    var me = aiu(); if (!me) return;
    var G = stage('Deliver'), kind = (AIU.places && AIU.places.garageState ? AIU.places.garageState(app().S).kind : null) || 'car';
    var acc = (AIU.places && AIU.places.accent) ? AIU.places.accent() : P.red, kinds = Object.keys(A.KINDS);
    var you, scroll, speed, tLeft, pk, houses, things, flying, pops, steer, pass, stopT, done, nextY;
    var ROAD = function () { var rw = Math.min(G.W - 50, 96); return { l: Math.round(G.W / 2 - rw / 2), r: Math.round(G.W / 2 + rw / 2), w: rw }; };
    function lanes() { var rd = ROAD(), q = rd.w / 4; return [rd.l + q * 0.5, rd.l + q * 1.5, rd.l + q * 2.5, rd.l + q * 3.5]; }
    G.restart = function () {
      var rd = ROAD(); you = { x: G.W / 2 + rd.w / 8, vx: 0, bump: 0 }; scroll = 0; speed = 34; tLeft = Math.round(60 * GM.D().t); pk = 10; houses = []; things = []; flying = []; pops = []; steer = 0; pass = null; stopT = 0; done = false; nextY = 0; G.score = 0;
      for (var i = 0; i < 12; i++) spawnRow();
      hud();
    };
    function hud() { G.hud.textContent = Math.ceil(tLeft) + 's · ' + G.score + ' pts · ' + pk + ' pkg' + (pass ? ' · passenger: green flag' : ''); }
    function pop(s, c, x, y) { pops.push({ s: s, c: c, x: x, y: y, t: 0 }); }
    // the street, one row at a time (world y counts up as you drive)
    function spawnRow() {
      var y = nextY; nextY += rnd(34, 46);
      [-1, 1].forEach(function (side) { houses.push({ y: y + rnd(-4, 4), side: side, sub: Math.random() < 0.45, got: false, col: [P.blue, P.orange, P.teal, P.purple, P.sand][Math.floor(Math.random() * 5)] }); });
      var L = lanes(), r = Math.random();
      if (r < 0.28) things.push({ y: y + 18, x: L[1 + Math.floor(Math.random() * 2)], k: Math.random() < 0.5 ? 'cone' : 'puddle' });
      else if (r < 0.42) things.push({ y: y + 14, x: L[1 + Math.floor(Math.random() * 2)], k: 'car', col: [P.blue, P.green, P.yellow, P.silver][Math.floor(Math.random() * 4)] });
      if (Math.random() < 0.16) { var sd = Math.random() < 0.5 ? 0 : 3; things.push({ y: y + 24, x: L[sd], k: 'stop', side: sd, cr: A.creature((Math.random() * 1e9) | 0, 1 + Math.floor(Math.random() * 3), (Math.random() * 1e9) | 0, kinds[Math.floor(Math.random() * kinds.length)]) }); }
      else if (Math.random() < 0.08) things.push({ y: y + 26, x: L[Math.random() < 0.5 ? 0 : 3], k: 'depot' });
    }
    function throwPk(side) {
      if (done || G.pan) return;
      if (pk <= 0) { pop('Out of packages: grab a box', P.orange, G.W / 2, 30); sfx('miss'); return; }
      pk--; flying.push({ x: you.x, y: scroll + 14, side: side, t: 0 }); sfx('swoosh'); hud();
    }
    G.buttons([['< Throw', function () { throwPk(-1); }, 'primary'], ['Left', null, '', function (on) { steer = on ? -1 : steer === -1 ? 0 : steer; }], ['Right', null, '', function (on) { steer = on ? 1 : steer === 1 ? 0 : steer; }], ['Throw >', function () { throwPk(1); }, 'primary']]);
    var sw = null; // 2.3.0: swipe left or right to change lanes; a tap throws to that side
    G.cv.addEventListener('pointerdown', function (e) { if (G.pan) return; e.preventDefault(); sw = { x: e.clientX, y: e.clientY, p: G.pt(e) }; });
    G.cv.addEventListener('pointerup', function (e) {
      if (!sw || G.pan) { sw = null; return; } var dx = e.clientX - sw.x, p0 = sw.p; sw = null;
      if (Math.abs(dx) > 28) { var L = lanes(), i = 0, best = 1e9; L.forEach(function (lx, k) { if (Math.abs(lx - you.x) < best) { best = Math.abs(lx - you.x); i = k; } }); i = Math.max(0, Math.min(3, i + (dx > 0 ? 1 : -1))); you.target = L[i]; sfx('swoosh'); return; }
      throwPk(p0.x < G.W / 2 ? -1 : 1);
    });
    G.key = function (k, down) {
      if (k === 'ArrowLeft' || k === 'a' || k === 'A') { steer = down ? -1 : steer === -1 ? 0 : steer; return true; }
      if (k === 'ArrowRight' || k === 'd' || k === 'D') { steer = down ? 1 : steer === 1 ? 0 : steer; return true; }
      if (!down) return false;
      if (k === 'z' || k === 'Z' || k === 'q' || k === 'Q') { throwPk(-1); return true; }
      if (k === 'x' || k === 'X' || k === 'e' || k === 'E') { throwPk(1); return true; }
      return false;
    };
    G.update = function (dt) {
      if (G.pan || done) return;
      pops.forEach(function (p) { p.t += dt; }); pops = pops.filter(function (p) { return p.t < 1.1; });
      tLeft -= dt; if (tLeft <= 0) { tLeft = 0; return finish(); }
      var rd = ROAD();
      if (steer) you.target = null; if (you.target !== null && you.target !== undefined) { var dl = you.target - you.x; you.vx = Math.abs(dl) < 1 ? 0 : (dl > 0 ? 1 : -1) * Math.min(110, Math.abs(dl) * 8); if (Math.abs(dl) < 1) { you.x = you.target; you.target = null; } }
      else you.vx += (steer * 90 - you.vx) * Math.min(1, dt * 8);
      you.x = clamp(you.x + you.vx * dt, rd.l + 5, rd.r - 5);
      if (stopT > 0) { stopT -= dt; speed = 0; } else { speed += ((you.bump > 0 ? 14 : 34 + Math.min(20, (60 - tLeft) * 0.3)) - speed) * Math.min(1, dt * 2); }
      you.bump = Math.max(0, you.bump - dt);
      scroll += speed * dt;
      while (nextY < scroll + G.H + 60) spawnRow();
      houses = houses.filter(function (o) { return o.y > scroll - 40; }); things = things.filter(function (o) { return o.y > scroll - 30 && !o.gone; });
      var L = lanes(), q = rd.w / 4;
      things.forEach(function (o) {
        var dy = o.y - (scroll + 14); if (Math.abs(dy) > 6 || Math.abs(o.x - you.x) > q * 0.6) return;
        if ((o.k === 'cone' || o.k === 'car') && you.bump <= 0) { you.bump = 1; o.gone = o.k === 'cone'; pop('Bump!', P.orange, you.x, 40); sfx('hit'); }
        else if (o.k === 'puddle' && you.bump <= 0) { you.bump = 0.5; pop('Splash', P.cyan, you.x, 40); sfx('miss'); }
        else if (o.k === 'stop' && !pass && !o.gone) { o.gone = true; stopT = 0.9; pass = { cr: o.cr }; var fs = Math.random() < 0.5 ? 0 : 3; things.push({ y: o.y + rnd(160, 260), x: L[fs], k: 'flag' }); pop('Hop in!', P.lime, you.x, 40); sfx('great'); hud(); }
        else if (o.k === 'flag' && pass && !o.gone) { o.gone = true; stopT = 0.7; pass = null; G.score += 25; tLeft += 5; pop('+25 and +5s', P.lime, you.x, 40); sfx('bell'); hud(); }
        else if (o.k === 'depot' && !o.gone) { o.gone = true; pk = Math.min(10, pk + 5); pop('+5 packages', P.yellow, you.x, 40); sfx('great'); hud(); }
      });
      flying.forEach(function (f) {
        f.t += dt; f.x += f.side * 120 * dt;
        var porchX = f.side < 0 ? rd.l - 22 : rd.r + 22;
        if ((f.side < 0 && f.x <= porchX) || (f.side > 0 && f.x >= porchX) || f.t > 1) {
          f.done = true;
          var hit = houses.filter(function (o) { return o.side === f.side && Math.abs(o.y - f.y) < 10; })[0];
          if (hit && hit.sub && !hit.got) { hit.got = true; var pts = Math.abs(hit.y - f.y) < 4 ? 10 : 6; G.score += pts; pop('+' + pts, P.yellow, porchX, hit.y - scroll); sfx('great'); }
          else if (hit && !hit.sub) pop('Not on the route', P.silver, porchX, (hit.y - scroll));
          else sfx('miss');
          hud();
        }
      });
      flying = flying.filter(function (f) { return !f.done; });
      if (Math.floor(tLeft * 2) !== Math.floor((tLeft + dt) * 2)) hud();
    };
    function finish() {
      done = true; hud(); best('deliver', G.score);
      setTimeout(function () { if (!G.alive) return; var GOAL = Math.round(100 * GM.D().goal); G.endPanel('deliver', G.score >= GOAL, G.score >= GOAL ? 'Route done!' : 'Time\'s up', [G.score + ' points.', G.score >= GOAL ? me.name + ' made every stop count.' : GOAL + ' to win. Red-flag porches only; pull over at the bus stops for passengers (+25, +5 seconds).']); }, 500);
    }
    function sy(wy) { return Math.round(G.H - 18 - (wy - scroll)); } // world y to screen y (you drive up)
    function car(c, x, y, col) { R(c, x - 4, y - 7, 9, 14, P.ink); R(c, x - 3, y - 6, 7, 12, col); R(c, x - 2, y - 4, 5, 3, P.cyan); R(c, x - 2, y + 3, 5, 2, P.cyan); R(c, x - 5, y - 5, 1, 3, P.ink); R(c, x + 5, y - 5, 1, 3, P.ink); R(c, x - 5, y + 2, 1, 3, P.ink); R(c, x + 5, y + 2, 1, 3, P.ink); }
    function ride(c, x, y) {
      var b = you.bump > 0 && Math.floor(G.t * 12) % 2;
      if (kind === 'bike' || kind === 'moto') { R(c, x - 1, y - 8, 3, 16, P.ink); R(c, x - 1, y - 6, 3, 12, kind === 'moto' ? acc : P.slate); R(c, x - 4, y - 5, 9, 1, P.silver); }
      else if (kind === 'carriage') { R(c, x - 2, y - 16, 5, 8, P.wood); R(c, x - 1, y - 18, 3, 3, P.wood); R(c, x - 5, y - 8, 11, 14, P.ink); R(c, x - 4, y - 7, 9, 12, acc); R(c, x - 6, y - 4, 1, 6, P.bark); R(c, x + 6, y - 4, 1, 6, P.bark); }
      else if (kind === 'ship') { ell(c, x, y + 3, 7, 2, P.slate); R(c, x - 5, y - 6, 11, 12, P.silver); R(c, x - 3, y - 4, 7, 5, P.cyan); R(c, x - 1, y + 6, 3, 2, Math.floor(G.t * 10) % 2 ? P.orange : P.yellow); }
      else car(c, x, y, acc);
      var fr = me.cr.frames[b ? 'blink' : 'open'], bb = bbox(fr), k2 = Math.max(1, Math.round(8 / Math.max(bb.h, 8))), dw = fr.width * k2 * 0.5, dh = fr.height * k2 * 0.5;
      c.drawImage(fr, Math.round(x - (bb.x + bb.w / 2) * k2 * 0.5), Math.round(y - 3 - (bb.y + bb.h) * k2 * 0.5), dw, dh);
    }
    G.draw = function (c) {
      var W = G.W, H = G.H, rd = ROAD();
      R(c, 0, 0, W, H, P.green); R(c, rd.l - 12, 0, 12, H, P.silver); R(c, rd.r, 0, 12, H, P.silver); R(c, rd.l, 0, rd.w, H, P.dark); R(c, rd.l, 0, Math.round(rd.w / 4), H, P.slate); R(c, rd.r - Math.round(rd.w / 4), 0, Math.round(rd.w / 4), H, P.slate); // the pull-over lanes are lighter
      for (var my = -((scroll * 1) % 20); my < H; my += 20) { R(c, Math.round(G.W / 2), Math.round(H - my - 10), 1, 8, P.yellow); R(c, Math.round(rd.l + rd.w / 4), Math.round(H - my - 10), 1, 5, P.slate); R(c, Math.round(rd.l + rd.w * 3 / 4), Math.round(H - my - 10), 1, 5, P.slate); }
      houses.forEach(function (o) {
        var y = sy(o.y), x = o.side < 0 ? rd.l - 12 - 24 : rd.r + 12 + 4; if (y < -30 || y > H + 30) return;
        R(c, x, y - 10, 20, 18, o.col); R(c, x - 1, y - 12, 22, 3, P.bark); R(c, x + 7, y - 2, 6, 10, P.wood);
        var px0 = o.side < 0 ? rd.l - 14 : rd.r + 2; R(c, px0 - 6, y - 4, 12, 8, o.got ? P.lime : P.sand); // the porch mat
        if (o.sub && !o.got) { var fx2 = o.side < 0 ? px0 + 6 : px0 - 7; R(c, px0 - 7, y - 5, 14, 10, P.red); R(c, px0 - 5, y - 3, 10, 6, P.sand); R(c, fx2, y - 16, 1, 12, P.white); R(c, fx2 + 1, y - 16, 6, 4, P.red); if (Math.floor(G.t * 3) % 2) R(c, fx2 + 1, y - 16, 6, 1, P.pink); } // on the route: a red flag and a red mat
      });
      things.forEach(function (o) {
        var y = sy(o.y), x = Math.round(o.x); if (y < -20 || y > H + 20 || o.gone) return;
        if (o.k === 'cone') { R(c, x - 2, y - 3, 5, 6, P.orange); R(c, x - 1, y - 1, 3, 1, P.white); }
        else if (o.k === 'puddle') ell(c, x, y, 7, 3, P.blue);
        else if (o.k === 'car') car(c, x, y, o.col);
        else if (o.k === 'stop') { R(c, x + 6, y - 12, 1, 14, P.silver); R(c, x + 4, y - 14, 6, 4, P.blue); var fr = o.cr.frames.open, bb = bbox(fr); c.drawImage(fr, Math.round(x - bb.x - bb.w / 2), Math.round(y - bb.y - bb.h + 2)); if (!pass && Math.floor(G.t * 3) % 2) txt(c, 'Pull over!', x, y - 24, P.white, 8, 'center'); }
        else if (o.k === 'flag') { R(c, x, y - 14, 1, 16, P.silver); R(c, x + 1, y - 14, 6, 4, P.lime); }
        else if (o.k === 'depot') { R(c, x - 4, y - 4, 9, 8, P.wood); R(c, x - 4, y - 1, 9, 1, P.bark); }
      });
      flying.forEach(function (f) { var y = sy(f.y) - Math.round(Math.sin(Math.min(1, f.t * 2.5) * Math.PI) * 6); R(c, Math.round(f.x) - 2, y - 2, 4, 4, P.wood); R(c, Math.round(f.x) - 2, y - 1, 4, 1, P.bark); });
      ride(c, Math.round(you.x), sy(scroll + 14));
      if (pass) { var pf = pass.cr.frames.happy, pb = bbox(pf); c.drawImage(pf, Math.round(you.x + 6 - pb.x), Math.round(sy(scroll + 14) - 4 - pb.y - pb.h), pf.width * 0.6, pf.height * 0.6); }
      pops.forEach(function (p) { txt(c, p.s, p.x, p.y - p.t * 12, p.c, 8, 'center'); });
      txt(c, Math.ceil(tLeft) + 's', 3, 3, P.white, 8); txt(c, String(G.score), W - 3, 3, P.yellow, 8, 'right');
      if (G.t < 5) txt(c, 'Tap a side to throw. Swipe to change lanes.', W / 2, 14, P.white, 8, 'center');
    };
    G.start(); G.restart();
  }

  /* ---------- the hub ---------- */
  GM.GAMES = [
    { id: 'slice', name: 'Slice', text: '40 seconds. Swipe the flying seashells and logs, skip the rainbow eggs. 30 to win. Combos (3 or more in one swipe) add time.', run: slice },
    { id: 'wilds', name: 'Wilds', text: 'Battle a wild creature, turn by turn. Tap on time for big hits and blocks.', run: wilds },
    { id: 'cup', name: 'Wilds Cup', text: 'Three battles in a row, then the champ. Half your health comes back between rounds.', run: function () { wilds({ cup: true }); } },
    { id: 'spar', name: 'Spar', text: 'Box with your Aiu. Jab, hold Block, counter when it\'s dizzy.', run: spar },
    { id: 'dash', name: 'Dash', text: 'A foot race with three wild creatures. Tap left, right, left, right. Jump the hurdles.', run: dash },
    { id: 'fling', name: 'Fling', text: '45 seconds. Tap fast to charge, swipe to throw your Aiu through the forest and into the treasure cave. Gems add 3 seconds; every 5 coins add 1.', run: fling },
    { id: 'deliver', name: 'Deliver', text: '60 seconds on a paper route in your ride from the garage. Tap a side to toss packages onto red-flag porches, swipe to change lanes, pull into the light outer lane at bus stops for passengers (+25). 100 to win.', run: deliver },
    { id: 'drop', name: 'Drop', text: 'Build a drone, drop the package on the target board, then land on the pad before the battery dies.', run: lander }
  ];
  GM.icon = function (id) {
    var cv = mk(16, 16), c = cv.getContext('2d');
    if (id === 'slice') { disc(c, 6, 8, 5, P.ink); disc(c, 6, 8, 4, P.pink); R(c, 0, 9, 16, 7, P.ink); R(c, 4, 9, 5, 3, P.orange); for (var k2 = -2; k2 <= 2; k2++) R(c, 6 + k2, 5, 1, 4, P.red); R(c, 2, 13, 10, 3, P.bark); R(c, 11, 13, 3, 3, P.sand); for (var i = 0; i < 12; i++) R(c, 2 + i, 14 - i, 1, 1, P.white); }
    else if (id === 'wilds') { for (var j = 0; j < 10; j++) { R(c, 3 + j, 12 - j, 1, 1, P.silver); R(c, 12 - j, 12 - j, 1, 1, P.silver); } R(c, 2, 12, 3, 2, P.bark); R(c, 11, 12, 3, 2, P.bark); R(c, 6, 4, 4, 1, P.yellow); disc(c, 8, 3, 1, P.yellow); }
    else if (id === 'deliver') { R(c, 0, 0, 16, 16, P.green); R(c, 4, 0, 8, 16, P.dark); R(c, 8, 1, 1, 3, P.yellow); R(c, 8, 7, 1, 3, P.yellow); R(c, 5, 9, 5, 7, P.ink); R(c, 6, 10, 3, 5, P.red); R(c, 6, 11, 3, 1, P.cyan); R(c, 0, 3, 3, 3, P.wood); R(c, 13, 4, 1, 5, P.silver); R(c, 14, 4, 2, 2, P.red); }
    else if (id === 'drop') { R(c, 3, 4, 10, 4, P.ink); R(c, 4, 5, 8, 2, P.silver); R(c, 1, 3, 3, 1, P.dark); R(c, 12, 3, 3, 1, P.dark); R(c, 7, 8, 1, 2, P.silver); R(c, 6, 10, 3, 2, P.wood); R(c, 1, 14, 14, 2, P.slate); R(c, 6, 14, 4, 1, P.red); R(c, 4, 14, 2, 1, P.yellow); R(c, 10, 14, 2, 1, P.yellow); }
    else if (id === 'fling') { R(c, 0, 11, 16, 5, P.green); R(c, 11, 4, 1, 7, P.bark); R(c, 9, 2, 5, 5, P.teal); disc(c, 4, 6, 3, P.ink); disc(c, 4, 6, 2, P.lime); for (var q2 = 0; q2 < 4; q2++) R(c, 1 + q2, 11 - q2 * 2, 1, 1, P.white); R(c, 13, 12, 2, 2, P.yellow); }
    else if (id === 'cup') { R(c, 4, 2, 8, 7, P.ink); R(c, 5, 3, 6, 5, P.yellow); R(c, 2, 3, 2, 3, P.yellow); R(c, 12, 3, 2, 3, P.yellow); R(c, 7, 9, 2, 3, P.yellow); R(c, 4, 12, 8, 2, P.wood); R(c, 6, 4, 1, 2, P.white); }
    else if (id === 'dash') { R(c, 1, 12, 14, 2, P.red); R(c, 9, 7, 1, 6, P.white); R(c, 7, 7, 5, 1, P.white); disc(c, 4, 8, 3, P.lime); R(c, 3, 7, 1, 1, P.ink); for (var q = 0; q < 3; q++) R(c, 0, 5 + q * 2, 2 - (q % 2), 1, P.white); }
    else { R(c, 2, 2, 11, 10, P.ink); R(c, 3, 3, 9, 8, P.red); R(c, 4, 4, 3, 2, P.pink); R(c, 12, 5, 2, 4, P.ink); R(c, 12, 6, 1, 2, P.red); R(c, 3, 11, 9, 3, P.white); R(c, 2, 11, 1, 3, P.ink); R(c, 12, 11, 1, 3, P.ink); }
    cv.className = 'gicon'; return cv;
  };
  GM.play = function (id) { var g = GM.GAMES.filter(function (x) { return x.id === id; })[0]; if (g) runIt(g); };
  function runIt(g) { // 2.3.0: the first time you play a game, a how-to card comes first (the game waits behind it)
    g.run(); var a = app(), seen = a.local.gHow || (a.local.gHow = {});
    if (!seen[g.id] && cur && cur.panel) { seen[g.id] = 1; a.saveLocal(); var G0 = cur; setTimeout(function () { if (G0.alive && !G0.pan) G0.panel('How to play ' + g.name, [g.text, 'Level: ' + GM.D().name + ' (change it in the Games menu).'], [['Let\'s go!', function () { G0.unpanel(); }, 'primary']]); }, 30); }
  }
  GM.hub = function () {
    var a = app(), k = AIU.ui.k, S = a.S, sc = a.sceneState(), s;
    if (!sc.stage) { k.snack('Hatch your egg first. Then your pet takes you to the games.'); return; }
    var bd = A.BUDDIES[A.buddyOf(sc.soul, sc.buddy)].replace(/ \(.*\)$/, '').toLowerCase(), gear = A.gearOf(A.buddyOf(sc.soul, sc.buddy), sc.gear);
    var bn = AIU.core.setting(S, 'buddyName', ''); if (bn) bd = bd + ' ' + bn;
    var intro = sc.indoor ? 'The computer is on. Pick a game.' : 'Your ' + bd + (gear === 'saddle' ? ' is saddled up' : gear === 'backpack' ? ' has its backpack on' : ' is ready to go') + '. Where to?';
    var w = GM.winsToday(), bests0 = bests();
    var lv = h('div', { cls: 'seg glevel', role: 'radiogroup', 'aria-label': 'Level' }, Object.keys(DIFF).map(function (id) { return h('button', { type: 'button', role: 'radio', 'aria-checked': String(GM.diffId() === id), cls: GM.diffId() === id ? 'on' : '', text: DIFF[id].name, onclick: function () { a.local.gDiff = id; a.saveLocal(); [].forEach.call(lv.children, function (b0) { var on = b0.textContent === DIFF[id].name; b0.classList.toggle('on', on); b0.setAttribute('aria-checked', String(on)); }); } }); }));
    s = k.sheet('Games', [h('p', { text: intro }), h('div', { cls: 'row' }, h('b', { text: 'Level: ' }), lv),
      h('div', { cls: 'ghub' }, GM.GAMES.map(function (g) {
        return h('button', { type: 'button', cls: 'ghcard', onclick: function () { s.remove(); runIt(g); } }, GM.icon(g.id),
          h('span', { cls: 'ghtext' }, h('b', { text: g.name }), h('span', { cls: 'small', text: g.text }), bests0[g.id] ? h('span', { cls: 'small', text: 'Best: ' + bests0[g.id] }) : null));
      })),
      h('p', { cls: 'small', text: w >= 3 ? 'You\'ve had 3 wins today: play for fun, growth comes back tomorrow.' : 'A win grows ' + S.totemName + ' +1 (' + (3 - w) + ' more today).' })]);
  };
})();
