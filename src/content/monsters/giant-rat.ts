import { defineMonster } from "../types";

// Comes in swarms, low HP.
export default defineMonster({
  id: "giant-rat",
  name: "Giant Rat",
  power: 2,
  stats: { STR: 4, DEX: 12, END: 4, PER: 10, INT: 2, WIL: 4, CHA: 1 },
  overrides: { maxHp: 10 },
  weapon: { name: "teeth", damageType: "piercing", attack: 4 },
  row: "front",
  tags: ["beast", "vermin"],
  ai: "brute",
  research: { tricks: "Comes in swarms. Sweeping blows clear them." },
  abilities: { gnaw: 2 },
});
