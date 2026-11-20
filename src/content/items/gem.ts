import { defineItem } from "../types";

// Value varies a lot; a good appraiser knows which ones to keep (M2).
export default defineItem({
  id: "gem",
  name: "Gem",
  slot: "loot",
  value: 50,
  tags: ["gem", "valuable"],
});
