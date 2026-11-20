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
import type { BuildingEffect, ItemDef, Row } from "../content/types";
import {
  DEFAULT_ORDERS,
  runExpedition,
  type ExpeditionResult,
  type StandingOrders,
} from "./expedition";
import { applyKills, dungeonDay, newDungeon, type DungeonState } from "./dungeon";
import { createHero, EQUIP_SLOTS, heroSheet, type EquipSlot, type Hero } from "./hero";
import type { Index } from "./library";
import { resolveRaid, type RaidReport } from "./raid";
import { createRng, type Rng } from "./rng";

/** Bump when the shape of TownState changes, and add a migration in save.ts. */
export const TOWN_VERSION = 2;

/** How many nights of pit history and full raid reports the town keeps. */
const PIT_HISTORY = 60;
const RAID_HISTORY = 5;

/** A hero's career so far. */
export interface HeroRecord {
  trips: number;
  kills: number;
  /** Day they joined the guild. */
  joined: number;
}

/** Someone the guild has lost. */
export interface Memorial {
  name: string;
  classId: string;
  day: number;
  floor: number;
  /** "dead" for good, or "lost" where the party fell (rescue runs come in M5). */
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
  };
  for (const classId of rules.startingRoster) {
    const hero = makeHero(ix, town, names, classId);
    town.roster.push(hero);
    town.records[hero.id] = { trips: 0, kills: 0, joined: 1 };
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
  t.records[recruit!.id] = { trips: 0, kills: 0, joined: t.day };
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

/** The next level of a building, if there is one. */
export function nextLevel(ix: Index, town: TownState, buildingId: string) {
  const def = ix.building(buildingId);
  const level = town.buildings[buildingId] ?? 0;
  return def.levels[level];
}

export function upgrade(ix: Index, town: TownState, buildingId: string): TownState {
  const next = nextLevel(ix, town, buildingId);
  if (!next) throw new TownError("It can't be built any bigger yet.");
  if (town.damaged.includes(buildingId)) throw new TownError("Repair it first.");
  if (town.gold < next.cost) throw new TownError("Not enough gold.");
  const t = edit(town);
  t.gold -= next.cost;
  t.buildings[buildingId] = (t.buildings[buildingId] ?? 0) + 1;
  return t;
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
        gold: t.gold,
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

  // Defenders come back from the fight hurt, or not at all.
  for (const after of raid.after) {
    const i = t.roster.findIndex((h) => h.id === after.id);
    if (i < 0) continue;
    const rec = t.records[after.id];
    if (rec) rec.kills += raid.heroKills[after.id] ?? 0;
    if (after.condition === "dead") {
      t.memorial.push({
        name: after.name,
        classId: after.classId,
        day: t.day,
        floor: 0,
        fate: "dead",
        cause: "raid",
        record: rec ?? { trips: 0, kills: 0, joined: t.day },
      });
      t.roster.splice(i, 1);
      t.party = t.party.filter((id) => id !== after.id);
    } else {
      t.roster[i] = structuredClone(after);
    }
  }
  t.gold -= raid.goldStolen;
  t.damaged = [...t.damaged, ...raid.damaged];
  t.raids = [...t.raids, raid].slice(-RAID_HISTORY);
  return raid;
}

/** Spend a day in town. Everyone heals, night falls, and new recruits turn up. */
export function rest(ix: Index, town: TownState, names: readonly string[]): TownState {
  const t = edit(town);
  nightfall(ix, t, new Set());
  t.day += 1;
  for (const h of t.roster) restHero(ix, h, 1);
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
  const result = runExpedition(ix, party, t.orders, seed, t.dungeon.floors);
  const wiped = result.outcome === "wiped";

  // Who killed what.
  const kills: Record<string, number> = {};
  for (const e of result.log) {
    const c = e.combat;
    if (c?.kind === "killed" && c.actor && party.some((h) => h.id === c.actor))
      kills[c.actor] = (kills[c.actor] ?? 0) + 1;
  }

  // The Market pays the real value for the haul, whatever the party guessed.
  const goldEarned = result.haul.reduce((s, h) => s + h.value, 0);
  t.gold += goldEarned;

  const startDay = t.day;
  const away = new Set(t.party);
  for (const after of result.party) {
    const rec = t.records[after.id] ?? { trips: 0, kills: 0, joined: startDay };
    rec.trips += 1;
    rec.kills += kills[after.id] ?? 0;
    t.records[after.id] = rec;
    if (after.condition === "dead" || wiped) {
      t.memorial.push({
        name: after.name,
        classId: after.classId,
        day: startDay + result.days,
        floor: result.wipeSite?.floor ?? result.deepestFloor,
        fate: after.condition === "dead" ? "dead" : "lost",
        record: rec,
      });
      t.roster = t.roster.filter((h) => h.id !== after.id);
      continue;
    }
    const i = t.roster.findIndex((h) => h.id === after.id);
    t.roster[i] = structuredClone(after);
  }

  // Their kills thin out the dungeon.
  t.dungeon = applyKills(t.dungeon, result.floorKills);

  // Time passes, one night at a time. Those who stayed home rest and guard the
  // town; the party gets a night's sleep when it's back.
  const raids: RaidReport[] = [];
  for (let i = 0; i < result.days; i++) {
    const raid = nightfall(ix, t, away);
    if (raid) raids.push(raid);
    t.day += 1;
    for (const h of t.roster) if (!away.has(h.id)) restHero(ix, h, 1);
  }
  for (const h of t.roster) if (away.has(h.id)) restHero(ix, h, 1);
  t.party = t.party.filter((id) => findHero(t, id));
  freshRecruits(ix, t, names);

  t.lastTrip = { day: startDay, seed, party, result, goldEarned, kills, raids };
  return t;
}
