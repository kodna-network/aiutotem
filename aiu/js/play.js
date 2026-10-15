/* AIU TOTEM 2.1.7 - Play: you look after the pet and play with Aiu yourself, right in the world.
   Snack: a treat flies in and the pet catches it and munches. Keep feeding: its tummy fills, and once it's full it does a
   trick instead (jump, spin, roll over, dance) or takes a nap. Water: drops splash into its bowl and it laps them up.
   Tap the pet to pet it; rub it (drag back and forth) and it purrs. Tap Aiu: a different trick each time. Rub Aiu: he wiggles.
   Just for fun: nothing here earns points (petting Aiu still counts toward the small daily petting growth, as before).
   The tummy and water levels are kept on this device only and slowly empty again over a few hours. */
(function () {
  'use strict';
  var U = AIU.util, A = AIU.art, K = A.kit, P = A.P, h = U.h;
  var PL = AIU.play = {};
  function app() { return AIU.app; }
  var fx = [], bAct = null, lastPet = 0, petRun = 0, lastTrick = '';
  var RATE = { tummy: 14, water: 18 }; // emptying, per hour

  /* ---------- levels (this device) ---------- */
  function st() {
    var L = app().local, s = L.play || (L.play = { tummy: 40, water: 40, t: Date.now() }), now = Date.now(), hrs = Math.max(0, now - (s.t || now)) / 3600000;
    if (hrs > 0.01) { s.tummy = Math.max(0, s.tummy - RATE.tummy * hrs); s.water = Math.max(0, s.water - RATE.water * hrs); s.t = now; }
    return s;
  }
  function save() { try { app().saveLocal(); } catch (e) {} if (PL.onChange) PL.onChange(); }
  PL.levels = function () { var s = st(); return { tummy: Math.round(s.tummy), water: Math.round(s.water) }; };

  /* ---------- the pet's moves ---------- */
  var DUR = { munch: 900, drink: 1100, happy: 450, jump: 750, spin: 800, roll: 1500, dance: 1300, purr: 400, nap: 4200 };
  // 2.1.8: one thing at a time. A move plays to the end before the next one starts (eating more just keeps it eating).
  var SOFT = { purr: 1, happy: 1 };
  function act(a, ms) {
    var now = Date.now(), cur = bAct && now < bAct.until ? bAct : null;
    if (cur && cur.a === a && (a === 'munch' || a === 'drink' || a === 'purr')) { cur.until = Math.max(cur.until, now + (ms || DUR[a])); return true; }
    if (cur && !SOFT[cur.a]) return false; // busy: let it finish
    bAct = { a: a, start: now, until: now + (ms || DUR[a]) }; return true;
  }
  PL.buddyState = function () {
    if (!bAct) return null; var now = Date.now();
    if (now > bAct.until) { bAct = null; return null; }
    return { a: bAct.a, e: now - bAct.start, p: Math.min(1, (now - bAct.start) / Math.max(1, bAct.until - bAct.start)) };
  };
  function trick() { var l = ['jump', 'spin', 'roll', 'dance'].filter(function (x) { return x !== lastTrick; }), t = l[Math.floor(Math.random() * l.length)]; lastTrick = t; act(t); app().beep('chirp'); return t; }
  function head() { var hd = A.buddyHead; return hd ? { x: hd.x, y: hd.y + 4 } : { x: A.BUDDY_OUT.x + 22, y: A.BUDDY_OUT.fy - 18 }; }
  function kind() { var S = app().S; return A.buddyOf(S.accentSeed, AIU.core.setting(S, 'buddy', 'auto')); }
  function busy() { return !!(bAct && Date.now() < bAct.until && !SOFT[bAct.a] && bAct.a !== 'munch' && bAct.a !== 'drink'); }
  function outside() { var v = app().view && app().view.sc; return !!(v && !v.indoor && (!v.place || v.place === 'home') && v.stage); }
  PL.outside = outside;

  /* ---------- snacks, water, pets ---------- */
  var TREAT = { horse: 'carrot', dog: 'bone', cat: 'fish', penguin: 'fish', eagle: 'fish', parrot: 'seed', beardog: 'berry', ghost: 'star', conjure: 'star' };
  PL.snack = function () {
    if (!outside()) return false;
    var hd = head(), b = kind(), sx = hd.x + 34 + Math.random() * 10;
    fx.push({ k: 'treat', s: TREAT[b] || 'bone', x0: sx, y0: 112, x1: hd.x + 1, y1: hd.y, t0: Date.now(), dur: 650, arc: 22 + Math.random() * 8, done: land });
    app().beep('toss');
    function land(o) {
      var s = st();
      if (s.tummy >= 100 || busy()) { // full: a trick instead, and the treat bounces off
        fx.push({ k: 'bounce', s: o.s, x: o.x1, y: o.y1, vx: 18 + Math.random() * 10, vy: -40, t0: Date.now(), life: 900 });
        if (!busy()) { if (Math.random() < 0.25) act('nap'); else trick(); }
        PL.lastFull = Date.now(); save(); return;
      }
      s.tummy = Math.min(100, s.tummy + 20); act('munch'); app().beep('munch'); if (AIU.life) AIU.life.joy('snack');
      for (var i = 0; i < 4; i++) fx.push({ k: 'crumb', x: o.x1, y: o.y1 + 2, vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 20, t0: Date.now(), life: 600, c: o.s === 'carrot' ? P.orange : o.s === 'berry' ? P.plum : o.s === 'fish' ? P.silver : P.sand });
      if (s.tummy >= 100) setTimeout(function () { hearts(4); }, 700);
      save();
    }
    return true;
  };
  PL.water = function () {
    if (!outside()) return false;
    var hd = head(), b = kind(), bowl = { x: hd.x + (A.POSTED[b] ? 0 : 3), y: A.POSTED[b] ? hd.y + 2 : A.BUDDY_OUT.fy - 2 };
    PL.bowlUntil = Date.now() + 60000;
    for (var i = 0; i < 5; i++) fx.push({ k: 'drop', x0: bowl.x + 30 + i * 2, y0: 112 + i * 3, x1: bowl.x + (i % 3) - 1, y1: bowl.y, t0: Date.now() + i * 70, dur: 520, arc: 16, done: i === 4 ? sip : null });
    app().beep('splash');
    function sip() {
      var s = st();
      if (s.water >= 100 || busy()) { for (var j = 0; j < 6; j++) fx.push({ k: 'crumb', x: bowl.x, y: bowl.y, vx: (Math.random() - 0.5) * 50, vy: -30 - Math.random() * 30, t0: Date.now(), life: 700, c: P.sky }); if (!busy()) trick(); PL.lastFull = Date.now(); save(); return; }
      s.water = Math.min(100, s.water + 25); act('drink'); app().beep('slurp'); save(); if (AIU.life) AIU.life.joy('water');
    }
    return true;
  };
  function hearts(n, at) { var p = at || head(); for (var i = 0; i < (n || 2); i++) fx.push({ k: 'heart', x: p.x - 4 + i * 4 + Math.random() * 3, y: p.y - 6, vx: (Math.random() - 0.5) * 6, vy: -16 - Math.random() * 8, t0: Date.now() + i * 90, life: 1100 }); }
  PL.hearts = hearts;
  PL.pet = function () { // a tap on the pet
    if (!outside()) return;
    var now = Date.now(); petRun = now - lastPet < 2500 ? petRun + 1 : 1; lastPet = now;
    hearts(2); app().beep('chirp');
    if (petRun % 5 === 0 && !busy()) trick(); else if (!busy()) act('happy');
  };
  PL.rub = function () { if (!outside()) return; if (!busy()) act('purr', 450); var now = Date.now(); if (now - (PL._rh || 0) > 220) { PL._rh = now; hearts(1); if (now - (PL._rs || 0) > 700) { PL._rs = now; app().beep('purr'); } } };
  // Aiu: a different trick each tap (yawns when he's worn out)
  var AIU_TRICKS = [['hop', 900], ['spin', 1000], ['jump', 900], ['dance', 1500]], lastA = '';
  PL.aiuTrick = function () {
    var a = app(), tired = AIU.vitals && AIU.vitals.distressed(a.S);
    if (tired) { if (!(a.mode === 'yawn' && Date.now() < a.modeUntil)) a.setMode('yawn', 1400); return 'yawn'; }
    if (a.casting || (a.mode && Date.now() < a.modeUntil && a.mode !== 'wiggle')) return 'busy'; // 2.1.8: still doing the last one (or tossing the I Ching coins): let it finish
    var l = AIU_TRICKS.filter(function (x) { return x[0] !== lastA; }), t = l[Math.floor(Math.random() * l.length)]; lastA = t[0];
    a.setMode(t[0], t[1]); return t[0];
  };
  // 2.1.15: rubbing Aiu is a back rub while he works: hearts and happy eyes, no wiggle that stops his activity
  PL.aiuRub = function () { var a = app(), now = Date.now(); a.patAt = now; if (now - (PL._ah || 0) > 260) { PL._ah = now; var p = A.actorPos(a.view && a.view.sc || {}); hearts(1, { x: p.x, y: p.y - 22 }); } };
  PL.active = function () { return fx.length > 0 || !!bAct; };
  // 2.2.0: Aiu gives the pet the care you just gave yourself (app.careBuddy): the pet reacts, and its tummy and bowl fill
  PL.careAct = function (kind, dur) {
    var s = st();
    if (kind === 'feed') { s.tummy = Math.min(100, s.tummy + 25); setTimeout(function () { act('munch', Math.max(900, dur - 2400)); app().beep('munch'); }, 1200); }
    else if (kind === 'water') { s.water = Math.min(100, s.water + 30); PL.bowlUntil = Date.now() + dur + 20000; setTimeout(function () { act('drink', Math.max(1000, dur - 2200)); app().beep('slurp'); }, 1400); }
    else if (kind === 'hug') { act('happy', 800); setTimeout(function () { hearts(3); act('purr', Math.max(600, dur - 1800)); }, 900); }
    else if (kind === 'brush') { setTimeout(function () { act('purr', Math.max(800, dur - 1200)); }, 700); }
    else if (kind === 'read') { setTimeout(function () { act('happy', 900); }, Math.max(500, dur - 1500)); }
    else if (kind === 'tuck') { setTimeout(function () { act('nap', Math.max(1500, dur - 1000)); }, 800); }
    save();
  };

  /* ---------- drawing (world coordinates, on top of the world) ---------- */
  function treatPic(c, s, x, y) {
    x = Math.round(x); y = Math.round(y);
    if (s === 'bone') { K.R(c, x - 2, y, 5, 1, P.white); K.px(c, x - 3, y - 1, P.white); K.px(c, x - 3, y + 1, P.white); K.px(c, x + 3, y - 1, P.white); K.px(c, x + 3, y + 1, P.white); }
    else if (s === 'carrot') { K.R(c, x - 2, y, 4, 2, P.orange); K.px(c, x + 2, y, P.orange); K.px(c, x - 3, y - 1, P.green); K.px(c, x - 3, y + 1, P.green); }
    else if (s === 'fish') { K.R(c, x - 2, y, 4, 2, P.silver); K.px(c, x + 2, y - 1, P.silver); K.px(c, x + 2, y + 2, P.silver); K.px(c, x - 1, y, P.ink); }
    else if (s === 'seed') { K.R(c, x - 1, y, 2, 2, P.sand); K.px(c, x + 1, y + 1, P.bark); K.R(c, x + 2, y - 1, 2, 2, P.sand); }
    else if (s === 'berry') { K.R(c, x - 2, y, 2, 2, P.plum); K.R(c, x, y + 1, 2, 2, P.blue); K.px(c, x - 1, y - 1, P.green); }
    else { K.px(c, x, y - 2, P.yellow); K.R(c, x - 1, y - 1, 3, 3, P.yellow); K.px(c, x - 2, y, P.yellow); K.px(c, x + 2, y, P.yellow); K.px(c, x, y + 2, P.yellow); K.px(c, x, y, P.white); }
  }
  function heartPic(c, x, y) { K.spr(c, Math.round(x) - 2, Math.round(y), ['r.r', 'rrr', '.r.']); }
  PL.draw = function (c, sc) {
    if (!sc || sc.indoor || (sc.place && sc.place !== 'home')) { fx.length = 0; return; }
    var now = Date.now(), b = kind();
    if (PL.bowlUntil > now && !A.POSTED[b] && b !== 'ghost' && b !== 'conjure') { var hd = head(), bx = Math.round(hd.x + 3), fy = A.BUDDY_OUT.fy, w = st().water; K.R(c, bx - 4, fy - 3, 9, 3, P.ink); K.R(c, bx - 3, fy - 3, 7, 2, P.blue); if (w > 5) K.R(c, bx - 2, fy - 3, 5, 1, P.sky); }
    for (var i = fx.length - 1; i >= 0; i--) {
      var o = fx[i], t = now - o.t0;
      if (t < 0) continue;
      if (o.dur) { // a thrown thing on an arc
        var p = Math.min(1, t / o.dur), x = o.x0 + (o.x1 - o.x0) * p, y = o.y0 + (o.y1 - o.y0) * p - Math.sin(p * Math.PI) * o.arc;
        if (o.k === 'drop') { K.R(c, Math.round(x), Math.round(y), 1, 2, P.sky); K.px(c, Math.round(x), Math.round(y) - 1, P.cyan); } else treatPic(c, o.s, x, y);
        if (p >= 1) { fx.splice(i, 1); if (o.done) o.done(o); }
        continue;
      }
      var q = t / 1000; if (t > o.life) { fx.splice(i, 1); continue; }
      var xx = o.x + o.vx * q, yy = o.y + o.vy * q + (o.k === 'heart' ? 0 : 60 * q * q);
      if (o.k === 'heart') heartPic(c, xx, yy); else if (o.k === 'bounce') treatPic(c, o.s, xx, Math.min(A.BUDDY_OUT.fy - 1, yy + 40 * q * q)); else K.px(c, Math.round(xx), Math.round(yy), o.c || P.sand);
    }
  };
})();
