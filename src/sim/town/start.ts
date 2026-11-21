/**
 * Starting a town, and the daily crop of recruits.
 */
import { DEFAULT_ORDERS } from "../expedition";
import { newDungeon } from "../dungeon";
import { baseClasses, createHero, rollRecruit, type Hero } from "../hero";
import type { Index } from "../library";
import type { Rng } from "../rng";
import { TOWN_VERSION, type TownState } from "./state";
import { total, recruitsToday, recruitPicks } from "./read";
import { roll } from "./internal";

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
  town.freeHires = Math.min(town.freeHires ?? 0, waiting);
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

export function newTown(ix: Index, names: readonly string[], seed: number): TownState {
  const rules = ix.lib.town;
  const town: TownState = {
    version: TOWN_VERSION,
    day: 1,
    gold: rules.startingGold,
    seed,
    buildings: Object.fromEntries(ix.lib.buildings.map((b) => [b.id, b.startLevel])),
    roster: [],
    recruits: [],
    stash: [...rules.startingStash],
    party: [],
    orders: DEFAULT_ORDERS,
    records: {},
    memorial: [],
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
  };
  // M6: the first heroes turn up untrained. The player picks their classes
  // and kits them out from the store room (or calls autoStart).
  for (let i = 0; i < rules.startingRecruits; i++) town.recruits.push(makeRecruit(ix, town, names));
  return town;
}
