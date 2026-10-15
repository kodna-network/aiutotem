// Removed in 2.1.6: tiles are separate from Vitals (finishing a calm tile no longer logs GABA).
  // 2.1.5: ONE rule: finishing a calm tile (any finish, repeating ones too) logs its Brake once a day. Undo + redo can't log twice.
  function gabaQuestsDone(list) {
    var G = AIU.gaba, T = AIU.tiles, d = U.dayStr(new Date(app.trueNow())), ev = [], seen = {};
    if (!G || !T || !app.S) return;
    list.forEach(function (e) {
      if (e.type !== 'tile_done' || (e.data || {}).undone) return;
      var q = app.S.quests[(e.data || {}).key]; if (!q) return;
      var m = /^gaba:(calm|avoid|food):(.+)$/.exec(q.subject || '');
      if (!m && !T.isCalm(q)) return;
      var item = m ? (m[1] === 'avoid' ? 'Skipped: ' + m[2] : m[2]) : q.title.slice(0, 40), f = G.find(m ? m[2] : q.title), pts = m && m[1] === 'avoid' ? 8 : f ? Math.abs(f.pts) : 8;
      if (seen[item] || G.day(app.S, d).some(function (g) { return g.item === item; })) return;
      seen[item] = 1; ev.push(G.logEvent(app.S, d, 'calm', item, pts, 'tile'));
    });
    if (ev.length) setTimeout(function () { app.addEvents(ev, true); }, 300);
  }
