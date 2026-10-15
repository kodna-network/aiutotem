/* world.js stairs() as of 2.4.0-2.6.0 (one wooden look for every house), replaced in 2.7.0 */
  function stairs(c, sc) { // from the living room floor up to the bedroom floor, going up to the left
    var x0 = 140, y0 = 137, x1 = 100, y1 = 79, n = 8, tread = P.sand, riser = P.wood;
    for (var i = 0; i < n; i++) { var sx = Math.round(x0 - (x0 - x1) * (i + 1) / n), sy = Math.round(y0 - (y0 - y1) * (i + 1) / n), sw = Math.round((x0 - x1) / n); R(c, sx, sy, x0 - sx, Math.round((y0 - y1) / n), riser); R(c, sx, sy, sw + 1, 2, tread); R(c, sx, sy, 1, Math.round((y0 - y1) / n), P.ink); }
    for (var i2 = 0; i2 < n; i2++) { var sx2 = Math.round(x0 - (x0 - x1) * (i2 + 1) / n), sy2 = Math.round(y0 - (y0 - y1) * (i2 + 1) / n), hh2 = Math.round((y0 - y1) / n); for (var vx = sx2 + 4; vx < x0; vx += 6) R(c, vx, sy2 + 2, 1, hh2 - 2, P.bark); R(c, sx2 + 1, sy2 + hh2 - 1, x0 - sx2 - 1, 1, P.bark); } // 2.4.0: boards on the side of the stairs (no blank brown)
    R(c, x0, y1 - 2, 3, y0 - y1 + 2, P.ink); R(c, x0 + 1, y1 - 2, 1, y0 - y1 + 2, P.wood); // a clean trim line where the stairs meet the wall
    GM_line(c, x1, y1 - 12, x0, y0 - 12, P.ink); GM_line(c, x1, y1 - 11, x0, y0 - 11, P.wood); for (var p = 0; p <= 4; p++) { var px0 = Math.round(x1 + (x0 - x1) * p / 4), py0 = Math.round(y1 + (y0 - y1) * p / 4); R(c, px0, py0 - 11, 1, 11, P.bark); } // the banister
  }
