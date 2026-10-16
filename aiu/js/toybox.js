/* AIU TOTEM 2.3.0 - the toy box: playing with the property with your finger.
   Tap   - does the usual thing: pat Aiu, pet the pet, open the bounty board or the drone, or send Aiu to a building
           (he walks there and you go in with him).
   Hold  - about half a second on Aiu, the pet or an animal picks it up (it wiggles and lifts). Drag it anywhere.
   Drop  - Aiu on a building: he goes in. On the pet or an animal: they bonk, tumble, get up and hug. On the bounty
           board: he reads it. On the pond: splash. On the drone: a little ride. On the house roof: he slides down.
           Shake him hard while you hold him and coins fall out. Anything else just walks back to what it was doing.
   It's all just for fun: patting still counts the same as before (no extra growth from dropping things around).
   A quick drag with no hold is still a back rub on Aiu or the pet. Nothing here locks the screen: the world keeps going. */
(function () {
  'use strict';
  var U = AIU.util, A = AIU.art, P = A.P, K = A.prim, R = K.R, px = K.px, spr = K.spr, disc = K.disc, ell = K.ell, line = K.line;
  var T = AIU.toy = {};
  function app() { return AIU.app; }
  function ui() { return AIU.ui; }
  var HOLD_MS = 420;
  A.toyOver = {}; // things you've moved: where they are for now (property pixels, with when you let go)
  var held = null, anims = [];
  A.toyHide = function (who) { return !!(held && held.who === who) || anims.some(function (a) { return a.hides === who && Date.now() < a.end; }); };

  /* ---------- visits: Aiu walks to a building, you go in, and he walks back when you come out ---------- */
  var FUN = { shed: 'shed', well: 'well', outhouse: 'outhouse', barn: 'peek', greenhouse: 'peek', lab: 'peek', garage: 'peek', barracks: 'peek', cowshed: 'peek', horses: 'peek', smithy: 'peek', granary: 'peek' }; // (3.6: and the bailey's buildings) // 2.4.0: the buildings are scenery: he pops in and out (their old screens are on standby)
  var SAY = { barn: 'The animals say hi!', greenhouse: 'Mmm, smells like tomatoes.', lab: 'Beep boop. Science!', garage: 'Vroom vroom!', barracks: 'Left, right, left! Everybody\'s ready.', cowshed: 'Moooo!', horses: 'The horses nicker hello.', smithy: 'Clang, clang! The forge is hot.', granary: 'Plenty of grain for the winter.' };
  T.visit = function (id, instant) {
    var a = app(), S = a.S, PL = AIU.places; if (!S) return;
    if (!S.hatched) { ui().k.snack('Hatch your egg first. Then ' + S.totemName + ' can show you around.'); return; }
    var sc = a.view && a.view.sc;
    if (FUN[id]) return fun(id);
    if (id === 'house') {
      if (sc && sc.aiuIn) { a.peek = null; if (ui().refresh) ui().refresh(true); return; } // look back inside
      if (instant) { a.placeReq = { indoor: true, until: Date.now() + 30 * 60000 }; a.beep('door'); a.react('goin'); return; }
      return a.houseTap && a.houseTap(false);
    }
    if (!PL || !PL[id]) return;
    if (!sc || sc.aiuIn || A.isRoom(sc) || instant || a.busyNow() || a.trip) { a.visit = { id: id, phase: 'in' }; PL.open(id); return; } // 2.9.0: (and not while he's walking in or out: two walks at once made him jump) // he's busy inside: you go on your own (he's in the building picture anyway)
    a.visit = { id: id, dir: 'go', phase: 'walk', start: Date.now(), dur: 2000 };
    a.react('quest');
  };
  T.visitTick = function () {
    var a = app(), v = a.visit; if (!v) return;
    if (v.phase === 'walk' && !(v.fun && v.dir === 'go') && Date.now() - v.start >= v.dur) { // (3.1: a fun visit's own timer takes him in)
      if (v.dir === 'go') { a.visit = { id: v.id, phase: 'in' }; a.beep('door'); if (AIU.places && AIU.places[v.id]) AIU.places.open(v.id); else a.visit = null; }
      else a.visit = null;
    }
  };
  T.visitDone = function () { // the building closed: he walks back out to the field
    var a = app(), v = a.visit; if (!v || v.phase !== 'in') { a.visit = null; return; }
    var sc = a.view && a.view.sc;
    a.visit = sc && !sc.aiuIn && !A.isRoom(sc) ? { id: v.id, dir: 'back', phase: 'walk', start: Date.now(), dur: 1600 } : null;
  };
  // the little places: he walks over and does something silly there, then comes back
  function fun(id) {
    var a = app(), L = A.landmark(id); if (!L) return;
    var sc = a.view && a.view.sc; if (!sc || sc.aiuIn || A.isRoom(sc) || a.trip || a.visit) { ui().k.snack(SAY[id] || (id === 'well' ? 'The well. Splash!' : id === 'shed' ? 'The tool shed.' : 'The outhouse. Occupied? No, empty.')); return; }
    a.visit = { id: id, dir: 'go', phase: 'walk', start: Date.now(), dur: 1800, fun: true };
    var arrived = function (fn) { if (!A.CASTLE || !AIU.castle) return setTimeout(fn, 1800); var t0 = Date.now(); (function wait() { if (!a.visit || a.visit.id !== id) return; if ((Date.now() - t0 > 600 && !AIU.castle.walking()) || Date.now() - t0 > 20000) fn(); else setTimeout(wait, 150); })(); }; // 3.1: in the castle, once he's actually there
    arrived(function () {
      if (!a.visit || a.visit.id !== id) return;
      a.visit = { id: id, phase: 'in' };
      if (!L.bath) anims.push({ kind: FUN[id] === 'peek' ? 'peek' : id, start: Date.now(), end: Date.now() + 2600, at: L.door, id: id }); // (3.1: in the castle's bathroom he just goes) if (SAY[id]) ui().k.snack(SAY[id]);
      if (id === 'outhouse') { a.beep('door'); if (AIU.life) AIU.life.potty(); } else if (id === 'well') a.beep('splash'); else a.beep('knock');
      setTimeout(function () { if (a.visit && a.visit.id === id) a.visit = { id: id, dir: 'back', phase: 'walk', start: Date.now(), dur: 1600 }; a.react(id === 'shed' ? 'happy' : 'happy'); }, 2600);
    });
  }
  setInterval(function () { try { T.visitTick(); } catch (e) {} }, 120);

  T.anim = function (o) { o.start = o.start || Date.now(); anims.push(o); }; // 2.4.0: a little show from elsewhere (the stand-up)
  /* ---------- picking things up ---------- */
  function pickable(hit, sc) {
    if (!hit) return null;
    if (hit.kind === 'aiu' && app().S.hatched && !app().hatching && !app().evolve && !app().casting && !(app().visit && app().visit.phase === 'in')) return { who: 'aiu' }; // 2.4.0: even mid-walk or mid-activity
    if (hit.kind === 'buddy' && !A.isRoom(sc)) return { who: 'buddy' };
    if (hit.kind === 'animal') return { who: 'ani:' + hit.an.id, an: hit.an };
    return null;
  }
  T.attach = function (cv) {
    var d = null, timer = null;
    function pt(e) { return ui().worldPt(e); }
    cv.addEventListener('pointerdown', function (e) {
      var a = app(), sc = a.view && a.view.sc; if (!sc || !a.S) return;
      var p0 = pt(e), hit = A.hitAt(p0, sc), can = pickable(hit, sc);
      d = { x: e.clientX, y: e.clientY, p: p0, can: can, id: e.pointerId };
      clearTimeout(timer);
      if (can) timer = setTimeout(function () { if (!d || d.moved) return; pickUp(d, sc); }, HOLD_MS);
    });
    cv.addEventListener('pointermove', function (e) {
      if (!d) return;
      if (held) { e.preventDefault(); var p = pt(e); shake(p); held.p = p; return; }
      if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 10) d.moved = true;
    });
    function end(e) {
      clearTimeout(timer);
      if (held && e && e.type !== 'pointerleave') { var p = pt(e) || held.p; drop(p); }
      else if (held && e && e.type === 'pointerleave') drop(held.p);
      d = null;
    }
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end); cv.addEventListener('pointerleave', end);
    // while something is picked up, the page doesn't scroll under your finger
    cv.addEventListener('touchmove', function (e) { if (held) e.preventDefault(); }, { passive: false });
    cv.addEventListener('contextmenu', function (e) { if (held || (d && d.can)) e.preventDefault(); });
  };
  T.holding = function () { return !!held; };
  T.justDropped = 0;
  function pickUp(d0, sc) {
    held = { who: d0.can.who, an: d0.can.an, p: d0.p, t: Date.now(), dir: 0, flips: 0, lastX: d0.p.x };
    try { if (navigator.vibrate) navigator.vibrate(12); } catch (e) {}
    app().beep('toss');
    if (held.who === 'aiu') { app().react('wee'); if (AIU.life) AIU.life.free(sc); } // 2.4.0: he hops out of whatever he was doing
  }
  function shake(p) {
    var dx = p.x - held.lastX; held.lastX = p.x;
    if (Math.abs(dx) > 3) { var dir = dx > 0 ? 1 : -1; if (held.dir && dir !== held.dir) held.flips++; held.dir = dir; }
    if (held.who === 'aiu' && held.flips >= 6 && !held.coins) { held.coins = true; anims.push({ kind: 'coins', start: Date.now(), end: Date.now() + 1800, at: { x: p.x, y: p.y } }); app().beep('ping'); }
  }
  function inR(p, r) { return !!(r && p && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h); }
  function drop(p) {
    var a = app(), sc = a.view && a.view.sc, h = held; held = null; T.justDropped = Date.now();
    if (!sc || !p) return;
    var room = A.isRoom(sc), now = Date.now();
    if (h.who === 'aiu' && A.CASTLE && AIU.castle && !room) { // 3.0: in the castle: the bed for a nap, the kitchen for a snack, the board for the day; anywhere else he walks back from where he lands
      var hc = A.hitAt(p, sc), drc = A.droneRectP(sc);
      if (drc && inR(p, { x: drc.x - 4, y: drc.y - 4, w: drc.w + 8, h: drc.h + 12 })) { anims.push({ kind: 'ride', start: now, end: now + 4200, hides: 'aiu' }); a.react('happy'); return; }
      if (hc && hc.kind === 'buddy') { bonk('buddy', p); return; }
      if (hc && hc.kind === 'board') { a.free = null; AIU.castle.dropAt(p); setTimeout(function () { AIU.life ? AIU.life.standup() : ui().todaySheet(); }, 300); return; }
      if (hc && hc.kind === 'room' && hc.type === 'bedroom') { a.free = null; a.forceAct = { id: 'sleep', until: now + 2 * 60000 }; a.react('sleepy'); AIU.castle.dropAt(p); if (AIU.life) AIU.life.joy('help'); return; }
      if (hc && hc.kind === 'room' && hc.type === 'kitchen') { a.free = null; a.forceAct = { id: 'eat', until: now + 3 * 60000 }; a.react('happy'); AIU.castle.dropAt(p); if (AIU.life) AIU.life.joy('help'); return; }
      if (hc && hc.kind === 'landmark' && FUN[hc.id]) { a.free = null; AIU.castle.dropAt(p); if (hc.id === 'outhouse' && AIU.life) AIU.life.joy(AIU.life.needsPotty() ? 'help' : 'pet'); T.visit(hc.id, true); return; }
      AIU.castle.dropAt(p); setTimeout(function () { a.setMode(h.flips >= 4 ? 'spin' : 'hop', 800); }, 200); return;
    }
    if (h.who === 'aiu') {
      var dizzy = h.flips >= 4;
      if (room) { // inside: drop him on the door and he goes out
        var hd = A.hitAt(p, sc);
        if (hd && hd.kind === 'door') { a.peek = null; a.free = null; a.placeReq = { indoor: false, until: now + 30 * 60000 }; a.beep('door'); a.react('goout'); return; }
        var HA = A.HOUSE_AREAS || {}; // 2.4.0: drop him where he needs to be: the bed for a nap, the kitchen for a snack
        if (HA.bedroom && inR(p, { x: HA.bedroom.px, y: HA.bedroom.py, w: HA.bedroom.w, h: HA.bedroom.h })) { a.free = null; a.forceAct = { id: 'sleep', until: now + 2 * 60000 }; a.react('sleepy'); if (AIU.life) AIU.life.joy('help'); return; }
        if (HA.kitchen && inR(p, { x: HA.kitchen.px, y: HA.kitchen.py, w: HA.kitchen.w, h: HA.kitchen.h })) { a.free = null; a.forceAct = { id: 'eat', until: now + 3 * 60000 }; a.react('happy'); if (AIU.life) AIU.life.joy('help'); return; }
        land(p, dizzy); return;
      }
      var under = A.hitAt(p, sc);
      var dr = A.droneRectP(sc); if (inR(p, { x: dr ? dr.x - 4 : -99, y: dr ? dr.y - 4 : -99, w: dr ? dr.w + 8 : 0, h: dr ? dr.h + 12 : 0 })) { anims.push({ kind: 'ride', start: now, end: now + 4200, hides: 'aiu' }); a.react('happy'); return; }
      if (under && under.kind === 'buddy') { bonk('buddy', p); return; }
      if (under && under.kind === 'animal') { bonk('ani:' + under.an.id, p, under.an); return; }
      if (under && under.kind === 'board') { a.free = null; land({ x: A.BOARD_P.x + A.BOARD_P.w + 6, y: 132 }, false); setTimeout(function () { AIU.life ? AIU.life.standup() : ui().todaySheet(); }, 300); return; }
      if (under && under.kind === 'pond') { anims.push({ kind: 'splash', start: now, end: now + 1500, at: p, hides: 'aiu' }); a.beep('splash'); setTimeout(function () { a.setMode('spin', 900); }, 1500); return; }
      if (under && under.kind === 'cart') { land({ x: A.CART_AT.x + 8, y: 104 }, false); ui().k.snack('He\'ll cook here at lunch and dinner.'); return; } // 2.4.0: cooking is part of his routine
      if (under && under.kind === 'landmark') {
        if (under.id === 'house' && p.y < 52) { anims.push({ kind: 'slide', start: now, end: now + 1800, at: p, hides: 'aiu' }); setTimeout(function () { a.setMode('hop', 700); }, 1800); return; } // dropped on the roof: wheee
        a.free = null; if (under.id === 'outhouse' && AIU.life) AIU.life.joy(AIU.life.needsPotty() ? 'help' : 'pet');
        T.visit(under.id, true); if (under.id !== 'house' && !FUN[under.id]) { anims.push({ kind: 'poof', start: now, end: now + 500, at: p }); } return;
      }
      land(p, dizzy);
      return;
    }
    // the pet or an animal: it shakes off and wanders back
    A.toyOver[h.who] = { x: Math.round(p.x), y: Math.max(98, Math.min(140, Math.round(p.y))), t: now };
    if (h.who === 'buddy' && inR(p, A.BOARD_P)) { anims.push({ kind: 'pins', start: now, end: now + 2200 }); app().beep('knock'); }
    else if (h.who === 'buddy' && AIU.play && AIU.play.careAct) { app().beep('purr'); }
    anims.push({ kind: 'shakeoff', start: now, end: now + 700, at: A.toyOver[h.who] });
  }
  function land(p, dizzy) { // he lands, then walks back to his spot
    var a = app(), now = Date.now(), to = A.AIU_SPOT, dist = Math.hypot(to.x - p.x, to.y - p.y), dur = Math.min(2600, 500 + dist * 18);
    anims.push({ kind: 'return', start: now, end: now + dur + 350, from: { x: p.x, y: Math.max(98, p.y) }, to: to, wait: 350, hides: 'aiu' });
    setTimeout(function () { a.setMode(dizzy ? 'spin' : 'hop', 800); }, dur + 350);
  }
  function bonk(who, p, an) {
    var a = app(), now = Date.now(), target = who === 'buddy' ? (A.buddyFeetP || p) : A.animalPos(an, a.view.sc);
    A.toyOver[who] = { x: Math.round(target.x), y: Math.round(target.y), t: now + 2600 }; // it holds still for the bonk
    anims.push({ kind: 'bonk', start: now, end: now + 2600, at: { x: target.x, y: target.y }, hides: 'aiu', who: who });
    a.beep('knock');
    setTimeout(function () { try { ui().hearts(3); } catch (e) {} if (who === 'buddy' && AIU.play && AIU.play.careAct) AIU.play.careAct('hug', 1500); a.beep('purr'); }, 1500);
    setTimeout(function () { land({ x: target.x + 10, y: target.y }, false); }, 2600);
  }

  // the dropped buddy or animal eases back to wandering
  A.toyPos = function (who, roamP) {
    var o = A.toyOver[who]; if (!o) return null;
    var age = Date.now() - o.t; if (age < 2200) return { x: o.x, y: o.y };
    if (age > 5000) { delete A.toyOver[who]; return null; }
    var k = (age - 2200) / 2800; return { x: o.x + (roamP.x - o.x) * k, y: o.y + (roamP.y - o.y) * k };
  };

  /* ---------- drawing what you're holding and the little shows ---------- */
  function aiuSprite(sc) { var form = sc.skin || sc.form; if (!form) return null; return A.creature(form.seed, form.stage, sc.soul); }
  A.toyDraw = function (c, sc) {
    var now = Date.now();
    anims.forEach(function (a) { if (a.until && a.until() && now > a.end - 500) a.end = now + 600; }); // stays while its sheet is open
    anims = anims.filter(function (a) { return now < a.end; });
    anims.forEach(function (a) { var k = (now - a.start) / (a.end - a.start); SHOW[a.kind] && SHOW[a.kind](c, sc, a, k, sc.f); });
    if (!held) return;
    var p = held.p, wig = Math.sin(now / 70) * 2;
    ell(c, Math.round(p.x), Math.round(Math.min(142, p.y + 14)), 6, 1, P.dark); // its shadow on the ground below
    if (held.who === 'aiu') {
      var cr = aiuSprite(sc); if (!cr) return; var fr = cr.frames[held.flips >= 4 ? 'blink' : 'happy'] || cr.frames.open;
      c.save(); c.translate(p.x, p.y - 2); c.rotate(wig * 0.05); c.drawImage(fr, -fr.width / 2, -(cr.bottom + 1) + 6); c.restore();
      if (held.flips >= 4) for (var i = 0; i < 3; i++) { var an = now / 200 + i * 2.1; px(c, Math.round(p.x + Math.cos(an) * 7), Math.round(p.y - 22 + Math.sin(an) * 2), P.yellow); }
    } else if (held.who === 'buddy') {
      var b = A.buddyOf(sc.soul, sc.buddy), s = A.buddySize(b), cv = buddyPic(sc);
      c.save(); c.translate(p.x, p.y + 8); c.rotate(wig * 0.04); c.drawImage(cv, -30 * s, -40 * s, 60 * s, 48 * s); c.restore();
    } else if (held.an) {
      c.save(); c.translate(Math.round(p.x), Math.round(p.y + 4 + wig)); A._ANI[held.an.kind](c, 0, 0, sc.f, held.an.k); c.restore();
      if (sc.f % 4 < 2) { px(c, Math.round(p.x - 6), Math.round(p.y - 6), P.white); px(c, Math.round(p.x + 6), Math.round(p.y - 7), P.white); }
    }
  };
  var bpic = null, bkey = '';
  function buddyPic(sc) { // the pet on its own (no post), for carrying around
    var b = A.buddyOf(sc.soul, sc.buddy), k = b + sc.gear + sc.align + (sc.f % 8 < 4);
    if (bpic && bkey === k) return bpic;
    bpic = document.createElement('canvas'); bpic.width = 60; bpic.height = 48; var c = bpic.getContext('2d'); c.imageSmoothingEnabled = false;
    A.drawBuddyAt(c, b, A.gearOf(b, sc.gear), 18, 44, sc.f, false, sc.align, true); bkey = k; return bpic;
  }
  function drawAiuAt(c, sc, x, y, s, rot, eyes) { var cr = aiuSprite(sc); if (!cr) return; var fr = cr.frames[eyes || 'open'] || cr.frames.open; c.save(); c.translate(x, y); if (rot) c.rotate(rot); c.drawImage(fr, -fr.width / 2 * s, -(cr.bottom + 1) * s, fr.width * s, fr.height * s); c.restore(); }
  function stars(c, x, y, f) { for (var i = 0; i < 3; i++) { var an = f * 0.6 + i * 2.1; spr(c, Math.round(x + Math.cos(an) * 6) - 1, Math.round(y + Math.sin(an) * 2) - 1, ['.y.', 'yyy', '.y.']); } }
  var SHOW = {
    'return': function (c, sc, a, k, f) {
      var t = Math.max(0, (Date.now() - a.start - a.wait) / Math.max(1, a.end - a.start - a.wait));
      var x = a.from.x + (a.to.x - a.from.x) * t, y = a.from.y + (a.to.y - a.from.y) * t, s = Math.max(0.5, Math.round((1 - Math.max(0, Math.min(1, (128 - y) / 60)) * 0.5) * 4) / 4);
      drawAiuAt(c, sc, Math.round(x), Math.round(y) + (f % 2 && t > 0 ? -1 : 0), s, 0, t <= 0 ? 'happy' : 'open');
    },
    bonk: function (c, sc, a, k, f) { // he tumbles onto it, they both topple, shake it off, and hug
      var x = a.at.x, y = a.at.y;
      if (k < 0.25) { drawAiuAt(c, sc, x + 2, y - 30 + k * 4 * 22, 1, 0, 'happy'); return; }
      if (k < 0.6) { drawAiuAt(c, sc, x + 12, y, 1, Math.PI / 2 * 0.9, 'blink'); stars(c, x + 8, y - 22, f); return; }
      drawAiuAt(c, sc, x + 12, y, 1, 0, 'happy');
      if (f % 4 < 2) { spr(c, x + 3, y - 32, ['.r.r.', 'rrrrr', '.rrr.', '..r..']); }
    },
    splash: function (c, sc, a, k, f) {
      var x = a.at.x, y = 118; for (var i = 0; i < 10; i++) { var an = i / 10 * Math.PI, r = k * 14; px(c, Math.round(x + Math.cos(an) * r), Math.round(y - Math.sin(an) * r * 1.2), i % 2 ? P.white : P.sky); }
      ell(c, Math.round(x), y, Math.round(3 + k * 10), Math.round(1 + k * 2), P.white, false);
      if (k > 0.5) drawAiuAt(c, sc, x, y + 2 - (k - 0.5) * 2 * 10, 1, 0, 'blink');
    },
    slide: function (c, sc, a, k, f) { // down the roof, off the edge, onto his feet
      var hx = 96, x = a.at.x + (hx + 22 - a.at.x) * Math.min(1, k * 1.4), y = a.at.y + (k < 0.7 ? k / 0.7 * 22 : 22 + (k - 0.7) / 0.3 * 10);
      drawAiuAt(c, sc, Math.round(x), Math.round(y), 0.75, k < 0.7 ? 0.5 : 0, 'happy');
    },
    ride: function (c, sc, a, k, f) { var dp = A.droneRectP(sc); if (!dp) return; var x = dp.x + dp.w / 2, y = dp.y + dp.h + 18; drawAiuAt(c, sc, Math.round(x + Math.sin(k * 12) * 2), Math.round(y), 0.75, Math.sin(k * 20) * 0.1, 'happy'); line(c, Math.round(x), dp.y + dp.h - 2, Math.round(x), Math.round(y - 20), P.slate); if (k > 0.9) land({ x: x, y: 110 }, false), a.end = 0; },
    coins: function (c, sc, a, k, f) { for (var i = 0; i < 6; i++) { var x = a.at.x - 8 + i * 3, y = a.at.y + k * k * 40 + (i % 3) * 2; if (y < 142) { disc(c, Math.round(x), Math.round(y), 1, P.yellow); px(c, Math.round(x), Math.round(y) - 1, P.white); } } },
    pins: function (c, sc, a, k, f) { var B = A.BOARD_P; for (var i = 0; i < 3; i++) { var fall = k < 0.5 ? k * 2 : 1 - (k - 0.5) * 2; px(c, B.x + 8 + i * 9, Math.round(B.y + 5 + fall * 28), P.red); } },
    shakeoff: function (c, sc, a, k, f) { for (var i = 0; i < 4; i++) px(c, Math.round(a.at.x - 8 + i * 5), Math.round(a.at.y - 12 - k * 6 - (i % 2) * 2), P.white); },
    poof: function (c, sc, a, k, f) { for (var i = 0; i < 8; i++) { var an = i / 8 * Math.PI * 2; px(c, Math.round(a.at.x + Math.cos(an) * k * 10), Math.round(a.at.y - 10 + Math.sin(an) * k * 6), P.white); } },
    shed: function (c, sc, a, k, f) { var d = a.at; drawAiuAt(c, sc, d.x + 6, d.y + 1, 0.75, 0, 'happy'); line(c, d.x + 9, d.y - 14, d.x + 14 + Math.round(Math.sin(k * 20) * 2), d.y - 22, P.silver); R(c, d.x + 13, d.y - 24, 4, 2, P.silver); }, // he comes out with the rake
    well: function (c, sc, a, k, f) { var d = a.at; drawAiuAt(c, sc, d.x - 6, d.y + 1, 0.75, 0, k > 0.7 ? 'happy' : 'open'); var by = d.y - 12 + Math.round(Math.abs(Math.sin(k * 6)) * 6); R(c, d.x - 1, by, 3, 2, P.wood); if (k > 0.6) for (var i = 0; i < 3; i++) px(c, d.x + i - 1, by - 2 - ((f + i) % 3), P.sky); },
    peek: function (c, sc, a, k, f) { var d = a.at; if (k > 0.75) drawAiuAt(c, sc, d.x, d.y + 1, 0.5, 0, 'happy'); else for (var i = 0; i < 3; i++) px(c, d.x - 4 + i * 4, d.y - 14 - ((f + i * 3) % 6), [P.yellow, P.white, P.pink][i]); }, // inside for a moment, then back out
    reading: function (c, sc, a, k, f) { var d = a.at; drawAiuAt(c, sc, d.x, d.y + (f % 8 < 4 ? 0 : -1), 1, 0, f % 12 < 2 ? 'blink' : 'happy'); if (f % 10 < 6) spr(c, d.x - 12, d.y - 34, ['.kkk.', 'kwwwk', 'kwkwk', 'kwwwk', '.kkk.']); }, // at the bounty board, telling you the day
    outhouse: function (c, sc, a, k, f) { var d = a.at; if (k < 0.8) { if (f % 6 < 3) px(c, d.x - 4, d.y - 18, P.yellow); px(c, d.x + 6, d.y - 22 - (f % 4), P.white); } else drawAiuAt(c, sc, d.x, d.y + 1, 0.5, 0, 'happy'); }
  };
})();
