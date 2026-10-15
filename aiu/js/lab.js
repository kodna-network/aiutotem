/* AIU TOTEM 2.2.0 - the secret laboratory (see places.js for how the buildings work).
   Pick a track and do three cards a day: questions, little code puzzles, and "try it yourself" tasks you do by hand.
   The point is skills that stay in your own head: write the code, design the part, wire the circuit, think it through,
   and use AI as a helper you check, not a crutch. Every few cards is a new level. */
(function () {
  'use strict';
  var U = AIU.util, A = AIU.art, P = A.P, K = A.prim, R = K.R, px = K.px, disc = K.disc, line = K.line, h = U.h, PL = AIU.places;
  function app() { return AIU.app; }
  function KK() { return AIU.ui.k; }
  var today = U.today;
  var TRACKS = {
    code: { name: 'Code', blurb: 'Read and write real code (JavaScript, the language of web pages, like this app).', cards: [
      { q: 'What does this print?', code: 'let apples = 3;\napples = apples + 2;\nconsole.log(apples);', opts: ['5', '3', 'apples + 2'], a: 0, why: 'A variable is a labeled box. The second line puts 3 + 2 back in the box.' },
      { q: 'What does this print?', code: 'let name = "Aiu";\nconsole.log("Hi, " + name + "!");', opts: ['Hi, Aiu!', 'Hi, name!', '"Hi, " + name'], a: 0, why: 'Text in quotes is a string. + glues strings together.' },
      { q: 'What does this print?', code: 'let t = 72;\nif (t > 80) {\n  console.log("hot");\n} else {\n  console.log("nice");\n}', opts: ['nice', 'hot', 'both'], a: 0, why: '72 is not more than 80, so the else part runs.' },
      { q: 'How many times does this say hi?', code: 'for (let i = 0; i < 3; i++) {\n  console.log("hi");\n}', opts: ['3', '2', '4'], a: 0, why: 'i goes 0, 1, 2. When i becomes 3, the condition i < 3 is false and the loop stops.' },
      { do: 'On paper, write the steps for making a sandwich so exactly that a robot who knows nothing could follow them. Then find one step you skipped. That gap-finding is the real skill in programming.', btn: 'I wrote it' },
      { q: 'What does this print?', code: 'function double(n) {\n  return n * 2;\n}\nconsole.log(double(4) + 1);', opts: ['9', '10', '8'], a: 0, why: 'double(4) gives 8, then + 1. A function is a reusable recipe with an input and an output.' },
      { q: 'What does this print?', code: 'let pets = ["cat", "dog", "fish"];\nconsole.log(pets[1]);', opts: ['dog', 'cat', 'fish'], a: 0, why: 'Lists (arrays) count from 0. pets[0] is cat.' },
      { q: 'The code says: "TypeError: Cannot read properties of undefined". What\'s the best first step?', opts: ['Read the line number in the error, and check what was undefined there', 'Delete everything', 'Ask someone to rewrite it'], a: 0, why: 'Errors are clues, not insults. The message and line number tell you where to look.' },
      { q: 'This should print 1 to 5 but prints 1 to 4. Fix?', code: 'for (let i = 1; i < 5; i++) console.log(i);', opts: ['Change < 5 to <= 5', 'Change i++ to i--', 'Start at 0'], a: 0, why: 'Off-by-one mistakes are the most common bug in the world. Check the edges.' },
      { do: 'Rubber duck debugging: next time something doesn\'t work (code or anything), explain it out loud, line by line, to an object on your desk. Most people find the problem halfway through explaining.', btn: 'Got it' },
      { q: 'What does this print?', code: 'let total = 0;\nfor (let n of [2, 4, 6]) {\n  total += n;\n}\nconsole.log(total);', opts: ['12', '6', '246'], a: 0, why: 'total += n adds each number to the running total: 2, 6, 12.' },
      { q: 'Why write comments in code?', opts: ['To explain WHY, for the next person (often future you)', 'To make it run faster', 'Computers need them'], a: 0, why: 'The code says what it does. The comment says why. This app is full of them.' },
      { q: 'What does this print?', code: 'let s = "hello";\nconsole.log(s.length);', opts: ['5', '4', 'hello'], a: 0, why: 'length counts characters.' },
      { do: 'Open any web page on a computer, right-click and choose "View page source". Find one tag you recognize (like <p> or <a>). Every website is made of this.', btn: 'I looked' }
    ] },
    prompt: { name: 'Prompt craft', blurb: 'Ask AI tools clearly, and check what they give you.', cards: [
      { q: 'Which prompt will get a better answer?', opts: ['"Write a 3-sentence birthday message for my coworker Sam, who loves fishing. Warm, not cheesy."', '"birthday message"', '"Be creative!!!"'], a: 0, why: 'Say who it\'s for, how long, what tone, and any details only you know.' },
      { q: 'You need a list you can paste into a spreadsheet. What should you add?', opts: ['Ask for the format: "as a table with columns Name, Date, Cost"', 'Nothing', 'Say please three times'], a: 0, why: 'Asking for a format saves you the cleanup.' },
      { q: 'An AI tells you a fact with a confident tone. What do you do?', opts: ['Check it in a reliable source before you use it', 'Trust it: it sounded sure', 'Share it right away'], a: 0, why: 'AI can be wrong while sounding certain. Confidence is not evidence.' },
      { q: 'What should you never paste into a chatbot?', opts: ['Passwords, card numbers, or other people\'s private info', 'A recipe', 'A poem you wrote'], a: 0, why: 'Treat a prompt box like a postcard: assume someone could read it.' },
      { q: 'The answer missed the point. Best next move?', opts: ['Say what was wrong and what you want instead', 'Start over with the same words', 'Give up'], a: 0, why: 'A follow-up like "shorter, and leave out X" is how you steer.' },
      { do: 'Before asking an AI something today, write your own answer first, in one or two sentences. Then compare. Where were you better? Where was it?', btn: 'I tried it' },
      { q: 'Why give an example of what you want?', opts: ['It shows the style and format better than describing it', 'It confuses the AI', 'It makes it slower'], a: 0, why: '"Like this: ..." is one of the strongest things you can add.' },
      { q: 'You asked an AI to summarize a long article. What\'s the risk?', opts: ['It can leave out or invent details: skim the original for the key parts', 'None at all', 'It deletes the article'], a: 0, why: 'Use summaries to decide what to read, not instead of reading what matters.' },
      { q: 'Which is the clearest way to give a task with steps?', opts: ['A numbered list of what you want, in order', 'One long run-on sentence', 'Only emojis'], a: 0, why: 'Structure in, structure out.' },
      { do: 'Write a prompt for something you actually need this week (a message, a plan, a list). Include: who it\'s for, the goal, the length, the tone, and one example.', btn: 'I wrote it' },
      { q: 'An AI wrote code for you. Before using it you should:', opts: ['Read it until you understand what each part does, and test it', 'Paste it straight into something important', 'Assume it\'s perfect'], a: 0, why: 'You\'re responsible for what you run. If you can\'t explain it, you can\'t fix it.' },
      { q: 'When is it better NOT to use AI?', opts: ['When the point is for you to learn the skill or think it through yourself', 'Never', 'Always'], a: 0, why: 'Struggling a bit is how your brain builds the skill. Use AI after you\'ve tried.' }
    ] },
    print3d: { name: '3D design & printing', blurb: 'Design parts and print them on a 3D printer, the right way up.', cards: [
      { q: 'What units do most 3D printers and design tools use?', opts: ['Millimeters', 'Inches', 'Feet'], a: 0, why: 'A part designed in inches but exported as mm comes out 25.4 times too small.' },
      { q: 'What is the order of a 3D print job?', opts: ['Design (CAD) → export a mesh (STL or 3MF) → slice → print', 'Print → design → slice', 'Slice → design → print'], a: 0, why: 'The slicer turns the shape into layers and the G-code the printer follows.' },
      { q: 'The "45-degree rule" says:', opts: ['Overhangs steeper than about 45° from vertical need support', 'Print everything at 45°C', 'Tilt the printer 45°'], a: 0, why: 'Each layer can stick out a little past the one below. Past about 45°, it droops into the air.' },
      { q: 'How can you avoid needing supports?', opts: ['Design with chamfers (45° slopes) instead of flat overhangs, and pick a smart orientation', 'Print faster', 'Use more glue'], a: 0, why: 'Support-free designs print cleaner and waste less plastic. Flip the part so the flat face is on the bed.' },
      { q: 'What is infill?', opts: ['The pattern inside a part: 15 to 20% is common', 'The color', 'The outer skin'], a: 0, why: 'More infill is stronger but slower and heavier. Walls (perimeters) matter more for strength.' },
      { q: 'The first layer isn\'t sticking. Most likely cause?', opts: ['The bed isn\'t level, or the nozzle is too far from it', 'The model is too pretty', 'The room is too quiet'], a: 0, why: 'Level the bed, clean it with isopropyl alcohol, and make the first layer slightly squished.' },
      { do: 'Pick a small object near you (a bottle cap, a key). Measure it with a ruler or calipers and sketch it from the front, top and side with the sizes in mm. That\'s how every design starts.', btn: 'I sketched it' },
      { q: 'You\'re designing a peg to fit a 10 mm hole. How big?', opts: ['A bit smaller, like 9.8 mm, to leave clearance', 'Exactly 10 mm', '10.5 mm'], a: 0, why: 'Printed parts swell slightly. About 0.2 mm of clearance is a common start: print a test piece.' },
      { q: 'What does "manifold" (watertight) mean for a 3D model?', opts: ['The surface has no holes or gaps, so the slicer knows inside from outside', 'It holds water', 'It\'s made of metal'], a: 0, why: 'Non-manifold models slice badly or not at all. Most slicers can repair small errors.' },
      { q: 'PLA is a good first filament because:', opts: ['It prints at low heat (about 190 to 220°C) and barely warps', 'It\'s fireproof', 'It\'s the strongest plastic'], a: 0, why: 'PETG is tougher; ABS needs an enclosure and good air flow.' },
      { q: 'Smaller layer height (like 0.1 mm instead of 0.2 mm) means:', opts: ['Smoother sides, but a longer print', 'A faster print', 'A bigger part'], a: 0, why: 'Use fine layers for detailed figures, thicker for practical parts.' },
      { do: 'Design something simple in a free design tool (or on graph paper): a hook, a phone stand or a name tag. Check it for overhangs over 45° and fix them with chamfers.', btn: 'I designed it' }
    ] },
    elec: { name: 'Electronics', blurb: 'Batteries, LEDs and circuits you can build with your hands.', cards: [
      { q: 'What does a circuit need for current to flow?', opts: ['A complete loop from the power source and back', 'Just one wire', 'Magnets'], a: 0, why: 'A switch works by breaking the loop.' },
      { q: 'Ohm\'s law: voltage = current × resistance (V = I × R). 9 V across 450 Ω gives what current?', opts: ['0.02 A (20 mA)', '4050 A', '50 A'], a: 0, why: 'I = V ÷ R = 9 ÷ 450 = 0.02 amps.' },
      { q: 'Why does an LED need a resistor?', opts: ['To limit the current so it doesn\'t burn out', 'To change its color', 'It doesn\'t'], a: 0, why: 'An LED alone on a battery draws too much current and can pop.' },
      { q: 'An LED has a long leg and a short leg. The long leg is:', opts: ['Positive (+, the anode)', 'Negative', 'Either'], a: 0, why: 'LEDs only work one way round. The short leg (and the flat edge) is negative.' },
      { q: 'Why should you never connect a battery\'s + and - straight together with a wire?', opts: ['It\'s a short circuit: the wire and battery can get very hot', 'It charges the battery', 'Nothing happens'], a: 0, why: 'Shorts can melt wires and make batteries swell or catch fire.' },
      { q: 'On a breadboard, which holes are connected?', opts: ['Each short row of 5 holes, and the long power rails along the sides', 'Every hole to every hole', 'None'], a: 0, why: 'The gap down the middle separates the two sides.' },
      { do: 'Find a flashlight or a toy with a battery cover. Look at how the batteries line up (+ to -) and trace the path the current takes. Draw it.', btn: 'I traced it' },
      { q: 'Two 1.5 V batteries in series (end to end) give:', opts: ['3 V', '1.5 V', '0 V'], a: 0, why: 'Series adds voltage. Side by side (parallel) keeps 1.5 V but lasts longer.' },
      { q: 'What does a multimeter measure?', opts: ['Voltage, current and resistance', 'Only temperature', 'Distance'], a: 0, why: 'It\'s the electronics version of a ruler. Start on the highest range when you\'re unsure.' },
      { q: 'What should you never work on as a beginner?', opts: ['Wall power (mains): it can kill', 'AA batteries', 'A coin cell LED'], a: 0, why: 'Batteries under 12 V are the safe place to learn. Leave house wiring to licensed electricians.' },
      { q: 'A soldering iron tip is about how hot?', opts: ['Around 300 to 350°C: hold it by the handle only and use the stand', 'Warm like a mug', 'Ice cold'], a: 0, why: 'Solder in a ventilated spot, and wash your hands after.' }
    ] },
    think: { name: 'Think for yourself', blurb: 'Habits for solving problems with your own head first.', cards: [
      { q: 'Before searching or asking for the answer, try:', opts: ['Guessing first, then checking: it makes the answer stick', 'Never guessing', 'Asking three people'], a: 0, why: 'A wrong guess you correct is remembered far better than an answer you just read.' },
      { q: 'Estimate: about how many minutes are in a week?', opts: ['About 10,000', 'About 100', 'About a million'], a: 0, why: '60 × 24 = 1,440 a day; × 7 = 10,080. Rough math in your head catches big mistakes.' },
      { q: 'You read a shocking headline. First step?', opts: ['Check who published it and whether other good sources report it', 'Share it', 'Believe it if it matches what you think'], a: 0, why: 'The stronger the feeling a headline gives you, the more it\'s worth checking.' },
      { do: 'Pick a problem on your mind. Write it as one question. Under it, write 3 possible answers, even bad ones. Pick the best and one small next step.', btn: 'I did it' },
      { q: 'You\'re stuck for an hour. What often helps most?', opts: ['A break: a walk, a shower or sleep, then come back', 'Staring harder', 'Quitting forever'], a: 0, why: 'Your brain keeps working in the background. Many answers show up away from the desk.' },
      { q: 'Someone disagrees with you. A strong way to respond?', opts: ['Say their point back in your own words before answering it', 'Talk louder', 'Change the subject'], a: 0, why: 'If you can explain their side well, your answer gets better, or your mind changes for a good reason.' },
      { q: 'Which is a better way to learn a skill?', opts: ['Short practice often, trying from memory', 'Rereading notes once the night before', 'Watching someone else only'], a: 0, why: 'Spaced practice and recalling from memory beat rereading by a lot.' },
      { do: 'Teach someone (or your Aiu, out loud) one thing you learned this week, without looking anything up. Notice what you couldn\'t explain: that\'s what to review.', btn: 'I taught it' },
      { q: 'A tool gives you an answer you don\'t understand. Best move?', opts: ['Ask "why?" until you can explain it yourself', 'Copy it and move on', 'Pretend you understand'], a: 0, why: 'If you can explain it to a 10-year-old, you own it.' },
      { q: 'What\'s a "first principles" approach?', opts: ['Break a problem into basic facts you know are true and build up from there', 'Do what everyone else does', 'Pick the first idea'], a: 0, why: 'Ask what you actually know for sure, and what\'s only habit or assumption.' }
    ] }
  };
  PL.TRACKS = TRACKS;
  PL.labState = function (S) {
    var L = PL.all(S, 'lab'), tr = TRACKS[L.track] ? L.track : null, pos = {};
    Object.keys(TRACKS).forEach(function (t) { pos[t] = +L['pos:' + t] || 0; });
    return { track: tr, pos: pos, doneToday: L.did === today() };
  };
  function nextCards(st, t, n) {
    var list = TRACKS[t].cards, p = st.pos[t], out = [];
    for (var i = 0; i < n; i++) out.push(list[(p + i) % list.length]);
    return out;
  }
  function pickN(list, n) { return list[(n || 0) % list.length]; }
  function level(t, p) { return 1 + Math.floor(p / 4); }
  function drawLab(c, V, S) {
    var st = PL.labState(S), f = V.f, t = st.track;
    R(c, 0, 0, 192, 108, P.dark); for (var y = 0; y < 80; y += 10) for (var x = (y / 10) % 2 ? 0 : 10; x < 192; x += 20) R(c, x, y, 10, 10, P.ink); // stone wall
    R(c, 0, 80, 192, 28, P.slate); for (var fx = 0; fx < 192; fx += 12) R(c, fx, 80, 1, 28, P.dark); R(c, 0, 79, 192, 1, P.ink);
    R(c, 60, 66, 128, 4, P.wood); R(c, 64, 70, 3, 24, P.wood); R(c, 180, 70, 3, 24, P.wood); // the bench
    // the computer: code scrolling
    R(c, 70, 40, 34, 24, P.ink); R(c, 72, 42, 30, 19, P.ink); R(c, 85, 64, 4, 2, P.slate);
    for (var l = 0; l < 6; l++) { var w = 6 + ((l * 7 + Math.floor(f / 3)) % 18); R(c, 74 + (l % 3) * 2, 43 + l * 3, w, 1, l % 3 === 0 ? P.lime : l % 3 === 1 ? P.cyan : P.yellow); }
    // the 3D printer: the part grows layer by layer
    R(c, 114, 34, 30, 32, P.silver); R(c, 116, 36, 26, 28, P.dark); R(c, 116, 62, 26, 2, P.slate);
    var lay = Math.floor(f / 2) % 14, hx = 120 + (f * 3) % 18; R(c, 116, 40, 26, 1, P.slate); R(c, hx, 40, 4, 4, P.orange); px(c, hx + 2, 44, P.yellow);
    R(c, 124, 62 - lay, 10, lay, P.lime);
    // the breadboard: an LED that blinks
    R(c, 150, 58, 30, 8, P.white); for (var bx = 152; bx < 178; bx += 3) px(c, bx, 61, P.silver); R(c, 160, 54, 2, 4, P.silver); disc(c, 161, 53, 2, f % 8 < 4 ? P.red : P.bark); R(c, 172, 60, 6, 4, P.blue); line(c, 162, 58, 172, 60, P.red);
    // shelves of flasks
    R(c, 6, 26, 46, 2, P.wood); [[10, P.lime], [20, P.purple], [32, P.cyan], [44, P.orange]].forEach(function (fl, i) { R(c, fl[0], 18, 4, 8, P.white); R(c, fl[0] + 1, 21 + (i % 2), 2, 5, fl[1]); if ((f + i * 5) % 20 < 3) px(c, fl[0] + 2, 16 - ((f + i) % 3), fl[1]); });
    R(c, 6, 48, 46, 2, P.wood); for (var b = 0; b < 6; b++) R(c, 8 + b * 7, 38, 5, 10, [P.red, P.blue, P.yellow, P.green, P.purple, P.sand][b]);
    PL.aiu(c, 40, 100, f, V.happy && Date.now() - V.happy < 3000 ? 'happy' : 'open');
    if (t === 'elec' && f % 8 < 4) disc(c, 161, 53, 4, 'rgba(255,0,0,0.25)');
    var at = { printer: [129, 32], computer: [87, 38], board: [165, 50], shelf: [28, 14], air: [184, 12] };
    R(c, 176, 6, 14, 12, P.slate); R(c, 177, 7, 12, 10, P.dark); var fa = (f % 4) * Math.PI / 4; line(c, 183, 12, Math.round(183 + Math.cos(fa) * 4), Math.round(12 + Math.sin(fa) * 4), P.silver); line(c, 183, 12, Math.round(183 - Math.cos(fa) * 4), Math.round(12 - Math.sin(fa) * 4), P.silver); // a vent fan
    PL.labSys(S).forEach(function (o) { var p0 = at[o.p.id]; if (p0) PL.marker(c, V, p0[0], p0[1], o, function () { V.sys = o.p.id; V.render(); }); });
  }
  // 2.3.0: the lab's stations need looking after too: tap a red one for the fix
  var LSYS = [
    { id: 'printer', name: '3D printer', days: 7, puzzles: [
      { title: 'Level the 3D printer bed', why: 'If the bed isn\'t the same distance from the nozzle everywhere, the first layer won\'t stick (or gets squashed).', tools: ['a sheet of plain paper'],
        steps: [['Heat the bed and the nozzle to printing temperature', 'metal grows a little when it\'s hot'], ['Home all the axes', 'so the printer knows where zero is'], ['Slide the paper under the nozzle at one corner', ''], ['Turn that corner\'s knob until the paper just drags', 'a light scrape, not stuck'], ['Do the other three corners the same way', ''], ['Go around once more and check the middle', 'adjusting one corner nudges the others'], ['Print a first-layer test square', 'lines should be slightly squished and touching']],
        check: [{ q: 'The first layer comes out as round, separate strings that peel off. The nozzle is...', opts: ['Too far from the bed', 'Too close', 'Perfect'], a: 0, why: 'Bring it a little closer so the plastic squishes down onto the bed.' }] },
      { title: 'Clear a clogged nozzle', why: 'A clicking extruder and no plastic coming out usually means a clog.', tools: ['tweezers', 'a little snip of fresh filament'],
        steps: [['Heat the nozzle to printing temperature', ''], ['Push the filament by hand: does any come out?', 'a little = partial clog'], ['Unload the filament and snip its end clean and straight', ''], ['Do a cold pull: heat, push filament in, cool to about 90°C, then pull it out firmly', 'the gunk comes out stuck to the tip'], ['Repeat until the pulled tip comes out clean', ''], ['Load the filament again and extrude a little', 'a smooth, straight string = fixed']],
        check: [{ q: 'Damp filament snaps and pops while printing. What helps?', opts: ['Dry it, then store it sealed with a desiccant pack', 'Print faster', 'Wet it more'], a: 0, why: 'Many plastics soak up moisture from the air.' }] }] },
    { id: 'computer', name: 'Computer: updates and backups', days: 10, cards: [
      { q: 'Why install updates?', opts: ['They fix security holes and bugs', 'To use more battery', 'No real reason'], a: 0, why: 'Most attacks use holes that already have a fix. Update soon after they come out.' },
      { q: 'What\'s the 3-2-1 backup rule?', opts: ['3 copies, on 2 kinds of storage, 1 kept somewhere else', 'Back up every 321 days', 'Use 3 passwords'], a: 0, why: 'One copy away from home survives a fire, a flood or a stolen laptop.' }] },
    { id: 'board', name: 'Breadboard: loose wires', days: 9, cards: [
      { q: 'An LED circuit stopped working. What do you check first?', opts: ['Loose wires, and that the LED is the right way round', 'Buy a new computer', 'Add more batteries'], a: 0, why: 'Most "broken" circuits are a wire that popped out.' },
      { q: 'Why unplug the battery before rewiring?', opts: ['So nothing shorts while your hands are in there', 'To save time', 'No reason'], a: 0, why: 'Power off, then change things, then power on.' }] },
    { id: 'shelf', name: 'Shelf: labels and safe storage', days: 21, cards: [
      { q: 'There\'s an unlabeled bottle of clear liquid on the shelf. What do you do?', opts: ['Don\'t guess or sniff it: set it aside safely and find out what it is', 'Taste a drop', 'Pour it down the drain'], a: 0, why: 'Label everything the day you fill it: what it is and the date.' },
      { q: 'How should spare batteries be stored?', opts: ['Cool and dry, with the ends covered so they can\'t short', 'Loose in a pocket with keys', 'In water'], a: 0, why: 'Metal across the ends can make a battery very hot.' }] },
    { id: 'air', name: 'Air and ventilation', days: 14, cards: [
      { q: 'Why run the vent fan when 3D printing or soldering?', opts: ['They give off fumes and tiny particles', 'To cool your drink', 'It\'s just for noise'], a: 0, why: 'Fresh air in, fumes out. Keep your face out of the smoke.' }] }
  ];
  PL.labSys = function (S) { var L = PL.all(S, 'lab'); return PL.health(S, 'lab', LSYS, L.sysStart || today()); };
  function labView(V, S) {
    var b = V.body, st = PL.labState(S), k = KK(), sys = PL.labSys(S);
    if (!PL.all(S, 'lab').sysStart) PL.set('lab', { sysStart: today() });
    if (V.sys) { // fixing a station
      var so = sys.filter(function (x) { return x.p.id === V.sys; })[0], sbox = h('div'), done = function () { PL.fixed('lab', so.p.id, so.n).then(function () { V.happy = Date.now(); app().beep('chirp'); V.sys = null; V.render(); KK().snack(so.p.name + ': fixed.'); }); };
      b.appendChild(PL.card(so.p.name, [PL.meterRow(so, function () {}), sbox, k.btn('Back', function () { V.sys = null; V.render(); }, 'ghost')]));
      if (so.p.puzzles) { var pz = so.p.puzzles[so.n % so.p.puzzles.length]; sbox.appendChild(h('h3', { text: pz.title })); PL.orderPuzzle(sbox, Object.assign({ id: 'lab' + so.p.id + so.n }, pz), done); }
      else PL.quiz(sbox, [pickN(so.p.cards, so.n)], done, { count: false });
      return;
    }
    if (V.cards) {
      var t = V.cards.t, box = h('div');
      b.appendChild(PL.card(TRACKS[t].name + ' · level ' + level(t, st.pos[t]), [box, k.btn('Stop for now', function () { V.cards = null; V.render(); }, 'ghost')]));
      var gotN = 0;
      PL.quiz(box, V.cards.list, function () {
        var kv = { track: t }; kv['pos:' + t] = st.pos[t] + V.cards.list.length;
        var first = !st.doneToday && !V.cards.practice; if (first) kv.did = today();
        (first ? PL.learned('lab', t, kv) : PL.set('lab', kv)).then(function () { V.happy = Date.now(); app().beep('chirp'); V.cards = null; V.render(); KK().snack(first ? 'Today\'s lab work is done.' : 'Nice practice.'); });
      }, { label: 'Card', onRight: function () { gotN++; V.happy = Date.now(); } });
      return;
    }
    if (!V.cards) b.appendChild(PL.card('The stations', [h('p', { cls: 'small', text: 'Tap a red one (in the picture or here) to fix it.' }), h('div', { cls: 'bparts' }, sys.map(function (o) { return PL.meterRow(o, function () { V.sys = o.p.id; V.render(); }); }))]));
    b.appendChild(PL.card(st.doneToday ? 'Today\'s lab work is done' : 'Today\'s lab work', [h('p', { text: st.doneToday ? 'Come back tomorrow for three more, or keep going now for practice.' : 'Pick a track. Three cards a day: questions, code puzzles and things to try with your own hands.' }),
      st.track && !st.doneToday ? k.btn('Continue ' + TRACKS[st.track].name, function () { V.cards = { t: st.track, list: nextCards(st, st.track, 3) }; V.render(); }, 'primary') : null]));
    b.appendChild(PL.card('Tracks', Object.keys(TRACKS).map(function (t) {
      var T = TRACKS[t], p = st.pos[t];
      return h('div', { cls: 'item' }, h('span', { cls: 'ititle' }, h('b', { text: T.name }), h('span', { cls: 'small', text: ' ' + T.blurb })), h('span', { cls: 'tag', text: p ? 'level ' + level(t, p) + (p >= T.cards.length ? ' · review' : '') : 'new' }),
        k.btn(st.doneToday ? 'Practice' : 'Start', function () { V.cards = { t: t, list: nextCards(st, t, 3), practice: st.doneToday }; V.render(); }, 'mini' + (t === st.track ? ' primary' : '')));
    })));
    b.appendChild(h('p', { cls: 'small', text: 'Try every card yourself before checking anything. The goal is skills that live in your own head.' }));
  }
  PL.register({ id: 'lab', title: 'The laboratory', aria: 'Laboratory: learn to code, design, build and think', draw: drawLab, view: labView, pending: function (S) { return !PL.labState(S).doneToday || PL.labSys(S).some(function (o) { return o.state === 'bad'; }); } });
})();
