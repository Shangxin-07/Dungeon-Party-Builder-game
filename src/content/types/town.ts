/**
 * The town: buildings and house rules.
 */
import type { PorterRules } from "./dungeon";

/** Materials by item id, e.g. { "iron-ore": 4 } (DESIGN.md §8, content/materials/). */
export type MaterialCost = Readonly<Record<string, number>>;

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
   * level, plus `materials`, and they lose max(levels, percent% of their
   * level) off the top.
   */
  | {
      type: "resurrect";
      gold: number;
      goldPerLevel: number;
      levels: number;
      percent: number;
      materials?: MaterialCost;
    }
  /** Lay the dead to rest, for this much gold (DESIGN.md §10). */
  | { type: "burial"; gold: number }
  /** Injuries mend this many extra days for every day in town (the Apothecary). */
  | { type: "healing"; amount: number }
  /**
   * The parties ride a cage down past this many floors (the Mine Cage): a
   * trip skips their rooms and the days they take. Never the target floor,
   * nor a floor a rescue party has to search.
   */
  | { type: "lift"; floors: number }
  /**
   * Percentage points added to the share of value paid for a trip's haul
   * (the Black Market's fence, DESIGN.md §7). Still never above haggle.max.
   */
  | { type: "fence"; amount: number }
  /**
   * The share (percent) of an item's salvage list the Blacksmith gets out of
   * it (M7.03, DESIGN.md §17.4): rounded down, at least 1 of each.
   */
  | { type: "salvage"; amount: number }
  /** Research desks (M7.07, DESIGN.md §17.7): heroes who study here instead of delving. */
  | { type: "researchDesks"; amount: number };

export interface BuildingLevel {
  /** Gold to build or upgrade to this level. */
  cost: number;
  /** Materials it also needs, used up when the work starts. */
  materials?: MaterialCost;
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
  /**
   * Only deals with heroes of these alignments (DESIGN.md §7: the Black
   * Market and Evil heroes). Its effects only work while the guild has one
   * on its books.
   */
  dealsWith?: readonly string[];
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
  /**
   * Salvage (M7.03, DESIGN.md §17.4): scrap for items with no salvage list of
   * their own, by tag (the first tag that matches), as material id -> amount.
   */
  salvage: { byTag: Readonly<Record<string, Readonly<Record<string, number>>>> };
  /** Share of max HP a hero gets back for each day spent in town. */
  restPercent: number;
  /** Repairing a raid-damaged building costs this share of what it cost to build. */
  repairRate: number;
  /**
   * Pay (M7.12, DESIGN.md §18.2). A hero at home draws a daily retainer:
   * `base` gold plus 1 for every `levelsPerGold` levels. Heroes away on a trip
   * draw nothing; they're paid by their share. Anyone who can't be paid loses
   * morale ("unpaid").
   */
  retainer: { base: number; levelsPerGold: number };
  /**
   * A party takes `percent` of what its haul is worth at the Market when it
   * comes home, split between the heroes who went (one share each, more after
   * a raise) and porters (`porter` shares each). What the purse can't cover
   * is owed and paid first thing each day.
   */
  shares: { percent: number; porter: number };
  /**
   * Veterans ask for raises (M6): every `everyLevels` levels since their last
   * raise talk, a hero asks for `amount` more gold a day on their retainer.
   * Gold-motivated heroes ask for a bigger cut instead: `share` more shares of
   * every haul. Unanswered after `patienceDays`, it counts as a no.
   */
  raises: { everyLevels: number; amount: number; share: number; patienceDays: number };
  /** How many parties the guild can keep on file (name, heroes, porters, orders). */
  savedParties: number;
  /**
   * Heroes resting in town lend the builders a hand (M6). Each fit hero at
   * home (not away, not injured) adds `perHero` days of work a day, more or
   * less by (STR − 10) × `perStr` of that. All of them together add at most
   * `maxPerDay` days of work a day, to the oldest job first.
   */
  helpers: { perHero: number; perStr: number; maxPerDay: number };
  /**
   * Loot table rolled once for every raider killed at the pit (DESIGN.md §8:
   * fallen raiders drop materials). Materials go to the store, coins to the
   * guild's gold, anything else to the store room.
   */
  raidSpoils?: string;
}

/**
 * What a hero on a post does (DESIGN.md §8). Each hero on the post adds it,
 * on every day they're at home and fit to work.
 */
export type PostEffect =
  /** Holds back this much overflow strength at night, per hero. */
  | { type: "defence"; amount: number }
  /** See the overflow coming this many nights ahead (one hero is enough). */
  | { type: "raidWarning"; days: number }
  /** Roll this loot table `rolls` times a day per hero: materials to the store, coins to gold. */
  | { type: "gather"; loot: string; rolls: number };

/**
 * A post round the pit (DESIGN.md §8, content/posts/): heroes at home can be
 * put on one. Posts start as makeshift camp duties in the opening and stay
 * useful for heroes who aren't delving.
 */
export interface PostDef {
  id: string;
  name: string;
  blurb: string;
  /** Heroes it has room for. */
  slots: number;
  effects: readonly PostEffect[];
  /** Porters can work it (they never fight, so not the barricade). */
  porters?: boolean;
  /** Only at the mining camp (DESIGN.md §8): gone once the opening is over. */
  campOnly?: boolean;
}

/**
 * The opening (DESIGN.md §8): a new game can start at the undefended mining
 * camp. No delving until the `unlock` buildings are up.
 */
export interface OpeningRules {
  /** Replaces the town's startingGold in a camp game. */
  startingGold: number;
  /** Replaces the town's startingStash: makeshift kit from the camp. */
  startingStash: readonly string[];
  /** Buildings that start at level 0 at the camp, whatever their startLevel. */
  unbuilt: readonly string[];
  /** Roster size before the Guild Hall is built. */
  campRoster: number;
  /**
   * The class everyone at the camp holds (a "camp" kind class): the starting
   * heroes begin in it, and anyone signed there joins in it. Once the camp is
   * held, each picks a base class.
   */
  campClass: string;
  /** Building id -> level needed before parties can go down. */
  unlock: Readonly<Record<string, number>>;
  /** Items that arrive in the store room when the camp is held (the guild's proper kit). */
  heldStash: readonly string[];
  /**
   * Swaps the miners will make at the camp, so a run of bad luck in what the
   * posts bring in can't stall the build, e.g. 2 iron ore for 1 timber.
   */
  trades: readonly { give: MaterialCost; get: MaterialCost }[];
}

/**
 * Research at the Library (M7.07, DESIGN.md §17.7, content/research.ts).
 * Heroes at its desks add points every day; kills and specimens add more.
 */
export interface ResearchRules {
  /** Points per day: (INT − intBase), at least 0 ... */
  intBase: number;
  /** ... plus this share of the hero's Lore skill ... */
  loreShare: number;
  /** ... times (1 + this percent / 100) for a Knowledge-motivated hero. */
  knowledgeBonus: number;
  /** XP a hero earns for each day at a desk. */
  xpPerDay: number;
  /** Points a monster's research gets for each one a party kills. */
  killPoints: number;
  /** Points to reach Studied and Mastered, per point of monster power, when a monster doesn't say. */
  perPower: readonly [number, number];
  /** Extra damage the guild deals to a monster it has Studied, then Mastered, in percent. */
  damage: readonly [number, number];
  /** Once Mastered, this percent of the monster's resistances still works (immunities stay). */
  masteredResist: number;
}
