import { defineClass } from "../types";

export default defineClass({
  id: "mage",
  name: "Mage",
  blurb: "Back row. Burns groups of monsters and patches up wounds.",
  mainStats: ["INT", "WIL"],
  baseStats: { STR: 7, DEX: 10, END: 9, PER: 11, INT: 14, WIL: 13, CHA: 10 },
  likes: ["staff", "fire"],
  row: "back",
  ai: "caster",
  abilities: ["flame-wave", "firebolt", "mend"],
  startingKit: ["staff", "healing-potion"],
  growth: { INT: 1, WIL: 1 },
});
