import { defineShardSet } from "../types";

// Floor 5's shards (M8.37, DESIGN.md §21): six, like floors 4-6. They open once
// the heart is still and the stairs below the Old Delve are found. They aren't
// the Hearthstone's: the miners' blow cracked the Coalstone under it too.
export default defineShardSet({
  id: "old-delve",
  floor: 5,
  item: "shard-old-delve",
  stone: "Coalstone",
  shards: [
    {
      id: "old-delve-mother",
      kind: "bearer",
      floor: 5,
      hint: "Something big has been eating the crystal in the Old Delve. Its tracks glow.",
      monster: "vein-mother",
      below: 0.5,
      chance: 0.2,
      escort: 0.5,
      // Four heroes of about level 10.
      stand: 40,
      shows:
        "{monster} heaves out of the crystal, a shard of the Coalstone grown into her back like a crown.",
    },
    {
      id: "old-delve-warden",
      kind: "bearer",
      floor: 6,
      hint: "One stair warden is bigger than the rest, and it carries something warm in its hands.",
      monster: "last-warden",
      below: 0.5,
      chance: 0.2,
      escort: 0.5,
      // Four heroes of about level 11.
      stand: 44,
      shows:
        "{monster} turns on the stair, a shard of the Coalstone held out in both hands, as if waiting for someone to take it home.",
    },
    {
      id: "old-delve-cache",
      kind: "cache",
      floor: 5,
      hint: "A shard lies hidden somewhere in the Old Delve. A sharp scout might spot it.",
      chance: 0.08,
      hidden: 70,
      spotted:
        "a seam in the rock that's warm, though the heart is still. In it, a shard of the Coalstone",
    },
    {
      id: "old-delve-step",
      kind: "cache",
      floor: 6,
      hint: "Another shard lodged on the Keepers' Stair itself.",
      chance: 0.08,
      hidden: 75,
      spotted:
        "one step worn hollow, and something glowing in the hollow, as if set there with care: a shard of the Coalstone",
    },
    {
      id: "old-delve-library",
      kind: "library",
      floor: 5,
      hint: "The Library could find one, once it knows the crystal crawlers well.",
      monsters: ["crystal-crawler", "ore-golem"],
      points: 130,
      lead: "The Library has it: crawlers swarm wherever the rock is hottest, and in the Old Delve that's one gallery, now the heart is still. The next party on floor 5 can dig the shard out.",
      dug: "digs into the hot gallery the Library marked and comes up with a shard of the Coalstone",
    },
    {
      id: "old-delve-echoes",
      kind: "library",
      floor: 6,
      hint: "The Keeper's echoes are looking for something. The Library would have to understand them first.",
      monsters: ["keepers-echo", "stair-warden"],
      points: 150,
      lead: "The Library has it: the echoes walk the same round of the stair every night, and stop at the same landing. Something under it is warm. The next party on floor 6 can dig the shard out.",
      dug: "lifts the flagstone where the echoes stop, and finds a shard of the Coalstone wrapped in old cloth, put away carefully",
    },
  ],
  forge: { materials: { "iron-bands": 5, "deep-silver": 4, glowcap: 3 }, gold: 400, work: 16 },
  surge: {
    power: 2.5,
    text: "The Keepers' Stair answers. The lamps on it flare, and everything on the stair comes up at once.",
  },
});
