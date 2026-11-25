/**
 * Gateways (M8.18, DESIGN.md §20): a set Seal Stone holds the stairs below
 * its floor, and the town chooses how much it lets up.
 *
 * - **Shut:** nothing comes up. While the floor below is over its capacity
 *   it strains the gateway; hunting it back under eases the strain.
 * - **Trickle:** a few weak monsters come up each day (a training floor
 *   above), and the rest strain it at half the rate.
 * - **Open:** everything comes up as before, and the strain eases.
 *
 * Past its level's limit a gateway breaches: everything held back comes up
 * that night, and it stands open until the town mends it. It's never lost.
 * Raising its level (gold and materials, done at once) raises the limit.
 * The dungeon side is in src/sim/dungeon.ts.
 */
import type { GatewaySetting } from "../../content/types";
import { gatewayDays, gatewayLimit, type StoneSeal } from "../dungeon";
import type { Index } from "../library";
import { stoneOf } from "../shards";
import { type TownState, TownError } from "./state";
import { book, edit, news, useMaterials } from "./internal";
import { materialsShort, materialWords } from "./read";

function gateway(town: TownState, floor: number): StoneSeal {
  const s = town.dungeon.stones[floor];
  if (!s) throw new TownError(`The stairs below floor ${floor} have no Seal Stone.`);
  return s;
}

/** Change one gateway (copies the dungeon so the old town is left alone). */
function change(
  town: TownState,
  floor: number,
  f: (s: StoneSeal, t: TownState) => void,
): TownState {
  const t = edit(town);
  const s = { ...gateway(t, floor) };
  f(s, t);
  t.dungeon = { ...t.dungeon, stones: { ...t.dungeon.stones, [floor]: s } };
  return t;
}

/** Set how much the gateway below this floor lets up. */
export function setGateway(
  ix: Index,
  town: TownState,
  floor: number,
  setting: GatewaySetting,
): TownState {
  if (!ix.lib.sealing.gateway.settings[setting]) throw new TownError("No such setting.");
  return change(town, floor, (s) => (s.setting = setting));
}

/** Why the gateway below this floor can't be raised a level now, or undefined if it can. */
export function cantRaiseGateway(ix: Index, town: TownState, floor: number): string | undefined {
  const s = town.dungeon.stones[floor];
  if (!s) return "There's no gateway there.";
  const next = ix.lib.sealing.gateway.levels[s.level];
  if (!next) return "It's as strong as it gets.";
  if (s.damaged) return "Mend it first.";
  if (town.gold < (next.gold ?? 0)) return "Not enough gold.";
  const short = materialsShort(ix, town, next.materials);
  return short ? `Short of ${short}.` : undefined;
}

/** Raise the gateway below this floor a level: a higher strain limit. */
export function raiseGateway(ix: Index, town: TownState, floor: number): TownState {
  const why = cantRaiseGateway(ix, town, floor);
  if (why) throw new TownError(why);
  return change(town, floor, (s, t) => {
    const next = ix.lib.sealing.gateway.levels[s.level]!;
    useMaterials(t, next.materials);
    if (next.gold) book(t, "built", -next.gold);
    s.level += 1;
  });
}

/** Why the gateway below this floor can't be mended now, or undefined if it can. */
export function cantMendGateway(ix: Index, town: TownState, floor: number): string | undefined {
  const s = town.dungeon.stones[floor];
  if (!s) return "There's no gateway there.";
  if (!s.damaged) return "It isn't breached.";
  const cost = mendCost(ix, s);
  if (town.gold < cost.gold) return "Not enough gold.";
  const short = materialsShort(ix, town, cost.materials);
  return short ? `Short of ${short}.` : undefined;
}

/** What mending a breached gateway costs at its level. */
export const mendCost = (ix: Index, s: StoneSeal) =>
  ix.lib.sealing.gateway.levels[s.level - 1]!.repair;

/** Mend a breached gateway: it holds again, as it was set. */
export function mendGateway(ix: Index, town: TownState, floor: number): TownState {
  const why = cantMendGateway(ix, town, floor);
  if (why) throw new TownError(why);
  return change(town, floor, (s, t) => {
    const cost = mendCost(ix, s);
    useMaterials(t, cost.materials);
    book(t, "repairs", -cost.gold);
    s.damaged = false;
    s.strain = 0;
  });
}

/** What the next level of the gateway below this floor costs and gives, if there is one. */
export function nextGatewayLevel(ix: Index, town: TownState, floor: number) {
  const s = town.dungeon.stones[floor];
  return s ? ix.lib.sealing.gateway.levels[s.level] : undefined;
}

/** "150 gold, 6 planks and 4 iron bands". */
export function gatewayCostWords(
  ix: Index,
  cost: { gold?: number; materials?: Record<string, number> },
): string {
  const mats = materialWords(ix, cost.materials);
  const gold = cost.gold ? `${cost.gold} gold` : "";
  return gold && mats ? `${gold}, ${mats}` : gold || mats || "nothing";
}

/** Every gateway, for the town's panels: how it's set, how strained, and how long it may hold. */
export function gatewaysNow(ix: Index, town: TownState) {
  return Object.entries(town.dungeon.stones)
    .map(([f, s]) => {
      const floor = Number(f);
      const limit = gatewayLimit(ix, s);
      return {
        floor,
        stone: s.stone,
        way: stoneOf(ix, s.stone)?.way,
        setting: s.setting,
        level: s.level,
        damaged: s.damaged,
        strain: s.strain,
        limit,
        percent: Math.round((s.strain / limit) * 100),
        days: gatewayDays(ix, town.dungeon, floor),
        day: s.day,
        ...(s.by ? { by: s.by } : {}),
      };
    })
    .sort((a, b) => a.floor - b.floor);
}

/** Tonight's news from the gateways (changes `t`). */
export function gatewayNews(
  t: TownState,
  day: { breached?: readonly number[]; strained?: readonly number[] },
): void {
  for (const f of day.strained ?? [])
    news(
      t,
      `The gateway on the stairs below floor ${f} is creaking: the floor below is leaning on it. Hunt it down, let some through, or raise the gateway.`,
      "bad",
    );
  for (const f of day.breached ?? [])
    news(
      t,
      `The gateway on the stairs below floor ${f} has breached. Everything held behind it is coming up, and it stands open until it's mended.`,
      "bad",
    );
}
