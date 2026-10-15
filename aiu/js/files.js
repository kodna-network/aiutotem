/* AIU TOTEM 2.5.0 - Files: your own file cabinet (Accounts > Files).
   Put any file in it: a photo you just took, a PDF, a document, a song. Make folders ("Bailey pictures") and move things
   between them. Delete sends a file to the Discard pile first; Delete forever needs the typed word DELETE.
   Privacy: on a synced Aiu every file is scrambled on this device before it leaves (AES-GCM, a fresh key for each file),
   and the list of files (names, folders, little previews) is scrambled with your Aiu password like an account card.
   The server only ever holds scrambled pieces. A device-only Aiu keeps its files on this device (in the browser).
   Files go up in 512 KB pieces (hosts often limit one request). One file can be up to 25 MB. */
(function () {
  'use strict';
  var U = AIU.util, h = U.h, ui = AIU.ui, PN = AIU.panels;
  var F = AIU.files = {};
  var MAX = 25 * 1024 * 1024, PIECE = 512 * 1024, THUMB = 96, WRITTEN = '__written';
  var FS = { folder: '', bin: false, recs: null, sig: null, busy: {}, used: null };
  function app() { return AIU.app; }
  function K() { return ui.k; }
  function prof() { var a = app(); return { u: a.prof.u, token: a.prof.token, tid: a.prof.tid || '' }; }
  function sealed() { return app().vaultMode() === 'sealed'; }
  function newId() { var u = new Uint8Array(12); crypto.getRandomValues(u); return Array.prototype.map.call(u, function (b) { return ('0' + b.toString(36)).slice(-2); }).join('').slice(0, 20); }
  function b64(buf) { var s = '', u = new Uint8Array(buf), CH = 0x8000; for (var i = 0; i < u.length; i += CH) s += String.fromCharCode.apply(null, u.subarray(i, i + CH)); return btoa(s); }
  function unb64(s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  F.size = function (n) { n = +n || 0; return n < 1024 ? n + ' B' : n < 1048576 ? Math.round(n / 1024) + ' KB' : (n / 1048576).toFixed(n < 10485760 ? 1 : 0) + ' MB'; };
  AIU.hooks.open.push(function () { FS.folder = ''; FS.bin = false; FS.recs = null; FS.sig = null; FS.used = null; });

  /* ---------- this device's file shelf (IndexedDB): device-only files, uploads waiting for the internet, and a cache ---------- */
  var dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise(function (res, rej) {
      if (!window.indexedDB) return rej(new Error('This browser can\'t keep files.'));
      var r = indexedDB.open('aiu-files', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('blobs'); };
      r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error || new Error('Could not open the file shelf.')); };
    });
    return dbp;
  }
  function tx(mode, fn) { return db().then(function (d) { return new Promise(function (res, rej) { var t = d.transaction('blobs', mode), st = t.objectStore('blobs'), out = fn(st); t.oncomplete = function () { res(out && 'result' in out ? out.result : undefined); }; t.onerror = function () { rej(t.error); }; }); }); }
  function shelfKey(id) { var a = app(); return a.pid + '|' + id; }
  function shelfGet(id) { return tx('readonly', function (st) { return st.get(shelfKey(id)); }).catch(function () { return null; }); }
  function shelfPut(id, rec) { return tx('readwrite', function (st) { st.put(Object.assign({ t: Date.now() }, rec), shelfKey(id)); }); }
  function shelfDel(id) { return tx('readwrite', function (st) { st.delete(shelfKey(id)); }).catch(function () {}); }
  function shelfAll() { return tx('readonly', function (st) { return st.getAll ? st.getAll() : null; }).catch(function () { return []; }); }
  function shelfKeys() { return tx('readonly', function (st) { return st.getAllKeys ? st.getAllKeys() : null; }).catch(function () { return []; }); }

  /* ---------- the list (records): {kind: 'file'|'folder', name, folder, mime, size, thumb, fk, fiv, n, bin, at} ---------- */
  function sig(S) { var D = S.dfiles || {}; return app().pid + ':' + Object.keys(D).map(function (k) { return k + ':' + D[k].t; }).join('|'); }
  F.records = function () {
    var a = app(), S = a.S, D = S.dfiles || {}, sg = sig(S);
    if (FS.recs && FS.sig === sg) return Promise.resolve(FS.recs);
    var ids = Object.keys(D).filter(function (k) { return !D[k].removed; });
    var need = ids.some(function (k) { return D[k].ct; });
    return (need ? a.vaultKey() : Promise.resolve(null)).then(function (key) {
      return Promise.all(ids.map(function (k) {
        var r = D[k];
        if (r.p) return Object.assign({}, r.p, { key: k, t: r.t, plain: true });
        if (!key) return { key: k, locked: true, kind: 'file', name: '(locked)', folder: '', t: r.t };
        return AIU.vault.openCard(key, r).then(function (x) { return Object.assign(x, { key: k, t: r.t }); }, function () { return { key: k, locked: true, kind: 'file', name: '(locked with an old password)', folder: '', t: r.t }; });
      }));
    }).then(function (list) { FS.recs = list; FS.sig = sg; return list; });
  };
  function saveRec(key, rec) { // one record, scrambled when synced
    var a = app(), r = Object.assign({}, rec); delete r.key; delete r.t; delete r.plain; delete r.locked;
    if (!sealed()) return a.addEvents([{ type: 'dfile', data: { key: key, p: r } }]);
    return a.vaultKey().then(function (k) {
      if (!k) throw new Error('Open Accounts with your Aiu password first.');
      return AIU.vault.sealCard(k, r).then(function (sl) { return a.addEvents([{ type: 'dfile', data: { key: key, iv: sl.iv, ct: sl.ct, gen: (AIU.core.setting(a.S, 'vaultLock', {}) || {}).gen || 1 } }]); });
    });
  }
  F.reseal = function (oldKey, newKey, lockGen) { // a new Aiu password: the list moves to the new key (each file keeps its own key)
    var D = app().S.dfiles || {}, ids = Object.keys(D).filter(function (k) { return !D[k].removed && D[k].ct; });
    return Promise.all(ids.map(function (k) { return AIU.vault.openCard(oldKey, D[k]).then(function (r) { return AIU.vault.sealCard(newKey, r).then(function (sl) { return { type: 'dfile', data: { key: k, iv: sl.iv, ct: sl.ct, gen: lockGen } }; }); }, function () { return null; }); }))
      .then(function (ev) { return ev.filter(Boolean); });
  };
  function kids(list, folder) { return list.filter(function (r) { return (r.folder || '') === folder; }); }
  function inBin(list, r) { var seen = 0; while (r && seen++ < 40) { if (r.bin) return true; var up = r.folder; r = up ? list.filter(function (x) { return x.key === up; })[0] : null; } return false; }
  function pathOf(list, key) { var out = [], r = list.filter(function (x) { return x.key === key; })[0], n = 0; while (r && n++ < 40) { out.unshift(r); r = r.folder ? list.filter(function (x) { return x.key === r.folder; })[0] : null; } return out; }
  function under(list, key) { var out = []; kids(list, key).forEach(function (r) { out.push(r); if (r.kind === 'folder') out = out.concat(under(list, r.key)); }); return out; }

  /* ---------- bytes: scramble, upload in pieces, download, unscramble ---------- */
  function encrypt(buf) {
    var iv = crypto.getRandomValues(new Uint8Array(12));
    return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']).then(function (key) {
      return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, buf).then(function (ct) { return crypto.subtle.exportKey('raw', key).then(function (raw) { return { ct: ct, fk: b64(raw), fiv: b64(iv) }; }); });
    });
  }
  function decrypt(rec, ct) {
    return crypto.subtle.importKey('raw', unb64(rec.fk), { name: 'AES-GCM' }, false, ['decrypt']).then(function (key) { return crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(rec.fiv) }, key, ct); });
  }
  function upload(id, ct, onStep) {
    var a = app(), p = prof(), u8 = new Uint8Array(ct), n = Math.max(1, Math.ceil(u8.length / PIECE)), i = 0;
    function next() {
      if (i >= n) return Promise.resolve(n);
      var part = u8.subarray(i * PIECE, Math.min(u8.length, (i + 1) * PIECE));
      return a.api('blob_put', { u: p.u, token: p.token, tid: p.tid, id: id, i: i, n: n, data: b64(part) }).then(function () { i++; if (onStep) onStep(i, n); return next(); });
    }
    return next();
  }
  function download(id, n, onStep) {
    var a = app(), p = prof(), parts = [], total = 0;
    function get(i) {
      if (i >= n) { var out = new Uint8Array(total), o = 0; parts.forEach(function (x) { out.set(x, o); o += x.length; }); return Promise.resolve(out.buffer); }
      return a.api('blob_get', { u: p.u, token: p.token, tid: p.tid, id: id, i: i }).then(function (r) { var b = unb64(r.data); parts.push(b); total += b.length; if (onStep) onStep(i + 1, n); return get(i + 1); });
    }
    return get(0);
  }
  // The file's bytes (unscrambled): from this device first, else from the server (then kept here, up to ~10 MB each)
  F.bytes = function (rec, onStep) {
    return shelfGet(rec.key).then(function (s) {
      if (s && s.data) return rec.plain ? s.data : decrypt(rec, s.data);
      if (rec.plain) throw new Error('This file is on the device it was added on.');
      return download(rec.key, rec.n || 1, onStep).then(function (ct) {
        if (ct.byteLength <= 10 * 1024 * 1024) shelfPut(rec.key, { data: ct, cache: 1, size: ct.byteLength }).catch(function () {});
        return decrypt(rec, ct);
      }, function (e) { if (e.code === 'no_file') throw new Error('This file hasn\'t reached the server yet. Open Files on the device it was added on (with internet) and it finishes going up.'); throw e; });
    });
  };
  // Uploads that waited for the internet go up now
  F.flush = function () {
    if (!sealed() || !navigator.onLine) return Promise.resolve(0);
    var a = app(), pre = a.pid + '|';
    return shelfKeys().then(function (keys) {
      keys = (keys || []).filter(function (k) { return String(k).indexOf(pre) === 0; });
      return keys.reduce(function (pr, k) {
        return pr.then(function (n) { var id = String(k).slice(pre.length); if (FS.busy[id]) return n; return shelfGet(id).then(function (s) { if (!s || !s.pending) return n; return upload(id, s.data).then(function () { return shelfPut(id, { data: s.data, cache: 1, size: s.size }).then(function () { return n + 1; }); }, function () { return n; }); }); });
      }, Promise.resolve(0));
    }).catch(function () { return 0; });
  };
  /* 2.6.0: once a week, tidy up. Files on the server that nothing points to any more (an upload whose phone died before it
     synced, say) are removed after a week; a file this device still holds that never reached the server goes up again. */
  F.tidy = function (force) {
    var a = app(), lc = a.local, D = (a.S && a.S.dfiles) || {}, now = Date.now();
    lc.filesTidy = lc.filesTidy || {};
    if (!sealed() || !navigator.onLine || (!force && now - (lc.filesTidy[a.pid] || 0) < 7 * 86400000)) return Promise.resolve(null);
    lc.filesTidy[a.pid] = now; a.saveLocal();
    return a.api('blob_list', prof()).then(function (r) {
      var on = {}, gone = 0, sent = 0; (r.files || []).forEach(function (x) { on[x.id] = x; });
      var dels = (r.files || []).filter(function (x) { var d = D[x.id]; return (!d || d.removed) && (r.now || now) - (x.t || 0) > 7 * 86400000; });
      var live = Object.keys(D).filter(function (k) { return !D[k].removed && D[k].ct && (!on[k] || on[k].have < on[k].n); });
      return dels.reduce(function (pr, x) { return pr.then(function () { return a.api('blob_del', Object.assign(prof(), { id: x.id })).then(function () { gone++; }, function () {}); }); }, Promise.resolve())
        .then(function () { return live.reduce(function (pr, k) { return pr.then(function () { return shelfGet(k).then(function (sh) { if (sh && sh.data && !sh.pending) return upload(k, sh.data).then(function () { sent++; }, function () {}); }); }); }, Promise.resolve()); })
        .then(function () { return { removed: gone, resent: sent }; });
    }).catch(function () { return null; });
  };
  // A device-only Aiu that joined an account: its files get scrambled and go up
  function migratePlain(list) {
    var plain = list.filter(function (r) { return r.plain; });
    if (!plain.length || !sealed()) return Promise.resolve(false);
    return plain.reduce(function (pr, r) {
      return pr.then(function () {
        var rec = Object.assign({}, r);
        if (r.kind === 'folder') return saveRec(r.key, rec);
        return shelfGet(r.key).then(function (s) {
          if (!s || !s.data) return saveRec(r.key, rec);
          return encrypt(s.data).then(function (en) { rec.fk = en.fk; rec.fiv = en.fiv; rec.n = Math.max(1, Math.ceil(en.ct.byteLength / PIECE)); return shelfPut(r.key, { data: en.ct, pending: 1, size: en.ct.byteLength }).then(function () { return saveRec(r.key, rec); }); });
        });
      });
    }, Promise.resolve()).then(function () { F.flush(); return true; });
  }

  /* ---------- adding files ---------- */
  function thumbOf(file) {
    if (!/^image\//.test(file.type) || /svg/.test(file.type)) return Promise.resolve('');
    return new Promise(function (res) {
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function () {
        try {
          var s = Math.min(1, THUMB / Math.max(im.width, im.height)), w = Math.max(1, Math.round(im.width * s)), hh = Math.max(1, Math.round(im.height * s)), c = document.createElement('canvas');
          c.width = w; c.height = hh; var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, hh); g.drawImage(im, 0, 0, w, hh);
          var q = 0.6, d = c.toDataURL('image/jpeg', q); while (d.length > 7000 && q > 0.2) { q -= 0.15; d = c.toDataURL('image/jpeg', q); }
          URL.revokeObjectURL(url); res(d.length <= 7000 ? d : '');
        } catch (e) { URL.revokeObjectURL(url); res(''); }
      };
      im.onerror = function () { URL.revokeObjectURL(url); res(''); };
      im.src = url;
    });
  }
  F.pick = function (folder) {
    var inp = h('input', { type: 'file', multiple: 'multiple', cls: 'hidden' });
    inp.addEventListener('change', function () { var fl = Array.prototype.slice.call(inp.files || []); inp.remove(); if (fl.length) F.add(fl, folder == null ? FS.folder : folder); });
    document.body.appendChild(inp); inp.click();
  };
  F.add = function (files, folder) {
    var a = app(), k = K(), done = 0, bad = [];
    if (folder === WRITTEN) folder = '';
    if (sealed()) return a.vaultKey().then(function (key) { if (!key) { k.snack('Open Accounts with your Aiu password first (the Cards tab).'); return; } go(); });
    go();
    function go() {
      files.reduce(function (pr, f) {
        return pr.then(function () {
          if (f.size > MAX) { bad.push(f.name + ' is ' + F.size(f.size) + ' (the most is 25 MB)'); return; }
          var id = newId(); FS.busy[id] = { name: f.name, step: 'Reading...' }; refresh();
          return Promise.all([f.arrayBuffer ? f.arrayBuffer() : new Response(f).arrayBuffer(), thumbOf(f)]).then(function (r) {
            var buf = r[0], rec = { kind: 'file', name: String(f.name || 'file').slice(0, 120), folder: folder || '', mime: f.type || '', size: f.size, thumb: r[1], at: Date.now() };
            if (!sealed()) return shelfPut(id, { data: buf, size: buf.byteLength }).then(function () { return saveRec(id, rec); });
            FS.busy[id].step = 'Scrambling...'; refresh();
            return encrypt(buf).then(function (en) {
              rec.fk = en.fk; rec.fiv = en.fiv; rec.n = Math.max(1, Math.ceil(en.ct.byteLength / PIECE));
              return shelfPut(id, { data: en.ct, pending: 1, size: en.ct.byteLength }).then(function () { return saveRec(id, rec); }).then(function () {
                return upload(id, en.ct, function (i, n) { FS.busy[id].step = 'Sending ' + Math.round(i / n * 100) + '%'; refresh(); })
                  .then(function () { return shelfPut(id, { data: en.ct, cache: 1, size: en.ct.byteLength }); }, function (e) { if (e.code === 'files_full') bad.push(e.message); else bad.push(f.name + ' is saved here and goes up when you\'re back online.'); });
              });
            });
          }).then(function () { done++; delete FS.busy[id]; FS.used = null; refresh(); }, function (e) { delete FS.busy[id]; bad.push(f.name + ': ' + (e && e.message || e)); refresh(); });
        });
      }, Promise.resolve()).then(function () {
        FS.used = null;
        if (bad.length) k.sheet('Some files need a look', bad.map(function (x) { return h('p', { text: x }); }));
        else k.snack(done === 1 ? 'Added.' : 'Added ' + done + ' files.');
        refresh();
      });
    }
  };
  function refresh() { if (ui.tab === 'accounts' && (PN.state.atab || 'cards') === 'docs' && !document.querySelector('.sheet')) ui.renderPanel(true); }

  /* ---------- the Docs tab ---------- */
  var EXT = { pdf: 'PDF', doc: 'DOC', docx: 'DOC', txt: 'TXT', md: 'TXT', xls: 'XLS', xlsx: 'XLS', csv: 'CSV', ppt: 'PPT', pptx: 'PPT', zip: 'ZIP', mp3: 'SONG', m4a: 'SONG', wav: 'SONG', mp4: 'VIDEO', mov: 'VIDEO', stl: '3D', blend: '3D', obj: '3D' };
  function extOf(r) { var m = /\.([A-Za-z0-9]{1,5})$/.exec(r.name || ''); return m ? m[1].toLowerCase() : ''; }
  function badge(r) { var e = extOf(r); return EXT[e] || (/^image\//.test(r.mime) ? 'PIC' : /^video\//.test(r.mime) ? 'VIDEO' : /^audio\//.test(r.mime) ? 'SONG' : (e || 'FILE').toUpperCase().slice(0, 4)); }
  function tile(r, onTap) {
    var pic = r.kind === 'folder' ? h('span', { cls: 'fthumb folder', 'aria-hidden': 'true' }, ui.pix('folder')) :
      r.thumb ? h('span', { cls: 'fthumb', 'aria-hidden': 'true' }, h('img', { src: r.thumb, alt: '' })) : h('span', { cls: 'fthumb doc', 'aria-hidden': 'true', text: badge(r) });
    return h('button', { type: 'button', cls: 'ftile' + (r.locked ? ' locked' : ''), onclick: onTap }, pic, h('b', { cls: 'fname', text: r.name || '(no name)' }),
      h('span', { cls: 'small', text: r.kind === 'folder' ? r.count + ' inside' : r.locked ? 'locked' : F.size(r.size) }));
  }
  F.view = function (p) {
    var a = app(), k = K();
    if (!sealed() && !window.indexedDB) { p.appendChild(k.empty('This browser can\'t keep files.')); return; }
    if (sealed() && a.vaultMode() === 'none') { p.appendChild(k.empty('Files needs a secure (https) page.')); return; }
    p.appendChild(k.empty('Opening...'));
    (sealed() ? a.vaultKey() : Promise.resolve(true)).then(function (key) {
      if (ui.tab !== 'accounts') return;
      if (!key) { k.clear(p); p.appendChild(h('p', { cls: 'small', text: 'Your files are scrambled with your Aiu password. Open the Cards tab and type it once on this device; Files opens too.' })); p.appendChild(k.btn('Go to Cards', function () { PN.state.atab = 'cards'; ui.renderPanel(true); }, 'primary')); return; }
      F.records().then(function (list) {
        if (ui.tab !== 'accounts') return;
        migratePlain(list).then(function (did) { if (did) { FS.recs = null; refresh(); } });
        F.flush().then(function (n) { if (n) k.snack(n === 1 ? 'A waiting file went up.' : n + ' waiting files went up.'); });
        F.tidy();
        k.clear(p); draw(p, list);
      }, function (e) { k.clear(p); p.appendChild(k.empty('Could not open Files: ' + e.message)); });
    });
  };
  function draw(p, list) {
    var a = app(), k = K(), live = list.filter(function (r) { return !inBin(list, r); }), binned = list.filter(function (r) { return r.bin && !inBin(list, Object.assign({}, r, { bin: 0 })); });
    if (FS.folder && FS.folder !== WRITTEN && !live.some(function (r) { return r.key === FS.folder; })) FS.folder = '';
    // where you are
    var crumbs = h('div', { cls: 'crumbs', role: 'navigation', 'aria-label': 'Folders' });
    function crumb(label, key) { return k.btn(label, function () { FS.folder = key; FS.bin = false; refresh(); }, 'chip' + (FS.folder === key && !FS.bin ? ' on' : '')); }
    crumbs.appendChild(crumb('All files', ''));
    if (FS.bin) crumbs.appendChild(k.btn('Discard pile', function () {}, 'chip on'));
    else if (FS.folder === WRITTEN) crumbs.appendChild(crumb('Written', WRITTEN));
    else pathOf(list, FS.folder).forEach(function (r) { crumbs.appendChild(crumb(r.name, r.key)); });
    p.appendChild(crumbs);
    if (FS.bin) return binView(p, list, binned);
    if (FS.folder === WRITTEN) { p.appendChild(h('p', { cls: 'small', text: 'Letters, plans and résumés you write right here in Aiu.' })); AIU.business.docListInto(p); oldFolders(p); return; }
    // working on it
    Object.keys(FS.busy).forEach(function (id) { var b = FS.busy[id]; p.appendChild(h('div', { cls: 'item fbusy' }, h('b', { text: b.name }), h('span', { cls: 'small', text: b.step }))); });
    var here = kids(live, FS.folder).sort(function (x, y) { return (x.kind === 'folder' ? 0 : 1) - (y.kind === 'folder' ? 0 : 1) || (x.kind === 'folder' ? String(x.name).toLowerCase() < String(y.name).toLowerCase() ? -1 : 1 : (y.at || y.t || 0) - (x.at || x.t || 0)); });
    var grid = h('div', { cls: 'fgrid' });
    if (!FS.folder) grid.appendChild(tile({ kind: 'folder', name: 'Written', count: 'letters, résumé...' , key: WRITTEN }, function () { FS.folder = WRITTEN; refresh(); }));
    here.forEach(function (r) {
      if (r.kind === 'folder') r.count = kids(live, r.key).length;
      grid.appendChild(tile(r, function () { if (r.locked) return k.snack('This one was scrambled with an older Aiu password.'); if (r.kind === 'folder') { FS.folder = r.key; refresh(); } else F.open(r); }));
    });
    p.appendChild(h('div', { cls: 'row wrap' }, k.btn('+ New folder', function () { folderSheet(null); }),
      FS.folder ? k.btn('Folder...', function () { var f = live.filter(function (r) { return r.key === FS.folder; })[0]; if (f) itemSheet(f, list); }) : null));
    if (!here.length && FS.folder) p.appendChild(k.empty('This folder is empty. Tap + Add files: on a phone you can take a photo right then.'));
    p.appendChild(grid);
    if (!FS.folder && !here.length) p.appendChild(h('p', { cls: 'small', text: 'Put anything here: photos (on a phone, + Add files can take one right now), PDFs, documents, songs. Make folders to keep them tidy, like "Bailey pictures".' }));
    p.appendChild(k.btn('Discard pile' + (binned.length ? ' (' + binned.length + ')' : ''), function () { FS.bin = true; refresh(); }, 'ghost'));
    p.appendChild(space());
  }
  function oldFolders(p) {
    var k = K(), olds = AIU.business.oldFolders ? AIU.business.oldFolders() : [];
    if (!olds.length) return;
    p.appendChild(k.acc('docs-oldbiz', 'Business folders from before 2.2.0', [h('p', { cls: 'small', text: 'Before 2.2.0 a business was a folder inside your profile. Open one, or move it into a profile of its own.' }),
      olds.map(function (f) { return h('div', { cls: 'item' }, h('button', { type: 'button', cls: 'ititle linkish', text: f.name, onclick: f.open }), k.btn('Make it its own profile', f.move, 'mini')); })], false, olds.length));
  }
  function space() {
    var a = app(), box = h('p', { cls: 'small fspace' });
    var d = FS.used ? Promise.resolve(FS.used) : sealed() ? a.api('blob_usage', prof()).then(function (r) { return { used: r.used, max: r.max }; }) : (navigator.storage && navigator.storage.estimate ? navigator.storage.estimate().then(function (e) { return { used: e.usage, max: e.quota, here: 1 }; }) : Promise.resolve(null));
    d.then(function (x) {
      if (!x) return; FS.used = x;
      var pct = x.max ? Math.min(100, Math.round(x.used / x.max * 100)) : 0;
      box.appendChild(h('span', { cls: 'bar thin', title: pct + '%' }, h('i', { cls: 'conf', style: 'width:' + pct + '%' })));
      box.appendChild(document.createTextNode((x.here ? 'This device: ' : 'Files space: ') + F.size(x.used) + ' of ' + F.size(x.max) + ' used. ' + (sealed() ? 'Scrambled before it leaves this device: only you can open these files.' : 'This Aiu lives only on this device, so its files do too.')));
    }, function () { box.textContent = sealed() ? 'Scrambled before it leaves this device: only you can open these files.' : ''; });
    return box;
  }
  function binView(p, list, binned) {
    var a = app(), k = K();
    p.appendChild(h('p', { cls: 'small', text: 'Things you deleted wait here. Restore puts one back. Delete forever removes it for good (from the server too).' }));
    if (!binned.length) { p.appendChild(k.empty('The Discard pile is empty.')); return; }
    binned.forEach(function (r) {
      var inside = r.kind === 'folder' ? under(list, r.key).length : 0;
      p.appendChild(h('div', { cls: 'item' }, h('span', { cls: 'ititle' }, h('b', { text: r.name }), h('span', { cls: 'small', text: ' ' + (r.kind === 'folder' ? 'folder, ' + inside + ' inside' : F.size(r.size)) })),
        k.btn('Restore', function () { var c = Object.assign({}, r); c.bin = 0; saveRec(r.key, c).then(function () { k.snack('Restored.'); }); }, 'mini'),
        k.btn('Delete forever', function () { foreverSheet(r, list); }, 'mini danger')));
    });
  }
  function foreverSheet(r, list) {
    var a = app(), k = K(), s, ph = k.inp({ placeholder: 'type DELETE' }), m = h('p', { cls: 'formmsg' }), all = [r].concat(r.kind === 'folder' ? under(list, r.key) : []);
    s = k.sheet('Delete forever?', [h('p', { text: '"' + r.name + '"' + (all.length > 1 ? ' and the ' + (all.length - 1) + ' things inside it' : '') + ' will be gone for good, here and on the server. Type DELETE to be sure.' }), ph, m,
      h('div', { cls: 'row spread' }, k.btn('Cancel', function () { s.remove(); }, 'ghost'), k.btn('Delete forever', function (e) {
        if (ph.value.trim() !== 'DELETE') return k.msg(m, 'Type DELETE exactly.', true);
        var b0 = e.target; k.busy(b0, true, 'Deleting...');
        all.reduce(function (pr, x) {
          return pr.then(function () { return shelfDel(x.key); }).then(function () { return x.kind === 'file' && sealed() ? a.api('blob_del', Object.assign(prof(), { id: x.key })).catch(function () {}) : null; });
        }, Promise.resolve()).then(function () { return a.addEvents(all.map(function (x) { return { type: 'dfile', data: { key: x.key, removed: true } }; })); })
          .then(function () { FS.used = null; s.remove(); k.snack('Deleted for good.'); }, function (er) { k.busy(b0, false, 'Try again'); k.msg(m, er.message, true); });
      }, 'danger'))]);
  }
  function folderSheet(rec) {
    var k = K(), s, n = k.inp({ value: rec ? rec.name : '', placeholder: 'e.g. Bailey pictures', maxLength: 60, autocapitalize: 'words' }), m = h('p', { cls: 'formmsg' });
    function save() {
      var nm = n.value.trim(); if (!nm) return k.msg(m, 'Give the folder a name.', true);
      var key = rec ? rec.key : newId(), r = rec ? Object.assign({}, rec, { name: nm }) : { kind: 'folder', name: nm, folder: FS.folder === WRITTEN ? '' : FS.folder, at: Date.now() };
      delete r.count;
      saveRec(key, r).then(function () { s.remove(); }, function (e) { k.msg(m, e.message, true); });
    }
    n.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); save(); } });
    s = k.sheet(rec ? 'Rename folder' : 'New folder', [k.field('Folder name', n), m, h('div', { cls: 'row spread' }, k.btn('Cancel', function () { s.remove(); }, 'ghost'), k.btn(rec ? 'Save' : 'Make it', save, 'primary'))]);
    setTimeout(function () { try { n.focus(); } catch (e) {} }, 60);
  }
  function moveSel(list, r) { // every folder it could go into (not itself or anything inside it)
    var no = {}; no[r.key] = 1; if (r.kind === 'folder') under(list, r.key).forEach(function (x) { no[x.key] = 1; });
    var opts = [['', 'All files (top)']].concat(list.filter(function (x) { return x.kind === 'folder' && !no[x.key] && !inBin(list, x); }).map(function (x) { return [x.key, pathOf(list, x.key).map(function (y) { return y.name; }).join(' / ')]; }));
    return K().sel(opts, r.folder || '', function () {});
  }
  // A file or folder: rename, move, delete
  function itemSheet(r, list) {
    var k = K(), s, n = k.inp({ value: r.name, maxLength: 120 }), mv = moveSel(list, r), m = h('p', { cls: 'formmsg' });
    s = k.sheet(r.kind === 'folder' ? 'Folder' : 'File', [k.field('Name', n), k.field('Keep it in', mv), m,
      h('div', { cls: 'row spread' }, k.btn('Delete', function () { var c = Object.assign({}, r); c.bin = Date.now(); delete c.count; saveRec(r.key, c).then(function () { s.remove(); if (FS.folder === r.key) FS.folder = r.folder || ''; k.snack('Moved to the Discard pile.'); }); }, 'danger'),
        k.btn('Save', function () { var nm = n.value.trim(); if (!nm) return k.msg(m, 'Give it a name.', true); var c = Object.assign({}, r, { name: nm, folder: mv.value }); delete c.count; saveRec(r.key, c).then(function () { s.remove(); k.snack('Saved.'); }, function (e) { k.msg(m, e.message, true); }); }, 'primary'))]);
  }
  // Open a file: a picture, a PDF, a song or a video right here; anything else can be saved or shared
  F.open = function (r) {
    var k = K(), s, box = h('div', { cls: 'fview' }, k.empty('Opening...')), url = null, blob = null;
    var acts = h('div', { cls: 'row wrap' });
    s = k.sheet(r.name, [box, h('p', { cls: 'small', text: F.size(r.size) + (r.at ? ' · added ' + U.fmtDay(U.dayStr(new Date(r.at))) : '') }), acts]);
    var close = s.querySelector('.sheethead .btn'); if (close) close.addEventListener('click', function () { if (url) URL.revokeObjectURL(url); });
    F.bytes(r, function (i, n) { k.clear(box); box.appendChild(k.empty('Downloading ' + Math.round(i / n * 100) + '%')); }).then(function (buf) {
      blob = new Blob([buf], { type: r.mime || 'application/octet-stream' }); url = URL.createObjectURL(blob); k.clear(box);
      if (/^image\//.test(r.mime)) box.appendChild(h('img', { src: url, alt: r.name }));
      else if (/^video\//.test(r.mime)) box.appendChild(h('video', { src: url, controls: 'controls', playsinline: 'playsinline' }));
      else if (/^audio\//.test(r.mime)) box.appendChild(h('audio', { src: url, controls: 'controls' }));
      else if (/pdf/.test(r.mime) || extOf(r) === 'pdf') box.appendChild(h('iframe', { src: url, title: r.name }));
      else if (/^text\//.test(r.mime) || /^(txt|md|csv|json)$/.test(extOf(r))) box.appendChild(h('pre', { cls: 'ftext', text: U.fromUtf8(new Uint8Array(buf.slice(0, 40000))) }));
      else box.appendChild(h('div', { cls: 'fthumb doc big', text: badge(r) }));
      var file = null; try { file = new File([blob], r.name, { type: blob.type }); } catch (e) {}
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) acts.appendChild(k.btn('Share or save', function () { navigator.share({ files: [file], title: r.name }).catch(function () {}); }, 'primary'));
      acts.appendChild(k.btn('Download', function () { U.download(blob, r.name); }));
      acts.appendChild(h('a', { cls: 'btn', href: url, target: '_blank', rel: 'noopener', text: 'Open in a new tab' }));
      acts.appendChild(k.btn('Rename / move', function () { s.remove(); F.records().then(function (list) { itemSheet(r, list); }); }));
    }, function (e) { k.clear(box); box.appendChild(k.empty(e.message)); });
  };

  /* ---------- capsules: your files, readable, in files/ (keep the capsule safe) ---------- */
  F.capsuleFiles = function (root, onStep) {
    return F.records().then(function (list) {
      var live = list.filter(function (r) { return r.kind === 'file' && !r.locked && !inBin(list, r); }), out = [], index = [], used = {}, i = 0;
      return live.reduce(function (pr, r) {
        return pr.then(function () {
          return F.bytes(r).then(function (buf) {
            var dir = pathOf(list, r.folder).map(function (x) { return x.name.replace(/[\\/:*?"<>|]+/g, '_'); }).join('/'), nm = (dir ? dir + '/' : '') + r.name.replace(/[\\/:*?"<>|]+/g, '_');
            while (used[nm]) nm = nm.replace(/(\.[^.\/]*)?$/, function (x) { return '-' + r.key.slice(0, 4) + x; });
            used[nm] = 1; out.push({ name: root + 'files/' + nm, data: new Uint8Array(buf) }); index.push({ key: r.key, path: nm });
            if (onStep) onStep(++i, live.length);
          }, function () { index.push({ key: r.key, missing: true, name: r.name }); });
        });
      }, Promise.resolve()).then(function () { out.push({ name: root + 'files/_index.json', data: JSON.stringify(index, null, 2) }); return out; });
    });
  };
  // Importing a capsule: files whose list entries came in but whose bytes aren't here or on the server go back up
  F.restoreFrom = function (zipFiles, root) {
    var raw = zipFiles[root + 'files/_index.json']; if (!raw) return Promise.resolve(0);
    var idx; try { idx = JSON.parse(U.fromUtf8(raw)); } catch (e) { return Promise.resolve(0); }
    FS.recs = null;
    return F.records().then(function (list) {
      var n = 0;
      return idx.filter(function (x) { return x.path; }).reduce(function (pr, x) {
        return pr.then(function () {
          var r = list.filter(function (y) { return y.key === x.key && !y.locked; })[0], data = zipFiles[root + 'files/' + x.path];
          if (!r || !data) return;
          return F.bytes(r).then(function () {}, function () {
            var buf = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
            if (r.plain) return shelfPut(r.key, { data: buf, size: buf.byteLength }).then(function () { n++; });
            return encrypt(buf).then(function (en) { var c = Object.assign({}, r, { fk: en.fk, fiv: en.fiv, n: Math.max(1, Math.ceil(en.ct.byteLength / PIECE)) }); return shelfPut(r.key, { data: en.ct, pending: 1, size: en.ct.byteLength }).then(function () { return saveRec(r.key, c); }).then(function () { n++; }); });
          });
        });
      }, Promise.resolve()).then(function () { F.flush(); return n; });
    });
  };
  F.reset = function () { FS.recs = null; FS.sig = null; FS.used = null; };
  F.count = function () { var D = (app().S || {}).dfiles || {}; return Object.keys(D).filter(function (k) { return !D[k].removed; }).length; };
  window.addEventListener('online', function () { if (app() && app().S) F.flush(); });
})();
