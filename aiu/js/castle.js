/* AIU TOTEM 3.6 - the castle: Aiu's whole place in one picture (320 x 760, drawn 3x for crisp pixels), laid out like
   The Elder Scrolls: Castles. A stone shell on a terrace: five floors of 12 cells. A room takes 4 cells and widens 4 at
   a time; the throne hall sits in the middle of the ground floor and never moves; staircases link a floor with the one
   above wherever you build them, and an elevator runs up a tower on the right (the observatory on top). Between two
   rooms: a solid wall with a doorway, or an open archway. Selling gives back exactly what you paid.
   Behind: mountains and a hillside (the creatures wander the ridge, the windmill stands up there). Below (3.6): the
   castle stands on a motte; a flying bridge runs down to the bailey, a yard in a wooden palisade with four plots for its
   buildings (granary, cowshed, workshop, stables, barracks), six spots in front (board, food cart, well, pond and more),
   and the main gate with a drawbridge over the ditch.
   Aiu goes to the room for what he's doing, taking the stairs or the elevator (whichever is shorter), and does a little
   animation of his own there. The layout is the setting 'castle' (synced, v5): { rooms: { type: { f, b, w } },
   walls: { 'floor,block': 'arch' }, stairs: { 'floor,cell': 1 }, orn: { slot: type }, bailey: { plot: type }, obs, mill } (floor 0 = the ground
   floor; a block is 4 cells). */
(function () {
  'use strict';
  var U = AIU.util, C = AIU.core, A = AIU.art, P = A.P, K = A.prim, R = K.R, px = K.px, spr = K.spr, disc = K.disc, ell = K.ell, tri = K.tri, line = K.line;
  var IN = A._in, WF = A._w;
  var CS = AIU.castle = {};
  function app() { return AIU.app; }
  A.CASTLE = true;

  /* ---------- the grid: 5 floors (floor 0 = the ground floor) of 12 cells each; a room is a block of 4 cells and can be
     widened 4 cells at a time (up to the whole floor). The elevator runs up a tower on the right; staircases go anywhere. ---------- */
  var W = 340, H = 760, SC = 3, OX = 26, CW = 96, CH = 80, CELL = 24, BLOCKS = 3, ROWS = 5, BASE = 504, SURF = BASE + 206, SW = 20;
  var BY = BASE + 62, FPY = BASE + 222; // the bailey: its back palisade (at the foot of the motte) and its front palisade
  var TOPY = BASE - ROWS * CH, TT = TOPY - 22, EX = OX + BLOCKS * CW + SW / 2, DOORX = OX + CW + CW / 2, WIDEN = 40, STAIRS = 20;
  var OBS = { x: EX - 2, y: TT, ax: EX - 18 };
  CS.W = W; CS.H = H; CS.SC = SC;
  CS.G = { W: W, H: H, OX: OX, BASE: BASE, SURF: SURF, CW: CW, CH: CH, CELL: CELL, BLOCKS: BLOCKS, ROWS: ROWS, EX: EX, DOORX: DOORX, OBS: OBS, WIDEN: WIDEN, STAIRS: STAIRS };
  function colX(b) { return OX + b * CW; }
  function cellRect(f, b) { return { x: colX(b), y: BASE - (f + 1) * CH, w: CW, h: CH }; }
  function inner(f, b, w) { var q = cellRect(f, b); return { x: q.x + 2, y: q.y + 2, w: (w || 1) * CW - 4, h: CH - 4 }; }
  function floorY(f) { return f === -2 ? OBS.y : f === -3 ? BASE + 8 : f === -5 ? BASE + 112 : f === -6 ? BASE + 162 : f < 0 ? SURF : BASE - f * CH - 9; } // (-1 the front of the bailey, -3 the top of the flying bridge, -5 and -6 the bailey's back and middle rows)
  function rowAt(y) { return Math.floor((BASE - y) / CH); }
  function blockAt(x) { return x < OX || x >= OX + BLOCKS * CW ? -1 : Math.floor((x - OX) / CW); }
  var STX = OX - 11; // 3.8: the middle of the spiral-stair tower on the left of the castle
  CS.G.STX = STX;
  function cellAt(x) { return Math.max(0, Math.min(BLOCKS * 4 - 1, Math.floor((x - OX) / CELL))); }
  function cellMid(i) { return OX + i * CELL + CELL / 2; }
  CS.cellRect = cellRect; CS.floorY = floorY; CS.inner = inner;

  /* ---------- what you can build ---------- */
  CS.ROOMS = {
    hall: { name: 'Throne hall', core: 1, anchor: 1, desc: 'The heart of the castle: Aiu\'s throne under a candle chandelier, banners in his colors, stone pillars. It can be widened, but it never moves.' },
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
    windmill: { name: 'Windmill', cost: 90, stage: 2, back: 1, desc: 'A windmill up on the hill behind the castle, its sails turning in the wind. (It doesn\'t take a spot in the courtyard.)' },
    statue: { name: 'Aiu statue', cost: 200, stage: 4, desc: 'A stone statue of Aiu, for the grown-up Totem.' }
  };
  CS.OBS = { name: 'Observatory', cost: 180, stage: 3, desc: 'A little domed telescope on top of the elevator tower. Aiu rides up to stargaze at night.' };
  CS.SLOTS = { L1: 38, L2: 76, R1: 116, R2: 232, R3: 272, R4: 310 }; // three on each side of the front steps
  var SIDE = { L1: 'a', L2: 'a', R1: 'a', R2: 'b', R3: 'b', R4: 'b' };
  CS.SLOT_ORDER = ['L1', 'L2', 'R1', 'R2', 'R3', 'R4'];
  /* ---------- the bailey: the fenced yard below the motte (3.6). Four plots for its buildings, six spots in front ---------- */
  CS.BAILEY = {
    barracks: { name: 'Barracks', cost: 120, stage: 2, desc: 'A long timber house with bunks, shields on the wall and a rack of spears (ready for the guards, when raids come in a later version).' },
    cowshed: { name: 'Cowshed', cost: 80, stage: 1, desc: 'A little shed and a pen with two cows swishing their tails.' },
    horses: { name: 'Stables', cost: 100, stage: 2, desc: 'Horses in their stalls, poking their heads out over the half-doors.' },
    smithy: { name: 'Workshop', cost: 90, stage: 1, desc: 'A smithy: the forge glows, the anvil rings, smoke curls out of the chimney.' },
    granary: { name: 'Granary', cost: 70, stage: 1, desc: 'A storehouse up on stone feet (to keep the mice out), with sacks of grain by the door.' }
  };
  CS.PLOTS = { B1: { x: 80, row: -5 }, B2: { x: 260, row: -5 }, B3: { x: 90, row: -6 }, B4: { x: 250, row: -6 } };
  CS.PLOT_ORDER = ['B1', 'B2', 'B3', 'B4'];
  function thatch(c, x, y, w, h) { // a thatched roof over x .. x+w, its eave at y, rising h
    for (var i = 0; i <= h; i++) { var inset = Math.round(i * (w * 0.18) / h); R(c, x + inset - 1, y - i, w - 2 * inset + 2, 1, P.ink); if (i) R(c, x + inset, y - i, w - 2 * inset, 1, i % 3 === 0 ? '#c9a24f' : '#e2bd62'); }
    for (var t = x + 3; t < x + w - 3; t += 4) px(c, t, y - 1, '#a8823a');
  }
  function timber(c, x, y, w, h) { R(c, x - 1, y - h - 1, w + 2, h + 1, P.ink); R(c, x, y - h, w, h, P.wood); for (var j = y - h + 3; j < y; j += 4) R(c, x, j, w, 1, P.bark); for (var i = x; i < x + w; i += 12) R(c, i, y - h, 1, h, P.bark); }
  var BART = {
    barracks: function (c, x, y, sc) {
      var acc = sc.accent || P.red, lit = sc.phase === 'night' || sc.phase === 'dusk'; timber(c, x - 30, y, 60, 20); thatch(c, x - 34, y - 20, 68, 14);
      R(c, x - 5, y - 13, 10, 13, P.ink); R(c, x - 4, y - 12, 8, 12, P.bark); px(c, x + 2, y - 6, P.yellow);
      [-20, 13].forEach(function (u) { R(c, x + u, y - 15, 8, 6, P.ink); R(c, x + u + 1, y - 14, 6, 4, lit ? P.yellow : P.navy); });
      [-26, 22].forEach(function (u) { disc(c, x + u, y - 6, 3, P.ink); disc(c, x + u, y - 6, 2, acc); px(c, x + u, y - 6, P.yellow); }); // shields
      R(c, x + 32, y - 2, 8, 2, P.bark); [33, 36, 39].forEach(function (u) { R(c, x + u, y - 22, 1, 20, P.bark); px(c, x + u, y - 23, P.silver); px(c, x + u, y - 24, P.silver); }); // a spear rack
    },
    cowshed: function (c, x, y, sc) {
      var f = sc.f || 0; R(c, x - 30, y - 22, 3, 22, P.bark); R(c, x - 6, y - 22, 3, 22, P.bark); thatch(c, x - 34, y - 22, 34, 9); ell(c, x - 18, y - 4, 9, 4, '#e8c46a'); // the shed with hay
      for (var p = x - 2; p <= x + 34; p += 6) R(c, p, y - 9, 1, 9, P.bark); R(c, x - 2, y - 8, 37, 1, P.wood); R(c, x - 2, y - 4, 37, 1, P.wood); // the pen
      [[x + 8, 0], [x + 24, 1]].forEach(function (q) { var cx = q[0], hd = q[1] ? -1 : 1, bob = (f + q[1] * 7) % 20 < 10 ? 0 : 1; R(c, cx - 6, y - 11, 13, 6, P.ink); R(c, cx - 5, y - 10, 11, 4, P.white); R(c, cx - 2, y - 10, 3, 2, P.ink); R(c, cx + 2, y - 8, 2, 2, P.ink); R(c, cx - 5, y - 5, 1, 4, P.ink); R(c, cx + 4, y - 5, 1, 4, P.ink); R(c, cx + hd * 7 - 2, y - 10 + bob, 5, 4, P.ink); R(c, cx + hd * 7 - 1, y - 9 + bob, 3, 2, P.white); px(c, cx + hd * 8, y - 7 + bob, P.pink); var tl = (f + q[1] * 5) % 8 < 4 ? 1 : 0; R(c, cx - hd * 7, y - 10 + tl, 1, 4, P.ink); }); // two cows (heads bob, tails swish)
    },
    horses: function (c, x, y, sc) {
      var f = sc.f || 0; timber(c, x - 32, y, 64, 16); thatch(c, x - 35, y - 16, 70, 10);
      [-18, 6].forEach(function (u, i) { R(c, x + u - 1, y - 14, 14, 14, P.ink); R(c, x + u, y - 13, 12, 6, '#2a2433'); R(c, x + u, y - 7, 12, 7, P.bark); R(c, x + u, y - 7, 12, 1, P.wood); var nod = (f + i * 9) % 24 < 3 ? 1 : 0, col = i ? P.white : P.bark; R(c, x + u + 3, y - 16 + nod, 6, 8, P.ink); R(c, x + u + 4, y - 15 + nod, 4, 7, col); R(c, x + u + 4, y - 17 + nod, 1, 2, P.ink); R(c, x + u + 7, y - 17 + nod, 1, 2, P.ink); px(c, x + u + 5, y - 13 + nod, P.ink); if (!i) R(c, x + u + 5, y - 15 + nod, 2, 4, P.white); }); // two horses over their half-doors
      box(c, x + 24, y - 9, 12, 9, '#e8c46a', P.yellow, P.orange); R(c, x + 24, y - 5, 12, 1, P.orange); // a hay bale
    },
    smithy: function (c, x, y, sc) {
      var f = sc.f || 0; R(c, x - 31, y - 22, 62, 22, P.ink); R(c, x - 30, y - 21, 60, 21, '#8a8f9e'); for (var j = y - 18; j < y; j += 4) { R(c, x - 30, j, 60, 1, '#6f7486'); for (var i = x - 30 + ((j / 4) % 2) * 4; i < x + 30; i += 8) R(c, i, j - 3, 1, 3, '#6f7486'); } // stone walls
      thatch(c, x - 34, y - 22, 68, 10); R(c, x + 16, y - 40, 8, 14, P.ink); R(c, x + 17, y - 39, 6, 13, '#6f7486'); for (var s = 0; s < 3; s++) { var k = (f + s * 6) % 18; c.globalAlpha = 1 - k / 18; disc(c, x + 20 + Math.round(Math.sin((f + s * 5) * 0.3) * 2), y - 42 - k, 1 + (s % 2), P.silver); } c.globalAlpha = 1; // the chimney and its smoke
      R(c, x - 22, y - 16, 26, 16, '#2a2433'); var glow = f % 6 < 3 ? P.orange : P.yellow; R(c, x - 20, y - 6, 10, 6, P.ink); R(c, x - 19, y - 5, 8, 3, glow); c.globalAlpha = 0.25; disc(c, x - 15, y - 6, 8, P.orange); c.globalAlpha = 1; // the open forge
      R(c, x - 6, y - 5, 8, 2, P.ink); R(c, x - 4, y - 3, 4, 3, P.ink); if (f % 8 < 2) { px(c, x - 2, y - 8, P.yellow); px(c, x + 1, y - 9, P.white); px(c, x - 5, y - 8, P.yellow); } // the anvil (and sparks)
      box(c, x + 8, y - 10, 9, 10, P.bark, P.wood); R(c, x + 8, y - 6, 9, 1, P.ink); // a barrel
    },
    granary: function (c, x, y, sc) {
      [-18, -4, 10].forEach(function (u) { R(c, x + u, y - 6, 6, 6, P.ink); R(c, x + u + 1, y - 5, 4, 5, P.silver); R(c, x + u - 1, y - 7, 8, 2, P.ink); R(c, x + u, y - 7, 6, 1, P.slate); }); // staddle stones
      timber(c, x - 24, y - 7, 46, 18); thatch(c, x - 28, y - 25, 54, 12); R(c, x - 4, y - 21, 8, 10, P.ink); R(c, x - 3, y - 20, 6, 9, P.bark);
      [[22, P.sand], [28, '#d9c7a8'], [25, P.sand]].forEach(function (q, i) { ell(c, x + q[0], y - 4 - (i === 2 ? 5 : 0), 4, 4, P.ink); ell(c, x + q[0], y - 4 - (i === 2 ? 5 : 0), 3, 3, q[1]); px(c, x + q[0], y - 7 - (i === 2 ? 5 : 0), P.bark); }); // grain sacks
    }
  };
  function plotRect(pl) { var p = CS.PLOTS[pl], y = floorY(p.row); return { x: p.x - 36, y: y - 42, w: 72, h: 44 }; }
  CS.SEED = { v: 5, rooms: { living: { f: 0, b: 0, w: 1 }, hall: { f: 0, b: 1, w: 1 }, kitchen: { f: 0, b: 2, w: 1 }, bedroom: { f: 1, b: 0, w: 1 }, bath: { f: 1, b: 1, w: 1 } }, walls: {}, stairs: { '0': 2 }, orn: { L1: 'well', L2: 'board', R1: 'cart' }, obs: false }; // (2 = the free starter staircase)
  // the ground that's open at each stage: the top two floors from the start, then a floor at Sprout and one at Scout
  CS.open = function (stage, f) { return f <= 1 || stage >= f; }; // floors 0-1 from the start, then one floor at Sprout, Scout and Ranger
  CS.openNeeds = function (f) { return f <= 1 ? 0 : f; };

  /* ---------- the layout (the setting 'castle', v5): rooms { type: { f, b, w } }, walls { 'f,b': 'arch' }, stairs { 'f,cell': 1 } ---------- */
  CS.layout = function (S) {
    var v = S && C.setting(S, 'castle', null), src = v && v.v >= 5 ? v : fromOld(v), out = { rooms: {}, walls: {}, stairs: {}, orn: {}, obs: !!src.obs, mill: !!src.mill }, own = {}, left = [];
    function fits(f, b, w) { if (f < 0 || f >= ROWS || b < 0 || b + w > BLOCKS) return false; for (var i = 0; i < w; i++) if (own[f + ',' + (b + i)]) return false; return true; }
    function put(t, f, b, w) { out.rooms[t] = { f: f, b: b, w: w }; for (var i = 0; i < w; i++) own[f + ',' + (b + i)] = t; }
    var hr = (src.rooms || {}).hall, hw = hr ? Math.max(1, Math.min(BLOCKS, hr.w | 0 || 1)) : 1, hb = hr && hr.b === 0 && hw > 1 ? 0 : 1; if (hb + hw > BLOCKS) hw = BLOCKS - hb; put('hall', 0, hb, hw); // the throne hall: always on the ground floor, in the middle
    Object.keys(src.rooms || {}).sort().forEach(function (t) { var r = src.rooms[t]; if (t === 'hall' || !CS.ROOMS[t] || !r) return; var f = r.f | 0, b = r.b | 0, w = Math.max(1, Math.min(BLOCKS, r.w | 0 || 1)); if (fits(f, b, w)) put(t, f, b, w); else left.push(t); });
    ['living', 'kitchen', 'bedroom', 'bath'].forEach(function (t) { if (!out.rooms[t] && left.indexOf(t) < 0) left.push(t); }); // the four first rooms are always there
    left.forEach(function (t) { for (var f = 0; f < ROWS; f++) for (var b = 0; b < BLOCKS; b++) if (!out.rooms[t] && fits(f, b, 1)) put(t, f, b, 1); }); // (a room that lost its spot moves to the first free chamber)
    Object.keys(src.walls || {}).forEach(function (k) { if (/^[0-4],[12]$/.test(k) && src.walls[k] === 'arch') out.walls[k] = 'arch'; });
    out.furn = {}; Object.keys(src.furn || {}).forEach(function (fp) { var id = src.furn[fp]; if (CS.FURN[fp] && CS.FURN[fp].items[id]) out.furn[fp] = id; }); // 3.8: bought furniture in use
    out.decor = {}; Object.keys(src.decor || {}).forEach(function (t) { var d = src.decor[t]; if (CS.ROOMS[t] && CS.DESIGNS[d]) out.decor[t] = d; }); // 3.7: each room's design (from the Corner Mart)
    Object.keys(src.stairs || {}).forEach(function (k) { var mm = /^([0-3])(,\d+)?$/.exec(k); if (!mm) return; var v0 = src.stairs[k] === 2 ? 2 : 1, cur = out.stairs[mm[1]]; out.stairs[mm[1]] = cur === 1 || v0 === 1 ? 1 : 2; }); // 3.8: a flight of the spiral stair per floor (a 3.5-3.7 staircase moves into the tower)
    var oseen = {}; CS.SLOT_ORDER.forEach(function (sl) { var t = (src.orn || {})[sl]; if (t === 'windmill') { out.mill = true; t = null; } out.orn[sl] = CS.ORN[t] && !oseen[t] ? t : null; if (out.orn[sl]) oseen[t] = 1; });
    var bseen = {}; out.bailey = {}; CS.PLOT_ORDER.forEach(function (pl) { var t = (src.bailey || {})[pl]; out.bailey[pl] = CS.BAILEY[t] && !bseen[t] ? t : null; if (out.bailey[pl]) bseen[t] = 1; });
    ['board', 'cart'].forEach(function (t) { if (!oseen[t]) { var sl = CS.SLOT_ORDER.filter(function (x) { return !out.orn[x]; })[0]; if (sl) { out.orn[sl] = t; oseen[t] = 1; } } });
    if (!(src.v >= 4)) wellByPond(out.orn);
    return out;
  };
  function fromOld(v) { // a 3.x castle (rooms by 'floor,column'): each room keeps its chamber (a room where the hall goes moves over)
    var o = !v ? CS.SEED : v.v === 1 && v.rooms ? fromV1(v) : v, out = { v: o.v, rooms: {}, stairs: { '0': 2 }, orn: o.orn, obs: o.obs, mill: o.mill };
    if (o === CS.SEED) return o;
    Object.keys(o.rooms || {}).forEach(function (k) { var m = /^([0-3]),([0-2])$/.exec(k); if (m) out.rooms[o.rooms[k]] = { f: +m[1], b: +m[2], w: 1 }; });
    return out;
  }
  function wellByPond(orn) {
    var ord = CS.SLOT_ORDER, pi = ord.filter(function (s) { return orn[s] === 'pond'; })[0], wi = ord.filter(function (s) { return orn[s] === 'well'; })[0]; if (!pi || !wi) return;
    var i = ord.indexOf(pi), j = ord.indexOf(wi); if (Math.abs(i - j) === 1 && SIDE[ord[i]] === SIDE[ord[j]]) return;
    var spot = [i - 1, i + 1].filter(function (n) { return n >= 0 && n < ord.length && SIDE[ord[n]] === SIDE[pi]; }).sort(function (a, b) { return (orn[ord[a]] ? 1 : 0) - (orn[ord[b]] ? 1 : 0); })[0]; if (spot === undefined) return;
    var t = orn[ord[spot]]; orn[ord[spot]] = 'well'; orn[wi] = t || null;
  }
  CS.wellByPond = wellByPond;
  function fromV1(v) { // a 3.0 castle (small rooms, 4 x 4): its rooms move into the grid, each once
    var out = { v: 3, rooms: { '0,0': 'living', '0,2': 'kitchen', '1,0': 'bedroom', '1,1': 'bath' }, orn: Object.assign({}, v.orn || {}), obs: false }, have = { living: 1, kitchen: 1, bedroom: 1, bath: 1 }, free = ['1,2', '2,0', '2,1', '2,2', '3,0', '3,1', '3,2'];
    Object.keys(v.rooms).sort().forEach(function (k) { var t = v.rooms[k] === 'workshop' ? 'garage' : v.rooms[k]; if (!CS.ROOMS[t] || have[t] || !free.length) return; out.rooms[free.shift()] = t; have[t] = 1; });
    return out;
  }
  function owners(L) { var o = {}; Object.keys(L.rooms).forEach(function (t) { var r = L.rooms[t]; for (var i = 0; i < r.w; i++) o[r.f + ',' + (r.b + i)] = t; }); return o; }
  CS.owners = owners;
  CS.find = function (L, type) { return L.rooms[type] || null; };
  CS.has = function (L, type) { return !!L.rooms[type]; };
  CS.hasOrn = function (L, type) { if (type === 'windmill') return L.mill ? 'back' : null; return CS.SLOT_ORDER.filter(function (sl) { return L.orn[sl] === type; })[0] || null; };
  function roomBox(L, t) { var r = L.rooms[t]; return inner(r.f, r.b, r.w); }
  CS.roomBox = roomBox;
  // building: an empty chamber on an open floor takes a new room; a room widens into an empty chamber beside it
  CS.canBuildAt = function (L, stage, f, b) { if (owners(L)[f + ',' + b]) return 'taken'; if (!CS.open(stage, f)) return 'locked'; return ''; };
  CS.canWiden = function (L, stage, t, dir) { var r = L.rooms[t], o = owners(L), b = dir < 0 ? r.b - 1 : r.b + r.w; return b >= 0 && b < BLOCKS && !o[r.f + ',' + b] && CS.open(stage, r.f); };
  CS.canRemove = function (L, t) { return !!L.rooms[t] && !CS.ROOMS[t].core; };
  CS.moveTo = function (L, stage, t, f, b) { // where room t goes if you tap chamber (f, b): a new rooms map, or null
    var r = L.rooms[t]; if (!r || CS.ROOMS[t].anchor || !CS.open(stage, f)) return null;
    var o = owners(L), starts = [b, b - r.w + 1].concat(r.w === 3 ? [b - 1] : []);
    for (var i = 0; i < starts.length; i++) { var s = starts[i], ok = s >= 0 && s + r.w <= BLOCKS; for (var j = 0; ok && j < r.w; j++) { var ow = o[f + ',' + (s + j)]; if (ow && ow !== t) ok = false; } if (ok && !(s === r.b && f === r.f)) { var n = Object.assign({}, L.rooms); n[t] = { f: f, b: s, w: r.w }; return n; } }
    var other = o[f + ',' + b], q = other && L.rooms[other]; // a room of the same width there: they swap
    if (q && other !== t && !CS.ROOMS[other].anchor && q.w === r.w && CS.open(stage, r.f)) { var n2 = Object.assign({}, L.rooms); n2[t] = { f: q.f, b: q.b, w: r.w }; n2[other] = { f: r.f, b: r.b, w: q.w }; return n2; }
    return null;
  };
  CS.canStairs = function (L, stage, f) { return f >= 0 && f < ROWS - 1 && CS.open(stage, f) && CS.open(stage, f + 1) && !L.stairs[f]; };
  CS.save = function (L) { var cur = CS.current(); return app().setSetting('castle', { v: 5, rooms: L.rooms || cur.rooms, walls: L.walls || cur.walls, stairs: L.stairs || cur.stairs, orn: L.orn || cur.orn, bailey: L.bailey || cur.bailey, decor: L.decor || cur.decor, furn: L.furn || cur.furn, obs: L.obs !== undefined ? !!L.obs : !!cur.obs, mill: L.mill !== undefined ? !!L.mill : !!cur.mill }); };

  /* ---------- the look of each land ---------- */
  CS.style = function (sc) { if (sc.house === 'cave') return 'cave'; if (sc.biome === 'tundra') return 'ice'; if (sc.biome === 'desert') return 'desert'; return 'stone'; };
  var STY = {
    stone: { wall: '#a9aebb', wall2: '#7d8294', trim: P.dark, roof: P.red, roof2: P.plum, frame: '#9aa0ad', frame2: '#6f7486', rock: P.slate, empty: '#5d6170', empty2: '#4d5160' },
    ice: { wall: P.white, wall2: '#a9d6e8', trim: P.sky, roof: '#bfe6f5', roof2: P.sky, frame: '#d8eef7', frame2: '#9fcfe3', rock: P.white, empty: '#8fb9cc', empty2: '#7aa6ba' },
    desert: { wall: '#e3a76b', wall2: '#b9733f', trim: P.bark, roof: '#f0c27a', roof2: P.orange, frame: '#d99a5e', frame2: '#a8683a', rock: '#a5673a', empty: '#9c6a45', empty2: '#86593a' },
    cave: { wall: '#6b7390', wall2: '#4b5068', trim: P.ink, roof: P.green, roof2: P.teal, frame: '#6b7390', frame2: '#474c63', rock: '#5b6178', empty: '#3e4256', empty2: '#33374a' }
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
    hall: function (c, b, sc) { // the throne hall: the castle's heart (it stays put)
      var acc = sc.accent || P.red, f = sc.f || 0; BG.hall(c, b);
      R(c, b.x, b.y + b.h - 6, b.w, 3, acc); R(c, b.x, b.y + b.h - 6, b.w, 1, P.yellow); // the red carpet
      pillar(c, b.x + 8, b); pillar(c, b.x + 84, b); banner(c, b.x + 22, b.y + 8, sc); banner(c, b.x + 70, b.y + 8, sc);
      box(c, b.x + 24, b.y + b.h - 12, 44, 5, '#bfae8d', '#e4d6bd'); box(c, b.x + 30, b.y + b.h - 16, 32, 5, '#bfae8d', '#e4d6bd'); // the dais
      R(c, b.x + 37, b.y + b.h - 48, 18, 33, P.ink); R(c, b.x + 38, b.y + b.h - 47, 16, 31, P.yellow); R(c, b.x + 40, b.y + b.h - 44, 12, 22, acc); R(c, b.x + 41, b.y + b.h - 43, 2, 20, P.white); // the throne's tall back
      tri(c, b.x + 46, b.y + b.h - 56, 7, 0.9, P.ink); tri(c, b.x + 46, b.y + b.h - 55, 6, 0.8, P.yellow); disc(c, b.x + 46, b.y + b.h - 50, 2, sc.phase === 'night' ? P.cyan : P.sky); // its crest with a totem gem
      R(c, b.x + 34, b.y + b.h - 26, 4, 9, P.ink); R(c, b.x + 54, b.y + b.h - 26, 4, 9, P.ink); R(c, b.x + 35, b.y + b.h - 25, 2, 8, P.orange); R(c, b.x + 55, b.y + b.h - 25, 2, 8, P.orange); R(c, b.x + 37, b.y + b.h - 22, 18, 5, P.ink); R(c, b.x + 38, b.y + b.h - 21, 16, 3, acc); // armrests and the cushion
      R(c, b.x + 46, b.y, 1, 6, P.dark); R(c, b.x + 36, b.y + 6, 21, 2, P.yellow); [37, 42, 46, 50, 55].forEach(function (u, i) { R(c, b.x + u, b.y + 3, 1, 3, P.white); px(c, b.x + u, b.y + 2 - ((f + i) % 3 === 0 ? 1 : 0), (f + i) % 2 ? P.yellow : P.orange); }); // the chandelier
    },
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
  /* ---------- wide rooms: each room's walls and floor (BG) run the whole width; the room's own furniture fills its first 4 cells,
     and each extra 4 cells (EXT) gets more of the room's kind of furniture ---------- */
  var BG = {
    hall: function (c, b) { R(c, b.x, b.y, b.w, b.h, '#cdbb9c'); for (var j = 0; j < b.h - 8; j += 6) { R(c, b.x, b.y + j, b.w, 1, '#b9a684'); for (var i = ((j / 6) % 2) * 8; i < b.w; i += 16) R(c, b.x + i, b.y + j, 1, 6, '#b9a684'); } tiles(c, b.x, b.y + b.h - 7, b.w, 7, '#efe4cf', '#cbbd9f', 4); R(c, b.x, b.y + b.h - 7, b.w, 1, P.ink); },
    living: function (c, b) { var wp = '#e6c68e'; R(c, b.x, b.y, b.w, b.h, '#f3dcae'); for (var j = 6; j < b.h - 24; j += 8) for (var i = (j / 2) % 8; i < b.w; i += 12) { px(c, b.x + i + 3, b.y + j, wp); px(c, b.x + i + 2, b.y + j + 1, wp); px(c, b.x + i + 4, b.y + j + 1, wp); px(c, b.x + i + 3, b.y + j + 2, wp); } R(c, b.x, b.y + b.h - 24, b.w, 17, '#e9c994'); R(c, b.x, b.y + b.h - 24, b.w, 1, P.wood); floorBand(c, b, P.wood, P.bark); for (var fx = 4; fx < b.w; fx += 11) R(c, b.x + fx, b.y + b.h - 6, 1, 6, P.bark); },
    kitchen: function (c, b) { R(c, b.x, b.y, b.w, b.h, '#f7ead0'); tiles(c, b.x + 20, b.y + 26, b.w - 20, 12, '#ffd9a0', P.white, 4); /* (the backsplash starts where the kitchen's own does) */ tiles(c, b.x, b.y + b.h - 7, b.w, 7, P.red, P.white, 4); R(c, b.x, b.y + b.h - 7, b.w, 1, P.ink); },
    bedroom: function (c, b) { stripes(c, b.x, b.y, b.w, b.h, '#d6c6ef', '#c7b2ea', 6, 2); floorBand(c, b, '#a993d6', P.white); },
    bath: function (c, b) { R(c, b.x, b.y, b.w, b.h, P.white); grid(c, b.x, b.y, b.w, 30, '#dce8f0', 6); R(c, b.x, b.y + 30, b.w, b.h - 37, '#8fe3ea'); grid(c, b.x, b.y + 30, b.w, b.h - 37, '#7fd6de', 6); R(c, b.x, b.y + 30, b.w, 1, P.sky); tiles(c, b.x, b.y + b.h - 7, b.w, 7, P.white, P.silver, 4); R(c, b.x, b.y + b.h - 7, b.w, 1, P.ink); },
    office: function (c, b) { stripes(c, b.x, b.y, b.w, b.h, '#cad9ea', '#bccde2', 8, 1); floorBand(c, b, P.slate, P.silver); },
    garage: function (c, b) { R(c, b.x, b.y, b.w, b.h, '#a9b4c2'); grid(c, b.x, b.y, b.w, b.h - 7, '#9aa6b5', 8); R(c, b.x, b.y + b.h - 7, b.w, 7, P.dark); R(c, b.x, b.y + b.h - 7, b.w, 1, P.ink); },
    greenhouse: function (c, b) { R(c, b.x, b.y, b.w, b.h, '#1f3b33'); grid(c, b.x, b.y, b.w, b.h, '#27493f', 8); R(c, b.x, b.y + b.h - 7, b.w, 7, P.dark); R(c, b.x, b.y + b.h - 7, b.w, 1, P.ink); },
    library: function (c, b) { planks(c, b.x, b.y, b.w, b.h - 7, '#8a5634', '#734429'); floorBand(c, b, '#6b3f2a', P.ink); R(c, b.x, b.y + b.h - 6, b.w, 2, P.plum); },
    music: function (c, b) { R(c, b.x, b.y, b.w, b.h, '#5d4a7a'); for (var j = 0; j < b.h - 8; j += 6) for (var i = (j / 6 % 2) * 3; i < b.w; i += 6) R(c, b.x + i, b.y + j, 3, 3, '#6e5a8c'); floorBand(c, b, P.wood, P.bark); },
    studio: function (c, b) { R(c, b.x, b.y, b.w, b.h, '#f6f3ea'); floorBand(c, b, '#d9c7a8', P.wood); },
    lab: function (c, b) { R(c, b.x, b.y, b.w, b.h, '#eef3f8'); grid(c, b.x, b.y, b.w, b.h - 7, '#d6e0ea', 6); floorBand(c, b, P.silver, P.white); },
    stable: function (c, b) { planks(c, b.x, b.y, b.w, b.h - 7, P.wood, P.bark); R(c, b.x, b.y + b.h - 8, b.w, 8, '#e8c46a'); for (var i = 0; i < b.w; i += 2) px(c, b.x + i, b.y + b.h - 9 - (i % 3), '#e8c46a'); }
  };
  function pillar(c, x, b) { R(c, x - 4, b.y, 9, b.h - 7, P.ink); R(c, x - 3, b.y + 4, 7, b.h - 13, '#e4d6bd'); R(c, x - 1, b.y + 4, 1, b.h - 13, '#f3eadb'); R(c, x + 2, b.y + 4, 1, b.h - 13, '#c2b293'); R(c, x - 5, b.y, 11, 4, '#bfae8d'); R(c, x - 5, b.y + b.h - 11, 11, 4, '#bfae8d'); }
  function banner(c, x, y, sc) { var acc = sc.accent || P.red; R(c, x - 6, y, 13, 2, P.wood); R(c, x - 5, y + 2, 11, 18, P.ink); R(c, x - 4, y + 2, 9, 16, acc); tri(c, x, y + 18, 4, 1.2, acc); disc(c, x, y + 9, 2, P.yellow); px(c, x, y + 9, P.white); }
  var EXT = {
    hall: function (c, e, sc) { pillar(c, e.x + 14, e); pillar(c, e.x + 82, e); banner(c, e.x + 34, e.y + 6, sc); banner(c, e.x + 62, e.y + 6, sc); box(c, e.x + 28, e.y + e.h - 20, 40, 4, P.wood, P.sand); R(c, e.x + 30, e.y + e.h - 16, 2, 9, P.bark); R(c, e.x + 64, e.y + e.h - 16, 2, 9, P.bark); [36, 46, 58].forEach(function (u, i) { R(c, e.x + u, e.y + e.h - 24, 3, 4, i === 1 ? P.yellow : P.silver); }); disc(c, e.x + 52, e.y + e.h - 22, 2, P.red); },
    living: function (c, e, sc) {
      box(c, e.x + 6, e.y + e.h - 36, 30, 29, '#b9a68a', '#d8c7a8'); R(c, e.x + 4, e.y + e.h - 38, 34, 4, P.bark); R(c, e.x + 12, e.y + e.h - 26, 18, 19, P.ink); var f = sc.f || 0; [P.red, P.orange, P.yellow].forEach(function (col, i) { tri(c, e.x + 18 + i * 3 + (f + i) % 2, e.y + e.h - 15 - i * 3, 6 - i, 0.6, col); }); R(c, e.x + 12, e.y + e.h - 9, 18, 2, P.dark); // the fireplace
      picture(c, e.x + 13, e.y + 8, 16, 12, sc, false);
      box(c, e.x + 44, e.y + e.h - 24, 20, 10, P.green, P.lime, P.teal); box(c, e.x + 44, e.y + e.h - 34, 20, 11, P.green); box(c, e.x + 42, e.y + e.h - 28, 5, 14, P.green); box(c, e.x + 61, e.y + e.h - 28, 5, 14, P.green); R(c, e.x + 46, e.y + e.h - 14, 2, 7, P.bark); R(c, e.x + 60, e.y + e.h - 14, 2, 7, P.bark); // an armchair
      box(c, e.x + 72, e.y + 10, 18, e.h - 17, P.wood, P.sand, P.bark); for (var s = 0; s < 3; s++) { R(c, e.x + 73, e.y + 26 + s * 14, 16, 1, P.bark); for (var k = 0; k < 4; k++) R(c, e.x + 74 + k * 4, e.y + 16 + s * 14, 3, 9, [P.red, P.blue, P.green, P.yellow, P.plum][(s + k) % 5]); }
    },
    kitchen: function (c, e, sc) {
      win(c, e.x + 36, e.y + 6, 22, 16, sc); R(c, e.x + 10, e.y + 6, 1, 8, P.dark); R(c, e.x + 4, e.y + 14, 14, 2, P.dark); [6, 11, 16].forEach(function (u, i) { R(c, e.x + u, e.y + 16, 3, 4, [P.silver, P.orange, P.silver][i]); }); // a pot rack
      box(c, e.x + 22, e.y + e.h - 24, 50, 4, P.wood, P.sand); R(c, e.x + 25, e.y + e.h - 20, 2, 13, P.bark); R(c, e.x + 67, e.y + e.h - 20, 2, 13, P.bark); ell(c, e.x + 47, e.y + e.h - 26, 6, 2, P.white); disc(c, e.x + 45, e.y + e.h - 28, 2, P.red); disc(c, e.x + 49, e.y + e.h - 28, 2, P.orange); px(c, e.x + 47, e.y + e.h - 30, P.lime); // the dining table with a fruit bowl
      [14, 78].forEach(function (u) { box(c, u === 14 ? e.x + 10 : e.x + 76, e.y + e.h - 34, 4, 20, P.bark, P.wood); box(c, u === 14 ? e.x + 10 : e.x + 72, e.y + e.h - 17, 10, 3, P.bark, P.wood); R(c, u === 14 ? e.x + 11 : e.x + 80, e.y + e.h - 14, 1, 7, P.bark); }); // two chairs
    },
    bedroom: function (c, e, sc) {
      box(c, e.x + 6, e.y + 10, 26, e.h - 17, P.wood, P.sand, P.bark); R(c, e.x + 19, e.y + 11, 1, e.h - 19, P.bark); px(c, e.x + 17, e.y + 36, P.yellow); px(c, e.x + 21, e.y + 36, P.yellow); // a wardrobe
      box(c, e.x + 42, e.y + e.h - 22, 26, 15, P.wood, P.sand, P.bark); R(c, e.x + 43, e.y + e.h - 15, 24, 1, P.bark); box(c, e.x + 47, e.y + e.h - 40, 16, 18, P.silver); R(c, e.x + 48, e.y + e.h - 39, 14, 16, '#c9f3f8'); R(c, e.x + 50, e.y + e.h - 37, 2, 8, P.white); // a dresser and its mirror
      box(c, e.x + 74, e.y + e.h - 17, 16, 10, P.red, P.pink); R(c, e.x + 74, e.y + e.h - 13, 16, 1, P.yellow); R(c, e.x + 78, e.y + e.h - 21, 4, 4, P.yellow); px(c, e.x + 85, e.y + e.h - 19, P.blue); // a toy chest
      win(c, e.x + 72, e.y + 8, 16, 16, sc);
    },
    bath: function (c, e, sc) {
      R(c, e.x + 8, e.y + 4, 30, 2, P.silver); box(c, e.x + 10, e.y + 6, 26, e.h - 13, '#c9f3f8'); for (var i = 0; i < 4; i++) R(c, e.x + 12 + i * 6, e.y + 6, 4, e.h - 30, i % 2 ? P.pink : P.white); R(c, e.x + 26, e.y + 8, 4, 2, P.silver); for (var d = 0; d < 4; d++) px(c, e.x + 25 + d * 2, e.y + 14 + ((sc.f || 0) + d * 3) % 10, P.sky); // a shower
      box(c, e.x + 46, e.y + e.h - 18, 14, 11, P.wood, P.sand); R(c, e.x + 48, e.y + e.h - 21, 10, 3, P.pink); R(c, e.x + 50, e.y + e.h - 22, 4, 2, P.sky); // a laundry basket
      plant(c, e.x + 72, e.y + e.h - 14); R(c, e.x + 64, e.y + 16, 22, 1, P.silver); box(c, e.x + 66, e.y + 17, 8, 14, P.sky, P.white); box(c, e.x + 76, e.y + 17, 8, 12, P.yellow, P.white);
    },
    office: function (c, e, sc) {
      box(c, e.x + 6, e.y + 8, 30, 20, '#e8dcc0'); R(c, e.x + 9, e.y + 12, 10, 6, P.green); R(c, e.x + 20, e.y + 13, 12, 8, P.green); R(c, e.x + 12, e.y + 20, 6, 4, P.green); // a world map
      box(c, e.x + 8, e.y + e.h - 30, 16, 23, P.slate, P.silver); [0, 1, 2].forEach(function (i) { R(c, e.x + 9, e.y + e.h - 22 + i * 7, 14, 1, P.dark); R(c, e.x + 14, e.y + e.h - 27 + i * 7, 4, 1, P.silver); }); // a filing cabinet
      box(c, e.x + 40, e.y + e.h - 24, 40, 4, P.wood, P.sand); R(c, e.x + 42, e.y + e.h - 20, 2, 13, P.bark); R(c, e.x + 76, e.y + e.h - 20, 2, 13, P.bark); box(c, e.x + 52, e.y + e.h - 34, 16, 10, P.white, null, P.silver); R(c, e.x + 55, e.y + e.h - 36, 10, 2, P.white); // a desk with a printer
      ell(c, e.x + 86, e.y + e.h - 11, 8, 5, P.ink); ell(c, e.x + 86, e.y + e.h - 11, 7, 4, P.orange); ell(c, e.x + 84, e.y + e.h - 13, 3, 1, P.yellow); // a beanbag
    },
    garage: function (c, e, sc) {
      box(c, e.x + 6, e.y + e.h - 26, 40, 5, P.wood, P.sand); R(c, e.x + 8, e.y + e.h - 21, 3, 14, P.bark); R(c, e.x + 41, e.y + e.h - 21, 3, 14, P.bark); box(c, e.x + 12, e.y + e.h - 32, 8, 6, P.slate); box(c, e.x + 26, e.y + e.h - 30, 14, 4, P.red, P.pink); // a workbench, a vise, a toolbox
      box(c, e.x + 8, e.y + 6, 36, 14, '#c9a77a'); for (var t = 0; t < 6; t++) R(c, e.x + 11 + t * 5, e.y + 9, 1, 8, [P.silver, P.red, P.silver, P.yellow, P.blue, P.silver][t]);
      [58, 80].forEach(function (u) { disc(c, e.x + u, e.y + e.h - 14, 6, P.ink); disc(c, e.x + u, e.y + e.h - 14, 4, P.silver); px(c, e.x + u, e.y + e.h - 14, P.ink); }); line(c, e.x + 58, e.y + e.h - 14, e.x + 68, e.y + e.h - 24, P.blue); line(c, e.x + 68, e.y + e.h - 24, e.x + 80, e.y + e.h - 14, P.blue); line(c, e.x + 66, e.y + e.h - 24, e.x + 72, e.y + e.h - 24, P.blue); R(c, e.x + 64, e.y + e.h - 26, 4, 2, P.ink); R(c, e.x + 76, e.y + e.h - 28, 1, 6, P.ink); // a bicycle
    },
    greenhouse: function (c, e, sc) {
      var glow = (sc.f || 0) % 30 < 15; R(c, e.x + 6, e.y + 4, 80, 3, P.ink); R(c, e.x + 7, e.y + 5, 78, 1, glow ? '#ff7ad9' : '#f5a3e4'); c.globalAlpha = 0.12; R(c, e.x + 6, e.y + 7, 80, 32, '#ff7ad9'); c.globalAlpha = 1;
      [12, 26].forEach(function (yy, j) { R(c, e.x + 8, e.y + yy + 14, 76, 4, P.white); for (var p = 0; p < 9; p++) ell(c, e.x + 12 + p * 8, e.y + yy + 11, 3, 3, (p + j) % 2 ? P.lime : P.green); }); R(c, e.x + 8, e.y + 26, 1, e.h - 33, P.silver); R(c, e.x + 83, e.y + 26, 1, e.h - 33, P.silver);
      [[20, P.red], [40, P.orange], [60, P.pink]].forEach(function (q) { box(c, e.x + q[0], e.y + e.h - 15, 10, 8, P.orange, P.yellow); disc(c, e.x + q[0] + 5, e.y + e.h - 19, 3, P.green); px(c, e.x + q[0] + 5, e.y + e.h - 20, q[1]); }); // seedlings in pots
    },
    library: function (c, e, sc) {
      [6, 70].forEach(function (u) { box(c, e.x + u, e.y + 4, 20, e.h - 11, P.bark, P.wood); for (var s = 0; s < 5; s++) { R(c, e.x + u + 1, e.y + 16 + s * 11, 18, 1, P.ink); for (var k = 0; k < 5; k++) R(c, e.x + u + 2 + k * 3, e.y + 8 + s * 11, 2, 8, [P.red, P.blue, P.green, P.yellow, P.plum, P.teal][(s + k + u) % 6]); } });
      box(c, e.x + 32, e.y + e.h - 22, 32, 4, P.wood, P.sand); R(c, e.x + 34, e.y + e.h - 18, 2, 11, P.bark); R(c, e.x + 60, e.y + e.h - 18, 2, 11, P.bark); R(c, e.x + 40, e.y + e.h - 24, 12, 2, P.white); R(c, e.x + 46, e.y + e.h - 25, 1, 3, P.ink); lamp(c, e.x + 58, e.y + e.h - 32, sc, 8); // a reading table, an open book, a lamp
      [36, 41].forEach(function (u, i) { R(c, e.x + u, e.y + 30 - i * 3, 8, 3, [P.red, P.blue][i]); }); R(c, e.x + 34, e.y + 33, 14, 1, P.bark);
    },
    music: function (c, e, sc) {
      var f = sc.f || 0; ell(c, e.x + 30, e.y + e.h - 14, 10, 6, P.ink); ell(c, e.x + 30, e.y + e.h - 14, 9, 5, P.red); ell(c, e.x + 30, e.y + e.h - 16, 7, 2, P.white); [[14, -30], [46, -32]].forEach(function (q) { R(c, e.x + q[0], e.y + e.h + q[1], 1, 22, P.ink); ell(c, e.x + q[0], e.y + e.h + q[1], 6, 1, f % 8 < 2 ? P.yellow : '#e8c46a'); }); box(c, e.x + 18, e.y + e.h - 20, 8, 8, P.white); box(c, e.x + 36, e.y + e.h - 20, 8, 8, P.white); // a drum kit
      box(c, e.x + 58, e.y + e.h - 24, 16, 17, P.dark); disc(c, e.x + 66, e.y + e.h - 16, 4, P.slate); R(c, e.x + 59, e.y + e.h - 23, 14, 2, P.slate); // an amp
      R(c, e.x + 84, e.y + e.h - 34, 1, 27, P.ink); R(c, e.x + 81, e.y + e.h - 8, 7, 1, P.ink); ell(c, e.x + 84, e.y + e.h - 36, 2, 3, P.silver); // a mic stand
      [[60, 8], [76, 12]].forEach(function (q) { disc(c, e.x + q[0], e.y + q[1] + 6, 6, P.ink); disc(c, e.x + q[0], e.y + q[1] + 6, 2, P.yellow); }); // records on the wall
    },
    studio: function (c, e, sc) {
      [[6, 8, 18, 14, P.sky], [28, 6, 14, 18, P.pink], [46, 10, 20, 12, P.lime], [70, 6, 16, 16, P.yellow]].forEach(function (q) { box(c, e.x + q[0], e.y + q[1], q[2], q[3], P.wood); R(c, e.x + q[0] + 2, e.y + q[1] + 2, q[2] - 4, q[3] - 4, q[4]); px(c, e.x + q[0] + 4, e.y + q[1] + 4, P.white); R(c, e.x + q[0] + 3, e.y + q[1] + q[3] - 5, q[2] - 6, 2, P.green); }); // a gallery wall
      box(c, e.x + 30, e.y + e.h - 20, 14, 13, P.white, null, P.silver); disc(c, e.x + 37, e.y + e.h - 26, 4, '#c9845a'); disc(c, e.x + 37, e.y + e.h - 32, 3, '#c9845a'); px(c, e.x + 36, e.y + e.h - 33, P.ink); px(c, e.x + 38, e.y + e.h - 33, P.ink); // a sculpture on a stand
      R(c, e.x + 60, e.y + e.h - 34, 1, 27, P.bark); R(c, e.x + 84, e.y + e.h - 34, 1, 27, P.bark); for (var l = 0; l < 3; l++) { R(c, e.x + 60, e.y + e.h - 30 + l * 8, 25, 1, P.bark); R(c, e.x + 63 + l * 6, e.y + e.h - 29 + l * 8, 5, 6, [P.blue, P.red, P.orange][l]); } // a drying rack
    },
    lab: function (c, e, sc) {
      var f = sc.f || 0; box(c, e.x + 6, e.y + e.h - 44, 40, 37, P.dark, P.slate); for (var i = 0; i < 12; i++) px(c, e.x + 10 + (i % 6) * 6, e.y + e.h - 38 + Math.floor(i / 6) * 6, (i + Math.floor(f / 3)) % 4 === 0 ? P.lime : (i % 3 ? P.red : P.sky)); R(c, e.x + 10, e.y + e.h - 24, 32, 12, P.navy); R(c, e.x + 12, e.y + e.h - 22, 10 + f % 12, 1, P.lime); // a computer bank
      box(c, e.x + 58, e.y + e.h - 34, 22, 27, P.cyan); R(c, e.x + 59, e.y + e.h - 24, 20, 16, '#5fd0b0'); for (var b0 = 0; b0 < 3; b0++) px(c, e.x + 63 + b0 * 6, e.y + e.h - 10 - (f + b0 * 4) % 14, P.white); R(c, e.x + 56, e.y + e.h - 36, 26, 3, P.silver); // a bubbling tank
      R(c, e.x + 86, e.y + e.h - 26, 4, 19, P.orange); line(c, e.x + 88, e.y + e.h - 26, e.x + 82, e.y + e.h - 36, P.orange); R(c, e.x + 80, e.y + e.h - 38, 4, 3, P.dark); // a robot arm
    },
    stable: function (c, e, sc) {
      R(c, e.x + 4, e.y + e.h - 30, 50, 3, P.bark); R(c, e.x + 4, e.y + e.h - 20, 50, 3, P.bark); R(c, e.x + 4, e.y + e.h - 32, 3, 24, P.bark); R(c, e.x + 51, e.y + e.h - 32, 3, 24, P.bark); // a stall
      box(c, e.x + 20, e.y + e.h - 44, 16, 12, P.white); R(c, e.x + 22, e.y + e.h - 42, 4, 3, P.ink); R(c, e.x + 30, e.y + e.h - 40, 4, 4, P.ink); R(c, e.x + 24, e.y + e.h - 34, 8, 3, P.pink); px(c, e.x + 25, e.y + e.h - 39, P.ink); px(c, e.x + 31, e.y + e.h - 39, P.ink); R(c, e.x + 19, e.y + e.h - 46, 3, 3, P.white); R(c, e.x + 34, e.y + e.h - 46, 3, 3, P.white); // a cow looking over it
      R(c, e.x + 66, e.y + 4, 1, e.h - 11, P.wood); R(c, e.x + 74, e.y + 4, 1, e.h - 11, P.wood); for (var l = 8; l < e.h - 8; l += 7) R(c, e.x + 66, e.y + l, 9, 1, P.wood); // a ladder to the hayloft
      box(c, e.x + 80, e.y + e.h - 18, 9, 11, P.silver, P.white); R(c, e.x + 82, e.y + e.h - 21, 5, 3, P.silver); // a milk can
    }
  };

  /* ---------- room designs (3.7, bought at the Corner Mart): each one restyles a room's walls and floor and hangs its own
     decor; the room's own furniture stays. A room is drawn as usual, and wherever nothing stands on its plain walls and
     floor, the design shows instead. ---------- */
  function shoji(c, b) { R(c, b.x, b.y, b.w, b.h, '#f4ecd8'); for (var x = 0; x < b.w; x += 12) R(c, b.x + x, b.y, 1, b.h - 24, '#7a5a3c'); for (var y = 8; y < b.h - 24; y += 9) R(c, b.x, b.y + y, b.w, 1, '#a07a50'); R(c, b.x, b.y + b.h - 24, b.w, 17, '#8a6440'); R(c, b.x, b.y + b.h - 24, b.w, 2, '#5a3d2b'); R(c, b.x, b.y, b.w, 3, '#b13e53'); }
  function tatami(c, b) { var y0 = b.y + b.h - 7; R(c, b.x, y0, b.w, 7, '#c9c48a'); for (var x = 0; x < b.w; x += 30) R(c, b.x + x, y0, 2, 7, '#3c5a3a'); R(c, b.x, y0, b.w, 1, '#3c5a3a'); for (var x2 = 4; x2 < b.w; x2 += 3) px(c, b.x + x2, y0 + 3, '#b7b276'); }
  function planksH(c, x, y, w, h, a, bb, step) { R(c, x, y, w, h, a); for (var j = 0; j < h; j += step) { R(c, x, y + j, w, 1, bb); for (var i = (j * 13) % 29; i < w; i += 29) R(c, x + i, y + j, 1, step, bb); } }
  /* 3.8: each design hangs one piece of its own, sized to fit the room's empty bit of wall (SPOT), so it never hides
     behind (or pokes out from behind) the room's furniture. Spots are [x, y, w, h] in the room's first chamber. */
  var SPOT = { bedroom: [38, 15, 32, 26], bath: [3, 4, 30, 26], music: [3, 4, 30, 26], lab: [41, 3, 32, 26], garage: [35, 22, 32, 19], stable: [56, 21, 30, 19] }; // 3.8.1: only rooms with a big clear wall get a piece (the busy ones keep just the walls and floor)
  function roomy(s) { return { x: s.x + 4, y: s.y + 3, w: s.w - 8, h: s.h - 6 }; } // keep clear of what's around it
  function fit(s, w, h) { w = Math.min(w, s.w - 2); h = Math.min(h, s.h - 2); return { x: Math.round(s.x + (s.w - w) / 2), y: Math.round(s.y + (s.h - h) / 2), w: w, h: h }; }
  var DECOR = {
    shinto: function (c, s) { // a hanging scroll
      var q = fit(s, 11, 20), x = q.x;
      R(c, x - 1, q.y, 13, 1, '#7a5a3c'); R(c, x, q.y + 1, 11, q.h - 2, P.ink); R(c, x + 1, q.y + 2, 9, q.h - 4, '#efe6cf'); R(c, x - 1, q.y + q.h - 1, 13, 1, '#7a5a3c');
      line(c, x + 4, q.y + 5, x + 6, q.y + q.h - 7, P.ink); line(c, x + 3, q.y + Math.round(q.h / 2) - 2, x + 8, q.y + Math.round(q.h / 2) - 3, P.ink); px(c, x + 7, q.y + q.h - 5, P.red);
    },
    desert: function (c, s) { // a woven blanket
      var q = fit(s, 18, 13); box(c, q.x, q.y, q.w, q.h, '#e9dcc0'); R(c, q.x, q.y, q.w, 1, '#7a5232');
      var rows = Math.max(1, Math.floor((q.h - 3) / 5)), cols = Math.max(1, Math.floor((q.w - 3) / 4)); for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) tri(c, q.x + 3 + i * 4, q.y + 3 + j * 5, 2, 1, [P.red, P.teal, P.orange][j % 3]);
      for (var f = 0; f < q.w; f += 3) px(c, q.x + f, q.y + q.h, '#e9dcc0'); // fringe
    },
    space: function (c, s) { // a porthole full of stars
      var r = Math.max(5, Math.min(8, Math.floor(Math.min(s.w, s.h) / 2) - 1)), x = s.x + Math.round(s.w / 2), y = s.y + Math.round(s.h / 2);
      disc(c, x, y, r, P.ink); disc(c, x, y, r - 1, P.silver); disc(c, x, y, r - 3, P.navy); px(c, x - 3, y - 2, P.white); px(c, x + 2, y + 3, P.white); px(c, x + r - 5, y - r + 5, P.yellow); disc(c, x + 1, y + 1, Math.max(1, r - 8), P.orange);
      for (var a = 0; a < 8; a++) px(c, x + Math.round(Math.cos(a * Math.PI / 4) * (r - 2)), y + Math.round(Math.sin(a * Math.PI / 4) * (r - 2)), '#8a93ad'); // rivets
    },
    colonial: function (c, s) { // an oval portrait in a gilt frame
      var x = s.x + Math.round(s.w / 2), y = s.y + Math.round(s.h / 2), ry = Math.min(8, Math.floor(s.h / 2) - 1), rx = Math.max(4, ry - 2);
      ell(c, x, y, rx, ry, '#c9a24f'); ell(c, x, y, rx - 2, ry - 2, '#3a2a20'); disc(c, x, y - 2, 2, '#e8dcc0'); R(c, x - 3, y + 1, 6, Math.max(2, ry - 4), '#e8dcc0');
    },
    gothic: function (c, s) { // a pointed window of red glass
      var q = fit(s, 14, 20), x = q.x, top = q.y + 7, cx = x + 7; R(c, x, top, 14, q.h - 7, P.ink); tri(c, cx, q.y, 8, 0.9, P.ink); R(c, x + 1, top + 1, 12, q.h - 9, '#8a1c2c'); tri(c, cx, q.y + 2, 6, 0.9, '#8a1c2c');
      R(c, cx - 1, q.y + 3, 1, q.h - 4, P.ink); R(c, x + 1, top + Math.round((q.h - 8) / 2), 12, 1, P.ink); px(c, x + 3, top + 3, '#e8557a'); px(c, x + 10, q.y + q.h - 4, '#e8557a');
    },
    hiphop: function (c, s) { // a gold record in a frame
      var n = Math.max(12, Math.min(15, Math.min(s.w, s.h) - 2)), x = s.x + Math.round((s.w - n) / 2), y = s.y + Math.round((s.h - n) / 2), r = Math.floor(n / 2) - 2, cx = x + Math.floor(n / 2), cy = y + Math.floor(n / 2);
      R(c, x, y, n, n, P.ink); R(c, x + 1, y + 1, n - 2, n - 2, '#2a2433'); disc(c, cx, cy, r + 1, P.ink); disc(c, cx, cy, r, '#c9a24f'); disc(c, cx, cy, Math.max(1, r - 3), '#e8c46a'); disc(c, cx, cy, 2, P.red); px(c, cx, cy, P.ink);
    },
    roughcountry: function (c, s) { // a lucky horseshoe
      var y = s.y + Math.round(s.h / 2) - 6, hx = s.x + Math.round(s.w / 2);
      R(c, hx - 4, y + 2, 2, 8, P.silver); R(c, hx + 3, y + 2, 2, 8, P.silver); R(c, hx - 4, y + 9, 9, 2, P.silver); R(c, hx - 2, y, 5, 2, P.silver); px(c, hx - 3, y + 4, P.ink); px(c, hx + 4, y + 4, P.ink); px(c, hx, y - 2, P.bark);
    },
    cleancountry: function (c, s) { // a wreath with a red bow
      var r = Math.max(5, Math.min(7, Math.floor(Math.min(s.w, s.h) / 2) - 2)), x = s.x + Math.round(s.w / 2), y = s.y + Math.round(s.h / 2) - 1;
      disc(c, x, y, r, P.green); disc(c, x, y, r - 3, '#f6f4ee'); [[-r + 1, -2], [r - 2, -3], [r - 2, 3], [-2, r - 2], [2, -r + 1]].forEach(function (q) { px(c, x + q[0], y + q[1], P.red); });
      R(c, x - 2, y + r - 1, 5, 2, P.red); px(c, x - 3, y + r + 1, P.red); px(c, x + 3, y + r + 1, P.red);
    },
    stoner: function (c, s) { // (Hippy) a tie-dye tapestry
      var q = fit(s, 20, 16), cx = q.x + Math.floor(q.w / 2), cy = q.y + Math.floor(q.h / 2);
      R(c, q.x - 1, q.y - 1, q.w + 2, q.h + 2, P.ink); c.save(); c.beginPath(); c.rect(q.x, q.y, q.w, q.h); c.clip();
      ['#f5a3b5', P.orange, P.yellow, P.lime, P.cyan, P.blue, '#8a4ac9'].forEach(function (col, i) { ell(c, cx, cy, Math.max(1, q.w - i * 4), Math.max(1, q.h - i * 4), col); }); c.restore();
      if (q.h >= 12) { disc(c, cx, cy, 5, P.white); disc(c, cx, cy, 4, '#8a4ac9'); R(c, cx, cy - 4, 1, 9, P.white); line(c, cx, cy, cx - 3, cy + 3, P.white); line(c, cx, cy, cx + 3, cy + 3, P.white); } // a peace sign
      R(c, q.x - 2, q.y - 2, q.w + 4, 2, P.bark); for (var f = 1; f < q.w; f += 3) px(c, q.x + f, q.y + q.h + 1, '#f5a3b5'); // the rod and a fringe
    }
  };
  CS.DESIGNS = {
    shinto: { name: 'Shinto', desc: 'Paper shoji screens, tatami mats, a red beam and a hanging scroll.',
      wall: function (c, b) { shoji(c, b); }, floor: tatami,
      decor: DECOR.shinto },
    desert: { name: 'Desert', desc: 'Sun-baked adobe walls, terracotta tiles and a woven blanket.',
      wall: function (c, b) { R(c, b.x, b.y, b.w, b.h, '#e3b07a'); for (var i = 0; i < 70; i++) px(c, b.x + (i * 37) % b.w, b.y + (i * 23) % (b.h - 8), i % 2 ? '#d49c66' : '#eec08e'); R(c, b.x, b.y + b.h - 22, b.w, 2, '#b9733f'); },
      floor: function (c, b) { tiles(c, b.x, b.y + b.h - 7, b.w, 7, '#c4683e', '#b05a33', 7); R(c, b.x, b.y + b.h - 7, b.w, 1, P.ink); },
      decor: DECOR.desert },
    space: { name: 'Space', desc: 'Riveted metal panels, a glowing light strip and a porthole full of stars.',
      wall: function (c, b) { R(c, b.x, b.y, b.w, b.h, '#3a4258'); for (var x = 0; x < b.w; x += 23) R(c, b.x + x, b.y, 1, b.h, '#262c3c'); for (var y = 0; y < b.h - 8; y += 19) R(c, b.x, b.y + y, b.w, 1, '#262c3c'); for (var x2 = 3; x2 < b.w; x2 += 23) for (var y2 = 3; y2 < b.h - 8; y2 += 19) px(c, b.x + x2, b.y + y2, '#8a93ad'); R(c, b.x, b.y + b.h - 26, b.w, 2, P.cyan); },
      floor: function (c, b) { var y0 = b.y + b.h - 7; R(c, b.x, y0, b.w, 7, '#2a3040'); for (var x = 0; x < b.w; x += 3) R(c, b.x + x, y0 + 2, 1, 4, '#1a1e2a'); R(c, b.x, y0, b.w, 1, P.cyan); },
      decor: DECOR.space },
    colonial: { name: 'Colonial', desc: 'Cream walls over white panelled wainscot, wide pine boards and an oval portrait.',
      wall: function (c, b) { R(c, b.x, b.y, b.w, b.h, '#f2ead8'); R(c, b.x, b.y, b.w, 3, P.white); R(c, b.x, b.y + 3, b.w, 1, '#d8ccb0'); var y0 = b.y + b.h - 26; R(c, b.x, y0, b.w, 19, P.white); R(c, b.x, y0, b.w, 2, '#d8ccb0'); for (var x = 4; x < b.w - 10; x += 18) { R(c, b.x + x, y0 + 5, 14, 10, '#d8ccb0'); R(c, b.x + x + 1, y0 + 6, 12, 8, P.white); } },
      floor: function (c, b) { planksH(c, b.x, b.y + b.h - 7, b.w, 7, '#9a6a3c', '#7d5530', 7); R(c, b.x, b.y + b.h - 7, b.w, 1, P.ink); },
      decor: DECOR.colonial },
    gothic: { name: 'Gothic', desc: 'Dark stone, a velvet drape, a checkered floor and a pointed window of red glass.',
      wall: function (c, b) { R(c, b.x, b.y, b.w, b.h, '#3b3446'); for (var y = 0; y < b.h - 8; y += 6) { R(c, b.x, b.y + y, b.w, 1, '#2a2433'); for (var x = ((y / 6) % 2) * 6; x < b.w; x += 12) R(c, b.x + x, b.y + y, 1, 6, '#2a2433'); } R(c, b.x, b.y, b.w, 6, '#5a2a5a'); for (var x2 = 0; x2 < b.w; x2 += 8) tri(c, b.x + x2 + 4, b.y + 6, 3, 1.2, '#5a2a5a'); },
      floor: function (c, b) { tiles(c, b.x, b.y + b.h - 7, b.w, 7, '#2a2430', '#5a5068', 4); R(c, b.x, b.y + b.h - 7, b.w, 1, P.ink); },
      decor: DECOR.gothic },
    hiphop: { name: 'Hip Hop', desc: 'Red brick with graffiti tags, a concrete floor with paint drips and a gold record on the wall.',
      wall: function (c, b) { R(c, b.x, b.y, b.w, b.h, '#8a3b2e'); for (var y = 0; y < b.h - 8; y += 4) { R(c, b.x, b.y + y, b.w, 1, '#6a2a22'); for (var x = ((y / 4) % 2) * 5; x < b.w; x += 10) R(c, b.x + x, b.y + y, 1, 4, '#6a2a22'); }
        var cols = [P.lime, P.pink, P.cyan, P.yellow]; for (var t = 0; t < Math.floor(b.w / 46); t++) { var tx = b.x + 10 + t * 46, ty = b.y + 32; line(c, tx, ty + 6, tx + 4, ty, cols[t]); line(c, tx + 4, ty, tx + 8, ty + 6, cols[t]); line(c, tx + 8, ty + 6, tx + 13, ty + 1, cols[t]); px(c, tx + 14, ty, P.white); } },
      floor: function (c, b) { var y0 = b.y + b.h - 7; R(c, b.x, y0, b.w, 7, '#7a7a80'); R(c, b.x, y0, b.w, 1, P.ink); [[10, P.pink], [40, P.lime], [70, P.cyan]].forEach(function (q) { ell(c, b.x + q[0], y0 + 4, 3, 1, q[1]); }); },
      decor: DECOR.hiphop },
    roughcountry: { name: 'Rough Country', desc: 'Rough log walls, weathered barn boards and a lucky horseshoe.',
      wall: function (c, b) { R(c, b.x, b.y, b.w, b.h, '#7a5432'); for (var y = 0; y < b.h - 8; y += 7) { R(c, b.x, b.y + y + 5, b.w, 2, '#3a2416'); R(c, b.x, b.y + y, b.w, 1, '#946a42'); } for (var k = 0; k < 9; k++) { var kx = b.x + (k * 31) % b.w, ky = b.y + 2 + ((k * 7) % 9) * 7; ell(c, kx, ky + 2, 2, 1, '#4a3020'); } },
      floor: function (c, b) { planksH(c, b.x, b.y + b.h - 7, b.w, 7, '#6a4a30', '#3a2416', 7); for (var x = 6; x < b.w; x += 14) px(c, b.x + x, b.y + b.h - 4, P.silver); R(c, b.x, b.y + b.h - 7, b.w, 1, P.ink); },
      decor: DECOR.roughcountry },
    cleancountry: { name: 'Clean Country', desc: 'White shiplap, light oak boards, gingham trim and a wreath.',
      wall: function (c, b) { R(c, b.x, b.y, b.w, b.h, '#f6f4ee'); for (var y = 5; y < b.h - 8; y += 6) R(c, b.x, b.y + y, b.w, 1, '#dcd8cc'); for (var x = 0; x < b.w; x += 4) { R(c, b.x + x, b.y, 2, 3, x % 8 ? P.white : P.red); R(c, b.x + x, b.y + 3, 2, 2, x % 8 ? P.red : P.white); } },
      floor: function (c, b) { planksH(c, b.x, b.y + b.h - 7, b.w, 7, '#d9b88a', '#c4a070', 7); R(c, b.x, b.y + b.h - 7, b.w, 1, '#8a6a4a'); },
      decor: DECOR.cleancountry },
    stoner: { name: 'Hippy', desc: 'Peace and love: deep purple walls with a few flowers, a shag rug and a tie-dye tapestry.',
      wall: function (c, b) { R(c, b.x, b.y, b.w, b.h, '#3a2560'); for (var i = 0; i < 40; i++) px(c, b.x + (i * 29) % b.w, b.y + (i * 17) % (b.h - 8), i % 3 ? '#4a3278' : '#5a3a8a');
        for (var k = 0; k < Math.floor(b.w / 22); k++) { var fx = b.x + 4 + (k * 37) % (b.w - 6), fy = b.y + 4 + (k * 23) % (b.h - 16), fc = ['#f5a3b5', P.yellow, P.orange, P.lime][k % 4]; px(c, fx - 1, fy, fc); px(c, fx + 1, fy, fc); px(c, fx, fy - 1, fc); px(c, fx, fy + 1, fc); px(c, fx, fy, k % 2 ? P.white : P.yellow); } }, // flower power
      floor: function (c, b) { var y0 = b.y + b.h - 7; R(c, b.x, y0, b.w, 7, '#c86a3c'); for (var x = 0; x < b.w; x += 2) px(c, b.x + x, y0 + ((x * 7) % 5) + 1, x % 4 ? '#e08a52' : '#a8582f'); R(c, b.x, y0, b.w, 1, P.ink); },
      decor: DECOR.stoner },
  };
  CS.DESIGN_ORDER = ['shinto', 'desert', 'space', 'colonial', 'gothic', 'hiphop', 'roughcountry', 'cleancountry', 'stoner'];
  function ownsDesign(id) { var sh = AIU.shop; return !!(sh && sh.owns && sh.owns('design-' + id)); }
  CS.ownsDesign = ownsDesign;
  function themed(c, t, B, sc, D) { // the room as usual, with design D wherever its plain walls and floor show
    var w = B.w * SC, hh = B.h * SC;
    function layer(fn) { var cv = mk(w, hh), x = cv.getContext('2d'); x.imageSmoothingEnabled = false; x.setTransform(SC, 0, 0, SC, -B.x * SC, -B.y * SC); fn(x); return cv; }
    var full = layer(function (x) { drawRoom(x, t, B, sc); });
    var plain = layer(function (x) { BG[t](x, B, sc); }); // (just its walls and floor)
    var look = layer(function (x) { D.wall(x, B, sc); D.floor(x, B, sc); var sp = SPOT[t]; if (sp && D.decor) D.decor(x, roomy({ x: B.x + sp[0], y: B.y + sp[1], w: sp[2], h: sp[3] }), sc); });
    var fc = full.getContext('2d'), F = fc.getImageData(0, 0, w, hh), Pl = plain.getContext('2d').getImageData(0, 0, w, hh).data, Lk = look.getContext('2d').getImageData(0, 0, w, hh).data, d = F.data;
    for (var i2 = 0; i2 < d.length; i2 += 4) if (d[i2] === Pl[i2] && d[i2 + 1] === Pl[i2 + 1] && d[i2 + 2] === Pl[i2 + 2]) { d[i2] = Lk[i2]; d[i2 + 1] = Lk[i2 + 1]; d[i2 + 2] = Lk[i2 + 2]; d[i2 + 3] = Lk[i2 + 3]; }
    fc.putImageData(F, 0, 0); c.drawImage(full, B.x, B.y, B.w, B.h);
  }
  CS.previewDesign = function (id, type, scale) { // a little picture of a room in a design (for the shop and the design picker)
    var t = type || 'living', B = { x: 0, y: 0, w: CW - 4, h: CH - 4 }, s = scale || 2, sc = { phase: 'day', f: 0, accent: P.red, season: 'summer', cos: {} };
    var cv = document.createElement('canvas'); cv.width = B.w * s; cv.height = B.h * s; var c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
    var tmp = mk(B.w * SC, B.h * SC), tc = tmp.getContext('2d'); tc.imageSmoothingEnabled = false; tc.setTransform(SC, 0, 0, SC, 0, 0);
    if (id && CS.DESIGNS[id]) themed(tc, t, B, sc, CS.DESIGNS[id]); else drawRoom(tc, t, B, sc);
    c.drawImage(tmp, 0, 0, cv.width, cv.height); return cv;
  };

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
    icast: { x: 46, label: 'tossing the I Ching coins at his throne', room: 'hall', draw: function (c, b, sc, cr, f) { // 3.7: the daily toss, on the dais in front of his throne
      var cs = sc.cast, fy = b.y + b.h - 16, t = cs ? cs.t : 0, p = drawAiu(c, sc, cr, b.x + 46, fy, { shadow: false, eyes: t >= 18 ? 'happy' : null, dy: cs && (t % 3) < 0.25 ? -2 : 0 });
      if (!cs) return;
      var sx = b.x + 62, sy = b.y + b.h - 44; R(c, sx - 1, sy - 1, 21, 24, P.ink); R(c, sx, sy, 19, 22, '#efe6cf'); R(c, sx, sy, 19, 1, P.wood); R(c, sx, sy + 21, 19, 1, P.wood); // the paper on its stand
      var done = Math.min(6, Math.floor(t / 3) + ((t % 3) / 3 >= 0.6 ? 1 : 0));
      for (var i = 0; i < done; i++) { var v = cs.vals[i], y = sy + 18 - i * 3, mv = v === 6 || v === 9, col = mv ? (t >= 18 && f % 6 < 3 ? P.orange : P.red) : P.ink; if (v === 7 || v === 9) R(c, sx + 3, y, 13, 2, col); else { R(c, sx + 3, y, 5, 2, col); R(c, sx + 11, y, 5, 2, col); } }
      var li = t >= 18 ? 5 : Math.min(5, Math.floor(t / 3)), ph = t >= 18 ? 1 : (t % 3) / 3, heads = cs.vals[li] - 6;
      for (var k = 0; k < 3; k++) { var cx = p.hx - 7 + k * 7, face = k < heads, cy = ph < 0.6 ? Math.round(p.top - 6 - Math.sin(ph / 0.6 * Math.PI) * 14 - k) : fy - 3;
        if (ph < 0.6 && (f + k) % 2) R(c, cx - 2, cy, 4, 1, P.yellow); else { disc(c, cx, cy, 2, P.ink); disc(c, cx, cy, 1, face ? P.yellow : '#b5703f'); } }
    } },
    throne: { x: 46, label: 'sitting on his throne', room: 'hall', draw: function (c, b, sc, cr, f) { var p = drawAiu(c, sc, cr, b.x + 46, b.y + b.h - 19, { shadow: false, eyes: f % 60 < 3 ? 'blink' : f % 120 < 40 ? 'happy' : null }); R(c, b.x + 37, b.y + b.h - 22, 18, 5, P.ink); R(c, b.x + 38, b.y + b.h - 21, 16, 3, sc.accent || P.red); if (f % 90 < 6) { px(c, p.hx - 7, p.top - 2, P.yellow); px(c, p.hx + 7, p.top - 4, P.white); } } },
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
    iching: ['icast'], sleep: ['sleep'], cook: ['stir'], cookpan: ['stir'], hibachi: ['stir'], foodprep: ['chop'], tea: ['tea'], dishes: ['dishes'], eat: ['eat'], care_feed: ['eat'],
    brushteeth: ['brush'], bath: ['soak'], laundry: ['laundry'],
    games: ['game', 'tv'], laptop: ['type', 'read'], journal: ['writelib', 'write', 'read'], read: ['readlib', 'read'], care_read: ['readlib', 'read'], birdwatch: ['window'],
    music: ['guitar', 'piano', 'couch'], paint: ['paint', 'couch'], pottery: ['pottery', 'knit'], sandcastle: ['sculpt', 'puzzle'], snowman: ['sculpt', 'puzzle'],
    tinker: ['printer', 'science', 'type', 'puzzle'], workout: ['lift', 'ball'], build: ['hammer', 'puzzle'], skate: ['fixcar', 'ball'], weedwhack: ['fixcar', 'sweep'],
    yoga: ['yoga', 'window'], garden: ['water', 'fishtank'], water: ['water', 'fishtank'], chickens: ['hens', 'fishtank'], fishing: ['fishtank'], stargaze: ['window'],
    tv: ['tv'], knit: ['knit'], puzzle: ['puzzle'], bubbles: ['bubbles'], tidy: ['sweep'], kite: ['ball'], butterfly: ['window'], ball: ['ball'], bugnet: ['ball'], newborn: ['look'], fetch: ['ball']
  };
  function animFor(sc, L) { // -> an ANIM key whose room is built
    var idle = ['throne', 'couch', 'tv', 'fishtank'], cands = (MAP[sc.act] || []).concat(sc.act ? [] : idle.slice(Math.floor((sc.tsec || 0) / 300) % idle.length)).concat(['couch']);
    for (var i = 0; i < cands.length; i++) { var a0 = ANIM[cands[i]]; if (a0 && CS.has(L, a0.room)) return cands[i]; }
    return 'couch';
  }
  CS.animFor = animFor;
  // the things he does outside, and what has to be built first ('' = nothing)
  var OUTSIDE = { hibachi: 'cart', board: '', petbuddy: '', feedbuddy: '', waterbuddy: '', care_hug: '', fetch: '', fishing: 'pond', garden: 'garden', water: 'garden', stargaze: 'obs' };
  function outsideAct(sc, L) {
    if (!sc.act || !(sc.act in OUTSIDE)) return false; var need = OUTSIDE[sc.act];
    if (need === 'obs') return !!L.obs;
    if (need === 'cart') return !!CS.hasOrn(L, 'cart') && sc.weather !== 'rain' && sc.weather !== 'storm' && sc.weather !== 'snow';
    return !need || !!CS.hasOrn(L, need);
  }
  CS.outsideAct = outsideAct;
  // 3.7: on some nights (about one in three, the same on every device) Aiu gets up after midnight and walks the bailey
  // with a lantern for half an hour (00:05 to 00:35), then goes back to bed
  var PATROL = [{ x: 50, row: -1 }, { x: 66, row: -5 }, { x: 170, row: -6 }, { x: 290, row: -5 }, { x: 310, row: -1 }, { x: 216, row: -1 }];
  function patrolNow(sc) {
    var a = app(); if (!a || !a.S || !sc.stage || sc.act !== 'sleep' || a.visit || a.casting) return null;
    var now = new Date(a.trueNow()), m = now.getHours() * 60 + now.getMinutes(); if (m < 5 || m >= 35) return null;
    if (U.hash32('patrol' + U.dayStr(now) + (a.S.egg && a.S.egg.id)) % 3) return null;
    var i = Math.floor(Date.now() / 22000) % PATROL.length; return { x: PATROL[i].x, row: PATROL[i].row, i: i };
  }
  CS.patrolNow = patrolNow;
  CS.labelFor = function (sc, label) { // what the status line says he's doing (the castle's own words for his room animation)
    var a = app(); if (!a || !a.S || !sc.stage || !sc.act || sc.place !== 'home') return label;
    if (patrolNow(sc)) return 'patrolling the bailey with a lantern';
    var L = CS.current(); if (outsideAct(sc, L)) return label;
    var k = animFor(sc, L); return ANIM[k] ? ANIM[k].label : label;
  };

  /* ---------- outside: what stands in each spot ---------- */
  var ORNART = {
    well: function (c, x, sc) { WF.well(c, x - 6, SURF, sc); },
    outhouse: function (c, x, sc) { c.save(); c.translate(x - 115, SURF - 50); WF.outhouse(c, Object.assign({}, sc, { house: 'cabin' })); c.restore(); },
    shed: function (c, x, sc) { WF.shed(c, x - 6, SURF, sc); },
    banner: function (c, x, sc) { R(c, x, SURF - 26, 1, 26, P.ink); R(c, x - 1, SURF - 27, 3, 1, P.yellow); var col = sc.accent || P.red, wv = (sc.f || 0) % 8 < 4 ? 0 : 1; R(c, x + 1, SURF - 26, 11, 10, P.ink); R(c, x + 1, SURF - 25, 10, 8, col); R(c, x + 1, SURF - 17 + wv, 4, 2, col); R(c, x + 7, SURF - 17 - wv, 4, 2, col); px(c, x + 5, SURF - 22, P.yellow); },
    garden: function (c, x, sc) { // a raised vegetable bed: a sunflower, tomatoes on a stake, a cabbage (a pumpkin in the fall), carrots, a little sign
      var y = SURF, winter = sc.season === 'winter' || sc.biome === 'tundra', fall = sc.season === 'fall', ripe = sc.season === 'summer' || fall;
      if (!winter) {
        R(c, x - 11, y - 27, 1, 20, P.green); px(c, x - 12, y - 17, P.lime); R(c, x - 13, y - 18, 2, 1, P.green); R(c, x - 10, y - 13, 2, 1, P.green); // the sunflower
        disc(c, x - 11, y - 29, 4, P.ink); disc(c, x - 11, y - 29, 3, P.yellow); disc(c, x - 11, y - 29, 1, P.bark); px(c, x - 13, y - 31, P.white);
        R(c, x - 4, y - 22, 1, 15, P.wood); for (var v = 0; v < 6; v++) px(c, x - 5 + (v % 2) * 2, y - 20 + v * 2, P.green); // the tomato stake
        [[-6, -18], [-3, -15], [-6, -12]].forEach(function (q) { R(c, x + q[0], y + q[1], 2, 2, ripe ? P.red : P.lime); });
        if (fall) { ell(c, x + 3, y - 10, 4, 3, P.ink); ell(c, x + 3, y - 10, 3, 2, P.orange); R(c, x + 3, y - 14, 1, 2, P.green); } // a pumpkin
        else { ell(c, x + 3, y - 10, 4, 3, P.ink); ell(c, x + 3, y - 10, 3, 2, P.lime); px(c, x + 2, y - 11, P.green); px(c, x + 4, y - 10, P.green); } // a cabbage
        [8, 11].forEach(function (u) { px(c, x + u - 1, y - 11, P.green); px(c, x + u, y - 12, P.lime); px(c, x + u + 1, y - 11, P.green); R(c, x + u, y - 9, 1, 2, P.orange); }); // carrot tops
      }
      box(c, x - 15, y - 8, 30, 9, P.wood, P.sand, P.bark); R(c, x - 14, y - 8, 28, 2, winter ? P.white : '#5a3d2b'); if (winter) { ell(c, x - 6, y - 9, 6, 2, P.white); ell(c, x + 6, y - 9, 5, 2, P.white); }
      R(c, x + 15, y - 16, 1, 9, P.bark); box(c, x + 12, y - 20, 9, 6, P.sand); R(c, x + 15, y - 18, 3, 1, P.orange); px(c, x + 18, y - 19, P.green); // the sign (a carrot on it)
    },
    pond: function (c, x, sc) { // a whimsical fountain pond (after the Fountain of Life in Bosch's Garden of Earthly Delights): mossy rocks, lily pads, a pink fountain with a glassy blue orb
      var y = SURF, f = sc.f || 0, ice = sc.season === 'winter' || sc.biome === 'tundra', pk = '#f4a6c6', pkD = '#d77aa0', pkL = '#ffd3e4', orb = '#8fd3f4';
      ell(c, x, y - 3, 20, 6, P.ink); ell(c, x, y - 3, 19, 5, ice ? P.silver : P.blue); ell(c, x - 6, y - 5, 8, 1, ice ? P.white : P.sky); ell(c, x + 7, y - 1, 5, 1, ice ? P.white : '#5aa8e0');
      if (!ice) { var rp = (f % 30) / 3; c.globalAlpha = 0.6; for (var a1 = 0; a1 < 12; a1++) { var an = a1 / 12 * Math.PI * 2; px(c, Math.round(x + Math.cos(an) * (4 + rp)), Math.round(y - 3 + Math.sin(an) * (1 + rp / 3)), P.white); } c.globalAlpha = 1; } // a ripple from the falling water
      if (!ice) [[-11, -2], [11, -4]].forEach(function (q, i) { ell(c, x + q[0], y + q[1], 3, 1, P.green); px(c, x + q[0] + 1, y + q[1], P.lime); if (!i) { px(c, x + q[0], y + q[1] - 1, P.pink); px(c, x + q[0] - 1, y + q[1] - 1, P.white); } }); // lily pads, one in bloom
      for (var i = 0; i < 20; i++) { var w0 = Math.round(2 + 1.5 * Math.sin(i * 0.5) + (i < 3 ? 2 : 0)); R(c, x - w0 - 1, y - 5 - i, 2 * w0 + 3, 1, P.ink); R(c, x - w0, y - 5 - i, 2 * w0 + 1, 1, i % 4 === 0 ? pkD : pk); px(c, x - w0, y - 5 - i, pkL); } // the ribbed pink stem
      ell(c, x, y - 15, 6, 5, P.ink); ell(c, x, y - 15, 5, 4, pk); ell(c, x - 2, y - 17, 2, 1, pkL); disc(c, x + 1, y - 14, 2, P.navy); px(c, x + 1, y - 14, orb); // the bulb with a hollow and a little orb inside
      [-1, 1].forEach(function (s0) { line(c, x + s0 * 3, y - 19, x + s0 * 8, y - 22, P.ink); line(c, x + s0 * 3, y - 20, x + s0 * 8, y - 23, pk); disc(c, x + s0 * 9, y - 24, 1, P.ink); px(c, x + s0 * 9, y - 24, orb); }); // two curling arms with tiny orbs
      disc(c, x, y - 28, 5, P.ink); disc(c, x, y - 28, 4, orb); px(c, x - 2, y - 30, P.white); px(c, x - 1, y - 30, P.white); px(c, x + 1, y - 26, '#5aa8e0'); // the glassy orb
      line(c, x + 1, y - 32, x + 3, y - 38, P.ink); line(c, x, y - 32, x + 2, y - 38, pkD); px(c, x + 3, y - 39, pk); px(c, x - 1, y - 36, pkL); // the crescent spike
      if (!ice) for (var j = 0; j < 8; j++) { var s1 = j % 2 ? 1 : -1, k = ((f + j * 3) % 12) / 12, jx = x + s1 * (3 + k * 14), jy = y - 28 - Math.sin(k * Math.PI) * 6 + k * k * 22; px(c, Math.round(jx), Math.round(jy), k < 0.15 ? P.white : P.sky); } // water arcing down into the pond
      [[-20, 0, 4, 3, 0], [-15, 3, 3, 2, 1], [-8, 4, 4, 2, 0], [-1, 5, 3, 2, 1], [6, 4, 4, 2, 0], [13, 3, 3, 2, 1], [19, 0, 4, 3, 0], [-18, -5, 3, 2, 1], [18, -5, 3, 2, 1]].forEach(function (q) { ell(c, x + q[0], y - 3 + q[1], q[2], q[3], P.ink); ell(c, x + q[0], y - 3 + q[1], q[2] - 1, Math.max(1, q[3] - 1), q[4] ? '#9aa0ad' : '#b7ad9b'); px(c, x + q[0] - 1, y - 4 + q[1] - q[3] + 1, ice ? P.white : P.green); }); // the rocks around the rim (mossy, or snowy)
      if (!ice) { var fk = (f + 7) % 50; if (fk < 8) { var fy0 = y - 4 - Math.round(Math.sin(fk / 8 * Math.PI) * 6); R(c, x - 12 + fk, fy0, 2, 1, P.orange); px(c, x - 13 + fk, fy0, P.yellow); } } // a fish jumps now and then
    },
    statue: function (c, x, sc) {
      box(c, x - 9, SURF - 8, 18, 8, P.silver, P.white, P.slate); var form = sc.form; if (!form) return;
      var cr = A.creature(form.seed, form.stage, sc.soul), sv = statueOf(cr.frames.open); c.drawImage(sv, Math.round(x - cr.w / 2), SURF - 8 - cr.bottom - 1);
    }
  };
  var MILL_X = 180; // the windmill stands on the hill behind the castle (3.4)
  function millAt(c, x, base, sc) {
    for (var wy = 0; wy < 24; wy++) { var ww = 3 + Math.floor(wy / 4); R(c, x - ww - 1, base - 24 + wy, ww * 2 + 2, 1, P.ink); R(c, x - ww, base - 24 + wy, ww * 2, 1, wy % 5 === 4 ? P.bark : P.wood); }
    R(c, x - 5, base - 27, 10, 3, P.ink); R(c, x - 4, base - 26, 8, 2, P.red); R(c, x - 2, base - 7, 4, 7, P.ink); px(c, x, base - 15, P.yellow);
    var a0 = (sc.tsec || 0) * 0.8; for (var i = 0; i < 4; i++) { var an = a0 + i * Math.PI / 2, ex = Math.round(x + Math.cos(an) * 14), ey = Math.round(base - 25 + Math.sin(an) * 14); line(c, x, base - 25, ex, ey, P.ink); line(c, Math.round(x + Math.cos(an) * 4), Math.round(base - 25 + Math.sin(an) * 4), Math.round(x + Math.cos(an + 0.25) * 13), Math.round(base - 25 + Math.sin(an + 0.25) * 13), P.white); }
    disc(c, x, base - 25, 1, P.ink);
  }
  var stCache = { fr: null, cv: null };
  function statueOf(fr) { if (stCache.fr === fr) return stCache.cv; var cv = mk(fr.width, fr.height), c = cv.getContext('2d'); c.drawImage(fr, 0, 0); c.globalCompositeOperation = 'source-atop'; c.fillStyle = P.silver; c.fillRect(0, 0, cv.width, cv.height); c.globalAlpha = 0.5; c.drawImage(fr, 0, 0); stCache.fr = fr; stCache.cv = cv; return cv; }
  function ornRect(slot, type) { var x = CS.SLOTS[slot], w = type === 'pond' ? 40 : type === 'board' || type === 'cart' ? 30 : 28, hh = type === 'board' ? 32 : type === 'cart' ? 36 : type === 'pond' ? 42 : type === 'banner' ? 36 : 30; return { x: x - w / 2, y: SURF - hh, w: w, h: hh + 2 }; }
  CS.ornRect = ornRect;
  function observatory(c, sc, S0) { // a little domed telescope house on the elevator tower's deck
    var x = OBS.x, y = OBS.y - 11, night = sc.phase === 'night' || sc.phase === 'dusk';
    R(c, x - 9, y, 18, 11, P.ink); R(c, x - 8, y + 1, 16, 10, S0.wall); R(c, x - 8, y + 5, 16, 1, S0.wall2); R(c, x - 2, y + 4, 4, 7, P.ink); R(c, x - 1, y + 5, 2, 6, night ? P.yellow : P.dark);
    c.save(); c.beginPath(); c.rect(x - 12, y - 12, 24, 12); c.clip(); ell(c, x, y, 11, 10, P.ink); ell(c, x, y, 10, 9, P.silver); ell(c, x - 4, y - 5, 3, 2, P.white); R(c, x - 1, y - 9, 3, 9, P.dark); c.restore();
    line(c, x + 1, y - 5, x + 9, y - 12, P.ink); line(c, x + 2, y - 5, x + 10, y - 12, P.slate); R(c, x + 9, y - 15, 3, 3, P.ink); px(c, x + 10, y - 14, night ? P.yellow : P.sky);
  }

  /* ---------- the static picture: the back (mountains, the hillside) and the front (the castle and the courtyard) ---------- */
  var stat = { key: null, back: null, front: null };
  var RIDGE = TOPY - 28; // the hill behind the castle: its ridge shows over the battlements (the creatures walk along it)
  function ridgeAt(x) { return RIDGE + Math.round(5 * Math.sin(x * 0.045 + 3) + 3 * Math.sin(x * 0.13)); }
  CS.ridge = function () { return RIDGE; };
  function drawBack(sc) {
    var cv = big(W, H), c = cv.getContext('2d'), snowy = sc.biome === 'tundra' || sc.season === 'winter', desert = sc.biome === 'desert';
    var far = desert ? '#d98c4f' : snowy ? '#c9d6e3' : '#4f7f8f', far2 = desert ? '#c27744' : snowy ? P.silver : '#3f6a7c', near = desert ? '#e0aa6c' : snowy ? P.white : P.green, near2 = desert ? '#d39a5c' : snowy ? '#dfe9f1' : '#3c9a52';
    var r = U.rng(U.hash32(sc.biome + 'mtn'));
    var m0 = Math.max(16, RIDGE - 62), mh = function (x) { return Math.round(30 * Math.abs(Math.sin(x * 0.021 + 0.7)) + 14 * Math.abs(Math.sin(x * 0.053 + 2))); };
    for (var x = 0; x < W; x++) { var hh = mh(x), top = m0 + 44 - hh; R(c, x, top, 1, H - top, mh(x + 1) >= hh ? far : far2); if (!desert && hh > 34) R(c, x, top, 1, 2 + (hh - 34) % 3, P.white); } // (lit on the slopes facing the sun)
    for (var x2 = 0; x2 < W; x2++) { var h1 = ridgeAt(x2); R(c, x2, h1, 1, H - h1, near); if (x2 % 7 === 0) px(c, x2, h1, snowy ? P.silver : P.lime); for (var gy = h1 + 6; gy < H; gy += 9) if ((x2 * 7 + gy * 3) % 23 === 0) px(c, x2, gy, near2); }
    if (sc.biome === 'beach') { R(c, 0, RIDGE - 10, W, 6, P.blue); for (var w0 = 0; w0 < 12; w0++) R(c, (w0 * 31) % W, RIDGE - 8, 5, 1, P.sky); }
    var kinds = { meadow: 'round', forest: 'pine', desert: 'cactus', tundra: 'pine', pond: 'round', beach: 'palm' }, tk = kinds[sc.biome] || 'round';
    [8, 136, 232, 312].forEach(function (tx) { IN.tree(c, tk, tx, ridgeAt(tx) + 2 + Math.floor(r() * 2), sc.season); });
    return cv;
  }
  function roof(c, sc, st, S0, cx, y, kind) { // the top of one column: a pointed roof, a spire, a dome or battlements (with a flag)
    var mid = cx + CW / 2, acc = sc.accent || P.red, i, half;
    if (kind === 'flat' || st === 'cave') {
      if (st === 'cave') return;
      R(c, cx - 1, y - 7, CW + 2, 7, P.ink); R(c, cx, y - 6, CW, 6, S0.wall); R(c, cx, y - 2, CW, 1, S0.wall2);
      for (var x = cx; x < cx + CW; x += 10) { R(c, x, y - 12, 6, 6, P.ink); R(c, x + 1, y - 11, 4, 5, S0.wall); }
      R(c, mid + 20, y - 30, 1, 18, P.ink); R(c, mid + 21, y - 30, 10, 7, P.ink); R(c, mid + 21, y - 29, 9, 5, acc); R(c, mid + 29, y - 25, 2, 2, acc); px(c, mid + 24, y - 27, P.yellow);
      return;
    }
    if (st === 'desert') { // a sandstone parapet and an onion dome
      R(c, cx - 1, y - 6, CW + 2, 6, P.ink); R(c, cx, y - 5, CW, 5, S0.wall);
      c.save(); c.beginPath(); c.rect(cx, y - 40, CW, 34); c.clip(); ell(c, mid, y - 6, 31, 26, P.ink); ell(c, mid, y - 6, 30, 25, S0.roof); ell(c, mid - 10, y - 20, 7, 6, '#f8dca6'); for (i = -20; i <= 20; i += 10) R(c, mid + i, y - 28 + Math.abs(i) / 2, 1, 22 - Math.abs(i) / 2, S0.roof2); c.restore();
      tri(c, mid, y - 44, 8, 0.4, P.ink); R(c, mid, y - 46, 1, 4, P.ink); px(c, mid, y - 47, P.yellow);
      return;
    }
    var tall = st === 'ice' ? 44 : 32, wide = st === 'ice' ? 40 : 52; // a pointed roof (stone) or a tall ice spire
    for (i = 0; i <= tall; i++) { half = Math.round(i * wide / tall); R(c, mid - half - 1, y - tall + i, 2 * half + 3, 1, P.ink); }
    for (i = 1; i <= tall; i++) { half = Math.round(i * wide / tall) - 1; if (half < 0) continue; R(c, mid - half, y - tall + i, 2 * half + 1, 1, i % 5 === 0 ? S0.roof2 : S0.roof); }
    for (i = 6; i < tall; i += 5) { half = Math.round(i * wide / tall) - 2; for (var t = -half + 2; t < half; t += 6) px(c, mid + t, y - tall + i + 2, S0.roof2); }
    R(c, mid - 4, y - Math.round(tall * 0.45), 8, 9, P.ink); R(c, mid - 3, y - Math.round(tall * 0.45) + 1, 6, 8, sc.phase === 'night' || sc.phase === 'dusk' ? P.yellow : P.navy); R(c, mid, y - Math.round(tall * 0.45) + 1, 1, 8, P.ink);
    if (st === 'ice') for (i = -wide + 6; i < wide - 4; i += 7) R(c, mid + i, y, 1, 2 + (Math.abs(i) % 3), P.cyan);
    R(c, mid, y - tall - 9, 1, 9, P.ink); R(c, mid + 1, y - tall - 9, 7, 5, P.ink); R(c, mid + 1, y - tall - 8, 6, 3, acc);
  }
  function stoneFace(c, x, y, w, h, S0) { R(c, x, y, w, h, S0.frame); for (var j = 0; j < h; j += 4) { R(c, x, y + j, w, 1, S0.frame2); for (var i = ((j / 4) % 2) * 4; i < w; i += 8) R(c, x + i, y + j, 1, 4, S0.frame2); } }
  function emptyRoom(c, b, sc, S0, locked, seed) { // a chamber not furnished yet: bare stone, a plank floor, a crate or a cobweb (boarded up on a floor that isn't open yet)
    R(c, b.x, b.y, b.w, b.h, S0.empty); for (var j = 4; j < b.h - 8; j += 6) { R(c, b.x, b.y + j, b.w, 1, S0.empty2); for (var i = ((j / 6) % 2) * 6; i < b.w; i += 12) R(c, b.x + i, b.y + j - 5, 1, 5, S0.empty2); }
    R(c, b.x, b.y + b.h - 7, b.w, 7, '#6b4a33'); R(c, b.x, b.y + b.h - 7, b.w, 1, P.ink); for (var fx = 6; fx < b.w; fx += 13) R(c, b.x + fx, b.y + b.h - 6, 1, 6, '#553a28');
    for (var k = 0; k < 5; k++) line(c, b.x + 1, b.y + 1 + k * 2, b.x + 1 + 10 - k * 2, b.y + 1, 'rgba(255,255,255,0.35)'); // a cobweb in the corner
    if (seed % 3 === 0) { box(c, b.x + 60, b.y + b.h - 19, 14, 12, P.wood, P.sand, P.bark); line(c, b.x + 61, b.y + b.h - 18, b.x + 72, b.y + b.h - 9, P.bark); }
    else if (seed % 3 === 1) { box(c, b.x + 20, b.y + b.h - 18, 10, 11, P.bark, P.wood); R(c, b.x + 20, b.y + b.h - 14, 10, 1, P.ink); box(c, b.x + 31, b.y + b.h - 15, 8, 8, P.bark, P.wood); }
    else { R(c, b.x + 66, b.y + b.h - 26, 1, 19, P.wood); R(c, b.x + 62, b.y + b.h - 8, 9, 1, P.wood); R(c, b.x + 64, b.y + b.h - 28, 5, 3, P.dark); } // a broom
    if (locked) { c.globalAlpha = 0.45; R(c, b.x, b.y, b.w, b.h, P.ink); c.globalAlpha = 1; [[4, 10], [4, 40]].forEach(function (q) { R(c, b.x + q[0], b.y + q[1], b.w - 8, 5, P.ink); R(c, b.x + q[0] + 1, b.y + q[1] + 1, b.w - 10, 3, P.wood); px(c, b.x + q[0] + 3, b.y + q[1] + 2, P.ink); px(c, b.x + b.w - q[0] - 4, b.y + q[1] + 2, P.ink); }); line(c, b.x + 6, b.y + 18, b.x + b.w - 6, b.y + 36, P.wood); }
  }

  /* ---------- furniture (3.8, from the Corner Mart's Furniture shelf): a new fridge, bed or toilet takes the old one's
     place, in the same spot, so Aiu still sleeps on the pillow and the potty still lines up. ---------- */
  function fRect(b, r) { return { x: b.x + r[0], y: r[1] < 0 ? b.y + b.h + r[1] : b.y + r[1], w: r[2], h: (r[3] < 0 ? b.y + b.h + r[3] : b.y + r[3]) - (r[1] < 0 ? b.y + b.h + r[1] : b.y + r[1]) }; }
  function fridgeBody(c, x, y, w, h, body, hi, edge) { R(c, x, y, w, h, P.ink); R(c, x + 1, y + 1, w - 2, h - 2, body); R(c, x + 1, y + 1, w - 2, 1, hi); R(c, x + 1, y + 1, 1, h - 2, hi); R(c, x + w - 2, y + 1, 1, h - 2, edge); }
  function bedBase(c, b, sc, wood, wood2, quiltC, trim) { // the mattress, quilt and pillow where the old bed had them (his head at x 43)
    box(c, b.x + 32, b.y + b.h - 18, 56, 8, wood, wood2); R(c, b.x + 34, b.y + b.h - 10, 2, 3, P.ink); R(c, b.x + 84, b.y + b.h - 10, 2, 3, P.ink);
    box(c, b.x + 35, b.y + b.h - 24, 51, 7, P.white); R(c, b.x + 52, b.y + b.h - 24, 34, 7, quiltC); if (trim) { R(c, b.x + 52, b.y + b.h - 24, 34, 1, trim); R(c, b.x + 52, b.y + b.h - 18, 34, 1, trim); }
    box(c, b.x + 36, b.y + b.h - 28, 13, 6, P.white);
  }
  function toiletShape(c, b, body, hi, edge) { box(c, b.x + 76, b.y + b.h - 27, 10, 12, body, hi, edge); box(c, b.x + 72, b.y + b.h - 16, 15, 5, body, hi); box(c, b.x + 74, b.y + b.h - 12, 10, 5, body, hi, edge); }
  CS.FURN = {
    fridge: { room: 'kitchen', name: 'Fridge', r: [3, 9, 18, -7], items: {
      retro: { name: 'Retro fridge', price: 60, desc: 'A rounded 1950s icebox in mint green with a chrome handle and a little badge.', draw: function (c, b) {
        var x = b.x + 4, y = b.y + 12, h = b.h - 19 - 3; fridgeBody(c, x, y, 16, h, '#8fd6c0', '#c4f0e2', '#5fae96'); R(c, x + 1, y, 14, 1, P.ink); R(c, x + 2, y - 1, 12, 1, P.ink); R(c, x + 2, y, 12, 1, '#c4f0e2');
        R(c, x + 1, y + 16, 14, 1, '#5fae96'); R(c, x + 13, y + 5, 1, 7, P.silver); R(c, x + 12, y + 5, 1, 1, P.silver); R(c, x + 12, y + 11, 1, 1, P.silver); R(c, x + 13, y + 20, 1, 8, P.silver);
        R(c, x + 4, y + 3, 6, 2, P.silver); px(c, x + 5, y + 3, P.red); R(c, x + 2, y + h, 2, 3, P.silver); R(c, x + 12, y + h, 2, 3, P.silver); } },
      smart: { name: 'Smart fridge', price: 80, desc: 'Stainless steel, French doors, a water dispenser and a touch screen that shows the time.', draw: function (c, b, sc) {
        var x = b.x + 3, y = b.y + 9, h = b.h - 16, f = sc.f || 0; fridgeBody(c, x, y, 18, h, '#c9ced6', '#eef1f5', '#8f97a3'); R(c, x + 9, y + 1, 1, 26, '#8f97a3'); R(c, x + 1, y + 27, 16, 1, '#8f97a3');
        R(c, x + 7, y + 6, 1, 14, P.slate); R(c, x + 11, y + 6, 1, 14, P.slate); R(c, x + 2, y + 31, 14, 1, P.slate);
        R(c, x + 12, y + 4, 5, 6, P.ink); R(c, x + 13, y + 5, 3, 4, f % 20 < 10 ? P.cyan : P.sky); px(c, x + 14, y + 6, P.white);
        R(c, x + 2, y + 12, 4, 7, P.dark); R(c, x + 3, y + 17, 2, 1, P.cyan); } },
      pink: { name: 'Pink fridge', price: 50, desc: 'A sweet pastel pink fridge with white handles and a heart magnet.', draw: function (c, b) {
        var x = b.x + 4, y = b.y + 10, h = b.h - 17; fridgeBody(c, x, y, 16, h, '#f5a3b5', '#ffd0dc', '#d97e94'); R(c, x + 1, y + 20, 14, 1, '#d97e94'); R(c, x + 12, y + 6, 2, 8, P.white); R(c, x + 12, y + 24, 2, 10, P.white);
        px(c, x + 4, y + 5, P.red); px(c, x + 6, y + 5, P.red); R(c, x + 4, y + 6, 3, 1, P.red); px(c, x + 5, y + 7, P.red); R(c, x + 3, y + 26, 6, 6, P.white); R(c, x + 4, y + 27, 2, 2, P.yellow); px(c, x + 7, y + 30, P.blue); } }
    } },
    bed: { room: 'bedroom', name: 'Bed', r: [29, -41, 61, -7], items: {
      canopy: { name: 'Canopy bed', price: 90, desc: 'Four tall posts and a canopy with soft curtains tied back at the corners.', draw: function (c, b, sc) {
        var top = b.y + b.h - 40; [31, 85].forEach(function (u) { R(c, b.x + u, top, 3, b.h - 7 - (b.h - 40), P.ink); R(c, b.x + u + 1, top + 1, 1, b.h - 9 - (b.h - 40), P.wood); });
        R(c, b.x + 30, top, 59, 3, P.ink); R(c, b.x + 31, top + 1, 57, 1, P.bark); for (var sx = 33; sx < 85; sx += 4) tri(c, b.x + sx + 2, top + 3, 2, 1, quilt(sc));
        bedBase(c, b, sc, P.bark, P.wood, quilt(sc));
        [[34, 1], [84, -1]].forEach(function (q) { var cx = b.x + q[0]; for (var yy = top + 3; yy < top + 18; yy++) R(c, cx + (q[1] > 0 ? 0 : -4 + Math.round((yy - top) / 5)), yy, 5 - Math.round((yy - top) / 5), 1, '#f6e8f4'); R(c, cx - 1, top + 17, 6, 1, '#c9a24f'); }); } },
      royal: { name: 'Royal bed', price: 120, desc: 'A red velvet headboard with gold trim and a crown on top, a purple quilt and gold feet.', draw: function (c, b) {
        var hx = b.x + 30, ht = b.y + b.h - 38; R(c, hx - 1, ht, 10, b.h - 7 - (b.h - 38), P.ink); R(c, hx, ht + 1, 8, b.h - 9 - (b.h - 38), '#8a1c2c'); R(c, hx, ht + 1, 8, 1, '#c9a24f'); R(c, hx + 1, ht + 3, 1, 22, '#c9a24f');
        R(c, hx + 1, ht - 3, 7, 3, '#e8c46a'); px(c, hx + 1, ht - 4, '#e8c46a'); px(c, hx + 4, ht - 5, '#e8c46a'); px(c, hx + 7, ht - 4, '#e8c46a'); px(c, hx + 4, ht - 2, P.red);
        box(c, b.x + 84, b.y + b.h - 26, 5, 19, '#8a1c2c', '#c9a24f'); bedBase(c, b, null, '#5a2a5a', '#c9a24f', '#5d275d', '#e8c46a'); R(c, b.x + 34, b.y + b.h - 10, 2, 3, '#e8c46a'); R(c, b.x + 84, b.y + b.h - 10, 2, 3, '#e8c46a'); } },
      racecar: { name: 'Race car bed', price: 70, desc: 'A bright red race car with big wheels, a spoiler and the number 1. Vroom, then snore.', draw: function (c, b, sc) {
        var y = b.y + b.h - 20; box(c, b.x + 35, b.y + b.h - 24, 51, 6, P.white); R(c, b.x + 52, b.y + b.h - 24, 34, 6, P.yellow); for (var q = 54; q < 84; q += 6) R(c, b.x + q, b.y + b.h - 23, 3, 2, P.ink); box(c, b.x + 36, b.y + b.h - 28, 13, 6, P.white); // a checkered-flag quilt
        R(c, b.x + 30, y - 1, 60, 12, P.ink); R(c, b.x + 31, y, 58, 10, P.red); R(c, b.x + 31, y, 58, 1, '#e8557a'); R(c, b.x + 31, y + 9, 58, 1, '#7a1c2c'); R(c, b.x + 29, y + 2, 3, 6, P.ink); R(c, b.x + 30, y + 3, 2, 3, P.yellow); // the body and a headlight
        R(c, b.x + 84, b.y + b.h - 31, 6, 2, P.ink); R(c, b.x + 85, b.y + b.h - 30, 4, 1, P.red); R(c, b.x + 86, b.y + b.h - 29, 2, 9, P.ink); // the spoiler
        disc(c, b.x + 60, y + 5, 4, P.white); R(c, b.x + 60, y + 3, 1, 5, P.ink); px(c, b.x + 59, y + 4, P.ink); R(c, b.x + 40, y + 4, 14, 1, P.white); R(c, b.x + 66, y + 4, 14, 1, P.white); // the number 1 and racing stripes
        [40, 79].forEach(function (u) { disc(c, b.x + u, b.y + b.h - 10, 4, P.ink); disc(c, b.x + u, b.y + b.h - 10, 2, P.silver); }); } }
    } },
    toilet: { room: 'bath', name: 'Toilet', r: [70, -32, 19, -7], items: {
      golden: { name: 'Golden toilet', price: 100, desc: 'Solid gold (well, it looks it). Shines like a trophy.', draw: function (c, b, sc) {
        toiletShape(c, b, '#e8c46a', '#fff2b0', '#c9a24f'); R(c, b.x + 78, b.y + b.h - 25, 2, 4, P.white); if ((sc.f || 0) % 24 < 4) { px(c, b.x + 84, b.y + b.h - 29, P.white); px(c, b.x + 83, b.y + b.h - 30, P.white); px(c, b.x + 85, b.y + b.h - 30, P.white); } } },
      hightech: { name: 'High-tech toilet', price: 80, desc: 'A sleek smart toilet with a control panel, a heated seat and a soft blue night glow.', draw: function (c, b, sc) {
        c.globalAlpha = 0.35; R(c, b.x + 71, b.y + b.h - 9, 18, 2, P.cyan); c.globalAlpha = 1;
        toiletShape(c, b, P.white, P.white, P.silver); R(c, b.x + 77, b.y + b.h - 25, 8, 4, P.dark); px(c, b.x + 78, b.y + b.h - 24, (sc.f || 0) % 12 < 6 ? P.cyan : P.lime); px(c, b.x + 80, b.y + b.h - 24, P.sky); px(c, b.x + 82, b.y + b.h - 24, P.red);
        R(c, b.x + 72, b.y + b.h - 16, 15, 1, P.cyan); R(c, b.x + 74, b.y + b.h - 8, 10, 1, P.cyan); } },
      royal: { name: 'Royal toilet', price: 90, desc: 'A throne for the bathroom: carved wood, a red velvet seat and a little gold crown.', draw: function (c, b) {
        toiletShape(c, b, P.wood, '#c98a5a', P.bark); R(c, b.x + 72, b.y + b.h - 16, 15, 2, '#8a1c2c'); R(c, b.x + 77, b.y + b.h - 24, 8, 1, P.bark); R(c, b.x + 77, b.y + b.h - 20, 8, 1, P.bark);
        R(c, b.x + 78, b.y + b.h - 30, 7, 3, '#e8c46a'); px(c, b.x + 78, b.y + b.h - 31, '#e8c46a'); px(c, b.x + 81, b.y + b.h - 32, '#e8c46a'); px(c, b.x + 84, b.y + b.h - 31, '#e8c46a'); px(c, b.x + 81, b.y + b.h - 29, P.red); } }
    } }
  };
  CS.FURN_ORDER = ['fridge', 'bed', 'toilet'];
  CS.FURN_ITEMS = { fridge: ['retro', 'smart', 'pink'], bed: ['canopy', 'royal', 'racecar'], toilet: ['golden', 'hightech', 'royal'] };
  var FURN_IN = {}; CS.FURN_ORDER.forEach(function (fp) { FURN_IN[CS.FURN[fp].room] = fp; });
  function ownsFurn(fp, id) { var sh = AIU.shop; return !!(sh && sh.owns && sh.owns('furn-' + fp + '-' + id)); }
  CS.ownsFurn = ownsFurn;
  function furnish(c, t, b, sc) { // swap in a bought piece: paint the room's own wall and floor over the old one, then draw the new one
    var fp = FURN_IN[t]; if (!fp) return; var F = CS.FURN[fp], ov = sc && sc.furn, id = ov ? ov[fp] : (LAY && LAY.furn || {})[fp];
    if (!id || !F.items[id] || (!ov && !ownsFurn(fp, id))) return;
    var r = fRect(b, F.r); c.save(); c.beginPath(); c.rect(r.x, r.y, r.w, r.h); c.clip(); BG[t](c, b, sc); c.restore();
    F.items[id].draw(c, b, sc || {});
  }
  CS.previewFurn = function (fp, id, scale) { // the room with this piece in it (for the shop and the room sheet)
    var F = CS.FURN[fp], t = F.room, B = { x: 0, y: 0, w: CW - 4, h: CH - 4 }, s = scale || 2, o = {}; o[fp] = id || ''; var sc = { phase: 'day', f: 0, accent: P.red, season: 'summer', cos: {}, furn: o };
    var cv = document.createElement('canvas'); cv.width = B.w * s; cv.height = B.h * s; var c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
    var tmp = mk(B.w * SC, B.h * SC), tc = tmp.getContext('2d'); tc.imageSmoothingEnabled = false; tc.setTransform(SC, 0, 0, SC, 0, 0); drawRoom(tc, t, B, sc);
    c.drawImage(tmp, 0, 0, cv.width, cv.height); return cv;
  };
  function drawRoom(c, t, B, sc) { // a room across its whole width: its walls and floor, its own furniture, then more for each extra 4 cells
    var n = Math.round((B.w + 4) / CW);
    c.save(); c.beginPath(); c.rect(B.x, B.y, B.w, B.h); c.clip();
    if (n > 1) BG[t](c, B, sc);
    c.save(); c.beginPath(); c.rect(B.x, B.y, CW - 4, B.h); c.clip(); ROOMART[t](c, { x: B.x, y: B.y, w: CW - 4, h: B.h }, sc); furnish(c, t, { x: B.x, y: B.y, w: CW - 4, h: B.h }, sc); c.restore();
    for (var i = 1; i < n; i++) { var ex = { x: B.x + CW - 4 + (i - 1) * CW, y: B.y, w: CW, h: B.h }; c.save(); if (i % 2 === 0) { c.translate(ex.x * 2 + ex.w, 0); c.scale(-1, 1); } EXT[t](c, ex, sc); c.restore(); } // (the second extra block is the first one mirrored, so a long room doesn't repeat itself)
    c.restore();
  }
  function stairTower(c, L, S0, building, stage, lit) { // 3.8: the spiral-stair tower on the left: a flight of winding steps for each floor you linked
    var x0 = STX - 10, top = TOPY - 10;
    R(c, x0 - 1, top - 1, 22, BASE - top + 1, P.ink); stoneFace(c, x0, top, 20, BASE - top, S0); R(c, x0 + 3, top + 2, 14, BASE - top - 2, '#231d2b');
    for (var i = x0 - 2; i < x0 + 22; i += 5) { R(c, i, top - 6, 3, 6, P.ink); R(c, i + 1, top - 5, 1, 5, S0.wall); } // battlements on top
    for (var f = 0; f < ROWS; f++) { var fy = floorY(f), slot = cellRect(f, 0).y + 12; R(c, x0 + 6, slot, 3, 8, P.ink); R(c, x0 + 7, slot + 1, 1, 6, lit ? P.yellow : P.navy); R(c, OX - 3, fy - 26, 6, 28, P.ink); R(c, OX - 2, fy - 25, 4, 27, '#2a2433'); R(c, x0 + 3, fy + 1, 14, 2, S0.frame2); } // arrow slits, the doorways into the rooms, the landings
    for (var g = 0; g < ROWS - 1; g++) {
      var y0 = floorY(g), y1 = floorY(g + 1);
      if (L.stairs[g]) { // the steps wind round a central post: back steps dim behind it, front steps bright in front of it
        R(c, x0 + 3, y1 + 3, 14, y0 - y1 - 3, '#4a3f55'); for (var tl = y1 + 6; tl < y0; tl += 8) R(c, x0 + 3, tl, 14, 1, '#3c3347'); // lit stone inside
        var steps = [];
        for (var y = y0 - 3, k = 0; y > y1 + 1; y -= 4, k++) { var an = k * Math.PI / 4, sn = Math.sin(an), cs = Math.cos(an), ln = Math.round(Math.abs(sn) * 5) + 3; steps.push({ y: y, x: sn >= 0 ? STX : STX - ln, w: ln, front: cs > 0 }); }
        steps.forEach(function (q) { if (!q.front) { R(c, q.x, q.y, q.w, 2, P.ink); R(c, q.x, q.y, q.w, 1, '#6b4a33'); } });
        R(c, STX - 1, y1 + 2, 2, y0 - y1 - 2, P.ink); R(c, STX - 1, y1 + 2, 1, y0 - y1 - 2, '#8f8aa0'); // the centre post
        steps.forEach(function (q) { if (q.front) { R(c, q.x - 1, q.y - 1, q.w + 2, 4, P.ink); R(c, q.x, q.y, q.w, 1, '#e0a86a'); R(c, q.x, q.y + 1, q.w, 1, P.wood); R(c, q.x, q.y + 2, q.w, 1, '#7a5232'); } });
        for (var yy = y0 - 10; yy > y1 - 6; yy--) { var rs = Math.sin((y0 - yy) / 5.1); if (Math.cos((y0 - yy) / 5.1) > 0) px(c, Math.round(STX + rs * 8), yy, P.yellow); } // a brass rail on the near side
            } else if (building && CS.open(stage, g) && CS.open(stage, g + 1)) { dashed(c, x0 + 3, y1 - 8, 14, y0 - y1, P.yellow); spr(c, STX - 3, Math.round((y0 + y1) / 2) - 3, ['...y...', '...y...', 'yyyyyyy', '...y...', '...y...']); }
    }
  }
  function drawFront(sc, L, building) {
    var cv = big(W, H), c = cv.getContext('2d'), st = CS.style(sc), S0 = STY[st], g = IN.groundCols(sc.biome, sc.season), r = U.rng(U.hash32(sc.biome + sc.season + st)), lit = sc.phase === 'night' || sc.phase === 'dusk', stage = sc.stageNow || 0, own = owners(L);
    if (st === 'cave') { // the rooms are carved into a mountain
      for (var mx = 0; mx < W; mx++) { var mt = TOPY - 18 - Math.round(10 * Math.abs(Math.sin(mx * 0.03 + 1)) + 4 * Math.sin(mx * 0.11)); R(c, mx, mt, 1, BASE - mt, P.ink); R(c, mx, mt + 1, 1, BASE - mt - 1, S0.rock); if (mx % 9 === 0) R(c, mx, mt + 1, 1, 2, sc.season === 'winter' ? P.white : P.green); }
      for (var s0 = 0; s0 < 160; s0++) { var sx = Math.floor(r() * W), sy = TOPY - 10 + Math.floor(r() * (BASE - TOPY + 6)); ell(c, sx, sy, 2 + Math.floor(r() * 2), 1, s0 % 3 ? S0.frame2 : '#7a829e'); }
    }
    // the motte, the flying bridge and the bailey (3.6): the castle's terrace tops a grassy mound; a wooden bridge runs down
    // its slope to the back gate of a yard fenced with a palisade; in front, the main gate and a drawbridge over the ditch
    var dirt = sc.biome === 'desert' ? '#e2b77c' : sc.season === 'winter' || sc.biome === 'tundra' ? '#e6eef4' : '#cdb98a', dirt2 = sc.biome === 'desert' ? '#cf9f62' : sc.season === 'winter' || sc.biome === 'tundra' ? '#cfdbe4' : '#b9a473';
    stoneFace(c, 0, BASE, W, 6, S0); R(c, 0, BASE, W, 1, P.ink); R(c, 0, BASE + 6, W, 1, P.ink);
    R(c, 0, BASE + 7, W, BY - BASE - 7, g[0]); c.globalAlpha = 0.12; for (var sh = 0; sh < 4; sh++) R(c, 0, BASE + 7 + sh * 14, W, BY - BASE - 7 - sh * 14, P.ink); c.globalAlpha = 1; // the slope of the motte (darker toward its foot)
    for (var my = BASE + 9; my < BY; my += 5) for (var mx2 = (my * 3) % 11; mx2 < W; mx2 += 11) R(c, mx2, my, 3, 1, g[1]);
    R(c, 0, BASE + 7, W, 2, 'rgba(255,255,255,0.18)'); c.globalAlpha = 0.25; R(c, 0, BY - 6, W, 6, P.ink); c.globalAlpha = 1; // the brow of the mound and the shadow at its foot
    for (var rk = 0; rk < 9; rk++) { var rx0 = Math.floor(r() * W), ry0 = BASE + 16 + Math.floor(r() * 34); if (Math.abs(rx0 - DOORX) > 18) { ell(c, rx0, ry0, 3, 2, S0.frame2); ell(c, rx0 - 1, ry0 - 1, 2, 1, S0.frame); px(c, rx0 - 2, ry0 - 1, P.white); } } // stones in the grass
    R(c, 0, BY, W, FPY - BY, g[0]); for (var f0 = 0; f0 < 120; f0++) px(c, Math.floor(r() * W), BY + 2 + Math.floor(r() * (FPY - BY - 4)), g[1]);
    ell(c, DOORX, BY + 92, 112, 70, dirt); ell(c, DOORX, BY + 92, 100, 62, dirt2); ell(c, DOORX, BY + 92, 96, 58, dirt); // the trodden yard
    for (var ln = BY; ln < FPY; ln += 3) R(c, DOORX - 9, ln, 18, 2, (ln % 6) ? dirt2 : dirt); // the lane from the back gate to the main gate
    if (sc.season !== 'winter' && sc.biome !== 'desert' && sc.biome !== 'tundra') for (var fl = 0; fl < 18; fl++) { var fx0 = 14 + Math.floor(r() * (W - 28)), fy0 = BY + 6 + Math.floor(r() * (FPY - BY - 12)); if (Math.abs(fx0 - DOORX) > 60 || fy0 > BY + 150) px(c, fx0, fy0, [P.pink, P.yellow, P.white][fl % 3]); }
    function stakes(x0, x1, base, tall, gapA, gapB) { for (var sx = x0; sx < x1; sx += 4) { if (sx + 3 > gapA && sx < gapB) continue; R(c, sx, base - tall, 4, tall, P.ink); R(c, sx + 1, base - tall + 2, 2, tall - 2, (sx / 4) % 2 ? P.wood : '#9a6b45'); px(c, sx + 1, base - tall + 1, P.wood); px(c, sx + 2, base - tall, P.ink); } R(c, x0, base - Math.round(tall * 0.6), x1 - x0, 1, P.bark); }
    stakes(0, W, BY + 2, 16, DOORX - 11, DOORX + 11); [DOORX - 12, DOORX + 9].forEach(function (gx) { R(c, gx, BY - 22, 4, 24, P.ink); R(c, gx + 1, BY - 21, 2, 22, P.bark); }); // the back palisade and its gate
    for (var sy2 = BY + 2; sy2 < FPY; sy2 += 3) { [[2, 1], [W - 10, -1]].forEach(function (q) { R(c, q[0], sy2, 8, 3, P.ink); R(c, q[0] + 1, sy2, 6, 2, (sy2 / 3) % 2 ? P.wood : '#9a6b45'); px(c, q[1] > 0 ? q[0] + 7 : q[0], sy2, P.wood); }); } // the side palisades
    // the flying bridge down the slope (planks, rails, trestle legs)
    for (var by0 = BASE + 6; by0 < BY + 4; by0 += 3) { R(c, DOORX - 9, by0, 18, 3, P.ink); R(c, DOORX - 8, by0, 16, 2, (by0 % 6) ? P.wood : '#b07a4f'); }
    [DOORX - 11, DOORX + 10].forEach(function (rx) { R(c, rx, BASE + 2, 1, BY - BASE, P.bark); for (var ry = BASE + 4; ry < BY; ry += 10) R(c, rx - 1, ry, 3, 6, P.ink); });
    [BASE + 22, BASE + 40].forEach(function (ty) { R(c, DOORX - 12, ty, 2, 10, P.bark); R(c, DOORX + 10, ty, 2, 10, P.bark); });
    // the front palisade with the main gate, the ditch of water, the drawbridge
    stakes(0, W, FPY + 2, 14, DOORX - 13, DOORX + 13);
    [DOORX - 17, DOORX + 13].forEach(function (gx) { R(c, gx, FPY - 26, 5, 28, P.ink); R(c, gx + 1, FPY - 25, 3, 27, P.bark); R(c, gx - 2, FPY - 29, 9, 4, P.ink); R(c, gx - 1, FPY - 28, 7, 2, '#e2bd62'); }); // the gate posts with little roofs
    R(c, DOORX - 13, FPY - 26, 26, 3, P.ink); R(c, DOORX - 12, FPY - 25, 24, 1, P.wood); // the lintel
    var ice = sc.season === 'winter' || sc.biome === 'tundra', wat = ice ? [P.silver, P.white] : [P.blue, P.sky];
    R(c, 0, FPY + 3, W, 1, '#5a3d2b'); R(c, 0, FPY + 4, W, 15, wat[0]); for (var wv = 0; wv < 18; wv++) R(c, (wv * 37 + (sc.f || 0)) % W, FPY + 7 + (wv % 3) * 4, 6, 1, wat[1]); R(c, 0, FPY + 19, W, 1, '#5a3d2b'); // the ditch
    if (!ice) for (var rd = 6; rd < W; rd += 23) if (Math.abs(rd - DOORX) > 20) { R(c, rd, FPY + 15, 1, 5, P.green); R(c, rd + 2, FPY + 14, 1, 6, P.teal); }
    for (var dbx = FPY + 2; dbx < FPY + 22; dbx += 3) { R(c, DOORX - 11, dbx, 22, 3, P.ink); R(c, DOORX - 10, dbx, 20, 2, (dbx % 6) ? P.wood : '#b07a4f'); } line(c, DOORX - 15, FPY - 18, DOORX - 10, FPY + 20, P.slate); line(c, DOORX + 15, FPY - 18, DOORX + 10, FPY + 20, P.slate); // the drawbridge and its chains
    R(c, 0, FPY + 20, W, H - FPY - 20, g[0]); for (var f1 = 0; f1 < 40; f1++) px(c, Math.floor(r() * W), FPY + 21 + Math.floor(r() * (H - FPY - 22)), g[1]);
    // the shell: the outer walls, then every floor: its rooms (wide or not) and its bare chambers
    R(c, OX - 6, TOPY - 1, BLOCKS * CW + 12, BASE - TOPY + 1, P.ink); stoneFace(c, OX - 5, TOPY, BLOCKS * CW + 10, BASE - TOPY, S0);
    for (var f = 0; f < ROWS; f++) for (var bk = 0; bk < BLOCKS; bk++) {
      var t = own[f + ',' + bk];
      if (t) { var rr = L.rooms[t]; if (rr.b !== bk) continue; var B = inner(f, bk, rr.w); R(c, B.x - 1, B.y - 1, B.w + 2, B.h + 2, P.ink); var Dz = L.decor[t] && CS.DESIGNS[L.decor[t]]; if (Dz && ownsDesign(L.decor[t])) themed(c, t, B, sc, Dz); else drawRoom(c, t, B, sc); arches(c, B, S0); continue; }
      var e = inner(f, bk, 1); R(c, e.x - 1, e.y - 1, e.w + 2, e.h + 2, P.ink); c.save(); c.beginPath(); c.rect(e.x, e.y, e.w, e.h); c.clip(); emptyRoom(c, e, sc, S0, !CS.open(stage, f), f * 3 + bk * 7); c.restore(); arches(c, e, S0);
    }
    // between neighbors on a floor: a solid wall with a doorway, or an open archway (between two rooms, if you chose it)
    for (var f2 = 0; f2 < ROWS; f2++) for (var b2 = 1; b2 < BLOCKS; b2++) {
      var lt = own[f2 + ',' + (b2 - 1)], rt = own[f2 + ',' + b2]; if (lt && lt === rt) continue;
      var x = colX(b2), top = cellRect(f2, 0).y + 2, fy = floorY(f2);
      if (lt && rt && L.walls[f2 + ',' + b2] === 'arch') { // the wall taken out: the floor runs through under a stone arch
        c.save(); c.beginPath(); c.rect(x - 3, top, 6, CH - 4); c.clip(); BG[lt](c, { x: x - 40, y: top, w: 80, h: CH - 4 }, sc); c.restore();
        for (var i = 0; i < 9; i++) { var wq = Math.round(9 - Math.sqrt(81 - (9 - i) * (9 - i))); R(c, x - 12, top + i, wq + 1, 1, S0.frame); R(c, x + 12 - wq, top + i, wq + 1, 1, S0.frame); }
        R(c, x - 12, top, 25, 2, S0.frame2); R(c, x - 1, top, 3, 3, S0.wall); continue;
      }
      R(c, x - 6, top - 2, 12, CH - 2, P.ink); stoneFace(c, x - 5, top - 2, 10, CH - 3, S0); // a solid wall (it takes a little from each side)
      R(c, x - 4, fy - 26, 8, 28, P.ink); R(c, x - 3, fy - 25, 6, 27, '#2a2433'); ell(c, x, fy - 25, 3, 2, '#2a2433');
    }
    for (var f3 = 0; f3 < ROWS; f3++) { var dx = colX(BLOCKS), fy3 = floorY(f3); R(c, dx - 3, fy3 - 26, 6, 28, P.ink); R(c, dx - 2, fy3 - 25, 4, 27, '#2a2433'); } // doorways onto the elevator
    for (var c3 = 0; c3 < BLOCKS; c3++) roof(c, sc, st, S0, colX(c3), TOPY, c3 === 1 ? 'flat' : 'peak');
    stairTower(c, L, S0, building, stage, lit);
    // the elevator: a tower on the right with a landing at every floor, its deck above the roofs
    var sx0 = EX - SW / 2;
    R(c, sx0 - 1, TT - 1, SW + 2, BASE - TT + 1, P.ink); stoneFace(c, sx0, TT, SW, BASE - TT, S0); R(c, sx0 + 3, TT + 2, SW - 6, BASE - TT - 2, '#231d2b');
    R(c, sx0 + 4, TT + 2, 1, BASE - TT - 2, '#4a4058'); R(c, sx0 + SW - 5, TT + 2, 1, BASE - TT - 2, '#4a4058');
    for (var lr = 0; lr < ROWS; lr++) { var ly = floorY(lr) + 1; R(c, sx0 + 1, ly, SW - 2, 2, S0.frame2); R(c, sx0 + 1, ly, SW - 2, 1, P.ink); R(c, sx0 + SW - 4, ly - 30, 2, 2, lit ? P.yellow : P.orange); }
    R(c, EX - 8, TT - 4, 16, 4, P.ink); R(c, EX - 7, TT - 3, 14, 2, P.dark);
    R(c, EX - 30, TT - 1, 44, 3, P.ink); R(c, EX - 29, TT, 42, 1, S0.wall); for (var cx2 = EX - 30; cx2 < EX + 14; cx2 += 6) { R(c, cx2, TT - 6, 4, 5, P.ink); R(c, cx2 + 1, TT - 5, 2, 4, S0.wall); }
    if (L.obs) observatory(c, sc, S0);
    else if (st !== 'cave') { var ttall = 18; for (var i2 = 0; i2 <= ttall; i2++) { var hf = Math.round(i2 * 9 / ttall); R(c, EX - hf - 1, TT - 6 - ttall + i2, 2 * hf + 3, 1, P.ink); if (i2) R(c, EX - hf + 1, TT - 6 - ttall + i2, Math.max(1, 2 * hf - 1), 1, S0.roof); } R(c, EX, TT - 6 - ttall - 7, 1, 7, P.ink); R(c, EX + 1, TT - 6 - ttall - 7, 5, 3, sc.accent || P.red); }
    // the front door in the terrace under the throne hall, and two lanterns
    R(c, DOORX - 9, BASE - 2, 18, 9, P.ink); R(c, DOORX - 8, BASE - 1, 16, 7, '#1b1622'); ell(c, DOORX, BASE - 2, 8, 4, P.ink); ell(c, DOORX, BASE - 2, 7, 3, '#1b1622');
    [DOORX - 16, DOORX + 15].forEach(function (lx) { R(c, lx, BASE - 10, 2, 16, P.ink); R(c, lx - 2, BASE - 14, 6, 5, P.ink); R(c, lx - 1, BASE - 13, 4, 3, lit ? P.yellow : P.sand); if (lit) { c.globalAlpha = 0.18; disc(c, lx + 1, BASE - 12, 9, P.yellow); c.globalAlpha = 1; } }); // lanterns at the top of the bridge
    // in build mode: a + on an empty chamber you can furnish, a padlock where the floor isn't open yet, a little arch on each wall you can open
    if (building) {
      for (var r2 = 0; r2 < ROWS; r2++) for (var c2 = 0; c2 < BLOCKS; c2++) {
        if (own[r2 + ',' + c2]) continue; var cr2 = cellRect(r2, c2), ok = CS.open(stage, r2);
        if (ok) { c.globalAlpha = 0.25; R(c, cr2.x + 4, cr2.y + 4, cr2.w - 8, cr2.h - 8, P.yellow); c.globalAlpha = 1; dashed(c, cr2.x + 4, cr2.y + 4, cr2.w - 8, cr2.h - 8, P.yellow); spr(c, cr2.x + cr2.w / 2 - 3, cr2.y + cr2.h / 2 - 3, ['...y...', '...y...', '...y...', 'yyyyyyy', '...y...', '...y...', '...y...']); }
        else { dashed(c, cr2.x + 4, cr2.y + 4, cr2.w - 8, cr2.h - 8, P.silver); spr(c, cr2.x + cr2.w / 2 - 2, cr2.y + cr2.h / 2 - 3, ['.sss.', 's...s', 'sssss', 'ss.ss', 'sssss']); }
      }
      for (var f4 = 0; f4 < ROWS; f4++) for (var b4 = 1; b4 < BLOCKS; b4++) { var l4 = own[f4 + ',' + (b4 - 1)], r4 = own[f4 + ',' + b4]; if (l4 && r4 && l4 !== r4) { var wx = colX(b4), wy = cellRect(f4, 0).y + 14; R(c, wx - 4, wy - 1, 9, 8, P.ink); spr(c, wx - 3, wy, ['.yyy.', 'y...y', 'y...y', 'y...y', 'y...y', 'y...y']); } }
    }
    return cv;
  }
  function arches(c, B, S0) { [[B.x, 1], [B.x + B.w - 1, -1]].forEach(function (q) { for (var i = 0; i < 6; i++) R(c, q[1] > 0 ? q[0] : q[0] - (5 - i), B.y + i, 6 - i - (i ? 1 : 0), 1, S0.frame); }); R(c, B.x, B.y, B.w, 1, 'rgba(26,28,44,0.25)'); R(c, B.x, B.y + 1, 1, B.h - 1, 'rgba(26,28,44,0.15)'); }
  function dashed(c, x, y, w, h, col) { for (var i = 0; i < w; i += 4) { R(c, x + i, y, 2, 1, col); R(c, x + i, y + h - 1, 2, 1, col); } for (var j = 0; j < h; j += 4) { R(c, x, y + j, 1, 2, col); R(c, x + w - 1, y + j, 1, 2, col); } }

  /* ---------- where things are: set up each time the layout changes ---------- */
  var lastLay = '', LAY = null;
  function setup(S) {
    var L = CS.layout(S), key = JSON.stringify(L); if (key === lastLay && LAY) return LAY; lastLay = key; LAY = L;
    A.BOARD_P = null; A.CART_P = null;
    CS.SLOT_ORDER.forEach(function (sl) {
      var t = L.orn[sl], x = CS.SLOTS[sl];
      if (t === 'board') { A.BOARD_P = { x: x - 15, y: SURF - 32, w: 30, h: 32 }; A.BOARD_SPOT_P = { x: x + (x < DOORX ? 20 : -20), y: SURF }; }
      if (t === 'cart') { A.CART_AT = { x: x, y: SURF + 1, s: 0.6 }; A.CART_P = { x: x - 20, y: SURF - 30, w: 40, h: 31 }; }
    });
    A.LANDMARKS = [];
    Object.keys(L.rooms).forEach(function (t) { var d = CS.ROOMS[t], r = L.rooms[t], b = roomBox(L, t); if (d.place) A.LANDMARKS.push({ id: d.place, row: r.f, r: { x: b.x, y: b.y, w: b.w, h: b.h }, door: { x: b.x + 46, y: floorY(r.f) } }); });
    CS.SLOT_ORDER.forEach(function (sl) { var t = L.orn[sl]; if (t && CS.ORN[t].fun) A.LANDMARKS.push({ id: t, row: -1, r: ornRect(sl, t), door: { x: CS.SLOTS[sl] + (CS.SLOTS[sl] < DOORX ? 16 : -16), y: SURF } }); });
    CS.PLOT_ORDER.forEach(function (pl) { var t = L.bailey[pl], p = CS.PLOTS[pl]; if (t) A.LANDMARKS.push({ id: t, row: p.row, r: plotRect(pl), door: { x: p.x, y: floorY(p.row) } }); });
    if (!CS.hasOrn(L, 'outhouse')) { var rb = L.rooms.bath, bb = roomBox(L, 'bath'); A.LANDMARKS.push({ id: 'outhouse', bath: true, row: rb.f, r: { x: bb.x + 70, y: bb.y + 40, w: 20, h: 36 }, door: { x: bb.x + 79, y: floorY(rb.f) } }); } // no outhouse: he uses the bathroom
    return L;
  }
  CS.current = function () { var a = app(); return a && a.S ? setup(a.S) : CS.layout(null); };

  /* ---------- Aiu's place and his walk there (the elevator or the stairs, whichever is shorter) ---------- */
  var OUT_SPOT = { x: DOORX + 22, y: SURF }; // at the foot of the steps
  function targetFor(sc, L) {
    var a = app();
    if (a.visit && a.visit.id) {
      if (a.visit.id === 'board' && A.BOARD_SPOT_P) return { x: A.BOARD_SPOT_P.x, row: -1, key: 'v:board', out: 1 };
      var lm = (A.LANDMARKS || []).filter(function (x) { return x.id === a.visit.id; })[0];
      if (lm && lm.bath) { var bb = roomBox(L, 'bath'); return { x: bb.x + 79, row: L.rooms.bath.f, key: 'v:potty', anim: 'potty', room: 'bath', b: bb, visitRoom: true }; }
      if (lm) return { x: lm.door.x, row: lm.row, key: 'v:' + lm.id, out: lm.row < 0 ? 1 : 0, visitRoom: lm.row >= 0, b: lm.row >= 0 ? lm.r : null };
    }
    if (!sc.stage) { var lb = roomBox(L, 'living'); return { x: lb.x + 50, row: L.rooms.living.f, key: 'egg', b: lb }; }
    var pw = patrolNow(sc); if (pw) return { x: pw.x, row: pw.row, key: 'patrol:' + pw.i, out: 1, patrol: 1 };
    if (outsideAct(sc, L)) {
      if (sc.act === 'hibachi') return { x: A.CART_AT.x, row: -1, key: 'cart', cart: true, out: 1 };
      if (sc.act === 'stargaze') return { x: OBS.ax, row: -2, key: 'obs', out: 1 };
      if (sc.act === 'board' && A.BOARD_SPOT_P) return { x: A.BOARD_SPOT_P.x, row: -1, key: 'board', out: 1 };
      var need = OUTSIDE[sc.act], sl = need ? CS.hasOrn(L, need) : null;
      if (sl && CS.SLOTS[sl]) return { x: CS.SLOTS[sl] + (CS.SLOTS[sl] < DOORX ? 22 : -24), row: -1, key: 'o:' + sc.act, out: 1 };
      return { x: OUT_SPOT.x, row: -1, key: 'out:' + sc.act, out: 1 };
    }
    var an = animFor(sc, L), A0 = ANIM[an], B = roomBox(L, A0.room);
    return { x: B.x + A0.x, row: L.rooms[A0.room].f, key: 'in:' + an + ':' + B.x + ',' + B.y, anim: an, room: A0.room, b: B };
  }
  var walker = { pos: null, path: null, start: 0, dur: 0, len: 0, key: '', tgt: null, drop: null }, lift = { y: floorY(0) };
  function segLen(a0, b0) { return b0.ride ? Math.abs(b0.y - a0.y) * 0.7 : Math.abs(b0.x - a0.x) + Math.abs(b0.y - a0.y) * 1.4; }
  function plan(from, to, L) { // the shortest way: walk along floors, ride the elevator, climb a staircase, the front steps (Dijkstra over a handful of points)
    var N = [{ lv: from.row, x: from.x }, { lv: to.row, x: to.x }], E = [];
    function node(lv, x) { N.push({ lv: lv, x: x }); return N.length - 1; }
    var lifts = [0, 1, 2, 3, 4, -2].map(function (lv) { return node(lv, EX); });
    lifts.forEach(function (a0, i) { lifts.forEach(function (b0, j) { if (i !== j) E.push({ a: a0, b: b0, k: 'ride' }); }); });
    Object.keys(L.stairs).forEach(function (k) { var f = +k, a0 = node(f, STX), b0 = node(f + 1, STX); E.push({ a: a0, b: b0, k: 'stairs' }, { a: b0, b: a0, k: 'stairs' }); }); // (the spiral stair in the tower)
    var lane = [0, -3, -5, -6, -1].map(function (lv) { return node(lv, DOORX); }); for (var li = 1; li < lane.length; li++) E.push({ a: lane[li - 1], b: lane[li], k: 'steps' }, { a: lane[li], b: lane[li - 1], k: 'steps' }); // out the front door, down the flying bridge and the bailey's lane
    var pt = function (i) { return { x: N[i].x, y: floorY(N[i].lv) }; };
    var dist = N.map(function () { return Infinity; }), prev = N.map(function () { return null; }), done = {}; dist[0] = 0;
    for (;;) {
      var u = -1; for (var i = 0; i < N.length; i++) if (!done[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i; if (u < 0 || u === 1) break; done[u] = 1;
      for (var v = 0; v < N.length; v++) if (v !== u && N[v].lv === N[u].lv) { var dw = dist[u] + Math.abs(N[v].x - N[u].x); if (dw < dist[v]) { dist[v] = dw; prev[v] = { u: u, k: 'walk' }; } }
      E.forEach(function (e) { if (e.a !== u) return; var dc = dist[u] + segLen(pt(u), Object.assign(pt(e.b), { ride: e.k === 'ride' })); if (dc < dist[e.b]) { dist[e.b] = dc; prev[e.b] = { u: u, k: e.k }; } });
    }
    var seq = [], at = 1; while (at !== null && at !== 0 && prev[at]) { seq.unshift({ i: at, k: prev[at].k }); at = prev[at].u; }
    var pts = [{ x: from.x, y: floorY(from.row), row: from.row }]; seq.forEach(function (s) { pts.push({ x: N[s.i].x, y: floorY(N[s.i].lv), row: N[s.i].lv, ride: s.k === 'ride' ? 1 : 0, spiral: s.k === 'stairs' ? 1 : 0 }); });
    if (pts.length === 1) pts.push({ x: to.x, y: floorY(to.row), row: to.row });
    var len = 0; for (var q = 1; q < pts.length; q++) len += segLen(pts[q - 1], pts[q]);
    return { pts: pts, len: len };
  }
  function walkAt(now) {
    var w = walker, d = (now - w.start) / w.dur * w.len;
    for (var i = 1; i < w.path.length; i++) { var a0 = w.path[i - 1], b0 = w.path[i], sl = segLen(a0, b0); if (d <= sl) { var k = sl ? d / sl : 1, yk = a0.y + (b0.y - a0.y) * k; return { x: a0.x + (b0.x - a0.x) * k + (b0.spiral ? Math.round(Math.sin(yk / 8) * 4) : 0), y: yk, row: k < 0.5 ? a0.row : b0.row, left: b0.spiral ? Math.cos(yk / 8) > 0 : b0.x < a0.x, ride: !!b0.ride, done: false }; } /* (round and round on the spiral stair) */ d -= sl; }
    var e = w.path[w.path.length - 1]; return { x: e.x, y: e.y, row: e.row, left: false, done: true };
  }
  var faceLeft = false;
  CS.aiuNow = function (sc, L) {
    var now = Date.now(), tgt = targetFor(sc, L);
    if (!walker.pos) walker.pos = { x: tgt.x, row: tgt.row };
    if (walker.drop) { walker.pos = { x: walker.drop.x, row: walker.drop.row }; walker.drop = null; walker.key = ''; walker.path = null; }
    if (tgt.key !== walker.key || walker.lay !== lastLay) {
      var cur = walker.path ? walkAt(now) : { x: walker.pos.x, row: walker.pos.row };
      if (cur.row !== tgt.row || Math.abs(cur.x - tgt.x) > 1) { var pl = plan({ x: cur.x, row: cur.row }, tgt, L); walker.path = pl.pts; walker.len = pl.len; walker.start = now; walker.dur = Math.max(400, pl.len / 40 * 1000); }
      else walker.path = null;
      walker.key = tgt.key; walker.tgt = tgt; walker.lay = lastLay;
    }
    if (walker.path) { var p = walkAt(now); if (!p.done) { if (p.ride) lift.y = p.y; else faceLeft = p.left; return { x: p.x, y: p.y, row: p.row, walking: true, left: p.left, ride: p.ride, tgt: tgt }; } walker.path = null; }
    walker.pos = { x: tgt.x, row: tgt.row };
    return { x: tgt.x, y: floorY(tgt.row), row: tgt.row, walking: false, tgt: tgt, left: faceLeft };
  };
  CS.walking = function () { return !!walker.path; };
  CS.atCast = function () { return !walker.path && !!walker.tgt && walker.tgt.anim === 'icast'; }; // at his throne for the I Ching toss (3.7: the toss waits for this)
  CS.dropAt = function (p) { var row = p.y > BASE ? -1 : Math.max(0, Math.min(ROWS - 1, rowAt(p.y))); if (row >= 0 && blockAt(p.x) < 0) row = -1; walker.drop = { x: Math.max(OX + 6, Math.min((row >= 0 ? OX + BLOCKS * CW : W) - 8, p.x)), row: row }; };
  function oldAnchor(sc) { // where the old outdoor pictures put him (for what he still does with them: outside, tricks, the egg)
    if (!sc.stage) return { x: sc.spotX || (sc.indoor ? 104 : A.AIU_OUT), y: sc.indoor ? 100 : 97 };
    if (sc.act === 'sleep' || sc.mode === 'sleepy') return { x: 160, y: sc.mode === 'sleepy' ? 84 : 86 };
    if (sc.spotX) return { x: sc.spotX, y: 100 };
    return sc.indoor ? { x: 104, y: 100 } : { x: A.AIU_OUT, y: 97 };
  }
  var lastMap = { x: 0, y: 0 }, lastPos = null;
  CS.frameOff = function () { return lastMap; };
  CS.aiuPos = function () { return lastPos; };
  function car(c, y, front) { // the elevator car (its back wall and lamp, or its frame in front of whoever rides)
    var x0 = EX - 9, top = Math.round(y) - 28;
    if (!front) { R(c, EX, TT, 1, top - TT, P.ink); R(c, x0, top, 18, 31, P.ink); R(c, x0 + 1, top + 1, 16, 29, '#f3dcae'); R(c, x0 + 1, top + 1, 16, 3, P.wood); px(c, EX, top + 5, P.yellow); return; }
    R(c, x0, top, 2, 31, P.ink); R(c, x0 + 16, top, 2, 31, P.ink); R(c, x0, top, 18, 2, P.bark); R(c, x0, top + 29, 18, 2, P.bark); px(c, x0 + 1, top + 12, P.yellow); px(c, x0 + 16, top + 12, P.yellow);
  }

  /* ---------- the pet: in the courtyard, out of Aiu's way; at night at the foot of his bed ---------- */
  var HOMEBOUND = /^(care_|petbuddy|feedbuddy|waterbuddy|fetch|ride|board)/;
  function petAt(sc, aiu) {
    var b = A.buddyOf(sc.soul, sc.buddy), PLY = AIU.play, home = { x: DOORX + 46, y: SURF }, care = sc.act && HOMEBOUND.test(sc.act), L = CS.current();
    var stay = A.POSTED[b] || care || sc.phase === 'night' || (PLY && PLY.active && PLY.active()) || (sc.bplay && sc.bplay.a); // (3.6.2: the pet stays in the bailey, day and night; at night it rests at home by the steps)
    var p = home, left = false;
    if (!stay) { var w = WF.wanderAt('cbuddy' + (sc.soul || 0), sc.tsec * 0.8, DOORX + 34, W - 12, 0, 0, 1); p = { x: Math.round(w.x), y: SURF }; left = w.left; }
    if (aiu && aiu.row === -1 && !aiu.walking && Math.abs(aiu.x - p.x) < 24 && !care) p = { x: aiu.x < p.x ? Math.min(W - 8, aiu.x + 24) : Math.max(DOORX + 34, aiu.x - 24), y: SURF };
    if (care && aiu && aiu.row === -1) p = { x: Math.min(W - 10, aiu.x + 24), y: SURF };
    var tp = A.toyPos && A.toyPos('buddy', p); if (tp) p = { x: Math.round(tp.x), y: SURF };
    return { x: p.x, y: p.y, left: left };
  }
  // the drone hovers in the sky, top right
  var droneOff = null;
  function droneOffset(sc) { if (droneOff) return droneOff; var r0 = A.droneRect(Object.assign({}, sc, { place: 'home', indoor: false })); if (!r0) return { x: 0, y: 0 }; droneOff = { x: 306 - (r0.x + r0.w / 2), y: 16 - r0.y }; return droneOff; }
  CS.droneRect = function (sc) { var r = A.droneRect(Object.assign({}, sc, { place: 'home', indoor: false })); if (!r) return null; var o = droneOffset(sc); return { x: r.x + o.x, y: r.y + o.y, w: r.w, h: r.h }; };

  /* ---------- drawing a frame ---------- */
  var layer = null;
  CS.building = false;
  CS.render = function (ctx, sc) {
    ctx.setTransform(SC, 0, 0, SC, 0, 0); ctx.imageSmoothingEnabled = false;
    var a = app(), S = a.S, L = setup(S); sc.stageNow = S ? S.stage : 0; sc.castle = true;
    var cos = sc.cos || {}, night = sc.phase === 'night' || sc.phase === 'dusk';
    var key = [sc.biome, sc.season, sc.house, sc.accent, lastLay, CS.DESIGN_ORDER.filter(ownsDesign).join(','), CS.FURN_ORDER.map(function (fp) { return CS.FURN_ITEMS[fp].filter(function (id) { return ownsFurn(fp, id); }).join('+'); }).join(','), CS.building ? 'b' : '', sc.stageNow, sc.phase, cos.wall && cos.wall.it && cos.wall.it.id, cos.rug && cos.rug.it && cos.rug.it.id, Math.floor((sc.f || 0) / 15) % 2].join('|');
    if (stat.key !== key) { if (!stat.back || stat.bk !== sc.biome + sc.season) { stat.back = drawBack(sc); stat.bk = sc.biome + sc.season; } stat.front = drawFront(sc, L, CS.building); stat.key = key; }
    if (!layer) layer = big(W, H);
    var Lc = layer.getContext('2d'); Lc.setTransform(SC, 0, 0, SC, 0, 0); Lc.imageSmoothingEnabled = false; Lc.clearRect(0, 0, W, H);
    ctx.clearRect(0, 0, W, H);
    IN.drawSky(ctx, 0, 0, W, BASE, IN.skyBands(sc.phase, sc.weather)); IN.skyThings(ctx, sc, [0, 0, W, RIDGE - 10]);
    Lc.drawImage(stat.back, 0, 0, W, H);
    if (L.mill) millAt(Lc, MILL_X, ridgeAt(MILL_X) + 3, sc); // the windmill, up on the hill behind
    var od = A.oddNow && A.oddNow(sc); CS._od = null; // a strange friendly creature wandering the ridge
    if (od) { var ox = Math.round(od.x * W / 192), oy = ridgeAt(ox) + 2; CS._od = { x: ox, y: oy, od: od }; Lc.save(); Lc.translate(ox, oy); Lc.translate(-od.x, -od.y); A.drawOdd(Lc, od, sc); Lc.restore(); }
    Lc.drawImage(stat.front, 0, 0, W, H);
    if (L.rooms.living) { var lvb = roomBox(L, 'living'); WF.regulatorSmall(Lc, lvb.x + 80, lvb.y + 10, sc); } // the clock really ticks
    var aiu = CS.aiuNow(sc, L), tg = aiu.tgt, cooking = !aiu.walking && tg.cart && sc.act === 'hibachi';
    car(Lc, lift.y, false); if (!aiu.ride) car(Lc, lift.y, true); // the elevator car, waiting at its floor
    // the courtyard: each spot, the shop's yard decoration, the food cart, the board
    CS.PLOT_ORDER.forEach(function (pl) { var t = L.bailey[pl]; if (t) BART[t](Lc, CS.PLOTS[pl].x, floorY(CS.PLOTS[pl].row), sc); }); // the bailey's buildings
    CS.SLOT_ORDER.forEach(function (sl) { var t = L.orn[sl]; if (t && ORNART[t]) ORNART[t](Lc, CS.SLOTS[sl], sc); });
    if (cos.yard && cos.yard.img) { var yi = cos.yard.img, yx = DOORX + 50; Lc.drawImage(yi, yx - Math.floor(yi.width / 2), SURF - yi.height); if (cos.yard.it && cos.yard.it.id === 'yard-lantern' && night) { Lc.globalAlpha = 0.35; disc(Lc, yx, SURF - yi.height + 4, 6, P.yellow); Lc.globalAlpha = 1; } }
    if (A.CART_P) WF.drawCart(Lc, Object.assign({}, sc, { indoor: false }), cooking && !(A.toyHide && A.toyHide('aiu')));
    if (sc.stage && A.BOARD_P) { Lc.save(); Lc.translate(A.BOARD_P.x, A.BOARD_P.y); Lc.scale(30 / 36, 30 / 36); Lc.translate(-3, -103); var bp = A.BOARD_P; A.BOARD_P = { x: 3, y: 103, w: 36, h: 36 }; WF.board(Lc, sc); A.BOARD_P = bp; Lc.restore(); }
    // the pet, then Aiu
    var pp = petAt(sc, aiu), anc = oldAnchor(sc);
    lastPos = { x: aiu.x, y: aiu.y, row: aiu.row, s: 1 };
    lastMap = { x: aiu.x - anc.x, y: aiu.y - anc.y };
    if (sc.stage && !(A.toyHide && A.toyHide('buddy'))) WF.drawBuddyAt(Lc, Object.assign({}, sc, { indoor: false }), pp, lastMap);
    var hideAiu = (A.toyHide && A.toyHide('aiu')) || (a.visit && a.visit.phase === 'in' && !tg.visitRoom);
    var form = sc.skin || sc.form, cr = sc.stage && form ? A.creature(form.seed, form.stage, sc.soul) : null;
    var trick = /^(hop|spin|jump|dance|wiggle|yawn|greet)$/.test(sc.mode || '') || !!sc.evolve;
    var clipB = function (b) { Lc.save(); if (b) { Lc.beginPath(); Lc.rect(b.x, b.y - 8, b.w, b.h + 8); Lc.clip(); } };
    if (!sc.stage) { clipB(tg.b); Lc.translate(lastMap.x, lastMap.y); IN.drawActor(Lc, sc); Lc.restore(); } // the egg, in the living room
    else if (!hideAiu && !cooking) {
      if (aiu.ride && cr) { drawAiu(Lc, sc, cr, EX, aiu.y, { shadow: false }); car(Lc, aiu.y, true); } // riding the elevator
      else if (aiu.walking) WF.drawWalker(Lc, sc, { x: aiu.x, y: aiu.y }, aiu.left, 1, false);
      else if (tg.anim && !trick && cr) { clipB(tg.b); ANIM[tg.anim].draw(Lc, tg.b, sc, cr, sc.f || 0); Lc.restore(); }
      else if (cr && !trick && (tg.visitRoom || tg.patrol || (tg.out && !(sc.act in OUTSIDE)))) drawAiu(Lc, sc, cr, aiu.x, aiu.y, { flip: aiu.left, eyes: tg.visitRoom ? 'happy' : null });
      else { clipB(tg.b); Lc.translate(lastMap.x, lastMap.y); IN.drawActor(Lc, Object.assign({}, sc, { walk: null })); Lc.restore(); } // the old pictures: outside acts, tricks, evolving
    } else if (aiu.ride) car(Lc, aiu.y, true);
    // the time of day: the sky, the hills and the courtyard darken; the furnished rooms stay lamp-lit
    var dim = sc.phase === 'night' ? 0.55 : sc.phase === 'dusk' || sc.phase === 'dawn' ? 0.25 : (sc.weather === 'storm' || sc.weather === 'rain') ? 0.18 : 0;
    if (dim) {
      Lc.save(); Lc.globalCompositeOperation = 'source-atop'; Lc.beginPath(); Lc.rect(0, 0, W, H); Object.keys(L.rooms).forEach(function (t) { var b = roomBox(L, t); Lc.rect(b.x, b.y, b.w, b.h); }); Lc.clip('evenodd');
      Lc.globalAlpha = dim; R(Lc, 0, 0, W, H, P.ink); Lc.restore();
      Lc.save(); Lc.globalCompositeOperation = 'source-atop'; Lc.globalAlpha = dim * 0.2; Object.keys(L.rooms).forEach(function (t) { var b = roomBox(L, t); R(Lc, b.x, b.y, b.w, b.h, P.ink); }); Lc.restore();
    }
    ctx.drawImage(layer, 0, 0, W, H);
    stringLights(ctx, sc); // (after the dark, so they glow)
    if (tg.patrol && sc.stage && !hideAiu) { var lx = Math.round(aiu.x + (aiu.left ? -7 : 7)), lyy = Math.round(aiu.y - 11); ctx.globalAlpha = 0.22; disc(ctx, lx, lyy, 14, P.yellow); ctx.globalAlpha = 0.35; disc(ctx, lx, lyy, 7, P.yellow); ctx.globalAlpha = 1; R(ctx, lx, lyy - 6, 1, 3, P.ink); box(ctx, lx - 2, lyy - 3, 5, 6, P.dark); R(ctx, lx - 1, lyy - 2, 3, 4, P.yellow); } // his lantern
    if (sc.stage) { var dof = droneOffset(sc); ctx.save(); ctx.translate(dof.x, dof.y); IN.drone(ctx, sc); ctx.restore(); }
    var wy = RIDGE - 4; IN.weather(ctx, sc, [0, 0, W / 2, wy]); IN.weather(ctx, sc, [W / 2, 0, W / 2, wy]); IN.weather(ctx, sc, [0, BASE + 7, W, H - BASE - 7]);
    if (sc.flash) { var rr = Math.round(10 + (1 - Math.min(1, sc.flash)) * 18); for (var sp = 0; sp < 12; sp++) { var an = sp / 12 * Math.PI * 2; px(ctx, Math.round(aiu.x + Math.cos(an) * rr), Math.round(aiu.y - 14 + Math.sin(an) * rr * 0.7), sp % 2 ? P.yellow : P.white); } }
    if (A.toyDraw) A.toyDraw(ctx, sc);
    if (CS.building) buildOverlay(ctx, sc, L);
  };
  function stringLights(c, sc) { // 3.7: strings of little bulbs swagged along the bailey's palisade: lit and twinkling at night, off by day
    var on = sc.phase === 'night' || sc.phase === 'dusk', f = sc.f || 0, cols = [P.yellow, P.pink, P.cyan, P.lime, P.orange];
    [[BY - 14, 0, W], [FPY - 12, 0, DOORX - 18], [FPY - 12, DOORX + 18, W]].forEach(function (run) {
      var y0 = run[0], span = 32;
      for (var x0 = run[1]; x0 < run[2]; x0 += span) {
        var x1 = Math.min(run[2], x0 + span), n = 0;
        for (var x = x0; x <= x1; x++) { var k = (x - x0) / Math.max(1, x1 - x0), y = Math.round(y0 + Math.sin(k * Math.PI) * 5); px(c, x, y, P.ink); if ((x - x0) % 6 === 3) { var col = cols[(Math.floor(x / 6) + n) % cols.length], tw = on && (f + x * 7) % 23 !== 0; if (tw) { c.globalAlpha = 0.3; disc(c, x, y + 2, 3, col); c.globalAlpha = 1; } R(c, x, y + 1, 1, 2, tw ? col : P.slate); if (tw) px(c, x, y + 1, P.white); } }
      }
    });
  }
  function buildOverlay(ctx, sc, L) {
    var t = Date.now() / 300, stg = sc.stageNow || 0;
    if (CS.moving && L.rooms[CS.moving]) { var r0 = roomBox(L, CS.moving); ctx.strokeStyle = P.yellow; ctx.lineWidth = 1; ctx.setLineDash([2, 2]); ctx.lineDashOffset = Math.floor(t) % 4; ctx.strokeRect(r0.x + 0.5, r0.y + 0.5, r0.w - 1, r0.h - 1); ctx.setLineDash([]);
      for (var f = 0; f < ROWS; f++) for (var b = 0; b < BLOCKS; b++) if (CS.moveTo(L, stg, CS.moving, f, b)) { var cr = cellRect(f, b); ctx.globalAlpha = 0.22; R(ctx, cr.x + 4, cr.y + 4, cr.w - 8, cr.h - 8, P.yellow); ctx.globalAlpha = 1; } }
    CS.PLOT_ORDER.forEach(function (pl) { var pr = plotRect(pl); if (CS.movingPlot) { ctx.globalAlpha = pl === CS.movingPlot ? 0.4 : 0.2; R(ctx, pr.x, pr.y, pr.w, pr.h, P.yellow); ctx.globalAlpha = 1; } else if (!L.bailey[pl]) { dashed(ctx, pr.x + 4, pr.y + 6, pr.w - 8, pr.h - 8, P.yellow); spr(ctx, pr.x + pr.w / 2 - 3, pr.y + pr.h / 2 - 2, ['...y...', '...y...', 'yyyyyyy', '...y...', '...y...']); } });
    if (CS.movingOrn) { var x0 = CS.SLOTS[CS.movingOrn]; ctx.strokeStyle = P.yellow; ctx.strokeRect(x0 - 15.5, SURF - 36.5, 31, 38); CS.SLOT_ORDER.forEach(function (sl) { if (sl !== CS.movingOrn) { ctx.globalAlpha = 0.25; R(ctx, CS.SLOTS[sl] - 14, SURF - 34, 28, 34, P.yellow); ctx.globalAlpha = 1; } }); }
    else CS.SLOT_ORDER.forEach(function (sl) { if (!L.orn[sl]) { dashed(ctx, CS.SLOTS[sl] - 12, SURF - 26, 24, 26, P.yellow); spr(ctx, CS.SLOTS[sl] - 2, SURF - 15, ['..y..', '..y..', 'yyyyy', '..y..', '..y..']); } });
    if (!L.obs) { var ok = stg >= CS.OBS.stage; dashed(ctx, OBS.x - 9, OBS.y - 36, 18, 18, ok ? P.yellow : P.silver); spr(ctx, OBS.x - 2, OBS.y - 30, ok ? ['..y..', '..y..', 'yyyyy', '..y..', '..y..'] : ['.sss.', 's...s', 'sssss', 'ss.ss', 'sssss']); }
    if (!L.mill) { var my = ridgeAt(MILL_X); dashed(ctx, MILL_X - 10, my - 26, 20, 26, (sc.stageNow || 0) >= CS.ORN.windmill.stage ? P.yellow : P.silver); spr(ctx, MILL_X - 2, my - 16, ['..y..', '..y..', 'yyyyy', '..y..', '..y..']); }
  }

  /* ---------- what's under a tap ---------- */
  function inR(p, r) { return !!(r && p && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h); }
  function obsR() { return { x: EX - 16, y: OBS.y - 34, w: 30, h: 34 }; }
  function millR() { var my = ridgeAt(MILL_X); return { x: MILL_X - 14, y: my - 38, w: 28, h: 40 }; }
  CS.hitAt = function (pt, sc) {
    if (!pt || !sc) return null;
    var L = CS.current(), own = owners(L);
    if (CS.building) {
      if (inR(pt, obsR())) return { kind: 'bobs' };
      if (inR(pt, millR())) return { kind: 'bmill' };
      if (pt.y > BASE + 2) { var pl0 = CS.PLOT_ORDER.filter(function (q) { return inR(pt, plotRect(q)); })[0]; if (pl0) return { kind: 'bplot', plot: pl0 }; var sl = CS.SLOT_ORDER.filter(function (s) { return Math.abs(pt.x - CS.SLOTS[s]) <= 18 && pt.y >= SURF - 40 && pt.y <= SURF + 4; })[0]; return sl ? { kind: 'bslot', slot: sl } : null; }
      if (pt.x >= STX - 12 && pt.x <= STX + 12 && pt.y < BASE && pt.y > TOPY - 10) { var g = Math.floor((BASE - 9 - pt.y) / CH); if (g >= 0 && g < ROWS - 1) return { kind: 'bstairs', k: String(g) }; return null; } // the spiral-stair tower
      var f = rowAt(pt.y), b = blockAt(pt.x); if (f < 0 || f >= ROWS || b < 0) return null;
      for (var b2 = 1; b2 < BLOCKS; b2++) { var l2 = own[f + ',' + (b2 - 1)], r2 = own[f + ',' + b2]; if (l2 && r2 && l2 !== r2 && Math.abs(pt.x - colX(b2)) <= 7 && !CS.moving) return { kind: 'bwall', k: f + ',' + b2 }; }
      return { kind: 'bcell', f: f, b: b, cell: cellAt(pt.x) };
    }
    if (inR(pt, CS.droneRect(sc))) return { kind: 'drone' };
    var ap = lastPos; if (ap && Math.abs(pt.x - ap.x) <= 11 && pt.y >= ap.y - 26 && pt.y <= ap.y + 3) return { kind: 'aiu' };
    if (sc.stage && inR(pt, A.buddyRectP && A.buddyRectP(sc))) return { kind: 'buddy' };
    if (sc.stage && inR(pt, A.BOARD_P)) return { kind: 'board' };
    if (inR(pt, A.CART_P)) return { kind: 'cart' };
    if (L.obs && inR(pt, obsR())) return { kind: 'obs' };
    if (L.mill && inR(pt, millR())) return { kind: 'orn', id: 'windmill' };
    if (pt.y > BASE + 2) {
      var hit = null; CS.SLOT_ORDER.forEach(function (s) { var t = L.orn[s]; if (t && inR(pt, ornRect(s, t))) hit = t; });
      if (!hit) { var pl1 = CS.PLOT_ORDER.filter(function (q) { return L.bailey[q] && inR(pt, plotRect(q)); })[0]; if (pl1) return { kind: 'landmark', id: L.bailey[pl1] }; }
      if (hit && CS.ORN[hit].fun) return { kind: 'landmark', id: hit };
      if (hit) return { kind: 'orn', id: hit };
      if (Math.abs(pt.x - DOORX) <= 14 && pt.y > FPY - 30) return { kind: 'gate' };
      return null;
    }
    var rr = rowAt(pt.y), bb = blockAt(pt.x), t0 = rr >= 0 && rr < ROWS && bb >= 0 ? own[rr + ',' + bb] : null;
    if (t0) { var d = CS.ROOMS[t0]; if (t0 === 'office') return { kind: 'computer' }; if (d.place) return { kind: 'landmark', id: d.place }; return { kind: 'room', type: t0 }; }
    if (CS._od && Math.abs(pt.x - CS._od.x) <= 12 && pt.y <= CS._od.y + 3 && pt.y >= CS._od.y - 22) return { kind: 'oddity', odd: CS._od.od };
    return null;
  };

  /* ---------- build mode (the hammer under the picture) ---------- */
  CS.setBuilding = function (on) { CS.building = !!on; CS.moving = null; CS.movingOrn = null; CS.movingPlot = null; stat.key = null; if (AIU.ui.refresh) AIU.ui.refresh(); };
  function spend(price, what) { var a = app(); if ((a.S.tokens || 0) < price) return Promise.resolve(false); if (!price) return Promise.resolve(true); return a.addEvents([{ type: 'tspend', data: { what: ('castle:' + what).slice(0, 30), price: price } }]).then(function () { return true; }); }
  function refund(price, what) { return price > 0 ? app().addEvents([{ type: 'trefund', data: { what: String(what).slice(0, 30), price: price } }]) : Promise.resolve(); } // (3.5: you get back everything you paid)
  function pay(price, what, then) { var k = AIU.ui.k, S = app().S; if ((S.tokens || 0) < price) { k.snack('You need ' + (price - (S.tokens || 0)) + ' more tokens.'); return; } spend(price, what).then(function (paid) { if (!paid) return k.snack('The wallet came up short.'); then(); }); }
  CS.buildTap = function (hit) {
    var a = app(), S = a.S, L = CS.current(), k = AIU.ui.k, stage = S.stage || 0, own = owners(L);
    if (!hit) return;
    if (hit.kind === 'bobs') return obsSheet(L);
    if (hit.kind === 'bmill') return millSheet(L);
    if (hit.kind === 'bstairs') return L.stairs[hit.k] ? stairsSheet(L, hit.k) : buildStairs(L, +hit.k, null);
    if (hit.kind === 'bwall') return wallSheet(L, hit.k);
    if (hit.kind === 'bcell') {
      var t = own[hit.f + ',' + hit.b];
      if (CS.moving) {
        var mv = CS.moving; if (t === mv) { CS.moving = null; return; }
        var n = CS.moveTo(L, stage, mv, hit.f, hit.b);
        if (!n) { k.snack(!CS.open(stage, hit.f) ? 'That floor isn\'t open yet.' : t && CS.ROOMS[t].anchor ? 'The throne hall stays put.' : 'It doesn\'t fit there (it swaps only with a room the same width).'); return; }
        CS.moving = null; a.beep('knock'); return CS.save({ rooms: n });
      }
      if (t) return roomSheet(L, t, hit.f, hit.cell);
      if (!CS.open(stage, hit.f)) return k.snack('This floor opens when ' + S.totemName + ' reaches ' + C.stageName(CS.openNeeds(hit.f)) + '.');
      return pickRoom(L, hit.f, hit.b, hit.cell);
    }
    if (hit.kind === 'bplot') {
      var pl = hit.plot, bt = L.bailey[pl];
      if (CS.movingPlot) { var b2 = Object.assign({}, L.bailey), mp = CS.movingPlot, tb = b2[pl]; b2[pl] = b2[mp]; b2[mp] = tb; CS.movingPlot = null; a.beep('knock'); return CS.save({ bailey: b2 }); }
      return bt ? baileySheet(L, pl, bt) : pickBailey(L, pl);
    }
    if (hit.kind === 'bslot') {
      var sl = hit.slot, o = L.orn[sl];
      if (CS.movingOrn) { var o2 = Object.assign({}, L.orn), m = CS.movingOrn, tmp = o2[sl]; o2[sl] = o2[m]; o2[m] = tmp; CS.movingOrn = null; a.beep('knock'); return CS.save({ orn: o2 }); }
      if (o) return ornSheet(L, sl, o);
      return pickOrn(L, sl);
    }
  };
  function buyRow(h, d, ok, rich, have, onBuy) {
    return h('button', { type: 'button', cls: 'qrow' + (ok && rich && !have ? '' : ' dim'), onclick: onBuy }, h('span', { cls: 'qrtitle', text: d.name }), h('span', { cls: 'small', text: (have ? 'built' : ok ? (d.cost ? d.cost + ' tokens' : 'free') : 'opens at ' + C.stageName(d.stage)) + ' · ' + d.desc }));
  }
  function buildStairs(L, f, close) { // a flight of the spiral stair from floor f up to the next
    var k = AIU.ui.k, S = app().S;
    if (f < 0 || f >= ROWS - 1) return;
    if (!CS.open(S.stage || 0, f + 1)) return k.snack('The floor above opens when ' + S.totemName + ' reaches ' + C.stageName(CS.openNeeds(f + 1)) + '.');
    if (L.stairs[f]) return k.snack('The spiral stair already goes up from this floor.');
    if (close) close(); pay(STAIRS, 'stairs', function () { var st = Object.assign({}, L.stairs); st[f] = 1; CS.save({ stairs: st }).then(function () { app().beep('knock'); k.snack('Built: the spiral stair from floor ' + (f + 1) + ' up to floor ' + (f + 2) + '.'); }); });
  }
  function stairsBtn(L, f, cell, close) { // (in a room's sheet) the spiral stair up from this floor
    var k = AIU.ui.k; if (f >= ROWS - 1 || L.stairs[f]) return null;
    return k.btn('Spiral stair up from this floor (' + STAIRS + ' tokens)', function () { buildStairs(L, f, close); });
  }
  function pickRoom(L, f, b, cell) {
    var a = app(), S = a.S, k = AIU.ui.k, h = U.h, s, list = h('div', { cls: 'morelist' });
    Object.keys(CS.ROOMS).filter(function (t) { return !CS.ROOMS[t].core; }).forEach(function (t) {
      var d = CS.ROOMS[t], ok = (S.stage || 0) >= d.stage, rich = (S.tokens || 0) >= d.cost, have = CS.has(L, t);
      list.appendChild(buyRow(h, d, ok, rich, have, function () {
        if (have) return k.snack('You have the ' + d.name.toLowerCase() + ' already. Move it here instead.');
        if (!ok) return k.snack(d.name + ' opens when ' + S.totemName + ' reaches ' + C.stageName(d.stage) + '.');
        s.remove(); pay(d.cost || 0, t, function () { var n = Object.assign({}, L.rooms); n[t] = { f: f, b: b, w: 1 }; CS.save({ rooms: n }).then(function () { a.beep('coin'); a.react('happy'); k.snack('Built: ' + d.name + '.'); }); });
      }));
    });
    s = k.sheet('Build a room', [h('p', { cls: 'small', text: 'You have ' + (S.tokens || 0) + ' tokens. Each room is one of a kind; you can move it, widen it and take it back out (all your tokens back).' }), list, h('div', { cls: 'row wrap' }, stairsBtn(L, f, cell, function () { s.remove(); }))]);
  }
  function roomSheet(L, t, f, cell) {
    var a = app(), S = a.S, k = AIU.ui.k, h = U.h, d = CS.ROOMS[t], r = L.rooms[t], s, stage = S.stage || 0, close = function () { s.remove(); }, acts = [];
    if (!d.anchor) acts.push(k.btn('Move', function () { close(); CS.moving = t; k.snack('Tap where it goes (a room the same width swaps with it).'); }, 'primary'));
    [[-1, 'Widen left'], [1, 'Widen right']].forEach(function (q) { if (CS.canWiden(L, stage, t, q[0])) acts.push(k.btn(q[1] + ' (' + WIDEN + ')', function () { close(); pay(WIDEN, 'widen:' + t, function () { var n = Object.assign({}, L.rooms); n[t] = { f: r.f, b: q[0] < 0 ? r.b - 1 : r.b, w: r.w + 1 }; CS.save({ rooms: n }).then(function () { a.beep('coin'); k.snack(d.name + ': 4 cells wider.'); }); }); })); });
    if (r.w > 1) acts.push(k.btn('Narrow (' + WIDEN + ' back)', function () { close(); var n = Object.assign({}, L.rooms), keep = d.anchor && r.b + r.w - 1 === 1 ? 'left' : 'right'; n[t] = { f: r.f, b: keep === 'left' ? r.b + 1 : r.b, w: r.w - 1 }; refund(WIDEN, 'narrow:' + t).then(function () { return CS.save({ rooms: n }); }).then(function () { k.snack(d.name + ': 4 cells narrower.'); }); }));
    if (CS.canRemove(L, t)) acts.push(k.btn('Remove', function () {
      var back = (d.cost || 0) + (r.w - 1) * WIDEN; if (!confirm('Take out the ' + d.name.toLowerCase() + '? You get all its tokens back (' + back + ').')) return;
      close(); var n = Object.assign({}, L.rooms); delete n[t]; refund(back, t).then(function () { return CS.save({ rooms: n }); }).then(function () { k.snack('Removed. The chamber is empty again.'); });
    }, 'del'));
    var dn = L.decor[t] && CS.DESIGNS[L.decor[t]] ? CS.DESIGNS[L.decor[t]].name : 'Default'; acts.push(k.btn('Design: ' + dn, function () { close(); CS.designSheet(t); })); // 3.7
    var fp0 = FURN_IN[t]; if (fp0) { var fid = L.furn[fp0], fnm = fid && ownsFurn(fp0, fid) ? CS.FURN[fp0].items[fid].name : 'Default'; acts.push(k.btn(CS.FURN[fp0].name + ': ' + fnm, function () { close(); CS.furnSheet(fp0); })); } // 3.8
    var sb = stairsBtn(L, f, cell, close); if (sb) acts.push(sb);
    s = k.sheet(d.name, [h('p', { text: d.desc }), h('p', { cls: 'small', text: (r.w * 4) + ' cells wide.' + (d.anchor ? ' The throne hall is the heart of the castle: it can widen, but it stays put.' : d.core ? ' One of the four first rooms: it can move and widen, but it stays.' : '') }), h('div', { cls: 'row wrap' }, acts)]);
  }
  function stairsSheet(L, key) {
    var k = AIU.ui.k, h = U.h, s, p = key.split(',');
    var back = L.stairs[key] === 2 ? 0 : STAIRS; // (the starter staircase was free)
    s = k.sheet('Spiral stair', [h('p', { text: 'The spiral stair in the tower, from floor ' + (+p[0] + 1) + ' up to floor ' + (+p[0] + 2) + '. Aiu takes the stairs or the elevator, whichever is shorter.' }), h('div', { cls: 'row wrap' }, k.btn(back ? 'Remove (' + back + ' back)' : 'Remove', function () { s.remove(); var st = Object.assign({}, L.stairs); delete st[key]; refund(back, 'stairs').then(function () { return CS.save({ stairs: st }); }).then(function () { k.snack('Removed.'); }); }, 'del'))]);
  }
  function wallSheet(L, key) {
    var k = AIU.ui.k, h = U.h, s, arch = L.walls[key] === 'arch', set = function (v) { s.remove(); var w = Object.assign({}, L.walls); if (v) w[key] = 'arch'; else delete w[key]; app().beep('knock'); CS.save({ walls: w }); };
    s = k.sheet('The wall between two rooms', [h('p', { text: arch ? 'It\'s an open archway now: the two rooms read as one big space.' : 'It\'s a solid wall with a doorway now.' }), h('p', { cls: 'small', text: 'Free, any time.' }), h('div', { cls: 'row wrap' }, k.btn('Open archway', function () { set(true); }, arch ? '' : 'primary'), k.btn('Solid wall', function () { set(false); }, arch ? 'primary' : ''))]);
  }
  function pickBailey(L, pl) {
    var a = app(), S = a.S, k = AIU.ui.k, h = U.h, s, list = h('div', { cls: 'morelist' });
    Object.keys(CS.BAILEY).forEach(function (t) {
      var d = CS.BAILEY[t], ok = (S.stage || 0) >= d.stage, rich = (S.tokens || 0) >= d.cost, have = CS.PLOT_ORDER.some(function (q) { return L.bailey[q] === t; });
      list.appendChild(buyRow(h, d, ok, rich, have, function () {
        if (have) return k.snack('It\'s already in the bailey. Move it instead.');
        if (!ok) return k.snack(d.name + ' comes when ' + S.totemName + ' reaches ' + C.stageName(d.stage) + '.');
        s.remove(); pay(d.cost, 'bailey:' + t, function () { var b2 = Object.assign({}, L.bailey); b2[pl] = t; CS.save({ bailey: b2 }).then(function () { a.beep('coin'); a.react('happy'); k.snack('Built in the bailey: ' + d.name + '.'); }); });
      }));
    });
    s = k.sheet('Build in the bailey', [h('p', { cls: 'small', text: 'You have ' + (S.tokens || 0) + ' tokens. Four plots inside the palisade; each building is one of a kind, and you get all its tokens back if you take it down.' }), list]);
  }
  function baileySheet(L, pl, t) {
    var k = AIU.ui.k, h = U.h, d = CS.BAILEY[t], s;
    s = k.sheet(d.name, [h('p', { text: d.desc }), h('div', { cls: 'row wrap' },
      k.btn('Move', function () { s.remove(); CS.movingPlot = pl; k.snack('Tap the plot where it goes (what\'s there swaps with it).'); }, 'primary'),
      k.btn('Remove (' + d.cost + ' back)', function () { if (!confirm('Take down the ' + d.name.toLowerCase() + '? You get all its tokens back.')) return; s.remove(); var b2 = Object.assign({}, L.bailey); b2[pl] = null; refund(d.cost, 'bailey:' + t).then(function () { return CS.save({ bailey: b2 }); }).then(function () { k.snack('Taken down.'); }); }, 'del'))]);
  }
  function pickOrn(L, sl) {
    var a = app(), S = a.S, k = AIU.ui.k, h = U.h, s, list = h('div', { cls: 'morelist' });
    Object.keys(CS.ORN).filter(function (t) { return !CS.ORN[t].core; }).forEach(function (t) {
      var d = CS.ORN[t], ok = (S.stage || 0) >= d.stage, rich = (S.tokens || 0) >= d.cost, have = !!CS.hasOrn(L, t);
      list.appendChild(buyRow(h, d, ok, rich, have, function () {
        if (have) return k.snack('It\'s already out there. Move it instead.');
        if (!ok) return k.snack(d.name + ' comes when ' + S.totemName + ' reaches ' + C.stageName(d.stage) + '.');
        s.remove(); pay(d.cost, t, function () { var o2 = Object.assign({}, L.orn); if (d.back) { CS.save({ mill: true }).then(function () { a.beep('coin'); k.snack('Built: the windmill, up on the hill.'); }); return; } o2[sl] = t; if (t === 'pond' || t === 'well') wellByPond(o2); CS.save({ orn: o2 }).then(function () { a.beep('coin'); k.snack('Built: ' + d.name + '.'); }); });
      }));
    });
    s = k.sheet('Build in the courtyard', [h('p', { cls: 'small', text: 'You have ' + (S.tokens || 0) + ' tokens. (The observatory goes on the elevator tower and the windmill on the hill: tap the + up there.)' }), list]);
  }
  function ornSheet(L, sl, t) {
    var k = AIU.ui.k, h = U.h, d = CS.ORN[t], s;
    var acts = [k.btn('Move', function () { s.remove(); CS.movingOrn = sl; k.snack('Tap the spot where it goes (what\'s there swaps with it).'); }, 'primary')];
    if (!d.core) acts.push(k.btn('Remove', function () { if (!confirm('Take out the ' + d.name.toLowerCase() + '? You get all its tokens back (' + (d.cost || 0) + ').')) return; s.remove(); var o2 = Object.assign({}, L.orn); o2[sl] = null; refund(d.cost || 0, t).then(function () { return CS.save({ orn: o2 }); }).then(function () { k.snack('Removed.'); }); }, 'del'));
    s = k.sheet(d.name, [h('p', { text: d.desc }), d.core ? h('p', { cls: 'small', text: 'It can move to another spot, but it stays.' }) : null, h('div', { cls: 'row wrap' }, acts)]);
  }
  function backSheet(L, d, flag, what, done) { // the observatory and the windmill: build one, or take it down
    var a = app(), S = a.S, k = AIU.ui.k, h = U.h, s;
    if (L[flag]) { s = k.sheet(d.name, [h('p', { text: d.desc }), h('div', { cls: 'row wrap' }, k.btn('Remove (' + d.cost + ' back)', function () { if (!confirm('Take down the ' + d.name.toLowerCase() + '? You get all its tokens back.')) return; s.remove(); var o = {}; o[flag] = false; refund(d.cost, what).then(function () { return CS.save(o); }).then(function () { k.snack('Removed.'); }); }, 'del'))]); return; }
    if ((S.stage || 0) < d.stage) return k.snack('The ' + d.name.toLowerCase() + ' comes when ' + S.totemName + ' reaches ' + C.stageName(d.stage) + '.');
    s = k.sheet(d.name, [h('p', { text: d.desc }), h('p', { cls: 'small', text: d.cost + ' tokens (you have ' + (S.tokens || 0) + ').' }), h('div', { cls: 'row wrap' }, k.btn('Build it', function () { s.remove(); pay(d.cost, what, function () { var o = {}; o[flag] = true; CS.save(o).then(function () { a.beep('coin'); a.react('happy'); k.snack(done); }); }); }, 'primary'))]);
  }
  function obsSheet(L) { backSheet(L, CS.OBS, 'obs', 'obs', 'Built: the observatory. ' + app().S.totemName + ' will ride up to stargaze at night.'); }
  function millSheet(L) { backSheet(L, CS.ORN.windmill, 'mill', 'windmill', 'Built: the windmill, up on the hill.'); }
  // 3.7: a room's design: Default and every design you own (bought at the Corner Mart), each with a little preview
  CS.designSheet = function (t) {
    var L = CS.current(), k = AIU.ui.k, h = U.h, s, cur = L.decor[t] || '', d0 = CS.ROOMS[t];
    if (!d0 || !L.rooms[t]) return;
    function pick(id) { s.remove(); var dc = Object.assign({}, L.decor); if (id) dc[t] = id; else delete dc[t]; CS.save({ decor: dc }).then(function () { app().beep('knock'); k.snack(d0.name + ': ' + (id ? CS.DESIGNS[id].name : 'Default') + ' design.'); }); }
    var mine = [''].concat(CS.DESIGN_ORDER.filter(ownsDesign)), grid = h('div', { cls: 'dgrid' });
    mine.forEach(function (id) {
      var pic = CS.previewDesign(id, t, 1); pic.className = 'dprev';
      grid.appendChild(h('button', { type: 'button', cls: 'dcell' + (id === cur ? ' on' : ''), onclick: function () { pick(id); }, 'aria-label': (id ? CS.DESIGNS[id].name : 'Default') + (id === cur ? ', in use' : '') }, pic, h('span', { text: (id ? CS.DESIGNS[id].name : 'Default') + (id === cur ? ' ✓' : '') })));
    });
    var more = CS.DESIGN_ORDER.length - mine.length + 1;
    s = k.sheet(d0.name + ': design', [h('p', { cls: 'small', text: 'Tap a design to use it in this room. The room\'s furniture stays; its walls and floor change (and a roomy wall gets a piece of decor).' }), grid,
      h('div', { cls: 'row wrap' }, k.btn(more > 0 ? 'More designs at the Corner Mart (' + more + ')' : 'See them at the Corner Mart', function () { s.remove(); if (AIU.shop && AIU.shop.openShelf) AIU.shop.openShelf('design'); else AIU.ui.go('shop'); }))]);
  };
  CS.furnSheet = function (fp) { // 3.8: pick the fridge, bed or toilet this room uses (from what you own)
    var L = CS.current(), k = AIU.ui.k, h = U.h, s, F = CS.FURN[fp], cur = L.furn[fp] && ownsFurn(fp, L.furn[fp]) ? L.furn[fp] : '';
    if (!F) return;
    function pick(id) { s.remove(); var fu = Object.assign({}, L.furn); if (id) fu[fp] = id; else delete fu[fp]; CS.save({ furn: fu }).then(function () { app().beep('knock'); k.snack(CS.ROOMS[F.room].name + ': ' + (id ? F.items[id].name : 'the ' + F.name.toLowerCase() + ' it came with') + '.'); }); }
    var mine = [''].concat(CS.FURN_ITEMS[fp].filter(function (id) { return ownsFurn(fp, id); })), grid = h('div', { cls: 'dgrid' });
    mine.forEach(function (id) {
      var pic = CS.previewFurn(fp, id, 1), nm = id ? F.items[id].name : 'Default'; pic.className = 'dprev';
      grid.appendChild(h('button', { type: 'button', cls: 'dcell' + (id === cur ? ' on' : ''), onclick: function () { pick(id); }, 'aria-label': nm + (id === cur ? ', in use' : '') }, pic, h('span', { text: nm + (id === cur ? ' ✓' : '') })));
    });
    var more = CS.FURN_ITEMS[fp].length - mine.length + 1;
    s = k.sheet(CS.ROOMS[F.room].name + ': ' + F.name.toLowerCase(), [h('p', { cls: 'small', text: 'Tap one to put it in. The old one goes back in storage (you can switch back any time).' }), grid,
      h('div', { cls: 'row wrap' }, k.btn(more > 0 ? 'More at the Corner Mart (' + more + ')' : 'See the Furniture shelf', function () { s.remove(); if (AIU.shop && AIU.shop.openShelf) AIU.shop.openShelf('furn'); else AIU.ui.go('shop'); }))]);
  };
  CS.roomInfo = function (type) { var d = CS.ROOMS[type]; return d ? d.name + ': ' + d.desc : ''; };
  CS.obsInfo = function () { return CS.OBS.name + ': ' + CS.OBS.desc; };
})();
