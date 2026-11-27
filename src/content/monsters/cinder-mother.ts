import { defineMonster } from "../types";

// One of floor 6's shard-bearers (M8.38, DESIGN.md §21): the cinder hounds'
// mother, grown huge in the heat, a shard of the Coalstone burning in her chest.
export default defineMonster({
  id: "cinder-mother",
  name: "The Cinder Mother",
  icon: { sheet: "coal-halls", cell: 4 },
  power: 80,
  stats: { STR: 20, DEX: 15, END: 19, PER: 16, INT: 4, WIL: 12, CHA: 2 },
  overrides: { maxHp: 720 },
  weapon: { name: "molten jaws", damageType: "fire", attack: 34 },
  row: "front",
  tags: ["beast", "ember-touched", "shard-bearer"],
  ai: "brute",
  research: {
    tricks:
      "Fast, and her litter comes when she howls. Fire is nothing to her; cold and water hurt.",
  },
  loot: "cinder-loot",
  abilities: { hamstring: 1, "call-the-litter": 1 },
  passives: [
    { type: "modifyStat", stat: "armor", amount: 3 },
    { type: "modifyStat", stat: "initiative", amount: 3 },
    { type: "resist", damageType: "fire", percent: 60 },
    { type: "resist", damageType: "cold", percent: -40 },
  ],
});
