/**
 * The dungeon over time (DESIGN.md §3, §4). Each floor has a population, a
 * capacity and an average monster level. Every day:
 *
 * 1. The bottom floor breeds new monsters. The rate creeps up day by day.
 * 2. A floor over capacity pushes its weakest monsters up to the floor above,
 *    where they arrive stronger than the locals and raise that floor's level.
 * 3. Floor 1's extra climb out of the pit: the overflow the town has to face.
 *
 * Every floor also settles a little way back towards its usual level each day,
 * so killing monsters (which makes room and stops the push-up) lets it calm down.
 * Monster levels are depth-equivalent: level 2 means "as strong as floor 2",
 * so a floor at level 1.6 rolls encounters sized between floor 1 and floor 2.
 *
 * No randomness here: the same dungeon and the same kills give the same day,
 * which is what lets a watchtower see the next night coming.
 */
import type { Index } from "./library";

export interface FloorPressure {
  /** Monsters living on the floor. */
  population: number;
  /** Average monster level (1 = a typical floor-1 monster). */
  level: number;
}

export interface DungeonState {
  /** Index 0 is floor 1. */
  floors: FloorPressure[];
  /** Days the dungeon has been breeding. */
  days: number;
  /** Part-monsters bred so far, carried into the next day so fractional rates add up. */
  spawnCarry: number;
}

/** What one day did to the dungeon. */
export interface DungeonDay {
  /** Monsters the bottom floor bred. */
  spawned: number;
  /** Monsters pushed up from each floor (index 0 = floor 1, which means "climbed out"). */
  pushedUp: number[];
  /** Monsters that climbed out of the pit, and their average level. */
  overflow: { count: number; level: number };
  /** Overflow strength = monsters × level, rounded (DESIGN.md §8). */
  strength: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function newDungeon(ix: Index): DungeonState {
  const floors = [...ix.lib.floors].sort((a, b) => a.depth - b.depth);
  return {
    floors: floors.map((f) => ({ population: f.startPopulation, level: f.depth })),
    days: 0,
    spawnCarry: 0,
  };
}

/** Monsters the bottom floor breeds per day right now. */
export function spawnRate(ix: Index, d: DungeonState): number {
  const r = ix.lib.dungeon;
  return r.spawnPerDay + r.spawnGrowthPerDay * d.days;
}

/** The weakest-to-strongest monster levels on a floor, for showing in town. */
export function levelBand(f: FloorPressure): [number, number] {
  return [round2(Math.max(1, f.level - 0.5)), round2(f.level + 0.5)];
}

/** Take monsters killed on each floor out of the population. Returns a new state. */
export function applyKills(d: DungeonState, killsByFloor: Record<number, number>): DungeonState {
  const out = structuredClone(d);
  for (const [depth, n] of Object.entries(killsByFloor)) {
    const f = out.floors[Number(depth) - 1];
    if (f) f.population = Math.max(0, f.population - n);
  }
  return out;
}

/** Mix `n` monsters of level `level` into a floor. */
function arrive(f: FloorPressure, n: number, level: number): void {
  if (n <= 0) return;
  f.level = (f.population * f.level + n * level) / (f.population + n);
  f.population += n;
}

/**
 * Push the weakest `n` monsters off a floor. Returns their level. Kept simple:
 * the floor's average doesn't move; its own pull back towards its depth does that.
 */
function evict(f: FloorPressure, n: number, drop: number): number {
  f.population -= n;
  return Math.max(1, f.level - drop);
}

/** Run one day. Returns the new state and what happened. */
export function dungeonDay(ix: Index, d: DungeonState): { dungeon: DungeonState; day: DungeonDay } {
  const rules = ix.lib.dungeon;
  const caps = [...ix.lib.floors].sort((a, b) => a.depth - b.depth).map((f) => f.capacity);
  const out = structuredClone(d);
  const bottom = out.floors.length - 1;

  // 1. The bottom floor breeds, at its own depth.
  const due = spawnRate(ix, out) + out.spawnCarry;
  const spawned = Math.floor(due);
  out.spawnCarry = round2(due - spawned);
  arrive(out.floors[bottom]!, spawned, bottom + 1);

  // 2. Push the extras up, bottom first, so a crowd can ripple all the way up in one day.
  const pushedUp = out.floors.map(() => 0);
  let overflow = { count: 0, level: 0 };
  for (let i = bottom; i >= 0; i--) {
    const f = out.floors[i]!;
    const extra = f.population - caps[i]!;
    if (extra <= 0) continue;
    const level = evict(f, extra, rules.evictedLevelDrop);
    pushedUp[i] = extra;
    if (i > 0) {
      arrive(out.floors[i - 1]!, extra, level);
    } else {
      overflow = { count: extra, level: round2(level) };
    }
  }

  // 3. Every floor settles part of the way back towards its own depth. Arrivals
  // push it up faster than this pulls it down only while the push-up keeps coming.
  out.floors.forEach((f, i) => {
    f.level = round2(Math.max(i + 1, f.level - rules.settlePerDay * (f.level - (i + 1))));
  });

  out.days += 1;
  const strength = Math.round(overflow.count * overflow.level);
  return { dungeon: out, day: { spawned, pushedUp, overflow, strength } };
}

/** What the expedition needs to know about each floor today. */
export function floorConditions(d: DungeonState): FloorPressure[] {
  return d.floors.map((f) => ({ ...f }));
}
