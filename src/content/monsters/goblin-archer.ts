import { defineMonster } from "../types";

// Hangs back behind the other goblins and picks off the weak.
export default defineMonster({
  id: "goblin-archer",
  name: "Goblin Archer",
  power: 3,
  stats: { STR: 7, DEX: 12, END: 7, PER: 11, INT: 7, WIL: 6, CHA: 5 },
  overrides: { maxHp: 16 },
  weapon: { name: "crude bow", damageType: "piercing", attack: 2, ranged: true },
  row: "back",
  tags: ["goblinoid", "humanoid"],
  ai: "archer",
  loot: "goblin-loot",
});
