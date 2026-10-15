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
  function logo() { var eg = eggCanvas(U.hash32('aiu' + Date.now() % 17), 5); eg.classList.add('rainbow'); return h('div', { cls: 'logo' }, eg, h('h1', { text: 'AIU TOTEM' })); } // 1.1.0: the login egg fades through colors

  /* ---------- welcome & accounts ---------- */
  ui.welcome = function () {
    var P = app().profiles, others = Object.keys(P).filter(function (k) { return (P[k].token || P[k].local) && !P[k].linkedTo; });
    screen([
      logo(),
      h('p', { cls: 'lead', text: 'Raise a little pixel companion. It hatches from an egg and grows from your journal, quests and plans, keeps you on track, and remembers.' }),
      (window.AIU_CONFIG || {}).demo ? h('p', { cls: 'note', text: 'Demo: there is no server here, so Log in and Sign up won\'t connect. Tap "Try it on this device only" below. Everything stays in this browser.' }) : null,
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
      h('p', { text: 'Give it a name and tap Begin to crack it open. Write in your journal, check off your quests, and it will grow up knowing you.' }),
      field('Name your egg', n), field('What should it call you?', me), m, go]);
  };
  ui.loading = function (text) { ui.bar(text, null, true); }; // a small note at the top, not a screen
  ui.cantReach = function () {
    screen([logo(), h('h2', { text: 'Can\'t reach the server' }), h('p', { text: 'This device does not have your Totem yet, and the server did not answer. Check your connection and try again.' }),
      h('p', { cls: 'small', text: app().sync.err || '' }),
      btn('Try again', function () { app().openProfile(app().pid); }, 'primary'), btn('Log out', function () { app().logout(); }, 'ghost')]);
  };
  ui.fatal = function (err) { window.AIU_STARTED = true; ui.bar('Something went wrong: ' + String(err && err.message || err), [['Reload', function () { location.reload(); }]], true); };

  /* ---------- main screen (1.1.0): Aiu's world + one work panel, full screen, no page scrolling ----------
     Wide screens and turned phones: the menu runs down the side, Aiu's world in the middle, the panel on the right.
     Phones held upright: Aiu on top, the menu under it, and the panel fills the rest. Only the panel scrolls. */
  var els = {};
  var TABS = [['quests', 'Quests'], ['planner', 'Planner'], ['finance', 'Finance'], ['journal', 'Journal'], ['accounts', 'Accounts']]; // 1.1.0i: five menus, right under Aiu
  var ICONS = {
    talk: ['0 0 8 8', 'M0 1h8v5H3L1 8V6H0zM2 3v1h1V3zM4 3v1h1V3zM6 3v1h1V3z'],
    quests: ['0 0 8 8', 'M0 0h2v2H0zM3 0h5v2H3zM0 3h2v2H0zM3 3h5v2H3zM0 6h2v2H0zM3 6h5v2H3z'],
    planner: ['0 0 8 8', 'M2 0h1v1h2V0h1v1h2v7H0V1h2zM1 3v4h6V3zM2 4h2v2H2z'],
    library: ['0 0 8 8', 'M0 1h3v1h2V1h3v6H5v1H3V7H0zM1 2v4h2V2zM5 2v4h2V2z'],
    journal: ['0 0 8 8', 'M0 1h3v1h2V1h3v6H5v1H3V7H0zM1 2v4h2V2zM5 2v4h2V2z'],
    iching: ['0 0 8 11', 'M0 0h8v1H0zM0 2h3v1H0zM5 2h3v1H5zM0 4h8v1H0zM0 6h8v1H0zM0 8h3v1H0zM5 8h3v1H5zM0 10h8v1H0z'],
    accounts: ['0 0 8 8', 'M2 0h4v1h1v3H6V1H2v3H1V1h1zM0 4h8v4H0zM3 5v2h2V5z'],
    finance: ['0 0 8 8', 'M2 0h4v1h1v1h1v4H7v1H6v1H2V7H1V6H0V2h1V1h1zM3 2v4h2V2z']
  };
  /* 1.1.0i: no emoji anywhere. Little pixel-art icons instead (drawn as SVG, so they stay crisp at any text size). */
  var PIXC = { k: '#1a1c2c', r: '#b13e53', P: '#f5a3b5', o: '#ef7d57', y: '#ffcd75', l: '#a7f070', g: '#38b764', t: '#257179', n: '#29366f', b: '#3b5dc9', i: '#41a6f6', c: '#73eff7', w: '#f4f4f4', s: '#94b0c2', S: '#566c86', d: '#333c57', W: '#a0673e', B: '#6b3f2a', a: '#f2d59a', p: '#5d275d' };
  var PIX = {
    heart: ['.rr.rr.', 'rPrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'],
    star: ['...y...', '..yyy..', 'yyyyyyy', '.yyyyy.', '..yyy..', '.yy.yy.', 'yy...yy'],
    check: ['......g', '.....gg', 'g...gg.', 'gg.gg..', '.ggg...', '..g....'],
    book: ['kkkk.kkkk', 'kwwwkwwwk', 'kwSSkSSwk', 'kwwwkwwwk', 'kwSSkSSwk', 'kwwwkwwwk', 'kkkkkkkkk'],
    leaf: ['.....gg', '...gggg', '..ggglg', '.gglgg.', '.glgg..', 'g.gg...', 'g......'],
    bolt: ['...yy', '..yy.', '.yyyy', '..yy.', '.yy..', 'yy...'],
    cloud: ['..ss...', '.sssss.', 'sssssss', '.sssss.', '..i.i..', '.i.i...'],
    coin: ['.yyy.', 'yyoyy', 'yoyoy', 'yyoyy', '.yyy.'],
    clock: ['..kkk..', '.kwwwk.', 'kwwkwwk', 'kwwkkwk', 'kwwwwwk', '.kwwwk.', '..kkk..'],
    board: ['.WkkW.', 'WwwwwW', 'WwkkwW', 'WwwwwW', 'WwkkwW', 'WwwwwW', 'WWWWWW'],
    sparkle: ['...y...', '..yyy..', 'yyywyyy', '..yyy..', '...y...'],
    egg: ['..www..', '.wwwww.', 'wwiwwww', 'wwwwwiw', 'wwwwwww', '.wwwww.'],
    flag: ['krrrr..', 'krrrrr.', 'krrrr..', 'k......', 'k......', 'k......'],
    calendar: ['krkkkrk', 'kkkkkkk', 'kwwwwwk', 'kwkwkwk', 'kwwwwwk', 'kwkwkrk', 'kkkkkkk'],
    cart: ['k......', 'kkkkkkk', '.kwwwk.', '.kwwwk.', '.kkkkk.', '..k.k..'],
    list: ['kk.kkkk', '.......', 'kk.kkkk', '.......', 'kk.kkkk'],
    paw: ['..W.W..', 'W.....W', '..WWW..', '.WWWWW.', '.WW.WW.'],
    moon: ['..yyy..', '.yy....', 'yy.....', 'yy.....', 'yy.....', '.yy....', '..yyy..'],
    signal: ['......i', '....i.i', '..i.i.i', 'i.i.i.i'],
    yin: ['kkkkkkk', '.......', 'kk...kk', '.......', 'kkkkkkk', '.......', 'kk...kk'],
    bulb: ['..yyy..', '.yyyyy.', '.yywyy.', '.yyyyy.', '..yyy..', '..sss..', '..sss..'],
    no: ['.rrrrr.', 'r....rr', 'r...r.r', 'r..r..r', 'r.r...r', 'rr....r', '.rrrrr.'],
    ask: ['.bbbb.', 'bb..bb', '....bb', '...bb.', '..bb..', '......', '..bb..'],
    mic: ['..kk..', '.kSSk.', '.kSSk.', '.kSSk.', 'k.kk.k', '.kkkk.', '..kk..'],
    happy: ['.yyyyy.', 'yyyyyyy', 'yykykyy', 'yyyyyyy', 'ykyyyky', 'yykkkyy', '.yyyyy.'],
    frazzled: ['.yyyyy.', 'yyyyyyy', 'yykykyy', 'yyyyyyy', 'yykkkyy', 'ykyyyky', '.yyyyy.'],
    grumpy: ['.ooooo.', 'okoooko', 'ookokoo', 'ooooooo', 'ookkkoo', 'okoooko', '.ooooo.'],
    sun: ['y..y..y', '.yyyyy.', '.yyyyy.', 'yyyyyyy', '.yyyyy.', '.yyyyy.', 'y..y..y'],
    pen: ['.....kk', '....kyk', '...kyk.', '..kyk..', '.kyk...', 'kkk....', 'k......'],
    person: ['..kkk..', '..kak..', '..kkk..', '.kkkkk.', 'k.kkk.k', '..k.k..', '..k.k..']
  };
  ui.pix = function (name, cls) {
    var rows = PIX[name] || PIX.star, w = 0, paths = {};
    rows.forEach(function (r, y) { w = Math.max(w, r.length); for (var x = 0; x < r.length; x++) { var c = r.charAt(x); if (c !== '.') paths[c] = (paths[c] || '') + 'M' + x + ' ' + y + 'h1v1h-1z'; } });
    var sz = Math.max(w, rows.length), svg = '<svg viewBox="' + ((w - sz) / 2) + ' ' + ((rows.length - sz) / 2) + ' ' + sz + ' ' + sz + '" shape-rendering="crispEdges" aria-hidden="true">' + Object.keys(paths).map(function (c) { return '<path fill="' + PIXC[c] + '" d="' + paths[c] + '"/>'; }).join('') + '</svg>';
    var sp = h('span', { cls: 'pix' + (cls ? ' ' + cls : '') }); sp.innerHTML = svg; return sp;
  };
  function icon(k) { var d = ICONS[k]; return '<svg viewBox="' + d[0] + '" width="22" height="22" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="' + d[1] + '"/></svg>'; }
  ui.canvas = function () { return ui.onMain ? els.canvas : null; };
  ui.main = function () {
    var a = app();
    started();
    ui.onMain = true;
    var r = clear(root());
    document.documentElement.classList.remove('fullapp'); document.documentElement.classList.add('page3'); // 1.1.0 final: one page that scrolls like a website
    els.name = h('span', { cls: 'tname' }); els.stage = h('span', { cls: 'badge' });
    els.sync = h('button', { type: 'button', cls: 'pill', onclick: onPill });
    var gear = h('button', { type: 'button', cls: 'gear', 'aria-label': 'Settings', title: 'Settings', onclick: ui.settings });
    els.mute = h('button', { type: 'button', cls: 'gear mute', onclick: function () { a.setMute(!a.dev.mute); if (!a.dev.mute) { a.beep('chirp'); a.speak('Sound on!'); } ui.renderPanel(false); } });
    gear.innerHTML = '<svg viewBox="0 0 8 8" width="20" height="20" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M3 0h2v1h1v1h1v1h1v2H7v1H6v1H5v1H3V7H2V6H1V5H0V3h1V2h1V1h1zM3 3v2h2V3z"/></svg>';
    // tap Aiu = pet Aiu (hearts, a happy hop, and a tiny bit of growth)
    els.canvas = h('canvas', { width: A.W, height: A.H, cls: 'scene', role: 'button', tabindex: '0', 'aria-label': 'Pet ' + a.S.totemName, onclick: function () { a.pet(); },
      onkeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); a.pet(); } } });
    els.btext = h('span', { cls: 'btext' });
    els.bubble = h('div', { cls: 'emofloat', 'aria-live': 'polite' }, els.btext); // one emoji over Aiu's head
    els.fx = h('div', { cls: 'fx', 'aria-hidden': 'true' });
    els.nudge = h('div', { cls: 'nudge', hidden: true });
    els.zoom = h('button', { type: 'button', cls: 'zoom', 'aria-label': 'Close-up view', title: 'Close-up / whole world', onclick: function () { a.dev.zoom = !a.dev.zoom; a.saveDev(); els.zoom.textContent = a.dev.zoom ? '-' : '+'; } });
    els.zoom.textContent = a.dev.zoom ? '-' : '+';
    els.status = h('div', { cls: 'status sr' }); // for screen readers (what Aiu is doing)
    els.track = h('button', { type: 'button', cls: 'trackline', hidden: true });
    // Aiu's two meters live in his scene: growth (heart) and Go/Brake (GABA)
    els.bar = h('div', { cls: 'bar' }, h('i', { cls: 'conf' }), h('i', { cls: 'pend' }));
    els.glabel = h('span', { cls: 'sr' });
    els.gbar = h('div', { cls: 'gbar' }, h('i'));
    els.gglabel = h('span', { cls: 'sr' });
    var mGrow = h('button', { type: 'button', cls: 'smeter grow', onclick: function () { growthSheet(); } }, h('span', { cls: 'sico' }, ui.pix('heart')), els.bar, els.glabel);
    var mGaba = h('button', { type: 'button', cls: 'smeter gaba', onclick: function () { AIU.panels.state.selfSub = 'gaba'; AIU.panels.state.jday = null; ui.go('journal', 'me'); } }, h('span', { cls: 'sico', text: 'G' }), els.gbar, els.gglabel);
    els.mGrow = mGrow; els.mGaba = mGaba;
    els.banner = h('div', { cls: 'banner' });
    els.ptitle = h('h2', { cls: 'ptitle' });
    els.pacts = h('div', { cls: 'pacts' });
    els.psub = h('div', { cls: 'psub', role: 'tablist', 'aria-label': 'Pages in this menu' });
    els.panel = h('div', { cls: 'pbody', role: 'tabpanel', tabindex: '-1' });
    els.pfoot = h('div', { cls: 'pfoot' });
    if (ui.tab === 'library') ui.tab = 'journal';
    if (!TABS.some(function (t) { return t[0] === ui.tab; })) ui.tab = 'quests';
    // 1.1.0i layout, top to bottom: name and status, Aiu's world, the five menus, the control panel (Aiu's update + this menu's pages), the work area
    els.tabs = h('nav', { cls: 'menu5', role: 'tablist', 'aria-label': 'Menu' }, TABS.map(function (t) {
      var b = h('button', { type: 'button', role: 'tab', 'data-tab': t[0], onclick: function () { ui.go(t[0]); } });
      b.innerHTML = icon(t[0]); b.appendChild(h('span', { text: t[1] }));
      return b;
    }));
    els.toast = h('div', { cls: 'toast', role: 'alert' });
    els.cpanel = h('section', { cls: 'cpanel', 'aria-label': a.S.totemName + '\'s updates' }, els.nudge, els.banner, els.psub);
    els.world = h('section', { cls: 'world', 'aria-label': a.S.totemName }, h('div', { cls: 'stage' }, els.canvas, els.fx, els.bubble, h('div', { cls: 'smeters' }, mGrow, mGaba), els.zoom),
      els.status, els.tabs, els.cpanel);
    els.panel2 = h('section', { cls: 'panel2' }, h('div', { cls: 'phead' }, els.ptitle, els.pacts), els.panel, els.pfoot);
    var firstMain = !document.querySelector('.app2');
    r.appendChild(h('div', { cls: 'app2' },
      h('header', { cls: 'top' }, h('div', { cls: 'ttl' }, els.name, els.stage), els.sync, els.mute, gear),
      h('div', { cls: 'body2' }, els.world, els.panel2)));
    r.appendChild(els.toast);
    if (firstMain) window.scrollTo(0, 0); // start at the top, where Aiu (or the egg) is
    markTabs();
    renderPanel(true);
    ui.refresh(true);
    ui.refreshSync();
    ui.refreshVoice();
    if (a.ears.on) a.ears.stop(); // 1.1.0 final: the microphone is only for dictating a journal entry
    clearInterval(ui.boardTimer); ui.boardTimer = setInterval(function () { if (ui.onMain && !document.hidden) ui.refreshBoard(); }, 60000); // the board follows the clock
    setTimeout(function () { a.rebuild(); }, 600); // plays any hatch / evolution that happened while away
  };
  // bring the top of the work area into view (after opening a page inside a menu)
  ui.toPanel = function () { if (!els.panel2) return; var top = els.panel2.getBoundingClientRect().top + window.scrollY - 6; if (Math.abs(window.scrollY - top) > 4 && window.scrollY > top - window.innerHeight * 0.5) window.scrollTo(0, top); };
  function growthSheet() {
    var a = app(), S = a.S, g = S.growth;
    if (!S.hatched) return sheet('Your egg', [h('p', { text: els.glabel.textContent })]);
    var span = Math.max(1, g.stageNext - g.stageFloor), have = Math.max(0, g.confirmed - g.stageFloor);
    sheet(S.totemName + '\'s growth', [
      h('div', { cls: 'bar big' }, h('i', { cls: 'conf', style: 'width:' + Math.min(100, have / span * 100) + '%' })),
      h('p', { text: Math.floor(Math.min(have, span)) + ' of ' + span + ' to evolve into a ' + C.stageName(S.stage + 1) + '.' + (g.pending >= 1 ? ' (+' + Math.floor(g.pending) + ' counts at the next sync.)' : '') }),
      h('p', { text: 'Today: ' + Math.floor(g.today) + ' of ' + g.cap + '.' }),
      h('h3', { text: 'What helps ' + S.totemName + ' grow' }),
      h('ul', null, h('li', { text: 'A journal entry of 80+ letters: +10' }), h('li', { text: 'A quest step done: +2' }), h('li', { text: 'A calm thing (GABA): +2' }),
        h('li', { text: 'Answering one of ' + S.totemName + '\'s suggestions: +2' }), h('li', { text: 'Petting: +1 for every 10 pets (up to 3 a day)' })),
      h('p', { cls: 'small', text: 'The day wears on ' + S.totemName + ': the Go/Brake bar slides toward Go a little every hour. In the red, he\'s stressed and grows at only a quarter speed, until you do something calm (a walk, a shower, brushing your teeth, a glass of water). Calm things always count in full.' })]);
  }
  // Go to a menu (and optionally one of its sub-pages)
  ui.sub = {};
  ui.go = function (tab, sub) {
    if (tab === 'library' || tab === 'talk') tab = 'journal';
    if (tab === 'journal' && ui.tab === 'journal' && !sub && AIU.panels) { AIU.panels.state.jday = null; AIU.panels.state.jview = null; }
    if (ui.tab === 'accounts' && tab !== 'accounts' && AIU.panels && AIU.panels.lockVault) AIU.panels.lockVault(true);
    if (tab === 'quests' && ui.tab === 'quests' && !sub) ui.questOpen = null;
    ui.tab = tab; if (sub) ui.sub[tab] = sub;
    renderPanel(true); markTabs(); ui.refresh();
    if (els.tabs) { var hd = document.querySelector('.app2 .top'), top = els.tabs.getBoundingClientRect().top + window.scrollY - (hd && getComputedStyle(hd).position === 'sticky' ? hd.offsetHeight : 0) - 6; if (window.scrollY > top) window.scrollTo(0, top); }
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
    els.stage.textContent = C.stageName(S.stage) + (S.hatched && AIU.art.kindName ? ' · ' + AIU.art.kindName(S.accentSeed, C.setting(S, 'ckind', 'auto')) : '') + (S.hatched && C.setting(S, 'skin', 'current') !== 'current' && S.skinForm !== S.form ? ' · old look' : '');
    els.stage.title = S.skinForm !== S.form ? 'Wearing the Stage ' + (S.skinForm && S.skinForm.stage) + ' look. Change it in Journal > notebook > Time capsules.' : '';
    var sc = a.sceneState(), w = sc.weatherInfo, wtxt = w.source === 'guess' ? '' : ' · ' + w.label + (w.temp !== undefined ? ' ' + w.temp + '°' + w.units : '') + (w.stale && w.source === 'live' ? ' (' + w.ago + ')' : '');
    if (a.hatching) els.status.textContent = 'The egg is cracking!';
    else if (!S.hatched) els.status.textContent = (sc.eggProgress > 0.9 ? 'The egg is cracking!' : 'Hatches in ' + a.fmtDur(S.hatchAt - a.trueNow())) + wtxt;
    else els.status.textContent = S.totemName + ' is ' + sc.actLabel + (sc.indoor && sc.place === 'home' && sc.act !== 'sleep' ? ' inside' : '') + wtxt;
    if (els.canvas) els.canvas.setAttribute('aria-label', 'Pet ' + S.totemName + '. ' + els.status.textContent);
    // growth bar
    var g = S.growth, conf = els.bar.children[0], pend = els.bar.children[1];
    if (!S.hatched) {
      conf.style.width = Math.round(sc.eggProgress * 100) + '%'; pend.style.width = '0';
      els.glabel.textContent = 'Egg · growth ' + Math.floor(g.confirmed + g.pending);
    } else {
      var span = Math.max(1, g.stageNext - g.stageFloor), have = Math.max(0, g.confirmed - g.stageFloor);
      conf.style.width = Math.min(100, have / span * 100) + '%';
      pend.style.width = Math.max(0, Math.min(100 - have / span * 100, g.pending / span * 100)) + '%';
      els.glabel.textContent = 'Growth ' + Math.floor(Math.min(have, span)) + '/' + span + ' to ' + C.stageName(S.stage + 1) + (g.pending >= 1 ? ' (+' + Math.floor(g.pending) + ' at sync)' : '') + ' · today ' + Math.floor(g.today) + '/' + g.cap;
    }
    els.mGrow.setAttribute('aria-label', els.glabel.textContent + '. What helps it grow.'); els.mGrow.title = els.glabel.textContent;
    // GABA (Go / Brake) bar
    if (AIU.gaba) {
      var today = U.dayStr(new Date(a.trueNow())), gv = AIU.gaba.bar(S, today), lv = AIU.gaba.level(S);
      els.gbar.firstChild.style.left = gv + '%';
      els.gbar.setAttribute('aria-label', 'Go / Brake bar ' + gv + ' of 100');
      els.gglabel.textContent = 'Go/Brake ' + gv + ' · ' + AIU.gaba.state(gv) + ' · Lv ' + lv.n + ' ' + lv.name;
      els.mGaba.setAttribute('aria-label', els.gglabel.textContent + '. Open GABA.'); els.mGaba.title = els.gglabel.textContent;
      els.mGaba.classList.toggle('red', gv < AIU.gaba.RED); els.mGrow.classList.toggle('red', gv < AIU.gaba.RED);
    }
    gabaNudge(a, S);
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
    else if (g.full) b = 'Growth bar full! Sync to evolve.';
    else if (g.readyAtSync) b = a.prof.local ? '' : (a.sync.state === 'ok' ? 'Evolving...' : 'Ready to evolve! Get online and sync.');
    else if (offgrid && S.unsent) { b = 'Off-grid: ' + S.unsent + ' change' + (S.unsent === 1 ? ' is' : 's are') + ' only on this device until you sync.'; act = ['Save capsule', function () { a.exportCapsule(); }]; }
    clear(els.banner);
    if (b) { els.banner.appendChild(h('span', { text: b })); if (act) els.banner.appendChild(btn(act[0], act[1], 'mini')); }
    els.banner.style.display = b ? '' : 'none';
    if (force || lastVersion !== a.version) { lastVersion = a.version; renderPanel(false); }
  };
  ui.refreshSync = function () { updatePill(); ui.refresh(); };
  /* ---------- Aiu's board: the bar under Aiu is never empty ----------
     It shows the most important thing right now (bills, what's coming up today, a GABA brake, Aiu's suggestion, your quest,
     a to-do, today's journal entry) with one button to act on it, and "Next" to see what else is waiting. */
  ui.boardIx = 0;
  function boardItems(a, S) {
    var out = [], now = a.trueNow(), d = U.dayStr(new Date(now)), wall = U.wall(new Date(now)), nowHM = U.p2(wall.getHours()) + ':' + U.p2(wall.getMinutes()), PL = AIU.planner, G = AIU.gaba, PN = AIU.panels;
    var c24 = C.setting(S, 'clock24', false);
    if (!S.hatched) return [{ k: 'egg', icon: 'egg', text: 'Your egg is warming up. Write in your journal and check off quests while you wait.', acts: [['Write', function () { ui.journalSheet(); }]] }];
    // 0. Aiu is stressed (Go/Brake in the red): growth is stunted until you do something calm
    if (G && a.dev.gabaCoach !== false && G.stressed(S, d)) {
      var sg = G.goals(S, d).filter(function (g) { return !g.done; })[0], sf = sg ? G.find(sg.label) : null;
      out.push({ k: 'stress' + d, icon: 'grumpy', text: S.totemName + ' is stressed (Go/Brake ' + G.bar(S, d) + ') and growing at only a quarter speed. Something calm helps you both' + (sg ? ': ' + sg.label.replace(/\s*\(.*\)$/, '').toLowerCase() + '?' : '.'),
        acts: (sg ? [['I did it', function () { a.logGaba('calm', sg.label, sf ? sf.pts : 8); }]] : []).concat([['Ideas', function () { AIU.panels.state.selfSub = 'gaba'; AIU.panels.state.jday = null; ui.go('journal', 'me'); ui.toPanel(); }]]) });
    }
    // 1. bills
    if (PL) PL.billsDue(S, d, 3).forEach(function (bd) {
      out.push({ k: 'bill:' + bd.p.key + bd.day, icon: 'calendar', text: bd.p.title + (bd.p.amount ? ' ' + PL.money(bd.p.amount) : '') + (bd.late ? ' is past due (' + U.fmtDay(bd.day) + ')' : bd.day === d ? ' is due today' : ' is due ' + U.fmtDay(bd.day)) + '.',
        acts: [['Paid', function () { a.addEvents([{ type: 'plan_paid', data: { key: bd.p.key, period: PL.period(bd.p, bd.day), paid: true } }]); }]] });
    });
    // 2. today: reminders, events and the I Ching cast still to come (or just missed)
    if (PL) PL.dayItems(S, d).forEach(function (it) {
      if (it.done || it.kind === 'income' || it.kind === 'expense' || it.kind === 'bill') return;
      var late = it.time && it.time < nowHM, soon = !it.time || it.time >= nowHM;
      if (late && it.src !== 'iching' && U.hmToMin(nowHM) - U.hmToMin(it.time) > 120) return;
      var when = it.time ? (late ? 'was at ' : 'at ') + U.fmtHm(it.time, c24) : 'today';
      if (it.src === 'iching') { if (!(S.reviews || {})[d] && (late || soon)) out.push({ k: 'iching' + d, icon: 'yin', text: 'Today\'s I Ching reading ' + (late ? 'is ready to cast.' : 'is ' + when + '.'), acts: [['Cast now', function () { a.castReading(true); }]] }); return; }
      out.push({ k: 'day:' + it.key, icon: it.src === 'task' ? 'clock' : 'calendar', text: it.title + ' ' + when + '.', acts: [['Done', function () {
        if (it.src === 'task') a.addEvents([{ type: 'task_done', data: { key: it.key, date: d } }]);
        else a.addEvents([{ type: 'plan_paid', data: { key: it.p.key, period: PL.period(it.p, d), paid: true } }]);
      }]] });
    });
    // 3. a GABA brake when the bar leans Go (or nothing calm happened yet, after 10 am)
    if (G && a.dev.gabaCoach !== false && (a.local.nudgeSnooze || 0) < now) {
      var v = G.bar(S, d), calm = G.day(S, d).some(function (g) { return g.kind === 'calm'; }), goal = G.goals(S, d).filter(function (g) { return !g.done; })[0];
      if (goal && !G.stressed(S, d) && (v < 45 || (!calm && wall.getHours() >= 10))) {
        var f = G.find(goal.label), pts = f ? f.pts : 8;
        out.push({ k: 'gaba:' + goal.label, icon: 'frazzled', text: S.totemName + ' is a little frazzled. Side quest: ' + goal.label.replace(/\s*\(.*\)$/, '').toLowerCase() + '? (Good for your GABA.)', gaba: true,
          acts: [['I did it', function () { a.logGaba('calm', goal.label, pts); }], ['Later', function () { a.local.nudgeSnooze = a.trueNow() + 3 * 3600000; a.saveLocal(); ui.refresh(); }]] });
      }
    }
    // 4. Aiu's suggestion (a quest offer or a getting-to-know-you question), one every couple of minutes at most
    var wait = Math.max((a.local.q21At || 0) + 120000, a.local.q21Snooze || 0) - now;
    if (PN && PN.q21Next && PN.q21Today(S) < 21 && wait <= 0) { var x = PN.q21Next(S); if (x) out.push({ k: 'q:' + x.q.id, node: function () { return PN.q21Card(x, function () { ui.refresh(); }, true); } }); }
    else if (wait > 0 && wait < 3 * 3600000) { clearTimeout(q21Timer); q21Timer = setTimeout(function () { ui.refresh(); }, wait + 500); }
    // 5. the quest you're tracking: its next step
    var tq = C.tracked(S), ns = tq ? C.nextStep(S, tq) : null;
    if (tq && ns) out.push({ k: 'quest:' + tq.key + ns.id, icon: 'flag', text: 'Quest "' + tq.title + '": ' + ns.title.replace(/\s*\(.*\)$/, '') + '.',
      acts: /^starter-/.test(tq.key) ? [['Open', function () { ui.openQuest(tq.key); ui.toPanel(); }]] : [['Done', function () { a.addEvents([{ type: 'quest_step', data: { key: tq.key, step: ns.id, done: true } }]); }], ['Open', function () { ui.openQuest(tq.key); ui.toPanel(); }]] });
    // 6. a to-do
    var td = C.listItems(S, 'to-do').filter(function (x) { return !x.done && !/^example:/i.test(x.item); })[0];
    if (td) out.push({ k: 'todo:' + td.item, icon: 'check', text: 'To-do: ' + td.item, acts: [['Done', function () { a.addEvents([{ type: 'list_check', data: { list: 'to-do', item: td.item, done: true } }]); }]] });
    // 7. today's journal entry
    if (!(S.journal || []).some(function (e) { return e.d === d; })) out.push({ k: 'journal' + d, icon: 'book', text: 'No journal entry yet today. A few sentences helps ' + S.totemName + ' grow the most.', acts: [['Write', function () { ui.journalSheet(); }]] });
    // 8. there's always something: a few standing bounties, a different mix each hour
    var EVER = [
      { k: 'e-pet', icon: 'paw', text: 'Pet ' + S.totemName + '! Every 10 pets = +1 growth.', acts: [['Pet', function () { a.pet(); }]] },
      { k: 'e-shop', icon: 'cart', text: 'Anything to add to your shopping list?', acts: [['Open', function () { PN.state.listFocus = 'shopping'; ui.go('quests', 'lists'); ui.toPanel(); }]] },
      { k: 'e-plan', icon: 'calendar', text: 'Plan tomorrow: add an event or a reminder.', acts: [['Open', function () { ui.go('planner'); ui.toPanel(); }]] },
      { k: 'e-money', icon: 'coin', text: 'Log any money in or out today?', acts: [['Open', function () { ui.go('finance'); ui.toPanel(); }]] },
      { k: 'e-calm', icon: 'leaf', text: 'Log something calm you did (GABA).', acts: [['Open', function () { PN.state.selfSub = 'gaba'; PN.state.jday = null; ui.go('journal', 'me'); ui.toPanel(); }]] },
      { k: 'e-quest', icon: 'flag', text: 'Start a quest of your own: something you want to get done.', acts: [['Open', function () { ui.go('quests', 'big'); ui.toPanel(); }]] },
      { k: 'e-look', icon: 'book', text: 'Read back an older day in your journal.', acts: [['Open', function () { PN.state.jday = null; ui.go('journal', 'pages'); ui.toPanel(); }]] },
      { k: 'e-entry', icon: 'pen', text: 'Add another journal entry: what happened since the last one?', acts: [['Write', function () { ui.journalSheet(); }]] }
    ];
    var hr = Math.floor(now / 3600000);
    for (var e = 0; e < 3; e++) out.push(EVER[(hr + e * 3) % EVER.length]);
    return out;
  }
  var q21Timer = null, boardSig = '';
  function gabaNudge(a, S) {
    var n = els.nudge; if (!n) return;
    var items = boardItems(a, S), keys = items.map(function (x) { return x.k; });
    var curK = ui.boardKey, ix = curK ? keys.indexOf(curK) : -1;
    if (ix < 0) ix = Math.min(ui.boardIx || 0, items.length - 1);
    if (ix < 0) ix = 0;
    var it = items[ix]; ui.boardIx = ix; ui.boardKey = it.k;
    var sig = keys.join('|') + '#' + ix;
    if (sig === boardSig && !n.hidden) return;
    boardSig = sig; clear(n); n.hidden = false;
    var body;
    if (it.node) body = it.node();
    else body = h('div', { cls: 'q21card compact' }, h('div', { cls: 'q21q' }, h('span', { cls: 'nicon', 'aria-hidden': 'true' }, ui.pix(it.icon)), ' ', it.text),
      h('div', { cls: 'row wrap' }, (it.acts || []).map(function (ac, i) { return btn(ac[0], function () { ui.boardKey = null; ac[1](); setTimeout(function () { ui.refresh(); }, 150); }, i === 0 ? 'primary' : ''); })));
    n.appendChild(body);
    if (items.length > 1) {
      var nx = btn('Next ›', function () { ui.boardIx = (ix + 1) % items.length; ui.boardKey = items[ui.boardIx].k; boardSig = ''; gabaNudge(a, S); }, 'nextb');
      nx.setAttribute('aria-label', 'Next thing (' + (ix + 1) + ' of ' + items.length + ')');
      n.appendChild(h('div', { cls: 'bnav' }, h('span', { cls: 'small bcount' }, ui.pix('board'), ' ' + (ix + 1) + '/' + items.length), nx));
    }
    if (it.gaba && (!a.local.nudgeSaid || a.trueNow() - a.local.nudgeSaid > 3 * 3600000)) { a.local.nudgeSaid = a.trueNow(); a.saveLocal(); setTimeout(function () { a.react('gaba'); }, 800); }
  }
  ui.refreshBoard = function () { boardSig = ''; if (app().S) gabaNudge(app(), app().S); };
  ui.boardRestart = function () { ui.boardIx = 0; ui.boardKey = null; ui.refreshBoard(); if (els.nudge) { els.nudge.classList.remove('flash'); void els.nudge.offsetWidth; els.nudge.classList.add('flash'); } };
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
  ui.bubble = function (iconName, label) { // one pixel icon pops up over Aiu's head (1.1.0i: no emoji)
    if (!ui.onMain || !els.bubble) return;
    if ((app().dev.bubble || 'short') === 'off') return;
    var p = actorPct();
    clear(els.btext); els.btext.appendChild(ui.pix(iconName));
    els.bubble.setAttribute('aria-label', label || '');
    els.bubble.style.left = p.x + '%'; els.bubble.style.top = p.y + '%';
    els.bubble.classList.remove('show'); void els.bubble.offsetWidth; els.bubble.classList.add('show');
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(function () { els.bubble.classList.remove('show'); }, 2600);
  };

  // Where Aiu is in the picture (percent), for hearts and emoji
  function actorPct() {
    var a = app(), sc = a.sceneState(), pos = A.actorPos(sc);
    if (a.dev.zoom) return { x: 50, y: 26 };
    return { x: Math.round(pos.x / A.W * 100), y: Math.max(4, Math.round((pos.y - 34) / A.H * 100)) };
  }
  ui.hearts = function (n) {
    if (!els.fx) return; var p = actorPct();
    for (var i = 0; i < (n || 3); i++) (function (i) {
      var e = h('span', { cls: 'heart', style: 'left:calc(' + p.x + '% + ' + ((i - 1) * 16) + 'px);top:' + (p.y + 8) + '%;animation-delay:' + (i * 120) + 'ms' });
      e.appendChild(ui.pix('heart')); els.fx.appendChild(e); setTimeout(function () { e.remove(); }, 1400 + i * 120);
    })(i);
  };
  /* ---------- voice and ears ---------- */
  ui.refreshEars = function () {
    var a = app(); if (!els.mic) return;
    var st = a.ears.on ? a.ears.state : 'off', talking = a.isTalking && a.isTalking();
    els.mic.classList.toggle('on', a.ears.on);
    els.mic.classList.toggle('talking', !!talking);
    els.mic.setAttribute('aria-pressed', a.ears.on ? 'true' : 'false');
    var label = !a.ears.on ? 'Talk to ' + a.S.totemName + ' (tap to listen)' : talking ? a.S.totemName + ' is talking' : st === 'tap' ? 'Listening paused: tap to resume' : 'Listening (tap to stop)';
    els.mic.setAttribute('aria-label', label); els.mic.title = label;
    if (els.earline) els.earline.textContent = !a.ears.on ? '' : talking ? a.S.totemName + ' is talking...' : st === 'tap' ? 'Listening paused. Tap the microphone.' : 'Listening... just talk.';
  };
  ui.heard = function (text, final) { if (els.input && document.activeElement !== els.input && !draftTimer) els.input.value = final ? '' : text; };
  // What Aiu heard waits in the box for a moment: tap the box to fix it, or it sends itself.
  var draftTimer = null;
  function cancelDraft() { if (draftTimer) { clearInterval(draftTimer); draftTimer = null; } if (els.dbar) els.dbar.classList.remove('run'); if (els.earline) ui.refreshEars(); }
  ui.voiceDraft = function (text) {
    var a = app();
    if (!els.input || ui.tab !== 'talk') { a.say(text); return; }
    cancelDraft();
    els.input.value = text;
    // words the pocket dictionary doesn't know are often mishearings ("hom"): then wait for you instead of sending
    var odd = AIU.dict && AIU.dict.unknown ? AIU.dict.unknown(text).slice(0, 3) : [];
    if (odd.length) {
      if (els.earline) els.earline.textContent = 'Not sure I heard "' + odd.join('", "') + '" right. Fix it in the box, or tap Send.';
      a.beep('ping');
      return;
    }
    var left = 30; // 3 seconds
    els.dbar.classList.add('run'); els.dbar.firstChild.style.width = '100%';
    if (els.earline) els.earline.textContent = 'Heard you. Sending in 3 seconds. Tap the box to fix it first.';
    draftTimer = setInterval(function () {
      left--; els.dbar.firstChild.style.width = Math.max(0, left / 30 * 100) + '%';
      if (left <= 0) { cancelDraft(); var v = els.input.value; els.input.value = ''; a.say(v); }
    }, 100);
  };
  ui.refreshVoice = function () {
    var a = app(); if (!els.mute) return;
    var muted = !!a.dev.mute;
    els.mute.setAttribute('aria-pressed', muted ? 'true' : 'false');
    els.mute.setAttribute('aria-label', muted ? 'Sound is off. Tap to turn sound and Aiu\'s voice on' : 'Sound is on. Tap to turn it off');
    els.mute.title = muted ? 'Sound off' : 'Sound on';
    els.mute.innerHTML = muted ? SPK_OFF : SPK_ON;
  };
  var SPK_ON = '<svg viewBox="0 0 10 8" width="24" height="20" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M0 3h2V2h1V1h1v6H3V6H2V5H0zM6 2h1v1h1v2H7v1H6V5h1V3H6zM8 1h1v1h1v4H9v1H8V6h1V2H8z"/></svg>';
  var SPK_OFF = '<svg viewBox="0 0 10 8" width="24" height="20" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M0 3h2V2h1V1h1v6H3V6H2V5H0zM6 2h1v1h1v1h1V3h1v1H9v1h1v1H9V5H8v1H7V5H6V4h1V3H6z"/></svg>';
  var MIC = '<svg viewBox="0 0 8 9" width="22" height="22" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M3 0h2v1h1v4H5v1H3V5H2V1h1zM0 3h1v2h1v1h4V5h1V3h1v2H7v1H6v1H5v1H3V7H2V6H1V5H0z"/></svg>';

  /* ---------- reminder pop-up ---------- */
  ui.showReminder = function (p) {
    if (!els.toast) return;
    var a = app(), pic = A.portrait(a.sceneState(), 3);
    pic.className = 'tpic';
    clear(els.toast).appendChild(h('div', { cls: 'tin' }, pic, h('div', { cls: 'tbody' },
      h('div', { cls: 'tmeta', text: U.fmtHm(p.o.time, C.setting(a.S, 'clock24', false)) + ' · ' + p.o.title }),
      h('div', { cls: 'tmsg' }, ui.pix('clock'), ' ' + p.o.title),
      h('div', { cls: 'tbtns' }, btn('Done', function () { a.reminderDone(); }, 'primary'), btn('Dismiss', function () { a.reminderDismiss(); })))));
    els.toast.classList.add('show');
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
    if (!fresh) a.beep('chirp');
  };

  /* ---------- the panel ---------- */
  // Each menu fills: the title, its buttons (export...), sub-tabs, the scrolling body and (Talk only) the bottom bar.
  var SUBICON = { big: 'flag', lists: 'list', today: 'sun', pages: 'book', iching: 'yin', me: 'person' };
  ui.panelHead = function (title, actions, subs, cur, onSub) {
    els.ptitle.textContent = title;
    clear(els.pacts);
    // 1.1.0i: one button up here; anything else goes under "More" (fewer buttons on the screen)
    var acts = (actions || []).filter(Boolean);
    if (acts.length) els.pacts.appendChild(acts[0]);
    if (acts.length === 2 && acts[1].textContent === 'More') els.pacts.appendChild(acts[1]); // the menu has its own More
    else if (acts.length > 1) {
      var rest = acts.slice(1);
      els.pacts.appendChild(btn('More', function () {
        var s0 = sheet(title, [h('div', { cls: 'morelist' }, rest)]);
        rest.forEach(function (b) { b.classList.remove('mini'); b.addEventListener('click', function () { setTimeout(function () { s0.remove(); }, 0); }); });
      }, 'mini ghost'));
    }
    clear(els.psub);
    els.psub.hidden = !(subs && subs.length);
    (subs || []).forEach(function (sb) {
      var b = h('button', { type: 'button', role: 'tab', cls: 'stab' + (sb[0] === cur ? ' on' : ''), 'aria-selected': sb[0] === cur ? 'true' : 'false', onclick: function () { onSub(sb[0]); } });
      if (SUBICON[sb[0]]) b.appendChild(ui.pix(SUBICON[sb[0]]));
      b.appendChild(h('span', { text: sb[1] }));
      els.psub.appendChild(b);
    });
  };
  ui.els = els;
  function renderPanel(force) {
    if (!els.panel) return;
    var active = document.activeElement, inside = active && els.panel.contains(active) && /INPUT|TEXTAREA|SELECT/.test(active.tagName) && !/^(checkbox|radio|button)$/.test(active.type || ''); // a ticked box can redraw right away
    document.documentElement.setAttribute('data-tab', ui.tab);
    var refocus = null;
    if (inside && !force) {
      // an "Add ..." box you just submitted (now empty) can refresh; keep typing where you were
      if (active.tagName === 'INPUT' && !active.value && active.getAttribute('data-addrow')) refocus = active.getAttribute('placeholder');
      else { ui.dirty = true; return; }
    }
    clear(els.pfoot); els.pfoot.hidden = true; els.chat = null; els.input = null;
    var top = window.scrollY;
    if (AIU.panels && AIU.panels[ui.tab]) AIU.panels[ui.tab]();
    if (!force) window.scrollTo(0, top);
    if (refocus) { var again = els.panel.querySelector('input[data-addrow][placeholder="' + refocus.replace(/"/g, '') + '"]'); if (again) try { again.focus(); } catch (e) {} }
  }
  ui.renderPanel = renderPanel;
  document.addEventListener('focusout', function () { setTimeout(function () { if (ui.dirty && ui.onMain) { var ae = document.activeElement; if (!(ae && els.panel && els.panel.contains(ae) && /INPUT|TEXTAREA|SELECT/.test(ae.tagName))) { ui.dirty = false; renderPanel(false); } } }, 200); });
  function c24() { return C.setting(app().S, 'clock24', false); }
  function block(title, kids) { return h('div', { cls: 'block' }, title ? h('h3', { text: title }) : null, kids); }
  function empty(t) { return h('p', { cls: 'empty', text: t }); }
  function addRow(placeholder, onAdd, extra) {
    var i = inp({ placeholder: placeholder, autocapitalize: 'sentences', spellcheck: true, 'data-addrow': '1', 'aria-label': placeholder });
    function go() { var v = i.value.trim(); if (!v) return; i.value = ''; onAdd(v); }
    i.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    return h('div', { cls: 'row addrow' }, i, extra || null, btn('Add', go, 'mini primary'));
  }

  /* ---------- Log (was Talk): Aiu's comm link. Every line can be fixed, deleted or heard again. ---------- */
  ui.openLine = null;
  function talkPanel() {
    var a = app(), p = clear(els.panel), input = inp({ placeholder: 'Talk to ' + a.S.totemName + '...', autocapitalize: 'sentences', spellcheck: true, enterkeyhint: 'send', 'aria-label': 'Message to ' + a.S.totemName });
    ui.panelHead('Log', [btn('Today\'s page', function () { ui.openToday(); }, 'mini')], null);
    els.chat = h('div', { cls: 'chat', 'aria-live': 'polite' });
    // 1.1.0 guardrail: the Log takes a log entry or a quest entry. Tap one to file what you type straight there.
    var MODE_PH = { log: 'Log entry: what happened, how it went...', quest: 'Quest entry: something to do, buy, or that you got done...' };
    function setMode(m) { ui.entryMode = ui.entryMode === m ? null : m; input.placeholder = MODE_PH[ui.entryMode] || 'Talk to ' + a.S.totemName + '...'; modeBtns.forEach(function (b) { b.classList.toggle('on', b.dataset.m === ui.entryMode); b.setAttribute('aria-pressed', b.dataset.m === ui.entryMode ? 'true' : 'false'); }); input.focus(); }
    function send() { cancelDraft(); var v = input.value; input.value = ''; a.say(v, ui.entryMode ? { as: ui.entryMode } : {}); }
    input.addEventListener('keydown', function (e) { cancelDraft(); if (e.key === 'Enter') { e.preventDefault(); send(); } });
    input.addEventListener('pointerdown', cancelDraft); input.addEventListener('focus', cancelDraft);
    els.input = input;
    els.mic = a.ears.supported ? h('button', { type: 'button', cls: 'btn mic', onclick: function () { if (a.ears.on && a.ears.state === 'tap') { a.ears.fails = 0; a.ears.resume(); } else a.ears.toggle(); } }) : null;
    if (els.mic) els.mic.innerHTML = MIC;
    els.pchips = h('div', { cls: 'chips pchips', role: 'group', 'aria-label': 'Quick answers' });
    var modeBtns = [['log', 'Log entry'], ['quest', 'Quest entry']].map(function (x) { var b = btn(x[1], function () { setMode(x[0]); }, 'chip mode' + (ui.entryMode === x[0] ? ' on' : '')); b.dataset.m = x[0]; b.setAttribute('aria-pressed', ui.entryMode === x[0] ? 'true' : 'false'); return b; });
    var chips = h('div', { cls: 'chips' }, modeBtns.concat([['What do you need?', 'What do you need?'], ['Help', 'help']].map(function (c) { return btn(c[0], function () { a.say(c[1]); }, 'chip'); })));
    if (ui.entryMode) input.placeholder = MODE_PH[ui.entryMode];
    p.appendChild(els.chat);
    els.dbar = h('div', { cls: 'dbar' }, h('i'));
    els.earline = h('div', { cls: 'earline', 'aria-live': 'polite' });
    clear(els.pfoot); els.pfoot.hidden = false;
    els.pfoot.appendChild(els.pchips); els.pfoot.appendChild(chips);
    els.pfoot.appendChild(h('div', { cls: 'say' }, els.mic, input, btn('Send', send, 'primary')));
    els.pfoot.appendChild(els.dbar); els.pfoot.appendChild(els.earline);
    ui.refreshEars();
    ui.refreshChat();
  }
  // Tap-to-answer buttons for whatever Aiu just asked (the quiz, topic questions, yes/no offers, GABA)
  var B21 = { todo: ['Still to do', 'still need to do it'], goal: ['A goal', 'a goal'], remember: ['Remember it', 'remember it'], happened: ['Already happened', 'it already happened'], feeling: ['A feeling', 'about how i feel'], question: ['A question', 'a question'], chat: ['Just chatting', 'just chatting'] };
  function pendingChips() {
    var a = app(), pd = a.pending, box = els.pchips, opts = [];
    if (!box) return;
    clear(box);
    if (pd && pd.type === 'pq') { var q = AIU.persona.QUIZ[(pd.data || {}).i || 0]; if (q) opts = [['A: ' + q.a, 'A'], ['B: ' + q.b, 'B'], ['Skip', 'skip']]; }
    else if (pd && pd.type === 'pq_offer') opts = [['Let\'s do it', 'yes'], ['Later', 'later']];
    else if (pd && pd.type === 'gaba_mixed') opts = [['It calmed me', 'it calmed me'], ['It revved me up', 'it revved me up'], ['Skip', 'skip']];
    else if (pd && pd.type === 'funnel') opts = [['Log entry', 'log entry'], ['Quest entry', 'quest entry']];
    else if (pd && pd.type === 'need') { var nk = (pd.data || {}).k; opts = nk === 'calm' ? [['A walk', 'I went for a walk'], ['Tea', 'I had some tea'], ['Stretching', 'I stretched'], ['Quiet time', 'I had some quiet time'], ['Skip', 'skip']] : [['Skip', 'skip']]; }
    else if (pd && pd.type === 'topic_q') { var d = pd.data || {}; opts = d.w === 'feel' ? [['Yes', 'yes'], ['Kind of', 'kind of'], ['No', 'no']] : d.confirm ? [['Still true', 'yes'], ['It changed', 'no'], ['That\'s all', 'that\'s all']] : [['Skip', 'skip'], ['That\'s all', 'that\'s all']]; }
    else if (pd && pd.type === 'b_offer' && /^(todo|goal)$/.test((pd.data || {}).intent)) opts = [['Yes', 'yes'], ['Log entry instead', 'log entry instead'], ['No', 'no']];
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
    var items = S.chat.map(function (e) { return { id: e.id, t: e.t, type: e.type, who: e.type === 'say' ? 'you' : e.type === 'journal' ? 'journal' : 'totem', text: e.data.text, dn: e.dev !== a.deviceId ? e.dn : '', day: e.d, hm: e.h, edited: e.edited }; })
      .concat(a.lines.map(function (l) { return { t: l.t, who: 'totem', text: l.text, local: true }; }))
      .sort(function (x, y) { return x.t - y.t; }).slice(-80);
    var nearBottom = els.chat.scrollHeight - els.chat.scrollTop - els.chat.clientHeight < 80;
    clear(els.chat);
    if (!items.length) els.chat.appendChild(empty('This is your Log. Tap Log entry and tell ' + S.totemName + ' about your day, or Quest entry for something to do ("buy chicken feed for Tractor Supply"). Commands work too: "remind me to feed the chickens at 6pm", "cast my reading". Ask "what do you need?" to see what ' + S.totemName + ' needs today.'));
    var lastDay = '';
    items.forEach(function (it) {
      var day = it.day || U.dayStr(new Date(it.t)), key = it.id || ('l' + it.t);
      if (day !== lastDay) { els.chat.appendChild(h('div', { cls: 'daysep', text: U.fmtDay(day) })); lastDay = day; }
      var who = it.who === 'you' ? 'You' : it.who === 'journal' ? 'Journal page' : S.totemName, open = ui.openLine === key;
      var m = h('div', { cls: 'msg ' + it.who + (it.local ? ' local' : '') + (open ? ' open' : ''), tabindex: '0', role: 'button', 'aria-expanded': open ? 'true' : 'false', 'aria-label': who + ': ' + it.text + '. Tap for options.',
        onclick: function (ev) { if (ev.target.closest('.mact')) return; ui.openLine = open ? null : key; ui.refreshChat(); },
        onkeydown: function (ev) { if ((ev.key === 'Enter' || ev.key === ' ') && !ev.target.closest('.mact')) { ev.preventDefault(); ui.openLine = open ? null : key; ui.refreshChat(); } } },
        h('div', { cls: 'mtext', text: it.text }),
        h('div', { cls: 'mmeta', text: who + ' · ' + U.fmtHm(it.hm || U.hmStr(new Date(it.t)), c24()) + (it.dn ? ' · ' + it.dn : '') + (it.edited ? ' · edited' : '') }));
      if (open) m.appendChild(lineActions(a, it));
      els.chat.appendChild(m);
    });
    if (nearBottom || !ui.openLine) els.chat.scrollTop = els.chat.scrollHeight;
  };
  function lineActions(a, it) {
    var row = h('div', { cls: 'mact row wrap' });
    row.appendChild(btn('Hear it', function () { a.speak(it.text); }, 'mini'));
    if (it.local) { row.appendChild(btn('Hide', function () { ui.openLine = null; a.forgetLocalLine(it.t); }, 'mini')); return row; }
    row.appendChild(btn(it.who === 'you' ? 'Fix it' : 'Edit', function () {
      var ta = h('textarea', { rows: 3, value: it.text, 'aria-label': 'The words' }), again = h('input', { type: 'checkbox', checked: it.who === 'you' }), s;
      s = sheet(it.who === 'you' ? 'Fix what you said' : 'Edit what ' + a.S.totemName + ' said', [
        h('p', { cls: 'small', text: 'The old words stay in the history. Only this line changes.' }), ta,
        it.who === 'you' ? h('label', { cls: 'item' }, again, h('span', { cls: 'ititle', text: 'Then let ' + a.S.totemName + ' answer the fixed words' })) : null,
        h('div', { cls: 'row spread' }, h('span'), btn('Save', function () {
          var v = ta.value.trim(); s.remove(); ui.openLine = null;
          if (!v || v === it.text) return;
          if (it.who === 'you' && again.checked) a.say(v, { editOf: it.id }); else a.editLine(it.id, v);
        }, 'primary'))]);
      setTimeout(function () { try { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); } catch (e) {} }, 60);
    }, 'mini'));
    row.appendChild(btn('Delete', function () {
      ui.openLine = null;
      a.deleteLine(it.id).then(function () { snack('Line deleted.', function () { a.undeleteLine(it.id); }); });
    }, 'mini del'));
    return row;
  }

  /* Journal (a sheet, opened from Talk or the Library) */
  // 1.1.0 final: the only place you "talk": a journal entry, typed or said (the microphone writes into the box)
  var dict = null;
  function stopDictation() { if (dict) { try { dict.rec.abort(); } catch (e) {} if (dict.btn) { dict.btn.classList.remove('on'); dict.btn.setAttribute('aria-pressed', 'false'); } dict = null; } }
  function startDictation(ta, b, note) {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { note.textContent = 'This browser can\'t listen. Try Chrome or Edge on a computer, or Safari on an iPhone (or use the keyboard\'s own microphone).'; return; }
    stopDictation();
    var rec; try { rec = new SR(); } catch (e) { return; }
    var base = ta.value;
    rec.lang = navigator.language || 'en-US'; rec.continuous = true; rec.interimResults = true;
    rec.onresult = function (ev) {
      var fin = '', part = '';
      for (var i = ev.resultIndex; i < ev.results.length; i++) { var r = ev.results[i]; if (r.isFinal) fin += r[0].transcript; else part += r[0].transcript; }
      if (fin) { base = (base && !/\s$/.test(base) ? base + ' ' : base) + Wd.cap(fin.trim()) + (/[.!?]$/.test(fin.trim()) ? '' : '.'); }
      ta.value = base + (part ? (base ? ' ' : '') + part : ''); ta.dispatchEvent(new Event('input'));
    };
    rec.onerror = function (e) { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') note.textContent = 'Allow the microphone in the browser settings to talk your entry.'; };
    rec.onend = function () { if (dict && dict.rec === rec) { try { rec.start(); } catch (e) { stopDictation(); } } }; // keep going until you tap it off
    try { rec.start(); } catch (e) { return; }
    dict = { rec: rec, btn: b }; b.classList.add('on'); b.setAttribute('aria-pressed', 'true');
    note.textContent = 'Listening... just talk. Tap the microphone again to stop.';
  }
  ui.dictated = function () {}; // (the old always-on listener is retired)
  ui.journalSheet = function (entry, opts) {
    var a = app(), s, ta = h('textarea', { cls: 'jtext', rows: 9, placeholder: 'What happened today? How did it go? What are you working on? How do you feel?', value: entry ? entry.data.text : ui.jdraft || '' });
    var count = h('span', { cls: 'hint' }), note = h('p', { cls: 'small' });
    function upd() { if (!entry) ui.jdraft = ta.value; var n = ta.value.trim().length; count.textContent = n + ' letters' + (entry ? '' : n >= 80 ? ' · grows ' + a.S.totemName : ' · 80+ grows ' + a.S.totemName); }
    ta.addEventListener('input', upd); upd();
    var mic = h('button', { type: 'button', cls: 'btn mic', 'aria-label': 'Talk your entry (the microphone writes it down)', title: 'Talk your entry', 'aria-pressed': 'false', onclick: function () { if (dict) { stopDictation(); note.textContent = ''; } else startDictation(ta, mic, note); } });
    mic.innerHTML = MIC;
    var save = btn(entry ? 'Save changes' : 'Save entry', function () {
      var v = ta.value.trim(); if (!v) return;
      stopDictation(); s.remove();
      if (entry) { if (v !== entry.data.text) a.addEvents([{ type: 'journal_edit', data: { ref: entry.id, text: v } }], true).then(function () { a.react('save'); }); }
      else { ui.jdraft = ''; a.journal(v).then(function (r) { if (r && r.mixed && AIU.panels.mixedAsk) setTimeout(function () { AIU.panels.mixedAsk(r.mixed); }, 900); }); }
    }, 'primary');
    s = sheet(entry ? 'Edit your entry from ' + U.fmtDay(entry.d) : 'New journal entry', [
      entry ? h('p', { cls: 'small', text: 'Editing keeps the old version in the Totem\'s history.' }) : h('p', { cls: 'small', text: 'Type it, or tap the microphone and just talk. It goes on today\'s page. Writing is how ' + a.S.totemName + ' grows the most: +10 for 80+ letters.' }),
      opts && opts.prompt && !entry ? h('p', { cls: 'jprompt', text: opts.prompt }) : null,
      ta, h('div', { cls: 'row spread' }, h('span', { cls: 'row' }, mic, count), save), note,
      entry ? btn('Hide this entry', function () { stopDictation(); s.remove(); a.addEvents([{ type: 'journal_hide', data: { ref: entry.id, hidden: true } }], true); }, 'ghost') : null
    ]);
    var obs = new MutationObserver(function () { if (!document.body.contains(s)) { stopDictation(); obs.disconnect(); } }); obs.observe(document.body, { childList: true });
    if (opts && opts.listen) startDictation(ta, mic, note);
    setTimeout(function () { try { ta.focus(); } catch (e) {} }, 50);
  };
  // The personality quiz: 12 taps (it used to be a conversation)
  ui.quizSheet = function () {
    var a = app(), P = AIU.persona, i = 0, votes = [], s, box = h('div');
    function show() {
      clear(box);
      var q = P.QUIZ[i];
      if (!q) return finish();
      box.appendChild(h('p', { cls: 'small', text: 'Question ' + (i + 1) + ' of ' + P.QUIZ.length }));
      box.appendChild(h('div', { cls: 'bar thin' }, h('i', { cls: 'conf', style: 'width:' + Math.round(i / P.QUIZ.length * 100) + '%' })));
      box.appendChild(h('h3', { text: q.q + '...' }));
      box.appendChild(h('div', { cls: 'quizopts' }, btn(Wd.cap(q.a), function () { pick(1); }, 'primary'), btn(Wd.cap(q.b), function () { pick(-1); }, 'primary'), btn('Skip', function () { pick(0); }, 'ghost')));
    }
    function pick(v) { votes.push({ q: P.QUIZ[i], v: v }); i++; show(); }
    function finish() {
      var S = a.S, ev = votes.map(function (x) { return { type: 'trait', data: { qid: x.q.id, v: x.v } }; });
      var TR = JSON.parse(JSON.stringify(S.traits || {})); TR.quiz = TR.quiz || {};
      votes.forEach(function (x, n) { TR.quiz[x.q.id] = { v: x.v, t: a.trueNow() + n + 1 }; });
      var prev = S.ptypes && S.ptypes.length ? S.ptypes[S.ptypes.length - 1].code : '', r = P.compute(TR);
      if (r.code) ev.push({ type: 'ptype', data: { code: r.code, from: prev } });
      a.addEvents(ev, true).then(function () { a.react('quest'); });
      clear(box);
      box.appendChild(r.code ? h('div', { cls: 'item col' }, h('b', { text: 'You\'re a ' + r.name + ' (' + r.code + ')' }), h('span', { text: r.desc }), h('span', { cls: 'small', text: S.totemName + ' shares this personality with you now.' }))
        : h('p', { text: 'Thanks! A few more answers are needed to know your type. Try again any time.' }));
      box.appendChild(btn('Done', function () { s.remove(); }, 'primary'));
    }
    s = sheet('Personality quiz', [h('p', { cls: 'small', text: 'Pick the one that fits you better. No wrong answers.' }), box]);
    show();
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
  ui.openQuest = function (key) { ui.questOpen = key; ui.go('quests', 'big'); };
  function qprogress(S, q) { var st = C.questSteps(S, q), d = st.filter(function (x) { return x.done; }).length; return st.length ? d + '/' + st.length : 'no steps'; }
  function questRow(S, q, tracked) {
    var ns = C.nextStep(S, q);
    var b = h('button', { type: 'button', cls: 'qrow' + (tracked ? ' tracked' : ''), onclick: function () { ui.openQuest(q.key); } },
      h('span', { cls: 'qrtitle', text: (tracked ? '> ' : '') + q.title }),
      h('span', { cls: 'qrmeta', text: (ns ? 'Next: ' + ns.title : (q.steps || []).length ? 'All steps done' : 'No steps yet') + ' · ' + qprogress(S, q) }));
    b.setAttribute('aria-label', q.title + '. ' + (ns ? 'Current objective: ' + ns.title : 'No open steps') + '. ' + qprogress(S, q) + '. Open quest');
    return b;
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
    p.appendChild(h('div', { cls: 'row spread' }, btn('< Quests', function () { ui.questOpen = null; renderPanel(true); }, 'mini ghost'),
      h('span', { cls: 'tag', text: q.state === 'active' ? (q.kind === 'side' ? 'side quest' : q.kind === 'idea' ? 'idea' : 'main quest') : q.state === 'done' ? 'complete' : 'set aside' })));
    p.appendChild(h('h2', { cls: 'qtitle', text: q.title }));
    if (q.why) p.appendChild(h('p', { cls: 'qdesc', text: q.why }));
    p.appendChild(h('div', { cls: 'row wrap' },
      q.state === 'active' && q.kind !== 'idea' ? btn(isT ? 'Tracking' : 'Track this quest', function () { a.setSetting('track', isT ? null : key); }, 'mini' + (isT ? ' primary' : '')) : null,
      btn('Rename', function () { editSheet('Rename quest', [{ label: 'Title', value: q.title }, { label: 'What it\'s about (optional)', value: q.why || '', type: 'textarea' }], function (v) { var t = Wd.cap(v[0].trim()).slice(0, 48); if (!t) return; var d = M.questSetData(q, raw); d.title = t; d.why = v[1].trim() || undefined; a.addEvents([{ type: 'quest_set', data: d }]); }); }, 'mini'),
      sel({ main: 'Main quest', side: 'Side quest', idea: 'Idea' }, q.kind || 'main', function (v) { var d = M.questSetData(q, raw); d.kind = v; a.addEvents([{ type: 'quest_set', data: d }]); })));
    // objectives
    var ob = [];
    if (!steps.length) ob.push(empty('No steps yet. Add the first one below.'));
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

  /* Library: search, today's page, chapters (months) and pages (days), glossary, capsules */
  ui.lib = { month: null, day: null };
  function lc(s) { return String(s || '').toLowerCase(); }
  function journalCard(a, e) {
    return h('article', { cls: 'jentry' + (a.unsent.some(function (u) { return u.id === e.id; }) ? ' unsent' : '') },
      h('div', { cls: 'jmeta', text: U.fmtDay(e.d) + ' ' + U.fmtHm(e.h || '', c24()) + ' · ' + (e.dn || 'device') + (e.edited ? ' · edited' : '') }),
      h('div', { cls: 'jbody', text: e.data.text }),
      h('div', { cls: 'row wrap' }, btn('Edit', function () { ui.journalSheet(e); }, 'mini'), a.dev.mute ? null : btn('Read aloud', function (ev) { var on = a.readAloud(e.data.text); ev.target.textContent = on ? 'Stop' : 'Read aloud'; }, 'mini'), btn('Hide', function () { a.addEvents([{ type: 'journal_hide', data: { ref: e.id, hidden: true } }]); }, 'mini')));
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
  // A day's page. opts.journal (the Journal tab): your entries and the I Ching first, the rest of the Hilltop View folded below.
  function renderPage(a, P, box, opts) {
    var S = a.S, today = P.isToday, J = opts && opts.journal, more = J ? h('div') : box;
    if (!J) {
      box.appendChild(h('h3', { cls: 'jtitle', text: P.title }));
      if (P.stamp) box.appendChild(h('div', { cls: 'small', text: P.stamp + (today ? ' · updates all day' : '') }));
    }
    if (P.weather) box.appendChild(h('div', { cls: J ? 'small' : '', text: 'Weather: ' + P.weather + (P.forecast ? ' · Today: ' + P.forecast : '') }));
    else if (P.forecast) box.appendChild(h('div', { text: 'Today: ' + P.forecast }));
    // your entries (journal events) first in the Journal
    function entries(into) {
      var st = h('div'); P.stories.forEach(function (e) { st.appendChild(journalCard(a, e)); });
      if (!P.stories.length) st.appendChild(h('p', { cls: 'small', text: today ? 'No entries yet today.' : 'No entries this day.' }));
      if (today) st.appendChild(btn('+ New entry', function () { ui.journalSheet(); }, P.stories.length ? 'mini' : 'primary'));
      into.appendChild(sec(J ? 'Entries' : 'Your stories', st));
    }
    if (J) entries(box);
    more.appendChild(h('div', { cls: 'row spread jdir' }, h('span', null, h('b', { text: 'Long-term direction: ' }), P.direction || h('i', { text: 'not set yet' })),
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
    if (P.principle && J) box.appendChild(h('blockquote', { cls: 'jprinciple', text: 'Hilltop principle: ' + P.principle }));
    if (P.continuity.length) more.appendChild(sec('Continuity', h('ul', null, P.continuity.map(function (x) { return h('li', { text: x }); }))));
    if (P.areas.length || P.quiet.length) more.appendChild(sec('The whole terrain', [P.areas.map(function (ar) { return h('div', { cls: 'jarea' }, h('b', { text: ar.name }), h('ul', null, ar.lines.map(function (x) { return h('li', { text: x }); }))); }),
      P.quiet.length ? h('p', { cls: 'small', text: 'Nothing noted: ' + P.quiet.join(', ') + '.' }) : null]));
    if (P.feeding) more.appendChild(sec('What am I feeding?', [h('ul', null, P.feeding.map(function (x) { return h('li', { text: x }); })), h('p', { cls: 'small', text: 'Not every problem needs more effort. Sometimes the right move is to stop feeding the wrong thing. Answer below, in the daily log.' })]));
    if (P.loose.length) more.appendChild(sec('Leave no one behind', h('ul', null, P.loose.map(function (x) { return h('li', { text: x }); }))));
    if (P.plan) {
      var planRow = function (it) {
        return h('li', { cls: 'row spread' }, h('span', { text: it.text }), it.act ? iconBtn('Mark done: ' + it.text, 'Done', function () {
          var ac = it.act, ev = ac.type === 'task' ? { type: 'task_done', data: { key: ac.key, date: ac.date } } : ac.type === 'todo' ? { type: 'list_check', data: { list: ac.list, item: ac.item, done: true } } : { type: 'quest_step', data: { key: ac.key, step: ac.step, done: true } };
          a.addEvents([ev]).then(function () { snack('Done: ' + it.text); });
        }) : null);
      };
      more.appendChild(sec('Today\'s practical plan', [
        h('b', { text: 'Must do' }), P.plan.must.length ? h('ul', null, P.plan.must.map(planRow)) : h('p', { cls: 'small', text: 'Nothing urgent on the list.' }),
        h('b', { text: 'Should do' }), P.plan.should.length ? h('ul', null, P.plan.should.map(planRow)) : h('p', { cls: 'small', text: 'Pick one thing that moves your direction forward.' }),
        h('b', { text: 'If energy remains' }), P.plan.energy.length ? h('ul', null, P.plan.energy.map(planRow)) : h('p', { cls: 'small', text: 'Rest counts too.' })]));
    }
    if (P.principle && !J) box.appendChild(h('blockquote', { cls: 'jprinciple', text: 'Hilltop principle: ' + P.principle }));
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
    (J ? more : box).appendChild(sec('Daily log', logBox));
    if (!J) entries(box);
    if (J && more.children.length) box.appendChild(acc('jp-more', 'More from the Hilltop View (direction, terrain, plan, daily log)', [more], false));
  }
  function copyText(text, status) {
    function fallback() { var ta = h('textarea', { rows: 10, value: text, readonly: true }); var s0 = sheet('Copy this', [h('p', { cls: 'small', text: 'Select all and copy.' }), ta]); setTimeout(function () { ta.focus(); ta.select(); }, 60); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { msg(status, 'Copied!'); }, fallback);
    else fallback();
  }
  // "Today's page" from anywhere (the chip, the pop-up)
  ui.openToday = function () { AIU.panels.state.jday = U.dayStr(new Date(app().trueNow())); AIU.panels.state.jview = null; AIU.panels.state.jfromToday = false; ui.go('journal', 'pages'); };
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
    box.appendChild(h('p', { cls: 'small', text: 'It evolves: the quiz sets where you start, and what you write in your journal keeps nudging the sliders a little.' }));
    box.appendChild(btn(pt.answered ? 'Retake the quiz' : 'Take the quiz', function () { ui.quizSheet(); }, pt.answered ? 'mini' : 'primary'));
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
        btn('Change', function () { var np = newp.value; a.api('password', { u: a.prof.u, token: a.prof.token, old: oldp.value, pw: np }).then(function () { msg(pm, 'Changed. Other devices will ask to log in again.'); a.vaultRekey(np).catch(function () {}); }, function (e) { msg(pm, e.message, true); }); }, 'primary')));
    }
    var P = a.profiles, others = Object.keys(P).filter(function (k) { return k !== a.pid && (P[k].token || P[k].local) && !P[k].linkedTo; });
    if (others.length) acct.push(h('div', { cls: 'row wrap' }, others.map(function (k) { return btn('Switch to ' + (P[k].local ? 'device-only Totem' : P[k].u), function () { s.remove(); a.openProfile(k); }); })));
    acct.push(btn('Add another account', function () { s.remove(); a.meta.set('active', null); ui.onMain = false; ui.welcome(); }, 'ghost'));

    // totem
    var tn = inp({ value: S.totemName, maxLength: 24 }), cm = inp({ value: S.callMe, maxLength: 30 });
    var forms = { current: 'Newest form (always)' }; S.forms.forEach(function (f) { forms[String(f.stage)] = 'Stage ' + f.stage + ' - ' + C.stageName(f.stage); });
    var evoBox = h('div', { cls: 'evorow', 'aria-label': 'How this type evolves' });
    function evoRow(pref) { // stages 1 to 7 of the chosen type, from this Totem's own seeds
      clear(evoBox); if (!S.egg) return;
      for (var st = 1; st <= 7; st++) { var cr = A.creature(C.formSeed(S.egg.id, st), st, S.accentSeed, pref || C.setting(S, 'ckind', 'auto')), cv = A.crop(cr, 'open', 2); cv.title = 'Stage ' + st + ' · ' + C.stageName(st); evoBox.appendChild(cv); }
    }
    evoRow();
    var totem = [
      h('div', { cls: 'row2' }, field('Totem name', tn), field('It calls you', cm)),
      btn('Save names', function (e) { var d = []; if (tn.value.trim() && tn.value.trim() !== S.totemName) d.push({ type: 'set', data: { k: 'totemName', v: tn.value.trim() } }); if (cm.value.trim() && cm.value.trim() !== S.callMe) d.push({ type: 'set', data: { k: 'callMe', v: cm.value.trim() } }); a.addEvents(d).then(function () { e.target.textContent = 'Saved'; }); }, 'mini'),
      h('div', { cls: 'row2' }, field('House', sel(A.HOUSES, C.setting(S, 'house', 'cabin'), function (v) { a.setSetting('house', v); })),
        field('World', sel(A.BIOMES, C.setting(S, 'biome', 'meadow'), function (v) { a.setSetting('biome', v); }))),
      field('Look (skin)', sel(forms, C.setting(S, 'skin', 'current'), function (v) { a.setSetting('skin', v); }), 'Only changes how it looks. It keeps growing and evolving underneath.'),
      field('Creature type', sel(Object.assign({ auto: 'Random, picked by its egg (' + A.kindName(S.accentSeed, 'auto') + ')' }, A.KINDS, { classic: 'Classic (the 1.0.5 look)' }), C.setting(S, 'ckind', 'auto'), function (v) { a.setSetting('ckind', v).then(function () { evoRow(v); }); }), 'Every egg hatches into a random type, and it evolves within that type. Change it here any time. Each type changes shape as it evolves: a round baby first, then it stands up, then wings, armor and a crown.'),
      evoBox
    ];
    // reminders
    var voiceSel = h('select', { 'aria-label': 'Voice to use' });
    function fillVoices() {
      clear(voiceSel); voiceSel.appendChild(h('option', { value: '', text: 'Default voice' }));
      var cur = a.pickVoice ? a.pickVoice() : null;
      a.voices().slice().sort(function (x, y) { var ex = /^en/i.test(x.lang) ? 0 : 1, ey = /^en/i.test(y.lang) ? 0 : 1; return ex - ey || (x.name < y.name ? -1 : 1); }).forEach(function (v) {
        var o = h('option', { value: v.voiceURI || v.name, text: v.name + ' (' + v.lang + ')' + (v.localService === false ? ' · online' : '') }); if (cur && v === cur) o.selected = true; voiceSel.appendChild(o);
      });
    }
    fillVoices(); ui.voicesChanged = fillVoices;
    voiceSel.addEventListener('change', function () {
      var v = a.voices().filter(function (x) { return (x.voiceURI || x.name) === voiceSel.value; })[0];
      devSet('voiceURI', v ? (v.voiceURI || '') : ''); devSet('voiceName', v ? v.name : '');
      if (a.voiceChanged) a.voiceChanged(); a.hush(); a.speak('Hi ' + S.callMe + ', this is my new voice.');
    });
    var rtimes = [['off', 'Off']], rcur = C.setting(S, 'reading', M.readingDefault(S));
    for (var rm = 240; rm <= 1320; rm += rm < 720 ? 30 : 60) rtimes.push([U.minToHm(rm), U.fmtHm(U.minToHm(rm), c24())]);
    if (!rtimes.some(function (x) { return x[0] === rcur; })) rtimes.push([rcur, U.fmtHm(rcur, c24())]);
    var rem = [
      field('Daily reading (I Ching + hilltop review)', sel(rtimes, rcur, function (v) { a.setSetting('reading', v); }), 'At this time ' + S.totemName + ' tosses the coins and gives you yesterday\'s track record and guidance for today as a pop-up (and on today\'s journal page).'),
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
    var voice = [ // 1.1.0 final: Aiu speaks in emotes and emoji only
      field('Emote bubble over ' + S.totemName, sel({ short: 'On', off: 'Off' }, dev.bubble === 'off' ? 'off' : 'short', function (v) { devSet('bubble', v); })),
      field('GABA coach', sel({ on: 'Notice calm and stress things in my entries, and suggest a brake now and then', off: 'Off (I log them myself)' }, dev.gabaCoach === false ? 'off' : 'on', function (v) { devSet('gabaCoach', v === 'on'); })),
      h('p', { cls: 'small', text: S.totemName + ' doesn\'t chat: it reacts with emotes and emoji. The speaker button at the top turns every sound on or off. To talk, open Journal > Today and tap Talk it: the microphone writes down what you say.' })
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
        btn('Brake +10 (test)', function () { a.logGaba('calm', 'Walk outside', 10); }, 'mini'),
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
      section('Account', acct), section(S.totemName, totem), section('Sounds & GABA', voice), section('Reminders', rem), section('Weather & time', world),
      section('This device', device),      section('Your data', data), section('Developer', [devToggle, devbox]), section('Danger zone', danger),
      section('About', [h('p', { cls: 'small', text: 'Aiu Totem ' + a.cfg.version + ' by KODNA. Free for personal, private use in your web browser: nothing is sold, no ads, and your Totem is only yours.' }),
        h('p', { cls: 'small', text: 'Everything in Aiu is made by KODNA or is public domain: our own pixel fonts, creatures, world and word lists; the butler\'s full dictionary is Webster\'s 1913 Unabridged (public domain); live weather is from the US National Weather Service (public domain). Colors: the Sweetie 16 palette.' }),
        h('p', { cls: 'small', text: 'Aiu is a little companion, not a counselor or a doctor. If you are ever in crisis, contact your local crisis hotline or emergency number (in the US, call or text 988). Please be safe.' })])
    ]);
  };
  // 1.1.0: the building blocks the menus (panels.js) share
  ui.k = { btn: btn, field: field, inp: inp, sel: sel, msg: msg, busy: busy, clear: clear, acc: acc, editSheet: editSheet, snack: snack, iconBtn: iconBtn, empty: empty, addRow: addRow,
    sheet: sheet, section: section, c24: c24, questRow: questRow, questDetail: questDetail, qprogress: qprogress, editReminder: editReminder, deleteReminder: deleteReminder,
    renderPage: renderPage, pageOpts: pageOpts, bookDays: bookDays, topicCard: topicCard, personaBox: personaBox, readingCard: readingCard, journalCard: journalCard, hexPic: hexPic, copyText: copyText, sec: sec };
})();
