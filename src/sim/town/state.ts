/**
 * The shape of a town: everything a save holds (TownState and its parts).
 */
import type { CarriedGear, ExpeditionResult, StandingOrders } from "../expedition";
import type { DungeonState } from "../dungeon";
import type { Hero } from "../hero";
import type { Body, Risen } from "../fallen";
import type { HaulItem } from "../loot";
import type { RaidReport } from "../raid";

/** Bump when the shape of TownState changes, and add a migration in save.ts. */
export const TOWN_VERSION = 12;

/** How many nights of pit history and full raid reports the town keeps. */
export const PIT_HISTORY = 60;

export const RAID_HISTORY = 5;

/** A hero's career so far. */
export interface HeroRecord {
  trips: number;
  kills: number;
  /** Day they joined the guild. */
  joined: number;
  /** Deepest floor they've reached. */
  deepest: number;
  /** Kinds of monster they've fought. */
  seen: string[];
}

/** A trapped hero waiting for rescue (DESIGN.md §10). */
export interface Trapped {
  hero: Hero;
  /** The last day a rescue party can reach them alive. */
  until: number;
}

/** Where a party fell. A rescue run can bring back the living and the gear. */
export interface LostSite {
  id: string;
  floor: number;
  room: number;
  /** Day the news reached town. */
  day: number;
  trapped: Trapped[];
  /** The bodies of those who died there (DESIGN.md §10). Left too long, they rise. */
  bodies: Body[];
  /** Gear of the dead (kept, not sold) and the haul they were carrying. */
  items: HaulItem[];
}

/** Gear that monsters carried off from a site. It turns up in fights on that floor. */
export interface ScavengedGear extends CarriedGear {
  floor: number;
}

/** Someone who left the guild of their own accord. */
export interface Departure {
  name: string;
  classId: string;
  day: number;
  /** What they took with them. */
  took: string[];
}

/** Someone the guild has lost. */
export interface Memorial {
  /** The hero's id (saves from before the fallen don't have it). */
  heroId?: string;
  name: string;
  classId: string;
  day: number;
  floor: number;
  /** "dead" for good. "lost" only appears in saves from before rescue runs. */
  fate: "dead" | "lost";
  /** "raid" if they died defending the town (floor is then 0). */
  cause?: "raid";
  /** Day they were buried in the Graveyard. */
  buried?: number;
  /** Their body rose in the dungeon (DESIGN.md §10). */
  risen?: boolean;
  record: HeroRecord;
}

/** One night at the pit, for the pit gauge and its history. */
export interface PitNight {
  day: number;
  /** Monsters that climbed out and their average level. */
  climbed: number;
  level: number;
  strength: number;
  defence: number;
  outcome: RaidReport["outcome"];
}

/** What came back from the last trip, for the watch and results screens. */
export interface TripReport {
  /** Day the party set off. */
  day: number;
  seed: number;
  /** The party as it left town. */
  party: Hero[];
  result: ExpeditionResult;
  /** Gold the Market paid for the haul. */
  goldEarned: number;
  /** Who haggled with the Market, and the share of loot value it paid (M6). */
  haggledBy?: string;
  lootRate?: number;
  /** Gold from hidden caches the party found (part of goldEarned). */
  hiddenGold?: number;
  /** Kills per hero id. */
  kills: Record<string, number>;
  /** Raids on the town while the party was away (not "held" nights). */
  raids: RaidReport[];
  /** XP each hero earned, and levels gained, by hero id. */
  xp?: Record<string, number>;
  levels?: Record<string, number>;
  /** Morale changes after the trip, by hero id. */
  morale?: Record<string, { amount: number; reason: string }[]>;
  /** Names of heroes trapped after a wipe, and of those freed by a rescue. */
  trapped?: string[];
  rescued?: string[];
  /** Heroes' own gear brought home to the store room. */
  recovered?: HaulItem[];
  /** Names of heroes who quit when they got back. */
  quit?: string[];
  /** Injuries picked up on the trip, by hero id (injury ids). */
  injuries?: Record<string, string[]>;
  /** Each hero's fatigue when they got home, by hero id. */
  fatigue?: Record<string, number>;
}

export interface TownState {
  version: number;
  /** In-game day (DESIGN.md decision 2): advanced by trips and rest. */
  day: number;
  gold: number;
  /** Seed for everything random in town. Each roll moves it on. */
  seed: number;
  /** Building id → level (0 = not built). */
  buildings: Record<string, number>;
  roster: Hero[];
  /** Recruits looking for work today. */
  recruits: Hero[];
  /** Spare gear and supplies, by item id. */
  stash: string[];
  /** Ids of the heroes picked for the next trip, in order. */
  party: string[];
  orders: StandingOrders;
  records: Record<string, HeroRecord>;
  memorial: Memorial[];
  lastTrip?: TripReport;
  /** Next number for a hero id. */
  nextHeroId: number;
  /** The monster population, floor by floor (DESIGN.md §4). */
  dungeon: DungeonState;
  /** Building ids damaged by raids: they don't work until repaired. */
  damaged: string[];
  /** The last few weeks of nights at the pit, oldest first. */
  pit: PitNight[];
  /** The most recent raids that reached the town, oldest first. */
  raids: RaidReport[];
  /** Buildings and upgrades the builders are working on. Paid for up front. */
  construction: Construction[];
  /** Where parties fell, waiting for rescue (DESIGN.md §10). */
  sites: LostSite[];
  /** Lost heroes' gear that monsters carried off. */
  scavenged: ScavengedGear[];
  /** Heroes who quit. */
  departed: Departure[];
  /** Next number for a site or scavenged item id. */
  nextThingId: number;
  /** What happened in town lately ("Wren quit", "Bram died waiting"), newest last. */
  news: News[];
  /** The last few weeks of gold in and out, by day and kind. */
  ledger: LedgerLine[];
  /** Recruits the guild can still sign for nothing (the starting heroes). */
  freeHires: number;
  /**
   * Hidden caches (M6) over the guild's whole history: found, walked past
   * without noticing, and gold the Market paid for what was in them.
   */
  secrets: { found: number; missed: number; gold: number };
  /** Porters going down with the next party (hero ids, M6). They don't take party slots. */
  porters: string[];
  /** Parties kept on file (M6), so the player can swap a rested one in with one click. */
  parties: SavedParty[];
  /** Bodies brought home, waiting for the Temple or the Graveyard (DESIGN.md §10). */
  bodies: Body[];
  /** Guild mates the dungeon kept, risen as the undead. */
  risen: Risen[];
}

/** A party on file: who goes, who carries, and their orders. Gear stays on the heroes. */
export interface SavedParty {
  name: string;
  heroes: string[];
  porters: string[];
  /** Orders for this party, without any rescue (that belongs to the moment). */
  orders: StandingOrders;
}

/** What the guild's gold went on, or came from. */
export type LedgerKind =
  | "haul"
  | "sold"
  | "bought"
  | "hired"
  | "wages"
  | "built"
  | "repairs"
  | "stolen"
  | "temple"
  | "burials";

/** Gold in (positive) or out (negative) of one kind on one day. */
export interface LedgerLine {
  day: number;
  kind: LedgerKind;
  amount: number;
}

/** How many days of accounts the town keeps. */
export const LEDGER_DAYS = 30;

/** One line of town news. */
export interface News {
  day: number;
  text: string;
  tone?: "good" | "bad";
}

/** A building or upgrade in progress. */
export interface Construction {
  building: string;
  /** The level it will be when finished. */
  level: number;
  /** Days of work left. */
  daysLeft: number;
  /** Day the work started. */
  started: number;
  /** Part of a day's work done by heroes lending a hand, not yet a whole day. */
  helped?: number;
}

/** Why an action can't happen right now, in words for the player. */
export class TownError extends Error {}

export const newRecord = (day: number): HeroRecord => ({
  trips: 0,
  kills: 0,
  joined: day,
  deepest: 0,
  seen: [],
});
