import { defineMonster } from "../types";

// One of floor 7's shard-bearers (M8.39, DESIGN.md §21): a moth as wide as a
// cart, drawn up from the deep to the Coal Halls' heat, with a shard of the
// Emberstone glowing in its body like a lantern.
export default defineMonster({
  id: "ember-moth",
  name: "The Ember Moth",
  power: 84,
  stats: { STR: 14, DEX: 20, END: 16, PER: 18, INT: 6, WIL: 12, CHA: 2 },
  overrides: { maxHp: 650 },
  weapon: { name: "burning wings", damageType: "fire", attack: 30 },
  row: "front",
  tags: ["beast", "ember-touched", "shard-bearer"],
  ai: "brute",
  research: {
    tricks:
      "Fast and hard to hit, its ash dazes, and the halls' moths come when it flares. Cold brings it down.",
  },
  loot: "moth-loot",
  abilities: { "choking-ash": 1, "call-the-swarm": 1 },
  passives: [
    { type: "modifyStat", stat: "evasion", amount: 5 },
    { type: "modifyStat", stat: "initiative", amount: 5 },
    { type: "resist", damageType: "fire", percent: 100 },
    { type: "resist", damageType: "cold", percent: -30 },
  ],
});
