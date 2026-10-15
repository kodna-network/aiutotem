/* The old server-folder shop (1.0.5 to 2.5.0), retired in 2.6.0: the Corner Mart (js/shop.js) is the only shop.
   To bring it back: put this block back in js/app.js where the 2.6.0 stubs are, and the asset('hat') etc. line in
   app.sceneState (shop: {...}). */
  /* ---------- the shop ---------- */
  // The shop is just folders on the server (aiu/shop/packs/<item>/). api.cgi lists them; nothing is uploaded from the app.
  app.loadCatalog = function () {
    return app.api('shop').then(function (r) {
      app.catalog = { items: r.items || [], categories: r.categories || {}, problems: r.problems || [] };
      var got = 0;
      (app.catalog.items).forEach(function (it) { if (app.S && app.S.owned[it.id]) { app.local.itemInfo = app.local.itemInfo || {}; app.local.itemInfo[it.id] = it; got++; } });
      if (got) app.saveLocal();
      registerActivities();
      return app.catalog;
    });
  };
  app.itemInfo = function (id) {
    if (app.catalog) { var f = (app.catalog.items || []).filter(function (x) { return x.id === id; })[0]; if (f) return f; }
    return (app.local.itemInfo || {})[id] || null;
  };
  app.buy = function (item) {
    if (!app.S) return Promise.reject(new Error('Not ready'));
    if (app.S.owned[item.id]) return Promise.resolve();
    if (app.S.coins < item.price) return Promise.reject(new Error('Not enough coins yet.'));
    if (!app.prof.local && navigator.onLine === false) return Promise.reject(new Error('The shop needs internet.'));
    app.local.itemInfo = app.local.itemInfo || {}; app.local.itemInfo[item.id] = item; app.saveLocal();
    return app.addEvents([{ type: 'buy', data: { item: item.id, price: item.price } }]).then(function () {
      return app.prof.local ? null : app.syncNow('buy').catch(function () {});
    }).then(function () { return app.cacheAsset(item); });
  };
  // Owned pictures are kept on the device so they work offline; the catalog itself is never stored.
  app.cacheAsset = function (item) {
    return app.store.get('asset:' + item.id).then(function (have) {
      if (have) return have;
      return fetch('shop/' + item.file + (item.v ? '?v=' + item.v : '')).then(function (r) { if (!r.ok) throw new Error('missing'); return r.blob(); }).then(function (b) {
        return new Promise(function (res) { var fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.readAsDataURL(b); });
      }).then(function (url) { return app.store.set('asset:' + item.id, url).then(function () { return url; }); });
    }).then(function (url) {
      var img = new Image(); img.src = url; app.assets[item.id] = { img: img, info: item };
      if (item.category === 'activity') registerActivities();
      return img;
    });
  };
  // Activity packs: things the Totem can do once you own them (a sprite strip of frames).
  function registerActivities() {
    if (!app.S) return;
    Object.keys(app.S.owned).forEach(function (id) {
      var a = app.assets[id], info = (a && a.info) || app.itemInfo(id);
      if (!info || info.category !== 'activity') return;
      if (a && a.img) A.addPackActivity(id, info, a.img);
    });
  }
  app.registerActivities = registerActivities;
  // "Do it now" in the shop: the Totem does that activity for 2 minutes.
  function ownedActivityIds() { return app.S ? Object.keys(app.S.owned).filter(function (id) { var i = app.itemInfo(id); return i && i.category === 'activity'; }) : []; }
  app.ownedActivityIds = ownedActivityIds;
  var triedCatalog = false;
  function loadOwnedAssets() {
    if (!app.S) return;
    // Bought on another device? Ask the shop what it was (once), then load it.
    if (!triedCatalog && !app.catalog && Object.keys(app.S.owned).some(function (id) { return !app.itemInfo(id); })) {
      triedCatalog = true; app.loadCatalog().then(loadOwnedAssets).catch(function () {});
    }
    ['hat', 'toy', 'backdrop', 'house', 'decor'].map(function (slot) { return C.setting(app.S, slot, null); }).concat(ownedActivityIds()).forEach(function (v) {
      if (!v || app.assets[v]) return;
      app.store.get('asset:' + v).then(function (url) {
        if (url) { var img = new Image(); img.src = url; app.assets[v] = { img: img, info: app.itemInfo(v) || {} }; registerActivities(); return; }
        var info = app.itemInfo(v);
        if (info) return app.cacheAsset(info);
        return app.loadCatalog().then(function () { var i2 = app.itemInfo(v); if (i2) return app.cacheAsset(i2); });
      }).catch(function () {});
    });
  }
  app.loadOwnedAssets = loadOwnedAssets;

