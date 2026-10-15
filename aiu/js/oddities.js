/* AIU TOTEM 2.7.0 - the oddities: now and then a strange, friendly creature wanders through Aiu's world. Since 2.7.0
   every one is two animals fused into one (no more animals mixed with things): an owl-cat, a giraffe-turtle, a
   koala-snail, a camel-snail, a jackalope (a hare with antlers), a walrus-mammoth, a fox-snake, a frog-duck, a crab-dog,
   a fish on bird legs, and the big shy forest walker. Our own pixel art (KODNA Network), a different crowd in each land.
   One at a time, about half the time, for under a minute; the same on every device (it follows the clock). Tap one and it
   says hello. The 2.4.0 crowd (with the berry, the egg with a door and the snail with a house) is in _archive. */
(function () {
  'use strict';
  var U = AIU.util, A = AIU.art, P = A.P, K = A.prim, R = K.R, px = K.px, disc = K.disc, ell = K.ell, line = K.line;
  var LIST = {
    meadow: ['owlcat', 'giraffeturtle', 'fishbird', 'koalasnail', 'walker'], forest: ['walker', 'owlcat', 'koalasnail', 'jackalope'],
    desert: ['camelsnail', 'jackalope', 'giraffeturtle'], tundra: ['walrusmammoth', 'foxsnake', 'walker'],
    pond: ['frogduck', 'fishbird', 'giraffeturtle', 'koalasnail'], beach: ['crabdog', 'frogduck', 'fishbird']
  };
  var NAME = { owlcat: 'an owl-cat, all eyes and whiskers', giraffeturtle: 'a giraffe-turtle, slow and tall', koalasnail: 'a koala-snail, sleepy and slimy', camelsnail: 'a camel-snail with a spiral hump',
    jackalope: 'a jackalope: a hare with antlers', walrusmammoth: 'a walrus-mammoth, tusks and flippers', foxsnake: 'a fox-snake, slithering through', frogduck: 'a frog-duck, quack-ribbit',
    crabdog: 'a crab-dog, wagging its claws', fishbird: 'a fish out for a stroll on bird legs', walker: 'the big shy forest walker' };
  var PERIOD = 140, DUR = 56;
  // where it walks: the far rise (behind the stream, for the tall ones) or the field in front
  var LANE = { walker: 84, giraffeturtle: 86, walrusmammoth: 86, camelsnail: 86, foxsnake: 86, owlcat: 110, koalasnail: 108, jackalope: 110, frogduck: 112, crabdog: 112, fishbird: 112 };
  var W = { walker: 10, giraffeturtle: 12, walrusmammoth: 13, camelsnail: 11, foxsnake: 14, owlcat: 10, koalasnail: 9, jackalope: 8, frogduck: 8, crabdog: 10, fishbird: 8 };
  var HGT = { walker: 24, giraffeturtle: 22, walrusmammoth: 16, camelsnail: 18, foxsnake: 10, owlcat: 14, koalasnail: 12, jackalope: 14, frogduck: 12, crabdog: 12, fishbird: 14 };
  A.oddNow = function (sc) {
    if (!sc || A.isRoom(sc) || !sc.stage) return null;
    if (A.oddTest) { var kt = A.oddTest.k; return { k: kt, x: A.oddTest.x, y: LANE[kt] || 110, dir: 1, eat: !!A.oddTest.eat, f: sc.f, name: NAME[kt] }; } // (for the tests)
    var t = sc.tsec || 0, i = Math.floor(t / PERIOD), r = U.rng(U.hash32('odd' + i + (sc.biome || 'meadow'))), u = t - i * PERIOD;
    if (r() > 0.6 || u > DUR) return null; // about half the time
    var kinds = LIST[sc.biome] || LIST.meadow, k = kinds[Math.floor(r() * kinds.length)], dir = r() < 0.5 ? 1 : -1, p = u / DUR;
    var x0 = dir > 0 ? -28 : 220, x1 = dir > 0 ? 220 : -28, x = x0 + (x1 - x0) * p, eat = false;
    if (p > 0.45 && p < 0.58) { x = x0 + (x1 - x0) * 0.45; eat = true; } // it stops for a moment in the middle (a look around, a wave)
    else if (p >= 0.58) x = x0 + (x1 - x0) * (p - 0.13) / 0.87;
    return { k: k, x: Math.round(x), y: LANE[k] || 110, dir: dir, eat: eat, f: sc.f, name: NAME[k] };
  };
  A.oddHit = function (pt, sc) { var o = A.oddNow(sc); if (!o || !pt) return null; var w = (W[o.k] || 10) + 2, hgt = (HGT[o.k] || 14) + 2; return Math.abs(pt.x - o.x) <= w && pt.y <= o.y + 3 && pt.y >= o.y - hgt ? o : null; };

  // sprites (facing right; the bottom row stands on the ground); letters are the art palette (k ink, B bark, W wood, a sand...)
  var SQ_TOP = [
    '.....BBBB.......', '....BBBBBB......', '....BBBBaaa.....', '....BBBakaa.....', '....BBBBaaa.....', '...BBBBBBBa.....',
    '..BBBBBBBBBB....', '.BBBWBBBBBBBB...', '.BBBBBBBBWBBBB..', '.BBWBBBBBBBBBB..', 'BBBBBBBBBBBB.BB.', 'BBB.BBBWBBBB.BB.',
    'BB..BBBBBBBB.BB.', 'BB..BBBBBWBB..BB', 'aa..BBBBBBBB..aa', '....BBBBBBBB....'];
  var SQ_LEG1 = ['....BBBB.BBBB...', '...BBBB...BBBB..', '...BBB.....BBB..', '..BBB.......BBB.', '..BBB........BB.', '.aaaa.......aaaa'];
  var SQ_LEG2 = ['....BBBBBBB.....', '.....BBBBBB.....', '.....BBB.BBB....', '.....BBB.BBB....', '.....BBB..BB....', '....aaaa.aaaa...'];
  var SQ_LEG0 = ['....BBBB.BBB....', '....BBB...BBB...', '....BBB...BBB...', '....BBB...BBB...', '....BBB...BBB...', '...aaaa..aaaa...'];
  var SPR = {
    owlcat: { top: [ // a cat's body and tail, an owl's face: ear tufts, huge eyes, a little beak, folded wings
      '...............B...B.', '...............BB.BB.', '.B.............BBBBB.', '.B............BwwBwwB', '.B............BwkBwkB', '..B...........BBBoBBB',
      '..BBBBBBBBBBBBBBBBBB.', '..BWWaWWaWWaWWWWWBB..', '..BWaWWaWWaWWWWWWB...', '..BWWWWWWWWWWWWWWB...', '...BBBBBBBBBBBBBBB...'],
      legs: [['...B.B.......B.B.....', '...B..B......B..B....'], ['....BB........BB.....', '....BB........BB.....']] },
    giraffeturtle: { top: [ // a turtle's shell and stubby legs, a giraffe's long spotted neck and head
      '....................a.a', '...................aaaa', '...................aaak', '..................aaaaa', '..................aBa..', '.................aaa...',
      '.................aBa...', '................aaa....', '................aBa....', '....ggggggg....aaa.....', '...glglglglg..aBa......', '..gglglglglggaaa.......',
      '.gggggggggggggg........', '.SSSSSSSSSSSSS.........'],
      legs: [['..aa..aa..aa..aa.......'], ['...aa..aa..aa..aa......']] },
    koalasnail: { top: [ // a snail's foot and spiral shell, a koala's head: round grey ears, a big black nose
      '..........ss.....ss', '.........sSss...sSss', '...BBBB...sssssssss.', '..BWWWWB...swkssskw.', '.BWBBBWWB..sssskkss.', '.BWBWBWWB...sssksss.',
      '.BWBBWWWB....sssss..', '..BWWWWB.aaaaaaaaa..', 'aaaaaaaaaaaaaaaaaaa.', '.aaaaaaaaaaaaaaaaa..'],
      legs: [['...................'], ['...................']] },
    camelsnail: { top: [ // a camel, but its hump is a spiral snail shell
      '.......BBBBB.........', '......BWBBBWB.....aa.', '......BWBWBWB....aaak', '......BWBBWWB....aaaa', '.......BBBBB.....aa..', '...aaaaaaaaaaaaaaa...',
      '..aaaaaaaaaaaaaaaa...', '.aaaaaaaaaaaaaaaaa...', '.aaaaaaaaaaaaaaaa....', '..aaaaaaaaaaaaaa.....'],
      legs: [['...a..a......a..a....', '...a..a......a..a....', '..aa.aa.....aa.aa....'], ['....aa........aa.....', '....aa........aa.....', '...aaa.......aaa.....']] },
    jackalope: { top: [ // a hare with a deer's antlers
      '..........W.W.W..', '..........WWWW.W.', '...........WsWsW.', '............ss.ss', '...........sssss.', '...........sksss.',
      '...sssssssssssssP', '.wwsssssssssssss.', '..sssssssssssss..'],
      legs: [['...ss.......ss...', '..ss.........ss..'], ['....ss.....ss....', '....ss.....ss....']] },
    walrusmammoth: { top: [ // a shaggy white mammoth with a trunk, a walrus's tusks and flippers
      '....wwwwwwwwww.......', '..wwwwswwwwswwww.....', '.wwswwwwwswwwwwwww...', 'wwwwwwswwwwwwwwkwww..', 'wwswwwwwwwswwwwwwwwww',
      'wwwwwwwwwwwwwwwwwsww.', '.wwwwswwwwwwwwwwa.ww.', '..wwwwwwwwwwwww.a.w..', '...................w.'],
      legs: [['..SSS.....SSSS.......', '.SSSS....SSSS........'], ['...SSS.....SSS.......', '...SSSS....SSSS......']] },
    frogduck: { top: [ // a frog's green body, a duck's bill and tail feathers and orange webbed feet
      '.........gg.gg..', '........gwkgwk..', '........ggggggoo', '.........gggggoo.', '..lggggggggggg...', 'llgggglgggglgg...',
      '.lggglggggggg....', '..ggggggggggg....'],
      legs: [['...oo.....oo.....', '..ooo....ooo.....'], ['....oo...oo......', '...ooo..ooo......']] },
    crabdog: { top: [ // a dog's body and wagging tail, a crab's eye stalks and two big red claws
      '...............k.k..', '...............r.r..', '..............WWWWW.', '.W............WWWWWk', '..W..........WWWWWW.', '...WWWWWWWWWWWWWW.rr.',
      '...WWWWWWWWWWWWWWrrrr', '...WWWWWWWWWWWWW..rr.', '....BBBBBBBBBBBB.....'],
      legs: [['....W.W.....W.W......', '....W..W....W..W.....'], ['.....WW.....WW.......', '.....WW.....WW.......']] }
  };
  function outlined(c, x, y, rows) { var ink = rows.map(function (r) { return r.replace(/[^.]/g, 'k'); }); [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(function (q) { K.spr(c, x + q[0], y + q[1], ink); }); K.spr(c, x, y, rows); }
  function sprite(c, o, f) {
    var S0 = SPR[o.k], legs = S0.legs[o.eat ? 0 : (Math.floor(f / 3) % 2)], rows = S0.top.concat(legs), w = 0;
    rows.forEach(function (r) { w = Math.max(w, r.length); });
    var bob = !o.eat && Math.floor(f / 3) % 2 ? -1 : 0;
    outlined(c, o.x - Math.floor(w / 2), o.y - rows.length + bob, rows);
    return { w: w, h: rows.length };
  }
  A.drawOdd = function (c, o, sc) {
    var x = o.x, y = o.y, f = sc.f, d = o.dir;
    c.save(); c.translate(x, 0); c.scale(d, 1); c.translate(-x, 0);
    ell(c, x, y, (W[o.k] || 10), 2, P.dark); // its shadow, so it reads as standing in the field
    if (o.k === 'walker') { // the big, shy forest walker (a sasquatch): hunched, shaggy, long arms, a long stride
      var top = SQ_TOP, legsA = f % 8 < 4 ? SQ_LEG1 : SQ_LEG2, rows = o.eat ? top.concat(SQ_LEG0) : top.concat(legsA);
      outlined(c, x - 8, y - rows.length, rows);
      if (o.eat && f % 6 < 3) { line(c, x + 4, y - 17, x + 9, y - 26, P.ink); line(c, x + 5, y - 17, x + 10, y - 26, P.bark); R(c, x + 9, y - 28, 3, 3, P.sand); } // a shy little wave
    } else if (o.k === 'fishbird') { // a fish on two orange bird legs (already two animals in one)
      for (var i = 0; i < 2; i++) { var lx = x + (i - 0.5) * 4, st = (f + i * 2) % 4 < 2 ? 1 : 0; line(c, lx, y - 7, lx + (st ? 1 : -1), y, P.orange); line(c, lx + (st ? 1 : -1), y, lx + (st ? 3 : 1), y, P.orange); }
      ell(c, x, y - 11, 8, 5, P.ink); ell(c, x, y - 11, 7, 4, P.sky); ell(c, x + 1, y - 12, 5, 2, P.cyan); R(c, x - 11, y - 15, 3, 8, P.blue); R(c, x - 12, y - 16, 2, 2, P.ink); R(c, x - 12, y - 7, 2, 2, P.ink);
      px(c, x + 5, y - 12, P.white); px(c, x + 5, y - 12, P.ink); px(c, x + 7, y - 10, P.red); for (var sc2 = 0; sc2 < 3; sc2++) px(c, x - 3 + sc2 * 3, y - 10, P.blue);
    } else if (o.k === 'foxsnake') { // a long frosty serpent with a fox's head: pointed ears, a white muzzle
      for (var sg = 12; sg >= 1; sg--) { var sx = x - sg * 3, sy = y - 3 + Math.round(Math.sin(f * 0.6 + sg * 0.8) * 2); disc(c, sx, sy, 3, P.ink); disc(c, sx, sy, 2, sg % 2 ? P.orange : P.white); }
      var hy = y - 5 + Math.round(Math.sin(f * 0.6) * 2);
      disc(c, x + 2, hy, 5, P.ink); disc(c, x + 2, hy, 4, P.orange); R(c, x + 4, hy, 4, 3, P.white); px(c, x + 8, hy + 1, P.ink);
      R(c, x - 1, hy - 7, 2, 4, P.ink); px(c, x, hy - 6, P.orange); R(c, x + 3, hy - 7, 2, 4, P.ink); px(c, x + 4, hy - 6, P.orange); px(c, x + 3, hy - 1, P.ink);
      if (f % 6 < 2) R(c, x + 8, hy + 2, 3, 1, P.red);
    } else if (SPR[o.k]) sprite(c, o, f);
    if (o.eat && o.k !== 'walker' && f % 8 < 4) { px(c, x + 2, y - (HGT[o.k] || 14) - 4, P.white); px(c, x + 3, y - (HGT[o.k] || 14) - 5, P.white); } // a little "hm?" puff while it stops
    c.restore();
  };
})();
