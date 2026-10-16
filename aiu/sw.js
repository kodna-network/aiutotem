/* AIU TOTEM service worker: keeps the app working offline.
   The Totem's data lives in the browser's database, not in this cache. */
var CACHE = 'aiu-3.8.1';
var FILES = ['./', 'index.html', 'style.css?v=3.8.1', 'config.js?v=3.8.1', 'js/util.js?v=3.8.1', 'js/store.js?v=3.8.1', 'js/core.js?v=3.8.1',
  'js/art.js?v=3.8.1', 'js/rooms.js?v=3.8.1', 'js/world.js?v=3.8.1', 'js/oddities.js?v=3.8.1', 'js/castle.js?v=3.8.1', 'js/persona.js?v=3.8.1', 'js/iching.js?v=3.8.1', 'js/topics.js?v=3.8.1', 'js/hilltop.js?v=3.8.1', 'js/gaba.js?v=3.8.1', 'js/planner.js?v=3.8.1', 'js/vault.js?v=3.8.1', 'js/pdf.js?v=3.8.1', 'js/tiles.js?v=3.8.1', 'js/starter.js?v=3.8.1', 'js/mind.js?v=3.8.1', 'js/ui.js?v=3.8.1', 'js/panels.js?v=3.8.1', 'js/questboard.js?v=3.8.1', 'js/help.js?v=3.8.1', 'js/arcade.js?v=3.8.1', 'js/arcade-games.js?v=3.8.1', 'js/arcade-more.js?v=3.8.1', 'js/play.js?v=3.8.1', 'js/places.js?v=3.8.1', 'js/farm.js?v=3.8.1', 'js/minis.js?v=3.8.1', 'js/lab.js?v=3.8.1', 'js/toybox.js?v=3.8.1', 'js/life.js?v=3.8.1', 'js/shop.js?v=3.8.1', 'js/vitals.js?v=3.8.1', 'js/business.js?v=3.8.1', 'js/profiles.js?v=3.8.1', 'js/library.js?v=3.8.1', 'js/accounts.js?v=3.8.1', 'js/files.js?v=3.8.1', 'js/app.js?v=3.8.1', 'fonts/aiu-block.woff2', 'fonts/aiu-term.woff2',
  'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('aiu-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  // never cache the server mailbox, the (archived) shop or the full dictionary (the app keeps owned pictures and looked-up words itself)
  if (req.method !== 'GET' || url.origin !== location.origin || /api\.(cgi|php)|cgi-bin|\/shop\/|\/dict\/full\//.test(url.pathname)) return;
  // Network first (fresh app when online), cache when offline or slow.
  e.respondWith(new Promise(function (resolve) {
    var done = false;
    var timer = setTimeout(function () {
      caches.match(req, { ignoreSearch: false }).then(function (hit) { if (hit && !done) { done = true; resolve(hit); } });
    }, 3000);
    fetch(req).then(function (res) {
      clearTimeout(timer);
      if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
      if (!done) { done = true; resolve(res); }
    }).catch(function () {
      clearTimeout(timer);
      caches.match(req).then(function (hit) {
        if (done) return;
        done = true;
        resolve(hit || (req.mode === 'navigate' ? caches.match('index.html') : new Response('', { status: 504 })));
      });
    });
  }));
});
