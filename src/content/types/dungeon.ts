/**
 * The dungeon: encounters, loot tables, rooms, floors, secrets, porters,
 * searching, population, hunting and raids.
 */
import type { DamageType } from "./core";

export interface EncounterDef {
  id: string;
  /** Floors this group can appear on, inclusive. */
  floors: readonly [number, number];
  /** Relative chance of being picked. */
  weight: number;
  /**
   * A different weight on particular floors (by depth), for the monsters a
   * floor is known for (M6): spiders in the Warrens, skeletons in the Bone Halls.
   */
  weightOn?: Readonly<Record<number, number>>;
  groups: readonly { monster: string; count: readonly [number, number] }[];
}

/** A weighted list of things that can be found. Rolled `rolls` times. */
export interface LootTableDef {
  id: string;
  rolls: readonly [number, number];
  /** `item: null` is a roll that finds nothing. */
  entries: readonly { item: string | null; weight: number }[];
}

/** A trap waiting in a room. Damage grows with depth like monster power. */
export interface TrapSpec {
  /** Log text when it springs, e.g. "A dart flies from the wall". */
  springs: string;
  /** Log text when spotted, e.g. "a tripwire across the floor". */
  spotted: string;
  /** How well hidden it is. Spot chance = (best Scouting − hidden + 50)%. */
  hidden: number;
  damage: readonly [number, number];
  damageType: DamageType;
  /** One random hero, or the whole party. */
  hits: "one" | "all";
}

/** What a rest spot gives back, scaled by the party's best Medicine. */
export interface RestSpec {
  /** Share of max HP healed with Medicine 100 (half that with Medicine 0). */
  hpPercent: number;
  /** Share of max mana recovered. */
  manaPercent: number;
}

/**
 * A kind of room. `behaviour` names a room handler registered in
 * src/sim/rooms.ts; the other fields are its settings.
 */
export interface RoomDef {
  id: string;
  name: string;
  behaviour: string;
  /** Floors it can appear on, inclusive. */
  floors: readonly [number, number];
  /** Relative chance of being picked for a room. */
  weight: number;
  /** One of these is logged when the party walks in. */
  descriptions: readonly string[];
  trap?: TrapSpec;
  /** Loot table id, for treasure rooms. */
  loot?: string;
  rest?: RestSpec;
}

/**
 * Hidden treasure (M6): a cache tucked away somewhere on a floor. Only a party
 * with a sharp enough Scouting skill notices it; nobody else ever knows it was
 * there. Add one by creating a file in content/secrets/.
 */
export interface SecretDef {
  id: string;
  name: string;
  /** Floors it can turn up on, inclusive. */
  floors: readonly [number, number];
  /** Relative chance of being the cache in a room. */
  weight: number;
  /** How well hidden: the Scouting it takes to have any chance of finding it. */
  hidden: number;
  /** Logged when it's found: "Mara notices <spotted>." */
  spotted: string;
  /** Loot table rolled for what's inside. */
  loot: string;
}

/** Porters (M6): untrained hands who carry loot and watch the fighting. */
export interface PorterRules {
  /** Gold to sign a recruit as a porter, and their daily wage. */
  hireCost: number;
  wage: number;
  /** Porters who can go down with one party. */
  slots: number;
  /** Fights a porter must watch before they can be trained in a class. */
  trainAfterFights: number;
  /** Share of a fighter's XP a porter banks for each trip, paid out on training. */
  xpShare: number;
  /**
   * When the party falls, each porter runs for it: chance = base +
   * (DEX + END − 20) × perStat − (floor − 1) × perFloor, kept within 5-95%.
   */
  escape: { base: number; perStat: number; perFloor: number };
}

/** How often hidden caches turn up, and how Scouting finds them (content/searching.ts). */
export interface SearchRules {
  /** Chance each room the party walks through (and survives) has a cache. */
  chancePerRoom: number;
  /**
   * Find chance = (best Scouting − cache's `hidden`) / spread, capped at
   * maxChance. Bigger spread: Scouting has to be much higher to find most.
   */
  spread: number;
  maxChance: number;
}

/** The shape of one dungeon floor. */
export interface FloorDef {
  id: string;
  depth: number;
  name: string;
  /** How many rooms the party passes through, inclusive range. */
  rooms: readonly [number, number];
  /** Room ids always placed on this floor (e.g. one rest spot). */
  fixedRooms?: readonly string[];
  /**
   * Monsters the floor can hold (DESIGN.md §4). Any more are pushed up to the
   * floor above; floor 1's extra climb out of the pit.
   */
  capacity: number;
  /** Monsters living here when a new game starts. */
  startPopulation: number;
  /**
   * How many levels below this floor's average its evicted monsters are, if
   * not the usual `DungeonRules.evictedLevelDrop`. The deep floors push their
   * rejects up a whole level weaker, so a floor fed from below stays at its
   * own depth (M6.21: adding floors 4 and 5 left floors 1-3 as they were).
   */
  evictedLevelDrop?: number;
}

/**
 * How the dungeon fills up and spills over (DESIGN.md §4, §8). Monster levels
 * are depth-equivalent: a level-2 monster on floor 1 is as strong as a
 * typical floor-2 one, so encounters there are sized like floor 2's.
 */
export interface DungeonRules {
  /** New monsters the bottom floor breeds on day 1. */
  spawnPerDay: number;
  /** Added to the spawn rate every day. The source of all escalation. */
  spawnGrowthPerDay: number;
  /** Evicted monsters are the weakest: this many levels below their floor's average. */
  evictedLevelDrop: number;
  /** Each day a floor's level moves this share of the way back towards its own depth. */
  settlePerDay: number;
  raids: RaidRules;
  /** "Clear the floor" orders (M6): the party stays on its target floor and hunts. */
  hunting: HuntRules;
}

export interface HuntRules {
  /** Extra rooms the party can search for monsters in one day. */
  roomsPerDay: number;
  /** Most extra rooms one trip spends hunting, whatever the order says. */
  maxRooms: number;
}

export interface RaidRules {
  /** Monster power (as in encounters) per point of overflow strength that gets past the defences. */
  powerPerStrength: number;
  /** An unopposed or victorious raid steals this much gold per point of strength. */
  goldPerStrength: number;
  /** One building is damaged for every this many points of strength. */
  strengthPerDamage: number;
  /** Heroes in town below this share of max HP stay in bed instead of fighting. */
  defenderMinHpPercent: number;
  /** Most heroes who can fight off one raid. */
  maxDefenders: number;
}
