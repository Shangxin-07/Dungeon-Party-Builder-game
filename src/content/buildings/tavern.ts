import { defineBuilding } from "../types";

/**
 * Better recruits to choose from (DESIGN.md §8). Morale comes in M5, when the
 * Tavern will also help resting heroes cheer up.
 */
export default defineBuilding({
  id: "tavern",
  name: "Tavern",
  blurb: "Word gets around. More and better adventurers come looking for work.",
  startLevel: 0,
  levels: [
    {
      cost: 150,
      days: 2,
      summary: "1 more recruit a day, and each is the best of 2",
      effects: [
        { type: "recruitOffers", amount: 1 },
        { type: "recruitPicks", amount: 1 },
      ],
    },
    {
      cost: 400,
      days: 4,
      summary: "2 more recruits a day, and each is the best of 3",
      effects: [
        { type: "recruitOffers", amount: 2 },
        { type: "recruitPicks", amount: 2 },
      ],
    },
  ],
});
