/**
 * The Hearthstone's shards in town (DESIGN.md §20): which have been found,
 * which a trip can still find, the Library's work on the ones it finds, and
 * how far each floor is towards its Seal Stone. Where the shards are is
 * content (content/shards/); how a party finds them is in the expedition.
 */
import type { ShardSetDef, ShardSource } from "../../content/types";
import type { ExpeditionResult } from "../expedition";
import type { Index } from "../library";
import { monsterTier } from "../research";
import { shardPlace, shardPlaces, shardSetOpen, stoneName } from "../shards";
import type { TownState } from "./state";
import { gainRenown } from "./renown";
import { news } from "./internal";

/** Shard sources a party still out has found: the town doesn't know yet, but they're gone. */
function takenBelow(town: TownState): Set<string> {
  return new Set(town.outings.flatMap((o) => o.result.shards ?? []));
}

/** Has this shard been found (by a party home, lost, or still out)? */
export const shardTaken = (town: TownState, id: string, below = takenBelow(town)) =>
  town.shards[id]?.found !== undefined || below.has(id);

/**
 * Shards a party setting off now could find: every bearer and cache not found
 * yet, and the Library's finds once it has worked out where they are.
 */
export function openShards(ix: Index, town: TownState): string[] {
  const below = takenBelow(town);
  const out: string[] = [];
  for (const [id, { set, source }] of shardPlaces(ix)) {
    if (!shardSetOpen(town.dungeon.floors.length, set)) continue;
    if (shardTaken(town, id, below)) continue;
    if (source.kind === "library" && town.shards[id]?.lead === undefined) continue;
    out.push(id);
  }
  return out;
}

/** How many of this floor's shards are in the store room. */
export const shardsHeld = (town: TownState, set: ShardSetDef) => town.materials[set.item] ?? 0;

/**
 * A trip's shards are found (DESIGN.md §20): on the day the town hears of the
 * trip, whether they came home or lie below with a lost party. `home`: news.
 */
export function noteShards(ix: Index, t: TownState, result: ExpeditionResult, home: boolean): void {
  for (const id of result.shards ?? []) {
    if (!shardPlaces(ix).has(id)) continue;
    t.shards[id] = { ...t.shards[id], found: t.day };
  }
  if (!home) return;
  // The valley hears of every shard the guild brings home (M8.19).
  gainRenown(ix, t, "shard", (result.shards ?? []).filter((id) => shardPlaces(ix).has(id)).length);
  const sets = new Set((result.shards ?? []).flatMap((id) => shardPlaces(ix).get(id)?.set ?? []));
  for (const set of sets) {
    const held = shardsHeld(t, set);
    const need = set.shards.length;
    news(
      t,
      held >= need
        ? `A shard of the ${stoneName(set)} came home from below. The guild has all ${need} of floor ${set.floor}'s shards: enough to forge its Seal Stone.`
        : `A shard of the ${stoneName(set)} came home from below: ${held} of the ${need} that would seal floor ${set.floor}.`,
      "good",
    );
  }
}

/** A Library shard is open to study: not found, not worked out, and every monster it needs Studied. */
export function shardStudyOpen(ix: Index, town: TownState, id: string): boolean {
  const { set, source } = shardPlace(ix, id);
  if (source.kind !== "library" || shardTaken(town, id)) return false;
  if (!shardSetOpen(town.dungeon.floors.length, set)) return false;
  if (town.shards[id]?.lead !== undefined) return false;
  return source.monsters.every((m) => monsterTier(ix, town, m) >= 2);
}

/** Research points into finding a shard; news when the Library works out where it is. */
export function studyShard(ix: Index, t: TownState, id: string, points: number): void {
  const { source } = shardPlace(ix, id);
  if (source.kind !== "library" || points <= 0) return;
  const now = Math.round(((t.shards[id]?.points ?? 0) + points) * 10) / 10;
  t.shards[id] = { ...t.shards[id], points: now };
  if (now >= source.points) {
    t.shards[id] = { ...t.shards[id], lead: t.day };
    news(t, source.lead, "good");
  }
}

/** Where one shard stands, for the Hearthstone panel. */
export interface ShardStatus {
  id: string;
  kind: ShardSource["kind"];
  /** The floor a party has to go to for it. */
  floor: number;
  /** "found" (the day is in `day`), "lead" (the Library knows where), "open". */
  state: "found" | "lead" | "open";
  day?: number;
  /** What the guild knows, in words. */
  text: string;
  /** Library shards: points so far and needed, once it can be studied. */
  points?: number;
  need?: number;
}

/** Every floor's shards: how many are in the store, how many it takes, and where the rest are. */
export function shardProgress(
  ix: Index,
  town: TownState,
): { set: ShardSetDef; held: number; need: number; shards: ShardStatus[] }[] {
  const below = takenBelow(town);
  const open = (ix.lib.shards ?? []).filter((set) => shardSetOpen(town.dungeon.floors.length, set));
  return open.map((set) => ({
    set,
    held: shardsHeld(town, set),
    need: set.shards.length,
    shards: set.shards.map((source): ShardStatus => {
      const s = town.shards[source.id];
      const base = { id: source.id, kind: source.kind, floor: source.floor };
      if (s?.found !== undefined)
        return { ...base, state: "found", day: s.found, text: foundWords(ix, source) };
      if (below.has(source.id)) return { ...base, state: "open", text: source.hint };
      if (source.kind === "library") {
        if (s?.lead !== undefined)
          return {
            ...base,
            state: "lead",
            day: s.lead,
            text: `The Library has marked where it lies on floor ${source.floor}. The next party through can dig it out.`,
          };
        const ready = shardStudyOpen(ix, town, source.id);
        const names = source.monsters.map((m) => ix.monster(m).name);
        return {
          ...base,
          state: "open",
          text: ready
            ? `${source.hint} It can be studied at the Library now.`
            : `${source.hint} (Needs ${names.join(" and ")} Studied.)`,
          ...(ready ? { points: s?.points ?? 0, need: source.points } : {}),
        };
      }
      return { ...base, state: "open", text: source.hint };
    }),
  }));
}

function foundWords(ix: Index, source: ShardSource): string {
  if (source.kind === "bearer") return `Taken from ${ix.monster(source.monster).name}.`;
  if (source.kind === "cache") return `Found hidden on floor ${source.floor}.`;
  return `Dug out on floor ${source.floor}, where the Library said.`;
}
