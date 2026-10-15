/* AIU TOTEM - the offline mind. No language model: rules, a word matrix (lexicon) and memory search.
   It turns what you say into events (reminders, lists, pets, memories) and short replies. */
(function () {
  'use strict';
  var U = AIU.util, Wd = AIU.words, C = AIU.core;
  var D = AIU.dict, B = AIU.butler; // the butler's pocket dictionary and its tiny learning model (21 Questions)
  var T = AIU.topics, P = AIU.persona, I = AIU.iching; // topic pages, personality, the daily I Ching reading
  var M = AIU.mind = {};

  /* ---------- small helpers ---------- */
  function lc(s) { return String(s || '').toLowerCase(); }
  function has(re, s) { return re.test(s); }
  function slug(s) { return lc(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'task'; }
  function choose(seedText, arr) { return arr[U.hash32(seedText + arr.length) % arr.length]; }
  function listJoin(a) { return a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
  function hm(ctx, min) { return U.fmtHm(U.minToHm(min), ctx.clock24); }
  function you(s) { // "my teeth" -> "your teeth"
    return String(s).replace(/\bmy\b/gi, 'your').replace(/\bI\b/g, 'you').replace(/\bme\b/gi, 'you').replace(/\bmyself\b/gi, 'yourself');
  }
  M.slug = slug;
  // One-time reminders are keyed by day, so "feed the cat in 1 minute" never replaces the daily routine.
  function keyFor(base, d) { return d.repeat === 'once' && d.date ? base + '@' + d.date : base; }
  M.keyFor = keyFor;

  var NUMWORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, forty: 40, 'forty-five': 45, sixty: 60 };
  function wordNums(s) { return s.replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty-five|forty|sixty)\b/gi, function (w) { return NUMWORDS[lc(w)]; }); }

  /* ---------- time words ---------- */
  // Returns minutes after midnight, or null. preferAM: bare numbers like "at 6" mean morning.
  M.parseTime = function (text, preferAM, nowMin) {
    var s = wordNums(lc(text)), m;
    if (/\bnoon\b|\bmidday\b/.test(s)) return 720;
    if (/\bmidnight\b/.test(s)) return 0;
    m = /\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?|am|pm)(?![a-z])/.exec(s);
    if (m) { var h = (+m[1]) % 12; if (m[3].charAt(0) === 'p') h += 12; return h * 60 + (+(m[2] || 0)); }
    m = /\b(\d{1,2}):(\d{2})\b/.exec(s);
    var evening = /\b(tonight|evening|night|afternoon|pm)\b/.test(s), morning = /\b(morning|am|wake|breakfast)\b/.test(s);
    if (m) { var hh = +m[1]; if (hh < 12 && evening) hh += 12; if (hh <= 23) return hh * 60 + (+m[2]); }
    m = /\b(?:at|@|by|around|for)\s+(\d{1,2})(?:\s*o'?clock)?\b(?!\s*(?:min|hour|day|week|%))/.exec(s) || /^(\d{1,2})(?:\s*o'?clock)?$/.exec(s.trim());
    if (m) {
      var h2 = +m[1];
      if (h2 > 23) return null;
      if (h2 <= 12) {
        if (evening && h2 < 12) h2 += 12;
        else if (h2 === 12 && morning) h2 = 0;
        else if (!morning && !preferAM && h2 >= 1 && h2 < 12) {
          // "at 7" means the next 7 o'clock coming up
          if (nowMin !== undefined && nowMin !== null) { if (h2 * 60 <= nowMin && (h2 + 12) * 60 > nowMin) h2 += 12; }
          else if (h2 <= 6) h2 += 12;
        }
      }
      return h2 * 60;
    }
    return null;
  };
  M.parseDuration = function (text) {
    var s = wordNums(lc(text)), m;
    if (/half (an )?hour/.test(s)) return 30;
    if (/quarter( of an)? hour/.test(s)) return 15;
    m = /(\d+)\s*[- ]?\s*(minutes?|mins?|m)\b/.exec(s); if (m) return +m[1];
    m = /(\d+(?:\.\d)?)\s*[- ]?\s*(hours?|hrs?|h)\b/.exec(s); if (m) return Math.round(+m[1] * 60);
    return null;
  };
  var DAYRE = /\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)s?\b/;
  function parseRepeat(s) {
    s = lc(s);
    if (/\b(every ?day|daily|each day|every (morning|night|evening|afternoon))\b/.test(s)) return { repeat: 'daily' };
    if (/\b(weekdays|every weekday|monday (to|through|-) friday)\b/.test(s)) return { repeat: 'weekdays' };
    if (/\b(weekends|every weekend)\b/.test(s)) return { repeat: 'weekends' };
    var m = /\bevery\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/.exec(s);
    if (m) return { repeat: 'days', days: [U.DAYNAMES.map(lc).indexOf(m[1])] };
    return null;
  }
  function parseDay(s, today) {
    s = lc(s);
    if (/\btomorrow\b/.test(s)) return U.addDays(today, 1);
    if (/\b(today|tonight|this (morning|afternoon|evening))\b/.test(s)) return today;
    var m = DAYRE.exec(s);
    if (m) { var want = U.DAYNAMES.map(lc).indexOf(m[1]), wd = U.weekday(today), diff = (want - wd + 7) % 7 || 7; return U.addDays(today, diff); }
    return null;
  }
  function stripTimeWords(s) {
    return s.replace(/\b(at|@|by|around)\s+\d{1,2}(:\d{2})?\s*(a\.?m\.?|p\.?m\.?|am|pm|o'?clock)?/gi, ' ')
      .replace(/\b\d{1,2}(:\d{2})?\s*(a\.?m\.?|p\.?m\.?|am|pm)\b/gi, ' ')
      .replace(/\bin\s+(\d+|an?|half an)\s*[- ]?(minutes?|mins?|hours?|hrs?|hour)\b/gi, ' ')
      .replace(/\b(every ?day|daily|each day|every (morning|night|evening|afternoon|weekday|weekend)|on weekdays|weekdays|weekends|every (sun|mon|tues|wednes|thurs|fri|satur)day)\b/gi, ' ')
      .replace(/\b(today|tomorrow|tonight|this (morning|afternoon|evening)|on (sun|mon|tues|wednes|thurs|fri|satur)day)\b/gi, ' ')
      .replace(/\b(noon|midnight)\b/gi, ' ').replace(/\s+/g, ' ').replace(/^[\s,.]+|[\s,.!?]+$/g, '');
  }

  /* ---------- verbs for "I woke up, brushed my teeth, fed the cat" ---------- */
  var IRREG = { woke: 'wake', got: 'get', ate: 'eat', fed: 'feed', went: 'go', took: 'take', made: 'make', drank: 'drink', ran: 'run',
    did: 'do', had: 'have', wrote: 'write', drove: 'drive', brought: 'bring', bought: 'buy', gave: 'give', left: 'leave', sat: 'sit',
    slept: 'sleep', swam: 'swim', threw: 'throw', read: 'read', put: 'put', made_: 'make', rode: 'ride', saw: 'see', spent: 'spend',
    began: 'begin', built: 'build', caught: 'catch', taught: 'teach', found: 'find', made2: 'make', meditated: 'meditate', shaved: 'shave',
    prayed: 'pray', studied: 'study', tidied: 'tidy', packed: 'pack', stretched: 'stretch', dressed: 'dress', practiced: 'practice',
    practised: 'practise', exercised: 'exercise', prepared: 'prepare', changed: 'change', used: 'use', danced: 'dance', baked: 'bake',
    cleaned: 'clean', showered: 'shower', washed: 'wash', brushed: 'brush', walked: 'walk', watered: 'water', cooked: 'cook',
    checked: 'check', fixed: 'fix', called: 'call', texted: 'text', emailed: 'email', jogged: 'jog', stopped: 'stop', planned: 'plan',
    mopped: 'mop', grabbed: 'grab', hugged: 'hug', journaled: 'journal', vacuumed: 'vacuum', flossed: 'floss', fed_: 'feed', made3: 'make' };
  var BASEV = ('wake get eat feed go take make drink run do have write drive bring buy give leave sit sleep swim read put ride see ' +
    'brush floss shower wash walk water cook clean check fix call text email jog stretch meditate shave pray study tidy pack dress ' +
    'practice exercise prepare change use dance bake mop grab hug journal vacuum make feed let pick drop start finish open set ' +
    'play work lift pet empty load unload fold iron sweep dust scoop wipe charge answer reply send post watch listen learn plan').split(' ');
  var BASESET = {}; BASEV.forEach(function (v) { BASESET[v] = 1; });
  function baseVerb(w) {
    w = lc(w);
    if (IRREG[w]) return IRREG[w];
    if (BASESET[w]) return w;
    if (/ing$/.test(w) && w.length > 5) { var b = w.slice(0, -3); if (BASESET[b]) return b; if (BASESET[b + 'e']) return b + 'e'; if (/(.)\1$/.test(b) && BASESET[b.slice(0, -1)]) return b.slice(0, -1); }
    if (/ed$/.test(w) && w.length > 4) {
      var s = w.slice(0, -2);
      if (/ied$/.test(w)) s = w.slice(0, -3) + 'y';
      if (BASESET[s]) return s;
      if (BASESET[s + 'e']) return s + 'e';
      if (/(.)\1$/.test(s) && !/(ll|ss)$/.test(s)) return s.slice(0, -1);
      return s;
    }
    return null;
  }
  // Split a "what I did" message into activities. Returns [{title, said, min}] or null.
  M.parseReport = function (text) {
    var s = String(text).replace(/^(well|so|ok|okay|yeah|yes|no|um|uh|this morning|today)[,\s]+/i, '').replace(/[.!]+$/, '');
    var parts = s.split(/\s*(?:,|;|\bthen\b|\band then\b|\band\b|\bafter that\b|\bplus\b)\s*/i).map(function (p) { return p.trim(); }).filter(Boolean);
    if (parts.length < 2) return null;
    var out = [], lastMin = null;
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i].replace(/^(i|we|and|then|also|just|already|first|finally|after|lastly)\s+/i, '').replace(/^(i|we)\s+/i, '');
      p = p.replace(/^(have|had|got to|went to|went and)\s+(?=[a-z]+ed\b)/i, '');
      var words = p.split(/\s+/), v = baseVerb(words[0] || '');
      if (!v) continue;
      var rest = words.slice(1).join(' ');
      var min = M.parseTime(rest, true);
      rest = stripTimeWords(rest).replace(/^(up)\b/i, 'up');
      var obj = rest.replace(/\bmy\b\s*/gi, '').trim();
      var title = Wd.cap((v + ' ' + obj).trim());
      if (title.length > 48) continue;
      if (min !== null) lastMin = min;
      out.push({ title: title, said: you(p), min: min });
    }
    return out.length >= 2 ? out : null;
  };

  var PETS = ['dog', 'cat', 'kitten', 'puppy', 'bird', 'parrot', 'fish', 'hamster', 'rabbit', 'bunny', 'chicken', 'horse', 'lizard', 'turtle', 'guinea pig', 'snake', 'ferret', 'goat', 'pig', 'cow', 'duck'];
  var PETRE = new RegExp('\\b(' + PETS.join('|') + ')s?\\b', 'i');
  var PERSONW = ['friend', 'buddy', 'sister', 'brother', 'mom', 'mother', 'dad', 'father', 'wife', 'husband', 'girlfriend', 'boyfriend', 'partner', 'son', 'daughter', 'kid', 'cousin', 'uncle', 'aunt', 'grandma', 'grandpa', 'grandmother', 'grandfather', 'neighbor', 'neighbour', 'boss', 'coworker', 'co-worker', 'teacher', 'coach', 'roommate', 'niece', 'nephew', 'baby', 'person', 'guy', 'girl', 'man', 'woman', 'lady', 'doctor'];
  var PLACEW = ['place', 'town', 'city', 'store', 'shop', 'park', 'home', 'house', 'restaurant', 'school', 'work', 'office', 'country', 'state', 'lake', 'river', 'farm', 'homestead', 'cabin', 'beach', 'gym', 'church', 'bar', 'cafe', 'mall', 'street', 'road', 'island', 'mountain', 'trail', 'camp'];
  var THINGW = ['company', 'brand', 'app', 'game', 'website', 'show', 'band', 'movie', 'book', 'car', 'truck', 'tool', 'project', 'thing', 'program', 'team', 'group', 'club'];

  var HW = null;
  function HOBBYWORDS() {
    if (HW) return HW;
    HW = {};
    Object.keys(AIU.art.ACTIVITIES).forEach(function (id) { (AIU.art.ACTIVITIES[id].keys || []).forEach(function (k) { if (k.indexOf(' ') > 0) k.split(' ').forEach(function (w) { HW[w] = 1; }); }); });
    return HW;
  }

  /* ---------- the lexicon matrix (from the diagram), read from the engine's word index ---------- */
  function display(L) { return Object.keys(L.raw).sort(function (a, b) { return L.raw[b] - L.raw[a]; })[0] || ''; }
  var knownCache = { v: null, map: null };
  function knownNames(S) {
    if (knownCache.v === S.entities) return knownCache.map;
    var map = {}; Object.keys(S.entities).forEach(function (k) { map[Wd.norm(k)] = S.entities[k]; });
    knownCache = { v: S.entities, map: map };
    return map;
  }
  // One row of the matrix: word, root, type, confidence, state (ACTIVE / WATCH / REVIEW / DORMANT / ARCHIVED).
  M.word = function (S, k, now) {
    var L = S.lex[k]; if (!L) return null;
    now = now || Date.now();
    var raw = display(L), learned = S.learned[k], ent = knownNames(S)[k], w = { norm: k, display: raw, count: L.count, last: L.last, lastDay: L.lastDay, links: L.links };
    w.kind = learned ? learned.kind : ent ? ent.kind : null;
    w.note = learned ? learned.note : ent ? (ent.relation || ent.species || ent.note) : null;
    w.conf = w.kind ? 0.95 : Math.min(0.9, 0.35 + 0.1 * L.count);
    var age = (now - L.last) / 86400000;
    if (w.kind === 'skip') w.state = 'DORMANT';
    else if (age > 180) w.state = 'ARCHIVED';
    else if (age > 30) w.state = 'DORMANT';
    else if (!w.kind && L.capMid > 0 && !Wd.COMMON[k] && !HOBBYWORDS()[lc(raw)] && !/\d/.test(k) && lc(raw) !== lc(S.totemName) && lc(raw) !== lc(S.callMe)) w.state = 'REVIEW';
    else if (L.count < 2 && !w.kind) w.state = 'WATCH';
    else w.state = 'ACTIVE';
    if (L.count <= 2 && !w.kind && !Wd.COMMON[k] && k.length >= 4) { // typo? one letter away from a word you use a lot
      var best = null;
      Object.keys(L.links).concat(Object.keys(S.lex).length < 3000 ? Object.keys(S.lex) : []).some(function (o) {
        var Lo = S.lex[o]; if (o !== k && Lo && Lo.count >= 3 && o.length >= 4 && Wd.lev(k, o) === 1) { best = o; return true; } return false;
      });
      if (best) { w.typoOf = best; w.conf = 0.8; w.state = 'WATCH'; }
    }
    return w;
  };
  // The glossary: most recent words, with the chapters (months) they show up in most.
  M.glossary = function (S, n) {
    var keys = Object.keys(S.lex).filter(function (k) { return !Wd.COMMON[k] && !/\d/.test(k); })
      .sort(function (a, b) { return S.lex[b].last - S.lex[a].last || S.lex[b].count - S.lex[a].count; }).slice(0, n || 40);
    return keys.map(function (k) {
      var w = M.word(S, k);
      w.chapters = Object.keys(S.lib).filter(function (m) { return S.lib[m].words[k]; }).sort().reverse().slice(0, 3);
      return w;
    });
  };
  M.reviewWords = function (S, n) {
    return Object.keys(S.lex).filter(function (k) { return S.lex[k].capMid > 0 && !S.learned[k]; }).map(function (k) { return M.word(S, k); })
      .filter(function (w) { return w && w.state === 'REVIEW'; }).sort(function (a, b) { return b.count - a.count; }).slice(0, n || 5);
  };

  // Memory search. The engine keeps, for each word, the ids of the latest notes that used it;
  // the app loads those few notes into docCache before a reply (so years of text never sit in memory).
  M.docCache = {};
  M.candidates = function (S, text) {
    var ids = {};
    Wd.tokens(text).forEach(function (t) {
      var L = S.lex[t.norm]; if (!L) return;
      L.posts.forEach(function (id) { ids[id] = 1; });
      Object.keys(L.links).forEach(function (l) { if (L.links[l] >= 3 && S.lex[l]) S.lex[l].posts.slice(-4).forEach(function (id) { ids[id] = 1; }); });
    });
    return Object.keys(ids).slice(0, 120);
  };
  M.search = function (S, query, limit, kinds) {
    var want = {};
    Wd.tokens(query).forEach(function (t) {
      var n = t.norm, w = S.lex[n] ? M.word(S, n) : null; if (w && w.typoOf) n = w.typoOf;
      want[n] = 1;
      if (S.lex[n]) Object.keys(S.lex[n].links).forEach(function (l) { if (!want[l] && S.lex[n].links[l] >= 2) want[l] = 0.3; });
    });
    var pool = {}, CMD = /^(please )?(remember|remind|wake|add|put|cancel|stop|delete|remove|show|call me|my name|dear diary|journal|note)\b|\?\s*$|^(what|when|who|where|how|why)\b/i;
    Object.keys(M.docCache).forEach(function (id) { pool[id] = M.docCache[id]; });
    S.memories.forEach(function (e) { pool[e.id] = e; });
    S.chat.forEach(function (e) { if (e.type === 'say') pool[e.id] = e; });
    S.journal.forEach(function (e) { pool[e.id] = e; });
    Object.keys(S.jpages || {}).forEach(function (d) { var pg = S.jpages[d]; Object.keys(pg).forEach(function (f) { if (pg[f].text) pool['jp:' + d + ':' + f] = { id: 'jp:' + d + ':' + f, t: pg[f].t, d: d, type: 'journal', data: { text: pg[f].text } }; }); });
    var scored = [];
    Object.keys(pool).forEach(function (id) {
      var e = pool[id], kind = e.type === 'journal' ? 'journal' : e.type === 'remember' ? 'memory' : e.type === 'say' ? 'said' : null;
      if (!kind || (kinds && kinds.indexOf(kind) < 0)) return;
      var text = String((e.data && e.data.text) || '');
      if (kind === 'said' && CMD.test(text.trim())) return;
      var norms = {}; Wd.tokens(text).forEach(function (t) { norms[t.norm] = 1; });
      var sc = 0; Object.keys(want).forEach(function (w) { if (norms[w]) sc += want[w]; });
      if (sc >= 1) scored.push({ d: { e: e, kind: kind, text: text, day: e.d || U.dayStr(new Date(e.t)) }, sc: sc });
    });
    scored.sort(function (a, b) { return b.sc - a.sc || b.d.e.t - a.d.e.t; });
    return scored.slice(0, limit || 3).map(function (x) { return x.d; });
  };
  function snippet(t) { t = Wd.clean(t); return t.length > 90 ? t.slice(0, 87) + '...' : t; }

  /* ---------- activity unlocks ---------- */
  M.findUnlocks = function (text, S) {
    var s = ' ' + lc(text).replace(/[^a-z0-9 ]+/g, ' ') + ' ', out = [];
    if (/\b(i ?ching|hilltop|coins)\b|\b(daily|today s|todays|my|the) reading\b|\breading (for|at|time|now)\b/.test(s)) s = s.replace(/ reading /g, ' '); // the daily reading isn't a book
    Object.keys(AIU.art.ACTIVITIES).forEach(function (id) {
      var a = AIU.art.ACTIVITIES[id];
      if (a.base || S.unlocked[id] || (a.pack && !S.owned[id])) return;
      var keys = a.keys || [];
      for (var i = 0; i < keys.length; i++) if (s.indexOf(' ' + keys[i] + ' ') >= 0) { out.push(id); break; }
    });
    return out;
  };
  var UNLOCK_LINES = [
    'Ooh, {a}? I want to try that! I\'ll practice in my free time.',
    '{A}! That sounds fun. Adding it to my hobbies.',
    'Wait, you like {a}? Me too now!'
  ];

  /* ---------- greetings & small talk ---------- */
  M.greeting = function (ctx) {
    var S = ctx.S, n = S.callMe, p = ctx.period;
    if (!S.hatched) return '*the egg wiggles* (' + ctx.hatchIn + ' until it hatches)';
    var lines = {
      earlybird: 'Hey ' + n + ', you\'re up early! Are you busy this morning?',
      morning: 'Hey ' + n + ', are you busy this morning?',
      brunch: 'Hey ' + n + '! How\'s your morning going?',
      lunch: 'Hey ' + n + '! Had lunch yet?',
      afternoon: 'Hey ' + n + ', how\'s your afternoon?',
      supper: 'Hey ' + n + '! What\'s for supper?',
      evening: 'Evening, ' + n + '! What did you get up to today?',
      bedtime: '*yawn* ' + n + '? It\'s late... everything okay?'
    };
    var out = lines[p] || ('Hey ' + n + '!');
    var next = M.nextTask(ctx, 180);
    if (next && p !== 'bedtime') out += ' Don\'t forget: ' + lc(next.title) + ' at ' + U.fmtHm(next.time, ctx.clock24) + '.';
    return out;
  };
  M.nextTask = function (ctx, withinMin) {
    var nowMin = ctx.nowMin, occ = C.occurrences(ctx.S, ctx.today);
    for (var i = 0; i < occ.length; i++) if (!occ[i].done && occ[i].min > nowMin && occ[i].min - nowMin <= withinMin) return occ[i];
    return null;
  };

  // What the Totem says when a reminder goes off.
  M.reminderLine = function (occ, ctx) {
    var S = ctx.S, n = S.callMe, title = occ.title, out;
    if (/^wake/i.test(title)) out = 'Rise and shine, ' + n + '! It\'s ' + U.fmtHm(occ.time, ctx.clock24) + '.';
    else out = 'Hey ' + n + ', can you ' + lc(title).replace(/\bthe (\w+)\b/, function (m, w) { var pet = petByWord(S, w); return pet ? pet.name : m; }) + '?';
    // related things: same pet or same nouns
    var tk = Wd.tokens(title).map(function (t) { return t.norm; }), extra = [];
    var pet = null; tk.forEach(function (w) { pet = pet || petByWord(S, w); });
    var occs = C.occurrences(S, ctx.today);
    occs.forEach(function (o) {
      if (o.key === occ.key || o.done || extra.length) return;
      var ot = Wd.tokens(o.title).map(function (t) { return t.norm; });
      var share = ot.some(function (w) { return tk.indexOf(w) >= 0 && !Wd.COMMON[w]; }) || (pet && ot.indexOf(Wd.norm(pet.species || '')) >= 0);
      if (share && Math.abs(o.min - occ.min) <= 180) extra.push('Also, maybe you should ' + lc(o.title) + '.');
    });
    var items = C.listItems(S, 'shopping').filter(function (it) { return !it.done && Wd.tokens(it.item).some(function (t) { return tk.indexOf(t.norm) >= 0 || (pet && t.norm === Wd.norm(pet.species || '')); }); });
    if (items.length) extra.push('Do you need to get ' + items[0].item + ' at the store?');
    return out + (extra.length ? ' ' + extra.join(' ') : '');
  };
  function petByWord(S, w) {
    w = Wd.norm(w);
    var keys = Object.keys(S.entities);
    for (var i = 0; i < keys.length; i++) { var e = S.entities[keys[i]]; if (e.kind === 'pet' && (Wd.norm(e.species || '') === w || keys[i] === w)) return e; }
    return null;
  }

  /* ---------- pending questions (a tiny dialogue state machine) ---------- */
  function isYes(s) { return /^(y|yes|yeah|yep|yup|sure|ok|okay|please|do it|go ahead|sounds good|yes please|definitely|of course|absolutely|why not)\b/i.test(s.trim()); }
  function isNo(s) { return /^(n|no|nope|nah|no thanks|not now|skip|don'?t|never mind|nevermind|later)\b/i.test(s.trim()); }

  function makeTasks(items, startMin, step, mode, ctx) {
    var drafts = [], lines = [], today = ctx.today, day = null;
    items.forEach(function (it, i) {
      var min = (startMin !== null && startMin !== undefined) ? startMin + i * (step || 0) : it.min;
      if (min === null || min === undefined) return;
      var title = it.title, key = /^(wake|get) up/i.test(title) ? 'wake-up' : slug(title);
      var d = { key: key, title: title, time: U.minToHm(min) };
      if (mode === 'routine') { d.repeat = 'daily'; d.routine = ctx.routineName || 'morning'; }
      else { if (!day) day = (min > ctx.nowMin && i === 0) ? today : U.addDays(today, min > ctx.nowMin ? 0 : 1); d.repeat = 'once'; d.date = day; }
      d.key = keyFor(key, d);
      drafts.push({ type: 'task_set', data: d });
      lines.push(hm(ctx, min) + ' ' + title);
    });
    return { drafts: drafts, lines: lines, day: day };
  }

  function followUps(ctx, info) {
    // after a routine: ask pet names, offer pet food
    var S = ctx.S, q = [];
    (info.pets || []).forEach(function (sp) { if (!petByWord(S, sp)) q.push({ type: 'pet_name', species: sp, feed: info.feed && info.feed.indexOf(sp) >= 0 }); });
    if (!q.length) (info.feed || []).forEach(function (sp) { q.push({ type: 'add_to_list', items: [sp + ' food'], list: 'shopping' }); });
    return q;
  }
  function askNext(res, ctx) {
    var q = (res.queue || []).shift();
    if (!q) return;
    res.pending = { type: q.type, data: q, queue: res.queue };
    if (q.type === 'pet_name') res.say.push('What\'s your ' + q.species + '\'s name?');
    if (q.type === 'add_to_list') res.say.push('Want me to add ' + listJoin(q.items) + ' to your ' + q.list + ' list?');
    if (q.type === 'learn_word') res.say.push('Wait, who or what is ' + q.word + '? A person, a pet, a place, or something else?');
  }

  /* ---------- the butler: acting on what it understood ---------- */
  var ITEMKIND = { pet: 'pet', family: 'person', friend: 'person', job: 'person', person: 'person', city: 'place', country: 'place', region: 'place',
    place: 'place', building: 'place', room: 'place', vehicle: 'vehicle' };
  // The first word in a short answer the dictionary can place: "she's my aunt" -> person, "a hamster" -> pet.
  function dictKindIn(s) {
    if (!D || !D.ready) return null;
    var toks = D.read(s);
    for (var i = 0; i < toks.length; i++) { var t = toks[i], k = t.kinds[0] || ''; if (t.p === 'n' && ITEMKIND[k.slice(2)]) return { kind: ITEMKIND[k.slice(2)], word: t.base }; }
    return null;
  }
  var SHOPCUE = /\b(out of|ran out|run out|running low|low on|almost out|need(s)? (more|some|new)?|buy|get some|pick up|grab)\b/;
  // "we ran out of dish soap and bananas" -> ['dish soap', 'bananas'] (not "out of time", not "pick up the kids")
  var OUTOF = /\b(?:ran out of|run out of|running out of|are out of|is out of|we'?re out of|i'?m out of|out of|running low on|low on|almost out of|pick up some|pick up|grab some|grab|need more|need some)\s+(.+)$/i;
  var NOTSHOP = /^n\.(time|feeling|quality|state|mind|amount|money|activity|event|person|family|friend|job|place|city|country|region|building|room|pet|animal|words)$/;
  function foodItems(raw) {
    if (!D || !D.ready) return [];
    var mm = OUTOF.exec(Wd.clean(raw).replace(/[.!?]+$/, ''));
    if (mm) {
      var items = [], tail = mm[1].replace(/\b(at|from) the (store|market|shop|grocery)\b.*$/i, '').replace(/\s+\b(for|before|by|tomorrow|today|tonight|later|again|now|so|but|because)\b.*$/i, '');
      tail.split(/\s*(?:,|\band\b|&|\bplus\b)\s*/).forEach(function (p) {
        p = p.replace(/^(some|a few|a couple of|a|an|the|more|of|our|my)\s+/i, '').trim();
        if (!p || p.split(' ').length > 3) return;
        var tk = D.read(p).filter(function (t) { return !t.fn && !t.num; }), head = tk[tk.length - 1];
        if (!head || NOTSHOP.test(head.kinds[0] || '') || (head.p !== 'n' && !head.phrase && head.known)) return;
        if (items.indexOf(lc(p)) < 0) items.push(lc(p));
      });
      if (items.length) return items.slice(0, 8);
    }
    if (!SHOPCUE.test(lc(raw))) return [];
    var toks = D.read(raw), out = [];
    toks.forEach(function (t, i) {
      var food = t.kinds.some(function (k) { return /^n\.(food|drink|fruit|veg|sweet|dish)$/.test(k); });
      if (!food || t.fn) return;
      var prev = toks[i - 1], name = lc(t.raw);
      if (prev && prev.p === 'n' && !prev.fn && /^n\.(pet|animal)$/.test(prev.kinds[0] || '')) name = lc(prev.raw) + ' ' + name; // dog food
      if (out.indexOf(name) < 0) out.push(name);
    });
    return out.slice(0, 6);
  }
  function todoTitle(raw) {
    var t = Wd.clean(raw).replace(/[.!?]+$/, '').replace(/^(ok(ay)?|so|oh|um|hey|also|and|but|ugh)[, ]+/i, ''), m;
    if ((m = /^(?:i|we)\s+(?:really\s+|still\s+|also\s+)?(?:need to|have to|gotta|got to|should|must|ought to)\s+(.+)$/i.exec(t)) ||
        (m = /^(?:don'?t|do not) (?:let me )?forget (?:to\s+)?(.+)$/i.exec(t)) || (m = /^(?:need to|have to|gotta|must|should)\s+(.+)$/i.exec(t))) t = m[1];
    else if (/^(the|my|our|a|an|his|her|their)\b/i.test(t) || /\b(is|are|was|were|needs?)\b/i.test(t)) t = 'Deal with: ' + t.charAt(0).toLowerCase() + t.slice(1);
    return Wd.cap(t).slice(0, 80);
  }
  function butlerAct(intent, pd, ctx, res, lead) {
    var text = pd.text, n = ctx.S.callMe;
    if (intent === 'todo') {
      var food = pd.items || foodItems(text);
      if (food.length) {
        food.forEach(function (it) { res.events.push({ type: 'list_add', data: { list: 'shopping', item: it } }); });
        if (pd.resume) { T.resume(res, pd.resume, ctx, lead + 'Added ' + listJoin(food) + ' to your shopping list.'); return; }
        res.say.push(lead + 'Added ' + listJoin(food) + ' to your shopping list.');
        return;
      }
      var title = pd.title || todoTitle(text);
      res.events.push({ type: 'list_add', data: { list: 'to-do', item: title } });
      if (pd.resume) { T.resume(res, pd.resume, ctx, lead + 'Added "' + title + '" to your to-do list.'); return; }
      res.pending = { type: 'reminder_time', data: { title: title, listed: true } };
      res.say.push(lead + 'Added "' + title + '" to your to-do list. Want a reminder too? (like "at 6pm", or no)');
      return;
    }
    if (intent === 'goal') {
      var g = guideFor(text) || { title: Wd.cap(clean(text.replace(/^(i|we)\s+(really\s+)?(want|wanna|hope|plan|would like|'d like|am trying|'m trying|am planning|'m planning)\s+(to\s+)?/i, '')).slice(0, 48)) };
      if (lead) res.say.push(lead.trim());
      startQuest(g, ctx, res, null, true); // you already said it's a goal
      return;
    }
    if (intent === 'remember') {
      res.events.push({ type: 'remember', data: { text: Wd.clean(text).slice(0, 500) } });
      res.say.push(lead + 'Got it, I\'ll remember that. Ask me any time, like "what do you remember about ' + (keyWordOf(text) || 'it') + '?"');
      return;
    }
    if (intent === 'question') { res.say.push(lead + 'Good question! I can\'t look things up yet, so I might not know. Try "help" to see what I can do.'); return; }
    var sub = { say: [], events: res.events, pending: null, queue: [] };
    chat(text, lc(text), ctx, sub, true, intent); // happened, feeling, chat: talk about it (who, what, when, where, why, how)
    res.pending = sub.pending; if (sub.local) res.local = Object.assign(res.local || {}, sub.local);
    res.say.push((lead + sub.say.join(' ')).trim());
  }
  function keyWordOf(text) {
    if (D && D.ready) { var nn = D.read(text).filter(function (t) { return t.p === 'n' && !t.fn && !t.num; })[0]; if (nn) return (/^[A-Z]/.test(nn.raw) && !nn.start ? nn.raw : lc(nn.raw)); }
    var toks = Wd.tokens(text).filter(function (t) { return !Wd.COMMON[t.norm]; });
    return toks.length ? lc(toks[0].raw) : '';
  }
  M.foodItems = foodItems; M.todoTitle = todoTitle;

  var PENDING = {
    quest_reminder: function (text, ctx, res, pd) {
      if (isNo(text)) { res.say.push('No problem. It\'s in your Quests whenever you\'re ready.'); return true; }
      var min = M.parseTime(text, true, ctx.nowMin);
      if (!isYes(text) && min === null) return false;
      var day = U.addDays(ctx.today, 1), d = { title: 'Work on: ' + pd.title, time: U.minToHm(min === null ? 600 : min), repeat: 'once', date: day, quest: pd.key };
      d.key = keyFor(slug('work on ' + pd.title), d);
      res.events.push({ type: 'task_set', data: d });
      res.say.push('Okay! I\'ll nudge you tomorrow at ' + U.fmtHm(d.time, ctx.clock24) + '.');
      return true;
    },
    make_routine: function (text, ctx, res, pd) {
      if (isNo(text)) { res.say.push('Okay, I won\'t.'); return true; }
      if (!isYes(text)) return false;
      res.events.push({ type: 'task_set', data: { key: pd.key, title: pd.title, time: pd.time, repeat: 'daily' } });
      res.say.push('Done! "' + pd.title + '" is now a daily routine at ' + U.fmtHm(pd.time, ctx.clock24) + '.');
      return true;
    },
    reminder_time: function (text, ctx, res, pd) {
      if (isNo(text)) {
        if (pd.todo !== false && !pd.listed) { res.events.push({ type: 'list_add', data: { list: 'to-do', item: pd.title } }); res.say.push('Okay! I put "' + pd.title + '" on your to-do list instead.'); }
        else res.say.push('Okay! Just say "remind me" if you change your mind.');
        return true;
      }
      if (M.parseTime(text, false, ctx.nowMin) === null && !/\bin \d+ (min|hour)/i.test(text)) return false;
      return command('remind me to ' + pd.title + ' ' + text, lc('remind me to ' + pd.title + ' ' + text), ctx, res);
    },
    offer_quest: function (text, ctx, res, pd) {
      if (isNo(text)) { res.say.push('That\'s okay. I\'m here if you want to talk.'); return true; }
      if (!isYes(text)) return false;
      res.pending = { type: 'new_quest_title', data: {} };
      res.say.push('Okay. What\'s one small thing you could do today? Say it in your words and I\'ll write it on your to-do list.');
      return true;
    },
    new_quest_title: function (text, ctx, res) {
      if (isNo(text)) { res.say.push('Okay. Another time.'); return true; }
      var item = Wd.cap(Wd.clean(text).replace(/[.!]+$/, '')).slice(0, 80);
      res.events.push({ type: 'list_add', data: { list: 'to-do', item: item } });
      res.say.push('Written down: "' + item + '". One step at a time. I\'m proud of you for picking it.');
      return true;
    },
    quest_start: function (text, ctx, res, pd) {
      var m = /\b(?:call it|name it|called)\s+(.{2,48})$/i.exec(Wd.clean(text));
      if (isNo(text) && !m) { res.say.push('Okay, no quest. I\'m listening if you want to add one later.'); return true; }
      if (!isYes(text) && !m) return false;
      createQuest(m ? Wd.cap(m[1].replace(/[.!"]+/g, '')) : pd.title, ctx, res, pd.extra);
      return true;
    },
    quest_steps: function (text, ctx, res, pd) {
      var s = lc(text).trim(), q = ctx.S.quests[pd.key] || { key: pd.key, title: pd.title, steps: pd.steps, kind: pd.kind };
      var have = (pd.steps || []).length;
      if (isNo(s) || /^(that'?s (it|all)|done|nothing( else)?|no more|nope,? that'?s it|that is (it|all)|i'?m done|all done)\b/.test(s)) {
        res.say.push(have ? 'Saved "' + pd.title + '" with ' + have + ' step' + (have === 1 ? '' : 's') + '. I\'ll keep track of it and check in with you.' : 'Okay, "' + pd.title + '" is in your quest log. Tell me the steps whenever you know them.');
        if (have) res.pending = { type: 'quest_reminder', data: { title: pd.title, key: pd.key } }, res.say.push('Want a reminder to work on it tomorrow?');
        return true;
      }
      if (s.split(/\s+/).length > 40) return false;
      var titles = stepsFrom(text);
      if (!titles.length) return false;
      var steps = (pd.steps || []).slice();
      titles.forEach(function (t) { steps.push({ id: nextStepId(steps), title: t }); });
      res.events.push({ type: 'quest_set', data: questSetData(q, steps.slice(0, 30)) });
      res.say.push('Got it: ' + listJoin(titles.map(lc)) + '. Another step, or is that it?');
      res.pending = { type: 'quest_steps', data: { key: pd.key, title: pd.title, steps: steps, kind: pd.kind } };
      return true;
    },
    quest_complete: function (text, ctx, res, pd) {
      if (isNo(text)) { res.say.push('Okay, it stays open. Add more steps any time.'); return true; }
      if (!isYes(text)) return false;
      res.events.push({ type: 'quest_state', data: { key: pd.key, state: 'done' } });
      res.say.push('Quest complete: ' + pd.title + '! So proud of you, ' + ctx.S.callMe + '.');
      return true;
    },
    standup: function (text, ctx, res, pd) { // the morning check-in: anything blocking you?
      var s = lc(text).trim();
      if (isNo(s) || /^(nothing|nope|all good|i'?m good|no blockers?|not really)\b/.test(s)) { res.say.push('Great. Go get it!'); return true; }
      if (s.split(/\s+/).length < 2 || COMMANDISH_RE.test(s)) return false;
      res.events.push({ type: 'quest_note', data: { key: pd.key, text: Wd.clean(text), by: 'you', tag: 'blocker' } });
      res.say.push('Noted in the "' + pd.title + '" journal. Want to add a step to get past it?');
      res.pending = { type: 'quest_steps', data: { key: pd.key, title: pd.title, steps: ((ctx.S.quests[pd.key] || {}).steps || []).slice(), kind: (ctx.S.quests[pd.key] || {}).kind } };
      return true;
    },
    routine_or_events: function (text, ctx, res, pd) {
      var s = lc(text), mode = null;
      if (/\b(routine|every ?day|daily|keep|habit|each day|start the (morning|day))\b/.test(s)) mode = 'routine';
      if (/\b(events?|once|one[- ]time|just tomorrow|schedule(d)? (it|them|as))\b/.test(s)) mode = 'events';
      var start = M.parseTime(s, true), step = M.parseDuration(s);
      if (!mode && isNo(s)) { res.say.push('No problem, I won\'t schedule anything.'); return true; }
      if (!mode && (start !== null || isYes(s))) mode = 'routine';
      if (!mode) return false;
      var allTimed = pd.items.every(function (it) { return it.min !== null; });
      if (start === null && !allTimed) {
        res.pending = { type: 'routine_times', data: { items: pd.items, mode: mode, info: pd.info } };
        res.say.push(mode === 'routine' ? 'Okay, a routine! What time should it start, and how far apart? (like "8am, 20 minutes apart")' : 'Okay! When should they start, and how far apart?');
        return true;
      }
      return PENDING.routine_times(text, ctx, res, { items: pd.items, mode: mode, info: pd.info }, start, step);
    },
    routine_times: function (text, ctx, res, pd, start, step) {
      if (start === undefined) start = M.parseTime(text, true);
      if (step === undefined || step === null) step = M.parseDuration(text);
      var allTimed = pd.items.every(function (it) { return it.min !== null; });
      if (start === null && !allTimed) return false;
      if (start !== null && !step) step = 15;
      var made = makeTasks(pd.items, start, step, pd.mode, ctx);
      res.events = res.events.concat(made.drafts);
      res.say.push((pd.mode === 'routine' ? 'Done! Your morning routine: ' : 'Scheduled for ' + U.fmtDay(made.day) + ': ') + made.lines.join(', ') + '.');
      res.queue = followUps(ctx, pd.info || {});
      askNext(res, ctx);
      return true;
    },
    pet_name: function (text, ctx, res, pd) {
      var m = /(?:name is|named|called|it'?s|its|he'?s|she'?s|they'?re)\s+([A-Za-z][\w'-]*)/i.exec(text), name = m ? m[1] : null;
      if (!name) {
        var w = Wd.clean(text).replace(/[.!?]+$/, '').split(' ');
        if (w.length > 3 || isNo(text)) { if (isNo(text)) { res.say.push('That\'s okay!'); res.queue = pd.queue; askNext(res, ctx); return true; } return false; }
        name = w.filter(function (x) { return /^[A-Z]/.test(x); })[0] || w[0];
      }
      name = Wd.cap(name.replace(/[^\w'-]/g, ''));
      res.events.push({ type: 'entity', data: { name: name, kind: 'pet', species: pd.species, taught: true } });
      res.say.push(name + '! What a great name.');
      res.queue = (pd.queue || []).slice();
      if (pd.feed) res.queue.unshift({ type: 'add_to_list', items: [pd.species + ' food'], list: 'shopping' });
      askNext(res, ctx);
      return true;
    },
    add_to_list: function (text, ctx, res, pd) {
      if (isYes(text)) {
        pd.items.forEach(function (it) { res.events.push({ type: 'list_add', data: { list: pd.list, item: it } }); });
        res.say.push('Added ' + listJoin(pd.items) + ' to your ' + pd.list + ' list.');
      } else if (isNo(text)) res.say.push('Okay, I won\'t.');
      else return false;
      res.queue = pd.queue; askNext(res, ctx);
      return true;
    },
    // the butler offered to act ("Add it to your to-do list?")
    b_offer: function (text, ctx, res, pd) {
      if (isNo(text)) {
        if (pd.resume) return T.resume(res, pd.resume, ctx, 'Okay, I won\'t.');
        res.say.push(pd.intent === 'remember' ? 'Okay, I won\'t keep it.' : 'Okay, I won\'t.'); return true;
      }
      if (!isYes(text)) return false;
      res.events.push({ type: 'teach', data: { text: pd.text, intent: pd.intent } });
      butlerAct(pd.intent, pd, ctx, res, '');
      return true;
    },
    // 21 Questions: the butler wasn't sure what you meant
    b_q21: function (text, ctx, res, pd) {
      var a = B.answer(text, pd.cands);
      if (a === null) return false;
      if (a === 'no') {
        var left = pd.cands.slice(pd.cands.length >= 2 && pd.pair ? 2 : 1);
        if (left.length && pd.n < 2) {
          var pair = left.length >= 2;
          res.pending = { type: 'b_q21', data: { text: pd.text, cands: left, n: pd.n + 1, pair: pair } };
          res.say.push(B.question(pair ? left : [left[0]], pd.n + 1));
        } else { // not a to-do, not a goal: we're just chatting, so ask about it
          res.events.push({ type: 'teach', data: { text: pd.text, intent: 'chat' } });
          butlerAct('chat', { text: pd.text }, ctx, res, 'Okay, just chatting! ');
        }
        return true;
      }
      res.events.push({ type: 'teach', data: { text: pd.text, intent: a } });
      butlerAct(a, { text: pd.text }, ctx, res, 'Thanks! I\'ll understand that better next time. ');
      return true;
    },
    // topic pages: who, what, when, where, why, how
    topic_q: function (text, ctx, res, pd) { return T.answer(text, ctx, res, pd); },
    // "Is that about cars, or something new?"
    topic_new: function (text, ctx, res, pd) {
      var s = lc(text).trim();
      if (/\b(new|different|something else|another|other thing|nope|no|not about)\b/.test(s) && !/^(yes|yeah|yep)\b/.test(s)) {
        var sub = M.respond(pd.text, Object.assign({}, ctx, { pending: null }));
        res.events = res.events.concat(sub.events); res.pending = sub.pending; if (sub.local) res.local = sub.local; if (sub.cast) res.cast = true;
        res.say.push(('Okay, something new! ' + sub.say.join(' ')).trim());
        return true;
      }
      if (isYes(s) || /\b(about|same|it is|it'?s about|that one)\b/.test(s)) { pd.pd.sure = true; return T.answer(pd.text, ctx, res, pd.pd); }
      return false;
    },
    // the personality quiz
    pq_offer: function (text, ctx, res) {
      if (isNo(text) || /^(later|not now|maybe later|another time)\b/i.test(text.trim())) { res.say.push('No problem! Say "personality quiz" any time.'); return true; }
      if (!isYes(text) && !/^(let'?s (do it|go)|ready|start|go|ok let'?s)\b/i.test(text.trim())) return false;
      res.pending = { type: 'pq', data: { i: 0 } };
      res.say.push('Great! Just answer A or B. ' + P.quizQuestion(0));
      return true;
    },
    pq: function (text, ctx, res, pd) {
      var i = pd.i || 0, s = lc(text).trim(), a = P.quizAnswer(text, i), q = P.QUIZ[i];
      if (!q) return false;
      if (/^(stop|quit|later|not now|enough|never ?mind|cancel)\b/.test(s)) { res.say.push('Okay, we\'ll finish another time. Say "personality quiz" to start again.'); return true; }
      if (a === null) { res.pending = { type: 'pq', data: { i: i } }; res.say.push('Just say A or B. ' + P.quizQuestion(i)); return true; }
      var v = a === 'a' ? 1 : a === 'b' ? -1 : 0;
      res.events.push({ type: 'trait', data: { qid: q.id, v: v } });
      if (i + 1 < P.QUIZ.length) { res.pending = { type: 'pq', data: { i: i + 1 } }; res.say.push(choose(text + i, ['Okay!', 'Got it.', 'Noted.', 'Mm-hm.']) + ' ' + P.quizQuestion(i + 1)); return true; }
      var TR = JSON.parse(JSON.stringify(ctx.S.traits || {})); TR.quiz = TR.quiz || {}; TR.quiz[q.id] = { v: v, t: (ctx.now || Date.now()) + 1 };
      var prev = ctx.S.ptypes && ctx.S.ptypes.length ? ctx.S.ptypes[ctx.S.ptypes.length - 1].code : '';
      var r = P.compute(TR);
      if (!r.code) { res.say.push('Thanks! I need a few more answers to know your type. Say "personality quiz" to try again.'); return true; }
      res.events.push({ type: 'ptype', data: { code: r.code, from: prev } });
      res.say.push('All done! You\'re a ' + r.name + ' (' + r.code + '): ' + r.desc + ' That\'s my personality now too. It keeps growing as we talk. See it any time in the Library.');
      return true;
    },
    // the scrum master checking on a quest step
    qcheck: function (text, ctx, res, pd) {
      var s = lc(text).trim(), S = ctx.S, q = S.quests[pd.key];
      if (!q) return false;
      if (/^(yes|yeah|yep|yup|done|did it|i did|finished|all done|already did|sure did|got it done)\b/.test(s)) {
        res.events.push({ type: 'quest_step', data: { key: pd.key, step: pd.step, done: true } });
        var rest = C.questSteps(S, q).filter(function (x) { return !x.done && x.id !== pd.step; });
        if (!rest.length) { res.say.push('Checked off: ' + lc(pd.stepTitle) + '. That was the last step of "' + pd.title + '". Mark the quest complete?'); res.pending = { type: 'quest_complete', data: { key: pd.key, title: pd.title } }; }
        else res.say.push('Nice! Checked off: ' + lc(pd.stepTitle) + '. Current objective: ' + lc(rest[0].title) + '.');
        return true;
      }
      if (isNo(s) || /^(not yet|haven'?t|not really)\b/.test(s)) { res.say.push('Okay. Anything blocking you?'); res.pending = { type: 'standup', data: { key: pd.key, title: pd.title } }; return true; }
      if (s.split(/\s+/).length < 2 || COMMANDISH_RE.test(s)) return false;
      res.events.push({ type: 'quest_note', data: { key: pd.key, text: Wd.clean(text), by: 'you', tag: 'update' } });
      res.say.push('Noted in the "' + pd.title + '" quest journal.');
      return true;
    },
    // an open question from the day's reading ("What's one thing you want to finish today?")
    open_q: function (text, ctx, res, pd) {
      var s = lc(text).trim(), nw = s.split(/\s+/).length;
      if (isNo(s) || /^(nothing|not much|nah|no one|nobody|none|nope)\b/.test(s)) { res.say.push('Okay! I\'m here if anything comes up.'); return true; }
      if (COMMANDISH_RE.test(s) || /\?$/.test(s)) return false;
      if (/^(start|finish|order)$/.test(pd.mode || '') && nw <= 12) {
        var title = todoTitle(text);
        res.pending = { type: 'b_offer', data: { intent: 'todo', text: Wd.clean(text), title: title } };
        res.say.push('Want me to put "' + title + '" on your to-do list?');
        return true;
      }
      if (pd.mode === 'connect' && nw <= 6) {
        var who = Wd.clean(text).replace(/[.!]+$/, '').replace(/^(maybe|probably|i could|i should|i'?ll|i might)\s+(call|text|check in with|message|visit|see)?\s*/i, '').replace(/^(call|text|check in with|message|visit|see)\s+/i, '');
        res.pending = { type: 'reminder_time', data: { title: 'Check in with ' + who } };
        res.say.push('Nice. Want a reminder to check in with ' + you(who) + '? (like "at 5pm", or no)');
        return true;
      }
      chat(Wd.clean(text), s, ctx, res, true, null, true);
      return true;
    },
    // evening check-in: fix today's page, what you learned, what carries forward
    evening: function (text, ctx, res, pd) {
      var s = lc(text).trim(), step = pd.step || 0, F = ['happened', 'learned', 'carry'], nw = s.split(/\s+/).length;
      if (/^(stop|never ?mind|not now|later|no thanks|skip (it|all))\b/.test(s)) { res.say.push('Okay! Your page is saved as it is.'); return true; }
      if (/^(remind me|wake me|what'?s next|what time|what day|help$|personality quiz|new quest)/.test(s)) return false;
      var skip = nw <= 4 && (isYes(s) || isNo(s) || /^(looks good|that'?s right|correct|good|nothing|all good|perfect|nope|not really|none)\b/.test(s));
      if (!skip) {
        var L = M.todayPage(ctx).log[F[step]], add = Wd.clean(text).replace(/^(no|nope|actually|well|also)[,.!]?\s+/i, '');
        res.events.push({ type: 'jpage', data: { day: ctx.today, f: F[step], text: (L.text ? L.text + '\n' : '') + Wd.cap(add) } });
      }
      var lead = skip ? '' : 'Added. ';
      if (step === 0) { res.pending = { type: 'evening', data: { step: 1 } }; res.say.push(lead + 'What did you learn today?'); return true; }
      if (step === 1) { res.pending = { type: 'evening', data: { step: 2 } }; res.say.push(lead + 'What should carry forward to tomorrow?'); return true; }
      res.say.push(lead + 'It\'s all on today\'s page. Rest well, ' + ctx.S.callMe + '.');
      return true;
    },
    cast_now: function (text, ctx, res) {
      if (isNo(text)) { res.say.push('Okay, it\'ll come at ' + U.fmtHm(readingTime(ctx.S), ctx.clock24) + '.'); return true; }
      if (!isYes(text)) return false;
      res.cast = true; res.say.push('Okay! Tossing the coins...');
      return true;
    },
    learn_word: function (text, ctx, res, pd) {
      var s = lc(text), kind = null, note = Wd.clean(text).replace(/[.!]+$/, '').slice(0, 80), m;
      if (isNo(s) || /\b(never ?mind|doesn'?t matter|nothing|ignore)\b/.test(s)) { res.events.push({ type: 'learn', data: { word: pd.word, kind: 'skip' } }); res.say.push('Okay, I\'ll let it go.'); return true; }
      var dk = dictKindIn(s);
      if ((m = PETRE.exec(s)) || /\bpet\b/.test(s)) kind = 'pet';
      else if (new RegExp('\\b(' + PERSONW.join('|') + ')s?\\b').test(s)) kind = 'person';
      else if (dk) { kind = dk.kind; if (kind === 'pet') m = [dk.word, dk.word]; }
      else if (new RegExp('\\b(' + PLACEW.join('|') + ')s?\\b').test(s)) kind = 'place';
      else if (new RegExp('\\b(' + THINGW.join('|') + ')s?\\b').test(s)) kind = 'thing';
      else if (s.split(/\s+/).length <= 6) kind = 'thing';
      else return false;
      var rel = (new RegExp('\\b(' + PERSONW.concat(PETS, PLACEW, THINGW).join('|') + ')\\b')).exec(s);
      res.events.push({ type: 'learn', data: { word: Wd.norm(pd.word), kind: kind, note: note } });
      if (kind === 'pet' || kind === 'person' || kind === 'place') {
        var ed = { name: pd.word, kind: kind, note: note };
        if (kind === 'pet' && m) ed.species = m[1];
        if (kind === 'person' && rel) ed.relation = rel[1];
        res.events.push({ type: 'entity', data: ed });
      }
      var what = kind === 'pet' ? 'your ' + (m ? m[1] : 'pet') : kind === 'person' ? (rel ? (/\bmy\b/.test(s) ? 'your ' : 'a ') + rel[1] : 'a person') : kind === 'place' ? 'a place' : 'something you know';
      res.say.push('Got it, ' + pd.word + ' is ' + what + '. I\'ll remember that!');
      return true;
    }
  };

  var COMMANDISH_RE = /^(please |hey |ok |okay )?(remind|wake|add|put|cancel|stop|delete|remove|show|call me|my name|dear diary|journal|remember|what|when|who|where|how|why|help|buy|set|idea|note|track|new quest|read)\b/;
  // Clear commands that interrupt a topic or the quiz (answers can start with "when" or "what", so those don't count)
  var STRONG_CMD = /^(please |hey |ok |okay )?(remind me|wake me|add |put |cancel |delete |remove |show me|call me|my name is|dear diary|journal:|remember that|help$|buy |set (a|an|my) |idea:|note:|track |new quest|read my|what'?s next|what'?s my|what time|what day|personality quiz|cast )/;
  /* ---------- the main reply function ---------- */
  // ctx: {S, now, nowMin, today, period, activity, weather, pending, clock24, hatchIn}
  // returns {say:[lines], events:[{type,data}], pending}
  M.respond = function (text, ctx) {
    var res = { say: [], events: [], pending: null, queue: [] };
    var raw = Wd.clean(text), s = lc(raw).replace(/[’]/g, "'"), S = ctx.S;
    if (!raw) return res;
    var egg = !S.hatched;
    if (CRISIS.test(s)) { res.say.push(M.crisisLine(S)); return res; }

    // 1. answer a question the Totem asked (unless this is clearly a new command)
    var COMMANDISH = COMMANDISH_RE;
    var shortAnswer = /^b_/.test((ctx.pending || {}).type || '') && s.split(/\s+/).length <= 4;
    var keepPending = { routine_times: 1, routine_or_events: 1, quest_steps: 1, topic_q: 1, pq: 1, evening: 1 };
    if (ctx.pending && COMMANDISH.test(s) && !keepPending[ctx.pending.type] && !shortAnswer) ctx.pending = null;
    var isQuestion = /\?\s*$/.test(s) && /^(what|when|where|who|why|how|do|does|did|can|could|are|is|will|would|should)\b/.test(s);
    if (ctx.pending && ctx.pending.type === 'pq' && (STRONG_CMD.test(s) || isQuestion)) ctx.pending = null;
    if (ctx.pending && ctx.pending.type === 'quest_steps' && /^(what|when|who|where|why|how|remind|wake|help|read|show|idea|track|new quest|note)\b/.test(s)) ctx.pending = null;
    if (ctx.pending && ctx.pending.type === 'learn_word' && s.split(/\s+/).length > 10) ctx.pending = null;
    // a clear command ("I got a hamster", "remind me...") wins over an answer to a topic question
    if (ctx.pending && /^topic_/.test(ctx.pending.type) && ctx.now && (ctx.pending.data || {}).at && ctx.now - ctx.pending.data.at > 30 * 60000) ctx.pending = null; // a question from long ago: let it go
    if (ctx.pending && ctx.pending.type === 'topic_q') {
      var scratch = { say: [], events: [], pending: null, queue: [] };
      ctx.inTopic = true;
      var isCmd = command(raw, s, ctx, scratch);
      ctx.inTopic = false;
      if (isCmd) {
        var tpd = ctx.pending.data; ctx.pending = null;
        Object.assign(res, scratch);
        if (!res.pending && tpd && tpd.w && tpd.w !== 'feel') { // handled it; now back to the topic (the scrum master keeps the thread)
          var lead = res.say.join(' '); res.say = [];
          tpd.queue = [tpd.w].concat(tpd.queue || []);
          T.resume(res, tpd, ctx, lead);
        }
        return finish(res, raw, ctx, true);
      }
      if (isQuestion) ctx.pending = null; // you asked Aiu something instead: answer that
    }
    if (ctx.pending && PENDING[ctx.pending.type]) {
      var pd = Object.assign({}, ctx.pending.data || {}, { queue: ctx.pending.queue || (ctx.pending.data && ctx.pending.data.queue) || [] });
      if (PENDING[ctx.pending.type](raw, ctx, res, pd)) return finish(res, raw, ctx, true);
    }
    // 2. commands
    if (command(raw, s, ctx, res)) return finish(res, raw, ctx, true);
    // 3. conversation
    if (egg) {
      res.say.push(choose(raw, ['*wobble wobble*', '*the egg feels warm*', '*tap tap* (something inside is listening)', '*the egg rocks gently*']));
      return finish(res, raw, ctx, false);
    }
    chat(raw, s, ctx, res);
    return finish(res, raw, ctx, false);
  };

  function finish(res, raw, ctx, wasCommand) {
    var S = ctx.S;
    M.findUnlocks(raw, S).forEach(function (id, i) {
      res.events.push({ type: 'unlock', data: { activity: id } });
      if (i === 0 && S.hatched) { var a = AIU.art.ACTIVITIES[id].label; res.say.push(UNLOCK_LINES[U.hash32(id) % UNLOCK_LINES.length].replace('{a}', a).replace('{A}', Wd.cap(a))); }
    });
    return res;
  }

  function command(raw, s, ctx, res) {
    var S = ctx.S, m, today = ctx.today, n = S.callMe, egg = !S.hatched, pre = egg ? '*wiggle* (' : '', post = egg ? ')' : '';
    function say(t) { res.say.push(pre + t + post); }

    if (/^(help|what can you do|commands|how do (i|you) use (this|you))\??$/.test(s)) {
      say('I can: set reminders ("remind me to walk the dog at 6pm"), wake-ups ("wake me up at 8am"), routines (tell me your morning), ' +
        'quests ("new quest: fix the fence", then tell me the steps; "add step: buy posts", "what\'s next?", "read my quests", "track fence"), ' +
        'ideas ("idea: a smaller dog bed"), quest notes ("quest note: posts are $8 each"), ' +
        'lists ("add eggs to my shopping list"), memories ("remember that...", "what do you remember about..."). ' +
        'Tap Journal to write a page: that\'s how I grow the most, and growing earns coins for the Shop! ' +
        'Or just talk normally ("the sink is leaking", "we\'re out of milk", "I like cars"): I sort it into a to-do, a goal, or just chatting, and when we chat I ask who, what, when, where, why and how, and save it to that topic\'s page in the Library. ' +
        'Also: "personality quiz", "what\'s today\'s reading", "set my reading for 7am", "what do you know about me".');
      return true;
    }
    if (!egg && personaCommands(raw, s, ctx, res)) return true;
    if (!egg && journalCommands(raw, s, ctx, res)) return true;
    if (!egg && readingCommands(raw, s, ctx, res)) return true;
    // "ask me about cars": fill in a topic page
    if (!egg && (m = /^(?:ask me about|let'?s talk about|quiz me about|interview me about)\s+(?:my |the )?(.{2,40}?)[.!?]*$/.exec(s))) {
      var tpa = T.detect('i like ' + m[1], S) || null;
      if (tpa) { tpa.stance = null; if (/^ask me about my|^let'?s talk about my/.test(s) && !/^my-/.test(tpa.key)) { tpa.key = 'my-' + tpa.key; tpa.title = 'My ' + lc(tpa.title); tpa.t = 'your ' + tpa.t; } return T.start(tpa, ctx, res, { lead: choose(raw, ['Okay!', 'Sure!', 'Let\'s do it!']) }); }
    }
    // wake-ups
    if ((m = /\bwake me( up)?\b/.exec(s)) && !/\bdon'?t\b/.test(s)) {
      var wmin = M.parseTime(s, true), wrep = parseRepeat(s);
      if (wmin === null) { say('What time should I wake you up?'); return true; }
      var wd = { key: 'wake-up', title: 'Wake up', time: U.minToHm(wmin), kind: 'wake' };
      if (wrep) Object.assign(wd, wrep);
      else { wd.repeat = 'once'; wd.date = parseDay(s, today) || (wmin > ctx.nowMin ? today : U.addDays(today, 1)); }
      wd.key = keyFor('wake-up', wd);
      res.events.push({ type: 'task_set', data: wd });
      say('Okay! I\'ll wake you up at ' + hm(ctx, wmin) + (wd.repeat === 'once' ? ' ' + U.fmtDay(wd.date) : wd.repeat === 'daily' ? ' every day' : ' on ' + wd.repeat) + '.');
      return true;
    }
    // reminders
    if ((m = /\bremind me (?:to |about |that )?(.+)/.exec(s)) || (m = /^(?:set (?:a |an )?(?:reminder|alarm) (?:to |for )?)(.+)/.exec(s))) {
      var body = raw.slice(raw.toLowerCase().indexOf(m[1].slice(0, 6)));
      var rmin = M.parseTime(s, false, ctx.nowMin), dur = /\bin\s+(\d+|an?|half an)\s*[- ]?(minutes?|mins?|hours?|hrs?)/.exec(s), rep = parseRepeat(s), day = parseDay(s, today);
      if (rmin === null && dur) { var dd = M.parseDuration(dur[0].replace(/\ban?\b/, '1')); if (dd) { rmin = ctx.nowMin + dd + (ctx.now && U.wall(ctx.now).getSeconds() > 0 ? 1 : 0); /* never early */ if (rmin >= 1440) { rmin -= 1440; day = U.addDays(today, 1); } } }
      var title = Wd.cap(stripTimeWords(body).replace(/^(to|about)\s+/i, '').replace(/\bmy\b/gi, 'my'));
      if (!title) { say('What should I remind you about?'); return true; }
      if (rmin === null) { say('When should I remind you to ' + you(lc(title)) + '? (like "at 6pm")'); res.pending = null; return true; }
      var td = { key: slug(title), title: title, time: U.minToHm(rmin) };
      if (rep) Object.assign(td, rep);
      else { td.repeat = 'once'; td.date = day || (rmin > ctx.nowMin ? today : U.addDays(today, 1)); }
      td.key = keyFor(td.key, td);
      var prevT = S.tasks[td.key];
      res.events.push({ type: 'task_set', data: td });
      say((prevT && !prevT.off ? 'Updated! ' : 'Got it! ') + 'I\'ll remind you to ' + you(lc(title)) + ' at ' + hm(ctx, rmin) + (td.repeat === 'once' ? ' ' + U.fmtDay(td.date) : td.repeat === 'daily' ? ' every day' : '') + '.');
      return true;
    }
    // cancel
    if ((m = /\b(?:cancel|stop|delete|remove|turn off|clear)\s+(?:the |my )?(.+?)(?:\s+(?:reminder|alarm|task))?$/.exec(s)) && !/\bfrom\b.*\blist\b/.test(s)) {
      var target = m[1].replace(/\b(reminder|alarm|task)s?\b/g, '').trim();
      if (/^(wake|waking|wake up|wake-up)/.test(target) || /don'?t wake me/.test(s)) target = 'wake up';
      var hit = findTask(S, target);
      if (hit) { res.events.push({ type: 'task_off', data: { key: hit.key } }); say('Okay, I turned off "' + hit.title + '". (It stays in your history.)'); return true; }
    }
    if (/don'?t wake me/.test(s)) {
      var wk = Object.keys(S.tasks).filter(function (k) { return /^wake-up/.test(k) && !S.tasks[k].off; });
      if (wk.length) { wk.forEach(function (k) { res.events.push({ type: 'task_off', data: { key: k } }); }); say('Okay, no wake-ups.'); return true; }
    }
    // lists: add
    if ((m = /\b(?:add|put)\s+(.+?)\s+(?:to|on)\s+(?:my|the|our)\s+(?:([a-z]+)\s+)?list\b/.exec(s)) || (m = /\b(?:i|we) need to (?:buy|get|pick up)\s+(.+)/.exec(s)) || (!ctx.inTopic && (m = /^(?:buy|get)\s+(.+?)(?:\s+(?:at|from) the store)?$/.exec(s)))) {
      var listName = (m[2] && m[2] !== 'shopping' && m[2] !== 'grocery') ? m[2] : 'shopping';
      if (m[2] === 'to-do' || m[2] === 'todo' || m[2] === 'do') listName = 'to-do';
      var items = m[1].replace(/\b(some|a few|a|an)\b\s*/g, '').split(/\s*(?:,|\band\b|&)\s*/).map(Wd.clean).filter(Boolean).slice(0, 12);
      items.forEach(function (it) { res.events.push({ type: 'list_add', data: { list: listName, item: it } }); });
      say('Added ' + listJoin(items) + ' to your ' + listName + ' list.');
      return true;
    }
    // lists: show
    if ((m = /\bwhat'?s on (?:my|the|our) (?:([a-z-]+) )?list\b/.exec(s)) || (m = /^(?:show|read|check)(?: me)? (?:my|the) (?:([a-z-]+) )?list\b/.exec(s)) || (m = /^(?:my )?(shopping|grocery|to-?do) list\??$/.exec(s))) {
      var ln = (m[1] && m[1] !== 'grocery' && m[1] !== 'shopping') ? (/^to-?do$/.test(m[1]) ? 'to-do' : m[1]) : 'shopping';
      var li = C.listItems(S, ln).filter(function (x) { return !x.done; });
      say(li.length ? 'Your ' + ln + ' list: ' + listJoin(li.map(function (x) { return x.item; })) + '.' : 'Your ' + ln + ' list is empty!');
      return true;
    }
    // lists: check off / remove
    if ((m = /\b(?:i )?(?:got|bought|picked up|grabbed)\s+(?:the |some )?(.+)/.exec(s)) || (m = /\b(?:check off|cross off|remove|take)\s+(.+?)\s*(?:off|from)?\s*(?:my|the)?\s*(?:[a-z]+ )?list/.exec(s))) {
      var got = m[1].replace(/\b(off|from|the|my|list|shopping)\b/g, ' ').split(/\s*(?:,|\band\b)\s*/).map(Wd.clean).filter(Boolean), done = [];
      Object.keys(S.lists).forEach(function (L) {
        C.listItems(S, L).forEach(function (it) {
          if (it.done) return;
          got.forEach(function (g) { if (Wd.norm(it.item) === Wd.norm(g) || lc(it.item).indexOf(lc(g)) >= 0) { res.events.push({ type: /remove|take/.test(s) ? 'list_remove' : 'list_check', data: { list: L, item: it.item, done: true } }); done.push(it.item); } });
        });
      });
      if (done.length) { say('Checked off ' + listJoin(done) + '.'); return true; }
      if (/list/.test(s)) { say('I couldn\'t find that on your lists.'); return true; }
    }
    // schedule
    if (/\b(what'?s|whats|what is) (my|the) (schedule|plan|routine|day)\b|\bwhat do i have (today|tomorrow|on)\b|\bmy (schedule|routine|reminders)\b|\banything (today|tomorrow)\b/.test(s)) {
      var sd = /tomorrow/.test(s) ? U.addDays(today, 1) : (parseDay(s, today) || today), oc = C.occurrences(S, sd);
      say(oc.length ? Wd.cap(U.fmtDay(sd)) + ': ' + oc.map(function (o) { return U.fmtHm(o.time, ctx.clock24) + ' ' + o.title + (o.done ? ' (done)' : ''); }).join(', ') + '.' : 'Nothing scheduled ' + U.fmtDay(sd) + '. Want to set something up?');
      return true;
    }
    // done
    if ((m = /^(?:i (?:just )?(?:did|finished|completed)|done with|finished|i'?m done with)\s+(.+)/.exec(s)) || (m = /^(.+?)\s+(?:is )?done$/.exec(s))) {
      var ht = findTask(S, m[1], today);
      if (ht && C.occurrences(S, today).some(function (o) { return o.key === ht.key; })) { res.events.push({ type: 'task_done', data: { key: ht.key, date: today } }); say(choose(raw, ['Nice work!', 'Awesome, checked it off.', 'Great job, ' + n + '!']) + ' (' + ht.title + ')'); return true; }
      var qm = /^(?:the )?quest (.+)$/.exec(m[1]), whole = qm ? findQuest(S, qm[1]) : null;
      if (whole) { res.events.push({ type: 'quest_state', data: { key: whole.key, state: 'done' } }); say('Quest complete: ' + whole.title + '! So proud of you, ' + n + '.'); return true; }
      var fs = findStep(S, m[1]);
      if (fs) {
        res.events.push({ type: 'quest_step', data: { key: fs.q.key, step: fs.step.id, done: true } });
        var rest = C.questSteps(S, fs.q).filter(function (x) { return !x.done && x.id !== fs.step.id; });
        if (!rest.length) { say('Checked off: ' + lc(fs.step.title) + '. That was the last step of "' + fs.q.title + '". Mark the quest complete?'); res.pending = { type: 'quest_complete', data: { key: fs.q.key, title: fs.q.title } }; }
        else say('Checked off: ' + lc(fs.step.title) + '. Current objective: ' + lc(rest[0].title) + '.');
        return true;
      }
      if (ht) { res.events.push({ type: 'task_done', data: { key: ht.key, date: today } }); say('Nice work! (' + ht.title + ')'); return true; }
    }
    // "I updated my resume" -> a quest step
    if (/^i (?:just |finally |already )?(\w+ed|did|made|wrote|sent|got|went|took|bought|called|built|found|fixed|finished)\b/.test(s)) {
      var fs2 = findStep(S, raw);
      if (fs2) {
        res.events.push({ type: 'quest_step', data: { key: fs2.q.key, step: fs2.step.id, done: true } });
        var rest2 = C.questSteps(S, fs2.q).filter(function (x) { return !x.done && x.id !== fs2.step.id; });
        if (!rest2.length) { say('Checked off: ' + lc(fs2.step.title) + '. That was the last step of "' + fs2.q.title + '". Mark the quest complete?'); res.pending = { type: 'quest_complete', data: { key: fs2.q.key, title: fs2.q.title } }; }
        else say('Checked off: ' + lc(fs2.step.title) + '. Current objective: ' + lc(rest2[0].title) + '.');
        return true;
      }
    }
    // pets & people
    if ((m = /\bmy (\w+(?: \w+)?)'?s name is ([a-z][\w'-]*)/i.exec(raw)) || (m = /\bi have an? (\w+(?: \w+)?) (?:named|called) ([a-z][\w'-]*)/i.exec(raw)) ||
        ((m = /\b([A-Z][\w'-]*) is my (\w+(?: \w+)?)\b/.exec(raw)) && !Wd.STOP[lc(m[1])] && !Wd.COMMON[lc(m[1])] && !/^(he|she|it|they|this|that|there|here)$/i.test(m[1]))) {
      var a = m[1], b = m[2], who, rel;
      if (/^[A-Z]/.test(a) && /\bis my\b/.test(raw)) { who = a; rel = lc(b); } else { who = b; rel = lc(a); }
      who = Wd.cap(who);
      var isPet = PETRE.test(rel), isPerson = new RegExp('\\b(' + PERSONW.join('|') + ')\\b').test(rel);
      if (isPet || isPerson) {
        res.events.push({ type: 'entity', data: isPet ? { name: who, kind: 'pet', species: PETRE.exec(rel)[1], taught: true } : { name: who, kind: 'person', relation: rel, taught: true } });
        say(egg ? 'The egg heard: ' + who + ' is your ' + rel : who + ', your ' + rel + '! I\'ll remember.');
        return true;
      }
    }
    // names
    if ((m = /^(?:call me|my name is|i'?m called)\s+([a-z][\w'-]*(?: [a-z][\w'-]*)?)\.?$/i.exec(raw))) {
      var nm = m[1].split(' ').map(Wd.cap).join(' ');
      res.events.push({ type: 'set', data: { k: 'callMe', v: nm } });
      say(egg ? 'The egg will call you ' + nm : 'Nice to meet you, ' + nm + '!');
      return true;
    }
    if (/^(what'?s|what is) your name\??$|^who are you\??$/.test(s)) { say('I\'m ' + S.totemName + ', your Totem!' + (S.hatched ? ' Right now I\'m a ' + C.stageName(S.stage) + (S.ptype && S.ptype.code ? ', and a ' + S.ptype.name + ' (' + S.ptype.code + ') like you' : '') + '.' : '')); return true; }
    if ((m = /^your name is (?:now )?([a-z][\w'-]*)\.?$/i.exec(raw))) { var tn = Wd.cap(m[1]); res.events.push({ type: 'set', data: { k: 'totemName', v: tn } }); say('Ooh, ' + tn + '. I like it!'); return true; }
    if (/^who am i\??$|what'?s my name\??$/.test(s)) {
      var pets = Object.keys(S.entities).map(function (k) { return S.entities[k]; }).filter(function (e) { return e.kind === 'pet'; });
      say('You\'re ' + n + '!' + (pets.length ? ' You have ' + listJoin(pets.map(function (p) { return p.name + ' the ' + (p.species || 'pet'); })) + '.' : ''));
      return true;
    }
    // facts
    if ((m = /^my (favou?rite \w+(?: \w+)?|birthday|middle name|job|car|truck|hometown) is (.+?)\.?$/i.exec(raw)) && !/^(making|leaking|broken|acting|not|dead|out of|low|stuck|flat|dirty|due|in the shop|at the shop|overheating|smoking|so|really|too|getting|running|still|being)\b/i.test(m[2])) {
      res.events.push({ type: 'fact', data: { key: lc(m[1]).replace('favourite', 'favorite'), value: m[2] } });
      var fav = /^favou?rite (.+)$/i.exec(m[1]);
      if (fav && T) res.events.push({ type: 'topic', data: { key: T.keyOf(fav[1]), title: Wd.cap(lc(fav[1])), kind: 'thing', group: 'thing', w: 'what', a: m[2], q: 'What\'s your favorite ' + lc(fav[1]) + '?' } });
      say(egg ? 'The egg noted it.' : 'Got it: your ' + lc(m[1]) + ' is ' + m[2] + '.');
      return true;
    }
    if ((m = /^what'?s my (favou?rite \w+(?: \w+)?|birthday|middle name|job|car|truck|hometown)\??$/.exec(s))) {
      var fk = m[1].replace('favourite', 'favorite'), fact = S.facts[fk];
      say(fact ? 'Your ' + fk + ' is ' + fact.value + '!' : 'You haven\'t told me your ' + fk + ' yet.');
      return true;
    }
    // remember
    if ((m = /^(?:please )?remember(?: that)?\s+(.{3,})/i.exec(raw))) {
      res.events.push({ type: 'remember', data: { text: m[1] } });
      say(egg ? 'The egg will remember.' : choose(raw, ['I\'ll remember that.', 'Saved to memory!', 'Got it, tucked away safe.']));
      return true;
    }
    // journal from chat
    if ((m = /^(?:dear diary|journal)[:,]?\s+(.{3,})/i.exec(raw))) {
      res.events.push({ type: 'journal', data: { text: m[1] } });
      say(egg ? 'Written in the journal.' : 'Written in your journal.' + (m[1].length < 80 ? ' (Longer entries help me grow!)' : ''));
      return true;
    }
    // recall
    if ((m = /\b(?:what do you (?:remember|know) about|tell me about|what did i say about)\s+(.+?)\??$/.exec(s)) || (m = /^(?:who|what) (?:is|are|was) ([a-z][\w' -]*?)\??$/.exec(s))) {
      if (egg) { say('The egg is still listening...'); return true; }
      recall(m[1], ctx, res);
      return true;
    }
    if ((m = /^when (?:did|was the last time) i\s+(.+?)\??$/.exec(s))) {
      if (egg) { say('The egg is still listening...'); return true; }
      var hits = M.search(S, m[1], 1);
      res.say.push(hits.length ? 'Last time was ' + U.fmtDay(hits[0].day) + ': "' + snippet(hits[0].text) + '"' : 'I don\'t have that in my memory yet.');
      return true;
    }
    if ((m = /^what did i do (today|yesterday|on \w+day|this morning)\??$/.exec(s))) {
      var qd = /yesterday/.test(m[1]) ? U.addDays(today, -1) : (parseDay(m[1], today) || today);
      if (/on \w+day/.test(m[1]) && qd > today) qd = U.addDays(qd, -7);
      var said = S.chat.filter(function (e) { return e.type === 'say' && e.d === qd && !/\?\s*$/.test(e.data.text); }).concat(S.journal.filter(function (e) { return e.d === qd; }))
        .slice(-3).map(function (e) { return { text: e.data.text }; });
      var dn = C.occurrences(S, qd).filter(function (o) { return o.done; }).map(function (o) { return o.title; });
      if (!said.length && !dn.length) res.say.push('I don\'t have anything from ' + U.fmtDay(qd) + '.');
      else res.say.push(Wd.cap(U.fmtDay(qd)) + ': ' + (dn.length ? 'you did ' + listJoin(dn.map(lc)) + '. ' : '') + said.map(function (d) { return '"' + snippet(d.text) + '"'; }).join(' '));
      return true;
    }
    // weather / time
    if (/\b(weather|raining|snowing|is it (hot|cold|sunny|nice) (out|outside))\b/.test(s)) {
      var w = ctx.weather || {};
      if (!w.kind || w.source === 'guess') say('I can\'t see the sky right now' + (ctx.S.settings.city ? '' : ' (set your city in Settings)') + '. I think it\'s ' + (w.kind || 'clear') + '.');
      else say('It\'s ' + w.label + (w.temp !== undefined ? ', ' + w.temp + '°' + (w.units || '') : '') + (w.stale ? ' (last I checked, ' + w.ago + ')' : '') + '.');
      return true;
    }
    if (/^what time is it\??$|^time\??$/.test(s)) { say('It\'s ' + U.fmtHm(U.hmStr(), ctx.clock24) + '.'); return true; }
    if (/^what('?s| is) (the date|today'?s date|today)\??$|^what day is it\??$/.test(s)) { var d0 = U.wall(); say('It\'s ' + U.DAYNAMES[d0.getDay()] + ', ' + U.MONTHS[d0.getMonth()] + ' ' + d0.getDate() + '.'); return true; }
    // quests, items and goals
    if (questCommands(raw, s, ctx, res)) return true;
    if (itemCommands(raw, s, ctx, res, say)) return true;
    var goal = egg ? null : guideFor(raw);
    if (goal && !/\?$/.test(raw)) { startQuest(goal, ctx, res); return true; } // asks first; steps come from you
    if ((m = /^(?:i (?:need|have|got) to|i gotta|i should|don'?t let me forget to|i must) (.{3,60}?)[.!]*$/i.exec(raw))) {
      if (M.parseTime(m[1], false, ctx.nowMin) !== null || /\bin \d+ (min|hour)/i.test(m[1])) return command('remind me to ' + m[1], 'remind me to ' + lc(m[1]), ctx, res);
      var tl = Wd.cap(stripTimeWords(m[1]).replace(/\bmy\b/gi, 'my'));
      res.pending = { type: 'reminder_time', data: { title: tl } };
      say('Want me to remind you to ' + you(lc(tl)) + '? Just tell me when (like "at 6pm" or "tomorrow at 9"), or say no.');
      return true;
    }
    // a morning (or any) report
    var rep2 = !ctx.inTopic && !/\?$/.test(raw) && raw.length < 300 ? M.parseReport(raw) : null;
    if (rep2) {
      var petsSeen = [], feed = [];
      rep2.forEach(function (it) { var pm = PETRE.exec(it.title); if (pm) { var sp = lc(pm[1]); if (petsSeen.indexOf(sp) < 0) petsSeen.push(sp); if (/^feed/i.test(it.title)) feed.push(sp); } });
      res.pending = { type: 'routine_or_events', data: { items: rep2, info: { pets: petsSeen, feed: feed } } };
      var saidList = rep2.map(function (it) { return it.said; });
      say((egg ? '' : choose(raw, ['Busy bee! ', 'Productive! ', 'Look at you go! '])) + 'You ' + listJoin(saidList) + '. Want me to keep that as a daily routine, or schedule them as one-time events?');
      return true;
    }
    return false;
  }

  function findTask(S, words, day) {
    var q = Wd.tokens(words).map(function (t) { return t.norm; }), best = null, bestSc = 0;
    if (!q.length) q = [Wd.norm(words)];
    Object.keys(S.tasks).forEach(function (k) {
      var t = S.tasks[k]; if (t.off) return;
      var tt = Wd.tokens(t.title + ' ' + k.replace(/-/g, ' ')).map(function (x) { return x.norm; });
      var sc = q.filter(function (w) { return tt.indexOf(w) >= 0; }).length;
      if (sc > bestSc) { bestSc = sc; best = Object.assign({ key: k }, t); }
    });
    return best;
  }

  function recall(what, ctx, res) {
    var S = ctx.S, key = lc(what).replace(/^(my|the|a|an)\s+/, '').trim(), out = [];
    if (/^(me|myself)$/.test(key)) { res.say.push(aboutYou(S)); return; }
    var tpg = T.find(S, key), tsum = tpg ? T.summary(S, tpg.key) : '';
    if (tsum) out.push(tsum);
    var ent = S.entities[key] || null;
    if (!ent) Object.keys(S.entities).forEach(function (k) { var e = S.entities[k]; if (!ent && e.kind === 'pet' && Wd.norm(e.species || '') === Wd.norm(key)) ent = e; });
    if (ent) out.push(ent.name + ' is ' + (ent.kind === 'pet' ? 'your ' + (ent.species || 'pet') : ent.relation ? 'your ' + ent.relation : ent.kind === 'place' ? 'a place you know' : ent.kind === 'vehicle' ? 'your ride' : ent.kind === 'thing' ? 'one of your things' : 'someone you know') + '.');
    var learned = S.learned[Wd.norm(key)];
    if (!ent && learned && learned.kind !== 'skip') out.push(Wd.cap(key) + ': ' + (learned.note || learned.kind) + '.');
    var nk = ent ? lc(ent.name) : key;
    (S.notes[nk] || []).filter(function (n2) { return !n2.done; }).slice(-2).forEach(function (n2) { out.push('Note: ' + n2.text + '.'); });
    C.questList(S, 'active').filter(function (q) { return q.subject === nk; }).forEach(function (q) { var ns = C.nextStep(S, q); out.push('Quest: ' + q.title + (ns ? ' (next: ' + lc(ns.title) + ')' : '') + '.'); });
    var hits = M.search(S, key, tsum ? 0 : out.length > 1 ? 1 : 3);
    hits.forEach(function (d) { out.push(Wd.cap(U.fmtDay(d.day)) + ' you ' + (d.kind === 'journal' ? 'wrote' : d.kind === 'memory' ? 'asked me to remember' : 'said') + ': "' + snippet(d.text) + '"'); });
    if (!out.length) out.push('I don\'t know anything about ' + what + ' yet. Tell me!');
    res.say.push(out.join(' '));
  }

  function isActivityWord(w) {
    var acts = AIU.art.ACTIVITIES;
    return Object.keys(acts).some(function (id) { return (acts[id].keys || []).some(function (k) { return Wd.norm(k) === w; }); });
  }

  /* ---------- the guide (Virgil): turns goals into quests with small steps ---------- */
  // Goals Aiu recognizes, just to suggest a quest title. The steps are always yours.
  var GUIDES = [
    { re: /\b(find|get|looking for|look for|need|want|searching for|search for|hunting for) (a |an |some |new |another )*(job|work|position|gig)\b|\bjob (hunt|hunting|search)\b|\bunemployed\b|\blost my job\b/,
      title: function () { return 'Find a job'; } },
    { re: /\b(?:want to|trying to|going to|gonna|wanna|need to|would like to) learn (?:how to )?([a-z0-9 '\-]{2,30})/,
      title: function (m) { return 'Learn ' + clean(m[1]); } },
    { re: /\b(?:want to|need to|going to|gonna|trying to|have to) (?:get in shape|work out more|exercise more|get fit|get stronger|be more active)\b/,
      title: function () { return 'Get moving'; } },
    { re: /\b(?:need to|want to|have to|gotta|going to|gonna) (?:clean|organize|declutter|tidy)(?: up)? (?:the |my |our )?([a-z ]{2,24})/,
      title: function (m) { return 'Clean up the ' + clean(m[1]); } },
    { re: /\b(?:want to|need to|going to|gonna|trying to|have to) (?:build|make|design|finish|create) (?:a |an |the |my |our )?([a-z0-9 '\-]{2,30})/,
      title: function (m) { return 'Build ' + clean(m[1]); } },
    { re: /\b(?:trip|vacation|travel(?:l?ing)?|going) to ([A-Z][a-zA-Z]+(?: [A-Z][a-zA-Z]+)?)/,
      title: function (m) { return 'Trip to ' + m[1]; }, raw: true },
    { re: /\b(?:want to|need to|trying to|have to) (?:save money|save up|budget|pay off|get out of debt)\b/,
      title: function () { return 'Get money sorted'; } },
    { re: /\b(?:studying for|study for|exam|midterm|final|test) (?:on |for |in )?([a-z0-9 ]{0,20})/,
      title: function (m) { return 'Study' + (clean(m[1]) ? ' for ' + clean(m[1]) : ''); } },
    { re: /\b(?:we'?re|i'?m|we are|i am) moving\b|\bmoving (?:to|out|house)\b/,
      title: function () { return 'Move'; } }
  ];
  function clean(t) { return Wd.clean(String(t || '').replace(/\b(this|next|week|today|tomorrow|soon|someday|and|so|but|because).*$/i, '')).replace(/[.!?,]+$/, ''); }
  function guideFor(text) {
    var s = lc(text);
    for (var i = 0; i < GUIDES.length; i++) {
      var G = GUIDES[i], m = G.re.exec(G.raw ? text : s);
      if (m) { var title = Wd.cap(G.title(m)); if (title.length < 3 || title.length > 48) continue; return { title: title, steps: [] }; }
    }
    return null;
  }
  M.guideFor = guideFor;
  function questEvents(title, steps, extra) {
    var key = slug(title), data = Object.assign({ key: key, title: title, steps: steps.map(function (t, i) { return { id: 's' + (i + 1), title: t }; }) }, extra || {});
    return [{ type: 'quest_set', data: data }, { type: 'quest_state', data: { key: key, state: 'active' } }];
  }
  M.questEvents = questEvents;
  // Aiu is the scrum master, you are the writer: it offers to start a quest, then writes down the steps you give it.
  function startQuest(g, ctx, res, extra, direct) {
    var S = ctx.S, key = slug(g.title), have = S.quests[key];
    if (have && have.state === 'active') {
      var ns = C.nextStep(S, have);
      res.say.push('"' + have.title + '" is already in your quest log.' + (ns ? ' Current objective: ' + lc(ns.title) + '.' : ' It has no steps yet. What\'s the first step?'));
      if (!ns) res.pending = { type: 'quest_steps', data: { key: key, title: have.title, steps: (have.steps || []).slice(), kind: have.kind } };
      return;
    }
    if (!direct) {
      res.pending = { type: 'quest_start', data: { title: g.title, extra: extra || {} } };
      res.say.push('Want me to start a quest called "' + g.title + '"? (yes, no, or "call it ...")');
      return;
    }
    createQuest(g.title, ctx, res, extra);
  }
  function createQuest(title, ctx, res, extra) {
    var key = slug(title);
    res.events = res.events.concat(questEvents(title, [], extra));
    if (!C.tracked(ctx.S)) res.events.push({ type: 'set', data: { k: 'track', v: key } });
    res.say.push((extra && extra.kind === 'side' ? 'Side quest' : 'Quest') + ' started: "' + title + '". What\'s the first step?');
    res.pending = { type: 'quest_steps', data: { key: key, title: title, steps: [], kind: (extra && extra.kind) || 'main' } };
  }
  M.createQuest = createQuest;
  // "first I need to buy strings, then learn three chords" -> ['Buy strings', 'Learn three chords']
  function stepsFrom(text) {
    var t = Wd.clean(String(text || '')).replace(/[.!]+$/, '');
    t = t.replace(/^(ok(ay)?|so|um|well|alright)[, ]+/i, '').replace(/^(the )?(first|next) step (is|would be)( to)?\s+/i, '');
    return t.split(/\s*(?:,\s*(?:and\s+)?then\s+|;\s*|\.\s+|,\s*and\s+|\s+and then\s+|\s+then\s+|,\s*)\s*/i).map(function (x) {
      x = x.replace(/^(and |then |also |first(ly)?,? |second(ly)?,? |after that,? |next,? |step \w+[:,]? )+/i, '')
        .replace(/^(i|we) (need to|have to|should|must|will|'ll|gotta|got to|want to|am going to|'m going to|are going to)\s+/i, '')
        .replace(/^(i'll|we'll|i'd|to)\s+/i, '').trim();
      return x ? Wd.cap(x).slice(0, 80) : '';
    }).filter(function (x) { return x.length >= 2; }).slice(0, 10);
  }
  M.stepsFrom = stepsFrom;
  function questSetData(q, steps) { return { key: q.key, title: q.title, why: q.why, subject: q.subject, tip: q.tip, due: q.due, kind: q.kind, steps: steps }; }
  M.questSetData = questSetData;
  function nextStepId(steps) { return 's' + (steps.reduce(function (m, x) { return Math.max(m, +String(x.id).replace(/\D/g, '') || 0); }, 0) + 1); }
  M.nextStepId = nextStepId;
  function addSteps(q, titles) {
    var steps = (q.steps || []).slice();
    titles.forEach(function (t) { steps.push({ id: nextStepId(steps), title: t }); });
    return { type: 'quest_set', data: questSetData(q, steps.slice(0, 30)) };
  }

  /* ---------- inventory (things you own and care for) ---------- */
  var THINGS = ('car truck van suv jeep bike bicycle motorcycle scooter boat camper rv trailer tractor mower laptop computer pc desktop phone iphone ipad tablet ' +
    'printer camera drill saw lathe tool tools toolbox guitar bass piano keyboard drum drums console xbox playstation switch tv kiln grill smoker ' +
    'house apartment garden coop shed garage workshop watch headphones microphone mic speaker speakers monitor router drone').split(' ');
  var VEHICLES = { car: 1, truck: 1, van: 1, suv: 1, jeep: 1, bike: 1, bicycle: 1, motorcycle: 1, scooter: 1, boat: 1, camper: 1, rv: 1, trailer: 1, tractor: 1 };
  var NOTTHINGS = /^(meeting|appointment|class|test|exam|idea|question|problem|cold|headache|fever|feeling|dream|plan|date|call|shift|day|week|lot|bunch|few|couple|minute|second|hour|job|chance|reason|friend|dog|cat|pet|brother|sister|kid|son|daughter|wife|husband|girlfriend|boyfriend)\b/;
  function thingName(phrase) {
    var words = Wd.clean(phrase).replace(/[.!?,]+$/, '').split(' ').filter(Boolean);
    if (!words.length || words.length > 4) return null;
    if (NOTTHINGS.test(lc(words[0])) || NOTTHINGS.test(lc(words[words.length - 1]))) return null;
    var caps = words.filter(function (w) { return /^[A-Z0-9]/.test(w); });
    var last = lc(words[words.length - 1]).replace(/s$/, '');
    if (caps.length) return { name: caps.join(' '), kind: VEHICLES[last] || /^(kia|honda|toyota|ford|chevy|nissan|subaru|jeep|bmw|tesla|mazda|hyundai|dodge|ram|gmc|vw|volkswagen)$/i.test(caps[0]) ? 'vehicle' : 'thing' };
    if (THINGS.indexOf(last) >= 0 || THINGS.indexOf(lc(words.join(' '))) >= 0) return { name: words.join(' ').replace(/^3d/i, '3D'), kind: VEHICLES[last] ? 'vehicle' : 'thing' };
    return null;
  }
  function findItem(S, words) {
    var q = lc(words).replace(/^(my|the|our)\s+/, '').trim(), best = null;
    Object.keys(S.entities).forEach(function (k) {
      var e = S.entities[k];
      if (best) return;
      if (k === q || lc(e.name) === q || (e.species && lc(e.species) === q) || (q.length > 2 && (k.indexOf(q) >= 0 || q.indexOf(k) >= 0))) best = { key: k, e: e };
    });
    return best;
  }
  M.findItem = findItem;
  // Things you own and care for. Aiu remembers them (for conversation and reminders); it never makes up tasks for them.
  function itemCommands(raw, s, ctx, res, say) {
    var S = ctx.S, m;
    // "my car needs new tires" -> offer a to-do in your words
    if ((m = /^(?:my |the |our )?(.{2,30}?) (?:needs|need|could use|is due for) (?:a |an |some |more )*(.{2,40}?)[.!]*$/i.exec(raw)) && !/\b(i|we|you)\b/i.test(m[1])) {
      var it = findItem(S, m[1]), made = it ? null : thingName(m[1].replace(/^(my|the|our)\s+/i, ''));
      if (!it && !made) return false;
      if (made && !S.entities[lc(made.name)]) res.events.push({ type: 'entity', data: { name: made.name, kind: made.kind, taught: true } });
      var own = /^(my|our|the)\s/i.exec(raw), title = Wd.cap(Wd.clean(m[2]).replace(/[.!]+$/, '')) + ' for ' + (own ? lc(own[1]) + ' ' : '') + (it ? it.e.name : made.name);
      res.pending = { type: 'b_offer', data: { intent: 'todo', text: raw, title: title } };
      res.say.push('Want me to add "' + title + '" to your to-do list?');
      return true;
    }
    // "I have a Toyota", "I just bought a 3D printer", "I got a hamster"
    if ((m = /^(?:i|we) (?:just )?(?:have|own|got|bought|picked up)(?: a| an| my| our| the)? (?:new |old |used |little )?(.{2,40}?)(?:\s+(?:named|called)\s+([A-Za-z][\w'-]*))?[.!]*$/i.exec(raw))) {
      var tn = thingName(m[1]);
      if (!tn && D && D.ready) {
        var last = lc(m[1]).split(' ').pop(), ks = D.kindsOf((D.bases(last).filter(function (x) { return x.p === 'n'; })[0] || { w: last }).w), dkind = D.nounKind(last);
        if (ks.indexOf('n.pet') >= 0) {
          var sp = (D.bases(last).filter(function (x) { return x.p === 'n'; })[0] || { w: last }).w;
          if (m[2]) { res.events.push({ type: 'entity', data: { name: Wd.cap(m[2]), kind: 'pet', species: sp, taught: true } }); res.say.push('A ' + sp + ' named ' + Wd.cap(m[2]) + '! I\'ll remember them.'); return true; }
          res.pending = { type: 'pet_name', data: { type: 'pet_name', species: sp } };
          res.say.push('A ' + sp + '! What\'s their name?');
          return true;
        }
        if (dkind && /^(vehicle|device|tool|instrument|furniture|clothes|toy|container|thing|building)$/.test(dkind) && m[1].split(' ').length <= 3)
          tn = { name: Wd.cap(m[1].replace(/^(a|an|the|my|our)\s+/i, '')), kind: dkind === 'vehicle' ? 'vehicle' : 'thing' };
      }
      if (!tn) return false;
      if (m[2]) tn.name = Wd.cap(m[2]);
      if (S.entities[lc(tn.name)]) { res.say.push('I know your ' + tn.name + '!'); return true; }
      res.events.push({ type: 'entity', data: { name: tn.name, kind: tn.kind, note: m[2] ? m[1] : undefined, taught: true } });
      res.say.push('Nice, ' + (/^[aeiou]/i.test(tn.name) ? 'an ' : 'a ') + tn.name + '! I\'ll remember that.');
      return true;
    }
    // "note for the car: oil change at 60k" (no quest by that name) -> a memory
    if ((m = /^(?:add a |add )?note (?:for|on|about|to) (.{2,30}?)[:,-]\s*(.{2,200})$/i.exec(raw))) {
      res.events.push({ type: 'remember', data: { text: Wd.cap(m[1]) + ': ' + Wd.clean(m[2]) } });
      res.say.push('Got it, I\'ll remember that about ' + m[1].replace(/^(my|the|our)\s+/i, '') + '.');
      return true;
    }
    if (/^(what do i (have|own)|my (items|inventory|stuff)|what do you know about my (stuff|things|pets))\??$/.test(s)) {
      var all = Object.keys(S.entities).map(function (k) { return S.entities[k]; }).filter(function (e) { return !e.hidden; });
      res.say.push(all.length ? 'You\'ve told me about ' + listJoin(all.slice(0, 12).map(function (e) { return e.name; })) + '.' : 'You haven\'t told me about your things yet. Say "I have a ..." any time.');
      return true;
    }
    return false;
  }

  function questCommands(raw, s, ctx, res) {
    var S = ctx.S, m, act = C.questList(S, 'active'), tr = C.tracked(S);
    var mains = act.filter(function (q) { return q.kind !== 'idea'; }), ideas = act.filter(function (q) { return q.kind === 'idea'; });
    // read the quest log back
    if (/^(my quests|quest log|read (me )?my (quests|quest log)|what are my quests|show (me )?my quests|what quests do i have)\??$/.test(s)) {
      if (!mains.length) { res.say.push('Your quest log is empty' + (ideas.length ? ' (' + ideas.length + ' idea' + (ideas.length > 1 ? 's' : '') + ' saved)' : '') + '. Tell me a goal, or say "new quest: ..."'); return true; }
      var order = (tr ? [tr] : []).concat(mains.filter(function (q) { return q !== tr; }));
      res.say.push(order.slice(0, 5).map(function (q) { var ns = C.nextStep(S, q); return (q === tr ? 'Tracking ' : '') + q.title + (ns ? ': ' + lc(ns.title) : (q.steps || []).length ? ': all steps done' : ': no steps yet'); }).join('. ') + '.' + (ideas.length ? ' Plus ' + ideas.length + ' idea' + (ideas.length > 1 ? 's' : '') + '.' : ''));
      return true;
    }
    if (/^(read|what are) my ideas\??$|^my ideas\??$/.test(s)) { res.say.push(ideas.length ? 'Your ideas: ' + listJoin(ideas.slice(0, 8).map(function (q) { return q.title; })) + '.' : 'No ideas saved yet. Say "idea: ..." any time.'); return true; }
    if (/^(what'?s next|next step|what should i do( next| now)?|what now|current objective)\??$/.test(s)) {
      var q0 = (tr && C.nextStep(S, tr)) ? tr : mains.filter(function (q) { return C.nextStep(S, q); })[0], occ = C.occurrences(S, ctx.today).filter(function (o) { return !o.done && o.min >= ctx.nowMin; })[0];
      if (q0) res.say.push('Current objective for "' + q0.title + '": ' + lc(C.nextStep(S, q0).title) + '.' + (occ ? ' Also coming up: ' + lc(occ.title) + ' at ' + U.fmtHm(occ.time, ctx.clock24) + '.' : ''));
      else if (occ) res.say.push('Coming up: ' + lc(occ.title) + ' at ' + U.fmtHm(occ.time, ctx.clock24) + '.');
      else res.say.push('Nothing on the list right now.' + (mains.length ? ' Want to add a step to one of your quests?' : ''));
      return true;
    }
    // new quest / side quest, written the way you say it
    if ((m = /^(?:new|add(?: a)?|start(?: a)?)\s+(side\s+|main\s+)?quest[:\s]+(.{2,60})$/i.exec(raw))) {
      var tt = Wd.cap(Wd.clean(m[2]).replace(/[.!]+$/, '')).slice(0, 48);
      startQuest({ title: tt }, ctx, res, { kind: m[1] && /side/i.test(m[1]) ? 'side' : 'main' }, true); return true;
    }
    // ideas inbox
    if ((m = /^(?:new idea|idea|i have an idea|i got an idea|quick idea|note an idea)[:,\s]+(.{3,500})$/i.exec(raw))) {
      var full = Wd.clean(m[1]), title = Wd.cap(full.replace(/[.!]+$/, '')).slice(0, 48);
      res.events = res.events.concat(questEvents(title, [], { kind: 'idea', why: full.length > 48 ? full : undefined }));
      res.say.push('Saved to your ideas: "' + title + '". Turn it into a quest whenever you\'re ready.');
      return true;
    }
    // add steps: "add a step to guitar: buy strings", "next step for the fence is get posts", "add step: call the plumber" (tracked quest)
    if ((m = /^(?:add (?:a |another )?step|new step|add (?:an )?objective)(?: to (.{2,40}?))?[:,\s]+(.{2,200})$/i.exec(raw)) ||
        (m = /^next step (?:for|on) (.{2,40}?)(?: is|:)\s+(.{2,200})$/i.exec(raw))) {
      var qa = m[1] ? findQuest(S, m[1]) : tr || mains[0];
      if (!qa) { res.say.push('Which quest? Say "new quest: ..." first.'); return true; }
      var titles = stepsFrom(m[2]);
      if (!titles.length) return false;
      res.events.push(addSteps(qa, titles));
      res.say.push('Added to "' + qa.title + '": ' + listJoin(titles.map(lc)) + '.');
      return true;
    }
    // quest journal: "note for guitar: the G chord hurts", "quest note: ..."
    if ((m = /^(?:quest note|note (?:for|on|in) (.{2,40}?))[:,]\s*(.{2,1000})$/i.exec(raw))) {
      var qn = m[1] ? findQuest(S, m[1]) : tr;
      if (qn) { res.events.push({ type: 'quest_note', data: { key: qn.key, text: Wd.clean(m[2]), by: 'you' } }); res.say.push('Written in the "' + qn.title + '" journal.'); return true; }
      if (!m[1]) { res.say.push('You\'re not tracking a quest. Say "track <quest>" first, or "note for <quest>: ..."'); return true; }
    }
    // track a quest (it shows under Aiu on the main screen)
    if ((m = /^(?:track|focus on|let'?s work on|switch to) (?:the )?(?:quest )?(.{2,48}?)(?: quest)?$/i.exec(raw))) {
      var qt = findQuest(S, m[1]);
      if (qt && qt.state === 'active') { res.events.push({ type: 'set', data: { k: 'track', v: qt.key } }); var nx = C.nextStep(S, qt); res.say.push('Tracking "' + qt.title + '".' + (nx ? ' Current objective: ' + lc(nx.title) + '.' : ' No steps yet. What\'s the first one?')); if (!nx) res.pending = { type: 'quest_steps', data: { key: qt.key, title: qt.title, steps: [], kind: qt.kind } }; return true; }
    }
    if ((m = /^(?:drop|abandon|give up on|cancel|set aside) (?:the )?(?:quest )?(.{3,48}?)(?: quest)?$/i.exec(raw))) {
      var qd = findQuest(S, m[1]);
      if (qd) { res.events.push({ type: 'quest_state', data: { key: qd.key, state: 'dropped' } }); res.say.push('Okay, I set "' + qd.title + '" aside. It stays in your history.'); return true; }
    }
    return false;
  }
  function findQuest(S, words) {
    var q = Wd.tokens(words).map(function (t) { return t.norm; }), best = null, bs = 0;
    C.questList(S).forEach(function (x) {
      var tt = Wd.tokens(x.title).map(function (t) { return t.norm; }), sc = q.filter(function (w) { return tt.indexOf(w) >= 0; }).length;
      if (sc > bs) { bs = sc; best = x; }
    });
    return best;
  }
  function findStep(S, words) {
    var q = Wd.tokens(words).map(function (t) { return t.norm; }), best = null, bs = 0;
    C.questList(S, 'active').forEach(function (x) {
      C.questSteps(S, x).forEach(function (st) {
        if (st.done) return;
        var tt = Wd.tokens(st.title).map(function (t) { return t.norm; }), sc = q.filter(function (w) { return tt.indexOf(w) >= 0; }).length;
        if (sc > bs && sc >= Math.min(2, tt.length)) { bs = sc; best = { q: x, step: st }; }
      });
    });
    return best;
  }
  M.findStep = findStep;

  /* ---------- care: gentle support, and a crisis line when it matters ---------- */
  var CRISIS = /\b(kill(ing)? myself|suicid|want to die|wanna die|wish i (was|were) dead|end (my|it all)|don'?t want to (live|be alive|be here anymore)|hurt(ing)? myself|self[- ]?harm|cut(ting)? myself)\b/;
  var HEAVY = /\b(depressed|hopeless|overwhelmed|anxious|panic|lost|stuck|worthless|alone|lonely|can'?t cope|burn(ed|t)? out|falling apart)\b/;
  M.crisisLine = function (S) {
    return 'I\'m really glad you told me, ' + S.callMe + '. I\'m a little pixel buddy, not a counselor, but you deserve real support right now. ' +
      'Please contact your local crisis hotline. In the US you can call or text 988 (Suicide & Crisis Lifeline) any time, day or night. ' +
      'If you might act on these thoughts or you\'re in danger, call your local emergency number now. ' +
      'Is there someone you trust you could reach out to today? Please be safe. I\'m here and I\'ll keep you company.';
  };

  /* ---------- doing things on its own (called when you come back to the app) ---------- */
  function weekKey(day) { var wd = U.weekday(day); return U.addDays(day, -wd); } // the Sunday that starts the week
  M.recapText = function (S, fromDay, toDay) {
    var d = fromDay, pages = 0, said = 0, journal = 0, done = 0, words = {};
    while (d <= toDay) {
      var ch = S.lib[d.slice(0, 7)], pg = ch && ch.days[d];
      if (pg) { if (pg.say || pg.journal || pg.done) pages++; said += pg.say; journal += pg.journal; done += pg.done; Object.keys(pg.words).forEach(function (w) { words[w] = (words[w] || 0) + pg.words[w]; }); }
      d = U.addDays(d, 1);
    }
    var qDone = C.questList(S, 'done').filter(function (q) { return q.stateM && U.dayStr(new Date(q.stateM.t)) >= fromDay; }).map(function (q) { return q.title; });
    var steps = Object.keys(S.qsteps).filter(function (k) { var st = S.qsteps[k]; return st.done && U.dayStr(new Date(st.t)) >= fromDay; }).length;
    var topw = C.top(words, 4).map(function (w) { return S.lex[w] ? display(S.lex[w]) : w; });
    if (!pages && !steps) return null;
    return 'Weekly recap: you showed up on ' + pages + ' day' + (pages === 1 ? '' : 's') + ', wrote ' + journal + ' journal page' + (journal === 1 ? '' : 's') +
      ', finished ' + done + ' task' + (done === 1 ? '' : 's') + (steps ? ' and ' + steps + ' quest step' + (steps === 1 ? '' : 's') : '') + '.' +
      (qDone.length ? ' Quest complete: ' + listJoin(qDone) + '!' : '') + (topw.length ? ' You talked most about ' + listJoin(topw) + '.' : '');
  };
  M.autonomy = function (ctx) {
    var S = ctx.S, L = ctx.local || {}, today = ctx.today, n = S.callMe;
    if (!S.hatched) return null;
    // 0. the personality evolves: say so when the type shifts (the Darwinist log)
    var pt = S.ptype || {}, lastPt = S.ptypes && S.ptypes.length ? S.ptypes[S.ptypes.length - 1].code : null;
    if (pt.code && lastPt && pt.code !== lastPt && L.ptSaid !== pt.code) {
      var diff = P.AXES.filter(function (ax, i) { return pt.code.charAt(i) !== lastPt.charAt(i); }).map(function (ax, j) { var i = P.AXES.indexOf(ax); return pt.code.charAt(i) === ax.a ? lc(ax.aName) : lc(ax.bName); });
      return { line: 'I\'ve noticed something, ' + n + ': lately you\'ve been leaning more ' + listJoin(diff) + '. That makes us ' + pt.name + 's now (' + pt.code + '). ' + pt.desc,
        events: [{ type: 'ptype', data: { code: pt.code, from: lastPt } }], local: { ptSaid: pt.code } };
    }
    // 1. morning check-in, once a day (the hilltop review covers it when the daily reading is due or done)
    if ((ctx.period === 'earlybird' || ctx.period === 'morning' || ctx.period === 'brunch') && L.checkin !== today && ((S.reviews || {})[today] || M.readingDue(ctx))) return { local: { checkin: today } };
    if ((ctx.period === 'earlybird' || ctx.period === 'morning' || ctx.period === 'brunch') && L.checkin !== today) {
      // the daily stand-up: what's on today, the current objective, and anything blocking you
      var occ = C.occurrences(S, today).filter(function (o) { return !o.done; }), tq = C.tracked(S);
      var q = (tq && C.nextStep(S, tq)) ? tq : C.questList(S, 'active').filter(function (x) { return x.kind !== 'idea' && C.nextStep(S, x); })[0];
      var yday = U.addDays(today, -1), doneY = Object.keys(S.qsteps).filter(function (k) { var st = S.qsteps[k]; return st.done && U.dayStr(new Date(st.t)) === yday; }).length;
      var bits = [];
      if (doneY) bits.push('Yesterday you checked off ' + doneY + ' quest step' + (doneY > 1 ? 's' : '') + '.');
      if (occ.length) bits.push('Today you have ' + occ.length + ' thing' + (occ.length > 1 ? 's' : '') + ': ' + listJoin(occ.slice(0, 3).map(function (o) { return lc(o.title) + ' at ' + U.fmtHm(o.time, ctx.clock24); })) + (occ.length > 3 ? ', and more' : '') + '.');
      if (q) {
        bits.push('Current objective for "' + q.title + '": ' + lc(C.nextStep(S, q).title) + '. Anything blocking you?');
        return { line: 'Good morning, ' + n + '! ' + bits.join(' '), replace: true, local: { checkin: today }, pending: { type: 'standup', data: { key: q.key, title: q.title } } };
      }
      bits.push('What\'s your plan today?');
      return { line: 'Good morning, ' + n + '! ' + bits.join(' '), replace: true, local: { checkin: today } };
    }
    // 1b. the quick personality quiz, until you've taken it
    var qo = M.quizOffer(ctx);
    if (qo) return qo;
    // 1c. evening check-in: read back today's journal page, then what you learned and what carries forward
    if ((ctx.period === 'evening' || ctx.period === 'supper') && L.evening !== today) {
      var PG = M.todayPage(ctx);
      if (!/quiet day/i.test(PG.log.happened.text)) return { line: 'Evening check-in, ' + n + '. Here\'s what I wrote on today\'s page: ' + PG.log.happened.text + ' Is that right? Tell me anything I missed, or say "looks good".',
        pending: { type: 'evening', data: { step: 0 } }, local: { evening: today } };
    }
    // 2. weekly recap (Sunday evening, or the first visit after)
    var sun = weekKey(today), dueKey = (U.weekday(today) === 0 && ctx.nowMin < 17 * 60) ? U.addDays(sun, -7) : sun, extraLocal = {};
    if (!S.recaps[dueKey] && L.recapTried !== dueKey && U.addDays(dueKey, 3) >= today) {
      var txt = M.recapText(S, U.addDays(dueKey, -6), dueKey);
      if (txt) return { line: txt, events: [{ type: 'recap', data: { week: dueKey, text: txt } }], local: { recapTried: dueKey } };
      extraLocal.recapTried = dueKey;
    }
    // 3. habits: the same one-time reminder on 3+ days lately, at about the same time
    var asked = L.habitAsked || {};
    var hk = Object.keys(S.habits).filter(function (base) {
      if (asked[base]) return false;
      var t = S.tasks[base]; if (t && !t.off && t.repeat !== 'once') return false;
      var days = Object.keys(S.habits[base]).filter(function (d) { return d >= U.addDays(today, -10); });
      if (days.length < 3) return false;
      var mins = days.map(function (d) { return U.hmToMin(S.habits[base][d]); });
      return Math.max.apply(null, mins) - Math.min.apply(null, mins) <= 60;
    })[0];
    if (hk) {
      var dsorted = Object.keys(S.habits[hk]).sort(), lastD = dsorted[dsorted.length - 1], tt = S.tasks[hk + '@' + lastD] || {};
      var title = tt.title || Wd.cap(hk.replace(/-/g, ' ')), time = S.habits[hk][lastD];
      asked[hk] = today;
      return { line: 'I noticed you set "' + title + '" around ' + U.fmtHm(time, ctx.clock24) + ' on a few days lately. Want me to make it a daily routine?',
        pending: { type: 'make_routine', data: { key: hk, title: title, time: time } }, local: Object.assign(extraLocal, { habitAsked: asked }) };
    }
    // 4. a question about a new word, now and then
    var askedW = L.askedWords || {}, rw = M.reviewWords(S, 3).filter(function (w) { return !askedW[w.norm]; })[0];
    if (rw && U.hash32(today + rw.norm) % 3 === 0) {
      askedW[rw.norm] = today;
      return { line: 'By the way, who or what is ' + rw.display + '? A person, a pet, a place, or something else?', pending: { type: 'learn_word', data: { word: rw.display } }, local: Object.assign(extraLocal, { askedWords: askedW }) };
    }
    return extraLocal.recapTried ? { local: extraLocal } : null;
  };

  /* ---------- free conversation: the 21 Questions filter (sure / unsure / just chatting) ---------- */
  var POS = /\b(great|awesome|good|happy|love|loved|fun|excited|nice|amazing|glad|proud|finally|won|win|best|yay|stoked|relaxed|beautiful)\b/g;
  var NEG = /\b(tired|sad|bad|rough|hard|stress|stressed|stressful|angry|mad|sick|hurt|annoyed|worried|lonely|bored|ugh|broke|broken|failed|lost|awful|terrible|exhausted|sucks|frustrated|anxious)\b/g;
  function chat(raw, s, ctx, res, noButler, intent, noSteer) {
    var S = ctx.S, n = S.callMe, words = s.split(/\s+/).length;
    if (/^(hi|hello|hey|yo|sup|howdy|hiya|good (morning|afternoon|evening))\b[!. ]*[a-z]*[!.]*$/.test(s)) { res.say.push(M.greeting(ctx)); return; }
    if (/^(good ?night|gn|night|sleep well|nighty night)\b/.test(s)) { res.say.push(choose(raw, ['Good night, ' + n + '! Sleep tight.', 'Night night! See you tomorrow.', 'Sweet dreams, ' + n + '.'])); return; }
    if (/^(bye|see ya|see you|later|cya|goodbye|gotta go)\b/.test(s)) { res.say.push(choose(raw, ['Bye, ' + n + '! I\'ll be here.', 'See you soon!', 'Later! I\'ll keep busy.'])); return; }
    if (/^(thanks|thank you|thx|ty|appreciate it)\b/.test(s)) { res.say.push(choose(raw, ['Anytime!', 'You got it, ' + n + '.', 'Happy to help!'])); return; }
    if (/^(lol|lmao|haha+|hehe+|rofl)\b/.test(s)) { res.say.push(choose(raw, ['Hehe!', '*giggles*', 'Haha!'])); return; }
    if (/^(i love you|love you|luv you|you'?re (the best|cute|awesome|great|funny|smart|amazing|cool|sweet)|you rock|good (bot|droid|job|boy|girl))\b/.test(s)) { res.say.push(choose(raw, ['Aw, ' + n + '! Right back at you.', 'You\'re the best too!', '*happy beeps*'])); return; }
    if (selfAnswer(raw, s, ctx, res)) return;
    if (T.STOP_RE.test(s) && words <= 5) { res.say.push(choose(raw, ['Okay!', 'Sure thing.', 'Alright!'])); return; }
    if (/\bhow are you\b|\bhow'?s it going\b|\bhow are things\b/.test(s)) {
      var line = choose(raw, ['I\'m good! ', 'Doing great! ', 'Pretty good! ']) + (ctx.activity ? 'Just ' + ctx.activity + '.' : '');
      if (S.growth.readyAtSync) line += ' I feel something big coming... let\'s sync soon!';
      res.say.push(line + ' How about you?'); return;
    }
    if (/\bwhat are you (doing|up to)\b|\bwhatcha doing\b/.test(s)) { res.say.push(ctx.activity ? 'I\'m ' + ctx.activity + '! What are you up to?' : 'Just hanging out! What are you up to?'); return; }
    if (/^(yes|yeah|yep|sure|ok|okay|no|nope|nah|maybe|not really|kind of|kinda)[.!]*$/.test(s)) { res.say.push(choose(raw, ['Okay!', 'Gotcha.', 'Mm-hm!'])); return; }
    if (/^(i'?m (busy|good|fine|ok|okay|not busy)|not (much|busy)|nothing much)/.test(s) && words <= 6) {
      if (/busy/.test(s) && !/not busy/.test(s)) res.say.push('Okay, I\'ll let you work! Tell me later what you got done.');
      else { steer(raw, ctx, res, 'Good to hear!'); }
      return;
    }
    var pos = (s.match(POS) || []).length, neg = (s.match(NEG) || []).length;
    if (HEAVY.test(s) || neg >= 2) { // listen first, then offer one small step
      var care = ['That sounds really heavy, ' + n + '. I\'m here.', 'What feels like the biggest thing on your mind?', 'If you want, we can pick one tiny step together.'];
      if (/\b(depressed|hopeless|worthless|can'?t cope|falling apart)\b/.test(s)) care.push('And if it keeps weighing on you, talking to someone you trust or a counselor can really help.');
      res.pending = { type: 'offer_quest', data: {} };
      res.say.push(care.join(' '));
      return;
    }
    // Sure, it's chatting: "I'm hungry", "I love cars", "I feel tired" -> ask about it
    var st = T.feeling(raw);
    if (st && st.state) { T.start(st, ctx, res); return; }
    var likeTp = T.LIKE_RE.test(likeNorm(s)) ? T.detect(raw, S) : null;
    if (likeTp) { T.start(likeTp, ctx, res); return; }
    // the butler: act when it's sure, ask a 21 Questions question when it isn't
    if (!noButler && B) {
      var today = ctx.today, L = ctx.local || {}, q = L.b21 || {};
      var food = foodItems(raw), d = B.decide(raw, S, true);
      if (food.length && (!d || d.mode === 'offer' || d.cands.indexOf('todo') >= 0)) {
        res.pending = { type: 'b_offer', data: { intent: 'todo', text: raw, items: food } };
        res.say.push('Want me to add ' + listJoin(food) + ' to your shopping list?');
        return;
      }
      if (d && d.mode === 'offer') {
        var od = { intent: d.intent, text: raw };
        if (d.intent === 'todo') { od.title = todoTitle(raw); res.say.push('Sounds like a to-do. Add "' + od.title + '" to your to-do list?'); }
        else if (d.intent === 'goal') res.say.push('That sounds like a goal! Want me to make it a quest with small steps?');
        else res.say.push('Want me to remember that?');
        res.pending = { type: 'b_offer', data: od };
        return;
      }
      if (d && d.mode === 'ask') {
        var pair = d.cands.length >= 2;
        res.pending = { type: 'b_q21', data: { text: raw, cands: d.cands, n: 0, pair: pair } };
        res.local = { b21: { day: today, n: (q.day === today ? q.n || 0 : 0) + 1, t: Date.now() } };
        res.say.push(B.question(pair ? d.cands : [d.cands[0]], 0));
        return;
      }
    }
    // Just chatting. First: a name Aiu doesn't know yet? ("who" comes first)
    var toks = Wd.tokens(raw), ask = null, keyWords = {};
    Object.keys(AIU.art.ACTIVITIES).forEach(function (id) { (AIU.art.ACTIVITIES[id].keys || []).forEach(function (k) { if (s.indexOf(k) >= 0) k.split(' ').forEach(function (w) { keyWords[w] = 1; }); }); });
    toks.forEach(function (t) {
      if (ask || !t.cap || t.first || Wd.COMMON[t.norm] || Wd.STOP[t.norm] || keyWords[lc(t.raw)]) return;
      if (lc(t.raw) === lc(S.totemName) || lc(t.raw) === lc(S.callMe) || S.learned[t.norm] || S.entities[lc(t.raw)]) return;
      if (/^(I|I'm|I've|I'll|OK|TV)$/.test(t.raw)) return;
      if (isActivityWord(t.norm)) return;
      if (D && D.ready) {
        if (D.isProperPlace(t.raw)) { if (!S.learned[lc(t.raw)]) res.events.push({ type: 'learn', data: { word: lc(t.raw), kind: 'place', note: 'a place' } }); return; }
        if (D.isCommonWord(t.raw)) return; // a normal word written with a capital, not a name
      }
      ask = t.raw;
    });
    if (ask) {
      res.say.push((neg > pos ? 'Oof. ' : pos > neg ? 'Nice! ' : '') + 'Wait, who or what is ' + ask + '? A person, a pet, a place, or something else?');
      res.pending = { type: 'learn_word', data: { word: ask } };
      return;
    }
    // Then: who, what, when, where, why and how about what you're talking about
    var tp = T.detect(raw, S, { intent: intent });
    if (tp) { T.start(tp, ctx, res); return; }
    if (noSteer) { res.say.push(choose(raw, ['Nice!', 'Mm-hm! Tell me more any time.', 'Gotcha.'])); return; }
    steer(raw, ctx, res, neg > pos ? choose(raw, ['That sounds rough.', 'Oof, sorry, ' + n + '.']) : pos > neg ? choose(raw, ['Nice!', 'Love that!', 'That\'s awesome!']) : null);
  }
  function likeNorm(s) { return String(s).replace(/\bi'?m\b/g, 'i am').replace(/\bwe'?re\b/g, 'we are').replace(/[!?.]+$/, ''); }

  // Nothing to ask about: keep the conversation on the rails (the current quest), or ask the day's question from the reading.
  function steer(raw, ctx, res, lead) {
    var S = ctx.S, L = ctx.local || {}, now = ctx.now || Date.now();
    lead = lead || choose(raw, P.style(S).f ? ['Mm-hm!', 'I hear you.', 'Aw.'] : ['Mm-hm.', 'Okay!', 'Gotcha.']);
    var q = C.tracked(S);
    if (!q || !C.nextStep(S, q)) q = C.questList(S, 'active').filter(function (x) { return x.kind !== 'idea' && C.nextStep(S, x); })[0];
    if (q && (!L.steerT || now - L.steerT > 30 * 60000)) {
      var ns = C.nextStep(S, q);
      res.local = Object.assign(res.local || {}, { steerT: now });
      res.pending = { type: 'qcheck', data: { key: q.key, title: q.title, step: ns.id, stepTitle: ns.title } };
      res.say.push(lead + ' Quick check on "' + q.title + '": did you get to ' + lc(ns.title) + ' yet?');
      return;
    }
    var mode = ctx.dayMode, MQ = I && mode ? I.MODES[mode] : null;
    res.pending = { type: 'open_q', data: { mode: mode || '' } };
    res.say.push(lead + ' ' + (MQ ? MQ.q : choose(raw + now, ['What\'s on your mind today?', 'What are you up to right now?', 'What\'s been the best part of your day?', 'Anything you want to get done today?'])));
  }

  /* ---------- questions about Aiu itself: a droid's answer, then back to you ---------- */
  function battery(ctx) { var m = ctx.nowMin || 720; return Math.max(15, Math.min(100, Math.round(100 - Math.max(0, m - 360) / 60 * 5))); }
  function selfAnswer(raw, s, ctx, res) {
    var S = ctx.S, n = S.callMe, st = P.style(S), m, pt = S.ptype || {};
    if ((m = /\b(?:are|r) (?:you|u) (hungry|starving|thirsty)\b/.exec(s))) {
      var state = m[1] === 'thirsty' ? 'thirsty' : 'hungry', tp = T.feeling('i am ' + state);
      return T.start(tp, ctx, res, { lead: 'Droids don\'t ' + (state === 'thirsty' ? 'drink' : 'eat') + '. I run on charge, and I\'m at ' + battery(ctx) + '%. What about you?' });
    }
    if ((m = /\b(?:are|r) (?:you|u) (tired|sleepy|ok|okay|alright|good|happy|sad|bored|lonely|mad|angry|scared|busy)\b/.exec(s))) {
      var w = m[1], b = battery(ctx), line;
      if (/tired|sleepy/.test(w)) line = (b < 50 ? 'A little. My battery\'s at ' + b + '%. I recharge while you sleep.' : 'Nope! Battery\'s at ' + b + '%.');
      else if (/sad|lonely|scared|mad|angry/.test(w)) line = 'Not when you\'re around, ' + n + '.';
      else if (w === 'bored') line = 'Never! I\'m ' + (ctx.activity || 'keeping busy') + '.';
      else if (w === 'busy') line = 'Never too busy for you. I\'m ' + (ctx.activity || 'just hanging out') + '.';
      else line = st.e ? 'I\'m great! Talking with you charges me up.' : st.i ? 'I\'m good. Nice and calm in here.' : 'I\'m good!';
      res.say.push(line + ' How about you?');
      return true;
    }
    if (/\b(?:are|r) (?:you|u) (?:real|alive|a robot|a droid|human|an? ai|a person|a computer)\b/.test(s)) {
      res.say.push('I\'m a droid: a little program living on your devices, learning from you. For now my body is pixels. Someday it could be a robot kit that helps around the house!');
      return true;
    }
    if ((m = /^(?:do|d'?you|dont|don'?t) (?:you|u) (like|love|enjoy|hate) (.{2,40}?)\??$/.exec(s))) return T.mirror(m[2].replace(/^(the|a|an)\s+/, ''), 'like', ctx, res);
    if ((m = /^what'?s (?:your|ur) fav(?:ou?rite)? (.{2,30}?)\??$/.exec(s)) || (m = /^what (?:is )?(?:your|ur) fav(?:ou?rite)? (.{2,30}?)\??$/.exec(s))) {
      return T.mirror(m[1], 'fav', ctx, res);
    }
    if (/\b(?:what|which) (?:kind of |type of )?(?:personality|type) (?:are you|do you have)\b|^what'?s your (?:personality|type)\??$/.test(s)) {
      if (!pt.code) { res.say.push('I don\'t have one yet. My personality comes from yours! Want to take the quick personality quiz?'); res.pending = { type: 'pq_offer', data: {} }; return true; }
      res.say.push('I\'m a ' + pt.name + ' (' + pt.code + '), the same as you: ' + pt.desc + ' It grows as you do.');
      return true;
    }
    if (/^(tell me about yourself|what are you|describe yourself|who are you really)\??$/.test(s)) {
      res.say.push('I\'m ' + S.totemName + ', your droid companion' + (S.hatched ? ' (a ' + C.stageName(S.stage) + ')' : '') + '. ' +
        (pt.code ? 'I\'m a ' + pt.name + ', like you: ' + pt.desc + ' ' : 'My personality comes from yours. ') +
        'I keep your library, your quests and your lists, and I learn from everything you tell me. Tell me about something you love, and I\'ll ask you all about it.');
      return true;
    }
    if (/\bhow old are you\b/.test(s)) { res.say.push(S.hatched ? 'I hatched ' + U.fmtDay(U.dayStr(new Date(S.hatchAt))) + ', and I\'m a ' + C.stageName(S.stage) + ' now. How old are you?' : 'I\'m still an egg!'); return true; }
    if (/\bwhere do you live\b/.test(s)) { res.say.push('In my ' + (AIU.art.HOUSES[C.setting(S, 'house', 'cabin')] || 'house').toLowerCase() + ', and on every device you use me on. Where do you live?'); return true; }
    return false;
  }

  /* ---------- the personality keeper ---------- */
  function aboutYou(S) {
    var pt = S.ptype || {}, likes = [], pages = C.topicList(S);
    pages.forEach(function (r) { if (r.feel && (r.feel.v === 'likes' || r.feel.v === 'loves') && likes.length < 5) likes.push(lc(r.title)); });
    var bits = ['You\'re ' + S.callMe + '.'];
    if (pt.code) bits.push('You\'re a ' + pt.name + ' (' + pt.code + '): ' + pt.desc);
    if (likes.length) bits.push('You like ' + listJoin(likes) + '.');
    if (pages.length) bits.push('Your library has ' + pages.length + ' topic page' + (pages.length === 1 ? '' : 's') + ', newest: ' + listJoin(pages.slice(0, 3).map(function (r) { return r.title; })) + '.');
    if (!pt.code && !pages.length) bits.push('That\'s all I know so far. Tell me about something you love!');
    return bits.join(' ');
  }
  function personaCommands(raw, s, ctx, res) {
    var S = ctx.S, pt = S.ptype || {};
    if (/^(?:let'?s (?:do|take) (?:the|a|my) )?(?:personality (?:quiz|test)|(?:re)?take the (?:personality )?quiz|quiz me|redo (?:the|my) personality(?: quiz)?)[.!]*$/.test(s)) {
      if (pt.answered) res.events.push({ type: 'trait', data: { reset: true } });
      res.pending = { type: 'pq', data: { i: 0 } };
      res.say.push((pt.answered ? 'Let\'s retake it! Your new answers replace the old ones. ' : 'Let\'s do it! ') + 'Just answer A or B. ' + P.quizQuestion(0));
      return true;
    }
    if (/^what'?s my (?:personality|type|personality type)\??$|^what (?:personality|type) am i\??$/.test(s)) {
      res.say.push(pt.code ? 'You\'re a ' + pt.name + ' (' + pt.code + '): ' + pt.desc + ' It\'s in the Library under Personality, with your four sliders.' : 'I don\'t know yet! Say "personality quiz" and I\'ll ask you 12 quick questions.');
      return true;
    }
    if (/^what do you know about me\??$|^tell me about me\??$/.test(s)) { res.say.push(aboutYou(S)); return true; }
    return false;
  }

  /* ---------- the daily I Ching reading and the hilltop review ---------- */
  function readingTime(S) { var v = C.setting(S, 'reading', '08:00'); return v === 'off' ? null : v; }
  M.readingTime = readingTime;
  M.dayMode = function (S, day) { var r = (S.reviews || {})[day]; return r ? I.modeOf(r) : null; };
  M.readingDue = function (ctx) {
    var S = ctx.S, at = readingTime(S);
    if (!at || !S.hatched || (S.reviews || {})[ctx.today]) return false;
    return ctx.nowMin >= U.hmToMin(at);
  };
  M.readingLine = function (r) {
    var H = I.info(r.hex), R = r.rel && r.rel !== r.hex ? I.info(r.rel) : null;
    if (!H) return '';
    return 'Today\'s reading is ' + H.n + ', ' + H.name + (r.moving && r.moving.length ? ', changing line' + (r.moving.length > 1 ? 's ' : ' ') + r.moving.join(' and ') : '') + (R ? ', becoming ' + R.n + ', ' + R.name : '') + '. Theme: ' + H.theme + '. ' + H.modern + ' Hilltop principle: ' + H.principle;
  };
  /* ---------- today's journal page (the Hilltop View) by voice ---------- */
  M.todayPage = function (ctx) { return AIU.hilltop.page(ctx.S, ctx.today, { today: ctx.today, nowMin: ctx.nowMin, clock24: ctx.clock24, wx: M.wxText(ctx.weather, ctx.clock24), events: ctx.S.chat }); };
  var JFIELDS = [
    [/^(?:today )?i learned(?: that)? (.{3,})$/, 'learned'], [/^(?:carry forward|carry over|for tomorrow)[:,]?\s+(.{3,})$/, 'carry'],
    [/^(?:what i nourished(?: today)?(?: is| was)?|i nourished|today i nourished)[:,]?\s+(.{3,})$/, 'nourished'], [/^(?:i stopped feeding|what i stopped feeding(?: is| was)?|stop feeding)[:,]?\s+(.{3,})$/, 'stopped'],
    [/^(?:my )?(?:top )?priorities(?: for)?(?: today)?(?: are| is)?[:,]?\s+(.{3,})$/, 'priorities', true], [/^(?:evening result|today in short)[:,]?\s+(.{3,})$/, 'happened'],
    [/^loose ends?[:,]?\s+(.{3,})$/, 'loose']
  ];
  function journalCommands(raw, s, ctx, res) {
    var S = ctx.S, m;
    if (/^(?:read|show|open)(?: me)? (?:my |today'?s )?(?:journal )?page\??$|^today'?s page\??$|^(?:read )?my journal(?: page)?\??$|^what'?s on (?:my|today'?s) page\??$/.test(s)) {
      var P = M.todayPage(ctx), b = ['Today\'s page so far: ' + P.log.happened.text];
      if (P.log.priorities.text) b.push('Priorities: ' + P.log.priorities.text.replace(/\n/g, ' '));
      if (P.loose.length) b.push('Loose end: ' + P.loose[0]);
      if (P.principle) b.push('Hilltop principle: ' + P.principle);
      res.say.push(b.join(' '));
      return true;
    }
    if ((m = /^(?:my )?long[- ]term (?:direction|goal)(?: is)?[:,]?\s+(.{3,})$/i.exec(raw))) {
      res.events.push({ type: 'set', data: { k: 'direction', v: m[1].replace(/[.!]+$/, '') } });
      res.say.push('Got it. That\'s your long-term direction on every journal page now.');
      return true;
    }
    for (var i = 0; i < JFIELDS.length; i++) {
      if ((m = JFIELDS[i][0].exec(s))) {
        var f = JFIELDS[i][1], add = Wd.cap(raw.slice(raw.length - m[1].length).replace(/[.!]+$/, '')), L = M.todayPage(ctx).log[f];
        res.events.push({ type: 'jpage', data: { day: ctx.today, f: f, text: JFIELDS[i][2] || !L.text ? add : L.text + '\n' + add } });
        res.say.push('Added to today\'s page, under "' + L.label + '"');
        return true;
      }
    }
    return false;
  }
  function readingCommands(raw, s, ctx, res) {
    var S = ctx.S, m, rv = (S.reviews || {})[ctx.today];
    if ((m = /^(?:set|move|change|schedule) (?:my |the )?(?:daily )?(?:reading|i ?ching|hilltop review|review)(?: time)?(?: for| to| at)? (.+)$/.exec(s)) || (m = /^(?:daily )?(?:reading|i ?ching|hilltop review) at (.+)$/.exec(s))) {
      var min = M.parseTime(m[1], true);
      if (/\b(off|never|none|no)\b/.test(m[1])) { res.events.push({ type: 'set', data: { k: 'reading', v: 'off' } }); res.say.push('Okay, no daily reading. Say "set my reading for 8am" to bring it back.'); return true; }
      if (min === null) { res.say.push('What time? Like "set my reading for 7am".'); return true; }
      res.events.push({ type: 'set', data: { k: 'reading', v: U.minToHm(min) } });
      res.say.push('Done! Every day at ' + hm(ctx, min) + ' I\'ll cast the I Ching and give you your hilltop review.');
      return true;
    }
    if (/^(?:turn off|stop|cancel) (?:the |my )?(?:daily )?(?:reading|i ?ching|hilltop review)s?$/.test(s)) { res.events.push({ type: 'set', data: { k: 'reading', v: 'off' } }); res.say.push('Okay, no daily reading. Say "set my reading for 8am" to bring it back.'); return true; }
    if (/^(?:cast|do|toss) (?:the |my |today'?s )?(?:reading|i ?ching|coins)(?: now)?[.!]*$/.test(s)) {
      if (rv) { res.say.push('Already cast today! ' + M.readingLine(rv)); return true; }
      res.cast = true; res.say.push('Okay! Tossing the coins...');
      return true;
    }
    if (/\b(?:today'?s|my|the daily|daily) (?:reading|i ?ching|hilltop review)\b|^(?:i ?ching|hilltop review|reading)\??$|^what did the (?:coins|i ?ching) say\??$/.test(s)) {
      if (rv) { res.say.push(/hilltop/.test(s) ? rv.text : M.readingLine(rv) + ' ' + (I.MODES[I.modeOf(rv)] || {}).line); return true; }
      var at = readingTime(S);
      if (at && ctx.nowMin < U.hmToMin(at)) { res.say.push('It\'s set for ' + U.fmtHm(at, ctx.clock24) + '. Want me to cast it now?'); res.pending = { type: 'cast_now', data: {} }; return true; }
      res.cast = true; res.say.push('Let me cast it now. Tossing the coins...');
      return true;
    }
    return false;
  }
  // Weather in words for the Hilltop View: {now: 'Clear, 64°F', today: 'High 71°F, low 52°F; rain likely after 3pm (60%)'}
  M.wxText = function (w, clock24) {
    if (!w || w.source === 'guess' || w.source === 'preview' || !w.label) return { now: '', today: '' };
    var now = Wd.cap(w.text || w.label) + (w.temp !== undefined ? ', ' + w.temp + '°' + (w.units || '') : ''), t = w.today, today = '';
    if (t && t.hi !== undefined) today = 'High ' + t.hi + '°, low ' + t.lo + '°' + (t.rain >= 30 ? '; ' + (t.rain >= 60 ? 'rain likely' : 'chance of rain') + (t.rainAt ? ' from ' + U.fmtHm(t.rainAt, clock24) : '') + ' (' + t.rain + '%)' : '; dry') + (t.text ? '. ' + t.text : '');
    return { now: now, today: today };
  };
  // The daily Hilltop View (the morning part of today's journal page). Returns what Aiu says, plus the page itself.
  M.hilltop = function (ctx, r, meta) {
    var S = ctx.S, today = ctx.today, H = AIU.hilltop; meta = meta || {};
    var wx = meta.wx || M.wxText(ctx.weather, ctx.clock24);
    var rv = { day: today, hex: r.hex, rel: r.rel, vals: r.vals, moving: r.moving, wx: wx, hm: U.minToHm(ctx.nowMin), place: meta.place || '', zone: meta.zone || '' };
    var P = H.page(S, today, { rv: rv, wx: wx, today: today, nowMin: ctx.nowMin, clock24: ctx.clock24 });
    var yday = U.addDays(today, -1), yp = (S.jpages || {})[yday], yh = yp && yp.happened && yp.happened.text ? yp.happened.text : H.summary(S, H.dayData(S, yday, S.chat));
    var text = H.spoken(P, S);
    if (!/quiet day/i.test(yh)) text = text.replace(/^(Hilltop View for \w+\.)/, '$1 Yesterday: ' + yh.split(/\.\s/)[0].replace(/\.?$/, '.'));
    var q = C.tracked(S); if (!q || !C.nextStep(S, q)) q = C.questList(S, 'active').filter(function (x) { return x.kind !== 'idea' && C.nextStep(S, x); })[0];
    var ask = q && P.plan && P.plan.should.some(function (x) { return x.act && x.act.key === q.key; }) ? ' Anything blocking you?' : ''; // the review is also the daily stand-up
    return { text: (text + ask).replace(/\s+/g, ' ').trim(), page: P, rv: rv, mode: I.info(r.hex).mode, hex: r.hex, rel: r.rel, name: I.info(r.hex).name, pending: ask ? { type: 'standup', data: { key: q.key, title: q.title } } : null };
  };
  // "Ask me about this" in the Library: go through a topic page, checking every answer is still up to date.
  M.askTopic = function (ctx, key) {
    var S = ctx.S, rec = (S.topics || {})[key]; if (!rec) return null;
    var res = { say: [], events: [], pending: null, queue: [] }, feel = /^feel/.test(rec.group || '');
    var t = feel ? lc(rec.title.replace(/^Feeling /i, '')) : /^my /i.test(rec.title) ? 'your ' + lc(rec.title.slice(3)) : /^ent-/.test(key) ? rec.title : lc(rec.title);
    T.start({ key: key, title: rec.title, kind: rec.kind, group: rec.group || 'thing', t: t, mode: feel ? 'feel' : 'fact', preset: {}, factW: feel ? { how: 1 } : null, good: rec.group === 'feelgood' },
      ctx, res, { lead: 'Let\'s go through your "' + rec.title + '" page.' });
    return res;
  };
  // "Can I learn your personality?" (once a day, up to 3 times, until you take it)
  M.quizOffer = function (ctx, force) {
    var S = ctx.S, L = ctx.local || {};
    if (!S.hatched || (S.ptype && S.ptype.answered) || (typeof window !== 'undefined' && window.AIU_TEST && window.AIU_TEST.noQuiz)) return null;
    if (!force && (L.pqAsked === ctx.today || (L.pqN || 0) >= 3)) return null;
    return { line: 'Hey ' + S.callMe + ', can I learn your personality? It\'s 12 quick either/or questions, and your type becomes mine. Want to do it now?',
      pending: { type: 'pq_offer', data: {} }, local: { pqAsked: ctx.today, pqN: (L.pqN || 0) + 1 } };
  };
})();
