import { defineBuilding } from "../types";

/**
 * Better recruits to choose from, and somewhere for heroes to unwind
 * (DESIGN.md §8). Comrades-minded heroes love it.
 */
export default defineBuilding({
  id: "tavern",
  name: "Tavern",
  blurb:
    "Word gets around. More and better adventurers come looking for work, and heroes cheer up faster.",
  startLevel: 0,
  levels: [
    {
      cost: 150,
      days: 2,
      summary: "1 more recruit a day, each the best of 2; +1 morale a day in town",
      effects: [
        { type: "recruitOffers", amount: 1 },
        { type: "recruitPicks", amount: 1 },
        { type: "restMorale", amount: 1 },
      ],
    },
    {
      cost: 400,
      materials: { "spider-silk": 3 },
      days: 4,
      summary:
        "2 more recruits a day, each the best of 3, and one of them comes trained and kitted; +2 morale a day in town",
      effects: [
        { type: "trainedRecruits", amount: 1 },
        { type: "recruitOffers", amount: 2 },
        { type: "recruitPicks", amount: 2 },
        { type: "restMorale", amount: 2 },
      ],
    },
  ],
  // Its look on the town map (M8, DESIGN.md §19).
  art: {
    plot: "north-east",
    shape: "house",
    roof: "#9a6a2a",
    sign: "mug",
    // Pixel art Mike made for M8.01 (three frames; the third waits for a level 3).
    sprite: { sheet: "tavern", frames: [0, 1] },
  },
});
