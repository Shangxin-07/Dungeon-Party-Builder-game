import { defineItem } from "../types";

// A specimen: a chip of heart-crystal off a crawler's back, still warm.
export default defineItem({
  id: "crystal-chip",
  name: "Crystal Chip",
  icon: { sheet: "specimens", cell: 11 },
  slot: "loot",
  value: 5,
  tags: ["specimen"],
  research: { points: 10, monsters: ["crystal-crawler"] },
});
