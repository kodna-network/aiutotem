/* AIU TOTEM - the Hilltop View: your daily journal page.
   Each day has one page. Aiu writes it for you from everything that happened that day (what you said, what you checked off,
   what you added to the library) and it keeps updating until the day is over. You can edit any part of it; your words win.
   The morning part is the daily I Ching reading (see iching.js) read as practical wisdom, not fortune-telling:
   traditional principle -> modern interpretation -> hilltop application. The Journal in the Library is the book of these pages.
   "Hilltop view": step above the day, see the whole terrain, pick what matters, then come back down and do the next right thing.
   Aiu needs no AI model: this file works offline, even on a Raspberry Pi 2. (1.1.0: the plug-in AI was removed from the app;
   H.PROMPT / H.promptData() are kept only so older journal pages with an "AI Hilltop View" still show.) */
(function () {
  'use strict';
  var U = AIU.util, Wd = AIU.words, C = AIU.core, I = AIU.iching;
  var H = AIU.hilltop = {};
  function lc(s) { return String(s || '').toLowerCase(); }
  function lc1(s) { s = String(s || ''); return s.charAt(0).toLowerCase() + s.slice(1); } // "Feed Mochi" -> "feed Mochi"
  function cap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
  function listJoin(a) { return a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
  function you(s) { return AIU.topics ? AIU.topics.you(s) : String(s || ''); }
  function dayOf(t) { return U.dayStr(new Date(t)); }
  function uniq(a) { var o = []; a.forEach(function (x) { if (x && o.indexOf(x) < 0) o.push(x); }); return o; }

  // The daily log (the part you fill in or correct). [key, label]
  H.FIELDS = [
    ['priorities', 'Top priorities'], ['loose', 'Loose ends'], ['nourished', 'What I nourished'], ['stopped', 'What I stopped feeding'],
    ['work', 'Work / money'], ['projects', 'Business / projects'], ['home', 'Home / animals'], ['people', 'Family / people'],
    ['happened', 'What actually happened?'], ['learned', 'What did I learn?'], ['carry', 'What should carry forward tomorrow?']
  ];

  /* ---------- the whole life, not just today's newest problem ---------- */
  H.AREAS = [
    { k: 'body', name: 'Body / basic needs', re: /\b(food|ate|eat|eating|meal|breakfast|lunch|dinner|supper|water|drink|hydrat\w*|sleep|slept|nap|tired|exhausted|energy|exercise|workout|gym|walk(ed)?|run|ran|stretch\w*|doctor|dentist|meds?|medicine|shower|hygiene|sick|headache|sore|health|weight|hungry|thirsty)\b/ },
    { k: 'home', name: 'Home / animals', re: /\b(house|home|clean\w*|laundry|dishes|trash|garbage|repair\w*|fix\w*|leak\w*|roof|yard|lawn|mow\w*|garden\w*|gutters?|sink|toilet|furnace|heater|a\/?c|plumb\w*|paint\w*|fence|gate|coop|chickens?|hens?|dogs?|cats?|puppy|kitten|pets?|litter|feed(ing)?|vet)\b/ },
    { k: 'money', name: 'Money / work', re: /\b(money|pay|paid|payday|bills?|rent|mortgage|income|job|work(ed|ing)?|gig|shifts?|clients?|invoices?|sell|sold|sales?|budget|bank|spend|spent|costs?|price|savings?|save|earn\w*|paycheck|tax(es)?|insurance|loan|debt|\$\d+)\b/ },
    { k: 'vehicles', name: 'Vehicles / getting around', re: /\b(car|truck|van|suv|jeep|bike|motorcycle|scooter|tires?|oil change|brakes?|gas|fuel|mechanic|registration|inspection|drive|driving|battery)\b/ },
    { k: 'business', name: 'Business / brand', re: /\b(business|brand|products?|website|online store|etsy|shopify|sales channels?|customers?|orders?|launch|listing|marketing|documentation|docs|catalog|prototype|samples?)\b/ },
    { k: 'projects', name: 'Creative / tech projects', re: /\b(projects?|build\w*|design\w*|code|coding|app|software|3d|print\w*|blender|cad|model(ing)?|electronics|arduino|raspberry pi|music|video|art|drawing|writing|book|game dev)\b/ },
    { k: 'workspace', name: 'Workspace', re: /\b(shed|garage|workshop|workbench|tools?|toolbox|desk|office|workspace|basement|crawl ?space|storage|organi[sz]\w*|declutter\w*|shelves|equipment)\b/ },
    { k: 'people', name: 'Family / relationships', re: /\b(mom|mother|dad|father|wife|husband|partner|girlfriend|boyfriend|kids?|son|daughter|brother|sister|family|friends?|neighbou?r|cousin|aunt|uncle|grandma|grandpa|boss|coworkers?)\b/ }
  ];
  function areaWords(S) { // your own pets, people and vehicles count too
    var ex = { home: [], people: [], vehicles: [] };
    Object.keys(S.entities || {}).forEach(function (k) {
      var e = S.entities[k]; if (e.hidden) return;
      if (e.kind === 'pet') ex.home.push(lc(e.name));
      else if (e.kind === 'person') ex.people.push(lc(e.name));
      else if (e.kind === 'vehicle') ex.vehicles.push(lc(e.name));
    });
    return ex;
  }
  H.areasOf = function (text, S, ex) {
    var s = ' ' + lc(text) + ' ', out = []; ex = ex || areaWords(S || {});
    H.AREAS.forEach(function (A) {
      var hit = A.re.test(s) || (ex[A.k] || []).some(function (w) { return w && s.indexOf(' ' + w + ' ') >= 0; });
      if (hit) out.push(A.k);
    });
    return out;
  };

  /* ---------- what happened on a day (from the engine, plus that day's words) ---------- */
  var CMD = /^(please )?(remember|remind|wake|add|put|cancel|stop|delete|remove|show|call me|my name|dear diary|journal|note|help|yes|no|ok|okay|skip|that'?s all)\b|\?\s*$/i;
  H.dayData = function (S, day, events) {
    var D = { day: day, said: [], stories: [], tasksDone: [], steps: [], questsNew: [], questsDone: [], questsAside: [], added: [], checked: [], answers: [], logs: [], feelings: [], memories: [], learned: [], notes: [] };
    (events || []).forEach(function (e) {
      if (e.d !== day && dayOf(e.t) !== day) return;
      var t = String((e.data && e.data.text) || '').trim(); if (!t) return;
      if (e.type === 'say' && !CMD.test(t)) D.said.push(t);
      if (e.type === 'journal') D.stories.push(e);
    });
    Object.keys(S.done || {}).forEach(function (k) { if (k.slice(-10) === day) { var t = (S.tasks || {})[k.slice(0, -11)]; D.tasksDone.push(t ? t.title : k.slice(0, -11).replace(/-/g, ' ')); } });
    Object.keys(S.qsteps || {}).forEach(function (k) {
      var st = S.qsteps[k]; if (!st.done || dayOf(st.t) !== day) return;
      var qk = k.split('|')[0], sid = k.split('|')[1], q = S.quests[qk]; if (!q) return;
      var step = (q.steps || []).filter(function (x) { return x.id === sid; })[0];
      D.steps.push({ quest: q.title, step: step ? step.title : sid });
    });
    C.questList(S).forEach(function (q) {
      if (dayOf(q.first) === day) D.questsNew.push(q.title);
      if (q.stateM && dayOf(q.stateM.t) === day) { if (q.state === 'done') D.questsDone.push(q.title); if (q.state === 'dropped') D.questsAside.push(q.title); }
    });
    Object.keys(S.lists || {}).forEach(function (L) {
      Object.keys(S.lists[L]).forEach(function (k) {
        var r = S.lists[L][k]; if (r.removed) return;
        if (r.addM && dayOf(r.addM.t) === day) D.added.push({ list: L, item: r.item });
        if (r.done && r.doneM && dayOf(r.doneM.t) === day) D.checked.push({ list: L, item: r.item });
      });
    });
    C.topicList(S).forEach(function (r) {
      Object.keys(r.ans).forEach(function (w) { r.ans[w].forEach(function (x) { if (dayOf(x.t) === day && x.q !== '(you said)') D.answers.push({ key: r.key, title: r.title, group: r.group, w: w, a: x.a }); }); });
      Object.keys(r.logs).forEach(function (sid) { var l = r.logs[sid]; if (l.day === day) (/^feel/.test(r.group) ? D.feelings : D.logs).push({ key: r.key, title: r.title, t: r.title.replace(/^Feeling /, ''), a: l.a, tense: l.tense }); });
    });
    (S.memories || []).forEach(function (e) { if ((e.d || dayOf(e.t)) === day) D.memories.push(e.data.text); });
    Object.keys(S.learned || {}).forEach(function (w) { var L = S.learned[w]; if (L.kind !== 'skip' && dayOf(L.t) === day) D.learned.push(w); });
    Object.keys(S.qnotes || {}).forEach(function (qk) { var N = S.qnotes[qk]; Object.keys(N).forEach(function (id) { var n = N[id]; if (!n.removed && dayOf(n.t) === day && S.quests[qk]) D.notes.push({ quest: S.quests[qk].title, text: n.text, tag: n.tag }); }); });
    (S.journal || []).forEach(function (e) { if (e.d === day && !D.stories.some(function (x) { return x.id === e.id; })) D.stories.push(e); });
    return D;
  };

  // "What actually happened?" in a few sentences
  H.summary = function (S, D) {
    var bits = [], talked = uniq(D.answers.map(function (a) { return a.title; }).concat(D.logs.map(function (l) { return l.title; }))).filter(function (t) { return !/^Feeling /.test(t); });
    if (talked.length) bits.push('You talked about ' + listJoin(talked.slice(0, 4).map(lc)) + '.');
    D.logs.slice(0, 2).forEach(function (l) {
      var p = []; if (l.a.who) p.push('with ' + you(l.a.who.a)); if (l.a.where) p.push(you(l.a.where.a).replace(/^(?!at |in |on |to )/, 'at ')); if (l.a.how) p.push('(' + you(l.a.how.a) + ')');
      if (p.length) bits.push(cap(l.title) + ' ' + p.join(' ') + '.');
    });
    var did = [];
    if (D.tasksDone.length) did.push('got done: ' + listJoin(D.tasksDone.slice(0, 3).map(lc1)));
    if (D.steps.length) did.push('checked off ' + listJoin(D.steps.slice(0, 3).map(function (x) { return '"' + lc(x.step) + '" (' + x.quest + ')'; })));
    if (D.questsDone.length) did.push('completed the quest "' + D.questsDone[0] + '"');
    if (D.questsNew.length) did.push('started "' + D.questsNew[0] + '"');
    if (did.length) bits.push('You ' + listJoin(did) + '.');
    var todo = D.added.filter(function (x) { return x.list === 'to-do'; }).map(function (x) { return x.item; }), shop = D.added.filter(function (x) { return x.list === 'shopping'; }).map(function (x) { return x.item; });
    if (todo.length) bits.push('New on your to-do list: ' + listJoin(todo.slice(0, 3).map(lc)) + '.');
    if (shop.length) bits.push('Shopping list: ' + listJoin(shop.slice(0, 4)) + '.');
    if (D.checked.length) bits.push('Got ' + listJoin(D.checked.slice(0, 3).map(function (x) { return x.item; })) + ' done.');
    D.feelings.slice(0, 2).forEach(function (f) { bits.push('You felt ' + f.t + (f.a.why ? ' (' + you(f.a.why.a) + ')' : '') + '.'); });
    if (D.stories.length) bits.push('You wrote ' + D.stories.length + ' stor' + (D.stories.length === 1 ? 'y' : 'ies') + '.');
    if (!bits.length && D.said.length) bits.push('We talked (' + D.said.length + ' message' + (D.said.length === 1 ? '' : 's') + ').');
    return bits.join(' ') || 'A quiet day. Nothing logged yet.';
  };

  /* ---------- the page ---------- */
  function zoneName(tz) {
    try { var p = new Intl.DateTimeFormat('en-US', { timeZone: tz || undefined, timeZoneName: 'long' }).formatToParts(new Date()); var z = p.filter(function (x) { return x.type === 'timeZoneName'; })[0]; if (z) return z.value.replace(/ (Standard|Daylight) Time$/, ' Time'); } catch (e) {}
    return U.zoneLabel(tz);
  }
  H.zoneName = zoneName;
  function longDate(day) { var d = U.dayToDate(day), M = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']; return U.DAYNAMES[d.getDay()] + ', ' + M[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear(); }
  H.castLine = function (rv) {
    var X = I.info(rv.hex), R = rv.rel && rv.rel !== rv.hex ? I.info(rv.rel) : null;
    return rv.hex + ' ' + X.name + ((rv.moving || []).length ? ', line' + (rv.moving.length > 1 ? 's ' : ' ') + rv.moving.join(', ') : ', no changing lines') + (R ? ' → ' + R.n + ' ' + R.name : '');
  };
  // opts: {events, rv, wx: {now, today}, place, tz, today, nowMin, clock24}
  H.page = function (S, day, opts) {
    opts = opts || {};
    var today = opts.today || U.dayStr(), isToday = day === today, rv = opts.rv || (S.reviews || {})[day] || null;
    var D = H.dayData(S, day, opts.events || S.chat), jp = (S.jpages || {})[day] || {}, ex = areaWords(S);
    var X = rv ? I.info(rv.hex) : null, R = rv && rv.rel && rv.rel !== rv.hex ? I.info(rv.rel) : null;
    var city = C.setting(S, 'city', null), wx = (rv && rv.wx) || (isToday ? opts.wx : null) || {};
    var P = { day: day, isToday: isToday, title: 'Hilltop View: ' + longDate(day), D: D };
    P.stamp = [rv && rv.hm ? U.fmtHm(rv.hm, opts.clock24) : isToday ? U.fmtHm(U.minToHm(opts.nowMin || 0), opts.clock24) : '', (rv && rv.place) || (city && city.name) || '', (rv && rv.zone) || zoneName(city && city.tz)].filter(Boolean).join(' · ');
    P.weather = wx.now || ''; P.forecast = wx.today || '';
    P.direction = C.setting(S, 'direction', '');
    // I Ching, read as practical wisdom
    if (X) {
      P.cast = { hex: rv.hex, name: X.name, pinyin: X.pinyin, theme: X.theme, moving: rv.moving || [], rel: R ? R.n : null, relName: R ? R.name : '', vals: rv.vals, line: H.castLine(rv), tri: I.trigramsOf(rv.hex) };
      P.interp = [['Traditional principle', X.meaning], ['Modern interpretation', X.modern], ['Hilltop application', X.advice]];
      P.lines = (rv.moving || []).map(function (n) { var L = I.LINEPOS[n]; return 'Line ' + n + ' (' + L[0] + '): in ' + X.name + ', the change is in ' + L[1] + '.'; });
      if (!P.lines.length) P.lines.push('No changing lines: the situation is steady. Take the reading as it is.');
      P.transformed = R ? 'Where it\'s heading: ' + R.n + ', ' + R.name + ' (' + R.theme + '). ' + R.meaning + ' ' + R.modern : '';
      P.principle = X.principle;
      P.theme = X.theme;
    }
    // continuity: recurring lessons, unfinished things (only when the connection is real)
    P.continuity = continuity(S, day, rv, X);
    // the whole life
    var open = C.listItems(S, 'to-do').filter(function (x) { return !x.done; }), quests = C.questList(S, 'active').filter(function (q) { return q.kind !== 'idea'; });
    var dayTexts = D.said.concat(D.answers.map(function (a) { return a.title + ' ' + a.a; }), D.logs.map(function (l) { return l.title; }), D.stories.map(function (e) { return e.data.text; }), D.tasksDone, D.steps.map(function (x) { return x.quest + ' ' + x.step; }), D.added.map(function (x) { return x.item; }));
    var touched = {}; dayTexts.forEach(function (t) { H.areasOf(t, S, ex).forEach(function (k) { touched[k] = (touched[k] || 0) + 1; }); });
    P.areas = []; P.quiet = [];
    H.AREAS.forEach(function (A) {
      var lines = [], items = open.filter(function (x) { return H.areasOf(x.item, S, ex).indexOf(A.k) >= 0; });
      var qs = quests.filter(function (q) { return H.areasOf(q.title + ' ' + (q.subject || ''), S, ex).indexOf(A.k) >= 0; });
      if (A.k === 'home') { var pets = Object.keys(S.entities || {}).map(function (k) { return S.entities[k]; }).filter(function (e) { return e.kind === 'pet' && !e.hidden; }); if (pets.length) lines.push('Animals: ' + listJoin(pets.map(function (p) { return p.name + (p.species ? ' (' + p.species + ')' : ''); })) + '. Fed, watered and cared for?'); }
      if (A.k === 'vehicles') Object.keys(S.entities || {}).forEach(function (k) { var e = S.entities[k]; if (e.kind === 'vehicle' && !e.hidden) { var nt = ((S.notes || {})[k] || []).filter(function (n) { return !n.done; }); lines.push(e.name + (nt.length ? ': ' + nt.slice(-2).map(function (n) { return n.text; }).join('; ') : ': anything it needs before it gets expensive?')); } });
      if (A.k === 'people') { var ppl = Object.keys(S.entities || {}).map(function (k) { return S.entities[k]; }).filter(function (e) { return e.kind === 'person' && !e.hidden; }); if (ppl.length && (touched.people || items.length)) lines.push('People in your life: ' + listJoin(ppl.slice(0, 5).map(function (p) { return p.name + (p.relation ? ' (' + p.relation + ')' : ''); })) + '.'); }
      if (A.k === 'projects') {
        var act = quests.filter(function (q) { return q.kind === 'main' || q.kind === 'side'; });
        if (act.length > 3) lines.push(act.length + ' quests are open. Pick the one that deserves nourishment today; the rest can wait (set aside is fine).');
      }
      qs.slice(0, 2).forEach(function (q) { var ns = C.nextStep(S, q); lines.push('Quest "' + q.title + '"' + (ns ? ': next, ' + lc(ns.title) : ': no next step yet') + '.'); });
      if (items.length) lines.push('To-do: ' + listJoin(items.slice(0, 3).map(function (x) { return x.item; })) + (items.length > 3 ? ', and ' + (items.length - 3) + ' more' : '') + '.');
      if (touched[A.k]) lines.push('Came up ' + touched[A.k] + ' time' + (touched[A.k] === 1 ? '' : 's') + (isToday ? ' today.' : ' that day.'));
      if (lines.length) P.areas.push({ k: A.k, name: A.name, lines: lines.slice(0, 4) });
      else P.quiet.push(A.name.split(' / ')[0]);
    });
    // "What am I feeding?"
    if (X && (X.feed || /rest|order/.test(X.mode))) P.feeding = ['What am I feeding?', 'What is feeding me?', 'What is consuming me without giving anything back?', 'What deserves more nourishment?', 'What deserves less?'];
    // leave no one behind
    P.loose = looseEnds(S, day, today, isToday, open, quests, touched);
    // today's practical plan (small on purpose)
    P.plan = isToday ? plan(S, day, opts, open, quests) : null;
    // the daily log: Aiu's version, unless you wrote your own
    var auto = autoLog(S, D, P, ex, touched, open);
    P.log = {};
    H.FIELDS.concat([['theme', 'Theme']]).forEach(function (f) {
      var u = jp[f[0]], a = auto[f[0]] || '';
      P.log[f[0]] = { label: f[1], auto: a, user: u && u.text ? u.text : '', text: u && u.text ? u.text : a, edited: !!(u && u.text), t: u ? u.t : 0 };
    });
    P.ai = jp.ai && jp.ai.text ? jp.ai.text : '';
    P.stories = D.stories;
    return P;
  };
  function continuity(S, day, rv, X) {
    var out = [], R = S.reviews || {}, past = Object.keys(R).filter(function (d) { return d < day && d >= U.addDays(day, -30); }).sort().reverse();
    if (X) {
      var same = past.filter(function (d) { return R[d].hex === rv.hex; })[0];
      if (same) out.push('You also cast ' + X.name + ' on ' + U.fmtDay(same) + '. The lesson is coming back around.');
      var wk = past.filter(function (d) { return d >= U.addDays(day, -6); }), modes = {};
      wk.forEach(function (d) { var m = I.modeOf(R[d]); modes[m] = (modes[m] || 0) + 1; });
      if ((modes[X.mode] || 0) >= 2) out.push('This is ' + (modes[X.mode] + 1) + ' "' + I.MODES[X.mode].label + '" days in a week. It keeps saying the same thing.');
      var yd = R[U.addDays(day, -1)];
      if (yd && yd.hex !== rv.hex) { var YX = I.info(yd.hex); if (YX) out.push('Yesterday was ' + YX.name + ' (' + YX.theme + '); today is ' + X.name + ' (' + X.theme + ').'); }
    }
    // things you keep saying you'll do
    var old = C.listItems(S, 'to-do').filter(function (x) { return !x.done && x.addM && U.dayStr(new Date(x.addM.t)) <= U.addDays(day, -7); }).sort(function (a, b) { return a.addM.t - b.addM.t; });
    old.slice(0, 2).forEach(function (x) { out.push('"' + x.item + '" has been on your to-do list since ' + U.fmtDay(dayOf(x.addM.t)) + '.'); });
    C.questList(S, 'active').filter(function (q) { return q.kind !== 'idea'; }).forEach(function (q) {
      var last = q.first; C.questSteps(S, q).forEach(function (st) { var m = S.qsteps[q.key + '|' + st.id]; if (m && m.t > last) last = m.t; });
      if (q.setM && q.setM.t > last) last = q.setM.t;
      C.questNotes(S, q.key).forEach(function (n) { if (n.t > last) last = n.t; });
      if (dayOf(last) <= U.addDays(day, -7) && out.length < 6) out.push('"' + q.title + '" hasn\'t moved since ' + U.fmtDay(dayOf(last)) + '. Keep it, or set it aside?');
    });
    // patterns of depletion
    C.topicList(S).filter(function (r) { return r.group === 'feelbad'; }).forEach(function (r) {
      var n = Object.keys(r.logs).filter(function (k) { return r.logs[k].day >= U.addDays(day, -6) && r.logs[k].day <= day; }).length;
      if (n >= 3) out.push(cap(r.title.replace(/^Feeling /, '')) + ' came up ' + n + ' times this week. What is draining you?');
    });
    return out.slice(0, 6);
  }
  var DUE = /\b(bill|pay|rent|mortgage|due|renew|registration|insurance|tax|appointment|deadline|refill|prescription)\b/i;
  function looseEnds(S, day, today, isToday, open, quests, touched) {
    var out = [];
    if (isToday) {
      var yday = U.addDays(day, -1), missed = C.occurrences(S, yday).filter(function (o) { return !o.done && o.kind !== 'wake'; });
      if (missed.length) out.push('Yesterday: ' + listJoin(missed.slice(0, 3).map(function (o) { return lc(o.title); })) + ' didn\'t get checked off.');
    }
    open.filter(function (x) { return DUE.test(x.item); }).slice(0, 2).forEach(function (x) { out.push('Don\'t let this slip: ' + x.item + '.'); });
    var pets = Object.keys(S.entities || {}).map(function (k) { return S.entities[k]; }).filter(function (e) { return e.kind === 'pet' && !e.hidden; });
    var feedTask = Object.keys(S.tasks || {}).some(function (k) { var t = S.tasks[k]; return !t.off && /feed|water/i.test(t.title); });
    if (pets.length && !feedTask) out.push('Animals fed and watered? (' + listJoin(pets.map(function (p) { return p.name; })) + ')');
    var shop = C.listItems(S, 'shopping').filter(function (x) { return !x.done; });
    if (shop.length >= 3) out.push('Shopping list has ' + shop.length + ' things on it.');
    var names = { body: 'Body', home: 'Home', money: 'Money', vehicles: 'Vehicles', people: 'Family' }, quiet = Object.keys(names).filter(function (k) { return !touched[k]; });
    if (quiet.length && quiet.length < 5) out.push('Quiet today: ' + listJoin(quiet.map(function (k) { return names[k]; })) + '. Anything there that could fall through the cracks?');
    return out.slice(0, 5);
  }
  function plan(S, day, opts, open, quests) {
    var must = [], should = [], energy = [], nowMin = opts.nowMin || 0;
    C.occurrences(S, day).filter(function (o) { return !o.done && o.kind !== 'wake'; }).slice(0, 2).forEach(function (o) { must.push({ text: o.title + ' (' + U.fmtHm(o.time, opts.clock24) + ')', act: { type: 'task', key: o.key, date: day } }); });
    open.filter(function (x) { return DUE.test(x.item); }).slice(0, 3 - must.length).forEach(function (x) { must.push({ text: x.item, act: { type: 'todo', list: 'to-do', item: x.item } }); });
    var tq = C.tracked(S); if (!tq || !C.nextStep(S, tq)) tq = quests.filter(function (q) { return C.nextStep(S, q); })[0];
    if (tq) { var ns = C.nextStep(S, tq); should.push({ text: ns.title + ' (' + tq.title + ')', act: { type: 'step', key: tq.key, step: ns.id } }); }
    var oldest = open.filter(function (x) { return !DUE.test(x.item); }).sort(function (a, b) { return (a.addM ? a.addM.t : 0) - (b.addM ? b.addM.t : 0); })[0];
    if (oldest) should.push({ text: oldest.item, act: { type: 'todo', list: 'to-do', item: oldest.item } });
    var side = quests.filter(function (q) { return q !== tq && C.nextStep(S, q); })[0], idea = C.questList(S, 'active').filter(function (q) { return q.kind === 'idea'; })[0];
    if (side) { var n2 = C.nextStep(S, side); energy.push({ text: n2.title + ' (' + side.title + ')', act: { type: 'step', key: side.key, step: n2.id } }); }
    else if (idea) energy.push({ text: 'Your idea: ' + idea.title, act: null });
    return { must: must.slice(0, 3), should: should.slice(0, 2), energy: energy.slice(0, 1) };
  }
  function autoLog(S, D, P, ex, touched, open) {
    var L = {};
    if (P.plan) L.priorities = P.plan.must.concat(P.plan.should).slice(0, 3).map(function (x, i) { return (i + 1) + '. ' + x.text; }).join('\n');
    L.loose = P.loose.join('\n');
    var att = H.AREAS.filter(function (A) { return touched[A.k]; }).map(function (A) { return A.name.split(' / ')[0]; });
    L.nourished = att.length ? 'Attention went to: ' + listJoin(att) + '.' : '';
    L.stopped = D.questsAside.length ? 'Set aside: ' + listJoin(D.questsAside) + '.' : '';
    function areaLine(k) {
      var t = [];
      D.tasksDone.forEach(function (x) { if (H.areasOf(x, S, ex).indexOf(k) >= 0) t.push('done: ' + lc(x)); });
      D.steps.forEach(function (x) { if (H.areasOf(x.quest + ' ' + x.step, S, ex).indexOf(k) >= 0) t.push('step: ' + lc(x.step)); });
      D.added.forEach(function (x) { if (H.areasOf(x.item, S, ex).indexOf(k) >= 0) t.push('added: ' + x.item); });
      D.said.forEach(function (x) { if (t.length < 3 && H.areasOf(x, S, ex).indexOf(k) >= 0) t.push('"' + (x.length > 60 ? x.slice(0, 57) + '...' : x) + '"'); });
      return t.slice(0, 4).join('; ');
    }
    L.work = areaLine('money');
    L.projects = [areaLine('business'), areaLine('projects')].filter(Boolean).join('; ');
    L.home = areaLine('home');
    L.people = areaLine('people');
    L.happened = H.summary(S, D);
    var learned = [];
    D.answers.slice(0, 4).forEach(function (a) { learned.push(a.title + ' (' + a.w + '): ' + a.a); });
    D.memories.slice(0, 2).forEach(function (m) { learned.push('Remembered: ' + m); });
    if (D.learned.length) learned.push('New words: ' + D.learned.slice(0, 4).join(', '));
    L.learned = learned.join('\n');
    var carry = [];
    D.steps.forEach(function (x) { var q = C.questList(S, 'active').filter(function (q2) { return q2.title === x.quest; })[0], ns = q && C.nextStep(S, q); if (ns && carry.length < 3) carry.push('Next for "' + q.title + '": ' + lc(ns.title)); });
    D.notes.filter(function (n) { return n.tag === 'blocker'; }).forEach(function (n) { carry.push('Blocker on "' + n.quest + '": ' + n.text); });
    D.added.filter(function (x) { return x.list === 'to-do'; }).forEach(function (x) { if (carry.length < 5 && open.some(function (o) { return o.item === x.item; })) carry.push('To-do: ' + x.item); });
    L.carry = carry.join('\n');
    L.theme = P.theme || '';
    return L;
  }

  /* ---------- what Aiu says out loud (the pop-up and the chat) ---------- */
  H.spoken = function (P, S) {
    var n = S.callMe, b = [];
    b.push('Hilltop View for ' + U.DAYNAMES[U.dayToDate(P.day).getDay()] + '.');
    if (P.weather) b.push(cap(P.weather) + (P.forecast ? '. Today: ' + P.forecast : '') + '.');
    if (P.cast) {
      b.push('I Ching: ' + P.cast.hex + ', ' + P.cast.name + (P.cast.moving.length ? ', changing line' + (P.cast.moving.length > 1 ? 's ' : ' ') + P.cast.moving.join(' and ') : '') + (P.cast.rel ? ', becoming ' + P.cast.rel + ', ' + P.cast.relName : '') + '. Theme: ' + P.cast.theme + '.');
      b.push(P.interp[1][1]);
    }
    var yd = (S.jpages || {})[U.addDays(P.day, -1)], carry = yd && yd.carry && yd.carry.text;
    if (carry) b.push('From yesterday: ' + carry.split('\n')[0] + '.');
    if (P.plan && P.plan.must.length) b.push('Must do: ' + listJoin(P.plan.must.map(function (x) { return lc1(x.text); })) + '.');
    if (P.plan && P.plan.should.length) b.push('Should do: ' + lc1(P.plan.should[0].text) + '.');
    var plans = P.plan ? P.plan.must.concat(P.plan.should).map(function (x) { return lc(x.text).replace(/ \(.*$/, ''); }) : [];
    var le = P.loose.filter(function (x) { return !plans.some(function (t) { return lc(x).indexOf(t) >= 0; }); })[0];
    if (le) b.push('Loose end: ' + le);
    if (P.principle) b.push('Hilltop principle: ' + P.principle);
    b.push('Your full page is in your Journal, ' + n + '.');
    return b.join(' ').replace(/\.\./g, '.').replace(/\s+/g, ' ');
  };

  /* ---------- plug-and-play AI: the prompt (general, no personal details) + today's data ---------- */
  H.PROMPT = [
    'You are writing my daily HILLTOP VIEW, a continuing life journal. Keep the tone grounded, intelligent, direct and reflective.',
    'Use the "Hilltop View" perspective: step above the immediate chaos, see the entire terrain, identify what matters, then come back down to earth and do the next right thing. Do not merely reassure me. Help me see clearly.',
    '',
    '1. FORMAT',
    'HILLTOP VIEW - [DATE]',
    '[Time] - [My city] - [My time zone]',
    'Weather: [current conditions]',
    'Today: [useful forecast]',
    'I CHING: Hexagram [#] - [Name]',
    'Changing line(s): [line(s)]',
    'One-word theme: [theme]',
    '',
    '2. INTERPRET THE I CHING',
    'Interpret the cast as practical wisdom, not fortune-telling. Explain: the core meaning of the hexagram; the specific meaning of the changing line(s); what the changing line modifies or emphasizes; the practical lesson for today; the transformed hexagram if useful; how today\'s cast connects to the recent sequence of casts. Pay attention to recurring themes across days. Do not treat the I Ching as deterministic prediction: use it as a framework for reflection, discernment and action.',
    'Prefer: Traditional principle -> Modern interpretation -> Hilltop application. Avoid generic horoscope language.',
    '',
    '3. KEEP THE CONTINUITY',
    'This is a continuing life journal. Compare today\'s cast with recent casts when relevant. Look for recurring lessons, unresolved issues, changes in behavior, patterns of nourishment and depletion, trust and discernment, sound vs. unsound situations, avoidance vs. action, overextension, unfinished projects, money patterns, opportunities that are actually becoming concrete, and things I keep saying I will do but haven\'t done. Do not force connections. When a connection is strong, explain why.',
    '',
    '4. REVIEW THE WHOLE LIFE, NOT JUST TODAY\'S NEWEST PROBLEM',
    'Check the major areas:',
    '- BODY / BASIC NEEDS: food, water, sleep, physical condition, hygiene, energy, exercise, avoiding unnecessary depletion.',
    '- HOME / ANIMALS: my animals fed, watered and cared for; house maintenance, cleaning, repairs, anything that could become a bigger problem if ignored.',
    '- MONEY / WORK: current income, work and side gigs, my income target, expenses, vehicle costs, opportunities, unnecessary spending, financial runway, actions that actually increase earning power.',
    '- VEHICLES / GETTING AROUND: each vehicle I rely on, repairs, cleaning, reliability, what needs attention before it gets expensive.',
    '- BUSINESS / BRAND (if I have one): products, website, sales channels, documentation, prototypes, the next concrete milestone.',
    '- CREATIVE / TECH PROJECTS: my active projects. Help prevent endless expansion: say what deserves nourishment and what should wait.',
    '- WORKSPACE: workshop, storage, tools, equipment, organization, cleanliness, safety, and whether the space helps or blocks productive work.',
    '- FAMILY / RELATIONSHIPS: communication, responsibilities, boundaries, follow-through, respect, accountability. Do not turn ordinary disagreements into psychological diagnoses. Sound = consistency, honesty, emotional control, respect, accountability and care. Unsound = chaos, criticism, manipulation, dependency, blame, silence, or constant judgment.',
    '- LONG-TERM DIRECTION: keep sight of my long-term direction (below). Interpret it practically: build skills, build assets, increase earning power, reduce unnecessary dependence, create useful things, protect health and energy, develop judgment, build a sustainable life rather than just surviving the day.',
    '',
    '5. "WHAT AM I FEEDING?"',
    'When the reading involves nourishment, attention, consumption, discipline, reciprocity or discernment, ask: What am I feeding? What is feeding me? What is consuming me without giving anything back? What deserves more nourishment? What deserves less? Apply it to food, media, information, relationships, work, money, habits, projects, attention and emotional patterns. Not every problem needs more effort: sometimes the right move is to stop supplying energy to the wrong thing.',
    '',
    '6. LEAVE NO ONE BEHIND',
    'Before the priorities, do a loose-ends check: what important thing could easily be forgotten today? Include basic responsibilities even when they aren\'t interesting. The goal is not to do everything; it is to keep important parts of life from quietly falling through the cracks.',
    '',
    '7. TODAY\'S PRACTICAL PLAN',
    'Turn the reading into a few concrete actions: MUST DO (really needs to happen today), SHOULD DO (advances the larger direction), IF ENERGY REMAINS (optional). No giant lists. Prefer actions that produce money, prevent losses, maintain the household, protect health and energy, advance important projects, or resolve meaningful loose ends.',
    '',
    '8. HILLTOP PRINCIPLE',
    'End the interpretation with one concise lesson specific to today\'s cast (for example: "Feed the life you want to keep." "Discern before expanding." "Finish what has already been started before opening another door." "Don\'t confuse movement with progress."). No generic motivational quotes.',
    '',
    '9. DAILY LOG',
    'Finish with a short log I can update later: TODAY\'S CAST, THEME, WEATHER, TOP PRIORITIES (1-3), LOOSE ENDS, WHAT I NOURISHED, WHAT I STOPPED FEEDING, WORK / MONEY, BUSINESS / PROJECTS, HOME / ANIMALS, FAMILY / PEOPLE, EVENING RESULT (What actually happened? What did I learn? What should carry forward tomorrow?).'
  ].join('\n');
  // Everything Aiu knows that the reading needs, as plain text.
  H.promptData = function (P, S) {
    var out = ['MY DATA FROM AIU (my journal app)'], R = S.reviews || {};
    out.push('Date: ' + longDate(P.day) + (P.stamp ? ' (' + P.stamp + ')' : ''));
    if (P.weather) out.push('Weather now: ' + P.weather + (P.forecast ? '. Today: ' + P.forecast : ''));
    if (P.cast) {
      out.push('I Ching cast (three coins per line, bottom to top; 6 = old yin, 7 = young yang, 8 = young yin, 9 = old yang): ' + (P.cast.vals || []).join(', '));
      out.push('Hexagram ' + P.cast.hex + ' (' + P.cast.pinyin + ', ' + P.cast.tri.upper + ' over ' + P.cast.tri.lower + ')' + (P.cast.moving.length ? ', changing line(s) ' + P.cast.moving.join(', ') + ', becoming hexagram ' + P.cast.rel : ', no changing lines'));
    }
    var past = Object.keys(R).filter(function (d) { return d < P.day; }).sort().reverse().slice(0, 7);
    if (past.length) out.push('Recent casts: ' + past.map(function (d) { return d + ' hexagram ' + R[d].hex + ((R[d].moving || []).length ? ' line ' + R[d].moving.join('/') + ' -> ' + R[d].rel : ''); }).join('; '));
    out.push('My long-term direction: ' + (P.direction || '(not set yet)'));
    var q = C.questList(S, 'active').map(function (x) { var ns = C.nextStep(S, x); return x.title + (x.kind === 'idea' ? ' (idea)' : '') + (ns ? ' [next: ' + ns.title + ']' : ''); });
    if (q.length) out.push('Open quests/projects: ' + q.join('; '));
    var todo = C.listItems(S, 'to-do').filter(function (x) { return !x.done; }).map(function (x) { return x.item + (x.addM ? ' (since ' + dayOf(x.addM.t) + ')' : ''); });
    if (todo.length) out.push('To-do list: ' + todo.join('; '));
    var shop = C.listItems(S, 'shopping').filter(function (x) { return !x.done; }).map(function (x) { return x.item; });
    if (shop.length) out.push('Shopping list: ' + shop.join(', '));
    var occ = C.occurrences(S, P.day).map(function (o) { return o.time + ' ' + o.title + (o.done ? ' (done)' : ''); });
    if (occ.length) out.push('Today\'s schedule: ' + occ.join('; '));
    var ents = Object.keys(S.entities || {}).map(function (k) { return S.entities[k]; }).filter(function (e) { return !e.hidden; });
    [['pet', 'Animals'], ['person', 'People'], ['vehicle', 'Vehicles']].forEach(function (k) { var l = ents.filter(function (e) { return e.kind === k[0]; }).map(function (e) { return e.name + (e.species ? ' (' + e.species + ')' : e.relation ? ' (' + e.relation + ')' : ''); }); if (l.length) out.push(k[1] + ': ' + l.join(', ')); });
    var yd = (S.jpages || {})[U.addDays(P.day, -1)];
    if (yd) H.FIELDS.forEach(function (f) { if (yd[f[0]] && yd[f[0]].text) out.push('Yesterday - ' + f[1] + ': ' + yd[f[0]].text.replace(/\n/g, ' / ')); });
    out.push('Today so far: ' + P.log.happened.text);
    if (P.continuity.length) out.push('Patterns Aiu noticed: ' + P.continuity.join(' '));
    if (P.loose.length) out.push('Loose ends Aiu noticed: ' + P.loose.join(' '));
    return out.join('\n');
  };
})();
