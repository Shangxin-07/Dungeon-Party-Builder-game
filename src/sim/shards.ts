/**
 * The Hearthstone's shards (DESIGN.md §20): where each one is, by content.
 * Pure reading; what the guild has found is in town/shards.ts, and how a party
 * finds them below is in expedition/run.ts and fights.ts.
 */
import { sealStoneId, type SealWay, type ShardSetDef, type ShardSource } from "../content/types";
import type { Index } from "./library";

export interface ShardPlace {
  set: ShardSetDef;
  source: ShardSource;
}

const places = new WeakMap<object, Map<string, ShardPlace>>();

/** Every shard source in the content, by id. */
export function shardPlaces(ix: Index): Map<string, ShardPlace> {
  let map = places.get(ix.lib);
  if (!map) {
    map = new Map();
    for (const set of ix.lib.shards ?? [])
      for (const source of set.shards) map.set(source.id, { set, source });
    places.set(ix.lib, map);
  }
  return map;
}

/** One shard source and its set. Throws on an unknown id. */
export function shardPlace(ix: Index, id: string): ShardPlace {
  const p = shardPlaces(ix).get(id);
  if (!p) throw new Error(`Unknown shard "${id}"`);
  return p;
}

/** The stone a set's shards come from (M8.37): "Hearthstone" unless the set says. */
export const stoneName = (set: ShardSetDef): string => set.stone ?? "Hearthstone";

/**
 * Can the guild look for this set's shards yet (M8.37)? Only once there are
 * stairs below its floor to seal: Act Two's sets wait for the heart to be shut.
 */
export const shardSetOpen = (floorsOpen: number, set: ShardSetDef): boolean =>
  set.floor < floorsOpen;

/** The shard set that seals this floor, if there is one. */
export const shardSetFor = (ix: Index, floor: number): ShardSetDef | undefined =>
  (ix.lib.shards ?? []).find((s) => s.floor === floor);

/** How many shards it takes to forge this floor's Seal Stone (0: it can't be sealed). */
export const shardsNeeded = (ix: Index, floor: number): number =>
  shardSetFor(ix, floor)?.shards.length ?? 0;

/** Is this monster a shard-bearer? */
export const isShardBearer = (ix: Index, monsterId: string): boolean =>
  [...shardPlaces(ix).values()].some(
    (p) => p.source.kind === "bearer" && p.source.monster === monsterId,
  );

/** A Seal Stone (M8.17): the floor it seals and how it was forged. */
export interface StonePlace {
  set: ShardSetDef;
  way: SealWay;
}

const stones = new WeakMap<object, Map<string, StonePlace>>();

/** The floor and way of a Seal Stone item, or undefined if it isn't one. */
export function stoneOf(ix: Index, itemId: string): StonePlace | undefined {
  let map = stones.get(ix.lib);
  if (!map) {
    map = new Map();
    for (const set of ix.lib.shards ?? [])
      for (const way of ix.lib.sealing?.ways ?? []) map.set(sealStoneId(set, way.id), { set, way });
    stones.set(ix.lib, map);
  }
  return map.get(itemId);
}

/** Things nobody leaves behind: shards and Seal Stones. */
export const precious = (ix: Index, itemId: string): boolean => {
  const tags = ix.item(itemId).tags;
  return tags.includes("shard") || tags.includes("seal-stone");
};
