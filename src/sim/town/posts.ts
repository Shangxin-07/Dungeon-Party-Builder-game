/**
 * Posts round the pit and the opening (DESIGN.md §8). Heroes at home can be
 * put on a post (content/posts/): the barricade holds back what climbs out,
 * a lookout sees it coming, the salvage crew and the seam bring in materials
 * and gold. At the mining camp the posts are all there is, until the camp is
 * held and parties can go down.
 */
import { rollLootTable } from "../loot";
import type { Index } from "../library";
import type { RaidReport } from "../raid";
import { type TownState, TownError } from "./state";
import { campNeeds, findHero, haulPrice, openPosts, postWorkers } from "./read";
import { addMaterials, book, edit, listWords, news, roll, useMaterials } from "./internal";
import { materialWords, materialsShort } from "./read";

/**
 * Put a hero on a post, or take them off (`postId` undefined). A hero holds
 * one post at a time. Heroes away on a trip keep their post for when they're back.
 */
export function assignPost(
  ix: Index,
  town: TownState,
  heroId: string,
  postId: string | undefined,
): TownState {
  const h = findHero(town, heroId);
  if (!h) throw new TownError("They aren't in the guild.");
  const t = edit(town);
  t.posts ??= {};
  for (const id of Object.keys(t.posts)) {
    t.posts[id] = t.posts[id]!.filter((x) => x !== heroId);
    if (!t.posts[id]!.length) delete t.posts[id];
  }
  if (!postId) return t;
  const post = ix.post(postId);
  if (post.campOnly && !t.camp) throw new TownError(`${post.name} closed with the camp.`);
  if (h.porter && !post.porters)
    throw new TownError(`Porters don't stand at ${post.name.toLowerCase()}.`);
  const on = t.posts[postId] ?? [];
  if (on.length >= post.slots) throw new TownError(`${post.name} has no room for anyone else.`);
  t.posts[postId] = [...on, heroId];
  return t;
}

/** Which post a hero is on, if any. */
export const postOf = (town: TownState, heroId: string): string | undefined =>
  Object.entries(town.posts ?? {}).find(([, ids]) => ids.includes(heroId))?.[0];

/** Put whatever a loot roll found in town: materials to the store, coins to gold, gear to the store room. */
function bank(
  ix: Index,
  t: TownState,
  found: readonly string[],
  kind: "gathered" | "spoils",
): { materials: Record<string, number>; gold: number } {
  const materials: Record<string, number> = {};
  let gold = 0;
  for (const id of found) {
    const def = ix.item(id);
    if (def.slot === "material") materials[id] = (materials[id] ?? 0) + 1;
    else if (def.tags.includes("coins")) gold += haulPrice(ix, id, def.value);
    else t.stash.push(id);
  }
  addMaterials(t, materials);
  book(t, kind, gold);
  return { materials, gold };
}

/** A day's work on the posts that gather: each hero working one rolls its table. */
export function workPosts(ix: Index, t: TownState, away: ReadonlySet<string>): void {
  const found: string[] = [];
  for (const p of openPosts(ix, t)) {
    const workers = postWorkers(ix, t, p.id, away).length;
    for (const e of p.effects) {
      if (e.type !== "gather") continue;
      for (let i = 0; i < workers * e.rolls; i++)
        found.push(...roll(t, (rng) => rollLootTable(ix, e.loot, rng)));
    }
  }
  const got = bank(ix, t, found, "gathered");
  t.gathered = { day: t.day, ...got };
}

/** Fallen raiders drop materials (DESIGN.md §8): roll the spoils for each one killed. */
export function raidSpoils(ix: Index, t: TownState, raid: RaidReport): void {
  const table = ix.lib.town.raidSpoils;
  if (!table || !raid.kills) return;
  const found: string[] = [];
  for (let i = 0; i < raid.kills; i++)
    found.push(...roll(t, (rng) => rollLootTable(ix, table, rng)));
  const got = bank(ix, t, found, "spoils");
  const words = [
    ...(Object.keys(got.materials).length ? [materialWords(ix, got.materials)] : []),
    ...(got.gold ? [`${got.gold} gold`] : []),
  ];
  if (words.length) news(t, `Picked off the dead raiders: ${listWords(words)}.`, "good");
}

/**
 * Swap materials with the miners at the camp (content/opening.ts `trades`),
 * so bad luck in what the posts bring in can't stall the build.
 */
export function trade(ix: Index, town: TownState, index: number): TownState {
  if (!town.camp) throw new TownError("The miners only trade while the camp lasts.");
  const deal = ix.lib.opening.trades[index];
  if (!deal) throw new TownError("The miners don't make that swap.");
  const short = materialsShort(ix, town, deal.give);
  if (short) throw new TownError(`Not enough to swap: short of ${short}.`);
  const t = edit(town);
  useMaterials(t, deal.give);
  addMaterials(t, deal.get);
  return t;
}

/** The opening ends once everything in content/opening.ts `unlock` is built. */
export function checkCamp(ix: Index, t: TownState): void {
  if (!t.camp || campNeeds(ix, t).length) return;
  delete t.camp;
  // Camp-only posts close; whoever was on them is free again.
  for (const p of ix.lib.posts) if (p.campOnly) delete t.posts[p.id];
  t.stash.push(...ix.lib.opening.heldStash);
  news(
    t,
    "The camp is held. With a Guild Hall and walls round the pit, the guild can start sending parties down. " +
      "The road is safe again, and the guild's wagons bring proper kit to the store room.",
    "good",
  );
}

/** Take anyone who has left the guild off the posts. */
export function tidyPosts(t: TownState): void {
  for (const id of Object.keys(t.posts ?? {})) {
    t.posts[id] = t.posts[id]!.filter((x) => findHero(t, x));
    if (!t.posts[id]!.length) delete t.posts[id];
  }
}
