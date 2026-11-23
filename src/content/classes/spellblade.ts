import { defineClass } from "../types";

// A combo class (DESIGN.md §9): a Fighter who learned enough magic to set
// their blade alight. Opens at Fighter 5 + Mage 5.
export default defineClass({
  id: "spellblade",
  name: "Spellblade",
  icon: { sheet: "classes", cell: 8 },
  kind: "combo",
  blurb: "Front row. Swings a burning blade and throws the odd spell.",
  requires: { classLevels: { fighter: 5, mage: 5 }, stats: { STR: 12, INT: 12 } },
  mainStats: ["STR", "INT"],
  likes: ["sword", "fire"],
  row: "front",
  ai: "fighter",
  abilities: { "flame-blade": 1, "arcane-ward": 4 },
  startingKit: ["sword", "chainmail", "healing-potion"],
  growth: { STR: 1, INT: 1 },
  perLevel: [
    { type: "modifyStat", stat: "attack", amount: 0.3 },
    { type: "modifyStat", stat: "spellPower", amount: 0.3 },
  ],
  milestones: { 5: ["runed-steel"] },
});
