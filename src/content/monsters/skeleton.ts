import { defineMonster } from "../types";

// Arrows and blades slip between its bones. Bring an axe.
export default defineMonster({
  id: "skeleton",
  name: "Skeleton",
  power: 5,
  stats: { STR: 11, DEX: 8, END: 10, PER: 8, INT: 3, WIL: 10, CHA: 1 },
  overrides: { maxHp: 32 },
  weapon: { name: "old sword", damageType: "slashing", attack: 4 },
  row: "front",
  tags: ["undead"],
  ai: "brute",
  abilities: { "power-strike": 3 },
  loot: "skeleton-loot",
  passives: [
    { type: "modifyStat", stat: "armor", amount: 2 },
    { type: "resist", damageType: "piercing", percent: 50 },
    { type: "resist", damageType: "slashing", percent: 25 },
    { type: "resist", damageType: "crushing", percent: -25 },
    { type: "resist", damageType: "poison", percent: 100 },
    { type: "resist", damageType: "holy", percent: -50 },
  ],
});
