/* AIU TOTEM 2.3.0 - the property: one fixed picture of Aiu's whole place, laid out like an old painted garden (a high
   horizon, the ground tilting up to fill the frame, little landmarks spread across the middle distance, a busy field in
   front). Drawn in code, our own pixel art.
     Top:       sky, the drone, far hills (they fade to blue, like old paintings)
     Middle:    the house in the center, the barn and the greenhouse on the left, the garage and the lab on the right,
                a tool shed and a well by the path, the outhouse tucked behind the house (its moon door peeking out),
                a stream with a little bridge
     Field:     a round pond in the middle, where Aiu plays and the pet and the animals roam
     Front:     the bounty board (bottom left), Aiu's food cart (bottom right), tall grass and flowers
   The canvas is drawn 4x bigger than the art so things can be drawn at 3/4 or 5/4 size and stay crisp (the house is 3/4
   size, the horse is bigger than the cat). Rooms (the house, the kitchen, the bathroom) are the same 192x108 pictures as
   before, under a strip of wall with a regulator clock.
   Coordinates: property = 192x270 (2.8.0; it was 192x144, and everything above y 144 kept its place). The old "yard" pictures (Aiu's activities, the pet) are drawn shifted by A.YARD. */
(function () {
  'use strict';
  var U = AIU.util, A = AIU.art, P = A.P, K = A.prim, R = K.R, px = K.px, spr = K.spr, disc = K.disc, ell = K.ell, tri = K.tri, line = K.line, dith = K.dith, IN = A._in;
  var W = 192, H = 270, OFF = 36, SC = 4; // 2.8.0: the yard is 270 tall, the same as the house (it was 144)
  A.H = H; A.YARD_H = H; A.SCALE = SC; A.ROOM_OFF = OFF;
  A.YARD = { x: -8, y: 31 }; // where the old yard's coordinates land in the property (Aiu's spot 136,97 -> 128,128)
  var SKYOFF = { x: -54, y: -28 }; // 2.4.0: the drone hovers in the sky right above the house (it used to drift off the top)
  function app() { return AIU.app; }
  function mk(w, h) { var cv = document.createElement('canvas'); cv.width = w; cv.height = h; return cv; }
  function big(w, h) { var cv = mk(w * SC, h * SC), c = cv.getContext('2d'); c.imageSmoothingEnabled = false; c.setTransform(SC, 0, 0, SC, 0, 0); return cv; }
  A.isRoom = function (sc) { if (A.CASTLE) return !!(sc && sc.place && sc.place !== 'home'); return !!(sc && (sc.indoor || (sc.place && sc.place !== 'home'))); }; // 3.0: in the castle, only the library is a separate room
  A.frameOff = function (sc) { if (A.CASTLE && AIU.castle && !A.isRoom(sc)) return AIU.castle.frameOff(); if (!A.isRoom(sc)) return A.YARD; if (sc.place === 'library') return { x: 0, y: OFF }; var ar = A.aiuArea(sc); return { x: ar.px - ar.sx, y: ar.py - ar.sy }; };
  A.toOld = function (pt, sc) { var o = A.frameOff(sc); return pt ? { x: pt.x - o.x, y: pt.y - o.y } : null; };

  /* ---------- the layout ---------- */
  var HOUSE_DOOR = { x: 96, y: 75 }, HS = 0.75; // the house is drawn at 3/4 size, its door here
  A.LANDMARKS = [ // tap one: Aiu walks there and you go in. r = the tap area, door = where he walks to
    { id: 'barn', r: { x: 4, y: 34, w: 32, h: 30 }, door: { x: 20, y: 62 } },
    { id: 'lab', r: { x: 158, y: 30, w: 34, h: 34 }, door: { x: 176, y: 62 } },
    { id: 'greenhouse', r: { x: 33, y: 62, w: 30, h: 22 }, door: { x: 48, y: 82 } },
    { id: 'garage', r: { x: 141, y: 62, w: 32, h: 22 }, door: { x: 157, y: 82 } },
    { id: 'shed', r: { x: 64, y: 70, w: 16, h: 16 }, door: { x: 72, y: 85 } },
    { id: 'well', r: { x: 57, y: 32, w: 18, h: 24 }, door: { x: 66, y: 54 } }, // 2.3.1: behind the house (left), across from the outhouse
    { id: 'outhouse', r: { x: 109, y: 32, w: 13, h: 12 }, door: { x: 116, y: 52 } },
    { id: 'house', r: { x: 70, y: 28, w: 52, h: 48 }, door: HOUSE_DOOR },
    { id: 'board', r: { x: -99, y: -99, w: 0, h: 0 }, door: { x: 46, y: 132 } } // 2.4.0: where Aiu stands for the stand-up (the board's own tap is in hitAt)
  ];
  A.BOARD_P = { x: 3, y: 103, w: 36, h: 36 }; // the bounty board (bottom left), bigger
  A.AIU_SPOT = { x: 128, y: 128 };
  A.landmarkAt = function (pt) { for (var i = 0; i < A.LANDMARKS.length; i++) { var L = A.LANDMARKS[i], r = L.r; if (pt.x >= r.x && pt.x <= r.x + r.w && pt.y >= r.y && pt.y <= r.y + r.h) return L; } return null; };
  A.landmark = function (id) { return A.LANDMARKS.filter(function (L) { return L.id === id; })[0]; };
  /* 2.8.0: every building has a fixed spot (Arrange is gone). The yard is as tall as the house now (192x270), so it has room:
     behind the stream, the back row (the barn, the well, the house, the outhouse and the lab); in front of the field, the front
     yard: the greenhouse and the garage, drawn at 5/4 size (they're closer), and the tool shed by the vegetable garden.
     A moved building is drawn by its own code at its old place, then shifted (and scaled) to its spot; its tap area and door
     move with it. HOME = where each building's code draws it (its center and its base line). */
  var HOME = { barn: { cx: 19, b: 62 }, lab: { cx: 177, b: 62 }, greenhouse: { cx: 48, b: 82 }, garage: { cx: 158, b: 82 }, shed: { cx: 72, b: 85 }, well: { cx: 66, b: 54 }, outhouse: { cx: 115, b: 50 } };
  var SPOTS = { greenhouse: { cx: 44, b: 186, s: 1.25 }, garage: { cx: 150, b: 186, s: 1.25 }, shed: { cx: 30, b: 236, s: 1.25 } };
  A.BUILDINGS = Object.keys(HOME);
  function spotOf(b) { var h0 = HOME[b], sp = SPOTS[b]; return sp ? sp : { cx: h0.cx, b: h0.b, s: 1 }; }
  function moveR(b, r) { var h0 = HOME[b], sp = spotOf(b); return { x: Math.round(sp.cx + (r.x - h0.cx) * sp.s), y: Math.round(sp.b + (r.y - h0.b) * sp.s), w: Math.round(r.w * sp.s), h: Math.round(r.h * sp.s) }; }
  function moveP(b, p) { var h0 = HOME[b], sp = spotOf(b); return { x: Math.round(sp.cx + (p.x - h0.cx) * sp.s), y: Math.round(sp.b + (p.y - h0.b) * sp.s) }; }
  A.LANDMARKS.forEach(function (L) { if (SPOTS[L.id]) { L.r = moveR(L.id, L.r); L.door = moveP(L.id, L.door); } });
  function atSpot(c, b, fn) { var h0 = HOME[b], sp = spotOf(b); c.save(); c.translate(sp.cx, sp.b); c.scale(sp.s, sp.s); c.translate(-h0.cx, -h0.b); fn(); c.restore(); }

  /* ---------- the static picture (cached) ---------- */
  var stat = { key: null, cv: null, houseCv: null, houseLit: null, mask: null };
  function hillLine(c, base, amp, freq, ph, col, x0, x1) { for (var x = x0 || 0; x < (x1 || W); x++) { var h = base - Math.round(amp * (0.5 + 0.5 * Math.sin(x * freq + ph))); R(c, x, h, 1, 60, col); } }
  function cols(sc) {
    var s = sc.season, b = sc.biome, g = IN.groundCols(b, s);
    var far = b === 'desert' ? [P.orange, P.sand] : b === 'tundra' || s === 'winter' ? [P.silver, P.white] : [P.sky, P.teal];
    var water = s === 'winter' || b === 'tundra' ? [P.silver, P.white] : b === 'desert' ? [P.sand, P.wood] : [P.blue, P.sky];
    return { g0: g[0], g1: g[1], far: far, water: water, field: b === 'desert' || b === 'beach' ? P.sand : g[0] };
  }
  function streamY(x) { return 86 + Math.round(x * 0.035 + Math.sin(x * 0.07) * 2.5); }
  function drawStatic(sc) {
    var cv = big(W, H), c = cv.getContext('2d'), C0 = cols(sc), r = U.rng(U.hash32(sc.biome + sc.season + sc.house));
    // far hills (bluish) and the near rise of the property
    if (sc.biome === 'beach') { R(c, 0, 38, W, 10, P.blue); for (var w = 0; w < 10; w++) R(c, (w * 37) % W, 40 + (w % 3) * 2, 6, 1, P.sky); }
    else if (sc.biome === 'tundra') { tri(c, 30, 14, 28, 1.3, P.silver); tri(c, 30, 14, 8, 1.3, P.white); tri(c, 150, 18, 24, 1.4, P.silver); tri(c, 150, 18, 7, 1.4, P.white); tri(c, 96, 24, 18, 1.2, P.slate); }
    else if (sc.biome === 'desert') { R(c, 14, 30, 30, 12, P.orange); R(c, 14, 30, 30, 2, P.red); R(c, 146, 33, 34, 10, P.orange); R(c, 146, 33, 34, 2, P.red); }
    hillLine(c, 40, 6, 0.045, 1, C0.far[0]); dith(c, 0, 36, W, 3, C0.far[1], 0);
    hillLine(c, 46, 5, 0.06, 3, sc.biome === 'forest' ? P.teal : C0.g1);
    R(c, 0, 48, W, H - 48, C0.g0);
    for (var i = 0; i < 160; i++) px(c, Math.floor(r() * W), 46 + Math.floor(r() * (H - 46)), C0.g1); // grass flecks
    // trees and bushes along the far rise, between the buildings
    var kinds = { meadow: 'round', forest: 'pine', desert: 'cactus', tundra: 'pine', pond: 'round', beach: 'palm' }, tk = kinds[sc.biome] || 'round';
    [44, 132, 156].forEach(function (x, j) { IN.tree(c, tk, x, 52 + (j % 2) * 2, sc.season); });
    if (sc.biome === 'forest') [2, 186, 190].forEach(function (x) { IN.tree(c, 'pine', x, 76, sc.season); });
    // the stream, with a little arched bridge on the path
    for (var x = 0; x < W; x++) { var y = streamY(x); R(c, x, y, 1, 5, C0.water[0]); if ((x + y) % 7 === 0) px(c, x, y + 1, C0.water[1]); px(c, x, y - 1, P.ink); px(c, x, y + 5, C0.g1); }
    // the path: from the house door, over the bridge, into the field
    for (var py = HOUSE_DOOR.y + 1; py < 104; py++) { var hw = 2 + Math.floor((py - HOUSE_DOOR.y) / 9); dith(c, 96 - hw, py, hw * 2 + 1, 1, sc.biome === 'desert' || sc.biome === 'beach' ? P.wood : P.sand, py % 2); }
    var by = streamY(96); R(c, 88, by - 2, 17, 2, P.wood); R(c, 87, by, 19, 2, P.bark); for (var bx = 89; bx < 105; bx += 3) R(c, bx, by - 4, 1, 2, P.bark); R(c, 88, by - 5, 17, 1, P.wood);
    R(c, 107, by - 15, 1, 14, P.ink); R(c, 106, by - 1, 3, 1, P.ink); R(c, 105, by - 20, 5, 6, P.ink); R(c, 106, by - 19, 3, 4, P.dark); R(c, 105, by - 21, 5, 1, P.bark); px(c, 107, by - 22, P.bark); // 2.4.0: a lantern by the bridge
    // the pond in the middle of the field
    var pc = { x: 96, y: 118 }, pondCol = C0.water;
    ell(c, pc.x, pc.y + 1, 23, 7, P.ink); ell(c, pc.x, pc.y, 22, 6, pondCol[0]); ell(c, pc.x - 4, pc.y - 1, 14, 3, pondCol[1]); ell(c, pc.x - 7, pc.y - 2, 5, 1, P.white);
    if (sc.biome !== 'desert' && sc.season !== 'winter') { ell(c, pc.x + 12, pc.y + 2, 3, 1, P.green); ell(c, pc.x - 15, pc.y + 3, 2, 1, P.green); IN.tree(c, 'reeds', pc.x + 18, pc.y + 2, sc.season); }
    // flowers in the field (spring and summer)
    if ((sc.season === 'spring' || sc.season === 'summer') && sc.biome !== 'desert' && sc.biome !== 'tundra') for (var fl = 0; fl < 22; fl++) { var fx = Math.floor(r() * W), fy = 98 + Math.floor(r() * 44); px(c, fx, fy, U.pick(r, [P.pink, P.yellow, P.white])); px(c, fx, fy + 1, P.green); }
    biomeDecor(c, sc, r); // 2.4.0: each land has its own little details
    // the buildings
    // 2.8.0: each building at its spot, back to front (the front yard ones come after the house, below)
    var DRAW = { outhouse: function () { outhouse(c, sc); }, well: function () { well(c, 60, 54, sc); }, barn: function () { barn(c, 6, 62, sc); }, lab: function () { lab(c, 162, 62, sc); }, greenhouse: function () { greenhouse(c, 35, 82, sc); }, garage: function () { garage(c, 143, 82, sc); }, shed: function () { shed(c, 65, 85, sc); } };
    var back = A.BUILDINGS.filter(function (b) { return !SPOTS[b]; }), front = A.BUILDINGS.filter(function (b) { return SPOTS[b]; });
    back.sort(function (a0, b0) { return HOME[a0].b - HOME[b0].b; }).forEach(function (b) { atSpot(c, b, DRAW[b]); });
    // the house, 3/4 size (drawn from the same house pictures as always)
    var hv = houseSprites(sc); stat.houseCv = hv.unlit; stat.houseLit = hv.lit;
    c.drawImage(hv.unlit, HOUSE_DOOR.x - 33 * HS, HOUSE_DOOR.y - 72 * HS, hv.unlit.width * HS / SC, hv.unlit.height * HS / SC);
    frontYard(c, sc, r, C0, tk); // 2.8.0: the front yard: a path, the vegetable garden, a fence, trees
    front.sort(function (a0, b0) { return spotOf(a0).b - spotOf(b0).b; }).forEach(function (b) { atSpot(c, b, DRAW[b]); });
    // tall grass and flowers along the front edge
    for (var gx = 40; gx < 150; gx += 7) { var gh = 3 + ((gx * 7) % 4); R(c, gx, H - gh, 1, gh, P.green); R(c, gx + 2, H - gh + 1, 1, gh - 1, P.teal); if (gx % 3 === 0 && sc.season !== 'winter') spr(c, gx - 1, H - gh - 3, ['.P.', 'PyP', '.P.']); }
    return cv;
  }
  /* 2.8.0: the front yard (below the old picture's edge at y 144): the path goes on from the field down to the gate, past the
     vegetable garden (rows that change with the seasons), a low fence along the bottom, a tree in each corner, flowers. */
  function frontYard(c, sc, r, C0, tk) {
    var win = sc.season === 'winter' || sc.biome === 'tundra', dry = sc.biome === 'desert' || sc.biome === 'beach', pathCol = dry ? P.wood : P.sand;
    for (var py = 138; py < H - 6; py++) { var hw = 3 + Math.floor((py - 138) / 40); dith(c, 96 - hw, py, hw * 2 + 1, 1, pathCol, py % 2); } // the path to the gate
    for (var bx = 0; bx < 30; bx++) { var t0 = bx / 29; dith(c, Math.round(96 - t0 * 52), Math.round(176 + t0 * 4), 3, 1, pathCol, bx % 2); dith(c, Math.round(96 + t0 * 54), Math.round(176 + t0 * 4), 3, 1, pathCol, bx % 2); } // side paths to the greenhouse and the garage
    // the vegetable garden: a fenced plot right of the path
    var gx = 108, gy = 206, gw = 52, gh = 30;
    R(c, gx, gy, gw, gh, P.ink); R(c, gx + 1, gy + 1, gw - 2, gh - 2, dry ? P.sand : P.bark); dith(c, gx + 1, gy + 1, gw - 2, gh - 2, dry ? P.wood : P.dark, 1);
    for (var row = 0; row < 4; row++) { var ry = gy + 5 + row * 7; R(c, gx + 3, ry + 2, gw - 6, 1, dry ? P.wood : P.dark);
      for (var px0 = gx + 5; px0 < gx + gw - 4; px0 += 5) {
        if (win) { ell(c, px0, ry + 1, 2, 1, P.white); continue; }
        if (sc.season === 'fall') { disc(c, px0, ry, 2, row % 2 ? P.orange : P.wood); px(c, px0, ry - 3, P.green); continue; } // pumpkins and squash
        px(c, px0, ry - 2, P.green); px(c, px0 - 1, ry - 1, P.green); px(c, px0 + 1, ry - 1, P.lime); px(c, px0, ry, P.green);
        if (sc.season === 'summer' && (px0 + row) % 3 === 0) px(c, px0, ry - 1, row % 2 ? P.red : P.yellow); // tomatoes and peppers
      } }
    for (var fx = gx - 1; fx <= gx + gw; fx += 4) { R(c, fx, gy - 3, 1, 4, P.white); R(c, fx, gy + gh - 1, 1, 4, P.white); } R(c, gx - 1, gy - 2, gw + 2, 1, P.white); R(c, gx - 1, gy + gh, gw + 2, 1, P.white); // a little picket fence
    R(c, gx + gw - 6, gy - 12, 1, 10, P.bark); R(c, gx + gw - 9, gy - 13, 7, 4, P.white); R(c, gx + gw - 8, gy - 12, 5, 2, P.green); // the garden sign
    // a scarecrow in the garden (not in winter)
    if (!win) { var sx = gx + 12, sy = gy + 4; R(c, sx, sy - 14, 1, 16, P.bark); R(c, sx - 5, sy - 10, 11, 1, P.bark); R(c, sx - 3, sy - 11, 7, 6, P.blue); disc(c, sx, sy - 15, 2, P.sand); R(c, sx - 3, sy - 18, 7, 1, P.yellow); R(c, sx - 2, sy - 20, 5, 2, P.yellow); }
    // a bench by the path, and a bird bath
    R(c, 62, 214, 16, 2, P.wood); R(c, 62, 216, 16, 1, P.bark); R(c, 63, 217, 1, 4, P.bark); R(c, 76, 217, 1, 4, P.bark); R(c, 62, 209, 16, 2, P.wood); R(c, 63, 211, 1, 3, P.bark); R(c, 76, 211, 1, 3, P.bark);
    R(c, 67, 156, 15, 1, P.ink); R(c, 66, 157, 17, 2, P.silver); R(c, 68, 157, 13, 1, win ? P.white : P.sky); R(c, 67, 159, 15, 1, P.slate); // a stone bird bath
    R(c, 72, 160, 5, 7, P.ink); R(c, 73, 160, 3, 7, P.silver); R(c, 69, 167, 11, 2, P.ink); R(c, 70, 167, 9, 1, P.silver);
    if (!win) { R(c, 78, 153, 3, 2, P.red); px(c, 81, 153, P.orange); px(c, 79, 152, P.red); px(c, 79, 155, P.ink); } // a robin on the rim
    // trees in the corners and along the sides
    [[8, 206], [184, 214], [176, 262], [10, 262], [186, 160]].forEach(function (q) { IN.tree(c, tk, q[0], q[1], sc.season); });
    // the fence along the bottom, with an open gate where the path ends
    for (var x = 0; x < W; x += 5) { if (x > 86 && x < 106) continue; R(c, x, H - 14, 1, 7, P.wood); px(c, x, H - 15, P.bark); }
    R(c, 0, H - 12, 87, 1, P.wood); R(c, 106, H - 12, W - 106, 1, P.wood); R(c, 0, H - 9, 87, 1, P.wood); R(c, 106, H - 9, W - 106, 1, P.wood);
    R(c, 85, H - 18, 2, 12, P.bark); R(c, 106, H - 18, 2, 12, P.bark); px(c, 85, H - 19, P.yellow); px(c, 107, H - 19, P.yellow); // the gate posts
    // flowers and grass flecks in the front yard
    if (!win && !dry) for (var fl = 0; fl < 26; fl++) { var fx2 = Math.floor(r() * W), fy2 = 150 + Math.floor(r() * 100); if (fx2 > gx - 4 && fx2 < gx + gw + 4 && fy2 > gy - 14 && fy2 < gy + gh + 4) continue; if (Math.abs(fx2 - 96) < 8) continue; px(c, fx2, fy2, U.pick(r, [P.pink, P.yellow, P.white, P.red])); px(c, fx2, fy2 + 1, P.green); }
    if (sc.biome === 'desert') [[150, 248], [60, 250]].forEach(function (q) { R(c, q[0], q[1] - 10, 3, 10, P.green); R(c, q[0] - 3, q[1] - 7, 3, 2, P.green); R(c, q[0] + 3, q[1] - 6, 3, 2, P.green); });
  }
  // the house pictures (unlit and lit), at full size on their own canvases; the lit one supplies the glowing windows at night
  function biomeDecor(c, sc, r) { // small things along the edges of the field and the far rise, different in each land
    var b = sc.biome, win = sc.season === 'winter';
    function rock(x, y, col) { ell(c, x, y, 4, 2, P.ink); ell(c, x, y - 1, 3, 2, col || P.silver); px(c, x - 1, y - 2, P.white); }
    if (b === 'forest') {
      [[150, 92], [176, 96], [6, 92]].forEach(function (q) { IN.tree(c, 'pine', q[0], q[1], sc.season); });
      [[30, 140], [170, 134], [182, 112]].forEach(function (q) { R(c, q[0], q[1] - 3, 1, 3, P.white); ell(c, q[0], q[1] - 4, 3, 2, P.red); px(c, q[0] - 1, q[1] - 5, P.white); px(c, q[0] + 1, q[1] - 4, P.white); }); // mushrooms
      R(c, 160, 124, 16, 4, P.ink); R(c, 161, 125, 14, 2, P.bark); ell(c, 175, 126, 2, 2, P.wood); // a fallen log
    } else if (b === 'desert') {
      [[150, 112], [178, 132], [44, 136]].forEach(function (q) { R(c, q[0], q[1] - 10, 3, 10, P.green); R(c, q[0] - 3, q[1] - 7, 3, 2, P.green); R(c, q[0] - 3, q[1] - 9, 1, 2, P.green); R(c, q[0] + 3, q[1] - 6, 3, 2, P.green); R(c, q[0] + 5, q[1] - 9, 1, 3, P.green); px(c, q[0] + 1, q[1] - 11, P.pink); }); // cacti
      rock(170, 100, P.orange); rock(24, 98, P.sand); rock(186, 120, P.orange);
      GM_ring(c, 120, 132, 3, P.wood); // a tumbleweed
    } else if (b === 'tundra') {
      [[150, 94], [184, 100], [4, 94]].forEach(function (q) { IN.tree(c, 'pine', q[0], q[1], 'winter'); });
      [[34, 128], [176, 120], [140, 140]].forEach(function (q) { ell(c, q[0], q[1], 9, 2, P.white); ell(c, q[0] - 2, q[1] - 1, 5, 1, P.white); }); // drifts
      ell(c, 160, 132, 8, 2, P.cyan); R(c, 156, 131, 4, 1, P.white); // an ice patch
    } else if (b === 'pond') {
      [[16, 93], [60, 90], [140, 95], [172, 92]].forEach(function (q) { ell(c, q[0], q[1], 3, 1, P.green); px(c, q[0] + 1, q[1] - 1, P.pink); }); // lily pads on the stream
      [[176, 132], [24, 128], [186, 110]].forEach(function (q) { IN.tree(c, 'reeds', q[0], q[1], sc.season); });
      rock(150, 132);
    } else if (b === 'beach') {
      [[150, 112], [186, 130]].forEach(function (q) { IN.tree(c, 'palm', q[0], q[1], sc.season); });
      [[34, 136], [170, 140], [120, 138]].forEach(function (q, i) { px(c, q[0], q[1], [P.pink, P.white, P.orange][i]); px(c, q[0] + 1, q[1], [P.pink, P.white, P.orange][i]); px(c, q[0], q[1] - 1, P.white); }); // shells
      R(c, 176, 102, 1, 14, P.ink); for (var u = 0; u < 9; u++) R(c, 172 + u, 101 - Math.round(Math.sin(u / 8 * Math.PI) * 4), 1, 2, u % 2 ? P.red : P.white); // a beach umbrella
    } else { // meadow
      for (var fl = 0; fl < 10; fl++) { var fx = U.pick(r, [150, 160, 172, 184, 20, 30, 176]), fy = 96 + Math.floor(r() * 44); if (!win) { px(c, fx, fy, U.pick(r, [P.pink, P.yellow, P.white, P.red])); px(c, fx, fy + 1, P.green); } }
      // 2.5.0: a proper little windmill (it used to read as a stick): a wooden tower, a red cap, four turning sails
      for (var wy = 0; wy < 18; wy++) { var ww = 3 + Math.floor(wy / 4); R(c, 180 - ww, 112 + wy, ww * 2, 1, wy % 5 === 4 ? P.bark : P.wood); }
      R(c, 177, 114, 6, 1, P.ink); R(c, 178, 124, 4, 6, P.bark); px(c, 179, 126, P.ink); R(c, 176, 118, 2, 2, P.sky);
      R(c, 176, 109, 8, 3, P.red); R(c, 177, 108, 6, 1, P.red); GM_wind(c, 180, 110, sc); disc(c, 180, 110, 1, P.ink);
      rock(160, 134);
    }
  }
  function GM_ring(c, cx, cy, r0, col) { for (var i = 0; i < 16; i++) { var a = i / 16 * Math.PI * 2; px(c, Math.round(cx + Math.cos(a) * r0), Math.round(cy + Math.sin(a) * r0), col); } line(c, cx - 2, cy - 1, cx + 2, cy + 1, col); }
  function GM_wind(c, x, y, sc) { var a0 = (sc.tsec || 0) * 0.8; for (var i = 0; i < 4; i++) { var a = a0 + i * Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a); line(c, x, y, Math.round(x + ca * 9), Math.round(y + sa * 9), P.bark); for (var t = 3; t <= 9; t++) px(c, Math.round(x + ca * t - sa * 2), Math.round(y + sa * t + ca * 2), t % 2 ? P.white : P.silver); } } // turning sails
  function houseSprites(sc) {
    var HO = IN.HOUSE[sc.house] || IN.HOUSE.cabin;
    function one(lit) { var cv = big(80, 90), c = cv.getContext('2d'); c.translate(0, -20); HO(c, sc.season, lit); return cv; }
    var unlit = one(false), lit = one(true);
    // the windows: only the pixels that change when the lights come on
    var a = unlit.getContext('2d').getImageData(0, 0, unlit.width, unlit.height), b = lit.getContext('2d').getImageData(0, 0, lit.width, lit.height), m = mk(unlit.width, unlit.height), mc = m.getContext('2d'), out = mc.createImageData(m.width, m.height);
    for (var i = 0; i < a.data.length; i += 4) if (a.data[i] !== b.data[i] || a.data[i + 1] !== b.data[i + 1] || a.data[i + 2] !== b.data[i + 2]) { out.data[i] = b.data[i]; out.data[i + 1] = b.data[i + 1]; out.data[i + 2] = b.data[i + 2]; out.data[i + 3] = 255; }
    mc.putImageData(out, 0, 0); stat.mask = m;
    return { unlit: unlit, lit: lit };
  }
  function houseBlit(c, img) { c.drawImage(img, HOUSE_DOOR.x - 33 * HS, HOUSE_DOOR.y - 72 * HS, img.width * HS / SC, img.height * HS / SC); }
  function houseToP(x, y) { return { x: HOUSE_DOOR.x - 33 * HS + x * HS, y: HOUSE_DOOR.y - 72 * HS + (y - 20) * HS }; }

  /* ---------- the buildings (our own pixel art; a little whimsy: coral, pink and blue, odd toppers) ----------
     2.4.0: they match the house and the land: log cabins go with the cabin, stone with the castle and the cave, adobe in the
     desert, and up on the tundra it's igloos, an ice-block barn and a hex-dome greenhouse. */
  var MAT = {
    log: { wall: P.wood, dark: P.bark, roof: P.dark, hi: P.slate, tex: 'log' }, stone: { wall: P.silver, dark: P.slate, roof: P.navy, hi: P.blue, tex: 'stone' },
    adobe: { wall: '#d9824f', dark: '#9c4f2c', roof: P.bark, hi: P.sand, tex: 'adobe' }, /* 2.7.0: terracotta, so it never melts into the sand */ arctic: { wall: P.white, dark: P.silver, roof: P.sky, hi: P.cyan, tex: 'ice' }
  };
  function bset(sc) { if (sc.biome === 'tundra') return 'arctic'; if (sc.biome === 'desert') return 'adobe'; return { cabin: 'log', castle: 'stone', cave: 'stone' }[sc.house] || 'paint'; }
  function mat(sc) { return MAT[bset(sc)] || null; }
  function tex(c, x, y, w, hh, m) {
    if (!m) return;
    R(c, x - 1, y, 1, hh, P.ink); R(c, x + w, y, 1, hh, P.ink); R(c, x - 1, y + hh, w + 2, 1, P.ink); // 2.7.0: a dark edge, so every building stands out from its land
    if (m.tex === 'log') for (var r = 2; r < hh; r += 3) { R(c, x, y + r, w, 1, m.dark); px(c, x, y + r - 1, m.dark); px(c, x + w - 1, y + r - 1, m.dark); }
    else if (m.tex === 'stone' || m.tex === 'ice') for (var r2 = 3; r2 < hh; r2 += 4) { R(c, x, y + r2, w, 1, m.dark); for (var j = ((r2 / 4) % 2 ? 2 : 5); j < w; j += 6) R(c, x + j, y + r2 - 3, 1, 3, m.dark); }
    else if (m.tex === 'adobe') { R(c, x, y + hh - 2, w, 2, m.dark); for (var k = 0; k < w * hh / 40; k++) px(c, x + (k * 7) % w, y + (k * 5) % (hh - 2), m.dark); }
  }
  function igloo(c, cx, base, rw, rh, door) { // an ice dome with a tunnel door
    c.save(); c.beginPath(); c.rect(cx - rw - 2, base - rh - 2, rw * 2 + 4, rh + 3); c.clip();
    ell(c, cx, base, rw + 1, rh + 1, P.ink); ell(c, cx, base, rw, rh, P.white);
    for (var y = base - rh + 3; y < base; y += 4) { R(c, cx - rw, y, rw * 2 + 1, 1, P.silver); for (var x = cx - rw + ((y / 4) % 2 ? 2 : 5); x < cx + rw; x += 6) R(c, x, y - 3, 1, 3, P.silver); }
    c.restore(); R(c, cx - rw - 1, base, rw * 2 + 3, 1, P.silver);
    R(c, cx - door - 2, base - door - 4, door * 2 + 4, door + 4, P.ink); R(c, cx - door - 1, base - door - 3, door * 2 + 2, door + 3, P.white); R(c, cx - door + 1, base - door - 1, door * 2 - 2, door + 1, P.blue);
  }
  function hexdome(c, x, base) { // a geodesic greenhouse dome
    var cx = x + 13, r = 14;
    c.save(); c.beginPath(); c.rect(cx - r - 2, base - r - 2, r * 2 + 4, r + 2); c.clip(); // 2.8.0: only the top half (it sits on open ground now)
    ell(c, cx, base, r + 1, r, P.ink); ell(c, cx, base, r, r - 1, P.cyan);
    for (var k = -3; k <= 3; k++) { line(c, cx + k * 5, base, cx + k * 2, base - r, P.white); }
    for (var y = base - 4; y > base - r; y -= 4) R(c, cx - r, y, r * 2, 1, P.white);
    for (var p = 0; p < 4; p++) { px(c, cx - 8 + p * 5, base - 3, P.lime); px(c, cx - 8 + p * 5, base - 4, p % 2 ? P.red : P.green); }
    c.restore(); R(c, cx - r - 1, base, r * 2 + 3, 1, P.ink); R(c, cx - 2, base - 7, 5, 7, P.white); R(c, cx - 1, base - 6, 3, 6, P.sky);
  }
  function barn(c, x, base, sc) { // a red barn with a gambrel roof, a pink cupola with a blue onion top and a rooster vane
    var top = base - 20, snow = sc.season === 'winter' || sc.biome === 'tundra', m = mat(sc);
    R(c, x, top, 26, 20, m ? m.wall : P.red); if (m) tex(c, x, top, 26, 20, m); else for (var i = 0; i < 26; i += 3) R(c, x + i, top, 1, 20, P.plum);
    var rf = m ? m.roof : P.bark; R(c, x - 1, top - 4, 28, 4, rf); R(c, x + 2, top - 8, 22, 4, rf); R(c, x + 5, top - 10, 16, 2, rf); if (m) { R(c, x - 1, top - 4, 28, 1, m.hi); R(c, x + 2, top - 8, 22, 1, m.hi); } if (snow) { R(c, x + 2, top - 8, 22, 1, P.white); R(c, x - 1, top - 4, 28, 1, P.white); }
    R(c, x + 9, top + 6, 8, 14, P.white); R(c, x + 10, top + 7, 6, 13, P.red); line(c, x + 10, top + 7, x + 15, top + 19, P.white); line(c, x + 15, top + 7, x + 10, top + 19, P.white); // doors with an X
    R(c, x + 10, top - 2, 6, 3, P.white); R(c, x + 11, top - 1, 4, 1, P.ink); // hay loft
    R(c, x + 10, top - 16, 6, 6, P.pink); R(c, x + 11, top - 15, 4, 3, P.ink); disc(c, x + 13, top - 18, 3, P.blue); px(c, x + 13, top - 22, P.blue); R(c, x + 13, top - 26, 1, 4, P.ink); spr(c, x + 11, top - 29, ['.rr.', 'kkkk', '.k.k']); // cupola, onion, vane
    R(c, x + 2, top + 6, 4, 4, P.yellow); R(c, x + 20, top + 6, 4, 4, P.yellow); R(c, x + 4, top + 6, 1, 4, P.bark); R(c, x + 22, top + 6, 1, 4, P.bark);
  }
  function lab(c, x, base, sc) { // 2.4.0: a low lab building under a wide observatory dome, its big telescope aimed at the sky
    var m = mat(sc), wall = m ? m.wall : P.pink, dark = m ? m.dark : P.orange, top = base - 15, cx = x + 14, dy = top;
    R(c, x - 1, top - 1, 30, 16, P.ink); R(c, x, top, 28, 15, wall); if (m) tex(c, x, top, 28, 15, m); else for (var y = top + 4; y < base; y += 4) R(c, x, y, 28, 1, dark);
    R(c, x - 2, top - 2, 32, 2, P.ink); R(c, x - 1, top - 1, 30, 1, P.silver); // the roof edge
    R(c, x + 2, top + 4, 7, 6, P.ink); R(c, x + 3, top + 5, 5, 4, P.cyan); px(c, x + 4, top + 7, P.lime); px(c, x + 6, top + 6, P.pink); // a window with flasks
    R(c, x + 18, top + 4, 7, 6, P.ink); R(c, x + 19, top + 5, 5, 4, P.cyan); R(c, x + 20, top + 6, 1, 3, P.orange);
    R(c, x + 11, base - 9, 6, 9, P.ink); R(c, x + 12, base - 8, 4, 8, P.blue); px(c, x + 15, base - 4, P.yellow); // the door
    // the dome: wide and round, with an open slit
    c.save(); c.beginPath(); c.rect(cx - 13, dy - 13, 26, 13); c.clip(); ell(c, cx, dy, 12, 11, P.ink); ell(c, cx, dy, 11, 10, P.silver); ell(c, cx - 3, dy - 4, 4, 3, P.white); for (var r = 0; r < 3; r++) R(c, cx - 11, dy - 3 - r * 3, 22, 1, P.slate); c.restore();
    R(c, cx - 1, dy - 10, 4, 10, P.dark);
    // the telescope: a short, thick tube on a mount, tipped up toward the sky (with a lens ring)
    for (var t = 0; t < 9; t++) { R(c, cx + 1 + t, dy - 6 - Math.round(t * 0.55), 4, 4, P.ink); }
    for (var t2 = 0; t2 < 9; t2++) { R(c, cx + 2 + t2, dy - 5 - Math.round(t2 * 0.55), 3, 2, P.white); R(c, cx + 2 + t2, dy - 3 - Math.round(t2 * 0.55), 3, 1, P.silver); }
    R(c, cx + 10, dy - 13, 5, 6, P.ink); R(c, cx + 11, dy - 12, 3, 4, P.blue); px(c, cx + 12, dy - 11, P.cyan); // the big lens end
    R(c, cx + 1, dy - 2, 3, 2, P.dark);
    // a little satellite dish on the corner
    R(c, x + 26, top - 4, 1, 3, P.ink); ell(c, x + 26, top - 6, 3, 2, P.white); px(c, x + 26, top - 6, P.slate);
  }
  function greenhouse(c, x, base, sc) {
    if (bset(sc) === 'arctic') return hexdome(c, x, base);
    var top = base - 14;
    tri(c, x + 13, top - 6, 7, 1.9, P.white); tri(c, x + 13, top - 5, 6, 1.7, P.cyan);
    R(c, x, top, 27, 14, P.white); R(c, x + 1, top + 1, 25, 12, P.cyan); for (var i = x + 1; i < x + 26; i += 5) R(c, i, top + 1, 1, 12, P.white); R(c, x + 1, top + 6, 25, 1, P.white);
    for (var p = 0; p < 4; p++) { R(c, x + 3 + p * 6, top + 9, 3, 3, P.orange); px(c, x + 4 + p * 6, top + 8, P.green); px(c, x + 4 + p * 6, top + 7, p % 2 ? P.red : P.lime); }
    R(c, x + 11, top + 6, 5, 8, P.white); R(c, x + 12, top + 7, 3, 7, P.sky); // door
    R(c, x + 13, top - 10, 1, 4, P.blue); disc(c, x + 13, top - 11, 1, P.pink); // a spire with a pink ball
  }
  function garage(c, x, base, sc) {
    if (bset(sc) === 'arctic') { igloo(c, x + 15, base, 16, 15, 6); R(c, x + 10, base - 11, 10, 2, P.slate); return; } // an igloo garage
    var top = base - 15, m = mat(sc);
    if (m) { R(c, x, top, 30, 15, m.wall); tex(c, x, top, 30, 15, m); R(c, x - 1, top - 3, 32, 3, m.roof); R(c, x - 1, top - 3, 32, 1, m.hi); }
    else { R(c, x, top, 30, 15, P.silver); R(c, x, top, 30, 1, P.white); for (var y = top + 3; y < base; y += 4) R(c, x, y, 30, 1, P.slate);
    R(c, x - 1, top - 3, 32, 3, P.pink); R(c, x - 1, top - 3, 32, 1, P.red); } // a pink trim roof
    R(c, x + 3, top + 4, 16, 11, P.dark); for (var d = top + 5; d < base; d += 2) R(c, x + 3, d, 16, 1, P.slate); // roll-up door
    R(c, x + 22, top + 5, 5, 4, P.sky); R(c, x + 23, base - 6, 3, 6, P.bark); // window, side door
    disc(c, x + 15, top - 7, 3, P.ink); disc(c, x + 15, top - 7, 2, P.blue); px(c, x + 15, top - 7, P.white); R(c, x + 15, top - 4, 1, 1, P.ink); // a big wheel sign
  }
  function shed(c, x, base, sc) {
    if (bset(sc) === 'arctic') { igloo(c, x + 6, base, 8, 9, 3); return; }
    var top = base - 11, m = mat(sc);
    R(c, x, top, 13, 11, m ? m.wall : P.wood); if (m) tex(c, x, top, 13, 11, m); else for (var i = 0; i < 13; i += 3) R(c, x + i, top, 1, 11, P.bark);
    R(c, x - 1, top - 3, 15, 3, m ? m.roof : P.teal); R(c, x - 1, top - 3, 15, 1, m ? m.hi : P.green); if (sc.season === 'winter') R(c, x - 1, top - 3, 15, 1, P.white);
    R(c, x + 4, top + 3, 5, 8, P.bark); line(c, x + 11, top + 2, x + 11, base - 1, P.silver); R(c, x + 10, top + 2, 3, 2, P.silver); // door, a rake against the wall
  }
  function well(c, x, base, sc) {
    ell(c, x + 6, base - 3, 7, 3, P.slate); R(c, x - 1, base - 6, 15, 4, P.silver); for (var i = 0; i < 15; i += 3) R(c, x - 1 + i, base - 6, 1, 4, P.slate); ell(c, x + 6, base - 6, 6, 1, P.ink);
    R(c, x, base - 15, 1, 10, P.bark); R(c, x + 12, base - 15, 1, 10, P.bark); tri(c, x + 6, base - 21, 6, 1.4, P.red); R(c, x + 1, base - 13, 11, 1, P.bark); R(c, x + 6, base - 12, 1, 4, P.silver); R(c, x + 5, base - 9, 3, 2, P.wood); // roof, crank, bucket
  }
  function outhouse(c, sc) { // behind the house, its moon door peeking out
    if (sc.house === 'lilypad') return;
    var x = 110, base = 50, top = base - 15, wood = sc.season === 'winter' || sc.biome === 'tundra' ? P.bark : P.wood;
    R(c, x, top, 11, 15, P.ink); R(c, x + 1, top + 1, 9, 14, wood); for (var i = 1; i < 10; i += 3) R(c, x + i, top + 1, 1, 14, P.bark);
    R(c, x - 1, top - 2, 13, 2, P.bark); if (sc.season === 'winter') R(c, x - 1, top - 3, 13, 1, P.white);
    R(c, x + 3, top + 4, 6, 11, P.bark); spr(c, x + 5, top + 6, ['.y', 'y.', 'y.', '.y']);
  }

  /* ---------- the bounty board (bigger, bottom left) ---------- */
  function bigDigit(c, x, y, rows, col) { rows.forEach(function (r, j) { for (var i = 0; i < r.length; i++) if (r.charAt(i) === 'k') R(c, x + i * 2, y + j * 2, 2, 2, col); }); }
  function board(c, sc) {
    var B = A.BOARD_P, x = B.x, y = B.y, info = sc.board || { n: 0 }, f = sc.f;
    R(c, x + 6, y + 26, 3, 10, P.bark); R(c, x + 27, y + 26, 3, 10, P.bark); // posts
    R(c, x + 1, y + 3, 34, 24, P.bark); R(c, x + 2, y + 4, 32, 22, P.wood); dith(c, x + 2, y + 4, 32, 22, P.orange, 1); // cork
    R(c, x - 1, y, 38, 3, P.red); R(c, x, y - 1, 36, 1, P.plum); // roof
    R(c, x + 23, y + 7, 8, 7, P.yellow); px(c, x + 26, y + 7, P.red); R(c, x + 4, y + 17, 7, 6, P.sand); px(c, x + 7, y + 17, P.blue); R(c, x + 24, y + 17, 7, 6, P.white); px(c, x + 27, y + 17, P.green); // notes
    var n = info.n || 0; R(c, x + 6, y + 6, 15, 13, n ? P.white : P.sand); px(c, x + 13, y + 5, n ? P.red : P.slate); // the count note
    if (!n) { R(c, x + 9, y + 10, 9, 1, P.silver); R(c, x + 9, y + 13, 6, 1, P.silver); }
    else if (n > 9) { bigDigit(c, x + 7, y + 8, IN.DIG[9], P.ink); spr(c, x + 15, y + 10, IN.DIG['+']); }
    else bigDigit(c, x + 10, y + 8, IN.DIG[n], P.ink);
    if ((info.ring || (AIU.life && AIU.life.news())) && f % 6 < 4) { R(c, x + 30, y - 9, 8, 13, P.ink); R(c, x + 31, y - 8, 6, 11, P.red); R(c, x + 33, y - 6, 2, 5, P.white); R(c, x + 33, y, 2, 2, P.white); } // 2.4.0: "!" = something new to tell you
  }

  /* ---------- the animals that live in the barn wander the field (chickens first) ---------- */
  var ANI = {
    chickens: function (c, x, y, f, k) { var col = k % 3 === 1 ? P.wood : P.white, bob = (f + k * 3) % 10 < 2 ? 1 : 0; ell(c, x, y - 2, 2, 2, col); R(c, x + 2, y - 5 + bob, 2, 2, col); px(c, x + 4, y - 4 + bob, P.orange); px(c, x + 2, y - 6 + bob, P.red); px(c, x - 1, y, P.orange); px(c, x + 1, y, P.orange); },
    goats: function (c, x, y, f, k) { var col = k % 2 ? P.white : P.sand; R(c, x - 4, y - 6, 8, 3, col); R(c, x + 3, y - 9, 3, 4, col); px(c, x + 4, y - 10, P.slate); [-4, -2, 2, 3].forEach(function (lx) { R(c, x + lx, y - 3, 1, 3, col); }); },
    cow: function (c, x, y, f) { R(c, x - 6, y - 8, 12, 5, P.white); R(c, x - 4, y - 7, 3, 2, P.ink); R(c, x + 5, y - 10, 4, 4, P.white); px(c, x + 7, y - 7, P.pink); [-5, -3, 3, 5].forEach(function (lx) { R(c, x + lx, y - 3, 1, 3, P.white); }); },
    pigs: function (c, x, y, f) { ell(c, x, y - 3, 4, 2, P.pink); R(c, x + 3, y - 5, 2, 2, P.pink); px(c, x + 5, y - 4, P.red); },
    sheep: function (c, x, y, f) { for (var b = 0; b < 3; b++) disc(c, x - 3 + b * 3, y - 4, 2, P.white); R(c, x + 4, y - 6, 2, 3, P.dark); R(c, x - 2, y - 2, 1, 2, P.dark); R(c, x + 2, y - 2, 1, 2, P.dark); },
    rabbits: function (c, x, y, f, k) { var hop = (f + k * 4) % 14 < 2 ? 2 : 0; ell(c, x, y - 2 - hop, 2, 1, P.sand); R(c, x + 1, y - 4 - hop, 2, 2, P.sand); R(c, x + 1, y - 7 - hop, 1, 3, P.sand); px(c, x + 2, y - 3 - hop, P.ink); }
  };
  A._ANI = ANI;
  A.animalsIn = function () { return []; }; // 2.4.0: the farm animals left the field (the oddities wander through instead); the old herd is below
  A.animalsInOld = function (S) { var PL = AIU.places; if (!PL || !PL.barnState || !S) return []; var has = PL.barnState(S).has, out = []; has.forEach(function (an) { if (!ANI[an]) return; var n = PL.herd ? Math.min(an === 'chickens' ? 5 : 3, PL.herd(S, an)) : 2; /* 2.3.1: babies join the herd */ for (var k = 0; k < n; k++) out.push({ kind: an, k: k, id: an + k }); }); return out.slice(0, 12); };
  // a slow wander, the same on every device; animals that walk off one side come back on the other
  function wanderAt(id, t, x0, x1, y0, y1, speed) {
    var seed = U.hash32(id), r = U.rng(seed), leg = 9 + r() * 6, n = Math.floor(t / leg), p = (t % leg) / leg;
    function pt(i) { var q = U.rng(seed + i * 7919); return { x: x0 + q() * (x1 - x0), y: y0 + q() * (y1 - y0), rest: q() < 0.45 }; }
    var a = pt(n), b = pt(n + 1), mv = a.rest ? Math.max(0, (p - 0.5) * 2) : Math.min(1, p * 1.5), e = mv * mv * (3 - 2 * mv);
    return { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e, left: b.x < a.x, moving: mv > 0 && mv < 1 };
  }
  A.animalPos = function (an, sc) {
    var w = wanderAt('ani' + an.id, sc.tsec * (an.kind === 'rabbits' ? 1.6 : an.kind === 'cow' ? 0.5 : 1), 6, 82, 99, 112, 1);
    var x = w.x; // 2.3.1: the animals keep to the left side of the field, by the barn (out of Aiu's way)
    if (Math.abs(x - 96) < 26 && w.y > 108) w.y = 106; // stay out of the pond
    var p = { x: Math.round(x), y: Math.round(w.y), left: w.left }, tp = A.toyPos && A.toyPos('ani:' + an.id, p); // you moved it: it stays a moment, then wanders back
    return tp ? { x: Math.round(tp.x), y: Math.round(tp.y), left: p.left } : p;
  };

  /* ---------- the pet roams the field (at its own size), and comes home when Aiu needs it ---------- */
  var BSIZE = { horse: 1.25, beardog: 1.25, dog: 1, eagle: 1, cat: 0.75, ghost: 0.75, conjure: 0.75, penguin: 0.75, parrot: 0.75 };
  A.buddySize = function (b) { return BSIZE[b] || 1; };
  var HOMEBOUND = /^(care_|petbuddy|feedbuddy|waterbuddy|fetch|ride|board)/;
  A.buddyRoam = function (sc) { // offset from its home spot (in old yard pixels)
    var b = A.buddyOf(sc.soul, sc.buddy), PLY = AIU.play, r = { dx: 0, dy: 0 }, hx = A.BUDDY_OUT.x + 11 + A.YARD.x, hy = A.BUDDY_OUT.fy + A.YARD.y;
    if (!(A.POSTED[b] || sc.phase === 'night' || (sc.act && HOMEBOUND.test(sc.act)) || (PLY && PLY.active && PLY.active()) || sc.bplay && sc.bplay.a)) { var w = wanderAt('buddy' + (sc.soul || 0), sc.tsec * 0.8, -20, -6, 3, 12, 1); /* 2.5.0: its own patch between the board and the pond, clear of the water */ r = { dx: Math.round(w.x), dy: Math.round(w.y), left: w.left }; } // 2.3.1: the pet stays on the left, out of Aiu's way
    var tp = A.toyPos && A.toyPos('buddy', { x: hx + r.dx, y: hy + r.dy }); // you moved it
    return tp ? { dx: Math.round(tp.x - hx), dy: Math.round(tp.y - hy) } : r;
  };
  var bcv = null;
  function drawBuddyP(L, sc, at, off) { // the pet at its size, wherever it has wandered (3.0: or at a given spot, for the castle)
    if (A.toyHide && A.toyHide('buddy')) return;
    var b = A.buddyOf(sc.soul, sc.buddy), s = A.buddySize(b), ro = at ? null : A.buddyRoam(sc), BX = A.BUDDY_OUT.x, BY = A.BUDDY_OUT.fy, YO = off || A.YARD;
    if (!bcv) bcv = big(120, 80);
    var c = bcv.getContext('2d'); c.setTransform(SC, 0, 0, SC, 0, 0); c.clearRect(0, 0, 120, 80);
    c.save(); c.translate(60 - BX - 11, 70 - BY); var saveHead = A.buddyHead; IN.drawBuddy(c, sc); c.restore(); // drawn around its feet at (60,70)
    var hd = A.buddyHead, feetX = at ? at.x : BX + 11 + A.YARD.x + ro.dx, feetY = at ? at.y : BY + A.YARD.y + ro.dy;
    if (at && at.left) { L.save(); L.translate(feetX * 2, 0); L.scale(-1, 1); }
    L.drawImage(bcv, feetX - 60 * s, feetY - 70 * s, 120 * s, 80 * s);
    if (at && at.left) L.restore();
    if (hd && hd !== saveHead) A.buddyHead = { x: (feetX + (hd.x - (BX + 11)) * s) - YO.x, y: (feetY + (hd.y - BY) * s) - YO.y, mx: hd.mx }; // in old yard pixels, for the treats
    A.buddyFeetP = { x: feetX, y: feetY, s: s, b: b };
  }
  A.buddyRectP = function (sc) { var f0 = A.buddyFeetP; if (!f0) return null; var s = f0.s, tall = A.POSTED[f0.b] ? 12 : 0; return { x: f0.x - 20 * s, y: f0.y - (38 + tall) * s, w: 40 * s, h: (42 + tall) * s }; };

  /* ---------- Aiu walking somewhere on the property (to the house, to a building), smaller as he goes back ---------- */
  function lerp(a, b, t) { return a + (b - a) * t; }
  function pathPt(to, u) { // from his spot in the field up to a door: across the field, over the bridge if it's on the far side
    var s0 = A.AIU_SPOT, mid = { x: 96, y: streamY(96) + 7 }, far = to.y < 94;
    if (!far) return { x: lerp(s0.x, to.x, u), y: lerp(s0.y, to.y, u) };
    var bridge = { x: 96, y: streamY(96) - 3 };
    if (u < 0.5) { var k = u / 0.5; return { x: lerp(s0.x, mid.x, k), y: lerp(s0.y, mid.y, k) }; }
    if (u < 0.65) { var k2 = (u - 0.5) / 0.15; return { x: lerp(mid.x, bridge.x, k2), y: lerp(mid.y, bridge.y, k2) }; }
    var k3 = (u - 0.65) / 0.35; return { x: lerp(bridge.x, to.x, k3), y: lerp(bridge.y, to.y, k3) };
  }
  function depthScale(y) { if (y >= 172) return 1.25; var t = Math.max(0, Math.min(1, (128 - y) / 60)); return Math.max(0.5, Math.round((1 - t * 0.5) * 4) / 4); } // 1, 3/4 or 1/2 (2.8.0: 5/4 in the front yard)
  function drawWalker(L, sc, p, left, s0, climb) {
    var form = sc.skin || sc.form; if (!form) return;
    var cr = A.creature(form.seed, form.stage, sc.soul), s = s0 || depthScale(p.y), fr = cr.frames[sc.f % 23 === 0 ? 'blink' : 'open'] || cr.frames.open, bob = sc.f % 2 ? 0 : -1 * s;
    if (climb) { // 2.7.0: up or down a ladder: hands on the rungs, a little sway, one hand up then the other
      var sw = sc.f % 4 < 2 ? 1 : -1, top = p.y - (cr.bottom + 1) * s;
      L.save(); L.translate(p.x + sw * 0.5, p.y); if (sc.f % 4 < 2) L.scale(-1, 1); L.drawImage(fr, -fr.width / 2 * s, -(cr.bottom + 1) * s, fr.width * s, fr.height * s); L.restore();
      var hx = Math.round(p.x - 4), hy = Math.round(top + cr.head + (sc.f % 4 < 2 ? 0 : 2));
      R(L, hx - 1, hy, 2, 2, cr.accent || P.sand); R(L, hx + 8, Math.round(top + cr.head + (sc.f % 4 < 2 ? 2 : 0)), 2, 2, cr.accent || P.sand);
      return;
    }
    ell(L, Math.round(p.x), Math.round(p.y), Math.max(2, Math.round(cr.bw / 2 * s) - 1), 1, P.dark);
    L.save(); L.translate(p.x, p.y + bob); if (left) L.scale(-1, 1); L.drawImage(fr, -fr.width / 2 * s, -(cr.bottom + 1) * s, fr.width * s, fr.height * s); L.restore();
  }
  A.walkerPos = function (sc) { // where Aiu is while walking (property pixels), or null
    var a = app();
    if (a.visit) { var v = a.visit, L0 = A.landmark(v.id), u = Math.min(1, (Date.now() - v.start) / v.dur); if (v.dir === 'back') u = 1 - u; if (L0 && v.phase !== 'in') return { p: pathPt(L0.door, u), left: v.dir === 'back' ? L0.door.x > A.AIU_SPOT.x : L0.door.x < A.AIU_SPOT.x }; }
    if (sc.walk && !A.isRoom(sc)) { var u2 = Math.max(0, Math.min(1, (A.AIU_OUT - sc.walk.x) / (A.AIU_OUT - 33))); return { p: pathPt(HOUSE_DOOR, u2), left: !sc.walk.left ? false : true }; }
    return null;
  };

  /* ---------- the regulator clock (inside, on the wall where the picture used to hang) ---------- */
  function regulator(c, x, y, sc) {
    var now = new Date(app().trueNow ? app().trueNow() : Date.now()), wn = U.wall ? U.wall(now) : now, hr = wn.getHours() % 12, mi = wn.getMinutes();
    R(c, x + 2, y - 3, 12, 3, P.bark); tri(c, x + 8, y - 7, 4, 1.4, P.bark); px(c, x + 8, y - 8, P.yellow); // the crown
    R(c, x, y, 16, 42, P.bark); R(c, x + 1, y + 1, 14, 40, P.wood); R(c, x + 1, y + 41, 14, 2, P.bark); R(c, x + 4, y + 43, 8, 2, P.bark); // the case
    disc(c, x + 8, y + 8, 6, P.yellow); disc(c, x + 8, y + 8, 5, P.white); for (var t = 0; t < 12; t++) { var a = t / 12 * Math.PI * 2; px(c, Math.round(x + 8 + Math.sin(a) * 4), Math.round(y + 8 - Math.cos(a) * 4), t % 3 ? P.silver : P.ink); } // the dial
    var ah = (hr + mi / 60) / 12 * Math.PI * 2, am = mi / 60 * Math.PI * 2;
    line(c, x + 8, y + 8, Math.round(x + 8 + Math.sin(ah) * 2.5), Math.round(y + 8 - Math.cos(ah) * 2.5), P.ink); line(c, x + 8, y + 8, Math.round(x + 8 + Math.sin(am) * 4), Math.round(y + 8 - Math.cos(am) * 4), P.ink);
    R(c, x + 3, y + 16, 10, 22, P.dark); R(c, x + 4, y + 17, 8, 20, P.navy); px(c, x + 5, y + 18, P.silver); // the glass door over the pendulum
    var sw = Math.sin(Date.now() / 1000 * Math.PI) * 2.5, bx = Math.round(x + 8 + sw); line(c, x + 8, y + 17, bx, y + 32, P.yellow); disc(c, bx, y + 33, 2, P.yellow); px(c, bx - 1, y + 32, P.white); // the swinging brass pendulum
  }
  function roomBand(c, sc) { // the wall above the room, continuing its pattern, with a ceiling beam
    var cc = IN.cache().cv; if (!cc) return;
    for (var y = 0; y < OFF; y += 8) c.drawImage(cc, 0, 0, W, 8, 0, y, W, 8);
    R(c, 0, 0, W, 3, P.bark); R(c, 0, 3, W, 1, P.ink);
    // a sign over the way out: the yard
    var D = (A.DOORS && A.DOORS[sc.roomPlace || sc.place]) || A.DOOR_IN, dx = D.x + Math.round(D.w / 2), blink = sc.f % 16 < 10;
    R(c, dx - 7, OFF - 12, 15, 9, P.bark); R(c, dx - 6, OFF - 11, 13, 7, P.green); spr(c, dx - 4, OFF - 10, ['..w....', '.ww....', 'wwwwww.', '.ww....', '..w....'].map(function (r0) { return D.x > 96 ? r0.split('').reverse().join('') : r0; }));
    if (blink) px(c, dx + 5, OFF - 9, P.yellow);
  }

  /* ---------- inside, the house is one dollhouse (2.4.0: a walk-through one). Upstairs: the bathroom (left) and the
     bedroom (right), through an open archway. Downstairs: the kitchen (left), an archway, and the living room with the
     stairs, the bounty board, the regulator clock and the front door. When Aiu's next thing is in another room, you see
     him walk there: through the archways and up or down the stairs. Each room shows whole (no rug cut in half). ---------- */
  /* 2.4.0: bigger, like a little cutaway shelter: four floors. The attic: the office (computer, the drone's dock) and
     the lab. Upstairs: the bathroom, the hallway and the bedroom. Downstairs: the kitchen and the living room. The
     basement: the garage (a workshop and a home gym) and the grow room (the greenhouse indoors). Ladders join the floors. */
  var HH = 270, DY = 63; A.HOUSE_H = HH;
  var AREAS = {
    office: { id: 'office', sx: 54, sy: 46, w: 95, h: 60, px: 0, py: 18 },
    lab: { id: 'lab', sx: 51, sy: 46, w: 95, h: 60, px: 97, py: 18 },
    bath: { id: 'bath', src: 'bath', sx: 8, sy: 46, w: 95, h: 60, px: 0, py: 18 + DY },
    bedroom: { id: 'bedroom', src: 'bedroom', sx: 139, sy: 46, w: 53, h: 60, px: 139, py: 18 + DY }, // past the upstairs hallway
    kitchen: { id: 'kitchen', src: 'kitchen', sx: 58, sy: 45, w: 91, h: 63, px: 0, py: 81 + DY },
    living: { id: 'living', src: 'lounge', sx: 46, sy: 45, w: 99, h: 63, px: 93, py: 81 + DY },
    garage: { id: 'garage', sx: 54, sy: 45, w: 95, h: 60, px: 0, py: 207 },
    grow: { id: 'grow', sx: 51, sy: 45, w: 95, h: 60, px: 97, py: 207 }
  };
  A.HOUSE_AREAS = AREAS;
  A.FRONT_DOOR = { x: 177, y: 99 + DY, w: 13, h: 38 }; A.BOARD_IN_P = { x: 140, y: 86 + DY, w: 20, h: 15 }; var DESK = { x: 12, y: 34, w: 40, h: 38 }, DRONE_IN = { x: -14, y: -6 }; // the drone hovers by its dock in the office
  A.aiuArea = function (sc) {
    if (sc.place === 'kitchen' || sc.roomPlace === 'kitchen') return AREAS.kitchen;
    if (sc.place === 'bath' || sc.roomPlace === 'bath') return AREAS.bath;
    if (sc.act === 'sleep' || sc.mode === 'sleepy') return AREAS.bedroom;
    var R0 = { games: 'office', journal: 'office', tinker: 'lab', pottery: 'lab', workout: 'garage', yoga: 'grow' }[sc.act]; // a room for each thing he does
    if (R0 && !sc.walk) return AREAS[R0];
    return AREAS.living;
  };
  // the walk between rooms: little stops along the floors, the archways and the stairs
  var F2 = 72 + DY, F1 = 136 + DY, FA = 72, FB = 262;
  var NODE = { office: { x: 50, y: FA }, a4: { x: 96, y: FA }, lt: { x: 131, y: FA }, lab: { x: 150, y: FA },
    bath: { x: 34, y: F2 }, a2: { x: 96, y: F2 }, top: { x: 106, y: F2 }, lb: { x: 131, y: F2 }, a3: { x: 137, y: F2 }, bedroom: { x: 150, y: F2 },
    bot: { x: 138, y: F1 }, l1: { x: 86, y: F1 }, a1: { x: 92, y: F1 }, kitchen: { x: 40, y: F1 }, living: { x: 150, y: F1 },
    l1b: { x: 86, y: FB }, a5: { x: 97, y: FB }, garage: { x: 50, y: FB }, grow: { x: 150, y: FB }, door: { x: 183, y: F1 } }; // 2.7.0: the front door
  var EDGE = { office: ['a4'], a4: ['office', 'lt'], lt: ['a4', 'lab', 'lb'], lab: ['lt'],
    bath: ['a2'], a2: ['bath', 'top'], top: ['a2', 'lb', 'bot'], lb: ['top', 'a3', 'lt'], a3: ['lb', 'bedroom'], bedroom: ['a3'],
    bot: ['top', 'a1', 'living'], a1: ['bot', 'l1'], l1: ['a1', 'kitchen', 'l1b'], kitchen: ['l1'], living: ['bot', 'door'], door: ['living'],
    l1b: ['l1', 'garage', 'a5'], garage: ['l1b'], a5: ['l1b', 'grow'], grow: ['a5'] };
  function route(from, to) { var q = [[from]], seen = {}; seen[from] = 1; while (q.length) { var pth = q.shift(), last = pth[pth.length - 1]; if (last === to) return pth.map(function (k) { return NODE[k]; }); EDGE[last].forEach(function (n) { if (!seen[n]) { seen[n] = 1; q.push(pth.concat([n])); } }); } return [NODE[to]]; }
  function routeLen(pts) { var len = 0; for (var i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); return len; }
  A.houseRouteMs = function (from, to) { return Math.max(900, routeLen(route(from || 'living', to || 'living')) / 38 * 1000); }; // 2.7.0: how long a walk through the house takes
  var hwalk = null, lastArea = null, arriveTok = 0, lastSpot = null;
  function spotIn(sc, ar) { var p = A.actorPos(sc); return { x: Math.round(p.x + ar.px - ar.sx), y: Math.round(p.y + ar.py - ar.sy) }; } // where he stands in a room (house pixels)
  function houseWalk(sc) { // -> {p, left, climb} while Aiu walks between rooms (or to and from the front door), else null
    var ar = A.aiuArea(sc), now = Date.now();
    if (sc.hArrive && sc.hArrive !== arriveTok) { arriveTok = sc.hArrive; lastArea = 'door'; hwalk = null; } // 2.7.0: he just came in the front door
    if (sc.hLeave) ar = { id: 'door' }; // 2.7.0: he's heading out the front door
    if (lastArea && lastArea !== ar.id) { var pts = hwalk ? [houseWalkPeek()].concat(route(lastArea, ar.id)) : route(lastArea, ar.id), len = 0; /* changed his mind mid-walk: he carries on from where he is */
      // 2.9.0: start where he stood and end where he'll stand (a room's spot isn't always its waypoint: he used to pop to the sink)
      if (!hwalk && lastSpot && lastSpot.area === lastArea && Math.abs(lastSpot.x - pts[0].x) > 2) pts.unshift({ x: lastSpot.x, y: pts[0].y });
      var end = AREAS[ar.id] ? spotIn(sc, ar) : null; if (end && Math.abs(end.x - pts[pts.length - 1].x) > 2) pts.push({ x: end.x, y: pts[pts.length - 1].y });
      for (var i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); if (pts.length > 1) hwalk = { pts: pts, start: now, dur: Math.max(900, len / 38 * 1000), len: len }; }
    lastArea = ar.id;
    if (!hwalk && AREAS[ar.id] && !sc.hLeave) { var sp = spotIn(sc, ar); lastSpot = { area: ar.id, x: sp.x }; }
    if (!hwalk) return sc.hLeave ? { p: NODE.door, left: false } : null;
    var d = (now - hwalk.start) / hwalk.dur * hwalk.len; if (d >= hwalk.len) { hwalk = null; return sc.hLeave ? { p: NODE.door, left: false } : null; }
    for (var j = 1; j < hwalk.pts.length; j++) { var A0 = hwalk.pts[j - 1], B0 = hwalk.pts[j], sl = Math.hypot(B0.x - A0.x, B0.y - A0.y); if (d <= sl) { var k = sl ? d / sl : 1; return { p: { x: A0.x + (B0.x - A0.x) * k, y: A0.y + (B0.y - A0.y) * k }, left: B0.x < A0.x, climb: Math.abs(B0.x - A0.x) < 2 && Math.abs(B0.y - A0.y) > 6 }; } d -= sl; }
    return null;
  }
  A._hw = function () { return hwalk; }; // (for the tests)
  function houseWalkPeek() { var d = (Date.now() - hwalk.start) / hwalk.dur * hwalk.len; for (var j = 1; j < hwalk.pts.length; j++) { var A0 = hwalk.pts[j - 1], B0 = hwalk.pts[j], sl = Math.hypot(B0.x - A0.x, B0.y - A0.y); if (d <= sl) { var k = sl ? d / sl : 1; return { x: A0.x + (B0.x - A0.x) * k, y: A0.y + (B0.y - A0.y) * k }; } d -= sl; } return hwalk.pts[hwalk.pts.length - 1]; }
  var hcache = { key: null, pics: null };
  function housePics(sc) {
    var key = [sc.house, sc.accent, !!(sc.unlocked && (sc.unlocked.tv || sc.unlocked.games))].join('|');
    if (hcache.key === key) return hcache.pics;
    var pics = {}, mkp = function (fn, dh) { var cv = mk(W, 108), c = cv.getContext('2d'); fn(c, Object.assign({}, sc, { place: 'home', indoor: true, shop: {}, dh: dh || {} })); return cv; };
    pics.bedroom = mkp(IN.drawRoom, { noRug: true, noTV: true, noWindow: true }); pics.lounge = mkp(IN.drawRoom, { noRug: true, noBed: true, noWindow: true, noTV: true, noLamp: true });
    pics.kitchen = mkp(A.ROOMS.kitchen); pics.bath = mkp(A.ROOMS.bath);
    hcache = { key: key, pics: pics }; return pics;
  }
  function inArea(ctx, ar, fn) { ctx.save(); ctx.beginPath(); ctx.rect(ar.px, ar.py, ar.w, ar.h); ctx.clip(); ctx.translate(ar.px - ar.sx, ar.py - ar.sy); fn(); ctx.restore(); }
  function arch(c, x, top, bot, col) { // 2.4.0: an inside wall from the ceiling down to a doorway he walks through
    var dt = bot - 30; R(c, x, top, 4, dt - top, P.ink); R(c, x + 1, top, 2, dt - top - 1, col); // the wall
    R(c, x - 1, dt - 2, 6, 3, P.ink); R(c, x, dt - 1, 4, 1, P.wood); // the top of the doorway (the trim)
  }
  // 2.7.0: the stairs match the house: wooden for the cabin, stone for the cave and the castle, a carpet runner for the
  // mansion, bamboo for the lily pad. Each step is its own tread and riser, the space under them is a closed panel with
  // a little cupboard door, and the banister has a post every other step (no more line through the steps).
  var STAIR = {
    cabin: { tread: P.sand, riser: P.wood, under: P.bark, rail: P.bark, post: P.wood, edge: P.ink },
    cave: { tread: P.silver, riser: P.slate, under: P.dark, rail: P.ink, post: P.slate, edge: P.ink },
    castle: { tread: P.white, riser: P.silver, under: P.slate, rail: P.ink, post: P.dark, edge: P.ink },
    mansion: { tread: P.white, riser: P.sand, under: P.wood, rail: P.ink, post: P.white, edge: P.ink, runner: P.red },
    lilypad: { tread: P.lime, riser: P.green, under: P.teal, rail: P.green, post: P.lime, edge: P.ink }
  };
  function stairs(c, sc) { // from the living room floor up to the bedroom floor, going up to the left
    var st = STAIR[sc.house] || STAIR.cabin, x0 = 140, y0 = 137, x1 = 100, y1 = 79, n = 8, sw = (x0 - x1) / n, sh = (y0 - y1) / n;
    // the panel under the stairs (closed in, so it reads as one solid staircase)
    for (var i = 0; i < n; i++) { var sx = Math.round(x0 - sw * (i + 1)), sy = Math.round(y0 - sh * (i + 1)); R(c, sx, sy + Math.round(sh), Math.ceil(sw) + 1, y0 - sy - Math.round(sh), st.under); }
    R(c, 103, 120, 10, 17, st.edge); R(c, 104, 121, 8, 16, st.riser); px(c, 110, 129, P.yellow); // a little cupboard door under the stairs
    // the steps
    for (var k = 0; k < n; k++) {
      var tx = Math.round(x0 - sw * (k + 1)), ty = Math.round(y0 - sh * (k + 1)), tw = Math.round(sw) + 1, th = Math.round(sh);
      R(c, tx, ty, tw, th, st.riser); R(c, tx - 1, ty, tw + 1, 3, st.tread); R(c, tx - 1, ty - 1, tw + 1, 1, st.edge); R(c, tx - 1, ty, 1, th, st.edge); // tread (with a lip), riser, and a dark edge along the sawtooth
      if (st.runner) R(c, tx, ty, tw - 1, 2, st.runner);
    }
    line(c, x1, y1 + Math.round(sh), x0, y0, st.edge); // the stringer
    // the banister: a post every other step and a rail along the top
    for (var q = 0; q <= n; q += 2) { var bx = Math.round(x0 - sw * q) - 1, by = Math.round(y0 - sh * q); R(c, bx, by - 10, 1, 10, st.post); }
    R(c, x0 - 2, y0 - 14, 3, 14, st.edge); R(c, x0 - 1, y0 - 13, 1, 13, st.post); // the newel post at the bottom
    line(c, x1, y1 - 11, x0 - 1, y0 - 14, st.edge); line(c, x1, y1 - 10, x0 - 1, y0 - 13, st.rail);
    R(c, x0, y1 - 2, 3, y0 - y1 + 2, P.ink); R(c, x0 + 1, y1 - 2, 1, y0 - y1 + 2, st.post); // a clean trim line where the stairs meet the wall
  }
  function GM_line(c, x0, y0, x1, y1, col) { line(c, x0, y0, x1, y1, col); }
  /* 2.4.0: the four rooms, drawn clean for the dollhouse (crisp edges, one look per room), with the furniture right where
     Aiu's activities expect it (the stove, the sink, the tub, the bed). Cached; only the clock, the board, the door and
     Aiu move. */
  var dcache = { key: null, cv: null };
  function box(c, x, y, w, hh, fill, hi, lo) { R(c, x, y, w, hh, P.ink); R(c, x + 1, y + 1, w - 2, hh - 2, fill); if (hi) R(c, x + 1, y + 1, w - 2, 1, hi); if (lo) R(c, x + 1, y + hh - 2, w - 2, 1, lo); }
  function tiles(c, x, y, w, hh, a, b, sz) { for (var j = 0; j < hh; j += sz) for (var i = 0; i < w; i += sz) R(c, x + i, y + j, Math.min(sz, w - i), Math.min(sz, hh - j), ((i + j) / sz) % 2 ? a : b); }
  function grid(c, x, y, w, hh, col, sz) { for (var j = sz; j < hh; j += sz) R(c, x, y + j, w, 1, col); for (var i = sz; i < w; i += sz) R(c, x + i, y, 1, hh, col); }
  function planks(c, x, y, w, hh, a, b) { R(c, x, y, w, hh, a); for (var j = 0; j < hh; j += 2) { R(c, x, y + j, w, 1, j % 4 ? a : b); for (var i = (j * 7) % 23; i < w; i += 23) px(c, x + i, y + j + 1, b); } }
  function dollStatic(sc) {
    var key = [sc.house, sc.accent, 'v270'].join('|'); if (dcache.key === key) return dcache.cv;
    var cv = big(W, HH), c = cv.getContext('2d'), acc = sc.accent || P.red, hs = sc.house;
    attic(c, sc); basement(c, sc);
    c.save(); c.translate(0, DY);
    // ---- the kitchen (downstairs left): warm cream, a yellow-check backsplash, a retro range ----
    R(c, 0, 81, 91, 55, '#f4e6c8'); for (var kx = 0; kx < 91; kx += 12) R(c, kx, 81, 1, 19, '#ead6ad');
    tiles(c, 0, 99, 91, 9, P.yellow, P.white, 3); R(c, 0, 99, 91, 1, P.sand);
    box(c, 1, 83, 44, 13, P.wood, P.sand, P.bark); R(c, 22, 84, 1, 11, P.ink); px(c, 19, 90, P.yellow); px(c, 25, 90, P.yellow); // upper cabinets
    box(c, 0, 107, 48, 4, P.silver, P.white); R(c, 5, 108, 16, 2, P.slate); R(c, 11, 100, 2, 8, P.silver); R(c, 11, 100, 6, 2, P.silver); px(c, 16, 102, P.sky); // counter, sink, faucet
    box(c, 0, 111, 48, 25, P.wood, P.sand, P.bark); R(c, 23, 112, 1, 23, P.ink); box(c, 4, 114, 16, 18, P.wood, P.sand); box(c, 27, 114, 17, 18, P.wood, P.sand); px(c, 17, 122, P.yellow); px(c, 30, 122, P.yellow); // base cabinets
    box(c, 29, 99, 13, 9, P.white, null, P.silver); px(c, 34, 102, P.red); px(c, 35, 102, P.pink); R(c, 33, 97, 5, 2, P.silver); // rice cooker
    var ox = A.OVEN.x - 58, ot = A.OVEN.top + 36; // the range (where the cooking activities put the pan)
    R(c, ox + 2, 84, 28, 7, P.ink); R(c, ox + 3, 85, 26, 5, P.silver); R(c, ox + 3, 85, 26, 1, P.white); R(c, ox + 13, 81, 6, 3, P.silver); // hood
    box(c, ox - 1, ot - 9, 34, 9, P.white, null, P.silver); GM_disc(c, ox + 16, ot - 5, 2, P.silver); px(c, ox + 16, ot - 5, P.ink);
    R(c, ox, ot, 32, 2, P.ink); [ox + 3, ox + 11, ox + 19, ox + 26].forEach(function (bx) { R(c, bx, ot - 1, 5, 1, P.dark); });
    box(c, ox, ot + 2, 32, 32, '#f6edd8', P.white, P.silver); [ox + 5, ox + 11, ox + 20, ox + 26].forEach(function (kn) { GM_disc(c, kn, ot + 5, 1, P.ink); });
    box(c, ox + 4, ot + 10, 24, 16, P.dark, P.slate); R(c, ox + 6, ot + 12, 6, 2, P.slate); R(c, ox + 2, ot + 34, 3, 2, P.ink); R(c, ox + 27, ot + 34, 3, 2, P.ink);
    box(c, 84, 84, 7, 14, P.bark); [86, 88].forEach(function (jx, i) { R(c, jx, 86, 2, 4, i ? P.red : P.lime); }); // a little spice shelf
    tiles(c, 0, 136, 91, 5, P.red, P.white, 3); // checker floor
    // ---- the bathroom (upstairs left): white tile above, sea-glass tile below, a wooden ofuro ----
    R(c, 0, 18, 95, 54, P.white); grid(c, 0, 18, 95, 22, '#d9e6ee', 6); R(c, 0, 40, 95, 32, P.cyan); grid(c, 0, 40, 95, 32, P.sky, 6); R(c, 0, 40, 95, 1, P.blue);
    GM_disc(c, 30, 28, 6, P.ink); GM_disc(c, 30, 28, 5, P.sky); R(c, 27, 25, 2, 2, P.white); // a round window
    box(c, 6, 38, 52, 34, P.sand, P.white, P.wood); for (var tb = 46; tb < 72; tb += 9) R(c, 7, tb, 50, 1, P.wood); R(c, 8, 40, 48, 3, P.sky); R(c, 10, 40, 12, 1, P.cyan); // the tub
    box(c, 66, 19, 22, 15, P.silver); R(c, 67, 20, 20, 13, '#bfeff7'); R(c, 69, 21, 3, 6, P.white); // mirror
    box(c, 64, 40, 28, 5, P.white, null, P.silver); R(c, 69, 41, 18, 2, P.silver); box(c, 74, 45, 7, 27, P.white, null, P.silver); R(c, 77, 34, 2, 6, P.silver); R(c, 77, 34, 5, 2, P.silver); // sink
    box(c, 85, 35, 5, 5, P.sky); R(c, 86, 31, 1, 4, P.red); R(c, 88, 32, 1, 3, P.green); // toothbrush cup
    box(c, 87, 52, 7, 11, P.white, null, P.silver); R(c, 89, 54, 3, 1, P.silver); box(c, 82, 62, 12, 5, P.white); R(c, 83, 62, 10, 1, P.silver); box(c, 84, 66, 7, 6, P.white, null, P.silver); // 2.4.0: the toilet
    R(c, 44, 22, 14, 1, P.silver); box(c, 46, 23, 10, 11, P.pink, P.white); // towel
    tiles(c, 0, 72, 95, 6, P.white, P.silver, 3);
    // ---- 2.4.0: the upstairs hallway, where the stairs come up: open floor to walk across, a window, a runner ----
    R(c, 97, 18, 40, 54, '#efd9a8'); for (var hx = 99; hx < 137; hx += 8) R(c, hx, 18, 1, 32, '#e2c78c'); R(c, 97, 50, 40, 22, P.wood); R(c, 97, 50, 40, 1, P.bark); for (var hx2 = 100; hx2 < 136; hx2 += 6) R(c, hx2, 52, 4, 18, '#b07a4c');
    box(c, 109, 24, 18, 16, P.white); R(c, 111, 26, 14, 12, P.sky); R(c, 117, 26, 2, 12, P.white); R(c, 111, 31, 14, 2, P.white); // a little window
    R(c, 98, 56, 3, 16, P.ink); R(c, 99, 57, 1, 15, P.wood); R(c, 97, 55, 5, 2, P.bark); // the newel post at the top of the stairs (against the wall, out of the way)
    // ---- the bedroom (upstairs right): soft lavender stripes, the bed, a floor lamp ----
    R(c, 138, 18, 54, 54, '#cbbbe8'); for (var bx2 = 140; bx2 < 192; bx2 += 6) R(c, bx2, 18, 2, 54, '#bba8e0'); R(c, 138, 58, 54, 1, P.white); R(c, 138, 59, 54, 13, '#a993d6');
    box(c, 146, 36, 4, 36, P.bark); box(c, 182, 38, 5, 34, P.bark); box(c, 146, 60, 41, 6, P.bark, P.wood); R(c, 148, 66, 2, 6, P.ink); R(c, 183, 66, 2, 6, P.ink); // bed frame
    box(c, 147, 55, 38, 6, P.white); R(c, 148, 53, 26, 8, acc); R(c, 148, 53, 26, 1, P.white); box(c, 174, 50, 9, 6, P.white); // mattress, blanket, pillow
    box(c, 140, 62, 5, 10, P.bark); R(c, 142, 36, 1, 26, P.dark); // a bedside lamp on a little stand (its shade lights up at night)
    R(c, 138, 29, 9, 7, P.ink); R(c, 139, 30, 7, 5, P.sand); R(c, 139, 34, 7, 1, P.orange);
    box(c, 158, 24, 14, 10, P.white); R(c, 160, 26, 10, 6, P.yellow); R(c, 162, 28, 3, 3, P.green); // a little picture
    planks(c, 97, 72, 40, 6, P.wood, P.bark); R(c, 102, 73, 32, 3, P.red); R(c, 103, 74, 30, 1, P.orange); // the hallway runner
    planks(c, 138, 72, 54, 6, P.wood, P.bark); GM_ell(c, 165, 74, 14, 2, acc); GM_ell(c, 165, 74, 10, 1, P.white);
    // ---- the living room (downstairs right): the house's own wall, a wainscot, the stairs ----
    var lw = { cabin: [P.wood, P.bark], cave: [P.slate, P.dark], mansion: [P.white, P.sand], castle: [P.silver, P.slate], lilypad: [P.lime, P.green] }[hs] || [P.wood, P.bark];
    R(c, 93, 81, 99, 55, lw[0]);
    if (hs === 'castle' || hs === 'cave') { for (var sy = 85; sy < 118; sy += 6) { R(c, 93, sy, 99, 1, lw[1]); for (var sx2 = 93 + ((sy / 6) % 2 ? 4 : 0); sx2 < 192; sx2 += 9) R(c, sx2, sy - 5, 1, 5, lw[1]); } }
    else if (hs === 'mansion') for (var mx = 96; mx < 192; mx += 10) R(c, mx, 81, 2, 37, P.sand);
    else for (var ly = 84; ly < 118; ly += 4) R(c, 93, ly, 99, 1, lw[1]); // logs
    R(c, 93, 118, 99, 18, P.bark); R(c, 93, 118, 99, 1, P.ink); for (var wx = 96; wx < 192; wx += 10) R(c, wx, 120, 8, 14, P.wood); // wainscot
    box(c, 168, 124, 8, 12, P.orange, P.yellow); R(c, 170, 117, 1, 7, P.green); R(c, 172, 115, 1, 9, P.green); R(c, 168, 118, 3, 2, P.lime); R(c, 172, 114, 3, 2, P.lime); // a plant
    planks(c, 93, 136, 99, 5, P.wood, P.bark);
    GM_ell(c, 152, 138, 22, 3, P.red); GM_ell(c, 152, 138, 18, 2, P.orange); GM_ell(c, 152, 138, 12, 1, P.red); // the rug
    stairs(c, sc);
    // the bones of the house: the floors, the outer walls, the archways
    R(c, 0, 78, W, 3, P.bark); R(c, 0, 78, W, 1, P.ink); R(c, 0, 141, W, 3, P.bark); R(c, 0, 141, W, 1, P.ink); R(c, 0, 18, 1, 126, P.ink); R(c, W - 1, 18, 1, 126, P.ink);
    arch(c, 95, 18, 78, P.bark); arch(c, 136, 18, 78, P.bark); arch(c, 90, 81, 141, P.bark); // bath | hallway | bedroom; kitchen | living room
    c.restore();
    ladder(c, 128, FA, F2); ladder(c, 83, F1, FB); // the hallway up to the attic; the kitchen down to the basement
    R(c, 0, 18, 1, HH - 18, P.ink); R(c, W - 1, 18, 1, HH - 18, P.ink); R(c, 0, HH - 3, W, 3, P.dark); R(c, 0, HH - 3, W, 1, P.ink);
    dcache = { key: key, cv: cv }; return cv;
  }
  function ladder(c, x, y0, y1) { // from one floor (y0) down to the next (y1); the top pokes up through the floor
    R(c, x, y0 - 10, 2, y1 - y0 + 10, P.ink); R(c, x + 6, y0 - 10, 2, y1 - y0 + 10, P.ink); R(c, x + 1, y0 - 10, 1, y1 - y0 + 10, P.wood); R(c, x + 7, y0 - 10, 1, y1 - y0 + 10, P.wood);
    for (var y = y0 - 6; y < y1; y += 5) { R(c, x + 2, y, 4, 2, P.ink); R(c, x + 2, y, 4, 1, P.sand); }
    R(c, x - 2, y0 + 6, 12, 3, P.ink); // the hole in the floor
  }
  function attic(c, sc) { // the office (left) and the lab (right) under the roof
    // the office: blue-grey wall, a desk with the computer, a bookshelf, the drone's dock, a skylight
    R(c, 0, 18, 95, 54, '#9fb3c8'); for (var x = 0; x < 95; x += 10) R(c, x, 18, 1, 54, '#8fa3ba'); R(c, 0, 56, 95, 16, '#6f7f96'); R(c, 0, 56, 95, 1, P.ink);
    box(c, 30, 21, 24, 10, P.white); R(c, 32, 23, 20, 6, P.sky); R(c, 41, 23, 2, 6, P.white); // the skylight
    box(c, 2, 26, 22, 46, P.bark, P.wood); for (var sh = 34; sh < 70; sh += 9) { R(c, 3, sh, 20, 2, P.wood); for (var bk = 4; bk < 22; bk += 3) R(c, bk, sh - 6, 2, 6, [P.red, P.blue, P.yellow, P.green, P.pink, P.teal][(bk + sh) % 6]); } // books
    box(c, 26, 52, 36, 4, P.wood, P.sand); R(c, 28, 56, 2, 16, P.bark); R(c, 58, 56, 2, 16, P.bark); // the desk
    box(c, 34, 36, 20, 15, P.ink); R(c, 35, 37, 18, 12, P.navy); R(c, 37, 39, 6, 2, P.lime); R(c, 37, 42, 10, 1, P.cyan); R(c, 37, 44, 8, 1, P.cyan); R(c, 43, 51, 3, 1, P.slate); R(c, 36, 51, 14, 1, P.silver); // the computer
    box(c, 64, 60, 12, 4, P.red); R(c, 65, 64, 2, 8, P.ink); R(c, 73, 64, 2, 8, P.ink); R(c, 64, 52, 3, 8, P.red); // the chair
    box(c, 70, 44, 20, 3, P.silver); R(c, 76, 47, 8, 1, P.dark); R(c, 74, 44, 2, 1, P.lime); R(c, 84, 44, 2, 1, P.lime); // the drone's dock (a little shelf with lights)
    planks(c, 0, 72, 95, 6, P.wood, P.bark); R(c, 20, 73, 40, 3, P.navy);
    // the lab: white tile, a workbench with flasks and a 3D printer, a breadboard on the wall, a telescope at the window
    R(c, 97, 18, 95, 54, P.white); grid(c, 97, 18, 95, 54, '#dfe7ec', 6); R(c, 97, 50, 95, 22, P.silver); R(c, 97, 50, 95, 1, P.slate);
    box(c, 132, 22, 22, 16, P.white); R(c, 134, 24, 18, 12, P.navy); R(c, 138, 27, 1, 1, P.white); R(c, 146, 25, 1, 1, P.yellow); R(c, 149, 31, 1, 1, P.white); // a night-sky window
    for (var t = 0; t < 12; t++) { R(c, 106 + t, 54 - Math.round(t * 0.7), 5, 4, P.ink); R(c, 107 + t, 55 - Math.round(t * 0.7), 3, 2, t > 9 ? P.blue : P.white); } R(c, 117, 44, 4, 4, P.cyan); R(c, 108, 56, 4, 4, P.ink); line(c, 110, 60, 104, 72, P.ink); line(c, 110, 60, 110, 72, P.ink); line(c, 110, 60, 116, 72, P.ink); // the telescope on its tripod, aimed at the window
    box(c, 140, 54, 50, 4, P.wood, P.sand); R(c, 143, 58, 2, 14, P.bark); R(c, 185, 58, 2, 14, P.bark); // the bench
    [[146, P.lime], [152, P.pink], [158, P.cyan]].forEach(function (q) { R(c, q[0], 47, 4, 7, P.ink); R(c, q[0] + 1, 50, 2, 4, q[1]); R(c, q[0] + 1, 45, 2, 2, P.ink); }); // flasks
    box(c, 166, 40, 18, 14, P.dark); R(c, 168, 42, 14, 1, P.silver); R(c, 173, 44, 4, 3, P.orange); R(c, 172, 50, 6, 3, P.lime); // the 3D printer
    box(c, 102, 26, 22, 14, '#f0ead8'); for (var bi = 0; bi < 6; bi++) R(c, 104 + bi * 3, 29, 1, 1, P.slate); R(c, 105, 32, 8, 1, P.red); R(c, 108, 35, 9, 1, P.ink); GM_disc(c, 120, 30, 2, P.red); // a breadboard
    tiles(c, 97, 72, 95, 6, P.white, P.silver, 3);
    R(c, 0, 78, W, 3, P.bark); R(c, 0, 78, W, 1, P.ink); arch(c, 95, 18, 78, P.bark);
  }
  function basement(c, sc) { // the garage (left) and the grow room (right), down below
    // the garage: concrete, a pegboard of tools, a little car on the lift, a home gym corner
    R(c, 0, 207, 95, 55, '#8d96a3'); for (var y = 211; y < 262; y += 8) R(c, 0, y, 95, 1, '#7d8693'); R(c, 0, 240, 95, 22, P.slate);
    box(c, 4, 212, 30, 18, P.wood); for (var ph = 0; ph < 12; ph++) R(c, 6 + (ph % 6) * 5, 214 + Math.floor(ph / 6) * 8, 1, 1, P.bark); R(c, 8, 214, 1, 7, P.silver); R(c, 12, 214, 4, 2, P.silver); R(c, 13, 216, 1, 5, P.silver); R(c, 20, 214, 2, 6, P.red); R(c, 26, 215, 4, 4, P.yellow); // tools
    car(c, 0, 261); // 2.7.0: a proper little car (the old boxy one is in _archive/2.7.0-replaced)
    box(c, 64, 230, 2, 22, P.ink); R(c, 56, 236, 18, 2, P.silver); R(c, 54, 233, 3, 8, P.dark); R(c, 73, 233, 3, 8, P.dark); // a barbell on a rack
    box(c, 41, 246, 10, 16, P.orange); R(c, 43, 249, 6, 2, P.ink); R(c, 41, 254, 10, 1, P.ink); // an oil drum (out from behind the ladder)
    R(c, 0, 262, 95, 5, P.dark); for (var gx = 0; gx < 95; gx += 12) R(c, gx, 262, 1, 5, P.slate);
    // the grow room: green-tinted wall, grow lights, planters with seedlings and tomatoes
    R(c, 97, 207, 95, 55, '#cfe6c8'); for (var gy = 211; gy < 262; gy += 7) R(c, 97, gy, 95, 1, '#bcd8b4');
    [[112, 3], [140, 3], [168, 3]].forEach(function (q) { R(c, q[0] - 10, 212, 22, 3, P.ink); R(c, q[0] - 9, 213, 20, 1, P.pink); R(c, q[0], 207, 1, 5, P.ink); }); // grow lights
    [[104, 236], [132, 236], [160, 236]].forEach(function (q, i) { box(c, q[0], q[1], 22, 10, P.wood, P.sand); for (var pl = 0; pl < 3; pl++) { R(c, q[0] + 4 + pl * 7, q[1] - 8, 1, 8, P.green); R(c, q[0] + 2 + pl * 7, q[1] - 7, 3, 2, P.lime); R(c, q[0] + 5 + pl * 7, q[1] - 10, 3, 2, P.lime); if (i === 1) GM_disc(c, q[0] + 5 + pl * 7, q[1] - 4, 1, P.red); } R(c, q[0] + 2, q[1] + 10, 2, 16, P.bark); R(c, q[0] + 18, q[1] + 10, 2, 16, P.bark); }); // planters
    box(c, 184, 246, 7, 10, P.sky); R(c, 186, 244, 3, 2, P.sky); // a watering can
    planks(c, 97, 262, 95, 5, P.bark, P.ink);
    R(c, 0, 204, W, 3, P.bark); R(c, 0, 204, W, 1, P.ink); arch(c, 95, 207, 267, P.bark);
  }
  function GM_disc(c, x, y, r, col) { disc(c, x, y, r, col); }
  function car(c, x, gy) { // 2.7.0: a little red coupe, side on, facing right; gy = the floor
    var y = gy - 18;
    ell(c, x + 19, gy, 18, 1, P.dark); // its shadow
    // the body: a long low hood, a rounded roof, a short trunk
    R(c, x + 1, y + 9, 37, 6, P.ink); R(c, x + 2, y + 9, 35, 5, P.red); R(c, x + 2, y + 13, 35, 1, '#7d2335'); // lower body
    R(c, x + 9, y + 3, 19, 7, P.ink); R(c, x + 10, y + 4, 17, 6, P.red); R(c, x + 8, y + 5, 1, 4, P.ink); R(c, x + 28, y + 5, 1, 4, P.ink); // the cabin
    R(c, x + 2, y + 8, 8, 2, P.red); R(c, x + 28, y + 8, 9, 2, P.red); R(c, x + 1, y + 8, 1, 1, P.ink); R(c, x + 37, y + 8, 1, 1, P.ink);
    R(c, x + 3, y + 9, 33, 1, P.pink); R(c, x + 11, y + 4, 15, 1, P.pink); // the shine
    // windows: two panes and a pillar
    R(c, x + 11, y + 5, 7, 4, P.cyan); R(c, x + 19, y + 5, 7, 4, P.cyan); R(c, x + 18, y + 5, 1, 4, P.ink); R(c, x + 12, y + 5, 2, 1, P.white); R(c, x + 20, y + 5, 2, 1, P.white);
    // the door, its handle, a side mirror
    R(c, x + 18, y + 10, 1, 4, '#7d2335'); R(c, x + 21, y + 11, 2, 1, P.silver); R(c, x + 28, y + 6, 2, 2, P.ink);
    // lights and bumpers
    R(c, x + 36, y + 10, 2, 2, P.yellow); R(c, x + 1, y + 10, 2, 2, P.orange); R(c, x + 34, y + 14, 5, 1, P.silver); R(c, x, y + 14, 5, 1, P.silver);
    // wheels: tyre, rim, hubcap, and the arches over them
    [x + 9, x + 30].forEach(function (wx) { R(c, wx - 5, y + 11, 10, 3, P.ink); disc(c, wx, gy - 3, 3, P.ink); disc(c, wx, gy - 3, 2, P.slate); R(c, wx - 1, gy - 4, 2, 2, P.silver); px(c, wx, gy - 3, P.white); });
  }
  function GM_ell(c, x, y, rx, ry, col) { ell(c, x, y, rx, ry, col); }
  function renderHouse(ctx, sc) {
    var f = sc.f, roofCol = { cabin: P.red, cave: P.slate, mansion: P.navy, castle: P.silver, lilypad: P.red }[sc.house] || P.red, wallCol = { cabin: P.wood, cave: P.slate, mansion: P.white, castle: P.silver, lilypad: P.sand }[sc.house] || P.wood;
    ctx.clearRect(0, 0, W, HH);
    IN.drawSky(ctx, 0, 0, W, 24, IN.skyBands(sc.phase, sc.weather)); IN.skyThings(ctx, sc, [0, 0, W, 9]);
    for (var y = 9; y < 18; y++) { var hw = Math.round(44 + (y - 9) * 6.5); R(ctx, 96 - hw, y, hw * 2, 1, y < 10 ? P.ink : roofCol); } // a low roof, so the drone has open sky above it
    R(ctx, 0, 15, W, 3, P.bark); disc(ctx, 96, 13, 2, P.ink); px(ctx, 96, 13, P.sky);
    ctx.drawImage(dollStatic(sc), 0, 0, W, HH); // 2.4.0: the clean rooms (the old cropped pictures: housePics, kept for reference)
    var cz = sc.cos || {}; // 2.5.0: Corner Mart things in the house: a rug over the living room's, art on the bedroom wall
    if (cz.rug) { ctx.drawImage(cz.rug.img, 152 - 24, 138 + DY - 6, 48, 12); }
    if (cz.wall) { var wi = cz.wall.img; ctx.drawImage(wi, 165 - Math.floor(wi.width / 2), 22 + DY); } // over the bedroom's little picture
    var D = A.FRONT_DOOR, open = sc.doorOpen; R(ctx, D.x - 1, D.y - 1, D.w + 2, D.h + 1, P.bark); R(ctx, D.x, D.y, D.w, D.h, open ? P.ink : wallCol === P.white ? P.red : P.wood);
    if (open) R(ctx, D.x + 1, D.y + D.h - 8, D.w - 2, 6, P.green); else { R(ctx, D.x + 2, D.y + 4, D.w - 4, 12, P.bark); R(ctx, D.x + 2, D.y + 20, D.w - 4, 12, P.bark); px(ctx, D.x + 2, D.y + 19, P.yellow); }
    R(ctx, D.x - 1, D.y - 10, D.w + 2, 8, P.ink); R(ctx, D.x, D.y - 9, D.w, 6, P.green); spr(ctx, D.x + 3, D.y - 8, ['...w..', '...ww.', 'wwwwww', '...ww.', '...w..']); // a green sign: the way out to the yard
    var B = A.BOARD_IN_P; R(ctx, B.x - 1, B.y - 1, B.w + 2, B.h + 2, P.bark); R(ctx, B.x, B.y, B.w, B.h, P.wood); dith(ctx, B.x, B.y, B.w, B.h, P.orange, 1);
    var n = (sc.board && sc.board.n) || 0; R(ctx, B.x + 3, B.y + 3, 9, 9, n ? P.white : P.sand); if (n) spr(ctx, B.x + 6, B.y + 5, IN.DIG[Math.min(9, n)]); if ((sc.board && sc.board.ring) || (AIU.life && AIU.life.news())) { if (f % 6 < 4) { R(ctx, B.x + 15, B.y - 4, 4, 8, P.red); R(ctx, B.x + 16, B.y - 3, 2, 4, P.white); R(ctx, B.x + 16, B.y + 2, 2, 1, P.white); } }
    regulatorSmall(ctx, 164, 86 + DY, sc);
    // Aiu: in his room doing his thing, or walking to the next room
    var hwk = !sc.walk ? houseWalk(sc) : null;
    if (!(A.toyHide && A.toyHide('aiu'))) {
      if (hwk) drawWalker(ctx, sc, hwk.climb ? { x: hwk.p.x + 1, y: hwk.p.y } : hwk.p, hwk.left, 1, hwk.climb);
      else { var ar = A.aiuArea(sc); inArea(ctx, ar, function () { IN.drawActor(ctx, sc); }); }
    }
    var dim = sc.phase === 'night' ? 0.55 : sc.phase === 'dusk' || sc.phase === 'dawn' ? 0.25 : 0;
    if (dim) { ctx.globalAlpha = dim * 0.45; R(ctx, 0, 18, W, HH - 18, P.ink); ctx.globalAlpha = 1; var lon = sc.phase !== 'day'; R(ctx, 138, 29 + DY, 9, 7, P.ink); R(ctx, 139, 30 + DY, 7, 5, lon ? P.yellow : P.sand); R(ctx, 139, 34 + DY, 7, 1, P.orange); if (lon) { ctx.globalAlpha = 0.25; disc(ctx, 142, 36 + DY, 9, P.yellow); ctx.globalAlpha = 1; } }
    if (sc.stage) { ctx.save(); ctx.translate(DRONE_IN.x, DRONE_IN.y); IN.drone(ctx, sc); ctx.restore(); }
    if (A.toyDraw) A.toyDraw(ctx, sc);
  }
  function regulatorSmall(c, x, y, sc) { // a regulator wall clock: the real time, a swinging brass pendulum
    var now = new Date(app().trueNow ? app().trueNow() : Date.now()), wn = U.wall ? U.wall(now) : now, hr = wn.getHours() % 12, mi = wn.getMinutes();
    R(c, x + 1, y - 2, 9, 2, P.bark); px(c, x + 5, y - 3, P.yellow);
    R(c, x, y, 11, 30, P.bark); R(c, x + 1, y + 1, 9, 28, P.wood); R(c, x + 2, y + 30, 7, 1, P.bark);
    disc(c, x + 5, y + 6, 4, P.yellow); disc(c, x + 5, y + 6, 3, P.white);
    var ah = (hr + mi / 60) / 12 * Math.PI * 2, am = mi / 60 * Math.PI * 2;
    line(c, x + 5, y + 6, Math.round(x + 5 + Math.sin(ah) * 1.6), Math.round(y + 6 - Math.cos(ah) * 1.6), P.ink); line(c, x + 5, y + 6, Math.round(x + 5 + Math.sin(am) * 2.6), Math.round(y + 6 - Math.cos(am) * 2.6), P.ink);
    R(c, x + 2, y + 11, 7, 16, P.navy); var sw = Math.round(Math.sin(Date.now() / 1000 * Math.PI) * 2); line(c, x + 5, y + 12, x + 5 + sw, y + 23, P.yellow); disc(c, x + 5 + sw, y + 24, 1, P.yellow);
  }

  /* ---------- drawing a frame ---------- */
  var layer = null;
  A.renderWorld = function (ctx, sc) {
    ctx.setTransform(SC, 0, 0, SC, 0, 0); ctx.imageSmoothingEnabled = false;
    if (A.isRoom(sc)) return sc.place === 'library' ? renderRoom(ctx, sc) : renderHouse(ctx, sc);
    if (A.CASTLE && AIU.castle) return AIU.castle.render(ctx, sc); // 3.0: one picture: the castle
    renderProperty(ctx, sc);
  };
  function renderRoom(ctx, sc) {
    ctx.clearRect(0, 0, W, H);
    ctx.save(); ctx.translate(0, OFF); A.render(ctx, sc); ctx.restore();
    roomBand(ctx, sc);
    if ((sc.place === 'home' || !sc.place) && sc.indoor) regulator(ctx, 118, 4, sc); // where the picture used to hang
    var dim = sc.phase === 'night' ? 0.55 : sc.phase === 'dusk' || sc.phase === 'dawn' ? 0.25 : 0;
    if (dim) { ctx.globalAlpha = dim * 0.45; R(ctx, 0, 0, W, OFF, P.ink); ctx.globalAlpha = 1; }
    if (A.toyDraw) A.toyDraw(ctx, sc);
  }
  function renderProperty(ctx, sc) {
    var key = [sc.biome, sc.season, sc.house, sc.accent].join('|');
    if (stat.key !== key) { stat.cv = drawStatic(sc); stat.key = key; }
    if (!layer) layer = big(W, H);
    var L = layer.getContext('2d'); L.setTransform(SC, 0, 0, SC, 0, 0); L.imageSmoothingEnabled = false; L.clearRect(0, 0, W, H);
    var bands = IN.skyBands(sc.phase, sc.weather);
    ctx.clearRect(0, 0, W, H);
    IN.drawSky(ctx, 0, 0, W, 50, bands); IN.skyThings(ctx, sc, [0, 0, W, 40]);
    L.drawImage(stat.cv, 0, 0, W, H);
    // chimney smoke and the castle flag (from the house pictures)
    if (sc.house === 'cabin' && (sc.phase !== 'day' || sc.season === 'winter' || sc.weather !== 'clear' || sc.aiuIn)) for (var s = 0; s < 3; s++) { var hp = houseToP(49, 44 - ((sc.f * 0.6 + s * 6) % 18)); disc(L, Math.round(hp.x + Math.sin((sc.f + s * 5) * 0.3)), Math.round(hp.y), s % 2, P.silver); }
    // Aiu's in the house (you're looking out at the yard): a glow in the window and a little "he's in here" sparkle
    if (sc.aiuIn) { var wp = houseToP(47, 76); if (sc.f % 12 < 8) { px(L, Math.round(wp.x), Math.round(wp.y - 6), P.yellow); px(L, Math.round(wp.x) + 1, Math.round(wp.y - 7), P.white); } }
    // the animals from the barn, back to front
    var anis = A.animalsIn(app().S).map(function (an) { var p = A.animalPos(an, sc); return { an: an, p: p }; }).filter(function (o) { return !(A.toyHide && A.toyHide('ani:' + o.an.id)); });
    // the field: animals, the pet and Aiu, sorted by how far back they stand
    var wk = A.walkerPos(sc), items = [];
    anis.forEach(function (o) { items.push({ y: o.p.y, draw: function () { L.save(); if (o.p.left) { L.translate(o.p.x * 2, 0); L.scale(-1, 1); } ANI[o.an.kind](L, o.p.x, o.p.y, sc.f, o.an.k); L.restore(); } }); });
    var cooking = sc.act === 'hibachi' && !sc.aiuIn && !wk && !(A.toyHide && A.toyHide('aiu'));
    drawCart(L, sc, cooking);
    var od = A.oddNow && A.oddNow(sc); if (od) items.push({ y: od.y, draw: function () { A.drawOdd(L, od, sc); } }); // 2.4.0: now and then, a strange friendly creature
    var cy = sc.cos && sc.cos.yard; if (cy) items.push({ y: 141, draw: function () { var yi = cy.img; ell(L, 152, 141, Math.ceil(yi.width / 2) + 1, 1, P.dark); L.drawImage(yi, 152 - Math.floor(yi.width / 2), 141 - yi.height); if (cy.it.id === 'yard-lantern' && (sc.phase === 'night' || sc.phase === 'dusk')) { L.globalAlpha = 0.35; disc(L, 152, 141 - yi.height + 4, 6, P.yellow); L.globalAlpha = 1; } } }); // 2.5.0: something from the Corner Mart, front right of the yard
    var ro = A.buddyRoam(sc); items.push({ y: A.BUDDY_OUT.fy + A.YARD.y + ro.dy, draw: function () { drawBuddyP(L, sc); } });
    if (wk) items.push({ y: wk.p.y, draw: function () { drawWalker(L, sc, wk.p, wk.left); } });
    else if (!cooking && !sc.aiuIn && !(app().visit && app().visit.phase === 'in') && !(A.toyHide && A.toyHide('aiu'))) items.push({ y: A.AIU_SPOT.y + 0.5, draw: function () { L.save(); L.translate(A.YARD.x, A.YARD.y); IN.drawActor(L, sc); L.restore(); } });
    items.sort(function (a, b) { return a.y - b.y; }).forEach(function (it) { it.draw(); });
    if (sc.stage) board(L, sc);
    // night: darken the ground, then let the windows glow
    var dim = sc.phase === 'night' ? 0.55 : sc.phase === 'dusk' || sc.phase === 'dawn' ? 0.25 : (sc.weather === 'storm' || sc.weather === 'rain') ? 0.18 : 0;
    if (dim) {
      L.globalCompositeOperation = 'source-atop'; L.globalAlpha = dim; R(L, 0, 0, W, H, P.ink); L.globalAlpha = 1; L.globalCompositeOperation = 'source-over';
      if (sc.phase !== 'day' && stat.mask) houseBlit(L, stat.mask);
    }
    if (sc.phase !== 'day') { // 2.4.0: the lantern by the bridge lights Aiu's way at night, and fireflies come out
      var lb = streamY(96), lx = 107, ly = lb - 17, fl = sc.phase === 'night' ? 1 : 0.6;
      L.globalAlpha = 0.18 * fl; disc(L, lx, ly + 6, 16, P.yellow); L.globalAlpha = 0.22 * fl; disc(L, lx, ly + 4, 9, P.yellow); L.globalAlpha = 1;
      R(L, 106, ly - 2, 3, 4, sc.f % 9 ? P.yellow : P.orange); px(L, 107, ly - 1, P.white);
      if (sc.phase === 'night' && sc.weather !== 'rain' && sc.weather !== 'storm' && sc.weather !== 'snow' && sc.season !== 'winter') for (var ff = 0; ff < 7; ff++) { var ft = sc.tsec * 0.4 + ff * 1.7, fx = 20 + ((ff * 53 + Math.sin(ft) * 14) % 160 + 160) % 160, fy2 = 96 + ((ff * 17) % 36) + Math.sin(ft * 1.7) * 4; if ((Math.floor(sc.tsec * 2) + ff) % 5) px(L, Math.round(fx), Math.round(fy2), (ff + sc.f) % 3 ? P.lime : P.yellow); }
    }
    ctx.drawImage(layer, 0, 0, W, H);
    if (sc.stage) { ctx.save(); ctx.translate(SKYOFF.x, SKYOFF.y); IN.drone(ctx, sc); ctx.restore(); }
    IN.weather(ctx, sc, [0, 0, W, H]);
    if (sc.flash) { var ap0 = A.actorPosP(sc), rr = Math.round(10 + (1 - Math.min(1, sc.flash)) * 18); for (var sp0 = 0; sp0 < 12; sp0++) { var an0 = sp0 / 12 * Math.PI * 2; px(ctx, Math.round(ap0.x + Math.cos(an0) * rr), Math.round(ap0.y - 14 + Math.sin(an0) * rr * 0.7), sp0 % 2 ? P.yellow : P.white); } }
    if (A.toyDraw) A.toyDraw(ctx, sc);
  }

  // 2.3.1: Aiu's food cart stands behind the stream (where the well was), at 3/4 size. When he cooks, he's the chef inside it.
  A.CART_AT = { x: 120, y: 88, s: 0.5 }; // 2.3.1: half size, so it sits back in the landscape
  function drawCart(L, sc, cooking) {
    if (!A.yardLive) return; var C0 = A.CART_AT;
    L.save(); L.translate(C0.x, C0.y); L.scale(C0.s, C0.s); L.translate(-A.FIRE.x, -A.FIRE.y);
    if (A.yardBack) A.yardBack(L, sc);
    if (cooking) IN.drawActor(L, sc);
    A.yardLive(L, sc); L.restore();
  }

  /* ---------- where things are, in property pixels ---------- */
  A.actorPosP = function (sc) {
    if (A.CASTLE && AIU.castle && !A.isRoom(sc)) { var cp = AIU.castle.aiuPos(); return cp || { x: 112, y: 64, s: 1 }; }
    var wk = A.walkerPos(sc); if (wk) return { x: wk.p.x, y: wk.p.y, s: depthScale(wk.p.y) };
    if (A.isRoom(sc) && sc.place !== 'library' && hwalk) { var hp = houseWalkPeek(); return { x: hp.x, y: hp.y, s: 1 }; } // walking between rooms
    if (sc.act === 'hibachi' && !A.isRoom(sc)) return { x: A.CART_AT.x, y: A.CART_AT.y - 4, s: 0.5 };
    var o = A.frameOff(sc), p = A.actorPos(sc); return { x: p.x + o.x, y: p.y + o.y, s: 1 };
  };
  A.droneRectP = function (sc) { if (A.CASTLE && AIU.castle && !A.isRoom(sc)) return AIU.castle.droneRect(sc); var r = A.droneRect(Object.assign({}, sc, { place: 'home' })); if (!r) return null; var o = A.isRoom(sc) ? (sc.place === 'library' ? { x: 0, y: OFF } : DRONE_IN) : SKYOFF; return { x: r.x + o.x, y: r.y + o.y, w: r.w, h: r.h }; };
  function inR(pt, r) { return !!(r && pt && pt.x >= r.x && pt.x <= r.x + r.w && pt.y >= r.y && pt.y <= r.y + r.h); }
  // What's under a tap (property pixels). The thing on top wins: Aiu, the pet and the animals, then the board and the
  // drone, then the buildings. Something walking past never blocks a building for long: only a tap right on it counts.
  A.hitAt = function (pt, sc) {
    if (!pt || !sc) return null;
    if (A.CASTLE && AIU.castle && !A.isRoom(sc)) return AIU.castle.hitAt(pt, sc);
    var room = A.isRoom(sc), op = A.toOld(pt, sc);
    if (inR(pt, A.droneRectP(sc))) return { kind: 'drone' };
    var ap = A.actorPosP(sc), s = ap.s || 1;
    var hs = Math.max(0.8, s); // 2.4.0: small or far away (in the food cart), he's still easy to grab
    if (!sc.aiuIn && sc.stage !== undefined && !(app().visit && app().visit.phase === 'in') && Math.abs(pt.x - ap.x) <= 12 * hs && pt.y >= ap.y - 30 * hs && pt.y <= ap.y + 4) return { kind: 'aiu' };
    if (room) {
      if (sc.place === 'library') return null;
      if (inR(pt, A.BOARD_IN_P)) return { kind: 'board' };
      if (inR(pt, DESK)) return { kind: 'computer' }; // the office computer: the dice and the games
      if (inR(pt, { x: A.FRONT_DOOR.x - 3, y: A.FRONT_DOOR.y - 10, w: A.FRONT_DOOR.w + 6, h: A.FRONT_DOOR.h + 10 })) return { kind: 'door' };
      return null;
    }
    if (sc.stage && inR(pt, A.buddyRectP(sc))) return { kind: 'buddy' };
    var anis = A.animalsIn(app().S);
    for (var i = 0; i < anis.length; i++) { var p = A.animalPos(anis[i], sc); if (Math.abs(pt.x - p.x) <= 7 && pt.y >= p.y - 10 && pt.y <= p.y + 2) return { kind: 'animal', an: anis[i] }; }
    if (sc.stage && inR(pt, A.BOARD_P)) return { kind: 'board' };
    var oh = A.oddHit && A.oddHit(pt, sc); if (oh) return { kind: 'oddity', odd: oh };
    if (inR(pt, A.CART_P)) return { kind: 'cart' };
    var L = A.landmarkAt(pt); if (L) return { kind: 'landmark', id: L.id };
    if (pt.y > 108 && Math.abs(pt.x - 96) < 24 && Math.abs(pt.y - 118) < 8) return { kind: 'pond' };
    return null;
  };
  // 3.0: the castle (castle.js) draws with the same pieces
  A._w = { drawWalker: function () { return drawWalker.apply(null, arguments); }, drawBuddyAt: function (L, sc, at, off) { return drawBuddyP(L, sc, at, off); }, board: function (c, sc) { return board(c, sc); },
    drawCart: function (L, sc, cooking) { return drawCart(L, sc, cooking); }, well: well, outhouse: outhouse, shed: shed, wanderAt: wanderAt, big: big, mk: mk, W: W, H: H, SC: SC, SKYOFF: SKYOFF,
    regulatorSmall: function (c, x, y, sc) { return regulatorSmall(c, x, y, sc); }, renderRoom: function (ctx, sc) { return renderRoom(ctx, sc); }, mat: mat, bset: bset, tex: tex, igloo: igloo, hexdome: hexdome,
    houseFallback: { renderProperty: function (ctx, sc) { return renderProperty(ctx, sc); }, renderHouse: function (ctx, sc) { return renderHouse(ctx, sc); } } };
})();
