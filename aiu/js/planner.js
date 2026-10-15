/* AIU TOTEM - the Planner's rules: events, bills, money in and out, and business folders.
   Pure functions over the Totem's state (no screens here), so the Library, the PDF export and Aiu can all use them. */
(function () {
  'use strict';
  var U = AIU.util, C = AIU.core;
  var P = AIU.planner = {};

  P.KINDS = { event: 'Event', bill: 'Bill', income: 'Money in', expense: 'Money out', asset: 'Something I own (asset)', debt: 'Something I owe (debt)' };
  P.REPEATS = { once: 'Once', weekly: 'Every week', monthly: 'Every month', yearly: 'Every year' };
  P.CATS = ['Business', 'Home', 'Bills & utilities', 'Food', 'Vehicles', 'Animals', 'Health', 'Fun', 'Supplies', 'Other'];

  // 1.1.0: every money item belongs to an entity: you (personal, folder '') or one of your businesses (its folder name)
  P.ME = '@me'; // the folder that holds your personal profile
  P.entName = function (folder) { return folder ? folder : 'You (personal)'; };
  P.items = function (S, kind, ent) {
    var PL = S.plans || {};
    return Object.keys(PL).map(function (k) { return PL[k]; }).filter(function (p) { return !p.removed && p.title && (!kind || p.kind === kind) && (ent === undefined || ent === null || (p.folder || '') === ent); })
      .sort(function (a, b) { return (a.date || '') < (b.date || '') ? -1 : (a.date || '') > (b.date || '') ? 1 : (a.time || '') < (b.time || '') ? -1 : 1; });
  };
  function lastDayOf(month) { var d = U.dayToDate(month + '-01'); d.setMonth(d.getMonth() + 1); d.setDate(0); return d.getDate(); }
  // Does a planner item happen on this day?
  P.occursOn = function (p, day) {
    if (!p.date || day < p.date) return p.date === day;
    switch (p.repeat) {
      case 'weekly': return U.weekday(day) === U.weekday(p.date);
      case 'monthly': var want = +p.date.slice(8, 10), last = lastDayOf(day.slice(0, 7)); return +day.slice(8, 10) === Math.min(want, last);
      case 'yearly': return day.slice(5) === p.date.slice(5);
      default: return day === p.date;
    }
  };
  // The "paid" box for a bill: one per month (monthly), per year (yearly), or per day otherwise.
  P.period = function (p, day) { return p.repeat === 'monthly' ? day.slice(0, 7) : p.repeat === 'yearly' ? day.slice(0, 4) : day; };
  P.isPaid = function (S, p, day) { var r = (S.planPaid || {})[p.key + '|' + P.period(p, day)]; return !!(r && r.v); };

  // Everything on a day: reminders (from the reminder system) + planner items.
  P.dayItems = function (S, day) {
    var out = [];
    C.occurrences(S, day).forEach(function (o) { out.push({ src: 'task', key: o.key, title: o.title, time: o.time, done: o.done, kind: o.kind === 'wake' ? 'wake' : 'reminder' }); });
    // the daily I Ching cast shows on the calendar once you've picked a time (done = cast that day)
    var rt = AIU.mind && AIU.mind.readingTime ? AIU.mind.readingTime(S) : null, today = U.dayStr(new Date(AIU.app ? AIU.app.trueNow() : Date.now()));
    if (rt && (S.settings.reading || day <= today)) out.push({ src: 'iching', key: 'iching', title: 'I Ching cast + Hilltop View', time: rt, done: !!(S.reviews || {})[day], kind: 'iching' });
    P.items(S).forEach(function (p) {
      if (p.kind === 'asset' || p.kind === 'debt') return;
      if (p.kind === 'income' || p.kind === 'expense') { if (p.date === day) out.push({ src: 'plan', key: p.key, p: p, title: p.title, kind: p.kind, amount: p.amount, time: p.time }); return; }
      if (P.occursOn(p, day)) out.push({ src: 'plan', key: p.key, p: p, title: p.title, kind: p.kind, amount: p.amount, time: p.time, done: P.isPaid(S, p, day) });
    });
    return out.sort(function (a, b) { return (a.time || '99') < (b.time || '99') ? -1 : 1; });
  };
  // The next N days, only days that have something
  P.agenda = function (S, from, n) {
    var out = [];
    for (var i = 0; i < n; i++) { var d = U.addDays(from, i), it = P.dayItems(S, d); if (it.length) out.push({ day: d, items: it }); }
    return out;
  };
  // Bills that are due soon and not paid (and ones from earlier this month you haven't marked paid)
  P.billsDue = function (S, today, ahead, ent) {
    var out = [];
    P.items(S, 'bill', ent).forEach(function (p) {
      for (var i = -10; i <= (ahead || 3); i++) {
        var d = U.addDays(today, i);
        if (P.occursOn(p, d) && !P.isPaid(S, p, d)) { out.push({ p: p, day: d, late: d < today }); break; }
      }
    });
    return out.sort(function (a, b) { return a.day < b.day ? -1 : 1; });
  };
  // Money for one month: what came in, what went out (logged), and bills due that month.
  P.month = function (S, month, ent) {
    var inc = 0, exp = 0, bills = 0, paid = 0, cats = {}, rows = [];
    P.items(S, null, ent).forEach(function (p) {
      if ((p.kind === 'income' || p.kind === 'expense') && p.date.slice(0, 7) === month) {
        if (p.kind === 'income') inc += p.amount; else { exp += p.amount; cats[p.cat || 'Other'] = (cats[p.cat || 'Other'] || 0) + p.amount; }
        rows.push(p);
      }
      if (p.kind === 'bill') {
        var last = lastDayOf(month);
        for (var dd = 1; dd <= last; dd++) { var day = month + '-' + U.p2(dd); if (P.occursOn(p, day)) { bills += p.amount; if (P.isPaid(S, p, day)) paid += p.amount; } }
      }
    });
    // paid bills count as money out (no need to log them twice)
    return { income: inc, expense: exp, bills: bills, billsPaid: paid, out: exp + paid, net: inc - exp - paid, cats: cats, rows: rows.sort(function (a, b) { return a.date < b.date ? -1 : 1; }) };
  };
  // The last n months, oldest first: [{month, income, out, net}]
  P.cashflow = function (S, lastMonth, n, ent) {
    var out = [], d = U.dayToDate(lastMonth + '-01');
    for (var i = n - 1; i >= 0; i--) { var x = new Date(d.getFullYear(), d.getMonth() - i, 1), mo = x.getFullYear() + '-' + U.p2(x.getMonth() + 1), m = P.month(S, mo, ent); out.push({ month: mo, income: m.income, out: m.out, net: m.net }); }
    return out;
  };
  // What you own minus what you owe (each item's latest value)
  P.worth = function (S, ent) {
    var as = P.items(S, 'asset', ent), ds = P.items(S, 'debt', ent), A = 0, D = 0;
    as.forEach(function (x) { A += x.amount; }); ds.forEach(function (x) { D += x.amount; });
    return { assets: as, debts: ds, totalAssets: A, totalDebts: D, net: A - D };
  };
  P.money = function (n) { n = +n || 0; var neg = n < 0; n = Math.abs(n); var s = n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); return (neg ? '-$' : '$') + s; };

  /* ---------- business folders ---------- */
  // Templates from KODNA's own business planner (biz-net-planner). Every section is yours to edit, add or remove.
  P.TEMPLATES = {
    plan: { title: 'Business plan', sections: ['Mission statement', 'Goals and objectives', 'Business philosophy', 'Promise', 'Core target objectives', 'Benefits', 'Why believe', 'Key focuses',
      'Assets (land, buildings, inventory, furniture, equipment, vehicles)', 'Commitment', 'Market identity', 'Risk analysis', 'Strengths', 'Weaknesses', 'Opportunities', 'Threats', 'Exit strategy',
      'Legal format', 'Business model', 'Partner alliances', 'Procedures', 'Supporting resources', 'Valued offering', 'Client relations', 'Platform channels', 'Market segments',
      'Expense structure', 'Revenue streams', 'Products and services (title, price, overview, specifications)', 'Marketing plan strategy'] },
    proposal: { title: 'Client proposal', sections: ['Client', 'The problem', 'What we will do', 'Deliverables', 'Timeline', 'Price and payment terms', 'Next steps'] },
    seo: { title: 'SEO plan', sections: ['Website', 'Goals', 'Keywords', 'Pages to improve', 'Content ideas', 'Links and listings', 'Check-in dates'] },
    product: { title: 'Product sheet', sections: ['Product name', 'Price', 'Overview', 'Specifications', 'Materials and suppliers', 'Cost to make', 'Where it sells'] },
    notes: { title: 'Notes', sections: ['Notes'] }
  };
  P.folders = function (S) {
    var f = {}; P.docs(S).forEach(function (d) { if (d.folder === P.ME) return; f[d.folder] = (f[d.folder] || 0) + (d.kind === 'profile' || d.kind === 'person' ? 0 : 1); });
    return Object.keys(f).sort().map(function (k) { return { name: k, n: f[k] }; });
  };
  P.docs = function (S, folder) {
    var PD = S.pdocs || {};
    return Object.keys(PD).map(function (k) { return PD[k]; }).filter(function (d) { return !d.removed && (!folder || d.folder === folder); }).sort(function (a, b) { return a.first - b.first; });
  };
  P.sections = function (S, doc) {
    var PS = S.psecs || {};
    return (doc.order || []).map(function (sid) { var s = PS[doc.key + '|' + sid] || { h: '', text: '' }; return { sid: sid, h: s.h, text: s.text, t: s.t || 0 }; });
  };
  // Events that create a new document from a template
  P.newDoc = function (folder, tpl, title) {
    var T = P.TEMPLATES[tpl] || P.TEMPLATES.notes, key = 'doc-' + U.id().replace(/[^A-Za-z0-9]/g, '').slice(0, 12), order = [], ev = [];
    T.sections.forEach(function (x, i) { var sid = 's' + (i + 1), hd = Array.isArray(x) ? x[0] : x; order.push(sid); ev.push({ type: 'psec', data: { doc: key, sid: sid, h: hd, text: '' } }); });
    ev.unshift({ type: 'pdoc', data: { key: key, folder: folder, title: title || T.title, kind: tpl, order: order } });
    return { key: key, events: ev };
  };
})();
