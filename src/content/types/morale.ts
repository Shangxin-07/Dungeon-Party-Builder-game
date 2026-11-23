/**
 * Morale, motivation and alignment (DESIGN.md §6, §7).
 */
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
  /** Gold this hero took as their share of the haul (M7.12; before, the haul per head). */
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
  /**
   * Deserters (M7.05): 1 for each deserter a hero holds a grudge against
   * when they learn what happened, and for each one in the party they're
   * sent down with.
   */
  "grudge",
  "withDeserter",
  /** 1 for a hero who ran out on their party and made it home. */
  "deserted",
  /** 1 for the leader of a party that came home. */
  "ledParty",
  /** 1 if they levelled up. */
  "levelUp",
  /** 1 for a day spent at a research desk (M7.07). */
  "studied",
  /** 1 if the guild couldn't pay their retainer or share today. */
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
  /**
   * Alignment (DESIGN.md §7). Days on a trip spent two steps from the party's
   * alignment, or alongside someone who is: the mismatched hero and the
   * heroes they clash with.
   */
  "alignmentClash",
  /** Days on a trip in a party with no two-thirds alignment. */
  "partyDivided",
  /** Days on a trip with Good and Evil heroes together, even when a Neutral majority allows it. */
  "goodEvilFriction",
  /**
   * The fallen (DESIGN.md §10). A guild mate was laid to rest in the
   * Graveyard: 1 for everyone in town.
   */
  "buriedComrade",
  /** A guild mate's body, left in the dungeon, rose as one of the undead. */
  "comradeRose",
  /** Risen guild mates this hero knew, met in a fight on this trip. */
  "foughtRisen",
  /** 1 if this hero was brought back from the dead at the Temple. */
  "resurrected",
  /** A treat the town laid on (M7.17 petitions): the petition's amount, for everyone at home. */
  "townTreat",
  /**
   * Alignment in the dungeon (DESIGN.md §7, content/events/): kind deeds the
   * party did on the trip (a stranger healed, a shrine honoured)...
   */
  "goodDeeds",
  /** ...and cruel ones (a stranger robbed, a shrine looted). */
  "evilDeeds",
  /** 1 if they carried unholy gear (tag "unholy") on the trip. */
  "unholyGear",
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

/**
 * An alignment (DESIGN.md §7): Good, Neutral, Evil. `position` places it on
 * the scale; one step apart is fine, two steps is a clash. Its morale rules
 * act like a second motivation.
 */
export interface AlignmentDef {
  id: string;
  name: string;
  blurb: string;
  /** Place on the scale, in whole steps (Good 1, Neutral 0, Evil -1). */
  position: number;
  /** How often recruits have it, relative to the others. */
  weight: number;
  rules: readonly MoraleRule[];
  /** Colour of the frame round a hero's portrait (M8), "#rrggbb". */
  frame?: string;
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
