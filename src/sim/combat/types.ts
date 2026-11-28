/**
 * The shapes combat works with: fighters, the fight log, results and options.
 */
import type {
  AbilityDef,
  FloorGround,
  DamageType,
  PassiveEffect,
  Row,
  StatBlock,
  Trigger,
} from "../../content/types";
import type { Hero } from "../hero";
import type { DerivedBlock } from "../stats";

export type Side = "party" | "monsters";

/** A creature taking part in a fight. */
export interface Fighter {
  uid: string;
  name: string;
  side: Side;
  row: Row;
  heroId?: string;
  monsterId?: string;
  /** A risen guild mate fighting for the dungeon (DESIGN.md §10). */
  risenId?: string;
  stats: StatBlock;
  derived: DerivedBlock;
  passives: PassiveEffect[];
  skills: Record<string, number>;
  tags: string[];
  weapon: { name: string; damageType: DamageType; ranged: boolean; reach?: boolean };
  /**
   * Lurking (M9.04): hidden in the back row. Monsters can't single them out,
   * and their blows land as ambushes until they're spotted.
   */
  hidden?: boolean;
  /** Strikes made from hiding this fight: each one makes the next easier to spot. */
  strikesHidden?: number;
  /**
   * A second weapon in the off hand (M9.04): strikes again after each plain
   * attack. `attackDelta` is its attack bonus less the main weapon's.
   */
  offhand?: { name: string; damageType: DamageType; damagePercent: number; attackDelta: number };
  abilities: string[];
  /** Turns until each ability on cooldown is ready again. */
  cooldowns: Record<string, number>;
  /** Times each ability has been used this fight. */
  used: Record<string, number>;
  ai: string;
  hp: number;
  mana: number;
  state: "up" | "downed" | "dead";
  /** Rounds a downed hero has left before dying. */
  bleed: number;
  statuses: { id: string; turns: number }[];
  pack: string[];
  triggers: readonly Trigger[];
  firedTriggers: Set<number>;
}

export type CombatEventKind =
  | "start"
  | "ambush"
  | "round"
  | "action"
  | "hit"
  | "miss"
  | "damage"
  | "heal"
  | "status"
  | "status-end"
  | "downed"
  | "killed"
  | "bleeding"
  | "died"
  | "revived"
  | "summon"
  /** The party's front row has all fallen: melee can now reach the back row. */
  | "exposed"
  /** The floor's fighting ground (§21), told at the start. */
  | "ground"
  | "end";

/** One line of the battle report. `hp` is the affected creature's HP afterwards. */
export interface CombatEvent {
  kind: CombatEventKind;
  round: number;
  text: string;
  actor?: string;
  target?: string;
  amount?: number;
  hp?: { uid: string; hp: number; max: number };
  /** Summon events: the new creature's name. */
  name?: string;
  /** Good or bad news for the party, for colouring the log. Left out when neither. */
  tone?: Tone;
}

export type Tone = "good" | "bad";

export interface CombatResult {
  winner: Side | "none";
  rounds: number;
  log: CombatEvent[];
  /** The party after the fight: HP, mana, used consumables and conditions updated. */
  party: Hero[];
  /** Ids of monsters killed (one entry per kill), for the population sim later. */
  kills: string[];
  /** Every creature as it ended the fight, for result screens. */
  fighters: Fighter[];
  /** Ids of risen heroes put down in this fight. */
  risenSlain: string[];
  /**
   * The party ran (M7.07): nothing left standing could be hurt (a monster's
   * ward the guild hasn't broken). Heroes nobody could carry were left behind.
   */
  fled?: string;
}

export interface CombatOptions {
  seed: number;
  /** Stop after this many rounds with no winner. */
  maxRounds?: number;
  /** The party scouted the monsters first: it gets a free opening round. */
  surprise?: boolean;
  /** Downed heroes don't bleed out (fights in town, where the fallen are dragged indoors). */
  noBleeding?: boolean;
  /**
   * One monster has picked up a hero's gear from a lost party's site
   * (DESIGN.md §10): it fights with the item's bonuses (and wields it, if
   * it's a weapon). `index` is its place in the monster list.
   */
  carrying?: { index: number; item: string };
  /** Monster level for this fight (the floor's level). Unlocks monster abilities. Defaults to 1. */
  level?: number;
  /**
   * Risen guild mates fighting on the monsters' side (DESIGN.md §10), as
   * risenHero() makes them. They join the end of the monster list.
   */
  risen?: readonly Hero[];
  /** Hero id of the party's leader (M7.05): fights with a "leader" tag, which cunning monsters hunt. */
  leader?: string;
  /**
   * How far the guild has researched each monster (M7.07, DESIGN.md §17.7):
   * monster id -> tier (2 Studied, 3 Mastered). The party hits harder, and
   * wards break at their tier.
   */
  research?: Readonly<Record<string, number>>;
  /** The floor's fighting ground (§21): passives for each side, told at the start. */
  ground?: FloorGround;
  /** Ties between heroes (M8.32): extra passives by hero id, for the whole fight. */
  bonds?: Readonly<Record<string, readonly PassiveEffect[]>>;
}

/** The basic weapon attack every fighter has. Not a content file, so "attack" is a reserved id. */
export const BASIC_ATTACK: AbilityDef = {
  id: "attack",
  name: "Attack",
  target: "enemy",
  tags: ["damage", "weapon"],
  effects: [{ type: "weaponAttack" }],
};

/**
 * A monster as it squared up at the start of a fight, for the watch view's
 * stat cards. Stats and derived numbers are the fighter's own, so a monster
 * carrying a lost hero's gear shows its bonuses.
 */
export interface FoeSheet {
  uid: string;
  name: string;
  hp: number;
  max: number;
  monsterId?: string;
  row?: Row;
  stats?: StatBlock;
  derived?: DerivedBlock;
  weapon?: { name: string; damageType: DamageType; ranged: boolean };
  /** Ability ids it can use in this fight. */
  abilities?: string[];
}

export const foeSheet = (f: Fighter): FoeSheet => ({
  uid: f.uid,
  name: f.name,
  hp: f.derived.maxHp,
  max: f.derived.maxHp,
  monsterId: f.monsterId,
  row: f.row,
  stats: { ...f.stats },
  derived: { ...f.derived },
  weapon: { ...f.weapon },
  abilities: [...f.abilities],
});
