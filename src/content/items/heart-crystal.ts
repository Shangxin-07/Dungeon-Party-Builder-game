import { defineItem } from "../types";

// The Old Delve: a crystal grown from the heart's life. Warm to the touch, and worth a good deal.
export default defineItem({
  id: "heart-crystal",
  name: "Heart Crystal",
  slot: "loot",
  value: 40,
  valueRange: [25, 60],
  tags: ["gem"],
});
