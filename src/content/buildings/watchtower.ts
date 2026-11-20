import { defineBuilding } from "../types";

/** Early warning: see tomorrow night's overflow, so you can keep strong heroes home. */
export default defineBuilding({
  id: "watchtower",
  name: "Watchtower",
  blurb: "A lookout over the pit. Shows what's coming a day ahead.",
  startLevel: 0,
  levels: [
    {
      cost: 100,
      days: 2,
      summary: "Warns of tomorrow night's overflow, and holds back 1 strength",
      effects: [
        { type: "raidWarning", days: 1 },
        { type: "defence", amount: 1 },
      ],
    },
    {
      cost: 220,
      days: 3,
      summary: "Warns 2 nights ahead, and holds back 2 strength",
      effects: [
        { type: "raidWarning", days: 2 },
        { type: "defence", amount: 2 },
      ],
    },
  ],
});
