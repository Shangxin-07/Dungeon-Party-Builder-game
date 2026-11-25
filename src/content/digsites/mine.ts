import { defineDigSite } from "../types";

/**
 * A mine (M8.20, DESIGN.md §20): the camp is mining again. Iron ore from any
 * held floor; from floor 3 down the deep-silver vein that led the miners to
 * the Hearthstone.
 */
export default defineDigSite({
  id: "mine",
  name: "Mine",
  blurb: "Picks back on the old seams, now that the floor is the guild's.",
  levels: [
    {
      cost: 250,
      materials: { planks: 4, "iron-bands": 2 },
      days: 4,
      summary: "1 iron ore a day, and a deep-silver every 5 days from floor 3 down",
      yields: { "iron-ore": 1 },
      deepYields: { from: 3, materials: { "deep-silver": 0.2 } },
    },
    {
      cost: 400,
      materials: { planks: 6, "iron-bands": 4 },
      days: 6,
      summary: "2 iron ore a day, and 2 deep-silver every 5 days from floor 3 down",
      yields: { "iron-ore": 2 },
      deepYields: { from: 3, materials: { "deep-silver": 0.4 } },
    },
  ],
});
