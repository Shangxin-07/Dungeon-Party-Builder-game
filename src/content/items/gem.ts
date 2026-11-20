import { defineItem } from "../types";

// Could be glass, could be a ruby. A good appraiser knows which ones to keep.
export default defineItem({
  id: "gem",
  name: "Gem",
  slot: "loot",
  value: 50,
  valueRange: [10, 140],
  tags: ["gem", "valuable"],
});
