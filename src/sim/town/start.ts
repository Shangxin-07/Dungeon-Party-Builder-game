/**
 * Starting a town, and the daily crop of recruits.
 */
import { DEFAULT_ORDERS } from "../expedition";
import { newDungeon } from "../dungeon";
import { baseClasses, createHero, rollRecruit, trainRecruit, type Hero } from "../hero";
import type { Index } from "../library";
import type { Rng } from "../rng";
import { TOWN_VERSION, newRecord, type TownState } from "./state";
import { total, recruitsToday, recruitPicks } from "./read";
import { roll } from "./internal";
import { kitOut } from "./gear";
import { storyDay } from "./story";

export function pickName(town: TownState, names: readonly string[], rng: Rng): string {
  const taken = new Set([...town.roster, ...town.recruits].map((h) => h.name));
  const free = names.filter((n) => !taken.has(n));
  if (free.length) return rng.pick(free);
  const base = rng.pick(names);
  for (let n = 2; ; n++) if (!taken.has(`${base} ${n}`)) return `${base} ${n}`;
}

/** A new hero. With `picks` above 1, the best of that many rolls by the class's main stats. */
export function makeHero(
  ix: Index,
  town: TownState,
  names: readonly string[],
  classId: string,
  picks = 1,
): Hero {
  return roll(town, (rng) => {
    const id = `h${town.nextHeroId++}`;
    const name = pickName(town, names, rng);
    const main = ix.cls(classId).mainStats;
    const score = (h: Hero) => main.reduce((s, st) => s + h.stats[st], 0);
    let best = createHero(ix, { id, name, classId }, rng);
    for (let i = 1; i < picks; i++) {
      const other = createHero(ix, { id, name, classId }, rng);
      if (score(other) > score(best)) best = other;
    }
    return best;
  });
}

/** Someone untrained looking for work (M6). */
export function makeRecruit(ix: Index, town: TownState, names: readonly string[], picks = 1): Hero {
  return roll(town, (rng) => {
    const id = `h${town.nextHeroId++}`;
    return rollRecruit(ix, { id, name: pickName(town, names, rng) }, rng, picks);
  });
}

/**
 * Free hires can't outnumber the starting recruits still waiting. Saves from
 * M6.03 to M6.13 could have a starting recruit signed as a porter without the
 * count going down, which left the guild waiting forever for a recruit who was
 * already signed, and no new recruits ever turned up.
 */
export function tidyFreeHires(town: TownState): void {
  const waiting = town.recruits.filter((r) => r.untrained).length;
  town.freeHires = Math.min(town.freeHires, waiting);
}

/**
 * A fresh batch of recruits looking for work: untrained, except for those a
 * good Tavern sends trained and kitted. The starting recruits wait until signed.
 */
export function freshRecruits(ix: Index, town: TownState, names: readonly string[]): void {
  tidyFreeHires(town);
  if (town.freeHires > 0) return;
  town.recruits = [];
  const trained = total(ix, town, "trainedRecruits");
  for (let i = 0; i < recruitsToday(ix, town); i++) {
    if (i < trained) {
      const classId = roll(town, (rng) => rng.pick(baseClasses(ix)).id);
      town.recruits.push(makeHero(ix, town, names, classId, recruitPicks(ix, town)));
    } else town.recruits.push(makeRecruit(ix, town, names, recruitPicks(ix, town)));
  }
}

/**
 * A new game. With `camp`, it starts with the opening (DESIGN.md §8,
 * content/opening.ts): at the mining camp, with makeshift kit, no Guild Hall,
 * and no delving until the camp is held.
 */
export function newTown(
  ix: Index,
  names: readonly string[],
  seed: number,
  opts: { camp?: boolean } = {},
): TownState {
  const rules = ix.lib.town;
  const opening = opts.camp ? ix.lib.opening : undefined;
  const town: TownState = {
    version: TOWN_VERSION,
    day: 1,
    gold: opening?.startingGold ?? rules.startingGold,
    seed,
    buildings: Object.fromEntries(
      ix.lib.buildings.map((b) => [b.id, opening?.unbuilt.includes(b.id) ? 0 : b.startLevel]),
    ),
    roster: [],
    recruits: [],
    stash: [...(opening?.startingStash ?? rules.startingStash)],
    party: [],
    orders: DEFAULT_ORDERS,
    records: {},
    memorial: [],
    trips: [],
    outings: [],
    nextHeroId: 1,
    dungeon: newDungeon(ix),
    damaged: [],
    pit: [],
    raids: [],
    construction: [],
    sites: [],
    scavenged: [],
    departed: [],
    nextThingId: 1,
    news: [],
    ledger: [],
    freeHires: rules.startingRecruits,
    secrets: { found: 0, missed: 0, gold: 0 },
    porters: [],
    parties: [],
    bodies: [],
    risen: [],
    materials: {},
    haul: [],
    haulRule: "sell",
    research: { monsters: {}, shelf: [], desks: [] },
    posts: {},
    intel: {},
    sightings: {},
    workshops: {},
    folk: { count: 0, food: 0, jobs: {} },
    offers: [],
    lairs: {},
    shards: {},
    renown: 0,
    digs: {},
    story: {},
  };
  // M6: the first heroes turn up untrained. The player picks their classes
  // and kits them out from the store room (or calls autoStart).
  for (let i = 0; i < rules.startingRecruits; i++) town.recruits.push(makeRecruit(ix, town, names));
  if (!opening) {
    // The guild starts delving at once: the story opens (M8.21).
    storyDay(ix, town);
    return town;
  }
  // At the mining camp they're already here, as miners with whatever was to
  // hand: half in the front row with the picks, the rest behind with slings.
  town.camp = true;
  town.freeHires = 0;
  let t = town;
  town.recruits.forEach((r, i) => {
    const h = trainRecruit(ix, r, opening.campClass);
    if (i >= Math.ceil(town.recruits.length / 2)) h.row = "back";
    t.roster.push(h);
    t.records[h.id] = newRecord(t.day);
  });
  t.recruits = [];
  for (const h of t.roster) t = kitOut(ix, t, h.id, false);
  return t;
}
