/**
 * Renown and blessings (M8.19, DESIGN.md §20).
 *
 * - **Renown** is a town number (`town.renown`) that deeds add to
 *   (content/renown.ts): every shard brought home, every Seal Stone set,
 *   every lair's beast killed, contracts and petitions; a breached gateway
 *   takes some away. Each rank it reaches works like a building: its effects
 *   join the town's (read.ts `effects`), and the top Guild Hall level waits
 *   for it.
 * - **Blessings**: every gateway that holds gives the town its way's blessing
 *   (content/sealing.ts): cleansed is gentle, bound is stronger with a
 *   morale cost for Good heroes. They add up, seal by seal.
 *
 * Nothing here imports read.ts, so read.ts can use it.
 */
import type { BuildingEffect, RenownDeed, RenownRank } from "../../content/types";
import type { Index } from "../library";
import { stoneOf } from "../shards";
import type { TownState } from "./state";
import { news } from "./internal";

/** The rank the town has reached, and the one after it, if any. */
export function renownRank(ix: Index, renown: number): { rank: RenownRank; next?: RenownRank } {
  const ranks = ix.lib.renown.ranks;
  let i = 0;
  while (i + 1 < ranks.length && renown >= ranks[i + 1]!.at) i++;
  return { rank: ranks[i]!, ...(ranks[i + 1] ? { next: ranks[i + 1] } : {}) };
}

/** Effects from every rank the town has reached. */
export function renownEffects(ix: Index, town: TownState): BuildingEffect[] {
  return ix.lib.renown.ranks.filter((r) => town.renown >= r.at).flatMap((r) => r.effects);
}

/**
 * A deed the valley hears of (changes `t`): renown for it, `n` times, and
 * news if the guild reaches a new rank. Renown never goes below 0.
 */
export function gainRenown(ix: Index, t: TownState, deed: RenownDeed, n = 1): void {
  const amount = ix.lib.renown.deeds[deed] * n;
  if (!amount) return;
  const before = renownRank(ix, t.renown).rank;
  t.renown = Math.max(0, t.renown + amount);
  const after = renownRank(ix, t.renown).rank;
  if (after.at > before.at)
    news(
      t,
      `The guild's name has spread: it's ${after.name.toLowerCase()}. ${after.summary}`,
      "good",
    );
}

/** The gateways holding now, and the blessing each gives. Breached ones give nothing. */
export function blessings(ix: Index, town: TownState) {
  return Object.entries(town.dungeon.stones)
    .filter(([, s]) => !s.damaged)
    .flatMap(([f, s]) => {
      const way = stoneOf(ix, s.stone)?.way;
      return way ? [{ floor: Number(f), way }] : [];
    });
}

/** Effects of every blessing the town has. */
export const blessingEffects = (ix: Index, town: TownState): BuildingEffect[] =>
  blessings(ix, town).flatMap((b) => b.way.blessing.effects);

/** Bound stones holding, for the Good heroes' morale (fact boundSeals). */
export const boundSeals = (ix: Index, town: TownState) =>
  blessings(ix, town).filter((b) => b.way.fact === "evilDeeds").length;
