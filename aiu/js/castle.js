/* AIU TOTEM 3.1 - the castle: Aiu's whole place in one picture (288 x 405, drawn 3x for crisp pixels).
     Top (y 0-85): the sky, the drone, the hillside (where the strange creatures wander, behind the castle) and the grounds:
       the gatehouse over the way down, the observatory if you built it (it pops up off the right tower), and six spots
       outside for the bounty board, the food cart, the well, the outhouse, the shed, the garden, the pond and more.
     Below: 12 rooms dug into the ground (3 across, 4 floors), joined by a ladder under the gate. It starts as a seed of
       four rooms (living room, kitchen, bedroom, bathroom) and grows as Aiu grows: build the other eight with tokens,
       move them, swap them. Each room is one of a kind.
   Aiu lives inside: he goes to the room for what he's doing and does a little animation of his own there (stirring a
   pot, watering the hydroponics, painting at the easel). He goes outside for the stand-up at the board, to cook at the
   food cart, the I Ching toss, the pet, and the things you built outside (the pond, the garden, the observatory).
   The layout is the setting 'castle' (synced): { v: 2, rooms: { 'row,col': type }, orn: { slot: type }, obs: true }. */
(function () {
  'use strict';
  var U = AIU.util, C = AIU.core, A = AIU.art, P = A.P, K = A.prim, R = K.R, px = K.px, spr = K.spr, disc = K.disc, ell = K.ell, tri = K.tri, line = K.line;
  var IN = A._in, WF = A._w;
  var CS = AIU.castle = {};
  function app() { return AIU.app; }
  A.CASTLE = true;

  /* ---------- the grid ---------- */
  var W = 288, H = 405, SC = 3, SURF = 80, TOP = 85, CW = 96, CH = 80, COLS = 3, ROWS = 4, SHAFT = 96;
  var GATE = { x: SHAFT, l: 60, r: 132 }, OBS = { x: 124, y: 36 }; // the gatehouse; the observatory's deck (on the right tower)
  CS.W = W; CS.H = H; CS.SC = SC;
  CS.G = { W: W, H: H, SURF: SURF, TOP: TOP, CW: CW, CH: CH, COLS: COLS, ROWS: ROWS, SHAFT: SHAFT, OBS: OBS };
  function cellRect(r, c) { return { x: c * CW, y: TOP + r * CH, w: CW, h: CH }; }
  function inner(r, c) { return { x: c * CW + 2, y: TOP + r * CH + 2, w: CW - 4, h: CH - 4 }; }
  function floorY(row) { return row === -2 ? OBS.y + 10 : row < 0 ? SURF : TOP + row * CH + CH - 7; }
  CS.cellRect = cellRect; CS.floorY = floorY; CS.inner = inner;

  /* ---------- what you can build ---------- */
  CS.ROOMS = {
    living: { name: 'Living room', core: 1, desc: 'The couch, the TV, the fish tank and the clock.' },
    kitchen: { name: 'Kitchen', core: 1, desc: 'Where Aiu cooks, chops, makes tea and does the dishes.' },
    bedroom: { name: 'Bedroom', core: 1, desc: 'His bed (from 10 pm), a lamp and a window full of sky.' },
    bath: { name: 'Bathroom', core: 1, desc: 'A clawfoot tub, the sink, his toothbrush and a rubber duck.' },
    office: { name: 'Office', cost: 0, stage: 0, desc: 'The computer: tap it for the mini-games (it\'s the only place to play them). The drone\'s dock. Free to build.' },
    garage: { name: 'Garage', cost: 90, stage: 1, place: 'garage', desc: 'Aiu\'s little car, the tools and the weights. He works out and builds here.' },
    library: { name: 'Library', cost: 80, stage: 2, desc: 'Shelves of books, a reading chair and a globe. Aiu reads and writes here.' },
    greenhouse: { name: 'Greenhouse', cost: 120, stage: 2, place: 'greenhouse', desc: 'Hydroponics under LED grow lights: racks of greens, a water tank, a yoga mat.' },
    music: { name: 'Music room', cost: 100, stage: 2, desc: 'A piano, a guitar and a drum. Aiu plays here.' },
    studio: { name: 'Art studio', cost: 100, stage: 3, desc: 'An easel, a pottery wheel and paint everywhere.' },
    lab: { name: 'Lab', cost: 150, stage: 3, place: 'lab', desc: 'Flasks, a microscope and a 3D printer: learn to code, design and build.' },
    stable: { name: 'Stable', cost: 150, stage: 3, place: 'barn', desc: 'Hay, a stall and the chickens you look after.' }
  };
  CS.ORN = {
    board: { name: 'Bounty board', core: 1, desc: 'Today\'s list. Tap it: Aiu walks over and tells you the day.' },
    cart: { name: 'Food cart', core: 1, desc: 'Aiu cooks here at lunch and dinner when the weather is nice.' },
    well: { name: 'Well', cost: 30, stage: 0, fun: 1, desc: 'A wishing well. Splash!' },
    outhouse: { name: 'Outhouse', cost: 30, stage: 0, fun: 1, desc: 'For when Aiu is outside and needs to go.' },
    banner: { name: 'Banner', cost: 25, stage: 0, desc: 'A flag in Aiu\'s colors.' },
    shed: { name: 'Tool shed', cost: 40, stage: 1, fun: 1, desc: 'Rakes and shovels.' },
    garden: { name: 'Garden', cost: 60, stage: 1, desc: 'An outdoor vegetable garden (the greenhouse is the indoor one; you can have both). Aiu gardens here.' },
    pond: { name: 'Pond', cost: 70, stage: 2, desc: 'A little pond with reeds and a fish or two. Aiu fishes here.' },
    windmill: { name: 'Windmill', cost: 90, stage: 2, desc: 'Its sails turn in the wind.' },
    statue: { name: 'Aiu statue', cost: 200, stage: 4, desc: 'A stone statue of Aiu, for the grown-up Totem.' }
  };
  CS.OBS = { name: 'Observatory', cost: 180, stage: 3, desc: 'A little domed telescope that pops up off the castle\'s tower. Aiu stargazes there at night.' };
  CS.SLOTS = { L1: 16, L2: 43, R1: 158, R2: 196, R3: 229, R4: 263 };
  CS.SLOT_ORDER = ['L1', 'L2', 'R1', 'R2', 'R3', 'R4'];
  CS.SEED = { v: 2, rooms: { '0,0': 'living', '0,1': 'kitchen', '1,0': 'bedroom', '1,1': 'bath' }, orn: { L1: 'well', L2: 'board', R1: 'cart' }, obs: false };
  // the ground that's open at each stage: the top two floors from the start, then a floor at Sprout and one at Scout
  CS.open = function (stage, r) { if (r <= 1) return true; if (r === 2) return stage >= 2; return stage >= 3; };
  CS.openNeeds = function (r) { return r <= 1 ? 0 : r === 2 ? 2 : 3; };

  /* ---------- the layout (the setting 'castle') ---------- */
  CS.layout = function (S) {
    var v = S && C.setting(S, 'castle', null), src = v && v.v === 2 && v.rooms ? v : v && v.v === 1 && v.rooms ? fromV1(v) : CS.SEED, out = { rooms: {}, orn: {}, obs: !!src.obs };
    var seen = {};
    Object.keys(src.rooms || {}).sort().forEach(function (k) { var t = src.rooms[k], m = /^([0-3]),([0-2])$/.exec(k); if (m && CS.ROOMS[t] && !seen[t]) { out.rooms[k] = t; seen[t] = 1; } });
    var oseen = {}; CS.SLOT_ORDER.forEach(function (sl) { var t = (src.orn || {})[sl]; out.orn[sl] = CS.ORN[t] && !oseen[t] ? t : null; if (out.orn[sl]) oseen[t] = 1; });
    ['living', 'kitchen', 'bedroom', 'bath'].forEach(function (t) { if (!CS.find(out, t)) { var k = freeNear(out); if (k) out.rooms[k] = t; } }); // the four first rooms are always there
    ['board', 'cart'].forEach(function (t) { if (!oseen[t]) { var sl = CS.SLOT_ORDER.filter(function (x) { return !out.orn[x]; })[0]; if (sl) { out.orn[sl] = t; oseen[t] = 1; } } });
    if (!connected(out.rooms)) return CS.layout(null);
    return out;
  };
  function fromV1(v) { // a 3.0 castle (small rooms, 4 x 4): its rooms move into the new grid, each once, next to the others
    var out = { rooms: Object.assign({}, CS.SEED.rooms), orn: Object.assign({}, v.orn || {}), obs: false }, have = {};
    Object.keys(out.rooms).forEach(function (k) { have[out.rooms[k]] = 1; });
    Object.keys(v.rooms).sort().forEach(function (k) { var t = v.rooms[k] === 'workshop' ? 'garage' : v.rooms[k]; if (!CS.ROOMS[t] || have[t]) return; var f = freeNear(out); if (f) { out.rooms[f] = t; have[t] = 1; } });
    return out;
  }
  function freeNear(L) { for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) { var k = r + ',' + c; if (!L.rooms[k]) return k; } return null; }
  CS.find = function (L, type) { var ks = Object.keys(L.rooms).filter(function (k) { return L.rooms[k] === type; }); return ks[0] || null; };
  CS.has = function (L, type) { return !!CS.find(L, type); };
  CS.hasOrn = function (L, type) { return CS.SLOT_ORDER.filter(function (sl) { return L.orn[sl] === type; })[0] || null; };
  function rc(k) { var p = k.split(','); return { r: +p[0], c: +p[1] }; }
  CS.rc = rc;
  function neighbors(k) { var p = rc(k), out = []; [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(function (d) { var r = p.r + d[0], c = p.c + d[1]; if (r >= 0 && r < ROWS && c >= 0 && c < COLS) out.push(r + ',' + c); }); return out; }
  function connected(rooms) { // every room joins up with the entrance (the top floor on either side of the ladder)
    var keys = Object.keys(rooms); if (!keys.length) return true;
    var start = ['0,0', '0,1'].filter(function (k) { return rooms[k]; }); if (!start.length) return false;
    var seen = {}, q = start.slice(); start.forEach(function (k) { seen[k] = 1; });
    while (q.length) { var k = q.shift(); neighbors(k).forEach(function (n) { if (rooms[n] && !seen[n]) { seen[n] = 1; q.push(n); } }); }
    return keys.every(function (k) { return seen[k]; });
  }
  CS.canBuildAt = function (L, stage, k) {
    var p = rc(k); if (L.rooms[k]) return 'taken'; if (!CS.open(stage, p.r)) return 'locked';
    if (!neighbors(k).some(function (n) { return L.rooms[n]; }) && k !== '0,0' && k !== '0,1') return 'far'; return '';
  };
  CS.canRemove = function (L, k) { var t = L.rooms[k]; if (!t || CS.ROOMS[t].core) return false; var r2 = Object.assign({}, L.rooms); delete r2[k]; return connected(r2); };
  CS.canMove = function (L, stage, from, to) {
    if (from === to || !L.rooms[from]) return false; if (!CS.open(stage, rc(to).r)) return false;
    var r2 = Object.assign({}, L.rooms); if (r2[to]) { var t = r2[to]; r2[to] = r2[from]; r2[from] = t; } else { r2[to] = r2[from]; delete r2[from]; }
    return connected(r2);
  };
  CS.save = function (L) { return app().setSetting('castle', { v: 2, rooms: L.rooms, orn: L.orn, obs: !!L.obs }); };

  /* ---------- the look of each land ---------- */
  CS.style = function (sc) { if (sc.house === 'cave') return 'cave'; if (sc.biome === 'tundra') return 'ice'; if (sc.biome === 'desert') return 'desert'; return 'stone'; };
  var STY = {
    stone: { earth: '#5a3d2b', earth2: '#6b4a33', rock: P.slate, wall: P.silver, wall2: P.slate, trim: P.dark, roof: P.red, frame: '#7d6a5a' },
    ice: { earth: '#9cc9e0', earth2: '#b9dcee', rock: P.white, wall: P.white, wall2: P.cyan, trim: P.sky, roof: P.sky, frame: '#c8e6f2' },
    desert: { earth: '#c98a4b', earth2: '#d9a066', rock: '#a5673a', wall: '#d9824f', wall2: '#9c4f2c', trim: P.bark, roof: '#e7b56a', frame: '#b5703f' },
    cave: { earth: '#3b3f52', earth2: '#474c63', rock: P.slate, wall: P.slate, wall2: P.dark, trim: P.ink, roof: P.green, frame: '#5b6178' }
  };
  CS.STY = STY;

  /* ---------- small drawing helpers ---------- */
  function mk(w, h) { var cv = document.createElement('canvas'); cv.width = w; cv.height = h; return cv; }
  function big(w, h) { var cv = mk(w * SC, h * SC), c = cv.getContext('2d'); c.imageSmoothingEnabled = false; c.setTransform(SC, 0, 0, SC, 0, 0); return cv; }
  function box(c, x, y, w, h, fill, hi, lo) { R(c, x, y, w, h, P.ink); R(c, x + 1, y + 1, w - 2, h - 2, fill); if (hi) R(c, x + 1, y + 1, w - 2, 1, hi); if (lo) R(c, x + 1, y + h - 2, w - 2, 1, lo); }
  function tiles(c, x, y, w, h, a, b, sz) { for (var j = 0; j < h; j += sz) for (var i = 0; i < w; i += sz) R(c, x + i, y + j, Math.min(sz, w - i), Math.min(sz, h - j), ((i + j) / sz) % 2 ? a : b); }
  function grid(c, x, y, w, h, col, sz) { for (var j = sz; j < h; j += sz) R(c, x, y + j, w, 1, col); for (var i = sz; i < w; i += sz) R(c, x + i, y, 1, h, col); }
  function stripes(c, x, y, w, h, a, b, step, wd) { R(c, x, y, w, h, a); for (var i = 0; i < w; i += step) R(c, x + i, y, wd || 1, h, b); }
  function floorBand(c, b, a, edge) { R(c, b.x, b.y + b.h - 7, b.w, 7, a); R(c, b.x, b.y + b.h - 7, b.w, 1, edge || P.ink); }
  function planks(c, x, y, w, h, a, b) { R(c, x, y, w, h, a); for (var j = 0; j < h; j += 3) { R(c, x, y + j, w, 1, b); for (var i = (j * 7) % 19; i < w; i += 19) R(c, x + i, y + j, 1, 3, b); } }
  function win(c, x, y, w, h, sc, frame0) { // a window: sky by day, stars at night
    var night = sc.phase === 'night' || sc.phase === 'dusk', fc = frame0 || P.white; box(c, x, y, w, h, fc);
    R(c, x + 2, y + 2, w - 4, h - 4, night ? P.navy : P.sky); if (night) { px(c, x + 4, y + 4, P.white); px(c, x + w - 6, y + 6, P.yellow); px(c, x + Math.floor(w / 2) + 2, y + h - 6, P.white); } else R(c, x + 4, y + h - 8, w - 8, 2, P.white);
    R(c, x + Math.floor(w / 2), y + 1, 1, h - 2, fc); R(c, x + 1, y + Math.floor(h / 2), w - 2, 1, fc);
  }
  function plant(c, x, y) { box(c, x - 4, y, 9, 7, P.orange, P.yellow); R(c, x, y - 7, 1, 7, P.green); ell(c, x - 2, y - 5, 2, 1, P.green); ell(c, x + 3, y - 3, 2, 1, P.lime); ell(c, x, y - 8, 2, 2, P.green); }
  function lamp(c, x, y, sc, h0) { var on = sc.phase !== 'day'; R(c, x, y, 1, h0, P.dark); R(c, x - 3, y + h0, 7, 2, P.dark); tri(c, x, y - 7, 7, 0.6, P.ink); tri(c, x, y - 6, 6, 0.55, on ? P.yellow : P.sand); if (on) { c.globalAlpha = 0.18; disc(c, x, y - 2, 10, P.yellow); c.globalAlpha = 1; } }
  function picture(c, x, y, w, h, sc, art) { box(c, x, y, w, h, P.wood, P.sand, P.bark); var cs = (sc.cos || {}).wall; if (art && cs && cs.img) { c.drawImage(cs.img, x + 2, y + 2, w - 4, h - 4); return; } R(c, x + 2, y + 2, w - 4, h - 4, P.sky); R(c, x + 2, y + h - 6, w - 4, 4, P.green); disc(c, x + w - 6, y + 5, 2, P.yellow); tri(c, x + 7, y + h - 11, 5, 1, P.slate); }
  function rug(c, cx, y, rw, sc) { var cs = (sc.cos || {}).rug; if (cs && cs.img) { c.drawImage(cs.img, cx - rw, y - 3, rw * 2, 6); return; } ell(c, cx, y, rw, 2, P.plum); ell(c, cx, y, rw - 3, 1, P.pink); }

  /* ---------- the twelve rooms (each 92 x 76 inside its walls). The furniture stands where Aiu's animations expect it. ---------- */
  function quilt(sc) { var a = sc.accent || P.red; return a === P.white || a === P.silver || a === P.sand ? P.blue : a; } // (his color, unless it's too pale to see)
  var ROOMART = {
    living: function (c, b, sc) {
      var acc = sc.accent || P.red, wp = '#e6c68e'; R(c, b.x, b.y, b.w, b.h, '#f3dcae');
      for (var j = 6; j < b.h - 24; j += 8) for (var i = (j / 2) % 8; i < b.w; i += 12) { px(c, b.x + i + 3, b.y + j, wp); px(c, b.x + i + 2, b.y + j + 1, wp); px(c, b.x + i + 4, b.y + j + 1, wp); px(c, b.x + i + 3, b.y + j + 2, wp); } // diamond wallpaper
      R(c, b.x, b.y + b.h - 24, b.w, 17, '#e9c994'); R(c, b.x, b.y + b.h - 24, b.w, 1, P.wood); // the wainscot
      floorBand(c, b, P.wood, P.bark); for (var fx = 4; fx < b.w; fx += 11) R(c, b.x + fx, b.y + b.h - 6, 1, 6, P.bark);
      win(c, b.x + 7, b.y + 8, 20, 18, sc); R(c, b.x + 4, b.y + 6, 26, 2, P.bark); R(c, b.x + 4, b.y + 8, 3, 20, acc); R(c, b.x + 27, b.y + 8, 3, 20, acc); // curtains
      picture(c, b.x + 34, b.y + 9, 16, 13, sc, true);
      // the couch (Aiu sits on it at x 22)
      box(c, b.x + 6, b.y + b.h - 31, 32, 10, acc); R(c, b.x + 8, b.y + b.h - 30, 12, 1, P.white); R(c, b.x + 22, b.y + b.h - 30, 1, 8, P.plum);
      box(c, b.x + 4, b.y + b.h - 22, 36, 9, acc, null, P.plum);
      box(c, b.x + 2, b.y + b.h - 26, 6, 15, acc); box(c, b.x + 36, b.y + b.h - 26, 6, 15, acc); R(c, b.x + 6, b.y + b.h - 13, 2, 6, P.bark); R(c, b.x + 36, b.y + b.h - 13, 2, 6, P.bark);
      box(c, b.x + 30, b.y + b.h - 28, 7, 6, P.yellow, P.white); // a cushion
      rug(c, b.x + 50, b.y + b.h - 4, 16, sc);
      // the TV on its stand
      box(c, b.x + 62, b.y + b.h - 17, 24, 10, P.bark, P.wood); R(c, b.x + 68, b.y + b.h - 14, 12, 1, P.wood);
      box(c, b.x + 61, b.y + b.h - 34, 26, 17, P.dark); R(c, b.x + 63, b.y + b.h - 32, 22, 13, P.navy); R(c, b.x + 64, b.y + b.h - 31, 6, 1, P.blue); px(c, b.x + 84, b.y + b.h - 20, P.red);
      // the fish tank on its shelf (the clock is drawn live next to it)
      R(c, b.x + 54, b.y + 22, 22, 2, P.bark); box(c, b.x + 56, b.y + 11, 18, 11, P.cyan); R(c, b.x + 57, b.y + 12, 16, 2, P.white); R(c, b.x + 57, b.y + 19, 16, 2, P.sand); R(c, b.x + 60, b.y + 15, 1, 4, P.green); R(c, b.x + 70, b.y + 16, 1, 3, P.lime);
    },
    kitchen: function (c, b, sc) {
      R(c, b.x, b.y, b.w, b.h, '#f7ead0'); tiles(c, b.x + 20, b.y + 26, b.w - 20, 12, '#ffd9a0', P.white, 4); tiles(c, b.x, b.y + b.h - 7, b.w, 7, P.red, P.white, 4); R(c, b.x, b.y + b.h - 7, b.w, 1, P.ink);
      // the fridge, with a magnet and a drawing
      box(c, b.x + 4, b.y + 10, 16, b.h - 17, P.white, null, P.silver); R(c, b.x + 5, b.y + 30, 14, 1, P.silver); R(c, b.x + 16, b.y + 16, 1, 8, P.slate); R(c, b.x + 16, b.y + 34, 1, 10, P.slate); R(c, b.x + 7, b.y + 14, 3, 3, P.red); R(c, b.x + 7, b.y + 36, 6, 6, P.white); R(c, b.x + 8, b.y + 37, 2, 2, P.yellow); px(c, b.x + 11, b.y + 40, P.blue);
      // upper cabinets, a window with a herb pot
      box(c, b.x + 22, b.y + 5, 30, 15, P.wood, P.sand, P.bark); R(c, b.x + 37, b.y + 6, 1, 13, P.ink); px(c, b.x + 34, b.y + 12, P.yellow); px(c, b.x + 40, b.y + 12, P.yellow);
      win(c, b.x + 56, b.y + 5, 16, 14, sc); plant(c, b.x + 64, b.y + 19);
      // the counter and sink, then the stove with a pot under the hood
      R(c, b.x + 22, b.y + b.h - 31, 36, 3, P.silver); R(c, b.x + 27, b.y + b.h - 31, 12, 2, P.slate); R(c, b.x + 32, b.y + b.h - 38, 1, 7, P.silver); R(c, b.x + 32, b.y + b.h - 38, 4, 1, P.silver);
      box(c, b.x + 22, b.y + b.h - 28, 36, 21, P.wood, P.sand, P.bark); R(c, b.x + 40, b.y + b.h - 26, 1, 17, P.bark); px(c, b.x + 37, b.y + b.h - 20, P.yellow); px(c, b.x + 43, b.y + b.h - 20, P.yellow);
      box(c, b.x + 62, b.y + b.h - 30, 26, 23, '#f6edd8', P.white, P.silver); box(c, b.x + 65, b.y + b.h - 23, 20, 12, P.dark, P.slate); R(c, b.x + 68, b.y + b.h - 19, 14, 1, (sc.f || 0) % 6 < 3 ? P.orange : P.red); R(c, b.x + 62, b.y + b.h - 31, 26, 2, P.ink);
      box(c, b.x + 68, b.y + b.h - 38, 13, 7, P.red, P.pink); R(c, b.x + 66, b.y + b.h - 36, 2, 2, P.ink); R(c, b.x + 81, b.y + b.h - 36, 2, 2, P.ink); // the pot
      R(c, b.x + 62, b.y + 26, 26, 3, P.silver); R(c, b.x + 70, b.y + 22, 10, 4, P.silver); R(c, b.x + 73, b.y + 2, 4, 20, P.silver); // the hood
      [80, 84, 88].forEach(function (u, i) { R(c, b.x + u, b.y + 4, 1, 6, P.dark); R(c, b.x + u - 1, b.y + 10, 3, 3, [P.silver, P.wood, P.orange][i]); }); // hanging spoons
    },
    bedroom: function (c, b, sc) {
      var acc = quilt(sc); stripes(c, b.x, b.y, b.w, b.h, '#d6c6ef', '#c7b2ea', 6, 2); floorBand(c, b, '#a993d6', P.white);
      for (var s = 0; s < 6; s++) { var sx = b.x + 34 + s * 9, sy = b.y + 8 + (s % 2) * 6; px(c, sx, sy, P.yellow); px(c, sx - 1, sy + 1, P.yellow); px(c, sx + 1, sy + 1, P.yellow); px(c, sx, sy + 2, P.yellow); } // glow-in-the-dark stars
      win(c, b.x + 8, b.y + 8, 18, 18, sc); R(c, b.x + 6, b.y + 6, 22, 2, P.white);
      picture(c, b.x + 72, b.y + 22, 14, 11, sc, false);
      // the bed: a headboard, a quilt in his colors, a big pillow (he sleeps with his head at x 43)
      box(c, b.x + 30, b.y + b.h - 36, 6, 29, P.bark, P.wood); disc(c, b.x + 33, b.y + b.h - 37, 3, P.wood); box(c, b.x + 84, b.y + b.h - 24, 5, 17, P.bark, P.wood);
      box(c, b.x + 32, b.y + b.h - 18, 56, 8, P.bark, P.wood); R(c, b.x + 34, b.y + b.h - 10, 2, 3, P.ink); R(c, b.x + 84, b.y + b.h - 10, 2, 3, P.ink);
      box(c, b.x + 35, b.y + b.h - 24, 51, 7, P.white); R(c, b.x + 52, b.y + b.h - 24, 34, 7, acc); for (var q = 54; q < 84; q += 6) { R(c, b.x + q, b.y + b.h - 23, 3, 2, P.white); R(c, b.x + q + 3, b.y + b.h - 21, 3, 2, P.white); } // the quilt
      box(c, b.x + 36, b.y + b.h - 28, 13, 6, P.white);
      // the nightstand, its lamp and a little alarm clock
      box(c, b.x + 12, b.y + b.h - 17, 14, 10, P.wood, P.sand, P.bark); px(c, b.x + 19, b.y + b.h - 12, P.yellow); lamp(c, b.x + 16, b.y + b.h - 33, sc, 14); disc(c, b.x + 23, b.y + b.h - 20, 2, P.red); px(c, b.x + 23, b.y + b.h - 20, P.white);
      rug(c, b.x + 18, b.y + b.h - 3, 12, sc);
    },
    bath: function (c, b, sc) {
      R(c, b.x, b.y, b.w, b.h, P.white); grid(c, b.x, b.y, b.w, 30, '#dce8f0', 6); R(c, b.x, b.y + 30, b.w, b.h - 37, '#8fe3ea'); grid(c, b.x, b.y + 30, b.w, b.h - 37, '#7fd6de', 6); R(c, b.x, b.y + 30, b.w, 1, P.sky);
      tiles(c, b.x, b.y + b.h - 7, b.w, 7, P.white, P.silver, 4); R(c, b.x, b.y + b.h - 7, b.w, 1, P.ink);
      // the clawfoot tub, full of bubbles, with a rubber duck
      R(c, b.x + 4, b.y + b.h - 25, 36, 2, P.ink); box(c, b.x + 4, b.y + b.h - 24, 36, 14, P.white, null, P.silver); R(c, b.x + 6, b.y + b.h - 10, 3, 3, P.yellow); R(c, b.x + 35, b.y + b.h - 10, 3, 3, P.yellow);
      [8, 14, 21, 28].forEach(function (u, i) { disc(c, b.x + u, b.y + b.h - 26, 2 + (i % 2), P.white); px(c, b.x + u - 1, b.y + b.h - 27, P.cyan); });
      R(c, b.x + 39, b.y + b.h - 38, 1, 13, P.silver); R(c, b.x + 36, b.y + b.h - 38, 4, 2, P.silver);
      R(c, b.x + 31, b.y + b.h - 29, 4, 3, P.yellow); px(c, b.x + 34, b.y + b.h - 30, P.yellow); px(c, b.x + 35, b.y + b.h - 29, P.orange); px(c, b.x + 33, b.y + b.h - 30, P.ink);
      // the mirror and the sink, the toothbrush cup, the toilet, the towel
      box(c, b.x + 48, b.y + 8, 16, 18, P.silver); R(c, b.x + 49, b.y + 9, 14, 16, '#c9f3f8'); R(c, b.x + 51, b.y + 11, 3, 8, P.white);
      box(c, b.x + 46, b.y + 34, 20, 4, P.white, null, P.silver); box(c, b.x + 52, b.y + 38, 8, b.h - 45, P.white, null, P.silver); R(c, b.x + 56, b.y + 30, 1, 4, P.silver);
      box(c, b.x + 62, b.y + 29, 4, 5, P.sky); R(c, b.x + 63, b.y + 26, 1, 3, P.red); R(c, b.x + 65, b.y + 27, 1, 2, P.green);
      box(c, b.x + 76, b.y + b.h - 27, 10, 12, P.white, null, P.silver); box(c, b.x + 72, b.y + b.h - 16, 15, 5, P.white); box(c, b.x + 74, b.y + b.h - 12, 10, 5, P.white, null, P.silver);
      R(c, b.x + 72, b.y + 12, 14, 1, P.silver); box(c, b.x + 74, b.y + 13, 10, 13, P.pink, P.white); R(c, b.x + 75, b.y + 22, 8, 1, P.white);
    },
    office: function (c, b, sc) {
      stripes(c, b.x, b.y, b.w, b.h, '#cad9ea', '#bccde2', 8, 1); floorBand(c, b, P.slate, P.silver);
      // the bookshelf
      box(c, b.x + 3, b.y + 6, 16, b.h - 13, P.wood, P.sand, P.bark); for (var s = 0; s < 4; s++) { R(c, b.x + 4, b.y + 18 + s * 13, 14, 1, P.bark); for (var k = 0; k < 4; k++) R(c, b.x + 5 + k * 3, b.y + 10 + s * 13, 2, 8, [P.red, P.blue, P.green, P.yellow, P.plum][(s + k) % 5]); }
      // a space poster, a corkboard, the drone's dock
      box(c, b.x + 24, b.y + 6, 14, 18, P.navy); px(c, b.x + 28, b.y + 10, P.yellow); px(c, b.x + 33, b.y + 14, P.white); disc(c, b.x + 31, b.y + 19, 2, P.orange);
      box(c, b.x + 42, b.y + 8, 18, 12, '#c9a77a'); R(c, b.x + 44, b.y + 10, 5, 4, P.yellow); R(c, b.x + 51, b.y + 11, 5, 5, P.pink); px(c, b.x + 46, b.y + 10, P.red); px(c, b.x + 53, b.y + 11, P.blue);
      R(c, b.x + 66, b.y + 8, 20, 3, P.silver); R(c, b.x + 72, b.y + 5, 8, 3, P.dark); px(c, b.x + 76, b.y + 6, (sc.f || 0) % 10 < 5 ? P.lime : P.green);
      // the desk, the computer, a mug, the chair, a plant
      box(c, b.x + 30, b.y + b.h - 26, 46, 4, P.wood, P.sand); R(c, b.x + 32, b.y + b.h - 22, 2, 15, P.bark); box(c, b.x + 62, b.y + b.h - 22, 12, 15, P.wood, P.sand, P.bark); R(c, b.x + 66, b.y + b.h - 17, 4, 1, P.bark);
      box(c, b.x + 40, b.y + b.h - 44, 24, 17, P.dark); R(c, b.x + 42, b.y + b.h - 42, 20, 13, P.teal); R(c, b.x + 50, b.y + b.h - 27, 4, 1, P.slate); R(c, b.x + 40, b.y + b.h - 28, 16, 1, P.silver);
      box(c, b.x + 68, b.y + b.h - 31, 5, 5, P.white); px(c, b.x + 73, b.y + b.h - 29, P.white);
      box(c, b.x + 22, b.y + b.h - 27, 10, 10, P.red); R(c, b.x + 26, b.y + b.h - 17, 2, 9, P.ink); R(c, b.x + 22, b.y + b.h - 8, 10, 1, P.ink);
      plant(c, b.x + 84, b.y + b.h - 14);
    },
    garage: function (c, b, sc) {
      var acc = sc.accent || P.red; R(c, b.x, b.y, b.w, b.h, '#a9b4c2'); grid(c, b.x, b.y, b.w, b.h - 7, '#9aa6b5', 8); R(c, b.x, b.y + b.h - 7, b.w, 7, P.dark); R(c, b.x, b.y + b.h - 7, b.w, 1, P.ink); ell(c, b.x + 30, b.y + b.h - 3, 7, 1, P.ink);
      // the pegboard and its tools
      box(c, b.x + 4, b.y + 6, 30, 18, '#c9a77a'); for (var t = 0; t < 5; t++) { R(c, b.x + 8 + t * 5, b.y + 9, 1, 11, [P.silver, P.red, P.silver, P.yellow, P.blue][t]); R(c, b.x + 7 + t * 5, b.y + 9, 3, 2, P.dark); }
      // the little car
      box(c, b.x + 6, b.y + b.h - 22, 46, 12, acc, null, P.plum); R(c, b.x + 14, b.y + b.h - 31, 28, 10, P.ink); R(c, b.x + 15, b.y + b.h - 30, 26, 9, acc); R(c, b.x + 17, b.y + b.h - 29, 9, 6, P.sky); R(c, b.x + 29, b.y + b.h - 29, 10, 6, P.sky); R(c, b.x + 18, b.y + b.h - 28, 2, 3, P.white);
      R(c, b.x + 48, b.y + b.h - 19, 4, 3, P.yellow); R(c, b.x + 6, b.y + b.h - 19, 3, 3, P.red);
      [15, 43].forEach(function (u) { disc(c, b.x + u, b.y + b.h - 10, 5, P.ink); disc(c, b.x + u, b.y + b.h - 10, 3, P.slate); px(c, b.x + u, b.y + b.h - 10, P.silver); });
      // the weight rack, a barbell, a bench, the roll-up door
      R(c, b.x + 66, b.y + b.h - 32, 2, 25, P.ink); R(c, b.x + 86, b.y + b.h - 32, 2, 25, P.ink); R(c, b.x + 64, b.y + b.h - 30, 26, 2, P.silver); disc(c, b.x + 65, b.y + b.h - 29, 4, P.ink); disc(c, b.x + 89, b.y + b.h - 29, 4, P.ink);
      box(c, b.x + 70, b.y + b.h - 14, 14, 4, P.dark); R(c, b.x + 72, b.y + b.h - 10, 2, 3, P.ink); R(c, b.x + 80, b.y + b.h - 10, 2, 3, P.ink);
      box(c, b.x + 56, b.y + 4, 32, 18, P.slate, P.silver); for (var d = 0; d < 5; d++) R(c, b.x + 57, b.y + 7 + d * 3, 30, 1, P.dark);
    },
    greenhouse: function (c, b, sc) {
      R(c, b.x, b.y, b.w, b.h, '#1f3b33'); grid(c, b.x, b.y, b.w, b.h, '#27493f', 8); R(c, b.x, b.y + b.h - 7, b.w, 7, P.dark); R(c, b.x, b.y + b.h - 7, b.w, 1, P.ink);
      var glow = (sc.f || 0) % 30 < 15; // the LED grow bars: pink and white light
      [4, 48].forEach(function (u) { R(c, b.x + u, b.y + 4, 40, 3, P.ink); R(c, b.x + u + 1, b.y + 5, 38, 1, glow ? '#ff7ad9' : '#f5a3e4'); c.globalAlpha = 0.12; R(c, b.x + u, b.y + 7, 40, 32, '#ff7ad9'); c.globalAlpha = 1; });
      // two hydroponic racks: white tubes, leafy greens on top, roots in the water
      [10, 22].forEach(function (yy, j) { R(c, b.x + 4, b.y + yy + 14, 40, 4, P.white); R(c, b.x + 4, b.y + yy + 18, 40, 1, P.silver); for (var p = 0; p < 5; p++) { var x0 = b.x + 8 + p * 8; ell(c, x0, b.y + yy + 11, 3, 3, j ? P.lime : P.green); px(c, x0 - 1, b.y + yy + 9, P.lime); R(c, x0, b.y + yy + 19, 1, 2, P.sand); } });
      R(c, b.x + 4, b.y + 24, 1, b.h - 31, P.silver); R(c, b.x + 43, b.y + 24, 1, b.h - 31, P.silver);
      // the water tank and its pump, a pipe up to the racks
      box(c, b.x + 50, b.y + b.h - 26, 18, 19, P.sky); R(c, b.x + 51, b.y + b.h - 18, 16, 10, P.blue); R(c, b.x + 58, b.y + 30, 2, b.h - 56, P.silver); R(c, b.x + 44, b.y + 30, 16, 2, P.silver);
      var bub = (sc.f || 0) % 12; px(c, b.x + 55, b.y + b.h - 10 - (bub % 6), P.white); px(c, b.x + 62, b.y + b.h - 12 - ((bub + 3) % 6), P.white);
      // a tall potted monstera, a yoga mat
      box(c, b.x + 74, b.y + b.h - 18, 12, 11, P.orange, P.yellow); for (var lf = 0; lf < 6; lf++) ell(c, b.x + 75 + lf * 2, b.y + b.h - 24 - (lf % 3) * 5, 3, 2, lf % 2 ? P.lime : P.green);
      R(c, b.x + 6, b.y + b.h - 9, 34, 2, P.pink); R(c, b.x + 6, b.y + b.h - 9, 34, 1, '#ffc6d6');
    },
    library: function (c, b, sc) {
      planks(c, b.x, b.y, b.w, b.h - 7, '#8a5634', '#734429'); floorBand(c, b, '#6b3f2a', P.ink); R(c, b.x, b.y + b.h - 6, b.w, 2, P.plum);
      // two tall bookshelves, full
      [3, 23].forEach(function (u) { box(c, b.x + u, b.y + 4, 19, b.h - 11, P.bark, P.wood); for (var s = 0; s < 5; s++) { R(c, b.x + u + 1, b.y + 16 + s * 11, 17, 1, P.ink); for (var k = 0; k < 5; k++) R(c, b.x + u + 2 + k * 3, b.y + 8 + s * 11 + (k % 3 === 0 ? 1 : 0), 2, 8 - (k % 3 === 0 ? 1 : 0), [P.red, P.blue, P.green, P.yellow, P.plum, P.teal, P.orange][(s * 3 + k + u) % 7]); } });
      // a little ladder, a globe, a framed map, the reading chair and a lamp
      R(c, b.x + 43, b.y + 8, 1, b.h - 15, P.wood); R(c, b.x + 48, b.y + 8, 1, b.h - 15, P.wood); for (var l = 12; l < b.h - 8; l += 7) R(c, b.x + 43, b.y + l, 6, 1, P.wood);
      disc(c, b.x + 57, b.y + 16, 6, P.ink); disc(c, b.x + 57, b.y + 16, 5, P.sky); R(c, b.x + 54, b.y + 13, 4, 3, P.green); R(c, b.x + 57, b.y + 17, 3, 2, P.green); R(c, b.x + 56, b.y + 23, 3, 4, P.bark); R(c, b.x + 53, b.y + 27, 9, 2, P.bark);
      R(c, b.x + 66, b.y + 8, 20, 12, P.ink); R(c, b.x + 67, b.y + 9, 18, 10, '#e8dcc0'); R(c, b.x + 69, b.y + 11, 9, 1, P.slate); R(c, b.x + 69, b.y + 14, 13, 1, P.slate); px(c, b.x + 80, b.y + 11, P.red);
      box(c, b.x + 56, b.y + b.h - 22, 22, 9, P.green, P.lime, P.teal); box(c, b.x + 56, b.y + b.h - 36, 6, 23, P.green); box(c, b.x + 72, b.y + b.h - 30, 6, 17, P.green); R(c, b.x + 58, b.y + b.h - 13, 2, 6, P.bark); R(c, b.x + 74, b.y + b.h - 13, 2, 6, P.bark);
      lamp(c, b.x + 86, b.y + b.h - 40, sc, 33);
    },
    music: function (c, b, sc) {
      R(c, b.x, b.y, b.w, b.h, '#5d4a7a'); for (var j = 0; j < b.h - 8; j += 6) for (var i = (j / 6 % 2) * 3; i < b.w; i += 6) R(c, b.x + i, b.y + j, 3, 3, '#6e5a8c'); // foam on the walls
      floorBand(c, b, P.wood, P.bark); rug(c, b.x + 50, b.y + b.h - 4, 18, sc);
      // the upright piano
      box(c, b.x + 4, b.y + b.h - 36, 30, 29, P.ink); R(c, b.x + 5, b.y + b.h - 35, 28, 27, '#3a2433'); R(c, b.x + 5, b.y + b.h - 22, 28, 4, P.white); for (var k = 7; k < 33; k += 3) R(c, b.x + k, b.y + b.h - 22, 1, 2, P.ink); R(c, b.x + 10, b.y + b.h - 32, 16, 6, '#e8dcc0'); R(c, b.x + 12, b.y + b.h - 30, 12, 1, P.ink); R(c, b.x + 12, b.y + b.h - 28, 9, 1, P.ink);
      // a speaker, a poster, a guitar on its stand, a drum
      box(c, b.x + 40, b.y + 8, 12, 18, P.dark); disc(c, b.x + 46, b.y + 13, 2, P.slate); disc(c, b.x + 46, b.y + 21, 3, P.slate);
      box(c, b.x + 58, b.y + 8, 18, 14, P.yellow); spr(c, b.x + 63, b.y + 10, ['..kk', '..k.', '..k.', 'kkk.', 'kk..']);
      R(c, b.x + 72, b.y + b.h - 14, 1, 7, P.ink); R(c, b.x + 76, b.y + b.h - 14, 1, 7, P.ink); ell(c, b.x + 74, b.y + b.h - 18, 5, 5, P.orange); disc(c, b.x + 74, b.y + b.h - 18, 1, P.ink); R(c, b.x + 74, b.y + b.h - 36, 1, 14, P.bark); R(c, b.x + 73, b.y + b.h - 38, 3, 3, P.ink);
      box(c, b.x + 80, b.y + b.h - 18, 10, 11, P.red, P.white); R(c, b.x + 80, b.y + b.h - 14, 10, 1, P.white);
    },
    studio: function (c, b, sc) {
      R(c, b.x, b.y, b.w, b.h, '#f6f3ea'); [[10, 14, P.red], [36, 44, P.blue], [62, 30, P.yellow], [48, 52, P.green], [86, 40, P.pink]].forEach(function (s) { disc(c, b.x + s[0], b.y + s[1], 2, s[2]); px(c, b.x + s[0] + 3, b.y + s[1] + 2, s[2]); }); // paint splatters
      floorBand(c, b, '#d9c7a8', P.wood); [[20, P.blue], [44, P.red], [70, P.yellow]].forEach(function (s) { ell(c, b.x + s[0], b.y + b.h - 3, 3, 1, s[1]); });
      win(c, b.x + 68, b.y + 6, 18, 16, sc);
      // the easel and its canvas (the painting fills in as he paints)
      line(c, b.x + 12, b.y + b.h - 7, b.x + 20, b.y + 18, P.bark); line(c, b.x + 30, b.y + b.h - 7, b.x + 22, b.y + 18, P.bark); R(c, b.x + 20, b.y + 18, 2, b.h - 25, P.bark);
      box(c, b.x + 10, b.y + 20, 22, 20, P.white); R(c, b.x + 9, b.y + 40, 24, 2, P.bark);
      // a shelf of pots, the pottery wheel, paint cans
      R(c, b.x + 38, b.y + 28, 24, 2, P.bark); [[42, P.orange], [50, '#c9845a'], [57, P.sky]].forEach(function (s) { ell(c, b.x + s[0], b.y + 25, 3, 3, s[1]); R(c, b.x + s[0] - 1, b.y + 21, 3, 2, s[1]); });
      box(c, b.x + 50, b.y + b.h - 16, 16, 9, P.slate, P.silver); ell(c, b.x + 58, b.y + b.h - 17, 7, 2, P.dark);
      [[74, P.red], [82, P.blue]].forEach(function (s) { box(c, b.x + s[0], b.y + b.h - 15, 7, 8, P.silver); R(c, b.x + s[0] + 1, b.y + b.h - 14, 5, 2, s[1]); });
    },
    lab: function (c, b, sc) {
      R(c, b.x, b.y, b.w, b.h, '#eef3f8'); grid(c, b.x, b.y, b.w, b.h - 7, '#d6e0ea', 6); floorBand(c, b, P.silver, P.white);
      // the whiteboard, the bench with flasks and a microscope, the 3D printer
      box(c, b.x + 6, b.y + 6, 34, 18, P.white); R(c, b.x + 9, b.y + 10, 14, 1, P.blue); R(c, b.x + 9, b.y + 14, 20, 1, P.red); R(c, b.x + 9, b.y + 18, 10, 1, P.blue); spr(c, b.x + 30, b.y + 9, ['.b.', 'bbb', '.b.']);
      box(c, b.x + 4, b.y + b.h - 26, 52, 4, P.white, null, P.silver); R(c, b.x + 6, b.y + b.h - 22, 2, 15, P.slate); R(c, b.x + 52, b.y + b.h - 22, 2, 15, P.slate); box(c, b.x + 8, b.y + b.h - 18, 18, 11, P.silver, P.white); R(c, b.x + 16, b.y + b.h - 14, 3, 1, P.slate);
      [[8, P.lime], [15, P.pink], [22, P.cyan]].forEach(function (q) { R(c, b.x + q[0] + 1, b.y + b.h - 36, 2, 4, P.white); box(c, b.x + q[0], b.y + b.h - 33, 5, 7, P.white); R(c, b.x + q[0] + 1, b.y + b.h - 30, 3, 3, q[1]); });
      R(c, b.x + 44, b.y + b.h - 40, 2, 14, P.dark); R(c, b.x + 40, b.y + b.h - 28, 10, 2, P.dark); R(c, b.x + 45, b.y + b.h - 42, 5, 3, P.dark); disc(c, b.x + 45, b.y + b.h - 32, 2, P.silver);
      box(c, b.x + 62, b.y + b.h - 40, 26, 33, P.dark, P.slate); R(c, b.x + 64, b.y + b.h - 37, 22, 24, P.navy); R(c, b.x + 64, b.y + b.h - 13, 22, 3, P.slate); R(c, b.x + 66, b.y + b.h - 39, 18, 2, P.orange);
    },
    stable: function (c, b, sc) {
      planks(c, b.x, b.y, b.w, b.h - 7, P.wood, P.bark); R(c, b.x, b.y + b.h - 8, b.w, 8, '#e8c46a'); for (var i = 0; i < b.w; i += 2) px(c, b.x + i, b.y + b.h - 9 - (i % 3), '#e8c46a');
      // the stall gate, a lantern, a saddle, hay bales, a water trough
      R(c, b.x + 50, b.y + b.h - 30, 40, 3, P.bark); R(c, b.x + 50, b.y + b.h - 20, 40, 3, P.bark); R(c, b.x + 50, b.y + b.h - 32, 3, 24, P.bark); R(c, b.x + 87, b.y + b.h - 32, 3, 24, P.bark); line(c, b.x + 52, b.y + b.h - 29, b.x + 88, b.y + b.h - 18, P.bark);
      R(c, b.x + 30, b.y + 6, 1, 6, P.ink); box(c, b.x + 27, b.y + 12, 8, 9, P.dark); R(c, b.x + 29, b.y + 14, 4, 5, sc.phase === 'day' ? P.sand : P.yellow);
      ell(c, b.x + 68, b.y + 16, 8, 4, P.bark); R(c, b.x + 62, b.y + 18, 12, 2, P.bark); R(c, b.x + 68, b.y + 8, 1, 4, P.ink); px(c, b.x + 66, b.y + 14, P.sand);
      box(c, b.x + 4, b.y + b.h - 22, 20, 14, '#e8c46a', P.yellow, P.orange); R(c, b.x + 4, b.y + b.h - 17, 20, 1, P.orange); box(c, b.x + 8, b.y + b.h - 32, 16, 11, '#e8c46a', P.yellow, P.orange);
      box(c, b.x + 28, b.y + b.h - 15, 16, 7, P.slate, P.silver); R(c, b.x + 29, b.y + b.h - 14, 14, 2, P.sky);
    }
  };
  CS.ROOMART = ROOMART;

  /* ---------- Aiu himself: his own little animations in each room ---------- */
  function drawAiu(c, sc, cr, x, fy, o) { // his creature picture with feet at (x, fy). o: { flip, dy, eyes, shadow, noHat }
    o = o || {}; var f = sc.f || 0;
    var eyes = o.eyes || (f % 37 === 0 ? 'blink' : 'open'); if (sc.pat && eyes !== 'sleep') eyes = 'happy';
    var tired = sc.stressed && eyes !== 'sleep'; if (tired && eyes === 'open' && f % 30 < 4) eyes = 'blink';
    var fr = cr.frames[eyes] || cr.frames.open, dx = Math.round(x - cr.w / 2), dy = Math.round(fy - (cr.bottom + 1) + (o.dy || 0) + (tired ? 1 : 0));
    if (cr.float && eyes !== 'sleep') dy -= cr.float + (Math.floor(f / 6) % 2);
    if (o.shadow !== false) ell(c, Math.round(x), Math.round(fy), Math.max(3, Math.round(cr.bw / 2) - 1), 1, 'rgba(26,28,44,0.35)');
    if (o.flip) { c.save(); c.translate(dx + cr.w, dy); c.scale(-1, 1); c.drawImage(fr, 0, 0); c.restore(); } else c.drawImage(fr, dx, dy);
    var cs = sc.cos || {}, hx = o.flip ? dx + cr.w - cr.crownX : dx + cr.crownX, hat = (sc.shop || {}).hat || cs.hat;
    if (hat && eyes !== 'sleep' && !o.noHat) c.drawImage(hat.img, Math.round(hx - hat.img.width / 2), dy + cr.crownY - hat.img.height + 2);
    if (cs.face && eyes !== 'sleep') c.drawImage(cs.face.img, Math.round(hx - cs.face.img.width / 2), dy + cr.eyeY + (cs.face.dy || 0));
    if (sc.justHatched && eyes !== 'sleep') spr(c, Math.round(hx) - 3, dy + cr.top - 3, ['w.w.w.', 'wwwwww']);
    if (tired && f % 40 < 24) px(c, Math.round(hx) + 5, dy + cr.head + Math.floor((f % 40) / 8), P.sky);
    return { x: dx, y: dy, hx: Math.round(hx), top: dy + cr.head, w: cr.w };
  }
  CS.drawAiu = drawAiu;
  function note(c, x, y, f) { var k = f % 16; if (k > 12) return; spr(c, x + (k % 4 < 2 ? 0 : 1), y - k, ['.kk', '.k.', 'kk.']); }
  function steam(c, x, y, f) { for (var i = 0; i < 3; i++) { var k = (f + i * 5) % 15; c.globalAlpha = 1 - k / 15; px(c, x + (i - 1) * 3 + (k % 6 < 3 ? 0 : 1), y - k, P.white); } c.globalAlpha = 1; }
  function zzz(c, x, y, f) { var k = f % 24; if (k < 16) spr(c, x + Math.floor(k / 4), y - Math.floor(k / 2), ['www', '.w.', 'www']); if (k >= 8 && k < 22) px(c, x + 6, y - 8 - Math.floor((k - 8) / 2), P.white); }
  function book(c, x, y, f, col) { box(c, x - 5, y, 10, 7, (f % 40) < 2 ? P.white : col); R(c, x, y + 1, 1, 5, P.white); }
  // each one: where he stands in the room (from its left edge), what the status line says, the room, and how it's drawn (b = the room)
  var FL = function (b) { return b.y + b.h - 7; }; // the floor line
  var ANIM = {
    couch: { x: 22, label: 'relaxing on the couch', room: 'living', draw: function (c, b, sc, cr, f) { var p = drawAiu(c, sc, cr, b.x + 22, b.y + b.h - 20, { eyes: f % 50 < 3 ? 'blink' : 'happy', shadow: false }); if (f % 60 < 24) note(c, p.hx + 7, p.top, f); } },
    tv: { x: 22, label: 'watching TV', room: 'living', draw: function (c, b, sc, cr, f) { var tv = [P.sky, P.lime, P.pink, P.yellow][Math.floor(f / 6) % 4]; R(c, b.x + 63, b.y + b.h - 32, 22, 13, tv); R(c, b.x + 66 + (f % 8), b.y + b.h - 28, 6, 5, P.white); c.globalAlpha = 0.12; R(c, b.x + 8, b.y + b.h - 44, 80, 40, tv); c.globalAlpha = 1; drawAiu(c, sc, cr, b.x + 22, b.y + b.h - 20, { shadow: false, eyes: f % 40 < 2 ? 'blink' : 'open' }); } },
    fishtank: { x: 64, label: 'feeding the fish', room: 'living', draw: function (c, b, sc, cr, f) { var k = f % 20; R(c, b.x + 60 + (k % 12), b.y + 16, 2, 1, P.orange); px(c, b.x + 70 - (k % 9), b.y + 18, P.yellow); if (k < 10) px(c, b.x + 66, b.y + 12 + Math.floor(k / 2), P.sand); drawAiu(c, sc, cr, b.x + 64, FL(b), { dy: k < 2 ? -1 : 0 }); } },
    read: { x: 22, label: 'reading on the couch', room: 'living', draw: function (c, b, sc, cr, f) { var p = drawAiu(c, sc, cr, b.x + 22, b.y + b.h - 20, { shadow: false }); book(c, p.hx, b.y + b.h - 28, f, P.blue); } },
    knit: { x: 22, label: 'knitting', room: 'living', draw: function (c, b, sc, cr, f) { var p = drawAiu(c, sc, cr, b.x + 22, b.y + b.h - 20, { shadow: false }), w0 = f % 4 < 2 ? 0 : 1; line(c, p.hx - 5, b.y + b.h - 28 + w0, p.hx + 2, b.y + b.h - 23, P.silver); line(c, p.hx + 5, b.y + b.h - 28 - w0, p.hx - 2, b.y + b.h - 23, P.silver); R(c, p.hx - 3, b.y + b.h - 24, 6, 3, P.pink); disc(c, b.x + 44, FL(b) - 3, 3, P.pink); line(c, b.x + 41, FL(b) - 4, p.hx, b.y + b.h - 23, P.pink); } },
    puzzle: { x: 50, label: 'doing a jigsaw puzzle', room: 'living', draw: function (c, b, sc, cr, f) { box(c, b.x + 40, FL(b) - 6, 22, 3, P.wood); R(c, b.x + 42, FL(b) - 3, 2, 3, P.bark); R(c, b.x + 58, FL(b) - 3, 2, 3, P.bark); [[42, P.red], [47, P.blue], [52, P.green], [57, P.yellow]].forEach(function (q, i) { if (i <= Math.floor(f / 12) % 5) R(c, b.x + q[0], FL(b) - 8, 4, 2, q[1]); }); drawAiu(c, sc, cr, b.x + 50, FL(b), { dy: f % 16 < 8 ? 0 : 1 }); } },
    bubbles: { x: 50, label: 'blowing bubbles', room: 'living', draw: function (c, b, sc, cr, f) { var p = drawAiu(c, sc, cr, b.x + 50, FL(b), { eyes: 'happy' }); for (var i = 0; i < 4; i++) { var k = (f + i * 7) % 28; disc(c, p.hx + 7 + i * 3 + (k % 6 < 3 ? 0 : 1), p.top - k, 1 + (i % 2), P.white); px(c, p.hx + 7 + i * 3, p.top - k - 1, P.cyan); } } },
    sweep: { x: 50, label: 'tidying up', room: 'living', draw: function (c, b, sc, cr, f) { var sw = Math.round(Math.sin(f / 3) * 3), p = drawAiu(c, sc, cr, b.x + 50 + sw, FL(b), { flip: sw < 0 }); line(c, p.hx + 4, p.top + 6, p.hx + 10 + sw, FL(b) - 1, P.wood); R(c, p.hx + 8 + sw, FL(b) - 2, 6, 2, P.yellow); if (f % 6 < 3) px(c, p.hx + 15 + sw, FL(b) - 4, P.silver); } },
    ball: { x: 50, label: 'playing with a ball', room: 'living', draw: function (c, b, sc, cr, f) { var k = f % 14, by = Math.round(Math.abs(Math.sin(k / 14 * Math.PI)) * 18), p = drawAiu(c, sc, cr, b.x + 50, FL(b), { dy: k < 2 ? -2 : 0, eyes: 'happy' }); disc(c, p.hx + 11, FL(b) - 3 - by, 3, P.red); px(c, p.hx + 10, FL(b) - 5 - by, P.white); } },
    look: { x: 50, label: 'just hatched, looking around', room: 'living', draw: function (c, b, sc, cr, f) { drawAiu(c, sc, cr, b.x + 50, FL(b), { flip: Math.floor(f / 12) % 2 === 1, dy: f % 24 < 3 ? -2 : 0, eyes: f % 40 < 3 ? 'blink' : 'happy' }); } },
    window: { x: 17, label: 'looking out the window', room: 'living', draw: function (c, b, sc, cr, f) { drawAiu(c, sc, cr, b.x + 17, FL(b), { flip: true }); if (f % 30 < 4) px(c, b.x + 12, b.y + 12, P.yellow); } },
    stir: { x: 74, label: 'cooking at the stove', room: 'kitchen', draw: function (c, b, sc, cr, f) { var p = drawAiu(c, sc, cr, b.x + 74, FL(b), { flip: f % 16 < 8 }); line(c, b.x + 75, b.y + b.h - 44, b.x + 76 + (f % 4 < 2 ? 0 : 2), b.y + b.h - 37, P.wood); steam(c, b.x + 74, b.y + b.h - 40, f); if (f % 24 < 6) px(c, p.hx - 6, p.top - 2, P.white); } },
    chop: { x: 40, label: 'chopping vegetables', room: 'kitchen', draw: function (c, b, sc, cr, f) { box(c, b.x + 30, b.y + b.h - 34, 18, 3, P.wood, P.sand); [[32, P.orange], [36, P.green], [40, P.red]].forEach(function (q) { R(c, b.x + q[0], b.y + b.h - 36, 3, 2, q[1]); }); drawAiu(c, sc, cr, b.x + 40, FL(b)); var up = f % 4 < 2; R(c, b.x + 45, b.y + b.h - (up ? 43 : 38), 1, 5, P.silver); R(c, b.x + 45, b.y + b.h - (up ? 38 : 33), 1, 2, P.bark); } },
    tea: { x: 74, label: 'making tea', room: 'kitchen', draw: function (c, b, sc, cr, f) { box(c, b.x + 68, b.y + b.h - 39, 10, 8, P.sky); R(c, b.x + 78, b.y + b.h - 37, 3, 2, P.sky); R(c, b.x + 70, b.y + b.h - 41, 6, 2, P.sky); steam(c, b.x + 72, b.y + b.h - 42, f); drawAiu(c, sc, cr, b.x + 74, FL(b), { eyes: f % 30 < 15 ? 'happy' : 'open' }); } },
    dishes: { x: 32, label: 'washing the dishes', room: 'kitchen', draw: function (c, b, sc, cr, f) { drawAiu(c, sc, cr, b.x + 32, FL(b)); for (var i = 0; i < 3; i++) { var k = (f + i * 5) % 12; disc(c, b.x + 28 + i * 4, b.y + b.h - 33 - k, 1, P.white); } disc(c, b.x + 28 + (f % 6 < 3 ? 0 : 2), b.y + b.h - 32, 3, P.white); disc(c, b.x + 28 + (f % 6 < 3 ? 0 : 2), b.y + b.h - 32, 1, P.sky); } },
    eat: { x: 40, label: 'having a snack', room: 'kitchen', draw: function (c, b, sc, cr, f) { box(c, b.x + 32, b.y + b.h - 34, 16, 3, P.white); disc(c, b.x + 39, b.y + b.h - 36, 3, f % 20 < 10 ? P.orange : P.yellow); drawAiu(c, sc, cr, b.x + 40, FL(b), { eyes: f % 10 < 5 ? 'happy' : 'open', dy: f % 10 < 5 ? 0 : -1 }); if (f % 10 < 3) px(c, b.x + 45, b.y + b.h - 30, P.sand); } },
    sleep: { x: 43, label: 'sleeping', room: 'bedroom', draw: function (c, b, sc, cr, f) { var acc = quilt(sc), y0 = b.y + b.h - 26; drawAiu(c, sc, cr, b.x + 43, b.y + b.h - 20, { eyes: 'sleep', shadow: false, noHat: true, dy: f % 32 < 16 ? 0 : 1 }); R(c, b.x + 35, y0, 51, 1, P.ink); R(c, b.x + 35, y0 + 1, 51, 8, acc); for (var q = 37; q < 84; q += 6) { R(c, b.x + q, y0 + 2, 3, 2, P.white); R(c, b.x + q + 3, y0 + 4, 3, 2, P.white); } R(c, b.x + 35, y0 + 1, 51, 1, P.white); zzz(c, b.x + 52, b.y + b.h - 44, f); } },
    brush: { x: 56, label: 'brushing his teeth', room: 'bath', draw: function (c, b, sc, cr, f) { var p = drawAiu(c, sc, cr, b.x + 56, FL(b)), bx = p.hx + 3 + (f % 4 < 2 ? 0 : 1), my = p.y + cr.eyeY + 5; R(c, bx, my, 6, 1, P.red); R(c, bx - 1, my - 1, 2, 1, P.white); if (f % 8 < 4) { px(c, bx - 2, my + 1, P.white); px(c, bx + 1, my - 2, P.white); } } },
    potty: { x: 79, label: 'in the bathroom', room: 'bath', draw: function (c, b, sc, cr, f) { var v = app().visit, sit = v && v.phase === 'in'; drawAiu(c, sc, cr, b.x + 79, b.y + b.h - (sit ? 13 : 7), { shadow: !sit, eyes: sit ? (f % 30 < 15 ? 'sleep' : 'happy') : null }); if (sit) { box(c, b.x + 72, b.y + b.h - 16, 15, 5, P.white); if (f % 20 < 10) spr(c, b.x + 66, b.y + b.h - 44, ['.yy.', 'y..y', '...y', '..y.', '....', '..y.']); } } },
    soak: { x: 22, label: 'soaking in the tub', room: 'bath', draw: function (c, b, sc, cr, f) { c.save(); c.beginPath(); c.rect(b.x, b.y, b.w, b.h - 25); c.clip(); drawAiu(c, sc, cr, b.x + 22, b.y + b.h - 12, { eyes: f % 40 < 26 ? 'happy' : 'sleep', shadow: false, noHat: true }); c.restore(); for (var i = 0; i < 5; i++) { var k = (f + i * 6) % 30; disc(c, b.x + 10 + i * 6, b.y + b.h - 27 - Math.floor(k / 2), 1, P.white); } } },
    laundry: { x: 40, label: 'folding the laundry', room: 'bath', draw: function (c, b, sc, cr, f) { box(c, b.x + 22, FL(b) - 6, 12, 6, P.sky); R(c, b.x + 24, FL(b) - 8, 4, 2, P.pink); R(c, b.x + 28, FL(b) - 8, 4, 2, P.yellow); var p = drawAiu(c, sc, cr, b.x + 42, FL(b)), up = f % 12 < 6; box(c, p.hx + 4, p.top + (up ? 2 : 8), 9, 5, [P.pink, P.sky, P.yellow][Math.floor(f / 12) % 3]); } },
    game: { x: 52, label: 'playing video games', room: 'office', draw: function (c, b, sc, cr, f) { var col = [P.lime, P.pink, P.yellow, P.cyan][Math.floor(f / 4) % 4]; R(c, b.x + 42, b.y + b.h - 42, 20, 13, P.navy); R(c, b.x + 44 + (f * 2) % 14, b.y + b.h - 36, 3, 3, col); R(c, b.x + 44, b.y + b.h - 32, 16, 1, P.green); drawAiu(c, sc, cr, b.x + 52, FL(b), { flip: true, dy: f % 6 < 3 ? 0 : -1, eyes: f % 20 < 10 ? 'happy' : 'open' }); R(c, b.x + 44, b.y + b.h - 22, 8, 3, P.dark); px(c, b.x + 45, b.y + b.h - 21, P.red); px(c, b.x + 50, b.y + b.h - 21, P.lime); } },
    type: { x: 52, label: 'working on the computer', room: 'office', draw: function (c, b, sc, cr, f) { var n = Math.floor(f / 3) % 6; for (var i = 0; i < n; i++) R(c, b.x + 44, b.y + b.h - 41 + i * 2, 4 + ((i * 7) % 12), 1, P.cyan); drawAiu(c, sc, cr, b.x + 52, FL(b), { flip: true }); if (f % 4 < 2) px(c, b.x + 45, b.y + b.h - 28, P.white); } },
    write: { x: 52, label: 'writing in his journal', room: 'office', draw: function (c, b, sc, cr, f) { box(c, b.x + 40, b.y + b.h - 29, 12, 3, P.white); drawAiu(c, sc, cr, b.x + 52, FL(b), { flip: true }); line(c, b.x + 42 + (f % 6), b.y + b.h - 31, b.x + 44 + (f % 6), b.y + b.h - 35, P.ink); } },
    lift: { x: 76, label: 'working out', room: 'garage', draw: function (c, b, sc, cr, f) { var up = f % 8 < 4, p = drawAiu(c, sc, cr, b.x + 77, FL(b), { dy: up ? -1 : 0, eyes: up ? 'happy' : 'open' }), by = p.top - (up ? 5 : -2); R(c, p.hx - 11, by, 23, 2, P.silver); disc(c, p.hx - 11, by + 1, 3, P.ink); disc(c, p.hx + 11, by + 1, 3, P.ink); if (!up && f % 16 < 8) px(c, p.hx + 6, p.top + 2, P.sky); } },
    hammer: { x: 66, label: 'building a birdhouse', room: 'garage', draw: function (c, b, sc, cr, f) { box(c, b.x + 54, FL(b) - 9, 12, 9, P.wood, P.sand); tri(c, b.x + 60, FL(b) - 15, 6, 1, P.red); disc(c, b.x + 60, FL(b) - 5, 1, P.ink); drawAiu(c, sc, cr, b.x + 72, FL(b), { flip: true }); var up = f % 6 < 3; R(c, b.x + 66, FL(b) - (up ? 20 : 13), 1, 6, P.bark); R(c, b.x + 64, FL(b) - (up ? 20 : 13), 5, 2, P.slate); if (!up) px(c, b.x + 65, FL(b) - 10, P.yellow); } },
    fixcar: { x: 60, label: 'fixing up the car', room: 'garage', draw: function (c, b, sc, cr, f) { drawAiu(c, sc, cr, b.x + 60, FL(b), { flip: true }); var w0 = f % 6 < 3 ? 0 : 2; R(c, b.x + 50, b.y + b.h - 20 + w0, 5, 2, P.silver); if (f % 10 < 2) px(c, b.x + 49, b.y + b.h - 22, P.yellow); } },
    water: { x: 30, label: 'watering the hydroponics', room: 'greenhouse', draw: function (c, b, sc, cr, f) { var p = drawAiu(c, sc, cr, b.x + 32, FL(b), { flip: true }); box(c, p.hx - 15, p.top + 2, 8, 6, P.sky); line(c, p.hx - 15, p.top + 3, p.hx - 20, p.top - 1, P.sky); for (var i = 0; i < 3; i++) { var k = (f + i * 3) % 9; px(c, p.hx - 21 - i, p.top + k, P.cyan); } } },
    yoga: { x: 22, label: 'doing yoga', room: 'greenhouse', draw: function (c, b, sc, cr, f) { var ph = Math.floor(f / 16) % 3; drawAiu(c, sc, cr, b.x + 22, b.y + b.h - 9, { dy: ph === 1 ? -3 : 0, flip: ph === 2, eyes: 'sleep' }); if (ph === 1) { px(c, b.x + 12, b.y + b.h - 30, P.white); px(c, b.x + 32, b.y + b.h - 30, P.white); } } },
    tend: { x: 68, label: 'checking on the plants', room: 'greenhouse', draw: function (c, b, sc, cr, f) { drawAiu(c, sc, cr, b.x + 68, FL(b), { dy: f % 20 < 10 ? 0 : 1 }); if (f % 30 < 10) spr(c, b.x + 72, b.y + b.h - 44, ['.l.', 'lgl', '.g.']); } },
    readlib: { x: 67, label: 'reading in the library', room: 'library', draw: function (c, b, sc, cr, f) { var p = drawAiu(c, sc, cr, b.x + 67, b.y + b.h - 15, { shadow: false }); book(c, p.hx, b.y + b.h - 25, f, P.red); } },
    writelib: { x: 67, label: 'writing in his journal', room: 'library', draw: function (c, b, sc, cr, f) { var p = drawAiu(c, sc, cr, b.x + 67, b.y + b.h - 15, { shadow: false }); box(c, p.hx - 6, b.y + b.h - 25, 12, 6, P.white); R(c, p.hx - 4, b.y + b.h - 23, 4, 1, P.slate); line(c, p.hx - 3 + (f % 6), b.y + b.h - 23, p.hx - 1 + (f % 6), b.y + b.h - 27, P.ink); } },
    browse: { x: 34, label: 'looking for a book', room: 'library', draw: function (c, b, sc, cr, f) { var side = Math.floor(f / 20) % 2, p = drawAiu(c, sc, cr, b.x + 14 + side * 20, FL(b), { flip: side === 1, dy: f % 20 < 4 ? -2 : 0 }); if (f % 40 > 30) R(c, p.hx - 1, p.top - 6, 3, 6, P.blue); } },
    guitar: { x: 50, label: 'playing guitar', room: 'music', draw: function (c, b, sc, cr, f) { var p = drawAiu(c, sc, cr, b.x + 50, FL(b), { dy: f % 8 < 4 ? 0 : -1, eyes: 'happy' }); ell(c, p.hx + 2, FL(b) - 9, 4, 3, P.orange); disc(c, p.hx + 2, FL(b) - 9, 1, P.ink); line(c, p.hx + 4, FL(b) - 10, p.hx + 13, FL(b) - 19, P.bark); note(c, p.hx + 9, p.top - 2, f); note(c, p.hx - 11, p.top - 6, f + 8); } },
    piano: { x: 22, label: 'playing the piano', room: 'music', draw: function (c, b, sc, cr, f) { var p = drawAiu(c, sc, cr, b.x + 20, FL(b), { flip: true, dy: f % 6 < 3 ? 0 : -1 }); R(c, b.x + 8 + (f % 6) * 4, b.y + b.h - 22, 2, 2, P.yellow); note(c, b.x + 30, p.top - 2, f); } },
    dance: { x: 50, label: 'dancing to the music', room: 'music', draw: function (c, b, sc, cr, f) { var k = Math.floor(f / 3) % 4; drawAiu(c, sc, cr, b.x + 50 + [-2, 0, 2, 0][k], FL(b), { flip: k > 1, dy: k % 2 ? -2 : 0, eyes: 'happy' }); note(c, b.x + 64, b.y + b.h - 40, f); } },
    paint: { x: 40, label: 'painting at the easel', room: 'studio', draw: function (c, b, sc, cr, f) { var n = Math.floor(f / 10) % 7; [[P.sky, 12, 22, 18, 9], [P.green, 12, 31, 18, 7], [P.yellow, 24, 24, 4, 4], [P.red, 15, 28, 4, 3], [P.white, 16, 24, 6, 2], [P.plum, 20, 33, 3, 3]].slice(0, n).forEach(function (q) { R(c, b.x + q[1], b.y + q[2], q[3], q[4], q[0]); }); var p = drawAiu(c, sc, cr, b.x + 42, FL(b), { flip: true }); line(c, p.hx - 4, p.top + 8, p.hx - 9 - (f % 4 < 2 ? 0 : 1), p.top + 4, P.bark); px(c, p.hx - 10, p.top + 3, [P.red, P.blue, P.yellow][Math.floor(f / 8) % 3]); ell(c, p.hx + 6, p.top + 10, 3, 2, P.wood); px(c, p.hx + 5, p.top + 9, P.red); px(c, p.hx + 7, p.top + 10, P.blue); } },
    pottery: { x: 70, label: 'making pottery', room: 'studio', draw: function (c, b, sc, cr, f) { var sp = f % 4; ell(c, b.x + 58, b.y + b.h - 17, 7, 2, sp < 2 ? P.dark : P.slate); var gw = 2 + Math.floor(f / 20) % 3; ell(c, b.x + 58, b.y + b.h - 21, gw, 3, '#c9845a'); px(c, b.x + 58 - gw + (sp % 2), b.y + b.h - 22, '#e0a77d'); drawAiu(c, sc, cr, b.x + 72, FL(b), { flip: true, dy: f % 8 < 4 ? 0 : 1 }); } },
    sculpt: { x: 40, label: 'making a little sculpture', room: 'studio', draw: function (c, b, sc, cr, f) { box(c, b.x + 30, FL(b) - 6, 14, 6, P.silver); disc(c, b.x + 37, FL(b) - 10, 4, P.white); disc(c, b.x + 37, FL(b) - 16, 3, P.white); px(c, b.x + 36, FL(b) - 17, P.ink); px(c, b.x + 38, FL(b) - 17, P.ink); drawAiu(c, sc, cr, b.x + 50, FL(b), { flip: true, dy: f % 10 < 5 ? 0 : 1 }); if (f % 10 < 3) px(c, b.x + 41, FL(b) - 12, P.white); } },
    printer: { x: 54, label: 'tinkering with the 3D printer', room: 'lab', draw: function (c, b, sc, cr, f) { var hx = b.x + 66 + Math.round((Math.sin(f / 3) + 1) * 8), lay = Math.floor(f / 6) % 9; R(c, b.x + 64, b.y + b.h - 36, 22, 1, P.silver); R(c, hx, b.y + b.h - 35, 3, 3, P.orange); R(c, b.x + 70, b.y + b.h - 13 - lay, 10, lay, P.lime); drawAiu(c, sc, cr, b.x + 54, FL(b)); } },
    science: { x: 30, label: 'mixing something in a flask', room: 'lab', draw: function (c, b, sc, cr, f) { var p = drawAiu(c, sc, cr, b.x + 32, FL(b)); box(c, p.hx + 5, p.top + 4, 5, 7, P.white); R(c, p.hx + 6, p.top + 7, 3, 3, [P.lime, P.pink, P.cyan][Math.floor(f / 10) % 3]); for (var i = 0; i < 2; i++) { var k = (f + i * 4) % 8; px(c, p.hx + 7 + i, p.top + 2 - k, P.lime); } } },
    hens: { x: 40, label: 'feeding the chickens', room: 'stable', draw: function (c, b, sc, cr, f) { var p = drawAiu(c, sc, cr, b.x + 40, b.y + b.h - 8); for (var i = 0; i < 5; i++) { var k = (f + i * 3) % 10; px(c, p.hx + 5 + i * 2, b.y + b.h - 18 + k, P.sand); } [[60, P.white], [72, P.wood], [82, P.white]].forEach(function (q, i) { var bob = (f + i * 4) % 8 < 2 ? 1 : 0; ell(c, b.x + q[0], b.y + b.h - 11, 3, 2, q[1]); R(c, b.x + q[0] + 2, b.y + b.h - 15 + bob, 2, 3, q[1]); px(c, b.x + q[0] + 4, b.y + b.h - 14 + bob, P.orange); px(c, b.x + q[0] + 2, b.y + b.h - 16 + bob, P.red); px(c, b.x + q[0] + 3, b.y + b.h - 14 + bob, P.ink); }); } },
    brushhorse: { x: 40, label: 'raking fresh hay', room: 'stable', draw: function (c, b, sc, cr, f) { var sw = Math.round(Math.sin(f / 3) * 3), p = drawAiu(c, sc, cr, b.x + 40 + sw, b.y + b.h - 8, { flip: sw < 0 }); line(c, p.hx + 4, p.top + 6, p.hx + 10 + sw, b.y + b.h - 9, P.wood); R(c, p.hx + 8 + sw, b.y + b.h - 10, 5, 1, P.slate); if (f % 6 < 3) px(c, p.hx + 13 + sw, b.y + b.h - 12, '#e8c46a'); } }
  };
  CS.ANIM = ANIM;
  // what he's doing -> his animation (each list in order of preference: the first one whose room is built)
  var MAP = {
    sleep: ['sleep'], cook: ['stir'], cookpan: ['stir'], hibachi: ['stir'], foodprep: ['chop'], tea: ['tea'], dishes: ['dishes'], eat: ['eat'], care_feed: ['eat'],
    brushteeth: ['brush'], bath: ['soak'], laundry: ['laundry'],
    games: ['game', 'tv'], laptop: ['type', 'read'], journal: ['writelib', 'write', 'read'], read: ['readlib', 'read'], care_read: ['readlib', 'read'], birdwatch: ['window'],
    music: ['guitar', 'piano', 'couch'], paint: ['paint', 'couch'], pottery: ['pottery', 'knit'], sandcastle: ['sculpt', 'puzzle'], snowman: ['sculpt', 'puzzle'],
    tinker: ['printer', 'science', 'type', 'puzzle'], workout: ['lift', 'ball'], build: ['hammer', 'puzzle'], skate: ['fixcar', 'ball'], weedwhack: ['fixcar', 'sweep'],
    yoga: ['yoga', 'window'], garden: ['water', 'fishtank'], water: ['water', 'fishtank'], chickens: ['hens', 'fishtank'], fishing: ['fishtank'], stargaze: ['window'],
    tv: ['tv'], knit: ['knit'], puzzle: ['puzzle'], bubbles: ['bubbles'], tidy: ['sweep'], kite: ['ball'], butterfly: ['window'], ball: ['ball'], bugnet: ['ball'], newborn: ['look'], fetch: ['ball']
  };
  function animFor(sc, L) { // -> an ANIM key whose room is built
    var cands = (MAP[sc.act] || []).concat(sc.act ? [] : ['couch', 'tv', 'fishtank'].slice(Math.floor((sc.tsec || 0) / 300) % 3)).concat(['couch']);
    for (var i = 0; i < cands.length; i++) { var a0 = ANIM[cands[i]]; if (a0 && CS.has(L, a0.room)) return cands[i]; }
    return 'couch';
  }
  CS.animFor = animFor;
  // the things he does outside, and what has to be built first ('' = nothing)
  var OUTSIDE = { hibachi: 'cart', iching: '', board: '', petbuddy: '', feedbuddy: '', waterbuddy: '', care_hug: '', fetch: '', fishing: 'pond', garden: 'garden', water: 'garden', stargaze: 'obs' };
  function outsideAct(sc, L) {
    if (!sc.act || !(sc.act in OUTSIDE)) return false; var need = OUTSIDE[sc.act];
    if (need === 'obs') return !!L.obs;
    if (need === 'cart') return !!CS.hasOrn(L, 'cart') && sc.weather !== 'rain' && sc.weather !== 'storm' && sc.weather !== 'snow';
    return !need || !!CS.hasOrn(L, need);
  }
  CS.outsideAct = outsideAct;
  CS.labelFor = function (sc, label) { // what the status line says he's doing (the castle's own words for his room animation)
    var a = app(); if (!a || !a.S || !sc.stage || !sc.act || sc.place !== 'home') return label;
    var L = CS.current(); if (outsideAct(sc, L)) return label;
    var k = animFor(sc, L); return ANIM[k] ? ANIM[k].label : label;
  };

  /* ---------- outside: what stands in each spot ---------- */
  var ORNART = {
    well: function (c, x, sc) { WF.well(c, x - 6, SURF, sc); },
    outhouse: function (c, x, sc) { c.save(); c.translate(x - 115, SURF - 50); WF.outhouse(c, Object.assign({}, sc, { house: 'cabin' })); c.restore(); },
    shed: function (c, x, sc) { WF.shed(c, x - 6, SURF, sc); },
    banner: function (c, x, sc) { R(c, x, SURF - 26, 1, 26, P.ink); R(c, x - 1, SURF - 27, 3, 1, P.yellow); var col = sc.accent || P.red, wv = (sc.f || 0) % 8 < 4 ? 0 : 1; R(c, x + 1, SURF - 26, 11, 10, P.ink); R(c, x + 1, SURF - 25, 10, 8, col); R(c, x + 1, SURF - 17 + wv, 4, 2, col); R(c, x + 7, SURF - 17 - wv, 4, 2, col); px(c, x + 5, SURF - 22, P.yellow); },
    garden: function (c, x, sc) {
      var winter = sc.season === 'winter' || sc.biome === 'tundra'; box(c, x - 14, SURF - 6, 28, 7, P.bark, P.wood);
      for (var i = -11; i <= 11; i += 5) { if (winter) { ell(c, x + i, SURF - 6, 2, 1, P.white); continue; } if (sc.season === 'fall') { disc(c, x + i, SURF - 7, 2, P.orange); px(c, x + i, SURF - 10, P.green); continue; } R(c, x + i, SURF - 11, 1, 5, P.green); px(c, x + i - 1, SURF - 9, P.lime); px(c, x + i + 1, SURF - 11, sc.season === 'summer' ? P.red : P.lime); }
      for (var f = -15; f <= 15; f += 5) R(c, x + f, SURF - 9, 1, 9, P.white); R(c, x - 15, SURF - 7, 31, 1, P.white);
    },
    pond: function (c, x, sc) { var ice = sc.season === 'winter' || sc.biome === 'tundra', col = ice ? [P.silver, P.white] : [P.blue, P.sky]; ell(c, x, SURF - 1, 15, 4, P.ink); ell(c, x, SURF - 1, 14, 3, col[0]); ell(c, x - 3, SURF - 2, 6, 1, col[1]); if (!ice) { R(c, x + 11, SURF - 9, 1, 6, P.green); R(c, x + 13, SURF - 8, 1, 5, P.teal); px(c, x + 11, SURF - 10, P.bark); var k = (sc.f || 0) % 40; if (k < 6) px(c, x - 4 + k, SURF - 2 - (k < 3 ? k : 6 - k), P.orange); } },
    windmill: function (c, x, sc) {
      for (var wy = 0; wy < 22; wy++) { var ww = 3 + Math.floor(wy / 4); R(c, x - ww, SURF - 22 + wy, ww * 2, 1, wy % 5 === 4 ? P.bark : P.wood); }
      R(c, x - 4, SURF - 25, 8, 3, P.red); R(c, x - 2, SURF - 8, 4, 8, P.bark);
      var a0 = (sc.tsec || 0) * 0.8; for (var i = 0; i < 4; i++) { var an = a0 + i * Math.PI / 2; line(c, x, SURF - 23, Math.round(x + Math.cos(an) * 12), Math.round(SURF - 23 + Math.sin(an) * 12), P.white); }
      disc(c, x, SURF - 23, 1, P.ink);
    },
    statue: function (c, x, sc) {
      box(c, x - 9, SURF - 8, 18, 8, P.silver, P.white, P.slate); var form = sc.form; if (!form) return;
      var cr = A.creature(form.seed, form.stage, sc.soul), sv = statueOf(cr.frames.open); c.drawImage(sv, Math.round(x - cr.w / 2), SURF - 8 - cr.bottom - 1);
    }
  };
  var stCache = { fr: null, cv: null };
  function statueOf(fr) { if (stCache.fr === fr) return stCache.cv; var cv = mk(fr.width, fr.height), c = cv.getContext('2d'); c.drawImage(fr, 0, 0); c.globalCompositeOperation = 'source-atop'; c.fillStyle = P.silver; c.fillRect(0, 0, cv.width, cv.height); c.globalAlpha = 0.5; c.drawImage(fr, 0, 0); stCache.fr = fr; stCache.cv = cv; return cv; }
  function ornRect(slot, type) { var x = CS.SLOTS[slot], w = type === 'board' || type === 'cart' ? 30 : 28, hh = type === 'board' ? 32 : type === 'cart' ? 36 : type === 'windmill' || type === 'banner' ? 36 : 30; return { x: x - w / 2, y: SURF - hh, w: w, h: hh + 2 }; }
  CS.ornRect = ornRect;
  function observatory(c, sc, S0, cave) { // a little domed telescope tower up on the right tower
    var x = OBS.x, y = OBS.y, night = sc.phase === 'night' || sc.phase === 'dusk';
    if (cave) { R(c, x - 3, y + 10, 6, SURF - 18 - y, P.ink); R(c, x - 2, y + 10, 4, SURF - 18 - y, S0.wall); }
    R(c, x - 9, y, 18, 11, P.ink); R(c, x - 8, y + 1, 16, 10, S0.wall); R(c, x - 8, y + 5, 16, 1, S0.wall2); R(c, x - 2, y + 4, 4, 5, P.ink); R(c, x - 1, y + 5, 2, 4, night ? P.yellow : P.dark);
    c.save(); c.beginPath(); c.rect(x - 12, y - 12, 24, 12); c.clip(); ell(c, x, y, 11, 10, P.ink); ell(c, x, y, 10, 9, P.silver); ell(c, x - 4, y - 5, 3, 2, P.white); R(c, x - 1, y - 9, 3, 9, P.dark); c.restore();
    line(c, x + 1, y - 5, x + 9, y - 12, P.ink); line(c, x + 2, y - 5, x + 10, y - 12, P.slate); R(c, x + 9, y - 15, 3, 3, P.ink); px(c, x + 10, y - 14, night ? P.yellow : P.sky);
    R(c, x - 12, y + 10, 24, 2, P.ink); for (var i = x - 11; i < x + 12; i += 3) R(c, i, y + 6, 1, 4, P.ink); R(c, x - 12, y + 6, 24, 1, P.ink); // the deck and its rail
  }

  /* ---------- the static picture: the back (sky hills) and the front (grounds, castle, rooms) ---------- */
  var stat = { key: null, back: null, front: null };
  function drawBack(sc) {
    var cv = big(W, SURF + 4), c = cv.getContext('2d'), snowy = sc.biome === 'tundra' || sc.season === 'winter', far = sc.biome === 'desert' ? '#d98c4f' : snowy ? P.silver : P.teal, near = sc.biome === 'desert' ? '#d9a066' : snowy ? P.white : P.green;
    for (var x = 0; x < W; x++) { var h0 = 44 - Math.round(8 * (0.5 + 0.5 * Math.sin(x * 0.03 + 1))); R(c, x, h0, 1, SURF - h0, far); }
    if (sc.biome === 'beach') { R(c, 0, 54, W, 8, P.blue); for (var w0 = 0; w0 < 12; w0++) R(c, (w0 * 31) % W, 57, 5, 1, P.sky); }
    for (var x2 = 0; x2 < W; x2++) { var h1 = 64 - Math.round(4 * (0.5 + 0.5 * Math.sin(x2 * 0.06 + 3))); R(c, x2, h1, 1, SURF - h1, near); if (x2 % 7 === 0) px(c, x2, h1, snowy ? P.silver : P.lime); } // the hillside (the creatures walk along it)
    var r = U.rng(U.hash32(sc.biome + 'hill')), kinds = { meadow: 'round', forest: 'pine', desert: 'cactus', tundra: 'pine', pond: 'round', beach: 'palm' }, tk = kinds[sc.biome] || 'round';
    [28, 146, 214, 276].forEach(function (tx) { IN.tree(c, tk, tx, 63 + Math.floor(r() * 3), sc.season); });
    return cv;
  }
  function drawFront(sc, L, building) {
    var cv = big(W, H), c = cv.getContext('2d'), st = CS.style(sc), S0 = STY[st], g = IN.groundCols(sc.biome, sc.season), r = U.rng(U.hash32(sc.biome + sc.season + st));
    R(c, 0, SURF - 8, W, 8, g[0]); for (var f = 0; f < 80; f++) px(c, Math.floor(r() * W), SURF - 8 + Math.floor(r() * 8), g[1]);
    // the earth under it (or ice, sand, rock): darker deeper, with stones, roots, gems and an old fossil
    R(c, 0, SURF, W, H - SURF, S0.earth); R(c, 0, SURF, W, 2, g[1]); R(c, 0, SURF + 2, W, 1, P.ink);
    for (var band = 0; band < 3; band++) { c.globalAlpha = 0.1; R(c, 0, TOP + 80 + band * 80, W, H, P.ink); } c.globalAlpha = 1;
    for (var s = 0; s < 120; s++) { var sx = Math.floor(r() * W), sy = SURF + 4 + Math.floor(r() * (H - SURF - 6)); ell(c, sx, sy, 2 + Math.floor(r() * 2), 1, s % 3 ? S0.earth2 : S0.rock); }
    if (st !== 'ice' && st !== 'cave') for (var rt = 0; rt < 12; rt++) { var rx = 6 + Math.floor(r() * (W - 12)), ry = SURF + 3; for (var q = 0; q < 6 + Math.floor(r() * 8); q++) { px(c, rx, ry, P.bark); ry++; rx += Math.floor(r() * 3) - 1; } }
    for (var gm = 0; gm < 10; gm++) { var gx0 = 4 + Math.floor(r() * (W - 8)), gy0 = TOP + 40 + Math.floor(r() * (H - TOP - 46)), gc = [P.cyan, P.pink, P.lime, P.yellow][gm % 4]; px(c, gx0, gy0, P.ink); px(c, gx0 + 1, gy0, gc); px(c, gx0, gy0 + 1, gc); px(c, gx0 + 1, gy0 + 1, P.white); }
    var fx0 = 20 + Math.floor(r() * 240), fy0 = H - 4; R(c, fx0, fy0, 11, 1, '#e8dcc0'); for (var fb = 0; fb < 5; fb++) R(c, fx0 + 1 + fb * 2, fy0 - 2, 1, 5, '#e8dcc0'); disc(c, fx0 + 13, fy0, 2, '#e8dcc0'); px(c, fx0 + 13, fy0, P.ink);
    // halls: from the ladder through empty ground to a room further along the floor
    for (var row = 0; row < ROWS; row++) {
      var cs0 = []; for (var col = 0; col < COLS; col++) if (L.rooms[row + ',' + col]) cs0.push(col); if (!cs0.length) continue;
      var x0 = Math.min(SHAFT, cs0[0] * CW + CW / 2), x1 = Math.max(SHAFT, cs0[cs0.length - 1] * CW + CW / 2), fy = floorY(row);
      R(c, x0, fy - 27, x1 - x0, 30, P.ink); R(c, x0, fy - 26, x1 - x0, 28, '#2a2433'); R(c, x0, fy + 2, x1 - x0, 2, S0.frame);
      for (var hx = x0 + 8; hx < x1; hx += 22) { R(c, hx, fy - 26, 2, 28, P.bark); R(c, hx - 3, fy - 26, 8, 2, P.bark); }
    }
    // the rooms, each in its walls, with a doorway between rooms side by side
    Object.keys(L.rooms).forEach(function (k) {
      var p = rc(k), cr = cellRect(p.r, p.c), b = inner(p.r, p.c), t = L.rooms[k];
      R(c, cr.x, cr.y, cr.w, cr.h, P.ink); R(c, cr.x + 1, cr.y + 1, cr.w - 2, cr.h - 2, S0.frame); for (var i = 3; i < cr.w; i += 8) px(c, cr.x + i, cr.y + 1, S0.earth2);
      c.save(); c.beginPath(); c.rect(b.x, b.y, b.w, b.h); c.clip(); ROOMART[t](c, b, sc); c.restore();
      R(c, b.x, b.y, b.w, 1, 'rgba(26,28,44,0.25)'); R(c, b.x, b.y, 1, b.h, 'rgba(26,28,44,0.18)'); // a soft shadow under the ceiling
    });
    Object.keys(L.rooms).forEach(function (k) { var p = rc(k), dx = (p.c + 1) * CW; if (L.rooms[p.r + ',' + (p.c + 1)] && dx !== SHAFT) { var fy = floorY(p.r); R(c, dx - 3, fy - 24, 6, 25, P.ink); R(c, dx - 2, fy - 23, 4, 24, '#2a2433'); } });
    // the ladder under the gate, down to the lowest floor with a room (it runs down the wall between the rooms)
    var low = 0; Object.keys(L.rooms).forEach(function (k) { low = Math.max(low, rc(k).r); }); var sBot = TOP + low * CH + CH - 4;
    R(c, SHAFT - 4, SURF - 2, 8, sBot - SURF + 2, P.ink); R(c, SHAFT - 3, SURF - 2, 6, sBot - SURF + 2, '#2a2433'); R(c, SHAFT - 3, SURF - 2, 1, sBot - SURF + 2, P.wood); R(c, SHAFT + 2, SURF - 2, 1, sBot - SURF + 2, P.wood); for (var ly = SURF; ly < sBot; ly += 5) R(c, SHAFT - 2, ly, 4, 1, P.wood);
    // in build mode: a + on ground you can dig, a padlock on ground that isn't open yet
    if (building) for (var rr = 0; rr < ROWS; rr++) for (var cc = 0; cc < COLS; cc++) {
      var key = rr + ',' + cc, why = CS.canBuildAt(L, sc.stageNow || 0, key), cr2 = cellRect(rr, cc); if (L.rooms[key]) continue;
      if (!why) { c.globalAlpha = 0.2; R(c, cr2.x + 4, cr2.y + 4, cr2.w - 8, cr2.h - 8, P.yellow); c.globalAlpha = 1; dashed(c, cr2.x + 4, cr2.y + 4, cr2.w - 8, cr2.h - 8, P.yellow); spr(c, cr2.x + cr2.w / 2 - 3, cr2.y + cr2.h / 2 - 3, ['...y...', '...y...', '...y...', 'yyyyyyy', '...y...', '...y...', '...y...']); }
      else if (why === 'locked') { c.globalAlpha = 0.35; R(c, cr2.x + 4, cr2.y + 4, cr2.w - 8, cr2.h - 8, P.ink); c.globalAlpha = 1; spr(c, cr2.x + cr2.w / 2 - 2, cr2.y + cr2.h / 2 - 3, ['.sss.', 's...s', 'sssss', 'ss.ss', 'sssss']); }
    }
    gatehouse(c, sc, st, S0, L.obs);
    if (L.obs) observatory(c, sc, S0, st === 'cave');
    return cv;
  }
  function dashed(c, x, y, w, h, col) { for (var i = 0; i < w; i += 4) { R(c, x + i, y, 2, 1, col); R(c, x + i, y + h - 1, 2, 1, col); } for (var j = 0; j < h; j += 4) { R(c, x, y + j, 1, 2, col); R(c, x + w - 1, y + j, 1, 2, col); } }
  function gatehouse(c, sc, st, S0, obs) {
    var gx = GATE.x, base = SURF + 1, lit = sc.phase === 'night' || sc.phase === 'dusk';
    if (st === 'cave') {
      c.save(); c.beginPath(); c.rect(0, 0, W, base); c.clip();
      ell(c, gx, base, 36, 32, P.ink); ell(c, gx, base, 35, 31, S0.wall); ell(c, gx - 9, base - 16, 17, 9, '#6b7390'); ell(c, gx + 13, base - 7, 13, 8, P.dark);
      for (var rk = 0; rk < 9; rk++) { var ra = -2.6 + rk * 0.33; ell(c, Math.round(gx + Math.cos(ra) * 22), Math.round(base + Math.sin(ra) * 18), 3, 2, rk % 2 ? P.dark : '#6b7390'); }
      for (var m = -33; m <= 33; m += 2) { var my = base - Math.round(31 * Math.sqrt(Math.max(0, 1 - (m * m) / 1225))); px(c, gx + m, my, sc.season === 'winter' ? P.white : P.green); if (m % 6 === 0) px(c, gx + m, my - 1, sc.season === 'winter' ? P.white : P.lime); }
      ell(c, gx, base, 11, 15, P.ink); ell(c, gx, base, 10, 14, '#1b1622'); c.restore();
      R(c, gx - 16, base - 21, 1, 7, P.ink); R(c, gx - 18, base - 14, 5, 4, P.ink); R(c, gx - 17, base - 13, 3, 2, P.yellow);
      return;
    }
    var L0 = gx - 30, R0 = gx + 30, top = base - 24;
    R(c, L0, top, R0 - L0, base - top, P.ink); R(c, L0 + 1, top + 1, R0 - L0 - 2, base - top - 1, S0.wall);
    for (var y = top + 4; y < base; y += 4) { R(c, L0 + 1, y, R0 - L0 - 2, 1, S0.wall2); for (var x = L0 + 2 + ((y / 4) % 2) * 3; x < R0 - 1; x += 6) R(c, x, y - 3, 1, 3, S0.wall2); }
    for (var cx0 = L0; cx0 < R0; cx0 += 6) { R(c, cx0, top - 4, 4, 4, P.ink); R(c, cx0 + 1, top - 3, 2, 3, S0.wall); }
    [L0 - 4, R0 - 8].forEach(function (tx, ti) {
      R(c, tx, top - 12, 12, base - top + 12, P.ink); R(c, tx + 1, top - 11, 10, base - top + 11, S0.wall);
      for (var ty = top - 7; ty < base; ty += 5) R(c, tx + 1, ty, 10, 1, S0.wall2);
      R(c, tx + 4, top - 4, 4, 6, P.ink); R(c, tx + 5, top - 3, 2, 4, lit ? P.yellow : P.dark);
      if (ti === 1 && obs) return; // the observatory sits up there instead of a roof
      if (st === 'desert') { ell(c, tx + 6, top - 12, 7, 6, P.ink); ell(c, tx + 6, top - 12, 6, 5, S0.roof); R(c, tx + 6, top - 22, 1, 5, P.ink); }
      else if (st === 'ice') { ell(c, tx + 6, top - 12, 7, 7, P.ink); ell(c, tx + 6, top - 12, 6, 6, P.white); R(c, tx + 4, top - 16, 2, 3, P.cyan); }
      else { tri(c, tx + 6, top - 24, 13, 0.5, P.ink); tri(c, tx + 6, top - 23, 12, 0.45, S0.roof); R(c, tx + 6, top - 30, 1, 6, P.ink); R(c, tx + 7, top - 30, 4, 3, sc.accent || P.red); }
    });
    if (st === 'desert') { ell(c, gx, top - 2, 14, 12, P.ink); ell(c, gx, top - 2, 13, 11, S0.roof); ell(c, gx - 4, top - 6, 4, 3, '#f3d39a'); R(c, gx - 14, top - 2, 29, 3, S0.wall); tri(c, gx, top - 20, 6, 0.4, P.ink); px(c, gx, top - 21, P.yellow); }
    if (st === 'ice') for (var ic = L0 + 3; ic < R0 - 2; ic += 5) R(c, ic, top + 1, 1, 2 + (ic % 3), P.cyan);
    R(c, gx - 9, base - 16, 18, 16, P.ink); ell(c, gx, base - 16, 9, 5, P.ink); R(c, gx - 8, base - 15, 16, 15, '#1b1622'); ell(c, gx, base - 16, 8, 4, '#1b1622');
    for (var pg = gx - 7; pg <= gx + 7; pg += 3) R(c, pg, base - 19, 1, 4, P.slate); R(c, gx - 8, base - 16, 16, 1, P.slate);
    R(c, gx - 11, base - 1, 22, 2, S0.trim);
    [gx - 14, gx + 13].forEach(function (lx) { R(c, lx, base - 14, 2, 4, P.ink); R(c, lx, base - 13, 2, 2, lit ? P.yellow : P.sand); }); // torches by the gate
    if (st === 'stone') [L0 + 12, R0 - 14].forEach(function (bx) { R(c, bx, top - 12, 1, 9, P.ink); spr(c, bx + 1, top - 12, ['rrr.', 'rrrr', 'rr..']); });
  }

  /* ---------- where things are: set up each time the layout changes ---------- */
  var lastLay = '', LAY = null;
  function setup(S) {
    var L = CS.layout(S), key = JSON.stringify(L); if (key === lastLay && LAY) return LAY; lastLay = key; LAY = L;
    A.BOARD_P = null; A.CART_P = null;
    CS.SLOT_ORDER.forEach(function (sl) {
      var t = L.orn[sl], x = CS.SLOTS[sl];
      if (t === 'board') { A.BOARD_P = { x: x - 15, y: SURF - 32, w: 30, h: 32 }; A.BOARD_SPOT_P = { x: x + (x < SHAFT ? 20 : -20), y: SURF }; }
      if (t === 'cart') { A.CART_AT = { x: x, y: SURF + 1, s: 0.6 }; A.CART_P = { x: x - 20, y: SURF - 30, w: 40, h: 31 }; }
    });
    A.LANDMARKS = [];
    Object.keys(L.rooms).forEach(function (k) { var t = L.rooms[k], d = CS.ROOMS[t], p = rc(k), b = inner(p.r, p.c); if (d.place) A.LANDMARKS.push({ id: d.place, r: { x: b.x, y: b.y, w: b.w, h: b.h }, door: { x: b.x + 46, y: floorY(p.r) } }); });
    CS.SLOT_ORDER.forEach(function (sl) { var t = L.orn[sl]; if (t && CS.ORN[t].fun) A.LANDMARKS.push({ id: t, r: ornRect(sl, t), door: { x: CS.SLOTS[sl] + (CS.SLOTS[sl] < SHAFT ? 16 : -16), y: SURF } }); });
    if (!CS.hasOrn(L, 'outhouse')) { var pb = rc(CS.find(L, 'bath')), bb = inner(pb.r, pb.c); A.LANDMARKS.push({ id: 'outhouse', bath: true, r: { x: bb.x + 70, y: bb.y + 40, w: 20, h: 36 }, door: { x: bb.x + 79, y: floorY(pb.r) } }); } // no outhouse: he uses the bathroom
    return L;
  }
  CS.current = function () { var a = app(); return a && a.S ? setup(a.S) : CS.layout(null); };

  /* ---------- Aiu's place and his walk there ---------- */
  var OUT_SPOT = { x: 82, y: SURF }; // in front of the gate
  function targetFor(sc, L) {
    var a = app();
    if (a.visit && a.visit.id) {
      if (a.visit.id === 'board' && A.BOARD_SPOT_P) return { x: A.BOARD_SPOT_P.x, row: -1, key: 'v:board', out: 1 };
      var lm = (A.LANDMARKS || []).filter(function (x) { return x.id === a.visit.id; })[0];
      if (lm && lm.bath) { var pq = rc(CS.find(L, 'bath')); return { x: pq.c * CW + 2 + 79, row: pq.r, key: 'v:potty', anim: 'potty', room: 'bath', b: inner(pq.r, pq.c), visitRoom: true }; }
      if (lm) { var rw = lm.door.y <= SURF ? -1 : Math.round((lm.door.y + 7 - TOP) / CH - 1); return { x: lm.door.x, row: rw, key: 'v:' + lm.id, out: rw < 0 ? 1 : 0, visitRoom: rw >= 0, b: rw >= 0 ? lm.r : null }; }
    }
    if (!sc.stage) { var pl = rc(CS.find(L, 'living')); return { x: pl.c * CW + 2 + 50, row: pl.r, key: 'egg', b: inner(pl.r, pl.c) }; }
    if (outsideAct(sc, L)) {
      if (sc.act === 'hibachi') return { x: A.CART_AT.x, row: -1, key: 'cart', cart: true, out: 1 };
      if (sc.act === 'stargaze') return { x: OBS.x, row: -2, key: 'obs', out: 1 };
      if (sc.act === 'board' && A.BOARD_SPOT_P) return { x: A.BOARD_SPOT_P.x, row: -1, key: 'board', out: 1 };
      var need = OUTSIDE[sc.act], sl = need ? CS.hasOrn(L, need) : null;
      if (sl) return { x: CS.SLOTS[sl] + (CS.SLOTS[sl] < SHAFT ? 22 : -22), row: -1, key: 'o:' + sc.act, out: 1 };
      return { x: OUT_SPOT.x, row: -1, key: 'out:' + sc.act, out: 1 };
    }
    var an = animFor(sc, L), A0 = ANIM[an], p = rc(CS.find(L, A0.room));
    return { x: p.c * CW + 2 + A0.x, row: p.r, key: 'in:' + an + ':' + p.r + ',' + p.c, anim: an, room: A0.room, b: inner(p.r, p.c) };
  }
  var walker = { pos: null, path: null, start: 0, dur: 0, len: 0, key: '', tgt: null, drop: null };
  function plan(from, to) { // along the floor to the ladder, up or down, along to the spot (the observatory has its own little ladder)
    var pts = [{ x: from.x, y: floorY(from.row), row: from.row }], cur = { x: from.x, row: from.row };
    function go(x, row, climb) { pts.push({ x: x, y: floorY(row), row: row, climb: climb ? 1 : 0 }); cur = { x: x, row: row }; }
    if (cur.row === -2 && to.row !== -2) { go(OBS.x, -2); go(OBS.x, -1, 1); }
    if (cur.row !== to.row && to.row !== -2) { go(SHAFT, cur.row); go(SHAFT, to.row, 1); }
    if (to.row === -2 && cur.row !== -2) { if (cur.row !== -1) { go(SHAFT, cur.row); go(SHAFT, -1, 1); } go(OBS.x, -1); go(OBS.x, -2, 1); }
    go(to.x, to.row);
    var len = 0; for (var i = 1; i < pts.length; i++) len += Math.abs(pts[i].x - pts[i - 1].x) + Math.abs(pts[i].y - pts[i - 1].y) * 1.4;
    return { pts: pts, len: len };
  }
  function walkAt(now) {
    var w = walker, d = (now - w.start) / w.dur * w.len;
    for (var i = 1; i < w.path.length; i++) { var a0 = w.path[i - 1], b0 = w.path[i], sl = Math.abs(b0.x - a0.x) + Math.abs(b0.y - a0.y) * 1.4; if (d <= sl) { var k = sl ? d / sl : 1; return { x: a0.x + (b0.x - a0.x) * k, y: a0.y + (b0.y - a0.y) * k, row: k < 0.5 ? a0.row : b0.row, left: b0.x < a0.x, climb: !!b0.climb && a0.x === b0.x, done: false }; } d -= sl; }
    var e = w.path[w.path.length - 1]; return { x: e.x, y: e.y, row: e.row, left: false, done: true };
  }
  var faceLeft = false;
  CS.aiuNow = function (sc, L) {
    var now = Date.now(), tgt = targetFor(sc, L);
    if (!walker.pos) walker.pos = { x: tgt.x, row: tgt.row };
    if (walker.drop) { walker.pos = { x: walker.drop.x, row: walker.drop.row }; walker.drop = null; walker.key = ''; walker.path = null; }
    if (tgt.key !== walker.key) {
      var cur = walker.path ? walkAt(now) : { x: walker.pos.x, row: walker.pos.row };
      if (cur.row !== tgt.row || Math.abs(cur.x - tgt.x) > 1) { var pl = plan({ x: cur.x, row: cur.row }, tgt); walker.path = pl.pts; walker.len = pl.len; walker.start = now; walker.dur = Math.max(400, pl.len / 40 * 1000); }
      else walker.path = null;
      walker.key = tgt.key; walker.tgt = tgt;
    }
    if (walker.path) { var p = walkAt(now); if (!p.done) { if (!p.climb) faceLeft = p.left; return { x: p.x, y: p.y, row: p.row, walking: true, left: p.left, climb: p.climb, tgt: tgt }; } walker.path = null; }
    walker.pos = { x: tgt.x, row: tgt.row };
    return { x: tgt.x, y: floorY(tgt.row), row: tgt.row, walking: false, tgt: tgt, left: faceLeft };
  };
  CS.walking = function () { return !!walker.path; };
  CS.dropAt = function (p) { var L = CS.current(), row = p.y < TOP ? -1 : Math.max(0, Math.min(ROWS - 1, Math.floor((p.y - TOP) / CH))); if (row >= 0 && !L.rooms[row + ',' + Math.max(0, Math.min(COLS - 1, Math.floor(p.x / CW)))]) row = -1; walker.drop = { x: Math.max(8, Math.min(W - 8, p.x)), row: row }; };
  function oldAnchor(sc) { // where the old outdoor pictures put him (for what he still does with them: outside, tricks, the egg)
    if (!sc.stage) return { x: sc.spotX || (sc.indoor ? 104 : A.AIU_OUT), y: sc.indoor ? 100 : 97 };
    if (sc.act === 'sleep' || sc.mode === 'sleepy') return { x: 160, y: sc.mode === 'sleepy' ? 84 : 86 };
    if (sc.spotX) return { x: sc.spotX, y: 100 };
    return sc.indoor ? { x: 104, y: 100 } : { x: A.AIU_OUT, y: 97 };
  }
  var lastMap = { x: 0, y: 0 }, lastPos = null;
  CS.frameOff = function () { return lastMap; };
  CS.aiuPos = function () { return lastPos; };

  /* ---------- the pet: on the grounds to the right, out of Aiu's way ---------- */
  var HOMEBOUND = /^(care_|petbuddy|feedbuddy|waterbuddy|fetch|ride|board)/;
  function petAt(sc, aiu) {
    var b = A.buddyOf(sc.soul, sc.buddy), PLY = AIU.play, home = { x: 106, y: SURF }, care = sc.act && HOMEBOUND.test(sc.act);
    if (sc.phase === 'night' && !A.POSTED[b] && !care && !(PLY && PLY.active && PLY.active())) { var kb = CS.find(CS.current(), 'bedroom'), pb = rc(kb); return { x: pb.c * CW + 2 + 70, y: floorY(pb.r), left: true, inside: true }; } // asleep at the foot of his bed
    var stay = A.POSTED[b] || care || (PLY && PLY.active && PLY.active()) || (sc.bplay && sc.bplay.a);
    var p = home, left = false;
    if (!stay) { var w = WF.wanderAt('cbuddy' + (sc.soul || 0), sc.tsec * 0.8, 146, 278, 0, 0, 1); p = { x: Math.round(w.x), y: SURF }; left = w.left; }
    if (aiu && aiu.row === -1 && !aiu.walking && Math.abs(aiu.x - p.x) < 24 && !(sc.act && HOMEBOUND.test(sc.act))) p = { x: aiu.x < p.x ? Math.min(W - 8, aiu.x + 24) : Math.max(140, aiu.x - 24), y: SURF };
    if (care && aiu && aiu.row === -1) p = { x: Math.min(W - 10, aiu.x + 24), y: SURF };
    var tp = A.toyPos && A.toyPos('buddy', p); if (tp) p = { x: Math.round(tp.x), y: SURF };
    return { x: p.x, y: p.y, left: left };
  }
  // the drone hovers in the sky over the castle
  var droneOff = null;
  function droneOffset(sc) { if (droneOff) return droneOff; var r0 = A.droneRect(Object.assign({}, sc, { place: 'home', indoor: false })); if (!r0) return { x: 0, y: 0 }; droneOff = { x: 216 - (r0.x + r0.w / 2), y: 12 - r0.y }; return droneOff; }
  CS.droneRect = function (sc) { var r = A.droneRect(Object.assign({}, sc, { place: 'home', indoor: false })); if (!r) return null; var o = droneOffset(sc); return { x: r.x + o.x, y: r.y + o.y, w: r.w, h: r.h }; };

  /* ---------- drawing a frame ---------- */
  var layer = null;
  CS.building = false;
  CS.render = function (ctx, sc) {
    ctx.setTransform(SC, 0, 0, SC, 0, 0); ctx.imageSmoothingEnabled = false;
    var a = app(), S = a.S, L = setup(S); sc.stageNow = S ? S.stage : 0; sc.castle = true;
    var cos = sc.cos || {}, night = sc.phase === 'night' || sc.phase === 'dusk';
    var key = [sc.biome, sc.season, sc.house, sc.accent, lastLay, CS.building ? 'b' + sc.stageNow : '', sc.phase, cos.wall && cos.wall.it && cos.wall.it.id, cos.rug && cos.rug.it && cos.rug.it.id, Math.floor((sc.f || 0) / 15) % 2].join('|');
    if (stat.key !== key) { stat.back = drawBack(sc); stat.front = drawFront(sc, L, CS.building); stat.key = key; }
    if (!layer) layer = big(W, H);
    var Lc = layer.getContext('2d'); Lc.setTransform(SC, 0, 0, SC, 0, 0); Lc.imageSmoothingEnabled = false; Lc.clearRect(0, 0, W, H);
    ctx.clearRect(0, 0, W, H);
    IN.drawSky(ctx, 0, 0, W, SURF, IN.skyBands(sc.phase, sc.weather)); IN.skyThings(ctx, sc, [0, 0, W, 48]);
    Lc.drawImage(stat.back, 0, 0, W, SURF + 4);
    // a strange friendly creature wandering the hillside behind the castle
    var od = A.oddNow && A.oddNow(sc); CS._od = null;
    if (od) { var ox = Math.round(od.x * W / 192), oy = 66; CS._od = { x: ox, y: oy, od: od }; Lc.save(); Lc.translate(ox, oy); Lc.translate(-od.x, -od.y); A.drawOdd(Lc, od, sc); Lc.restore(); }
    Lc.drawImage(stat.front, 0, 0, W, H);
    Object.keys(L.rooms).forEach(function (k) { if (L.rooms[k] === 'living') { var p = rc(k), b = inner(p.r, p.c); WF.regulatorSmall(Lc, b.x + 80, b.y + 10, sc); } }); // the clock really ticks
    var aiu = CS.aiuNow(sc, L), tg = aiu.tgt, cooking = !aiu.walking && tg.cart && sc.act === 'hibachi';
    // outside: each spot, the shop's yard decoration, the food cart, the board
    CS.SLOT_ORDER.forEach(function (sl) { var t = L.orn[sl]; if (t && ORNART[t]) ORNART[t](Lc, CS.SLOTS[sl], sc); });
    if (cos.yard && cos.yard.img) { var yi = cos.yard.img; Lc.drawImage(yi, 140 - Math.floor(yi.width / 2), SURF - yi.height); if (cos.yard.it && cos.yard.it.id === 'yard-lantern' && night) { Lc.globalAlpha = 0.35; disc(Lc, 140, SURF - yi.height + 4, 6, P.yellow); Lc.globalAlpha = 1; } }
    if (A.CART_P) WF.drawCart(Lc, Object.assign({}, sc, { indoor: false }), cooking && !(A.toyHide && A.toyHide('aiu')));
    if (sc.stage && A.BOARD_P) { Lc.save(); Lc.translate(A.BOARD_P.x, A.BOARD_P.y); Lc.scale(30 / 36, 30 / 36); Lc.translate(-3, -103); var bp = A.BOARD_P; A.BOARD_P = { x: 3, y: 103, w: 36, h: 36 }; WF.board(Lc, sc); A.BOARD_P = bp; Lc.restore(); }
    // the pet, then Aiu
    var pp = petAt(sc, aiu), anc = oldAnchor(sc);
    lastPos = { x: aiu.x, y: aiu.y, row: aiu.row, s: 1 };
    lastMap = { x: aiu.x - anc.x, y: aiu.y - anc.y };
    var drawPet = function () { if (sc.stage && !(A.toyHide && A.toyHide('buddy'))) WF.drawBuddyAt(Lc, Object.assign({}, sc, { indoor: false }), pp, lastMap); };
    if (!pp.inside) drawPet();
    var hideAiu = (A.toyHide && A.toyHide('aiu')) || (a.visit && a.visit.phase === 'in' && !tg.visitRoom);
    var form = sc.skin || sc.form, cr = sc.stage && form ? A.creature(form.seed, form.stage, sc.soul) : null;
    var trick = /^(hop|spin|jump|dance|wiggle|yawn|greet)$/.test(sc.mode || '') || !!sc.evolve;
    var clipB = function (b) { Lc.save(); if (b) { Lc.beginPath(); Lc.rect(b.x, b.y - 8, b.w, b.h + 8); Lc.clip(); } };
    if (!sc.stage) { clipB(tg.b); Lc.translate(lastMap.x, lastMap.y); IN.drawActor(Lc, sc); Lc.restore(); } // the egg, in the living room
    else if (!hideAiu && !cooking) {
      if (aiu.walking) WF.drawWalker(Lc, sc, { x: aiu.x, y: aiu.y }, aiu.left, 1, aiu.climb);
      else if (tg.anim && !trick && cr) { clipB(tg.b); ANIM[tg.anim].draw(Lc, tg.b, sc, cr, sc.f || 0); Lc.restore(); }
      else if (cr && !trick && (tg.visitRoom || (tg.out && !(sc.act in OUTSIDE)))) drawAiu(Lc, sc, cr, aiu.x, aiu.y, { flip: aiu.left, eyes: tg.visitRoom ? 'happy' : null }); // visiting a room, or out for a stroll
      else { clipB(tg.b); Lc.translate(lastMap.x, lastMap.y); IN.drawActor(Lc, Object.assign({}, sc, { walk: null })); Lc.restore(); } // the old pictures: outside acts, tricks, evolving
    }
    if (pp.inside) drawPet(); // (at night, curled up at the foot of his bed)
    // the time of day: the grounds darken; the rooms stay lamp-lit
    var dim = sc.phase === 'night' ? 0.55 : sc.phase === 'dusk' || sc.phase === 'dawn' ? 0.25 : (sc.weather === 'storm' || sc.weather === 'rain') ? 0.18 : 0;
    if (dim) { Lc.globalCompositeOperation = 'source-atop'; Lc.globalAlpha = dim; R(Lc, 0, 0, W, SURF + 3, P.ink); Lc.globalAlpha = dim * 0.25; R(Lc, 0, SURF + 3, W, H - SURF - 3, P.ink); Lc.globalAlpha = 1; Lc.globalCompositeOperation = 'source-over'; }
    ctx.drawImage(layer, 0, 0, W, H);
    if (sc.stage) { var dof = droneOffset(sc); ctx.save(); ctx.translate(dof.x, dof.y); IN.drone(ctx, sc); ctx.restore(); }
    IN.weather(ctx, sc, [0, 0, W / 2, SURF + 2]); IN.weather(ctx, sc, [W / 2, 0, W / 2, SURF + 2]);
    if (sc.flash) { var rr = Math.round(10 + (1 - Math.min(1, sc.flash)) * 18); for (var sp = 0; sp < 12; sp++) { var an = sp / 12 * Math.PI * 2; px(ctx, Math.round(aiu.x + Math.cos(an) * rr), Math.round(aiu.y - 14 + Math.sin(an) * rr * 0.7), sp % 2 ? P.yellow : P.white); } }
    if (A.toyDraw) A.toyDraw(ctx, sc);
    if (CS.building) buildOverlay(ctx, sc, L);
  };
  function buildOverlay(ctx, sc, L) {
    var t = Date.now() / 300, stg = sc.stageNow || 0;
    if (CS.moving) { var p = rc(CS.moving), r0 = cellRect(p.r, p.c); ctx.strokeStyle = P.yellow; ctx.lineWidth = 1; ctx.setLineDash([2, 2]); ctx.lineDashOffset = Math.floor(t) % 4; ctx.strokeRect(r0.x + 1.5, r0.y + 1.5, r0.w - 3, r0.h - 3); ctx.setLineDash([]);
      for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) { var k = r + ',' + c; if (CS.canMove(L, stg, CS.moving, k)) { var cr = cellRect(r, c); ctx.globalAlpha = 0.25; R(ctx, cr.x + 4, cr.y + 4, cr.w - 8, cr.h - 8, P.yellow); ctx.globalAlpha = 1; } } }
    if (CS.movingOrn) { var x0 = CS.SLOTS[CS.movingOrn]; ctx.strokeStyle = P.yellow; ctx.strokeRect(x0 - 15.5, SURF - 36.5, 31, 38); CS.SLOT_ORDER.forEach(function (sl) { if (sl !== CS.movingOrn) { ctx.globalAlpha = 0.25; R(ctx, CS.SLOTS[sl] - 14, SURF - 34, 28, 34, P.yellow); ctx.globalAlpha = 1; } }); }
    else CS.SLOT_ORDER.forEach(function (sl) { if (!L.orn[sl]) { dashed(ctx, CS.SLOTS[sl] - 12, SURF - 26, 24, 26, P.yellow); spr(ctx, CS.SLOTS[sl] - 2, SURF - 15, ['..y..', '..y..', 'yyyyy', '..y..', '..y..']); } });
    if (!L.obs) { var ok = stg >= CS.OBS.stage; dashed(ctx, OBS.x - 9, OBS.y - 8, 18, 18, ok ? P.yellow : P.silver); spr(ctx, OBS.x - 2, OBS.y - 2, ok ? ['..y..', '..y..', 'yyyyy', '..y..', '..y..'] : ['.sss.', 's...s', 'sssss', 'ss.ss', 'sssss']); }
  }

  /* ---------- what's under a tap ---------- */
  function inR(p, r) { return !!(r && p && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h); }
  var OBS_R = { x: OBS.x - 12, y: OBS.y - 16, w: 24, h: 28 };
  CS.hitAt = function (pt, sc) {
    if (!pt || !sc) return null;
    var L = CS.current();
    if (CS.building) {
      if (inR(pt, OBS_R)) return { kind: 'bobs' };
      if (pt.y < TOP - 2) { var sl = CS.SLOT_ORDER.filter(function (s) { return Math.abs(pt.x - CS.SLOTS[s]) <= 15 && pt.y >= SURF - 40; })[0]; return sl ? { kind: 'bslot', slot: sl } : null; }
      var r = Math.floor((pt.y - TOP) / CH), c = Math.floor(pt.x / CW); if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
      return { kind: 'bcell', k: r + ',' + c };
    }
    if (inR(pt, CS.droneRect(sc))) return { kind: 'drone' };
    var ap = lastPos; if (ap && Math.abs(pt.x - ap.x) <= 11 && pt.y >= ap.y - 26 && pt.y <= ap.y + 3) return { kind: 'aiu' };
    if (sc.stage && inR(pt, A.buddyRectP && A.buddyRectP(sc))) return { kind: 'buddy' };
    if (sc.stage && inR(pt, A.BOARD_P)) return { kind: 'board' };
    if (inR(pt, A.CART_P)) return { kind: 'cart' };
    if (L.obs && inR(pt, OBS_R)) return { kind: 'obs' };
    if (pt.y < TOP) {
      var hit = null; CS.SLOT_ORDER.forEach(function (s) { var t = L.orn[s]; if (t && inR(pt, ornRect(s, t))) hit = t; });
      if (hit && CS.ORN[hit].fun) return { kind: 'landmark', id: hit };
      if (hit) return { kind: 'orn', id: hit };
      if (pt.x >= GATE.l && pt.x <= GATE.r && pt.y > SURF - 42) return { kind: 'gate' };
      if (CS._od && Math.abs(pt.x - CS._od.x) <= 12 && pt.y <= CS._od.y + 3 && pt.y >= CS._od.y - 20) return { kind: 'oddity', odd: CS._od.od };
      return null;
    }
    var rr = Math.floor((pt.y - TOP) / CH), cc = Math.floor(pt.x / CW), t0 = L.rooms[rr + ',' + cc];
    if (t0) { var d = CS.ROOMS[t0]; if (t0 === 'office') return { kind: 'computer' }; if (d.place) return { kind: 'landmark', id: d.place }; return { kind: 'room', type: t0 }; }
    return { kind: 'rock' };
  };

  /* ---------- build mode (the hammer under the picture) ---------- */
  CS.setBuilding = function (on) { CS.building = !!on; CS.moving = null; CS.movingOrn = null; stat.key = null; if (AIU.ui.refresh) AIU.ui.refresh(); };
  function spend(price, what) { var a = app(); if ((a.S.tokens || 0) < price) return Promise.resolve(false); return a.addEvents([{ type: 'tspend', data: { what: ('castle:' + what).slice(0, 30), price: price } }]).then(function () { return true; }); }
  function refund(price, what) { var back = Math.floor(price / 2); return back > 0 ? app().addEvents([{ type: 'trefund', data: { what: String(what).slice(0, 30), price: back } }]) : Promise.resolve(); }
  CS.buildTap = function (hit) {
    var a = app(), S = a.S, L = CS.current(), k = AIU.ui.k, stage = S.stage || 0;
    if (!hit) return;
    if (hit.kind === 'bobs') return obsSheet(L);
    if (hit.kind === 'bcell') {
      var key = hit.k, t = L.rooms[key];
      if (CS.moving) {
        if (key === CS.moving) { CS.moving = null; return; }
        if (!CS.canMove(L, stage, CS.moving, key)) { k.snack(L.rooms[key] ? 'Those two can\'t swap: every room has to stay joined to the others.' : 'It can only go where it stays joined to the other rooms (and where the ground is open).'); return; }
        var r2 = Object.assign({}, L.rooms), from = CS.moving; if (r2[key]) { var tt = r2[key]; r2[key] = r2[from]; r2[from] = tt; } else { r2[key] = r2[from]; delete r2[from]; }
        CS.moving = null; a.beep('knock'); return CS.save({ rooms: r2, orn: L.orn, obs: L.obs });
      }
      if (t) return roomSheet(L, key, t);
      var why = CS.canBuildAt(L, stage, key);
      if (why === 'locked') return k.snack('This floor opens when ' + S.totemName + ' reaches ' + C.stageName(CS.openNeeds(rc(key).r)) + '.');
      if (why === 'far') return k.snack('Build next to a room you already have (the castle grows out from the gate).');
      return pickRoom(L, key);
    }
    if (hit.kind === 'bslot') {
      var sl = hit.slot, o = L.orn[sl];
      if (CS.movingOrn) { var o2 = Object.assign({}, L.orn), m = CS.movingOrn, tmp = o2[sl]; o2[sl] = o2[m]; o2[m] = tmp; CS.movingOrn = null; a.beep('knock'); return CS.save({ rooms: L.rooms, orn: o2, obs: L.obs }); }
      if (o) return ornSheet(L, sl, o);
      return pickOrn(L, sl);
    }
  };
  function buyRow(h, d, ok, rich, have, onBuy) {
    return h('button', { type: 'button', cls: 'qrow' + (ok && rich && !have ? '' : ' dim'), onclick: onBuy }, h('span', { cls: 'qrtitle', text: d.name }), h('span', { cls: 'small', text: (have ? 'built' : ok ? (d.cost ? d.cost + ' tokens' : 'free') : 'opens at ' + C.stageName(d.stage)) + ' · ' + d.desc }));
  }
  function pickRoom(L, key) {
    var a = app(), S = a.S, k = AIU.ui.k, h = U.h, s, list = h('div', { cls: 'morelist' });
    Object.keys(CS.ROOMS).filter(function (t) { return !CS.ROOMS[t].core; }).forEach(function (t) {
      var d = CS.ROOMS[t], ok = (S.stage || 0) >= d.stage, rich = (S.tokens || 0) >= d.cost, have = CS.has(L, t);
      list.appendChild(buyRow(h, d, ok, rich, have, function () {
        if (have) return k.snack('You have the ' + d.name.toLowerCase() + ' already. Move it instead.');
        if (!ok) return k.snack(d.name + ' opens when ' + S.totemName + ' reaches ' + C.stageName(d.stage) + '.');
        if (!rich) return k.snack('You need ' + (d.cost - (S.tokens || 0)) + ' more tokens.');
        s.remove(); (d.cost ? spend(d.cost, t) : Promise.resolve(true)).then(function (paid) { if (!paid) return k.snack('The wallet came up short.'); var r2 = Object.assign({}, L.rooms); r2[key] = t; CS.save({ rooms: r2, orn: L.orn, obs: L.obs }).then(function () { a.beep('coin'); a.react('happy'); k.snack('Built: ' + d.name + '.'); }); });
      }));
    });
    s = k.sheet('Build a room', [h('p', { cls: 'small', text: 'You have ' + (S.tokens || 0) + ' tokens. Each room is one of a kind; you can move it any time.' }), list]);
  }
  function roomSheet(L, key, t) {
    var k = AIU.ui.k, h = U.h, d = CS.ROOMS[t], s;
    var acts = [k.btn('Move', function () { s.remove(); CS.moving = key; k.snack('Tap where it goes (a room there swaps with it).'); }, 'primary')];
    if (!d.core) acts.push(k.btn('Remove', function () {
      if (!CS.canRemove(L, key)) { k.snack('Not this one: the rooms past it would be cut off.'); return; }
      if (!confirm('Remove the ' + d.name.toLowerCase() + '? You get half its tokens back (' + Math.floor((d.cost || 0) / 2) + ').')) return;
      s.remove(); var r2 = Object.assign({}, L.rooms); delete r2[key]; refund(d.cost || 0, t).then(function () { return CS.save({ rooms: r2, orn: L.orn, obs: L.obs }); }).then(function () { k.snack('Removed.'); });
    }, 'del'));
    s = k.sheet(d.name, [h('p', { text: d.desc }), d.core ? h('p', { cls: 'small', text: 'One of the four first rooms: it can move, but it stays.' }) : null, h('div', { cls: 'row wrap' }, acts)]);
  }
  function pickOrn(L, sl) {
    var a = app(), S = a.S, k = AIU.ui.k, h = U.h, s, list = h('div', { cls: 'morelist' });
    Object.keys(CS.ORN).filter(function (t) { return !CS.ORN[t].core; }).forEach(function (t) {
      var d = CS.ORN[t], ok = (S.stage || 0) >= d.stage, rich = (S.tokens || 0) >= d.cost, have = !!CS.hasOrn(L, t);
      list.appendChild(buyRow(h, d, ok, rich, have, function () {
        if (have) return k.snack('It\'s already out there. Move it instead.');
        if (!ok) return k.snack(d.name + ' comes when ' + S.totemName + ' reaches ' + C.stageName(d.stage) + '.');
        if (!rich) return k.snack('You need ' + (d.cost - (S.tokens || 0)) + ' more tokens.');
        s.remove(); spend(d.cost, t).then(function (paid) { if (!paid) return k.snack('The wallet came up short.'); var o2 = Object.assign({}, L.orn); o2[sl] = t; CS.save({ rooms: L.rooms, orn: o2, obs: L.obs }).then(function () { a.beep('coin'); k.snack('Built: ' + d.name + '.'); }); });
      }));
    });
    s = k.sheet('Build outside', [h('p', { cls: 'small', text: 'You have ' + (S.tokens || 0) + ' tokens. (The observatory goes up on the castle\'s tower: tap the + up there.)' }), list]);
  }
  function ornSheet(L, sl, t) {
    var k = AIU.ui.k, h = U.h, d = CS.ORN[t], s;
    var acts = [k.btn('Move', function () { s.remove(); CS.movingOrn = sl; k.snack('Tap the spot where it goes (what\'s there swaps with it).'); }, 'primary')];
    if (!d.core) acts.push(k.btn('Remove', function () { if (!confirm('Remove the ' + d.name.toLowerCase() + '? You get half its tokens back (' + Math.floor((d.cost || 0) / 2) + ').')) return; s.remove(); var o2 = Object.assign({}, L.orn); o2[sl] = null; refund(d.cost || 0, t).then(function () { return CS.save({ rooms: L.rooms, orn: o2, obs: L.obs }); }).then(function () { k.snack('Removed.'); }); }, 'del'));
    s = k.sheet(d.name, [h('p', { text: d.desc }), d.core ? h('p', { cls: 'small', text: 'It can move to another spot, but it stays.' }) : null, h('div', { cls: 'row wrap' }, acts)]);
  }
  function obsSheet(L) {
    var a = app(), S = a.S, k = AIU.ui.k, h = U.h, d = CS.OBS, s;
    if (L.obs) { s = k.sheet(d.name, [h('p', { text: d.desc }), h('div', { cls: 'row wrap' }, k.btn('Remove', function () { if (!confirm('Take down the observatory? You get half its tokens back (' + Math.floor(d.cost / 2) + ').')) return; s.remove(); refund(d.cost, 'obs').then(function () { return CS.save({ rooms: L.rooms, orn: L.orn, obs: false }); }).then(function () { k.snack('Removed.'); }); }, 'del'))]); return; }
    if ((S.stage || 0) < d.stage) return k.snack('The observatory comes when ' + S.totemName + ' reaches ' + C.stageName(d.stage) + '.');
    if ((S.tokens || 0) < d.cost) return k.snack('The observatory is ' + d.cost + ' tokens. You need ' + (d.cost - (S.tokens || 0)) + ' more.');
    s = k.sheet(d.name, [h('p', { text: d.desc }), h('p', { cls: 'small', text: d.cost + ' tokens (you have ' + (S.tokens || 0) + ').' }), h('div', { cls: 'row wrap' }, k.btn('Build it', function () { s.remove(); spend(d.cost, 'obs').then(function (paid) { if (!paid) return k.snack('The wallet came up short.'); CS.save({ rooms: L.rooms, orn: L.orn, obs: true }).then(function () { a.beep('coin'); a.react('happy'); k.snack('Built: the observatory. ' + S.totemName + ' will stargaze up there at night.'); }); }); }, 'primary'))]);
  }
  CS.roomInfo = function (type) { var d = CS.ROOMS[type]; return d ? d.name + ': ' + d.desc : ''; };
  CS.obsInfo = function () { return CS.OBS.name + ': ' + CS.OBS.desc; };
})();
