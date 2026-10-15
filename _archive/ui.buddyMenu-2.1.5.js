// Replaced in 2.1.7 by the care bar (play.js + ui.careBar)
  // 2.1.5: tap the buddy: games, or look after it (Aiu goes out and does it). Just for fun: no points.
  ui.buddyMenu = function () {
    var a = app(), S = a.S, sc = a.view && a.view.sc, k = ui.k, s;
    var b = A.buddyOf(S.accentSeed, C.setting(S, 'buddy', 'auto')), nm = A.BUDDIES[b].replace(/ \(.*\)$/, '').toLowerCase();
    function care(id, msg) { s.remove(); a.buddyCare(id); k.snack(msg); }
    s = k.sheet('Your ' + nm, [h('div', { cls: 'bmenu' },
      btn('Games', function () { s.remove(); AIU.games.hub(); }, 'primary'),
      btn('Pet', function () { care('petbuddy', S.totemName + ' pets the ' + nm + '.'); }),
      btn('Snack', function () { care('feedbuddy', S.totemName + ' gives the ' + nm + ' a snack.'); }),
      btn('Water', function () { care('waterbuddy', S.totemName + ' fills the water bowl.'); }))]);
  };

// app.js, also removed in 2.1.7 (the care bar feeds the buddy directly now):
  app.buddyCare = function (id) { // Pet / Snack / Water from the buddy menu: Aiu goes out and does it
    if (!A.ACTIVITIES[id]) return;
    app.placeReq = { indoor: false, until: Date.now() + 30 * 60000 };
    app.forceAct = { id: id, until: Date.now() + 14000 };
    if (AIU.ui.refresh) AIU.ui.refresh();
  };
