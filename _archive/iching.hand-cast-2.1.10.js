// 2.1.10's hand-tossed cast (removed in 2.1.11: the reading is ready at midnight and Aiu tosses it in the world when you're here).
// app.js:
  // 2.1.10: casting is hands-on: the coin sheet (ui.castSheet) tosses six times, then app.finishCast saves the reading
  app.castReading = function () { if (AIU.ui.castSheet) return AIU.ui.castSheet(); };
  app.finishCast = function (vals) {
    var S = app.S; if (!S || !S.hatched) return Promise.resolve(null);
    var day = U.dayStr(new Date(app.trueNow() + (app.dev.hourPreview || 0) * 3600e3)), I = AIU.iching;
    if ((S.reviews || {})[day]) return Promise.resolve(S.reviews[day]);
    var r = I.fromLines(vals); r.day = day;
    var ctx = app.ctx(), city = C.setting(S, 'city', null), rv = M.hilltop(ctx, r, { place: city ? city.name : '', zone: AIU.hilltop.zoneName(city && city.tz) });
    app.local.castDay = day; app.local.checkin = day; app.local.reviewSeen = day; app.saveLocal();
    return app.addEvents([{ type: 'review', data: { day: day, hex: r.hex, rel: r.rel, vals: r.vals, moving: r.moving, text: rv.text, wx: rv.rv.wx, hm: rv.rv.hm, place: rv.rv.place, zone: rv.rv.zone } }], true).then(function () {
      app.setMode('greet', 2500); app.react('cast');
      if (AIU.ui.showReview) AIU.ui.showReview(app.S.reviews[day], true);
      return app.S.reviews[day];
    });
  };

// ui.js:
  /* ---------- 2.1.10: casting the I Ching by hand: three coins, six tosses, the hexagram builds from the bottom up ----------
     Heads = 3, tails = 2. Each toss adds a line: 6 old yin (changing), 7 young yang, 8 young yin, 9 old yang (changing). */
  ui.castSheet = function () {
    var a = app(), S = a.S, I = AIU.iching, K0 = A.kit, P = A.P, s, vals = [], busy0 = false;
    var d0 = U.dayStr(new Date(a.trueNow() + (a.dev.hourPreview || 0) * 3600e3));
    if ((S.reviews || {})[d0]) { ui.go('journal', 'today'); return; }
    var cv = h('canvas', { cls: 'castcv', width: 120, height: 64, 'aria-hidden': 'true' }), c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
    var msgEl = h('p', { cls: 'castmsg', 'aria-live': 'polite', text: 'Hold a question in mind, or just the day ahead. Then toss.' });
    var tossB = btn('Toss the coins (1 of 6)', function () { toss(); }, 'primary'), allB = btn('Toss all six', function () { tossAll(); }, 'ghost');
    var rnd = function () { try { var u = new Uint32Array(1); crypto.getRandomValues(u); return u[0] / 4294967296; } catch (e) { return Math.random(); } };
    var coins = [null, null, null], spinT = 0;
    function coin(x, y, face, squash) {
      var w = Math.max(1, Math.round(8 * squash)), col = face === null ? P.silver : face ? P.yellow : P.orange, dark = face === null ? P.slate : face ? P.wood : P.bark;
      K0.ell(c, x, y, w, 8, P.ink); K0.ell(c, x, y, Math.max(0, w - 1), 7, col);
      if (w > 3) { K0.R(c, x - 2, y - 2, 4, 4, P.ink); K0.R(c, x - w + 2, y, 2, 1, dark); K0.R(c, x + w - 3, y, 2, 1, dark); if (face) { K0.px(c, x, y - 5, dark); K0.px(c, x, y + 5, dark); } }
    }
    function line(i, v, y) {
      var x = 86, ch = v === 6 || v === 9, col = ch ? P.red : P.ink;
      if (v === 7 || v === 9) K0.R(c, x, y, 28, 4, col); else { K0.R(c, x, y, 12, 4, col); K0.R(c, x + 16, y, 12, 4, col); }
      if (ch) K0.R(c, x + 12, y + 1, 4, 2, v === 9 ? P.yellow : P.orange);
    }
    function draw(t) {
      c.fillStyle = getComputedStyle(document.body).getPropertyValue('--card') || '#f4f4f4'; c.fillRect(0, 0, 120, 64);
      K0.R(c, 2, 56, 76, 2, P.slate); // the table
      for (var k = 0; k < 3; k++) {
        var x = 14 + k * 24;
        if (t !== null) { var up = Math.sin(t * Math.PI) * (26 + k * 3), sq = Math.abs(Math.cos(t * Math.PI * (5 + k))); coin(x, 46 - Math.round(up), coins[k] !== null && t > 0.85 ? coins[k] : (Math.floor(t * 12 + k) % 2 === 0), sq); }
        else coin(x, 46, coins[k], 1);
      }
      K0.R(c, 82, 4, 36, 56, P.sand); K0.R(c, 82, 4, 36, 1, P.wood); K0.R(c, 82, 59, 36, 1, P.wood); // the scroll: lines go bottom to top
      vals.forEach(function (v, i) { line(i, v, 52 - i * 8); });
    }
    function toss(cb) {
      if (busy0 || vals.length >= 6) return;
      busy0 = true; a.unlock(); a.beep('toss');
      var res = [rnd() < 0.5, rnd() < 0.5, rnd() < 0.5], t0 = performance.now(), dur = cb ? 450 : 900;
      coins = res;
      (function step(now) {
        var t = Math.min(1, (now - t0) / dur);
        draw(t);
        if (t < 1) return requestAnimationFrame(step);
        var v = res.reduce(function (n, hd) { return n + (hd ? 3 : 2); }, 0); vals.push(v); draw(null); a.beep('munch');
        var nm = { 6: 'Old yin: broken, and changing', 7: 'Young yang: solid', 8: 'Young yin: broken', 9: 'Old yang: solid, and changing' }[v];
        msgEl.textContent = 'Line ' + vals.length + ': ' + res.filter(Boolean).length + ' heads. ' + nm + '.';
        busy0 = false;
        if (vals.length < 6) { tossB.textContent = 'Toss the coins (' + (vals.length + 1) + ' of 6)'; if (cb) setTimeout(cb, 120); }
        else done();
      })(t0);
    }
    function tossAll() { allB.disabled = true; (function next() { if (vals.length < 6) toss(next); })(); }
    function done() {
      tossB.disabled = true; allB.hidden = true; tossB.hidden = true;
      var r = I.fromLines(vals), X = I.info(r.hex), R0 = r.rel !== r.hex ? I.info(r.rel) : null;
      msgEl.textContent = r.hex + '. ' + X.name + ': ' + X.theme + (R0 ? ' (changing toward ' + r.rel + '. ' + R0.name + ')' : '') + '.';
      a.finishCast(vals).then(function () {
        foot.appendChild(btn('Read it', function () { s.remove(); var st0 = AIU.panels.state; ui.go('journal', 'today'); st0.jday = null; st0.jview = 'iching'; ui.renderPanel(true); ui.toPanel(); }, 'primary'));
        foot.appendChild(btn('Done', function () { s.remove(); ui.renderPanel(true); }, 'ghost'));
      });
    }
    var foot = h('div', { cls: 'row wrap' }, tossB, allB);
    s = sheet('Cast the I Ching', [h('p', { cls: 'small', text: 'Three coins, six tosses. Heads count 3, tails 2. Each toss draws one line, from the bottom up. Practical wisdom for your day, not fortune-telling.' }), cv, msgEl, foot]);
    draw(null);
  };
