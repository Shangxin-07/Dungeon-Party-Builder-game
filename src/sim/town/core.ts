/**
 * The pit's hearts (M8.22, DESIGN.md §20-21): the Hearthstone's ends Act One,
 * the Coalstone's Act Two (M8.38). Once every floor above a heart is held by
 * a Seal Stone whose gateway stands, a party can be sent down to shut it off.
 * It fights the heart's guardian, cornered; if it wins, the heart is shut for
 * good.
 *
 * - The town learns what happened at the heart when it hears of the trip:
 *   the party is home, or lost (the heart stays shut even if they fall on
 *   the way back up).
 * - Shut, the Hearthstone's floor breeds no more (dungeon.ts) and the dead no
 *   longer rise. Act Two (§21) opens: the floors below the heart are added,
 *   and the new bottom floor breeds and pushes its extras up as before.
 * - Leaving it beating is fine too: it's never forced.
 */
import type { BuildingEffect, CoreRules, HeartWay } from "../../content/types";
import { addNewFloors, heartOn, heartState, nextHeart } from "../dungeon";
import { coreOrder, type StandingOrders } from "../expedition";
import type { Index } from "../library";
import { type Outing, type TownState, TownError } from "./state";
import { book, edit, news, useMaterials } from "./internal";
import { materialsShort, standing } from "./read";
import { gainRenown } from "./renown";
import { storyDay } from "./story";

/** The heart the guild is working towards now: the first still beating, else the last. */
export const currentHeart = (ix: Index, town: TownState): CoreRules =>
  nextHeart(ix, town.dungeon) ?? ix.lib.hearts[ix.lib.hearts.length - 1]!;

/** Send the next party for the heart, or not. It goes to that heart's floor. */
export function setCore(ix: Index, town: TownState, on: boolean): TownState {
  const t = edit(town);
  if (!on) {
    delete t.orders.core;
    return t;
  }
  t.orders = { ...t.orders, core: true, targetFloor: currentHeart(ix, town).floor };
  // The heart is the whole trip: no stairs to see to as well.
  delete t.orders.seal;
  delete t.orders.stone;
  return t;
}

/** Floors above a heart not yet held by a standing gateway, top first. */
export function coreBlockers(
  ix: Index,
  town: TownState,
  heart: CoreRules = currentHeart(ix, town),
): { floor: number; why: string }[] {
  const out: { floor: number; why: string }[] = [];
  for (let f = 1; f < heart.floor; f++) {
    const s = town.dungeon.stones[f];
    if (!s) out.push({ floor: f, why: `the stairs below floor ${f} have no Seal Stone` });
    else if (s.damaged) out.push({ floor: f, why: `the gateway below floor ${f} is breached` });
  }
  return out;
}

/** Can a party go for this heart at all (whoever goes)? Why not, or undefined. */
export function cantReachCore(
  ix: Index,
  town: TownState,
  heart: CoreRules = currentHeart(ix, town),
): string | undefined {
  if (heartState(town.dungeon, heart.id).shut)
    return `The heart of the ${heart.stone} is already shut off.`;
  if (heart.floor > town.dungeon.floors.length)
    return `Nobody has found the way down to floor ${heart.floor} yet.`;
  const first = coreBlockers(ix, town, heart)[0];
  if (first) {
    const why = first.why.charAt(0).toUpperCase() + first.why.slice(1);
    return `Every floor above the heart has to be held first. ${why}.`;
  }
  return undefined;
}

/** Why these orders can't go for a heart, or undefined (also when they don't). */
export function cantCore(ix: Index, town: TownState, orders: StandingOrders): string | undefined {
  if (!coreOrder(orders)) return undefined;
  const heart = heartOn(ix, orders.targetFloor);
  if (!heart) {
    const next = currentHeart(ix, town);
    return `The heart of the ${next.stone} lies on floor ${next.floor}: send the party there.`;
  }
  return cantReachCore(ix, town, heart);
}

/**
 * The town hears what happened at a heart (changes `t`): a party has been
 * there, and maybe the heart is shut off for good.
 */
export function coreNews(ix: Index, t: TownState, o: Outing): void {
  const c = o.result.core;
  if (!c) return;
  const heart = ix.lib.hearts.find((h) => h.id === c.heart);
  if (!heart) return;
  const core = heartState(t.dungeon, heart.id);
  const shut = c.shut && !core.shut ? { day: o.left + c.day, by: o.name } : core.shut;
  t.dungeon = {
    ...t.dungeon,
    hearts: { ...t.dungeon.hearts, [heart.id]: { reached: core.reached + 1, shut } },
  };
  if (shut && !core.shut) {
    news(t, `${o.name} shut off the heart of the ${heart.stone}. Its floor has gone quiet.`, "good");
    gainRenown(ix, t, "core");
    // The next act (§21): under the still heart, the way down is found.
    const before = t.dungeon.floors.length;
    t.dungeon = structuredClone(t.dungeon);
    if (addNewFloors(ix, t.dungeon)) {
      const names = t.dungeon.floors
        .slice(before)
        .map((_, i) => ix.floor(before + i + 1).name)
        .join(", ");
      news(
        t,
        `Under the still heart, the floor has given way. Stairs go down: ${names}. Something down there is breeding.`,
        "bad",
      );
    }
  } else if (!c.shut) {
    news(
      t,
      `${o.name} reached the heart of the ${heart.stone}, but couldn't get past what guards it.`,
      "bad",
    );
  }
}

/**
 * The last stone (M8.41, DESIGN.md §21): once its heart is still, the guild
 * mends it (at the Temple) or binds it (at the Black Market), once and for
 * good. Mending makes every floor safe: the pit empties and nothing breeds.
 * Binding puts the stone to work for the guild, and its floor never quite
 * sleeps. Either way the town keeps the way's blessing.
 */
export function heartWay(town: TownState, heart: CoreRules): HeartWay | undefined {
  const id = heartState(town.dungeon, heart.id).way?.id;
  return id ? heart.ways?.find((w) => w.id === id) : undefined;
}

/** Why the guild can't take this way with the heart's stone now, or undefined. */
export function cantChooseWay(
  ix: Index,
  town: TownState,
  heart: CoreRules,
  wayId: string,
): string | undefined {
  const way = heart.ways?.find((w) => w.id === wayId);
  if (!way) return "That can't be done with this stone.";
  const s = heartState(town.dungeon, heart.id);
  if (!s.shut) return `The heart of the ${heart.stone} has to be still first.`;
  if (s.way) return "The guild has already chosen.";
  if (!standing(town, way.workshop)) return `It needs the ${ix.building(way.workshop).name}.`;
  if (town.gold < way.gold) return "Not enough gold.";
  const short = materialsShort(ix, town, way.materials);
  return short ? `Short of ${short}.` : undefined;
}

/** Mend or bind the last stone (M8.41). */
export function chooseWay(ix: Index, town: TownState, heart: CoreRules, wayId: string): TownState {
  const why = cantChooseWay(ix, town, heart, wayId);
  if (why) throw new TownError(why);
  const way = heart.ways!.find((w) => w.id === wayId)!;
  const t = edit(town);
  useMaterials(t, way.materials);
  book(t, "built", -way.gold);
  const d = structuredClone(t.dungeon);
  d.hearts[heart.id] = { ...heartState(d, heart.id), way: { id: way.id, day: t.day } };
  // Mended, every floor is safe: what's down there now lies still for good.
  if (way.safe) for (const f of d.floors) f.population = 0;
  t.dungeon = d;
  news(t, way.news, "story");
  // Its last chapter opens at once, for the ending card.
  storyDay(ix, t);
  return t;
}

/** The blessings of the hearts' chosen ways, for the town's effects. */
export const wayEffects = (ix: Index, town: TownState): BuildingEffect[] =>
  ix.lib.hearts.flatMap((h) => heartWay(town, h)?.blessing.effects ?? []);

/** Stones mended and bound, for everyone's morale at home (facts heartMended, heartBound). */
export function wayFacts(ix: Index, town: TownState): { heartMended: number; heartBound: number } {
  const ways = ix.lib.hearts.map((h) => heartWay(town, h)).filter((w) => !!w);
  return {
    heartMended: ways.filter((w) => w.fact === "heartMended").length,
    heartBound: ways.filter((w) => w.fact === "heartBound").length,
  };
}
