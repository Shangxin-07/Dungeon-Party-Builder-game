import { defineMonster } from "../types";

// Variant: an old ghoul, bloated and strong, that leads packs from the Old Delve up.
export default defineMonster({
  id: "ghast",
  name: "Ghast",
  power: 11,
  stats: { STR: 15, DEX: 12, END: 14, PER: 11, INT: 6, WIL: 11, CHA: 3 },
  overrides: { maxHp: 56 },
  weapon: { name: "black claws", damageType: "slashing", attack: 7 },
  row: "front",
  tags: ["undead"],
  // The dead hate the righteous (DESIGN.md §7): Good heroes are hit first.
  hunts: ["align:good"],
  ai: "brute",
  loot: "ghoul-loot",
  variant: { of: "ghoul", chance: 0.15, minLevel: 4.5 },
  abilities: { "ghoul-claw": 1, rend: 1 },
  passives: [
    { type: "modifyStat", stat: "armor", amount: 2 },
    { type: "resist", damageType: "poison", percent: 100 },
    { type: "resist", damageType: "cold", percent: 25 },
    { type: "resist", damageType: "holy", percent: -50 },
  ],
});
