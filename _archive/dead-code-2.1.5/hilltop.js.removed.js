  function ago(day, today) { var n = Math.round((U.dayToDate(today) - U.dayToDate(day)) / 86400000); return n <= 0 ? 'today' : n === 1 ? 'yesterday' : n + ' days ago'; }
