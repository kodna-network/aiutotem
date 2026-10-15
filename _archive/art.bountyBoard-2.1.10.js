// Replaced in 2.1.11 by the permanent yard board / room corkboard (art.js yardBoard, roomBoard)
  // The bounty board: a little wooden board on a post with paper notes (your to-dos) pinned to it
  function bountyBoard(c, x, fy, f) {
    var bx = x + 13, top = fy - 30;
    R(c, bx + 9, top + 18, 2, 12, P.bark); // post
    R(c, bx, top, 20, 19, P.bark); R(c, bx + 1, top + 1, 18, 17, P.wood);
    R(c, bx - 1, top - 2, 22, 2, P.bark); // little roof
    var notes = [[2, 3, P.sand], [8, 2, P.white], [14, 4, P.yellow], [3, 10, P.white], [10, 10, P.sand]];
    notes.forEach(function (n, i) { R(c, bx + n[0], top + n[1], 5, 5, n[2]); px(c, bx + n[0] + 2, top + n[1], P.red); R(c, bx + n[0] + 1, top + n[1] + 2, 3, 1, P.slate); });
    if (f % 8 < 4) { R(c, bx + 18, top - 7, 2, 4, P.red); px(c, bx + 18, top - 2, P.red); } // "!"
  }
