/**
 * Heroes: the persistent state of a party member between fights, including
 * their personality (motivation, likes, favourite building, morale) and
 * progress (XP, levels waiting to be spent). Everything here is plain data
 * so it can be saved.
 */
import {
  STATS,
  type ItemDef,
  type ItemSlot,
  type PassiveEffect,
  type Row,
  type Stat,
  type StatBlock,
} from "../content/types";
import { rollAlignment } from "./alignment";
import { rollBackstory } from "./backstory";
import type { Index } from "./library";
import { createRng, type Rng } from "./rng";
import { computeDerived, effectiveStats, skillValue, type DerivedBlock } from "./stats";

export type EquipSlot = Extract<ItemSlot, "weapon" | "offhand" | "armor">;
export const EQUIP_SLOTS: readonly EquipSlot[] = ["weapon", "offhand", "armor"];

export interface Hero {
  id: string;
  name: string;
  /**
   * Their main class: the one with the most levels (the first learned, on a
   * tie). It picks their fighting style and usual kit.
   */
  classId: string;
  /** Hero level: the sum of their class levels, plus any level-ups not yet put into a class. */
  level: number;
  /**
   * Class levels (DESIGN.md §9), in the order they were learned, e.g.
   * { fighter: 6, mage: 3 }. Empty for recruits and porters who haven't
   * been trained.
   */
  classes: Record<string, number>;
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
  /** Alignment id (DESIGN.md §7): Good, Neutral or Evil. Never changes on its own. */
  alignment: string;
  /** Building id they'd love the town to have. */
  favourite: string;
  /** Backstory id (M8.29): where they came from before the pit. Gives a small bonus. */
  backstory: string;
  /** Family name (M8.29). Logs use their first name alone. */
  surname: string;
  /**
   * Backstory moments they've had (M8.31, content/moments/), each once, in
   * the order they first happened. The latest with an epithet names them.
   */
  moments: string[];
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
  /** Extra gold a day on top of the usual retainer, from raises. */
  pay: number;
  /** Extra shares of every haul, from raises (M7.12: Gold heroes ask for a bigger cut). */
  cut?: number;
  /** Gold the guild owes them: a share the purse couldn't cover yet (M7.12). */
  owed?: number;
  /** Level at their last raise talk; they ask again a few levels on. */
  payLevel: number;
  /**
   * A raise they've asked for and not had an answer to yet. `waited` counts
   * the days they've spent in town since (days away don't count); missing on
   * saves from before M6.20, which read as 0.
   */
  raiseAsk?: { amount: number; day: number; waited?: number; kind?: "share" };
  /**
   * A recruit who hasn't picked a class yet (M6): `stats` are their own,
   * before training, and `classId` is only the best fit. Hiring trains them.
   */
  untrained?: boolean;
  /**
   * A porter (M6): signed untrained to carry loot. Porters don't fight; they
   * watch, and once they've seen enough fights they can be trained in a class.
   * `xp` waits until then.
   */
  porter?: { watched: number; xp: number };
  /**
   * Levels spent since this was recorded (DESIGN.md §10), oldest first, so a
   * resurrection can take the most recent ones off exactly. Saves from before
   * the fallen have none for older levels.
   */
  past?: PastLevel[];
  /**
   * Levels lost to a resurrection, lowest first. Each comes back exactly as
   * it was when the hero earns enough XP for that level again.
   */
  lost?: LostLevel[];
  /** Their time as a leader (M7.05, DESIGN.md §17.5). Missing until they first lead. */
  lead?: LeaderRecord;
  /** Ids of deserters this hero won't forgive (M7.05). */
  grudges?: string[];
}

/** A leader's record (M7.05): trips led, Leadership earned by it, and traits. */
export interface LeaderRecord {
  trips: number;
  /** Leadership points earned by leading (added to the skill). */
  points: number;
  /** Trips in a row they brought everyone home. */
  streak: number;
  traits: LeaderTraitNote[];
}

/** A trait a leader picked up, and when. */
export interface LeaderTraitNote {
  id: string;
  day: number;
  /** The party they were leading. */
  party: string;
  /** Trips left before it fades, for traits that do. */
  left?: number;
}

/** A level that has been put into a class and spent. */
export interface PastLevel {
  level: number;
  classId: string;
  /** Stat gains the class gave (after the cap of 30). */
  gains: Partial<Record<Stat, number>>;
  perk?: string;
  /** The free stat point, if this level had one. */
  stat?: Stat;
}

/** A level a resurrection took: spent (`past`) or still waiting to be spent (`pending`). */
export interface LostLevel {
  level: number;
  past?: PastLevel;
  pending?: LevelUp;
}

/** The fatigue tier a hero is in ("tired", "exhausted"), if any. */
export function fatigueTier(ix: Index, hero: Hero) {
  let tier: (typeof ix.lib.wear.tiers)[number] | undefined;
  for (const t of ix.lib.wear.tiers) if (hero.fatigue >= t.at) tier = t;
  return tier;
}

/** A level gained but not yet spent. */
export interface LevelUp {
  level: number;
  /**
   * The class this level went into. Picked by the player (or for them, when
   * there's only one choice); its stat gains come in at that moment.
   */
  classId?: string;
  /** Perk ids on offer. Rolled when the class is picked. */
  offers: string[];
  /** One free stat point comes with this level. */
  freeStat: boolean;
  /** The perk they'd love to be given, if they have a wish. */
  wants?: string;
  /** Stat gains the class gave when it was picked, so they can be taken back (DESIGN.md §10). */
  gains?: Partial<Record<Stat, number>>;
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
    // A weapon in the off hand (M9.04) only gives its second blow.
    if (id && !(slot === "offhand" && ix.item(id).slot === "weapon"))
      out.push(...(ix.item(id).passives ?? []));
  }
  for (const id of hero.perks) out.push(...ix.perk(id).passives);
  out.push(...ix.backstory(hero.backstory).passives);
  out.push(...depthPassives(ix, hero));
  for (const inj of hero.injuries) out.push(...ix.injury(inj.id).passives);
  out.push(...(fatigueTier(ix, hero)?.passives ?? []));
  // Leading makes a better leader (M7.05).
  const led = Math.floor(hero.lead?.points ?? 0);
  if (led > 0) out.push({ type: "modifySkill", skill: "leadership", amount: led });
  return out;
}

/**
 * Dual-wielding (M9.04): how hard this hero's classes let them strike with
 * `item` in the off hand, as a damage percent (the best of their classes),
 * or undefined if none of them can.
 */
export function offhandPercent(ix: Index, hero: Hero, item: ItemDef): number | undefined {
  if (item.slot !== "weapon" || item.ranged) return undefined;
  const classes = Object.keys(hero.classes).length ? Object.keys(hero.classes) : [hero.classId];
  let best: number | undefined;
  for (const id of classes) {
    const rule = ix.cls(id).offhand;
    if (!rule || !item.tags.some((t) => rule.tags.includes(t))) continue;
    if (best === undefined || rule.damagePercent > best) best = rule.damagePercent;
  }
  return best;
}

/** Why `itemId` can't go in this hero's off hand, or undefined if it can. */
export function cantOffhand(ix: Index, hero: Hero, itemId: string): string | undefined {
  const item = ix.item(itemId);
  if (item.slot === "offhand") return undefined;
  if (item.slot !== "weapon") return "That doesn't go in the off hand.";
  if (offhandPercent(ix, hero, item) === undefined)
    return `${hero.name} can't fight with ${item.name.toLowerCase()} in the off hand.`;
  const main = hero.equipment.weapon ? ix.item(hero.equipment.weapon) : undefined;
  if (main?.ranged) return `${main.name} takes both hands.`;
  return undefined;
}

/**
 * The weapon a hero fights with in the off hand (M9.04), and its damage
 * percent: only beside a melee weapon (or bare fists), and only if one of
 * their classes can.
 */
export function offhandWeapon(
  ix: Index,
  hero: Hero,
): { item: ItemDef; damagePercent: number } | undefined {
  const id = hero.equipment.offhand;
  if (!id) return undefined;
  const item = ix.item(id);
  const main = hero.equipment.weapon ? ix.item(hero.equipment.weapon) : undefined;
  if (main?.ranged) return undefined;
  const damagePercent = offhandPercent(ix, hero, item);
  return damagePercent === undefined ? undefined : { item, damagePercent };
}

/** A weapon's own attack bonus (its modifyStat attack passives). */
export const weaponAttackBonus = (item: ItemDef | undefined): number =>
  (item?.passives ?? []).reduce(
    (s, p) => s + (p.type === "modifyStat" && p.stat === "attack" ? p.amount : 0),
    0,
  );

/**
 * What levels give on top of stat gains (DESIGN.md §9): max HP for every
 * hero level, and each class's `perLevel` bonuses for every class level past
 * the first, rounded down.
 */
export function depthPassives(ix: Index, hero: Hero): PassiveEffect[] {
  const out: PassiveEffect[] = [];
  const hp = Math.floor((hero.level - 1) * ix.lib.levels.hpPerLevel);
  if (hp > 0) out.push({ type: "modifyStat", stat: "maxHp", amount: hp });
  for (const [id, level] of Object.entries(hero.classes)) out.push(...classDepth(ix, id, level));
  return out;
}

/** A class's `perLevel` bonuses at this class level, rounded down. */
export function classDepth(ix: Index, classId: string, level: number): PassiveEffect[] {
  const out: PassiveEffect[] = [];
  for (const p of ix.cls(classId).perLevel ?? []) {
    if (p.type === "modifyStat" || p.type === "modifySkill") {
      const amount = Math.floor(p.amount * (level - 1));
      if (amount) out.push({ ...p, amount });
    } else {
      const percent = Math.floor(p.percent * (level - 1));
      if (percent) out.push({ ...p, percent });
    }
  }
  return out;
}

/** "Fighter 6 / Mage 3", deepest first; "Fighter" for a level-1 hero. */
export function classLine(ix: Index, hero: Hero): string {
  if (hero.untrained || hero.porter) return hero.porter ? "Porter" : "untrained";
  const entries = Object.entries(hero.classes).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return ix.cls(hero.classId).name;
  return entries.map(([id, l]) => `${ix.cls(id).name} ${l}`).join(" / ");
}

/**
 * "Fighter, level 3", or "Fighter 4 / Mage 2, level 6" for a hero with more
 * than one class. `short` gives "Fighter 3" for a hero with one class.
 */
export function heroTitle(ix: Index, hero: Hero, short = false): string {
  if (hero.porter) return "Porter";
  if (hero.untrained) return "untrained";
  const classes = Object.entries(hero.classes);
  const placed = classes.reduce((s, [, l]) => s + l, 0);
  if (classes.length <= 1 && placed === hero.level)
    return short
      ? `${ix.cls(hero.classId).name} ${hero.level}`
      : `${ix.cls(hero.classId).name}, level ${hero.level}`;
  return `${classLine(ix, hero)}, level ${hero.level}`;
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
    // "align:good" and the like (DESIGN.md §7): monsters that hunt by alignment look for it.
    tags: [
      "hero",
      ...new Set([ix.cls(hero.classId).id, ...Object.keys(hero.classes)]),
      ...(hero.alignment ? [`align:${hero.alignment}`] : []),
    ],
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
  for (const s of STATS)
    stats[s] = Math.max(1, Math.min(20, (cls.baseStats?.[s] ?? 10) + rng.int(-2, 2)));
  const hero: Hero = {
    id: opts.id,
    name: opts.name,
    classId: cls.id,
    level: 1,
    classes: { [cls.id]: 1 },
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
    pay: 0,
    payLevel: 1,
    ...rollPersonality(ix, opts.id, opts.name, stats, cls.id),
    ...origins(ix, opts.id, opts.name),
    moments: [],
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

/** Alignment, backstory and surname: who a hero is, from their id and name. */
function origins(ix: Index, id: string, name: string) {
  const alignment = rollAlignment(ix, id, name);
  return { alignment, ...rollBackstory(ix, id, name, alignment) };
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

/** How well raw stats suit a class: the sum of its main stats. */
export const classFit = (ix: Index, stats: StatBlock, classId: string) =>
  ix.cls(classId).mainStats.reduce((s, st) => s + stats[st], 0);

/** Classes a recruit can be trained in: the base ones. */
export const baseClasses = (ix: Index) =>
  ix.lib.classes.filter((c) => (c.kind ?? "base") === "base");

/** Whether a hero is still in a camp class (the opening's Miner) and has to pick a real one. */
export const inCampClass = (ix: Index, h: Hero) => ix.cls(h.classId).kind === "camp";

/** The class a recruit's own stats suit best. */
export function bestClass(ix: Index, stats: StatBlock): string {
  let best = baseClasses(ix)[0]!.id;
  for (const c of baseClasses(ix))
    if (classFit(ix, stats, c.id) > classFit(ix, stats, best)) best = c.id;
  return best;
}

/**
 * Someone looking for work, before any training (M6): stats of their own
 * (10 ± 2 each, plus a talent: +2 on one), no class, no gear. With `picks`
 * above 1, the best of that many by their two best stats.
 */
export function rollRecruit(
  ix: Index,
  opts: { id: string; name: string },
  rng: Rng,
  picks = 1,
): Hero {
  const roll = () => {
    const stats = {} as Record<Stat, number>;
    for (const s of STATS) stats[s] = 10 + rng.int(-2, 2);
    stats[rng.pick(STATS)] += 2;
    return stats;
  };
  const score = (st: StatBlock) =>
    [...STATS]
      .map((s) => st[s])
      .sort((a, b) => b - a)
      .slice(0, 2)
      .reduce((a, b) => a + b, 0);
  let stats = roll();
  for (let i = 1; i < picks; i++) {
    const other = roll();
    if (score(other) > score(stats)) stats = other;
  }
  const classId = bestClass(ix, stats);
  return {
    id: opts.id,
    name: opts.name,
    classId,
    level: 1,
    classes: {},
    stats,
    perks: [],
    equipment: {},
    pack: [],
    row: ix.cls(classId).row,
    hp: 0,
    mana: 0,
    condition: "ok",
    xp: 0,
    levelUps: [],
    moraleLog: [],
    fatigue: 0,
    injuries: [],
    pay: 0,
    payLevel: 1,
    untrained: true,
    ...rollPersonality(ix, opts.id, opts.name, stats),
    ...origins(ix, opts.id, opts.name),
    moments: [],
  };
}

/**
 * Train a recruit in a class: the class's training moves their stats
 * (class base stats − 10 on each), they take its row, and they pick up its
 * likes. Their motivation and favourite building stay their own. No gear.
 */
export function trainRecruit(ix: Index, recruit: Hero, classId: string): Hero {
  const cls = ix.cls(classId);
  const stats = {} as Record<Stat, number>;
  for (const s of STATS)
    stats[s] = Math.max(1, Math.min(20, recruit.stats[s] + (cls.baseStats?.[s] ?? 10) - 10));
  const p = rollPersonality(ix, recruit.id, recruit.name, recruit.stats, classId);
  const hero: Hero = {
    ...recruit,
    classId,
    classes: { [classId]: 1 },
    stats,
    row: cls.row,
    likes: p.likes,
    dislikes: p.dislikes,
  };
  delete hero.untrained;
  const { derived } = heroSheet(ix, hero);
  hero.hp = derived.maxHp;
  hero.mana = derived.mana;
  return hero;
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
