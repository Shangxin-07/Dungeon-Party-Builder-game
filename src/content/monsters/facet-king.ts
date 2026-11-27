import { defineMonster } from "../types";

// One of floor 7's shard-bearers (M8.39, DESIGN.md §21): the biggest thing the
// Glimmering ever grew, a hill of crystal on legs, with a shard of the
// Emberstone at its heart that it grew round like a pearl.
export default defineMonster({
  id: "facet-king",
  name: "The Facet King",
  power: 96,
  stats: { STR: 24, DEX: 7, END: 24, PER: 10, INT: 4, WIL: 18, CHA: 2 },
  overrides: { maxHp: 1000 },
  weapon: { name: "crystal fists", damageType: "crushing", attack: 36 },
  row: "front",
  tags: ["construct", "crystal-grown", "shard-bearer"],
  ai: "brute",
  research: {
    tricks:
      "Very hard to cut; it cracks itself open to fling splinters at everyone, and the crystal knits it when it's badly hurt. Crush it.",
  },
  loot: "geode-loot",
  abilities: { crush: 1, "glass-storm": 1 },
  passives: [
    { type: "modifyStat", stat: "armor", amount: 6 },
    { type: "modifyStat", stat: "initiative", amount: -3 },
    { type: "resist", damageType: "slashing", percent: 30 },
    { type: "resist", damageType: "piercing", percent: 30 },
    { type: "resist", damageType: "crushing", percent: -25 },
    { type: "resist", damageType: "poison", percent: 100 },
  ],
  triggers: [
    {
      on: "damaged",
      minDamage: 40,
      ifAlive: true,
      once: true,
      message: "Crystal grows across {self}'s cracks, and its wounds start to knit!",
      effects: [{ type: "applyStatus", status: "regenerating", turns: 5 }],
    },
  ],
});
