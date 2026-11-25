import { defineDigSite } from "../types";

/**
 * A shrine (M8.20, DESIGN.md §20), only over a cleansed stone: the quiet it
 * gives off is felt in town.
 */
export default defineDigSite({
  id: "shrine",
  name: "Shrine",
  blurb: "A shrine raised over the cleansed stone. The priests take turns keeping it.",
  way: "cleansed",
  levels: [
    {
      cost: 200,
      materials: { planks: 4, "bone-dust": 2 },
      days: 3,
      summary: "Heroes rest easier in town (+1 morale a day), and the dead lie 2 days longer",
      effects: [
        { type: "restMorale", amount: 1 },
        { type: "riseDelay", amount: 2 },
      ],
    },
  ],
});
