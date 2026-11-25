/**
 * Dig sites (M8.20, DESIGN.md §20): building on held floors. The town grows
 * downward: a forward camp, a mine, and a shrine (over a cleansed stone) or
 * a den (over a bound one). Read-only helpers are in digging.ts.
 *
 * - Building or raising a site pays its gold and materials, then the
 *   diggers take its days. They only dig while the floor is held and quiet.
 * - A site never goes away: when the gateway breaches or the floor fills
 *   up, it just stops working until it's held and quiet again.
 */
import type { Index } from "../library";
import { type DigSite, type TownState, TownError } from "./state";
import { addMaterials, book, edit, news, useMaterials } from "./internal";
import { materialsShort } from "./read";
import {
  digSlots,
  floorHeld,
  floorQuiet,
  quietBelow,
  siteFits,
  siteWorks,
  siteYields,
} from "./digging";

/** Why this site can't be built (or raised a level) on this floor now, or undefined. */
export function cantDig(ix: Index, town: TownState, floor: number, id: string): string | undefined {
  const def = ix.digSite(id);
  if (!town.dungeon.stones[floor])
    return `Floor ${floor} isn't held: set a Seal Stone on the stairs below it first.`;
  if (!floorHeld(town, floor))
    return `The gateway below floor ${floor} is breached: mend it first.`;
  if (!siteFits(ix, town, floor, def)) return `Only over a ${def.way} Seal Stone.`;
  const sites = town.digs[floor] ?? {};
  const site = sites[id];
  if (site?.work) return "The diggers are already at it.";
  const next = def.levels[site?.level ?? 0];
  if (!next) return "It's as big as it gets.";
  if (!site && Object.keys(sites).length >= digSlots(ix, floor))
    return `Floor ${floor} has room for ${digSlots(ix, floor)} sites, and they're taken.`;
  if (!floorQuiet(ix, town, floor))
    return `Floor ${floor} is too busy to dig: hunt it down to ${quietBelow(ix, floor)} monsters.`;
  if (town.gold < next.cost) return "Not enough gold.";
  const short = materialsShort(ix, town, next.materials);
  return short ? `Short of ${short}.` : undefined;
}

/** Build a site on a held floor, or raise it a level: pay, and the diggers start. */
export function dig(ix: Index, town: TownState, floor: number, id: string): TownState {
  const why = cantDig(ix, town, floor, id);
  if (why) throw new TownError(why);
  const t = edit(town);
  const sites = { ...(t.digs[floor] ?? {}) };
  const site: DigSite = { ...(sites[id] ?? { level: 0 }) };
  const next = ix.digSite(id).levels[site.level]!;
  book(t, "built", -next.cost);
  useMaterials(t, next.materials);
  site.work = { level: site.level + 1, daysLeft: next.days };
  sites[id] = site;
  t.digs = { ...t.digs, [floor]: sites };
  return t;
}

/**
 * The dig sites' day (changes `t`): diggers at work on held, quiet floors,
 * and what the working mines send up.
 */
export function digDay(ix: Index, t: TownState): void {
  for (const [f, sites] of Object.entries(t.digs)) {
    const floor = Number(f);
    for (const [id, site] of Object.entries(sites)) {
      const def = ix.digSite(id);
      if (site.work && floorHeld(t, floor) && floorQuiet(ix, t, floor)) {
        site.work.daysLeft -= 1;
        if (site.work.daysLeft <= 0) {
          site.level = site.work.level;
          delete site.work;
          news(
            t,
            site.level === 1
              ? `The ${def.name.toLowerCase()} on floor ${floor} is dug out and working.`
              : `The ${def.name.toLowerCase()} on floor ${floor} is now level ${site.level}.`,
            "good",
          );
        }
      }
      if (!siteWorks(ix, t, floor, id)) continue;
      const yields = siteYields(floor, def.levels[site.level - 1]!);
      if (!Object.keys(yields).length) continue;
      const carry = { ...(site.carry ?? {}) };
      const up: Record<string, number> = {};
      for (const [m, n] of Object.entries(yields)) {
        const due = Math.round(((carry[m] ?? 0) + n) * 100) / 100;
        up[m] = Math.floor(due);
        carry[m] = Math.round((due - up[m]) * 100) / 100;
      }
      site.carry = carry;
      addMaterials(t, up);
    }
  }
}

/** Every held floor's sites, for the panel: what's there, working or not, and what could go up. */
export function digView(ix: Index, town: TownState) {
  return Object.keys(town.dungeon.stones)
    .map(Number)
    .sort((a, b) => a - b)
    .map((floor) => {
      const sites = town.digs[floor] ?? {};
      return {
        floor,
        held: floorHeld(town, floor),
        quiet: floorQuiet(ix, town, floor),
        quietBelow: quietBelow(ix, floor),
        slots: digSlots(ix, floor),
        sites: ix.lib.digSites
          .filter((d) => siteFits(ix, town, floor, d) || sites[d.id])
          .map((def) => {
            const site = sites[def.id];
            return {
              def,
              site,
              works: siteWorks(ix, town, floor, def.id),
              now: site?.level ? def.levels[site.level - 1] : undefined,
              next: def.levels[site?.level ?? 0],
              why: cantDig(ix, town, floor, def.id),
            };
          }),
      };
    });
}
