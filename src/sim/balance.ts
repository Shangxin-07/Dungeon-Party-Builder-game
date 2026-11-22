/**
 * Headless balance runs: simulate many seeded mini-trips and summarise. Used by
 * the content tests (to catch wildly off numbers) and by `npm run balance`.
 *
 * balanceReport: a fresh starter party fighting encounters on one floor back
 * to back, with no rest. expeditionReport: full trips with rooms, rest spots,
 * Medicine, traps, loot and standing orders.
 */
import type { Library } from "../content/types";
import { runCombat } from "./combat";
import { rollEncounter } from "./encounter";
import { runExpedition, type StandingOrders } from "./expedition";
import { createStarterParty, type Hero } from "./hero";
import { indexLibrary } from "./library";
import { createRng } from "./rng";

export interface FloorReport {
  floor: number;
  trips: number;
  fightsPerTrip: number;
  /** Fraction of trips where the party won every fight. */
  survived: number;
  /** Average fraction of the party's starting HP left at the end of a survived trip. */
  hpLeft: number;
  /** Average heroes who died per trip. */
  deaths: number;
}

/**
 * Downed heroes who are still alive after a won fight get patched up to 1 HP.
 * This raw fights-in-a-row check has no rest or Medicine on purpose: it
 * measures combat alone. expeditionReport below is the full picture.
 */
function patchUp(party: Hero[]): Hero[] {
  return party.map((h) => (h.condition === "downed" ? { ...h, condition: "ok", hp: 1 } : h));
}

export function balanceReport(
  lib: Library,
  names: readonly string[],
  floor: number,
  trips: number,
  fightsPerTrip = 3,
  /** Class ids of the party. Defaults to Fighter, Scout and Mage. */
  classIds?: readonly string[],
): FloorReport {
  const ix = indexLibrary(lib);
  let survived = 0;
  let hpLeft = 0;
  let deaths = 0;
  for (let trip = 1; trip <= trips; trip++) {
    const rng = createRng(trip * 7919 + floor);
    const start = createStarterParty(ix, names, rng, classIds);
    let party = start;
    let won = true;
    for (let f = 0; f < fightsPerTrip && won; f++) {
      const r = runCombat(ix, party, rollEncounter(ix, floor, rng), {
        seed: rng.int(0, 2 ** 31),
        level: floor,
      });
      won = r.winner === "party";
      party = patchUp(r.party);
    }
    deaths += party.filter((h) => h.condition === "dead").length;
    if (won) {
      survived++;
      hpLeft += party.reduce((s, h) => s + h.hp, 0) / start.reduce((s, h) => s + h.hp, 0);
    }
  }
  return {
    floor,
    trips,
    fightsPerTrip,
    survived: survived / trips,
    hpLeft: survived ? hpLeft / survived : 0,
    deaths: deaths / trips,
  };
}

export interface ExpeditionReport {
  targetFloor: number;
  trips: number;
  /** Did what they were told and came home. */
  returned: number;
  /** Turned back early, by the retreat rule. */
  retreated: number;
  wiped: number;
  /** Couldn't get home, so holed up to wait for help (M7.02). */
  holed: number;
  /** Average heroes who died per trip. */
  deaths: number;
  /** Average real value of the haul brought home. */
  haul: number;
  /** Average items left behind because packs were full. */
  dropped: number;
  /**
   * The trip clock (M7.01): average hours below, and days away, for trips
   * that did what they were told (0 if none did). Divide by the target floor
   * for hours per floor.
   */
  hours: number;
  days: number;
  /** Average fights per trip. */
  fights: number;
}

/** Fresh starter parties on full expeditions with these standing orders. */
export function expeditionReport(
  lib: Library,
  names: readonly string[],
  orders: StandingOrders,
  trips: number,
  classIds?: readonly string[],
): ExpeditionReport {
  const ix = indexLibrary(lib);
  const r: ExpeditionReport = {
    targetFloor: orders.targetFloor,
    trips,
    returned: 0,
    retreated: 0,
    wiped: 0,
    holed: 0,
    deaths: 0,
    haul: 0,
    dropped: 0,
    fights: 0,
    hours: 0,
    days: 0,
  };
  for (let trip = 1; trip <= trips; trip++) {
    const seed = trip * 7919 + orders.targetFloor;
    const party = createStarterParty(ix, names, createRng(seed), classIds);
    const result = runExpedition(ix, party, orders, seed);
    r[result.outcome]++;
    if (result.outcome === "returned") {
      r.hours += result.hours ?? 0;
      r.days += result.days;
    }
    r.deaths += result.party.filter((h) => h.condition === "dead").length;
    r.haul += result.haul.reduce((s, h) => s + h.value, 0);
    r.dropped += result.log.filter((e) => e.kind === "drop" && e.text.startsWith("Packs")).length;
    r.fights += result.log.filter((e) => e.kind === "fight" && e.monsters).length;
  }
  const avg = (n: number) => n / trips;
  return {
    ...r,
    returned: avg(r.returned),
    retreated: avg(r.retreated),
    wiped: avg(r.wiped),
    holed: avg(r.holed),
    deaths: avg(r.deaths),
    haul: avg(r.haul),
    dropped: avg(r.dropped),
    fights: avg(r.fights),
    hours: r.returned ? r.hours / r.returned : 0,
    days: r.returned ? r.days / r.returned : 0,
  };
}
