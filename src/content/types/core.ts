/**
 * Stats, damage types, and effects: the shared building blocks for items, perks,
 * abilities, statuses and monster traits. New content combines these; the engine
 * only has to know how to run each effect type once.
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

export const DAMAGE_TYPES = [
  "slashing",
  "piercing",
  "crushing",
  "fire",
  "cold",
  "poison",
  "holy",
] as const;

export type DamageType = (typeof DAMAGE_TYPES)[number];

export type Row = "front" | "back";

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
