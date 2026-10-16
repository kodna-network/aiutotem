/* AIU TOTEM - the app: profiles, saving events, checkpoints, syncing, reminders, weather, sound, voice, shop, the scene loop.
   app.E = the engine state (see core.js), app.S = the read-only view the screens and the mind use. */
(function () {
  'use strict';
  var U = AIU.util, C = AIU.core, A = AIU.art, M = AIU.mind, Wd = AIU.words;
  var CFG = window.AIU_CONFIG || { api: 'api.php', version: 'dev' };

  var app = AIU.app = {
    cfg: CFG, meta: null, profiles: {}, pid: null, prof: null, store: null,
    E: null, S: null, unsent: [], pending: null, dev: {}, deviceId: null, lsNext: 1, seqNext: 1,
    sync: { state: 'idle', last: 0, err: '' }, weather: null, clockOffset: 0,
    lastInput: 0, mode: null, modeStart: 0, modeUntil: 0, evolve: null, flash: 0, hatching: null,
    version: 0, lines: [], dismissed: {}, seenStage: null, popup: null, f: 0, local: {}, catalog: null, assets: {}
  };

  var DEV_DEFAULTS = { zoom: false, sound: 'knock', voice: false, voiceName: '', notif: false, fps: 8, theme: 'auto', idleMin: 10, deviceName: '', devtools: false, weatherPreview: '', hourPreview: 0,
    mute: false, chirp: true, listen: false, wake: false, tapRead: false, hearOthers: false, textSize: 'large', aiUrl: '', aiModel: '', aiKey: '',
    voiceURI: '', voiceCheck: 'auto', gabaCoach: true, bubble: 'short', followups: 'few', freeText: 'ask' }; // 1.1.0: tap-to-read starts off (it was easy to trigger by accident)

  function guessDeviceName() { // 2.1.11: just Phone, Tablet or Computer (an iPhone asking for desktop sites says it's a Mac, so we go by touch and size)
    var touch = (navigator.maxTouchPoints || 0) > 1 || 'ontouchstart' in window, small = Math.min(screen.width || 9999, screen.height || 9999);
    if (touch && small < 600) return 'Phone';
    if (touch && /iPad|Macintosh|Android|Tablet/i.test(navigator.userAgent || '')) return 'Tablet';
    return 'Computer';
  }
  var OLD_NAMES = { iPhone: 1, iPad: 1, 'Android phone': 1, 'Raspberry Pi': 1, 'Windows PC': 1, Mac: 1, Device: 1 };
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
      if (!app.dev.v110b) { app.dev.v110b = 1; app.dev.mute = false; if (r[1]) app.meta.set('dev', app.dev); } // 1.1.0 final: sound button works; close-up Aiu
      if (!app.dev.v110) { app.dev.v110 = 1; app.dev.voice = false; app.dev.tapRead = false; if (r[1]) app.meta.set('dev', app.dev); } // 1.1.0: Aiu writes in the Log; talking out loud is a choice in Settings
      if (!app.dev.v240) { app.dev.v240 = 1; if (app.dev.textSize === 'normal') app.dev.textSize = 'large'; app.dev.tapRead = false; if (r[1]) app.meta.set('dev', app.dev); } // 2.4.0: large text and big buttons to start; tap-to-hear is replaced by the page reader
      app.dev.zoom = false; // 2.1.15: no close-up view any more: always the whole world
      if (!app.dev.deviceName || OLD_NAMES[app.dev.deviceName]) app.dev.deviceName = guessDeviceName(); // (old automatic names like "Mac" are replaced)
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
  app.onOpen = AIU.hooks.open; // 2.2.0: screens that keep their own caches clear them when another profile opens
  app.openProfile = function (pid) {
    if (app.pid && app.pid !== pid && app.store) { try { app.saveCheckpoint(true); } catch (e) {} }
    app.pid = pid; app.prof = app.profiles[pid];
    app.S = null; app.popup = null; app.lines = []; app.lastInput = 0; app.assets = {};
    // 2.2.0: each profile is its own Aiu: nothing from the last one carries over
    app.casting = null; app.forceAct = null; app.trip = null; app.shownIn = null; app.placeReq = null; app.mode = null; app.modeUntil = 0; app.evolve = null; app.hatching = null; app.flash = 0; app.care = null; app.patAt = 0; app.boardInfo = null;
    app.sync = !app.prof.local && !app.prof.token ? { state: 'login', last: 0, err: 'Please log in again.' } : { state: 'idle', last: 0, err: '' }; app.weather = null; app.unsent = []; // 3.6.1: a profile that lost its log-in says so (it used to sit at "N waiting to sync" with no way to log back in)
    app.prof.lastOpen = Date.now(); app.saveProfiles();
    app.onOpen.forEach(function (fn) { try { fn(pid); } catch (e) {} });
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
      app.loadOwnedAssets();
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
    if (AIU.life) drafts = drafts.map(AIU.life.mark); // 2.4.0: the joy streak
    var t0 = app.trueNow(), list = [], local = !!app.prof.local;
    var away = !local && (navigator.onLine === false || /offline|login|error/.test(app.sync.state)); // made away from the "Poke Center"
    drafts.forEach(function (d, i) {
      var t = t0 + i, dt = new Date(t);
      var e = { id: d.id || U.id(), t: t, d: d.day && /^\d{4}-\d\d-\d\d$/.test(d.day) ? d.day : U.dayStr(dt), h: U.hmStr(dt), dev: app.deviceId, dn: app.dev.deviceName, type: d.type, data: d.data || {}, ls: app.lsNext++, seq: 0 };
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
    void city; return U.setZone(null); // 2.1.11: always this device's own clock and time zone (simpler, and right when you travel); the city is for weather only
  };
  app.rebuild = function (quiet) {
    app.applyZone();
    var now = app.trueNow();
    app.S = C.view(app.E, app.unsent, { now: now, username: app.prof && app.prof.u, display: app.prof && app.prof.disp });
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
    if (AIU.starter.retitle && app.local.starterV2 !== 9) { ev = ev.concat(AIU.starter.retitle(app.S)); app.local.starterV2 = 9; app.saveLocal(); } // 2.2.0: menus moved again (Profiles in Accounts, the new Log) // 2.0.0: menus moved again
    if (AIU.tiles && app.local.v2up !== 1) {
      // 2.0: the Inventory tile and to-dos as tiles. A synced Totem waits for a good sync first, so two devices don't both make them
      if (app.prof && !app.prof.local && !app.sync.last) { clearTimeout(app.upTimer); app.upTimer = setTimeout(app.starterQuests, 20000); }
      else { ev = ev.concat(AIU.tiles.upgradeEvents(app.S, U.dayStr(new Date(app.trueNow())))); app.local.v2up = 1; app.saveLocal(); }
    }
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
        app.flash = 1; app.setMode('hop', 2500); app.local.bornAt = Date.now(); app.saveLocal(); // 2.1.10: the newborn minutes start when you SEE it hatch
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
  // 2.0.0: pixel icons, not emoji ([icon, what Aiu does])
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
    wee: [['star', 'wheee!'], ['heart', 'up we go!']], happy: [['happy', 'beams']], // 2.3.0: picked up
    goin: [['home', 'heads inside']], goout: [['sun', 'heads outside']], stay: [['happy', 'okay, back to it']], // 2.1.15: tap the house
    tired: [['moon', 'yawns'], ['moon', 'is worn out'], ['cloud', 'needs some calm']] // 2.1.6: distressed (Vitals worn down)
  };
  // Tap Aiu = a pat on the back: a heart, a music-box note, and he keeps working (2.1.15: no tricks, no hops).
  // Every 10 pets = +1 growth (up to 3 a day).
  app.pet = function () {
    unlockAudio();
    if (!app.S || !app.S.hatched || app.hatching) { if (!app.hatching) app.setMode('eggtap', 450); app.beep('knock'); return; } // 2.1.10: an egg only wobbles (no tricks, hearts or points), and taps do nothing while it hatches
    app.patAt = Date.now(); // the scene shows happy eyes for a moment
    if (AIU.ui.pat) AIU.ui.pat(); else if (AIU.ui.hearts) AIU.ui.hearts(1);
    app.beep('musicbox');
    app.petCount();
    if (AIU.life) AIU.life.joy('pet');
  };
  app.unlock = function () { unlockAudio(); };
  app.petCount = function () { // every 10 pets (taps or rubs) = +1 growth, up to 3 a day
    if (!app.S || !app.S.hatched) return;
    var L = app.local, d = U.dayStr(new Date(app.trueNow()));
    if (L.petDay !== d) { L.petDay = d; L.petN = 0; L.petPts = 0; }
    L.petN = (L.petN || 0) + 1;
    if (!L.petted) { L.petted = 1; app.checkStarter(); }
    L.petPts = Math.max(L.petPts || 0, (app.S.petDays || {})[d] || 0); // 2.1.5: points already earned today on any device
    if (L.petN % 10 === 0 && (L.petPts || 0) < 3) { L.petPts = (L.petPts || 0) + 1; L.petAt = app.trueNow(); app.addEvents([{ type: 'pet', data: { n: 10 } }], true); if (AIU.ui.hearts) setTimeout(function () { AIU.ui.hearts(5); }, 300); }
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
    if (HAPPY[kind]) app.patAt = Date.now(); // 2.1.15: happy eyes, but he keeps working (no hop that cuts his activity short)
  };
  // What you just did -> one reaction (the biggest thing wins)
  var RANK = { quest: 6, check: 5, money: 4, calm: 4, stress: 4, journal: 3, done: 5, save: 1 };
  function reactTo(list) {
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
  // Before answering, the butler checks words it doesn't know in the full dictionary (online, at most ~1.5 seconds).

  // You said something (typed, spoken, or a corrected line). opts.editOf = the id of your line you just fixed:
  // that line is updated (the old words stay in the history) and Aiu answers the corrected version.
  // Fix or delete any line in the conversation (yours or Aiu's). Nothing is truly erased: the history keeps it.
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
  app.journal = function (text, day) {
    text = String(text || '').trim();
    if (!text) return Promise.resolve();
    var tday = U.dayStr(new Date(app.trueNow()));
    if (day && day < tday) return app.addEvents([{ type: 'journal', day: day, data: { text: text.slice(0, 20000) } }], true).then(function () { app.react('journal'); return { gained: 0 }; }); // 2.2.0: an earlier day's page
    var before = app.S.growth.confirmed + app.S.growth.pending;
    var G = AIU.gaba, dj = U.dayStr(new Date(app.trueNow())), extra = [], hit = null;
    if (false && G) { // 2.3.0: the journal no longer checks in calm things (Vitals are checked in Vitals only; the "Vitals from my journal" setting is gone)
      if (text.length >= 40 && !G.day(app.S, dj).some(function (g) { return g.item === 'Journaling'; })) extra.push(G.logEvent(app.S, dj, 'calm', 'Journaling', 8)); // writing is a Brake thing (once a day)
      hit = G.detect(text);
      if (hit && hit.kind === 'calm' && !G.day(app.S, dj).some(function (g) { return g.item === hit.item; })) extra.push(G.logEvent(app.S, dj, hit.kind, hit.item, hit.pts));
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
  /* ---------- 2.2.0: Aiu passes your calm thing on to the pet ----------
     You check in a calm thing in Vitals; Aiu gives the pet the same kind of care, for a few seconds (bigger refills take a
     little longer): gut = a snack, a drink = water, heart = a hug, arms & legs = a brushing, brain = a story, rest = a blanket. */
  var CARE = { gut: 'feed', heart: 'hug', move: 'brush', brain: 'read', rest: 'tuck' };
  app.careBuddy = function (sys, item, pts) {
    var S = app.S; if (!S || !S.hatched || app.hatching) return;
    var kind = /water|drink|tea|hydrat|juice|milk/i.test(item || '') ? 'water' : (CARE[sys] || 'hug'), dur = Math.round(3500 + Math.min(20, Math.abs(pts || 6)) * 300);
    if ((app.care && Date.now() < app.care.until) || app.casting) { app.careQ = (app.careQ || []).concat([{ kind: kind, dur: dur }]).slice(-3); return; }
    careRun(kind, dur);
  };
  function careRun(kind, dur) {
    var now = Date.now();
    app.care = { kind: kind, start: now, until: now + dur }; app.forceAct = { id: 'care_' + kind, until: now + dur }; app.trip = null;
    if (AIU.play && AIU.play.careAct) AIU.play.careAct(kind, dur);
    if (AIU.ui.refresh) AIU.ui.refresh();
    setTimeout(function () {
      if (!app.care || app.care.start !== now) return;
      app.care = null; app.forceAct = null;
      var nx = (app.careQ || []).shift(); if (nx) setTimeout(function () { careRun(nx.kind, nx.dur); }, 400);
    }, dur);
  }
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
  app.requestPlace = function (inside) {
    app.placeReq = { indoor: !!inside, until: Date.now() + 30 * 60000 };
    app.setMode('hop', 700); if (AIU.ui.refresh) AIU.ui.refresh();
  };
  /* ---------- 2.1.15: walking in and out of the house ----------
     Outside, tap the house: Aiu finishes what's queued first (a hop, the I Ching toss), then walks to the door and goes in.
     Tap the house again before he gets there and he turns around and goes back to what he was doing.
     Inside, tap the front door: he heads out the same way (and can be called back the same way). He stays put for 30 minutes,
     like the old door button, unless bedtime comes first. */
  var DOOR_X = 33, ROOM_EXIT = 128, WALK = 28; // 2.3.0: the front door is on the right wall of the downstairs room // px per second (ROOM_EXIT: the front door inside)
  app.trip = null;
  app.busyNow = function () { var now = Date.now(); return !!((app.mode && now < app.modeUntil) || app.casting || app.evolve || app.hatching); };
  function homeX(indoor) { return indoor ? 104 : A.AIU_OUT; }
  function tripX(t) { var p = Math.min(1, (Date.now() - t.start) / t.dur); return Math.round(t.x0 + (t.x1 - t.x0) * p); }
  function walk(t, x0, x1) { t.phase = 'walk'; t.x0 = x0; t.x1 = x1; t.start = Date.now(); t.dur = Math.max(500, Math.abs(x1 - x0) / WALK * 1000); return t; }
  app.houseTap = function (fromInside) {
    var S = app.S, sc = app.view && app.view.sc; if (!S || !S.hatched || app.hatching || !sc) return false;
    if (sc.act === 'sleep' || sc.mode === 'sleepy') { app.react('sleepy'); return true; } // bedtime: he stays in bed
    var t = app.trip;
    if (t && t.indoor !== !!fromInside) t = app.trip = null;
    if (t && t.dir === 'arrive' && t.phase === 'walk') { // 2.9.0: called back while he's still coming from the door (he used to pop to his spot, then back)
      if (!t.indoor) { app.trip = walk({ dir: 'go', indoor: false }, tripX(t), DOOR_X); app.react('goin'); return true; } // in the yard: he turns around where he is
      t.then = true; app.react('goout'); return true; // in the house: he finishes coming in, then heads straight back out
    }
    if (t && t.phase === 'wait') { app.trip = null; app.react('stay'); return true; } // changed your mind before he set off
    if (t && t.dir === 'go' && t.auto) { app.placeReq = { indoor: !t.indoor, until: Date.now() + 30 * 60000 }; app.react(fromInside ? 'goout' : 'goin'); return true; } // 2.9.0: he was already on his way there by himself: your tap says "yes, stay there a while" (it used to turn him around and flip the picture)
    if (t && t.dir === 'go') { app.trip = walk({ dir: 'back', indoor: t.indoor }, tripX(t), homeX(t.indoor)); app.react('stay'); return true; } // caught him on the way
    var x0 = t ? tripX(t) : homeX(!!fromInside);
    app.trip = { dir: 'go', indoor: !!fromInside, x0: x0, phase: 'wait', asked: Date.now() };
    app.react(fromInside ? 'goout' : 'goin');
    tickTrip();
    return true;
  };
  function tickTrip() {
    var t = app.trip; if (!t) return;
    var sc = app.view && app.view.sc;
    if (sc && !!sc.indoor !== t.indoor && t.phase === 'walk' && !t.auto && Date.now() - t.start > 600) { app.trip = null; return; } // 2.7.0: (an automatic walk owns the scene) // the scene changed under him (bedtime, a new place)
    if (t.phase === 'wait') {
      if (app.busyNow() || app.visit || Date.now() - t.asked < 900) return; // let the bubble show, and let him finish what's queued (2.9.0: a visit to a building too)
      if (Date.now() - t.asked > 5 * 60000) { app.trip = null; return; }
      walk(t, t.x0, t.indoor ? ROOM_EXIT : DOOR_X); if (t.indoor && A.houseRouteMs) t.dur = A.houseRouteMs(sc && A.aiuArea ? A.aiuArea(sc).id : 'living', 'door'); return;
    }
    if (Date.now() < t.start + t.dur) return;
    if (t.dir === 'go') { // through the door
      if (!t.auto) app.placeReq = { indoor: !t.indoor, until: Date.now() + 30 * 60000 }; // an automatic trip just follows what he's doing
      app.beep('door');
      app.trip = walk({ dir: 'arrive', indoor: !t.indoor, auto: t.auto }, t.indoor ? DOOR_X : ROOM_EXIT, homeX(!t.indoor));
      if (app.trip.indoor && A.houseRouteMs) app.trip.dur = A.houseRouteMs('door', t.toArea || 'living'); // 2.7.0: in the front door, then room by room
      app.shownIn = app.trip.indoor;
      if (AIU.ui.refresh) AIU.ui.refresh();
      return;
    }
    app.trip = null; // back at his spot: he picks up where he left off
    if (t.dir === 'arrive') app.shownIn = t.indoor;
    if (t.then) app.houseTap(t.indoor); // 2.9.0: you asked him to head back while he was coming in
  }
  app.tickTrip = tickTrip;
  app.tripWalk = function (indoor) { var t = app.trip; if (!t || t.phase !== 'walk' || t.indoor !== !!indoor) return null; var x = tripX(t); var p = Math.min(1, (Date.now() - t.start) / t.dur); return { x: x, left: t.x1 < t.x0, p: p, door: (t.dir === 'go' && p > 0.8) || (t.dir === 'arrive' && p < 0.2) }; };
  app.activity = function (now, w) {
    var S = app.S;
    if (!S || !S.hatched) return null;
    if (app.forceAct && Date.now() < app.forceAct.until && A.ACTIVITIES[app.forceAct.id]) { var fa = A.ACTIVITIES[app.forceAct.id]; return { id: app.forceAct.id, indoor: fa.where === 'in' || (fa.where === 'both' && !!BAD[w.kind]) }; }
    var fr = AIU.life && AIU.life.freeAct(); if (fr) return fr; // 2.4.0: you picked him up: he's free for a bit
    var pk = pickActivity(S, now, w);
    var born = Math.max(S.hatchAt || 0, app.local.bornAt || 0);
    if (born && Date.now() - born < 10 * 60000 && app.trueNow() - (S.hatchAt || 0) < 86400000 && pk.id !== 'sleep') return { id: 'newborn', indoor: !!BAD[w.kind] }; // 2.1.10: a newborn looks around first (no fishing straight out of the egg)
    return pk;
  };
  function pickActivity(S, now, w) {
    var biome = C.setting(S, 'biome', 'meadow'), season = A.season(U.wall(now), C.setting(S, 'hemisphere', 'north'));
    var wn = U.wall(now), hr = wn.getHours() + wn.getMinutes() / 60, per = A.period(wn.getHours()), phase = A.phase(hr), min = wn.getHours() * 60 + wn.getMinutes();
    if (per === 'bedtime' || min < 405) return { id: 'sleep', indoor: true }; // 2.4.0: asleep from 10 pm to about 6:45 am
    var outOK = !BAD[w.kind] && phase !== 'night';
    // 2.2.0: his routine: teeth morning and night, cooking before meals, meals at the table, dishes after dinner.
    // When the weather is nice, dinner is cooked hibachi-style at the firepit instead of in the kitchen.
    var RT = A.ROUTINE || [];
    for (var ri = 0; ri < RT.length; ri++) if (min >= RT[ri][0] && min < RT[ri][1] && A.ACTIVITIES[RT[ri][2]]) {
      var rid = RT[ri][2];
      if (rid === 'cookpan' && min >= 600 && outOK) return { id: 'hibachi', indoor: false }; // 2.4.0: lunch and dinner at the food cart when the weather is nice
      return { id: rid, indoor: true };
    }
    // 2.4.0: his own daily chores and care (the same all day on every device, a little different each day), then hobbies
    var plan = dailyPlan(S, U.dayStr(now));
    for (var pi = 0; pi < plan.length; pi++) if (min >= plan[pi][0] && min < plan[pi][1]) {
      var pid0 = plan[pi][2], pa0 = A.ACTIVITIES[pid0];
      if (pa0 && (pa0.where !== 'out' || outOK) && !(pa0.need === 'grass' && (biome === 'desert' || biome === 'beach' || biome === 'tundra' || season === 'winter'))) return { id: pid0, indoor: pa0.where === 'in' || (pa0.where === 'both' && !outOK) };
      return { id: 'tidy', indoor: true }; // bad weather: he tidies up inside instead
    }
    var slot = slotAt(S, now).i, r = U.rng(U.hash32(S.egg.id + U.dayStr(now) + ':' + slot));
    // 2.1.15: a deck for the day instead of a fresh dice roll every 20 minutes, so he works through everything he likes
    // before anything comes round again (a brand-new hobby is in the deck twice for its first 3 days, not three times as likely every slot)
    var deck = dayDeck(S, U.dayStr(now)), ok = function (id) {
      var a = A.ACTIVITIES[id]; if (!a) return false;
      if (id === 'stargaze' && !((phase === 'dusk' || phase === 'night') && w.kind === 'clear')) return false;
      if (a.need === 'sand' && biome !== 'beach' && biome !== 'desert') return false; // 2.0.0: sandcastles on sand,
      if (a.need === 'snow' && biome !== 'tundra' && season !== 'winter') return false; // snowmen in the snow
      if (a.need === 'grass' && (biome === 'desert' || biome === 'beach' || biome === 'tundra' || season === 'winter')) return false; // 2.2.0: weed whacking needs grass
      if (a.where === 'out' && !outOK) return false;
      return true;
    };
    var can = deck.filter(ok), pickH = function (sl) { var q = U.rng(U.hash32(S.egg.id + U.dayStr(now) + ':h' + sl)); return can.length ? can[Math.floor(q() * can.length)] : 'workout'; };
    var id = pickH(slot); if (can.length > 2 && id === pickH(slot - 1)) id = can[(can.indexOf(id) + 1) % can.length]; // 2.4.0: free time is a surprise each time (never the same thing twice in a row)
    var a = A.ACTIVITIES[id];
    return { id: id, indoor: a.where === 'in' || (a.where === 'both' && (!outOK || r() < 0.4)) };
  }
  /* 2.4.0: Aiu's day has a shape. Fixed every day (rooms.js A.ROUTINE): teeth when he gets up and half an hour before
     bed, three meals (lunch and dinner at the food cart when it's nice), dishes after dinner. Every day, at times that
     shift a little from day to day: caring for the pet (food and water in the morning and evening, a play in the
     afternoon), two chores (tidying, laundry, watering the flowers, weed whacking), and some evenings a bath before bed.
     Everything else is free time: a hobby or a one-off (fishing, a kite, chasing a butterfly...), 2 to 5 minutes each. */
  var planMemo = { k: '', v: null }, CARE_PLAY = ['fetch', 'petbuddy'], CHORES = ['tidy', 'laundry', 'water', 'weedwhack'];
  function dailyPlan(S, day) {
    var k = S.egg.id + day; if (planMemo.k === k) return planMemo.v;
    var r = U.rng(U.hash32(S.egg.id + ':plan:' + day)), out = [], ri = function (a, b) { return a + Math.floor(r() * (b - a + 1)); };
    var m1 = ri(480, 520); out.push([m1, m1 + 3, 'feedbuddy'], [m1 + 3, m1 + 6, 'waterbuddy']); // morning: breakfast for the pet
    var ch = CHORES.slice().sort(function () { return r() - 0.5; });
    var c1 = ri(600, 660); out.push([c1, c1 + 4, ch[0]]); // a late-morning chore
    var c2 = ri(870, 930); out.push([c2, c2 + 4, ch[1]]); // an afternoon chore
    var pl = ri(960, 1000); out.push([pl, pl + 4, CARE_PLAY[ri(0, 1)]]); // play with the pet
    var m2 = ri(1110, 1140); out.push([m2, m2 + 3, 'feedbuddy'], [m2 + 3, m2 + 5, 'waterbuddy']); // the pet's dinner
    if (r() < 0.5) { var bt = ri(1240, 1270); out.push([bt, bt + 6, 'bath']); } // some evenings, a soak before bed
    planMemo = { k: k, v: out }; return out;
  }
  app.dailyPlan = function (day) { return app.S && app.S.egg ? dailyPlan(app.S, day || U.dayStr(new Date(app.trueNow()))) : []; };
  var ROUTINE_ONLY = { brushteeth: 1, bath: 1, cookpan: 1, foodprep: 1, dishes: 1, hibachi: 1, eat: 1, feedbuddy: 1, waterbuddy: 1, petbuddy: 1, fetch: 1, tidy: 1, laundry: 1, water: 1, weedwhack: 1 }; // only at their times, never at random
  /* 2.4.0: Aiu's hobbies are short: 2 to 5 minutes each (the same on every device: seeded by the egg and the hour) */
  var slotMemo = {};
  function hourSlots(S, day, hr) {
    var k = S.egg.id + day + ':' + hr; if (slotMemo[k]) return slotMemo[k];
    var r = U.rng(U.hash32(S.egg.id + ':slots:' + day + ':' + hr)), out = [], t = 0;
    while (t < 60) { out.push(t); t += 2 + Math.floor(r() * 4); }
    if (Object.keys(slotMemo).length > 60) slotMemo = {};
    return (slotMemo[k] = out);
  }
  function slotAt(S, now) {
    var wn = U.wall(now), hr = wn.getHours(), m = wn.getMinutes(), sl = hourSlots(S, U.dayStr(now), hr), k = 0;
    while (k + 1 < sl.length && sl[k + 1] <= m) k++;
    return { i: hr * 30 + k, start: hr * 60 + sl[k] };
  }
  app.slotAt = function (now) { return app.S && app.S.egg ? slotAt(app.S, now || new Date(app.trueNow())) : null; };
  var deckMemo = { k: '', v: null };
  function dayDeck(S, day) {
    var k = S.egg.id + day + '|' + Object.keys(S.unlocked || {}).length + '|' + Object.keys(S.owned || {}).length;
    if (deckMemo.k === k) return deckMemo.v;
    var r = U.rng(U.hash32(S.egg.id + ':deck:' + day)), ids = [], extra = [], nowT = app.trueNow();
    Object.keys(A.ACTIVITIES).sort().forEach(function (id) {
      var a = A.ACTIVITIES[id];
      if (id === 'sleep' || id === 'eat' || ROUTINE_ONLY[id]) return; // 2.4.0: routine things keep to their times
      if (a.pack ? !S.owned[id] : (!a.base && !S.unlocked[id])) return;
      ids.push(id);
      var since = a.pack ? S.owned[id].t : S.unlocked[id];
      if ((!a.base && nowT - since < 3 * 86400000) || (a.pack && S.unlocked[id])) extra.push(id);
    });
    for (var i = ids.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = ids[i]; ids[i] = ids[j]; ids[j] = t; }
    extra.forEach(function (id) { var at = (ids.indexOf(id) + Math.ceil(ids.length / 2)) % ids.length; ids.splice(at, 0, id); }); // the second copy goes half a deck away
    deckMemo = { k: k, v: ids };
    return ids;
  }
  // 2.0.0: what Aiu made earlier today (it stays in the yard): replays today's 20-minute slots from 6 am. -> {paint: seed, ...}
  var madeCache = { key: '', v: {} };
  app.madeToday = function (now, w) {
    var S = app.S; if (!S || !S.hatched) return {};
    var wn = U.wall(now), min = wn.getHours() * 60 + wn.getMinutes(), cur = slotAt(S, now), key = S.egg.id + U.dayStr(now) + ':' + cur.i + ':' + w.kind + ':' + C.setting(S, 'biome', 'meadow');
    if (madeCache.key === key) return madeCache.v;
    var out = {}, day = U.dayStr(now);
    for (var hr0 = 6; hr0 <= wn.getHours(); hr0++) hourSlots(S, day, hr0).forEach(function (m0, k0) { // 2.4.0: every short slot since 6 am
      var at = hr0 * 60 + m0; if (at >= cur.start) return;
      var t = new Date(now.getTime() - (min - at) * 60000), x = pickActivity(S, t, w);
      if (x && A.MADE && A.MADE.indexOf(x.id) >= 0) out[x.id] = U.hash32(x.id + day + (hr0 * 30 + k0));
    });
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
  // 2.2.0: not in the list? A street address (with city and state) is looked up with the US Census Bureau's free public
  // geocoder (public domain; only the address you type is sent). It answers through a script tag (JSONP), so it works on iPhone too.
  app.censusLookup = function (address) {
    return new Promise(function (res, rej) {
      if (navigator.onLine === false || location.protocol === 'file:') return rej(new Error('This needs the internet (and Aiu opened from its web address).'));
      var cb = 'aiuGeo' + Date.now(), sc = document.createElement('script'), done = false;
      var timer = setTimeout(function () { finish(new Error('The Census lookup didn\'t answer. Try again, or type your coordinates.')); }, 15000);
      function finish(err, v) { if (done) return; done = true; clearTimeout(timer); try { delete window[cb]; } catch (e) { window[cb] = undefined; } sc.remove(); if (err) rej(err); else res(v); }
      window[cb] = function (j) {
        var m = j && j.result && j.result.addressMatches && j.result.addressMatches[0];
        if (!m || !m.coordinates) return finish(new Error('No match for that address. Use the street, city and state (like 123 Main St, Atlanta, GA), or type your coordinates.'));
        var lat = +(+m.coordinates.y).toFixed(4), lon = +(+m.coordinates.x).toFixed(4), comp = m.addressComponents || {}, nm = [comp.city, comp.state].filter(Boolean).join(', ');
        loadPlaces().then(function (list) { finish(null, { name: nm ? 'Near ' + nm.replace(/\b\w+/g, function (w) { return w.length > 2 ? w.charAt(0) + w.slice(1).toLowerCase() : w; }) : 'Near ' + nearest(list, lat, lon), lat: lat, lon: lon, tz: deviceZone() }); }, function () { finish(null, { name: nm || 'My address', lat: lat, lon: lon, tz: deviceZone() }); });
      };
      sc.onerror = function () { finish(new Error('Could not reach the Census lookup.')); };
      sc.src = 'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?benchmark=Public_AR_Current&format=jsonp&callback=' + cb + '&address=' + encodeURIComponent(String(address || '').slice(0, 200));
      document.head.appendChild(sc);
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
  // Two interchangeable servers: api.php (runs on any PHP host) and api.cgi (Ruby). If one answers with a web
  // page instead of Aiu's JSON (not uploaded, CGI not allowed, 500 page), the other is tried, and the one that
  // works is remembered on this device.
  function apiList() {
    var cfg = CFG.api || 'api.php', saved = null, alt = /\.php$/.test(cfg) ? cfg.replace(/api\.php$/, 'api.cgi') : cfg.replace(/api\.cgi$/, 'api.php');
    try { saved = localStorage.getItem('aiu-api'); } catch (e) {}
    var out = [];
    [saved, cfg, alt].forEach(function (u) { if (u && (u === cfg || u === alt) && out.indexOf(u) < 0) out.push(u); });
    return out;
  }
  app.apiUrl = function () { return apiList()[0]; };
  function pingUrl() { try { return new URL(CFG.api || 'api.php', location.href).href.replace(/^https?:\/\//, '').replace(/api\.cgi$/, 'api.php') + '?a=ping'; } catch (e) { return 'api.php?a=ping'; } }
  function apiOnce(url, action, body) {
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 20000);
    return fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
      body: JSON.stringify(Object.assign({ a: action }, body || {})), signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) {
      clearTimeout(timer);
      return r.text().then(function (txt) {
        var j; try { j = JSON.parse(txt); } catch (e) { j = null; }
        if (!j || typeof j !== 'object') { var er = new Error('The server gave an odd reply (' + r.status + ').'); er.code = 'bad_server'; er.status = r.status; throw er; }
        try { localStorage.setItem('aiu-api', url); } catch (e) {}
        if (!j.ok) { var e2 = new Error(j.error || 'Something went wrong'); e2.code = j.code; e2.status = r.status; throw e2; }
        return j;
      });
    }, function () {
      clearTimeout(timer);
      var e = new Error('Can\'t reach the server right now.'); e.code = 'offline'; throw e;
    });
  }
  app.api = function (action, body) {
    var list = apiList(), firstErr = null;
    function attempt(i) {
      return apiOnce(list[i], action, body).catch(function (e) {
        if (e.code !== 'bad_server') throw e;
        if (!firstErr) firstErr = e;
        if (i + 1 < list.length) return attempt(i + 1);
        var er = new Error('The account server isn\'t answering (' + list.map(function (u, k) { return u.replace(/^.*\//, '') + ' ' + (k === 0 ? firstErr.status : e.status); }).join(', ') +
          '). To check it, open ' + pingUrl() + ' in a browser. Help, "Account server", explains the fix.');
        er.code = 'bad_server'; throw er;
      });
    }
    return attempt(0);
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
    var prof = app.prof, st = app.store, before = noticeSnapshot(), hadTotem = !!(app.S && app.S.egg), gotRemote = 0, since = 0, remoteSaid = [], key = null, plain = false, turnedDown = 0;
    setSync('syncing');
    // 2.8.0: everything leaves this device scrambled with the account's data key, made or opened when you log in
    syncing = app.dataKey().then(function (k) {
      if (!k) { var e0 = new Error(AIU.vault && AIU.vault.supported ? 'Log in once more: from 2.8.0 your Totem is kept private (scrambled) on the server, and this device needs your password once to get its key.' : 'This browser can\'t scramble your data, so it can\'t sync. Open Aiu with https in a newer browser.'); e0.code = 'login'; throw e0; }
      key = k; return st.get('lastSeq');
    }).then(function (ls) {
      since = ls || 0;
      var toSend = app.unsent.slice().sort(C.cmpT);
      function round() {
        var part = toSend.splice(0, 500);
        return Promise.all(part.map(function (e) { return app.sealEvent(key, e); })).then(function (batch) {
          var body = { u: prof.u, token: prof.token, since: since, events: batch, dn: app.dev.deviceName, tid: prof.tid || '' }, wait = [];
          if (prof.pkind) body.pkind = prof.pkind; // 2.2.0: which profile, and its name (2.8.0: scrambled)
          if (prof.pname) wait.push(AIU.vault.sealText(key, prof.pname, 'pname').then(function (x) { body.pname = x; }));
          if (!toSend.length && app.S && app.S.egg) wait.push(AIU.vault.sealText(key, JSON.stringify(C.snapshot(app.S)), 'snap').then(function (x) { body.snapshot = { $x: x }; }));
          return Promise.all(wait).then(function () { return app.api('sync', body); });
        }).then(function (res) {
          app.clockOffset = res.now - Date.now(); if (res.plain) plain = true; turnedDown += res.rejected || 0;
          return app.openEvents(key, res.events).then(function () { return res; });
        }).then(function (res) {
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
      prof.lastSync = Date.now(); prof.synced = 1;
      app.saveProfiles();
      setSync('ok', turnedDown && uns.length ? turnedDown + (turnedDown === 1 ? ' change was' : ' changes were') + ' turned down by the server (too big?). ' + (turnedDown === 1 ? 'It stays' : 'They stay') + ' saved on this device.' : ''); // 3.6.1: say so, instead of "waiting" forever
      app.rebuild();
      app.saveCheckpoint(true);
      if (gotRemote && hadTotem) announceChanges(before);
      if (loginPw) setTimeout(app.vaultAfterLogin, 0);
      if (plain) setTimeout(function () { app.reseal(); }, 2000); // 2.8.0: older plain events on the server get scrambled
      if (app.dev.hearOthers && hadTotem && remoteSaid.length && why !== 'open') app.speak(remoteSaid.slice(-2).join(' ')); // e.g. the Pi says what Aiu told you on your phone
      app.sync.clockWarn = Math.abs(app.clockOffset) > 5 * 60000 ? Math.round(app.clockOffset / 60000) : 0;
      syncing = null;
    }, function (err) {
      syncing = null;
      if (err.code === 'login') { setSync('login', err.message); app.groupPids().forEach(function (k) { app.profiles[k].token = null; }); prof.token = null; app.saveProfiles(); }
      else if (err.code === 'profile_deleted') { prof.gone = Date.now(); app.saveProfiles(); setSync('error', 'This profile was deleted on another device. Its copy stays on this device until you remove it.'); }
      else setSync(err.code === 'offline' ? 'offline' : 'error', err.message);
      throw err;
    });
    return syncing;
  };
  /* 2.8.0: private sync. An event goes up as { id, t, d, h, dev, type, data: { $x: "x1:..." } }: its contents and the
     device name are scrambled together (tied to its id). Coming down, they're opened again before anything else sees them. */
  app.sealEvent = function (key, e) {
    return AIU.vault.sealText(key, JSON.stringify({ data: e.data || {}, dn: e.dn || '' }), e.id).then(function (x) {
      var o = { id: e.id, t: e.t, d: e.d, h: e.h, dev: e.dev, type: e.type, data: { $x: x } }; if (e.off) o.off = 1; if (e.imp) o.imp = 1; return o;
    });
  };
  app.openEvents = function (key, list) {
    return Promise.all((list || []).map(function (se) {
      if (!se.data || typeof se.data.$x !== 'string') return null; // an older plain event (scrambled later, see app.reseal)
      return AIU.vault.openText(key, se.data.$x, se.id).then(function (t) { var o = JSON.parse(t); se.data = o.data || {}; if (o.dn) se.dn = o.dn; else delete se.dn; });
    })).catch(function () { var e = new Error('This device can\'t open your Totem\'s data (its key doesn\'t fit). Log in again.'); e.code = 'login'; throw e; });
  };
  var dkey = null, dkeyFor = null;
  app.dataKey = function (raw) { // the account's data key (raw: from a profile record), or null on a device-only Totem / before log in
    raw = raw || (app.prof && !app.prof.local ? app.prof.dk : null);
    if (!raw || !AIU.vault || !AIU.vault.supported) return Promise.resolve(null);
    if (dkey && dkeyFor === raw) return Promise.resolve(dkey);
    return AIU.vault.importKey(raw).then(function (k) { dkey = k; dkeyFor = raw; return k; }, function () { return null; });
  };
  // older plain events on the server: this device sends each one scrambled, the server swaps them in place (once)
  var resealing = {};
  app.reseal = function () {
    var prof = app.prof, pid = app.pid, st = app.store, key;
    if (!prof || prof.local || !prof.token || resealing[pid]) return Promise.resolve();
    resealing[pid] = 1;
    return Promise.all([app.dataKey(), st.all()]).then(function (r) {
      key = r[0]; if (!key) throw new Error('no key');
      var evs = r[1].filter(function (e) { return e.seq > 0; }).sort(function (a, b) { return a.seq - b.seq; }), i = 0;
      function next() {
        var part = [], size = 0; while (i < evs.length && part.length < 800 && size < 2000000) { var e = evs[i++]; part.push(e); size += JSON.stringify(e.data || {}).length * 1.4 + 200; }
        return Promise.all(part.map(function (e) { return app.sealEvent(key, e).then(function (o) { return { id: o.id, data: o.data }; }); }))
          .then(function (list) { return app.api('reseal', { u: prof.u, token: prof.token, tid: prof.tid || '', events: list }); })
          .then(function (res) { return i < evs.length ? next() : res; });
      }
      return next();
    }).then(function (res) { resealing[pid] = res && res.left === 0 ? 'done' : 0; }, function () { resealing[pid] = 0; });
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
    app.loadOwnedAssets();
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
    var tq = AIU.tiles && AIU.tiles.tileOfTask(app.S, p.key); // 2.0.7: a tile's reminder: Done finishes the tile (and checks the reminder)
    if (tq && p.day === U.dayStr(new Date(app.trueNow())) && AIU.panels && AIU.panels.finishTile && !AIU.tiles.doneNow(app.S, tq, p.day)) return AIU.panels.finishTile(tq);
    app.addEvents([{ type: 'task_done', data: { key: p.key, date: p.day } }]);
  };

  /* ---------- the bounty board: about once an hour Aiu checks it, calls out, and the board under him starts over ---------- */
  app.checkBoard = function (why) {
    if (!app.S || !app.S.hatched || app.casting || app.evolve || app.hatching || app.care) return;
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
    if (!app.readingShown(U.dayStr(new Date(app.trueNow())))) return; // 2.2.0: today's I Ching toss comes first
    if (app.trueNow() - (app.local.boardAt || 0) > 60 * 60000) app.checkBoard('hourly');
  }
  /* ---------- the daily I Ching reading + hilltop review ----------
     2.2.0: Aiu casts by himself every night at midnight (or the next time you're here and he's free), and the very first
     reading comes a few moments after the egg hatches. The toss always plays first; the reading is saved (and shown) only
     when the coins land. A reading cast on another device plays its toss here too before it shows. The coins are seeded by
     the Totem and the day, so every device gets the same reading. */
  var HATCH_CAST_MS = 25000; // the first reading: a few moments after hatching
  app.readingShown = function (day) {
    var S = app.S, rv = S && (S.reviews || {})[day]; if (!rv) return false;
    if (app.casting && app.casting.day === day) return false;
    if (day !== U.dayStr(new Date(app.trueNow()))) return true; // earlier days: always
    return app.local.castSeen === day || app.local.castDay === day;
  };
  function tickReading() {
    var S = app.S;
    if (!S || !S.hatched || !AIU.ui.onMain || app.casting || app.hatching || app.evolve || document.hidden || app.popup || (window.AIU_TEST && window.AIU_TEST.noReading)) return;
    var today = U.dayStr(new Date(app.trueNow() + (app.dev.hourPreview || 0) * 3600e3)), rv = (S.reviews || {})[today];
    if (rv) { if (!app.readingShown(today) && castReady()) app.replayCast(rv); return; } // cast on another device: watch the toss here first
    if (app.local.castDay === today || !castReady()) return;
    app.autoCast(false);
  }
  function castReady() {
    var now = Date.now(), born = Math.max(app.S.hatchAt || 0, app.local.bornAt || 0);
    if (app.mode && now < app.modeUntil) return false;
    if (app.trip) return false; // 2.1.15: walking in or out (the toss waits its turn)
    if (app.placeReq && app.placeReq.indoor && now < app.placeReq.until) return false; // 2.9.0: you asked him to stay inside: the toss (in the yard) waits, instead of walking him straight back out
    if (app.forceAct && now < app.forceAct.until) return false;
    if (app.care) return false; // 2.2.0: passing care on to the pet
    if (AIU.play && AIU.play.active()) return false;
    if (document.querySelector('.sheet, .gov')) return false;
    if (AIU.ui.tab !== 'world') return false; // 2.4.0: the toss plays where you can see it
    if (born && now - born < HATCH_CAST_MS) return false;
    if (now - (app.lastInput || 0) < 4000) return false; // let you finish what you're tapping
    return true;
  }
  app.castReady = castReady;
  app.castReading = function () { app.autoCast(true); };
  function castRun(r, day, done) {
    var dur = app.dev.fastCast ? 3000 : 15000;
    app.casting = { r: r, day: day, start: Date.now(), dur: dur };
    app.forceAct = { id: 'iching', until: Date.now() + dur + 1500 };
    app.react('cast'); app.beep('chirp');
    if (AIU.ui.refresh) AIU.ui.refresh(true);
    setTimeout(done, dur);
  }
  app.autoCast = function () { // Aiu tosses the day's coins in the yard; the reading is saved when they land
    var S = app.S; if (!S || !S.hatched || app.casting) return;
    var day = U.dayStr(new Date(app.trueNow() + (app.dev.hourPreview || 0) * 3600e3));
    if ((S.reviews || {})[day]) { if (!app.readingShown(day)) app.replayCast(S.reviews[day]); return; }
    var r = AIU.iching.castFor(S.egg.id, day);
    castRun(r, day, function () {
      var ctx = app.ctx(), city = C.setting(app.S, 'city', null);
      var rv = M.hilltop(ctx, r, { place: city ? city.name : '', zone: AIU.hilltop.zoneName(city && city.tz) });
      app.local.castDay = day; app.local.castSeen = day; app.local.checkin = day; app.local.reviewSeen = day; app.saveLocal();
      app.addEvents([{ type: 'review', data: { day: day, hex: r.hex, rel: r.rel, vals: r.vals, moving: r.moving, text: rv.text, wx: rv.rv.wx, hm: rv.rv.hm, place: rv.rv.place, zone: rv.rv.zone } }], true).then(function () {
        app.casting = null;
        var saved = (app.S.reviews || {})[day] || Object.assign({ text: rv.text }, rv.rv);
        if (AIU.ui.showReview) AIU.ui.showReview(saved, true);
        app.setMode('greet', 2500);
      }, function () { app.casting = null; });
    });
  };
  app.replayCast = function (rv) { // the same toss, for a reading another device saved
    if (app.casting || !rv) return;
    castRun({ hex: rv.hex, rel: rv.rel, vals: rv.vals, moving: rv.moving }, rv.day, function () {
      app.casting = null; app.local.castSeen = rv.day; app.local.reviewSeen = rv.day; app.saveLocal();
      if (AIU.ui.showReview) AIU.ui.showReview(rv, true);
      app.setMode('greet', 2500);
    });
  };

  /* (1.1.0: the optional plug-in AI was removed. Aiu is guardrailed: it guides you toward its paths and never sends your data anywhere.) */
  // Today's (or any day's) journal page, edited by you: one field at a time, empty = back to Aiu's summary

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
  var MBOX = [784, 659, 784, 880, 784, 659, 587, 659, 523, 587, 659, 784, 880, 784, 659, 523];
  app.beep = function (kind) {
    if (app.dev.mute || !actx) return;
    if (!kind) { if (app.dev.sound === 'off') return; kind = app.dev.sound; } // 2.1.7: "Off" only silences the reminder sound, not Aiu and the pet
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
      // 2.1.7: play sounds (soft, short)
      else if (kind === 'toss') tone('triangle', 500, 900, 0, 0.12, 0.05);
      else if (kind === 'munch') { for (var m = 0; m < 3; m++) tone('square', 180 + m * 20, 120, m * 0.11, 0.05, 0.05); }
      else if (kind === 'slurp') { tone('sine', 300, 700, 0, 0.1, 0.12); tone('sine', 320, 760, 0.16, 0.1, 0.1); }
      else if (kind === 'splash') { for (var q = 0; q < 4; q++) tone('triangle', 1400 - q * 200, 600, q * 0.06, 0.06, 0.04); }
      else if (kind === 'door') { tone('triangle', 260, 180, 0, 0.12, 0.08); tone('sine', 120, 90, 0.22, 0.1, 0.25); }
      else if (kind === 'purr') tone('sawtooth', 70, 60, 0, 0.35, 0.04);
      else if (kind === 'musicbox') { // 2.1.15: each pat plays the next two notes of a little tune, like winding a music box
        for (var k = 0; k < 2; k++) { var mf = MBOX[(app.mbox = ((app.mbox || 0) + 1) % MBOX.length)]; tone('sine', mf, mf, k * 0.17, 0.55, 0.07); tone('triangle', mf * 2, mf * 2, k * 0.17, 0.2, 0.012); }
        // 2.4.0: little bells ring in between, in key and on the beat, so petting makes a little song with a groove
        var BELL = [1047, 1175, 1319, 1568, 1760, 2093], rb = Math.random();
        if (rb < 0.55) { var bf = BELL[Math.floor(Math.random() * BELL.length)], bt = Math.random() < 0.5 ? 0.085 : 0.255; tone('sine', bf, bf, bt, 0.9, 0.035); tone('sine', bf * 2.76, bf * 2.76, bt, 0.25, 0.008); }
        if (rb > 0.35) tone('triangle', 2400, 1800, 0.34, 0.03, 0.02); // a soft tick on the off-beat
      }
      else if (kind === 'chimes') { // 2.4.0: wind chimes now and then in the yard (pentatonic, so any mix sounds nice)
        var CH = [523, 587, 659, 784, 880, 1047, 1175, 1319], nch = 3 + Math.floor(Math.random() * 3), ct = 0;
        for (var ci = 0; ci < nch; ci++) { var cf = CH[Math.floor(Math.random() * CH.length)]; tone('sine', cf, cf, ct, 1.4, 0.025); tone('sine', cf * 2.76, cf * 2.76, ct, 0.4, 0.006); ct += 0.12 + Math.random() * 0.22; }
      }
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
  // 1.1.0 final: the speaker button at the top = sound and Aiu's robot voice on or off. Aiu only speaks when you ask it to
  // read something (Read aloud) and for reminders.
  // 2.1.7: Aiu's voice is a creature babble by default (Settings > Look & sound > Aiu's voice): a real voice or silence are choices
  app.speak = function (text, long) {
    var mode = app.dev.voiceMode || 'babble';
    if (app.dev.mute || mode === 'off') return;
    if (mode === 'babble') return app.babble(text);
    speakVoice(text, long);
  };
  app.babble = function (text) {
    if (app.dev.mute || !actx) return;
    var clean = String(text || '').replace(/\*[^*]*\*/g, ' ').replace(/[^A-Za-z!? ]/g, ' ').trim(); if (!clean) return;
    var syl = clean.toLowerCase().match(/[^aeiouy ]*[aeiouy]+|[!?]/g) || ['a'], n = Math.min(14, syl.length), seed = (app.S && app.S.accentSeed) || 7;
    var base = 420 + (seed % 7) * 45 + (app.S && app.S.stage ? Math.max(0, 5 - app.S.stage) * 25 : 60), t = actx.currentTime + 0.02, end = /\?\s*$/.test(clean) ? 1.25 : /!\s*$/.test(clean) ? 1.12 : 0.9;
    try {
      for (var i = 0; i < n; i++) {
        var v = syl[i], vo = /[ou]/.test(v) ? 0.85 : /[ie]/.test(v) ? 1.18 : 1, f = base * vo * (1 + ((U.hash32(v) % 9) - 4) * 0.03) * (i === n - 1 ? end : 1), d = 0.055 + (v.length > 3 ? 0.02 : 0);
        var o = actx.createOscillator(), g = actx.createGain();
        o.type = i % 3 === 2 ? 'triangle' : 'square'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * (i === n - 1 ? end : 1.04), t + d);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.045, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + d);
        o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + d + 0.02);
        t += d + 0.018;
      }
    } catch (e) {}
  };
  function speakVoice(text, long) {
    if (app.dev.mute || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
    var clean = String(text).replace(/\*[^*]*\*/g, ' ').replace(/\([^)]*\)/g, ' ').replace(/["“”]/g, '').replace(/\s+/g, ' ').trim();
    if (!clean) return;
    if (!long && clean === lastQueued.text && Date.now() - lastQueued.t < 8000) return; // never the same line twice in a row
    lastQueued = { text: clean, t: Date.now() };
    app.spoken.push({ text: clean.toLowerCase(), t: Date.now() }); if (app.spoken.length > 12) app.spoken.shift();
    if (long) { app.hush(); } else if (speechQ.length >= 2) speechQ.splice(0, speechQ.length - 1); // a backlog would sound like repeating: keep only the newest
    speechQ.push(chunks(clean.slice(0, long ? 6000 : 1200)));
    pump();
  }
  app.speakVoice = speakVoice;
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
  app.readAloud = function (text) { unlockAudio(); if (speaking) { app.hush(); return false; } speakVoice(text, true); return true; }; // reading your own pages aloud always uses a real voice

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

  /* ---------- 2.6.0: the old server-folder shop is retired (the Corner Mart, js/shop.js, is the only shop). The original
     is in _archive/2.6.0-replaced/app.old-shop-1.0.5.js; these stubs keep older calls harmless. ---------- */
  app.catalog = null;
  app.loadCatalog = function () { return Promise.resolve({ items: [], categories: {}, problems: [] }); };
  app.itemInfo = function () { return null; };
  app.buy = function () { return Promise.reject(new Error('The Corner Mart (the Shop tab) is the shop now.')); };
  app.cacheAsset = function () { return Promise.resolve(null); };
  app.registerActivities = function () {};
  app.ownedActivityIds = function () { return []; };
  app.loadOwnedAssets = function () {};

  /* ---------- the scene ---------- */
  var lastDraw = 0, lastTick = 0;
  function frame(ts) {
    requestAnimationFrame(frame);
    if (document.hidden) return;
    if (app.trip) tickTrip();
    var fps = Math.max(2, Math.min(24, +app.dev.fps || 8)), PLY = AIU.play, live = (PLY && PLY.active()) || !!(app.trip && app.trip.phase === 'walk'); // 2.1.7: while you play, the treats and hearts move smoothly (the world itself keeps its own pace)
    if (ts - lastDraw < 1000 / (live ? Math.max(fps, 24) : fps)) return;
    lastDraw = ts; if (ts - lastTick >= 1000 / fps - 2) { lastTick = ts; app.f++; }
    var cv = AIU.ui.canvas && AIU.ui.canvas();
    if (!cv || !app.S || !app.S.egg) return;
    if (AIU.ui.tab && AIU.ui.tab !== 'world' && !document.documentElement.classList.contains('worldfull')) return; // 2.4.0: the world only draws on the World tab
    var sc = app.sceneState(), ctx = cv.getContext('2d');
    if (app.f % 8 === 0 && AIU.ui.statusTick) AIU.ui.statusTick(sc);
    { var CSL = A.CASTLE && AIU.castle && !A.isRoom(sc); A.W = CSL ? AIU.castle.W : 192; A.SCALE = CSL ? AIU.castle.SC : 4; var SC = A.SCALE || 1; A.H = CSL ? AIU.castle.H : sc.place === 'library' && A.isRoom(sc) ? 144 : A.isRoom(sc) ? (A.HOUSE_H || 270) : (A.YARD_H || 144); // 3.1: the castle is its own size (288 x 405, drawn 3x) // 2.8.0: the yard is as tall as the house (the library page keeps its own size)
      if (cv.width !== A.W * SC || cv.height !== A.H * SC) { cv.width = A.W * SC; cv.height = A.H * SC; cv.style.aspectRatio = A.W + ' / ' + A.H; ctx = cv.getContext('2d'); } // 2.3.0: the property (drawn 4x for crisp in-between sizes)
      app.view = { sx: 0, sy: 0, z: 1, sc: sc }; if (A.renderWorld) A.renderWorld(ctx, sc); else A.render(ctx, sc);
      if (PLY) { var fo = A.frameOff ? A.frameOff(sc) : { x: 0, y: 0 }; ctx.save(); ctx.setTransform(SC, 0, 0, SC, SC * fo.x, SC * fo.y); PLY.draw(ctx, sc); ctx.restore(); }
      if (AIU.shop && AIU.shop.drawFx && !A.isRoom(sc)) { ctx.save(); ctx.setTransform(SC, 0, 0, SC, 0, 0); AIU.shop.drawFx(ctx); ctx.restore(); } } // 2.6.0: treats (fireworks, confetti)
    if (app.flash > 0) app.flash = Math.max(0, app.flash - 0.12);
  }
  function asset(slot) { var v = C.setting(app.S, slot, null), a = v && app.assets[v]; return a && a.img.complete && a.img.naturalWidth ? { id: v, img: a.img, info: a.info || {} } : null; }
  // the pet's alignment (2.1.6: from your Vitals, stressors aren't counted): a week of calm check-ins = Light (a halo), worn out with hardly any = Shadow (horns), else Balanced
  var alignMemo = { k: '' };
  app.alignment = function () {
    var S = app.S, GB = S && S.gaba ? S.gaba : {}, d = U.dayStr(new Date(app.trueNow())), dis = !!(AIU.vitals && AIU.vitals.distressed(S)), k = app.pid + d + '|' + Object.keys(GB).length + '|' + dis;
    if (alignMemo.k === k) return alignMemo.v;
    var from = U.addDays(d, -6), br = 0, go = 0;
    Object.keys(GB).forEach(function (x) { var g = GB[x]; if (!g || g.removed || g.d < from || g.d > d || g.kind !== 'calm') return; br += Math.max(1, +g.pts || 0); });
    var a = br >= 30 && !dis ? 'light' : dis && br < 12 ? 'shadow' : 'balanced';
    alignMemo = { k: k, v: { a: a, brake: br, go: go } };
    return alignMemo.v;
  };
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
    var roomDef = act && A.ACTIVITIES[act.id]; // 2.2.0: the kitchen or the bathroom while he's busy in it
    // 2.1.5: the door: you asked Aiu to go in or out (for 30 minutes). Bedtime still wins: Aiu sleeps inside.
    var pr = app.placeReq && Date.now() < app.placeReq.until ? app.placeReq : null;
    if (pr && place === 'home' && !(act && act.id === 'sleep') && mode !== 'sleepy' && !(forced && act && /^(care_|iching)/.test(act.id))) {
      indoor = pr.indoor;
      var ad = act && A.ACTIVITIES[act.id];
      if (ad && ((indoor && ad.where === 'out') || (!indoor && ad.where === 'in'))) act = { id: indoor ? 'bubbles' : (Math.floor(Date.now() / 600000) % 2 ? 'butterfly' : 'workout'), indoor: indoor }; // 2.1.7 fix: pick one for 10 minutes (it used to flip every frame, so Aiu twitched between two activities)
    }
    var roomWant = roomDef && roomDef.room ? roomDef.room : null; // 3.0: in the castle he goes to that room (the scene stays the castle)
    if (!A.CASTLE && place === 'home' && indoor && roomDef && roomDef.room && A.ROOMS && A.ROOMS[roomDef.room] && !app.tripWalk(true) && mode !== 'sleepy' && !app.trip && app.shownIn !== false) { /* 2.9.0: only once he's inside (it used to cut to the kitchen while he was still in the yard) */ place = roomDef.room; pa = { id: act.id, label: roomDef.label, spotX: (A.ROOMSPOT || {})[act.id] || 0, room: true }; }
    A.kindPref = C.setting(S, 'ckind', 'auto'); // 1.1.0 creature type (Settings > Totem)
    var form = S.form, skin = app.evolve ? null : S.skinForm;
    var hatchP = app.hatching ? Math.min(1, (Date.now() - app.hatching.start) / app.hatching.dur) : null;
    var accent = S.hatched && form ? A.creature((skin || form).seed, (skin || form).stage, S.accentSeed).accent : A.P.red;
    var house = C.setting(S, 'house', 'cabin');
    // 2.3.0: you can look out at the yard while Aiu stays in a room (tap the door), and tap the house to look back in
    // 2.7.0: no cut between the house and the yard: when what he's doing moves him in or out, he walks there
    // (through the rooms to the front door, out, across the yard; or the other way round)
    var T0 = app.trip;
    if (!A.CASTLE && place === 'home' && S.hatched && !app.hatching && !app.evolve && !app.peek && !app.visit) { // (3.0: the castle has no in-and-out walks: castle.js walks him room to room)
      if (app.shownIn === undefined || app.shownIn === null) app.shownIn = indoor;
      if (!T0 && indoor !== app.shownIn && !(mode === 'sleepy' && app.shownIn)) {
        var from = app.shownIn, lastSc = app.view && app.view.sc;
        T0 = app.trip = walk({ dir: 'go', indoor: from, auto: true, toArea: A.aiuArea ? A.aiuArea({ act: act ? act.id : null, place: roomDef && roomDef.room ? roomDef.room : 'home', mode: mode }).id : 'living' }, homeX(from), from ? ROOM_EXIT : DOOR_X);
        if (from && A.houseRouteMs) T0.dur = A.houseRouteMs(lastSc && A.aiuArea ? A.aiuArea(lastSc).id : 'living', 'door');
      }
      if (T0 && T0.auto) indoor = T0.indoor; // he's still on this side until he's through the door
    }
    var aiuIn = false, roomPlace = null;
    if (app.peek && Date.now() < app.peek.until && (indoor || place !== 'home') && place !== 'library' && !app.hatching) { aiuIn = true; roomPlace = place; indoor = false; place = 'home'; pa = null; }
    else if (app.peek && !(indoor || place !== 'home')) app.peek = null; // he came outside: nothing to peek at
    return {
      aiuIn: aiuIn, roomPlace: roomPlace, roomWant: roomWant,
      stage: hatchP !== null ? 0 : S.stage,
      hour: hr, phase: A.phase(hr), season: A.season(wn, C.setting(S, 'hemisphere', 'north')), weather: w.kind, biome: biome,
      house: A.HOUSES[house] ? house : 'cabin', indoor: indoor, soul: S.accentSeed, buddy: C.setting(S, 'buddy', 'auto'), gear: (AIU.shop && AIU.shop.sceneBits(S).gearPref) || C.setting(S, 'gear', 'auto'), /* 2.6.0: from the Corner Mart's Pet gear shelf */ align: app.alignment().a, accent: accent, form: form, skin: skin,
      eggSeed: U.hash32(S.egg.id), eggProgress: hatchP !== null ? (hatchP > 0.4 ? 0.95 : 0.8) : 0, hatching: hatchP !== null,
      act: act ? act.id : null, mode: mode, modeT: mode ? (Date.now() - app.modeStart) / Math.max(1, app.modeUntil - app.modeStart) : 0,
      f: app.f, tsec: Date.now() / 1000, unlocked: S.unlocked, justHatched: S.hatched && now.getTime() - S.hatchAt < 3600000,
      evolve: app.evolve ? { from: app.evolve.from, p: Math.min(1, (Date.now() - app.evolve.start) / app.evolve.dur) } : null,
      cast: app.casting ? { vals: app.casting.r.vals, t: Math.min(20, (Date.now() - app.casting.start) / 1000 * (20000 / app.casting.dur)) } : null,
      flash: app.flash, actLabel: pa ? pa.label + (pa.room ? '' : ' in the library') : act ? A.ACTIVITIES[act.id].label : '', weatherInfo: w,
      place: place, spotX: pa ? pa.spotX : 0, made: {}, // 2.2.0: the yard is tidied after each thing he does
      board: app.boardInfo || null,
      vit: S.hatched && AIU.vitals ? AIU.vitals.state(S) : null, // 2.1.13: the drone's light // 2.1.11: the Today counter, pinned on the bounty board
      walk: aiuIn || indoor ? null : app.tripWalk(false), hLeave: !!(indoor && app.trip && app.trip.indoor && app.trip.dir === 'go' && app.trip.phase === 'walk'), hArrive: indoor && app.trip && app.trip.indoor && app.trip.dir === 'arrive' ? app.trip.start : 0, /* 2.7.0: inside, the walk goes room by room (world.js houseWalk) */ doorOpen: !!(indoor && app.tripWalk(indoor) && app.tripWalk(indoor).door), pat: Date.now() - (app.patAt || 0) < 900, // 2.1.15: walking in or out; happy eyes after a pat
      bplay: AIU.play ? AIU.play.buddyState() : null, // 2.1.7: the pet eating, drinking or doing a trick
      stressed: !!(AIU.vitals && AIU.vitals.distressed(S)), // 2.1.6: Vitals worn down: Aiu looks tired (and doesn't grow)
      shop: {}, // 2.6.0: the old server-folder shop is retired (was hat, toy, backdrop, house, decor from app.assets)
      cos: AIU.shop ? AIU.shop.sceneBits(S) : {} // 2.5.0: what you bought in the Corner Mart and put on
    };
  };

  /* ---------- loops & listeners ---------- */
  function startLoops() {
    requestAnimationFrame(frame);
    setInterval(function () { if (actx && !app.dev.mute && app.S && app.S.hatched && AIU.ui.onMain && AIU.ui.tab === 'world' && !document.hidden && !document.querySelector('.gov') && Math.random() < 0.3) app.beep('chimes'); }, 15000); // 2.4.0: wind chimes in the yard
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
  // 2.8.0: the profile id for an account's profile on this device (it keeps its id when the username changes)
  app.pidFor = function (u, tid) {
    var hit = Object.keys(app.profiles).filter(function (k) { var p = app.profiles[k]; return p && !p.local && p.u === u && (p.tid || '') === (tid || ''); })[0];
    if (hit) return hit;
    var base = 'u:' + u + (tid ? '#' + tid : ''), pid = base, n = 2; while (app.profiles[pid]) pid = base + '~' + (n++); return pid;
  };
  app.renameLocal = function (oldU, newU, disp) { Object.keys(app.profiles).forEach(function (k) { var p = app.profiles[k]; if (p && !p.local && p.u === oldU) { p.u = newU; p.disp = disp || ''; } }); };
  // 2.8.0: the account's data key: opened with your password, or made (and locked with it) the first time
  function dataKeyAtLogin(r, pw) {
    var V = AIU.vault;
    if (!V || !V.supported) return Promise.reject(new Error('This browser can\'t keep your data private (Aiu needs https and a newer browser to sync).'));
    var opened = function (k) { return crypto.subtle.exportKey('raw', k).then(function (raw) { var s0 = '', u8 = new Uint8Array(raw); for (var i = 0; i < u8.length; i++) s0 += String.fromCharCode(u8[i]); return btoa(s0); }); };
    if (r.dk) return V.openDataKey(pw, r.dk).then(opened);
    return V.newDataKey().then(function (k) {
      return V.lockDataKey(pw, k).then(function (lk) { return app.api('dkey_set', { u: r.u, token: r.token, dk: lk }).then(function (res) { return res.dk && res.dk.ct !== lk.ct ? V.openDataKey(pw, res.dk) : k; }); });
    }).then(opened);
  }
  app.login = function (u, pw, disp, opt) {
    var r;
    return app.api('login', { u: u, pw: pw, dn: app.dev.deviceName }).then(function (r0) { r = r0; return dataKeyAtLogin(r, pw); }).then(function (raw) {
      var same = opt && opt.same && app.profiles[opt.same]; // relogging in after the username changed on another device: same key = same account
      if (same && same.u !== r.u && same.dk && same.dk === raw) app.renameLocal(same.u, r.u, '');
      var pid = app.pidFor(r.u, ''), old = app.profiles[pid] || {}, dn = disp && String(disp).trim().toLowerCase() === r.u ? String(disp).trim() : (old.disp || ''); // 2.5.0: your username the way you typed it (Henry, not henry)
      app.profiles[pid] = Object.assign(old, { u: r.u, email: r.email, token: r.token, created: old.created || Date.now(), local: false, tid: '', dk: raw });
      Object.keys(app.profiles).forEach(function (k) { var p = app.profiles[k]; if (!p.local && p.u === r.u) { p.token = r.token; p.email = r.email; p.dk = raw; if (dn) p.disp = dn; } }); // 2.2.0: one log in for every profile in the account
      loginPw = pw; // used once after the first sync to open your account cards (never saved)
      delete app.profiles[pid].admin;
      return app.saveProfiles().then(function () { return app.fetchProfiles(r.u).catch(function () {}); }).then(function () {
        var best = app.groupPids(pid).sort(function (a, b) { return (app.profiles[b].lastOpen || 0) - (app.profiles[a].lastOpen || 0); })[0];
        return best || pid; // the profile you had open last on this device
      });
    });
  };
  /* ---------- 2.2.0: profiles. One account (or one device) can hold several Aius, each a fresh start with its own egg,
     journal, tiles, plan, profile and account cards. The first one is the account itself (pid 'u:name'); the others are
     'u:name#tid' (tid = t + letters). Device-only profiles share a group id (grp). One is open at a time. ---------- */
  function rid(n) { return U.id().toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, n || 10); }
  app.groupOf = function (pid) { var p = app.profiles[pid]; if (!p) return ''; return p.local ? 'L:' + (p.grp || pid) : 'U:' + p.u; };
  app.groupPids = function (pid) {
    var g = app.groupOf(pid || app.pid);
    return Object.keys(app.profiles).filter(function (k) { var p = app.profiles[k]; return g && app.groupOf(k) === g && !p.linkedTo && !p.gone && (p.token || p.local || k === (pid || app.pid)); })
      .sort(function (a, b) { var A0 = app.profiles[a], B0 = app.profiles[b]; return (A0.tid ? 1 : 0) - (B0.tid ? 1 : 0) || (A0.created || 0) - (B0.created || 0); });
  };
  app.newTid = function () { return 't' + rid(11); };
  app.profName = function (pid) { var p = app.profiles[pid || app.pid] || {}; return p.pname || (p.u && !p.tid ? Wd.cap(p.u) : p.local && !p.grp ? 'My Aiu' : 'Profile'); };
  app.profKind = function (pid) { var p = app.profiles[pid || app.pid] || {}; return p.pkind === 'business' ? 'business' : 'personal'; };
  // the account's profiles from the server (other devices may have made some)
  app.fetchProfiles = function (u) {
    var any = Object.keys(app.profiles).map(function (k) { return app.profiles[k]; }).filter(function (p) { return !p.local && p.u === u && p.token; })[0];
    if (!any) return Promise.resolve([]);
    var key = null;
    return app.dataKey(any.dk).then(function (k) { key = k; return app.api('profiles', { u: u, token: any.token }); }).then(function (r) {
      return Promise.all((r.profiles || []).map(function (x) { // 2.8.0: names and summaries come scrambled
        var V = AIU.vault, w = [];
        if (key && V.isSealed(x.name)) w.push(V.openText(key, x.name, 'pname').then(function (t) { x.name = t; }, function () { x.name = ''; }));
        if (key && V.isSealed(x.snap)) w.push(V.openText(key, x.snap, 'snap').then(function (t) { var o = JSON.parse(t); x.totem = o.name || ''; x.stage = o.stage_name || ''; }, function () {}));
        if (V.isSealed(x.name) && !key) x.name = '';
        return Promise.all(w);
      })).then(function () { return r; });
    }).then(function (r) {
      var seen = {};
      (r.profiles || []).forEach(function (x) {
        var pid = app.pidFor(u, x.tid || ''), p = app.profiles[pid] || (app.profiles[pid] = { u: u, email: any.email, created: x.created || Date.now(), local: false, tid: x.tid });
        p.token = any.token; p.dk = any.dk; p.tid = x.tid || ''; p.synced = 1; seen[pid] = 1; delete p.gone;
        if (x.name && !p.pnameLocal) p.pname = x.name; if (x.kind) p.pkind = x.kind;
        if (x.totem) p.label = x.totem + (x.stage ? ' (' + x.stage + ')' : '');
      });
      Object.keys(app.profiles).forEach(function (k) { var p = app.profiles[k]; if (!p.local && p.u === u && p.tid && !seen[k] && p.synced) p.gone = Date.now(); }); // deleted on another device
      return app.saveProfiles().then(function () { return r.profiles || []; });
    });
  };
  // a brand-new profile: a fresh egg, nothing carried over. kind: 'personal' or 'business'
  app.newProfile = function (name, kind) {
    var cur = app.prof || {}, pid, p, now = Date.now();
    name = String(name || '').trim().slice(0, 40) || 'New profile'; kind = kind === 'business' ? 'business' : 'personal';
    if (!cur.u) { // device-only: a new device-only profile in the same group
      if (!cur.grp && app.pid) cur.grp = app.pid;
      pid = 'local:' + rid(10); p = { u: null, local: true, created: now, grp: cur.grp || null, pname: name, pkind: kind, pnameLocal: 1 };
    } else {
      var tid = 't' + rid(11); pid = app.pidFor(cur.u, tid);
      p = { u: cur.u, email: cur.email, token: cur.token, dk: cur.dk, created: now, local: false, tid: tid, pname: name, pkind: kind };
    }
    app.profiles[pid] = p;
    return app.saveProfiles().then(function () {
      if (p.token) app.profileSet(p).then(function () { p.synced = 1; app.saveProfiles(); }, function () {});
      return app.openProfile(pid);
    }).then(function () { return pid; });
  };
  // tells the server a profile's name and kind (2.8.0: the name scrambled)
  app.profileSet = function (p) {
    return app.dataKey(p.dk).then(function (k) {
      if (!k) { var e = new Error('Log in again first.'); e.code = 'login'; throw e; }
      return p.pname ? AIU.vault.sealText(k, p.pname, 'pname') : null;
    }).then(function (pn) { var b = { u: p.u, token: p.token, tid: p.tid || '', pkind: p.pkind }; if (pn) b.pname = pn; return app.api('profile_set', b); });
  };
  // 2.8.0: a new password: the data key is locked again with it (the server keeps only the locked copy), then the cards move to it
  app.changePassword = function (oldPw, newPw) {
    var p = app.prof;
    return app.dataKey().then(function (k) {
      if (!k) throw new Error('Log in again on this device first.');
      return AIU.vault.lockDataKey(newPw, k);
    }).then(function (lk) { return app.api('password', { u: p.u, token: p.token, old: oldPw, pw: newPw, dk: lk }); }).then(function () { return app.vaultRekey(newPw).catch(function () {}); });
  };
  // 2.8.0: a new username (the old one is free for anyone again). This device keeps going; the others ask you to log in.
  app.renameAccount = function (newU, pw, disp) {
    var p = app.prof, oldU = p.u;
    return app.api('rename', { u: oldU, token: p.token, pw: pw, nu: newU }).then(function (r) {
      app.renameLocal(oldU, r.u, disp && String(disp).trim().toLowerCase() === r.u ? String(disp).trim() : '');
      return app.saveProfiles().then(function () { app.rebuild(); return r.u; });
    });
  };
  app.renameProfile = function (pid, name, kind) {
    var p = app.profiles[pid]; if (!p) return Promise.resolve();
    if (name) p.pname = String(name).trim().slice(0, 40); if (kind) p.pkind = kind === 'business' ? 'business' : 'personal';
    if (p.local) p.pnameLocal = 1;
    return app.saveProfiles().then(function () { if (p.token) return app.profileSet(p).catch(function () {}); });
  };
  // deleting a profile: from the server (password + phrase) and from this device. The first profile is the account itself.
  app.deleteProfile = function (pid, pw, phrase) {
    var p = app.profiles[pid]; if (!p) return Promise.resolve();
    var go = p.local ? Promise.resolve() : app.api('profile_delete', { u: p.u, token: p.token, tid: p.tid, pw: pw, phrase: phrase });
    return go.then(function () { return AIU.store.open(pid); }).then(function (st) { return st.wipe(); }).then(function () {
      delete app.profiles[pid]; return app.saveProfiles();
    });
  };
  // the other profiles in this account, read straight from this device (for the capsule with every profile)
  app.profileEvents = function (pid) { if (pid === app.pid && app.store) return app.store.all(); return AIU.store.open(pid).then(function (st) { return st.all(); }); };
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
        var copy = evs.filter(function (e) { return e.type !== 'acct'; }).sort(function (a, b) { return (a.ls || 0) - (b.ls || 0); }).map(function (e) { var c = Object.assign({}, e); c.seq = 0; delete c.rt; c.imp = 1; return c; });
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
    var group = prof ? app.groupPids(app.pid) : [];
    return p.then(function () {
      if (prof) prof.token = null;
      group.forEach(function (k) { if (app.profiles[k] && !app.profiles[k].local) app.profiles[k].token = null; }); // 2.2.0: logs out every profile in the account
      app.pid = null; app.prof = null; app.S = null; app.popup = null;
      return Promise.all([app.saveProfiles(), app.meta.set('active', null)]);
    }).then(function () { AIU.ui.welcome(); });
  };
  app.forgetGroup = function () { // 2.2.0: after "Delete my account": every profile of that account leaves this device
    var pids = app.groupPids(); app.pid = null; app.prof = null; app.S = null;
    return Promise.all(pids.map(function (pid) { delete app.profiles[pid]; return AIU.store.open(pid).then(function (st) { return st.wipe(); }).catch(function () {}); }))
      .then(function () { return Promise.all([app.saveProfiles(), app.meta.set('active', null)]); }).then(function () { AIU.ui.welcome(); });
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
            .then(function (ev) { return AIU.files ? AIU.files.reseal(old, r.key, r.lock.gen).then(function (fe) { return ev.concat(fe); }) : ev; }) // 2.5.0: the Docs list moves to the new password too
            .then(function (ev) { var rr = app.S && C.setting(app.S, 'vaultRescue', null); return rr ? ev.concat([{ type: 'set', data: { k: 'vaultRescue', v: null } }]) : ev; }) // 2.7.0: an old recovery code stops working with a new password
            .then(function (ev) { return app.addEvents([{ type: 'set', data: { k: 'vaultLock', v: r.lock } }].concat(ev)); }).then(function () { return keep(r.key, r.lock); });
        });
      });
    });
  };
  app.hasRescue = function () { return false; }; // 2.7.0: recovery codes are gone (see _archive/2.7.0-replaced/recovery-2.6.0.txt)
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

  /* ---------- capsules (zip of the data folder) ----------
     2.2.0: a capsule can hold one profile (aiu_totem/...) or every profile in the account (aiu_totem/profiles/01-name/...).
     Each profile folder has the same files, plus profile.json (its name and kind). */
  function viewFromEvents(evs) { // a profile that isn't open: rebuild its state from its events (for its capsule files)
    var E = C.newState(), un = [];
    evs.slice().sort(function (a, b) { return (a.ls || 0) - (b.ls || 0) || a.t - b.t; }).forEach(function (e) { C.apply(E, e); if (!e.seq) un.push(e); });
    evs.filter(function (e) { return e.seq; }).sort(function (a, b) { return a.seq - b.seq; }).forEach(function (e) { C.confirm(E, e); });
    return C.view(E, un, { now: app.trueNow() });
  }
  function capsuleFiles(root, S, evs, cards, pinfo) {
    var files = [], jr = {}, edits = S.jedit || {};
    evs = evs.slice().sort(C.cmpT);
    var readme = 'AIU TOTEM CAPSULE\n=================\nThis folder is ' + S.totemName + ' (profile: ' + pinfo.name + ', ' + pinfo.kind + '). Keep it safe (a USB drive is perfect).\n\n' +
      'events/events.jsonl  - the source of truth: every event, one JSON object per line, never edited\n' +
      'profile.json         - the profile\'s name and kind (personal or business)\n' +
      'totems/totem.json    - a readable summary of the Totem right now\n' +
      'library/YYYY-MM.md   - one chapter per month: your journal entries\n' +
      'memory/*.json        - tasks, lists, tiles, items & notes, facts, planner, documents, Vitals and the word glossary\n\n' +
      'To bring it back: Aiu Totem > Settings > Your data > Import capsule (or Import as a new profile), or "Import a capsule" on the start screen.\n';
    function add(name, data) { files.push({ name: root + name, data: data }); }
    add('README.txt', readme);
    add('profile.json', JSON.stringify({ name: pinfo.name, kind: pinfo.kind, tid: pinfo.tid || '', format: 'aiu-totem/3' }, null, 2));
    add('config/account.json', JSON.stringify({ username: pinfo.u || null, email: pinfo.email || null, exported: new Date().toISOString(), device: app.dev.deviceName, format: 'aiu-totem/3' }, null, 2));
    add('totems/totem.json', JSON.stringify(C.snapshot(S), null, 2));
    add('events/events.jsonl', evs.map(function (e) { var c = Object.assign({}, e); delete c.ls; return JSON.stringify(c); }).join('\n') + '\n');
    evs.forEach(function (e) {
      if (e.type !== 'journal' || (S.jhide[e.id] && S.jhide[e.id].v)) return;
      var m = (e.d || '').slice(0, 7), txt = edits[e.id] ? edits[e.id].text : e.data.text;
      jr[m] = (jr[m] || '# Chapter ' + m + '\n\n') + '## ' + e.d + ' ' + (e.h || '') + ' (' + (e.dn || 'device') + ')' + (edits[e.id] ? ' (edited)' : '') + '\n\n' + txt + '\n\n';
    });
    Object.keys(jr).forEach(function (m) { add('library/' + m + '.md', jr[m]); });
    var T = AIU.tiles, d0 = U.dayStr(new Date(app.trueNow()));
    try {
      add('memory/tasks.json', JSON.stringify(S.tasks, null, 2));
      add('memory/lists.json', JSON.stringify(S.lists, null, 2));
      add('memory/quests.json', JSON.stringify(C.questList(S).map(function (q) { return { title: q.title, state: q.state, status: T ? T.status(S, q, d0) : '', when: T ? T.whenText(q, false) : '', tile: q.tile || {}, finishes: Object.keys(S.tdone || {}).filter(function (k) { return k.indexOf(q.key + '|') === 0 && S.tdone[k].done; }).map(function (k) { return k.slice(q.key.length + 1); }), steps: C.questSteps(S, q) }; }), null, 2));
      add('memory/items.json', JSON.stringify({ items: S.entities, notes: S.notes }, null, 2));
      add('memory/facts.json', JSON.stringify(S.facts, null, 2));
      add('memory/glossary.json', JSON.stringify(M.glossary(S, 500), null, 2));
      add('memory/planner.json', JSON.stringify({ items: S.plans, paid: S.planPaid }, null, 2));
      add('memory/business.json', JSON.stringify(AIU.planner ? AIU.planner.docs(S).map(function (d) { return { folder: d.folder, title: d.title, kind: d.kind, sections: AIU.planner.sections(S, d).map(function (x) { return { heading: x.h, text: x.text }; }) }; }) : [], null, 2));
      add('memory/gaba.json', JSON.stringify(AIU.gaba ? AIU.gaba.entries(S) : [], null, 2));
      add('memory/list-labels.json', JSON.stringify(S.listMeta, null, 2));
      if (AIU.places && AIU.places.capsule) add('memory/buildings.json', JSON.stringify(AIU.places.capsule(S), null, 2));
    } catch (e) { add('memory/ERROR.txt', 'Some summary files could not be written: ' + (e && e.message || e) + '\nevents/events.jsonl has everything.'); }
    if (cards) add('memory/accounts.json', JSON.stringify(cards.filter(function (c) { return !c.locked; }), null, 2)); // your own backup, readable: keep the capsule safe
    return files;
  }
  function pinfoOf(pid) { var p = app.profiles[pid] || {}; return { name: app.profName(pid), kind: app.profKind(pid), tid: p.tid || '', u: p.u, email: p.email }; }
  function stamp() { var d = U.wall(); return d.getFullYear() + U.p2(d.getMonth() + 1) + U.p2(d.getDate()) + '-' + U.p2(d.getHours()) + U.p2(d.getMinutes()); }
  function safeName(s) { return String(s || 'totem').replace(/[^A-Za-z0-9_-]+/g, '') || 'totem'; }
  app.exportCapsule = function (opts) {
    var S = app.S, cards = [], extra = [];
    opts = opts || {};
    return app.vaultCards().catch(function () { return []; }).then(function (c) { cards = c; return opts.files && AIU.files ? AIU.files.capsuleFiles('aiu_totem/', opts.onStep).catch(function () { return []; }) : []; }).then(function (fx) { extra = fx; return app.store.all(); }).then(function (all) {
      var files = capsuleFiles('aiu_totem/', S, all, cards, pinfoOf(app.pid)).concat(extra); // 2.5.0: with your Docs files (readable, in files/) when you ask
      var name = 'aiu-capsule-' + safeName(app.profName()) + '-' + safeName(S.totemName) + '-' + stamp() + (opts.pw ? '.aiucap' : '.zip');
      return (opts.pw ? app.lockCapsule(U.makeZip(files), opts.pw) : Promise.resolve(U.makeZip(files))).then(function (blob) { U.download(blob, name); return name; }); // 2.6.0: locked with your capsule password
    }).then(function (name) {
      app.local.lastCapsule = Date.now(); app.saveLocal();
      return name;
    });
  };
  // 2.2.0: every profile in this account (or on this device) in one capsule. Account cards are readable only for the
  // profile that's open (the others stay scrambled in their events until you open them and export them on their own).
  app.exportAllCapsule = function (opts) {
    opts = opts || {};
    var pids = app.groupPids(), files = [], n = 0, index = [];
    files.push({ name: 'aiu_totem/README.txt', data: 'AIU TOTEM CAPSULE: EVERY PROFILE\n================================\n' + pids.length + ' profiles, one folder each in profiles/. Each folder is a whole capsule of its own.\n' +
      'Account cards are readable (memory/accounts.json) only for the profile that was open when this was made.\n\nTo bring them back: Settings > Your data > Import as new profiles, or "Import a capsule" on the start screen.\n' });
    return app.vaultCards().catch(function () { return []; }).then(function (cards) {
      return pids.reduce(function (pr, pid) {
        return pr.then(function () { return app.profileEvents(pid); }).then(function (evs) {
          n++; var info = pinfoOf(pid), S0 = pid === app.pid ? app.S : viewFromEvents(evs), root = 'aiu_totem/profiles/' + U.p2(n) + '-' + safeName(info.name) + '/';
          index.push({ folder: root.slice(9), name: info.name, kind: info.kind, totem: S0.totemName, events: evs.length });
          files = files.concat(capsuleFiles(root, S0, evs, pid === app.pid ? cards : null, info));
        });
      }, Promise.resolve());
    }).then(function () {
      files.push({ name: 'aiu_totem/profiles.json', data: JSON.stringify(index, null, 2) });
      var name = 'aiu-capsule-all-profiles-' + stamp() + (opts.pw ? '.aiucap' : '.zip');
      return (opts.pw ? app.lockCapsule(U.makeZip(files), opts.pw) : Promise.resolve(U.makeZip(files))).then(function (blob) {
        U.download(blob, name); app.local.lastCapsule = Date.now(); app.saveLocal();
        return { name: name, n: pids.length };
      });
    });
  };
  // A capsule file -> [{root, events, profile: {name, kind}, cards: [...]}], one per profile inside it
  function parseEvents(text) {
    var out = [];
    text.split(/\r?\n/).forEach(function (line) { line = line.trim(); if (!line) return; try { var e = JSON.parse(line); if (e && typeof e.id === 'string' && typeof e.type === 'string' && typeof e.t === 'number') out.push(e); } catch (x) {} });
    return out;
  }
  /* 2.6.0: a locked capsule (.aiucap): "AIUCAP1" + a newline, 16 bytes of salt, 12 of iv, then the .zip scrambled with
     AES-GCM under a key made from your capsule password (PBKDF2, 200,000 rounds). Without the password it's noise. */
  var CAPMAGIC = 'AIUCAP1\n';
  function capKey(pw, salt, use) { return crypto.subtle.importKey('raw', new TextEncoder().encode('aiu-capsule:' + pw), 'PBKDF2', false, ['deriveKey']).then(function (base) { return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: 200000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, [use]); }); }
  app.lockCapsule = function (blob, pw) {
    var salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    return Promise.all([blob.arrayBuffer(), capKey(pw, salt, 'encrypt')]).then(function (r) { return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, r[1], r[0]); })
      .then(function (ct) { return new Blob([new TextEncoder().encode(CAPMAGIC), salt, iv, new Uint8Array(ct)], { type: 'application/octet-stream' }); });
  };
  function isLocked(u8) { var m = new TextEncoder().encode(CAPMAGIC); for (var i = 0; i < m.length; i++) if (u8[i] !== m[i]) return false; return true; }
  function unlockCapsule(u8, tries) {
    var ask = AIU.profiles && AIU.profiles.askCapsulePw ? AIU.profiles.askCapsulePw(tries) : Promise.reject(new Error('This capsule is locked.'));
    return ask.then(function (pw) {
      var o = CAPMAGIC.length, salt = u8.slice(o, o + 16), iv = u8.slice(o + 16, o + 28), ct = u8.slice(o + 28);
      return capKey(pw, salt, 'decrypt').then(function (k) { return crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, k, ct); }).catch(function () { if ((tries || 0) >= 2) throw new Error('That capsule password isn\'t right.'); return unlockCapsule(u8, (tries || 0) + 1); });
    });
  }
  app.readCapsule = function (file) {
    return file.arrayBuffer().then(function (buf0) { var u0 = new Uint8Array(buf0); return isLocked(u0) ? unlockCapsule(u0, 0) : buf0; }).then(function (buf) {
      var u8 = new Uint8Array(buf);
      if (!(u8[0] === 0x50 && u8[1] === 0x4b)) { var evs = parseEvents(U.fromUtf8(u8)); return evs.length ? [{ root: '', events: evs, profile: {}, cards: null }] : []; }
      return U.readZip(buf).then(function (files) {
        return Object.keys(files).filter(function (n) { return /(^|\/)events\/events\.jsonl$|(^|\/)events\.jsonl$/.test(n); }).sort().map(function (k) {
          var root = k.replace(/events\/events\.jsonl$|events\.jsonl$/, ''), pj = null, cards = null;
          try { if (files[root + 'profile.json']) pj = JSON.parse(U.fromUtf8(files[root + 'profile.json'])); } catch (e) {}
          try { if (files[root + 'memory/accounts.json']) cards = JSON.parse(U.fromUtf8(files[root + 'memory/accounts.json'])); } catch (e) {}
          return { root: root, events: parseEvents(U.fromUtf8(files[k])), profile: pj || {}, cards: Array.isArray(cards) ? cards : null, zip: files };
        }).filter(function (x) { return x.events.length; });
      });
    });
  };
  // Import into the profile that's open: only adds what's missing, and only the same Totem (same egg)
  app.importCapsule = function (file) {
    return app.readCapsule(file).then(function (parts) {
      if (!parts.length) throw new Error('That file is not an Aiu capsule.');
      var myEgg = app.S.egg, eggOf = function (p) { return p.events.filter(function (e) { return e.type === 'egg'; }).sort(C.cmpT)[0]; };
      var part = parts.length === 1 ? parts[0] : parts.filter(function (p) { var e = eggOf(p); return myEgg && e && e.id === myEgg.id; })[0];
      if (!part) throw new Error('That capsule has ' + parts.length + ' profiles. Use "Import as new profiles" instead.');
      var theirEgg = eggOf(part);
      if (myEgg && theirEgg && myEgg.id !== theirEgg.id) throw new Error('That capsule is a different Totem (' + ((theirEgg.data && theirEgg.data.name) || '?') + '). Use "Import as a new profile" instead.');
      return app.importPart(part);
    });
  };
  // 2.3.0: add one capsule part's missing events to the open profile (nothing is ever erased or overwritten)
  app.importPart = function (part) {
    var incoming = part.events;
    {
      return app.store.getMany(incoming.map(function (e) { return e.id; })).then(function (have) {
        var fresh = incoming.filter(function (e) { return !have[e.id]; }).sort(C.cmpT), local = !!app.prof.local;
        fresh.forEach(function (e) { e.ls = app.lsNext++; e.d = e.d || U.dayStr(new Date(e.t)); if (local) { e.seq = app.seqNext++; e.rt = e.t; } else { e.seq = 0; delete e.rt; e.imp = 1; } });
        return app.store.put(fresh).then(function () {
          fresh.forEach(function (e) { C.apply(app.E, e); if (local) C.confirm(app.E, e); else app.unsent.push(e); });
          app.rebuild(); app.scheduleSync(); app.saveCheckpoint(true);
          if (part.zip && AIU.files) AIU.files.restoreFrom(part.zip, part.root).catch(function () {}); // 2.5.0: Docs files that aren't here yet go back up
          return { added: fresh.length, total: incoming.length };
        });
      });
    }
  };
  // 2.3.0: look inside a backup before bringing it in: what's in it, and whether each Aiu is one you already have
  // (same egg). Same Aiu: only what's missing gets added ("merge"), or nothing at all if you're up to date. A new
  // Aiu becomes a new profile. An old backup can never erase or overwrite anything newer.
  app.capsulePreview = function (file) {
    function eggOf(evs) { return evs.filter(function (e) { return e.type === 'egg'; }).sort(C.cmpT)[0]; }
    return app.readCapsule(file).then(function (parts) {
      if (!parts.length) throw new Error('That file isn\'t an Aiu capsule (no Aiu inside it).');
      var pids = app.groupPids(), mine = {};
      return pids.reduce(function (pr, pid) { return pr.then(function () { return app.profileEvents(pid).then(function (evs) { var eg = eggOf(evs); if (eg) mine[eg.id] = { pid: pid, ids: evs.reduce(function (o, e) { o[e.id] = 1; return o; }, {}) }; }).catch(function () {}); }); }, Promise.resolve()).then(function () {
        return parts.map(function (part, i) {
          var eg = eggOf(part.events), days = part.events.map(function (e) { return e.d || ''; }).filter(Boolean).sort(), m = eg && mine[eg.id];
          var missing = m ? part.events.filter(function (e) { return !m.ids[e.id]; }).length : part.events.length;
          return { i: i, part: part, name: part.profile.name || (eg && eg.data && eg.data.name) || 'Aiu', kind: part.profile.kind === 'business' ? 'business' : 'personal', totem: eg && eg.data && eg.data.name || '', n: part.events.length, last: days[days.length - 1] || '', match: m ? m.pid : null, missing: missing, status: !m ? 'new' : missing ? 'merge' : 'same' };
        });
      });
    });
  };
  app.mergeInto = function (pid, part) { // open that profile (if it isn't already) and add what's missing
    return (pid === app.pid ? Promise.resolve() : app.openProfile(pid)).then(function () { return app.importPart(part); });
  };
  // 2.2.0: a capsule becomes new profiles: on the start screen (device-only), or inside the account you're in.
  // Scrambled account cards can't be carried (they need the old password), so the readable copy in the capsule
  // (memory/accounts.json) comes back instead, and gets scrambled again with this account's password.
  app.importNewProfiles = function (file, opts) {
    opts = opts || {};
    var into = opts.account && app.prof && !app.prof.local ? app.prof : null, made = [], grp = null, merges = [], eggs = {};
    return (opts.parts ? Promise.resolve(opts.parts) : app.readCapsule(file)).then(function (parts) {
      if (!parts.length) throw new Error('That file is not an Aiu capsule.');
      return app.eggIndex().then(function (ix) { eggs = ix; return parts; });
    }).then(function (parts) {
      return parts.reduce(function (pr, part, i) {
        return pr.then(function () {
          var eg0 = eggOfEvs(part.events); // 2.4.0 guard: an Aiu that's already on this device is never copied again; it only gets what's missing
          if (eg0 && eggs[eg0.id]) { merges.push({ pid: eggs[eg0.id], part: part }); return; }
          var name = String(part.profile.name || '').slice(0, 40), kind = part.profile.kind === 'business' ? 'business' : 'personal', pid, p, now = Date.now() + i;
          if (!name) { var eg = part.events.filter(function (e) { return e.type === 'egg'; })[0]; name = eg && eg.data && eg.data.name ? eg.data.name : 'Imported'; }
          if (into) { var tid = 't' + rid(11); pid = app.pidFor(into.u, tid); p = { u: into.u, email: into.email, token: into.token, dk: into.dk, created: now, local: false, tid: tid, pname: name, pkind: kind }; }
          else { pid = 'local:' + rid(10); if (!grp) grp = pid; p = { u: null, local: true, created: now, grp: grp, pname: name, pkind: kind, pnameLocal: 1 }; }
          app.profiles[pid] = p; made.push(pid);
          var evs = part.events.filter(function (e) { return e.type !== 'vault' && !(e.type === 'set' && e.data && e.data.k === 'vaultLock'); }).sort(C.cmpT);
          (part.cards || []).forEach(function (c, k) { var card = Object.assign({}, c); var key = card.key || ('v-' + rid(14)); ['key', 't', 'dn', 'plain', 'locked'].forEach(function (x) { delete card[x]; }); evs.push({ id: U.id(), t: Date.now() + k, d: U.dayStr(), h: U.hmStr(), dev: app.deviceId, dn: app.dev.deviceName, type: 'acct', data: { key: key, card: card } }); });
          evs.forEach(function (e, j) { e.ls = j + 1; e.d = e.d || U.dayStr(new Date(e.t)); if (p.local) { e.seq = j + 1; e.rt = e.rt || e.t; } else { e.seq = 0; delete e.rt; e.imp = 1; } });
          return AIU.store.open(pid).then(function (st) {
            var V0 = viewFromEvents(p.local ? evs : evs.map(function (e, j) { return Object.assign({}, e, { seq: j + 1 }); }));
            return st.put(evs).then(function () { return Promise.all([st.set('seenStage', V0.stage), st.set('local', { importedAt: Date.now(), v2up: 1 })]); });
          });
        });
      }, Promise.resolve());
    }).then(function () { return app.saveProfiles(); }).then(function () {
      if (into && into.token) made.forEach(function (pid) { var p = app.profiles[pid]; app.profileSet(p).then(function () { p.synced = 1; app.saveProfiles(); }, function () {}); });
      return merges.reduce(function (pr, m) { return pr.then(function () { return app.mergeInto(m.pid, m.part); }).then(function () { if (made.indexOf(m.pid) < 0) made.push(m.pid); }); }, Promise.resolve());
    }).then(function () { made.merged = merges.length; return made; });
  };
  /* ---------- 2.4.0: one Aiu, one profile. Every profile on this device, by its egg. ---------- */
  function eggOfEvs(evs) { return (evs || []).filter(function (e) { return e.type === 'egg'; }).sort(C.cmpT)[0]; }
  function liveProfiles() { return Object.keys(app.profiles).filter(function (k) { var p = app.profiles[k]; return p && !p.linkedTo && !p.gone && (p.token || p.local); }); }
  app.eggIndex = function () { // {eggId: pid}; an account profile wins over a device-only copy
    var out = {};
    return liveProfiles().reduce(function (pr, pid) {
      return pr.then(function () { return app.profileEvents(pid); }).then(function (evs) { var eg = eggOfEvs(evs); if (!eg) return; if (!out[eg.id] || (app.profiles[out[eg.id]].local && !app.profiles[pid].local)) out[eg.id] = pid; }).catch(function () {});
    }, Promise.resolve()).then(function () { return out; });
  };
  app.findDupes = function () { // [{name, pids: [keep, ...copies]}]
    var by = {};
    return liveProfiles().reduce(function (pr, pid) {
      return pr.then(function () { return app.profileEvents(pid); }).then(function (evs) { var eg = eggOfEvs(evs); if (!eg) return; (by[eg.id] = by[eg.id] || { name: (eg.data && eg.data.name) || 'Aiu', list: [] }).list.push({ pid: pid, n: evs.length }); }).catch(function () {});
    }, Promise.resolve()).then(function () {
      return Object.keys(by).map(function (k) { return by[k]; }).filter(function (g) { return g.list.length > 1; }).map(function (g) {
        g.list.sort(function (x, y) { var X = app.profiles[x.pid], Y = app.profiles[y.pid]; return (X.local ? 1 : 0) - (Y.local ? 1 : 0) || y.n - x.n; });
        return { name: g.name, pids: g.list.map(function (x) { return x.pid; }) };
      });
    });
  };
  app.combine = function (pids) { // everything from the copies goes into the first one; the copies are hidden, never erased
    var keep = pids[0], rest = pids.slice(1);
    return rest.reduce(function (pr, pid) {
      return pr.then(function () { return app.profileEvents(pid); }).then(function (evs) { return app.mergeInto(keep, { events: evs }); }).then(function () { app.profiles[pid].linkedTo = keep; app.profiles[pid].combined = Date.now(); });
    }, Promise.resolve()).then(function () { return app.saveProfiles(); }).then(function () { return keep; });
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
