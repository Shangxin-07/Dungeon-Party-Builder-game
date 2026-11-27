import { defineMonster } from "../types";

// One of floor 8's shard-bearers (M8.40, DESIGN.md §21): a glimmer stalker
// that swallowed a shard of the Emberstone and grew round it. Where it walks,
// the crystal goes dark.
export default defineMonster({
  id: "lightdrinker",
  name: "The Lightdrinker",
  icon: { sheet: "ember-deeps", cell: 3 },
  power: 90,
  stats: { STR: 20, DEX: 19, END: 18, PER: 20, INT: 6, WIL: 14, CHA: 1 },
  overrides: { maxHp: 650 },
  weapon: { name: "black glass claws", damageType: "piercing", attack: 26 },
  row: "front",
  tags: ["beast", "crystal-grown", "shard-bearer"],
  ai: "brute",
  research: {
    tricks:
      "Very quick, it hamstrings, and it drinks the light to heal itself. Crush it, and keep the lamps lit.",
  },
  loot: "glimmer-loot",
  abilities: { hamstring: 1, "drink-the-light": 1 },
  passives: [
    { type: "modifyStat", stat: "evasion", amount: 2 },
    { type: "modifyStat", stat: "initiative", amount: 5 },
    { type: "resist", damageType: "slashing", percent: 20 },
    { type: "resist", damageType: "piercing", percent: 20 },
    { type: "resist", damageType: "crushing", percent: -25 },
  ],
});
