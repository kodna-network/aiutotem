/* AIU TOTEM 3.0 - the castle: Aiu's whole place in one picture (192x270), like a little cutaway castle.
     Top (y 0-70): the sky, the drone, and the grounds: the gatehouse in the middle (stone castle, ice castle, desert
       dome or cave dome, by the land and the house), and four spots for things outside (the bounty board, the food
       cart, the well to start; more you build).
     Below: a 4 x 4 grid of rooms dug into the ground, joined by a ladder shaft under the gate. It starts as a seed of
       four rooms (living room, kitchen, bedroom, bathroom) and grows as Aiu grows: build rooms with tokens, move them,
       swap them. Two rooms of the same kind side by side join into one big room.
   The layout is the setting 'castle' (synced like any setting): { v: 1, rooms: { 'row,col': type }, orn: { slot: type } }.
   Aiu walks: along a floor, up and down the shaft, out the gate. Everything he does happens in its room (the kitchen
   for cooking, the bed for sleep, the workshop for a workout) or outside on the grounds. */
(function () {
  'use strict';
  var U = AIU.util, C = AIU.core, A = AIU.art, P = A.P, K = A.prim, R = K.R, px = K.px, spr = K.spr, disc = K.disc, ell = K.ell, tri = K.tri, line = K.line, dith = K.dith;
  var IN = A._in, WF = A._w;
  var CS = AIU.castle = {};
  function app() { return AIU.app; }
  A.CASTLE = true;

  /* ---------- the grid ---------- */
  var W = 192, H = 270, SURF = 64, TOP = 70, CW = 48, CH = 50, COLS = 4, ROWS = 4, SHAFT = 96, SC = WF.SC;
  CS.G = { W: W, H: H, SURF: SURF, TOP: TOP, CW: CW, CH: CH, COLS: COLS, ROWS: ROWS, SHAFT: SHAFT };
  function cellRect(r, c) { return { x: c * CW, y: TOP + r * CH, w: CW, h: CH }; }
  function floorY(row) { return row < 0 ? SURF : TOP + row * CH + CH - 4; }
  CS.cellRect = cellRect; CS.floorY = floorY;

  /* ---------- what you can build ---------- */
  CS.ROOMS = {
    living: { name: 'Living room', core: 1, desc: 'The heart of the castle: the couch, the clock and the window.' },
    kitchen: { name: 'Kitchen', core: 1, desc: 'Where Aiu cooks, makes tea and does the dishes.' },
    bedroom: { name: 'Bedroom', core: 1, desc: 'Aiu sleeps here from 10 pm.' },
    bath: { name: 'Bathroom', core: 1, desc: 'The tub, the sink and his toothbrush.' },
    office: { name: 'Office', cost: 60, stage: 1, desc: 'The computer (tap it for games) and the drone\'s dock. Aiu writes and plays here.' },
    workshop: { name: 'Workshop', cost: 90, stage: 1, place: 'garage', desc: 'Tools, a home gym and Aiu\'s ride. He works out here.' },
    greenhouse: { name: 'Greenhouse', cost: 120, stage: 2, place: 'greenhouse', desc: 'Planters under grow lamps: grow and collect seeds. He does yoga here.' },
    lab: { name: 'Lab', cost: 150, stage: 2, place: 'lab', desc: 'Benches, flasks and a 3D printer: learn to code, design and build. He tinkers here.' },
    stable: { name: 'Stable', cost: 150, stage: 3, place: 'barn', desc: 'Hay, stalls and the animals you look after.' }
  };
  CS.ORN = {
    board: { name: 'Bounty board', core: 1, desc: 'Today\'s list. Tap it: Aiu walks over and tells you the day.' },
    cart: { name: 'Food cart', core: 1, desc: 'Aiu cooks here at lunch and dinner when the weather is nice.' },
    well: { name: 'Well', cost: 30, stage: 0, fun: 1, desc: 'A wishing well. Splash!' },
    outhouse: { name: 'Outhouse', cost: 30, stage: 0, fun: 1, desc: 'For when Aiu needs to go.' },
    banner: { name: 'Banner', cost: 25, stage: 0, desc: 'A flag in Aiu\'s colors.' },
    shed: { name: 'Tool shed', cost: 40, stage: 1, fun: 1, desc: 'Rakes and shovels.' },
    garden: { name: 'Vegetable garden', cost: 60, stage: 1, desc: 'Rows that change with the seasons.' },
    pond: { name: 'Pond', cost: 70, stage: 2, desc: 'A little pond with reeds.' },
    windmill: { name: 'Windmill', cost: 90, stage: 2, desc: 'Its sails turn in the wind.' },
    statue: { name: 'Aiu statue', cost: 200, stage: 4, desc: 'A stone statue of Aiu, for the grown-up Totem.' }
  };
  CS.SLOTS = { L1: 20, L2: 50, R1: 142, R2: 172 }; // where things stand outside (their middle); the gatehouse is between
  CS.SLOT_ORDER = ['L1', 'L2', 'R1', 'R2'];
  CS.SEED = { rooms: { '0,1': 'living', '0,2': 'kitchen', '1,1': 'bedroom', '1,2': 'bath' }, orn: { L1: 'well', L2: 'board', R1: 'cart', R2: null } };
  // how much of the grid is open at each stage (Egg and Hatchling: the seed plus the two ends of the top floor)
  CS.open = function (stage, r, c) { if (stage >= 4) return true; if (stage >= 3) return r <= 2; if (stage >= 2) return r <= 1; return r === 0 || (r === 1 && (c === 1 || c === 2)); };
  CS.openNeeds = function (r) { return r <= 0 ? 1 : r === 1 ? 2 : r === 2 ? 3 : 4; }; // the stage that opens a row

  /* ---------- the layout (the setting 'castle') ---------- */
  CS.layout = function (S) {
    var v = S && C.setting(S, 'castle', null), out = { rooms: {}, orn: {} };
    var src = v && v.rooms ? v : CS.SEED;
    Object.keys(src.rooms || {}).forEach(function (k) { var t = src.rooms[k], m = /^([0-3]),([0-3])$/.exec(k); if (m && CS.ROOMS[t]) out.rooms[k] = t; });
    CS.SLOT_ORDER.forEach(function (sl) { var t = (src.orn || {})[sl]; out.orn[sl] = CS.ORN[t] ? t : null; });
    ['living', 'kitchen', 'bedroom', 'bath'].forEach(function (t) { if (!CS.find(out, t)) { var k = freeNear(out); if (k) out.rooms[k] = t; } }); // the four core rooms are always there
    ['board', 'cart'].forEach(function (t) { if (!CS.SLOT_ORDER.some(function (sl) { return out.orn[sl] === t; })) { var sl = CS.SLOT_ORDER.filter(function (x) { return !out.orn[x]; })[0]; if (sl) out.orn[sl] = t; } });
    return out;
  };
  function freeNear(L) { for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) { var k = r + ',' + c; if (!L.rooms[k]) return k; } return null; }
  CS.find = function (L, type) { var ks = Object.keys(L.rooms).filter(function (k) { return L.rooms[k] === type; }).sort(); return ks[0] || null; };
  CS.count = function (L, type) { return Object.keys(L.rooms).filter(function (k) { return L.rooms[k] === type; }).length; };
  function rc(k) { var p = k.split(','); return { r: +p[0], c: +p[1] }; }
  CS.rc = rc;
  function neighbors(k) { var p = rc(k), out = []; [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(function (d) { var r = p.r + d[0], c = p.c + d[1]; if (r >= 0 && r < ROWS && c >= 0 && c < COLS) out.push(r + ',' + c); }); return out; }
  // every room joins up with the entrance (the top floor beside the shaft), floor to floor or through a room above or below
  function connected(rooms) {
    var keys = Object.keys(rooms); if (!keys.length) return true;
    var start = ['0,1', '0,2'].filter(function (k) { return rooms[k]; }); if (!start.length) return false;
    var seen = {}, q = start.slice(); start.forEach(function (k) { seen[k] = 1; });
    while (q.length) { var k = q.shift(); neighbors(k).forEach(function (n) { if (rooms[n] && !seen[n]) { seen[n] = 1; q.push(n); } }); }
    return keys.every(function (k) { return seen[k]; });
  }
  CS.canBuildAt = function (L, stage, k) {
    var p = rc(k); if (L.rooms[k]) return 'taken'; if (!CS.open(stage, p.r, p.c)) return 'locked';
    if (!neighbors(k).some(function (n) { return L.rooms[n]; })) return 'far'; return '';
  };
  CS.canRemove = function (L, k) { var t = L.rooms[k]; if (!t || CS.ROOMS[t].core) return false; var r2 = Object.assign({}, L.rooms); delete r2[k]; return connected(r2); };
  CS.canMove = function (L, stage, from, to) { // into an empty open spot (it must stay joined up), or swap with another room
    if (from === to || !L.rooms[from]) return false; var p = rc(to); if (!CS.open(stage, p.r, p.c)) return false;
    var r2 = Object.assign({}, L.rooms); if (r2[to]) { var t = r2[to]; r2[to] = r2[from]; r2[from] = t; } else { r2[to] = r2[from]; delete r2[from]; }
    return connected(r2);
  };
  CS.save = function (L) { return app().setSetting('castle', { v: 1, rooms: L.rooms, orn: L.orn }); };
  // runs of the same room side by side on a floor: drawn as one wide room
  CS.blocks = function (L) {
    var out = [];
    for (var r = 0; r < ROWS; r++) { var c = 0; while (c < COLS) { var t = L.rooms[r + ',' + c]; if (!t) { c++; continue; } var n = 1; while (c + n < COLS && L.rooms[r + ',' + (c + n)] === t) n++; out.push({ r: r, c: c, n: n, type: t, x: c * CW, y: TOP + r * CH, w: n * CW, h: CH }); c += n; } }
    return out;
  };

  /* ---------- the look of each land ---------- */
  CS.style = function (sc) { if (sc.house === 'cave') return 'cave'; if (sc.biome === 'tundra') return 'ice'; if (sc.biome === 'desert') return 'desert'; return 'stone'; };
  var STY = {
    stone: { earth: '#5a3d2b', earth2: '#6b4a33', rock: P.slate, wall: P.silver, wall2: P.slate, trim: P.dark, roof: P.red, roof2: P.plum, frame: '#7d6a5a' },
    ice: { earth: '#9cc9e0', earth2: '#b9dcee', rock: P.white, wall: P.white, wall2: P.cyan, trim: P.sky, roof: P.sky, roof2: P.blue, frame: '#c8e6f2' },
    desert: { earth: '#c98a4b', earth2: '#d9a066', rock: '#a5673a', wall: '#d9824f', wall2: '#9c4f2c', trim: P.bark, roof: '#e7b56a', roof2: P.orange, frame: '#b5703f' },
    cave: { earth: '#3b3f52', earth2: '#474c63', rock: P.slate, wall: P.slate, wall2: P.dark, trim: P.ink, roof: P.green, roof2: P.teal, frame: '#5b6178' }
  };
  CS.STY = STY;

  /* ---------- the static picture (cached until the layout, the land, the season or the time of day changes) ---------- */
  var stat = { key: null, cv: null };
  function big(w, h) { return WF.big(w, h); }
  function drawStatic(sc, L, building) {
    var cv = big(W, H), c = cv.getContext('2d'), st = CS.style(sc), S0 = STY[st], g = IN.groundCols(sc.biome, sc.season), r = U.rng(U.hash32(sc.biome + sc.season + st));
    // far hills behind the grounds
    var far = sc.biome === 'desert' ? P.orange : sc.biome === 'tundra' || sc.season === 'winter' ? P.silver : P.teal;
    for (var x = 0; x < W; x++) { var hh = 46 - Math.round(5 * (0.5 + 0.5 * Math.sin(x * 0.05 + 1))); R(c, x, hh, 1, SURF - hh, far); }
    if (sc.biome === 'beach') { R(c, 0, 48, W, 6, P.blue); for (var w0 = 0; w0 < 8; w0++) R(c, (w0 * 29) % W, 50, 5, 1, P.sky); }
    // the grounds
    R(c, 0, SURF - 6, W, 6, g[0]); for (var f = 0; f < 40; f++) px(c, Math.floor(r() * W), SURF - 6 + Math.floor(r() * 6), g[1]);
    // the earth under it (or ice, sand, rock), with stones
    R(c, 0, SURF, W, H - SURF, S0.earth); R(c, 0, SURF, W, 2, g[1]); R(c, 0, SURF + 2, W, 1, P.ink);
    for (var band = 0; band < 3; band++) { c.globalAlpha = 0.12 * (band + 1); R(c, 0, TOP + 50 + band * 60, W, H - (TOP + 50 + band * 60), P.ink); } c.globalAlpha = 1; // deeper is darker
    for (var s = 0; s < 70; s++) { var sx = Math.floor(r() * W), sy = SURF + 4 + Math.floor(r() * (H - SURF - 6)); ell(c, sx, sy, 2 + Math.floor(r() * 2), 1, s % 3 ? S0.earth2 : S0.rock); }
    if (st !== 'ice' && st !== 'cave') for (var rt = 0; rt < 7; rt++) { var rx = 6 + Math.floor(r() * (W - 12)), ry = SURF + 3; for (var q = 0; q < 6 + Math.floor(r() * 6); q++) { px(c, rx, ry, P.bark); ry++; rx += Math.floor(r() * 3) - 1; } } // roots under the grass
    for (var gm = 0; gm < 6; gm++) { var gx0 = 4 + Math.floor(r() * (W - 8)), gy0 = TOP + 40 + Math.floor(r() * (H - TOP - 46)), gc = [P.cyan, P.pink, P.lime, P.yellow][gm % 4]; px(c, gx0, gy0, P.ink); px(c, gx0 + 1, gy0, gc); px(c, gx0, gy0 + 1, gc); px(c, gx0 + 1, gy0 + 1, P.white); } // little gems
    var fx0 = 20 + Math.floor(r() * 150), fy0 = H - 22; R(c, fx0, fy0, 9, 1, '#e8dcc0'); for (var fb = 0; fb < 4; fb++) R(c, fx0 + 1 + fb * 2, fy0 - 2, 1, 5, '#e8dcc0'); disc(c, fx0 + 11, fy0, 2, '#e8dcc0'); px(c, fx0 + 11, fy0, P.ink); // an old fossil down deep
    // the shaft under the gate: a ladder all the way down to the lowest floor that has a room
    var low = -1; Object.keys(L.rooms).forEach(function (k) { low = Math.max(low, rc(k).r); });
    var sBot = TOP + (low + 1) * CH;
    R(c, SHAFT - 4, SURF - 2, 8, sBot - SURF + 2, P.ink); R(c, SHAFT - 3, SURF - 2, 6, sBot - SURF + 2, P.dark);
    R(c, SHAFT - 3, SURF - 2, 1, sBot - SURF + 2, P.wood); R(c, SHAFT + 2, SURF - 2, 1, sBot - SURF + 2, P.wood); for (var ly = SURF; ly < sBot; ly += 4) R(c, SHAFT - 2, ly, 4, 1, P.wood);
    // halls: on a floor with rooms, a dug hall runs from the shaft to the farthest room (through the rock in between)
    for (var row = 0; row < ROWS; row++) {
      var cs = []; for (var col = 0; col < COLS; col++) if (L.rooms[row + ',' + col]) cs.push(col); if (!cs.length) continue;
      var x0 = Math.min(SHAFT, cs[0] * CW + CW / 2), x1 = Math.max(SHAFT, cs[cs.length - 1] * CW + CW / 2), fy = floorY(row);
      R(c, x0, fy - 22, x1 - x0, 25, P.ink); R(c, x0, fy - 21, x1 - x0, 23, '#2a2433'); R(c, x0, fy + 1, x1 - x0, 2, S0.frame);
      for (var hx = x0 + 6; hx < x1; hx += 18) { R(c, hx, fy - 21, 2, 23, P.bark); R(c, hx - 2, fy - 21, 6, 2, P.bark); } // timber props
    }
    // the rooms (a run of the same room is one wide room)
    CS.blocks(L).forEach(function (b) { roomFrame(c, b, S0); var art = ROOMART[b.type]; c.save(); c.beginPath(); c.rect(b.x + 2, b.y + 2, b.w - 4, b.h - 4); c.clip(); art(c, b.x + 2, b.y + 2, b.w - 4, b.h - 4, sc); c.restore(); });
    // open spots you could dig (dimmed rock), shown in build mode
    if (building) for (var rr = 0; rr < ROWS; rr++) for (var cc = 0; cc < COLS; cc++) {
      var k = rr + ',' + cc, why = CS.canBuildAt(L, sc.stageNow || 0, k), cr = cellRect(rr, cc); if (L.rooms[k]) continue;
      if (!why) { R(c, cr.x + 3, cr.y + 3, cr.w - 6, cr.h - 6, 'rgba(255,205,117,0.18)'); dashed(c, cr.x + 3, cr.y + 3, cr.w - 6, cr.h - 6, P.yellow); spr(c, cr.x + cr.w / 2 - 3, cr.y + cr.h / 2 - 3, ['..y..', '..y..', 'yyyyy', '..y..', '..y..']); }
      else if (why === 'locked') { R(c, cr.x + 3, cr.y + 3, cr.w - 6, cr.h - 6, 'rgba(26,28,44,0.35)'); spr(c, cr.x + cr.w / 2 - 3, cr.y + cr.h / 2 - 4, ['.sss.', 's...s', 'sssss', 'ss.ss', 'sssss']); }
    }
    // the gatehouse, over the shaft
    gatehouse(c, sc, st, S0);
    return cv;
  }
  function dashed(c, x, y, w, h, col) { for (var i = 0; i < w; i += 4) { R(c, x + i, y, 2, 1, col); R(c, x + i, y + h - 1, 2, 1, col); } for (var j = 0; j < h; j += 4) { R(c, x, y + j, 1, 2, col); R(c, x + w - 1, y + j, 1, 2, col); } }
  function roomFrame(c, b, S0) { // the room's walls and its floor beam (in the land's stone, ice, adobe or rock)
    R(c, b.x, b.y, b.w, b.h, P.ink); R(c, b.x + 1, b.y + 1, b.w - 2, b.h - 2, S0.frame);
    for (var i = 0; i < b.w; i += 6) px(c, b.x + i + ((b.y / 2) % 3), b.y + 1, S0.earth2);
  }
  function gatehouse(c, sc, st, S0) {
    var gx = SHAFT, base = SURF + 1;
    if (st === 'cave') { // a rocky dome over the way down: only its top half shows (the rest is underground)
      c.save(); c.beginPath(); c.rect(0, 0, W, base); c.clip();
      ell(c, gx, base, 36, 30, P.ink); ell(c, gx, base, 35, 29, S0.wall); ell(c, gx - 9, base - 15, 17, 9, '#6b7390'); ell(c, gx + 13, base - 7, 13, 8, P.dark);
      for (var rk = 0; rk < 9; rk++) { var ra = -2.6 + rk * 0.33, rr0 = 22; ell(c, Math.round(gx + Math.cos(ra) * rr0), Math.round(base + Math.sin(ra) * rr0 * 0.8), 3, 2, rk % 2 ? P.dark : '#6b7390'); } // stones in the dome
      for (var m = -33; m <= 33; m += 2) { var my = base - Math.round(29 * Math.sqrt(Math.max(0, 1 - (m * m) / 1225))); px(c, gx + m, my, sc.season === 'winter' ? P.white : P.green); if (m % 6 === 0) px(c, gx + m, my - 1, sc.season === 'winter' ? P.white : P.lime); } // moss (or snow) on top
      ell(c, gx, base, 11, 15, P.ink); ell(c, gx, base, 10, 14, '#1b1622'); // the cave mouth
      c.restore();
      R(c, gx + 15, base - 20, 1, 7, P.ink); R(c, gx + 13, base - 13, 5, 4, P.ink); R(c, gx + 14, base - 12, 3, 2, P.yellow); // a lantern by the way in
      return;
    }
    var L0 = gx - 30, R0 = gx + 30, top = base - 22;
    // the wall with battlements
    R(c, L0, top, R0 - L0, base - top, P.ink); R(c, L0 + 1, top + 1, R0 - L0 - 2, base - top - 1, S0.wall);
    for (var y = top + 4; y < base; y += 4) { R(c, L0 + 1, y, R0 - L0 - 2, 1, S0.wall2); for (var x = L0 + 2 + ((y / 4) % 2) * 3; x < R0 - 1; x += 6) R(c, x, y - 3, 1, 3, S0.wall2); }
    for (var cx0 = L0; cx0 < R0; cx0 += 6) { R(c, cx0, top - 4, 4, 4, P.ink); R(c, cx0 + 1, top - 3, 2, 3, S0.wall); }
    // two towers
    [L0 - 4, R0 - 8].forEach(function (tx) {
      R(c, tx, top - 10, 12, base - top + 10, P.ink); R(c, tx + 1, top - 9, 10, base - top + 9, S0.wall);
      for (var ty = top - 6; ty < base; ty += 5) R(c, tx + 1, ty, 10, 1, S0.wall2);
      R(c, tx + 4, top - 4, 4, 6, P.ink); R(c, tx + 5, top - 3, 2, 4, sc.phase === 'night' || sc.phase === 'dusk' ? P.yellow : P.dark); // a window
      if (st === 'desert') { ell(c, tx + 6, top - 10, 7, 6, P.ink); ell(c, tx + 6, top - 10, 6, 5, S0.roof); R(c, tx + 6, top - 20, 1, 5, P.ink); }
      else if (st === 'ice') { ell(c, tx + 6, top - 10, 7, 7, P.ink); ell(c, tx + 6, top - 10, 6, 6, P.white); R(c, tx + 4, top - 14, 2, 3, P.cyan); }
      else { tri(c, tx + 6, top - 22, 13, 0.5, P.ink); tri(c, tx + 6, top - 21, 12, 0.45, S0.roof); R(c, tx + 6, top - 28, 1, 6, P.ink); R(c, tx + 7, top - 28, 4, 3, sc.accent || P.red); }
    });
    if (st === 'desert') { ell(c, gx, top - 2, 14, 12, P.ink); ell(c, gx, top - 2, 13, 11, S0.roof); ell(c, gx - 4, top - 6, 4, 3, '#f3d39a'); R(c, gx - 14, top - 2, 29, 3, S0.wall); tri(c, gx, top - 20, 6, 0.4, P.ink); px(c, gx, top - 21, P.yellow); }
    if (st === 'ice') for (var ic = L0 + 3; ic < R0 - 2; ic += 5) R(c, ic, top + 1, 1, 2 + (ic % 3), P.cyan); // icicles
    // the gate: an arch over the shaft, the portcullis up
    R(c, gx - 8, base - 15, 16, 15, P.ink); ell(c, gx, base - 15, 8, 5, P.ink); R(c, gx - 7, base - 14, 14, 14, '#1b1622'); ell(c, gx, base - 15, 7, 4, '#1b1622');
    for (var pg = gx - 6; pg <= gx + 6; pg += 3) R(c, pg, base - 18, 1, 4, P.slate); R(c, gx - 7, base - 15, 14, 1, P.slate);
    R(c, gx - 10, base - 1, 20, 2, S0.trim);
    // pennants on the wall (the stone castle)
    if (st === 'stone') [L0 + 12, R0 - 14].forEach(function (bx) { R(c, bx, top - 12, 1, 9, P.ink); spr(c, bx + 1, top - 12, ['rrr.', 'rrrr', 'rr..'].map(function (s) { return s; })); });
  }

  /* ---------- the rooms (48 x 50 cells; a joined room is 96 or 144 wide). Each draws inside its walls. ---------- */
  function box(c, x, y, w, h, fill, hi, lo) { R(c, x, y, w, h, P.ink); R(c, x + 1, y + 1, w - 2, h - 2, fill); if (hi) R(c, x + 1, y + 1, w - 2, 1, hi); if (lo) R(c, x + 1, y + h - 2, w - 2, 1, lo); }
  function tiles(c, x, y, w, h, a, b, sz) { for (var j = 0; j < h; j += sz) for (var i = 0; i < w; i += sz) R(c, x + i, y + j, Math.min(sz, w - i), Math.min(sz, h - j), ((i + j) / sz) % 2 ? a : b); }
  function planks(c, x, y, w, h, a, b) { R(c, x, y, w, h, a); for (var j = 0; j < h; j += 2) R(c, x, y + j, w, 1, j % 4 ? a : b); }
  function wall(c, x, y, w, h, a, b, step) { R(c, x, y, w, h, a); for (var i = 2; i < w; i += step || 6) R(c, x + i, y, 1, h, b); }
  function floor(c, x, y, w, h, a, b) { R(c, x, y + h - 5, w, 5, a); R(c, x, y + h - 5, w, 1, b); }
  function lamp(c, x, y, sc) { R(c, x, y, 1, 6, P.dark); R(c, x - 3, y + 6, 7, 4, P.ink); R(c, x - 2, y + 7, 5, 2, sc.phase === 'day' ? P.sand : P.yellow); }
  function each(w, step, fn) { for (var i = 0; i + step <= w + 1; i += step) fn(i, i / step); } // repeat a piece across a joined room
  var ROOMART = {
    living: function (c, x, y, w, h, sc) {
      wall(c, x, y, w, h, '#f0d9a8', '#e6c98e', 7); floor(c, x, y, w, h, P.wood, P.bark);
      each(w, 44, function (o) { box(c, x + o + 5, y + 6, 14, 12, P.white); R(c, x + o + 6, y + 7, 12, 10, sc.phase === 'night' ? P.navy : P.sky); R(c, x + o + 11, y + 7, 1, 10, P.white); R(c, x + o + 6, y + 11, 12, 1, P.white); }); // windows
      box(c, x + 3, y + h - 15, 24, 10, sc.accent || P.red, null, P.plum); R(c, x + 3, y + h - 19, 4, 14, P.ink); R(c, x + 24, y + h - 19, 4, 14, P.ink); R(c, x + 4, y + h - 18, 2, 12, sc.accent || P.red); R(c, x + 25, y + h - 18, 2, 12, sc.accent || P.red); // the couch
      ell(c, x + w / 2 + 4, y + h - 4, 14, 1, P.plum); // a rug
      if (w > 60) { box(c, x + w - 22, y + h - 18, 16, 13, P.wood, P.sand, P.bark); R(c, x + w - 20, y + h - 22, 6, 4, P.green); } // a bookcase and a plant in a big living room
    },
    kitchen: function (c, x, y, w, h, sc) {
      R(c, x, y, w, h, '#f4e6c8'); tiles(c, x, y + 14, w, 8, P.yellow, P.white, 3); tiles(c, x, y + h - 5, w, 5, P.red, P.white, 3);
      box(c, x + 2, y + 3, 22, 10, P.wood, P.sand, P.bark); R(c, x + 12, y + 4, 1, 8, P.ink); // upper cabinets
      box(c, x, y + 22, 20, h - 27, P.wood, P.sand, P.bark); R(c, x + 4, y + 21, 10, 2, P.slate); R(c, x + 8, y + 15, 1, 6, P.silver); R(c, x + 8, y + 15, 4, 1, P.silver); // counter and sink
      var ox = x + 24; box(c, ox, y + 22, 18, h - 27, '#f6edd8', P.white, P.silver); box(c, ox + 3, y + 28, 12, 8, P.dark, P.slate); R(c, ox, y + 21, 18, 2, P.ink); R(c, ox + 2, y + 4, 14, 5, P.silver); // the range and its hood
      if (w > 60) { box(c, x + 48, y + 22, w - 50, h - 27, P.wood, P.sand, P.bark); box(c, x + 52, y + 14, 10, 8, P.white); R(c, x + 54, y + 16, 6, 4, P.red); } // more counter, a mixer
    },
    bedroom: function (c, x, y, w, h, sc) {
      wall(c, x, y, w, h, '#cbbbe8', '#bba8e0', 5); floor(c, x, y, w, h, '#a993d6', P.white);
      box(c, x + 16, y + h - 16, 26, 7, P.bark, P.wood); R(c, x + 16, y + h - 26, 3, 20, P.bark); R(c, x + 40, y + h - 22, 3, 16, P.bark); // the bed frame
      box(c, x + 18, y + h - 21, 22, 6, P.white); R(c, x + 18, y + h - 21, 14, 6, sc.accent || P.red); box(c, x + 32, y + h - 24, 8, 4, P.white); // mattress, blanket, pillow
      lamp(c, x + 7, y + 10, sc); box(c, x + 4, y + h - 14, 8, 9, P.bark);
      box(c, x + 22, y + 6, 12, 9, P.white); R(c, x + 24, y + 8, 8, 5, P.yellow); px(c, x + 27, y + 10, P.green); // a little picture
      if (w > 60) { box(c, x + 56, y + h - 26, 20, 21, P.wood, P.sand, P.bark); R(c, x + 65, y + h - 25, 1, 19, P.ink); } // a wardrobe
    },
    bath: function (c, x, y, w, h, sc) {
      R(c, x, y, w, h, P.white); for (var j = 6; j < 18; j += 6) R(c, x, y + j, w, 1, '#d9e6ee'); R(c, x, y + 18, w, h - 18, P.cyan); for (var i = 6; i < w; i += 6) R(c, x + i, y + 18, 1, h - 18, P.sky);
      tiles(c, x, y + h - 5, w, 5, P.white, P.silver, 3);
      box(c, x + 2, y + h - 18, 22, 13, P.sand, P.white, P.wood); R(c, x + 3, y + h - 17, 20, 2, P.sky); // the tub
      box(c, x + 30, y + 8, 12, 9, P.silver); R(c, x + 31, y + 9, 10, 7, '#bfeff7'); // the mirror
      box(c, x + 30, y + 20, 14, 3, P.white, null, P.silver); box(c, x + 34, y + 23, 6, h - 28, P.white, null, P.silver); R(c, x + 41, y + 16, 1, 4, P.red); // the sink, a toothbrush
      if (w > 60) { box(c, x + 52, y + h - 14, 9, 9, P.white, null, P.silver); box(c, x + 50, y + h - 17, 12, 4, P.white); } // the toilet in a big bathroom
    },
    office: function (c, x, y, w, h, sc) {
      wall(c, x, y, w, h, '#c9d8e8', '#b6c8dc', 8); floor(c, x, y, w, h, P.slate, P.silver);
      box(c, x + 2, y + 4, 10, h - 9, P.wood, P.sand, P.bark); for (var b = 0; b < 4; b++) { R(c, x + 3, y + 10 + b * 8, 8, 1, P.bark); R(c, x + 4, y + 6 + b * 8, 2, 4, [P.red, P.blue, P.green, P.yellow][b]); R(c, x + 7, y + 7 + b * 8, 2, 3, P.plum); } // the bookshelf
      box(c, x + 16, y + h - 16, 28, 3, P.wood, P.sand); R(c, x + 18, y + h - 13, 1, 8, P.bark); R(c, x + 41, y + h - 13, 1, 8, P.bark); // the desk
      box(c, x + 22, y + h - 27, 16, 11, P.dark); R(c, x + 23, y + h - 26, 14, 9, (sc.f || 0) % 20 < 10 ? P.teal : P.green); R(c, x + 29, y + h - 16, 2, 1, P.ink); // the computer
      R(c, x + 30, y + 5, 12, 2, P.silver); R(c, x + 34, y + 3, 4, 2, P.dark); // the drone's dock
      if (w > 60) { box(c, x + 52, y + h - 20, 18, 15, P.dark, P.slate); R(c, x + 54, y + h - 18, 14, 9, P.navy); } // an arcade cabinet
    },
    workshop: function (c, x, y, w, h, sc) {
      R(c, x, y, w, h, '#9aa7b8'); R(c, x, y + h - 5, w, 5, P.dark); for (var i = 0; i < w; i += 8) R(c, x + i, y + h - 5, 1, 5, P.slate);
      box(c, x + 2, y + 5, 22, 13, P.wood); for (var t = 0; t < 4; t++) R(c, x + 5 + t * 5, y + 7, 1, 8, [P.silver, P.red, P.silver, P.yellow][t]); // the pegboard and its tools
      box(c, x + 2, y + h - 15, 20, 3, P.wood, P.sand); R(c, x + 4, y + h - 12, 1, 7, P.bark); R(c, x + 19, y + h - 12, 1, 7, P.bark); // the workbench
      R(c, x + 30, y + h - 18, 1, 13, P.ink); R(c, x + 38, y + h - 18, 1, 13, P.ink); R(c, x + 27, y + h - 19, 15, 2, P.silver); disc(c, x + 27, y + h - 18, 2, P.ink); disc(c, x + 42, y + h - 18, 2, P.ink); // the weights
      if (w > 60) { box(c, x + 52, y + h - 15, 34, 9, sc.accent || P.red, null, P.plum); R(c, x + 58, y + h - 19, 18, 5, P.sky); disc(c, x + 58, y + h - 6, 3, P.ink); disc(c, x + 80, y + h - 6, 3, P.ink); } // the little car
    },
    greenhouse: function (c, x, y, w, h, sc) {
      R(c, x, y, w, h, '#2c4a3a'); for (var i = 0; i < w; i += 12) { R(c, x + i + 2, y + 2, 8, 2, sc.phase === 'day' ? P.lime : '#d6ff9a'); } // grow lamps
      R(c, x, y + h - 5, w, 5, P.bark);
      each(w, 22, function (o) { box(c, x + o + 2, y + h - 14, 18, 9, P.wood, P.sand, P.bark); for (var p = 0; p < 3; p++) { R(c, x + o + 5 + p * 5, y + h - 19, 1, 5, P.green); px(c, x + o + 4 + p * 5, y + h - 20, P.lime); px(c, x + o + 6 + p * 5, y + h - 18, p % 2 ? P.red : P.yellow); } });
      R(c, x + 6, y + h - 6, 20, 1, P.pink); // the yoga mat
    },
    lab: function (c, x, y, w, h, sc) {
      R(c, x, y, w, h, '#e8eef4'); grid(c, x, y, w, h - 5, '#d3dde8', 6); floor(c, x, y, w, h, P.silver, P.white);
      box(c, x + 2, y + h - 16, 44, 4, P.white, null, P.silver); R(c, x + 4, y + h - 12, 1, 7, P.slate); R(c, x + 43, y + h - 12, 1, 7, P.slate); // the bench
      [[6, P.lime], [12, P.pink], [18, P.cyan]].forEach(function (q) { R(c, x + q[0], y + h - 22, 3, 6, P.white); R(c, x + q[0], y + h - 19, 3, 3, q[1]); }); // flasks
      box(c, x + 28, y + h - 28, 14, 12, P.dark, P.slate); R(c, x + 30, y + h - 26, 10, 7, P.navy); R(c, x + 33, y + h - 22, 4, 2, (sc.f || 0) % 8 < 4 ? P.orange : P.yellow); // the 3D printer
      if (w > 60) { box(c, x + 54, y + 6, 22, 16, P.white); for (var k = 0; k < 3; k++) R(c, x + 57, y + 9 + k * 4, 16, 1, P.slate); } // a whiteboard
    },
    stable: function (c, x, y, w, h, sc) {
      planks(c, x, y, w, h, P.wood, P.bark); R(c, x, y + h - 6, w, 6, '#e8c46a'); for (var i = 0; i < w; i += 3) px(c, x + i, y + h - 7 - (i % 2), '#e8c46a'); // hay on the floor
      each(w, 24, function (o) { R(c, x + o + 2, y + h - 20, 20, 2, P.bark); R(c, x + o + 2, y + h - 20, 2, 15, P.bark); }); // stall rails
      box(c, x + 28, y + h - 16, 14, 10, '#e8c46a', P.yellow, P.orange); // a hay bale
      var hens = [[10, h - 8], [20, h - 7]]; hens.forEach(function (q, j) { ell(c, x + q[0], y + q[1] - 2, 2, 2, j ? P.wood : P.white); px(c, x + q[0] + 2, y + q[1] - 4, P.red); px(c, x + q[0] + 3, y + q[1] - 3, P.orange); });
    }
  };
  function grid(c, x, y, w, h, col, sz) { for (var j = sz; j < h; j += sz) R(c, x, y + j, w, 1, col); for (var i = sz; i < w; i += sz) R(c, x + i, y, 1, h, col); }
  // where Aiu stands in each room (from its left edge), and where the bed's pillow is
  var SPOT = { living: 34, kitchen: 32, bedroom: 30, bath: 22, office: 30, workshop: 34, greenhouse: 30, lab: 22, stable: 16 };
  var BED = { x: 33, y: -13 }; // from the bedroom's left edge, and up from its floor: on the mattress

  /* ---------- outside: what stands in each spot ---------- */
  var ORNART = {
    well: function (c, x, sc) { WF.well(c, x - 6, SURF, sc); },
    outhouse: function (c, x, sc) { c.save(); c.translate(x - 115, SURF - 50); WF.outhouse(c, Object.assign({}, sc, { house: 'cabin' })); c.restore(); },
    shed: function (c, x, sc) { WF.shed(c, x - 6, SURF, sc); },
    banner: function (c, x, sc) { R(c, x, SURF - 26, 1, 26, P.ink); R(c, x - 1, SURF - 27, 3, 1, P.yellow); var col = sc.accent || P.red, wv = (sc.f || 0) % 8 < 4 ? 0 : 1; R(c, x + 1, SURF - 26, 11, 10, P.ink); R(c, x + 1, SURF - 25, 10, 8, col); /* (an outline, so a sky-blue flag still shows) */ R(c, x + 1, SURF - 17 + wv, 4, 2, col); R(c, x + 7, SURF - 17 - wv, 4, 2, col); px(c, x + 5, SURF - 22, P.yellow); },
    garden: function (c, x, sc) {
      var win = sc.season === 'winter' || sc.biome === 'tundra'; box(c, x - 13, SURF - 7, 26, 8, P.bark, P.wood);
      for (var i = -10; i <= 10; i += 5) { if (win) { ell(c, x + i, SURF - 6, 2, 1, P.white); continue; } if (sc.season === 'fall') { disc(c, x + i, SURF - 7, 2, P.orange); continue; } R(c, x + i, SURF - 10, 1, 4, P.green); px(c, x + i - 1, SURF - 9, P.lime); px(c, x + i + 1, SURF - 11, sc.season === 'summer' ? P.red : P.green); }
      for (var f = -14; f <= 14; f += 4) R(c, x + f, SURF - 9, 1, 4, P.white);
    },
    pond: function (c, x, sc) { var col = sc.season === 'winter' || sc.biome === 'tundra' ? [P.silver, P.white] : [P.blue, P.sky]; ell(c, x, SURF - 1, 14, 4, P.ink); ell(c, x, SURF - 1, 13, 3, col[0]); ell(c, x - 3, SURF - 2, 6, 1, col[1]); if (sc.season !== 'winter') { R(c, x + 10, SURF - 9, 1, 6, P.green); R(c, x + 12, SURF - 8, 1, 5, P.teal); } },
    windmill: function (c, x, sc) {
      for (var wy = 0; wy < 20; wy++) { var ww = 3 + Math.floor(wy / 4); R(c, x - ww, SURF - 20 + wy, ww * 2, 1, wy % 5 === 4 ? P.bark : P.wood); }
      R(c, x - 4, SURF - 23, 8, 3, P.red); R(c, x - 2, SURF - 8, 4, 8, P.bark);
      var a0 = (sc.tsec || 0) * 0.8; for (var i = 0; i < 4; i++) { var an = a0 + i * Math.PI / 2; line(c, x, SURF - 21, Math.round(x + Math.cos(an) * 11), Math.round(SURF - 21 + Math.sin(an) * 11), P.white); }
      disc(c, x, SURF - 21, 1, P.ink);
    },
    statue: function (c, x, sc) {
      box(c, x - 9, SURF - 8, 18, 8, P.silver, P.white, P.slate);
      var form = sc.form; if (!form) return; var cr = A.creature(form.seed, form.stage, sc.soul), fr = cr.frames.open, sv = statueOf(fr);
      c.drawImage(sv, Math.round(x - cr.w / 2), SURF - 8 - cr.bottom - 1);
    }
  };
  var stCache = { fr: null, cv: null };
  function statueOf(fr) { if (stCache.fr === fr) return stCache.cv; var cv = WF.mk(fr.width, fr.height), c = cv.getContext('2d'); c.drawImage(fr, 0, 0); c.globalCompositeOperation = 'source-atop'; c.fillStyle = P.silver; c.fillRect(0, 0, cv.width, cv.height); c.globalAlpha = 0.5; c.drawImage(fr, 0, 0); stCache.fr = fr; stCache.cv = cv; return cv; }
  function ornRect(slot, type) { var x = CS.SLOTS[slot], w = type === 'board' ? 30 : type === 'cart' ? 28 : 26, hh = type === 'board' ? 30 : type === 'windmill' || type === 'banner' ? 30 : 26; return { x: x - w / 2, y: SURF - hh, w: w, h: hh + 2 }; }
  CS.ornRect = ornRect;

  /* ---------- where things are (castle pixels): set up each time the layout changes ---------- */
  var lastLay = '', LAY = null;
  function setup(S, sc) {
    var L = CS.layout(S), key = JSON.stringify(L); if (key === lastLay && LAY) return LAY; lastLay = key; LAY = L;
    // the bounty board and the food cart stand in their spots (the old code draws them from these)
    CS.SLOT_ORDER.forEach(function (sl) {
      var t = L.orn[sl], x = CS.SLOTS[sl];
      if (t === 'board') { A.BOARD_P = { x: x - 15, y: SURF - 30, w: 30, h: 30 }; A.BOARD_SPOT_P = { x: x + 18, y: SURF }; }
      if (t === 'cart') { A.CART_AT = { x: x, y: SURF + 1, s: 0.5 }; A.CART_P = { x: x - 14, y: SURF - 26, w: 28, h: 27 }; }
    });
    // buildings you can tap (rooms with their own page, and the little things outside): toybox walks Aiu there
    A.LANDMARKS = [];
    CS.blocks(L).forEach(function (b) { var d = CS.ROOMS[b.type]; if (d.place) A.LANDMARKS.push({ id: d.place, r: { x: b.x, y: b.y, w: b.w, h: b.h }, door: { x: b.x + Math.min(b.w - 8, SPOT[b.type] || 24), y: floorY(b.r) } }); });
    CS.SLOT_ORDER.forEach(function (sl) { var t = L.orn[sl]; if (t && CS.ORN[t].fun) { var rr = ornRect(sl, t); A.LANDMARKS.push({ id: t, r: rr, door: { x: CS.SLOTS[sl] + (CS.SLOTS[sl] < SHAFT ? 14 : -14), y: SURF } }); } });
    return L;
  }
  CS.current = function () { var a = app(); return a && a.S ? setup(a.S) : CS.layout(null); };

  /* ---------- Aiu: where he wants to be, and the walk there ---------- */
  var OUT_SPOT = { x: 112, y: SURF }; // outside, just right of the gate
  var R0 = { games: 'office', journal: 'office', tinker: 'lab', pottery: 'lab', workout: 'workshop', yoga: 'greenhouse' };
  function roomFor(sc) {
    if (!sc.stage) return 'living'; // the egg waits in the living room
    if (sc.act === 'sleep' || sc.mode === 'sleepy') return 'bedroom';
    if (sc.roomWant === 'kitchen') return 'kitchen'; if (sc.roomWant === 'bath') return 'bath';
    return R0[sc.act] || 'living';
  }
  function targetFor(sc, L) {
    var a = app();
    if (a.visit && a.visit.id) { // walking to a room, to something outside, or to the board
      if (a.visit.id === 'board' && A.BOARD_SPOT_P) return { x: A.BOARD_SPOT_P.x, row: -1, key: 'v:board' };
      var lm = (A.LANDMARKS || []).filter(function (x) { return x.id === a.visit.id; })[0];
      if (lm) return { x: lm.door.x, row: lm.door.y <= SURF ? -1 : Math.round((lm.door.y - TOP) / CH - 0.5), key: 'v:' + lm.id };
    }
    if (!sc.indoor) {
      if (sc.act === 'hibachi' && A.CART_AT) return { x: A.CART_AT.x, row: -1, key: 'cart', cart: true };
      var pond = CS.SLOT_ORDER.filter(function (sl) { return L.orn[sl] === 'pond'; })[0];
      if (sc.act === 'fishing' && pond) return { x: CS.SLOTS[pond] + (CS.SLOTS[pond] < SHAFT ? 22 : -22), row: -1, key: 'pond' }; // fishing at the pond, if there is one
      return { x: OUT_SPOT.x, row: -1, key: 'out' };
    }
    var t = roomFor(sc), k = CS.find(L, R0[sc.act] && !CS.find(L, t) ? 'living' : t) || CS.find(L, 'living'), p = rc(k);
    if (!CS.find(L, t)) t = 'living';
    var blk = CS.blocks(L).filter(function (b) { return b.r === p.r && p.c >= b.c && p.c < b.c + b.n; })[0] || { x: p.c * CW, w: CW };
    var sx = blk.x + 2 + (sc.stage && t === 'bedroom' && (sc.act === 'sleep' || sc.mode === 'sleepy') ? BED.x : Math.min(blk.w - 10, SPOT[t] || 24));
    var bed = !!sc.stage && t === 'bedroom' && (sc.act === 'sleep' || sc.mode === 'sleepy'); return { x: sx, row: p.r, key: 'in:' + t + ':' + k + ':' + (bed ? 'bed' : ''), room: t, blk: blk, bed: bed };
  }
  var walker = { pos: null, path: null, start: 0, dur: 0, key: '', tgt: null };
  function plan(from, to) { // along the floor to the shaft, up or down it, along the next floor
    var pts = [{ x: from.x, y: floorY(from.row), row: from.row }];
    if (from.row !== to.row) { pts.push({ x: SHAFT, y: floorY(from.row), row: from.row }); pts.push({ x: SHAFT, y: floorY(to.row), row: to.row, climb: 1 }); }
    pts.push({ x: to.x, y: floorY(to.row), row: to.row });
    var len = 0; for (var i = 1; i < pts.length; i++) len += Math.abs(pts[i].x - pts[i - 1].x) + Math.abs(pts[i].y - pts[i - 1].y) * 1.4;
    return { pts: pts, len: len };
  }
  function walkAt(now) { // where he is on the current walk -> {x, y, row, left, climb, done}
    var w = walker, d = (now - w.start) / w.dur * w.len;
    for (var i = 1; i < w.path.length; i++) {
      var a0 = w.path[i - 1], b0 = w.path[i], sl = Math.abs(b0.x - a0.x) + Math.abs(b0.y - a0.y) * 1.4;
      if (d <= sl) { var k = sl ? d / sl : 1; return { x: a0.x + (b0.x - a0.x) * k, y: a0.y + (b0.y - a0.y) * k, row: k < 0.5 ? a0.row : b0.row, left: b0.x < a0.x, climb: !!b0.climb && a0.x === b0.x, done: false }; }
      d -= sl;
    }
    var e = w.path[w.path.length - 1]; return { x: e.x, y: e.y, row: e.row, left: false, done: true };
  }
  CS.aiuNow = function (sc, L) { // -> {x, y, walking, left, climb, tgt}
    var now = Date.now(), tgt = targetFor(sc, L);
    if (!walker.pos) walker.pos = { x: tgt.x, row: tgt.row };
    if (walker.drop) { walker.pos = { x: walker.drop.x, row: walker.drop.row }; walker.drop = null; walker.key = ''; walker.path = null; }
    if (tgt.key !== walker.key || (walker.tgt && Math.abs(walker.tgt.x - tgt.x) > 1 && !walker.path)) {
      var cur = walker.path ? walkAt(now) : { x: walker.pos.x, row: walker.pos.row };
      if (cur.row !== tgt.row || Math.abs(cur.x - tgt.x) > 1) { var pl = plan({ x: cur.x, row: cur.row }, tgt); walker.path = pl.pts; walker.len = pl.len; walker.start = now; walker.dur = Math.max(400, pl.len / 32 * 1000); }
      else walker.path = null;
      walker.key = tgt.key; walker.tgt = tgt;
    }
    if (walker.path) { var p = walkAt(now); if (!p.done) return { x: p.x, y: p.y, row: p.row, walking: true, left: p.left, climb: p.climb, tgt: tgt }; walker.path = null; }
    walker.pos = { x: tgt.x, row: tgt.row };
    return { x: tgt.x, y: floorY(tgt.row), row: tgt.row, walking: false, tgt: tgt };
  };
  CS.walking = function () { return !!walker.path; };
  CS.dropAt = function (p) { var row = p.y < TOP ? -1 : Math.max(0, Math.min(ROWS - 1, Math.floor((p.y - TOP) / CH))); var L = CS.current(); if (row >= 0 && !L.rooms[row + ',' + Math.max(0, Math.min(3, Math.floor(p.x / CW)))]) row = -1; walker.drop = { x: Math.max(6, Math.min(W - 6, p.x)), row: row }; };
  // the old activity pictures are drawn around a fixed spot (x 104 or 136, feet at y 100 or 97; the bed at 160, 86): this
  // moves that spot to where Aiu stands in the castle
  function oldAnchor(sc) {
    if (!sc.stage) return { x: sc.spotX || (sc.indoor ? 104 : A.AIU_OUT), y: sc.indoor ? 100 : 97 }; // the egg sits on the floor
    if (sc.act === 'sleep' || sc.mode === 'sleepy') return { x: 160, y: sc.mode === 'sleepy' ? 84 : 86 };
    if (sc.spotX) return { x: sc.spotX, y: 100 };
    return sc.indoor ? { x: 104, y: 100 } : { x: A.AIU_OUT, y: 97 };
  }
  var lastMap = { x: 0, y: 0 }, lastPos = null;
  CS.frameOff = function () { return lastMap; };
  CS.aiuPos = function () { return lastPos; };

  /* ---------- the pet: it wanders the grounds on the left, out of Aiu's way ---------- */
  var HOMEBOUND = /^(care_|petbuddy|feedbuddy|waterbuddy|fetch|ride|board)/;
  function petAt(sc, aiu) {
    var b = A.buddyOf(sc.soul, sc.buddy), PLY = AIU.play, home = { x: 66, y: SURF };
    var stay = A.POSTED[b] || sc.phase === 'night' || (sc.act && HOMEBOUND.test(sc.act)) || (PLY && PLY.active && PLY.active()) || (sc.bplay && sc.bplay.a);
    var p = home, left = false;
    if (!stay) { var w = WF.wanderAt('cbuddy' + (sc.soul || 0), sc.tsec * 0.8, 8, 84, 0, 0, 1); p = { x: Math.round(w.x), y: SURF }; left = w.left; }
    if (aiu && aiu.row === -1 && Math.abs(aiu.x - p.x) < 22) p = { x: aiu.x < p.x ? Math.min(W - 8, aiu.x + 22) : Math.max(8, aiu.x - 22), y: SURF }; // step aside for Aiu
    var tp = A.toyPos && A.toyPos('buddy', p); if (tp) p = { x: Math.round(tp.x), y: SURF };
    return { x: p.x, y: p.y, left: left };
  }

  /* ---------- drawing a frame ---------- */
  var layer = null;
  CS.building = false;
  CS.render = function (ctx, sc) {
    var a = app(), S = a.S, L = setup(S, sc); sc.stageNow = S ? S.stage : 0; sc.castle = true;
    var dark = sc.phase === 'night' ? 2 : sc.phase === 'dusk' || sc.phase === 'dawn' ? 1 : 0;
    var key = [sc.biome, sc.season, sc.house, sc.accent, lastLay, CS.building ? 'b' + sc.stageNow : '', dark].join('|');
    if (stat.key !== key) { stat.cv = drawStatic(sc, L, CS.building); stat.key = key; }
    if (!layer) layer = big(W, H);
    var Lc = layer.getContext('2d'); Lc.setTransform(SC, 0, 0, SC, 0, 0); Lc.imageSmoothingEnabled = false; Lc.clearRect(0, 0, W, H);
    ctx.clearRect(0, 0, W, H);
    IN.drawSky(ctx, 0, 0, W, SURF, IN.skyBands(sc.phase, sc.weather)); IN.skyThings(ctx, sc, [0, 0, W, 40]);
    Lc.drawImage(stat.cv, 0, 0, W, H);
    // the clock on the living room wall (it really ticks)
    CS.blocks(L).forEach(function (b) { if (b.type === 'living') WF.regulatorSmall(Lc, b.x + b.w - 15, b.y + 6, sc); });
    // outside: what stands in each spot (the board and the cart come later, they're live)
    var aiu = CS.aiuNow(sc, L), cooking = !aiu.walking && aiu.tgt.cart && sc.act === 'hibachi';
    CS.SLOT_ORDER.forEach(function (sl) { var t = L.orn[sl]; if (t && ORNART[t]) ORNART[t](Lc, CS.SLOTS[sl], sc); });
    if (A.CART_AT && L.orn && CS.SLOT_ORDER.some(function (sl) { return L.orn[sl] === 'cart'; })) WF.drawCart(Lc, Object.assign({}, sc, { indoor: false }), cooking && !(A.toyHide && A.toyHide('aiu'))); // (the cart always stands outside)
    if (sc.stage && A.BOARD_P) { Lc.save(); Lc.translate(A.BOARD_P.x, A.BOARD_P.y); Lc.scale(30 / 36, 30 / 36); Lc.translate(-3, -103); var bp = A.BOARD_P; A.BOARD_P = { x: 3, y: 103, w: 36, h: 36 }; WF.board(Lc, sc); A.BOARD_P = bp; Lc.restore(); }
    // a strange friendly creature passing by, on the grounds
    var od = A.oddNow && A.oddNow(sc); if (od) { Lc.save(); Lc.beginPath(); Lc.rect(0, 0, W, SURF + 2); Lc.clip(); Lc.translate(0, SURF - od.y); A.drawOdd(Lc, od, sc); Lc.restore(); }
    // the pet, then Aiu
    var pp = petAt(sc, aiu), anc = oldAnchor(sc);
    lastPos = { x: aiu.x, y: aiu.y, row: aiu.row, s: 1 };
    lastMap = aiu.walking ? { x: aiu.x - anc.x, y: aiu.y - anc.y } : { x: aiu.x - anc.x, y: floorY(aiu.row) + (aiu.tgt.bed ? BED.y : 0) - anc.y };
    var hideAiu = (A.toyHide && A.toyHide('aiu')) || (a.visit && a.visit.phase === 'in' && !(a.visit.id && (A.LANDMARKS || []).some(function (x) { return x.id === a.visit.id && x.r.y >= TOP; })));
    if (sc.stage && !(A.toyHide && A.toyHide('buddy'))) WF.drawBuddyAt(Lc, Object.assign({}, sc, { indoor: false }), pp, lastMap); // (the pet is always outside: indoors the old code drew the computer in its place)
    if (!sc.stage) { Lc.save(); Lc.translate(lastMap.x, lastMap.y); IN.drawActor(Lc, sc); Lc.restore(); } // the egg
    else if (!hideAiu && !cooking) {
      if (aiu.walking) WF.drawWalker(Lc, sc, { x: aiu.x, y: aiu.y }, aiu.left, 1, aiu.climb);
      else {
        var tg = aiu.tgt, clip = tg.blk ? { x: tg.blk.x + 2, y: TOP + tg.row * CH + 2, w: tg.blk.w - 4, h: CH - 4 } : null;
        Lc.save(); if (clip) { Lc.beginPath(); Lc.rect(clip.x - 6, clip.y - 10, clip.w + 12, clip.h + 10); Lc.clip(); }
        Lc.translate(lastMap.x, lastMap.y); IN.drawActor(Lc, Object.assign({}, sc, { walk: null })); Lc.restore();
      }
    }
    // the time of day: the grounds darken; the rooms stay lamp-lit
    var dim = sc.phase === 'night' ? 0.55 : sc.phase === 'dusk' || sc.phase === 'dawn' ? 0.25 : (sc.weather === 'storm' || sc.weather === 'rain') ? 0.18 : 0;
    if (dim) { Lc.globalCompositeOperation = 'source-atop'; Lc.globalAlpha = dim; R(Lc, 0, 0, W, SURF + 3, P.ink); Lc.globalAlpha = dim * 0.35; R(Lc, 0, SURF + 3, W, H - SURF - 3, P.ink); Lc.globalAlpha = 1; Lc.globalCompositeOperation = 'source-over'; }
    ctx.drawImage(layer, 0, 0, W, H);
    if (sc.stage) { ctx.save(); ctx.translate(WF.SKYOFF.x, WF.SKYOFF.y); IN.drone(ctx, sc); ctx.restore(); }
    IN.weather(ctx, sc, [0, 0, W, SURF + 2]);
    if (sc.flash) { var rr = Math.round(10 + (1 - Math.min(1, sc.flash)) * 18); for (var sp = 0; sp < 12; sp++) { var an = sp / 12 * Math.PI * 2; px(ctx, Math.round(aiu.x + Math.cos(an) * rr), Math.round(aiu.y - 14 + Math.sin(an) * rr * 0.7), sp % 2 ? P.yellow : P.white); } }
    if (A.toyDraw) A.toyDraw(ctx, sc);
    if (CS.building) buildOverlay(ctx, sc, L);
  };
  function buildOverlay(ctx, sc, L) {
    var sel = CS.moving, t = Date.now() / 300;
    if (sel) { var p = rc(sel), r0 = cellRect(p.r, p.c); ctx.strokeStyle = P.yellow; ctx.lineWidth = 1; ctx.setLineDash([2, 2]); ctx.lineDashOffset = Math.floor(t) % 4; ctx.strokeRect(r0.x + 1.5, r0.y + 1.5, r0.w - 3, r0.h - 3); ctx.setLineDash([]);
      for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) { var k = r + ',' + c; if (CS.canMove(L, sc.stageNow || 0, sel, k)) { var cr = cellRect(r, c); ctx.globalAlpha = 0.25; R(ctx, cr.x + 3, cr.y + 3, cr.w - 6, cr.h - 6, P.yellow); ctx.globalAlpha = 1; } } }
    if (CS.movingOrn) { var x0 = CS.SLOTS[CS.movingOrn]; ctx.strokeStyle = P.yellow; ctx.strokeRect(x0 - 15.5, SURF - 31.5, 31, 33); CS.SLOT_ORDER.forEach(function (sl) { if (sl !== CS.movingOrn) { ctx.globalAlpha = 0.25; R(ctx, CS.SLOTS[sl] - 14, SURF - 30, 28, 30, P.yellow); ctx.globalAlpha = 1; } }); }
    else CS.SLOT_ORDER.forEach(function (sl) { if (!L.orn[sl]) { dashedC(ctx, CS.SLOTS[sl] - 12, SURF - 24, 24, 24, P.yellow); spr(ctx, CS.SLOTS[sl] - 2, SURF - 15, ['..y..', '..y..', 'yyyyy', '..y..', '..y..']); } });
  }
  function dashedC(ctx, x, y, w, h, col) { dashed(ctx, x, y, w, h, col); }

  /* ---------- what's under a tap (castle pixels) ---------- */
  function inR(p, r) { return !!(r && p && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h); }
  CS.hitAt = function (pt, sc) {
    if (!pt || !sc) return null;
    var L = CS.current();
    if (CS.building) { // build mode: rooms, rock and spots outside
      if (pt.y < TOP - 2) { var sl = CS.SLOT_ORDER.filter(function (s) { return Math.abs(pt.x - CS.SLOTS[s]) <= 15 && pt.y >= SURF - 34; })[0]; return sl ? { kind: 'bslot', slot: sl } : null; }
      var r = Math.floor((pt.y - TOP) / CH), c = Math.floor(pt.x / CW); if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
      return { kind: 'bcell', k: r + ',' + c };
    }
    if (inR(pt, A.droneRectP && A.droneRectP(sc))) return { kind: 'drone' };
    var ap = lastPos; if (ap && sc.stage !== undefined && Math.abs(pt.x - ap.x) <= 11 && pt.y >= ap.y - 26 && pt.y <= ap.y + 3) return { kind: 'aiu' };
    if (sc.stage && inR(pt, A.buddyRectP && A.buddyRectP(sc))) return { kind: 'buddy' };
    if (sc.stage && inR(pt, A.BOARD_P)) return { kind: 'board' };
    var oh = A.oddHit && A.oddNow && A.oddNow(sc) ? A.oddHit({ x: pt.x, y: pt.y - SURF + A.oddNow(sc).y }, sc) : null; if (oh) return { kind: 'oddity', odd: oh };
    if (inR(pt, A.CART_P)) return { kind: 'cart' };
    if (pt.y < TOP) {
      var hit = null; CS.SLOT_ORDER.forEach(function (s) { var t = L.orn[s]; if (t && inR(pt, ornRect(s, t))) hit = t; });
      if (hit && CS.ORN[hit].fun) return { kind: 'landmark', id: hit };
      if (hit) return { kind: 'orn', id: hit };
      if (Math.abs(pt.x - SHAFT) < 30 && pt.y > SURF - 30) return { kind: 'gate' };
      return null;
    }
    var bl = CS.blocks(L).filter(function (b) { return inR(pt, b); })[0];
    if (bl) { var d = CS.ROOMS[bl.type]; if (bl.type === 'office') return { kind: 'computer' }; if (d.place) return { kind: 'landmark', id: d.place }; return { kind: 'room', type: bl.type }; }
    return { kind: 'rock' };
  };

  /* ---------- build mode (the hammer under the picture) ---------- */
  CS.setBuilding = function (on) { CS.building = !!on; CS.moving = null; CS.movingOrn = null; stat.key = null; if (AIU.ui.refresh) AIU.ui.refresh(); };
  function spend(price, what) { var a = app(); if ((a.S.tokens || 0) < price) return Promise.resolve(false); return a.addEvents([{ type: 'tspend', data: { what: ('castle:' + what).slice(0, 30), price: price } }]).then(function () { return true; }); }
  function refund(price, what) { var a = app(); var back = Math.floor(price / 2); return back > 0 ? a.addEvents([{ type: 'trefund', data: { what: String(what).slice(0, 30), price: back } }]) : Promise.resolve(); }
  CS.buildTap = function (hit) {
    var a = app(), S = a.S, L = CS.current(), k = AIU.ui.k, stage = S.stage || 0;
    if (!hit) return;
    if (hit.kind === 'bcell') {
      var key = hit.k, t = L.rooms[key];
      if (CS.moving) { // second tap: where it goes
        if (key === CS.moving) { CS.moving = null; return; }
        if (!CS.canMove(L, stage, CS.moving, key)) { k.snack(L.rooms[key] ? 'Those two can\'t swap: every room has to stay joined to the others.' : 'It can only go where it stays joined to the other rooms (and where the ground is open).'); return; }
        var r2 = Object.assign({}, L.rooms), from = CS.moving; if (r2[key]) { var tt = r2[key]; r2[key] = r2[from]; r2[from] = tt; } else { r2[key] = r2[from]; delete r2[from]; }
        CS.moving = null; a.beep('knock'); return CS.save({ rooms: r2, orn: L.orn });
      }
      if (t) return roomSheet(L, key, t);
      var why = CS.canBuildAt(L, stage, key);
      if (why === 'locked') return k.snack('This ground opens when ' + S.totemName + ' reaches ' + C.stageName(CS.openNeeds(rc(key).r)) + '.');
      if (why === 'far') return k.snack('Build next to a room you already have (the castle grows out from the gate).');
      return pickRoom(L, key);
    }
    if (hit.kind === 'bslot') {
      var sl = hit.slot, o = L.orn[sl];
      if (CS.movingOrn) { var o2 = Object.assign({}, L.orn), m = CS.movingOrn; var tmp = o2[sl]; o2[sl] = o2[m]; o2[m] = tmp; CS.movingOrn = null; a.beep('knock'); return CS.save({ rooms: L.rooms, orn: o2 }); }
      if (o) return ornSheet(L, sl, o);
      return pickOrn(L, sl);
    }
  };
  function costLine(d, S) { return d.cost ? d.cost + ' tokens' : 'free'; }
  function pickRoom(L, key) {
    var a = app(), S = a.S, k = AIU.ui.k, h = U.h, s, list = h('div', { cls: 'morelist' });
    Object.keys(CS.ROOMS).filter(function (t) { return !CS.ROOMS[t].core; }).forEach(function (t) {
      var d = CS.ROOMS[t], ok = (S.stage || 0) >= d.stage, rich = (S.tokens || 0) >= d.cost;
      list.appendChild(h('button', { type: 'button', cls: 'qrow' + (ok && rich ? '' : ' dim'), onclick: function () {
        if (!ok) return k.snack(d.name + ' opens when ' + S.totemName + ' reaches ' + C.stageName(d.stage) + '.');
        if (!rich) return k.snack('You need ' + (d.cost - (S.tokens || 0)) + ' more tokens.');
        s.remove(); spend(d.cost, t).then(function (paid) { if (!paid) return k.snack('The wallet came up short.'); var r2 = Object.assign({}, L.rooms); r2[key] = t; CS.save({ rooms: r2, orn: L.orn }).then(function () { a.beep('coin'); a.react('happy'); k.snack('Built: ' + d.name + '.' + (adjSame(r2, key, t) ? ' It joined the one next to it: a bigger room.' : '')); }); });
      } }, h('span', { cls: 'qrtitle', text: d.name + (CS.count(L, t) ? ' (another)' : '') }), h('span', { cls: 'small', text: (ok ? costLine(d) : 'opens at ' + C.stageName(d.stage)) + ' · ' + d.desc })));
    });
    s = k.sheet('Build a room', [h('p', { cls: 'small', text: 'You have ' + (S.tokens || 0) + ' tokens. Two of the same room side by side join into one big room.' }), list]);
  }
  function adjSame(rooms, key, t) { var p = rc(key); return rooms[p.r + ',' + (p.c - 1)] === t || rooms[p.r + ',' + (p.c + 1)] === t; }
  function roomSheet(L, key, t) {
    var a = app(), k = AIU.ui.k, h = U.h, d = CS.ROOMS[t], s;
    var acts = [k.btn('Move', function () { s.remove(); CS.moving = key; k.snack('Tap where it goes (another room swaps with it).'); }, 'primary')];
    if (!d.core) acts.push(k.btn('Remove', function () {
      if (!CS.canRemove(L, key)) { k.snack('Not this one: the rooms past it would be cut off.'); return; }
      if (!confirm('Remove the ' + d.name.toLowerCase() + '? You get half its tokens back (' + Math.floor((d.cost || 0) / 2) + ').')) return;
      s.remove(); var r2 = Object.assign({}, L.rooms); delete r2[key]; refund(d.cost || 0, t).then(function () { return CS.save({ rooms: r2, orn: L.orn }); }).then(function () { k.snack('Removed.'); });
    }, 'del'));
    s = k.sheet(d.name, [h('p', { text: d.desc }), d.core ? h('p', { cls: 'small', text: 'One of the four first rooms: it can move, but it stays.' }) : null, h('div', { cls: 'row wrap' }, acts)]);
  }
  function pickOrn(L, sl) {
    var a = app(), S = a.S, k = AIU.ui.k, h = U.h, s, list = h('div', { cls: 'morelist' });
    Object.keys(CS.ORN).filter(function (t) { return !CS.ORN[t].core; }).forEach(function (t) {
      var d = CS.ORN[t], ok = (S.stage || 0) >= d.stage, rich = (S.tokens || 0) >= d.cost, have = CS.SLOT_ORDER.some(function (x) { return L.orn[x] === t; });
      list.appendChild(h('button', { type: 'button', cls: 'qrow' + (ok && rich && !have ? '' : ' dim'), onclick: function () {
        if (have) return k.snack('It\'s already out there. Move it instead.');
        if (!ok) return k.snack(d.name + ' comes when ' + S.totemName + ' reaches ' + C.stageName(d.stage) + '.');
        if (!rich) return k.snack('You need ' + (d.cost - (S.tokens || 0)) + ' more tokens.');
        s.remove(); spend(d.cost, t).then(function (paid) { if (!paid) return k.snack('The wallet came up short.'); var o2 = Object.assign({}, L.orn); o2[sl] = t; CS.save({ rooms: L.rooms, orn: o2 }).then(function () { a.beep('coin'); k.snack('Built: ' + d.name + '.'); }); });
      } }, h('span', { cls: 'qrtitle', text: d.name }), h('span', { cls: 'small', text: (have ? 'already built' : ok ? costLine(d) : 'comes at ' + C.stageName(d.stage)) + ' · ' + d.desc })));
    });
    s = k.sheet('Build outside', [h('p', { cls: 'small', text: 'You have ' + (S.tokens || 0) + ' tokens.' }), list]);
  }
  function ornSheet(L, sl, t) {
    var k = AIU.ui.k, h = U.h, d = CS.ORN[t], s;
    var acts = [k.btn('Move', function () { s.remove(); CS.movingOrn = sl; k.snack('Tap the spot where it goes (what\'s there swaps with it).'); }, 'primary')];
    if (!d.core) acts.push(k.btn('Remove', function () { if (!confirm('Remove the ' + d.name.toLowerCase() + '? You get half its tokens back (' + Math.floor((d.cost || 0) / 2) + ').')) return; s.remove(); var o2 = Object.assign({}, L.orn); o2[sl] = null; refund(d.cost || 0, t).then(function () { return CS.save({ rooms: L.rooms, orn: o2 }); }).then(function () { k.snack('Removed.'); }); }, 'del'));
    s = k.sheet(d.name, [h('p', { text: d.desc }), d.core ? h('p', { cls: 'small', text: 'It can move to another spot, but it stays.' }) : null, h('div', { cls: 'row wrap' }, acts)]);
  }
  CS.roomInfo = function (type) { var d = CS.ROOMS[type]; return d ? d.name + ': ' + d.desc : ''; };
})();
