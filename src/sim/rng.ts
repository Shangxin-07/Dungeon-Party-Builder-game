/**
 * Seeded random number generator (mulberry32).
 *
 * Every random choice in the simulation goes through an Rng, so the same seed
 * always produces the same expedition. Never use Math.random() in src/sim.
 */
export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [min, max], inclusive. */
  int(min: number, max: number): number;
  /** True with the given probability (0..1). */
  chance(probability: number): boolean;
  /** A random element of a non-empty array. */
  pick<T>(items: readonly T[]): T;
  /** Current internal state, for saving and resuming. */
  state(): number;
}

export function createRng(seed: number): Rng {
  let s = seed >>> 0;

  const next = (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    int(min, max) {
      if (max < min) throw new RangeError(`int(${min}, ${max}): max < min`);
      return min + Math.floor(next() * (max - min + 1));
    },
    chance(probability) {
      return next() < probability;
    },
    pick(items) {
      if (items.length === 0) throw new RangeError("pick() on an empty array");
      return items[Math.floor(next() * items.length)] as (typeof items)[number];
    },
    state: () => s,
  };
}
