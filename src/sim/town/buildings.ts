/**
 * Upgrading and repairing buildings, and the helpers who speed builds up.
 */
import type { Hero } from "../hero";
import type { Index } from "../library";
import { type TownState, TownError } from "./state";
import { materialsShort, repairCost } from "./read";
import { book, edit, useMaterials } from "./internal";

/** The next level of a building, if there is one. */
export function nextLevel(ix: Index, town: TownState, buildingId: string) {
  const def = ix.building(buildingId);
  const level = town.buildings[buildingId] ?? 0;
  return def.levels[level];
}

/** The work going on at a building, if any. */
export const underConstruction = (town: TownState, buildingId: string) =>
  town.construction.find((c) => c.building === buildingId);

/**
 * Pay for the next level (gold and any materials) and set the builders to work. It takes the level's
 * `days` to finish; until then the building works at its old level. One job
 * per building at a time, but different buildings can go up together.
 */
export function upgrade(ix: Index, town: TownState, buildingId: string): TownState {
  const next = nextLevel(ix, town, buildingId);
  if (!next) throw new TownError("It can't be built any bigger yet.");
  if (underConstruction(town, buildingId)) throw new TownError("The builders are already at it.");
  if (town.damaged.includes(buildingId)) throw new TownError("Repair it first.");
  if (town.gold < next.cost) throw new TownError("Not enough gold.");
  const short = materialsShort(ix, town, next.materials);
  if (short) throw new TownError(`Not enough materials: short of ${short}.`);
  const t = edit(town);
  book(t, "built", -next.cost);
  useMaterials(t, next.materials);
  const level = (t.buildings[buildingId] ?? 0) + 1;
  if (next.days <= 0) t.buildings[buildingId] = level;
  else t.construction.push({ building: buildingId, level, daysLeft: next.days, started: t.day });
  return t;
}

/**
 * Heroes resting in town who can lend the builders a hand (not away, not
 * injured, not knocked out), and how many days of work they add each day
 * between them (content/town.ts `helpers`).
 */
export function builderHands(
  ix: Index,
  town: TownState,
  away: ReadonlySet<string> = new Set(),
): { heroes: Hero[]; work: number } {
  const rules = ix.lib.town.helpers;
  const heroes = town.roster.filter(
    (h) => !away.has(h.id) && h.condition === "ok" && h.hp > 0 && !h.injuries.length,
  );
  const raw = heroes.reduce(
    (s, h) => s + rules.perHero * Math.max(0, 1 + (h.stats.STR - 10) * rules.perStr),
    0,
  );
  return { heroes, work: Math.min(rules.maxPerDay, raw) };
}

/**
 * A day's building work: a day off every job, plus whatever the heroes at
 * home add, oldest job first. Finished jobs take effect straight away.
 */
export function buildersWork(ix: Index, t: TownState, away: ReadonlySet<string>): void {
  let extra = t.construction.length ? builderHands(ix, t, away).work : 0;
  for (const c of t.construction) {
    c.daysLeft -= 1;
    if (extra > 0 && c.daysLeft > 0) {
      const banked = (c.helped ?? 0) + extra;
      const whole = Math.min(c.daysLeft, Math.floor(banked + 1e-9));
      c.daysLeft -= whole;
      c.helped = c.daysLeft > 0 ? banked - whole : 0;
      extra = 0;
    }
    if (c.daysLeft <= 0) t.buildings[c.building] = c.level;
  }
  t.construction = t.construction.filter((c) => c.daysLeft > 0);
}

/** Fix a raid-damaged building so it works again. */
export function repair(ix: Index, town: TownState, buildingId: string): TownState {
  if (!town.damaged.includes(buildingId)) throw new TownError("It isn't damaged.");
  const cost = repairCost(ix, town, buildingId);
  if (town.gold < cost) throw new TownError("Not enough gold.");
  const t = edit(town);
  book(t, "repairs", -cost);
  t.damaged = t.damaged.filter((id) => id !== buildingId);
  return t;
}
