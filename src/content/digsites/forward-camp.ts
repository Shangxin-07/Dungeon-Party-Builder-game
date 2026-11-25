import { defineDigSite } from "../types";

/**
 * A forward camp (M8.20, DESIGN.md §20): cots, a fire and a marked path.
 * Parties going deeper walk the guild's paths down to it instead of the
 * floors' rooms, and sleep there before going on.
 */
export default defineDigSite({
  id: "forward-camp",
  name: "Forward camp",
  blurb: "A camp at the foot of the held stairs, and marked paths down to it.",
  levels: [
    {
      cost: 200,
      materials: { planks: 6 },
      days: 4,
      summary:
        "Parties going deeper take the paths down (1 hour a floor) and sleep here, healing half their HP and mana",
      camp: { path: 1, rest: 50 },
    },
    {
      cost: 350,
      materials: { planks: 8, "iron-bands": 2 },
      days: 5,
      summary: "Faster paths (45 minutes a floor) and a proper sickbay: they sleep it all off",
      camp: { path: 0.75, rest: 100 },
    },
  ],
});
