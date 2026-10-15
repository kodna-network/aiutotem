/* AIU TOTEM - the app: profiles, saving events, checkpoints, syncing, reminders, weather, sound, voice, shop, the scene loop.
   app.E = the engine state (see core.js), app.S = the read-only view the screens and the mind use. */
(function () {
  'use strict';
  var U = AIU.util, C = AIU.core, A = AIU.art, M = AIU.mind, Wd = AIU.words;
  var CFG = window.AIU_CONFIG || { api: 'api.cgi', version: 'dev' };

  var app = AIU.app = {
    cfg: CFG, meta: null, profiles: {}, pid: null, prof: null, store: null,
    E: null, S: null, unsent: [], pending: null, dev: {}, deviceId: null, lsNext: 1, seqNext: 1,
    sync: { state: 'idle', last: 0, err: '' }, weather: null, clockOffset: 0,
    lastInput: 0, mode: null, modeStart: 0, modeUntil: 0, evolve: null, flash: 0, hatching: null,
    version: 0, lines: [], dismissed: {}, seenStage: null, popup: null, f: 0, local: {}, catalog: null, assets: {}
  };

  var DEV_DEFAULTS = { zoom: false, sound: 'knock', voice: false, voiceName: '', notif: false, fps: 8, theme: 'auto', idleMin: 10, deviceName: '', devtools: false, weatherPreview: '', hourPreview: 0,
    mute: false, chirp: true, listen: false, wake: false, tapRead: false, hearOthers: false, textSize: 'normal', aiUrl: '', aiModel: '', aiKey: '',
    voiceURI: '', voiceCheck: 'auto', gabaCoach: true, bubble: 'short', followups: 'few', freeText: 'ask' }; // 1.1.0: tap-to-read starts off (it was easy to trigger by accident)

  function guessDeviceName() {
    var ua = navigator.userAgent || '';
    if (/iPhone/.test(ua)) return 'iPhone';
    if (/iPad|Macintosh.*Mobile/.test(ua)) return 'iPad';
    if (/Android/.test(ua)) return 'Android phone';
    if (/armv7l|aarch64|Raspbian|Raspberry/i.test(ua) || (/Linux arm/.test(navigator.platform || ''))) return 'Raspberry Pi';
    if (/Windows/.test(ua)) return 'Windows PC';
    if (/Mac/.test(ua)) return 'Mac';
    return 'Device';
  }
  app.trueNow = function () { return Date.now() + (Math.abs(app.clockOffset) > 120000 ? app.clockOffset : 0); };

  /* ---------- boot ---------- */
  app.boot = function () {
    return AIU.store.meta().then(function (meta) {
      app.meta = meta;
      return Promise.all([meta.get('deviceId'), meta.get('dev'), meta.get('profiles'), meta.get('active')]);
    }).then(function (r) {
      app.deviceId = r[0] || ('d' + U.id().replace(/[^A-Za-z0-9]/g, '').slice(0, 16));
      if (!r[0]) app.meta.set('deviceId', app.deviceId);
      app.dev = Object.assign({}, DEV_DEFAULTS, r[1] || {});
      if (!app.dev.v110b) { app.dev.v110b = 1; app.dev.mute = false; if (window.innerWidth < 900) app.dev.zoom = true; if (r[1]) app.meta.set('dev', app.dev); } // 1.1.0 final: sound button works; close-up Aiu
      if (!app.dev.v110) { app.dev.v110 = 1; app.dev.voice = false; app.dev.tapRead = false; if (r[1]) app.meta.set('dev', app.dev); } // 1.1.0: Aiu writes in the Log; talking out loud is a choice in Settings
      if (!r[1] && window.innerWidth < 600) app.dev.zoom = true; // phones start with the close-up view
      if (!app.dev.deviceName) app.dev.deviceName = guessDeviceName();
      app.profiles = r[2] || {};
      AIU.ui.applyTheme();
      AIU.store.persist();
      if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(function () {});
      bindGlobal();
      startLoops();
      var m = /^#reset\/([a-z0-9_-]+)\/([0-9a-f]+)$/.exec(location.hash);
      if (m) { AIU.ui.resetScreen(m[1], m[2]); return; }
      if (r[3] && app.profiles[r[3]]) return app.openProfile(r[3]);
      AIU.ui.welcome();
    }).catch(function (err) { AIU.ui.fatal(err); });
  };
  app.saveDev = function () { return app.meta.set('dev', app.dev); };
  app.saveProfiles = function () { return app.meta.set('profiles', app.profiles); };

  /* ---------- opening a Totem: checkpoint + whatever arrived after it ---------- */
  app.openProfile = function (pid) {
    app.pid = pid; app.prof = app.profiles[pid];
    app.S = null; app.popup = null; app.lines = []; app.lastInput = 0; app.assets = {};
    var st;
    return app.meta.set('active', pid).then(function () { return AIU.store.open(pid); }).then(function (s) {
      st = app.store = s;
      return Promise.all([st.get('checkpoint'), st.get('pending'), st.get('seenStage'), st.get('weather'), st.get('dismissed'), st.get('clockOffset'), st.get('local')]);
    }).then(function (r) {
      var cp = r[0];
      app.E = (cp && cp.v === C.VERSION) ? cp : C.newState();
      app.pending = r[1] || null; app.seenStage = (r[2] === undefined ? null : r[2]); app.weather = r[3] || null;
      app.dismissed = r[4] || {}; app.clockOffset = r[5] || 0; app.local = r[6] || {};
      return Promise.all([st.afterLs(app.E.ls), st.maxOf('ls'), st.maxOf('seq'), st.unsent()]);
    }).then(function (r) {
      var newer = r[0].sort(function (a, b) { return (a.ls || 0) - (b.ls || 0); });
      newer.forEach(function (e) { C.apply(app.E, e); });
      app.lsNext = (r[1] || 0) + 1; app.seqNext = (r[2] || 0) + 1;
      app.unsent = r[3] || [];
      return st.afterSeq(app.E.W);
    }).then(function (conf) {
      conf.sort(function (a, b) { return a.seq - b.seq; }).forEach(function (e) { C.confirm(app.E, e); });
      app.rebuild(true);
      app.saveCheckpoint(true);
      loadOwnedAssets();
      setTimeout(app.loadDict, 1500); // the butler's pocket dictionary, after the scene is up
      if (app.prof.token && !app.E.events) {
        AIU.ui.loading('Fetching your Totem...');
        return app.syncNow('open').then(afterOpen, afterOpen);
      }
      afterOpen();
      if (app.prof.token) app.syncNow('open').catch(function () {});
    });
  };
  function afterOpen() {
    AIU.ui.bar(null);
    if (app.prof.token && !app.E.events && app.sync.state !== 'ok') { AIU.ui.cantReach(); return; }
    if (!app.S.egg) AIU.ui.nameEgg(); else { AIU.ui.main(); setTimeout(app.starterQuests, 1500); }
    app.updateWeather(false);
  }

  var cpTimer = null;
  app.saveCheckpoint = function (now) {
    clearTimeout(cpTimer);
    var run = function () {
      if (!app.store || !app.E) return;
      C.compact(app.E, U.dayStr(new Date(app.trueNow())));
      app.store.set('checkpoint', app.E).catch(function () {});
    };
    if (now) run(); else cpTimer = setTimeout(run, 15000);
  };

  /* ---------- events ---------- */
  app.addEvents = function (drafts, quiet) {
    if (!drafts.length) return Promise.resolve([]);
    var t0 = app.trueNow(), list = [], local = !!app.prof.local;
    var away = !local && (navigator.onLine === false || /offline|login|error/.test(app.sync.state)); // made away from the "Poke Center"
    drafts.forEach(function (d, i) {
      var t = t0 + i, dt = new Date(t);
      var e = { id: d.id || U.id(), t: t, d: U.dayStr(dt), h: U.hmStr(dt), dev: app.deviceId, dn: app.dev.deviceName, type: d.type, data: d.data || {}, ls: app.lsNext++, seq: 0 };
      if (local) { e.seq = app.seqNext++; e.rt = t; } else if (away) e.off = 1;
      list.push(e);
    });
    return app.store.put(list).then(function () {
      list.forEach(function (e) {
        C.apply(app.E, e);
        if (local) C.confirm(app.E, e); else app.unsent.push(e);
      });
      app.rebuild();
      app.scheduleSync();
      app.saveCheckpoint();
      if (!quiet) reactTo(list);
      return list;
    });
  };

  // The Totem lives in its city's time zone (Settings > Weather & time), unless this device is set to use its own clock.
  app.applyZone = function () {
    var st = app.E && app.E.settings && app.E.settings.city, city = st ? st.v : null;
    return U.setZone(app.dev && app.dev.tzMode === 'device' ? null : (city && city.tz) || null);
  };
  app.rebuild = function (quiet) {
    app.applyZone();
    var now = app.trueNow();
    app.S = C.view(app.E, app.unsent, { now: now, username: app.prof && app.prof.u });
    // the start screen names each Totem ("Pip (Sprout)") so you always open the one you mean
    if (app.prof && app.S.egg) { var lb = app.S.totemName + ' (' + C.stageName(app.S.stage) + ')'; if (app.prof.label !== lb) { app.prof.label = lb; app.saveProfiles(); } }
    app.version++;
    if (!quiet) checkStage();
    else if (app.seenStage === null && app.S.egg) { app.seenStage = app.S.stage; app.store.set('seenStage', app.S.stage); }
    if (AIU.ui.refresh) AIU.ui.refresh();
    if (!quiet) app.checkStarter();
  };
  // 1.1.0: starter quests (the tour). Made once per Totem after it hatches; their steps check themselves off.
  app.starterQuests = function () {
    if (!app.S || !app.S.hatched || !AIU.starter) return;
    var ev = AIU.starter.createEvents(app.S);
    if (AIU.starter.retitle && app.local.starterV2 !== 4) { ev = ev.concat(AIU.starter.retitle(app.S)); app.local.starterV2 = 4; app.saveLocal(); } // 1.1.0i: menus moved again
    if (ev.length) app.addEvents(ev, true);
  };
  var starterBusy = false;
  app.checkStarter = function () {
    if (starterBusy || !app.S || !app.S.hatched || !AIU.starter) return;
    starterBusy = true;
    setTimeout(function () {
      var r = AIU.starter.check(app.S, app.local);
      if (!r.events.length) { starterBusy = false; return; }
      app.addEvents(r.events).then(function () { starterBusy = false; app.addLine(r.lines.join(' ')); }, function () { starterBusy = false; });
    }, 400);
  };

  function checkStage() {
    var S = app.S;
    if (!S || !S.egg || app.hatching) return;
    if (app.seenStage === null || app.seenStage === undefined) { app.seenStage = S.stage; app.store.set('seenStage', S.stage); return; }
    if (S.stage > app.seenStage) {
      if (app.seenStage === 0) {
        app.flash = 1; app.setMode('hop', 2500);
        app.react('hatch');
        app.beep('chirp');
        setTimeout(function () { app.starterQuests(); }, 3000); // 1.1.0: no quiz pop-up; it's a quest step now
      } else {
        var from = S.forms.filter(function (f) { return f.stage === app.seenStage; })[0] || S.forms[0];
        app.evolve = { from: from, start: Date.now(), dur: 3600 };
        setTimeout(function () {
          app.evolve = null; app.flash = 1; app.setMode('hop', 2000);
          app.react('evolve', C.stageName(app.S.stage) + '!');
          app.beep('chirp');
        }, 3600);
      }
      app.seenStage = S.stage; app.store.set('seenStage', S.stage);
    }
  }

  // Totem lines that are not saved as events (greetings, reminders, notices)
  // Aiu is a droid: everything it says is spoken too (unless muted). speakIt === 'quiet' keeps a line silent.
  // 1.1.0 final: Aiu doesn't chat. Lines are kept quietly (for the record); what you see is an emote (app.react).
  app.addLine = function (text) {
    app.lines.push({ t: Date.now(), who: 'totem', text: text, local: true });
    if (app.lines.length > 40) app.lines.shift();
  };
  /* ---------- emotes: the only way Aiu "talks" now ---------- */
  // 1.1.0i: pixel icons, not emoji ([icon, what Aiu does])
  var EMOTES = {
    hello: [['happy', 'waves'], ['heart', 'bounces'], ['happy', 'happy beeps']],
    pet: [['heart', 'happy wiggle'], ['happy', 'boop!'], ['sparkle', 'spins around'], ['heart', 'snuggles'], ['happy', 'giggles']],
    quest: [['star', 'cheers'], ['flag', 'fist pump'], ['star', 'happy dance']],
    check: [['check', 'nods'], ['check', 'thumbs up']],
    save: [['check', 'nods'], ['pen', 'takes a note']],
    journal: [['book', 'scribbles along'], ['pen', 'reads it twice']],
    calm: [['leaf', 'sighs happily'], ['leaf', 'relaxes']],
    stress: [['bolt', 'fidgets'], ['bolt', 'wobbles']],
    gaba: [['frazzled', 'looks a little frazzled']],
    bills: [['calendar', 'taps the calendar']],
    money: [['coin', 'counts coins']],
    reminder: [['clock', 'knock knock']],
    board: [['board', 'updated the bounty board'], ['board', 'new bounties!'], ['board', 'look at the board!']],
    missed: [['clock', 'tilts head']],
    done: [['star', 'claps']],
    cast: [['yin', 'shakes the coins']],
    hatch: [['egg', 'cracks out of the egg']],
    evolve: [['sparkle', 'glows']],
    hobby: [['bulb', 'gets curious']],
    offline: [['signal', 'looks for a signal']],
    sleepy: [['moon', 'yawns']],
    stressed: [['grumpy', 'is stressed'], ['grumpy', 'grumbles'], ['cloud', 'needs a break']]
  };
  // Tap Aiu = pet Aiu: hearts and a happy hop. Every 10 pets = +1 growth (up to 3 a day).
  app.pet = function () {
    unlockAudio();
    if (!app.S || !app.S.hatched) { app.setMode('hop', 600); app.beep('chirp'); return; }
    app.setMode('hop', 900); app.beep('chirp');
    if (AIU.ui.hearts) AIU.ui.hearts(3);
    if (AIU.gaba && AIU.gaba.stressed(app.S, U.dayStr(new Date(app.trueNow()))) && Math.random() < 0.5) app.react('stressed');
    var L = app.local, d = U.dayStr(new Date(app.trueNow()));
    if (L.petDay !== d) { L.petDay = d; L.petN = 0; L.petPts = 0; }
    L.petN = (L.petN || 0) + 1;
    if (!L.petted) { L.petted = 1; app.checkStarter(); }
    if (L.petN % 10 === 0 && (L.petPts || 0) < 3) { L.petPts = (L.petPts || 0) + 1; app.addEvents([{ type: 'pet', data: { n: 10 } }], true); if (AIU.ui.hearts) setTimeout(function () { AIU.ui.hearts(5); }, 300); }
    app.saveLocal();
  };
  var KIND_PET = { ghost: ['sparkle', 'boo!'], dragon: ['heart', 'puffs smoke'], robot: ['signal', 'beep boop'], beast: ['paw', 'wags'], plant: ['leaf', 'stretches its leaves'], aqua: ['heart', 'blows bubbles'], bug: ['heart', 'buzzes'], golem: ['sparkle', 'sparkles'], flame: ['star', 'flickers'] };
  var HAPPY = { board: 1, hello: 1, pet: 1, quest: 1, check: 1, journal: 1, calm: 1, done: 1, hatch: 1, evolve: 1, hobby: 1, money: 1 };
  app.react = function (kind, extra) {
    if (!app.S || !app.S.hatched) return;
    var list = EMOTES[kind] || EMOTES.pet, e = list[Math.floor(Math.random() * list.length)];
    if (kind === 'pet' && Math.random() < 0.4) { var kp = KIND_PET[A.kindOf(app.S.accentSeed, C.setting(app.S, 'ckind', 'auto'))]; if (kp) e = kp; }
    var t = '*' + e[1] + '*' + (extra ? ' ' + extra : '');
    app.lines.push({ t: Date.now(), who: 'totem', text: t, local: true }); if (app.lines.length > 40) app.lines.shift();
    if (AIU.ui.bubble) AIU.ui.bubble(e[0], e[1] + (extra ? ' ' + extra : ''));
    if (HAPPY[kind]) app.setMode('hop', 1100);
  };
  // What you just did -> one reaction (the biggest thing wins)
  var RANK = { quest: 6, check: 5, money: 4, calm: 4, stress: 4, journal: 3, done: 5, save: 1 };
  function gabaQuestsDone(list) {
    var G = AIU.gaba, d = U.dayStr(new Date(app.trueNow())), ev = [];
    if (!G || !app.S) return;
    list.forEach(function (e) {
      if (e.type !== 'quest_state' || (e.data || {}).state !== 'done') return;
      var q = app.S.quests[e.data.key], m = q && /^gaba:(calm|avoid|food):(.+)$/.exec(q.subject || '');
      if (!m) return;
      var f = G.find(m[2]), item = m[1] === 'avoid' ? 'Skipped: ' + m[2] : m[2], pts = m[1] === 'avoid' ? 8 : f ? Math.abs(f.pts) : 6;
      if (!G.day(app.S, d).some(function (g) { return g.item === item; })) ev.push(G.logEvent(app.S, d, 'calm', item, pts, 'quest'));
    });
    if (ev.length) setTimeout(function () { app.addEvents(ev, true); }, 300);
  }
  function reactTo(list) {
    gabaQuestsDone(list);
    var best = null;
    list.forEach(function (e) {
      var d = e.data || {}, t = e.type, c = null;
      if (t === 'quest_state' && d.state === 'done') c = 'quest';
      else if (t === 'quest_step' && d.done !== false) c = 'quest';
      else if ((t === 'list_check' && d.done !== false) || t === 'task_done') c = 'check';
      else if (t === 'plan_paid' && d.paid) c = 'money';
      else if (t === 'journal') c = 'journal';
      else if (t === 'gaba' && !d.removed && !d.ref) c = d.kind === 'calm' ? 'calm' : 'stress';
      else if (/^(list_add|plan|task_set|quest_set|acct|vault|cv_doc)$/.test(t) && !d.removed) c = 'save';
      if (c && (!best || RANK[c] > RANK[best])) best = c;
    });
    if (best) app.react(best);
  }
  app.saveLocal = function () { return app.store.set('local', app.local); };

  /* ---------- talking ---------- */
  app.ctx = function () {
    var S = app.S, now = new Date(app.trueNow() + (app.dev.hourPreview || 0) * 3600e3), wn = U.wall(now), hr = wn.getHours();
    var w = app.weatherNow(), act = app.activity(now, w);
    return {
      S: S, now: now.getTime(), nowMin: wn.getHours() * 60 + wn.getMinutes(), today: U.dayStr(now), period: A.period(hr),
      activity: act ? A.ACTIVITIES[act.id].label : null, weather: w, pending: app.pending, local: app.local,
      clock24: C.setting(S, 'clock24', false), hatchIn: S.hatchAt ? fmtDur(S.hatchAt - now.getTime()) : '',
      dayMode: M.dayMode(S, U.dayStr(now)), // today's I Ching mode (start, finish, rest, connect, learn, order, wait)
      followups: app.dev.followups || 'few', freeText: app.dev.freeText || 'ask', growth: app.S.growth // 1.1.0: how many who/what/where questions Aiu asks after you mention something
    };
  };
  function fmtDur(ms) {
    if (ms <= 0) return 'any moment';
    var m = Math.ceil(ms / 60000), hh = Math.floor(m / 60);
    return hh ? hh + 'h ' + (m % 60) + 'm' : m + 'm';
  }
  app.fmtDur = fmtDur;

  // Fetch the few old notes a reply might need (the library only keeps an index in memory).
  app.prefetch = function (text) {
    var ids = M.candidates(app.S, text).filter(function (id) { return !M.docCache[id]; });
    if (!ids.length) return Promise.resolve();
    return app.store.getMany(ids).then(function (found) {
      Object.keys(found).forEach(function (id) { var e = found[id]; M.docCache[id] = { id: e.id, t: e.t, d: e.d, type: e.type, data: { text: String((e.data && e.data.text) || '') } }; });
    });
  };

  /* ---------- the butler's dictionary ---------- */
  // The pocket dictionary loads in the background after start-up; words it looks up online are kept on this device.
  app.loadDict = function () {
    if (!AIU.dict || AIU.dict.ready) return Promise.resolve();
    return app.store.get('dictLearned').then(function (lw) {
      AIU.dict.setLearned(lw || {});
      var t = null;
      AIU.dict.onLearn = function (all) { clearTimeout(t); t = setTimeout(function () { app.store.set('dictLearned', all); }, 2000); };
      return AIU.dict.load('dict/pocket.txt?v=' + CFG.version);
    }).catch(function () {});
  };
  // Before answering, the butler checks words it doesn't know in the full dictionary (online, at most ~1.5 seconds).
  app.checkWords = function (text) {
    var D = AIU.dict;
    if (!D || !D.ready || navigator.onLine === false || location.protocol === 'file:') return Promise.resolve();
    var ws = D.unknown(text).slice(0, 3);
    if (!ws.length) return Promise.resolve();
    return Promise.race([Promise.all(ws.map(function (w) { return D.lookup(w).catch(function () {}); })), new Promise(function (r) { setTimeout(r, 1500); })]);
  };

  // You said something (typed, spoken, or a corrected line). opts.editOf = the id of your line you just fixed:
  // that line is updated (the old words stay in the history) and Aiu answers the corrected version.
  app.say = function (text, opts) {
    opts = opts || {};
    text = Wd.clean(text);
    if (!text) return Promise.resolve();
    if (opts.as === 'log' || opts.as === 'quest') text = opts.as + ' entry: ' + text; // the Log's two buttons
    app.wake(true);
    var mine = opts.editOf ? { type: 'line_edit', data: { ref: opts.editOf, text: text.slice(0, 4000) } } : { type: 'say', data: { text: text.slice(0, 4000) } };
    var pd = app.pending, G = AIU.gaba;
    // a GABA follow-up: "did it calm you down or rev you up?"
    if (pd && pd.type === 'gaba_mixed' && G) {
      var low = text.toLowerCase(), k = /\b(calm\w*|relax\w*|chill\w*|good|helped|brake|settled|peaceful|fine|great)\b/.test(low) ? 'calm' : /\b(rev\w*|stress\w*|wired|jitter\w*|anxious|bad|go|worse|amped|tense|edgy)\b/.test(low) ? 'stress' : /\b(skip|neither|both|not sure|dunno|no idea|don'?t know)\b/.test(low) ? 'skip' : null;
      if (k) {
        app.pending = null; app.store.set('pending', null);
        var day = U.dayStr(new Date(app.trueNow())), item = (pd.data || {}).item || 'Something mixed', drafts0 = [mine], line0;
        if (k === 'skip') line0 = 'Okay, no score for that one.';
        else { var hit0 = { kind: k, item: item, pts: k === 'calm' ? 5 : -5 }, r0 = G.reply(app.S, day, hit0); drafts0 = drafts0.concat(r0.events); line0 = r0.line; }
        drafts0.push({ type: 'totem', data: { text: line0 } });
        return app.addEvents(drafts0).then(function () { AIU.ui.bubble('happy', line0); app.speak(line0); });
      }
      app.pending = null;
    }
    return app.prefetch(text).catch(function () {}).then(function () {
      return app.checkWords(text);
    }).then(function () {
      var ctx = app.ctx();
      if (opts.editOf) { var old = (app.S.chat || []).filter(function (e) { return e.id === opts.editOf; })[0]; ctx.editFrom = old ? String(old.data.text || '') : ''; }
      var res = M.respond(text, ctx);
      if (res.local) { Object.assign(app.local, res.local); app.saveLocal(); }
      // a log entry / quest entry is filed as itself, so the plain chat line isn't kept twice
      var drafts = (res.dropSay && !opts.editOf ? [] : [mine]).concat(res.events);
      // GABA coach: notice calming (Brake) or revving (Go) things you say you did
      if (G && app.dev.gabaCoach !== false && app.S.hatched && !res.noGaba) {
        var hit = G.detect(text), recentSame = hit && G.entries(app.S).some(function (g) { return g.item === hit.item && app.trueNow() - g.t < 20 * 60000; });
        var askedLately = hit && hit.kind === 'mixed' && app.local.gabaAsked && app.local.gabaAsked[hit.item] && app.trueNow() - app.local.gabaAsked[hit.item] < 4 * 3600000;
        var funnelQ = res.pending && res.pending.type === 'funnel';
        if (hit && hit.kind === 'mixed' && funnelQ) { res.pending = null; res.say = res.say.filter(function (l) { return !/log entry or a quest entry\?$/.test(l); }); } // GABA's question first
        if (hit && !recentSame && !askedLately && !(hit.kind === 'mixed' && res.pending)) {
          var gr = G.reply(app.S, ctx.today, hit);
          drafts = drafts.concat(gr.events);
          if (res.pending && res.pending.type === 'funnel' && res.say.length) res.say.splice(res.say.length - 1, 0, gr.line); else res.say.push(gr.line);
          if (gr.pending) { res.pending = gr.pending; app.local.gabaAsked = app.local.gabaAsked || {}; app.local.gabaAsked[hit.item] = app.trueNow(); app.saveLocal(); }
        }
      }
      var reply = res.say.join(' ');
      if (reply) drafts.push({ type: 'totem', data: { text: reply } });
      app.pending = res.pending || null;
      app.store.set('pending', app.pending);
      return app.addEvents(drafts).then(function () {
        if (reply) { AIU.ui.bubble('happy', reply); app.speak(reply); app.setMode('hop', 900); }
        if (res.cast) app.castReading(true);
      });
    });
  };
  // Fix or delete any line in the conversation (yours or Aiu's). Nothing is truly erased: the history keeps it.
  app.editLine = function (id, text) { return app.addEvents([{ type: 'line_edit', data: { ref: id, text: String(text || '').slice(0, 4000) } }]); };
  app.deleteLine = function (id) { return app.addEvents([{ type: 'line_hide', data: { ref: id, hidden: true } }]); };
  app.undeleteLine = function (id) { return app.addEvents([{ type: 'line_hide', data: { ref: id, hidden: false } }]); };
  app.forgetLocalLine = function (t) { app.lines = app.lines.filter(function (l) { return l.t !== t; }); if (AIU.ui.refreshChat) AIU.ui.refreshChat(); };
  // Log a GABA thing from a button (Planner > Self > GABA)
  app.logGaba = function (kind, item, pts, note) {
    var G = AIU.gaba, day = U.dayStr(new Date(app.trueNow())), r = G.reply(app.S, day, { kind: kind, item: item, pts: pts });
    if (note && r.events[0]) r.events[0].data.note = note;
    return app.addEvents(r.events).then(function () { app.addLine(r.line); });
  };

  // Aiu starts a conversation itself (from a button): same as a reply, without anything said first.
  app.askTopic = function (key) {
    var res = M.askTopic(app.ctx(), key); if (!res) return Promise.resolve();
    app.pending = res.pending || null; app.store.set('pending', app.pending);
    var reply = res.say.join(' '), drafts = res.events.slice();
    if (reply) drafts.push({ type: 'totem', data: { text: reply } });
    return app.addEvents(drafts).then(function () { if (reply) { AIU.ui.bubble('happy', reply); app.speak(reply); } });
  };
  app.journal = function (text) {
    text = String(text || '').trim();
    if (!text) return Promise.resolve();
    var before = app.S.growth.confirmed + app.S.growth.pending;
    var G = AIU.gaba, dj = U.dayStr(new Date(app.trueNow())), extra = [], hit = null;
    if (G && app.dev.gabaCoach !== false) { // what you wrote can move the GABA bar
      if (text.length >= 40 && !G.day(app.S, dj).some(function (g) { return g.item === 'Journaling'; })) extra.push(G.logEvent(app.S, dj, 'calm', 'Journaling', 8)); // writing is a Brake thing (once a day)
      hit = G.detect(text);
      if (hit && hit.kind !== 'mixed' && !G.day(app.S, dj).some(function (g) { return g.item === hit.item; })) extra.push(G.logEvent(app.S, dj, hit.kind, hit.item, hit.pts));
    }
    var unl = M.findUnlocks(text, app.S);
    unl.forEach(function (id) { extra.push({ type: 'unlock', data: { activity: id } }); });
    return app.addEvents([{ type: 'journal', data: { text: text.slice(0, 20000) } }].concat(extra), true).then(function () {
      var gained = app.S.growth.confirmed + app.S.growth.pending - before;
      app.react(unl.length ? 'hobby' : 'journal', gained > 0 ? '+' + gained : '');
      return { mixed: hit && hit.kind === 'mixed' ? hit.item : null, gained: gained };
    });
  };

  app.setSetting = function (k, v) { return app.addEvents([{ type: 'set', data: { k: k, v: v } }]); };

  /* ---------- waking, greeting, and doing things on its own ---------- */
  app.wake = function (fromTyping) {
    var now = Date.now(), idle = !app.lastInput || now - app.lastInput > app.dev.idleMin * 60000;
    app.lastInput = now;
    unlockAudio();
    if (idle && app.S && app.S.egg && app.S.hatched && AIU.ui.onMain && !fromTyping && !app.hatching) {
      var ctx = app.ctx(), extra = M.autonomy(ctx); // (only its record-keeping: no words)
      if (extra) {
        if (extra.local) { Object.assign(app.local, extra.local); app.saveLocal(); }
        if (extra.events && extra.events.length) app.addEvents(extra.events, true);
      }
      app.setMode('greet', 3200);
      app.react(ctx.period === 'bedtime' || ctx.period === 'night' ? 'sleepy' : 'hello');
      app.beep('chirp');
      var today = U.dayStr(new Date(app.trueNow()));
      if (AIU.planner && app.local.billsSaid !== today && AIU.planner.billsDue(app.S, today, 3).length) { app.local.billsSaid = today; app.saveLocal(); setTimeout(function () { app.react('bills'); }, 3500); }
    }
  };
  app.setMode = function (mode, ms) { app.mode = mode; app.modeStart = Date.now(); app.modeUntil = Date.now() + ms; };
  app.startHatch = function () {
    app.seenStage = 0; app.store.set('seenStage', 0);
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { window.scrollTo(0, 0); } // watch it hatch
    app.hatching = { start: Date.now(), dur: 2800 };
    app.beep('knock');
    setTimeout(function () { app.beep('knock'); }, 1200);
    setTimeout(function () { app.hatching = null; app.rebuild(); }, 2800);
  };

  /* ---------- what the Totem is doing ---------- */
  var BAD = { rain: 1, storm: 1, snow: 1 };
  app.activity = function (now, w) {
    var S = app.S;
    if (!S || !S.hatched) return null;
    if (app.forceAct && Date.now() < app.forceAct.until && A.ACTIVITIES[app.forceAct.id]) { var fa = A.ACTIVITIES[app.forceAct.id]; return { id: app.forceAct.id, indoor: fa.where === 'in' || (fa.where === 'both' && !!BAD[w.kind]) }; }
    return pickActivity(S, now, w);
  };
  function pickActivity(S, now, w) {
    var biome = C.setting(S, 'biome', 'meadow'), season = A.season(U.wall(now), C.setting(S, 'hemisphere', 'north'));
    var wn = U.wall(now), hr = wn.getHours() + wn.getMinutes() / 60, per = A.period(wn.getHours()), phase = A.phase(hr), min = wn.getHours() * 60 + wn.getMinutes();
    if (per === 'bedtime') return { id: 'sleep', indoor: true };
    if ((min >= 450 && min < 495) || (min >= 735 && min < 780) || (min >= 1080 && min < 1125)) return { id: 'eat', indoor: true };
    var outOK = !BAD[w.kind] && phase !== 'night';
    var r = U.rng(U.hash32(S.egg.id + U.dayStr(now) + ':' + Math.floor(min / 20))), pool = [];
    Object.keys(A.ACTIVITIES).forEach(function (id) {
      var a = A.ACTIVITIES[id];
      if (id === 'sleep' || id === 'eat') return;
      if (a.pack ? !S.owned[id] : (!a.base && !S.unlocked[id])) return;
      if (id === 'stargaze' && !((phase === 'dusk' || phase === 'night') && w.kind === 'clear')) return;
      if (a.need === 'sand' && biome !== 'beach' && biome !== 'desert') return; // 1.1.0i: sandcastles on sand,
      if (a.need === 'snow' && biome !== 'tundra' && season !== 'winter') return; // snowmen in the snow
      if (a.where === 'out' && !outOK) return;
      var since = a.pack ? S.owned[id].t : S.unlocked[id], wt = (!a.base && app.trueNow() - since < 3 * 86400000) ? 3 : (a.pack && S.unlocked[id] ? 2 : 1);
      for (var i = 0; i < wt; i++) pool.push(id);
    });
    if (!pool.length) pool = ['workout'];
    var id = pool[Math.floor(r() * pool.length)], a = A.ACTIVITIES[id];
    return { id: id, indoor: a.where === 'in' || (a.where === 'both' && (!outOK || r() < 0.4)) };
  }
  // 1.1.0i: what Aiu made earlier today (it stays in the yard): replays today's 20-minute slots from 6 am. -> {paint: seed, ...}
  var madeCache = { key: '', v: {} };
  app.madeToday = function (now, w) {
    var S = app.S; if (!S || !S.hatched) return {};
    var wn = U.wall(now), min = wn.getHours() * 60 + wn.getMinutes(), slot = Math.floor(min / 20), key = U.dayStr(now) + ':' + slot + ':' + w.kind + ':' + C.setting(S, 'biome', 'meadow');
    if (madeCache.key === key) return madeCache.v;
    var out = {}, base = now.getTime() - (min % 20) * 60000;
    for (var s0 = Math.floor(360 / 20); s0 < slot; s0++) {
      var t = new Date(base - (slot - s0) * 20 * 60000), x = pickActivity(S, t, w);
      if (x && A.MADE && A.MADE.indexOf(x.id) >= 0) out[x.id] = U.hash32(x.id + U.dayStr(now) + s0);
    }
    madeCache = { key: key, v: out };
    return out;
  };

  /* ---------- weather: US National Weather Service (public domain, free, no key; covers the US) ---------- */
  function NWS(text) {
    var t = String(text || '').toLowerCase();
    if (/thunder|t-storm|tstorm/.test(t)) return 'storm';
    if (/snow|flurr|sleet|blizzard|ice pellets|wintry|freezing/.test(t)) return 'snow';
    if (/rain|shower|drizzle/.test(t)) return 'rain';
    if (/fog|haze|smoke|mist|dust/.test(t)) return 'fog';
    if (/mostly cloudy|cloudy|overcast|partly sunny/.test(t) && !/mostly sunny|mostly clear/.test(t)) return 'cloudy';
    return 'clear';
  }
  // The rest of today from the hourly forecast: high, low, and when rain is likely (for the Hilltop View).
  function todayForecast(periods, units) {
    var today = U.dayStr(), hi = -999, lo = 999, rain = 0, rainAt = null, kinds = {};
    (periods || []).forEach(function (p) {
      var t = new Date(p.startTime); if (isNaN(t) || U.dayStr(t) !== today) return;
      var v = p.temperature; if (p.temperatureUnit === 'F' && units === 'C') v = (v - 32) * 5 / 9; if (p.temperatureUnit === 'C' && units === 'F') v = v * 9 / 5 + 32;
      v = Math.round(v); if (v > hi) hi = v; if (v < lo) lo = v;
      var pr = p.probabilityOfPrecipitation && p.probabilityOfPrecipitation.value || 0;
      if (pr > rain) rain = pr; if (pr >= 40 && !rainAt) rainAt = U.hmStr(t);
      var k = NWS(p.shortForecast); kinds[k] = (kinds[k] || 0) + 1;
    });
    if (hi === -999) return null;
    var main = Object.keys(kinds).sort(function (a, b) { return kinds[b] - kinds[a]; })[0];
    return { hi: hi, lo: lo, rain: rain, rainAt: rainAt, text: main && main !== 'clear' ? 'Mostly ' + WLABEL[main] + '.' : '' };
  }
  var WLABEL = { clear: 'clear', cloudy: 'cloudy', fog: 'foggy', rain: 'raining', snow: 'snowing', storm: 'stormy' };
  function getJSON(url) { return fetch(url, { cache: 'no-store' }).then(function (r) { if (!r.ok) { var e = new Error('http ' + r.status); e.status = r.status; throw e; } return r.json(); }); }
  app.updateWeather = function (force) {
    var S = app.S; if (!S) return Promise.resolve();
    var city = C.setting(S, 'city', null), units = C.setting(S, 'units', 'F');
    if (!city || typeof city.lat !== 'number' || navigator.onLine === false || location.protocol === 'file:') return Promise.resolve();
    var w = app.weather, key = city.lat.toFixed(3) + ',' + city.lon.toFixed(3);
    if (!force && w && w.key === key && Date.now() - w.t < (w.src === 'none' ? 12 * 3600000 : 30 * 60000)) return Promise.resolve();
    var nws = app.local.nws || {};
    var point = nws.key === key && nws.hourly ? Promise.resolve(nws.hourly) :
      getJSON('https://api.weather.gov/points/' + city.lat.toFixed(4) + ',' + city.lon.toFixed(4)).then(function (j) {
        var hourly = j && j.properties && j.properties.forecastHourly;
        if (!hourly) throw new Error('no forecast');
        app.local.nws = { key: key, hourly: hourly }; app.saveLocal();
        return hourly;
      });
    return point.then(getJSON).then(function (j) {
      var p = j && j.properties && j.properties.periods && j.properties.periods[0];
      if (!p) return;
      var temp = p.temperature;
      if (p.temperatureUnit === 'F' && units === 'C') temp = (temp - 32) * 5 / 9;
      if (p.temperatureUnit === 'C' && units === 'F') temp = temp * 9 / 5 + 32;
      app.weather = { kind: NWS(p.shortForecast), text: p.shortForecast, temp: Math.round(temp), units: units, t: Date.now(), src: 'live', city: city.name, key: key, today: todayForecast(j.properties.periods, units) };
      app.store.set('weather', app.weather);
    }).catch(function (e) {
      if (e && e.status === 404) { app.weather = { src: 'none', t: Date.now(), key: key }; app.store.set('weather', app.weather); } // outside the US: Aiu guesses from the season
    });
  };
  // Places: our own list of cities (dict/places.txt), typed coordinates ("43.41, -86.07"), or "Use my location".
  var PLACES = null;
  function loadPlaces() {
    if (PLACES) return Promise.resolve(PLACES);
    return fetch('dict/places.txt').then(function (r) { return r.text(); }).then(function (t) {
      PLACES = t.split('\n').filter(function (l) { return l && l.charAt(0) !== '#'; }).map(function (l) {
        var p = l.split('|'); return { name: p[0], region: p[1], cc: p[2], lat: +p[3], lon: +p[4], tz: p[5] };
      });
      return PLACES;
    });
  }
  function deviceZone() { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || null; } catch (e) { return null; } }
  function placeLabel(p) { return [p.name, p.region, p.cc].filter(Boolean).join(', '); }
  app.findCity = function (text) {
    var q = String(text || '').trim(), m = /^(-?\d{1,2}(?:\.\d+)?)\s*[, ]\s*(-?\d{1,3}(?:\.\d+)?)$/.exec(q);
    if (m) {
      var lat = +m[1], lon = +m[2];
      if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return Promise.reject(new Error('City not found'));
      return loadPlaces().then(function (list) { return { name: 'Near ' + nearest(list, lat, lon), lat: lat, lon: lon, tz: deviceZone() }; });
    }
    var parts = q.toLowerCase().replace(/\./g, '').split(/\s*,\s*/), name = parts[0], rest = parts.slice(1).join(' ');
    return loadPlaces().then(function (list) {
      var hits = list.filter(function (p) { return p.name.toLowerCase().replace(/\./g, '') === name; });
      if (rest) { var narrow = hits.filter(function (p) { return (p.region + ' ' + p.cc).toLowerCase().indexOf(rest.replace(/\s+/g, ' ')) >= 0 || stateName(p.region).indexOf(rest) === 0; }); if (narrow.length) hits = narrow; }
      if (!hits.length) hits = list.filter(function (p) { return p.name.toLowerCase().indexOf(name) === 0; });
      var c = hits.filter(function (p) { return p.cc === 'US'; })[0] || hits[0];
      if (!c) throw new Error('City not found');
      return { name: placeLabel(c), lat: c.lat, lon: c.lon, tz: c.tz };
    });
  };
  app.myLocation = function () {
    return new Promise(function (res, rej) {
      if (!navigator.geolocation) return rej(new Error('This browser can\'t share its location.'));
      navigator.geolocation.getCurrentPosition(function (pos) {
        var lat = +pos.coords.latitude.toFixed(3), lon = +pos.coords.longitude.toFixed(3);
        loadPlaces().then(function (list) { res({ name: 'Near ' + nearest(list, lat, lon), lat: lat, lon: lon, tz: deviceZone() }); }, function () { res({ name: 'My location', lat: lat, lon: lon, tz: deviceZone() }); });
      }, function () { rej(new Error('Location is blocked or unavailable. Type your city or coordinates instead.')); }, { timeout: 15000, maximumAge: 3600000 });
    });
  };
  function nearest(list, lat, lon) {
    var best = null, bd = 1e9;
    list.forEach(function (p) { var d = Math.pow(p.lat - lat, 2) + Math.pow((p.lon - lon) * Math.cos(lat * Math.PI / 180), 2); if (d < bd) { bd = d; best = p; } });
    return best ? placeLabel(best) : lat + ', ' + lon;
  }
  var STATES = { AL: 'alabama', AK: 'alaska', AZ: 'arizona', AR: 'arkansas', CA: 'california', CO: 'colorado', CT: 'connecticut', DE: 'delaware', FL: 'florida', GA: 'georgia',
    HI: 'hawaii', ID: 'idaho', IL: 'illinois', IN: 'indiana', IA: 'iowa', KS: 'kansas', KY: 'kentucky', LA: 'louisiana', ME: 'maine', MD: 'maryland', MA: 'massachusetts',
    MI: 'michigan', MN: 'minnesota', MS: 'mississippi', MO: 'missouri', MT: 'montana', NE: 'nebraska', NV: 'nevada', NH: 'new hampshire', NJ: 'new jersey', NM: 'new mexico',
    NY: 'new york', NC: 'north carolina', ND: 'north dakota', OH: 'ohio', OK: 'oklahoma', OR: 'oregon', PA: 'pennsylvania', RI: 'rhode island', SC: 'south carolina',
    SD: 'south dakota', TN: 'tennessee', TX: 'texas', UT: 'utah', VT: 'vermont', VA: 'virginia', WA: 'washington', WV: 'west virginia', WI: 'wisconsin', WY: 'wyoming' };
  function stateName(code) { return STATES[code] || ''; }
  app.weatherNow = function () {
    if (app.dev.weatherPreview) return { kind: app.dev.weatherPreview, label: WLABEL[app.dev.weatherPreview], source: 'preview' };
    var w = app.weather, S = app.S;
    if (w && w.src === 'live' && Date.now() - w.t < 6 * 3600000) return { kind: w.kind, label: WLABEL[w.kind], text: w.text, temp: w.temp, units: w.units, source: w.src, stale: Date.now() - w.t > 45 * 60000, ago: U.ago(w.t), city: w.city, today: w.today && w.t && U.dayStr(new Date(w.t)) === U.dayStr() ? w.today : null };
    var season = A.season(U.wall(), C.setting(S, 'hemisphere', 'north')), biome = C.setting(S, 'biome', 'meadow');
    var kind = (biome === 'tundra' || (season === 'winter' && biome !== 'desert' && biome !== 'beach' && U.wall().getDate() % 3 === 0)) ? 'snow' : 'clear';
    return { kind: kind, label: WLABEL[kind], source: 'guess', stale: true };
  };

  /* ---------- sync with the server mailbox ---------- */
  app.api = function (action, body) {
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 20000);
    return fetch(CFG.api, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
      body: JSON.stringify(Object.assign({ a: action }, body || {})), signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) {
      clearTimeout(timer);
      return r.text().then(function (txt) {
        var j; try { j = JSON.parse(txt); } catch (e) { var er = new Error('The server gave an odd reply (' + r.status + '). Is api.cgi set up?'); er.code = 'bad_server'; throw er; }
        if (!j.ok) { var e2 = new Error(j.error || 'Something went wrong'); e2.code = j.code; e2.status = r.status; throw e2; }
        return j;
      });
    }, function () {
      clearTimeout(timer);
      var e = new Error('Can\'t reach the server right now.'); e.code = 'offline'; throw e;
    });
  };

  var syncTimer = null, syncing = null;
  app.scheduleSync = function () {
    if (!app.prof || !app.prof.token) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(function () { app.syncNow('change').catch(function () {}); }, 1500);
  };
  app.syncNow = function (why) {
    if (!app.prof || !app.prof.token) return Promise.resolve();
    if (syncing) return syncing;
    var prof = app.prof, st = app.store, before = noticeSnapshot(), hadTotem = !!(app.S && app.S.egg), gotRemote = 0, since = 0, remoteSaid = [];
    setSync('syncing');
    syncing = st.get('lastSeq').then(function (ls) {
      since = ls || 0;
      var toSend = app.unsent.slice().sort(C.cmpT);
      function round() {
        var batch = toSend.splice(0, 500).map(function (e) { var o = { id: e.id, t: e.t, d: e.d, h: e.h, dev: e.dev, dn: e.dn, type: e.type, data: e.data }; if (e.off) o.off = 1; return o; });
        var body = { u: prof.u, token: prof.token, since: since, events: batch, dn: app.dev.deviceName };
        if (!toSend.length && app.S && app.S.egg) body.snapshot = C.snapshot(app.S);
        return app.api('sync', body).then(function (res) {
          app.clockOffset = res.now - Date.now();
          var known = res.known || {}, ids = res.events.map(function (e) { return e.id; }).concat(Object.keys(known));
          return st.getMany(ids).then(function (have) {
            var changed = [];
            Object.keys(known).forEach(function (id) { var le = have[id]; if (le && !le.seq) { le.seq = known[id]; changed.push(le); } });
            res.events.forEach(function (se) {
              var le = have[se.id];
              if (le) { if (le.seq !== se.seq || le.t !== se.t) { le.seq = se.seq; le.rt = se.rt; if (le.t !== se.t) { le.t = se.t; le.tf = 1; } changed.push(le); } }
              else { se.ls = app.lsNext++; changed.push(se); C.apply(app.E, se); if (se.dev !== app.deviceId) { gotRemote++; if (se.type === 'totem' && se.data && se.data.text) remoteSaid.push(se.data.text); } }
            });
            since = res.last_seq;
            return st.put(changed).then(function () { return st.set('lastSeq', since); }).then(function () {
              var done = {}; changed.forEach(function (e) { if (e.seq) done[e.id] = 1; });
              app.unsent = app.unsent.filter(function (e) { return !done[e.id]; });
              if (res.more || toSend.length) return round();
            });
          });
        });
      }
      return round();
    }).then(function () {
      return st.afterSeq(app.E.W);
    }).then(function (conf) {
      conf.sort(function (a, b) { return a.seq - b.seq; }).forEach(function (e) { C.confirm(app.E, e); });
      return st.unsent();
    }).then(function (uns) {
      app.unsent = uns;
      st.set('clockOffset', app.clockOffset);
      prof.lastSync = Date.now();
      app.saveProfiles();
      setSync('ok');
      app.rebuild();
      app.saveCheckpoint(true);
      if (gotRemote && hadTotem) announceChanges(before);
      if (loginPw) setTimeout(app.vaultAfterLogin, 0);
      if (app.dev.hearOthers && hadTotem && remoteSaid.length && why !== 'open') app.speak(remoteSaid.slice(-2).join(' ')); // e.g. the Pi says what Aiu told you on your phone
      app.sync.clockWarn = Math.abs(app.clockOffset) > 5 * 60000 ? Math.round(app.clockOffset / 60000) : 0;
      syncing = null;
    }, function (err) {
      syncing = null;
      if (err.code === 'login') setSync('login', err.message);
      else setSync(err.code === 'offline' ? 'offline' : 'error', err.message);
      throw err;
    });
    return syncing;
  };
  function setSync(state, msg) { app.sync.state = state; app.sync.err = msg || ''; if (state === 'ok') app.sync.last = Date.now(); AIU.ui.refreshSync(); }
  app.oldestUnsent = function () { return app.unsent.reduce(function (m, e) { return Math.min(m, e.t); }, Infinity); };

  function noticeSnapshot() {
    var S = app.S, out = { tasks: {}, settings: {} };
    if (!S) return out;
    Object.keys(S.tasks).forEach(function (k) { out.tasks[k] = S.tasks[k].id; });
    Object.keys(S.settings).forEach(function (k) { out.settings[k] = S.settings[k].id; });
    return out;
  }
  var SETTING_NAMES = { totemName: 'my name', callMe: 'what I call you', house: 'my house', biome: 'my world', skin: 'my look', city: 'your city', lasts: 'how long reminders last', hat: 'my hat', toy: 'my toy', backdrop: 'the view', decor: 'my room' };
  function announceChanges(before) {
    var S = app.S, lines = [], c24 = C.setting(S, 'clock24', false);
    Object.keys(S.tasks).forEach(function (k) {
      var t = S.tasks[k];
      if (before.tasks[k] === t.id || t.dev === app.deviceId) return;
      var who = 'Your ' + (t.dn || 'other device');
      if (t.off) lines.push(who + ' turned off "' + t.title + '".');
      else if (before.tasks[k]) lines.push(who + ' moved ' + t.title.toLowerCase() + ' to ' + U.fmtHm(t.time, c24) + (t.repeat === 'once' && t.date ? ' ' + U.fmtDay(t.date) : '') + '.');
      else lines.push(who + ' added ' + t.title.toLowerCase() + ' at ' + U.fmtHm(t.time, c24) + '.');
    });
    Object.keys(S.settings).forEach(function (k) {
      var s = S.settings[k];
      if (before.settings[k] === s.id || s.dev === app.deviceId || !SETTING_NAMES[k]) return;
      lines.push('Your ' + (s.dn || 'other device') + ' changed ' + SETTING_NAMES[k] + '.');
    });
    if (lines.length) app.addLine(lines.slice(0, 4).join(' '), app.dev.hearOthers ? true : 'quiet');
    loadOwnedAssets();
  }

  /* ---------- reminders ---------- */
  function tickReminders() {
    var S = app.S;
    if (!S || !S.egg || !AIU.ui.onMain) return;
    var now = new Date(app.trueNow() + (app.dev.hourPreview || 0) * 3600e3), day = U.dayStr(now), nowMin = U.minOfDay(now);
    var occ = C.occurrences(S, day), lasts = String(C.setting(S, 'lasts', '5')), active = null, dirty = false;
    occ.forEach(function (o, i) {
      if (o.done) return;
      var k = o.key + '|' + day;
      var end = lasts === 'next' ? (occ[i + 1] && occ[i + 1].min > o.min ? occ[i + 1].min : o.min + 60) : o.min + (+lasts || 5);
      if (o.kind === 'wake') end = Math.max(end, o.min + 5);
      if (app.dismissed[k]) return;
      if (nowMin >= o.min && nowMin < end) { if (!active) active = o; }
      else if (nowMin >= end && nowMin < end + 45) {
        app.dismissed[k] = 'missed'; dirty = true;
        app.react('missed', o.title);
      }
    });
    if (active) {
      if (!app.popup || app.popup.key !== active.key) {
        var line = M.reminderLine(active, app.ctx());
        app.popup = { key: active.key, day: day, o: active, line: line, lastPing: Date.now() };
        AIU.ui.showReminder(app.popup);
        app.beep(); app.react('reminder'); app.notify(line); setTimeout(function () { app.speak(line); }, 900);
        app.setMode('greet', 2500);
      } else if (Date.now() - app.popup.lastPing > 30000) { app.popup.lastPing = Date.now(); app.beep(); }
    } else if (app.popup) {
      app.dismissed[app.popup.key + '|' + app.popup.day] = 'expired'; dirty = true;
      app.popup = null; AIU.ui.hideReminder();
    }
    if (dirty) {
      Object.keys(app.dismissed).forEach(function (k) { if (k.slice(-10) < U.addDays(day, -3)) delete app.dismissed[k]; });
      app.store.set('dismissed', app.dismissed);
    }
  }
  app.reminderDone = function () {
    var p = app.popup; if (!p) return;
    app.dismissed[p.key + '|' + p.day] = 'done'; app.store.set('dismissed', app.dismissed);
    app.popup = null; AIU.ui.hideReminder();
    app.addEvents([{ type: 'task_done', data: { key: p.key, date: p.day } }]);
  };
  app.reminderDismiss = function () {
    var p = app.popup; if (!p) return;
    app.dismissed[p.key + '|' + p.day] = 'dismissed'; app.store.set('dismissed', app.dismissed);
    app.popup = null; AIU.ui.hideReminder();
  };

  /* ---------- the bounty board: about once an hour Aiu checks it, calls out, and the board under him starts over ---------- */
  app.checkBoard = function (why) {
    if (!app.S || !app.S.hatched || app.casting || app.evolve || app.hatching) return;
    app.forceAct = { id: 'board', until: Date.now() + 9000 };
    app.local.boardAt = app.trueNow(); app.saveLocal();
    if (AIU.ui.refresh) AIU.ui.refresh();
    setTimeout(function () {
      app.react('board'); app.beep('ping');
      if (AIU.ui.boardRestart) AIU.ui.boardRestart();
    }, 2500);
  };
  function tickBoard() {
    if (!app.S || !app.S.hatched || !AIU.ui.onMain || document.hidden || app.popup) return;
    var h0 = U.wall(new Date(app.trueNow())).getHours();
    if (h0 < 7 || h0 >= 22) return; // not at night
    if (app.trueNow() - (app.local.boardAt || 0) > 60 * 60000) app.checkBoard('hourly');
  }
  /* ---------- the daily I Ching reading + hilltop review ---------- */
  // At the time you set (Settings, default 8:00 AM), Aiu tosses three coins six times in its scene, then gives the review
  // as a pop-up and in the chat. The coins are seeded by the Totem and the day, so every device gets the same reading.
  function tickReading() {
    var S = app.S;
    if (!S || !S.hatched || !AIU.ui.onMain || app.casting || app.hatching || app.evolve || document.hidden || app.popup || (window.AIU_TEST && window.AIU_TEST.noReading)) return;
    var ctx = app.ctx(), done = (S.reviews || {})[ctx.today];
    if (done && app.local.reviewSeen !== ctx.today) { app.local.reviewSeen = ctx.today; app.saveLocal(); if (AIU.ui.showReview) AIU.ui.showReview(done); return; } // cast on another device
    if (!M.readingDue(ctx) || app.local.castDay === ctx.today) return;
    app.castReading(false);
  }
  app.castReading = function (manual) {
    var S = app.S; if (!S || !S.hatched || app.casting) return;
    var day = U.dayStr(new Date(app.trueNow() + (app.dev.hourPreview || 0) * 3600e3));
    if ((S.reviews || {})[day]) { var rv0 = S.reviews[day]; AIU.ui.showReview && AIU.ui.showReview(rv0); return; }
    var r = AIU.iching.castFor(S.egg.id, day), dur = app.dev.fastCast ? 3000 : 20000;
    app.casting = { r: r, day: day, start: Date.now(), dur: dur };
    app.forceAct = { id: 'iching', until: Date.now() + dur + 1500 };
    app.react('cast'); if (!manual) app.beep('chirp');
    if (AIU.ui.refresh) AIU.ui.refresh();
    setTimeout(function () {
      var ctx = app.ctx(), city = C.setting(app.S, 'city', null);
      var rv = M.hilltop(ctx, r, { place: city ? city.name : '', zone: AIU.hilltop.zoneName(city && city.tz) });
      app.casting = null;
      app.local.castDay = day; app.local.checkin = day; app.local.reviewSeen = day; app.saveLocal(); // the review is today's stand-up
      app.addEvents([{ type: 'review', data: { day: day, hex: r.hex, rel: r.rel, vals: r.vals, moving: r.moving, text: rv.text, wx: rv.rv.wx, hm: rv.rv.hm, place: rv.rv.place, zone: rv.rv.zone } }], true).then(function () {
        var saved = (app.S.reviews || {})[day] || Object.assign({ text: rv.text }, rv.rv);
        if (AIU.ui.showReview) AIU.ui.showReview(saved, true);
        app.notify(rv.text);
        app.setMode('greet', 2500);
      });
    }, dur);
  };

  /* (1.1.0: the optional plug-in AI was removed. Aiu is guardrailed: it guides you toward its paths and never sends your data anywhere.) */
  // Today's (or any day's) journal page, edited by you: one field at a time, empty = back to Aiu's summary
  app.setPageField = function (day, f, text) { return app.addEvents([{ type: 'jpage', data: { day: day, f: f, text: String(text || '').trim() } }]); };

  /* ---------- sound, voice, notifications ---------- */
  var actx = null;
  var synthUnlocked = false;
  function unlockAudio() {
    try { // iPhones only allow speech after a tap: say "nothing" once, on the first tap
      if (!synthUnlocked && window.speechSynthesis && window.SpeechSynthesisUtterance) { synthUnlocked = true; var u0 = new SpeechSynthesisUtterance(' '); u0.volume = 0; speechSynthesis.speak(u0); }
    } catch (e) {}
    try {
      if (!actx && (window.AudioContext || window.webkitAudioContext)) actx = new (window.AudioContext || window.webkitAudioContext)();
      if (actx && actx.state === 'suspended') actx.resume();
    } catch (e) {}
  }
  app.beep = function (kind) {
    kind = kind || app.dev.sound;
    if (app.dev.mute || (app.dev.sound === 'off' && kind !== 'droid') || !actx) return;
    try {
      var t = actx.currentTime;
      var tone = function (type, f0, f1, start, dur, vol) {
        var o = actx.createOscillator(), g = actx.createGain();
        o.type = type; o.frequency.setValueAtTime(f0, t + start); o.frequency.exponentialRampToValueAtTime(f1, t + start + dur);
        g.gain.setValueAtTime(vol, t + start); g.gain.exponentialRampToValueAtTime(0.001, t + start + dur);
        o.connect(g); g.connect(actx.destination); o.start(t + start); o.stop(t + start + dur + 0.02);
      };
      if (kind === 'knock') { tone('sine', 140, 60, 0, 0.12, 0.6); tone('triangle', 220, 90, 0, 0.05, 0.2); tone('sine', 140, 60, 0.2, 0.12, 0.6); tone('triangle', 220, 90, 0.2, 0.05, 0.2); }
      else if (kind === 'ping') { tone('square', 988, 988, 0, 0.08, 0.08); tone('square', 1319, 1319, 0.09, 0.14, 0.08); }
      else if (kind === 'droid') { // a short droid warble before Aiu speaks (our own sound)
        var r = U.rng((Date.now() / 997) | 0), n = 3 + Math.floor(r() * 2), st = 0;
        for (var i = 0; i < n; i++) { var f = 700 + Math.floor(r() * 1400), d = 0.05 + r() * 0.05; tone(r() < 0.5 ? 'square' : 'triangle', f, f * (r() < 0.5 ? 1.6 : 0.6), st, d, 0.05); st += d + 0.02; }
      }
      else { tone('sawtooth', 600, 1400, 0, 0.12, 0.05); tone('sawtooth', 700, 1600, 0.15, 0.12, 0.05); }
    } catch (e) {}
  };
  /* ---------- Aiu's voice (the device's own built-in voice: works offline) ----------
     1.1.0: one line at a time through a queue (no more talking over itself or repeating), long answers split into sentences
     (Chrome stops long ones), the chosen voice is matched by its id and language, and if a voice fails Aiu falls back to the default. */
  var voiceCache = [];
  function loadVoices() { try { var v = window.speechSynthesis ? speechSynthesis.getVoices() : []; if (v && v.length) voiceCache = v; } catch (e) {} return voiceCache; }
  app.voices = function () { return voiceCache.length ? voiceCache : loadVoices(); };
  if (window.speechSynthesis) { loadVoices(); try { speechSynthesis.addEventListener('voiceschanged', function () { loadVoices(); if (AIU.ui.voicesChanged) AIU.ui.voicesChanged(); }); } catch (e) { speechSynthesis.onvoiceschanged = loadVoices; } }
  app.pickVoice = function () {
    var d = app.dev, vs = app.voices();
    if (!d.voiceName && !d.voiceURI) return null;
    return vs.filter(function (v) { return d.voiceURI && v.voiceURI === d.voiceURI; })[0] || vs.filter(function (v) { return v.name === d.voiceName; })[0] || null;
  };
  var speechQ = [], speaking = null, lastQueued = { text: '', t: 0 }, badVoice = false;
  app.spoken = []; // what Aiu said lately, so the ears never mistake Aiu's own voice for yours
  function audioSession(kind) { try { if (navigator.audioSession) navigator.audioSession.type = kind; } catch (e) {} } // iPhone: 'playback' = loudspeaker
  function chunks(text) {
    var parts = text.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) || [text], out = [], cur = '';
    parts.forEach(function (p) { if ((cur + p).length > 220 && cur) { out.push(cur.trim()); cur = p; } else cur += p; });
    if (cur.trim()) out.push(cur.trim());
    return out.length ? out : [text];
  }
  app.isTalking = function () { return !!speaking; };
  // 1.1.0 final: the speaker button at the top = sound and Aiu's robot voice on or off. Aiu only speaks when you ask it to
  // read something (Read aloud) and for reminders.
  app.speak = function (text, long) {
    if (app.dev.mute || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
    var clean = String(text).replace(/\*[^*]*\*/g, ' ').replace(/\([^)]*\)/g, ' ').replace(/["“”]/g, '').replace(/\s+/g, ' ').trim();
    if (!clean) return;
    if (!long && clean === lastQueued.text && Date.now() - lastQueued.t < 8000) return; // never the same line twice in a row
    lastQueued = { text: clean, t: Date.now() };
    app.spoken.push({ text: clean.toLowerCase(), t: Date.now() }); if (app.spoken.length > 12) app.spoken.shift();
    if (long) { app.hush(); } else if (speechQ.length >= 2) speechQ.splice(0, speechQ.length - 1); // a backlog would sound like repeating: keep only the newest
    speechQ.push(chunks(clean.slice(0, long ? 6000 : 1200)));
    pump();
  };
  function pump() {
    if (speaking || !speechQ.length) return;
    var item = speaking = { parts: speechQ.shift() };
    app.ears.pause(); // stop listening while Aiu talks: it won't hear itself, and iPhones switch back to the loudspeaker
    audioSession('playback');
    try { if (speechSynthesis.speaking || speechSynthesis.pending) speechSynthesis.cancel(); if (speechSynthesis.paused) speechSynthesis.resume(); } catch (e) {}
    if (AIU.ui.refreshEars) AIU.ui.refreshEars();
    var go = function () { sayPart(item, 0); };
    if (app.dev.chirp) { app.beep('droid'); setTimeout(go, 380); } else go();
  }
  function sayPart(item, i) {
    if (speaking !== item) return; // hushed
    if (i >= item.parts.length) { speaking = null; return afterTalk(); }
    var txt = item.parts[i], done = false, u;
    function next() { if (done) return; done = true; clearTimeout(guard); sayPart(item, i + 1); }
    var guard = setTimeout(next, 3500 + txt.length * 95); // some phones never say "done"
    try {
      u = new SpeechSynthesisUtterance(txt); u.rate = 1.05; u.pitch = 1.35;
      var v = badVoice ? null : app.pickVoice();
      if (v) { u.voice = v; u.lang = v.lang; } else if (navigator.language) u.lang = navigator.language;
      u.onend = next;
      u.onerror = function (ev) {
        var er = ev && ev.error;
        if (er === 'interrupted' || er === 'canceled') { next(); return; }
        if (v && !badVoice) { badVoice = true; done = true; clearTimeout(guard); sayPart(item, i); return; } // that voice failed: try the default voice once
        next();
      };
      speechSynthesis.speak(u);
    } catch (e) { next(); }
  }
  function afterTalk() {
    if (speechQ.length) return pump();
    audioSession('auto'); app.ears.lastTalk = Date.now();
    setTimeout(function () { if (!speaking) app.ears.resume(); }, 700);
    if (AIU.ui.refreshEars) AIU.ui.refreshEars();
  }
  app.voiceChanged = function () { badVoice = false; };
  app.hush = function () { speechQ = []; speaking = null; try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {} afterTalk(); };
  app.setMute = function (on) { app.dev.mute = !!on; app.saveDev(); if (on) app.hush(); AIU.ui.refreshVoice(); };
  app.reading = function () { return !!speaking; };
  // Read something out loud (a journal page, an entry, the I Ching reading). Tap again to stop.
  app.readAloud = function (text) { unlockAudio(); if (speaking) { app.hush(); return false; } app.speak(text, true); return true; };

  /* ---------- Aiu's ears: when Listen is on, it keeps listening until you turn it off ---------- */
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var ears = app.ears = { supported: !!SR, on: false, paused: false, rec: null, fails: 0, lastTalk: 0, state: 'off', heard: '' };
  function earState(st) { ears.state = st; if (AIU.ui.refreshEars) AIU.ui.refreshEars(); }
  ears.start = function () {
    if (!SR) { AIU.ui.bar('This browser can\'t listen. Try Chrome or Edge on a computer, or Safari on an iPhone.', [['OK', function () { AIU.ui.bar(null); }]]); return; }
    unlockAudio();
    ears.on = true; ears.fails = 0; app.dev.listen = true; app.saveDev();
    app.comms(true);
    ears.resume();
  };
  ears.stop = function () {
    ears.on = false; app.dev.listen = false; app.saveDev();
    if (ears.rec) { try { ears.rec.abort(); } catch (e) {} ears.rec = null; }
    app.comms(false);
    earState('off');
  };
  ears.toggle = function () { if (ears.on) ears.stop(); else ears.start(); };
  ears.pause = function () { ears.paused = true; if (ears.rec) { try { ears.rec.abort(); } catch (e) {} ears.rec = null; } if (ears.on) earState('paused'); };
  ears.resume = function () {
    ears.paused = false;
    if (!ears.on || speaking || document.hidden || ears.rec) { if (ears.on && !ears.rec) earState(speaking ? 'paused' : 'waiting'); return; }
    var rec;
    try { rec = new SR(); } catch (e) { return; }
    rec.lang = navigator.language || 'en-US'; rec.continuous = true; rec.interimResults = true; rec.maxAlternatives = 1;
    rec.onresult = function (ev) {
      var fin = '', part = '';
      for (var i = ev.resultIndex; i < ev.results.length; i++) { var r = ev.results[i]; if (r.isFinal) fin += r[0].transcript; else part += r[0].transcript; }
      ears.fails = 0;
      if (part) { ears.heard = part; AIU.ui.heard(part, false); }
      if (fin) { ears.heard = ''; AIU.ui.heard('', true); heardFinal(fin); }
    };
    rec.onerror = function (e) {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { ears.stop(); AIU.ui.bar('Aiu can\'t use the microphone. Allow it in the browser settings, then tap Listen again.', [['OK', function () { AIU.ui.bar(null); }]]); }
    };
    rec.onend = function () {
      if (ears.rec === rec) ears.rec = null;
      if (!ears.on || ears.paused || speaking) return;
      ears.fails++;
      // restart right away; back off if the browser keeps stopping (and let a tap restart it on phones that need one)
      if (ears.fails > 6) { earState('tap'); return; }
      setTimeout(ears.resume, Math.min(3000, 250 * ears.fails));
    };
    try { rec.start(); ears.rec = rec; earState('listening'); } catch (e) { earState('tap'); }
  };
  // Is this just Aiu's own voice coming back through the microphone (or the Pi speaking in the same room)?
  function words(t) { return String(t || '').toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean); }
  app.isEcho = function (text) {
    var hw = words(text); if (!hw.length) return true;
    var now = Date.now(), recent = app.spoken.filter(function (x) { return now - x.t < 45000; }).map(function (x) { return x.text; });
    if (app.S) app.S.chat.slice(-6).forEach(function (e) { if (e.type === 'totem' && now - e.t < 90000) recent.push(String(e.data.text || '').toLowerCase()); });
    return recent.some(function (r) {
      var rw = words(r), hit = 0; if (!rw.length) return false;
      hw.forEach(function (w) { if (rw.indexOf(w) >= 0) hit++; });
      return hw.length >= 2 && hit / hw.length >= 0.7;
    });
  };
  var lastHeard = { text: '', t: 0 };
  function heardFinal(text) {
    text = String(text || '').trim();
    if (text.length < 2 || speaking || Date.now() - ears.lastTalk < 900) return;
    if (text.toLowerCase() === lastHeard.text && Date.now() - lastHeard.t < 4000) return; // some phones report the same words twice
    lastHeard = { text: text.toLowerCase(), t: Date.now() };
    if (app.isEcho(text)) return;
    if (app.dev.wake) { // optional: only answer when you say its name first
      var names = ['aiu', 'hey aiu', 'ok aiu', (app.S && app.S.totemName || '').toLowerCase()].filter(Boolean);
      var low = text.toLowerCase(), hit = names.filter(function (n) { return low.indexOf(n) === 0; })[0];
      if (!hit) return;
      text = text.slice(hit.length).replace(/^[\s,.!]+/, '');
      if (!text) { app.addLine('Yes?'); return; }
    }
    if (/^(stop listening|mute|go quiet|be quiet)$/i.test(text)) { ears.stop(); return; }
    if (AIU.ui.dictated) AIU.ui.dictated(text); // 1.1.0 final: talking = dictating a journal entry
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden) { if (ears.rec) { try { ears.rec.abort(); } catch (e) {} ears.rec = null; } } else if (ears.on) { ears.fails = 0; ears.resume(); } });

  /* ---------- comms link: while you're talking with Aiu, your devices check in every 10 seconds ---------- */
  var commsTimer = null;
  app.comms = function (on) {
    clearInterval(commsTimer); commsTimer = null;
    if (on && app.prof && app.prof.token) commsTimer = setInterval(function () { if (!document.hidden || app.dev.hearOthers) app.syncNow('comms').catch(function () {}); }, 10000);
  };
  app.notify = function (text) {
    if (!app.dev.notif || !window.Notification || Notification.permission !== 'granted' || !document.hidden) return;
    try {
      var title = (app.S && app.S.totemName) || 'Aiu Totem';
      if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) {
        navigator.serviceWorker.getRegistration().then(function (reg) {
          if (reg && reg.showNotification) reg.showNotification(title, { body: text, icon: 'icons/icon-192.png', tag: 'aiu' });
          else new Notification(title, { body: text, icon: 'icons/icon-192.png' });
        });
      } else new Notification(title, { body: text });
    } catch (e) {}
  };

  /* ---------- the shop ---------- */
  // The shop is just folders on the server (aiu/shop/packs/<item>/). api.cgi lists them; nothing is uploaded from the app.
  app.loadCatalog = function () {
    return app.api('shop').then(function (r) {
      app.catalog = { items: r.items || [], categories: r.categories || {}, problems: r.problems || [] };
      var got = 0;
      (app.catalog.items).forEach(function (it) { if (app.S && app.S.owned[it.id]) { app.local.itemInfo = app.local.itemInfo || {}; app.local.itemInfo[it.id] = it; got++; } });
      if (got) app.saveLocal();
      registerActivities();
      return app.catalog;
    });
  };
  app.itemInfo = function (id) {
    if (app.catalog) { var f = (app.catalog.items || []).filter(function (x) { return x.id === id; })[0]; if (f) return f; }
    return (app.local.itemInfo || {})[id] || null;
  };
  app.buy = function (item) {
    if (!app.S) return Promise.reject(new Error('Not ready'));
    if (app.S.owned[item.id]) return Promise.resolve();
    if (app.S.coins < item.price) return Promise.reject(new Error('Not enough coins yet.'));
    if (!app.prof.local && navigator.onLine === false) return Promise.reject(new Error('The shop needs internet.'));
    app.local.itemInfo = app.local.itemInfo || {}; app.local.itemInfo[item.id] = item; app.saveLocal();
    return app.addEvents([{ type: 'buy', data: { item: item.id, price: item.price } }]).then(function () {
      return app.prof.local ? null : app.syncNow('buy').catch(function () {});
    }).then(function () { return app.cacheAsset(item); });
  };
  // Owned pictures are kept on the device so they work offline; the catalog itself is never stored.
  app.cacheAsset = function (item) {
    return app.store.get('asset:' + item.id).then(function (have) {
      if (have) return have;
      return fetch('shop/' + item.file + (item.v ? '?v=' + item.v : '')).then(function (r) { if (!r.ok) throw new Error('missing'); return r.blob(); }).then(function (b) {
        return new Promise(function (res) { var fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.readAsDataURL(b); });
      }).then(function (url) { return app.store.set('asset:' + item.id, url).then(function () { return url; }); });
    }).then(function (url) {
      var img = new Image(); img.src = url; app.assets[item.id] = { img: img, info: item };
      if (item.category === 'activity') registerActivities();
      return img;
    });
  };
  // Activity packs: things the Totem can do once you own them (a sprite strip of frames).
  function registerActivities() {
    if (!app.S) return;
    Object.keys(app.S.owned).forEach(function (id) {
      var a = app.assets[id], info = (a && a.info) || app.itemInfo(id);
      if (!info || info.category !== 'activity') return;
      if (a && a.img) A.addPackActivity(id, info, a.img);
    });
  }
  app.registerActivities = registerActivities;
  // "Do it now" in the shop: the Totem does that activity for 2 minutes.
  app.tryActivity = function (id) {
    registerActivities();
    if (!A.ACTIVITIES[id]) return;
    app.forceAct = { id: id, until: Date.now() + 120000 };
    app.addLine('Watch me! I\'m ' + A.ACTIVITIES[id].label + '.', true);
    if (AIU.ui.refresh) AIU.ui.refresh();
    setTimeout(function () { if (AIU.ui.refresh) AIU.ui.refresh(); }, 121000);
  };
  function ownedActivityIds() { return app.S ? Object.keys(app.S.owned).filter(function (id) { var i = app.itemInfo(id); return i && i.category === 'activity'; }) : []; }
  app.ownedActivityIds = ownedActivityIds;
  var triedCatalog = false;
  function loadOwnedAssets() {
    if (!app.S) return;
    // Bought on another device? Ask the shop what it was (once), then load it.
    if (!triedCatalog && !app.catalog && Object.keys(app.S.owned).some(function (id) { return !app.itemInfo(id); })) {
      triedCatalog = true; app.loadCatalog().then(loadOwnedAssets).catch(function () {});
    }
    ['hat', 'toy', 'backdrop', 'house', 'decor'].map(function (slot) { return C.setting(app.S, slot, null); }).concat(ownedActivityIds()).forEach(function (v) {
      if (!v || app.assets[v]) return;
      app.store.get('asset:' + v).then(function (url) {
        if (url) { var img = new Image(); img.src = url; app.assets[v] = { img: img, info: app.itemInfo(v) || {} }; registerActivities(); return; }
        var info = app.itemInfo(v);
        if (info) return app.cacheAsset(info);
        return app.loadCatalog().then(function () { var i2 = app.itemInfo(v); if (i2) return app.cacheAsset(i2); });
      }).catch(function () {});
    });
  }
  app.loadOwnedAssets = loadOwnedAssets;
  app.equip = function (slot, id) { return app.setSetting(slot, id || null).then(loadOwnedAssets); };

  /* ---------- the scene ---------- */
  var lastDraw = 0, zoomCv = null;
  function frame(ts) {
    requestAnimationFrame(frame);
    if (document.hidden) return;
    var fps = Math.max(2, Math.min(24, +app.dev.fps || 8));
    if (ts - lastDraw < 1000 / fps) return;
    lastDraw = ts; app.f++;
    var cv = AIU.ui.canvas && AIU.ui.canvas();
    if (!cv || !app.S || !app.S.egg) return;
    var sc = app.sceneState(), ctx = cv.getContext('2d');
    if (app.f % 8 === 0 && AIU.ui.statusTick) AIU.ui.statusTick(sc);
    if (app.dev.zoom) { // close-up camera: the same world at 2x, centered on the Totem
      if (!zoomCv) { zoomCv = document.createElement('canvas'); zoomCv.width = A.W; zoomCv.height = A.H; }
      A.render(zoomCv.getContext('2d'), sc);
      var ap = A.actorPos(sc), sx = Math.max(0, Math.min(A.W / 2, ap.x - A.W / 4)), sy = Math.max(0, Math.min(A.H / 2, ap.y - 44));
      ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, A.W, A.H);
      ctx.drawImage(zoomCv, Math.round(sx), Math.round(sy), A.W / 2, A.H / 2, 0, 0, A.W, A.H);
    } else A.render(ctx, sc);
    if (app.flash > 0) app.flash = Math.max(0, app.flash - 0.12);
  }
  function asset(slot) { var v = C.setting(app.S, slot, null), a = v && app.assets[v]; return a && a.img.complete && a.img.naturalWidth ? { id: v, img: a.img, info: a.info || {} } : null; }
  app.sceneState = function () {
    var S = app.S, now = new Date(app.trueNow() + (app.dev.hourPreview || 0) * 3600e3), wn = U.wall(now), hr = wn.getHours() + wn.getMinutes() / 60;
    var w = app.weatherNow(), act = app.activity(now, w), biome = C.setting(S, 'biome', 'meadow');
    var mode = Date.now() < app.modeUntil ? app.mode : null;
    // the Library and Shop tabs have their own scenes
    var place = (AIU.ui && AIU.ui.onMain && AIU.ui.tab === 'library') ? 'library' : 'home'; // 1.1.0: the shop scene is archived
    var forced = app.forceAct && Date.now() < app.forceAct.until; // "Do it now" wins, even in the shop
    var pa = place !== 'home' && S.hatched && !app.evolve && !app.hatching && !forced ? A.placeActivity(place, Date.now() / 1000, U.hash32(S.egg.id) % 3) : null;
    if (pa) { act = { id: pa.id, indoor: true }; if (mode === 'sleepy') mode = null; }
    if (mode === 'greet' && act && act.id === 'sleep') mode = 'sleepy';
    var indoor = place !== 'home' ? true : act ? act.indoor : !!BAD[w.kind];
    if (mode === 'sleepy') indoor = true;
    A.kindPref = C.setting(S, 'ckind', 'auto'); // 1.1.0 creature type (Settings > Totem)
    var form = S.form, skin = app.evolve ? null : S.skinForm;
    var hatchP = app.hatching ? Math.min(1, (Date.now() - app.hatching.start) / app.hatching.dur) : null;
    var accent = S.hatched && form ? A.creature((skin || form).seed, (skin || form).stage, S.accentSeed).accent : A.P.red;
    var house = C.setting(S, 'house', 'cabin');
    return {
      stage: hatchP !== null ? 0 : S.stage,
      hour: hr, phase: A.phase(hr), season: A.season(wn, C.setting(S, 'hemisphere', 'north')), weather: w.kind, biome: biome,
      house: A.HOUSES[house] ? house : 'cabin', indoor: indoor, soul: S.accentSeed, accent: accent, form: form, skin: skin,
      eggSeed: U.hash32(S.egg.id), eggProgress: hatchP !== null ? (hatchP > 0.4 ? 0.95 : 0.8) : 0, hatching: hatchP !== null,
      act: act ? act.id : null, mode: mode, modeT: mode ? (Date.now() - app.modeStart) / Math.max(1, app.modeUntil - app.modeStart) : 0,
      f: app.f, tsec: Date.now() / 1000, unlocked: S.unlocked, justHatched: S.hatched && now.getTime() - S.hatchAt < 3600000,
      evolve: app.evolve ? { from: app.evolve.from, p: Math.min(1, (Date.now() - app.evolve.start) / app.evolve.dur) } : null,
      cast: app.casting ? { vals: app.casting.r.vals, t: Math.min(20, (Date.now() - app.casting.start) / 1000 * (20000 / app.casting.dur)) } : null,
      flash: app.flash, actLabel: pa ? pa.label + ' in the library' : act ? A.ACTIVITIES[act.id].label : '', weatherInfo: w,
      place: place, spotX: pa ? pa.spotX : 0, made: S.hatched && place === 'home' ? app.madeToday(now, w) : {},
      stressed: !!(AIU.gaba && S.hatched && app.dev.gabaCoach !== false && AIU.gaba.stressed(S, U.dayStr(new Date(app.trueNow())))), // the bar is in the red
      shop: { hat: asset('hat'), toy: asset('toy'), backdrop: asset('backdrop'), house: A.HOUSES[house] ? null : asset('house'), decor: asset('decor') }
    };
  };

  /* ---------- loops & listeners ---------- */
  function startLoops() {
    requestAnimationFrame(frame);
    setInterval(tickReminders, 5000);
    setInterval(tickReading, 5000);
    setInterval(tickBoard, 30000);
    setInterval(function () { if (app.S) app.rebuild(); }, 30000);
    setInterval(function () { if (app.prof && app.prof.token && !document.hidden) app.syncNow('timer').catch(function () {}); }, 60000);
    setInterval(function () { app.updateWeather(false); }, 10 * 60000);
  }
  function bindGlobal() {
    ['pointerdown', 'keydown', 'touchstart', 'mousemove'].forEach(function (ev) {
      window.addEventListener(ev, function (e) {
        if (ev === 'mousemove' && app.lastInput && Date.now() - app.lastInput < 5000) return;
        if (e.target && e.target.closest && e.target.closest('input,textarea,select') && ev === 'keydown') { app.lastInput = Date.now(); unlockAudio(); return; }
        app.wake(false);
      }, { passive: true });
    });
    window.addEventListener('online', function () { app.syncNow('online').catch(function () {}); app.updateWeather(true); });
    window.addEventListener('offline', function () { setSync('offline', 'You\'re offline. Everything is saved on this device.'); });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { app.saveCheckpoint(true); return; }
      if (app.prof && app.prof.token) app.syncNow('visible').catch(function () {});
    });
    window.addEventListener('pagehide', function () { app.saveCheckpoint(true); });
    window.addEventListener('hashchange', function () {
      var m = /^#reset\/([a-z0-9_-]+)\/([0-9a-f]+)$/.exec(location.hash);
      if (m) AIU.ui.resetScreen(m[1], m[2]);
    });
  }

  /* ---------- accounts ---------- */
  app.login = function (u, pw) {
    return app.api('login', { u: u, pw: pw, dn: app.dev.deviceName }).then(function (r) {
      var pid = 'u:' + r.u, old = app.profiles[pid] || {};
      app.profiles[pid] = Object.assign(old, { u: r.u, email: r.email, token: r.token, created: old.created || Date.now(), local: false });
      loginPw = pw; // used once after the first sync to open your account cards (never saved)
      delete app.profiles[pid].admin;
      return app.saveProfiles().then(function () { return pid; });
    });
  };
  app.startLocal = function () {
    var pid = 'local:' + U.id().replace(/[^A-Za-z0-9]/g, '').slice(0, 10);
    app.profiles[pid] = { u: null, local: true, created: Date.now() };
    return app.saveProfiles().then(function () { return app.openProfile(pid); });
  };
  // Move a device-only Totem into a brand-new (empty) account.
  app.linkLocalTo = function (localPid, newPid) {
    var src, dst;
    return AIU.store.open(localPid).then(function (s) { src = s; return s.all(); }).then(function (evs) {
      return AIU.store.open(newPid).then(function (d) { dst = d; return d.count(); }).then(function (n) {
        if (n) throw new Error('That account already has a Totem.');
        var carry = {}; evs.forEach(function (e) { if (e.type === 'acct' && e.data && e.data.key) { if (!carry[e.data.key] || carry[e.data.key].t < e.t) carry[e.data.key] = { t: e.t, card: e.data.removed ? null : e.data.card }; } });
        var copy = evs.filter(function (e) { return e.type !== 'acct'; }).sort(function (a, b) { return (a.ls || 0) - (b.ls || 0); }).map(function (e) { var c = Object.assign({}, e); c.seq = 0; delete c.rt; return c; });
        return dst.put(copy).then(function () { return Promise.all([src.get('seenStage'), src.get('weather'), src.get('local')]); })
          .then(function (r) {
            var loc = r[2] || {}; // account cards wait on the device until they can be scrambled with your password
            loc.carryCards = Object.keys(carry).filter(function (k) { return carry[k].card; }).map(function (k) { return { key: k, card: carry[k].card }; });
            return Promise.all([dst.set('seenStage', r[0]), dst.set('weather', r[1]), dst.set('local', loc)]);
          });
      });
    }).then(function () {
      app.profiles[localPid].linkedTo = newPid;
      return app.saveProfiles();
    });
  };
  app.logout = function () {
    var prof = app.prof;
    app.saveCheckpoint(true);
    var p = prof && prof.token ? app.api('logout', { u: prof.u, token: prof.token }).catch(function () {}) : Promise.resolve();
    return p.then(function () {
      if (prof) prof.token = null;
      app.pid = null; app.prof = null; app.S = null; app.popup = null;
      return Promise.all([app.saveProfiles(), app.meta.set('active', null)]);
    }).then(function () { AIU.ui.welcome(); });
  };
  app.forgetDevice = function () {
    var pid = app.pid, st = app.store;
    delete app.profiles[pid];
    app.pid = null; app.prof = null; app.S = null;
    return st.wipe().then(function () { return Promise.all([app.saveProfiles(), app.meta.set('active', null)]); }).then(function () { AIU.ui.welcome(); });
  };

  /* ---------- Accounts: cards scrambled with a key from your Aiu password (see vault.js) ----------
     Device-only Totems keep cards as they are (nothing leaves the device). Synced Totems scramble every card before it is
     saved or synced; the key lives only on your devices, so the server can't read the cards. */
  var vkey = null, vkeyFor = null;
  app.vaultMode = function () { return app.prof && app.prof.local ? 'plain' : (AIU.vault && AIU.vault.supported ? 'sealed' : 'none'); };
  function lockNow() { var L = app.S && C.setting(app.S, 'vaultLock', null); return L && L.salt ? L : null; }
  // Resolves the key, or null when this device needs your password first.
  app.vaultKey = function () {
    var V = AIU.vault, lock = lockNow();
    if (!lock || !V || !V.supported) return Promise.resolve(null);
    if (vkey && vkeyFor === lock.ct) return Promise.resolve(vkey);
    if (!app.prof.vk) return Promise.resolve(null);
    return V.importKey(app.prof.vk).then(function (k) { return V.fits(k, lock).then(function (ok) { if (ok) { vkey = k; vkeyFor = lock.ct; return k; } return null; }); }).catch(function () { return null; });
  };
  function keep(k, lock) { vkey = k; vkeyFor = lock.ct; return AIU.vault.exportKey(k).then(function (raw) { app.prof.vk = raw; return app.saveProfiles(); }).then(function () { return k; }); }
  // Your Aiu password typed in Accounts (or captured at log in). Makes the lock the first time; otherwise opens it.
  app.vaultUsePassword = function (pw) {
    var V = AIU.vault;
    return (app.prof.token ? app.syncNow('vault').catch(function () {}) : Promise.resolve()).then(function () {
      var lock = lockNow();
      if (!lock) return V.makeLock(pw, 1).then(function (r) { return app.addEvents([{ type: 'set', data: { k: 'vaultLock', v: r.lock } }]).then(function () { return keep(r.key, r.lock); }); }).then(vaultMigrate);
      return V.keyFor(pw, lock).then(function (k) { return keep(k, lock); }, function (e) {
        // the password changed (reset by email?) but this device still holds the old key: move the cards to the new password
        return app.vaultKey().then(function (old) { if (!old) throw e; return app.vaultRekey(pw); });
      }).then(vaultMigrate);
    });
  };
  // New password (Settings > Change password, or a reset): re-scramble every card with it.
  app.vaultRekey = function (pw) {
    var V = AIU.vault, lock = lockNow();
    return app.vaultKey().then(function (old) {
      if (!old) return null;
      var VA = app.S.vault || {}, ids = Object.keys(VA).filter(function (k) { return !VA[k].removed && VA[k].ct; });
      return Promise.all(ids.map(function (k) { return V.openCard(old, VA[k]).then(function (c) { return { key: k, card: c }; }, function () { return null; }); })).then(function (cards) {
        return V.makeLock(pw, ((lock && lock.gen) || 1) + 1).then(function (r) {
          return Promise.all(cards.filter(Boolean).map(function (x) { return V.sealCard(r.key, x.card).then(function (sl) { return { type: 'vault', data: { key: x.key, iv: sl.iv, ct: sl.ct, gen: r.lock.gen } }; }); }))
            .then(function (ev) { return app.addEvents([{ type: 'set', data: { k: 'vaultLock', v: r.lock } }].concat(ev)); }).then(function () { return keep(r.key, r.lock); });
        });
      });
    });
  };
  // Cards that were kept as they are (made before the account, or on a device-only Totem you linked) get scrambled now.
  function vaultMigrate(k) {
    if (!k) return k;
    var AC = app.S.accts || {}, plain = Object.keys(AC).filter(function (x) { return !AC[x].removed && AC[x].card; }).map(function (x) { return { key: x, card: AC[x].card }; });
    (app.local.carryCards || []).forEach(function (c) { plain.push({ key: c.key || ('v-' + U.id().replace(/[^A-Za-z0-9]/g, '').slice(0, 14)), card: c.card || c }); });
    if (!plain.length) return k;
    return Promise.all(plain.map(function (x) { return AIU.vault.sealCard(k, x.card).then(function (sl) { return { type: 'vault', data: { key: x.key, iv: sl.iv, ct: sl.ct, gen: (lockNow() || {}).gen || 1 } }; }); })).then(function (ev) {
      ev = ev.concat(Object.keys(AC).filter(function (x) { return !AC[x].removed; }).map(function (x) { return { type: 'acct', data: { key: x, removed: true } }; }));
      delete app.local.carryCards; app.saveLocal();
      return app.addEvents(ev).then(function () { return k; });
    });
  }
  // Every card you can open, as plain objects (for the Accounts screen, the PDF and the capsule)
  app.vaultCards = function () {
    var S = app.S, AC = S.accts || {}, out = [];
    Object.keys(AC).forEach(function (x) { if (!AC[x].removed && AC[x].card) out.push(Object.assign({}, AC[x].card, { key: x, t: AC[x].t, dn: AC[x].dn, plain: true })); });
    var VA = S.vault || {}, ids = Object.keys(VA).filter(function (x) { return !VA[x].removed && VA[x].ct; });
    if (!ids.length) return Promise.resolve(sortCards(out));
    return app.vaultKey().then(function (k) {
      return Promise.all(ids.map(function (x) {
        if (!k) return { key: x, locked: true, name: '(locked)', t: VA[x].t };
        return AIU.vault.openCard(k, VA[x]).then(function (c) { return Object.assign(c, { key: x, t: VA[x].t, dn: VA[x].dn }); }, function () { return { key: x, locked: true, name: '(locked with an old password)', t: VA[x].t }; });
      })).then(function (cs) { return sortCards(out.concat(cs)); });
    });
  };
  function sortCards(a) { return a.sort(function (x, y) { return String(x.name || '').toLowerCase() < String(y.name || '').toLowerCase() ? -1 : 1; }); }
  // Save one card (scrambled when this Totem syncs)
  app.vaultSave = function (key, card) {
    if (app.vaultMode() !== 'sealed') return app.addEvents([{ type: 'acct', data: { key: key, card: card } }]);
    return app.vaultKey().then(function (k) {
      if (!k) throw new Error('Enter your Aiu password in Accounts first.');
      return AIU.vault.sealCard(k, card).then(function (sl) {
        var ev = [{ type: 'vault', data: { key: key, iv: sl.iv, ct: sl.ct, gen: (lockNow() || {}).gen || 1 } }];
        if (app.S.accts && app.S.accts[key] && !app.S.accts[key].removed) ev.push({ type: 'acct', data: { key: key, removed: true } });
        return app.addEvents(ev);
      });
    });
  };
  app.vaultDelete = function (key) {
    var ev = [];
    if (app.S.vault && app.S.vault[key] && !app.S.vault[key].removed) ev.push({ type: 'vault', data: { key: key, removed: true } });
    if (app.S.accts && app.S.accts[key] && !app.S.accts[key].removed) ev.push({ type: 'acct', data: { key: key, removed: true } });
    return app.addEvents(ev);
  };
  // After logging in: use the password once to open (or set up) the cards, then forget it.
  var loginPw = null;
  app.vaultAfterLogin = function () {
    if (!loginPw || !app.S || app.vaultMode() !== 'sealed' || app.sync.state !== 'ok') return;
    var pw = loginPw; loginPw = null;
    app.vaultUsePassword(pw).catch(function () {}); // makes the lock the first time, or opens it on this device
  };

  /* ---------- capsules (zip of the data folder) ---------- */
  app.exportCapsule = function () {
    var S = app.S, opts = {};
    return app.vaultCards().catch(function () { return []; }).then(function (cards) { opts.cards = cards; return app.store.all(); }).then(function (all) {
      var evs = all.sort(C.cmpT), files = [], jr = {}, edits = S.jedit || {};
      var readme = 'AIU TOTEM CAPSULE\n=================\nThis folder is ' + S.totemName + '. Keep it safe (a USB drive is perfect).\n\n' +
        'events/events.jsonl  - the source of truth: every event, one JSON object per line, never edited\n' +
        'totems/totem.json    - a readable summary of the Totem right now\n' +
        'library/YYYY-MM.md   - one chapter per month: journal pages, done tasks, what you talked about\n' +
        'memory/*.json        - tasks, lists, quests, items & notes, facts and the word glossary\n\n' +
        'To bring it back: open Aiu Totem > Settings > Your data > Import capsule.\n';
      files.push({ name: 'aiu_totem/README.txt', data: readme });
      files.push({ name: 'aiu_totem/config/account.json', data: JSON.stringify({ username: app.prof.u, email: app.prof.email || null, exported: new Date().toISOString(), device: app.dev.deviceName, format: 'aiu-totem/2' }, null, 2) });
      files.push({ name: 'aiu_totem/totems/totem.json', data: JSON.stringify(C.snapshot(S), null, 2) });
      files.push({ name: 'aiu_totem/events/events.jsonl', data: evs.map(function (e) { var c = Object.assign({}, e); delete c.ls; return JSON.stringify(c); }).join('\n') + '\n' });
      evs.forEach(function (e) {
        if (e.type !== 'journal' || (S.jhide[e.id] && S.jhide[e.id].v)) return;
        var m = (e.d || '').slice(0, 7), txt = edits[e.id] ? edits[e.id].text : e.data.text;
        jr[m] = (jr[m] || '# Chapter ' + m + '\n\n') + '## ' + e.d + ' ' + (e.h || '') + ' (' + (e.dn || 'device') + ')' + (edits[e.id] ? ' (edited)' : '') + '\n\n' + txt + '\n\n';
      });
      Object.keys(jr).forEach(function (m) { files.push({ name: 'aiu_totem/library/' + m + '.md', data: jr[m] }); });
      files.push({ name: 'aiu_totem/memory/tasks.json', data: JSON.stringify(S.tasks, null, 2) });
      files.push({ name: 'aiu_totem/memory/lists.json', data: JSON.stringify(S.lists, null, 2) });
      files.push({ name: 'aiu_totem/memory/quests.json', data: JSON.stringify(C.questList(S).map(function (q) { return { title: q.title, state: q.state, steps: C.questSteps(S, q) }; }), null, 2) });
      files.push({ name: 'aiu_totem/memory/items.json', data: JSON.stringify({ items: S.entities, notes: S.notes }, null, 2) });
      files.push({ name: 'aiu_totem/memory/facts.json', data: JSON.stringify(S.facts, null, 2) });
      files.push({ name: 'aiu_totem/memory/glossary.json', data: JSON.stringify(M.glossary(S, 500), null, 2) });
      // 1.1.0: planner, business folders, accounts and the GABA log as readable files
      files.push({ name: 'aiu_totem/memory/planner.json', data: JSON.stringify({ items: S.plans, paid: S.planPaid }, null, 2) });
      files.push({ name: 'aiu_totem/memory/business.json', data: JSON.stringify(AIU.planner ? AIU.planner.docs(S).map(function (d) { return { folder: d.folder, title: d.title, sections: AIU.planner.sections(S, d).map(function (x) { return { heading: x.h, text: x.text }; }) }; }) : [], null, 2) });
      files.push({ name: 'aiu_totem/memory/gaba.json', data: JSON.stringify(AIU.gaba ? AIU.gaba.entries(S) : [], null, 2) });
      if (opts && opts.cards) files.push({ name: 'aiu_totem/memory/accounts.json', data: JSON.stringify(opts.cards.filter(function (c) { return !c.locked; }), null, 2) }); // your own backup, readable: keep the capsule safe
      files.push({ name: 'aiu_totem/memory/list-labels.json', data: JSON.stringify(S.listMeta, null, 2) });
      var d = U.wall(), stamp = d.getFullYear() + U.p2(d.getMonth() + 1) + U.p2(d.getDate()) + '-' + U.p2(d.getHours()) + U.p2(d.getMinutes());
      var name = 'aiu-capsule-' + (S.totemName || 'totem').replace(/[^A-Za-z0-9_-]+/g, '') + '-' + stamp + '.zip';
      U.download(U.makeZip(files), name);
      app.local.lastCapsule = Date.now(); app.saveLocal();
      return name;
    });
  };
  app.importCapsule = function (file) {
    return file.arrayBuffer().then(function (buf) {
      var u8 = new Uint8Array(buf);
      if (u8[0] === 0x50 && u8[1] === 0x4b) return U.readZip(buf).then(function (files) {
        var key = Object.keys(files).filter(function (n) { return /events\.jsonl$/.test(n); })[0];
        if (!key) throw new Error('No events.jsonl in that zip.');
        return U.fromUtf8(files[key]);
      });
      return U.fromUtf8(u8);
    }).then(function (text) {
      var incoming = [];
      text.split(/\r?\n/).forEach(function (line) {
        line = line.trim(); if (!line) return;
        try { var e = JSON.parse(line); if (e && typeof e.id === 'string' && typeof e.type === 'string' && typeof e.t === 'number') incoming.push(e); } catch (x) {}
      });
      if (!incoming.length) throw new Error('That file has no Totem events.');
      var myEgg = app.S.egg, theirEgg = incoming.filter(function (e) { return e.type === 'egg'; }).sort(C.cmpT)[0];
      if (myEgg && theirEgg && myEgg.id !== theirEgg.id) throw new Error('That capsule is a different Totem (' + ((theirEgg.data && theirEgg.data.name) || '?') + '). Import it into a fresh profile instead.');
      return app.store.getMany(incoming.map(function (e) { return e.id; })).then(function (have) {
        var fresh = incoming.filter(function (e) { return !have[e.id]; }).sort(C.cmpT), local = !!app.prof.local;
        fresh.forEach(function (e) { e.ls = app.lsNext++; e.d = e.d || U.dayStr(new Date(e.t)); if (local) { e.seq = app.seqNext++; e.rt = e.t; } else { e.seq = 0; delete e.rt; } });
        return app.store.put(fresh).then(function () {
          fresh.forEach(function (e) { C.apply(app.E, e); if (local) C.confirm(app.E, e); else app.unsent.push(e); });
          app.rebuild(); app.scheduleSync(); app.saveCheckpoint(true);
          return { added: fresh.length, total: incoming.length };
        });
      });
    });
  };

  // Load one month (chapter) of the library from the device.
  // 1.1.0: with your fixes applied and deleted lines left out, so old pages match what you see in Talk.
  app.chapter = function (month) {
    return app.store.days(month + '-01', month + '-31').then(function (evs) {
      var S = app.S;
      return evs.filter(function (e) { return !(S.jhide[e.id] && S.jhide[e.id].v); }).map(function (e) {
        var ed = S.jedit[e.id]; return ed ? Object.assign({}, e, { data: Object.assign({}, e.data, { text: ed.text }), edited: ed.t }) : e;
      });
    });
  };

  window.addEventListener('DOMContentLoaded', function () { app.boot(); });
})();
