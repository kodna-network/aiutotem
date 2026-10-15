/* AIU TOTEM 2.4.0 - arcade games, part 2: Oil Drip (the garage), Wire It and Print Stack (the lab), Garden Defense
   (the greenhouse). Little real-world lessons, no reading needed: you learn by doing it right (or by the spark). */
(function () {
  'use strict';
  var GM = AIU.games, A = AIU.art, P = A.P, R = GM.R, T = GM.text, W = GM.W, H = GM.H, rnd = GM.rnd, pick = GM.pick, clamp = GM.clamp;

  /* =====================================================================
     OIL DRIP: slide the drain pan under the drips. Don't let it hit the floor. A loose bolt hurts; the drain plug is a
     bonus. Level 3: fill the engine back up to the line on the dipstick, not over.
     ===================================================================== */
  var NUT = ['.kkk.', 'kSsSk', 'ks.sk', 'kSsSk', '.kkk.'], PLUG = ['.kkk.', 'kyyyk', 'kyzyk', '.kyk.', '..k..'];
  GM.add({
    id: 'oildrip', name: 'Oil Drip', hearts: 3,
    how: 'Drag the pan under the oil drips. A loose bolt hurts, the gold drain plug is a bonus. Then fill the engine to the line, not over!',
    tip: 'Check your oil when the engine is cool, and never overfill it.',
    icon: function (c) { R(c, 1, 1, 22, 8, P.slate); R(c, 6, 9, 3, 2, P.ink); GM.disc(c, 7, 14, 2, P.ink); R(c, 3, 19, 18, 3, P.ink); R(c, 4, 18, 16, 2, P.silver); R(c, 7, 18, 10, 1, P.ink); },
    level: function (G, n) {
      var px = W / 2, tx = W / 2, drops = [], spills = [], bits = [], spawn = 0.5, caught = 0, goal = [14, 18, 0][n - 1], holes = [36, 62, 94, 120, 146], fill = 0.3, flow = 0, pouring = false, fills = 0, zone = [[0.6, 0.8], [0.64, 0.77], [0.67, 0.75]], settle = 0;
      G.timeMax = G.timeLeft = [24, 26, 26][n - 1];
      if (n < 3) G.buttons([]); else G.buttons([['HOLD TO POUR', null, 'big hold', function (on) { pouring = on; if (on) GM.sfx('drip'); }]]);
      G.down = function (p) { tx = p.x; }; G.move = function (p, held) { if (held) tx = p.x; };
      G.key = function (k, down) { if (n === 3 && (k === ' ' || k === 'ArrowDown')) { pouring = down; return true; } if (!down) return false; if (k === 'ArrowLeft') { tx = px - 20; return true; } if (k === 'ArrowRight') { tx = px + 20; return true; } return false; };
      G.update = function (dt) {
        G.timeLeft -= dt; if (G.timeLeft <= 0) return G.fail(n === 3 ? 'The engine still needs oil.' : 'Not enough caught in time.');
        px += clamp(tx - px, -170 * dt, 170 * dt); px = clamp(px, 16, W - 16);
        if (n < 3) {
          spawn -= dt;
          if (spawn <= 0) {
            spawn = rnd(0.75, 1.15) - n * 0.18;
            var kind = n === 2 && Math.random() < 0.22 ? 'nut' : n === 2 && Math.random() < 0.04 ? 'plug' : 'drop';
            drops.push({ k: kind, x: pick(holes) + rnd(-2, 2), y: 58, vy: kind === 'drop' ? 30 : 10, wob: 0.25 });
          }
          drops.forEach(function (d) { if (d.wob > 0) { d.wob -= dt; return; } d.vy += (d.k === 'drop' ? 260 : 200) * dt; d.y += d.vy * dt; });
          drops = drops.filter(function (d) {
            if (d.y >= 204 && d.y < 214 && Math.abs(d.x - px) < 15) {
              if (d.k === 'nut') { G.pop(d.x, 190, 'CLANG!', P.red); G.hurt('A loose bolt bonked you.'); bits.push({ x: d.x, y: 206, t: 0 }); return false; }
              if (d.k === 'plug') { G.score += 30; GM.sfx('great'); G.pop(d.x, 190, 'PLUG! +30', P.yellow); return false; }
              caught++; G.score += 5; GM.sfx('drip'); if (caught % 5 === 0) G.pop(px, 192, caught + '!', P.lime); if (caught >= goal) G.clear(); return false;
            }
            if (d.y > 226) { if (d.k === 'drop') { spills.push({ x: d.x, r: 2 }); G.pop(d.x, 214, 'SPILL', P.silver); G.hurt('Oil on the floor! Slippery.'); } return false; }
            return true;
          });
        } else {
          if (settle > 0) { settle -= dt; if (settle <= 0) { fill = 0.3; flow = 0; } return; }
          if (pouring) flow = Math.min(0.32, flow + dt * 0.7); else flow = Math.max(0, flow - dt * 1.6);
          fill += flow * dt;
          var z = zone[fills];
          if (fill > z[1] + 0.01) { G.pop(150, 70, 'OVERFILL!', P.red); settle = 0.8; pouring = false; flow = 0; G.hurt('Too much oil is bad for the engine.'); }
          else if (!pouring && flow === 0 && fill >= z[0] && fill <= z[1]) { fills++; G.score += 20 + Math.round((1 - Math.abs(fill - (z[0] + z[1]) / 2) * 10) * 10); GM.sfx('great'); G.pop(150, 70, 'JUST RIGHT!', P.lime); settle = 0.6; if (fills >= 3) { G.score += Math.round(G.timeLeft * 2); G.clear(); } }
        }
      };
      G.draw = function (c) {
        R(c, 0, 0, W, H, '#3a4058'); for (var x = 0; x < W; x += 30) R(c, x, 0, 1, 230, '#444b66');
        R(c, 0, 226, W, 14, P.slate); for (var x2 = 0; x2 < W; x2 += 12) R(c, x2, 226, 1, 14, P.dark);
        spills.forEach(function (s) { GM.ell(c, s.x, 230, 6, 2, P.ink); R(c, s.x - 2, 229, 2, 1, P.slate); });
        if (n < 3) {
          // the underside of the car on the lift
          R(c, 8, 18, W - 16, 30, P.dark); R(c, 8, 18, W - 16, 3, P.slate); R(c, 20, 48, W - 40, 6, P.ink); R(c, 22, 48, W - 44, 4, P.slate);
          [14, W - 34].forEach(function (x0) { R(c, x0, 30, 20, 20, P.ink); R(c, x0 + 3, 33, 14, 14, P.dark); R(c, x0 + 8, 38, 4, 4, P.silver); });
          holes.forEach(function (hx) { R(c, hx - 2, 54, 5, 3, P.ink); if (G.t * 3 % 1 < 0.5) R(c, hx - 1, 57, 2, 1, P.ink); });
          R(c, 10, 64, 4, 162, P.yellow); R(c, W - 14, 64, 4, 162, P.yellow); for (var y = 66; y < 226; y += 8) { R(c, 10, y, 4, 3, P.ink); R(c, W - 14, y, 4, 3, P.ink); } // the lift posts
          drops.forEach(function (d) { if (d.k === 'drop') { R(c, d.x - 1, d.y - 3, 3, 5, P.ink); R(c, d.x, d.y - 4, 1, 2, P.ink); R(c, d.x, d.y - 2, 1, 1, P.slate); } else c.drawImage(GM.spr('od' + d.k, d.k === 'nut' ? NUT : PLUG, false), Math.round(d.x - 2), Math.round(d.y - 2)); });
          // the drain pan (it darkens as it fills)
          var lv = Math.min(1, caught / Math.max(1, goal));
          R(c, px - 16, 206, 32, 2, P.ink); R(c, px - 15, 208, 30, 7, P.ink); R(c, px - 14, 208, 28, 6, P.orange); R(c, px - 13, 213 - Math.round(lv * 4), 26, Math.round(lv * 4) + 1, P.ink); R(c, px - 14, 206, 28, 1, P.yellow);
          GM.drawAiu(c, G.me, px + 22, 226, 0.75, 'open');
          T(c, caught + '/' + goal, W - 4, 17, P.white, 8, 'right');
        } else {
          // the engine bay, the funnel, the jug and the dipstick
          R(c, 14, 90, 110, 100, P.dark); R(c, 14, 90, 110, 4, P.slate); R(c, 30, 110, 76, 50, P.slate); R(c, 36, 116, 64, 8, P.silver); R(c, 36, 130, 64, 8, P.silver);
          R(c, 56, 74, 26, 6, P.ink); R(c, 58, 74, 22, 4, P.yellow); R(c, 64, 80, 10, 30, P.ink); R(c, 66, 80, 6, 30, P.yellow); // funnel
          c.save(); c.translate(84, 44); c.rotate(pouring ? 0.7 : 0.25); R(c, -12, -14, 26, 28, P.ink); R(c, -11, -13, 24, 26, P.white); R(c, -11, -4, 24, 8, P.red); T(c, 'OIL', 1, -4, P.white, 8, 'center'); R(c, -16, -12, 6, 4, P.ink); c.restore();
          if (flow > 0.01) for (var s = 0; s < 6; s++) R(c, 70 + Math.sin(G.t * 20 + s) * 0.6, 58 + s * 4, 2, 4, '#c9a227');
          var dx = 148, dy = 60, dh = 150, z = zone[Math.min(2, fills)];
          R(c, dx - 7, dy - 4, 14, dh + 8, P.ink); R(c, dx - 5, dy - 2, 10, dh + 4, P.white);
          R(c, dx - 4, dy + dh * (1 - z[1]), 8, dh * (z[1] - z[0]), P.lime); T(c, 'MAX', dx + 8, dy + dh * (1 - z[1]) - 4, P.white, 8); T(c, 'MIN', dx + 8, dy + dh * (1 - z[0]) - 4, P.white, 8);
          R(c, dx - 3, dy + dh * (1 - fill), 6, dh * fill, '#c9a227'); R(c, dx - 3, dy + dh * (1 - fill), 6, 1, P.yellow);
          for (var q = 0; q < 3; q++) R(c, 20 + q * 10, 200, 7, 7, q < fills ? P.lime : P.dark);
          GM.drawAiu(c, G.me, 40, 226, 1, pouring ? 'happy' : 'open');
          T(c, 'Fill ' + Math.min(3, fills + 1) + ' of 3', 20, 210, P.white, 8);
        }
      };
    }
  });

  /* =====================================================================
     WIRE IT: drag wires between the dots. Red goes to plus, black to minus; the LED's long leg is plus; a resistor
     protects the LED. Level 2: a Raspberry Pi (use GPIO 17, ground to GND). Level 3: build a computer: CPU first,
     then the cooler, the RAM and the power plug.
     ===================================================================== */
  function peg(c, p, on, hover) { GM.disc(c, p.x, p.y, 4, P.ink); GM.disc(c, p.x, p.y, 3, on ? P.lime : hover ? P.yellow : P.silver); R(c, p.x - 1, p.y - 1, 2, 2, P.ink); }
  function wire(c, a, b, col) { for (var o = -1; o <= 1; o++) GM.line(c, a.x, a.y + o, b.x, b.y + o, o ? P.ink : col); }
  GM.add({
    id: 'wireit', name: 'Wire It', hearts: 3,
    how: 'Drag a wire from dot to dot. Red to +, black to -. The LED\'s long leg is +. Then a Raspberry Pi, then build a whole computer!',
    tip: 'Turn the power off before you touch the wires.',
    icon: function (c) { R(c, 2, 6, 20, 14, P.white); for (var i = 0; i < 5; i++) for (var j = 0; j < 3; j++) R(c, 4 + i * 4, 9 + j * 4, 1, 1, P.slate); GM.line(c, 4, 9, 12, 13, P.red); GM.line(c, 8, 17, 16, 13, P.ink); GM.disc(c, 18, 6, 3, P.red); R(c, 17, 4, 1, 1, P.white); },
    level: function (G, n) {
      var nodes = {}, need = [], made = [], drag = null, hover = null, lit = 0, parts = [], slots = [], hold = null, order = [];
      G.timeMax = G.timeLeft = [30, 30, 34][n - 1]; G.buttons([]);
      function N(id, x, y, lbl, pol) { nodes[id] = { id: id, x: x, y: y, lbl: lbl, pol: pol }; }
      if (n === 1) {
        N('B+', 22, 92, '+', '+'); N('B-', 22, 160, '-', '-'); N('R1', 70, 92); N('R2', 112, 92); N('L+', 140, 118, 'long'); N('L-', 140, 160, 'short');
        need = [['B+', 'R1'], ['R2', 'L+'], ['L-', 'B-']];
      } else if (n === 2) {
        N('3V', 18, 70, '3.3V'); N('5V', 18, 92, '5V'); N('G17', 18, 118, 'GPIO17'); N('GND', 18, 150, 'GND', '-'); N('R1', 80, 118); N('R2', 120, 118); N('L+', 150, 140, 'long'); N('L-', 150, 176, 'short');
        need = [['G17', 'R1'], ['R2', 'L+'], ['L-', 'GND']];
      } else {
        parts = [{ id: 'cpu', x: 24, y: 206, w: 16, h: 16, lbl: 'CPU' }, { id: 'cool', x: 56, y: 202, w: 22, h: 22, lbl: 'FAN' }, { id: 'ram', x: 96, y: 204, w: 30, h: 6, lbl: 'RAM' }, { id: 'pwr', x: 140, y: 204, w: 16, h: 14, lbl: 'PWR' }];
        slots = [{ id: 'cpu', x: 52, y: 70, w: 22, h: 22 }, { id: 'cool', x: 52, y: 70, w: 22, h: 22, after: 'cpu' }, { id: 'ram', x: 96, y: 64, w: 8, h: 40 }, { id: 'pwr', x: 140, y: 110, w: 14, h: 22 }];
      }
      function key(a, b) { return [a, b].sort().join('|'); }
      function colFor(a, b) { var A0 = nodes[a], B0 = nodes[b]; if ((A0 && (a === 'B+' || a === '3V' || a === '5V' || a === 'G17')) || (B0 && (b === 'B+' || b === '3V' || b === '5V' || b === 'G17'))) return P.red; if (A0.pol === '-' || B0.pol === '-') return P.ink; return P.yellow; }
      function wrong(a, b) {
        var k = key(a, b);
        if (k === key('B+', 'B-') || k === key('3V', 'GND') || k === key('5V', 'GND')) return 'SHORT! Plus straight to minus.';
        if (k === key('B+', 'L-') || k === key('B-', 'L+') || k === key('GND', 'L+') || k === key('G17', 'L-')) return 'The LED is backwards: long leg to +.';
        if (k === key('B+', 'L+') || k === key('G17', 'L+')) return 'No resistor! The LED would burn out.';
        if (a === '5V' || b === '5V') return '5 volts is too much for this LED.';
        if (a === '3V' || b === '3V') return '3.3V is always on. Use GPIO 17 so code can blink it.';
        return 'That one doesn\'t connect there.';
      }
      function nodeAt(p) { var best = null; Object.keys(nodes).forEach(function (id) { var q = nodes[id]; if (Math.hypot(q.x - p.x, q.y - p.y) < 11) best = q; }); return best; }
      function partAt(p) { return parts.filter(function (q) { return !q.done && p.x > q.x - 4 && p.x < q.x + q.w + 4 && p.y > q.y - 4 && p.y < q.y + q.h + 4; })[0]; }
      G.down = function (p) { if (n < 3) { var q = nodeAt(p); if (q) drag = { from: q, p: p }; } else { var pt = partAt(p); if (pt) hold = { part: pt, dx: p.x - pt.x, dy: p.y - pt.y, x0: pt.x, y0: pt.y }; } };
      G.move = function (p) { if (drag) { drag.p = p; hover = nodeAt(p); } if (hold) { hold.part.x = p.x - hold.dx; hold.part.y = p.y - hold.dy; } };
      G.up = function (p) {
        if (drag) {
          var to = nodeAt(p), from = drag.from; drag = null; hover = null;
          if (!to || to === from) return;
          var k = key(from.id, to.id);
          if (made.some(function (m) { return m.k === k; })) return;
          if (need.some(function (q) { return key(q[0], q[1]) === k; })) { made.push({ k: k, a: from.id, b: to.id, col: colFor(from.id, to.id) }); G.score += 10; GM.sfx('coin'); G.pop(to.x, to.y - 10, 'CLICK', P.lime); if (made.length === need.length) { lit = 0.01; G.score += Math.round(G.timeLeft * 2); GM.sfx('great'); setTimeout(function () { if (G.alive && !G.paused) G.clear(); }, 900); } }
          else { G.burst(to.x, to.y, [P.yellow, P.white, P.orange], 14, 60); GM.sfx('spark'); G.pop(W / 2, 40, 'ZAP!', P.red); G.why = wrong(from.id, to.id); hint = G.why; hintT = 2.4; G.hurt(G.why); }
        }
        if (hold) {
          var pt = hold.part, sl = slots.filter(function (s) { return s.id === pt.id; })[0], cx = pt.x + pt.w / 2, cy = pt.y + pt.h / 2;
          var over = slots.filter(function (s) { return cx > s.x - 6 && cx < s.x + s.w + 6 && cy > s.y - 6 && cy < s.y + s.h + 6; })[0];
          if (over && over.id === pt.id && (!sl.after || order.indexOf(sl.after) >= 0)) { pt.done = true; pt.x = sl.x + (sl.w - pt.w) / 2; pt.y = sl.y + (sl.h - pt.h) / 2; order.push(pt.id); G.score += 10; GM.sfx('coin'); G.pop(cx, cy - 12, 'SNAP!', P.lime); if (order.length === 4) { lit = 0.01; GM.sfx('great'); G.score += Math.round(G.timeLeft * 2); setTimeout(function () { if (G.alive && !G.paused) G.clear(); }, 900); } }
          else if (over) { pt.x = hold.x0; pt.y = hold.y0; GM.sfx('spark'); G.burst(cx, cy, [P.yellow, P.white], 10); hint = over.id === 'cool' && pt.id === 'cpu' ? 'Hm, that\'s the CPU socket under the fan spot... ' : pt.id === 'cool' ? 'The CPU goes in first, then the fan on top.' : pt.id === 'ram' ? 'RAM goes in the long thin slot.' : pt.id === 'pwr' ? 'The power plug goes in the long connector on the edge.' : 'The CPU goes in the square socket.'; if (pt.id === 'cpu' && over.id === 'cool') { pt.done = true; pt.x = slots[0].x + 3; pt.y = slots[0].y + 3; order.push('cpu'); hint = 'Right spot!'; GM.sfx('coin'); } else { hintT = 2.4; G.hurt(hint); } }
          else { pt.x = hold.x0; pt.y = hold.y0; }
          hold = null;
        }
      };
      var hint = n === 1 ? 'Battery + to the resistor, then to the LED.' : n === 2 ? 'Light the LED from the Pi.' : 'Build it! CPU, fan, RAM, power.', hintT = 3;
      G.update = function (dt) { G.timeLeft -= dt; if (G.timeLeft <= 0) return G.fail('Out of time. It almost worked!'); hintT -= dt; if (lit) lit += dt; };
      G.draw = function (c) {
        R(c, 0, 0, W, H, '#2a3348'); for (var y = 20; y < H; y += 10) R(c, 0, y, W, 1, '#323c55');
        if (n < 3) {
          // the breadboard
          R(c, 50, 70, 124, 120, P.ink); R(c, 51, 71, 122, 118, '#f0ead8'); R(c, 51, 128, 122, 4, '#d6cdb3');
          for (var i = 0; i < 20; i++) for (var j = 0; j < 9; j++) R(c, 56 + i * 6, 78 + j * 12 + (j > 4 ? 8 : 0), 2, 2, '#bdb39a');
          R(c, 52, 74, 118, 1, P.red); R(c, 52, 184, 118, 1, P.blue);
          if (n === 1) { R(c, 4, 84, 30, 84, P.ink); R(c, 6, 86, 26, 80, P.dark); R(c, 8, 88, 22, 34, '#c9a227'); R(c, 8, 130, 22, 34, '#c9a227'); T(c, '+', 19, 98, P.red, 16, 'center', 'pixel'); T(c, '-', 19, 140, P.white, 16, 'center', 'pixel'); }
          else { R(c, 2, 56, 40, 130, P.ink); R(c, 3, 57, 38, 128, P.green); R(c, 6, 60, 6, 120, P.ink); T(c, 'Pi', 26, 170, P.white, 8, 'center'); GM.disc(c, 30, 160, 2, P.yellow); }
          // resistor and LED
          var r1 = nodes.R1, r2 = nodes.R2, lp = nodes['L+'], lm = nodes['L-'];
          R(c, r1.x, r1.y - 1, r2.x - r1.x, 2, P.silver); R(c, r1.x + 12, r1.y - 4, r2.x - r1.x - 24, 8, P.ink); R(c, r1.x + 13, r1.y - 3, r2.x - r1.x - 26, 6, P.sand); [P.red, P.ink, P.orange].forEach(function (cl, k) { R(c, r1.x + 17 + k * 5, r1.y - 3, 2, 6, cl); });
          var on = lit > 0, lx = lp.x + 14, ly = (lp.y + lm.y) / 2;
          R(c, lp.x, lp.y - 1, 10, 2, P.silver); R(c, lm.x, lm.y - 1, 10, 2, P.silver); R(c, lx - 2, lp.y, 2, ly - lp.y, P.silver); R(c, lx - 2, ly, 2, lm.y - ly, P.silver);
          GM.disc(c, lx + 4, ly, 7, P.ink); GM.disc(c, lx + 4, ly, 6, on && (n === 1 || lit % 0.5 < 0.3) ? P.yellow : P.red); R(c, lx + 1, ly - 3, 2, 2, P.white);
          if (on && (n === 1 || lit % 0.5 < 0.3)) { c.globalAlpha = 0.35; GM.disc(c, lx + 4, ly, 14, P.yellow); c.globalAlpha = 1; }
          made.forEach(function (m) { wire(c, nodes[m.a], nodes[m.b], m.col); });
          if (drag) wire(c, drag.from, drag.p, colFor(drag.from.id, hover ? hover.id : drag.from.id));
          Object.keys(nodes).forEach(function (id) { var q = nodes[id], on2 = made.some(function (m) { return m.a === id || m.b === id; }); peg(c, q, on2, hover === q); if (q.lbl) T(c, q.lbl, q.x + (q.x < 40 ? 7 : 6), q.y - 4, q.pol === '-' ? P.sky : q.lbl === '+' ? P.red : P.white, 8); });
        } else {
          // the motherboard
          R(c, 18, 40, 150, 140, P.ink); R(c, 19, 41, 148, 138, '#1f6b4a'); for (var t = 0; t < 14; t++) R(c, 22 + t * 10, 44, 1, 132, '#257a55');
          slots.forEach(function (s) { if (s.id === 'cool') return; R(c, s.x - 1, s.y - 1, s.w + 2, s.h + 2, P.ink); R(c, s.x, s.y, s.w, s.h, s.id === 'cpu' ? P.silver : s.id === 'ram' ? P.dark : P.slate); if (s.id === 'cpu') for (var a = 0; a < 5; a++) for (var b = 0; b < 5; b++) R(c, s.x + 2 + a * 4, s.y + 2 + b * 4, 1, 1, P.ink); if (s.id === 'ram') R(c, s.x + 3, s.y, 2, s.h, P.ink); if (s.id === 'pwr') for (var q2 = 0; q2 < 5; q2++) R(c, s.x + 3, s.y + 2 + q2 * 4, 8, 2, P.ink); });
          T(c, 'CPU', 63, 94, P.white, 8, 'center'); T(c, 'RAM', 100, 106, P.white, 8, 'center'); T(c, 'POWER', 147, 134, P.white, 8, 'center');
          R(c, 0, 194, W, 46, P.ink); R(c, 0, 195, W, 1, P.slate);
          parts.forEach(function (pt) {
            if (pt.id === 'cpu') { R(c, pt.x, pt.y, pt.w, pt.h, P.ink); R(c, pt.x + 1, pt.y + 1, pt.w - 2, pt.h - 2, P.silver); R(c, pt.x + 3, pt.y + 3, pt.w - 6, pt.h - 6, P.white); R(c, pt.x + 1, pt.y + 1, 2, 2, P.yellow); }
            else if (pt.id === 'cool') { R(c, pt.x, pt.y, pt.w, pt.h, P.ink); R(c, pt.x + 1, pt.y + 1, pt.w - 2, pt.h - 2, P.dark); GM.disc(c, pt.x + pt.w / 2, pt.y + pt.h / 2, 8, P.slate); var an = lit ? G.t * 20 : 0; for (var bl = 0; bl < 4; bl++) GM.line(c, pt.x + pt.w / 2, pt.y + pt.h / 2, pt.x + pt.w / 2 + Math.cos(an + bl * 1.57) * 7, pt.y + pt.h / 2 + Math.sin(an + bl * 1.57) * 7, P.silver); }
            else if (pt.id === 'ram') { R(c, pt.x, pt.y, pt.w, pt.h, P.ink); R(c, pt.x + 1, pt.y + 1, pt.w - 2, pt.h - 2, P.green); for (var ch = 0; ch < 4; ch++) R(c, pt.x + 3 + ch * 7, pt.y + 2, 4, 2, P.ink); }
            else { R(c, pt.x, pt.y, pt.w, pt.h, P.ink); R(c, pt.x + 1, pt.y + 1, pt.w - 2, pt.h - 2, P.yellow); R(c, pt.x + 5, pt.y - 10, 6, 10, P.ink); }
            if (!pt.done) T(c, pt.lbl, pt.x + pt.w / 2, pt.y + pt.h + 1, P.white, 8, 'center');
          });
          parts.forEach(function (pt) { if (pt.id === 'ram' && pt.done) { pt.w = 6; pt.h = 38; } });
          if (lit) { R(c, 30, 160, 10, 6, lit % 0.6 < 0.3 ? P.lime : P.green); T(c, 'BEEP! It boots!', W / 2, 24, P.lime, 8, 'center'); }
        }
        if (hintT > 0) { R(c, 4, 196 - (n === 3 ? 176 : 0), W - 8, 16, 'rgba(26,28,44,.85)'); T(c, hint, W / 2, 200 - (n === 3 ? 176 : 0), P.yellow, 8, 'center'); }
        GM.drawAiu(c, G.me, n === 3 ? 160 : 160, n === 3 ? 192 : 232, 0.75, lit ? 'happy' : 'open');
      };
    }
  });

  /* =====================================================================
     PRINT STACK: the printer builds a little robot totem, one part at a time. Tap to drop the part as the nozzle sweeps.
     Line it up! A part that hangs out past the one under it droops (no support) unless you give it a 45 degree chamfer
     (you get two per robot). Too far off and it falls off.
     ===================================================================== */
  var PARTS3 = [
    [{ n: 'legs', w: 26, h: 14, col: P.slate }, { n: 'body', w: 30, h: 22, col: P.sky }, { n: 'arms', w: 46, h: 8, col: P.orange }, { n: 'head', w: 22, h: 16, col: P.lime }],
    [{ n: 'base', w: 34, h: 10, col: P.slate }, { n: 'legs', w: 24, h: 14, col: P.dark }, { n: 'body', w: 28, h: 18, col: P.pink }, { n: 'arms', w: 48, h: 8, col: P.yellow }, { n: 'neck', w: 12, h: 6, col: P.silver }, { n: 'head', w: 26, h: 16, col: P.cyan }],
    [{ n: 'base', w: 36, h: 10, col: P.slate }, { n: 'legs', w: 22, h: 14, col: P.dark }, { n: 'body', w: 30, h: 18, col: P.lime }, { n: 'wings', w: 54, h: 6, col: P.white }, { n: 'chest', w: 26, h: 10, col: P.red }, { n: 'arms', w: 44, h: 6, col: P.orange }, { n: 'head', w: 24, h: 16, col: P.yellow }]
  ];
  GM.add({
    id: 'printstack', name: 'Print Stack', hearts: 3,
    how: 'Tap to drop each part on the stack. Line them up! Wide parts that hang over droop, unless you turn on CHAMFER (a 45 degree edge) first.',
    tip: 'Overhangs past 45 degrees need support. Chamfer them and skip the supports!',
    icon: function (c) { R(c, 2, 2, 20, 3, P.slate); R(c, 10, 5, 4, 4, P.silver); R(c, 11, 9, 2, 2, P.orange); R(c, 8, 12, 8, 4, P.lime); R(c, 5, 16, 14, 3, P.orange); R(c, 9, 19, 6, 3, P.sky); R(c, 2, 22, 20, 1, P.white); },
    level: function (G, n) {
      var list = PARTS3[n - 1], idx = 0, stack = [], fall = null, nozzle = 0, cham = false, chams = 2, sway = 0.9 + n * 0.35, BED = 212, cbtn;
      G.timeMax = G.timeLeft = [28, 34, 38][n - 1];
      var b = G.buttons([['DROP', drop, 'big primary'], ['CHAMFER: OFF', function () { if (!chams && !cham) return; cham = !cham; label(); }, 'big']]); cbtn = b[1];
      function label() { cbtn.textContent = (cham ? 'CHAMFER: ON' : 'CHAMFER: OFF') + ' (' + chams + ')'; cbtn.classList.toggle('on', cham); }
      label();
      function topY() { return stack.reduce(function (y, s) { return Math.min(y, s.y); }, BED); }
      function under() { return stack.length ? stack[stack.length - 1] : { x: W / 2, w: 44, y: BED, h: 0 }; }
      function nx() { return W / 2 + Math.sin(nozzle) * 58; }
      G.down = function (p) { if (p.y < 200) drop(); };
      G.key = function (k, down) { if (!down) return false; if (k === ' ' || k === 'Enter') { drop(); return true; } if (k === 'c') { cbtn.click(); return true; } return false; };
      function drop() { if (fall || idx >= list.length || G.paused) return; var pt = list[idx]; fall = { p: pt, x: nx(), y: 40, vy: 0, cham: cham }; if (cham) { chams--; cham = false; label(); } GM.sfx('toss'); }
      G.update = function (dt) {
        G.timeLeft -= dt; if (G.timeLeft <= 0) return G.fail('The print timed out.');
        nozzle += dt * sway;
        if (fall) {
          fall.vy += 400 * dt; fall.y += fall.vy * dt;
          var u = under(), land = u.y - fall.p.h;
          if (fall.y >= land) {
            var pt = fall.p, off = fall.x - u.x, hangL = Math.max(0, (u.x - u.w / 2) - (fall.x - pt.w / 2)), hangR = Math.max(0, (fall.x + pt.w / 2) - (u.x + u.w / 2)), hang = Math.max(hangL, hangR);
            var cx = fall.x, fc = fall.cham; fall = null;
            if (Math.abs(off) > u.w / 2 + 2) { GM.sfx('thud'); G.pop(cx, land, 'FELL OFF', P.red); G.hurt('It fell off the stack. Line it up!'); return; }
            var allowed = stack.length === 0 ? 99 : fc ? pt.h + 2 : 3; // a 45 degree chamfer can hang out as far as it is tall
            var droop = hang > allowed;
            stack.push({ x: cx, y: land, w: pt.w, h: pt.h, col: pt.col, n: pt.n, droop: droop, cham: fc });
            var neat = Math.max(0, 10 - Math.round(Math.abs(off)));
            if (droop) { GM.sfx('miss'); G.pop(cx, land - 8, 'DROOP!', P.red); G.hurt('That overhang drooped. Chamfer it next time!'); }
            else { G.score += 10 + neat * 2; GM.sfx(neat > 7 ? 'great' : 'thud'); G.pop(cx, land - 8, neat > 7 ? 'PERFECT!' : 'OK', neat > 7 ? P.yellow : P.white); }
            idx++;
            if (idx >= list.length && G.hearts > 0) { G.score += Math.round(G.timeLeft * 2); setTimeout(function () { if (G.alive && !G.paused) G.clear(); }, 500); }
          }
        }
      };
      G.draw = function (c) {
        R(c, 0, 0, W, H, '#20283c'); R(c, 6, 18, W - 12, 210, P.ink); R(c, 8, 20, W - 16, 206, '#2e3a55'); // the printer frame
        R(c, 8, 28, W - 16, 4, P.silver); var x0 = nx(); R(c, x0 - 7, 24, 14, 12, P.dark); R(c, x0 - 5, 26, 10, 8, P.orange); R(c, x0 - 1, 36, 2, 4, P.silver); R(c, x0, 40, 1, 1, P.red);
        R(c, 30, BED, W - 60, 4, P.ink); R(c, 31, BED, W - 62, 3, P.slate); R(c, 20, BED + 4, W - 40, 10, P.dark);
        function part(s, a) {
          var x = Math.round(s.x - s.w / 2), y = Math.round(s.y);
          c.globalAlpha = a || 1; R(c, x - 1, y - 1, s.w + 2, s.h + 2, P.ink); R(c, x, y, s.w, s.h, s.col); R(c, x, y, s.w, 2, P.white); for (var l = y + 3; l < y + s.h; l += 3) R(c, x, l, s.w, 1, 'rgba(0,0,0,.15)');
          if (s.cham) { c.fillStyle = '#2e3a55'; for (var k = 0; k < Math.min(s.h, 10); k++) { c.fillRect(x, y + s.h - 1 - k, Math.max(0, Math.min(s.w / 2, (Math.min(s.h, 10) - k))), 1); c.fillRect(x + s.w - Math.max(0, Math.min(s.w / 2, (Math.min(s.h, 10) - k))), y + s.h - 1 - k, Math.max(0, Math.min(s.w / 2, (Math.min(s.h, 10) - k))), 1); } }
          if (s.droop) for (var dx = 0; dx < s.w; dx += 3) R(c, x + dx, y + s.h, 1, 2 + (dx * 7) % 5, s.col); // spaghetti
          if (s.n === 'head') { R(c, x + 4, y + 5, 4, 4, P.ink); R(c, x + s.w - 8, y + 5, 4, 4, P.ink); R(c, x + 5, y + 6, 1, 1, P.white); R(c, x + s.w / 2 - 3, y + s.h - 5, 6, 1, P.ink); }
          c.globalAlpha = 1;
        }
        stack.forEach(function (s) { part(s); });
        if (fall) part({ x: fall.x, y: fall.y, w: fall.p.w, h: fall.p.h, col: fall.p.col, n: fall.p.n, cham: fall.cham });
        else if (idx < list.length) { var pt = list[idx]; part({ x: nx(), y: 42, w: pt.w, h: pt.h, col: pt.col, n: pt.n, cham: cham }, 0.55); var u = under(); c.globalAlpha = 0.35; R(c, nx() - pt.w / 2, u.y - 2, pt.w, 1, P.white); c.globalAlpha = 1; }
        T(c, (idx < list.length ? list[idx].n.toUpperCase() : 'DONE') + '  ' + idx + '/' + list.length, 12, 214 + 12, P.white, 8);
        GM.drawAiu(c, G.me, 160, 236, 0.75, stack.some(function (s) { return s.droop; }) ? 'blink' : 'happy');
      };
    }
  });

  /* =====================================================================
     GARDEN DEFENSE: bugs crawl down the rows toward your seedlings. Pick a helper card, then tap a spot to plant it.
     Ladybugs eat aphids, marigolds make sunshine, copper tape stops slugs, neem spray clears a row once.
     ===================================================================== */
  var LANES = [78, 122, 166], COLS = [44, 70, 96, 122, 148];
  var HELP = {
    marigold: { cost: 25, name: 'Marigold', rows: ['.oyo.', 'oyoyo', '.oyo.', '..g..', '.ggg.', '..g..'], hp: 6 },
    ladybug: { cost: 50, name: 'Ladybugs', rows: ['.WWW.', 'WWWWW', 'WkrkW', 'WrkrW', 'WWWWW', '.B.B.'], hp: 6 },
    copper: { cost: 25, name: 'Copper', rows: ['eoe', 'eoe', 'eoe', 'eoe', 'eoe', 'eoe'], hp: 14 },
    neem: { cost: 75, name: 'Neem', rows: ['.kk.', 'kwwk', 'kggk', 'kggk', 'kggk', '.kk.'], hp: 1 }
  };
  var BUGS = {
    aphid: { rows: ['.l.l.', 'lglgl', 'lllll', '.l.l.'], hp: 2, sp: 10, pts: 5 },
    slug: { rows: ['k.k....', 'aaa....', 'aWaaaa.', 'aaaaaaa'], hp: 5, sp: 5.5, pts: 8, slug: true },
    beetle: { rows: ['.k.k.', 'kbbbk', 'bnbnb', 'bbbbb', '.k.k.'], hp: 9, sp: 7, pts: 12 }
  };
  GM.add({
    id: 'garden', name: 'Garden Defense', hearts: 3,
    how: 'Bugs crawl toward your seedlings on the left. Tap a helper card, then tap a spot in that row. Ladybugs pick off bugs; a bug in the way stops to nibble a helper (so put one in front). A bug that reaches a seedling eats it and crawls away full. Tap falling sunshine to buy more helpers.',
    tip: 'Ladybugs eat aphids. Good bugs help gardens, no spray needed.',
    icon: function (c) { R(c, 1, 14, 22, 9, P.wood); R(c, 1, 14, 22, 1, P.bark); R(c, 4, 9, 2, 6, P.green); R(c, 2, 8, 3, 2, P.lime); R(c, 5, 7, 3, 2, P.lime); c.drawImage(GM.spr('gdlb', HELP.ladybug.rows, true), 9, 7); c.drawImage(GM.spr('gdap', BUGS.aphid.rows, true), 16, 9); },
    level: function (G, n) {
      var sun = 150, sel = null, helpers = [], bugs = [], shots = [], suns = [], wave = [6, 9, 12][n - 1], spawned = 0, nextB = 3.5, nextSun = 2.5, seed = [true, true, true], cards;
      G.timeMax = 0;
      cards = G.buttons(Object.keys(HELP).map(function (k) { return [HELP[k].name + ' ' + HELP[k].cost, function () { sel = sel === k ? null : k; mark(); }, 'gcard']; }));
      function mark() { Object.keys(HELP).forEach(function (k, i) { cards[i].classList.toggle('on', sel === k); cards[i].disabled = sun < HELP[k].cost; }); }
      mark();
      function cellAt(p) { var li = -1, ci = -1, bl = 99, bc = 99; LANES.forEach(function (y, i) { var d = Math.abs(p.y - y); if (d < 26 && d < bl) { bl = d; li = i; } }); COLS.forEach(function (x, i) { var d = Math.abs(p.x - x); if (d < 20 && d < bc) { bc = d; ci = i; } }); return li >= 0 && ci >= 0 ? { l: li, c: ci } : null; } // 2.5.0: the nearest spot (easier to hit)
      G.down = function (p) {
        for (var i = 0; i < suns.length; i++) { var s = suns[i]; if (Math.hypot(s.x - p.x, s.y - p.y) < 14) { suns.splice(i, 1); sun += 25; GM.sfx('coin'); G.pop(s.x, s.y - 8, '+25', P.yellow); mark(); return; } }
        if (!sel) return; var cell = cellAt(p); if (!cell) return;
        if (helpers.some(function (h0) { return h0.l === cell.l && h0.c === cell.c; })) return;
        var D = HELP[sel]; if (sun < D.cost) return; sun -= D.cost;
        if (sel === 'neem') { GM.sfx('swoosh'); G.burst(COLS[cell.c], LANES[cell.l], [P.lime, P.white], 20, 70); bugs.forEach(function (b) { if (b.l === cell.l) { b.hp -= 4; b.hit = 0.2; } }); G.pop(COLS[cell.c], LANES[cell.l] - 14, 'SPRAY!', P.lime); }
        else { helpers.push({ k: sel, l: cell.l, c: cell.c, hp: D.hp, t: 0 }); GM.sfx('pop'); }
        sel = null; mark();
      };
      G.update = function (dt) {
        nextSun -= dt; if (nextSun <= 0) { nextSun = 4.2; suns.push({ x: rnd(30, 160), y: 20, ty: rnd(70, 180), t: 0 }); }
        suns.forEach(function (s) { s.t += dt; if (s.y < s.ty) s.y += 24 * dt; });
        suns = suns.filter(function (s) { return s.t < 12; });
        nextB -= dt;
        if (spawned < wave && nextB <= 0) { nextB = rnd(2.8, 4.2) - n * 0.35; spawned++; var k = n === 3 && Math.random() < 0.3 ? 'beetle' : Math.random() < 0.35 ? 'slug' : 'aphid'; bugs.push({ k: k, l: Math.floor(Math.random() * 3), x: W + 6, hp: BUGS[k].hp + (n - 1), hit: 0 }); }
        helpers.forEach(function (h0) {
          h0.t += dt;
          if (h0.k === 'marigold' && h0.t > 7) { h0.t = 0; suns.push({ x: COLS[h0.c], y: LANES[h0.l] - 10, ty: LANES[h0.l] - 6, t: 0 }); }
          if (h0.k === 'ladybug' && h0.t > 1.0 && bugs.some(function (b) { return b.l === h0.l && b.x > COLS[h0.c] && !b.full; })) { h0.t = 0; shots.push({ l: h0.l, x: COLS[h0.c] + 6 }); GM.sfx('pop'); }
        });
        shots.forEach(function (s) { s.x += 80 * dt; bugs.forEach(function (b) { if (!s.done && !b.full && b.l === s.l && Math.abs(b.x - s.x) < 6) { s.done = true; b.hp -= 1; b.hit = 0.15; } }); });
        shots = shots.filter(function (s) { return !s.done && s.x < W + 10; });
        bugs.forEach(function (b) {
          b.hit = Math.max(0, b.hit - dt);
          // 2.5.0: a bug that ate a seedling is full: it turns around and crawls away (it never walks on past the seedling)
          if (b.full) { b.x += BUGS[b.k].sp * 1.6 * dt; if (b.x > W + 10) b.dead = true; return; }
          var block = helpers.filter(function (h0) { return h0.l === b.l && Math.abs(COLS[h0.c] - b.x) < 9; })[0];
          if (block) { if (block.k === 'copper' && BUGS[b.k].slug) { b.stuck = true; } else { block.hp -= dt * 0.8; b.munch = 0.3; if (block.hp <= 0) { helpers.splice(helpers.indexOf(block), 1); G.pop(COLS[block.c], LANES[block.l] - 12, 'MUNCH', P.red); } } }
          else { b.stuck = false; b.x -= BUGS[b.k].sp * (1 + n * 0.12) * dt; }
          if (b.x < 18) { b.x = 18; b.full = true; var had = seed[b.l]; seed[b.l] = false; G.pop(16, LANES[b.l] - 14, had ? 'CHOMP!' : 'NIBBLE!', P.red); G.hurt(had ? 'The bugs ate your seedlings.' : 'The bugs got to the roots.'); }
          if (b.hp <= 0 && !b.dead) { b.dead = true; G.score += BUGS[b.k].pts; G.burst(b.x, LANES[b.l], [P.lime, P.yellow], 8); GM.sfx('coin'); }
        });
        bugs = bugs.filter(function (b) { return !b.dead; });
        if (spawned >= wave && !bugs.some(function (b) { return !b.full; })) { G.score += sun / 5 | 0; G.clear(); }
        mark();
      };
      G.draw = function (c) {
        R(c, 0, 0, W, H, '#cfe9f5'); for (var x = 0; x < W; x += 20) R(c, x, 20, 1, 30, P.white); R(c, 0, 50, W, 2, P.white); // the greenhouse glass
        LANES.forEach(function (y, i) { R(c, 0, y - 20, W, 40, i % 2 ? '#7a4a2c' : '#86532f'); for (var x = 4; x < W; x += 9) R(c, x, y + 4 + (x % 3), 2, 1, P.bark); });
        LANES.forEach(function (y, i) { // the seedlings
          if (seed[i]) { R(c, 10, y - 2, 2, 10, P.green); R(c, 6, y - 4, 4, 3, P.lime); R(c, 12, y - 6, 4, 3, P.lime); R(c, 6, y + 7, 10, 4, P.orange); } else { R(c, 6, y + 7, 10, 4, P.orange); R(c, 9, y + 5, 4, 2, P.bark); }
        });
        if (sel) COLS.forEach(function (x) { LANES.forEach(function (y) { c.globalAlpha = 0.25; R(c, x - 11, y - 16, 22, 32, P.white); c.globalAlpha = 1; }); });
        helpers.forEach(function (h0) { var sp = GM.spr('gh' + h0.k, HELP[h0.k].rows, true, 2); c.drawImage(sp, COLS[h0.c] - sp.width / 2, LANES[h0.l] - sp.height / 2 + (h0.k === 'marigold' ? Math.round(Math.sin(G.t * 3) ) : 0)); });
        shots.forEach(function (s) { c.drawImage(GM.spr('gshot', ['.k.', 'rkr', '.r.'], true), Math.round(s.x - 2), LANES[s.l] - 3); });
        bugs.forEach(function (b) { var sp = GM.spr('gb' + b.k, BUGS[b.k].rows, true, 2); if (b.hit) sp = GM.tint(sp, P.white); if (b.full) sp = GM.flipX(sp); var wob = b.stuck ? 0 : Math.round(Math.sin(G.t * 10 + b.x) * 1); c.drawImage(sp, Math.round(b.x - sp.width / 2), LANES[b.l] - sp.height / 2 + wob); });
        suns.forEach(function (s) { GM.disc(c, s.x, s.y, 7, P.orange); GM.disc(c, s.x, s.y, 5, P.yellow); R(c, s.x - 2, s.y - 3, 2, 2, P.white); });
        R(c, 0, 16, 44, 14, 'rgba(26,28,44,.82)'); GM.disc(c, 8, 23, 4, P.yellow); T(c, String(sun), 15, 18, P.yellow, 10);
        T(c, 'Bugs ' + Math.max(0, wave - spawned + bugs.length), W - 30, 24, P.ink, 8, 'right');
        GM.drawAiu(c, G.me, 166, 214, 0.75, 'open');
      };
    }
  });
})();
