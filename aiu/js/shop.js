/* AIU TOTEM 2.5.0 - the wallet and the Corner Mart (the Shop tab).
   Tokens: every growth point Aiu earns (from 2.5.0 on) also drops one token in your wallet, and every wallet starts with
   100. They're kept like everything else in Aiu (events), so every device shows the same balance. Not real money and
   not a real cryptocurrency: just a wallet styled like one, with an address and a ledger.
   The Corner Mart sells looks: hats and faces for Aiu, things for the pet to wear, something for the yard, and art for
   the bedroom wall and rugs for the living room. All pixel art is KODNA Network's own; the shop is our own little corner store, styled after
   the cosy shops in classic handheld adventure games (no one else's names, pictures or music). */
(function () {
  'use strict';
  var U = AIU.util, h = U.h, ui = AIU.ui, A = AIU.art, P = A.P;
  var S0 = AIU.shop = {};
  var PN = AIU.panels;
  function app() { return AIU.app; }
  function K() { return ui.k; }
  var COL = { k: '#1a1c2c', r: '#b13e53', P: '#f5a3b5', o: '#ef7d57', y: '#ffcd75', l: '#a7f070', g: '#38b764', t: '#257179', n: '#29366f', b: '#3b5dc9', i: '#41a6f6', c: '#73eff7', w: '#f4f4f4', s: '#94b0c2', S: '#566c86', d: '#333c57', W: '#a0673e', B: '#6b3f2a', a: '#f2d59a', p: '#5d275d' };

  /* ---------- the catalog ---------- */
  var SLOTS = [['week', 'This week', 'this week only'], ['treat', 'Treats', 'right now'], ['hat', 'Hats', 'Aiu'], ['face', 'Faces', 'Aiu'], ['pet', 'Pet', 'the pet'], ['gear', 'Pet gear', 'the pet'], ['yard', 'Yard', 'the yard'], ['wall', 'Wall art', 'the bedroom wall'], ['rug', 'Rugs', 'the living room'], ['design', 'Room designs', 'any room in the castle']];
  var SLOTNAME = {}; SLOTS.forEach(function (x) { SLOTNAME[x[0]] = x; });
  function frame(w, hh, inner) { return function (c) { c.fillStyle = COL.B; c.fillRect(0, 0, w, hh); c.fillStyle = COL.W; c.fillRect(1, 1, w - 2, hh - 2); inner(c, 2, 2, w - 4, hh - 4); }; }
  function fill(c, x, y, w, hh, k) { c.fillStyle = COL[k] || k; c.fillRect(x, y, w, hh); }
  var ITEMS = [
    { id: 'hat-party', slot: 'hat', name: 'Party Hat', price: 30, desc: 'A striped cone with a pom-pom. Every day is a party.', rows: ['...w...', '...y...', '..ryr..', '..yry..', '.ryryr.', 'yryryry'] },
    { id: 'hat-beanie', slot: 'hat', name: 'Beanie', price: 35, desc: 'Warm, soft and a little bit cool.', rows: ['...w...', '..bbb..', '.bbbbb.', 'bbbbbbb', 'iiiiiii'] },
    { id: 'hat-cap', slot: 'hat', name: 'Ball Cap', price: 40, desc: 'A red cap with a long brim, for sunny days.', rows: ['..rrrrr...', '.rrrwrrr..', '.rrrrrrrrrr'] },
    { id: 'hat-flowers', slot: 'hat', name: 'Flower Crown', price: 45, desc: 'Pink and yellow blossoms, woven by hand.', rows: ['P.y.P.y.P', 'gPgygPgyg'] },
    { id: 'hat-top', slot: 'hat', name: 'Top Hat', price: 60, desc: 'Tall, black and very proper.', rows: ['..kkkkk..', '..kkkkk..', '..kkkkk..', '..rrrrr..', 'kkkkkkkkk'] },
    { id: 'hat-wizard', slot: 'hat', name: 'Star Hat', price: 80, desc: 'A tall navy hat with stars. Makes thinking easier.', rows: ['....n....', '...nnn...', '...nyn...', '..nnnnn..', '..nnnyn..', 'nnnnnnnnn'] },
    { id: 'hat-crown', slot: 'hat', name: 'Little Crown', price: 120, desc: 'Gold with a red and a blue gem. For royalty.', rows: ['y..y..y', 'yy.y.yy', 'yyyyyyy', 'yryiyry'] },
    { id: 'face-glasses', slot: 'face', name: 'Round Glasses', price: 35, desc: 'For reading the bounty board up close.', rows: ['.kkk.kkk.', 'kiwkkkiwk', '.kkk.kkk.'], dy: -1 },
    { id: 'face-shades', slot: 'face', name: 'Sunglasses', price: 50, desc: 'Dark lenses. Very cool, very calm.', rows: ['kkkkkkkkk', 'kddkkkddk', '.kk...kk.'], dy: -1 },
    { id: 'face-blush', slot: 'face', name: 'Rosy Cheeks', price: 20, desc: 'A happy little blush.', rows: ['PP.....PP'], dy: 2 },
    { id: 'face-stache', slot: 'face', name: 'Mustache', price: 30, desc: 'A fine, bushy mustache.', rows: ['.BB.BB.', 'BBBBBBB', 'B.....B'], dy: 3 },
    { id: 'pet-bandana', slot: 'pet', name: 'Bandana', price: 25, desc: 'A red bandana with white dots.', rows: ['rrrrrrr', '.rwrwr.', '..rrr..', '...r...'], at: 'neck' },
    { id: 'pet-bell', slot: 'pet', name: 'Bell Collar', price: 30, desc: 'Jingles when the pet runs.', rows: ['ooooooo', '...y...', '..yky..'], at: 'neck' },
    { id: 'pet-bow', slot: 'pet', name: 'Pink Bow', price: 25, desc: 'A big pink bow for the top of the head.', rows: ['PP.PP', 'PPPPP', 'PP.PP'], at: 'head' },
    { id: 'pet-tophat', slot: 'pet', name: 'Tiny Top Hat', price: 40, desc: 'The pet\'s very own top hat.', rows: ['.kkk.', '.kkk.', '.rrr.', 'kkkkk'], at: 'head' },
    // 2.6.0: pet gear lives here now (it was a Settings menu). The collar, the saddle and "no gear" are free.
    { id: 'gear-collar', slot: 'gear', gear: 'collar', name: 'Collar', price: 0, desc: 'A red collar with a little gold tag. Free.', rows: ['rrrrrrr', '...y...', '..yoy..'] },
    { id: 'gear-saddle', slot: 'gear', gear: 'saddle', name: 'Saddle', price: 0, desc: 'A leather saddle for a ride. Free.', rows: ['..BBBB..', '.BWWWWB.', 'BWWWWWWB', '.B....B.', '.k....k.'] },
    { id: 'gear-none', slot: 'gear', gear: 'none', name: 'No Gear', price: 0, desc: 'Just the pet, as it is. Free.', rows: ['k...k', '.k.k.', '..k..', '.k.k.', 'k...k'] },
    { id: 'gear-backpack', slot: 'gear', gear: 'backpack', name: 'Backpack', price: 35, desc: 'A green pack for adventures.', rows: ['.ggggg.', 'glllllg', 'gttyttg', 'gtttttg', 'ggggggg'] },
    { id: 'yard-pumpkins', slot: 'yard', name: 'Pumpkin Patch', price: 50, desc: 'Two plump pumpkins by the path.', rows: ['..g....g..', '.ooo..ooo.', 'ooooooooooo', 'ooooooooooo', '.ooo..ooo..'] },
    { id: 'yard-flamingo', slot: 'yard', name: 'Lawn Flamingo', price: 60, desc: 'Pink, plastic and proud.', rows: ['..PPP', '..PkP', '..PP.', '...P.', '...P.', '.PPPP', 'PPPPP', '.PPP.', '..k..', '..k..', '..k..', '.kk..'] },
    { id: 'yard-gnome', slot: 'yard', name: 'Garden Gnome', price: 70, desc: 'A little bearded garden guard in a red cap.', rows: ['...r...', '..rrr..', '..rrr..', '.rrrrr.', '.aaaaa.', '.akaka.', '.wwwww.', 'wwwwwww', '.bbbbb.', '.bbbbb.', '.B...B.'] },
    { id: 'yard-birdbath', slot: 'yard', name: 'Birdbath', price: 80, desc: 'A stone bowl of water for passing birds.', rows: ['.ssssssss.', 'siiiiiiiis', '.ssssssss.', '....ss....', '....ss....', '....ss....', '...ssss...', '..ssssss..'] },
    { id: 'yard-lantern', slot: 'yard', name: 'Stone Lantern', price: 90, desc: 'Glows softly when it gets dark.', rows: ['...SS...', '.SSSSSS.', 'SSSSSSSS', '.SyyyyS.', '.SyoyyS.', '.SSSSSS.', '...SS...', '...SS...', '.SSSSSS.'] },
    { id: 'wall-sunset', slot: 'wall', name: 'Sunset Painting', price: 45, desc: 'Orange sky over a calm sea.', w: 18, hh: 13, draw: frame(18, 13, function (c, x, y, w, hh) { fill(c, x, y, w, hh, 'o'); fill(c, x, y, w, 3, 'r'); fill(c, x + 5, y + 3, 5, 2, 'y'); fill(c, x, y + 6, w, hh - 6, 'b'); fill(c, x + 3, y + 7, 8, 1, 'i'); }) },
    { id: 'wall-stars', slot: 'wall', name: 'Star Map', price: 50, desc: 'The night sky, dot by dot.', w: 16, hh: 14, draw: frame(16, 14, function (c, x, y, w, hh) { fill(c, x, y, w, hh, 'n'); [[2, 2], [8, 1], [11, 4], [4, 6], [9, 8], [2, 9], [12, 9], [6, 3]].forEach(function (q) { fill(c, x + q[0], y + q[1], 1, 1, q[0] % 3 ? 'y' : 'w'); }); }) },
    { id: 'wall-peaks', slot: 'wall', name: 'Mountain Photo', price: 55, desc: 'Snowy peaks under a blue sky.', w: 18, hh: 13, draw: frame(18, 13, function (c, x, y, w, hh) { fill(c, x, y, w, hh, 'i'); for (var i = 0; i < 7; i++) { fill(c, x + 2 + i, y + hh - 1 - i, 1, i + 1, 'S'); fill(c, x + 14 - i, y + hh - 1 - i, 1, i + 1, 'S'); } fill(c, x + 7, y + 3, 3, 1, 'w'); fill(c, x + 6, y + 4, 5, 1, 'w'); fill(c, x, y + hh - 1, w, 1, 'g'); }) },
    { id: 'wall-pennant', slot: 'wall', name: 'Pennant', price: 40, desc: 'A felt pennant for your favorite team.', w: 20, hh: 9, draw: function (c) { for (var i = 0; i < 18; i++) { var t = Math.round(4 - i * 4 / 18); fill(c, 2 + i, 4 - t, 1, t * 2 + 1, i % 6 < 3 ? 'r' : 'r'); } fill(c, 0, 0, 2, 9, 'B'); fill(c, 4, 4, 9, 1, 'w'); } },
    { id: 'rug-ocean', slot: 'rug', name: 'Ocean Rug', price: 40, desc: 'Round and blue, like a calm pond.', rings: ['n', 'b', 'i', 'c'] },
    { id: 'rug-meadow', slot: 'rug', name: 'Meadow Rug', price: 40, desc: 'Greens and gold, soft underfoot.', rings: ['t', 'g', 'l', 'a'] },
    { id: 'rug-rainbow', slot: 'rug', name: 'Rainbow Rug', price: 60, desc: 'Every color, ring by ring.', rings: ['p', 'b', 'g', 'y', 'o', 'r'] },
    { id: 'rug-night', slot: 'rug', name: 'Night Rug', price: 50, desc: 'Deep purple with a gold middle.', rings: ['k', 'p', 'P', 'y'] }
  ];
  // 2.6.0: this week's specials: four of these at a time, a new set every Monday (the same on every device)
  var WEEKLY = [
    { id: 'wk-scarecrow', slot: 'yard', name: 'Scarecrow', price: 70, desc: 'A friendly straw scarecrow. Here this week only.', rows: ['..yyy..', '.yyyyy.', '..aka..', '..aaa..', 'WWWWWWW', '..rrr..', '..rrr..', '..bbb..', '..W.W..', '..W.W..'] },
    { id: 'wk-snowman', slot: 'yard', name: 'Snowman', price: 70, desc: 'Coal eyes and a carrot nose. Here this week only.', rows: ['..kkk..', '..kkk..', '.kkkkk.', '..www..', '..kwk..', '..wow..', '.wwwww.', 'wwwkwww', 'wwwwwww', '.wwkww.', 'wwwwwww'] },
    { id: 'wk-sunflowers', slot: 'yard', name: 'Sunflowers', price: 55, desc: 'Three tall sunflowers. Here this week only.', rows: ['yoy.yoy.yoy', 'oko.oko.oko', 'yoy.yoy.yoy', '.g...g...g.', '.gg..g..gg.', '.g...g...g.', '.g..gg...g.'] },
    { id: 'wk-witch', slot: 'hat', name: 'Pointy Hat', price: 50, desc: 'Tall, black and a little spooky. This week only.', rows: ['...k...', '...kk..', '..kkk..', '..kkk..', '.kpppk.', 'kkkkkkkkk'] },
    { id: 'wk-bunny', slot: 'hat', name: 'Bunny Ears', price: 45, desc: 'Soft ears on a band. This week only.', rows: ['.k...k.', 'kwk.kwk', 'kPk.kPk', 'kPk.kPk', 'kwk.kwk', 'kkkkkkk'] },
    { id: 'wk-santa', slot: 'hat', name: 'Holiday Hat', price: 60, desc: 'Red with a white trim and a pom-pom. This week only.', rows: ['.....w', '...rrr', '..rrr.', '.rrrr.', 'wwwwww'] },
    { id: 'wk-starglasses', slot: 'face', name: 'Star Glasses', price: 40, desc: 'Star-shaped party glasses. This week only.', rows: ['.y...y.', 'yyykyyy', '.y...y.'], dy: -1 },
    { id: 'wk-scarf', slot: 'pet', name: 'Striped Scarf', price: 30, desc: 'A cozy scarf for the pet. This week only.', rows: ['rwrwrwr', '....rw.', '....wr.'], at: 'neck' },
    { id: 'wk-moon', slot: 'wall', name: 'Moon Print', price: 45, desc: 'A big pale moon on navy. This week only.', w: 16, hh: 14, draw: frame(16, 14, function (c, x, y, w, hh) { fill(c, x, y, w, hh, 'n'); fill(c, x + 4, y + 2, 6, 6, 's'); fill(c, x + 5, y + 3, 4, 4, 'w'); fill(c, x + 10, y + 7, 1, 1, 'y'); fill(c, x + 2, y + 9, 1, 1, 'y'); }) },
    { id: 'wk-heartrug', slot: 'rug', name: 'Heart Rug', price: 45, desc: 'Pinks and reds. This week only.', rings: ['r', 'P', 'w', 'P'] }
  ];
  WEEKLY.forEach(function (it) { it.weekly = true; ITEMS.push(it); });
  S0.weekly = function () { // this week's four (by the Monday of the week)
    var mon = AIU.core.weekOf(U.dayStr(new Date(app().trueNow ? app().trueNow() : Date.now()))), r = U.rng(U.hash32('mart' + mon)), pool = WEEKLY.slice(), out = [];
    while (out.length < 4 && pool.length) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
    return out;
  };
  // 2.6.0: treats: used up when you buy them (fireworks, a party, a fancy snack for the pet)
  var TREATS = [
    { id: 'tr-fireworks', name: 'Fireworks', price: 15, desc: 'A minute of fireworks over the yard.', rows: ['y.r.y', '.yry.', 'rrwrr', '.yry.', 'y.r.y'] },
    { id: 'tr-party', name: 'Confetti Party', price: 20, desc: 'Confetti rains on the yard and Aiu dances.', rows: ['r.b.y', '.g.P.', 'y.o.i', '.r.l.', 'b.y.r'] },
    { id: 'tr-snack', name: 'Fancy Pet Snack', price: 10, desc: 'A special treat: the pet\'s tummy fills right up.', rows: ['..BB..', '.BaaB.', 'BaaraB', 'BaaaaB', '.BBBB.'] }
  ];
  TREATS.forEach(function (it) { it.slot = 'treat'; it.treat = true; });
  // 3.7: room designs (for any room in the castle: its walls, floor and wall decor; the furniture stays). Default is free.
  var DPRICE = { shinto: 120, desert: 100, space: 150, colonial: 100, gothic: 130, hiphop: 120, roughcountry: 90, cleancountry: 90, stoner: 110 };
  var CSd = AIU.castle && AIU.castle.DESIGNS ? AIU.castle : null;
  function dIcon(id) { return function (c) { var pv = AIU.castle.previewDesign(id, 'living', 1); c.imageSmoothingEnabled = true; c.drawImage(pv, 0, 0, 23, 19); c.strokeStyle = COL.k; c.lineWidth = 1; c.strokeRect(0.5, 0.5, 22, 18); }; }
  if (CSd) {
    ITEMS.push({ id: 'design-default', slot: 'design', design: '', name: 'Default', price: 0, desc: 'Each room\'s own look, as it came. Always yours.', w: 23, hh: 19, draw: dIcon('') });
    CSd.DESIGN_ORDER.forEach(function (id) { var d = CSd.DESIGNS[id]; ITEMS.push({ id: 'design-' + id, slot: 'design', design: id, name: d.name, price: DPRICE[id] || 100, desc: d.desc, w: 23, hh: 19, draw: dIcon(id) }); });
  }
  var BYID = {}; ITEMS.concat(TREATS).forEach(function (it) { BYID[it.id] = it; });
  S0.ITEMS = ITEMS; S0.byId = function (id) { return BYID[id]; };

  // one canvas per item, at the world's own pixel size (and a big one for the shop)
  var cache = {};
  S0.img = function (it, scale) {
    var k = it.id + '|' + (scale || 1); if (cache[k]) return cache[k];
    var s = scale || 1, cv = document.createElement('canvas'), c;
    if (it.rings) { cv.width = 24 * s; cv.height = 12 * s; c = cv.getContext('2d'); c.scale(s, s); it.rings.forEach(function (col, i) { var rx = 11 - i * 2, ry = 5 - i * 0.8; c.fillStyle = COL[col]; c.beginPath(); c.ellipse(12, 6, Math.max(1, rx), Math.max(0.6, ry), 0, 0, Math.PI * 2); c.fill(); }); }
    else if (it.draw) { cv.width = it.w * s; cv.height = it.hh * s; c = cv.getContext('2d'); c.scale(s, s); it.draw(c); }
    else { var w = 0; it.rows.forEach(function (r) { w = Math.max(w, r.length); }); cv.width = w * s; cv.height = it.rows.length * s; c = cv.getContext('2d'); it.rows.forEach(function (r, y) { for (var x = 0; x < r.length; x++) { var ch = r.charAt(x); if (COL[ch]) { c.fillStyle = COL[ch]; c.fillRect(x * s, y * s, s, s); } } }); }
    cache[k] = cv; return cv;
  };

  /* ---------- what you own and what's on ---------- */
  var FREE = {}; ITEMS.forEach(function (it) { if (!it.price) FREE[it.id] = { t: 0, price: 0, free: 1 }; });
  function owned(S) { return Object.assign({}, FREE, (S && S.tokOwned) || {}); } // free things are yours from the start
  function worn(S) { var v = AIU.core.setting(S, 'cos', null); return v && typeof v === 'object' ? v : {}; }
  S0.worn = function () { return worn(app().S); };
  S0.owns = function (id) { var a = app(); return !!(a && a.S && owned(a.S)[id]); }; // (3.7: the castle asks this for room designs)
  S0.openShelf = function (cat) { M.view = 'buy'; M.cat = cat; M.sel = null; M.ask = null; M.say = null; ui.go('shop'); };
  function roomsUsing(id) { var CS = AIU.castle; if (!CS) return []; var L = CS.current(); return Object.keys(L.rooms).filter(function (t) { return (L.decor[t] || '') === id; }); }
  function useDesignSheet(it) { // which rooms wear this design: tap a room to put it on (or back to its own look)
    var CS = AIU.castle, k = K(), s; if (!CS) return;
    function draw() {
      var L = CS.current(), rows = Object.keys(L.rooms).map(function (t) {
        var cur = L.decor[t] || '', on = cur === it.design;
        return h('button', { type: 'button', cls: 'qrow', onclick: function () { var dc = Object.assign({}, L.decor); if (on || !it.design) delete dc[t]; else dc[t] = it.design; CS.save({ decor: dc }).then(function () { GM_sfx('coin'); s.remove(); useDesignSheet(it); }); } },
          h('span', { cls: 'qrtitle', text: (on ? '✓ ' : '') + CS.ROOMS[t].name }), h('span', { cls: 'small', text: on ? (it.design ? 'Wearing ' + it.name + ' (tap to go back to Default)' : 'Its own look') : 'Now: ' + (cur ? CS.DESIGNS[cur].name : 'Default') + ' (tap to use ' + it.name + ')' }));
      });
      return rows;
    }
    s = k.sheet(it.name + ': which rooms?', [h('p', { cls: 'small', text: 'Tap a room to give it this design. You can also pick a room\'s design in build mode: tap the room, then Design.' }), h('div', { cls: 'morelist' }, draw())]);
  }
  // For the scene: the canvases of whatever is on (only things you own)
  S0.sceneBits = function (S) {
    var w = worn(S), o = owned(S), out = {};
    Object.keys(w).forEach(function (slot) { var it = BYID[w[slot]]; if (it && it.slot === slot && o[it.id]) out[slot] = { it: it, img: S0.img(it), dy: it.dy || 0, at: it.at, rings: it.rings ? it.rings.map(function (k) { return COL[k]; }) : null }; });
    if (out.gear) { out.gearPref = out.gear.it.gear; delete out.gear; } // the pet's gear is drawn by the pet itself
    return out;
  };
  function wear(slot, id) {
    var a = app(), w = Object.assign({}, worn(a.S));
    if (id) w[slot] = id; else delete w[slot];
    return a.setSetting('cos', w);
  }
  function buy(it) {
    var a = app(), S = a.S;
    if (owned(S)[it.id]) return Promise.resolve('have');
    if ((S.tokens || 0) < it.price) return Promise.resolve('short');
    a.local.tbuyWatch = a.local.tbuyWatch || {}; a.local.tbuyWatch[it.id] = Date.now(); a.saveLocal(); // 2.6.0: watched until the server agrees
    return a.addEvents([{ type: 'tbuy', data: { item: it.id, price: it.price } }]).then(function () { return it.slot === 'design' ? null : wear(it.slot, it.id); }).then(function () { return 'ok'; });
  }

  function treat(it) {
    var a = app(), S = a.S;
    if ((S.tokens || 0) < it.price) return Promise.resolve('short');
    return a.addEvents([{ type: 'tspend', data: { what: it.id, price: it.price } }]).then(function () { S0.fx(it.id); return 'ok'; });
  }
  // the treats on World: fireworks in the sky, confetti, a full pet tummy
  var FX = { kind: null, until: 0, bits: [] };
  S0.fx = function (id) {
    var a = app();
    if (id === 'tr-snack') { try { if (AIU.play && AIU.play.snack) { AIU.play.snack(); AIU.play.snack(); AIU.play.snack(); } } catch (e) {} return; }
    FX.kind = id; FX.until = Date.now() + (id === 'tr-fireworks' ? 60000 : 20000); FX.bits = [];
    if (id === 'tr-party') try { a.setMode('dance', 6000); } catch (e) {}
  };
  S0.drawFx = function (c) { // world pixels (192 wide)
    if (!FX.kind || Date.now() > FX.until) { FX.kind = null; return; }
    var now = Date.now(), cols = ['#ffcd75', '#b13e53', '#41a6f6', '#a7f070', '#f5a3b5', '#f4f4f4', '#ef7d57'];
    if (FX.kind === 'tr-fireworks') {
      if (Math.random() < 0.12) { var cx = 20 + Math.random() * 152, cy = 10 + Math.random() * 40, col = cols[Math.floor(Math.random() * cols.length)]; for (var i = 0; i < 18; i++) { var an = i / 18 * Math.PI * 2; FX.bits.push({ x: cx, y: cy, vx: Math.cos(an) * 0.6, vy: Math.sin(an) * 0.6, t: now, col: col }); } try { if (AIU.games && AIU.games.sfx) AIU.games.sfx('pop'); } catch (e) {} }
    } else if (Math.random() < 0.7) FX.bits.push({ x: Math.random() * 192, y: -2, vx: (Math.random() - 0.5) * 0.3, vy: 0.4 + Math.random() * 0.4, t: now, col: cols[Math.floor(Math.random() * cols.length)] });
    FX.bits = FX.bits.filter(function (b) { var age = (now - b.t) / 1000; return age < (FX.kind === 'tr-fireworks' ? 1.4 : 6); });
    FX.bits.forEach(function (b) { var age = (now - b.t) / 16; c.fillStyle = b.col; c.fillRect(Math.round(b.x + b.vx * age), Math.round(b.y + b.vy * age + (FX.kind === 'tr-fireworks' ? age * age * 0.002 : 0)), 2, 2); });
  };
  // the allowance: once a day you open Aiu (the server's clock decides the day; see core.js)
  var allowTried = '';
  function claimAllowance() {
    var a = app(), S = a.S; if (!S || !S.hatched || !S.stars || S.stars.allowed) return;
    var d = U.dayStr(new Date(a.trueNow ? a.trueNow() : Date.now())); if (allowTried === d) return; allowTried = d;
    var wkNew = !Object.keys(S.allowDays || {}).some(function (x) { return AIU.core.weekOf(x) === AIU.core.weekOf(d); });
    a.addEvents([{ type: 'allow', data: { day: d } }], true).then(function () { try { ui.k.snack('Allowance: +' + (AIU.core.ALLOW_DAY + (wkNew ? AIU.core.ALLOW_WEEK : 0)) + ' tokens' + (wkNew ? ' (with the weekly bonus)' : '') + '.'); } catch (e) {} });
  }
  setInterval(function () { try { claimAllowance(); var a0 = app(); if (a0.S && AIU.core.setting(a0.S, 'vaultRescue', null)) a0.setSetting('vaultRescue', null); } catch (e) {} }, 15000); // 2.7.0: an old recovery code is retired
  S0.claimAllowance = claimAllowance;
  S0.starsText = function (S) { var st = S.stars || { lv: 0, mult: 1 }; return '★'.repeat(st.lv) + '☆'.repeat(4 - st.lv) + ' x' + st.mult; };

  /* ---------- the wallet ---------- */
  function addr(S) { var x = (U.hash32('wallet' + (S.egg ? S.egg.id : 'x')) >>> 0).toString(16).toUpperCase(); var y = (U.hash32('w2' + (S.egg ? S.egg.id : 'y')) >>> 0).toString(16).toUpperCase(); return 'AIU-' + (x + y).slice(0, 4) + '-' + (x + y).slice(4, 8) + '-' + (x + y).slice(8, 12); }
  S0.wallet = function () {
    var a = app(), S = a.S, k = K(), rows = [];
    Object.keys(S.tokDays || {}).forEach(function (d) { rows.push({ t: new Date(d + 'T12:00:00').getTime(), day: d, txt: 'Earned', n: S.tokDays[d] }); });
    (S.treats || []).forEach(function (b) { var it = BYID[b.what]; rows.push({ t: b.t, day: U.dayStr(new Date(b.t)), txt: (it ? it.name : 'A treat') + (b.pending ? ' (syncing)' : ''), n: -b.price }); });
    (S.tokBuys || []).forEach(function (b) { var it = BYID[b.item]; rows.push({ t: b.t, day: U.dayStr(new Date(b.t)), txt: 'Bought ' + (it ? it.name : b.item) + (b.pending ? ' (syncing)' : ''), n: -b.price }); });
    rows.sort(function (x, y) { return y.t - x.t; });
    var led = h('div', { cls: 'ledger' }, rows.slice(0, 40).map(function (r) { return h('div', { cls: 'lrow' }, h('span', { cls: 'small', text: U.fmtDay(r.day) }), h('span', { cls: 'ltxt', text: r.txt }), h('b', { cls: r.n < 0 ? 'neg' : 'pos', text: (r.n > 0 ? '+' : '') + r.n })); }));
    var s = k.sheet('Wallet', [
      h('div', { cls: 'wcard' }, h('span', { cls: 'wlabel', text: 'AIU TOKENS' }), h('b', { cls: 'wbal' }, ui.pix('token'), h('span', { text: ' ' + (S.tokens || 0) })), h('span', { cls: 'waddr', text: addr(S) })),
      h('p', { text: 'How tokens come in: an allowance of ' + AIU.core.ALLOW_DAY + ' every day you open Aiu (+' + AIU.core.ALLOW_WEEK + ' on the first day each week), every growth point ' + S.totemName + ' earns, and the mini-games (2 tokens a star when you win). Up to ' + AIU.core.TOK_EARN_CAP + ' earned a day, on top of the allowance. Your wallet started with ' + AIU.core.TOK_START + '.' }),
      k.btn('Go to the Shop', function () { s.remove(); ui.go('shop'); }, 'primary'),
      h('h3', { text: 'Ledger' }),
      rows.length ? led : k.empty('Nothing yet. Grow ' + S.totemName + ' (check off tiles, write, win games, look after him) and tokens drop in.'),
      h('p', { cls: 'small', text: 'Just for fun: tokens aren\'t real money or a real cryptocurrency, and they can\'t be bought or cashed out. They sync to your other devices like everything else.' })]);
  };

  /* ---------- the Corner Mart (the Shop tab) ---------- */
  var M = { view: 'menu', cat: 'hat', sel: null, say: null, ask: null };
  AIU.hooks.open.push(function () { M.view = 'menu'; M.sel = null; M.say = null; M.ask = null; });
  function clerkCanvas() { // the shop: a counter, shelves of goods, and the shopkeeper (one of Aiu's creatures)
    var W = 180, H = 84, cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2; cv.className = 'martpic';
    var c = cv.getContext('2d'); c.imageSmoothingEnabled = false; c.scale(2, 2);
    function R(x, y, w, hh, k) { fill(c, x, y, w, hh, k); }
    R(0, 0, W, H, 'w'); for (var x = 0; x < W; x += 12) R(x, 0, 6, 46, '#e9f1f7'); R(0, 0, W, 6, 'b'); R(0, 6, W, 2, 'i'); // walls, a blue stripe
    for (var sx = 0; sx < 2; sx++) { var bx = sx ? 126 : 6; R(bx, 12, 48, 34, 'B'); R(bx + 2, 14, 44, 30, 'W'); [24, 34].forEach(function (yy) { R(bx + 2, yy, 44, 2, 'B'); }); for (var g = 0; g < 7; g++) { var col = ['r', 'y', 'i', 'g', 'o', 'P', 'b'][(g + sx * 3) % 7]; R(bx + 4 + g * 6, 17, 4, 7, col); R(bx + 4 + g * 6, 27, 4, 7, ['l', 'o', 'w', 'r', 'c', 'y', 'g'][(g + sx) % 7]); R(bx + 4 + g * 6, 37, 4, 7, col); } } // shelves of goods
    for (var fx = 0; fx < W; fx += 8) for (var fy = 46; fy < H; fy += 8) R(fx, fy, 8, 8, ((fx + fy) / 8) % 2 ? '#d7e3ee' : 'w'); // checked floor
    var cr = A.creature(424242, 4, 77), fr = cr.frames.happy || cr.frames.open; c.drawImage(fr, 90 - fr.width / 2, 50 - cr.bottom - 1); // the shopkeeper
    R(56, 50, 68, 22, 'b'); R(56, 50, 68, 3, 'i'); R(58, 55, 64, 15, 'n'); R(56, 72, 68, 2, 'k'); // the counter
    R(104, 42, 14, 9, 'S'); R(105, 43, 12, 4, 'c'); R(108, 48, 6, 2, 'y'); // the register
    R(62, 45, 8, 6, 'o'); R(63, 44, 6, 1, 'g'); // a little plant on the counter
    return cv;
  }
  /* 2.9.0: buying asks in a pop-up (the clerk's box over the shop, like Aiu at the bounty board): YES buys it, NO doesn't.
     It used to ask in the box at the top of the shop, out of sight after you scrolled down to Buy. */
  function buyPop(it, doBuy) {
    var old = document.querySelector('.mpop'); if (old) old.remove();
    var msg = h('p', { text: it.name + '? Certainly. That will be ' + it.price + ' tokens. OK?' }), list = h('div');
    var back = h('div', { cls: 'mpop', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Buy ' + it.name, onclick: function (e) { if (e.target === back) close(); } },
      h('div', { cls: 'mbox mtalk mpopbox' }, h('div', { cls: 'row mpophead' }, h('span', { cls: 'mbig' }, S0.img(it, 4)), msg), list));
    function close() { back.remove(); document.removeEventListener('keydown', esc); }
    function esc(e) { if (e.key === 'Escape') close(); }
    function ask() {
      K().clear(list);
      list.appendChild(cursorList([{ label: 'YES', on: true, go: function () {
        K().clear(list); msg.textContent = 'One moment...';
        doBuy().then(function (said) { msg.textContent = said; K().clear(list); list.appendChild(cursorList([{ label: 'OK', on: true, go: function () { close(); M.say = said; ui.renderPanel(true); } }])); focus(); });
      } }, { label: 'NO', go: function () { close(); M.say = 'Is there anything else I can do for you?'; ui.renderPanel(true); } }]));
      focus();
    }
    function focus() { setTimeout(function () { var b = list.querySelector('button'); if (b) b.focus(); }, 30); }
    document.addEventListener('keydown', esc);
    document.body.appendChild(back); ask();
  }
  function box(cls, kids) { return h('div', { cls: 'mbox ' + (cls || '') }, kids); }
  function cursorList(items) { // ▶ rows, like a classic shop menu
    return h('div', { cls: 'mlist', role: 'menu' }, items.map(function (x) {
      return h('button', { type: 'button', role: 'menuitem', cls: 'mrow' + (x.on ? ' on' : '') + (x.dim ? ' dim' : ''), onclick: x.go, 'aria-label': x.aria || x.label },
        h('span', { cls: 'mcur', 'aria-hidden': 'true', text: x.on ? '▶' : '' }), x.icon || null, h('span', { cls: 'mname', text: x.label }), x.right ? h('span', { cls: 'mprice', text: x.right }) : null);
    }));
  }
  PN.shop = function () {
    var a = app(), S = a.S, k = K();
    ui.panelHead('Shop', [], null);
    var p = k.clear(ui.els.panel), tok = S.tokens || 0;
    if (!S.hatched) { p.appendChild(k.empty('The shop opens once your egg hatches.')); return; }
    var talk = M.say || (M.view === 'menu' ? 'Welcome to the Corner Mart! What can I do for you?' : M.view === 'buy' ? 'Take a look! Tap something to see it up close.' : 'Here\'s everything you own. Tap one to put it on or take it off.');
    var top = h('div', { cls: 'mtop' }, box('mwallet', [h('span', { cls: 'mlabel', text: 'WALLET' }), h('b', null, ui.pix('token'), h('span', { text: ' ' + tok }))]), h('button', { type: 'button', cls: 'btn ghost mini', text: 'Ledger', onclick: S0.wallet }));
    p.appendChild(h('div', { cls: 'mart' }, clerkCanvas(), top));
    var talkBox = box('mtalk', [h('p', { text: talk })]);
    if (M.ask) talkBox.appendChild(h('div', { cls: 'mask' }, cursorList([{ label: 'YES', on: true, go: M.ask.yes }, { label: 'NO', go: function () { M.ask = null; M.say = 'Is there anything else I can do for you?'; ui.renderPanel(true); } }])));
    if (M.view === 'menu') {
      p.appendChild(box('mmenu', [cursorList([
        { label: 'BUY', on: true, go: function () { M.view = 'buy'; M.say = null; ui.renderPanel(true); } },
        { label: 'MY STUFF', go: function () { M.view = 'mine'; M.say = null; ui.renderPanel(true); } },
        { label: 'SEE YOU!', go: function () { M.say = null; ui.go('world'); } }])]));
      p.appendChild(talkBox);
      p.appendChild(h('p', { cls: 'small', text: 'Earn tokens by growing ' + S.totemName + ': every growth point is a token. Everything here is KODNA\'s own pixel art.' }));
      return;
    }
    // the shelves: a row of category tabs, the list with prices, and the description box below
    p.appendChild(h('div', { cls: 'chips mcats', role: 'tablist' }, SLOTS.map(function (sl) { return k.btn(sl[1], function () { M.cat = sl[0]; M.sel = null; M.ask = null; M.say = null; ui.renderPanel(true); }, 'chip' + (M.cat === sl[0] ? ' on' : '')); })));
    var O = owned(S), W0 = worn(S);
    var list = M.cat === 'week' ? S0.weekly().filter(function (it) { return M.view === 'buy' || O[it.id]; }) : M.cat === 'treat' ? (M.view === 'buy' ? TREATS : []) :
      ITEMS.filter(function (it) { return it.slot === M.cat && (!it.weekly || O[it.id]) && (M.view === 'buy' || O[it.id]); }); // 2.6.0: specials stay on their own shelf until you own them
    if (!M.sel || !list.some(function (it) { return it.id === M.sel; })) M.sel = list.length ? list[0].id : null;
    var rows = list.map(function (it) {
      var have = !it.treat && !!O[it.id], on = !it.treat && it.slot !== 'design' && W0[it.slot] === it.id, nUse = it.slot === 'design' && have ? roomsUsing(it.design).length : 0;
      if (it.slot === 'design' && M.view === 'mine') return { label: it.name, on: M.sel === it.id, icon: h('span', { cls: 'micon' }, S0.img(it, 3)), right: nUse ? nUse + (nUse === 1 ? ' room' : ' rooms') : '', aria: it.name, go: function () { M.sel = it.id; M.ask = null; M.say = null; ui.renderPanel(true); } };
      return { label: it.name, on: M.sel === it.id, dim: M.view === 'buy' && !have && tok < it.price, icon: h('span', { cls: 'micon' }, S0.img(it, 3)), right: M.view === 'buy' ? (have ? (on ? 'ON' : 'OWNED') : '◆' + it.price) : (on ? 'ON' : ''),
        aria: it.name + (have ? (on ? ', wearing it' : ', owned') : ', ' + it.price + ' tokens'), go: function () { M.sel = it.id; M.ask = null; M.say = null; ui.renderPanel(true); } };
    });
    if (rows.length) p.appendChild(box('mshelf', [cursorList(rows)]));
    else p.appendChild(box('mshelf', [h('p', { text: M.view === 'mine' ? 'Nothing from this shelf yet.' : 'Sold out!' })]));
    var it = BYID[M.sel];
    if (it) {
      var have = !it.treat && !!O[it.id], on = W0[it.slot] === it.id, acts = h('div', { cls: 'row wrap' });
      if (!have) acts.appendChild(k.btn('Buy for ◆' + it.price, function () {
        if (tok < it.price) { M.say = 'Sorry! You need ' + (it.price - tok) + ' more tokens for that. Grow ' + S.totemName + ' and come back!'; GM_sfx('miss'); ui.renderPanel(true); return; }
        buyPop(it, function () { return (it.treat ? treat(it) : buy(it)).then(function (r) { GM_sfx(r === 'ok' ? 'coin' : 'miss'); return r === 'ok' ? (it.treat ? 'Here you are! Enjoy! (Go see it on World.)' : 'Here you are! Thank you! ' + S.totemName + ' put it on right away.') : r === 'short' ? 'Hmm, the wallet came up short.' : 'You already have that one!'; }); });
      }, 'primary'));
      else if (it.slot === 'design') acts.appendChild(k.btn('Use in a room...', function () { useDesignSheet(it); }, 'primary')); // 3.7
      else acts.appendChild(k.btn(on ? 'Take it off' : (it.slot === 'yard' || it.slot === 'wall' || it.slot === 'rug' ? 'Put it out' : 'Wear it'), function () { wear(it.slot, on ? null : it.id).then(function () { M.say = on ? 'Put away.' : 'Looking good!'; ui.renderPanel(true); }); }, on ? '' : 'primary'));
      if (it.slot === 'design' && AIU.castle) { var pv = h('div', { cls: 'dprevrow' }, ['living', 'kitchen', 'bedroom'].map(function (t) { var cv = AIU.castle.previewDesign(it.design, t, 1); cv.className = 'dprev'; return cv; })); p.appendChild(box('mdesc mdesign', [pv, h('div', { cls: 'col' }, h('b', { text: it.name + (it.design ? ' design' : '') }), h('p', { text: it.desc }), h('span', { cls: 'small', text: have ? (roomsUsing(it.design).length ? 'In: ' + roomsUsing(it.design).map(function (t) { return AIU.castle.ROOMS[t].name; }).join(', ') + '.' : 'Not in any room yet.') : 'Buy it once, use it in any room (the living room, kitchen and bedroom are shown).' }), acts)])); }
      else p.appendChild(box('mdesc', [h('span', { cls: 'mbig' }, S0.img(it, 6)), h('div', { cls: 'col' }, h('b', { text: it.name }), h('p', { text: it.desc }), h('span', { cls: 'small', text: it.treat ? 'Used up when you buy it.' : it.weekly ? 'This week only (yours to keep).' : 'For ' + SLOTNAME[it.slot][2] + '.' }), acts)]));
    }
    p.appendChild(talkBox);
    p.appendChild(h('div', { cls: 'row wrap' }, k.btn('< Back', function () { M.view = 'menu'; M.sel = null; M.ask = null; M.say = null; ui.renderPanel(true); }, 'ghost'),
      k.btn(M.view === 'buy' ? 'My stuff' : 'Buy more', function () { M.view = M.view === 'buy' ? 'mine' : 'buy'; M.sel = null; M.ask = null; M.say = null; ui.renderPanel(true); })));
  };
  /* 2.6.0: a purchase made offline (on two devices at once, say) can come up short when the server sees it. Then it
     doesn't go through, the tokens were never spent, and this says so plainly. */
  function watchBuys() {
    var a = app(), S = a.S, W = a.local && a.local.tbuyWatch; if (!S || !W) return;
    var pend = {}; (a.unsent || []).forEach(function (e) { if (e.type === 'tbuy' && e.data) pend[e.data.item] = 1; });
    Object.keys(W).forEach(function (id) {
      if (pend[id] || ((S.tokOwned || {})[id] || {}).pending) return; // still on its way
      var it = BYID[id], ok = !!(S.tokOwned || {})[id];
      delete W[id]; a.saveLocal();
      if (!ok && it) { var w = worn(S); if (w[it.slot] === id) wear(it.slot, null); K().sheet('A purchase didn\'t go through', [h('p', { text: it.name + ' didn\'t go through: the wallet came up short when it synced (maybe something else was bought on another device). Your tokens are back.' })]); }
    });
  }
  setInterval(function () { try { watchBuys(); } catch (e) {} }, 4000);
  function GM_sfx(kk) { try { if (AIU.games && AIU.games.sfx) AIU.games.sfx(kk); } catch (e) {} }
})();
