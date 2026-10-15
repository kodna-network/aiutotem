/* AIU TOTEM 1.1.0 - scrambling account cards with your Aiu password (no extra PIN).
   When you log in, the device makes a key from your Aiu password (PBKDF2) and keeps that key on the device.
   Cards are scrambled (AES-GCM) with it before they are saved or synced, so the server only ever stores scrambled
   cards and can't read them. A device-only Totem (no account, nothing leaves the device) keeps cards as they are.
   The setting "vaultLock" holds the salt and a check value (never the password or the key). */
(function () {
  'use strict';
  var V = AIU.vault = {};
  var ROUNDS = 200000, CHECK = 'aiu-vault-ok';
  V.supported = !!(window.crypto && crypto.subtle && window.TextEncoder);
  function b64(buf) { var s = '', u = new Uint8Array(buf); for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); }
  function unb64(s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  function rand(n) { var u = new Uint8Array(n); crypto.getRandomValues(u); return u; }
  function derive(pw, salt, rounds) {
    return crypto.subtle.importKey('raw', new TextEncoder().encode('aiu-vault:' + pw), 'PBKDF2', false, ['deriveKey']).then(function (base) {
      return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: rounds || ROUNDS, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    });
  }
  function seal(key, text) {
    var iv = rand(12);
    return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, new TextEncoder().encode(text)).then(function (ct) { return { iv: b64(iv), ct: b64(ct) }; });
  }
  function open(key, iv, ct) { return crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, key, unb64(ct)).then(function (pt) { return new TextDecoder().decode(pt); }); }
  // A new lock from a password -> {lock, key}
  V.makeLock = function (pw, gen) {
    var salt = rand(16);
    return derive(pw, salt).then(function (key) { return seal(key, CHECK).then(function (c) { return { lock: { salt: b64(salt), iv: c.iv, ct: c.ct, gen: gen || 1, rounds: ROUNDS }, key: key }; }); });
  };
  // Does this key open this lock?
  V.fits = function (key, lock) { if (!key || !lock) return Promise.resolve(false); return open(key, lock.iv, lock.ct).then(function (t) { return t === CHECK; }, function () { return false; }); };
  // The key for a password (rejects if it doesn't open the lock)
  V.keyFor = function (pw, lock) {
    return derive(pw, unb64(lock.salt), lock.rounds).then(function (key) { return V.fits(key, lock).then(function (ok) { if (!ok) throw new Error('That password doesn\'t open your account cards.'); return key; }); });
  };
  V.exportKey = function (key) { return crypto.subtle.exportKey('raw', key).then(b64); };
  V.importKey = function (s) { return crypto.subtle.importKey('raw', unb64(s), { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']); };
  V.sealCard = function (key, card) { return seal(key, JSON.stringify(card)); };
  /* 2.8.0: the account's data key. One random AES-GCM key per account scrambles everything a synced Totem sends (each
     event's contents, profile names, the Totem summary), so the server only stores "x1:..." text it can't read. The key is
     kept on the server only locked with your password ({ salt, rounds, iv, ct }, PBKDF2 like the cards, its own prefix),
     and on your devices as raw bytes in the profile. A new password locks the same key again: old events stay readable. */
  V.newDataKey = function () { return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']); };
  function deriveData(pw, salt, rounds) {
    return crypto.subtle.importKey('raw', new TextEncoder().encode('aiu-data:' + pw), 'PBKDF2', false, ['deriveKey']).then(function (base) {
      return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: rounds, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    });
  }
  V.lockDataKey = function (pw, key) { // -> { salt, rounds, iv, ct }
    var salt = rand(16), iv = rand(12);
    return Promise.all([deriveData(pw, salt, ROUNDS), crypto.subtle.exportKey('raw', key)]).then(function (r) {
      return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, r[0], r[1]).then(function (ct) { return { salt: b64(salt), rounds: ROUNDS, iv: b64(iv), ct: b64(ct) }; });
    });
  };
  V.openDataKey = function (pw, rec) { // rejects when the password doesn't open it
    return deriveData(pw, unb64(rec.salt), rec.rounds).then(function (kek) { return crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(rec.iv) }, kek, unb64(rec.ct)); })
      .then(function (raw) { return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']); }, function () { throw new Error('That password doesn\'t open this account\'s data.'); });
  };
  // text <-> "x1:" + base64(iv + scrambled). aad ties it to its place (an event's id), so it can't be moved to another event.
  V.sealText = function (key, text, aad) {
    var iv = rand(12), o = { name: 'AES-GCM', iv: iv }; if (aad) o.additionalData = new TextEncoder().encode(aad);
    return crypto.subtle.encrypt(o, key, new TextEncoder().encode(text)).then(function (ct) { var c = new Uint8Array(ct), all = new Uint8Array(12 + c.length); all.set(iv, 0); all.set(c, 12); return 'x1:' + b64(all); });
  };
  V.openText = function (key, s, aad) {
    var all = unb64(String(s).slice(3)), o = { name: 'AES-GCM', iv: all.slice(0, 12) }; if (aad) o.additionalData = new TextEncoder().encode(aad);
    return crypto.subtle.decrypt(o, key, all.slice(12)).then(function (pt) { return new TextDecoder().decode(pt); });
  };
  V.isSealed = function (s) { return typeof s === 'string' && s.slice(0, 3) === 'x1:'; };
  V.openCard = function (key, rec) { return open(key, rec.iv, rec.ct).then(function (t) { return JSON.parse(t); }); };
})();
