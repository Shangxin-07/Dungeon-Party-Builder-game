import { defineMonster } from "../types";

// Variant: a bigger goblin with a louder voice, leading bands below floor 1.
export default defineMonster({
  id: "goblin-boss",
  name: "Goblin Boss",
  icon: { sheet: "monsters-1", cell: 6 },
  power: 6,
  stats: { STR: 12, DEX: 11, END: 11, PER: 9, INT: 8, WIL: 8, CHA: 9 },
  overrides: { maxHp: 34 },
  weapon: { name: "notched cleaver", damageType: "slashing", attack: 5 },
  row: "front",
  tags: ["goblinoid", "humanoid", "cunning"],
  ai: "brute",
  research: { tricks: "Its war cry steadies the band. Drop it and the rest lose heart." },
  loot: "goblin-loot",
  variant: { of: "goblin", chance: 0.15, minLevel: 2 },
  abilities: { "war-cry": 1, disarm: 1 },
  passives: [{ type: "modifyStat", stat: "armor", amount: 2 }],
});
