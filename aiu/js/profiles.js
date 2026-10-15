/* AIU TOTEM 2.3.0 - profiles (and backups). One account (or one device) holds as many Aiu profiles as you like: you, your business,
   a side project. Each is its own Aiu with a fresh start: its own egg, journal, tiles, plan, ID, documents, Finance and
   account cards. One is open at a time; the others keep their own time (their Vitals and I Ching go on without you).
   The profile card sits at the top of Accounts (it used to be the "Me" card), under your username. */
(function () {
  'use strict';
  var U = AIU.util, h = U.h, ui = AIU.ui;
  var PF = AIU.profiles = {};
  function app() { return AIU.app; }
  function K() { return ui.k; }

  PF.avatar = function (pid) {
    var a = app(), kind = a.profKind(pid), nm = a.profName(pid);
    return h('span', { cls: 'avatar pav ' + kind, 'aria-hidden': 'true', text: String(nm || '?').charAt(0).toUpperCase() });
  };
  function who(a) { return a.prof && a.prof.u ? '@' + a.prof.u : 'This device'; }
  // The card at the top of Accounts: your username, the profile that's open, and the others one tap away
  PF.card = function () {
    var a = app(), k = K(), pids = a.groupPids(), S = a.S, st = AIU.panels.state;
    var main = h('button', { type: 'button', cls: 'acard mecard profcard', onclick: function () { st.aview = 'profile'; st.psub = null; ui.renderPanel(true); ui.toPanel(); } },
      PF.avatar(a.pid),
      h('span', { cls: 'acbody' }, h('b', { text: who(a) + ' · ' + a.profName() }),
        h('span', { cls: 'small', text: (a.profKind() === 'business' ? 'Business' : 'Personal') + ' profile' + (S && S.egg ? ' · ' + S.totemName : '') + '. ID, documents, Finance' + (a.profKind() === 'personal' ? ', personality' : '') })),
      h('span', { cls: 'tag', text: 'Open' }));
    var chips = h('div', { cls: 'chips profchips', role: 'group', 'aria-label': 'Profiles in this account' },
      pids.map(function (pid) {
        var on = pid === a.pid;
        return k.btn(a.profName(pid), function () { if (!on) PF.open(pid); }, 'chip' + (on ? ' on' : ''));
      }).concat([k.btn('+ Profile', function () { PF.newSheet(); }, 'chip ghost')]));
    return h('div', { cls: 'profwrap' }, main, chips);
  };
  PF.open = function (pid) {
    var a = app();
    document.querySelectorAll('.sheet').forEach(function (x) { x.remove(); });
    K().snack('Opening ' + a.profName(pid) + '...');
    a.openProfile(pid).then(function () { if (AIU.ui.onMain) { ui.go('world'); } }); // 2.5.0: you land in that Aiu's world
  };
  /* 2.5.0: Settings > Account & data > Profiles: one button that drops down your profiles. Tap one and you become it
     (back in its World); + Add a profile makes a new one. Copies of the same Aiu show a Combine button here. */
  PF.dropdown = function (sheet) {
    var a = app(), k = K(), pids = a.groupPids();
    var list = h('div', { cls: 'pdroplist', role: 'menu' });
    pids.forEach(function (pid) {
      var on = pid === a.pid;
      list.appendChild(h('div', { cls: 'pdrow' + (on ? ' on' : '') },
        h('button', { type: 'button', role: 'menuitem', cls: 'pdpick', onclick: function () { if (on) { dd.open = false; return; } if (sheet) sheet.remove(); PF.open(pid); } },
          PF.avatar(pid), h('span', { cls: 'ititle' }, h('b', { text: a.profName(pid) }), h('span', { cls: 'small', text: on ? ' open now' : ' ' + (a.profKind(pid) === 'business' ? 'business' : 'personal') }))),
        k.btn('Edit', function () { if (sheet) sheet.remove(); PF.editSheet(pid); }, 'mini ghost')));
    });
    list.appendChild(k.btn('+ Add a profile', function () { if (sheet) sheet.remove(); PF.newSheet(); }, 'primary'));
    // other Aius kept on this device (another account, or device-only), and copies of the same Aiu
    var mine = {}; pids.forEach(function (x) { mine[x] = 1; });
    var seenG = {}, other = Object.keys(a.profiles).filter(function (x) { var p = a.profiles[x]; if (mine[x] || p.linkedTo || p.gone || !(p.token || p.local)) return false; var g = a.groupOf(x); if (seenG[g]) return false; seenG[g] = 1; return true; });
    if (other.length) { list.appendChild(h('p', { cls: 'small', text: 'Also on this device:' })); other.forEach(function (x) { var p = a.profiles[x]; list.appendChild(h('div', { cls: 'pdrow' }, h('button', { type: 'button', cls: 'pdpick', onclick: function () { if (sheet) sheet.remove(); PF.open(x); } }, PF.avatar(x), h('span', { cls: 'ititle' }, h('b', { text: p.local ? a.profName(x) : '@' + (p.disp || p.u) }), h('span', { cls: 'small', text: p.local ? ' this device only' : ' another account' }))))); }); }
    var dup = h('div'); list.appendChild(dup);
    a.findDupes().then(function (groups) {
      groups.forEach(function (g) {
        var m0 = h('p', { cls: 'formmsg' });
        dup.appendChild(h('div', { cls: 'bcard' }, h('b', { text: g.name + ' is here ' + g.pids.length + ' times' }), h('p', { cls: 'small', text: 'Copies of the same Aiu. Combine them into one: nothing is lost.' }), m0,
          k.btn('Combine these', function (e) { var b0 = e.target; k.busy(b0, true, 'Combining...'); a.combine(g.pids).then(function () { if (sheet) sheet.remove(); k.snack('Combined into one ' + g.name + '.'); }, function (er) { k.busy(b0, false, 'Try again'); k.msg(m0, er.message, true); }); }, 'primary')));
      });
    }).catch(function () {});
    var dd = h('details', { cls: 'pdrop' }, h('summary', { cls: 'pdsum' }, PF.avatar(a.pid), h('span', { cls: 'ititle' }, h('b', { text: a.profName() }), h('span', { cls: 'small', text: ' ' + pids.length + ' profile' + (pids.length === 1 ? '' : 's') + ' · tap to switch' })), h('span', { cls: 'pdarrow', 'aria-hidden': 'true', text: '▾' })), list);
    return dd;
  };
  /* 2.5.0: Settings > Account & data > Capsules (they used to be called backups). Export one: this Aiu or all of them,
     with your Docs files if you like. Import one: Aiu looks inside first, and nothing you have is ever erased. */
  PF.capsules = function () {
    var a = app(), k = K(), pids = a.groupPids(), m = h('p', { cls: 'formmsg', 'aria-live': 'polite' }), look = h('div'), file = h('input', { type: 'file', accept: '.zip,.aiucap,.jsonl,application/zip,application/octet-stream', cls: 'hidden' });
    file.addEventListener('change', function () { var f = file.files[0]; if (!f) return; file.value = ''; PF.restore(f, look, m); });
    var nf = AIU.files ? AIU.files.count() : 0, withF = h('input', { type: 'checkbox' }), fl = nf ? h('label', { cls: 'check' }, withF, h('span', { text: ' Include my files (' + nf + ')' })) : null;
    // 2.6.0: a capsule holds your cards and files readable, so it's locked with a capsule password unless you say otherwise
    var lockOn = h('input', { type: 'checkbox', checked: true }), cpw = k.inp({ type: 'password', placeholder: 'a capsule password (8+)', autocomplete: 'new-password' }), cpw2 = k.inp({ type: 'password', placeholder: 'again', autocomplete: 'new-password' });
    var pwBox = h('div', { cls: 'row2' }, k.field('Capsule password', cpw), k.field('Again', cpw2));
    lockOn.addEventListener('change', function () { pwBox.hidden = !lockOn.checked; });
    function capPw() {
      if (!lockOn.checked) { if (!confirm('Without a password, anyone who gets this file can read your journal, cards and files. Save it unlocked anyway?')) return null; return ''; }
      if (cpw.value.length < 8) { k.msg(m, 'The capsule password needs at least 8 characters. You\'ll need it to open the capsule, so write it down.', true); return null; }
      if (cpw.value !== cpw2.value) { k.msg(m, 'The two capsule passwords don\'t match.', true); return null; }
      return cpw.value;
    }
    return h('div', { cls: 'capsules' },
      h('p', { cls: 'small', text: 'A capsule is your own copy of an Aiu in one .zip file. Keep it on your computer, a USB drive or a cloud folder.' }),
      fl, h('label', { cls: 'check' }, lockOn, h('span', { text: ' Lock it with a password (recommended)' })), pwBox,
      h('div', { cls: 'row wrap' }, k.btn('Export capsule', function (e) { var pw0 = capPw(); if (pw0 === null) return; var b0 = e.target; k.busy(b0, true, 'Making it...'); a.exportCapsule({ pw: pw0, files: withF.checked, onStep: function (i, n) { b0.textContent = 'Files ' + i + ' of ' + n + '...'; } }).then(function (n) { k.busy(b0, false, 'Export capsule'); k.msg(m, 'Saved ' + n + '.'); }, function (er) { k.busy(b0, false, 'Export capsule'); k.msg(m, er.message, true); }); }, 'primary'),
        pids.length > 1 ? k.btn('Export all ' + pids.length + ' profiles', function () { var pw0 = capPw(); if (pw0 === null) return; a.exportAllCapsule({ pw: pw0 }).then(function (r) { k.msg(m, 'Saved ' + r.name + ' (' + r.n + ' profiles).'); }, function (er) { k.msg(m, er.message, true); }); }) : null,
        k.btn('Import capsule', function () { file.click(); })),
      file, m, look,
      h('p', { cls: 'small', text: 'Importing looks inside first and tells you what it will do. It only adds what\'s missing: nothing you have is erased or replaced, and the same Aiu is never copied twice.' }));
  };
  // Your Aius (profiles): each one is its own Aiu with its own egg, journal, tiles and plan. One is open at a time.
  PF.switcher = function () {
    var a = app(), k = K(), s, pids = a.groupPids();
    var rows = pids.map(function (pid) {
      var p = a.profiles[pid], on = pid === a.pid;
      return h('div', { cls: 'item profrow' + (on ? ' on' : '') }, PF.avatar(pid),
        h('span', { cls: 'ititle' }, h('b', { text: a.profName(pid) }), h('span', { cls: 'small', text: ' ' + (a.profKind(pid) === 'business' ? 'business' : 'personal') })),
        on ? h('span', { cls: 'tag', text: 'Open now' }) : k.btn('Open', function () { s.remove(); PF.open(pid); }, 'mini primary'),
        k.btn('Edit', function () { s.remove(); PF.editSheet(pid); }, 'mini'));
    });
    // 2.4.0: Aius from another account or another device-only group on this device (one row each), and copies of the same Aiu
    var mine = {}; pids.forEach(function (x) { mine[x] = 1; });
    var seenG = {}, other = Object.keys(a.profiles).filter(function (x) { var p = a.profiles[x]; if (mine[x] || p.linkedTo || p.gone || !(p.token || p.local)) return false; var g = a.groupOf(x); if (seenG[g]) return false; seenG[g] = 1; return true; });
    var dup = h('div');
    a.findDupes().then(function (groups) {
      groups.forEach(function (g) {
        var m0 = h('p', { cls: 'formmsg' });
        dup.appendChild(h('div', { cls: 'bcard' }, h('b', { text: g.name + ' is here ' + g.pids.length + ' times' }),
          h('p', { cls: 'small', text: 'These are copies of the same Aiu. Combine them into one: everything from the copies is added in, nothing is lost.' }), m0,
          k.btn('Combine these', function (e) { var b0 = e.target; k.busy(b0, true, 'Combining...'); a.combine(g.pids).then(function () { s.remove(); k.snack('Combined into one ' + g.name + '.'); }, function (er) { k.busy(b0, false, 'Try again'); k.msg(m0, er.message, true); }); }, 'primary')));
      });
    }).catch(function () {});
    s = k.sheet('Your profiles', [
      h('p', { text: 'Each profile is its own Aiu, with its own egg, journal, tiles and plan. Only one is open at a time. The others wait right where you left them.' }),
      dup,
      h('div', { cls: 'tlist' }, rows),
      other.length ? h('h3', { text: 'Also on this device' }) : null,
      other.length ? h('div', { cls: 'tlist' }, other.map(function (x) { var p = a.profiles[x]; return h('div', { cls: 'item profrow' }, PF.avatar(x), h('span', { cls: 'ititle' }, h('b', { text: p.local ? a.profName(x) : '@' + p.u }), h('span', { cls: 'small', text: p.local ? ' this device only' : ' account' })), k.btn('Open', function () { s.remove(); PF.open(x); }, 'mini primary')); })) : null,
      h('div', { cls: 'row wrap' }, k.btn('+ New profile', function () { s.remove(); PF.newSheet(); }, 'primary'), k.btn('Capsules', function () { s.remove(); PF.backups(); }))]);
  };
  // 2.3.0: backups, made simple. Save one (this Aiu, or all of them). Open one: Aiu looks inside first and tells you
  // what it will do. Nothing you have is ever erased or replaced: an old backup only fills in what's missing.
  // 2.6.0: the old Backups sheet is the Capsules block (locked capsules) in a sheet of its own
  PF.backups = function () { K().sheet('Capsules', [PF.capsules()]); };
  PF.askCapsulePw = function (tries) { // 2.6.0: opening a locked capsule
    return new Promise(function (res, rej) {
      var k = K(), s, pw = k.inp({ type: 'password', placeholder: 'capsule password' }), m = h('p', { cls: 'formmsg' });
      function go() { if (!pw.value) return; s.remove(); res(pw.value); }
      pw.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
      s = k.sheet('This capsule is locked', [h('p', { text: tries ? 'That password didn\'t open it. Try again.' : 'Type the password it was saved with.' }), pw, m,
        h('div', { cls: 'row spread' }, k.btn('Cancel', function () { s.remove(); rej(new Error('Not opened.')); }, 'ghost'), k.btn('Open it', go, 'primary'))]);
      setTimeout(function () { try { pw.focus(); } catch (e) {} }, 60);
    });
  };
  PF.restore = function (f, into, m) {
    var a = app(), k = K(); k.clear(into); k.msg(m, 'Looking inside...');
    a.capsulePreview(f).then(function (list) {
      k.msg(m, list.length === 1 ? 'This capsule has 1 Aiu in it:' : 'This capsule has ' + list.length + ' Aius in it:');
      list.forEach(function (it) {
        var nm = it.name + (it.totem && it.totem !== it.name ? ' (' + it.totem + ')' : ''), line = h('p', { cls: 'small' }), act = h('div', { cls: 'row' });
        var info = it.n + ' things saved' + (it.last ? ', last used ' + U.fmtDay(it.last) : '');
        if (it.status === 'same') line.textContent = 'You already have this Aiu, and nothing is missing. Nothing to do.';
        else if (it.status === 'merge') { line.textContent = 'You already have this Aiu. ' + it.missing + ' thing' + (it.missing === 1 ? ' in the capsule isn\'t' : 's in the capsule aren\'t') + ' in yours yet.'; act.appendChild(k.btn('Add the ' + it.missing + ' missing', function (e) { var b0 = e.target; k.busy(b0, true, 'Adding...'); a.mergeInto(it.match, it.part).then(function (r) { k.busy(b0, true, 'Done'); line.textContent = 'Added ' + r.added + '. ' + a.profName(it.match) + ' is up to date.'; ui.renderPanel(true); }, function (er) { k.busy(b0, false, 'Try again'); k.msg(m, er.message, true); }); }, 'primary')); }
        else { line.textContent = 'This is a new Aiu for you.'; act.appendChild(k.btn('Add it as a new profile', function (e) { var b0 = e.target; k.busy(b0, true, 'Adding...'); a.importNewProfiles(null, { account: true, parts: [it.part] }).then(function (made) { k.busy(b0, true, 'Done'); line.textContent = 'Added. Open it from Your profiles.'; void made; }, function (er) { k.busy(b0, false, 'Try again'); k.msg(m, er.message, true); }); }, 'primary')); }
        into.appendChild(h('div', { cls: 'bcard' }, h('b', { text: nm }), h('p', { cls: 'small', text: (it.kind === 'business' ? 'Business' : 'Personal') + ' profile · ' + info }), line, act));
      });
    }, function (e) { k.msg(m, e.message, true); });
  };
  PF.newSheet = function () {
    var a = app(), k = K(), s, n = k.inp({ placeholder: 'e.g. Sam, My shop, School', maxLength: 40, autocapitalize: 'words' }), m = h('p', { cls: 'formmsg' });
    var kind = k.sel({ personal: 'Personal (a person)', business: 'Business (a company, shop or brand)' }, 'personal', function () {});
    s = k.sheet('New profile', [
      h('p', { cls: 'small', text: 'A new profile is a fresh start: a new egg to hatch, its own journal, tiles, plan, ID, documents, Finance and account cards. ' + (a.prof.u ? 'It lives in @' + a.prof.u + ' and syncs like the rest.' : 'It lives on this device (link it to an account later in Settings).') }),
      k.field('Profile name', n), k.field('This profile is', kind, 'Personal: you (your ID is your own details). Business: a company (its ID has an EIN, address type and its own books).'), m,
      h('div', { cls: 'row spread' }, k.btn('Cancel', function () { s.remove(); }, 'ghost'), k.btn('Make it', function () {
        var nm = n.value.trim(); if (!nm) return k.msg(m, 'Give it a name.', true);
        s.remove(); a.newProfile(nm, kind.value);
      }, 'primary'))]);
  };
  PF.editSheet = function (pid) {
    var a = app(), k = K(), s, p = a.profiles[pid], n = k.inp({ value: a.profName(pid), maxLength: 40, autocapitalize: 'words' }), m = h('p', { cls: 'formmsg' });
    var kind = k.sel({ personal: 'Personal (a person)', business: 'Business (a company, shop or brand)' }, a.profKind(pid), function () {});
    var first = !p.local && !p.tid, del = [];
    if (pid !== a.pid && !first) {
      var pw = k.inp({ type: 'password', placeholder: 'your Aiu password' }), ph = k.inp({ placeholder: 'type DELETE PROFILE' }), dm = h('p', { cls: 'formmsg' });
      del.push(h('details', null, h('summary', { text: 'Delete this profile' }),
        h('p', { cls: 'small', text: 'Permanently deletes ' + a.profName(pid) + ' (its Aiu, journal, tiles, plan, documents, Finance and cards)' + (p.local ? ' from this device.' : ' from the server and this device. There are no server backups.') + ' Export a capsule of it first if you want to keep a copy. Type DELETE PROFILE to confirm.' }),
        p.local ? null : pw, ph, dm, k.btn('Delete this profile', function () {
          if (ph.value.trim() !== 'DELETE PROFILE') return k.msg(dm, 'Type DELETE PROFILE exactly.', true);
          a.deleteProfile(pid, pw.value, ph.value.trim()).then(function () { s.remove(); k.snack('Deleted.'); }, function (e) { k.msg(dm, e.message, true); });
        }, 'danger')));
    } else if (pid !== a.pid && first) del.push(h('p', { cls: 'small', text: 'This is the account\'s first profile: it goes only with the whole account (Settings > Account & data > Delete my account).' }));
    else del.push(h('p', { cls: 'small', text: 'To delete this profile, open another one first.' }));
    s = k.sheet('Edit profile', [k.field('Profile name', n), k.field('This profile is', kind), m,
      h('div', { cls: 'row spread' }, h('span'), k.btn('Save', function () {
        var nm = n.value.trim(); if (!nm) return k.msg(m, 'Give it a name.', true);
        a.renameProfile(pid, nm, kind.value).then(function () { s.remove(); ui.renderPanel(true); k.snack('Saved.'); });
      }, 'primary')), del]);
  };
})();
