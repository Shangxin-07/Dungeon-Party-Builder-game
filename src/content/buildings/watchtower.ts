import { defineBuilding } from "../types";

/**
 * Early warning: see tomorrow night's overflow, so you can keep strong heroes
 * home. M7.13: it's also how the town sees how full the top floors are.
 */
export default defineBuilding({
  id: "watchtower",
  name: "Watchtower",
  blurb: "A lookout over the pit. Shows what's coming, and how busy the top floors are.",
  startLevel: 0,
  levels: [
    {
      cost: 100,
      days: 2,
      summary:
        "Warns of tomorrow night's overflow, shows roughly how full floor 1 is, holds back 1",
      effects: [
        { type: "raidWarning", days: 1 },
        { type: "defence", amount: 1 },
        { type: "watch", floors: 1, exact: 0 },
      ],
    },
    {
      cost: 220,
      materials: { "iron-ore": 2 },
      days: 3,
      summary: "Warns 2 nights ahead, counts floor 1's monsters, holds back 2 strength",
      effects: [
        { type: "raidWarning", days: 2 },
        { type: "defence", amount: 2 },
        { type: "watch", floors: 1, exact: 1 },
      ],
    },
    {
      // M7.13: listening at the shaft for the floor below.
      cost: 360,
      materials: { "iron-ore": 3, planks: 4 },
      days: 4,
      summary: "Listens down the shaft: shows roughly how full floor 2 is too, holds back 3",
      effects: [
        { type: "raidWarning", days: 2 },
        { type: "defence", amount: 3 },
        { type: "watch", floors: 2, exact: 1 },
      ],
    },
  ],
  // Its look on the town map (M8, DESIGN.md §19).
  art: { shape: "watchtowers", roof: "#8c3b2c", sprite: { sheet: "watchtower", frames: [0] } },
});
