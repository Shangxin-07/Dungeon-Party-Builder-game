/**
 * Headless balance runs: simulate many seeded mini-trips and summarise. Used by
 * the content tests (to catch wildly off numbers) and by `npm run balance`.
 *
 * A trip here is a fresh starter party fighting several encounters on one
 * floor back to back, with no rest. It stands in for a real expedition until
 * M2 adds rooms, traps and loot.
 */
import type { Library } from "../content/types";
import { runCombat } from "./combat";
import { rollEncounter } from "./encounter";
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
 * A crude stand-in for Medicine, which arrives with expeditions in M2.
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
): FloorReport {
  const ix = indexLibrary(lib);
  let survived = 0;
  let hpLeft = 0;
  let deaths = 0;
  for (let trip = 1; trip <= trips; trip++) {
    const rng = createRng(trip * 7919 + floor);
    const start = createStarterParty(ix, names, rng);
    let party = start;
    let won = true;
    for (let f = 0; f < fightsPerTrip && won; f++) {
      const r = runCombat(ix, party, rollEncounter(ix, floor, rng), { seed: rng.int(0, 2 ** 31) });
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
