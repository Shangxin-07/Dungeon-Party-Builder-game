import { defineBuilding } from "../types";

/** Sparring dummies and a sand pit (DESIGN.md §8). Glory hounds love it. */
export default defineBuilding({
  id: "training-yard",
  name: "Training Yard",
  group: "guild",
  blurb: "Sparring dummies and a sand pit. Heroes resting in town still get better.",
  startLevel: 0,
  levels: [
    {
      cost: 120,
      days: 2,
      summary: "Heroes in town earn 4 XP a day",
      effects: [{ type: "trainingXp", amount: 4 }],
    },
    {
      cost: 320,
      materials: { "iron-ore": 4 },
      days: 4,
      summary: "Heroes in town earn 8 XP a day",
      effects: [{ type: "trainingXp", amount: 8 }],
    },
  ],
  // Its look on the town map (M8, DESIGN.md §19).
  art: {
    plot: "south-west",
    shape: "yard",
    roof: "#7a5c3a",
    sign: "sword",
    sprite: { sheet: "training-yard", frames: [0, 1] },
  },
});
