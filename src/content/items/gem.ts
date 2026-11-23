import { defineItem } from "../types";

// Could be glass, could be a ruby. A good appraiser knows which ones to keep.
export default defineItem({
  id: "gem",
  name: "Gem",
  icon: { sheet: "armour", cell: 13 },
  slot: "loot",
  value: 50,
  valueRange: [10, 140],
  tags: ["gem", "valuable"],
});
