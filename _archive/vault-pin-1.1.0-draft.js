/* AIU TOTEM - Accounts: a phone book of your accounts, locked with a 4-digit PIN.
   Each card is scrambled (AES-GCM) with a key made from your PIN (PBKDF2, many rounds) before it is saved or synced,
   so the server and the capsule only ever hold scrambled cards. Honest limits: a 4-digit PIN has 10,000 combinations,
   so this keeps cards private from people using your device or reading the server, not from a determined attacker
   who copies the data. If you forget the PIN, the cards can't be opened (export a PDF copy and keep it somewhere safe). */
(function () {
  'use strict';
  var V = AIU.vault = {};
  var ROUNDS = 250000, CHECK = 'aiu-vault-ok';
  V.supported = !!(window.crypto && crypto.subtle && window.TextEncoder);
  V.CATS = ['Email', 'Games', 'Bills', 'Bank & money', 'Shopping', 'Social', 'Work', 'Contacts', 'Other'];
  V.FIELDS = [['user', 'Username'], ['pass', 'Password'], ['email', 'Email'], ['site', 'Website'], ['phone', 'Phone'], ['acct', 'Account number'], ['pinq', 'Security questions / PIN hints']];

  function b64(buf) { var s = '', u = new Uint8Array(buf); for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); }
  function unb64(s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  function rand(n) { var u = new Uint8Array(n); crypto.getRandomValues(u); return u; }
  function derive(pin, salt) {
    return crypto.subtle.importKey('raw', new TextEncoder().encode('aiu:' + pin), 'PBKDF2', false, ['deriveKey']).then(function (base) {
      return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: ROUNDS, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    });
  }
  function seal(key, text) {
    var iv = rand(12);
    return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, new TextEncoder().encode(text)).then(function (ct) { return { iv: b64(iv), ct: b64(ct) }; });
  }
  function open(key, iv, ct) {
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, key, unb64(ct)).then(function (pt) { return new TextDecoder().decode(pt); });
  }
  V.validPin = function (pin) { return /^\d{4}$/.test(String(pin || '')); };
  // First time: make the lock (salt + a check value). Saved as the Totem setting "vaultLock" so every device shares it.
  V.makeLock = function (pin, gen) {
    var salt = rand(16);
    return derive(pin, salt).then(function (key) {
      return seal(key, CHECK).then(function (chk) { return { lock: { salt: b64(salt), iv: chk.iv, ct: chk.ct, gen: gen || 1, rounds: ROUNDS }, key: key }; });
    });
  };
  // Unlock: resolves to the key, or rejects when the PIN is wrong.
  V.unlock = function (pin, lock) {
    if (!lock || !lock.salt) return Promise.reject(new Error('No PIN set yet.'));
    return derive(pin, unb64(lock.salt)).then(function (key) {
      return open(key, lock.iv, lock.ct).then(function (t) { if (t !== CHECK) throw new Error('Wrong PIN'); return key; }, function () { throw new Error('Wrong PIN'); });
    });
  };
  V.sealCard = function (key, card) { return seal(key, JSON.stringify(card)); };
  V.openCard = function (key, rec) { return open(key, rec.iv, rec.ct).then(function (t) { return JSON.parse(t); }); };
  // Open every card. Cards locked with another PIN (changed on a device that hasn't synced yet) come back as {locked: true}.
  V.openAll = function (key, S) {
    var VA = S.vault || {};
    return Promise.all(Object.keys(VA).filter(function (k) { return !VA[k].removed && VA[k].ct; }).map(function (k) {
      return V.openCard(key, VA[k]).then(function (c) { c.key = k; c.t = VA[k].t; c.dn = VA[k].dn; return c; }, function () { return { key: k, locked: true, name: '(locked with a different PIN)', t: VA[k].t }; });
    })).then(function (cards) { return cards.sort(function (a, b) { return String(a.name || '').toLowerCase() < String(b.name || '').toLowerCase() ? -1 : 1; }); });
  };
})();
