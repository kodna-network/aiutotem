/* AIU TOTEM - screens, tabs and settings. Plain DOM, no framework. */
(function () {
  'use strict';
  var U = AIU.util, C = AIU.core, A = AIU.art, M = AIU.mind, Wd = AIU.words, h = U.h;
  var ui = AIU.ui = { onMain: false, tab: 'talk', jdraft: '', dirty: false };
  var app = function () { return AIU.app; };
  function root() { return document.getElementById('app'); }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

  ui.applyTheme = function () {
    var t = (AIU.app.dev && AIU.app.dev.theme) || 'auto';
    document.documentElement.setAttribute('data-size', (AIU.app.dev && AIU.app.dev.textSize) || 'normal');
    if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t);
  };

  /* ---------- small building blocks ---------- */
  function btn(label, onclick, cls) { return h('button', { type: 'button', cls: 'btn ' + (cls || ''), onclick: onclick, text: label }); }
  function field(label, input, hint) { return h('label', { cls: 'field' }, h('span', { cls: 'flabel', text: label }), input, hint ? h('span', { cls: 'hint', text: hint }) : null); }
  function inp(props) { return h('input', Object.assign({ autocomplete: 'off', autocapitalize: 'off', spellcheck: false }, props)); }
  function sel(options, value, onchange) {
    var s = h('select', { onchange: function () { onchange(s.value); } });
    var pairs = Array.isArray(options) ? options : Object.keys(options).map(function (k) { return [k, options[k]]; });
    pairs.forEach(function (pr) { var o = h('option', { value: pr[0], text: pr[1] }); if (String(pr[0]) === String(value)) o.selected = true; s.appendChild(o); });
    return s;
  }
  function msg(el, text, bad) { el.textContent = text || ''; el.className = 'formmsg' + (bad ? ' bad' : ''); }
  function busy(button, on, label) { button.disabled = on; if (label) button.textContent = label; }
  // Aiu is up: clear any start-up message.
  function started() { window.AIU_STARTED = true; var b = document.getElementById('aiubar'); if (b && !b.getAttribute('data-keep')) b.remove(); }
  ui.started = started;
  // A small bar at the top (never a full screen). actions: [[label, fn], ...]
  ui.bar = function (text, actions, keep) {
    var b = document.getElementById('aiubar');
    if (!text) { if (b) b.remove(); return; }
    if (!b) { b = h('div', { id: 'aiubar', cls: 'aiubar', role: 'alert' }); document.body.appendChild(b); }
    clear(b); b.appendChild(h('span', { text: text }));
    (actions || []).forEach(function (x) { b.appendChild(h('button', { type: 'button', text: x[0], onclick: x[1] })); });
    if (keep) b.setAttribute('data-keep', '1'); else b.removeAttribute('data-keep');
  };
  function screen(children) {
    started();
    ui.onMain = false; ui.canvasEl = null;
    var r = clear(root());
    r.appendChild(h('div', { cls: 'screen' }, h('div', { cls: 'card' }, children)));
    var f = r.querySelector('input'); if (f) setTimeout(function () { try { f.focus(); } catch (e) {} }, 50);
  }
  function eggCanvas(seed, scale) {
    var eg = A.egg(seed || 7, false), cv = h('canvas', { cls: 'eggpic wobble' });
    cv.width = eg.width * (scale || 5); cv.height = eg.height * (scale || 5);
    var c = cv.getContext('2d'); c.imageSmoothingEnabled = false; c.drawImage(eg, 0, 0, cv.width, cv.height);
    return cv;
  }
  function logo() { return h('div', { cls: 'logo' }, eggCanvas(U.hash32('aiu' + Date.now() % 17), 5), h('h1', { text: 'AIU TOTEM' })); }

  /* ---------- welcome & accounts ---------- */
  ui.welcome = function () {
    var P = app().profiles, others = Object.keys(P).filter(function (k) { return (P[k].token || P[k].local) && !P[k].linkedTo; });
    screen([
      logo(),
      h('p', { cls: 'lead', text: 'Raise a little AI companion. It hatches from an egg, learns from what you tell it, reminds you of things, and remembers.' }),
      others.length ? h('div', { cls: 'stack' }, others.map(function (pid) {
        var who = P[pid].label ? P[pid].label : P[pid].local ? 'my device-only Totem' : null; // e.g. "Pip (Sprout)"
        return btn(P[pid].local ? 'Open ' + who + ' (this device only)' : 'Continue as ' + P[pid].u + (P[pid].label ? ' · ' + P[pid].label : ''), function () { app().openProfile(pid); }, 'primary');
      })) : null,
      h('div', { cls: 'stack' }, btn('Log in', function () { ui.loginScreen(); }, others.length ? '' : 'primary'), btn('Sign up', function () { ui.signupScreen(); })),
      // one device-only Totem per device, so you never open a different creature by accident
      others.some(function (pid) { return P[pid].local; }) ?
        h('p', { cls: 'small' }, h('a', { href: '#', onclick: function (e) { e.preventDefault(); if (window.confirm('Start a second, brand-new device-only Totem? Your current one stays here too.')) app().startLocal(); }, text: 'Start another device-only Totem' })) :
        h('p', { cls: 'small' }, h('a', { href: '#', onclick: function (e) { e.preventDefault(); app().startLocal(); }, text: 'Try it on this device only (no account, no sync)' })),
      h('p', { cls: 'small dim', text: 'Free for personal, private use. Nothing to buy, no ads.' })
    ]);
  };

  ui.loginScreen = function (prefill, note) {
    var u = inp({ name: 'username', value: prefill || '', placeholder: 'username' }), pw = inp({ type: 'password', name: 'password', placeholder: 'password' });
    var m = h('p', { cls: 'formmsg' }), go = btn('Log in', submit, 'primary'), extra = h('div');
    function submit() {
      if (!u.value.trim() || !pw.value) { msg(m, 'Enter your username and password.', true); return; }
      busy(go, true, 'Logging in...');
      app().login(u.value.trim().toLowerCase(), pw.value).then(finishLogin, function (err) {
        busy(go, false, 'Log in'); msg(m, err.message, true);
        clear(extra);
        if (err.code === 'unconfirmed') extra.appendChild(btn('Resend confirm email', function () { ui.resendScreen(u.value.trim()); }));
      });
    }
    pw.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
    screen([logo(), h('h2', { text: 'Log in' }), note ? h('p', { cls: 'note', text: note }) : null, field('Username', u), field('Password', pw), m, go, extra,
      h('p', { cls: 'small' }, h('a', { href: '#', onclick: function (e) { e.preventDefault(); ui.forgotScreen(u.value); }, text: 'Forgot password?' })),
      btn('Back', ui.welcome, 'ghost')]);
  };
  function finishLogin(pid) {
    var a = app(), link = ui.linkFrom;
    ui.linkFrom = null;
    if (!link) return a.openProfile(pid);
    return a.api('sync', { u: a.profiles[pid].u, token: a.profiles[pid].token, since: 0, events: [] }).then(function (r) {
      if (r.events.length) { a.openProfile(pid); setTimeout(function () { a.addLine('That account already has a Totem, so your device-only one stays here. Switch in Settings.', false); }, 800); return; }
      return a.linkLocalTo(link, pid).then(function () { return a.openProfile(pid); }).then(function () { a.addLine('Your Totem now lives in your account and will sync everywhere!', true); });
    });
  }

  ui.signupScreen = function (opts) {
    opts = opts || {};
    var u = inp({ placeholder: 'e.g. sam', maxLength: 24 }), em = inp({ type: 'email', placeholder: 'you@example.com', autocapitalize: 'off' });
    var pw = inp({ type: 'password', placeholder: '8+ characters' }), pw2 = inp({ type: 'password', placeholder: 'again' });
    var m = h('p', { cls: 'formmsg' }), go = btn('Create account', submit, 'primary');
    ui.linkFrom = opts.link || null;
    function submit() {
      var un = u.value.trim().toLowerCase();
      if (!/^[a-z0-9_-]{3,24}$/.test(un)) return msg(m, 'Usernames are 3-24 letters, numbers, - or _.', true);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em.value.trim())) return msg(m, 'That email does not look right.', true);
      if (pw.value.length < 8) return msg(m, 'Passwords need at least 8 characters.', true);
      if (pw.value !== pw2.value) return msg(m, 'The two passwords do not match.', true);
      busy(go, true, 'Creating...');
      app().api('signup', { u: un, email: em.value.trim(), pw: pw.value }).then(function (r) {
        if (!r.confirm_needed) return app().login(un, pw.value).then(finishLogin);
        ui.checkEmailScreen(un, em.value.trim(), pw.value, r.mail_sent);
      }, function (err) { busy(go, false, 'Create account'); msg(m, err.message, true); });
    }
    screen([logo(), h('h2', { text: opts.link ? 'Create an account to sync' : 'Sign up' }),
      h('p', { cls: 'small', text: 'One Totem per account. Your data is private to you.' }),
      field('Username', u, 'You\'ll need it to log in or reset your password.'), field('Email', em, 'Only used to confirm your account and reset your password.'),
      field('Password', pw), field('Password again', pw2), m, go, btn('Back', opts.link ? ui.main : ui.welcome, 'ghost')]);
  };

  ui.checkEmailScreen = function (un, email, pw, sent) {
    var m = h('p', { cls: 'formmsg' }), go = btn('I clicked the link - log me in', function () {
      busy(go, true, 'Checking...');
      app().login(un, pw).then(finishLogin, function (err) { busy(go, false, 'I clicked the link - log me in'); msg(m, err.message, true); });
    }, 'primary');
    screen([logo(), h('h2', { text: 'Check your email' }),
      h('p', { text: 'We sent a confirm link to ' + email + '. Open it (check spam too), then come back here.' }),
      sent === false ? h('p', { cls: 'note', text: 'The server could not send mail. The server owner can find the link in the aiu_data/outbox folder.' }) : null,
      m, go, btn('Resend the email', function () { app().api('resend', { u: un, email: email }).then(function () { msg(m, 'Sent again.'); }, function (e) { msg(m, e.message, true); }); }),
      btn('Back', ui.welcome, 'ghost')]);
  };
  ui.resendScreen = function (un) {
    var u = inp({ value: un || '' }), em = inp({ type: 'email' }), m = h('p', { cls: 'formmsg' });
    screen([logo(), h('h2', { text: 'Resend confirm email' }), field('Username', u), field('Email', em), m,
      btn('Send', function () { app().api('resend', { u: u.value.trim(), email: em.value.trim() }).then(function () { msg(m, 'If that matches an unconfirmed account, the email is on its way.'); }, function (e) { msg(m, e.message, true); }); }, 'primary'),
      btn('Back', function () { ui.loginScreen(u.value); }, 'ghost')]);
  };
  ui.forgotScreen = function (un) {
    var u = inp({ value: un || '', placeholder: 'username' }), em = inp({ type: 'email', placeholder: 'the email on the account' }), m = h('p', { cls: 'formmsg' }), go;
    go = btn('Email me a reset link', function () {
      if (!u.value.trim() || !em.value.trim()) return msg(m, 'Enter both your username and email.', true);
      busy(go, true, 'Sending...');
      app().api('forgot', { u: u.value.trim().toLowerCase(), email: em.value.trim() }).then(function () {
        busy(go, false, 'Email me a reset link'); msg(m, 'If those match an account, a reset link is on its way. It works for 1 hour.');
      }, function (e) { busy(go, false, 'Email me a reset link'); msg(m, e.message, true); });
    }, 'primary');
    screen([logo(), h('h2', { text: 'Forgot password' }), h('p', { cls: 'small', text: 'Enter your username and the email on your account.' }), field('Username', u), field('Email', em), m, go, btn('Back', function () { ui.loginScreen(u.value); }, 'ghost')]);
  };
  ui.resetScreen = function (un, key) {
    var pw = inp({ type: 'password', placeholder: '8+ characters' }), pw2 = inp({ type: 'password' }), m = h('p', { cls: 'formmsg' }), go;
    go = btn('Save new password', function () {
      if (pw.value.length < 8) return msg(m, 'Passwords need at least 8 characters.', true);
      if (pw.value !== pw2.value) return msg(m, 'The two passwords do not match.', true);
      busy(go, true, 'Saving...');
      app().api('reset', { u: un, key: key, pw: pw.value }).then(function () {
        try { history.replaceState(null, '', location.pathname); } catch (e) {}
        ui.loginScreen(un, 'Password changed! Log in with your new password. Your other devices will ask you to log in again.');
      }, function (e) { busy(go, false, 'Save new password'); msg(m, e.message, true); });
    }, 'primary');
    screen([logo(), h('h2', { text: 'New password for ' + un }), field('New password', pw), field('New password again', pw2), m, go]);
  };

  ui.nameEgg = function () {
    var a = app(), eggId = U.id(), n = inp({ placeholder: 'e.g. Pip', maxLength: 24 }), me = inp({ placeholder: 'your name', maxLength: 30, value: a.prof.u ? Wd.cap(a.prof.u) : '' });
    var m = h('p', { cls: 'formmsg' }), go = btn('Begin', function () {
      if (!n.value.trim()) return msg(m, 'Give your egg a name first.', true);
      busy(go, true, '...');
      var drafts = [{ id: eggId, type: 'egg', data: { name: n.value.trim().slice(0, 24) } }];
      if (me.value.trim()) drafts.push({ type: 'set', data: { k: 'callMe', v: me.value.trim().slice(0, 30) } });
      a.addEvents(drafts).then(function () { a.startHatch(); ui.main(); a.syncNow('egg').catch(function () {}); });
    }, 'primary');
    screen([h('div', { cls: 'logo' }, eggCanvas(U.hash32(eggId), 6)), h('h2', { text: 'You found an egg!' }),
      h('p', { text: 'Give it a name and tap Begin to crack it open. Talk to it, write in your journal, and it will grow up knowing you.' }),
      field('Name your egg', n), field('What should it call you?', me), m, go]);
  };
  ui.loading = function (text) { ui.bar(text, null, true); }; // a small note at the top, not a screen
  ui.cantReach = function () {
    screen([logo(), h('h2', { text: 'Can\'t reach the server' }), h('p', { text: 'This device does not have your Totem yet, and the server did not answer. Check your connection and try again.' }),
      h('p', { cls: 'small', text: app().sync.err || '' }),
      btn('Try again', function () { app().openProfile(app().pid); }, 'primary'), btn('Log out', function () { app().logout(); }, 'ghost')]);
  };
  ui.fatal = function (err) { window.AIU_STARTED = true; ui.bar('Something went wrong: ' + String(err && err.message || err), [['Reload', function () { location.reload(); }]], true); };

  /* ---------- main screen ---------- */
  var els = {};
  ui.canvas = function () { return ui.onMain ? els.canvas : null; };
  ui.main = function () {
    var a = app();
    started();
    ui.onMain = true;
    var r = clear(root());
    els.name = h('span', { cls: 'tname' }); els.stage = h('span', { cls: 'badge' });
    els.sync = h('button', { type: 'button', cls: 'pill', onclick: onPill });
    var gear = h('button', { type: 'button', cls: 'gear', 'aria-label': 'Settings', onclick: ui.settings });
    els.mute = h('button', { type: 'button', cls: 'gear mute', onclick: function () { if (!a.dev.voice) { a.dev.voice = true; a.setMute(false); } else a.setMute(!a.dev.mute); if (!a.dev.mute) a.speak('I\'m back!'); } });
    gear.innerHTML = '<svg viewBox="0 0 8 8" width="20" height="20" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M3 0h2v1h1v1h1v1h1v2H7v1H6v1H5v1H3V7H2V6H1V5H0V3h1V2h1V1h1zM3 3v2h2V3z"/></svg>';
    els.canvas = h('canvas', { width: A.W, height: A.H, cls: 'scene', role: 'img', 'aria-label': 'Aiu\'s world', onclick: function () { a.setMode('hop', 900); a.beep('chirp'); } });
    els.bubble = h('div', { cls: 'bubble', 'aria-hidden': 'true' }); // the chat already announces what Aiu says
    els.zoom = h('button', { type: 'button', cls: 'zoom', 'aria-label': 'Close-up view', title: 'Close-up / whole world', onclick: function () { a.dev.zoom = !a.dev.zoom; a.saveDev(); els.zoom.textContent = a.dev.zoom ? '-' : '+'; } });
    els.zoom.textContent = a.dev.zoom ? '-' : '+';
    els.status = h('div', { cls: 'status' });
    els.track = h('button', { type: 'button', cls: 'trackline', onclick: function () { var q = C.tracked(a.S); if (q) ui.openQuest(q.key); } });
    els.bar = h('div', { cls: 'bar' }, h('i', { cls: 'conf' }), h('i', { cls: 'pend' }));
    els.glabel = h('div', { cls: 'glabel' });
    els.banner = h('div', { cls: 'banner' });
    els.panel = h('div', { cls: 'panel', role: 'tabpanel' });
    if (['talk', 'quests', 'shop', 'library'].indexOf(ui.tab) < 0) ui.tab = 'talk';
    els.tabs = h('nav', { cls: 'tabs', role: 'tablist', 'aria-label': 'Sections' }, [['talk', 'Talk'], ['quests', 'Quests'], ['shop', 'Shop'], ['library', 'Library']].map(function (t) {
      return h('button', { type: 'button', role: 'tab', 'data-tab': t[0], text: t[1], onclick: function () { if (t[0] === 'quests' && ui.tab === 'quests') ui.questOpen = null; ui.tab = t[0]; renderPanel(true); markTabs(); ui.refresh(); } });
    }));
    els.toast = h('div', { cls: 'toast', role: 'alert' });
    r.appendChild(h('div', { cls: 'main' },
      h('header', { cls: 'top' }, h('div', { cls: 'ttl' }, els.name, els.stage), els.sync, els.mute, gear),
      h('div', { cls: 'cols' },
        h('section', { cls: 'stagecol' }, h('div', { cls: 'stage' }, els.canvas, els.bubble, els.zoom), els.status, els.track, h('div', { cls: 'growth' }, els.bar, els.glabel), els.banner),
        h('section', { cls: 'panelcol' }, els.tabs, els.panel))));
    r.appendChild(els.toast);
    markTabs();
    ui.refresh(true);
    ui.refreshSync();
    ui.refreshVoice();
    if (a.dev.listen && !a.ears.on) a.ears.start(); // pick up where you left off (a phone may ask for one tap)
    setTimeout(function () { a.rebuild(); }, 600); // plays any hatch / evolution that happened while away
  };
  function markTabs() { Array.prototype.forEach.call(els.tabs.children, function (b) { var on = b.getAttribute('data-tab') === ui.tab; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); }); }
  function onPill() {
    var a = app();
    if (a.prof.local) return ui.settings();
    if (a.sync.state === 'login') return ui.reloginSheet();
    a.syncNow('manual').catch(function () {});
  }

  // keep the status line in step with what the scene shows (called by the scene loop)
  var lastLabel = '';
  ui.statusTick = function (sc) {
    if (!ui.onMain || !els.status || !app().S || !app().S.hatched || app().hatching) return;
    if (sc.actLabel !== lastLabel) { lastLabel = sc.actLabel; ui.refresh(); }
  };
  var lastVersion = -1;
  ui.refresh = function (force) {
    if (!ui.onMain) return;
    var a = app(), S = a.S; if (!S || !S.egg) return;
    updatePill();
    els.name.textContent = S.totemName;
    els.stage.textContent = C.stageName(S.stage) + (S.hatched && C.setting(S, 'skin', 'current') !== 'current' && S.skinForm !== S.form ? ' · old look' : '');
    els.stage.title = S.skinForm !== S.form ? 'Wearing the Stage ' + (S.skinForm && S.skinForm.stage) + ' look. Change it in Library > Time capsules.' : '';
    var sc = a.sceneState(), w = sc.weatherInfo, wtxt = w.source === 'guess' ? '' : ' · ' + w.label + (w.temp !== undefined ? ' ' + w.temp + '°' + w.units : '') + (w.stale && w.source === 'live' ? ' (' + w.ago + ')' : '');
    if (a.hatching) els.status.textContent = 'The egg is cracking!';
    else if (!S.hatched) els.status.textContent = (sc.eggProgress > 0.9 ? 'The egg is cracking!' : 'Hatches in ' + a.fmtDur(S.hatchAt - a.trueNow())) + wtxt;
    else els.status.textContent = S.totemName + ' is ' + sc.actLabel + (sc.indoor && sc.place === 'home' && sc.act !== 'sleep' ? ' inside' : '') + wtxt;
    if (els.canvas) els.canvas.setAttribute('aria-label', 'Picture of ' + S.totemName + ', a ' + C.stageName(S.stage) + '. ' + els.status.textContent);
    // the quest you're tracking, under Aiu (like a game HUD)
    var tq = C.tracked(S);
    if (tq) { var tn2 = C.nextStep(S, tq); els.track.textContent = 'Quest: ' + tq.title + (tn2 ? ' > ' + tn2.title : (tq.steps || []).length ? ' > all steps done' : ' > add the first step'); els.track.style.display = ''; }
    else els.track.style.display = 'none';
    // growth bar
    var g = S.growth, conf = els.bar.children[0], pend = els.bar.children[1];
    if (!S.hatched) {
      conf.style.width = Math.round(sc.eggProgress * 100) + '%'; pend.style.width = '0';
      els.glabel.textContent = 'Egg · growth saved: ' + (g.confirmed + g.pending) + ' · today ' + g.today + '/' + g.cap;
    } else {
      var span = Math.max(1, g.stageNext - g.stageFloor), have = Math.max(0, g.confirmed - g.stageFloor);
      conf.style.width = Math.min(100, have / span * 100) + '%';
      pend.style.width = Math.max(0, Math.min(100 - have / span * 100, g.pending / span * 100)) + '%';
      els.glabel.textContent = C.stageName(S.stage) + ' · ' + Math.min(have, span) + '/' + span + ' to ' + C.stageName(S.stage + 1) +
        (g.pending ? ' · +' + g.pending + ' waiting for sync' : '') + ' · today ' + g.today + '/' + g.cap + ' · ' + S.coins + ' coins';
    }
    // banner
    var b = '', act = null, old = a.oldestUnsent();
    var offgrid = !a.prof.local && (navigator.onLine === false || a.sync.state === 'offline');
    if (offgrid && !a.local.offgridTold && S.hatched) { // once per device: what off-grid means
      a.local.offgridTold = Date.now(); a.saveLocal();
      a.addLine('Heads up, ' + S.callMe + ': we\'re off-grid. I\'ll keep everything on this device and sync when we\'re back online. Until then, if this device is lost or reset, or its browser data is cleared, those changes are gone. Going away for a while? Save a capsule first.', false);
    }
    if (a.sync.state === 'login') b = 'Log in again to sync. Everything you do is still saved on this device.';
    else if (!a.prof.local && old < a.trueNow() - 3 * 86400000) { b = 'Not synced for ' + Math.floor((a.trueNow() - old) / 86400000) + ' days. Get online soon, or save a capsule to be safe.'; act = ['Save capsule', function () { a.exportCapsule(); }]; }
    else if (a.sync.clockWarn) b = 'This device\'s clock looks off by ' + Math.abs(a.sync.clockWarn) + ' min. Aiu is using the server\'s time.';
    else if (g.full) b = 'Growth bar full! Extra points don\'t count until you sync and evolve. Head back to Wi-Fi.';
    else if (g.readyAtSync) b = a.prof.local ? '' : (a.sync.state === 'ok' ? 'Evolving...' : 'Ready to evolve! Get online and sync to evolve.');
    else if (offgrid && S.unsent) { b = 'Off-grid: ' + S.unsent + ' change' + (S.unsent === 1 ? ' is' : 's are') + ' only on this device until you sync.'; act = ['Save capsule', function () { a.exportCapsule(); }]; }
    clear(els.banner);
    if (b) { els.banner.appendChild(h('span', { text: b })); if (act) els.banner.appendChild(btn(act[0], act[1], 'mini')); }
    els.banner.style.display = b ? '' : 'none';
    if (force || lastVersion !== a.version) { lastVersion = a.version; renderPanel(false); }
  };
  ui.refreshSync = function () { updatePill(); ui.refresh(); };
  function updatePill() {
    if (!ui.onMain || !els.sync) return;
    var a = app(), st = a.sync.state, n = a.S ? a.S.unsent : 0, t, cls;
    if (a.prof.local) { t = 'THIS DEVICE'; cls = 'local'; }
    else if (st === 'syncing') { t = 'SYNCING'; cls = 'busy'; }
    else if (st === 'login') { t = 'LOG IN'; cls = 'bad'; }
    else if (st === 'offline') { t = 'OFFLINE' + (n ? ' · ' + n : ''); cls = 'off'; }
    else if (st === 'error') { t = 'SYNC ERROR'; cls = 'bad'; }
    else { t = n ? 'WAITING · ' + n : 'SYNCED'; cls = n ? 'off' : 'ok'; }
    els.sync.textContent = t; els.sync.className = 'pill ' + cls; els.sync.title = a.sync.err || '';
  }

  var bubbleTimer = null;
  ui.bubble = function (text) {
    if (!ui.onMain || !els.bubble) return;
    els.bubble.textContent = text; els.bubble.classList.add('show');
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(function () { els.bubble.classList.remove('show'); }, Math.max(5000, text.length * 70));
  };

  /* ---------- voice and ears ---------- */
  var EARTEXT = { off: 'Listen: off  (tap to talk to Aiu)', listening: 'Listening...  (tap to stop)', paused: 'Aiu is talking...  (tap to stop listening)', waiting: 'Listening...  (tap to stop)', tap: 'Listening paused: tap to resume' };
  ui.refreshEars = function () {
    var a = app(); if (!els.listen) return;
    var st = a.ears.on ? a.ears.state : 'off';
    if (st === 'tap') { els.listen.onclick = function () { a.ears.fails = 0; a.ears.resume(); }; } else els.listen.onclick = function () { a.ears.toggle(); };
    els.listen.textContent = EARTEXT[st] || EARTEXT.off;
    els.listen.setAttribute('aria-pressed', a.ears.on ? 'true' : 'false');
    els.listen.classList.toggle('on', a.ears.on);
  };
  ui.heard = function (text, final) { if (els.input && document.activeElement !== els.input) els.input.value = final ? '' : text; };
  ui.refreshVoice = function () {
    var a = app(); if (!els.mute) return;
    var muted = a.dev.mute || !a.dev.voice;
    els.mute.setAttribute('aria-pressed', muted ? 'true' : 'false');
    els.mute.setAttribute('aria-label', muted ? 'Aiu is muted. Tap to let Aiu speak' : 'Aiu speaks out loud. Tap to mute');
    els.mute.innerHTML = muted ? SPK_OFF : SPK_ON;
  };
  var SPK_ON = '<svg viewBox="0 0 10 8" width="24" height="20" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M0 3h2V2h1V1h1v6H3V6H2V5H0zM6 2h1v1h1v2H7v1H6V5h1V3H6zM8 1h1v1h1v4H9v1H8V6h1V2H8z"/></svg>';
  var SPK_OFF = '<svg viewBox="0 0 10 8" width="24" height="20" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M0 3h2V2h1V1h1v6H3V6H2V5H0zM6 2h1v1h1v1h1V3h1v1H9v1h1v1H9V5H8v1H7V5H6V4h1V3H6z"/></svg>';
  // Tap any text and Aiu reads it out loud (Settings > Voice).
  function tapToRead(ev) {
    var a = app();
    if (!a.dev || !a.dev.tapRead || a.dev.mute || !a.dev.voice) return;
    var t = ev.target;
    if (!t || !t.closest || t.closest('button, a, input, textarea, select, label, summary, canvas, .toast')) return;
    var el = t.closest('.mtext, .bubble, .status, .ititle, .qtitle, .qdesc, .jline, .small, .empty, .lead, p, h2, h3, li, .daysep, .glabel, .banner span');
    if (!el) return;
    var txt = (el.textContent || '').trim();
    if (txt) a.speak(txt);
  }
  document.addEventListener('click', tapToRead);

  /* ---------- reminder pop-up ---------- */
  ui.showReminder = function (p) {
    if (!els.toast) return;
    var a = app(), pic = A.portrait(a.sceneState(), 3);
    pic.className = 'tpic';
    clear(els.toast).appendChild(h('div', { cls: 'tin' }, pic, h('div', { cls: 'tbody' },
      h('div', { cls: 'tmeta', text: U.fmtHm(p.o.time, C.setting(a.S, 'clock24', false)) + ' · ' + p.o.title }),
      h('div', { cls: 'tmsg', text: p.line }),
      h('div', { cls: 'tbtns' }, btn('Done', function () { a.reminderDone(); }, 'primary'), btn('Dismiss', function () { a.reminderDismiss(); })))));
    els.toast.classList.add('show');
    a.addLine(p.line, 'quiet'); // the reminder itself is spoken once by the reminder loop
    document.title = '(!) ' + a.S.totemName + ' - Aiu Totem';
  };
  ui.hideReminder = function () { if (els.toast) els.toast.classList.remove('show'); document.title = 'Aiu Totem'; };
  // A hexagram drawn with six bars (bottom line at the bottom). Solid = yang, broken = yin, highlighted = changing.
  function hexPic(vals, n) {
    var lines = vals && vals.length === 6 ? vals.map(function (v) { return { yang: v === 7 || v === 9, mv: v === 6 || v === 9 }; }) : AIU.iching.linesOf(n).map(function (b) { return { yang: !!b, mv: false }; });
    var info = AIU.iching.info(n), box = h('div', { cls: 'hex', role: 'img', 'aria-label': 'Hexagram ' + n + (info ? ', ' + info.name : '') });
    lines.slice().reverse().forEach(function (l) { box.appendChild(h('div', { cls: 'hl' + (l.yang ? '' : ' yin') + (l.mv ? ' mv' : '') }, l.yang ? h('i') : [h('i'), h('i')])); });
    return box;
  }
  ui.hexPic = hexPic;
  // The daily hilltop review pop-up
  ui.showReview = function (rv, fresh) {
    if (!els.toast || !rv) return;
    var a = app(), H = AIU.iching.info(rv.hex);
    clear(els.toast).appendChild(h('div', { cls: 'tin' }, hexPic(rv.vals, rv.hex), h('div', { cls: 'tbody' },
      h('div', { cls: 'tmeta', text: 'Hilltop View · ' + Wd.cap(U.fmtDay(rv.day)) + ' · ' + rv.hex + ' ' + (H ? H.name + ' · ' + H.theme : '') }),
      h('div', { cls: 'tmsg review', text: rv.text }),
      h('div', { cls: 'tbtns' }, btn('Got it', function () { ui.hideReminder(); }, 'primary'),
        btn('Today\'s page', function () { ui.hideReminder(); ui.openToday(); })))));
    els.toast.classList.add('show');
    if (!fresh) { a.beep('chirp'); a.speak(rv.text); }
  };

  /* ---------- panels ---------- */
  function renderPanel(force) {
    if (!els.panel) return;
    var active = document.activeElement, inside = active && els.panel.contains(active) && /INPUT|TEXTAREA|SELECT/.test(active.tagName);
    if (ui.tab === 'talk') { if (force || !els.panel.querySelector('.chat')) talkPanel(); else ui.refreshChat(); return; }
    var refocus = null;
    if (inside && !force) {
      // an "Add ..." box you just submitted (now empty) can refresh; keep typing where you were
      if (active.tagName === 'INPUT' && !active.value && active.getAttribute('data-addrow')) refocus = active.getAttribute('placeholder');
      else { ui.dirty = true; return; }
    }
    ({ quests: questsPanel, shop: shopPanel, library: libraryPanel })[ui.tab]();
    if (refocus) { var again = els.panel.querySelector('input[data-addrow][placeholder="' + refocus.replace(/"/g, '') + '"]'); if (again) try { again.focus(); } catch (e) {} }
  }
  document.addEventListener('focusout', function () { setTimeout(function () { if (ui.dirty && ui.onMain) { var ae = document.activeElement; if (!(ae && els.panel && els.panel.contains(ae) && /INPUT|TEXTAREA|SELECT/.test(ae.tagName))) { ui.dirty = false; renderPanel(true); } } }, 200); });
  function c24() { return C.setting(app().S, 'clock24', false); }
  function block(title, kids) { return h('div', { cls: 'block' }, title ? h('h3', { text: title }) : null, kids); }
  function empty(t) { return h('p', { cls: 'empty', text: t }); }
  function addRow(placeholder, onAdd) {
    var i = inp({ placeholder: placeholder, autocapitalize: 'sentences', 'data-addrow': '1', 'aria-label': placeholder });
    function go() { var v = i.value.trim(); if (!v) return; i.value = ''; onAdd(v); }
    i.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    return h('div', { cls: 'row' }, i, btn('Add', go, 'mini'));
  }

  /* Talk */
  function talkPanel() {
    var a = app(), p = clear(els.panel), input = inp({ placeholder: 'Talk to ' + a.S.totemName + '...', autocapitalize: 'sentences', spellcheck: true, enterkeyhint: 'send' });
    els.chat = h('div', { cls: 'chat', 'aria-live': 'polite' });
    function send() { var v = input.value; input.value = ''; a.say(v); }
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); send(); } });
    els.input = input;
    // Listen: a big on/off switch. On = Aiu keeps listening until you turn it off.
    els.listen = a.ears.supported ? h('button', { type: 'button', cls: 'btn listen', 'aria-pressed': 'false' }) : null; // its click is set in ui.refreshEars
    var chips = h('div', { cls: 'chips' },
      btn('Today\'s page', function () { ui.openToday(); }, 'chip'),
      [['Next?', 'What\'s next?'], ['Schedule', 'What\'s my schedule today?'], ['Shopping', 'What\'s on my shopping list?'], ['Help', 'help']].map(function (c) { return btn(c[0], function () { a.say(c[1]); }, 'chip'); }));
    els.pchips = h('div', { cls: 'chips pchips', role: 'group', 'aria-label': 'Quick answers' });
    p.appendChild(els.chat); p.appendChild(els.pchips); p.appendChild(chips);
    if (els.listen) p.appendChild(els.listen);
    p.appendChild(h('div', { cls: 'say' }, input, btn('Send', send, 'primary')));
    ui.refreshEars();
    ui.refreshChat();
  }
  // Tap-to-answer buttons for whatever Aiu just asked (the quiz, topic questions, yes/no offers)
  var B21 = { todo: ['Still to do', 'still need to do it'], goal: ['A goal', 'a goal'], remember: ['Remember it', 'remember it'], happened: ['Already happened', 'it already happened'], feeling: ['A feeling', 'about how i feel'], question: ['A question', 'a question'], chat: ['Just chatting', 'just chatting'] };
  function pendingChips() {
    var a = app(), pd = a.pending, box = els.pchips, opts = [];
    if (!box) return;
    clear(box);
    if (pd && pd.type === 'pq') { var q = AIU.persona.QUIZ[(pd.data || {}).i || 0]; if (q) opts = [['A: ' + q.a, 'A'], ['B: ' + q.b, 'B'], ['Skip', 'skip']]; }
    else if (pd && pd.type === 'pq_offer') opts = [['Let\'s do it', 'yes'], ['Later', 'later']];
    else if (pd && pd.type === 'topic_q') { var d = pd.data || {}; opts = d.w === 'feel' ? [['Yes', 'yes'], ['Kind of', 'kind of'], ['No', 'no']] : d.confirm ? [['Still true', 'yes'], ['It changed', 'no'], ['That\'s all', 'that\'s all']] : [['Skip', 'skip'], ['That\'s all', 'that\'s all']]; }
    else if (pd && /^(b_offer|quest_complete|cast_now|make_routine|quest_start|offer_quest|add_to_list|quest_reminder)$/.test(pd.type)) opts = [['Yes', 'yes'], ['No', 'no']];
    else if (pd && pd.type === 'qcheck') opts = [['Done', 'done'], ['Not yet', 'not yet']];
    else if (pd && pd.type === 'topic_new') opts = [['About ' + ((pd.data || {}).pd || {}).t, 'it\'s about that'], ['Something new', 'something new']];
    else if (pd && pd.type === 'b_q21') { var c = ((pd.data || {}).cands || []).slice(0, (pd.data || {}).pair ? 2 : 1); c.forEach(function (x) { if (B21[x]) opts.push(B21[x]); }); if (!(pd.data || {}).pair) opts.push(['No', 'no']); if (c.indexOf('chat') < 0) opts.push(B21.chat); }
    box.hidden = !opts.length;
    opts.forEach(function (o) { box.appendChild(btn(o[0], function () { a.say(o[1]); }, 'chip qa')); });
  }
  ui.pendingChips = pendingChips;
  ui.refreshChat = function () {
    if (!ui.onMain || ui.tab !== 'talk' || !els.chat) return;
    pendingChips();
    var a = app(), S = a.S;
    var items = S.chat.map(function (e) { return { t: e.t, who: e.type === 'say' ? 'you' : e.type === 'journal' ? 'journal' : 'totem', text: e.data.text, dn: e.dev !== a.deviceId ? e.dn : '', day: e.d, hm: e.h, edited: e.edited }; })
      .concat(a.lines.map(function (l) { return { t: l.t, who: 'totem', text: l.text, local: true }; }))
      .sort(function (x, y) { return x.t - y.t; }).slice(-80);
    clear(els.chat);
    if (!items.length) els.chat.appendChild(empty('Say hi to ' + S.totemName + '! Try "I woke up at 6, brushed my teeth and fed the cat", or "I\'m looking for a job".'));
    var lastDay = '';
    items.forEach(function (it) {
      var day = it.day || U.dayStr(new Date(it.t));
      if (day !== lastDay) { els.chat.appendChild(h('div', { cls: 'daysep', text: U.fmtDay(day) })); lastDay = day; }
      var who = it.who === 'you' ? 'You' : it.who === 'journal' ? 'Journal page' : S.totemName;
      els.chat.appendChild(h('div', { cls: 'msg ' + it.who + (it.local ? ' local' : '') },
        h('div', { cls: 'mtext', text: it.text }),
        h('div', { cls: 'mmeta', text: who + ' · ' + U.fmtHm(it.hm || U.hmStr(new Date(it.t)), c24()) + (it.dn ? ' · ' + it.dn : '') + (it.edited ? ' · edited' : '') })));
    });
    els.chat.scrollTop = els.chat.scrollHeight;
  };

  /* Journal (a sheet, opened from Talk or the Library) */
  ui.journalSheet = function (entry) {
    var a = app(), s, ta = h('textarea', { cls: 'jtext', rows: 8, placeholder: 'What happened today? What are you working on? How do you feel?', value: entry ? entry.data.text : ui.jdraft });
    var count = h('span', { cls: 'hint' });
    function upd() { if (!entry) ui.jdraft = ta.value; var n = ta.value.trim().length; count.textContent = n + ' letters' + (entry ? '' : n >= 80 ? ' · earns growth' : ' · 80+ earns growth'); }
    ta.addEventListener('input', upd); upd();
    var save = btn(entry ? 'Save changes' : 'Save story', function () {
      var v = ta.value.trim(); if (!v) return;
      s.remove();
      if (entry) { if (v !== entry.data.text) a.addEvents([{ type: 'journal_edit', data: { ref: entry.id, text: v } }]).then(function () { a.addLine('Page updated. The old version stays in the history.', false); }); }
      else { ui.jdraft = ''; a.journal(v); }
    }, 'primary');
    s = sheet(entry ? 'Edit your story from ' + U.fmtDay(entry.d) : 'Add a story to today\'s page', [
      entry ? h('p', { cls: 'small', text: 'Editing keeps the old version in the Totem\'s history. Growth stays the same.' }) : h('p', { cls: 'small', text: 'Your own words, on today\'s journal page. Writing is how ' + a.S.totemName + ' grows the most: +10 for 80+ letters, up to 30 a day.' }),
      ta, h('div', { cls: 'row spread' }, count, save),
      entry ? btn('Hide this page', function () { s.remove(); a.addEvents([{ type: 'journal_hide', data: { ref: entry.id, hidden: true } }]); }, 'ghost') : null
    ]);
    setTimeout(function () { try { ta.focus(); } catch (e) {} }, 50);
  };

  /* Quests: daily quests (tasks), bigger quests with steps, lists */
  /* ---------- shared: accordions, a small edit sheet, and undo ---------- */
  // An accordion section that remembers if it was open (on this device).
  function acc(id, title, kids, openByDefault, count) {
    var a = app(), mem = (a.local && a.local.acc) || {}, open = mem[id] !== undefined ? mem[id] : !!openByDefault;
    var d = h('details', { cls: 'acc' });
    if (open) d.open = true;
    d.appendChild(h('summary', null, h('span', { cls: 'acct', text: title }), count !== undefined && count !== null ? h('span', { cls: 'acount', text: String(count) }) : null));
    d.appendChild(h('div', { cls: 'accin' }, kids));
    d.addEventListener('toggle', function () { a.local.acc = a.local.acc || {}; a.local.acc[id] = d.open; a.saveLocal(); });
    return d;
  }
  ui.acc = acc;
  // Ask for one line of text (rename, edit a step...). fields: [{label, value, type, options}] -> onSave(values)
  function editSheet(title, fields, onSave, extraBtn) {
    var s, ins = fields.map(function (f) {
      if (f.options) return sel(f.options, f.value, function () {});
      if (f.type === 'textarea') return h('textarea', { rows: 4, value: f.value || '', 'aria-label': f.label });
      return inp({ value: f.value || '', type: f.type || 'text', autocapitalize: 'sentences', spellcheck: true, 'aria-label': f.label });
    });
    var save = btn('Save', function () { var vals = ins.map(function (i) { return i.value; }); s.remove(); onSave(vals); ui.refresh(true); }, 'primary');
    ins.forEach(function (i) { if (i.tagName === 'INPUT') i.addEventListener('keydown', function (e) { if (e.key === 'Enter') save.click(); }); });
    s = sheet(title, [fields.map(function (f, k) { return field(f.label, ins[k], f.hint); }), h('div', { cls: 'row spread' }, extraBtn || h('span'), save)]);
    setTimeout(function () { try { ins[0].focus(); } catch (e) {} }, 60);
  }
  ui.editSheet = editSheet;
  // "Deleted. Undo" for a few seconds.
  var snackTimer = null;
  function snack(text, undo) {
    var old = document.getElementById('snack'); if (old) old.remove();
    var b = h('div', { id: 'snack', cls: 'snack', role: 'status' }, h('span', { text: text }), undo ? btn('Undo', function () { b.remove(); undo(); }, 'mini') : null);
    document.body.appendChild(b);
    clearTimeout(snackTimer); snackTimer = setTimeout(function () { b.remove(); }, 7000);
  }
  ui.snack = snack;
  function iconBtn(label, text, fn, cls) { var b = btn(text, fn, 'mini ' + (cls || '')); b.setAttribute('aria-label', label); b.title = label; return b; }

  /* ---------- Quests: a quest log like an RPG journal. You write it; Aiu keeps it in order. ---------- */
  ui.questOpen = null;
  ui.openQuest = function (key) { ui.tab = 'quests'; ui.questOpen = key; renderPanel(true); markTabs(); if (els.panel) els.panel.scrollTop = 0; };
  function questsPanel() { if (ui.questOpen && app().S.quests[ui.questOpen] && app().S.quests[ui.questOpen].state !== 'deleted') questDetail(ui.questOpen); else { ui.questOpen = null; questHome(); } }
  function qprogress(S, q) { var st = C.questSteps(S, q), d = st.filter(function (x) { return x.done; }).length; return st.length ? d + '/' + st.length : 'no steps'; }
  function questRow(S, q, tracked) {
    var ns = C.nextStep(S, q);
    var b = h('button', { type: 'button', cls: 'qrow' + (tracked ? ' tracked' : ''), onclick: function () { ui.openQuest(q.key); } },
      h('span', { cls: 'qrtitle', text: (tracked ? '> ' : '') + q.title }),
      h('span', { cls: 'qrmeta', text: (ns ? 'Next: ' + ns.title : (q.steps || []).length ? 'All steps done' : 'No steps yet') + ' · ' + qprogress(S, q) }));
    b.setAttribute('aria-label', q.title + '. ' + (ns ? 'Current objective: ' + ns.title : 'No open steps') + '. ' + qprogress(S, q) + '. Open quest');
    return b;
  }
  function questHome() {
    var a = app(), S = a.S, p = clear(els.panel), now = new Date(a.trueNow()), today = U.dayStr(now), tr = C.tracked(S);
    // tracked quest
    if (tr) {
      var ns = C.nextStep(S, tr);
      p.appendChild(h('div', { cls: 'trackcard' }, h('span', { cls: 'tlabel', text: 'Tracking' }), h('b', { text: tr.title }),
        h('span', { cls: 'small', text: ns ? 'Current objective: ' + ns.title : (tr.steps || []).length ? 'All steps done. Complete it?' : 'No steps yet: add the first one.' }),
        h('div', { cls: 'row wrap' }, btn('Open', function () { ui.openQuest(tr.key); }, 'mini primary'),
          ns ? btn('Done: ' + (ns.title.length > 24 ? ns.title.slice(0, 22) + '...' : ns.title), function () { a.addEvents([{ type: 'quest_step', data: { key: tr.key, step: ns.id, done: true } }]).then(function () { a.addLine('Checked off: ' + ns.title + '.'); }); }, 'mini') : null)));
    }
    // today
    var oc = C.occurrences(S, today), tbox = [];
    if (!oc.length) tbox.push(empty('Nothing scheduled today.'));
    oc.forEach(function (o) {
      var cb = h('input', { type: 'checkbox', checked: o.done, disabled: o.done, 'aria-label': 'Done: ' + o.title, onchange: function () { a.addEvents([{ type: 'task_done', data: { key: o.key, date: today } }]); } });
      tbox.push(h('div', { cls: 'item' + (o.done ? ' done' : '') }, cb, h('span', { cls: 'itime', text: U.fmtHm(o.time, c24()) }), h('span', { cls: 'ititle', text: o.title }),
        iconBtn('Edit ' + o.title, 'Edit', function () { editReminder(o.key); })));
    });
    p.appendChild(acc('q-today', 'Today', tbox, true, oc.filter(function (o) { return !o.done; }).length));
    // the quest log: main and side quests
    var act = C.questList(S, 'active'), mains = act.filter(function (q) { return q.kind === 'main' || !q.kind; }), sides = act.filter(function (q) { return q.kind === 'side'; }), ideas = act.filter(function (q) { return q.kind === 'idea'; });
    var log = [];
    if (!mains.length && !sides.length) log.push(empty('No quests yet. Say "new quest: fix the fence" and tell ' + S.totemName + ' the steps, or add one here.'));
    if (mains.length) { log.push(h('h3', { cls: 'qgroup', text: 'Main quests' })); mains.forEach(function (q) { log.push(questRow(S, q, tr && tr.key === q.key)); }); }
    if (sides.length) { log.push(h('h3', { cls: 'qgroup', text: 'Side quests' })); sides.forEach(function (q) { log.push(questRow(S, q, tr && tr.key === q.key)); }); }
    var nq = inp({ placeholder: 'New quest, in your words', autocapitalize: 'sentences', 'aria-label': 'New quest title' }), nk = sel({ main: 'Main', side: 'Side' }, 'main', function () {});
    function addQuest() {
      var v = Wd.cap(nq.value.trim()).slice(0, 48); if (!v) return;
      var key = M.slug(v), ev = M.questEvents(v, [], { kind: nk.value });
      if (!tr) ev.push({ type: 'set', data: { k: 'track', v: key } });
      a.addEvents(ev).then(function () { ui.openQuest(key); a.addLine('Quest started: "' + v + '". What\'s the first step?'); a.pending = { type: 'quest_steps', data: { key: key, title: v, steps: [], kind: nk.value } }; a.store.set('pending', a.pending); });
    }
    nq.addEventListener('keydown', function (e) { if (e.key === 'Enter') addQuest(); });
    log.push(h('div', { cls: 'row' }, nq, nk, btn('Add', addQuest, 'mini')));
    p.appendChild(acc('q-log', 'Quest log', log, true, mains.length + sides.length));
    // ideas
    var ib = [];
    if (!ideas.length) ib.push(empty('Say "idea: ..." any time and it lands here.'));
    ideas.forEach(function (q) { ib.push(questRow(S, q, false)); });
    ib.push(addRow('New idea', function (v) { var t = Wd.cap(v).slice(0, 48); a.addEvents(M.questEvents(t, [], { kind: 'idea', why: v.length > 48 ? v : undefined })); }));
    p.appendChild(acc('q-ideas', 'Ideas', ib, false, ideas.length));
    // lists (to-do, shopping, ...)
    var lists = Object.keys(S.lists).filter(function (L) { return C.listItems(S, L).length || L === 'to-do' || L === 'shopping'; });
    ['to-do', 'shopping'].forEach(function (L) { if (lists.indexOf(L) < 0) lists.push(L); });
    lists.sort(function (x, y) { return (x === 'to-do' ? 0 : x === 'shopping' ? 1 : 2) - (y === 'to-do' ? 0 : y === 'shopping' ? 1 : 2); });
    var lb = [];
    lists.forEach(function (L) {
      var items = C.listItems(S, L), open = items.filter(function (x) { return !x.done; }).length;
      var box = [];
      items.forEach(function (it) {
        box.push(h('div', { cls: 'item' + (it.done ? ' done' : '') },
          h('input', { type: 'checkbox', checked: it.done, 'aria-label': (it.done ? 'Not done: ' : 'Done: ') + it.item, onchange: function () { a.addEvents([{ type: 'list_check', data: { list: L, item: it.item, done: !it.done } }]); } }),
          h('span', { cls: 'ititle', text: it.item }),
          iconBtn('Edit ' + it.item, 'Edit', function () {
            editSheet('Edit list item', [{ label: 'Item', value: it.item }], function (v) {
              var nv = Wd.clean(v[0]); if (!nv || nv === it.item) return;
              a.addEvents([{ type: 'list_remove', data: { list: L, item: it.item } }, { type: 'list_add', data: { list: L, item: nv } }]);
            });
          }),
          iconBtn('Delete ' + it.item, 'Delete', function () {
            a.addEvents([{ type: 'list_remove', data: { list: L, item: it.item } }]).then(function () { snack('Deleted "' + it.item + '".', function () { a.addEvents([{ type: 'list_add', data: { list: L, item: it.item } }]); }); });
          }, 'del')));
      });
      if (!items.length) box.push(empty('Empty.'));
      box.push(addRow('Add to ' + L, function (v) { a.addEvents([{ type: 'list_add', data: { list: L, item: v } }]); }));
      lb.push(acc('q-list-' + L, Wd.cap(L) + ' list', box, L === 'to-do', open));
    });
    p.appendChild(acc('q-lists', 'Lists', lb, true));
    // reminders & routines
    var keys = Object.keys(S.tasks).filter(function (k) { return S.tasks[k].title && !(S.tasks[k].off && S.tasks[k].removed); }).sort(function (x, y) { return S.tasks[x].time < S.tasks[y].time ? -1 : 1; });
    var on = keys.filter(function (k) { return !S.tasks[k].off && (S.tasks[k].repeat !== 'once' || S.tasks[k].date >= today); });
    var rb = [];
    if (!on.length) rb.push(empty('None yet.'));
    on.forEach(function (k) {
      var t = S.tasks[k];
      rb.push(h('div', { cls: 'item' }, h('span', { cls: 'itime', text: U.fmtHm(t.time, c24()) }), h('span', { cls: 'ititle', text: t.title }),
        h('span', { cls: 'tag', text: t.repeat === 'once' ? U.fmtDay(t.date) : t.repeat }),
        iconBtn('Edit ' + t.title, 'Edit', function () { editReminder(k); }),
        iconBtn('Delete ' + t.title, 'Delete', function () { deleteReminder(k); }, 'del')));
    });
    rb.push(btn('Add a reminder', function () { editReminder(null); }, 'mini primary'));
    var offs = keys.filter(function (k) { return S.tasks[k].off; });
    if (offs.length) {
      var hs = h('details', { cls: 'sub' }, h('summary', { text: 'Turned off (' + offs.length + ')' }));
      offs.forEach(function (k) {
        var t = S.tasks[k];
        hs.appendChild(h('div', { cls: 'item dim' }, h('span', { cls: 'itime', text: U.fmtHm(t.time, c24()) }), h('span', { cls: 'ititle', text: t.title }),
          btn('On', function () { var d = { key: k, title: t.title, time: t.time, repeat: t.repeat, date: t.date, days: t.days, kind: t.kind }; if (d.repeat === 'once' && d.date < today) d.date = today; a.addEvents([{ type: 'task_set', data: d }]); }, 'mini'),
          iconBtn('Delete ' + t.title, 'Delete', function () { deleteReminder(k); }, 'del')));
      });
      rb.push(hs);
    }
    p.appendChild(acc('q-rem', 'Reminders & routines', rb, false, on.length));
    // finished & set aside
    var past = C.questList(S).filter(function (q) { return q.state === 'done' || q.state === 'dropped'; });
    if (past.length) {
      var pb = past.map(function (q) {
        return h('div', { cls: 'item dim' }, h('span', { cls: 'ititle', text: q.title }), h('span', { cls: 'tag', text: q.state === 'done' ? 'complete' : 'set aside' }),
          iconBtn('Open ' + q.title, 'Open', function () { ui.openQuest(q.key); }), btn('Restart', function () { a.addEvents([{ type: 'quest_state', data: { key: q.key, state: 'active' } }]); }, 'mini'));
      });
      p.appendChild(acc('q-done', 'Done & set aside', pb, false, past.length));
    }
  }
  function editReminder(key) {
    var a = app(), S = a.S, t = key ? S.tasks[key] : null, now = new Date(a.trueNow()), today = U.dayStr(now);
    editSheet(t ? 'Edit reminder' : 'New reminder', [
      { label: 'What', value: t ? t.title : '' },
      { label: 'Time', value: t ? t.time : '18:00', type: 'time' },
      { label: 'Repeat', value: t ? (t.repeat || 'once') : 'once', options: { once: 'Once', daily: 'Every day', weekdays: 'Weekdays', weekends: 'Weekends' } }
    ], function (v) {
      var title = Wd.cap(v[0].trim()); if (!title || !/^\d{2}:\d{2}$/.test(v[1])) return;
      var d = { key: key || M.slug(title), title: title, time: v[1], repeat: v[2], routine: t && t.routine, quest: t && t.quest };
      if (v[2] === 'once') d.date = (t && t.repeat === 'once' && t.date >= today) ? t.date : (U.hmToMin(v[1]) > U.minOfDay(now) ? today : U.addDays(today, 1));
      if (!key) d.key = M.keyFor(d.key, d);
      a.addEvents([{ type: 'task_set', data: d }]).then(function () { a.addLine((t ? 'Updated: ' : 'Reminder set: ') + title + ' at ' + U.fmtHm(d.time, c24()) + '.'); });
    }, t ? iconBtn('Delete ' + t.title, 'Delete', function () { document.querySelector('.sheet').remove(); deleteReminder(key); }, 'del') : null);
  }
  function deleteReminder(k) {
    var a = app(), t = a.S.tasks[k]; if (!t) return;
    var back = { key: k, title: t.title, time: t.time, repeat: t.repeat, date: t.date, days: t.days, kind: t.kind, routine: t.routine, quest: t.quest };
    a.addEvents([{ type: 'task_off', data: { key: k, removed: true } }]).then(function () { snack('Deleted "' + t.title + '".', function () { a.addEvents([{ type: 'task_set', data: back }]); }); });
  }
  // One quest: objectives (the checklist) and its journal, like a game's quest log.
  function questDetail(key) {
    var a = app(), S = a.S, p = clear(els.panel), q = S.quests[key], tr = C.tracked(S), isT = tr && tr.key === key;
    var steps = C.questSteps(S, q), ns = C.nextStep(S, q);
    function setSteps(list) { return a.addEvents([{ type: 'quest_set', data: M.questSetData(q, list) }]); }
    var raw = (q.steps || []).slice();
    p.appendChild(h('div', { cls: 'row spread' }, btn('< Quest log', function () { ui.questOpen = null; renderPanel(true); }, 'mini ghost'),
      h('span', { cls: 'tag', text: q.state === 'active' ? (q.kind === 'side' ? 'side quest' : q.kind === 'idea' ? 'idea' : 'main quest') : q.state === 'done' ? 'complete' : 'set aside' })));
    p.appendChild(h('h2', { cls: 'qtitle', text: q.title }));
    if (q.why) p.appendChild(h('p', { cls: 'qdesc', text: q.why }));
    p.appendChild(h('div', { cls: 'row wrap' },
      q.state === 'active' && q.kind !== 'idea' ? btn(isT ? 'Tracking' : 'Track this quest', function () { a.setSetting('track', isT ? null : key); }, 'mini' + (isT ? ' primary' : '')) : null,
      btn('Rename', function () { editSheet('Rename quest', [{ label: 'Title', value: q.title }, { label: 'What it\'s about (optional)', value: q.why || '', type: 'textarea' }], function (v) { var t = Wd.cap(v[0].trim()).slice(0, 48); if (!t) return; var d = M.questSetData(q, raw); d.title = t; d.why = v[1].trim() || undefined; a.addEvents([{ type: 'quest_set', data: d }]); }); }, 'mini'),
      sel({ main: 'Main quest', side: 'Side quest', idea: 'Idea' }, q.kind || 'main', function (v) { var d = M.questSetData(q, raw); d.kind = v; a.addEvents([{ type: 'quest_set', data: d }]); })));
    // objectives
    var ob = [];
    if (!steps.length) ob.push(empty('No steps yet. Add the first one below, or tell ' + S.totemName + '.'));
    steps.forEach(function (st, i) {
      var cur = ns && ns.id === st.id;
      var cb = h('input', { type: 'checkbox', checked: st.done, 'aria-label': (st.done ? 'Undo: ' : 'Done: ') + st.title, onchange: function (e) { a.addEvents([{ type: 'quest_step', data: { key: key, step: st.id, done: e.target.checked } }]); } });
      ob.push(h('div', { cls: 'item objective' + (st.done ? ' done' : '') + (cur ? ' current' : '') }, cb,
        h('span', { cls: 'ititle', text: (cur ? '> ' : '') + st.title }),
        i > 0 ? iconBtn('Move up: ' + st.title, 'Up', function () { var l = raw.slice(); var t = l[i]; l[i] = l[i - 1]; l[i - 1] = t; setSteps(l); }) : null,
        i < steps.length - 1 ? iconBtn('Move down: ' + st.title, 'Dn', function () { var l = raw.slice(); var t = l[i]; l[i] = l[i + 1]; l[i + 1] = t; setSteps(l); }) : null,
        iconBtn('Edit: ' + st.title, 'Edit', function () { editSheet('Edit step', [{ label: 'Step', value: st.title }], function (v) { var t = Wd.cap(v[0].trim()); if (!t) return; var l = raw.map(function (x) { return x.id === st.id ? { id: x.id, title: t.slice(0, 80) } : x; }); setSteps(l); }); }),
        iconBtn('Delete: ' + st.title, 'Delete', function () { var l = raw.filter(function (x) { return x.id !== st.id; }); setSteps(l).then(function () { snack('Deleted step "' + st.title + '".', function () { setSteps(raw); }); }); }, 'del')));
    });
    ob.push(addRow('Add a step', function (v) { var l = raw.slice(); M.stepsFrom(v).forEach(function (t) { l.push({ id: M.nextStepId(l), title: t }); }); if (l.length > raw.length) setSteps(l.slice(0, 30)); }));
    p.appendChild(acc('qd-obj', 'Objectives ' + qprogress(S, q), ob, true));
    // journal: your notes plus what happened, newest first
    var events = C.questNotes(S, key).map(function (n) { return { t: n.t, text: n.text, note: n, tag: n.tag }; });
    steps.forEach(function (st) { var r = S.qsteps[key + '|' + st.id]; if (r && r.done) events.push({ t: r.t, text: 'Done: ' + st.title }); });
    events.push({ t: q.first, text: 'Quest started' + (q.dn ? ' on ' + q.dn : '') + '.' });
    if (q.state !== 'active' && q.stateM) events.push({ t: q.stateM.t, text: q.state === 'done' ? 'Quest complete!' : q.state === 'dropped' ? 'Set aside.' : '' });
    events.sort(function (x, y) { return y.t - x.t; });
    var jb = [];
    events.forEach(function (ev) {
      if (!ev.text) return;
      var row = h('div', { cls: 'jline' + (ev.note ? ' note' : '') + (ev.tag === 'blocker' ? ' blocker' : '') },
        h('span', { cls: 'jdate', text: U.fmtDay(U.dayStr(ev.t)) + ' ' + U.fmtHm(U.hmStr(ev.t), c24()) }),
        h('span', { cls: 'jtxt', text: (ev.tag === 'blocker' ? 'Blocker: ' : '') + ev.text }));
      if (ev.note) {
        row.appendChild(iconBtn('Edit note', 'Edit', function () { editSheet('Edit note', [{ label: 'Note', value: ev.note.text, type: 'textarea' }], function (v) { if (v[0].trim()) a.addEvents([{ type: 'quest_note_edit', data: { key: key, ref: ev.note.id, text: v[0].trim() } }]); }); }));
        row.appendChild(iconBtn('Delete note', 'Delete', function () { a.addEvents([{ type: 'quest_note_edit', data: { key: key, ref: ev.note.id, removed: true } }]).then(function () { snack('Note deleted.', function () { a.addEvents([{ type: 'quest_note_edit', data: { key: key, ref: ev.note.id, text: ev.note.text } }]); }); }); }, 'del'));
      }
      jb.push(row);
    });
    jb.unshift(addRow('Write in the quest journal', function (v) { a.addEvents([{ type: 'quest_note', data: { key: key, text: v, by: 'you' } }]); }));
    p.appendChild(acc('qd-journal', 'Journal', jb, true, C.questNotes(S, key).length));
    // finish
    p.appendChild(h('div', { cls: 'row wrap qactions' },
      q.state === 'active' ? btn('Quest complete', function () { a.addEvents([{ type: 'quest_state', data: { key: key, state: 'done' } }]).then(function () { a.addLine('Quest complete: ' + q.title + '! So proud of you.'); a.setMode('hop', 1500); }); }, 'mini primary') :
        btn('Restart quest', function () { a.addEvents([{ type: 'quest_state', data: { key: key, state: 'active' } }]); }, 'mini'),
      q.state === 'active' ? btn('Set aside', function () { a.addEvents([{ type: 'quest_state', data: { key: key, state: 'dropped' } }]); }, 'mini') : null,
      iconBtn('Delete quest ' + q.title, 'Delete quest', function () {
        var was = q.state;
        a.addEvents([{ type: 'quest_state', data: { key: key, state: 'deleted' } }]).then(function () { ui.questOpen = null; renderPanel(true); snack('Deleted quest "' + q.title + '".', function () { a.addEvents([{ type: 'quest_state', data: { key: key, state: was } }]); }); });
      }, 'del')));
  }

  /* Shop: spend coins (earned by growing) on hats, toys, views, houses and room decor */
  var SLOTS = { hat: 'Hat', toy: 'Toy', backdrop: 'View', house: 'House', decor: 'Room decor' };
  var CATS = { hat: 'Hats', toy: 'Toys', backdrop: 'Views', house: 'Houses', decor: 'Room decor', activity: 'Things to do' };
  function shopPanel() {
    var a = app(), S = a.S, p = clear(els.panel);
    p.appendChild(h('div', { cls: 'coins' }, h('b', { text: S.coins + ' coins' }), h('span', { cls: 'small', text: ' Earned by growing: journal pages, teaching, quest steps. Spending never shrinks your Totem.' })));
    // wearing
    var wear = [];
    Object.keys(SLOTS).forEach(function (slot) {
      var v = C.setting(S, slot, null), isShop = v && !(slot === 'house' && A.HOUSES[v]), info = isShop ? a.itemInfo(v) : null;
      if (!isShop) return;
      wear.push(h('div', { cls: 'item' }, h('span', { cls: 'itime', text: SLOTS[slot] }), h('span', { cls: 'ititle', text: info ? info.name : v }),
        btn('Take off', function () { a.equip(slot, slot === 'house' ? 'cabin' : null); }, 'mini')));
    });
    var wearN = wear.length;
    if (!wearN) wear.push(empty('Nothing yet. Buy something below and tap Wear.'));
    p.appendChild(acc('shop-wearing', 'Wearing', wear, false, wearN));
    // one fold-out shelf per kind of thing
    var holder = h('div');
    p.appendChild(holder);
    function card(it) {
      var owned = !!S.owned[it.id], buying = S.pendingBuys.indexOf(it.id) >= 0, wearing = C.setting(S, it.category, null) === it.id;
      var img = h('img', { src: 'shop/' + it.file + (it.v ? '?v=' + it.v : ''), alt: it.name, loading: 'lazy', cls: 'thumb' });
      var action, isAct = it.category === 'activity';
      if (isAct) { // show only the first frame of the strip
        img = h('div', { cls: 'thumb strip', title: it.name, role: 'img', 'aria-label': it.name });
        img.style.backgroundImage = 'url("shop/' + it.file + (it.v ? '?v=' + it.v : '') + '")';
        img.style.backgroundSize = ((it.frames || 1) * 100) + '% 100%';
        img.style.aspectRatio = Math.max(1, Math.round((it.w || 32) / (it.frames || 1))) + ' / ' + (it.h || 32);
      }
      if (owned && isAct) action = btn('Do it now', function () { a.cacheAsset(it).then(function () { a.tryActivity(it.id); }); }, 'mini primary');
      else if (owned) action = wearing ? btn('Take off', function () { a.equip(it.category, it.category === 'house' ? 'cabin' : null); }, 'mini') : btn('Wear', function () { a.cacheAsset(it).then(function () { return a.equip(it.category, it.id); }); }, 'mini primary');
      else if (buying) action = btn('Buying...', null, 'mini');
      else action = btn('Buy · ' + it.price, function (ev) {
        var b3 = ev.target; busy(b3, true, 'Buying...');
        a.buy(it).then(function () { if (a.S.owned[it.id]) { a.addLine('Got the ' + it.name + '! ' + (isAct ? 'I\'ll do it in my free time. Tap "Do it now" to watch.' : 'Tap Wear to try it on.')); } else if (!a.prof.local) a.addLine('Your ' + it.name + ' is waiting for the server. It\'s yours after the next sync.'); shopPanel(); },
          function (e) { busy(b3, false, e.message); });
      }, 'mini');
      if (!owned && !buying && S.coins < it.price) action.disabled = true;
      return h('div', { cls: 'shopitem' + (owned ? ' owned' : '') }, h('div', { cls: 'thumbbox' }, img), h('b', { text: it.name }),
        h('span', { cls: 'small', text: (isAct ? 'Thing to do' : (SLOTS[it.category] || it.category)) + (owned ? ' · owned' : ' · ' + it.price + ' coins') }), it.desc ? h('span', { cls: 'small', text: it.desc }) : null, action);
    }
    function fill() {
      clear(holder);
      var all = ((a.catalog && a.catalog.items) || []).filter(function (it) { return !it.retired || S.owned[it.id]; });
      var mine = all.filter(function (it) { return S.owned[it.id]; });
      if (mine.length) holder.appendChild(acc('shop-mine', 'My things', [h('div', { cls: 'shopgrid' }, mine.map(card))], false, mine.length));
      Object.keys(CATS).forEach(function (k) {
        var items = all.filter(function (it) { return it.category === k; });
        if (!items.length) return;
        holder.appendChild(acc('shop-' + k, CATS[k], [h('div', { cls: 'shopgrid' }, items.map(card))], false, items.length));
      });
      if (!all.length) holder.appendChild(empty('Nothing here yet.'));
    }
    if (a.catalog) fill();
    else { holder.appendChild(empty('Opening the shop...')); a.loadCatalog().then(fill, function () { clear(holder).appendChild(empty('Get online to browse the shop. Things you own still work offline.')); }); }
    p.appendChild(h('p', { cls: 'small dim', text: 'New things show up here when the host adds them to the server.' }));
  }

  /* Library: search, today's page, chapters (months) and pages (days), glossary, capsules */
  ui.lib = { month: null, day: null };
  function lc(s) { return String(s || '').toLowerCase(); }
  function journalCard(a, e) {
    return h('article', { cls: 'jentry' + (a.unsent.some(function (u) { return u.id === e.id; }) ? ' unsent' : '') },
      h('div', { cls: 'jmeta', text: U.fmtDay(e.d) + ' ' + U.fmtHm(e.h || '', c24()) + ' · ' + (e.dn || 'device') + (e.edited ? ' · edited' : '') }),
      h('div', { cls: 'jbody', text: e.data.text }),
      h('div', { cls: 'row' }, btn('Edit', function () { ui.journalSheet(e); }, 'mini'), btn('Hide', function () { a.addEvents([{ type: 'journal_hide', data: { ref: e.id, hidden: true } }]); }, 'mini')));
  }
  function libraryPanel() {
    var a = app(), S = a.S, p = clear(els.panel);
    // search
    var q = inp({ placeholder: 'Search: groceries, birthday, car...', 'aria-label': 'Search the library' }), out = h('div', { cls: 'results' }), timer = null;
    q.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        var v = q.value.trim(); clear(out); if (!v) return;
        a.prefetch(v).catch(function () {}).then(function () {
          var hits = M.search(S, v, 8); clear(out);
          if (!hits.length) out.appendChild(empty('Nothing found.'));
          hits.forEach(function (d) { out.appendChild(h('div', { cls: 'item col' }, h('span', { cls: 'tag', text: U.fmtDay(d.day) + ' · ' + d.kind }), h('span', { text: d.text }))); });
        });
      }, 250);
    });
    p.appendChild(acc('lib-search', 'Search', [q, out], true));
    // the Journal: a book of Hilltop pages, one per day (today's page writes itself as the day goes)
    p.appendChild(acc('lib-journal', 'Journal', [journalBook(a)], true, bookDays(S).length));
    // topic pages (who, what, when, where, why, how)
    var tl = C.topicList(S), tpb = h('div');
    if (!tl.length) tpb.appendChild(empty('Talk about things you like ("I love fishing") and ' + S.totemName + ' asks who, what, when, where, why and how. Your answers make pages here that you can edit.'));
    tl.forEach(function (rec) { tpb.appendChild(topicCard(a, rec)); });
    p.appendChild(acc('lib-topics', 'Topics', [tpb], true, tl.length));
    // personality
    p.appendChild(acc('lib-persona', 'Personality', [personaBox(a)], false, S.ptype && S.ptype.code ? S.ptype.code : null));
    // chapters
    var months = Object.keys(S.lib).sort().reverse(), cb = h('div');
    if (!months.length) cb.appendChild(empty('Each month becomes a chapter, and each day a page.'));
    months.forEach(function (mo) {
      var ch = S.lib[mo], days = Object.keys(ch.days).sort().reverse();
      var pages = days.filter(function (d) { var pg = ch.days[d]; return pg.say || pg.journal || pg.done || pg.memory; });
      var d0 = U.dayToDate(mo + '-01'), title = U.MONTHS[d0.getMonth()] + ' ' + d0.getFullYear();
      var top = C.top(ch.words, 5).map(function (w) { return S.lex[w] ? Object.keys(S.lex[w].raw)[0] : w; });
      var det = h('details', { cls: 'chapter', open: ui.lib.month === mo }, h('summary', { text: title + ' · ' + pages.length + ' page' + (pages.length === 1 ? '' : 's') }),
        top.length ? h('p', { cls: 'small', text: 'Mostly about: ' + top.join(', ') }) : null);
      det.addEventListener('toggle', function () { if (det.open) ui.lib.month = mo; });
      pages.forEach(function (d) {
        var pg = ch.days[d], bits = [];
        if (pg.journal) bits.push(pg.journal + ' journal'); if (pg.say) bits.push(pg.say + ' said'); if (pg.done) bits.push(pg.done + ' done');
        var row = h('div', { cls: 'item col' }, h('div', { cls: 'row spread' }, h('b', { text: U.fmtDay(d) }), h('span', { cls: 'small', text: bits.join(' · ') })),
          Object.keys(pg.words).length ? h('span', { cls: 'small', text: C.top(pg.words, 5).map(function (w) { return S.lex[w] ? Object.keys(S.lex[w].raw)[0] : w; }).join(', ') }) : null);
        var body = h('div', { cls: 'pagebody' });
        row.appendChild(btn(ui.lib.day === d ? 'Close page' : 'Open page', function () { ui.lib.day = ui.lib.day === d ? null : d; ui.lib.month = mo; libraryPanel(); }, 'mini'));
        row.appendChild(body);
        if (ui.lib.day === d) openPage(a, mo, d, body);
        det.appendChild(row);
      });
      cb.appendChild(det);
    });
    p.appendChild(acc('lib-chapters', 'Chapters', [cb], false, months.length));
    // recaps
    var rk = Object.keys(S.recaps).sort().reverse();
    if (rk.length) { var rb = h('div'); rk.slice(0, 8).forEach(function (k) { rb.appendChild(h('div', { cls: 'item col' }, h('span', { cls: 'tag', text: 'week of ' + U.fmtDay(U.addDays(k, -6)) }), h('span', { text: S.recaps[k].text }))); }); p.appendChild(acc('lib-recaps', 'Weekly recaps', [rb], false, rk.length)); }
    // questions
    var review = S.hatched ? M.reviewWords(S, 5) : [];
    if (review.length) {
      var qb = h('div');
      review.forEach(function (w) {
        var row = h('div', { cls: 'item col' }, h('span', { text: 'Who or what is ' + w.display + '?' })), bs = h('div', { cls: 'row wrap' });
        [['person', 'Person'], ['pet', 'Pet'], ['place', 'Place'], ['thing', 'Thing'], ['skip', 'Skip']].forEach(function (o) {
          bs.appendChild(btn(o[1], function () {
            var ev = [{ type: 'learn', data: { word: w.norm, kind: o[0], note: o[1] } }];
            if (o[0] !== 'skip') ev.push({ type: 'entity', data: { name: w.display, kind: o[0] } });
            a.addEvents(ev);
          }, 'mini'));
        });
        row.appendChild(bs); qb.appendChild(row);
      });
      p.appendChild(acc('lib-questions', 'Questions from ' + S.totemName, [qb], true, review.length));
    }
    // time capsules
    var tb = h('div');
    if (!S.forms.length) tb.appendChild(empty('Each form ' + S.totemName + ' grows into is saved here.'));
    var skin = C.setting(S, 'skin', 'current');
    S.forms.slice().reverse().forEach(function (f) {
      var cr = A.creature(f.seed, f.stage, S.accentSeed), cv = A.crop(cr, 'open', 3);
      cv.className = 'fpic';
      var isSkin = String(skin) === String(f.stage), isCur = f === S.form;
      tb.appendChild(h('div', { cls: 'form' }, cv, h('div', { cls: 'fbody' },
        h('b', { text: 'Stage ' + f.stage + ' · ' + C.stageName(f.stage) }), h('div', { cls: 'small', text: U.fmtDay(U.dayStr(f.t)) + (f.words && f.words.length ? ' · talked about ' + f.words.map(function (w) { return S.lex[w] ? Object.keys(S.lex[w].raw)[0] : w; }).join(', ') : '') }),
        h('div', { cls: 'small', text: cr.parts.join(', ') }),
        isCur && skin === 'current' ? h('span', { cls: 'tag', text: 'showing' }) : isSkin ? h('span', { cls: 'tag', text: 'wearing this look' }) :
          btn(isCur ? 'Show current look' : 'Wear this look', function () { a.setSetting('skin', isCur ? 'current' : String(f.stage)); }, 'mini'))));
    });
    if (skin !== 'current') tb.appendChild(btn('Always show my newest form', function () { a.setSetting('skin', 'current'); }, 'mini'));
    p.appendChild(acc('lib-capsules', 'Time capsules', [tb], false, S.forms.length));
    // glossary (the word matrix)
    var gl = M.glossary(S, 40);
    var tbl = h('table', { cls: 'matrix' }, h('thead', null, h('tr', null, ['Word', 'Root', 'Type', 'Conf', 'State', 'Chapters'].map(function (t) { return h('th', { text: t }); }))));
    var tbody = h('tbody');
    gl.forEach(function (w) {
      tbody.appendChild(h('tr', null, h('td', { text: w.display }), h('td', { text: w.typoOf ? w.norm + ' → ' + w.typoOf : w.norm }), h('td', { text: w.kind && w.kind !== 'skip' ? w.kind : '-' }),
        h('td', { text: w.conf.toFixed(2) }), h('td', null, h('span', { cls: 'st ' + w.state.toLowerCase(), text: w.state })),
        h('td', { text: w.chapters.map(function (m) { var dd = U.dayToDate(m + '-01'); return U.MONTHS[dd.getMonth()]; }).join(' ') })));
    });
    tbl.appendChild(tbody);
    p.appendChild(acc('lib-glossary', 'Glossary', [h('p', { cls: 'small', text: 'Words ' + S.totemName + ' picked up, how sure it is, and where in the library they show up.' }),
      gl.length ? h('div', { cls: 'tablewrap' }, tbl) : empty('Talk and journal to fill this in.')], false, gl.length));
    // remembered
    var mem = h('div');
    S.memories.slice().reverse().slice(0, 20).forEach(function (e) { mem.appendChild(h('div', { cls: 'item col' }, h('span', { cls: 'tag', text: U.fmtDay(e.d) }), h('span', { text: e.data.text }))); });
    Object.keys(S.facts).forEach(function (k) { mem.appendChild(h('div', { cls: 'item' }, h('span', { cls: 'ititle', text: 'Your ' + k }), h('span', { cls: 'tag', text: S.facts[k].value }))); });
    if (!S.memories.length && !Object.keys(S.facts).length) mem.appendChild(empty('Say "remember that..." and it goes here.'));
    p.appendChild(acc('lib-remembered', 'Remembered', [mem], false, S.memories.length + Object.keys(S.facts).length));
    // hidden pages
    var hid = Object.keys(S.jhide).filter(function (id) { return S.jhide[id].v; });
    if (hid.length) {
      var hd = h('details', { cls: 'sub' }, h('summary', { text: 'Hidden pages (' + hid.length + ')' }));
      hid.forEach(function (id) { hd.appendChild(h('div', { cls: 'item' }, h('span', { cls: 'ititle', text: 'Page from ' + U.fmtDay(U.dayStr(new Date(S.jhide[id].t))) + ' (hidden ' + U.ago(S.jhide[id].t) + ')' }), btn('Unhide', function () { a.addEvents([{ type: 'journal_hide', data: { ref: id, hidden: false } }]); }, 'mini'))); });
      p.appendChild(hd);
    }
  }
  /* ---------- the Journal: Hilltop pages ---------- */
  function todayStr() { return U.dayStr(new Date(app().trueNow())); }
  function bookDays(S) {
    var days = {}, today = todayStr();
    Object.keys(S.reviews || {}).forEach(function (d) { days[d] = 1; });
    Object.keys(S.jpages || {}).forEach(function (d) { days[d] = 1; });
    (S.journal || []).forEach(function (e) { days[e.d] = 1; });
    Object.keys(S.lib || {}).forEach(function (mo) { Object.keys(S.lib[mo].days).forEach(function (d) { var pg = S.lib[mo].days[d]; if (pg.say || pg.journal || pg.done || pg.memory) days[d] = 1; }); });
    days[today] = 1;
    return Object.keys(days).filter(function (d) { return d <= today; }).sort().reverse().slice(0, 90);
  }
  function pageOpts(a, day, events) {
    var ctx = a.ctx();
    return { today: ctx.today, nowMin: ctx.nowMin, clock24: c24(), wx: M.wxText(a.weatherNow(), c24()), events: events || a.S.chat };
  }
  function journalBook(a) {
    var S = a.S, box = h('div', { cls: 'jbook' }), days = bookDays(S), today = todayStr();
    box.appendChild(h('p', { cls: 'small', text: 'One page a day. ' + S.totemName + ' writes it from everything you said and did, and keeps it up to date all day. Edit anything to make it right: your words win.' }));
    days.forEach(function (d) {
      var det = h('details', { cls: 'chapter jday', id: d === today ? 'jp-today' : null, open: d === today ? ui.lib.jday !== 'closed' : ui.lib.jday === d });
      var rv = (S.reviews || {})[d], X = rv ? AIU.iching.info(rv.hex) : null, pj = (S.jpages || {})[d] || {};
      det.appendChild(h('summary', { text: (d === today ? 'Today' : Wd.cap(U.fmtDay(d))) + (X ? ' · ' + X.theme + ' (' + rv.hex + ')' : '') + (Object.keys(pj).some(function (k) { return pj[k].text; }) ? ' · edited' : '') }));
      var body = h('div', { cls: 'jpbody' });
      det.appendChild(body);
      function fill() {
        if (body.getAttribute('data-done')) return;
        body.setAttribute('data-done', '1');
        if (d === today) { renderPage(a, AIU.hilltop.page(a.S, d, pageOpts(a, d)), body); return; }
        body.appendChild(empty('Opening...'));
        a.chapter(d.slice(0, 7)).then(function (evs) { clear(body); renderPage(a, AIU.hilltop.page(a.S, d, pageOpts(a, d, evs)), body); }, function () { clear(body); renderPage(a, AIU.hilltop.page(a.S, d, pageOpts(a, d, [])), body); });
      }
      det.addEventListener('toggle', function () { if (det.open) { ui.lib.jday = d === today ? null : d; fill(); } else if (d === today) ui.lib.jday = 'closed'; else if (ui.lib.jday === d) ui.lib.jday = null; });
      if (det.open) fill();
      box.appendChild(det);
    });
    return box;
  }
  function sec(title, kids) { return h('section', { cls: 'jsec' }, h('h4', { text: title }), kids); }
  function renderPage(a, P, box) {
    var S = a.S, T = AIU.topics, today = P.isToday;
    box.appendChild(h('h3', { cls: 'jtitle', text: P.title }));
    if (P.stamp) box.appendChild(h('div', { cls: 'small', text: P.stamp + (today ? ' · updates all day' : '') }));
    if (P.weather) box.appendChild(h('div', { text: 'Weather: ' + P.weather }));
    if (P.forecast) box.appendChild(h('div', { text: 'Today: ' + P.forecast }));
    box.appendChild(h('div', { cls: 'row spread jdir' }, h('span', null, h('b', { text: 'Long-term direction: ' }), P.direction || h('i', { text: 'not set yet' })),
      iconBtn('Edit long-term direction', 'Edit', function () { editSheet('Your long-term direction', [{ label: 'In a line: where are you headed? (like "build skills and assets, keep my health, make useful things")', value: P.direction }], function (v) { a.setSetting('direction', v[0].trim()); }); })));
    // the reading
    if (P.cast) {
      var c = P.cast;
      box.appendChild(sec('I Ching', [h('div', { cls: 'row jcast' }, hexPic(c.vals, c.hex), h('div', { cls: 'col' },
        h('b', { text: 'Hexagram ' + c.hex + ': ' + c.name + ' (' + c.pinyin + ')' }),
        h('span', { cls: 'small', text: c.tri.upper + ' over ' + c.tri.lower }),
        h('span', { text: 'Changing line' + (c.moving.length === 1 ? '' : 's') + ': ' + (c.moving.length ? c.moving.join(', ') + ' → ' + c.rel + ' ' + c.relName : 'none') }),
        h('span', { text: 'One-word theme: ' + c.theme }))),
        P.interp.map(function (x) { return h('p', null, h('b', { text: x[0] + ': ' }), x[1]); }),
        P.lines.map(function (x) { return h('p', { cls: 'small', text: x }); }),
        P.transformed ? h('p', { cls: 'small', text: P.transformed }) : null]));
    } else if (today && S.hatched) box.appendChild(sec('I Ching', [h('p', { cls: 'small', text: 'Not cast yet today' + (M.readingTime(S) ? ' (it\'s set for ' + U.fmtHm(M.readingTime(S), c24()) + ')' : '') + '.' }), btn('Cast today\'s reading now', function () { a.castReading(true); }, 'primary')]));
    if (P.continuity.length) box.appendChild(sec('Continuity', h('ul', null, P.continuity.map(function (x) { return h('li', { text: x }); }))));
    if (P.areas.length || P.quiet.length) box.appendChild(sec('The whole terrain', [P.areas.map(function (ar) { return h('div', { cls: 'jarea' }, h('b', { text: ar.name }), h('ul', null, ar.lines.map(function (x) { return h('li', { text: x }); }))); }),
      P.quiet.length ? h('p', { cls: 'small', text: 'Nothing noted: ' + P.quiet.join(', ') + '.' }) : null]));
    if (P.feeding) box.appendChild(sec('What am I feeding?', [h('ul', null, P.feeding.map(function (x) { return h('li', { text: x }); })), h('p', { cls: 'small', text: 'Not every problem needs more effort. Sometimes the right move is to stop feeding the wrong thing. Answer below, in the daily log.' })]));
    if (P.loose.length) box.appendChild(sec('Leave no one behind', h('ul', null, P.loose.map(function (x) { return h('li', { text: x }); }))));
    if (P.plan) {
      var planRow = function (it) {
        return h('li', { cls: 'row spread' }, h('span', { text: it.text }), it.act ? iconBtn('Mark done: ' + it.text, 'Done', function () {
          var ac = it.act, ev = ac.type === 'task' ? { type: 'task_done', data: { key: ac.key, date: ac.date } } : ac.type === 'todo' ? { type: 'list_check', data: { list: ac.list, item: ac.item, done: true } } : { type: 'quest_step', data: { key: ac.key, step: ac.step, done: true } };
          a.addEvents([ev]).then(function () { snack('Done: ' + it.text); });
        }) : null);
      };
      box.appendChild(sec('Today\'s practical plan', [
        h('b', { text: 'Must do' }), P.plan.must.length ? h('ul', null, P.plan.must.map(planRow)) : h('p', { cls: 'small', text: 'Nothing urgent on the list.' }),
        h('b', { text: 'Should do' }), P.plan.should.length ? h('ul', null, P.plan.should.map(planRow)) : h('p', { cls: 'small', text: 'Pick one thing that moves your direction forward.' }),
        h('b', { text: 'If energy remains' }), P.plan.energy.length ? h('ul', null, P.plan.energy.map(planRow)) : h('p', { cls: 'small', text: 'Rest counts too.' })]));
    }
    if (P.principle) box.appendChild(h('blockquote', { cls: 'jprinciple', text: 'Hilltop principle: ' + P.principle }));
    // the daily log: Aiu's summary unless you wrote your own
    var logBox = h('div', { cls: 'jlog' });
    ['theme'].concat(AIU.hilltop.FIELDS.map(function (f) { return f[0]; })).forEach(function (k) {
      var L = P.log[k]; if (k === 'theme' && !L.text) return;
      logBox.appendChild(h('div', { cls: 'item col' },
        h('div', { cls: 'row spread' }, h('b', { text: L.label }), h('span', { cls: 'row' }, h('span', { cls: 'tag', text: L.edited ? 'your words' : L.text ? 'Aiu\'s summary' : 'empty' }),
          iconBtn('Edit ' + L.label, 'Edit', function () {
            editSheet(L.label + ' · ' + U.fmtDay(P.day), [{ label: L.label, value: L.text, type: 'textarea', hint: 'Leave it empty to go back to ' + S.totemName + '\'s summary.' }], function (v) { a.setPageField(P.day, k, v[0]); });
          }))),
        L.text ? h('span', { cls: 'jval', text: L.text }) : h('span', { cls: 'small', text: 'Not yet. Tap Edit to write it.' })));
    });
    box.appendChild(sec('Daily log', logBox));
    // stories you wrote
    var st = h('div'); P.stories.forEach(function (e) { st.appendChild(journalCard(a, e)); });
    if (today) st.appendChild(btn('Add a story', function () { ui.journalSheet(); }, P.stories.length ? 'mini' : 'primary'));
    if (P.stories.length || today) box.appendChild(sec('Your stories', st));
    // plug-and-play AI
    var aiBox = h('div');
    if (P.ai) aiBox.appendChild(h('div', { cls: 'jval jai', text: P.ai }));
    var status = h('p', { cls: 'formmsg' });
    aiBox.appendChild(h('div', { cls: 'row wrap' },
      btn('Copy for any AI', function () { a.aiPrompt().then(function (pr) { copyText(pr + '\n\n' + AIU.hilltop.promptData(P, S), status); }); }, 'mini'),
      btn(P.ai ? 'Edit the AI\'s answer' : 'Paste the AI\'s answer', function () { editSheet('AI Hilltop View · ' + U.fmtDay(P.day), [{ label: 'Paste what the AI wrote', value: P.ai, type: 'textarea' }], function (v) { a.setPageField(P.day, 'ai', v[0]); }); }, 'mini'),
      a.dev.aiUrl ? btn('Ask my AI', function (ev) {
        var b0 = ev.target; b0.disabled = true; msg(status, 'Asking your AI... (this can take a minute)');
        a.aiPrompt().then(function (pr) { return a.askAI(pr, AIU.hilltop.promptData(P, S)); }).then(function (txt) { msg(status, 'Saved on this page.'); return a.setPageField(P.day, 'ai', txt); }, function (e) { b0.disabled = false; msg(status, e.message, true); });
      }, 'mini primary') : null), status,
      h('p', { cls: 'small', text: 'Copy for any AI puts the Hilltop prompt and this page\'s data on your clipboard, ready to paste into any AI chat you use. Paste its answer back here to keep it in your journal.' + (a.dev.aiUrl ? '' : ' Or plug in your own AI in Settings > This device.') }));
    box.appendChild(sec('AI Hilltop View (optional)', aiBox));
  }
  function copyText(text, status) {
    function fallback() { var ta = h('textarea', { rows: 10, value: text, readonly: true }); var s0 = sheet('Copy this', [h('p', { cls: 'small', text: 'Select all and copy, then paste into your AI chat.' }), ta]); setTimeout(function () { ta.focus(); ta.select(); }, 60); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { msg(status, 'Copied! Paste it into your AI chat.'); }, fallback);
    else fallback();
  }
  // "Today's page" from anywhere (the chip, the pop-up)
  ui.openToday = function () {
    var a = app(); a.local.acc = a.local.acc || {}; a.local.acc['lib-journal'] = true; ui.lib.jday = null;
    ui.tab = 'library'; renderPanel(true); markTabs(); ui.refresh();
    setTimeout(function () { var el = document.getElementById('jp-today'); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'start' }); }, 60);
  };
  function topicCard(a, rec) {
    var S = a.S, T = AIU.topics, facts = C.topicFacts(S, rec.key), logs = C.topicLogs(S, rec.key);
    var n = Object.keys(facts).length + logs.length;
    var det = h('details', { cls: 'chapter topic', open: ui.lib.topic === rec.key },
      h('summary', { text: rec.title + (rec.feel ? ' · you ' + (rec.feel.v === 'it\'s okay' ? 'think it\'s okay' : rec.feel.v.replace(/s$/, '')) + (rec.feel.v === 'it\'s okay' ? '' : ' it') : '') + ' · ' + U.fmtDay(U.dayStr(new Date(rec.t))) }));
    det.addEventListener('toggle', function () { if (det.open) ui.lib.topic = rec.key; else if (ui.lib.topic === rec.key) ui.lib.topic = null; });
    var base = { key: rec.key, title: rec.title, kind: rec.kind, group: rec.group };
    T.WS.forEach(function (w) {
      var f = facts[w], row = h('div', { cls: 'item col tw' });
      var head = h('div', { cls: 'row spread' }, h('b', { text: T.WLABEL[w] }), h('span', { cls: 'row' },
        iconBtn((f ? 'Edit ' : 'Add ') + w + ' for ' + rec.title, f ? 'Edit' : 'Add', function () {
          var q = f && f.q && f.q !== '(you said)' ? f.q : T.question({ group: rec.group || 'thing', t: /^my /i.test(rec.title) ? 'your ' + rec.title.slice(3) : lc(rec.title), mode: 'fact' }, w);
          editSheet(T.WLABEL[w] + ': ' + rec.title, [{ label: q, value: f ? f.a : '' }], function (v) { if (v[0].trim()) a.addEvents([{ type: 'topic', data: Object.assign({ w: w, a: v[0].trim(), q: q }, base) }]); });
        }),
        f ? iconBtn('Delete ' + w + ' for ' + rec.title, 'Delete', function () {
          var old = f.a;
          a.addEvents([{ type: 'topic', data: { key: rec.key, w: w, removed: true } }]);
          snack('Deleted.', function () { a.addEvents([{ type: 'topic', data: Object.assign({ w: w, a: old, q: f.q }, base) }]); });
        }) : null));
      row.appendChild(head);
      if (f) {
        row.appendChild(h('span', { cls: 'tans', text: f.a }));
        row.appendChild(h('span', { cls: 'small', text: (f.q && f.q !== '(you said)' ? f.q + ' · ' : '') + 'checked ' + U.fmtDay(U.dayStr(new Date(f.checked))) }));
        if (f.hist.length) row.appendChild(h('span', { cls: 'small', text: 'Before: ' + f.hist.slice(0, 3).map(function (x) { return x.a + ' (' + U.fmtDay(U.dayStr(new Date(x.t))) + ')'; }).join(' · ') }));
      } else row.appendChild(h('span', { cls: 'small', text: 'Not yet.' }));
      det.appendChild(row);
    });
    if (logs.length) {
      var lb = h('div', { cls: 'item col' }, h('b', { text: 'Times you told me about it' }));
      logs.slice(0, 10).forEach(function (l) {
        var bits = T.WS.filter(function (w) { return l.a[w]; }).map(function (w) { return T.WLABEL[w].toLowerCase() + ': ' + l.a[w].a; });
        lb.appendChild(h('span', { cls: 'small', text: Wd.cap(U.fmtDay(l.day)) + (l.tense === 'future' ? ' (plans)' : '') + ' · ' + bits.join('; ') }));
      });
      det.appendChild(lb);
    }
    det.appendChild(h('div', { cls: 'row wrap' },
      btn('Ask me about this', function () { ui.tab = 'talk'; renderPanel(true); markTabs(); a.askTopic(rec.key); }, 'mini'),
      btn('Remove page', function () {
        a.addEvents([{ type: 'topic', data: { key: rec.key, hidden: true } }]);
        snack('Page removed.', function () { a.addEvents([{ type: 'topic', data: { key: rec.key, hidden: false } }]); });
      }, 'mini ghost')));
    if (!n) det.appendChild(empty('No answers yet.'));
    return det;
  }
  function personaBox(a) {
    var S = a.S, P = AIU.persona, pt = S.ptype || {}, box = h('div');
    if (pt.code) box.appendChild(h('div', { cls: 'item col' }, h('b', { text: pt.name + ' (' + pt.code + ')' }), h('span', { text: pt.desc }),
      h('span', { cls: 'small', text: S.totemName + ' shares this personality with you. It sets how ' + S.totemName + ' talks and which questions it asks first.' })));
    else box.appendChild(empty('Take the quick quiz (12 either/or questions). Your type becomes ' + S.totemName + '\'s type too.'));
    P.AXES.forEach(function (ax) {
      var v = pt.pct ? pt.pct[ax.k] : 50;
      box.appendChild(h('div', { cls: 'slider', role: 'img', 'aria-label': ax.name + ': ' + v + ' percent ' + ax.aName + ', ' + (100 - v) + ' percent ' + ax.bName },
        h('span', { cls: 'sa', text: ax.aName }), h('span', { cls: 'strack' }, h('i', { style: 'left:' + (100 - v) + '%' })), h('span', { cls: 'sb', text: ax.bName })));
    });
    box.appendChild(h('p', { cls: 'small', text: 'It evolves: the quiz sets where you start, and the way you talk keeps nudging the sliders a little. When your type shifts, ' + S.totemName + ' tells you.' }));
    box.appendChild(btn(pt.answered ? 'Retake the quiz' : 'Take the quiz', function () { ui.tab = 'talk'; renderPanel(true); markTabs(); a.say('personality quiz'); }, pt.answered ? 'mini' : 'primary'));
    if ((S.ptypes || []).length) {
      var hist = h('div', { cls: 'item col' }, h('b', { text: 'How it has changed' }));
      S.ptypes.slice().reverse().slice(0, 10).forEach(function (x) { hist.appendChild(h('span', { cls: 'small', text: Wd.cap(U.fmtDay(U.dayStr(new Date(x.t)))) + ': ' + (x.from && x.from !== x.code ? x.from + ' → ' : '') + x.code + ' ' + P.nameOf(x.code) })); });
      box.appendChild(hist);
    }
    box.appendChild(h('p', { cls: 'small', text: 'The four either/or sides go back to Carl Jung (1921). The quiz and type names are KODNA\'s own, not a licensed test.' }));
    return box;
  }
  function readingCard(a, rv) {
    var I = AIU.iching, H = I.info(rv.hex), R = rv.rel && rv.rel !== rv.hex ? I.info(rv.rel) : null, tg = I.trigramsOf(rv.hex);
    if (!H) return h('span');
    var det = h('details', { cls: 'chapter reading' }, h('summary', { text: Wd.cap(U.fmtDay(rv.day)) + ' · ' + H.n + ' ' + H.name + (R ? ' → ' + R.n + ' ' + R.name : '') }));
    det.appendChild(h('div', { cls: 'row' }, hexPic(rv.vals, rv.hex), h('div', { cls: 'col' },
      h('b', { text: H.n + '. ' + H.name + ' (' + H.pinyin + ')' }),
      h('span', { cls: 'small', text: tg.upper + ' over ' + tg.lower + ' · the day\'s mode: ' + I.MODES[H.mode].label }),
      h('span', { text: H.meaning + ' ' + H.advice }),
      rv.moving && rv.moving.length ? h('span', { cls: 'small', text: 'Changing line' + (rv.moving.length > 1 ? 's' : '') + ': ' + rv.moving.join(', ') + (R ? '. Heading toward ' + R.n + ', ' + R.name + ': ' + R.meaning : '') }) : null)));
    det.appendChild(h('p', { cls: 'small', text: rv.text }));
    return det;
  }
  function openPage(a, month, day, body) {
    body.appendChild(empty('Opening...'));
    a.chapter(month).then(function (evs) {
      var S = a.S, list = evs.filter(function (e) { return e.d === day; }).sort(C.cmpT);
      clear(body);
      var j = list.filter(function (e) { return e.type === 'journal' && !(S.jhide[e.id] && S.jhide[e.id].v); });
      j.forEach(function (e) { var ed = S.jedit[e.id]; if (ed) e = Object.assign({}, e, { data: { text: ed.text }, edited: ed.t }); body.appendChild(journalCard(a, e)); });
      var said = list.filter(function (e) { return e.type === 'say'; }).slice(0, 30);
      if (said.length) body.appendChild(h('div', { cls: 'small' }, h('b', { text: 'You said: ' }), said.map(function (e) { return '"' + e.data.text + '"'; }).join(' · ')));
      var done = Object.keys(S.done).filter(function (k) { return k.slice(-10) === day; }).map(function (k) { var t = S.tasks[k.slice(0, -11)]; return t ? t.title : k.slice(0, -11); });
      if (done.length) body.appendChild(h('div', { cls: 'small' }, h('b', { text: 'Done: ' }), done.join(', ')));
      var mems = list.filter(function (e) { return e.type === 'remember'; });
      if (mems.length) body.appendChild(h('div', { cls: 'small' }, h('b', { text: 'Remembered: ' }), mems.map(function (e) { return e.data.text; }).join(' · ')));
      if (!body.children.length) body.appendChild(empty('A quiet day.'));
    }, function () { clear(body).appendChild(empty('Could not open this page.')); });
  }

  /* ---------- settings sheet ---------- */
  function sheet(title, children) {
    var opener = document.activeElement;
    var s = h('div', { cls: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': title });
    function shut() { s.remove(); ui.refresh(true); try { if (opener && opener.focus) opener.focus(); } catch (e) {} }
    var close = btn('Close', shut, 'ghost');
    s.appendChild(h('div', { cls: 'sheetin' }, h('div', { cls: 'sheethead' }, h('h2', { text: title }), close), children));
    s.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.preventDefault(); shut(); } });
    document.body.appendChild(s);
    setTimeout(function () { var f = s.querySelector('input, textarea, select, button:not(.ghost)') || close; try { f.focus(); } catch (e) {} }, 40);
    return s;
  }
  function section(title, kids) { return h('section', { cls: 'sset' }, h('h3', { text: title }), kids); }

  ui.reloginSheet = function () {
    var a = app(), pw = inp({ type: 'password', placeholder: 'password' }), m = h('p', { cls: 'formmsg' }), s;
    var go = btn('Log in', function () {
      busy(go, true, '...');
      a.login(a.prof.u, pw.value).then(function () { a.prof = a.profiles[a.pid]; s.remove(); a.syncNow('relogin').catch(function () {}); }, function (e) { busy(go, false, 'Log in'); msg(m, e.message, true); });
    }, 'primary');
    s = sheet('Log in again', [h('p', { text: 'Your password changed or this device was logged out. Nothing is lost: your changes are waiting on this device.' }), field('Password for ' + a.prof.u, pw), m, go,
      h('p', { cls: 'small' }, h('a', { href: '#', onclick: function (e) { e.preventDefault(); s.remove(); ui.forgotScreen(a.prof.u); }, text: 'Forgot password?' }))]);
  };

  ui.settings = function () {
    var a = app(), S = a.S, dev = a.dev, s;
    function devSet(k, v) { dev[k] = v; a.saveDev(); if (k === 'theme') ui.applyTheme(); }
    // account
    var acct = [];
    if (a.prof.local) {
      acct.push(h('p', { text: 'This Totem lives only on this device. Create an account to sync it to your phone, Pi and other devices.' }));
      acct.push(btn('Create an account to sync', function () { s.remove(); ui.signupScreen({ link: a.pid }); }, 'primary'));
      acct.push(btn('Log in to an account that has no Totem yet', function () { s.remove(); ui.linkFrom = a.pid; ui.loginScreen(); }));
    } else {
      var dl = h('div', { cls: 'small', text: 'Loading devices...' });
      acct.push(h('p', null, 'Signed in as ', h('b', { text: '@' + a.prof.u }), a.prof.email ? ' (' + a.prof.email + ')' : ''));
      acct.push(h('p', { cls: 'small', text: 'One Totem per account. Want another Totem? Make another account (the same email is fine).' }));
      acct.push(h('p', { cls: 'small', text: 'Sync: ' + a.sync.state + (a.sync.last ? ', last ' + U.ago(a.sync.last) : '') + (S.unsent ? ' · ' + S.unsent + ' changes waiting' : '') + (a.sync.err ? ' · ' + a.sync.err : '') }));
      acct.push(h('div', { cls: 'row wrap' }, btn('Sync now', function () { a.syncNow('manual').then(function () { s.remove(); ui.settings(); }, function () { s.remove(); ui.settings(); }); }, 'primary'),
        btn('Log out', function () { if (S.unsent && !confirm(S.unsent + ' changes have not synced yet. They stay safe on this device and sync next time you log in here. Log out?')) return; s.remove(); a.logout(); })));
      acct.push(dl);
      a.api('me', { u: a.prof.u, token: a.prof.token }).then(function (r) {
        clear(dl).appendChild(document.createTextNode('Devices: ' + r.devices.map(function (d) { return d.dn + ' (' + U.ago(d.last) + ')'; }).join(', ')));
      }, function (e) { dl.textContent = e.message; });
      var oldp = inp({ type: 'password', placeholder: 'current' }), newp = inp({ type: 'password', placeholder: 'new, 8+ characters' }), pm = h('p', { cls: 'formmsg' });
      acct.push(h('details', null, h('summary', { text: 'Change password' }), field('Current password', oldp), field('New password', newp), pm,
        btn('Change', function () { a.api('password', { u: a.prof.u, token: a.prof.token, old: oldp.value, pw: newp.value }).then(function () { msg(pm, 'Changed. Other devices will ask to log in again.'); }, function (e) { msg(pm, e.message, true); }); }, 'primary')));
    }
    var P = a.profiles, others = Object.keys(P).filter(function (k) { return k !== a.pid && (P[k].token || P[k].local) && !P[k].linkedTo; });
    if (others.length) acct.push(h('div', { cls: 'row wrap' }, others.map(function (k) { return btn('Switch to ' + (P[k].local ? 'device-only Totem' : P[k].u), function () { s.remove(); a.openProfile(k); }); })));
    acct.push(btn('Add another account', function () { s.remove(); a.meta.set('active', null); ui.onMain = false; ui.welcome(); }, 'ghost'));

    // totem
    var tn = inp({ value: S.totemName, maxLength: 24 }), cm = inp({ value: S.callMe, maxLength: 30 });
    var forms = { current: 'Newest form (always)' }; S.forms.forEach(function (f) { forms[String(f.stage)] = 'Stage ' + f.stage + ' - ' + C.stageName(f.stage); });
    var totem = [
      h('div', { cls: 'row2' }, field('Totem name', tn), field('It calls you', cm)),
      btn('Save names', function (e) { var d = []; if (tn.value.trim() && tn.value.trim() !== S.totemName) d.push({ type: 'set', data: { k: 'totemName', v: tn.value.trim() } }); if (cm.value.trim() && cm.value.trim() !== S.callMe) d.push({ type: 'set', data: { k: 'callMe', v: cm.value.trim() } }); a.addEvents(d).then(function () { e.target.textContent = 'Saved'; }); }, 'mini'),
      h('div', { cls: 'row2' }, field('House', sel(A.HOUSES, C.setting(S, 'house', 'cabin'), function (v) { a.setSetting('house', v); })),
        field('World', sel(A.BIOMES, C.setting(S, 'biome', 'meadow'), function (v) { a.setSetting('biome', v); }))),
      field('Look (skin)', sel(forms, C.setting(S, 'skin', 'current'), function (v) { a.setSetting('skin', v); }), 'Only changes how it looks. It keeps growing and evolving underneath.')
    ];
    // reminders
    var voiceSel = h('select');
    function fillVoices() {
      clear(voiceSel); voiceSel.appendChild(h('option', { value: '', text: 'Default voice' }));
      a.voices().forEach(function (v) { var o = h('option', { value: v.name, text: v.name + ' (' + v.lang + ')' }); if (v.name === dev.voiceName) o.selected = true; voiceSel.appendChild(o); });
    }
    fillVoices(); if (window.speechSynthesis) speechSynthesis.onvoiceschanged = fillVoices;
    voiceSel.addEventListener('change', function () { devSet('voiceName', voiceSel.value); });
    var rtimes = [['off', 'Off']], rcur = C.setting(S, 'reading', '08:00');
    for (var rm = 240; rm <= 1320; rm += rm < 720 ? 30 : 60) rtimes.push([U.minToHm(rm), U.fmtHm(U.minToHm(rm), c24())]);
    if (!rtimes.some(function (x) { return x[0] === rcur; })) rtimes.push([rcur, U.fmtHm(rcur, c24())]);
    var rem = [
      field('Daily reading (I Ching + hilltop review)', sel(rtimes, rcur, function (v) { a.setSetting('reading', v); }), 'At this time ' + S.totemName + ' tosses the coins and gives you yesterday\'s track record and guidance for today, as a pop-up and in the chat.'),
      field('A reminder keeps trying for', sel({ '0.5': '30 seconds', '1': '1 minute', '5': '5 minutes', 'next': 'Until the next task' }, C.setting(S, 'lasts', '5'), function (v) { a.setSetting('lasts', v); })),
      field('Sound', sel({ knock: 'Knock knock', ping: 'Ping', chirp: 'Chirp', off: 'Off' }, dev.sound, function (v) { devSet('sound', v); a.beep(v); })),
      h('div', { cls: 'row wrap' }, btn('Test', function () { a.beep(); a.speak('Hey ' + S.callMe + ', this is how I sound!'); }, 'mini'),
        window.Notification ? btn(dev.notif ? 'Desktop pop-ups: on' : 'Desktop pop-ups: off', function (e) {
          if (dev.notif) { devSet('notif', false); e.target.textContent = 'Desktop pop-ups: off'; return; }
          Notification.requestPermission().then(function (p) { devSet('notif', p === 'granted'); e.target.textContent = p === 'granted' ? 'Desktop pop-ups: on' : 'Blocked by the browser'; });
        }, 'mini') : null),
      h('p', { cls: 'small', text: 'Pop-ups and sounds work while Aiu is open (a tab or the home-screen app). Full-screen games can hide them.' })
    ];
    // voice and listening (this device)
    var voice = [
      h('div', { cls: 'row2' }, field('Aiu\'s voice', sel({ on: 'Speaks out loud', off: 'Muted' }, dev.voice && !dev.mute ? 'on' : 'off', function (v) { devSet('voice', true); a.setMute(v === 'off'); })),
        field('Droid chirp', sel({ on: 'Before it speaks', off: 'Off' }, dev.chirp ? 'on' : 'off', function (v) { devSet('chirp', v === 'on'); }))),
      field('Voice to use', voiceSel, 'Built into this device and works offline. On a Raspberry Pi, see the README for the one-time voice setup.'),
      h('div', { cls: 'row2' }, field('Tap text to hear it', sel({ on: 'On', off: 'Off' }, dev.tapRead ? 'on' : 'off', function (v) { devSet('tapRead', v === 'on'); })),
        field('When listening, answer', sel({ all: 'Everything I say', wake: 'Only when I say "Aiu..."' }, dev.wake ? 'wake' : 'all', function (v) { devSet('wake', v === 'wake'); }))),
      field('Say what Aiu tells me on my other devices', sel({ off: 'No', on: 'Yes (good for the home Pi)' }, dev.hearOthers ? 'on' : 'off', function (v) { devSet('hearOthers', v === 'on'); })),
      h('div', { cls: 'row wrap' }, btn('Test voice', function () { a.speak('Hey ' + S.callMe + ', this is how I sound!'); }, 'mini')),
      h('p', { cls: 'small', text: 'Listen stays on until you turn it off. It pauses while Aiu talks, and on phones when the screen locks. While it is on, the browser\'s speech service (Apple or Google) hears what you say, and your devices check in every 10 seconds.' })
    ];
    // world
    var tzNow = h('p', { cls: 'small' });
    function tzText() {
      return 'Now: ' + U.zoneLabel() + ', ' + U.fmtHm(U.hmStr(), C.setting(a.S, 'clock24', false)) + '. Reminders, day and night follow this. ' +
        ((C.setting(a.S, 'city', null) || {}).tz ? 'Travelling? Pick "this device\'s clock" on the phone you carry.' : 'Find your city above to set it (this device\'s clock is used until then).');
    }
    tzNow.textContent = tzText();
    var city = inp({ value: (C.setting(S, 'city', null) || {}).name || '', placeholder: 'e.g. Grand Rapids, MI  or  43.41, -86.07' }), cm2 = h('p', { cls: 'formmsg' });
    function setPlace(c) {
      a.setSetting('city', c).then(function () { a.updateWeather(true); a.rebuild(true); tzNow.textContent = tzText(); });
      msg(cm2, 'Weather and time for ' + c.name + (c.tz ? ' (' + U.zoneLabel(c.tz) + ')' : '')); city.value = c.name;
    }
    var world = [
      h('div', { cls: 'row' }, city, btn('Find', function () {
        msg(cm2, 'Looking...');
        a.findCity(city.value.trim()).then(setPlace, function (e) { msg(cm2, e.message === 'City not found' ? 'Not in my list of cities. Try a bigger city nearby, your coordinates (like 43.41, -86.07), or Use my location.' : 'Could not look that up.', true); });
      }, 'mini')),
      h('div', { cls: 'row' }, btn('Use my location', function () {
        msg(cm2, 'Asking this device for its location...');
        a.myLocation().then(setPlace, function (e) { msg(cm2, e.message, true); });
      }, 'mini')), cm2,
      h('div', { cls: 'row2' }, field('Units', sel({ F: '°F', C: '°C' }, C.setting(S, 'units', 'F'), function (v) { a.setSetting('units', v).then(function () { a.updateWeather(true); }); })),
        field('Seasons', sel({ north: 'Northern half', south: 'Southern half' }, C.setting(S, 'hemisphere', 'north'), function (v) { a.setSetting('hemisphere', v); }))),
      field('Clock', sel({ '0': '12-hour (6pm)', '1': '24-hour (18:00)' }, C.setting(S, 'clock24', false) ? '1' : '0', function (v) { a.setSetting('clock24', v === '1'); })),
      field('Time zone', sel({ city: 'Use my city\'s time zone', device: 'Use this device\'s clock' }, dev.tzMode === 'device' ? 'device' : 'city', function (v) { devSet('tzMode', v); a.rebuild(true); tzNow.textContent = tzText(); })),
      tzNow,
      h('p', { cls: 'small', text: 'Live weather comes from the US National Weather Service (free, public). Outside the US, Aiu guesses the weather from the season. Only the location is sent. Set it once: all your devices share it.' })
    ];
    // device
    var dn = inp({ value: dev.deviceName, maxLength: 40 });
    dn.addEventListener('change', function () { devSet('deviceName', dn.value.trim() || 'Device'); });
    var device = [
      field('This device\'s name', dn, 'Shown when this device changes something, like "Your iPhone moved your wake-up to 10am".'),
      h('div', { cls: 'row2' }, field('Greet me after I\'m away for', sel([['2', '2 min'], ['10', '10 min'], ['30', '30 min'], ['60', '1 hour']], dev.idleMin, function (v) { devSet('idleMin', +v); })),
        field('Animation', sel([['4', 'Energy saver'], ['8', 'Normal'], ['12', 'Smooth']], dev.fps, function (v) { devSet('fps', +v); }))),
      field('Look', sel({ auto: 'Match my device', light: 'Paper', dark: 'Night' }, dev.theme, function (v) { devSet('theme', v); })),
      field('Text size', sel({ normal: 'Normal', large: 'Large', huge: 'Extra large' }, dev.textSize || 'normal', function (v) { devSet('textSize', v); ui.applyTheme(); }))
    ];
    // plug-and-play AI (optional, this device only)
    var aiU = inp({ value: dev.aiUrl || '', placeholder: 'e.g. http://localhost:11434/v1/chat/completions', 'aria-label': 'AI address' }), aiM = inp({ value: dev.aiModel || '', placeholder: 'model, e.g. llama3.2', 'aria-label': 'AI model' });
    var aiK = inp({ type: 'password', value: dev.aiKey || '', placeholder: 'key (only if it needs one)', 'aria-label': 'AI key' }), aim = h('p', { cls: 'formmsg' });
    var ai = [
      h('p', { cls: 'small', text: 'Optional. Aiu works without any AI model. If you run your own (like Ollama or LM Studio on this computer) or have a service with an OpenAI-style chat address, plug it in here and "Ask my AI" appears on your journal page. Only that page\'s data is sent, only when you tap it, only to this address. The key stays on this device.' }),
      field('Address', aiU), h('div', { cls: 'row2' }, field('Model', aiM), field('Key', aiK)),
      h('div', { cls: 'row wrap' }, btn('Save', function () { devSet('aiUrl', aiU.value.trim()); devSet('aiModel', aiM.value.trim()); devSet('aiKey', aiK.value.trim()); msg(aim, aiU.value.trim() ? 'Saved.' : 'Plug-in AI is off.'); }, 'mini primary'),
        btn('Test', function () { devSet('aiUrl', aiU.value.trim()); devSet('aiModel', aiM.value.trim()); devSet('aiKey', aiK.value.trim()); msg(aim, 'Asking...'); a.askAI('You are a test. Reply with one short friendly sentence.', 'Say hello to Aiu.').then(function (t) { msg(aim, 'It works: ' + t.slice(0, 120)); }, function (e) { msg(aim, e.message, true); }); }, 'mini')),
      aim
    ];
    // data
    var file = h('input', { type: 'file', accept: '.zip,.jsonl,application/zip', cls: 'hidden' }), dm = h('p', { cls: 'formmsg' });
    file.addEventListener('change', function () {
      if (!file.files[0]) return;
      msg(dm, 'Reading...');
      a.importCapsule(file.files[0]).then(function (r) { msg(dm, 'Imported ' + r.added + ' new events (' + (r.total - r.added) + ' were already here).'); }, function (e) { msg(dm, e.message, true); });
      file.value = '';
    });
    var data = [
      h('p', { cls: 'small', text: S.total + ' events' + (S.unsent && !a.prof.local ? ' (' + S.unsent + ' waiting to sync)' : '') + ' · saved in this browser (' + AIU.store.kind + ')' }),
      h('div', { cls: 'row wrap' }, btn('Download capsule (.zip)', function () { a.exportCapsule().then(function (n) { msg(dm, 'Saved ' + n + '. Keep it on your USB drive.'); }); }, 'primary'),
        btn('Import capsule', function () { file.click(); })), file, dm,
      h('p', { cls: 'small', text: 'A capsule is the whole Totem as a folder of plain files (your own copy, e.g. for a USB drive). The server keeps one live copy only. Importing only adds what is missing; nothing is overwritten.' }),
      h('p', { cls: 'small caution', text: a.prof.local ?
        'Caution: this Totem lives only in this browser. Clearing browser data, a private window, or losing the device deletes it. Download a capsule now and then.' :
        'Off-grid caution: anything you do without internet is saved only in this browser until it syncs. Clearing browser data, a private window, uninstalling the app, or losing the device before a sync loses those changes. On iPhone, use the Home Screen app (Safari can clear websites that are not used for 7 days). Heading off-grid for a while? Sync first and save a capsule.' })
    ];
    // developer
    var devbox = h('div', { cls: dev.devtools ? '' : 'hidden' },
      h('p', { cls: 'small', text: 'Test tools. Hatching early and extra growth are recorded in the Totem\'s history.' }),
      h('div', { cls: 'row wrap' }, btn('+50 growth', function () { a.addEvents([{ type: 'dev_growth', data: { n: 50 } }]); }, 'mini'),
        btn('Clear today\'s reminder pop-ups', function () { a.dismissed = {}; a.store.set('dismissed', {}); }, 'mini'),
        btn('Greet me now', function () { a.lastInput = 0; s.remove(); a.wake(false); }, 'mini')),
      h('div', { cls: 'row2' }, field('Weather preview', sel({ '': 'Real weather', clear: 'Clear', cloudy: 'Cloudy', rain: 'Rain', snow: 'Snow', storm: 'Storm', fog: 'Fog' }, dev.weatherPreview, function (v) { devSet('weatherPreview', v); })),
        field('Time preview', sel([['-12', '-12 h'], ['-6', '-6 h'], ['-3', '-3 h'], ['0', 'Now'], ['3', '+3 h'], ['6', '+6 h'], ['9', '+9 h'], ['12', '+12 h']], dev.hourPreview || 0, function (v) { devSet('hourPreview', +v); })))
    );
    var devToggle = btn(dev.devtools ? 'Hide developer tools' : 'Show developer tools', function () { devSet('devtools', !dev.devtools); devbox.classList.toggle('hidden', !dev.devtools); devToggle.textContent = dev.devtools ? 'Hide developer tools' : 'Show developer tools'; }, 'ghost');
    // danger
    var ph = inp({ placeholder: 'type FORGET' }), dm2 = h('p', { cls: 'formmsg' });
    var danger = [
      h('details', null, h('summary', { text: 'Forget this device\'s copy' }),
        h('p', { cls: 'small', text: a.prof.local ? 'This deletes the only copy of this Totem unless you downloaded a capsule. Type FORGET to confirm.' : 'Removes the Totem from this browser only. Your account keeps it' + (S.unsent ? ', except ' + S.unsent + ' changes that have not synced yet' : '') + '. Type FORGET to confirm.' }),
        ph, dm2, btn('Forget this device\'s copy', function () { if (ph.value.trim() !== 'FORGET') return msg(dm2, 'Type FORGET exactly.', true); s.remove(); a.forgetDevice(); }, 'danger'))
    ];
    if (!a.prof.local) {
      var dpw = inp({ type: 'password', placeholder: 'password' }), dph = inp({ placeholder: 'DELETE ' + a.prof.u.toUpperCase() }), dm3 = h('p', { cls: 'formmsg' });
      danger.push(h('details', null, h('summary', { text: 'Delete my account' }),
        h('p', { cls: 'small', text: 'Permanently deletes your account and ' + S.totemName + ' from the server (there are no server backups). Download a capsule first if you want to keep a copy. Type DELETE ' + a.prof.u.toUpperCase() + ' to confirm.' }),
        dpw, dph, dm3, btn('Delete my account', function () {
          a.api('delete_account', { u: a.prof.u, token: a.prof.token, pw: dpw.value, phrase: dph.value.trim() }).then(function () { s.remove(); a.forgetDevice(); }, function (e) { msg(dm3, e.message, true); });
        }, 'danger')));
    }
    s = sheet('Settings', [
      section('Account', acct), section(S.totemName, totem), section('Voice & listening', voice), section('Reminders', rem), section('Weather & time', world),
      section('This device', device), section('Plug-in AI (optional)', ai), section('Your data', data), section('Developer', [devToggle, devbox]), section('Danger zone', danger),
      section('About', [h('p', { cls: 'small', text: 'Aiu Totem ' + a.cfg.version + ' by KODNA. Free for personal, private use in your web browser: nothing is sold, no ads, and your Totem is only yours.' }),
        h('p', { cls: 'small', text: 'Everything in Aiu is made by KODNA or is public domain: our own pixel fonts, creatures, world and word lists; the butler\'s full dictionary is Webster\'s 1913 Unabridged (public domain); live weather is from the US National Weather Service (public domain). Colors: the Sweetie 16 palette.' }),
        h('p', { cls: 'small', text: 'Aiu is a little companion, not a counselor or a doctor. If you are ever in crisis, contact your local crisis hotline or emergency number (in the US, call or text 988). Please be safe.' })])
    ]);
  };
})();
