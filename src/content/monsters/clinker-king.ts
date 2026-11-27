import { defineMonster } from "../types";

// One of floor 9's shard-bearers (M8.41, DESIGN.md §21): the biggest
// clinker golem, built round a shard of the Emberstone to hold up the Kiln's
// door. It took the shard for its heart, and it won't let the door be passed.
export default defineMonster({
  id: "clinker-king",
  name: "The Clinker King",
  power: 110,
  stats: { STR: 27, DEX: 6, END: 27, PER: 10, INT: 4, WIL: 20, CHA: 1 },
  overrides: { maxHp: 1300 },
  weapon: { name: "kiln-brick fists", damageType: "crushing", attack: 38 },
  row: "front",
  tags: ["construct", "keeper-work", "shard-bearer"],
  ai: "brute",
  research: {
    tricks:
      "A wall that walks: very hard, crushing blows, and heat off it over the whole party. Fire is nothing to it; cold cracks it.",
  },
  loot: "clinker-loot",
  abilities: { crush: 1, "heat-blast": 1 },
  passives: [
    { type: "modifyStat", stat: "armor", amount: 6 },
    { type: "modifyStat", stat: "initiative", amount: -3 },
    { type: "resist", damageType: "slashing", percent: 25 },
    { type: "resist", damageType: "piercing", percent: 25 },
    { type: "resist", damageType: "fire", percent: 100 },
    { type: "resist", damageType: "poison", percent: 100 },
    { type: "resist", damageType: "cold", percent: -20 },
  ],
  triggers: [
    {
      on: "damaged",
      minDamage: 45,
      ifAlive: true,
      once: true,
      message: "The shard in {self}'s chest flares, and the cracks in its bricks glow and close!",
      effects: [{ type: "applyStatus", status: "regenerating", turns: 4 }],
    },
  ],
});
