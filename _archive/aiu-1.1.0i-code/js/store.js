/* AIU TOTEM - on-device storage. Each profile (account) is its own little database:
   events = the Totem's DNA (append-only, indexed by arrival order, server order and day),
   kv     = device notes (login, sync position, the checkpoint, owned shop pictures).
   Unsent events are stored with seq 0 until the server numbers them. */
(function () {
  'use strict';
  var hasIDB = (function () { try { return !!window.indexedDB; } catch (e) { return false; } })();
  function req2p(r) { return new Promise(function (res, rej) { r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; }); }

  function openIDB(name) {
    return new Promise(function (res, rej) {
      // Some phones occasionally never answer; don't wait forever.
      var t = setTimeout(function () { rej(new Error('This device\'s storage did not open. Close other Aiu tabs, then reload.')); }, 10000);
      var res0 = res, rej0 = rej;
      res = function (v) { clearTimeout(t); res0(v); }; rej = function (e) { clearTimeout(t); rej0(e); };
      var r = indexedDB.open(name, 2);
      r.onupgradeneeded = function (ev) {
        var db = r.result, tx = r.transaction, st;
        if (!db.objectStoreNames.contains('events')) st = db.createObjectStore('events', { keyPath: 'id' });
        else st = tx.objectStore('events');
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv', { keyPath: 'k' });
        if (!st.indexNames.contains('ls')) st.createIndex('ls', 'ls');
        if (!st.indexNames.contains('seq')) st.createIndex('seq', 'seq');
        if (!st.indexNames.contains('d')) st.createIndex('d', 'd');
        if (ev.oldVersion === 1) { // number old events in arrival order
          var all = [];
          st.openCursor().onsuccess = function (e2) {
            var cur = e2.target.result;
            if (cur) { all.push(cur.value); cur.continue(); return; }
            all.sort(function (a, b) { return a.t - b.t; }).forEach(function (e3, i) { e3.ls = i + 1; if (!e3.seq) e3.seq = 0; st.put(e3); });
          };
        }
      };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
      r.onblocked = function () { rej(new Error('Storage is busy in another tab. Close other Aiu tabs and reload.')); };
    });
  }

  function IdbStore(db, name) { this.db = db; this.name = name; }
  IdbStore.prototype.os = function (store, mode) { return this.db.transaction(store, mode).objectStore(store); };
  IdbStore.prototype.all = function () { return req2p(this.os('events', 'readonly').getAll()); };
  IdbStore.prototype.count = function () { return req2p(this.os('events', 'readonly').count()); };
  IdbStore.prototype.range = function (index, lower, upper, lowerOpen) {
    var kr = upper === undefined ? IDBKeyRange.lowerBound(lower, !!lowerOpen) : IDBKeyRange.bound(lower, upper, !!lowerOpen, false);
    return req2p(this.os('events', 'readonly').index(index).getAll(kr));
  };
  IdbStore.prototype.afterLs = function (ls) { return this.range('ls', ls, undefined, true); };
  IdbStore.prototype.afterSeq = function (seq) { return this.range('seq', seq, undefined, true); };
  IdbStore.prototype.unsent = function () { return this.range('seq', 0, 0); };
  IdbStore.prototype.days = function (from, to) { return this.range('d', from, to); };
  IdbStore.prototype.maxOf = function (index) {
    var os = this.os('events', 'readonly').index(index);
    return new Promise(function (res, rej) {
      var r = os.openCursor(null, 'prev');
      r.onsuccess = function () { res(r.result ? (r.result.value[index] || 0) : 0); };
      r.onerror = function () { rej(r.error); };
    });
  };
  IdbStore.prototype.getMany = function (ids) {
    var os = this.os('events', 'readonly'), out = {};
    return Promise.all(ids.map(function (id) { return req2p(os.get(id)).then(function (e) { if (e) out[id] = e; }); })).then(function () { return out; });
  };
  IdbStore.prototype.put = function (list) {
    var db = this.db;
    return new Promise(function (res, rej) {
      if (!list.length) { res(); return; }
      var tx = db.transaction('events', 'readwrite'), st = tx.objectStore('events');
      list.forEach(function (e) { st.put(e); });
      tx.oncomplete = function () { res(); };
      tx.onerror = function () { rej(tx.error); };
      tx.onabort = function () { rej(tx.error || new Error('Save failed')); };
    });
  };
  IdbStore.prototype.get = function (k) { return req2p(this.os('kv', 'readonly').get(k)).then(function (r) { return r ? r.v : undefined; }); };
  IdbStore.prototype.set = function (k, v) { return req2p(this.os('kv', 'readwrite').put({ k: k, v: v })); };
  IdbStore.prototype.del = function (k) { return req2p(this.os('kv', 'readwrite').delete(k)); };
  IdbStore.prototype.wipe = function () { var name = this.name; this.db.close(); return req2p(indexedDB.deleteDatabase(name)).catch(function () {}); };

  // Fallback when IndexedDB is missing (some file:// pages): keeps data in localStorage.
  function LsStore(name) { this.name = name; }
  LsStore.prototype._r = function (k, d) { try { var v = localStorage.getItem(this.name + '|' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  LsStore.prototype._w = function (k, v) { localStorage.setItem(this.name + '|' + k, JSON.stringify(v)); };
  LsStore.prototype.all = function () { return Promise.resolve(this._r('events', [])); };
  LsStore.prototype.count = function () { return Promise.resolve(this._r('events', []).length); };
  LsStore.prototype._f = function (fn) { return Promise.resolve(this._r('events', []).filter(fn)); };
  LsStore.prototype.afterLs = function (ls) { return this._f(function (e) { return (e.ls || 0) > ls; }); };
  LsStore.prototype.afterSeq = function (s) { return this._f(function (e) { return (e.seq || 0) > s; }); };
  LsStore.prototype.unsent = function () { return this._f(function (e) { return !e.seq; }); };
  LsStore.prototype.days = function (a, b) { return this._f(function (e) { return e.d >= a && e.d <= b; }); };
  LsStore.prototype.maxOf = function (k) { return Promise.resolve(this._r('events', []).reduce(function (m, e) { return Math.max(m, e[k] || 0); }, 0)); };
  LsStore.prototype.getMany = function (ids) { var out = {}; this._r('events', []).forEach(function (e) { if (ids.indexOf(e.id) >= 0) out[e.id] = e; }); return Promise.resolve(out); };
  LsStore.prototype.put = function (list) {
    var all = this._r('events', []), idx = {};
    all.forEach(function (e, i) { idx[e.id] = i; });
    list.forEach(function (e) { if (idx[e.id] !== undefined) all[idx[e.id]] = e; else { idx[e.id] = all.length; all.push(e); } });
    this._w('events', all); return Promise.resolve();
  };
  LsStore.prototype.get = function (k) { return Promise.resolve(this._r('kv:' + k, undefined)); };
  LsStore.prototype.set = function (k, v) { this._w('kv:' + k, v); return Promise.resolve(); };
  LsStore.prototype.del = function (k) { localStorage.removeItem(this.name + '|kv:' + k); return Promise.resolve(); };
  LsStore.prototype.wipe = function () {
    var p = this.name + '|';
    Object.keys(localStorage).forEach(function (k) { if (k.indexOf(p) === 0) localStorage.removeItem(k); });
    return Promise.resolve();
  };

  function open(name) {
    if (!hasIDB) return Promise.resolve(new LsStore(name));
    return openIDB(name).then(function (db) { return new IdbStore(db, name); }, function () { return new LsStore(name); });
  }
  var metaP = null;
  AIU.store = {
    open: function (profile) { return open('aiu_p_' + profile); },
    meta: function () { if (!metaP) metaP = open('aiu_meta'); return metaP; },
    persist: function () {
      try { if (navigator.storage && navigator.storage.persist) return navigator.storage.persist(); } catch (e) {}
      return Promise.resolve(false);
    },
    kind: hasIDB ? 'indexeddb' : 'localstorage'
  };
})();
