import { defineMonster } from "../types";

// The Diggings: goblins who found the miners' powder store and kept it.
export default defineMonster({
  id: "goblin-sapper",
  name: "Goblin Sapper",
  icon: { sheet: "monsters-3", cell: 0 },
  power: 3,
  stats: { STR: 7, DEX: 11, END: 7, PER: 9, INT: 9, WIL: 6, CHA: 5 },
  overrides: { maxHp: 15 },
  weapon: { name: "pick-hammer", damageType: "crushing", attack: 2 },
  row: "back",
  tags: ["goblinoid", "humanoid", "cunning"],
  reactions: [{ reaction: "parley", to: ["evil"], chance: 0.25 }],
  ai: "archer",
  research: {
    tricks: "Throws lit blasting powder over the front line. Kill it before the second pouch.",
  },
  abilities: { "blasting-powder": 1 },
  loot: "sapper-loot",
  passives: [{ type: "resist", damageType: "fire", percent: 25 }],
});
