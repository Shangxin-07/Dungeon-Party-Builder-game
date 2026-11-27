import { defineMonster } from "../types";

// The Keepers' Stair: hounds that came up out of the heat below. Their bite burns.
export default defineMonster({
  id: "cinder-hound",
  name: "Cinder Hound",
  power: 7,
  stats: { STR: 13, DEX: 14, END: 12, PER: 14, INT: 3, WIL: 8, CHA: 1 },
  overrides: { maxHp: 44 },
  weapon: { name: "smouldering jaws", damageType: "fire", attack: 7 },
  row: "front",
  tags: ["beast", "ember-touched"],
  ai: "brute",
  research: {
    tricks: "Hunts in packs and goes for the legs. Fire is its own; cold and water put it out.",
  },
  abilities: { hamstring: 1 },
  loot: "cinder-loot",
  passives: [
    { type: "modifyStat", stat: "initiative", amount: 3 },
    { type: "resist", damageType: "fire", percent: 75 },
    { type: "resist", damageType: "cold", percent: -30 },
  ],
});
