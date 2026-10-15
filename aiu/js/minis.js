/* AIU TOTEM 2.3.1 - hands-on mini games for the buildings (WarioWare-style: quick, silly, and you learn something).
   Each one runs right in the building's picture: tap, hold, swipe or drag. Win and the part is fixed; lose and you just
   try again (plants and animals never really get hurt). A "Did you know?" fact comes after.
     Greenhouse: flick the bugs off a leaf and pick the right spray; keep the temperature in the green with the vents;
                 water to the line; set the grow light; sort the compost; wipe the glass.
     Barn:       toss feed, fill the water, scoop the poop, shovel the old hay out, collect eggs, milk, brush. */
(function () {
  'use strict';
  var U = AIU.util, A = AIU.art, P = A.P, K = A.prim, R = K.R, px = K.px, spr = K.spr, disc = K.disc, ell = K.ell, line = K.line, h = U.h, PL = AIU.places;
  function app() { return AIU.app; }
  function KK() { return AIU.ui.k; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function txt(c, s, x, y, col, size, al) { c.font = (size || 8) + 'px Term, ui-monospace, monospace'; c.textAlign = al || 'center'; c.textBaseline = 'top'; c.fillStyle = P.ink; c.fillText(s, x + 1, y + 1); c.fillStyle = col || P.white; c.fillText(s, x, y); }
  function bar(c, x, y, w, hgt, v, col, lo, hi) { R(c, x - 1, y - 1, w + 2, hgt + 2, P.ink); R(c, x, y, w, hgt, P.dark); if (lo !== undefined) R(c, x + Math.round(w * lo), y, Math.round(w * (hi - lo)), hgt, P.teal); R(c, x, y, Math.round(w * Math.max(0, Math.min(1, v))), hgt, col); }
  function near(p, x, y, r) { return Math.hypot(p.x - x, p.y - y) <= r; }

  /* ---------- the runner: shows the game, then the result and a fact ---------- */
  // game = { title, how, fact, init(), step(dt), draw(c), down(p), move(p, held), up(p) }; set g.win() / g.lose(why) inside
  PL.play = function (V, game, onWin, onBack) {
    var k = KK(), b = V.body, msg = h('p', { cls: 'bmsg', 'aria-live': 'polite' });
    function start() {
      var g = game(); g.t = 0; g.over = false;
      g.win = function () { if (g.over) return; g.over = true; app().beep('chirp'); setTimeout(function () { end(true, g); }, 600); };
      g.lose = function (why) { if (g.over) return; g.over = true; app().beep('knock'); setTimeout(function () { end(false, g, why); }, 700); };
      var st0 = g.step; g.step = function (dt) { g.t += dt; if (st0) st0.call(g, dt); };
      if (g.init) g.init();
      V.task = g; V.cv.style.touchAction = 'none';
      k.clear(b);
      b.appendChild(PL.card(g.title, [h('p', { text: g.how }), msg, h('div', { cls: 'row' }, k.btn('Stop', function () { V.task = null; V.cv.style.touchAction = ''; if (onBack) onBack(); else V.render(); }, 'ghost'))]));
      g.say = function (t) { msg.textContent = t || ''; };
    }
    function end(won, g, why) {
      V.task = null; V.cv.style.touchAction = ''; k.clear(b);
      if (won) b.appendChild(PL.card('You did it!', [g.fact ? h('p', { cls: 'bwhy', text: 'Did you know? ' + g.fact }) : null, k.btn('Yay! Continue', function () { if (onWin) onWin(); }, 'primary')]));
      else b.appendChild(PL.card('Oops! Try again', [h('p', { text: why || 'That one got away. You can do it!' }), h('div', { cls: 'row' }, k.btn('Try again', start, 'primary'), k.btn('Back', function () { if (onBack) onBack(); else V.render(); }, 'ghost'))]));
    }
    start();
  };
  function hud(c, g, label, secs) { R(c, 0, 0, 192, 11, 'rgba(26,28,44,.75)'); txt(c, label, 4, 1, P.yellow, 8, 'left'); if (secs !== undefined) txt(c, Math.max(0, Math.ceil(secs)) + 's', 188, 1, P.white, 8, 'right'); }
  function leafBg(c) { R(c, 0, 0, 192, 108, P.sky); R(c, 0, 80, 192, 28, P.bark); R(c, 80, 60, 32, 26, P.orange); R(c, 78, 58, 36, 4, P.orange); line(c, 96, 60, 96, 20, P.green); ell(c, 70, 40, 34, 16, P.green); ell(c, 124, 34, 32, 15, P.green); ell(c, 70, 40, 30, 13, P.lime, false); ell(c, 124, 34, 28, 12, P.lime); line(c, 40, 40, 100, 40, P.green); line(c, 96, 34, 154, 34, P.green); disc(c, 96, 18, 4, P.lime); }

  /* =============================== GREENHOUSE =============================== */
  var GH = {};
  GH.pests = function () { // flick the aphids off, then pick the right spray
    var g = { title: 'Pest check', how: 'Tap the little bugs to flick them off the leaves before they reach the new shoot at the top! Then pick the right spray.', fact: 'Aphids suck sap from new growth. A spray of water, or water with a little mild soap, knocks them off. Ladybugs eat hundreds of them!' };
    g.init = function () { g.bugs = []; for (var i = 0; i < 9; i++) g.bugs.push({ x: rnd(40, 154), y: rnd(30, 48), on: true, v: rnd(4, 7), fly: 0 }); g.bites = 0; g.phase = 'bugs'; g.left = 22; };
    g.step = function (dt) {
      if (g.phase !== 'bugs') return; g.left -= dt;
      g.bugs.forEach(function (b) { if (b.fly) { b.fly += dt; b.y -= 60 * dt; b.x += (b.x < 96 ? -40 : 40) * dt; return; } var dx = 96 - b.x, dy = 18 - b.y, d = Math.hypot(dx, dy); if (d < 4) { g.bites++; b.x = rnd(40, 154); b.y = 48; app().beep('munch'); } else { b.x += dx / d * b.v * dt; b.y += dy / d * b.v * dt; } });
      if (g.bites >= 3) g.lose('The bugs nibbled the new shoot three times. Flick them faster!');
      else if (g.bugs.every(function (b) { return b.fly; })) { g.phase = 'spray'; g.say('All flicked! Now, which spray keeps them away?'); }
      else if (g.left <= 0) g.lose('Time ran out with bugs still on the leaves.');
    };
    var SPR = [['Soapy water', P.sky, true], ['Sugar water', P.pink, false], ['Bleach', P.yellow, false]];
    g.draw = function (c) {
      leafBg(c);
      if (g.phase === 'bugs') { g.bugs.forEach(function (b) { if (b.fly && b.y < -10) return; R(c, Math.round(b.x) - 1, Math.round(b.y) - 1, 3, 2, b.fly ? P.silver : P.green); px(c, Math.round(b.x) + 1, Math.round(b.y) - 2, P.ink); px(c, Math.round(b.x) - 2, Math.round(b.y), P.dark); }); hud(c, g, 'Flick the bugs! Bites: ' + g.bites + '/3', g.left); return; }
      SPR.forEach(function (s, i) { var x = 34 + i * 62; R(c, x - 9, 70, 18, 26, P.ink); R(c, x - 8, 71, 16, 24, s[1]); R(c, x - 3, 64, 6, 6, P.slate); R(c, x + 3, 65, 6, 2, P.slate); txt(c, s[0], x, 98, P.white, 8); });
      if (g.sprayed) for (var i = 0; i < 20; i++) px(c, 60 + ((i * 37 + g.t * 90) % 80), 20 + ((i * 13) % 40), P.cyan);
      hud(c, g, 'Pick the spray');
    };
    g.down = function (p) {
      if (g.phase === 'bugs') { g.bugs.forEach(function (b) { if (!b.fly && near(p, b.x, b.y, 7)) { b.fly = 0.01; app().beep('toss'); } }); return; }
      SPR.forEach(function (s, i) { var x = 34 + i * 62; if (p.x > x - 14 && p.x < x + 14 && p.y > 60) { if (s[2]) { g.sprayed = true; g.say('Pssst! Soapy water knocks them off and doesn\'t hurt the plant.'); g.win(); } else g.lose(s[0] === 'Bleach' ? 'Bleach would hurt the plant! Mild soapy water is the gentle choice.' : 'Sugar water would bring MORE bugs (and ants). Try soapy water.'); } });
    };
    return g;
  };
  GH.vents = function () { // keep the needle in the green with the vent slider
    var g = { title: 'Vents and temperature', how: 'The sun heats the greenhouse. Slide the vent open (drag the bar at the bottom) to cool it, closed to warm it. Keep the needle in the green for 12 seconds!', fact: 'Most garden plants like about 65 to 85°F. Greenhouses heat up fast on sunny days, so gardeners open vents and doors to let hot air out.' };
    g.init = function () { g.temp = 78; g.vent = 0.3; g.good = 0; g.bad = 0; g.sun = 1; };
    g.step = function (dt) {
      g.sun = 0.9 + 0.6 * Math.max(0, Math.sin(g.t * 0.7)) + (Math.sin(g.t * 2.3) > 0.9 ? 0.6 : 0);
      g.temp += (g.sun * 9 - g.vent * 16 - (g.temp - 70) * 0.15) * dt;
      var ok = g.temp >= 68 && g.temp <= 85; if (ok) g.good += dt; else g.bad += dt;
      if (g.temp > 98 || g.temp < 52) g.lose(g.temp > 98 ? 'Too hot! The plants wilted. Open the vents sooner when the sun comes out.' : 'Too cold! Close the vents a bit when it cools down.');
      else if (g.good >= 12) g.win();
    };
    g.draw = function (c) {
      R(c, 0, 0, 192, 108, P.sky); disc(c, 170, 18, 7 + Math.round(g.sun * 2), P.yellow);
      for (var x = 0; x < 192; x += 24) R(c, x, 0, 2, 70, P.white);
      var a0 = Math.PI * 0.85, a1 = Math.PI * 2.15; for (var i = 0; i <= 30; i++) { var t0 = i / 30, an = a0 + (a1 - a0) * t0, tv = 50 + t0 * 50, col = tv >= 68 && tv <= 85 ? P.green : tv > 92 || tv < 56 ? P.red : P.yellow; R(c, Math.round(96 + Math.cos(an) * 30), Math.round(46 + Math.sin(an) * 30), 3, 3, col); }
      var tt = Math.max(0, Math.min(1, (g.temp - 50) / 50)), an2 = a0 + (a1 - a0) * tt; line(c, 96, 46, Math.round(96 + Math.cos(an2) * 24), Math.round(46 + Math.sin(an2) * 24), P.ink); disc(c, 96, 46, 3, P.ink);
      txt(c, Math.round(g.temp) + '°F', 96, 58, P.white, 10);
      R(c, 20, 86, 152, 10, P.ink); R(c, 21, 87, 150, 8, P.slate); var vx = 21 + Math.round(g.vent * 140); R(c, vx, 83, 10, 16, P.white); R(c, vx + 2, 85, 6, 12, P.silver);
      txt(c, 'closed', 21, 98, P.white, 8, 'left'); txt(c, 'open', 171, 98, P.white, 8, 'right');
      hud(c, g, 'In the green: ' + Math.floor(g.good) + '/12s');
    };
    g.down = g.move = function (p, held) { if (held === false) return; if (p.y > 76) g.vent = Math.max(0, Math.min(1, (p.x - 21) / 150)); };
    return g;
  };
  GH.water = function () { // hold to pour, let go at the line (three pots)
    var g = { title: 'Watering', how: 'Hold your finger down to pour. Let go when the water reaches the green band. Too much drowns the roots!', fact: 'Water slowly at the soil until a little drains out the bottom, then let the top inch dry before watering again. Soggy soil rots roots.' };
    g.init = function () { g.pot = 0; g.lv = 0; g.pour = false; g.wait = 0; };
    g.step = function (dt) { if (g.wait > 0) { g.wait -= dt; if (g.wait <= 0) { g.pot++; g.lv = 0; if (g.pot >= 3) g.win(); } return; } if (g.pour) g.lv += dt * 0.45; if (g.lv > 1) g.lose('Too much water: the pot overflowed. Let go at the green band.'); };
    g.draw = function (c) {
      R(c, 0, 0, 192, 108, P.sky); R(c, 0, 90, 192, 18, P.wood);
      for (var i = 0; i < 3; i++) { var x = 40 + i * 56, cur = i === g.pot; R(c, x - 14, 56, 28, 34, i < g.pot ? P.orange : P.red); R(c, x - 16, 52, 32, 5, P.orange); var lv = i < g.pot ? 0.72 : cur ? g.lv : 0; R(c, x - 12, 88 - Math.round(lv * 30), 24, Math.round(lv * 30), P.blue); if (cur) { R(c, x - 13, 88 - 27, 26, 1, P.lime); R(c, x - 13, 88 - 21, 26, 1, P.lime); } line(c, x, 52, x, 40, P.green); ell(c, x - 4, 40, 4, 2, P.lime); ell(c, x + 4, 38, 4, 2, P.lime); }
      var cx = 40 + Math.min(2, g.pot) * 56; R(c, cx + 8, 20, 18, 12, P.green); line(c, cx + 8, 24, cx - 2, 18, P.green); if (g.pour) for (var j = 0; j < 6; j++) px(c, cx - 2 + (j % 2), 20 + j * 5 + ((g.t * 40) % 5), P.cyan);
      hud(c, g, 'Pot ' + Math.min(3, g.pot + 1) + ' of 3');
    };
    g.down = function () { if (g.wait <= 0) g.pour = true; };
    g.up = function () { if (!g.pour) return; g.pour = false; if (g.lv >= 0.7 && g.lv <= 0.9) { g.wait = 0.5; g.say('Just right!'); app().beep('slurp'); } else if (g.lv < 0.7) g.say('A bit more...'); };
    return g;
  };
  GH.light = function () { // drag the grow light to the right height and hold it there
    var g = { title: 'Grow lights', how: 'Drag the grow light up or down. Seedlings stretch when it\'s too far away and get scorched when it\'s too close. Keep it in the green zone for 4 seconds.', fact: 'Seedlings want their light just a few inches above the leaves, for about 14 to 16 hours a day. Too far away and they get tall and floppy.' };
    g.init = function () { g.y = 18; g.hold = 0; g.burn = 0; };
    g.step = function (dt) { var ok = g.y >= 46 && g.y <= 56; if (ok) g.hold += dt; else g.hold = Math.max(0, g.hold - dt); if (g.y > 62) g.burn += dt; else g.burn = Math.max(0, g.burn - dt); if (g.burn > 1.5) g.lose('Too close: the leaves got scorched. Raise it a little.'); else if (g.hold >= 4) g.win(); };
    g.draw = function (c) {
      R(c, 0, 0, 192, 108, P.dark); R(c, 0, 92, 192, 16, P.bark);
      var stretch = Math.max(0, Math.min(12, (46 - g.y) / 3));
      for (var i = 0; i < 4; i++) { var x = 46 + i * 34, top = 78 - stretch; R(c, x - 6, 84, 13, 8, P.orange); line(c, x, 84, x, top, g.burn > 0.5 ? P.yellow : P.green); ell(c, x - 3, top, 3, 1, g.burn > 0.8 ? P.wood : P.lime); ell(c, x + 3, top - 1, 3, 1, g.burn > 0.8 ? P.wood : P.lime); }
      R(c, 20, 46, 3, 10, P.green); R(c, 20, 56, 3, 8, P.red); R(c, 20, 10, 3, 36, P.yellow);
      R(c, 36, g.y - 3, 120, 5, P.silver); R(c, 38, g.y + 2, 116, 2, P.white); for (var k2 = 0; k2 < 8; k2++) { c.globalAlpha = 0.18; R(c, 40 + k2 * 14, g.y + 4, 10, 80 - g.y, P.yellow); c.globalAlpha = 1; }
      line(c, 60, 0, 60, g.y - 3, P.slate); line(c, 132, 0, 132, g.y - 3, P.slate);
      hud(c, g, g.y < 46 ? 'Too far: bring it lower' : g.y > 56 ? 'Too close!' : 'Just right: hold it... ' + Math.floor(g.hold) + '/4');
    };
    g.down = g.move = function (p, held) { if (held === false) return; g.y = Math.max(12, Math.min(72, p.y)); };
    return g;
  };
  GH.soil = function () { // sort the scraps: compost or trash?
    var ITEMS = [['Dry leaves', P.orange, 1], ['Banana peel', P.yellow, 1], ['Grass clippings', P.lime, 1], ['Cardboard', P.sand, 1], ['Eggshells', P.white, 1], ['Plastic bag', P.silver, 0], ['Meat bones', P.pink, 0], ['Coffee grounds', P.bark, 1], ['Glass jar', P.cyan, 0]];
    var g = { title: 'Soil and compost', how: 'Is it good for compost? Tap the green compost bin or the gray trash can for each thing.', fact: 'Compost likes "greens" (fruit and veggie scraps, grass) and "browns" (dry leaves, cardboard). Keep meat, plastic and glass out. Turn it now and then and it becomes rich soil.' };
    g.init = function () { g.list = ITEMS.slice().sort(function () { return Math.random() - 0.5; }).slice(0, 7); g.i = 0; g.miss = 0; g.flash = 0; };
    g.step = function (dt) { g.flash = Math.max(0, g.flash - dt); };
    g.draw = function (c) {
      R(c, 0, 0, 192, 108, P.green); R(c, 0, 84, 192, 24, P.bark);
      R(c, 14, 54, 44, 40, P.ink); R(c, 15, 55, 42, 38, P.teal); txt(c, 'Compost', 36, 70, P.white, 8);
      R(c, 134, 54, 44, 40, P.ink); R(c, 135, 55, 42, 38, P.slate); txt(c, 'Trash', 156, 70, P.white, 8);
      var it = g.list[g.i]; if (it) { var bob = Math.sin(g.t * 4) * 2; R(c, 82, 34 + bob, 28, 18, P.ink); R(c, 83, 35 + bob, 26, 16, it[1]); txt(c, it[0], 96, 18, P.white, 8); }
      if (g.flash) { c.globalAlpha = 0.3; R(c, 0, 0, 192, 108, g.ok ? P.lime : P.red); c.globalAlpha = 1; }
      hud(c, g, (g.i + 1 > g.list.length ? g.list.length : g.i + 1) + ' of ' + g.list.length + ' · oops ' + g.miss + '/2');
    };
    g.down = function (p) {
      var it = g.list[g.i]; if (!it) return; var pick = p.x < 70 ? 1 : p.x > 122 ? 0 : -1; if (pick < 0) return;
      g.ok = pick === it[2]; g.flash = 0.3; if (!g.ok) { g.miss++; g.say(it[0] + (it[2] ? ' can go in the compost.' : ' doesn\'t belong in compost.')); app().beep('knock'); } else { g.say(''); app().beep('toss'); }
      g.i++; if (g.miss > 2) g.lose('A few things ended up in the wrong place. Try again!'); else if (g.i >= g.list.length) g.win();
    };
    return g;
  };
  GH.glass = function () { // wipe the dirt off the glass
    var g = { title: 'Clean the glass', how: 'Rub your finger over the dirty glass to wipe it clean. Get it all shiny before time runs out!', fact: 'Dirty glass can block a big share of the sunlight. Gardeners wash greenhouse glass in spring and fall.' };
    g.init = function () { g.cells = []; for (var y = 0; y < 9; y++) for (var x = 0; x < 16; x++) g.cells.push(1); g.left = 18; };
    g.step = function (dt) { g.left -= dt; var dirty = g.cells.filter(function (v) { return v; }).length; if (dirty <= 6) g.win(); else if (g.left <= 0) g.lose('Still a few dirty spots. Rub faster!'); };
    g.draw = function (c) {
      R(c, 0, 0, 192, 108, P.sky); disc(c, 150, 24, 8, P.yellow); ell(c, 50, 70, 30, 10, P.green); line(c, 96, 0, 96, 108, P.white); line(c, 0, 54, 192, 54, P.white);
      g.cells.forEach(function (v, i) { if (!v) return; var x = (i % 16) * 12, y = Math.floor(i / 16) * 12; c.globalAlpha = 0.85; R(c, x, y, 12, 12, (i * 7) % 3 ? P.wood : P.green); c.globalAlpha = 1; });
      hud(c, g, 'Wipe it clean!', g.left);
    };
    g.down = g.move = function (p, held) { if (held === false) return; for (var dy = -8; dy <= 8; dy += 4) for (var dx = -8; dx <= 8; dx += 4) { var cx = Math.floor((p.x + dx) / 12), cy = Math.floor((p.y + dy) / 12); if (cx >= 0 && cx < 16 && cy >= 0 && cy < 9) g.cells[cy * 16 + cx] = 0; } };
    return g;
  };
  PL.GH_GAMES = GH;

  /* =============================== BARN =============================== */
  var BN = {};
  function stall(c) { R(c, 0, 0, 192, 108, P.bark); for (var x = 0; x < 192; x += 8) R(c, x, 0, 1, 70, P.ink); R(c, 0, 70, 192, 38, P.wood); for (var s = 0; s < 30; s++) px(c, (s * 37) % 192, 72 + (s * 13) % 34, P.yellow); R(c, 0, 69, 192, 1, P.ink); }
  BN.feed = function (an) {
    var g = { title: 'Feeding time', how: 'Tap the trough to toss in a scoop of feed. Five scoops fill it up!', fact: an === 'chickens' ? 'Laying hens eat layer feed with extra calcium for strong shells. Treats are just a little extra.' : an === 'rabbits' ? 'Hay should be about 80% of a rabbit\'s food. Chewing hay keeps their always-growing teeth worn down.' : 'Grazing animals like goats, cows and horses eat lots of hay and grass: their stomachs are built for it.' };
    g.init = function () { g.n = 0; g.flying = []; };
    g.step = function (dt) { g.flying.forEach(function (f) { f.t += dt * 2; }); g.flying = g.flying.filter(function (f) { return f.t < 1; }); };
    g.draw = function (c) { stall(c); R(c, 50, 78, 92, 14, P.ink); R(c, 51, 79, 90, 12, P.bark); R(c, 52, 80, 88 * g.n / 5, 6, an === 'rabbits' || an === 'horse' || an === 'cow' || an === 'goats' || an === 'sheep' ? P.lime : P.sand); g.flying.forEach(function (f) { disc(c, Math.round(20 + f.t * (f.x - 20)), Math.round(40 - Math.sin(f.t * Math.PI) * 26 + f.t * 40), 2, P.sand); }); hud(c, g, 'Scoops: ' + g.n + '/5'); };
    g.down = function (p) { if (p.y > 60) { g.flying.push({ x: p.x, t: 0 }); g.n++; app().beep('toss'); if (g.n >= 5) g.win(); } };
    return g;
  };
  BN.water = function () {
    var g = { title: 'Fresh water', how: 'Hold to fill the water trough. Let go at the green line: not too much!', fact: 'Animals drink a lot! A milking cow can drink 30 gallons a day. Clean water every day keeps them healthy.' };
    g.init = function () { g.lv = 0; g.on = false; };
    g.step = function (dt) { if (g.on) g.lv += dt * 0.4; if (g.lv > 1) g.lose('It overflowed! Let go at the green line.'); };
    g.draw = function (c) { stall(c); R(c, 40, 70, 112, 26, P.ink); R(c, 42, 72, 108, 22, P.slate); R(c, 44, 92 - Math.round(g.lv * 20), 104, Math.round(g.lv * 20), P.blue); R(c, 42, 92 - 16, 108, 1, P.lime); R(c, 42, 92 - 13, 108, 1, P.lime); R(c, 150, 30, 4, 40, P.silver); R(c, 140, 28, 16, 4, P.silver); if (g.on) for (var i = 0; i < 6; i++) px(c, 141, 32 + i * 6 + ((g.t * 40) % 6), P.cyan); hud(c, g, 'Fill to the line'); };
    g.down = function () { g.on = true; };
    g.up = function () { if (!g.on) return; g.on = false; if (g.lv >= 0.65 && g.lv <= 0.85) g.win(); else if (g.lv < 0.65) g.say('A bit more!'); };
    return g;
  };
  BN.poop = function () {
    var g = { title: 'Scoop the poop', how: 'Tap every poop pile to scoop it into the bucket. Quick, before the flies come!', fact: 'Clean stalls keep animals healthy: dirty, wet bedding grows germs and smells like ammonia, which hurts their lungs. Manure makes great compost for the garden!' };
    g.init = function () { g.p = []; for (var i = 0; i < 7; i++) g.p.push({ x: rnd(14, 178), y: rnd(76, 100), on: 1 }); g.left = 15; };
    g.step = function (dt) { g.left -= dt; if (g.p.every(function (q) { return !q.on; })) g.win(); else if (g.left <= 0) g.lose('Some poop is still there. The flies won this round!'); };
    g.draw = function (c) { stall(c); g.p.forEach(function (q, i) { if (!q.on) return; ell(c, Math.round(q.x), Math.round(q.y), 4, 2, P.bark); ell(c, Math.round(q.x), Math.round(q.y) - 2, 3, 2, P.bark); ell(c, Math.round(q.x), Math.round(q.y) - 4, 2, 1, P.bark); if (g.t % 0.6 < 0.3) px(c, Math.round(q.x) + 4 + (i % 3), Math.round(q.y) - 8, P.ink); }); R(c, 170, 50, 16, 18, P.slate); R(c, 171, 51, 14, 4, P.silver); hud(c, g, 'Scoop it all!', g.left); };
    g.down = function (p) { g.p.forEach(function (q) { if (q.on && near(p, q.x, q.y - 2, 9)) { q.on = 0; app().beep('munch'); } }); };
    return g;
  };
  BN.hay = function () {
    var g = { title: 'Muck out the old hay', how: 'Drag each pile of old, dirty hay out the door on the right. Then fresh hay goes down!', fact: 'Old bedding gets wet and dirty. Mucking out (shoveling it out) and putting down fresh straw or shavings keeps hooves and feet healthy.' };
    g.init = function () { g.p = []; for (var i = 0; i < 5; i++) g.p.push({ x: rnd(16, 120), y: rnd(80, 98), out: 0 }); g.drag = null; };
    g.draw = function (c) { stall(c); R(c, 160, 30, 30, 40, P.sky); R(c, 160, 30, 30, 3, P.ink); txt(c, 'door', 175, 60, P.white, 8); g.p.forEach(function (q) { if (q.out) return; ell(c, Math.round(q.x), Math.round(q.y), 9, 4, P.wood); ell(c, Math.round(q.x), Math.round(q.y) - 2, 7, 3, P.bark); }); if (g.drag) { R(c, Math.round(g.drag.x) - 2, Math.round(g.drag.y) - 16, 2, 14, P.wood); R(c, Math.round(g.drag.x) - 5, Math.round(g.drag.y) - 3, 8, 3, P.silver); } hud(c, g, 'Piles left: ' + g.p.filter(function (q) { return !q.out; }).length); };
    g.down = function (p) { g.drag = null; g.p.forEach(function (q) { if (!q.out && !g.drag && near(p, q.x, q.y, 12)) g.drag = q; }); };
    g.move = function (p, held) { if (g.drag && held) { g.drag.x = p.x; g.drag.y = p.y; } };
    g.up = function () { if (g.drag && g.drag.x > 156) { g.drag.out = 1; app().beep('toss'); } g.drag = null; if (g.p.every(function (q) { return q.out; })) g.win(); };
    return g;
  };
  BN.eggs = function () {
    var g = { title: 'Collect the eggs', how: 'Tap the eggs in the nest boxes to collect them. Gently!', fact: 'Collect eggs every day so they stay clean and the hens don\'t sit on them. A hen lays about one egg a day in long summer days.' };
    g.init = function () { g.e = []; for (var i = 0; i < 6; i++) if (Math.random() < 0.8 || i < 3) g.e.push({ x: 26 + i * 28, on: 1, c: i % 3 === 1 ? P.wood : P.white }); };
    g.draw = function (c) { stall(c); R(c, 10, 40, 172, 4, P.wood); for (var i = 0; i < 6; i++) { var x = 26 + i * 28; R(c, x - 12, 22, 24, 18, P.wood); R(c, x - 10, 24, 20, 16, P.bark); R(c, x - 10, 34, 20, 6, P.yellow); } g.e.forEach(function (q) { if (q.on) ell(c, q.x, 33, 3, 4, q.c); }); R(c, 80, 76, 32, 14, P.wood); R(c, 82, 78, 28, 8, P.sand); txt(c, g.e.filter(function (q) { return !q.on; }).length + ' eggs', 96, 92, P.white, 8); hud(c, g, 'Tap the eggs'); };
    g.down = function (p) { g.e.forEach(function (q) { if (q.on && near(p, q.x, 33, 9)) { q.on = 0; app().beep('ping'); } }); if (g.e.every(function (q) { return !q.on; })) g.win(); };
    return g;
  };
  BN.milk = function (an) {
    var g = { title: 'Milking time', how: 'Tap left, right, left, right (the two sides of the pail) to milk. Keep a steady rhythm to fill the pail!', fact: an === 'goats' ? 'Dairy goats are milked twice a day, about 12 hours apart. Clean hands and a clean udder keep the milk safe.' : 'Dairy cows are milked about twice a day. Cleaning the teats first keeps germs out of the milk and the udder healthy.' };
    g.init = function () { g.lv = 0; g.last = null; g.spill = 0; };
    g.step = function (dt) { g.lv = Math.max(0, g.lv - dt * 0.02); };
    g.draw = function (c) { stall(c); var col = an === 'goats' ? P.sand : P.white; R(c, 30, 20, 132, 30, col); if (an !== 'goats') { R(c, 50, 24, 20, 12, P.ink); R(c, 110, 30, 18, 10, P.ink); } ell(c, 96, 52, 16, 6, P.pink); R(c, 86, 56, 3, 6, P.pink); R(c, 103, 56, 3, 6, P.pink); R(c, 78, 72, 36, 28, P.silver); R(c, 80, 98 - Math.round(g.lv * 24), 32, Math.round(g.lv * 24), P.white); if (g.squirt) { line(c, g.squirt < 0 ? 87 : 104, 62, 96, 74, P.white); } txt(c, 'L', 30, 80, P.yellow, 12); txt(c, 'R', 162, 80, P.yellow, 12); hud(c, g, 'Fill the pail: ' + Math.floor(g.lv * 100) + '%'); };
    g.down = function (p) { var s = p.x < 96 ? -1 : 1; if (s !== g.last) { g.lv += 0.08; g.squirt = s; app().beep('slurp'); } else { g.spill++; g.say('Left, right, left, right!'); } g.last = s; setTimeout(function () { g.squirt = 0; }, 150); if (g.lv >= 1) g.win(); };
    return g;
  };
  BN.brush = function (an) {
    var g = { title: 'Grooming', how: 'Rub back and forth over the dusty spots to brush them away.', fact: an === 'sheep' ? 'Sheep get sheared once a year, usually in spring. Their wool never stops growing!' : 'Brushing a horse before riding finds cuts and stones early, and keeps dirt from rubbing under the saddle.' };
    g.init = function () { g.d = []; for (var i = 0; i < 8; i++) g.d.push({ x: rnd(44, 148), y: rnd(34, 58), v: 1 }); };
    g.draw = function (c) { stall(c); var col = an === 'sheep' ? P.white : P.wood; R(c, 36, 30, 120, 32, col); R(c, 146, 18, 18, 18, col); R(c, 44, 62, 6, 20, col); R(c, 140, 62, 6, 20, col); g.d.forEach(function (q) { if (q.v > 0) { c.globalAlpha = q.v; ell(c, Math.round(q.x), Math.round(q.y), 6, 3, P.bark); c.globalAlpha = 1; } }); hud(c, g, 'Brush the dust off'); };
    g.down = g.move = function (p, held) { if (held === false) return; g.d.forEach(function (q) { if (near(p, q.x, q.y, 10)) q.v = Math.max(0, q.v - 0.08); }); if (g.d.every(function (q) { return q.v <= 0; })) g.win(); };
    return g;
  };
  // which jobs each animal needs (feed and water always come first)
  PL.BARN_JOBS = { chickens: ['eggs', 'poop'], goats: ['milk', 'hay'], horse: ['brush', 'hay'], cow: ['milk', 'poop'], pigs: ['poop', 'hay'], sheep: ['brush', 'hay'], rabbits: ['poop'] };
  PL.BN_GAMES = BN;
})();
