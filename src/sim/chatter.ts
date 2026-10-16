/**
 * What a household says: two lines, one about how things stand with them and
 * one about life in general, each said by someone who lives there. Chosen
 * from the family's seed and a slow clock (a new pair every dozen days or so,
 * and at once when their situation changes), walking each list in a seeded
 * order so a household goes through every line before it repeats one. Pure:
 * the same state always gives the same lines.
 */
import { COTTAGE, HUT, TENT } from './buildings';
import { TICKS_PER_DAY, TICKS_PER_MONTH } from './clock';
import { ageOf, URGENT, warningOf } from './folk';
import type { Building, Family, Person, SimState } from './state';

/**
 * Lines by situation. {kin} is another member of the household old enough
 * to talk, {adult} another who is grown up, {head} the head of the house
 * (never said by the head themselves), {origin} where they came from. A line
 * whose {kin} or {adult} isn't there (a home of one, or only small children)
 * isn't said.
 */
export const LINES = {
  new: [
    'So this is home now. {kin} has already named the goat.',
    'We walked all the way from {origin} for this patch of dirt. It’s a lovely patch of dirt.',
    'First night under our own canvas. {kin} says the stars are bigger here than in {origin}.',
    'Everyone back home said we were mad. Look at us now: a tent and a view of the sea.',
    '{adult} asked where the market is. Give the place a chance, I said.',
    'The neighbours brought figs. I like the neighbours.',
    'We’ve unpacked the good pot. That means we’re staying.',
    'A new city, a new start. Mind the goat, {kin}.',
  ],
  tentDry: [
    'Another walk to the river for water. My arms are a hand longer than when we came.',
    'If someone built a fountain round here, I’d name a child after them.',
    '{kin} carried the water home today. Half of it, anyway. The rest is on the path.',
    'We could build a proper hut, if only there were water near. Mud doesn’t make itself.',
    'I dreamed of a fountain last night. It was beautiful. Then the goat woke me.',
    'Water from the river again. It tastes faintly of frog.',
    'No water carrier comes this way. We’ve asked the gods; they’re thinking about it.',
    'The whole street smells of people who walk a long way for water.',
  ],
  tentWet: [
    'The water carrier came by! {adult} is already mixing mud for the walls.',
    'Water at the door. Next, walls. Then a roof. Then a nap.',
    'With water this close we can build a real hut. Goodbye, canvas, you flapped well.',
    'That carrier’s jar is the loveliest thing I’ve seen since {origin}.',
    '{kin} has drawn our hut in the dirt. It has a room for the goat.',
    'Real water, every few days, carried right to us. I could weep. I won’t, it’s a waste of water.',
  ],
  hutNoBread: [
    'Walls, a roof, water. If only we had bread, we’d be practically gentry.',
    'Lentils again. {kin} says lentils build character. I have enough character.',
    'When the market comes, I’m buying a loaf as big as {kin}’s head.',
    'We could live in a whitewashed cottage, if anyone round here sold bread.',
    'I traded a hen for a sack of barley. The hen looked happier about it than I did.',
    'The bakers back in {origin} would weep to see us eat porridge every day.',
    'Thick walls, good thatch, no bread. Two out of three, as my mother used to say.',
  ],
  hutBread: [
    'Fresh bread from the market! {kin} has eaten three loaves and is lying down.',
    'With bread like this, we’ll be whitewashing the walls by summer.',
    'The bread woman came with her basket. I may have hugged her. Only a little.',
    'Water, bread and a roof. {head} is talking about blue shutters. Blue!',
    'Bread every day. So this is how the rich feel.',
    'A month’s bread in the jar. {kin} keeps lifting the lid to check it’s still there.',
  ],
  cottage: [
    'Whitewashed walls and blue shutters. My mother in {origin} won’t believe it.',
    '{kin} sits under the olive tree all afternoon and calls it “minding the estate”.',
    'A tiled roof! When it rains we just sit and listen to it.',
    'We have a bench. An actual bench, for sitting. {kin} won’t get off it.',
    'The neighbours come round to admire our door. It is a very good door.',
    'Water at the door, bread from the market. Even {kin} has stopped complaining. Mostly.',
    '{head} has started saying “our house” in a slightly grand voice.',
    'We had guests from {origin}. They went home very quiet.',
    'All we need now is somewhere proper to thank the gods for all this.',
  ],
  noWater: [
    'No water carrier for days. We’re washing in olive oil, which is not the same.',
    '{kin} has taken to catching the morning dew in a cup. It takes all morning, and it’s still only a sip.',
    'The jar’s dry. If the carrier doesn’t come soon, some of us will have to go.',
    'We used to have water. Those were good days. Last month, mostly.',
    'Has anyone seen the water carrier? About so tall, blue dress, jar on her head?',
    'I walked to the river today. I’m not proud of it.',
    '{head} says one more dry month and we pack up the good pot.',
  ],
  noFood: [
    'The bread woman hasn’t been by in ages. We’re eating the decorative figs.',
    '{kin} keeps standing at the door, sniffing for bread. Nothing yet.',
    'No bread for days. A cottage without bread is just a very tidy hut.',
    'We’re down to the emergency lentils. Nobody likes the emergency lentils.',
    'If the vendor doesn’t come soon, {adult} is off back to {origin}, where they bake twice a day.',
    'I’ve started dreaming about crusts. Small ones, even.',
  ],
  urgent: [
    'That’s it. If nothing comes by in a few days, some of us go to stay with my sister.',
    '{head} has started packing. Slowly, and sighing loudly, so the neighbours notice.',
    'We gave it two months. The gods can’t say we didn’t try.',
    'The cart’s half loaded. A few more days, and some of us are gone.',
    'Last chance, city. The goat and I are watching.',
  ],
  down: [
    'Down in the world again. At least the goat doesn’t mind.',
    'Some of the family went back to {origin}. The house is very quiet now.',
    'We had a bigger house once. Last week, in fact. I don’t want to talk about it.',
    '{head} says it’s only for now. {head} said that about the last place, too.',
    'Fewer mouths to feed, I suppose. That’s the bright side. It isn’t very bright.',
    'We’ll build it all back, just as soon as somebody brings what we need.',
  ],
  upHut: [
    'A hut! With walls! {kin} keeps knocking on them to check.',
    'Thatch over our heads. I’ve never been so fond of straw.',
    'Our own four walls. {kin} has already argued with one of them.',
  ],
  upCottage: [
    'A cottage! {head} has walked round it nine times today.',
    'We have a door that shuts and a window that opens. Civilisation.',
    'Whitewash everywhere. {kin} has whitewashed the goat, too.',
  ],
  noWork: [
    'Still no work round here. Every job’s gone to someone who lives nearer.',
    'No work to be had round here. I’ve offered to count the olives. Twice.',
    'If anyone needs a strong back and a weak sense of direction, I’m free.',
  ],
  general: [
    'The sea was the colour of wine this morning. {kin} says that’s just how it is here.',
    'The goat ate my sandal. I’ve forgiven the goat. I haven’t forgiven the sandal-maker.',
    'Old Kallias down the road says it’ll be a good olive year. He says that every year.',
    '{kin} swears an owl watched over the house all night. Athena, maybe?',
    'I made an offering to Poseidon so the sea stays where it is. So far, so good.',
    'The cicadas are so loud you can’t hear yourself complain.',
    '{kin} found a pretty stone on the beach, and now we have to keep it forever.',
    'Too hot to work, too hot to sleep, just right for figs.',
    'The wind’s from the south today. That’s when the gossip carries.',
    'My cousin in {origin} writes that the place is dull without us. I believe it.',
    'Somebody sings in the next street every evening. Badly. Joyfully.',
    'We traded our spare amphora for honey. Best trade since the goat.',
    'If Zeus must throw thunderbolts, I hope he aims at the hills.',
    'The sunset over the bay! Even the goat stopped chewing to look.',
    '{adult} is teaching the children of the street their letters. So far they know alpha and complaining.',
    'They say the fish here are very clever. They certainly avoid me.',
    'Our neighbour keeps bees. Our neighbour also keeps a lot of bee stings.',
    'The road dust gets everywhere. I found some in the soup.',
    'When I was young in {origin}, we walked uphill to the well both ways.',
    'There’s talk of a theatre one day. {kin} has started practising tragic faces.',
    'The figs are nearly ripe. I’ve been guarding them from {kin}.',
    'The stars are so bright here. {kin} named one after the goat.',
    'Someone said Hermes was seen at the crossroads. Probably just a man in a hat.',
    'I patched the roof with my old cloak. Now the roof is warm and I’m not.',
    'The children chased a hare round the plots all morning. The hare won.',
    'Rain tonight, says the old woman down the lane. Her knee is never wrong.',
    'We had octopus for dinner. {kin} pretended to like it. Bravely.',
    'In the evenings the smell of thyme comes down from the hills. Worth the walk from {origin}, that.',
    'Our goat has got out again. If you see a goat looking pleased with itself, it’s ours.',
    'I’ve started talking to the olive trees. They’re good listeners.',
    '{kin} says you can hear the city growing. I think that’s just the carts.',
    'The ox carts rumble past at dawn. Better than a rooster, and they don’t peck.',
    'A sailor at the beach said Troy has walls a hundred feet high. I said, good for Troy.',
    '{kin} bet me a fig the wind would change by noon. I owe {kin} a fig.',
  ],
} as const;

export type Situation = keyof typeof LINES;

/** A new pair of lines this often. */
export const CHATTER_EVERY = 12 * TICKS_PER_DAY;

/** A small integer hash, for choosing (not state: the same inputs always give the same number). */
function mix(a: number, b: number, c: number): number {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35) ^ Math.imul(c + 0x27d4eb2f, 0x165667b1);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  return h >>> 0;
}

/** The situation that colours what a household says now. */
export function situationOf(s: SimState, b: Building): Situation {
  const f = b.family;
  const warn = warningOf(s, b);
  if (warn && warn.left <= URGENT) return 'urgent';
  if (warn) return warn.need === 'water' ? 'noWater' : 'noFood';
  const lastOf = (what: string): number => {
    if (f) for (let i = f.story.length - 1; i >= 0; i--) if (f.story[i].what === what) return f.story[i].tick;
    return -1;
  };
  // Just moved down a level, or up one (the change the home's level dates from).
  if (lastOf('down') === b.since && s.tick - b.since < 2 * TICKS_PER_MONTH) return 'down';
  if (b.level >= HUT && lastOf('up') === b.since && s.tick - b.since < TICKS_PER_MONTH) return b.level >= COTTAGE ? 'upCottage' : 'upHut';
  if (f && s.tick - f.came < TICKS_PER_MONTH) return 'new';
  if (b.level === TENT) return b.waterUntil > s.tick ? 'tentWet' : 'tentDry';
  if (b.level === HUT) return b.foodUntil > s.tick ? 'hutBread' : 'hutNoBread';
  return 'cottage';
}

export interface Line {
  who: Person;
  text: string;
}

/** Fill in a line's names for this speaker, or null if it doesn't suit them. */
function fill(template: string, f: Family, who: Person, other: Person | null, adult: Person | null): string | null {
  if (template.includes('{kin}') && !other) return null;
  if (template.includes('{adult}') && !adult) return null;
  const head = f.members[0];
  if (template.includes('{head}') && (!head || head === who)) return null;
  return template
    .replaceAll('{kin}', other?.name ?? '')
    .replaceAll('{adult}', adult?.name ?? '')
    .replaceAll('{head}', head?.name ?? '')
    .replaceAll('{origin}', f.origin);
}

/** The k-th line of a list in this household's own order (each line once before any repeats). */
function nth(list: readonly string[], seed: number, k: number): number {
  const n = list.length;
  // A stride with no factor in common with n walks every line once per n steps.
  let stride = 1 + (seed % Math.max(1, n - 1));
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  while (gcd(stride, n) !== 1) stride++;
  return ((seed >>> 3) + k * stride) % n;
}

/**
 * What a household says now: a line about their situation and one about
 * life (or, now and then, about work, if some can't find any). Speakers are
 * members old enough to talk sense (12 or over), two different ones if there
 * are two. Empty for a home with nobody in it.
 */
export function chatterOf(s: SimState, b: Building, noWork = false): Line[] {
  const f = b.family;
  if (!f || f.members.length === 0) return [];
  const talkers = f.members.filter((p) => ageOf(s, p) >= 12);
  if (talkers.length === 0) talkers.push(f.members[0]);
  const bucket = Math.floor((s.tick + (f.seed % CHATTER_EVERY)) / CHATTER_EVERY);
  const situation = situationOf(s, b);
  const second: Situation = noWork && bucket % 3 === 0 ? 'noWork' : 'general';
  const out: Line[] = [];
  const say = (sit: Situation, slot: number): void => {
    const list = LINES[sit];
    const step = sit === 'general' ? bucket : bucket + slot;
    for (let tries = 0; tries < list.length; tries++) {
      const i = nth(list, mix(f.seed, slot, sit.length), step + tries);
      const pickWho = mix(f.seed, bucket, slot + tries * 7);
      let who = talkers[pickWho % talkers.length];
      if (out.length && talkers.length > 1 && who === out[0].who) who = talkers[(pickWho + 1) % talkers.length];
      const others = f.members.filter((p) => p !== who && ageOf(s, p) >= 4);
      const other = others.length ? others[mix(f.seed, bucket, slot + 13) % others.length] : null;
      const grown = others.filter((p) => ageOf(s, p) >= 16);
      const adult = grown.length ? grown[mix(f.seed, bucket, slot + 29) % grown.length] : null;
      const text = fill(list[i], f, who, other, adult);
      if (!text || out.some((l) => l.text === text)) continue;
      out.push({ who, text });
      return;
    }
  };
  say(situation, 0);
  say(second, 1);
  return out;
}
