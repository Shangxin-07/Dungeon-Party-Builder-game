import { defineClass } from "../types";

// An advanced class (DESIGN.md §9): a Scout who learned where to put a knife.
// Opens at Scout 10 with high DEX, and needs a Training Yard.
export default defineClass({
  id: "assassin",
  name: "Assassin",
  kind: "advanced",
  blurb: "Front row. Finds the gap in the armour, then finds another.",
  requires: {
    classLevels: { scout: 10 },
    stats: { DEX: 16 },
    building: "training-yard",
    alignments: ["neutral", "evil"],
  },
  mainStats: ["DEX", "PER"],
  likes: ["dagger"],
  row: "front",
  ai: "archer",
  abilities: { "shadow-strike": 1 },
  startingKit: ["dagger", "leather-armor", "bandages"],
  growth: { DEX: 1, PER: 1 },
  perLevel: [
    { type: "modifyStat", stat: "attack", amount: 0.4 },
    { type: "modifyStat", stat: "accuracy", amount: 0.3 },
  ],
  milestones: { 5: ["killers-eye"] },
});
