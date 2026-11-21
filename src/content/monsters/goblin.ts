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
  // Goblins know their own kind (DESIGN.md §7): a band may parley with an
  // Evil party, or demand a cut of its loot, instead of fighting.
  reactions: [
    { reaction: "parley", to: ["evil"], chance: 0.25 },
    { reaction: "tribute", to: ["evil"], chance: 0.25 },
  ],
  ai: "brute",
  abilities: { disarm: 2 },
  loot: "goblin-loot",
  passives: [{ type: "modifyStat", stat: "armor", amount: 1 }],
});
