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
      summary: "Injuries mend twice as fast",
      effects: [{ type: "healing", amount: 1 }],
    },
    {
      cost: 400,
      materials: { glowcap: 5 },
      days: 4,
      summary: "Injuries mend three times as fast; sells greater healing potions",
      effects: [
        { type: "healing", amount: 2 },
        { type: "sells", items: ["greater-healing-potion"] },
      ],
    },
  ],
});
