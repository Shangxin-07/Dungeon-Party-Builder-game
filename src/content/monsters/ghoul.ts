import { defineMonster } from "../types";

// The Flooded Shafts' scavengers. Fast, hungry, and their claws leave you numb.
export default defineMonster({
  id: "ghoul",
  name: "Ghoul",
  icon: { sheet: "monsters-1", cell: 11 },
  power: 7,
  stats: { STR: 13, DEX: 13, END: 12, PER: 11, INT: 4, WIL: 9, CHA: 1 },
  overrides: { maxHp: 40 },
  weapon: { name: "claws", damageType: "slashing", attack: 5 },
  row: "front",
  tags: ["undead"],
  // The dead hate the righteous (DESIGN.md §7): Good heroes are hit first.
  hunts: ["align:good"],
  ai: "brute",
  research: { tricks: "Its claws leave you numb. Holy light hurts it badly; poison does nothing." },
  abilities: { "ghoul-claw": 1 },
  loot: "ghoul-loot",
  passives: [
    { type: "modifyStat", stat: "armor", amount: 1 },
    { type: "resist", damageType: "poison", percent: 100 },
    { type: "resist", damageType: "cold", percent: 25 },
    { type: "resist", damageType: "holy", percent: -50 },
  ],
});
