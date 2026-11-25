import { defineShardSet } from "../types";

// Floor 2's shards (DESIGN.md §20).
export default defineShardSet({
  id: "warrens",
  floor: 2,
  item: "shard-warrens",
  shards: [
    {
      id: "warrens-bearer",
      kind: "bearer",
      floor: 2,
      hint: "Something in the Warrens is mother to every spider down there, and it glows.",
      monster: "brood-queen",
      below: 0.5,
      chance: 0.25,
      escort: 0.5,
      // Four heroes of about level 4-5.
      stand: 18,
      shows: "{monster} drops from the dark, the shard in her belly lighting the webs.",
    },
    {
      id: "warrens-cache",
      kind: "cache",
      floor: 2,
      hint: "A shard lies hidden somewhere in the Warrens. A sharp scout might spot it.",
      chance: 0.08,
      hidden: 55,
      spotted:
        "a cocoon nobody would want to touch, warm as bread. Inside, a shard of the Hearthstone",
    },
    {
      id: "warrens-library",
      kind: "library",
      floor: 2,
      hint: "The Library could find it, once it knows the Warrens' spiders well.",
      monsters: ["cave-spider", "spider-matriarch"],
      points: 60,
      lead: "The Library has it: the spiders' webs all lean one way, towards a warm wall in the Warrens. The next party on floor 2 can dig the shard out.",
      dug: "follows the lean of the webs to a warm wall and digs out a shard of the Hearthstone",
    },
  ],
  // Forging its Seal Stone, beside the shards (M8.17), and the surge when it's set.
  forge: { materials: { "iron-bands": 3, "spider-silk": 4 }, gold: 150, work: 8 },
  surge: {
    power: 2.5,
    text: "The Bone Halls wake. The dead come up the stairs in ranks to stop the stone going in.",
  },
});
