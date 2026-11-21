/**
 * Definitions of the things heroes and monsters are made of: classes, items,
 * abilities, statuses, monsters, skills and perks.
 */
import type {
  Stat,
  StatBlock,
  Derived,
  DamageType,
  Row,
  PassiveEffect,
  ActiveEffect,
  Trigger,
} from "./core";

/**
 * What a hero needs before they can put a level into a class they don't have
 * yet (DESIGN.md §9). Everything is optional; a base class usually only asks
 * for a stat or two. Stats are the hero's own, before gear and perks.
 */
export interface ClassRequirements {
  /** Class levels the hero must already have, e.g. { fighter: 5, mage: 5 }. */
  classLevels?: Readonly<Record<string, number>>;
  /** Minimum stats, e.g. { INT: 16 }. */
  stats?: Readonly<Partial<Record<Stat, number>>>;
  /** A building the town must have standing to train it. */
  building?: string;
  /** Alignments allowed to learn it (DESIGN.md §7), e.g. ["good"]. Any, if left out. */
  alignments?: readonly string[];
}

/**
 * Base classes can be recruited into, or learned at any level-up. Advanced
 * classes grow out of one class, combo classes out of two or more; neither
 * can be recruited into. A camp class (the opening's Miner) is what everyone
 * at the mining camp is until it's held; nobody chooses it.
 */
export type ClassKind = "base" | "advanced" | "combo" | "camp";

export interface ClassDef {
  /** Unique kebab-case id, referenced from other content. */
  id: string;
  name: string;
  /** Defaults to "base". */
  kind?: ClassKind;
  /** One-line description shown in town. */
  blurb: string;
  /** What it takes to learn this class at a level-up (a recruit's first class has no requirements). */
  requires?: ClassRequirements;
  /** The stats this class grows fastest in. */
  mainStats: readonly Stat[];
  /**
   * Base classes: typical recruit stats, and training moves a recruit's stats
   * by (base − 10). Advanced and combo classes can't be recruited into, so
   * they leave it out.
   */
  baseStats?: StatBlock;
  /** Tags of gear this class likes using (affects morale later). */
  likes: readonly string[];
  /** Default row in the formation. */
  row: Row;
  /** Id of the combat AI that picks this class's actions. */
  ai: string;
  /**
   * The class's ability list: ability id -> the class level it's learned at,
   * e.g. { firebolt: 1, "frost-lance": 4 }. "attack" is always available.
   */
  abilities: Readonly<Record<string, number>>;
  /** Item ids a new recruit starts with, and the usual kit to fill in. */
  startingKit: readonly string[];
  /** Fixed stat gains every time a level goes into this class (DESIGN.md §9). */
  growth: Partial<Record<Stat, number>>;
  /**
   * Depth (DESIGN.md §9): bonuses for every class level past the first.
   * Amounts are per level and can be fractions; the total is rounded down,
   * so { stat: "attack", amount: 0.4 } is +1 attack at class level 4 and
   * +19 at 49.
   */
  perLevel?: readonly PassiveEffect[];
  /**
   * Milestone perks: reaching this class level offers these perks instead of
   * the usual random ones, e.g. { 5: ["a", "b"], 50: ["capstone"] }. Perks
   * listed here are never offered at random.
   */
  milestones?: Readonly<Record<number, readonly string[]>>;
}

/**
 * "material" (DESIGN.md §8): building stuff and rarer things the Temple needs.
 * Found and carried home like loot, but the guild keeps it instead of selling it.
 */
export type ItemSlot = "weapon" | "offhand" | "armor" | "consumable" | "loot" | "material";

export interface ItemDef {
  id: string;
  name: string;
  slot: ItemSlot;
  /** Base value in coins. */
  value: number;
  tags: readonly string[];
  /** Weapons only. */
  damageType?: DamageType;
  /** Weapons only: true if it can hit the back row from the back row. */
  ranged?: boolean;
  /** Always-on effects while equipped. */
  passives?: readonly PassiveEffect[];
  /** Consumables only: what happens when used. */
  use?: readonly ActiveEffect[];
  /**
   * Weapons and offhands: abilities anyone gets while this is equipped
   * (an axe's Cleave, a shield's Shield Bash).
   */
  abilities?: readonly string[];
  /**
   * Loot only: the real value is rolled in this range when the item is found.
   * A wide range is where a good appraiser earns their keep.
   */
  valueRange?: readonly [number, number];
  /** Carry slots it takes up. Defaults to 1. */
  size?: number;
  /** Materials only: one line for the town's store, e.g. where it turns up. */
  blurb?: string;
}

export interface AbilityDef {
  id: string;
  name: string;
  /** One line for the hero sheet. */
  description?: string;
  /**
   * Who it can be aimed at. "all-enemies" with a melee weapon attack only
   * reaches the front row while it stands.
   */
  target: "enemy" | "all-enemies" | "ally" | "all-allies" | "self";
  /** Mana cost. */
  cost?: number;
  /** Usable once every this many of the user's turns (3 = use, wait 2, use). */
  cooldown?: number;
  /** Usable at most this many times per fight. */
  perFight?: number;
  /** Tags such as "spell", "fire", "heal". AIs read these to decide. */
  tags: readonly string[];
  effects: readonly ActiveEffect[];
  /**
   * Log verb, e.g. "casts Mend" (logged as "Ilsa casts Mend on Bram.") or
   * "sinks its fangs into {target}". Defaults to "uses <name>".
   */
  verb?: string;
}

export interface StatusDef {
  id: string;
  name: string;
  /** Effects applied to the creature at the start of each of its turns. */
  perTurn?: readonly ActiveEffect[];
  /** Always-on effects while the status lasts. */
  passives?: readonly PassiveEffect[];
}

export interface MonsterDef {
  id: string;
  name: string;
  /** Rough fighting strength. Encounters add these up (DESIGN.md §3). */
  power: number;
  stats: StatBlock;
  /** Override the stat formulas where a monster needs it (e.g. tiny rats). */
  overrides?: Partial<Record<Derived, number>>;
  /** Natural weapon. */
  weapon: { name: string; damageType: DamageType; attack: number; ranged?: boolean };
  row: Row;
  tags: readonly string[];
  ai: string;
  /**
   * Ability id -> the monster level it's used from, like a class list. Monster
   * level is the floor's level that day (1 = a typical floor-1 monster), so
   * the same rat fights dirtier deeper down or on a crowded floor.
   */
  abilities?: Readonly<Record<string, number>>;
  /**
   * A tougher version of another monster (a Spider Matriarch, a Skeleton
   * Captain). It never appears in encounters by itself: when a fight rolls
   * the base monster, one of them may be swapped for this, at most one
   * variant per fight.
   */
  variant?: {
    of: string;
    /** Chance per fight that includes the base monster. */
    chance: number;
    /** Only at or above this monster level. Defaults to 1. */
    minLevel?: number;
  };
  passives?: readonly PassiveEffect[];
  triggers?: readonly Trigger[];
  /** Summoned-only monsters never appear in encounters by themselves. */
  summonOnly?: boolean;
  /** Loot table id rolled when this monster is killed. */
  loot?: string;
  /**
   * Hero tags this monster goes for first when it picks a single target
   * (DESIGN.md §7), e.g. ["align:good"]: the undead hate the righteous.
   * It still hits whoever it can reach if none of them are in reach.
   */
  hunts?: readonly string[];
  /**
   * What a group with this monster in it may do instead of fighting, by the
   * party's alignment (DESIGN.md §7): a goblin band parleys with an Evil
   * party, or demands tribute. Tried in order before the fight.
   */
  reactions?: readonly MonsterReaction[];
}

/**
 * A monster's reaction to the party (DESIGN.md §7). `reaction` names a
 * handler registered in src/sim/reactions.ts; `to` lists the party
 * alignments it happens to ("divided" for a party without one).
 */
export interface MonsterReaction {
  reaction: string;
  to: readonly string[];
  /** Chance per fight. */
  chance: number;
}

export interface SkillDef {
  id: string;
  name: string;
  /** Skill = (a + b) × 2.5, plus perks and gear, capped 0-100. */
  basedOn: readonly [Stat, Stat];
  description: string;
}

export interface PerkDef {
  id: string;
  name: string;
  description: string;
  /**
   * Class ids this perk can be offered to. Empty = anyone. Class perks are
   * offered more often than general ones (LevelRules.classPerkWeight).
   */
  classes: readonly string[];
  /** Not offered at random before this hero level. Defaults to 2 (the first level-up). */
  minLevel?: number;
  passives: readonly PassiveEffect[];
  /** Abilities the perk teaches. */
  abilities?: readonly string[];
}
