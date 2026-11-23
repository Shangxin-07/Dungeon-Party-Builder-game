import { defineItem } from "../types";

// Bulky and nearly worthless. The thing a party without an appraiser drags home.
export default defineItem({
  id: "rusty-helmet",
  name: "Rusty Helmet",
  icon: { sheet: "armour", cell: 6 },
  slot: "loot",
  value: 4,
  valueRange: [1, 8],
  size: 2,
  tags: ["junk", "metal"],
});
