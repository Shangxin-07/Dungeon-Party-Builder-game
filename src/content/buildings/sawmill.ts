import { defineBuilding } from "../types";

/**
 * The Sawmill (M7.14, DESIGN.md §18.1): a workshop. Heroes at home saw timber
 * into planks and knock up shields, staves and bows (content/recipes/).
 */
export default defineBuilding({
  id: "sawmill",
  name: "Sawmill",
  blurb: "A saw pit and a lathe. Timber into planks, staves, shields and bows.",
  startLevel: 0,
  levels: [
    {
      cost: 120,
      materials: { timber: 4 },
      days: 2,
      summary: "A workshop with 1 bench: planks, wooden shields, staves, short bows",
      effects: [{ type: "workshop", benches: 1 }],
    },
    {
      cost: 260,
      materials: { timber: 6, "iron-ore": 4 },
      days: 3,
      summary: "2 benches",
      effects: [{ type: "workshop", benches: 2 }],
    },
  ],
});
