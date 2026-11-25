import { defineShardSet } from "../types";

// Floor 1's shards (DESIGN.md §20). Not an early seal (Mike, 2026-11-25): two of
// the three need the Warrens, and Skrag only meets a party hunting a thinned-
// out Diggings, and he's more than a fresh party can handle.
export default defineShardSet({
  id: "diggings",
  floor: 1,
  item: "shard-diggings",
  shards: [
    {
      id: "diggings-bearer",
      kind: "bearer",
      floor: 1,
      hint: "Goblins whisper about a chief with a burning crown, deep in the Diggings' back tunnels.",
      monster: "skrag-shardcrown",
      below: 0.5,
      chance: 0.25,
      escort: 0.5,
      // Four heroes of about level 3-4 (a level-3 party of four loses one now and then).
      stand: 14,
      shows: "{monster} shoulders through his band, the stone in his crown glowing like a coal.",
    },
    {
      id: "diggings-cache",
      kind: "cache",
      floor: 2,
      hint: "When the stone broke, a piece of the Diggings' shard fell down a shaft into the Warrens.",
      chance: 0.08,
      hidden: 45,
      spotted:
        "warm air rising from a crack at the foot of an old shaft. Wedged in it, glowing faintly, is a shard of the Hearthstone",
    },
    {
      id: "diggings-library",
      kind: "library",
      floor: 1,
      hint: "The Library could find it, once it understands what the shards do to spiders.",
      monsters: ["spider-matriarch"],
      points: 40,
      lead: "The Library has it: the matriarchs nest round heat, and their old silk maps a warm spot under the Diggings' rubble. The next party on floor 1 can dig the shard out.",
      dug: "follows the Library's map to a warm patch of rubble and digs out a shard of the Hearthstone",
    },
  ],
  // Forging its Seal Stone, beside the shards (M8.17), and the surge when it's set.
  forge: { materials: { "iron-bands": 2, planks: 4 }, gold: 100, work: 6 },
  surge: {
    power: 2.5,
    text: "The floor below heaves. Everything in the Warrens that can climb is coming up the stairs at once.",
  },
});
