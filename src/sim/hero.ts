/**
 * Heroes: the persistent state of a party member between fights.
 * Everything here is plain data so it can be saved (M4).
 */
import {
  STATS,
  type ItemSlot,
  type PassiveEffect,
  type Row,
  type Stat,
  type StatBlock,
} from "../content/types";
import type { Index } from "./library";
import type { Rng } from "./rng";
import { computeDerived, effectiveStats, skillValue, type DerivedBlock } from "./stats";

export type EquipSlot = Extract<ItemSlot, "weapon" | "offhand" | "armor">;
export const EQUIP_SLOTS: readonly EquipSlot[] = ["weapon", "offhand", "armor"];

export interface Hero {
  id: string;
  name: string;
  classId: string;
  level: number;
  /** Primary stats before gear and perks. */
  stats: StatBlock;
  perks: string[];
  equipment: Partial<Record<EquipSlot, string>>;
  /** Carried consumables and loot, by item id. */
  pack: string[];
  row: Row;
  hp: number;
  mana: number;
  /** "downed" heroes are at 0 HP and need help; "dead" is permanent. */
  condition: "ok" | "downed" | "dead";
}

/** Everything about a hero worked out from their stats, gear and perks. */
export interface HeroSheet {
  stats: StatBlock;
  derived: DerivedBlock;
  skills: Record<string, number>;
  passives: PassiveEffect[];
  tags: string[];
}

export function heroPassives(ix: Index, hero: Hero): PassiveEffect[] {
  const out: PassiveEffect[] = [];
  for (const slot of EQUIP_SLOTS) {
    const id = hero.equipment[slot];
    if (id) out.push(...(ix.item(id).passives ?? []));
  }
  for (const id of hero.perks) out.push(...ix.perk(id).passives);
  return out;
}

export function heroSheet(ix: Index, hero: Hero): HeroSheet {
  const passives = heroPassives(ix, hero);
  const stats = effectiveStats(hero.stats, passives);
  const weapon = hero.equipment.weapon ? ix.item(hero.equipment.weapon) : undefined;
  const derived = computeDerived(stats, passives, { ranged: weapon?.ranged ?? false });
  const skills: Record<string, number> = {};
  for (const s of ix.lib.skills) skills[s.id] = skillValue(s, stats, passives);
  return { stats, derived, skills, passives, tags: ["hero", ix.cls(hero.classId).id] };
}

/**
 * Make a fresh level-1 recruit: class base stats, each rolled ±2,
 * wearing the class's starting kit.
 */
export function createHero(
  ix: Index,
  opts: { id: string; name: string; classId: string },
  rng: Rng,
): Hero {
  const cls = ix.cls(opts.classId);
  const stats = {} as Record<Stat, number>;
  for (const s of STATS) stats[s] = Math.max(1, Math.min(20, cls.baseStats[s] + rng.int(-2, 2)));
  const hero: Hero = {
    id: opts.id,
    name: opts.name,
    classId: cls.id,
    level: 1,
    stats,
    perks: [],
    equipment: {},
    pack: [],
    row: cls.row,
    hp: 0,
    mana: 0,
    condition: "ok",
  };
  for (const itemId of cls.startingKit) {
    const item = ix.item(itemId);
    if ((EQUIP_SLOTS as readonly string[]).includes(item.slot)) {
      hero.equipment[item.slot as EquipSlot] = item.id;
    } else {
      hero.pack.push(item.id);
    }
  }
  const { derived } = heroSheet(ix, hero);
  hero.hp = derived.maxHp;
  hero.mana = derived.mana;
  return hero;
}

/** One of each class, named from the given list. Handy for tests and demos. */
export function createStarterParty(ix: Index, names: readonly string[], rng: Rng): Hero[] {
  const pool = [...names];
  return ix.lib.classes.map((cls, i) => {
    const name = pool.length ? pool.splice(rng.int(0, pool.length - 1), 1)[0]! : `Hero ${i + 1}`;
    return createHero(ix, { id: `hero-${i + 1}`, name, classId: cls.id }, rng);
  });
}
