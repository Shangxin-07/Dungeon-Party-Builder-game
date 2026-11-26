import { defineBuilding } from "../types";

/** Salves, splints and tonics (DESIGN.md §8): injuries mend faster. */
export default defineBuilding({
  id: "apothecary",
  name: "Apothecary",
  blurb: "Salves, splints and tonics. Injured heroes are back on their feet sooner.",
  startLevel: 0,
  levels: [
    {
      cost: 180,
      days: 3,
      summary:
        "Injuries mend twice as fast; sells antivenom. A still with 1 bench: bandages, healing potions",
      effects: [
        { type: "healing", amount: 1 },
        { type: "sells", items: ["antivenom"] },
        { type: "workshop", benches: 1 },
      ],
    },
    {
      cost: 400,
      materials: { glowcap: 5 },
      days: 4,
      summary:
        "Injuries mend three times as fast; sells and brews greater healing potions. 2 benches",
      effects: [
        { type: "healing", amount: 2 },
        { type: "sells", items: ["greater-healing-potion"] },
        { type: "workshop", benches: 2 },
      ],
    },
  ],
  // Its look on the town map (M8, DESIGN.md §19).
  art: {
    plot: "inner-south-east",
    shape: "house",
    roof: "#4f6e5e",
    sign: "flask",
    sprite: { sheet: "apothecary", frames: [0, 1] },
  },
});
