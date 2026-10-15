/* AIU TOTEM - the butler's tiny brain: a naive Bayes intent model (small enough for a Pi 2) that learns from you,
   plus the 21 Questions rules it uses when it isn't sure what you meant.
   Intents: todo (something to do), goal (a bigger aim), happened (something that already happened), remember (a fact to keep),
   feeling (how you feel), question (you're asking it something), chat (just talking).
   It starts from the example sentences below; every time you answer one of its questions it saves a "teach" event
   (synced to all your devices), so it gets better at understanding you in particular. */
(function () {
  'use strict';
  var U = AIU.util, Wd = AIU.words, D = AIU.dict;
  var B = AIU.butler = {};
  function lc(s) { return String(s || '').toLowerCase(); }

  B.INTENTS = ['todo', 'goal', 'happened', 'remember', 'feeling', 'question', 'chat'];
  B.ACTION = { todo: 1, goal: 1, remember: 1 };
  var SEED = {
    todo: ['I need to call the dentist', 'have to pay the electric bill', 'gotta mow the lawn this weekend', 'the sink is leaking', 'the car needs gas',
      'we are out of milk', 'I should clean the garage', 'need to buy dog food', 'do not forget to email Sam', 'I must finish the report by Friday',
      'the tires are flat', 'take out the trash', 'pick up the kids at 3', 'return the library books', 'the gutters are full of leaves', 'renew my license',
      'schedule a vet appointment for the cat', 'fix the fence', 'the printer is out of ink', 'call mom back', 'I still have to do laundry',
      'rent is due friday', 'the lightbulb in the kitchen burned out', 'wash the dishes', 'reply to the landlord', 'the dishwasher is broken',
      'the grass is getting long', 'we are low on eggs', 'the cat needs shots', 'my phone screen is cracked',
      'we ran out of paper towels', 'the washer is making a loud noise', 'the heater stopped working', 'the drain is clogged'],
    goal: ['I want to learn guitar', 'someday I want to run a marathon', 'I am trying to lose weight', 'my goal is to save money for a house',
      'I want to get better at drawing', 'I hope to start my own business', 'I would love to learn Japanese', 'I am planning to go back to school',
      'I want to write a book one day', 'trying to get in shape this year', 'I wanna build a cabin', 'I want to be a nurse', 'learning how to cook',
      'I dream of traveling to Italy', 'I want to quit smoking', 'I am working toward a promotion', 'I want to read more books this year',
      'I plan to finish my degree', 'I want to get into 3d printing', 'I would like to make more friends', 'I want to grow my own vegetables',
      'I am saving up for a truck', 'I am trying to drink more water', 'I am trying to be more patient'],
    happened: ['I went to the store', 'we had pizza for dinner', 'I finished the project today', 'my sister came over yesterday',
      'I fixed the fence this morning', 'we watched a movie last night', 'I walked the dog', 'the kids played outside all day', 'I got a new job',
      'I cleaned the whole house', 'we drove to the lake', 'I cooked pasta', 'my boss called me', 'I ran three miles', 'I finally mowed the lawn',
      'we went fishing', 'I bought new shoes', 'the meeting went well', 'I slept in', 'had coffee with Jen', 'I just got home from work',
      'the dog chewed my shoe', 'we visited grandma', 'I paid the bills', 'I painted the kitchen', 'I finished my homework'],
    remember: ['remember that the wifi password is on the router', 'the spare key is under the mat', 'my locker combo is 12 34 56',
      'note that the coop needs a latch', 'Sam birthday is June 4', 'the water shutoff is in the basement', 'the gate code is 4412',
      'fyi the dentist is on Main Street', 'my shoe size is 10', 'the recipe uses two cups of flour', 'the car takes 5w30 oil',
      'the plumber number is on the fridge', 'my parking spot is 14', 'Jen likes daisies', 'the oil change is due at 60k',
      'write down that the filter is 16x25', 'the trash goes out on tuesdays', 'grandma address is in my phone', 'the extra blankets are in the closet',
      'the warranty is in the kitchen drawer', 'keep in mind the meeting room is B', 'the flashlight is in the hall closet'],
    feeling: ['I feel tired', 'I am so happy today', 'I am stressed about work', 'feeling kind of down', 'I am excited for the weekend',
      'I am really anxious', 'I feel great', 'ugh I am exhausted', 'I am bored', 'I am so proud of myself', 'feeling lonely tonight',
      'I am nervous about tomorrow', 'I am grumpy', 'I feel good about it', 'I am frustrated with my computer', 'I am in a great mood',
      'I feel sick', 'I am overwhelmed', 'I am grateful', 'I am annoyed', 'today was rough', 'I am sad', 'I am worried about my mom', 'I am scared'],
    question: ['what should I eat for dinner', 'do you like music?', 'what is your favorite color', 'how do I fix a leaky faucet', 'can you help me',
      'where did I put my keys', 'what do you think', 'is it going to rain', 'who are you', 'why is the sky blue', 'should I go to bed',
      'what can you do', 'are you awake', 'how old are you', 'do you dream', 'which one is better', 'can you sing', 'is that normal',
      'what does that mean', 'how are you so cute'],
    chat: ['lol that is funny', 'you are cute', 'nice', 'cool', 'haha', 'that is awesome', 'whatever', 'good job buddy', 'you are the best',
      'just chilling', 'nothing much', 'same', 'oh well', 'I like cats', 'pizza is the best food', 'the weather is nice', 'it is raining',
      'the sunset is pretty', 'football is on tonight', 'I love this song', 'my dog is so cute', 'blue is my favorite color', 'that is wild',
      'the game was crazy', 'I am a gamer']
  };
  B.SEED = SEED;

  /* ---------- features: words, their base forms, meanings (concepts), kinds, and a few cue patterns ---------- */
  var KEEPFN = { i: 1, we: 1, you: 1, my: 1, not: 1, will: 1, should: 1, must: 1, can: 1, what: 1, how: 1, why: 1, where: 1, who: 1, when: 1, is: 1, are: 1, am: 1, do: 1, did: 1, have: 1, had: 1 };
  var CUES = [
    ['need', /\b(need to|needs|have to|has to|gotta|got to|should|must|ought to|don'?t forget to|do not forget to|supposed to|due)\b/],
    ['want', /\b(want to|wanna|hope to|wish i could|dream|goal|someday|one day|plan to|planning to|trying to|try to|learn(ing)? (to|how)|get better at|get into|would love to|would like to|saving up)\b/],
    ['note', /\b(remember|note|fyi|for the record|keep in mind|write (this|that|it) down|code is|password|combo|combination|birthday is|number is|size is|address)\b/],
    ['feel', /\b(i feel|i'?m feeling|feeling|i'?ve been feeling|i am (so|really|kinda|kind of|pretty|super|very)|mood)\b/],
    ['ask', /\?\s*$|^(what|when|where|who|why|how|which|is|are|do|does|did|can|could|would|will|should)\b/],
    ['past', /\b(yesterday|last (night|week|month|year)|earlier|this morning|ago|just now|finally|already|today i)\b/],
    ['future', /\b(tomorrow|later|tonight|next|soon|this weekend|by (monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/],
    ['broken', /\b(broke|broken|leak|leaks|leaking|leaky|drip|drips|dripping|clogged|squeak|squeaks|squeaky|squeaking|rattling|loose|flat|dead|stuck|won'?t (start|open|close|turn on)|stopped working|isn'?t working|not working|making (a|that) (noise|sound)|out of|ran out|low on|empty|dirty|overflowing|cracked|burned out|burnt out|needs)\b/],
    ['me', /^(i|we|i'm|im|we're)\b/]
  ];
  B.features = function (text) {
    var s = lc(text).replace(/[’]/g, "'"), f = {}, n = 0;
    if (D && D.ready) {
      D.read(text).forEach(function (t) {
        n++;
        if (t.fn) { if (KEEPFN[t.w]) f['w:' + t.w] = 1; return; }
        if (t.num) { f['num'] = 1; return; }
        f['w:' + t.base] = 1;
        var k0 = t.kinds[0] || '';
        if (t.p === 'v' && t.c) f['c:' + t.c] = 1;           // same meaning, different word (buy = purchase, fix = repair)
        else if (k0.charAt(0) === 'n') f['k:' + k0] = 1;    // what kind of thing (pet, food, vehicle, family...)
        if (t.kinds.indexOf('a.feel') >= 0) f['k:feelword'] = 1;
        if (t.p === 'v' && t.form === 'past') f['g:pastverb'] = 1;
        if (t.p === 'v' && t.start && !t.form) f['g:imper'] = 1;
        if (!t.known && !t.fn) f['g:unknown'] = 1;
      });
    } else {
      Wd.tokens(text, true).forEach(function (t) { n++; f['w:' + t.norm] = 1; });
      if (/\b\w+ed\b/.test(s)) f['g:pastverb'] = 1;
    }
    CUES.forEach(function (c) { if (c[1].test(s)) { f['q:' + c[0]] = 1; f['q2:' + c[0]] = 1; } }); // cue phrases count double
    if (n <= 3) f['g:short'] = 1;
    return Object.keys(f);
  };

  /* ---------- the model (rebuilt only when you teach it something new) ---------- */
  var cache = { key: null, m: null };
  function build(taught) {
    var m = { n: {}, fc: {}, total: {}, vocab: {} };
    B.INTENTS.forEach(function (c) { m.n[c] = 0; m.fc[c] = {}; m.total[c] = 0; });
    function add(text, c, w) {
      if (!m.fc[c]) return;
      m.n[c] += w;
      B.features(text).forEach(function (f) { m.fc[c][f] = (m.fc[c][f] || 0) + w; m.total[c] += w; m.vocab[f] = 1; });
    }
    B.INTENTS.forEach(function (c) { SEED[c].forEach(function (t) { add(t, c, 1); }); });
    (taught || []).forEach(function (x) { add(x.text, x.intent, 3); }); // your own answers count triple
    m.V = Object.keys(m.vocab).length;
    return m;
  }
  B.model = function (S) {
    var T = (S && S.taught) || [], key = T.length + ':' + (T.length ? T[T.length - 1].id : '') + ':' + (D && D.ready ? 1 : 0);
    if (cache.key !== key) { cache.m = build(T); cache.key = key; }
    return cache.m;
  };
  // Returns {ranked: [{intent, p}], feats}
  B.classify = function (text, S) {
    var m = B.model(S), feats = B.features(text), scores = {}, max = -Infinity;
    B.INTENTS.forEach(function (c) {
      var sc = 0; // uniform prior: every intent starts equal
      feats.forEach(function (f) { sc += Math.log(((m.fc[c][f] || 0) + 0.5) / (m.total[c] + 0.5 * m.V)); });
      scores[c] = sc; if (sc > max) max = sc;
    });
    var T = Math.max(1.5, Math.sqrt(feats.length)), sum = 0, out = [];
    B.INTENTS.forEach(function (c) { var e = Math.exp((scores[c] - max) / T); out.push({ intent: c, p: e }); sum += e; });
    out.forEach(function (x) { x.p /= sum; });
    out.sort(function (a, b) { return b.p - a.p; });
    return { ranked: out, feats: feats };
  };

  /* ---------- 21 Questions: narrow it down with a question or two ---------- */
  var PHRASE = {
    todo: 'something you still need to do', goal: 'a goal you want to work toward', remember: 'something I should remember',
    happened: 'something that already happened', feeling: 'about how you feel', question: 'a question for me', chat: 'just chatting'
  };
  var YESNO = {
    todo: 'Is that something you still need to take care of?', goal: 'Is that a bigger goal you want to work toward?', remember: 'Should I remember that for you?',
    happened: 'Did that already happen?', feeling: 'Is that about how you\'re feeling?', question: 'Are you asking me something?', chat: 'Are we just chatting?'
  };
  B.question = function (cands, n) {
    var lead = n === 0 ? 'Quick question so I get it right (question 1 of 21!): ' : n === 1 ? 'Okay! Question 2: ' : 'Last one: ';
    if (cands.length >= 2) { var q = 'is it ' + PHRASE[cands[0]] + ', or ' + PHRASE[cands[1]] + '?'; return lead + q.replace(/is it about/, 'is it about'); }
    return lead + YESNO[cands[0]];
  };
  var ANSWER = {
    todo: /\b(to ?-?do|need to|needs? doing|still|take care|have to|gotta|not yet|haven'?t|remind|reminder|task|chore|fix)\b/,
    goal: /\b(goal|quest|work toward|someday|dream|long ?term|aim)\b/,
    remember: /\b(remember|note|save it|keep it|write it|record|don'?t forget)\b/,
    happened: /\b(happened|already|did it|done|finished|yesterday|earlier|past|it was)\b/,
    feeling: /\b(feel|feeling|feelings|mood|emotion|how i feel)\b/,
    question: /\b(question|asking|ask(ed)?)\b/,
    chat: /\b(chat|chatting|talking|just saying|just telling|nothing|neither|none|never ?mind|no idea|whatever|just sharing)\b/
  };
  // What did they answer? Returns an intent, 'no', or null (not an answer).
  B.answer = function (text, cands) {
    var s = lc(text).replace(/[’]/g, "'").trim(), best = null, at = 1e9;
    if (s.split(/\s+/).length > 14) return null;
    Object.keys(ANSWER).forEach(function (c) { var m = ANSWER[c].exec(s); if (m && m.index < at) { best = c; at = m.index; } });
    if (best) return best;
    if (/^(the )?(first|1|former|a)\b|^(the )?first one\b/.test(s)) return cands[0];
    if (cands[1] && /^(the )?(second|2|latter|b|other)\b|^(the )?(second|other) one\b/.test(s)) return cands[1];
    if (/^(y|yes|yeah|yep|yup|sure|right|correct|exactly|ok|okay|uh huh|mhm|definitely|mostly)\b/.test(s)) return cands[0];
    if (/^(n|no|nope|nah|not really|wrong|neither)\b/.test(s)) return 'no';
    return null;
  };
  // Should the butler ask, offer, or just chat? Returns {mode: 'offer'|'ask', intent, cands} or null.
  B.decide = function (text, S, allowAsk) {
    var words = String(text || '').trim().split(/\s+/).length;
    if (words < 3 || words > 45) return null;
    var r = B.classify(text, S), a = r.ranked[0], b = r.ranked[1];
    if (B.ACTION[a.intent] && a.p >= 0.62 && a.p - b.p >= 0.3) return { mode: 'offer', intent: a.intent, r: r };
    var actionable = B.ACTION[a.intent] || (B.ACTION[b.intent] && b.p >= 0.22);
    if (!actionable || !allowAsk) return null;
    if (a.p >= 0.8 && !B.ACTION[a.intent]) return null; // clearly not something to act on
    var asking = r.feats.indexOf('q:ask') >= 0;
    var cands = r.ranked.filter(function (x) { return x.p >= 0.05 && (asking || x.intent !== 'question'); }).slice(0, 3).map(function (x) { return x.intent; });
    if (cands.length < 2) cands = r.ranked.filter(function (x) { return asking || x.intent !== 'question'; }).slice(0, 2).map(function (x) { return x.intent; });
    // make sure the first question offers the likeliest thing the butler could actually do for you
    if (!B.ACTION[cands[0]] && !B.ACTION[cands[1]]) {
      var act = r.ranked.filter(function (x) { return B.ACTION[x.intent]; })[0];
      if (act) cands.splice(1, 0, act.intent);
    }
    cands = cands.slice(0, 3);
    return { mode: 'ask', cands: cands, r: r };
  };
})();
