/* AIU TOTEM - the butler's dictionary. Not shown to the user: the butler uses it to understand what you say.
   Pocket (offline): dict/pocket.txt - our own everyday word lists (kinds like pet, food, family, vehicle, feeling; words with the same
   meaning; irregular forms like went -> go) plus about 9,000 more words and their parts of speech from Webster's 1913 dictionary.
   Full (online): dict/full/<first two letters>.json - Webster's Revised Unabridged Dictionary (1913, public domain). When the butler meets
   a word it doesn't know, it reads the definition to work out what kind of thing it is, and keeps it on the device.
   Made by KODNA; Webster's 1913 is public domain. No license. */
(function () {
  'use strict';
  var D = AIU.dict = { ready: false, map: null, irr: null, learned: {}, onLearn: null };
  var loading = null, shards = {}, forms = null, missing = {};

  D.load = function (url) {
    if (D.ready) return Promise.resolve(D);
    if (loading) return loading;
    loading = fetch(url || 'dict/pocket.txt').then(function (r) { if (!r.ok) throw new Error('no dictionary'); return r.text(); }).then(function (txt) {
      D.parse(txt); return D;
    }).catch(function (e) { loading = null; throw e; });
    return loading;
  };
  D.parse = function (txt) {
    var map = Object.create(null), irr = Object.create(null), lines = txt.split('\n');
    for (var i = 0; i < lines.length; i++) {
      var L = lines[i];
      if (!L || L.charCodeAt(0) === 35) continue; // #
      var t = L.split('\t');
      if (L.charCodeAt(0) === 61) { irr[t[0].slice(1)] = t[1].split(',').map(function (x) { var j = x.lastIndexOf('.'); return [x.slice(0, j), x.slice(j + 1)]; }); continue; } // =
      map[t[0]] = { k: t[1] ? t[1].split(',') : [], c: t[2] || '', f: t[3] || '' };
    }
    D.map = map; D.irr = irr; D.ready = true;
  };
  D.setLearned = function (obj) { D.learned = obj || {}; };

  function entry(w) { return (D.map && D.map[w]) || D.learned[w] || null; }
  function hasPos(e, p) { if (!e) return false; for (var i = 0; i < e.k.length; i++) if (e.k[i].charAt(0) === p) return true; return false; }
  D.entry = entry;

  /* ---------- word forms: went -> go, puppies -> puppy, running -> run ---------- */
  var RULES = {
    n: [['s', ''], ['ses', 's'], ['xes', 'x'], ['zes', 'z'], ['ches', 'ch'], ['shes', 'sh'], ['men', 'man'], ['ies', 'y']],
    v: [['s', ''], ['ies', 'y'], ['es', 'e'], ['es', ''], ['ed', 'e'], ['ed', ''], ['ing', 'e'], ['ing', '']],
    a: [['er', ''], ['est', ''], ['er', 'e'], ['est', 'e']]
  };
  // Returns [{w: base, p: 'n'|'v'|'a'|'r', form: 'past'|'ing'|'plural'|...}] best first.
  D.bases = function (w, irrMap) {
    w = String(w || '').toLowerCase();
    var out = [], seen = {};
    function add(b, p, form) { var k = b + '.' + p; if (seen[k]) return; var e = entry(b); if (!e || (p && !hasPos(e, p))) return; seen[k] = 1; out.push({ w: b, p: p, form: form || '' }); }
    var ir = (irrMap || D.irr || {})[w];
    if (ir) ir.forEach(function (x) { add(x[0], x[1], x[1] === 'v' ? (/(ing)$/.test(w) ? 'ing' : 'past') : x[1] === 'n' ? 'plural' : 'more'); });
    var e = entry(w);
    if (e) e.k.forEach(function (k) { add(w, k.charAt(0), ''); });
    ['n', 'v', 'a'].forEach(function (p) {
      RULES[p].forEach(function (r) {
        if (w.length <= r[0].length + 1 || w.slice(-r[0].length) !== r[0]) return;
        var b = w.slice(0, w.length - r[0].length) + r[1], form = p === 'n' ? 'plural' : r[0] === 'ing' ? 'ing' : r[0] === 'ed' ? 'past' : r[0] === 's' || r[0] === 'es' || r[0] === 'ies' ? 's' : 'more';
        add(b, p, form);
        if ((r[0] === 'ed' || r[0] === 'ing' || r[0] === 'er' || r[0] === 'est') && b.length > 2 && b.charAt(b.length - 1) === b.charAt(b.length - 2)) add(b.slice(0, -1), p, form);
      });
    });
    return out;
  };

  /* ---------- reading a sentence ---------- */
  var CONTRACT = { "n't": ' not', "'re": ' are', "'m": ' am', "'ll": ' will', "'ve": ' have', "'d": ' would' };
  var FUNC = {};
  ('a an the and or but nor so yet if then than because though although while as of to in on at for with from by into onto about over under ' +
   'up down out off i me my mine myself you your yours yourself he him his she her hers it its itself we us our ours they them their theirs ' +
   'this that these those there here what which who whom whose when where why how not no yes is am are was were be been being do does did ' +
   'have has had will would shall should can could may might must just also very too really so such some any all each every both either ' +
   'neither ok okay oh um uh hey hi hello lol im ive dont cant wont didnt doesnt isnt wasnt gonna wanna gotta ya yeah yep nope nah').split(' ').forEach(function (w) { FUNC[w] = 1; });
  D.FUNC = FUNC;
  D.words = function (text) {
    var s = String(text || '').replace(/[’‘]/g, "'").replace(/\b(\w+)(n't|'re|'m|'ll|'ve|'d)\b/gi, function (m, a, b) { return (lc(a) === 'ca' ? 'can' : lc(a) === 'wo' ? 'will' : a) + CONTRACT[lc(b)]; });
    return s.match(/[A-Za-z][A-Za-z'-]*|\d+(?::\d+)?|[.!?]/g) || [];
  };
  function lc(s) { return String(s).toLowerCase(); }
  // Tokens with what the dictionary knows: [{raw, w, base, p, form, kinds, c, known, proper, fn, start}]
  D.read = function (text) {
    var ws = D.words(text), out = [], start = true, prev = '';
    for (var i = 0; i < ws.length; i++) {
      var raw = ws[i];
      if (/^[.!?]$/.test(raw)) { start = true; continue; }
      var w = lc(raw).replace(/'s$/, '').replace(/^'+|'+$/g, '');
      // two-word phrases first ("ice cream", "video game")
      if (i + 1 < ws.length && /^[A-Za-z]/.test(ws[i + 1]) && !FUNC[w]) {
        var w2 = lc(ws[i + 1]), two = w + ' ' + w2, twoS = w + ' ' + w2.replace(/s$/, '');
        var key = entry(two) ? two : (w2.length > 3 && entry(twoS) ? twoS : null);
        if (key) { out.push(tok(raw + ' ' + ws[i + 1], key, entry(key), start)); i++; start = false; continue; }
      }
      var t = { raw: raw, w: w, base: w, p: '', form: '', kinds: [], c: '', known: false, proper: false, fn: !!FUNC[w], start: start, num: /^\d/.test(w) };
      if (!t.fn && !t.num) {
        var b = D.bases(w);
        // "I finished the shed" -> the verb finish (past); "I am finished" / "I feel tired" -> the describing word
        if (b.length > 1 && /(ed|ing)$/.test(w) && !ADJCTX[prev]) {
          var vb = b.filter(function (x) { return x.p === 'v' && (x.form === 'past' || x.form === 'ing'); })[0];
          if (vb) b = [vb].concat(b.filter(function (x) { return x !== vb; }));
        }
        if (b.length) {
          var e = entry(b[0].w);
          t.base = b[0].w; t.p = b[0].p; t.form = b[0].form; t.kinds = e.k; t.c = e.c; t.known = true; t.proper = !!e.f;
          t.alts = b;
        }
      }
      out.push(t); start = false; prev = w;
    }
    return out;
  };
  var ADJCTX = {};
  'am is are was were be been being feel feels feeling felt so very really too get got getting look looks seem seems kinda pretty super a the'.split(' ').forEach(function (w) { ADJCTX[w] = 1; });
  function tok(raw, w, e, start) { return { raw: raw, w: w, base: w, p: e.k[0] ? e.k[0].charAt(0) : 'n', form: '', kinds: e.k, c: e.c, known: true, proper: !!e.f, fn: false, start: start, phrase: true }; }

  // The first noun kind of a word ("hamster" -> "pet", "Toyota" -> null), trying its base forms.
  D.nounKind = function (word) {
    var b = D.bases(String(word || '').toLowerCase()).filter(function (x) { return x.p === 'n'; })[0];
    var e = b ? entry(b.w) : entry(String(word || '').toLowerCase());
    if (!e) return null;
    for (var i = 0; i < e.k.length; i++) if (e.k[i].charAt(0) === 'n') return e.k[i].slice(2);
    return null;
  };
  D.kindsOf = function (word) { var e = entry(String(word || '').toLowerCase()); return e ? e.k.slice() : []; };
  D.isProperPlace = function (word) { var e = entry(String(word || '').toLowerCase()); return !!(e && e.f && /^n\.(city|country|region|place)$/.test(e.k[0] || '')); };
  // Is this a normal word (not a name the butler should ask about)?
  D.isCommonWord = function (word) {
    var w = String(word || '').toLowerCase();
    if (FUNC[w]) return true;
    var b = D.bases(w);
    return b.length > 0 && !entry(b[0].w).f;
  };

  /* ---------- the full dictionary (online), for words the pocket one doesn't know ---------- */
  function shardKey(w) { var k = w.replace(/[^a-z0-9]/g, '').slice(0, 2); return k.length === 2 ? k : k ? k + '_' : '__'; }
  function getShard(k, base) {
    if (shards[k]) return shards[k];
    var keys = Object.keys(shards); if (keys.length > 12) delete shards[keys[0]];
    return (shards[k] = fetch((base || 'dict/full/') + k + '.json').then(function (r) { if (!r.ok) throw new Error('missing'); return r.json(); }).catch(function (e) { delete shards[k]; throw e; }));
  }
  function getForms(base) {
    if (forms) return forms;
    return (forms = fetch((base || 'dict/full/') + '_forms.json').then(function (r) { return r.json(); }).then(function (j) {
      var m = {}; Object.keys(j).forEach(function (w) { m[w] = j[w].map(function (x) { var i = x.lastIndexOf('.'); return [x.slice(0, i), x.slice(i + 1)]; }); }); return m;
    }).catch(function () { forms = null; return {}; }));
  }
  // Look a word up online. Resolves {w, base, senses:[[pos, kind, gloss, synonyms, concept, example?]], form} or null.
  D.lookup = function (word, base) {
    var w = String(word || '').toLowerCase().trim();
    if (!w || missing[w]) return Promise.resolve(null);
    return getForms(base).then(function (fm) {
      var tries = [w];
      (fm[w] || []).forEach(function (x) { tries.push(x[0]); });
      ['n', 'v', 'a'].forEach(function (p) { RULES[p].forEach(function (r) { if (w.length > r[0].length + 1 && w.slice(-r[0].length) === r[0]) { var b = w.slice(0, w.length - r[0].length) + r[1]; tries.push(b); if (b.length > 2 && b.charAt(b.length - 1) === b.charAt(b.length - 2)) tries.push(b.slice(0, -1)); } }); });
      tries = tries.filter(function (x, i) { return tries.indexOf(x) === i; });
      var i = 0;
      function next() {
        if (i >= tries.length) { missing[w] = 1; return null; }
        var t = tries[i++];
        return getShard(shardKey(t), base).then(function (sh) {
          var e = sh[t];
          if (!e) return next();
          var res = { w: w, base: t, senses: e.s, form: e.f || '' };
          D.remember(t, res);
          return res;
        }, function () { return next(); });
      }
      return next();
    });
  };
  // Keep what we looked up (kinds + concept + one short meaning) so it works offline next time.
  D.remember = function (w, res) {
    var kinds = [];
    res.senses.forEach(function (s) { var k = s[0] + '.' + s[1]; if (kinds.indexOf(k) < 0 && kinds.length < 2) kinds.push(k); });
    D.learned[w] = { k: kinds, c: res.senses[0] ? res.senses[0][4] : '', f: res.form || '', g: res.senses[0] ? res.senses[0][2] : '' };
    var keys = Object.keys(D.learned); if (keys.length > 3000) delete D.learned[keys[0]];
    if (D.onLearn) D.onLearn(D.learned);
  };
  // Words in a message the butler doesn't know yet (not names, not numbers).
  D.unknown = function (text) {
    if (!D.ready) return [];
    return D.read(text).filter(function (t) { return !t.known && !t.fn && !t.num && !t.phrase && t.w.length >= 3 && /^[a-z]+$/.test(t.w) && !(/^[A-Z]/.test(t.raw) && !t.start); })
      .map(function (t) { return t.w; }).filter(function (w, i, a) { return a.indexOf(w) === i && !missing[w]; });
  };
})();
