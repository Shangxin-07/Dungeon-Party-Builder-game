import { defineBuilding } from "../types";

/** Lets parties in and out of the pit; a stronger gate stops raiders breaking through. */
export default defineBuilding({
  id: "gate",
  name: "Pit Gate",
  blurb: "The way down for your parties, and a door that can be barred at night.",
  startLevel: 0,
  levels: [
    {
      cost: 60,
      days: 1,
      summary: "Timber gate: holds back 3 strength a night",
      effects: [{ type: "defence", amount: 3 }],
    },
    {
      cost: 180,
      materials: { "iron-ore": 2 },
      days: 3,
      summary: "Iron-bound gate: holds back 6 strength a night",
      effects: [{ type: "defence", amount: 6 }],
    },
  ],
});
