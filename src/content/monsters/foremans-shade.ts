import { defineMonster } from "../types";

// Variant: the foreman who kept the shift digging. Still rings the bell, and the crew still comes.
export default defineMonster({
  id: "foremans-shade",
  name: "The Foreman's Shade",
  power: 13,
  stats: { STR: 13, DEX: 10, END: 13, PER: 12, INT: 10, WIL: 15, CHA: 8 },
  overrides: { maxHp: 54 },
  weapon: { name: "ghostly pick", damageType: "cold", attack: 7 },
  row: "front",
  tags: ["undead", "spirit"],
  ai: "brute",
  loot: "delver-loot",
  variant: { of: "lost-delver", chance: 0.2, minLevel: 5 },
  abilities: { "war-cry": 1, "call-the-crew": 1 },
  passives: [
    { type: "resist", damageType: "slashing", percent: 40 },
    { type: "resist", damageType: "piercing", percent: 40 },
    { type: "resist", damageType: "crushing", percent: 40 },
    { type: "resist", damageType: "cold", percent: 100 },
    { type: "resist", damageType: "poison", percent: 100 },
    { type: "resist", damageType: "holy", percent: -50 },
  ],
});
