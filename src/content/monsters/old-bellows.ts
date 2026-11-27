import { defineMonster } from "../types";

// One of floor 6's shard-bearers (M8.38, DESIGN.md §21): the biggest of the
// stokers, who works the great bellows of the Coal Halls with a shard of the
// Coalstone set in its chest like a coal. Found in the halls below the stair.
export default defineMonster({
  id: "old-bellows",
  name: "Old Bellows",
  power: 84,
  stats: { STR: 23, DEX: 8, END: 23, PER: 10, INT: 5, WIL: 16, CHA: 2 },
  overrides: { maxHp: 900 },
  weapon: { name: "bellows-iron", damageType: "crushing", attack: 34 },
  row: "front",
  tags: ["ember-touched", "keeper-work", "shard-bearer"],
  ai: "brute",
  research: {
    tricks:
      "Huge and slow, and every breath of its bellows scorches the front row. Cold puts its fire out.",
  },
  loot: "stoker-loot",
  abilities: { crush: 1, "heat-blast": 1 },
  passives: [
    { type: "modifyStat", stat: "armor", amount: 4 },
    { type: "modifyStat", stat: "initiative", amount: -3 },
    { type: "resist", damageType: "fire", percent: 75 },
    { type: "resist", damageType: "cold", percent: -30 },
  ],
});
