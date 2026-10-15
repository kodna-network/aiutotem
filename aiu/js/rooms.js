/* AIU TOTEM 2.2.0 - more of Aiu's home and day, drawn in code like the rest of the world (our own pixel art).
   Rooms: a Korean-style kitchen (a retro gas range, a rice cooker, onggi jars and a low soban table) and a Japanese-style
   bathroom (a deep wooden ofuro tub, a wash stool and bucket, a sink and mirror, a noren curtain). The house shows a room
   only while Aiu is doing something in it. Outside (2.3.0): a Japanese food cart (yatai) where he cooks when the weather
   is nice; the outhouse is drawn with the rest of the property (world.js).
   New things he does: brushing his teeth, a bath, pan-frying, chopping vegetables, making tea, washing dishes, eating at the
   table, cooking at his food cart (with karate chops and an onion volcano), working on his laptop, catching bugs, weed
   whacking, playing fetch with the pet and hanging the laundry. Props are put away when he's done: the yard stays tidy. */
(function () {
  'use strict';
  var A = AIU.art, P = A.P, K = A.prim, R = K.R, px = K.px, spr = K.spr, disc = K.disc, ell = K.ell, tri = K.tri, line = K.line, U = AIU.util;
  var W = A.W, H = A.H, WIN = [15, 13, 42, 30];
  function dith(c, x, y, w, h, col, ph) { c.fillStyle = col; for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) if ((i + j + (ph || 0)) % 2 === 0) c.fillRect(x + i, y + j, 1, 1); }
  function win(c, frame, lattice) { // a window the sky shows through (left transparent, like the main room)
    R(c, WIN[0] - 3, WIN[1] - 3, WIN[2] + 6, WIN[3] + 6, frame); c.clearRect(WIN[0], WIN[1], WIN[2], WIN[3]);
    if (lattice === 'korean') { for (var x = WIN[0] + 6; x < WIN[0] + WIN[2]; x += 7) R(c, x, WIN[1], 1, WIN[3], frame); for (var y = WIN[1] + 6; y < WIN[1] + WIN[3]; y += 6) R(c, WIN[0], y, WIN[2], 1, frame); }
    else if (lattice === 'bamboo') { for (var x2 = WIN[0] + 3; x2 < WIN[0] + WIN[2]; x2 += 4) { R(c, x2, WIN[1], 1, WIN[3], P.green); if (x2 % 8 === 0) R(c, x2, WIN[1] + 9, 1, 1, P.lime); } R(c, WIN[0], WIN[1] + 14, WIN[2], 1, P.teal); }
    R(c, WIN[0] - 4, WIN[1] + WIN[3] + 3, WIN[2] + 8, 2, frame);
  }

  /* ---------- the kitchen (Korean style, with a retro gas range) ---------- */
  A.OVEN = { x: 108, top: 64 }; // the cooktop is at y = top
  function drawKitchen(c, sc) {
    R(c, 0, 0, W, 80, '#f2e3c4'); // warm hanji-paper wall
    for (var x = 0; x < W; x += 24) R(c, x, 0, 1, 56, P.sand);
    R(c, 0, 0, W, 3, P.bark); R(c, 0, 54, W, 2, P.bark); R(c, 0, 56, W, 24, P.wood); for (var x1 = 0; x1 < W; x1 += 8) R(c, x1, 57, 1, 23, P.bark); // wainscot
    win(c, P.bark, 'korean');
    if (A._in) A._in.roomDoor(c, sc.house, false); // 2.3.0: a way out of the kitchen
    // floor: warm ondol paper floor
    R(c, 0, 80, W, 28, P.yellow); for (var y = 84; y < H; y += 6) R(c, 0, y, W, 1, P.orange); for (var x2 = 10; x2 < W; x2 += 31) R(c, x2, 80, 1, 28, P.orange); R(c, 0, 80, W, 1, P.bark);
    // counter with a sink under the window, and a rice cooker
    R(c, 60, 75, 44, 24, P.wood); R(c, 60, 75, 44, 1, P.bark); R(c, 81, 77, 1, 21, P.bark); R(c, 64, 79, 14, 16, P.bark); R(c, 65, 80, 12, 14, P.wood); R(c, 85, 79, 15, 16, P.bark); R(c, 86, 80, 13, 14, P.wood); px(c, 76, 87, P.yellow); px(c, 87, 87, P.yellow);
    R(c, 59, 72, 46, 3, P.silver); R(c, 59, 72, 46, 1, P.white); R(c, 64, 72, 15, 2, P.slate); // countertop + sink
    R(c, 70, 64, 2, 8, P.silver); R(c, 70, 64, 6, 2, P.silver); px(c, 75, 66, P.sky); // faucet
    R(c, 88, 64, 12, 8, P.white); R(c, 89, 63, 10, 1, P.white); R(c, 88, 64, 12, 1, P.silver); px(c, 93, 68, P.pink); px(c, 94, 68, P.red); R(c, 92, 61, 4, 2, P.silver); // rice cooker
    // utensil rail with a ladle and a spatula
    R(c, 62, 46, 40, 1, P.silver); line(c, 70, 47, 70, 53, P.silver); disc(c, 70, 54, 1, P.silver); line(c, 80, 47, 80, 52, P.wood); R(c, 79, 52, 3, 2, P.silver); line(c, 92, 47, 92, 54, P.bark);
    // the retro gas range: cream enamel, chrome trim, four burners, a clock on the back panel, oven window, knobs, legs
    var ox = A.OVEN.x, ot = A.OVEN.top;
    R(c, ox - 1, ot - 9, 34, 9, P.white); R(c, ox - 1, ot - 9, 34, 1, P.silver); disc(c, ox + 16, ot - 5, 2, P.silver); px(c, ox + 16, ot - 5, P.ink); px(c, ox + 17, ot - 6, P.ink); // back panel + clock
    R(c, ox, ot, 32, 2, P.ink); [ox + 3, ox + 11, ox + 19, ox + 26].forEach(function (bx) { R(c, bx, ot - 1, 5, 1, P.dark); }); // cooktop + burner grates
    R(c, ox, ot + 2, 32, 32, '#f6edd8'); R(c, ox, ot + 2, 32, 1, P.silver); R(c, ox, ot + 33, 32, 1, P.silver); R(c, ox, ot + 2, 1, 32, P.silver); R(c, ox + 31, ot + 2, 1, 32, P.silver);
    [ox + 5, ox + 11, ox + 20, ox + 26].forEach(function (kx) { disc(c, kx, ot + 5, 1, P.ink); }); // knobs
    R(c, ox + 3, ot + 9, 26, 1, P.silver); R(c, ox + 4, ot + 11, 24, 15, P.silver); R(c, ox + 5, ot + 12, 22, 13, P.dark); R(c, ox + 6, ot + 13, 6, 2, P.slate); // oven door window
    R(c, ox + 4, ot + 28, 24, 3, P.sand); R(c, ox + 2, ot + 34, 3, 2, P.ink); R(c, ox + 27, ot + 34, 3, 2, P.ink); // drawer + legs
    // range hood
    R(c, ox + 2, 30, 28, 6, P.silver); tri(c, ox + 16, 24, 6, 1.6, P.silver); R(c, ox + 13, 0, 6, 24, P.silver); R(c, ox + 2, 35, 28, 1, P.slate);
    // shelf with bowls, a wall scroll, the low soban table with cushions, and onggi jars
    R(c, 144, 34, 40, 2, P.bark); [148, 156, 164].forEach(function (bx, i) { ell(c, bx + 3, 32, 3, 2, i === 1 ? P.sky : P.white, true); }); R(c, 172, 26, 8, 8, P.red); R(c, 173, 27, 6, 6, P.pink);
    R(c, 150, 8, 14, 22, P.white); R(c, 149, 7, 16, 1, P.bark); R(c, 149, 30, 16, 1, P.bark); line(c, 156, 12, 156, 25, P.ink); line(c, 154, 15, 158, 15, P.ink); line(c, 154, 20, 158, 21, P.ink); px(c, 160, 26, P.red);
    ell(c, 160, 93, 15, 2, P.bark); R(c, 147, 93, 26, 2, P.wood); R(c, 150, 95, 2, 4, P.bark); R(c, 168, 95, 2, 4, P.bark); // soban
    R(c, 140, 99, 10, 3, P.red); R(c, 172, 99, 10, 3, P.navy); // cushions
    [[178, 78, 6], [187, 76, 5]].forEach(function (j) { var jx = j[0], jy = j[1], r = j[2]; ell(c, jx, jy, r, r + 1, P.bark); ell(c, jx - 1, jy - 1, r - 2, r - 1, P.wood); R(c, jx - r + 1, jy - r - 2, r * 2 - 1, 2, P.bark); R(c, jx - 1, jy - r - 3, 3, 1, P.bark); }); // onggi
  }
  /* ---------- the bathroom (Japanese style) ---------- */
  function drawBath(c, sc) {
    R(c, 0, 0, W, 80, P.white); for (var y = 0; y < 80; y += 6) R(c, 0, y, W, 1, P.silver); for (var x = 0; x < W; x += 6) R(c, x, 0, 1, 80, P.silver);
    R(c, 0, 50, W, 30, P.cyan); for (var y2 = 50; y2 < 80; y2 += 6) R(c, 0, y2, W, 1, P.sky); for (var x2 = 0; x2 < W; x2 += 6) R(c, x2, 50, 1, 30, P.sky);
    win(c, P.wood, 'bamboo');
    R(c, 0, 80, W, 28, P.slate); for (var x3 = 0; x3 < W; x3 += 8) R(c, x3, 80, 1, 28, P.dark); for (var y3 = 86; y3 < H; y3 += 8) R(c, 0, y3, W, 1, P.dark); // tile floor
    R(c, 70, 84, 50, 24, P.sand); for (var x4 = 72; x4 < 120; x4 += 4) R(c, x4, 84, 1, 24, P.wood); // slatted wash-area floor (sunoko)
    // ofuro: a deep wooden tub with bands, and its water
    R(c, 14, 66, 52, 34, P.sand); R(c, 14, 66, 52, 2, P.wood); for (var b = 72; b < 100; b += 9) R(c, 14, b, 52, 1, P.wood); R(c, 14, 66, 1, 34, P.wood); R(c, 65, 66, 1, 34, P.wood);
    R(c, 16, 68, 48, 3, P.sky); R(c, 18, 68, 12, 1, P.cyan);
    // 2.3.0: the bathroom is an upstairs corner of the house now: the sink and mirror sit beside the tub
    R(c, 75, 47, 22, 14, P.silver); R(c, 76, 48, 20, 12, P.cyan); R(c, 78, 49, 3, 6, P.white); // mirror
    R(c, 72, 68, 28, 5, P.white); R(c, 72, 68, 28, 1, P.silver); R(c, 77, 69, 18, 2, P.silver); R(c, 83, 73, 6, 26, P.white); R(c, 83, 73, 1, 26, P.silver); R(c, 85, 62, 2, 6, P.silver); R(c, 85, 62, 5, 2, P.silver); // sink
    R(c, 94, 63, 4, 5, P.sky); line(c, 95, 59, 95, 63, P.red); line(c, 97, 60, 97, 63, P.green); // toothbrush cup
    // the doorway with a noren curtain
    R(c, 168, 18, 24, 80, P.bark); R(c, 170, 20, 22, 78, P.dark); R(c, 168, 20, 24, 26, P.navy); for (var n = 172; n < 192; n += 6) R(c, n, 26, 1, 20, P.ink); disc(c, 180, 30, 3, P.white); disc(c, 180, 30, 1, P.navy);
    // towel on a rail
    R(c, 100, 40, 18, 1, P.silver); R(c, 103, 41, 10, 10, P.pink); R(c, 103, 46, 10, 1, P.white);
  }
  A.ROOMS = { kitchen: drawKitchen, bath: drawBath };
  // where Aiu stands for each room activity (x); the scene uses it as spotX
  A.ROOMSPOT = { cookpan: 100, foodprep: 70, tea: 100, dishes: 72, eat: 76, brushteeth: 86, bath: 40, cook: 100 }; // 2.3.0: everything fits the dollhouse corners

  /* ---------- outside: Aiu's food cart (a Japanese yatai) in the front corner of the yard ----------
     2.3.0: it replaces the firepit. A wooden cart on two big wheels, a little roof, a noren curtain and red paper lanterns
     that glow in the evening. When Aiu cooks out here he's the chef inside it. (The outhouse is drawn by world.js now.) */
  A.FIRE = { x: 170, y: 101 }; // the cart's center and ground (old yard pixels)
  A.CART_P = { x: 106, y: 62, w: 28, h: 27 }; // its tap area on the property (2.3.1: behind the stream)
  A.DOORS = { bath: { x: 168, y: 18, w: 24, h: 80 } }; // 2.3.0: the bathroom's way out is its noren doorway
  A.behindHouse = function () {};
  A.yardFixtures = function () {};
  function lantern(c, x, y, on, f) { R(c, x, y, 1, 2, P.ink); R(c, x - 2, y + 2, 5, 7, on ? P.orange : P.red); R(c, x - 1, y + 1, 3, 1, P.ink); R(c, x - 1, y + 9, 3, 1, P.ink); R(c, x - 2, y + 4, 5, 1, P.plum); R(c, x - 2, y + 6, 5, 1, P.plum); if (on) { R(c, x - 1, y + 3, 3, 5, f % 7 ? P.yellow : P.orange); px(c, x, y + 4, P.white); } }
  A.yardBack = function (c, sc) { // behind Aiu: the cart's back wall
    if (sc.indoor) return; var cx = A.FIRE.x, b = A.FIRE.y;
    R(c, cx - 15, b - 37, 30, 20, P.bark); for (var x = cx - 15; x < cx + 15; x += 5) R(c, x, b - 37, 1, 20, P.ink);
    R(c, cx - 12, b - 34, 8, 3, P.wood); R(c, cx + 4, b - 34, 8, 3, P.wood); [cx - 11, cx - 8, cx + 5, cx + 8].forEach(function (bx, i) { R(c, bx, b - 36, 2, 2, i % 2 ? P.white : P.sky); }); // a shelf of bowls
  };
  A.yardLive = function (c, sc) { // in front of Aiu: the counter, wheels, posts, roof, noren and lanterns
    if (sc.indoor) return;
    var cx = A.FIRE.x, b = A.FIRE.y, f = sc.f, glow = sc.phase === 'dusk' || sc.phase === 'night', cooking = sc.act === 'hibachi', sway = f % 12 < 6 ? 0 : 1;
    R(c, cx - 17, b - 18, 34, 13, P.wood); for (var x = cx - 17; x < cx + 17; x += 4) R(c, x, b - 17, 1, 12, P.bark); R(c, cx - 18, b - 19, 36, 2, P.bark); R(c, cx - 18, b - 20, 36, 1, P.wood); // counter
    R(c, cx - 17, b - 6, 34, 1, P.ink); R(c, cx + 18, b - 16, 6, 1, P.bark); R(c, cx + 23, b - 16, 1, 6, P.bark); // under-edge, the push handle
    [cx - 11, cx + 10].forEach(function (wx) { disc(c, wx, b - 5, 5, P.ink); disc(c, wx, b - 5, 4, P.wood); disc(c, wx, b - 5, 1, P.bark); for (var k = 0; k < 4; k++) { var a = k / 4 * Math.PI + (cooking ? 0 : 0); line(c, wx, b - 5, Math.round(wx + Math.cos(a) * 3), Math.round(b - 5 + Math.sin(a) * 3), P.bark); } }); // wheels
    R(c, cx - 17, b - 39, 2, 20, P.bark); R(c, cx + 15, b - 39, 2, 20, P.bark); // posts
    R(c, cx - 22, b - 43, 44, 4, P.bark); R(c, cx - 23, b - 40, 46, 1, P.ink); R(c, cx - 20, b - 45, 40, 2, P.dark); R(c, cx - 4, b - 47, 8, 2, P.dark); // the roof
    if (sc.season === 'winter' || sc.weather === 'snow') R(c, cx - 22, b - 44, 44, 1, P.white);
    for (var n = 0; n < 5; n++) { var nx = cx - 15 + n * 6, nh = 6 + (n % 2 ? sway : 0); R(c, nx, b - 39, 5, nh, P.navy); R(c, nx, b - 39 + nh - 2, 5, 1, P.white); } // the noren (a white stripe along its hem)
    lantern(c, cx - 20, b - 40, glow || cooking, f); lantern(c, cx + 20, b - 40, glow || cooking, f + 3);
    if (glow) { c.globalAlpha = 0.18; disc(c, cx - 20, b - 34, 7, P.yellow); disc(c, cx + 20, b - 34, 7, P.yellow); c.globalAlpha = 1; }
    [cx - 8, cx + 8].forEach(function (sx) { R(c, sx - 3, b - 4, 7, 2, P.red); R(c, sx - 1, b - 2, 1, 3, P.ink); R(c, sx + 1, b - 2, 1, 3, P.ink); }); // two stools
  };
  function flames(c, x, y, f, big) { // little cooking flames
    var h0 = big ? 4 : 3;
    for (var i = -2; i <= 2; i++) { var hh = Math.max(1, Math.round(h0 - Math.abs(i) + ((f + i * 3) % 2))); R(c, x + i, y - hh, 1, hh, Math.abs(i) > 1 ? P.red : P.orange); if (hh > 2) px(c, x + i, y - hh + 1, P.yellow); }
  }

  /* ---------- the activities ---------- */
  var ACT = A.ACTIVITIES, DRAW = A.ACT_DRAW;
  function add(id, def, draw) { ACT[id] = def; if (draw) DRAW[id] = draw; }
  var STOOL = function (c, x, fy) { R(c, x - 6, fy - 5, 12, 2, P.wood); R(c, x - 5, fy - 3, 2, 3, P.bark); R(c, x + 3, fy - 3, 2, 3, P.bark); };
  function sizzle(c, x, y, f) { for (var i = 0; i < 4; i++) { var t = (f * 2 + i * 5) % 10; px(c, x - 4 + ((i * 7 + f) % 9), y - 1 - Math.floor(t / 2), t < 5 ? P.yellow : P.white); } }
  function steam(c, x, y, f, n) { for (var i = 0; i < (n || 3); i++) { var t = (f + i * 4) % 12; px(c, x + i * 3 - 3 + (t % 3 === 0 ? 1 : 0), y - t, P.white); if (t < 6) px(c, x + i * 3 - 2, y - t - 1, P.silver); } }
  // pan-frying at the gas range: a stool to reach, blue flame, oil sizzle, food that flips
  add('cookpan', { label: 'pan-frying at the stove', where: 'in', base: true, room: 'kitchen' }, {
    pose: function (f) { return { dy: -5 + (f % 8 < 4 ? 0 : -1), flip: false, eyes: f % 16 < 3 ? 'happy' : 'open' }; },
    back: function (c, x, fy) { STOOL(c, x, fy); },
    front: function (c, x, fy, f, cw, ch) {
      var ot = A.OVEN.top, bx = A.OVEN.x + 5; for (var i = 0; i < 3; i++) px(c, bx + i, ot - 1, f % 2 ? P.sky : P.blue); // flame under the pan
      R(c, bx - 4, ot - 3, 12, 2, P.dark); R(c, bx - 3, ot - 4, 10, 1, P.slate); line(c, bx - 4, ot - 3, x + 4, fy - Math.round(ch * 0.5) - 5, P.ink); // pan + handle to his hand
      var k = (f % 14) / 14, up = k > 0.55 && k < 0.95 ? Math.sin((k - 0.55) / 0.4 * Math.PI) * 9 : 0; R(c, bx, ot - 6 - Math.round(up), 4, 2, up ? P.yellow : P.orange); px(c, bx + 1, ot - 6 - Math.round(up), P.white); // the food flips
      sizzle(c, bx + 2, ot - 5, f); steam(c, bx + 2, ot - 9, f, 2);
    } });
  add('foodprep', { label: 'chopping vegetables', where: 'in', base: true, room: 'kitchen' }, {
    pose: function (f) { return { dy: -5, eyes: 'open' }; },
    back: function (c, x, fy) { STOOL(c, x, fy); },
    front: function (c, x, fy, f) {
      var by = 71, bx = x + 4; R(c, bx - 2, by - 1, 14, 2, P.wood); R(c, bx - 2, by - 1, 14, 1, P.sand); // cutting board on the counter
      var up = f % 4 < 2; line(c, bx + 6, by - (up ? 7 : 2), bx + 9, by - (up ? 9 : 4), P.silver); R(c, bx + 9, by - (up ? 10 : 5), 2, 2, P.bark); // knife
      for (var i = 0; i < 4; i++) R(c, bx + i * 2, by - 2, 1, 1, i % 2 ? P.green : P.orange); if (!up) { px(c, bx + 5, by - 4, P.lime); px(c, bx + 11, by - 3, P.orange); }
    } });
  add('tea', { label: 'making tea', where: 'in', base: true, room: 'kitchen' }, {
    pose: function (f, sc) { var t = (sc.tsec || 0) % 30; return { dy: -5, eyes: t > 22 ? 'happy' : 'open' }; },
    back: function (c, x, fy) { STOOL(c, x, fy); },
    front: function (c, x, fy, f, cw, ch, sc) {
      var t = (sc.tsec || 0) % 30, ot = A.OVEN.top, kx = A.OVEN.x + 21;
      if (t < 18) { R(c, kx, ot - 7, 8, 6, P.red); R(c, kx + 1, ot - 8, 6, 1, P.red); line(c, kx + 8, ot - 5, kx + 11, ot - 8, P.red); px(c, kx + 3, ot - 9, P.ink); for (var i = 0; i < 3; i++) px(c, kx + 2 + i * 2, ot - 1, P.blue); if (t > 10) steam(c, kx + 11, ot - 10, f, 3); } // the kettle comes to a boil
      else { var cx = x + 8, cy = fy - Math.round(ch * 0.55); R(c, cx, cy, 8, 6, P.red); line(c, cx + 8, cy + 2, cx + 11, cy - 1, P.red); if (t < 24) for (var j = 0; j < 3; j++) px(c, cx + 11, cy + j + (f % 2), P.wood); R(c, cx + 9, cy + 5, 5, 4, P.white); steam(c, cx + 11, cy + 3, f, 2); } // pouring a cup
    } });
  add('dishes', { label: 'washing the dishes', where: 'in', base: true, room: 'kitchen' }, {
    pose: function (f) { return { dy: -5 + (f % 4 < 2 ? 0 : -1), eyes: 'open' }; },
    back: function (c, x, fy) { STOOL(c, x, fy); },
    front: function (c, x, fy, f) { var sx = 66; R(c, sx, 70, 14, 2, P.sky); for (var i = 0; i < 5; i++) { var t = (f + i * 3) % 9; disc(c, sx + 2 + i * 3, 69 - Math.floor(t / 3), t < 4 ? 1 : 0, P.white); } ell(c, sx + 8 + (f % 4 < 2 ? 1 : -1), 69, 3, 1, P.white); px(c, sx + 8, 68, P.sky); } });
  // a meal at the soban table (it replaces the old snack)
  DRAW.eat = { pose: function (f) { return { dy: 2, eyes: f % 12 < 5 ? 'happy' : 'open' }; },
    front: function (c, x, fy, f) { var t0 = 76; ell(c, t0, 97, 15, 2, P.bark); R(c, t0 - 13, 97, 26, 2, P.wood); R(c, t0 - 10, 99, 2, 4, P.bark); R(c, t0 + 8, 99, 2, 4, P.bark); ell(c, t0 - 6, 95, 3, 2, P.white, true); R(c, t0 - 8, 93, 5, 1, P.white); ell(c, t0 + 3, 95, 3, 2, P.red, true); steam(c, t0 + 3, 91, f, 2); line(c, t0 + 7, 94, t0 + 11, 90, P.wood); line(c, t0 + 8, 94, t0 + 12, 90, P.wood); if (f % 8 < 3) px(c, x - 1, fy - 18, P.white); } };
  ACT.eat.room = 'kitchen'; ACT.eat.label = 'having a meal at the table';
  if (ACT.cook) { ACT.cook.room = 'kitchen'; ACT.cook.where = 'both'; DRAW.cook = DRAW.cookpan; }
  // the bathroom: brushing his teeth at the sink (on a stool), a soak in the ofuro
  add('brushteeth', { label: 'brushing his teeth', where: 'in', base: true, room: 'bath' }, {
    pose: function (f) { return { dy: -5, eyes: f % 10 < 2 ? 'blink' : 'open', dx: f % 4 < 2 ? 0 : 1 }; },
    back: function (c, x, fy) { STOOL(c, x, fy); },
    front: function (c, x, fy, f, cw, ch) { var my = fy - Math.round(ch * 0.62) - 5, mx = x + Math.round(cw / 2) - 2, w = f % 2 ? 2 : 0; R(c, mx - 2 + w, my, 7, 1, P.green); R(c, mx + 3 + w, my - 1, 2, 1, P.white); for (var i = 0; i < 3; i++) { var t = (f + i * 4) % 10; disc(c, mx - 3 + i * 2, my + 2 - Math.floor(t / 3), t < 6 ? 1 : 0, P.white); } } });
  add('bath', { label: 'soaking in the bath', where: 'in', base: true, room: 'bath' }, {
    pose: function (f) { return { dy: -10, eyes: f % 20 < 14 ? 'sleep' : 'happy' }; },
    front: function (c, x, fy, f) { // the front of the tub covers him up to the shoulders
      R(c, 14, 78, 52, 22, P.sand); for (var b = 81; b < 100; b += 9) R(c, 14, b, 52, 1, P.wood); R(c, 14, 78, 52, 1, P.wood); R(c, 14, 78, 1, 22, P.wood); R(c, 65, 78, 1, 22, P.wood);
      R(c, 16, 76, 48, 2, P.sky); R(c, 20 + (f % 6), 76, 6, 1, P.cyan);
      spr(c, 52, 72 + (f % 8 < 4 ? 0 : 1), ['.yy.', 'yyyo', '.yy.']); // a rubber duck
      steam(c, 30, 70, f, 4); steam(c, 46, 70, f + 5, 3);
    } });
  // outdoors (2.3.0): Aiu is the chef inside his food cart: skewers on the grill, a pot of noodle soup, flipping and
  // karate-chopping, steam rising, and now and then a little onion volcano. (The id stays 'hibachi' for his routine.)
  add('hibachi', { label: 'cooking at his food cart', where: 'out', base: true }, {
    pose: function (f, sc) { var t = (sc.tsec || 0) % 12; return { dx: A.FIRE.x - 2 - A.AIU_OUT, dy: -9 + (t % 1.5 < 0.2 ? -2 : 0), eyes: t > 9 ? 'happy' : 'open' }; },
    front: function (c, x, fy, f, cw, ch, sc) {
      var cx = A.FIRE.x, top = A.FIRE.y - 21, t = (sc.tsec || 0) % 12;
      R(c, cx - 15, top, 12, 2, P.dark); R(c, cx - 15, top - 1, 12, 1, P.slate); flames(c, cx - 9, top + 1, f, true); // the grill
      [0, 1, 2].forEach(function (k) { var sx = cx - 14 + k * 4, up = ((sc.tsec || 0) * 1.1 + k) % 4 < 0.5 ? 3 : 0; line(c, sx, top - 2 - up, sx + 2, top - 5 - up, P.sand); R(c, sx, top - 3 - up, 2, 2, k === 1 ? P.green : P.orange); }); // skewers turning
      R(c, cx + 4, top - 6, 10, 6, P.slate); R(c, cx + 3, top - 7, 12, 1, P.silver); R(c, cx + 5, top - 5, 8, 1, P.yellow); // the soup pot
      for (var i = 0; i < 4; i++) { var st = (f + i * 3) % 12; px(c, cx + 5 + i * 2 + (st % 3 === 0 ? 1 : 0), top - 8 - st, P.white); }
      var chop = (f % 6) < 3, hx = x + Math.round(cw / 2) + 1, hy = chop ? top - 2 : top - 9; R(c, hx, hy, 4, 2, P.white); R(c, hx + 3, hy - 1, 1, 3, P.silver); // spatula hand
      if (chop) { px(c, hx + 5, top - 3, P.yellow); px(c, hx + 2, top - 4, P.white); }
      if (t > 8 && t < 11) { var ox = cx - 9, oy = top - 4, r = Math.floor((t - 8) * 4); ell(c, ox, oy, 2, 1, P.white, true); flames(c, ox, oy - 1, f, false); ell(c, ox, oy - 7 - r, 1 + Math.floor(r / 3), 1, P.silver, true); } // onion volcano
      if (t < 2) { R(c, cx - 2, top - 3, 5, 3, P.white); R(c, cx - 1, top - 3, 3, 1, P.yellow); } // a bowl handed over the counter
    } });
  // working on his laptop (inside, on the rug)
  add('laptop', { label: 'working on his laptop', where: 'in', base: true }, {
    pose: function (f) { return { dy: 1, eyes: f % 30 < 2 ? 'blink' : 'open' }; },
    front: function (c, x, fy, f, cw, ch) { var lx = x - 7, ly = fy - Math.round(ch * 0.4); R(c, lx, ly + 6, 14, 2, P.slate); R(c, lx + 1, ly - 2, 12, 8, P.dark); R(c, lx + 2, ly - 1, 10, 6, P.navy); for (var i = 0; i < 3; i++) R(c, lx + 3, ly + i * 2, 2 + ((f + i * 3) % 6), 1, i === 1 ? P.lime : P.cyan); if (f % 2) px(c, lx + 4 + (f % 8), ly + 7, P.white); } });
  // catching bugs with a net (fireflies at dusk), and a jar for the catch
  add('bugnet', { label: 'catching bugs', where: 'out', base: true }, {
    pose: function (f, sc) { var t = (sc.tsec || 0) * 0.8; return { dx: Math.round(Math.sin(t) * 12), flip: Math.cos(t) < 0, dy: f % 6 < 2 ? -2 : 0, eyes: 'happy' }; },
    back: function (c, x, fy, f, cw, ch, sc) { var jx = A.AIU_OUT - 26, glow = sc.phase === 'dusk' || sc.phase === 'night'; R(c, jx, fy - 8, 6, 8, P.silver); R(c, jx + 1, fy - 7, 4, 6, glow ? P.navy : P.cyan); R(c, jx, fy - 9, 6, 1, P.bark); for (var i = 0; i < 3; i++) if ((f + i * 2) % 6 < 4) px(c, jx + 1 + i, fy - 6 + i, glow ? P.yellow : P.ink); },
    front: function (c, x, fy, f, cw, ch, sc) {
      var t = (sc.tsec || 0) * 0.8, d = Math.cos(t) < 0 ? -1 : 1, hx = x + d * Math.round(cw / 2), sw = Math.sin(t * 3), nx = hx + d * (6 + Math.round(sw * 3)), ny = fy - ch - 6 - Math.round(Math.abs(sw) * 4);
      line(c, hx, fy - Math.round(ch * 0.5), nx, ny + 3, P.wood); ell(c, nx, ny, 3, 2, P.white); dith(c, nx - 2, ny + 1, 5, 4, P.silver, f % 2);
      var glow = sc.phase === 'dusk' || sc.phase === 'night';
      for (var i = 0; i < 4; i++) { var bx = Math.round(x + Math.sin(t * 1.7 + i * 1.9) * 26), by = Math.round(fy - 30 - Math.cos(t * 2.3 + i) * 10); px(c, bx, by, glow ? (f % 3 ? P.yellow : P.lime) : i % 2 ? P.ink : P.orange); if (!glow) px(c, bx + 1, by - 1, P.white); }
    } });
  // weed whacking: a string trimmer, grass flying, a neat strip behind him
  add('weedwhack', { label: 'weed whacking the grass', where: 'out', base: true, need: 'grass' }, {
    pose: function (f, sc) { var t = ((sc.tsec || 0) * 0.35) % 2, k = t < 1 ? t : 2 - t; return { dx: Math.round(-20 + k * 40), flip: t >= 1, dy: f % 2 ? 0 : -1, eyes: 'open' }; },
    back: function (c, x, fy, f, cw, ch, sc) { var t = ((sc.tsec || 0) * 0.35) % 2, from = A.AIU_OUT - 20, to = Math.round(x); R(c, Math.min(from, to) - 4, fy + 1, Math.abs(to - from) + 8, 1, sc.season === 'fall' ? P.orange : P.lime); void t; },
    front: function (c, x, fy, f, cw, ch, sc) {
      var t = ((sc.tsec || 0) * 0.35) % 2, d = t >= 1 ? -1 : 1, hx = x + d * Math.round(cw / 2), ex = hx + d * 12, ey = fy - 1;
      line(c, hx, fy - Math.round(ch * 0.55), ex, ey, P.slate); R(c, hx - 1, fy - Math.round(ch * 0.55) - 2, 4, 3, P.orange); // shaft + motor
      var sp = f % 2; R(c, ex - 3, ey, 7, 1, sp ? P.white : P.silver); px(c, ex - 3 + (sp ? 6 : 0), ey - 1, P.white);
      for (var i = 0; i < 5; i++) { var k = (f * 2 + i * 3) % 10; px(c, ex + d * (2 + k), ey - 2 - Math.floor(k * (10 - k) / 8), i % 2 ? P.green : P.lime); }
    } });
  // fetch with the pet: the ball arcs over and back
  add('fetch', { label: 'playing fetch with the pet', where: 'out', base: true }, {
    pose: function (f, sc) { var k = ((sc.tsec || 0) % 4) / 4; return { dy: k < 0.1 ? -2 : 0, flip: true, eyes: k > 0.85 ? 'happy' : 'open' }; },
    front: function (c, x, fy, f, cw, ch, sc) {
      var k = ((sc.tsec || 0) % 4) / 4, hd = A.buddyHead || { x: A.BUDDY_OUT.x + 18, y: fy - 22 }, sx = x - Math.round(cw / 2), sy = fy - Math.round(ch * 0.6), tx = hd.x + 2, ty = hd.y + 2, p, bx, by;
      if (k < 0.45) { p = k / 0.45; bx = sx + (tx - sx) * p; by = sy + (ty - sy) * p - Math.sin(p * Math.PI) * 22; }
      else if (k < 0.55) { bx = tx; by = ty; if (AIU.play && AIU.play.fetched) AIU.play.fetched(); }
      else { p = (k - 0.55) / 0.45; bx = tx + (sx - tx) * p; by = ty + (sy - ty) * p - Math.sin(p * Math.PI) * 14; }
      spr(c, Math.round(bx) - 1, Math.round(by) - 1, ['.y.', 'ylg', '.g.']);
    } });
  // hanging the laundry on a line between two posts
  add('laundry', { label: 'hanging the laundry', where: 'out', base: true }, {
    pose: function (f, sc) { var t = (sc.tsec || 0) % 20; return { dx: 14 + Math.round(t), dy: f % 6 < 3 ? 0 : -1, eyes: 'open' }; },
    back: function (c, x, fy, f, cw, ch, sc) {
      var x0 = A.AIU_OUT + 6, x1 = A.AIU_OUT + 50, ly = fy - 30, n = Math.min(5, 1 + Math.floor(((sc.tsec || 0) % 20) / 4)), cols = [sc.accent || P.red, P.sky, P.white, P.yellow, P.lime];
      R(c, x0, ly, 1, 30, P.bark); R(c, x1, ly, 1, 30, P.bark); line(c, x0, ly + 1, x1, ly + 2, P.silver);
      for (var i = 0; i < n; i++) { var cx = x0 + 4 + i * 8, sway = (f + i) % 4 < 2 ? 0 : 1; R(c, cx + sway, ly + 2, 6, 7, cols[i]); R(c, cx - 1 + sway, ly + 2, 8, 2, cols[i]); px(c, cx + 2, ly + 1, P.wood); }
    } });

  // routines: the time of day picks some of these (see app.js pickActivity): morning teeth, meals at the table, cooking first
  A.ROUTINE = [
    [420, 422, 'brushteeth'], [430, 434, 'cookpan'], [434, 439, 'eat'], // 2.4.0: short and lively (teeth 2 min, cooking 4, a meal 5)
    [716, 720, 'cookpan'], [720, 723, 'foodprep'], [723, 728, 'eat'], // lunch: cooked at the food cart when it's nice out
    [1065, 1069, 'cookpan'], [1069, 1074, 'eat'], [1074, 1077, 'dishes'],
    [1290, 1292, 'brushteeth']
  ];
})();
