/* AIU TOTEM - personality. Four sliders, 16 types, a quick 12-question quiz, and small nudges from how you talk.
   Your type becomes Aiu's type: it's how Aiu talks and which questions it asks first.
   The idea of four either/or preferences goes back to Carl Jung (1921). Everything here (the quiz, the type names
   and descriptions) is KODNA's own writing: it is not the MBTI(R) or the 16Personalities(R) test, and needs no license.
   Like a journal of the world, it evolves: quiz answers set the start, and everything you say keeps nudging it. */
(function () {
  'use strict';
  var P = AIU.persona = {};

  P.AXES = [
    { k: 'ei', a: 'E', b: 'I', name: 'Energy', aName: 'Outgoing', bName: 'Inward' },
    { k: 'sn', a: 'S', b: 'N', name: 'Info', aName: 'Facts', bName: 'Ideas' },
    { k: 'tf', a: 'T', b: 'F', name: 'Decisions', aName: 'Logic', bName: 'Heart' },
    { k: 'jp', a: 'J', b: 'P', name: 'Plans', aName: 'Planned', bName: 'Flexible' }
  ];

  // Our own names and one-line descriptions.
  P.TYPES = {
    ESTJ: ['Foreman', 'Organized and direct. Gets the crew moving and the job done.'],
    ESTP: ['Scout', 'Bold and hands-on. Lives in the moment and learns by doing.'],
    ESFJ: ['Host', 'Warm and loyal. Makes sure everyone is cared for.'],
    ESFP: ['Spotlight', 'Fun and lively. Brings the energy wherever they go.'],
    ENTJ: ['Captain', 'Decisive and strategic. Sets a course and steers the ship.'],
    ENTP: ['Sparkplug', 'Quick and curious. Loves a new idea and a good debate.'],
    ENFJ: ['Guide', 'Inspiring and caring. Brings out the best in people.'],
    ENFP: ['Firefly', 'Enthusiastic and imaginative. Lights up what could be.'],
    ISTJ: ['Keystone', 'Reliable and careful. Holds everything together.'],
    ISTP: ['Mechanic', 'Calm and practical. Figures out how things work.'],
    ISFJ: ['Hearth', 'Kind and steady. Quietly takes care of people.'],
    ISFP: ['Gardener', 'Gentle and creative. Lives by their own values.'],
    INTJ: ['Navigator', 'Independent planner with a long-range map.'],
    INTP: ['Tinkerer', 'Thoughtful and logical. Loves taking ideas apart.'],
    INFJ: ['Lighthouse', 'Insightful and idealistic. Guides from the quiet.'],
    INFP: ['Dreamer', 'Imaginative and caring. True to their inner compass.']
  };

  // The quick quiz: A is the first side of the slider, B the second.
  P.QUIZ = [
    { id: 'q1', ax: 'ei', q: 'After a long week, would you rather', a: 'go out with friends', b: 'have a quiet night in' },
    { id: 'q2', ax: 'ei', q: 'At a party, do you', a: 'meet lots of new people', b: 'stick with a few people you know' },
    { id: 'q3', ax: 'ei', q: 'When you\'re working something out, do you', a: 'talk it through with someone', b: 'think it over on your own' },
    { id: 'q4', ax: 'sn', q: 'Do you trust', a: 'what you can see and touch', b: 'your hunches and ideas' },
    { id: 'q5', ax: 'sn', q: 'Learning something new, do you want', a: 'clear steps first', b: 'the big picture first' },
    { id: 'q6', ax: 'sn', q: 'Do you like talking about', a: 'what\'s real and happening now', b: 'what could happen someday' },
    { id: 'q7', ax: 'tf', q: 'Making a hard choice, do you go with', a: 'logic', b: 'how it affects people' },
    { id: 'q8', ax: 'tf', q: 'When a friend is upset, do you first', a: 'help fix the problem', b: 'listen and comfort them' },
    { id: 'q9', ax: 'tf', q: 'Would you rather be known as', a: 'fair', b: 'kind' },
    { id: 'q10', ax: 'jp', q: 'Do you like your days', a: 'planned out', b: 'open to whatever comes up' },
    { id: 'q11', ax: 'jp', q: 'On a trip, do you', a: 'make a plan ahead of time', b: 'figure it out when you get there' },
    { id: 'q12', ax: 'jp', q: 'With a deadline, do you', a: 'finish early', b: 'do your best work at the last minute' }
  ];
  // 1.1.0: extra either/or questions Aiu asks in 21 Questions, on whichever side of your type is still close to 50/50
  P.EXTRA = [
    { id: 'x1', ax: 'ei', q: 'A free Saturday: would you rather', a: 'have people over', b: 'have the place to yourself' },
    { id: 'x2', ax: 'ei', q: 'After talking with people all day, do you feel', a: 'charged up', b: 'worn out' },
    { id: 'x3', ax: 'ei', q: 'In a group chat, are you usually', a: 'one of the first to reply', b: 'reading more than writing' },
    { id: 'x4', ax: 'sn', q: 'Fixing something, do you', a: 'follow the manual', b: 'figure it out your own way' },
    { id: 'x5', ax: 'sn', q: 'Do you notice', a: 'the details', b: 'the patterns' },
    { id: 'x6', ax: 'sn', q: 'Would you rather', a: 'perfect something that works', b: 'invent something new' },
    { id: 'x7', ax: 'tf', q: 'Giving feedback, are you', a: 'straight to the point', b: 'careful with feelings' },
    { id: 'x8', ax: 'tf', q: 'A good decision is one that is', a: 'correct', b: 'right for everyone involved' },
    { id: 'x9', ax: 'tf', q: 'In an argument, do you care more about', a: 'being right', b: 'keeping the peace' },
    { id: 'x10', ax: 'jp', q: 'Your workspace is usually', a: 'organized', b: 'creative chaos' },
    { id: 'x11', ax: 'jp', q: 'A to-do list for you is', a: 'a plan to follow', b: 'a list of ideas' },
    { id: 'x12', ax: 'jp', q: 'When plans change last minute, you feel', a: 'thrown off', b: 'fine, even excited' }
  ];
  P.allQuestions = function () { return P.QUIZ.concat(P.EXTRA); };
  // The next either/or worth asking: an unanswered one on the axis closest to 50/50
  P.nextExtra = function (S) {
    var quiz = ((S.traits || {}).quiz) || {}, pct = (S.ptype && S.ptype.pct) || {};
    var axes = P.AXES.map(function (ax) { return { k: ax.k, d: Math.abs((pct[ax.k] === undefined ? 50 : pct[ax.k]) - 50) }; }).sort(function (a, b) { return a.d - b.d; });
    for (var i = 0; i < axes.length; i++) { var q = P.allQuestions().filter(function (x) { return x.ax === axes[i].k && !quiz[x.id]; })[0]; if (q) return q; }
    return null;
  };
  P.quizQuestion = function (i) {
    var q = P.QUIZ[i]; if (!q) return '';
    return 'Question ' + (i + 1) + ' of ' + P.QUIZ.length + ': ' + q.q + ' (A) ' + q.a + ', or (B) ' + q.b + '?';
  };
  function words(s) { return String(s || '').toLowerCase().replace(/[^a-z' ]+/g, ' ').split(/\s+/).filter(function (w) { return w.length > 2 && !/^(the|and|you|your|with|what|for|out|but|are|off)$/.test(w); }); }
  // "A", "b", "the first one", "quiet night in", "both", "skip" -> 'a', 'b', 'skip' or null (not an answer)
  P.quizAnswer = function (text, i) {
    var s = String(text || '').toLowerCase().replace(/[’]/g, "'").replace(/[().!?,]/g, ' ').trim(), q = P.QUIZ[i];
    if (!q || !s) return null;
    s = s.replace(/^(um+|uh+|hmm+|oh|well|i'?d say|i guess|probably|definitely|i think)[, ]+/, '').trim();
    var A1 = /^(a|option a|answer a|letter a|1|one|first|the first|the first one|first one|former|the former|ay|eh)$/, B1 = /^(b|option b|answer b|letter b|be|bee|2|two|second|the second|the second one|second one|latter|the latter)$/;
    if (A1.test(s)) return 'a';
    if (B1.test(s)) return 'b';
    if (/^(both|either|neither|skip|pass|not sure|i don'?t know|dunno|depends|it depends|next)\b/.test(s)) return 'skip';
    var sw = words(s), hitA = 0, hitB = 0;
    words(q.a).forEach(function (w) { if (sw.indexOf(w) >= 0) hitA++; });
    words(q.b).forEach(function (w) { if (sw.indexOf(w) >= 0) hitB++; });
    if (hitA > hitB) return 'a';
    if (hitB > hitA) return 'b';
    if (/^(option |answer |letter )?a\b[ ,.]/.test(s + ' ') && s.split(' ').length <= 3) return 'a';
    if (/^(option |answer |letter )?b\b/.test(s)) return 'b';
    if (/^(the )?first\b/.test(s)) return 'a';
    if (/^(the )?second\b/.test(s)) return 'b';
    return null;
  };

  // Everyday cues that nudge the sliders a little (0.1 each; a quiz answer counts 1).
  var CUES = {
    ei: [/\b(party|parties|hung out|hanging out|hang out with|met up|meet up|friends over|went out with|crowd|social|group chat|called my|talked to (everyone|people))\b/,
      /\b(alone|by myself|quiet (night|day|time)|stayed (home|in)|stay (home|in)|recharge|me time|to myself|introvert|peace and quiet)\b/],
    sn: [/\b(details?|facts?|practical|step by step|hands[- ]on|exactly|measured|specs|the numbers|how it works|real world|checklist)\b/,
      /\b(ideas?|imagine|what if|someday|dream(ed|ing)?|theor(y|ies)|concepts?|possibilit(y|ies)|big picture|invent|vision|meaning of)\b/],
    tf: [/\b(logic(al)?|makes sense|efficient|analy[sz]e|pros and cons|objective|the facts|fix(ed)? it|rational|data)\b/,
      /\b(i feel|i felt|feelings|care about|cared|my heart|kind(ness)?|hurt (me|her|him|their)|empathy|compassion|values|meant a lot)\b/],
    jp: [/\b(plan(ned|ning)?|schedule[d]?|to-?do list|organized|deadline|on time|ahead of time|routine|checked off|early)\b/,
      /\b(spontaneous|last minute|winged it|wing it|go with the flow|whatever happens|improvi[sz]ed?|on a whim|procrastinat\w*|last-minute|no plan)\b/]
  };
  P.NUDGE = 0.1; P.NUDGE_CAP = 3;
  // Returns {ei: +0.1 / -0.1, ...} for one thing you said or wrote.
  P.cues = function (text) {
    var s = String(text || '').toLowerCase(), out = null;
    Object.keys(CUES).forEach(function (ax) {
      var a = CUES[ax][0].test(s), b = CUES[ax][1].test(s);
      if (a !== b) { out = out || {}; out[ax] = a ? P.NUDGE : -P.NUDGE; }
    });
    return out;
  };

  // Scores from the engine state: quiz answers (after the last retake) plus the nudges.
  P.compute = function (T) {
    T = T || {};
    var quiz = T.quiz || {}, nud = T.nudge || {}, reset = T.resetT || 0, sc = { ei: 0, sn: 0, tf: 0, jp: 0 }, n = 0, per = { ei: 0, sn: 0, tf: 0, jp: 0 };
    Object.keys(quiz).forEach(function (id) {
      var x = quiz[id], q = P.allQuestions().filter(function (y) { return y.id === id; })[0];
      if (!q || x.t < reset) return;
      n++; per[q.ax]++;
      sc[q.ax] += x.v;
    });
    Object.keys(sc).forEach(function (k) { sc[k] += Math.max(-P.NUDGE_CAP, Math.min(P.NUDGE_CAP, nud[k] || 0)); });
    var code = null;
    if (n >= P.QUIZ.length / 2) code = P.AXES.map(function (ax) { return sc[ax.k] > 0 ? ax.a : sc[ax.k] < 0 ? ax.b : (T.lastCode ? T.lastCode.charAt(P.AXES.indexOf(ax)) : ax.b); }).join('');
    var pct = {}; // how far toward the first side, 0-100
    P.AXES.forEach(function (ax) { pct[ax.k] = Math.round(50 + 50 * Math.max(-1, Math.min(1, sc[ax.k] / 4))); });
    return { code: code, answered: n, scores: sc, pct: pct, name: code ? P.TYPES[code][0] : null, desc: code ? P.TYPES[code][1] : null };
  };
  P.nameOf = function (code) { return code && P.TYPES[code] ? P.TYPES[code][0] : ''; };
  P.descOf = function (code) { return code && P.TYPES[code] ? P.TYPES[code][1] : ''; };

  // How Aiu talks, from the shared type (or neutral before the quiz).
  P.style = function (S) {
    var c = (S && S.ptype && S.ptype.code) || '';
    return { e: c.charAt(0) === 'E', i: c.charAt(0) === 'I', s: c.charAt(1) === 'S', n: c.charAt(1) === 'N', t: c.charAt(2) === 'T', f: c.charAt(2) === 'F', j: c.charAt(3) === 'J', p: c.charAt(3) === 'P', code: c };
  };
  function pick(seed, arr) { var h = 0; seed = String(seed || ''); for (var i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0; return arr[Math.abs(h) % arr.length]; }
  // A short "got it" in Aiu's voice.
  P.ack = function (S, seed) {
    var st = P.style(S), a;
    if (st.t) a = pick(seed, ['Got it.', 'Noted.', 'Okay, saved.', 'Makes sense.']);
    else if (st.f) a = pick(seed, ['Love that.', 'Aw, nice.', 'That\'s great.', 'I like that.']);
    else a = pick(seed, ['Got it.', 'Nice.', 'Okay!', 'Cool.']);
    if (st.e) a = a.replace(/\.$/, '!');
    if (st.i) a = a.replace(/!$/, '.');
    return a;
  };
  // Which of who/what/when/where/why/how Aiu asks first: facts people start concrete, idea people start with why.
  P.order = function (S, mode) {
    var st = P.style(S);
    var o = st.n ? ['why', 'how', 'what', 'who', 'where', 'when'] : ['what', 'who', 'when', 'where', 'how', 'why'];
    var first = mode && AIU.iching && AIU.iching.MODES[mode] ? AIU.iching.MODES[mode].first : null;
    if (first) { o.splice(o.indexOf(first), 1); o.unshift(first); }
    return o;
  };
})();
