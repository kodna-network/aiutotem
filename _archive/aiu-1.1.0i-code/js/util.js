/* AIU TOTEM - small shared helpers (random seeds, dates, words, zip, DOM). */
var AIU = window.AIU || {};
window.AIU = AIU;

(function () {
  'use strict';
  var U = AIU.util = {};

  /* ---------- seeds and ids ---------- */
  U.hash32 = function (str) {
    var h = 2166136261 >>> 0;
    str = String(str);
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995) >>> 0; h ^= h >>> 15;
    return h >>> 0;
  };
  U.rng = function (seed) { // mulberry32
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  U.pick = function (r, arr) { return arr[Math.floor(r() * arr.length) % arr.length]; };
  U.id = function () {
    var b = new Uint8Array(15);
    (window.crypto || window.msCrypto).getRandomValues(b);
    var s = btoa(String.fromCharCode.apply(null, b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return s;
  };

  /* ---------- dates and the Totem's time zone ----------
     U.zone is an IANA time zone like 'America/New_York' (from the city in Settings), or null for the device clock.
     U.wall(ms) gives a Date whose getHours()/getDate()... read as the wall clock in that zone.
     U.dayStr / U.hmStr take a real moment (a Date or ms) and give the day / time in that zone. */
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  U.p2 = p2;
  U.zone = null;
  var zoneFmt = null, offCache = {};
  U.setZone = function (tz) {
    tz = tz || null;
    if (tz) { try { new Intl.DateTimeFormat('en-US', { timeZone: tz }).format(0); } catch (e) { tz = null; } }
    if (tz === U.zone) return false;
    U.zone = tz; offCache = {};
    zoneFmt = tz ? new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }) : null;
    return true;
  };
  function shiftFor(ms) { // how far the zone's wall clock is from the device's, at this moment (cached per minute)
    var k = Math.floor(ms / 60000);
    if (offCache[k] !== undefined) return offCache[k];
    var o = {}; zoneFmt.formatToParts(new Date(k * 60000)).forEach(function (x) { o[x.type] = x.value; });
    var local = new Date(+o.year, +o.month - 1, +o.day, +o.hour % 24, +o.minute, +o.second).getTime();
    var keys = Object.keys(offCache); if (keys.length > 200) offCache = {};
    return (offCache[k] = local - k * 60000);
  }
  U.wall = function (d) {
    var ms = d == null ? Date.now() : +d;
    return zoneFmt ? new Date(ms + shiftFor(ms)) : new Date(ms);
  };
  function ymd(d) { return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); }
  U.dayStr = function (d) { return ymd(U.wall(d)); };
  U.hmStr = function (d) { var w = U.wall(d); return p2(w.getHours()) + ':' + p2(w.getMinutes()); };
  U.minOfDay = function (d) { var w = U.wall(d); return w.getHours() * 60 + w.getMinutes() + w.getSeconds() / 60; };
  U.zoneLabel = function (tz) { tz = tz === undefined ? U.zone : tz; if (!tz) { try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) {} } return String(tz || 'device clock').replace(/_/g, ' '); };
  U.hmToMin = function (hm) { var m = /^(\d{1,2}):(\d{2})$/.exec(hm || ''); return m ? (+m[1]) * 60 + (+m[2]) : null; };
  U.minToHm = function (min) { min = ((Math.round(min) % 1440) + 1440) % 1440; return p2(Math.floor(min / 60)) + ':' + p2(min % 60); };
  U.fmtHm = function (hm, clock24) {
    var m = U.hmToMin(hm); if (m === null) return hm || '';
    var h = Math.floor(m / 60), mm = m % 60;
    if (clock24) return p2(h) + ':' + p2(mm);
    var ap = h < 12 ? 'am' : 'pm', h12 = h % 12 || 12;
    return h12 + (mm ? ':' + p2(mm) : '') + ap;
  };
  U.dayToDate = function (day) { var a = day.split('-'); return new Date(+a[0], +a[1] - 1, +a[2]); };
  U.addDays = function (day, n) { var d = U.dayToDate(day); d.setDate(d.getDate() + n); return ymd(d); };
  U.weekday = function (day) { return U.dayToDate(day).getDay(); }; // 0 = Sunday
  U.DAYNAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  U.MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  U.fmtDay = function (day) {
    var today = U.dayStr();
    if (day === today) return 'today';
    if (day === U.addDays(today, -1)) return 'yesterday';
    if (day === U.addDays(today, 1)) return 'tomorrow';
    var d = U.dayToDate(day);
    return U.DAYNAMES[d.getDay()].slice(0, 3) + ' ' + U.MONTHS[d.getMonth()] + ' ' + d.getDate();
  };
  U.ago = function (ms) {
    var s = Math.max(0, Math.round((Date.now() - ms) / 1000));
    if (s < 60) return 'just now';
    if (s < 3600) return Math.round(s / 60) + ' min ago';
    if (s < 86400) return Math.round(s / 3600) + ' h ago';
    return Math.round(s / 86400) + ' d ago';
  };

  /* ---------- words ---------- */
  var STOP = ('a an the and or but if then so of to in on at by for with from up down out over under about into onto off ' +
    'i me my mine myself you your yours yourself he him his she her hers it its we us our ours they them their theirs ' +
    'is am are was were be been being do does did done have has had having will would shall should can could may might must ' +
    'this that these those there here what which who whom whose when where why how all any both each few more most other some such ' +
    'no nor not only own same than too very just also still even again ever really quite pretty lot lots much many ' +
    'im ive id ill youre its thats dont didnt doesnt cant wont isnt arent wasnt werent gonna wanna gotta ' +
    'yes yeah yep ok okay oh ah um uh hmm like well ' +
    'get got go went going come came make made take took say said tell told know knew think thought want need let ' +
    'one two three thing things stuff something anything nothing everything someone anyone today tomorrow yesterday now later soon').split(' ');
  var COMMON = ('time day days week weeks month year years morning afternoon evening night tonight minute minutes hour hours ' +
    'good bad great nice fine cool fun happy sad tired busy free late early new old big small little long short best better worse ' +
    'work job home house room bed kitchen car store shop school class friend friends family mom dad brother sister kid kids ' +
    'food breakfast lunch dinner supper snack coffee tea water eat ate drink drank sleep slept woke wake walk walked run ran ' +
    'play played watch watched read wrote write look looked see saw feel felt love liked like help helped try tried start ' +
    'started finish finished work worked call called talk talked text back first last next every always never sometimes maybe ' +
    'people person man woman guy thanks thank please sorry hello hi hey bye night weekend monday tuesday wednesday thursday ' +
    'friday saturday sunday january february march april june july august september october november december way place ' +
    'right left end part point bit kind sort idea plan plans project projects problem thing money phone game games movie show ' +
    'music song book books dog cat pet pets bird fish outside inside rain sun snow weather hot cold warm pretty around ' +
    'because though while since until after before during again enough almost already maybe probably actually tomorrow').split(' ');
  var W = AIU.words = { STOP: {}, COMMON: {} };

  W.singular = function (w) {
    if (w.length > 4 && /ies$/.test(w)) return w.slice(0, -3) + 'y';
    if (/(ss|us|is|ous)$/.test(w)) return w;
    if (w.length > 4 && /(ches|shes|xes|sses|zes)$/.test(w)) return w.slice(0, -2);
    if (w.length > 3 && /s$/.test(w)) return w.slice(0, -1);
    return w;
  };
  var KEEP = {};
  ('need seed speed feed bleed breed red bed shed wed sled sped hundred bred shred proud ' +
   'thing king ring sing bring spring string wing swing sting ceiling morning evening nothing something anything everything ' +
   'wedding pudding during ping bling').split(' ').forEach(function (w) { KEEP[w] = 1; });
  W.lemma = function (w) { // fixed -> fix, getting -> get (rough, but the same on every device)
    if (KEEP[w]) return w;
    var b;
    if (w.length > 4 && /e$/.test(w) && !/(ee|ie|ye)$/.test(w)) return w.slice(0, -1); // update / updated / updating -> updat
    if (w.length > 5 && /ing$/.test(w)) b = w.slice(0, -3);
    else if (w.length > 4 && /ied$/.test(w)) return w.slice(0, -3) + 'y';
    else if (w.length > 4 && /ed$/.test(w)) b = w.slice(0, -2);
    else return w;
    if (/([bdgklmnprt])\1$/.test(b)) b = b.slice(0, -1);
    return b.length > 3 ? b.replace(/e$/, '') : b;
  };
  W.norm = function (raw) {
    var w = String(raw).toLowerCase().replace(/[’']s$/, '').replace(/[^a-z0-9\-]/g, '');
    return W.lemma(W.singular(w));
  };
  STOP.forEach(function (w) { W.STOP[w] = 1; W.STOP[W.norm(w)] = 1; });
  COMMON.forEach(function (w) { W.COMMON[w] = 1; W.COMMON[W.norm(w)] = 1; });
  // Returns [{raw, norm, cap, first}] for words that carry meaning (stopwords removed).
  W.tokens = function (text, keepStop) {
    var out = [], parts = String(text || '').split(/[^A-Za-z0-9'’\-]+/), first = true;
    var sentenceStart = true, raw;
    var seq = String(text || '').match(/[A-Za-z0-9'’\-]+|[.!?]+/g) || [];
    for (var i = 0; i < seq.length; i++) {
      raw = seq[i];
      if (/^[.!?]+$/.test(raw)) { sentenceStart = true; continue; }
      var n = W.norm(raw);
      var wasStart = sentenceStart;
      sentenceStart = false;
      if (!n || n.length < 2 || /^\d+$/.test(n)) continue;
      if (!keepStop && W.STOP[n.replace(/-/g, '')]) continue;
      out.push({ raw: raw.replace(/[’']s$/, ''), norm: n, cap: /^[A-Z][a-z]/.test(raw), first: wasStart });
    }
    return out;
  };
  W.lev = function (a, b) { // small edit distance
    if (Math.abs(a.length - b.length) > 2) return 9;
    var prev = [], cur, i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur = [i];
      for (j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[b.length];
  };
  W.cap = function (s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); };
  W.clean = function (s) { return String(s || '').replace(/\s+/g, ' ').trim(); };

  /* ---------- zip (store-only writer, store/deflate reader) ---------- */
  var CRC = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
  })();
  U.crc32 = function (u8) { var c = 0xFFFFFFFF; for (var i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  U.utf8 = function (s) { return new TextEncoder().encode(s); };
  U.fromUtf8 = function (u8) { return new TextDecoder().decode(u8); };

  U.makeZip = function (files) {
    var now = new Date();
    var dtime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
    var ddate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    var parts = [], central = [], offset = 0;
    files.forEach(function (f) {
      var name = U.utf8(f.name), data = typeof f.data === 'string' ? U.utf8(f.data) : f.data, crc = U.crc32(data);
      var lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
      lh.setUint16(10, dtime, true); lh.setUint16(12, ddate, true); lh.setUint32(14, crc, true);
      lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
      parts.push(new Uint8Array(lh.buffer), name, data);
      var ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true);
      ch.setUint16(10, 0, true); ch.setUint16(12, dtime, true); ch.setUint16(14, ddate, true); ch.setUint32(16, crc, true);
      ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, name.length, true);
      ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), name);
      offset += 30 + name.length + data.length;
    });
    var cdSize = central.reduce(function (s, p) { return s + p.length; }, 0);
    var end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
    return new Blob(parts.concat(central, [new Uint8Array(end.buffer)]), { type: 'application/zip' });
  };

  U.readZip = function (buf) {
    var u8 = new Uint8Array(buf), dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength), eocd = -1;
    for (var i = u8.length - 22; i >= Math.max(0, u8.length - 70000); i--) { if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; } }
    if (eocd < 0) return Promise.reject(new Error('Not a zip file'));
    var count = dv.getUint16(eocd + 10, true), p = dv.getUint32(eocd + 16, true), jobs = [], out = {};
    for (var n = 0; n < count; n++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      var method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
      var nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true);
      var loff = dv.getUint32(p + 42, true), name = U.fromUtf8(u8.subarray(p + 46, p + 46 + nlen));
      var start = loff + 30 + dv.getUint16(loff + 26, true) + dv.getUint16(loff + 28, true);
      var data = u8.subarray(start, start + csize);
      if (method === 0) out[name] = data;
      else if (method === 8 && window.DecompressionStream) {
        jobs.push((function (nm, d) {
          var ds = new Blob([d]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
          return new Response(ds).arrayBuffer().then(function (ab) { out[nm] = new Uint8Array(ab); });
        })(name, data));
      }
      p += 46 + nlen + xlen + clen;
    }
    return Promise.all(jobs).then(function () { return out; });
  };

  /* ---------- DOM ---------- */
  U.h = function (tag, props) {
    var el = document.createElement(tag);
    if (props) Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'text') el.textContent = v;
      else if (k === 'cls') el.className = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (k === 'style') el.setAttribute('style', v);
      else if (k in el && k !== 'list' && k !== 'type') el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c === null || c === undefined || c === false) continue;
      (function add(x) { // children can be nested lists
        if (x === null || x === undefined || x === false) return;
        if (Array.isArray(x)) { x.forEach(add); return; }
        el.appendChild(typeof x === 'string' ? document.createTextNode(x) : x);
      })(c);
    }
    return el;
  };
  U.$ = function (sel, root) { return (root || document).querySelector(sel); };
  U.download = function (blob, name) {
    // inside a claude.ai demo page, files are offered through the viewer's own save prompt
    if (window.claude && typeof window.claude.use === 'function') {
      window.claude.use('downloads').then(function (d) { if (d) return d.save({ filename: name, data: blob }); throw new Error('no downloads'); }).catch(function (e) { if (!e || e.code !== 'declined') plain(); });
      return;
    }
    plain();
    function plain() {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
    }
  };
})();
