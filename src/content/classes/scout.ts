import { defineClass } from "../types";

export default defineClass({
  id: "scout",
  name: "Scout",
  icon: { sheet: "classes", cell: 4 },
  hats: [6],
  blurb: "Spots ambushes, picks the good loot, shoots from the back.",
  mainStats: ["DEX", "PER"],
  baseStats: { STR: 9, DEX: 14, END: 10, PER: 14, INT: 10, WIL: 9, CHA: 9 },
  likes: ["bow", "dagger"],
  row: "back",
  ai: "archer",
  abilities: { "mark-prey": 1, flurry: 5 },
  startingKit: ["short-bow", "leather-armor", "bandages"],
  growth: { DEX: 1, PER: 1 },
  requires: { stats: { DEX: 12 } },
  perLevel: [
    { type: "modifyStat", stat: "accuracy", amount: 0.4 },
    { type: "modifyStat", stat: "evasion", amount: 0.25 },
    { type: "modifySkill", skill: "scouting", amount: 1 },
  ],
  milestones: {
    5: ["eagle-eye", "shadow-step"],
    10: ["deadeye", "pathfinder"],
    20: ["ghost"],
    30: ["hunters-instinct"],
    40: ["quickdraw"],
    50: ["master-of-the-hunt"],
  },
});
