import { defineClass } from "../types";

export default defineClass({
  id: "mage",
  name: "Mage",
  icon: { sheet: "classes", cell: 2 },
  hats: [3, 4],
  blurb: "Back row. Burns groups of monsters and patches up wounds.",
  mainStats: ["INT", "WIL"],
  baseStats: { STR: 7, DEX: 10, END: 9, PER: 11, INT: 14, WIL: 13, CHA: 10 },
  gates: { INT: 14, WIL: 12 },
  likes: ["staff", "fire"],
  row: "back",
  ai: "caster",
  abilities: { firebolt: 1, "flame-wave": 1, mend: 1, "frost-lance": 4, fireball: 7 },
  startingKit: ["staff", "healing-potion"],
  growth: { INT: 1, WIL: 1 },
  requires: { stats: { INT: 12 } },
  perLevel: [
    { type: "modifyStat", stat: "spellPower", amount: 0.4 },
    { type: "modifyStat", stat: "mana", amount: 1 },
  ],
  milestones: {
    5: ["arcane-reserves", "kindled"],
    10: ["elementalist", "wellspring"],
    20: ["archmages-focus"],
    30: ["mana-font"],
    40: ["spell-lord"],
    50: ["archmage"],
  },
});
