import { defineMonster } from "../types";

// The Coal Halls: moths as big as a hand, that live on the heat and the ash.
export default defineMonster({
  id: "ash-moth",
  name: "Ash Moth",
  icon: { sheet: "coal-halls", cell: 1 },
  power: 6,
  stats: { STR: 6, DEX: 16, END: 8, PER: 12, INT: 2, WIL: 6, CHA: 1 },
  overrides: { maxHp: 30 },
  weapon: { name: "burning wings", damageType: "fire", attack: 6 },
  row: "front",
  tags: ["beast", "ember-touched"],
  ai: "brute",
  research: { tricks: "Quick, and the ash they shed dazes. Easy to swat, if you can see them." },
  abilities: { "choking-ash": 1 },
  loot: "moth-loot",
  passives: [
    { type: "modifyStat", stat: "initiative", amount: 4 },
    { type: "modifyStat", stat: "evasion", amount: 3 },
    { type: "resist", damageType: "fire", percent: 100 },
    { type: "resist", damageType: "cold", percent: -30 },
  ],
});
