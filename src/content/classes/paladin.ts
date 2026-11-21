import { defineClass } from "../types";

// A combo class (DESIGN.md §9): sword arm and prayer book. Opens at
// Fighter 5 + Cleric 5.
export default defineClass({
  id: "paladin",
  name: "Paladin",
  kind: "combo",
  blurb: "Front row. Holds the line, lays on hands, and hates the undead.",
  requires: { classLevels: { fighter: 5, cleric: 5 }, stats: { STR: 12, WIL: 12 } },
  mainStats: ["STR", "WIL"],
  likes: ["sword", "holy", "shield"],
  row: "front",
  ai: "healer",
  abilities: { "holy-strike": 1, "lay-on-hands": 3 },
  startingKit: ["sword", "chainmail", "wooden-shield", "bandages"],
  growth: { STR: 1, WIL: 1 },
  perLevel: [
    { type: "modifyStat", stat: "attack", amount: 0.3 },
    { type: "modifyStat", stat: "maxHp", amount: 1 },
  ],
  milestones: { 5: ["oathkeeper"] },
});
