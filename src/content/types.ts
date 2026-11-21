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
  /**
   * The class's ability list: ability id -> the level it's learned at, e.g.
   * { firebolt: 1, "frost-lance": 4 }. "attack" is always available. In the
   * first slice the level is the hero's level; with freeform classes
   * (DESIGN.md §9) it becomes the level in this class.
   */
  abilities: Readonly<Record<string, number>>;
  /** Item ids a new recruit starts with. */
  startingKit: readonly string[];
  /** Fixed stat gains every time a hero of this class levels up (DESIGN.md §9). */
  growth: Partial<Record<Stat, number>>;
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
  /** Not offered before this hero level. Defaults to 2 (the first level-up). */
  minLevel?: number;
  passives: readonly PassiveEffect[];
  /** Abilities the perk teaches. */
  abilities?: readonly string[];
}

// ---------------------------------------------------------------------------
// Morale and motivation (DESIGN.md §6)
// ---------------------------------------------------------------------------

/**
 * Numbers the town works out about something that happened to a hero: a
 * trip, a day of rest, news from the dungeon. Morale rules turn these into
 * morale. New facts need a line of engine code (src/sim/morale.ts) to work
 * them out; new rules that use existing facts are just data.
 */
export const MORALE_FACTS = [
  /** A day spent resting in town. */
  "restDay",
  /** A rest day with their favourite building standing (and not damaged). */
  "favouriteBuilt",
  /** A rest day without it. */
  "favouriteMissing",
  /** A rest day: the town's restMorale building effects added up (the Tavern). */
  "restMorale",
  /** Gold the Market paid for the haul, per hero who went. */
  "goldShare",
  /** 1 if the haul was worth nothing. */
  "emptyHanded",
  /** Monsters this hero killed. */
  "kills",
  /** Floors deeper than this hero had ever been before. */
  "newFloors",
  /** 1 if the trip went no deeper than this hero had been before. */
  "sameOldFloor",
  /** Kinds of monster this hero had never seen before. */
  "newMonsters",
  /** 1 if the party turned back early. */
  "retreated",
  /** Party members (or guild mates in a raid) who died or were left behind. */
  "fallenComrades",
  /** 1 if everyone who set off came home. */
  "allHome",
  /** Trapped guild mates a rescue run brought home. */
  "rescuedComrades",
  /** 1 if this hero came home badly hurt (below a third of max HP, or carried). */
  "wounded",
  /** 1 if they were sent down already hurt (below 75% HP). */
  "sentHurt",
  /** 1 if they carried gear they like (a weapon or school of magic). */
  "likedGear",
  /** 1 if they carried gear they dislike. */
  "dislikedGear",
  /** 1 if this hero was trapped after a wipe and brought home. */
  "wasTrapped",
  /** A trapped guild mate died waiting for a rescue that never came. */
  "abandoned",
  /** 1 if they were given the perk they wanted at a level-up. */
  "wantedPerk",
  /** 1 if they levelled up. */
  "levelUp",
  /** 1 if the guild couldn't pay their wages today. */
  "unpaid",
  /** 1 if they were sent down tired (at the first fatigue tier or worse). */
  "sentTired",
  /** 1 if they came home with a new injury. */
  "injured",
  /** 1 if they asked for a raise and got it, or were turned down. */
  "raiseGiven",
  "raiseRefused",
  /** 1 if a party went down without them while they were fit to go. */
  "benched",
] as const;
export type MoraleFact = (typeof MORALE_FACTS)[number];

/** Morale change = amount × fact ÷ per, limited to ±cap. */
export interface MoraleRule {
  fact: MoraleFact;
  amount: number;
  /** Units of the fact per `amount` of morale. Defaults to 1. */
  per?: number;
  /** Most morale this rule can add or take away at once. */
  cap?: number;
  /** Only applies while the hero's morale is below this. */
  below?: number;
  /** Only applies while the hero's morale is above this. */
  above?: number;
  /** Shown in town next to the change, e.g. "liked the gold". */
  reason: string;
}

/** What drives a hero (DESIGN.md §6). */
export interface MotivationDef {
  id: string;
  name: string;
  /** One line shown on the hero card, e.g. "In it for the money". */
  blurb: string;
  /** Relative chance a recruit has this motivation. */
  weight: number;
  /** Morale rules on top of the ones everybody has (MoraleRulesDef.rules). */
  rules: readonly MoraleRule[];
  /** Buildings a hero with this motivation may love, weighted. */
  favourites: readonly { building: string; weight: number }[];
  /**
   * What they do in the dungeon when morale is low (DESIGN.md §6).
   * refuseRetreat: chance they won't turn back when the orders say so.
   * grabJunk: they keep junk the loot orders say to leave.
   */
  lowMorale?: { refuseRetreat?: number; grabJunk?: boolean };
}

/** Morale rules that apply to everyone, and the morale scale. */
export interface MoraleRulesDef {
  /** A recruit's starting morale, inclusive range. */
  start: readonly [number, number];
  /** Below this a hero complains, and may ignore orders in the dungeon. */
  low: number;
  /** Morale stability: losses × (1 − (WIL − 10) × this), at least half. */
  stabilityPerWil: number;
  /** Best CHA in the party cuts losses on a trip by (CHA − 10) × this. */
  leaderPerCha: number;
  /**
   * The happier a hero is, the harder they are to please: above `morale`,
   * gains are cut to this share (rounded down).
   */
  contentAbove: { morale: number; gainShare: number };
  rules: readonly MoraleRule[];
  /** Chance a hero has a disliked kind of gear. */
  dislikeChance: number;
  /** Gear tags a hero might dislike (never one their class likes). */
  dislikeTags: readonly string[];
}

/** How heroes earn experience and level up (DESIGN.md §9). */
export interface LevelRules {
  maxLevel: number;
  /** XP for each point of monster power killed, shared by the party. */
  xpPerPower: number;
  /** XP each hero gets per floor reached. */
  xpPerFloor: number;
  /** Raids teach less than delving: share of the usual XP for raiders killed. */
  raidXpShare: number;
  /** XP to reach level L is xpBase × (L − 1) ^ xpGrowth. */
  xpBase: number;
  xpGrowth: number;
  /** Perks offered at each level-up. */
  perkOffers: number;
  /** A perk for the hero's class is this many times as likely as a general one. */
  classPerkWeight: number;
  /** One free stat point every this many levels. */
  freeStatEvery: number;
  /** Chance that a hero wants one of the perks on offer ("Bram wants Cleave"). */
  wantChance: number;
}

/** What happens after a wipe (DESIGN.md §10). */
export interface RescueRules {
  /** Chance a fallen (not yet dead) hero is still alive and trapped. */
  survival: number;
  /** Added per point of END above 10 (taken away below). */
  survivalPerEnd: number;
  /** Days after the news reaches town that the trapped can hold out. */
  windowDays: number;
  /** Each night, chance per item at a site that monsters carry it off. */
  scavengeChance: number;
  /** Chance that a fight on a floor with scavenged gear has a monster carrying some. */
  carryChance: number;
  /** HP share the rescued come home with. */
  rescuedHpPercent: number;
}

/**
 * A lasting wound (M6): the hero can't go down the pit until it heals, a day
 * at a time in town. The penalties still count if they defend the town in a raid.
 */
export interface InjuryDef {
  id: string;
  name: string;
  /** Shown on the hero card, e.g. "−3 STR, −2 attack". */
  description: string;
  passives: readonly PassiveEffect[];
  /** Days in town it takes to heal. */
  days: number;
  /** Relative chance of being the injury picked. */
  weight: number;
}

/** A level of tiredness and what it does to a hero in a fight. */
export interface FatigueTier {
  /** Applies at this much fatigue or more. */
  at: number;
  /** "tired", "exhausted". */
  name: string;
  passives: readonly PassiveEffect[];
}

/**
 * Wear and tear (M6): what makes a guild rotate its heroes. Fatigue builds up
 * on trips and wears off in town; being knocked down can leave an injury.
 */
export interface WearRules {
  /** Fatigue (0-100) gained for each day on a trip, and for each fight. */
  fatiguePerTripDay: number;
  fatiguePerFight: number;
  /** Fatigue lost for each day in town (rest days, and days the party is away). */
  restPerDay: number;
  /** Lowest first. */
  tiers: readonly FatigueTier[];
  /** Chance a hero who was knocked down (to 0 HP) comes home injured. */
  injuryChance: number;
  /** Chance for a hero who stayed up but fell below `woundedBelow` of max HP in a fight. */
  woundedInjuryChance: number;
  woundedBelow: number;
  /** Taken off the chance per point of END above 10 (added below). */
  injuryPerEnd: number;
}

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
}

/** What a building level gives the town. Each level lists its full effects. */
export type BuildingEffect =
  /** Heroes that can go on one expedition. */
  | { type: "partySlots"; amount: number }
  /** Heroes the guild can keep on its books. */
  | { type: "rosterSize"; amount: number }
  /** Items for sale in town. */
  | { type: "sells"; items: readonly string[] }
  /** Holds back this much overflow strength climbing out of the pit (DESIGN.md §8). */
  | { type: "defence"; amount: number }
  /** See the next night's overflow this many days ahead. */
  | { type: "raidWarning"; days: number }
  /** Extra recruits looking for work each day. */
  | { type: "recruitOffers"; amount: number }
  /** Each recruit is the best of this many extra candidates (by their two best stats). */
  | { type: "recruitPicks"; amount: number }
  /**
   * This many of each day's recruits come already trained: a class and its
   * starting kit, for the hire cost plus the kit's value (M6).
   */
  | { type: "trainedRecruits"; amount: number }
  /** Morale for each hero on every rest day in town. */
  | { type: "restMorale"; amount: number }
  /** XP for each hero on every rest day in town. */
  | { type: "trainingXp"; amount: number }
  /** Extra XP, as a percent, from every trip. */
  | { type: "xpPercent"; amount: number }
  /** Share of the guild's gold (percent) that raiders can't get at. */
  | { type: "vault"; amount: number };

export interface BuildingLevel {
  /** Gold to build or upgrade to this level. */
  cost: number;
  /**
   * Days the builders need. The building keeps working at its old level until
   * the work is done (0 = ready at once).
   */
  days: number;
  /** One line shown in town, e.g. "4 heroes per party, 8 on the roster". */
  summary: string;
  effects: readonly BuildingEffect[];
}

/** A town building (DESIGN.md §8). Level 0 means not built yet. */
export interface BuildingDef {
  id: string;
  name: string;
  blurb: string;
  /** Level the town starts with (0 = not built). */
  startLevel: number;
  /** Raids never damage it (the heroes live here; it's always defended). */
  raidProof?: boolean;
  /** levels[0] is level 1, levels[1] is level 2, and so on. */
  levels: readonly BuildingLevel[];
}

/** How a new town starts and the house rules of the guild. */
export interface TownRules {
  startingGold: number;
  /**
   * How many untrained recruits are waiting on day 1, free to sign: the player
   * picks each one's class and kits them out from the store room (M6).
   */
  startingRecruits: number;
  /**
   * Classes `autoStart` gives the starting recruits, in order ("pick for me",
   * the bot and tests). The player is free to choose others.
   */
  startingRoster: readonly string[];
  /** Item ids in the guild's store room at the start. */
  startingStash: readonly string[];
  /** Fresh faces looking for work each day. */
  recruitsOnOffer: number;
  /** Gold to sign an untrained recruit (no class, no gear). */
  hireCost: number;
  /**
   * The Market pays more for a haul, and for anything sold, the better the
   * guild's best haggler: (Appraisal − 50) × perAppraisal + (CHA − 10) × perCha
   * on top of the usual rate, never above `max` (M6).
   */
  haggle: { perAppraisal: number; perCha: number; max: number };
  /** Share of an item's value the Market pays when you sell it. */
  sellRate: number;
  /**
   * Share of the real value the Market pays for a trip's haul. Items tagged
   * "coins" are always worth their face value.
   */
  haulRate: number;
  /** Share of max HP a hero gets back for each day spent in town. */
  restPercent: number;
  /** Repairing a raid-damaged building costs this share of what it cost to build. */
  repairRate: number;
  /**
   * Gold each hero on the roster is paid at the end of every day: base plus
   * perLevel for each level. Heroes who can't be paid lose morale ("unpaid").
   */
  wages: { base: number; perLevel: number };
  /**
   * Veterans ask for raises (M6): every `everyLevels` levels since their last
   * raise talk, a hero asks for `amount` more gold a day (Gold-motivated
   * heroes ask for double). Unanswered after `patienceDays`, it counts as a no.
   */
  raises: { everyLevels: number; amount: number; patienceDays: number };
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
  lootTables: readonly LootTableDef[];
  rooms: readonly RoomDef[];
  floors: readonly FloorDef[];
  buildings: readonly BuildingDef[];
  motivations: readonly MotivationDef[];
  town: TownRules;
  dungeon: DungeonRules;
  morale: MoraleRulesDef;
  levels: LevelRules;
  rescue: RescueRules;
  wear: WearRules;
  injuries: readonly InjuryDef[];
  secrets: readonly SecretDef[];
  searching: SearchRules;
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
export const defineLootTable = (def: LootTableDef): LootTableDef => def;
export const defineRoom = (def: RoomDef): RoomDef => def;
export const defineFloor = (def: FloorDef): FloorDef => def;
export const defineBuilding = (def: BuildingDef): BuildingDef => def;
export const defineTownRules = (def: TownRules): TownRules => def;
export const defineDungeonRules = (def: DungeonRules): DungeonRules => def;
export const defineMotivation = (def: MotivationDef): MotivationDef => def;
export const defineMoraleRules = (def: MoraleRulesDef): MoraleRulesDef => def;
export const defineLevelRules = (def: LevelRules): LevelRules => def;
export const defineWearRules = (def: WearRules): WearRules => def;
export const defineSecret = (def: SecretDef): SecretDef => def;
export const defineSearchRules = (def: SearchRules): SearchRules => def;
export const defineInjury = (def: InjuryDef): InjuryDef => def;
export const defineRescueRules = (def: RescueRules): RescueRules => def;
