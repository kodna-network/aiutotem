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
  function cancelDraft() { if (draftTimer) { clearInterval(draftTimer); draftTimer = null; } if (els.dbar) els.dbar.classList.remove('run'); if (els.earline) ui.refreshEars(); }
  function block(title, kids) { return h('div', { cls: 'block' }, title ? h('h3', { text: title }) : null, kids); }
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
  ui.refreshChat = function () {
    if (!ui.onMain || ui.tab !== 'talk' || !els.chat) return;
    pendingChips();
    var a = app(), S = a.S;
    var items = S.chat.map(function (e) { return { id: e.id, t: e.t, type: e.type, who: e.type === 'say' ? 'you' : e.type === 'journal' ? 'journal' : 'totem', text: e.data.text, dn: e.dev !== a.deviceId ? e.dn : '', day: e.d, hm: e.h, edited: e.edited }; })
      .concat(a.lines.map(function (l) { return { t: l.t, who: 'totem', text: l.text, local: true }; }))
      .sort(function (x, y) { return x.t - y.t; }).slice(-80);
    var nearBottom = els.chat.scrollHeight - els.chat.scrollTop - els.chat.clientHeight < 80;
    clear(els.chat);
    if (!items.length) els.chat.appendChild(empty('This is your Log. Tap Log entry and tell ' + S.totemName + ' about your day, or Quest entry for something to do ("buy milk at the store"). Commands work too: "remind me to feed the chickens at 6pm", "cast my reading". Ask "what do you need?" to see what ' + S.totemName + ' needs today.'));
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
  function questRow(S, q, tracked) {
    var ns = C.nextStep(S, q);
    var b = h('button', { type: 'button', cls: 'qrow' + (tracked ? ' tracked' : ''), onclick: function () { ui.openQuest(q.key); } },
      h('span', { cls: 'qrtitle', text: (tracked ? '> ' : '') + q.title }),
      h('span', { cls: 'qrmeta', text: (ns ? 'Next: ' + ns.title : (q.steps || []).length ? 'All steps done' : 'No steps yet') + ' · ' + qprogress(S, q) }));
    b.setAttribute('aria-label', q.title + '. ' + (ns ? 'Current objective: ' + ns.title : 'No open steps') + '. ' + qprogress(S, q) + '. Open quest');
    return b;
  }
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
  function bookDays(S) {
    var days = {}, today = todayStr();
    Object.keys(S.reviews || {}).forEach(function (d) { days[d] = 1; });
    Object.keys(S.jpages || {}).forEach(function (d) { days[d] = 1; });
    (S.journal || []).forEach(function (e) { days[e.d] = 1; });
    Object.keys(S.lib || {}).forEach(function (mo) { Object.keys(S.lib[mo].days).forEach(function (d) { var pg = S.lib[mo].days[d]; if (pg.say || pg.journal || pg.done || pg.memory) days[d] = 1; }); });
    days[today] = 1;
    return Object.keys(days).filter(function (d) { return d <= today; }).sort().reverse().slice(0, 90);
  }
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
  function todayStr() { return U.dayStr(new Date(app().trueNow())); }
  ui.openToday = function () { AIU.panels.state.jday = U.dayStr(new Date(app().trueNow())); AIU.panels.state.jview = null; AIU.panels.state.jfromToday = false; ui.go('journal', 'pages'); };
