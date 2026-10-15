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
    document.documentElement.classList.toggle('toy', ((AIU.app.dev && AIU.app.dev.style) || 'toy') === 'toy'); // 2.3.0: the toy-box look (or the retro paper-and-ink look)
    var col = (AIU.app.dev && AIU.app.dev.color) || 'classic'; if (col === 'classic') document.documentElement.removeAttribute('data-color'); else document.documentElement.setAttribute('data-color', col); // 2.1.5: color themes
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
  // 2.2.0: a capsule (.zip) can come in from the start, log in and sign up screens: it becomes device-only profile(s) on this device
  // (link them to an account later in Settings). The egg screen imports into the brand-new profile itself.
  function importCapsuleRow(onDone, label) {
    var file = h('input', { type: 'file', accept: '.zip,.aiucap,.jsonl,application/zip,application/octet-stream', cls: 'hidden', 'aria-hidden': 'true' }), m = h('p', { cls: 'formmsg' });
    file.addEventListener('change', function () {
      var f = file.files[0]; if (!f) return; file.value = '';
      msg(m, 'Reading the capsule...');
      (onDone ? onDone(f) : app().importNewProfiles(f, { account: false }).then(function (made) { msg(m, made.length > 1 ? 'Imported ' + made.length + ' profiles.' : 'Imported.'); return app().openProfile(made[0]); }))
        .catch(function (e) { msg(m, e.message || String(e), true); });
    });
    return h('div', { cls: 'stack' }, file, btn(label || 'Open a capsule', function () { file.click(); }, 'ghost'), m);
  }
  ui.importCapsuleRow = importCapsuleRow;
  ui.welcome = function () {
    var a = app(), P = a.profiles, groups = {}, order = [];
    Object.keys(P).forEach(function (pid) {
      var p = P[pid]; if (p.linkedTo || p.gone || !(p.token || p.local)) return;
      var g = a.groupOf(pid); if (!groups[g]) { groups[g] = []; order.push(g); } groups[g].push(pid);
    });
    var rows = order.map(function (g) {
      var pids = groups[g].sort(function (x, y) { return (P[y].lastOpen || 0) - (P[x].lastOpen || 0); }), p0 = P[pids[0]], names = pids.map(function (k) { return a.profName(k); });
      var title = p0.local ? 'Open my device-only Aiu' : 'Continue as ' + p0.u;
      return h('button', { type: 'button', cls: 'btn primary wbtn2', onclick: function () { a.openProfile(pids[0]); } }, h('span', { text: title }),
        h('span', { cls: 'small', text: (pids.length > 1 ? pids.length + ' profiles: ' + names.join(', ') : names[0] + (p0.label ? ' · ' + p0.label : '')) + (p0.local ? ' (this device only)' : '') }));
    });
    var hasLocal = order.some(function (g) { return g.indexOf('L:') === 0; });
    screen([
      logo(),
      h('p', { cls: 'lead', text: 'Raise a little pixel companion. It hatches from an egg and grows from your journal, quests and plans, keeps you on track, and remembers.' }),
      (window.AIU_CONFIG || {}).demo ? h('p', { cls: 'note', text: 'Demo: there is no server here, so Log in and Sign up won\'t connect. Tap "Try it on this device only" below. Everything stays in this browser.' }) : null,
      rows.length ? h('div', { cls: 'stack' }, rows) : null,
      h('div', { cls: 'stack' }, btn('Log in', function () { ui.loginScreen(); }, rows.length ? '' : 'primary'), btn('Sign up', function () { ui.signupScreen(); })),
      importCapsuleRow(),
      hasLocal ? null : h('p', { cls: 'small' }, h('a', { href: '#', onclick: function (e) { e.preventDefault(); a.startLocal(); }, text: 'Try it on this device only (no account, no sync)' })),
      h('p', { cls: 'small dim', text: 'One account can hold several Aiu profiles (say, you and your business), each with its own egg. Free for personal, private use. Nothing to buy, no ads.' })
    ]);
  };

  ui.loginScreen = function (prefill, note) {
    var u = inp({ name: 'username', value: prefill || '', placeholder: 'username' }), pw = inp({ type: 'password', name: 'password', placeholder: 'password' });
    var m = h('p', { cls: 'formmsg' }), go = btn('Log in', submit, 'primary'), extra = h('div');
    function submit() {
      if (!u.value.trim() || !pw.value) { msg(m, 'Enter your username and password.', true); return; }
      busy(go, true, 'Logging in...');
      app().login(u.value.trim().toLowerCase(), pw.value, u.value.trim()).then(finishLogin, function (err) {
        busy(go, false, 'Log in'); msg(m, err.message, true);
        clear(extra);
      });
    }
    pw.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
    screen([logo(), h('h2', { text: 'Log in' }), note ? h('p', { cls: 'note', text: note }) : null, field('Username', u), field('Password', pw), m, go, extra,
      btn('Forgot your password?', function () { ui.forgotScreen(u.value); }, 'ghost'), btn('Back', ui.linkFrom ? ui.main : ui.welcome, 'ghost')]);
  };
  function finishLogin(pid) {
    var a = app(), link = ui.linkFrom;
    ui.linkFrom = null;
    if (!link) return a.openProfile(pid);
    var pr = a.profiles[pid], main = a.pidFor(pr.u, '');
    return a.api('sync', { u: pr.u, token: pr.token, since: 0, events: [], tid: '' }).then(function (r) {
      var target = main;
      if (r.events.length) { // 2.2.0: the account already has a Totem, so this one joins it as another profile
        var lp = a.profiles[link] || {}, tid = a.newTid(); target = a.pidFor(pr.u, tid);
        a.profiles[target] = { u: pr.u, email: pr.email, token: pr.token, dk: pr.dk, created: Date.now(), local: false, tid: tid, pname: lp.pname || (lp.label ? lp.label.replace(/ \(.*\)$/, '') : 'My Aiu'), pkind: lp.pkind || 'personal' };
      }
      return a.saveProfiles().then(function () { return a.linkLocalTo(link, target); }).then(function () { return a.openProfile(target); }).then(function () { if (target !== main) a.profileSet(a.profiles[target]).catch(function () {}); ui.snack && ui.snack(target === main ? 'Your Totem now lives in your account and syncs everywhere.' : 'Your account already had a Totem, so this one is now its own profile in the account.'); });
    });
  }

  ui.signupScreen = function (opts) {
    opts = opts || {};
    var u = inp({ placeholder: 'e.g. Henry', maxLength: 24, autocapitalize: 'words', autocomplete: 'username' }); // 2.4.0: no email
    var pw = inp({ type: 'password', placeholder: '8+ characters' }), pw2 = inp({ type: 'password', placeholder: 'again' });
    var m = h('p', { cls: 'formmsg' }), go = btn('Create account', submit, 'primary');
    ui.linkFrom = opts.link || null;
    function submit() {
      var un = u.value.trim().toLowerCase();
      if (!/^[a-z0-9_-]{3,24}$/.test(un)) return msg(m, 'Usernames are 3-24 letters, numbers, - or _.', true);
      if (pw.value.length < 8) return msg(m, 'Passwords need at least 8 characters.', true);
      if (pw.value !== pw2.value) return msg(m, 'The two passwords do not match.', true);
      busy(go, true, 'Creating...');
      app().api('signup', { u: un, email: '', pw: pw.value }).then(function () {
        return app().login(un, pw.value, u.value.trim()).then(finishLogin);
      }, function (err) { busy(go, false, 'Create account'); msg(m, /taken/i.test(err.message) ? 'This name is taken. Try another name.' : err.message, true); });
    }
    screen([logo(), h('h2', { text: 'Sign up' }),
      h('p', { cls: 'small', text: 'A username and a password. Your username is also your name: it\'s what Aiu calls you. Each username belongs to one account only. Write your password down somewhere safe: it can\'t be reset, by anyone. A lost password means starting over.' }),
      field('Username', u, 'Letters, numbers, - or _. Big letters are kept for how Aiu says it.'),
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
  // 2.7.0: there's no way back into an account without its password: no email, no admin, no recovery code
  ui.forgotScreen = function (un) {
    screen([logo(), h('h2', { text: 'Forgot your password?' }),
      h('p', { text: 'It can\'t be reset. No one can get into an account without its password, not even KODNA. That keeps your Aiu yours.' }),
      h('p', { text: 'If it\'s really lost, start a new account. If you exported a capsule, you can open it in the new account (you\'ll need the capsule\'s own password).' }),
      btn('Back to log in', function () { ui.loginScreen(un); }, 'primary'), btn('Start a new account', function () { ui.signupScreen(); }, 'ghost')]);
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
      if (!a.prof.u && me.value.trim()) drafts.push({ type: 'set', data: { k: 'callMe', v: me.value.trim().slice(0, 30) } }); // 2.5.0: signed in, the username is the name
      a.addEvents(drafts).then(function () { a.startHatch(); ui.main(); a.syncNow('egg').catch(function () {}); });
    }, 'primary');
    var others = a.groupPids().filter(function (k) { return k !== a.pid; });
    screen([h('div', { cls: 'logo' }, eggCanvas(U.hash32(eggId), 6)), h('h2', { text: 'You found an egg!' }),
      h('p', { text: 'Give it a name and tap Begin to crack it open. Write in your journal, check off your quests, and it will grow up knowing you.' }),
      others.length || a.prof.tid || a.prof.pname ? h('p', { cls: 'small', text: 'Profile: ' + a.profName() + ' (' + (a.profKind() === 'business' ? 'business' : 'personal') + '). A fresh start: its own egg, journal, tiles, plan and account cards.' }) : null,
      field('Name your egg', n), a.prof.u ? h('p', { cls: 'small', text: 'It will call you ' + (a.S.callMe || Wd.cap(a.prof.u)) + ', your username.' }) : field('What should it call you?', me), m, go,
      h('p', { cls: 'small', text: 'Have a capsule from before? Open it here instead of a new egg.' }),
      importCapsuleRow(function (f) { return a.importCapsule(f).then(function (r) { if (!a.S.egg) throw new Error('That capsule has no egg in it.'); ui.snack('Imported ' + r.added + ' events.'); ui.main(); }); }, 'Open a backup into this profile'),
      others.length ? btn('Back to ' + a.profName(others[0]), function () { a.openProfile(others[0]); }, 'ghost') : null]);
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
  var TABS = [['world', 'World'], ['quests', 'Quest'], ['journal', 'Log'], ['accounts', 'Accounts'], ['shop', 'Shop']]; /* 2.5.0: the Shop (the Corner Mart) */ // 2.4.0: World first (Aiu's place, the meters and the ticker); Plan lives at the top of Quest // 2.0: icons only, in the header (Settings is the fifth). Inventory is a pinned tile on the Quest board
  var ICONS = {
    talk: ['0 0 8 8', 'M0 1h8v5H3L1 8V6H0zM2 3v1h1V3zM4 3v1h1V3zM6 3v1h1V3z'],
    world: ['0 0 8 8', 'M3 0h2v1h1v1h1v1h1v1H7v4H5V5H3v3H1V4H0V3h1V2h1V1h1z'],
    quests: ['0 0 8 8', 'M0 0h2v2H0zM3 0h5v2H3zM0 3h2v2H0zM3 3h5v2H3zM0 6h2v2H0zM3 6h5v2H3z'],
    planner: ['0 0 8 8', 'M2 0h1v1h2V0h1v1h2v7H0V1h2zM1 3v4h6V3zM2 4h2v2H2z'],
    library: ['0 0 8 8', 'M0 1h3v1h2V1h3v6H5v1H3V7H0zM1 2v4h2V2zM5 2v4h2V2z'],
    journal: ['0 0 8 8', 'M0 1h3v1h2V1h3v6H5v1H3V7H0zM1 2v4h2V2zM5 2v4h2V2z'],
    iching: ['0 0 8 11', 'M0 0h8v1H0zM0 2h3v1H0zM5 2h3v1H5zM0 4h8v1H0zM0 6h8v1H0zM0 8h3v1H0zM5 8h3v1H5zM0 10h8v1H0z'],
    accounts: ['0 0 8 8', 'M2 0h4v1h1v3H6V1H2v3H1V1h1zM0 4h8v4H0zM3 5v2h2V5z'],
    finance: ['0 0 8 8', 'M2 0h4v1h1v1h1v4H7v1H6v1H2V7H1V6H0V2h1V1h1zM3 2v4h2V2z'],
    inventory: ['0 0 8 8', 'M0 1h8v2H0zM1 3h6v5H1zM3 4v1h2V4z'],
    shop: ['0 0 8 8', 'M0 0h8v1H0zM0 1h1v2H0zM2 1h1v2H2zM4 1h1v2H4zM6 1h1v2H6zM1 3h6v5H4V5H3v3H1z']
  };
  /* 2.0.0: no emoji anywhere. Little pixel-art icons instead (drawn as SVG, so they stay crisp at any text size). */
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
    bone: ['.......', 'ww...ww', '.wwwww.', 'ww...ww', '.......'],
    drop: ['...i...', '..iii..', '.iiiii.', '.iicii.', '..iii..'],
    pad: ['.......', '.kkkkk.', 'kwkkkrk', 'wwwkkkk', 'kwkkrkk', '.kk.kk.'],
    tree: ['..ggg..', '.ggggg.', 'gglgggg', 'ggggglg', '.ggggg.', '...W...', '..WWW..'],
    home: ['...r...', '..rrr..', '.rrrrr.', 'rrrrrrr', '.WWWWW.', '.WWkWW.', '.WWkWW.'],
    note: ['...bb.', '...bbb', '...b.b', '...b..', '.bbb..', 'bbbb..', '.bb...'],
    person: ['..kkk..', '..kak..', '..kkk..', '.kkkkk.', 'k.kkk.k', '..k.k..', '..k.k..'],
    folder: ['WWW....', 'WaaWWWW', 'Waaaaaa', 'Waaaaaa', 'Waaaaaa', 'WWWWWWW'],
    card: ['kkkkkkkk', 'kiiiiiik', 'kwkkwwwk', 'kwkkwSSk', 'kiiiiiik', 'kkkkkkkk'],
    shop: ['.bwbwbw.', 'bwbwbwbw', 'kkkkkkkk', 'kwwkkiik', 'kwwkkiik', 'kwwkkkkk', 'kkkkkkkk'],
    token: ['.ooooo.', 'oyyyyyo', 'oyywyyo', 'oywwwyo', 'oyywyyo', 'oyyyyyo', '.ooooo.'],
    speaker: ['...k....', '..kk..k.', 'kkkk.k.k', 'kkkk.k.k', 'kkkk.k.k', '..kk..k.', '...k....']
  };
  // 2.0.8: did the tap land on the pet (outdoors) or the computer (indoors)? That opens the mini games.
  ui.hubHit = function (e) { var h0 = ui.hitAt(e); return !!(h0 && (h0.kind === 'buddy' || h0.kind === 'computer')); }; // 2.3.0: from the property's hit test
  ui.hitAt = function (e) { var v = app().view; return v && v.sc && A.hitAt ? A.hitAt(ui.worldPt(e), v.sc) : null; };
  ui.pix = function (name, cls) {
    var rows = PIX[name] || PIX.star, w = 0, paths = {};
    rows.forEach(function (r, y) { w = Math.max(w, r.length); for (var x = 0; x < r.length; x++) { var c = r.charAt(x); if (c !== '.') paths[c] = (paths[c] || '') + 'M' + x + ' ' + y + 'h1v1h-1z'; } });
    var sz = Math.max(w, rows.length), svg = '<svg viewBox="' + ((w - sz) / 2) + ' ' + ((rows.length - sz) / 2) + ' ' + sz + ' ' + sz + '" shape-rendering="crispEdges" aria-hidden="true">' + Object.keys(paths).map(function (c) { return '<path fill="' + PIXC[c] + '" d="' + paths[c] + '"/>'; }).join('') + '</svg>';
    var sp = h('span', { cls: 'pix' + (cls ? ' ' + cls : '') }); sp.innerHTML = svg; return sp;
  };
  function icon(k) { var d = ICONS[k]; return '<svg viewBox="' + d[0] + '" width="22" height="22" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="' + d[1] + '"/></svg>'; }
  ui.canvas = function () { return ui.onMain ? els.canvas : null; };
  /* 2.4.0: one small "play page" icon instead of a speaker on every card. Tap it: Aiu reads a short summary of the page
     you're on, in his voice. Tap again to stop. (The old Listen buttons and tap-to-hear are in _archive/removed-2.4.0.txt.) */
  var SPK_LINE = '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 9a4 4 0 0 1 0 6"/><path d="M19 6.5a7.5 7.5 0 0 1 0 11"/></svg>';
  var SPK_STOP = '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z"/><rect x="16" y="9" width="6" height="6" fill="currentColor"/></svg>';
  function clip(t, n) { t = String(t || '').replace(/\s+/g, ' ').trim(); if (t.length <= n) return t; var c = t.slice(0, n), i = Math.max(c.lastIndexOf('. '), c.lastIndexOf('! '), c.lastIndexOf('? ')); return i > n * 0.4 ? c.slice(0, i + 1) : c + '...'; }
  function sentences(t, n) { var m = String(t || '').replace(/\s+/g, ' ').match(/[^.!?]+[.!?]+/g) || [t]; return m.slice(0, n).join(' ').trim(); }
  ui.pageSpeech = function () {
    var a = app(), S = a.S, T = AIU.tiles, PN = AIU.panels, d = U.today(); if (!S) return '';
    if (ui.tab === 'world') return AIU.life ? AIU.life.lines().join(' ') : '';
    if (ui.tab === 'quests') {
      var q = ui.questOpen && S.quests[ui.questOpen];
      if (q && T) { var steps = C.questSteps(S, q), left = steps.filter(function (x) { return !x.done; }); return [q.title + '.', T.whenText(q, false) + '.', steps.length ? (left.length ? left.length + ' of ' + steps.length + ' left: ' + left.slice(0, 5).map(function (x) { return x.title; }).join(', ') + '.' : 'Every step is done!') : 'No steps yet.', q.why ? q.why : ''].join(' '); }
      var it = ui.todayItems(), tiles = T ? T.list(S).filter(function (x) { return T.status(S, x, d) !== 'done'; }) : [];
      return (it.length ? 'Today: ' + it.slice(0, 5).map(function (x) { return x.text.replace(/\.$/, ''); }).join('. ') + '.' : 'Nothing on the plan today.') + ' ' + (tiles.length ? 'You have ' + tiles.length + ' open tile' + (tiles.length === 1 ? '' : 's') + '.' : 'No open tiles.');
    }
    if (ui.tab === 'journal') {
      var st = PN.state || {};
      if (st.jday && st.readText) return clip(st.readText, 900);
      if ((ui.sub.journal || 'write') === 'book' && !st.jbook && PN.bookSpeech) return clip(PN.bookSpeech(), 900);
      if ((ui.sub.journal || 'write') !== 'book') { // 2.4.0: Log > Today, read as a little briefing (not the page title)
        var outL = [], hrs = U.wall(new Date(a.trueNow())).getHours();
        outL.push('Here\'s your day so far, ' + (S.callMe || 'friend') + '.');
        var ts2 = PN.todaySpeech && PN.todaySpeech(); outL.push(ts2 ? 'Today\'s reading: ' + ts2 : 'Today\'s coins haven\'t been tossed yet.');
        var js0 = (S.journal || S.journals || []).filter(function (e) { return (e.d || U.dayStr(new Date(e.t))) === d; });
        if (js0.length) outL.push('You wrote: ' + sentences(js0[js0.length - 1].data.text, 3)); else outL.push(hrs < 12 ? 'No entry yet today.' : 'No entry yet today. How did today go?');
        var dn = Object.keys(S.tdone || {}).filter(function (k0) { var r0 = S.tdone[k0]; return r0 && r0.done && U.dayStr(new Date(r0.t)) === d; }).length;
        if (dn) outL.push('You finished ' + dn + ' tile' + (dn === 1 ? '' : 's') + ' today.');
        return clip(outL.join(' '), 1100);
      }
    }
    // anything else: the page's headings and first lines, kept short
    var out = [], seen = 0; Array.prototype.forEach.call(els.panel.querySelectorAll('h3, p:not(.small):not(.formmsg), li'), function (el) { if (seen > 8 || el.closest('details:not([open]), .sheet')) return; var t = (el.textContent || '').trim(); if (t.length > 1) { out.push(sentences(t, 2)); seen++; } });
    return clip(out.length ? out.join(' ') : (els.ptitle.textContent || '') + '.', 900);
  };
  ui.readBtn = function () {
    var b = h('button', { type: 'button', cls: 'readpage', 'aria-label': 'Read this page aloud', title: 'Read this page aloud' });
    b.innerHTML = SPK_LINE;
    b.addEventListener('click', function (e) {
      e.stopPropagation(); var a = app(), on = a.readAloud(ui.pageSpeech() || 'Nothing to read here.');
      document.querySelectorAll('.readpage').forEach(function (x) { x.innerHTML = on ? SPK_STOP : SPK_LINE; x.setAttribute('aria-label', on ? 'Stop reading' : 'Read this page aloud'); });
      if (on) { var iv = setInterval(function () { if (!window.speechSynthesis || !speechSynthesis.speaking) { clearInterval(iv); document.querySelectorAll('.readpage').forEach(function (x) { x.innerHTML = SPK_LINE; x.setAttribute('aria-label', 'Read this page aloud'); }); } }, 500); }
    });
    return b;
  };
  ui.main = function () {
    var a = app();
    started();
    ui.onMain = true;
    var r = clear(root());
    document.documentElement.classList.remove('fullapp'); document.documentElement.classList.add('page3'); // 1.1.0 final: one page that scrolls like a website
    els.name = h('span', { cls: 'tname' }); els.stage = h('span', { cls: 'badge' });
    els.sync = h('button', { type: 'button', cls: 'pill', onclick: onPill });
    var gear = h('button', { type: 'button', cls: 'gear', 'data-label': 'Settings', 'aria-label': 'Settings', title: 'Settings', onclick: ui.settings });
    els.mute = h('button', { type: 'button', cls: 'gear mute', onclick: function () { a.setMute(!a.dev.mute); if (!a.dev.mute) { a.beep('chirp'); a.speak('Sound on!'); } ui.renderPanel(false); } });
    gear.innerHTML = '<svg viewBox="0 0 8 8" width="20" height="20" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M3 0h2v1h1v1h1v1h1v2H7v1H6v1H5v1H3V7H2V6H1V5H0V3h1V2h1V1h1zM3 3v2h2V3z"/></svg>';
    // tap Aiu = a pat on the back (a heart and a note, and a tiny bit of growth); he keeps working
    els.canvas = h('canvas', { width: A.W * (A.SCALE || 1), height: A.H * (A.SCALE || 1), cls: 'scene', role: 'button', tabindex: '0', 'aria-label': a.S.totemName + '\'s place. Tap him to pat him, tap the pet to look after it, tap a building to go there. Hold and drag to pick things up.', onclick: function (e) { sceneTap(e); },
      onkeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); a.pet(); } } });
    (function () { var last = 0; els.canvas.addEventListener('touchend', function (e) { var t = Date.now(); if (t - last < 350) { e.preventDefault(); if (e.changedTouches && e.changedTouches[0]) els.canvas.dispatchEvent(new MouseEvent('click', { clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY, bubbles: true })); } last = t; }, { passive: false }); })(); // 2.1.3: fast petting on iPhone: no zoom, every tap still counts
    rubbing(els.canvas);
    if (AIU.toy) AIU.toy.attach(els.canvas); // 2.3.0: hold and drag to pick things up
    // 2.1.7: the care bar under the world (tap the pet): Snack and Water as often as you like, Games, and how full it is
    els.care = h('div', { cls: 'care', hidden: true, role: 'group', 'aria-label': 'Look after your pet' });
    els.btext = h('span', { cls: 'btext' });
    els.bubble = h('div', { cls: 'emofloat', 'aria-live': 'polite' }, els.btext); // one emoji over Aiu's head
    els.fx = h('div', { cls: 'fx', 'aria-hidden': 'true' });
    els.nudge = h('div', { cls: 'nudge', hidden: true });
    els.badgeN = h('span', { cls: 'wbn', text: '0' });
    els.badge = h('button', { type: 'button', cls: 'wbadge', hidden: true, onclick: function () { ui.todaySheet(); } }, ui.pix('board'), els.badgeN);
    // 2.1.8: no door button: Aiu goes in and out on his own schedule
    // 2.0.3: Aiu's world full screen (the browser's full screen where it can; on iPhone the world fills the page instead). Tap again or Esc to leave
    els.full = h('button', { type: 'button', cls: 'wbtn fullbtn', 'aria-label': 'Full screen', title: 'Full screen', onclick: function () { ui.worldFull(!document.documentElement.classList.contains('worldfull')); } });
    els.full.innerHTML = FULL_ON;
    els.status = h('div', { cls: 'status ticker', 'aria-live': 'polite' }); // 2.3.0: a ticker under the world (what Aiu is doing, and a tip)
    els.track = h('button', { type: 'button', cls: 'trackline', hidden: true });
    // Aiu's two meters live in his scene: growth (heart) and Vitals (2.1.6: the average of his five body parts)
    els.bar = h('div', { cls: 'bar' }, h('i', { cls: 'conf' }), h('i', { cls: 'pend' }));
    els.glabel = h('span', { cls: 'sr' });
    els.gbar = h('div', { cls: 'gbar' }, h('i'));
    els.gglabel = h('span', { cls: 'sr' });
    els.gval = h('b', { cls: 'sval' }); els.vval = h('b', { cls: 'sval' }); // 2.7.0: each meter is a button: an icon key, its bar, its number
    var mGrow = h('button', { type: 'button', cls: 'smeter wicon grow', onclick: function () { growthSheet(); } }, h('span', { cls: 'sico' }, ui.pix('heart')), els.bar, els.gval, els.glabel);
    var mGaba = h('button', { type: 'button', cls: 'smeter wicon gaba', onclick: function () { AIU.panels.openVitals(); } }, h('span', { cls: 'sico' }, ui.pix('leaf')), els.gbar, els.vval, els.gglabel); // 2.1.9: a leaf for Vitals (it was a V)
    els.mGrow = mGrow; els.mGaba = mGaba;
    els.banner = h('div', { cls: 'banner' });
    els.ptitle = h('h2', { cls: 'ptitle' });
    els.pacts = h('div', { cls: 'pacts' }); els.pextra = h('div', { cls: 'pextra', hidden: true });
    els.psub = h('div', { cls: 'psub', role: 'tablist', 'aria-label': 'Pages in this menu' });
    els.panel = h('div', { cls: 'pbody', role: 'tabpanel', tabindex: '-1' });
    els.pfoot = h('div', { cls: 'pfoot' });
    if (ui.tab === 'library') ui.tab = 'journal';
    if (ui.tab === 'planner') ui.tab = 'quests';
    if (!TABS.some(function (t) { return t[0] === ui.tab; })) ui.tab = 'world'; // 2.4.0: the app opens on World
    // 2.0 layout, top to bottom: the icon header (sticky), Aiu's world, Aiu's pick (the line that links you to what's next), the work area
    gear.setAttribute('aria-label', 'Settings'); gear.removeAttribute('title');
    els.sync = h('span', { cls: 'sdot', 'aria-hidden': 'true' }); gear.appendChild(els.sync);
    els.tabs = h('nav', { cls: 'hicons', role: 'tablist', 'aria-label': 'Menu' }, TABS.map(function (t) {
      var b = h('button', { type: 'button', role: 'tab', 'data-tab': t[0], 'data-label': t[1], 'aria-label': t[1], title: t[1], onclick: function () { ui.go(t[0]); } });
      b.innerHTML = icon(t[0]);
      return b;
    }).concat([gear]));
    els.toast = h('div', { cls: 'toast', role: 'alert' });
    // 2.9.0: one section under the picture: what Aiu is doing (the status line), then four icon buttons: in / out, growth,
    // Vitals and tokens (each with its bar or number, no words). The full screen button shows only in full screen.
    els.doorIco = h('span', { cls: 'sico' }, ui.pix('home'));
    els.doorBtn = h('button', { type: 'button', cls: 'wicon door', 'aria-label': 'Go inside', title: 'Go inside', onclick: function () { if (els.doorBtn.getAttribute('aria-disabled') === 'true') return ui.snack(app().S.totemName + ' is resting. He\'ll come and go when he wakes up.'); var v = app().view && app().view.sc; if (v) app().houseTap(!!(v.indoor || A.isRoom(v))); if (ui.statusTick) ui.statusTick(v); } }, els.doorIco, h('span', { cls: 'wdot', 'aria-hidden': 'true' })); // 2.7.0: in or out, without hunting for the door
    var tok = AIU.life ? AIU.life.chip() : null; if (tok) tok.classList.add('wicon');
    els.wbar = h('div', { cls: 'wpanel' }, els.status, h('div', { cls: 'wicons', role: 'group', 'aria-label': 'Go in or out, growth, Vitals and tokens' }, els.doorBtn, mGrow, mGaba, tok), h('div', { cls: 'wbtns' }, els.full));
    els.world = h('section', { cls: 'world', 'aria-label': a.S.totemName }, h('div', { cls: 'stage' }, els.canvas, els.fx, els.bubble, h('button', { type: 'button', cls: 'sr', text: 'Play a game (the dice pick one)', onclick: function () { AIU.games.roll(); } }), els.boardSr = h('button', { type: 'button', cls: 'sr', text: 'Bounty board: today\'s list', onclick: function () { ui.todaySheet(); } })),
      els.wbar, els.care, /* 2.9.0: the status and the four buttons in one card right under the picture */ els.nudge, els.banner);
    els.panel2 = h('section', { cls: 'panel2' }, h('div', { cls: 'phead' }, els.ptitle, els.pacts, els.pread = ui.readBtn()), els.pextra, els.psub, els.panel, els.pfoot);
    var firstMain = !document.querySelector('.app2');
    r.appendChild(h('div', { cls: 'app2' },
      h('header', { cls: 'top' }, els.tabs, h('span', { cls: 'sr' }, els.name, ' ', els.stage)),
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
      h('ul', null, h('li', { text: 'A journal entry of 80+ letters: +10' }), h('li', { text: 'A quest step done: +2' }), h('li', { text: 'A Vitals check-in (a calm thing you did): +2' }), h('li', { text: 'Vitals at 90%: +10 (once a day)' }),
        h('li', { text: 'Answering one of ' + S.totemName + '\'s suggestions: +2' }), h('li', { text: 'Petting: +1 for every 10 pets (up to 3 a day)' })),
      h('p', { cls: 'small', text: 'Time wears on ' + S.totemName + '\'s Vitals. If they run down (the leaf bar turns red and the drone blinks), he\'s distressed: he carries on but looks tired and doesn\'t grow, until you do something calm in real life (brush your teeth, drink water, take a walk) and check it in: tap the drone in the sky.' })]);
  }
  // Go to a menu (and optionally one of its sub-pages)
  ui.sub = {};
  ui.go = function (tab, sub) {
    if (tab === 'library' || tab === 'talk') tab = 'journal';
    if (tab === 'planner') { tab = 'quests'; sub = null; ui.questOpen = null; } // 2.4.0: Plan is the top of Quest
    if (tab === 'finance') { tab = 'accounts'; sub = null; if (AIU.panels) { AIU.panels.state.aview = 'profile'; AIU.panels.state.psub = 'finance'; AIU.panels.state.folder = null; AIU.panels.state.doc = null; AIU.panels.state.person = null; } } // 2.2.0: Finance lives in Accounts > your profile
    if (tab === 'journal' && (sub === 'profiles' || sub === 'me')) { tab = 'accounts'; sub = null; if (AIU.panels) { AIU.panels.state.aview = 'profile'; AIU.panels.state.psub = sub === 'me' ? 'you' : null; } }
    if (tab === 'quests' && sub && sub !== 'big') { tab = 'inventory'; sub = null; } // 1.x lists: the shopping list is the Inventory tile now
    if (tab === 'inventory') { tab = 'quests'; sub = null; var sq = AIU.tiles && AIU.tiles.list(app().S).filter(function (x) { return AIU.tiles.isShop(x); })[0]; if (sq) { ui.questOpen = sq.key; ui.keepQuest = true; } } // 2.1.1: your first shopping list tile, if you have one
    if (tab === 'journal' && ui.tab === 'journal' && !sub && AIU.panels) { AIU.panels.state.jday = null; AIU.panels.state.jview = null; }
    if (tab === 'journal' && sub && sub !== 'pages' && AIU.panels) { var J = AIU.panels.state; J.jday = null; J.jview = null; J.jfromToday = false; } // a link to Today / Journal / Profiles lands there, not on an old day
    if (ui.tab === 'accounts' && tab !== 'accounts' && AIU.panels && AIU.panels.lockVault) AIU.panels.lockVault(true);
    if (tab === 'quests' && !sub && !ui.keepQuest) ui.questOpen = null; // the Quest icon always opens the board
    ui.tab = tab; if (sub) ui.sub[tab] = sub; ui.keepQuest = false;
    renderPanel(true); markTabs(); ui.refresh();
    if (tab === 'world') { window.scrollTo(0, 0); ui.k && ui.k.clear && null; return; }
    if (els.panel2) { var hd = document.querySelector('.app2 .top'), top = els.panel2.getBoundingClientRect().top + window.scrollY - (hd && getComputedStyle(hd).position === 'sticky' ? hd.offsetHeight : 0) - 6; if (window.scrollY > top) window.scrollTo(0, top); }
  };
  // 2.4.0: after 10 minutes with no taps, the app goes back to World (Aiu's place)
  var IDLE_MS = 10 * 60000; ui.lastTouch = Date.now();
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (ev) { document.addEventListener(ev, function () { ui.lastTouch = Date.now(); }, { passive: true, capture: true }); });
  function idleBack() { if (!ui.onMain || ui.tab === 'world' || document.querySelector('.sheet, .gov, .bov')) return; var ae = document.activeElement; if (ae && /INPUT|TEXTAREA|SELECT/.test(ae.tagName) && ae.value) return; ui.go('world'); }
  setInterval(function () { if (Date.now() - ui.lastTouch > IDLE_MS) idleBack(); }, 20000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden && Date.now() - ui.lastTouch > IDLE_MS) { idleBack(); ui.lastTouch = Date.now(); } });
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
    if (els.doorBtn && sc) { // 2.9.0: an icon: the house to go in, a tree to go out; it pulses while he's on his way and dims while he sleeps
      var inn = !!(sc.indoor || (A.isRoom && A.isRoom(sc))), tr = app().trip, going = !!(tr && tr.dir === 'go'), lab = going ? (tr.indoor ? 'Heading out' : 'Heading in') : inn ? 'Go outside' : 'Go inside', ico = (going ? !tr.indoor : !inn) ? 'home' : 'tree';
      if (els.doorBtn.getAttribute('aria-label') !== lab) { els.doorBtn.setAttribute('aria-label', lab); els.doorBtn.title = lab; }
      if (els.doorIco.getAttribute('data-ico') !== ico) { els.doorIco.setAttribute('data-ico', ico); els.doorIco.innerHTML = ''; els.doorIco.appendChild(ui.pix(ico)); }
      els.doorBtn.classList.toggle('going', going);
      var off = !app().S.hatched || sc.act === 'sleep' || sc.mode === 'sleepy' || sc.place === 'library'; els.doorBtn.setAttribute('aria-disabled', off ? 'true' : 'false');
    }
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
    els.stage.title = S.skinForm !== S.form ? 'Wearing the Stage ' + (S.skinForm && S.skinForm.stage) + ' look. Change it in Settings > Aiu & pet > Look.' : '';
    var sc = a.sceneState(), w = sc.weatherInfo, wtxt = w.source === 'guess' ? '' : ' · ' + w.label + (w.temp !== undefined ? ' ' + w.temp + '°' + w.units : '') + (w.stale && w.source === 'live' ? ' (' + w.ago + ')' : '');
    if (a.hatching) els.status.textContent = 'The egg is cracking!';
    else if (!S.hatched) els.status.textContent = (sc.eggProgress > 0.9 ? 'The egg is cracking!' : 'Hatches in ' + a.fmtDur(S.hatchAt - a.trueNow())) + wtxt;
    else { var tips = ['Tap the pet, then Play!', 'Hold Aiu to pick him up.', 'Drag Aiu to the outhouse, the cart or the board.', 'Tap the drone for Vitals.', 'Tap the board: Aiu tells you the day.']; els.status.textContent = 'is ' + sc.actLabel + (sc.indoor && sc.place === 'home' && sc.act !== 'sleep' ? ' inside' : '') + wtxt + ' · ' + tips[Math.floor(Date.now() / 20000) % tips.length]; }
    els.status.setAttribute('data-name', S.totemName);
    if (els.canvas) els.canvas.setAttribute('aria-label', 'Pet ' + S.totemName + '. ' + els.status.textContent);
    // growth bar
    var g = S.growth, conf = els.bar.children[0], pend = els.bar.children[1];
    if (!S.hatched) {
      conf.style.width = Math.round(sc.eggProgress * 100) + '%'; pend.style.width = '0';
      els.glabel.textContent = 'Egg · growth ' + Math.floor(g.confirmed + g.pending); els.gval.textContent = Math.round(sc.eggProgress * 100) + '%';
    } else {
      var span = Math.max(1, g.stageNext - g.stageFloor), have = Math.max(0, g.confirmed - g.stageFloor);
      conf.style.width = Math.min(100, have / span * 100) + '%';
      pend.style.width = Math.max(0, Math.min(100 - have / span * 100, g.pending / span * 100)) + '%';
      els.gval.textContent = Math.min(100, Math.floor(have / span * 100)) + '%';
      els.glabel.textContent = 'Growth ' + Math.floor(Math.min(have, span)) + '/' + span + ' to ' + C.stageName(S.stage + 1) + (g.pending >= 1 ? ' (+' + Math.floor(g.pending) + ' at sync)' : '') + ' · today ' + Math.floor(g.today) + '/' + g.cap;
    }
    els.mGrow.setAttribute('aria-label', els.glabel.textContent + '. What helps it grow.'); els.mGrow.title = els.glabel.textContent;
    // Vitals (2.1.6): red when Aiu is distressed (worn down: tired, not growing)
    if (AIU.vitals && S.hatched) {
      var vs = AIU.vitals.state(S);
      els.gbar.firstChild.style.left = vs.avg + '%';
      els.gbar.setAttribute('aria-label', 'Vitals ' + vs.avg + ' of 100');
      els.gglabel.textContent = S.totemName + ' Vitals ' + vs.avg + '% · ' + AIU.vitals.word(vs); els.vval.textContent = vs.avg + '%';
      els.mGaba.setAttribute('aria-label', els.gglabel.textContent + '. Open Vitals.'); els.mGaba.title = els.gglabel.textContent;
      els.mGaba.classList.toggle('red', vs.distressed); els.mGrow.classList.toggle('red', vs.distressed);
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
    else if (!a.prof.local && old < a.trueNow() - 3 * 86400000) { b = 'Not synced for ' + Math.floor((a.trueNow() - old) / 86400000) + ' days. Get online soon, or save a capsule to be safe.'; act = ['Save a capsule', function () { AIU.profiles.backups(); }]; }
    else if (a.sync.clockWarn) b = 'This device\'s clock looks off by ' + Math.abs(a.sync.clockWarn) + ' min. Aiu is using the server\'s time.';
    else if (g.full) b = 'Growth bar full! Sync to evolve.';
    else if (g.readyAtSync) b = a.prof.local ? '' : (a.sync.state === 'ok' ? 'Evolving...' : 'Ready to evolve! Get online and sync.');
    else if (offgrid && S.unsent) { b = 'Off-grid: ' + S.unsent + ' change' + (S.unsent === 1 ? ' is' : 's are') + ' only on this device until you sync.'; act = ['Save a capsule', function () { AIU.profiles.backups(); }]; }
    clear(els.banner);
    if (b) { els.banner.appendChild(h('span', { text: b })); if (act) els.banner.appendChild(btn(act[0], act[1], 'mini')); }
    els.banner.style.display = b ? '' : 'none';
    if (force || lastVersion !== a.version) { lastVersion = a.version; renderPanel(false); }
  };
  var _refresh = ui.refresh; ui.refresh = function (force) { var r = _refresh.apply(this, arguments); if (AIU.vitals) AIU.vitals.maybeReward(); if (AIU.places && (force || Date.now() - (ui._pdots || 0) > 5000)) { ui._pdots = Date.now(); try { AIU.places.refreshDots(); } catch (e) {} } return r; }; // 2.1.5: Vitals 100% pays once a day
  ui.refreshSync = function () { updatePill(); ui.refresh(); };
  /* ---------- 2.1.1: the Today badge (it replaces the Aiu's pick line) ----------
     A small counter in Aiu's world. It counts only what matters today: a reminder ringing, bills due, today's plan,
     tiles due today, the I Ching and the daily GABA standup. Tap it for the list; "Hide for today" hides it until
     something new comes up. No filler, no constant suggestions. */
  ui.boardIx = 0;
  function todayItems(a, S) {
    var out = [], now = a.trueNow(), d = U.dayStr(new Date(now)), wall = U.wall(new Date(now)), nowHM = U.p2(wall.getHours()) + ':' + U.p2(wall.getMinutes()), PL = AIU.planner, PN = AIU.panels, T = AIU.tiles;
    var c24 = C.setting(S, 'clock24', false);
    function openTile(k) { return function () { ui.openQuest(k); ui.toPanel(); }; }
    if (!S.hatched) return [];
    if (a.popup) out.push({ k: 'ring:' + a.popup.key + a.popup.day, ring: true, icon: 'clock', text: a.popup.o.title + ' · ' + U.fmtHm(a.popup.o.time, c24), go: ['Done', function () { a.reminderDone(); }] });
    if (PL) PL.billsDue(S, d, 1).filter(function (bd) { return bd.day <= d; }).forEach(function (bd) {
      out.push({ k: 'bill:' + bd.p.key + bd.day, icon: 'coin', text: bd.p.title + (bd.p.amount ? ' ' + PL.money(bd.p.amount) : '') + (bd.late ? ' is past due.' : ' is due today.'),
        go: ['Finance', function () { ui.go('finance'); if (bd.p.folder && bd.p.folder !== PL.ME) { PN.state.folder = bd.p.folder; PN.state.bsub = 'finance'; ui.renderPanel(true); } ui.toPanel(); }] });
    });
    if (PL) PL.dayItems(S, d).forEach(function (it) {
      if (it.done || it.kind === 'income' || it.kind === 'expense' || it.kind === 'bill') return;
      if (a.popup && it.key === a.popup.key) return;
      if (it.src === 'iching') return; // part of the Daily Hilltop
      if (/^tile-/.test(it.key || '')) return; // a tile's own reminder: the tile is listed below
      out.push({ k: 'day:' + it.key, icon: it.src === 'task' ? 'clock' : 'calendar', text: it.title + (it.time ? (it.time < nowHM ? ' was at ' : ' at ') + U.fmtHm(it.time, c24) : ' today') + '.', go: ['Plan', function () { ui.go('planner'); ui.toPanel(); }] });
    });
    if (T) T.list(S).forEach(function (q) {
      if (T.isStarter(q) || T.isShop(q) || T.doneNow(S, q, d)) return;
      var o = T.occurrence(q, d), w = T.tile(q).when || {};
      if (w.t === 'any' && q.state !== 'done') { out.push({ k: 'tile:' + q.key + 'any', icon: T.isCalm(q) ? 'leaf' : 'flag', text: q.title + ' · any time.', go: ['Open', openTile(q.key)] }); return; } // 2.1.13: "any time" tiles are on the board every day until they're done
      if (!o.due || !o.day || w.t === 'window') return;
      if (o.day < d && T.repeats(q)) return;
      out.push({ k: 'tile:' + q.key + o.p, icon: T.isCalm(q) ? 'leaf' : 'flag', text: q.title + (o.day < d ? ' was due ' + U.fmtDay(o.day) : o.slot ? ' · ' + U.fmtHm(o.slot, c24) : w.time ? ' · ' + U.fmtHm(w.time, c24) : ' · today') + '.', go: ['Open', openTile(q.key)] });
    });
    if (AIU.vitals && AIU.vitals.state(S).distressed) out.push({ k: 'vitals' + d + ':' + Math.floor(now / 10800000), icon: 'leaf', text: S.totemName + ' is worn out. Check in a calm thing you did.', go: ['Vitals', function () { PN.openVitals(); }] });
    // 2.1.10: no reminder to cast the I Ching: you cast it when you open Log > Today
    return out;
  }
  ui.todayItems = function () { var a = app(); return a.S ? todayItems(a, a.S) : []; };
  var badgeSig = '';
  function doorLabel(a) { var v0 = a.view && a.view.sc, inside = !!(v0 && v0.indoor); if (!els.door) return; var t = inside ? 'Go outside' : 'Go inside'; if (els.door.title !== t) { els.door.title = t; els.door.setAttribute('aria-label', t); els.door.classList.toggle('in', inside); } }
  setInterval(function () { if (ui.onMain && app().S) doorLabel(app()); }, 1000);
  // 2.1.7: where a tap landed in the world, in world pixels
  ui.worldPt = function (e) {
    var v = app().view, cv = els.canvas; if (!v || !cv) return null;
    var r = cv.getBoundingClientRect(); if (!r.width) return null;
    var k = Math.min(r.width / A.W, r.height / A.H), ox = r.left + (r.width - A.W * k) / 2, oy = r.top + (r.height - A.H * k) / 2; // 2.4.0: the picture can be letterboxed (the tall dollhouse)
    return { x: v.sx + (e.clientX - ox) / k / v.z, y: v.sy + (e.clientY - oy) / k / v.z };
  };
  // 2.3.0: one hit test for the whole property (world.js): what's on top under your finger
  function boardHit(e) { var h0 = ui.hitAt(e); return !!(h0 && h0.kind === 'board'); }
  ui.boardHit = boardHit;
  function houseHit(e) { var h0 = ui.hitAt(e); return !!(h0 && (h0.kind === 'door' || (h0.kind === 'landmark' && h0.id === 'house'))); }
  ui.houseHit = houseHit;
  function aiuHit(e) { var h0 = ui.hitAt(e); return !!(h0 && h0.kind === 'aiu'); }
  var swallow = 0, tiredAsk = 0;
  function sceneTap(e) {
    var a = app(); unlockSoon();
    if (Date.now() < swallow) return; // that was a rub, not a tap
    if (AIU.toy && (AIU.toy.holding() || Date.now() - AIU.toy.justDropped < 400)) return; // you were carrying something
    var hit = ui.hitAt(e), sc = a.view && a.view.sc;
    if (!a.S || !a.S.hatched || a.hatching) { if (!hit || hit.kind === 'aiu') return a.pet(); if (hit.kind === 'landmark') return AIU.toy.visit(hit.id); return; } // 2.1.10: still an egg (or hatching): just a wobble
    if (!hit) return;
    if (hit.kind === 'drone') return ui.vitalsPop(); // the Vitals drone in the sky
    if (hit.kind === 'board') return AIU.life ? AIU.life.standup() : ui.todaySheet(); // 2.4.0: Aiu comes over and tells you the day
    if (hit.kind === 'aiu') { a.pet(); if (AIU.vitals && AIU.vitals.distressed(a.S) && Date.now() - tiredAsk > 90000) { tiredAsk = Date.now(); setTimeout(ui.vitalsSheet, 500); } return; }
    if (hit.kind === 'computer') return AIU.games.hub();
    if (hit.kind === 'buddy') { if (AIU.play) AIU.play.pet(); return ui.careBar(true); } // the pet: look after it, and all the games
    if (hit.kind === 'door') { a.peek = { until: Date.now() + 15 * 60000 }; a.beep('door'); return; } // look out at the yard (he stays in his room)
    if (hit.kind === 'animal') { a.beep('chirp'); try { ui.hearts(1); } catch (x) {} return; }
    if (hit.kind === 'cart') { var cs = a.view && a.view.sc; if (cs && cs.act === 'hibachi') { a.react('happy'); a.beep('chirp'); return; } a.beep('knock'); ui.k.snack(a.S.totemName + '\'s food cart. He cooks here at lunch and dinner when the weather is nice.'); return; } // 2.4.0: it's part of his routine (a tap doesn't drag him out of bed)
    if (hit.kind === 'landmark') return AIU.toy.visit(hit.id);
    if (hit.kind === 'pond') { a.beep('splash'); return; }
    if (hit.kind === 'oddity') { a.beep('chirp'); ui.k.snack('Look! ' + hit.odd.name.charAt(0).toUpperCase() + hit.odd.name.slice(1) + '.'); a.react('happy'); return; }
  }
  function unlockSoon() { try { app().unlock(); } catch (x) {} }
  // rub = drag side to side over the pet or Aiu (up and down still scrolls the page)
  function rubbing(cv) {
    var d = null;
    cv.addEventListener('pointerdown', function (e) { var a0 = app(); if (!a0.S || !a0.S.hatched || a0.hatching) { d = null; return; } var h0 = ui.hitAt(e); d = { x: e.clientX, y: e.clientY, n: 0, who: h0 && h0.kind === 'buddy' ? 'buddy' : h0 && h0.kind === 'aiu' ? 'aiu' : null, rub: false }; });
    cv.addEventListener('pointermove', function (e) {
      if (!d || !d.who || (AIU.toy && AIU.toy.holding())) return;
      d.n += Math.abs(e.clientX - d.x); d.x = e.clientX;
      if (d.n > 24) d.rub = true;
      if (!d.rub || !AIU.play) return;
      if (d.who === 'buddy') AIU.play.rub(); else { AIU.play.aiuRub(); var a = app(); if (Date.now() - (d.pt || 0) > 900) { d.pt = Date.now(); a.petCount(); } }
    });
    function end() { if (d && d.rub) swallow = Date.now() + 400; d = null; }
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end); cv.addEventListener('pointerleave', end);
  }
  ui.careBar = function (open) {
    var a = app(), S = a.S, c = els.care, k = ui.k; if (!c || !S) return;
    if (!open) { c.hidden = true; return; }
    var b = A.buddyOf(S.accentSeed, C.setting(S, 'buddy', 'auto')), nm = C.setting(S, 'buddyName', '') || A.BUDDIES[b].replace(/ \(.*\)$/, ''); // 2.2.0: the pet's own name
    function meter(lbl, v) { return h('span', { cls: 'cmeter', role: 'img', 'aria-label': lbl + ' ' + (v >= 100 ? 'full' : v + '%') }, h('span', { text: lbl }), h('i', null, h('b', { style: 'width:' + v + '%' })), h('span', { cls: 'cfull', text: v >= 100 ? 'Full' : '' })); }
    function draw() {
      var lv = AIU.play.levels(); clear(c);
      c.appendChild(h('div', { cls: 'crow' },
        h('button', { type: 'button', cls: 'cbtn', onclick: function () { AIU.play.snack(); bump(); } }, ui.pix('bone'), h('span', { text: 'Snack' })),
        h('button', { type: 'button', cls: 'cbtn', onclick: function () { AIU.play.water(); bump(); } }, ui.pix('drop'), h('span', { text: 'Water' })),
        h('button', { type: 'button', cls: 'cbtn play', onclick: function () { ui.careBar(false); AIU.games.roll(); } }, ui.pix('pad'), h('span', { text: 'Play' })), // 2.4.0: the dice pick a game
        h('button', { type: 'button', cls: 'cbtn cx', 'aria-label': 'Close', onclick: function () { ui.careBar(false); } }, h('span', { text: 'X' }))));
      c.appendChild(h('div', { cls: 'crow cm' }, h('b', { cls: 'cname', text: nm }), meter('Tummy', lv.tummy), meter('Water', lv.water)));
    }
    function bump() { clearTimeout(ui._careT); ui._careT = setTimeout(function () { ui.careBar(false); }, 45000); }
    AIU.play.onChange = function () { if (!c.hidden) draw(); };
    draw(); c.hidden = false; bump();
  };
  // 2.1.13: Aiu Vitals as a pop-up (tap the drone in the sky, or the leaf bar): close it and you're back where you were
  ui.vitalsPop = function () {
    var a = app(), V = AIU.vitals, s, body = h('div', { cls: 'vpop' }), lastS = null;
    if (!V || !a.S || !a.S.hatched) return;
    function draw() { lastS = a.S; clear(body); V.view(body, { redraw: draw }); }
    s = ui.k.sheet(a.S.totemName + ' Vitals', [body]);
    body.addEventListener('click', function () { setTimeout(function () { if (s.isConnected && a.S !== lastS) draw(); }, 350); }); // something you tapped changed his Vitals: show it
    draw();
  };
  // 2.1.7: Aiu is worn out: tap him and he asks one Vitals question right here
  ui.vitalsSheet = function () {
    var a = app(), V = AIU.vitals, s; if (!V || !a.S) return;
    var body = h('div');
    function fill() { clear(body); body.appendChild(V.checkCard(a.S, U.today(), function () { var st = V.state(a.S); if (!st.distressed) { s.remove(); ui.k.snack(a.S.totemName + ' perks up!'); a.setMode('jump', 900); } else fill(); }, function () { s.remove(); })); }
    s = ui.k.sheet(a.S.totemName + ' is worn out', [h('p', { cls: 'small', text: 'Calm things you really do fill his Vitals back up.' }), body,
      h('div', { cls: 'row' }, btn('All Vitals', function () { s.remove(); AIU.panels.openVitals(); }, 'ghost'))]);
    fill();
  };
  function gabaNudge(a, S) { // (kept name) draws the badge
    var b = els.badge; if (!b) return;
    var items = todayItems(a, S), d = U.dayStr(new Date(a.trueNow())), hide = a.local.badgeHide || {};
    var hidden = hide.d === d ? hide.keys || [] : [];
    var vis = items.filter(function (x) { return x.ring || hidden.indexOf(x.k) < 0; }), ring = items.some(function (x) { return x.ring; });
    var sig = vis.length + '|' + ring; if (sig === badgeSig) return; badgeSig = sig;
    b.hidden = !vis.length; b.classList.toggle('ring', ring); app().boardInfo = { n: vis.length, ring: ring }; if (els.boardSr) els.boardSr.textContent = 'Bounty board: ' + vis.length + ' thing' + (vis.length === 1 ? '' : 's') + ' today' + (ring ? ', a reminder is ringing' : ''); // 2.1.11: drawn on the bounty board in the world
    els.badgeN.textContent = String(vis.length);
    try { if (navigator.setAppBadge) { if (a.dev.badge !== false && vis.length) navigator.setAppBadge(vis.length); else navigator.clearAppBadge(); } } catch (e) {} // 2.3.0: today's count on the app icon
    b.setAttribute('aria-label', 'Today: ' + vis.length + ' thing' + (vis.length === 1 ? '' : 's') + (ring ? ', a reminder is ringing' : '') + '. Open the list.');
  }
  ui.todaySheet = function (intro) {
    var a = app(), S = a.S, k = ui.k, s, items = todayItems(a, S), d = U.dayStr(new Date(a.trueNow()));
    var rows = items.map(function (it) {
      return h('div', { cls: 'trow' + (it.ring ? ' ring' : '') }, h('span', { cls: 'nicon', 'aria-hidden': 'true' }, ui.pix(it.icon)), h('span', { cls: 'ttext', text: it.text }),
        it.go ? btn(it.go[0], function () { s.remove(); it.go[1](); setTimeout(function () { ui.refresh(); }, 150); }, it.ring ? 'primary mini' : 'mini') : null);
    });
    s = k.sheet('Bounty board: today', [intro && intro.length ? h('div', { cls: 'brief' }, h('span', { cls: 'bface', 'aria-hidden': 'true' }, ui.pix('happy')), h('div', { cls: 'btxt' }, intro.map(function (t) { return h('p', { text: t }); })), ui.readBtn()) : null, // 2.4.0: the speaker reads the stand-up
      rows.length ? h('div', { cls: 'tlist' }, rows) : intro && intro.length ? null : h('p', { text: 'Nothing else today. ' + S.totemName + ' is happy.' })]); // 2.1.13: Close dismisses it (no Hide for today)
    s.classList.add('tsheet');
  };
  ui.refreshBoard = function () { badgeSig = ''; if (app().S) gabaNudge(app(), app().S); };
  ui.boardRestart = function () { ui.refreshBoard(); if (els.badge) { els.badge.classList.remove('flash'); void els.badge.offsetWidth; els.badge.classList.add('flash'); } };
  function updatePill() { // 2.0: a small dot on the Settings icon (details in Settings)
    if (!ui.onMain || !els.sync) return;
    var a = app(), st = a.sync.state, n = a.S ? a.S.unsent : 0, t, cls;
    if (a.prof.local) { t = 'This device only'; cls = 'local'; }
    else if (st === 'syncing') { t = 'Syncing'; cls = 'busy'; }
    else if (st === 'login') { t = 'Log in to sync'; cls = 'bad'; }
    else if (st === 'offline') { t = 'Offline' + (n ? ', ' + n + ' waiting' : ''); cls = 'off'; }
    else if (st === 'error') { t = 'Sync error'; cls = 'bad'; }
    else { t = n ? n + ' waiting to sync' : 'Synced'; cls = n ? 'off' : 'ok'; }
    els.sync.className = 'sdot ' + cls; ui.syncText = t + (a.sync.err ? ' (' + a.sync.err + ')' : '');
    var g = els.sync.parentNode; if (g) g.setAttribute('aria-label', 'Settings. ' + t);
  }

  var bubbleTimer = null;
  ui.bubble = function (iconName, label) { // one pixel icon pops up over Aiu's head (2.0.0: no emoji)
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
    var a = app(), sc = a.sceneState(), pos = A.actorPosP ? A.actorPosP(sc) : A.actorPos(sc);
    return { x: Math.round(pos.x / A.W * 100), y: Math.max(4, Math.round((pos.y - 30 * (pos.s || 1)) / A.H * 100)) };
  }
  ui.hearts = function (n, kinds) {
    if (!els.fx) return; var p = actorPct();
    for (var i = 0; i < (n || 3); i++) (function (i) {
      var e = h('span', { cls: 'heart', style: 'left:calc(' + p.x + '% + ' + ((i - 1) * 16) + 'px);top:' + (p.y + 8) + '%;animation-delay:' + (i * 120) + 'ms' });
      e.appendChild(ui.pix(kinds ? kinds[i % kinds.length] : 'heart')); els.fx.appendChild(e); setTimeout(function () { e.remove(); }, 1400 + i * 120);
    })(i);
  };
  // 2.1.15: a pat on the back - a heart and a music-box note float up; Aiu keeps doing what he's doing
  var patSide = 0;
  ui.pat = function () { patSide = 1 - patSide; ui.hearts(2, patSide ? ['heart', 'note'] : ['note', 'heart']); };
  /* ---------- voice and ears ---------- */
  ui.heard = function (text, final) { if (els.input && document.activeElement !== els.input && !draftTimer) els.input.value = final ? '' : text; };
  // What Aiu heard waits in the box for a moment: tap the box to fix it, or it sends itself.
  var draftTimer = null;
  ui.refreshVoice = function () {
    var a = app(); if (!els.mute) return;
    var muted = !!a.dev.mute;
    els.mute.setAttribute('aria-pressed', muted ? 'true' : 'false');
    els.mute.setAttribute('aria-label', muted ? 'Sound is off. Tap to turn sound and Aiu\'s voice on' : 'Sound is on. Tap to turn it off');
    els.mute.title = muted ? 'Sound off' : 'Sound on';
    els.mute.innerHTML = muted ? SPK_OFF : SPK_ON;
  };
  var FULL_ON = '<svg viewBox="0 0 8 8" width="18" height="18" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M0 0h3v1H1v2H0zM5 0h3v3H7V1H5zM0 5h1v2h2v1H0zM7 5h1v3H5V7h2z"/></svg>';
  var FULL_OFF = '<svg viewBox="0 0 8 8" width="18" height="18" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M2 0h1v3H0V2h2zM5 0h1v2h2v1H5zM0 5h3v3H2V6H0zM5 5h3v1H6v2H5z"/></svg>';
  ui.worldFull = function (on) {
    var de = document.documentElement, b = els.full;
    de.classList.toggle('worldfull', !!on);
    if (b) { b.innerHTML = on ? FULL_OFF : FULL_ON; b.setAttribute('aria-label', on ? 'Leave full screen' : 'Full screen'); b.title = b.getAttribute('aria-label'); }
    try {
      if (on && !document.fullscreenElement && de.requestFullscreen) de.requestFullscreen().catch(function () {});
      else if (on && de.webkitRequestFullscreen && !document.webkitFullscreenElement) de.webkitRequestFullscreen();
      else if (!on && document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {});
      else if (!on && document.webkitFullscreenElement && document.webkitExitFullscreen) document.webkitExitFullscreen();
    } catch (e) {}
  };
  function fsChange() { if (!document.fullscreenElement && !document.webkitFullscreenElement && document.documentElement.classList.contains('worldfull')) ui.worldFull(false); }
  document.addEventListener('fullscreenchange', fsChange); document.addEventListener('webkitfullscreenchange', fsChange);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && document.documentElement.classList.contains('worldfull')) ui.worldFull(false); });
  var SPK_ON = '<svg viewBox="0 0 10 8" width="24" height="20" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M0 3h2V2h1V1h1v6H3V6H2V5H0zM6 2h1v1h1v2H7v1H6V5h1V3H6zM8 1h1v1h1v4H9v1H8V6h1V2H8z"/></svg>';
  var SPK_OFF = '<svg viewBox="0 0 10 8" width="24" height="20" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M0 3h2V2h1V1h1v6H3V6H2V5H0zM6 2h1v1h1v1h1V3h1v1H9v1h1v1H9V5H8v1H7V5H6V4h1V3H6z"/></svg>';
  var MIC = '<svg viewBox="0 0 8 9" width="22" height="22" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M3 0h2v1h1v4H5v1H3V5H2V1h1zM0 3h1v2h1v1h4V5h1V3h1v2H7v1H6v1H5v1H3V7H2V6H1V5H0z"/></svg>';

  /* ---------- reminder pop-up ---------- */
  // 2.0: no pop-ups. A ringing reminder goes to the top of Aiu's pick line (with sound and voice from app.js)
  ui.showReminder = function () { ui.boardIx = 0; ui.boardKey = null; ui.refreshBoard(); document.title = '(!) ' + app().S.totemName + ' - Aiu Totem'; };
  ui.hideReminder = function () { if (ui.refreshBoard) ui.refreshBoard(); document.title = 'Aiu Totem'; };
  // A hexagram drawn with six bars (bottom line at the bottom). Solid = yang, broken = yin, highlighted = changing.
  function hexPic(vals, n) {
    var lines = vals && vals.length === 6 ? vals.map(function (v) { return { yang: v === 7 || v === 9, mv: v === 6 || v === 9 }; }) : AIU.iching.linesOf(n).map(function (b) { return { yang: !!b, mv: false }; });
    var info = AIU.iching.info(n), box = h('div', { cls: 'hex', role: 'img', 'aria-label': 'Hexagram ' + n + (info ? ', ' + info.name : '') });
    lines.slice().reverse().forEach(function (l) { box.appendChild(h('div', { cls: 'hl' + (l.yang ? '' : ' yin') + (l.mv ? ' mv' : '') }, l.yang ? h('i') : [h('i'), h('i')])); });
    return box;
  }
  ui.hexPic = hexPic;
  // 2.0: the reading isn't announced in a pop-up; it waits in Log > Today (the pick line links there until it's cast)
  ui.showReview = function () { if (ui.refreshBoard) ui.refreshBoard(); var PN = AIU.panels; if (PN && PN._hsRedraw) setTimeout(PN._hsRedraw, 50); if (ui.tab === 'journal') ui.renderPanel(true); };

  /* ---------- the panel ---------- */
  // Each menu fills: the title, its buttons (export...), sub-tabs, the scrolling body and (Talk only) the bottom bar.
  var SUBICON = { big: 'flag', lists: 'list', today: 'sun', pages: 'book', journal: 'book', iching: 'yin', me: 'person', profiles: 'person', cards: 'card', you: 'person', docs: 'folder', money: 'coin', write: 'pen', book: 'book', words: 'list', story: 'star' };
  ui.panelHead = function (title, actions, subs, cur, onSub) {
    els.ptitle.textContent = title;
    clear(els.pacts);
    // 2.1.1: no "More" menu. The main button sits in the header; any others are in a row right under it, always visible
    var acts = (actions || []).filter(Boolean);
    if (acts.length) els.pacts.appendChild(acts[0]);
    clear(els.pextra); els.pextra.hidden = acts.length < 2;
    acts.slice(1).forEach(function (b) { b.classList.add('mini'); els.pextra.appendChild(b); });
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
    if (els.pread) els.pread.hidden = ui.tab === 'accounts'; // 2.4.0: nothing worth hearing in Accounts
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
    if (!refocus && ui.lastAdd && Date.now() - ui.lastAdd.t < 4000) refocus = ui.lastAdd.ph; // even after a full redraw, the "Add" box keeps the keyboard
    if (refocus) { var again = els.panel.querySelector('input[data-addrow][placeholder="' + refocus.replace(/"/g, '') + '"]'); if (again) try { again.focus({ preventScroll: true }); } catch (e) {} }
  }
  ui.renderPanel = renderPanel;
  document.addEventListener('focusout', function () { setTimeout(function () { if (ui.dirty && ui.onMain) { var ae = document.activeElement; if (!(ae && els.panel && els.panel.contains(ae) && /INPUT|TEXTAREA|SELECT/.test(ae.tagName))) { ui.dirty = false; renderPanel(false); } } }, 200); });
  function c24() { return C.setting(app().S, 'clock24', false); }
  function empty(t) { return h('p', { cls: 'empty', text: t }); }
  function addRow(placeholder, onAdd, extra) {
    var i = inp({ placeholder: placeholder, autocapitalize: 'sentences', spellcheck: true, 'data-addrow': '1', 'aria-label': placeholder, enterkeyhint: 'next' });
    function go() { var v = i.value.trim(); if (!v) return; i.value = ''; ui.lastAdd = { ph: placeholder, t: Date.now() }; onAdd(v); try { i.focus(); } catch (e) {} } // 2.3.0: Enter adds it and you keep typing the next one (bananas, Enter, apples, Enter...)
    i.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); go(); } });
    return h('div', { cls: 'row addrow' }, i, extra || null, btn('Add', go, 'mini primary'));
  }

  /* ---------- Log (was Talk): Aiu's comm link. Every line can be fixed, deleted or heard again. ---------- */
  ui.openLine = null;
  // Tap-to-answer buttons for whatever Aiu just asked (the quiz, topic questions, yes/no offers, GABA)
  var B21 = { todo: ['Still to do', 'still need to do it'], goal: ['A goal', 'a goal'], remember: ['Remember it', 'remember it'], happened: ['Already happened', 'it already happened'], feeling: ['A feeling', 'about how i feel'], question: ['A question', 'a question'], chat: ['Just chatting', 'just chatting'] };

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
    opts = opts || {};
    var day = opts.day && opts.day < U.today() ? opts.day : null; // 2.2.0: an entry on an earlier day
    var a = app(), s, ta = h('textarea', { cls: 'jtext', rows: 9, placeholder: 'What happened today? How did it go? What are you working on? How do you feel?', value: entry ? entry.data.text : ui.jdraft || '' });
    var count = h('span', { cls: 'hint' }), note = h('p', { cls: 'small' });
    function upd() { if (!entry) ui.jdraft = ta.value; var n = ta.value.trim().length; count.textContent = n + ' letters' + (entry || day ? '' : n >= 80 ? ' · grows ' + a.S.totemName : ' · 80+ grows ' + a.S.totemName); }
    ta.addEventListener('input', upd); upd();
    var mic = h('button', { type: 'button', cls: 'btn mic', 'aria-label': 'Talk your entry (the microphone writes it down)', title: 'Talk your entry', 'aria-pressed': 'false', onclick: function () { if (dict) { stopDictation(); note.textContent = ''; } else startDictation(ta, mic, note); } });
    mic.innerHTML = MIC;
    var save = btn(entry ? 'Save changes' : 'Save entry', function () {
      var v = ta.value.trim(); if (!v) return;
      stopDictation(); s.remove();
      if (entry) { if (v !== entry.data.text) a.addEvents([{ type: 'journal_edit', data: { ref: entry.id, text: v } }], true).then(function () { a.react('save'); }); }
      else { ui.jdraft = ''; a.journal(v, day).then(function (r) { if (day) ui.snack('Added to ' + U.fmtDay(day) + '.'); if (r && r.mixed && AIU.panels.mixedAsk) setTimeout(function () { AIU.panels.mixedAsk(r.mixed); }, 900); }); }
    }, 'primary');
    s = sheet(entry ? 'Edit your entry from ' + U.fmtDay(entry.d) : day ? 'Entry for ' + U.fmtDay(day) : 'New journal entry', [
      entry ? h('p', { cls: 'small', text: 'Editing keeps the old version in the Totem\'s history.' }) : day ? h('p', { cls: 'small', text: 'This goes on the page for ' + AIU.panels.nice(day) + '. The book and your story update by themselves. (Only today\'s writing grows ' + a.S.totemName + '.)' }) : h('p', { cls: 'small', text: 'Type it, or tap the microphone and just talk. It goes on today\'s page. Writing is how ' + a.S.totemName + ' grows the most: +10 for 80+ letters.' }),
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
    var a = app(), P = AIU.persona, i = 0, votes = [], s, box = h('div'), before = ((a.S.traits || {}).quiz) || {};
    function show() { // 2.1.9: Back goes to the last question, and your earlier answer is marked
      clear(box);
      var q = P.QUIZ[i];
      if (!q) return finish();
      var had = before[q.id] ? before[q.id].v : null, mark = function (v, txt) { return (had === v ? '* ' : '') + txt; };
      box.appendChild(h('p', { cls: 'small', text: 'Question ' + (i + 1) + ' of ' + P.QUIZ.length + (had !== null ? ' · * = your answer last time' : '') }));
      box.appendChild(h('div', { cls: 'bar thin' }, h('i', { cls: 'conf', style: 'width:' + Math.round(i / P.QUIZ.length * 100) + '%' })));
      box.appendChild(h('h3', { text: q.q + '...' }));
      box.appendChild(h('div', { cls: 'quizopts' }, btn(mark(1, Wd.cap(q.a)), function () { pick(1); }, 'primary'), btn(mark(-1, Wd.cap(q.b)), function () { pick(-1); }, 'primary'), btn('Skip', function () { pick(0); }, 'ghost')));
      if (i > 0) box.appendChild(btn('< Back', function () { votes.pop(); i--; show(); }, 'ghost'));
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
  ui.openQuest = function (key) { ui.questOpen = key; ui.keepQuest = true; ui.go('quests'); ui.keepQuest = false; };
  function qprogress(S, q) { var st = C.questSteps(S, q), d = st.filter(function (x) { return x.done; }).length; return st.length ? d + '/' + st.length : 'no steps'; }
  function editReminder(key) {
    var a = app(), S = a.S, t = key ? S.tasks[key] : null, now = new Date(a.trueNow()), today = U.dayStr(now);
    var sib = key && S.tasks[key + '~2'] && !S.tasks[key + '~2'].off ? S.tasks[key + '~2'] : null; // 2.0.5: a second time the same day
    editSheet(t ? 'Edit reminder' : 'New reminder', [
      { label: 'What', value: t ? t.title : '' },
      { label: 'Time', value: t ? t.time : '18:00', type: 'time' },
      { label: 'Another time the same day (optional)', value: sib ? sib.time : '', type: 'time' },
      { label: 'Repeat', value: t ? (t.repeat || 'once') : 'once', options: { once: 'Once', daily: 'Every day', weekdays: 'Weekdays', weekends: 'Weekends' } }
    ], function (v) {
      v = [v[0], v[1], v[3], v[2]]; // (What, Time, Repeat, Another time)
      var title = Wd.cap(v[0].trim()); if (!title || !/^\d{2}:\d{2}$/.test(v[1])) return;
      var d = { key: key || M.slug(title), title: title, time: v[1], repeat: v[2], routine: t && t.routine, quest: t && t.quest };
      if (v[2] === 'once') d.date = (t && t.repeat === 'once' && t.date >= today) ? t.date : (U.hmToMin(v[1]) > U.minOfDay(now) ? today : U.addDays(today, 1));
      if (!key) d.key = M.keyFor(d.key, d);
      var evs = [{ type: 'task_set', data: d }];
      if (/^\d{2}:\d{2}$/.test(v[3] || '') && v[3] !== v[1]) { var d2 = Object.assign({}, d, { key: d.key + '~2', time: v[3] }); if (d2.repeat === 'once') d2.date = d.date; evs.push({ type: 'task_set', data: d2 }); }
      else if (S.tasks[d.key + '~2'] && !S.tasks[d.key + '~2'].off) evs.push({ type: 'task_off', data: { key: d.key + '~2', removed: true } });
      a.addEvents(evs).then(function () { a.addLine((t ? 'Updated: ' : 'Reminder set: ') + title + ' at ' + U.fmtHm(d.time, c24()) + '.'); });
    }, t ? iconBtn('Delete ' + t.title, 'Delete', function () { document.querySelector('.sheet').remove(); deleteReminder(key); }, 'del') : null);
  }
  function deleteReminder(k) {
    var a = app(), t = a.S.tasks[k]; if (!t) return;
    var back = { key: k, title: t.title, time: t.time, repeat: t.repeat, date: t.date, days: t.days, kind: t.kind, routine: t.routine, quest: t.quest };
    a.addEvents([{ type: 'task_off', data: { key: k, removed: true } }]).then(function () { snack('Deleted "' + t.title + '".', function () { a.addEvents([{ type: 'task_set', data: back }]); }); });
  }
  // One quest: objectives (the checklist) and its journal, like a game's quest log.

  /* Library: search, today's page, chapters (months) and pages (days), glossary, capsules */
  ui.lib = { month: null, day: null };
  function lc(s) { return String(s || '').toLowerCase(); }
  function journalCard(a, e) {
    return h('article', { cls: 'jentry' + (a.unsent.some(function (u) { return u.id === e.id; }) ? ' unsent' : '') },
      h('div', { cls: 'jmeta', text: U.fmtDay(e.d) + ' ' + U.fmtHm(e.h || '', c24()) + ' · ' + (e.dn || 'device') + (e.edited ? ' · edited' : '') }),
      h('div', { cls: 'jbody', text: e.data.text }),
      h('div', { cls: 'row wrap' }, btn('Edit', function () { ui.journalSheet(e); }, 'mini'), btn('Hide', function () { a.addEvents([{ type: 'journal_hide', data: { ref: e.id, hidden: true } }]); }, 'mini')));
  }
  /* ---------- the Journal: Hilltop pages ---------- */
  function pageOpts(a, day, events) {
    var ctx = a.ctx();
    return { today: ctx.today, nowMin: ctx.nowMin, clock24: c24(), wx: M.wxText(a.weatherNow(), c24()), events: events || a.S.chat };
  }
  function sec(title, kids) { return h('section', { cls: 'jsec' }, h('h4', { text: title }), kids); }
  // A day's page. opts.journal (the Journal tab): your entries and the I Ching first, the rest of the Hilltop View folded below.
  function copyText(text, status) {
    function fallback() { var ta = h('textarea', { rows: 10, value: text, readonly: true }); var s0 = sheet('Copy this', [h('p', { cls: 'small', text: 'Select all and copy.' }), ta]); setTimeout(function () { ta.focus(); ta.select(); }, 60); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { msg(status, 'Copied!'); }, fallback);
    else fallback();
  }
  // "Today's page" from anywhere (the chip, the pop-up)
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
    var a = app(), un = inp({ value: a.prof.disp || a.prof.u, autocomplete: 'username', 'aria-label': 'Username' }), pw = inp({ type: 'password', placeholder: 'password' }), m = h('p', { cls: 'formmsg' }), s;
    var go = btn('Log in', function () {
      busy(go, true, '...');
      var pid0 = a.pid; // 2.8.0: the username may have changed on another device; the same account keeps this device's copy
      a.login(un.value.trim().toLowerCase(), pw.value, un.value.trim(), { same: pid0 }).then(function () { a.prof = a.profiles[a.pid]; s.remove(); a.syncNow('relogin').catch(function () {}); }, function (e) { busy(go, false, 'Log in'); msg(m, e.message, true); });
    }, 'primary');
    s = sheet('Log in again', [h('p', { text: (a.sync.err && /private/.test(a.sync.err) ? a.sync.err + ' ' : 'Your password or username changed, or this device was logged out. ') + 'Nothing is lost: your changes are waiting on this device.' }), field('Username', un), field('Password', pw), m, go]);
  };

  ui.settings = function () {
    var a = app(), S = a.S, dev = a.dev, s;
    function devSet(k, v) { dev[k] = v; a.saveDev(); if (k === 'theme' || k === 'color') ui.applyTheme(); }
    // account
    var acct = []; // 2.4.0: just who's signed in, Log out and Change password (the old rows are in _archive/removed-2.4.0.txt)
    if (a.prof.local) {
      acct.push(h('p', { text: 'Not signed in. This Aiu is saved on this device only.' }));
      acct.push(h('div', { cls: 'row wrap' }, btn('Sign up to sync', function () { s.remove(); ui.signupScreen({ link: a.pid }); }, 'primary'), btn('Log in to sync', function () { s.remove(); ui.linkFrom = a.pid; ui.loginScreen(); })));
    } else {
      acct.push(h('p', null, 'Username: ', h('b', { text: S.callMe }), h('span', { cls: 'small', text: ' (' + S.totemName + ' calls you this. It\'s yours alone: no one else can have it.)' })));
      acct.push(h('p', { cls: 'small', text: 'Keep your password safe: it can\'t be reset, by anyone. A lost password means starting a new account.' })); // 2.7.0
      acct.push(h('p', { cls: 'small' }, h('b', { text: a.prof.dk ? 'Private sync is on. ' : 'Private sync needs your password once. ' }), a.prof.dk ? 'Everything is scrambled on your devices before it goes to the server, with a key only your password opens. The server can\'t read your Totem, your journal or your tiles.' : 'Log out and in again on this device to turn it on.')); // 2.8.0
      acct.push(btn('Log out', function () { if (S.unsent && !confirm(S.unsent + ' changes have not synced yet. They stay safe on this device and sync next time you log in here. Log out?')) return; s.remove(); a.logout(); }, 'primary'));
      var oldp = inp({ type: 'password', placeholder: 'current' }), newp = inp({ type: 'password', placeholder: 'new, 8+ characters' }), pm = h('p', { cls: 'formmsg' });
      acct.push(h('details', null, h('summary', { text: 'Change password' }), field('Current password', oldp), field('New password', newp), pm,
        btn('Change', function () { var np = newp.value; if (np.length < 8) return msg(pm, 'Passwords need at least 8 characters.', true); a.changePassword(oldp.value, np).then(function () { msg(pm, 'Changed. Other devices will ask to log in again.'); }, function (e) { msg(pm, e.message, true); }); }, 'primary')));
      // 2.8.0: a new username (the old one becomes free for anyone)
      var nun = inp({ placeholder: 'new username', maxLength: 24, autocapitalize: 'words', autocomplete: 'off' }), unp = inp({ type: 'password', placeholder: 'your password' }), um = h('p', { cls: 'formmsg' });
      acct.push(h('details', null, h('summary', { text: 'Change username' }), h('p', { cls: 'small', text: 'Pick any username nobody has. Your old one becomes free for someone else right away. Your other devices will ask you to log in with the new one.' }),
        field('New username', nun, 'Letters, numbers, - or _ (3-24).'), field('Password', unp), um,
        btn('Change', function () {
          var v = nun.value.trim(), lc = v.toLowerCase();
          if (!/^[a-z0-9_-]{3,24}$/.test(lc)) return msg(um, 'Usernames are 3-24 letters, numbers, - or _.', true);
          a.renameAccount(lc, unp.value, v).then(function (nu) { msg(um, 'Done. You are ' + nu + ' now.'); ui.refresh(true); }, function (e) { msg(um, /taken/i.test(e.message) ? 'That name is taken. Try another.' : e.message, true); });
        }, 'primary')));
    }
    // totem
    var tn = inp({ value: S.totemName, maxLength: 24, enterkeyhint: 'done', autocapitalize: 'words' }), cm = inp({ value: S.callMe, maxLength: 30, enterkeyhint: 'done', autocapitalize: 'words' }), nmsg = h('span', { cls: 'small', 'aria-live': 'polite' });
    // 2.1.1: names save by themselves (Done / Enter, or leaving the box): no Save button to miss while the iPhone keyboard is up
    function saveNames() {
      var d = [], t = tn.value.trim(), c = cm.value.trim(), S0 = a.S;
      if (t && t !== S0.totemName) d.push({ type: 'set', data: { k: 'totemName', v: t.slice(0, 24) } });
      if (c && c !== S0.callMe) d.push({ type: 'set', data: { k: 'callMe', v: c.slice(0, 30) } });
      if (!t) tn.value = S0.totemName; if (!c) cm.value = S0.callMe;
      if (!d.length) return;
      a.addEvents(d).then(function () { nmsg.textContent = 'Saved.'; var sn = document.querySelector('.setname'); if (sn) sn.textContent = a.S.totemName; updatePill(); ui.refresh(true); });
    }
    [tn, cm].forEach(function (x) { x.addEventListener('change', saveNames); x.addEventListener('blur', saveNames); x.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); x.blur(); saveNames(); } }); });
    var forms = { current: 'Newest form (always)' }; S.forms.forEach(function (f) { forms[String(f.stage)] = 'Stage ' + f.stage + ' - ' + C.stageName(f.stage); });
    // 2.1.7: no preview of the stages to come: each evolution is a surprise
    var gearF = h('p', { cls: 'small', text: 'Pet gear (a collar, a saddle, a backpack) is in the Shop now, on the Pet gear shelf. The collar and the saddle are free.' }); // 2.6.0 (the old menu: _archive/removed-2.6.0.txt)
    function gearShow() { gearF.hidden = !!A.NOGEAR[A.buddyOf(a.S.accentSeed, C.setting(a.S, 'buddy', 'auto'))]; }
    gearShow();
    var G0 = AIU.places && AIU.places.garageState ? AIU.places.garageState(S) : { kind: null };
    var totem = [
      h('p', null, h('b', { cls: 'setname', text: S.totemName }), ' · ' + (els.stage ? els.stage.textContent : '')),
      S.nameIsUser ? h('div', { cls: 'row2' }, field('Totem name', tn), h('div', { cls: 'field' }, h('span', { cls: 'flabel', text: 'It calls you' }), h('b', { text: S.callMe }), h('span', { cls: 'hint', text: 'Your username. Each username belongs to one account.' }))) : h('div', { cls: 'row2' }, field('Totem name', tn), field('It calls you', cm)),
      h('p', { cls: 'small' }, 'Names save by themselves when you tap Done. ', nmsg),
      h('div', { cls: 'row2' }, field('House', sel(A.HOUSES, C.setting(S, 'house', 'cabin'), function (v) { a.setSetting('house', v); })),
        field('World', sel(A.BIOMES, C.setting(S, 'biome', 'meadow'), function (v) { a.setSetting('biome', v); }))),
      field('Which look', sel(forms, C.setting(S, 'skin', 'current'), function (v) { a.setSetting('skin', v); }), 'Only changes how it looks. It keeps growing and evolving underneath.'),
      field('Creature type', sel(Object.assign({ auto: 'Random, picked by its egg (' + A.kindName(S.accentSeed, 'auto') + ')' }, A.KINDS, { classic: 'Classic (the 1.0.5 look)' }), C.setting(S, 'ckind', 'auto'), function (v) { a.setSetting('ckind', v).then(function () { }); }), 'Every egg hatches into a random type, and it evolves within that type. Change it here any time. How it grows stays a surprise: every evolution rolls its own colors and markings.'),
      field('Pet', sel(Object.assign({ auto: 'Random, picked by its egg (' + A.BUDDIES[A.buddyOf(S.accentSeed, 'auto')].replace(/ \(.*\)$/, '') + ')' }, A.BUDDIES), C.setting(S, 'buddy', 'auto'), function (v) { a.setSetting('buddy', v).then(gearShow); }), 'It waits in the yard. Tap it to feed it, give it water, or tap Play: the dice pick a game.'),
      gearF,
      (function () { // 2.2.0: the pet's name (saves when you tap Done or leave the box)
        var bn = inp({ value: C.setting(S, 'buddyName', ''), maxLength: 24, placeholder: 'e.g. Mochi', enterkeyhint: 'done', autocapitalize: 'words' });
        function saveBn() { var v = bn.value.trim().slice(0, 24); if (v !== C.setting(a.S, 'buddyName', '')) a.setSetting('buddyName', v).then(function () { nmsg.textContent = 'Saved.'; }); }
        bn.addEventListener('change', saveBn); bn.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); bn.blur(); } });
        return field('Pet\'s name', bn, 'Leave it empty to just call it by its kind.');
      })(),
      // 2.4.0: the ride picker is on standby with the garage (see _archive/removed-2.4.0.txt)
      field('In your journal, you are', sel({ they: 'they / their', he: 'he / his', she: 'she / her' }, C.setting(S, 'pronoun', 'they'), function (v) { a.setSetting('pronoun', v); }), 'Tiles are written into your journal as sentences, like "' + (S.callMe || 'You') + ' finished their shopping list."')
    ]; // 2.3.0: the "Vitals from my journal" setting is gone (calm things are checked in Vitals only)
    // 2.1.7: Aiu's voice: creature babble (default), a real voice from this device, or silent
    var voiceSel = h('select', { 'aria-label': 'Which real voice' });
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
    var voiceF = field('Which real voice', voiceSel);
    function voiceShow() { voiceF.hidden = (dev.voiceMode || 'babble') !== 'voice'; }
    voiceShow();
    var remMsg = h('span', { cls: 'small', 'aria-live': 'polite' });
    var look = [
      h('div', { cls: 'row wrap' }, btn(dev.mute ? 'Sound: off (tap to turn on)' : 'Sound: on (tap to turn off)', function (e) { a.setMute(!a.dev.mute); if (!a.dev.mute) { a.unlock(); a.beep('chirp'); } e.target.textContent = a.dev.mute ? 'Sound: off (tap to turn on)' : 'Sound: on (tap to turn off)'; }, 'primary soundbtn')), // 2.2.0: the sound switch lives here now
      field('Style', sel({ toy: 'Toy box (bright and bubbly)', retro: 'Retro (paper and ink)' }, dev.style || 'toy', function (v) { devSet('style', v); ui.applyTheme(); })),
      h('div', { cls: 'row2' }, field('Theme', sel({ auto: 'Match my device', light: 'Light', dark: 'Dark' }, dev.theme, function (v) { devSet('theme', v); })),
        field('Color', sel({ classic: 'Classic', green: 'Green', blue: 'Blue', red: 'Red' }, dev.color || 'classic', function (v) { devSet('color', v); }))),
      field('Text size', sel({ normal: 'Normal', large: 'Large', huge: 'Extra large' }, dev.textSize || 'normal', function (v) { devSet('textSize', v); ui.applyTheme(); })),
      field(S.totemName + '\'s voice', sel({ babble: 'Creature babble', voice: 'A real voice (from this device)', off: 'Silent' }, dev.voiceMode || 'babble', function (v) { devSet('voiceMode', v); voiceShow(); a.hush(); a.speak('Hi ' + S.callMe + '!'); })),
      voiceF,
      field('Reaction pictures over ' + S.totemName, sel({ short: 'On', off: 'Off' }, dev.bubble === 'off' ? 'off' : 'short', function (v) { devSet('bubble', v); })),
      field('Animation', sel([['4', 'Energy saver'], ['8', 'Normal'], ['12', 'Smooth']], dev.fps, function (v) { devSet('fps', +v); })),
      h('h4', { text: 'Reminder sound' }),
      h('div', { cls: 'row2' }, field('Reminder sound', sel({ knock: 'Knock knock', ping: 'Ping', chirp: 'Chirp', off: 'Off' }, dev.sound, function (v) { devSet('sound', v); a.unlock(); if (v !== 'off') a.beep(v); remMsg.textContent = v === 'off' ? 'The reminder sound is off.' : ''; })),
        h('div', { cls: 'field' }, btn('Play it', function () { a.unlock(); if (dev.sound === 'off') remMsg.textContent = 'The reminder sound is Off.'; else a.beep(dev.sound); }, 'mini'))), remMsg
    ];
    var rem = [ // 2.3.0: notifications and the app badge (they work while Aiu is open; the badge shows today's count on the app icon)
      field('A reminder keeps trying for', sel({ '0.5': '30 seconds', '1': '1 minute', '5': '5 minutes', 'next': 'Until the next task' }, C.setting(S, 'lasts', '5'), function (v) { a.setSetting('lasts', v); })),
      window.Notification ? h('div', { cls: 'row wrap' }, btn(dev.notif ? 'Notifications: on' : 'Notifications: off', function (e) {
        if (dev.notif) { devSet('notif', false); e.target.textContent = 'Notifications: off'; return; }
        Notification.requestPermission().then(function (p) { devSet('notif', p === 'granted'); e.target.textContent = p === 'granted' ? 'Notifications: on' : 'Blocked: allow them in your device settings'; ui.refreshBoard(); });
      }, 'mini')) : null,
      field('Badge on the app icon', sel({ on: 'On: show how many things are on today\'s board', off: 'Off' }, dev.badge === false ? 'off' : 'on', function (v) { devSet('badge', v === 'on'); ui.refreshBoard(); }), 'The badge shows on the home-screen app (on iPhone, add Aiu to your Home Screen and turn on notifications).'),
      field('Greet me after I\'m away for', sel([['2', '2 min'], ['10', '10 min'], ['30', '30 min'], ['60', '1 hour']], dev.idleMin, function (v) { devSet('idleMin', +v); })),
      h('p', { cls: 'small', text: 'Reminders, sounds and pop-ups work while Aiu is open (a tab or the home-screen app).' })
    ];
    // world
    var tzNow = h('p', { cls: 'small' });
    function tzText() { // 2.1.11: time always follows this device's own clock and time zone (it knows where you are); the city is only for the weather
      var z = ''; try { z = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
      return 'Time: ' + U.fmtHm(U.hmStr(), C.setting(a.S, 'clock24', false)) + (z ? ' (' + z.replace(/_/g, ' ') + ')' : '') + ', from this device\'s clock. Aiu follows your device wherever you are' + (Math.abs(a.clockOffset || 0) > 120000 ? ', corrected by the server because this device\'s clock is off by ' + Math.round(Math.abs(a.clockOffset) / 60000) + ' min' : '') + '.';
    }
    tzNow.textContent = tzText();
    // 2.2.0: the location saves the moment it's found (Find, the keyboard's Go, or leaving the box), and shows what's saved
    var cur0 = C.setting(S, 'city', null), city = inp({ value: (cur0 || {}).name || '', placeholder: 'e.g. Atlanta, GA  or  33.75, -84.39', enterkeyhint: 'search', 'aria-label': 'Your city or coordinates' }), cm2 = h('p', { cls: 'formmsg' });
    var saved = h('p', { cls: 'small savedloc', 'aria-live': 'polite' });
    function showSaved(c) { saved.textContent = c && typeof c.lat === 'number' ? 'Saved: ' + c.name + ' (' + c.lat.toFixed(3) + ', ' + c.lon.toFixed(3) + '). All your devices use it.' : 'No location saved yet.'; }
    showSaved(cur0);
    function setPlace(c) {
      msg(cm2, 'Saving...');
      a.setSetting('city', c).then(function () {
        var back = C.setting(a.S, 'city', null);
        if (!back || back.lat !== c.lat) return msg(cm2, 'That didn\'t save. Try again.', true);
        showSaved(back); msg(cm2, 'Saved. Weather for ' + c.name + '.'); city.value = c.name;
        a.weather = null; a.updateWeather(true).then(function () { a.rebuild(true); tzNow.textContent = tzText(); var w0 = a.weather; if (w0 && w0.src === 'none') msg(cm2, 'Saved. Live weather only covers the US; outside it Aiu guesses from the season.'); });
      }, function (e) { msg(cm2, 'That didn\'t save: ' + (e && e.message || e), true); });
    }
    var lastTry = '';
    function find() {
      var v = city.value.trim(), cur = C.setting(a.S, 'city', null); if (!v || v === lastTry || (cur && v === cur.name)) return; lastTry = v;
      msg(cm2, 'Looking...');
      a.findCity(v).then(setPlace, function (e) { lastTry = ''; msg(cm2, e.message === 'City not found' ? 'Not in my list. Type your street address below (the US Census looks it up), your coordinates (like 35.09, -84.03), the nearest bigger town, or tap Use my location.' : 'Could not look that up.', true); });
    }
    city.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); city.blur(); find(); } });
    city.addEventListener('change', find);
    var addr = inp({ placeholder: 'e.g. 123 Main St, Atlanta, GA', autocapitalize: 'words', enterkeyhint: 'search', 'aria-label': 'Street address' });
    function findAddr() { var v = addr.value.trim(); if (!v) return; msg(cm2, 'Asking the US Census geocoder...'); a.censusLookup(v).then(function (c) { addr.value = ''; setPlace(c); }, function (e) { msg(cm2, e.message, true); }); }
    addr.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); addr.blur(); findAddr(); } });
    var world = [
      saved,
      h('div', { cls: 'row' }, city, btn('Find', function () { lastTry = ''; find(); }, 'mini')),
      h('div', { cls: 'row' }, btn('Use my location', function () {
        msg(cm2, 'Asking this device for its location...');
        a.myLocation().then(setPlace, function (e) { msg(cm2, e.message + (/iPhone|iPad/.test(navigator.userAgent) ? ' On iPhone: Settings > Privacy & Security > Location Services > Safari Websites > While Using.' : ''), true); });
      }, 'mini')), cm2,
      h('details', null, h('summary', { text: 'Small town? Look up a street address' }), h('p', { cls: 'small', text: 'The US Census Bureau\'s free, public geocoder finds the spot (only the address you type is sent, once). Aiu keeps the place, not the address.' }), h('div', { cls: 'row' }, addr, btn('Look up', findAddr, 'mini'))),
      h('div', { cls: 'row2' }, field('Units', sel({ F: '°F', C: '°C' }, C.setting(S, 'units', 'F'), function (v) { a.setSetting('units', v).then(function () { a.updateWeather(true); }); })),
        field('Seasons', sel({ north: 'Northern half', south: 'Southern half' }, C.setting(S, 'hemisphere', 'north'), function (v) { a.setSetting('hemisphere', v); }))),
      field('Clock', sel({ '0': '12-hour (6pm)', '1': '24-hour (18:00)' }, C.setting(S, 'clock24', false) ? '1' : '0', function (v) { a.setSetting('clock24', v === '1'); })),
      tzNow,
      h('p', { cls: 'small', text: 'Your city is only for the weather (and the seasons). Live weather comes from the US National Weather Service (free, public); outside the US, Aiu guesses from the season. Only the location is sent. Set it once: all your devices share it.' })
    ];
    // device
    var dn = inp({ value: dev.deviceName, maxLength: 40 });
    dn.addEventListener('change', function () { devSet('deviceName', dn.value.trim() || 'Device'); });
    var device = [field('This device\'s name', dn, 'Shown when this device changes something, like "Your iPhone moved your wake-up to 10am".')];
    // data
    // 2.5.0: Account & data is three parts: User info, Profiles (a drop-down to switch) and Capsules (they were Backups)
    var data = [
      h('p', { cls: 'small', text: S.total + ' things saved' + (S.unsent && !a.prof.local ? ' (' + S.unsent + ' waiting to sync)' : '') + ' · in this browser (' + AIU.store.kind + ')' }),
      h('p', { cls: 'small caution', text: a.prof.local ?
        'Careful: this Aiu lives only in this browser. Clearing browser data, a private window, or losing the device deletes it. Export a capsule now and then.' :
        'Off-grid caution: anything you do without internet is saved only in this browser until it syncs. Clearing browser data, a private window, uninstalling the app, or losing the device before a sync loses those changes. On iPhone, use the Home Screen app (Safari can clear websites that are not used for 7 days). Heading off-grid for a while? Sync first and export a capsule.' })
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
    var devToggle = btn('Hide developer tools', function () { devSet('devtools', false); devSec.hidden = true; }, 'ghost');
    var devSec = acc('set-dev', 'Developer', [devToggle, devbox], true); devSec.hidden = !(dev.devtools && a.cfg.devtools); devbox.classList.remove('hidden'); // 2.1.7: tap the version in Help & about 5 times
    var verTaps = 0, ver = h('p', { cls: 'small', text: 'Aiu Totem ' + a.cfg.version + ' by KODNA Network (KODNA.net). Free for personal, private use in your web browser: nothing is sold, no ads, and your Totem is only yours.', onclick: function () { if (!a.cfg.devtools) return; if (++verTaps >= 5) { devSet('devtools', true); devSec.hidden = false; verTaps = 0; } } }); // 2.6.0: only on a test copy (config.js devtools: true)
    // danger
    var ph = inp({ placeholder: 'type FORGET' }), dm2 = h('p', { cls: 'formmsg' });
    var danger = [
      h('details', null, h('summary', { text: 'Forget this device\'s copy' }),
        h('p', { cls: 'small', text: a.prof.local ? 'This deletes the only copy of this Totem unless you exported a capsule. Type FORGET to confirm.' : 'Removes the Totem from this browser only. Your account keeps it' + (S.unsent ? ', except ' + S.unsent + ' changes that have not synced yet' : '') + '. Type FORGET to confirm.' }),
        ph, dm2, btn('Forget this device\'s copy', function () { if (ph.value.trim() !== 'FORGET') return msg(dm2, 'Type FORGET exactly.', true); s.remove(); a.forgetDevice(); }, 'danger'))
    ];
    if (!a.prof.local) {
      var dpw = inp({ type: 'password', placeholder: 'password' }), dph = inp({ placeholder: 'DELETE ' + a.prof.u.toUpperCase() }), dm3 = h('p', { cls: 'formmsg' });
      danger.push(h('details', null, h('summary', { text: 'Delete my account' }),
        h('p', { cls: 'small', text: 'Permanently deletes your account and every profile in it (' + a.groupPids().map(function (k) { return a.profName(k); }).join(', ') + ') from the server (there are no server backups). Export a capsule first if you want to keep a copy. Type DELETE ' + a.prof.u.toUpperCase() + ' to confirm.' }),
        dpw, dph, dm3, btn('Delete my account', function () {
          a.api('delete_account', { u: a.prof.u, token: a.prof.token, pw: dpw.value, phrase: dph.value.trim() }).then(function () { s.remove(); a.forgetGroup(); }, function (e) { msg(dm3, e.message, true); });
        }, 'danger')));
    }
    // 2.0: what used to sit in the header: name, stage and type, sync status, and the sound switch
    var top0 = [ // 2.3.0: just the sync status up top (the name and stage are under Aiu & pet)
      h('p', { cls: 'small', text: 'Sync: ' + (ui.syncText || (a.prof.local ? 'This device only' : a.sync.state)) }),
      !a.prof.local ? h('div', { cls: 'row wrap' }, btn('Sync now', function () { a.syncNow('manual').then(function () { s.remove(); ui.settings(); }, function () { s.remove(); ui.settings(); }); })) : null
    ];
    // 2.0: the instructions book, and ONE PDF maker (check off what goes in; it remembers your picks on this device)
    var help = [h('p', { cls: 'small', text: 'How everything works, one chapter per part of the app.' }), btn('Open the instructions', function () { AIU.help.sheet(); }, 'primary')];
    var PN = AIU.panels, PL = AIU.planner, today0 = U.dayStr(new Date(a.trueNow())), mo0 = today0.slice(0, 7), biz = AIU.business.folders(S).map(function (f) { return f.name; });
    var OPTS = [['help', 'Instructions book'], ['tiles', 'Quest tiles (every tile, with its steps)'], ['plan', 'Plan: this month\'s calendar'], ['journal', 'Journal pages'], ['iching', 'I Ching readings'], ['gaba', 'Vitals log (this month)'], ['fin:', 'Finance: ' + a.profName() + ' (this month)']];
    OPTS.push(['biz:' + PL.ME, a.profName() + ': ID and documents'], ['ppl:' + PL.ME, a.profName() + ': résumés']); // 2.2.0: this profile
    biz.forEach(function (f) { OPTS.push(['fin:' + f, 'Finance: ' + f + ' (this month)']); OPTS.push(['biz:' + f, f + ' (older folder): profile and documents']); OPTS.push(['ppl:' + f, f + ' (older folder): résumés']); });
    OPTS.push(['cards', 'Account cards (shows your passwords)']);
    var pick = Object.assign({ tiles: true, journal: true }, a.local.pdfPick || {}), boxes = {};
    var range = sel({ today: 'Today', week: 'The last 7 days', month: 'This month', year: 'This year', all: 'Every page', custom: 'Pick dates...' }, a.local.pdfRange || 'month', function (v) { a.local.pdfRange = v; a.saveLocal(); showDates(); });
    var dFrom = inp({ type: 'date', value: a.local.pdfFrom || mo0 + '-01', 'aria-label': 'From' }), dTo = inp({ type: 'date', value: a.local.pdfTo || today0, 'aria-label': 'To' });
    dFrom.addEventListener('change', function () { a.local.pdfFrom = dFrom.value; a.saveLocal(); }); dTo.addEventListener('change', function () { a.local.pdfTo = dTo.value; a.saveLocal(); });
    var dates = h('div', { cls: 'row2 pdfdates' }, field('From', dFrom), field('To', dTo));
    function showDates() { dates.hidden = range.value !== 'custom'; }
    var okCards = h('input', { type: 'checkbox' }), pm2 = h('p', { cls: 'formmsg' });
    var pdfRows = OPTS.map(function (o) {
      var cb = h('input', { type: 'checkbox', checked: !!pick[o[0]], onchange: function () { pick[o[0]] = cb.checked; a.local.pdfPick = pick; a.saveLocal(); } }); boxes[o[0]] = cb;
      return h('div', { cls: 'pdfopt' }, h('label', { cls: 'item' }, cb, h('span', { cls: 'ititle', text: o[1] })),
        o[0] === 'journal' ? field('Which pages', range) : null, o[0] === 'journal' ? dates : null,
        o[0] === 'cards' ? h('label', { cls: 'item small' }, okCards, h('span', { cls: 'ititle', text: 'I understand: anyone who opens this PDF can read my passwords.' })) : null);
    });
    function makePdf(e) {
      var want = OPTS.filter(function (o) { return boxes[o[0]].checked; });
      if (!want.length) return msg(pm2, 'Check at least one thing.', true);
      if (boxes.cards.checked && !okCards.checked) return msg(pm2, 'Tick "I understand" under Account cards first (or uncheck it).', true);
      var b0 = e.target; busy(b0, true, 'Making the PDF...');
      var f0 = dFrom.value || '0000-00-00', t0 = dTo.value || '9999-99-99'; if (f0 > t0) { var sw = f0; f0 = t0; t0 = sw; }
      if (boxes.journal.checked && range.value === 'custom' && (!dFrom.value || !dTo.value)) { busy(b0, false, 'Make the PDF'); return msg(pm2, 'Pick both dates for the journal pages.', true); }
      var days = PN.allDays(S).filter(function (d) { var r = range.value; return r === 'all' || (r === 'custom' ? d >= f0 && d <= t0 : r === 'today' ? d === today0 : r === 'week' ? d >= U.addDays(today0, -6) : r === 'month' ? d.slice(0, 7) === mo0 : d.slice(0, 4) === today0.slice(0, 4)); });
      var rangeLabel = range.value === 'custom' ? PN.nice(f0) + ' to ' + PN.nice(t0) : { today: 'today', week: 'the last 7 days', month: 'this month', year: 'this year', all: 'every page' }[range.value];
      var parts = want.map(function (o) {
        var id = o[0];
        if (id === 'help') return AIU.help.doc();
        if (id === 'tiles') return PN.questsDoc(S);
        if (id === 'plan') return PN.agendaDoc(S, mo0);
        if (id === 'journal') return PN.journalDoc(days, rangeLabel);
        if (id === 'iching') return PN.readingsDoc(S);
        if (id === 'gaba') return PN.gabaDoc(S, mo0);
        if (id.indexOf('fin:') === 0) return PN.moneyDoc(S, mo0, id.slice(4));
        if (id.indexOf('biz:') === 0) return AIU.business.packetPdf(S, id.slice(4));
        if (id.indexOf('ppl:') === 0) { var rs = AIU.business.peopleDocs(S, id.slice(4)), bl = []; rs.forEach(function (r, i) { if (i) bl.push({ t: 'break' }); bl = bl.concat(r.blocks); }); return { title: 'People', blocks: bl.length ? bl : [{ t: 'p', text: 'No people yet.' }] }; }
        if (id === 'cards') return a.vaultCards().then(PN.cardsDoc);
        return null;
      });
      Promise.all(parts).then(function (docs) {
        var blocks = [{ t: 'title', text: S.totemName + ': Aiu Totem' }, { t: 'sub', text: 'Made ' + PN.nice(today0) + ' · ' + want.map(function (o) { return o[1].replace(/ \(.*\)$/, ''); }).join(', ') }];
        docs.forEach(function (d) { if (!d) return; blocks.push({ t: 'break' }); blocks = blocks.concat(d.blocks); });
        PN.savePdf({ title: 'Aiu Totem ' + today0, blocks: blocks }, 'aiu-' + today0);
        busy(b0, false, 'Make the PDF'); msg(pm2, 'Saved. Open it from your downloads to read or print it.');
      }, function (err) { busy(b0, false, 'Make the PDF'); msg(pm2, 'Could not make it: ' + (err && err.message || err), true); });
    }
    showDates();
    var pdfSec = [h('p', { cls: 'small', text: 'Check off what you want in one PDF, then make it. Good for printing or keeping on a USB drive.' })].concat(pdfRows, [pm2, btn('Make the PDF', makePdf, 'primary'),
      h('h4', { text: 'Your book' }), h('p', { cls: 'small', text: 'Your whole journal as a book, with you as the author (change the title in Log > Book).' }), btn('Save the book as a PDF', function (e) { PN.bookPdf(e.target); })]); // 2.3.0: every PDF lives here
    // 2.1.7: five folded groups instead of twelve sections
    function grp(id, title, kids) { return acc('set-' + id, title, kids, false); }
    function s0() { return { remove: function () { if (s) s.remove(); } }; } // the Settings sheet (made just below)
    s = sheet('Settings', [
      h('div', { cls: 'settop' }, top0),
      grp('aiu', S.totemName + ' & pet', totem),
      grp('look', 'Look & sound', look),
      grp('time', 'Reminders, weather & time', rem.concat([h('h4', { text: 'Weather & time' })], world)),
      grp('acct', 'Account & data', [h('h4', { text: 'User info' })].concat(acct, [h('h4', { text: 'Profiles' }), AIU.profiles.dropdown(s0()), h('h4', { text: 'Capsules' }), AIU.profiles.capsules()], data, [h('h4', { text: 'Danger zone' })], danger)),
      grp('pdf', 'Save as PDF', pdfSec), // 2.2.0: its own folded section
      grp('help', 'Help & about', help.concat([ver,
        h('p', { cls: 'small', text: 'Everything in Aiu is made by KODNA Network (https://KODNA.net) or is public domain: our own pixel fonts, creatures, pets, world, sounds and word lists; live weather is from the US National Weather Service (public domain). Colors: the Sweetie 16 palette.' }),
        h('p', { cls: 'small', text: 'Aiu is a little companion, not a counselor or a doctor. If you are ever in crisis, contact your local crisis hotline or emergency number (in the US, call or text 988). Please be safe.' })])),
      devSec
    ]);
  };
  // 1.1.0: the building blocks the menus (panels.js) share
  ui.k = { btn: btn, field: field, inp: inp, sel: sel, msg: msg, busy: busy, clear: clear, acc: acc, editSheet: editSheet, snack: snack, iconBtn: iconBtn, empty: empty, addRow: addRow,
    sheet: sheet, section: section, c24: c24, qprogress: qprogress, editReminder: editReminder, deleteReminder: deleteReminder,
    pageOpts: pageOpts, topicCard: topicCard, personaBox: personaBox, readingCard: readingCard, journalCard: journalCard, hexPic: hexPic, copyText: copyText, sec: sec };
})();
