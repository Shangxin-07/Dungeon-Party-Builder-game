import { defineMonster } from "../types";

// The Coal Halls: one of the hands that kept the Coalstone fed, burned into the
// work. It still shovels coal at a fire that went out of reach long ago.
export default defineMonster({
  id: "stoker",
  name: "Stoker",
  power: 16,
  stats: { STR: 19, DEX: 8, END: 19, PER: 9, INT: 4, WIL: 14, CHA: 2 },
  overrides: { maxHp: 110 },
  weapon: { name: "red-hot shovel", damageType: "fire", attack: 11 },
  row: "front",
  tags: ["ember-touched", "keeper-work"],
  ai: "brute",
  research: {
    tricks:
      "Slow, strong, and burning: its shovel sets you alight. Fire is nothing to it; cold puts it out.",
  },
  abilities: { "power-strike": 1 },
  loot: "stoker-loot",
  passives: [
    { type: "modifyStat", stat: "armor", amount: 2 },
    { type: "modifyStat", stat: "initiative", amount: -2 },
    { type: "resist", damageType: "fire", percent: 75 },
    { type: "resist", damageType: "cold", percent: -25 },
  ],
});
