import { defineMonster } from "../types";

// The Warrens: lean, eyeless dogs that dug half the burrows. They hunt in packs.
export default defineMonster({
  id: "tunnel-hound",
  name: "Tunnel Hound",
  power: 3,
  stats: { STR: 8, DEX: 13, END: 8, PER: 13, INT: 3, WIL: 6, CHA: 1 },
  overrides: { maxHp: 18 },
  weapon: { name: "jaws", damageType: "piercing", attack: 4 },
  row: "front",
  tags: ["beast"],
  ai: "brute",
  research: { tricks: "Hunts in packs and goes for the legs. Hold a line and it breaks on it." },
  abilities: { hamstring: 1 },
  loot: "hound-loot",
  passives: [{ type: "modifyStat", stat: "initiative", amount: 3 }],
});
