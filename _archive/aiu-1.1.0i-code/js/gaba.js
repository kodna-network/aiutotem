/* AIU TOTEM - GABA: the Go / Brake bar (from KODNA's GABA Explorer).
   Glutamate helps you GO, GABA helps you SLOW DOWN. You do something calming in real life, tell Aiu (or tap it in
   Journal > Me > GABA), and the bar moves toward Brake. Things that rev you up move it toward Go. Mixed things depend on you,
   so Aiu asks. It's a nudge toward balance, not a score to feel bad about, and not medical advice. */
(function () {
  'use strict';
  var U = AIU.util, C = AIU.core;
  var G = AIU.gaba = {};

  // [label, points, keywords]. Keywords are matched against what you said (lower case).
  G.CALM_ACTS = [
    ['Slow breathing (4 in / 4 out)', 10, /\b(slow |deep |box )?breath(ing|ed|s)?\b|\bbreathwork\b/],
    ['Stretching / yoga', 10, /\bstretch(ed|es|ing)?\b|\byoga\b/],
    ['Walk outside', 10, /\bwalk(ed|ing)?\b|\bhik(e|ed|ing)\b|\bstroll(ed)?\b/],
    ['Nature time (park / woods)', 10, /\b(nature|woods|forest|the park|outdoors|went outside|sat outside)\b/],
    ['Fishing / sitting by water', 10, /\bfishing\b|\bwent fish|\b(by|at) the (lake|creek|river|water|pond)\b/],
    ['Time with pets', 8, /\b(petted|pet the|played with (the |my )?(dog|cat|puppy|kitten|pup)|fed the (chickens|dog|cats?|animals|pets|hens)|cuddled (the |my )?(dog|cat)|with (the |my )?(dog|cats?|chickens|pets?))\b/],
    ['Safe hugs / social support', 8, /\bhug(ged|s)?\b|\b(talked|talk) (to|with) (a |my )?(friend|mom|dad|brother|sister|family)\b|\bcalled (my )?(mom|dad|friend|brother|sister|grandma|grandpa)\b/],
    ['Reading', 8, /\bread (a |my |the )?(book|novel|chapter)\b|\breading (a |my |the )?(book|novel)?\b/],
    ['Journaling', 8, /\bjournal(ed|ing)?\b|\bwrote in (my )?(journal|diary)\b/],
    ['Drawing / painting', 8, /\b(drew|drawing|draw|painted|painting|sketch(ed|ing)?)\b/],
    ['Puzzles / LEGO', 6, /\bpuzzles?\b|\blego\b/],
    ['Calm music', 6, /\b(calm|relaxing|chill|soft|quiet) music\b|\blo-?fi\b/],
    ['Playing an instrument', 8, /\b(played|playing|practiced|practicing) (the |my )?(guitar|piano|drums|bass|violin|ukulele|instrument|keyboard|harmonica|flute)\b/],
    ['Low lights at night', 5, /\b(low|dim(med)?) (the )?lights?\b|\bcandles?\b/],
    ['Warm bath / shower', 6, /\b(warm |hot )?(bath|shower)\b/],
    ['Cold splash on face (quick reset)', 5, /\bcold (water|splash)\b|\bsplash(ed)? (my )?face\b/],
    ['Light cleaning / simple chores', 6, /\b(cleaned|cleaning|tidied|tidying|did the dishes|washed the dishes|laundry|chores|swept|vacuumed)\b/],
    ['Sleep routine (same time)', 8, /\b(went to bed (on time|early)|bedtime routine|slept (well|great|good)|good night'?s sleep)\b/],
    ['Short nap (20 min)', 6, /\bnap(ped|ping)?\b/],
    ['Meditation / mindfulness', 10, /\bmeditat\w*\b|\bmindful(ness)?\b/],
    ['Morning sunlight', 6, /\b(morning (sun|light)|sunlight|sunshine|sunrise)\b/],
    ['Lavender smell', 4, /\blavender\b/],
    ['Warm drink at night', 5, /\b(warm|hot) (milk|drink|cocoa|chocolate)\b|\bherbal tea\b|\bchamomile\b|\bpeppermint tea\b/],
    ['Cozy blanket / comfort items', 4, /\b(blanket|cozy|cosy|comfy)\b/],
    ['Walk the dog', 10, /\b(walked|walking|took) the dog( out| for a walk)?\b|\bdog walk\b/],
    ['Brush teeth', 4, /\bbrush(ed|ing)? (my )?teeth\b/],
    ['Drink a glass of water', 4, /\b(drank|drink|had) (a (big )?glass of |some )?water\b/],
    ['Eat a real meal', 5, /\b(ate|had|cooked) (a (real|good|healthy|proper) )?(breakfast|lunch|dinner|meal)\b/]
  ];
  G.CALM_FOODS = [
    ['Yogurt / kefir / fermented foods', 4, /\b(yogh?urt|kefir|kimchi|sauerkraut|fermented)\b/], ['Eggs', 3, /\beggs?\b/],
    ['Nuts', 3, /\b(nuts|almonds|walnuts|pistachios|peanuts|cashews)\b/], ['Seeds', 3, /\b(pumpkin|sunflower|chia|flax) seeds?\b/],
    ['Leafy greens', 4, /\b(spinach|kale|leafy greens|salad|greens)\b/], ['Orange veggies', 3, /\b(carrots?|sweet potato(es)?)\b/],
    ['Bananas', 3, /\bbananas?\b/], ['Berries', 3, /\b(berries|blueberr\w*|strawberr\w*|raspberr\w*)\b/], ['Tart cherries', 3, /\btart cherr\w*\b/],
    ['Avocado', 3, /\bavocados?\b/], ['Fish', 4, /\b(salmon|sardines|tuna|trout)\b/], ['Beans / lentils', 3, /\b(beans|lentils|chickpeas)\b/],
    ['Oats / warm carbs at night', 3, /\b(oats|oatmeal|porridge)\b/], ['Whole grains', 3, /\b(brown rice|quinoa|whole grains?|whole wheat)\b/],
    ['Turkey / chicken (protein)', 3, /\b(turkey|chicken (breast|soup|salad|sandwich|dinner)|grilled chicken|roast chicken)\b/], ['Warm soup / broth', 4, /\b(soup|broth|stew)\b/],
    ['Herbal tea', 4, /\b(herbal|chamomile|peppermint) tea\b/], ['Honey (small amount)', 2, /\bhoney\b/], ['Apples', 3, /\bapples?\b/], ['Mango', 3, /\bmangos?|mangoes\b/],
    ['Seaweed / miso soup', 3, /\b(seaweed|miso)\b/], ['Cheese (small amount)', 2, /\bcheese\b/]
  ];
  G.STRESS_FOODS = [
    ['Energy drinks / too much soda', -8, /\b(energy drinks?|monster|red bull|rockstar|too much soda|sodas)\b/], ['Sugar spikes (candy, sweets)', -5, /\b(candy|sweets|sugar rush|donuts?)\b/],
    ['Lots of desserts late', -5, /\b(desserts?|cake|ice cream) (late|at night|before bed)\b/], ['Fast food all the time', -5, /\b(fast food|mcdonald'?s|burger king|taco bell|wendy'?s)\b/],
    ['Heavy greasy meals late', -5, /\b(greasy|fried food|deep fried)\b/], ['Super salty snacks', -4, /\b(chips|salty snacks?)\b/],
    ['Spicy food late at night', -3, /\bspicy (food )?(late|at night|before bed)\b/], ['Chocolate late at night', -3, /\bchocolate (late|at night|before bed)\b/],
    ['Tobacco / vaping / nicotine', -8, /\b(smoked|smoking|cigarettes?|vape[ds]?|vaping|nicotine|dip|snuff|zyns?)\b/],
    ['Not eating enough', -6, /\b(skipped (a |my )?(meal|breakfast|lunch|dinner)|forgot to eat|didn'?t eat|haven'?t eaten)\b/],
    ['Not drinking enough water', -4, /\b(dehydrated|didn'?t drink (any |enough )?water|forgot to drink water)\b/],
    ['Too many pre-workout drinks', -6, /\bpre-?workout\b/], ['Huge meal right before bed', -5, /\b(huge|big|large) meal (right )?before bed\b/]
  ];
  G.STRESS_ACTS = [
    ['Too much screen time late', -6, /\b(screen time|on my phone) (late|all night|till|until)\b|\blate night (phone|screens?)\b/], ['Doom scrolling', -8, /\bdoom ?scroll\w*\b|\bscroll(ed|ing) (for hours|all night|forever)\b/],
    ['Intense games before bed', -6, /\b(games?|gaming) (before bed|all night|until \d|till \d)\b/], ['Loud music for too long', -4, /\bloud music\b/],
    ['Arguments / yelling', -8, /\b(argu(ed|ment|ing)|yell(ed|ing)|fight|fought|screamed)\b/], ['Scary content', -5, /\b(scary|horror) (movie|show|video|content)\b/],
    ['Staying up very late', -6, /\b(stayed up (late|all night)|up all night|went to bed (late|at [1-4]))\b/], ['Driving / traffic', -5, /\btraffic\b/],
    ['Road rage / rushing', -6, /\b(road rage|rush(ed|ing)|running late|ran late|late again)\b/], ['Job pressure / deadlines', -6, /\b(deadlines?|work stress|stressed at work|overtime|boss yelled)\b/],
    ['Overthinking / "what if" spirals', -6, /\b(overthink\w*|what if|spiral\w*|ruminat\w*)\b/], ['Negative self-talk', -6, /\b(negative self-?talk|hate myself|i'?m (so )?stupid|i'?m worthless)\b/],
    ['Social drama', -6, /\bdrama\b/], ['Crowds / too much noise', -4, /\b(crowds?|crowded|too (much )?noisy|so loud)\b/],
    ['Extreme heat or cold', -4, /\b(too hot|heat wave|freezing cold|so cold)\b/], ['Storms / scary weather', -3, /\b(storms?|tornado|hurricane)\b/],
    ['Poor sleep', -8, /\b(poor sleep|didn'?t sleep|couldn'?t sleep|slept (bad|badly|poorly|terribly)|insomnia|no sleep)\b/],
    ['Too intense workout with no recovery', -4, /\b(overtrained|over-?did it at the gym|too hard at the gym)\b/], ['Constant notifications', -3, /\bnotifications?\b/]
  ];
  // Mixed: calming OR stressful depending on timing, amount and mood. Aiu asks how it landed.
  G.MIXED = [
    ['Movies / TV', /\b(watched (a )?(movie|film|tv|show|netflix|youtube)|binge(d)?)\b/], ['Sports', /\b(played|watched) (basketball|football|soccer|baseball|hockey|sports?)\b/],
    ['Exercise', /\b(work(ed)? out|workout|gym|ran|running|lifted|exercise[ds]?|cardio)\b/], ['Driving', /\b(drove|driving|road trip)\b/], ['Work', /\b(worked|working) (late|all day|overtime|a lot)\b/],
    ['Music', /\blistened to music\b/], ['Caffeine', /\b(coffee|espresso|latte|caffeine|black tea|matcha|boba)\b/], ['Weed / THC', /\b(weed|thc|edible|smoked a bowl)\b/],
    ['Sugar', /\b(sugar|soda|a treat|cookies?)\b/], ['Alcohol', /\b(beers?|wine|alcohol|drinks|a drink|whiskey|shots?|cocktails?|drunk)\b/], ['Social media', /\b(social media|instagram|tiktok|facebook|twitter|reddit)\b/],
    ['Travel', /\b(travel(l?ed|l?ing)?|flight|airport)\b/], ['Gaming', /\b(played (video )?games|gaming|played (fortnite|minecraft|xbox|playstation|switch))\b/],
    ['Big meals', /\b(big|huge) (meal|dinner|lunch)\b|\bate too much\b/], ['Shopping', /\b(went shopping|shopping trip|bought (a lot|too much))\b/], ['Studying', /\b(studied|studying|cram(med|ming)?)\b/]
  ];
  G.MIXED_QUESTIONS = ['Was it too late in the day for it?', 'Was the amount too much?', 'Were you already stressed when you did it?', 'Did you need a break first?', 'Did you need water or food more?', 'Did you need sleep more than stimulation?'];
  G.LEVELS = [[0, 'Spark'], [50, 'Ember'], [150, 'Settled'], [300, 'Steady'], [500, 'Grounded'], [800, 'Anchored'], [1200, 'Calm Keeper'], [1700, 'Still Water'], [2300, 'Mountain'], [3000, 'Brake Master']];
  G.DISCLAIMER = 'Educational only, not medical advice. Glutamate helps you GO, GABA helps you SLOW DOWN: balance the gas with the brake.';

  function lc(s) { return String(s || '').toLowerCase(); }
  function entries(S) { var GB = S.gaba || {}; return Object.keys(GB).map(function (k) { return GB[k]; }).filter(function (g) { return !g.removed; }).sort(function (a, b) { return a.t - b.t; }); }
  G.entries = entries;
  G.day = function (S, day) { return entries(S).filter(function (g) { return g.d === day; }); };

  // Every day starts in the middle (50). Brake things push right, Go things push left, and (1.1.0) the day itself wears
  // on you: from 8 am the bar slides toward Go about 3 points an hour, until 10 pm. Calm things keep it out of the red.
  G.DRIFT = 1.5; G.RED = 30; // 1.1.0i: the drift is half as fast (it was too hard to keep up)
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
  // Three small Brake goals a day. Picked from things you've done before when there are some, so they fit your life.
  // 1.1.0: what you told Aiu in 21 Questions. 'yes' = it calms you (or revs you up, for Go things), 'no' = not for you.
  G.pref = function (S, item) { var p = (S.prefs || {})['gaba:' + item]; return p ? p.v : null; };
  G.goals = function (S, day) {
    var seed = U.hash32(((S.egg && S.egg.id) || 'aiu') + ':gaba:' + day), r = U.rng(seed), done = {}, favs = {};
    entries(S).forEach(function (g) { if (g.kind === 'calm') { favs[g.item] = (favs[g.item] || 0) + 1; if (g.d === day) done[g.item] = 1; } });
    var notMe = function (x) { return G.pref(S, x) === 'no'; };
    var pool = G.CALM_ACTS.map(function (a) { return a[0]; }).filter(function (x) { return !notMe(x); });
    pool.forEach(function (x) { if (G.pref(S, x) === 'yes') favs[x] = (favs[x] || 0) + 2; }); // the ones you said calm you
    var mine = Object.keys(favs).filter(function (k) { return pool.indexOf(k) >= 0; }).sort(function (a, b) { return favs[b] - favs[a]; }).slice(0, 4), out = [];
    if (mine.length) out.push(mine[Math.floor(r() * mine.length)]);
    var basics = ['Slow breathing (4 in / 4 out)', 'Walk outside', 'Stretching / yoga', 'Morning sunlight', 'Meditation / mindfulness', 'Brush teeth', 'Drink a glass of water', 'Eat a real meal', 'Warm bath / shower'].filter(function (x) { return !notMe(x); });
    if (!basics.length) basics = pool.slice(0, 5);
    while (out.length < 2 && basics.length) { var b = basics[Math.floor(r() * basics.length)]; if (out.indexOf(b) < 0) out.push(b); else if (basics.length < 2) break; }
    var guard = 0;
    while (out.length < 3 && guard++ < 50) { var p = pool[Math.floor(r() * pool.length)]; if (out.indexOf(p) < 0) out.push(p); }
    return out.map(function (label) { return { label: label, done: !!done[label] }; });
  };
  /* ---------- 21 Questions: Aiu fills in its puzzle about you ----------
     GABA questions learn which brakes really calm YOU (not everyone likes lavender) and which Go things to avoid. */
  var ASK = { calm: 'Does this calm you down?', stress: 'Does this rev you up or stress you out?', calmfood: 'Do you like this calming food?' };
  G.questions = function () {
    var out = [];
    G.CALM_ACTS.forEach(function (x) { out.push({ id: 'gaba:' + x[0], kind: 'calm', item: x[0], q: ASK.calm }); });
    G.STRESS_ACTS.concat(G.STRESS_FOODS).forEach(function (x) { out.push({ id: 'gaba:' + x[0], kind: 'stress', item: x[0], q: ASK.stress }); });
    G.CALM_FOODS.forEach(function (x) { out.push({ id: 'gaba:' + x[0], kind: 'calmfood', item: x[0], q: ASK.calmfood }); });
    return out;
  };
  /* ---------- Aiu's suggestions: a GABA thing offered as a small quest ("Want to draw a picture today?") ----------
     [label]: [the offer, the follow-up question (or ''), ideas to tap, the steps ({x} = what you answered)] */
  var OFFERS = {
    'Slow breathing (4 in / 4 out)': ['Want to take one minute for slow breathing today?', '', [], ['Sit somewhere comfy', 'Breathe in for 4, out for 4, for one minute']],
    'Stretching / yoga': ['Want to do a few stretches today?', 'What kind?', ['Morning stretch', 'Yoga video', 'Stretch before bed'], ['Find a spot with some room', 'Stretch: {x}']],
    'Walk outside': ['Want to take a walk outside today?', 'Where to?', ['Around the block', 'Down the road', 'The park', 'Around the yard'], ['Put on your shoes', 'Walk: {x}']],
    'Nature time (park / woods)': ['Want to spend a little time in nature today?', 'Where?', ['The woods', 'The park', 'The backyard', 'By the creek'], ['Head out to {x}', 'Spend 15 minutes there']],
    'Fishing / sitting by water': ['Want to go sit by the water (or fish) today?', 'Where?', ['The lake', 'The creek', 'The river', 'The pond'], ['Get your gear', 'Spend some time at {x}']],
    'Time with pets': ['Want to spend some calm time with the animals today?', 'With who?', ['The dog', 'The cats', 'The chickens'], ['Spend 10 minutes with {x}']],
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
  G.find = function (label) {
    var all = G.CALM_ACTS.concat(G.CALM_FOODS).map(function (x) { return { kind: 'calm', item: x[0], pts: x[1] }; })
      .concat(G.STRESS_ACTS.concat(G.STRESS_FOODS).map(function (x) { return { kind: 'stress', item: x[0], pts: x[1] }; }));
    return all.filter(function (x) { return x.item === label; })[0] || null;
  };
  // The event for logging something (marks it as a daily goal when it is one).
  G.logEvent = function (S, day, kind, item, pts, note) {
    var isGoal = kind === 'calm' && G.goals(S, day).some(function (g) { return g.label === item && !g.done; });
    return { type: 'gaba', data: { kind: kind, item: item, pts: pts, goal: isGoal, note: note || undefined } };
  };

  /* ---------- hearing it in conversation ---------- */
  // Only things you say you DID (past tense, "just", "I'm doing"), never plans ("I need to walk the dog").
  var DID = /\b(i|we)\s+(just\s+|finally\s+|already\s+)?(went|did|had|took|drank|ate|played|watched|spent|got|made|tried|finished|read|wrote|walked|ran|stretched|meditated|napped|slept|listened|called|hugged|cleaned|fished|painted|drew|sat|smoked|vaped|stayed|skipped|argued|yelled|worked|binged|scrolled|practiced|cooked|took|lit|dimmed|splashed|did some|have been|was|been)\b|\b(i'?m|i am|we'?re)\s+(doing|having|playing|watching|drinking|eating|reading|walking|stretching|meditating|fishing|painting|drawing|listening|taking|sitting|scrolling)\b|^(just\s+)?(went|did|had|took|drank|ate|played|watched|walked|ran|stretched|meditated|napped|read|cleaned|fished|painted|drew)\b/;
  var NOT = /\b(didn'?t|did not|don'?t|won'?t|never|need to|have to|want to|should|gonna|going to|will|tomorrow|later|plan to|remind me)\b/;
  var FOOD = /\b(ate|eat|eating|had|having|made|cooked|snacked|breakfast|lunch|dinner|meal)\b/;
  // -> {kind, item, pts} | {kind:'mixed', item} | null
  G.detect = function (text) {
    var s = ' ' + lc(text).replace(/[’]/g, "'") + ' ';
    if (/\?\s*$/.test(s.trim())) return null;
    var m = /^\s*(brake|calm|gaba|go|stress)\s*[:\-]\s*(.+)$/.exec(s.trim()); // "brake: walk", "go: energy drink"
    if (m) { var hit = scan(m[2], true); if (hit) return hit; return { kind: /brake|calm|gaba/.test(m[1]) ? 'calm' : 'stress', item: m[2].trim().slice(0, 40), pts: /brake|calm|gaba/.test(m[1]) ? 6 : -5, typed: true }; }
    var negOk = /\b(didn'?t|couldn'?t|forgot to|skipped)\b/.test(s) && /\b(sleep|eat|drink (any |enough )?water|meal|breakfast|lunch|dinner)\b/.test(s); // "didn't sleep" is a Go thing
    if (!DID.test(s) && !negOk) return null;
    if (NOT.test(s) && !negOk) return null;
    return scan(s, false);
  };
  function scan(s, typed) {
    var food = FOOD.test(s) || typed, i;
    for (i = 0; i < G.STRESS_ACTS.length; i++) if (G.STRESS_ACTS[i][2].test(s)) return { kind: 'stress', item: G.STRESS_ACTS[i][0], pts: G.STRESS_ACTS[i][1] };
    for (i = 0; i < G.STRESS_FOODS.length; i++) if (G.STRESS_FOODS[i][2].test(s)) return { kind: 'stress', item: G.STRESS_FOODS[i][0], pts: G.STRESS_FOODS[i][1] };
    for (i = 0; i < G.MIXED.length; i++) if (G.MIXED[i][1].test(s)) return { kind: 'mixed', item: G.MIXED[i][0], pts: 0 };
    for (i = 0; i < G.CALM_ACTS.length; i++) if (G.CALM_ACTS[i][2].test(s)) return { kind: 'calm', item: G.CALM_ACTS[i][0], pts: G.CALM_ACTS[i][1] };
    if (food) for (i = 0; i < G.CALM_FOODS.length; i++) if (G.CALM_FOODS[i][2].test(s)) return { kind: 'calm', item: G.CALM_FOODS[i][0], pts: G.CALM_FOODS[i][1] };
    return null;
  }
  // A short suggestion when the bar leans Go: one of today's goals not done yet, or a quick classic.
  G.suggest = function (S, day) { // (skips brakes you said aren't for you, through goals)
    var open = G.goals(S, day).filter(function (g) { return !g.done; });
    var tips = { 'Slow breathing (4 in / 4 out)': 'a minute of slow breathing, 4 in and 4 out', 'Walk outside': 'a short walk outside', 'Stretching / yoga': 'a few stretches',
      'Morning sunlight': 'a few minutes of sunlight', 'Meditation / mindfulness': 'two quiet minutes of mindfulness', 'Time with pets': 'some time with the animals',
      'Warm drink at night': 'a warm, caffeine-free drink', 'Calm music': 'some calm music', 'Cold splash on face (quick reset)': 'a cold splash on your face for a quick reset' };
    var pick = open[0] ? open[0].label : 'Slow breathing (4 in / 4 out)';
    return tips[pick] || lc(pick);
  };
  // What Aiu says after you report something (and what it logs). pending = a "mixed" follow-up question.
  G.reply = function (S, day, hit, name) {
    var before = G.bar(S, day);
    if (hit.kind === 'mixed') {
      var q = G.MIXED_QUESTIONS[U.hash32(hit.item + day) % G.MIXED_QUESTIONS.length];
      return { line: hit.item + ' can go either way. ' + q + ' Did it calm you down or rev you up?', events: [], pending: { type: 'gaba_mixed', data: { item: hit.item } } };
    }
    var ev = G.logEvent(S, day, hit.kind, hit.item, hit.pts), after = Math.max(0, Math.min(100, before + hit.pts)), line;
    if (hit.kind === 'calm') line = 'Brake +' + hit.pts + ': ' + lc1(hit.item) + '. Your Go/Brake bar is at ' + after + '.' + (ev.data.goal ? ' That was one of today\'s goals!' : '');
    else line = 'Noted: ' + lc1(hit.item) + ' (Go ' + hit.pts + '). Bar at ' + after + '.' + (after < 45 ? ' Want a quick brake? Try ' + G.suggest(S, day) + '.' : '');
    return { line: line, events: [ev] };
  };
  function lc1(s) { s = String(s || ''); return s.charAt(0).toLowerCase() + s.slice(1); }
  // For the journal page and the PDF: one line about the day
  G.dayLine = function (S, day) {
    var list = G.day(S, day); if (!list.length) return '';
    var calm = list.filter(function (g) { return g.kind === 'calm'; }).map(function (g) { return g.item; }), go = list.filter(function (g) { return g.kind === 'stress'; }).map(function (g) { return g.item; });
    return 'Go/Brake bar: ' + G.bar(S, day) + ' (' + G.state(G.bar(S, day)).toLowerCase() + ')' + (calm.length ? '. Brake: ' + calm.join(', ') : '') + (go.length ? '. Go: ' + go.join(', ') : '') + '.';
  };
})();
