import { defineBuilding } from "../types";

/**
 * Old maps, bestiaries and the miners' notes (DESIGN.md §8). Heroes learn
 * more from every trip. Knowledge-minded heroes love it. Since M7.07 it's
 * where research happens (DESIGN.md §17.7): heroes at its desks study the
 * monsters the guild has met and the strange things parties bring home.
 */
export default defineBuilding({
  id: "library",
  name: "Library",
  blurb:
    "Bestiaries, old maps and the miners' notes. Heroes learn more from every trip, and researchers study monsters and finds.",
  startLevel: 0,
  levels: [
    {
      cost: 160,
      days: 3,
      summary: "+10% XP from every trip, 2 research desks",
      effects: [
        { type: "xpPercent", amount: 10 },
        { type: "researchDesks", amount: 2 },
      ],
    },
    {
      cost: 380,
      materials: { "spider-silk": 4 },
      days: 5,
      summary: "+20% XP from every trip, 4 research desks",
      effects: [
        { type: "xpPercent", amount: 20 },
        { type: "researchDesks", amount: 4 },
      ],
    },
  ],
});
