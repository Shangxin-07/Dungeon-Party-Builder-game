import { defineLootTable } from "../types";

// The vein the town was dug for.
export default defineLootTable({
  id: "silver-vein",
  rolls: [1, 2],
  entries: [
    { item: "deep-silver", weight: 6 },
    { item: "iron-ore", weight: 2 },
    { item: "gem", weight: 1 },
  ],
});
