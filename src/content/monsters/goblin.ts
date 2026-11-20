import { defineMonster } from "../types";

export default defineMonster({
  id: "goblin",
  name: "Goblin",
  power: 3,
  stats: { STR: 9, DEX: 11, END: 8, PER: 9, INT: 7, WIL: 6, CHA: 5 },
  overrides: { maxHp: 22 },
  weapon: { name: "rusty blade", damageType: "slashing", attack: 4 },
  row: "front",
  tags: ["goblinoid", "humanoid"],
  ai: "brute",
  passives: [{ type: "modifyStat", stat: "armor", amount: 1 }],
});
