/* AIU TOTEM 2.0 - the instructions book (Settings > Instructions). The same chapters can go in a PDF (Settings > Save as PDF).
   Plain words, one chapter per part of the app. Change the text here and both places follow. */
(function () {
  'use strict';
  var HELP = AIU.help = {};
  HELP.BOOK = [
    ['Welcome', [
      'Aiu Totem is a little pixel companion that grows up alongside you. You keep your day in order (tiles, a plan, a log), and Aiu grows from it: every step you finish, every entry you write and every calm thing you do helps it grow and evolve.',
      'Aiu doesn\'t chat. It reacts with little pixel pictures over its head. A small counter in its world shows what matters today, and once a day there\'s the Daily Hilltop: the reading, a look back and ahead, and one calm thing.',
      'Everything you add can be changed or deleted, and every delete has Undo.'
    ]],
    ['The screen', [
      'Top: five icons. Quest (your tiles), Plan (the calendar), Log (today, your journal, your profiles), Accounts (your logins, kept scrambled) and Settings (the gear). A small dot on the gear shows sync: green = synced, yellow = syncing, orange = waiting or offline, red = log in again, grey = this device only.',
      'Above Aiu\'s world: one chip across the top with the heart bar (growth) and the leaf bar (Aiu Vitals: the chip turns red when he\'s worn out; tap it to check in),. Full screen is in Settings > Look & sound.',
      'The bounty board in the yard (a corkboard inside) shows how many things matter today: reminders, bills, tiles due today and your "any time" tiles. A red pin blinks while a reminder rings. Tap the board for the list; Close puts it away.',
      'The little drone hovering in the sky is Aiu Vitals: its light is green when he\'s doing well, yellow when he\'s getting tired, and blinks red when he\'s worn out. Tap it (or the leaf bar) and the Vitals open on top; Close takes you back.',
      'Aiu goes inside and outside on his own schedule (rain, bedtime and indoor hobbies bring him in). You can send him too: tap the house and he finishes what he\'s in the middle of, then walks to the door and goes in. Inside, tap the front door and he heads back out. Changed your mind? Tap the house (or the door) again before he gets there and he turns around and goes back to what he was doing. He stays put for about half an hour, unless it\'s bedtime.',
      'Everything with Aiu waits its turn: if he\'s busy (tossing the I Ching coins, a little hop), the next thing starts when he\'s done.',
      'Tap Aiu for a pat on the back: a heart and a music-box note float up, and he keeps right on working. Keep patting and the notes play a little tune. Rub him (drag side to side over him) for a back rub: more hearts. Every 10 pets = +1 growth, up to 3 a day. When he\'s worn out, a pat asks you one Vitals question right there.',
      'Tap your travel buddy to pet it, and the care bar opens under the world: Snack throws it a treat, Water splashes its bowl, as many times as you like. Its tummy fills up, and once it\'s full it does a trick or takes a nap instead. Rub it and it purrs. Games opens the mini games. Just for fun: no points. Aiu looks after it on his own too. Inside, the computer on the desk opens the games.',
      'The whole world is always shown: the house, the buddy, the bounty board and Aiu. Settings > Look & sound > Show the world full screen makes it fill the screen.'
    ]],
    ['Quest: tiles', [
      'A tile is anything you want to get done: water the plants, clean your room, call a friend, a trip to the store, a walk outside. Tap + New tile and type its name.',
      'Aiu then asks for the missing pieces, one tap at a time: When (today, tomorrow, every day, every week, a part of every year...), Who and How long (for walks, pets, visits), and the Steps. Pieces turn green when they\'re filled. Tap any piece to change it.',
      'When: pick On a date (tap the box for the calendar, or type it like 01/02/2027), Repeat (tap the days of the week: M T W T F S S, or Every day / Weekdays / Weekends; every week, every other week or once a month, from a start date) or Any time. Add a time for a reminder.',
      'More than once a day: add another time (brush teeth at 8am and 9pm). Each time is its own finish and its own reminder: finish it in the morning and it hides until the evening time comes.',
      'Status is a traffic light: green = Go (ready to do), yellow = Doing (it turns yellow by itself when you check off a box), red = Done (it turns red by itself when the last box is checked). Tap a light to change it. Repeating tiles turn green again on their own: daily ones tomorrow, weekly ones next week, season ones next year.',
      'Finishing a tile: +5 growth, plus +2 for each step. Calm tiles (a walk, a bath, reading, music...) also feed your Aiu Vitals.',
      'Search and the filters (All, Go, Doing, Done, Repeats) find any tile (Archived shows the ones you archived). Each tile card shows its light in the corner.',
      'Aiu keeps every tile in one order: overdue, today, in season, missing pieces, then the rest of the green ones.'
    ]],
    ['Task lists and shopping lists', [
      '+ New tile asks which kind. A task list has to-do boxes: it turns yellow when you check the first one and finishes by itself (red, +5) when you check the last one. The red light stays locked until every box is checked. A tile with no boxes has a Done button.',
      'A shopping list: add the things to get (with commas: "milk, bread, apples"; put the store in brackets: "Bread (Corner store)"). Check them off as you buy them, then Done shopping clears what you got and keeps the rest.',
      'Made a mistake? Right after finishing there\'s an Undo for a few seconds, and a finished tile always has Undo complete: the boxes come back the way they were, minus the last one. Tapping the green light on a red tile does the same. Undoing and redoing never earns points twice.',
      'Rename, Archive and Delete are at the bottom of each tile. Archived tiles keep everything; open one and tap Restore it to bring it back.'
    ]],
    ['Plan', [
      'Plan is your calendar. It shows the tiles on the day you pick, today to start with. Tap a day to see it, This week for the whole week, or Pick days and tap the first and last day for a stretch of days.',
      'Each tile shows its light: today you can tap it (green, yellow, red). Tap a tile\'s name to open it. A tile that happens in a season shows as a yellow stretch of days.',
      'Plan only shows things. To add something, make a tile in Quest and give it a day or a repeat: it appears on the Plan by itself, with its reminder.'
    ]],
    ['Log: Today', [
      'Today, top to bottom: the date, the Daily Hilltop (today\'s reading and Aiu\'s Hilltop View, in one card), today\'s entry and the tile log. Each part folds open and closed.',
      'The Daily Hilltop: each day\'s reading is set at midnight (the same on all your devices). The next time you\'re on Aiu and he\'s free (not hatching, walking in or out, or playing, and no window open), he tosses three coins six times in the yard and the reading appears in Log > Today. Nothing to tap and no reminders. Read more has the whole reading and your past readings.',
      'Today\'s entry: a question to get you going (Another question for a different one). Write, or tap Talk it and speak. 80+ letters grows Aiu +10. Calm things you mention ("I went for a walk") count in your Vitals.',
      'Tile log: when you add, change, check off or finish a tile, a line is written here by itself, with the time.',
      'Aiu\'s Hilltop View, under the reading: Aiu\'s overview of you. How yesterday went (what got done, what got missed), anything still waiting, what\'s left today, your Vitals and your journal streak.'
    ]],
    ['Log: Journal', [
      'Journal summary (at the top): Aiu\'s overview of your whole journal, rebuilt every time it changes: how long you\'ve been writing and your streak, the I Ching pattern (readings that keep coming back, the latest themes), what you write about most, what got done this week, and a heads up on anything waiting.',
      'Contents: every day you wrote, cast or logged something, grouped by month. Pick Newest or Oldest first, and which days to show (entries, readings, tile updates, check-ins). Tap a day for its page: the Daily Hilltop, your entries, the tiles and your Vitals check-ins.',
      'Search: type words and tap Search (or Go on the keyboard). It finds the days with all of them, in entries, notes, readings and check-ins. Glossary: the words and names you use most; tap one to search it.'
    ]],
    ['Log: Profiles', [
      'Your folder (with your name) and each business are folders. Aiu asks for the empty pieces one at a time (Skip is always fine).',
      'Your folder is your profile: Personality (the quiz and your type), how well Aiu knows you (the 21 questions: either/or personality questions, and what calms you or stresses you), what calms you (your answers, with Change) and Finance. Your name, address, email and phone are on your Me card in Accounts. Under "knows you", Your answers lists everything you\'ve answered: tap a different answer to change it. The personality quiz has a Back button and marks your last answers.',
      'Each business: its profile (what it does, address, tax ID), its people, its papers (business plan, proposal and more, filled in from the profile), outreach drafts, and its own Finance.',
      'Finance: money in and out, bills (check them off when paid), cash flow for 6 months, a T-chart and net worth. Your money and each business\'s money are kept apart.'
    ]],
    ['Aiu Vitals', [
      'Aiu Vitals are Aiu\'s character stats: his health, kept up by the calm things you do in real life, on your own time. They are separate from your tiles. Tap the drone in the sky (or the leaf bar above the world) and they open on top of whatever you\'re doing.',
      'Five body parts: Brain (calm focus), Heart (connection), Arms & legs (movement), Gut (fuel) and Rest (recharge). Each part wears down a little every hour.',
      'Check-ins: Aiu asks one thing at a time, starting with the part that\'s lowest and the things you said calm you ("Did you brush your teeth this morning?"). Yes fills that part. Not yet: make a tile so you remember, or skip it for today. Go do it, come back, say Yes, and the next question comes up. You can also tap a body part and pick what you did.',
      'At 90% Aiu grows +10 (once a day). If his Vitals run down (the bar above the world goes red), Aiu is distressed: he carries on as normal but looks tired and doesn\'t grow until you do something calm and check it in. A brand-new Totem gets 3 days before that can happen. Tap a tired Aiu and he asks you a question right there.',
      'What calms you comes from your Profile ("Aiu knows you": "Does walking outside calm you down?"). Things that stress you are noted there so Aiu knows, but they never count against you.',
      'LOG: today\'s check-ins (X removes one) and the week. INFO: what feeds each part. Educational only, not medical advice.'
    ]],
    ['Accounts', [
      'A phone book for your logins: name, username, password, email, website and notes, with labels and search. On a synced Totem every card is scrambled with your Aiu password before it leaves the device, so the server can\'t read it. Each device asks for your Aiu password once.',
      'Your own card (Me) sits at the top: your name, home address, email and phone, and anything else you add. It\'s made for you the first time you open Accounts, and it can\'t be deleted.'
    ]],
    ['Mini games', [
      'Your travel buddy waits by the house: a horse, a dog, a cat, a Bear Dog (a bear with a long dog tail), a penguin, an eagle or a parrot (on their post), a ghost or a conjure (a little star spirit from a summoning circle). Tap it and choose Games. When Aiu is inside, the buddy stays out and the computer on the desk opens the games. Settings > Aiu & buddy picks the buddy and its gear (a saddle, a collar, a backpack or nothing). Ghosts, conjures and birds never wear gear.',
      'The buddy shows how your week went: a halo (Light) after a week of calm check-ins, little horns (Shadow) when Aiu is worn out and there were hardly any, nothing in between.',
      'Slice: 40 seconds on the beach: swipe the flying seashells and logs, and don\'t crack the rainbow eggs; 30 to win. Combos (3 or more in one swipe) add seconds, up to 40 more. Wilds: a quick battle with a wild creature; tap when the ring meets the target, and Block right when the "!" shows. Wilds Cup: three battles in a row, then the champ.',
      'Spar: box with your Aiu. Jab left and right; hold Block when it winds up (it flashes), then counter fast while it\'s dizzy. Dash: a foot race; tap left, right, left, right and Jump the hurdles.',
      'Fling: 45 seconds. Tap fast to charge, swipe to throw Aiu through the valley forest, down the foothills and into the cave; throw it again whenever it slows down. Score is distance, coins, gems and trees knocked over; reach the treasure to win. Gems add 3 seconds and every 5 coins add 1 (up to 45 more).',
      'Drop: build a drone (frame, thrusters, battery), fly the package over the hill, Drop it on the board (the middle is 100), then land slow and level on the pad before the battery runs out.',
      'A win grows Aiu +1, up to 3 wins a day. Undoing and replaying can\'t farm it.'
    ]],
    ['Growing and evolving', [
      'Aiu hatches from an egg into a random type (Settings > Creature type changes it) and evolves inside that type. What he turns into is a surprise: each evolution rolls its own colors, markings and shape, nudged by his strongest Vitals part at the time.',
      'What helps: entries (+10 for 80+ letters), tile steps (+2) and finished tiles (+5), Vitals check-ins (+2), answering Aiu\'s questions (+2), petting (+1 per 10), mini game wins (+1, up to 3 a day), full Vitals (+10 once a day). There\'s a daily cap, and a worn-out (distressed) Aiu doesn\'t grow. Each finish and each step counts once: undoing and doing it again (Start it again, flipping the light back) doesn\'t earn more.',
      'Aiu also lives its own little life: fishing, flying a kite, building a birdhouse (when it\'s done, a bird moves in), birdwatching, chasing butterflies, writing in his own journal, tidying up, a jigsaw puzzle, a sandcastle or a snowman. Each one takes a while, and he works through everything he likes before anything comes round again. What he made earlier today stays in the yard.'
    ]],
    ['Looks', [
      'Settings > Look & sound: light, dark, or match your device; Classic, Green, Blue or Red; text size; full screen. Aiu\'s voice is a creature babble (or a real voice from your device, or silent): picking one plays a sample. The reminder sound has its own setting and test button.'
    ]],
    ['Saving and your data', [
      'Settings > Account & data > Save as PDF: check off what you want (tiles, plan, journal pages, readings, Vitals, finance, business papers, account cards, this book) and get one PDF to keep or print.',
      'Settings > Account & data > Download capsule: the whole Totem as plain files, for a USB drive. Import a capsule to bring it back.',
      'A synced Totem keeps working offline and catches up when the internet comes back. A device-only Totem lives only in this browser: download a capsule now and then.'
    ]],
    ['Account server', [
      'Accounts (sign up, log in, sync) need the small server file next to the app on your web host. There are two copies of the same server: api.php (PHP, works on almost every host, including WordPress / DirectAdmin) and api.cgi (Ruby). The app tries api.php first, then api.cgi, and remembers the one that answers.',
      'To check it, open your-site/aiu/api.php?a=ping in a browser. A good server shows a line of text starting {"ok":true,"app":"aiu-totem" with "data_folder_ok":true. A blank page, a download, "File not found" or an error page means the file is missing or the host isn\'t running it.',
      'If sign-up says "The account server isn\'t answering": upload api.php into the aiu folder (the same folder as index.html), make sure its permissions are 644 (the File Manager shows them), and open the ping link again. The server keeps accounts in a private folder called aiu_data beside public_html, and makes it by itself.',
      'Prefer the Ruby copy? api.cgi needs permissions 755, Ruby installed on the host, and CGI turned on (the two lines at the top of the aiu folder\'s .htaccess file). If the whole folder shows a 500 error after turning those on, the host doesn\'t allow it: put the # back and use api.php.'
    ]],
    ['Help and safety', [
      'Aiu is a little companion, not a counselor or a doctor. If you are ever in crisis, contact your local crisis line or emergency number (in the US, call or text 988).'
    ]]
  ];
  // the book as PDF blocks
  HELP.doc = function () {
    var b = [{ t: 'title', text: 'Aiu Totem: instructions' }, { t: 'sub', text: 'Version ' + ((AIU.app && AIU.app.cfg && AIU.app.cfg.version) || '2.0') }];
    HELP.BOOK.forEach(function (ch) { b.push({ t: 'h1', text: ch[0] }); ch[1].forEach(function (p) { b.push({ t: 'p', text: p }); }); });
    return { title: 'Aiu Totem instructions', blocks: b };
  };
  // the book on screen: one accordion per chapter
  HELP.sheet = function () {
    var ui = AIU.ui, k = ui.k, h = AIU.util.h;
    k.sheet('Instructions', HELP.BOOK.map(function (ch, i) {
      return k.acc('help-' + i, ch[0], ch[1].map(function (p) { return h('p', { text: p }); }), i === 0);
    }));
  };
})();
