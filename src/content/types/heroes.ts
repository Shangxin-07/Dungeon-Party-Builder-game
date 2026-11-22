/**
 * House rules for heroes over time: levels, rescue, the fallen, injuries and wear.
 */
import type { Stat, PassiveEffect } from "./core";

/** How heroes earn experience and level up (DESIGN.md §9). */
export interface LevelRules {
  maxLevel: number;
  /** Max HP for every hero level past the first, whatever the class. */
  hpPerLevel: number;
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
  /**
   * Background trips (M7.02, DESIGN.md §17.3). Days after the expected day
   * back that a party is "overdue", then "possibly lost"; and the day past
   * due the guild gives a party that hasn't come home up for lost.
   */
  overdueDays: number;
  lostDays: number;
  giveUpDays: number;
  /** Holing up: a party that can't get home barricades itself in to wait for help. */
  holeUp: HoleUpRules;
  /**
   * Rescue missions (for the living) walk rooms at this share of the usual
   * time, and the best scout slips the party past a fight with chance
   * (Scouting + slipBase)%, at most slipMax.
   */
  rescuePace: number;
  slipBase: number;
  slipMax: number;
}

/** When a party holes up instead of heading home, and how long it lasts (M7.02). */
export interface HoleUpRules {
  /** Never on floors above this: from floor 1 the party just walks out. */
  minFloor: number;
  /**
   * Hole up on the way home when more are down than are standing to carry
   * them, or when everyone standing is below this share of max HP (percent)
   * with nothing left to heal them.
   */
  weakBelow: number;
  /** Supplies last baseDays, plus a day per medicinePerDay of the best Medicine, up to maxDays. */
  baseDays: number;
  medicinePerDay: number;
  maxDays: number;
  /** Each night holed up, chance monsters find them: a fight with nowhere to run. */
  foundChance: number;
  /** HP the downed and the hurt get back each day holed up, as a share of max HP (percent). */
  healPercent: number;
}

/** What becomes of the dead (DESIGN.md §10). Tune freely. */
export interface FallenRules {
  /** Days a body left in the dungeon lies still before it rises. */
  riseDays: number;
  /** The transform (content/transforms/) applied to a hero who rises. */
  transform: string;
  /** Chance a fight on a risen hero's floor has them join it (once per trip each). */
  meetChance: number;
  /** A risen hero climbs a floor towards the pit every this many days (DESIGN.md §4). */
  climbDays: number;
  /**
   * Chance the party recognises a risen guild mate before the fight:
   * base + the best Scouting ÷ 100, if anyone in the party knew them.
   */
  recogniseBase: number;
  /** HP share a hero comes back from the Temple with. */
  resurrectedHpPercent: number;
}

/**
 * A change applied to a snapshot of a creature (DESIGN.md §10): a dead hero
 * rising as one of the undead. The hero keeps their class, fighting style and
 * gear; the transform adds to them.
 */
export interface TransformDef {
  id: string;
  /** Added to the name: "Bram" + ", Risen". */
  suffix: string;
  tags: readonly string[];
  /** Changes to primary stats (never below 1). */
  stats: Partial<Record<Stat, number>>;
  /** Extra passives, on top of the hero's perks and gear. */
  passives: readonly PassiveEffect[];
  /** Max HP as a percent of the living hero's. */
  hpPercent: number;
  /** Combat AI to use instead of the class's, if any. */
  ai?: string;
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

/**
 * Leaders and command (M7.05, DESIGN.md §17.5). Leadership is a skill (CHA +
 * WIL); the leader's Leadership sets their command, and each hero they take
 * down costs command by their alignment step from the leader.
 */
export interface LeadershipRules {
  /** Command by Leadership: the highest `from` at or below the leader's Leadership wins. */
  command: readonly { from: number; command: number }[];
  /** Command each hero costs, by alignment steps from the leader (0, 1, 2). The leader is free. */
  alignCost: readonly number[];
  /** Leadership points a leader earns per trip, and the share they earn at or above `slowAbove`. */
  perTrip: number;
  slowAbove: number;
  slowShare: number;
  /**
   * Disobedience over command: at each order check, each hero's chance to
   * ignore the leader is `perOver` × command over, × `stepFactor` by
   * alignment steps from the leader, × the morale factor, at most `maxChance`.
   */
  disobey: { perOver: number; stepFactor: readonly number[]; maxChance: number };
  /**
   * Low morale makes it likelier: the factor is 1 + (moraleAt − morale) ÷
   * moraleAt, between moraleMin and moraleMax.
   */
  morale: { at: number; min: number; max: number };
  /**
   * Deserters: before a fight that looks bad (monster power at least
   * `badFight` × a usual fight's, or a boss variant), each unruly hero may
   * slip away: `perOver` × over × stepFactor × morale factor × their
   * alignment's `desert` weight, at most `maxChance`.
   */
  desert: { perOver: number; badFight: number; maxChance: number; align: Record<string, number> };
  /**
   * A fight counts as a big win (for leader traits) when the party beats
   * monster power at least this many times a usual fight's, or a boss variant.
   */
  bigWin: number;
  /** When the leader goes down, the party may lose heart and turn back: this chance at morale 50. */
  leaderFalls: number;
  /** Monster groups grow by `perFighter` of a usual fight's power for each fighter over `over`. */
  scaling: { over: number; perFighter: number };
  /** Most traits a leader carries; a new one pushes out the oldest. */
  maxTraits: number;
  /** Trips in a row bringing everyone home that can earn a trait (the "longStreak" event). */
  streak: number;
  /** Chance each kind of event gives the leader a trait. */
  traitChance: Record<LeaderEvent, number>;
  /** Morale facts for deserters: who holds a grudge (motivations, alignments). */
  grudge: { motivations: readonly string[]; alignments: readonly string[] };
}

/** What can happen on a leader's watch that may give them a trait. */
export type LeaderEvent = "lostSomeone" | "bigWin" | "longStreak" | "deserted";

/**
 * A leader trait (M7.05, content/traits/): earned from what happens on their
 * watch, a small effect on command, morale or how unruly the party is.
 */
export interface TraitDef {
  id: string;
  name: string;
  description: string;
  /** The event that can give it. */
  from: LeaderEvent;
  /** Odds against the other traits from the same event. */
  weight: number;
  /** Odds multiplied by these for leaders of an alignment or motivation (0: never). */
  alignments?: Record<string, number>;
  motivations?: Record<string, number>;
  /** "good" or "bad", for the hero card. */
  tone: "good" | "bad";
  /** Trips it lasts; missing: until a newer trait pushes it out. */
  trips?: number;
  /** Command added (or taken). */
  command?: number;
  /** Extra share of morale losses the party feels on a trip, in percent. */
  moraleLoss?: number;
  /** Unruliness: counts as this much command over, even within command. */
  unruly?: number;
  /** Desertion chance multiplied by this. */
  desert?: number;
  /** Command cost of a hero two steps from the leader, instead of the usual. */
  farCost?: number;
  /** Turns back this many HP percent sooner than "below N% HP" orders say. */
  retreatEarly?: number;
}
