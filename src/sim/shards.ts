/**
 * The Hearthstone's shards (DESIGN.md §20): where each one is, by content.
 * Pure reading; what the guild has found is in town/shards.ts, and how a party
 * finds them below is in expedition/run.ts and fights.ts.
 */
import type { ShardSetDef, ShardSource } from "../content/types";
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
