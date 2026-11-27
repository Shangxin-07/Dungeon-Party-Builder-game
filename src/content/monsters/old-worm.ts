import { defineMonster } from "../types";

// One of floor 9's shard-bearers (M8.41, DESIGN.md §21): the oldest ember
// worm, as long as a mine gallery, with a shard of the Emberstone lodged in
// its gullet like a swallowed coal.
export default defineMonster({
  id: "old-worm",
  name: "The Old Worm",
  power: 104,
  stats: { STR: 26, DEX: 10, END: 26, PER: 10, INT: 2, WIL: 16, CHA: 1 },
  overrides: { maxHp: 1200 },
  weapon: { name: "burning maw", damageType: "fire", attack: 40 },
  row: "front",
  tags: ["beast", "ember-touched", "shard-bearer"],
  ai: "brute",
  research: {
    tricks:
      "Enormous: it sweeps the front line and crushes whoever's in reach. Fire is its home; cold slows it.",
  },
  loot: "worm-loot",
  abilities: { "tail-sweep": 1, crush: 1 },
  passives: [
    { type: "modifyStat", stat: "armor", amount: 4 },
    { type: "resist", damageType: "fire", percent: 100 },
    { type: "resist", damageType: "cold", percent: -20 },
  ],
});
