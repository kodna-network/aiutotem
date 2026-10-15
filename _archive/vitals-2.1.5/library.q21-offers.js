// Replaced in 2.1.6: q21Next/q21Answer/offerQuest/q21Card (GABA questions offered tiles; now they only learn what calms / stresses you).
  PN.q21Next = function (S, only) { // only: 'gaba' (Vitals) or 'persona' (Profile)
    var P = S.prefs || {}, n = PN.q21Today(S), took = S.ptype && S.ptype.answered >= 6;
    var skip = (app().local.offSkip || {}), open = {};
    Object.keys(S.quests || {}).forEach(function (k0) { var q = S.quests[k0]; if (q.state === 'active' && q.subject) open[q.subject.replace(/^gaba:\w+:/, '')] = 1; });
    var doneToday = {}; G.day(S, today()).forEach(function (g) { doneToday[g.item] = 1; });
    var fresh = function (q) { return skip[q.id] !== today() && !open[q.item] && !doneToday[q.item]; }, now = app().trueNow();
    var pq = took ? AIU.persona.nextExtra(S) : null, gq = gabaOrder(S).filter(function (q) { return !P[q.id] && fresh(q); })[0] || null;
    if (!gq) gq = gabaOrder(S).filter(function (q) { return P[q.id] && P[q.id].v === 'no' && now - P[q.id].t > 90 * 86400000 && fresh(q); })[0] || null; // a "Never" from months ago: ask once more
    if (only === 'gaba') return gq ? { type: 'gaba', q: gq } : null;
    if (only === 'persona') return pq ? { type: 'persona', q: pq } : null;
    if (pq && (n % 3 === 2 || !gq)) return { type: 'persona', q: pq };
    return gq ? { type: 'gaba', q: gq } : null;
  };
  PN.q21Answer = function (x, v) {
    var a = app(), S = a.S, ev = [];
    if (x.type === 'gaba') ev.push({ type: 'pref', data: { item: x.q.id, kind: x.q.kind, v: v } });
    else {
      var val = v === 'a' ? 1 : v === 'b' ? -1 : 0;
      ev.push({ type: 'trait', data: { qid: x.q.id, v: val } }, { type: 'pref', data: { item: 'q:' + x.q.id, kind: 'persona', v: v } });
      var TR = JSON.parse(JSON.stringify(S.traits || {})); TR.quiz = TR.quiz || {}; TR.quiz[x.q.id] = { v: val, t: a.trueNow() + 1 };
      var prev = S.ptypes && S.ptypes.length ? S.ptypes[S.ptypes.length - 1].code : '', r = AIU.persona.compute(Object.assign({ lastCode: prev }, TR));
      if (r.code && r.code !== prev) ev.push({ type: 'ptype', data: { code: r.code, from: prev } });
    }
    a.local.q21At = a.trueNow(); a.saveLocal();
    return a.addEvents(ev, true).then(function () { a.react(v === 'skip' ? 'save' : 'check', v === 'skip' ? '' : '+2'); });
  };
  // One question as a little card (under Aiu, or in Journal > Me > Suggestions)
  // Aiu suggests a small GABA quest. Yes = make it a quest (asks one detail first), No = not for me (never again), Not today.
  PN.offerQuest = function (x, onDone) {
    var a = app(), k = K(), o = G.offer(x.q), s;
    function make(detail) {
      var d = String(detail || '').trim(), title = o.follow && d ? (o.title + ': ' + d).slice(0, 48) : o.title.slice(0, 48);
      var steps = o.steps.map(function (t) { return t.replace('{x}', d || 'it'); });
      var T = AIU.tiles, r = T.createEvents(a.S, title, { quest: { subject: o.tag, why: 'Aiu\'s idea. Good for your GABA (the Brake).', steps: steps.map(function (t, i) { return { id: 's' + (i + 1), title: t }; }) }, set: { calm: true, status: 'next', when: { t: 'once', date: today() } } });
      var ev = [{ type: 'pref', data: { item: x.q.id, kind: x.q.kind, v: 'yes' } }].concat(r.events);
      a.local.q21At = a.trueNow(); a.saveLocal();
      a.addEvents(ev, true).then(function () { a.react('save'); K().snack('New tile: ' + title + '. Finish it for GABA and growth.'); if (onDone) onDone(); });
    }
    if (!o.follow) return make('');
    var inp = k.inp({ placeholder: 'Type it, or tap an idea', autocapitalize: 'sentences', 'aria-label': o.follow });
    s = k.sheet(o.title, [h('p', { text: o.follow }), inp,
      o.ideas.length ? h('div', { cls: 'chips' }, o.ideas.map(function (t) { return k.btn(t, function () { inp.value = t; }, 'chip'); })) : null,
      h('div', { cls: 'row spread' }, k.btn('Skip the detail', function () { s.remove(); make(''); }, 'ghost'), k.btn('Make the tile', function () { s.remove(); make(inp.value); }, 'primary'))]);
  };
  PN.q21Card = function (x, onDone, compact) {
    var k = K(), S = app().S, box = h('div', { cls: 'q21card' + (compact ? ' compact' : '') });
    function go(v) { PN.q21Answer(x, v).then(function () { if (onDone) onDone(); }); }
    if (x.type === 'gaba') {
      var o = G.offer(x.q);
      box.appendChild(h('div', { cls: 'q21q' }, h('span', { cls: 'nicon', 'aria-hidden': 'true' }, ui.pix(o.avoid ? 'no' : 'bulb')), ' ', o.ask, h('span', { cls: 'small', text: ' Yes makes it a tile (good for your GABA).' })));
      box.appendChild(h('div', { cls: 'row wrap' }, k.btn('Yes', function () { PN.offerQuest(x, onDone); }, 'primary'),
        k.btn('Not today', function () { var L = app().local; L.offSkip = L.offSkip || {}; L.offSkip[x.q.id] = today(); L.q21At = app().trueNow(); app().saveLocal(); if (onDone) onDone(); }),
        k.btn('Never', function () { go('no'); }, 'ghost')));
      box.lastChild.lastChild.title = 'Stop suggesting this. ' + S.totemName + ' might check back in a few months, in case you change your mind.';
    } else {
      box.appendChild(h('div', { cls: 'q21head' }, h('span', { cls: 'nicon', 'aria-hidden': 'true' }, ui.pix('ask')), h('b', { text: 'Getting to know you' })));
      box.appendChild(h('div', { cls: 'q21q' }, x.q.q + '...'));
      box.appendChild(h('div', { cls: 'row wrap' }, k.btn(Wd.cap(x.q.a), function () { go('a'); }, 'primary'), k.btn(Wd.cap(x.q.b), function () { go('b'); }, 'primary'), k.btn('Skip', function () { go('skip'); }, 'ghost')));
    }
    return box;
  };

