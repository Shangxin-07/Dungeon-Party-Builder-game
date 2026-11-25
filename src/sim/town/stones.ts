/**
 * Seal Stones (M8.17, DESIGN.md §20): the stairs shut for good. A floor's
 * shards are forged into its stone at the Temple (cleansed) or the Black
 * Market (bound), as a workshop job (content/sealstones.ts makes the
 * recipes). A party carries the stone down and sets it on the stairs below
 * the floor it seals; the floor below sends a surge up to stop it.
 *
 * - The stone leaves the store when the party sets off. If the party never
 *   sets it, it comes home in the packs; if the party is lost, it lies with
 *   them, and monsters may carry it off like a lost hero's gear.
 * - The stairs are shut on the day the party set it, whenever the town hears,
 *   and any barricade there comes down: it isn't needed.
 * - The guild feels the stone's way: a good deed or an evil one.
 */
import { stoneOrder, type StandingOrders } from "../expedition";
import type { Index } from "../library";
import { stoneOf } from "../shards";
import { type Outing, type TownState, TownError } from "./state";
import { gainRenown } from "./renown";
import { edit, news, useMaterials } from "./internal";
import { guildFeels } from "./days";

/** Pick a Seal Stone for the next party to set, or none. The party goes to the floor it seals. */
export function setStone(ix: Index, town: TownState, stone: string | undefined): TownState {
  const t = edit(town);
  if (!stone) {
    delete t.orders.stone;
    return t;
  }
  const place = stoneOf(ix, stone);
  if (!place) throw new TownError("That isn't a Seal Stone.");
  t.orders = { ...t.orders, stone, targetFloor: place.set.floor };
  // The stone shuts the stairs for good: no barricade needed as well.
  delete t.orders.seal;
  delete t.orders.core;
  return t;
}

/** Are the stairs below this floor shut for good? */
export const stoneSealed = (town: TownState, floor: number) => !!town.dungeon.stones[floor];

/** Why the party can't carry this stone down, or undefined if it can (or isn't carrying one). */
export function cantStone(ix: Index, town: TownState, orders: StandingOrders): string | undefined {
  const id = stoneOrder(orders);
  if (!id) return undefined;
  const place = stoneOf(ix, id);
  if (!place) return "That isn't a Seal Stone.";
  const name = ix.item(id).name;
  if (orders.targetFloor !== place.set.floor)
    return `The ${name} seals the stairs below floor ${place.set.floor}: send the party to floor ${place.set.floor}.`;
  if (stoneSealed(town, place.set.floor))
    return `The stairs below floor ${place.set.floor} are already held by a Seal Stone.`;
  if ((town.materials[id] ?? 0) < 1) return `The ${name} isn't in the store.`;
  return undefined;
}

/** The party sets off with the stone: it leaves the store (changes `t`). */
export function carryStone(ix: Index, t: TownState, orders: StandingOrders): void {
  const id = stoneOrder(orders);
  if (!id || cantStone(ix, t, orders)) return;
  useMaterials(t, { [id]: 1 });
}

/**
 * The stone is set in the dungeon once the town's days reach the day the
 * party set it (changes `t`). `all`: the trip is over, set it now.
 */
export function placeStone(_ix: Index, t: TownState, o: Outing, all = false): void {
  const s = o.result.stoneSet;
  if (!s || o.stonePlaced) return;
  if (!all && t.day - o.left < s.day) return;
  o.stonePlaced = true;
  const stones = {
    ...t.dungeon.stones,
    [s.floor]: {
      stone: s.stone,
      day: o.left + s.day,
      by: o.name,
      // A new gateway (M8.18) is Shut, at level 1.
      setting: "shut" as const,
      strain: 0,
      level: 1,
      damaged: false,
    },
  };
  const seals = { ...(t.dungeon.seals ?? {}) };
  delete seals[s.floor];
  t.dungeon = { ...t.dungeon, stones, seals };
  if (!Object.keys(seals).length) delete t.dungeon.seals;
}

/**
 * The town hears a stone was set (changes `t`): the news, and how the guild
 * feels about the way it was forged. `home`: the party is back to tell it.
 */
export function stoneNews(ix: Index, t: TownState, o: Outing): void {
  const s = o.result.stoneSet;
  if (!s) return;
  placeStone(ix, t, o, true);
  const place = stoneOf(ix, s.stone);
  if (!place) return;
  news(
    t,
    `${o.name} set the ${ix.item(s.stone).name} on the stairs below floor ${s.floor}. ` +
      `Its gateway is Shut: nothing comes up unless the town lets it (the Hearthstone panel).`,
    "good",
  );
  guildFeels(ix, t, { [place.way.fact]: 1 }, new Set());
  gainRenown(ix, t, "stone");
}
