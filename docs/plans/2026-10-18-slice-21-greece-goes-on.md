# Slice 21 — Greece goes on

*18 Oct 2026. Phase 3, "Greece beyond the walls" (`docs/specs/2026-10-17-greece-beyond-the-walls-design.md`). The seventh slice of the phase. Builds on slice 20, "Raiders at the edge", and its review.*

## Goal and check-in

The spec's words: rulers' moods towards each other; feuds and wars between rivals, with armies on the map, closed routes and prices moved; peace and its aftermath. Festivals at their seasons; harvests on the map; requests from both sides of a war and the cooling for trading with an enemy. The News of Greece list and town lines from Greece.

Until now Greece only answered you. This slice lets it go on by itself. Each ruler feels something about each of the others, from the old rivalries of the cities, their own leanings and what has passed between them lately (quarrels and friendships that come and fade), and each feeling names its reasons, as their mood towards you does. Two who fall far enough out go to war: their armies march out along the road (or their ships along the lane) and stand facing each other with crossed swords between them, the way between them is closed, and food and fleece grow dear in both cities. A season or two later it ends in a peace or a defeat, and the loser is poorer for a while, which shows in its prices. Each side may ask your city for help, and trading with one side cools the other. The festivals come round at their seasons (the Panathenaia in Athens, the Karneia in Sparta, the Isthmian Games at Corinth) with banners and smoke over the city on the map, wine and meat dear there, and a gift that arrives then counting for more. Each city's fields on the map take the colour of its harvest. The map gets a News of Greece list, newest first.

Wars between rivals never come to your city's map. Nothing here touches your city unless you trade, give or answer: a town that keeps to itself plays exactly as before, though the Greece around it now has its festivals and its wars.

**Oliver can:** watch a war start between two rivals on the map, see what it does to prices and requests, choose a side by what he sells, and read the news.

**Demo links** (bare hash tokens; a dash combines them, as before):

- `#war`: `#caravan`'s town, with Sparta and Athens at war (their quarrel staged for the demo and named so). Their armies are out on the road and meeting near Megara, crossed swords between them, the road closed; wheat, meat, cheese and fleece dear in both, each price saying why; and both kings asking your city for wheat for their armies. The map opens on Sparta's page.
- `#festival`: `#athensship`'s town in July, the Panathenaia on in Athens: banners and smoke over the city, wine and meat dear there (the sea route's rows show it), and the page saying a gift now counts for more. The map opens on Athens' page.
- `#peace`: `#war`'s town, played on to the end of the war: Athens has beaten Sparta. The armies walk home; Sparta's food is dearer still ("they lost their war with Athens"), easing over the months. The map opens on Sparta's Prices tab.
- Every earlier token keeps working, each also with `-paused`.

## Not in this slice

Alliances and sides taken by third cities; wars that come to your map (the war phase); your own routes closed because they run through the fighting (your road to Athens passes Corinth: it stays open whatever Corinth and Athens do); festivals for Troy and Tyre; the gods behind the festivals (the gods phase).

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets.
- Sim code (`src/sim/`, `src/map/`) stays pure and deterministic. Everything random here (quarrels, friendships, a war's start, length and end) is a hash of Greece's seed and the month or the war's number, never `world.rng`, so Greece's harvests stay exactly as they were.
- Money moves only through `pay` / `income`; nothing new moves money.
- **Earlier towns are untouched.** Nothing in this slice reaches the city unless it trades with Greece, gives, or answers a ruler. The demo probe (outside the repo) plays each earlier demo in the old code and the new and compares the whole city at opening and 900 ticks on. Demos that trade with Greece may see different prices (festivals and wars move them) and so different money: the check-in names each one that differs and why.
- Old saves still load: a version 20 save opens in version 21 with no wars and no feuds, every ruler's feelings for the others as they were.
- The renderer and UI only read sim state; every action is a command. Static build, `base: './'`, no runtime network requests, all art generated in code.
- Judge by screenshots, tune by eye, never claim it looks or feels right on Oliver's behalf.

## Before

Measured at `4a9c792` (the end of slice 20's review), headless Chromium with software WebGL at 1920 × 1080:

| | Before |
|---|---|
| Tests | 328 in 27 files, all passing |
| Bundle | 4 files, 1,410 KB raw, 417 KB gzipped |
| Load, bare link (page clock) | ready 1,633 ms, first frame 2,149 ms |
| `#town` | 799,168 triangles, 83 draw calls, save 142 KB; ready 2,772 ms |
| `#richtown` | 910,707 triangles, 95 draw calls, save 179 KB; ready 3,097 ms |
| Work a frame, running | `#town` 7.84 ms running (1.82 paused), `#richtown` 11.04 ms, `#caravan` 3.34 ms, `#tribute` 3.54 ms, `#raid` 3.43 ms, `#raiders` 3.78 ms |
| Map pages | `#tribute` 304,018 triangles / 20 calls (ready 3,117 ms), `#hostile` 304,642 / 22 (3,198 ms), `#raid` 305,834 / 22 (3,617 ms); the map's first open built in 240 ms |
| The 82 demos | each one's opening and a hash of its whole city state at opening and 900 ticks on, recorded outside the repo |

## Design decisions

**Rulers' feelings for each other** (`src/sim/rivals.ts`). Each ruler's feeling for each other ruler is a number made of reasons, like their mood towards you:
- the old rivalries of the cities (Athens and Sparta, old rivals for Greece, −20; Sparta and Corinth, old friends, +10; everyone and Troy, −10…), fixed;
- the ruler's own leaning, the shuffle each game already draws (±10), fixed;
- what has passed between them lately (`bonds`): quarrels (a border dispute, cattle raided, an insult at the games, harbour dues, a marriage refused) and friendships (a marriage between their houses, gifts exchanged, a treaty, sacrifices together at Delphi), each worth something and fading over a year or two; a war and how it ended.

On the first of each month each pair may quarrel (about one month in eighteen, more often for warlike or proud rulers, less for generous ones) or make friends (about one in sixteen, more for generous ones, less for warlike). A proud ruler takes a quarrel harder, a steadfast one less, a fickle one forgets in half the time. Their feeling in a word: friends (+30 or more), cordial, cool (below 0), feuding (−25 or less), at war. A pair falling into a feud, or making up, is news.

**War.** On the first of a month, from the third year of the game, with no other war on in Greece and none ended in the last six months: a pair whose feelings for each other average −35 or worse may go to war (one month in three; half as often again if the angrier is warlike), and not within three years of their last war with each other. The angrier declares it, naming the biggest grievance. Each war (`world.wars`) has its way between them (a road over the land, or for Troy a lane over the sea; `RIVAL_WAYS` in `map/greece.ts`), the place where the armies meet on it (Megara, Mantinea, off Aegina…), its length (three to six months, by the dice) and how it will end (by the dice at the start: a peace about one time in three, else a defeat, the stronger and the warlike more likely to win), hinted half-way through by a battle ("a battle near Megara: Athens had the better of it").
- *On the map:* each side's army marches out from its city along the way to the meeting place (a little slower than a caravan; ships at a ship's pace), stands there facing the other while the war lasts, and marches home when it ends. Where they are is a pure function of the tick. Crossed swords mark the meeting place; the way between them is drawn red: closed.
- *Prices:* a new push on each city's stock, `strife`: while at war, wheat, meat and cheese are drawn down towards three fifths of normal and fleece a little more (dearer by about a third), over about three weeks. A defeat leaves the loser's stores at two fifths of normal for food and fleece and lower for oil and wine (fields burned, flocks driven off), and halves the winner's; then it wears off as any push does (two thirds gone in five months). The reason line names it: "their war with Athens", "they lost their war with Athens", "the war with Athens, lately ended".
- *Afterwards:* the war's bond becomes how it ended (the loser bitter, −25 fading over three years; the winner −10; a peace −10 for both, two years).

**Your part in it.**
- *Requests from both sides.* A ruler at war asks for help six times as often, for food or fleece your stores hold ("for their army: they are at war with Athens"). A war request does not wait two months after another ruler's ask, so both sides can ask together; still no more than two open in Greece, one each, none while a threat is live, and only once your city has had a route six months.
- *Trading with the enemy.* Each trader of a city at war that buys or sells anything at your city makes its enemy remember: "you trade with their enemy Sparta", −3 a visit, one memory growing to at most −15 over the war, fading over a year from the last visit. Goods or coin you send a city at war (a gift, or what it asked for) cool its enemy by −8 ("you sent wheat to their enemy Sparta during the war"). A proud ruler takes either harder. Help sent to a side counts with that side as any met request does.

**Festivals** (`src/sim/festivals.ts`), every year: the Panathenaia in Athens in July, the Karneia in Sparta in August, the Isthmian Games at Corinth in April, each a month. A new push, `feast`: from a fortnight before to the festival's end, wine and meat are drawn down towards three fifths of normal (dearer by about a third), easing within a season after. News when one begins. A gift that arrives during it counts half as much again (twice as much for a pious ruler), and says so in its reason. Each city's page says when its festival is.

**Harvests on the map.** A patch of fields beside each ruled city, coloured by the harvest: from June, how the coming harvest looks (rich gold to parched brown); otherwise the last harvest. Its hover card says it in words.

**The map.**
- Armies as little phalanxes in their colours (more men for a bigger city), fleets as warships; crossed swords at the meeting place (hover: the war, since when, why, the way closed, prices dear); the way drawn red.
- Every marching group (armies, fleets, raid bands, caravans) answers the pointer along its whole body, not only near its head (slice 20's review): each piece has a body segment, and the pointer is tested against it on the screen.
- Festival banners on poles round the city and smoke from the altar while a festival is on.
- City labels carry a little icon while at war (crossed swords) or keeping a festival (a wreath).
- **News of Greece**: a list on the map, at the top left, the latest twelve lines newest first, each with its date and its city's colour; click one for that city's page.
- The city's page: a status line under the mood (at war with Athens since…; the Panathenaia, until…; the harvest); a new **Rivals** tab: how this ruler feels about each of the others with the reasons, any war on or lately ended, and its festival.

**Town lines.** Greece's news keeps its own colour under the top bar; the war's start and end, festivals and feuds come in the same queue, one at a time.

**State** (version 21; `from20`): `world.wars`, `world.nextWar`, `world.feuds` (the pairs feuding now, for the news); each city's `bonds`, `strife` and `feast`. A version 20 save gets none of them going.

## Tests

`tests/rivals.test.ts`:
- feelings: the reasons add up to the feeling; quarrels and friendships come by the dice, fade, and are bent by traits; the same seed gives the same Greece over years; `world.rng` is untouched (harvests as before);
- wars: no war before the third year or while another is on; a pair far enough out goes to war, the angrier declaring; armies' places a pure function of the tick (out, at the meeting place, home); it ends in its season or two with the fate drawn at the start; the bonds after; the lull;
- prices: food and fleece dearer in both during a war, the loser's dearer after and easing; the reason lines name the war;
- festivals: on at their months, wine and meat dearer there, easing after; a gift arriving during one counts half as much again;
- your part: a war request comes from a side at war and can come beside the other side's; trading with one side cools the other (one memory, capped); sending to one side cools the other;
- independence: a town with no route plays exactly as before over years of wars and festivals (its city state identical);
- saves: a town with a war on round-trips; a version 20 save loads and plays on.

Plus the existing suite and the demo probe. `smoke.mjs` opens `#war` (armies on the map, the swords, both requests, a war price reason), `#festival` (the festival on, the wine price reason, the gift note) and `#peace` (the war over, the loser's reason, armies homeward); `measure.mjs` adds `#war`'s map.

## Tasks

1. Plan (this file), with the baseline measured. Commit.
2. Sim: the rival ways, feelings and their reasons, quarrels and friendships, feuds, wars and their end, the strife and feast pushes and their reasons, festivals, war requests, cooling for trading with the enemy, the festival gift bonus, state and migration; tests. Commit.
3. UI and render: armies and fleets, swords and the red way, festival banners and smoke, fields, the shared body hover, label icons, the News of Greece list, the page's status line and Rivals tab, price reasons. Commit.
4. Demos and look-and-tune: `#war`, `#festival`, `#peace`; screenshots, adjust; smoke and measure extended. Commit.
5. Full checks, measurements, As built, the check-in. Commit, push.

## As built

