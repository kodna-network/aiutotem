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
  A.prim = { R: R, px: px, spr: spr, disc: disc, ell: ell, tri: tri, line: line };

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
    iching: { label: 'casting the daily I Ching', where: 'both', ritual: true } // only at the daily reading time
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

  A.creature = function (seed, stage, soul) {
    var key = seed + ':' + stage + ':' + soul;
    if (CC[key]) return CC[key];
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
    CC[key] = res;
    return res;
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
    if (shop.house) { c.drawImage(shop.house.img, Math.max(0, 38 - Math.round(shop.house.img.width / 2)), 93 - shop.house.img.height); return null; }
    return HOUSE[sc.house] ? HOUSE[sc.house](c, s, false) : HOUSE.cabin(c, s, false);
  }

  /* ---------- indoor room (cached; window left transparent) ---------- */
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
    // window
    var fr = hs === 'castle' || hs === 'cave' ? P.dark : P.bark;
    R(c, 12, 10, 48, 36, fr); c.clearRect(WIN[0], WIN[1], WIN[2], WIN[3]);
    R(c, 35, 13, 2, 30, fr); R(c, 15, 27, 42, 2, fr); R(c, 10, 46, 52, 3, P.bark);
    R(c, 7, 8, 5, 40, acc); R(c, 60, 8, 5, 40, acc);
    // shelf + picture
    R(c, 76, 30, 34, 2, P.bark); R(c, 78, 22, 3, 8, P.red); R(c, 81, 23, 3, 7, P.blue); R(c, 84, 21, 2, 9, P.green); R(c, 86, 24, 4, 6, P.yellow);
    R(c, 102, 26, 5, 4, P.orange); px(c, 103, 24, P.green); px(c, 105, 23, P.green); px(c, 104, 25, P.green);
    if (sc.shop && sc.shop.decor) c.drawImage(sc.shop.decor.img, 125 - Math.round(sc.shop.decor.img.width / 2), Math.max(4, 32 - sc.shop.decor.img.height));
    else { R(c, 116, 18, 18, 14, P.bark); R(c, 117, 19, 16, 12, P.cyan); tri(c, 124, 23, 7, 1.1, P.green); disc(c, 129, 22, 1, P.yellow); }
    // bed
    R(c, 182, 66, 4, 30, P.bark); R(c, 146, 88, 40, 6, P.bark); R(c, 147, 94, 2, 4, P.bark); R(c, 183, 94, 2, 4, P.bark);
    R(c, 146, 84, 38, 4, P.white); R(c, 146, 82, 28, 8, acc); R(c, 146, 82, 28, 1, P.white); R(c, 174, 79, 8, 5, P.white);
    // rug + lamp
    ell(c, 98, 100, 32, 5, P.red); ell(c, 98, 100, 27, 4, P.orange); ell(c, 98, 100, 20, 3, P.red);
    R(c, 136, 62, 1, 34, P.dark); R(c, 133, 96, 7, 2, P.dark);
    // TV if the Totem has learned about TV or games
    if (sc.unlocked.tv || sc.unlocked.games) { R(c, 52, 88, 28, 10, P.bark); R(c, 54, 68, 24, 20, P.dark); R(c, 56, 70, 20, 15, P.ink); line(c, 60, 67, 56, 62, P.dark); line(c, 72, 67, 76, 62, P.dark); }
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
  function smallPond(c, x, fy) { ell(c, x, fy + 3, 16, 4, P.blue); ell(c, x, fy + 3, 12, 2, P.sky); ell(c, x, fy + 3, 9, 1, P.blue); }

  A.ACT_DRAW = {
    water: { back: function (c, x, fy) { flowerBed(c, x + 12, fy); },
      front: function (c, x, fy, f, cw, ch) { spr(c, x + Math.round(cw / 2) - 3, fy - Math.round(ch * 0.55), CAN); px(c, x + Math.round(cw / 2) + 5, fy - Math.round(ch * 0.55) + 2 + (f % 3) * 2, P.sky); px(c, x + Math.round(cw / 2) + 7, fy - Math.round(ch * 0.55) + 3 + ((f + 1) % 3) * 2, P.sky); } },
    workout: { pose: function (f) { return { dy: f % 4 < 2 ? -2 : 0 }; },
      front: function (c, x, fy, f, cw, ch) { spr(c, x - 4, fy - ch - 1 - (f % 4 < 2 ? 3 : 0), DUMB); } },
    fishing: { pose: function () { return { dy: 1 }; },
      back: function (c, x, fy, f, cw, ch, sc) { if (sc.biome !== 'pond' && sc.biome !== 'beach') smallPond(c, x + 36, fy); },
      front: function (c, x, fy, f, cw, ch) {
        var hx = x + Math.round(cw / 2) - 2, hy = fy - Math.round(ch * 0.45), tx = hx + 14, ty = hy - 12;
        line(c, hx, hy, tx, ty, P.bark);
        var bx = tx + 12, by = fy + 2 + (f % 6 < 3 ? 0 : 1);
        for (var i = 0; i < 12; i += 2) px(c, tx + i, ty + Math.round((by - ty) * (i / 12) * (i / 12)), P.silver);
        px(c, bx, by - 1, P.white); px(c, bx, by, P.red);
      } },
    stargaze: { pose: function () { return { eyes: 'open' }; },
      back: function (c, x, fy) { line(c, x + 14, fy, x + 17, fy - 7, P.bark); line(c, x + 20, fy, x + 17, fy - 7, P.bark); line(c, x + 13, fy - 6, x + 21, fy - 12, P.slate); line(c, x + 13, fy - 7, x + 21, fy - 13, P.slate); px(c, x + 22, fy - 14, P.cyan); },
      front: function (c, x, fy, f) { if (f % 12 < 3) { px(c, x + 30, fy - 60, P.yellow); px(c, x + 29, fy - 60, P.white); } } },
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
    // 3. weather in front
    if (!sc.indoor) weather(ctx, sc, null);
    if (sc.flash) { ctx.globalAlpha = Math.min(1, sc.flash); R(ctx, 0, 0, W, H, P.white); ctx.globalAlpha = 1; }
  };

  var SIL = {};
  function silhouette(cv) {
    var k = cv.__sid || (cv.__sid = U.id());
    if (SIL[k]) return SIL[k];
    var s = mk(cv.width, cv.height), c = s.getContext('2d');
    c.drawImage(cv, 0, 0); c.globalCompositeOperation = 'source-atop'; R(c, 0, 0, s.width, s.height, P.white);
    SIL[k] = s;
    return s;
  }

  function weather(ctx, sc, clip) {
    var x0 = clip ? clip[0] : 0, y0 = clip ? clip[1] : 0, w = clip ? clip[2] : W, h = clip ? clip[3] : H, r, i;
    if (sc.weather === 'rain' || sc.weather === 'storm') {
      r = U.rng(3);
      for (i = 0; i < (clip ? 16 : 70); i++) { var rx = x0 + Math.floor(r() * w), ry = y0 + ((Math.floor(r() * h) + sc.f * 5) % h); R(ctx, rx, ry, 1, 3, P.sky); }
      if (sc.weather === 'storm' && sc.f % 37 < 2) { ctx.globalAlpha = 0.5; R(ctx, x0, y0, w, h, P.white); ctx.globalAlpha = 1; }
    } else if (sc.weather === 'snow') {
      r = U.rng(5);
      for (i = 0; i < (clip ? 12 : 50); i++) { var sx = x0 + ((Math.floor(r() * w) + Math.round(Math.sin((sc.f + i) * 0.2) * 2)) % w), sy = y0 + ((Math.floor(r() * h) + sc.f) % h); px(ctx, sx, sy, P.white); }
    } else if (sc.weather === 'fog') {
      ctx.globalAlpha = 0.35; for (i = 0; i < 4; i++) R(ctx, x0, y0 + h * 0.3 + i * (h * 0.15), w, h * 0.07, P.silver); ctx.globalAlpha = 1;
    }
  }

  function drawActor(ctx, sc) {
    var f = sc.f, x = sc.spotX || (sc.indoor ? 100 : 122), fy = sc.indoor ? 100 : 97;
    if (!sc.stage) { // the egg
      var eg = A.egg(sc.eggSeed, sc.eggProgress > 0.9), wob = sc.hatching ? (f % 2 ? 1 : -1) : (sc.eggProgress > 0.7 && f % 10 < 2 ? (f % 2 ? 1 : -1) : 0);
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
    if (sc.mode === 'sleepy') { x = 160; fy = 84; pose = { dx: 0, dy: 0, eyes: f % 10 < 6 ? 'sleep' : 'blink' }; }
    var busy = sc.mode !== 'greet' && sc.mode !== 'sleepy' && sc.mode !== 'hop';
    x += pose.dx || 0;
    var bw = cr.bw, bh = cr.bottom - cr.top + 1;
    if (busy && D.back) D.back(ctx, x, fy, f, bw, bh, sc);
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
    if (pose.flip) { ctx.save(); ctx.translate(dx + cr.w, dy); ctx.scale(-1, 1); ctx.drawImage(frame, 0, 0); ctx.restore(); }
    else ctx.drawImage(frame, dx, dy);
    if (sc.justHatched && act !== 'sleep' && sc.mode !== 'sleepy') { spr(ctx, dx + Math.round(cr.w / 2) - 3, dy + cr.top - 3, ['w.w.w.', 'wwwwww']); }
    var shp = sc.shop || {};
    if (shp.hat && act !== 'sleep' && sc.mode !== 'sleepy') { var hi = shp.hat.img; ctx.drawImage(hi, dx + cr.crownX - Math.round(hi.width / 2), dy + cr.crownY - hi.height + 2); }
    if (shp.toy && act !== 'sleep' && sc.mode !== 'sleepy') { var ti = shp.toy.img; ctx.drawImage(ti, Math.round(x - bw / 2 - ti.width - 4), fy - ti.height + 1); }
    if (busy && D.front) D.front(ctx, x, fy, f, bw, bh, sc);
    if (act === 'sleep' || sc.mode === 'sleepy') { var zs = f % 12; spr(ctx, x + 8 + Math.floor(zs / 4), fy - 16 - zs, ZZZ); }
    if (sc.mode === 'greet' && sc.modeT < 0.6) spr(ctx, x - 1, dy - 8, BANG);
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
    if (sc.spotX) return { x: sc.spotX, y: 100 };
    if (sc.indoor && (sc.act === 'sleep' || sc.mode === 'sleepy')) return { x: 160, y: 86 };
    return sc.indoor ? { x: 100, y: 100 } : { x: 122, y: 97 };
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
