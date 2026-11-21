/**
 * The town: buildings and house rules.
 */
import type { PorterRules } from "./dungeon";

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
  | { type: "vault"; amount: number }
  /**
   * Bring the dead back (DESIGN.md §10): gold plus goldPerLevel × the hero's
   * level, and they lose max(levels, percent% of their level) off the top.
   */
  | { type: "resurrect"; gold: number; goldPerLevel: number; levels: number; percent: number }
  /** Lay the dead to rest, for this much gold (DESIGN.md §10). */
  | { type: "burial"; gold: number };

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
  porters: PorterRules;
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
  /** How many parties the guild can keep on file (name, heroes, porters, orders). */
  savedParties: number;
  /**
   * Heroes resting in town lend the builders a hand (M6). Each fit hero at
   * home (not away, not injured) adds `perHero` days of work a day, more or
   * less by (STR − 10) × `perStr` of that. All of them together add at most
   * `maxPerDay` days of work a day, to the oldest job first.
   */
  helpers: { perHero: number; perStr: number; maxPerDay: number };
}
