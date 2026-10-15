// Removed in 2.1.6: the Go / Brake bar, brake levels, streak, tile offers and suggestions (Vitals replaced them).
  // Every day starts in the middle (50). Brake things push right, Go things push left, and (1.1.0) the day itself wears
  // on you: from 8 am the bar slides toward Go about 3 points an hour, until 10 pm. Calm things keep it out of the red.
  G.DRIFT = 1.5; G.RED = 30; // 2.0.0: the drift is half as fast (it was too hard to keep up)
  G.driftAt = function (t) { var w = U.wall(new Date(t)), hr = w.getHours() + w.getMinutes() / 60; return Math.round(Math.max(0, Math.min(22, hr) - 8) * G.DRIFT); };
  G.bar = function (S, day) {
    var v = 50, now = AIU.app ? AIU.app.trueNow() : Date.now(), today = U.dayStr(new Date(now));
    G.day(S, day).forEach(function (g) { v += g.pts; });
    v -= day === today ? G.driftAt(now) : day < today ? Math.round(14 * G.DRIFT) : 0;
    return Math.max(0, Math.min(100, Math.round(v)));
  };
  G.stressed = function (S, day) { return G.bar(S, day) < G.RED; };
  G.state = function (v) { return v >= 70 ? 'Calm' : v >= 55 ? 'Balanced, leaning calm' : v > 45 ? 'Balanced' : v >= G.RED ? 'Revved up' : 'Stressed (growth stunted)'; };

  // Level: every Brake point you've ever earned (plus finished daily goals) adds up. It never goes down.
  G.xp = function (S) {
    var A = S.gabaAgg || { calmPts: 0, goalN: 0 }, x = A.calmPts + A.goalN * 5;
    entries(S).forEach(function (g) { if (g.kind === 'calm') x += Math.max(0, g.pts) + (g.goal ? 5 : 0); });
    return x;
  };
  G.level = function (S) {
    var x = G.xp(S), i = 0;
    while (i + 1 < G.LEVELS.length && x >= G.LEVELS[i + 1][0]) i++;
    var next = G.LEVELS[i + 1];
    return { n: i + 1, name: G.LEVELS[i][1], xp: x, floor: G.LEVELS[i][0], next: next ? next[0] : null, nextName: next ? next[1] : null };
  };
  // Days in a row (ending today or yesterday) with at least one Brake thing.
  G.streak = function (S, today) {
    var days = {}; entries(S).forEach(function (g) { if (g.kind === 'calm') days[g.d] = 1; });
    var d = days[today] ? today : U.addDays(today, -1), n = 0;
    while (days[d]) { n++; d = U.addDays(d, -1); }
    return n;
  };

  /* ---------- Aiu's suggestions: a GABA thing offered as a small quest ("Want to draw a picture today?") ----------
     [label]: [the offer, the follow-up question (or ''), ideas to tap, the steps ({x} = what you answered)] */
  var OFFERS = {
    'Slow breathing (4 in / 4 out)': ['Want to take one minute for slow breathing today?', '', [], ['Sit somewhere comfy', 'Breathe in for 4, out for 4, for one minute']],
    'Stretching / yoga': ['Want to do a few stretches today?', 'What kind?', ['Morning stretch', 'Yoga video', 'Stretch before bed'], ['Find a spot with some room', 'Stretch: {x}']],
    'Walk outside': ['Want to take a walk outside today?', 'Where to?', ['Around the block', 'Down the road', 'The park', 'Around the yard'], ['Put on your shoes', 'Walk: {x}']],
    'Nature time (park / woods)': ['Want to spend a little time in nature today?', 'Where?', ['The woods', 'The park', 'The backyard', 'By the water'], ['Head out to {x}', 'Spend 15 minutes there']],
    'Fishing / sitting by water': ['Want to go sit by the water (or fish) today?', 'Where?', ['The lake', 'The river', 'The pond', 'The beach'], ['Get your gear', 'Spend some time at {x}']],
    'Time with pets': ['Want to spend some calm time with the animals today?', 'With who?', ['The dog', 'The cat', 'Aiu'], ['Spend 10 minutes with {x}']],
    'Safe hugs / social support': ['Want to call or see someone you trust today?', 'Who?', ['Mom', 'Dad', 'A friend', 'My sister', 'My brother'], ['Reach out to {x}', 'Talk for a bit']],
    'Reading': ['Want to read for a bit today?', 'What will you read?', ['A book', 'A chapter', 'A comic', 'An article'], ['Find {x}', 'Read for 15 minutes']],
    'Journaling': ['Want to write a journal entry today?', '', [], ['Open Journal and tap + New entry', 'Write a few sentences']],
    'Drawing / painting': ['Want to draw or paint a picture today?', 'What will you draw?', ['Something outside', 'An animal', 'A doodle', 'A design idea'], ['Get your paper or tablet', 'Draw: {x}', 'Show someone (or just smile at it)']],
    'Puzzles / LEGO': ['Want to do a puzzle or build something today?', 'What?', ['A puzzle', 'LEGO', 'A model kit'], ['Set it up', 'Work on {x} for a while']],
    'Calm music': ['Want to put on some calm music today?', 'What kind?', ['Lo-fi', 'Classical', 'Acoustic', 'Nature sounds'], ['Play {x} for a song or three']],
    'Playing an instrument': ['Want to play some music today?', 'What instrument?', ['Guitar', 'Piano', 'Drums', 'Ukulele'], ['Grab the {x}', 'Play for 15 minutes']],
    'Low lights at night': ['Want to dim the lights tonight before bed?', '', [], ['Turn the lights down an hour before bed']],
    'Warm bath / shower': ['Want a warm bath or shower today?', '', [], ['Take a warm bath or shower']],
    'Cold splash on face (quick reset)': ['Want to try a quick cold-water splash to reset?', '', [], ['Splash some cold water on your face']],
    'Light cleaning / simple chores': ['Want to do one small tidy-up today?', 'What spot?', ['The kitchen', 'My desk', 'The bedroom', 'The shed'], ['Tidy {x} for 10 minutes']],
    'Sleep routine (same time)': ['Want to go to bed on time tonight?', 'What time?', ['10 pm', '10:30 pm', '11 pm'], ['Start winding down', 'Lights out at {x}']],
    'Short nap (20 min)': ['Want a short 20-minute nap today?', '', [], ['Set a 20-minute timer', 'Rest']],
    'Meditation / mindfulness': ['Want to try two quiet minutes of mindfulness today?', '', [], ['Sit still for two minutes and notice your breathing']],
    'Morning sunlight': ['Want to get a few minutes of morning sun?', '', [], ['Step outside in the morning light for 5 minutes']],
    'Lavender smell': ['Want to try the smell of lavender to relax?', '', [], ['Find some lavender (oil, soap, a plant)', 'Take a few slow breaths with it']],
    'Warm drink at night': ['Want a warm, caffeine-free drink tonight?', 'What drink?', ['Chamomile tea', 'Warm milk', 'Peppermint tea', 'Hot cocoa'], ['Make {x}', 'Sip it slowly']],
    'Cozy blanket / comfort items': ['Want some cozy blanket time today?', '', [], ['Get comfy with a blanket for a bit']],
    'Walk the dog': ['Want to take the dog for a walk today?', 'Where to?', ['Around the block', 'Down the road', 'The park'], ['Grab the leash', 'Walk: {x}']],
    'Brush teeth': ['Brush your teeth today (morning and night)?', '', [], ['Morning brush', 'Night brush']],
    'Drink a glass of water': ['Drink a few glasses of water today?', '', [], ['Glass of water in the morning', 'Glass of water at lunch', 'Glass of water in the evening']],
    'Eat a real meal': ['Eat a real, sit-down meal today?', 'Which meal?', ['Breakfast', 'Lunch', 'Dinner'], ['Make or get {x}', 'Sit down and eat it']]
  };
  G.offer = function (q) {
    var o = OFFERS[q.item];
    if (o) return { ask: o[0], follow: o[1], ideas: o[2], steps: o[3], tag: 'gaba:calm:' + q.item, title: q.item.replace(/\s*\(.*\)$/, '') };
    var nm = lc1(q.item.replace(/\s*\(.*\)$/, '').replace(/ \/ /g, ' or '));
    if (q.kind === 'stress') return { ask: 'Want to try a day without ' + nm + '?', follow: '', ideas: [], steps: ['Make it through the morning', 'Make it through the afternoon', 'Make it to bedtime'], tag: 'gaba:avoid:' + q.item, title: 'A day without ' + nm, avoid: true };
    return { ask: 'Want to have some ' + nm + ' today? It\'s a calming food.', follow: '', ideas: [], steps: ['Have some ' + nm], tag: 'gaba:food:' + q.item, title: 'Eat: ' + nm };
  };
  G.avoid = function (S) { return G.STRESS_ACTS.concat(G.STRESS_FOODS).map(function (x) { return x[0]; }).filter(function (x) { return G.pref(S, x) === 'yes'; }); };

  // A short suggestion when the bar leans Go: one of today's goals not done yet, or a quick classic.
  G.suggest = function (S, day) { // (skips brakes you said aren't for you, through goals)
    var open = G.goals(S, day).filter(function (g) { return !g.done; });
    var tips = { 'Slow breathing (4 in / 4 out)': 'a minute of slow breathing, 4 in and 4 out', 'Walk outside': 'a short walk outside', 'Stretching / yoga': 'a few stretches',
      'Morning sunlight': 'a few minutes of sunlight', 'Meditation / mindfulness': 'two quiet minutes of mindfulness', 'Time with pets': 'some time with the animals',
      'Warm drink at night': 'a warm, caffeine-free drink', 'Calm music': 'some calm music', 'Cold splash on face (quick reset)': 'a cold splash on your face for a quick reset' };
    var pick = open[0] ? open[0].label : 'Slow breathing (4 in / 4 out)';
    return tips[pick] || lc(pick);
  };

  G.LEVELS = [[0, 'Spark'], [50, 'Ember'], [150, 'Settled'], [300, 'Steady'], [500, 'Grounded'], [800, 'Anchored'], [1200, 'Calm Keeper'], [1700, 'Still Water'], [2300, 'Mountain'], [3000, 'Brake Master']];
