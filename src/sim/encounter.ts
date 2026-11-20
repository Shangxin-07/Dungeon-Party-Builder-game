/**
 * Picking which monsters a party meets (DESIGN.md §3). Depth difficulty is
 * exponential: each floor's target power is ×1.3 the one above. Encounter
 * groups are content; this just keeps adding groups that fit the floor
 * until the total power is close to the target.
 */
import type { Index } from "./library";
import type { Rng } from "./rng";

export const FLOOR_ONE_POWER = 10;
export const POWER_PER_FLOOR = 1.3;
const MAX_MONSTERS = 8;

/** Target monster power for a typical encounter on this floor. */
export function floorPower(floor: number): number {
  return Math.round(FLOOR_ONE_POWER * POWER_PER_FLOOR ** (floor - 1));
}

export interface EncounterOptions {
  /**
   * The floor's monster level today (DESIGN.md §4). Defaults to the depth.
   * A higher level means bigger groups, sized like a deeper floor's, and lets
   * that deeper floor's monster groups turn up too.
   */
  level?: number;
  /** Total power to aim for instead of the level's usual (raids use this). */
  power?: number;
  /** Most monsters in the group (e.g. only a few left alive on the floor). */
  max?: number;
}

/** Target power for a floor at a (possibly fractional) monster level. */
export function levelPower(level: number): number {
  return Math.round(FLOOR_ONE_POWER * POWER_PER_FLOOR ** (Math.max(1, level) - 1));
}

/** Roll a list of monster ids for a fight on this floor. */
export function rollEncounter(
  ix: Index,
  floor: number,
  rng: Rng,
  opts: EncounterOptions = {},
): string[] {
  const level = opts.level ?? floor;
  const from = Math.min(floor, Math.round(level));
  const to = Math.max(floor, Math.round(level));
  const options = ix.lib.encounters.filter((e) => e.floors[0] <= to && e.floors[1] >= from);
  if (!options.length) throw new Error(`No encounters defined for floor ${floor}`);
  const target = opts.power ?? (opts.level === undefined ? floorPower(floor) : levelPower(level));
  const cap = Math.min(MAX_MONSTERS, opts.max ?? MAX_MONSTERS);
  const total = options.reduce((s, e) => s + e.weight, 0);
  const monsters: string[] = [];
  let power = 0;
  if (cap <= 0) return monsters;

  for (let picks = 0; picks < 4 && power < target * 0.85; picks++) {
    let roll = rng.next() * total;
    const enc = options.find((e) => (roll -= e.weight) < 0) ?? options[options.length - 1]!;
    for (const g of enc.groups) {
      const n = rng.int(g.count[0], g.count[1]);
      for (let i = 0; i < n; i++) {
        const p = ix.monster(g.monster).power;
        // Stop once a group would overshoot badly, but always add at least one monster.
        if (monsters.length >= cap || (monsters.length && power + p > target * 1.25)) break;
        monsters.push(g.monster);
        power += p;
      }
    }
  }
  // Keep the front row in front: order by row so logs read naturally.
  return monsters.sort((a, b) => rowOrder(ix, a) - rowOrder(ix, b));
}

const rowOrder = (ix: Index, id: string) => (ix.monster(id).row === "front" ? 0 : 1);
