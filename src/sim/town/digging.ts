/**
 * Dig sites, read-only (M8.20, DESIGN.md §20): which floors are held, which
 * sites work, and what they give the town. The actions are in digs.ts.
 * Nothing here imports read.ts, so read.ts can use it.
 *
 * - A floor is **held** while a Seal Stone's gateway holds the stairs below
 *   it (set, not breached).
 * - A site **works** while its floor is held and quiet: no more monsters
 *   than content/digging.ts `quiet` of the floor's capacity. Trickle keeps a
 *   held floor stocked, so somebody has to keep hunting it.
 */
import type { BuildingEffect, DigSiteDef } from "../../content/types";
import type { ForwardCamp } from "../expedition";
import type { Index } from "../library";
import { stoneOf } from "../shards";
import type { TownState } from "./state";

/** Is this floor held: a gateway below it, standing? */
export const floorHeld = (town: TownState, floor: number) => {
  const s = town.dungeon.stones[floor];
  return !!s && !s.damaged;
};

/** Is this floor quiet enough for the diggers? */
export function floorQuiet(ix: Index, town: TownState, floor: number): boolean {
  const f = town.dungeon.floors[floor - 1];
  return !!f && f.population <= ix.floor(floor).capacity * ix.lib.digging.quiet;
}

/** Most monsters the floor can hold with its sites still working. */
export const quietBelow = (ix: Index, floor: number) =>
  Math.floor(ix.floor(floor).capacity * ix.lib.digging.quiet);

/** Sites a held floor has room for. */
export const digSlots = (ix: Index, floor: number) =>
  ix.lib.digging.slots.base + ix.lib.digging.slots.perFloor * floor;

/** The way the stone below this floor was forged ("cleansed", "bound"), if it's held. */
export const floorWay = (ix: Index, town: TownState, floor: number) => {
  const s = town.dungeon.stones[floor];
  return s ? stoneOf(ix, s.stone)?.way.id : undefined;
};

/** Can this kind of site go on this floor at all (the shrine and den need their way)? */
export const siteFits = (ix: Index, town: TownState, floor: number, def: DigSiteDef) =>
  !def.way || floorWay(ix, town, floor) === def.way;

/** Does this site work today? Built, its floor held and quiet. */
export function siteWorks(ix: Index, town: TownState, floor: number, id: string): boolean {
  const site = town.digs[floor]?.[id];
  return !!site && site.level > 0 && floorHeld(town, floor) && floorQuiet(ix, town, floor);
}

/** Every working site, with its level's definition. */
export function workingSites(ix: Index, town: TownState) {
  return Object.entries(town.digs).flatMap(([f, sites]) =>
    Object.entries(sites)
      .filter(([id]) => siteWorks(ix, town, Number(f), id))
      .map(([id, s]) => {
        const def = ix.digSite(id);
        return { floor: Number(f), def, level: def.levels[s.level - 1]! };
      }),
  );
}

/** Town-wide effects of the working sites (the shrine, the den). */
export const digEffects = (ix: Index, town: TownState): BuildingEffect[] =>
  workingSites(ix, town).flatMap((s) => s.level.effects ?? []);

/** The deepest working forward camp, for the next party (M8.20). */
export function forwardCamp(ix: Index, town: TownState): ForwardCamp | undefined {
  let best: ForwardCamp | undefined;
  for (const s of workingSites(ix, town))
    if (s.level.camp && (!best || s.floor > best.floor))
      best = { floor: s.floor, path: s.level.camp.path, rest: s.level.camp.rest };
  return best;
}

/** What a working mine sends up a day, from its floor. */
export function siteYields(
  floor: number,
  level: DigSiteDef["levels"][number],
): Record<string, number> {
  const out: Record<string, number> = { ...(level.yields ?? {}) };
  const deep = level.deepYields;
  if (deep && floor >= deep.from)
    for (const [id, n] of Object.entries(deep.materials)) out[id] = (out[id] ?? 0) + n;
  return out;
}
