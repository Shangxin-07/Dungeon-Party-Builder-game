/**
 * Experience and levelling (DESIGN.md §9). Freeform classes: each level a
 * hero gains goes into a class the player picks, one they know or a new one
 * they qualify for. The class gives its fixed stat gains at once, then the
 * player picks one perk from a few on offer (weighted towards that class, or
 * the class's milestone perks at levels like 5 and 10), and every few hero
 * levels a free stat point too. Heroes never lose a class. Numbers live in
 * content/levels.ts; classes and perks are content.
 */
import { STATS, type ClassDef, type Stat } from "../content/types";
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

/** A hero's level in a class (0 if they don't have it). */
export const levelIn = (hero: Hero, classId: string): number => hero.classes?.[classId] ?? 0;

/** The class with the most levels; the first learned wins a tie. */
export function mainClass(hero: Hero): string {
  let best = hero.classId;
  let top = -1;
  for (const [id, l] of Object.entries(hero.classes ?? {})) if (l > top) [best, top] = [id, l];
  return best;
}

/** Perks that only come as milestones (ClassDef.milestones). */
function milestonePerks(ix: Index): Set<string> {
  const out = new Set<string>();
  for (const c of ix.lib.classes)
    for (const list of Object.values(c.milestones ?? {})) list.forEach((p) => out.add(p));
  return out;
}

/** Perks a level in this class could offer at random now, with their weights. */
export function perkPool(
  ix: Index,
  hero: Hero,
  classId: string = hero.classId,
): { id: string; weight: number }[] {
  const l = ix.lib.levels;
  const special = milestonePerks(ix);
  return ix.lib.perks
    .filter((p) => !hero.perks.includes(p.id) && !special.has(p.id))
    .filter((p) => !p.classes.length || p.classes.includes(classId))
    .filter((p) => (p.minLevel ?? 2) <= hero.level)
    .map((p) => ({
      id: p.id,
      weight: p.classes.length ? l.classPerkWeight : 1,
    }));
}

/** Can a hero put a level into this class, and if not, what's missing. */
export interface ClassOption {
  cls: ClassDef;
  /** Their level in it now (0: a new class). */
  level: number;
  ok: boolean;
  /** What they still need, for the player: "Mage 10 (has 7)", "INT 16 (has 14)", "a Library". */
  missing: string[];
}

/**
 * Every class and whether this hero could put their next level into it. A
 * class they already have is always open. `built` says whether the town has a
 * building standing (for classes that need one); leave it out and none count.
 */
export function classOptions(
  ix: Index,
  hero: Hero,
  built: (buildingId: string) => boolean = () => false,
): ClassOption[] {
  return ix.lib.classes.map((cls) => {
    const level = levelIn(hero, cls.id);
    const missing: string[] = [];
    if (!level) {
      const r = cls.requires ?? {};
      for (const [id, need] of Object.entries(r.classLevels ?? {})) {
        const has = levelIn(hero, id);
        if (has < need) missing.push(`${ix.cls(id).name} ${need}${has ? ` (has ${has})` : ""}`);
      }
      for (const st of STATS) {
        const need = r.stats?.[st];
        if (need !== undefined && hero.stats[st] < need)
          missing.push(`${st} ${need} (has ${hero.stats[st]})`);
      }
      if (r.building && !built(r.building)) missing.push(`a ${ix.building(r.building).name}`);
    }
    return { cls, level, ok: !missing.length, missing };
  });
}

/** The classes a hero could put their next level into, ones they have first. */
export const openClasses = (ix: Index, hero: Hero, built?: (id: string) => boolean) =>
  classOptions(ix, hero, built)
    .filter((o) => o.ok)
    .sort((a, b) => (b.level ? 1 : 0) - (a.level ? 1 : 0));

/** Roll the perk offers for a level that has just gone into a class. */
function rollOffers(ix: Index, hero: Hero, up: LevelUp, rng: Rng): void {
  const classId = up.classId!;
  const milestone = (ix.cls(classId).milestones?.[levelIn(hero, classId)] ?? []).filter(
    (p) => !hero.perks.includes(p),
  );
  if (milestone.length) {
    up.offers = [...milestone];
  } else {
    const pool = perkPool(ix, hero, classId);
    while (up.offers.length < ix.lib.levels.perkOffers && pool.length) {
      let roll = rng.next() * pool.reduce((s, p) => s + p.weight, 0);
      const i = Math.max(
        0,
        pool.findIndex((p) => (roll -= p.weight) < 0),
      );
      up.offers.push(pool.splice(i, 1)[0]!.id);
    }
  }
  if (up.offers.length && rng.chance(ix.lib.levels.wantChance)) up.wants = rng.pick(up.offers);
}

/** Why the hero's next level can't go into this class, or undefined if it can. */
export function badClass(
  ix: Index,
  hero: Hero,
  classId: string,
  built?: (id: string) => boolean,
): string | undefined {
  const next = hero.levelUps[0];
  if (!next) return `${hero.name} has no level-up to spend.`;
  if (next.classId) return `That level has already gone into ${ix.cls(next.classId).name}.`;
  if (hero.untrained || hero.porter) return `${hero.name} hasn't been trained in a class yet.`;
  const opt = classOptions(ix, hero, built).find((o) => o.cls.id === classId);
  if (!opt) return `There's no class called "${classId}".`;
  if (!opt.ok) return `${hero.name} needs ${opt.missing.join(", ")} first.`;
  return undefined;
}

/**
 * Put the hero's oldest level-up into a class: the class level goes up, its
 * stat gains come in, and the perk offers are rolled. Can't be undone.
 */
export function chooseClass(
  ix: Index,
  hero: Hero,
  classId: string,
  rng: Rng,
  built?: (id: string) => boolean,
): void {
  const why = badClass(ix, hero, classId, built);
  if (why) throw new Error(why);
  const up = hero.levelUps[0]!;
  up.classId = classId;
  hero.classes = { ...hero.classes, [classId]: levelIn(hero, classId) + 1 };
  const growth = ix.cls(classId).growth;
  const stats = { ...hero.stats } as Record<Stat, number>;
  for (const s of STATS) stats[s] = Math.min(30, stats[s] + (growth[s] ?? 0));
  hero.stats = stats;
  hero.classId = mainClass(hero);
  rollOffers(ix, hero, up, rng);
}

/** If the oldest level-up has only one class it could go into, put it there. */
function autoClass(ix: Index, hero: Hero, rng: Rng, built?: (id: string) => boolean): void {
  const next = hero.levelUps[0];
  if (!next || next.classId || hero.untrained || hero.porter) return;
  const open = openClasses(ix, hero, built);
  if (open.length === 1) chooseClass(ix, hero, open[0]!.cls.id, rng, built);
}

/**
 * Give a hero XP. Each level gained is queued for the player to put into a
 * class and spend. Returns the levels gained.
 */
export function gainXp(
  ix: Index,
  hero: Hero,
  amount: number,
  rng: Rng,
  built?: (id: string) => boolean,
): number {
  if (amount <= 0 || hero.condition === "dead") return 0;
  hero.xp += Math.round(amount);
  const l = ix.lib.levels;
  let gained = 0;
  while (hero.level < l.maxLevel && hero.xp >= xpForLevel(ix, hero.level + 1)) {
    hero.level += 1;
    gained += 1;
    hero.levelUps.push({
      level: hero.level,
      offers: [],
      freeStat: hero.level % l.freeStatEvery === 0,
    });
  }
  autoClass(ix, hero, rng, built);
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
  if (!next.classId) return "Pick which class gets this level first.";
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
  built?: (id: string) => boolean,
): { wanted: boolean } {
  const why = badChoice(hero, perk, stat);
  if (why) throw new Error(why);
  const next = hero.levelUps.shift()!;
  if (perk) hero.perks = [...hero.perks, perk];
  if (stat) hero.stats = { ...hero.stats, [stat]: hero.stats[stat] + 1 };
  autoClass(ix, hero, rng, built);
  return { wanted: !!perk && perk === next.wants };
}
