import { defineMonster } from "../types";

// The miners who dug too deep, still down there. Blades pass through them; holy things don't.
export default defineMonster({
  id: "lost-delver",
  name: "Lost Delver",
  power: 8,
  stats: { STR: 8, DEX: 11, END: 9, PER: 12, INT: 12, WIL: 14, CHA: 2 },
  overrides: { maxHp: 30 },
  weapon: { name: "grave-cold touch", damageType: "cold", attack: 4, ranged: true },
  row: "back",
  tags: ["undead", "spirit"],
  ai: "caster",
  abilities: { "grave-chill": 1 },
  loot: "delver-loot",
  passives: [
    { type: "resist", damageType: "slashing", percent: 40 },
    { type: "resist", damageType: "piercing", percent: 40 },
    { type: "resist", damageType: "crushing", percent: 40 },
    { type: "resist", damageType: "cold", percent: 100 },
    { type: "resist", damageType: "poison", percent: 100 },
    { type: "resist", damageType: "holy", percent: -50 },
  ],
});
