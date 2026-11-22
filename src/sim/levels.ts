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
import type { Hero, LevelUp, LostLevel, PastLevel } from "./hero";
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
export const levelIn = (hero: Hero, classId: string): number => hero.classes[classId] ?? 0;

/** The class with the most levels; the first learned wins a tie. */
export function mainClass(hero: Hero): string {
  let best = hero.classId;
  let top = -1;
  for (const [id, l] of Object.entries(hero.classes)) if (l > top) [best, top] = [id, l];
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
  // A camp class (the Miner) is never chosen: only one a hero already holds shows.
  const offered = ix.lib.classes.filter((c) => c.kind !== "camp" || levelIn(hero, c.id));
  return offered.map((cls) => {
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
      if (r.alignments && !r.alignments.includes(hero.alignment))
        missing.push(`to be ${r.alignments.map((a) => ix.alignment(a).name).join(" or ")}`);
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
  const gains: Partial<Record<Stat, number>> = {};
  for (const s of STATS) {
    stats[s] = Math.min(30, stats[s] + (growth[s] ?? 0));
    if (stats[s] !== hero.stats[s]) gains[s] = stats[s] - hero.stats[s];
  }
  hero.stats = stats;
  up.gains = gains;
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
    // A level a resurrection took comes back exactly as it was (DESIGN.md §10).
    if (hero.lost?.[0]?.level === hero.level) {
      restoreLevel(ix, hero, hero.lost.shift()!);
      if (!hero.lost.length) delete hero.lost;
      continue;
    }
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
  hero.past = [
    ...(hero.past ?? []),
    {
      level: next.level,
      classId: next.classId!,
      gains: next.gains ?? { ...ix.cls(next.classId!).growth },
      ...(perk ? { perk } : {}),
      ...(stat ? { stat } : {}),
    },
  ];
  autoClass(ix, hero, rng, built);
  return { wanted: !!perk && perk === next.wants };
}

// ---------------------------------------------------------------------------
// Losing levels (DESIGN.md §10): the price of coming back from the dead.
// ---------------------------------------------------------------------------

/** Add (sign 1) or take away (sign -1) a level in a class and its stat gains. */
function shiftClassLevel(
  hero: Hero,
  classId: string,
  gains: Partial<Record<Stat, number>>,
  sign: 1 | -1,
): void {
  const stats = { ...hero.stats } as Record<Stat, number>;
  for (const s of STATS) stats[s] = Math.max(1, stats[s] + sign * (gains[s] ?? 0));
  hero.stats = stats;
  const classes = { ...hero.classes, [classId]: levelIn(hero, classId) + sign };
  if (classes[classId]! <= 0) delete classes[classId];
  hero.classes = classes;
}

/** Put a lost level back exactly as it was. */
function restoreLevel(ix: Index, hero: Hero, back: LostLevel): void {
  if (back.past) {
    const p = back.past;
    shiftClassLevel(hero, p.classId, p.gains, 1);
    if (p.perk && ix.lib.perks.some((x) => x.id === p.perk)) hero.perks = [...hero.perks, p.perk];
    if (p.stat) hero.stats = { ...hero.stats, [p.stat]: Math.min(30, hero.stats[p.stat] + 1) };
    hero.past = [...(hero.past ?? []), p];
  } else if (back.pending) {
    const up = back.pending;
    if (up.classId) shiftClassLevel(hero, up.classId, up.gains ?? ix.cls(up.classId).growth, 1);
    hero.levelUps.push(up);
  }
  hero.classId = mainClass(hero);
}

/**
 * Take a hero's most recent levels away, newest first (DESIGN.md §10): class
 * levels, their stat gains, the perk and the free stat point. Never below
 * level 1. XP drops to the start of the new level, and each lost level comes
 * back as it was when that XP is earned again. Levels from saves made before
 * levels were recorded come off the main class with its usual gains (their
 * perks stay). Returns the levels taken. Changes the hero.
 */
export function loseLevels(ix: Index, hero: Hero, count: number): number {
  let taken = 0;
  const lost: LostLevel[] = [];
  while (taken < count && hero.level > 1) {
    const level = hero.level;
    const waiting = hero.levelUps.at(-1);
    const last = hero.past?.at(-1);
    if (waiting && waiting.level === level) {
      hero.levelUps = hero.levelUps.slice(0, -1);
      if (waiting.classId)
        shiftClassLevel(hero, waiting.classId, waiting.gains ?? ix.cls(waiting.classId).growth, -1);
      lost.unshift({ level, pending: waiting });
    } else if (last && last.level === level) {
      hero.past = hero.past!.slice(0, -1);
      shiftClassLevel(hero, last.classId, last.gains, -1);
      if (last.perk) {
        const i = hero.perks.lastIndexOf(last.perk);
        if (i >= 0) hero.perks = hero.perks.filter((_, j) => j !== i);
      }
      if (last.stat)
        hero.stats = { ...hero.stats, [last.stat]: Math.max(1, hero.stats[last.stat] - 1) };
      lost.unshift({ level, past: last });
    } else {
      const classId = mainClass(hero);
      const past: PastLevel = { level, classId, gains: { ...ix.cls(classId).growth } };
      shiftClassLevel(hero, classId, past.gains, -1);
      lost.unshift({ level, past });
    }
    hero.level -= 1;
    taken += 1;
  }
  if (!taken) return 0;
  hero.lost = [...lost, ...(hero.lost ?? [])];
  hero.xp = xpForLevel(ix, hero.level);
  hero.classId = mainClass(hero);
  return taken;
}
