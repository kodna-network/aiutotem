/* AIU TOTEM 2.4.0 - the oddities: now and then a strange, friendly creature wanders through Aiu's world, like a corner of
   an old painted garden come to life. Our own creatures (inspired by the public-domain Garden of Earthly Delights, never
   copied from it), a different crowd for each biome: a long-necked stilt beast nibbling the treetops, a big shy forest
   walker, a fish on bird legs, an owl-eyed berry, a polar mammoth, a frost serpent, a snail carrying a little house, a
   cactus on bird legs, a walking egg with a door. One at a time, about half the time, for under a minute; the same on
   every device (it follows the clock). Tap one and it says hello. */
(function () {
  'use strict';
  var U = AIU.util, A = AIU.art, P = A.P, K = A.prim, R = K.R, px = K.px, disc = K.disc, ell = K.ell, line = K.line;
  var LIST = {
    meadow: ['stilt', 'berry', 'fishbird', 'egg', 'walker'], forest: ['walker', 'stilt', 'berry', 'egg'], desert: ['cactus', 'stilt', 'snail', 'egg'],
    tundra: ['mammoth', 'serpent', 'walker'], pond: ['fishbird', 'snail', 'berry', 'egg'], beach: ['fishbird', 'snail', 'egg']
  };
  var NAME = { stilt: 'a stilt beast, nibbling the treetops', walker: 'the big shy forest walker', fishbird: 'a fish out for a stroll on bird legs', berry: 'an owl-eyed berry, rolling by', mammoth: 'a polar mammoth, all fluff and tusks', serpent: 'a frost serpent, slithering through', snail: 'a snail carrying a whole little house', cactus: 'a cactus on bird legs', egg: 'a walking egg with its own front door' };
  var PERIOD = 140, DUR = 52;
  // where it walks: the far rise (behind the stream) or the field in front
  var LANE = { stilt: 84, walker: 84, mammoth: 84, serpent: 84, cactus: 84, fishbird: 112, berry: 108, snail: 104, egg: 110 }; // the stream bank, or the field
  var TREES = [44, 132, 156];
  A.oddNow = function (sc) {
    if (!sc || A.isRoom(sc) || !sc.stage) return null;
    if (A.oddTest) { var kt = A.oddTest.k; return { k: kt, x: A.oddTest.x, y: LANE[kt], dir: 1, eat: !!A.oddTest.eat, f: sc.f, name: NAME[kt] }; } // (for the tests)
    var t = sc.tsec || 0, i = Math.floor(t / PERIOD), r = U.rng(U.hash32('odd' + i + (sc.biome || 'meadow'))), u = t - i * PERIOD;
    if (r() > 0.6 || u > DUR) return null; // about half the time
    var kinds = LIST[sc.biome] || LIST.meadow, k = kinds[Math.floor(r() * kinds.length)], dir = r() < 0.5 ? 1 : -1, p = u / DUR;
    var y = LANE[k], x0 = dir > 0 ? -24 : 216, x1 = dir > 0 ? 216 : -24, x = x0 + (x1 - x0) * p, eat = false;
    if (k === 'stilt') { var tx = TREES[Math.floor(r() * TREES.length)], at = (tx - x0) / (x1 - x0); if (p > at && p < at + 0.3) { x = tx + 6 * dir * -1; eat = true; } else if (p >= at + 0.3) x = x0 + (x1 - x0) * (p - 0.3); }
    if (k === 'walker' && p > 0.45 && p < 0.6) { x = x0 + (x1 - x0) * 0.45; eat = true; } // stops and waves
    return { k: k, x: Math.round(x), y: y, dir: dir, eat: eat, f: sc.f, name: NAME[k] };
  };
  A.oddHit = function (pt, sc) { var o = A.oddNow(sc); if (!o || !pt) return null; var w = o.k === 'mammoth' || o.k === 'serpent' ? 16 : 10, hgt = o.k === 'stilt' ? 34 : o.k === 'walker' ? 24 : 16; return Math.abs(pt.x - o.x) <= w && pt.y <= o.y + 3 && pt.y >= o.y - hgt ? o : null; };
  var SQ_TOP = [
    '.....BBBB.......', '....BBBBBB......', '....BBBBaaa.....', '....BBBakaa.....', '....BBBBaaa.....', '...BBBBBBBa.....',
    '..BBBBBBBBBB....', '.BBBWBBBBBBBB...', '.BBBBBBBBWBBBB..', '.BBWBBBBBBBBBB..', 'BBBBBBBBBBBB.BB.', 'BBB.BBBWBBBB.BB.',
    'BB..BBBBBBBB.BB.', 'BB..BBBBBWBB..BB', 'aa..BBBBBBBB..aa', '....BBBBBBBB....'];
  var SQ_LEG1 = ['....BBBB.BBBB...', '...BBBB...BBBB..', '...BBB.....BBB..', '..BBB.......BBB.', '..BBB........BB.', '.aaaa.......aaaa'];
  var SQ_LEG2 = ['....BBBBBBB.....', '.....BBBBBB.....', '.....BBB.BBB....', '.....BBB.BBB....', '.....BBB..BB....', '....aaaa.aaaa...'];
  var SQ_LEG0 = ['....BBBB.BBB....', '....BBB...BBB...', '....BBB...BBB...', '....BBB...BBB...', '....BBB...BBB...', '...aaaa..aaaa...'];
  function outlined(c, x, y, rows) { var ink = rows.map(function (r) { return r.replace(/[^.]/g, 'k'); }); [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(function (q) { K.spr(c, x + q[0], y + q[1], ink); }); K.spr(c, x, y, rows); }
  function legs(c, x, y, f, col, n, sp) { for (var i = 0; i < n; i++) { var lx = x + (i - (n - 1) / 2) * (sp || 3), st = (f + i * 2) % 4 < 2 ? 1 : 0; line(c, lx, y - 6, lx + (st ? 1 : -1), y, col); } }
  A.drawOdd = function (c, o, sc) {
    var x = o.x, y = o.y, f = sc.f, d = o.dir;
    c.save(); c.translate(x, 0); c.scale(d, 1); c.translate(-x, 0);
    if (o.k === 'stilt') { // tall spotted legs, a barrel body, a long neck up into the trees
      for (var i = 0; i < 4; i++) { var lx = x - 6 + i * 4, st = !o.eat && (f + i) % 4 < 2; R(c, lx, y - 14, 1, 14, P.bark); if (st) px(c, lx + 1, y - 1, P.bark); }
      ell(c, x, y - 17, 9, 4, P.sand); for (var s = 0; s < 5; s++) px(c, x - 6 + s * 3, y - 18 + (s % 2) * 2, P.wood);
      var hx = x + 8, hy = o.eat ? y - 34 : y - 30; line(c, x + 5, y - 19, hx, hy + 3, P.sand); line(c, x + 6, y - 19, hx + 1, hy + 3, P.sand);
      R(c, hx - 1, hy, 6, 4, P.sand); px(c, hx + 3, hy + 1, P.ink); R(c, hx, hy - 2, 1, 2, P.bark); R(c, hx + 2, hy - 2, 1, 2, P.bark);
      if (o.eat && f % 4 < 2) { px(c, hx + 6, hy + 1, P.green); px(c, hx + 7, hy, P.lime); }
      R(c, x - 10, y - 18, 2, 1, P.bark);
    } else if (o.k === 'walker') { // the big, shy forest walker (a sasquatch): hunched, shaggy, long arms, a long stride
      var top = SQ_TOP, legsA = f % 8 < 4 ? SQ_LEG1 : SQ_LEG2, rows = top.concat(legsA), wave = o.eat && f % 6 < 3;
      if (o.eat) rows = top.concat(SQ_LEG0);
      outlined(c, x - 8, y - rows.length, rows);
      if (wave) { line(c, x + 4, y - 17, x + 9, y - 26, P.ink); line(c, x + 5, y - 17, x + 10, y - 26, P.bark); R(c, x + 9, y - 28, 3, 3, P.sand); } // a shy little wave
    } else if (o.k === 'fishbird') { // a fish on two orange bird legs
      legs(c, x, y, f, P.orange, 2, 3);
      ell(c, x, y - 10, 7, 4, P.sky); ell(c, x + 1, y - 11, 5, 2, P.cyan); R(c, x - 10, y - 13, 3, 6, P.blue); px(c, x - 8, y - 10, P.sky);
      px(c, x + 5, y - 11, P.ink); px(c, x + 7, y - 9, P.red); for (var sc2 = 0; sc2 < 3; sc2++) px(c, x - 3 + sc2 * 3, y - 9, P.blue);
    } else if (o.k === 'berry') { // an owl-eyed berry that rolls and hops
      var hop = f % 6 < 2 ? 2 : 0; disc(c, x, y - 6 - hop, 6, P.red); for (var b = 0; b < 6; b++) px(c, x - 4 + (b * 3) % 9, y - 9 - hop + (b % 3) * 2, P.yellow);
      disc(c, x - 2, y - 8 - hop, 2, P.white); disc(c, x + 2, y - 8 - hop, 2, P.white); px(c, x - 2, y - 8 - hop, P.ink); px(c, x + 2, y - 8 - hop, P.ink);
      R(c, x - 3, y - 13 - hop, 6, 2, P.green); px(c, x, y - 14 - hop, P.lime);
    } else if (o.k === 'mammoth') { // shaggy, white and slow, with curly tusks
      for (var m = 0; m < 4; m++) R(c, x - 8 + m * 4, y - 5, 2, 5, P.silver);
      ell(c, x, y - 10, 11, 7, P.white); for (var q = 0; q < 8; q++) px(c, x - 9 + q * 2.5, y - 4, P.silver);
      ell(c, x + 10, y - 13, 5, 5, P.white); px(c, x + 12, y - 14, P.ink); line(c, x + 14, y - 11, x + 15, y - 4, P.silver); line(c, x + 12, y - 9, x + 17, y - 9, P.sand); px(c, x + 17, y - 10, P.sand);
    } else if (o.k === 'serpent') { // a long frosty wiggle
      for (var sg = 0; sg < 12; sg++) { var sx = x - sg * 3, sy = y - 3 + Math.round(Math.sin(f * 0.6 + sg * 0.8) * 2); disc(c, sx, sy, sg < 1 ? 3 : 2, sg % 2 ? P.cyan : P.white); }
      px(c, x + 1, y - 5 + Math.round(Math.sin(f * 0.6) * 2), P.ink); if (f % 6 < 2) R(c, x + 3, y - 3 + Math.round(Math.sin(f * 0.6) * 2), 3, 1, P.red);
    } else if (o.k === 'snail') { // a snail whose shell is a tiny house
      R(c, x - 8, y - 3, 16, 3, P.sand); R(c, x + 6, y - 7, 3, 4, P.sand); line(c, x + 7, y - 7, x + 8, y - 10, P.sand); px(c, x + 8, y - 11, P.ink);
      R(c, x - 6, y - 11, 10, 8, P.pink); R(c, x - 7, y - 14, 12, 3, P.red); px(c, x - 1, y - 16, P.red); R(c, x - 2, y - 8, 3, 5, P.bark); px(c, x + 2, y - 9, P.yellow);
    } else if (o.k === 'cactus') { // a cactus out for a walk
      legs(c, x, y, f, P.orange, 2, 4);
      R(c, x - 3, y - 20, 7, 14, P.green); R(c, x - 2, y - 21, 5, 1, P.green); R(c, x - 8, y - 16, 5, 3, P.green); R(c, x - 8, y - 19, 2, 3, P.green); R(c, x + 4, y - 14, 5, 3, P.green); R(c, x + 7, y - 18, 2, 4, P.green);
      px(c, x, y - 17, P.ink); px(c, x + 2, y - 17, P.ink); px(c, x, y - 22, P.pink); px(c, x + 1, y - 23, P.pink);
    } else { // a walking egg with a little door
      legs(c, x, y, f, P.ink, 2, 4);
      ell(c, x, y - 12, 6, 8, P.white); px(c, x - 3, y - 16, P.silver); R(c, x - 1, y - 11, 3, 5, P.bark); px(c, x + 1, y - 9, P.yellow); disc(c, x + 3, y - 17, 1, P.sky);
    }
    c.restore();
  };
})();
