import { defineShardSet } from "../types";

// Floor 7's shards (M8.39, DESIGN.md §21): nine, as planned for floors 7-9
// (Mike, 2026-11-26). They're the Emberstone's, blown up through the
// Glimmering, and they open once there are stairs below the Coal Halls.
export default defineShardSet({
  id: "coal-halls",
  floor: 7,
  item: "shard-coal-halls",
  stone: "Emberstone",
  shards: [
    {
      id: "coal-halls-lamplighter",
      kind: "bearer",
      floor: 7,
      hint: "One lamplighter's lamp burns white, not red. The others walk behind it.",
      monster: "last-lamplighter",
      below: 0.5,
      chance: 0.2,
      escort: 0.6,
      // Four heroes of about level 12.
      stand: 48,
      shows:
        "{monster} turns from its round, its lamp burning white: a shard of the Emberstone, set in it for a flame.",
    },
    {
      id: "coal-halls-moth",
      kind: "bearer",
      floor: 7,
      hint: "Something lights up the far end of the Coal Halls now and then, and the moths all fly to it.",
      monster: "ember-moth",
      below: 0.5,
      chance: 0.2,
      escort: 0.5,
      // Four heroes of about level 12.
      stand: 48,
      shows:
        "{monster} drops out of the dark on wings as wide as a cart, a shard of the Emberstone glowing in its body.",
    },
    {
      id: "coal-halls-king",
      kind: "bearer",
      floor: 8,
      hint: "Deep in the Glimmering, a hill of crystal moves when nobody's looking at it.",
      monster: "facet-king",
      below: 0.5,
      chance: 0.2,
      escort: 0.5,
      // Four heroes of about level 13.
      stand: 52,
      shows:
        "The crystal hill stands up: {monster}, with a shard of the Emberstone glowing at its heart like a pearl.",
    },
    {
      id: "coal-halls-cache",
      kind: "cache",
      floor: 7,
      hint: "A shard lies hidden in the Coal Halls. A sharp scout might spot it.",
      chance: 0.08,
      hidden: 80,
      spotted: "one coal in a cold hearth that's burning white. A shard of the Emberstone",
    },
    {
      id: "coal-halls-crystal",
      kind: "cache",
      floor: 8,
      hint: "Another lies somewhere in the Glimmering, grown into the crystal.",
      chance: 0.08,
      hidden: 80,
      spotted:
        "a warm spot in the crystal, glowing from inside. Chipped out, a shard of the Emberstone",
    },
    {
      id: "coal-halls-deep",
      kind: "cache",
      floor: 8,
      hint: "A third lies deeper in the Glimmering, where the light is strongest.",
      chance: 0.08,
      hidden: 85,
      spotted:
        "the one place in the hall the light all bends towards. At the heart of it, a shard of the Emberstone",
    },
    {
      id: "coal-halls-stokers",
      kind: "library",
      floor: 7,
      hint: "The Library could find one, once it knows the stokers and lamplighters well.",
      monsters: ["stoker", "lamplighter"],
      points: 190,
      lead: "The Library has it: the stokers shovel at one hearth harder than the rest, though it's been out for ages. The next party on floor 7 can dig the shard out.",
      dug: "rakes out the cold hearth the stokers work hardest at, and finds a shard of the Emberstone in the ash",
    },
    {
      id: "coal-halls-light",
      kind: "library",
      floor: 8,
      hint: "The wisps all drift the same way. The Library would have to understand them first.",
      monsters: ["prism-wisp", "glimmer-stalker"],
      points: 200,
      lead: "The Library has it: the wisps drift towards one crystal in the Glimmering, and the stalkers den round it. The next party on floor 8 can dig the shard out.",
      dug: "breaks open the crystal the wisps drift to, and a shard of the Emberstone falls out into their hands",
    },
    {
      id: "coal-halls-geodes",
      kind: "library",
      floor: 8,
      hint: "The geode hulks are guarding something. The Library would have to understand them first.",
      monsters: ["geode-hulk", "ash-moth"],
      points: 210,
      lead: "The Library has it: the geode hulks stand in a ring in one hall of the Glimmering, facing in. The next party on floor 8 can dig the shard out.",
      dug: "digs in the middle of the hulks' ring and finds a shard of the Emberstone, grown round with crystal like a seed",
    },
  ],
  forge: { materials: { "iron-bands": 7, "deep-silver": 6, glowcap: 5 }, gold: 650, work: 22 },
  surge: {
    power: 2.5,
    text: "The Glimmering answers. Light comes up the stair like a flood, and everything that lives in it comes up too.",
  },
});
