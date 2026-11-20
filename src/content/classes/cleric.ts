import { defineClass } from "../types";

// The fourth class (DESIGN.md §12): a sturdy healer who can hold the front
// row and hits the undead where it hurts.
export default defineClass({
  id: "cleric",
  name: "Cleric",
  blurb: "Front row. Keeps the party standing and smites the undead.",
  mainStats: ["WIL", "CHA"],
  baseStats: { STR: 11, DEX: 9, END: 12, PER: 9, INT: 9, WIL: 14, CHA: 13 },
  likes: ["mace", "holy"],
  row: "front",
  ai: "healer",
  abilities: ["prayer", "smite"],
  startingKit: ["mace", "leather-armor", "wooden-shield", "bandages"],
  growth: { WIL: 1, CHA: 1 },
});
