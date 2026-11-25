import { defineDigSite } from "../types";

/**
 * A den (M8.20, DESIGN.md §20), only over a bound stone: beasts the stone's
 * hunger keeps tame enough to fight, for heroes to drill against.
 */
export default defineDigSite({
  id: "den",
  name: "Den",
  blurb: "Pens by the bound stone, where its hunger keeps the beasts cowed enough to spar with.",
  way: "bound",
  levels: [
    {
      cost: 200,
      materials: { planks: 4, "spider-silk": 2 },
      days: 3,
      summary: "Heroes at home drill against the beasts: 4 XP a day",
      effects: [{ type: "trainingXp", amount: 4 }],
    },
  ],
});
