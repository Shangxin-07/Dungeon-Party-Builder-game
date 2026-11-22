/**
 * The trip report: what an expedition hands back to the town and the watch view.
 */
import type { CombatEvent, FoeSheet } from "../combat";
import type { Body, Risen } from "../fallen";
import type { Hero } from "../hero";
import type { HaulItem } from "../loot";
import type { StandingOrders } from "./orders";

export type ExpeditionEventKind =
  | "depart"
  | "floor"
  | "room"
  | "scout"
  | "trap"
  | "fight"
  | "combat"
  | "loot"
  | "drop"
  | "medicine"
  | "rest"
  | "retreat"
  | "wander"
  | "home"
  | "wipe"
  /** A fight room with nothing left alive in it. */
  | "quiet"
  /** A low-morale hero ignores the standing orders (DESIGN.md §6). */
  | "disobey"
  /** A porter's run for home after a wipe (M6). */
  | "porter"
  /** A hidden cache found by the party's best scout (M6). */
  | "secret"
  /** A rescue party reaches where a lost party fell (DESIGN.md §10). */
  | "site"
  /** Something the party decided about, by its alignment (DESIGN.md §7, content/events/). */
  | "event"
  /** Monsters talked to the party instead of fighting it (DESIGN.md §7). */
  | "parley"
  /** The party camps in a tunnel after a long day awake (M7.01). */
  | "camp"
  /** Raids on the town reuse the trip log format. */
  | "raid";

/** A hero's condition at a point in the trip. */
export interface HeroStatus {
  uid: string;
  name: string;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  condition: Hero["condition"];
}

export interface ExpeditionEvent {
  kind: ExpeditionEventKind;
  text: string;
  /** Floor depth (0 = in town). */
  floor: number;
  /** Room number on this floor, from 1 (0 = between rooms). */
  room: number;
  /**
   * Hours since the party set off (M7.01): see tripClock. Missing on raids
   * and on trips saved before the clock.
   */
  hour?: number;
  /** "combat" events: the line from the battle report. */
  combat?: CombatEvent;
  /** "fight" events: the monsters at the start of the fight, with their stats. */
  monsters?: FoeSheet[];
  /** Every event except "combat": the party after it happened. */
  party?: HeroStatus[];
}

export interface ExpeditionResult {
  /**
   * "returned": did what it was told. "retreated": turned back early.
   * "wiped": nobody left standing.
   */
  outcome: "returned" | "retreated" | "wiped";
  orders: StandingOrders;
  deepestFloor: number;
  /**
   * In-game days the trip took (DESIGN.md decision 2): the days the town
   * lives through before the party is back, worked out from `hours`.
   */
  days: number;
  /** Hours from setting off to climbing out (or falling), M7.01. Missing on older saves. */
  hours?: number;
  roomsVisited: number;
  /** The heroes as they came home (or where they fell). */
  party: Hero[];
  /** Loot carried out. Empty after a wipe: it stays with the fallen. */
  haul: HaulItem[];
  /** Haul left at the wipe site, for a rescue party to recover later. */
  leftBehind: HaulItem[];
  kills: string[];
  /** Monsters killed on each floor (summoned ones don't count), for the dungeon's population. */
  floorKills: Record<number, number>;
  log: ExpeditionEvent[];
  /** Where the party fell, if it was wiped. */
  wipeSite?: { floor: number; room: number };
  /** Kinds of monster the party fought. */
  seen: string[];
  /** Trapped heroes the party found and freed. After a wipe they're lost again. */
  rescued: Hero[];
  /** The lost party's site the party reached, if any. */
  siteVisited?: string;
  /** What the party couldn't carry away from that site. */
  siteLeft: HaulItem[];
  /** Ids of scavenged gear taken back from the monsters carrying it. */
  gearTaken: string[];
  /**
   * Bodies the party picked up (DESIGN.md §10): from a lost party's site, and
   * risen guild mates put down. After a wipe they lie where the party fell.
   */
  bodies: Body[];
  /** Ids of risen guild mates the party fought, and of those it put down. */
  risenMet: string[];
  risenSlain: string[];
  /** Times a hero ignored orders. */
  disobeyed: number;
  /** Extra rooms spent hunting under a "clear the floor" order. */
  huntRooms: number;
  /** Porters who went along, and whether they got home. */
  porters: { id: string; name: string; home: boolean }[];
  /** Loot porters ran home with after a wipe (not in `haul` or `leftBehind`). */
  porterHaul: HaulItem[];
  /** Hidden caches found, and those walked past without anyone noticing. */
  secrets: { found: number; missed: number };
  /**
   * Kind and cruel deeds the party did (DESIGN.md §7, content/events/), as
   * morale facts. Optional: trips saved before M6.23 don't have them.
   */
  deeds?: { goodDeeds: number; evilDeeds: number };
  /** Gold that will reach the town for what the party did: a reward later. */
  gifts?: { gold: number; news: string }[];
  /** Fights monsters talked their way out of (DESIGN.md §7). */
  parleys?: number;
}

/** Where a lost party fell, as a rescue party will find it (DESIGN.md §10). */
export interface SiteVisit {
  id: string;
  floor: number;
  /** The room they fell in. The rescue party gets there after that many rooms. */
  room: number;
  /** Trapped heroes still alive when the rescue party arrives. */
  trapped: Hero[];
  /** The bodies of those who died there. */
  bodies: Body[];
  /** Their gear and the haul they were carrying. */
  items: HaulItem[];
}

/** A lost hero's gear that monsters carried off from a site, now loose on a floor. */
export interface CarriedGear {
  id: string;
  item: string;
  owner?: string;
}

/** What the dungeon holds besides monsters: a site to reach, gear being carried about. */
export interface ExpeditionExtras {
  site?: SiteVisit;
  /** Scavenged gear by floor depth. */
  gear?: Readonly<Record<number, readonly CarriedGear[]>>;
  /** Porters (M6): they carry loot, never fight, and run for it if the party falls. */
  porters?: readonly Hero[];
  /** Risen guild mates haunting the floors (DESIGN.md §10). */
  risen?: readonly Risen[];
  /** Floors the Mine Cage carries the party past, down and back up (M6.21). */
  lift?: number;
}
