/* AIU TOTEM service worker: keeps the app working offline.
   The Totem's data lives in the browser's database, not in this cache. */
var CACHE = 'aiu-1.0.5';
var FILES = ['./', 'index.html', 'style.css?v=1.0.5', 'config.js?v=1.0.5', 'js/util.js?v=1.0.5', 'js/store.js?v=1.0.5', 'js/core.js?v=1.0.5',
  'js/art.js?v=1.0.5', 'js/dict.js?v=1.0.5', 'js/butler.js?v=1.0.5', 'js/persona.js?v=1.0.5', 'js/iching.js?v=1.0.5', 'js/topics.js?v=1.0.5', 'js/hilltop.js?v=1.0.5', 'js/mind.js?v=1.0.5', 'js/ui.js?v=1.0.5', 'js/app.js?v=1.0.5', 'fonts/aiu-block.woff2', 'fonts/aiu-term.woff2',
  'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'dict/pocket.txt?v=1.0.5'];

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
  // never cache the server mailbox, the shop or the full dictionary (the app keeps owned pictures and looked-up words itself)
  if (req.method !== 'GET' || url.origin !== location.origin || /api\.cgi|cgi-bin|\/shop\/|\/dict\/full\//.test(url.pathname)) return;
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
