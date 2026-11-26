import { defineItem } from "../types";

// A specimen: a scrap of a wight's grave-wrap, still cold. The Library learns what keeps it going.
export default defineItem({
  id: "wight-shroud",
  name: "Wight's Shroud",
  icon: { sheet: "specimens", cell: 8 },
  slot: "loot",
  value: 4,
  tags: ["specimen"],
  research: { points: 8, monsters: ["wight"] },
});
