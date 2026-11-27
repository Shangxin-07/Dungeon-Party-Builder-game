/**
 * Research at the Library (M7.07, DESIGN.md §17.7). High-INT heroes study in
 * town instead of delving: each one at a research desk adds points every day
 * (INT − 8, plus a share of Lore, more for the Knowledge-minded), earns a
 * little XP, and gets better at nothing else. Kills add a point each, and
 * specimens from the haul add more.
 *
 * What there is to study (a "topic"):
 *
 * - "monster:<id>", any monster the guild has met. Tier 1 is met; Studied
 *   (tier 2) and Mastered (tier 3) cost points (MonsterDef.research, or
 *   power × ResearchRules.perPower). Studied: +15% damage against it, its
 *   weak spots and tricks show in the scouting report, and casters pick the
 *   right spell. Mastered: +25%, and its resistances are halved. A monster
 *   with a `ward` takes no damage at all until the guild reaches the ward's
 *   tier.
 * - "shard:<id>", a shard of the Hearthstone the Library can find (DESIGN.md
 *   §20, content/shards/): open once the monsters it needs are Studied; when
 *   its points are in, the Library knows where it lies and the next party on
 *   its floor digs it out.
 * - "shelf:<id>", a find from the haul the debrief sent to the Library (an
 *   unidentified trinket): once its points are in, it turns out to be
 *   whatever ItemResearch.becomes rolls, which goes to the store room.
 *
 * Combat reads the tiers (researchTiers) through the trip's extras and the
 * raid's options, so research helps both below and at the pit.
 */
import type { MonsterDef } from "../../content/types";
import { heroSheet, type Hero } from "../hero";
import { gainXp } from "../levels";
import type { Index } from "../library";
import { rollLootTable } from "../loot";
import { applyMorale } from "../morale";
import { knownMonsters, monsterNeeds, monsterTier, TIER_NAMES } from "../research";

export { monsterNeeds, monsterTier, researchTiers, TIER_NAMES } from "../research";
import { type Desk, type ShelfItem, type TownState, TownError } from "./state";
import { built, findHero, total } from "./read";
import { edit, listWords, news, roll } from "./internal";
import { leaveBench } from "./workshops";
import { shardPlaces, stoneName } from "../shards";
import { shardStudyOpen, studyShard } from "./shards";

/** Research desks the Library has (0 until it's built). */
export const researchDesks = (ix: Index, town: TownState) => total(ix, town, "researchDesks");

/** Research points a hero puts in on a day at a desk. */
export function studyRate(ix: Index, h: Hero): number {
  const rules = ix.lib.research;
  const sheet = heroSheet(ix, h);
  const base =
    Math.max(0, sheet.stats.INT - rules.intBase) + (sheet.skills.lore ?? 0) * rules.loreShare;
  const keen = h.motivation === "knowledge" ? 1 + rules.knowledgeBonus / 100 : 1;
  return Math.round(base * keen * 10) / 10;
}

/** A topic the Library can work on, for the Research panel. */
export interface Topic {
  /** "monster:<id>", "shard:<id>" or "shelf:<id>". */
  id: string;
  name: string;
  kind: "monster" | "shard" | "shelf";
  /** Points so far, and the total needed for the next step (Infinity when there's none). */
  points: number;
  need: number;
  /** Monsters: the tier now (1-3). */
  tier?: number;
  /** What finishing the next step gives, in words. */
  unlocks: string;
  done: boolean;
}

/** What the next tier of a monster gives, in words. */
function nextUnlock(ix: Index, def: MonsterDef, tier: number): string {
  const [studied, mastered] = ix.lib.research.damage;
  const ward = def.ward && def.ward.tier === tier + 1 ? `; breaks its ward (${def.ward.name})` : "";
  if (tier <= 1)
    return `Studied: +${studied}% damage against it, its weak spots and tricks known${ward}`;
  if (tier === 2) return `Mastered: +${mastered}% damage against it, its resistances halved${ward}`;
  return "Mastered: there's nothing more to learn";
}

/** Everything the Library could study today, monsters first (nearest done first), then the shelf. */
export function researchTopics(ix: Index, town: TownState): Topic[] {
  const r = town.research;
  const known = knownMonsters(town);
  const monsters: Topic[] = [...known].map((id) => {
    const def = ix.monster(id);
    const tier = monsterTier(ix, town, id, known);
    const [studied, mastered] = monsterNeeds(ix, def);
    const need = tier <= 1 ? studied : tier === 2 ? mastered : Infinity;
    return {
      id: `monster:${id}`,
      name: def.name,
      kind: "monster" as const,
      points: r.monsters[id] ?? 0,
      need,
      tier,
      unlocks: nextUnlock(ix, def, tier),
      done: tier >= 3,
    };
  });
  monsters.sort(
    (a, b) => Number(a.done) - Number(b.done) || a.need - a.points - (b.need - b.points),
  );
  const shelf: Topic[] = r.shelf.map((s) => {
    const def = ix.item(s.item);
    return {
      id: `shelf:${s.id}`,
      name: def.name,
      kind: "shelf" as const,
      points: s.points,
      need: def.research?.points ?? 0,
      unlocks: "Find out what it really is",
      done: false,
    };
  });
  // The Hearthstone's shards (DESIGN.md §20) come first: they're the story.
  const shards: Topic[] = [];
  for (const [id, { set, source }] of shardPlaces(ix)) {
    if (source.kind !== "library" || !shardStudyOpen(ix, town, id)) continue;
    shards.push({
      id: `shard:${id}`,
      name: `Where a ${ix.item(set.item).name} lies`,
      kind: "shard",
      points: town.shards[id]?.points ?? 0,
      need: source.points,
      unlocks: `Find where a shard of the ${stoneName(set)} lies, so a party on floor ${source.floor} can dig it out`,
      done: false,
    });
  }
  return [...shards, ...shelf, ...monsters];
}

/** Can this hero study today? At home and on their feet (an injury doesn't stop anyone reading). */
export const canStudy = (h: Hero, away: ReadonlySet<string>) =>
  !away.has(h.id) && h.condition === "ok" && h.hp > 0;

/**
 * Put a hero at a research desk, change what they study (`topic`: a topic id,
 * or undefined to let them take whatever is nearest done), or take them off
 * (`leave`). A hero at a desk isn't on a post. Heroes away keep their desk.
 */
export function assignDesk(
  ix: Index,
  town: TownState,
  heroId: string,
  topic?: string,
  leave = false,
): TownState {
  const h = findHero(town, heroId);
  if (!h) throw new TownError("They aren't in the guild.");
  const t = edit(town);
  const desks = t.research.desks;
  const at = desks.findIndex((d) => d.hero === heroId);
  if (leave) {
    if (at >= 0) desks.splice(at, 1);
    return t;
  }
  if (h.porter) throw new TownError("Porters carry; they don't study.");
  if (topic && !researchTopics(ix, t).some((x) => x.id === topic && !x.done))
    throw new TownError("There's nothing more to learn there.");
  if (at < 0) {
    if (desks.length >= researchDesks(ix, t))
      throw new TownError(
        researchDesks(ix, t) ? "Every desk in the Library is taken." : "Research needs a Library.",
      );
    // Off any post or bench: one job at a time.
    for (const id of Object.keys(t.posts)) {
      t.posts[id] = t.posts[id]!.filter((x) => x !== heroId);
      if (!t.posts[id]!.length) delete t.posts[id];
    }
    leaveBench(t, heroId);
    desks.push({ hero: heroId, ...(topic ? { topic } : {}) });
  } else desks[at] = { hero: heroId, ...(topic ? { topic } : {}) };
  return t;
}

/** Who is at a desk, if anyone, and what they study. */
export const deskOf = (town: TownState, heroId: string): Desk | undefined =>
  town.research.desks.find((d) => d.hero === heroId);

/** The topic a desk works on today: its own if still open, else the nearest done. */
export function deskTopic(ix: Index, town: TownState, desk: Desk): Topic | undefined {
  const open = researchTopics(ix, town).filter((x) => !x.done);
  return open.find((x) => x.id === desk.topic) ?? open[0];
}

/** Add points to a monster's research; news when it reaches a new tier. */
export function learnMonster(ix: Index, t: TownState, id: string, points: number): void {
  if (points <= 0) return;
  const before = monsterTier(ix, t, id);
  t.research.monsters[id] = Math.round(((t.research.monsters[id] ?? 0) + points) * 10) / 10;
  const after = monsterTier(ix, t, id);
  if (after > before && after >= 2) {
    const def = ix.monster(id);
    const ward = def.ward && after >= def.ward.tier && before < def.ward.tier;
    news(
      t,
      `The Library has ${TIER_NAMES[after]!.toLowerCase()} the ${def.name}: ${nextUnlock(ix, def, after - 1).split(": ")[1]}.` +
        (ward ? ` Its ward is broken: parties can hurt it now.` : ""),
      "good",
    );
  }
}

/** Every kill teaches the guild a little about what it killed (M7.07). */
export function learnFromKills(ix: Index, t: TownState, kills: readonly string[]): void {
  const per = ix.lib.research.killPoints;
  if (!per) return;
  const counts: Record<string, number> = {};
  for (const id of kills) counts[id] = (counts[id] ?? 0) + 1;
  for (const [id, n] of Object.entries(counts)) learnMonster(ix, t, id, n * per);
}

/**
 * A piece of the haul goes to the Library (the debrief's research choice).
 * Specimens feed their monsters at once; anything else waits on the shelf.
 * Returns what happened, in words.
 */
export function sendToLibrary(ix: Index, t: TownState, itemId: string): string {
  const def = ix.item(itemId);
  const r = def.research;
  if (!r) throw new TownError(`There's nothing to learn from the ${def.name.toLowerCase()}.`);
  if (!researchDesks(ix, t)) throw new TownError("Research needs a Library.");
  if (r.monsters?.length) {
    for (const m of r.monsters) learnMonster(ix, t, m, r.points);
    return def.name.toLowerCase();
  }
  const piece: ShelfItem = { id: `s${t.nextThingId++}`, item: itemId, points: 0, day: t.day };
  t.research.shelf.push(piece);
  return def.name.toLowerCase();
}

/** Can this piece go to the Library today? */
export const researchable = (ix: Index, town: TownState, itemId: string) =>
  !!ix.item(itemId).research && researchDesks(ix, town) > 0;

/** A find on the shelf is worked out: it becomes what it really was, in the store room. */
function identify(ix: Index, t: TownState, piece: ShelfItem, by: string): void {
  const def = ix.item(piece.item);
  t.research.shelf = t.research.shelf.filter((x) => x !== piece);
  const table = def.research?.becomes;
  const found = table ? roll(t, (rng) => rollLootTable(ix, table, rng)) : [];
  t.stash.push(...found);
  const names = found.map((id) => {
    const it = ix.item(id);
    return `${/^[aeiou]/i.test(it.name) ? "an" : "a"} ${it.name}${it.tags.includes("magic") ? " (magic!)" : ""}`;
  });
  news(
    t,
    `${by} worked out the ${def.name.toLowerCase()}: it's ${names.length ? listWords(names) : "nothing at all"}. It's in the store room.`,
    found.some((id) => ix.item(id).tags.includes("magic")) ? "good" : undefined,
  );
}

/** A day at the Library (end of each day): every researcher at home studies. */
export function studyDay(ix: Index, t: TownState, away: ReadonlySet<string>): void {
  const r = t.research;
  if (!r.desks.length) return;
  t.research = r;
  const rules = ix.lib.research;
  // Desks beyond what the Library has now (damaged in a raid) stand empty.
  const open = researchDesks(ix, t);
  for (const desk of r.desks.slice(0, open)) {
    const h = findHero(t, desk.hero);
    if (!h || !canStudy(h, away)) continue;
    const topic = deskTopic(ix, t, desk);
    if (!topic) continue;
    const points = studyRate(ix, h);
    if (topic.kind === "monster") learnMonster(ix, t, topic.id.slice("monster:".length), points);
    else if (topic.kind === "shard") studyShard(ix, t, topic.id.slice("shard:".length), points);
    else {
      const piece = t.research.shelf.find((x) => `shelf:${x.id}` === topic.id);
      if (piece) {
        piece.points = Math.round((piece.points + points) * 10) / 10;
        if (piece.points >= (ix.item(piece.item).research?.points ?? 0))
          identify(ix, t, piece, h.name);
      }
    }
    applyMorale(ix, h, { studied: 1 }, t.day);
    if (rules.xpPerDay) {
      const levels = roll(t, (rng) => gainXp(ix, h, rules.xpPerDay, rng, built(t)));
      if (levels) {
        applyMorale(ix, h, { levelUp: levels }, t.day);
        news(t, `${h.name} reached level ${h.level} at the Library.`, "good");
      }
    }
  }
}

/** Take anyone who has left the guild off the desks. */
export function tidyDesks(t: TownState): void {
  if (!t.research) return;
  t.research.desks = t.research.desks.filter((d) => findHero(t, d.hero));
}
