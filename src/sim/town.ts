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
  type ExpeditionResult,
  type SiteVisit,
  type StandingOrders,
} from "./expedition";
import { applyKills, dungeonDay, newDungeon, type DungeonState } from "./dungeon";
import { createHero, EQUIP_SLOTS, heroSheet, type EquipSlot, type Hero } from "./hero";
import { gainXp, spendLevelUp } from "./levels";
import type { Index } from "./library";
import type { HaulItem } from "./loot";
import { applyMorale, gearTags, isLow, moraleChanges, type Facts } from "./morale";
import { resolveRaid, type RaidReport } from "./raid";
import { createRng, type Rng } from "./rng";

/** Bump when the shape of TownState changes, and add a migration in save.ts. */
export const TOWN_VERSION = 4;

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
  /** Names of those who died there. */
  bodies: string[];
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
  name: string;
  classId: string;
  day: number;
  floor: number;
  /** "dead" for good. "lost" only appears in saves from before rescue runs. */
  fate: "dead" | "lost";
  /** "raid" if they died defending the town (floor is then 0). */
  cause?: "raid";
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
}

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

/** Whether a building is up and working (built and not damaged). */
export const standing = (town: TownState, id: string) =>
  (town.buildings[id] ?? 0) > 0 && !town.damaged.includes(id);

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
export const sellPrice = (ix: Index, item: ItemDef) =>
  Math.max(1, Math.floor(item.value * ix.lib.town.sellRate));

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
  if (party.length && !party.some((h) => h.pack.some((id) => ix.item(id).tags.includes("heal"))))
    out.push("Nobody is carrying potions or bandages.");
  for (const h of party) {
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
  for (const id of town.party) {
    const h = findHero(town, id);
    if (!h) return "Someone in the party has left the guild.";
    if (h.condition !== "ok" || h.hp <= 0) return `${h.name} can't walk yet. Let them rest.`;
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

/** A fresh batch of recruits looking for work. */
function freshRecruits(ix: Index, town: TownState, names: readonly string[]): void {
  town.recruits = [];
  for (let i = 0; i < recruitsToday(ix, town); i++) {
    const classId = roll(town, (rng) => rng.pick(ix.lib.classes).id);
    town.recruits.push(makeHero(ix, town, names, classId, recruitPicks(ix, town)));
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
  };
  for (const classId of rules.startingRoster) {
    const hero = makeHero(ix, town, names, classId);
    town.roster.push(hero);
    town.records[hero.id] = newRecord(1);
  }
  // Fill the party with one of each role where we can, as a sensible default.
  town.party = town.roster.slice(0, partySlots(ix, town)).map((h) => h.id);
  freshRecruits(ix, town, names);
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

export function hire(ix: Index, town: TownState, recruitId: string): TownState {
  const t = edit(town);
  const i = t.recruits.findIndex((r) => r.id === recruitId);
  if (i < 0) throw new TownError("That recruit has moved on.");
  if (t.roster.length >= rosterSize(ix, t))
    throw new TownError("The roster is full. Upgrade the Guild Hall or dismiss someone.");
  if (t.gold < ix.lib.town.hireCost) throw new TownError("Not enough gold.");
  const [recruit] = t.recruits.splice(i, 1);
  t.gold -= ix.lib.town.hireCost;
  t.roster.push(recruit!);
  t.records[recruit!.id] = newRecord(t.day);
  if (t.party.length < partySlots(ix, t)) t.party.push(recruit!.id);
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
  return t;
}

export function buy(ix: Index, town: TownState, itemId: string): TownState {
  if (!shopStock(ix, town).includes(itemId)) throw new TownError("The Market doesn't sell that.");
  const price = buyPrice(ix.item(itemId));
  if (town.gold < price) throw new TownError("Not enough gold.");
  const t = edit(town);
  t.gold -= price;
  t.stash.push(itemId);
  return t;
}

export function sell(ix: Index, town: TownState, itemId: string): TownState {
  const t = edit(town);
  takeFromStash(t, itemId);
  t.gold += sellPrice(ix, ix.item(itemId));
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
  hero(t, heroId);
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
    wanted = roll(t, (rng) => spendLevelUp(ix, h, perk, stat, rng)).wanted;
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
  t.gold -= next.cost;
  const level = (t.buildings[buildingId] ?? 0) + 1;
  if (next.days <= 0) t.buildings[buildingId] = level;
  else t.construction.push({ building: buildingId, level, daysLeft: next.days, started: t.day });
  return t;
}

/** A day's building work. Finished jobs take effect straight away. */
function buildersWork(t: TownState): void {
  for (const c of t.construction) {
    c.daysLeft -= 1;
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
  t.gold -= cost;
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
      t.memorial.push({
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
      const levels = roll(t, (rng) => gainXp(ix, h, xpEach, rng));
      if (levels) applyMorale(ix, h, { levelUp: levels }, t.day);
      t.roster[i] = h;
    }
  }
  if (died) guildFeels(ix, t, { fallenComrades: died }, new Set());
  t.gold -= raid.goldStolen;
  t.damaged = [...t.damaged, ...raid.damaged];
  t.raids = [...t.raids, raid].slice(-RAID_HISTORY);
  return raid;
}

/** A day in town for a hero who isn't away: morale from the town, and training. */
function dayInTown(ix: Index, t: TownState, h: Hero): void {
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
    const levels = roll(t, (rng) => gainXp(ix, h, xp, rng));
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
      site.bodies.push(x.hero.name);
      site.items.push(...gearOf(ix, x.hero));
      t.memorial.push({
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
  t.sites = t.sites.filter((s) => s.trapped.length || s.items.length);
  if (t.orders.rescue && !rescueSite(t)) t.orders = cancelRescue(ix, t).orders;
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

/** The end of a day in town: builders, rest, morale, the lost, and anyone who's had enough. */
function endOfDay(ix: Index, t: TownState, away: ReadonlySet<string>): void {
  // Anyone already at the end of their tether goes before the day starts.
  quitters(ix, t);
  t.day += 1;
  buildersWork(t);
  for (const h of t.roster) {
    if (away.has(h.id)) continue;
    restHero(ix, h, 1);
    dayInTown(ix, t, h);
  }
  sitesNight(ix, t);
  quitters(ix, t);
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
  const seed = roll(t, (rng) => rng.int(0, 2 ** 31 - 1));
  const startDay = t.day;

  // A rescue run: who's still alive when the party gets there (a floor a day).
  const site = rescueSite(t);
  const visit: SiteVisit | undefined = site && {
    id: site.id,
    floor: site.floor,
    room: site.room,
    trapped: site.trapped.filter((x) => x.until >= startDay + site.floor - 1).map((x) => x.hero),
    bodies: site.bodies,
    items: site.items,
  };
  const gear: Record<number, ScavengedGear[]> = {};
  for (const g of t.scavenged) (gear[g.floor] ??= []).push(g);

  const result = runExpedition(ix, party, t.orders, seed, t.dungeon.floors, { site: visit, gear });
  const wiped = result.outcome === "wiped";
  const backDay = startDay + result.days;

  // Who killed what.
  const kills: Record<string, number> = {};
  for (const e of result.log) {
    const c = e.combat;
    if (c?.kind === "killed" && c.actor && party.some((h) => h.id === c.actor))
      kills[c.actor] = (kills[c.actor] ?? 0) + 1;
  }

  // The Market pays the real value for the haul, whatever the party guessed.
  // Heroes' own gear goes back in the store room.
  const recovered = result.haul.filter((h) => h.keep);
  const goldEarned = result.haul.filter((h) => !h.keep).reduce((s, h) => s + h.value, 0);
  t.gold += goldEarned;
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
    levels[h.id] = roll(t, (rng) => gainXp(ix, h, xpEach, rng));
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

  const away = new Set(t.party);
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
      name: after.name,
      classId: after.classId,
      day: backDay,
      floor: lostSite?.floor ?? result.deepestFloor,
      fate: "dead",
      record: rec,
    });
    if (lostSite) {
      lostSite.bodies.push(after.name);
      lostSite.items.push(...gearOf(ix, after));
    } else {
      // The party brings a fallen friend's gear home.
      t.stash.push(...gearOf(ix, after).map((g) => g.item));
    }
  }
  if (lostSite && (lostSite.trapped.length || lostSite.items.length)) t.sites.push(lostSite);

  // A rescue run: take the freed heroes and the gear off the site.
  if (result.siteVisited) {
    const s = t.sites.find((x) => x.id === result.siteVisited);
    if (s) {
      const freed = new Set(result.rescued.map((h) => h.id));
      s.trapped = s.trapped.filter((x) => !freed.has(x.hero.id));
      s.items = result.siteLeft;
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

  // How everyone feels about it (DESIGN.md §6).
  const morale: Record<string, { amount: number; reason: string }[]> = {};
  const leaderCha = Math.max(10, ...party.map((h) => heroSheet(ix, h).stats.CHA));
  const share = goldEarned / party.length;
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
  };
  return t;
}
