// Removed in 2.1.6: the stressed storm cloud (distressed Aiu now just looks tired).
    if (grumpy) { // a little storm cloud over his head
      var cx = dx + cr.crownX, cy = dy + cr.head - 9 + (f % 8 < 4 ? 0 : -1);
      disc(ctx, cx - 4, cy, 3, P.slate); disc(ctx, cx + 1, cy - 1, 4, P.slate); disc(ctx, cx + 6, cy, 3, P.slate); R(ctx, cx - 6, cy + 1, 15, 3, P.slate);
      if (f % 10 < 3) { px(ctx, cx + 1, cy + 4, P.yellow); px(ctx, cx, cy + 5, P.yellow); px(ctx, cx + 1, cy + 6, P.yellow); }
      else { px(ctx, cx - 3, cy + 5 + (f % 3), P.sky); px(ctx, cx + 4, cy + 6 + ((f + 1) % 3), P.sky); }
    }
