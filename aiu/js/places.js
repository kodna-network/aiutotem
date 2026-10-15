/* AIU TOTEM 2.2.0 - places: buildings you visit from the row of icons under Aiu's world (no names, just pictures).
   Tap one and you and Aiu are there at once, with the project of the day. Nothing here is timed: these are slow, hands-on
   lessons that grow Aiu a little (+3, once a day per building) and grow you a lot.
     Garage      - Aiu's ride (a car, bike, motorcycle, horse carriage or spaceship) and its upkeep, one job at a time
     Barn        - looking after livestock, chore by chore (farm.js)
     Greenhouse  - collect, germinate, plant, grow, harvest and cross seeds (farm.js)
     Laboratory  - code, prompts, 3D printing, electronics and thinking for yourself (lab.js)
   Progress is saved as 'place' events (one small value per key, newest wins) and lessons as 'lesson' events. */
(function () {
  'use strict';
  var U = AIU.util, A = AIU.art, P = A.P, K = A.prim, R = K.R, px = K.px, spr = K.spr, disc = K.disc, ell = K.ell, tri = K.tri, line = K.line, h = U.h, C = AIU.core;
  var PL = AIU.places = { list: [] };
  function app() { return AIU.app; }
  function KK() { return AIU.ui.k; }
  var today = U.today;

  /* ---------- saved state ---------- */
  PL.get = function (S, b, k, d) { var x = ((S.places || {})[b] || {})[k]; return x ? x.v : d; };
  PL.all = function (S, b) { var o = {}, B = (S.places || {})[b] || {}; Object.keys(B).forEach(function (k) { o[k] = B[k].v; }); return o; };
  PL.set = function (b, kv) { var ev = Object.keys(kv).map(function (k) { return { type: 'place', data: { b: b, k: k, v: kv[k] } }; }); return app().addEvents(ev, true); };
  PL.learned = function (b, id, extra) { // a lesson finished: +3 growth once a day per building (core.js counts it)
    var a = app(), ev = [{ type: 'lesson', data: { b: b, id: String(id).slice(0, 40) } }];
    Object.keys(extra || {}).forEach(function (k) { ev.push({ type: 'place', data: { b: b, k: k, v: extra[k] } }); });
    return a.addEvents(ev, true).then(function () { a.react('quest', '+3'); });
  };
  PL.lessonsToday = function (S, b) { var L = S.lessons || {}; return !!L[b + '|' + today()]; };
  PL.capsule = function (S) { return { places: S.places || {}, lessons: S.lessons || {} }; };
  function shuf(n, key) { var r = U.rng(U.hash32(String(key) + today())), a = []; for (var i = 0; i < n; i++) a.push(i); for (var j = n - 1; j > 0; j--) { var x = Math.floor(r() * (j + 1)), t = a[j]; a[j] = a[x]; a[x] = t; } return a; } // answers in a different order each day
  PL.shuffle = shuf;
  if (AIU.hooks) AIU.hooks.open.push(function () { if (cur) cur.close(); }); // switching profiles closes the building
  PL.register = function (def) { PL.list.push(def); PL[def.id] = def; };

  /* ---------- the icons under the world ---------- */
  var ICON = {
    garage: ['....rrrrrrrr....', '...rrrrrrrrrr...', '..rrrrrrrrrrrr..', '.rrrrrrrrrrrrrr.', 'ssssssssssssssss', 'sSSSSSSSSSSSSSSs', 'sSddddddddddddSs', 'sSSSSSSSSSSSSSSs', 'sSddddddddddddSs', 'sSSSSSSSSSSSSSSs', 'sSdd.bbbbbb.ddSs', 'sS..bbiiiibb..Ss', 'sS.kbbbbbbbbk.Ss', 'sS..kk....kk..Ss', 'ssssssssssssssss'],
    barn: ['......rr......', '....rrrrrr....', '..rrrrrrrrrr..', '.rrrwwwwwwrrr.', 'rrrrw....wrrrr', 'rrrrw....wrrrr', 'rrrrwwwwwwrrrr', 'rrrrrrrrrrrrrr', 'rrwwwwrrwwwwrr', 'rrw.www.www.wr', 'rrww.wwww.wwrr', 'rrw.ww.ww.wwrr', 'rrwwwwrrwwwwrr', 'gggggggggggggg'],
    greenhouse: ['......cc......', '....cccccc....', '..cciiccciicc..', '.ciiciiiciiic.', 'cciiciiiciiicc', 'ciiiciiiciiiic', 'ciiiciiiciiiic', 'cccccccccccccc', 'ciglcigl.ciglc', 'ciglciglgciglc', 'cWWWcWWWcWWWWc', 'cWWWcWWWcWWWWc', 'cccccccccccccc'],
    lab: ['....kkkkkk....', '....kssssk....', '.....kssk.....', '.....kssk.....', '.....kssk.....', '....kssssk....', '...kssssssk...', '..kslllllssk..', '.ksllglllllsk.', 'kslllllglllllk', 'ksllgllllglllk', 'kslllllllllllk', '.kkkkkkkkkkkk.']
  };
  var PIXC = { k: '#1a1c2c', r: '#b13e53', w: '#f4f4f4', s: '#94b0c2', S: '#566c86', d: '#333c57', b: '#3b5dc9', i: '#41a6f6', c: '#73eff7', g: '#38b764', l: '#a7f070', W: '#a0673e', y: '#ffcd75' };
  function iconSvg(rows) {
    var w = 0, paths = {}; rows.forEach(function (r, y) { w = Math.max(w, r.length); for (var x = 0; x < r.length; x++) { var ch = r.charAt(x); if (ch !== '.') paths[ch] = (paths[ch] || '') + 'M' + x + ' ' + y + 'h1v1h-1z'; } });
    var sz = Math.max(w, rows.length);
    return '<svg viewBox="' + ((w - sz) / 2) + ' ' + ((rows.length - sz) / 2) + ' ' + sz + ' ' + sz + '" shape-rendering="crispEdges" aria-hidden="true">' + Object.keys(paths).map(function (c) { return '<path fill="' + PIXC[c] + '" d="' + paths[c] + '"/>'; }).join('') + '</svg>';
  }
  PL.iconRow = function () {
    var row = h('div', { cls: 'bldgrow', role: 'group', 'aria-label': 'Places to go' });
    PL.list.forEach(function (def) {
      var b = h('button', { type: 'button', cls: 'bldg', 'aria-label': def.aria, title: '', onclick: function () { PL.open(def.id); } });
      b.innerHTML = iconSvg(ICON[def.id]);
      var dot = h('i', { cls: 'bdot', 'aria-hidden': 'true' }); b.appendChild(dot); def._dot = dot;
      row.appendChild(b);
    });
    PL.refreshDots();
    return row;
  };
  PL.refreshDots = function () { var S = app().S; if (!S) return; PL.list.forEach(function (d) { if (d._dot) d._dot.hidden = !(d.pending && d.pending(S)); }); }; // a little dot: something waiting there today

  /* ---------- the visit: a picture on top, the project below. Close takes you back. ---------- */
  var cur = null;
  PL.open = function (id) {
    var a = app(), S = a.S, def = PL[id]; if (!def || !S) return;
    if (!S.hatched) { KK().snack('Hatch your egg first. Then ' + S.totemName + ' can come along.'); return; }
    if (cur) cur.close();
    var ov = h('div', { cls: 'bov', role: 'dialog', 'aria-label': def.aria }), cv = h('canvas', { cls: 'bcv', width: 192 * 4, height: 108 * 4, 'aria-hidden': 'true' }), body = h('div', { cls: 'bbody' }); // 2.3.0: drawn 4x (crisp bigger diagrams)
    var V = { id: id, ov: ov, cv: cv, body: body, f: 0, t0: Date.now(), alive: true, ui: {} };
    ov.appendChild(h('div', { cls: 'bhead' }, h('b', { cls: 'btitle2', text: def.title }), h('button', { type: 'button', cls: 'gclose', text: 'Close', onclick: function () { V.close(); } })));
    ov.appendChild(h('div', { cls: 'bpic' }, cv)); ov.appendChild(body);
    document.body.appendChild(ov); document.documentElement.classList.add('gopen');
    V.close = function () { if (!V.alive) return; V.alive = false; ov.remove(); document.documentElement.classList.remove('gopen'); cur = null; if (AIU.toy) AIU.toy.visitDone(); if (AIU.ui.refresh) AIU.ui.refresh(true); }; // 2.3.0: Aiu walks back out to the field
    V.render = function () { if (!V.alive) return; KK().clear(body); def.view(V, app().S); var f0 = body.querySelector('button'); void f0; };
    V.say = function (txt) { V.bubble = { t: Date.now(), text: txt }; };
    ov.addEventListener('keydown', function (e) { if (e.key === 'Escape') V.close(); });
    var last = 0;
    function loop(ts) {
      if (!V.alive) return; requestAnimationFrame(loop); var T0 = V.task;
      if (!T0 && ts - last < 110) return; var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0; last = ts; if (!T0 || Math.floor(ts / 110) !== Math.floor((ts - dt * 1000) / 110)) V.f++;
      var c = cv.getContext('2d'); c.setTransform(4, 0, 0, 4, 0, 0); c.imageSmoothingEnabled = false; c.clearRect(0, 0, 192, 108);
      if (T0) { if (!T0.over && T0.step) T0.step(dt); T0.draw(c, V); return; } // 2.3.1: a hands-on mini game is running in the picture
      V.hot = []; def.draw(c, V, app().S);
    }
    function ptOf(e) { var r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * 192, y: (e.clientY - r.top) / r.height * 108 }; }
    ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'].forEach(function (ev) {
      cv.addEventListener(ev, function (e) { var T0 = V.task; if (!T0 || T0.over) return; e.preventDefault(); var p = ptOf(e); if (ev === 'pointerdown') { V.pdown = true; try { cv.setPointerCapture(e.pointerId); } catch (x) {} if (T0.down) T0.down(p); } else if (ev === 'pointermove') { if (T0.move) T0.move(p, V.pdown); } else { V.pdown = false; if (T0.up) T0.up(p); } }, { passive: false });
    });
    cv.addEventListener('click', function (e) { if (V.task) return; // 2.3.0: tap a part in the picture
      var r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 192, y = (e.clientY - r.top) / r.height * 108, best = null, bd = 1e9;
      (V.hot || []).forEach(function (hs) { var d = Math.hypot(hs.x - x, hs.y - y); if (d < (hs.r || 9) && d < bd) { bd = d; best = hs; } });
      if (best && best.tap) best.tap();
    });
    cur = V; requestAnimationFrame(loop); V.render();
    a.beep('door');
    return V;
  };
  // Aiu, standing in a building (his look right now)
  PL.aiu = function (c, x, fy, f, mood) {
    var sc = app().sceneState(), form = sc.skin || sc.form; if (!form) return;
    var cr = A.creature(form.seed, form.stage, sc.soul), fr = cr.frames[mood === 'happy' ? 'happy' : f % 40 < 2 ? 'blink' : 'open'] || cr.frames.open;
    c.drawImage(fr, Math.round(x - cr.w / 2), Math.round(fy - cr.bottom - 1 + (f % 8 < 4 ? 0 : -1)));
    return cr;
  };
  PL.accent = function () { var sc = app().sceneState(); return (sc && typeof sc.accent === 'string' && sc.accent) || P.red; };
  // shared UI bits for lessons
  PL.card = function (title, kids, cls) { return h('section', { cls: 'bcard' + (cls ? ' ' + cls : '') }, title ? h('h3', { text: title }) : null, kids); };
  PL.btn = function (label, fn, cls) { return KK().btn(label, fn, cls); };

  /* ---------- "put the steps in order": the shared puzzle (no timer, no penalty: a wrong tap gives a hint) ----------
     L = {title, why, tools: [], steps: [[text, why]...], check: [{q, opts: [...], a: index, why}]} */
  PL.orderPuzzle = function (into, L, onDone, opts) {
    opts = opts || {};
    var k = KK(), seed = U.hash32(L.id + today()), r = U.rng(seed), order = L.steps.map(function (s, i) { return i; });
    for (var i = order.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = order[i]; order[i] = order[j]; order[j] = t; }
    var next = 0, box = h('div', { cls: 'bpuz' }), doneList = h('ol', { cls: 'bdone' }), cards = h('div', { cls: 'bsteps' }), msgEl = h('p', { cls: 'bmsg', 'aria-live': 'polite' });
    if (L.why) box.appendChild(h('p', { cls: 'bwhy', text: L.why }));
    if (L.tools && L.tools.length) box.appendChild(h('p', { cls: 'small' }, h('b', { text: 'You\'ll need: ' }), L.tools.join(', ') + '.'));
    box.appendChild(h('p', { cls: 'small', text: 'Tap the steps in the order you\'d do them. No timer: think it through. A wrong tap just gives you a hint.' }));
    box.appendChild(doneList); box.appendChild(msgEl); box.appendChild(cards);
    function draw() {
      k.clear(cards);
      order.forEach(function (si) {
        if (si < next) return;
        cards.appendChild(h('button', { type: 'button', cls: 'bstep', onclick: function () { tap(si); } }, L.steps[si][0]));
      });
    }
    function tap(si) {
      if (si === next) {
        doneList.appendChild(h('li', null, h('b', { text: L.steps[si][0] }), L.steps[si][1] ? h('span', { cls: 'small', text: ' ' + L.steps[si][1] }) : null));
        next++; msgEl.textContent = next < L.steps.length ? 'Yes. What comes next?' : '';
        if (opts.onStep) opts.onStep(next, L.steps.length);
        if (next >= L.steps.length) { k.clear(cards); return check(0); }
        draw();
      } else {
        var hint = L.steps[next][1] || 'something else has to happen first';
        msgEl.textContent = 'Not yet: that one comes later. Hint for the next step: ' + hint + '.';
        msgEl.classList.remove('shake'); void msgEl.offsetWidth; msgEl.classList.add('shake');
      }
    }
    function check(qi) {
      var q = (L.check || [])[qi];
      if (!q) { finish(); return; }
      var qb = h('div', { cls: 'bq' }, h('p', null, h('b', { text: q.q })));
      shuf(q.opts.length, q.q).forEach(function (oi) { var o = q.opts[oi];
        qb.appendChild(h('button', { type: 'button', cls: 'bstep', onclick: function () {
          if (oi === q.a) { k.clear(cards); cards.appendChild(h('p', { cls: 'bgood', text: 'Right. ' + (q.why || '') })); cards.appendChild(PL.btn(qi + 1 < (L.check || []).length ? 'Next question' : 'Finish', function () { check(qi + 1); }, 'primary')); }
          else msgEl.textContent = 'Not quite. ' + (q.hint || 'Read the steps above again.');
        } }, o));
      });
      k.clear(cards); cards.appendChild(qb);
    }
    var finished = false;
    function finish() { if (finished) return; finished = true; k.clear(cards); msgEl.textContent = ''; if (onDone) onDone(); }
    draw();
    into.appendChild(box);
  };

  /* ---------- question cards, one at a time (no timer). cards: [{q, opts, a, why, fact}] ---------- */
  PL.quiz = function (into, cards, onDone, opts) {
    opts = opts || {}; var k = KK(), i = 0, box = h('div', { cls: 'bpuz' }), msgEl = h('p', { cls: 'bmsg', 'aria-live': 'polite' }), area = h('div');
    box.appendChild(area); box.appendChild(msgEl); into.appendChild(box);
    function show() {
      k.clear(area); msgEl.textContent = '';
      var q = cards[i]; if (!q) { if (onDone) onDone(); return; }
      if (opts.count !== false) area.appendChild(h('p', { cls: 'small', text: (opts.label || 'Card') + ' ' + (i + 1) + ' of ' + cards.length }));
      if (q.pic && opts.pic) area.appendChild(opts.pic(q));
      area.appendChild(h('p', null, h('b', { text: q.q || '' }), AIU.ui.speakBtn ? AIU.ui.speakBtn(function () { return (q.q || '') + ' ' + (q.do || '') + (q.opts ? ' ' + q.opts.map(function (o, oi) { return 'Option ' + (oi + 1) + ': ' + o + '.'; }).join(' ') : ''); }, true) : null)); // 2.3.0: hear the card
      if (q.code) area.appendChild(h('pre', { cls: 'bcode', text: q.code }));
      var wrong = 0;
      if (!q.opts) { // a "try it yourself" card: do it on paper or for real, then come back
        if (q.do) area.appendChild(h('p', { cls: 'bwhy', text: q.do }));
        area.appendChild(k.btn(q.btn || 'I tried it', function () { if (opts.onRight) opts.onRight(i, q); i++; show(); }, 'primary'));
        return;
      }
      shuf(q.opts.length, q.q).forEach(function (oi) { var o = q.opts[oi];
        area.appendChild(h('button', { type: 'button', cls: 'bstep', onclick: function (e) {
          if (oi === q.a) {
            k.clear(area); msgEl.textContent = '';
            area.appendChild(h('p', null, h('b', { text: o })));
            area.appendChild(h('p', { cls: 'bgood', text: (wrong ? 'Got it. ' : 'Right. ') + (q.why || '') }));
            if (q.fact) area.appendChild(h('p', { cls: 'small', text: q.fact }));
            if (opts.onRight) opts.onRight(i, q);
            area.appendChild(k.btn(i + 1 < cards.length ? 'Next' : 'Finish', function () { i++; show(); }, 'primary'));
          } else { wrong++; e.target.disabled = true; msgEl.textContent = 'Not quite. ' + (q.hint || 'Try another one.'); }
        } }, o));
      });
    }
    show();
  };

  /* ===================================================================================
     THE GARAGE: Aiu's ride and its upkeep. New at the start: wash and polish it. Then the miles add up week by week and
     jobs come due: an oil change, a flat, wipers, the battery... At most 3 open at once (new ones wait until those are
     fixed), and an engine check only comes when everything else is fixed. Advanced jobs (spark plugs, the sunroof, the
     transmission) only if you turn them on. The shop manual has every job to practice any time.
     =================================================================================== */
  var V0 = { car: 'Car', bike: 'Bicycle', moto: 'Motorcycle', carriage: 'Horse carriage', ship: 'Spaceship' };
  var RATE = { car: 35, bike: 4, moto: 20, carriage: 6, ship: 900 }, UNIT = { car: 'miles', bike: 'miles', moto: 'miles', carriage: 'miles', ship: 'light-seconds' };
  // the jobs. steps: [what you do, why / a hint]
  var JOBS = {
    wash: { title: 'Wash and polish it', why: 'A clean car lasts longer: road salt, bird droppings and grime eat paint and rust metal.', tools: ['two buckets', 'car wash soap (not dish soap: it strips wax)', 'a wash mitt', 'microfiber towels', 'wax or polish'],
      steps: [['Park in the shade and let it cool', 'soap dries in streaks on hot paint'], ['Rinse off loose dirt, top to bottom', 'so you don\'t grind grit into the paint'], ['Fill two buckets: soapy water and clean rinse water', 'the rinse bucket keeps dirt off the mitt'], ['Wash top to bottom, rinsing the mitt often', 'the bottom is the dirtiest: do it last'], ['Rinse it all off', 'leftover soap leaves spots'], ['Dry with microfiber towels', 'air-drying leaves water spots'], ['Wax a small section at a time, thin coat', 'a thin coat buffs off easier'], ['Buff off the haze with a clean towel', 'that\'s the shine']],
      check: [{ q: 'Why two buckets?', opts: ['One for soap, one to rinse the mitt so dirt doesn\'t go back on the paint', 'To wash twice as fast', 'One for each side of the car'], a: 0, why: 'Dirt in your soap bucket turns into sandpaper.' }] },
    oil: { title: 'Change the oil', why: 'Oil keeps the engine\'s metal parts from grinding. It wears out: change it about every 5,000 miles (your manual says exactly).', tools: ['the right oil (the manual says which and how much)', 'a new oil filter', 'a drain pan', 'a wrench for the drain plug', 'an oil filter wrench', 'ramps, or a jack and jack stands', 'a funnel'],
      steps: [['Look up the oil type and amount in the manual', 'the wrong oil can hurt the engine'], ['Warm it up a few minutes, park level, engine off', 'warm oil drains better; level reads true'], ['Lift it safely: ramps, or a jack plus jack stands', 'never get under a car held only by a jack'], ['Put the drain pan under the drain plug', 'about 5 quarts are coming out'], ['Unscrew the drain plug and let it drain', 'careful: the oil is warm'], ['Put the plug back with a new washer, snug', 'too tight strips the threads'], ['Swap the filter: rub fresh oil on the new gasket, hand-tight', 'the oil helps it seal'], ['Lower the car', 'it has to be level to fill'], ['Pour in the new oil and check the dipstick', 'between the two marks'], ['Run it a minute, look for leaks, check the level again', 'the filter soaks some up'], ['Take the old oil to a recycling spot (most auto parts stores)', 'one quart can foul a million gallons of water']],
      check: [{ q: 'What has to hold the car up while you\'re under it?', opts: ['Jack stands or ramps', 'The jack', 'A stack of bricks'], a: 0, why: 'Jacks lift; stands hold.' }] },
    flat: { title: 'Change a flat tire', why: 'Roads throw nails. Knowing this saves you a tow and a long wait.', tools: ['the spare tire', 'the jack', 'the lug wrench', 'gloves', 'a flashlight'],
      steps: [['Pull over somewhere flat and safe, hazards on, parking brake on', 'never on a slope or a curve'], ['Get out the spare, jack and lug wrench', 'usually under the trunk floor'], ['Loosen each lug nut half a turn while the tire is on the ground', 'on the ground it can\'t spin'], ['Jack it up at the jack point (see the manual) until the tire is off the ground', 'the wrong spot can bend the body'], ['Take off the lug nuts and the flat', 'keep the nuts in a hubcap so they don\'t roll away'], ['Put on the spare', 'line up the holes with the studs'], ['Hand-tighten the lug nuts in a star pattern', 'a star pattern seats the wheel evenly'], ['Lower the car', 'so the tire can\'t spin while you tighten'], ['Tighten the nuts all the way, star pattern again', 'then check them again after a few miles'], ['Check the spare\'s pressure, and get the flat fixed', 'little "donut" spares: under 50 mph, short trips']],
      check: [{ q: 'When do you loosen the lug nuts?', opts: ['Before you jack it up, with the tire on the ground', 'After the tire is in the air', 'It doesn\'t matter'], a: 0, why: 'In the air, the wheel just spins.' }] },
    wipers: { title: 'Replace the wiper blades', why: 'Streaky wipers are a safety problem in rain. Blades wear out in about 6 to 12 months.', tools: ['new blades in the right sizes (the store\'s book or the manual)'],
      steps: [['Find your blade sizes (driver and passenger are often different)', 'the store has a lookup book'], ['Lift the wiper arm away from the glass', 'put a towel on the glass in case it snaps back'], ['Press the tab and slide the old blade off the hook', 'look at how it came off'], ['Slide the new blade onto the hook until it clicks', 'same direction as the old one'], ['Lower the arm gently', 'a snapping arm can crack the windshield'], ['Test them with washer fluid', 'no streaks, no chatter']] },
    diag: { title: 'Check engine light: read the code', why: 'The light means the car\'s computer saved a trouble code. A cheap OBD-II scanner tells you what it is.', tools: ['an OBD-II code reader (or a free scan at an auto parts store)'],
      steps: [['Notice how it\'s acting: a FLASHING light means stop driving soon', 'flashing = misfire that can wreck the catalytic converter'], ['Check the gas cap: tighten it until it clicks', 'a loose cap is the most common cause'], ['Find the OBD-II port under the dashboard, near the steering column', 'a 16-pin plug'], ['Plug in the scanner and turn the key to ON', 'engine off is fine'], ['Read the code (like P0420)', 'write it down'], ['Look up what it means for your car', 'the same code can have different causes'], ['Fix the simple things, or book a mechanic with the code in hand', 'the code points the way; it\'s not always the answer'], ['Clear the code and see if it comes back', 'if it does, it\'s real']],
      check: [{ q: 'The check engine light is FLASHING. What should you do?', opts: ['Pull over soon and get it checked', 'Keep driving, it\'s fine', 'Turn the radio up'], a: 0, why: 'A flashing light is a serious misfire.' }] },
    battery: { title: 'Swap the battery', why: 'Car batteries last about 3 to 5 years. Slow starts in the cold are the warning.', tools: ['a new battery (same group size)', 'wrenches (often 10 mm)', 'gloves and glasses', 'a terminal brush', 'baking soda and water'],
      steps: [['Engine off, keys out', 'no sparks, no surprises'], ['Write down radio or alarm codes if your car needs them', 'some radios lock without power'], ['Disconnect the NEGATIVE (black, -) cable first', 'so a slipped wrench can\'t short to the body'], ['Then disconnect the POSITIVE (red, +) cable', ''], ['Remove the hold-down clamp', ''], ['Lift the old battery out (it\'s heavy: lift with your legs)', 'about 40 pounds'], ['Clean the cable ends with baking soda water and a brush', 'the white crust is corrosion'], ['Set the new battery in and clamp it down', 'a loose battery shakes apart'], ['Connect POSITIVE first, then NEGATIVE', 'the reverse of taking it off'], ['Take the old battery back to the store to recycle', 'it\'s full of lead and acid']],
      check: [{ q: 'Which cable comes off first?', opts: ['Negative (black)', 'Positive (red)', 'Either one'], a: 0, why: 'Negative first off, last on.' }] },
    jump: { title: 'Jump-start a dead battery', why: 'Someone left the lights on. Jumper cables and a helper car get you going.', tools: ['jumper cables', 'a car with a good battery'],
      steps: [['Park the cars close (not touching), both turned off', 'keep the cables clear of fans and belts'], ['Red clamp to the dead battery\'s + post', ''], ['Other red clamp to the good battery\'s + post', ''], ['Black clamp to the good battery\'s - post', ''], ['Last black clamp to bare metal on the dead car, away from the battery', 'any spark happens away from battery gas'], ['Start the good car and let it run a few minutes', 'it charges the dead one a little'], ['Start the dead car', 'if it only clicks, wait longer'], ['Take the clamps off in the reverse order', 'black from the bare metal first'], ['Drive at least 20 minutes', 'to charge it back up']] },
    tirerot: { title: 'Check tire pressure and rotate the tires', why: 'Right pressure saves gas and tires. Rotating every 5,000 to 7,500 miles makes them wear evenly.', tools: ['a tire pressure gauge', 'an air pump', 'a jack and jack stands', 'the lug wrench'],
      steps: [['Check pressure when the tires are cold', 'driving warms them and raises the reading'], ['Find the right pressure on the sticker inside the driver\'s door', 'not the number on the tire (that\'s the max)'], ['Add air to any that are low', 'a little at a time, check again'], ['Loosen lug nuts on all four, then lift the car on stands', 'two at a time is fine if you only have two stands'], ['Move the tires in the pattern your manual shows', 'often front to back on the same side'], ['Tighten the lug nuts in a star pattern', ''], ['Lower the car and tighten them all the way', '']] },
    airfilter: { title: 'Replace the engine air filter', why: 'The engine breathes through this filter. A clogged one wastes gas.', tools: ['a new air filter', 'maybe a screwdriver'],
      steps: [['Open the hood and find the air box (a big plastic box with a hose)', ''], ['Undo the clips or screws on the lid', ''], ['Lift out the old filter and look at it', 'gray and clogged? time to change'], ['Wipe out leaves and dirt in the box', ''], ['Set the new filter in, the same way the old one sat', 'the rubber edge seals it'], ['Close the lid and do up every clip', 'a leak lets dirt in']] },
    brakes: { title: 'Replace the brake pads', why: 'Squealing means the wear indicator is touching; grinding means metal on metal. Pads are a do-it-yourself job with care.', tools: ['new brake pads for your car', 'a jack and jack stands', 'the lug wrench', 'a socket set', 'a C-clamp', 'brake grease', 'a bungee cord'],
      steps: [['Loosen the lug nuts, lift the car onto jack stands, remove the wheel', ''], ['Remove the caliper bolts and lift the caliper off', 'look at how the pads sit first'], ['Hang the caliper with a bungee: never let it hang by the brake hose', 'the hose can tear inside'], ['Take out the old pads and clips', ''], ['Press the caliper piston back with a C-clamp and an old pad', 'the new pads are thicker'], ['Grease the slides and put in the new pads and clips', 'not on the pad faces!'], ['Put the caliper back and tighten its bolts', 'to the torque in the manual'], ['Wheel back on, lower the car, tighten the lugs', ''], ['Pump the brake pedal until it\'s firm BEFORE driving', 'the first press goes to the floor'], ['Bed them in: a few gentle stops from 30 mph', 'it helps the new pads grip evenly']],
      check: [{ q: 'What must you do before driving after new pads?', opts: ['Pump the brake pedal until it\'s firm', 'Nothing', 'Honk twice'], a: 0, why: 'Otherwise the first stop may not happen.' }] },
    coolant: { title: 'Check the coolant', why: 'Coolant keeps the engine from overheating in summer and freezing in winter.', tools: ['the right coolant (the manual says which kind)', 'a funnel'],
      steps: [['Only check when the engine is COLD', 'a hot radiator cap can spray boiling coolant'], ['Find the see-through overflow tank', 'it has MIN and MAX lines'], ['Look at the level and the color', 'brown or oily means it needs a pro'], ['If it\'s low, add the right coolant up to MAX', 'don\'t mix types'], ['Close the cap tightly', ''], ['Watch the temperature gauge on your next drives', 'if it keeps dropping, there\'s a leak']] },
    sparkplugs: { title: 'Change the spark plugs (advanced)', why: 'Worn plugs make the engine misfire and waste gas. Many last 60,000 to 100,000 miles.', tools: ['the right plugs', 'a spark plug socket and extension', 'a torque wrench', 'a gap tool'],
      steps: [['Engine cold, one plug at a time', 'so the wires or coils don\'t get mixed up'], ['Pull the coil or plug wire off one plug', 'pull the boot, not the wire'], ['Blow away dirt around the plug hole', 'so nothing falls into the engine'], ['Unscrew the old plug', ''], ['Check the new plug\'s gap and set it', 'the gap is in the manual'], ['Start the new plug by hand', 'cross-threading wrecks the head'], ['Tighten it to the torque spec', 'not too tight'], ['Put the coil or wire back, then do the next one', '']] },
    sunroof: { title: 'Clear the sunroof drains (advanced)', why: 'Sunroofs have drain tubes in the corners. When they clog, water leaks into the headliner.', tools: ['a shop vacuum or gentle compressed air', 'a piece of trimmer line', 'silicone grease', 'a damp cloth'],
      steps: [['Open the sunroof all the way', ''], ['Find the drain holes in the front (and back) corners', ''], ['Clear them gently: low air or a piece of trimmer line', 'never a sharp wire (it can poke the tube)'], ['Pour a little water in the tray and watch it drain under the car', 'behind the front wheels, usually'], ['Wipe the seal with a damp cloth', ''], ['Put a thin coat of silicone grease on the tracks', 'it keeps it sliding smooth']] },
    transmission: { title: 'Check the transmission fluid (advanced)', why: 'Transmission fluid cools and shifts the gears. Low or burnt fluid means expensive trouble.', tools: ['the exact fluid your manual names', 'a funnel', 'a clean rag'],
      steps: [['Check the manual: some cars have a sealed transmission with no dipstick', 'those are a shop job'], ['Warm up the car and park level', 'the reading is for warm fluid'], ['Most cars: engine running, in Park, parking brake on', 'some say Neutral: follow the manual'], ['Pull the transmission dipstick, wipe it, put it back, pull it again', ''], ['Read it on the HOT marks', ''], ['Look and smell: red and sweet is good; brown or burnt is bad', 'burnt fluid needs a mechanic'], ['Add a little at a time through the dipstick tube if it\'s low', 'overfilling causes problems too']] },
    // bicycle
    bwash: { title: 'Clean and lube the chain', why: 'A clean, oiled chain shifts smooth and lasts thousands of miles longer.', tools: ['a rag', 'degreaser', 'a brush', 'bike chain lube'], steps: [['Shift to the smallest rear cog', 'the chain sits straight'], ['Scrub the chain with degreaser and a brush', ''], ['Wipe it dry with a rag', ''], ['Put one drop of lube on each roller while you pedal backward', ''], ['Wait a minute, then wipe off the extra', 'extra oil collects dirt']] },
    bflat: { title: 'Fix a flat tube', why: 'Every rider gets flats. Carry a spare tube, levers and a pump.', tools: ['tire levers', 'a spare tube or a patch kit', 'a pump'], steps: [['Release the brake if needed and take the wheel off', ''], ['Let out any air left in the tube', ''], ['Hook two tire levers under the bead and pop one side off', ''], ['Pull out the tube', ''], ['Run your fingers inside the tire to find what caused it', 'carefully: it might still be sharp'], ['Put in a slightly inflated tube, valve first', ''], ['Push the bead back on with your thumbs', 'levers can pinch the new tube'], ['Pump it to the pressure on the tire\'s side', ''], ['Put the wheel back and check the brakes', '']] },
    bbrake: { title: 'Adjust the brakes', why: 'Pads wear down and cables stretch. Brakes should stop you hard before the lever touches the bar.', tools: ['an Allen key', ''], steps: [['Squeeze the lever: does it pull too far?', ''], ['Look at the pads: worn to the lines? replace them', ''], ['Turn the barrel adjuster out a turn to tighten the cable', 'small turns'], ['Check that the pads hit the rim (or rotor) squarely', ''], ['Spin the wheel: nothing should rub', ''], ['Test ride slowly and brake hard once', '']] },
    // motorcycle
    mchain: { title: 'Clean, lube and adjust the chain', why: 'A neglected chain can wear out the sprockets or even snap.', tools: ['a stand', 'chain cleaner', 'a soft brush', 'chain lube', 'wrenches'], steps: [['Put the bike on a stand, engine off', 'never turn the wheel with the engine running'], ['Clean the chain with chain cleaner and a soft brush', ''], ['Dry it', ''], ['Spray lube on the inside of the chain while turning the wheel by hand', ''], ['Check the slack in the middle (the manual says how much)', 'usually about an inch'], ['Loosen the axle nut and turn the adjusters evenly on both sides', 'keep the wheel straight'], ['Tighten the axle nut and recheck the slack', '']] },
    moil: { title: 'Change the motorcycle oil', why: 'Bikes run hot and fast; fresh oil matters even more than in a car.', tools: ['motorcycle oil (made for wet clutches)', 'a new filter', 'a drain pan', 'wrenches'], steps: [['Warm it up, then put it on a stand, level', ''], ['Drain pan under the plug, remove the plug', ''], ['Swap the filter', ''], ['Plug back in with a new washer', ''], ['Fill to the line on the sight glass', 'motorcycle oil, not car oil: car oil can make the clutch slip'], ['Run it, check for leaks, check the level', '']] },
    mtire: { title: 'Check tire pressure and tread', why: 'Two tires carry everything. Low pressure makes a bike steer badly.', tools: ['a gauge', 'a pump', 'a penny or tread gauge'], steps: [['Check cold, before a ride', ''], ['Set pressure to the number in the manual or on the swingarm sticker', ''], ['Look at the tread wear bars', ''], ['Look for nails, cracks or bulges', ''], ['Spin each wheel and look for wobble', '']] },
    // horse carriage
    choof: { title: 'Pick and check the horse\'s hooves', why: 'A stone in a hoof can lame a horse. Clean feet every day.', tools: ['a hoof pick', 'a brush'], steps: [['Stand by the horse\'s shoulder, facing its tail', 'never stand right behind it'], ['Run your hand down the leg and squeeze above the fetlock to lift the hoof', ''], ['Pick from heel to toe, away from you', ''], ['Clean around the frog (the soft V) without digging into it', ''], ['Look for stones, cracks, a bad smell (thrush)', ''], ['Set the hoof down gently and do the next', '']] },
    charness: { title: 'Check the harness', why: 'Every strap holds the cart to the horse. A broken one on the road is dangerous.', tools: ['leather cleaner', 'a rag'], steps: [['Lay the harness out', ''], ['Check every strap for cracks and stitching', ''], ['Check buckles and the bit', ''], ['Clean and condition the leather', 'dry leather cracks'], ['Fit it on the horse: two fingers under the girth', ''], ['Walk the horse a few steps and check again', '']] },
    caxle: { title: 'Grease the carriage axles', why: 'Dry axles squeal, heat up and wear.', tools: ['axle grease', 'a jack', 'a rag'], steps: [['Chock the wheels on the other side', ''], ['Lift one wheel', ''], ['Take off the hub cap and nut', ''], ['Slide the wheel out and wipe the old grease', ''], ['Put on fresh grease', ''], ['Wheel back on, nut snug, cap on', ''], ['Spin it: smooth and quiet', '']] },
    // spaceship
    sscrub: { title: 'Swap the CO2 scrubber', why: 'On a spaceship, the air you breathe out has to be cleaned. Real spacecraft use canisters (like lithium hydroxide) to soak up carbon dioxide.', tools: ['a fresh scrubber canister', 'gloves'], steps: [['Check the cabin CO2 reading', 'too much CO2 makes you sleepy and headachy'], ['Switch the fans to the backup scrubber', 'the air must keep moving'], ['Unlatch and pull out the used canister', ''], ['Seal the used one in a bag', ''], ['Slide in the fresh canister and latch it', ''], ['Switch the fans back and watch CO2 drop', '']] },
    ssolar: { title: 'Clean and aim the solar panels', why: 'Out in space, sunlight is the power. Dust and pointing matter.', tools: ['a soft brush (with a tether!)'], steps: [['Suit up and clip your tether', 'in space, a dropped tool floats away forever'], ['Brush dust off the panels gently', ''], ['Check the wiring for micrometeoroid hits', 'tiny space rocks move faster than bullets'], ['Rotate the panels to face the Sun', 'face-on gives the most power'], ['Check the power reading inside', '']] },
    snav: { title: 'Calibrate the navigation', why: 'Ships find their way by the stars, using star trackers.', tools: ['the star tracker', 'the ship\'s computer'], steps: [['Stop the ship from spinning', ''], ['Point the star tracker at known bright stars', ''], ['Let the computer match the star pattern', ''], ['Compare with the gyroscope reading', 'gyros drift over time'], ['Save the correction', '']] },
    sheat: { title: 'Inspect the heat shield', why: 'Coming back into an atmosphere heats the bottom of a ship white-hot. Cracked tiles are dangerous.', tools: ['a flashlight', 'an inspection camera'], steps: [['Do it while docked', ''], ['Photograph the shield in sections', ''], ['Look for cracks, chips and gaps', ''], ['Mark any damage', ''], ['Fill small chips with repair paste; replace cracked tiles', ''], ['Photograph again to record the fix', '']] }
  };
  PL.JOBS = JOBS;
  /* ---------- 2.3.0: Vitals for things. Each building has parts (or systems, or animals) that wear down day by day like
     Aiu's Vitals. A worn one blinks red in the picture: tap it, do the job (a puzzle or a question), and it's good as new.
     At most 3 need work at once (the rest wait); "last" parts (like the engine computer) only show up when the rest are fine. */
  function dayN(d) { return Math.round(U.dayToDate(d).getTime() / 864e5); }
  PL.dayN = dayN;
  PL.health = function (S, b, parts, start, opts) {
    var G = PL.all(S, b), t = dayN(today()), st0 = dayN(start || today()), out = [];
    parts.forEach(function (pt) {
      if (pt.adv && !(opts && opts.adv)) return;
      var fx = G['fix:' + pt.id], lastFix = fx ? dayN(fx) : st0 - (pt.fresh === false ? pt.days : Math.floor((U.hash32(pt.id + start) % 1000) / 1000 * pt.days * 0.6));
      var h0 = Math.max(0, Math.min(100, Math.round(100 - (t - lastFix) / pt.days * 100)));
      out.push({ p: pt, h: h0, fixedToday: fx === today(), n: +G['fixN:' + pt.id] || 0 });
    });
    var low = out.filter(function (o) { return o.h < 35 && !o.p.last; }).sort(function (a, b) { return a.h - b.h; });
    low.forEach(function (o, i) { o.state = i < 3 ? 'bad' : 'soon'; });
    out.forEach(function (o) {
      if (!o.state) o.state = o.p.last ? (o.h < 35 && !low.length ? 'bad' : o.h < 60 && !low.length ? 'soon' : 'good') : o.h < 60 ? 'soon' : 'good';
      if (o.p.last && low.length && o.h < 35) o.h = 36; // it waits its turn
    });
    return out;
  };
  PL.fixed = function (b, id, n) { var kv = {}; kv['fix:' + id] = today(); kv['fixN:' + id] = (n || 0) + 1; return PL.learned(b, id, kv); };
  PL.meterRow = function (o, onTap, label) { // one part as a row with a meter, like the Vitals
    var col = o.state === 'bad' ? 'bad' : o.state === 'soon' ? 'soon' : 'good';
    return h('button', { type: 'button', cls: 'bpart ' + col, onclick: onTap, 'aria-label': (label || o.p.name) + ': ' + (col === 'bad' ? 'needs work' : col === 'soon' ? 'soon' : 'good') + ', ' + o.h + '%' },
      h('span', { cls: 'bpname', text: label || o.p.name }), h('i', { cls: 'bpmeter' }, h('b', { style: 'width:' + Math.max(4, o.h) + '%' })),
      h('span', { cls: 'bpstate', text: col === 'bad' ? 'Needs work' : col === 'soon' ? (o.state === 'soon' && o.h < 35 ? 'Waiting its turn' : 'Soon') : o.fixedToday ? 'Fixed today' : 'Good' }));
  };
  // a pulsing dot on a part in the picture (and its tap area)
  PL.marker = function (c, V, x, y, o, tap) {
    var f = V.f, col = o.state === 'bad' ? (f % 6 < 3 ? P.red : P.orange) : o.state === 'soon' ? P.yellow : P.green, r = o.state === 'bad' ? 3 + (f % 6 < 3 ? 1 : 0) : 2;
    disc(c, Math.round(x), Math.round(y), r + 1, P.ink); disc(c, Math.round(x), Math.round(y), r, col); if (o.state === 'bad') px(c, Math.round(x), Math.round(y) - 1, P.white);
    V.hot.push({ x: x, y: y, r: 10, tap: tap });
  };

  /* ---------- THE GARAGE: Aiu's ride, part by part ---------- */
  var V0 = { car: 'Car', bike: 'Bicycle', moto: 'Motorcycle', carriage: 'Horse carriage', ship: 'Spaceship' };
  var RATE = { car: 35, bike: 4, moto: 20, carriage: 6, ship: 900 }, UNIT = { car: 'miles', bike: 'miles', moto: 'miles', carriage: 'miles', ship: 'light-seconds' };
  JOBS.align = { title: 'Check the suspension and alignment', why: 'Shocks keep the tires on the road over bumps; alignment keeps the car going straight. A pothole can knock either out.', tools: ['a tire pressure gauge', 'a flashlight', 'a tape measure'],
    steps: [['Notice the signs: pulling to one side, a crooked steering wheel, bouncing', 'write down when it happens'], ['Check all four tire pressures first', 'a low tire pulls the car too'], ['Look at the tire tread: worn on one edge?', 'uneven wear points at alignment'], ['Push down hard on each corner and let go', 'it should bounce once and settle'], ['Look at each shock for oily leaks', 'a leaking shock is worn out'], ['Book a wheel alignment at a shop', 'they use a laser rig to set the angles'], ['Test drive on a straight, empty road', 'hands light on the wheel: it should go straight']],
    check: [{ q: 'After hitting a big pothole, the car pulls right and the wheel sits crooked. Most likely?', opts: ['The alignment got knocked out', 'The radio is broken', 'It needs gas'], a: 0, why: 'Get it aligned soon: bad alignment wears tires out fast.' }] };
  // the parts of each ride: job (the puzzle), days (how long it lasts), where it is on the ride's picture (x, y from the
  // picture's top-left at 1x), alt (a second job that takes turns)
  var PARTS = {
    car: [{ id: 'body', name: 'Body and paint', job: 'wash', days: 14, at: [30, 12], fresh: false }, { id: 'oil', name: 'Engine oil', job: 'oil', days: 40, at: [44, 14] }, { id: 'tires', name: 'Tires', job: 'flat', alt: 'tirerot', days: 30, at: [41, 21] },
      { id: 'brakes', name: 'Brakes', job: 'brakes', days: 75, at: [11, 21] }, { id: 'wipers', name: 'Wiper blades', job: 'wipers', days: 60, at: [36, 4] }, { id: 'battery', name: 'Battery', job: 'battery', alt: 'jump', days: 90, at: [49, 10] },
      { id: 'air', name: 'Engine air filter', job: 'airfilter', days: 55, at: [40, 11] }, { id: 'coolant', name: 'Coolant', job: 'coolant', days: 65, at: [51, 15] }, { id: 'susp', name: 'Suspension and alignment', job: 'align', days: 80, at: [25, 19] },
      { id: 'plugs', name: 'Spark plugs', job: 'sparkplugs', days: 110, at: [45, 8], adv: true }, { id: 'sunroof', name: 'Sunroof drains', job: 'sunroof', days: 70, at: [24, 1], adv: true }, { id: 'trans', name: 'Transmission fluid', job: 'transmission', days: 120, at: [33, 18], adv: true },
      { id: 'computer', name: 'Engine computer (check engine light)', job: 'diag', days: 50, at: [20, 9], last: true }],
    bike: [{ id: 'chain', name: 'Chain', job: 'bwash', days: 10, at: [16, 18], fresh: false }, { id: 'tires', name: 'Tires and tubes', job: 'bflat', days: 35, at: [6, 16] }, { id: 'brakes', name: 'Brakes', job: 'bbrake', days: 45, at: [30, 16] }],
    moto: [{ id: 'body', name: 'Body and paint', job: 'wash', days: 14, at: [24, 7], fresh: false }, { id: 'chain', name: 'Chain', job: 'mchain', days: 12, at: [10, 19] }, { id: 'oil', name: 'Engine oil', job: 'moil', days: 40, at: [22, 12] },
      { id: 'tires', name: 'Tires', job: 'mtire', days: 30, at: [37, 19] }, { id: 'battery', name: 'Battery', job: 'battery', days: 90, at: [14, 9] }, { id: 'computer', name: 'Engine computer', job: 'diag', days: 50, at: [33, 5], last: true }],
    carriage: [{ id: 'hooves', name: 'The horse\'s hooves', job: 'choof', days: 4, at: [51, 29], fresh: false }, { id: 'harness', name: 'Harness', job: 'charness', days: 20, at: [47, 13] }, { id: 'axles', name: 'Axles', job: 'caxle', days: 30, at: [10, 21] }],
    ship: [{ id: 'air', name: 'CO2 scrubber', job: 'sscrub', days: 10, at: [30, 8], fresh: false }, { id: 'solar', name: 'Solar panels', job: 'ssolar', days: 20, at: [7, 3] }, { id: 'nav', name: 'Navigation', job: 'snav', days: 30, at: [36, 5] },
      { id: 'shield', name: 'Heat shield', job: 'sheat', days: 45, at: [26, 21] }, { id: 'computer', name: 'Ship\'s computer', job: 'diag', days: 50, at: [18, 12], last: true }]
  };
  PL.PARTS = PARTS;
  var VSIZE = { car: [52, 26], bike: [36, 22], moto: [45, 26], carriage: [64, 30], ship: [52, 26] }, VSCALE = { car: 3, bike: 3.5, moto: 3, carriage: 2.5, ship: 3 };
  PL.garageState = function (S) {
    var G = PL.all(S, 'garage'), kind = G.vehicle || null, start = G.start || today();
    if (!kind) return { kind: null };
    var days = Math.max(0, dayN(today()) - dayN(start)), parts = PL.health(S, 'garage', PARTS[kind] || PARTS.car, start, { adv: !!G.advanced });
    parts.forEach(function (o) { o.job = o.p.alt && o.n % 2 ? o.p.alt : o.p.job; });
    var open = parts.filter(function (o) { return o.state === 'bad'; });
    return { kind: kind, start: start, days: days, miles: Math.round(days * (RATE[kind] || 30) + (G.trip || 0)), unit: UNIT[kind], parts: parts, open: open, adv: !!G.advanced, name: G.name || '' };
  };
  // the ride, drawn in code (facing right). opts: {dirty, flat, hood, smoke}
  PL.vehicle = function (c, kind, x, y, f, o) {
    o = o || {}; var acc = o.color || P.red;
    function wheel(cx, cy, r, flat) { disc(c, cx, cy + (flat ? 1 : 0), r, P.ink); if (flat) R(c, cx - r, cy + r - 1, r * 2 + 1, 2, P.ink); disc(c, cx, cy, Math.max(1, r - 2), P.slate); px(c, cx, cy, P.silver); if (r >= 5) { var a0 = (f % 8) / 8 * Math.PI; px(c, Math.round(cx + Math.cos(a0) * (r - 3)), Math.round(cy + Math.sin(a0) * (r - 3)), P.silver); } }
    if (kind === 'bike') {
      wheel(x + 6, y - 6, 6, o.flat); wheel(x + 30, y - 6, 6, false);
      line(c, x + 6, y - 6, x + 16, y - 6, acc); line(c, x + 16, y - 6, x + 26, y - 16, acc); line(c, x + 12, y - 16, x + 26, y - 16, acc); line(c, x + 6, y - 6, x + 12, y - 16, acc); line(c, x + 12, y - 16, x + 16, y - 6, acc); line(c, x + 26, y - 16, x + 30, y - 6, acc);
      R(c, x + 10, y - 18, 5, 2, P.ink); line(c, x + 26, y - 16, x + 27, y - 20, P.slate); R(c, x + 25, y - 21, 5, 1, P.slate); disc(c, x + 16, y - 6, 1, P.silver);
      if (o.dirty) for (var i = 0; i < 5; i++) px(c, x + 8 + i * 5, y - 7 - (i % 3), P.bark);
      return { w: 36, h: 22 };
    }
    if (kind === 'moto') {
      wheel(x + 7, y - 7, 7, o.flat); wheel(x + 37, y - 7, 7, false);
      R(c, x + 12, y - 14, 20, 6, P.dark); R(c, x + 18, y - 19, 12, 6, acc); R(c, x + 19, y - 19, 10, 1, P.white); R(c, x + 8, y - 17, 11, 3, P.ink); // engine, tank, seat
      line(c, x + 31, y - 18, x + 37, y - 7, P.silver); line(c, x + 31, y - 18, x + 34, y - 24, P.slate); R(c, x + 32, y - 25, 5, 1, P.slate); R(c, x + 35, y - 21, 3, 3, P.yellow);
      line(c, x + 12, y - 9, x + 3, y - 10, P.silver); if (o.smoke) for (var s2 = 0; s2 < 3; s2++) px(c, x + 1 - s2 * 2, y - 11 - ((f + s2) % 4), P.silver);
      if (o.dirty) for (var i2 = 0; i2 < 6; i2++) px(c, x + 13 + i2 * 3, y - 12 - (i2 % 2), P.bark);
      return { w: 45, h: 26 };
    }
    if (kind === 'carriage') { // the horse and its cart
      var hx = x + 44; R(c, hx, y - 18, 16, 8, P.wood); R(c, hx + 14, y - 26, 5, 10, P.wood); R(c, hx + 16, y - 28, 6, 5, P.wood); px(c, hx + 20, y - 26, P.ink); R(c, hx + 13, y - 27, 2, 9, P.bark); // body, neck, head, mane
      [0, 3, 11, 14].forEach(function (lx, i) { R(c, hx + lx, y - 10 + ((f + i) % 4 < 2 ? 0 : -1), 2, 10, P.wood); }); R(c, hx - 2, y - 18, 3, 7, P.bark); // legs, tail
      line(c, x + 32, y - 14, hx + 2, y - 15, P.bark); R(c, x + 4, y - 24, 30, 12, acc); R(c, x + 4, y - 24, 30, 2, P.wood); R(c, x + 6, y - 22, 8, 6, P.yellow); // shafts and the cart
      [[x + 10, 9], [x + 28, 7]].forEach(function (wv) { disc(c, wv[0], y - wv[1], wv[1], P.bark); disc(c, wv[0], y - wv[1], wv[1] - 2, P.sand); for (var sp = 0; sp < 4; sp++) { var a1 = sp / 4 * Math.PI + (f % 8) * 0.1; line(c, wv[0], y - wv[1], Math.round(wv[0] + Math.cos(a1) * (wv[1] - 2)), Math.round(y - wv[1] + Math.sin(a1) * (wv[1] - 2)), P.bark); } });
      return { w: 64, h: 30 };
    }
    if (kind === 'ship') {
      ell(c, x + 26, y - 14, 24, 7, P.silver); ell(c, x + 26, y - 15, 22, 5, P.white); ell(c, x + 30, y - 20, 8, 5, P.cyan, true); R(c, x + 22, y - 20, 16, 1, P.sky);
      tri(c, x + 6, y - 24, 8, 0.6, acc); R(c, x + 2, y - 15, 6, 3, acc); line(c, x + 14, y - 8, x + 10, y - 2, P.slate); line(c, x + 38, y - 8, x + 42, y - 2, P.slate);
      R(c, x - 2, y - 16, 3, 3, f % 2 ? P.orange : P.yellow); if (o.smoke) for (var s3 = 0; s3 < 3; s3++) px(c, x + 20 + s3 * 4, y - 22 - ((f + s3) % 4), P.silver);
      if (o.dirty) for (var i3 = 0; i3 < 6; i3++) px(c, x + 10 + i3 * 6, y - 12 - (i3 % 3), P.slate);
      return { w: 52, h: 26 };
    }
    // the car (a little hatchback)
    R(c, x, y - 15, 52, 9, acc); R(c, x + 1, y - 16, 50, 1, acc); R(c, x + 10, y - 24, 28, 9, acc); R(c, x + 12, y - 25, 24, 1, acc);
    R(c, x + 12, y - 23, 11, 7, P.cyan); R(c, x + 25, y - 23, 11, 7, P.cyan); R(c, x + 13, y - 22, 3, 2, P.white); R(c, x + 23, y - 23, 2, 8, acc);
    R(c, x + 50, y - 13, 2, 2, P.yellow); R(c, x, y - 13, 2, 2, P.red); R(c, x + 24, y - 12, 4, 1, P.dark); R(c, x, y - 8, 52, 2, P.dark);
    if (o.hood) { line(c, x + 38, y - 16, x + 50, y - 26, acc); line(c, x + 39, y - 16, x + 51, y - 26, P.dark); }
    if (o.smoke) for (var s4 = 0; s4 < 4; s4++) { var tt = (f + s4 * 3) % 10; disc(c, x + 44 + (s4 % 2) * 4, y - 18 - tt * 2, tt < 6 ? 1 : 0, P.silver); }
    wheel(x + 11, y - 5, 5, o.flat); wheel(x + 41, y - 5, 5, false);
    if (o.dirty) { for (var i4 = 0; i4 < 10; i4++) px(c, x + 3 + i4 * 5, y - 9 - (i4 % 3), P.bark); R(c, x + 2, y - 8, 50, 1, P.wood); }
    if (o.shine) { px(c, x + 20, y - 14, P.white); px(c, x + 34, y - 22, P.white); if (f % 6 < 3) px(c, x + 6, y - 13, P.white); }
    return { w: 52, h: 26 };
  };
  var vcv = null;
  function drawGarage(c, V, S) {
    var g = PL.garageState(S), f = V.f;
    R(c, 0, 0, 192, 80, P.slate); for (var y = 6; y < 80; y += 8) R(c, 0, y, 192, 1, P.dark); // block walls
    R(c, 6, 10, 40, 22, P.wood); for (var hx = 8; hx < 46; hx += 4) for (var hy = 12; hy < 32; hy += 4) px(c, hx, hy, P.bark); line(c, 12, 14, 12, 26, P.silver); R(c, 10, 13, 5, 3, P.silver); line(c, 20, 14, 26, 26, P.red); R(c, 30, 15, 8, 3, P.yellow); R(c, 33, 18, 2, 8, P.yellow); // pegboard
    R(c, 0, 80, 192, 28, P.silver); for (var fx = 0; fx < 192; fx += 16) R(c, fx, 80, 1, 28, P.slate); R(c, 0, 80, 192, 1, P.dark); // floor
    if (!g.kind) { PL.aiu(c, 96, 100, f, 'open'); return; }
    var sz = VSIZE[g.kind] || VSIZE.car, s = VSCALE[g.kind] || 3, w = sz[0] * s, hgt = sz[1] * s, ox = Math.round((192 - w) / 2 / 0.25) * 0.25 + 8, oy = 102 - hgt;
    var bad = {}; g.parts.forEach(function (o) { if (o.state === 'bad') bad[o.p.id] = 1; });
    if (!vcv) { vcv = document.createElement('canvas'); vcv.width = 70; vcv.height = 34; }
    var vc = vcv.getContext('2d'); vc.imageSmoothingEnabled = false; vc.clearRect(0, 0, 70, 34);
    PL.vehicle(vc, g.kind, 0, sz[1], f, { color: PL.accent(), dirty: bad.body || bad.chain, flat: bad.tires, hood: bad.oil || bad.battery || bad.air || bad.coolant || bad.plugs || bad.trans, smoke: bad.computer || bad.brakes, shine: !g.open.length });
    ell(c, Math.round(ox + w / 2), 102, Math.round(w / 2), 3, P.slate);
    c.drawImage(vcv, 0, 0, 70, 34, ox, oy, 70 * s, 34 * s);
    PL.aiu(c, Math.max(10, ox - 10), 102, f, V.happy && Date.now() - V.happy < 3000 ? 'happy' : 'open');
    g.parts.forEach(function (o) { PL.marker(c, V, ox + o.p.at[0] * s, oy + o.p.at[1] * s, o, function () { V.part = o.p.id; V.render(); }); });
    if (V.happy && Date.now() - V.happy < 2500) for (var i = 0; i < 6; i++) px(c, ox + ((i * 23 + f * 3) % Math.round(w)), oy + ((i * 11 + f * 2) % Math.round(hgt)), i % 2 ? P.yellow : P.white);
  }
  function garageView(V, S) {
    var b = V.body, g = PL.garageState(S), k = KK(), a = app();
    if (!g.kind) {
      b.appendChild(PL.card('Pick ' + S.totemName + '\'s ride', [h('p', { text: 'Every ride needs looking after. Its parts wear down day by day, like ' + S.totemName + '\'s Vitals. When one blinks red, tap it and fix it yourself: you\'ll learn how each job is really done.' }),
        h('div', { cls: 'bchoices' }, Object.keys(V0).map(function (kd) { return k.btn(V0[kd], function () { PL.set('garage', { vehicle: kd, start: today() }).then(function () { V.render(); }); }, 'primary'); }))]));
      return;
    }
    if (V.job) { // working on a job
      var J = JOBS[V.job.job], box = h('div');
      b.appendChild(PL.card(J.title, [box, k.btn('Put the tools down (finish later)', function () { V.job = null; V.render(); }, 'ghost')]));
      PL.orderPuzzle(box, Object.assign({ id: V.job.job + V.job.part }, J), function () {
        var done = V.job.practice ? PL.learned('garage', V.job.job) : PL.fixed('garage', V.job.part, V.job.n);
        done.then(function () { V.happy = Date.now(); a.beep('chirp'); V.job = null; V.part = null; V.render(); KK().snack('Fixed: ' + J.title + '.'); });
      });
      return;
    }
    if (V.part) { // one part: how it's doing, what it does, and the job to fix it
      var o = g.parts.filter(function (x) { return x.p.id === V.part; })[0]; if (!o) { V.part = null; return V.render(); }
      var J2 = JOBS[o.job];
      b.appendChild(PL.card(o.p.name, [PL.meterRow(o, function () {}), h('p', { cls: 'bwhy', text: J2.why }),
        o.state === 'bad' ? k.btn('Fix it: ' + J2.title.toLowerCase(), function () { V.job = { job: o.job, part: o.p.id, n: o.n }; V.render(); }, 'primary') : h('p', { cls: 'small', text: o.state === 'soon' ? 'Not yet: it still has some life in it. It\'ll blink red when it needs you.' : 'It\'s in good shape.' }),
        o.state !== 'bad' ? k.btn('Practice this job anyway', function () { V.job = { job: o.job, part: o.p.id, practice: true }; V.render(); }) : null,
        k.btn('< All parts', function () { V.part = null; V.render(); }, 'ghost')]));
      return;
    }
    b.appendChild(PL.card((g.name || V0[g.kind]) + ' · ' + g.miles.toLocaleString() + ' ' + g.unit, [
      h('p', { cls: 'small', text: g.open.length ? 'Tap a red part (in the picture or below) to fix it.' : 'Everything is in good shape. Parts wear down day by day: check back.' }),
      h('div', { cls: 'bparts' }, g.parts.map(function (o) { return PL.meterRow(o, function () { V.part = o.p.id; V.render(); }); })),
      PL.lessonsToday(S, 'garage') ? h('p', { cls: 'small', text: 'You did a job today (+3 growth).' }) : null]));
    var all = Object.keys(JOBS).filter(function (j) { return (PARTS[g.kind] || []).some(function (pt) { return pt.job === j || pt.alt === j; }); });
    b.appendChild(k.acc('g-manual', 'Shop manual (practice any job)', all.map(function (j) { return h('div', { cls: 'item' }, h('span', { cls: 'ititle', text: JOBS[j].title }), k.btn('Practice', function () { V.job = { job: j, part: 'manual', practice: true }; V.render(); }, 'mini')); }), false, all.length));
    b.appendChild(k.acc('g-set', 'Garage settings', [
      k.field('Name your ride', (function () { var i = k.inp({ value: g.name, maxLength: 24, placeholder: 'e.g. Old Blue' }); i.addEventListener('change', function () { PL.set('garage', { name: i.value.trim().slice(0, 24) }); }); return i; })()),
      g.kind === 'car' ? h('label', { cls: 'item' }, h('input', { type: 'checkbox', checked: g.adv, onchange: function (e) { PL.set('garage', { advanced: e.target.checked }).then(function () { V.render(); }); } }), h('span', { cls: 'ititle', text: 'Advanced parts (spark plugs, sunroof drains, transmission fluid)' })) : null,
      k.btn('Trade it for a different ride', function () { if (window.confirm('Start over with a different ride? Your finished jobs stay in your history.')) PL.set('garage', { vehicle: null, start: today() }).then(function () { V.render(); }); }, 'ghost'),
      h('p', { cls: 'small', text: 'This is for learning. Always follow your own vehicle\'s manual, use jack stands, and ask a mechanic when in doubt.' })], false));
  }
  PL.register({ id: 'garage', title: 'The garage', aria: 'Garage: look after Aiu\'s ride', draw: drawGarage, view: garageView, pending: function (S) { var g = PL.garageState(S); return !g.kind || g.open.length > 0; } });
})();
