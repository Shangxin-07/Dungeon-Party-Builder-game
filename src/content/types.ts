/**
 * Content definition types. Game content (classes, monsters, items, ...) is
 * plain data checked against these types. The engine reads definitions by id
 * and never special-cases a particular class or monster. See docs/DESIGN.md §12.
 */

export const STATS = ["STR", "DEX", "END", "PER", "INT", "WIL", "CHA"] as const;
export type Stat = (typeof STATS)[number];
export type StatBlock = Readonly<Record<Stat, number>>;

/** Secondary stats, worked out from primary stats, gear and perks. */
export const DERIVED = [
  "maxHp",
  "mana",
  "attack",
  "accuracy",
  "evasion",
  "initiative",
  "spellPower",
  "resist",
  "armor",
  "carrySlots",
] as const;
export type Derived = (typeof DERIVED)[number];

export const DAMAGE_TYPES = ["slashing", "piercing", "crushing", "fire", "poison"] as const;
export type DamageType = (typeof DAMAGE_TYPES)[number];

export type Row = "front" | "back";

// ---------------------------------------------------------------------------
// Effects: the shared building blocks for items, perks, abilities, statuses
// and monster traits. New content combines these; the engine only has to
// know how to run each effect type once.
// ---------------------------------------------------------------------------

/** Always-on effects, gathered from gear, perks and monster traits. */
export type PassiveEffect =
  /** Add to a primary or secondary stat. */
  | { type: "modifyStat"; stat: Stat | Derived; amount: number }
  /** Add to a non-combat skill (0-100). */
  | { type: "modifySkill"; skill: string; amount: number }
  /** Deal +percent% damage to targets with this tag. */
  | { type: "bonusVsTag"; tag: string; percent: number }
  /** Take percent% less damage of this type (negative = weakness). */
  | { type: "resist"; damageType: DamageType; percent: number };

/** Effects that happen when an ability, status tick or trigger fires. */
export type ActiveEffect =
  /** A normal weapon hit: accuracy vs evasion, attack vs armour. */
  | { type: "weaponAttack"; damagePercent?: number }
  /** Direct damage. amount + scale × spell power, never misses. */
  | { type: "dealDamage"; amount: number; scale?: number; damageType: DamageType }
  /** Restore HP. amount + scale × spell power. Brings downed allies back up. */
  | { type: "heal"; amount: number; scale?: number }
  /** Put a status on the target. chance defaults to 1. */
  | { type: "applyStatus"; status: string; turns: number; chance?: number }
  /** Add new monsters to the fight on the user's side. */
  | { type: "summon"; monster: string; count: number };

export type Effect = PassiveEffect | ActiveEffect;

/** Run effects when something happens to a creature. */
export interface Trigger {
  on: "damaged";
  /** Only fire if the hit did at least this much damage. */
  minDamage?: number;
  /** Only fire if the creature survived the hit. */
  ifAlive?: boolean;
  /** Fire at most once per creature per fight. */
  once?: boolean;
  /** Log line. {self} is replaced with the creature's name. */
  message?: string;
  /** Effects target the creature itself. */
  effects: readonly ActiveEffect[];
}

// ---------------------------------------------------------------------------
// Definitions
// ---------------------------------------------------------------------------

export interface ClassDef {
  /** Unique kebab-case id, referenced from other content. */
  id: string;
  name: string;
  /** One-line description shown in town. */
  blurb: string;
  /** The stats this class grows fastest in. */
  mainStats: readonly Stat[];
  /** Typical recruit stats. Recruits roll a little either side. */
  baseStats: StatBlock;
  /** Tags of gear this class likes using (affects morale later). */
  likes: readonly string[];
  /** Default row in the formation. */
  row: Row;
  /** Id of the combat AI that picks this class's actions. */
  ai: string;
  /** Ability ids this class can use. "attack" is always available. */
  abilities: readonly string[];
  /** Item ids a new recruit starts with. */
  startingKit: readonly string[];
}

export type ItemSlot = "weapon" | "offhand" | "armor" | "consumable" | "loot";

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
}

export interface AbilityDef {
  id: string;
  name: string;
  /** Who it can be aimed at. */
  target: "enemy" | "all-enemies" | "ally" | "self";
  /** Mana cost. */
  cost?: number;
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
  abilities?: readonly string[];
  passives?: readonly PassiveEffect[];
  triggers?: readonly Trigger[];
  /** Summoned-only monsters never appear in encounters by themselves. */
  summonOnly?: boolean;
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
  /** Class ids this perk can be offered to. Empty = anyone. */
  classes: readonly string[];
  passives: readonly PassiveEffect[];
}

export interface EncounterDef {
  id: string;
  /** Floors this group can appear on, inclusive. */
  floors: readonly [number, number];
  /** Relative chance of being picked. */
  weight: number;
  groups: readonly { monster: string; count: readonly [number, number] }[];
}

/** Everything the simulation needs, indexed by kind. */
export interface Library {
  classes: readonly ClassDef[];
  items: readonly ItemDef[];
  abilities: readonly AbilityDef[];
  statuses: readonly StatusDef[];
  monsters: readonly MonsterDef[];
  skills: readonly SkillDef[];
  perks: readonly PerkDef[];
  encounters: readonly EncounterDef[];
}

/** Identity helpers so definitions get full type checking and editor hints. */
export const defineClass = (def: ClassDef): ClassDef => def;
export const defineItem = (def: ItemDef): ItemDef => def;
export const defineAbility = (def: AbilityDef): AbilityDef => def;
export const defineStatus = (def: StatusDef): StatusDef => def;
export const defineMonster = (def: MonsterDef): MonsterDef => def;
export const defineSkill = (def: SkillDef): SkillDef => def;
export const definePerk = (def: PerkDef): PerkDef => def;
export const defineEncounter = (def: EncounterDef): EncounterDef => def;
