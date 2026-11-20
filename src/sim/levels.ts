/**
 * Experience and levelling (DESIGN.md §9, the hybrid style). Every level the
 * hero's class gives fixed stat gains straight away. The player then picks
 * one perk from a few on offer (weighted towards the class), and every few
 * levels a free stat point too. Numbers live in content/levels.ts; perks are
 * content in content/perks/.
 */
import { STATS, type Stat } from "../content/types";
import type { Hero, LevelUp } from "./hero";
import type { Index } from "./library";
import type { Rng } from "./rng";

/** Total XP needed to reach a level. */
export function xpForLevel(ix: Index, level: number): number {
  const l = ix.lib.levels;
  return level <= 1 ? 0 : Math.round(l.xpBase * (level - 1) ** l.xpGrowth);
}

/** XP progress towards the next level, for bars. */
export function xpProgress(ix: Index, hero: Hero): { into: number; needed: number; max: boolean } {
  if (hero.level >= ix.lib.levels.maxLevel) return { into: 0, needed: 0, max: true };
  const from = xpForLevel(ix, hero.level);
  const to = xpForLevel(ix, hero.level + 1);
  return { into: hero.xp - from, needed: to - from, max: false };
}

/** Perks this hero could be offered now, with their weights. */
export function perkPool(ix: Index, hero: Hero): { id: string; weight: number }[] {
  const l = ix.lib.levels;
  return ix.lib.perks
    .filter((p) => !hero.perks.includes(p.id))
    .filter((p) => !p.classes.length || p.classes.includes(hero.classId))
    .filter((p) => (p.minLevel ?? 2) <= hero.level)
    .map((p) => ({
      id: p.id,
      weight: p.classes.length ? l.classPerkWeight : 1,
    }));
}

/** Roll the offers for the next level-up to spend, if they haven't been rolled. */
export function rollOffers(ix: Index, hero: Hero, rng: Rng): void {
  const next = hero.levelUps[0];
  if (!next || next.offers.length) return;
  const pool = perkPool(ix, hero);
  while (next.offers.length < ix.lib.levels.perkOffers && pool.length) {
    let roll = rng.next() * pool.reduce((s, p) => s + p.weight, 0);
    const i = Math.max(
      0,
      pool.findIndex((p) => (roll -= p.weight) < 0),
    );
    next.offers.push(pool.splice(i, 1)[0]!.id);
  }
  if (next.offers.length && rng.chance(ix.lib.levels.wantChance))
    next.wants = rng.pick(next.offers);
}

/**
 * Give a hero XP. Each level gained applies the class's stat gains at once and
 * queues a level-up for the player to spend. Returns the levels gained.
 */
export function gainXp(ix: Index, hero: Hero, amount: number, rng: Rng): number {
  if (amount <= 0 || hero.condition === "dead") return 0;
  hero.xp += Math.round(amount);
  const l = ix.lib.levels;
  let gained = 0;
  while (hero.level < l.maxLevel && hero.xp >= xpForLevel(ix, hero.level + 1)) {
    hero.level += 1;
    gained += 1;
    const growth = ix.cls(hero.classId).growth;
    const stats = { ...hero.stats } as Record<Stat, number>;
    for (const s of STATS) stats[s] = Math.min(30, stats[s] + (growth[s] ?? 0));
    hero.stats = stats;
    const up: LevelUp = {
      level: hero.level,
      offers: [],
      freeStat: hero.level % l.freeStatEvery === 0,
    };
    hero.levelUps.push(up);
  }
  rollOffers(ix, hero, rng);
  return gained;
}

/** Why a level-up choice isn't allowed, or undefined if it is. */
export function badChoice(
  hero: Hero,
  perk: string | undefined,
  stat: Stat | undefined,
): string | undefined {
  const next = hero.levelUps[0];
  if (!next) return `${hero.name} has no level-up to spend.`;
  if (next.offers.length && (!perk || !next.offers.includes(perk)))
    return "Pick one of the perks on offer.";
  if (!next.offers.length && perk) return "There are no perks on offer this time.";
  if (next.freeStat && (!stat || !STATS.includes(stat))) return "Pick a stat for the free point.";
  if (!next.freeStat && stat) return "No free stat point this level.";
  if (stat && hero.stats[stat] >= 30) return `${stat} can't go any higher.`;
  return undefined;
}

/**
 * Spend the oldest level-up: learn the perk and add the free stat point.
 * Returns whether they got the perk they wanted. Changes the hero.
 */
export function spendLevelUp(
  ix: Index,
  hero: Hero,
  perk: string | undefined,
  stat: Stat | undefined,
  rng: Rng,
): { wanted: boolean } {
  const why = badChoice(hero, perk, stat);
  if (why) throw new Error(why);
  const next = hero.levelUps.shift()!;
  if (perk) hero.perks = [...hero.perks, perk];
  if (stat) hero.stats = { ...hero.stats, [stat]: hero.stats[stat] + 1 };
  rollOffers(ix, hero, rng);
  return { wanted: !!perk && perk === next.wants };
}
