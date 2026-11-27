/**
 * The shape of a town: everything a save holds (TownState and its parts).
 */
import type { CarriedGear, ExpeditionResult, FloorIntel, StandingOrders } from "../expedition";
import type { DungeonState } from "../dungeon";
import type { Hero } from "../hero";
import type { Body, Risen } from "../fallen";
import type { HaulItem } from "../loot";
import type { RaidReport } from "../raid";

/** Bump when the shape of TownState changes, and add a migration in save.ts. */
export const TOWN_VERSION = 28;

/** How many nights of pit history and full raid reports the town keeps. */
export const PIT_HISTORY = 60;

export const RAID_HISTORY = 5;

/** How many finished trips the town keeps for the debrief and the replay. */
export const TRIP_HISTORY = 4;

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

/** What the guild has done about one of the Hearthstone's shards (DESIGN.md §20). */
export interface ShardFind {
  /** Day a party found it (it may still be below, if that party was lost). */
  found?: number;
  /** Library shards: research points so far, and the day the Library worked out where it is. */
  points?: number;
  lead?: number;
}

/** Where a party fell. A rescue run can bring back the living and the gear. */
export interface LostSite {
  id: string;
  floor: number;
  room: number;
  /** Day the party fell (M7.02: the town may hear of it later, or never). */
  day: number;
  /**
   * The party still out (M7.02) whose site this is: the town hasn't heard
   * what happened yet, so nothing shows. Cleared when it hears.
   */
  outing?: string;
  /**
   * The town knows the party is lost but not where (M7.02: it was given up
   * for lost with nobody to say what happened). Shown by `heading` and `party`.
   */
  unknown?: boolean;
  /** The party this site was hidden for, once the town has heard (search orders follow it). */
  outingWas?: string;
  /** The floor the party was heading for, and its name (M7.02). */
  heading?: number;
  party?: string;
  /** Day the town heard of this site (M7.02): its dead lie still riseDays from then at least. */
  heard?: number;
  /** A party that holed up (M7.02): the trapped are holding out together. */
  holed?: boolean;
  /** A party sent to this site is on its way (M7.02): the site waits for it. */
  visitor?: string;
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
  /**
   * "dead" for good. "lost": went down and was never heard of again (M7.02;
   * in saves from before rescue runs, lost before rescues existed).
   */
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

/**
 * A party out in the dungeon (M7.02, DESIGN.md §17.1). Its whole trip was
 * simulated when it set off, but the town only learns what happened as the
 * days pass: kills come off the dungeon night by night, and the rest lands on
 * the day they climb out, or when someone brings news of them.
 */
export interface Outing {
  id: string;
  /** "Party A", or whoever leads it. */
  name: string;
  /** Day it set off, and the day it's expected back (worked out from the orders alone). */
  left: number;
  expected: number;
  /** Hero and porter ids: away until the town hears of them. */
  heroes: string[];
  porters: string[];
  /** Who led it (M7.05). */
  leader?: string;
  /** Deserters who have made it home (M7.05): no longer away with it. */
  deserted?: string[];
  seed: number;
  /** The heroes and porters as they left town. */
  party: Hero[];
  porterParty: Hero[];
  /** What happens to them. Hidden from the town until it hears. */
  result: ExpeditionResult;
  /** Days of the trip whose kills have come off the dungeon. */
  killsLanded: number;
  /** The seal this party built (M7.16) is up in the dungeon. */
  sealPlaced?: boolean;
  /** Its Seal Stone has been set in the dungeon (M8.17). */
  stonePlaced?: boolean;
  /**
   * The guild gave them up for lost before hearing anything (M7.02): they're
   * off the roster and the payroll, on the memorial as lost. If they do come
   * home, they're welcomed back.
   */
  givenUp?: number;
  /** Day the party fell or holed up, and where (the town doesn't know yet). */
  fell?: number;
  site?: string;
}

/** What came back from the last trip, for the watch and results screens. */
export interface TripReport {
  /** Day the party set off. */
  day: number;
  /**
   * A deserter's account (M7.05, DESIGN.md §17.5): all the guild knows of
   * the trip until the party is heard of. `result` stops where they left.
   */
  account?: { by: string; floor: number; room: number; blame?: string };
  /** Who led the party, and leader traits they picked up on the trip (M7.05). */
  leader?: string;
  traits?: string[];
  /** Heroes who slipped away from the party, and whether each made it home (M7.05). */
  deserters?: { name: string; home: boolean; floor: number }[];
  /** The party's name (M7.02), and the day the town heard how it went. */
  name?: string;
  back?: number;
  seed: number;
  /** The party as it left town. */
  party: Hero[];
  result: ExpeditionResult;
  /**
   * What the haul was worth at the Market the day it came home: coins plus
   * the rest at the haggled rate. Before M7.03 the Market paid this at once;
   * now only the coins are paid (`coins`) and the rest waits in the debrief.
   */
  goldEarned: number;
  /** Coins paid straight into the purse (M7.03). Missing on older trips. */
  coins?: number;
  /** Pieces of haul held for the debrief: sell, salvage or keep (M7.03). */
  held?: number;
  /** Each hero's share of the haul in gold, by hero id (M7.12). Missing on older trips. */
  shares?: Record<string, number>;
  /** Who haggled with the Market, and the share of loot value it paid (M6). */
  haggledBy?: string;
  lootRate?: number;
  /** Gold from hidden caches the party found (part of goldEarned). */
  hiddenGold?: number;
  /** Materials brought home for the guild's store, by item id (not sold). */
  materials?: Record<string, number>;
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
  /**
   * The next party's leader (M7.05), picked by the player. Missing, or not
   * in the party: the hero with the best Leadership leads.
   */
  leader?: string;
  orders: StandingOrders;
  records: Record<string, HeroRecord>;
  memorial: Memorial[];
  /** The newest of `trips`, kept for older saves and quick checks. */
  lastTrip?: TripReport;
  /** The last few trips the town has heard about, oldest first (M7.02). */
  trips: TripReport[];
  /** Parties out in the dungeon now (M7.02). */
  outings: Outing[];
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
  /** Materials in the guild's store, by item id (DESIGN.md §8): kept to build with. */
  materials: Record<string, number>;
  /** Heroes on each post round the pit (DESIGN.md §8), by post id. */
  posts: Record<string, string[]>;
  /**
   * The opening (DESIGN.md §8): true while the guild is still holding the
   * mining camp, before it can send parties down. Missing in older saves.
   */
  camp?: boolean;
  /** The haul waiting in the debrief (M7.03), oldest first. */
  haul: HeldItem[];
  /** What the debrief proposes for each new haul (M7.03). */
  haulRule: HaulRule;
  /** Research at the Library (M7.07, DESIGN.md §17.7). */
  research: ResearchState;
  /**
   * What scouts last brought home about each floor (M7.08, DESIGN.md §17.8),
   * by floor depth.
   */
  intel: Record<number, TownIntel>;
  /**
   * What ordinary parties made of each floor they passed through (M7.13,
   * DESIGN.md §18.3), by depth: a rough feel, dated. Scouts' `intel` is better.
   */
  sightings: Record<number, Sighting>;
  /** Workshops (M7.14, DESIGN.md §18.1), by building id: who works there and what's queued. */
  workshops: Record<string, Workshop>;
  /** Townsfolk (M7.15): how many, the food in store, and how many work each job. */
  folk: Folk;
  /** Town news (M7.17): offers waiting for an answer. */
  offers: Offer[];
  /** The offers' own random stream (M7.17), so they don't change the town's other dice. */
  offerSeed?: number;
  /** Huge beasts' lairs (M7.08), by lair id: the day the beast was killed. */
  lairs: Record<string, { slain?: number }>;
  /**
   * The Hearthstone's shards (DESIGN.md §20), by shard source id (content/
   * shards/): when each was found, and the Library's work on the ones it finds.
   */
  shards: Record<string, ShardFind>;
  /** How far the guild's name has gone (M8.19, DESIGN.md §20, content/renown.ts). */
  renown: number;
  /**
   * Dig sites on held floors (M8.20, DESIGN.md §20, content/digsites/): by
   * floor, then by site id. A site still being dug out has level 0.
   */
  digs: Record<number, Record<string, DigSite>>;
  /** Story chapters opened (M8.21, content/story/): chapter id -> the day it opened. */
  story: Record<string, number>;
  /** What the posts brought in yesterday: materials by id, and gold. */
  gathered?: { day: number; materials: Record<string, number>; gold: number };
}

/**
 * The town's settlers (M7.15). `jobs` counts settlers by job: "post:<id>"
 * or "workshop:<building id>". The rest are just living here.
 */
export interface Folk {
  count: number;
  food: number;
  jobs: Record<string, number>;
}

/** A workshop's benches and queue (M7.14). Workers away below keep their bench. */
export interface Workshop {
  workers: string[];
  /** Jobs in order; the first is worked on. `done` is the work put in so far. */
  queue: Job[];
}

export interface Job {
  id: string;
  recipe: string;
  done: number;
}

/** A party's feel for a floor (M7.13): how many were living there, and how strong. */
export interface Sighting {
  day: number;
  by: string;
  population: number;
  level: number;
}

/** Floor intel as the town keeps it (M7.08): the day the scouts saw it, and who. */
export interface TownIntel extends FloorIntel {
  day: number;
  by: string;
}

/**
 * A piece of a trip's haul waiting in the debrief (M7.03, DESIGN.md §17.4):
 * the player sells it, salvages it into materials, or keeps it.
 */
export interface HeldItem extends HaulItem {
  id: string;
  /** The party that brought it home, and the day it did. */
  from: string;
  day: number;
}

/**
 * What the debrief proposes for a new haul (DESIGN.md §17.4): sell it all,
 * salvage what breaks down and sell the rest, or keep it all.
 */
export type HaulRule = "sell" | "salvage" | "keep";

/** What happens to one piece of held haul. Research needs the Library (M7.07). */
export type HaulChoice = "sell" | "salvage" | "keep" | "research";

/**
 * Research at the Library (M7.07, DESIGN.md §17.7): see src/sim/town/research.ts.
 * Topics are "monster:<id>" for a monster the guild has met, and
 * "shelf:<id>" for a find waiting on the shelf.
 */
export interface ResearchState {
  /** Research points put into each monster so far, by monster id. */
  monsters: Record<string, number>;
  /** Finds from the haul waiting on the Library shelf to be studied, oldest first. */
  shelf: ShelfItem[];
  /** Heroes at the research desks, and what each is studying. */
  desks: Desk[];
}

/** A find on the Library shelf: points put into it so far. */
export interface ShelfItem {
  id: string;
  item: string;
  points: number;
  /** The day it went on the shelf. */
  day: number;
}

/** A hero at a research desk. No topic: they study whatever is nearest done. */
export interface Desk {
  hero: string;
  topic?: string;
}

/** A party on file: who goes, who carries, and their orders. Gear stays on the heroes. */
export interface SavedParty {
  name: string;
  heroes: string[];
  porters: string[];
  /** Its leader (M7.05), if the player picked one. */
  leader?: string;
  /** Orders for this party, without any rescue (that belongs to the moment). */
  orders: StandingOrders;
}

/** What the guild's gold went on, or came from. */
export type LedgerKind =
  | "haul"
  | "sold"
  | "bought"
  | "hired"
  /** Retainers for heroes at home (M7.12; daily wages before). */
  | "wages"
  /** Heroes' shares of the haul (M7.12). */
  | "shares"
  /** Gold paid for workshop jobs, and given back when one is called off (M7.14). */
  | "crafting"
  /** Townsfolk's taxes and market days (M7.15). */
  | "taxes"
  /** Bought from and sold to caravans (M7.17). */
  | "trade"
  /** Paid for contracts delivered (M7.17). */
  | "contracts"
  /** Petitions granted (M7.17). */
  | "petitions"
  | "built"
  | "repairs"
  | "stolen"
  | "temple"
  | "burials"
  | "gathered"
  | "spoils"
  /** Rewards for what a party did down there (DESIGN.md §7, content/events/). */
  | "gifts";

/** A dig site on a held floor (M8.20). */
export interface DigSite {
  /** 0 while it's first being dug out. */
  level: number;
  /** The diggers at work on the next level. */
  work?: { level: number; daysLeft: number };
  /** Part-materials the mine has sent up so far, so fractions add up. */
  carry?: Record<string, number>;
}

/** Gold in (positive) or out (negative) of one kind on one day. */
export interface LedgerLine {
  day: number;
  kind: LedgerKind;
  amount: number;
}

/** How many days of accounts the town keeps. */
export const LEDGER_DAYS = 30;

/** An offer waiting in town (M7.17, content/offers/). */
export interface Offer {
  id: string;
  /** content/offers/ */
  def: string;
  /** Day it turned up, and the last day it waits (a contract taken on: the last day to deliver). */
  day: number;
  until: number;
  /** A contract the guild has taken on. */
  taken?: boolean;
  /** A caravan's wares already bought, by index. */
  bought?: number[];
  /** A visitor: who they are. */
  hero?: Hero;
}

/** One line of town news. */
export interface News {
  day: number;
  text: string;
  /** "story": a chapter opened (M8.21). */
  tone?: "good" | "bad" | "story";
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
