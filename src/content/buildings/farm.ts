import { defineBuilding } from "../types";

/**
 * The Farm (M7.15, DESIGN.md §18.1b): fields and snares round the camp. It
 * feeds the townsfolk; a town without food won't keep them.
 */
export default defineBuilding({
  id: "farm",
  name: "Farm",
  blurb: "Fields, a pig pen and snares in the woods. Feeds the townsfolk.",
  startLevel: 0,
  levels: [
    {
      cost: 60,
      materials: { timber: 3 },
      days: 2,
      summary: "Grows 5 food a day",
      effects: [{ type: "food", amount: 5 }],
    },
    {
      cost: 150,
      materials: { planks: 6 },
      days: 3,
      summary: "Grows 9 food a day",
      effects: [{ type: "food", amount: 9 }],
    },
    {
      cost: 280,
      materials: { planks: 10 },
      days: 4,
      summary: "Grows 15 food a day",
      effects: [{ type: "food", amount: 15 }],
    },
  ],
});
