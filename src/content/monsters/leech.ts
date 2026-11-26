import { defineMonster } from "../types";

// The Flooded Shafts: fat black leeches the size of a forearm, in the shallows.
export default defineMonster({
  id: "leech",
  name: "Giant Leech",
  icon: { sheet: "monsters-3", cell: 8 },
  power: 3,
  stats: { STR: 6, DEX: 9, END: 8, PER: 6, INT: 1, WIL: 4, CHA: 1 },
  overrides: { maxHp: 16 },
  weapon: { name: "sucker", damageType: "piercing", attack: 4 },
  row: "front",
  tags: ["beast", "vermin"],
  ai: "brute",
  research: {
    tricks: "Clamps on and drinks: the wound keeps bleeding. Salt and fire put them off.",
  },
  abilities: { gnaw: 1 },
  loot: "eel-loot",
  passives: [{ type: "resist", damageType: "fire", percent: -25 }],
});
