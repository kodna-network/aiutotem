// Replaced in 2.1.12 by the date / weekday picker (whenPicker)
  function whenSheet(q) {
    var a = app(), k = K(), w = T.tile(q).when || {}, d = today(), s;
    var kind = k.sel({ once: 'One time', repeat: 'Repeats', window: 'Part of every year (a season)', any: 'Any time' }, w.t || 'once', function () { show(); });
    var date = k.inp({ type: 'date', value: w.date || d });
    var every = k.sel(T.EVERY, w.every || 'week', function () { show(); });
    var y = d.slice(0, 4), from = k.inp({ type: 'date', value: w.from ? y + '-' + w.from : d }), to = k.inp({ type: 'date', value: w.to ? y + '-' + w.to : U.addDays(d, 30) });
    // times: one or more (more than one = it happens several times a day, like brushing teeth)
    var tbox = h('div', { cls: 'timelist' });
    function timeRow(v) {
      var inp0 = k.inp({ type: 'time', value: v || '', 'aria-label': 'Time' }), row = h('div', { cls: 'row' }, inp0, k.btn('Remove', function () { row.remove(); }, 'mini ghost'));
      tbox.appendChild(row); return inp0;
    }
    var start = T.times(q); (start.length ? start : ['']).forEach(function (t0) { timeRow(t0); });
    var addT = k.btn('+ Another time', function () { timeRow('').focus(); }, 'mini');
    var fDate = k.field('Date (repeats start here)', date), fTime = h('div', { cls: 'field' }, h('span', { cls: 'flabel', text: 'Time (optional, makes a reminder)' }), tbox, addT,
      h('span', { cls: 'hint', text: 'More than one time for "Every day" = it happens several times a day (morning and night). Reminders ring for one-time, daily and weekly tiles.' }));
    var fEvery = k.field('How often', every), fFrom = k.field('From', from), fTo = k.field('To', to);
    function show() { var t = kind.value; fDate.hidden = !(t === 'once' || t === 'repeat'); fTime.hidden = fDate.hidden; fEvery.hidden = t !== 'repeat'; fFrom.hidden = t !== 'window'; fTo.hidden = t !== 'window'; addT.hidden = !(t === 'repeat' && every.value === 'day'); }
    s = k.sheet('When: ' + q.title, [k.field('Kind', kind), fDate, fEvery, fTime, fFrom, fTo,
      h('div', { cls: 'row spread' }, h('span'), k.btn('Save', function () {
        var t = kind.value, nw = { t: t }, tv = Array.prototype.map.call(tbox.querySelectorAll('input'), function (x) { return x.value; }).filter(Boolean).sort().filter(function (x, i, arr) { return arr.indexOf(x) === i; });
        if (t === 'once' || t === 'repeat') { nw.date = date.value || d; if (tv.length) nw.time = tv[0]; }
        if (t === 'repeat') { nw.every = every.value; if (every.value === 'day' && tv.length > 1) nw.times = tv; }
        if (t === 'window') { nw.from = (from.value || d).slice(5); nw.to = (to.value || d).slice(5); }
        s.remove(); PN.setWhen(q, nw);
      }, 'primary'))]);
    show();
  }
