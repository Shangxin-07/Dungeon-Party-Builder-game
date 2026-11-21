import { defineClass } from "../types";

export default defineClass({
  id: "fighter",
  name: "Fighter",
  blurb: "Front row. Soaks up hits so the others don't have to.",
  mainStats: ["STR", "END"],
  baseStats: { STR: 14, DEX: 10, END: 13, PER: 9, INT: 7, WIL: 9, CHA: 9 },
  likes: ["sword", "axe", "shield"],
  row: "front",
  ai: "fighter",
  abilities: { "power-strike": 1, "second-wind": 4, whirlwind: 7 },
  startingKit: ["sword", "chainmail", "wooden-shield", "healing-potion"],
  growth: { STR: 1, END: 1 },
});
