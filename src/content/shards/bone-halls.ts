import { defineShardSet } from "../types";

// Floor 3's shards (DESIGN.md §20).
export default defineShardSet({
  id: "bone-halls",
  floor: 3,
  item: "shard-bone-halls",
  shards: [
    {
      id: "bone-halls-bearer",
      kind: "bearer",
      floor: 3,
      hint: "The bones in the Halls are building something. Patrols seem to be guarding it.",
      monster: "ossuary-knight",
      below: 0.5,
      chance: 0.25,
      escort: 0.5,
      // Four heroes of about level 6-7.
      stand: 26,
      shows:
        "{monster} steps out of an alcove, a shard of the Hearthstone burning where its heart should be.",
    },
    {
      id: "bone-halls-cache",
      kind: "cache",
      floor: 3,
      hint: "A shard lies hidden somewhere in the Bone Halls. A sharp scout might spot it.",
      chance: 0.08,
      hidden: 60,
      spotted:
        "a skull on a shelf of skulls that's warm to the touch. There's a shard of the Hearthstone inside it",
    },
    {
      id: "bone-halls-library",
      kind: "library",
      floor: 3,
      hint: "The Library could find it, once it understands what keeps the skeletons walking.",
      monsters: ["skeleton", "skeleton-captain"],
      points: 80,
      lead: "The Library has it: the skeletons all rose facing one ossuary in the Bone Halls. The next party on floor 3 can dig the shard out.",
      dug: "finds the ossuary every skull faces and digs a shard of the Hearthstone out from under it",
    },
  ],
  // Forging its Seal Stone, beside the shards (M8.17), and the surge when it's set.
  forge: { materials: { "iron-bands": 4, "bone-dust": 4 }, gold: 200, work: 10 },
  surge: {
    power: 2.5,
    text: "Black water boils up the stairs from the Flooded Shafts, and everything in it comes with it.",
  },
});
