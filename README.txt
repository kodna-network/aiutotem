AIU TOTEM 3.6.2 - install guide
==============================

Aiu Totem is a web app: one address (kodna.net/aiu) that works on your iPhone, your
Windows PC and the Raspberry Pi 2. Each device keeps its own copy of the Totem and works
offline. When a device is online it syncs through one small file on your server
(the "mailbox": api.php, or its Ruby twin api.cgi). The server keeps ONE live copy of each Totem. There are no server backups.

Aiu Totem is free for personal, private use in a web browser. Nothing is sold, there are
no ads, and each Totem is private to its account. No licenses are involved: everything in
the zip is made by KODNA or is public domain (see CREDITS at the bottom).

ACCOUNTS
  Anyone can sign up with a username and a password (no invite code). To stop new sign-ups, set SIGNUPS_OPEN to '0'.
  There is no admin login and no way to recover an account (2.7.0). A lost password means starting over.
  Change username: Settings > Account & data > Change username (2.8.0). The old name is free for anyone right away.
  Deleting accounts as the server owner: there is no admin screen. Either delete the folder
    aiu_data/accounts/<username> in DirectAdmin > File Manager (that account is gone for good), or set
    DELETE_INACTIVE_DAYS (below) and accounts nobody has used for that many days are deleted by themselves.
  Private data (2.8.0): the server can't read anyone's Totem. See WHAT'S NEW IN 2.8.0.

WHAT'S NEW IN 3.6.2
  Upload: the whole aiu folder (api.php and api.cgi only changed their version).
  - The pet stays in the bailey, day and night (at night it rests by the front steps instead of going up to the bedroom).
  - Fixed: the I Ching toss started while Aiu was still in his room (the coins and the cast bubble over his head), and
    then he walked out and finished it in the bailey. Now he walks out first and the toss starts once he's there.
  - Accounts: your own card is now labeled Main (it was Me), and the label is permanent. It sits at the top of Cards
    under its own heading, and its editor is made for you: your name, email and phone, then as many details as you
    like (name each one, tick hide for anything private, move them up), and notes.

WHAT'S NEW IN 3.6.1 - SYNC FIXES
  Upload: the whole aiu folder, including api.php and api.cgi (both changed).
  - Fixed: a device that lost its log-in (after a password or username change on another device, or a log-out) sat at
    "N waiting to sync" with no way to log back in once the app had been closed and opened again. Now it says
    "Log in to sync", the banner shows, and Settings has a Log in again button. Log in and everything that was waiting
    goes up; nothing is lost.
  - Fixed: since private sync (2.8.0) every change is scrambled before it leaves the device, which makes it bigger, but
    the server's size limit stayed the same, so a long journal page could be dropped without a word. The limit is now
    32 000 bytes per change (MAX_EVENT_BYTES in api.php / api.cgi), with room for the scrambled copy.
  - If the server ever does turn a change down, the sync line now says so instead of showing "waiting" forever (the
    change stays saved on the device).

WHAT'S NEW IN 3.6.0 - THE BAILEY
  Upload: the whole aiu folder (api.php and api.cgi only changed their version).
  - Motte and bailey: the castle stands on a motte (a grassy mound with stones in the grass), and a wooden flying
    bridge runs down from the front door to the bailey's back gate.
  - The bailey: a yard fenced with a wooden palisade (back, sides and front), a trodden yard and a lane down the
    middle, the main gate with two little roofed posts, and a drawbridge over a ditch of water with reeds.
  - Bailey buildings, on four plots inside the palisade: granary 70, cowshed 80 (two cows swishing their tails),
    workshop 90 (a smithy: the forge glows, sparks fly, smoke curls from the chimney), stables 100 from Sprout
    (horses over their half-doors), barracks 120 from Sprout (shields and a spear rack, ready for the raids that
    come in a later version). Build mode: tap a plot's + to build, tap a building to move it or take it down (all
    its tokens back). Tap one when you're not building: Aiu walks down the bridge and the lane and pops in.
  - The six spots for the board, the food cart, the well, the pond and the rest are in the front of the bailey.
  - The picture is 320 x 760 (drawn 3x), so the World page scrolls a little more.

WHAT'S NEW IN 3.5.0 - LAID OUT LIKE THE ELDER SCROLLS: CASTLES
  Upload: the whole aiu folder (api.php and api.cgi only changed their version).
  - Cells: the castle has five floors of 12 cells each. A room takes 4 cells and can be widened 4 cells at a time
    (40 tokens) into an empty chamber beside it, up to a whole floor; a wide room gets more of its kind of
    furniture in the extra cells (a fireplace and an armchair, a dining table, a wardrobe, a shower, a bicycle...).
  - The throne hall: the heart of the castle, in the middle of the ground floor, with Aiu's throne, a candle
    chandelier, banners in his colors and stone pillars. It can widen but never moves or goes away. Aiu sits on his
    throne now and then.
  - Staircases: build one on any spot (20 tokens) to link a floor with the one above. You start with one by the
    throne hall. Aiu takes the stairs or the elevator, whichever is shorter.
  - The elevator moved to a tower on the right (the observatory sits on top of it), and the front door is under
    the throne hall.
  - Partitions: between two rooms there's a solid wall with a doorway; open it into an archway (free) and the two
    rooms read as one big space. (The solid wall takes a few pixels from each side, not a whole cell.)
  - Selling gives back exactly what you paid: rooms, widening, stairs, things in the courtyard, the observatory and
    the windmill.
  - The fifth floor opens at Ranger. A 3.4 castle keeps every room in its chamber; a room where the throne hall
    goes moves to the first free chamber.
  - The picture is 320 x 550 (drawn 3x).

WHAT'S NEW IN 3.4.0 - THE SHELL AND THE ELEVATOR
  Upload: the whole aiu folder (api.php and api.cgi only changed their version).
  - The castle is one big shell now: all twelve chambers stand from the start (bare stone, a plank floor, a crate or
    a broom), and building a room furnishes one. Floors that aren't open yet are boarded up.
  - An elevator replaces the ladder: a shaft between the first two columns with a landing on every floor. Aiu walks
    to it, rides up or down in its little car, and walks to his room. The elevator tower rises above the roofs, and
    the observatory sits on top of it.
  - Rooms go anywhere: any chamber on an open floor (the garage at the top, the bedroom on the ground floor). No
    more "a room needs a room under it".
  - The pond is a whimsical fountain pond (after the Fountain of Life in Bosch's Garden of Earthly Delights): a ring
    of mossy rocks, lily pads, a pink ribbed fountain with curling arms and a glassy blue orb, water arcing down, a
    fish that jumps now and then. The well goes next to it.
  - The garden is a proper vegetable bed now: a sunflower, tomatoes on a stake, a cabbage (a pumpkin in the fall),
    carrots and a little sign.
  - The windmill stands on the hill behind the castle (it doesn't take a courtyard spot any more; a windmill you
    already had moves up there).
  - The drone has beacon lights on top (red, green and blue, blinking in turn), so it's easy to spot.
  - The picture is 320 x 470 (drawn 3x).

WHAT'S NEW IN 3.3.0 - THE CASTLE STANDS UP
  Upload: the whole aiu folder (api.php and api.cgi only changed their version).
  - The castle now looks like The Elder Scrolls: Castles: it stands on a stone terrace and grows UP, floor by floor,
    instead of being dug into the ground. Stone walls and floors between the rooms, arched ceilings, buttresses on
    the outside walls, and a roof on top of each column that moves up as you build (red pointed roofs and
    battlements with a flag for stone, ice spires on the tundra, onion domes in the desert, or rooms carved into a
    mountain for the cave).
  - A room needs a room under it (or the ground). Empty spots between the stairs and a room get a plank walkway.
  - The courtyard is in front: the front door and steps, two lanterns, a cobbled path, and the six spots for the
    board, the food cart, the well and the rest.
  - Behind the castle: mountains and a hillside whose ridge rises with the castle. The strange creatures walk along
    the ridge (tap one).
  - The observatory sits on the roof of the right-hand tower; Aiu climbs a ladder up the outside to stargaze.
  - The picture is 300 x 444 (drawn 3x). A 3.1 or 3.2 castle settles onto the terrace: each column keeps its rooms
    in order, now from the ground up.

WHAT'S NEW IN 3.2.0
  Upload: the whole aiu folder (api.php and api.cgi only changed their version).
  - The pet is just for looking after now: tap it for Water, Feed and Brush. Brushing strokes a brush along its back
    and it purrs. Three bars (water, tummy, brushed) slowly empty over a few hours; full, it does a trick instead.
  - The mini-games moved to the computer in the office: tap the computer and the dice pick a game. That's the only
    way in now (no Play button on the pet). The office is free to build, so the games are there from day one.
  - Fixed: Feed and Water did nothing in the castle (3.0 and 3.1 thought the pet was indoors).

WHAT'S NEW IN 3.1.0 - BIGGER ROOMS
  Upload: the whole aiu folder (js/castle.js was rewritten; api.php and api.cgi only changed their version).
  - The castle picture is bigger (288 x 405, drawn 3x) and each room is twice the size: 3 rooms across, 4 floors,
    12 rooms in all. Every room is one of a kind (no more joining two of the same).
  - The 12 rooms: living room, kitchen, bedroom, bathroom (the seed you start with), then office (free since 3.2), library 80,
    garage 90, music room 100, art studio 100, greenhouse 120 (hydroponics under LED grow lights), lab 150 and
    stable 150. The top two floors are open from the start, the third at Sprout, the fourth at Scout.
  - New room art, cuter and more detailed: wallpaper and wainscot, curtains, a fish tank, a fridge with a drawing on
    it, a quilt in Aiu's colors, a clawfoot tub with a rubber duck, a pegboard, hydroponic racks, an upright piano,
    an easel, a 3D printer, hay bales and chickens. The Corner Mart's wall art and rugs show up in the rooms.
  - Aiu does his own little animation in each room: stirring a pot at the stove, chopping, making tea, the dishes,
    sleeping tucked in under his quilt (Zzz), brushing his teeth, soaking in the tub, gaming, typing, lifting
    weights, building a birdhouse, watering the hydroponics, yoga, reading in the armchair, guitar and piano,
    painting (the canvas fills in), pottery, the 3D printer, feeding the chickens, and more. The status line says
    what he's doing in the castle's own words. No room for it yet: he does something close in the living room.
  - Outside: six spots (well 30, outhouse 30, banner 25, tool shed 40, garden 60, pond 70, windmill 90, statue
    200). The garden is the outdoor one, the greenhouse the indoor one: you can have both. He goes outside for the
    stand-up, the food cart, the I Ching, the pet, fishing, the garden and the observatory. No outhouse? He uses
    the bathroom (he sits on the toilet once he gets there).
  - The observatory (180 tokens, Scout) isn't a room: it pops up off the castle's right tower, and he climbs up
    to stargaze at night.
  - The strange creatures wander the hillside behind the castle again (tap one). At night the pet curls up at the
    foot of Aiu's bed; by day it wanders the grounds on the right. When Aiu looks after it, they meet at the gate.
  - A 3.0 castle carries over: its rooms move into the new grid (the workshop becomes the garage), and the things
    outside keep their spots.
  - Not in this version: raids and defense (a later version).

WHAT'S NEW IN 3.0.0 - THE CASTLE
  Upload: the whole aiu folder (there's a new file, js/castle.js; api.php and api.cgi only changed their version).
  - One picture instead of a yard and a house: Aiu's castle. On top, the sky, the drone and the grounds, with the
    gatehouse in the middle and four spots outside. Below, rooms dug into the ground, Fallout Shelter style, joined by
    a ladder under the gate. Aiu walks it all: along each floor, up and down the ladder, out onto the grounds.
  - Its look comes from your land: a stone castle (meadow, forest, pond, beach), an ice castle (tundra), a desert dome
    (desert), a cave dome (when the house is the cave).
  - It starts as a seed: four rooms (living room, kitchen, bedroom, bathroom), with the bounty board, the food cart and
    a well outside. As Aiu grows, more ground opens: the ends of the top floor first, then a new floor at Sprout,
    Scout and Ranger (a 4 x 4 castle at most).
  - Build mode: the hammer under the picture (it took the place of Go inside / Go outside). Tap a + to build a room or
    something outside, with tokens: office 60, workshop 90, greenhouse 120, lab 150, stable 150; well 30, outhouse 30,
    banner 25, tool shed 40, garden 60, pond 70, windmill 90, statue 200 (Ranger). New rooms go next to the ones you
    have. Two of the same room side by side join into one big room. Tap a room to Move it (it swaps with what's there)
    or Remove it (half its tokens back). The four first rooms, the board and the cart move but stay.
  - Aiu goes to the room for what he's doing: the kitchen to cook, the bathroom, his bed at 10 pm, the office to play
    or write, the workshop to work out, the greenhouse for yoga, the lab to tinker. Fishing takes him to the pond if
    you built one; cooking at the cart puts him in it. The pet wanders the grounds on the left, out of his way.
  - Tap a room: the workshop, greenhouse, lab and stable open their own pages (the garage, greenhouse, lab and barn);
    the office opens the games. Hold Aiu and drop him on the bed, in the kitchen or on the board.
  - The layout is saved with the Totem (the setting 'castle'), so it's the same on every device.
  - The old yard and house pictures are still in js/world.js (unused while the castle is on: A.CASTLE in castle.js).

WHAT'S NEW IN 2.9.0
  Upload: the whole aiu folder (api.php and api.cgi only changed their version number).
  - World: one card right under the picture: what Aiu is doing on top, then four icon buttons: the house or the tree
    (go inside / outside), the heart (growth), the leaf (Vitals) and the token (your wallet).
  - Log > Today: two sections. Today's I Ching (the word, the number, the changing lines, then one paragraph that
    translates it, explains it and gives suggestions), then today's entry (write or talk it, what you wrote, what got
    done). No folds, no Hilltop view, no past readings (every day in the Book keeps its reading), no Add to another
    day (open that day in the Book instead).
  - Accounts: Cards, Person and Finance (the Files tab is gone; files already saved still go into capsules).
  - Shop: Buy asks "OK?" in a pop-up with YES and NO.
  Smoother moves (from a check of every walk and tap):
  - Send Aiu inside while today's I Ching toss is due: he stays in (the toss waits) instead of walking right back out.
  - A kitchen or bathroom job walks him in through the front door and through the house (it used to cut straight to
    the room while he was still in the yard, then pop him to the door); leaving the house walks him out the same way.
  - In a room he walks all the way to where he works (no more popping to the sink at the end of a walk).
  - Tap the door while he's still walking away from it: he turns around where he is (no pop to his spot and back).
  - Tap the door while he's already heading that way by himself: he keeps going and stays there a while (it used to
    turn him around and flip the picture).
  - Tap the door or a building during a visit or a walk: he finishes the first thing, then does the next (two walks at
    once made him jump across the yard). The bounty board's stand-up never starts in the middle of a walk.
WHAT'S NEW IN 2.8.0
  Upload: the whole aiu folder, INCLUDING api.php and api.cgi (both changed).
  - Private data on the server. Every synced Totem is scrambled (AES-GCM) on your device before it leaves:
    each event's contents (journal, tiles, plans, names, everything), the device names, the profile names and the
    Totem summary. Each account has one data key; the server keeps it only locked with your password, so the
    server (and KODNA) can't open it. The old journal/ copy on the server is gone.
    What the server still sees: usernames, when things were saved and what kind they were (say, "a journal entry",
    not what it says), and how big the files are.
    After this update each device asks for your password once (it needs it to get the key). The first device that
    syncs scrambles the older events already on the server, once. An old 2.7.0 page can't sync to a private account:
    it says "Reload Aiu"; reloading gets 2.8.0.
  - Change username (Settings > Account & data). Pick any free name; the old one is free for others right away.
    Your other devices ask you to log in with the new name (nothing is lost).
  - DELETE_INACTIVE_DAYS (server setting, off by default): deletes accounts nobody has used for that many days.
  - Tiles: "Go" is now "Do" (green = Do, yellow = Doing, red = Done).
  - Tile labels: sort tiles into groups you name (Home, Exercise, Errands, Work, Health, Fun to start). A new tile
    guesses its label from its name (Fix fence: Home; Walk dog: Exercise). Each label is a filter on the board, in
    front of Archived and the Discard pile. Labels... renames them, recolors them, adds or deletes them. Change a
    tile's label at the top of the tile. The Plan shows each tile's label.
  - Duplicate: a copy of a tile with the same steps, label and when (boxes unchecked).
  - World: the yard is as tall as the house now. Arrange is gone; instead everything has more room: the barn,
    the well, the house, the outhouse and the lab behind the stream, and a new front yard with the greenhouse,
    the garage, the tool shed, a vegetable garden that changes with the seasons, a bench, a bird bath and a gate.

WHAT'S NEW IN 2.7.0
  Upload: the whole aiu folder, INCLUDING api.php and api.cgi.
  - Locked down: no admin, no recovery code, no email reset. No one can get into an account without its password,
    not even KODNA. A lost password means starting a new account (a capsule opens there with its own password).
  - No invite code: sign up is a username and a password. SIGNUPS_OPEN '0' still closes sign-ups.
  - World: one phone-shaped layout on every screen. The heart, the leaf and the token are buttons with their bars and
    numbers. Go inside / Go outside under the picture. Arrange: drag a building onto another to swap them (Reset,
    Done). Each land's buildings stand out (terracotta in the desert, a dark edge on all of them).
  - Aiu walks it all: room to room, out the front door and across the yard, and he climbs the ladders.
  - Tokens: no more Good Star multiplier. Mini-game wins pay 2 tokens a star (30 a day from games).
  - Stairs that match each house, a proper little car in the garage, and the strange creatures are two animals fused
    (owl-cat, giraffe-turtle, koala-snail, camel-snail, jackalope, walrus-mammoth, fox-snake, frog-duck, crab-dog).

WHAT'S NEW IN 2.6.0
  Upload: the whole aiu folder, INCLUDING api.php and api.cgi.
  Safety
  - New accounts needed an invite code (gone again: see 2.7.0). The admin can set a temporary password for a locked-out account.
  - Recovery code: Settings > Account & data > Make my recovery code (or the note in Accounts > Cards). Write it
    down. After a temporary password, it opens your cards and files again (Accounts > Cards > Lost your password?).
  - Capsules are locked with a capsule password (you can turn that off, with a warning). A locked capsule is a
    .aiucap file; opening one asks for its password.
  - The developer tools are off (config.js devtools: false), the server turns away test growth, and nothing
    brought in from a capsule makes tokens.
  - Files: 250 MB per account, 5000 MB for the whole server (AIU_FILES_MAX_MB, AIU_FILES_TOTAL_MB). Once a week
    the app tidies away uploads nothing points to, and re-sends a file this device has that never reached the server.
  - A purchase that comes up short when it syncs (bought offline on two devices) says so, and the tokens are back.
  Tokens
  - Allowance: 10 tokens every day you open Aiu, +25 on the first day of each week (the server's clock decides).
  - Good Stars: a day with 10+ growth (care, tiles, check-ins, writing, games) is a Good Star day. Each one in a row
    steps you up: x1, x1.25, x1.5, x1.75, x2 on the tokens you earn. A missed day steps you down one. Earned tokens
    stop at 60 a day.
  - The Corner Mart: This week (4 specials, a new set every Monday), Treats (fireworks, a confetti party, a fancy
    pet snack: used up when bought), and Pet gear (the collar, saddle and "no gear" are free; the old Settings menu
    is gone). The old server-folder shop is retired.

WHAT'S NEW IN 2.5.0
  Upload: the whole aiu folder, INCLUDING api.php and api.cgi (they now keep your Files).
  - Your username is your name. Aiu calls you by it, and each username belongs to one account only.
  - Settings > Account & data: User info, Profiles (a drop-down: tap one to become it) and Capsules (they used to
    be called backups; a capsule can include your files).
  - Accounts has four tabs: Cards, Person (the personality quiz and what calms you), Files and Finance.
  - Files: put any file in Aiu (a photo you just took, a PDF, a document), in folders you name. On a synced Aiu each
    file is scrambled on your device before it uploads, so the server can't open it. Up to 25 MB a file and 1000 MB
    an account (change it with AIU_FILES_MAX_MB). They live in aiu_data/accounts/<you>/files.
  - Tokens instead of the joy streak: every growth point drops a token in your wallet (every wallet starts with 100).
    Spend them in the new Shop tab, the Corner Mart: hats and faces for Aiu, things for the pet, something for the
    yard, a painting for the bedroom, a rug for the living room. Just for fun: not real money.
  - World: the picture is at the top, the meters under it. The pet keeps clear of the pond, Aiu fishes in the real
    pond, and the meadow's little windmill looks like a windmill.
  - Games start easy and get a little faster with each game you finish in a sitting. Spar comes up more often. No
    more double-tap zoom on iPhone in the games. Garden Defense is gentler and bugs no longer walk on past a seedling.

WHAT'S NEW IN 2.4.0
  Upload: the whole aiu folder, INCLUDING api.php and api.cgi this time (accounts are now username + password
  only: no email, no confirm link). Old accounts keep working, even ones that never clicked their confirm email.
  The screen
  - World is its own tab and the app opens on it: the heart, leaf and star meters, the picture and the ticker.
    The other tabs are just the work area. After 10 minutes with no taps, the app goes back to World.
  - Plan and Quest are one tab: the calendar on top, your tiles below.
  - The menu is icons only, along the top of the page (it stays there while you scroll; Safari's bottom bar on
    newer iPhones can't cover it). Text starts out large; buttons and checkboxes are thumb-sized.
  - One small speaker icon at the top of each page reads a short summary of it in Aiu's voice (tap again to stop).
    On World, it's on the stand-up card (it reads you the day).
    The Listen buttons and "Tap text to hear it" are gone.
  Aiu
  - Hobbies last 2 to 5 minutes (teeth about 2, cooking about 4), so there's always something new.
  - His day has a shape: the same anchors every day (teeth on waking and half an hour before bed, three meals,
    dishes, asleep 10 pm to about 6:45), his daily care and chores at times that shift a little each day (feeding
    and watering the pet, a play with the pet, two chores, a bath some evenings), and free time in between that's a
    surprise each time (never the same thing twice in a row).
  - Hold Aiu to pick him up, even mid-activity (the food cart too): he hops out. Drag him to what he needs: the
    outhouse (he needs to go every few hours, or he goes by himself), the cart, the board, a bed, the kitchen.
  - The joy streak (star bar): petting, feeding and watering the pet, helping Aiu and checking off steps fill it;
    full = double growth for 3 minutes (the daily limit still holds).
  - The stand-up: after the morning I Ching toss (and when you come back after a few hours), Aiu walks to the
    bounty board and tells you the day. Tap the board any time; a red "!" means news.
  The world
  - Inside, the house is cut open four floors tall, like a little shelter: the office (computer, the drone's dock) and
    the lab in the attic, the bathroom, hallway and bedroom upstairs, the kitchen and living room downstairs, and the
    garage (workshop and gym) and grow room in the basement. Each thing he does has its room (games in the office,
    tinkering in the lab, workouts in the garage, yoga in the grow room). Tap the computer for a game.
  - Inside, the dollhouse is walk-through: open archways and stairs, and you see Aiu walk from room to room.
    Every room shows whole (no rug cut in half). The stairs come up into a little hallway with a banister, between the bathroom
    and the bedroom.
  - The drone hovers in the sky right above the house; inside, it waits by its dock in the office.
  - The rooms are redrawn clean, each with its own look: a cream kitchen with a yellow-check backsplash and a retro
    range, a white-and-sea-glass tiled bathroom with a wooden tub, a lavender bedroom, and a living room in your
    house's own style (logs, stone, panels).
  - The lab is a low building under a wide observatory dome with a big telescope. Each land has its own details
    (mushrooms and a fallen log in the forest, cacti and a tumbleweed in the desert, drifts and an ice patch on the
    tundra, lily pads by the pond, palms, shells and an umbrella at the beach, a windmill in the meadow).
  - The farm animals left the field. Now and then a strange, friendly creature wanders through instead (a stilt
    beast eating the treetops, the forest walker, a fish on bird legs, a polar mammoth, a frost serpent...).
  - The buildings match your house and land: log cabins, stone, adobe in the desert, igloos and a hex-dome
    greenhouse on the tundra. A lantern by the bridge lights Aiu's way at night, with fireflies.
  - Little bells ring along when you pet Aiu, and wind chimes now and then.
  - The house: a toilet in the bathroom, boards and a clean trim on the side of the stairs, the garage's oil drum
    out from behind the ladder.
  - The food cart is part of Aiu's routine: he cooks there at lunch and dinner when the weather is nice. Tapping
    it just tells you so (it never pulls him out of bed).
  Games
  - Tap the pet > Play: the dice pick one of eight games. Again, New roll or Exit after.
    Deliver (a paper route), Spar (boxing), Wilds (a battle), Slice, Oil Drip, Wire It (breadboard, Raspberry Pi,
    build a computer), Print Stack (robot totem, chamfer your overhangs) and Garden Defense.
  - Each: about a minute, 3 levels, 1-3 stars, a best score, a how-to picture and a tip at the end.
  - Growth: the first win of each game today +3; replays pay +1 only when they beat today's score.
  - The buildings no longer open their own screens (on standby); tap one and Aiu pops in and out.
  Shopping lists and tiles
  - A shopping list is just your items: no "pieces" or "to get missing". Type an item, press Enter, type the next.
  - Done shopping finishes the tile (it goes under Done; Undo complete brings it back with your items checked).
  - Lists hold up to 80 things (it used to stop at 30), a long pasted list keeps every item, and no doubles.
  - Discard (at the bottom of a tile) sends it to the Discard pile, a filter on the board: open a tile there to
    Restore it, or Delete forever (type DELETE).
  Accounts and profiles
  - Settings > Account & data: signed in as, Log out, Change password. Your data and profiles below it.
  - The same Aiu is never copied twice by opening a backup. Two copies already? Your profiles > Combine these.

WHAT'S NEW IN 2.3.1
  Upload: the aiu folder as usual (the server files haven't changed since 2.2.0).
  - Settings > Look & sound > Style: Toy box (bright and bubbly) or Retro (the paper-and-ink look).
  - The yard: every building stands behind the stream. The food cart moved back there (where the well was), the well
    is now tucked behind the house across from the outhouse, and the garage has more room. The lab's observatory
    has a clear dome with a telescope poking out. The pet and the barn animals keep to the left side of the field,
    out of Aiu's way.
  - "Buddy" is now "pet" everywhere.
  - Greenhouse fixes are hands-on mini games: flick bugs off a leaf and pick the right spray, keep the temperature in
    the green with the vent, water to the line, set the grow light, sort the compost, wipe the glass.
  - Barn care is hands-on too: toss feed, fill the water, then collect eggs, milk, scoop poop, muck out hay or brush.
    Every 4th visit, a baby is born. The barn inside got fixed (hay on the floor, a loft, nest boxes, a stall).
  - Accounts is just your account cards. Your profile is in Settings > Account & data > My profile, with three big
    picture buttons: My info (with About me inside), Docs, Money.

WHAT'S NEW IN 2.3.0
  Upload: the aiu folder as usual. The server files (api.php, api.cgi) did not change since 2.2.0.
  A friendlier look (for kids and grown-ups)
  - A bright, toy-box look: a sky-blue polka-dot background, chunky outlines and rounded cards, colorful labeled
    buttons along the bottom (Quest, Plan, Log, Accounts, Settings), and a ticker under the world that says what
    Aiu is doing, with a tip. Bigger heart and leaf on the meters.
  Aiu's whole place in one picture
  - The world is now a fixed picture of the whole property, laid out like an old painted garden: the house in the
    middle, the barn and greenhouse on the left, the garage and lab on the right, a tool shed and a well by the path,
    the outhouse (moon door) behind the house, a stream with a bridge, a pond in the field, the bounty board (bigger,
    bottom left) and Aiu's food cart (a Japanese street-food cart, bottom right; it replaces the firepit).
  - Tap a building: Aiu walks there and you go in. The icon row under the world is gone.
  - The buddy roams the field at its own size (the horse is big, the cat and ghost are small); chickens and the other
    barn animals wander around and come back around from the other side.
  - Toy box: hold Aiu, the buddy or an animal for half a second to pick it up, then drag it. Drop Aiu on a building
    and he goes in; on the buddy or an animal they bonk, tumble and hug; try the pond, the roof, the drone, or
    shaking him. Taps never get blocked by anything walking around.
  - Inside, the house is a dollhouse: bathroom and bedroom upstairs, kitchen and living room downstairs, all at once.
    Aiu is in whichever corner he's busy in. The regulator clock hangs low on the living room wall. Tap the front
    door (green arrow) to look out at the yard while he stays in; tap the house to look back in.
  Places work like Vitals for things
  - Garage: one ride at a time (change it in Settings > Aiu & buddy). The whole ride is drawn big with dots on its
    parts; parts wear down day by day and blink red when they need you. Tap one and do the job. At most 3 at once.
  - Barn: each animal has a care meter. Greenhouse: watering, lights, soil, vents, pests and glass wear down too.
    Lab: the 3D printer, computer, breadboard, shelf and air need looking after (plus the learning tracks).
  Log, games, reading
  - Log has two tabs: Today (with the I Ching folded in) and Book (with the glossary and your life so far).
  - All the mini games are under the buddy. Easy, Normal and Hard; a how-to card the first time; bigger buttons;
    Deliver has swipe-to-change-lanes. The garage doesn't open games any more.
  - Listen buttons on tiles, I Ching, journal pages and lesson cards; Settings > Look & sound > Tap text to hear it.
  - Shopping lists and steps: press Enter and keep typing the next one (bananas, Enter, apples, Enter...).
  Profiles, backups and settings
  - Your profiles: one simple screen. Backups: Save (this one or all) and Open. Opening a backup shows what's inside
    first; an Aiu you already have only gets what's missing ("nothing to do" if you're up to date); a new one becomes
    a new profile. Nothing is ever erased or replaced, and the same Aiu is never duplicated.
  - Settings: the top shows only sync; the name, stage and creature are under Aiu & buddy; every sound is under Look &
    sound; Reminders has notifications and an app-icon badge (today's count, while Aiu is open); every PDF (including
    your book) is under Save as PDF. The "Vitals from my journal" setting is gone (check calm things in Vitals).
  - Example text is generic now (Atlanta, GA; "Sam"). Credit: KODNA Network, https://KODNA.net.

WHAT'S NEW IN 2.2.0
  Profiles
  - One account (or one device) holds as many Aius as you like. Each profile is its own fresh start: its own
    egg, journal, tiles, plan, ID and account cards. One is open at a time; switching keeps every other one
    exactly where you left it. Your profile card sits at the top of Accounts (it can't be deleted): tap it for
    ID, Documents, Finance and, for a personal profile, Personality. "+ Profile" makes a new one (personal or
    business). The first profile is the account itself; the others can be renamed or deleted (password plus
    typing DELETE PROFILE).
  - Capsules: download this profile, or every profile in one zip. Import a capsule into the open profile or as
    new profiles, and now also on the very first screen (before hatching) and on the log in / sign up screens.
  - Businesses that were folders inside your profile keep working; each has "Make it its own profile".
    People and Outreach are gone from the profile; "Papers" is now Documents, with a résumé template.
  Log (the journal) is a book
  - Today: the I Ching stamp, today's entry, and the tile log written as sentences ("Sam washed the dog").
    Add to another day writes on an earlier page. Book: years > months > days, with search. Glossary.
    My story: a lifelong summary and the whole book with you as the author (PDF too). I Ching: the word,
    the number, the changing lines, then Translation, Interpretation and Suggestions, and past readings.
    Every day is stamped with its reading even if you didn't write. Calm things stay in Vitals.
  - I Ching: Aiu casts by himself at midnight (the first one a few moments after he hatches). You always see
    the toss first; the reading appears only after the coins land.
  Vitals
  - One screen: the question card with one Back button (undo), the five parts, and today's checklist of calm
    things (it starts fresh every midnight and only records that you did it today). Add your own calm things
    and pick which part they heal. "Make a tile", LOG and INFO are gone.
  - When you check off a calm thing, Aiu does the same kind of thing for the buddy (feeds it, waters it,
    hugs it, brushes it, tucks it in), for as long as the calm thing is worth, instead of spending 20
    minutes at a time feeding or watering it. You can name the buddy (Settings > Aiu & buddy).
  Aiu's world
  - A Korean-style kitchen with a retro gas range, a Japanese-style bathroom, a firepit in the yard (hibachi
    cooking with a karate chop on nice evenings) and an outhouse with a moon door behind the house.
  - More things he does by the time of day: brushing his teeth, a bath, pan cooking, food prep, tea, dishes,
    laundry, laptop work, catching bugs, weed whacking, fetch with the buddy. He cleans up after each one.
  - No more white flashes (hatching, evolving and lightning are gentler).
  Places under the world (four pictures, no names): garage, barn, greenhouse, lab
  - Slow, untimed lessons. +3 growth the first time you finish something at each place each day.
  - Garage: Aiu's ride (car, bicycle, motorcycle, horse carriage or spaceship). New = wash and polish. Jobs
    come due as the weeks go by (oil change, flat tire, wipers, battery, brakes, coolant and more); at most
    3 open at once; the engine-code check only when everything else is fixed. Advanced jobs (spark plugs,
    sunroof drains, transmission fluid) are optional. Each job: put the real steps in order, then a question.
  - Barn: three chores a day. Chickens first, then goats, a horse, a cow, pigs, sheep and rabbits move in.
  - Greenhouse: sow, care (a question a day per plant), grow, harvest and save seeds; cross two varieties by
    hand for hybrid seeds; a seed swap box brings new packets.
  - Lab: Code, Prompt craft, 3D design & printing (incl. the 45-degree rule for support-free prints),
    Electronics, Think for yourself. Three cards a day, with "try it by hand" tasks.
  - New mini game, Deliver: a paper route in your garage ride. Toss packages onto red-flag porches and pull
    over at bus stops for totem passengers.
  Smaller things
  - Plan: Pick days can span months (Oct 1 to Dec 29).
  - Settings: the sound switch moved into Look & sound; "Show the world full screen" is gone; PDF has its own
    section. Weather: the saved place is shown, Enter saves, more small towns, and a
    street-address lookup (US Census geocoder) when a town isn't in the list.
  - Server (api.php and api.cgi, both 2.2.0): profiles are folders inside each account
    (aiu_data/accounts/<name>/totems/<id>/). Upload BOTH new server files with the app.
  - Not in this version: profiles shared between two accounts (the server layout leaves room for it later).

SETTING UP api.cgi TO MAKE ACCOUNTS (the Ruby server)
  api.php is the easy path: upload it, permissions 644, done. If you want the Ruby copy instead:
  1. Upload aiu/api.cgi next to index.html (same folder).
  2. File Manager > right-click api.cgi > Set Permissions > 755. The aiu folder must be 755 too (not 775).
  3. Edit api.cgi in File Manager's editor (keeps Unix line endings). Its first line is  #!/usr/bin/env ruby
     It must match your host's Ruby: copy the first line of a Ruby script that already works on the host
     (e.g. kodna.net/ruby/, cgi-bin/app.rb), like  #!/usr/bin/ruby
  4. Edit aiu/.htaccess and remove the # from these two lines:
        Options +ExecCGI
        AddHandler cgi-script .cgi
  5. Open  https://kodna.net/aiu/api.cgi?a=ping  You should see one line starting
        {"ok":true,"app":"aiu-totem" ... "server":"ruby","version":"2.2.0","profiles":true ... "data_folder_ok":true
     - The whole aiu folder now shows a 500 error: the host doesn't allow those two lines. Put the # back
       and use api.php.
     - You see the Ruby code as text, or it downloads: CGI isn't on for that folder (step 4).
     - 500 only on api.cgi: permissions (step 2) or the first line (step 3).
  6. Tell the app to try it first: in aiu/config.js change  api: 'api.php'  to  api: 'api.cgi'
     (optional: the app tries the other file by itself when the first one doesn't answer).
  7. Sign up in the app. Both servers read and write the same aiu_data files, so you can switch back any time.

WHAT'S NEW IN 2.1.15
  - FIX for "The server gave an odd reply (500). Is api.cgi set up?" when making an account: that
    message meant the web server never ran the Ruby file at all (common on WordPress / DirectAdmin
    hosting). There is now a PHP copy of the same server, api.php, which runs on any PHP host with
    nothing to switch on. The app tries api.php first, then api.cgi, and remembers the one that works.
    Both use the same files in aiu_data, so you can switch any time. See "FIXING THE 500 ERROR" just below.
  - A pat on the back: tapping Aiu no longer makes him stop and do a trick. A heart and a music-box note
    float up and he keeps working (keep patting and the notes play a little tune). Rubbing him is a back
    rub: hearts, no wiggle. Good news (a quest done, a journal entry) gives happy eyes instead of a hop.
  - Tap the house and Aiu finishes whatever is queued (the I Ching toss, a hop), then walks to the door
    and goes in. Tap the house again before he gets there and he turns around and goes back to his job.
    Inside there's a front door now: tap it and he walks out the same way (and can be called back).
    He stays put for about half an hour (bedtime still wins).
  - More going on: he works through a day's worth of hobbies before anything comes round again (he kept
    going back to the birdhouse). The birdhouse, sandcastle and snowman take the whole visit instead of
    starting over every 18 seconds, and when the birdhouse is done a bird moves in. New things he does
    from day one: writing in his own journal, tidying up, a jigsaw puzzle (inside) and birdwatching.
  - Tidier: no close-up view any more (the whole world always shows; the World view setting is gone).
    Log > Today has one Daily Hilltop card (the reading and Aiu's Hilltop View together) and the "Tiles
    today" list is called Tile log. Settings: "Theme" and "Which look" (two things were both called Look),
    no Hear button (picking a voice plays a sample), and a device-only Totem shows just Create / Log in.

FIXING THE 500 ERROR (2.1.15)
  1. Upload this zip's aiu folder over the old one as usual (Step 1). The new files that matter are
     aiu/api.php, aiu/config.js and aiu/.htaccess.
  2. File Manager: api.php should show permissions 644 (like any other file). Nothing else to set.
  3. Open  https://kodna.net/aiu/api.php?a=ping  in a browser. You should see one line starting
       {"ok":true,"app":"aiu-totem","api":1,"server":"php", ... "data_folder_ok":true,"data_folder_private":true
     - data_folder_private false: PHP can't write beside public_html on this host, so it keeps the data in
       aiu/aiu_data instead (blocked from the web). That works; it just isn't the same folder api.cgi uses.
     - A blank page, "File not found", or the PHP code shown as text: api.php isn't there, or it's in the
       wrong folder (it goes next to index.html).
  4. On the iPhone: close Aiu completely and open it again (so it picks up the new files), then Sign up.
  If you'd rather keep the Ruby server: see TROUBLESHOOTING (api.cgi). The usual causes of its 500 are
  permissions (api.cgi must be 755, the folder 755 and not group-writable), the first line not matching the
  host's Ruby, or CGI not being allowed. The CGI lines in aiu/.htaccess now start with # (some hosts give the
  WHOLE folder a 500 when they're on); remove the # only if you use api.cgi.

WHAT'S NEW IN 2.1.14
  - Sharing: send kodna.net/aiu by text or post it, and it shows a card with a picture of Aiu's yard, the
    name and a one-line description (Open Graph and X/Twitter tags, icons/og-image.png, 1200 x 630).
    Nothing on the page itself changed.
  - Also: a small 32 px browser-tab icon, a canonical link, app details for search engines (structured
    data) and a fuller home-screen app description.
  - If an old preview keeps showing: messaging apps remember link previews for a while. Facebook's Sharing
    Debugger (developers.facebook.com/tools/debug) can refresh it there.

WHAT'S NEW IN 2.1.13
  - Aiu Vitals live in a little drone hovering in the sky (its light: green, yellow, or blinking red when
    he's worn out). Tap it, or the leaf bar, and the Vitals open on top; Close takes you back.
  - "Any time" tiles show on the bounty board every day until they're done. The board's list has no Hide for
    today: Close just puts it away.
  - A tile's bottom row: Rename · Archive · Delete, on one line. "Set aside" is now "Archived".

WHAT'S NEW IN 2.1.12
  - A new When picker for tiles (right in Aiu's question, or tap When): On a date (the calendar, or type
    01/02/2027), Repeat (tap the days: M T W T F S S, with Every day / Weekdays / Weekends; every week, every
    other week or once a month, from a start date) or Any time. Add one or more times for reminders.
    The Today / Tomorrow / This weekend / Morning and night buttons are gone.

WHAT'S NEW IN 2.1.11
  - A bounty board stands in the yard (a corkboard inside): the Today counter is pinned on it, with a red
    pin that blinks while a reminder rings. Tap the board for the list. The counter button above the world
    is gone, so the bar never jumps.
  - The I Ching is automatic again, but calm: each day's reading is ready at midnight, and Aiu tosses the
    coins in the yard the next time you're on Aiu and he's free (not hatching, playing or mid-trick, and no
    window open). No button, no reminders, no pop-up.
  - Settings: this device is just "Phone", "Tablet" or "Computer" (an iPhone was showing up as a Mac). Time
    always follows this device's own clock and time zone; your city is only for the weather.

WHAT'S NEW IN 2.1.10
  - Hatching: tapping the egg (or while it hatches) only wobbles it: no tricks, hearts or points yet. A
    newborn spends its first 10 minutes looking around next to its eggshell before it starts its hobbies.
  - The I Ching is hands-on: Log > Today > Cast the coins. Toss three coins six times (or Toss all six);
    each toss draws a line from the bottom up, changing lines in red. No timer, no daily cast time and no
    reminder in the Today counter: you cast it when you want.

WHAT'S NEW IN 2.1.9
  - Log > Journal: a Journal summary at the top (your streak, the I Ching pattern, what you write about
    most, what got done this week, a heads up), then Contents (every day by month, with Newest/Oldest and
    which days to show), Search (type, then Search or Go) and a Glossary of the words you use most.
    Aiu's notebook (topics, remembered, time capsules) is gone.
  - Your profile has no Profile / Vitals tabs: Vitals open from the bar above the world (now a full-width
    chip with a heart and a leaf), with a Back button.
  - Change your answers: Profile > "knows you" > Your answers. The personality quiz has Back and marks
    your last answers. Changing an answer doesn't earn growth again.
  - "Quest" (not Quests), and every page header is the same height.

WHAT'S NEW IN 2.1.8
  - Fixed: Aiu twitching back and forth. After the door (or the old buddy menu) sent him outside while his
    schedule wanted him inside, he switched between two activities every frame for half an hour.
  - The door button is gone: Aiu goes in and out on his own schedule.
  - One thing at a time: a trick (Aiu's or the buddy's) plays to the end before the next one starts.
    Tapping fast still gives hearts; it just doesn't cut him off mid-move.

WHAT'S NEW IN 2.1.7
  - Play with them yourself: tap your buddy and a care bar opens under the world. Snack throws it a treat
    and it munches; Water splashes its bowl and it laps it up, as often as you like. When its tummy is
    full it does a trick (jump, spin, roll over, dance) or takes a nap. Rub it (drag side to side) and it
    purrs. Games is on the same bar.
  - Tap Aiu: a different trick each time. Rub him: he wiggles. Worn out: he yawns and asks you one Vitals
    question right there. New Totems get 3 days before they can be worn out.
  - New buddies: Bear Dog (a bear with a long dog tail), penguin, eagle and parrot (on their post).
    Ghosts, conjures and birds never wear gear.
  - Evolutions are a surprise: no preview of the stages, and each new evolution rolls its own colors,
    markings and shape (same species). Forms Aiu already grew into stay the same.
  - Settings in five folded groups. The reminder sound test only plays the sound. Aiu's voice is a
    creature babble (or a real voice you pick, or silent). Developer tools: tap the version 5 times.
  - Profile > About you is gone: your name, address, email and phone are on your Me card in Accounts
    (scrambled, made for you; anything you had typed moves over).
  - Above the world: growth and Vitals in one small chip; full screen moved to Settings.
  - Slice: combos add seconds. Fling: gems and coins add seconds.

WHAT'S NEW IN 2.1.6
  - Aiu Vitals are Aiu's own health, separate from your tiles. Each body part wears down over time.
    Aiu asks one thing at a time ("Did you brush your teeth this morning?"). Yes fills that part.
    Not yet: make a tile so you remember (it opens with the name filled in) or skip it, then come back
    and say Yes. At 90% Aiu grows +10 (once a day).
  - Let the Vitals run down and Aiu is distressed: he carries on, but looks tired and stops growing
    until you check in calm things you really did. The V bar above the world goes red.
  - Profile > "Aiu knows you": the 21 questions now also learn what calms you and what stresses you.
    Calmers come first in the check-ins. Stressors are noted so Aiu knows, never counted against you.
    The lists (with Change) are in Profile > What calms you.
  - Finishing a tile no longer touches your Vitals.

WHAT'S NEW IN 2.1.5
  - Plan is just the calendar: pick a day, this week, or a stretch of days, and see the tiles on them.
  - Log > Today: the Daily Hilltop, today's entry, the day's tiles (folded) and Aiu's Hilltop View,
    its overview of how yesterday went and what's left today.
  - Your folder in Profiles has your name: Profile (about you, personality, money) and Aiu Vitals,
    a body scan of your calm habits. Fill all five parts in a day for +10 growth.
  - Color themes: Classic, Green, Blue, Red, each light or dark (Settings).
  - Aiu's world: buttons above the picture, the buddy by the house facing Aiu, a door to send Aiu
    inside or out, and Aiu feeds, waters and pets the buddy. Tap the buddy for games and care.
  - Much smaller and faster to load (the old chat dictionary is archived).
  - When you upload: replace the whole aiu folder (the dict folder now only has places.txt).

WHAT'S NEW IN 2.1.4
  - Slice moved to the beach: slice seashells and logs, and don't crack the rainbow eggs.

WHAT'S NEW IN 2.1.3
  - iPhone: tapping fast in the games (or petting Aiu) no longer zooms the page or highlights text.

WHAT'S NEW IN 2.1.2
  - The Daily Hilltop: one standup a day in three parts: Cast (the reading in one line), Look back
    and ahead (how yesterday went next to what you expected, today's one focus, what you expect
    tomorrow) and Brake (one calm thing). It's in Log > Today and on the Today counter.
  - The Journal's day pages are short and readable now: the Daily Hilltop, your entries, tiles and GABA.

WHAT'S NEW IN 2.1.1
  - iPhone: the top and bottom of the page aren't covered anymore.
  - New tiles: pick Task list or Shopping list. A task list finishes by itself when the last box is
    checked (the red light stays locked until then). Made a mistake? Undo right after, or
    "Undo complete" any time later. Rename / Set aside / Delete are at the bottom of the tile.
  - No more "More" menus, and no Inventory tile unless you make a shopping list.
  - The line under Aiu's world is gone. A small Today counter in the world shows only what matters
    today (tap it for the list, or hide it for today). Once a day: the GABA standup, one brake for
    today, like the I Ching.
  - Settings: the Totem's name saves when you tap Done.

WHAT'S NEW IN 2.1.0
  - A travel buddy waits in the yard: a horse, a ghost, a dog, a cat or a conjure (a star spirit
    from a summoning circle), with a saddle, collar, backpack or nothing (Settings > Totem). Tap it
    for the mini games. When Aiu is inside, the computer on the desk opens them.
  - The buddy shows your week: a halo when calm things lead, little horns when you've been revved
    up a lot, nothing when balanced.
  - Seven quick, intense games: Slice, Wilds, Wilds Cup, Spar (box your Aiu), Dash (a foot race),
    Fling (throw Aiu into the treasure cave) and Drop (build a drone, deliver, land).
  - A win grows Aiu +1, up to 3 wins a day.

WHAT'S NEW IN 2.0.7
  - One status everywhere: a tile's light shows on its Plan row too. Tap it there (today) and
    the tile changes with it: green > yellow > red (done) > green. Brush teeth at 8am and 9pm
    shows two rows, each with its own light. The tile's reminder isn't listed twice anymore,
    and Done on a ringing tile reminder finishes the tile.

WHAT'S NEW IN 2.0.6
  - Tile status is a traffic light: green = Go (2.8.0: Do), yellow = Doing (start it, or check off a step),
    red = Done (stop, finished). Tap a light to change it. Each tile card shows its light.
  - Points can't be farmed: a finish or a step counts once. Start it again, Not done after all,
    flipping the light or unchecking a step and checking it again earns nothing more.

WHAT'S NEW IN 2.0.5
  - More than once a day: a daily tile can have several times (Aiu's "Morning and night", or
    tap When > + Another time). Each time is its own finish and its own reminder: brush teeth
    at 8am, it hides until 9pm, then it's back. Plan reminders can have a second time too.
  - Aiu's pick: the Pet line counts down ("7 more pets = +1 growth") and goes away once you earn
    the point (up to 3 a day). Other standing lines go away for the hour once you tap them.

WHAT'S NEW IN 2.0.4
  - Your tiles write themselves into the day's Log. Add a tile, change it (when, who, how long,
    status, steps), check off a step, finish it, set it aside or delete it, and a line with the
    time goes into Log > Today (Tiles today), that day's page in the Journal, the Journal list
    ("3 tile updates") and the PDF. Done shopping lists what you bought.

WHAT'S NEW IN 2.0.3
  - Aiu's world can go full screen: the square button beside + / - (tap again, or Esc, to leave).
    On a computer or Android it uses the browser's full screen; on iPhone the world fills the page.
  - Fixes from the review:
      Inventory: things you add after "Done shopping" no longer show up already checked.
      A tile's reminder follows the tile: renamed with it, off when you set it aside or delete it
        (and back with Undo or Restore), and checked off when you finish the tile.
      Set-aside tiles have their own filter (Set aside) and a Restore button.
      Links from Aiu's pick to Log > Today or Finance land there, not on an old day or the notebook.
      "Done shopping" on a one-time shopping tile keeps what you didn't buy.
      A repeat that starts later isn't "due" yet; a monthly tile on the 31st says it uses the last
        day in shorter months.
      Tapping Done again doesn't give the points twice; a finished one-time tile that you change
        to a repeat comes back.
      Money from a business without a folder shows up again in Profiles.
      Two devices upgrading at once no longer make the Inventory twice; your personal profile
        has one fixed record.
      Old menu names in Settings and a few PDFs now match the 2.0 menus.

WHAT'S NEW IN 2.0.2
  - Save as PDF > Journal pages: "Pick dates..." exports any date range (From / To).
  - Account tiles are plain tiles (no Accounts-card question).
  - Sample text and examples are generic (or about Aiu).

WHAT'S NEW IN 2.0.1
  - SETTINGS > INSTRUCTIONS: the instructions book, one chapter per part of the app (the screen,
    tiles, Inventory, Plan, Log, Profiles, Accounts, growing, saving, help).
  - SETTINGS > SAVE AS PDF: one PDF maker. Check off what goes in (the instructions book, your
    tiles, this month's plan, journal pages for today / the last 7 days / this month / this year /
    every page, I Ching readings, the GABA log, Finance for you and each business, each business's
    profile and papers, its people's résumés, and your account cards), then Make the PDF. It
    remembers your checks on this device. Account cards need an extra "I understand" tick, since
    that PDF shows your passwords. The separate PDF buttons on every screen are gone.

WHAT'S NEW IN 2.0 (the scrum board)
  - THE SCREEN, top to bottom: five icons in a header that stays put (Quest, Plan, Log, Accounts,
    Settings; no words), Aiu's world, Aiu's pick (one line that links you to what needs you next,
    with Next), then the work area. Aiu's name, stage, type, sync status and the sound switch are
    at the top of Settings; a small dot on the Settings icon shows sync.
  - NO POP-UPS. A reminder rings (sound and voice) and goes to the top of Aiu's pick line. The I
    Ching waits in Log > Today. Aiu's pick is the one place Aiu points at things.
  - QUEST = a board of TILES (like folders). A tile is anything to get done: one time, repeating
    (every day / week / 2 weeks / month) or part of every year (planting the garden, Mar - May).
    Tap + New tile, type a name, and Aiu asks for the missing pieces one tap at a time:
      When? (Today, Tomorrow, This weekend, Every day, Every week, Any time, or pick a date)
      Who's coming? and How long? (walks, pets, visits...), Which part of the year? (planting,
      picking, harvest), and the steps (with ideas). Every other tile (an email account, a call, a
      chore) is a plain tile: when, and its steps.
    Filled pieces turn green. Finish a tile for +5 growth (plus 2 per step); calm tiles (walks, a
    bath, reading...) also count as a Brake for GABA. Repeating tiles come back on their own.
    Search and filter: All, Up next, Doing, Backlog, Done, Repeats. Every tile has a status
    (Backlog / Up next / Doing / Done), notes, rename, set aside and delete (with Undo).
    No more main / side / idea quests. Aiu ranks every tile (overdue, today, in season, missing
    pieces, calm ones when you're stressed, up next...) and that same order is Aiu's pick.
  - INVENTORY is a tile like any other: your shopping list, repeating weekly. Its steps are the
    things to get; check them off as you buy them, and "Done shopping" clears what you bought.
    Upgrading from 1.x moves your open shopping items into it (with their store), and each open
    to-do becomes a tile in the Backlog. The old lists stay in your data, untouched.
  - PLAN = the calendar and reminders. Tiles show on it (a season shows as a yellow stretch).
    A tile with a time makes its own reminder. + Add: an event, a reminder or a tile.
  - LOG has three tabs: TODAY (the I Ching, your Go/Brake, today's entry with a question to get you
    going, Write or Talk it), JOURNAL (search and every day's page) and PROFILES.
  - PROFILES: You and each business are folders with pieces, and Aiu asks for the empty ones.
      You: Profile, Personality, GABA, Ideas (Aiu's suggestions), Finance.
      Each business: Profile, People, Papers, Outreach, Finance.
    Finance lives inside each folder (your money and each business's books stay apart).
  - Starter tiles are reworded for the new places; old 1.x links still land in the right spot.

WHAT'S NEW IN 1.1.0 (the big reorganize)
  - One full screen, no more scrolling the whole page. Aiu lives in its world; the menu and one
    work panel sit beside it. Phone held upright: Aiu on top, the menu under it, the panel below.
    Turn the phone (or use a PC): menu down the left, Aiu in the middle, the panel on the right.
    Only the panel scrolls.
  - FINAL LAYOUT (after the phone test): one page that scrolls like a website, no boxes that
    scroll inside boxes. Aiu at the top, the work area below it, the menu pinned at the bottom
    (Quests, Planner, Journal, Accounts) with big icons. Settings > This device > Text size now
    makes EVERYTHING bigger (menus, tabs, labels, buttons), and labels use the readable font.
  - Aiu's growth (♥) and GABA (G) bars sit in the corner of his picture. Tap ♥ to see what helps
    him grow; tap G for GABA. Tap Aiu himself to pet him: hearts, a happy hop, and every 10 pets
    = +1 growth (up to 3 a day). Other reactions are one emoji over his head.
  - THE BOUNTY BOARD (the bar under Aiu, always there): the most important thing right now, with
    one button to act on it, and "Next" to go through the rest (it loops; there's always
    something). In order: bills due (Paid), what's coming up today (Done / Cast the I Ching), a
    GABA brake when you run hot (I did it), Aiu's suggestion (Yes / Not today / Never), your
    quest's next step, a to-do, today's journal entry, then a few standing bounties (pet Aiu,
    plan tomorrow, log money, shopping list...). About once an hour (7 am to 10 pm) Aiu walks to
    the bounty board in his scene, calls out 📋, and the board starts over at the top.
  - STRESS (time is stressful): the G (Go/Brake) bar starts each day at 50 and slowly slides
    toward red as the day goes on (from 8 am). Calm things push it back up. Under 30 it turns red,
    Aiu gets grumpy (a little storm cloud over his head) and he only grows at a quarter speed;
    calm things still count in full. The top of the bounty board then offers a healthy reset:
    walk the dog, a shower or bath, brush your teeth, a glass of water, a real meal, a short walk.
    It's about taking care of the human, and Aiu shows it.
  - The speaker button (top) turns sound and Aiu's robot voice on or off. With sound on, reminders
    are said out loud, and "Read aloud" appears on journal pages, entries and the I Ching reading.
  - Aiu's suggestions (under Aiu now and then): "Want to draw or paint a picture today?" Yes asks
    what you'll draw and makes it a quest with small steps; finishing the quest counts as a calm
    thing (GABA) and grows Aiu. Not today = ask another day. Never = stop suggesting it (Aiu may
    check back once after a few months, in case you change your mind). X hides suggestions for 2 hours.
    It also suggests a day without a Go thing ("Want to try a day without energy drinks?") and,
    now and then, an either/or question to sharpen your personality type. Journal > Me >
    Suggestions shows them all and what you've said.
  - 1.1.0i, THE SCREEN NOW (top to bottom): Aiu's name and status; Aiu's world; the five menus
    right under it (Quests, Planner, Finance, Journal, Accounts); the control panel (Aiu's update
    with Next, and the pages of the menu you picked, as big buttons); then the work area.
      QUESTS: Quests (anything to get done, with steps) and Lists (to-do, shopping and your own
        lists on one page; one box to add, "on the list:" picks which; tap a list's name to
        rename it).
      PLANNER: just the schedule (calendar, bills to pay, coming up, reminders).
      FINANCE: your money (cash flow, T-chart, net worth, bills).
      JOURNAL: Today (four steps), Pages, I Ching, Me (personality, GABA, suggestions).
      ACCOUNTS: unchanged.
    Each work area has one button at the top; anything else is under "More".
    BUSINESS IS SET ASIDE for now (its code and your data are kept; if you added business money
    in 1.1.0h, Finance shows "Mine" and that business's name to switch between them).
  - No emoji anywhere. Aiu's reactions, the board and the Journal use little pixel icons.
  - The Go/Brake bar drifts half as fast (about 1.5 points an hour from 8 am), so on a day with
    nothing calm logged it reaches the red around 9 pm instead of mid-afternoon.
  - Your egg's species is random (picked by the egg) and it evolves within that species. You
    can change it in Settings > Creature type. Starting a Totem now starts at the top of the
    page, so you can watch the egg hatch.
  - AIU'S WORLD (1.1.0h): he fishes into water now (a fishing hole, or an ice hole in the snow)
    with a bucket, and now and then he lands a fish. New things he does on his own: flying a
    kite, blowing bubbles, building a birdhouse, chasing a butterfly, a sandcastle (beach and
    desert worlds) and a snowman (snowy peaks or winter). Things he made earlier today stay in
    the yard until bedtime: a painting on an easel, flowers, a birdhouse, a sandcastle, a
    snowman, a fish bucket (and indoors, a painting on the wall, a pot, some knitting).
  - Three things you do, four menus: QUESTS (your lists and quests), PLANNER, JOURNAL, ACCOUNTS.
    The Log (chat), the Shop and the plug-in AI are gone (archived, see _archive/REVISION-LOG.txt).
  - Aiu doesn't chat any more. It reacts with emotes and emoji in a small bubble: 🎉 when you
    finish a quest step, ✅ when you check something off, 📖 when you save a journal entry, 😌 for a
    calm thing, 👋 when you come back, ⏰ for a reminder, ☯️ when it casts the I Ching. Tap Aiu to
    say hi (each creature type has its own reaction).
  - The game: Aiu grows (and evolves) from your journal entries and from its activities:
      GABA side quests: now and then Aiu looks frazzled 😟 and a card pops up under it: "Side
        quest: check your GABA. Slow breathing (+10 brake)". Do it, tap "I did it". Or "Later".
      Suggestions (21 Questions): see FINAL LAYOUT above. Each answer is +2 growth.
      The personality quiz: 12 taps (Journal > Me).
  - JOURNAL: one place. A search box, then a table of contents (one line per day, newest first,
    or flip it), grouped by month. Tap a day for one page: In short (entries, I Ching, what got
    done, GABA), your entries, the I Ching reading, what you got done, then the rest of the
    Hilltop View folded underneath, and the old Log conversation for days that had one.
    "+ New entry": type it, or tap the microphone and talk (the microphone only writes your entry).
    Pip's notebook (was More): topics, things to remember, the glossary (Aiu's own word list,
    learned from you) and time capsules (every form Aiu has grown into).
    PDF: a day (open it, tap PDF), or a whole month or year (PDF on the contents page).
  - PLANNER: Schedule (the month calendar with the day's list, bills to pay, what's coming up,
    reminders), Finance, Business. (1.1.0h: Self and the I Ching moved to the Journal.)
  - BUSINESS = your entities. You are one entity (your Social Security number is your tax ID);
    each business you open is another (its own EIN, address and books). Planner > Business shows
    "You (personal)" first, then your businesses. Each has its own books in Planner > FINANCE (was Money): cash flow,
    T-chart, net worth and bills, kept separate. Anything you add in the Planner asks who it
    "Belongs to". A business profile has "This address is" (home address, home office, business
    office, mailing only) and its EIN. Your personal profile keeps only the last 4 of your SSN
    (type more and only the last 4 are kept): put the full number in an Accounts card.
  - CREATURE TYPES: every egg hatches into one of nine types: Ghost, Dragon, Robot, Beast, Plant,
    Aqua, Bug, Crystal golem or Flame spirit. A round baby first, then it stands up with
    a head, arms and legs, then wings, fins, armor and finally a crown. Each type has its own
    little move every so often (a dragon puffs fire, a robot beeps, a ghost's wisps circle, an
    aqua blows bubbles). Ghosts and flames hover. Settings > your Totem > Creature type shows how
    yours evolves and lets you pick another type (or Classic, the 1.0.5 look).
  - BUSINESS (from KODNA's BizNet planner): one folder per business.
      Profile: a form (identity with address type and EIN, offer, purpose, market, money, legal).
      Finance: that business's own books.
      People: everyone in the business, starting with you (Owner / CEO). Each person has a role
        card and a resume: import one you have (.txt, Word .docx or .pdf, or paste it) and Aiu
        sorts it into contact, summary, skills, jobs, schools and projects. PDF = a clean resume.
      Documents: one-page and full business plan, client proposal, SEO plan, investor sheet,
        marketing research report, system plan, event plan, product sheet, notes. They fill in
        from your profile, People and the business's Finance; type over anything.
      Outreach: pick who you're reaching out to (an agency for subcontract work, a white-label
        shop, a business, or a job) and Aiu writes a 30-second elevator pitch, a cold email, a
        follow-up and a capability statement or cover letter. Edit, copy or save as PDF.
        Nothing is ever sent from the app; no signatures, no customers. It's for your own review.
  - FINANCE (for you and for each business): cash flow for the last 6 months, an accountant's
    T-chart for the month, net worth (what you own minus what you owe), and bills due (Aiu taps the
    calendar 💸 when one is due within 3 days).
  - GABA (from the GABA Explorer): a Go / Brake bar in the HUD. Do something calming, write it in
    your journal ("I went for a walk") or tap it in Planner > Self > GABA, and the bar moves toward Brake.
    Things that rev you up move it toward Go. Mixed things (coffee, gaming) get a quick
    "did it calm you or rev you up?". Three brake goals a day, a level that only goes up, a calm
    streak. Brake things also help Aiu grow. Educational only, not medical advice.
  - ACCOUNTS: a phone book of your accounts with A-Z, labels, search, copy buttons, show/hide
    passwords, a password maker and extra fields. No extra PIN. On a synced Totem every card is
    scrambled with a key made from your Aiu password before it is saved or synced, so the server
    only sees scrambled cards. Only the PDF and your capsule show cards in plain text.
    USE A STRONG AIU PASSWORD.
  - STARTER QUESTS instead of pop-ups: no automatic I Ching cast or personality quiz. A new Totem
    gets five starter quests (Meet your Totem, Start the Hilltop habit, Brake training, Get
    organized, Make your own quest) whose steps check themselves off, plus a few "Example:" items.
  - QUESTS: To-do lists and shopping lists (shopping splits by store), and Quests with steps. Make
    as many lists as you want, rename them, move items, check things off (a line goes through them).
  - PDF on everything: a journal day, month or year (optionally with an old Log conversation),
    Quests, the Planner agenda, Finance (you or a business), business profile/documents/resumes/drafts, GABA, I Ching
    readings, Accounts (warns first). Real .pdf files made on the device, no internet needed.
  - Capsules (Settings > Your data) also include planner, business, GABA and accounts files.

WHAT WAS NEW IN 1.0.5
  - Aiu talks like a person: when you chat about something ("I like cars", "I went fishing
    today", "I'm hungry"), it asks who, what, when, where, why and how, one at a time, and saves
    your answers on that topic's page in the Library (Library > Topics). It never skips what it
    already knows: it reads it back and asks "Still true?". Say "skip" or "that's all" any time.
  - Every chat message goes through the 21 Questions filter: sure (it offers a to-do, quest or
    list), unsure (it asks), or just chatting (it asks about it). No daily limit any more.
    Chats stay on the rails: a to-do inside a chat goes to your quest log, then back to the topic.
  - Personality: a quick 12-question quiz (at hatching, or say "personality quiz"). Your type
    becomes Aiu's type, and it keeps evolving as you talk (Library > Personality).
  - "Are you hungry?" gets a droid answer, then Aiu asks about you. "Do you like X?": Aiu's tastes
    come from yours.
  - The daily I Ching reading: at the time you set (Settings > Reminders, default 8:00 AM), Aiu
    tosses three coins six times in its scene, then gives you the Hilltop View as a pop-up and in
    the chat: yesterday, weather, the cast, today's must-do and should-do, and the day's principle.
  - The Journal is now a book of Hilltop pages, one per day. Today's page writes itself from
    everything you said and did, and keeps updating all day. Edit any line; your words win.
    Your own writing goes on the page as "stories". Evening check-in: Aiu reads the page back and
    asks what it missed, what you learned, and what carries forward.
  - Plug-and-play AI (optional; removed in 1.1.0, kept in _archive).
  - Quick-answer buttons under the chat (A/B, Skip, That's all, Still true, Yes/No).

WHAT WAS NEW IN 1.0.4
  - Aiu talks back out loud (droid chirp first) and has a big Listen switch: on = it keeps
    listening until you turn it off. Mute button at the top. Tap any text to hear it.
    iPhones now use the loudspeaker (Aiu stops listening while it talks).
  - Comms link: while Listen is on, your devices check in every 10 seconds, and a home
    device (like the Pi) can say out loud what Aiu tells you on your phone.
  - A new quest log, like an RPG journal: main quests, side quests, ideas, one tracked quest
    shown under Aiu, objectives and a dated journal. Aiu never makes up steps: it asks you
    and writes down your words. Morning stand-up: "anything blocking you?"
  - Edit and delete on every line (steps, lists, reminders, notes), with Undo.
  - Library and Shop fold into compact sections, and each has its own scene: Aiu organizes
    books, reads or checks its phone in the library; browses, pays or tries on hats in the shop.
  - No more "Waking up" screen. If something ever goes wrong, a small bar says so.
  - The Items tab is gone (Aiu still remembers your pets and things for conversation).
  - The start screen names each Totem, and shows when an older "look" is being worn.
  - Screen readers, keyboard focus and a Text size setting (Settings > This device).

WHAT WAS NEW IN 1.0.3
  - No admin login. The shop is now just folders on the server that you upload by hand
    (aiu/shop/packs/). Templates for every kind of item + a preview page to test them.
  - New shop shelf "Things to do": activity packs (juggling, campfire, hula hoop) that the
    Totem does on its own once you own them.
  - The Totem follows its city's time zone (reminders, day and night, seasons).
  - The butler: a pocket dictionary (offline) + full dictionary (online) so it understands
    what you say, and "21 Questions" when it isn't sure. It learns from your answers.
  - Our own pixel fonts, our own word lists, Webster's 1913 (public domain) and US National
    Weather Service weather (public domain): nothing licensed left in the app.
  - Off-grid caution, no-reply email headers, updated crisis wording.

WHAT'S IN THIS ZIP
  aiu/                   upload this whole folder to public_html
    index.html           the app
    api.php              the sync server (PHP, runs on any host; 2.2.0: profiles)
    api.cgi              the same server in Ruby (a spare: standard library only, no gems)
    config.js            which server file the app tries first (api.php)
    .htaccess            keeps app files fresh, blocks private files (CGI lines start with #)
    dict/                the butler's dictionaries + city list (about 10 MB)
    style.css, sw.js, manifest.webmanifest, js/, fonts/, icons/
  README.txt             this file
  _archive/              NOT for upload: the 1.0.5 shop folder, the 1.0.5 code, the plug-in AI,
                         code taken out in each version (removed-2.2.0.txt, 2.2.0-replaced/),
                         and REVISION-LOG.txt


STEP 0 - TRY IT ON YOUR PC FIRST (optional, no server needed)
  1. Unzip. Open the "aiu" folder and double-click index.html (Edge or Chrome).
  2. Click "Try it on this device only".
  Everything works except sync, weather, the shop and the dictionaries (browsers block
  those from a file on your PC). This test Totem stays in that browser.


STEP 1 - UPLOAD TO KODNA.NET (DirectAdmin)
  1. DirectAdmin > File Manager > domains > kodna.net > public_html
  2. Upload the zip, then Extract it. You should now have public_html/aiu/index.html
     (If you get public_html/aiu/aiu/..., move the inner files up one level.)
     A copy of this README.txt also lands in public_html - you can delete that one.
     Updating from 1.0.5 (or older)? Upload only the "aiu" folder from this zip and extract over
     the old one (say yes to replace files). Your Totems live in aiu_data, which the zip never
     touches. The old aiu/shop folder on the server can stay or go (1.1.0 doesn't use it).
     Don't upload the _archive folder.
     From 1.0.2: also delete aiu/shop/items, aiu/shop/catalog.json and the old fonts
     press-start-2p.woff2, vt323.woff2 and OFL-*.txt in aiu/fonts (no longer used).
  3. Permissions (right-click > Set Permissions):
       folders (aiu and everything inside it) ...................... 755
       api.cgi ..................................................... 755 (only if you use Ruby)
       every other file, api.php too ................................ 644
  4. (Only if you use api.cgi instead of api.php) Open your working Ruby script (the one behind kodna.net/ruby/, cgi-bin/app.rb)
     and look at its FIRST line, e.g.  #!/usr/bin/ruby
     api.cgi's first line is:          #!/usr/bin/env ruby
     If yours is different, change api.cgi's first line to match (use File Manager's
     editor, not Notepad, so the line endings stay Unix-style).


STEP 2 - CHECK THE SERVER
  Open:  https://kodna.net/aiu/api.php?a=ping       (or api.cgi?a=ping for the Ruby copy)
  You should see one line like:
    {"ok":true,"app":"aiu-totem","api":1,"server":"php","php":"8.x","openssl":true,"data_folder_ok":true,
     "data_folder_private":true,"mail_program_found":true,"shop_items":26,...}

  data_folder_ok true ........ the Totem folder was created at
                               /home/YOURUSER/domains/kodna.net/aiu_data  (beside public_html)
  data_folder_private true ... it is NOT inside public_html (nobody can browse it)
  mail_program_found ......... ignore it since 2.4.0 (no emails are sent)
  shop_items ................. ignore it in 1.1.0 (the shop is archived)

  If something is wrong, see TROUBLESHOOTING at the bottom.


STEP 3 - MAKE YOUR ACCOUNT
  1. Open https://kodna.net/aiu/  > Sign up (just a username and a password; write them down:
     there is no email, so a lost password can't be reset).
     One account holds as many Totems (profiles) as you like: Settings > Your profiles > + New profile.
  2. You're logged in right away. Name your egg, tap Begin, and it cracks open.
  3. (was the email step: gone in 2.4.0)
  4. Settings > Weather & time: type a city and tap Find (big cities are in Aiu's list),
     or type your coordinates (like 43.41, -86.07), or tap "Use my location" on your phone.
     This sets the real weather AND the Totem's time zone, for all your devices at once.


EMAIL (2.4.0: not used any more; kept here for older installs)
  Up to 2.3.1, Aiu sent two kinds of email: "confirm your account" and "reset your password".
  They come from noreply@kodna.net, are marked as automatic messages, and say that
  replies are not read. You don't need to create that mailbox: api.php (or api.cgi) hands the email
  to your server's own mail program (sendmail), the same way WordPress does.
  If emails land in spam or never arrive:
    - the link is always saved in aiu_data/outbox/ too
    - DirectAdmin > E-mail Manager > DKIM: turn it on for kodna.net (one click, if your
      host offers it). Most DirectAdmin hosts already set up SPF for the domain.
    - or set MAIL_FROM at the top of api.php (and api.cgi) to an address that really exists on kodna.net


STEP 4 - INSTALL ON EACH DEVICE
  iPhone:   Safari > kodna.net/aiu > log in > Share button > "Add to Home Screen".
            Always open Aiu from that icon. It works with no signal (subway, woods) and
            iPhone does not clear its data. Plain Safari tabs can be cleared after 7 days.
  Windows:  Edge or Chrome > kodna.net/aiu > log in > the "Install" icon in the address
            bar. Settings > Reminders > Desktop pop-ups: on.
  Pi 2:     Chromium > kodna.net/aiu. Full-screen at startup:
              chromium-browser --kiosk --app=https://kodna.net/aiu/
            Settings > This device > Animation: Energy saver. Leave it on as the home base
            and alarm clock.
            (1.1.0: Aiu no longer talks out loud, so the Pi needs no voice setup.)
  Give each device a name in Settings > This device (e.g. "iPhone", "Pi").


HOW IT WORKS
  Quests    Your lists: To-do, Shopping (by store), any list you make, and Quests (with steps).
            Tap an item to rename it, change its store/label or move it to another list; the box
            checks it off; X deletes it (with Undo).
  Planner   Schedule, Business (You + each business, each with Profile and Finance), Self
            (Personality, GABA, 21 Questions), I Ching. "+ Add" makes an event, a bill, money in or
            out (pick who it belongs to); "+ Reminder" a reminder.
  Journal   Search, the table of contents, one page per day, "+ New entry" (type or talk), and
            your Totem's notebook. PDF buttons save a day, a month or a year.
  Accounts  Your accounts phone book, scrambled with your Aiu password (More > Save as PDF).
  Your Totem: tap it to say hi. It reacts to what you do, suggests a GABA brake now and then,
            asks its 21 Questions a few at a time, casts the I Ching at your daily cast time (once
            you set one), and knocks for every reminder (a pop-up that rings for about 5 minutes).

  THE BUTLER (how Aiu understands you; 1.1.0: it reads your journal entries now, since there is no chat)
  No big AI model is needed, so it runs on a Pi 2 with 1 GB of RAM:
    - Pocket dictionary (offline): about 11,500 words - our own everyday word lists with
      what kind of thing each one is (pet, food, family, vehicle, feeling, place...), words
      that mean the same (buy = purchase), word forms (went -> go), and more words from
      Webster's. "I got a hamster" is a pet; "we're out of bananas" is shopping; "Chicago"
      is a place, not a stranger's name.
    - Full dictionary (online): Webster's Revised Unabridged Dictionary (1913, public
      domain), about 96,000 words. When you use a word the pocket one doesn't know, the
      butler looks it up before answering, reads the definition to work out what kind of
      thing it is ("A female relative" -> family), and keeps it on the device.
    - 21 Questions: a tiny learning model guesses what you meant (something to do, a goal,
      something that happened, something to remember, a feeling, a question, or just
      chatting). Sure -> it offers to act ("Add it to your to-do list?"). Not sure -> it
      asks one or two quick questions ("is it something you still need to do, or something
      that already happened?"). Every answer teaches it (+3 growth) and syncs to all your
      devices, so it learns how YOU talk. (1.1.0: set follow-up questions to "none" and it skips
      the questions and simply asks "log entry or quest entry?".)
    - It never acts on its own without asking, except what you clearly told it to do.
    - Translation: the app is in English; Chrome, Edge and Safari can translate the page.

  THE HILLTOP VIEW (your daily journal page)
  "Step above the day, see the whole terrain, pick what matters, then do the next right thing."
  Each day gets one page (Library > Journal). Aiu writes it and keeps it current all day:
    - Header: date, time, your city and time zone, weather now and today's forecast
      (US weather only; set your city in Settings > Weather & time).
    - I Ching: the hexagram, changing lines, one-word theme, then Traditional principle ->
      Modern interpretation -> Hilltop application, what the changing lines point at, and
      where it's heading. Practical wisdom, not fortune-telling.
    - Continuity: the same cast coming back, the same kind of day several times in a week,
      to-dos you keep carrying, quests that stopped moving, feelings that keep coming up.
    - The whole terrain: body, home and animals, money and work, vehicles, business, projects,
      workspace, family, and your long-term direction (tap Edit to set it once).
    - "What am I feeding?" on readings about nourishment, limits and depletion.
    - Leave no one behind: loose ends that could quietly fall through the cracks.
    - Today's practical plan: must do, should do, if energy remains (small on purpose; tap
      Done to check things off).
    - The Hilltop principle, then the daily log: top priorities, loose ends, what I nourished,
      what I stopped feeding, work/money, business/projects, home/animals, family/people,
      what happened, what I learned, what carries forward. Aiu fills these in from your day;
      tap Edit on any line to write your own (empty it to go back to Aiu's version).
    - Your stories (what you write yourself, and your log entries; +10 growth for 80+ letters).
  Writing on your page earns growth like a journal page.

  PLUG-IN AI
  Removed in 1.1.0: Aiu is guardrailed and never sends your data anywhere. Older journal pages
  that have an "AI view" still show it. The code is kept in _archive/llm-plugin-ai.

  TIME ZONE
  The Totem lives in its location's time zone (Settings > Weather & time).
  Reminders, day and night, pages and seasons all follow it. Travelling? On the phone you
  carry, set Settings > Weather & time > Time zone to "Use this device's clock".

  OFFLINE AND EVOLVING
  Everything works offline and is saved on the device. Growth earned away from the
  server shows as "waiting for sync", and on one trip it can fill the bar only up to the
  next form ("Growth bar full!"). Evolution happens when you sync (like the Poke Center),
  so you evolve once per trip and every device grows the same creature.
  Two devices change the same thing while apart? The newest change wins, the older one
  stays in the history, and the Totem tells you what changed.

  OFF-GRID CAUTION
  While a device is off-grid (no internet, or not synced yet), what you do there exists
  ONLY in that browser. It is lost if, before the next sync:
    - the device is lost, broken or reset
    - the browser's data/history for kodna.net is cleared, or you used a private window
    - the app is removed from the Home Screen / uninstalled
    - on iPhone, you used a plain Safari tab that sat unused for 7 days
  The app shows an "Off-grid" banner and tells you once. Going away for a while? Sync
  first, then Settings > Your data > Download capsule. After 3 days without a sync it
  reminds you again. A "device only" Totem never syncs, so save capsules now and then.

  THE PI 2
  The Totem never re-reads its whole history. It keeps a small checkpoint (about 0.4 MB
  for 3 years of use) and only reads what is new, so the Pi 2 starts fast. The pocket
  dictionary (0.2 MB) loads a moment after start-up.


THE SHOP
  Archived in 1.1.0 (see _archive/REVISION-LOG.txt). Nothing was deleted: the whole shop
  folder, its templates and the 1.0.5 shop code are in _archive, ready to bring back.


BACKUPS
  The server keeps one live copy only. Your own copy: Settings > Your data > Download
  capsule (.zip) - the whole Totem as plain files (events, library chapters as Markdown,
  quests, items, glossary). Import capsule only ADDS what is missing.
  "Delete my account" (password + typed phrase) permanently deletes it from the server.


SERVER SETTINGS (top of api.php and api.cgi, the same names in both, optional)
  APP_URL                 https://kodna.net/aiu/  (used in email links)
  MAIL_FROM               who emails come from (default: Aiu Totem <noreply@kodna.net>)
  REQUIRE_EMAIL_CONFIRM   always off since 2.4.0 (accounts are username + password)
  SIGNUPS_OPEN            set to '0' to stop new sign-ups
  MAX_ACCOUNT_MB          size limit per Totem (default 50 MB, years of heavy use)
  FILES_MAX_MB            space for Files, per account, all profiles together (default 250 MB; env AIU_FILES_MAX_MB)
  FILES_TOTAL_MB          space for Files on the whole server (default 5000 MB; env AIU_FILES_TOTAL_MB)
  ALLOW_DEV               '1' only on a test server: lets the test growth button work (env AIU_ALLOW_DEV)
  DELETE_INACTIVE_DAYS    2.8.0: delete accounts nobody has used (no log in, no sync) for this many days, checked once a
                          day when someone signs up or logs in (default 0 = never; env AIU_DELETE_INACTIVE_DAYS)
  SHOP_DIR                where the shop folders were (not used by 1.1.0)


TROUBLESHOOTING
  Sign up says "The account server isn't answering (api.php ..., api.cgi ...)"
      Neither file answered. Open https://kodna.net/aiu/api.php?a=ping and see FIXING THE 500 ERROR
      near the top. The numbers in the message are what each file returned (404 = not there,
      500 = there but crashing or not allowed to run).
  api.php ping shows {"ok":false,"code":"server",...}
      Details are in aiu_data/error.log (beside public_html, or aiu/aiu_data).
  (api.cgi) ping shows the Ruby code as text, or downloads a file
      Apache is not running .cgi files in this folder. Ask your host to allow CGI in
      public_html, or move api.cgi into cgi-bin (where app.rb works), then:
        - in aiu/config.js set   api: '/cgi-bin/api.cgi'
        - in api.cgi set         API_URL = 'https://kodna.net/cgi-bin/api.cgi'
          DATA_DIR = '/home/YOURUSER/domains/kodna.net/aiu_data'
          SHOP_DIR = '/home/YOURUSER/domains/kodna.net/public_html/aiu/shop'
  "500 Internal Server Error" on the whole aiu folder
      Put a # back in front of  Options +ExecCGI  in aiu/.htaccess (2.1.15 ships with it off).
  500 error only on api.cgi (api.php is the easy way out)
      - permissions: api.cgi must be 755, folder 755 (not 777)
      - first line must match your Ruby path (Step 1.4)
      - Windows line endings: re-save api.cgi with Unix (LF) line endings
      - details may be in aiu_data/error.log or DirectAdmin > Error log
  data_folder_ok false
      Create the folder yourself beside public_html, named aiu_data, permissions 700.
  A PDF button does nothing on iPhone
      The PDF opens in a preview: tap Share > Save to Files (or Print). If nothing happens,
      open Aiu in Safari itself (not a private window) and try again.
  Accounts says "this browser can't scramble account cards"
      Open Aiu from https://kodna.net/aiu (scrambling needs a secure https page).
  Accounts asks for my password / says it doesn't open the cards
      Type your current Aiu password. Changed it? Type the NEW password on a device
      that still opens the cards: they move over to it. Cards no device can open show as
      locked; you can delete them.
  Emails never arrive
      See EMAIL above. The link is always in aiu_data/outbox/.
  The app looks old after an update
      Close and reopen the app (it checks for new files when online).
  Pill says LOG IN
      Your password changed or you logged out elsewhere. Tap it and log in. Anything you
      did meanwhile is waiting on the device and syncs right after.


CREDITS (no licenses involved)
  Made by KODNA: the app, creatures, world, pixel fonts (Aiu Block, Aiu Term), the GABA
  Explorer lists, the business plan templates (from KODNA's biz-net-planner), the PDF maker,
  activity packs, the butler's word lists and the city list.
  PDFs use the PDF viewer's built-in Helvetica font (nothing embedded). The Accounts lock uses
  the browser's own Web Crypto (AES-GCM + PBKDF2), no outside code.
  Public domain: Webster's Revised Unabridged Dictionary (1913) for the butler's full
  dictionary; weather from the US National Weather Service (api.weather.gov); the I Ching
  itself (the hexagram names, meanings and advice in Aiu are written in our own words).
  The personality quiz and its 16 type names are our own (the four either/or sides go back to
  Carl Jung, 1921); it is not the MBTI(R) or 16Personalities(R) test.
  Colors: the Sweetie 16 palette (colors are free to use).
