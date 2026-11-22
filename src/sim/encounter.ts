/**
 * Picking which monsters a party meets (DESIGN.md §3). Depth difficulty is
 * exponential: each floor's target power is ×1.3 the one above. Encounter
 * groups are content; this just keeps adding groups that fit the floor
 * until the total power is close to the target.
 */
import type { EncounterDef } from "../content/types";
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
  /**
   * Bigger parties meet bigger groups (M7.05): the target power is
   * multiplied by this, and the group can hold more monsters.
   */
  scale?: number;
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
  const scale = Math.max(1, opts.scale ?? 1);
  const target =
    (opts.power ?? (opts.level === undefined ? floorPower(floor) : levelPower(level))) * scale;
  const most = Math.round(MAX_MONSTERS * Math.min(1.75, scale));
  const cap = Math.min(most, opts.max ?? most);
  const weight = (e: EncounterDef) => encounterWeight(e, floor);
  const total = options.reduce((s, e) => s + weight(e), 0);
  const monsters: string[] = [];
  let power = 0;
  if (cap <= 0) return monsters;

  const groups = Math.ceil(4 * scale);
  for (let picks = 0; picks < groups && power < target * 0.85; picks++) {
    let roll = rng.next() * total;
    const enc = options.find((e) => (roll -= weight(e)) < 0) ?? options[options.length - 1]!;
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
  promoteVariant(ix, monsters, level, rng);
  // Keep the front row in front: order by row so logs read naturally.
  return monsters.sort((a, b) => rowOrder(ix, a) - rowOrder(ix, b));
}

/**
 * Maybe swap one monster for a tougher variant of it (a Spider Matriarch at
 * the head of a nest). At most one variant per fight. Changes `monsters`.
 */
function promoteVariant(ix: Index, monsters: string[], level: number, rng: Rng): void {
  for (const v of ix.lib.monsters) {
    if (!v.variant || (v.variant.minLevel ?? 1) > level) continue;
    const i = monsters.indexOf(v.variant.of);
    if (i < 0 || !rng.chance(v.variant.chance)) continue;
    monsters[i] = v.id;
    return;
  }
}

/** How likely an encounter group is on this floor. */
export const encounterWeight = (e: EncounterDef, floor: number) => e.weightOn?.[floor] ?? e.weight;

/**
 * Chance that a typical fight on this floor (at its usual level) includes
 * each kind of monster, from the encounter weights. For the scouting report.
 */
export function floorOdds(ix: Index, floor: number): { monster: string; share: number }[] {
  const options = ix.lib.encounters.filter((e) => e.floors[0] <= floor && e.floors[1] >= floor);
  const total = options.reduce((s, e) => s + encounterWeight(e, floor), 0);
  const share = new Map<string, number>();
  for (const e of options) {
    const p = encounterWeight(e, floor) / total;
    for (const m of new Set(e.groups.map((g) => g.monster))) share.set(m, (share.get(m) ?? 0) + p);
  }
  return [...share]
    .map(([monster, s]) => ({ monster, share: s }))
    .sort((a, b) => b.share - a.share);
}

const rowOrder = (ix: Index, id: string) => (ix.monster(id).row === "front" ? 0 : 1);
