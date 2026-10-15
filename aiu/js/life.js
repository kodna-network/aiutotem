/* AIU TOTEM 2.5.0 - Aiu's day, a little livelier.
   The wallet chip: your tokens (2.5.0; it replaced the joy streak). Every growth point Aiu earns also drops a token in
     your wallet; spend them in the Shop.
   The outhouse: every few hours Aiu needs to go. Drag him to the outhouse and he goes right away; otherwise he goes by
     himself a while later.
   The stand-up: after the morning I Ching toss (and when you come back after a few hours), Aiu walks to the bounty board
     and tells you what's up today. Tap the board any time and he comes over and does it again. A "!" on the board means
     he has something new to say.
   Picking Aiu up always works, even in the middle of something (cooking in the food cart): he hops out of it. */
(function () {
  'use strict';
  var U = AIU.util, C = AIU.core, A = AIU.art, h = U.h;
  var L = AIU.life = {};
  function app() { return AIU.app; }
  function ui() { return AIU.ui; }

  /* ---------- 2.5.0: the joy streak is retired (tokens instead: every growth point drops a token in your wallet, and the
     token shop sells looks for Aiu, the pet, the yard and the rooms). These stay so older calls keep working. ---------- */
  L.x2 = function () { return false; };
  L.joyLeft = function () { return 0; };
  L.joyFill = function () { return 0; };
  L.joy = function () {};
  L.mark = function (d) { return d; };
  // the wallet chip beside the heart and the leaf: your tokens; tap it to open the wallet
  var chip = null, shown = null;
  L.chip = function () {
    chip = h('button', { type: 'button', cls: 'joychip tokchip', 'aria-label': 'Wallet', onclick: function () { if (AIU.shop) AIU.shop.wallet(); } },
      h('span', { cls: 'sico jstar' }, ui().pix('token')), h('span', { cls: 'toksub', text: 'tokens' }), h('b', { cls: 'tokn sval' }));
    draw(); return chip;
  };
  function draw() {
    if (!chip || !app().S) return;
    var n = app().S.tokens || 0;
    if (shown !== null && n > shown) { chip.classList.remove('bump'); void chip.offsetWidth; chip.classList.add('bump'); }
    shown = n;
    chip.querySelector('.tokn').textContent = String(n);
    chip.setAttribute('aria-label', 'Wallet: ' + n + ' tokens. Tap to open.');
  }
  L.drawChip = draw;
  setInterval(draw, 2000);

  /* ---------- the outhouse ---------- */
  var NEED_MS = 3 * 3600000, AUTO_MS = 4 * 3600000;
  function pottyAt() { var lc = app().local; if (!lc.pottyAt) { lc.pottyAt = Date.now(); app().saveLocal(); } return lc.pottyAt; }
  L.needsPotty = function () { return !!(app().S && app().S.hatched && Date.now() - pottyAt() > NEED_MS); };
  L.potty = function () { var a = app(); a.local.pottyAt = Date.now(); a.saveLocal(); };
  var lastWee = 0;
  function pottyTick() {
    var a = app(), S = a.S; if (!S || !S.hatched || !ui().onMain || document.hidden) return;
    if (!L.needsPotty()) return;
    var sc = a.view && a.view.sc, free = sc && !A.isRoom(sc) && !sc.aiuIn && !a.visit && !a.busyNow() && !a.casting && sc.act !== 'sleep';
    if (Date.now() - pottyAt() > AUTO_MS && free && ui().tab === 'world' && !(AIU.toy && AIU.toy.holding())) { AIU.toy.visit('outhouse'); return; } // he goes by himself
    if (free && Date.now() - lastWee > 15 * 60000) { lastWee = Date.now(); a.react('wee'); }
  }

  /* ---------- picking Aiu up pulls him out of whatever he's doing ---------- */
  L.free = function (sc) {
    var a = app(), now = Date.now();
    if (a.forceAct && !/^iching/.test(a.forceAct.id)) a.forceAct = null;
    a.visit = null; a.trip = null;
    a.free = { until: now + 2 * 60000, indoor: !!(sc && A.isRoom(sc) && !sc.aiuIn) };
  };
  L.freeAct = function () { var f = app().free; return f && Date.now() < f.until ? { id: 'bubbles', indoor: f.indoor } : null; };

  /* ---------- the stand-up at the bounty board ---------- */
  function lines() {
    var a = app(), S = a.S, out = [], items = ui().todayItems(), wn = U.wall(new Date(a.trueNow())), hr = wn.getHours();
    out.push((hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening') + ', ' + (S.callMe || 'friend') + '!');
    var rv = (S.reviews || {})[U.dayStr(new Date(a.trueNow()))], info = rv && AIU.iching.info ? AIU.iching.info(rv.hex) : null;
    if (info && hr < 12) out.push('Today\'s reading is ' + info.name + '. It\'s in Log > Today.');
    var tiles = items.filter(function (x) { return /^tile:/.test(x.k); }), plans = items.filter(function (x) { return /^day:|^bill:|^ring:/.test(x.k); });
    if (tiles.length) out.push(tiles.length === 1 ? 'One tile to do: ' + tiles[0].text.replace(/ ·.*$|\.$/, '') + '.' : tiles.length + ' tiles to do, starting with ' + tiles[0].text.replace(/ ·.*$|\.$/, '') + '.');
    if (plans.length) out.push(plans.length === 1 ? plans[0].text : plans.length + ' things on the plan today.');
    if (!tiles.length && !plans.length) out.push('Nothing on the board today. A free day!');
    if (AIU.vitals) { var vs = AIU.vitals.state(S); if (vs.distressed) out.push('I\'m worn out. Something calm would help (tap the drone).'); else if (vs.avg < 50) out.push('My Vitals are getting low. A calm thing would help.'); }
    if (AIU.play) { var lv = AIU.play.levels(), nm = C.setting(S, 'buddyName', '') || 'The pet'; if (lv.tummy < 35 && lv.water < 35) out.push(nm + ' is hungry and thirsty.'); else if (lv.tummy < 35) out.push(nm + ' is hungry.'); else if (lv.water < 35) out.push(nm + ' needs water.'); }
    if (L.needsPotty()) out.push('And I really need the outhouse!');
    return out;
  }
  L.lines = lines;
  function sig() { var a = app(), S = a.S; if (!S || !S.hatched) return ''; var lv = AIU.play ? AIU.play.levels() : { tummy: 99, water: 99 }; return ui().todayItems().map(function (x) { return x.k; }).sort().join(',') + '|' + (lv.tummy < 35) + (lv.water < 35) + L.needsPotty() + !!(AIU.vitals && AIU.vitals.state(S).avg < 50); }
  L.news = function () { var a = app(); return !!(a.S && a.S.hatched && a.local.briefSig !== sig()); };
  var BOARD_SPOT = { x: 46, y: 132 };
  L.standup = function () {
    var a = app(), S = a.S; if (!S || !S.hatched) return ui().todaySheet();
    var sc = a.view && a.view.sc, outside = sc && !A.isRoom(sc) && !sc.aiuIn;
    function show() {
      var ls = lines(); a.local.briefAt = Date.now(); a.local.briefSig = sig(); a.saveLocal();
      ui().todaySheet(ls); if (!a.dev.mute && a.dev.voiceMode && a.dev.voiceMode !== 'babble' && a.dev.voiceMode !== 'off') a.speak(ls.join(' '), true); else a.babble && a.babble(ls[0]);
    }
    if (!outside || a.busyNow() || (AIU.toy && AIU.toy.holding())) return show();
    a.forceAct = null; a.free = null;
    a.visit = { id: 'board', dir: 'go', phase: 'walk', start: Date.now(), dur: 1400, fun: true };
    setTimeout(function () {
      if (!a.visit || a.visit.id !== 'board') return show();
      a.visit = { id: 'board', phase: 'in' }; if (AIU.toy.anim) AIU.toy.anim({ kind: 'reading', end: Date.now() + 6000, at: BOARD_SPOT, hides: 'aiu', until: function () { return !!document.querySelector('.sheet.tsheet'); } });
      a.beep('knock'); show();
      var iv = setInterval(function () { if (!document.querySelector('.sheet.tsheet')) { clearInterval(iv); if (a.visit && a.visit.id === 'board') a.visit = { id: 'board', dir: 'back', phase: 'walk', start: Date.now(), dur: 1200 }; setTimeout(function () { if (a.visit && a.visit.id === 'board') a.visit = null; }, 1300); } }, 400);
    }, 1400);
  };
  function briefTick() {
    var a = app(), S = a.S; if (!S || !S.hatched || !ui().onMain || document.hidden || ui().tab !== 'world') return;
    if (a.casting || a.hatching || a.evolve || a.busyNow() || document.querySelector('.sheet, .gov, .bov') || (AIU.toy && AIU.toy.holding())) return;
    if (Date.now() - (ui().lastTouch || 0) < 4000) return;
    var day = U.dayStr(new Date(a.trueNow())); if (!(a.readingShown && a.readingShown(day))) return; // after the toss
    if (Date.now() - (a.local.briefAt || 0) < 3 * 3600000) return;
    L.standup();
  }
  setInterval(function () { try { pottyTick(); briefTick(); } catch (e) {} }, 5000);
})();
