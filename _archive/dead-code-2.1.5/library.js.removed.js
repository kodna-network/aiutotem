  function trajectory(S, d) {
    var n = { 'As planned': 0, 'Partly': 0, 'Off track': 0 }, tot = 0;
    for (var i = 1; i <= 7; i++) { var w = pf(S, U.addDays(d, -i), 'went'); if (n[w] !== undefined) { n[w]++; tot++; } }
    return tot ? 'Last ' + tot + ' day' + (tot === 1 ? '' : 's') + ': ' + n['As planned'] + ' as planned, ' + n['Partly'] + ' partly, ' + n['Off track'] + ' off track.' : '';
  }
  PN.selfActions = function (S) { return (PN.state.selfSub || 'personality') === 'gaba' ? [PN.pdfBtn(function () { var mo = today().slice(0, 7); PN.savePdf(gabaDoc(S, mo), 'aiu-gaba-' + mo); })] : []; };
  PN.selfView = function () {
    var a = app(), k = K(), p = body(), sub = PN.state.selfSub || 'personality';
    p.appendChild(h('div', { cls: 'chips bsub' }, [['personality', 'Personality'], ['gaba', 'GABA (Go / Brake)'], ['q21', 'Suggestions']].map(function (x) {
      return k.btn(x[1], function () { PN.state.selfSub = x[0]; ui.renderPanel(true); }, 'chip' + (sub === x[0] ? ' on' : ''));
    })));
    if (sub === 'gaba') return gabaView(p);
    if (sub === 'q21') return q21View(p);
    p.appendChild(k.personaBox(a));
    if (!a.local.seenPersona) { a.local.seenPersona = 1; a.saveLocal(); a.checkStarter(); }
  };
  PN.gabaInto = function (p) { gabaView(p); };
  PN.q21Into = function (p) { q21View(p); };
  PN.gabaPdf = function (S) { var mo = today().slice(0, 7); PN.savePdf(gabaDoc(S, mo), 'aiu-gaba-' + mo); };
  function pf(S, day, f) { var x = ((S.jpages || {})[day] || {})[f]; return x && x.text ? x.text : ''; }
  function q21View(p) {
    var a = app(), S = a.S, k = K(), pr = PN.q21Progress(S), P = S.prefs || {};
    p.appendChild(h('p', { cls: 'small', text: S.totemName + ' suggests small tiles that help your GABA, and asks a few either/or questions to know your personality better. Yes makes it a tile. Not today asks another day. Never stops it (it may check back in a few months, in case you change your mind). Each answer is +2 growth.' }));
    p.appendChild(h('div', { cls: 'q21prog' }, h('b', { text: S.totemName + ' knows you ' + pr.pct + '%' }), h('span', { cls: 'small', text: ' · ' + pr.done + ' of ' + pr.total + ' pieces' })));
    p.appendChild(h('div', { cls: 'bar thin' }, h('i', { cls: 'conf', style: 'width:' + pr.pct + '%' })));
    var nx = PN.q21Next(S);
    if (!(S.ptype && S.ptype.answered >= 6)) p.appendChild(h('p', { cls: 'small', text: 'Take the personality quiz (Personality) and ' + S.totemName + ' will ask a few more either/or questions to tighten up your type.' }));
    if (nx) p.appendChild(PN.q21Card(nx, function () { ui.renderPanel(true); }));
    else p.appendChild(k.empty('Every piece is in place. ' + S.totemName + ' knows you 100%!'));
    // what it learned (tap to change)
    function list(title, kind, v) {
      var items = G.questions().filter(function (q) { return q.kind === kind && P[q.id] && P[q.id].v === v; });
      if (!items.length) return null;
      return k.acc('q21-' + kind + v, title, items.map(function (q) {
        return h('div', { cls: 'item' }, h('span', { cls: 'ititle', text: q.item }), k.btn('Change', function () { a.addEvents([{ type: 'pref', data: { item: q.id, kind: q.kind, v: v === 'yes' ? 'no' : 'yes' } }], true).then(function () { ui.renderPanel(true); }); }, 'mini'));
      }), false, items.length);
    }
    [list('You said yes to', 'calm', 'yes'), list('Calming foods you said yes to', 'calmfood', 'yes'), list('Things you\'re cutting back on', 'stress', 'yes'), list('Not for you (no more suggestions)', 'calm', 'no')].forEach(function (x) { if (x) p.appendChild(x); });
  }
  function gabaView(into) {
    var a = app(), S = a.S, k = K(), p = into || body(), d = today(), v = G.bar(S, d), lv = G.level(S), streak = G.streak(S, d);
    p.appendChild(h('div', { cls: 'gabahead' },
      h('div', { cls: 'gabascale' }, h('span', { cls: 'go', text: 'GO' }), h('div', { cls: 'gbar big', role: 'img', 'aria-label': 'Go / Brake bar at ' + v + ' of 100' }, h('i', { style: 'left:' + v + '%' })), h('span', { cls: 'brake', text: 'BRAKE' })),
      h('div', { cls: 'gabastate', text: 'Today: ' + v + ' · ' + G.state(v) }),
      h('div', { cls: 'gabalv' }, h('b', { text: 'Level ' + lv.n + ': ' + lv.name }), h('span', { cls: 'small', text: lv.next ? ' · ' + (lv.next - lv.xp) + ' brake points to ' + lv.nextName : ' · top level!' }), h('span', { cls: 'small', text: streak ? ' · ' + streak + '-day calm streak' : '' })),
      lv.next ? h('div', { cls: 'bar thin' }, h('i', { cls: 'conf', style: 'width:' + Math.round((lv.xp - lv.floor) / (lv.next - lv.floor) * 100) + '%' })) : null));
    p.appendChild(h('p', { cls: 'small', text: 'The day wears on you: from 8 am the bar slides toward Go about ' + G.DRIFT + ' points an hour. Below ' + G.RED + ' (the red), ' + S.totemName + ' is stressed and grows at a quarter speed. Calm things push it back up.' }));
    // goals
    var goals = G.goals(S, d);
    p.appendChild(h('h3', { cls: 'qgroup', text: 'Today\'s brake goals' }));
    goals.forEach(function (g) {
      var f = G.find(g.label);
      p.appendChild(h('div', { cls: 'item' + (g.done ? ' done' : '') }, h('input', { type: 'checkbox', checked: g.done, disabled: g.done, 'aria-label': 'Did it: ' + g.label, onchange: function () { a.logGaba('calm', g.label, f ? f.pts : 8); } }),
        h('span', { cls: 'ititle', text: g.label }), h('span', { cls: 'tag', text: '+' + (f ? f.pts : 8) + ' +5 goal' })));
    });
    // quick log
    function grid(list, kind) {
      var L = list.filter(function (x) { return !(kind === 'calm' && G.pref(S, x[0]) === 'no'); }).sort(function (x, y) { return (G.pref(S, y[0]) === 'yes') - (G.pref(S, x[0]) === 'yes'); });
      return h('div', { cls: 'ggrid' }, L.map(function (x) { return K().btn((G.pref(S, x[0]) === 'yes' ? '★ ' : '') + x[0] + ' ' + (x[1] > 0 ? '+' : '') + x[1], function () { a.logGaba(kind, x[0], x[1]); }, 'chip g-' + kind); }));
    }
    var avoid = G.avoid(S);
    if (avoid.length) p.appendChild(h('div', { cls: 'item col' }, h('b', { text: 'Your avoid list' }), h('span', { cls: 'small', text: avoid.join(' · ') })));
    p.appendChild(h('h3', { cls: 'qgroup', text: 'I did something calming' }));
    p.appendChild(h('p', { cls: 'small', text: '★ = it calms you (from 21 Questions). Brakes you said aren\'t for you are left out.' }));
    p.appendChild(grid(G.CALM_ACTS, 'calm'));
    p.appendChild(k.acc('g-cfood', 'Calm foods I ate', [grid(G.CALM_FOODS, 'calm')], false));
    p.appendChild(k.acc('g-stress', 'Something revved me up (GO)', [h('p', { cls: 'small', text: 'No judgment. Logging it just shows the balance, and ' + S.totemName + ' suggests a brake.' }), grid(G.STRESS_ACTS, 'stress'), h('b', { text: 'Foods and substances' }), grid(G.STRESS_FOODS, 'stress')], false));
    p.appendChild(k.acc('g-mixed', 'Mixed: it depends on you', [h('p', { cls: 'small', text: 'These can calm you OR stress you, depending on timing, amount and mood. Ask yourself:' }),
      h('ul', null, G.MIXED_QUESTIONS.map(function (x) { return h('li', { text: x }); })),
      h('div', { cls: 'ggrid' }, G.MIXED.map(function (x) { return K().btn(x[0], function () { mixedAsk(x[0]); }, 'chip g-mixed'); }))], false));
    // today's log
    var list = G.day(S, d);
    p.appendChild(h('h3', { cls: 'qgroup', text: 'Today\'s log' }));
    if (!list.length) p.appendChild(k.empty('Nothing yet. Tap something above, or write it in a journal entry ("I went for a walk").'));
    list.slice().reverse().forEach(function (g) {
      p.appendChild(h('div', { cls: 'item' }, h('span', { cls: 'itime', text: U.fmtHm(U.hmStr(new Date(g.t)), k.c24()) }), h('span', { cls: 'ititle', text: g.item + (g.goal ? ' (goal)' : '') }),
        h('span', { cls: 'tag g-' + g.kind, text: (g.pts > 0 ? '+' : '') + g.pts }),
        k.iconBtn('Delete ' + g.item, 'X', function () { a.addEvents([{ type: 'gaba', data: { ref: g.id, removed: true } }]).then(function () { k.snack('Removed.', function () { a.addEvents([{ type: 'gaba', data: { ref: g.id, removed: false } }]); }); }); }, 'del')));
    });
    // the week
    var wk = h('div', { cls: 'gweek' });
    for (var i = 6; i >= 0; i--) { var dd = U.addDays(d, -i), has = G.day(S, dd).length, bv = has ? G.bar(S, dd) : null; wk.appendChild(h('div', { cls: 'gday' }, h('div', { cls: 'gcol' }, h('i', { style: 'height:' + (bv === null ? 0 : Math.max(4, bv)) + '%' })), h('span', { text: U.DAYNAMES[U.weekday(dd)].slice(0, 2) }), h('small', { text: bv === null ? '-' : String(bv) }))); }
    p.appendChild(h('h3', { cls: 'qgroup', text: 'This week' })); p.appendChild(wk);
    // learn (the GABA Explorer)
    function lst(title, arr) { return h('div', { cls: 'glearn' }, h('b', { text: title }), h('ul', null, arr.map(function (x) { return h('li', { text: x[0] }); }))); }
    p.appendChild(k.acc('g-learn', 'Learn: Go vs Brake', [h('p', { text: 'Glutamate helps you GO. GABA helps you SLOW DOWN. Simple rule: balance the GO (energy) with the BRAKE (calm).' }),
      lst('Activities that support calm', G.CALM_ACTS), lst('Foods that support calm', G.CALM_FOODS), lst('Activities that can create stress', G.STRESS_ACTS), lst('Foods and substances that can increase stress', G.STRESS_FOODS), lst('Mixed: depends on you', G.MIXED.map(function (x) { return [x[0]]; }))], false));
    p.appendChild(h('p', { cls: 'small dim', text: G.DISCLAIMER + ' ' + S.totemName + ' notices calm and stress things you write in your journal entries, and now and then suggests a brake as a side quest (Settings > Sounds & GABA > GABA coach).' }));
  }
  function pdfPicker() {
    var a = app(), S = a.S, k = K(), s, days = PN.allDays(S), opts = {}, mos = {}, yrs = {};
    days.forEach(function (d) { mos[d.slice(0, 7)] = 1; yrs[d.slice(0, 4)] = 1; });
    Object.keys(mos).sort().reverse().forEach(function (m) { opts['m' + m] = MONTHS[+m.slice(5) - 1] + ' ' + m.slice(0, 4); });
    Object.keys(yrs).sort().reverse().forEach(function (y) { opts['y' + y] = 'The whole year ' + y; });
    var pick = k.sel(opts, Object.keys(opts)[0], function () {});
    s = k.sheet('Save your journal as a PDF', [k.field('Which pages', pick), h('p', { cls: 'small', text: 'A single day: open it and tap PDF.' }),
      h('div', { cls: 'row spread' }, h('span'), k.btn('Next', function () {
        var v = pick.value, sel = days.filter(function (d) { return v.charAt(0) === 'm' ? d.slice(0, 7) === v.slice(1) : d.slice(0, 4) === v.slice(1); });
        s.remove(); exportRange(sel, opts[v], 'aiu-journal-' + v.slice(1));
      }, 'primary'))]);
  }
  function exportRange(days, label, base) {
    var a = app(), months = {};
    days.forEach(function (d) { months[d.slice(0, 7)] = 1; });
    askTalk(label + ': ' + days.length + ' page' + (days.length === 1 ? '' : 's') + '. Each page is the short version (reading, GABA, daily log, stories).', function (withTalk) {
      K().snack('Making the PDF...');
      Promise.all(Object.keys(months).map(function (m) { return a.chapter(m); })).then(function (lists) {
        var evs = [].concat.apply([], lists), S = a.S, b = [{ t: 'title', text: 'Journal: ' + label }, { t: 'sub', text: S.totemName + ' · ' + days.length + ' pages · made ' + PN.nice(today()) }];
        var lastMo = '';
        days.slice().sort().forEach(function (d) {
          var mo = d.slice(0, 7);
          if (mo !== lastMo) { if (lastMo) b.push({ t: 'break' }); b.push({ t: 'title', text: 'Chapter: ' + MONTHS[+mo.slice(5) - 1] + ' ' + mo.slice(0, 4) }); lastMo = mo; }
          var P = AIU.hilltop.page(S, d, K().pageOpts(a, d, d === today() ? null : evs));
          b = b.concat(pageBlocks(S, P, false, withTalk ? talkOf(evs, d) : null)); b.push({ t: 'hr' });
        });
        PN.savePdf({ title: 'Journal ' + label, blocks: b }, base);
      });
    });
  }
