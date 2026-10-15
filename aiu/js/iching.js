/* AIU TOTEM - the daily I Ching reading.
   The I Ching is an ancient Chinese book (public domain). The names, meanings and advice below are written by KODNA in our own
   plain words (no modern translation is used). Aiu casts one reading a day with the three-coin method. The coins are seeded by
   the Totem and the date, so every device (phone, Pi, PC) gets the same reading for the same day.
   Each reading sets the day's "mode" (start, finish, rest, connect, learn, order, wait), which steers Aiu's nudges and questions. */
(function () {
  'use strict';
  var U = AIU.util;
  var I = AIU.iching = {};

  // Trigrams by their three lines, bottom to top (bit 1 = bottom line, 1 = solid).
  I.TRIGRAMS = { 7: 'Heaven', 3: 'Lake', 5: 'Fire', 1: 'Thunder', 6: 'Wind', 2: 'Water', 4: 'Mountain', 0: 'Earth' };
  // The traditional order (King Wen): row = lower trigram, column = upper trigram.
  var ORDER = [7, 1, 2, 4, 0, 6, 5, 3]; // Heaven, Thunder, Water, Mountain, Earth, Wind, Fire, Lake
  var KW = [
    [1, 34, 5, 26, 11, 9, 14, 43],
    [25, 51, 3, 27, 24, 42, 21, 17],
    [6, 40, 29, 4, 7, 59, 64, 47],
    [33, 62, 39, 52, 15, 53, 56, 31],
    [12, 16, 8, 23, 2, 20, 35, 45],
    [44, 32, 48, 18, 46, 57, 50, 28],
    [13, 55, 63, 22, 36, 37, 30, 49],
    [10, 54, 60, 41, 19, 61, 38, 58]
  ];
  I.number = function (lower, upper) { return KW[ORDER.indexOf(lower)][ORDER.indexOf(upper)]; };

  // [pinyin, name, mode, meaning, advice] - our own words
  var HEX = [null,
    ['Qian', 'Heaven\'s Drive', 'start', 'Pure, strong energy, like the sky that never stops turning.', 'Start the big thing and keep a steady pace.'],
    ['Kun', 'Open Field', 'finish', 'Open, patient ground that lets everything grow.', 'Support what\'s already moving and follow through.'],
    ['Zhun', 'Sprouting', 'order', 'A seed pushing through hard ground. Beginnings are messy.', 'Sort out the first steps, and ask for help.'],
    ['Meng', 'Beginner\'s Mind', 'learn', 'Not knowing yet, and that\'s okay.', 'Ask questions and learn one new thing.'],
    ['Xu', 'Waiting', 'wait', 'Clouds gather before the rain. The moment isn\'t here yet.', 'Prepare, eat well, and don\'t force it.'],
    ['Song', 'Dispute', 'wait', 'A clash where winning costs more than it\'s worth.', 'Skip the argument. Meet halfway, or step back.'],
    ['Shi', 'The Crew', 'order', 'A group held together by clear roles and a good leader.', 'Give every task a plan and an owner.'],
    ['Bi', 'Holding Together', 'connect', 'People who belong together find each other.', 'Reach out to your people.'],
    ['Xiao Chu', 'Small Restraint', 'finish', 'Light clouds, no rain yet. Small forces hold things back.', 'Stick to small tasks and tidy the details.'],
    ['Lu', 'Careful Steps', 'wait', 'Walking right behind a tiger. Good manners keep you safe.', 'Watch your step and stay polite.'],
    ['Tai', 'Peace', 'start', 'Heaven and earth in balance. Things flow.', 'A good day to grow something. Make progress.'],
    ['Pi', 'Standstill', 'rest', 'Things are stuck and out of step.', 'Don\'t push. Keep your values and rest.'],
    ['Tong Ren', 'Fellowship', 'connect', 'People joined by a shared purpose, out in the open.', 'Team up and share your plans.'],
    ['Da You', 'Great Harvest', 'finish', 'Plenty, earned by good work.', 'Enjoy what you\'ve built, and share it.'],
    ['Qian', 'Modesty', 'order', 'A mountain hidden under the earth. Quiet strength.', 'Keep it simple and even things out.'],
    ['Yu', 'Enthusiasm', 'start', 'Thunder over the earth. Energy that gets everyone moving.', 'Get excited and bring others along.'],
    ['Sui', 'Following', 'connect', 'Going along with what works, like the seasons do.', 'Follow a good example today.'],
    ['Gu', 'Repair', 'finish', 'Fixing what was left to spoil.', 'Fix the thing you\'ve been avoiding.'],
    ['Lin', 'Approach', 'start', 'Good things are coming closer.', 'Step forward and begin.'],
    ['Guan', 'Overview', 'learn', 'The view from the tower.', 'Step back and look at the big picture.'],
    ['Shi He', 'Biting Through', 'finish', 'Something is in the way and needs a firm bite.', 'Deal with the problem head on.'],
    ['Bi', 'Grace', 'order', 'Polish and beauty on top of real substance.', 'Tidy up and make it nice, but don\'t fuss.'],
    ['Bo', 'Stripping Away', 'rest', 'Things are falling away, like old leaves.', 'Let go of what isn\'t working, and rest.'],
    ['Fu', 'Return', 'rest', 'The turning point. Light comes back after the longest night.', 'Come back to your good habits, gently.'],
    ['Wu Wang', 'Innocence', 'wait', 'Acting naturally, without scheming.', 'Be honest and simple. Don\'t overplan.'],
    ['Da Chu', 'Great Taming', 'learn', 'Strength and know-how stored up for later.', 'Study and build your skills.'],
    ['Yi', 'Nourishment', 'rest', 'Care for body and mind. Watch what you take in.', 'Eat well, speak kindly, and rest.'],
    ['Da Guo', 'Heavy Beam', 'order', 'The beam is bending under too much weight.', 'Lighten the load. Drop one thing.'],
    ['Kan', 'Deep Water', 'wait', 'Water rushing through a gorge, again and again.', 'Stay steady and keep going through the hard part.'],
    ['Li', 'Bright Flame', 'learn', 'Light and clarity that need something to burn on.', 'Stay focused, and lean on good support.'],
    ['Xian', 'Attraction', 'connect', 'Two things drawn together by gentle pull.', 'Be open, and connect with someone.'],
    ['Heng', 'Endurance', 'finish', 'Staying power, like thunder and wind that always come back.', 'Keep your routine. Consistency wins.'],
    ['Dun', 'Retreat', 'rest', 'Stepping back at the right time.', 'Recharge. Pulling back isn\'t giving up.'],
    ['Da Zhuang', 'Great Power', 'start', 'Strength is running high.', 'Use your energy well, and don\'t bulldoze.'],
    ['Jin', 'Progress', 'start', 'The sun rising over the earth.', 'Move forward and show your work.'],
    ['Ming Yi', 'Dimmed Light', 'rest', 'The light goes under the earth for a while.', 'Lay low and protect your energy.'],
    ['Jia Ren', 'Household', 'order', 'A home where everyone knows their part.', 'Take care of home and family.'],
    ['Kui', 'Opposites', 'wait', 'Fire and water pulling different ways.', 'Agree on small things. Leave the big ones for later.'],
    ['Jian', 'Obstacle', 'connect', 'A mountain in the way, with water ahead.', 'Stop, rethink, and ask for help.'],
    ['Xie', 'Release', 'finish', 'The storm breaks and the knot loosens.', 'Clear up loose ends, and forgive.'],
    ['Sun', 'Decrease', 'order', 'Less can be more.', 'Simplify one thing.'],
    ['Yi', 'Increase', 'start', 'Gain that grows by helping others.', 'Start something, and lend a hand.'],
    ['Guai', 'Breakthrough', 'finish', 'A decision breaks through at last.', 'Make the call, firm but kind.'],
    ['Gou', 'Meeting', 'wait', 'An unexpected meeting with something tempting.', 'Watch out for easy shortcuts.'],
    ['Cui', 'Gathering', 'connect', 'People come together around what they share.', 'Gather your people, or your things.'],
    ['Sheng', 'Rising', 'start', 'A tree growing upward, step by step.', 'Climb one step at a time.'],
    ['Kun', 'Exhaustion', 'rest', 'A dried-up lake. Tired and boxed in.', 'Rest, say less, and keep your spirit up.'],
    ['Jing', 'The Well', 'learn', 'The well is always there for anyone who draws from it.', 'Go back to the basics.'],
    ['Ge', 'Change', 'start', 'Shedding an old skin when the time is right.', 'Change what isn\'t working.'],
    ['Ding', 'Cauldron', 'learn', 'Cooking up something new and nourishing.', 'Refine an idea. Maybe cook something!'],
    ['Zhen', 'Thunder', 'wait', 'A sudden shock that wakes everyone up.', 'Stay calm if something surprises you.'],
    ['Gen', 'Mountain', 'rest', 'Stillness. Stopping when it\'s time to stop.', 'Take some quiet time and be still.'],
    ['Jian', 'Gradual Progress', 'finish', 'A tree on a mountain grows slowly and stays.', 'Slow and steady. Take one step.'],
    ['Gui Mei', 'Junior Role', 'wait', 'Not the one in charge right now.', 'Play your part without pushing.'],
    ['Feng', 'Abundance', 'finish', 'The bright peak of the day.', 'Get the most done while it\'s bright.'],
    ['Lu', 'The Traveler', 'learn', 'Passing through somewhere new.', 'Explore, and be a good guest.'],
    ['Xun', 'Gentle Wind', 'order', 'Soft, steady wind that gets in everywhere.', 'Keep nudging, gently and often.'],
    ['Dui', 'Joy', 'connect', 'Two lakes sharing their water. Shared joy.', 'Have fun with someone today.'],
    ['Huan', 'Dispersing', 'rest', 'Wind over water breaks up what\'s stuck.', 'Let go of grudges and loosen up.'],
    ['Jie', 'Limits', 'order', 'Healthy limits, like the joints in bamboo.', 'Set a limit on time, money or energy.'],
    ['Zhong Fu', 'Inner Truth', 'connect', 'Honesty that reaches even the hard to reach.', 'Be sincere, and listen first.'],
    ['Xiao Guo', 'Small Steps', 'finish', 'A small bird should fly low.', 'Keep to small things today.'],
    ['Ji Ji', 'After Completion', 'order', 'Everything is in place, for now.', 'Keep an eye on what you finished.'],
    ['Wei Ji', 'Almost There', 'finish', 'Not done yet. The last stretch.', 'Finish carefully. You\'re close.']
  ];

  // What each day mode means for the conversation and the day.
  I.MODES = {
    start: { label: 'start something', line: 'A good day to start, not to wait.', q: 'Anything new you want to start today?', first: 'what' },
    finish: { label: 'finish things', line: 'A good day to finish, not to start.', q: 'What\'s one thing you want to finish today?', first: 'how' },
    rest: { label: 'rest and recharge', line: 'Go easy on yourself today.', q: 'What would help you recharge today?', first: 'how' },
    connect: { label: 'connect with people', line: 'A good day to reach out to someone.', q: 'Who could you check in with today?', first: 'who' },
    learn: { label: 'learn something', line: 'A good day to learn and look around.', q: 'What would you like to learn about?', first: 'why' },
    order: { label: 'get organized', line: 'A good day to sort and simplify.', q: 'Anything that needs sorting out?', first: 'what' },
    wait: { label: 'be patient', line: 'Prepare, and don\'t force it.', q: 'What are you waiting on right now?', first: 'when' }
  };


  // For the Hilltop View: [one-word theme, modern interpretation, hilltop principle, asks "what am I feeding?"] - our own words
  var EXTRA = [null,
    ['Initiative', 'You have more energy than usual. Aim it at one worthy goal instead of scattering it.', 'Point your strength at one thing.', 0],
    ['Receptivity', 'Progress comes from supporting and following through, not from forcing a new lead.', 'Support what is already growing.', 1],
    ['Beginnings', 'A new start feels messy. That is normal: put some structure around it and get help.', 'Organize the chaos before you add to it.', 0],
    ['Learning', 'You don\'t have all the answers yet. Ask good questions and be willing to be taught.', 'Ask before you assume.', 0],
    ['Patience', 'The timing isn\'t ready. Use the wait to prepare and take care of yourself instead of worrying.', 'Prepare well, then let the timing come.', 1],
    ['Conflict', 'A fight you could win may still cost too much. Look for a fair middle, or walk away.', 'Don\'t pay more to win than the win is worth.', 0],
    ['Discipline', 'Things go well when roles are clear and someone keeps order.', 'Give every task an owner.', 0],
    ['Belonging', 'Stick with the people and commitments that are sound. Join instead of drifting.', 'Stay close to what is sound.', 0],
    ['Restraint', 'Big moves are blocked for now, but small steady details still move things forward.', 'Small steps still count.', 0],
    ['Conduct', 'You\'re near something powerful or touchy. Good manners and care keep you safe.', 'Walk carefully near the tiger.', 0],
    ['Harmony', 'Things line up. Use the easy flow to make real progress, and don\'t get lazy.', 'Use the good weather to build.', 0],
    ['Stagnation', 'Things are stuck and out of step. Don\'t force it; keep your standards and wait it out.', 'Don\'t push a stuck door. Hold your ground.', 0],
    ['Community', 'Work openly with people who share your aim.', 'Build with people, in the open.', 0],
    ['Abundance', 'You have more than you think. Use it well, share it, and stay humble.', 'Use what you have well.', 0],
    ['Balance', 'Quiet, steady effort gets further than showing off. Even out what is lopsided.', 'Keep it humble and even.', 0],
    ['Momentum', 'Energy is up. Rally yourself and others, but plan so it doesn\'t burn out.', 'Turn excitement into a plan.', 0],
    ['Adaptability', 'Go with what is working and follow a good example; don\'t cling to an old plan.', 'Follow what works.', 0],
    ['Repair', 'Something was neglected and started to spoil. Fix it now, before it costs more.', 'Fix the neglected thing before it grows.', 0],
    ['Opportunity', 'Good things are coming close. Step toward them while the season is right.', 'Step toward what is coming.', 0],
    ['Perspective', 'Climb up and look at the whole picture before you choose.', 'See the whole terrain first.', 0],
    ['Resolve', 'An obstacle keeps getting in the way. Deal with it directly and fairly.', 'Bite through the obstacle.', 0],
    ['Presentation', 'Make things look good, but make sure the substance underneath is real.', 'Polish only what is solid.', 0],
    ['Shedding', 'Something is falling apart. Let it go and protect what is essential.', 'Let the dead leaves fall.', 1],
    ['Renewal', 'A turning point. Come back to good habits, one small step at a time.', 'Return to what works, gently.', 0],
    ['Honesty', 'Act simply and honestly. Scheming and overplanning backfire today.', 'Do the honest, simple thing.', 0],
    ['Reserves', 'Hold your strength back and build it up: study, save, practice.', 'Store strength for the right time.', 1],
    ['Nourishment', 'Look at what you take in and what you give out: food, words, media, attention.', 'Feed the life you want to keep.', 1],
    ['Overload', 'Too much weight on one beam. Something must be lightened or it will break.', 'Lighten the load before it breaks.', 0],
    ['Persistence', 'Difficulty repeats. Keep flowing like water: steady, honest, and don\'t stop.', 'Keep moving through the hard part.', 0],
    ['Clarity', 'Clear seeing depends on good fuel and good support. Stay focused and don\'t burn out.', 'See clearly, and keep the fire fed.', 0],
    ['Connection', 'Gentle, mutual pull works better than pressure.', 'Influence by being open.', 0],
    ['Consistency', 'Staying power beats bursts of effort. Keep the routine that is working.', 'Consistency wins.', 0],
    ['Retreat', 'Stepping back at the right time protects your energy. It isn\'t defeat.', 'Retreat to recharge, not to quit.', 0],
    ['Strength', 'Your strength is high. Use it rightly, and don\'t bulldoze.', 'Strength needs good aim.', 0],
    ['Progress', 'Things are rising. Show your work and move forward.', 'Let your progress be seen.', 0],
    ['Protection', 'The surroundings aren\'t friendly to your light right now. Keep it safe inside and lay low.', 'Protect your light in the dark.', 0],
    ['Home', 'Order at home supports everything else. Everyone knows their part.', 'Put the house in order.', 0],
    ['Difference', 'People pull different ways. Small agreements are possible; big ones can wait.', 'Agree on the small things first.', 0],
    ['Obstruction', 'The path is blocked. Stop, reflect, and ask for help instead of forcing it.', 'When blocked, turn and get help.', 0],
    ['Release', 'The knot loosens. Clear loose ends quickly and let old grudges go.', 'Untie it and move on.', 0],
    ['Simplicity', 'Less can be more. Cut back where it frees energy for what matters.', 'Subtract to strengthen.', 1],
    ['Growth', 'A time of gain. Use it to grow, and to help others grow.', 'Grow by helping.', 1],
    ['Decision', 'A decision is ready. Make it clearly and fairly.', 'Make the call.', 0],
    ['Discernment', 'Something tempting shows up. Look at what it really brings before you let it in.', 'Discern before you let it in.', 0],
    ['Gathering', 'Bring people or resources together around a clear center.', 'Gather around what matters.', 0],
    ['Ascent', 'Steady upward growth, step by step, like a young tree.', 'Climb one step at a time.', 0],
    ['Depletion', 'Tired and boxed in. Save your words, rest, and keep your spirit.', 'Refill the well before you draw from it again.', 1],
    ['Source', 'Go back to the source: the basics, your skills, what truly sustains you.', 'Keep the well clean.', 1],
    ['Change', 'Something has to change. Do it when the time is right, and be clear about why.', 'Change what no longer works.', 0],
    ['Refinement', 'Cook your ideas into something nourishing. Refine what you already have.', 'Refine it into something useful.', 1],
    ['Shock', 'Something sudden shakes things up. Stay calm and learn from it.', 'Stay steady when the thunder hits.', 0],
    ['Stillness', 'Stop and be still. Rest your mind before the next move.', 'Stillness first.', 0],
    ['Steadiness', 'Slow, steady growth lasts. Don\'t rush the steps.', 'Slow roots grow deep.', 0],
    ['Humility', 'You\'re not in charge here. Do your part well without pushing.', 'Play your part well.', 0],
    ['Peak', 'A bright, full moment. Get the most done while it lasts.', 'Make hay while the sun shines.', 0],
    ['Exploration', 'You\'re passing through. Be curious, careful, and a good guest.', 'Travel light, stay alert.', 0],
    ['Influence', 'Small, repeated nudges get in everywhere.', 'Keep nudging, gently.', 0],
    ['Joy', 'Shared joy and good conversation lift everything.', 'Share the good.', 0],
    ['Loosening', 'Break up what is stuck: grudges, clutter, tension.', 'Loosen what is frozen.', 0],
    ['Limits', 'Healthy limits make freedom possible. Set one.', 'Set the limit, then relax inside it.', 1],
    ['Sincerity', 'Honesty and listening reach even stubborn hearts.', 'Mean what you say.', 0],
    ['Caution', 'Fly low. Small, careful actions beat big leaps today.', 'Stay small and careful.', 0],
    ['Maintenance', 'Things are in place. Watch for slips and maintain what you built.', 'Maintain what you finished.', 0],
    ['Completion', 'Not done yet. Be careful in the last stretch.', 'Finish before you open another door.', 0]
  ];
  // What a changing line in each position points at (the traditional places, in our own words).
  I.LINEPOS = [null,
    ['the beginning', 'how you start: get the footing right and start small'],
    ['the inner center', 'your own steady work: stay balanced and reliable, and sound effort gets support'],
    ['the crossing point', 'the risky middle, where it\'s easy to overdo it: don\'t overreach'],
    ['the threshold', 'stepping out toward others: check who and what you\'re trusting before you go further'],
    ['the center of the whole', 'your judgment and leadership: act from the center, fairly and with purpose'],
    ['the far end', 'the peak, or past it: know when enough is enough']
  ];

  I.info = function (n) {
    var h = HEX[n], x = EXTRA[n]; if (!h) return null;
    return { n: n, pinyin: h[0], name: h[1], mode: h[2], meaning: h[3], advice: h[4], lines: I.linesOf(n), theme: x[0], modern: x[1], principle: x[2], feed: !!x[3] };
  };
  var LINES = {}; // hexagram number -> its six lines, bottom to top (1 solid, 0 broken)
  ORDER.forEach(function (lo, r) { ORDER.forEach(function (up, c) { var n = KW[r][c]; LINES[n] = [lo & 1, lo >> 1 & 1, lo >> 2 & 1, up & 1, up >> 1 & 1, up >> 2 & 1]; }); });
  I.linesOf = function (n) { return (LINES[n] || []).slice(); };
  I.trigramsOf = function (n) { var l = LINES[n]; return l ? { lower: I.TRIGRAMS[l[0] | l[1] << 1 | l[2] << 2], upper: I.TRIGRAMS[l[3] | l[4] << 1 | l[5] << 2] } : null; };

  // Three coins per line, six lines, bottom to top. Heads = 3, tails = 2:
  // 6 = broken line that changes, 7 = solid, 8 = broken, 9 = solid line that changes.
  I.castLines = function (seedText) {
    var r = U.rng(U.hash32('iching:' + seedText)), out = [];
    for (var i = 0; i < 6; i++) { var s = 0; for (var k = 0; k < 3; k++) s += r() < 0.5 ? 2 : 3; out.push(s); }
    return out;
  };
  I.fromLines = function (vals) {
    var yang = vals.map(function (v) { return v === 7 || v === 9 ? 1 : 0; });
    var rel = vals.map(function (v, i) { return v === 6 ? 1 : v === 9 ? 0 : yang[i]; });
    var num = function (b) { return I.number(b[0] | b[1] << 1 | b[2] << 2, b[3] | b[4] << 1 | b[5] << 2); };
    var moving = []; vals.forEach(function (v, i) { if (v === 6 || v === 9) moving.push(i + 1); });
    return { vals: vals, hex: num(yang), rel: num(rel), moving: moving };
  };
  // The day's reading for this Totem (the same on every device).
  I.castFor = function (totemId, day) { var c = I.fromLines(I.castLines(totemId + ':' + day)); c.day = day; return c; };
  I.modeOf = function (reading) { var h = reading && I.info(reading.hex); return h ? h.mode : null; };
  I.HEX = HEX;
})();
