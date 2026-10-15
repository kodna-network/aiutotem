/* AIU TOTEM 2.2.0 - the barn and the greenhouse (see places.js for how the buildings work).
   Barn: three chores a day, each a real-life question about looking after the animals. Chickens first; every few
   chore days a new animal moves in (goats, a horse, a cow, pigs, sheep, rabbits).
   Greenhouse: four pots. Sow a seed, care for it once a day (each care is a question about what that plant needs right
   now), and it grows one stage per cared day: sprout, seedling, growing, flowering, ripe. Harvest it for its seeds.
   Two varieties of the same plant flowering at the same time can be crossed by hand for a new hybrid seed. A seed swap
   box brings a new packet every few days. Nothing wilts or dies if you're away: it just waits for you. */
(function () {
  'use strict';
  var U = AIU.util, A = AIU.art, P = A.P, K = A.prim, R = K.R, px = K.px, disc = K.disc, ell = K.ell, tri = K.tri, line = K.line, h = U.h, PL = AIU.places;
  function app() { return AIU.app; }
  function KK() { return AIU.ui.k; }
  var today = U.today;
  function dayN(d) { return Math.round(U.dayToDate(d).getTime() / 864e5); }
  function pickN(list, n, seed) { var r = U.rng(seed), a = list.slice(), out = []; while (a.length && out.length < n) out.push(a.splice(Math.floor(r() * a.length), 1)[0]); return out; }

  /* =====================================================================================
     THE BARN
     ===================================================================================== */
  var ANIMALS = ['chickens', 'goats', 'horse', 'cow', 'pigs', 'sheep', 'rabbits'];
  var ANAME = { chickens: 'Chickens', goats: 'Goats', horse: 'A horse', cow: 'A cow', pigs: 'Pigs', sheep: 'Sheep', rabbits: 'Rabbits' };
  var UNLOCK = [0, 3, 7, 12, 18, 25, 33]; // chore days needed for each animal
  var CHORES = {
    chickens: [
      { q: 'Morning in the coop. What do the chickens need first?', opts: ['Fresh, clean water and their feed', 'A bath', 'Nothing until noon'], a: 0, why: 'Hens drink a lot: a laying hen can drink a pint a day, more in the heat. Clean the waterer every day.' },
      { q: 'What should laying hens mostly eat?', opts: ['Layer feed (about 16% protein, with calcium)', 'Only bread', 'Only corn scratch'], a: 0, why: 'Scratch and kitchen scraps are treats. Too many treats and the hens stop laying well.' },
      { q: 'The eggshells are getting thin. What helps?', opts: ['A dish of crushed oyster shell on the side', 'More water', 'Less light'], a: 0, why: 'Shells are made of calcium. Hens take just what they need from a separate dish.' },
      { q: 'How often should you collect eggs?', opts: ['At least once a day', 'Once a week', 'Only when the nest is full'], a: 0, why: 'Daily collecting keeps eggs clean and stops hens from going broody or pecking them.' },
      { q: 'Evening. Why lock the coop door at dusk?', opts: ['To keep out raccoons, foxes and owls', 'So the chickens sleep longer', 'It doesn\'t matter'], a: 0, why: 'Chickens go to roost on their own at dusk. Predators come out at night: hardware cloth beats chicken wire.' },
      { q: 'A hen is rolling around in a dusty patch. Is she sick?', opts: ['No: she\'s taking a dust bath to clean her feathers', 'Yes, call the vet', 'She\'s too hot'], a: 0, why: 'Dust baths smother mites and lice. Give them a dry, loose patch of dirt.' },
      { q: 'What goes on the coop floor?', opts: ['Dry bedding like pine shavings or straw, changed when it gets wet', 'Bare wet dirt', 'Newspaper only'], a: 0, why: 'Damp bedding grows mold and ammonia that hurt their lungs. Your nose tells you when to change it.' },
      { q: 'How much light do hens need to keep laying?', opts: ['About 14 to 16 hours a day', '4 hours', 'Total darkness'], a: 0, why: 'Laying slows down in winter because days are short. That\'s natural; many keepers let the hens rest.' }
    ],
    goats: [
      { q: 'Goats are browsers. What does that mean?', opts: ['They like to nibble shrubs, leaves and weeds more than grass', 'They only eat grass', 'They eat cans'], a: 0, why: 'Goats don\'t really eat tin cans! They taste everything with their lips, but their favorite is browse: brush and leaves.' },
      { q: 'You\'re thinking of getting one goat. Good idea?', opts: ['Get at least two: goats are herd animals and get lonely', 'One is perfect', 'Ten at once'], a: 0, why: 'A lone goat cries and gets stressed. Two buddies is the minimum.' },
      { q: 'What mineral do goats need that\'s dangerous to sheep?', opts: ['Copper', 'Salt', 'Water'], a: 0, why: 'Goat minerals contain copper. Sheep can be poisoned by it, so they need their own minerals.' },
      { q: 'How often do goats need their hooves trimmed?', opts: ['About every 6 to 8 weeks', 'Never', 'Every day'], a: 0, why: 'Overgrown hooves curl and make walking painful. Trim the outer wall level with the sole.' },
      { q: 'The goats are huddled in the shed. It\'s raining. Why?', opts: ['Goats hate getting wet: they need a dry shelter', 'They\'re sick', 'They\'re bored'], a: 0, why: 'Goats don\'t have oily coats like sheep. A three-sided shed out of the wind is enough.' },
      { q: 'How do keepers check a goat for worms on the farm?', opts: ['Look at the color inside the lower eyelid (the FAMACHA check)', 'Count its teeth', 'Listen to it sing'], a: 0, why: 'Pale pink or white means anemia from barber pole worms. Bright red-pink is healthy.' },
      { q: 'Why do goats chew even when they\'re not eating?', opts: ['They\'re chewing their cud: re-chewing food from their first stomach', 'They have gum', 'They\'re nervous'], a: 0, why: 'Goats are ruminants with four stomach parts. A goat that stops chewing cud may be sick.' }
    ],
    horse: [
      { q: 'How much hay does a horse eat in a day?', opts: ['About 2% of its body weight (around 20 lb for a 1,000 lb horse)', 'A handful', 'Half its weight'], a: 0, why: 'Horses are built to graze all day. Long gaps without food can cause ulcers and colic.' },
      { q: 'How much water does a horse drink a day?', opts: ['About 5 to 10 gallons, more in heat or work', 'A cup', 'None, it gets it from hay'], a: 0, why: 'Check the trough twice a day. In winter, make sure it isn\'t frozen.' },
      { q: 'Where do you stand to walk up to a horse?', opts: ['At its shoulder, talking calmly so it knows you\'re there', 'Right behind it', 'Straight at its face, fast'], a: 0, why: 'Horses can\'t see directly behind them. A startled horse can kick.' },
      { q: 'The horse keeps looking at its belly, pawing and lying down and getting up. What could it be?', opts: ['Colic (belly pain): call the vet now', 'It\'s happy', 'It wants a carrot'], a: 0, why: 'Colic can be deadly. Note the time, take away food, walk it gently if the vet says to.' },
      { q: 'Why do horse teeth need a vet visit about once a year?', opts: ['They keep growing and wear into sharp points that need filing ("floating")', 'To whiten them', 'They don\'t'], a: 0, why: 'Sharp points cut cheeks and make chewing hard. Dropping food while eating is a clue.' },
      { q: 'What\'s the first thing to do before riding?', opts: ['Groom it and pick its hooves, checking for cuts and stones', 'Feed it a big meal', 'Gallop to warm up'], a: 0, why: 'Grooming finds problems early and keeps dirt from rubbing under the saddle.' }
    ],
    cow: [
      { q: 'How much water can a milking cow drink a day?', opts: ['Around 30 to 50 gallons', '1 gallon', 'None'], a: 0, why: 'Milk is mostly water. Cows drink the most right after milking.' },
      { q: 'How often is a dairy cow usually milked?', opts: ['Twice a day, about 12 hours apart', 'Once a month', 'Whenever'], a: 0, why: 'A steady routine keeps the udder healthy and the milk coming.' },
      { q: 'What do you do before milking?', opts: ['Clean and dry the teats', 'Nothing', 'Run her around'], a: 0, why: 'Clean teats keep germs out of the milk and stop mastitis (an udder infection).' },
      { q: 'What\'s a cow\'s main food?', opts: ['Grass and hay (forage)', 'Meat', 'Candy'], a: 0, why: 'Cows are ruminants: microbes in the rumen break down grass that people can\'t digest.' },
      { q: 'Why give cattle a salt and mineral block?', opts: ['Grass alone often lacks salt and some minerals', 'For fun', 'To sharpen teeth'], a: 0, why: 'Cattle lick what they need. Put it near water and shade.' },
      { q: 'A cow is lying down chewing slowly. Good or bad?', opts: ['Good: resting and chewing cud is a happy cow', 'Bad, she\'s sick', 'She\'s asleep forever'], a: 0, why: 'Cows chew cud for hours a day. A cow that stops eating and chewing needs a closer look.' }
    ],
    pigs: [
      { q: 'Why do pigs roll in mud?', opts: ['They can\'t sweat much, so mud keeps them cool (and blocks sunburn)', 'They\'re dirty animals', 'For fun only'], a: 0, why: 'Pigs are actually tidy: they pick one corner for a bathroom. Give them shade and a wallow.' },
      { q: 'Can you feed pigs meat scraps from the kitchen?', opts: ['No: in many places it\'s illegal because it spreads diseases', 'Yes, all of it', 'Only bacon'], a: 0, why: 'Feeding meat scraps has spread big outbreaks (like foot-and-mouth disease). Use pig feed and safe produce.' },
      { q: 'The pigs are digging up the yard with their noses. Why?', opts: ['Rooting: looking for roots, bugs and grubs is natural', 'They\'re angry', 'They lost something'], a: 0, why: 'Give them a patch they\'re allowed to root up. A ring in the nose isn\'t needed for a happy pig.' },
      { q: 'How smart are pigs?', opts: ['Very: they can learn their names and solve puzzles', 'Not at all', 'Smarter than every human'], a: 0, why: 'Bored pigs get into trouble. Toys like a ball or a scattered snack keep them busy.' },
      { q: 'What\'s the best floor for a pig shelter?', opts: ['Dry bedding (straw) in a draft-free spot', 'Wet concrete', 'Gravel'], a: 0, why: 'Piglets get cold easily. Deep straw lets them burrow.' }
    ],
    sheep: [
      { q: 'How often do most wool sheep need shearing?', opts: ['Once a year, usually in spring', 'Never', 'Every week'], a: 0, why: 'Wool never stops growing on most breeds. Too much wool in summer causes heat stress and flystrike.' },
      { q: 'A sheep is alone in a field. Is that okay?', opts: ['No: sheep are flock animals and panic alone', 'Yes, sheep like quiet', 'Only on weekends'], a: 0, why: 'A sheep\'s safety is the flock. Keep at least three if you can.' },
      { q: 'Can sheep eat goat feed with minerals?', opts: ['No: the copper in goat minerals can poison sheep', 'Yes, it\'s the same', 'Only on Sundays'], a: 0, why: 'Sheep feed and minerals are made without added copper.' },
      { q: 'A sheep is limping and its hoof smells bad. What is it?', opts: ['Probably foot rot: trim, treat and keep it on dry ground', 'It\'s tired', 'A sprained ankle'], a: 0, why: 'Foot rot spreads in wet, muddy fields. Catch it early.' },
      { q: 'A sheep is stuck on its back and can\'t get up. What do you do?', opts: ['Gently roll it back onto its feet: a "cast" sheep can die', 'Leave it', 'Shear it'], a: 0, why: 'Heavy wool and a full belly can trap them. Check the flock every day.' }
    ],
    rabbits: [
      { q: 'What should be most of a rabbit\'s diet?', opts: ['Hay (like timothy), about 80% of it', 'Carrots', 'Lettuce only'], a: 0, why: 'Carrots are sugary treats. Endless hay keeps their gut moving and their teeth worn down.' },
      { q: 'Why do rabbits need to chew all day?', opts: ['Their teeth never stop growing', 'They\'re hungry', 'To make noise'], a: 0, why: 'Overgrown teeth are a common rabbit problem. Hay and safe wood chews help.' },
      { q: 'How do you pick up a rabbit?', opts: ['One hand under the chest, one under the back legs, close to you', 'By the ears', 'By the scruff only'], a: 0, why: 'Never by the ears. A kicking rabbit can hurt its own back.' },
      { q: 'It\'s 90°F out. What\'s the danger?', opts: ['Rabbits overheat easily: shade, cool water and a frozen water bottle help', 'None, rabbits love heat', 'They\'ll get a tan'], a: 0, why: 'Rabbits handle cold far better than heat. Above about 85°F, watch them closely.' },
      { q: 'Your rabbit hasn\'t eaten or pooped all day. What now?', opts: ['Call a vet today: it may be GI stasis', 'Wait a week', 'Give it candy'], a: 0, why: 'A rabbit\'s gut has to keep moving. Stopping is an emergency.' }
    ]
  };
  PL.CHORES = CHORES;
  // 2.3.1: the herd grows: every 4th time you care for an animal, a baby arrives (up to a few of each)
  var HERD0 = { chickens: 3, goats: 2, horse: 1, cow: 1, pigs: 2, sheep: 2, rabbits: 2 }, HERDMAX = { chickens: 8, goats: 4, horse: 2, cow: 3, pigs: 4, sheep: 4, rabbits: 6 };
  var BABY = { chickens: 'An egg hatched: a fluffy new chick!', goats: 'A baby goat (a kid) was born!', horse: 'A foal was born!', cow: 'A calf was born!', pigs: 'Piglets!', sheep: 'A little lamb was born!', rabbits: 'Baby bunnies (kits)!' };
  PL.herd = function (S, an) { var v = PL.get(S, 'barn', 'herd:' + an, null); return v === null ? HERD0[an] || 1 : +v; };
  PL.barnState = function (S) {
    var B = PL.all(S, 'barn'), days = +B.days || 0, has = [];
    ANIMALS.forEach(function (an, i) { if (days >= UNLOCK[i]) has.push(an); });
    var nextI = has.length < ANIMALS.length ? has.length : -1;
    return { days: days, has: has, doneToday: B.did === today(), next: nextI >= 0 ? { an: ANIMALS[nextI], in: UNLOCK[nextI] - days } : null, pos: B.pos || {} };
  };
  function todaysChores(st) {
    var seed = U.hash32('barn' + today()), out = [], has = st.has.slice();
    var newest = has[has.length - 1], pool = [];
    has.forEach(function (an) { CHORES[an].forEach(function (c, i) { pool.push(Object.assign({ an: an, i: i }, c)); }); });
    var first = pool.filter(function (c) { return c.an === newest; }); // the newest animal always gets one
    out.push(pickN(first, 1, seed)[0]);
    pickN(pool.filter(function (c) { return c !== out[0]; }), 2, seed + 7).forEach(function (c) { out.push(c); });
    return out;
  }
  // animals, drawn small (facing right). x = left edge, y = ground
  var DRAW = {
    chickens: function (c, x, y, f) { for (var i = 0; i < 3; i++) { var cx = x + i * 9, bob = (f + i * 3) % 10 < 2 ? 1 : 0; ell(c, cx + 3, y - 4, 3, 3, i === 1 ? P.wood : P.white); R(c, cx + 5, y - 9 + bob, 3, 3, i === 1 ? P.wood : P.white); px(c, cx + 8, y - 8 + bob, P.orange); px(c, cx + 6, y - 10 + bob, P.red); px(c, cx + 6, y - 8 + bob, P.ink); R(c, cx + 2, y - 1, 1, 1, P.orange); R(c, cx + 4, y - 1, 1, 1, P.orange); } return 27; },
    goats: function (c, x, y, f) { for (var i = 0; i < 2; i++) { var gx = x + i * 16, col = i ? P.white : P.sand; R(c, gx, y - 10, 11, 5, col); R(c, gx + 9, y - 14, 4, 5, col); px(c, gx + 12, y - 12, P.ink); line(c, gx + 9, y - 15, gx + 8, y - 17, P.slate); R(c, gx + 11, y - 9, 1, 2, col); [0, 2, 7, 9].forEach(function (lx) { R(c, gx + lx, y - 5, 1, 5, col); }); px(c, gx - 1, y - 10 - (f % 6 < 3 ? 1 : 0), col); } return 30; },
    horse: function (c, x, y, f) { R(c, x, y - 15, 18, 8, P.wood); R(c, x + 15, y - 22, 5, 10, P.wood); R(c, x + 17, y - 24, 7, 5, P.wood); px(c, x + 21, y - 23, P.ink); R(c, x + 14, y - 23, 2, 10, P.bark); [1, 4, 13, 16].forEach(function (lx) { R(c, x + lx, y - 7, 2, 7, P.wood); }); R(c, x - 2, y - 15, 3, 8 + (f % 8 < 4 ? 0 : 1), P.bark); return 26; },
    cow: function (c, x, y, f) { R(c, x, y - 14, 20, 9, P.white); R(c, x + 3, y - 13, 5, 4, P.ink); R(c, x + 12, y - 10, 4, 3, P.ink); R(c, x + 18, y - 17, 7, 7, P.white); R(c, x + 22, y - 13, 4, 3, P.pink); px(c, x + 21, y - 15, P.ink); R(c, x + 18, y - 19, 1, 2, P.sand); R(c, x + 24, y - 19, 1, 2, P.sand); [1, 4, 14, 17].forEach(function (lx) { R(c, x + lx, y - 5, 2, 5, P.white); }); R(c, x + 8, y - 6, 4, 2, P.pink); px(c, x - 1, y - 13 + (f % 10 < 5 ? 0 : 1), P.ink); return 27; },
    pigs: function (c, x, y, f) { for (var i = 0; i < 2; i++) { var gx = x + i * 15; ell(c, gx + 6, y - 5, 6, 4, P.pink); R(c, gx + 11, y - 7, 3, 3, P.pink); px(c, gx + 13, y - 6, P.red); px(c, gx + 10, y - 8, P.ink); R(c, gx + 2, y - 1, 1, 1, P.pink); R(c, gx + 9, y - 1, 1, 1, P.pink); px(c, gx - 1, y - 7 + (f % 6 < 3 ? 0 : 1), P.pink); } ell(c, x + 14, y, 10, 1, P.bark); return 29; },
    sheep: function (c, x, y, f) { for (var i = 0; i < 2; i++) { var gx = x + i * 15; for (var b = 0; b < 4; b++) disc(c, gx + 2 + b * 3, y - 7 - (b % 2), 3, P.white); R(c, gx + 12, y - 10, 3, 5, P.dark); px(c, gx + 14, y - 9, P.white); [3, 9].forEach(function (lx) { R(c, gx + lx, y - 3, 1, 3, P.dark); }); } return 29; },
    rabbits: function (c, x, y, f) { for (var i = 0; i < 2; i++) { var gx = x + i * 9, hop = (f + i * 4) % 14 < 2 ? 2 : 0, col = i ? P.silver : P.sand; ell(c, gx + 3, y - 3 - hop, 3, 2, col); R(c, gx + 5, y - 6 - hop, 3, 3, col); R(c, gx + 5, y - 10 - hop, 1, 4, col); R(c, gx + 7, y - 10 - hop, 1, 4, col); px(c, gx + 7, y - 5 - hop, P.ink); px(c, gx, y - 4 - hop, P.white); } return 18; }
  };
  // 2.3.0: each animal has a care meter (fed, watered, checked) that runs down over a day, like Aiu's Vitals
  function barnParts(st) { return st.has.map(function (an) { return { id: an, name: ANAME[an], days: 1.25, fresh: false }; }); }
  PL.barnHealth = function (S) { var st = PL.barnState(S), B = PL.all(S, 'barn'); return PL.health(S, 'barn', barnParts(st), B.start || today()); };
  function drawBarn(c, V, S) {
    var st = PL.barnState(S), f = V.f, hs = PL.barnHealth(S), byId = {}; hs.forEach(function (o) { byId[o.p.id] = o; });
    R(c, 0, 0, 192, 108, P.bark); for (var x = 0; x < 192; x += 8) R(c, x, 0, 1, 80, P.ink); // plank walls
    R(c, 0, 0, 192, 4, P.ink); R(c, 0, 18, 192, 2, P.ink); for (var bx = 20; bx < 192; bx += 44) { line(c, bx, 20, bx + 20, 4, P.ink); }
    R(c, 150, 26, 26, 22, P.sky); R(c, 162, 26, 2, 22, P.bark); R(c, 150, 36, 26, 2, P.bark); // window
    R(c, 2, 66, 30, 14, P.yellow); for (var hy = 66; hy < 80; hy += 3) R(c, 2, hy, 30, 1, P.sand); R(c, 2, 66, 30, 1, P.wood); R(c, 2, 72, 30, 1, P.wood); // hay bales, stacked on the floor
    R(c, 8, 54, 20, 12, P.yellow); for (var hy2 = 54; hy2 < 66; hy2 += 3) R(c, 8, hy2, 20, 1, P.sand); R(c, 8, 60, 20, 1, P.wood);
    R(c, 0, 24, 192, 3, P.wood); R(c, 0, 27, 192, 1, P.ink); for (var lx = 40; lx < 140; lx += 9) { R(c, lx, 16, 8, 8, P.yellow); R(c, lx, 19, 8, 1, P.sand); } // the hay loft up top
    R(c, 36, 66, 54, 2, P.wood); R(c, 36, 72, 54, 2, P.wood); for (var fp = 36; fp <= 90; fp += 18) R(c, fp, 62, 2, 18, P.wood); // a stall fence
    for (var nb = 0; nb < 3; nb++) { R(c, 104 + nb * 14, 46, 12, 10, P.wood); R(c, 105 + nb * 14, 47, 10, 8, P.bark); R(c, 105 + nb * 14, 52, 10, 3, P.yellow); } R(c, 102, 56, 44, 2, P.wood); // nest boxes
    R(c, 0, 80, 192, 28, P.wood); for (var s = 0; s < 40; s++) px(c, (s * 37) % 192, 82 + (s * 13) % 24, P.yellow); // straw floor
    R(c, 0, 79, 192, 1, P.ink);
    var gx = 40; st.has.slice().reverse().forEach(function (an, i) { if (gx > 186) return; var y = 98 + (i % 2) * 6, w = DRAW[an](c, gx, y, f), o = byId[an]; if (o) PL.marker(c, V, gx + w / 2, y - 26, o, function () { V.an = an; V.render(); }); gx += w + 4; });
    PL.aiu(c, 26, 102, f, V.happy && Date.now() - V.happy < 3000 ? 'happy' : 'open');
    R(c, 168, 92, 14, 8, P.slate); R(c, 169, 93, 12, 3, P.blue); // water trough
  }
  function barnView(V, S) {
    var b = V.body, st = PL.barnState(S), k = KK(), a = app(), hs = PL.barnHealth(S);
    if (V.an) { // 2.3.1: caring for one animal: feed, water, then one more job (eggs, milking, mucking out...), all hands-on
      var an = V.an, o = hs.filter(function (x) { return x.p.id === an; })[0], extra = (PL.BARN_JOBS[an] || ['poop']), jobs = ['feed', 'water', extra[(o ? o.n : 0) % extra.length]], step = 0;
      var back = function () { V.an = null; V.render(); };
      var next = function () {
        if (step < jobs.length) { var j = jobs[step++]; return PL.play(V, function () { return PL.BN_GAMES[j](an); }, next, back); }
        var kv = {}, first = !PL.lessonsToday(S, 'barn'), n = (o ? o.n : 0) + 1, herd = PL.herd(S, an), born = n % 4 === 0 && herd < HERDMAX[an];
        kv['fix:' + an] = today(); kv['fixN:' + an] = n; if (first) { kv.days = st.days + 1; kv.did = today(); } if (born) kv['herd:' + an] = herd + 1;
        PL.learned('barn', an, kv).then(function () { V.happy = Date.now(); a.beep('chirp'); V.an = null; V.render(); KK().snack(born ? BABY[an] : ANAME[an] + ': all taken care of.'); });
      };
      next();
      return;
    }
    b.appendChild(PL.card('How everyone is doing', [h('p', { cls: 'small', text: 'Each animal needs you about once a day. Tap one (in the picture or here) for its chore.' }),
      h('div', { cls: 'bparts' }, hs.map(function (o) { return PL.meterRow(o, function () { V.an = o.p.id; V.render(); }); })),
      st.next ? h('p', { cls: 'small', text: ANAME[st.next.an] + ' move' + (/^A /.test(ANAME[st.next.an]) ? 's' : '') + ' in after ' + st.next.in + ' more chore day' + (st.next.in === 1 ? '' : 's') + '.' }) : h('p', { cls: 'small', text: 'Every animal has moved in. Chore days: ' + st.days + '.' })]));
    b.appendChild(k.acc('barn-more', 'Practice with one animal', st.has.map(function (an) { return h('div', { cls: 'item' }, h('span', { cls: 'ititle', text: ANAME[an] }), k.btn('Practice', function () { V.chores = pickN(CHORES[an].map(function (c) { return Object.assign({ an: an }, c); }), 4, Date.now() & 0xffff); V.render(); }, 'mini')); }), false, st.has.length));
    if (V.chores) { var bx2 = h('div'); b.insertBefore(PL.card('Practice', [bx2]), b.firstChild); PL.quiz(bx2, V.chores, function () { V.chores = null; V.render(); }, { label: 'Chore' }); }
    b.appendChild(h('p', { cls: 'small', text: 'For learning. Real animals need a vet who knows them, and local rules can differ.' }));
  }
  PL.register({ id: 'barn', title: 'The barn', aria: 'Barn: look after the animals', draw: drawBarn, view: barnView, pending: function (S) { return PL.barnHealth(S).some(function (o) { return o.state === 'bad'; }); } });

  /* =====================================================================================
     THE GREENHOUSE
     ===================================================================================== */
  var SPECIES = {
    tomato: { name: 'Tomato', leaf: P.green },
    basil: { name: 'Basil', leaf: P.lime },
    sunflower: { name: 'Sunflower', leaf: P.green },
    pepper: { name: 'Pepper', leaf: P.teal }
  };
  var VARS = {
    cherry_red: { sp: 'tomato', name: 'Cherry Red tomato', col: P.red },
    yellow_pear: { sp: 'tomato', name: 'Yellow Pear tomato', col: P.yellow },
    sweet_basil: { sp: 'basil', name: 'Sweet basil', col: P.lime },
    purple_basil: { sp: 'basil', name: 'Purple basil', col: P.purple },
    giant_sun: { sp: 'sunflower', name: 'Giant sunflower', col: P.yellow },
    red_sun: { sp: 'sunflower', name: 'Red Sun sunflower', col: P.red },
    jalapeno: { sp: 'pepper', name: 'Jalapeño pepper', col: P.green },
    banana_pep: { sp: 'pepper', name: 'Sweet Banana pepper', col: P.yellow }
  };
  var START = { cherry_red: 3, sweet_basil: 3, giant_sun: 2, jalapeno: 3 };
  var STAGE = ['Sown', 'Sprouted', 'Seedling', 'Growing', 'Flowering', 'Ripe'];
  PL.VARS = VARS;
  // a seed key: a variety, or a cross "x:a+b" (F1), or "x:a+b:2" (F2: a surprise from the parents)
  function vinfo(key) {
    if (VARS[key]) return VARS[key];
    var m = /^x:([a-z_]+)\+([a-z_]+)(:2)?$/.exec(key || ''); if (!m || !VARS[m[1]] || !VARS[m[2]]) return { sp: 'tomato', name: 'Mystery seed', col: P.orange };
    var A0 = VARS[m[1]], B0 = VARS[m[2]], nm = A0.name.replace(/ (tomato|basil|sunflower|pepper)$/, '') + ' × ' + B0.name.replace(/ (tomato|basil|sunflower|pepper)$/, '') + ' ' + SPECIES[A0.sp].name.toLowerCase();
    return { sp: A0.sp, name: nm + (m[3] ? ' (F2)' : ' (F1 hybrid)'), col: m[3] ? null : P.orange, f2: !!m[3], hyb: true, pa: m[1], pb: m[2] };
  }
  PL.vinfo = vinfo;
  var CARE = [ // what each stage needs. sp = only for that plant
    [{ q: 'How deep do you plant a seed?', opts: ['About 2 to 3 times as deep as the seed is wide', 'As deep as your arm', 'On top of the soil, uncovered, always'], a: 0, why: 'Tiny seeds go barely under. Big sunflower seeds go about an inch down.' },
      { q: 'What do most seeds need to sprout?', opts: ['Moisture and warmth (soil like a wrung-out sponge)', 'Bright light and dry soil', 'Fertilizer'], a: 0, why: 'Most seeds don\'t need light to sprout, just steady moisture and warmth.' },
      { sp: 'pepper', q: 'Pepper seeds are slow. What helps them sprout?', opts: ['Extra warmth: soil around 80 to 85°F (a heat mat)', 'Cold', 'More seeds per pot'], a: 0, why: 'Peppers can take 2 to 3 weeks to sprout in cool soil. Warmth speeds them up.' },
      { sp: 'tomato', q: 'At what soil temperature do tomato seeds sprout best?', opts: ['About 70 to 80°F', 'Near freezing', '120°F'], a: 0, why: 'In warm soil they often pop up in about a week.' }],
    [{ q: 'The first two leaves look different from the rest. What are they?', opts: ['Seed leaves (cotyledons): food packed in the seed', 'Flowers', 'A disease'], a: 0, why: 'The "true leaves" that come next look like the grown plant\'s leaves.' },
      { q: 'The sprouts are tall, pale and floppy. Why?', opts: ['Not enough light: they\'re stretching for it ("leggy")', 'Too much light', 'They\'re happy'], a: 0, why: 'Seedlings want about 14 to 16 hours of strong light. Keep grow lights a few inches above them.' },
      { q: 'What\'s a gentle way to water tiny seedlings?', opts: ['From the bottom: set the pot in a tray of water for a few minutes', 'A firehose', 'Pour it hard on top'], a: 0, why: 'Bottom watering keeps stems from flattening and leaves dry.' }],
    [{ q: 'Three seedlings came up in one pot. What now?', opts: ['Thin them: snip the weaker ones at soil level and keep the strongest', 'Keep all three', 'Pull them all'], a: 0, why: 'Crowded seedlings fight for light and water. Snipping doesn\'t disturb the keeper\'s roots.' },
      { q: 'Before moving seedlings outside for good, what should you do?', opts: ['Harden them off: a little more time outside each day for about a week', 'Nothing', 'Freeze them'], a: 0, why: 'Sun, wind and cold shock tender plants that grew indoors.' },
      { sp: 'tomato', q: 'Transplanting a tomato. How deep?', opts: ['Deeper than before: tomatoes grow new roots along the buried stem', 'Exactly the same', 'Leave the roots in the air'], a: 0, why: 'Bury up to the first leaves for a stronger plant.' }],
    [{ q: 'Where should you aim the water?', opts: ['At the soil, deeply, not on the leaves', 'Only on the leaves', 'Into the air'], a: 0, why: 'Wet leaves spread fungus. Deep, less frequent watering grows deep roots.' },
      { sp: 'basil', q: 'How do you make basil grow bushy?', opts: ['Pinch off the top just above a pair of leaves', 'Never touch it', 'Pull off the bottom leaves'], a: 0, why: 'Two new stems grow from that spot. Pinching flowers off keeps the leaves sweet.' },
      { sp: 'tomato', q: 'The tomato is getting tall and floppy. What does it need?', opts: ['A stake or a cage to hold it up', 'Less light', 'To be cut down'], a: 0, why: 'Fruit gets heavy. Tie stems loosely with soft ties.' },
      { sp: 'sunflower', q: 'Young sunflowers turn east to west during the day. Why?', opts: ['They follow the sun (heliotropism) to catch more light', 'Wind', 'They\'re confused'], a: 0, why: 'Grown flowers stop moving and mostly face east, warming up in the morning sun.' },
      { sp: 'pepper', q: 'The pepper\'s leaves are yellowing at the bottom. A likely fix?', opts: ['A balanced feed: it may be hungry for nitrogen', 'Paint them green', 'Stop watering forever'], a: 0, why: 'Old lower leaves yellow first when nitrogen runs low. Overwatering can do it too: check the soil.' }],
    [{ sp: 'tomato', q: 'Tomato flowers pollinate themselves. How can you help indoors?', opts: ['Gently shake or tap the flowers to release pollen', 'Pick the flowers', 'Spray them with sugar'], a: 0, why: 'Bumblebees "buzz" the flowers outside. A shake or an electric toothbrush on the stem does it inside.' },
      { sp: 'pepper', q: 'It\'s over 90°F and the pepper\'s flowers are dropping. Why?', opts: ['Too hot: peppers drop flowers in big heat', 'Too much love', 'It\'s winter'], a: 0, why: 'Shade cloth in the hottest hours helps. They set fruit again when it cools.' },
      { sp: 'sunflower', q: 'A sunflower head is really what?', opts: ['Hundreds of tiny flowers (florets) packed together', 'One giant petal', 'A leaf'], a: 0, why: 'Each floret in the middle can become a seed. They spiral in a pattern linked to the Fibonacci numbers.' },
      { sp: 'basil', q: 'The basil is flowering. Fine for eating?', opts: ['Leaves get more bitter, but the flowers make seeds you can save', 'It\'s poison now', 'Flowers make it sweeter'], a: 0, why: 'Pinch flowers for eating; let one plant flower for seeds.' },
      { q: 'What does a flower need to make seeds?', opts: ['Pollen has to reach the stigma (pollination)', 'Darkness', 'Salt'], a: 0, why: 'Wind, bees, a shake or your brush carry pollen from the anthers to the stigma.' }]
  ];
  var SAVE = { // how to save the seeds of each
    tomato: 'Scoop the seeds and gel into a jar with a little water, let it ferment 2 to 3 days (stir daily), rinse, and dry the seeds on a plate.',
    basil: 'Let the flower spikes dry brown on the plant, then crumble them over a bowl. The seeds are tiny and black.',
    sunflower: 'Let the head dry until the back turns brown, then rub the seeds out with your thumb. Dry them a few more days.',
    pepper: 'Let a pepper ripen fully (to red or yellow), cut it open, and dry the seeds on a plate for a week. Use gloves with hot peppers.'
  };
  PL.greenState = function (S) {
    var G = PL.all(S, 'greenhouse'), pots = [0, 1, 2, 3].map(function (i) { return G['pot' + i] || null; });
    var seeds = G.seeds || (G.started ? {} : Object.assign({}, START)), book = G.book || {};
    var lastBox = G.box || '', boxReady = !lastBox || dayN(today()) - dayN(lastBox) >= 3;
    return { pots: pots, seeds: seeds, book: book, boxReady: boxReady, started: !!G.started };
  };
  function caredToday(p) { return p && p.care === today(); }
  function drawPlant(c, x, y, p, f) {
    if (!p) { return; }
    var vi = vinfo(p.s), sp = SPECIES[vi.sp] || SPECIES.tomato, st = p.st || 0, leaf = sp.leaf, col = p.c || vi.col || P.orange, sway = f % 16 < 8 ? 0 : 1;
    if (st === 0) { px(c, x, y - 1, P.bark); return; }
    if (st === 1) { R(c, x, y - 3, 1, 3, P.lime); px(c, x - 1, y - 4, P.lime); px(c, x + 1, y - 4, P.lime); return; }
    var hgt = vi.sp === 'sunflower' ? [0, 0, 7, 14, 22, 26][st] : vi.sp === 'basil' ? [0, 0, 5, 8, 10, 11][st] : [0, 0, 6, 11, 15, 17][st];
    R(c, x, y - hgt, 1, hgt, P.green);
    for (var i = 2; i < hgt; i += 3) { px(c, x - 1 - (i % 2), y - i + sway, leaf); px(c, x - 2 - (i % 2), y - i + sway, leaf); px(c, x + 1 + (i % 2), y - i - 1 + sway, leaf); px(c, x + 2, y - i - 1 + sway, leaf); }
    if (vi.sp === 'basil') { R(c, x - 3, y - hgt, 7, 3, vi.col === P.purple || col === P.purple ? P.purple : leaf); if (st >= 4) R(c, x, y - hgt - 3, 1, 3, P.white); }
    if (vi.sp === 'sunflower' && st >= 4) { disc(c, x, y - hgt, 3, col); disc(c, x, y - hgt, 1, P.bark); }
    if (vi.sp === 'sunflower' && st === 3) disc(c, x, y - hgt, 1, P.green);
    if ((vi.sp === 'tomato' || vi.sp === 'pepper') && st === 4) { px(c, x - 2, y - hgt + 3, P.yellow); px(c, x + 2, y - hgt + 6, vi.sp === 'pepper' ? P.white : P.yellow); }
    if ((vi.sp === 'tomato' || vi.sp === 'pepper') && st >= 5) { R(c, x - 3, y - hgt + 4, 2, vi.sp === 'pepper' ? 3 : 2, col); R(c, x + 2, y - hgt + 7, 2, vi.sp === 'pepper' ? 3 : 2, col); R(c, x - 2, y - hgt + 10, 2, 2, col); }
    if (p.x && st >= 4) { R(c, x - 4, y - hgt - 2, 8, 4, P.white); px(c, x, y - hgt - 3, P.silver); } // a little bag over the crossed flower
  }
  function drawGreen(c, V, S) {
    var g = PL.greenState(S), f = V.f;
    R(c, 0, 0, 192, 108, P.sky); for (var x = 0; x < 192; x += 24) R(c, x, 0, 2, 82, P.white); for (var y = 0; y < 82; y += 20) R(c, 0, y, 192, 1, P.white); // glass panes
    for (var d = 0; d < 192; d += 48) line(c, d, 0, d + 24, 12, P.cyan);
    R(c, 0, 82, 192, 26, P.bark); for (var s = 0; s < 30; s++) px(c, (s * 41) % 192, 84 + (s * 7) % 22, P.wood); // soil floor
    R(c, 52, 76, 132, 3, P.wood); R(c, 56, 79, 3, 20, P.wood); R(c, 176, 79, 3, 20, P.wood); // the potting bench
    g.pots.forEach(function (p, i) {
      var cx = 70 + i * 32; R(c, cx - 6, 66, 13, 10, P.orange); R(c, cx - 7, 64, 15, 3, P.orange); R(c, cx - 5, 64, 11, 1, P.bark);
      drawPlant(c, cx, 64, p, f + i * 3);
      if (p && !caredToday(p) && f % 12 < 6) px(c, cx + 8, 60, P.yellow); // needs you today
    });
    R(c, 10, 66, 16, 12, P.wood); R(c, 11, 67, 14, 4, P.sand); if (g.boxReady) { R(c, 14, 62, 6, 5, P.white); px(c, 16, 64, P.red); } // the seed swap box
    R(c, 160, 36, 10, 6, P.green); R(c, 160, 42, 10, 1, P.ink); line(c, 170, 39, 176, 30, P.slate); // a watering can on a shelf
    R(c, 70, 12, 100, 3, P.dark); for (var lx = 74; lx < 170; lx += 8) R(c, lx, 15, 5, 1, f % 40 < 38 ? P.yellow : P.white); line(c, 80, 0, 80, 12, P.slate); line(c, 160, 0, 160, 12, P.slate); // grow lights
    R(c, 26, 2, 20, 8, P.white); R(c, 27, 3, 18, 6, P.cyan); line(c, 26, 10, 22, 14, P.slate); // a roof vent
    PL.aiu(c, 38, 100, f, V.happy && Date.now() - V.happy < 3000 ? 'happy' : 'open');
    var at = { water: [165, 34], light: [120, 18], soil: [118, 76], vents: [36, 12], pests: [150, 56], glass: [12, 30] };
    PL.greenSys(S).forEach(function (o) { var p0 = at[o.p.id]; if (p0) PL.marker(c, V, p0[0], p0[1], o, function () { V.mode = { sys: o.p.id }; V.render(); }); });
  }
  // 2.3.0: the greenhouse's systems wear down too (water every few days, vents on hot days, a pest check every week...)
  var GSYS = [
    { id: 'water', name: 'Watering', days: 3, fresh: false, cards: [
      { q: 'The soil is dry an inch down. How do you water?', opts: ['Slowly at the base, until a little runs out the bottom', 'A quick splash on the leaves', 'Wait until the plants wilt'], a: 0, why: 'Deep, slow watering grows deep roots.' },
      { q: 'What\'s the best time of day to water?', opts: ['Morning', 'Midnight', 'The hottest part of the afternoon'], a: 0, why: 'Leaves dry off during the day, which helps keep mold away.' },
      { q: 'A drip line has stopped dripping. A good first fix?', opts: ['Flush the line and clean the clogged emitter', 'Build a new greenhouse', 'Water nothing for a week'], a: 0, why: 'Minerals and grit clog the tiny holes. A flush and a pin usually clear them.' }] },
    { id: 'light', name: 'Grow lights', days: 20, cards: [
      { q: 'Seedlings are tall, pale and floppy. The light is probably...', opts: ['Too far away or too weak', 'Too close', 'Too bright'], a: 0, why: 'They\'re stretching toward it. Lower the light to a few inches above them.' },
      { q: 'How long should grow lights run for seedlings?', opts: ['About 14 to 16 hours a day', 'All day and night', 'One hour'], a: 0, why: 'Plants need some dark time to rest, too. A cheap timer does it for you.' }] },
    { id: 'soil', name: 'Soil and compost', days: 14, cards: [
      { q: 'What goes into good compost?', opts: ['Greens (scraps, grass) and browns (dry leaves, cardboard), kept damp and turned', 'Meat, bones and dairy', 'Plastic bags'], a: 0, why: 'About two parts browns to one part greens. Turning it brings in air so it doesn\'t stink.' },
      { q: 'The potting soil is old and packed hard. What helps?', opts: ['Loosen it and mix in compost', 'Pour sugar on it', 'Bake it in the oven'], a: 0, why: 'Roots need air spaces. Compost feeds the soil and keeps it loose.' }] },
    { id: 'vents', name: 'Vents and temperature', days: 6, cards: [
      { q: 'It\'s 95°F inside the greenhouse on a sunny day. What do you do?', opts: ['Open the vents and the door, and add some shade', 'Close everything up', 'Turn on a heater'], a: 0, why: 'Greenhouses heat up fast. Most plants struggle above about 85 to 90°F.' },
      { q: 'Why keep the air moving in a greenhouse?', opts: ['Still, damp air grows mold and mildew', 'To make noise', 'It doesn\'t matter'], a: 0, why: 'A small fan or open vents keep leaves dry and stems strong.' }] },
    { id: 'pests', name: 'Pest check', days: 7, cards: [
      { q: 'Tiny green bugs crowd the new shoots and the leaves feel sticky. What are they?', opts: ['Aphids: spray them off with water (or soapy water), or bring in ladybugs', 'Baby butterflies', 'Seeds'], a: 0, why: 'Aphids suck sap and leave sticky "honeydew". Ladybugs eat them by the hundred.' },
      { q: 'Where do you look first for pests?', opts: ['Under the leaves and on new growth', 'Only on the pots', 'On the roof'], a: 0, why: 'Most pests hide underneath and go for the soft new leaves.' }] },
    { id: 'glass', name: 'Clean glass', days: 25, cards: [
      { q: 'The glass is dusty and green with algae. Why clean it?', opts: ['Dirty glass blocks sunlight the plants need', 'Only so it looks nice', 'Plants prefer the shade'], a: 0, why: 'A dirty greenhouse can lose a big share of its light. Wash it in early spring and fall.' }] }
  ];
  PL.greenSys = function (S) { var G = PL.all(S, 'greenhouse'); return PL.health(S, 'greenhouse', GSYS, G.sysStart || today()); };
  function greenView(V, S) {
    var b = V.body, g = PL.greenState(S), k = KK(), a = app(), sys = PL.greenSys(S);
    if (!PL.all(S, 'greenhouse').sysStart) PL.set('greenhouse', { sysStart: today() });
    if (V.mode && V.mode.sys) { // fixing a system: a question
      var so = sys.filter(function (x) { return x.p.id === V.mode.sys; })[0], done = function () { PL.fixed('greenhouse', so.p.id, so.n).then(function () { V.happy = Date.now(); a.beep('chirp'); V.mode = null; V.render(); KK().snack(so.p.name + ': good as new.'); }); };
      if (PL.GH_GAMES && PL.GH_GAMES[so.p.id]) { PL.play(V, PL.GH_GAMES[so.p.id], done, function () { V.mode = null; V.render(); }); return; } // 2.3.1: a hands-on mini game
      var sbox = h('div'), sq = pickN(so.p.cards, 1, U.hash32(so.p.id + today() + so.n))[0];
      b.appendChild(PL.card(so.p.name, [PL.meterRow(so, function () {}), sbox, k.btn('Back', function () { V.mode = null; V.render(); }, 'ghost')]));
      PL.quiz(sbox, [sq], done, { count: false });
      return;
    }
    function save(kv) { if (!g.started) kv.started = true; if (!('seeds' in kv) && !g.started) kv.seeds = g.seeds; return PL.set('greenhouse', kv); }
    function credit(id, kv) { var first = !PL.lessonsToday(S, 'greenhouse'); if (!g.started) { kv.started = true; if (!('seeds' in kv)) kv.seeds = g.seeds; } return (first ? PL.learned('greenhouse', id, kv) : PL.set('greenhouse', kv)).then(function () { V.happy = Date.now(); a.beep('chirp'); V.mode = null; V.render(); }); }
    if (V.mode && V.mode.care !== undefined) { // caring for one pot: a question for its stage
      var pi = V.mode.care, p = g.pots[pi], vi = vinfo(p.s), list = CARE[p.st].filter(function (q) { return !q.sp || q.sp === vi.sp; }), q = pickN(list, 1, U.hash32(today() + pi + p.s))[0], box = h('div');
      b.appendChild(PL.card(vi.name + ': ' + STAGE[p.st].toLowerCase(), [box, k.btn('Back', function () { V.mode = null; V.render(); }, 'ghost')]));
      PL.quiz(box, [q], function () { var np = Object.assign({}, p, { st: Math.min(5, p.st + 1), care: today() }); var kv = {}; kv['pot' + pi] = np; credit('care', kv).then(function () { KK().snack(np.st === 5 ? 'Ripe! Harvest it for seeds.' : 'It\'s ' + STAGE[np.st].toLowerCase() + ' now.'); }); }, { count: false });
      return;
    }
    if (V.mode && V.mode.cross) { // hand-pollinating two plants
      var cr = V.mode.cross, pa = g.pots[cr[0]], pb = g.pots[cr[1]], box2 = h('div');
      b.appendChild(PL.card('Cross ' + vinfo(pa.s).name + ' with ' + vinfo(pb.s).name, [box2, k.btn('Back', function () { V.mode = null; V.render(); }, 'ghost')]));
      PL.orderPuzzle(box2, { id: 'cross' + pa.s + pb.s, why: 'Crossing two varieties makes a new seed that carries traits of both parents. The first generation is called F1.', tools: ['tweezers', 'a small paintbrush', 'a little paper or mesh bag', 'a tag and pencil'],
        steps: [['Pick a flower on the mother plant that hasn\'t opened yet', 'before its own pollen is ripe'], ['Gently open it and pluck out its anthers (the pollen parts) with tweezers', 'so it can\'t pollinate itself'], ['Brush ripe pollen from the father plant\'s open flower', 'it looks like yellow dust'], ['Dab the pollen onto the mother flower\'s stigma (the tip in the middle)', ''], ['Cover the flower with a little bag', 'so bees can\'t bring other pollen'], ['Tag it with both parents\' names and the date', 'mother × father']],
        check: [{ q: 'You plant the F1 seeds, then save seeds from those plants (F2). What will the F2 plants be like?', opts: ['A mix: some like one grandparent, some like the other, some in between', 'All exactly the same', 'Exactly like the F1'], a: 0, why: 'Genes shuffle again in the F2. That\'s how breeders find new varieties, picking the best and saving their seeds for years.' }] },
      function () { var kv = {}; kv['pot' + cr[0]] = Object.assign({}, pa, { x: pb.s }); credit('cross', kv).then(function () { KK().snack('Crossed and tagged. Harvest the mother plant for hybrid seeds.'); }); });
      return;
    }
    if (V.mode && V.mode.harvest !== undefined) {
      var hi = V.mode.harvest, hp = g.pots[hi], hv = vinfo(hp.s), box3 = h('div'), n = 2 + (U.hash32(hp.s + today()) % 3);
      var out = hp.x && VARS[hp.s] && VARS[hp.x] && hp.x !== hp.s ? 'x:' + hp.s + '+' + hp.x : hv.hyb && !hv.f2 ? 'x:' + hv.pa + '+' + hv.pb + ':2' : hv.f2 ? 'x:' + hv.pa + '+' + hv.pb + ':2' : hp.s;
      b.appendChild(PL.card('Harvest: ' + hv.name, [box3]));
      PL.quiz(box3, [{ q: 'How do you save ' + SPECIES[hv.sp].name.toLowerCase() + ' seeds?', opts: [SAVE[hv.sp], 'Put the whole plant in the freezer', 'Plant the fruit whole, right away'], a: 0, why: 'Then store seeds cool, dry and dark in a labeled envelope. Most last a few years.' }], function () {
        var seeds = Object.assign({}, g.seeds), book = Object.assign({}, g.book), kv = {}; seeds[out] = (seeds[out] || 0) + n; book[hp.s] = (book[hp.s] || 0) + 1;
        kv['pot' + hi] = null; kv.seeds = seeds; kv.book = book;
        credit('harvest', kv).then(function () { KK().snack('You saved ' + n + ' ' + vinfo(out).name + ' seeds.'); });
      }, { count: false });
      return;
    }
    if (V.mode && V.mode.sow !== undefined) {
      var si = V.mode.sow, have = Object.keys(g.seeds).filter(function (s) { return g.seeds[s] > 0; });
      b.appendChild(PL.card('Sow a seed in pot ' + (si + 1), [have.length ? h('div', { cls: 'bchoices' }, have.map(function (s) {
        return k.btn(vinfo(s).name + ' (' + g.seeds[s] + ')', function () {
          var seeds = Object.assign({}, g.seeds), kv = {}, vi = vinfo(s), r = U.rng(U.hash32(s + Date.now()));
          seeds[s]--; var c0 = vi.f2 ? [VARS[vi.pa].col, VARS[vi.pb].col, P.orange][Math.floor(r() * 3)] : null;
          kv['pot' + si] = { s: s, st: 0, care: '', c: c0 }; kv.seeds = seeds; save(kv).then(function () { V.mode = null; V.render(); KK().snack('Sown. Care for it once a day and it grows a stage each time.'); });
        });
      })) : h('p', { text: 'No seeds left. Check the seed swap box, or harvest a plant.' }), k.btn('Back', function () { V.mode = null; V.render(); }, 'ghost')]));
      return;
    }
    if (!V.mode) b.appendChild(PL.card('Greenhouse systems', [h('div', { cls: 'bparts' }, sys.map(function (o) { return PL.meterRow(o, function () { V.mode = { sys: o.p.id }; V.render(); }); }))]));
    // the bench
    var crossable = [];
    g.pots.forEach(function (p, i) { g.pots.forEach(function (q2, j) { if (i < j && p && q2 && p.st === 4 && q2.st === 4 && VARS[p.s] && VARS[q2.s] && VARS[p.s].sp === VARS[q2.s].sp && p.s !== q2.s && !p.x && !q2.x) crossable.push([i, j]); }); });
    b.appendChild(PL.card('The potting bench', g.pots.map(function (p, i) {
      if (!p) return h('div', { cls: 'item' }, h('span', { cls: 'ititle', text: 'Pot ' + (i + 1) + ': empty' }), k.btn('Sow', function () { V.mode = { sow: i }; V.render(); }, 'mini primary'));
      var vi = vinfo(p.s);
      return h('div', { cls: 'item' }, h('span', { cls: 'ititle', text: 'Pot ' + (i + 1) + ': ' + vi.name }), h('span', { cls: 'tag', text: STAGE[p.st] + (p.x ? ' · crossed' : '') }),
        p.st >= 5 ? k.btn('Harvest', function () { V.mode = { harvest: i }; V.render(); }, 'mini primary') : caredToday(p) ? h('span', { cls: 'small', text: 'cared for today' }) : k.btn('Care', function () { V.mode = { care: i }; V.render(); }, 'mini primary'));
    }).concat([h('p', { cls: 'small', text: 'Each plant grows one stage per day you care for it. Nothing wilts while you\'re away.' })])));
    if (crossable.length) b.appendChild(PL.card('Two of a kind are flowering', crossable.map(function (cp) { return h('div', { cls: 'item' }, h('span', { cls: 'ititle', text: vinfo(g.pots[cp[0]].s).name + ' × ' + vinfo(g.pots[cp[1]].s).name }), k.btn('Cross them', function () { V.mode = { cross: cp }; V.render(); }, 'mini primary')); })));
    if (g.boxReady) b.appendChild(PL.card('The seed swap box', [h('p', { text: 'Someone left a seed packet in the swap box.' }), k.btn('Open it', function () {
      var missing = Object.keys(VARS).filter(function (v) { return !g.seeds[v] && !g.book[v]; }), pool = missing.length ? missing : Object.keys(VARS), got = pool[U.hash32(today() + 'box') % pool.length], seeds = Object.assign({}, g.seeds);
      seeds[got] = (seeds[got] || 0) + 3; save({ seeds: seeds, box: today() }).then(function () { V.render(); KK().snack('3 ' + VARS[got].name + ' seeds!'); });
    }, 'primary'), h('p', { cls: 'small', text: 'A new packet comes every few days. Real seed libraries and swaps work like this: many public libraries have one.' })]));
    var have2 = Object.keys(g.seeds).filter(function (s) { return g.seeds[s] > 0; });
    b.appendChild(k.acc('gh-seeds', 'Seed tin', have2.length ? have2.map(function (s) { return h('div', { cls: 'item' }, h('span', { cls: 'ititle', text: vinfo(s).name }), h('span', { cls: 'tag', text: g.seeds[s] + ' seed' + (g.seeds[s] === 1 ? '' : 's') })); }) : [h('p', { cls: 'small', text: 'Empty.' })], false, have2.length));
    var bk = Object.keys(g.book);
    b.appendChild(k.acc('gh-book', 'Harvest book', bk.length ? bk.map(function (s) { return h('div', { cls: 'item' }, h('span', { cls: 'ititle', text: vinfo(s).name }), h('span', { cls: 'tag', text: 'harvested ' + g.book[s] + '×' })); }) : [h('p', { cls: 'small', text: 'Your harvests will be listed here. Try to grow every variety, then a cross.' })], false, bk.length));
  }
  PL.register({ id: 'greenhouse', title: 'The greenhouse', aria: 'Greenhouse: grow and collect seeds', draw: drawGreen, view: greenView, pending: function (S) { var g = PL.greenState(S); var any = Object.keys(g.seeds).some(function (s) { return g.seeds[s] > 0; }); return g.boxReady || PL.greenSys(S).some(function (o) { return o.state === 'bad'; }) || g.pots.some(function (p) { return p ? !caredToday(p) : any; }); } });
})();
