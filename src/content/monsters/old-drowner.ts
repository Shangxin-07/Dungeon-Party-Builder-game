import { defineMonster } from "../types";

// One of floor 4's shard-bearers (DESIGN.md §20): a troll that swallowed a shard
// and stopped being able to die properly. It sleeps under the black water.
export default defineMonster({
  id: "old-drowner",
  name: "Old Drowner",
  power: 56,
  stats: { STR: 19, DEX: 7, END: 19, PER: 8, INT: 4, WIL: 10, CHA: 2 },
  overrides: { maxHp: 1100 },
  weapon: { name: "drowned anchor", damageType: "crushing", attack: 30 },
  row: "front",
  tags: ["giant", "beast", "shard-bearer"],
  ai: "brute",
  research: {
    tricks: "The shard closes its wounds faster than any troll's. Fire, and lots of it.",
  },
  loot: "troll-loot",
  abilities: { crush: 1, "tail-sweep": 1 },
  passives: [
    { type: "modifyStat", stat: "armor", amount: 3 },
    { type: "resist", damageType: "fire", percent: -50 },
    { type: "resist", damageType: "cold", percent: 50 },
  ],
  triggers: [
    {
      on: "damaged",
      minDamage: 10,
      ifAlive: true,
      once: true,
      message: "{self}'s wounds start to close!",
      effects: [{ type: "applyStatus", status: "regenerating", turns: 6 }],
    },
  ],
});
