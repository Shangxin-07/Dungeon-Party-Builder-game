import type { ItemDef, RecipeDef, SealingRules, ShardSetDef } from "./types";
import { defineMaterial, sealStoneId } from "./types";

/**
 * The Seal Stones (M8.17, DESIGN.md §20), made from the shard sets and the
 * ways to forge them: one stone and one workshop recipe per floor and way.
 * Nothing to write by hand: a new shard set gets its stones from here.
 */
export function sealStones(
  sets: readonly ShardSetDef[],
  rules: SealingRules,
): { items: ItemDef[]; recipes: RecipeDef[] } {
  const items: ItemDef[] = [];
  const recipes: RecipeDef[] = [];
  for (const set of sets) {
    for (const way of rules.ways) {
      const id = sealStoneId(set, way.id);
      items.push(
        defineMaterial({
          id,
          name: `${way.name} Seal Stone (floor ${set.floor})`,
          blurb: `${way.blurb} Carry it down to the stairs below floor ${set.floor} and set it there.`,
          // Never left behind, and the first thing a fleeing porter grabs.
          value: 500,
          tags: ["seal-stone", `seal:${way.id}`],
        }),
      );
      recipes.push({
        id,
        workshop: way.workshop,
        makes: id,
        materials: { [set.item]: set.shards.length, ...set.forge.materials },
        ...(set.forge.gold ? { gold: set.forge.gold } : {}),
        work: set.forge.work,
        stat: way.stat,
      });
    }
  }
  return { items, recipes };
}
