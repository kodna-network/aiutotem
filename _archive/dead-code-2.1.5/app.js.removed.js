  app.reminderDismiss = function () {
    var p = app.popup; if (!p) return;
    app.dismissed[p.key + '|' + p.day] = 'dismissed'; app.store.set('dismissed', app.dismissed);
    app.popup = null; AIU.ui.hideReminder();
  };
  app.tryActivity = function (id) {
    registerActivities();
    if (!A.ACTIVITIES[id]) return;
    app.forceAct = { id: id, until: Date.now() + 120000 };
    app.addLine('Watch me! I\'m ' + A.ACTIVITIES[id].label + '.', true);
    if (AIU.ui.refresh) AIU.ui.refresh();
    setTimeout(function () { if (AIU.ui.refresh) AIU.ui.refresh(); }, 121000);
  };
  app.equip = function (slot, id) { return app.setSetting(slot, id || null).then(loadOwnedAssets); };
  app.editLine = function (id, text) { return app.addEvents([{ type: 'line_edit', data: { ref: id, text: String(text || '').slice(0, 4000) } }]); };
  app.deleteLine = function (id) { return app.addEvents([{ type: 'line_hide', data: { ref: id, hidden: true } }]); };
  app.undeleteLine = function (id) { return app.addEvents([{ type: 'line_hide', data: { ref: id, hidden: false } }]); };
  app.forgetLocalLine = function (t) { app.lines = app.lines.filter(function (l) { return l.t !== t; }); if (AIU.ui.refreshChat) AIU.ui.refreshChat(); };
  app.setPageField = function (day, f, text) { return app.addEvents([{ type: 'jpage', data: { day: day, f: f, text: String(text || '').trim() } }]); };
  app.isTalking = function () { return !!speaking; };
  app.loadDict = function () {
    if (!AIU.dict || AIU.dict.ready) return Promise.resolve();
    return app.store.get('dictLearned').then(function (lw) {
      AIU.dict.setLearned(lw || {});
      var t = null;
      AIU.dict.onLearn = function (all) { clearTimeout(t); t = setTimeout(function () { app.store.set('dictLearned', all); }, 2000); };
      return AIU.dict.load('dict/pocket.txt?v=' + CFG.version);
    }).catch(function () {});
  };
  app.say = function (text, opts) {
    opts = opts || {};
    text = Wd.clean(text);
    if (!text) return Promise.resolve();
    if (opts.as === 'log' || opts.as === 'quest') text = opts.as + ' entry: ' + text; // the Log's two buttons
    app.wake(true);
    var mine = opts.editOf ? { type: 'line_edit', data: { ref: opts.editOf, text: text.slice(0, 4000) } } : { type: 'say', data: { text: text.slice(0, 4000) } };
    var pd = app.pending, G = AIU.gaba;
    // a GABA follow-up: "did it calm you down or rev you up?"
    if (pd && pd.type === 'gaba_mixed' && G) {
      var low = text.toLowerCase(), k = /\b(calm\w*|relax\w*|chill\w*|good|helped|brake|settled|peaceful|fine|great)\b/.test(low) ? 'calm' : /\b(rev\w*|stress\w*|wired|jitter\w*|anxious|bad|go|worse|amped|tense|edgy)\b/.test(low) ? 'stress' : /\b(skip|neither|both|not sure|dunno|no idea|don'?t know)\b/.test(low) ? 'skip' : null;
      if (k) {
        app.pending = null; app.store.set('pending', null);
        var day = U.dayStr(new Date(app.trueNow())), item = (pd.data || {}).item || 'Something mixed', drafts0 = [mine], line0;
        if (k === 'skip') line0 = 'Okay, no score for that one.';
        else { var hit0 = { kind: k, item: item, pts: k === 'calm' ? 5 : -5 }, r0 = G.reply(app.S, day, hit0); drafts0 = drafts0.concat(r0.events); line0 = r0.line; }
        drafts0.push({ type: 'totem', data: { text: line0 } });
        return app.addEvents(drafts0).then(function () { AIU.ui.bubble('happy', line0); app.speak(line0); });
      }
      app.pending = null;
    }
    return app.prefetch(text).catch(function () {}).then(function () {
      return app.checkWords(text);
    }).then(function () {
      var ctx = app.ctx();
      if (opts.editOf) { var old = (app.S.chat || []).filter(function (e) { return e.id === opts.editOf; })[0]; ctx.editFrom = old ? String(old.data.text || '') : ''; }
      var res = M.respond(text, ctx);
      if (res.local) { Object.assign(app.local, res.local); app.saveLocal(); }
      // a log entry / quest entry is filed as itself, so the plain chat line isn't kept twice
      var drafts = (res.dropSay && !opts.editOf ? [] : [mine]).concat(res.events);
      // GABA coach: notice calming (Brake) or revving (Go) things you say you did
      if (G && app.dev.gabaCoach !== false && app.S.hatched && !res.noGaba) {
        var hit = G.detect(text), recentSame = hit && G.entries(app.S).some(function (g) { return g.item === hit.item && app.trueNow() - g.t < 20 * 60000; });
        var askedLately = hit && hit.kind === 'mixed' && app.local.gabaAsked && app.local.gabaAsked[hit.item] && app.trueNow() - app.local.gabaAsked[hit.item] < 4 * 3600000;
        var funnelQ = res.pending && res.pending.type === 'funnel';
        if (hit && hit.kind === 'mixed' && funnelQ) { res.pending = null; res.say = res.say.filter(function (l) { return !/log entry or a quest entry\?$/.test(l); }); } // GABA's question first
        if (hit && !recentSame && !askedLately && !(hit.kind === 'mixed' && res.pending)) {
          var gr = G.reply(app.S, ctx.today, hit);
          drafts = drafts.concat(gr.events);
          if (res.pending && res.pending.type === 'funnel' && res.say.length) res.say.splice(res.say.length - 1, 0, gr.line); else res.say.push(gr.line);
          if (gr.pending) { res.pending = gr.pending; app.local.gabaAsked = app.local.gabaAsked || {}; app.local.gabaAsked[hit.item] = app.trueNow(); app.saveLocal(); }
        }
      }
      var reply = res.say.join(' ');
      if (reply) drafts.push({ type: 'totem', data: { text: reply } });
      app.pending = res.pending || null;
      app.store.set('pending', app.pending);
      return app.addEvents(drafts).then(function () {
        if (reply) { AIU.ui.bubble('happy', reply); app.speak(reply); app.setMode('hop', 900); }
        if (res.cast) app.castReading(true);
      });
    });
  };
  app.checkWords = function (text) {
    var D = AIU.dict;
    if (!D || !D.ready || navigator.onLine === false || location.protocol === 'file:') return Promise.resolve();
    var ws = D.unknown(text).slice(0, 3);
    if (!ws.length) return Promise.resolve();
    return Promise.race([Promise.all(ws.map(function (w) { return D.lookup(w).catch(function () {}); })), new Promise(function (r) { setTimeout(r, 1500); })]);
  };
