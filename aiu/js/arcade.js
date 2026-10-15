/* AIU TOTEM 2.4.0 - the arcade. Tap the computer in the office (3.2.0: the only way in) and the dice pick one of eight quick games.
   Every game: about a minute, 3 short levels that get harder, a real way to lose, 1 to 3 stars, your best score, a
   one-picture how-to the first time, and one tiny tip to remember at the end. Drawn in code at 180x240 (a handheld
   screen, sharp little pixels), all our own art.
   Growth (core.js keeps the real count, the same on every device): the first win of each game today +3; winning it again
   only pays +1 when you beat today's score (twice per game a day). The joy streak doubles it. So the dice decide, and
   playing the easy one over and over doesn't pay.
   The games themselves live in arcade-games.js and arcade-more.js; this file is the screen, the dice and the rules. */
(function () {
  'use strict';
  var U = AIU.util, A = AIU.art, P = A.P, h = U.h, GM = AIU.games = {};
  var GW = 180, GH = 240;
  function app() { return AIU.app; }
  GM.W = GW; GM.H = GH;
  GM.LIST = [];
  GM.add = function (def) { GM.LIST.push(def); };
  GM.byId = function (id) { return GM.LIST.filter(function (g) { return g.id === id; })[0]; };

  /* ---------- pixel tools ---------- */
  var PAL = GM.PAL = { k: P.ink, p: P.plum, r: P.red, o: P.orange, y: P.yellow, l: P.lime, g: P.green, t: P.teal, n: P.navy, b: P.blue, i: P.sky, c: P.cyan, w: P.white, s: P.silver, S: P.slate, d: P.dark, W: P.wood, B: P.bark, a: P.sand, P: P.pink, '#': '#000000', m: '#7a3b6e', e: '#c46a3a', u: '#2a8f5e', v: '#cfd8e0', x: '#262b44', z: '#e8c45a' };
  function mk(w, hh) { var cv = document.createElement('canvas'); cv.width = w; cv.height = hh; var c = cv.getContext('2d'); c.imageSmoothingEnabled = false; return cv; }
  GM.mk = mk;
  function R(c, x, y, w, hh, col) { if (col) c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(hh)); }
  GM.R = R;
  GM.px = function (c, x, y, col) { R(c, x, y, 1, 1, col); };
  GM.disc = function (c, cx, cy, r, col) { c.fillStyle = col; for (var y = -r; y <= r; y++) { var w = Math.round(Math.sqrt(r * r - y * y + r * 0.6)); c.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1); } };
  GM.ell = function (c, cx, cy, rx, ry, col) { c.fillStyle = col; for (var y = -ry; y <= ry; y++) { var w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry + 0.01)))); c.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1); } };
  GM.line = function (c, x0, y0, x1, y1, col) { var n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1; c.fillStyle = col; for (var i = 0; i <= n; i++) c.fillRect(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), 1, 1); };
  // a sprite from rows of palette letters ('.' = clear), cached; outline: a 1px ink edge all round (the crisp handheld look)
  var SPR = {};
  GM.spr = function (key, rows, outline, scale) {
    var k = key + (outline ? '|o' : '') + (scale || 1); if (SPR[k]) return SPR[k];
    var s = scale || 1, w = 0; rows.forEach(function (r) { w = Math.max(w, r.length); });
    var pad = outline ? 1 : 0, cv = mk(w * s + pad * 2, rows.length * s + pad * 2), c = cv.getContext('2d');
    rows.forEach(function (r, y) { for (var x = 0; x < r.length; x++) { var ch = r.charAt(x); if (ch !== '.' && ch !== ' ') R(c, pad + x * s, pad + y * s, s, s, PAL[ch] || ch); } });
    if (outline) {
      var d = c.getImageData(0, 0, cv.width, cv.height).data, o = mk(cv.width, cv.height), oc = o.getContext('2d'); oc.fillStyle = P.ink;
      for (var y = 0; y < cv.height; y++) for (var x = 0; x < cv.width; x++) {
        if (d[(y * cv.width + x) * 4 + 3]) continue;
        var near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(function (q) { var xx = x + q[0], yy = y + q[1]; return xx >= 0 && yy >= 0 && xx < cv.width && yy < cv.height && d[(yy * cv.width + xx) * 4 + 3]; });
        if (near) oc.fillRect(x, y, 1, 1);
      }
      oc.drawImage(cv, 0, 0); cv = o;
    }
    return (SPR[k] = cv);
  };
  GM.flipX = function (cv) { if (cv.__fx) return cv.__fx; var o = mk(cv.width, cv.height), c = o.getContext('2d'); c.translate(cv.width, 0); c.scale(-1, 1); c.drawImage(cv, 0, 0); return (cv.__fx = o); };
  GM.tint = function (cv, col) { var t = mk(cv.width, cv.height), c = t.getContext('2d'); c.drawImage(cv, 0, 0); c.globalCompositeOperation = 'source-atop'; R(c, 0, 0, t.width, t.height, col); return t; };
  // text: 'Pixel' (blocky caps) for titles, 'Term' for the rest; always with an ink edge so it reads on anything
  GM.text = function (c, s, x, y, col, size, al, font) {
    s = String(s); c.font = (size || 8) + 'px ' + (font === 'pixel' ? 'Pixel' : 'Term') + ', ui-monospace, monospace'; c.textAlign = al || 'left'; c.textBaseline = 'top';
    if (col !== P.ink) { c.fillStyle = P.ink; [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]].forEach(function (q) { c.fillText(s, Math.round(x) + q[0], Math.round(y) + q[1]); }); } // dark text on a light box needs no edge
    c.fillStyle = col || P.white; c.fillText(s, Math.round(x), Math.round(y));
  };
  GM.heart = function (c, x, y, col) { var sp = GM.spr('heart' + col, ['.rr.rr.', 'rPrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'].map(function (r) { return col ? r.replace(/[rP]/g, col === 'off' ? 'S' : 'r') : r; }), true); c.drawImage(sp, Math.round(x), Math.round(y)); };
  GM.rnd = function (a, b) { return a + Math.random() * (b - a); };
  GM.pick = function (l) { return l[Math.floor(Math.random() * l.length)]; };
  GM.clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  // Aiu, as he looks right now (the creature sprite)
  GM.aiu = function () {
    var a = app(), sc = a.sceneState(), form = sc.skin || sc.form; if (!form || !sc.stage) return null;
    return { cr: A.creature(form.seed, form.stage, sc.soul), name: a.S.totemName, soul: sc.soul, accent: sc.accent || P.red };
  };
  GM.drawAiu = function (c, me, x, y, s, frame, flip, rot) { // x,y = his feet
    if (!me) return; var cr = me.cr, fr = cr.frames[frame || 'open'] || cr.frames.open; s = s || 1;
    c.save(); c.translate(Math.round(x), Math.round(y)); if (rot) c.rotate(rot); if (flip) c.scale(-1, 1);
    c.drawImage(fr, Math.round(-fr.width / 2 * s), Math.round(-(cr.bottom + 1) * s), Math.round(fr.width * s), Math.round(fr.height * s)); c.restore();
  };

  /* ---------- sound: a tiny synth (the sound switch turns it off) ---------- */
  var ac = null, noiseBuf = null;
  GM.sfx = function (k) {
    var a = app(); if (a.dev.mute) return;
    try {
      if (!ac) { var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; ac = new AC(); }
      if (ac.state === 'suspended') ac.resume();
      var t = ac.currentTime;
      var tone = function (type, f0, f1, st, d, v) { var o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t + st); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + st + d); g.gain.setValueAtTime(v, t + st); g.gain.exponentialRampToValueAtTime(0.001, t + st + d); o.connect(g); g.connect(ac.destination); o.start(t + st); o.stop(t + st + d + 0.02); };
      var noise = function (st, d, v, hp) { if (!noiseBuf) { noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.4, ac.sampleRate); var ch = noiseBuf.getChannelData(0); for (var i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; } var s = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter(); s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = hp || 800; g.gain.setValueAtTime(v, t + st); g.gain.exponentialRampToValueAtTime(0.001, t + st + d); s.connect(f); f.connect(g); g.connect(ac.destination); s.start(t + st); s.stop(t + st + d + 0.02); };
      var S = {
        slice: function () { noise(0, 0.09, 0.25, 2500); tone('triangle', 700, 1400, 0, 0.07, 0.05); },
        swoosh: function () { noise(0, 0.06, 0.06, 4000); },
        boom: function () { noise(0, 0.4, 0.5, 100); tone('square', 120, 40, 0, 0.35, 0.12); },
        miss: function () { tone('square', 300, 150, 0, 0.18, 0.06); },
        hit: function () { noise(0, 0.08, 0.35, 300); tone('square', 200, 80, 0, 0.1, 0.1); },
        bighit: function () { noise(0, 0.16, 0.5, 200); tone('square', 160, 50, 0, 0.18, 0.14); tone('square', 900, 300, 0, 0.08, 0.05); },
        block: function () { tone('square', 900, 700, 0, 0.05, 0.07); noise(0, 0.04, 0.15, 3000); },
        great: function () { tone('square', 880, 880, 0, 0.06, 0.06); tone('square', 1320, 1320, 0.07, 0.1, 0.06); },
        coin: function () { tone('square', 988, 988, 0, 0.05, 0.06); tone('square', 1319, 1319, 0.05, 0.12, 0.06); },
        tick: function () { tone('square', 1200, 1200, 0, 0.03, 0.04); },
        toss: function () { tone('triangle', 400, 900, 0, 0.12, 0.06); },
        thud: function () { noise(0, 0.07, 0.3, 200); tone('sine', 140, 70, 0, 0.1, 0.12); },
        spark: function () { noise(0, 0.12, 0.3, 3000); tone('sawtooth', 1800, 400, 0, 0.12, 0.05); },
        zap: function () { tone('sawtooth', 220, 880, 0, 0.1, 0.05); },
        drip: function () { tone('sine', 1400, 600, 0, 0.07, 0.08); },
        pop: function () { tone('square', 600, 1200, 0, 0.05, 0.05); },
        honk: function () { tone('square', 330, 330, 0, 0.12, 0.06); tone('square', 415, 415, 0.0, 0.12, 0.04); },
        roll: function () { tone('square', 500 + Math.random() * 500, 500, 0, 0.04, 0.04); },
        win: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone('square', f, f, i * 0.11, 0.12, 0.06); }); },
        lose: function () { [392, 330, 262].forEach(function (f, i) { tone('triangle', f, f * 0.98, i * 0.16, 0.18, 0.08); }); },
        level: function () { [659, 784, 988].forEach(function (f, i) { tone('square', f, f, i * 0.08, 0.1, 0.05); }); }
      };
      if (S[k]) S[k]();
    } catch (e) {}
  };

  /* ---------- today's scores (the same rule core.js uses, to tell you what a win is worth) ---------- */
  function today() { return U.dayStr(new Date(app().trueNow())); }
  function gday() { var L = app().local, d = today(); if (!L.gDay || L.gDay.d !== d) L.gDay = { d: d, s: {}, b: {} }; return L.gDay; }
  function bests() { var a = app(), B = Object.assign({}, a.local.gBest || {}); Object.keys(a.S.gbest || {}).forEach(function (k) { B[k] = Math.max(B[k] || 0, a.S.gbest[k]); }); return B; }
  GM.best = function (id) { return bests()[id] || 0; };
  /* 2.5.0: a play session starts easy and warms up. Each game you finish makes the next one a little faster (a loss
     eases it back a bit); 20 minutes away and it starts easy again. Pace 0.75 (warm-up) up to 1.15 (full speed). */
  var SESS = { n: 0, last: 0 };
  GM.heat = function () { if (Date.now() - SESS.last > 20 * 60000) SESS.n = 0; return Math.max(0, Math.min(1, SESS.n / 6)); };
  GM.pace = function () { return 0.75 + 0.4 * GM.heat(); };
  GM.paceName = function () { var x = GM.heat(); return x < 0.2 ? 'Warm-up' : x < 0.5 ? 'Getting going' : x < 0.85 ? 'Getting tough' : 'Full speed'; };
  function heatAfter(won) { GM.heat(); SESS.n = Math.max(0, SESS.n + (won ? 1 : -0.5)); SESS.last = Date.now(); }
  GM._sess = SESS; // (for the tests)
  function settle(def, won, score, stars) { // -> lines for the end card
    var a = app(), out = [], gd = gday(), B = bests(), x2 = AIU.life && AIU.life.x2();
    if (score > (B[def.id] || 0)) { a.local.gBest = a.local.gBest || {}; a.local.gBest[def.id] = score; if (!won) a.addEvents([{ type: 'game', data: { g: def.id, win: false, score: score } }], true); out.push('New best!'); }
    if (!won) { a.saveLocal(); return out; }
    var prev = gd.s[def.id], pts = 0;
    if (prev === undefined) { pts = 3; gd.s[def.id] = score; }
    else if (score > prev && (gd.b[def.id] || 0) < 2) { pts = 1; gd.s[def.id] = score; gd.b[def.id] = (gd.b[def.id] || 0) + 1; }
    a.saveLocal();
    a.addEvents([{ type: 'game', data: { g: def.id, win: true, score: score, stars: stars || 1 } }], true); // 2.7.0: the stars pay tokens
    if (AIU.life) AIU.life.joy('game');
    var tk = (stars || 1) * 2; // 2.7.0: 2 tokens a star (up to 30 a day from games), on top of the growth
    out.unshift('+' + tk + ' tokens for ' + (stars || 1) + ' star' + ((stars || 1) === 1 ? '' : 's') + '.');
    if (pts === 3) out.push(a.S.totemName + ' grows +3.');
    else if (pts === 1) out.push('You beat today\'s score: +1 growth.');
    else out.push('Beat ' + prev + ' to grow ' + a.S.totemName + ' again today. Or roll for a new game!');
    return out;
  }

  /* ---------- the screen: one overlay, a 180x240 canvas, big buttons below ---------- */
  var cur = null;
  function stage() {
    if (cur) cur.close();
    var ov = h('div', { cls: 'gov arc', role: 'dialog', 'aria-label': 'Games' });
    var title = h('b', { cls: 'gtitle', text: 'Games' });
    var G = { alive: true, t: 0, W: GW, H: GH, fx: [], pops: [], shk: 0, paused: true };
    var close = h('button', { type: 'button', cls: 'gclose', text: 'Exit', onclick: function () { G.close(); } });
    var wrap = h('div', { cls: 'gwrap' }), cv = h('canvas', { cls: 'gcv', width: GW, height: GH }), ctl = h('div', { cls: 'gctl' });
    wrap.appendChild(cv);
    ov.appendChild(h('div', { cls: 'gtop' }, title, h('span', { cls: 'ghud' }), close));
    ov.appendChild(wrap); ov.appendChild(ctl);
    document.body.appendChild(ov); document.documentElement.classList.add('gopen');
    var vp = document.querySelector('meta[name="viewport"]'), vp0 = vp ? vp.getAttribute('content') : null;
    if (vp) vp.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
    function noGesture(e) { e.preventDefault(); }
    ov.addEventListener('dblclick', noGesture); ov.addEventListener('contextmenu', noGesture); document.addEventListener('gesturestart', noGesture, { passive: false });
    var lastTap = 0; // 2.5.0: iPhone Safari zooms on a quick second tap even with zoom turned off; two taps in a row never zoom here
    ov.addEventListener('touchend', function (e) { var now = Date.now(); if (now - lastTap < 400 && !(e.target.closest && e.target.closest('.gpanel'))) e.preventDefault(); lastTap = now; }, { passive: false });
    ov.addEventListener('touchmove', function (e) { if (!(e.target.closest && e.target.closest('.gpanel'))) e.preventDefault(); }, { passive: false });
    G.c = cv.getContext('2d'); G.c.imageSmoothingEnabled = false; G.cv = cv; G.ov = ov; G.ctl = ctl; G.wrap = wrap; G.titleEl = title;
    G.fit = function () {
      var r = wrap.getBoundingClientRect(), s = Math.min(r.width / GW, r.height / GH);
      if (s >= 2) s = Math.floor(s * 2) / 2; // whole or half steps keep the pixels even
      s = Math.max(1, s); cv.style.width = Math.floor(GW * s) + 'px'; cv.style.height = Math.floor(GH * s) + 'px';
    };
    G.pt = function (e) { var r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * GW, y: (e.clientY - r.top) / r.height * GH }; };
    cv.addEventListener('pointerdown', function (e) { e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (x) {} G.held = true; if (!G.paused && G.down) G.down(G.pt(e)); else if (G.tapAny) G.tapAny(); });
    cv.addEventListener('pointermove', function (e) { if (!G.paused && G.move) G.move(G.pt(e), G.held); });
    function up(e) { G.held = false; if (!G.paused && G.up) G.up(G.pt(e)); }
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    G.buttons = function (list) { // [[label, fn, cls, holdFn]]
      ctl.innerHTML = ''; ctl.style.gridTemplateColumns = 'repeat(' + Math.max(1, list.length) + ', 1fr)';
      var out = list.map(function (b) {
        var el = h('button', { type: 'button', cls: 'gbtn ' + (b[2] || ''), text: b[0] });
        if (b[3]) { var on = function (e) { e.preventDefault(); if (!G.paused) b[3](true); el.classList.add('down'); }, off = function (e) { e.preventDefault(); b[3](false); el.classList.remove('down'); }; el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('pointerleave', off); }
        else el.addEventListener('pointerdown', function (e) { e.preventDefault(); if (!el.disabled && !G.paused) b[1](); });
        el.addEventListener('click', function (e) { if (e.detail === 0 && b[1] && !G.paused) b[1](); });
        ctl.appendChild(el); return el;
      });
      setTimeout(G.fit, 0); return out;
    };
    G.panel = function (title2, kids, btns) {
      G.unpanel();
      var p = h('div', { cls: 'gpanel', role: 'alert' }, h('h3', { text: title2 }), kids, h('div', { cls: 'grow' }, btns.map(function (b) { return h('button', { type: 'button', cls: 'gbtn ' + (b[2] || ''), text: b[0], onclick: b[1] }); })));
      wrap.appendChild(p); G.pan = p; var f0 = p.querySelector('button.primary') || p.querySelector('button'); if (f0) setTimeout(function () { try { f0.focus({ preventScroll: true }); } catch (e) {} }, 50);
    };
    G.unpanel = function () { if (G.pan) { G.pan.remove(); G.pan = null; } };
    // juice: shake, bursts of pixels, floating words
    G.shake = function (n) { G.shk = Math.max(G.shk, n || 3); try { if (n >= 4 && navigator.vibrate) navigator.vibrate(20); } catch (e) {} };
    G.burst = function (x, y, cols, n, sp) { for (var i = 0; i < (n || 10); i++) { var an = Math.random() * Math.PI * 2, v = (sp || 40) * (0.4 + Math.random()); G.fx.push({ x: x, y: y, vx: Math.cos(an) * v, vy: Math.sin(an) * v - 20, life: 0.5 + Math.random() * 0.4, t: 0, col: Array.isArray(cols) ? GM.pick(cols) : cols || P.yellow }); } };
    G.pop = function (x, y, s, col) { G.pops.push({ x: x, y: y, s: s, col: col || P.yellow, t: 0 }); };
    G.sfx = GM.sfx;
    var last = 0, raf = 0;
    function loop(ts) {
      if (!G.alive) return; raf = requestAnimationFrame(loop);
      if (document.hidden) { last = 0; return; }
      var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0; last = ts; G.t += dt;
      if (!G.paused && G.update) G.update(dt * (G.speed || 1)); // 2.5.0: the session's pace (slow at first)
      if (G.tick) G.tick(dt);
      var c = G.c; c.setTransform(1, 0, 0, 1, 0, 0);
      if (G.shk > 0.2) { c.translate(Math.round((Math.random() - 0.5) * G.shk * 2), Math.round((Math.random() - 0.5) * G.shk * 2)); G.shk *= Math.pow(0.02, dt); } else G.shk = 0;
      if (G.draw) G.draw(c);
      G.fx = G.fx.filter(function (p) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 120 * dt; if (p.t < p.life) R(c, p.x, p.y, p.t < p.life * 0.5 ? 2 : 1, p.t < p.life * 0.5 ? 2 : 1, p.col); return p.t < p.life; });
      G.pops = G.pops.filter(function (p) { p.t += dt; GM.text(c, p.s, p.x, p.y - p.t * 22, p.col, 8, 'center', 'pixel'); return p.t < 0.8; });
      if (G.hud) G.hud(c);
      if (G.over) G.over(c, dt);
    }
    function onKey(e) { if (e.key === 'Escape') { G.close(); return; } if (!G.paused && G.key && G.key(e.key, e.type === 'keydown', e)) e.preventDefault(); }
    window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey); window.addEventListener('resize', G.fit);
    var ro = window.ResizeObserver ? new ResizeObserver(function () { G.fit(); }) : null; if (ro) ro.observe(wrap);
    G.close = function () {
      if (!G.alive) return; G.alive = false; cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); window.removeEventListener('resize', G.fit);
      if (ro) ro.disconnect(); ov.remove(); document.documentElement.classList.remove('gopen'); if (cur === G) cur = null;
      if (vp && vp0) vp.setAttribute('content', vp0); document.removeEventListener('gesturestart', noGesture);
      try { app().setMode('hop', 700); } catch (e) {}
    };
    G.fit(); raf = requestAnimationFrame(loop); cur = G;
    return G;
  }

  /* ---------- running one game: how-to, 3 levels, the end card ---------- */
  function hudBar(G, def) {
    return function (c) {
      R(c, 0, 0, GW, 13, 'rgba(26,28,44,.82)'); R(c, 0, 13, GW, 1, P.ink);
      GM.text(c, String(G.score || 0), 4, 2, P.yellow, 10);
      for (var i = 0; i < 3; i++) R(c, 70 + i * 8, 4, 5, 5, i < G.level ? P.lime : P.dark); // level dots
      if (G.maxHearts) for (var j = 0; j < G.maxHearts; j++) GM.heart(c, GW - 10 - j * 9, 3, j < G.hearts ? null : 'off');
      if (G.timeMax) { var k = Math.max(0, G.timeLeft / G.timeMax); R(c, 0, 14, GW, 2, P.dark); R(c, 0, 14, GW * k, 2, k < 0.25 && G.t % 0.4 < 0.2 ? P.red : P.cyan); }
    };
  }
  function play(def, G) {
    G = G || stage();
    G.def = def; G.titleEl.textContent = def.name; G.score = 0; G.level = 0; G.maxHearts = def.hearts === undefined ? 3 : def.hearts; G.stats = {};
    G.speed = GM.pace(); if (G.maxHearts && GM.heat() < 0.2) G.maxHearts++; G.hearts = G.maxHearts; G.timeMax = 0; // 2.5.0: warm-up games are slower, with a spare heart
    G.me = GM.aiu(); G.update = G.draw = G.down = G.move = G.up = G.key = G.tapAny = null; G.over = null; G.fx = []; G.pops = []; G.paused = true; G.buttons([]); G.unpanel();
    G.hud = hudBar(G, def);
    G.hurt = function (why) { if (G.paused) return; G.hearts--; G.shake(5); GM.sfx('hit'); if (G.hearts <= 0) G.fail(why); };
    G.clear = function () { if (G.paused) return; G.paused = true; GM.sfx('level'); G.burst(GW / 2, GH / 2, [P.yellow, P.white, P.lime], 26, 70); banner(G.level >= 3 ? 'ALL CLEAR!' : 'CLEAR!', 900, function () { if (G.level >= 3) end(true); else level(G.level + 1); }); };
    G.fail = function (why) { if (!G.alive || G.done) return; G.paused = true; G.why = why; GM.sfx('lose'); G.shake(6); banner(why ? 'OOPS!' : 'TIME!', 900, function () { end(false); }); };
    function banner(s, ms, next) {
      var t0 = G.t; G.over = function (c) { var k = (G.t - t0) / (ms / 1000); if (k >= 1) { G.over = null; next(); return; } var y = GH / 2 - 14 + Math.round(Math.max(0, 0.25 - k) * 60); R(c, 0, y - 6, GW, 30, 'rgba(26,28,44,.8)'); GM.text(c, s, GW / 2, y, P.yellow, 16, 'center', 'pixel'); };
    }
    G.banner = banner;
    function level(n) {
      G.level = n; G.paused = true; G.timeMax = 0; G.fx = [];
      def.level(G, n);
      banner('LEVEL ' + n, 800, function () { banner('GO!', 450, function () { G.paused = false; }); GM.sfx('tick'); });
    }
    function end(won) {
      G.done = true; G.paused = true;
      var stars = won ? Math.max(1, Math.min(3, def.stars ? def.stars(G) : G.hearts)) : 0, me = app();
      if (won) { GM.sfx('win'); try { me.setMode('hop', 900); } catch (e) {} }
      heatAfter(won);
      var lines = settle(def, won, G.score || 0, stars);
      lines.push('Next game: ' + GM.paceName().toLowerCase() + (won ? (GM.heat() < 1 ? '. Each game you finish speeds things up a little.' : '. As fast as it goes!') : '. A miss eases things back a little.'));
      var st = h('div', { cls: 'gstars', 'aria-label': stars + ' of 3 stars' }, [0, 1, 2].map(function (i) { var s0 = AIU.ui.pix('star'); if (i >= stars) s0.classList.add('off'); return s0; }));
      G.panel(won ? 'You win!' : 'So close!', [won ? st : null, h('p', { cls: 'gscore', text: 'Score ' + (G.score || 0) + ' · Best ' + Math.max(GM.best(def.id), G.score || 0) }),
        !won && G.why ? h('p', { text: G.why }) : null].concat(lines.map(function (l) { return h('p', { text: l }); }), [h('p', { cls: 'gtip', text: 'Remember: ' + def.tip })]),
        [['Again', function () { play(def, G); }, 'primary'], ['New roll', function () { roll(def.id, G); }], ['Exit', function () { G.close(); }]]);
    }
    var seen = app().local.gHow || (app().local.gHow = {});
    function go() { G.unpanel(); G.done = false; level(1); }
    if (!seen[def.id]) {
      seen[def.id] = 1; app().saveLocal();
      def.level(G, 1); // the first level shows behind the how-to
      G.panel(def.name, [GM.iconEl(def.id, 6), h('p', { cls: 'ghow', text: def.how })], [['Let\'s go!', go, 'primary']]);
    } else go();
    return G;
  }
  GM.cur = function () { return cur; }; // (for the tests)
  GM.play = function (id) { var d = GM.byId(id); if (d) play(d); };

  /* ---------- the dice: the icons spin and land on one game ---------- */
  function roll(except, G0) {
    var list = GM.LIST.slice(); if (!list.length) return;
    var pool = list.filter(function (g) { return g.id !== except && g.id !== app().local.gLast; }); if (!pool.length) pool = list;
    pool = pool.concat(pool.filter(function (g) { return g.fav; })); // 2.5.0: favorites (Spar) come up twice as often
    var pickD = GM.pick(pool), G = G0 || stage();
    G.unpanel(); G.buttons([]); G.titleEl.textContent = 'Roll!'; G.update = G.down = G.move = G.up = G.key = null; G.hud = null; G.paused = true; G.over = null;
    app().local.gLast = pickD.id; app().saveLocal();
    var t0 = G.t, DUR = 1.7, idx = list.indexOf(pickD), spins = 3 * list.length + idx, lastI = -1, landed = false;
    G.draw = function (c) {
      var k = Math.min(1, (G.t - t0) / DUR), e = 1 - Math.pow(1 - k, 3), pos = e * spins, i = Math.floor(pos) % list.length;
      R(c, 0, 0, GW, GH, P.navy); for (var y = 0; y < GH; y += 8) R(c, 0, y, GW, 4, '#2f3f86');
      GM.text(c, 'ROLL THE DICE!', GW / 2, 22, P.yellow, 8, 'center', 'pixel');
      // the reel: three icons, the middle one is the pick
      [-1, 0, 1].forEach(function (d) { var g = list[(i + d + list.length) % list.length], fr = pos - Math.floor(pos), yy = 108 + (d - fr) * 46; c.globalAlpha = d === 0 ? 1 : 0.45; c.drawImage(GM.iconCv(g.id), GW / 2 - 24, Math.round(yy - 24), 48, 48); c.globalAlpha = 1; });
      R(c, GW / 2 - 30, 78, 60, 3, P.yellow); R(c, GW / 2 - 30, 134, 60, 3, P.yellow);
      if (i !== lastI) { lastI = i; if (k < 1) GM.sfx('roll'); }
      if (k >= 1) { GM.text(c, pickD.name.toUpperCase(), GW / 2, 152, P.white, 16, 'center', 'pixel'); if (!landed) { landed = true; GM.sfx('great'); G.burst(GW / 2, 108, [P.yellow, P.white, P.pink], 24, 60); setTimeout(function () { if (G.alive) play(pickD, G); }, 900); } }
    };
  }
  GM.roll = function () { var a = app(); if (!a.S || !a.S.hatched) { AIU.ui.k.snack('Hatch your egg first.'); return; } roll(null); };
  GM.hub = GM.roll; // old callers (the computer inside, the screen-reader button): the dice too

  /* ---------- icons (24x24, drawn by each game) ---------- */
  var ICO = {};
  GM.iconCv = function (id) { if (ICO[id]) return ICO[id]; var cv = mk(24, 24), c = cv.getContext('2d'), d = GM.byId(id); R(c, 0, 0, 24, 24, P.ink); R(c, 1, 1, 22, 22, P.dark); if (d && d.icon) d.icon(c); return (ICO[id] = cv); };
  GM.iconEl = function (id, s) { var cv = mk(24 * (s || 3), 24 * (s || 3)), c = cv.getContext('2d'); c.imageSmoothingEnabled = false; c.drawImage(GM.iconCv(id), 0, 0, cv.width, cv.height); cv.className = 'gicon big'; return cv; };
})();
