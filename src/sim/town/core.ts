/**
 * The Hearthstone's heart (M8.22, DESIGN.md §20): the end goal. Once every
 * floor above the core's floor is held by a Seal Stone whose gateway stands,
 * a party can be sent down to shut the heart off. It fights the heart's
 * guardian, cornered; if it wins, the heart is shut for good.
 *
 * - The town learns what happened at the heart when it hears of the trip:
 *   the party is home, or lost (the heart stays shut even if they fall on
 *   the way back up).
 * - Shut, the Hearthstone's floor breeds no more (dungeon.ts) and the dead no
 *   longer rise. Act Two (§21) opens: the floors below the heart are added,
 *   and the new bottom floor breeds and pushes its extras up as before.
 * - Leaving it beating is fine too: it's never forced.
 */
import { addNewFloors } from "../dungeon";
import { coreOrder, type StandingOrders } from "../expedition";
import type { Index } from "../library";
import { type Outing, type TownState } from "./state";
import { edit, news } from "./internal";
import { gainRenown } from "./renown";

/** Send the next party for the heart, or not. It goes to the core's floor. */
export function setCore(ix: Index, town: TownState, on: boolean): TownState {
  const t = edit(town);
  if (!on) {
    delete t.orders.core;
    return t;
  }
  t.orders = { ...t.orders, core: true, targetFloor: ix.lib.core.floor };
  // The heart is the whole trip: no stairs to see to as well.
  delete t.orders.seal;
  delete t.orders.stone;
  return t;
}

/** Floors above the heart not yet held by a standing gateway, top first. */
export function coreBlockers(ix: Index, town: TownState): { floor: number; why: string }[] {
  const out: { floor: number; why: string }[] = [];
  for (let f = 1; f < ix.lib.core.floor; f++) {
    const s = town.dungeon.stones[f];
    if (!s) out.push({ floor: f, why: `the stairs below floor ${f} have no Seal Stone` });
    else if (s.damaged) out.push({ floor: f, why: `the gateway below floor ${f} is breached` });
  }
  return out;
}

/** Can a party go for the heart at all (whoever goes)? Why not, or undefined. */
export function cantReachCore(ix: Index, town: TownState): string | undefined {
  if (town.dungeon.core.shut) return "The heart of the Hearthstone is already shut off.";
  const first = coreBlockers(ix, town)[0];
  if (first) {
    const why = first.why.charAt(0).toUpperCase() + first.why.slice(1);
    return `Every floor above the heart has to be held first. ${why}.`;
  }
  return undefined;
}

/** Why these orders can't go for the heart, or undefined (also when they don't). */
export function cantCore(ix: Index, town: TownState, orders: StandingOrders): string | undefined {
  if (!coreOrder(orders)) return undefined;
  if (orders.targetFloor !== ix.lib.core.floor)
    return `The heart lies on floor ${ix.lib.core.floor}: send the party there.`;
  return cantReachCore(ix, town);
}

/**
 * The town hears what happened at the heart (changes `t`): a party has been
 * there, and maybe the heart is shut off for good.
 */
export function coreNews(ix: Index, t: TownState, o: Outing): void {
  const c = o.result.core;
  if (!c) return;
  const core = t.dungeon.core;
  const shut = c.shut && !core.shut ? { day: o.left + c.day, by: o.name } : core.shut;
  t.dungeon = { ...t.dungeon, core: { reached: core.reached + 1, shut } };
  if (shut && !core.shut) {
    news(t, `${o.name} shut off the heart of the Hearthstone. The pit has gone quiet.`, "good");
    gainRenown(ix, t, "core");
    // Act Two (§21): under the still heart, the way down is found.
    const before = t.dungeon.floors.length;
    t.dungeon = structuredClone(t.dungeon);
    if (addNewFloors(ix, t.dungeon)) {
      const names = t.dungeon.floors
        .slice(before)
        .map((_, i) => ix.floor(before + i + 1).name)
        .join(", ");
      news(
        t,
        `Under the still heart, the floor of the Delve has given way. Stairs go down: ${names}. Something down there is breeding.`,
        "bad",
      );
    }
  } else if (!c.shut) {
    news(
      t,
      `${o.name} reached the heart of the Hearthstone, but couldn't get past what guards it.`,
      "bad",
    );
  }
}
