// Removed in 2.1.8: the door button (asked Aiu to go inside / outside for 30 minutes). Aiu follows his own schedule again.
// app.requestPlace / app.placeReq are kept (unused) in app.js.
    // 2.1.5: the door: ask Aiu to go inside or out (the zoom button is gone: the close-up camera frames the yard by itself; Settings > World view)
    els.door = h('button', { type: 'button', cls: 'wbtn door', 'aria-label': 'Go inside', title: 'Go inside', onclick: function () { var v0 = a.view && a.view.sc; a.requestPlace(!(v0 && v0.indoor)); } });
    els.door.innerHTML = '<svg viewBox="0 0 8 8" width="18" height="18" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M1 0h6v8H1zM2 1v6h4V1zM4 4h1v1H4z"/></svg>';
