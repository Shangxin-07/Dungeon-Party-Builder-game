import { defineBuilding } from "../types";

/**
 * Cottages (M7.15, DESIGN.md §18.1b): room for townsfolk. Settlers only come
 * when there's somewhere to live, food to eat, and the pit is held.
 */
export default defineBuilding({
  id: "cottages",
  name: "Cottages",
  blurb:
    "Somewhere for settlers to live. Townsfolk pay a little tax and can work posts and benches.",
  startLevel: 0,
  levels: [
    {
      cost: 80,
      materials: { timber: 4 },
      days: 2,
      summary: "Room for 4 townsfolk",
      effects: [{ type: "housing", amount: 4 }],
    },
    {
      cost: 180,
      materials: { planks: 8 },
      days: 3,
      summary: "Room for 8",
      effects: [{ type: "housing", amount: 8 }],
    },
    {
      cost: 320,
      materials: { planks: 12, "iron-ore": 4 },
      days: 4,
      summary: "Room for 14",
      effects: [{ type: "housing", amount: 14 }],
    },
  ],
});
