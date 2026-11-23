import { defineBuilding } from "../types";

/** The wall around the pit (DESIGN.md §8). Each level holds back more of the overflow. */
export default defineBuilding({
  id: "palisade",
  name: "Palisade",
  blurb: "A ring of sharpened stakes around the pit. Holds back monsters climbing out.",
  startLevel: 0,
  levels: [
    {
      cost: 80,
      materials: { timber: 4 },
      days: 2,
      summary: "Wooden palisade: holds back 6 strength a night",
      effects: [{ type: "defence", amount: 6 }],
    },
    {
      cost: 250,
      materials: { "iron-ore": 3 },
      days: 4,
      summary: "Stone wall: holds back 12 strength a night",
      effects: [{ type: "defence", amount: 12 }],
    },
    {
      cost: 600,
      materials: { "iron-ore": 8 },
      days: 6,
      summary: "High stone wall: holds back 20 strength a night",
      effects: [{ type: "defence", amount: 20 }],
    },
  ],
  // Its look on the town map (M8, DESIGN.md §19).
  art: { shape: "wall" },
});
