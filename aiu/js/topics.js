/* AIU TOTEM - topic pages. When you talk about something (cars, fishing, your dog, feeling tired), Aiu asks about it the way
   a person would: who, what, when, where, why and how. Every answer is saved on that topic's page in the Library, in your words.
   Aiu never skips what it already knows: it reads it back and checks it's still true, like a good librarian.
   Preferences ("I like cars") fill the page's facts. Things that happen ("I went fishing today") are logged by date.
   You can end it any time ("that's all"), skip a question ("skip"), or edit and delete answers in the Library. */
(function () {
  'use strict';
  var U = AIU.util, Wd = AIU.words, C = AIU.core, P = AIU.persona;
  var T = AIU.topics = {};
  function Dict() { return AIU.dict && AIU.dict.ready ? AIU.dict : null; }
  function lc(s) { return String(s || '').toLowerCase(); }
  function cap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
  function pick(seed, arr) { return arr[U.hash32(String(seed) + ':' + arr.length) % arr.length]; }
  function you(s) { // your words, in Aiu's voice: "my brother" -> "your brother", "I was 12" -> "you were 12"
    return String(s || '').replace(/\bI was\b/gi, 'you were').replace(/\bI'm\b/gi, 'you\'re').replace(/\bI am\b/gi, 'you are').replace(/\bI've\b/gi, 'you\'ve').replace(/\bI'll\b/gi, 'you\'ll').replace(/\bI'd\b/gi, 'you\'d')
      .replace(/\bmyself\b/gi, 'yourself').replace(/\bmine\b/gi, 'yours').replace(/\bmy\b/gi, 'your').replace(/\bour\b/gi, 'your').replace(/\bme\b/gi, 'you').replace(/\bI\b/g, 'you');
  }
  T.you = you;
  function short(s, n) { s = Wd.clean(s); n = n || 48; return s.length > n ? s.slice(0, n - 3) + '...' : s; }
  function isYes(s) { return /^(y|yes|yeah|yep|yup|sure|ok|okay|still true|still is|still|that'?s right|right|correct|true|exactly|it is|same|same as before|uh huh|mhm|definitely|of course|absolutely)\b/i.test(String(s).trim()); }
  function isNo(s) { return /^(n|no|nope|nah|not anymore|not really|wrong|it changed|changed)\b/i.test(String(s).trim()); }
  T.WS = ['who', 'what', 'when', 'where', 'why', 'how'];
  T.WLABEL = { who: 'Who', what: 'What', when: 'When', where: 'Where', why: 'Why', how: 'How' };

  /* ---------- questions: our own wording, by kind of topic ---------- */
  var QSETS = {
    thing: { who: 'Who got you into {t}?', what: 'What kind of {t} do you like most?', when: 'When did you first get into {t}?', where: 'Where do you usually use or see {t}?', why: 'What do you like most about {t}?', how: 'How much do you know about {t}: beginner, pretty good, or expert?' },
    vehicle: { who: 'Who got you into {t}?', what: 'What make and model do you like most, and what color?', when: 'When did you first get into {t}?', where: 'Where do you like to drive?', why: 'What do you like most about {t}?', how: 'Do you work on {t} yourself, or leave it to a shop?' },
    mything: { who: 'Who else uses {t}?', what: 'What kind is it: make, model, color?', when: 'When did you get it?', where: 'Where did you get it?', why: 'Why did you pick that one?', how: 'How\'s it holding up?' },
    food: { who: 'Who makes the best {t}?', what: 'What kind of {t} do you like best?', when: 'When do you usually have {t}?', where: 'Where\'s your favorite place to get {t}?', why: 'What do you love about {t}?', how: 'How do you like it made?' },
    activity: { who: 'Who do you enjoy {t} with?', what: 'What\'s your favorite part of {t}?', when: 'When did you first get into {t}?', where: 'Where\'s your favorite spot for {t}?', why: 'What do you love about {t}?', how: 'How often do you get time for {t}?' },
    animal: { who: 'Do you have any {t}, or know someone who does?', what: 'What kind of {t} do you like best?', when: 'When did you start liking {t}?', where: 'Where do you see {t} the most?', why: 'What do you love about {t}?', how: 'How many {t} have you had?' },
    myanimal: { who: 'What\'s {t}\'s name?', what: 'What breed or kind is {t}?', when: 'When did you get {t}?', where: 'Where did {t} come from?', why: 'What\'s your favorite thing about {t}?', how: 'How old is {t}?' },
    person: { who: 'Who is {t} to you?', what: 'What do you like doing with {t}?', when: 'When did you last see {t}?', where: 'Where does {t} live?', why: 'What makes {t} special to you?', how: 'How did you meet {t}?' },
    place: { who: 'Who do you usually go to {t} with?', what: 'What do you like to do at {t}?', when: 'When were you last at {t}?', where: 'Where is {t}, roughly?', why: 'What do you like about {t}?', how: 'How do you get to {t}?' },
    feelbad: { why: 'What\'s making you feel {t}?', when: 'When did it start?', where: 'Where were you when it hit: home, work, somewhere else?', who: 'Is anyone else part of it?', what: 'What would help most right now?', how: 'What usually helps when you feel {t}?' },
    feelgood: { why: 'What\'s making you feel {t}?', when: 'When did it start?', where: 'Where are you right now?', who: 'Who would you like to share it with?', what: 'What was the best part?', how: 'How can we get more days like this?' }
  };
  var EV = { // something that happened (or will)
    past: { who: 'Who was with you?', what: 'What was the best part?', when: 'When was that?', where: 'Where was that?', why: 'What made you want to?', how: 'How did it go?' },
    future: { who: 'Who\'s going with you?', what: 'What are you most looking forward to?', when: 'When is it happening?', where: 'Where will it be?', why: 'What\'s the occasion?', how: 'How are you getting ready?' }
  };
  var STATES = { // "I'm hungry" -> the Food page, asked in the moment
    hungry: { key: 'food', title: 'Food', kind: 'food', group: 'food', t: 'food', first: 'what', order: ['what', 'where', 'who', 'how', 'when', 'why'], qo: { what: 'What are you hungry for?', where: 'Are you eating in or going out?', who: 'Who are you eating with?', when: 'When did you last eat?', why: 'Craving anything special?', how: 'Are you making it yourself?' } },
    thirsty: { key: 'drinks', title: 'Drinks', kind: 'drink', group: 'food', t: 'drinks', first: 'what', order: ['what', 'how', 'where', 'who', 'when', 'why'], qo: { what: 'What are you in the mood to drink?', where: 'Where are you getting it?', who: 'Anyone joining you?', when: 'When did you last have some water?', why: 'Hot day?', how: 'Hot or cold?' } },
    bored: { key: 'feel-bored', title: 'Feeling bored', kind: 'feeling', group: 'feelbad', t: 'bored', first: 'what', order: ['what', 'why', 'how', 'who', 'where', 'when'], qo: { what: 'What sounds fun right now?', why: 'What\'s making it boring?', how: 'What usually gets you out of a rut?' } }
  };
  STATES.starving = STATES.famished = STATES.hungry;
  var GROUP = { vehicle: 'vehicle', device: 'thing', tool: 'thing', clothes: 'thing', toy: 'thing', instrument: 'thing', furniture: 'thing', container: 'thing', thing: 'thing', stuff: 'thing', book: 'thing', plant: 'thing', other: 'thing',
    food: 'food', dish: 'food', drink: 'food', fruit: 'food', veg: 'food', sweet: 'food',
    activity: 'activity', hobby: 'activity', sport: 'activity', game: 'activity', music: 'activity', show: 'activity',
    pet: 'animal', animal: 'animal', person: 'person', family: 'person', friend: 'person', job: 'person',
    place: 'place', city: 'place', country: 'place', region: 'place', building: 'place', room: 'place', nature: 'place' };
  var GENERIC = /^(day|days|today|time|times|thing|things|stuff|lot|lots|bit|way|ways|morning|night|week|weekend|life|kind|sort|one|ones|something|anything|everything|nothing|people|person|guy|guys|everyone|someone|place|places|year|years|minute|hour|while|idea|fun|job|work|home|house|type|kinds|weather|sky|sun|rain|snow|wind|storm|cloud|clouds|sunset|sunrise|temperature|heat|cold|news)$/;
  var DULLV = /^(going|doing|being|having|getting|thinking|feeling|trying|making|saying|looking|wanting|needing|coming|taking|telling|asking|talking|starting|working|nothing|something|anything|everything|morning|evening|during|thing|king|ring|string|spring|wedding|building|meeting|ceiling|sibling|during|awning)$/;
  var PLACEW = /^(lake|river|beach|park|store|shop|mall|gym|church|school|work|office|farm|cabin|camp|trail|mountain|mountains|woods|forest|pool|restaurant|cafe|bar|library|museum|zoo|city|town|house|home|garage|backyard|yard|garden|creek|pond|ocean|coast|island|downtown|market|stadium|field|range|club)s?$/;
  var WHOW = /\b(brother|sister|mom|mother|dad|father|wife|husband|girlfriend|boyfriend|partner|son|daughter|kids?|children|cousin|uncle|aunt|grandma|grandpa|friends?|buddy|buddies|neighbou?r|boss|coworkers?|family|team|dog|cat|roommate|crew)\b/;

  function singular(w) {
    w = lc(w);
    if (w.length < 4 || /(ss|us|is|ics)$/.test(w)) return w;
    if (/ies$/.test(w)) return w.slice(0, -3) + 'y';
    if (/(ch|sh|x|z)es$/.test(w)) return w.slice(0, -2);
    if (/[^aeiou]ves$/.test(w)) return w.slice(0, -3) + 'f';
    if (/s$/.test(w) && !/ss$/.test(w)) return w.slice(0, -1);
    return w;
  }
  T.singular = singular;
  function gerund(v) {
    v = lc(v);
    if (/ing$/.test(v)) return v;
    if (/ie$/.test(v)) return v.slice(0, -2) + 'ying';
    if (/[^aeiou]e$/.test(v) && !/(ee|ye|oe)$/.test(v)) return v.slice(0, -1) + 'ing';
    if (/^[^aeiou]*[aeiou][^aeiouwxy]$/.test(v)) return v + v.slice(-1) + 'ing';
    return v + 'ing';
  }
  function keyOf(phrase) {
    var ws = lc(phrase).replace(/[^a-z0-9' -]+/g, '').split(/\s+/).filter(Boolean);
    return ws.map(function (w, i) { return i === ws.length - 1 ? singular(w) : w; }).join('-').replace(/'/g, '').slice(0, 40);
  }
  T.keyOf = keyOf;
  function norm(s) { return lc(s).replace(/[’]/g, "'").replace(/\bi'?m\b/g, 'i am').replace(/\bwe'?re\b/g, 'we are').replace(/\bi'?ve\b/g, 'i have'); }
  function kindOfPhrase(phrase) {
    var D = Dict(); if (!D) return '';
    var toks = D.read(phrase).filter(function (t) { return !t.fn && !t.num; }), head = toks[toks.length - 1];
    if (!head) return '';
    var k = (head.kinds || []).filter(function (x) { return /^n\./.test(x); })[0];
    if (!k && head.p === 'v' && /ing$/.test(lc(head.raw))) return 'activity';
    return k ? k.slice(2) : '';
  }

  /* ---------- finding the topic in what you said ---------- */
  var LIKE_RE = /^(?:(?:and|but|also|so|oh|well|honestly|yeah|man|dude|hey)[, ]+)?(i|we)\s+(?:(?:really|also|just|kinda|kind of|totally|do|still|absolutely|actually|so|sure|definitely|truly)\s+)*(like|love|enjoy|adore|prefer|miss|hate|dislike|can'?t stand|am into|are into|am obsessed with|are obsessed with|am (?:a )?(?:big |huge )?fan of|are (?:big |huge )?fans of)\s+(.+)$/;
  T.LIKE_RE = LIKE_RE;
  var GOALTO = /^to (learn|start|become|be|build|buy|own|move|get|find|try|make|have|go back|visit|travel|see|meet|quit|stop|lose|save|finish)\b/;
  var PRON = /^(you|u|it|that|this|them|him|her|those|these|me|myself|everything|everyone|when|how|what|it all)\b/;
  function stanceOf(verb) { return /hate|dislike|stand/.test(verb) ? 'dislikes' : /love|adore|obsessed/.test(verb) ? 'loves' : 'likes'; }
  function cutClause(s) { return s.split(/[.,!?;:]|\s+(?:because|since|but|so|when|and then|though|although|cause|cuz|if|except|especially|like when)\s+/)[0].trim(); }

  // Returns a topic {key, title, kind, group, t, mode, tense, stance, preset, first, qo} or null.
  T.detect = function (raw, S, opts) {
    opts = opts || {};
    var s = norm(Wd.clean(raw)).replace(/[!?.]+$/, ''), m = LIKE_RE.exec(s);
    if (m) return fromLike(m, raw, S);
    var fe = T.feeling(raw); if (fe) return fe;
    return fromTokens(raw, S, opts);
  };
  function fromLike(m, raw, S) {
    var stance = stanceOf(m[2]), obj = cutClause(m[3]);
    if (!obj || PRON.test(obj) || GOALTO.test(obj)) return null;
    obj = obj.split(/\s+and\s+|\s+or\s+|\s*&\s*/)[0].trim();
    var mine = /^(my|our)\s+/.test(obj), t, kind, group;
    obj = obj.replace(/^(the|a|an|some|all|most|my|our|those|these|that|this|any|every|good|great|old|new)\s+/g, '').replace(/^(the|a|an|good|great|old|new)\s+/, '');
    var ws = obj.split(/\s+/);
    if (ws[0] === 'to' && ws[1]) { t = gerund(ws[1]); kind = 'activity'; group = 'activity'; } // "I like to fish" -> fishing
    else if (/ing$/.test(ws[0]) && ws[0].length > 4 && !DULLV.test(ws[0])) {
      var rest = ws.slice(1).join(' ').replace(/^(to|at|in|on|with|the|a|an|my|some)\s+/g, '').replace(/^(the|a|an)\s+/, '');
      var rk = rest && rest.split(' ').length <= 3 ? kindOfPhrase(rest) : '';
      if (/^go/.test(ws[0]) && rest) { t = rest; kind = rk || 'place'; group = GROUP[kind] || 'place'; } // "going to the beach"
      else if (rk && GROUP[rk] && GROUP[rk] !== 'person' && rk !== 'other') { t = rest; kind = rk; group = GROUP[rk]; } // "playing video games" -> video games
      else { t = ws[0]; kind = 'activity'; group = 'activity'; } // "knitting", "fishing"
    } else {
      t = ws.slice(0, 3).join(' ');
      kind = kindOfPhrase(t) || 'thing'; group = GROUP[kind] || 'thing';
      if (group === 'person' && !mine) group = 'thing';
    }
    t = t.replace(/[^a-z0-9' -]+/gi, '').trim();
    if (!t || GENERIC.test(t)) return null;
    var tp = { key: keyOf(t), title: cap(t), kind: kind, group: group, t: t, mode: 'fact', stance: stance, preset: {} };
    if (mine) mineify(tp, t);
    return withEntity(tp, S);
  }
  function mineify(tp, t) {
    tp.title = 'My ' + t; tp.key = 'my-' + keyOf(t); tp.t = 'your ' + t;
    if (tp.group === 'animal') tp.group = 'myanimal';
    else if (tp.group === 'thing' || tp.group === 'vehicle') tp.group = 'mything';
    else if (tp.group === 'person') tp.t = 'your ' + t;
  }
  // A pet or person you've told Aiu about gets their own page by name.
  function withEntity(tp, S) {
    var ents = (S && S.entities) || {}, bare = lc(tp.t.replace(/^your /, '')), e = ents[bare];
    if (!e && /^your /.test(tp.t)) Object.keys(ents).forEach(function (k) { var x = ents[k]; if (!e && x.kind === 'pet' && !x.hidden && singular(x.species || '') === singular(bare)) e = x; }); // "my hamster" = Biscuit
    if (e && (e.kind === 'pet' || e.kind === 'person')) {
      tp.key = 'ent-' + keyOf(e.name); tp.title = e.name; tp.t = e.name; tp.group = e.kind === 'pet' ? 'myanimal' : 'person';
      if (e.kind === 'pet') tp.qo = { who: 'Who takes care of ' + e.name + ' most?' };
    }
    return tp;
  }
  var FEELW = /\b(?:i am|i feel|feeling|i felt|i have been|i was|i got|getting)\s+(?:(?:so|really|kinda|kind of|a little|a bit|super|very|pretty|totally|just|extra|too)\s+)*([a-z]+)\b/;
  var FEELGOOD = /^(happy|glad|excited|proud|grateful|thankful|great|awesome|amazing|relaxed|calm|hopeful|pumped|stoked|content|blessed|confident|motivated|inspired|refreshed|energized|joyful|cheerful|peaceful|productive|good)$/;
  var NOTFEEL = /^(fine|ok|okay|not|going|gonna|here|home|back|done|busy|sure|sorry|about|at|in|on|up|out|off|with|trying|getting|working|looking|thinking|a|an|the|able|in|ready|almost|still|now|also|just|good|well|alright|better|worse)$/;
  T.feeling = function (raw) {
    var s = norm(Wd.clean(raw)), m = FEELW.exec(s); if (!m) return null;
    var w = m[1];
    if (STATES[w]) { var st = STATES[w]; return { key: st.key, title: st.title, kind: st.kind, group: st.group, t: st.t, mode: st.key === 'feel-bored' ? 'feel' : 'log', tense: 'now', preset: {}, first: st.first, qo: st.qo, order: st.order, state: w, factW: st.key === 'feel-bored' ? { how: 1 } : null }; }
    if (NOTFEEL.test(w)) return null;
    var D = Dict(), feelish = FEELGOOD.test(w) || /^(tired|sad|mad|angry|upset|stressed|anxious|nervous|worried|scared|lonely|down|sick|exhausted|frustrated|annoyed|grumpy|overwhelmed|bummed|jealous|embarrassed|hurt|cranky|sleepy|drained|restless|sore|homesick|confused|lost)$/.test(w) ||
      (D && (D.kindsOf(w) || []).indexOf('a.feel') >= 0);
    if (!feelish) return null;
    var good = FEELGOOD.test(w);
    return { key: 'feel-' + keyOf(w), title: 'Feeling ' + w, kind: 'feeling', group: good ? 'feelgood' : 'feelbad', t: w, mode: 'feel', tense: 'now', preset: {}, first: good ? 'why' : 'why', factW: { how: 1 }, good: good };
  };
  var PAST_RE = /\b(went|did|was|were|had|got|made|saw|ate|played|caught|visited|watched|yesterday|last (night|week|weekend|month|year)|earlier|this (morning|afternoon)|just got back|came back|finally)\b/;
  var FUT_RE = /\b(tomorrow|tonight|later today|going to|gonna|will|this weekend|next (week|weekend|month)|planning to|about to|can'?t wait)\b/;
  var WHEN_RE = /\b(today|yesterday|tonight|tomorrow|this (?:morning|afternoon|evening|weekend)|last (?:night|week|weekend|month)|next (?:week|weekend|month)|(?:on |this |next |last )?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|(?:at|around) \d{1,2}(?::\d\d)? ?(?:am|pm)?)\b/;
  var WHO_RE = /\bwith (my |our |a |the |some )?((?:[a-z'-]+ ){0,2}?[a-z'-]+)(?=\s+(?:at|in|on|to|for|this|last|next|today|yesterday|tomorrow|tonight|and|but|because|after|before)\b|[.!?,;]|$)/i;
  var WHERE_RE = /\b(at|to|in|near|by|on) (the |my |our |a )?((?:[a-z'-]+ ){0,2}?[a-z'-]+)(?=\s+(?:with|at|on|for|this|last|next|today|yesterday|tomorrow|tonight|and|but|because|after|before)\b|[.!?,;]|$)/i;
  function presets(raw) {
    var s = Wd.clean(raw), l = lc(s), out = {}, m;
    if ((m = WHEN_RE.exec(l))) out.when = m[1];
    if ((m = WHO_RE.exec(s)) && (WHOW.test(lc(m[2])) || /^[A-Z]/.test(m[2]))) out.who = lc(m[1] || '') + m[2];
    var re = new RegExp(WHERE_RE.source, 'gi');
    while ((m = re.exec(s))) {
      var ph = m[3], head = lc(ph.split(' ').pop()), D = Dict(), k = D ? (D.kindsOf(head) || []) : [];
      if (WHEN_RE.test(lc(ph)) || /^(morning|afternoon|evening|night|time|minute|hour|while|way|end|middle|mood|fact)$/.test(head)) continue;
      if (PLACEW.test(head) || /^[A-Z]/.test(ph) || k.some(function (x) { return /^n\.(place|city|country|region|building|room|nature)$/.test(x); })) { out.where = lc(m[1]) + ' ' + (m[2] || '') + ph; out.where = out.where.replace(/\s+/g, ' ').replace(/^(at|in|on|by|near|to) /, function (p) { return p === 'to ' ? '' : p; }).trim(); break; }
    }
    return out;
  }
  function fromTokens(raw, S, opts) {
    var D = Dict(); if (!D) return null;
    var toks = D.read(raw), best = null, bestSc = 0, l = lc(raw);
    toks.forEach(function (t, i) {
      if (t.fn || t.num) return;
      var r = lc(t.raw), sc = 0, kind = '', group = '', mine = false;
      var prev = toks[i - 1]; if (prev && /^(my|our)$/.test(lc(prev.raw))) mine = true;
      var ent = S && S.entities && S.entities[r];
      if (ent && (ent.kind === 'pet' || ent.kind === 'person')) { kind = ent.kind; group = ent.kind === 'pet' ? 'myanimal' : 'person'; sc = 4; }
      else if (t.p === 'v' && /ing$/.test(r) && r.length > 4 && !DULLV.test(r) && (t.kinds || []).indexOf('v.act') >= 0) { kind = 'activity'; group = 'activity'; sc = 5; }
      else if (prev && /^(it|he|she|they|that|this|who|which|everything|something)$/.test(lc(prev.raw)) && (t.kinds || []).indexOf('v.act') >= 0) return; // "it looks nice": a verb here
      else {
        var k0 = ((t.kinds || []).filter(function (x) { return /^n\./.test(x); })[0] || '').slice(2);
        if (!k0 || t.p !== 'n' || GENERIC.test(r) || GENERIC.test(t.base)) return;
        group = GROUP[k0]; kind = k0;
        if (!group) return;
        if (group === 'person' && WHO_RE.test(raw) && !mine) return; // "with my brother" is who, not what
        sc = k0 === 'other' ? 1 : group === 'activity' ? 5 : group === 'person' ? (mine ? 4.5 : 2) : group === 'place' ? 3 : 4;
        if (t.phrase) sc += 1;
      }
      if (sc > bestSc) { bestSc = sc; best = { t: (t.phrase ? lc(t.raw) : r), kind: kind, group: group, mine: mine }; }
    });
    if (!best) return null;
    var tp = { key: keyOf(best.t), title: cap(best.t), kind: best.kind, group: best.group, t: best.t, mode: 'fact', preset: {} };
    if (best.mine) mineify(tp, best.t);
    tp = withEntity(tp, S);
    var past = opts.intent === 'happened' || PAST_RE.test(l), fut = FUT_RE.test(l);
    if (past || fut) {
      tp.mode = 'log'; tp.tense = fut && !past ? 'future' : 'past';
      tp.preset = presets(raw);
      if (tp.group === 'place' && tp.preset.where && tp.preset.where.indexOf(best.t) >= 0) delete tp.preset.where;
    }
    return tp;
  }

  /* ---------- the conversation ---------- */
  function ev(pd, extra) {
    return { type: 'topic', data: Object.assign({ key: pd.key, title: pd.title, kind: pd.kind, group: pd.group }, pd.mode === 'log' || (pd.mode === 'feel' && extra.w && !(pd.factW && pd.factW[extra.w])) ? { mode: 'log', sid: pd.sid, tense: pd.tense || 'past' } : {}, extra) };
  }
  T.question = function (pd, w) {
    var q = pd.qo && pd.qo[w];
    if (!q && pd.mode === 'log' && !(pd.factW && pd.factW[w])) q = EV[pd.tense === 'future' ? 'future' : 'past'][w];
    if (!q) q = (QSETS[pd.group] || QSETS.thing)[w] || QSETS.thing[w];
    return q.replace(/\{t\}/g, pd.t).replace(/\{T\}/g, cap(pd.t));
  };
  T.opening = function (tp, ctx) {
    var S = ctx.S, st = P.style(S), seed = tp.key + (ctx.today || ''), ex = st.i ? '.' : '!';
    if (tp.state) return '';
    if (tp.mode === 'feel') {
      if (tp.good) return pick(seed, ['Yay, ' + tp.t + ex, 'Love that you\'re feeling ' + tp.t + ex, 'That\'s great' + ex]);
      return pick(seed, ['Aw, sorry you\'re feeling ' + tp.t + '.', 'I hear you.', 'That\'s no fun. I\'m here.']);
    }
    if (tp.mode === 'log') {
      var p = tp.preset || {}, bits = cap(tp.t) + (p.who ? ' with ' + you(p.who) : '') + (p.where ? ' ' + (/^(at|in|on|by|near) /.test(p.where) ? '' : /^[A-Z]/.test(p.where) ? 'in ' : 'at ') + you(p.where) : '') + (p.when ? ' ' + p.when : '');
      return tp.tense === 'future' ? bits + '? Sounds fun' + ex : bits + ', nice' + ex;
    }
    if (tp.stance === 'dislikes') return 'Not a fan of ' + tp.t + ', got it.';
    if (/^(mything|myanimal)$/.test(tp.group)) return cap(tp.t) + ex;
    var known = Object.keys(C.topicFacts(S, tp.key)).length;
    if (known) return pick(seed, [cap(tp.t) + ex + ' I have a page on that, so let me make sure it\'s up to date.', 'Oh, ' + tp.t + ex + ' Let me check your page is still right.']);
    return st.f ? pick(seed, ['Ooh, ' + tp.t + ex, cap(tp.t) + '? I love that.', cap(tp.t) + ', nice' + ex]) : st.t ? pick(seed, [cap(tp.t) + '. Noted.', cap(tp.t) + ', got it.']) : pick(seed, [cap(tp.t) + ', nice' + ex, 'Ooh, ' + tp.t + ex, cap(tp.t) + '? Cool' + ex]);
  };
  // Start asking about a topic. opts: {lead, askFeel}
  T.start = function (tp, ctx, res, opts) {
    opts = opts || {};
    var S = ctx.S, pd = { key: tp.key, title: tp.title, kind: tp.kind, group: tp.group, t: tp.t, mode: tp.mode || 'fact', tense: tp.tense || '', sid: U.id(), saved: 0, qo: tp.qo || null, factW: tp.factW || null, w: null };
    var pre = tp.preset || {};
    Object.keys(pre).forEach(function (w) { res.events.push(ev(pd, { w: w, a: pre[w], q: '(you said)' })); pd.saved++; });
    if (tp.stance) res.events.push(ev(pd, { w: 'feel', feel: tp.stance }));
    var order = tp.order ? tp.order.slice() : P.order(S, ctx.dayMode);
    if (tp.first && !tp.order) { order.splice(order.indexOf(tp.first), 1); order.unshift(tp.first); }
    var queue = order.filter(function (w) { return !pre[w]; });
    if (tp.stance === 'dislikes') { queue = ['why']; pd.qo = Object.assign({}, pd.qo, { why: 'What don\'t you like about {t}?' }); }
    if (tp.mode === 'feel' && !tp.good && !tp.state) queue = ['why', 'how'].concat(queue.filter(function (w) { return w !== 'why' && w !== 'how'; })); // the reason, then what helps
    if (opts.askFeel) queue.unshift('feel');
    // 1.1.0: how many follow-up questions (Settings > Voice & listening). "ask me about..." always goes through them all.
    if (!opts.full) { var lim = ctx.followups === 'many' ? 9 : ctx.followups === 'off' ? 0 : 1; queue = queue.slice(0, lim); }
    pd.queue = queue;
    return T.next(res, pd, ctx, opts.lead !== undefined ? opts.lead : T.opening(tp, ctx));
  };
  T.next = function (res, pd, ctx, lead) {
    var S = ctx.S, w = pd.queue.shift();
    if (!w) return T.finish(res, pd, ctx, lead);
    var facts = C.topicFacts(S, pd.key), known = null, q;
    if (w === 'feel') q = 'Do you like ' + pd.t + '?';
    else {
      q = T.question(pd, w);
      var f = facts[w], isFact = pd.mode === 'fact' || (pd.factW && pd.factW[w]);
      if (f && (isFact || w === 'who' || w === 'where')) known = f;
    }
    pd.w = w; pd.q = q; pd.confirm = !!known; pd.old = known ? known.a : null; pd.fix = false; pd.at = ctx.now || Date.now();
    var line = q;
    if (known) {
      var isFact2 = pd.mode === 'fact' || (pd.factW && pd.factW[w]), when = U.dayStr(new Date(known.checked)), ago = when !== ctx.today ? ' (' + U.fmtDay(when) + ')' : '';
      line = isFact2 ? q + ' Last time' + ago + ' you said "' + you(known.a) + '". Still true?' : q + ' "' + cap(you(known.a)) + '" again?';
    }
    res.pending = { type: 'topic_q', data: pd };
    res.say.push((lead ? lead + ' ' : '') + line);
    return true;
  };
  var NEWSV = /^(the|my|our|a|an|this|someone|somebody|there)\b(?:\s+[\w'-]+){0,4}?\s+(is|are|was|were|has|have|had|needs?|broke|keeps?|kept|won'?t|can'?t|isn'?t|aren'?t|wasn'?t|just|finally|started|stopped|came|left|called|died|leaks?|leaking)\b/;
  var STOP_RE = /^(that'?s (it|all|enough)|that is (it|all|enough)|stop|enough|done|i'?m done|all done|no more( questions)?|never ?mind|nevermind|let'?s talk about something else|change the subject|something else|moving on|forget it|we'?re done|end|quit)\b/;
  var SKIP_RE = /^(skip|pass|next|i don'?t know|idk|dunno|no idea|not sure|i'?m not sure|can'?t remember|i forget|don'?t remember|no clue)\b/;
  T.STOP_RE = STOP_RE;
  function feelOf(s) {
    if (/\b(not really|no|nope|nah|hate|can'?t stand|dislike|not a fan|not at all|ew|yuck)\b/.test(s)) return 'dislikes';
    if (/\b(love|adore|obsessed|absolutely|big time|heck yes|hell yes)\b/.test(s)) return 'loves';
    if (/\b(kinda|kind of|sort of|it'?s (ok|okay|fine|alright)|meh|sometimes|a little)\b/.test(s)) return 'it\'s okay';
    if (/\b(yes|yeah|yep|yup|sure|like|of course|definitely|i do)\b/.test(s)) return 'likes';
    return null;
  }
  // Your answer to one of Aiu's topic questions. Returns true when handled.
  T.answer = function (text, ctx, res, pd) {
    var S = ctx.S, raw = Wd.clean(text), s = lc(raw).replace(/[’]/g, "'").trim(), nw = s.split(/\s+/).length;
    if (!raw) return false;
    if (STOP_RE.test(s) && nw <= 6) return T.finish(res, pd, ctx, P.ack(S, raw));
    var ls = norm(raw).replace(/[!?.]+$/, '');
    // a new story ("Today Marisol came over...", "Guess what...") rather than an answer: let Aiu hear it fresh
    if (!pd.confirm && nw >= 6 && /^(today|yesterday|this morning|this afternoon|tonight|last night|guess what|oh and|also|anyway|by the way|btw|so today|we just|i just|oh hey|hey)\b/.test(s) &&
      !pd.key.split('-').some(function (w) { return w.length > 2 && s.indexOf(w) >= 0; })) return false;
    if (LIKE_RE.test(ls) && pd.w !== 'feel') { // "I also love trucks" -> save this page, start that one
      var nt = T.detect(raw, S);
      if (nt && nt.key !== pd.key) { var tmp = { say: [] }; T.finish(tmp, pd, ctx, ''); res.say.push(tmp.say.join(' ')); var sub = { say: [], events: res.events, pending: null }; T.start(nt, ctx, sub); res.say.push(sub.say.join(' ')); res.pending = sub.pending; return true; }
    }
    // unsure if it's an answer or something new ("the faucet is dripping")? Ask, 21 Questions style.
    var mentions = pd.key.split('-').some(function (w) { return w.length > 2 && s.indexOf(singular(w)) >= 0; });
    if (!pd.sure && !pd.confirm && pd.w !== 'feel' && nw >= 4 && !mentions && NEWSV.test(s) && !(pd.w === 'who' && /^(my|our)\s/.test(s))) {
      res.pending = { type: 'topic_new', data: { pd: pd, text: raw } };
      res.say.push('Is that about ' + pd.t + ', or something new?');
      return true;
    }
    pd.sure = false;
    if (pd.w === 'feel') {
      var fv = feelOf(s) || (nw <= 4 ? 'likes' : null);
      if (!fv) { res.pending = { type: 'topic_q', data: pd }; res.say.push('So, do you like ' + pd.t + '? Yes, no, or kind of?'); return true; }
      res.events.push(ev(pd, { w: 'feel', feel: fv }));
      if (fv === 'dislikes') { pd.queue = ['why']; pd.qo = Object.assign({}, pd.qo, { why: 'What don\'t you like about {t}?' }); return T.next(res, pd, ctx, 'Fair enough.'); }
      return T.next(res, pd, ctx, fv === 'loves' ? 'Me too, then!' : P.ack(S, raw));
    }
    var ans = raw.replace(/[.!]+$/, '').trim(), lead;
    if (pd.confirm) {
      if (isYes(s) && nw <= 6 && !/\b(but|now|changed|actually|except)\b/.test(s)) {
        res.events.push(ev(pd, { w: pd.w, a: pd.old, confirm: true }));
        pd.saved++;
        return T.next(res, pd, ctx, pick(raw + pd.w, ['Still "' + you(pd.old) + '". Checked.', 'Good, still up to date.', 'Great, still "' + you(pd.old) + '".']));
      }
      if (isNo(s) && nw <= 3) { pd.confirm = false; pd.fix = true; res.pending = { type: 'topic_q', data: pd }; res.say.push('Okay! What is it now?'); return true; }
      ans = ans.replace(/^(no|nope|nah|not anymore|not really|actually|it changed|changed|now)[,.!: -]+/i, '').replace(/^(it'?s|its) now\s+/i, '').trim();
      if (!ans) { pd.confirm = false; pd.fix = true; res.pending = { type: 'topic_q', data: pd }; res.say.push('What is it now?'); return true; }
      pd.fix = true;
    }
    if (SKIP_RE.test(s) && nw <= 6) return T.next(res, pd, ctx, pick(raw + pd.w, ['No problem.', 'That\'s okay.', 'All good.']));
    ans = ans.slice(0, 300);
    // on rails: an answer that's really a to-do or a goal goes to the scrum master (then Aiu asks its question again)
    var B = AIU.butler, dec = B && Dict() && !pd.fix ? B.decide(ans, S, false) : null;
    var food = !pd.fix && AIU.mind && AIU.mind.foodItems ? AIU.mind.foodItems(ans) : [];
    if (food.length && /\b(out of|ran out|run out|low on|need|buy|pick up|grab)\b/.test(s)) {
      pd.queue.unshift(pd.w);
      res.pending = { type: 'b_offer', data: { intent: 'todo', text: ans, items: food, resume: pd } };
      res.say.push('Want me to add ' + (food.length > 1 ? food.slice(0, -1).join(', ') + ' and ' + food[food.length - 1] : food[0]) + ' to your shopping list?');
      return true;
    }
    if (dec && dec.mode === 'offer' && (dec.intent === 'todo' || dec.intent === 'goal')) {
      var title = dec.intent === 'todo' && AIU.mind ? AIU.mind.todoTitle(ans) : null;
      pd.queue.unshift(pd.w);
      res.pending = { type: 'b_offer', data: { intent: dec.intent, text: ans, title: title, resume: pd } };
      res.say.push(dec.intent === 'todo' ? 'That sounds like a to-do. Add "' + title + '" to your to-do list?' : 'That sounds like a goal! Want me to make it a quest?');
      return true;
    }
    res.events.push(ev(pd, { w: pd.w, a: ans, q: pd.q }));
    pd.saved++;
    var echo = ans.split(/\s+/).length <= 8 ? cap(short(you(ans))) + '. ' : '';
    lead = pd.fix ? 'Updated: ' + short(you(ans)) + '.' : echo + P.ack(S, raw);
    return T.next(res, pd, ctx, lead);
  };
  // A quest that shares words with the topic (to keep things on the rails).
  T.linkedQuest = function (S, pd) {
    var tw = pd.key.split('-').filter(function (w) { return w.length > 2 && !GENERIC.test(w) && w !== 'feel' && w !== 'ent'; });
    if (!tw.length) return null;
    return C.questList(S, 'active').filter(function (q) {
      var qw = Wd.tokens(q.title + ' ' + (q.subject || '')).map(function (t) { return singular(t.norm); });
      return tw.some(function (w) { return qw.indexOf(w) >= 0; });
    })[0] || null;
  };
  T.finish = function (res, pd, ctx, lead) {
    var S = ctx.S, bits = [];
    if (pd.saved) bits.push(pick(pd.sid, ['It\'s all on your "' + pd.title + '" page in the Library.', 'Saved to your "' + pd.title + '" page in the Library.', 'Your "' + pd.title + '" page in the Library is up to date.']));
    else bits.push((lead ? '' : 'Okay! ') + (pd.mode === 'feel' ? 'I\'m here if you want to talk.' : 'We can talk about ' + pd.t + ' any time.'));
    var q = T.linkedQuest(S, pd);
    if (q) { var ns = C.nextStep(S, q); bits.push('This ties into your quest "' + q.title + '"' + (ns ? ': the next step is ' + lc(ns.title) + '.' : '.')); }
    res.say.push((lead ? lead + ' ' : '') + bits.join(' '));
    res.pending = null;
    return true;
  };
  // Pick up a topic again after the butler handled something ("add it to your to-do list?").
  T.resume = function (res, pd, ctx, lead) { return T.next(res, pd, ctx, (lead ? lead + ' ' : '') + 'Back to ' + pd.t + ':'); };

  // "Do you like cars?" / "What's your favorite food?" - Aiu's tastes come from yours.
  T.mirror = function (phrase, how, ctx, res) {
    var S = ctx.S, tp = T.detect('i like ' + phrase, S);
    if (!tp) return false;
    var rec = (S.topics || {})[tp.key], facts = C.topicFacts(S, tp.key), feel = rec && rec.feel ? rec.feel.v : null;
    tp.stance = null;
    if (how === 'fav') {
      if (facts.what) { res.say.push('Same as yours: ' + you(facts.what.a) + '! I picked that up from you.'); return true; }
      tp.first = 'what'; tp.qo = Object.assign({}, tp.qo, { what: 'What\'s your favorite ' + lc(phrase) + '?' });
      return T.start(tp, ctx, res, { lead: 'I don\'t have a favorite yet. My tastes come from you.' });
    }
    if (feel === 'dislikes') { res.say.push('Not really. Same as you!'); return true; }
    if (feel) return T.start(tp, ctx, res, { lead: pick(tp.key, ['I do! I got into ' + tp.t + ' because of you.', 'I sure do. You got me into ' + tp.t + '.']) });
    return T.start(tp, ctx, res, { lead: 'I don\'t know yet. I learn my tastes from you.', askFeel: true });
  };
  // One line about a topic page (for "what do you know about cars?").
  T.summary = function (S, key) {
    var rec = (S.topics || {})[key]; if (!rec) return '';
    var f = C.topicFacts(S, key), bits = [];
    if (rec.feel) bits.push('you ' + (rec.feel.v === 'it\'s okay' ? 'think ' + lc(rec.title) + ' are okay' : rec.feel.v.replace(/s$/, '') + ' ' + lc(rec.title)));
    T.WS.forEach(function (w) { if (f[w]) bits.push(T.WLABEL[w].toLowerCase() + ': ' + you(f[w].a)); });
    var logs = C.topicLogs(S, key);
    if (logs.length) bits.push('last time ' + U.fmtDay(logs[0].day) + (logs[0].a.who ? ' with ' + you(logs[0].a.who.a) : '') + (logs[0].a.where ? ', ' + you(logs[0].a.where.a) : ''));
    return bits.length ? 'Your "' + rec.title + '" page: ' + bits.join('; ') + '.' : '';
  };
  T.find = function (S, words) {
    var k = keyOf(words), T0 = S.topics || {};
    if (T0[k]) return T0[k];
    if (T0['my-' + k]) return T0['my-' + k];
    if (T0['ent-' + k]) return T0['ent-' + k];
    var hit = null;
    Object.keys(T0).forEach(function (x) { if (!hit && (x.split('-').indexOf(singular(lc(words))) >= 0 || lc(T0[x].title) === lc(words))) hit = T0[x]; });
    return hit;
  };
})();
