import { defineClass } from "../types";

export default defineClass({
  id: "scout",
  name: "Scout",
  blurb: "Spots ambushes, picks the good loot, shoots from the back.",
  mainStats: ["DEX", "PER"],
  baseStats: { STR: 9, DEX: 14, END: 10, PER: 14, INT: 10, WIL: 9, CHA: 9 },
  likes: ["bow", "dagger"],
  row: "back",
  ai: "archer",
  abilities: [],
  startingKit: ["short-bow", "leather-armor", "bandages"],
});
