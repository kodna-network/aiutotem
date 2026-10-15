/* AIU TOTEM - 8-bit world. Everything is drawn in code on a 192x108 canvas.
   Colors: the Sweetie 16 palette by GrafxKid (free to use), plus 4 earth tones. */
(function () {
  'use strict';
  var U = AIU.util, A = AIU.art = {};
  var W = 192, H = 108, GY = 84;
  A.W = W; A.H = H;
  var P = A.P = {
    ink: '#1a1c2c', plum: '#5d275d', red: '#b13e53', orange: '#ef7d57', yellow: '#ffcd75', lime: '#a7f070', green: '#38b764',
    teal: '#257179', navy: '#29366f', blue: '#3b5dc9', sky: '#41a6f6', cyan: '#73eff7', white: '#f4f4f4', silver: '#94b0c2',
    slate: '#566c86', dark: '#333c57', wood: '#a0673e', bark: '#6b3f2a', sand: '#f2d59a', pink: '#f5a3b5'
  };
  var MAP = { k: P.ink, p: P.plum, r: P.red, o: P.orange, y: P.yellow, l: P.lime, g: P.green, t: P.teal, n: P.navy, b: P.blue,
    i: P.sky, c: P.cyan, w: P.white, s: P.silver, S: P.slate, d: P.dark, W: P.wood, B: P.bark, a: P.sand, P: P.pink };

  /* ---------- drawing primitives ---------- */
  function R(c, x, y, w, h, col) { if (col) c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function px(c, x, y, col) { R(c, x, y, 1, 1, col); }
  function spr(c, x, y, rows, flip) {
    for (var j = 0; j < rows.length; j++) {
      var row = rows[j];
      for (var i = 0; i < row.length; i++) {
        var ch = row[flip ? row.length - 1 - i : i];
        if (ch !== '.') px(c, x + i, y + j, MAP[ch]);
      }
    }
  }
  function disc(c, cx, cy, r, col) { for (var dy = -r; dy <= r; dy++) { var w = Math.floor(Math.sqrt(r * r - dy * dy + r * 0.8)); R(c, cx - w, cy + dy, 2 * w + 1, 1, col); } }
  function ell(c, cx, cy, rx, ry, col, topOnly) {
    for (var dy = -ry; dy <= (topOnly ? 0 : ry); dy++) {
      var w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry + 0.01))));
      R(c, cx - w, cy + dy, 2 * w + 1, 1, col);
    }
  }
  function tri(c, cx, top, h, slope, col) { for (var i = 0; i < h; i++) { var w = Math.round(i * slope); R(c, cx - w, top + i, 2 * w + 1, 1, col); } }
  function dith(c, x, y, w, h, col, ph) { c.fillStyle = col; for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) if ((i + j + (ph || 0)) % 2 === 0) c.fillRect(x + i, y + j, 1, 1); }
  function line(c, x0, y0, x1, y1, col) {
    var n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
    for (var i = 0; i <= n; i++) px(c, Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), col);
  }
  function mk(w, h) { var cv = document.createElement('canvas'); cv.width = w; cv.height = h; return cv; }
  A.kit = { R: R, px: px, disc: disc, ell: ell, line: line, mk: mk, spr: spr }; // 2.1.5: the pixel tools, shared with the games
  A.prim = { R: R, px: px, spr: spr, disc: disc, ell: ell, tri: tri, line: line, dith: dith };

  /* ---------- time of day, seasons ---------- */
  A.phase = function (h) { return h < 5 || h >= 21 ? 'night' : h < 7 ? 'dawn' : h < 18 ? 'day' : 'dusk'; };
  A.period = function (h) {
    if (h >= 5 && h < 7) return 'earlybird';
    if (h >= 7 && h < 10) return 'morning';
    if (h >= 10 && h < 12) return 'brunch';
    if (h >= 12 && h < 14) return 'lunch';
    if (h >= 14 && h < 17) return 'afternoon';
    if (h >= 17 && h < 19) return 'supper';
    if (h >= 19 && h < 22) return 'evening';
    return 'bedtime';
  };
  A.PERIOD_NAMES = { earlybird: 'early bird', morning: 'morning', brunch: 'brunch time', lunch: 'lunch', afternoon: 'afternoon',
    supper: 'supper', evening: 'evening', bedtime: 'bedtime' };
  A.season = function (d, hemi) {
    var m = d.getMonth();
    if (hemi === 'south') m = (m + 6) % 12;
    return m >= 2 && m <= 4 ? 'spring' : m >= 5 && m <= 7 ? 'summer' : m >= 8 && m <= 10 ? 'fall' : 'winter';
  };

  /* ---------- choices ---------- */
  A.HOUSES = { cabin: 'Log cabin', cave: 'Caveman den', mansion: 'Mansion', castle: 'Castle', lilypad: 'Lily pad hut' };
  A.BIOMES = { meadow: 'Meadow', forest: 'Forest', desert: 'Desert', tundra: 'Snowy peaks', pond: 'Pond', beach: 'Beach' };

  // Things the Totem can do. "keys" = words that unlock it when you mention them.
  A.ACTIVITIES = {
    sleep: { label: 'sleeping', where: 'in', base: true },
    eat: { label: 'having a snack', where: 'in', base: true },
    water: { label: 'watering a flower', where: 'out', base: true },
    workout: { label: 'working out', where: 'both', base: true },
    fishing: { label: 'fishing', where: 'out', base: true },
    stargaze: { label: 'stargazing', where: 'out', base: true },
    // 2.0.0: more things Aiu does on his own (no unlocking needed)
    kite: { label: 'flying a kite', where: 'out', base: true },
    bubbles: { label: 'blowing bubbles', where: 'both', base: true },
    build: { label: 'building a birdhouse', where: 'out', base: true },
    butterfly: { label: 'chasing a butterfly', where: 'out', base: true },
    newborn: { label: 'just hatched, looking around', where: 'both' }, // 2.1.10: the first 10 minutes after hatching (never picked at random)
    // 2.1.5: Aiu looks after the pet
    petbuddy: { label: 'petting the pet', where: 'out' }, // 2.2.0: not a 20-minute hobby any more: Aiu looks after the pet in short bursts when you check in a calm thing (care_*)
    feedbuddy: { label: 'giving the pet a snack', where: 'out' },
    waterbuddy: { label: 'giving the pet water', where: 'out' },
    care_feed: { label: 'feeding the pet', where: 'out', ritual: true }, care_water: { label: 'giving the pet water', where: 'out', ritual: true },
    care_hug: { label: 'hugging the pet', where: 'out', ritual: true }, care_brush: { label: 'brushing the pet', where: 'out', ritual: true },
    care_read: { label: 'reading to the pet', where: 'out', ritual: true }, care_tuck: { label: 'tucking the pet in for a rest', where: 'out', ritual: true },
    sandcastle: { label: 'building a sandcastle', where: 'out', base: true, need: 'sand' },
    snowman: { label: 'building a snowman', where: 'out', base: true, need: 'snow' },
    journal: { label: 'writing in his journal', where: 'both', base: true }, // 2.1.15: more to do from day one
    tidy: { label: 'tidying up', where: 'both', base: true },
    puzzle: { label: 'doing a jigsaw puzzle', where: 'in', base: true },
    birdwatch: { label: 'birdwatching', where: 'out', base: true },
    read: { label: 'reading a book', where: 'in', keys: ['book', 'books', 'reading', 'novel', 'library', 'comic', 'comics', 'manga'] },
    knit: { label: 'knitting', where: 'in', keys: ['knit', 'knitting', 'yarn', 'crochet', 'sweater', 'scarf', 'sewing'] },
    games: { label: 'playing video games', where: 'in', keys: ['video game', 'video games', 'gaming', 'gamer', 'fortnite', 'xbox', 'playstation', 'ps5', 'nintendo', 'minecraft', 'steam', 'controller', 'hell let loose', 'zelda', 'mario', 'pokemon', 'valorant', 'call of duty'] },
    tv: { label: 'watching TV', where: 'in', keys: ['tv', 'television', 'movie', 'movies', 'netflix', 'series', 'anime', 'youtube', 'film', 'cartoon'] },
    music: { label: 'playing guitar', where: 'both', keys: ['guitar', 'music', 'song', 'songs', 'band', 'beat', 'beats', 'producing', 'piano', 'singing', 'album', 'fl studio', 'drums', 'rap'] },
    paint: { label: 'painting', where: 'out', keys: ['paint', 'painting', 'drawing', 'art', 'sketch', 'sketching', 'canvas', 'doodle'] },
    cook: { label: 'cooking', where: 'in', keys: ['cook', 'cooking', 'recipe', 'bake', 'baking', 'grill', 'bbq', 'soup', 'pancakes'] },
    garden: { label: 'gardening', where: 'out', keys: ['garden', 'gardening', 'plants', 'seeds', 'harvest', 'tomato', 'tomatoes', 'veggies', 'vegetables', 'compost'] },
    ball: { label: 'playing ball', where: 'out', keys: ['soccer', 'football', 'basketball', 'baseball', 'volleyball', 'tennis', 'play catch'] },
    yoga: { label: 'doing yoga', where: 'both', keys: ['yoga', 'meditate', 'meditation', 'stretch', 'stretching', 'mindful'] },
    pottery: { label: 'making pottery', where: 'in', keys: ['clay', 'pottery', 'kiln', 'ceramic', 'ceramics', 'glaze', 'mould', 'sculpt'] },
    tinker: { label: 'tinkering with a 3D printer', where: 'in', keys: ['3d print', '3d printer', '3d printing', 'blender', 'robot', 'arduino', 'raspberry pi', 'solder', 'tinker', 'prototype'] },
    skate: { label: 'skateboarding', where: 'out', keys: ['skate', 'skateboard', 'skating', 'skatepark'] },
    chickens: { label: 'feeding the chickens', where: 'out', keys: ['chicken', 'chickens', 'coop', 'hens', 'rooster', 'homestead'] },
    iching: { label: 'casting the daily I Ching', where: 'both', ritual: true }, // only at the daily reading time
    board: { label: 'checking the bounty board', where: 'both', ritual: true } // 1.1.0: about once an hour, Aiu updates your to-do board
  };

  /* ---------- creature generator (seeded, symmetric, grows with stage) ---------- */
  var CC = {};
  var HUES = [
    [P.lime, P.green, P.teal], [P.cyan, P.sky, P.blue], [P.orange, P.red, P.plum], [P.yellow, P.orange, P.red],
    [P.pink, P.red, P.plum], [P.sky, P.blue, P.navy], [P.white, P.silver, P.slate], [P.lime, P.teal, P.navy],
    [P.sand, P.wood, P.bark], [P.pink, P.plum, P.navy]
  ];
  var ACCENTS = [P.red, P.yellow, P.cyan, P.pink, P.lime, P.orange, P.sky, P.white];

  // Parts kit. Sprites are drawn for the LEFT side and mirrored; tokens: M main, L light, D dark, A accent (soul color),
  // H hair, k ink, w white, s silver, y yellow, a sand, B bark, W wood, r red, P pink, g green, l lime, c cyan, o orange.
  var PARTS = {
    head: {
      cat: { sp: ['M..', 'MM.', 'MPM'], at: 'eye', dx: -1 },
      bunny: { sp: ['.M.', 'MPM', 'MPM', 'MPM', 'MPM'], at: 'eye', dx: -1 },
      round: { sp: ['.MM.', 'MPPM'], at: 'eye', dx: -2 },
      floppy: { sp: ['MM', 'MM', 'MD', 'D.'], at: 'side', dy: 1 },
      devil: { sp: ['r...', 'rr..', '.rr.'], at: 'eye', dx: -2 },
      twig: { sp: ['B.B..', '.B.B.', '..BB.', '..B..'], at: 'eye', dx: -2 },
      ram: { sp: ['.aa.', 'a..a', 'a.a.', '.aa.'], at: 'side', dy: 3 },
      antenna: { sp: ['A.', '.k', '.k'], at: 'eye', dx: -1 },
      unicorn: { sp: ['.w.', '.y.', '.w.', 'yw.', '.yw'], at: 'center', single: true },
      mohawk: { sp: ['HH', 'HH', 'HH'], at: 'center', single: true },
      spikes: { sp: ['H..H..H.', 'HH.HH.HH'], at: 'center', dx: -4, single: true },
      curl: { sp: ['.HH', 'H.H', '.H.'], at: 'center', single: true },
      sprout: { sp: ['lg.', '.gl', '.g.'], at: 'center', single: true },
      bowl: { fn: 'bowl' },
      tuft: { sp: ['A.A', '.AA', '.A.'], at: 'center', single: true }
    },
    back: {
      bat: { sp: ['D.....', 'DD....', 'DDD..D', 'DDDDDD', 'D.D.DD'], wing: true },
      angel: { sp: ['.ww...', 'wwww..', 'swwww.', '.swwww', '..ss..'], wing: true },
      bug: { sp: ['.cc.', 'cwwc', 'cwwc', 'cwc.', '.c..'], wing: true },
      fins: { sp: ['..A', '.AA', 'AAA'], fin: true },
      dragon: { fn: 'backspikes' }
    },
    tail: {
      devil: { sp: ['...r.', '..rrr', '..Dr.', '.D...', 'D....'] },
      fluffy: { sp: ['.LL.', 'LwLL', 'LLL.'] },
      fish: { sp: ['..AA', '.AA.', 'MA..', '.AA.', '..AA'] },
      curl: { sp: ['.MM', 'M.M', 'MM.'] },
      stub: { sp: ['MM', 'M.'] }
    }
  };

  function classic(seed, stage, soul) { // the 1.0.5 mix-and-match creature (Settings > Creature type > Classic)
    var r = U.rng(seed), sz = [14, 14, 16, 18, 20, 22, 24, 26][Math.min(Math.max(stage, 1), 7)];
    var hw = sz / 2, padX = 13, top = 8, GW = sz + padX * 2, GH = sz + top + 3;
    var g = [], y, x, i;
    for (y = 0; y < GH; y++) { g.push([]); for (x = 0; x < GW; x++) g[y].push(null); }
    var hue = HUES[Math.floor(r() * HUES.length)], L = hue[0], M = hue[1], D = hue[2];
    var ACC = ACCENTS[Math.floor(U.rng(soul)() * ACCENTS.length)];
    if (ACC === M || ACC === L) ACC = P.yellow === M ? P.cyan : P.yellow;
    var HAIR = U.pick(r, [P.bark, P.dark, P.yellow, P.orange, P.plum, P.white, ACC]);
    if (HAIR === M) HAIR = P.dark;
    var TOK = { M: M, L: L === M ? P.white : L, D: D, A: ACC, H: HAIR, k: P.ink, w: P.white, s: P.silver, y: P.yellow, a: P.sand, B: P.bark,
      W: P.wood, r: P.red, P: P.pink, g: P.green, l: P.lime, c: P.cyan, o: P.orange };
    var shape = U.pick(r, ['round', 'pear', 'tall', 'bean', 'square', 'round']);
    var ox = padX, oy = top, raw = [], halves = [], parts = [];
    function set(xx, yy, col) { if (yy >= 0 && yy < GH && xx >= 0 && xx < GW) g[yy][xx] = col; }
    function mir(xx) { return 2 * ox + sz - 1 - xx; }
    function setM(xx, yy, col) { set(xx, yy, col); set(mir(xx), yy, col); }
    function body(xx, yy) { return yy >= 0 && yy < GH && xx >= 0 && xx < GW && g[yy][xx] !== null; }
    function topOf(col) { for (var yy2 = 0; yy2 < GH; yy2++) if (g[yy2][col] !== null) return yy2; return oy; }
    function leftOf(row) { for (var xx2 = 0; xx2 < GW; xx2++) if (g[row][xx2] !== null) return xx2; return ox; }
    function rightOf(row) { for (var xx2 = GW - 1; xx2 >= 0; xx2--) if (g[row][xx2] !== null) return xx2; return ox + sz - 1; }
    // stamp a sprite with its bottom-left corner at (x, yb). mirror: also on the other side. under: only fill empty cells.
    function grow(sp) { // double a sprite's size, keeping it chunky
      var out = [];
      sp.forEach(function (row) { var w = row.split('').map(function (ch) { return ch + ch; }).join(''); out.push(w, w); });
      return out;
    }
    function stamp(sp, x0, yb, mirror, under) {
      for (var j = 0; j < sp.length; j++) for (var k = 0; k < sp[j].length; k++) {
        var ch = sp[j].charAt(k); if (ch === '.') continue;
        var X = x0 + k, Y = yb - (sp.length - 1 - j);
        if (!under || !body(X, Y)) set(X, Y, TOK[ch]);
        if (mirror && (!under || !body(mir(X), Y))) set(mir(X), Y, TOK[ch]);
      }
    }
    function roll(p) { return r() < p; }

    // ---- body
    var wob = 0.9 + r() * 0.1, bump = r() * 0.12;
    for (y = 0; y < sz; y++) {
      var yy = (y + 0.5) / sz, e = Math.sqrt(Math.max(0, 1 - Math.pow(2 * yy - 1, 2))), prof;
      if (shape === 'pear') prof = e * (0.68 + 0.36 * yy);
      else if (shape === 'tall') prof = e * 0.8;
      else if (shape === 'bean') prof = Math.min(1, e * 1.12) * (yy < 0.45 ? 0.88 : 1);
      else if (shape === 'square') prof = Math.min(1, e * 1.7) * 0.94;
      else prof = e;
      raw.push(hw * prof * (wob + bump * Math.sin(yy * 6.3 + seed % 7)));
    }
    for (y = 0; y < sz; y++) { // smooth the outline so the sides are clean
      var a = raw[Math.max(0, y - 1)], b = raw[y], cN = raw[Math.min(sz - 1, y + 1)];
      var half = Math.max(1, Math.min(hw, Math.round((a + 2 * b + cN) / 4)));
      if (y > 2 && y < sz - 2 && Math.abs(half - halves[y - 1]) > 1) half = halves[y - 1] + (half > halves[y - 1] ? 1 : -1);
      halves.push(half);
      for (x = hw - half; x < hw + half; x++) set(ox + x, oy + y, M);
    }
    var shade = [];
    for (y = 0; y < sz; y++) for (x = 0; x < GW; x++) {
      var Y0 = oy + y;
      if (!body(x, Y0)) continue;
      if (!body(x, Y0 + 1) || (y > sz * 0.55 && (!body(x - 1, Y0) || !body(x + 1, Y0)))) shade.push([x, Y0]);
    }
    shade.forEach(function (p) { g[p[1]][p[0]] = D; });
    for (y = 1; y < 3; y++) { for (x = 0; x < GW; x++) if (body(x, oy + y) && body(x + 1, oy + y)) { set(x + 1, oy + y, TOK.L); break; } }
    if (roll(0.65)) { // belly
      for (y = Math.floor(sz * 0.55); y < Math.floor(sz * 0.86); y++) {
        var bh = Math.max(1, Math.floor(halves[y] * 0.5));
        for (x = hw - bh; x < hw + bh; x++) if (g[oy + y][ox + x] === M) set(ox + x, oy + y, TOK.L);
      }
    }
    var ey = oy + Math.floor(sz * 0.36), exo = Math.max(1, Math.round(hw * 0.42)), exL = ox + hw - exo - 1, cx0 = ox + hw - 1;
    var crownY = topOf(cx0);
    var bottom = oy + sz - 1, my = ey + 3, armY = Math.min(bottom - 2, ey + 4);

    // ---- pattern
    if (stage >= 3) {
      var mark = U.pick(r, ['stripes', 'spots', 'patch', 'none', 'none']);
      if (mark === 'stripes') for (y = 1; y < 4; y += 2) for (x = hw - 2; x < hw + 2; x++) if (body(ox + x, oy + y)) set(ox + x, oy + y, D);
      if (mark === 'spots') for (i = 0; i < 3; i++) { var sx = ox + 1 + Math.floor(r() * (hw - 2)), sy = oy + 1 + Math.floor(r() * sz * 0.4); if (body(sx, sy) && sy < ey - 1) setM(sx, sy, ACC); }
      if (mark === 'patch') { for (y = ey - 1; y <= ey + 2; y++) for (x = exL - 2; x <= exL + 1; x++) if (body(x, y)) set(x, y, TOK.L); }
      if (mark !== 'none') parts.push(mark);
    }
    // ---- eyes (groups of cells, so blinking works for any style)
    var eyeKinds = stage >= 3 ? ['two', 'two', 'wide', 'sparkle', 'sleepy', 'one', 'three', 'spider', 'dot'] : ['two', 'two', 'wide', 'sparkle', 'one', 'dot'];
    var eyeKind = U.pick(r, eyeKinds), groups = [];
    function eye(cells) { groups.push(cells); cells.forEach(function (c) { set(c[0], c[1], c[2]); }); }
    var W2 = P.white, K = P.ink;
    if (eyeKind === 'one') {
      eye([[cx0 - 1, ey - 1, W2], [cx0, ey - 1, W2], [cx0 + 1, ey - 1, W2], [cx0 + 2, ey - 1, W2], [cx0 - 1, ey, W2], [cx0, ey, K], [cx0 + 1, ey, K], [cx0 + 2, ey, W2], [cx0 - 1, ey + 1, W2], [cx0, ey + 1, K], [cx0 + 1, ey + 1, K], [cx0 + 2, ey + 1, W2]]);
    } else if (eyeKind === 'spider') {
      [[0, 0], [-2, 1], [1, -2], [-1, -2]].forEach(function (o2, n) { var X = exL + o2[0], Y = ey + o2[1]; eye([[X, Y, n === 0 ? K : K]]); eye([[mir(X), Y, K]]); });
    } else if (eyeKind === 'dot') {
      eye([[exL, ey, K], [exL, ey + 1, K]]); eye([[mir(exL), ey, K], [mir(exL), ey + 1, K]]);
    } else {
      var mk2 = function (X, inner) { // X = inner column of the eye
        var out = X === exL ? X - 1 : X + 1;
        if (eyeKind === 'sparkle') return [[out, ey, W2], [X, ey, K], [out, ey + 1, K], [X, ey + 1, K]];
        if (eyeKind === 'sleepy') return [[out, ey, K], [X, ey, K], [out, ey + 1, W2], [X, ey + 1, K]];
        if (eyeKind === 'wide') return [[out, ey, W2], [X, ey, W2], [out, ey + 1, K], [X, ey + 1, W2]];
        return [[out, ey, W2], [X, ey, W2], [out, ey + 1, W2], [X, ey + 1, K]];
      };
      eye(mk2(exL)); eye(mk2(mir(exL)));
      if (eyeKind === 'three') eye([[cx0, ey - 3, W2], [cx0 + 1, ey - 3, W2], [cx0, ey - 2, K], [cx0 + 1, ey - 2, K]]);
    }
    parts.push(eyeKind + ' eye' + (eyeKind === 'one' || eyeKind === 'dot' ? '' : 's'));
    // ---- mouth
    var mouth = U.pick(r, stage >= 4 ? ['smile', 'smile', 'fang', 'fangs', 'o', 'beak', 'cat'] : ['smile', 'smile', 'o', 'cat']);
    if (mouth === 'beak') { set(cx0, my, P.yellow); set(cx0 + 1, my, P.yellow); set(cx0, my + 1, P.orange); set(cx0 + 1, my + 1, P.orange); }
    else if (mouth === 'o') { set(cx0, my, K); set(cx0 + 1, my, K); set(cx0, my + 1, K); set(cx0 + 1, my + 1, K); }
    else if (mouth === 'cat') { set(cx0 - 1, my, K); set(cx0, my + 1, K); set(cx0 + 1, my + 1, K); set(cx0 + 2, my, K); }
    else {
      set(cx0, my, K); set(cx0 + 1, my, K);
      if (sz >= 16) { set(cx0 - 1, my - 1, K); set(cx0 + 2, my - 1, K); }
      if (mouth === 'fang') set(cx0 + 1, my + 1, W2);
      if (mouth === 'fangs') { set(cx0, my + 1, W2); set(cx0 + 1, my + 1, W2); }
    }
    if (mouth !== 'smile') parts.push(mouth === 'o' ? 'round mouth' : mouth === 'cat' ? 'cat mouth' : mouth);
    // ---- face extras
    if (stage >= 2 && roll(0.55) && body(exL - 2, ey + 2)) { setM(exL - 2, ey + 2, P.pink); parts.push('blush'); }
    if (stage >= 3) {
      var face = U.pick(r, ['beard', 'mustache', 'freckles', 'gills', 'none', 'none']);
      if (face === 'beard') { for (y = my + 1; y <= Math.min(bottom, my + 3); y++) { var bw2 = 3 - (y - my - 1); for (x = cx0 - bw2; x <= cx0 + 1 + bw2; x++) if (body(x, y)) set(x, y, HAIR); } set(cx0, bottom + 1, HAIR); set(cx0 + 1, bottom + 1, HAIR); }
      if (face === 'mustache') { for (x = cx0 - 2; x <= cx0 + 3; x++) set(x, my - 1, HAIR); set(cx0 - 3, my, HAIR); set(cx0 + 4, my, HAIR); }
      if (face === 'freckles') { setM(exL - 1, ey + 3, P.orange); setM(exL + 1, ey + 3, P.orange); setM(exL, ey + 4, P.orange); }
      if (face === 'gills') { for (i = 0; i < 3; i++) { var gy = ey + 2 + i * 2, gx = leftOf(gy) + 1; if (gy < bottom) { setM(gx, gy, D); setM(gx + 1, gy, D); } } }
      if (face !== 'none') parts.push(face);
    }
    // ---- feet
    var fx = ox + hw - exo - 1;
    setM(fx, bottom + 1, D); if (stage >= 2) setM(fx + 1, bottom + 1, D);
    // ---- arms
    if (stage >= 3) { var lx = leftOf(armY); setM(lx - 1, armY, M); setM(lx - 1, armY + 1, M); if (stage >= 5 && roll(0.4)) { setM(lx - 2, armY + 1, P.white); parts.push('claws'); } }
    // ---- head: ears / horns / hair (a second one from another group at stage 4+)
    function headPart(name) {
      var p2 = PARTS.head[name];
      if (p2.fn === 'bowl') { for (y = oy; y <= ey - 2; y++) for (x = 0; x < GW; x++) if (body(x, y)) set(x, y, HAIR); for (x = leftOf(ey - 1); x <= rightOf(ey - 1); x += 2) set(x, ey - 1, HAIR); return; }
      if (p2.at === 'eye') { var ax = exL + (p2.dx || 0); stamp(p2.sp, ax, topOf(exL) , true, true); return; }
      if (p2.at === 'side') { var row = oy + 2, sx2 = leftOf(row) - p2.sp[0].length + 1; stamp(p2.sp, sx2, row + (p2.dy || 0), true, true); return; }
      if (p2.at === 'center') { var cx = cx0 + (p2.dx || 0), w2 = p2.sp[0].length; if (!p2.dx) cx = cx0 - Math.floor((w2 - 2) / 2); stamp(p2.sp, cx, topOf(cx0), false, true); }
    }
    var EARS = ['cat', 'bunny', 'round', 'floppy'], HORNS = ['devil', 'twig', 'ram', 'unicorn', 'antenna'], HAIRS = ['mohawk', 'spikes', 'curl', 'bowl', 'tuft', 'sprout'];
    if (stage === 1 && roll(0.3)) { headPart('sprout'); parts.push('sprout'); }
    if (stage >= 2) {
      var grpN = U.pick(r, ['ears', 'horns', 'hair', 'ears', 'horns']), grp = grpN === 'ears' ? EARS : grpN === 'horns' ? HORNS : HAIRS;
      var h1 = U.pick(r, grp); headPart(h1); parts.push(h1 + (grp === EARS ? ' ears' : grp === HORNS ? (h1 === 'antenna' ? 'e' : h1 === 'unicorn' ? ' horn' : ' horns') : ' hair'));
      if (stage >= 4 && roll(0.55)) {
        var grp2 = grp === HAIRS ? (roll(0.5) ? EARS : HORNS) : HAIRS.filter(function (n) { return n !== 'bowl' || grp !== EARS; });
        var h2 = U.pick(r, grp2);
        if (!((h1 === 'unicorn' || h1 === 'mohawk' || h1 === 'curl' || h1 === 'tuft' || h1 === 'sprout' || h1 === 'spikes') && (h2 === 'unicorn' || h2 === 'mohawk' || h2 === 'curl' || h2 === 'tuft' || h2 === 'sprout' || h2 === 'spikes'))) {
          headPart(h2); parts.push(h2 + (grp2 === EARS ? ' ears' : HORNS.indexOf(h2) >= 0 ? (h2 === 'antenna' ? 'e' : h2 === 'unicorn' ? ' horn' : ' horns') : ' hair'));
        }
      }
    }
    // ---- back: wings / fins / spikes
    var backName = null;
    if (stage >= 4 && roll(stage >= 5 ? 0.95 : 0.6)) {
      backName = U.pick(r, ['bat', 'angel', 'bug', 'fins', 'dragon']);
      var bp = PARTS.back[backName], wy = ey + 1;
      if (bp.wing) { var wsp = sz >= 22 ? grow(bp.sp) : bp.sp; stamp(wsp, leftOf(wy) - wsp[0].length + 1, wy + (sz >= 22 ? 5 : 2), true, true); }
      if (bp.fin) { var fy2 = armY + 2; stamp(bp.sp, leftOf(fy2) - 2, fy2, true, true); stamp(['.A.', 'AAA'], cx0, topOf(cx0), false, true); }
      if (bp.fn === 'backspikes') [-3, 0, 3].forEach(function (d) { var c = cx0 + d; if (c > ox && c < ox + sz - 1) { var t0 = topOf(c); set(c, t0 - 1, ACC); set(c + 1, t0 - 1, ACC); set(c, t0 - 2, ACC); } });
      parts.push(backName === 'fins' ? 'fins' : backName === 'dragon' ? 'back spikes' : backName + ' wings');
    }
    // ---- tail (right side only)
    if (stage >= 3 && roll(0.7)) {
      var tn = U.pick(r, stage >= 4 ? ['devil', 'fluffy', 'fish', 'curl', 'stub'] : ['fluffy', 'curl', 'stub']);
      if (backName === 'fins' && roll(0.6)) tn = 'fish';
      var ty = oy + Math.floor(sz * 0.72), tsp = PARTS.tail[tn].sp;
      stamp(tsp, rightOf(ty) + 1, ty + Math.floor(tsp.length / 2), false, true);
      parts.push(tn + ' tail');
    }
    // ---- crown / halo / gem
    if (stage >= 6) {
      var cr2 = backName === 'angel' ? 'halo' : U.pick(r, ['crown', 'crown', 'gem', 'halo']);
      var ct = Math.min(topOf(cx0), topOf(cx0 + 1));
      if (cr2 === 'crown') { stamp(['y.A.y', 'yyyyy'], cx0 - 2 + 1, ct - 1, false, true); }
      if (cr2 === 'halo') { for (x = cx0 - 2; x <= cx0 + 3; x++) set(x, ct - 3, P.yellow); set(cx0 - 3, ct - 2, P.yellow); set(cx0 + 4, ct - 2, P.yellow); }
      if (cr2 === 'gem') { set(cx0, ey - 3, ACC); set(cx0 + 1, ey - 3, ACC); set(cx0, ey - 2, P.white); set(cx0 + 1, ey - 2, ACC); }
      parts.push(cr2);
    }
    // ---- outline (halo floats, so no outline around yellow halo pixels is fine)
    var o = g.map(function (row) { return row.slice(); });
    for (y = 0; y < GH; y++) for (x = 0; x < GW; x++) {
      if (g[y][x] !== null) continue;
      if (body(x - 1, y) || body(x + 1, y) || body(x, y - 1) || body(x, y + 1)) o[y][x] = P.ink;
    }
    var lowest = 0, highest = GH, left = GW, right = 0;
    for (y = 0; y < GH; y++) for (x = 0; x < GW; x++) if (o[y][x] !== null) { lowest = y; if (y < highest) highest = y; if (x < left) left = x; if (x > right) right = x; }
    function render(mode) {
      var cv = mk(GW, GH), c = cv.getContext('2d');
      for (var yy3 = 0; yy3 < GH; yy3++) for (var xx3 = 0; xx3 < GW; xx3++) if (o[yy3][xx3]) px(c, xx3, yy3, o[yy3][xx3]);
      if (mode !== 'open') {
        groups.forEach(function (cells) {
          var ys = cells.map(function (c2) { return c2[1]; }), yMin = Math.min.apply(null, ys), yMax = Math.max.apply(null, ys);
          cells.forEach(function (c2) { px(c, c2[0], c2[1], M); });
          cells.forEach(function (c2) { if ((mode === 'happy' ? c2[1] === yMin : c2[1] === yMax)) px(c, c2[0], c2[1], P.ink); });
        });
        if (mode === 'happy' && mouth !== 'beak') { px(c, cx0, my + 1, P.red); px(c, cx0 + 1, my + 1, P.red); }
      }
      return cv;
    }
    var res = { w: GW, h: GH, bw: sz, bottom: lowest, crownX: cx0 + 1, crownY: crownY, eyeY: ey, top: oy, head: highest, left: left, right: right, parts: parts, shape: shape,
      frames: { open: render('open'), blink: render('blink'), happy: render('happy'), sleep: render('sleep') }, color: M, accent: ACC };
    return res;
  }

  /* ---------- 1.1.0: creature TYPES. Each Totem is one type for life (from its egg, or picked in Settings),
     and its shape changes as it evolves. Original designs. "Classic" is the 1.0.5 mix-and-match blob. ---------- */
  A.KINDS = { ghost: 'Ghost', dragon: 'Dragon', robot: 'Robot', beast: 'Beast', plant: 'Plant', aqua: 'Aqua', bug: 'Bug', golem: 'Crystal golem', flame: 'Flame spirit' };
  var KIND_LIST = ['ghost', 'dragon', 'robot', 'beast', 'plant', 'aqua', 'bug', 'golem', 'flame'];
  A.kindPref = 'auto';
  A.kindOf = function (soul, pref) { pref = pref || A.kindPref; if (pref === 'classic' || A.KINDS[pref]) return pref; return KIND_LIST[((soul >>> 3) >>> 0) % KIND_LIST.length]; };
  A.kindName = function (soul, pref) { var k = A.kindOf(soul, pref); return k === 'classic' ? 'Classic' : A.KINDS[k].replace(/ \(.*\)$/, ''); };
  var KSPEC = {
    ghost: { hues: [[P.white, P.silver, P.slate], [P.cyan, P.sky, P.blue], [P.pink, P.plum, P.navy], [P.white, P.cyan, P.teal]], shape: 'dome', eyes: ['hollow', 'hollow', 'one', 'sleepy'], mouth: ['o', 'smile', 'wavy'], float: 2 },
    dragon: { hues: [[P.orange, P.red, P.plum], [P.lime, P.green, P.teal], [P.sky, P.blue, P.navy], [P.yellow, P.orange, P.red], [P.pink, P.plum, P.navy]], shape: 'pear', eyes: ['two', 'wide', 'sparkle'], mouth: ['smile', 'smile', 'o'] },
    robot: { hues: [[P.white, P.silver, P.slate], [P.sky, P.blue, P.navy], [P.yellow, P.orange, P.bark], [P.cyan, P.teal, P.navy], [P.silver, P.slate, P.dark]], shape: 'box', eyes: ['visor', 'visor', 'one'], mouth: ['grille'] },
    beast: { hues: [[P.sand, P.wood, P.bark], [P.yellow, P.orange, P.bark], [P.white, P.silver, P.slate], [P.sky, P.blue, P.navy], [P.pink, P.plum, P.navy]], shape: 'round', eyes: ['two', 'sparkle', 'wide'], mouth: ['cat'] },
    plant: { hues: [[P.lime, P.green, P.teal], [P.yellow, P.lime, P.green], [P.lime, P.teal, P.navy], [P.sand, P.wood, P.bark]], shape: 'bean', eyes: ['two', 'sparkle', 'dot', 'sleepy'], mouth: ['smile', 'o'] },
    aqua: { hues: [[P.cyan, P.sky, P.blue], [P.sky, P.blue, P.navy], [P.lime, P.teal, P.navy], [P.pink, P.plum, P.navy], [P.white, P.cyan, P.teal]], shape: 'bean', eyes: ['wide', 'sparkle', 'dot', 'two'], mouth: ['o', 'smile'] },
    bug: { hues: [[P.orange, P.red, P.plum], [P.lime, P.green, P.teal], [P.cyan, P.sky, P.blue], [P.yellow, P.orange, P.bark]], shape: 'round', eyes: ['two', 'wide', 'spider'], mouth: ['smile', 'mandible'] },
    golem: { hues: [[P.silver, P.slate, P.dark], [P.sand, P.wood, P.bark], [P.white, P.silver, P.slate], [P.lime, P.teal, P.navy]], shape: 'box', eyes: ['glow'], mouth: ['flat', 'grille'] },
    flame: { hues: [[P.yellow, P.orange, P.red], [P.white, P.sky, P.blue], [P.pink, P.plum, P.navy], [P.lime, P.green, P.teal], [P.yellow, P.orange, P.plum]], shape: 'flame', eyes: ['wide', 'glow', 'two'], mouth: ['smile', 'fangs'], float: 1 }
  };
  function typed(seed, stage, soul, kind) {
    var K0 = KSPEC[kind], r = U.rng(seed ^ 0x2f6b), sz = [14, 14, 16, 18, 20, 22, 24, 26][Math.min(Math.max(stage, 1), 7)];
    var hw = sz / 2, padX = 13, top = 9, GW = sz + padX * 2, GH = sz + top + 4;
    var g = [], y, x, i;
    for (y = 0; y < GH; y++) { g.push([]); for (x = 0; x < GW; x++) g[y].push(null); }
    var hr = U.rng(soul ^ 0x51), hue = K0.hues[Math.floor(hr() * K0.hues.length)], L = hue[0], M = hue[1], D = hue[2];
    var ACC = ACCENTS[Math.floor(U.rng(soul)() * ACCENTS.length)];
    if (ACC === M || ACC === L || ACC === D) ACC = M === P.yellow || L === P.yellow ? P.cyan : P.yellow;
    var HAIR = kind === 'beast' ? D : kind === 'plant' ? P.green : U.pick(r, [P.bark, P.dark, P.plum, ACC]);
    if (HAIR === M) HAIR = P.dark;
    var TOK = { M: M, L: L === M ? P.white : L, D: D, A: ACC, H: HAIR, k: P.ink, w: P.white, s: P.silver, S: P.slate, y: P.yellow, a: P.sand, B: P.bark,
      W: P.wood, r: P.red, P: P.pink, g: P.green, l: P.lime, c: P.cyan, o: P.orange, d: P.dark };
    var ox = padX, oy = top, raw = [], halves = [], parts = [A.KINDS[kind].toLowerCase() + ' type'];
    function set(xx, yy, col) { if (yy >= 0 && yy < GH && xx >= 0 && xx < GW) g[yy][xx] = col; }
    function mir(xx) { return 2 * ox + sz - 1 - xx; }
    function setM(xx, yy, col) { set(xx, yy, col); set(mir(xx), yy, col); }
    function body(xx, yy) { return yy >= 0 && yy < GH && xx >= 0 && xx < GW && g[yy][xx] !== null; }
    function topOf(col) { for (var yy2 = 0; yy2 < GH; yy2++) if (g[yy2][col] !== null) return yy2; return oy; }
    function leftOf(row) { for (var xx2 = 0; xx2 < GW; xx2++) if (g[row] && g[row][xx2] !== null) return xx2; return ox; }
    function rightOf(row) { for (var xx2 = GW - 1; xx2 >= 0; xx2--) if (g[row] && g[row][xx2] !== null) return xx2; return ox + sz - 1; }
    function grow(sp) { var out = []; sp.forEach(function (row) { var w = row.split('').map(function (ch) { return ch + ch; }).join(''); out.push(w, w); }); return out; }
    function stamp(sp, x0, yb, mirror, under) {
      for (var j = 0; j < sp.length; j++) for (var k = 0; k < sp[j].length; k++) {
        var ch = sp[j].charAt(k); if (ch === '.') continue;
        var X = x0 + k, Y = yb - (sp.length - 1 - j);
        if (!under || !body(X, Y)) set(X, Y, TOK[ch]);
        if (mirror && (!under || !body(mir(X), Y))) set(mir(X), Y, TOK[ch]);
      }
    }
    function centered(sp, yb, under) { stamp(sp, ox + hw - Math.ceil(sp[0].length / 2), yb, false, under); }
    function roll(p) { return r() < p; }
    function symd(xx) { return xx < ox + hw ? ox + hw - 1 - xx : xx - ox - hw; } // distance from the middle (same on both sides)

    // ---- body: babies (stages 1-2) are round; from stage 3 most types stand up with a head, a body, arms and legs
    var shape = K0.shape, wob = 0.92 + r() * 0.08, biped = stage >= 3 && !K0.float, boxy = shape === 'box';
    var HT = 0.47, NK = 0.52, TB = 0.82;
    for (y = 0; y < sz; y++) {
      var yy = (y + 0.5) / sz, e = Math.sqrt(Math.max(0, 1 - Math.pow(2 * yy - 1, 2))), prof;
      if (biped) {
        if (yy < HT) { var e1 = Math.sqrt(Math.max(0, 1 - Math.pow((yy - HT / 2) / (HT / 2), 2))); prof = boxy ? Math.min(1, e1 * 2.6) * 0.8 : Math.min(0.9, e1 * 1.0); }
        else if (yy < NK) prof = 0.4;
        else if (yy < TB) { var e2 = Math.sqrt(Math.max(0, 1 - Math.pow((yy - (NK + TB) / 2) / ((TB - NK) / 2 + 0.05), 2))); prof = boxy ? 0.76 : Math.max(0.52, e2 * 0.8); }
        else prof = boxy ? 0.64 : 0.6;
      }
      else if (shape === 'pear') prof = e * (0.66 + 0.38 * yy);
      else if (shape === 'bean') prof = Math.min(1, e * 1.12) * (yy < 0.45 ? 0.86 : 1);
      else if (shape === 'box') prof = Math.min(1, e * 2.4) * 0.9;
      else if (shape === 'dome') prof = yy < 0.5 ? Math.sqrt(Math.max(0, 1 - Math.pow(1 - yy * 2, 2))) * 0.96 : 0.96 + (yy - 0.5) * 0.08;
      else if (shape === 'flame') { var lo = Math.sqrt(Math.max(0, 1 - Math.pow((yy - 0.64) / 0.36, 2))); prof = Math.max(yy < 0.5 ? Math.pow(yy / 0.5, 1.3) * 0.62 : 0, lo); }
      else prof = e;
      raw.push(hw * Math.min(1, prof * wob));
    }
    for (y = 0; y < sz; y++) {
      var a = raw[Math.max(0, y - 1)], b = raw[y], cN = raw[Math.min(sz - 1, y + 1)];
      var half = Math.max(1, Math.min(hw, Math.round((a + 2 * b + cN) / 4)));
      if (biped) half = Math.max(1, Math.min(hw, Math.round(b)));
      else if (y > 2 && y < sz - 2 && Math.abs(half - halves[y - 1]) > 1) half = halves[y - 1] + (half > halves[y - 1] ? 1 : -1);
      if (shape === 'flame' && y === 0) half = 1;
      halves.push(half);
      for (x = hw - half; x < hw + half; x++) set(ox + x, oy + y, M);
    }
    var bottom = oy + sz - 1;
    if (biped) for (y = Math.ceil(sz * TB); y < sz; y++) for (x = 0; x < GW; x++) if (symd(x) < 1) set(x, oy + y, null); // two legs
    if (kind === 'ghost') { // a wavy hem instead of feet
      for (x = 0; x < GW; x++) { var sd = symd(x); if (sd % 4 >= 2) set(x, bottom, null); if (sd % 4 === 3) set(x, bottom - 1, null); }
      parts.push('wavy hem');
    }
    var shade = [];
    for (y = 0; y < sz; y++) for (x = 0; x < GW; x++) {
      var Y0 = oy + y;
      if (!body(x, Y0)) continue;
      if (!body(x, Y0 + 1) || (y > sz * 0.55 && (!body(x - 1, Y0) || !body(x + 1, Y0)))) shade.push([x, Y0]);
    }
    shade.forEach(function (p) { g[p[1]][p[0]] = D; });
    for (y = 1; y < 3; y++) { for (x = 0; x < GW; x++) if (body(x, oy + y) && body(x + 1, oy + y)) { set(x + 1, oy + y, TOK.L); break; } }
    var ey = oy + Math.floor(sz * (biped ? 0.2 : shape === 'flame' ? 0.5 : shape === 'dome' ? 0.34 : 0.36)), exo = Math.max(1, Math.round(hw * (biped ? 0.4 : 0.42))), exL = ox + hw - exo - 1, cx0 = ox + hw - 1;
    var my = ey + 3, armY = biped ? oy + Math.floor(sz * 0.6) : Math.min(bottom - 2, ey + 4), wingY = biped ? oy + Math.floor(sz * 0.62) : ey + 1, chestY = biped ? oy + Math.floor(sz * 0.63) : my + 3;
    // belly / plates / core
    if (kind === 'dragon' || kind === 'beast' || kind === 'aqua' || kind === 'flame') {
      for (y = Math.floor(sz * (biped ? NK + 0.04 : kind === 'flame' ? 0.6 : 0.56)); y < Math.floor(sz * (biped ? TB - 0.02 : 0.88)); y++) {
        var bh = Math.max(1, Math.floor(halves[y] * (kind === 'flame' ? 0.6 : 0.5)));
        for (x = hw - bh; x < hw + bh; x++) if (g[oy + y][ox + x] === M) set(ox + x, oy + y, kind === 'dragon' && y % 2 ? TOK.D : TOK.L);
      }
      if (kind === 'dragon') parts.push('belly plates');
      if (kind === 'flame') { set(cx0, oy + Math.floor(sz * 0.74), P.white); set(cx0 + 1, oy + Math.floor(sz * 0.74), P.white); }
    }
    if (kind === 'bug') { // a hard shell cap with a split down the middle
      for (y = oy; y < ey - 1; y++) for (x = 0; x < GW; x++) if (body(x, y)) set(x, y, D);
      for (y = oy + 1; y < ey - 1; y++) { set(cx0, y, P.ink); set(cx0 + 1, y, P.ink); }
      set(leftOf(oy + 2) + 2, oy + 2, TOK.L);
      parts.push('shell');
    }
    if (kind === 'robot') { // rivets and a seam
      for (x = leftOf(ey - 2) + 1; x <= rightOf(ey - 2) - 1; x++) if (body(x, ey - 2)) set(x, ey - 2, D);
      setM(leftOf(oy + 2) + 1, oy + 2, P.silver); setM(leftOf(bottom - 2) + 1, bottom - 2, P.silver);
    }
    if (kind === 'golem') { // cracks
      var cs = U.rng(seed ^ 77);
      for (i = 0; i < 2 + Math.min(3, stage); i++) { var qx = ox + 2 + Math.floor(cs() * (sz - 4)), qy = oy + Math.floor(sz * 0.5) + Math.floor(cs() * sz * 0.4); for (var st2 = 0; st2 < 3; st2++) if (body(qx + st2, qy + st2) && (qy + st2) !== ey && (qy + st2) !== ey + 1) set(qx + st2, qy + (st2 % 2), D); }
      parts.push('cracks');
    }
    // ---- eyes (cell groups, so blinking works for every style)
    var eyeKind = U.pick(r, K0.eyes), groups = [], W2 = P.white, K = P.ink;
    function eye(cells) { groups.push(cells); cells.forEach(function (c) { set(c[0], c[1], c[2]); }); }
    if (eyeKind === 'one') eye([[cx0 - 1, ey - 1, W2], [cx0, ey - 1, W2], [cx0 + 1, ey - 1, W2], [cx0 + 2, ey - 1, W2], [cx0 - 1, ey, W2], [cx0, ey, kind === 'robot' ? ACC : K], [cx0 + 1, ey, kind === 'robot' ? ACC : K], [cx0 + 2, ey, W2], [cx0 - 1, ey + 1, W2], [cx0, ey + 1, K], [cx0 + 1, ey + 1, K], [cx0 + 2, ey + 1, W2]]);
    else if (eyeKind === 'visor') { var vc = []; for (x = exL - 2; x <= mir(exL - 2); x++) { vc.push([x, ey, P.ink]); vc.push([x, ey + 1, P.ink]); } vc.push([exL, ey, ACC], [mir(exL), ey, ACC], [exL - 1, ey, ACC], [mir(exL - 1), ey, ACC]); eye(vc); }
    else if (eyeKind === 'hollow') { [exL, mir(exL)].forEach(function (X) { var o2 = X === exL ? X - 1 : X + 1; eye([[o2, ey - 1, K], [X, ey - 1, W2], [o2, ey, K], [X, ey, K], [o2, ey + 1, K], [X, ey + 1, K]]); }); }
    else if (eyeKind === 'spider') { [[0, 0], [-2, 1], [1, -2], [-1, -2]].forEach(function (o2) { var X = exL + o2[0], Y = ey + o2[1]; eye([[X, Y, kind === 'bug' ? P.white : K]]); eye([[mir(X), Y, kind === 'bug' ? P.white : K]]); }); }
    else if (eyeKind === 'dot') { eye([[exL, ey, K], [exL, ey + 1, K]]); eye([[mir(exL), ey, K], [mir(exL), ey + 1, K]]); }
    else {
      var mk2 = function (X) {
        var out = X === exL ? X - 1 : X + 1;
        if (eyeKind === 'sparkle') return [[out, ey, W2], [X, ey, K], [out, ey + 1, K], [X, ey + 1, K]];
        if (eyeKind === 'sleepy') return [[out, ey, K], [X, ey, K], [out, ey + 1, W2], [X, ey + 1, K]];
        if (eyeKind === 'wide') return [[out, ey, W2], [X, ey, W2], [out, ey + 1, K], [X, ey + 1, W2]];
        if (eyeKind === 'glow') return [[out, ey, K], [X, ey, ACC === M ? P.white : ACC], [out, ey + 1, K], [X, ey + 1, K]];
        return [[out, ey, W2], [X, ey, W2], [out, ey + 1, W2], [X, ey + 1, K]];
      };
      eye(mk2(exL)); eye(mk2(mir(exL)));
    }
    // ---- mouth
    var mouth = U.pick(r, K0.mouth);
    if (kind === 'dragon' && stage >= 3) mouth = 'fangs';
    if (kind === 'beast' && stage >= 3) mouth = 'catfang';
    if (kind === 'bug' && stage >= 3) mouth = 'mandible';
    if (mouth === 'o') { set(cx0, my, K); set(cx0 + 1, my, K); set(cx0, my + 1, K); set(cx0 + 1, my + 1, K); }
    else if (mouth === 'cat' || mouth === 'catfang') { set(cx0 - 1, my, K); set(cx0, my + 1, K); set(cx0 + 1, my + 1, K); set(cx0 + 2, my, K); if (mouth === 'catfang') { set(cx0 - 1, my + 1, W2); set(cx0 + 2, my + 1, W2); } set(cx0, my - 1, K); set(cx0 + 1, my - 1, K); }
    else if (mouth === 'wavy') { [[-2, 0], [-1, 1], [0, 0], [1, 0], [2, 1], [3, 0]].forEach(function (q) { set(cx0 + q[0], my + q[1], K); }); }
    else if (mouth === 'grille') { for (x = cx0 - 1; x <= cx0 + 2; x++) { set(x, my, K); set(x, my + 1, (x - cx0) % 2 ? D : K); } }
    else if (mouth === 'flat') { for (x = cx0 - 1; x <= cx0 + 2; x++) set(x, my, K); }
    else if (mouth === 'mandible') { set(cx0, my, K); set(cx0 + 1, my, K); setM(cx0 - 1, my + 1, K); setM(cx0 - 2, my, K); }
    else { set(cx0, my, K); set(cx0 + 1, my, K); if (sz >= 16) { set(cx0 - 1, my - 1, K); set(cx0 + 2, my - 1, K); } if (mouth === 'fangs') { set(cx0 - 1, my + 1, W2); set(cx0 + 2, my + 1, W2); } }
    // ---- feet (floating types have none)
    var fx = ox + hw - exo - 1;
    if (!K0.float && kind !== 'robot' && kind !== 'plant') { setM(fx, bottom + 1, D); if (stage >= 2) setM(fx + 1, bottom + 1, D); }
    var lx = leftOf(armY);
    if (biped && kind !== 'robot') { // arms: down and out from the shoulders
      for (y = armY; y <= armY + 3; y++) { setM(lx - 1, y, y >= armY + 2 ? D : M); if (y > armY) setM(lx - 2, y, y === armY + 3 ? D : M); }
      parts.push('arms');
    }

    // ---- what makes each type itself (and what changes as it evolves)
    if (kind === 'ghost') {
      if (stage >= 2) { setM(lx - 1, armY, M); setM(lx - 2, armY + 1, M); setM(lx - 1, armY + 1, D); parts.push('floaty arms'); }
      if (stage >= 3) { stamp(['...L', '..LM', '.LM.', 'MM..'], rightOf(bottom - 3) - 1, bottom - 1, false, true); parts.push('wisp tail'); }
      if (stage >= 4) { stamp(['.A.', 'AwA', '.A.'], leftOf(ey) - 6, ey - 1, true, true); parts.push('will-o-wisps'); }
      if (stage >= 5) { stamp(['D...', 'DD..', '.DD.'], exL - 2, topOf(exL), true, true); parts.push('hood points'); }
    } else if (kind === 'dragon') {
      if (stage === 1) { setM(exL, topOf(exL) - 1, ACC); parts.push('horn nubs'); }
      else { stamp(stage >= 4 ? ['A...', 'AA..', '.AA.', '..A.'] : ['A..', 'AA.', '.A.'], exL - 2, topOf(exL), true, true); parts.push('horns'); }
      if (stage >= 2) { setM(cx0 - 1, my - 1, K); [-3, 0, 3].forEach(function (d) { var c = cx0 + d; if (c > ox && c < ox + sz - 1) { var t0 = topOf(c); if (d !== 0 || stage >= 4) { set(c, t0 - 1, ACC); set(c + 1, t0 - 1, ACC); set(c + 1, t0 - 2, ACC); } } }); parts.push('back spikes'); }
      if (stage >= 2) { stamp(['...A.', '..AAA', '..DA.', '.D...', 'D....'], rightOf(oy + Math.floor(sz * 0.72)) + 1, oy + Math.floor(sz * 0.72) + 2, false, true); parts.push('spade tail'); }
      if (stage >= 3) { var dw = ['D.....', 'DD...D', 'DDD.DD', 'DDDDDD', 'D.D.DD'], wsp = stage >= 5 ? grow(dw) : dw; stamp(wsp, leftOf(wingY) - wsp[0].length + 1, wingY + (stage >= 5 ? 5 : 2), true, true); parts.push(stage >= 5 ? 'great wings' : 'wings'); }
      if (stage >= 4) { setM(lx - 2, armY + 4, P.white); setM(lx - 1, armY + 4, P.white); parts.push('claws'); }
    } else if (kind === 'robot') {
      if (stage >= 4) { stamp(['A.', '.k', '.k'], exL - 1, topOf(exL), true, true); parts.push('twin antennas'); }
      else { var t2 = topOf(cx0); set(cx0 + 1, t2 - 1, P.ink); set(cx0 + 1, t2 - 2, P.ink); set(cx0, t2 - 3, ACC); set(cx0 + 1, t2 - 3, ACC); parts.push('antenna'); }
      if (stage >= 2 && chestY + 2 < bottom) { for (y = chestY; y <= chestY + 2; y++) for (x = cx0 - 2; x <= cx0 + 3; x++) if (body(x, y)) set(x, y, D); set(cx0 - 1, chestY + 1, ACC); set(cx0 + 1, chestY + 1, P.lime); set(cx0 + 2, chestY + 1, P.red); parts.push('chest lights'); }
      if (stage >= 2) { var al = biped ? 3 : 1; for (y = armY; y <= armY + al; y++) { setM(lx - 1, y, P.silver); setM(lx - 2, y, y === armY ? P.silver : P.slate); } if (stage >= 4) { setM(lx - 3, armY + al + 1, K); setM(lx - 1, armY + al + 1, K); setM(lx - 2, armY + al + 1, P.slate); parts.push('grabber arms'); } else parts.push('piston arms'); }
      if (stage >= 3) { setM(leftOf(ey) - 1, ey, P.silver); setM(leftOf(ey) - 1, ey + 1, P.slate); parts.push('ear bolts'); }
      for (x = fx - 1; x <= fx + (biped ? 1 : 2); x++) setM(x, bottom + 1, stage >= 3 ? P.dark : D); if (stage >= 3) { setM(fx, bottom + 1, P.silver); parts.push(biped ? 'boots' : 'treads'); }
      if (stage >= 5) { stamp(['ss', 'SS', 'SS', 'yo', 'o.'], leftOf(armY + 3) - 3, armY + 6, true, true); parts.push('rocket boosters'); }
    } else if (kind === 'beast') {
      stamp(stage >= 3 ? ['M..', 'MM.', 'MPM', 'MMM'] : ['M..', 'MM.', 'MPM'], exL - 1, topOf(exL), true, true); parts.push('pointed ears');
      for (y = my - 1; y <= my + 1; y++) for (x = cx0 - 1; x <= cx0 + 2; x++) if (g[y][x] === M) set(x, y, TOK.L); // snout
      if (stage >= 2) { stamp(['.LL.', 'LwLL', 'LLL.', 'L...'], rightOf(oy + Math.floor(sz * 0.7)) + 1, oy + Math.floor(sz * 0.7) + 1, false, true); parts.push('fluffy tail'); }
      if (stage >= 3) { for (y = oy + 1; y <= ey + 3; y++) { var mx = leftOf(y); if (y % 2) setM(mx - 1, y, HAIR); if (y % 3 === 0) setM(mx - 2, y, HAIR); } [-2, 0, 2].forEach(function (d) { var t1 = topOf(cx0 + d); set(cx0 + d, t1 - 1, HAIR); set(cx0 + d + 1, t1 - 1, HAIR); }); parts.push('mane'); }
      if (stage >= 4) { for (i = 0; i < 3; i++) { var sy = oy + Math.floor(sz * 0.5) + i * 2; setM(leftOf(sy) + 1, sy, D); setM(leftOf(sy) + 2, sy, D); } setM(lx - 2, armY + 4, P.white); setM(lx - 1, armY + 4, P.white); parts.push('stripes', 'claws'); }
    } else if (kind === 'plant') {
      if (stage === 1) { centered(['lg.', '.gl', '.g.'], topOf(cx0) - 1, true); parts.push('sprout'); }
      else if (stage < 4) { centered(['l.....l', 'll...ll', '.ll.ll.', '..lgl..', '...g...'], topOf(cx0) - 1, true); parts.push('twin leaves'); }
      else { centered(['..A.A..', '.AAyAA.', 'l.AAA.l', 'll.g.ll', '.llgll.', '...g...'], topOf(cx0) - 1, true); parts.push('flower crown'); }
      if (stage >= 3) { stamp(['ll.', 'lgl', '.ll'], lx - 3, armY + (biped ? 5 : 1), true, true); parts.push('leaf hands'); }
      setM(fx, bottom + 1, P.bark); setM(fx - 1, bottom + 2, P.bark); if (stage >= 2) setM(fx + 1, bottom + 2, P.bark); parts.push('roots');
      if (stage >= 3) { setM(exL - 1, ey + 3, P.yellow); setM(exL + 1, ey + 4, P.yellow); parts.push('seed freckles'); }
      if (stage >= 4) { stamp(['..g', '.g.', 'gl.', 'l..'], rightOf(bottom - 2) + 1, bottom - 1, false, true); parts.push('vine tail'); }
    } else if (kind === 'aqua') {
      centered(stage >= 4 ? ['..A..', '.AAA.', 'AAAAA'] : ['.A.', 'AAA'], topOf(cx0), true); parts.push(stage >= 4 ? 'tall fin' : 'head fin');
      if (stage >= 2) { stamp(['..A', '.AA', 'AAA'], leftOf(armY + 2) - 2, armY + 2, true, true); parts.push('side fins'); }
      if (stage >= 2) { var ty = oy + Math.floor(sz * 0.72); stamp(['..AA', '.AA.', 'MA..', '.AA.', '..AA'], rightOf(ty) + 1, ty + 2, false, true); parts.push('fish tail'); }
      if (stage >= 3) { for (i = 0; i < 2; i++) { var gy = ey + 2 + i * 2; if (gy < bottom) setM(leftOf(gy) + 1, gy, D); } parts.push('gills'); }
      stamp(['.c', 'cw'], rightOf(ey - 2) + 2, ey - 4, false, true); if (stage >= 3) set(rightOf(ey - 2) + 5, ey - 7, P.cyan);
      if (stage >= 5) { stamp(['yy...', 'yy..k', '....k', '...k.'], cx0 - 4, topOf(cx0) - 1, false, true); parts.push('glowing lure'); }
    } else if (kind === 'bug') {
      stamp(stage >= 4 ? ['A..', '.k.', '.k.', '..k'] : ['A.', '.k', '.k'], exL - 1, topOf(exL), true, true); parts.push('antennae');
      if (stage >= 2) { for (i = 0; i < (stage >= 3 ? 3 : 2); i++) { var ly = armY + 1 + i * 2; if (ly <= bottom) setM(leftOf(ly) - 1, ly, P.ink); } parts.push('little legs'); }
      if (stage >= 2) { for (i = 0; i < 2; i++) { var sx3 = exL - 1 + i * 2, sy3 = my + 3 + i * 2; if (body(sx3, sy3) && sy3 < bottom - 1) setM(sx3, sy3, P.ink); } parts.push('spots'); }
      if (stage >= 4) { var bsp = ['.cc.', 'cwwc', 'cwwc', 'cwc.', '.c..'], bw2 = stage >= 6 ? grow(bsp) : bsp; stamp(bw2, leftOf(wingY) - bw2[0].length + 1, wingY + (stage >= 6 ? 4 : 2), true, true); parts.push('wings'); }
    } else if (kind === 'golem') {
      TOK.A = U.pick(U.rng(soul ^ 9), [P.cyan, P.pink, P.lime, P.yellow, P.sky]); if (TOK.A === M) TOK.A = P.white;
      var cry = stage >= 5 ? ['..w.', '.wA.', 'wAAA', 'AAAc', 'AAc.'].map(function (q) { return q.replace(/c/g, 'D'); }) : stage >= 3 ? ['.w.', 'wAA', 'AAD', 'AD.'] : ['.w', 'AA', 'AD'];
      centered(cry, topOf(cx0), true); parts.push('crystal');
      if (stage >= 3) { stamp(['.w', 'AA', 'AD'], leftOf(armY - 2) - 1, armY - 3, true, true); parts.push('shoulder crystals'); }
      if (stage >= 2 && !biped) { for (y = armY; y <= armY + 2; y++) { setM(lx - 1, y, M); setM(lx - 2, y, D); } }
      if (biped) { for (y = armY + 3; y <= armY + 5; y++) for (x = lx - 3; x <= lx - 1; x++) setM(x, y, y === armY + 5 ? D : M); parts.push('big fists'); }
      if (stage >= 4 && M !== P.teal) { setM(leftOf(oy + 1) + 1, oy + 1, P.green); setM(leftOf(oy + 1) + 2, oy + 1, P.lime); parts.push('moss'); }
    } else if (kind === 'flame') {
      var tt = topOf(cx0); set(cx0 - 2, tt + 1, TOK.L); set(cx0 + 3, tt + 2, TOK.L); set(cx0 + 1, tt - 1, TOK.L); set(cx0 + 1, tt - 2, P.white);
      if (stage >= 2) { set(cx0 - 3, tt - 1, ACC); set(cx0 + 4, tt - 3, ACC); parts.push('embers'); }
      if (stage >= 3) { stamp(['.L', 'LM', 'M.'], lx - 2, armY + 1, true, true); parts.push('flame arms'); }
      if (stage >= 5) { stamp(['L...', 'LL..', '.LL.'], exL - 2, topOf(exL), true, true); parts.push('flame horns'); }
    }
    // ---- armor: shoulder guards on grown fighters
    if (biped && stage >= 5 && kind !== 'plant') {
      var sy0 = armY - 1, slx = leftOf(sy0);
      for (x = slx - 2; x <= slx + 1; x++) setM(x, sy0, ACC);
      for (x = slx - 2; x <= slx; x++) setM(x, sy0 + 1, D);
      setM(slx - 1, sy0 - 1, ACC);
      parts.push('shoulder guards');
    }
    // ---- crown / halo / gem at the top stages
    if (stage >= 6) {
      var crn = kind === 'ghost' ? 'halo' : kind === 'robot' || kind === 'golem' ? 'gem' : kind === 'plant' ? 'bloom' : 'crown';
      var ct = Math.min(topOf(cx0), topOf(cx0 + 1));
      if (crn === 'crown') stamp(['y.A.y', 'yyyyy'], cx0 - 1, ct - 1, false, true);
      if (crn === 'halo') { for (x = cx0 - 2; x <= cx0 + 3; x++) set(x, ct - 3, P.yellow); set(cx0 - 3, ct - 2, P.yellow); set(cx0 + 4, ct - 2, P.yellow); }
      if (crn === 'gem') { set(cx0, ey - 3, ACC); set(cx0 + 1, ey - 3, ACC); set(cx0, ey - 2, P.white); set(cx0 + 1, ey - 2, ACC); }
      if (crn === 'bloom') { set(cx0, ct - 1, P.pink); set(cx0 + 1, ct - 1, P.pink); set(cx0, ct - 2, P.yellow); set(cx0 + 1, ct - 2, P.pink); }
      parts.push(crn);
    }
    // ---- outline
    var o = g.map(function (row) { return row.slice(); });
    for (y = 0; y < GH; y++) for (x = 0; x < GW; x++) {
      if (g[y][x] !== null) continue;
      if (body(x - 1, y) || body(x + 1, y) || body(x, y - 1) || body(x, y + 1)) o[y][x] = P.ink;
    }
    var lowest = 0, highest = GH, left = GW, right = 0;
    for (y = 0; y < GH; y++) for (x = 0; x < GW; x++) if (o[y][x] !== null) { lowest = y; if (y < highest) highest = y; if (x < left) left = x; if (x > right) right = x; }
    function render(mode) {
      var cv = mk(GW, GH), c = cv.getContext('2d');
      for (var yy3 = 0; yy3 < GH; yy3++) for (var xx3 = 0; xx3 < GW; xx3++) if (o[yy3][xx3]) px(c, xx3, yy3, o[yy3][xx3]);
      if (mode !== 'open') {
        groups.forEach(function (cells) {
          var ys = cells.map(function (c2) { return c2[1]; }), yMin = Math.min.apply(null, ys), yMax = Math.max.apply(null, ys);
          cells.forEach(function (c2) { px(c, c2[0], c2[1], M); });
          cells.forEach(function (c2) { if ((mode === 'happy' ? c2[1] === yMin : c2[1] === yMax)) px(c, c2[0], c2[1], P.ink); });
        });
        if (mode === 'happy' && mouth !== 'grille' && mouth !== 'mandible') { px(c, cx0, my + 1, P.red); px(c, cx0 + 1, my + 1, P.red); }
      }
      return cv;
    }
    return { w: GW, h: GH, bw: sz, bottom: lowest, crownX: cx0 + 1, crownY: topOf(cx0), eyeY: ey, top: oy, head: highest, left: left, right: right, parts: parts, shape: shape, kind: kind, float: K0.float || 0,
      frames: { open: render('open'), blink: render('blink'), happy: render('happy'), sleep: render('sleep') }, color: M, accent: ACC };
  }

  A.creature = function (seed, stage, soul, pref) {
    var kind = A.kindOf(soul, pref), key = seed + ':' + stage + ':' + soul + ':' + kind;
    if (CC[key]) return CC[key];
    var res = kind === 'classic' ? classic(seed, stage, soul) : typed(seed, stage, soul, kind);
    res.kind = res.kind || 'classic';
    return (CC[key] = res);
  };

  /* ---------- egg ---------- */
  var EC = {};
  A.egg = function (seed, crack) {
    var key = seed + ':' + crack;
    if (EC[key]) return EC[key];
    var r = U.rng(seed ^ 0x55aa), prof = [2, 4, 6, 6, 8, 8, 10, 10, 10, 10, 10, 10, 8, 6, 4];
    var base = U.pick(r, [P.white, P.sand, P.pink, P.cyan, P.lime, P.silver]), spot = U.pick(r, [P.red, P.blue, P.green, P.plum, P.orange, P.teal]);
    var GW = 14, GH = 17, cv = mk(GW, GH), c = cv.getContext('2d'), g = [], x, y;
    for (y = 0; y < GH; y++) { g.push([]); for (x = 0; x < GW; x++) g[y].push(null); }
    prof.forEach(function (w, j) { for (x = 7 - w / 2; x < 7 + w / 2; x++) g[j + 1][x] = base; });
    for (var s = 0; s < 6; s++) { var sy = 3 + Math.floor(r() * 10), sx = 3 + Math.floor(r() * 8); if (g[sy][sx]) { g[sy][sx] = spot; if (g[sy][sx + 1]) g[sy][sx + 1] = spot; } }
    g[4][5] = P.white === base ? P.cyan : P.white;
    if (crack) { var cr = [[4, 6], [5, 7], [6, 7], [7, 8], [6, 9], [5, 10], [6, 5], [7, 4]]; cr.forEach(function (p) { if (g[p[1]] && g[p[1]][p[0]]) g[p[1]][p[0]] = P.ink; }); }
    for (y = 0; y < GH; y++) for (x = 0; x < GW; x++) {
      var v = g[y][x];
      if (v) { px(c, x, y, v); continue; }
      var nb = (g[y - 1] && g[y - 1][x]) || (g[y + 1] && g[y + 1][x]) || g[y][x - 1] || g[y][x + 1];
      if (nb) px(c, x, y, P.ink);
    }
    EC[key] = cv;
    return cv;
  };

  /* ---------- sky ---------- */
  function skyBands(phase, wk) {
    if (wk === 'storm') return [P.ink, P.dark, P.slate];
    if (wk === 'rain') return phase === 'night' ? [P.ink, P.ink, P.dark] : [P.dark, P.slate, P.slate];
    if (wk === 'snow') return phase === 'night' ? [P.ink, P.navy, P.dark] : [P.slate, P.silver, P.white];
    if (wk === 'cloudy' || wk === 'fog') return phase === 'night' ? [P.ink, P.navy, P.dark] : phase === 'day' ? [P.slate, P.silver, P.silver] : [P.navy, P.slate, P.silver];
    return { night: [P.ink, P.navy, P.navy], dawn: [P.navy, P.plum, P.orange], day: [P.blue, P.sky, P.cyan], dusk: [P.navy, P.plum, P.red] }[phase];
  }
  function drawSky(c, x, y, w, h, bands) {
    var b1 = Math.round(h * 0.4), b2 = Math.round(h * 0.74);
    R(c, x, y, w, b1, bands[0]); R(c, x, y + b1, w, b2 - b1, bands[1]); R(c, x, y + b2, w, h - b2, bands[2]);
    dith(c, x, y + b1 - 2, w, 2, bands[1], 0); dith(c, x, y + b2 - 2, w, 2, bands[2], 1);
  }
  var CLOUD = ['...wwww.....', '.wwwwwwww...', 'wwwwwwwwwww.', '.sssssssssss'];
  var CLOUD_DARK = ['...ssss.....', '.ssssssss...', 'sssssssssss.', '.SSSSSSSSSSS'];
  function skyThings(c, sc, clip) {
    var hr = sc.hour, wk = sc.weather, phase = sc.phase, x0 = clip ? clip[0] : 0, y0 = clip ? clip[1] : 0, cw = clip ? clip[2] : W, ch = clip ? clip[3] : GY;
    var sx = function (fx) { return x0 + fx * cw; }, sy = function (fy) { return y0 + fy * ch; };
    if (phase === 'night' && (wk === 'clear' || wk === 'cloudy')) {
      var r = U.rng(99);
      for (var i = 0; i < 26; i++) { var X = sx(r()), Y = sy(r() * 0.7); if ((i + sc.f) % 11) px(c, X, Y, i % 3 ? P.silver : P.white); }
    }
    if (wk === 'clear' || wk === 'cloudy' || wk === 'snow') {
      if (hr >= 6 && hr < 20) {
        var d = (hr - 6) / 14, X2 = sx(0.06 + d * 0.88), Y2 = sy(0.62 - Math.sin(Math.PI * d) * 0.5);
        disc(c, X2, Y2, clip ? 3 : 5, P.yellow); if (!clip) disc(c, X2 - 1, Y2 - 1, 2, P.white);
      } else {
        var n = ((hr + 24 - 20) % 24) / 9, X3 = sx(0.08 + n * 0.84), Y3 = sy(0.55 - Math.sin(Math.PI * n) * 0.4);
        disc(c, X3, Y3, clip ? 2 : 4, P.white); disc(c, X3 + (clip ? 1 : 2), Y3 - 1, clip ? 2 : 3, skyBands(phase, wk)[0]);
      }
    }
    var nClouds = wk === 'clear' ? 2 : wk === 'cloudy' || wk === 'fog' ? 5 : wk === 'snow' ? 4 : 6;
    var dark = wk === 'rain' || wk === 'storm' || phase === 'night';
    for (var k = 0; k < nClouds; k++) {
      var speed = 0.6 + (k % 3) * 0.25, span = cw + 30;
      var cx = x0 + ((k * 53 + sc.tsec * speed) % span) - 15, cy = y0 + 3 + ((k * 17) % Math.max(4, ch * 0.45));
      spr(c, Math.round(cx), Math.round(cy), dark ? CLOUD_DARK : CLOUD);
    }
  }

  /* ---------- trees and ground bits ---------- */
  function tree(c, kind, x, base, season) {
    if (kind === 'round') {
      R(c, x - 1, base - 7, 2, 7, P.bark);
      if (season === 'winter') { line(c, x, base - 7, x - 4, base - 12, P.bark); line(c, x, base - 7, x + 4, base - 13, P.bark); line(c, x, base - 9, x, base - 14, P.bark); px(c, x - 4, base - 13, P.white); px(c, x + 4, base - 14, P.white); return; }
      var leaf = season === 'fall' ? P.orange : season === 'spring' ? P.lime : P.green, dark = season === 'fall' ? P.red : P.teal;
      disc(c, x, base - 12, 6, dark); disc(c, x - 1, base - 13, 5, leaf);
      if (season === 'spring') { px(c, x - 3, base - 14, P.pink); px(c, x + 2, base - 11, P.pink); px(c, x, base - 16, P.white); }
      if (season === 'fall') { px(c, x + 5, base - 2, P.orange); px(c, x - 6, base - 1, P.red); }
    } else if (kind === 'pine') {
      R(c, x - 1, base - 4, 2, 4, P.bark);
      tri(c, x, base - 18, 7, 0.7, P.teal); tri(c, x, base - 13, 9, 0.8, P.teal); tri(c, x, base - 17, 5, 0.6, P.green);
      if (season === 'winter') { px(c, x, base - 18, P.white); R(c, x - 3, base - 12, 2, 1, P.white); R(c, x + 2, base - 7, 3, 1, P.white); R(c, x - 5, base - 6, 2, 1, P.white); }
    } else if (kind === 'cactus') {
      R(c, x - 1, base - 12, 3, 12, P.green); R(c, x - 4, base - 8, 2, 4, P.green); R(c, x - 4, base - 5, 3, 1, P.green);
      R(c, x + 3, base - 10, 2, 4, P.green); R(c, x + 2, base - 7, 3, 1, P.green); px(c, x, base - 12, P.lime);
      if (season === 'spring') px(c, x, base - 13, P.pink);
    } else if (kind === 'palm') {
      line(c, x, base, x + 2, base - 8, P.wood); line(c, x + 1, base, x + 3, base - 8, P.bark); line(c, x + 2, base - 8, x + 3, base - 15, P.wood);
      line(c, x + 3, base - 15, x - 4, base - 12, P.green); line(c, x + 3, base - 15, x + 10, base - 12, P.green);
      line(c, x + 3, base - 16, x - 2, base - 19, P.lime); line(c, x + 3, base - 16, x + 8, base - 19, P.lime); px(c, x + 3, base - 14, P.bark);
    } else if (kind === 'reeds') {
      for (var i = 0; i < 4; i++) { R(c, x + i * 2, base - 6 - (i % 2) * 2, 1, 6 + (i % 2) * 2, P.green); R(c, x + i * 2, base - 8 - (i % 2) * 2, 1, 2, P.bark); }
    }
  }
  function groundCols(biome, season) {
    if (biome === 'desert') return [P.sand, P.orange];
    if (biome === 'beach') return [P.sand, P.wood];
    if (biome === 'tundra' || season === 'winter') return [P.white, P.silver];
    if (season === 'fall') return [P.green, P.orange];
    if (season === 'spring') return [P.lime, P.green];
    return [P.green, P.teal];
  }

  /* ---------- houses ---------- */
  // Each returns a function that re-lights its windows (used at night after the dark overlay).
  var HOUSE = {
    cabin: function (c, season, lit) {
      for (var j = 0; j < 24; j++) R(c, 12, 66 + j, 46, 1, j % 4 === 3 ? P.bark : P.wood);
      R(c, 46, 47, 6, 12, P.slate); R(c, 45, 46, 8, 2, P.dark);
      tri(c, 35, 46, 22, 1.35, P.red); R(c, 7, 67, 57, 1, P.plum);
      for (var k = 0; k < 22; k += 4) { var ww = Math.round(k * 1.35); px(c, 35 - ww, 46 + k, P.plum); px(c, 35 + ww, 46 + k, P.plum); }
      if (season === 'winter') { tri(c, 35, 46, 6, 1.35, P.white); px(c, 28, 52, P.white); px(c, 42, 52, P.white); }
      R(c, 28, 76, 9, 14, P.bark); R(c, 29, 77, 7, 13, P.red); px(c, 34, 84, P.yellow);
      R(c, 27, 90, 11, 2, P.slate);
      function win(on) { R(c, 42, 72, 10, 8, P.bark); R(c, 43, 73, 8, 6, on ? P.yellow : P.cyan); R(c, 47, 73, 1, 6, P.bark); R(c, 43, 75, 8, 1, P.bark); if (!on) px(c, 44, 74, P.white); }
      win(lit);
      return function (live) { c = live; win(true); };
    },
    cave: function (c, season, lit) {
      ell(c, 36, 90, 31, 27, P.slate, true); ell(c, 34, 90, 26, 23, P.silver, true);
      dith(c, 14, 72, 10, 6, P.slate, 0); dith(c, 48, 76, 12, 6, P.slate, 1); dith(c, 30, 66, 8, 4, P.slate, 0);
      if (season === 'winter') ell(c, 36, 66, 16, 3, P.white, true); else ell(c, 36, 66, 14, 3, P.green, true);
      ell(c, 36, 90, 9, 14, P.ink, true);
      R(c, 8, 88, 6, 3, P.slate); R(c, 60, 87, 7, 4, P.slate);
      function glow(on) { if (on) { ell(c, 36, 90, 5, 7, P.orange, true); ell(c, 36, 90, 2, 3, P.yellow, true); } }
      glow(lit);
      return function (live) { c = live; glow(true); };
    },
    mansion: function (c, season, lit) {
      R(c, 16, 38, 5, 10, P.red); R(c, 56, 38, 5, 10, P.red);
      R(c, 6, 58, 64, 32, P.white); R(c, 62, 58, 8, 32, P.silver);
      for (var j = 0; j < 12; j++) { var w = 52 + j * 1.5; R(c, 38 - w / 2, 46 + j, w, 1, P.navy); }
      R(c, 13, 46, 50, 1, P.blue);
      if (season === 'winter') R(c, 13, 45, 50, 2, P.white);
      R(c, 28, 68, 20, 2, P.navy); R(c, 30, 70, 2, 20, P.silver); R(c, 45, 70, 2, 20, P.silver);
      R(c, 33, 75, 10, 15, P.silver); R(c, 34, 77, 8, 13, P.navy); px(c, 40, 84, P.yellow);
      R(c, 29, 90, 20, 2, P.silver);
      var ws = [[10, 61], [21, 61], [49, 61], [59, 61], [10, 76], [21, 76], [49, 76], [59, 76]];
      function wins(on) { ws.forEach(function (p) { R(c, p[0] - 1, p[1] - 1, 7, 9, P.silver); R(c, p[0], p[1], 5, 7, on ? P.yellow : P.cyan); R(c, p[0], p[1] + 3, 5, 1, P.silver); }); }
      wins(lit);
      return function (live) { c = live; wins(true); };
    },
    castle: function (c, season, lit) {
      function bricks(x, y, w, h) {
        R(c, x, y, w, h, P.silver);
        for (var j = 0; j < h; j += 5) { R(c, x, y + j, w, 1, P.slate); for (var i = (j / 5) % 2 ? 3 : 0; i < w; i += 7) R(c, x + i, y + j, 1, 5, P.slate); }
      }
      bricks(16, 60, 44, 30); bricks(4, 48, 14, 42); bricks(58, 48, 14, 42);
      for (var x = 16; x < 58; x += 6) R(c, x, 56, 4, 4, P.silver);
      tri(c, 11, 32, 14, 0.55, P.red); tri(c, 65, 32, 14, 0.55, P.red);
      if (season === 'winter') { tri(c, 11, 32, 4, 0.55, P.white); tri(c, 65, 32, 4, 0.55, P.white); }
      R(c, 65, 22, 1, 10, P.ink);
      ell(c, 38, 90, 7, 14, P.ink, true);
      for (var gx = 33; gx <= 43; gx += 2) R(c, gx, 78, 1, 12, P.slate);
      function wins(on) { R(c, 10, 56, 3, 5, on ? P.yellow : P.ink); R(c, 64, 56, 3, 5, on ? P.yellow : P.ink); R(c, 36, 66, 4, 4, on ? P.yellow : P.ink); }
      wins(lit);
      return function (live) { c = live; wins(true); };
    },
    lilypad: function (c, season, lit) {
      ell(c, 38, 95, 37, 9, P.blue); R(c, 8, 97, 7, 1, P.sky); R(c, 56, 99, 9, 1, P.sky); R(c, 20, 101, 6, 1, P.sky);
      ell(c, 38, 92, 29, 6, P.teal); ell(c, 38, 91, 28, 5, P.green);
      for (var j = 0; j < 6; j++) R(c, 38, 91 + j, 1 + j, 1, P.blue);
      px(c, 20, 90, P.lime); px(c, 52, 89, P.lime); px(c, 30, 94, P.lime);
      R(c, 30, 70, 16, 20, P.sand); R(c, 44, 70, 2, 20, P.wood);
      R(c, 35, 79, 6, 11, P.wood); R(c, 36, 78, 4, 1, P.wood); px(c, 39, 84, P.yellow);
      ell(c, 38, 72, 20, 14, P.red, true); R(c, 18, 72, 41, 1, P.plum);
      disc(c, 30, 64, 2, P.white); disc(c, 43, 62, 2, P.white); px(c, 50, 68, P.white); px(c, 24, 69, P.white); px(c, 37, 60, P.white);
      if (season === 'winter') ell(c, 38, 60, 12, 3, P.white, true);
      spr(c, 58, 85, ['.P.P.', 'PPwPP', '.PPP.', '..g..']);
      function win(on) { R(c, 32, 74, 3, 3, on ? P.yellow : P.cyan); }
      win(lit);
      return function (live) { c = live; win(true); };
    }
  };

  /* ---------- outdoor land (cached) ---------- */
  function hills(c, base, amp, freq, ph, col) {
    for (var x = 0; x < W; x++) { var h = base - Math.round(amp * (0.5 + 0.5 * Math.sin(x * freq + ph))); R(c, x, h, 1, GY - h + 1, col); }
  }
  function drawLand(c, sc) {
    var b = sc.biome, s = sc.season, gc = groundCols(b, s), r = U.rng(U.hash32(b + s)), shop = sc.shop || {};
    if (shop.backdrop) c.drawImage(shop.backdrop.img, 0, GY + 1 - shop.backdrop.img.height);
    else if (b === 'forest') { hills(c, 66, 8, 0.045, 2, P.teal); for (var x = -4; x < W; x += 7) tree(c, 'pine', x + (x % 3), GY - 2 + (x % 2), s); }
    else if (b === 'desert') { R(c, 18, 58, 44, GY - 58, P.orange); R(c, 22, 56, 36, 2, P.orange); R(c, 128, 62, 40, GY - 62, P.orange); R(c, 18, 58, 44, 2, P.red); R(c, 128, 62, 40, 2, P.red); hills(c, 80, 5, 0.06, 0, P.sand); }
    else if (b === 'tundra') { tri(c, 44, 32, 52, 1.1, P.slate); tri(c, 44, 32, 10, 1.1, P.white); tri(c, 150, 38, 46, 1.2, P.slate); tri(c, 150, 38, 9, 1.2, P.white); tri(c, 100, 48, 36, 1.0, P.silver); }
    else if (b === 'beach') { R(c, 0, 64, W, GY - 64, P.blue); for (var w = 0; w < 14; w++) R(c, (w * 29) % W, 66 + (w * 7) % 16, 5, 1, P.sky); }
    else { hills(c, 70, 10, 0.05, 1, P.teal); hills(c, 78, 6, 0.08, 3, s === 'winter' ? P.silver : s === 'fall' ? P.orange : P.green); }
    R(c, 0, GY, W, H - GY, gc[0]);
    for (var i = 0; i < 70; i++) px(c, Math.floor(r() * W), GY + 1 + Math.floor(r() * (H - GY - 1)), gc[1]);
    if (b === 'beach') { for (var fx = 0; fx < W; fx += 2) px(c, fx, GY, (fx % 4) ? P.white : P.sky); }
    if ((s === 'spring' || s === 'summer') && b !== 'desert' && b !== 'tundra' && b !== 'beach') {
      for (var fl = 0; fl < 14; fl++) { var fxx = Math.floor(r() * W), fy = GY + 3 + Math.floor(r() * 20); px(c, fxx, fy, U.pick(r, [P.pink, P.yellow, P.white])); px(c, fxx, fy + 1, P.green); }
    }
    if (b === 'pond') { ell(c, 164, 97, 30, 8, P.blue); ell(c, 164, 97, 26, 6, P.sky); ell(c, 164, 97, 22, 5, P.blue); ell(c, 156, 96, 3, 1, P.green); ell(c, 174, 99, 3, 1, P.green); tree(c, 'reeds', 134, 96, s); }
    var kinds = { meadow: 'round', forest: 'pine', desert: 'cactus', tundra: 'pine', pond: 'round', beach: 'palm' };
    var spots = b === 'pond' ? [84, 92] : [82, 94, 152, 170, 184];
    spots.forEach(function (x2, j) { tree(c, kinds[b], x2, GY + 2 + (j % 2), s); });
    // path from the door
    if (sc.house !== 'lilypad') for (var p = 0; p < 16; p++) dith(c, 30 + p * 2, 92 + Math.floor(p / 3), 3, 1, b === 'desert' || b === 'beach' ? P.wood : P.sand, p);
    if (A.behindHouse) A.behindHouse(c, sc); // 2.2.0: the outhouse (behind the house)
    if (shop.house) { c.drawImage(shop.house.img, Math.max(0, 38 - Math.round(shop.house.img.width / 2)), 93 - shop.house.img.height); if (A.yardFixtures) A.yardFixtures(c, sc); return null; }
    var relight = HOUSE[sc.house] ? HOUSE[sc.house](c, s, false) : HOUSE.cabin(c, s, false);
    if (A.yardFixtures) A.yardFixtures(c, sc); // 2.2.0: the firepit
    return relight;
  }

  /* ---------- indoor room (cached; window left transparent) ---------- */
  A.DOOR_IN = { x: 0, y: 50, w: 16, h: 30 };
  function roomDoor(c, hs, open) {
    var D = A.DOOR_IN, fr = hs === 'castle' || hs === 'cave' ? P.dark : P.bark, col = { cave: P.slate, castle: P.slate, lilypad: P.green, mansion: P.red }[hs] || P.wood;
    R(c, D.x, D.y, D.w, D.h, fr);
    if (open) { R(c, D.x + 1, D.y + 2, D.w - 3, D.h - 2, P.ink); R(c, D.x + 2, D.y + D.h - 6, D.w - 5, 4, P.green); R(c, D.x + D.w - 4, D.y + 2, 3, D.h - 2, col); return; } // daylight and grass through the open door
    R(c, D.x + 1, D.y + 2, D.w - 3, D.h - 2, col);
    R(c, D.x + 3, D.y + 5, D.w - 7, 9, fr); R(c, D.x + 4, D.y + 6, D.w - 9, 7, col);
    R(c, D.x + 3, D.y + 17, D.w - 7, 9, fr); R(c, D.x + 4, D.y + 18, D.w - 9, 7, col);
    px(c, D.x + D.w - 4, D.y + 16, P.yellow);
  }
  var WIN = [15, 13, 42, 30];
  function drawRoom(c, sc) {
    var hs = sc.house, acc = sc.accent || P.red;
    var wallCol = { cabin: P.wood, cave: P.slate, mansion: P.sand, castle: P.silver, lilypad: P.lime }[hs] || P.wood;
    var floorCol = { cabin: P.bark, cave: P.dark, mansion: P.bark, castle: P.slate, lilypad: P.green }[hs] || P.bark;
    R(c, 0, 0, W, 80, wallCol);
    var x, y;
    if (hs === 'cabin') for (x = 6; x < W; x += 9) R(c, x, 0, 1, 80, P.bark);
    if (hs === 'cave') { dith(c, 0, 0, W, 4, P.dark, 0); for (x = 0; x < W; x += 13) dith(c, x, 20 + (x % 30), 6, 5, P.dark, x % 2); }
    if (hs === 'mansion') { for (x = 4; x < W; x += 12) R(c, x, 0, 2, 62, P.white); R(c, 0, 62, W, 18, P.wood); R(c, 0, 62, W, 2, P.bark); }
    if (hs === 'castle') { for (y = 0; y < 80; y += 6) { R(c, 0, y, W, 1, P.slate); for (x = (y / 6) % 2 ? 4 : 0; x < W; x += 9) R(c, x, y, 1, 6, P.slate); } R(c, 150, 6, 12, 22, P.red); tri(c, 156, 28, 4, 1.5, P.red); px(c, 156, 14, P.yellow); }
    if (hs === 'lilypad') { for (y = 0; y < 80; y += 4) for (x = (y / 4) % 2 ? 2 : 0; x < W; x += 4) px(c, x, y, P.green); }
    R(c, 0, 80, W, 28, floorCol);
    for (y = 84; y < H; y += 5) R(c, 0, y, W, 1, hs === 'lilypad' ? P.lime : P.ink);
    R(c, 0, 80, W, 1, P.ink);
    // 2.1.15: the front door (tap it and Aiu heads outside)
    roomDoor(c, hs, false);
    var dh = sc.dh || {}; // 2.4.0: the dollhouse borrows parts of this room (and leaves out what would be cut in half)
    // window
    var fr = hs === 'castle' || hs === 'cave' ? P.dark : P.bark;
    if (!dh.noWindow) {
    R(c, 12, 10, 48, 36, fr); c.clearRect(WIN[0], WIN[1], WIN[2], WIN[3]);
    R(c, 35, 13, 2, 30, fr); R(c, 15, 27, 42, 2, fr); R(c, 10, 46, 52, 3, P.bark);
    R(c, 7, 8, 5, 40, acc); R(c, 60, 8, 5, 40, acc);
    }
    // shelf + picture
    R(c, 76, 30, 34, 2, P.bark); R(c, 78, 22, 3, 8, P.red); R(c, 81, 23, 3, 7, P.blue); R(c, 84, 21, 2, 9, P.green); R(c, 86, 24, 4, 6, P.yellow);
    R(c, 102, 26, 5, 4, P.orange); px(c, 103, 24, P.green); px(c, 105, 23, P.green); px(c, 104, 25, P.green);
    if (sc.shop && sc.shop.decor) c.drawImage(sc.shop.decor.img, 125 - Math.round(sc.shop.decor.img.width / 2), Math.max(4, 32 - sc.shop.decor.img.height));
    // 2.3.0: the picture is gone: a regulator wall clock hangs here (world.js draws it, with the real time)
    // bed
    if (!dh.noBed) { R(c, 182, 66, 4, 30, P.bark); R(c, 146, 88, 40, 6, P.bark); R(c, 147, 94, 2, 4, P.bark); R(c, 183, 94, 2, 4, P.bark);
    R(c, 146, 84, 38, 4, P.white); R(c, 146, 82, 28, 8, acc); R(c, 146, 82, 28, 1, P.white); R(c, 174, 79, 8, 5, P.white); }
    // rug + lamp
    if (!dh.noRug) { ell(c, 98, 100, 32, 5, P.red); ell(c, 98, 100, 27, 4, P.orange); ell(c, 98, 100, 20, 3, P.red); }
    if (!dh.noLamp) { R(c, 136, 62, 1, 34, P.dark); R(c, 133, 96, 7, 2, P.dark); }
    // TV if the Totem has learned about TV or games
    if ((sc.unlocked.tv || sc.unlocked.games) && !dh.noTV) { R(c, 52, 88, 28, 10, P.bark); R(c, 54, 68, 24, 20, P.dark); R(c, 56, 70, 20, 15, P.ink); line(c, 60, 67, 56, 62, P.dark); line(c, 72, 67, 76, 62, P.dark); }
  }
  /* ---------- the library (shown while the Library tab is open) ---------- */
  var SPINES = null;
  function bookshelf(c, x0, w, seed) {
    var r = U.rng(seed), cols = [P.red, P.blue, P.green, P.yellow, P.orange, P.teal, P.plum, P.sky, P.sand, P.pink, P.navy];
    R(c, x0, 4, w, 78, P.bark); R(c, x0 + 3, 7, w - 6, 72, P.ink);
    [26, 46, 66].forEach(function (sy) {
      var x = x0 + 4;
      while (x < x0 + w - 6) {
        var bw = 2 + Math.floor(r() * 3), bh = 11 + Math.floor(r() * 6);
        if (r() < 0.08) { x += 3; continue; } // a gap
        R(c, x, sy - bh, bw, bh, U.pick(r, cols)); if (bw > 2) R(c, x, sy - bh + 2, bw, 1, P.white);
        x += bw + (r() < 0.2 ? 1 : 0);
      }
      R(c, x0 + 3, sy, w - 6, 3, P.wood);
    });
  }
  function drawLibrary(c, sc) {
    R(c, 0, 0, W, 80, P.dark);
    for (var x = 0; x < W; x += 12) R(c, x, 0, 1, 80, P.navy);
    R(c, 0, 76, W, 4, P.bark);
    bookshelf(c, 2, 58, 11); bookshelf(c, 132, 58, 29);
    // ladder on the right shelf
    R(c, 124, 18, 2, 64, P.wood); R(c, 131, 18, 2, 64, P.wood); for (var y = 24; y < 80; y += 8) R(c, 124, y, 9, 1, P.wood);
    // arched window with the day outside
    R(c, 72, 18, 36, 34, P.bark); R(c, 75, 21, 30, 28, sc.phase === 'night' ? P.navy : sc.phase === 'day' ? P.sky : P.orange);
    R(c, 89, 21, 2, 28, P.bark); R(c, 75, 34, 30, 2, P.bark); R(c, 70, 52, 40, 3, P.wood);
    // floor, rug, reading table with a lamp and a stack of books
    R(c, 0, 80, W, 28, P.wood); for (y = 84; y < H; y += 5) R(c, 0, y, W, 1, P.bark); R(c, 0, 80, W, 1, P.ink);
    ell(c, 96, 101, 30, 5, P.plum); ell(c, 96, 101, 24, 4, P.red);
    R(c, 64, 82, 22, 3, P.bark); R(c, 66, 85, 2, 12, P.bark); R(c, 82, 85, 2, 12, P.bark);
    R(c, 66, 77, 7, 2, P.red); R(c, 67, 75, 6, 2, P.blue); R(c, 66, 73, 7, 2, P.green);
    R(c, 78, 74, 1, 8, P.dark); R(c, 75, 71, 7, 3, P.yellow);
  }
  /* ---------- the shop (shown while the Shop tab is open) ---------- */
  function drawShopRoom(c, sc) {
    R(c, 0, 0, W, 80, P.sand);
    for (var x = 0; x < W; x += 16) R(c, x, 10, 8, 70, P.yellow);
    // awning
    for (x = 0; x < W; x += 12) { R(c, x, 0, 6, 9, P.red); R(c, x + 6, 0, 6, 9, P.white); tri(c, x + 3, 9, 2, 1, P.red); }
    // back shelves with things for sale
    R(c, 28, 22, 84, 3, P.bark); R(c, 28, 44, 84, 3, P.bark); R(c, 28, 66, 84, 3, P.bark);
    var r = U.rng(77);
    [22, 44, 66].forEach(function (sy, row) {
      for (var i = 0; i < 6; i++) {
        var ix = 32 + i * 13, k = Math.floor(r() * 5), col = U.pick(r, [P.red, P.blue, P.green, P.orange, P.pink, P.sky, P.lime]);
        if (k === 0) tri(c, ix + 4, sy - 8, 4, 1.2, col); // hat
        else if (k === 1) disc(c, ix + 4, sy - 4, 3, col); // ball
        else if (k === 2) { R(c, ix, sy - 8, 8, 8, col); R(c, ix, sy - 5, 8, 1, P.white); } // box
        else if (k === 3) { disc(c, ix + 4, sy - 5, 3, P.wood); px(c, ix + 3, sy - 6, P.ink); px(c, ix + 5, sy - 6, P.ink); disc(c, ix + 2, sy - 8, 1, P.wood); disc(c, ix + 6, sy - 8, 1, P.wood); } // teddy
        else { R(c, ix + 1, sy - 10, 6, 10, col); R(c, ix + 2, sy - 12, 4, 2, P.white); } // bottle
        R(c, ix + 2, sy + 3, 4, 3, P.white); R(c, ix + 3, sy + 4, 2, 1, P.ink); // price tag
      }
    });
    // mirror (left) and counter with a register (right)
    R(c, 4, 26, 20, 46, P.wood); R(c, 6, 28, 16, 42, P.silver); R(c, 8, 30, 3, 10, P.white);
    R(c, 0, 80, W, 28, P.white);
    for (x = 0; x < W; x += 8) for (var y = 80; y < H; y += 8) if (((x + y) / 8) % 2) R(c, x, y, 8, 8, P.silver);
    R(c, 0, 80, W, 1, P.ink);
    R(c, 136, 70, 56, 26, P.wood); R(c, 134, 67, 60, 4, P.bark); R(c, 136, 78, 56, 1, P.bark);
    R(c, 158, 55, 18, 12, P.slate); R(c, 160, 57, 10, 4, P.lime); R(c, 172, 58, 2, 6, P.dark); R(c, 156, 64, 22, 3, P.dark);
    disc(c, 184, 65, 1, P.yellow); disc(c, 187, 65, 1, P.yellow); disc(c, 185, 63, 1, P.yellow);
  }
  // What Aiu does in the library and the shop (a new one every 20 seconds).
  var PLACE_ACTS = {
    library: [['lib_organize', 'organizing books', 116], ['lib_read', 'reading a book', 96], ['lib_phone', 'on its phone', 98]],
    shop: [['shop_browse', 'browsing the shelves', 70], ['shop_counter', 'at the counter', 122], ['shop_tryon', 'trying on a hat', 40]]
  };
  A.placeActivity = function (place, tsec, seed) {
    var list = PLACE_ACTS[place]; if (!list) return null;
    var a = list[(Math.floor(tsec / 20) + (seed || 0)) % list.length];
    return { id: a[0], label: a[1], spotX: a[2] };
  };
  var PHONE = ['kkkkk', 'kcccc'.slice(0, 5), 'kcick', 'kccck', 'kcick', 'kccck', 'kkwkk'];
  var COIN = ['.yy.', 'yooy', 'yooy', '.yy.'];
  var HAT2 = ['..k..', '.krk.', '.krk.', 'krrrk', 'kkkkk'];
  var PLACE_DRAW = {
    lib_organize: { pose: function (f) { return { flip: false, dy: (f % 24) < 3 ? -1 : 0 }; },
      front: function (c, x, fy, f, cw, ch, sc) {
        var ph = ((sc.tsec || 0) * 0.6) % 3, hx = x + Math.round(cw / 2) + 1, hy = fy - Math.round(ch * 0.6);
        var col = [P.red, P.blue, P.green, P.orange][Math.floor((sc.tsec || 0) / 5) % 4];
        if (ph < 1) R(c, hx, hy - 6, 3, 9, col);
        else if (ph < 2) { var k = ph - 1, bx = Math.round(hx + (140 - hx) * k), by = Math.round(hy - 6 + (52 - (hy - 6)) * k); R(c, bx, by, 3, 9, col); }
        else R(c, 140, 52, 3, 9, col);
      } },
    lib_read: { front: function (c, x, fy, f, cw, ch) { spr(c, x - 4, fy - Math.round(ch * 0.45), BOOK); if (f % 16 < 4) px(c, x, fy - Math.round(ch * 0.45) + 1, P.silver); } },
    lib_phone: { front: function (c, x, fy, f, cw, ch, sc) {
        var py = fy - Math.round(ch * 0.55);
        spr(c, x + Math.round(cw / 2) - 3, py, PHONE);
        if (f % 10 < 5) px(c, x + Math.round(cw / 2) - 1, py + 2 + (f % 4), P.white);
        if (Math.floor((sc.tsec || 0) * 2) % 6 < 3) { var dy = fy - ch - 6; px(c, x + 6, dy, P.white); px(c, x + 8, dy, P.white); px(c, x + 10, dy, P.white); }
      } },
    shop_browse: { pose: function (f) { return { flip: Math.floor(f / 40) % 2 === 1 }; },
      front: function (c, x, fy, f, cw, ch) { if (f % 30 < 12) spr(c, x - 1, fy - ch - 9, ['kk', '.k', 'k.', '..', 'k.']); } },
    shop_counter: { front: function (c, x, fy, f, cw, ch, sc) {
        var ph = ((sc.tsec || 0) * 0.8) % 2, sx = x + Math.round(cw / 2), k = ph < 1 ? ph : 2 - ph;
        spr(c, Math.round(sx + (158 - sx) * k), Math.round(fy - ch * 0.6 - Math.sin(k * Math.PI) * 10), COIN);
      } },
    shop_tryon: { pose: function () { return { flip: true }; },
      front: function (c, x, fy, f, cw, ch, sc) {
        var on = Math.floor((sc.tsec || 0) / 2) % 2 === 0;
        if (on) spr(c, x - 2, fy - ch - 5, HAT2);
        R(c, 12, 44, 8, 12, on ? P.red : P.sky); // the mirror shows it too
      } }
  };

  function lampShade(c, on) { R(c, 131, 56, 11, 6, on ? P.yellow : P.sand); R(c, 131, 61, 11, 1, P.orange); }

  /* ---------- activity props ---------- */
  var CAN = ['...k....', 'kkkkk..k', 'kSSSkkk.', 'kSsSk...', 'kSSSk...', '.kkk....'];
  var DUMB = ['dd.....dd', 'ddsssssdd', 'dd.....dd'];
  var BOOK = ['.kkk.kkk.', 'kwwwkwwwk', 'kwsskwsswk'.slice(0, 9), 'kwwwkwwwk', '.kkkkkkk.'];
  var NOTE = ['.kk', '.k.', 'kk.', 'kk.'];
  var ZZZ = ['kkk', '.k.', 'kkk'];
  var CHICK = ['.r...', 'www..', 'wwwwy', 'wwww.', '.y.y.'];
  var CHICK2 = ['.....', '.r...', 'www..', 'wwwwy', '.y.y.'];
  var BANG = ['kk', 'kk', 'kk', '..', 'kk'];
  var COIN_H = ['.yy.', 'y..y', 'y..y', '.yy.'], COIN_T = ['.oo.', 'o..o', 'o..o', '.oo.']; // round coins with a square hole

  function flowerBed(c, x, fy) { for (var i = 0; i < 3; i++) { var fx = x + i * 4; R(c, fx + 1, fy - 4, 1, 4, P.green); spr(c, fx, fy - 7, i === 1 ? ['.y.', 'ywy', '.y.'] : ['.P.', 'PyP', '.P.']); } }

  /* 2.1.11: the bounty board lives in the yard (and as a little corkboard inside). The Today counter is pinned on it:
     the number of things that matter today, a red pin that blinks while a reminder rings. Tap it for the list. */
  var DIG = { 0: ['kkk', 'k.k', 'k.k', 'k.k', 'kkk'], 1: ['.k.', 'kk.', '.k.', '.k.', 'kkk'], 2: ['kkk', '..k', 'kkk', 'k..', 'kkk'], 3: ['kkk', '..k', '.kk', '..k', 'kkk'], 4: ['k.k', 'k.k', 'kkk', '..k', '..k'],
    5: ['kkk', 'k..', 'kkk', '..k', 'kkk'], 6: ['kkk', 'k..', 'kkk', 'k.k', 'kkk'], 7: ['kkk', '..k', '.k.', '.k.', '.k.'], 8: ['kkk', 'k.k', 'kkk', 'k.k', 'kkk'], 9: ['kkk', 'k.k', 'kkk', '..k', 'kkk'], '+': ['...', '.k.', 'kkk', '.k.', '...'] };
  A.BOARD_OUT = { x: 98, w: 18 }; A.BOARD_IN = { x: 116, y: 38, w: 18, h: 16 }; // under the picture, inside the close-up view
  function boardCount(c, bx, by, info, f) { // the count on a white note
    var n = info ? info.n : 0;
    R(c, bx, by, 10, 9, n ? P.white : P.sand); px(c, bx + 5, by - 1, n ? P.red : P.slate);
    if (!n) { R(c, bx + 2, by + 3, 6, 1, P.silver); R(c, bx + 2, by + 5, 4, 1, P.silver); return; }
    if (n > 9) { spr(c, bx + 1, by + 2, DIG[9]); spr(c, bx + 5, by + 2, DIG['+']); } else spr(c, bx + 3, by + 2, DIG[n]);
    if (info.ring && f % 6 < 3) { R(c, bx + 11, by - 3, 2, 5, P.red); px(c, bx + 11, by + 3, P.red); px(c, bx + 12, by + 3, P.red); }
  }
  function yardBoard(c, sc) {
    var bx = A.BOARD_OUT.x, fy = 97, top = fy - 26, info = sc.board;
    R(c, bx + 8, top + 16, 2, 10, P.bark); // post
    R(c, bx, top, 18, 17, P.bark); R(c, bx + 1, top + 1, 16, 15, P.wood);
    R(c, bx - 1, top - 2, 20, 2, P.bark); // little roof
    R(c, bx + 2, top + 9, 4, 4, P.sand); px(c, bx + 3, top + 9, P.red); R(c, bx + 12, top + 3, 4, 4, P.yellow); px(c, bx + 13, top + 3, P.red); // a couple of old notes
    boardCount(c, bx + 4, top + 3, info, sc.f);
  }
  function roomBoard(c, sc) {
    var B = A.BOARD_IN;
    R(c, B.x - 1, B.y - 1, B.w + 2, B.h + 2, P.bark); R(c, B.x, B.y, B.w, B.h, P.wood); dith(c, B.x, B.y, B.w, B.h, P.orange, 1);
    boardCount(c, B.x + 4, B.y + 4, sc.board, sc.f);
  }
  // 2.1.13: the Vitals drone hovers in the sky (inside, near the ceiling). Its light shows how Aiu is doing: green, yellow, or a red blink
  // when he's worn out. Tap it for the Vitals.
  function dronePos(sc) { var t = (sc.tsec || 0); return sc.indoor ? { x: 92 + Math.round(Math.sin(t * 0.7) * 3), y: 42 + Math.round(Math.sin(t * 1.9) * 1.5) } : { x: 150 + Math.round(Math.sin(t * 0.5) * 6), y: 40 + Math.round(Math.sin(t * 1.7) * 2) }; }
  function drone(c, sc) {
    var p = dronePos(sc), x = p.x, y = p.y, f = sc.f, v = sc.vit, lit = !v ? P.silver : v.distressed ? (f % 4 < 2 ? P.red : P.plum) : v.avg >= 60 ? P.green : P.yellow;
    R(c, x - 7, y - 1, 15, 4, P.ink); R(c, x - 6, y, 13, 2, P.slate); R(c, x - 3, y - 2, 7, 2, P.ink); R(c, x - 2, y - 1, 5, 1, P.silver); // body
    [-6, 6].forEach(function (dx) { R(c, x + dx, y - 3, 1, 2, P.ink); var sp = f % 2 ? 3 : 1; R(c, x + dx - sp, y - 4, sp * 2 + 1, 1, P.white); }); // spinning rotors
    R(c, x - 1, y + 2, 3, 2, P.ink); px(c, x, y + 2, lit); px(c, x, y + 3, lit); // the light
    R(c, x - 4, y + 3, 1, 2, P.ink); R(c, x + 4, y + 3, 1, 2, P.ink); // little legs
    if (v && !v.distressed && f % 16 < 2) px(c, x + 2, y - 2, P.white); // a glint
  }
  A.droneRect = function (sc) { if (!sc || !sc.stage || (sc.place && sc.place !== 'home')) return null; var p = dronePos(sc); return { x: p.x - 12, y: p.y - 10, w: 24, h: 18 }; };
  // 2.1.15: tap the house (outside) to send Aiu in; tap the window (inside) to send him out
  A.houseRect = function (sc) {
    if (!sc || !sc.stage || (sc.place && sc.place !== 'home' && !(A.ROOMS && A.ROOMS[sc.place]))) return null; // 2.3.0: the kitchen and the bathroom have a door too
    if (sc.indoor) { var D = (A.DOORS && A.DOORS[sc.place]) || A.DOOR_IN; return { x: D.x, y: D.y - 4, w: D.w + 4, h: D.h + 6 }; } // the front door (2.3.0: or the room's own doorway)
    return { x: 4, y: 40, w: 54, h: 54 }; // the whole house
  };
  A.boardRect = function (sc) {
    if (!sc || !sc.stage || (sc.place && sc.place !== 'home')) return null;
    if (sc.indoor) { var B = A.BOARD_IN; return { x: B.x - 3, y: B.y - 3, w: B.w + 6, h: B.h + 6 }; }
    return { x: A.BOARD_OUT.x - 3, y: 97 - 30, w: A.BOARD_OUT.w + 6, h: 32 };
  };
  function sandcastle(c, bx, fy, st0) {
    function blk(x, y, w, h) { R(c, x - 1, y - 1, w + 2, h + 1, P.wood); } // outline first, so sand shows on sand
    blk(bx, fy - 4, 18, 4); if (st0 >= 1) { blk(bx + 1, fy - 10, 5, 6); blk(bx + 12, fy - 10, 5, 6); } if (st0 >= 2) blk(bx + 6, fy - 13, 6, 9);
    R(c, bx, fy - 4, 18, 4, P.sand); R(c, bx, fy - 1, 18, 1, P.orange);
    if (st0 >= 1) { R(c, bx + 1, fy - 9, 5, 5, P.sand); R(c, bx + 12, fy - 9, 5, 5, P.sand); px(c, bx + 1, fy - 10, P.sand); px(c, bx + 5, fy - 10, P.sand); px(c, bx + 12, fy - 10, P.sand); px(c, bx + 16, fy - 10, P.sand); }
    if (st0 >= 2) { R(c, bx + 6, fy - 12, 6, 8, P.sand); px(c, bx + 6, fy - 13, P.sand); px(c, bx + 8, fy - 13, P.sand); px(c, bx + 11, fy - 13, P.sand); }
    if (st0 >= 3) R(c, bx + 8, fy - 4, 2, 3, P.bark);
    if (st0 >= 4) { R(c, bx + 9, fy - 17, 1, 4, P.bark); R(c, bx + 10, fy - 17, 3, 2, P.red); }
    if (st0 >= 5) { px(c, bx + 3, fy - 7, P.bark); px(c, bx + 14, fy - 7, P.bark); }
  }
  function snowman(c, bx, fy, st0, acc) {
    disc(c, bx, fy - 5, 6, P.silver); disc(c, bx, fy - 5, 5, P.white); R(c, bx - 4, fy - 2, 9, 1, P.silver);
    if (st0 >= 1) { disc(c, bx, fy - 13, 5, P.silver); disc(c, bx, fy - 13, 4, P.white); }
    if (st0 >= 2) { disc(c, bx, fy - 20, 4, P.silver); disc(c, bx, fy - 20, 3, P.white); }
    if (st0 >= 3) { px(c, bx - 1, fy - 21, P.ink); px(c, bx + 1, fy - 21, P.ink); R(c, bx + 1, fy - 20, 3, 1, P.orange); px(c, bx, fy - 14, P.ink); px(c, bx, fy - 12, P.ink); }
    if (st0 >= 4) { line(c, bx - 4, fy - 14, bx - 9, fy - 18, P.bark); line(c, bx + 4, fy - 14, bx + 9, fy - 18, P.bark); R(c, bx - 3, fy - 17, 7, 1, acc || P.red); }
    if (st0 >= 5) { R(c, bx - 3, fy - 24, 7, 1, P.ink); R(c, bx - 2, fy - 28, 5, 4, P.ink); px(c, bx - 2, fy - 25, P.red); }
  }
  // 2.0.8: the pet, wearing a saddle: tap it for the mini games. A horse, a ghost, a dog, a cat or a conjure (a summoned spirit).
  // Each Totem gets one at random (by its egg); Settings > Totem > Pet changes it. Indoors it stays outside: the computer is the hub.
  A.BUDDIES = { horse: 'Horse', ghost: 'Ghost', dog: 'Dog', cat: 'Cat', conjure: 'Conjure (a summoned spirit)', eagle: 'Eagle (on its post)', parrot: 'Parrot (on its post)', penguin: 'Penguin', beardog: 'Bear Dog' };
  var BUDDY_LIST = ['horse', 'ghost', 'dog', 'cat', 'conjure']; // the egg still picks from the first five (2.1.7: so nobody's buddy changes); the new ones are chosen in Settings
  A.NOGEAR = { ghost: 1, conjure: 1, eagle: 1, parrot: 1, penguin: 1 }; // 2.1.7: spirits (gear falls right through) and birds go bare
  A.POSTED = { eagle: 1, parrot: 1 }; // birds sit on a post
  A.buddyOf = function (soul, pref) { return A.BUDDIES[pref] ? pref : BUDDY_LIST[((soul >>> 5) >>> 0) % BUDDY_LIST.length]; };
  A.BUDDY_OUT = { x: 64, fy: 96 }; A.AIU_OUT = 136; // 2.1.5: the pet waits by the house; Aiu has the right side
  function parts2(c, parts) { parts.forEach(function (q) { R(c, q[0] - 1, q[1] - 1, q[2] + 2, q[3] + 2, P.ink); }); parts.forEach(function (q) { R(c, q[0], q[1], q[2], q[3], q[4]); }); }
  function saddle(c, x, y, w, noStirrup) { // blanket with trim, seat with horn and cantle, stirrup
    R(c, x, y, w, 5, P.red); R(c, x, y + 4, w, 1, P.yellow); R(c, x, y, w, 1, P.plum);
    R(c, x + 1, y - 2, w - 2, 2, P.bark); px(c, x + 1, y - 3, P.bark); px(c, x + w - 2, y - 3, P.bark); R(c, x + 2, y - 2, w - 4, 1, P.wood);
    if (noStirrup) return;
    var sx = x + Math.floor(w / 2); R(c, sx, y + 5, 1, 3, P.slate); R(c, sx - 1, y + 8, 3, 1, P.silver);
  }
  A.GEAR = { saddle: 'Saddle', collar: 'Collar', backpack: 'Backpack', none: 'Nothing' };
  A.gearOf = function (buddy, pref) { if (A.NOGEAR[buddy]) return 'none'; return A.GEAR[pref] ? pref : buddy === 'horse' ? 'saddle' : 'collar'; };
  function pack(c, x, y, w) { R(c, x - 1, y - 1, w + 2, 8, P.ink); R(c, x, y, w, 6, P.green); R(c, x, y, w, 2, P.lime); R(c, x + 1, y + 3, w - 2, 2, P.teal); px(c, x + Math.floor(w / 2), y + 2, P.yellow); R(c, x + 1, y + 6, 1, 3, P.bark); R(c, x + w - 2, y + 6, 1, 3, P.bark); }
  function wear(c, g, bk, nk) { // bk = [x, y, w] on the back; nk = [x, y, h] around the neck
    if (g === 'none') return;
    if (g === 'collar') { R(c, nk[0], nk[1], 2, nk[2], P.red); R(c, nk[0] - 1, nk[1] + nk[2], 2, 2, P.yellow); px(c, nk[0] - 1, nk[1] + nk[2] + 1, P.orange); }
    else if (g === 'backpack') pack(c, bk[0] + 1, bk[1] - 3, Math.max(5, bk[2] - 2));
    else if (g === 'saddle') saddle(c, bk[0], bk[1], bk[2]);
  }
  function bang(c, x, y) { R(c, x, y, 2, 4, P.yellow); R(c, x, y + 5, 2, 1, P.yellow); } // a little "!": tap me
  function horse(c, bx, fy, f, rocker, sleepy, g) {
    var body = rocker ? P.white : P.wood, mane = rocker ? P.red : P.bark, lift = rocker ? Math.round(Math.sin(f * 0.5)) : 0;
    var hy = !rocker && !sleepy && f % 90 > 70 ? 5 : 0, swish = f % 24 < 12 ? 0 : 1, by = fy - (rocker ? 4 : 0) + lift, parts = [];
    if (rocker) parts.push([bx + 5, by - 6, 2, 4, body], [bx + 19, by - 6, 2, 4, body]);
    else [6, 9, 17, 20].forEach(function (lx) { parts.push([bx + lx, by - 8, 2, 7, body]); });
    parts.push([bx + 4, by - 15, 19, 8, body], [bx + 3, by - 20 + hy, 5, 7, body], [bx - 2, by - 22 + hy, 8, 4, body], [bx + 23, by - 14 + swish, 2, 7 - swish, mane]);
    parts2(c, parts);
    if (!rocker) [6, 9, 17, 20].forEach(function (lx) { R(c, bx + lx, by - 2, 2, 1, P.bark); });
    R(c, bx - 2, by - 20 + hy, 2, 2, rocker ? P.pink : P.sand); px(c, bx - 2, by - 20 + hy, P.ink);
    px(c, bx + 4, by - 24 + hy, P.ink); px(c, bx + 4, by - 23 + hy, body); px(c, bx + 5, by - 23 + hy, P.ink);
    if (sleepy || f % 40 === 0) R(c, bx + 1, by - 21 + hy, 2, 1, P.ink); else px(c, bx + 1, by - 21 + hy, P.ink);
    R(c, bx + 7, by - 22 + hy, 2, 9, mane); px(c, bx + 6, by - 22 + hy, mane);
    wear(c, g, [bx + 10, by - 16, 9], [bx + 4, by - 18 + hy, 4]);
    var head = { x: bx + 2, y: by - 22 + hy };
    if (rocker) for (var i = -1; i < 28; i++) { var yy = Math.round(Math.pow((i - 12.5) / 13.5, 2) * 3); R(c, bx + i, fy - 3 - yy + lift, 1, 2, P.red); px(c, bx + i, fy - 1 - yy + lift, P.ink); }
    else if (!sleepy && f % 60 < 6) bang(c, bx + 2, by - 32 + hy);
    return head;
  }
  function dog(c, bx, fy, f, sleepy, g) {
    var body = P.sand, ear = P.wood, wag = f % 6 < 3 ? 0 : 1, by = fy + 1, parts = [];
    if (sleepy) { parts2(c, [[bx + 4, by - 6, 15, 5, body], [bx - 1, by - 8, 7, 6, body]]); R(c, bx + 1, by - 9, 3, 6, ear); R(c, bx + 1, by - 5, 2, 1, P.ink); wear(c, g, [bx + 8, by - 9, 7], [bx + 5, by - 8, 4]); return { x: bx + 2, y: by - 8 }; }
    [5, 8, 15, 18].forEach(function (lx) { parts.push([bx + lx, by - 6, 2, 5, body]); });
    parts.push([bx + 4, by - 12, 16, 6, body], [bx - 1, by - 18, 8, 7, body], [bx - 3, by - 14, 3, 3, body], [bx + 20, by - 16 + wag, 2, 5, body]);
    parts2(c, parts);
    R(c, bx + 3, by - 18, 3, 7, ear); px(c, bx - 3, by - 14, P.ink); px(c, bx + 1, by - 16, P.ink); // ear, nose, eye
    if (f % 30 < 10) { R(c, bx - 2, by - 11, 2, 2, P.pink); } // tongue out
    wear(c, g, [bx + 9, by - 14, 7], [bx + 6, by - 15, 5]);
    if (f % 60 < 6) bang(c, bx + 1, by - 27);
    return { x: bx + 3, y: by - 18 };
  }
  function cat(c, bx, fy, f, sleepy, g) {
    var body = P.orange, dark = P.red, tw = Math.round(Math.sin(f * 0.25)), by = fy + 1, parts = [];
    if (sleepy) { parts2(c, [[bx + 2, by - 6, 16, 5, body], [bx - 1, by - 9, 7, 6, body]]); px(c, bx, by - 10, body); px(c, bx + 4, by - 10, body); R(c, bx + 1, by - 6, 2, 1, P.ink); R(c, bx + 17, by - 3, 4, 2, body); wear(c, g, [bx + 7, by - 9, 7], [bx + 5, by - 8, 4]); return { x: bx + 2, y: by - 9 }; }
    [5, 8, 14, 17].forEach(function (lx) { parts.push([bx + lx, by - 5, 2, 4, body]); });
    parts.push([bx + 4, by - 10, 15, 5, body], [bx - 1, by - 16, 8, 7, body], [bx + 19, by - 19 + tw, 2, 11, body]);
    parts2(c, parts);
    [[bx - 1, by - 18], [bx + 5, by - 18]].forEach(function (e0) { R(c, e0[0] - 1, e0[1] - 1, 3, 3, P.ink); R(c, e0[0], e0[1], 1, 2, body); px(c, e0[0], e0[1] + 1, P.pink); }); // ears
    R(c, bx + 7, by - 10, 2, 5, dark); R(c, bx + 12, by - 10, 2, 5, dark); R(c, bx + 19, by - 16 + tw, 2, 2, dark); // stripes
    if (f % 50 < 2) { R(c, bx, by - 13, 2, 1, P.ink); R(c, bx + 4, by - 13, 2, 1, P.ink); } else { px(c, bx + 1, by - 13, P.ink); px(c, bx + 4, by - 13, P.ink); }
    px(c, bx + 2, by - 11, P.pink);
    wear(c, g, [bx + 9, by - 13, 7], [bx + 6, by - 14, 5]);
    if (f % 60 < 6) bang(c, bx + 2, by - 25);
    return { x: bx + 2, y: by - 16 };
  }
  function ghostBuddy(c, bx, fy, f, sleepy, g) {
    var bob = Math.round(Math.sin(f * 0.3) * 2), cx = bx + 9, top = fy - 23 + bob, i;
    R(c, cx - 5, fy, 11, 1, P.dark); // shadow
    disc(c, cx, top + 8, 9, P.ink); R(c, cx - 9, top + 8, 19, 10, P.ink);
    disc(c, cx, top + 8, 8, P.white); R(c, cx - 8, top + 8, 17, 9, P.white);
    for (i = 0; i < 17; i++) { var wv = (i + Math.floor(f / 3)) % 6; R(c, cx - 8 + i, top + 17, 1, wv < 3 ? 2 : 1, P.white); px(c, cx - 8 + i, top + (wv < 3 ? 19 : 18), P.ink); }
    R(c, cx + 5, top + 6, 2, 10, P.silver);
    if (sleepy) { R(c, cx - 5, top + 8, 3, 1, P.ink); R(c, cx + 1, top + 8, 3, 1, P.ink); }
    else { R(c, cx - 5, top + 6, 2, 3, P.ink); R(c, cx + 1, top + 6, 2, 3, P.ink); R(c, cx - 2, top + 11, 3, 2, P.ink); px(c, cx - 7, top + 10, P.pink); px(c, cx + 4, top + 10, P.pink); }
    if (g === 'saddle') saddle(c, cx - 4, top - 1, 8, true); else wear(c, g, [cx - 4, top - 1, 8], [cx - 9, top + 12, 0]);
    if (g === 'collar') { R(c, cx - 8, top + 13, 17, 2, P.red); R(c, cx - 1, top + 15, 2, 2, P.yellow); }
    if (!sleepy && f % 60 < 6) bang(c, cx - 11, top - 6);
    return { x: cx, y: top - (g === 'saddle' || g === 'backpack' ? 3 : 0) };
  }
  function conjure(c, bx, fy, f, sleepy, g) { // a little star sprite, called up out of its summoning circle, with runes circling it
    var cx = bx + 11, glow = f % 8 < 4 ? P.cyan : P.sky, bob = Math.round(Math.sin(f * 0.35) * 2), i;
    ell(c, cx, fy, 13, 3, P.plum); ell(c, cx, fy, 11, 2, glow); ell(c, cx, fy, 9, 1, P.plum); // the circle
    for (var r = 0; r < 6; r++) { var a = (r / 6) * Math.PI * 2 + f * 0.08; px(c, cx + Math.round(Math.cos(a) * 12), fy + Math.round(Math.sin(a) * 2.5), P.yellow); }
    for (i = 0; i < 3; i++) R(c, cx - 1 + i, fy - 3 - ((f + i * 2) % 5), 1, 1, glow); // light rising from the circle
    var cy = fy - 15 + bob, s0 = sleepy ? 5 : 7, t = sleepy ? 0 : (f % 12 < 6 ? 0 : 1);
    // four-pointed star: outline, then body
    for (i = -s0 - 1; i <= s0 + 1; i++) { var w = Math.max(0, Math.round((s0 + 1 - Math.abs(i)) * 0.45)); R(c, cx - w - 1, cy + i, 2 * w + 3, 1, P.ink); R(c, cx + i, cy - w - 1, 1, 2 * w + 3, P.ink); }
    for (i = -s0; i <= s0; i++) { var w2 = Math.max(0, Math.round((s0 - Math.abs(i)) * 0.45)); R(c, cx - w2, cy + i, 2 * w2 + 1, 1, P.yellow); R(c, cx + i, cy - w2, 1, 2 * w2 + 1, P.yellow); }
    disc(c, cx, cy, 3, P.yellow); R(c, cx - 2, cy - 2, 2, 1, P.white); px(c, cx + s0 - 1 + t, cy, P.white); px(c, cx - s0 + 1 - t, cy, P.white);
    if (sleepy) { R(c, cx - 2, cy, 2, 1, P.bark); R(c, cx + 1, cy, 2, 1, P.bark); }
    else { R(c, cx - 2, cy - 1, 1, 2, P.ink); R(c, cx + 2, cy - 1, 1, 2, P.ink); px(c, cx, cy + 2, P.orange); }
    if (!sleepy) for (i = 0; i < 3; i++) { var ang = f * 0.18 + i * 2.09, rx = Math.round(Math.cos(ang) * 11), ry = Math.round(Math.sin(ang) * 4); var rc = Math.sin(ang) > 0 ? P.plum : P.pink; R(c, cx + rx - 1, cy + ry - 1, 3, 3, P.ink); px(c, cx + rx, cy + ry, rc); px(c, cx + rx - 1, cy + ry, rc); px(c, cx + rx, cy + ry - 1, rc); } // runes
    if (g === 'saddle') saddle(c, cx - 3, cy - s0 - 1, 7, true);
    else if (g === 'backpack') pack(c, cx + 3, cy - 3, 5);
    else if (g === 'collar') { R(c, cx - 3, cy + 4, 7, 1, P.red); R(c, cx - 1, cy + 5, 2, 2, P.yellow); }
    if (!sleepy && f % 60 < 6) bang(c, cx + 9, cy - 14);
    return { x: cx, y: cy - s0 - (g === 'saddle' ? 3 : 1) };
  }
  // 2.1.7: new buddies. Unmirrored they face left (drawBuddy mirrors them to face Aiu). Each returns its head {x, y}.
  var PERCH = 16; // how high the post holds a bird
  function post(c, bx, fy) { var px0 = bx + 10; R(c, px0 - 1, fy - PERCH, 5, PERCH + 1, P.ink); R(c, px0, fy - PERCH + 1, 3, PERCH, P.wood); R(c, px0, fy - PERCH + 1, 1, PERCH, P.sand); R(c, px0 - 3, fy - PERCH - 1, 9, 3, P.ink); R(c, px0 - 2, fy - PERCH, 7, 1, P.bark); R(c, px0 - 2, fy, 7, 1, P.dark); }
  function eagle(c, bx, fy, f, sleepy) {
    var py = fy - PERCH - 1, flap = !sleepy && f % 80 > 70, bob = f % 16 < 8 ? 0 : 1, cx = bx + 11, i;
    for (i = 0; i < 4; i++) R(c, cx - 1 + i, py - 1 + i, 2, 3, i % 2 ? P.silver : P.white); // white tail fanning down behind the post
    ell(c, cx, py - 8 + bob, 6, 8, P.ink); ell(c, cx, py - 8 + bob, 5, 7, P.bark); // body
    ell(c, cx + 2, py - 7 + bob, 4, 6, P.wood); for (i = 0; i < 4; i++) R(c, cx - 1 + i, py - 3 + bob + i, 4, 1, P.bark); // folded wing with feather edges
    if (flap) { ell(c, cx + 6, py - 14, 7, 3, P.ink); ell(c, cx + 6, py - 14, 6, 2, P.bark); for (i = 0; i < 4; i++) px(c, cx + 2 + i * 3, py - 12, P.wood); }
    disc(c, cx - 5, py - 17 + bob, 5, P.ink); disc(c, cx - 5, py - 17 + bob, 4, P.white); // white head
    R(c, cx - 11, py - 18 + bob, 3, 2, P.yellow); px(c, cx - 11, py - 16 + bob, P.yellow); R(c, cx - 10, py - 19 + bob, 2, 1, P.ink); // hooked beak
    if (sleepy) R(c, cx - 7, py - 18 + bob, 2, 1, P.ink); else { px(c, cx - 7, py - 18 + bob, P.ink); R(c, cx - 8, py - 20 + bob, 3, 1, P.silver); } // eye, brow
    R(c, cx - 3, py - 1, 2, 2, P.yellow); R(c, cx + 1, py - 1, 2, 2, P.yellow); // talons on the perch
    if (!sleepy && f % 60 < 6) bang(c, cx - 7, py - 30);
    return { x: cx - 8, y: py - 22 + bob };
  }
  function parrot(c, bx, fy, f, sleepy) {
    var py = fy - PERCH - 1, tilt = !sleepy && f % 40 > 30 ? 1 : 0, cx = bx + 11, i;
    for (i = 0; i < 9; i++) { R(c, cx + 1 + Math.floor(i / 3), py - 2 + i, 3, 1, P.ink); R(c, cx + 2 + Math.floor(i / 3), py - 2 + i, 1, 1, i < 5 ? P.blue : P.red); } // long tail
    ell(c, cx, py - 7, 5, 7, P.ink); ell(c, cx, py - 7, 4, 6, P.red); // body
    ell(c, cx + 2, py - 6, 3, 4, P.yellow); R(c, cx + 1, py - 4, 4, 3, P.blue); // wing: yellow over blue
    disc(c, cx - 3, py - 15 + tilt, 4, P.ink); disc(c, cx - 3, py - 15 + tilt, 3, P.red); // head
    R(c, cx - 4, py - 17 + tilt, 3, 3, P.white); if (sleepy) R(c, cx - 4, py - 16 + tilt, 2, 1, P.ink); else px(c, cx - 4, py - 16 + tilt, P.ink); // eye patch
    R(c, cx - 9, py - 16 + tilt, 3, 3, P.silver); px(c, cx - 9, py - 13 + tilt, P.silver); R(c, cx - 7, py - 14 + tilt, 1, 2, P.ink); // curved beak
    R(c, cx - 2, py - 1, 2, 2, P.slate); R(c, cx + 1, py - 1, 2, 2, P.slate);
    if (!sleepy && f % 60 < 6) bang(c, cx - 5, py - 27);
    return { x: cx - 7, y: py - 19 + tilt };
  }
  function penguin(c, bx, fy, f, sleepy) {
    var w = sleepy ? 0 : (Math.floor(f / 3) % 2 ? 1 : -1), cx = bx + 11 + w, flip = !sleepy && f % 50 > 42;
    ell(c, cx, fy - 9, 6, 9, P.ink); ell(c, cx, fy - 9, 5, 8, P.dark); // body
    ell(c, cx - 1, fy - 6, 3, 5, P.white); disc(c, cx - 2, fy - 14, 2, P.white); // belly and face
    R(c, cx - 8, fy - 14, 3, 2, P.orange); px(c, cx - 8, fy - 14, P.yellow); // beak
    if (sleepy) R(c, cx - 3, fy - 15, 2, 1, P.ink); else px(c, cx - 3, fy - 15, P.ink);
    R(c, cx + 4, fy - 11 - (flip ? 3 : 0), 3, flip ? 4 : 7, P.ink); px(c, cx + 5, fy - 10 - (flip ? 3 : 0), P.dark); // flipper
    R(c, cx - 4, fy - 1, 3, 2, P.orange); R(c, cx + 1, fy - 1, 3, 2, P.orange); // feet
    if (!sleepy && f % 60 < 6) bang(c, cx - 3, fy - 27);
    return { x: cx - 3, y: fy - 18 };
  }
  function bearDog(c, bx, fy, f, sleepy, g) { // a bear with a long, waggy dog tail
    var body = P.wood, dark = P.bark, by = fy + 1, wag = Math.round(Math.sin(f * 0.9) * 2), parts = [];
    if (sleepy) {
      parts2(c, [[bx + 3, by - 9, 18, 8, body], [bx - 2, by - 11, 9, 8, body], [bx + 21, by - 4, 9, 2, body]]);
      R(c, bx - 1, by - 13, 3, 3, dark); R(c, bx + 4, by - 13, 3, 3, dark); R(c, bx - 2, by - 6, 4, 3, P.sand); R(c, bx + 1, by - 8, 2, 1, P.ink);
      wear(c, g, [bx + 9, by - 10, 7], [bx + 6, by - 10, 5]); return { x: bx + 2, y: by - 11 };
    }
    [4, 8, 15, 19].forEach(function (lx) { parts.push([bx + lx, by - 6, 3, 5, body]); });
    parts.push([bx + 3, by - 15, 19, 10, body], [bx - 3, by - 21, 10, 9, body]);
    for (var i = 0; i < 6; i++) parts.push([bx + 22 + i, by - 14 - Math.round(i * 0.9) + (i > 2 ? wag : 0), 2, 3, body]); // the long dog tail, curling up
    parts2(c, parts);
    px(c, bx + 28, by - 20 + wag, P.sand); px(c, bx + 27, by - 19 + wag, P.sand); // tail tip
    R(c, bx - 2, by - 24, 3, 3, P.ink); R(c, bx - 1, by - 23, 2, 2, dark); R(c, bx + 4, by - 24, 3, 3, P.ink); R(c, bx + 5, by - 23, 2, 2, dark); // round bear ears
    R(c, bx - 5, by - 16, 5, 4, P.sand); R(c, bx - 5, by - 16, 2, 2, P.ink); // snout and nose
    if (f % 44 < 2) R(c, bx + 1, by - 18, 2, 1, P.ink); else { px(c, bx + 1, by - 18, P.ink); px(c, bx + 2, by - 19, P.white); }
    if (f % 36 < 12) R(c, bx - 3, by - 12, 2, 3, P.pink); // tongue out, like a dog
    R(c, bx + 10, by - 12, 7, 4, P.sand); // light belly patch
    wear(c, g, [bx + 10, by - 17, 8], [bx + 6, by - 18, 6]);
    if (f % 60 < 6) bang(c, bx, by - 31);
    return { x: bx + 1, y: by - 22 };
  }
  // indoors the pet stays outside; the hub is the computer on the desk
  var PCX = -94; // 2.1.5: the desk sits on the left, under the window (it was at x 110)
  function computer(c, f) {
    c.save(); c.translate(PCX, 0);
    R(c, 110, 86, 23, 2, P.bark); R(c, 111, 88, 2, 10, P.bark); R(c, 130, 88, 2, 10, P.bark); R(c, 110, 86, 23, 1, P.wood); // desk
    R(c, 113, 70, 17, 14, P.ink); R(c, 114, 71, 15, 12, P.silver); R(c, 115, 72, 13, 9, P.navy); // monitor
    R(c, 120, 84, 3, 2, P.slate); R(c, 114, 85, 13, 1, P.silver); R(c, 127, 85, 2, 1, P.white); // stand, keyboard, mouse
    var k0 = Math.floor(f / 12) % 3, sx = 119, sy = 74; // the screen cycles the games
    if (k0 === 0) { disc(c, sx + 2, sy + 3, 2, P.pink); R(c, sx - 2, sy + 1, 1, 4, P.white); }
    else if (k0 === 1) { line(c, sx, sy + 5, sx + 4, sy + 1, P.silver); px(c, sx + 1, sy + 3, P.yellow); px(c, sx + 2, sy + 4, P.yellow); px(c, sx - 2, sy + 1, P.lime); px(c, sx + 6, sy + 2, P.red); }
    else { R(c, sx, sy + 1, 4, 4, P.red); R(c, sx + 4, sy + 2, 1, 2, P.red); R(c, sx, sy + 4, 4, 1, P.white); }
    if (f % 8 < 4) R(c, 125, 79, 2, 1, P.lime);
    R(c, 128, 82, 1, 1, f % 16 < 8 ? P.green : P.dark);
    c.restore();
  }
  A.hubRect = function (sc) {
    if (!sc || (sc.place && sc.place !== 'home') || !sc.stage) return null;
    if (sc.indoor) return { x: 107 + PCX, y: 66, w: 29, h: 33 };
    var h0 = A.BUDDY_OUT, tall = A.POSTED[A.buddyOf(sc.soul, sc.buddy)] ? 12 : 0; return { x: h0.x - 6, y: h0.fy - 36 - tall, w: 36, h: 40 + tall };
  };
  // Light (a halo) or Shadow (little horns): how the week went. Balanced shows nothing.
  function alignMark(c, hd, al, f) {
    if (!hd) return;
    if (al === 'light') { var y = hd.y - 6 + (f % 16 < 8 ? 0 : -1); R(c, hd.x - 3, y - 1, 7, 1, P.yellow); px(c, hd.x - 4, y, P.yellow); px(c, hd.x + 4, y, P.yellow); R(c, hd.x - 3, y + 1, 7, 1, P.orange); px(c, hd.x - 4, y - 1, P.white); }
    else if (al === 'shadow') [-3, 3].forEach(function (d0) { R(c, hd.x + d0 - 1, hd.y - 4, 3, 4, P.ink); R(c, hd.x + d0, hd.y - 3, 1, 3, P.plum); px(c, hd.x + d0 + (d0 < 0 ? -1 : 1), hd.y - 4, P.ink); px(c, hd.x + d0, hd.y - 4, P.red); });
  }
  A.drawBuddyAt = function (c, b, g, x, fy, f, sleepy, al, noPost) {
    if (A.NOGEAR[b]) g = 'none'; // 2.1.7: spirits and birds never show gear
    if (A.POSTED[b] && !noPost) post(c, x, fy);
    var hd = b === 'horse' ? horse(c, x, fy, f, false, sleepy, g) : b === 'dog' ? dog(c, x, fy, f, sleepy, g) : b === 'cat' ? cat(c, x, fy, f, sleepy, g) : b === 'ghost' ? ghostBuddy(c, x, fy, f, false, g)
      : b === 'eagle' ? eagle(c, x, fy, f, sleepy) : b === 'parrot' ? parrot(c, x, fy, f, sleepy) : b === 'penguin' ? penguin(c, x, fy, f, sleepy) : b === 'beardog' ? bearDog(c, x, fy, f, sleepy, g) : conjure(c, x, fy, f, sleepy, g);
    alignMark(c, hd, al, f); return hd;
  };
  A.buddyHead = null; // 2.1.7: where the pet's head is in the world (for treats and hearts)
  function drawBuddy(c, sc) {
    if (!sc.stage || (sc.place && sc.place !== 'home')) return;
    if (sc.indoor) return computer(c, sc.f);
    var b = A.buddyOf(sc.soul, sc.buddy), mx = A.BUDDY_OUT.x + 11, bp = sc.bplay || null, a0 = bp && bp.a, t = bp ? bp.p : 0, ms = bp ? bp.e : 0; // 2.1.5: mirrored, so the pet faces Aiu
    var bx = A.BUDDY_OUT.x, fy = A.BUDDY_OUT.fy, f = sc.f, dy = 0, dx = 0, mirror = true, belly = false, sleepy = sc.phase === 'night';
    if (a0) {
      sleepy = a0 === 'nap';
      if (a0 === 'munch') dy = Math.floor(ms / 110) % 2;
      else if (a0 === 'drink') dy = Math.floor(ms / 220) % 2;
      else if (a0 === 'happy') dy = -Math.round(Math.sin(t * Math.PI) * 4);
      else if (a0 === 'jump') dy = -Math.round(Math.sin(t * Math.PI) * 12);
      else if (a0 === 'spin') { mirror = Math.floor(t * 6) % 2 === 0; dy = -Math.round(Math.sin(t * Math.PI) * 3); }
      else if (a0 === 'dance') { dx = [-2, 0, 2, 0][Math.floor(ms / 140) % 4]; dy = Math.floor(ms / 140) % 2 ? -2 : 0; }
      else if (a0 === 'purr') dx = Math.floor(ms / 80) % 2 ? 1 : 0;
      else if (a0 === 'roll') { if (A.POSTED[b]) dy = -Math.round(Math.sin(t * Math.PI * 2) * 5); else if (t > 0.2 && t < 0.8) belly = true; else sleepy = true; }
      f = a0 === 'munch' || a0 === 'drink' ? 7 : f; // no "!" while eating
    }
    if (A.POSTED[b]) { c.save(); c.translate(mx * 2, 0); c.scale(-1, 1); post(c, bx, fy); c.restore(); }
    c.save();
    if (mirror) { c.translate(mx * 2 + dx, dy); c.scale(-1, 1); } else c.translate(dx, dy); // spin: a quick look the other way
    if (belly) { var cy = fy - 6; c.translate(0, cy * 2); c.scale(1, -1); }
    var hd = A.drawBuddyAt(c, b, A.gearOf(b, sc.gear), bx, fy, f, sleepy, belly ? null : sc.align, true);
    c.restore();
    if (hd) A.buddyHead = { x: mirror ? mx * 2 - hd.x + dx : hd.x + dx, y: hd.y + dy, mx: mx };
    var cp = sc.cos && sc.cos.pet; // 2.5.0: the pet's look from the Corner Mart (ghosts and the like can't wear one)
    if (cp && A.buddyHead && !(A.NOGEAR && A.NOGEAR[b]) && !belly) { var pi = cp.img, hx0 = A.buddyHead.x, hy0 = A.buddyHead.y; c.drawImage(pi, Math.round(hx0 - pi.width / 2), cp.at === 'neck' ? Math.round(hy0 + 3) : Math.round(hy0 - pi.height - 2)); }
    if (a0 === 'nap') { var zs = Math.floor(ms / 120) % 12; spr(c, (A.buddyHead ? A.buddyHead.x : mx) + 4 + Math.floor(zs / 4), fy - 22 - zs, ZZZ); }
  }

  // Things Aiu made earlier today stay in the yard until bedtime (his creations)
  A.MADE = ['paint', 'garden', 'build', 'sandcastle', 'snowman', 'fishing', 'pottery', 'knit', 'cook'];
  function drawMade(c, sc) {
    var m = sc.made || {}, act = sc.act;
    if (sc.indoor) {
      if (m.paint) { R(c, 146, 16, 16, 12, P.bark); R(c, 147, 17, 14, 10, P.white); var r = U.rng(m.paint); for (var i = 0; i < 26; i++) px(c, 148 + Math.floor(r() * 12), 18 + Math.floor(r() * 8), U.pick(r, [P.red, P.blue, P.green, P.yellow, P.sky, P.pink])); }
      if (m.pottery) { R(c, 172, 74, 6, 6, P.orange); R(c, 173, 72, 4, 2, P.orange); px(c, 174, 76, P.wood); }
      if (m.knit) { R(c, 178, 77, 8, 3, sc.accent || P.red); R(c, 178, 78, 8, 1, P.pink); }
      return;
    }
    if (m.garden && act !== 'garden') for (var g = 0; g < 4; g++) { var gx = 68 + g * 4; R(c, gx, 92, 1, 3, P.green); spr(c, gx - 1, 89, g % 2 ? ['.y.', 'yry', '.y.'] : ['.P.', 'PyP', '.P.']); }
    if (m.paint && act !== 'paint') { c.save(); c.translate(64, 0); line(c, 86, 97, 89, 86, P.bark); line(c, 94, 97, 91, 86, P.bark); R(c, 85, 85, 11, 8, P.white); R(c, 85, 93, 11, 1, P.bark); var rr = U.rng(m.paint); for (var k = 0; k < 18; k++) px(c, 86 + Math.floor(rr() * 9), 86 + Math.floor(rr() * 6), U.pick(rr, [P.red, P.blue, P.green, P.yellow, P.sky, P.pink])); c.restore(); }
    if (m.build && act !== 'build') { R(c, 178, 84, 1, 12, P.bark); R(c, 175, 79, 7, 6, P.wood); tri(c, 178, 75, 4, 1.0, P.red); disc(c, 178, 81, 1, P.ink); }
    if (m.sandcastle && act !== 'sandcastle') sandcastle(c, 172, 100, 5);
    if (m.snowman && act !== 'snowman') snowman(c, 182, 100, 5, sc.accent);
    if (m.fishing && act !== 'fishing') { R(c, 162, 94, 7, 6, P.silver); R(c, 162, 94, 7, 1, P.slate); spr(c, 164, 91, ['s.s', '.s.']); }
  }
  function buddyBowl(c, fy, water) { var bx = A.BUDDY_OUT.x + 28; R(c, bx - 1, fy - 3, 10, 4, P.ink); R(c, bx, fy - 3, 8, 3, P.red); R(c, bx + 1, fy - 3, 6, 1, water ? P.sky : P.bark); return bx; }
  function bone(c, x, y) { R(c, x, y, 6, 2, P.white); R(c, x - 1, y - 1, 2, 2, P.white); R(c, x - 1, y + 1, 2, 2, P.white); R(c, x + 5, y - 1, 2, 2, P.white); R(c, x + 5, y + 1, 2, 2, P.white); }
  var NEAR = function (f) { return { dx: A.BUDDY_OUT.x + 50 - A.AIU_OUT, flip: true, dy: f % 4 < 2 ? 0 : -1 }; }; // next to the pet, facing it
  function slotP(sc) { return ((sc.tsec || 0) % 1200) / 1200; } // how far into this 20-minute visit (0..1)
  function buildStage(sc) { return Math.min(5, Math.floor(slotP(sc) * 7)); } // 0..5 over ~14 minutes, then it's done
  A.ACT_DRAW = {
    // 2.1.10: just hatched: the two halves of the shell on the ground, and a little one looking left and right
    newborn: { pose: function (f) { var k = Math.floor(f / 12) % 4; return { dx: 0, dy: f % 24 < 3 ? -2 : 0, flip: k === 1 || k === 2, eyes: f % 40 < 3 ? 'blink' : k === 3 ? 'happy' : 'open' }; },
      back: function (c, x, fy) { [[-15, 1], [11, -1]].forEach(function (q) { var sx = x + q[0]; R(c, sx, fy - 4, 6, 4, P.ink); R(c, sx + 1, fy - 4, 4, 3, P.white); for (var i = 0; i < 3; i++) px(c, sx + 1 + i * 2, fy - 5 + (i % 2), P.white); px(c, sx + 2, fy - 3, P.sand); }); } },
    petbuddy: { pose: function (f) { var p0 = NEAR(f); p0.eyes = f % 10 < 6 ? 'happy' : 'open'; p0.dx -= (f % 8 < 4 ? 2 : 0); return p0; },
      front: function (c, x, fy, f) { if (f % 12 < 8) { var hy = fy - 34 - (f % 12); spr(c, A.BUDDY_OUT.x + 14, hy, ['.r.r.', 'rrrrr', '.rrr.', '..r..']); } } },
    feedbuddy: { pose: function (f) { var p0 = NEAR(f); p0.eyes = 'happy'; return p0; },
      back: function (c, x, fy, f) { var bx = buddyBowl(c, fy, false), t = f % 30; if (t < 12) { var k = t / 12; bone(c, Math.round(x - 10 + (bx + 2 - (x - 10)) * k), Math.round(fy - 14 - Math.sin(k * Math.PI) * 12 + k * 11)); } else bone(c, bx + 1, fy - 5); } },
    waterbuddy: { pose: function (f) { var p0 = NEAR(f); p0.eyes = f % 10 < 5 ? 'happy' : 'open'; return p0; },
      back: function (c, x, fy, f) { var bx = buddyBowl(c, fy, true); for (var i = 0; i < 2; i++) { var t = (f + i * 6) % 12, dy0 = fy - 22 + t * 1.6; R(c, bx + 3 + i * 2, dy0, 2, 3, P.sky); px(c, bx + 3 + i * 2, dy0 - 1, P.cyan); } if (f % 12 > 9) { px(c, bx + 1, fy - 5, P.cyan); px(c, bx + 6, fy - 5, P.cyan); } } },
    board: { pose: function (f, sc) { return { dx: sc && sc.indoor ? 22 : A.BOARD_OUT.x + 30 - A.AIU_OUT, flip: true, dy: f % 6 < 3 ? 0 : -1, eyes: f % 10 < 5 ? 'open' : 'happy' }; } }, // 2.1.11: he walks to the board
    // 2.2.0: Aiu passes your calm thing on to the pet (a few seconds each): gut = a snack, water = its bowl, heart = a hug,
    // arms & legs = a brushing, brain = a story, rest = a blanket and a nap
    care_feed: { pose: function (f) { var p0 = NEAR(f); p0.eyes = 'happy'; return p0; },
      back: function (c, x, fy, f) { var bx = buddyBowl(c, fy, false), t = f % 10; if (t < 6) { var k = t / 6; bone(c, Math.round(x - 10 + (bx + 2 - (x - 10)) * k), Math.round(fy - 14 - Math.sin(k * Math.PI) * 12 + k * 11)); } else bone(c, bx + 1, fy - 5); } },
    care_water: { pose: function (f) { var p0 = NEAR(f); p0.eyes = f % 10 < 5 ? 'happy' : 'open'; return p0; },
      back: function (c, x, fy, f) { var bx = buddyBowl(c, fy, true); for (var i = 0; i < 3; i++) { var t = (f + i * 4) % 10, dy0 = fy - 20 + t * 1.8; R(c, bx + 2 + i * 2, dy0, 1, 3, P.sky); px(c, bx + 2 + i * 2, dy0 - 1, P.cyan); } } },
    care_hug: { pose: function (f) { var p0 = NEAR(f); p0.dx -= 6; p0.eyes = 'happy'; p0.dy = f % 6 < 3 ? 0 : -1; return p0; },
      front: function (c, x, fy, f) { var hx = (A.buddyHead ? A.buddyHead.x : A.BUDDY_OUT.x + 20) + 6; for (var i = 0; i < 2; i++) { var t = (f + i * 5) % 10; spr(c, hx - 4 + i * 6, fy - 30 - t * 2, ['r.r', 'rrr', '.r.']); } } },
    care_brush: { pose: function (f) { var p0 = NEAR(f); p0.dx -= 3 + (f % 6 < 3 ? 2 : 0); return p0; },
      front: function (c, x, fy, f) { var hd = A.buddyHead || { x: A.BUDDY_OUT.x + 20, y: fy - 20 }, bx = hd.x + 6 + Math.round(Math.sin(f * 0.9) * 6), by = hd.y + 6; R(c, bx - 1, by - 1, 8, 3, P.ink); R(c, bx, by, 6, 1, P.wood); for (var i = 0; i < 6; i += 2) px(c, bx + i, by + 1, P.sand); if (f % 4 < 2) { px(c, bx + 8, by - 3, P.white); px(c, bx - 3, by - 2, P.yellow); } } },
    care_read: { pose: function (f) { var p0 = NEAR(f); p0.eyes = f % 16 < 2 ? 'blink' : 'open'; return p0; },
      front: function (c, x, fy, f, cw, ch) { spr(c, x - 4, fy - Math.round(ch * 0.45), BOOK); var t = f % 12; spr(c, x - 10 - t, fy - ch - 4 - Math.floor(t / 2), NOTE); } },
    care_tuck: { pose: function (f) { var p0 = NEAR(f); p0.eyes = 'happy'; return p0; },
      back: function (c, x, fy, f, cw, ch, sc) { var bx = A.BUDDY_OUT.x + 2, w = 30; R(c, bx - 1, fy - 12, w + 2, 10, P.ink); R(c, bx, fy - 11, w, 8, sc.accent || P.red); for (var i = 0; i < w; i += 4) px(c, bx + i, fy - 8, P.white); var zs = f % 12; spr(c, bx + 26 + Math.floor(zs / 4), fy - 26 - zs, ZZZ); } },
    water: { back: function (c, x, fy) { flowerBed(c, x + 12, fy); },
      front: function (c, x, fy, f, cw, ch) { spr(c, x + Math.round(cw / 2) - 3, fy - Math.round(ch * 0.55), CAN); px(c, x + Math.round(cw / 2) + 5, fy - Math.round(ch * 0.55) + 2 + (f % 3) * 2, P.sky); px(c, x + Math.round(cw / 2) + 7, fy - Math.round(ch * 0.55) + 3 + ((f + 1) % 3) * 2, P.sky); } },
    workout: { pose: function (f) { return { dy: f % 4 < 2 ? -2 : 0 }; },
      front: function (c, x, fy, f, cw, ch) { spr(c, x - 4, fy - ch - 1 - (f % 4 < 2 ? 3 : 0), DUMB); } },
    // fishing: always into water. A fishing hole (an ice hole in the snow) where the line lands, a bucket, and now and then a catch.
    fishing: { pose: function (f, sc) { var T = (sc.tsec || 0) % 16; return { dy: 1, eyes: T >= 11.5 ? 'happy' : 'open' }; },
      back: function (c, x, fy, f, cw, ch, sc) {
        var bx = x + Math.round(cw / 2) + 24, by = fy + 2;
        if (sc.pondCast) { if (sc.biome === 'tundra' || sc.season === 'winter') { ell(c, bx, fy - 9, 5, 2, P.white); ell(c, bx, fy - 9, 3, 1, P.navy); } } // 2.5.0: at the real pond (an ice hole on it in winter)
        else if (sc.biome !== 'pond') {
          if (sc.biome === 'tundra' || sc.season === 'winter') { ell(c, bx, by, 10, 3, P.white); ell(c, bx, by, 7, 2, P.navy); ell(c, bx, by, 5, 1, P.blue); }
          else { ell(c, bx, by, 12, 3, sc.biome === 'beach' || sc.biome === 'desert' ? P.wood : P.green); ell(c, bx, by, 10, 3, P.blue); ell(c, bx - 2, by, 6, 1, P.sky); px(c, bx - 11, by - 2, P.green); px(c, bx - 11, by - 3, P.lime); px(c, bx + 11, by - 2, P.green); }
        }
        var lx = x - Math.round(cw / 2) - 9; // the bucket
        R(c, lx, fy - 6, 7, 6, P.silver); R(c, lx, fy - 6, 7, 1, P.slate); R(c, lx + 1, fy - 3, 5, 1, P.slate); line(c, lx, fy - 7, lx + 3, fy - 10, P.slate); line(c, lx + 6, fy - 7, lx + 3, fy - 10, P.slate);
        if ((sc.tsec || 0) % 16 >= 13.5 || Math.floor((sc.tsec || 0) / 16) % 3) { spr(c, lx + 2, fy - 9, ['s.s', '.s.']); }
      },
      front: function (c, x, fy, f, cw, ch, sc) {
        var T = (sc.tsec || 0) % 16, hx = x + Math.round(cw / 2) - 2, hy = fy - Math.round(ch * 0.45), tx = hx + 14, ty = hy - 12;
        if (T >= 11.5) { tx = hx + 8; ty = hy - 16; } // reeling in: rod up
        line(c, hx, hy, tx, ty, P.bark);
        var lift = sc.pondCast ? 10 : 0, bx = x + Math.round(cw / 2) + 24, by = fy + 1 - lift + (f % 6 < 3 ? 0 : 1), endX = bx, endY = by;
        if (T >= 10 && T < 11.5) { by = fy + 3 - lift; px(c, bx - 2, fy + 1 - lift, P.white); px(c, bx + 2, fy + 1 - lift, P.white); px(c, bx, fy - 1 - lift - (f % 2), P.white); } // a bite!
        if (T >= 11.5 && T < 13.5) { // the fish flies to the bucket
          var k = (T - 11.5) / 2, lx = x - Math.round(cw / 2) - 6;
          endX = Math.round(bx + (lx - bx) * k); endY = Math.round(fy - Math.sin(k * Math.PI) * 26);
          spr(c, endX - 2, endY, f % 2 ? ['.ss.s', 'sssss', '.ss.s'] : ['s.ss.', 'sssss', 's.ss.'], k > 0.5);
        }
        for (var i = 0; i <= 12; i += 2) px(c, tx + Math.round((endX - tx) * i / 12), ty + Math.round((endY - ty) * (i / 12) * (i / 12)), P.silver);
        if (T < 11.5) { px(c, bx, by - 1, P.white); px(c, bx, by, P.red); }
      } },
    kite: { pose: function (f) { return { flip: false, eyes: f % 30 < 2 ? 'blink' : 'happy' }; },
      front: function (c, x, fy, f, cw, ch, sc) {
        var t = sc.tsec || 0, hx = x + Math.round(cw / 2) - 1, hy = fy - Math.round(ch * 0.5);
        var kx = Math.round(x + 36 + Math.sin(t * 0.7) * 5), ky = Math.round(fy - 46 + Math.cos(t * 1.1) * 3);
        for (var i = 0; i <= 16; i++) { var q = i / 16; px(c, Math.round(hx + (kx - hx) * q), Math.round(hy + (ky + 5 - hy) * q + Math.sin(q * Math.PI) * 4), P.white); }
        spr(c, kx - 3, ky, ['...r...', '..rrr..', '.rryrr.', 'rrryrrr', '.yyyyy.', 'rrryrrr', '.rryrr.', '..rrr..', '...r...']);
        for (var j = 0; j < 4; j++) px(c, kx + Math.round(Math.sin(t * 4 + j) * 2), ky + 9 + j * 2, j % 2 ? P.yellow : P.sky);
      } },
    bubbles: { pose: function (f) { return { eyes: f % 20 < 3 ? 'blink' : 'happy' }; },
      front: function (c, x, fy, f, cw, ch, sc) {
        var t = sc.tsec || 0, wx = x + Math.round(cw / 2) + 1, wy = fy - Math.round(ch * 0.6);
        line(c, wx - 3, wy + 4, wx, wy, P.wood); spr(c, wx, wy - 3, ['.y.', 'y.y', '.y.']);
        for (var i = 0; i < 5; i++) {
          var q = (t * 0.8 + i * 0.9) % 4.5; if (q > 4.1) continue;
          var bx = Math.round(wx + 3 + q * 7 + Math.sin(q * 3 + i) * 2), by = Math.round(wy - q * 8);
          spr(c, bx, by, i % 2 ? ['.c.', 'c.c', '.c.'] : ['.cc.', 'c..c', 'c..c', '.cc.']); px(c, bx + 1, by + 1, P.white);
        }
      } },
    // 2.1.15: things he builds take the whole 20-minute visit (they used to start over every 18 seconds), and when the
    // birdhouse is done he stops to admire it and a bird moves in
    build: { pose: function (f, sc) { return buildStage(sc) >= 5 ? { dy: 0, eyes: f % 30 < 2 ? 'blink' : 'happy' } : { dy: f % 4 < 2 ? 0 : 1 }; },
      back: function (c, x, fy, f, cw, ch, sc) {
        var bx = x + Math.round(cw / 2) + 8, st0 = buildStage(sc);
        R(c, bx, fy - 9, 20, 2, P.wood); R(c, bx + 1, fy - 7, 2, 7, P.bark); R(c, bx + 17, fy - 7, 2, 7, P.bark); // workbench
        var hx = bx + 6, top = fy - 9;
        if (st0 >= 1) R(c, hx, top - 1, 9, 1, P.bark);
        if (st0 >= 2) R(c, hx + 1, top - 8, 7, 7, P.wood);
        if (st0 >= 3) tri(c, hx + 4, top - 13, 5, 1.0, P.red);
        if (st0 >= 4) { disc(c, hx + 4, top - 5, 1, P.ink); px(c, hx + 4, top - 2, P.bark); }
        if (st0 >= 5) px(c, hx + 4, top - 14, P.yellow);
        if (st0 >= 5) { // a little bird flies in and pokes its head out
          var q = slotP(sc), arr = Math.min(1, Math.max(0, (q - 0.78) / 0.06)), birdX = Math.round(hx + 4 + (1 - arr) * 40), birdY = Math.round(top - 6 - (1 - arr) * 30);
          if (arr < 1) spr(c, birdX - 2, birdY, f % 2 ? ['.B.B.', 'BBBBo'] : ['BB.BB', '.BBBo']);
          else if (f % 24 < 18) { px(c, hx + 4, top - 6, P.bark); px(c, hx + 5, top - 6, P.orange); px(c, hx + 4, top - 7, P.bark); }
        }
      },
      front: function (c, x, fy, f, cw, ch, sc) {
        if (buildStage(sc) >= 5) return; // done: tools down
        var hx = x + Math.round(cw / 2), hy = fy - Math.round(ch * 0.5), up = f % 4 < 2;
        line(c, hx - 1, hy + 2, hx + 4, up ? hy - 4 : hy, P.wood); R(c, hx + 3, up ? hy - 6 : hy - 1, 3, 2, P.slate);
        if (!up && f % 8 < 2) { px(c, hx + 8, hy - 2, P.yellow); px(c, hx + 9, hy, P.white); }
      } },
    butterfly: { pose: function (f, sc) { var t = (sc.tsec || 0) * 0.9; return { dx: Math.round(Math.sin(t) * 16), dy: f % 4 < 2 ? -2 : 0, flip: Math.cos(t) < 0, eyes: 'happy' }; },
      front: function (c, x, fy, f, cw, ch, sc) {
        var t = (sc.tsec || 0) * 0.9, d = Math.cos(t) < 0 ? -1 : 1, bx = Math.round(x + d * (cw / 2 + 10) + Math.sin(t * 5) * 2), by = Math.round(fy - ch - 4 + Math.sin(t * 3) * 4);
        spr(c, bx - 3, by, f % 2 ? ['yy.k.yy', 'yyykyyy', '.yykyy.', '..y.y..'] : ['..y.y..', '..yky..', '..yky..', '...k...']);
      } },
    sandcastle: { pose: function (f) { return { dy: f % 6 < 3 ? 1 : 0 }; },
      back: function (c, x, fy, f, cw, ch, sc) { sandcastle(c, x + Math.round(cw / 2) + 8, fy, buildStage(sc)); R(c, x - Math.round(cw / 2) - 9, fy - 5, 5, 5, P.red); line(c, x - Math.round(cw / 2) - 9, fy - 6, x - Math.round(cw / 2) - 5, fy - 6, P.ink); },
      front: function (c, x, fy, f, cw, ch) { var hx = x + Math.round(cw / 2), hy = fy - Math.round(ch * 0.4); line(c, hx, hy, hx + 5, hy + (f % 4 < 2 ? 3 : 6), P.wood); R(c, hx + 4, hy + (f % 4 < 2 ? 3 : 6), 3, 2, P.yellow); } },
    snowman: { pose: function (f) { return { dy: f % 6 < 3 ? 0 : -1 }; },
      back: function (c, x, fy, f, cw, ch, sc) { snowman(c, x + Math.round(cw / 2) + 14, fy, buildStage(sc), sc.accent); } },
    stargaze: { pose: function () { return { eyes: 'open' }; },
      back: function (c, x, fy) { line(c, x + 14, fy, x + 17, fy - 7, P.bark); line(c, x + 20, fy, x + 17, fy - 7, P.bark); line(c, x + 13, fy - 6, x + 21, fy - 12, P.slate); line(c, x + 13, fy - 7, x + 21, fy - 13, P.slate); px(c, x + 22, fy - 14, P.cyan); },
      front: function (c, x, fy, f) { if (f % 12 < 3) { px(c, x + 30, fy - 60, P.yellow); px(c, x + 29, fy - 60, P.white); } } },
    // 2.1.15: more to do on his own, inside and out
    journal: { pose: function (f, sc) { var q = slotP(sc) * 60 % 1; return { dy: 1, eyes: q > 0.8 ? (f % 6 < 3 ? 'happy' : 'open') : 'open' }; },
      front: function (c, x, fy, f, cw, ch, sc) {
        var nx = x - 5, ny = fy - Math.round(ch * 0.42), q = slotP(sc), lines = Math.min(5, Math.floor(q * 60) % 6), thinking = (q * 60 % 1) > 0.8;
        R(c, nx - 1, ny - 1, 12, 9, P.ink); R(c, nx, ny, 10, 7, P.white); R(c, nx + 5, ny, 1, 7, P.silver); // the open notebook
        for (var i = 0; i < lines; i++) R(c, nx + (i < 3 ? 1 : 6), ny + 1 + (i % 3) * 2, i === lines - 1 && !thinking ? 1 + (f % 3) : 3, 1, P.slate);
        if (!thinking) { var px0 = nx + (lines < 3 ? 2 : 7) + (f % 3), py0 = ny + 1 + (lines % 3) * 2; line(c, px0, py0, px0 + 3, py0 - 4, P.yellow); px(c, px0, py0, P.ink); }
        else { px(c, x + 6, fy - ch - 3, P.white); px(c, x + 8, fy - ch - 5, P.white); R(c, x + 9, fy - ch - 9, 3, 2, P.white); } // ...thinking
      } },
    tidy: { pose: function (f, sc) { var t = (sc.tsec || 0) * 0.6; return { dx: Math.round(Math.sin(t) * 10), flip: Math.cos(t) < 0, dy: f % 4 < 2 ? 0 : 1 }; },
      front: function (c, x, fy, f, cw, ch, sc) {
        var t = (sc.tsec || 0) * 0.6, d = Math.cos(t) < 0 ? -1 : 1, hx = x + d * Math.round(cw / 2), sw = f % 4 < 2 ? 2 : -1;
        line(c, hx, fy - Math.round(ch * 0.6), hx + d * 5 + sw, fy - 2, P.wood); R(c, hx + d * 5 + sw - 2, fy - 2, 5, 2, P.yellow); // a broom
        for (var i = 0; i < 3; i++) { var k = (f + i * 5) % 15; if (k < 10) px(c, hx + d * (8 + k), fy - 1 - Math.floor(k / 3), sc.indoor ? P.silver : P.sand); } // dust puffs
      } },
    puzzle: { pose: function (f, sc) { var q = slotP(sc) * 18 % 1; return { dy: 1, flip: false, eyes: q > 0.85 ? 'happy' : 'open' }; },
      back: function (c, x, fy, f, cw, ch, sc) {
        var bx = x + Math.round(cw / 2) + 4, by = fy - 4, n = Math.min(18, Math.floor(slotP(sc) * 19)), cols = [P.sky, P.green, P.yellow, P.lime, P.blue, P.cyan];
        R(c, bx - 1, by - 1, 20, 7, P.bark); R(c, bx, by, 18, 5, P.sand);
        for (var i = 0; i < 18; i++) { var gx = i % 6, gy = Math.floor(i / 6); if (i < n) R(c, bx + gx * 3, by + gy * 2 - (gy === 2 ? 1 : 0), 3, gy === 2 ? 1 : 2, cols[(gx + gy * 2) % cols.length]); }
        if (n < 18) R(c, bx + 21, by + 1, 2, 2, cols[n % cols.length]); // the next piece
      },
      front: function (c, x, fy, f, cw, ch) { if (f % 6 < 3) R(c, x + Math.round(cw / 2) + 1, fy - Math.round(ch * 0.35), 2, 2, P.orange); } },
    birdwatch: { pose: function (f, sc) { var t = (sc.tsec || 0) % 20; return { dy: 0, flip: t > 10, eyes: t % 10 > 7 ? 'happy' : 'open' }; },
      front: function (c, x, fy, f, cw, ch, sc) {
        var t = (sc.tsec || 0) % 20, d = t > 10 ? -1 : 1, ey = fy - Math.round(ch * 0.78), ex = x + d * 2;
        R(c, ex - 3, ey, 2, 3, P.ink); R(c, ex + 1, ey, 2, 3, P.ink); px(c, ex - 1, ey + 1, P.ink); px(c, ex - 3 + (d > 0 ? 4 : 0), ey + 1, P.sky); // binoculars
        var k = t % 10, bx = Math.round(x + d * (20 + k * 6)), by = Math.round(fy - 50 + Math.sin(k * 2) * 4); // the bird he's watching
        spr(c, bx - 2, by, f % 2 ? ['B...B', '.BBB.'] : ['.....', 'BBBBB']);
      } },
    read: { front: function (c, x, fy, f, cw, ch) { spr(c, x - 4, fy - Math.round(ch * 0.45), BOOK); if (f % 16 < 4) px(c, x, fy - Math.round(ch * 0.45) + 1, P.silver); } },
    knit: { back: function (c, x, fy) { disc(c, x + 14, fy - 3, 3, P.pink); line(c, x + 12, fy - 5, x + 16, fy - 2, P.plum); line(c, x + 11, fy - 2, x + 15, fy - 5, P.plum); },
      front: function (c, x, fy, f, cw, ch, sc) {
        var yy = fy - Math.round(ch * 0.4), n = 2 + Math.floor(f / 6) % 6;
        line(c, x - 5, yy - 3 + (f % 2), x + 1, yy + 1, P.silver); line(c, x + 5, yy - 3 + ((f + 1) % 2), x - 1, yy + 1, P.silver);
        for (var i = 0; i < n; i++) R(c, x - 2, yy + 2 + i, 4, 1, i % 2 ? sc.accent : P.red);
        line(c, x + 2, yy + 1, x + 12, fy - 3, P.pink);
      } },
    games: { pose: function () { return { flip: true, dy: 1 }; },
      front: function (c, x, fy, f, cw, ch) { var yy = fy - Math.round(ch * 0.4); R(c, x - 4, yy, 8, 3, P.dark); px(c, x - 3, yy + 1, P.cyan); px(c, x + 2, yy + 1, P.red); px(c, x + 3, yy, P.yellow); } },
    tv: { pose: function (f) { return { flip: true, dy: 1, eyes: f % 20 < 1 ? 'blink' : 'open' }; } },
    music: { front: function (c, x, fy, f, cw, ch) {
      var yy = fy - Math.round(ch * 0.42);
      ell(c, x - 1, yy + 2, 4, 3, P.wood); disc(c, x - 1, yy + 2, 1, P.bark); line(c, x + 2, yy, x + 10, yy - 7, P.bark); px(c, x + 11, yy - 8, P.dark);
      spr(c, x + 8 + (f % 8 < 4 ? 0 : 2), fy - ch - 2 - (f % 8) * 2, NOTE);
    } },
    paint: { back: function (c, x, fy, f) {
      line(c, x + 16, fy, x + 20, fy - 20, P.bark); line(c, x + 26, fy, x + 22, fy - 20, P.bark);
      R(c, x + 14, fy - 20, 14, 11, P.white); R(c, x + 14, fy - 9, 14, 1, P.bark);
      var r = U.rng(7), n = (Math.floor(f / 2) % 40);
      for (var i = 0; i < n; i++) px(c, x + 15 + Math.floor(r() * 12), fy - 19 + Math.floor(r() * 9), U.pick(r, [P.red, P.blue, P.green, P.yellow, P.sky, P.pink]));
    }, front: function (c, x, fy, f, cw) { line(c, x + Math.round(cw / 2) - 3, fy - 10, x + Math.round(cw / 2) + 3, fy - 14 - (f % 4 < 2 ? 1 : 0), P.bark); } },
    cook: { back: function (c, x, fy, f) {
      R(c, x + 12, fy - 12, 14, 12, P.dark); R(c, x + 13, fy - 11, 12, 1, P.slate); R(c, x + 14, fy - 8, 10, 6, P.ink);
      px(c, x + 15 + (f % 3), fy - 13, P.orange); px(c, x + 21 - (f % 2), fy - 13, P.yellow);
      R(c, x + 14, fy - 18, 10, 5, P.slate); R(c, x + 13, fy - 18, 12, 1, P.silver);
      for (var i = 0; i < 3; i++) px(c, x + 16 + i * 3, fy - 21 - ((f + i * 2) % 6), P.white);
    } },
    garden: { back: function (c, x, fy, f) {
      for (var i = 0; i < 5; i++) { var sx = x + 12 + i * 5, h = 2 + ((i + Math.floor(f / 10)) % 3); R(c, sx, fy - h, 1, h, P.green); px(c, sx - 1, fy - h, P.lime); px(c, sx + 1, fy - h - 1, P.lime); R(c, sx - 2, fy, 5, 1, P.bark); }
      R(c, x - 14, fy - 12, 1, 10, P.bark); R(c, x - 15, fy - 3, 3, 3, P.slate);
    } },
    ball: { front: function (c, x, fy, f) { var ph = (f % 16) / 16, bx = x + 10 + Math.round(Math.abs(ph - 0.5) * 2 * 24), by = fy - 2 - Math.round(Math.abs(Math.sin(ph * Math.PI * 2)) * 10); spr(c, bx, by - 3, ['.ww.', 'wrrw', 'wrrw', '.ww.']); } },
    yoga: { pose: function (f) { return { dx: [0, -1, 0, 1][Math.floor(f / 3) % 4], eyes: 'sleep' }; },
      back: function (c, x, fy) { R(c, x - 13, fy, 26, 2, P.plum); R(c, x - 13, fy, 26, 1, P.pink); } },
    pottery: { back: function (c, x, fy, f) {
      R(c, x + 12, fy - 6, 14, 6, P.dark); ell(c, x + 19, fy - 7, 7, 1, P.slate); px(c, x + 13 + (f % 12), fy - 7, P.silver);
      R(c, x + 16, fy - 12, 7, 5, P.orange); R(c, x + 17, fy - 13, 5, 1, P.orange); px(c, x + 16 + (f % 6), fy - 10, P.wood);
    } },
    tinker: { back: function (c, x, fy, f, cw, ch, sc) {
      R(c, x + 12, fy - 20, 18, 20, P.dark); R(c, x + 13, fy - 19, 16, 18, P.ink); R(c, x + 13, fy - 17, 16, 1, P.slate);
      var nx = x + 14 + Math.abs((f % 24) - 12), h = 1 + Math.floor(f / 8) % 8;
      R(c, nx, fy - 16, 3, 2, P.yellow); R(c, x + 17, fy - 1 - h, 8, h, sc.accent);
    } },
    skate: { pose: function (f, sc) { return { dx: Math.round(Math.sin(sc.tsec * 1.1) * 18), dy: -2 }; },
      front: function (c, x, fy) { R(c, x - 7, fy - 2, 14, 2, P.red); R(c, x - 7, fy - 2, 14, 1, P.wood); px(c, x - 5, fy, P.ink); px(c, x + 4, fy, P.ink); } },
    chickens: { back: function (c, x, fy, f, cw, ch, sc) {
      R(c, x + 30, fy - 12, 16, 12, P.wood); tri(c, x + 38, fy - 20, 8, 1.1, P.red); R(c, x + 36, fy - 6, 4, 6, P.ink);
      for (var i = 0; i < 6; i++) px(c, x + 10 + i * 3, fy + (i % 2), P.sand);
      spr(c, x + 12, fy - 5, (f % 8 < 4) ? CHICK : CHICK2); spr(c, x + 21, fy - 5, (f % 8 < 4) ? CHICK2 : CHICK, true);
    } },
    // The daily reading: three coins tossed six times; each toss adds a line (bottom to top). Solid = yang, broken = yin, red = changing.
    iching: { pose: function (f, sc) { var t = sc.cast ? sc.cast.t : 0; return { dy: (t % 3) < 0.25 ? -2 : 0, eyes: t >= 18 ? 'happy' : 'open' }; },
      back: function (c, x, fy, f, cw, ch, sc) {
        var cs = sc.cast; if (!cs) return;
        var bx = x + Math.round(cw / 2) + 16, top = fy - 23;
        R(c, bx - 3, top, 19, 22, P.sand); R(c, bx - 3, top, 19, 1, P.wood); R(c, bx - 3, top + 21, 19, 1, P.wood); // a little paper scroll
        var t = cs.t, done = Math.min(6, Math.floor(t / 3) + ((t % 3) / 3 >= 0.6 ? 1 : 0));
        for (var i = 0; i < done; i++) {
          var v = cs.vals[i], y = fy - 5 - i * 3, moving = v === 6 || v === 9, col = moving ? (t >= 18 && f % 6 < 3 ? P.orange : P.red) : P.ink;
          if (v === 7 || v === 9) R(c, bx, y, 13, 2, col); else { R(c, bx, y, 5, 2, col); R(c, bx + 8, y, 5, 2, col); }
        }
      },
      front: function (c, x, fy, f, cw, ch, sc) {
        var cs = sc.cast; if (!cs) return;
        var t = cs.t, i = Math.min(5, Math.floor(t / 3)), ph = (t % 3) / 3, v = cs.vals[i], heads = v - 6; // 6 = no heads ... 9 = three heads
        if (t >= 18) { i = 5; ph = 1; v = cs.vals[5]; heads = v - 6; }
        for (var k = 0; k < 3; k++) {
          var cx = x - 6 + k * 6, face = k < heads;
          if (ph < 0.6) { // in the air, flipping
            var up = Math.sin(ph / 0.6 * Math.PI), cy = Math.round(fy - ch - 4 - up * 16 - k);
            if ((f + k) % 2) R(c, cx, cy + 1, 4, 1, P.yellow); else spr(c, cx, cy, face ? COIN_H : COIN_T);
          } else spr(c, cx, fy - 4, face ? COIN_H : COIN_T); // landed: heads (gold) or tails (bronze)
        }
      } },
    eat: { front: function (c, x, fy, f, cw, ch) {
      var ty = fy - Math.round(ch * 0.3); R(c, x - 10, ty, 20, 2, P.bark); R(c, x - 9, ty + 2, 1, fy - ty - 2, P.bark); R(c, x + 8, ty + 2, 1, fy - ty - 2, P.bark);
      R(c, x - 3, ty - 3, 7, 3, P.white); R(c, x - 2, ty - 4, 5, 1, P.orange); if (f % 6 < 3) px(c, x, ty - 6, P.white);
    } }
  };

  /* ---------- the scene ---------- */
  var cache = { key: null, cv: null, relight: null }, layer = null;
  // 2.3.0: the parts world.js (the property) builds on
  A._in = { drawSky: function () { return drawSky.apply(null, arguments); }, skyBands: skyBands, skyThings: skyThings, HOUSE: HOUSE, tree: tree, groundCols: groundCols,
    drawActor: function (c, sc) { return drawActor(c, sc); }, drawBuddy: function (c, sc) { return drawBuddy(c, sc); }, drone: function (c, sc) { return drone(c, sc); }, dronePos: dronePos,
    weather: function (c, sc, clip) { return weather(c, sc, clip); }, DIG: DIG, roomDoor: roomDoor, cache: function () { return cache; }, lampShade: function (c, on) { return lampShade(c, on); }, drawRoom: function (c, sc) { return drawRoom(c, sc); }, computer: function (c, f) { return computer(c, f); } };
  A.render = function (ctx, sc) {
    ctx.imageSmoothingEnabled = false;
    var dim = sc.phase === 'night' ? 0.55 : sc.phase === 'dusk' || sc.phase === 'dawn' ? 0.25 : (sc.weather === 'storm' || sc.weather === 'rain') ? 0.18 : 0;
    var place = sc.place || 'home';
    var sh = sc.shop || {}, key = [place, sc.indoor, sc.biome, sc.season, sc.house, sc.accent, !!(sc.unlocked.tv || sc.unlocked.games),
      sh.backdrop ? sh.backdrop.id : '', sh.house ? sh.house.id : '', sh.decor ? sh.decor.id : ''].join('|');
    if (cache.key !== key) {
      cache.cv = mk(W, H);
      var cc = cache.cv.getContext('2d');
      cache.relight = sc.indoor ? null : drawLand(cc, sc);
      if (place === 'library') drawLibrary(cc, sc);
      else if (place === 'shop') drawShopRoom(cc, sc);
      else if (A.ROOMS && A.ROOMS[place]) A.ROOMS[place](cc, sc); // 2.2.0: the kitchen and the bathroom
      else if (sc.indoor) drawRoom(cc, sc);
      cache.key = key;
    }
    if (!layer) layer = mk(W, H);
    var L = layer.getContext('2d');
    L.imageSmoothingEnabled = false;
    L.clearRect(0, 0, W, H);
    var bands = skyBands(sc.phase, sc.weather);
    // 1. sky (behind everything, or seen through the window)
    ctx.clearRect(0, 0, W, H);
    if (sc.indoor) {
      drawSky(ctx, WIN[0], WIN[1], WIN[2], WIN[3], bands);
      ctx.save(); ctx.beginPath(); ctx.rect(WIN[0], WIN[1], WIN[2], WIN[3]); ctx.clip();
      skyThings(ctx, sc, WIN);
      R(ctx, WIN[0], WIN[1] + WIN[3] - 6, WIN[2], 6, groundCols(sc.biome, sc.season)[0]);
      weather(ctx, sc, WIN);
      ctx.restore();
    } else {
      drawSky(ctx, 0, 0, W, GY, bands);
      skyThings(ctx, sc, null);
    }
    // 2. land or room, props and the Totem on a layer, so night only darkens the ground and not the sky
    L.drawImage(cache.cv, 0, 0);
    if (place === 'home' && sc.indoor && (sc.act === 'tv' || sc.act === 'games')) {
      var r = U.rng(Math.floor(sc.f / 2));
      for (var i = 0; i < 6; i++) R(L, 56 + Math.floor(r() * 16), 70 + Math.floor(r() * 12), 4, 3, U.pick(r, [P.sky, P.cyan, P.white, P.green, P.red]));
    }
    if (!sc.indoor) {
      if (sc.house === 'cabin' && (sc.phase !== 'day' || sc.season === 'winter' || sc.weather !== 'clear')) {
        for (var s = 0; s < 3; s++) { var sy = 44 - ((sc.f * 0.6 + s * 6) % 18); disc(L, 49 + Math.round(Math.sin((sc.f + s * 5) * 0.3)), Math.round(sy), 1 + (s % 2), P.silver); }
      }
      if (sc.house === 'castle') spr(L, 66, 22, sc.f % 6 < 3 ? ['rrrr.', 'rrrrr', 'rrr..'] : ['rrr..', 'rrrrr', 'rrrr.']);
    }
    if (place === 'home' && sc.stage) { if (sc.indoor) roomBoard(L, sc); else yardBoard(L, sc); }
    if (place === 'home' && sc.indoor && sc.doorOpen) roomDoor(L, sc.house, true); // 2.1.15: the door swings open as he comes or goes
    if (place === 'home' && !sc.indoor && A.yardLive) A.yardLive(L, sc); // 2.2.0: the campfire
    if (place === 'home') drawBuddy(L, sc); // 2.2.0: no leftovers: what he made is put away when he's done (drawMade is not used)
    drawActor(L, sc);
    if (dim) {
      L.globalCompositeOperation = 'source-atop';
      L.globalAlpha = sc.indoor ? dim * 0.45 : dim; R(L, 0, 0, W, H, P.ink);
      L.globalAlpha = 1; L.globalCompositeOperation = 'source-over';
      if (!sc.indoor && cache.relight && sc.phase !== 'day') cache.relight(L);
    }
    if (sc.indoor && place === 'home') lampShade(L, sc.phase !== 'day');
    if (place === 'library') { R(L, 94, 0, 1, 10, P.dark); R(L, 88, 10, 13, 4, sc.phase !== 'day' ? P.yellow : P.sand); }
    ctx.drawImage(layer, 0, 0);
    if (place === 'home' && sc.stage) drone(ctx, sc); // 2.1.13: the Vitals drone (not dimmed at night: its light still shows)
    // 3. weather in front
    if (!sc.indoor) weather(ctx, sc, null);
    if (sc.flash) { var ap0 = A.actorPos(sc), rr = Math.round(10 + (1 - Math.min(1, sc.flash)) * 18); for (var sp0 = 0; sp0 < 12; sp0++) { var an = sp0 / 12 * Math.PI * 2; px(ctx, Math.round(ap0.x + Math.cos(an) * rr), Math.round(ap0.y - 14 + Math.sin(an) * rr * 0.7), sp0 % 2 ? P.yellow : P.white); } } // 2.2.0: a ring of sparkles (no white flash over the whole world)
  };

  var SIL = {};
  function silhouette(cv) {
    var k = cv.__sid || (cv.__sid = U.id());
    if (SIL[k]) return SIL[k];
    var s = mk(cv.width, cv.height), c = s.getContext('2d');
    c.drawImage(cv, 0, 0); c.globalCompositeOperation = 'source-atop'; R(c, 0, 0, s.width, s.height, P.yellow); // 2.2.0: a warm glow (it was a white flash)
    SIL[k] = s;
    return s;
  }

  function weather(ctx, sc, clip) {
    var x0 = clip ? clip[0] : 0, y0 = clip ? clip[1] : 0, w = clip ? clip[2] : W, h = clip ? clip[3] : H, r, i;
    if (sc.weather === 'rain' || sc.weather === 'storm') {
      r = U.rng(3);
      for (i = 0; i < (clip ? 16 : 70); i++) { var rx = x0 + Math.floor(r() * w), ry = y0 + ((Math.floor(r() * h) + sc.f * 5) % h); R(ctx, rx, ry, 1, 3, P.sky); }
      if (sc.weather === 'storm' && sc.f % 37 < 2) { var lx = x0 + ((sc.f * 13) % Math.max(1, w - 20)) + 10; line(ctx, lx, y0, lx - 4, y0 + h * 0.25, P.yellow); line(ctx, lx - 4, y0 + h * 0.25, lx + 2, y0 + h * 0.4, P.yellow); ctx.globalAlpha = 0.1; R(ctx, x0, y0, w, h, P.silver); ctx.globalAlpha = 1; } // 2.2.0: a bolt, not a white flash
    } else if (sc.weather === 'snow') {
      r = U.rng(5);
      for (i = 0; i < (clip ? 12 : 50); i++) { var sx = x0 + ((Math.floor(r() * w) + Math.round(Math.sin((sc.f + i) * 0.2) * 2)) % w), sy = y0 + ((Math.floor(r() * h) + sc.f) % h); px(ctx, sx, sy, P.white); }
    } else if (sc.weather === 'fog') {
      ctx.globalAlpha = 0.35; for (i = 0; i < 4; i++) R(ctx, x0, y0 + h * 0.3 + i * (h * 0.15), w, h * 0.07, P.silver); ctx.globalAlpha = 1;
    }
  }

  function drawActor(ctx, sc) {
    var f = sc.f, x = sc.spotX || (sc.indoor ? 104 : A.AIU_OUT), fy = sc.indoor ? 100 : 97;
    if (!sc.stage) { // the egg
      var eg = A.egg(sc.eggSeed, sc.eggProgress > 0.9), wob = sc.hatching || sc.mode === 'eggtap' ? (f % 2 ? 1 : -1) : (sc.eggProgress > 0.7 && f % 10 < 2 ? (f % 2 ? 1 : -1) : 0); // 2.1.10: a tap wobbles the egg
      ell(ctx, x, fy - 1, 9, 3, P.bark); for (var i = 0; i < 7; i++) px(ctx, x - 8 + i * 3, fy - 2 - (i % 2), P.wood);
      ctx.drawImage(eg, x - 7 + wob, fy - 17);
      if (sc.mode === 'hop' && f % 4 < 2) px(ctx, x + 8, fy - 18, P.yellow);
      return;
    }
    var form = sc.skin || sc.form, cr = A.creature(form.seed, form.stage, sc.soul);
    var act = sc.act, D = A.ACT_DRAW[act] || PLACE_DRAW[act] || {}, pose = { dx: 0, dy: f % 4 < 2 ? 0 : -1, eyes: (f % 23 === 0) ? 'blink' : 'open', flip: false };
    if (act === 'sleep') { x = 160; fy = 86; pose = { dx: 0, dy: 0, eyes: 'sleep' }; }
    else if (D.pose) Object.assign(pose, D.pose(f, sc));
    if (sc.mode === 'greet') { pose = { dx: 0, dy: sc.modeT < 0.3 ? -3 : 0, eyes: 'happy', flip: false }; }
    if (sc.mode === 'hop') { pose.dy = [-4, -6, -4, 0][Math.floor(sc.modeT * 4) % 4]; pose.eyes = 'happy'; }
    // 2.1.7: tricks when you tap him, a wiggle when you rub him, a yawn when he's worn out
    var mt = sc.modeT || 0;
    if (sc.mode === 'spin') { pose.flip = Math.floor(mt * 6) % 2 === 1; pose.dy = -Math.round(Math.sin(mt * Math.PI) * 3); pose.eyes = 'happy'; }
    if (sc.mode === 'jump') { pose.dy = -Math.round(Math.sin(mt * Math.PI) * 13); pose.eyes = mt < 0.5 ? 'open' : 'happy'; }
    if (sc.mode === 'dance') { pose.dx = [-2, 0, 2, 0][Math.floor(mt * 12) % 4]; pose.dy = Math.floor(mt * 12) % 2 ? -2 : 0; pose.eyes = 'happy'; pose.flip = Math.floor(mt * 3) % 2 === 1; }
    if (sc.mode === 'wiggle') { pose.dx = Math.floor(mt * 16) % 2 ? 1 : -1; pose.dy = 0; pose.eyes = 'happy'; }
    if (sc.mode === 'yawn') { pose.dy = 1; pose.eyes = mt < 0.7 ? 'sleep' : 'blink'; }
    if (sc.mode === 'sleepy') { x = 160; fy = 84; pose = { dx: 0, dy: 0, eyes: f % 10 < 6 ? 'sleep' : 'blink' }; }
    if (sc.pat && pose.eyes !== 'sleep') pose.eyes = 'happy'; // 2.1.15: a pat on the back while he works
    if (sc.walk) { x = Math.round(sc.walk.x); pose = { dx: 0, dy: f % 2 ? -1 : 0, eyes: f % 23 === 0 ? 'blink' : 'open', flip: sc.walk.left }; } // 2.1.15: walking to or from the door (his tools stay put)
    var trick = /^(hop|spin|jump|dance|wiggle|yawn)$/.test(sc.mode || ''), busy = sc.mode !== 'greet' && sc.mode !== 'sleepy' && !trick && !sc.walk;
    x += pose.dx || 0;
    var bw = cr.bw, bh = cr.bottom - cr.top + 1;
    // 2.5.0: fishing outside, he stands on the pond's bank facing it, and the line lands in the real pond
    var mirror = busy && act === 'fishing' && !sc.indoor && !A.isRoom(sc) && !sc.evolve && !sc.castle; // (3.0: the castle has no big pond to face)
    sc.pondCast = mirror ? 1 : 0;
    if (mirror) { ctx.save(); ctx.translate(2 * x, 0); ctx.scale(-1, 1); }
    if (busy && D.back) D.back(ctx, x, fy, f, bw, bh, sc);
    var tired = sc.stressed && act !== 'sleep' && sc.mode !== 'sleepy' && !trick; // 2.1.6: distressed (Vitals worn down): he keeps doing things, just tired
    if (tired) { pose.dy = 1 + (f % 8 < 4 ? 0 : 1); pose.dx = Math.round((pose.dx || 0) / 2); if (pose.eyes === 'open') pose.eyes = f % 30 < 4 ? 'open' : 'blink'; } // slow, slumped, heavy eyelids
    var frame = cr.frames[pose.eyes] || cr.frames.open;
    var dx = Math.round(x - cr.w / 2), dy = Math.round(fy - cr.bottom - 1 + (pose.dy || 0));
    if (sc.evolve) { // evolution: flicker between the old and new shapes, glowing white
      var p = sc.evolve.p, old = A.creature(sc.evolve.from.seed, sc.evolve.from.stage, sc.soul);
      var use = (p < 0.8 && Math.floor(p * 16) % 2 === 0) ? old : cr;
      var img = p < 0.85 ? silhouette(use.frames.open) : use.frames.happy;
      ctx.drawImage(img, Math.round(x - use.w / 2), Math.round(fy - use.bottom - 1));
      if (p >= 0.85) for (var sp = 0; sp < 6; sp++) px(ctx, x - 14 + ((sp * 37 + f * 3) % 28), fy - 24 + ((sp * 13 + f * 2) % 22), sp % 2 ? P.yellow : P.white);
      return;
    }
    if (cr.float && act !== 'sleep' && sc.mode !== 'sleepy') { // ghosts and flames hover
      ell(ctx, x, fy, Math.max(3, Math.round(bw / 2) - 2), 1, P.dark);
      dy -= cr.float + (Math.floor(f / 6) % 2);
      if (cr.kind === 'flame') for (var em = 0; em < 3; em++) { var ef = (f + em * 7) % 21; px(ctx, x - 4 + ((em * 5 + Math.floor(f / 3)) % 9), dy + cr.head - 1 - Math.floor(ef / 2), ef < 10 ? cr.accent : P.yellow); }
    }
    if (pose.flip) { ctx.save(); ctx.translate(dx + cr.w, dy); ctx.scale(-1, 1); ctx.drawImage(frame, 0, 0); ctx.restore(); }
    else ctx.drawImage(frame, dx, dy);
    if (sc.justHatched && act !== 'sleep' && sc.mode !== 'sleepy') { spr(ctx, dx + Math.round(cr.w / 2) - 3, dy + cr.top - 3, ['w.w.w.', 'wwwwww']); }
    var shp = sc.shop || {};
    if (shp.hat && act !== 'sleep' && sc.mode !== 'sleepy') { var hi = shp.hat.img; ctx.drawImage(hi, dx + cr.crownX - Math.round(hi.width / 2), dy + cr.crownY - hi.height + 2); }
    var cs = sc.cos || {}; // 2.5.0: looks from the Corner Mart
    if (cs.hat && act !== 'sleep' && sc.mode !== 'sleepy' && !shp.hat) { var ch0 = cs.hat.img; ctx.drawImage(ch0, dx + cr.crownX - Math.floor(ch0.width / 2), dy + cr.crownY - ch0.height + 2); }
    if (cs.face && act !== 'sleep' && sc.mode !== 'sleepy') { var cf = cs.face.img; ctx.drawImage(cf, dx + cr.crownX - Math.floor(cf.width / 2), dy + cr.eyeY + (cs.face.dy || 0)); }
    if (shp.toy && act !== 'sleep' && sc.mode !== 'sleepy') { var ti = shp.toy.img; ctx.drawImage(ti, Math.round(x - bw / 2 - ti.width - 4), fy - ti.height + 1); }
    if (busy && D.front) D.front(ctx, x, fy, f, bw, bh, sc);
    if (tired) { // a sweat drop and a slow sigh, now and then
      var tx = dx + cr.crownX, ty = dy + cr.head;
      if (f % 40 < 24) { px(ctx, tx + 5, ty - 1 + Math.floor((f % 40) / 8), P.sky); px(ctx, tx + 5, ty + Math.floor((f % 40) / 8), P.sky); }
      if (f % 60 >= 40) { var sg = f % 60 - 40; px(ctx, tx - 6 - Math.floor(sg / 5), ty - 2 - Math.floor(sg / 4), P.white); }
    }
    if (act !== 'sleep' && sc.mode !== 'sleepy' && cr.kind && cr.kind !== 'classic' && Math.floor((sc.tsec || 0) / 4) % 4 === 0) typeMove(ctx, cr, dx, dy, x, fy, f);
    if (act === 'sleep' || sc.mode === 'sleepy') { var zs = f % 12; spr(ctx, x + 8 + Math.floor(zs / 4), fy - 16 - zs, ZZZ); }
    if (sc.mode === 'greet' && sc.modeT < 0.6) spr(ctx, x - 1, dy - 8, BANG);
    if (sc.mode === 'dance' || sc.mode === 'spin') { var nt = Math.floor(mt * 10) % 4; spr(ctx, x + 9 + nt, dy + cr.head - 6 - nt * 2, ['.kk', '.k.', 'kk.']); } // a music note
    if (sc.mode === 'yawn' && mt < 0.7) R(ctx, x - 1, dy + cr.head + Math.round((cr.bottom - cr.head) * 0.55), 3, 2, P.ink); // a big yawn
    if (mirror) ctx.restore();
  }

  // Each type's little move (a few seconds every quarter minute)
  function typeMove(ctx, cr, dx, dy, x, fy, f) {
    var mx = dx + cr.crownX, my = dy + cr.eyeY + 3, hd = dy + cr.head, k = cr.kind, i, t = f % 12;
    if (k === 'dragon') { for (i = 0; i < 3 + (t % 3); i++) px(ctx, dx + cr.right + 1 + i, my + ((i + f) % 2), i < 2 ? P.yellow : i < 4 ? P.orange : P.red); }
    else if (k === 'aqua') { for (i = 0; i < 3; i++) { var by = my - 2 - ((t + i * 4) % 12); px(ctx, mx + 2 + (i % 2), by, P.cyan); if (i === 0) px(ctx, mx + 3, by - 1, P.white); } }
    else if (k === 'robot') { spr(ctx, mx - 2, hd - 5, t < 6 ? ['.c.c.', 'c...c'] : ['c...c', '.c.c.']); }
    else if (k === 'ghost') { for (i = 0; i < 4; i++) { var a = (f * 0.4 + i * 1.57); px(ctx, Math.round(mx + Math.cos(a) * (cr.bw / 2 + 4)), Math.round(dy + cr.eyeY + Math.sin(a) * 4), i % 2 ? P.white : P.cyan); } }
    else if (k === 'plant') { px(ctx, mx - 4 + (t % 9), hd - 2 + Math.floor(t / 2), P.lime); px(ctx, mx + 5, hd - 3, t % 4 < 2 ? P.yellow : P.white); }
    else if (k === 'bug') { for (i = 0; i < 2; i++) { px(ctx, dx + cr.left - 2, my - 3 + i * 2 + (t % 2), P.white); px(ctx, dx + cr.right + 2, my - 3 + i * 2 + (t % 2), P.white); } }
    else if (k === 'golem') { var gx = mx, gy = hd - 1; if (t < 6) { px(ctx, gx, gy - 1, P.white); px(ctx, gx - 1, gy, P.white); px(ctx, gx + 1, gy, P.white); px(ctx, gx, gy + 1, P.white); } }
    else if (k === 'beast') { for (i = 0; i < 3; i++) px(ctx, x - 6 + ((t + i * 5) % 14), fy - (i % 2), P.silver); }
    else if (k === 'flame') { for (i = 0; i < 5; i++) px(ctx, mx - 4 + ((i * 3 + f) % 9), hd - 2 - ((t + i * 3) % 7), i % 2 ? P.yellow : P.orange); }
  }

  // Activity packs from the shop: a PNG strip of frames side by side (each frame the same size).
  // anchor 'side' = on the ground to the right of the Totem, 'front' = over the Totem's body, 'above' = over its head.
  A.addPackActivity = function (id, info, img) {
    if (!img || !img.complete || !img.naturalWidth) { if (img && !img.__aiuWait) { img.__aiuWait = 1; img.addEventListener('load', function () { A.addPackActivity(id, info, img); }); } return; }
    var n = Math.max(1, Math.min(12, info.frames | 0 || 1)), fw = Math.floor(img.naturalWidth / n), fh = img.naturalHeight;
    var fps = Math.max(1, Math.min(12, info.fps | 0 || 4)), anchor = info.anchor || 'side';
    A.ACTIVITIES[id] = { label: String(info.label || info.name || id).slice(0, 40), where: info.where || 'both', pack: true, keys: (info.keys || []).slice(0, 12) };
    var draw = function (c, x, fy, f, cw, ch, sc) {
      var k = Math.floor((sc.tsec || 0) * fps) % n, dx, dy;
      if (anchor === 'front') { dx = x - Math.floor(fw / 2); dy = fy - fh; }
      else if (anchor === 'above') { dx = x - Math.floor(fw / 2); dy = fy - ch - fh - 2; }
      else { dx = x + Math.round(cw / 2) + 3; dy = fy - fh + 1; }
      c.drawImage(img, k * fw, 0, fw, fh, Math.round(dx), Math.round(dy), fw, fh);
    };
    A.ACT_DRAW[id] = anchor === 'side' ? { back: draw } : { front: draw };
  };

  // Where the Totem stands (for the close-up camera).
  A.actorPos = function (sc) {
    if (sc.walk) return { x: Math.round(sc.walk.x), y: sc.indoor ? 100 : 97 };
    if (sc.spotX) return { x: sc.spotX, y: 100 };
    if (sc.indoor && (sc.act === 'sleep' || sc.mode === 'sleepy')) return { x: 160, y: 86 };
    return sc.indoor ? { x: 104, y: 100 } : { x: A.AIU_OUT, y: 97 };
  };

  /* ---------- a crisp portrait (for pop-ups and icons) ---------- */
  A.crop = function (cr, frame, scale) {
    var w = cr.right - cr.left + 1, hh = cr.bottom - cr.head + 1, cv = mk(w * scale, hh * scale), c = cv.getContext('2d');
    c.imageSmoothingEnabled = false;
    c.drawImage(cr.frames[frame || 'open'], cr.left, cr.head, w, hh, 0, 0, cv.width, cv.height);
    return cv;
  };
  A.portrait = function (sc, scale) {
    scale = scale || 3;
    var cv;
    if (!sc.stage) { var eg = A.egg(sc.eggSeed, false); cv = mk(eg.width * scale, eg.height * scale); var c = cv.getContext('2d'); c.imageSmoothingEnabled = false; c.drawImage(eg, 0, 0, cv.width, cv.height); return cv; }
    var form = sc.skin || sc.form, cr = A.creature(form.seed, form.stage, sc.soul);
    return A.crop(cr, 'happy', scale);
  };
})();
