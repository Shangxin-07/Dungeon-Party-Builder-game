/**
 * Fog over the floors (M7.13, DESIGN.md §18.3). The pit map shows only what
 * the town knows, not the dungeon's real numbers:
 *
 * - the top floors as the Watchtower (or a lookout) sees them, today: roughly
 *   ("quiet", "busy", "crowded", "full"), or counted at a higher level;
 * - deeper floors as the last party or scouts found them, dated. Scouts count
 *   (rounded); an ordinary party only gets a feel. Word older than
 *   `scouting.fog.fadeDays` is forgotten.
 *
 * Nothing here changes how the dungeon works; it changes what the player sees.
 */
import type { Index } from "../library";
import type { Outing, TownState } from "./state";
import { effects, postEffects } from "./read";

/** Where the town's word on a floor comes from. */
export type FloorSource = "watch" | "scouts" | "party" | "none";

export interface FloorKnowledge {
  depth: number;
  source: FloorSource;
  /** How full it feels (a fog band name), unless nothing is known. */
  band?: string;
  /** Population, when someone counted: the watchtower exactly, scouts rounded. */
  population?: number;
  /** Monster level, from a party or scouts who met them. */
  level?: number;
  /** When and by whom (not for the watchtower, which is today). */
  day?: number;
  by?: string;
  daysAgo?: number;
  /** Older than the scouts' staleDays: it may have changed since. */
  stale: boolean;
}

/** How far the town can see from the pit's edge: floors roughly, and floors counted. */
export function watchRange(
  ix: Index,
  town: TownState,
  away: ReadonlySet<string> = new Set(),
): { floors: number; exact: number } {
  let floors = 0;
  let exact = 0;
  for (const e of [...effects(ix, town), ...postEffects(ix, town, away)]) {
    if (e.type !== "watch") continue;
    floors = Math.max(floors, e.floors);
    exact = Math.max(exact, e.exact);
  }
  return { floors, exact: Math.min(exact, floors) };
}

/** The fog band for a floor this full (population / capacity). */
export function fogBand(ix: Index, fullness: number): string {
  const bands = ix.lib.scouting.fog.bands;
  return (bands.find((b) => fullness < b.below) ?? bands.at(-1)!).name;
}

/** What the town knows about one floor today. */
export function floorKnowledge(
  ix: Index,
  town: TownState,
  depth: number,
  away: ReadonlySet<string> = new Set(),
): FloorKnowledge {
  const def = ix.floor(depth);
  const fog = ix.lib.scouting.fog;
  const ago = (day: number) => Math.max(0, town.day - day);
  // The freshest word from below, if it isn't too old to trust.
  const intel = town.intel[depth];
  const seen = town.sightings[depth];
  const word =
    intel && (!seen || intel.day >= seen.day)
      ? {
          source: "scouts" as const,
          day: intel.day,
          by: intel.by,
          population: intel.population,
          level: intel.level,
        }
      : seen
        ? { source: "party" as const, ...seen }
        : undefined;
  const fresh = word && ago(word.day) <= fog.fadeDays ? word : undefined;
  const stale = !!fresh && ago(fresh.day) > ix.lib.scouting.staleDays;
  const dated = fresh && {
    level: fresh.level,
    day: fresh.day,
    by: fresh.by,
    daysAgo: ago(fresh.day),
  };

  const watch = watchRange(ix, town, away);
  const floor = town.dungeon.floors[depth - 1];
  if (floor && depth <= watch.floors) {
    return {
      depth,
      source: "watch",
      band: fogBand(ix, floor.population / def.capacity),
      ...(depth <= watch.exact ? { population: floor.population } : {}),
      ...(dated ? { level: dated.level } : {}),
      stale: false,
    };
  }
  if (!fresh) return { depth, source: "none", stale: false };
  return {
    depth,
    source: fresh.source,
    band: fogBand(ix, fresh.population / def.capacity),
    ...(fresh.source === "scouts" ? { population: fresh.population } : {}),
    ...dated,
    stale,
  };
}

/** What the town knows about every floor. */
export const pitMap = (ix: Index, town: TownState, away: ReadonlySet<string> = new Set()) =>
  town.dungeon.floors.map((_, i) => floorKnowledge(ix, town, i + 1, away));

/**
 * A party is home: it brings a feel for every floor it walked, dated the last
 * time it was there. Numbers are the floor as the party left it (rounded to a
 * level the party could judge); a newer word from scouts isn't overwritten.
 */
export function recordSightings(ix: Index, t: TownState, o: Outing): void {
  const start = ix.lib.time.startHour;
  const last = new Map<number, number>();
  for (const e of o.result.log)
    if (e.floor > 0 && e.room > 0 && e.hour !== undefined) last.set(e.floor, e.hour);
  if (!last.size) return;
  for (const [depth, hour] of last) {
    const floor = t.dungeon.floors[depth - 1];
    if (!floor) continue;
    const day = o.left + Math.floor((start + hour) / 24);
    const old = t.sightings[depth];
    if (old && old.day > day) continue;
    t.sightings[depth] = {
      day,
      by: o.name,
      population: floor.population,
      level: Math.round(floor.level * 10) / 10,
    };
  }
}
