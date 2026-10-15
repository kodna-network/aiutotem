  C.replay = function (events) {
    var S = C.newState();
    events.slice().sort(function (a, b) { return (a.ls || 0) - (b.ls || 0) || cmpT(a, b); }).forEach(function (e) { C.apply(S, e); });
    events.filter(function (e) { return e.seq; }).sort(function (a, b) { return a.seq - b.seq; }).forEach(function (e) { C.confirm(S, e); });
    return S;
  };
