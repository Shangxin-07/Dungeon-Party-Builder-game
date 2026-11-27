/**
 * The dungeon over time (DESIGN.md §3, §4). Each floor has a population, a
 * capacity and an average monster level. Every day:
 *
 * 1. The bottom floor breeds new monsters. The rate creeps up day by day.
 * 2. A floor over capacity pushes its weakest monsters up to the floor above,
 *    where they arrive stronger than the locals and raise that floor's level.
 * 3. Floor 1's extra climb out of the pit: the overflow the town has to face.
 *
 * A sealed stairhead (M7.16) stops step 2 at those stairs: the floor below
 * keeps its extras, and they wear the seal down until it gives way. A Seal
 * Stone (M8.17) becomes a gateway (M8.18) the town sets: Shut holds them all
 * back, Trickle lets a few weak ones up, Open lets everything up. Held back,
 * the floor below strains the gateway, and past its limit it breaches: open
 * until the town mends it.
 *
 * Once the Hearthstone's heart is shut off (M8.22), the floors below it open
 * (Act Two, §21): the stairs under the Delve are found, and the new bottom
 * floor breeds instead, starting afresh. With no floors below the heart (or
 * none open yet), step 1 stops for good.
 *
 * Every floor also settles a little way back towards its usual level each day,
 * so killing monsters (which makes room and stops the push-up) lets it calm down.
 * Monster levels are depth-equivalent: level 2 means "as strong as floor 2",
 * so a floor at level 1.6 rolls encounters sized between floor 1 and floor 2.
 *
 * No randomness here: the same dungeon and the same kills give the same day,
 * which is what lets a watchtower see the next night coming.
 */
import type { CoreRules, GatewaySetting } from "../content/types";
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
  /**
   * Barricaded stairheads (M7.16), by the floor above them: seals[1] holds
   * the stairs between floors 1 and 2.
   */
  seals?: Record<number, Seal>;
  /**
   * Stairs shut for good with a Seal Stone (M8.17, DESIGN.md §20), keyed the
   * same way: nothing comes up them again, and nothing wears them down.
   */
  stones: Record<number, StoneSeal>;
  /**
   * The pit's hearts (M8.22, M8.38, DESIGN.md §20-21), by id
   * (content/hearts/): each beating, or shut off for good.
   */
  hearts: Record<string, CoreState>;
}

/** A heart at the bottom of its act (M8.22). */
export interface CoreState {
  /** Parties that have reached it. */
  reached: number;
  /** Shut off for good: the town day, and who did it. Its floor breeds no more. */
  shut: { day: number; by: string } | null;
  /**
   * The last heart only (M8.41): what the guild did with its stone once it was
   * still, and on what day. Not chosen yet while it's left out.
   */
  way?: { id: string; day: number };
}

/** A Seal Stone set on a flight of stairs (M8.17): a gateway (M8.18). */
export interface StoneSeal {
  /** The stone's item id (one per floor and way, content/sealstones.ts). */
  stone: string;
  /** Town day it was set, and who set it. */
  day: number;
  by?: string;
  /** How much it lets up (M8.18). A new gateway is Shut. */
  setting: GatewaySetting;
  /** How hard the floor below is leaning on it; it breaches at its level's limit. */
  strain: number;
  /** Gateway level, from 1 (content/sealing.ts gateway.levels). */
  level: number;
  /** Breached and not yet mended: it stands open whatever it's set to. */
  damaged: boolean;
}

/** A barricade across the top of a flight of stairs (M7.16, DESIGN.md §18.3b). */
export interface Seal {
  /** content/barricades/ */
  barricade: string;
  strength: number;
  /** Strength when it was built. */
  max: number;
  /** Town day it went up, and who put it up. */
  day: number;
  by?: string;
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
  /** Seals that gave way today, by the floor above them (M7.16). */
  broke?: number[];
  /** Gateways that breached today, and ones that began to creak (M8.18). */
  breached?: number[];
  strained?: number[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** One heart's state (M8.38). Every heart in the content has one (newDungeon, addNewHearts). */
export function heartState(d: Pick<DungeonState, "hearts">, id: string): CoreState {
  const s = d.hearts[id];
  if (!s) throw new Error(`No state for heart "${id}"`);
  return s;
}

/** The heart on this floor, if there is one (M8.38). */
export const heartOn = (ix: Index, floor: number): CoreRules | undefined =>
  ix.lib.hearts.find((h) => h.floor === floor);

/**
 * The acts open in this dungeon (§21): Act One, then one more for each heart
 * shut off in order (the Hearthstone opens Act Two, the Coalstone Act Three).
 */
export function actsOpen(ix: Index, d: Pick<DungeonState, "hearts">): number {
  let acts = 1;
  for (const h of ix.lib.hearts) {
    if (!heartState(d, h.id).shut) break;
    acts++;
  }
  return acts;
}

/** The heart the guild is working towards: the first still beating, if any (M8.38). */
export const nextHeart = (ix: Index, d: Pick<DungeonState, "hearts">): CoreRules | undefined =>
  ix.lib.hearts.find((h) => !heartState(d, h.id).shut);

/** The floor definitions open in an act, top down. */
export function floorsOpen(ix: Index, acts: number) {
  return [...ix.lib.floors].filter((f) => (f.act ?? 1) <= acts).sort((a, b) => a.depth - b.depth);
}

export function newDungeon(ix: Index): DungeonState {
  const floors = floorsOpen(ix, 1);
  return {
    floors: floors.map((f) => ({ population: f.startPopulation, level: f.depth })),
    days: 0,
    spawnCarry: 0,
    stones: {},
    hearts: Object.fromEntries(ix.lib.hearts.map((h) => [h.id, { reached: 0, shut: null }])),
  };
}

/** Give a dungeon a state for every heart added to the game since (M8.38). Changes `d`. */
export function addNewHearts(ix: Index, d: DungeonState): boolean {
  const missing = ix.lib.hearts.filter((h) => !d.hearts[h.id]);
  for (const h of missing) d.hearts = { ...d.hearts, [h.id]: { reached: 0, shut: null } };
  return missing.length > 0;
}

/**
 * Give a dungeon the floors it should have and doesn't yet, as a new game
 * would start them: floors added to the game since (M6.21: floors 4 and 5),
 * and an act's floors when it opens (§21). Changes `d`. Returns whether it did.
 */
export function addNewFloors(ix: Index, d: DungeonState): boolean {
  const floors = floorsOpen(ix, actsOpen(ix, d));
  if (d.floors.length >= floors.length) return false;
  for (const f of floors.slice(d.floors.length))
    d.floors.push({ population: f.startPopulation, level: f.depth });
  return true;
}

/**
 * Monsters the bottom floor breeds per day right now. A stilled heart's floor
 * breeds nothing; below it (§21) the new bottom starts again from the day the
 * last heart went still.
 */
export function spawnRate(ix: Index, d: DungeonState): number {
  const r = ix.lib.dungeon;
  const bottom = heartOn(ix, d.floors.length);
  if (bottom && heartState(d, bottom.id).shut) {
    // A bound stone (M8.41) works for the guild, and its floor never quite sleeps.
    const way = bottom.ways?.find((w) => w.id === heartState(d, bottom.id).way?.id);
    return way?.breeds ?? 0;
  }
  const since = Math.max(0, ...ix.lib.hearts.map((h) => heartState(d, h.id).shut?.day ?? 0));
  return r.spawnPerDay + r.spawnGrowthPerDay * Math.max(0, d.days - since);
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
  const defs = floorsOpen(ix, actsOpen(ix, d));
  const caps = defs.map((f) => f.capacity);
  const out = structuredClone(d);
  const bottom = out.floors.length - 1;

  // 1. The bottom floor breeds, at its own depth: the heart's floor until it's shut off
  // (M8.22), then the bottom of the floors below it (§21).
  const due = spawnRate(ix, out) + out.spawnCarry;
  const spawned = Math.floor(due);
  out.spawnCarry = round2(due - spawned);
  arrive(out.floors[bottom]!, spawned, bottom + 1);

  // 2. Push the extras up, bottom first, so a crowd can ripple all the way up in one day.
  // A seal over the stairs holds them back, and they wear it down (M7.16).
  const pushedUp = out.floors.map(() => 0);
  let overflow = { count: 0, level: 0 };
  const broke: number[] = [];
  const breached: number[] = [];
  const strained: number[] = [];
  for (let i = bottom; i >= 0; i--) {
    const f = out.floors[i]!;
    const extra = f.population - caps[i]!;
    // A Seal Stone's gateway (M8.17, M8.18) holds them back, or some of them.
    const stone = i > 0 ? out.stones[i] : undefined;
    if (stone) {
      const held = gatewayDay(ix, stone, f, caps[i]!);
      if (held.strained) strained.push(i);
      if (held.breached) breached.push(i);
      if (held.up >= 0) {
        // Penned in, they turn on each other. What Trickle lets up is the weak ones.
        f.population = Math.min(f.population, Math.floor(caps[i]! * rules.seals.crowding));
        if (held.up) {
          arrive(out.floors[i - 1]!, held.up, i);
          pushedUp[i] = held.up;
        }
        continue;
      }
    }
    const seal = i > 0 ? out.seals?.[i] : undefined;
    if (seal) {
      const press = rules.seals.wearPerDay + Math.max(0, extra) * rules.seals.perMonster;
      seal.strength = round2(seal.strength - press);
      if (seal.strength > 0) {
        // Penned in, they turn on each other: a sealed floor holds only so many.
        f.population = Math.min(f.population, Math.floor(caps[i]! * rules.seals.crowding));
        continue;
      }
      delete out.seals![i];
      broke.push(i);
    }
    if (extra <= 0) continue;
    const level = evict(f, extra, defs[i]?.evictedLevelDrop ?? rules.evictedLevelDrop);
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
  if (out.seals && !Object.keys(out.seals).length) delete out.seals;
  return {
    dungeon: out,
    day: {
      spawned,
      pushedUp,
      overflow,
      strength,
      ...(broke.length ? { broke } : {}),
      ...(breached.length ? { breached } : {}),
      ...(strained.length ? { strained } : {}),
    },
  };
}

/** The strain a gateway breaches at. */
export const gatewayLimit = (ix: Index, s: StoneSeal) =>
  ix.lib.sealing.gateway.levels[Math.min(s.level, ix.lib.sealing.gateway.levels.length) - 1]!.limit;

/**
 * One day of a gateway (M8.18), changing `s` and taking what it lets up off
 * `f`. `up` is how many it let up, or -1 if it holds nothing back today
 * (Open, breached, or breaching now): then the floor pushes up as if it
 * weren't there.
 */
function gatewayDay(
  ix: Index,
  s: StoneSeal,
  f: FloorPressure,
  cap: number,
): { up: number; breached?: boolean; strained?: boolean } {
  const g = ix.lib.sealing.gateway;
  const ease = () => (s.strain = round2(Math.max(0, s.strain - g.ease)));
  if (s.damaged || s.setting === "open") {
    ease();
    return { up: -1 };
  }
  const trickle = s.setting === "trickle";
  const up = trickle ? Math.min(g.trickle.perDay, Math.floor(f.population)) : 0;
  const over = f.population - up - cap;
  const limit = gatewayLimit(ix, s);
  const before = s.strain;
  if (over > 0)
    s.strain = round2(s.strain + over * g.strainPerMonster * (trickle ? g.trickle.strain : 1));
  else ease();
  if (s.strain >= limit) {
    s.damaged = true;
    s.strain = 0;
    return { up: -1, breached: true };
  }
  f.population -= up;
  const warn = limit * g.warnAt;
  return { up, ...(before < warn && s.strain >= warn ? { strained: true } : {}) };
}

/**
 * Days until a gateway breaches if the floor below stays as it is now
 * (M8.18): a guess, since the floor below only gets fuller. Infinity if
 * nothing strains it.
 */
export function gatewayDays(ix: Index, d: DungeonState, above: number): number {
  const s = d.stones[above];
  if (!s || s.damaged || s.setting === "open") return Infinity;
  const g = ix.lib.sealing.gateway;
  const below = d.floors[above];
  const cap = ix.floor(above + 1).capacity;
  const trickle = s.setting === "trickle";
  const over = (below?.population ?? 0) - (trickle ? g.trickle.perDay : 0) - cap;
  const press = over * g.strainPerMonster * (trickle ? g.trickle.strain : 1);
  return press > 0 ? Math.ceil((gatewayLimit(ix, s) - s.strain) / press) : Infinity;
}

/**
 * Days a seal should hold if the floor below stays as it is now (M7.16): a
 * guess, since the floor below only gets fuller. Infinity if nothing wears it.
 */
export function sealDays(ix: Index, d: DungeonState, above: number): number {
  const seal = d.seals?.[above];
  if (!seal) return 0;
  const below = d.floors[above];
  const cap = ix.floor(above + 1).capacity;
  const rules = ix.lib.dungeon.seals;
  const press = rules.wearPerDay + Math.max(0, (below?.population ?? 0) - cap) * rules.perMonster;
  return press > 0 ? Math.ceil(seal.strength / press) : Infinity;
}
