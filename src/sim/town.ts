/**
 * The town (DESIGN.md §2, §8): everything the player does between trips.
 * Recruit and dismiss heroes, buy and sell at the Market, kit heroes out, pick
 * a party and its formation, set standing orders, upgrade buildings, launch.
 *
 * Every action is a pure function: it takes a TownState and returns a new one,
 * so the UI can keep it in a reducer and a save is just JSON. Randomness comes
 * from the state's own seed, so a town is as deterministic as an expedition.
 * Buildings and house rules are content (content/buildings/, content/town.ts).
 */
import type { BuildingEffect, ItemDef, Row, Stat } from "../content/types";
import {
  DEFAULT_ORDERS,
  runExpedition,
  type CarriedGear,
  type ExpeditionEvent,
  type ExpeditionResult,
  type SiteVisit,
  type StandingOrders,
} from "./expedition";
import { applyKills, dungeonDay, newDungeon, type DungeonState } from "./dungeon";
import { describeParty, partyAlignment } from "./alignment";
import {
  baseClasses,
  createHero,
  EQUIP_SLOTS,
  fatigueTier,
  heroSheet,
  rollRecruit,
  trainRecruit,
  classFit,
  type EquipSlot,
  type Hero,
} from "./hero";
import {
  makeBody,
  resurrectTerms,
  risenName,
  type Body,
  type ResurrectTerms,
  type Risen,
} from "./fallen";
import { chooseClass, gainXp, loseLevels, spendLevelUp } from "./levels";
import type { Index } from "./library";
import type { HaulItem } from "./loot";
import { applyMorale, gearTags, isLow, moraleChanges, type Facts } from "./morale";
import { resolveRaid, type RaidReport } from "./raid";
import { createRng, type Rng } from "./rng";

/** Bump when the shape of TownState changes, and add a migration in save.ts. */
export const TOWN_VERSION = 12;

/** How many nights of pit history and full raid reports the town keeps. */
const PIT_HISTORY = 60;
const RAID_HISTORY = 5;

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

// ---------------------------------------------------------------------------
// Reading the town
// ---------------------------------------------------------------------------

/** Effects of every working building (damaged ones do nothing until repaired). */
function effects(ix: Index, town: TownState): BuildingEffect[] {
  const out: BuildingEffect[] = [];
  for (const b of ix.lib.buildings) out.push(...buildingEffects(ix, town, b.id));
  return out;
}

/** What one building is doing for the town right now. */
export function buildingEffects(ix: Index, town: TownState, id: string): readonly BuildingEffect[] {
  const level = town.buildings[id] ?? 0;
  if (level <= 0 || town.damaged.includes(id)) return [];
  return ix.building(id).levels[level - 1]?.effects ?? [];
}

type Amount = Extract<BuildingEffect, { amount: number }>["type"];
const total = (ix: Index, town: TownState, type: Amount) =>
  effects(ix, town).reduce((s, e) => s + (e.type === type ? e.amount : 0), 0);

export const partySlots = (ix: Index, town: TownState) => total(ix, town, "partySlots");
export const rosterSize = (ix: Index, town: TownState) => total(ix, town, "rosterSize");
/** Overflow strength the pit defences hold back each night. */
export const defence = (ix: Index, town: TownState) => total(ix, town, "defence");
/** How many nights ahead the watchtowers can see (0 = none). */
export const warningDays = (ix: Index, town: TownState) =>
  effects(ix, town).reduce((m, e) => (e.type === "raidWarning" ? Math.max(m, e.days) : m), 0);
const recruitsToday = (ix: Index, town: TownState) =>
  ix.lib.town.recruitsOnOffer + total(ix, town, "recruitOffers");
const recruitPicks = (ix: Index, town: TownState) => 1 + total(ix, town, "recruitPicks");
/** Morale every hero in town gets each rest day (the Tavern). */
export const restMorale = (ix: Index, town: TownState) => total(ix, town, "restMorale");
/** XP every hero in town gets each rest day (the Training Yard). */
export const trainingXp = (ix: Index, town: TownState) => total(ix, town, "trainingXp");
/** Extra XP from trips, in percent (the Library). */
export const xpBonus = (ix: Index, town: TownState) => total(ix, town, "xpPercent");
/** Percent of the guild's gold that raiders can't get at (the Vault). */
export const vaultShare = (ix: Index, town: TownState) =>
  Math.min(
    100,
    effects(ix, town).reduce((m, e) => (e.type === "vault" ? Math.max(m, e.amount) : m), 0),
  );

/** A hero's daily wage (content/town.ts). */
export const wage = (ix: Index, h: Hero) =>
  h.porter
    ? ix.lib.town.porters.wage + (h.pay ?? 0)
    : ix.lib.town.wages.base + ix.lib.town.wages.perLevel * h.level + (h.pay ?? 0);
/** What the whole roster costs a day. */
export const wageBill = (ix: Index, town: TownState) =>
  town.roster.reduce((s, h) => s + wage(ix, h), 0);

/** Whether a building is up and working (built and not damaged). */
export const standing = (town: TownState, id: string) =>
  (town.buildings[id] ?? 0) > 0 && !town.damaged.includes(id);

/** "Does the town have this building standing?", for class requirements. */
export const built = (town: TownState) => (id: string) => standing(town, id);

/**
 * What the next nights at the pit will bring if nobody kills anything, as far
 * ahead as the watchtowers can see. The dungeon has no dice, so this is exact.
 */
export function forecast(ix: Index, town: TownState): { day: number; strength: number }[] {
  const out: { day: number; strength: number }[] = [];
  let d = town.dungeon;
  for (let i = 0; i < warningDays(ix, town); i++) {
    const next = dungeonDay(ix, d);
    d = next.dungeon;
    out.push({ day: town.day + i, strength: next.day.strength });
  }
  return out;
}

/** Gold to repair a raid-damaged building: a share of everything it cost to build. */
export function repairCost(ix: Index, town: TownState, id: string): number {
  const level = town.buildings[id] ?? 0;
  const spent = ix
    .building(id)
    .levels.slice(0, level)
    .reduce((s, l) => s + l.cost, 0);
  return Math.max(5, Math.round(spent * ix.lib.town.repairRate));
}

/** Item ids on sale in town, in shop order. */
export function shopStock(ix: Index, town: TownState): string[] {
  const out: string[] = [];
  for (const e of effects(ix, town)) {
    if (e.type === "sells") for (const id of e.items) if (!out.includes(id)) out.push(id);
  }
  return out;
}

export const buyPrice = (item: ItemDef) => item.value;

/**
 * The guild's best haggler (M6): whoever in town gets the Market to pay most,
 * by Appraisal and CHA (content/town.ts `haggle`). `bonus` is added to the
 * Market's usual rates.
 */
export function haggler(ix: Index, town: TownState): { hero?: Hero; bonus: number } {
  const h = ix.lib.town.haggle;
  let best: { hero?: Hero; bonus: number } = { bonus: 0 };
  for (const x of town.roster) {
    const sheet = heroSheet(ix, x);
    const bonus =
      Math.max(0, (sheet.skills.appraisal ?? 0) - 50) * h.perAppraisal +
      Math.max(0, sheet.stats.CHA - 10) * h.perCha;
    if (bonus > best.bonus) best = { hero: x, bonus };
  }
  return best;
}

/** The share of value the Market pays, after haggling. Never above haggle.max. */
export const marketRate = (ix: Index, base: number, bonus = 0) =>
  Math.min(Math.max(base, ix.lib.town.haggle.max), base + bonus);

/** What the Market pays for one piece of a trip's haul worth `value`. Coins are coins. */
export const haulPrice = (ix: Index, itemId: string, value: number, bonus = 0) =>
  ix.item(itemId).tags.includes("coins")
    ? value
    : Math.max(1, Math.floor(value * marketRate(ix, ix.lib.town.haulRate, bonus)));
export const sellPrice = (ix: Index, item: ItemDef, bonus = 0) =>
  Math.max(1, Math.floor(item.value * marketRate(ix, ix.lib.town.sellRate, bonus)));

export const findHero = (town: TownState, id: string) => town.roster.find((h) => h.id === id);

export function maxHp(ix: Index, hero: Hero): number {
  return heroSheet(ix, hero).derived.maxHp;
}

/** Things worth knowing before launch. Empty means good to go. */
export function launchWarnings(ix: Index, town: TownState): string[] {
  const out: string[] = [];
  const party = town.party.map((id) => findHero(town, id)).filter((h): h is Hero => !!h);
  for (const h of party) {
    const pct = Math.round((h.hp / maxHp(ix, h)) * 100);
    if (pct < 100) out.push(`${h.name} is only at ${pct}% HP.`);
    const slots = heroSheet(ix, h).derived.carrySlots;
    if (h.pack.length >= slots) out.push(`${h.name}'s pack is full: no room for loot.`);
  }
  if (party.length && !party.some((h) => h.row === "front"))
    out.push("Nobody is in the front row. Monsters will go straight for the back.");
  const aligned = partyAlignment(ix, party);
  if (aligned.divided || aligned.mismatched.length) out.push(describeParty(ix, party));
  if (party.length && !party.some((h) => h.pack.some((id) => ix.item(id).tags.includes("heal"))))
    out.push("Nobody is carrying potions or bandages.");
  for (const h of party) {
    const tier = fatigueTier(ix, h);
    if (tier) out.push(`${h.name} is ${tier.name} (fatigue ${h.fatigue}) and will fight worse.`);
    if (h.levelUps.length) out.push(`${h.name} has a level-up to spend.`);
    if (isLow(ix, h)) {
      const low = ix.motivation(h.motivation).lowMorale;
      const risk = low?.refuseRetreat
        ? " They may refuse to turn back."
        : low?.grabJunk
          ? " They may ignore the loot orders."
          : "";
      out.push(`${h.name} is unhappy (morale ${h.morale}).${risk}`);
    }
  }
  const site = rescueSite(town);
  if (site) {
    const arrive = town.day + site.floor - 1;
    const alive = site.trapped.filter((x) => x.until >= arrive);
    if (town.orders.targetFloor < site.floor)
      out.push(`The rescue needs the party to go down to floor ${site.floor}.`);
    if (site.trapped.length && !alive.length)
      out.push("They can't get there in time to save anyone, but the gear is still there.");
  }
  return out;
}

/** The site the current orders are a rescue run to, if any. */
export const rescueSite = (town: TownState) =>
  town.orders.rescue ? town.sites.find((s) => s.id === town.orders.rescue) : undefined;

/** Things heroes are saying in town: complaints and wishes (DESIGN.md §6, §8). */
export function grumbles(ix: Index, town: TownState): { hero: string; text: string }[] {
  const out: { hero: string; text: string }[] = [];
  for (const h of town.roster) {
    if (isLow(ix, h)) {
      const why = [...h.moraleLog].reverse().find((n) => n.amount < 0)?.reason;
      out.push({
        hero: h.id,
        text: `${h.name} is unhappy${why ? ` (${why})` : ""} and talks about leaving.`,
      });
    }
    if (!standing(town, h.favourite)) {
      const b = ix.building(h.favourite).name;
      const fixing = (town.buildings[h.favourite] ?? 0) > 0;
      out.push({
        hero: h.id,
        text: fixing
          ? `${h.name} wants the ${b} repaired.`
          : `${h.name} keeps asking when we're getting a ${b}.`,
      });
    }
  }
  return out;
}

/** Why the party can't leave yet, or undefined if it can. */
export function cantLaunch(ix: Index, town: TownState): string | undefined {
  if (!town.party.length) return "Pick at least one hero for the party.";
  if (town.party.length > partySlots(ix, town))
    return `The Guild Hall only has room for ${partySlots(ix, town)} in a party.`;
  if ((town.porters ?? []).length > ix.lib.town.porters.slots)
    return `Only ${ix.lib.town.porters.slots} porters can go with one party.`;
  for (const id of [...town.party, ...(town.porters ?? [])]) {
    const h = findHero(town, id);
    if (!h) return "Someone in the party has left the guild.";
    if (h.condition !== "ok" || h.hp <= 0) return `${h.name} can't walk yet. Let them rest.`;
    const inj = h.injuries?.[0];
    if (inj)
      return `${h.name} is laid up with a ${ix.injury(inj.id).name.toLowerCase()} for ${inj.days} more ${inj.days === 1 ? "day" : "days"}. Pick someone else.`;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Starting a town
// ---------------------------------------------------------------------------

export const newRecord = (day: number): HeroRecord => ({
  trips: 0,
  kills: 0,
  joined: day,
  deepest: 0,
  seen: [],
});

/** How many lines of news the town keeps. */
const NEWS_LENGTH = 12;

function news(t: TownState, text: string, tone?: News["tone"]): void {
  t.news = [...t.news, { day: t.day, text, tone }].slice(-NEWS_LENGTH);
}

/** Move gold in or out and write it in the accounts. */
function book(t: TownState, kind: LedgerKind, amount: number): void {
  if (!amount) return;
  t.gold += amount;
  const line = t.ledger.find((l) => l.day === t.day && l.kind === kind);
  if (line) line.amount += amount;
  else t.ledger.push({ day: t.day, kind, amount });
  t.ledger = t.ledger.filter((l) => l.day > t.day - LEDGER_DAYS);
}

/** Take the next random roll from the town's seed. */
function roll<T>(town: TownState, use: (rng: Rng) => T): T {
  const rng = createRng(town.seed);
  const out = use(rng);
  town.seed = rng.int(0, 2 ** 31 - 1);
  return out;
}

function pickName(town: TownState, names: readonly string[], rng: Rng): string {
  const taken = new Set([...town.roster, ...town.recruits].map((h) => h.name));
  const free = names.filter((n) => !taken.has(n));
  if (free.length) return rng.pick(free);
  const base = rng.pick(names);
  for (let n = 2; ; n++) if (!taken.has(`${base} ${n}`)) return `${base} ${n}`;
}

/** A new hero. With `picks` above 1, the best of that many rolls by the class's main stats. */
function makeHero(
  ix: Index,
  town: TownState,
  names: readonly string[],
  classId: string,
  picks = 1,
): Hero {
  return roll(town, (rng) => {
    const id = `h${town.nextHeroId++}`;
    const name = pickName(town, names, rng);
    const main = ix.cls(classId).mainStats;
    const score = (h: Hero) => main.reduce((s, st) => s + h.stats[st], 0);
    let best = createHero(ix, { id, name, classId }, rng);
    for (let i = 1; i < picks; i++) {
      const other = createHero(ix, { id, name, classId }, rng);
      if (score(other) > score(best)) best = other;
    }
    return best;
  });
}

/** Someone untrained looking for work (M6). */
function makeRecruit(ix: Index, town: TownState, names: readonly string[], picks = 1): Hero {
  return roll(town, (rng) => {
    const id = `h${town.nextHeroId++}`;
    return rollRecruit(ix, { id, name: pickName(town, names, rng) }, rng, picks);
  });
}

/**
 * A fresh batch of recruits looking for work: untrained, except for those a
 * good Tavern sends trained and kitted. The starting recruits wait until signed.
 */
function freshRecruits(ix: Index, town: TownState, names: readonly string[]): void {
  if ((town.freeHires ?? 0) > 0) return;
  town.recruits = [];
  const trained = total(ix, town, "trainedRecruits");
  for (let i = 0; i < recruitsToday(ix, town); i++) {
    if (i < trained) {
      const classId = roll(town, (rng) => rng.pick(baseClasses(ix)).id);
      town.recruits.push(makeHero(ix, town, names, classId, recruitPicks(ix, town)));
    } else town.recruits.push(makeRecruit(ix, town, names, recruitPicks(ix, town)));
  }
}

export function newTown(ix: Index, names: readonly string[], seed: number): TownState {
  const rules = ix.lib.town;
  const town: TownState = {
    version: TOWN_VERSION,
    day: 1,
    gold: rules.startingGold,
    seed,
    buildings: Object.fromEntries(ix.lib.buildings.map((b) => [b.id, b.startLevel])),
    roster: [],
    recruits: [],
    stash: [...rules.startingStash],
    party: [],
    orders: DEFAULT_ORDERS,
    records: {},
    memorial: [],
    nextHeroId: 1,
    dungeon: newDungeon(ix),
    damaged: [],
    pit: [],
    raids: [],
    construction: [],
    sites: [],
    scavenged: [],
    departed: [],
    nextThingId: 1,
    news: [],
    ledger: [],
    freeHires: rules.startingRecruits,
    secrets: { found: 0, missed: 0, gold: 0 },
    porters: [],
    parties: [],
    bodies: [],
    risen: [],
  };
  // M6: the first heroes turn up untrained. The player picks their classes
  // and kits them out from the store room (or calls autoStart).
  for (let i = 0; i < rules.startingRecruits; i++) town.recruits.push(makeRecruit(ix, town, names));
  return town;
}

// ---------------------------------------------------------------------------
// Actions. Each returns a new state, or throws a TownError saying why not.
// ---------------------------------------------------------------------------

/** Deep enough copy that actions can change the copy freely. */
function edit(town: TownState): TownState {
  return structuredClone(town);
}

function hero(town: TownState, id: string): Hero {
  const h = findHero(town, id);
  if (!h) throw new TownError("No such hero in the guild.");
  return h;
}

function takeFromStash(town: TownState, itemId: string): void {
  const i = town.stash.indexOf(itemId);
  if (i < 0) throw new TownError("That isn't in the store room.");
  town.stash.splice(i, 1);
}

/** Gold to sign this recruit: free while the starting heroes are signing up. */
export function hirePrice(ix: Index, town: TownState, recruit: Hero): number {
  if ((town.freeHires ?? 0) > 0) return 0;
  const kit = recruit.untrained
    ? 0
    : [...EQUIP_SLOTS.map((s) => recruit.equipment[s]), ...recruit.pack]
        .filter((id): id is string => !!id)
        .reduce((s, id) => s + ix.item(id).value, 0);
  return ix.lib.town.hireCost + kit;
}

/**
 * Sign a recruit. An untrained one (M6) is trained in `classId` (default: the
 * class their stats suit best) and joins with no gear; kit them out from the
 * store room or the Market. A trained one (the Tavern) comes with their kit.
 */
export function hire(ix: Index, town: TownState, recruitId: string, classId?: string): TownState {
  const t = edit(town);
  const i = t.recruits.findIndex((r) => r.id === recruitId);
  if (i < 0) throw new TownError("That recruit has moved on.");
  if (t.roster.length >= rosterSize(ix, t))
    throw new TownError("The roster is full. Upgrade the Guild Hall or dismiss someone.");
  const price = hirePrice(ix, t, t.recruits[i]!);
  if (t.gold < price) throw new TownError("Not enough gold.");
  if (classId && !baseClasses(ix).some((c) => c.id === classId))
    throw new TownError("Recruits can only start in a base class.");
  const [recruit] = t.recruits.splice(i, 1);
  const h = recruit!.untrained ? trainRecruit(ix, recruit!, classId ?? recruit!.classId) : recruit!;
  if ((t.freeHires ?? 0) > 0) t.freeHires -= 1;
  else book(t, "hired", -price);
  t.roster.push(h);
  t.records[h.id] = newRecord(t.day);
  if (t.party.length < partySlots(ix, t)) t.party.push(h.id);
  return t;
}

/**
 * Sign an untrained recruit as a porter (M6): cheap, carries loot, never
 * fights. They watch, and after enough fights can be trained (trainPorter).
 */
export function hirePorter(ix: Index, town: TownState, recruitId: string): TownState {
  const t = edit(town);
  const rules = ix.lib.town.porters;
  const i = t.recruits.findIndex((r) => r.id === recruitId);
  if (i < 0) throw new TownError("That recruit has moved on.");
  if (!t.recruits[i]!.untrained) throw new TownError("A trained hero won't carry bags.");
  if (t.roster.length >= rosterSize(ix, t))
    throw new TownError("The roster is full. Upgrade the Guild Hall or dismiss someone.");
  if (t.gold < rules.hireCost) throw new TownError("Not enough gold.");
  const [p] = t.recruits.splice(i, 1);
  p!.porter = { watched: 0, xp: 0 };
  p!.hp = heroSheet(ix, p!).derived.maxHp;
  book(t, "hired", -rules.hireCost);
  t.roster.push(p!);
  t.records[p!.id] = newRecord(t.day);
  t.porters ??= [];
  if (t.porters.length < rules.slots) t.porters.push(p!.id);
  return t;
}

/** Fights a porter still has to watch before they can be trained (0: ready). */
export const fightsToTrain = (ix: Index, h: Hero) =>
  h.porter ? Math.max(0, ix.lib.town.porters.trainAfterFights - h.porter.watched) : 0;

/**
 * Train a porter who has watched enough fights in a class (M6). They keep
 * their name, mood and record, and the XP they banked watching is paid out.
 */
export function trainPorter(
  ix: Index,
  town: TownState,
  heroId: string,
  classId: string,
): TownState {
  const t = edit(town);
  const h = hero(t, heroId);
  if (!h.porter) throw new TownError(`${h.name} isn't a porter.`);
  const left = fightsToTrain(ix, h);
  if (left)
    throw new TownError(
      `${h.name} needs to watch ${left} more ${left === 1 ? "fight" : "fights"}.`,
    );
  if (!baseClasses(ix).some((c) => c.id === classId))
    throw new TownError("Porters can only train in a base class.");
  const banked = h.porter.xp;
  const trained = trainRecruit(ix, h, classId);
  delete trained.porter;
  roll(t, (rng) => gainXp(ix, trained, banked, rng, built(t)));
  t.roster[t.roster.findIndex((x) => x.id === heroId)] = trained;
  t.porters = (t.porters ?? []).filter((id) => id !== heroId);
  if (t.party.length < partySlots(ix, t)) t.party.push(heroId);
  return t;
}

/**
 * Give a hero their class's usual kit (content/classes/*.ts startingKit):
 * from the store room first, then, if `buy`, from the Market while the gold
 * lasts. Slots they already have filled are left alone.
 */
export function kitOut(ix: Index, town: TownState, heroId: string, buy = true): TownState {
  let t = edit(town);
  const h = hero(t, heroId);
  const stock = shopStock(ix, t);
  const pack = [...h.pack];
  for (const id of ix.cls(h.classId).startingKit) {
    const item = ix.item(id);
    const slot = item.slot as EquipSlot;
    const wearable = (EQUIP_SLOTS as readonly string[]).includes(item.slot);
    if (wearable ? h.equipment[slot] : pack.includes(id)) {
      if (!wearable) pack.splice(pack.indexOf(id), 1);
      continue;
    }
    if (!t.stash.includes(id)) {
      if (!buy || !stock.includes(id) || t.gold < buyPrice(item)) continue;
      book(t, "bought", -buyPrice(item));
      t.stash.push(id);
    }
    t = wearable ? equip(ix, t, heroId, id) : packItem(ix, t, heroId, id);
  }
  return t;
}

/**
 * Sign up all the starting recruits and kit them out from the store room, as
 * a player who wants to get going might ("pick for me"). Classes come from
 * `classIds`, less any already signed, each going to the recruit whose stats
 * suit it best; anyone left over takes the class that suits them.
 */
export function autoStart(
  ix: Index,
  town: TownState,
  classIds: readonly string[] = ix.lib.town.startingRoster,
): TownState {
  const wanted = [...classIds];
  for (const h of town.roster) {
    const i = wanted.indexOf(h.classId);
    if (i >= 0) wanted.splice(i, 1);
  }
  let t = town;
  const sign = (id: string, classId?: string) => {
    t = hire(ix, t, id, classId);
    t = kitOut(ix, t, t.roster.at(-1)!.id, false);
  };
  for (const classId of wanted) {
    const open = t.recruits.filter((r) => r.untrained);
    if (!(t.freeHires > 0) || !open.length) break;
    const best = open.reduce((a, b) =>
      classFit(ix, b.stats, classId) > classFit(ix, a.stats, classId) ? b : a,
    );
    sign(best.id, classId);
  }
  while (t.freeHires > 0 && t.recruits.length) sign(t.recruits[0]!.id);
  return t;
}

/** Let a hero go. The guild keeps the gear it gave them. */
export function dismiss(_ix: Index, town: TownState, heroId: string): TownState {
  const t = edit(town);
  const h = hero(t, heroId);
  for (const slot of EQUIP_SLOTS) if (h.equipment[slot]) t.stash.push(h.equipment[slot]!);
  t.stash.push(...h.pack);
  t.roster = t.roster.filter((x) => x.id !== heroId);
  t.party = t.party.filter((id) => id !== heroId);
  t.porters = (t.porters ?? []).filter((id) => id !== heroId);
  return t;
}

export function buy(ix: Index, town: TownState, itemId: string): TownState {
  if (!shopStock(ix, town).includes(itemId)) throw new TownError("The Market doesn't sell that.");
  const price = buyPrice(ix.item(itemId));
  if (town.gold < price) throw new TownError("Not enough gold.");
  const t = edit(town);
  book(t, "bought", -price);
  t.stash.push(itemId);
  return t;
}

export function sell(ix: Index, town: TownState, itemId: string): TownState {
  const t = edit(town);
  takeFromStash(t, itemId);
  book(t, "sold", sellPrice(ix, ix.item(itemId), haggler(ix, t).bonus));
  return t;
}

/** One potion or bandage to put back in a hero's pack after a trip. */
export interface RestockLine {
  heroId: string;
  item: string;
  /** From the store room (free) or bought at the Market. */
  from: "store" | "market";
  cost: number;
}

/**
 * What the last trip used up (M6): every consumable a hero set off with and
 * came back without, to be taken from the store room or bought again. The
 * player sees this list and okays it. Things nobody sells are left out.
 */
export function restockPlan(ix: Index, town: TownState): RestockLine[] {
  const trip = town.lastTrip;
  if (!trip) return [];
  const stash = [...town.stash];
  const stock = shopStock(ix, town);
  const out: RestockLine[] = [];
  for (const before of trip.party) {
    const h = findHero(town, before.id);
    if (!h) continue;
    const now = [...h.pack];
    let room = heroSheet(ix, h).derived.carrySlots - h.pack.length;
    for (const id of before.pack) {
      const i = now.indexOf(id);
      if (i >= 0) {
        now.splice(i, 1);
        continue;
      }
      if (room <= 0) break;
      const s = stash.indexOf(id);
      if (s >= 0) {
        stash.splice(s, 1);
        out.push({ heroId: h.id, item: id, from: "store", cost: 0 });
      } else if (stock.includes(id)) {
        out.push({ heroId: h.id, item: id, from: "market", cost: buyPrice(ix.item(id)) });
      } else continue;
      room--;
    }
  }
  return out;
}

/** Put used supplies back in packs, buying what the store room doesn't have. */
export function restock(ix: Index, town: TownState, lines: readonly RestockLine[]): TownState {
  const cost = lines.reduce((s, l) => s + l.cost, 0);
  if (cost > town.gold) throw new TownError("Not enough gold for all of that.");
  const t = edit(town);
  for (const l of lines) {
    const h = hero(t, l.heroId);
    if (h.pack.length >= heroSheet(ix, h).derived.carrySlots)
      throw new TownError(`${h.name}'s pack is full.`);
    if (l.from === "store") takeFromStash(t, l.item);
    else book(t, "bought", -buyPrice(ix.item(l.item)));
    h.pack.push(l.item);
  }
  return t;
}

/** Put an item from the store room on a hero. Whatever they had goes back. */
export function equip(ix: Index, town: TownState, heroId: string, itemId: string): TownState {
  const slot = ix.item(itemId).slot;
  if (!(EQUIP_SLOTS as readonly string[]).includes(slot))
    throw new TownError("That can't be worn or wielded.");
  const t = edit(town);
  const h = hero(t, heroId);
  takeFromStash(t, itemId);
  const old = h.equipment[slot as EquipSlot];
  if (old) t.stash.push(old);
  h.equipment[slot as EquipSlot] = itemId;
  return keepHpInBounds(ix, t, h);
}

export function unequip(ix: Index, town: TownState, heroId: string, slot: EquipSlot): TownState {
  const t = edit(town);
  const h = hero(t, heroId);
  const old = h.equipment[slot];
  if (!old) return town;
  t.stash.push(old);
  delete h.equipment[slot];
  return keepHpInBounds(ix, t, h);
}

/** Gear can change max HP and mana; don't leave a hero above their new max. */
function keepHpInBounds(ix: Index, t: TownState, h: Hero): TownState {
  const d = heroSheet(ix, h).derived;
  h.hp = Math.min(h.hp, d.maxHp);
  h.mana = Math.min(h.mana, d.mana);
  return t;
}

/** Hand a consumable from the store room to a hero to carry. */
export function packItem(ix: Index, town: TownState, heroId: string, itemId: string): TownState {
  if (ix.item(itemId).slot !== "consumable") throw new TownError("Only supplies go in packs.");
  const t = edit(town);
  const h = hero(t, heroId);
  if (h.pack.length >= heroSheet(ix, h).derived.carrySlots)
    throw new TownError(`${h.name}'s pack is full.`);
  takeFromStash(t, itemId);
  h.pack.push(itemId);
  return t;
}

export function unpackItem(_ix: Index, town: TownState, heroId: string, index: number): TownState {
  const t = edit(town);
  const h = hero(t, heroId);
  const [item] = h.pack.splice(index, 1);
  if (item) t.stash.push(item);
  return t;
}

export function setRow(_ix: Index, town: TownState, heroId: string, row: Row): TownState {
  const t = edit(town);
  hero(t, heroId).row = row;
  return t;
}

/** Add a hero to the party, or take them out of it. */
export function toggleParty(ix: Index, town: TownState, heroId: string): TownState {
  const t = edit(town);
  const h = hero(t, heroId);
  if (h.porter) {
    const slots = ix.lib.town.porters.slots;
    t.porters ??= [];
    if (t.porters.includes(heroId)) t.porters = t.porters.filter((id) => id !== heroId);
    else if (t.porters.length >= slots)
      throw new TownError(`Only ${slots} porters can go with one party.`);
    else t.porters.push(heroId);
    return t;
  }
  if (t.party.includes(heroId)) {
    t.party = t.party.filter((id) => id !== heroId);
  } else {
    if (t.party.length >= partySlots(ix, t))
      throw new TownError(`The party is full (${partySlots(ix, t)} slots).`);
    t.party.push(heroId);
  }
  return t;
}

export function setOrders(_ix: Index, town: TownState, orders: StandingOrders): TownState {
  return { ...town, orders };
}

/** The saved party in this slot, if there's one on file. */
export const savedParty = (town: TownState, slot: number): SavedParty | undefined =>
  (town.parties ?? [])[slot];

/** Default name for a party slot: Party A, Party B, ... */
export const partyLetter = (slot: number) => `Party ${String.fromCharCode(65 + slot)}`;

/** Keep the current party, porters and orders on file in a slot. */
export function saveParty(ix: Index, town: TownState, slot: number, name?: string): TownState {
  if (slot < 0 || slot >= ix.lib.town.savedParties)
    throw new TownError(`The guild keeps ${ix.lib.town.savedParties} parties on file.`);
  if (!town.party.length) throw new TownError("Pick some heroes first.");
  const t = edit(town);
  t.parties ??= [];
  const { rescue: _, ...orders } = t.orders;
  const old = t.parties[slot];
  while (t.parties.length < slot) t.parties.push(emptyParty(t.parties.length));
  t.parties[slot] = {
    name: name?.trim() || old?.name || partyLetter(slot),
    heroes: [...t.party],
    porters: [...(t.porters ?? [])],
    orders,
  };
  return t;
}

const emptyParty = (slot: number): SavedParty => ({
  name: partyLetter(slot),
  heroes: [],
  porters: [],
  orders: DEFAULT_ORDERS,
});

/** Rename a party on file. */
export function renameParty(_ix: Index, town: TownState, slot: number, name: string): TownState {
  if (!savedParty(town, slot)) throw new TownError("Nothing on file there yet.");
  const t = edit(town);
  t.parties[slot]!.name = name.trim() || partyLetter(slot);
  return t;
}

/** Who from a party on file is still with the guild (the dead, lost and departed drop out). */
export function partyOnFile(town: TownState, slot: number): { heroes: Hero[]; porters: Hero[] } {
  const p = savedParty(town, slot);
  const get = (ids: readonly string[]) =>
    ids.map((id) => findHero(town, id)).filter((h): h is Hero => !!h);
  return { heroes: get(p?.heroes ?? []), porters: get(p?.porters ?? []).filter((h) => !!h.porter) };
}

/**
 * Make a party on file the next party: its heroes, porters and orders. Anyone
 * no longer with the guild is left out. A rescue run already planned stays planned.
 */
export function pickParty(ix: Index, town: TownState, slot: number): TownState {
  const p = savedParty(town, slot);
  if (!p) throw new TownError("Nothing on file there yet.");
  const { heroes, porters } = partyOnFile(town, slot);
  if (!heroes.length) throw new TownError(`Nobody from ${p.name} is still with the guild.`);
  const t = edit(town);
  t.party = heroes
    .filter((h) => !h.porter)
    .slice(0, partySlots(ix, t))
    .map((h) => h.id);
  t.porters = porters.slice(0, ix.lib.town.porters.slots).map((h) => h.id);
  const rescue = t.orders.rescue;
  t.orders = { ...p.orders, ...(rescue ? { rescue } : {}) };
  if (rescue) {
    const site = t.sites.find((s) => s.id === rescue);
    if (site) t.orders.targetFloor = Math.max(t.orders.targetFloor, site.floor);
  }
  return t;
}

/** Make the next trip a rescue run to a lost party's site (DESIGN.md §10). */
export function planRescue(_ix: Index, town: TownState, siteId: string): TownState {
  const site = town.sites.find((s) => s.id === siteId);
  if (!site) throw new TownError("Nobody is waiting there any more.");
  return {
    ...town,
    orders: {
      ...town.orders,
      rescue: site.id,
      targetFloor: Math.max(town.orders.targetFloor, site.floor),
    },
  };
}

/** Back to an ordinary trip. */
export function cancelRescue(_ix: Index, town: TownState): TownState {
  const { rescue: _, ...orders } = town.orders;
  return { ...town, orders };
}

/**
 * Put a hero's oldest level-up into a class (DESIGN.md §9): one they have, or
 * a new one they meet the requirements for. Its stat gains come in now and
 * the perk offers are rolled. There's no taking it back.
 */
export function chooseLevelClass(
  ix: Index,
  town: TownState,
  heroId: string,
  classId: string,
): TownState {
  const t = edit(town);
  const h = hero(t, heroId);
  const isNew = !(h.classes ?? {})[classId];
  try {
    roll(t, (rng) => chooseClass(ix, h, classId, rng, built(t)));
  } catch (e) {
    throw new TownError((e as Error).message);
  }
  if (isNew) news(t, `${h.name} has started training as a ${ix.cls(classId).name}.`, "good");
  return keepHpInBounds(ix, t, h);
}

/**
 * Spend a hero's oldest level-up (DESIGN.md §9): learn one of the perks on
 * offer and, every few levels, add a free stat point. Granting the perk they
 * wanted cheers them up.
 */
export function chooseLevelUp(
  ix: Index,
  town: TownState,
  heroId: string,
  perk: string | undefined,
  stat?: Stat,
): TownState {
  const t = edit(town);
  const h = hero(t, heroId);
  let wanted = false;
  try {
    wanted = roll(t, (rng) => spendLevelUp(ix, h, perk, stat, rng, built(t))).wanted;
  } catch (e) {
    throw new TownError((e as Error).message);
  }
  if (wanted) applyMorale(ix, h, { wantedPerk: 1 }, t.day);
  return keepHpInBounds(ix, t, h);
}

/** The next level of a building, if there is one. */
export function nextLevel(ix: Index, town: TownState, buildingId: string) {
  const def = ix.building(buildingId);
  const level = town.buildings[buildingId] ?? 0;
  return def.levels[level];
}

/** The work going on at a building, if any. */
export const underConstruction = (town: TownState, buildingId: string) =>
  town.construction.find((c) => c.building === buildingId);

/**
 * Pay for the next level and set the builders to work. It takes the level's
 * `days` to finish; until then the building works at its old level. One job
 * per building at a time, but different buildings can go up together.
 */
export function upgrade(ix: Index, town: TownState, buildingId: string): TownState {
  const next = nextLevel(ix, town, buildingId);
  if (!next) throw new TownError("It can't be built any bigger yet.");
  if (underConstruction(town, buildingId)) throw new TownError("The builders are already at it.");
  if (town.damaged.includes(buildingId)) throw new TownError("Repair it first.");
  if (town.gold < next.cost) throw new TownError("Not enough gold.");
  const t = edit(town);
  book(t, "built", -next.cost);
  const level = (t.buildings[buildingId] ?? 0) + 1;
  if (next.days <= 0) t.buildings[buildingId] = level;
  else t.construction.push({ building: buildingId, level, daysLeft: next.days, started: t.day });
  return t;
}

/**
 * Heroes resting in town who can lend the builders a hand (not away, not
 * injured, not knocked out), and how many days of work they add each day
 * between them (content/town.ts `helpers`).
 */
export function builderHands(
  ix: Index,
  town: TownState,
  away: ReadonlySet<string> = new Set(),
): { heroes: Hero[]; work: number } {
  const rules = ix.lib.town.helpers;
  const heroes = town.roster.filter(
    (h) => !away.has(h.id) && h.condition === "ok" && h.hp > 0 && !h.injuries?.length,
  );
  const raw = heroes.reduce(
    (s, h) => s + rules.perHero * Math.max(0, 1 + (h.stats.STR - 10) * rules.perStr),
    0,
  );
  return { heroes, work: Math.min(rules.maxPerDay, raw) };
}

/**
 * A day's building work: a day off every job, plus whatever the heroes at
 * home add, oldest job first. Finished jobs take effect straight away.
 */
function buildersWork(ix: Index, t: TownState, away: ReadonlySet<string>): void {
  let extra = t.construction.length ? builderHands(ix, t, away).work : 0;
  for (const c of t.construction) {
    c.daysLeft -= 1;
    if (extra > 0 && c.daysLeft > 0) {
      const banked = (c.helped ?? 0) + extra;
      const whole = Math.min(c.daysLeft, Math.floor(banked + 1e-9));
      c.daysLeft -= whole;
      c.helped = c.daysLeft > 0 ? banked - whole : 0;
      extra = 0;
    }
    if (c.daysLeft <= 0) t.buildings[c.building] = c.level;
  }
  t.construction = t.construction.filter((c) => c.daysLeft > 0);
}

/** Fix a raid-damaged building so it works again. */
export function repair(ix: Index, town: TownState, buildingId: string): TownState {
  if (!town.damaged.includes(buildingId)) throw new TownError("It isn't damaged.");
  const cost = repairCost(ix, town, buildingId);
  if (town.gold < cost) throw new TownError("Not enough gold.");
  const t = edit(town);
  book(t, "repairs", -cost);
  t.damaged = t.damaged.filter((id) => id !== buildingId);
  return t;
}

/** One day's rest in town: wounds mend, mana comes back, downed heroes get up. */
function restHero(ix: Index, h: Hero, days: number): void {
  if (days <= 0 || h.condition === "dead") return;
  const d = heroSheet(ix, h).derived;
  const per = Math.ceil((d.maxHp * ix.lib.town.restPercent) / 100);
  h.hp = Math.min(d.maxHp, Math.max(h.hp, 0) + per * days);
  h.mana = d.mana;
  h.condition = "ok";
  h.fatigue = Math.max(0, (h.fatigue ?? 0) - ix.lib.wear.restPerDay * days);
}

/** Wounds knit a day at a time in town. Returns the names of injuries that healed. */
function healInjuries(ix: Index, h: Hero): string[] {
  const healed: string[] = [];
  h.injuries = (h.injuries ?? []).filter((inj) => {
    inj.days -= 1;
    if (inj.days > 0) return true;
    healed.push(ix.injury(inj.id).name.toLowerCase());
    return false;
  });
  return healed;
}

/** The lowest share of max HP a hero fell to in this log (1 if never hit). */
function lowestHp(log: readonly ExpeditionEvent[], heroId: string): number {
  let low = 1;
  for (const e of log) {
    const hp = e.combat?.hp;
    if (hp?.uid === heroId && hp.max > 0) low = Math.min(low, hp.hp / hp.max);
  }
  return low;
}

/** Was this hero knocked down at any point in this log? */
const wasDowned = (log: readonly ExpeditionEvent[], heroId: string) =>
  log.some((e) => e.combat?.kind === "downed" && e.combat.target === heroId);

/**
 * A hero who was knocked down (or came home badly hurt, with a smaller
 * `base` chance) may pick up an injury (content/wear.ts, content/injuries/).
 * END helps. Returns the injury id, if any.
 */
function maybeInjure(
  ix: Index,
  t: TownState,
  h: Hero,
  base = ix.lib.wear.injuryChance,
): string | undefined {
  const w = ix.lib.wear;
  const end = heroSheet(ix, h).stats.END;
  const chance = Math.max(0, Math.min(1, base - (end - 10) * w.injuryPerEnd));
  const id = roll(t, (rng) => {
    if (!rng.chance(chance)) return undefined;
    const pool = ix.lib.injuries.filter((i) => !(h.injuries ?? []).some((x) => x.id === i.id));
    if (!pool.length) return undefined;
    let r = rng.next() * pool.reduce((s, i) => s + i.weight, 0);
    for (const i of pool) if ((r -= i.weight) < 0) return i.id;
    return pool.at(-1)!.id;
  });
  if (!id) return undefined;
  h.injuries = [...(h.injuries ?? []), { id, days: ix.injury(id).days }];
  const max = heroSheet(ix, h).derived.maxHp;
  h.hp = Math.min(h.hp, max);
  return id;
}

/**
 * Night falls on day `t.day`: the dungeon breeds and pushes up, and whatever
 * climbs out of the pit meets the defences. Heroes in `away` are out on a
 * trip and can't help. Returns the raid, if anything got past the defences.
 */
function nightfall(ix: Index, t: TownState, away: ReadonlySet<string>): RaidReport | undefined {
  const { dungeon, day } = dungeonDay(ix, t.dungeon);
  t.dungeon = dungeon;
  const targets = ix.lib.buildings
    .filter((b) => !b.raidProof && (t.buildings[b.id] ?? 0) > 0 && !t.damaged.includes(b.id))
    .map((b) => b.id);
  const home = t.roster.filter((h) => !away.has(h.id));
  const raid = roll(t, (rng) =>
    resolveRaid(
      ix,
      {
        day: t.day,
        climbed: day.overflow.count,
        level: day.overflow.level,
        strength: day.strength,
        defence: defence(ix, t),
        home,
        // The Vault keeps some of the gold out of reach.
        gold: Math.floor((t.gold * (100 - vaultShare(ix, t))) / 100),
        targets,
      },
      rng,
    ),
  );
  t.pit = [
    ...t.pit,
    {
      day: t.day,
      climbed: raid.climbed,
      level: raid.level,
      strength: raid.strength,
      defence: raid.defence,
      outcome: raid.outcome,
    },
  ].slice(-PIT_HISTORY);
  if (raid.outcome === "held") return undefined;

  // Defenders come back from the fight hurt, or not at all. Those who saw
  // raiders off learn from it.
  const raiderPower = raid.raiders.reduce((s, id) => s + ix.monster(id).power, 0);
  const share = raid.raiders.length ? (raiderPower * raid.kills) / raid.raiders.length : 0;
  const standingDefenders = raid.after.filter((h) => h.condition !== "dead");
  const xpEach = standingDefenders.length
    ? (share * ix.lib.levels.xpPerPower * ix.lib.levels.raidXpShare) / standingDefenders.length
    : 0;
  let died = 0;
  for (const after of raid.after) {
    const i = t.roster.findIndex((h) => h.id === after.id);
    if (i < 0) continue;
    const rec = t.records[after.id];
    if (rec) rec.kills += raid.heroKills[after.id] ?? 0;
    if (after.condition === "dead") {
      died++;
      // The fallen are carried indoors: their gear goes to the store room,
      // their body waits for the Temple or the Graveyard.
      t.stash.push(...gearOf(ix, after).map((g) => g.item));
      t.bodies.push(newBody(t, after, t.day, 0));
      t.memorial.push({
        heroId: after.id,
        name: after.name,
        classId: after.classId,
        day: t.day,
        floor: 0,
        fate: "dead",
        cause: "raid",
        record: rec ?? newRecord(t.day),
      });
      t.roster.splice(i, 1);
      t.party = t.party.filter((id) => id !== after.id);
    } else {
      const h = structuredClone(after);
      const levels = roll(t, (rng) => gainXp(ix, h, xpEach, rng, built(t)));
      if (levels) applyMorale(ix, h, { levelUp: levels }, t.day);
      if (wasDowned(raid.log, h.id)) {
        const inj = maybeInjure(ix, t, h);
        if (inj) {
          applyMorale(ix, h, { injured: 1 }, t.day);
          news(
            t,
            `${h.name} took a ${ix.injury(inj).name.toLowerCase()} defending the town.`,
            "bad",
          );
        }
      }
      t.roster[i] = h;
    }
  }
  if (died) guildFeels(ix, t, { fallenComrades: died }, new Set());
  book(t, "stolen", -raid.goldStolen);
  t.damaged = [...t.damaged, ...raid.damaged];
  t.raids = [...t.raids, raid].slice(-RAID_HISTORY);
  return raid;
}

/** A day in town for a hero who isn't away: morale from the town, and training. */
function dayInTown(ix: Index, t: TownState, h: Hero): void {
  const healed = healInjuries(ix, h);
  if (healed.length)
    news(
      t,
      `${h.name}'s ${listWords(healed)} ${healed.length > 1 ? "have" : "has"} healed.`,
      "good",
    );
  const fav = standing(t, h.favourite);
  applyMorale(
    ix,
    h,
    {
      restDay: 1,
      favouriteBuilt: fav ? 1 : 0,
      favouriteMissing: fav ? 0 : 1,
      restMorale: restMorale(ix, t),
    },
    t.day,
  );
  const xp = trainingXp(ix, t);
  if (xp) {
    const levels = roll(t, (rng) => gainXp(ix, h, xp, rng, built(t)));
    if (levels) {
      applyMorale(ix, h, { levelUp: levels }, t.day);
      news(t, `${h.name} reached level ${h.level} in the Training Yard.`, "good");
    }
  }
}

/** A hero quits: they keep what they're wearing, and leave the rest (DESIGN.md decision 4). */
function quit(ix: Index, t: TownState, h: Hero): void {
  const took = EQUIP_SLOTS.map((s) => h.equipment[s]).filter((id): id is string => !!id);
  t.stash.push(...h.pack);
  t.roster = t.roster.filter((x) => x.id !== h.id);
  t.party = t.party.filter((id) => id !== h.id);
  t.porters = (t.porters ?? []).filter((id) => id !== h.id);
  t.departed.push({ name: h.name, classId: h.classId, day: t.day, took });
  const gear = took.map((id) => ix.item(id).name.toLowerCase());
  news(
    t,
    `${h.name} has had enough and quits the guild${gear.length ? `, taking their ${listWords(gear)}` : ""}.`,
    "bad",
  );
}

/** Anyone at 0 morale walks out. Returns their names. */
function quitters(ix: Index, t: TownState): string[] {
  const out: string[] = [];
  for (const h of [...t.roster]) {
    if (h.morale > 0) continue;
    quit(ix, t, h);
    out.push(h.name);
  }
  return out;
}

const listWords = (items: string[]) =>
  items.length > 1 ? `${items.slice(0, -1).join(", ")} and ${items.at(-1)}` : (items[0] ?? "");

/** Everyone in town takes a piece of news to heart (deaths, rescues, the abandoned). */
function guildFeels(ix: Index, t: TownState, facts: Facts, except: ReadonlySet<string>): void {
  for (const h of t.roster) if (!except.has(h.id)) applyMorale(ix, h, facts, t.day);
}

/**
 * A night passes at the lost parties' sites: the trapped hold on or don't,
 * and monsters carry off what they can.
 */
function sitesNight(ix: Index, t: TownState): void {
  const rules = ix.lib.rescue;
  for (const site of t.sites) {
    for (const x of site.trapped.filter((x) => x.until < t.day)) {
      site.trapped = site.trapped.filter((y) => y !== x);
      site.items.push(...gearOf(ix, x.hero));
      site.bodies.push(newBody(t, x.hero, t.day, site.floor));
      t.memorial.push({
        heroId: x.hero.id,
        name: x.hero.name,
        classId: x.hero.classId,
        day: t.day,
        floor: site.floor,
        fate: "dead",
        record: t.records[x.hero.id] ?? newRecord(t.day),
      });
      news(t, `Nobody came for ${x.hero.name}. They died waiting on floor ${site.floor}.`, "bad");
      guildFeels(ix, t, { abandoned: 1 }, new Set());
    }
    // The dead who lie too long get up again.
    for (const b of [...site.bodies]) {
      if (b.risen || t.day - b.died < ix.lib.fallen.riseDays) continue;
      site.bodies = site.bodies.filter((x) => x !== b);
      rise(ix, t, site, b);
    }
    const population = t.dungeon.floors[site.floor - 1]?.population ?? 0;
    if (population <= 0 || !site.items.length) continue;
    const kept: HaulItem[] = [];
    for (const it of site.items) {
      if (!roll(t, (rng) => rng.chance(rules.scavengeChance))) {
        kept.push(it);
        continue;
      }
      if (it.keep) {
        t.scavenged.push({
          id: `g${t.nextThingId++}`,
          item: it.item,
          owner: it.owner,
          floor: site.floor,
        });
      }
    }
    site.items = kept;
  }
  t.sites = t.sites.filter((s) => s.trapped.length || s.items.length || s.bodies.length);
  if (t.orders.rescue && !rescueSite(t)) t.orders = cancelRescue(ix, t).orders;
  risenClimb(ix, t);
}

/** A body taken from where it lies, for the town's lists. */
function newBody(t: TownState, h: Hero, day: number, floor: number): Body {
  return makeBody(`b${t.nextThingId++}`, h, day, floor);
}

/**
 * A body left in the dungeon rises (DESIGN.md §10): it picks up whatever of
 * its own gear still lies there and joins the floor's monsters.
 */
function rise(ix: Index, t: TownState, site: LostSite, b: Body): void {
  const equipment: Risen["equipment"] = {};
  for (const slot of EQUIP_SLOTS) {
    const id = b.gear[slot];
    const i = site.items.findIndex((it) => it.keep && it.owner === b.hero.name && it.item === id);
    if (!id || i < 0) continue;
    equipment[slot] = id;
    site.items.splice(i, 1);
  }
  const r: Risen = {
    id: `r${t.nextThingId++}`,
    body: b,
    equipment,
    floor: site.floor,
    rose: t.day,
  };
  t.risen = [...(t.risen ?? []), r];
  for (const m of t.memorial) if (m.heroId === b.hero.id) m.risen = true;
  news(
    t,
    `${b.hero.name}'s body was never brought home. Something wearing their face walks floor ${site.floor} now: ${risenName(ix, r)}.`,
    "bad",
  );
  guildFeels(ix, t, { comradeRose: 1 }, new Set());
}

/** Like any monster, the risen push up towards the pit (DESIGN.md §4). */
function risenClimb(ix: Index, t: TownState): void {
  for (const r of t.risen ?? []) {
    const days = t.day - r.rose;
    if (r.floor <= 1 || days <= 0 || days % ix.lib.fallen.climbDays) continue;
    r.floor -= 1;
    news(t, `${risenName(ix, r)} has been seen on floor ${r.floor}, closer to the pit.`, "bad");
  }
}

/** What the Temple would ask to bring this body back, or why it can't. */
export function resurrectQuote(
  ix: Index,
  town: TownState,
  bodyId: string,
): { terms?: ResurrectTerms; why?: string } {
  const b = (town.bodies ?? []).find((x) => x.id === bodyId);
  if (!b) return { why: "That body isn't in town." };
  if (b.risen) return { why: `${b.hero.name} rose once already. All that's left is to bury them.` };
  const e = effects(ix, town).find((x) => x.type === "resurrect");
  if (!e) return { why: "You need a working Temple to bring anyone back." };
  const terms = resurrectTerms(e, b.hero);
  if (town.roster.length >= rosterSize(ix, town))
    return { terms, why: "The guild has no room on the roster." };
  if (town.gold < terms.gold) return { terms, why: `The priests want ${terms.gold} gold.` };
  return { terms };
}

/**
 * Bring a hero back from the dead at the Temple (DESIGN.md §10). They lose
 * their most recent levels (each comes back as it was when the XP is earned
 * again), come back weak and shaken, and rejoin the roster with no gear.
 */
export function resurrect(ix: Index, town: TownState, bodyId: string): TownState {
  const { terms, why } = resurrectQuote(ix, town, bodyId);
  if (why || !terms) throw new TownError(why ?? "The priests can't help.");
  const t = edit(town);
  const b = t.bodies.find((x) => x.id === bodyId)!;
  book(t, "temple", -terms.gold);
  const h = structuredClone(b.hero);
  const lost = loseLevels(ix, h, terms.levels);
  h.condition = "ok";
  h.mana = 0;
  h.injuries = [];
  h.fatigue = 0;
  h.raiseAsk = undefined;
  h.hp = Math.max(1, Math.round((maxHp(ix, h) * ix.lib.fallen.resurrectedHpPercent) / 100));
  applyMorale(ix, h, { resurrected: 1 }, t.day);
  t.roster.push(h);
  t.bodies = t.bodies.filter((x) => x !== b);
  t.memorial = t.memorial.filter((m) => m.heroId !== h.id);
  t.records[h.id] ??= newRecord(t.day);
  news(
    t,
    `${h.name} is back from the dead${lost ? `, ${lost} level${lost > 1 ? "s" : ""} poorer` : ""}.`,
    "good",
  );
  guildFeels(ix, t, { rescuedComrades: 1 }, new Set([h.id]));
  return t;
}

/** Gold to bury someone, or undefined without a working Graveyard. */
export function burialCost(ix: Index, town: TownState): number | undefined {
  const e = effects(ix, town).find((x) => x.type === "burial");
  return e?.gold;
}

/** Lay a body to rest in the Graveyard (DESIGN.md §10). The whole guild takes heart. */
export function bury(ix: Index, town: TownState, bodyId: string): TownState {
  const cost = burialCost(ix, town);
  if (cost === undefined) throw new TownError("You need a working Graveyard to bury anyone.");
  if (town.gold < cost) throw new TownError(`A burial costs ${cost} gold.`);
  const t = edit(town);
  const b = (t.bodies ?? []).find((x) => x.id === bodyId);
  if (!b) throw new TownError("That body isn't in town.");
  book(t, "burials", -cost);
  t.bodies = t.bodies.filter((x) => x !== b);
  for (const m of t.memorial) if (m.heroId === b.hero.id) m.buried = t.day;
  news(t, `${b.hero.name} was laid to rest in the Graveyard.`, "good");
  guildFeels(ix, t, { buriedComrade: 1 }, new Set());
  return t;
}

/** A hero's gear as items lying where they fell: it goes back to the store room, not the Market. */
function gearOf(ix: Index, h: Hero): HaulItem[] {
  const ids = [
    ...EQUIP_SLOTS.map((s) => h.equipment[s]).filter((id): id is string => !!id),
    ...h.pack,
  ];
  return ids.map((id) => {
    const v = ix.item(id).value;
    return { item: id, value: v, estimate: v, keep: true, owner: h.name };
  });
}

/**
 * Pay the day's wages, in roster order, while the gold lasts. Anyone who
 * can't be paid takes it badly (the "unpaid" morale fact).
 */
function payWages(ix: Index, t: TownState): void {
  const unpaid: Hero[] = [];
  for (const h of t.roster) {
    const w = wage(ix, h);
    if (t.gold >= w) book(t, "wages", -w);
    else unpaid.push(h);
  }
  if (!unpaid.length) return;
  for (const h of unpaid) applyMorale(ix, h, { unpaid: 1 }, t.day);
  news(t, `The guild couldn't pay ${listWords(unpaid.map((h) => h.name))} today.`, "bad");
}

/**
 * Veterans ask for raises (M6, content/town.ts `raises`). A hero who has
 * gained enough levels since their last raise talk asks; one who's been kept
 * waiting too long takes it as a no.
 */
function raiseTalk(ix: Index, t: TownState): void {
  const r = ix.lib.town.raises;
  for (const h of t.roster) {
    if (h.raiseAsk) {
      if (t.day - h.raiseAsk.day >= r.patienceDays) {
        h.raiseAsk = undefined;
        h.payLevel = h.level;
        applyMorale(ix, h, { raiseRefused: 1 }, t.day);
        news(t, `${h.name} gave up waiting for an answer about a raise.`, "bad");
      }
      continue;
    }
    if (h.level < (h.payLevel ?? 1) + r.everyLevels) continue;
    const amount = r.amount * (h.motivation === "gold" ? 2 : 1);
    h.raiseAsk = { amount, day: t.day };
    news(t, `${h.name} (level ${h.level}) asks for a raise of ${amount} gold a day.`);
  }
}

/** Say yes or no to a hero's request for a raise. */
export function answerRaise(ix: Index, town: TownState, heroId: string, agree: boolean): TownState {
  const t = edit(town);
  const h = hero(t, heroId);
  if (!h.raiseAsk) throw new TownError(`${h.name} hasn't asked for a raise.`);
  if (agree) h.pay = (h.pay ?? 0) + h.raiseAsk.amount;
  h.raiseAsk = undefined;
  h.payLevel = h.level;
  applyMorale(ix, h, agree ? { raiseGiven: 1 } : { raiseRefused: 1 }, t.day);
  return t;
}

/** The end of a day in town: wages, builders, rest, morale, the lost, and anyone who's had enough. */
function endOfDay(ix: Index, t: TownState, away: ReadonlySet<string>): void {
  // Anyone already at the end of their tether goes before the day starts.
  quitters(ix, t);
  payWages(ix, t);
  raiseTalk(ix, t);
  t.day += 1;
  buildersWork(ix, t, away);
  for (const h of t.roster) {
    if (away.has(h.id)) continue;
    restHero(ix, h, 1);
    dayInTown(ix, t, h);
  }
  sitesNight(ix, t);
  quitters(ix, t);
  // Nobody who has left the guild stays picked (this also mends saves from
  // before quitting porters were taken off the porter list).
  t.party = t.party.filter((id) => findHero(t, id));
  t.porters = (t.porters ?? []).filter((id) => findHero(t, id));
}

/** Spend a day in town. Everyone heals, night falls, and new recruits turn up. */
export function rest(ix: Index, town: TownState, names: readonly string[]): TownState {
  const t = edit(town);
  nightfall(ix, t, new Set());
  endOfDay(ix, t, new Set());
  freshRecruits(ix, t, names);
  return t;
}

// ---------------------------------------------------------------------------
// Launch: send the party down and deal with whatever comes back.
// ---------------------------------------------------------------------------

/**
 * Send the party. The whole trip is simulated now; the UI then plays back
 * `lastTrip.result.log`. The town already reflects the outcome, so there's
 * nothing the player can change while watching (DESIGN.md §1: you can only watch).
 */
export function launch(ix: Index, town: TownState, names: readonly string[]): TownState {
  const why = cantLaunch(ix, town);
  if (why) throw new TownError(why);
  const t = edit(town);
  const party = structuredClone(t.party.map((id) => hero(t, id)));
  const porters = structuredClone((t.porters ?? []).map((id) => hero(t, id)));
  const seed = roll(t, (rng) => rng.int(0, 2 ** 31 - 1));
  const startDay = t.day;

  // A rescue run: who's still alive when the party gets there (a floor a day).
  const site = rescueSite(t);
  const visit: SiteVisit | undefined = site && {
    id: site.id,
    floor: site.floor,
    room: site.room,
    trapped: site.trapped.filter((x) => x.until >= startDay + site.floor - 1).map((x) => x.hero),
    bodies: site.bodies ?? [],
    items: site.items,
  };
  const gear: Record<number, ScavengedGear[]> = {};
  for (const g of t.scavenged) (gear[g.floor] ??= []).push(g);

  const risenBefore = new Map((t.risen ?? []).map((r) => [r.id, r]));
  const result = runExpedition(ix, party, t.orders, seed, t.dungeon.floors, {
    site: visit,
    gear,
    porters,
    risen: t.risen ?? [],
  });
  const wiped = result.outcome === "wiped";
  const backDay = startDay + result.days;

  // Who killed what.
  const kills: Record<string, number> = {};
  for (const e of result.log) {
    const c = e.combat;
    if (c?.kind === "killed" && c.actor && party.some((h) => h.id === c.actor))
      kills[c.actor] = (kills[c.actor] ?? 0) + 1;
  }

  // The Market pays the real value for the haul, whatever the party guessed,
  // less its cut, which the guild's best haggler talks down. The party is
  // still in town's roster as it left, so they can do the haggling (unless
  // they didn't make it back).
  const back = (h: Hero) =>
    !t.party.includes(h.id) ||
    (!wiped && result.party.some((p) => p.id === h.id && p.condition !== "dead"));
  const haggle = haggler(ix, { ...t, roster: t.roster.filter(back) });
  // Heroes' own gear goes back in the store room.
  const recovered = result.haul.filter((h) => h.keep);
  const goldEarned = [...result.haul, ...result.porterHaul]
    .filter((h) => !h.keep)
    .reduce((s, h) => s + haulPrice(ix, h.item, h.value, haggle.bonus), 0);
  book(t, "haul", goldEarned);
  const hiddenGold = result.haul
    .filter((h) => h.hidden && !h.keep)
    .reduce((s, h) => s + haulPrice(ix, h.item, h.value, haggle.bonus), 0);
  const tally = t.secrets ?? { found: 0, missed: 0, gold: 0 };
  t.secrets = {
    found: tally.found + result.secrets.found,
    missed: tally.missed + result.secrets.missed,
    gold: tally.gold + hiddenGold,
  };
  t.stash.push(...recovered.map((h) => h.item));
  t.scavenged = t.scavenged.filter((g) => !result.gearTaken.includes(g.id));

  // Experience: kills shared by everyone still alive, plus a little per floor.
  const killPower = result.kills.reduce((s, id) => s + ix.monster(id).power, 0);
  const living = result.party.filter((h) => h.condition !== "dead");
  const bonus = 1 + xpBonus(ix, t) / 100;
  const xpEach = living.length
    ? ((killPower * ix.lib.levels.xpPerPower) / living.length +
        ix.lib.levels.xpPerFloor * result.deepestFloor) *
      bonus
    : 0;
  const xp: Record<string, number> = {};
  const levels: Record<string, number> = {};
  for (const h of living) {
    xp[h.id] = Math.round(xpEach);
    levels[h.id] = roll(t, (rng) => gainXp(ix, h, xpEach, rng, built(t)));
  }

  // The rescued walk home with the party, unless the party fell too.
  const rescued = wiped ? [] : result.rescued;
  const fallenOnTrip = [...result.party, ...(wiped ? result.rescued : [])];

  // Where the party fell: the dead lie there with their gear; the rest may be
  // trapped, alive, waiting for a rescue party.
  const trappedNames: string[] = [];
  let lostSite: LostSite | undefined;
  if (wiped) {
    lostSite = {
      id: `s${t.nextThingId++}`,
      floor: result.wipeSite?.floor ?? result.deepestFloor,
      room: result.wipeSite?.room ?? 1,
      day: backDay,
      trapped: [],
      bodies: [],
      items: [...result.leftBehind],
    };
  }

  const away = new Set([...t.party, ...porters.map((p) => p.id)]);
  let fallen = 0;
  for (const after of fallenOnTrip) {
    const rec = t.records[after.id] ?? newRecord(startDay);
    if (party.some((h) => h.id === after.id)) {
      rec.trips += 1;
      rec.kills += kills[after.id] ?? 0;
      rec.deepest = Math.max(rec.deepest, result.deepestFloor);
      for (const m of result.seen) if (!rec.seen.includes(m)) rec.seen.push(m);
    }
    t.records[after.id] = rec;
    const dead = after.condition === "dead";
    if (!dead && !wiped) continue;
    fallen++;
    t.roster = t.roster.filter((h) => h.id !== after.id);
    if (!dead && lostSite) {
      const end = heroSheet(ix, after).stats.END;
      const rs = ix.lib.rescue;
      const chance = Math.max(0.05, Math.min(0.95, rs.survival + (end - 10) * rs.survivalPerEnd));
      if (roll(t, (rng) => rng.chance(chance))) {
        lostSite.trapped.push({ hero: structuredClone(after), until: backDay + rs.windowDays - 1 });
        trappedNames.push(after.name);
        continue;
      }
    }
    t.memorial.push({
      heroId: after.id,
      name: after.name,
      classId: after.classId,
      day: backDay,
      floor: lostSite?.floor ?? result.deepestFloor,
      fate: "dead",
      record: rec,
    });
    if (lostSite) {
      lostSite.items.push(...gearOf(ix, after));
      lostSite.bodies.push(newBody(t, after, backDay, lostSite.floor));
    } else {
      // The party brings a fallen friend home, and their gear.
      t.stash.push(...gearOf(ix, after).map((g) => g.item));
      t.bodies.push(newBody(t, after, backDay, 0));
    }
  }
  // Bodies the party picked up: home with it, or lying where it fell.
  for (const b of result.bodies) {
    if (lostSite) lostSite.bodies.push({ ...b, floor: lostSite.floor });
    else t.bodies.push({ ...b, floor: 0 });
  }
  if (!wiped && result.bodies.length)
    news(t, `The party carried home ${listWords(result.bodies.map((b) => b.hero.name))}.`, "good");
  for (const id of result.risenSlain) {
    const r = risenBefore.get(id);
    if (r) news(t, `${risenName(ix, r)} was put down on floor ${r.floor}.`, "good");
  }
  t.risen = (t.risen ?? []).filter((r) => !result.risenSlain.includes(r.id));
  if (lostSite && (lostSite.trapped.length || lostSite.items.length || lostSite.bodies.length))
    t.sites.push(lostSite);

  // A rescue run: take the freed heroes and the gear off the site.
  if (result.siteVisited) {
    const s = t.sites.find((x) => x.id === result.siteVisited);
    if (s) {
      const freed = new Set(result.rescued.map((h) => h.id));
      s.trapped = s.trapped.filter((x) => !freed.has(x.hero.id));
      s.items = result.siteLeft;
      s.bodies = [];
    }
  }
  for (const h of rescued) {
    const rec = t.records[h.id] ?? newRecord(startDay);
    t.records[h.id] = rec;
    t.roster.push(structuredClone(h));
  }

  // Back home: the party's heroes, as they came out of the pit.
  for (const after of result.party) {
    if (after.condition === "dead" || wiped) continue;
    const i = t.roster.findIndex((h) => h.id === after.id);
    t.roster[i] = structuredClone(after);
  }

  // Wear and tear: the trip tires everyone out, and a hero who was knocked
  // down may bring home an injury.
  const fights = result.log.filter((e) => e.kind === "fight" && e.monsters).length;
  const tiredBy =
    ix.lib.wear.fatiguePerTripDay * result.days + ix.lib.wear.fatiguePerFight * fights;
  const injuries: Record<string, string[]> = {};
  const fatigue: Record<string, number> = {};
  for (const before of party) {
    const h = findHero(t, before.id);
    if (!h) continue;
    h.fatigue = Math.min(100, (h.fatigue ?? 0) + tiredBy);
    fatigue[h.id] = h.fatigue;
    const downed = wasDowned(result.log, h.id);
    const wounded = lowestHp(result.log, h.id) < ix.lib.wear.woundedBelow;
    if (downed || wounded) {
      const w = ix.lib.wear;
      const inj = maybeInjure(ix, t, h, downed ? w.injuryChance : w.woundedInjuryChance);
      if (inj) injuries[h.id] = [inj];
    }
  }

  // Porters: they watched the fights and bank some XP for when they train.
  // After a wipe, the ones who didn't make it home are gone.
  for (const run of result.porters) {
    const p = findHero(t, run.id);
    if (!p?.porter) continue;
    const rec = t.records[p.id] ?? newRecord(startDay);
    rec.trips += 1;
    rec.deepest = Math.max(rec.deepest, result.deepestFloor);
    t.records[p.id] = rec;
    if (!run.home) {
      t.roster = t.roster.filter((h) => h.id !== p.id);
      t.memorial.push({
        name: p.name,
        classId: p.classId,
        day: backDay,
        floor: lostSite?.floor ?? result.deepestFloor,
        fate: "dead",
        record: rec,
      });
      fallen++;
      continue;
    }
    p.porter.watched += fights;
    p.porter.xp += Math.round(xpEach * ix.lib.town.porters.xpShare);
    p.fatigue = Math.min(100, (p.fatigue ?? 0) + tiredBy);
    fatigue[p.id] = p.fatigue;
  }
  if (wiped) {
    const ran = result.porters.filter((r) => r.home).map((r) => r.name);
    if (ran.length)
      news(
        t,
        `${listWords(ran)} ran back from floor ${lostSite?.floor ?? result.deepestFloor} with news of the party` +
          `${result.porterHaul.length ? " and what loot they could carry" : ""}.`,
        "bad",
      );
  }

  // How everyone feels about it (DESIGN.md §6).
  const morale: Record<string, { amount: number; reason: string }[]> = {};
  const leaderCha = Math.max(10, ...party.map((h) => heroSheet(ix, h).stats.CHA));
  const share = goldEarned / party.length;
  // Alignment (DESIGN.md §7): clashes cost morale for every day down there.
  const tripDays = Math.max(1, result.days);
  const aligned = partyAlignment(ix, party);
  // Risen guild mates each hero knew (they'd joined by the day the risen died).
  const knewRisen = (h: Hero) =>
    result.risenMet.filter((id) => {
      const r = risenBefore.get(id);
      return !!r && (town.records[h.id]?.joined ?? Infinity) <= r.body.died;
    }).length;
  for (const before of party) {
    const h = findHero(t, before.id);
    if (!h) continue;
    const prevDeepest = town.records[h.id]?.deepest ?? 0;
    const prevSeen = town.records[h.id]?.seen ?? [];
    const tags = gearTags(ix, before);
    const facts: Facts = {
      goldShare: share,
      emptyHanded: goldEarned + recovered.length === 0 ? 1 : 0,
      kills: kills[h.id] ?? 0,
      newFloors: Math.max(0, result.deepestFloor - prevDeepest),
      sameOldFloor: result.deepestFloor <= prevDeepest ? 1 : 0,
      newMonsters: result.seen.filter((m) => !prevSeen.includes(m)).length,
      retreated: result.outcome === "retreated" ? 1 : 0,
      fallenComrades: fallen,
      allHome: fallen === 0 ? 1 : 0,
      rescuedComrades: rescued.length,
      wounded: h.condition !== "ok" || h.hp < maxHp(ix, h) / 3 ? 1 : 0,
      sentHurt: before.hp < maxHp(ix, before) * 0.75 ? 1 : 0,
      likedGear: before.likes && tags.has(before.likes) ? 1 : 0,
      dislikedGear: before.dislikes && tags.has(before.dislikes) ? 1 : 0,
      levelUp: levels[h.id] ?? 0,
      sentTired: fatigueTier(ix, before) ? 1 : 0,
      injured: injuries[h.id]?.length ? 1 : 0,
      alignmentClash: aligned.clashing.some((x) => x.id === h.id) ? tripDays : 0,
      partyDivided: aligned.divided ? tripDays : 0,
      goodEvilFriction:
        aligned.friction &&
        !aligned.clashing.some((x) => x.id === h.id) &&
        Math.abs(ix.alignment(h.alignment).position) >= 1
          ? tripDays
          : 0,
      foughtRisen: knewRisen(before),
    };
    morale[h.id] = moraleChanges(ix, h, facts, { leaderCha });
    applyMorale(ix, h, facts, backDay, { leaderCha });
  }
  for (const h of rescued) {
    const r = findHero(t, h.id)!;
    morale[h.id] = moraleChanges(ix, r, { wasTrapped: 1 });
    applyMorale(ix, r, { wasTrapped: 1 }, backDay);
  }
  guildFeels(
    ix,
    t,
    { fallenComrades: fallen, rescuedComrades: rescued.length },
    new Set([...away, ...rescued.map((h) => h.id)]),
  );
  // Fit heroes left at home while the party went down (Glory heroes mind).
  for (const h of t.roster) {
    if (away.has(h.id) || h.porter || rescued.some((r) => r.id === h.id)) continue;
    const fit = h.condition === "ok" && !(h.injuries ?? []).length && !fatigueTier(ix, h);
    if (fit) applyMorale(ix, h, { benched: 1 }, startDay);
  }
  for (const n of trappedNames)
    news(
      t,
      `${n} is trapped on floor ${lostSite!.floor}, alive. A rescue party has ${ix.lib.rescue.windowDays} days.`,
      "bad",
    );
  if (rescued.length)
    news(
      t,
      `${listWords(rescued.map((h) => h.name))} ${rescued.length > 1 ? "are" : "is"} home, rescued.`,
      "good",
    );

  // Their kills thin out the dungeon.
  t.dungeon = applyKills(t.dungeon, result.floorKills);

  // Time passes, one night at a time. Those who stayed home rest and guard the
  // town; the party gets a night's sleep when it's back.
  const raids: RaidReport[] = [];
  for (let i = 0; i < result.days; i++) {
    const raid = nightfall(ix, t, away);
    if (raid) raids.push(raid);
    endOfDay(ix, t, away);
  }
  for (const h of t.roster) {
    if (!away.has(h.id)) continue;
    restHero(ix, h, 1);
    dayInTown(ix, t, h);
  }
  const quit = quitters(ix, t);
  t.party = t.party.filter((id) => findHero(t, id));
  t.porters = (t.porters ?? []).filter((id) => findHero(t, id));
  if (result.siteVisited || (t.orders.rescue && !rescueSite(t)))
    t.orders = cancelRescue(ix, t).orders;
  freshRecruits(ix, t, names);

  t.lastTrip = {
    day: startDay,
    seed,
    party,
    result,
    goldEarned,
    kills,
    raids,
    xp,
    levels,
    morale,
    trapped: trappedNames,
    rescued: rescued.map((h) => h.name),
    recovered,
    quit,
    injuries,
    fatigue,
    haggledBy: haggle.hero?.name,
    lootRate: marketRate(ix, ix.lib.town.haulRate, haggle.bonus),
    hiddenGold,
  };
  return t;
}
