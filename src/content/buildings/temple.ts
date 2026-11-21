import { defineBuilding } from "../types";

/**
 * A shrine raised over the old mine office (DESIGN.md §8, §10). The priests
 * can bring back a hero whose body was brought home, at a price: gold, bone
 * dust (content/materials/), and their most recent levels (restored as they
 * were when the XP is earned again).
 */
export default defineBuilding({
  id: "temple",
  name: "Temple",
  blurb: "Priests who can call a hero back from the dead, if the body comes home.",
  startLevel: 0,
  levels: [
    {
      cost: 220,
      days: 4,
      summary:
        "Sells holy symbols. Resurrect: 100 gold + 20 a level and 3 bone dust, and they lose 2 levels (or 20%)",
      effects: [
        // Holy gear (DESIGN.md §7).
        { type: "sells", items: ["holy-symbol"] },
        {
          type: "resurrect",
          gold: 100,
          goldPerLevel: 20,
          levels: 2,
          percent: 20,
          materials: { "bone-dust": 3 },
        },
      ],
    },
    {
      cost: 450,
      materials: { "bone-dust": 4 },
      days: 6,
      summary:
        "Also sells blessed blades. Resurrect: 80 gold + 15 a level and 2 bone dust, and they lose 1 level (or 10%)",
      effects: [
        { type: "sells", items: ["holy-symbol", "blessed-blade"] },
        {
          type: "resurrect",
          gold: 80,
          goldPerLevel: 15,
          levels: 1,
          percent: 10,
          materials: { "bone-dust": 2 },
        },
      ],
    },
  ],
});
