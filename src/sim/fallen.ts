/**
 * The fallen (DESIGN.md §10). A dead hero leaves a body. Brought home, it can
 * be resurrected at the Temple (for gold and the hero's most recent levels)
 * or buried in the Graveyard. Left in the dungeon, it rises after a while as
 * an undead version of the hero ("Bram, Risen") with their class, fighting
 * style and whatever of their gear is still lying there.
 *
 * This file holds the plain data and the hero-level rules. The town actions
 * (resurrect, bury) and the passing of days live in town/ (bodies.ts, days.ts).
 */
import type { StatBlock } from "../content/types";
import { STATS } from "../content/types";
import { EQUIP_SLOTS, heroPassives, type EquipSlot, type Hero, type HeroSheet } from "./hero";
import type { Index } from "./library";
import { computeDerived, effectiveStats, skillValue } from "./stats";

/** A dead hero's body: a snapshot of the hero as they died, without their gear. */
export interface Body {
  id: string;
  hero: Hero;
  /** What they had on when they died (item ids), so a risen hero can pick it up again. */
  gear: Partial<Record<EquipSlot, string>>;
  /** Day they died. */
  died: number;
  /** Where the body is lying (0 = in town). */
  floor: number;
  /** A risen hero, put down for good: it can only be buried. */
  risen?: boolean;
}

/** A hero the dungeon kept, risen as one of the undead (DESIGN.md §10). */
export interface Risen {
  id: string;
  body: Body;
  /** Gear they found where they fell and wear now. */
  equipment: Partial<Record<EquipSlot, string>>;
  /** The floor they haunt. They climb towards the pit over time. */
  floor: number;
  /** Day they rose. */
  rose: number;
}

/** A body from a hero who just died (the hero isn't changed). */
export function makeBody(id: string, hero: Hero, day: number, floor: number): Body {
  const gear: Body["gear"] = {};
  for (const s of EQUIP_SLOTS) if (hero.equipment[s]) gear[s] = hero.equipment[s];
  const snap = structuredClone(hero);
  snap.equipment = {};
  snap.pack = [];
  snap.hp = 0;
  snap.mana = 0;
  snap.condition = "dead";
  return { id, hero: snap, gear, died: day, floor };
}

/** The risen hero's name: "Bram, Risen". */
export const risenName = (ix: Index, r: Risen | Body): string =>
  `${"body" in r ? r.body.hero.name : r.hero.name}${ix.transform(ix.lib.fallen.transform).suffix}`;

/** The risen hero as a Hero, wearing what they picked up, ready for a fight. */
export function risenHero(ix: Index, r: Risen): Hero {
  const tf = ix.transform(ix.lib.fallen.transform);
  const h = structuredClone(r.body.hero);
  const stats = { ...h.stats } as Record<keyof StatBlock, number>;
  for (const s of STATS) stats[s] = Math.max(1, stats[s] + (tf.stats[s] ?? 0));
  return {
    ...h,
    id: r.id,
    name: risenName(ix, r),
    stats,
    equipment: { ...r.equipment },
    pack: [],
    condition: "ok",
    levelUps: [],
  };
}

/**
 * A risen hero's fighting sheet: the hero's own (class, perks, gear, the
 * transform's stat changes) plus the transform's passives, tags and extra HP.
 */
export function risenSheet(ix: Index, hero: Hero): HeroSheet {
  const tf = ix.transform(ix.lib.fallen.transform);
  const passives = [...heroPassives(ix, hero), ...tf.passives];
  const stats = effectiveStats(hero.stats, passives);
  const weapon = hero.equipment.weapon ? ix.item(hero.equipment.weapon) : undefined;
  const derived = computeDerived(stats, passives, {
    ranged: weapon?.ranged ?? false,
    finesse: weapon?.tags.includes("finesse") ?? false,
  });
  derived.maxHp = Math.max(1, Math.round((derived.maxHp * tf.hpPercent) / 100));
  const skills: Record<string, number> = {};
  for (const s of ix.lib.skills) skills[s.id] = skillValue(s, stats, passives);
  return {
    stats,
    derived,
    skills,
    passives,
    tags: [...new Set([...tf.tags, ...Object.keys(hero.classes)])],
  };
}

/** The AI a risen hero fights with: the transform's, or their class's. */
export function risenAi(ix: Index, hero: Hero): string {
  return ix.transform(ix.lib.fallen.transform).ai ?? ix.cls(hero.classId).ai;
}

/** What it costs to bring a hero back at the Temple, at its current level. */
export interface ResurrectTerms {
  gold: number;
  /** Levels they'll lose, off the top. */
  levels: number;
  /** Rare materials the priests need (DESIGN.md §10), by item id. */
  materials: Readonly<Record<string, number>>;
}

/**
 * The Temple's price for this hero (DESIGN.md §10): gold + goldPerLevel ×
 * level, its materials, and max(levels, percent% of their level, rounded up) levels, never
 * taking them below level 1.
 */
export function resurrectTerms(
  e: {
    gold: number;
    goldPerLevel: number;
    levels: number;
    percent: number;
    materials?: Readonly<Record<string, number>>;
  },
  hero: Hero,
): ResurrectTerms {
  const want = Math.max(e.levels, Math.ceil((hero.level * e.percent) / 100));
  return {
    gold: e.gold + e.goldPerLevel * hero.level,
    levels: Math.min(want, Math.max(0, hero.level - 1)),
    materials: e.materials ?? {},
  };
}
