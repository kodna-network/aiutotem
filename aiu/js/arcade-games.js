/* AIU TOTEM 2.4.0 - arcade games, part 1: Deliver, Spar, Wilds, Slice. (The screen and the rules are in arcade.js.) */
(function () {
  'use strict';
  var GM = AIU.games, A = AIU.art, P = A.P, R = GM.R, T = GM.text, W = GM.W, H = GM.H, rnd = GM.rnd, pick = GM.pick, clamp = GM.clamp;
  function app() { return AIU.app; }

  /* =====================================================================
     DELIVER: a paper route. 20 packages, 3 streets, a clock. Toss left or right onto red-flag porches (the mat is a
     bonus). The road is safe; the sidewalk is chaos: knock over trash cans and mailboxes for points, but a gnome or a
     sleeping dog sends you flying. Cars and the mail truck get in your way.
     ===================================================================== */
  var ROAD = { l: 48, r: 132 }, WALK = { l: 36, r: 144 };
  var HOUSE_COLS = [[P.red, P.pink], [P.blue, P.sky], [P.green, P.lime], [P.plum, P.pink], [P.orange, P.yellow], [P.teal, P.cyan]];
  function houseSpr(i) {
    var cl = HOUSE_COLS[i % HOUSE_COLS.length], key = 'dhouse' + i;
    return GM.spr(key, [
      '....RRRRRRRRRRRRRRRR....', '...RrrrrrrrrrrrrrrrrR...', '..RrrrrrrrrrrrrrrrrrrR..', '.RRRRRRRRRRRRRRRRRRRRRR.',
      '.awwwwwwwwwwwwwwwwwwwwa.', '.awiiwwwwwwBBwwwwwwiiwa.', '.awiiwwwwwwBBwwwwwwiiwa.', '.awwwwwwwwwBBwwwwwwwwwa.',
      '.awwwwwwwwwBBwwwwwwwwwa.', '.aaaaaaaaaaBBaaaaaaaaaa.'
    ].map(function (r) { return r.replace(/R/g, 'k').replace(/r/g, cl[0] === P.red ? 'r' : cl[0] === P.blue ? 'b' : cl[0] === P.green ? 'g' : cl[0] === P.plum ? 'p' : cl[0] === P.orange ? 'o' : 't'); }), false, 1);
  }
  var CAR_COLS = ['r', 'b', 'y', 'g', 'P', 'c', 'w'];
  function carSpr(col, truck) {
    if (truck) return GM.spr('dtruck', ['.kkkkkkkk.', 'kbbbbbbbbk', 'kbiiiiiibk', 'kbbbbbbbbk', 'kwwwwwwwwk', 'kwwwwwwwwk', 'kwwbbbbwwk', 'kwwwwwwwwk', 'kwwwwwwwwk', 'kwwwwwwwwk', 'kwwbbbbwwk', 'kwwwwwwwwk', 'kwwwwwwwwk', 'kwwwwwwwwk', 'kSSSSSSSSk', '.kkkkkkkk.'], true);
    return GM.spr('dcar' + col, ['.kkkkkk.', 'k' + col + col + col + col + col + col + 'k', 'k' + col + 'iiii' + col + 'k', 'kkiiiikk', 'k' + col + col + col + col + col + col + 'k', 'k' + col + 'wwww' + col + 'k', 'k' + col + col + col + col + col + col + 'k', 'k' + col + 'iiii' + col + 'k', 'k' + col + col + col + col + col + col + 'k', '.kkkkkk.'].map(function (r) { return r; }), true, 1);
  }
  var PKG = ['.kkkkk.', 'kWWyWWk', 'kWWyWWk', 'kyyyyyk', 'kWWyWWk', '.kkkkk.'];
  var THINGS = {
    can: { rows: ['.kkk.', 'kSSSk', 'ksssk', 'kSSSk', 'ksssk', 'kSSSk', '.kkk.'], good: true, pts: 5, word: 'CRASH!' },
    box: { rows: ['..k..', '.kbk.', 'kbbbk', 'kbwbk', 'kbbbk', '..k..', '..k..'], good: true, pts: 5, word: 'BONK!' },
    gnome: { rows: ['..r..', '.rrr.', '.rrr.', 'kaaak', '.www.', 'kbbbk', '.k.k.'], good: false, word: 'GNOME!' },
    dog: { rows: ['k...kk', 'WWWWWW', 'WWWWkW', 'W.W.W.'], good: false, word: 'WOOF!' }
  };
  GM.add({
    id: 'deliver', name: 'Deliver', hearts: 3,
    how: 'Drag to steer. Toss left or right onto red-flag porches. Sidewalk junk = points, gnomes and dogs = ouch. Dodge the cars!',
    tip: 'Look both ways, and ride where cars can see you.',
    icon: function (c) { R(c, 1, 1, 22, 22, P.green); R(c, 7, 1, 10, 22, P.dark); R(c, 11, 3, 2, 4, P.yellow); R(c, 11, 11, 2, 4, P.yellow); R(c, 9, 15, 6, 8, P.ink); R(c, 10, 16, 4, 6, P.red); c.drawImage(GM.spr('pk', PKG, false), 1, 6); R(c, 19, 5, 1, 6, P.silver); R(c, 19, 5, 3, 2, P.red); },
    level: function (G, n) {
      var goal = [6, 7, 7][n - 1], speed = 46 + n * 10, houses = [], things = [], cars = [], pk = [], scroll = 0, nextH = 30, nextC = 1.5, nextT = 2, done = 0, px = 90, tx = 90, inv = 0, hid = 0;
      G.timeMax = G.timeLeft = [32, 31, 30][n - 1]; G.stats.del = G.stats.del || 0;
      function addHouse(y) { var side = hid % 2 ? 'R' : 'L'; houses.push({ y: y, side: side, sub: Math.random() < 0.62 || houses.filter(function (h0) { return h0.sub; }).length < 2, i: hid, got: false }); hid++; }
      for (var y = 150; y > -60; y -= 34) addHouse(y);
      nextH = -60;
      G.buttons([['< Toss', function () { toss(-1); }, 'big'], ['Toss >', function () { toss(1); }, 'big']]);
      function toss(dir) { pk.push({ x: px, y: 196, vx: dir * 120, vy: -10, z: 0, vz: 60, dir: dir }); GM.sfx('toss'); }
      G.down = function (p) { tx = p.x; }; G.move = function (p, held) { if (held) tx = p.x; };
      G.key = function (k, down) { if (!down) return false; if (k === 'ArrowLeft') { tx = px - 18; return true; } if (k === 'ArrowRight') { tx = px + 18; return true; } if (k === 'a' || k === 'z') { toss(-1); return true; } if (k === 'd' || k === 'x' || k === ' ') { toss(1); return true; } return false; };
      G.update = function (dt) {
        G.timeLeft -= dt; if (G.timeLeft <= 0) return G.fail('The route ran out of time.');
        var mv = speed * dt; scroll += mv; inv = Math.max(0, inv - dt);
        px += clamp(tx - px, -110 * dt, 110 * dt); px = clamp(px, WALK.l + 4, WALK.r - 4);
        houses.forEach(function (h0) { h0.y += mv; }); things.forEach(function (t) { t.y += mv; }); pk.forEach(function (p) { p.y += mv; });
        nextH += mv; if (nextH >= -26) { addHouse(nextH - 8); nextH -= 34; }
        houses = houses.filter(function (h0) { return h0.y < H + 40; });
        nextT -= dt; if (nextT <= 0) { nextT = rnd(1.2, 2.4) - n * 0.15; var kind = Math.random() < 0.55 + n * 0.05 ? pick(['gnome', 'dog']) : pick(['can', 'box']); things.push({ k: kind, x: Math.random() < 0.5 ? WALK.l + 6 : WALK.r - 6, y: -12, hit: false }); }
        nextC -= dt; if (nextC <= 0) { nextC = rnd(1.4, 2.6) - n * 0.25; var lane = Math.random() < 0.5 ? 0 : 1, truck = Math.random() < 0.18; cars.push({ x: (lane ? 112 : 68) + rnd(-4, 4), y: -30, rel: lane ? speed * 0.5 : speed + 45 + n * 10, onc: !lane, col: pick(CAR_COLS), truck: truck }); } // right lane: slower cars you catch up to; left lane: oncoming
        cars.forEach(function (c0) { c0.y += c0.rel * dt; });
        cars = cars.filter(function (c0) { return c0.y > -60 && c0.y < H + 60; });
        // bumps
        if (!inv) {
          cars.forEach(function (c0) { var hw = c0.truck ? 6 : 5, hh = c0.truck ? 9 : 6; if (Math.abs(c0.x - px) < hw + 4 && Math.abs(c0.y - 196) < hh + 6) { inv = 1.4; GM.sfx('honk'); G.pop(px, 176, 'HONK!', P.red); G.hurt('A car got you.'); } });
          things.forEach(function (t) { if (t.hit || Math.abs(t.x - px) > 7 || Math.abs(t.y - 196) > 8) return; t.hit = true; var D = THINGS[t.k]; if (D.good) { G.score += D.pts; GM.sfx('thud'); G.burst(t.x, t.y, [P.silver, P.white, P.blue], 10); G.pop(t.x, t.y - 8, D.word, P.cyan); G.shake(2); } else { inv = 1.4; G.pop(t.x, t.y - 8, D.word, P.red); G.hurt(t.k === 'dog' ? 'You woke the dog. Wipeout!' : 'Gnome ambush. Wipeout!'); } });
        }
        // packages fly to the side and land on the lawn
        pk.forEach(function (p) {
          p.x += p.vx * dt; p.z += p.vz * dt; p.vz -= 220 * dt;
          if (p.z <= 0 && !p.land) {
            p.land = true; var hx = p.dir < 0 ? 16 : 164, hit = null;
            houses.forEach(function (h0) { if ((h0.side === 'L') === (p.dir < 0) && Math.abs(h0.y + 12 - p.y) < 14 && Math.abs(p.x - hx) < 24) hit = h0; });
            if (hit && hit.sub && !hit.got) {
              hit.got = true; done++; G.stats.del++; var mat = Math.abs(hit.y + 12 - p.y) < 5;
              G.score += mat ? 25 : 10; GM.sfx(mat ? 'great' : 'coin'); G.pop(p.x, p.y - 10, mat ? 'MAT!' : '+10', mat ? P.yellow : P.lime); G.burst(p.x, p.y, [P.yellow, P.lime], 8);
              if (done >= goal) G.clear();
            } else if (hit && !hit.sub) { G.score = Math.max(0, G.score - 5); G.pop(p.x, p.y - 10, 'NOT HERE', P.silver); GM.sfx('miss'); }
            else GM.sfx('thud');
          }
        });
        pk = pk.filter(function (p) { return !p.land || p.z > -40 && (p.fade = (p.fade || 0) + dt) < 0.6; });
      };
      G.draw = function (c) {
        R(c, 0, 0, W, H, P.green);
        var off = scroll % 16; for (var y = -16; y < H; y += 16) { R(c, 0, y + off, WALK.l, 8, '#2fa860'); R(c, WALK.r, y + off, W - WALK.r, 8, '#2fa860'); }
        R(c, WALK.l, 0, ROAD.l - WALK.l, H, P.silver); R(c, ROAD.r, 0, WALK.r - ROAD.r, H, P.silver);
        for (var y2 = -12; y2 < H; y2 += 12) { R(c, WALK.l, y2 + scroll % 12, ROAD.l - WALK.l, 1, P.slate); R(c, ROAD.r, y2 + scroll % 12, WALK.r - ROAD.r, 1, P.slate); }
        R(c, ROAD.l, 0, ROAD.r - ROAD.l, H, P.dark); R(c, ROAD.l, 0, 2, H, P.white); R(c, ROAD.r - 2, 0, 2, H, P.white);
        for (var y3 = -20; y3 < H; y3 += 20) R(c, 89, y3 + scroll % 20, 2, 10, P.yellow);
        houses.forEach(function (h0) { // a roof seen from above, a porch with a mat facing the road, a mailbox by the sidewalk
          var cl = HOUSE_COLS[h0.i % HOUSE_COLS.length], L = h0.side === 'L', x = L ? 3 : W - 29, y = h0.y;
          R(c, x + 2, y + 23, 25, 3, 'rgba(0,0,0,.22)'); R(c, x - 1, y - 1, 28, 25, P.ink);
          R(c, x, y, 13, 23, cl[0]); R(c, x + 13, y, 13, 23, cl[1]); for (var sy = y + 3; sy < y + 23; sy += 4) { R(c, x, sy, 13, 1, 'rgba(0,0,0,.18)'); R(c, x + 13, sy, 13, 1, 'rgba(255,255,255,.18)'); }
          R(c, x + 12, y, 2, 23, P.ink); R(c, x + (L ? 4 : 17), y + 3, 5, 6, P.ink); R(c, x + (L ? 5 : 18), y + 4, 3, 4, P.bark); // the ridge, the chimney
          var pxp = L ? x + 27 : x - 6; R(c, pxp, y + 6, 6, 12, P.ink); R(c, pxp + (L ? 0 : 1), y + 7, 5, 10, P.sand); R(c, pxp + (L ? 1 : 2), y + 9, 3, 6, h0.got ? P.lime : P.wood); // the porch and its mat
          GM.disc(c, L ? x + 2 : x + 24, y + 26, 3, P.green); R(c, L ? x + 1 : x + 23, y + 25, 2, 1, P.lime);
          var bx = L ? WALK.l - 4 : WALK.r + 2; R(c, bx + 1, y + 16, 1, 8, P.ink); R(c, bx - 1, y + 12, 5, 4, P.ink); R(c, bx, y + 13, 3, 2, P.silver);
          if (h0.sub && !h0.got) { R(c, bx + 3, y + 7, 1, 6, P.ink); R(c, bx + 3, y + 7, 4, 3, P.red); if (G.t % 0.8 < 0.4) R(c, bx + 4, y + 8, 2, 1, P.pink); }
          if (h0.got) { GM.disc(c, x + 13, y - 5, 4, P.ink); GM.disc(c, x + 13, y - 5, 3, P.lime); R(c, x + 11, y - 5, 1, 1, P.ink); R(c, x + 12, y - 4, 1, 1, P.ink); R(c, x + 13, y - 5, 1, 1, P.ink); R(c, x + 14, y - 6, 1, 1, P.ink); }
        });
        things.forEach(function (t) { var sp = GM.spr('dt' + t.k, THINGS[t.k].rows, true); if (t.hit && THINGS[t.k].good) { c.save(); c.translate(t.x, t.y); c.rotate(1.3); c.drawImage(sp, -sp.width / 2, -sp.height / 2); c.restore(); } else c.drawImage(sp, Math.round(t.x - sp.width / 2), Math.round(t.y - sp.height / 2)); });
        cars.forEach(function (c0) { var sp = carSpr(c0.col, c0.truck); if (c0.onc) { c.save(); c.translate(Math.round(c0.x), Math.round(c0.y)); c.rotate(Math.PI); c.drawImage(sp, -sp.width / 2, -sp.height / 2); c.restore(); } else c.drawImage(sp, Math.round(c0.x - sp.width / 2), Math.round(c0.y - sp.height / 2)); });
        pk.forEach(function (p) { var sp = GM.spr('pk', PKG, false); R(c, p.x - 3, p.y + 2, 7, 2, 'rgba(0,0,0,.25)'); c.drawImage(sp, Math.round(p.x - 3), Math.round(p.y - 3 - Math.max(0, p.z) * 0.4)); });
        // Aiu on his scooter
        if (!(inv && G.t % 0.2 < 0.1)) { R(c, px - 4, 198, 9, 12, P.ink); R(c, px - 3, 199, 7, 10, P.red); R(c, px - 2, 196, 5, 2, P.silver); R(c, px - 5, 206, 11, 2, P.ink); GM.drawAiu(c, G.me, px, 202, 0.75, inv ? 'blink' : 'happy'); R(c, px - 6, 186, 4, 4, P.wood); }
        T(c, done + '/' + goal, W - 4, 17, P.white, 8, 'right');
      };
    }
  });

  /* =====================================================================
     SPAR: box with your Aiu. Jab (three quick jabs is a combo), hold Block when the foe winds up (!), counter while it's
     dizzy for double. Fill the meter for a Special. Three rounds, three tougher foes.
     ===================================================================== */
  GM.add({
    id: 'spar', name: 'Spar', hearts: 0, fav: true,
    how: 'JAB to hit. When the foe flashes "!", hold BLOCK. A good block makes it dizzy: hit it then for double. Full meter = SPECIAL.',
    tip: 'A good guard is the best start.',
    stars: function (G) { return G.stats.hp > 60 ? 3 : G.stats.hp > 30 ? 2 : 1; },
    icon: function (c) { R(c, 1, 16, 22, 7, P.red); R(c, 1, 15, 22, 1, P.white); GM.disc(c, 8, 9, 5, P.red); R(c, 4, 7, 3, 4, P.pink); R(c, 6, 13, 5, 4, P.white); GM.disc(c, 17, 10, 4, P.blue); R(c, 15, 14, 4, 3, P.white); R(c, 12, 5, 2, 2, P.yellow); },
    level: function (G, n) {
      var me = G.me, foeCr = A.creature(Math.floor(Math.random() * 1e9), Math.min(7, 2 + n * 2), Math.floor(Math.random() * 1e9));
      var you = { hp: n === 1 ? 100 : Math.min(100, (G.stats.hp || 100) + 35), block: false, act: null, at: 0 }, foe = { hp: 70 + n * 20, max: 70 + n * 20, st: 'idle', t: 1.2, dizzy: 0, guard: false };
      var meter = 0, jabs = [], hitFx = 0, foeHit = 0, youHit = 0;
      G.timeMax = G.timeLeft = 32;
      var btns = G.buttons([['JAB', jab, 'big primary'], ['BLOCK', null, 'big hold', function (on) { you.block = on; }], ['SPECIAL', special, 'big']]);
      function setSp() { btns[2].disabled = meter < 100; btns[2].classList.toggle('ready', meter >= 100); }
      setSp();
      G.down = function (p) { if (p.x > W / 2) jab(); };
      G.key = function (k, down) { if (k === 'b' || k === 'ArrowDown') { you.block = down; return true; } if (!down) return false; if (k === 'j' || k === ' ' || k === 'ArrowRight') { jab(); return true; } if (k === 's') { special(); return true; } return false; };
      function dmgFoe(d, word) { foe.hp -= d; foeHit = 0.25; G.score += d; G.pop(128, 120, word || '-' + d, P.yellow); G.burst(124, 150, [P.yellow, P.white], 8); meter = Math.min(100, meter + 10); setSp(); if (foe.hp <= 0) { G.stats.hp = you.hp; G.score += Math.round(you.hp) + Math.round(G.timeLeft * 2); G.clear(); } }
      function jab() {
        if (you.block || you.act && G.t - you.at < 0.18) return;
        you.act = 'jab'; you.at = G.t; jabs.push(G.t); jabs = jabs.filter(function (t) { return G.t - t < 1; });
        var combo = jabs.length >= 3;
        if (foe.guard && !foe.dizzy) { GM.sfx('block'); G.pop(128, 128, 'GUARD', P.silver); return; }
        GM.sfx(combo ? 'bighit' : 'hit'); G.shake(combo ? 4 : 2);
        dmgFoe((combo ? 12 : 5) * (foe.dizzy ? 2 : 1), combo ? 'COMBO!' : null); if (combo) { jabs = []; foe.st = 'idle'; foe.t = 0.8; }
      }
      function special() { if (meter < 100 || foe.hp <= 0) return; meter = 0; setSp(); you.act = 'special'; you.at = G.t; GM.sfx('bighit'); G.shake(7); dmgFoe(28, 'SUPER!'); foe.st = 'idle'; foe.t = 1; foe.dizzy = 0; }
      G.update = function (dt) {
        G.timeLeft -= dt;
        if (G.timeLeft <= 0) { G.stats.hp = you.hp; if (you.hp / 100 >= foe.hp / foe.max) { G.score += 20; G.clear(); } else G.fail('Time! The foe had more left.'); return; }
        foe.dizzy = Math.max(0, foe.dizzy - dt); foeHit = Math.max(0, foeHit - dt); youHit = Math.max(0, youHit - dt);
        if (foe.dizzy) return;
        foe.t -= dt;
        if (foe.st === 'idle' && foe.t <= 0) { var r = Math.random(); if (r < 0.25 + n * 0.05) { foe.st = 'guard'; foe.guard = true; foe.t = rnd(0.6, 1.2); } else { foe.st = 'wind'; foe.t = Math.max(0.35, 0.8 - n * 0.13); GM.sfx('tick'); } }
        else if (foe.st === 'guard' && foe.t <= 0) { foe.st = 'idle'; foe.guard = false; foe.t = rnd(0.3, 0.8); }
        else if (foe.st === 'wind' && foe.t <= 0) {
          foe.st = 'punch'; foe.t = 0.25;
          if (you.block) { GM.sfx('block'); G.pop(70, 120, 'BLOCK!', P.cyan); foe.dizzy = 1.1; meter = Math.min(100, meter + 25); setSp(); G.score += 5; }
          else { var d = 8 + n * 4; you.hp -= d; youHit = 0.3; GM.sfx('hit'); G.shake(5); G.pop(60, 120, '-' + d, P.red); if (you.hp <= 0) { G.stats.hp = 0; G.fail('Knocked out! Block when it flashes.'); } }
        }
        else if (foe.st === 'punch' && foe.t <= 0) { foe.st = 'idle'; foe.t = rnd(0.5, 1.3) - n * 0.12; }
      };
      G.draw = function (c) {
        R(c, 0, 0, W, H, P.navy); for (var i = 0; i < 40; i++) R(c, (i * 37) % W, 24 + (i * 13) % 60, 2, 2, ['#5d6fb0', P.pink, P.yellow][i % 3]); // the crowd
        R(c, 0, 92, W, 2, P.ink); R(c, 0, 168, W, H - 168, '#b9c4d0'); R(c, 0, 168, W, 3, P.white); for (var x = 0; x < W; x += 20) R(c, x, 171, 1, H - 171, P.silver);
        [118, 134, 150].forEach(function (y, i) { R(c, 0, y, W, 2, [P.red, P.white, P.blue][i]); }); R(c, 6, 106, 4, 66, P.silver); R(c, W - 10, 106, 4, 66, P.silver);
        // foe
        var fx = 124 + (foe.st === 'punch' ? -14 : 0) + (foeHit ? 4 : 0), fy = 196, fr = foe.dizzy ? 'blink' : foeHit ? 'blink' : 'open';
        var fsp = foeCr.frames[fr] || foeCr.frames.open; c.save(); c.translate(fx, fy); c.scale(-2, 2); c.drawImage(fsp, -fsp.width / 2, -(foeCr.bottom + 1)); c.restore();
        if (foe.guard) { R(c, fx - 22, fy - 50, 6, 20, P.silver); R(c, fx - 22, fy - 50, 6, 2, P.white); }
        if (foe.st === 'wind' && G.t % 0.16 < 0.1) { R(c, fx - 4, fy - 76, 8, 16, P.red); T(c, '!', fx, fy - 76, P.white, 16, 'center', 'pixel'); }
        if (foe.dizzy) for (var s = 0; s < 3; s++) { var an = G.t * 6 + s * 2.1; R(c, fx + Math.cos(an) * 12, fy - 68 + Math.sin(an) * 3, 2, 2, P.yellow); }
        // you
        var yx = 58 + (you.act && G.t - you.at < 0.15 ? 10 : 0) + (youHit ? -5 : 0);
        GM.drawAiu(c, me, yx, 198, 2, youHit ? 'blink' : you.act === 'special' && G.t - you.at < 0.4 ? 'happy' : 'open');
        if (you.block) { R(c, yx + 14, 150, 6, 22, P.cyan); R(c, yx + 14, 150, 6, 2, P.white); }
        if (you.act && G.t - you.at < 0.15) { GM.disc(c, yx + 26, 160, 5, P.red); R(c, yx + 23, 158, 3, 2, P.pink); }
        // bars
        R(c, 6, 20, 70, 7, P.ink); R(c, 7, 21, Math.max(0, you.hp) * 0.68, 5, you.hp > 30 ? P.lime : P.red); T(c, G.me ? G.me.name : 'Aiu', 7, 28, P.white, 8);
        R(c, W - 76, 20, 70, 7, P.ink); R(c, W - 75 + 68 - Math.max(0, foe.hp / foe.max) * 68, 21, Math.max(0, foe.hp / foe.max) * 68, 5, P.orange); T(c, 'FOE ' + G.level, W - 7, 28, P.white, 8, 'right');
        R(c, 50, 228, 80, 6, P.ink); R(c, 51, 229, meter * 0.78, 4, meter >= 100 && G.t % 0.3 < 0.15 ? P.white : P.yellow); T(c, 'SPECIAL', 90, 218, meter >= 100 ? P.yellow : P.silver, 8, 'center');
      };
    }
  });

  /* =====================================================================
     WILDS: a little RPG battle. ATTACK (stop the bar in the gold for a crit), GUARD, or HEAL (two potions). When the foe
     flashes, tap to dodge. Two wild creatures, then the champ.
     ===================================================================== */
  var SYL = ['ka', 'ru', 'mi', 'zo', 'pa', 'te', 'lo', 'ni', 'bu', 'sha', 'vo', 'ri', 'gu', 'fen', 'tok'];
  function wildName() { var s = ''; for (var i = 0; i < 2 + (Math.random() < 0.3 ? 1 : 0); i++) s += pick(SYL); return s.charAt(0).toUpperCase() + s.slice(1); }
  GM.add({
    id: 'wilds', name: 'Wilds', hearts: 0,
    how: 'Your turn: ATTACK and tap again to stop the bar in the gold (crit!), GUARD, or HEAL. Their turn: tap when they flash to dodge.',
    tip: 'Rest up between big efforts.',
    stars: function (G) { return G.stats.hp > 60 ? 3 : G.stats.hp > 25 ? 2 : 1; },
    icon: function (c) { R(c, 1, 15, 22, 8, P.green); for (var j = 0; j < 12; j++) { R(c, 5 + j, 17 - j, 1, 1, P.silver); R(c, 18 - j, 17 - j, 1, 1, P.silver); } R(c, 3, 17, 4, 2, P.wood); R(c, 17, 17, 4, 2, P.wood); GM.disc(c, 12, 5, 2, P.yellow); },
    level: function (G, n) {
      var champ = n === 3, foeCr = A.creature(Math.floor(Math.random() * 1e9), champ ? 7 : 3 + n, Math.floor(Math.random() * 1e9)), name = (champ ? 'Champ ' : 'Wild ') + wildName();
      if (n === 1) { G.stats.hp = 100; G.stats.pots = 2; } else G.stats.hp = Math.min(100, G.stats.hp + 30);
      var foe = { hp: 50 + n * 22, max: 50 + n * 22, hurt: 0 }, mode = 'menu', bar = 0, barDir = 1, guard = false, t = 0, dodge = false, msg = 'Your turn!', youHurt = 0, lunge = 0;
      var btns = G.buttons([['ATTACK', attack, 'big primary'], ['GUARD', function () { if (mode !== 'menu') return; guard = true; msg = 'You brace yourself.'; GM.sfx('block'); enemyTurn(); }, 'big'], ['HEAL', heal, 'big']]);
      function setBtns() { btns.forEach(function (b) { b.disabled = mode !== 'menu'; }); btns[2].textContent = 'HEAL x' + G.stats.pots; if (!G.stats.pots) btns[2].disabled = true; }
      setBtns();
      function attack() { if (mode === 'menu') { mode = 'aim'; bar = 0; barDir = 1; msg = 'Tap to stop the bar!'; setBtns(); btns[0].disabled = false; btns[0].textContent = 'STOP!'; } else if (mode === 'aim') strike(); }
      function strike() {
        mode = 'strike'; t = 0; btns[0].textContent = 'ATTACK'; lunge = 0.3;
        var off = Math.abs(bar - 0.5), crit = off < 0.08, good = off < 0.22, d = Math.round((crit ? 26 : good ? 15 : 7) + n * 2);
        foe.hp -= d; foe.hurt = 0.35; G.score += d; GM.sfx(crit ? 'bighit' : 'hit'); G.shake(crit ? 6 : 3); G.burst(126, 104, crit ? [P.yellow, P.white, P.pink] : [P.white], crit ? 18 : 8);
        G.pop(126, 70, crit ? 'CRIT! ' + d : '-' + d, crit ? P.yellow : P.white); msg = crit ? 'A critical hit!' : good ? 'A solid hit.' : 'A glancing blow.';
        setTimeout(function () { if (!G.alive || G.paused) return; if (foe.hp <= 0) { msg = name + ' is beaten!'; G.score += Math.round(G.stats.hp); G.clear(); } else enemyTurn(); }, 600);
      }
      function heal() { if (mode !== 'menu' || !G.stats.pots) return; G.stats.pots--; G.stats.hp = Math.min(100, G.stats.hp + 35); GM.sfx('coin'); G.pop(56, 150, '+35', P.lime); G.burst(56, 170, [P.lime, P.white], 12); msg = 'A berry potion. Yum.'; setBtns(); setTimeout(function () { if (G.alive && !G.paused) enemyTurn(); }, 500); }
      function enemyTurn() { mode = 'enemy'; t = 0; dodge = false; flashAt = rnd(0.6, 1.4); setBtns(); msg = name + ' gets ready...'; }
      G.down = function () { if (mode === 'aim') strike(); else if (mode === 'enemy' && t > 0) { var w = t - flashAt; if (w >= 0 && w < 0.32 - n * 0.04) { dodge = true; } else if (!dodge && w < 0) { dodge = 'early'; } } };
      G.key = function (k, down) { if (!down) return false; if (k === ' ' || k === 'Enter') { G.down(); return true; } return false; };
      var flashAt = 0.9;
      G.update = function (dt) {
        t += dt; foe.hurt = Math.max(0, foe.hurt - dt); youHurt = Math.max(0, youHurt - dt); lunge = Math.max(0, lunge - dt);
        if (mode === 'aim') { bar += barDir * dt * (0.9 + n * 0.25); if (bar > 1) { bar = 1; barDir = -1; } if (bar < 0) { bar = 0; barDir = 1; } }
        if (mode === 'enemy') {
          if (t >= flashAt + 0.32 - n * 0.04 && mode === 'enemy') {
            mode = 'hit';
            var d = Math.round((10 + n * 5) * (guard ? 0.45 : 1) * (dodge === true ? 0 : 1));
            if (dodge === true) { G.pop(56, 140, 'DODGE!', P.cyan); GM.sfx('swoosh'); G.score += 8; }
            else { G.stats.hp -= d; youHurt = 0.35; GM.sfx('hit'); G.shake(4); G.pop(56, 140, '-' + d, P.red); }
            guard = false;
            setTimeout(function () { if (!G.alive || G.paused) return; if (G.stats.hp <= 0) { G.stats.hp = 0; G.fail('You ran out of health. Guard and dodge!'); } else { mode = 'menu'; msg = 'Your turn!'; setBtns(); } }, 500);
          }
        }
      };
      G.draw = function (c) {
        R(c, 0, 0, W, H, champ ? '#3a2a5e' : P.sky); R(c, 0, 0, W, 50, champ ? '#2a1d47' : '#7cc4f8');
        for (var i = 0; i < 6; i++) GM.ell(c, 20 + i * 32, 92, 18, 8, champ ? '#4b3678' : P.teal);
        R(c, 0, 100, W, H - 100, champ ? '#55407e' : P.green); for (var g = 0; g < 30; g++) R(c, (g * 53) % W, 104 + (g * 29) % 120, 2, 1, champ ? '#6d559a' : P.lime);
        GM.ell(c, 126, 112, 30, 7, champ ? '#6d559a' : '#2fa860'); GM.ell(c, 56, 192, 32, 8, champ ? '#6d559a' : '#2fa860');
        // the foe (with its flash when it's about to strike)
        var fsp = foeCr.frames[foe.hurt ? 'blink' : 'open'] || foeCr.frames.open, fs = champ ? 2.5 : 2, ex = 126 + (mode === 'hit' ? -24 : 0) + (foe.hurt ? (G.t % 0.1 < 0.05 ? 3 : -3) : 0);
        if (!(foe.hurt && G.t % 0.1 < 0.05)) { c.save(); c.translate(ex, 112); c.scale(-fs, fs); c.drawImage(fsp, -fsp.width / 2, -(foeCr.bottom + 1)); c.restore(); }
        if (mode === 'enemy' && t >= flashAt) { c.globalAlpha = 0.5; GM.disc(c, ex, 90, 26, P.white); c.globalAlpha = 1; T(c, 'TAP!', ex, 50, P.yellow, 16, 'center', 'pixel'); }
        // you
        if (!(youHurt && G.t % 0.1 < 0.05)) GM.drawAiu(c, G.me, 56 + lunge * 80, 194, 2, youHurt ? 'blink' : 'open');
        if (guard) { R(c, 76, 158, 5, 26, P.cyan); }
        // boxes
        function box(x, y, w, nm, hp, mx, col) { R(c, x, y, w, 20, P.ink); R(c, x + 1, y + 1, w - 2, 18, P.white); T(c, nm, x + 4, y + 2, P.ink, 8); R(c, x + 4, y + 13, w - 8, 4, P.dark); R(c, x + 4, y + 13, (w - 8) * Math.max(0, hp) / mx, 4, hp / mx > 0.3 ? col : P.red); }
        box(6, 20, 96, name, foe.hp, foe.max, P.orange); box(W - 102, 120, 96, G.me ? G.me.name : 'Aiu', G.stats.hp, 100, P.lime);
        R(c, 0, 206, W, 34, P.ink); R(c, 1, 207, W - 2, 32, P.navy); T(c, msg, 6, 212, P.white, 8);
        if (mode === 'aim') { R(c, 20, 226, 140, 8, P.dark); R(c, 20 + 140 * 0.28, 226, 140 * 0.44, 8, P.green); R(c, 20 + 140 * 0.42, 226, 140 * 0.16, 8, P.yellow); R(c, 18 + bar * 140, 224, 3, 12, P.white); }
      };
    }
  });

  /* =====================================================================
     SLICE: swipe the shells and logs that fly up. Skip the rainbow eggs. Three fast waves, each with a goal.
     ===================================================================== */
  var SL = {
    shell: ['....kkkk....', '..kkPPPPkk..', '.kPPrPPrPPk.', 'kPPrPPPPrPPk', 'kPrPPrrPPrPk', 'kPPPPrrPPPPk', '.kkPPPPPPkk.', '...kkoook...', '....koook...', '.....kkk....'],
    log: ['.kkkkkkkkkk.', 'kBWWBWWWBaak', 'kWWBWWBWWaWk', 'kBWWWBWWBaak', '.kkkkkkkkkk.'],
    melon: ['...kkkkkk...', '.kkgugugukk.', 'kgugugugugug', 'kugugugugugk', 'kgugugugugug', '.kkgugugukk.', '...kkkkkk...'],
    egg: ['...kkkk...', '..kwwwwk..', '.kwiwwwwk.', '.kwwwwiwk.', 'kwwPwwwwwk', 'kwwwwwlwwk', '.kwwwwwwk.', '..kkkkkk..']
  };
  GM.add({
    id: 'slice', name: 'Slice', hearts: 3,
    how: 'Swipe across the shells, logs and melons as they fly up. Never cut a rainbow egg. 3 or more in one swipe is a combo!',
    tip: 'In a real kitchen, always cut away from your fingers.',
    icon: function (c) { c.drawImage(GM.spr('slm', SL.melon, false), 6, 9); for (var i = 0; i < 16; i++) R(c, 3 + i, 20 - i, 1, 1, P.white); },
    level: function (G, n) {
      var goal = [12, 16, 20][n - 1], got = 0, items = [], halves = [], trail = [], spawn = 0.4, swipeN = 0, swipeT = 0, down = false, lp = null;
      G.timeMax = G.timeLeft = 24;
      G.buttons([]);
      function throwOne() {
        var egg = Math.random() < 0.16 + n * 0.06, k = egg ? 'egg' : pick(['shell', 'log', 'melon']);
        items.push({ k: k, x: rnd(30, W - 30), y: H + 14, vx: rnd(-28, 28), vy: -rnd(200, 240) - n * 8, rot: 0, vr: rnd(-4, 4), r: 12 });
      }
      G.down = function (p) { down = true; lp = p; trail = [p]; swipeN = 0; swipeT = 0; };
      G.up = function () { down = false; if (swipeN >= 3) { var b = swipeN * 5; G.score += b; G.pop(lp ? lp.x : W / 2, lp ? lp.y : H / 2, 'COMBO x' + swipeN, P.yellow); GM.sfx('great'); G.timeLeft = Math.min(G.timeMax, G.timeLeft + 2); } swipeN = 0; };
      G.move = function (p) {
        if (!down || !lp) return; trail.push(p); if (trail.length > 8) trail.shift();
        var dx = p.x - lp.x, dy = p.y - lp.y, len = Math.hypot(dx, dy); if (len < 2) return;
        if (len > 6) GM.sfx('swoosh');
        items.forEach(function (it) {
          if (it.cut) return;
          var t0 = clamp(((it.x - lp.x) * dx + (it.y - lp.y) * dy) / (len * len), 0, 1), qx = lp.x + dx * t0, qy = lp.y + dy * t0;
          if (Math.hypot(it.x - qx, it.y - qy) < it.r + 2) {
            it.cut = true;
            if (it.k === 'egg') { GM.sfx('boom'); G.shake(7); G.burst(it.x, it.y, [P.pink, P.cyan, P.yellow, P.lime], 22, 80); G.pop(it.x, it.y - 10, 'EGG!', P.red); G.hurt('You cracked a rainbow egg.'); return; }
            got++; swipeN++; G.score += 5; GM.sfx('slice'); G.burst(it.x, it.y, it.k === 'melon' ? [P.red, P.green] : it.k === 'log' ? [P.wood, P.sand] : [P.pink, P.white], 10);
            var ang = Math.atan2(dy, dx); [-1, 1].forEach(function (s) { halves.push({ k: it.k, x: it.x, y: it.y, vx: it.vx + Math.cos(ang + s * 1.57) * 40, vy: it.vy * 0.4 + Math.sin(ang + s * 1.57) * 40, rot: it.rot, vr: s * 6, side: s }); });
            if (got >= goal) G.clear();
          }
        });
        lp = p;
      };
      G.update = function (dt) {
        G.timeLeft -= dt; if (G.timeLeft <= 0) return G.fail(got + ' of ' + goal + '. Swipe faster!');
        spawn -= dt; if (spawn <= 0) { var k = 1 + (Math.random() < 0.3 + n * 0.1 ? 1 : 0) + (n === 3 && Math.random() < 0.3 ? 1 : 0); for (var i = 0; i < k; i++) throwOne(); spawn = rnd(0.8, 1.3) - n * 0.12; }
        items.forEach(function (it) { it.x += it.vx * dt; it.y += it.vy * dt; it.vy += 200 * dt; it.rot += it.vr * dt; });
        items = items.filter(function (it) { if (it.cut) return false; if (it.y > H + 20 && it.vy > 0) { if (it.k !== 'egg') { G.pop(it.x, H - 20, 'MISS', P.silver); GM.sfx('miss'); G.hurt('Too many got away.'); } return false; } return true; });
        halves.forEach(function (it) { it.x += it.vx * dt; it.y += it.vy * dt; it.vy += 260 * dt; it.rot += it.vr * dt; });
        halves = halves.filter(function (it) { return it.y < H + 30; });
        if (!down && trail.length) trail.shift();
      };
      G.draw = function (c) {
        R(c, 0, 0, W, H, '#c98a52'); for (var y = 0; y < H; y += 12) { R(c, 0, y, W, 1, P.wood); for (var x = (y / 12) % 2 * 20; x < W; x += 40) R(c, x, y, 1, 12, P.wood); } // a cutting board
        items.forEach(function (it) { var sp = GM.spr('sl' + it.k, SL[it.k], true, 2); c.save(); c.translate(Math.round(it.x), Math.round(it.y)); c.rotate(it.rot); c.drawImage(sp, -sp.width / 2, -sp.height / 2); c.restore(); if (it.k === 'egg' && G.t % 0.3 < 0.15) { R(c, it.x - 1, it.y - 14, 2, 2, P.white); R(c, it.x + 8, it.y - 6, 2, 2, P.yellow); } });
        halves.forEach(function (it) { var sp = GM.spr('sl' + it.k, SL[it.k], true, 2); c.save(); c.translate(Math.round(it.x), Math.round(it.y)); c.rotate(it.rot); c.beginPath(); c.rect(it.side < 0 ? -sp.width / 2 : 0, -sp.height / 2, sp.width / 2, sp.height); c.clip(); c.drawImage(sp, -sp.width / 2, -sp.height / 2); c.restore(); });
        for (var i = 1; i < trail.length; i++) { c.globalAlpha = i / trail.length; GM.line(c, trail[i - 1].x, trail[i - 1].y, trail[i].x, trail[i].y, P.white); GM.line(c, trail[i - 1].x + 1, trail[i - 1].y, trail[i].x + 1, trail[i].y, P.cyan); } c.globalAlpha = 1;
        T(c, got + '/' + goal, W - 4, 17, P.white, 8, 'right');
      };
    }
  });
})();
