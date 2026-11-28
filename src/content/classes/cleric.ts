import { defineClass } from "../types";

// The fourth class (DESIGN.md §12): a sturdy healer who can hold the front
// row and hits the undead where it hurts.
export default defineClass({
  id: "cleric",
  name: "Cleric",
  icon: { sheet: "classes", cell: 6 },
  hats: [8, 9],
  blurb: "Front row. Keeps the party standing and smites the undead.",
  mainStats: ["WIL", "CHA"],
  baseStats: { STR: 11, DEX: 9, END: 12, PER: 9, INT: 9, WIL: 14, CHA: 13 },
  gates: { WIL: 14, CHA: 12 },
  likes: ["mace", "holy"],
  row: "front",
  ai: "healer",
  abilities: { prayer: 1, smite: 1, "circle-of-healing": 5 },
  startingKit: ["mace", "leather-armor", "wooden-shield", "bandages"],
  growth: { WIL: 1, CHA: 1 },
  requires: { stats: { WIL: 12 } },
  perLevel: [
    { type: "modifyStat", stat: "spellPower", amount: 0.3 },
    { type: "modifyStat", stat: "resist", amount: 0.3 },
    { type: "modifySkill", skill: "medicine", amount: 1 },
  ],
  milestones: {
    5: ["blessed-hands", "shield-of-faith"],
    10: ["holy-light", "sanctuary"],
    20: ["saintly"],
    30: ["bulwark-of-faith"],
    40: ["radiant"],
    50: ["living-saint"],
  },
});
