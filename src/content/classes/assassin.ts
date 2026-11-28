import { defineClass } from "../types";

// An advanced class (DESIGN.md §9): a Scout who learned where to put a knife.
// Opens at Scout 10 with high DEX, and needs a Training Yard.
export default defineClass({
  id: "assassin",
  name: "Assassin",
  icon: { sheet: "classes", cell: 5 },
  hats: [7],
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
  // A good dagger in the other hand too (M9.04): a second blow at 75%.
  offhand: { tags: ["dagger"], damagePercent: -25 },
  abilities: { "shadow-strike": 1 },
  startingKit: ["dagger", "leather-armor", "bandages"],
  growth: { DEX: 1, PER: 1 },
  perLevel: [
    { type: "modifyStat", stat: "attack", amount: 0.4 },
    { type: "modifyStat", stat: "accuracy", amount: 0.3 },
  ],
  milestones: { 5: ["killers-eye"] },
});
