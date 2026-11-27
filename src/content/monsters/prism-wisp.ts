import { defineMonster } from "../types";

// The Glimmering: a mote of light that has lived in the crystal so long it has
// a will of its own. It hangs back and splits itself into your eyes.
export default defineMonster({
  id: "prism-wisp",
  name: "Prism Wisp",
  icon: { sheet: "glimmering", cell: 1 },
  power: 10,
  stats: { STR: 4, DEX: 16, END: 9, PER: 15, INT: 16, WIL: 15, CHA: 4 },
  overrides: { maxHp: 42 },
  weapon: { name: "split light", damageType: "holy", attack: 7, ranged: true },
  row: "back",
  tags: ["spirit", "crystal-grown"],
  ai: "caster",
  research: {
    tricks:
      "Blades go through it and its light dazes. Cold dims it; holy light is its own, and hurts it only on this floor.",
  },
  abilities: { refraction: 1 },
  loot: "wisp-loot",
  passives: [
    { type: "resist", damageType: "slashing", percent: 30 },
    { type: "resist", damageType: "piercing", percent: 30 },
    { type: "resist", damageType: "crushing", percent: 30 },
    { type: "resist", damageType: "poison", percent: 100 },
    { type: "resist", damageType: "holy", percent: 50 },
    { type: "resist", damageType: "cold", percent: -30 },
  ],
});
