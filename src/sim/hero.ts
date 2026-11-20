/**
 * Heroes: the persistent state of a party member between fights, including
 * their personality (motivation, likes, favourite building, morale) and
 * progress (XP, levels waiting to be spent). Everything here is plain data
 * so it can be saved.
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
import { createRng, type Rng } from "./rng";
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
  /** Experience earned so far (DESIGN.md §9). */
  xp: number;
  /** Level-ups waiting for the player to pick a perk (and a stat), oldest first. */
  levelUps: LevelUp[];
  /** 0-100 (DESIGN.md §6). At 0 they quit the guild. */
  morale: number;
  /** Motivation id: what raises and lowers their morale. */
  motivation: string;
  /** Building id they'd love the town to have. */
  favourite: string;
  /** A gear tag they like using ("sword", "fire"...), if any. */
  likes?: string;
  /** A gear tag they hate using, if any. */
  dislikes?: string;
  /** Recent morale changes and why, newest last. */
  moraleLog: MoraleNote[];
  /** 0-100: builds up on trips, wears off in town (content/wear.ts). */
  fatigue: number;
  /** Lasting wounds and the days in town left until each heals. */
  injuries: { id: string; days: number }[];
}

/** The fatigue tier a hero is in ("tired", "exhausted"), if any. */
export function fatigueTier(ix: Index, hero: Hero) {
  let tier: (typeof ix.lib.wear.tiers)[number] | undefined;
  for (const t of ix.lib.wear.tiers) if ((hero.fatigue ?? 0) >= t.at) tier = t;
  return tier;
}

/** A level gained but not yet spent. */
export interface LevelUp {
  level: number;
  /** Perk ids on offer. Rolled when this becomes the next level-up to spend. */
  offers: string[];
  /** One free stat point comes with this level. */
  freeStat: boolean;
  /** The perk they'd love to be given, if they have a wish. */
  wants?: string;
}

/** One line of a hero's morale history. */
export interface MoraleNote {
  /** The day it happened (the last day, for notes covering several days). */
  day: number;
  /** First day, for notes covering several days. */
  since?: number;
  amount: number;
  reason: string;
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
  for (const inj of hero.injuries ?? []) out.push(...ix.injury(inj.id).passives);
  out.push(...(fatigueTier(ix, hero)?.passives ?? []));
  return out;
}

export function heroSheet(ix: Index, hero: Hero): HeroSheet {
  const passives = heroPassives(ix, hero);
  const stats = effectiveStats(hero.stats, passives);
  const weapon = hero.equipment.weapon ? ix.item(hero.equipment.weapon) : undefined;
  const derived = computeDerived(stats, passives, {
    ranged: weapon?.ranged ?? false,
  });
  const skills: Record<string, number> = {};
  for (const s of ix.lib.skills) skills[s.id] = skillValue(s, stats, passives);
  return {
    stats,
    derived,
    skills,
    passives,
    tags: ["hero", ix.cls(hero.classId).id],
  };
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
    xp: 0,
    levelUps: [],
    moraleLog: [],
    fatigue: 0,
    injuries: [],
    ...rollPersonality(ix, opts.id, opts.name, stats, cls.id),
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

/** A small, stable number from a string, so personalities don't use up the dice. */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

function weighted<T>(rng: Rng, list: readonly T[], weight: (t: T) => number): T {
  let roll = rng.next() * list.reduce((s, t) => s + weight(t), 0);
  return list.find((t) => (roll -= weight(t)) < 0) ?? list.at(-1)!;
}

export type Personality = Pick<Hero, "morale" | "motivation" | "favourite" | "likes" | "dislikes">;

/**
 * Who a hero is (DESIGN.md §6): motivation, what gear they like and dislike,
 * their favourite building and starting morale. Worked out from the hero's id,
 * name and stats rather than the shared dice, so adding personalities didn't
 * change any fight, and old saves can be given the same personalities.
 */
export function rollPersonality(
  ix: Index,
  id: string,
  name: string,
  stats: StatBlock,
  classId?: string,
): Personality {
  const rng = createRng(hash(`${id}|${name}|${STATS.map((s) => stats[s]).join(",")}`));
  const lib = ix.lib;
  const motivation = weighted(rng, lib.motivations, (m) => m.weight);
  const favourite = weighted(rng, motivation.favourites, (f) => f.weight).building;
  const morale = rng.int(lib.morale.start[0], lib.morale.start[1]);
  const classLikes = classId ? ix.cls(classId).likes : [];
  const likes = classLikes.length ? rng.pick(classLikes) : undefined;
  const others = lib.morale.dislikeTags.filter((t) => !classLikes.includes(t));
  const dislikes =
    others.length && rng.chance(lib.morale.dislikeChance) ? rng.pick(others) : undefined;
  return { motivation: motivation.id, favourite, morale, likes, dislikes };
}

/** One of each class, named from the given list. Handy for tests and demos. */
export function createStarterParty(
  ix: Index,
  names: readonly string[],
  rng: Rng,
  /** Defaults to the first three classes: the first slice's Fighter, Scout and Mage. */
  classIds: readonly string[] = ix.lib.classes.slice(0, 3).map((c) => c.id),
): Hero[] {
  const pool = [...names];
  return classIds.map((classId, i) => {
    const name = pool.length ? pool.splice(rng.int(0, pool.length - 1), 1)[0]! : `Hero ${i + 1}`;
    return createHero(ix, { id: `hero-${i + 1}`, name, classId }, rng);
  });
}
