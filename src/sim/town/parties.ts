/**
 * Picking the party, standing orders, parties on file and rescue plans.
 */
import { DEFAULT_ORDERS, type StandingOrders } from "../expedition";
import type { Hero } from "../hero";
import type { Index } from "../library";
import { type TownState, type SavedParty, TownError } from "./state";
import { findHero, searchFloor } from "./read";
import { edit, hero } from "./internal";

/** Add a hero to the party, or take them out of it. */
export function toggleParty(ix: Index, town: TownState, heroId: string): TownState {
  const t = edit(town);
  const h = hero(t, heroId);
  if (h.porter) {
    const slots = ix.lib.town.porters.slots;
    if (t.porters.includes(heroId)) t.porters = t.porters.filter((id) => id !== heroId);
    else if (t.porters.length >= slots)
      throw new TownError(`Only ${slots} porters can go with one party.`);
    else t.porters.push(heroId);
    return t;
  }
  if (t.party.includes(heroId)) {
    t.party = t.party.filter((id) => id !== heroId);
    if (t.leader === heroId) delete t.leader;
  } else {
    // No cap on heroes (M7.10): the leader's command decides how well they go together.
    t.party.push(heroId);
  }
  return t;
}

/**
 * Make a hero in the party its leader (M7.05, DESIGN.md §17.5). Without a
 * pick, the hero with the best Leadership leads.
 */
export function setLeader(_ix: Index, town: TownState, heroId: string): TownState {
  if (!town.party.includes(heroId)) throw new TownError("Only someone in the party can lead it.");
  return { ...town, leader: heroId };
}

export function setOrders(_ix: Index, town: TownState, orders: StandingOrders): TownState {
  return { ...town, orders };
}

/** The saved party in this slot, if there's one on file. */
export const savedParty = (town: TownState, slot: number): SavedParty | undefined =>
  town.parties[slot];

/** Default name for a party slot: Party A, Party B, ... */
export const partyLetter = (slot: number) => `Party ${String.fromCharCode(65 + slot)}`;

/** The first "Party A", "Party B"... not already on file. */
export function freePartyName(town: TownState): string {
  const taken = new Set(town.parties.map((p) => p.name));
  for (let i = 0; i < 26; i++) if (!taken.has(partyLetter(i))) return partyLetter(i);
  return `Party ${town.parties.length + 1}`;
}

/**
 * Keep the current party, porters and orders on file in a slot. Any number
 * can be kept (M9.03): the slot after the last adds a new one.
 */
export function saveParty(_ix: Index, town: TownState, slot: number, name?: string): TownState {
  if (slot < 0 || slot > town.parties.length) throw new TownError("No such party on file.");
  if (!town.party.length) throw new TownError("Pick some heroes first.");
  const t = edit(town);
  // Sealing the stairs (M7.16) is a one-off: it isn't kept on file.
  const { seal: _seal, ...orders } = ordinaryOrders(t.orders);
  const old = t.parties[slot];
  t.parties[slot] = {
    name: name?.trim() || old?.name || freePartyName(t),
    heroes: [...t.party],
    porters: [...t.porters],
    ...(t.leader && t.party.includes(t.leader) ? { leader: t.leader } : {}),
    orders,
  };
  return t;
}

export const emptyParty = (slot: number): SavedParty => ({
  name: partyLetter(slot),
  heroes: [],
  porters: [],
  orders: DEFAULT_ORDERS,
});

/** Keep the current party on file as a new one (M9.03, the "Add party" button). */
export const addParty = (ix: Index, town: TownState, name?: string): TownState =>
  saveParty(ix, town, town.parties.length, name);

/** Take a party off file. Its heroes stay in the guild. */
export function removeParty(_ix: Index, town: TownState, slot: number): TownState {
  if (!savedParty(town, slot)) throw new TownError("Nothing on file there.");
  const t = edit(town);
  t.parties = t.parties.filter((_, i) => i !== slot);
  return t;
}

/** Rename a party on file. */
export function renameParty(_ix: Index, town: TownState, slot: number, name: string): TownState {
  if (!savedParty(town, slot)) throw new TownError("Nothing on file there yet.");
  const t = edit(town);
  t.parties[slot]!.name = name.trim() || t.parties[slot]!.name;
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
  t.party = heroes.filter((h) => !h.porter).map((h) => h.id);
  t.porters = porters.slice(0, ix.lib.town.porters.slots).map((h) => h.id);
  if (p.leader && t.party.includes(p.leader)) t.leader = p.leader;
  else delete t.leader;
  const { rescue, mission } = t.orders;
  t.orders = rescue ? { ...ordinaryOrders(p.orders), rescue, mission } : { ...p.orders };
  const floor = searchFloor(t);
  if (floor) t.orders.targetFloor = Math.max(t.orders.targetFloor, floor);
  return t;
}

/**
 * Make the next trip a search (DESIGN.md §10, §17.3): for a lost party's
 * site, or for a party that's out and overdue. A "rescue" mission comes back
 * for the living, travelling fast; a "recover" mission brings home the dead
 * and everything they had.
 */
export function planRescue(
  _ix: Index,
  town: TownState,
  id: string,
  mission: "rescue" | "recover" = "recover",
): TownState {
  const site = town.sites.find((s) => s.id === id && !s.outing);
  const outing = town.outings.find((o) => o.id === id);
  if (!site && !outing) throw new TownError("Nobody is waiting there any more.");
  if (outing && town.day <= outing.expected)
    throw new TownError(`${outing.name} isn't due back until day ${outing.expected}.`);
  const t = { ...town, orders: { ...town.orders, rescue: id, mission } };
  const floor = searchFloor(t) ?? 1;
  t.orders.targetFloor = Math.max(t.orders.targetFloor, floor);
  return t;
}

/**
 * Whether the next party's orders are the ones on file: same floor, retreat,
 * loot, hunting, mission and lair. A search planned on top doesn't count.
 */
export function sameOrders(onFile: StandingOrders, next: StandingOrders): boolean {
  const a = ordinaryOrders(onFile);
  const b = ordinaryOrders(next);
  return (
    a.targetFloor === b.targetFloor &&
    JSON.stringify(a.retreat) === JSON.stringify(b.retreat) &&
    a.loot === b.loot &&
    (a.clearPercent ?? 0) === (b.clearPercent ?? 0) &&
    a.mission === b.mission &&
    a.lair === b.lair
  );
}

/**
 * What differs between the party being picked and a party on file with the
 * same heroes (M9.21, #120): orders, porters, leader. Empty when they match.
 */
export function fileDrift(town: TownState, onFile: SavedParty): string[] {
  const out: string[] = [];
  if (!sameOrders(onFile.orders, town.orders)) out.push("orders");
  const porters = (a: readonly string[], b: readonly string[]) =>
    a.length === b.length && a.every((id) => b.includes(id));
  if (!porters(onFile.porters, town.porters)) out.push("porters");
  const picked = town.leader && town.party.includes(town.leader) ? town.leader : undefined;
  if ((onFile.leader ?? undefined) !== picked) out.push("leader");
  return out;
}

/** Back to an ordinary trip. */
export function cancelRescue(_ix: Index, town: TownState): TownState {
  return { ...town, orders: ordinaryOrders(town.orders) };
}

/**
 * Orders without any search (that belongs to the moment). A scout mission
 * (M7.08) is the party's own, so it stays.
 */
function ordinaryOrders(o: StandingOrders): StandingOrders {
  const { rescue: _, mission, ...orders } = o;
  return !o.rescue && (mission === "scout" || mission === "sneak")
    ? { ...orders, mission }
    : orders;
}
