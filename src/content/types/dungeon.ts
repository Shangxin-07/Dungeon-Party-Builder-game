/**
 * The dungeon: encounters, loot tables, rooms, floors, secrets, porters,
 * searching, population, hunting and raids.
 */
import type { BuildingEffect, MaterialCost } from "./town";
import type { DamageType, Stat } from "./core";
import type { MoraleFact } from "./morale";

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
  /**
   * Hours to walk through this room, if not the usual `TimeRules.room` (M7.01).
   * A room with `rest` settings is where the party sleeps.
   */
  hours?: number;
  /**
   * How scouts write it up in floor intel (M7.08): "feature" (worth knowing
   * about: a seam, a hoard, a rest spot), "hazard" (a trap) or "plain".
   * Default: rooms with a trap are hazards, fight and quiet rooms are plain,
   * everything else is a feature.
   */
  intel?: "feature" | "hazard" | "plain";
}

/**
 * Something that happens in a room, played out by the party's alignment
 * (DESIGN.md §7): a wounded stranger is healed by a Good party, ignored by a
 * Neutral one and robbed by an Evil one. Event rooms (behaviour "event") pick
 * one of these. Add one by creating a file in content/events/.
 */
export interface EventDef {
  id: string;
  name: string;
  /** Floors it can happen on, inclusive. */
  floors: readonly [number, number];
  /** Relative chance of being the event in an event room. */
  weight: number;
  /** Logged first, before the party decides. */
  intro: string;
  /**
   * What the party does, by party alignment id, or "divided" for a party
   * with no two-thirds majority. Every alignment needs one; a divided party
   * without one argues and moves on.
   */
  outcomes: Readonly<Record<string, EventOutcome>>;
}

export interface EventOutcome {
  /** Logged when it happens. {hero} is whoever takes the lead. */
  text: string;
  effects: readonly EventEffect[];
}

/**
 * What an event outcome does. Each type is run by a handler registered in
 * src/sim/events.ts (registerEventEffect), so new kinds can be added there.
 * `chance` (default 1) is rolled for each effect on its own.
 */
export type EventEffect = { chance?: number; text?: string } & (
  | /** Roll a loot table into the packs. */ { type: "loot"; table: string; from: string }
  /** Heal everyone alive by this share of max HP (gets the downed back up). */
  | { type: "healParty"; percent: number }
  /** Hurt one hero, or everyone. Grows with depth like traps. */
  | {
      type: "hurt";
      damage: readonly [number, number];
      damageType: DamageType;
      hits: "one" | "all";
    }
  /**
   * Something the heroes will feel about at home: a morale fact for every
   * hero who went, e.g. "goodDeeds" or "evilDeeds".
   */
  | { type: "deed"; fact: "goodDeeds" | "evilDeeds" }
  /** Gold that turns up in town after the trip: a reward later. {gold} in `news`. */
  | { type: "gift"; gold: readonly [number, number]; news: string }
);

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
  /** Gold to sign a recruit as a porter, and their daily retainer while at home (M7.12). */
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

/**
 * A huge beast's lair (M7.08, DESIGN.md §17.8): off the main tunnels, so
 * ordinary trips never go in. Scouts find it, a sneak party can fetch
 * something from it, and a delve party sent for it fights the beast.
 * Add one by creating a file in content/lairs/.
 */
export interface LairDef {
  id: string;
  name: string;
  floor: number;
  /** The beast that lives there. */
  monster: string;
  /** How scouts write it up: "<scout> <found>." */
  found: string;
  /** Logged when a party walks in. */
  description: string;
  /** Loot table a sneak party can take from it unheard, and the line for it: "<hero> <fetched>." */
  fetch: string;
  fetched: string;
  /** Loot table for the party that kills the beast. */
  hoard: string;
  /** Monsters that leave the floor once the beast is dead: it's that much safer. */
  calms: number;
}

/**
 * Sneak missions (M7.08, DESIGN.md §17.8, content/stealth.ts): getting past
 * monsters unheard.
 */
export interface StealthRules {
  /**
   * Chance to get past a group = base + (party Stealth − hearing) / 100,
   * kept within min-max. The party's Stealth is its worst hero's, less
   * `perExtraHero` for every hero over `quietParty`.
   */
  base: number;
  min: number;
  max: number;
  quietParty: number;
  perExtraHero: number;
  /** A monster's hearing = PER × this + its `hearing`. A group hears by its sharpest ear. */
  earPerPer: number;
}

/**
 * Scout missions (M7.08, DESIGN.md §17.8, content/scouting.ts): slipping
 * past fights, and how long floor intel stays fresh.
 */
export interface ScoutRules {
  /**
   * The best scout slips the party past each fight with chance
   * (Scouting + slipBase)%, at most slipMax. Failing that, it's a fight.
   */
  slipBase: number;
  slipMax: number;
  /** Intel older than this many days may be out of date. */
  staleDays: number;
  /** Scouts count monsters roughly: the floor's numbers are rounded to this. */
  roundTo: number;
  /** What the town can see of the floors (M7.13, DESIGN.md §18.3). */
  fog: FogRules;
}

/**
 * Fog over the floors (M7.13, DESIGN.md §18.3): the pit map shows only what
 * the town knows. Watchtowers watch the top floors; deeper floors show the
 * last word from a party or scouts, dated, until it's too old to trust.
 */
export interface FogRules {
  /**
   * How full a floor feels, by population / capacity: the first band whose
   * `below` is above that. The last band takes everything else.
   */
  bands: readonly { below: number; name: string }[];
  /** Word from below older than this many days is forgotten: "unknown". */
  fadeDays: number;
}

/**
 * The trip clock (M7.01, DESIGN.md §17.2): how many hours each thing takes
 * below (content/time.ts). Tuned so a floor still takes about a day, there
 * and back, as before the clock.
 */
export interface TimeRules {
  /** Hour of the day the party sets off (8 = 08:00). */
  startHour: number;
  /** Down the stairs to the next floor. */
  stairs: number;
  /** Riding the Mine Cage past one floor, each way. */
  cagePerFloor: number;
  /** Walking into and through a room, unless the room has its own `hours`. */
  room: number;
  /** Extra hours by room behaviour id, on top of walking (a rest spot's sleep, a trap...). */
  behaviours: Readonly<Record<string, number>>;
  /** A fight: `hours`, plus `perRound` for each round after `freeRounds`. */
  fight: { hours: number; freeRounds: number; perRound: number };
  /** Getting a hidden cache open once it's spotted. */
  cache: number;
  /** Each side tunnel searched under a "clear the floor" order, before any fight. */
  hunt: number;
  /** Climbing back up through one floor on the way home. */
  climbPerFloor: number;
  /** After this many hours awake the party makes camp (a rest spot counts as sleep). */
  awakeHours: number;
  /** How long a camp lasts. It's a guarded doze in a tunnel: nobody heals. */
  campHours: number;
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
  /** Barricaded stairheads (M7.16): how the floor below wears a seal down. */
  seals: SealRules;
}

/**
 * Holding the stairs (M7.16, DESIGN.md §18.3b). A sealed stairhead stops the
 * floor below pushing monsters up. Each day it loses `wearPerDay`, plus
 * `perMonster` for every monster the floor below has over its capacity, so
 * the fuller it gets behind the seal, the faster the seal goes.
 */
export interface SealRules {
  perMonster: number;
  wearPerDay: number;
  /**
   * A sealed-off floor holds at most this many times its capacity: any more
   * and they turn on each other. It caps the flood when the seal gives way.
   */
  crowding: number;
}

/** A barricade a party can build at the top of a flight of stairs (M7.16, content/barricades/). */
export interface BarricadeDef {
  id: string;
  name: string;
  /** For the orders panel. */
  description: string;
  /** Carried down from the store when the party sets off. */
  materials: MaterialCost;
  /** Gold, paid at the same time. */
  gold?: number;
  /** How much pressure it takes before it gives way. */
  strength: number;
  /** Hours the party spends building it. */
  hours: number;
}

export interface HuntRules {
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

/**
 * The shards of the Hearthstone on one floor (DESIGN.md §20): what it takes
 * to forge that floor's Seal Stone. Each entry in `shards` is one shard and
 * where it is; sealing the floor takes every one of them, so a deeper floor
 * that hides more shards needs more. Add a floor's set by creating a file in
 * content/shards/.
 */
export interface ShardSetDef {
  id: string;
  /** The floor these shards seal (the stairs below it). */
  floor: number;
  /** The material a shard of this floor is (content/materials/). */
  item: string;
  shards: readonly ShardSource[];
  /**
   * Forging this floor's Seal Stone (M8.17), on top of every one of its
   * shards: a workshop job at the Temple (cleansed) or the Black Market
   * (bound), content/sealing.ts.
   */
  forge: { materials: MaterialCost; gold?: number; work: number };
  /**
   * When a party sets the stone on the stairs below this floor, the floor
   * below notices: `power` times one of its usual groups comes up the stairs
   * at once, and the party can't slip away from it. `text` is logged first.
   */
  surge: { power: number; text: string };
}

/**
 * The two ways to forge a Seal Stone (M8.17, DESIGN.md §20): cleansed at the
 * Temple or bound at the Black Market. The alignment choice: the guild feels
 * `fact` about it when the stone is set (Good heroes like good deeds...).
 */
export interface SealWay {
  id: string;
  /** "Cleansed": the stone is called "<name> Seal Stone". */
  name: string;
  /** The workshop that forges it, and the stat that speeds the work. */
  workshop: string;
  stat: Stat;
  fact: Extract<MoraleFact, "goodDeeds" | "evilDeeds">;
  blurb: string;
  /**
   * What every gateway forged this way gives the town while it holds (M8.19,
   * DESIGN.md §20): building effects, adding up seal by seal. A breached
   * gateway gives nothing until it's mended.
   */
  blessing: { name: string; text: string; effects: readonly BuildingEffect[] };
}

/** How Seal Stones are forged (content/sealing.ts). */
export interface SealingRules {
  ways: readonly SealWay[];
  /** Hours the party spends setting a stone, before the surge. */
  hours: number;
  /** What a set stone becomes: a gateway on the stairs (M8.18). */
  gateway: GatewayRules;
}

/** How a gateway lets the floor below up (M8.18, DESIGN.md §20). */
export type GatewaySetting = "shut" | "trickle" | "open";

/** One level of a gateway: level 1 comes with the stone, the rest are bought. */
export interface GatewayLevel {
  /** Strain it takes before it breaches. */
  limit: number;
  /** What raising it to this level costs (nothing for level 1). */
  gold?: number;
  materials?: Record<string, number>;
  /** What mending it at this level costs, once it has breached. */
  repair: { gold: number; materials?: Record<string, number> };
  summary: string;
}

/**
 * Gateways (M8.18): a set Seal Stone holds the stairs, and the town chooses
 * how much it lets through. Shut strains it while the floor below is over
 * its capacity; past its limit it breaches, and stands open until mended.
 */
export interface GatewayRules {
  settings: Record<GatewaySetting, { name: string; blurb: string }>;
  /**
   * Trickle: up to `perDay` monsters a day come up, at the level of the
   * floor above (the weak ones). It strains at `strain` times the Shut rate.
   */
  trickle: { perDay: number; strain: number };
  /** Strain a day for every monster the floor below holds over its capacity. */
  strainPerMonster: number;
  /** Strain that eases a day while the floor below is at or under its capacity, or it's Open. */
  ease: number;
  /** Strain past this share of the limit is news: the town hears it creak. */
  warnAt: number;
  levels: readonly GatewayLevel[];
}

/**
 * Where one shard is (DESIGN.md §20). Each source gives its shard once, ever.
 * `floor` is where the party has to go for it, which needn't be the floor the
 * shard seals: some fell down a shaft when the stone broke.
 */
export type ShardSource = {
  /** Unique across every set: saves key what's been found by it. */
  id: string;
  floor: number;
  /** Shown in the Hearthstone panel before it's found: where the guild thinks it is. */
  hint: string;
} & (
  | {
      /**
       * Carried by a shard-bearer: a named boss that grew round it and lives
       * on the floor until killed. It keeps to the back tunnels: only a party
       * hunting the floor (a clear-the-floor order) meets it, and only once
       * the floor is thinned down to `below` of its capacity; then `chance`
       * per hunting fight that it leads the group, with an escort cut to
       * `escort` of a usual group's power.
       */
      kind: "bearer";
      monster: string;
      below: number;
      chance: number;
      escort: number;
      /**
       * The party sizes it up first: unless the heroes on their feet add up
       * to this many levels, they back off without a fight (and now know
       * what carries the shard). Keeps it from wiping a fresh party.
       */
      stand: number;
      /** Logged when it shows: "{monster} ..." */
      shows: string;
    }
  | {
      /**
       * Hidden in a cache like the secrets (M6): `chance` per room walked
       * that the party passes it, then found as a secret `hidden` this well.
       */
      kind: "cache";
      chance: number;
      hidden: number;
      /** Logged when found: "<scout> notices <spotted>." */
      spotted: string;
    }
  | {
      /**
       * Found by the Library: once every monster in `monsters` is Studied,
       * `points` of research work out where it lies, and the next party on
       * `floor` digs it out.
       */
      kind: "library";
      monsters: readonly string[];
      points: number;
      /** News when the Library works it out. */
      lead: string;
      /** Logged when the party digs it out: "<hero> <dug>." */
      dug: string;
    }
);
