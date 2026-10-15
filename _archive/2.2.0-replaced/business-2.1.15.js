/* AIU TOTEM 1.1.0 - the business planner (from KODNA's BizNet planner).
   One folder per business. Fill in the business PROFILE once (a form), add PEOPLE (you first: your role in the business
   and your résumé), and every DOCUMENT (business plan, proposal, SEO plan, investor sheet, research report, system plan,
   event plan) fills itself in from the profile. OUTREACH writes an elevator pitch and emails from the same facts.
   Everything is yours to edit, and everything saves as a PDF. For your own review: no signing, nothing is sent. */
(function () {
  'use strict';
  var U = AIU.util, C = AIU.core, h = U.h, ui = AIU.ui, PN = AIU.panels, PL = AIU.planner, M = AIU.mind;
  var B = AIU.business = {};
  function app() { return AIU.app; }
  function K() { return ui.k; }
  function body() { return K().clear(ui.els.panel); }
  function today() { return PN.today(); }
  function nid(p) { return p + U.id().replace(/[^A-Za-z0-9]/g, '').slice(0, 12); }
  function lc(s) { return String(s || '').toLowerCase(); }

  /* ---------- the profile form ---------- */
  B.PROFILE = [
    ['Identity', [['name', 'Business name'], ['dba', 'D.B.A. (doing business as)'], ['tagline', 'Tagline'], ['location', 'Global / regional location'], ['industry', 'Industry and niche'],
      ['website', 'Website'], ['email', 'Business email'], ['phone', 'Business phone'], ['address', 'Business address'],
      ['addrtype', 'This address is', 'The IRS and your bank go by this.', ['', 'Home address (sole proprietor at home)', 'Home office', 'Business office / storefront', 'Mailing address only']],
      ['ein', 'EIN (employer ID number)', 'The business\'s own tax ID, like a Social Security number for the business. It\'s on your W-9s and invoices. Stored like the rest of this profile (not scrambled): for full privacy keep it only in an Accounts card.']]],
    ['Offer', [['offer', 'Unique offer', 'What you do that others don\'t.'], ['products', 'Products and services'], ['price', 'Price point'], ['audience', 'Target audience'], ['advantage', 'Competitive advantage']]],
    ['Purpose', [['mission', 'Mission statement'], ['goals', 'Goals and objectives'], ['philosophy', 'Business philosophy'], ['promise', 'Promise to customers'], ['focus', 'Key focuses']]],
    ['Market', [['demand', 'Demand (declining or booming?)'], ['saturation', 'Supply saturation'], ['strengths', 'Strengths'], ['weaknesses', 'Weaknesses'], ['opportunities', 'Opportunities'], ['threats', 'Threats'], ['risks', 'Risk factors']]],
    ['Money', [['revenue', 'Revenue streams'], ['costs', 'Cost structure'], ['bootstrap', 'Bootstrapping strategy'], ['wealth', 'Wealth potential'], ['growth', 'Growth strategy'], ['scale', 'Scalability / singularity'], ['delegation', 'Delegation plan']]],
    ['Legal', [['legal', 'Legal format', 'Sole proprietor, LLC, corporation...'], ['licenses', 'Licenses and permits'], ['ip', 'Trademarks, copyrights and patents'],
      ['ids', 'Where your tax IDs and bank details are kept', 'Keep numbers like EIN and bank accounts in Accounts (scrambled). Write here which card holds them.']]]
  ];
  var PF = {}; B.PROFILE.forEach(function (g) { g[1].forEach(function (f) { PF[f[0]] = f[1]; }); });
  // You are your own entity too (your Social Security number is your tax ID). Your profile and your personal books.
  B.PERSONAL = [
    ['You', [['name', 'Legal name'], ['address', 'Home address'], ['phone', 'Phone'], ['email', 'Email'],
      ['ssn4', 'Social Security number: last 4 only', 'Never type the whole number here. Keep the full number in an Accounts card (scrambled).'],
      ['ssnwhere', 'Where the full number is kept', 'e.g. Accounts > "Social Security card"']]],
    ['Household and money', [['household', 'Household (who you support)'], ['income', 'Where your income comes from', 'A job, your business, side work...'],
      ['banks', 'Banks and cards (names only)', 'Account numbers go in Accounts.'], ['insurance', 'Insurance (names only)'], ['moneygoals', 'Money goals']]],
    ['Your businesses', [['owns', 'Businesses you own', 'Each one is its own folder in Log > Profiles, with its own EIN, address and Finance.']]]
  ];
  B.personalDoc = function (S) { return PL.docs(S, PL.ME).filter(function (d) { return d.kind === 'personal'; })[0] || null; };
  B.PERSON = [
    ['Basics', [['name', 'Full name'], ['role', 'Position / title in this business'], ['email', 'Email'], ['phone', 'Phone'], ['location', 'City, state'], ['links', 'Website / portfolio / profile links']]],
    ['Résumé', [['headline', 'Résumé headline', 'e.g. 3D designer and product developer'], ['summary', 'Summary'], ['hard', 'Hard skills (tools, software, trades)'], ['soft', 'Soft skills']]],
    ['Role in the business', [['overview', 'Overview of the position'], ['objectives', 'Primary objectives'], ['access', 'Assigned access and assets'], ['pay', 'Pay and benefits'], ['manager', 'Reports to']]]
  ];
  B.ITEM = { exp: ['Experience', 'Role', 'Company / client'], proj: ['Projects', 'Project', 'Client / link'], edu: ['Education', 'Degree / program', 'School'], cert: ['Certifications and awards', 'Name', 'Issued by'] };

  /* ---------- document templates (from the BizNet planner files). [heading, profile field | @people | @money] ---------- */
  var T = PL.TEMPLATES;
  T.onepage = { title: 'Business plan (one page)', sections: [['Global / regional location', 'location'], ['Industry and niche', 'industry'], ['Unique offer', 'offer'], ['Price point', 'price'], ['Target audience', 'audience'], ['Competitive advantage', 'advantage'],
    ['Revenue streams', 'revenue'], ['Cost structure', 'costs'], ['Bootstrapping strategy', 'bootstrap'], ['Wealth potential', 'wealth'], ['Scalability / singularity', 'scale'], ['Delegation plan', 'delegation'], ['Risk factors', 'risks'], ['Growth strategy', 'growth']] };
  T.plan = { title: 'Business plan (full)', sections: [['Executive summary (write this last)'], ['Company overview', 'products'], ['Mission statement', 'mission'], ['Goals and objectives', 'goals'], ['Business philosophy', 'philosophy'], ['Legal format', 'legal'],
    ['Products and services', 'products'], ['Price point', 'price'], ['Marketing objective'], ['Client relations', 'promise'], ['Market segment (demand and saturation)', 'demand'], ['Strengths', 'strengths'], ['Weaknesses', 'weaknesses'], ['Opportunities', 'opportunities'], ['Threats', 'threats'],
    ['Marketing mix (product, price, place, promotion)'], ['Marketing timetable'], ['Operational objective'], ['Production workflow'], ['Management and organization', '@people'], ['Financial plan', '@money'], ['Start-up expense budget', 'costs'], ['Appendices']] };
  T.proposal = { title: 'Client proposal', sections: [['Client background'], ['Client problem / pain points'], ['Proposed solution', 'offer'], ['Deliverables'], ['Scope of work'], ['Timeline and milestones'], ['Pricing structure', 'price'], ['Payment terms'], ['Client responsibilities'], ['Assumptions'], ['Terms and conditions']] };
  T.seo = { title: 'SEO plan', sections: [['Website overview', 'website'], ['Business goals', 'goals'], ['Target locations', 'location'], ['Primary keywords'], ['Secondary keywords'], ['Competitor websites'], ['On-page SEO strategy'], ['Content strategy'], ['Technical SEO notes'], ['Link building strategy'], ['Reporting metrics'], ['Expected outcomes']] };
  T.pillar = { title: 'Investor sheet (Pillar of Success)', sections: [['Who, what, when, where, why'], ['Niche', 'industry'], ['Passion'], ['Demand', 'demand'], ['Service / product', 'products'], ['Brainstorm'], ['Concept structure'], ['Agenda'], ['Supply saturation', 'saturation'], ['Strengths', 'strengths'], ['Weaknesses', 'weaknesses'],
    ['Opportunities', 'opportunities'], ['Threats', 'threats'], ['Message', 'tagline'], ['Price point', 'price'], ['Unique offer', 'offer'], ['Niche targets', 'audience'], ['Wealth potential', 'wealth'], ['Revenue streams', 'revenue'], ['Cost structure', 'costs'], ['Singularity', 'scale'],
    ['Profitable delegation', 'delegation'], ['Survival rate'], ['How the company interacts with customers', 'promise'], ['Financial investment plan', '@money']] };
  T.research = { title: 'Marketing research report', sections: [['Prepared for and by'], ['Executive summary'], ['About the research'], ['Key results'], ['Recommendation'], ['Introduction'], ['Method'], ['Demographics', 'audience'], ['Usage statistics'], ['Key outcomes'], ['Limitations'], ['Conclusions and recommendations'], ['References']] };
  T.system = { title: 'System plan document', sections: [['Goal solution', 'mission'], ['System capability'], ['Usability requirements'], ['Development team', '@people'], ['Development resources'], ['Deliverables master log'], ['Iteration log'], ['Financial projection', '@money']] };
  T.event = { title: 'Event plan', sections: [['Event objectives'], ['Brand (name, tagline, logo)', 'tagline'], ['Organization (event manager and chairs)', '@people'], ['Date(s)'], ['Task management (venue, speakers, logistics, publicity, registration, sponsors, volunteers)'], ['Promotional materials'], ['Financing budget'], ['Launch day'], ['Follow-up within 48 hours']] };
  T.product.sections = [['Product name'], ['Price', 'price'], ['Overview', 'products'], ['Specifications'], ['Materials and suppliers'], ['Cost to make'], ['Where it sells', 'audience']];
  var DOC_KINDS = ['onepage', 'plan', 'proposal', 'seo', 'pillar', 'research', 'system', 'event', 'product', 'notes'];
  function linkOf(kind, heading) { var t = T[kind]; if (!t) return null; var x = t.sections.filter(function (s) { return (Array.isArray(s) ? s[0] : s) === heading; })[0]; return Array.isArray(x) ? x[1] || null : null; }

  /* ---------- reading a business ---------- */
  function docsOf(S, folder) { return PL.docs(S, folder); }
  B.profileDoc = function (S, folder) { return docsOf(S, folder).filter(function (d) { return d.kind === 'profile'; })[0] || null; };
  B.values = function (S, d) { var o = {}; if (!d) return o; PL.sections(S, d).forEach(function (x) { o[x.sid] = x.text; }); return o; };
  B.people = function (S, folder) { return docsOf(S, folder).filter(function (d) { return d.kind === 'person'; }); };
  B.items = function (S, personKey, sec) {
    var CI = S.cvItems || {};
    return Object.keys(CI).map(function (k) { return CI[k]; }).filter(function (x) { return !x.removed && x.person === personKey && (!sec || x.sec === sec); })
      .sort(function (a, b) { return (a.order || 0) - (b.order || 0) || String(b.end || '9999').localeCompare(String(a.end || '9999')) || a.t - b.t; });
  };
  B.drafts = function (S, folder) { var D = S.cvDocs || {}; return Object.keys(D).map(function (k) { return D[k]; }).filter(function (x) { return !x.removed && x.biz === folder; }).sort(function (a, b) { return ((b.at || b.t) - (a.at || a.t)) || ((a.n || 0) - (b.n || 0)); }); }; // newest set first, each set in writing order
  function fields(groups) { var out = []; groups.forEach(function (g) { g[1].forEach(function (f) { out.push(f[0]); }); }); return out; }
  // events that create a business (profile + you as the first person)
  B.newBusiness = function (S, name) {
    var pk = nid('prof-'), mk = nid('per-'), ev = [], me = S.callMe && S.callMe !== 'friend' ? S.callMe : '';
    ev.push({ type: 'pdoc', data: { key: pk, folder: name, title: 'Business profile', kind: 'profile', order: fields(B.PROFILE) } });
    ev.push({ type: 'psec', data: { doc: pk, sid: 'name', h: PF.name, text: name } });
    ev.push({ type: 'pdoc', data: { key: mk, folder: name, title: me || 'Owner', kind: 'person', order: fields(B.PERSON) } });
    if (me) ev.push({ type: 'psec', data: { doc: mk, sid: 'name', h: 'Full name', text: me } });
    ev.push({ type: 'psec', data: { doc: mk, sid: 'role', h: 'Position / title in this business', text: 'Owner / CEO (sole proprietor)' } });
    return ev;
  };
  function setField(d, sid, label, text, allIds) {
    var ev = [{ type: 'psec', data: { doc: d.key, sid: sid, h: label, text: text } }];
    if ((d.order || []).indexOf(sid) < 0) ev.push({ type: 'pdoc', data: { key: d.key, folder: d.folder, title: d.title, kind: d.kind, order: (d.order || []).concat([sid]) } });
    return app().addEvents(ev);
  }

  /* ---------- screens ---------- */
  var st = PN.state;
  B.actions = function (S) {
    var k = K(), acts = [];
    if (!st.folder) return [k.btn('+ Business', function () { newBusinessSheet(); }, 'mini primary')];
    var f = st.folder, sub = st.bsub || 'profile', ent = f === PL.ME ? '' : f;
    if (sub === 'finance') return [null];
    if (f === PL.ME) return [];
    if (st.person && S.pdocs[st.person]) acts.push(null);
    else if (st.doc && S.pdocs[st.doc]) acts.push(null);
    else if (sub === 'profile') acts.push(null);
    else if (sub === 'docs') acts.push(null);
    return acts;
  };
  // every business: its folder, plus any business books (money) whose folder is gone, so no money goes missing
  B.folders = function (S) { var f = PL.folders(S), have = {}; f.forEach(function (x) { have[x.name] = 1; }); (PN.bizBooks ? PN.bizBooks(S) : []).forEach(function (n) { if (!have[n] && n !== PL.ME) f.push({ name: n, n: 0 }); }); return f; };
  B.view = function () {
    var a = app(), S = a.S;
    var folders = B.folders(S);
    if (st.folder && st.folder !== PL.ME && !folders.some(function (x) { return x.name === st.folder; })) { st.folder = null; st.doc = null; st.person = null; }
    if (!st.folder) return home(S, folders);
    if (st.folder === PL.ME) return meView(S);
    // older folders (before 1.1.0) get a profile the first time they're opened
    if (!B.profileDoc(S, st.folder)) { var pk = nid('prof-'); a.addEvents([{ type: 'pdoc', data: { key: pk, folder: st.folder, title: 'Business profile', kind: 'profile', order: fields(B.PROFILE) } }, { type: 'psec', data: { doc: pk, sid: 'name', h: PF.name, text: st.folder } }]); return; }
    if (st.person && S.pdocs[st.person] && !S.pdocs[st.person].removed) return personView(S, S.pdocs[st.person]);
    st.person = null;
    if (st.doc && S.pdocs[st.doc] && !S.pdocs[st.doc].removed) return docView(S, S.pdocs[st.doc]);
    st.doc = null;
    bizView(S, st.folder);
  };
  /* ---------- 2.0: Log > Profiles. You and each business are folders with pieces; Finance is inside each ---------- */
  function hasMoney(S, ent) { return PL.items(S, null, ent).some(function (x) { return /^(income|expense|bill|asset|debt)$/.test(x.kind); }); }
  B.piecesFor = function (S, folder) {
    if (folder === PL.ME) {
      return [['Personality', !!(S.ptype && S.ptype.answered >= 6)], ['Finance', hasMoney(S, '')]];
    }
    var pv = B.values(S, B.profileDoc(S, folder)), docs = docsOf(S, folder).filter(function (d) { return !/^(profile|person)$/.test(d.kind); }).length;
    return [['Profile', ['industry', 'addrtype', 'address'].every(function (x) { return (pv[x] || '').trim(); })], ['People', B.people(S, folder).length > 0], ['Papers', docs > 0], ['Finance', hasMoney(S, folder)]];
  };
  function folderCard(S, title, meta, folder, sub) {
    var pcs = B.piecesFor(S, folder), miss = pcs.filter(function (x) { return !x[1]; }).length;
    return h('button', { type: 'button', cls: 'tcard wide' + (miss ? ' hot' : ''), onclick: function () { st.folder = folder; st.bsub = sub; st.person = null; st.doc = null; ui.renderPanel(true); } },
      h('span', { cls: 'ttab', 'aria-hidden': 'true' }), h('b', { cls: 'tttl', text: title }), h('span', { cls: 'twhen', text: meta }),
      h('span', { cls: 'tpcs', 'aria-label': (pcs.length - miss) + ' of ' + pcs.length + ' pieces' }, pcs.map(function (x) { return h('i', { cls: x[1] ? 'ok' : '', title: x[0] }); })),
      h('span', { cls: 'thint' + (miss ? ' ask' : ''), text: pcs.map(function (x) { return x[0]; }).join(' · ') }));
  }
  function home(S, folders) {
    var k = K(), p = body();
    p.appendChild(h('p', { cls: 'small', text: 'You and each business are folders. ' + app().S.totemName + ' fills the empty pieces by asking, one tap at a time. Each folder keeps its own Finance.' }));
    var g = h('div', { cls: 'tiles one' });
    g.appendChild(folderCard(S, S.callMe || 'You', 'Your profile: personality, what calms you, money', PL.ME, 'profile'));
    folders.forEach(function (f) { var pv = B.values(S, B.profileDoc(S, f.name)); g.appendChild(folderCard(S, f.name, 'Business' + (pv.tagline ? ' · ' + pv.tagline : pv.industry ? ' · ' + pv.industry : ''), f.name, 'profile')); });
    p.appendChild(g);
    p.appendChild(k.btn('+ New business', function () { newBusinessSheet(); }, 'ghost'));
  }
  // Aiu asks for the next empty profile field (tap or type; Skip remembers on this device)
  var ASK = { personal: ['name', 'address', 'phone', 'email', 'ssn4'], profile: ['industry', 'addrtype', 'address', 'email', 'phone', 'legal', 'website'] };
  function askField(S, d, groups) {
    var a = app(), k = K(), vals = B.values(S, d), skip = Object.assign({}, a.local.profSkip || {}), all = {}; Object.keys(S.prefs || {}).forEach(function (k0) { if (/^pskip:/.test(k0) && S.prefs[k0].v === 'skip') skip[k0.slice(6)] = 1; }); // 2.1.5: skips sync
    groups.forEach(function (g) { g[1].forEach(function (f) { all[f[0]] = f; }); });
    var fid = (ASK[d.kind] || []).filter(function (x) { return all[x] && !(vals[x] || '').trim() && !skip[d.key + '|' + x]; })[0];
    if (!fid) return null;
    var f = all[fid], who = d.kind === 'personal' ? 'you' : (vals.name || d.folder);
    var QS = { name: d.kind === 'personal' ? 'What\'s your legal name?' : null, address: d.kind === 'personal' ? 'What\'s your home address?' : 'What\'s ' + who + '\'s address?', addrtype: 'What kind of address does ' + who + ' use?',
      industry: 'What does ' + who + ' do (industry and niche)?', email: d.kind === 'personal' ? 'Your email?' : who + '\'s email?', phone: d.kind === 'personal' ? 'Your phone number?' : who + '\'s phone number?',
      legal: 'What kind of business is ' + who + ' on paper (sole proprietor, LLC...)?', website: who + '\'s website?', ssn4: 'Last 4 digits of your Social Security number?' };
    var box = h('section', { cls: 'askcard' }, h('div', { cls: 'askq' }, ui.pix('ask'), h('b', { text: QS[fid] || (f[1] + (d.kind === 'personal' ? '?' : ' for ' + who + '?')) })));
    function save(v) { setField(d, fid, f[1], v); }
    function skipIt() { a.addEvents([{ type: 'pref', data: { item: 'pskip:' + d.key + '|' + fid, kind: 'pskip', v: 'skip' } }], true).then(function () { ui.renderPanel(true); }); }
    if (f[3]) box.appendChild(h('div', { cls: 'chips' }, f[3].filter(Boolean).map(function (o) { return k.btn(o, function () { save(o); }, 'chip ans'); }).concat([k.btn('Skip', skipIt, 'chip ghost')])));
    else {
      var inp = k.inp({ 'aria-label': f[1], autocapitalize: 'sentences', inputmode: fid === 'ssn4' ? 'numeric' : undefined, type: fid === 'email' ? 'email' : fid === 'phone' ? 'tel' : 'text' });
      box.appendChild(h('div', { cls: 'row addrow' }, inp, k.btn('Save', function () { var v = inp.value.trim(); if (fid === 'ssn4') v = v.replace(/\D/g, '').slice(-4); if (v) save(v); }, 'mini primary'), k.btn('Skip', skipIt, 'mini ghost')));
      if (f[2]) box.appendChild(h('p', { cls: 'small', text: f[2] }));
    }
    return box;
  }
  function chipsRow(list, sub) {
    var k = K();
    return h('div', { cls: 'seg bsub' }, list.map(function (x) { return k.btn(x[1], function () { st.bsub = x[0]; st.person = null; st.doc = null; ui.renderPanel(true); }, sub === x[0] ? 'on' : ''); }));
  }
  function newBusinessSheet() {
    var a = app(), k = K(), s, n = k.inp({ placeholder: 'e.g. My Shop', autocapitalize: 'words' }), m = h('p', { cls: 'formmsg' });
    s = k.sheet('New business', [k.field('Business name', n, 'Your own business, a side project, or just you as a freelancer.'), m,
      h('div', { cls: 'row spread' }, h('span'), k.btn('Create', function () {
        var name = n.value.trim().slice(0, 40); if (!name) return k.msg(m, 'Give it a name.', true);
        if (PL.folders(a.S).some(function (f) { return lc(f.name) === lc(name); })) return k.msg(m, 'You already have a business with that name.', true);
        s.remove(); a.addEvents(B.newBusiness(a.S, name)).then(function () { st.folder = name; st.bsub = 'profile'; ui.renderPanel(true); });
      }, 'primary'))]);
  }
  function bizView(S, folder) {
    var a = app(), k = K(), p = body(), sub = st.bsub || 'profile';
    p.appendChild(h('div', { cls: 'row spread' }, k.btn('< Profiles', function () { st.folder = null; ui.renderPanel(true); }, 'mini ghost'),
      h('span', { cls: 'row' }, k.btn('Rename', function () { renameBiz(folder); }, 'mini'), k.btn('Delete', function () { deleteBiz(folder); }, 'mini del'))));
    p.appendChild(h('h3', { cls: 'ltitle', text: folder }));
    p.appendChild(chipsRow([['profile', 'Profile'], ['people', 'People'], ['docs', 'Papers'], ['outreach', 'Outreach'], ['finance', 'Finance']], sub));
    if (sub === 'profile') { var pd = B.profileDoc(S, folder), ak = pd && askField(S, pd, B.PROFILE); if (ak) p.appendChild(ak); }
    var views = { profile: profileForm, people: peopleList, docs: docList, outreach: outreach, finance: function (S0, f0, p0) { PN.financeInto(p0, f0); } };
    (views[sub] || profileForm)(S, folder, p);
  }
  // You: your profile, personality, GABA, Aiu's suggestions and your own money
  function meView(S) { // 2.1.5: your folder: Profile (about you, personality, how well Aiu knows you, finance) and Vitals
    var a = app(), k = K(), p = body(), sub = st.bsub || 'profile';
    if (sub === 'gaba') sub = 'vitals';
    if (sub !== 'vitals') sub = 'profile'; st.bsub = sub;
    // 2.1.9: no Profile / Vitals tabs. Your folder is your profile; Vitals opens from the V bar above the world (with a way back)
    if (sub === 'vitals') { p.appendChild(h('div', { cls: 'row spread' }, k.btn('< Back', function () { st.bsub = 'profile'; st.folder = st.vitFrom === 'me' ? PL.ME : null; ui.renderPanel(true); }, 'mini ghost'))); return AIU.vitals.view(p); }
    p.appendChild(h('div', { cls: 'row spread' }, k.btn('< Profiles', function () { st.folder = null; ui.renderPanel(true); }, 'mini ghost')));
    p.appendChild(h('h3', { cls: 'ltitle', text: S.callMe || 'You' }));
    // 2.1.7: name, address, email and phone live in Accounts > your "Me" card (scrambled), not here
    p.appendChild(h('div', { cls: 'row spread mehint' }, h('span', { cls: 'small', text: 'Your name, address, email and phone are on your Me card in Accounts.' }), k.btn('Open Accounts', function () { ui.go('accounts'); ui.toPanel(); }, 'mini')));
    var pers = h('div'); PN.personaInto(pers); p.appendChild(k.acc('me-pers', 'Personality', [pers], false));
    // how well Aiu knows you (21 questions): the % and the next either/or question
    var pr = PN.q21Progress(S), kn = h('div'), nx = PN.q21Next(S); // 2.1.6: personality + what calms / stresses you, one at a time
    kn.appendChild(h('div', { cls: 'bar thin' }, h('i', { cls: 'conf', style: 'width:' + pr.pct + '%' })));
    kn.appendChild(h('p', { cls: 'small', text: pr.done + ' of ' + pr.total + ' pieces. Each answer is +2 growth. What calms you builds ' + S.totemName + '\'s Vitals check-ins.' }));
    if (nx) kn.appendChild(PN.q21Card(nx, function () { ui.renderPanel(true); }));
    else kn.appendChild(h('p', { cls: 'small', text: !(S.ptype && S.ptype.answered >= 6) ? 'Take the personality quiz (above) and ' + S.totemName + ' asks a few more either/or questions here.' : 'That\'s every question for now.' }));
    var ans = h('div'); PN.answersInto(ans); kn.appendChild(k.acc('me-answers', 'Your answers (change one)', [ans], false));
    p.appendChild(k.acc('me-knows', S.totemName + ' knows you ' + pr.pct + '%', [kn], false));
    var cl = h('div'); PN.calmLists(cl); p.appendChild(k.acc('me-calm', 'What calms you (and what stresses you)', [cl], false));
    var fin = h('div'); PN.financeInto(fin, ''); p.appendChild(k.acc('me-fin', 'Finance', [fin], false));
  }
  function renameBiz(folder) {
    var a = app(), k = K();
    k.editSheet('Rename business', [{ label: 'Business name', value: folder }], function (v) {
      var nn = v[0].trim().slice(0, 40); if (!nn || nn === folder) return;
      var ev = docsOf(a.S, folder).map(function (d) { return { type: 'pdoc', data: { key: d.key, folder: nn, title: d.title, kind: d.kind, order: d.order } }; });
      B.drafts(a.S, folder).forEach(function (x) { var c = Object.assign({}, x); delete c.m; delete c.t; c.biz = nn; ev.push({ type: 'cv_doc', data: c }); });
      PL.items(a.S, null, folder).forEach(function (x) { var c = Object.assign({}, x); delete c.m; c.folder = nn; ev.push({ type: 'plan', data: c }); }); // its Finance moves with it
      a.addEvents(ev).then(function () { st.folder = nn; ui.renderPanel(true); });
    });
  }
  function deleteBiz(folder) {
    var a = app(), k = K(), s;
    s = k.sheet('Delete ' + folder + '?', [h('p', { text: 'Its profile, people and documents go away (they stay in your history, and Undo brings them back right after).' }),
      h('div', { cls: 'row spread' }, k.btn('Cancel', function () { s.remove(); }, 'ghost'), k.btn('Delete', function () {
        s.remove();
        var docs = docsOf(a.S, folder), mk = function (rm) { return docs.map(function (d) { return { type: 'pdoc', data: { key: d.key, folder: d.folder, title: d.title, kind: d.kind, order: d.order, removed: rm } }; }); };
        a.addEvents(mk(true)).then(function () { st.folder = null; ui.renderPanel(true); k.snack('Deleted ' + folder + '.', function () { a.addEvents(mk(false)); }); });
      }, 'danger'))]);
  }

  /* ---------- profile ---------- */
  function formGroups(groups, d, vals, intro) {
    var a = app(), k = K(), box = h('div');
    if (intro) box.appendChild(h('p', { cls: 'small', text: intro }));
    groups.forEach(function (g, gi) {
      var inner = h('div');
      g[1].forEach(function (f) {
        if (f[3]) { // a pick-one field
          var o = {}; f[3].forEach(function (x) { o[x] = x || '(not set)'; }); if (vals[f[0]] && !o[vals[f[0]]]) o[vals[f[0]]] = vals[f[0]];
          inner.appendChild(k.field(f[1], k.sel(o, vals[f[0]] || '', function (v) { setField(d, f[0], f[1], v); }), f[2]));
          return;
        }
        var long = !/^(name|dba|email|phone|website|location|price|role|links|headline|manager|ein|ssn4|ssnwhere)$/.test(f[0]);
        var el = long ? h('textarea', { rows: Math.min(8, Math.max(2, Math.ceil((vals[f[0]] || '').length / 55) + 1)), value: vals[f[0]] || '', 'aria-label': f[1] })
          : k.inp({ value: vals[f[0]] || '', 'aria-label': f[1], type: f[0] === 'email' ? 'email' : f[0] === 'phone' ? 'tel' : 'text', autocapitalize: 'sentences', spellcheck: f[0] !== 'email', inputmode: f[0] === 'ssn4' ? 'numeric' : undefined, maxlength: f[0] === 'ssn4' ? 11 : undefined });
        el.addEventListener('change', function () {
          var v = el.value.trim();
          if (f[0] === 'ssn4') { var dg = v.replace(/\D/g, ''); if (dg.length > 4) { v = dg.slice(-4); el.value = v; k.snack('Only the last 4 digits are kept here. Put the full number in an Accounts card.'); } else v = dg; }
          setField(d, f[0], f[1], v);
        });
        inner.appendChild(k.field(f[1], el, f[2]));
      });
      var filled = g[1].filter(function (f) { return (vals[f[0]] || '').trim(); }).length;
      box.appendChild(k.acc('bf-' + d.kind + '-' + gi, g[0], [inner], gi === 0, filled + '/' + g[1].length));
    });
    return box;
  }
  function profileForm(S, folder, p) {
    var d = B.profileDoc(S, folder), vals = B.values(S, d), all = fields(B.PROFILE), n = all.filter(function (x) { return (vals[x] || '').trim(); }).length;
    p.appendChild(h('div', { cls: 'bar thin', title: n + ' of ' + all.length }, h('i', { cls: 'conf', style: 'width:' + Math.round(n / all.length * 100) + '%' })));
    p.appendChild(formGroups(B.PROFILE, d, vals, 'Fill in what you know; leave the rest. It saves when you tap out of a box (' + n + ' of ' + all.length + ' filled). Every document in this business starts from these answers.'));
  }

  /* ---------- people (role cards + résumés) ---------- */
  function peopleList(S, folder, p) {
    var a = app(), k = K(), ppl = B.people(S, folder);
    p.appendChild(h('p', { cls: 'small', text: 'Everyone in the business, starting with you: their role, and a résumé ready to send. Even a one-person business needs this.' }));
    ppl.forEach(function (d) {
      var v = B.values(S, d), n = B.items(S, d.key).length;
      p.appendChild(h('button', { type: 'button', cls: 'acard', onclick: function () { st.person = d.key; ui.renderPanel(true); } },
        h('span', { cls: 'avatar', text: String(v.name || d.title || '?').charAt(0).toUpperCase() }),
        h('span', { cls: 'acbody' }, h('b', { text: v.name || d.title || 'Unnamed' }), h('span', { cls: 'small', text: [v.role, v.headline, n ? n + ' résumé entr' + (n === 1 ? 'y' : 'ies') : ''].filter(Boolean).join(' · ') }))));
    });
    p.appendChild(k.btn('+ Person', function () {
      k.editSheet('Add a person', [{ label: 'Full name', value: '' }, { label: 'Position / title', value: '' }], function (v) {
        if (!v[0].trim()) return;
        var key = nid('per-');
        a.addEvents([{ type: 'pdoc', data: { key: key, folder: folder, title: v[0].trim().slice(0, 60), kind: 'person', order: fields(B.PERSON) } },
          { type: 'psec', data: { doc: key, sid: 'name', h: 'Full name', text: v[0].trim() } }, { type: 'psec', data: { doc: key, sid: 'role', h: 'Position / title in this business', text: v[1].trim() } }])
          .then(function () { st.person = key; ui.renderPanel(true); });
      });
    }, 'primary'));
  }
  function personView(S, d) {
    var a = app(), k = K(), p = body(), v = B.values(S, d);
    p.appendChild(h('div', { cls: 'row spread' }, k.btn('< People', function () { st.person = null; st.bsub = 'people'; ui.renderPanel(true); }, 'mini ghost'),
      h('span', { cls: 'row' }, k.btn('Import a résumé', function () { importSheet(d); }, 'mini'),
        k.btn('Remove', function () {
          var back = { key: d.key, folder: d.folder, title: d.title, kind: 'person', order: d.order };
          a.addEvents([{ type: 'pdoc', data: Object.assign({}, back, { removed: true }) }]).then(function () { st.person = null; ui.renderPanel(true); k.snack('Removed ' + (v.name || 'person') + '.', function () { a.addEvents([{ type: 'pdoc', data: back }]); }); });
        }, 'mini del'))));
    p.appendChild(h('h3', { cls: 'ltitle', text: (v.name || 'Unnamed') + (v.role ? ' · ' + v.role : '') }));
    p.appendChild(formGroups(B.PERSON, d, v, 'Tap PDF (top) for the résumé. Your role card and résumé feed the business plan and your outreach drafts.'));
    Object.keys(B.ITEM).forEach(function (sec) {
      var it = B.ITEM[sec], list = B.items(S, d.key, sec), box = h('div');
      if (!list.length) box.appendChild(k.empty('None yet.'));
      list.forEach(function (x, i) {
        box.appendChild(h('div', { cls: 'item col cvitem' },
          h('div', { cls: 'row spread' }, h('b', { text: [x.title, x.org].filter(Boolean).join(' · ') || '(untitled)' }), h('span', { cls: 'small', text: dates(x) })),
          x.where ? h('span', { cls: 'small', text: x.where }) : null,
          x.text ? h('span', { cls: 'jval small', text: x.text }) : null,
          h('div', { cls: 'row' }, i > 0 ? k.btn('Up', function () { moveItem(list, i, -1); }, 'mini') : null, k.btn('Edit', function () { itemSheet(d, sec, x); }, 'mini'),
            k.btn('X', function () { var back = Object.assign({}, x); delete back.m; delete back.t; a.addEvents([{ type: 'cv_item', data: { key: x.key, removed: true } }]).then(function () { k.snack('Removed.', function () { a.addEvents([{ type: 'cv_item', data: back }]); }); }); }, 'mini del'))));
      });
      box.appendChild(k.btn('+ ' + it[0].replace(/s and.*$/, '').replace(/s$/, ''), function () { itemSheet(d, sec, null); }, 'mini'));
      p.appendChild(k.acc('cv-' + sec, it[0], [box], sec === 'exp', list.length));
    });
  }
  function dates(x) { return [x.start, x.end].filter(Boolean).join(' - '); }
  function moveItem(list, i, dir) {
    var ev = list.map(function (x, j) { var c = Object.assign({}, x); delete c.m; delete c.t; c.order = j === i ? i + dir : j === i + dir ? i : j; return { type: 'cv_item', data: c }; });
    app().addEvents(ev);
  }
  function itemSheet(d, sec, x) {
    var a = app(), k = K(), it = B.ITEM[sec];
    k.editSheet((x ? 'Edit ' : 'Add ') + it[0].toLowerCase().replace(/s$/, ''), [
      { label: it[1], value: x ? x.title : '' }, { label: it[2], value: x ? x.org : '' }, { label: 'Where (city or remote)', value: x ? x.where : '' },
      { label: 'Start (e.g. 2021 or Mar 2021)', value: x ? x.start : '' }, { label: 'End (or "Present")', value: x ? x.end : '' },
      { label: sec === 'exp' || sec === 'proj' ? 'What you did (one point per line)' : 'Notes', value: x ? x.text : '', type: 'textarea' }
    ], function (v) {
      if (!v[0].trim() && !v[1].trim()) return;
      a.addEvents([{ type: 'cv_item', data: { key: x ? x.key : nid('cv-'), person: d.key, sec: sec, title: v[0].trim(), org: v[1].trim(), where: v[2].trim(), start: v[3].trim(), end: v[4].trim(), text: v[5].trim(), order: x ? x.order || 0 : B.items(a.S, d.key, sec).length } }]);
    });
  }

  /* ---------- importing a résumé you already have (text, Word, most PDFs, or pasted) ---------- */
  function importSheet(d) {
    var a = app(), k = K(), s, ta = h('textarea', { rows: 8, placeholder: 'Paste your résumé text here, or pick a file above.', 'aria-label': 'Résumé text' }), m = h('p', { cls: 'formmsg' });
    var file = h('input', { type: 'file', accept: '.txt,.md,.docx,.pdf,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    file.addEventListener('change', function () {
      var f = file.files[0]; if (!f) return;
      k.msg(m, 'Reading ' + f.name + '...');
      B.fileText(f).then(function (t) { ta.value = t; k.msg(m, t.trim().length > 40 ? 'Read it. Check the text, then tap Sort it into my card.' : 'This file had almost no readable text (it may be a scanned image). Paste the text instead.', t.trim().length <= 40); }, function (e) { k.msg(m, e.message, true); });
    });
    var replace = h('input', { type: 'checkbox' });
    s = k.sheet('Import a résumé', [h('p', { cls: 'small', text: 'Pick a .txt, .docx (Word) or .pdf file, or paste the text. Aiu sorts it into name, contact, summary, skills, jobs, schools and projects. You can fix anything after.' }),
      file, ta, h('label', { cls: 'item' }, replace, h('span', { cls: 'ititle', text: 'Replace what\'s already filled in (otherwise only empty boxes are filled)' })), m,
      h('div', { cls: 'row spread' }, h('span'), k.btn('Sort it into my card', function () {
        var t = ta.value.trim(); if (t.length < 20) return k.msg(m, 'Add the résumé text first.', true);
        var r = B.parseResume(t), cur = B.values(a.S, d), ev = [];
        var LBL = {}; B.PERSON.forEach(function (g) { g[1].forEach(function (x) { LBL[x[0]] = x[1]; }); });
        Object.keys(r.fields).forEach(function (f) { if (r.fields[f] && (replace.checked || !(cur[f] || '').trim())) ev.push({ type: 'psec', data: { doc: d.key, sid: f, h: LBL[f] || f, text: r.fields[f] } }); });
        var base = B.items(a.S, d.key).length;
        if (replace.checked) { B.items(a.S, d.key).forEach(function (x) { ev.push({ type: 'cv_item', data: { key: x.key, removed: true } }); }); base = 0; }
        r.items.forEach(function (x, i) { ev.push({ type: 'cv_item', data: Object.assign({ key: nid('cv-'), person: d.key, order: base + i }, x) }); });
        s.remove();
        a.addEvents(ev).then(function () { ui.renderPanel(true); k.snack('Added ' + Object.keys(r.fields).filter(function (f) { return r.fields[f]; }).length + ' fields and ' + r.items.length + ' entries. Check them over.'); });
      }, 'primary'))]);
  }
  B.fileText = function (f) {
    var name = lc(f.name);
    if (/\.(txt|md|text)$/.test(name) || /^text\//.test(f.type)) return f.text();
    return f.arrayBuffer().then(function (buf) {
      var u8 = new Uint8Array(buf);
      if (u8[0] === 0x50 && u8[1] === 0x4b) return U.readZip(buf).then(function (files) { // .docx
        var x = files['word/document.xml']; if (!x) throw new Error('That isn\'t a Word file Aiu can read.');
        return U.fromUtf8(x).replace(/<w:tab\/>/g, '\t').replace(/<w:br[^>]*\/>/g, '\n').replace(/<\/w:p>/g, '\n').replace(/<[^>]+>/g, '')
          .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/\n{3,}/g, '\n\n');
      });
      if (u8[0] === 0x25 && u8[1] === 0x50) return pdfText(u8); // %PDF
      throw new Error('Aiu can read .txt, .docx and .pdf files. For anything else, paste the text.');
    });
  };
  // Pulls the text out of most simple PDFs (no outside code). Scanned or unusual PDFs may come back empty: paste instead.
  function pdfText(u8) {
    var raw = ''; for (var i = 0; i < u8.length; i++) raw += String.fromCharCode(u8[i]);
    var re = /<<((?:(?!>>)[\s\S]){0,600})>>\s*stream\r?\n/g, m, jobs = [];
    while ((m = re.exec(raw))) {
      var start = re.lastIndex, end = raw.indexOf('endstream', start); if (end < 0) break;
      var dict = m[1], bytes = u8.subarray(start, end);
      if (/\/(Subtype\s*\/Image|Length1|FontFile)/.test(dict)) continue;
      if (/ASCII85Decode/.test(dict)) { try { bytes = a85(bytes); } catch (e) { continue; } }
      if (/FlateDecode/.test(dict)) jobs.push(inflate(bytes).catch(function () { return ''; }));
      else if (/ASCII85Decode/.test(dict)) jobs.push(Promise.resolve(String.fromCharCode.apply(null, Array.prototype.slice.call(bytes, 0, 200000))));
      else if (!/\/Filter/.test(dict)) jobs.push(Promise.resolve(String.fromCharCode.apply(null, Array.prototype.slice.call(bytes, 0, 200000))));
    }
    return Promise.all(jobs).then(function (parts) { return parts.map(textOps).filter(Boolean).join('').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim(); });
  }
  // ASCII85 (some PDF makers wrap their text this way)
  function a85(bytes) {
    var out = [], g = [], i, c;
    for (i = 0; i < bytes.length; i++) {
      c = bytes[i];
      if (c === 0x7e) break; // ~>
      if (c <= 0x20) continue;
      if (c === 0x7a && !g.length) { out.push(0, 0, 0, 0); continue; } // z
      g.push(c - 33);
      if (g.length === 5) { var n = (((g[0] * 85 + g[1]) * 85 + g[2]) * 85 + g[3]) * 85 + g[4]; out.push((n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255); g = []; }
    }
    if (g.length) { var k = g.length; while (g.length < 5) g.push(84); var m = (((g[0] * 85 + g[1]) * 85 + g[2]) * 85 + g[3]) * 85 + g[4]; var b4 = [(m >>> 24) & 255, (m >>> 16) & 255, (m >>> 8) & 255, m & 255]; out = out.concat(b4.slice(0, k - 1)); }
    return new Uint8Array(out);
  }
  function inflate(bytes) {
    if (!window.DecompressionStream) return Promise.reject(new Error('no inflate'));
    var ds = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
    return new Response(ds).arrayBuffer().then(function (ab) { var b = new Uint8Array(ab), s = ''; for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return s; });
  }
  function textOps(s) {
    if (!/BT[\s\S]*ET/.test(s)) return '';
    function nl() { if (out && out.slice(-1) !== '\n') out += '\n'; }
    var out = '', tok = /\((?:\\[\s\S]|[^\\)])*\)|-?\d+\.?\d*\s+-?\d+\.?\d*\s+T[dD]|T\*|'|"|ET|\[|\]|-?\d+\.?\d*(?=\s*[\]\(<-\d])/g, t, inArr = false;
    while ((t = tok.exec(s))) {
      var v = t[0];
      if (v.charAt(0) === '(') out += v.slice(1, -1).replace(/\\n/g, '\n').replace(/\\r/g, '').replace(/\\t/g, ' ').replace(/\\\(/g, '(').replace(/\\\)/g, ')').replace(/\\\\/g, '\\').replace(/\\(\d{1,3})/g, function (x, o) { return String.fromCharCode(parseInt(o, 8)); });
      else if (v === '[') inArr = true; else if (v === ']') inArr = false;
      else if (/T[dD]$/.test(v)) { var y = +v.split(/\s+/)[1]; if (Math.abs(y) > 0.5) nl(); else out += ' '; }
      else if (v === 'T*' || v === "'" || v === '"') nl();
      else if (v === 'ET') nl();
      else if (inArr && +v < -180) out += ' ';
    }
    return out.replace(/[^\x09\x0a\x20-\x7e\xa0-\xff]/g, '');
  }
  var HEAD = [['summary', /^(professional )?(summary|profile|objective|about( me)?|career objective)\b/i], ['exp', /^(work |professional |relevant )?(experience|employment|work history|career history)\b/i],
    ['edu', /^(education|academic|training)\b/i], ['skills', /^(skills|technical skills|core (skills|competencies)|tools|software|expertise)\b/i], ['proj', /^(projects|portfolio|selected work)\b/i],
    ['cert', /^(certifications?|licenses?|awards|honors|achievements)\b/i]];
  var DATE = /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+)?(19|20)\d{2}\s*(?:-|–|—|to)\s*(((?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+)?(19|20)\d{2}|present|current|now)/i;
  // Résumé text -> {fields: {name, email, phone, links, headline, summary, hard}, items: [{sec, title, org, where, start, end, text}]}
  B.parseResume = function (text) {
    var lines = String(text).replace(/\r/g, '').split('\n').map(function (l) { return l.replace(/\s+/g, ' ').trim(); });
    var all = lines.join('\n'), f = {}, items = [];
    var em = /[\w.+-]+@[\w-]+\.[\w.-]+/.exec(all); if (em) f.email = em[0];
    var ph = /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/.exec(all); if (ph) f.phone = ph[0];
    var links = all.match(/\b(?:https?:\/\/|www\.)[^\s,;]+|\b[\w-]+\.(?:com|net|org|io|dev|design|art)(?:\/[^\s,;]*)?/gi) || [];
    links = links.filter(function (x) { return !em || em[0].indexOf(x) < 0; }); if (links.length) f.links = links.slice(0, 4).join(', ');
    var body = lines.filter(Boolean), first = body[0] || '';
    if (first && first.split(' ').length <= 5 && !/@|\d{3}/.test(first) && !HEAD.some(function (hh) { return hh[1].test(first); })) f.name = first;
    var second = body[1] || '';
    if (f.name && second && second.length < 70 && !/@|\d{3}/.test(second) && !HEAD.some(function (hh) { return hh[1].test(second); })) f.headline = second;
    // split into sections
    var sec = 'top', buckets = { top: [] };
    lines.forEach(function (l) {
      var hit = l && l.length < 40 && HEAD.filter(function (hh) { return hh[1].test(l.replace(/[:\-–_*#]+$/, '').trim()); })[0];
      if (hit) { sec = hit[0]; buckets[sec] = buckets[sec] || []; return; }
      (buckets[sec] = buckets[sec] || []).push(l);
    });
    if (buckets.summary) f.summary = buckets.summary.filter(Boolean).join(' ').slice(0, 1500);
    if (buckets.skills) f.hard = buckets.skills.filter(Boolean).map(function (l) { return l.replace(/^[•*\-–·]\s*/, ''); }).join(', ').replace(/\s*,\s*,/g, ',').slice(0, 1500);
    ['exp', 'edu', 'proj', 'cert'].forEach(function (s) {
      if (!buckets[s]) return;
      var blocks = [], cur = [];
      buckets[s].forEach(function (l) {
        var bullet = /^[•*\-–·]\s+/.test(l);
        if (!l) { if (cur.length) { blocks.push(cur); cur = []; } return; }
        var lastBullet = cur.length && /^[•*\-–·]\s+/.test(cur[cur.length - 1]);
        if (!bullet && !DATE.test(l) && lastBullet) { blocks.push(cur); cur = []; } // a new title after bullet points = a new entry
        else if (!bullet && DATE.test(l) && cur.length && cur.some(function (x) { return DATE.test(x); })) {
          var carry = cur.length > 1 && !/^[•*\-–·]\s+/.test(cur[cur.length - 1]) && !DATE.test(cur[cur.length - 1]) ? [cur.pop()] : [];
          blocks.push(cur); cur = carry;
        }
        cur.push(l);
      });
      if (cur.length) blocks.push(cur);
      blocks.forEach(function (bl) {
        var x = { sec: s, title: '', org: '', where: '', start: '', end: '', text: '' }, rest = [];
        bl.forEach(function (l) {
          var dm = DATE.exec(l);
          if (dm && !x.start) { var parts = dm[0].split(/\s*(?:-|–|—|to)\s*/i); x.start = parts[0]; x.end = /present|current|now/i.test(parts[1]) ? 'Present' : parts[1]; l = l.replace(dm[0], '').replace(/[|,\s–-]+$/, '').trim(); if (!l) return; }
          if (!x.title && !/^[•*\-–·]/.test(l)) { var sp = l.split(/\s+(?:at|@|\||–|—|-)\s+|,\s+/); x.title = sp[0]; x.org = sp[1] || ''; x.where = sp.slice(2).join(', '); return; }
          if (!x.org && !/^[•*\-–·]/.test(l) && l.length < 60 && !rest.length) { x.org = l; return; }
          rest.push(l.replace(/^[•*\-–·]\s*/, ''));
        });
        x.text = rest.join('\n').slice(0, 3000);
        if (x.title || x.text) items.push(x);
      });
    });
    return { fields: f, items: items };
  };

  /* ---------- documents ---------- */
  function docList(S, folder, p) {
    var a = app(), k = K(), docs = docsOf(S, folder).filter(function (d) { return d.kind !== 'profile' && d.kind !== 'person'; });
    p.appendChild(h('p', { cls: 'small', text: 'Pick a template and it fills in from your profile. Grey text means "from your profile": type over it to change it for this document only.' }));
    if (!docs.length) p.appendChild(k.empty('No documents yet.'));
    docs.forEach(function (d) {
      var secs = PL.sections(S, d), filled = secs.filter(function (x) { return x.text.trim() || autoText(S, d, x); }).length;
      p.appendChild(h('button', { type: 'button', cls: 'qrow', onclick: function () { st.doc = d.key; ui.renderPanel(true); } }, h('span', { cls: 'qrtitle', text: d.title }),
        h('span', { cls: 'qrmeta', text: (T[d.kind] ? T[d.kind].title : 'Document') + ' · ' + filled + '/' + secs.length + ' filled' })));
    });
    var opts = {}; DOC_KINDS.forEach(function (x) { opts[x] = T[x].title; });
    var tpl = k.sel(opts, 'onepage', function () {});
    p.appendChild(h('div', { cls: 'row addrow' }, tpl, k.btn('+ Document', function () {
      var nd = PL.newDoc(folder, tpl.value, T[tpl.value].title);
      a.addEvents(nd.events).then(function () { st.doc = nd.key; ui.renderPanel(true); });
    }, 'mini primary')));
  }
  // What a section shows when you haven't written it for this document: the profile answer, the people, or your money
  function autoText(S, d, x) {
    var link = linkOf(d.kind, x.h); if (!link) return '';
    if (link === '@people') return B.people(S, d.folder).map(function (pd) { var v = B.values(S, pd); return (v.name || pd.title) + (v.role ? ' - ' + v.role : '') + (v.overview ? ': ' + v.overview : ''); }).join('\n');
    if (link === '@money') { var mo = today().slice(0, 7), sum = PL.month(S, mo, d.folder), w = PL.worth(S, d.folder); return 'This month: money in ' + PL.money(sum.income) + ', money out ' + PL.money(sum.out) + ', cash flow ' + PL.money(sum.net) + '.\nBusiness net worth: ' + PL.money(w.totalAssets) + ' owned - ' + PL.money(w.totalDebts) + ' owed = ' + PL.money(w.net) + '.\n(From this business\'s Finance.)'; }
    return B.values(S, B.profileDoc(S, d.folder))[link] || '';
  }
  function docView(S, d) {
    var a = app(), k = K(), p = body(), secs = PL.sections(S, d);
    function setOrder(order) { return a.addEvents([{ type: 'pdoc', data: { key: d.key, folder: d.folder, title: d.title, kind: d.kind, order: order } }]); }
    p.appendChild(h('div', { cls: 'row spread' }, k.btn('< Documents', function () { st.doc = null; st.bsub = 'docs'; ui.renderPanel(true); }, 'mini ghost'),
      h('span', { cls: 'row' }, k.btn('Rename', function () { k.editSheet('Rename document', [{ label: 'Title', value: d.title }], function (v) { var t = v[0].trim().slice(0, 80); if (t) a.addEvents([{ type: 'pdoc', data: { key: d.key, folder: d.folder, title: t, kind: d.kind, order: d.order } }]); }); }, 'mini'),
        k.btn('Delete', function () {
          a.addEvents([{ type: 'pdoc', data: { key: d.key, folder: d.folder, title: d.title, kind: d.kind, order: d.order, removed: true } }]).then(function () { st.doc = null; ui.renderPanel(true); k.snack('Deleted "' + d.title + '".', function () { a.addEvents([{ type: 'pdoc', data: { key: d.key, folder: d.folder, title: d.title, kind: d.kind, order: d.order } }]); }); });
        }, 'mini del'))));
    p.appendChild(h('h3', { cls: 'ltitle', text: d.title }));
    secs.forEach(function (sx, i) {
      var auto = autoText(S, d, sx), link = linkOf(d.kind, sx.h);
      var ta = h('textarea', { rows: Math.min(12, Math.max(2, Math.ceil(Math.max(sx.text.length, auto.length) / 55) + 1)), value: sx.text, 'aria-label': sx.h, placeholder: auto ? auto : 'Write here...' });
      ta.addEventListener('change', function () { a.addEvents([{ type: 'psec', data: { doc: d.key, sid: sx.sid, h: sx.h, text: ta.value } }]); });
      p.appendChild(h('div', { cls: 'dsec' },
        h('div', { cls: 'row spread' }, h('b', { cls: 'dsh', text: sx.h || 'Section' }), h('span', { cls: 'row' },
          i > 0 ? k.iconBtn('Move up: ' + sx.h, 'Up', function () { var o = d.order.slice(); o.splice(i - 1, 0, o.splice(i, 1)[0]); setOrder(o); }) : null,
          k.iconBtn('Remove section ' + sx.h, 'X', function () { var o = d.order.filter(function (x) { return x !== sx.sid; }); setOrder(o).then(function () { k.snack('Section removed.', function () { setOrder(d.order); }); }); }, 'del'))),
        link && !sx.text.trim() ? h('span', { cls: 'small', text: link === '@people' ? 'From People' : link === '@money' ? 'From this business\'s Finance' : 'From your profile: ' + (PF[link] || link) }) : null,
        ta));
    });
    p.appendChild(k.btn('+ Add a section', function () {
      k.editSheet('New section', [{ label: 'Heading', value: '' }], function (v) {
        var hd = v[0].trim().slice(0, 80); if (!hd) return;
        var sid = 'x' + U.id().slice(-6).toLowerCase();
        a.addEvents([{ type: 'psec', data: { doc: d.key, sid: sid, h: hd, text: '' } }, { type: 'pdoc', data: { key: d.key, folder: d.folder, title: d.title, kind: d.kind, order: d.order.concat([sid]) } }]);
      });
    }, 'primary'));
  }

  /* ---------- outreach: elevator pitch and emails, written from your profile and résumé ---------- */
  var TARGETS = { agency: 'An agency (subcontract work)', whitelabel: 'A white-label agency', business: 'A business (direct client)', job: 'A job (employer)' };
  function outreach(S, folder, p) {
    var a = app(), k = K(), ppl = B.people(S, folder), drafts = B.drafts(S, folder);
    p.appendChild(h('p', { cls: 'small', text: 'Need work? Pick who you\'re reaching out to and Aiu writes a 30-second elevator pitch, a cold email, a follow-up, and a cover letter or capability statement from your profile and résumé. Edit them, copy them, or save them as PDF. Nothing is ever sent from here.' }));
    if (!ppl.length) { p.appendChild(k.empty('Add yourself in People first.')); return; }
    var pOpts = {}; ppl.forEach(function (d) { pOpts[d.key] = B.values(S, d).name || d.title; });
    var who = k.sel(pOpts, ppl[0].key, function () {}), kind = k.sel(TARGETS, 'agency', function () {});
    var tname = k.inp({ placeholder: 'e.g. Brightside Creative', autocapitalize: 'words' }), contact = k.inp({ placeholder: 'e.g. Sam (optional)', autocapitalize: 'words' }), why = k.inp({ placeholder: 'e.g. you make packaging for indie game studios (optional)', autocapitalize: 'none' });
    p.appendChild(h('div', { cls: 'outbox' }, h('div', { cls: 'row2' }, k.field('From', who), k.field('Reaching out to', kind)), h('div', { cls: 'row2' }, k.field('Their name', tname), k.field('Contact person', contact)),
      k.field('Why them (one line)', why), k.btn('Write my drafts', function () {
        var pd = a.S.pdocs[who.value], ctx = { biz: folder, P: B.values(a.S, B.profileDoc(a.S, folder)), me: B.values(a.S, pd), items: B.items(a.S, pd.key), kind: kind.value, target: tname.value.trim(), contact: contact.value.trim(), why: why.value.trim() };
        var set = B.write(ctx), ev = set.map(function (x, i) { return { type: 'cv_doc', data: { key: nid('dr-'), biz: folder, person: pd.key, kind: x.kind, target: ctx.target, title: x.title, text: x.text, n: i, at: Date.now() } }; });
        a.addEvents(ev).then(function () { ui.renderPanel(true); k.snack('Wrote ' + ev.length + ' drafts below. Fill in anything in [brackets].'); });
      }, 'primary')));
    if (drafts.length) p.appendChild(h('h3', { cls: 'qgroup', text: 'Your drafts' }));
    drafts.forEach(function (x) {
      var ta = h('textarea', { rows: Math.min(14, Math.max(4, Math.ceil(x.text.length / 60))), value: x.text, 'aria-label': x.title });
      ta.addEventListener('change', function () { var c = Object.assign({}, x); delete c.m; delete c.t; c.text = ta.value; a.addEvents([{ type: 'cv_doc', data: c }]); });
      p.appendChild(h('div', { cls: 'dsec' }, h('div', { cls: 'row spread' }, h('b', { cls: 'dsh', text: x.title }), h('span', { cls: 'small', text: U.fmtDay(U.dayStr(new Date(x.t))) })), ta,
        h('div', { cls: 'row wrap' }, k.btn('Copy', function () { copy(ta.value); }, 'mini'),
          k.btn('Delete', function () { var c = Object.assign({}, x); delete c.m; delete c.t; a.addEvents([{ type: 'cv_doc', data: { key: x.key, removed: true } }]).then(function () { k.snack('Draft deleted.', function () { a.addEvents([{ type: 'cv_doc', data: c }]); }); }); }, 'mini del'))));
    });
  }
  function copy(t) { var k = K(); if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { k.snack('Copied.'); }, function () { k.snack('Copy didn\'t work here. Select the text instead.'); }); else k.snack('Select the text and copy it.'); }
  function first(s, n) { return String(s || '').split(/\s*[,\n;]\s*/).map(function (x) { return x.replace(/^[•*\-–·]\s*/, '').trim(); }).filter(Boolean).slice(0, n || 4); }
  function lw(s) { s = String(s || ''); return /^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s; } // "Designer" -> "designer", keeps "3D", "SEO"
  function join(a) { return a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
  // The drafts. ctx: {biz, P (profile), me (person), items, kind, target, contact, why}
  B.write = function (c) {
    var P = c.P, me = c.me, name = me.name || '[your name]', biz = P.name || c.biz, role = me.headline || me.role || P.industry || '[what you do]';
    var skills = first(me.hard || P.products, 4), offer = P.offer || P.products || '[what you offer]', aud = P.audience || 'teams like yours';
    var proof = c.items.filter(function (x) { return x.sec === 'exp' || x.sec === 'proj'; }).slice(0, 2).map(function (x) { return x.title + (x.org ? (x.sec === 'exp' ? ' at ' : ' for ') + x.org : ''); });
    var link = P.website || first(me.links, 1)[0] || '[portfolio link]', them = c.target || '[their company]', hi = 'Hi ' + (c.contact || 'there') + ',';
    var sig = name + '\n' + [me.role && biz ? me.role + ', ' + biz : biz, me.email || P.email, me.phone || P.phone, link].filter(Boolean).join('\n');
    var goal = { agency: 'take on subcontract work when your team needs extra hands', whitelabel: 'work white-label behind your brand, on your deadlines and your process', business: 'help you directly with ' + lc(offer), job: 'join your team' + (me.role ? ' as a ' + lc(me.role) : '') }[c.kind];
    var out = [];
    out.push({ kind: 'pitch', title: 'Elevator pitch (30 seconds)', text: 'Hi, I\'m ' + name + ', ' + (/^[aeiou]/i.test(role) ? 'an ' : 'a ') + lw(role) + (biz && biz !== name ? ' with ' + biz : '') + '. I help ' + aud + ' with ' + lw(offer) + '. ' +
      (P.advantage ? 'What makes my work different: ' + P.advantage.replace(/\.$/, '') + '. ' : '') + (proof.length ? 'Recent work: ' + join(proof) + '. ' : '') + 'I\'m looking to ' + goal + '. Could we find 15 minutes to talk?' });
    var subj = { agency: 'Extra hands for ' + them + ': ' + lw(role), whitelabel: 'White-label ' + lw(role) + ' for ' + them, business: lc(offer).slice(0, 50) + ' for ' + them, job: (me.role || role) + ' - ' + name }[c.kind];
    out.push({ kind: 'email', title: 'Cold email to ' + them, text: 'Subject: ' + subj.charAt(0).toUpperCase() + subj.slice(1) + '\n\n' + hi + '\n\n' +
      'I came across ' + them + (c.why ? ' and ' + c.why.replace(/\.$/, '') : '') + '. I\'m ' + name + ', ' + (/^[aeiou]/i.test(role) ? 'an ' : 'a ') + lw(role) + (biz && biz !== name ? ' at ' + biz : '') + '.\n\n' +
      'I\'d like to ' + goal + '. ' + (skills.length ? 'I work in ' + join(skills) + '. ' : '') + (proof.length ? 'Recent work: ' + join(proof) + '. ' : '') + (P.advantage ? P.advantage.replace(/\.$/, '') + '. ' : '') + '\n\n' +
      (c.kind === 'job' ? '' : 'Rates and availability: ' + (P.price || '[your rate]') + ', [how soon you can start].\n\n') +
      'You can see my work at ' + link + '. Would a short call next week work for you?\n\nThanks,\n' + sig });
    out.push({ kind: 'followup', title: 'Follow-up email (send after a week)', text: 'Subject: Re: ' + subj + '\n\n' + hi + '\n\nJust following up on my note from last week. If ' + them + ' ever needs ' + (skills[0] ? lc(skills[0]) : 'a hand') + ', I\'d be glad to help, even on a small test project first.\n\nMy work: ' + link + '\n\nThanks,\n' + name });
    if (c.kind === 'job') out.push({ kind: 'cover', title: 'Cover letter for ' + them, text: '## Cover letter\n' + PN.nice(today()) + '\n\n' + (c.contact ? 'Dear ' + c.contact + ',' : 'Dear hiring team,') + '\n\n' +
      'I\'m applying to join ' + them + (me.role ? ' as a ' + lc(me.role) : '') + '. ' + (me.summary || 'I bring hands-on experience and a habit of finishing what I start.') + '\n\n' +
      (proof.length ? 'Most recently I worked on ' + join(proof) + '. ' : '') + (skills.length ? 'My strongest skills are ' + join(skills) + '. ' : '') + (c.why ? 'I\'m drawn to ' + them + ' because ' + c.why.replace(/^(you|they)\s+/i, 'you ').replace(/\.$/, '') + '.' : '') + '\n\n' +
      'Thank you for your time. I\'d welcome the chance to talk.\n\nSincerely,\n' + sig });
    else out.push({ kind: 'capability', title: 'Capability statement', text: '## ' + biz + '\n' + (P.tagline || role) + '\n\n## Core competencies\n' + (skills.length ? skills.map(function (s) { return '- ' + s; }).join('\n') : '- [your main skills]') + '\n\n' +
      '## Past performance\n' + (proof.length ? proof.map(function (s) { return '- ' + s; }).join('\n') : '- [a project or client you\'re proud of]') + '\n\n## What sets us apart\n' + (P.advantage || '[your competitive advantage]') + '\n\n' +
      '## Company data\n' + [biz, P.legal, P.location, P.website, P.email || me.email, P.phone || me.phone].filter(Boolean).map(function (s) { return '- ' + s; }).join('\n') });
    return out;
  };

  /* ---------- PDFs ---------- */
  // Simple text (## headings, - bullets, blank lines) -> PDF blocks
  function textBlocks(title, text) {
    var b = [];
    String(text || '').split('\n').forEach(function (l) {
      if (/^##\s+/.test(l)) b.push({ t: 'h2', text: l.replace(/^##\s+/, '') });
      else if (/^[-•*]\s+/.test(l)) b.push({ t: 'li', text: l.replace(/^[-•*]\s+/, '') });
      else if (!l.trim()) b.push({ t: 'gap', h: 6 });
      else b.push({ t: 'p', text: l });
    });
    return b;
  }
  B.textBlocks = textBlocks;
  B.packetPdf = function (S, f) { return packetPdf(S, f); }; B.peopleDocs = function (S, f) { return B.people(S, f).map(function (d) { return resumeDoc(S, d); }); };
  function profilePdf(S, folder) {
    var v = B.values(S, B.profileDoc(S, folder)), b = [{ t: 'title', text: v.name || folder }, { t: 'sub', text: [v.tagline, 'Business profile', PN.nice(today())].filter(Boolean).join(' · ') }];
    B.PROFILE.forEach(function (g) {
      var rows = g[1].filter(function (f) { return (v[f[0]] || '').trim() && f[0] !== 'name'; });
      if (!rows.length) return;
      b.push({ t: 'sec', text: g[0] });
      rows.forEach(function (f) { b.push({ t: 'h3', text: f[1] }); b = b.concat(textBlocks('', v[f[0]])); });
    });
    var ppl = B.people(S, folder);
    if (ppl.length) { b.push({ t: 'sec', text: 'People' }); ppl.forEach(function (pd) { var pv = B.values(S, pd); b.push({ t: 'lr', text: pv.name || pd.title, right: pv.role || '', sub: pv.overview || '' }); }); }
    return { title: (v.name || folder) + ' profile', blocks: b };
  }
  function docPdf(S, d) {
    var pv = B.values(S, B.profileDoc(S, d.folder)), b = [{ t: 'title', text: d.title }, { t: 'sub', text: [pv.name || d.folder, pv.tagline, PN.nice(today())].filter(Boolean).join(' · ') }];
    if (pv.email || pv.phone || pv.website) b.push({ t: 'small', text: [pv.email, pv.phone, pv.website, pv.address].filter(Boolean).join('  |  ') });
    PL.sections(S, d).forEach(function (x) {
      var t = x.text.trim() || autoText(S, d, x); if (!t) return;
      b.push({ t: 'sec', text: x.h }); b = b.concat(textBlocks('', t));
    });
    return { title: d.title, blocks: b };
  }
  function packetPdf(S, folder) {
    var b = profilePdf(S, folder).blocks;
    docsOf(S, folder).filter(function (d) { return d.kind !== 'profile' && d.kind !== 'person'; }).forEach(function (d) { b.push({ t: 'break' }); b = b.concat(docPdf(S, d).blocks); });
    return { title: folder + ' business packet', blocks: b };
  }
  function resumeDoc(S, d) {
    var v = B.values(S, d), b = [];
    b.push({ t: 'title', text: v.name || d.title, center: true });
    if (v.headline || v.role) b.push({ t: 'p', text: v.headline || v.role, center: true });
    var contact = [v.location, v.email, v.phone, v.links].filter(Boolean).join('  |  ');
    if (contact) b.push({ t: 'small', text: contact, center: true });
    if (v.summary) { b.push({ t: 'sec', text: 'Summary' }); b.push({ t: 'p', text: v.summary }); }
    if (v.hard || v.soft) { b.push({ t: 'sec', text: 'Skills' }); if (v.hard) b.push({ t: 'kv', k: 'Tools and trades', v: first(v.hard, 30).join(', ') }); if (v.soft) b.push({ t: 'kv', k: 'Working style', v: first(v.soft, 20).join(', ') }); }
    [['exp', 'Experience'], ['proj', 'Projects'], ['edu', 'Education'], ['cert', 'Certifications and awards']].forEach(function (s) {
      var list = B.items(S, d.key, s[0]); if (!list.length) return;
      b.push({ t: 'sec', text: s[1] });
      list.forEach(function (x) {
        b.push({ t: 'lr', text: [x.title, x.org].filter(Boolean).join(', '), right: dates(x), sub: x.where });
        String(x.text || '').split('\n').map(function (l) { return l.replace(/^[•*\-–·]\s*/, '').trim(); }).filter(Boolean).forEach(function (l) { b.push({ t: 'li', text: l }); });
      });
    });
    return { title: 'Résumé - ' + (v.name || d.title), blocks: b };
  }
  B.resumeDoc = resumeDoc;
})();
