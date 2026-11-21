import { defineBuilding } from "../types";

/**
 * Old maps, bestiaries and the miners' notes (DESIGN.md §8). Heroes learn
 * more from every trip. Knowledge-minded heroes love it.
 */
export default defineBuilding({
  id: "library",
  name: "Library",
  blurb: "Bestiaries, old maps and the miners' notes. Heroes learn more from every trip.",
  startLevel: 0,
  levels: [
    {
      cost: 160,
      days: 3,
      summary: "+10% XP from every trip",
      effects: [{ type: "xpPercent", amount: 10 }],
    },
    {
      cost: 380,
      materials: { "spider-silk": 4 },
      days: 5,
      summary: "+20% XP from every trip",
      effects: [{ type: "xpPercent", amount: 20 }],
    },
  ],
});
