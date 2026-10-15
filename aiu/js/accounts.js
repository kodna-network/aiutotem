/* AIU TOTEM 1.1.0 - Accounts: a phone book of your accounts (email, games, bills, contacts...).
   No extra PIN. On a synced Totem every card is scrambled with a key made from your Aiu password (app.js + vault.js),
   so the server only stores scrambled cards. A device-only Totem keeps them on the device as they are. */
(function () {
  'use strict';
  var U = AIU.util, h = U.h, ui = AIU.ui, PN = AIU.panels;
  var V = { CATS: ['Email', 'Games', 'Bills', 'Bank & money', 'Shopping', 'Social', 'Work', 'Contacts', 'Other'],
    FIELDS: [['user', 'Username'], ['pass', 'Password'], ['email', 'Email'], ['site', 'Website'], ['phone', 'Phone'], ['acct', 'Account number'], ['pinq', 'Security questions / PIN hints']] };
  PN.accountFields = V;
  function app() { return AIU.app; }
  function K() { return ui.k; }
  function body() { return K().clear(ui.els.panel); }
  var VS = { filter: 'All', q: '' };
  function touch() {}
  PN.lockVault = function () {};

  AIU.hooks.open.push(function () { VS.cards = null; VS.sig = null; VS.meTried = false; VS.meMaking = false; VS.q = ''; VS.filter = 'All'; if (PN.state) { PN.state.aview = null; PN.state.psub = null; PN.state.doc = null; PN.state.person = null; PN.state.folder = null; } }); // 2.2.0: another profile, other cards
  PN.accounts = function () {
    var a = app(), k = K(), mode = a.vaultMode();
    /* 2.5.0: Accounts is four tabs: Cards, Person (Business for a business profile), Files and Finance. My info and the
       profile card moved out (your name is your username; switching profiles is in Settings > Account & data).
       2.9.0: three tabs: Cards, Person and Finance (the Files tab is gone; files already saved stay in capsules). */
    var st = PN.state, B = AIU.business, biz = a.profKind() === 'business';
    if (st.aview === 'profile') { st.atab = { id: 'you', you: 'you', docs: 'docs', finance: 'money' }[st.psub] || st.atab || 'cards'; st.aview = null; st.psub = null; }
    var tab = st.atab || 'cards'; if (tab === 'docs' && !(st.doc || st.person || st.folder)) tab = st.atab = 'cards';
    if (tab === 'docs' && (st.doc || st.person || st.folder)) { ui.panelHead('Files', [], null); return B.profileView(); } // a written page, a résumé, an old business folder
    var subs = [['cards', 'Cards'], ['you', biz ? 'Business' : 'Person'], ['money', 'Finance']]; // 2.5.0: the names you picked (2.9.0: no Files)
    function onSub(x) { st.atab = x; st.doc = null; st.person = null; st.folder = null; ui.renderPanel(true); }
    if (tab !== 'cards') {
      ui.panelHead('Accounts', [], subs, tab, onSub);
      var pb = body();
      if (tab === 'you') return B.youTab(pb);
      return PN.financeInto(pb, '');
    }
    ui.panelHead('Accounts', [k.btn('+ New', function () { editCard(null); }, 'mini primary'), k.btn('About privacy', moreSheet, 'mini ghost')], subs, tab, onSub);
    if (mode === 'none') { body().appendChild(k.empty('This browser can\'t scramble account cards (it needs a secure https page). Open Aiu from https://kodna.net/aiu.')); return; }
    if (mode === 'plain') return list();
    var p = body(); p.appendChild(k.empty('Opening...'));
    a.vaultKey().then(function (key) { if (ui.tab !== 'accounts') return; if (key) list(); else askPassword(); });
  };
  // A synced Totem: the cards are scrambled with your Aiu password. Each device asks for it once (or uses it from when you logged in).
  function askPassword(into, after) {
    var a = app(), k = K(), p = into || body(), lock = AIU.core.setting(a.S, 'vaultLock', null), has = Object.keys(a.S.vault || {}).some(function (x) { return !a.S.vault[x].removed; });
    var pw = k.inp({ type: 'password', placeholder: 'your Aiu password', autocomplete: 'current-password', 'aria-label': 'Aiu password' }), m = h('p', { cls: 'formmsg' }), go;
    go = k.btn(lock ? 'Open my cards' : 'Set up Accounts', function () {
      if (!pw.value) return k.msg(m, 'Type your Aiu password.', true);
      k.busy(go, true, 'One moment...');
      a.vaultUsePassword(pw.value).then(function () { if (after) after(); else ui.renderPanel(true); }, function (e) { k.busy(go, false, lock ? 'Open my cards' : 'Set up Accounts'); k.msg(m, e.message, true); });
    }, 'primary');
    pw.addEventListener('keydown', function (e) { if (e.key === 'Enter') go.click(); });
    // 2.3.1: Accounts is just your account cards now (your profile is in Settings > Account & data > My profile)
    p.appendChild(h('div', { cls: 'pinwrap' }, h('h3', { cls: 'ltitle', text: lock ? 'Open Accounts on this device' : 'Set up Accounts' }),
      h('p', { cls: 'small', text: 'Your account cards are scrambled with your Aiu password before they sync, so the server can\'t read them. Type your Aiu password once; this device remembers the key (not the password).' }),
      pw, m, go,
      lock && has ? h('p', { cls: 'small', text: 'Changed your Aiu password? Type the NEW password here on a device that still opens the cards, and they move over to it.' }) : null));
    setTimeout(function () { try { pw.focus({ preventScroll: true }); } catch (e) {} }, 60);
  }

  /* ---------- the phone book ---------- */
  function sig(S) { var x = Object.assign({}, S.vault || {}, S.accts || {}); return Object.keys(x).map(function (k) { return k + ':' + x[k].t; }).join('|') + (AIU.core.setting(S, 'vaultLock', {}) || {}).ct; }
  function loadCards() {
    var a = app(), sg = sig(a.S);
    if (VS.cards && VS.sig === sg) return Promise.resolve(VS.cards);
    return a.vaultCards().then(function (c) { VS.cards = c; VS.sig = sg; return c; });
  }
  /* 2.1.7: your own card ("Me"): your name, address, email and phone live here, scrambled like every card.
     The first time Accounts opens, it's made for you (and anything you'd typed in the old Profile > About you moves in). */
  var ME = 'v-me';
  PN.meCardKey = ME;
  function ensureMe(cards) {
    var a = app(), S = a.S;
    if (cards.some(function (c) { return c.key === ME; }) || VS.meMaking) return Promise.resolve(false);
    VS.meMaking = true;
    var B = AIU.business, d = B && B.personalDoc ? B.personalDoc(S) : null, v = d ? B.values(S, d) : {};
    var extra = [['Legal name', v.name], ['Home address', v.address], ['Birthday', ''], ['Social Security (last 4)', v.ssn4, true], ['Where the full SSN is kept', v.ssnwhere], ['Household', v.household], ['Income from', v.income], ['Banks and cards (names only)', v.banks], ['Insurance', v.insurance], ['Money goals', v.moneygoals]]
      .filter(function (x, i) { return i < 3 || (x[1] || '').trim(); }).map(function (x) { return { k: x[0], v: (x[1] || '').trim(), secret: !!x[2] }; });
    var card = { name: S.callMe || 'Me', cat: 'Me', user: '', pass: '', email: (v.email || '').trim(), site: '', phone: (v.phone || '').trim(), acct: '', pinq: '', notes: '', extra: extra };
    return a.vaultSave(ME, card).then(function () {
      VS.meMaking = false;
      if (d) { // the old plain copy is emptied (the scrambled card has it now)
        var ev = []; Object.keys(v).forEach(function (sid) { if ((v[sid] || '').trim()) ev.push({ type: 'psec', data: { doc: d.key, sid: sid, h: sid, text: '' } }); });
        if (ev.length) return a.addEvents(ev, true).then(function () { return true; });
      }
      return true;
    }, function () { VS.meMaking = false; return false; });
  }
  function list() {
    var p = body(), k = K();
    if (VS.cards && VS.sig === sig(app().S)) draw0(VS.cards);
    else { p.appendChild(k.empty('Opening...')); loadCards().then(draw0, function (e) { k.clear(p); p.appendChild(k.empty('Could not open the cards: ' + e.message)); }); }
    function draw0(cards) {
      if (ui.tab !== 'accounts') return;
      k.clear(p); // 2.5.0: no automatic "Me" card any more (an existing one is just a card like the rest)
      var me = null;
      var q = k.inp({ placeholder: 'Search name, username, email...', value: VS.q, 'aria-label': 'Search accounts' });
      var listBox = h('div');
      q.addEventListener('input', function () { VS.q = q.value; draw(); });
      var cats = ['All'].concat(V.CATS.filter(function (c) { return cards.some(function (x) { return x.cat === c; }); })).concat(cards.map(function (x) { return x.cat; }).filter(function (c, i, arr) { return c && V.CATS.indexOf(c) < 0 && arr.indexOf(c) === i; }));
      var chips = h('div', { cls: 'chips' }, cats.map(function (c) { return k.btn(c, function () { VS.filter = c; ui.renderPanel(true); }, 'chip' + (VS.filter === c ? ' on' : '')); }));
      p.appendChild(q); if (cards.length) p.appendChild(chips);
      var az = h('div', { cls: 'azbar', 'aria-label': 'Jump to letter' });
      p.appendChild(az); p.appendChild(listBox);
      function draw() {
        k.clear(listBox); k.clear(az);
        var s = VS.q.trim().toLowerCase(), shown = cards.filter(function (c) {
          if (VS.filter !== 'All' && c.cat !== VS.filter) return false;
          return !s || [c.name, c.user, c.email, c.site, c.phone, c.notes, c.cat].concat((c.extra || []).map(function (x) { return x.k + ' ' + x.v; })).join(' ').toLowerCase().indexOf(s) >= 0;
        });
        if (!cards.length) { listBox.appendChild(h('div', { cls: 'emptybig' }, h('p', { text: me ? 'Your other accounts go here.' : 'Your accounts phone book is empty.' }), h('p', { cls: 'small', text: 'Add email accounts, game logins like Steam, bills like electric and water, or contact info. Make each card as detailed as you like.' }), k.btn('+ Add the first card', function () { editCard(null); }, 'primary'))); return; }
        if (!shown.length) listBox.appendChild(k.empty('No cards match.'));
        var last = '';
        shown.forEach(function (c) {
          var L = (String(c.name || '#').charAt(0).toUpperCase().replace(/[^A-Z]/, '#'));
          if (L !== last) {
            last = L; var anchor = h('div', { cls: 'azhead', id: 'az-' + L, text: L }); listBox.appendChild(anchor);
            az.appendChild(h('button', { type: 'button', text: L, onclick: function () { try { anchor.scrollIntoView({ block: 'start' }); } catch (e) {} } }));
          }
          listBox.appendChild(h('button', { type: 'button', cls: 'acard' + (c.locked ? ' locked' : ''), onclick: function () { if (!c.locked) return viewCard(c); var s0 = k.sheet('Locked card', [h('p', { text: 'This card was scrambled with an older Aiu password and this device can\'t open it. Open Accounts on a device that still can (it moves the card to your new password), or delete it.' }), h('div', { cls: 'row spread' }, h('span'), k.btn('Delete it', function () { s0.remove(); delCard(c); }, 'mini del'))]); } },
            h('span', { cls: 'avatar', text: L }), h('span', { cls: 'acbody' }, h('b', { text: c.name || '(no name)' }), h('span', { cls: 'small', text: [c.user || c.email || c.phone || '', c.site || ''].filter(Boolean).join(' · ') })),
            c.cat ? h('span', { cls: 'tag', text: c.cat }) : null));
        });
      }
      draw();
    }
  }
  // 2.2.0: your private details card, drawn inside the profile's ID page (opens the cards first if this device needs the password)
  PN.meCardInto = function (into) {
    var a = app(), k = K(), mode = a.vaultMode();
    if (mode === 'none') { into.appendChild(k.empty('This browser can\'t scramble cards (it needs a secure https page).')); return; }
    function draw(cards) {
      k.clear(into);
      var me = cards.filter(function (c) { return c.key === ME; })[0];
      if (!me) { if (!VS.meTried) { VS.meTried = true; ensureMe(cards).then(function (made) { if (made) { VS.cards = null; ui.renderPanel(true); } }); } into.appendChild(k.empty('Making your card...')); return; }
      if (me.locked) { into.appendChild(k.empty('This card was scrambled with an older password. Open Accounts on a device that can still read it.')); return; }
      var rows = [];
      [['Name on the card', me.name], ['Email', me.email], ['Phone', me.phone]].concat((me.extra || []).map(function (x) { return [x.k, x.v, x.secret]; })).forEach(function (r) {
        if (!r[1]) return; rows.push(h('div', { cls: 'item crow' }, h('span', { cls: 'clabel', text: r[0] }), h('span', { cls: 'cval', text: r[2] ? '••••' : r[1] })));
      });
      into.appendChild(h('div', { cls: 'mebox' }, rows.length ? rows : k.empty('Nothing filled in yet.'), h('div', { cls: 'row wrap' }, k.btn('Edit my details', function () { editCard(me); }, 'mini primary'), k.btn('Show all', function () { viewCard(me); }, 'mini'))));
    }
    into.appendChild(k.empty('Opening...'));
    if (mode === 'plain') { loadCards().then(draw); return; }
    a.vaultKey().then(function (key) { if (key) loadCards().then(draw); else { k.clear(into); askPassword(into, function () { VS.cards = null; ui.renderPanel(true); }); } });
  };
  function copy(text, label) {
    var k = K();
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { k.snack(label + ' copied.'); }, function () { k.snack('Copy failed. Select the text instead.'); });
    else k.snack('Copy is not available here. Select the text instead.');
  }
  function viewCard(c) {
    var k = K(), s, rows = [];
    touch();
    function row(label, val, secret) {
      if (!val) return null;
      var shown = !secret, vEl = h('span', { cls: 'cval' + (secret ? ' secret' : ''), text: secret ? '••••••••' : val });
      return h('div', { cls: 'item crow' }, h('span', { cls: 'clabel', text: label }), vEl,
        secret ? k.btn('Show', function (e) { shown = !shown; vEl.textContent = shown ? val : '••••••••'; e.target.textContent = shown ? 'Hide' : 'Show'; touch(); }, 'mini') : null,
        k.btn('Copy', function () { copy(val, label); touch(); }, 'mini'));
    }
    V.FIELDS.forEach(function (f) { rows.push(row(f[1], c[f[0]], f[0] === 'pass' || f[0] === 'pinq')); });
    (c.extra || []).forEach(function (x) { rows.push(row(x.k, x.v, !!x.secret)); });
    s = k.sheet(c.name || 'Account', [c.cat ? h('span', { cls: 'tag', text: c.cat }) : null, rows,
      c.notes ? h('div', { cls: 'jsec' }, h('h4', { text: 'Notes' }), h('p', { cls: 'jval', text: c.notes })) : null,
      h('p', { cls: 'small', text: 'Updated ' + U.ago(c.t || Date.now()) + (c.dn ? ' on ' + c.dn : '') }),
      h('div', { cls: 'row spread' }, c.key === ME ? h('span', { cls: 'small', text: 'Your own card (it can\'t be deleted).' }) : k.btn('Delete', function () { s.remove(); delCard(c); }, 'mini del'), k.btn('Edit', function () { s.remove(); editCard(c); }, 'primary'))]);
  }
  function editCard(c0) {
    var a = app(), k = K(), c = c0 || { cat: VS.filter !== 'All' ? VS.filter : '' }, s, extras = (c.extra || []).map(function (x) { return { k: x.k, v: x.v, secret: x.secret }; });
    touch();
    var name = k.inp({ value: c.name || '', placeholder: 'e.g. Email, Games, Electric company', autocapitalize: 'words' });
    var catOpts = {}; V.CATS.forEach(function (x) { catOpts[x] = x; }); if (c.cat && !catOpts[c.cat]) catOpts[c.cat] = c.cat; catOpts['+'] = '+ New label...';
    var cat = k.sel(catOpts, c.cat || 'Other', function (v) { if (v === '+') { var nl = window.prompt('New label (like "Pets" or "Car")'); if (nl && nl.trim()) { var o = h('option', { value: nl.trim().slice(0, 24), text: nl.trim().slice(0, 24) }); cat.insertBefore(o, cat.lastChild); cat.value = o.value; } else cat.value = c.cat || 'Other'; } });
    var ins = {}; V.FIELDS.forEach(function (f) { ins[f[0]] = k.inp({ value: c[f[0]] || '', type: f[0] === 'pass' ? 'password' : f[0] === 'email' ? 'email' : f[0] === 'phone' ? 'tel' : 'text', autocomplete: 'off', spellcheck: false }); });
    var showPw = k.btn('Show', function (e) { ins.pass.type = ins.pass.type === 'password' ? 'text' : 'password'; e.target.textContent = ins.pass.type === 'password' ? 'Show' : 'Hide'; }, 'mini');
    var gen = k.btn('Make one', function () { var cs = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%', u = new Uint32Array(16), out = ''; crypto.getRandomValues(u); for (var i = 0; i < 16; i++) out += cs[u[i] % cs.length]; ins.pass.value = out; ins.pass.type = 'text'; showPw.textContent = 'Hide'; }, 'mini');
    var notes = h('textarea', { rows: 4, value: c.notes || '', 'aria-label': 'Notes' });
    var exBox = h('div');
    function drawEx() {
      k.clear(exBox);
      extras.forEach(function (x, i) {
        var kk = k.inp({ value: x.k, placeholder: 'Label (e.g. Recovery email)', 'aria-label': 'Extra field label' }), vv = k.inp({ value: x.v, placeholder: 'Value', 'aria-label': 'Extra field value', type: x.secret ? 'password' : 'text' });
        kk.addEventListener('input', function () { x.k = kk.value; }); vv.addEventListener('input', function () { x.v = vv.value; });
        var sec = h('input', { type: 'checkbox', checked: !!x.secret, 'aria-label': 'Hide this value', onchange: function (e) { x.secret = e.target.checked; vv.type = x.secret ? 'password' : 'text'; } });
        exBox.appendChild(h('div', { cls: 'row exrow' }, kk, vv, h('label', { cls: 'row small', title: 'Hide it like a password' }, sec, 'hide'), k.iconBtn('Remove field', 'X', function () { extras.splice(i, 1); drawEx(); }, 'del')));
      });
    }
    drawEx();
    var m = h('p', { cls: 'formmsg' });
    s = k.sheet(c0 ? 'Edit ' + (c0.name || 'card') : 'New account card', [
      k.field('Name', name), k.field('Label', cat),
      h('div', { cls: 'row2' }, k.field('Username', ins.user), k.field('Email', ins.email)),
      h('label', { cls: 'field' }, h('span', { cls: 'flabel', text: 'Password' }), h('div', { cls: 'row' }, ins.pass, showPw, gen)),
      h('div', { cls: 'row2' }, k.field('Website', ins.site), k.field('Phone', ins.phone)),
      h('div', { cls: 'row2' }, k.field('Account number', ins.acct), k.field('Security questions / PIN hints', ins.pinq)),
      h('div', { cls: 'field' }, h('span', { cls: 'flabel', text: 'More fields (as many as you need)' }), exBox, k.btn('+ Add a field', function () { extras.push({ k: '', v: '' }); drawEx(); }, 'mini')),
      k.field('Notes', notes), m,
      h('div', { cls: 'row spread' }, h('span'), k.btn('Save card', function () {
        var nm = name.value.trim(); if (!nm) return k.msg(m, 'Give the card a name.', true);
        var card = { name: nm.slice(0, 60), cat: cat.value === '+' ? 'Other' : cat.value, notes: notes.value.slice(0, 4000), extra: extras.filter(function (x) { return x.k.trim() || x.v.trim(); }).map(function (x) { return { k: x.k.trim().slice(0, 40) || 'Field', v: x.v.slice(0, 500), secret: !!x.secret }; }).slice(0, 30) };
        V.FIELDS.forEach(function (f) { card[f[0]] = ins[f[0]].value.slice(0, 500); });
        var key = c0 ? c0.key : 'v-' + U.id().replace(/[^A-Za-z0-9]/g, '').slice(0, 14);
        if (JSON.stringify(card).length > 14000) return k.msg(m, 'This card is too big. Shorten the notes a little.', true);
        a.vaultSave(key, card).then(function () { s.remove(); ui.renderPanel(true); K().snack('Saved "' + card.name + '".'); }, function (e) { k.msg(m, e.message, true); });
      }, 'primary'))]);
  }
  function delCard(c) {
    var a = app(), k = K(), back = Object.assign({}, c);
    ['key', 't', 'dn', 'plain', 'locked'].forEach(function (x) { delete back[x]; });
    a.vaultDelete(c.key).then(function () {
      if (c.locked) { k.snack('Deleted the locked card.'); return; }
      k.snack('Deleted "' + c.name + '".', function () { a.vaultSave(c.key, back); });
    });
  }
  function moreSheet() {
    var a = app(), k = K(), s;
    s = k.sheet('Accounts', [
      h('p', { cls: 'small', text: a.vaultMode() === 'plain' ? 'This Totem lives only on this device, so your cards never leave it. If you link it to an account later, the cards get scrambled with your Aiu password before they sync.' : 'Your cards are scrambled with your Aiu password before they are saved or synced, so the server can\'t read them. Only the PDF and your capsule (Settings > Your data) show them in plain text. Use a strong Aiu password.' }),
      h('p', { cls: 'small', text: 'To print your cards: Settings > Save as PDF > Account cards.' })]);
  }
  function cardsDoc(cards) {
    var b = [{ t: 'title', text: 'Accounts' }, { t: 'sub', text: 'Private - contains passwords. Made ' + PN.nice(PN.today()) + '.' }], last = '';
    cards.filter(function (c) { return !c.locked; }).forEach(function (c) {
      var L = String(c.name || '#').charAt(0).toUpperCase();
      if (L !== last) { b.push({ t: 'h1', text: L }); last = L; }
      b.push({ t: 'h2', text: (c.name || '(no name)') + (c.cat ? '  [' + c.cat + ']' : '') });
      V.FIELDS.forEach(function (f) { if (c[f[0]]) b.push({ t: 'kv', k: f[1], v: c[f[0]] }); });
      (c.extra || []).forEach(function (x) { b.push({ t: 'kv', k: x.k, v: x.v }); });
      if (c.notes) b.push({ t: 'p', text: c.notes });
    });
    return { title: 'Accounts (private)', blocks: b };
  }
  PN.cardsDoc = cardsDoc;
})();
